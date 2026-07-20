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

// --- variante B1.5: SMT50 + estación de superficie -----------------------------
console.log('— VARIANTE B1.5 (sonda_suelo_b15.json) —');
const B15 = JSON.parse(readFileSync('ensambles/sonda_suelo_b15.json', 'utf8'));
check('38 piezas (34 de B + escudo + pluvio + hoja + prensas superficie)', B15.parts.length === 38, `hay ${B15.parts.length}`);
check('sensores SMT50', byId(B15, 'sensor1').name.includes('SMT50'));
const hoja15 = byId(B15, 'sensor1').features.find(f => f.name.includes('Hoja'));
check('hoja SMT50 135×21.5 (ficha 01/2018)', hoja15.params.h === 135 && hoja15.params.w === 21.5);
check('ranura pasamuro reducida 23×9', byId(B15, 'pasamuro1').features.some(f => f.name.includes('23×9')));
check('estación de superficie presente', ['escudo_thr', 'pluviometro', 'sensor_hoja'].every(id => byId(B15, id)));
check('BOM con SMT50 EUR 71 + ADC + 3 externos', B15.meta.bom.find(b => b.item === 3).mat.includes('EUR 71') &&
  B15.meta.bom.find(b => b.item === 12).desig.includes('ADS1115') && B15.meta.bom.length >= 35);
check('webRef cita ficha SMT50', B15.meta.webRef.some(w => w.url.includes('SMT50_Flyer')));
const b15 = buildAll(B15);
check('hoja sensora fuera del tubo >=100', Math.abs(b15.sensor1.max.x - 145) < 1.5, `${b15.sensor1.max.x}`);
check('boca del pluviómetro sobre el panel', b15.pluviometro.max.z > b15.panel.max.z,
  `${b15.pluviometro.max.z.toFixed(0)} vs panel ${b15.panel.max.z.toFixed(0)}`);
check('pluviómetro fuera de la sombra del panel (|y|>150)', b15.pluviometro.min.y < -150 && b15.pluviometro.max.y - 220 < 0);
check('escudo T/HR bajo el gabinete, lado −X, separado del pilar', b15.escudo_thr.max.z < 924 && b15.escudo_thr.min.x < -180);
check('pluviómetro ANCLADO a la pared −Y (placa toca y=-65)', Math.abs(b15.pluviometro.max.y - -65) < 0.5,
  `${b15.pluviometro.max.y}`);
check('entradas de superficie presentes (2× M16 en −Y)', !!byId(B15, 'prensas_superficie') &&
  B15.parts.find(p => p.id === 'gabinete').features.some(f => f.name.includes('Paso superficie')));
check('pasacable de panel en tapa (todas las variantes)', ['prensa_panel'].every(id => byId(B15, id) && byId(B, id)));
check('interfaces compartidas: brida al piso 924', Math.abs(b15.acople.max.z - 924) < 0.5);

console.log(`\n${pass} ✔ · ${fail} ✘`);
process.exit(fail ? 1 : 0);
