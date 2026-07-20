// Prueba de los ensambles LBP530 (cad/ensambles/lbp530_5m.json y
// lbp530_gt08.json, proyecto projects/LBP530-18): invariantes del diseño
// (ejes cuadrados 1.5 in con muñones Ø30, sprockets Z24 según manual Movex,
// nosebar en ambas puntas, motriz abajo con wrap 140±10, retorno LBP por
// zapatas) y regeneración CSG de las piezas torneadas (volúmenes coherentes).
//
// Correr (ver tests/README.md):
//   npx esbuild tests/test_lbp530.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_lbp530.bundle.mjs
//   node /tmp/test_lbp530.bundle.mjs            # desde cad/

import { readFileSync } from 'node:fs';
import { buildPartGeometry } from '../js/model.js';

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

const dims = JSON.parse(readFileSync('ensambles/lbp530_dims.json', 'utf8'));
const D = dims.D;

console.log('— dimensiones (lbp530_dims.json)');
check('eje motriz = cuadrado + muñón libre + muñón motriz',
  Math.abs(D.sqLen + D.jrnLibre + D.jrnMotriz - D.ejeMotrizL) < 1e-6);
check('eje tensor = cuadrado + 2 muñones', Math.abs(D.sqLen + 2 * D.jrnLibre - D.ejeTensorL) < 1e-6);
check('muñón Ø30 sale de la barra cuadrada 38.1', D.jrnDia < D.sq);
check('cubo del motorreductor + rodamiento caben en el muñón motriz', D.cuboMotor + D.jrnLibre <= D.jrnMotriz);
check('bore de chumacera = Ø muñón (UCF206/30)', D.ucf.bore === D.jrnDia);
check('8 motrices salen de una barra de 6 m', 8 * (D.ejeMotrizL + 9) <= 6000);
check('8 tensores salen de una barra de 6 m', 8 * (D.ejeTensorL + 9) <= 6000);
check('ancho entre placas = banda 457.2 + holguras', Math.abs(D.innerW - (dims.belt.ancho + 2 * D.claroLat)) < 0.01);
check('grid de sprockets 530 LBP = A·B·C·B·C·A del manual p.30 / brochure p.11',
  JSON.stringify(D.ySprkLBP) === JSON.stringify([-152.4, -89.05, 0, 63.35, 152.4]));

for (const [file, tipo] of [['ensambles/lbp530_5m.json', 'LBP'], ['ensambles/lbp530_gt08.json', 'GT']]) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`— ${file}`);
  const ids = new Set(doc.parts.map(p => p.id));
  check('ids únicos', ids.size === doc.parts.length);
  const nose = doc.parts.filter(p => p.name.includes('Nosebar'));
  check('nosebar en AMBAS puntas', nose.length === 2);
  const sprk = doc.parts.filter(p => p.name.includes('Sprocket'));
  const nEsper = (tipo === 'LBP' ? dims.belt.nSprkLBP : dims.belt.nSprkGT) + 2;
  check(`sprockets Z24: ${nEsper} (motriz según manual Movex + 2 locos)`, sprk.length === nEsper, `hay ${sprk.length}`);
  const wrap = doc.meta.verificaciones[tipo === 'LBP' ? 'wrapMotrizLBP' : 'wrapMotrizGT'];
  check('wrap de la motriz 115–175° (objetivo Movex 140±10)', wrap >= 115 && wrap <= 175, String(wrap));
  const banda = doc.parts.find(p => p.name.includes('Banda'));
  check('banda: lazo cerrado (exterior + vaciado)', banda && banda.features.length === 2
    && banda.features[0].params.pts.length > 100 && banda.features[1].op === 'cut');
  const rets = doc.parts.filter(p => p.name.includes('Rodillo retorno'));
  if (tipo === 'LBP') {
    check('retorno por rodillos de eje muerto cada ~500 (decisión usuario)', rets.length >= 7, `hay ${rets.length}`);
    check('rodillos LBP presentes', doc.parts.some(p => p.name.includes('Rodillos LBP')));
    check('catenaria dentro de 50–150', doc.meta.verificaciones.sagCatenariaLBP >= 50 && doc.meta.verificaciones.sagCatenariaLBP <= 150);
  } else {
    check('retorno por rodillo Ø63.5 (D>50)', rets.length >= 1);
    check('goma grip top presente', doc.parts.some(p => p.name.includes('Grip Top')));
  }
  check('rodillo retorno: perno hex M8 por fuera en ambos lados', rets.every(p =>
    p.features.filter(f => f.name.includes('Perno hex M8')).length === 2));
  check('collarines P21703Y flanquean el sprocket central', doc.parts.filter(p => p.name.includes('Collarín')).length === 2);
  // regeneración CSG de los ejes (piezas de torno)
  for (const nm of ['EJE MOTRIZ', 'EJE TENSOR']) {
    const part = doc.parts.find(p => p.name.includes(nm));
    const res = buildPartGeometry(part);
    const g = res.geometry || res;
    const v = Math.abs(volume(g));
    // volumen esperado: cuadrado + muñones (menos chavetero/rosca en el motriz)
    const sq = D.sq * D.sq * D.sqLen;
    const cil = Math.PI * 15 * 15 * (nm === 'EJE MOTRIZ' ? D.jrnLibre + D.jrnMotriz : 2 * D.jrnLibre);
    const esperado = sq + cil;
    check(`${nm}: CSG regenera con volumen ~esperado`, v > esperado * 0.9 && v < esperado * 1.02,
      `${Math.round(v / 1000)} vs ${Math.round(esperado / 1000)} cm³×10⁻³`);
  }
}

console.log(`\n${pass} OK, ${fail} fallas`);
if (fail) process.exit(1);
