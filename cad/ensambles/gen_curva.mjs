#!/usr/bin/env node
// gen_curva.mjs — Generador paramétrico de las CURVAS DE POLINES CÓNICOS 24"
// de Conveyone, en el estándar de los planos Kofmelk de la curva de 60°.
//
// El encargo: existe un juego completo de planos de fabricación de la CURVA
// DE 60° 24" (KOFMELK SPA, "Curva60 etapa 1", 3/11/2024 · rev. 6-7/2025). Se
// extiende ese MISMO estándar a 90° sin cambiar nada más: mismos radios
// interno y externo, misma sección, mismos componentes y los mismos patrones
// de perforación. Sólo crece el arco y, con él, la cuenta de polines,
// travesaños y soportes.
//
// PROCEDENCIA DE LAS CIFRAS (regla de oro del método):
//
//   `measured` — leído de los PDF de fabricación Kofmelk C60 (radios, ángulos,
//     espesores y desarrollos van acotados en la lámina; los PATRONES DE
//     PERFORACIÓN se extrajeron de la geometría vectorial de la vista "pieza
//     desplegada" de Cuerpo_Lat_externo_Curva60.pdf y Cuerpo_Lat_interno_
//     Curva60.pdf — 54 y 62 barrenos respectivamente). La calibración vive en
//     `curva_patron_c60.json` y `tests/test_curva.mjs` verifica que este
//     generador la reproduce.
//
//   `user` — decisiones de extensión a 90° tomadas en este trabajo (cuántos
//     travesaños, dónde caen los soportes intermedios). Van marcadas una a una
//     en REGLAS más abajo y en docs/CURVAS.md. Ninguna toca el estándar de 60°.
//
// Sistema de coordenadas: centro de la curva en el origen, X hacia la entrada
// (ángulo 0), Y por regla de la mano derecha, Z arriba con Z=0 en el BORDE
// SUPERIOR del alma de los laterales. Unidades mm.
//
// Emite (formato foto3d-cad):
//   cad/ensambles/curva60_24.json    curva 60° 24" (reproduce el plano Kofmelk)
//   cad/ensambles/curva90_24.json    curva 90° 24" (el encargo)
//   cad/ensambles/curva_dims.json    despiece y cifras derivadas de ambas
//
// Uso:  node cad/ensambles/gen_curva.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const IN = 25.4;
const D2R = Math.PI / 180;
const r2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------
// STD — el estándar de la curva, tal como está construido en los planos C60
// ---------------------------------------------------------------------------
export const STD = {
  // -- Sección y radios (measured: acotados en las láminas C60) --------------
  Rint: 861,        // cara INTERIOR del alma del lateral interno (R861)
  Rext: 1397,       // cara INTERIOR del alma del lateral externo (R1397)
  t: 3,             // espesor de chapa Fe (TABLA de cada lámina)
  alma: 190.5,      // alto del alma = 7.5 in (Conjunto_Lateral_externo, 190,5)
  ala: 38.1,        // ancho del ala del refuerzo = 1.5 in
  guia: 32,         // alto de la guía superior (vista desplegada, 32)

  // -- Polín cónico ---------------------------------------------------------
  // "Considerar 14 polines cónicos de 21"" (nota del ensamblaje C60).
  // 21 in = 533,4 = Rext − (Rint + t) → la cara del polín ES el claro entre
  // almas: el estándar cierra por sí solo.
  polinCara: 21 * IN,
  polinDia: 12.7,   // Ø del barreno de eje (measured Ø12,4–12,6 → 1/2 in)
  // altura del eje bajo el borde superior del alma; difieren porque el polín
  // es CÓNICO y su generatriz superior es horizontal (measured 35,96 / 18,31)
  polinYExt: 36.0,
  polinYInt: 18.3,

  // -- Filas de barrenos, medidas desde el BORDE SUPERIOR del alma -----------
  // (measured, promediando lateral interno y externo: coinciden en 0,2 mm)
  filaTirante: 58.5,      // Ø7  "patrón de perforaciones de 7 mm destinado a tirantes"
  filaDiag: 78.5,         // Ø9
  filaSoporte: [88.0, 163.0],    // Ø11 — "patrón de 2 perforaciones" (soportes)
  filaTravesano: [115.6, 167.9], // Ø10,5 — "patrón de 4 perforaciones para travesaños"
  filaTirInt: 125.6,      // Ø10,5 — fila extra, sólo en el lateral INTERNO
  dTirante: 7, dDiag: 9, dSoporte: 11, dTravesano: 10.5,
  // el patrón de travesaño es un rectángulo de 52 mm de lado (measured 51,8–52,4)
  travesanoPaso: 52.0,
  // los soportes van a 21 mm del extremo, medidos SOBRE EL ARCO de cada riel
  // (measured: 21,29 en el externo y 21,16 en el interno — distancia, no ángulo)
  soporteOffset: 21.2,

  // -- Paso angular de los polines (measured) -------------------------------
  // C60: 14 polines, el primero a medio paso del extremo → paso = 60/14.
  // A 90° el mismo paso da 21 polines EXACTOS: el estándar escala sin residuo.
  pasoAng: 60 / 14,

  material: 'Fe e=3 mm',
  norma: 'tol. gral. ISO 2768-mK',
};

// Radios derivados (no se declaran aparte: se calculan, así no pueden discrepar)
STD.RextAlmaExt = STD.Rext + STD.t;          // 1400 — cara exterior del alma externa
STD.RintAlmaExt = STD.Rint + STD.t;          // 864  — cara del alma interna que mira a los polines
STD.RalaExt = STD.Rext + STD.ala;            // 1435,1 — canto del ala externa
STD.RalaInt = STD.RintAlmaExt - STD.ala;     // 825,9 — canto del ala interna
STD.anchoEnvolvente = STD.RalaExt - STD.RalaInt;   // 609,2 ≈ 24 in
STD.claroPolines = STD.Rext - STD.RintAlmaExt;     // 533 = 21 in
STD.Rcentro = (STD.RalaExt + STD.RalaInt) / 2;     // 1130,5 — eje del bastidor
// fibra neutra del rolado (K = 0,5, desarrollo rígido): coincide con los
// desarrollos acotados en las láminas C60 (1464 y 903).
STD.RnExt = STD.Rext + STD.t / 2;
STD.RnInt = STD.Rint + STD.t / 2;

// ---------------------------------------------------------------------------
// REGLAS — cómo se extiende el patrón a cualquier ángulo
// ---------------------------------------------------------------------------
// Cada regla dice qué es `measured` (se lee del C60) y qué es `user` (decisión
// de este trabajo). Las decisiones `user` se eligieron para que NINGÚN vano
// crezca respecto del C60: si a 60° un tramo aguanta sin apoyo X grados, a 90°
// tampoco se pide más que X.
export const REGLAS = {
  // measured: N = A/paso, primero a medio paso, resto a paso completo.
  polines: (A) => {
    const N = Math.round(A / STD.pasoAng);
    return { N, ang: Array.from({ length: N }, (_, k) => (k + 0.5) * (A / N)) };
  },

  // measured: barrenos Ø7 en cada múltiplo entero del paso. En el C60 falta el
  // del centro exacto (k=7 de 14) porque ahí cae el patrón de soporte central.
  // Regla general: se omite el que choque con otro patrón (< 20 mm de arco).
  tirantes: (A, N) => Array.from({ length: N - 1 }, (_, i) => (i + 1) * (A / N)),

  // measured C60: k = 1, 6, N−6, N−1 (4 barrenos Ø9).
  // user: a 90° el vano central quedaría de 9 pasos (el C60 nunca pasa de 5),
  // así que se agrega el par central simétrico → 6 barrenos.
  diagonales: (A, N) => {
    const ks = new Set([1, 6, N - 6, N - 1]);
    if (N > 16) { ks.add(Math.floor((N - 1) / 2)); ks.add(Math.ceil(N / 2)); }
    return [...ks].filter((k) => k >= 1 && k <= N - 1).sort((a, b) => a - b)
      .map((k) => k * (A / N));
  },

  // measured C60: 4 patrones a 5,577° · 24,428° · 35,542° · 54,404°, simétricos,
  // para 3 travesaños — el central admite 2 posiciones (nota de la lámina).
  // Leído como REGLA y no como lista, el C60 dice: un patrón a 5,577° de cada
  // extremo, otro un vano de 18,85° más adentro, y lo que sobre al medio se
  // reparte parejo sin pasar nunca de ese vano. A 60° la regla devuelve los 4
  // patrones medidos EXACTOS (el hueco central de 11,1° no admite otro).
  // user: a 90° el hueco central pide 2 patrones más → 6 patrones, 5 travesaños.
  travesanos: (A) => {
    const e = 5.577;                       // measured: offset del extremo (C60)
    const vanoMax = 18.85;                 // measured: vano máximo del C60
    const izq = [e, e + vanoMax];
    const der = [A - e - vanoMax, A - e];
    const hueco = der[0] - izq[1];
    const medio = [];
    if (hueco > vanoMax + 1e-9) {
      const n = Math.ceil(hueco / vanoMax);
      for (let i = 1; i < n; i++) medio.push(izq[1] + (i * hueco) / n);
    }
    const pat = [...izq, ...medio, ...der].sort((a, b) => a - b);
    return { patrones: pat, usados: pat.length - 1 };
  },

  // measured C60: pares de soporte a 21,2 mm de cada extremo y a ±21,2 mm del
  // centro del desarrollo (o sea: extremos + 1 posición intermedia).
  // user: a 90° se mantiene EL MISMO vano de arco del C60 (732,3 mm de arco
  // externo entre posiciones, que es medio desarrollo del C60) → 2 posiciones
  // intermedias, a 1/3 y 2/3, con el vano clavado en el mismo valor.
  soportes: (A) => {
    // measured: en el C60 hay 1 posición intermedia (el centro) → vano = dev/2
    const vanoMaxArco = (STD.RnExt * 60 * D2R) / 2;
    const devExt = STD.RnExt * A * D2R;
    const n = Math.max(2, Math.ceil(devExt / vanoMaxArco - 1e-9));   // nº de vanos
    return Array.from({ length: n - 1 }, (_, i) => (i + 1) / n);   // fracciones del arco
  },
};

// ---------------------------------------------------------------------------
// Utilidades de geometría
// ---------------------------------------------------------------------------
let _fid = 0;
const fid = () => `f${++_fid}`;

// sector de corona en planta (XY), como polígono cerrado listo para extruir
function sectorCorona(r0, r1, a0, a1, seg = null) {
  const n = seg || Math.max(8, Math.ceil(((a1 - a0) / 1.5)));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * D2R;
    pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = (a0 + ((a1 - a0) * i) / n) * D2R;
    pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]);
  }
  pts.push(pts[0]);
  return pts.map(([x, y]) => [r2(x), r2(y)]);
}

const sketchXY = (name, z, pts, h, op = 'union') =>
  ({ id: fid(), name, shape: 'sketch', op, at: [0, 0, z], dir: [0, 0, 1],
     params: { pts, h, u: [1, 0, 0] } });

// barreno radial (eje horizontal) en un alma cilíndrica de radio R
function barrenoRadial(name, R, angDeg, z, dia) {
  const a = angDeg * D2R;
  return { id: fid(), name, shape: 'hole', op: 'cut',
           at: [r2(R * Math.cos(a)), r2(R * Math.sin(a)), r2(z)],
           dir: [Math.cos(a), Math.sin(a), 0],
           params: { dia, depth: 0, through: true } };
}

// Caja ORIENTADA en planta: rectángulo de `largo` (radial) × `ancho`
// (tangencial) centrado en (R, angDeg) y extruido `alto` hacia arriba desde z0.
// Las cajas del motor CAD son axis-aligned (`box` no rota), así que todo lo que
// tiene que seguir el arco se emite como boceto extruido.
function cajaRadial(name, R, angDeg, largo, ancho, z0, alto) {
  const a = angDeg * D2R, c = Math.cos(a), s = Math.sin(a);
  const ur = [c, s], ut = [-s, c];                 // radial y tangencial
  const cx = R * c, cy = R * s;
  const pts = [[+1, +1], [+1, -1], [-1, -1], [-1, +1], [+1, +1]].map(([kr, kt]) => [
    r2(cx + ur[0] * kr * largo / 2 + ut[0] * kt * ancho / 2),
    r2(cy + ur[1] * kr * largo / 2 + ut[1] * kt * ancho / 2),
  ]);
  return sketchXY(name, z0, pts, alto);
}

// barreno vertical en un ala plana
function barrenoVert(name, R, angDeg, z, dia) {
  const a = angDeg * D2R;
  return { id: fid(), name, shape: 'hole', op: 'cut',
           at: [r2(R * Math.cos(a)), r2(R * Math.sin(a)), r2(z)],
           dir: [0, 0, 1], params: { dia, depth: 0, through: true } };
}

const C = {   // paleta Conveyone (misma del LBP530/simulador)
  alma: '#d3d5cf', ala: '#c7c9c3', guia: '#aeb4ac',
  polin: '#9aa2a8', trav: '#c7c9c3', motor: '#33383c', sop: '#b9bdb6',
};

// ---------------------------------------------------------------------------
// Desarrollos de chapa (bloque `flat` que consume dxf_flat.mjs)
// ---------------------------------------------------------------------------
const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h], [0, 0]];

// Pieza ROLADA (alma o guía): el desarrollo es un rectángulo; el rolado no
// cambia la longitud de la fibra neutra, por eso K = 0,5 y el desarrollo es
// Rn·ang. Es exactamente lo que acotan las láminas C60 (1464 y 903).
function flatRolada(dev, alto, holes, material, aviso, cortes = []) {
  return {
    contorno: rect(r2(dev), r2(alto)),
    cortes: { circles: holes.map((q) => ({ c: [r2(q.x), r2(q.y)], r: q.dia / 2 })),
              polys: cortes },
    pliegues: [], etiquetas: [], pliegueInfo: [],
    t: STD.t, k: 0.5, radio: 0, material,
    avisos: aviso ? [aviso] : [],
  };
}

// Pieza CORTADA PLANA (refuerzo): no se desarrolla — el láser corta el sector
// de corona tal cual y después se rola en su propio plano (curvado de canto)
// o se corta directo de plancha. El contorno del DXF ES la pieza.
function flatCorona(r0, r1, A, holes, material, aviso) {
  const pts = sectorCorona(r0, r1, -A / 2, A / 2);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const ox = Math.min(...xs), oy = Math.min(...ys);
  return {
    contorno: pts.map(([x, y]) => [r2(x - ox), r2(y - oy)]),
    cortes: { circles: holes.map((q) => ({ c: [r2(q.x - ox), r2(q.y - oy)], r: q.dia / 2 })),
              polys: [] },
    pliegues: [], etiquetas: [], pliegueInfo: [],
    t: STD.t, k: 0.5, radio: 0, material,
    avisos: aviso ? [aviso] : [],
  };
}

// ---------------------------------------------------------------------------
// La curva
// ---------------------------------------------------------------------------
export function curva(A) {
  _fid = 0;
  const parts = [];
  const a0 = -A / 2, a1 = A / 2;          // curva centrada en el ángulo 0
  const pol = REGLAS.polines(A);
  const N = pol.N;
  const tir = REGLAS.tirantes(A, N);
  const dia = REGLAS.diagonales(A, N);
  const tra = REGLAS.travesanos(A);
  const sopFrac = REGLAS.soportes(A);

  const devExt = STD.RnExt * A * D2R;
  const devInt = STD.RnInt * A * D2R;

  // posiciones angulares de los pares de soporte: a 21,2 mm de arco de cada
  // extremo y a ±21,2 mm de cada posición intermedia (measured C60)
  const sopAng = (Rn) => {
    const dA = (STD.soporteOffset / Rn) / D2R;
    const out = [a0 + dA, a1 - dA];
    for (const f of sopFrac) {
      const c = a0 + f * A;
      out.push(c - dA, c + dA);
    }
    return out.sort((x, y) => x - y);
  };

  // ---- helper: construye un LATERAL (alma + 2 alas) ------------------------
  function lateral(lado) {
    const ext = lado === 'ext';
    const Ralma = ext ? STD.Rext : STD.Rint;              // cara interior del alma
    const RalmaOut = ext ? STD.RextAlmaExt : STD.RintAlmaExt;
    const Rn = ext ? STD.RnExt : STD.RnInt;
    const dev = ext ? devExt : devInt;
    const polinY = ext ? STD.polinYExt : STD.polinYInt;
    // el ala sale hacia AFUERA del transportador en ambos laterales
    const [ra0, ra1] = ext ? [Ralma, STD.RalaExt] : [STD.RalaInt, RalmaOut];

    const f = [];
    // alma: sector de corona de espesor t, extruido 190,5 hacia abajo
    f.push(sketchXY(`Alma ${STD.alma} rolada R${Ralma}`, -STD.alma,
      sectorCorona(Ralma, RalmaOut, a0, a1), STD.alma));

    // --- barrenos del alma, por fila -------------------------------------
    const holes = [];   // desarrollo: x = arco desde el extremo de entrada, y desde el BORDE INFERIOR
    const push = (name, angs, z, d) => {
      for (const ang of angs) {
        f.push(barrenoRadial(name, Ralma, ang, -z, d));
        holes.push({ x: (ang - a0) * D2R * Rn, y: STD.alma - z, dia: d });
      }
    };
    const angs = (arr) => arr.map((x) => a0 + x);

    push(`Eje de polín Ø${STD.polinDia}`, angs(pol.ang), polinY, STD.polinDia);
    // tirantes: se omite el que choque con un patrón de soporte (regla C60)
    const sa = sopAng(Rn);
    const chocaSoporte = (ang) => sa.some((s) => Math.abs((ang - s) * D2R * Rn) < 20);
    push(`Tirante Ø${STD.dTirante}`, angs(tir).filter((x) => !chocaSoporte(x)),
      STD.filaTirante, STD.dTirante);
    push(`Diagonal Ø${STD.dDiag}`, angs(dia), STD.filaDiag, STD.dDiag);
    for (const z of STD.filaSoporte) push(`Soporte Ø${STD.dSoporte}`, sa, z, STD.dSoporte);
    // travesaños: 4 barrenos por patrón (2 alturas × 2 posiciones a 52 mm)
    for (const z of STD.filaTravesano) {
      const c = tra.patrones.map((x) => a0 + x);
      const half = (STD.travesanoPaso / 2 / Rn) / D2R;
      push(`Travesaño Ø${STD.dTravesano}`, c.flatMap((x) => [x - half, x + half]),
        z, STD.dTravesano);
    }
    if (!ext) {
      // fila extra del lateral interno (measured: 4 barrenos Ø10,5 a 125,6)
      const c = [0.25, 0.4167, 0.5833, 0.75].map((q) => a0 + q * A);
      push(`Tirante interno Ø${STD.dTravesano}`, c, STD.filaTirInt, STD.dTravesano);
    }

    parts.push({
      pos: [0, 0, 0], quat: [0, 0, 0, 1],
      id: `cuerpo_lat_${lado}`, layer: 'user', color: C.alma,
      name: `FAB · Cuerpo lateral ${ext ? 'externo' : 'interno'} C${A}°`,
      features: f,
      flat: flatRolada(dev, STD.alma, holes, `${STD.material} — rolado R${Ralma}`,
        `ROLAR a R${Ralma} (cara interior). Desarrollo por fibra neutra K=0,5 · ${STD.norma}`),
    });

    // --- refuerzos (alas) superior e inferior ----------------------------
    // Misma pieza en las dos posiciones del lateral Y en el conjunto de guía:
    // economía de piezas del estándar C60 (una sola corona por lado y familia).
    for (const [pos, z] of [['superior', 0], ['inferior', -STD.alma]]) {
      const ff = [sketchXY(`Ala ${STD.ala}`, z - STD.t,
        sectorCorona(ra0, ra1, a0, a1), STD.t)];
      // barrenos de unión guía↔lateral y soportes de piso: uno por posición de
      // travesaño y de soporte, en el eje del ala
      const Rm = (ra0 + ra1) / 2;
      const hh = [];
      const angsAla = [...tra.patrones.map((x) => a0 + x), ...sopAng(Rm)];
      for (const ang of angsAla) {
        ff.push(barrenoVert(`Unión Ø${STD.dSoporte}`, Rm, ang, z, STD.dSoporte));
        const aa = ang * D2R;
        hh.push({ x: Rm * Math.cos(aa), y: Rm * Math.sin(aa), dia: STD.dSoporte });
      }
      parts.push({
        pos: [0, 0, 0], quat: [0, 0, 0, 1],
        id: `refuerzo_${lado}_${pos}`, layer: 'user', color: C.ala,
        name: `FAB · Refuerzo ${ext ? 'externo' : 'interno'} ${pos} C${A}°`,
        features: ff,
        flat: flatCorona(ra0, ra1, A, hh, `${STD.material} — corte plano de corona`,
          `CORTE PLANO (no se desarrolla: es sector de corona). Soldar al alma a 90°, cordón completo · ${STD.norma}`),
      });
    }
  }

  lateral('ext');
  lateral('int');

  // ---- guías superiores ----------------------------------------------------
  // Conjunto de guía = tira rolada de 32 + un refuerzo IDÉNTICO al del lateral,
  // soldado a 90°; el conjunto se aperna sobre el ala superior del lateral.
  for (const lado of ['ext', 'int']) {
    const ext = lado === 'ext';
    const R = ext ? STD.Rext : STD.RintAlmaExt;
    const Rn = ext ? STD.RnExt : STD.RnInt;
    const dev = ext ? devExt : devInt;
    const zb = STD.t;      // apoya sobre el ala del conjunto de guía
    parts.push({
      pos: [0, 0, 0], quat: [0, 0, 0, 1],
      id: `guia_${lado}`, layer: 'user', color: C.guia,
      name: `FAB · Guía ${ext ? 'externa' : 'interna'} superior C${A}°`,
      features: [sketchXY(`Guía ${STD.guia} rolada R${R}`, zb,
        sectorCorona(ext ? R : R - STD.t, ext ? R + STD.t : R, a0, a1), STD.guia)],
      flat: flatRolada(dev, STD.guia, [], `${STD.material} — rolado R${R}`,
        `ROLAR a R${R}. NO soldar las separaciones de los extremos (nota C60) · ${STD.norma}`),
    });
  }

  // ---- polines cónicos (componente comprado, no se fabrica) ---------------
  // Cónico para que la velocidad tangencial sea proporcional al radio:
  // r(R) ∝ R, con la generatriz superior horizontal.
  const rInt = (STD.polinYExt - STD.polinYInt) / (STD.Rext / STD.RintAlmaExt - 1);
  const rExt = rInt * (STD.Rext / STD.RintAlmaExt);
  for (let k = 0; k < N; k++) {
    const ang = a0 + pol.ang[k], a = ang * D2R;
    parts.push({
      pos: [0, 0, 0], quat: [0, 0, 0, 1],
      id: `polin_${k + 1}`, layer: 'user', color: C.polin,
      name: `NORM · Polín cónico 21" (Ø${r2(rInt * 2)}→Ø${r2(rExt * 2)})`,
      features: [{ id: fid(), name: 'Tronco de cono', shape: 'cylinder', op: 'union',
        at: [r2(STD.RintAlmaExt * Math.cos(a)), r2(STD.RintAlmaExt * Math.sin(a)),
             r2(-STD.polinYInt)],
        dir: [Math.cos(a), Math.sin(a), 0],
        params: { dia: r2(rInt * 2), dia2: r2(rExt * 2), h: STD.claroPolines } }],
    });
  }

  // Los ACCESORIOS ya no se modelan aquí. Son los mismos del transportador
  // recto ZP2026 y se instancian desde el STEP del fabricante: ver `montaje`
  // más abajo, `zp_componentes.mjs` (extrae) y `curva_ensamble.py` (arma).
  // Modelarlos "parecidos" era exactamente lo que hacía que la curva no
  // estuviera al nivel del recto.

  // ---- MONTAJE: dónde va cada componente REAL del recto 24V ----------------
  // El bastidor de la curva es propio (sale de los planos Kofmelk), pero los
  // accesorios son los MISMOS del transportador recto ZP2026: mismo travesaño
  // TR_S, mismo motor UniDrive, mismo soporte de motor BR_3002, misma estación
  // de patas. Aquí sólo se dice DÓNDE va cada uno; la geometría se instancia
  // desde `zp_piezas.json`, extraída del STEP del fabricante.
  // Cada entrada: { R, ang, z, giro } — polares sobre el eje de la curva; `giro`
  // es la rotación adicional en planta (rad) respecto de quedar radial.
  // Sergio: el diseño nativo lleva DOS conjuntos de motor, no tres. Mi cuenta
  // por zonas (21 polines / 7 = 3) era aritmética, no el equipo real.
  const nZonas = 2;
  const zonaAng = Array.from({ length: nZonas }, (_, i) => a0 + ((i + 0.5) / nZonas) * A);
  const montaje = {
    // POLÍN CÓNICO real (GLB de Sergio, `rodillo_conico.glb`). Su extremo chico
    // apoya contra el alma del lateral INTERNO (R=864) y el eje va a la altura
    // medida en el C60 para ese lado (18,3 bajo el borde del alma).
    polinConico: pol.ang.map((x) => ({
      R: r2(STD.RintAlmaExt), ang: r2(a0 + x), z: r2(-STD.polinYInt), giro: 0,
    })),
    travesano: tra.patrones.slice(0, tra.usados).map((x) => ({
      R: r2(STD.Rcentro), ang: r2(a0 + x), z: r2(-STD.filaTravesano[1] - 44), giro: 0,
    })),
    // UNIDAD MOTRIZ: motor + polea de aceleración + soporte + tarjeta, en UNA
    // pieza recortada entera del recto (idea de Sergio). Su origen está en la
    // CARA DE MONTAJE del soporte y +Y local mira hacia los polines, así que
    // instanciarla es literalmente «apoyar esa cara contra el alma del lateral
    // interno»: no queda ningún grado de libertad que equivocar. Una por zona.
    // Va contra el lateral EXTERNO, no el interno: la polea de arrastre del
    // polín (Ø87,5) está en su extremo GRANDE, a 515–540 mm del extremo chico,
    // o sea a R ≈ 1379–1404 — justo en el alma externa (R1397). El motor tiene
    // que quedar donde está esa garganta. Con `giro: π` la unidad crece hacia
    // adentro de la curva y su eje mira al interior del bastidor.
    unidadMotriz: zonaAng.map((ang) => ({
      // Altura tomada del recto: allá el eje del polín está en Z=90 y el
      // centro del motor en Z=2, o sea el motor cuelga 88 mm BAJO el eje. En la
      // curva el eje del polín en el lado externo está a −36, así que el centro
      // del motor va a −124; dentro de la unidad ese centro está a 69,2 de su
      // base, luego la base va a −193,2. Antes estaba en −190,5 y el motor
      // asomaba por encima de los polines.
      // Sergio: el soporte tiene que TOCAR el alma — es la referencia de
      // alineación, no un detalle estético. El origen de la unidad quedó en el
      // extremo en Y del conjunto (el cuerpo del motor), no en la cara del
      // soporte, y por eso quedaba separada. Se corre 1" hacia adentro, que es
      // lo que él midió sobre el recto.
      R: r2(STD.Rext - IN), ang: r2(ang), z: r2(-36 - 88 - 69.2), giro: Math.PI,
    })),
    // ESTACIÓN de patas completa (2 columnas + soporte pivote + niveladores),
    // no una columna suelta: la corrección que trajo el trabajo del LBP. Va
    // centrada en el eje del bastidor y cubre los 609 de ancho, igual que en
    // el recto.
    // La estación completa (columnas + placa de apoyo al piso + sección
    // transversal + regulación angular) mide 658 de alto y su origen está en el
    // PIE, así que la cabeza queda justo bajo el alma: TOR = 190,5 + 658.
    pata: [0, ...sopFrac, 1].map((fr) => ({
      R: r2(STD.Rcentro), ang: r2(a0 + fr * A), z: r2(-STD.alma - 658), giro: 0,
    })),
  };

  const dims = {
    angulo: A,
    polines: N,
    pasoAngular: r2(A / N),
    travesanos: tra.usados,
    zonas: nZonas,
    motores: nZonas,
    polinesPorZona: r2(N / nZonas),
    patronesTravesano: tra.patrones.length,
    posicionesSoporte: 2 + sopFrac.length,
    desarrollo: { externo: r2(devExt), interno: r2(devInt) },
    radios: { int: STD.Rint, ext: STD.Rext, alaInt: r2(STD.RalaInt),
              alaExt: r2(STD.RalaExt), centro: r2(STD.Rcentro) },
    envolvente: r2(STD.anchoEnvolvente),
    claroPolines: r2(STD.claroPolines),
    cuerda: { externo: r2(2 * STD.RalaExt * Math.sin(A / 2 * D2R)),
              interno: r2(2 * STD.RalaInt * Math.sin(A / 2 * D2R)) },
    // envolvente en planta, como la acota el ensamblaje C60 (864 × 1435)
    envolventePlanta: A >= 90
      ? [r2(STD.RalaExt), r2(STD.RalaExt)]
      : [r2(STD.RalaExt * Math.sin(A * D2R)), r2(STD.RalaExt)],
  };

  const doc = {
    meta: {
      formato: 'foto3d-cad', version: 1,
      nombre: `Curva ${A}° 24" de polines cónicos — Conveyone`,
      unidades: 'mm', capa: 'user',
      fuente: 'Estándar de los planos Kofmelk "Curva60 etapa 1" (KOFMELK SPA, '
        + '3/11/2024, rev. 6-7/2025) extendido paramétricamente. Radios, sección '
        + 'y patrones de perforación: measured. Extensión del arco: user.',
      norma: STD.norma,
      dims, montaje,
    },
    parts,
  };
  return { doc, dims };
}

// ---------------------------------------------------------------------------
// Sólo escribe cuando se corre como programa: importarlo (tests) no toca disco.
const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && process.argv[1].endsWith('gen_curva.mjs')) {
const salida = {};
for (const A of [60, 90]) {
  const { doc, dims } = curva(A);
  const file = `curva${A}_24.json`;
  writeFileSync(join(here, file), JSON.stringify(doc, null, 1));
  salida[`C${A}`] = dims;
  console.log(`${file}: ${doc.parts.length} piezas · ${dims.polines} polines · `
    + `paso ${dims.pasoAngular}° · desarrollo ext ${dims.desarrollo.externo} / `
    + `int ${dims.desarrollo.interno} · ${dims.travesanos} travesaños`);
}
writeFileSync(join(here, 'curva_dims.json'), JSON.stringify(salida, null, 1));
console.log('curva_dims.json escrito');
}
