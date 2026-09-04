#!/usr/bin/env node
// volcar árbol de nodos del GLB con bboxes (mm) para identificar piezas
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync } from 'node:fs';

const path = process.argv[2];
const buf = readFileSync(path);
const loader = new GLTFLoader();
await MeshoptDecoder.ready;
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((res, rej) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
const box = new THREE.Box3();
const sz = new THREE.Vector3(), ctr = new THREE.Vector3();
const out = [];
gltf.scene.updateMatrixWorld(true);
gltf.scene.traverse(o => {
  if (!o.isMesh) return;
  box.setFromObject(o); box.getSize(sz); box.getCenter(ctr);
  const mat = o.material;
  const col = mat?.color ? '#' + mat.color.getHexString() : '—';
  out.push({ n: o.name || '(sin nombre)', p: o.parent?.name || '', v: o.geometry.attributes.position.count,
    sz: [sz.x, sz.y, sz.z].map(v => +v.toFixed(1)), c: [ctr.x, ctr.y, ctr.z].map(v => +v.toFixed(0)), col });
});
console.log('meshes:', out.length);
// agrupar por nombre base (sin sufijos numéricos) para ver familias
const fam = new Map();
for (const m of out) {
  const k = m.n.replace(/[_.]?\d+$/, '');
  const f = fam.get(k) || { n: 0, ej: m };
  f.n++; fam.set(k, f);
}
for (const [k, f] of [...fam.entries()].sort((a, b) => b[1].n - a[1].n)) {
  const e = f.ej;
  console.log(`${String(f.n).padStart(3)}×  ${k.slice(0, 58).padEnd(58)} sz ${e.sz.join('×')}  col ${e.col}`);
}
