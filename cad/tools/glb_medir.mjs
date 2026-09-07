#!/usr/bin/env node
// glb_medir.mjs — mide una pieza extraída: caras dominantes (planos), espesor,
// y AGUJEROS por cara (círculos: centro+Ø; ranuras: bbox del lazo) detectados
// por lazos de borde interiores. Capa measured con cita al GLB de referencia.
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const P = d.positions;
const nT = P.length / 9;
// normal por triángulo → agrupar por eje dominante y coordenada de plano
const caras = new Map();
for (let t = 0; t < nT; t++) {
  const [ax, ay, az, bx, by, bz, cx, cy, cz] = P.slice(t * 9, t * 9 + 9);
  const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const L = Math.hypot(nx, ny, nz); if (L < 1e-6) continue;
  const n = [nx / L, ny / L, nz / L];
  const ejes = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])];
  const e = ejes.indexOf(Math.max(...ejes));
  if (ejes[e] < 0.97) continue;                        // solo caras planas alineadas
  const coord = [ax, ay, az][e];
  const k = `${'xyz'[e]}@${Math.round(coord * 2) / 2}`;
  let g = caras.get(k); if (!g) caras.set(k, g = { e, coord, tris: [], area: 0 });
  g.tris.push(t); g.area += L / 2;
}
const grandes = [...caras.entries()].sort((a, b) => b[1].area - a[1].area).slice(0, 8);
for (const [k, g] of grandes) {
  // aristas usadas UNA vez dentro de la cara = contorno + agujeros
  const cnt = new Map(); const q = (v) => Math.round(v * 20) / 20;
  const [i1, i2] = g.e === 0 ? [1, 2] : g.e === 1 ? [0, 2] : [0, 1];
  for (const t of g.tris) {
    const v = [0, 1, 2].map(j => [q(P[t * 9 + j * 3 + i1]), q(P[t * 9 + j * 3 + i2])]);
    for (let j = 0; j < 3; j++) {
      const a = v[j], b = v[(j + 1) % 3];
      const kk = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}|${b}` : `${b}|${a}`;
      cnt.set(kk, (cnt.get(kk) || 0) + 1);
    }
  }
  const ady = new Map();
  for (const [kk, n] of cnt) {
    if (n !== 1) continue;
    const [a, b] = kk.split('|');
    (ady.get(a) ?? ady.set(a, []).get(a)).push(b);
    (ady.get(b) ?? ady.set(b, []).get(b)).push(a);
  }
  const visto = new Set(); const lazos = [];
  for (const [s] of ady) {
    if (visto.has(s)) continue;
    const lazo = [s]; visto.add(s);
    let cur = s, prev = null, gd = 0;
    while (gd++ < 9000) {
      const nx2 = (ady.get(cur) || []).find(w => w !== prev && !visto.has(w));
      if (!nx2) break;
      lazo.push(nx2); visto.add(nx2); prev = cur; cur = nx2;
    }
    if (lazo.length > 5) lazos.push(lazo.map(s2 => s2.split(',').map(Number)));
  }
  lazos.sort((a, b) => b.length - a.length);
  const desc = lazos.slice(1, 14).map(lz => {
    const xs = lz.map(p => p[0]), ys = lz.map(p => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy2 = (Math.min(...ys) + Math.max(...ys)) / 2;
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    const rr = lz.map(p => Math.hypot(p[0] - cx, p[1] - cy2));
    const rMed = rr.reduce((a2, b2) => a2 + b2, 0) / rr.length;
    const circ = Math.max(...rr) - Math.min(...rr) < 0.35;
    return circ ? `Ø${(rMed * 2).toFixed(1)} @(${cx.toFixed(1)},${cy2.toFixed(1)})`
      : `ranura ${w.toFixed(1)}×${h.toFixed(1)} @(${cx.toFixed(1)},${cy2.toFixed(1)})`;
  });
  console.log(`cara ${k} área ${Math.round(g.area)} mm² — ${lazos.length - 1} aberturas:`);
  if (desc.length) console.log('   ', desc.join('  ·  '));
}
