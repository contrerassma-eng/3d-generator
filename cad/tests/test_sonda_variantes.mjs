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

// --- variante B1.5 v3: cabezal cilíndrico coaxial (alturas OMM) -----------------
console.log('— VARIANTE B1.5 v3 (sonda_suelo_b15.json) —');
const B15 = JSON.parse(readFileSync('ensambles/sonda_suelo_b15.json', 'utf8'));
check('37 piezas (33 + 4 cables realistas)', B15.parts.length === 37, `hay ${B15.parts.length}`);
check('cableado interior: pasacables en el poste para cada instrumento',
  ['pluviómetro', 'escudo', 'panel', 'hoja'].every(k =>
    byId(B15, 'pilar').features.some(f => f.name.includes('Pasacables') && f.name.includes(k))));
check('sin salidas laterales de bajada (el cableado remata en el cabezal)',
  !byId(B15, 'pilar').features.some(f => f.name.includes('Salida lateral')));
check('4 cables de instrumento modelados', ['cable_pluvio', 'cable_escudo', 'cable_panel', 'cable_hoja'].every(id => byId(B15, id)));
check('ids únicos', new Set(B15.parts.map(p => p.id)).size === B15.parts.length);
const b15fids = B15.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(b15fids).size === b15fids.length);
check('sin gabinete, cap ni prensaestopas de cable (v3)',
  ['gabinete', 'junta', 'tapa', 'cap_poste', 'prensa', 'prensas_superficie', 'entrada_panel'].every(id => !byId(B15, id)));
check('cabezal en norma: tubo EN ISO 1452 + tóricas ISO 3601 + NPT hembra',
  byId(B15, 'cabezal_cuerpo').name.includes('EN ISO 1452') && byId(B15, 'cabezal_base').name.includes('NPT') &&
  byId(B15, 'torica_base').name.includes('ISO 3601') && !!byId(B15, 'torica_tapa'));
check('gargantas regla Parker en base y tapa',
  byId(B15, 'cabezal_base').features.some(f => f.name.includes('Parker')) &&
  byId(B15, 'cabezal_tapa').features.some(f => f.name.includes('Parker')));
check('sensores SMT50 con hoja en punta (sketch 135 de largo)', byId(B15, 'sensor1').features.some(f => f.name.includes('punta 30')));
const b15 = buildAll(B15);
check('poste continuo 86–1755', Math.abs(b15.pilar.min.z - 86) < 0.5 && Math.abs(b15.pilar.max.z - 1755) < 0.5);
check('base del cabezal rosca el tope del poste (hub desde 1730)',
  Math.abs(b15.cabezal_base.min.z - 1730) < 0.5 && b15.cabezal_base.max.z > 1784);
check('cabezal coaxial y compacto: cuerpo Ø125 centrado en el eje',
  Math.abs(b15.cabezal_cuerpo.max.x + b15.cabezal_cuerpo.min.x) < 0.5 &&
  Math.abs(b15.cabezal_cuerpo.max.y + b15.cabezal_cuerpo.min.y) < 0.5 &&
  (b15.cabezal_cuerpo.max.x - b15.cabezal_cuerpo.min.x) < 128.5);
check('tóricas 104×3 en sus gargantas (z 1771 y 1906)',
  Math.abs((b15.torica_base.max.z + b15.torica_base.min.z) / 2 - 1771) < 0.3 &&
  Math.abs((b15.torica_tapa.max.z + b15.torica_tapa.min.z) / 2 - 1906) < 0.3 &&
  Math.abs((b15.torica_base.max.x - b15.torica_base.min.x) - 111) < 0.6);
check('tapa con goterón y pasamuro N/SMA',
  byId(B15, 'cabezal_tapa').features.some(f => f.name.includes('Goterón')) &&
  byId(B15, 'cabezal_tapa').features.some(f => f.name.includes('N/SMA')));
check('penetraciones exteriores SOLO bajo el disco (m12, tapa M12, Gore)',
  ['m12_tapa', 'vent'].every(id => b15[id].max.z < 1765.5 && b15[id].min.z > 1725) &&
  b15.m12.min.z > 1725 && b15.m12.max.z < 1774);
check('electrónica dentro del cilindro (Ø110.2, z 1785–1901)',
  ['pcb', 'portapilas', 'baterias', 'desecante', 'columnas'].every(id =>
    Math.max(Math.abs(b15[id].min.x), Math.abs(b15[id].max.x), Math.abs(b15[id].min.y), Math.abs(b15[id].max.y)) < 55.2 &&
    b15[id].min.z > 1784.5 && b15[id].max.z < 1901.5));
check('escudo T/HR a 1.47–1.53 m (OMM 1.25–2 m)', b15.escudo_thr.min.z > 1450 && b15.escudo_thr.max.z < 1540);
check('boca del pluviómetro a 1.234 m + pinchos antipájaros', b15.pluviometro.max.z > 1233 && b15.pluviometro.max.z < 1262 && byId(B15, 'pluviometro').features.some(f => f.name.includes('antipájaros')));
check('ménsula del pluviómetro AL POSTE (abrazaderas centradas en el eje)',
  byId(B15, 'pluviometro').features.some(f => f.name.includes('Abrazadera')));
check('panel al NORTE (+Y) en el poste', b15.panel.max.y > 100 && b15.panel.min.z > 1600);
check('antena coaxial sobre la tapa, remata ~2.15 m',
  b15.antena.max.z > 2100 && Math.abs(b15.antena.max.x + b15.antena.min.x) < 1);
check('BOM/pasos/alturas OMM en meta', B15.meta.bom.length >= 25 && B15.meta.pasos.length === 12 &&
  B15.meta.webRef.some(w => w.fuente.includes('OMM')) && B15.meta.variante === 'smt50-v3');

console.log(`\n${pass} ✔ · ${fail} ✘`);
process.exit(fail ? 1 : 0);
