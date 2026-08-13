#!/usr/bin/env node
// zp_componentes.mjs — Saca los COMPONENTES REALES del CAD del transportador
// recto de rodillos 24V (ZP2026, STEP del fabricante) para reusarlos tal cual
// en la curva.
//
// El encargo de Sergio: la curva tiene que estar al MISMO nivel y con el MISMO
// estándar que el recto — mismo motor, mismo soporte de motor, misma estación
// de patas, mismo travesaño. No versiones parecidas modeladas a ojo.
//
// El GLB del ZP2026 viene comprimido con EXT_meshopt_compression, así que se
// carga con el decodificador del repo (el mismo que usa el simulador) y se
// vuelca:
//   - `--inventario`  la lista de componentes con su envolvente y su pivote,
//                     para elegir cuáles reusar y dónde tienen el origen;
//   - `--extraer <salida.json>` la geometría de los componentes elegidos, en mm
//                     y con el origen puesto donde conviene para instanciarlos.
//
//   node ensambles/zp_componentes.mjs --inventario
//   node ensambles/zp_componentes.mjs --extraer ensambles/zp_piezas.json

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.env.ZP || '/home/user/conveyone-simulator/models/ZP2026_MDR.glb';

// Componentes que nos interesan del recto, con el nombre que llevan en el STEP.
// `pivote` dice dónde se pone el origen local al extraerlos, para que instanciarlos
// en la curva sea sólo trasladar y girar.
export const PIEZAS = {
  motor: { match: /UniDrive|motor/i, pivote: 'centro' },
  soporteMotor: { match: /^BR_3002/, pivote: 'centro' },
  travesano: { match: /^TR_S/, pivote: 'centro' },
  lateral: { match: /^LT_G/, pivote: 'centro' },
  guarda: { match: /^GUARDA/, pivote: 'centro' },
  bracketA: { match: /^B_00[245]A/, pivote: 'centro' },
  polin: { match: /^pos12/, pivote: 'centro' },
  // la estación de patas no se distingue por el nombre del nodo sino por su
  // MATERIAL (`RAL7035_leg`), que es como la identifica el propio simulador
  pata: { material: /_leg/, pivote: 'centro' },
};

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const buf = readFileSync(SRC);
const gltf = await new Promise((res, rej) =>
  loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));

const scene = gltf.scene;
scene.updateMatrixWorld(true);

// El GLB del ZP2026 está en METROS y con Y arriba. La curva trabaja en mm y
// Z arriba: se convierte una sola vez, aquí, y todo lo demás ya viaja en el
// sistema de la curva.
const M2MM = 1000;
const aCurva = (v) => [v.x * M2MM, -v.z * M2MM, v.y * M2MM];

// Cada componente aparece muchas veces en el recto (6 travesaños, 40 polines…).
// Se agrupa por INSTANCIA — el nodo concreto donde calzó el patrón, p. ej.
// `TR_S:1` — y de cada familia se extrae UNA, que es la que se instancia
// después en la curva.
const grupos = new Map();   // clave de instancia -> { nombre, mallas:[…] }
scene.traverse((o) => {
  if (!o.isMesh) return;
  // El STEP anida: `TR_S:1` cuelga de sí mismo dividido en decenas de caras con
  // nombres derivados. Se toma el ancestro MÁS ALTO que calza, para que la
  // instancia sea la pieza completa y no una de sus caras.
  let etiqueta = null, instancia = null;
  for (let n = o; n; n = n.parent) {
    const nm = n.name || '';
    for (const [k, def] of Object.entries(PIEZAS)) {
      if (def.match && def.match.test(nm)) { etiqueta = k; instancia = nm; }
    }
  }
  if (!etiqueta) {
    for (const [k, def] of Object.entries(PIEZAS)) {
      if (def.material && def.material.test(o.material?.name || '')) {
        etiqueta = k; instancia = o.parent?.name || o.name || k;
      }
    }
  }
  if (!etiqueta) return;
  const clave = `${etiqueta}|${instancia}`;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  const p = g.attributes.position;
  const pos = [];
  for (let i = 0; i < p.count; i++) pos.push(...aCurva(new THREE.Vector3().fromBufferAttribute(p, i)));
  const idx = g.index ? Array.from(g.index.array)
    : Array.from({ length: p.count }, (_, i) => i);
  const c = o.material?.color;
  if (!grupos.has(clave)) grupos.set(clave, { nombre: etiqueta, instancia, mallas: [] });
  grupos.get(clave).mallas.push({
    pos, idx, color: c ? [c.r, c.g, c.b] : [0.6, 0.62, 0.6],
    nodo: o.name || o.parent?.name || '',
  });
});

function envolvente(g) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const m of g.mallas) {
    for (let i = 0; i < m.pos.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        lo[a] = Math.min(lo[a], m.pos[i + a]);
        hi[a] = Math.max(hi[a], m.pos[i + a]);
      }
    }
  }
  return { lo, hi, dim: hi.map((v, a) => v - lo[a]), centro: hi.map((v, a) => (v + lo[a]) / 2) };
}

const r0 = (v) => Math.round(v);
// una instancia por familia: la de menor envolvente en el eje del flujo (X),
// que es la unidad suelta y no un grupo que arrastró vecinos
const porFamilia = new Map();
{
  const fam = new Map();
  for (const [, g] of grupos) {
    const e = envolvente(g);
    if (!fam.has(g.nombre)) fam.set(g.nombre, []);
    fam.get(g.nombre).push({ g, e, vol: e.dim[0] * e.dim[1] * e.dim[2] });
  }
  // la MEDIANA por volumen de envolvente: la mínima suele ser una cara suelta
  // y la máxima un grupo que arrastró vecinos; la mediana es la pieza entera.
  for (const [k, lista] of fam) {
    lista.sort((a, b) => a.vol - b.vol);
    porFamilia.set(k, lista[Math.floor(lista.length / 2)]);
  }
}

if (process.argv.includes('--inventario')) {
  console.log('componente       instancias  instancia elegida   tri   envolvente (mm)');
  for (const [k, { g, e }] of porFamilia) {
    const n = [...grupos.values()].filter((q) => q.nombre === k).length;
    const tri = g.mallas.reduce((s, m) => s + m.idx.length / 3, 0);
    console.log(`${k.padEnd(15)} ${String(n).padStart(6)}   ${(g.instancia || '').padEnd(18)} `
      + `${String(r0(tri)).padStart(6)}  ${e.dim.map((v) => String(r0(v)).padStart(5)).join(' x ')}`);
  }
}

if (process.argv.includes('--detalle')) {
  for (const [k, g] of grupos) {
    const e = envolvente(g);
    const tri = g.mallas.reduce((s, m) => s + m.idx.length / 3, 0);
    console.log(`${k.padEnd(16)} ${String(g.mallas.length).padStart(5)} ${String(r0(tri)).padStart(6)}  `
      + `${e.dim.map((v) => String(r0(v)).padStart(5)).join(' x ')}   `
      + `${e.centro.map((v) => String(r0(v)).padStart(6)).join(',')}`);
  }
}

const iEx = process.argv.indexOf('--extraer');
if (iEx > 0) {
  const out = {};
  for (const [k, { g, e }] of porFamilia) {
    // origen al centro de la envolvente en X/Y y a la BASE en Z: así una pieza
    // se instancia poniendo su punto de apoyo donde va.
    const off = [e.centro[0], e.centro[1], e.lo[2]];
    out[k] = {
      envolvente: e.dim.map((v) => Math.round(v * 100) / 100),
      mallas: g.mallas.map((m) => ({
        color: m.color.map((v) => Math.round(v * 1000) / 1000),
        idx: m.idx,
        pos: m.pos.map((v, i) => Math.round((v - off[i % 3]) * 100) / 100),
      })),
    };
  }
  writeFileSync(process.argv[iEx + 1], JSON.stringify(out));
  const tot = Object.values(out).reduce((s, p) => s + p.mallas.reduce((t, m) => t + m.idx.length / 3, 0), 0);
  console.log(`OK: ${Object.keys(out).length} componentes, ${r0(tot)} triángulos → ${process.argv[iEx + 1]}`);
}
