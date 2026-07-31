#!/usr/bin/env node
// export_glb.mjs — exporta un documento `foto3d-cad` a GLB (glTF 2.0 binario)
// con UNA MALLA POR PIEZA, nombre de pieza y color de material. Sin dependencias
// externas (escribe el GLB a mano); usa el motor CSG del repo para la geometría.
//
//   node cad/ensambles/nbt90/export_glb.mjs <doc.json> <salida.glb> [--filtro TXT]
//
// El modelo del repo es Z arriba y glTF es Y arriba: se emite un nodo raíz con
// rotación −90° en X, de modo que el GLB se ve derecho en cualquier visor.

import * as THREE from 'three';
import { buildPartGeometry, partMatrix } from '../../js/model.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [docPath, outPath] = process.argv.slice(2);
if (!docPath || !outPath) {
  console.error('uso: node export_glb.mjs <doc.json> <salida.glb> [--filtro TXT]');
  process.exit(1);
}
const iFil = process.argv.indexOf('--filtro');
const filtro = iFil > 0 ? process.argv[iFil + 1] : '';

const doc = JSON.parse(readFileSync(docPath, 'utf8'));
const partes = doc.parts.filter(p => p.visible !== false && (!filtro || p.name.includes(filtro)));

const bin = [];               // trozos del buffer binario
let byteLen = 0;
const push = (typed) => {
  const off = byteLen;
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  bin.push(buf); byteLen += buf.length;
  const pad = (4 - (byteLen % 4)) % 4;
  if (pad) { bin.push(Buffer.alloc(pad)); byteLen += pad; }
  return off;
};

const gltf = {
  asset: { version: '2.0', generator: 'foto3d-cad export_glb.mjs' },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [], meshes: [], materials: [],
  accessors: [], bufferViews: [], buffers: [],
};

const matIdx = new Map();
function material(hex, nombre) {
  if (matIdx.has(hex)) return matIdx.get(hex);
  const h = (hex || '#9aa4b2').replace('#', '');
  const c = [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  const srgb = c.map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  gltf.materials.push({
    name: nombre || hex,
    pbrMetallicRoughness: { baseColorFactor: [...srgb, 1], metallicFactor: 0.35, roughnessFactor: 0.55 },
    doubleSided: true,
  });
  matIdx.set(hex, gltf.materials.length - 1);
  return gltf.materials.length - 1;
}

const hijos = [];
let nTri = 0, nErr = 0;
for (const p of partes) {
  let g;
  try { g = buildPartGeometry(p); } catch (e) { console.error(`  ! ${p.name}: ${e.message}`); nErr++; continue; }
  const pos = g.getAttribute('position');
  if (!pos || pos.count < 3) { nErr++; continue; }
  g.applyMatrix4(partMatrix(p));            // pieza → coordenadas de ensamble
  g.computeVertexNormals();
  const P = g.getAttribute('position').array, N = g.getAttribute('normal').array;
  if (![...P].every(Number.isFinite)) { console.error(`  ! ${p.name}: NaN en la malla`); nErr++; continue; }
  nTri += P.length / 9;

  const oP = push(new Float32Array(P)), oN = push(new Float32Array(N));
  const bvP = gltf.bufferViews.push({ buffer: 0, byteOffset: oP, byteLength: P.length * 4, target: 34962 }) - 1;
  const bvN = gltf.bufferViews.push({ buffer: 0, byteOffset: oN, byteLength: N.length * 4, target: 34962 }) - 1;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) {
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], P[i + k]); max[k] = Math.max(max[k], P[i + k]); }
  }
  const aP = gltf.accessors.push({ bufferView: bvP, componentType: 5126, count: P.length / 3, type: 'VEC3', min, max }) - 1;
  const aN = gltf.accessors.push({ bufferView: bvN, componentType: 5126, count: N.length / 3, type: 'VEC3' }) - 1;
  const mesh = gltf.meshes.push({
    name: p.name,
    primitives: [{ attributes: { POSITION: aP, NORMAL: aN }, material: material(p.color, p.color), mode: 4 }],
  }) - 1;
  hijos.push(gltf.nodes.push({ name: p.name, mesh }) - 1);
}

// nodo raíz: Z arriba (repo) → Y arriba (glTF)
const s = Math.SQRT1_2;
gltf.nodes.unshift({ name: doc.meta?.nombre || 'ensamble', rotation: [-s, 0, 0, s], children: hijos.map(i => i + 1) });
for (const n of gltf.nodes) if (n.children) n.children = n.children;
gltf.buffers.push({ byteLength: byteLen });

const binBuf = Buffer.concat(bin);
const jsonStr = JSON.stringify(gltf);
const jsonBuf = Buffer.from(jsonStr + ' '.repeat((4 - (Buffer.byteLength(jsonStr) % 4)) % 4), 'utf8');
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
const cJ = Buffer.alloc(8); cJ.writeUInt32LE(jsonBuf.length, 0); cJ.writeUInt32LE(0x4E4F534A, 4);
const cB = Buffer.alloc(8); cB.writeUInt32LE(binBuf.length, 0); cB.writeUInt32LE(0x004E4942, 4);
// `out/` es derivado y no está versionado: en un clon nuevo hay que crearlo.
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.concat([header, cJ, jsonBuf, cB, binBuf]));

console.log(`OK: ${hijos.length} piezas, ${Math.round(nTri)} triángulos, ${(byteLen / 1e6).toFixed(1)} MB → ${outPath}${nErr ? `  (${nErr} piezas sin malla)` : ''}`);
if (nErr) process.exitCode = 0;
