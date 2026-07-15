// model.js — documento paramétrico: piezas, funciones (features), regeneración
// por CSG, detección de caras planas y ejes, y solver de restricciones de ensamble.

import * as THREE from 'three';
import { CSG, geomToCSG, csgToGeom } from './csg.js';

let _id = 0;
export const uid = (p) => `${p}${(++_id).toString(36)}${Date.now().toString(36).slice(-4)}`;

export const PALETTE = ['#6d9ee8', '#e8a56d', '#7fc98a', '#c98ad0', '#d9c96b', '#6bc9c2', '#e07f7f', '#9a9fe0'];

// ---------- Documento ----------

export function newDoc() {
  return { format: 'foto3d-cad', version: 1, parts: [], constraints: [] };
}

export function newPart(doc, name) {
  const part = {
    id: uid('p'),
    name: name || `Pieza ${doc.parts.length + 1}`,
    color: PALETTE[doc.parts.length % PALETTE.length],
    pos: [0, 0, 0],
    quat: [0, 0, 0, 1],
    fixed: doc.parts.length === 0, // la primera pieza queda fija (a tierra)
    visible: true,
    features: [],
  };
  doc.parts.push(part);
  return part;
}

export const getPart = (doc, id) => doc.parts.find(p => p.id === id);
export const getFeature = (part, id) => part.features.find(f => f.id === id);

export function partMatrix(part) {
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(...part.pos),
    new THREE.Quaternion(...part.quat),
    new THREE.Vector3(1, 1, 1)
  );
  return m;
}

// ---------- Funciones (features) ----------
// f = { id, name, shape:'box'|'cylinder'|'hole', op:'union'|'cut',
//       at:[x,y,z] (local), dir:[x,y,z] (eje unitario, cilindro/agujero),
//       params:{...} }
// box:      params {w,d,h}    'at' = centro de la base, crece en +Z local del feature
// cylinder: params {dia,h}    'at' = centro de la base, eje 'dir'
// hole:     params {dia, depth, through} 'at' = punto en la cara, 'dir' = hacia adentro

export function makeBoxFeature(w, d, h, at = [0, 0, 0], op = 'union') {
  return { id: uid('f'), name: op === 'cut' ? 'Corte caja' : 'Caja', shape: 'box', op, at, dir: [0, 0, 1], params: { w, d, h } };
}
export function makeCylFeature(dia, h, at = [0, 0, 0], dir = [0, 0, 1], op = 'union') {
  return { id: uid('f'), name: op === 'cut' ? 'Corte cilindro' : 'Cilindro', shape: 'cylinder', op, at, dir, params: { dia, h } };
}
export function makeHoleFeature(dia, depth, through, at, dir) {
  return { id: uid('f'), name: `Agujero Ø${dia}`, shape: 'hole', op: 'cut', at, dir, params: { dia, depth, through: !!through } };
}

const SEGMENTS = 48;

function cylinderAlong(at, dir, radius, len) {
  const g = new THREE.CylinderGeometry(radius, radius, len, SEGMENTS);
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const mid = new THREE.Vector3(...at).addScaledVector(d, len / 2);
  const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(m);
  return g;
}

function featureGeometry(f, extent) {
  if (f.shape === 'box') {
    const { w, d, h } = f.params;
    const g = new THREE.BoxGeometry(w, d, h);
    g.translate(f.at[0], f.at[1], f.at[2] + h / 2);
    return g;
  }
  if (f.shape === 'cylinder') {
    return cylinderAlong(f.at, f.dir, f.params.dia / 2, f.params.h);
  }
  if (f.shape === 'hole') {
    const back = 0.5; // arranca 0.5 mm por fuera de la cara para evitar caras coplanares
    const len = (f.params.through ? extent + 1 : f.params.depth) + back;
    const d = new THREE.Vector3(...f.dir).normalize();
    const start = new THREE.Vector3(...f.at).addScaledVector(d, -back);
    return cylinderAlong(start.toArray(), d.toArray(), f.params.dia / 2, len);
  }
  throw new Error(`shape desconocido: ${f.shape}`);
}

// Regenera la geometría local de una pieza aplicando sus features en orden.
export function buildPartGeometry(part) {
  let csg = null;
  const bbox = new THREE.Box3();
  for (const f of part.features) {
    if (f.op === 'union' || csg !== null) {
      const extent = bbox.isEmpty() ? 100 : bbox.getSize(new THREE.Vector3()).length();
      const g = featureGeometry(f, extent);
      if (f.op === 'union') {
        g.computeBoundingBox();
        bbox.union(g.boundingBox);
      }
      const c = geomToCSG(g);
      if (csg === null) csg = c;
      else csg = f.op === 'cut' ? csg.subtract(c) : csg.union(c);
    }
    // un 'cut' como primer feature no tiene material que cortar: se ignora
  }
  if (!csg) return csgToGeom(CSG.fromPolygons([])); // vacía pero con atributos válidos
  return csgToGeom(csg);
}

// ---------- Detección de cara plana (flood fill de triángulos coplanares) ----------

const keyOf = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;

export function planarFaceFromHit(geometry, faceIndex) {
  const pos = geometry.attributes.position;
  const triCount = pos.count / 3;
  const triNormal = (t) => {
    const a = new THREE.Vector3().fromBufferAttribute(pos, t * 3);
    const b = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + 2);
    return new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  };
  // mapa vértice → triángulos que lo comparten
  const vmap = new Map();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const key = keyOf(pos.getX(i), pos.getY(i), pos.getZ(i));
      let arr = vmap.get(key);
      if (!arr) vmap.set(key, arr = []);
      arr.push(t);
    }
  }
  const n0 = triNormal(faceIndex);
  const p0 = new THREE.Vector3().fromBufferAttribute(pos, faceIndex * 3);
  const w0 = n0.dot(p0);
  const inPlane = (t) => {
    if (triNormal(t).dot(n0) < 0.999) return false;
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (Math.abs(n0.dot(p) - w0) > 1e-3) return false;
    }
    return true;
  };
  const seen = new Set([faceIndex]);
  const queue = [faceIndex];
  const tris = [];
  while (queue.length) {
    const t = queue.pop();
    tris.push(t);
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const key = keyOf(pos.getX(i), pos.getY(i), pos.getZ(i));
      for (const nt of vmap.get(key)) {
        if (!seen.has(nt) && inPlane(nt)) { seen.add(nt); queue.push(nt); }
      }
    }
  }
  // centroide ponderado por área
  const centroid = new THREE.Vector3();
  let areaSum = 0;
  for (const t of tris) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, t * 3);
    const b = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + 2);
    const area = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() / 2;
    centroid.addScaledVector(new THREE.Vector3().add(a).add(b).add(c).divideScalar(3), area);
    areaSum += area;
  }
  if (areaSum > 0) centroid.divideScalar(areaSum);
  return { tris, normal: n0, centroid, area: areaSum };
}

// Geometría de resaltado para una cara detectada (coordenadas locales de la pieza)
export function faceHighlightGeometry(geometry, tris) {
  const pos = geometry.attributes.position;
  const positions = [];
  for (const t of tris) {
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

// ---------- Búsqueda de eje (agujero/cilindro) cercano a un punto local ----------

export function findAxialFeature(part, localPoint) {
  let best = null;
  for (const f of part.features) {
    if (f.shape !== 'cylinder' && f.shape !== 'hole') continue;
    const at = new THREE.Vector3(...f.at);
    const dir = new THREE.Vector3(...f.dir).normalize();
    const rel = new THREE.Vector3().subVectors(localPoint, at);
    const t = rel.dot(dir);
    const radial = rel.clone().addScaledVector(dir, -t).length();
    const r = f.params.dia / 2;
    const len = f.shape === 'hole' ? (f.params.through ? 1e4 : f.params.depth) : f.params.h;
    if (t < -2 || t > len + 2) continue;           // fuera del tramo axial
    const score = Math.abs(radial - r);
    if (score > Math.max(2, r * 0.6)) continue;    // demasiado lejos de la pared
    if (!best || score < best.score) best = { feature: f, score, at: f.at, dir: f.dir };
  }
  return best;
}

// ---------- Restricciones de ensamble ----------
// mate/flush: { id, type, a:{part, point:[..], normal:[..]}, b:{...}, offset }
//   (point/normal en coordenadas locales de cada pieza)
// concentric: { id, type:'concentric', a:{part, point, dir}, b:{part, point, dir} }

export function makeMate(type, a, b, offset = 0) {
  return { id: uid('c'), type, a, b, offset };
}
export function makeConcentric(a, b) {
  return { id: uid('c'), type: 'concentric', a, b };
}

function worldAnchor(part, anchor) {
  const m = partMatrix(part);
  const q = new THREE.Quaternion(...part.quat);
  return {
    point: new THREE.Vector3(...anchor.point).applyMatrix4(m),
    vec: new THREE.Vector3(...(anchor.normal || anchor.dir)).applyQuaternion(q).normalize(),
  };
}

function applyDeltaRotation(part, qDelta, pivot) {
  const q = new THREE.Quaternion(...part.quat).premultiply(qDelta).normalize();
  part.quat = [q.x, q.y, q.z, q.w];
  const p = new THREE.Vector3(...part.pos).sub(pivot).applyQuaternion(qDelta).add(pivot);
  part.pos = p.toArray();
}

function solveOne(doc, c) {
  let A = getPart(doc, c.a.part), B = getPart(doc, c.b.part);
  let ra = c.a, rb = c.b;
  if (!A || !B) return;
  if (B.fixed && !A.fixed) { [A, B] = [B, A]; [ra, rb] = [rb, ra]; }
  if (B.fixed) return; // ambas fijas: no se puede resolver

  const wa = worldAnchor(A, ra);
  const wb = worldAnchor(B, rb);

  if (c.type === 'mate' || c.type === 'flush') {
    const target = c.type === 'mate' ? wa.vec.clone().negate() : wa.vec.clone();
    const qDelta = new THREE.Quaternion().setFromUnitVectors(wb.vec, target);
    applyDeltaRotation(B, qDelta, wb.point.clone());
    const wb2 = worldAnchor(B, rb);
    const d = new THREE.Vector3().subVectors(wb2.point, wa.point).dot(wa.vec);
    const move = wa.vec.clone().multiplyScalar((c.offset || 0) - d);
    B.pos = new THREE.Vector3(...B.pos).add(move).toArray();
  } else if (c.type === 'concentric') {
    let target = wa.vec.clone();
    if (wb.vec.dot(target) < 0) target.negate(); // elegir el sentido más cercano
    const qDelta = new THREE.Quaternion().setFromUnitVectors(wb.vec, target);
    applyDeltaRotation(B, qDelta, wb.point.clone());
    const wb2 = worldAnchor(B, rb);
    const delta = new THREE.Vector3().subVectors(wa.point, wb2.point);
    delta.addScaledVector(target, -delta.dot(target)); // solo componente radial
    B.pos = new THREE.Vector3(...B.pos).add(delta).toArray();
  }
}

export function solveConstraints(doc, passes = 3) {
  for (let i = 0; i < passes; i++) {
    for (const c of doc.constraints) solveOne(doc, c);
  }
}
