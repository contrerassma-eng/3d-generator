// Pruebas del módulo de chapa: tolerancia de plegado (BA), geometría plegada
// con radio real, desahogos, cadenas de pestañas y desarrollo real.
//   npx esbuild tests/test_sheetmetal.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/t.mjs && node /tmp/t.mjs
import * as THREE from 'three';
import { newDoc, newPart, buildPartGeometry } from '../js/model.js';
import { makeChapaBase, makePestana, bendAllowance, flatPattern,
         chapaEdges, esChapa } from '../js/sheetmetal.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${detail}`); }
};
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

function volume(geom) {
  const p = geom.attributes.position;
  let v = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return v;
}
function bbox(geom) {
  geom.computeBoundingBox();
  return geom.boundingBox;
}

console.log('— tolerancia de plegado —');
// BA = θ(R + K·t): 90°, R=2, t=2, K=0.44 → (π/2)(2.88) = 4.5239
check('BA 90° R2 t2 K0.44', near(bendAllowance(90, 2, 2, 0.44), 4.5239, 0.001));
check('BA lineal con el ángulo', near(bendAllowance(45, 2, 2, 0.44), 4.5239 / 2, 0.001));

console.log('— chapa base + pestaña 90° a lo ancho completo —');
const doc = newDoc();
const p1 = newPart(doc, 'Chapa L');
const base = makeChapaBase(100, 60, 'acero', 2, 2, 0.44);
p1.features.push(base);
p1.features.push(makePestana(base.id, 0, 30, 90, 2, 'arriba'));   // borde E
check('es pieza de chapa', esChapa(p1));
const g1 = buildPartGeometry(p1);
const bb1 = bbox(g1);
// base x∈[−50,50]; arco exterior hasta 50+R+t=54; alto: zm+Rm=1+3 → +altura 30 = 34
check('bbox plegado X (radio real)', near(bb1.max.x, 54, 0.05), `max.x=${bb1.max.x}`);
check('bbox plegado Z (altura tras arco)', near(bb1.max.z, 34, 0.05), `max.z=${bb1.max.z}`);
check('bbox base intacta', near(bb1.min.x, -50, 0.01) && near(bb1.min.z, 0, 0.01));
// volumen: base 12000 + sector π/4(4²−2²)·60 = 565.49 + plana 30·2·60 = 3600
const v1 = volume(g1);
check('volumen plegado (±2%)', Math.abs(v1 - 16165) / 16165 < 0.02, `v=${v1.toFixed(0)}`);

console.log('— desarrollo real —');
const flat1 = flatPattern(p1);
const xs = flat1.contorno.map(p => p[0]), ys = flat1.contorno.map(p => p[1]);
const BA = bendAllowance(90, 2, 2, 0.44);
// desarrollo: 100 + BA + 30 a lo largo de X; 60 en Y
check('desarrollo largo = w + BA + H', near(Math.max(...xs) - Math.min(...xs), 100 + BA + 30, 0.01),
  `largo=${(Math.max(...xs) - Math.min(...xs)).toFixed(3)}`);
check('desarrollo ancho = d', near(Math.max(...ys) - Math.min(...ys), 60, 0.01));
check('3 líneas de plegado (eje + 2 tangentes)',
  flat1.pliegues.length === 3 &&
  flat1.pliegues.filter(l => l.tipo === 'eje').length === 1);
const eje = flat1.pliegues.find(l => l.tipo === 'eje');
check('eje de pliegue en el centro de la zona', near(eje.a[0], 50 + BA / 2, 0.001));
check('etiqueta con dirección/ángulo/radio', flat1.etiquetas[0].s.includes('90°') &&
  flat1.etiquetas[0].s.includes('R2') && flat1.etiquetas[0].s.includes('ARRIBA'));
check('sin avisos (solo chapa)', flat1.avisos.length === 0);

console.log('— pestaña parcial: desahogos —');
const p2 = newPart(doc, 'Chapa desahogo');
const base2 = makeChapaBase(100, 60, 'acero', 2, 2, 0.44);
p2.features.push(base2);
p2.features.push(makePestana(base2.id, 0, 20, 90, 2, 'arriba', 10, 10)); // offsets 10/10
const g2 = buildPartGeometry(p2);
const v2 = volume(g2);
// flanco: L=40: sector π/4·12·40=376.99 + plana 20·2·40=1600 + base 12000 − 2 muescas (4·2·2)
const vTeo = 12000 + (Math.PI / 4) * 12 * 40 + 20 * 2 * 40 - 2 * (4 * 2 * 2);
check('volumen con desahogos (±2%)', Math.abs(v2 - vTeo) / vTeo < 0.02,
  `v=${v2.toFixed(0)} teo=${vTeo.toFixed(0)}`);
const flat2 = flatPattern(p2);
// cada muesca añade 3 vértices al contorno (2 muescas = +6)
check('contorno con muescas de desahogo', flat2.contorno.length >= flat1.contorno.length + 6);
const minXnotch = Math.min(...flat2.contorno.filter(p => p[0] > 40 && p[0] < 50).map(p => p[0]));
check('muesca entra al padre (profundidad R+t)',
  flat2.contorno.some(p => near(p[0], 50 - (2 + 2), 0.01)));

console.log('— cadena: pestaña sobre pestaña (U) —');
const p3 = newPart(doc, 'Chapa U');
const base3 = makeChapaBase(80, 50, 'acero', 2, 2, 0.44);
p3.features.push(base3);
const f1 = makePestana(base3.id, 0, 25, 90, 2, 'arriba');
p3.features.push(f1);
p3.features.push(makePestana(f1.id, 'punta', 15, 90, 2, 'arriba'));
const g3 = buildPartGeometry(p3);
check('cadena genera sólido válido', g3.attributes.position.count > 0 && volume(g3) > 0);
const bb3 = bbox(g3);
// 2.º pliegue arriba: la 2.ª pestaña vuelve hacia −X → max.x sigue ≈ 40+R+t
check('2.ª pestaña pliega de vuelta', bb3.max.x < 40 + 4 + 0.1, `max.x=${bb3.max.x}`);
const flat3 = flatPattern(p3);
const largo3 = Math.max(...flat3.contorno.map(p => p[0])) - Math.min(...flat3.contorno.map(p => p[0]));
check('desarrollo de cadena = w + 2BA + H1 + H2',
  near(largo3, 80 + 2 * BA + 25 + 15, 0.01), `largo=${largo3.toFixed(3)}`);
check('6 líneas de plegado en cadena', flat3.pliegues.length === 6);

console.log('— aristas citables y ocupación —');
const edges3 = chapaEdges(p3);
check('base 4 aristas + 2 puntas', edges3.length === 6, `n=${edges3.length}`);
check('arista E de la base ocupada', edges3.find(e => e.borde === 0 && !e.libre) !== undefined);
check('punta de la 2.ª pestaña libre',
  edges3.filter(e => e.borde === 'punta' && e.libre).length === 1);

console.log('— dirección abajo —');
const p4 = newPart(doc, 'Chapa abajo');
const base4 = makeChapaBase(60, 40, 'aluminio', 0, 0, 0);  // defaults del material
p4.features.push(base4);
check('espesor por defecto del material', base4.params.t === 2);
check('radio por defecto = espesor (símil Inventor)', base4.params.radio === base4.params.t);
check('K por defecto del material', base4.params.k === 0.42);
p4.features.push(makePestana(base4.id, 0, 20, 90, 2, 'abajo'));
const bb4 = bbox(buildPartGeometry(p4));
check('pliegue hacia abajo baja en Z', bb4.min.z < -15, `min.z=${bb4.min.z}`);

console.log('— serialización (round-trip JSON) —');
const clone = JSON.parse(JSON.stringify(p3));
const g3b = buildPartGeometry(clone);
check('regenera igual tras JSON', near(volume(g3b), volume(g3), 0.01));

console.log(`\n${pass}/${pass + fail} pruebas OK`);
if (fail) process.exit(1);
