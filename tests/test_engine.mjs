// Revisión del motor: CSG, regeneración paramétrica y solver.
// Se ejecuta en Node (bundleado con esbuild, alias three → vendor).
import * as THREE from 'three';
import { geomToCSG, csgToGeom, CSG } from '../js/csg.js';
import {
  newDoc, newPart, makeBoxFeature, makeCylFeature, makeHoleFeature,
  makeSketchFeature, makeSketchEntitiesFeature, planeBasis, magnetCorrections,
  buildPartGeometry, planarFaceFromHit, findAxialFeature,
  makeMate, makeConcentric, solveConstraints, partMatrix,
} from '../js/model.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${detail}`); }
};

// volumen firmado de una sopa de triángulos (malla cerrada y orientada)
function volume(geom) {
  const p = geom.attributes.position;
  if (!p) return 0;
  let v = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return v;
}
function hasNaN(geom) {
  const arr = geom.attributes.position?.array || [];
  for (const x of arr) if (!Number.isFinite(x)) return true;
  return false;
}
function buildPart(features) {
  const doc = newDoc();
  const part = newPart(doc, 't');
  part.features.push(...features);
  return buildPartGeometry(part);
}
const rel = (x, y) => Math.abs(x - y) / Math.max(1, Math.abs(y));

console.log('— CSG: volúmenes y robustez —');

// 1. caja simple
{
  const g = buildPart([makeBoxFeature(120, 80, 10)]);
  check('caja 120×80×10 volumen exacto', rel(volume(g), 96000) < 1e-6, `vol=${volume(g)}`);
}

// 2. caja − 4 agujeros Ø6 pasantes (el facetado de 48 lados reduce ~0.3% el cilindro)
{
  const holes = [[-45, -25], [45, -25], [-45, 25], [45, 25]].map(([x, y]) =>
    makeHoleFeature(6, 10, true, [x, y, 10], [0, 0, -1]));
  const g = buildPart([makeBoxFeature(120, 80, 10), ...holes]);
  const cylFacet = 0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI; // área polígono/círculo
  const expected = 96000 - 4 * Math.PI * 9 * 10 * cylFacet;
  check('caja − 4 agujeros pasantes', rel(volume(g), expected) < 0.002, `vol=${volume(g)} esp=${expected.toFixed(1)}`);
  check('sin NaN tras cortes', !hasNaN(g));
}

// 3. unión coplanar (caja apilada exactamente sobre otra: caras coincidentes)
{
  const g = buildPart([makeBoxFeature(40, 40, 10), makeBoxFeature(20, 20, 10, [0, 0, 10])]);
  check('unión con caras coplanares', rel(volume(g), 16000 + 4000) < 0.005, `vol=${volume(g)}`);
}

// 4. agujeros solapados (dos Ø10 con centros a 5 mm)
{
  const g = buildPart([
    makeBoxFeature(60, 60, 8),
    makeHoleFeature(10, 8, true, [0, 0, 8], [0, 0, -1]),
    makeHoleFeature(10, 8, true, [5, 0, 8], [0, 0, -1]),
  ]);
  const v = volume(g);
  check('agujeros solapados: volumen coherente', v > 27000 && v < 28800 && !hasNaN(g), `vol=${v}`);
}

// 5. agujero lateral (eje X) que cruza un agujero vertical
{
  const g = buildPart([
    makeBoxFeature(40, 40, 40),
    makeHoleFeature(12, 40, true, [0, 0, 40], [0, 0, -1]),
    makeHoleFeature(12, 40, true, [-20, 0, 20], [1, 0, 0]),
  ]);
  check('agujeros cruzados en T sin NaN', !hasNaN(g) && volume(g) > 0, `vol=${volume(g)}`);
}

// 6. agujero más grande que la pieza (se come todo)
{
  const g = buildPart([makeBoxFeature(20, 20, 5), makeHoleFeature(200, 5, true, [0, 0, 5], [0, 0, -1])]);
  const v = volume(g);
  check('agujero que devora la pieza → volumen ~0', Math.abs(v) < 1, `vol=${v}`);
}

// 7. pieza cuyo único feature es un corte (caso del usuario que borra la base)
{
  let crashed = false, g = null;
  try { g = buildPart([makeHoleFeature(6, 10, true, [0, 0, 0], [0, 0, -1])]); } catch (e) { crashed = true; }
  check('solo-corte no revienta buildPartGeometry', !crashed);
  // EdgesGeometry sobre el resultado (lo que hace rebuildPart):
  let edgeCrash = false;
  try { new THREE.EdgesGeometry(g, 20); } catch (e) { edgeCrash = true; }
  check('EdgesGeometry sobre geometría vacía no revienta', !edgeCrash, '(crash en rebuildPart)');
}

// 8. cilindro tumbado (eje X) como pieza + corte caja
{
  const g = buildPart([
    makeCylFeature(30, 60, [-30, 0, 15], [1, 0, 0]),
    makeBoxFeature(60, 40, 20, [0, 0, 15], 'cut'),
  ]);
  const cylFacet = 0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI;
  const expected = Math.PI * 225 * 60 * cylFacet / 2; // media caña
  check('cilindro eje X cortado a media caña', rel(volume(g), expected) < 0.01, `vol=${volume(g)} esp=${expected.toFixed(0)}`);
}

console.log('— Bocetos extruidos —');

// L extruida como pieza (unión): área 40×40 − 20×20 = 1200, altura 15
{
  const L = [[0, 0], [40, 0], [40, 20], [20, 20], [20, 40], [0, 40]];
  const g = buildPart([makeSketchFeature(L, 15, 'union', [0, 0, 0], [0, 0, 1], [1, 0, 0])]);
  check('L extruida: volumen 1200×15', rel(volume(g), 1200 * 15) < 0.01, `vol=${volume(g)}`);
  check('L extruida sin NaN', !hasNaN(g));
}

// bolsillo de boceto (corte) en la cara superior de una placa
{
  const pocket = [[-10, -8], [10, -8], [10, 8], [-10, 8]];
  const g = buildPart([
    makeBoxFeature(60, 40, 12),
    makeSketchFeature(pocket, 5, 'cut', [0, 0, 12], [0, 0, 1], [1, 0, 0]),
  ]);
  const expected = 60 * 40 * 12 - 20 * 16 * 5;
  check('bolsillo por boceto en cara superior', rel(volume(g), expected) < 0.005, `vol=${volume(g)} esp=${expected}`);
}

// boceto en cara lateral (normal +X) con puntos en sentido horario (se auto-orienta)
{
  const cw = [[0, 0], [0, 10], [12, 10], [12, 0]]; // CW a propósito
  const g = buildPart([
    makeBoxFeature(40, 40, 20),
    makeSketchFeature(cw, 6, 'union', [20, -6, 5], [1, 0, 0], planeBasis([1, 0, 0]).u.toArray()),
  ]);
  const expected = 40 * 40 * 20 + 12 * 10 * 6;
  check('boceto en cara lateral + orientación CW corregida', rel(volume(g), expected) < 0.01, `vol=${volume(g)} esp=${expected}`);
}

// boceto por ENTIDADES: cuadrado 40×40 con círculo Ø10 interior = agujero pasante
{
  const SK = await import('../js/sketch2d.js');
  const ents = [
    SK.makeLine([-20, -20], [20, -20]), SK.makeLine([20, -20], [20, 20]),
    SK.makeLine([20, 20], [-20, 20]), SK.makeLine([-20, 20], [-20, -20]),
    SK.makeCircle([0, 0], 5),
  ];
  const f = makeSketchEntitiesFeature(ents, [], 6, 'union', [0, 0, 0], [0, 0, 1], [1, 0, 0]);
  const g = buildPart([f]);
  const holeFacet = 0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI;
  const expected = (1600 - Math.PI * 25 * holeFacet) * 6;
  check('boceto de entidades con agujero interior', rel(volume(g), expected) < 0.01, `vol=${volume(g)} esp=${expected.toFixed(0)}`);

  // editar una cota (largo de la base 40→60) y regenerar: el contorno se re-encadena
  const dim = SK.makeDim('len', { id: ents[0].id }, null, 40, [0, -22]);
  SK.applyDim(f.params.entities, dim, 60);
  const g2 = buildPart([f]);
  check('regeneración tras editar cota (contorno sigue cerrado)', volume(g2) > volume(g) * 1.15, `vol2=${volume(g2)}`);
}

console.log('— Detección de caras y ejes —');
{
  const g = buildPart([makeBoxFeature(50, 30, 10)]);
  // buscar un triángulo de la cara superior
  const p = g.attributes.position;
  let topTri = -1;
  for (let t = 0; t < p.count / 3; t++) {
    if (p.getZ(t * 3) === 10 && p.getZ(t * 3 + 1) === 10 && p.getZ(t * 3 + 2) === 10) { topTri = t; break; }
  }
  const face = planarFaceFromHit(g, topTri);
  check('cara superior detectada completa', Math.abs(face.area - 1500) < 1, `área=${face.area}`);
  check('centroide de la cara en el centro', face.centroid.distanceTo(new THREE.Vector3(0, 0, 10)) < 0.01);
  check('normal de la cara +Z', face.normal.z > 0.999);
}
{
  const doc = newDoc();
  const part = newPart(doc, 'p');
  part.features.push(makeBoxFeature(50, 30, 10), makeHoleFeature(8, 10, true, [10, 5, 10], [0, 0, -1]));
  const found = findAxialFeature(part, new THREE.Vector3(10 + 4, 5, 5)); // punto en la pared del agujero
  check('findAxialFeature encuentra el agujero', !!found && found.feature.params.dia === 8);
}

console.log('— Imán de ensamble —');
{
  // pieza 20³ acercándose por X a una caja 0..60: contacto en x=60
  const my = { min: { x: 62.5, y: 5, z: 0 }, max: { x: 82.5, y: 25, z: 20 }, axes: [] };
  const other = { min: { x: 0, y: 0, z: 0 }, max: { x: 60, y: 40, z: 20 }, axes: [] };
  const c = magnetCorrections(my, [other], ['x', 'y']);
  check('imán: contacto de caras en X', c.x && c.x.kind === 'contacto' && Math.abs(c.x.d - (-2.5)) < 1e-9, JSON.stringify(c));
  // en Y: al ras inferior (5→0 corrige -5, fuera de umbral 4) vs centro (20 vs 15: -5 fuera)... nada
  check('imán: sin ajuste en Y fuera de umbral', !c.y, JSON.stringify(c.y));
  // alturas totales: techo con techo en Z (techos a 0.5, centros a 1.75)
  const cz = magnetCorrections(
    { min: { x: 0, y: 0, z: 3 }, max: { x: 10, y: 10, z: 20.5 }, axes: [] },
    [other], ['z']);
  check('imán: alturas totales (techo-techo)', cz.z && cz.z.kind === 'ras' && Math.abs(cz.z.d - (-0.5)) < 1e-9, JSON.stringify(cz));
  // centro de ejes: orificio mío a (49,23) y del otro en (45,25) → corrige a eje
  const ce = magnetCorrections(
    { min: { x: 40, y: 15, z: 0 }, max: { x: 58, y: 31, z: 8 }, axes: [{ x: 49, y: 23, z: 0 }] },
    [{ min: { x: 0, y: 0, z: 0 }, max: { x: 120, y: 80, z: 10 }, axes: [{ x: 45, y: 25, z: 10 }] }],
    ['x', 'y']);
  check('imán: centro de ejes en X e Y', ce.x?.kind === 'eje' && Math.abs(ce.x.d - (-4)) < 1e-9 && ce.y?.kind === 'eje' && Math.abs(ce.y.d - 2) < 1e-9, JSON.stringify(ce));
}

console.log('— Solver de restricciones —');
{
  const doc = newDoc();
  const A = newPart(doc, 'A'); A.features.push(makeBoxFeature(100, 100, 10));
  const B = newPart(doc, 'B'); B.features.push(makeBoxFeature(40, 40, 8));
  B.pos = [200, 130, 70];
  B.quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.7, 1.1)).toArray();
  doc.constraints.push(makeMate('mate',
    { part: A.id, point: [0, 0, 10], normal: [0, 0, 1] },
    { part: B.id, point: [0, 0, 0], normal: [0, 0, -1] }, 0));
  doc.constraints.push(makeConcentric(
    { part: A.id, point: [20, 20, 10], dir: [0, 0, -1] },
    { part: B.id, point: [10, 10, 0], dir: [0, 0, -1] }));
  solveConstraints(doc);
  const m = partMatrix(B);
  const bottom = new THREE.Vector3(0, 0, 0).applyMatrix4(m);
  const hole = new THREE.Vector3(10, 10, 0).applyMatrix4(m);
  check('mate: base de B sobre A (z=10) partiendo rotada', Math.abs(bottom.z - 10) < 1e-6, `z=${bottom.z}`);
  check('concéntrico: orificio B sobre (20,20)', Math.hypot(hole.x - 20, hole.y - 20) < 1e-6, `(${hole.x},${hole.y})`);
  const nB = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...B.quat));
  check('mate: normales opuestas tras resolver', nB.z < -0.999999, `nz=${nB.z}`);
}
{
  // caso singular: normales exactamente opuestas al inicio (rotación 180°)
  const doc = newDoc();
  const A = newPart(doc, 'A'); A.features.push(makeBoxFeature(50, 50, 10));
  const B = newPart(doc, 'B'); B.features.push(makeBoxFeature(20, 20, 5));
  B.quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)).toArray(); // boca abajo
  doc.constraints.push(makeMate('mate',
    { part: A.id, point: [0, 0, 10], normal: [0, 0, 1] },
    { part: B.id, point: [0, 0, 0], normal: [0, 0, -1] }, 0));
  solveConstraints(doc);
  const q = new THREE.Quaternion(...B.quat);
  check('mate con giro 180° no produce NaN', [q.x, q.y, q.z, q.w].every(Number.isFinite));
}
{
  // offset de separación
  const doc = newDoc();
  const A = newPart(doc, 'A'); A.features.push(makeBoxFeature(50, 50, 10));
  const B = newPart(doc, 'B'); B.features.push(makeBoxFeature(20, 20, 5));
  doc.constraints.push(makeMate('mate',
    { part: A.id, point: [0, 0, 10], normal: [0, 0, 1] },
    { part: B.id, point: [0, 0, 0], normal: [0, 0, -1] }, 2.5));
  solveConstraints(doc);
  const z = new THREE.Vector3(0, 0, 0).applyMatrix4(partMatrix(B)).z;
  check('mate con separación 2.5 mm', Math.abs(z - 12.5) < 1e-6, `z=${z}`);
}

console.log(`\nRESULTADO: ${pass} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
