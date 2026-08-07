// util_adapt.mjs — utilidades de la adaptación: rotación de piezas foto3d-cad
// SIN cuaterniones (transformando features, para que a_step.py, el visor y las
// AABB vean la misma geometría) y una AABB que respeta el marco `u` de los
// bocetos (la de lib.mjs lo ignora y desplaza las cajas de sketches girados).

import { normal3 } from '../../nbt90/lib.mjs';

export const r2 = (v) => Math.round(v * 100) / 100;

// --- Rz(−90°): (x, y, z) → (y, −x, z) --------------------------------------
const rotV = ([x, y, z]) => [y, -x, z];

/** Devuelve una COPIA de la pieza girada Rz(−90°) y trasladada `t`=[tx,ty,tz].
 *  Gira pos y cada feature (at/dir/u); en cajas intercambia w↔d. Sin quat. */
export function rotarPieza(p, t) {
  const q = structuredClone(p);
  const pr = rotV(q.pos);
  q.pos = [r2(pr[0] + t[0]), r2(pr[1] + t[1]), r2(pr[2] + t[2])];
  q.quat = [0, 0, 0, 1];
  for (const f of q.features || []) {
    f.at = rotV(f.at).map(r2);
    if (f.dir) f.dir = rotV(f.dir).map(r2);
    if (f.params?.u) f.params.u = rotV(f.params.u).map(r2);
    if (f.shape === 'box') {
      const { w, d } = f.params;
      f.params.w = d; f.params.d = w;
      // box crece +Z desde el CENTRO de su base: el centro es invariante al giro
    }
  }
  return q;
}

// --- AABB fiel (usa params.u como a_step.py y el visor) ---------------------
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function bboxU(part) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const acc = (p) => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } };
  for (const f of part.features) {
    if (f.op === 'cut') continue;
    const at = [f.at[0] + part.pos[0], f.at[1] + part.pos[1], f.at[2] + part.pos[2]];
    if (f.shape === 'box') {
      const { w, d, h } = f.params;
      acc([at[0] - w / 2, at[1] - d / 2, at[2]]); acc([at[0] + w / 2, at[1] + d / 2, at[2] + h]);
    } else if (f.shape === 'cylinder') {
      // caja EXACTA: el radio sólo infla PERPENDICULAR al eje (la de lib.mjs
      // infla ±r también a lo largo del eje y regala falsos choques)
      const r = f.params.dia / 2, d3 = normal3(f.dir), h = f.params.h;
      for (const s of [0, h]) {
        const c = [at[0] + d3[0] * s, at[1] + d3[1] * s, at[2] + d3[2] * s];
        const rr = d3.map(di => r * Math.sqrt(Math.max(0, 1 - di * di)));
        acc([c[0] - rr[0], c[1] - rr[1], c[2] - rr[2]]);
        acc([c[0] + rr[0], c[1] + rr[1], c[2] + rr[2]]);
      }
    } else if (f.shape === 'sketch' && f.params.pts) {
      const n = normal3(f.dir);
      const u = f.params.u ? normal3(f.params.u) : null;
      const v = u ? cross(n, u) : null;
      for (const p of f.params.pts) {
        for (const s of [0, f.params.h]) {
          if (u) {
            acc([at[0] + u[0] * p[0] + v[0] * p[1] + n[0] * s,
              at[1] + u[1] * p[0] + v[1] * p[1] + n[1] * s,
              at[2] + u[2] * p[0] + v[2] * p[1] + n[2] * s]);
          }
        }
      }
    } else if (f.shape === 'revolve') {
      const rs = f.params.entities.flatMap(e => [Math.abs(e.a[1]), Math.abs(e.b[1])]);
      const hs = f.params.entities.flatMap(e => [e.a[0], e.b[0]]);
      const R = Math.max(...rs), h0 = Math.min(...hs), h1 = Math.max(...hs);
      const d3 = normal3(f.params.u);          // el eje de revolución es u
      for (const s of [h0, h1]) {
        const c = [at[0] + d3[0] * s, at[1] + d3[1] * s, at[2] + d3[2] * s];
        const rr = d3.map(di => R * Math.sqrt(Math.max(0, 1 - di * di)));
        acc([c[0] - rr[0], c[1] - rr[1], c[2] - rr[2]]);
        acc([c[0] + rr[0], c[1] + rr[1], c[2] + rr[2]]);
      }
    }
  }
  return { lo, hi };
}

/** Solape (mm³) de dos AABB; 0 si no se tocan. */
export function solapeAABB(a, b) {
  let v = 1;
  for (let i = 0; i < 3; i++) {
    const d = Math.min(a.hi[i], b.hi[i]) - Math.max(a.lo[i], b.lo[i]);
    if (d <= 0) return 0;
    v *= d;
  }
  return v;
}

/** Holgura mínima entre dos AABB en un eje dado si solapan en los otros dos.
 *  Devuelve +∞ si no compiten (no solapan en los otros ejes). */
export function holguraEje(a, b, eje) {
  for (let i = 0; i < 3; i++) {
    if (i === eje) continue;
    if (Math.min(a.hi[i], b.hi[i]) - Math.max(a.lo[i], b.lo[i]) <= 0) return Infinity;
  }
  return Math.max(a.lo[eje] - b.hi[eje], b.lo[eje] - a.hi[eje]);
}

// ═══════════════════════════════════════════════════════════════════════════
// DIN 471 — TABLA DE GARGANTAS (anillos de retención para eje)
//
// POR QUÉ ESTÁ AQUÍ. Hasta 2026-08-03 cada módulo se inventaba la garganta con
// una fórmula: `mod_tambores` usaba `Ø = d − 1.4` con ancho fijo 1.4 y
// `mod_tensor2` usaba `Ø = d − 2.5` con ancho 1.5. Ninguna de las dos es la
// norma, y la consecuencia de taller es que EL ANILLO NO ENTRA: un DIN 471-30
// tiene s = 1.50 mm de espesor y no cabe en una garganta de 1.40. La revisión
// de fabricación lo listó como A2 (12 gargantas en 6 ejes). Ahora la garganta
// SALE DE LA TABLA, y la tabla vive en un solo sitio para que no vuelva a
// divergir.
//
// PROCEDENCIA (capa `web`, hechos RING-471-01 y RING-471-02 de web_facts.json):
//   · Aspen Fasteners, «Metric DIN 471 External Retaining Rings for Shafts»,
//     https://www.aspenfasteners.com/content/pdf/Metric_DIN_471_spec.pdf
//     (accedido 2026-08-03). Fila d1 = 30: «30 1.5 27.9 5 3.5 2 3.31 28.6 1.6
//     0.7 2.1 40.5» · fila d1 = 35: «35 1.5 32.2 -0.5 5.6 3.9 2.5 4 33 (h12)
//     1.6 1 3 46.8». Columnas: d1 · s · d3 · a · b · d5 · peso · d2 · m · t · n · d4.
//   · American Metric Corp., «External Retaining Rings (A) DIN 471»,
//     https://www.ametric.com/Images/document/RetainingRings-Metric.pdf
//     (accedido 2026-08-03): confirma que el espesor s salta de 1.5 a 1.75
//     en d1 = 36, no en 35.
//
// DISCREPANCIA DECLARADA con REVISION_TALLER_PIEZAS.md §A2: el informe pedía
// para d = 35 «m = 1,85 y anillo s = 1,75». Esa es la fila de d1 = 40 de la
// norma, no la de 35. Las DOS fuentes citadas dan, para d1 = 35, s = 1.50 y
// m = 1.60 (y d2 = 33.0, que sí coincide con el informe). Se aplica LA TABLA,
// no el informe, y se deja escrito aquí por qué.
//
// Tolerancias de la norma (las dos fuentes las publican en la cabecera de la
// tabla): d2 en h12 y m en H13 → para m = 1.6, IT13 = +0.14/0.
// ═══════════════════════════════════════════════════════════════════════════
export const DIN471 = {
  // d1 (eje nominal) → { d2: fondo de garganta, m: ancho, t: profundidad, s: espesor del anillo }
  8:  { d2: 7.6,  m: 0.9,  t: 0.2,  s: 0.8,  d2tol: 'h12', mtol: 'H13' },
  10: { d2: 9.6,  m: 1.1,  t: 0.2,  s: 1.0,  d2tol: 'h11', mtol: 'H13' },
  20: { d2: 19.0, m: 1.3,  t: 0.5,  s: 1.2,  d2tol: 'h11', mtol: 'H13' },
  30: { d2: 28.6, m: 1.6,  t: 0.7,  s: 1.5,  d2tol: 'h12', mtol: 'H13' },
  35: { d2: 33.0, m: 1.6,  t: 1.0,  s: 1.5,  d2tol: 'h12', mtol: 'H13' },
};

/** Garganta DIN 471 del eje nominal `d`. Lanza si el Ø no está tabulado: la
 *  regla es que NO se inventa una garganta, se añade la fila con su cita. */
export function gargantaDIN471(d) {
  const g = DIN471[d];
  if (!g) {
    throw new Error(`DIN 471: no hay fila tabulada para el eje Ø${d}. Añádela a `
      + 'util_adapt.DIN471 con su cita de web_facts (RING-471-01/02); NO se '
      + 'genera una garganta con fórmula.');
  }
  return { ...g, d1: d,
    desig: `DIN 471 - ${d}`,
    cota: `Ø${g.d2} ${g.d2tol} × ${g.m} ${g.mtol}`,
    // juego axial de montaje que queda entre el anillo (s) y la garganta (m)
    juegoAxial: r2(g.m - g.s) };
}
