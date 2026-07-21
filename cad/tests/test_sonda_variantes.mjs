// Prueba de las VARIANTES del ensamble sonda de suelo:
//   B `sonda_suelo_std.json`  (fittings estándar; gen_sonda_suelo.mjs estandar)
//   D `sonda_campo.json`      (campo directo; gen_sonda_campo.mjs)
// Construye todas las piezas con el motor CSG y verifica los invariantes de
// cada variante (interfaces z compartidas con A, unión cementada sin tórica en
// B, sensores enterrados y poste concretado en D).
//
// Correr (desde cad/):
//   npx esbuild tests/test_sonda_variantes.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_var.mjs && node /tmp/test_var.mjs

import { readFileSync } from 'node:fs';
import { buildPartGeometry, partMatrix } from '../js/model.js';
import * as THREE from 'three';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${detail}`); }
};
function volume(geom) {
  const p = geom.attributes.position; let v = 0;
  if (!p) return 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = [p.getX(i), p.getY(i), p.getZ(i)], b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)], c = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)];
    v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return v;
}
const hasNaN = (g) => { for (const x of g.attributes.position?.array || []) if (!Number.isFinite(x)) return true; return false; };

function buildAll(doc) {
  const boxes = {};
  for (const part of doc.parts) {
    const g = buildPartGeometry(part);
    const v = volume(g);
    check(`${part.name} — malla válida`, v > 0 && !hasNaN(g), `vol=${v.toFixed(0)}`);
    g.computeBoundingBox();
    boxes[part.id] = g.boundingBox.clone().applyMatrix4(partMatrix(part));
  }
  return boxes;
}
const byId = (doc, id) => doc.parts.find(p => p.id === id);

// --- variante B: fittings estándar ------------------------------------------
console.log('— VARIANTE B (sonda_suelo_std.json) —');
const B = JSON.parse(readFileSync('ensambles/sonda_suelo_std.json', 'utf8'));
check('34 piezas (sin tórica de transición: unión cementada)', B.parts.length === 34, `hay ${B.parts.length}`);
check('sin tórica de transición', !byId(B, 'torica_cabezal'));
check('tórica de punta se mantiene', !!byId(B, 'torica_punta'));
check('brida comercial en el cabezal', byId(B, 'acople').name.includes('Brida roscada'));
check('terminal PVC cementado en la transición', byId(B, 'transicion').name.includes('Terminal PVC-U'));
check('pilar galvanizado (sin dúplex)', byId(B, 'pilar').name.includes('galv.'));
check('prensaestopas de transición se mantiene (aislación de conducto)', !!byId(B, 'prensa_trans'));
check('BOM patcheada: fitting cementado', B.meta.bom.find(b => b.item === 31).nota.includes('CEMENTADA'));
check('paso 5 = cementar', B.meta.pasos.find(p => p.n === 5).texto.includes('CEMENTAR'));
const bb = buildAll(B);
check('interfaz z compartida con A: brida remata en el piso (924)', Math.abs(bb.acople.max.z - 924) < 0.5, `${bb.acople.max.z}`);
check('pilar mismo envelope que A (86–896)', Math.abs(bb.pilar.min.z - 86) < 0.5 && Math.abs(bb.pilar.max.z - 896) < 0.5);
check('sensores idénticos a A (hoja a r≈192)', Math.abs(bb.sensor1.max.x - 192) < 1.5);

// --- variante D: campo directo ----------------------------------------------
console.log('— VARIANTE D (sonda_campo.json) —');
const D = JSON.parse(readFileSync('ensambles/sonda_campo.json', 'utf8'));
check('19 piezas', D.parts.length === 19, `hay ${D.parts.length}`);
check('ids únicos', new Set(D.parts.map(p => p.id)).size === D.parts.length);
const dfids = D.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(dfids).size === dfids.length);
check('BOM con costos y 8 pasos', D.meta.bom.length >= 16 && D.meta.pasos.length === 8);
const db = buildAll(D);
check('dado de concreto Ø220 bajo NPT', Math.abs(db.dado.min.z - -500) < 0.5 && db.dado.max.z < 1);
check('poste embebido 450 y con hilo a 896', Math.abs(db.poste.min.z - -450) < 0.5 && Math.abs(db.poste.max.z - 896) < 0.5);
check('brida remata en el piso del gabinete (924)', Math.abs(db.brida.max.z - 924) < 0.5);
[1, 2, 3].forEach((i) => {
  const s = byId(D, `sensor${i}`);
  check(`sensor ${i} enterrado a ${-s.pos[2]} con púas abajo`, [-200, -400, -600][i - 1] === s.pos[2] &&
    db[`sensor${i}`].min.z < s.pos[2] - 60);
});
check('sensores alejados del poste (r≈200)', Math.hypot(byId(D, 'sensor1').pos[0], byId(D, 'sensor1').pos[1]) > 150);
check('panel sobre la tapa', db.panel.min.z > 984);
check('electrónica dentro de la cavidad', ['nodo', 'bateria', 'borne_bus', 'desecante'].every(id =>
  db[id].min.x > -84.1 && db[id].max.x < 84.1 && db[id].min.y > -62.1 && db[id].max.y < 62.1 && db[id].max.z < 976));

// --- variante B1.5 v2: estación de poste (alturas OMM) --------------------------
console.log('— VARIANTE B1.5 v2 (sonda_suelo_b15.json) —');
const B15 = JSON.parse(readFileSync('ensambles/sonda_suelo_b15.json', 'utf8'));
check('44 piezas (37 + 7 cables realistas)', B15.parts.length === 44, `hay ${B15.parts.length}`);
check('cableado interior: pasacables en el poste para cada instrumento',
  ['pluviómetro', 'escudo', 'panel', 'antena', 'hoja'].every(k =>
    byId(B15, 'pilar').features.some(f => f.name.includes('Pasacables') && f.name.includes(k))));
check('7 cables modelados', ['cable_bus', 'cables_bajada', 'cable_pluvio', 'cable_escudo', 'cable_panel', 'cable_antena', 'cable_hoja'].every(id => byId(B15, id)));
check('ids únicos', new Set(B15.parts.map(p => p.id)).size === B15.parts.length);
const b15fids = B15.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(b15fids).size === b15fids.length);
check('sin brida ni contratuerca (poste continuo + cap)', !byId(B15, 'acople') && !byId(B15, 'contratuerca') && !!byId(B15, 'cap_poste'));
check('sensores SMT50 con hoja en punta (sketch 135 de largo)', byId(B15, 'sensor1').features.some(f => f.name.includes('punta 30')));
const b15 = buildAll(B15);
check('poste continuo 86–1755 con salida lateral', Math.abs(b15.pilar.min.z - 86) < 0.5 && Math.abs(b15.pilar.max.z - 1755) < 0.5);
check('cap sella el tope', b15.cap_poste.max.z > 1760);
check('gabinete VERTICAL colgado del poste (180 ancho × 130 alto)',
  Math.abs((b15.gabinete.max.z - b15.gabinete.min.z) - 130) < 1 && b15.gabinete.max.y < -25);
check('puerta al SUR (tapa más al −Y que el cuerpo)', b15.tapa.min.y < b15.gabinete.min.y + 1);
check('TODAS las entradas por la cara inferior (z<1086)',
  ['prensa', 'm12_panelbar', 'm12', 'vent', 'entrada_panel'].every(id => b15[id].min.z < 1086));
check('patch panel M12 rotulado (LLUVIA/T-HR/HOJA) presente',
  ['LLUVIA', 'T/HR', 'HOJA'].every(t => byId(B15, 'm12_panelbar').features.some(f => f.name.includes(t))));
check('bajadas terminan en conector M12 volante',
  byId(B15, 'cables_bajada').features.filter(f => f.name.includes('volante')).length === 3);
check('escudo T/HR a 1.47–1.53 m (OMM 1.25–2 m)', b15.escudo_thr.min.z > 1450 && b15.escudo_thr.max.z < 1540);
check('boca del pluviómetro a 1.234 m + pinchos antipájaros', b15.pluviometro.max.z > 1233 && b15.pluviometro.max.z < 1262 && byId(B15, 'pluviometro').features.some(f => f.name.includes('antipájaros')));
check('ménsula del pluviómetro AL POSTE (abrazaderas centradas en el eje)',
  byId(B15, 'pluviometro').features.some(f => f.name.includes('Abrazadera')));
check('panel al NORTE (+Y) sobre la puerta', b15.panel.max.y > 100 && b15.panel.min.z > 1600);
check('antena remata ~1.93 m sobre todo lo demás', b15.antena.max.z > 1900);
check('electrónica dentro del gabinete vertical',
  ['pcb', 'baterias', 'bms', 'borne_bus', 'desecante'].every(id =>
    b15[id].min.z > 1085 && b15[id].max.z < 1215 && b15[id].max.y < -28 && b15[id].min.y > -93));
check('BOM/pasos/alturas OMM en meta', B15.meta.bom.length >= 27 && B15.meta.pasos.length === 12 &&
  B15.meta.webRef.some(w => w.fuente.includes('OMM')));
check('lazo de goteo del bus baja bajo las entradas', b15.cable_bus.min.z < 1046);
check('saltos cortos: cables de bajada confinados tras la caja', b15.cables_bajada.min.y > -64 && b15.cables_bajada.max.z < 1085);

// --- opción CIL: gabinete cilíndrico coaxial (compacto, IP68) -----------------
console.log('— OPCIÓN CIL (gabinete_cil.json) —');
const CIL = JSON.parse(readFileSync('ensambles/gabinete_cil.json', 'utf8'));
check('18 piezas', CIL.parts.length === 18, `hay ${CIL.parts.length}`);
check('ids únicos', new Set(CIL.parts.map(p => p.id)).size === CIL.parts.length);
const cilfids = CIL.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(cilfids).size === cilfids.length);
check('doble barrera IP68: 2 tóricas de cuerpo + 2 de eje', ['or_top', 'or_bot', 'or_mast_t', 'or_mast_b'].every(id => byId(CIL, id)));
check('patch panel M12 rotulado en la base', ['LLUVIA', 'T/HR', 'HOJA'].every(t => byId(CIL, 'm12_panel').features.some(f => f.name.includes(t))));
check('meta CIL: normas IEC 60529 + ISO 3601 en webRef', CIL.meta.webRef.some(w => w.fuente.includes('60529')) && CIL.meta.webRef.some(w => w.fuente.includes('3601')));
const cb = buildAll(CIL);
check('cuerpo cilíndrico Ø160 (banda 1090–1310)', Math.abs((cb.cuerpo.max.x - cb.cuerpo.min.x) - 160) < 2 && Math.abs(cb.cuerpo.min.z - 1090) < 1 && Math.abs(cb.cuerpo.max.z - 1310) < 1);
check('poste PASANTE y continuo por el eje (850–1560)', Math.abs(cb.mastil.min.z - 850) < 1 && Math.abs(cb.mastil.max.z - 1560) < 1 && Math.abs(cb.mastil.min.x + cb.mastil.max.x) < 1);
check('tapas sup./inf. cierran la cápsula', cb.cap_top.min.z > 1285 && cb.cap_bot.max.z < 1116);
check('electrónica dentro de la cavidad anular (poste 1090–1310)', ['pcb', 'baterias', 'bms', 'desecante'].every(id => cb[id].min.z > 1090 && cb[id].max.z < 1310));
check('celdas 18650 fuera del tubo interior Ø56 (en el anillo)', Math.hypot((cb.baterias.min.x + cb.baterias.max.x) / 2, (cb.baterias.min.y + cb.baterias.max.y) / 2) < 80 && (cb.baterias.max.x - cb.baterias.min.x) > 60);
check('antena remata sobre la tapa superior', cb.antena.min.z > 1315);

console.log(`\n${pass} ✔ · ${fail} ✘`);
process.exit(fail ? 1 : 0);
