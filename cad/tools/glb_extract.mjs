#!/usr/bin/env node
// glb_extract.mjs — extrae UNA instancia de una familia de piezas de un GLB
// de referencia (capa measured) y la fusiona en mm: bbox, planos dominantes y
// volcado JSON {positions:[...]} para renderizarla/medirla con iso3d.
// Uso: node tools/glb_extract.mjs <archivo.glb> <regexFamilia> <salida.json>
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync, writeFileSync } from 'node:fs';

const [file, famRe, out] = process.argv.slice(2);
const re = new RegExp(famRe);
const buf = readFileSync(file);
const loader = new GLTFLoader();
await MeshoptDecoder.ready;
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((res, rej) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
gltf.scene.updateMatrixWorld(true);

// nodo ANCESTRO cuyo nombre calza — tomamos la PRIMERA instancia y fusionamos
// todos sus meshes hijos en coordenadas de mundo (m → mm)
let raiz = null;
gltf.scene.traverse(o => { if (!raiz && re.test(o.name || '')) raiz = o; });
if (!raiz) { console.error('familia no encontrada:', famRe); process.exit(1); }
const posiciones = [];
const v = new THREE.Vector3();
raiz.traverse(o => {
  if (!o.isMesh) return;
  const p = o.geometry.attributes.position;
  const idx = o.geometry.index;
  const n = idx ? idx.count : p.count;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
    posiciones.push(v.x * 1000, v.y * 1000, v.z * 1000);
  }
});
const xs = [], ys = [], zs = [];
for (let i = 0; i < posiciones.length; i += 3) { xs.push(posiciones[i]); ys.push(posiciones[i + 1]); zs.push(posiciones[i + 2]); }
const mm = (a) => [Math.min(...a), Math.max(...a)].map(q => +q.toFixed(1));
const bb = { x: mm(xs), y: mm(ys), z: mm(zs) };
console.log(`familia ${famRe} → nodo «${raiz.name}» · ${posiciones.length / 9} tris`);
console.log('bbox mm:', JSON.stringify(bb), '· tamaño:', [bb.x, bb.y, bb.z].map(([a, b]) => +(b - a).toFixed(1)).join(' × '));
writeFileSync(out, JSON.stringify({ familia: famRe, nodo: raiz.name, bbox: bb, positions: posiciones.map(q => +q.toFixed(2)) }));
console.log('→', out);
