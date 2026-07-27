#!/usr/bin/env node
// _check.mjs — banco de pruebas de un módulo del NBT90. Construye la geometría
// REAL de cada pieza con el motor CSG del repo y reporta volumen, NaN, caja
// envolvente y piezas sospechosas.
//
//   node cad/ensambles/nbt90/_check.mjs bastidor      (o rodillos|transmision|elevacion)
//   node cad/ensambles/nbt90/_check.mjs bastidor --v  (lista pieza por pieza)
//
// Falla (exit 1) si alguna pieza no tiene malla, tiene volumen ≤ 0 o NaN.
import * as THREE from 'three';
import { buildPartGeometry } from '../../js/model.js';
import { Ensamble, bboxPieza, solapan } from './lib.mjs';
import { P } from './params.mjs';

const mod = process.argv[2];
const verboso = process.argv.includes('--v');
if (!mod) { console.error('uso: node _check.mjs <modulo> [--v]'); process.exit(1); }

const m = await import(`./${mod}.mjs`);
const fn = m[mod] || m.default;
if (typeof fn !== 'function') {
  console.error(`el módulo ${mod}.mjs debe exportar la función ${mod}(E)`); process.exit(1);
}

const E = new Ensamble();
const metricas = fn(E) || {};

const volumen = (g) => {
  const pos = g.attributes.position; if (!pos) return 0;
  let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return v;
};

let malas = 0, volTotal = 0;
const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
const t0 = Date.now();
for (const part of E.parts) {
  let g, v = 0, nan = false;
  try { g = buildPartGeometry(part); } catch (e) { console.log(`  ✘ ${part.name}: ${e.message}`); malas++; continue; }
  const pos = g.attributes.position;
  if (!pos || pos.count < 3) { console.log(`  ✘ ${part.name}: SIN MALLA`); malas++; continue; }
  nan = [...pos.array].some(x => !Number.isFinite(x));
  v = volumen(g);
  if (v <= 0 || nan) { console.log(`  ✘ ${part.name}: vol=${(v / 1000).toFixed(2)} cm³${nan ? ' NaN' : ''}`); malas++; continue; }
  volTotal += v;
  const bb = bboxPieza(part);
  for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], bb.lo[i]); hi[i] = Math.max(hi[i], bb.hi[i]); }
  if (verboso) console.log(`  ✔ ${part.name}: ${(v / 1000).toFixed(2)} cm³`);
}

const r1 = (x) => Math.round(x * 10) / 10;
console.log(`\nmódulo ${mod}: ${E.parts.length} piezas, ${E.parts.length - malas} con malla válida, ${malas} con problema`);
console.log(`volumen total ${(volTotal / 1000).toFixed(0)} cm³ ≈ ${(volTotal * 7.85e-6).toFixed(1)} kg de acero (referencia)`);
console.log(`envolvente  X ${r1(lo[0])}..${r1(hi[0])}   Y ${r1(lo[1])}..${r1(hi[1])}   Z ${r1(lo[2])}..${r1(hi[2])}`);
console.log(`límites del módulo: X 0..${P.largo}  Y ±${r1(P.anchoExt / 2)}  Z 0..${P.altoTotal}`);
if (Object.keys(metricas).length) console.log('métricas:', JSON.stringify(metricas));
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);

// piezas fuera de la envolvente del módulo (aviso, no falla)
for (const part of E.parts) {
  const b = bboxPieza(part);
  if (b.lo[2] < -1 || b.hi[2] > P.altoTotal + 40 || Math.abs(b.lo[1]) > P.anchoExt / 2 + 30
      || Math.abs(b.hi[1]) > P.anchoExt / 2 + 30 || b.lo[0] < -30 || b.hi[0] > P.largo + 30) {
    console.log(`  ! fuera de envolvente: ${part.name}  X ${r1(b.lo[0])}..${r1(b.hi[0])} Y ${r1(b.lo[1])}..${r1(b.hi[1])} Z ${r1(b.lo[2])}..${r1(b.hi[2])}`);
  }
}
process.exit(malas ? 1 : 0);
