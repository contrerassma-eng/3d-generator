#!/usr/bin/env node
// extrae una REGIÓN (bbox mm) del GLB completo — para ver uniones reales
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync, writeFileSync } from 'node:fs';
const [file, box, out] = process.argv.slice(2);
const [x0, x1, y0, y1, z0, z1] = box.split(',').map(Number);
const buf = readFileSync(file);
const loader = new GLTFLoader();
await MeshoptDecoder.ready; loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((res, rej) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
gltf.scene.updateMatrixWorld(true);
const pos = []; const v = new THREE.Vector3();
gltf.scene.traverse(o => {
  if (!o.isMesh) return;
  const p = o.geometry.attributes.position, idx = o.geometry.index;
  const n = idx ? idx.count : p.count;
  const tri = [];
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
    tri.push(v.x * 1000, v.y * 1000, v.z * 1000);
    if (tri.length === 9) {
      const cx = (tri[0] + tri[3] + tri[6]) / 3, cy = (tri[1] + tri[4] + tri[7]) / 3, cz = (tri[2] + tri[5] + tri[8]) / 3;
      if (cx > x0 && cx < x1 && cy > y0 && cy < y1 && cz > z0 && cz < z1) pos.push(...tri);
      tri.length = 0;
    }
  }
});
console.log('tris en región:', pos.length / 9);
writeFileSync(out, JSON.stringify({ nodo: 'region', bbox: { x: [x0, x1], y: [y0, y1], z: [z0, z1] }, positions: pos.map(q => +q.toFixed(2)) }));
