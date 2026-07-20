// Revisión del motor: CSG, regeneración paramétrica y solver.
// Se ejecuta en Node (bundleado con esbuild, alias three → vendor).
import * as THREE from 'three';
import { geomToCSG, csgToGeom, CSG } from '../js/csg.js';
import {
  newDoc, newPart, makeBoxFeature, makeCylFeature, makeHoleFeature,
  makeSketchFeature, makeSketchEntitiesFeature, makeRevolveFeature, makePatternFeature, patternMatrices, makeMirrorFeature, makeFilletFeature, makeChamferFeature, makeShellFeature, isConvexSolid, solidPlanarFaces, massProperties, planeBasis, magnetCorrections, identifyFace,
  buildPartGeometry, planarFaceFromHit, findAxialFeature,
  makeMate, makeConcentric, solveConstraints, partMatrix,
  evalExpr, resolveParams, applyDocParams,
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

// dirección de extrusión: un lado / simétrica / lado opuesto (cuadrado 20×20, h=10)
{
  const SK = await import('../js/sketch2d.js');
  const sq = [
    SK.makeLine([-10, -10], [10, -10]), SK.makeLine([10, -10], [10, 10]),
    SK.makeLine([10, 10], [-10, 10]), SK.makeLine([-10, 10], [-10, -10]),
  ];
  const zRange = (g) => { g.computeBoundingBox(); return [g.boundingBox.min.z, g.boundingBox.max.z]; };
  const mk = (side) => buildPart([makeSketchEntitiesFeature(sq, [], 10, 'union', [0, 0, 0], [0, 0, 1], [1, 0, 0], side)]);
  const gp = mk('pos'), gs = mk('sym'), gn = mk('neg');
  check('extrusión un lado: z en [0,10]', Math.abs(zRange(gp)[0]) < 1e-4 && Math.abs(zRange(gp)[1] - 10) < 1e-4, `z=${zRange(gp)}`);
  check('extrusión simétrica: z en [-5,5]', Math.abs(zRange(gs)[0] + 5) < 1e-4 && Math.abs(zRange(gs)[1] - 5) < 1e-4, `z=${zRange(gs)}`);
  check('extrusión lado opuesto: z en [-10,0]', Math.abs(zRange(gn)[0] + 10) < 1e-4 && Math.abs(zRange(gn)[1]) < 1e-4, `z=${zRange(gn)}`);
  check('las tres direcciones conservan el volumen (4000)', rel(volume(gp), 4000) < 1e-3 && rel(volume(gs), 4000) < 1e-3 && rel(volume(gn), 4000) < 1e-3);
}

// revolución 360°: rectángulo (10..20, 0..30) alrededor del eje V (u=0)
// → tubo: V = π(R²−r²)h con corrección por facetado de 48 lados
{
  const SK = await import('../js/sketch2d.js');
  const rect = [
    SK.makeLine([10, 0], [20, 0]), SK.makeLine([20, 0], [20, 30]),
    SK.makeLine([20, 30], [10, 30]), SK.makeLine([10, 30], [10, 0]),
  ];
  const f = makeRevolveFeature(rect, [], { a: [0, 0], b: [0, 30] }, 'union', [0, 0, 0], [0, 0, 1], [1, 0, 0]);
  const g = buildPart([f]);
  const facet = 0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI;
  const expected = Math.PI * (400 - 100) * 30 * facet;
  check('revolución: tubo con volumen de Pappus', rel(volume(g), expected) < 0.01, `vol=${volume(g)} esp=${expected.toFixed(0)}`);
  check('revolución sin NaN', !hasNaN(g));

  // revolución que cruza el eje → null (feature omitida, sin crash)
  const bad = [
    SK.makeLine([-5, 0], [5, 0]), SK.makeLine([5, 0], [5, 10]),
    SK.makeLine([5, 10], [-5, 10]), SK.makeLine([-5, 10], [-5, 0]),
  ];
  const f2 = makeRevolveFeature(bad, [], { a: [0, -5], b: [0, 15] }, 'union', [0, 0, 0], [0, 0, 1], [1, 0, 0]);
  let crashed = false, g2 = null;
  try { g2 = buildPart([f2]); } catch (e) { crashed = true; }
  check('contorno que cruza el eje se omite sin crash', !crashed && (!g2.attributes.position || g2.attributes.position.count === 0));

  // revolución parcial 90°: mismo perfil → 1/4 del tubo (12 facetas = 12 de las 48
  // del anillo completo, con tapas planas justo en los límites de faceta)
  const f90 = makeRevolveFeature(rect, [], { a: [0, 0], b: [0, 30] }, 'union', [0, 0, 0], [0, 0, 1], [1, 0, 0], 90);
  const g90 = buildPart([f90]);
  check('revolución parcial 90° ≈ 1/4 del tubo', rel(volume(g90), expected / 4) < 0.01, `vol=${volume(g90)} esp=${(expected / 4).toFixed(0)}`);
  check('revolución parcial sin NaN', !hasNaN(g90));
  check('revolución parcial genera sólido', g90.attributes.position && g90.attributes.position.count > 0);
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

console.log('— Edición directa: identificar caras —');
{
  const doc = newDoc();
  const part = newPart(doc, 'p');
  const box = makeBoxFeature(120, 80, 10);
  const hole = makeHoleFeature(6, 10, true, [45, 25, 10], [0, 0, -1]);
  const cyl = makeCylFeature(30, 22, [0, 0, 10]);
  part.features.push(box, hole, cyl);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  let r = identifyFace(part, V3(10, 5, 10), V3(0, 0, 1));
  check('cara superior de la caja', r?.kind === 'box-face' && r.axis === 2 && r.sign === 1 && r.feature === box, JSON.stringify(r?.kind));
  r = identifyFace(part, V3(60, 0, 5), V3(1, 0, 0));
  check('cara lateral +X de la caja', r?.kind === 'box-face' && r.axis === 0 && r.sign === 1);
  r = identifyFace(part, V3(45 + 3, 25, 5), V3(1, 0, 0));
  check('pared del agujero', r?.kind === 'hole-wall' && r.feature === hole);
  r = identifyFace(part, V3(15, 0, 20), V3(1, 0, 0));
  check('pared del cilindro', r?.kind === 'cyl-wall' && r.feature === cyl);
  r = identifyFace(part, V3(3, 4, 32), V3(0, 0, 1));
  check('tapa del cilindro', r?.kind === 'cyl-cap' && r.feature === cyl);
  r = identifyFace(part, V3(200, 0, 0), V3(0, 0, 1));
  check('punto fuera: null', r === null);
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

console.log('— Patrones de funciones (rectangular / circular) —');

// conteo de matrices (excluyen la ocurrencia origen)
{
  const rect = makePatternFeature('s', 'rect', { nx: 3, ny: 2, dx: 10, dy: 8 });
  check('patrón rect 3×2 → 5 copias extra', patternMatrices(rect).length === 5);
  const circ = makePatternFeature('s', 'circ', { n: 6, angle: 360, axisAt: [0, 0, 0], axisDir: [0, 0, 1] });
  check('patrón circular n=6 (360°) → 5 copias extra', patternMatrices(circ).length === 5);
  const arc = makePatternFeature('s', 'circ', { n: 4, angle: 90, axisAt: [0, 0, 0], axisDir: [0, 0, 1] });
  check('patrón circular n=4 (90° parcial) → 3 copias extra', patternMatrices(arc).length === 3);
}

// patrón rectangular de un agujero: caja − 6 agujeros Ø6 (3×2)
{
  const box = makeBoxFeature(120, 80, 10);
  const hole = makeHoleFeature(6, 10, true, [-40, -20, 10], [0, 0, -1]);
  const pat = makePatternFeature(hole.id, 'rect', { nx: 3, ny: 2, dx: 40, dy: 40, u: [1, 0, 0], v: [0, 1, 0] });
  const g = buildPart([box, hole, pat]);
  const cylFacet = 0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI;
  const expected = 96000 - 6 * Math.PI * 9 * 10 * cylFacet;
  check('caja − patrón 3×2 de agujeros (6 en total)', rel(volume(g), expected) < 0.003, `vol=${volume(g)} esp=${expected.toFixed(1)}`);
  check('patrón: malla sin NaN', !hasNaN(g));
}

// patrón circular de un agujero alrededor del centro (4 a 90°/uno)
{
  const box = makeBoxFeature(100, 100, 10);
  const hole = makeHoleFeature(6, 10, true, [30, 0, 10], [0, 0, -1]);
  const pat = makePatternFeature(hole.id, 'circ', { n: 4, angle: 360, axisAt: [0, 0, 0], axisDir: [0, 0, 1] });
  const g = buildPart([box, hole, pat]);
  const cylFacet = 0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI;
  const expected = 100000 - 4 * Math.PI * 9 * 10 * cylFacet;
  check('caja − patrón circular de 4 agujeros', rel(volume(g), expected) < 0.003, `vol=${volume(g)} esp=${expected.toFixed(1)}`);
}

// patrón de una unión (torreta cilíndrica replicada): el volumen crece
{
  const box = makeBoxFeature(120, 80, 10);
  const boss = makeCylFeature(12, 8, [-40, 0, 10], [0, 0, 1], 'union');
  const pat = makePatternFeature(boss.id, 'rect', { nx: 3, ny: 1, dx: 40, dy: 0, u: [1, 0, 0], v: [0, 1, 0] });
  const vBase = volume(buildPart([box, boss]));
  const vPat = volume(buildPart([box, boss, pat]));
  check('patrón de unión suma 2 torretas más', rel(vPat - vBase, 2 * Math.PI * 36 * 8 * (0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI)) < 0.02, `Δ=${(vPat - vBase).toFixed(1)}`);
}

// origen suprimido → el patrón no aporta copias
{
  const box = makeBoxFeature(60, 60, 10);
  const hole = makeHoleFeature(8, 10, true, [-20, 0, 10], [0, 0, -1]);
  hole.suppressed = true;
  const pat = makePatternFeature(hole.id, 'rect', { nx: 2, ny: 1, dx: 20, dy: 0, u: [1, 0, 0], v: [0, 1, 0] });
  const g = buildPart([box, hole, pat]);
  check('origen suprimido → patrón sin efecto (caja llena)', rel(volume(g), 36000) < 1e-6, `vol=${volume(g)}`);
}

// simetría de una unión: torreta a la derecha reflejada en YZ → aparece a la izquierda
{
  const box = makeBoxFeature(120, 80, 10);
  const boss = makeCylFeature(12, 8, [40, 0, 10], [0, 0, 1], 'union');
  const mir = makeMirrorFeature(boss.id, 'YZ');
  const vBase = volume(buildPart([box, boss]));
  const vMir = volume(buildPart([box, boss, mir]));
  const oneBoss = Math.PI * 36 * 8 * (0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI);
  check('simetría YZ de unión suma 1 torreta reflejada', rel(vMir - vBase, oneBoss) < 0.02, `Δ=${(vMir - vBase).toFixed(1)}`);
  check('simetría: malla sin NaN', !hasNaN(buildPart([box, boss, mir])));
}

// simetría de un agujero: agujero a la derecha reflejado en YZ → dos agujeros
{
  const box = makeBoxFeature(120, 80, 10);
  const hole = makeHoleFeature(6, 10, true, [40, 0, 10], [0, 0, -1]);
  const mir = makeMirrorFeature(hole.id, 'YZ');
  const g = buildPart([box, hole, mir]);
  const cylFacet = 0.5 * 48 * Math.sin(2 * Math.PI / 48) / Math.PI;
  const expected = 96000 - 2 * Math.PI * 9 * 10 * cylFacet;
  check('caja − simetría de agujero (2 en total)', rel(volume(g), expected) < 0.004, `vol=${volume(g)} esp=${expected.toFixed(1)}`);
}

console.log('— Propiedades físicas (masa/área/centro) —');
{
  const g = buildPartGeometry((() => { const d = newDoc(); const p = newPart(d, 'm'); p.features.push(makeBoxFeature(40, 40, 40, [0, 0, 0])); return p; })());
  const mp = massProperties(g);
  // la caja se centra en X/Y sobre 'at' y apoya en z=at.z → [-20,20]×[-20,20]×[0,40]
  check('caja 40³: volumen 64000', rel(mp.volume, 64000) < 1e-3, `v=${mp.volume}`);
  check('caja 40³: área 9600', rel(mp.area, 9600) < 1e-3, `a=${mp.area}`);
  check('caja 40³: centro en (0,0,20)', Math.abs(mp.centroid[0]) < 1e-3 && Math.abs(mp.centroid[1]) < 1e-3 && Math.abs(mp.centroid[2] - 20) < 1e-3, `c=${mp.centroid}`);
  check('caja 40³: caja delimitadora 40×40×40', mp.bbox.size.every(s => Math.abs(s - 40) < 1e-6));

  // barra 20×10×10 con at=[10,0,0] → [0,20]×[-5,5]×[0,10] → centro (10,0,5)
  const gb = buildPartGeometry((() => { const d = newDoc(); const p = newPart(d, 'b'); p.features.push(makeBoxFeature(20, 10, 10, [10, 0, 0])); return p; })());
  const mb = massProperties(gb);
  check('barra: volumen 2000', rel(mb.volume, 2000) < 1e-3, `v=${mb.volume}`);
  check('barra: centro (10,0,5)', Math.abs(mb.centroid[0] - 10) < 1e-3 && Math.abs(mb.centroid[1]) < 1e-3 && Math.abs(mb.centroid[2] - 5) < 1e-3, `c=${mb.centroid}`);
}

console.log('— Vaciado (shell) —');
{
  const box = () => { const d = newDoc(); const p = newPart(d, 's'); p.features.push(makeBoxFeature(40, 40, 40, [0, 0, 0])); return p; };
  check('caja 40³ es convexa', isConvexSolid(buildPartGeometry(box())));
  check('caja 40³ tiene 6 caras planas', solidPlanarFaces(buildPartGeometry(box())).length === 6);

  // vaciado cerrado t=5: cavidad [5,35]³ = 27000 → pared = 64000 − 27000 = 37000
  const pc = box(); pc.features.push(makeShellFeature(5, []));
  check('vaciado cerrado t=5 → 64000−27000', Math.abs(volume(buildPartGeometry(pc)) - 37000) < 30, `v=${volume(buildPartGeometry(pc))}`);

  // vaciado con cara superior abierta (z=40): cavidad [5,35]×[5,35]×[5,40] = 31500
  const po = box(); po.features.push(makeShellFeature(5, [{ n: [0, 0, 1], d: 40 }]));
  const vo = volume(buildPartGeometry(po));
  check('vaciado abierto arriba → 64000−31500 = 32500', Math.abs(vo - 32500) < 40, `v=${vo}`);
  check('vaciado abierto quita más que el cerrado', vo < 37000);
  check('vaciado no genera NaN', !hasNaN(buildPartGeometry(po)));

  // t no positivo o sin material: no cambia el sólido
  const pz = box(); pz.features.push(makeShellFeature(0, []));
  check('vaciado t=0 → sólido intacto', Math.abs(volume(buildPartGeometry(pz)) - 64000) < 1e-6);
}

console.log('— Parámetros globales (fx) y ecuaciones —');
{
  check('evalExpr número', evalExpr('120') === 120);
  check('evalExpr aritmética con precedencia', evalExpr('2 + 3 * 4') === 14);
  check('evalExpr paréntesis', evalExpr('(2 + 3) * 4') === 20);
  check('evalExpr identificador', evalExpr('ancho/2', { ancho: 120 }) === 60);
  check('evalExpr función max', evalExpr('max(3, 7, 5)') === 7);
  check('evalExpr sqrt', Math.abs(evalExpr('sqrt(2)') - Math.SQRT2) < 1e-9);
  check('evalExpr identificador ausente → NaN', Number.isNaN(evalExpr('desconocido')));
}
{
  // parámetros en cadena: paso depende de ancho
  const doc = newDoc();
  doc.params = [{ name: 'ancho', expr: '120' }, { name: 'paso', expr: 'ancho/4' }];
  const scope = resolveParams(doc);
  check('resolveParams en cadena', scope.ancho === 120 && scope.paso === 30);
}
{
  // una caja con w vinculado a un parámetro se regenera al cambiar el parámetro
  const doc = newDoc();
  doc.params = [{ name: 'ancho', expr: '120' }];
  const part = newPart(doc, 't');
  const box = makeBoxFeature(120, 80, 10);
  box.expr = { w: 'ancho' };
  part.features.push(box);
  applyDocParams(doc);
  check('applyDocParams fija w=120', part.features[0].params.w === 120);
  const v1 = volume(buildPartGeometry(part));
  doc.params[0].expr = '150';           // el usuario cambia el parámetro
  applyDocParams(doc);
  check('cambiar parámetro → w=150', part.features[0].params.w === 150);
  const v2 = volume(buildPartGeometry(part));
  check('volumen escala 150/120', rel(v2 / v1, 150 / 120) < 1e-6, `v1=${v1} v2=${v2}`);
}

{
  // Empalme y chaflán de una arista convexa vertical de una caja 40³.
  const box = () => { const d = newDoc(); const p = newPart(d, 'c'); p.features.push(makeBoxFeature(40, 40, 40, [0, 0, 0])); return p; };
  const v0 = volume(buildPartGeometry(box()));
  check('caja 40³ = 64000', rel(v0, 64000) < 1e-3, `v0=${v0}`);

  const pf = box(); pf.features.push(makeFilletFeature([{ a: [20, 20, 0], b: [20, 20, 40] }], 5));
  const vf = volume(buildPartGeometry(pf));
  const expF = 64000 - (25 - Math.PI * 25 / 4) * 40;    // esquina 5×5 menos cuarto de círculo r5, ×40
  check('empalme R5 quita material', vf < v0);
  check('empalme R5 ≈ analítico', Math.abs(vf - expF) < 60, `vf=${vf.toFixed(1)} exp=${expF.toFixed(1)}`);

  const pc = box(); pc.features.push(makeChamferFeature([{ a: [20, 20, 0], b: [20, 20, 40] }], 5));
  const vc = volume(buildPartGeometry(pc));
  check('chaflán 5 = triángulo 5×5/2 ×40', Math.abs(vc - (64000 - 12.5 * 40)) < 5, `vc=${vc}`);

  // chaflán de dos distancias 8×3: cuña = ½·8·3·40 = 480
  const pc2 = box(); pc2.features.push(makeChamferFeature([{ a: [20, 20, 0], b: [20, 20, 40] }], 8, { mode: 'two', d2: 3 }));
  const vc2 = volume(buildPartGeometry(pc2));
  check('chaflán 8×3 = ½·8·3·40 = 480', Math.abs(vc2 - (64000 - 0.5 * 8 * 3 * 40)) < 5, `vc2=${vc2}`);

  // chaflán distancia+ángulo 6 @ 30°: s2 = 6·tan30° ; cuña = ½·6·s2·40
  const s2 = 6 * Math.tan(30 * Math.PI / 180);
  const pc3 = box(); pc3.features.push(makeChamferFeature([{ a: [20, 20, 0], b: [20, 20, 40] }], 6, { mode: 'angle', angle: 30 }));
  const vc3 = volume(buildPartGeometry(pc3));
  check('chaflán 6@30° = ½·6·(6·tan30)·40', Math.abs(vc3 - (64000 - 0.5 * 6 * s2 * 40)) < 5, `vc3=${vc3} s2=${s2.toFixed(3)}`);

  // el chaflán 45° por ángulo coincide con el simétrico de igual distancia
  const pc4 = box(); pc4.features.push(makeChamferFeature([{ a: [20, 20, 0], b: [20, 20, 40] }], 5, { mode: 'angle', angle: 45 }));
  check('chaflán 5@45° ≡ chaflán simétrico 5', Math.abs(volume(buildPartGeometry(pc4)) - vc) < 2);

  // Arista cóncava (interior): el empalme AGREGA material.
  const dL = newDoc(); const pL = newPart(dL, 'L');
  pL.features.push(makeBoxFeature(40, 20, 20, [0, 0, 0]));
  pL.features.push(makeBoxFeature(20, 20, 20, [10, 0, 20]));
  const vL0 = volume(buildPartGeometry(pL));
  pL.features.push(makeFilletFeature([{ a: [0, -10, 20], b: [0, 10, 20] }], 4));
  const vL1 = volume(buildPartGeometry(pL));
  check('empalme cóncavo agrega material', vL1 > vL0, `vL0=${vL0} vL1=${vL1}`);
}

console.log(`\nRESULTADO: ${pass} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
