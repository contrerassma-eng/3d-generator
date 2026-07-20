#!/usr/bin/env node
// export_lbp530.mjs — Exporta un ensamble foto3d-cad a PLY binario con color
// por vértice (luego pipeline/tools lo convierten a GLB con trimesh).
//
// Camino rápido SIN CSG para piezas que son pura unión de cajas/cilindros
// (p.ej. los 1000+ rodillos LBP de la banda) y para la banda (extrusión con
// agujero); las piezas con cortes/perforaciones usan el motor CSG (model.js).
//
// Uso (desde cad/, tras bundlear con esbuild — ver README de ensambles):
//   DOC=ensambles/lbp530_5m.json OUT=/ruta/salida.ply [FILTRO="EJE MOTRIZ"] \
//   [CENTRAR=1] node /tmp/export_lbp530.js

import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import { readFileSync, writeFileSync } from 'node:fs';

const docPath = process.env.DOC;
const outPath = process.env.OUT;
const filtro = process.env.FILTRO || '';
const centrar = process.env.CENTRAR === '1';
if (!docPath || !outPath) throw new Error('faltan DOC y OUT');

const doc = JSON.parse(readFileSync(docPath, 'utf8'));
const parts = doc.parts.filter(p => !filtro || p.name.includes(filtro));
if (!parts.length) throw new Error(`filtro "${filtro}" no coincide con ninguna pieza`);

const fastOK = (p) => p.features.every(f =>
  (f.shape === 'box' || f.shape === 'cylinder') && f.op === 'union');

function fastGeometry(part) {
  const geoms = [];
  for (const f of part.features) {
    if (f.shape === 'box') {
      const g = new THREE.BoxGeometry(f.params.w, f.params.d, f.params.h);
      g.translate(f.at[0], f.at[1], f.at[2] + f.params.h / 2);
      geoms.push(g);
    } else {
      const g = new THREE.CylinderGeometry(f.params.dia / 2, f.params.dia / 2, f.params.h, 24);
      // CylinderGeometry crece en +Y desde el centro; llevar a `at` + dir*h/2
      const dir = new THREE.Vector3(...(f.dir || [0, 0, 1])).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.applyQuaternion(q);
      const c = new THREE.Vector3(...f.at).addScaledVector(dir, f.params.h / 2);
      g.translate(c.x, c.y, c.z);
      geoms.push(g);
    }
  }
  return geoms;
}

// banda: boceto exterior + vaciado interior → extrusión con agujero (sin CSG)
function bandGeometry(part) {
  const [outerF, innerF] = part.features;
  const toV2 = (pts) => pts.map(([u, v]) => new THREE.Vector2(u, v));
  const shape = new THREE.Shape(toV2(outerF.params.pts));
  shape.holes.push(new THREE.Path(toV2(innerF.params.pts)));
  const w = outerF.params.h;
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  // el boceto vive en el plano XZ (u=+X, v=+Z) extruido en -Y desde la cara
  // f.at (ya trasladada por el ancla de la pieza): x=u+at.x, y=at.y-z_e, z=v+at.z
  g.applyMatrix4(new THREE.Matrix4().set(
    1, 0, 0, outerF.at[0],
    0, 0, -1, outerF.at[1],
    0, 1, 0, outerF.at[2],
    0, 0, 0, 1,
  ));
  return [g];
}

const chunks = [];
let nV = 0, nF = 0;
const varr = [], farr = [];
for (const part of parts) {
  const col = new THREE.Color(part.color || '#90a4ae');
  const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
  let geoms;
  if (part.name.includes('Banda') && part.features[0]?.shape === 'sketch') {
    geoms = bandGeometry(part);
  } else if (fastOK(part)) {
    geoms = fastGeometry(part);
  } else {
    const res = buildPartGeometry(part);
    geoms = [res.geometry || res];
  }
  const off = new THREE.Vector3(...part.pos);
  const base0 = varr.length;
  for (const geom of geoms) {
    const gg = geom.index ? geom.toNonIndexed() : geom;
    const pos = gg.attributes.position;
    const base = nV;
    for (let i = 0; i < pos.count; i++) {
      varr.push([pos.getX(i) + off.x, pos.getY(i) + off.y, pos.getZ(i) + off.z, r, g, b]);
    }
    nV += pos.count;
    for (let i = 0; i < pos.count; i += 3) farr.push([base + i, base + i + 1, base + i + 2]);
    nF += pos.count / 3;
  }
  if (process.env.BBOX) {
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let i = base0; i < varr.length; i++) for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], varr[i][a]); hi[a] = Math.max(hi[a], varr[i][a]);
    }
    console.log(`  ${part.name}: bbox`, lo.map(v => v.toFixed(0)).join(','), '→', hi.map(v => v.toFixed(0)).join(','));
  } else console.log(`  ${part.name}: acumulado ${nV} vértices`);
}

if (centrar) {
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const v of varr) for (let a = 0; a < 3; a++) {
    lo[a] = Math.min(lo[a], v[a]); hi[a] = Math.max(hi[a], v[a]);
  }
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  for (const v of varr) for (let a = 0; a < 3; a++) v[a] -= c[a];
}

// PLY binario little-endian con color por vértice
const header = Buffer.from(
  `ply\nformat binary_little_endian 1.0\ncomment foto3d-cad export ${(doc.meta?.nombre ?? '').replace(/[^\x20-\x7e]/g, '_')}\n` +
  `element vertex ${nV}\nproperty float x\nproperty float y\nproperty float z\n` +
  `property uchar red\nproperty uchar green\nproperty uchar blue\n` +
  `element face ${nF}\nproperty list uchar int vertex_indices\nend_header\n`, 'ascii');
const vbuf = Buffer.alloc(nV * (12 + 3));
let o = 0;
for (const v of varr) {
  vbuf.writeFloatLE(v[0], o); vbuf.writeFloatLE(v[1], o + 4); vbuf.writeFloatLE(v[2], o + 8);
  vbuf.writeUInt8(v[3], o + 12); vbuf.writeUInt8(v[4], o + 13); vbuf.writeUInt8(v[5], o + 14);
  o += 15;
}
const fbuf = Buffer.alloc(nF * 13);
o = 0;
for (const f of farr) {
  fbuf.writeUInt8(3, o); fbuf.writeInt32LE(f[0], o + 1); fbuf.writeInt32LE(f[1], o + 5); fbuf.writeInt32LE(f[2], o + 9);
  o += 13;
}
writeFileSync(outPath, Buffer.concat([header, vbuf, fbuf]));
console.log(`OK ${outPath}: ${parts.length} piezas, ${nV} vértices, ${nF} caras`);
