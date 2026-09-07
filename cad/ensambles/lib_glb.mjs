#!/usr/bin/env node
// lib_glb.mjs — ORIGINALES: carga la geometría REAL de los GLB de fábrica
// (M-HASTE / CADENAS PARTsolutions) para usarla TAL CUAL en los ensambles.
//
// Orden de Sergio (18-08, repetida 19-08): «no debes representar, debes usar
// los originales». Una caja que imita un pie nivelador NO es el pie: aquí la
// pieza vendor entra con su malla, sus radios, sus taladros y sus chaflanes.
//
// Reglas de la casa que esta librería hace cumplir:
//   · descuantizar NO es distorsionar (KHR_mesh_quantization guarda POSITION
//     en Int16: transformar en el atributo cuantizado satura en ±1);
//   · la escala se DECIDE contra el catálogo (bbox), no se adivina;
//   · recortar una sección de un original prismático (perfil, banda) conserva
//     los vértices del original — se declara como SECCIÓN, nunca como diseño.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DIR_MODELOS = join(here, '../componentes/models');

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const CACHE = new Map();

const aFloat32 = (geo, matrixWorld) => {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrixWorld);
    arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  if (geo.index) g.setIndex(geo.index.clone());
  return g;
};

/** Carga un GLB → [{nombre, geom (mm), dims}] con caché por archivo. */
export async function cargarGLB(nombreArchivo) {
  if (CACHE.has(nombreArchivo)) return CACHE.get(nombreArchivo);
  const p = nombreArchivo.includes('/') ? nombreArchivo : join(DIR_MODELOS, nombreArchivo);
  if (!existsSync(p)) throw new Error(`original ausente: ${p}`);
  const buf = readFileSync(p);
  const mallas = await new Promise((res, rej) => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
      const out = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(o => { if (o.isMesh) out.push({ nombre: o.name || o.parent?.name || '?', geom: aFloat32(o.geometry, o.matrixWorld) }); });
      res(out);
    }, rej);
  });
  // los GLB de la biblioteca vienen en METROS (glTF-Transform): la escala se
  // decide por magnitud, no por fe — un original en mm no se toca
  for (const m of mallas) {
    m.geom.computeBoundingBox();
    const b = m.geom.boundingBox;
    const mayor = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
    m.escala = mayor < 20 ? 1000 : 1;          // <20 unidades = metros
    if (m.escala !== 1) m.geom.scale(m.escala, m.escala, m.escala);
    m.geom.computeBoundingBox();
    const c = m.geom.boundingBox;
    m.dims = [c.max.x - c.min.x, c.max.y - c.min.y, c.max.z - c.min.z].map(v => Math.round(v * 100) / 100);
    m.centro = [(c.max.x + c.min.x) / 2, (c.max.y + c.min.y) / 2, (c.max.z + c.min.z) / 2];
    m.min = [c.min.x, c.min.y, c.min.z]; m.max = [c.max.x, c.max.y, c.max.z];
    m.tris = (m.geom.index ? m.geom.index.count : m.geom.attributes.position.count) / 3;
  }
  CACHE.set(nombreArchivo, mallas);
  return mallas;
}

/** Coloca un original: rota (grados, ejes Z→Y→X) y traslada su CENTRO a `pos`. */
export function coloca(geom, { rot = [0, 0, 0], pos = [0, 0, 0], anclaje = 'centro' } = {}) {
  const g = geom.clone();
  const m = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180, 'ZYX'));
  g.applyMatrix4(m);
  g.computeBoundingBox();
  const b = g.boundingBox;
  const ref = anclaje === 'centro'
    ? [(b.max.x + b.min.x) / 2, (b.max.y + b.min.y) / 2, (b.max.z + b.min.z) / 2]
    : [(b.max.x + b.min.x) / 2, (b.max.y + b.min.y) / 2, b.min.z];   // 'base'
  g.translate(pos[0] - ref[0], pos[1] - ref[1], pos[2] - ref[2]);
  g.computeVertexNormals();
  return g;
}

/**
 * SECCIÓN de un original prismático (perfil de aluminio, banda): conserva los
 * triángulos cuyo centroide cae en la ventana y NO mueve ningún vértice — es
 * el original, recortado. Se declara como sección en la lámina.
 */
export function seccion(geom, { x, y, z } = {}) {
  const pos = geom.attributes.position;
  const idx = geom.index ? geom.index.array : null;
  const n = idx ? idx.length / 3 : pos.count / 3;
  const dentro = (v, r) => !r || (v >= r[0] && v <= r[1]);
  const keep = [];
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  for (let t = 0; t < n; t++) {
    const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
    vA.fromBufferAttribute(pos, a); vB.fromBufferAttribute(pos, b); vC.fromBufferAttribute(pos, c);
    const cx = (vA.x + vB.x + vC.x) / 3, cy = (vA.y + vB.y + vC.y) / 3, cz = (vA.z + vB.z + vC.z) / 3;
    if (dentro(cx, x) && dentro(cy, y) && dentro(cz, z)) keep.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', pos.clone());
  g.setIndex(keep);
  g.computeBoundingBox();
  g.computeVertexNormals();
  return g;
}

/**
 * CORTE A LARGO del original (Sutherland-Hodgman por triángulo contra planos
 * axiales). Cortar un perfil a largo es lo que hace la fábrica: los vértices
 * del original NO se mueven — sólo nacen vértices NUEVOS en el plano de corte.
 * El recorte por centroide (seccion) no sirve en extrusiones: sus triángulos
 * son largos y su centroide cae fuera de la ventana.
 */
export function corta(geom, planos = []) {
  const pos = geom.attributes.position;
  const idx = geom.index ? geom.index.array : null;
  const nT = idx ? idx.length / 3 : pos.count / 3;
  const EJE = { x: 0, y: 1, z: 2 };
  let tris = [];
  for (let t = 0; t < nT; t++) {
    const ii = [0, 1, 2].map(k => (idx ? idx[t * 3 + k] : t * 3 + k));
    tris.push(ii.map(i => [pos.getX(i), pos.getY(i), pos.getZ(i)]));
  }
  for (const pl of planos) {
    const e = EJE[pl.eje];
    for (const [lim, signo] of [[pl.min, +1], [pl.max, -1]]) {
      if (lim === undefined || lim === null) continue;
      const out = [];
      const dentro = (p) => signo * (p[e] - lim) >= 0;
      for (const tr of tris) {
        const poly = [];
        for (let i = 0; i < 3; i++) {
          const A = tr[i], B = tr[(i + 1) % 3];
          const dA = dentro(A), dB = dentro(B);
          if (dA) poly.push(A);
          if (dA !== dB) {
            const f = (lim - A[e]) / (B[e] - A[e]);
            poly.push([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]);
          }
        }
        for (let i = 1; i + 1 < poly.length; i++) out.push([poly[0], poly[i], poly[i + 1]]);
      }
      tris = out;
    }
  }
  const arr = new Float32Array(tris.length * 9);
  tris.forEach((tr, i) => tr.forEach((p, k) => { arr[i * 9 + k * 3] = p[0]; arr[i * 9 + k * 3 + 1] = p[1]; arr[i * 9 + k * 3 + 2] = p[2]; }));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.computeBoundingBox(); g.computeVertexNormals();
  return g;
}

/**
 * REORIENTA conservando el marco del original: `mapa` permuta ejes
 * (mapa=[2,0,1] → X=largo del original, Y=ancho, Z=alto) y `offset` desplaza.
 * Los cortes de un mismo original comparten marco: así la cabeza, la cola y
 * las patas siguen alineadas entre sí como en la máquina de fábrica (centrar
 * cada corte por separado las descuadraba).
 */
export function reorienta(geom, mapa = [0, 1, 2], offset = [0, 0, 0], signo = [1, 1, 1]) {
  const pos = geom.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    for (let k = 0; k < 3; k++) arr[i * 3 + k] = v[mapa[k]] * signo[k] + offset[k];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  if (geom.index) g.setIndex(geom.index.clone());
  g.computeBoundingBox(); g.computeVertexNormals();
  return g;
}

/**
 * Pre-carga TODOS los originales que un documento referencia en part.glb y
 * devuelve Map(part.id → BufferGeometry ya colocada). Los emisores (planos,
 * GA, manual) llaman a esto ANTES de proyectar.
 */
export async function geometriasDelDoc(doc) {
  const mapa = new Map();
  for (const p of doc.parts || []) {
    if (!p.glb) continue;
    const mallas = await cargarGLB(p.glb.archivo);
    const src = p.glb.malla ? mallas.find(m => m.nombre === p.glb.malla) : mallas[0];
    if (!src) throw new Error(`malla «${p.glb.malla}» no está en ${p.glb.archivo}`);
    let g = src.geom;
    if (p.glb.corte) g = corta(g, p.glb.corte);
    if (p.glb.seccion) g = seccion(g, p.glb.seccion);
    if (p.glb.mapa) g = reorienta(g, p.glb.mapa, p.glb.offset, p.glb.signo);
    else g = coloca(g, { rot: p.glb.rot, pos: p.pos, anclaje: p.glb.anclaje });
    mapa.set(p.id, g);
  }
  return mapa;
}
