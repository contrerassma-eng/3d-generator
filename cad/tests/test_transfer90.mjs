// Prueba del ensamble "Transferencia 90°" (cad/ensambles/transfer_rodillos_90.json):
// construye CADA pieza con el motor CSG real (model.js) y verifica volúmenes,
// mallas sin NaN, unicidad de ids y los invariantes del diseño AJUSTADO AL
// EQUIPO BASE (STEP sorter_CO): 5 rodillos Ø63 a paso 139 (1 por hueco entre las
// 4 bandas del base), rodillo de EJE MUERTO Ø20 perforado/roscado M10 con 2
// rodamientos 6004 entre eje y tubo y perno M10+golilla de sujeción; el tambor
// conserva 1 UCFL204; montaje a riel T-slot con pies + shims (cero perforaciones
// al base); tambor con SIT-LOCK; serpentín y elevación por palanca/cilindros.
//
// Correr (ver tests/README.md):
//   npx esbuild tests/test_transfer90.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_transfer90.bundle.mjs
//   node /tmp/test_transfer90.bundle.mjs        # desde cad/

import { readFileSync } from 'node:fs';
import { buildPartGeometry } from '../js/model.js';

const jsonPath = process.argv[2] || 'ensambles/transfer_rodillos_90.json';
const doc = JSON.parse(readFileSync(jsonPath, 'utf8'));

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${detail}`); }
};
function volume(geom) {
  const p = geom.attributes.position;
  if (!p) return 0;
  let v = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = [p.getX(i), p.getY(i), p.getZ(i)];
    const b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
    const c = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)];
    v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return v;
}
const hasNaN = (geom) => { for (const x of geom.attributes.position?.array || []) if (!Number.isFinite(x)) return true; return false; };
const world = (part, at) => [at[0] + part.pos[0], at[1] + part.pos[1], at[2] + part.pos[2]];
const by = (n) => doc.parts.filter(p => p.name.includes(n));

console.log('— Documento y módulos —');
check('formato foto3d-cad v1', doc.format === 'foto3d-cad' && doc.version === 1);
check('107 piezas', doc.parts.length === 107, `hay ${doc.parts.length}`);
check('ids de pieza únicos', new Set(doc.parts.map(p => p.id)).size === doc.parts.length);
const fids = doc.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(fids).size === fids.length);
check('una pieza fija (canal) a tierra', doc.parts.filter(p => p.fixed).length === 1 && doc.parts[0].name.includes('Canal'));
check('todas FIJO · o MÓVIL ·', doc.parts.every(p => /^(FIJO|MÓVIL) · /.test(p.name)));

console.log('— Construcción CSG —');
let built = 0, conVol = 0, sinNaN = 0; const vols = {};
for (const part of doc.parts) {
  const g = buildPartGeometry(part); built++;
  const v = volume(g); vols[part.id] = v;
  if (v > 1) conVol++; if (!hasNaN(g)) sinNaN++; else console.log(`    NaN en ${part.name}`);
  if (v <= 1) console.log(`    sin volumen: ${part.name}`);
}
check('las 107 piezas construyen', built === 107);
check('todas con volumen > 0', conVol === 107);
check('ninguna malla con NaN', sinNaN === 107);

console.log('— Rodillos ajustados al base: 5 × Ø63 a paso 139 —');
const vulc = by('Vulcanizado Ø63');
check('5 rodillos vulcanizados Ø63', vulc.length === 5, `hay ${vulc.length}`);
check('paso 139 uniforme (1 por hueco entre las 4 bandas del base)', (() => {
  const ys = vulc.map(p => p.pos[1]).sort((a, b) => a - b);
  return ys.length === 5 && ys.every((y, i) => i === 0 || Math.abs((y - ys[i - 1]) - 139) < 1e-6);
})());
check('5 tubos de acero Ø51 (bore Ø42 para rodamientos)', by('Tubo de acero Ø51').length === 5 &&
  by('Tubo de acero Ø51').every(p => p.features.some(f => f.name.includes('Barreno Ø42'))));
check('gap tangente 76 (paso 139 − Ø63) ≥ 50', doc.meta.verificaciones.tangentGap === 76);

console.log('— Rodillo de EJE MUERTO: perforado/roscado M10 + perno de sujeción —');
const ejeM = by('Eje muerto rodillo');
check('5 ejes muertos Ø20', ejeM.length === 5 && ejeM.every(p => p.features[0].params.dia === 20));
check('cada eje muerto con 2 taladros Ø8.5 + rosca M10 (hilo interior)', ejeM.every(p =>
  p.features.filter(f => /rosca M10/.test(f.name)).length === 2));
check('10 pernos M10 + golilla de sujeción (2 por rodillo)', by('Perno M10×25 + golilla eje').length === 10);
check('alojamiento del eje en placa Ø20.5 (no UCFL en rodillos)', (() => {
  const placas = by('Placa porta-poleas');
  const alo = placas.flatMap(pl => pl.features.filter(f => f.name.includes('Alojamiento eje muerto Ø20.5')));
  return alo.length === 10;   // 5 por placa × 2 placas
})());

console.log('— Rodamientos 6004 entre eje y tubo (no rodamientos desnudos sueltos) —');
const rod = by('Rodamiento 6004');
check('10 rodamientos 6004 (2 por rodillo)', rod.length === 10, `hay ${rod.length}`);
check('rodamiento 6004: aro Ø42 y bore Ø20 (entre eje Ø20 y tubo Ø51)', rod.every(p => {
  const aro = p.features.find(f => f.name.includes('Aro Ø42'));
  return aro && aro.params.dia === 42;
}));
check('rodamiento concéntrico con su eje muerto (misma línea y,z)', rod.every(r =>
  ejeM.some(s => Math.abs(s.pos[1] - r.pos[1]) < 1e-6 && Math.abs(s.pos[2] - r.pos[2]) < 1e-6)));
check('SIN rodamientos de bolas antiguos (6901/6205) ni portarodamiento', by('Rodamiento 6901').length === 0 &&
  by('Rodamiento 6205').length === 0 && by('Portarodamiento').length === 0);

console.log('— Tambor: 1 UCFL204 + SIT-LOCK + motor por dentro —');
const ucfl = by('Chumacera UCFL204');
check('1 chumacera UCFL204 (solo el tambor; los rodillos ya no la usan)', ucfl.length === 1, `hay ${ucfl.length}`);
check('UCFL con brida, cubo, collar excéntrico, grasera y 2 bulones M10', ucfl.every(p => {
  const n = p.features.map(f => f.name).join('|');
  return /Brida/.test(n) && /Cubo/.test(n) && /Collar excéntrico/.test(n) && /Grasera/.test(n) &&
    p.features.filter(f => f.name.includes('Bulón')).length === 2;
}));
const ejeT = doc.parts.find(p => p.name.includes('Eje tambor Ø20'));
check('UCFL del tambor concéntrica con el eje del tambor', ejeT &&
  Math.abs(ejeT.pos[1] - ucfl[0].pos[1]) < 1e-6 && Math.abs(ejeT.pos[2] - ucfl[0].pos[2]) < 1e-6);
const tambor = doc.parts.find(p => p.name.includes('Tambor motriz'));
check('tambor con SIT-LOCK (sin chaveta en el tambor)', by('SIT-LOCK').length === 1 &&
  !tambor.features.some(f => /chavet/i.test(f.name)));
check('2 chavetas DIN 6885 en el acople del motor', by('Chaveta').filter(p => p.name.includes('acople')).length === 2);
const motor = doc.parts.find(p => p.name.includes('Motorreductor'));
const cuerpoM = motor.features.find(f => f.name.startsWith('Cuerpo'));
check('motor por dentro (cuerpo dentro de |x| ≤ 148)', (() => {
  const w = world(motor, cuerpoM.at); return w[0] - cuerpoM.params.w / 2 >= -148 && w[0] + cuerpoM.params.w / 2 <= 148;
})());

console.log('— Idlers sobre bujes de bronce (sin rodamientos desnudos) —');
check('9 bujes de bronce (5 poleas + 4 palanca)', by('Buje bronce').length === 9, `hay ${by('Buje bronce').length}`);
check('5 poleas locas (3 tensores + 2 retornos) con retención M6', by('Retención M6 polea').length === 5);
check('ejes cantiléver de idler Ø12', by('Eje cantiléver').every(p => p.features[0].params.dia === 12));

console.log('— Montaje al equipo base SIN modificarlo (T-slot + shims) —');
const canal = doc.parts[0];
check('canal SIN perforaciones de anclaje al base (Ø11)', !canal.features.some(f => f.name.includes('Anclaje')));
check('canal con colisos de altura para los pies', canal.features.some(f => f.name.includes('Coliso M8 pie')));
const pies = by('Pie anclaje T-slot');
check('4 pies de anclaje a riel T-slot', pies.length === 4);
check('cada pie con ranura para tuerca en T (ajuste X) y colisos M8 (ajuste altura)', pies.every(p => {
  const n = p.features.map(f => f.name).join('|');
  return /Ranura T-nut/.test(n) && p.features.filter(f => f.name.includes('Coliso M8')).length === 2;
}));
check('4 shims de nivelación', by('Shim de nivelación').length === 4);

console.log('— Invariantes de función —');
const M = doc.meta.verificaciones;
check('gap tangente 76, carrera vertical 6, 5 rodillos', M.tangentGap === 76 && M.carrera === 6 && M.rodillos === 5);
check('sobre-elevación 4 y retracción 2 (emerge +4 sobre el plano de banda)', M.pop === 4 && M.drop === 2);
check('2 cilindros ISO 6432 en diagonal + 4 rótulas', by('Cilindro ISO 6432').length === 2 && by('Rótula').length === 4);
check('una sola banda plana 35 en serpentín', by('Banda plana').length === 1 && by('Banda plana')[0].features[0].params.h === 35);
check('tolerancias/integración documentadas en meta', typeof doc.meta.tolerancias === 'object' &&
  !!(doc.meta.integracion && doc.meta.tolerancias.eje_rodillo && doc.meta.tolerancias.tubo_rodillo));

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
