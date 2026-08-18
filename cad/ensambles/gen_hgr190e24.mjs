#!/usr/bin/env node
// gen_hgr190e24.mjs — Piezas del kit colgante Hytrol 190-E24 (CV-HGR-190E24).
//
// Genera ensambles/hgr190e24.json con las DOS piezas a fabricar (12 c/u):
//   HGD-01 · PD-48  placa distribuidora plana
//   HGD-02 · RC-48V retenedor de cañería, asiento en V 90°
// cada una con su bloque `flat` ANALÍTICO (desarrollo por factor K) y sus
// features 3D (model.js) para las láminas de vistas de S6.
//
// Fuente de datos (capa user): carpeta de traspaso Conveyone
// projects/CV-HGR-190E24/input/docs/Conveyone_Colgante_Hytrol_190E24.pdf
// (CV-HGR-190E24-01 Rev. B "asiento en V") + instrucciones del usuario
// 2026-08-18 (Rev. foto3d B-1):
//   - material acero ASTM A36, chapa 4 mm, 12 piezas de cada una;
//   - extremos SEMICIRCULARES (radio = ancho/2, centrado en el agujero);
//   - agujeros de perno como COLISOS 11×16 (ajuste ±2.5 mm: la medida final
//     en terreno no se conoce con precisión);
//   - PD-48 pasa de 116 a 130 mm de largo para conservar distancia al borde
//     con el coliso y el extremo redondeado (2×Ø11 @96 se mantiene).
//
// El desarrollo del RC-48V se calcula EXACTO por puntos de tangencia de cada
// pliegue + fibra neutra BA = θ·(R + K·t) (mismo criterio que sheetmetal.js),
// NO copiando la tabla del documento: el script CONTRASTA su resultado contra
// los valores declarados en el PDF (desarrollo total, ejes de plegado
// interiores, bend deductions) y ABORTA si no coinciden dentro de tolerancia.
// Las diferencias de convención que sí existen (posición de las líneas de
// plegado de las orejas) se reportan, no se ocultan.
//
// Uso:  node ensambles/gen_hgr190e24.mjs      (desde cad/)

import { bendAllowance } from '../js/sheetmetal.js';
import { writeFileSync } from 'node:fs';

const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------------------
// Parámetros (capa user — doc Rev. B + instrucciones usuario Rev. foto3d B-1)
// ---------------------------------------------------------------------------
const P = {
  t: 4, Ri: 4, K: 0.44, strip: 30,
  material: 'Acero ASTM A36 — chapa 4 mm (corte láser)',
  qty: 12,
  // retenedor RC-48V (cotas medidas desde el plano de las orejas)
  intW: 52,                     // ancho interior entre alas
  depth: 57.5,                  // profundidad total al ápice interior (V 90°)
  earOut: 33.0,                 // oreja desde cara exterior del ala (29.52 + BD90/2 del doc)
  boltSep: 96,                  // entre ejes de pernos 3/8" o M10
  slotW: 11, slotL: 16,         // coliso de ajuste (Rev. B-1) — antes Ø11
  prisDia: 8.5,                 // prisionero, roscar M10, centrado en flanco 1
  // placa distribuidora PD-48 (Rev. B-1: largo 130, extremos R17)
  pdL: 130, pdW: 34, pdT: 4, pdHoleSep: 96,
};

// Valores DECLARADOS por el documento (contraste del RC-48V, no copia):
const DOC = {
  desarrolloTotal: 200.11,
  ejesInteriores: [62.16, 100.05, 137.95],  // pliegues 2 (45°), 3 (ápice), 4 (45°)
  lineasOrejas: [29.52, 170.59],            // pliegues 1 y 5 según convención del doc
  bd90: 6.952, bd45: 2.104,
};

// ---------------------------------------------------------------------------
// Desarrollo EXACTO del RC-48V — construcción por tangencias
// Perfil en (x, y) con y hacia ABAJO desde el plano de las orejas (contacto
// con el ala inferior del canal). Mitad derecha; la izquierda es espejo.
// ---------------------------------------------------------------------------
const { t, Ri, K } = P;
const wi = P.intW / 2;                 // cara interior del ala        = 26
const wo = wi + t;                     // cara exterior del ala        = 30
const tip = wo + P.earOut;             // extremo de la oreja          = 63
const S2 = Math.SQRT2;

const C1 = [wo + Ri, t + Ri];                          // pliegue oreja↔ala (90°)
const C2 = [wi - Ri, P.depth - (wi - Ri) - Ri * S2];   // pliegue ala↔flanco (45°)
const C3 = [0, P.depth - Ri * S2];                     // ápice de la V (90°)

const earFlat = tip - C1[0];                           // 29.0
const wallFlat = C2[1] - C1[1];                        // 21.843
const flankFlat = (C2[0] - C3[0]) * S2;                // 31.113 (entre tangencias)

const BA90 = bendAllowance(90, Ri, t, K);              // 9.0478
const BA45 = bendAllowance(45, Ri, t, K);              // 4.5239
const OSSB90 = Ri + t, OSSB45 = Math.tan(Math.PI / 8) * (Ri + t);
const BD90 = 2 * OSSB90 - BA90;                        // 6.9522
const BD45 = 2 * OSSB45 - BA45;                        // 2.1035

const seq = [
  { tramo: 'oreja 1', flat: earFlat, ba: BA90, ang: 90, dir: 'ABAJO' },
  { tramo: 'ala 1', flat: wallFlat, ba: BA45, ang: 45, dir: 'ARRIBA' },
  { tramo: 'flanco 1', flat: flankFlat, ba: BA90, ang: 90, dir: 'ARRIBA' },
  { tramo: 'flanco 2', flat: flankFlat, ba: BA45, ang: 45, dir: 'ARRIBA' },
  { tramo: 'ala 2', flat: wallFlat, ba: BA90, ang: 90, dir: 'ABAJO' },
  { tramo: 'oreja 2', flat: earFlat, ba: 0, ang: 0, dir: '' },
];
let acc = 0;
const bends = [];
for (const s of seq) {
  acc += s.flat;
  if (s.ba) {
    bends.push({ x0: acc, eje: acc + s.ba / 2, x1: acc + s.ba, ang: s.ang, dir: s.dir });
    acc += s.ba;
  }
}
const devTotal = acc;                                   // 200.103

// --- contraste contra el documento (regla de oro: no inventar, verificar) ---
const fail = [];
const near = (a, b, tol, what) => {
  if (Math.abs(a - b) > tol) fail.push(`${what}: calculado ${r3(a)} vs doc ${b} (tol ${tol})`);
};
near(devTotal, DOC.desarrolloTotal, 0.05, 'desarrollo total');
near(BD90, DOC.bd90, 0.01, 'bend deduction 90°');
near(BD45, DOC.bd45, 0.01, 'bend deduction 45°');
[bends[1], bends[2], bends[3]].forEach((b, i) =>
  near(b.eje, DOC.ejesInteriores[i], 0.05, `eje pliegue interior ${i + 2}`));
if (fail.length) {
  console.error('CONTRASTE CONTRA EL DOCUMENTO FALLÓ:\n  ' + fail.join('\n  '));
  process.exit(1);
}
const earNote = `LINEAS DE OREJAS DEL DOC (${DOC.lineasOrejas.join(' / ')}) SON LINEA DE ` +
  `MOLDE BD/2; EJES REALES EN ${r2(bends[0].eje)} / ${r2(bends[4].eje)} (Δ ${r2(bends[0].eje - DOC.lineasOrejas[0])} mm)`;

// ---------------------------------------------------------------------------
// Contornos: tira con extremos semicirculares y colisos (Rev. B-1)
// ---------------------------------------------------------------------------
function arc2(c, r, a0, a1, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    pts.push([r3(c[0] + r * Math.cos(a)), r3(c[1] + r * Math.sin(a))]);
  }
  return pts;
}
const D = Math.PI / 180;

// tira L×W con extremos de radio W/2 centrados a W/2 de cada borde
function stadium(L, W) {
  const R = W / 2;
  return [
    [R, 0], [r3(L - R), 0],
    ...arc2([L - R, R], R, -90 * D, 90 * D),        // extremo derecho
    [R, W],
    ...arc2([R, R], R, 90 * D, 270 * D),            // extremo izquierdo
  ];
}

// coliso (obround) centrado en (cx, cy): largo L en x, ancho W
function slot(cx, cy, L, W) {
  const R = W / 2, s = L / 2 - R;
  return [
    [r3(cx - s), r3(cy - R)], [r3(cx + s), r3(cy - R)],
    ...arc2([cx + s, cy], R, -90 * D, 90 * D, 12),
    [r3(cx - s), r3(cy + R)],
    ...arc2([cx - s, cy], R, 90 * D, 270 * D, 12),
  ];
}

const yC = P.strip / 2;
const holeEar1 = tip - P.boltSep / 2;   // dev desde el borde de la oreja = 15.0
const prisDev = earFlat + BA90 + wallFlat + BA45 + flankFlat / 2;   // 79.97
// el extremo semicircular R15 queda CENTRADO en el coliso (15 = strip/2 ✓)
if (Math.abs(holeEar1 - yC) > 1e-9) {
  console.error('AVISO: el agujero de oreja no coincide con el centro del semicírculo');
}

const pliegues = [];
const etiquetas = [];
bends.forEach((b, i) => {
  pliegues.push({ a: [r3(b.x0), 0], b: [r3(b.x0), P.strip], tipo: 'tangente' });
  pliegues.push({ a: [r3(b.eje), 0], b: [r3(b.eje), P.strip], tipo: 'eje' });
  pliegues.push({ a: [r3(b.x1), 0], b: [r3(b.x1), P.strip], tipo: 'tangente' });
  etiquetas.push({ x: r3(b.eje), y: P.strip + 1.2, s: `P${i + 1} ${b.ang}° ${b.dir}${i === 2 ? ' (ÁPICE)' : ''}` });
});
etiquetas.push({ x: r3(devTotal / 2), y: -16,
  s: 'SECUENCIA: P3 (ápice) > P2·P4 (45°) > P1·P5 (orejas) · CARA DEL ASIENTO HACIA ARRIBA' });

const flatRC = {
  contorno: stadium(r3(devTotal), P.strip),
  cortes: {
    circles: [{ c: [r3(prisDev), yC], r: P.prisDia / 2 }],
    polys: [
      slot(holeEar1, yC, P.slotL, P.slotW),
      slot(r3(devTotal - holeEar1), yC, P.slotL, P.slotW),
    ],
  },
  pliegues, etiquetas,
  pliegueInfo: bends.map(b => ({ ang: b.ang, r: Ri, ba: r3(b.ang === 90 ? BA90 : BA45) })),
  t, k: K, radio: Ri, material: P.material,
  avisos: [
    'PLEGAR CON LA CARA DEL ASIENTO (INTERIOR) HACIA ARRIBA: P2·P3·P4 ARRIBA — OREJAS P1·P5 ABAJO',
    'REV. B-1: EXTREMOS R15 + COLISOS 11×16 DE AJUSTE (±2.5 mm) — INSTRUCCIÓN USUARIO 2026-08-18',
    earNote,
  ],
};

const pdHoleX1 = (P.pdL - P.pdHoleSep) / 2;             // 17 = pdW/2 ✓ centrado en R
const flatPD = {
  contorno: stadium(P.pdL, P.pdW),
  cortes: {
    circles: [],
    polys: [
      slot(pdHoleX1, P.pdW / 2, P.slotL, P.slotW),
      slot(P.pdL - pdHoleX1, P.pdW / 2, P.slotL, P.slotW),
    ],
  },
  pliegues: [], etiquetas: [], pliegueInfo: [],
  t: P.pdT, k: K, radio: P.pdT, material: P.material,
  avisos: [
    'PIEZA PLANA — SIN PLIEGUES (placa distribuidora sobre el ala del canal)',
    'REV. B-1: LARGO 130 (ANTES 116), EXTREMOS R17 + COLISOS 11×16 — 2 EJES @96 SIN CAMBIO',
  ],
};

// ---------------------------------------------------------------------------
// Perfil 3D del RC-48V (sección con arcos reales) para model.js
// Boceto en (u = x del perfil, v = y hacia abajo).
// ---------------------------------------------------------------------------
const M = ([x, y]) => [-x, y];
const Ro = Ri + t;

// los arcos del lado izquierdo son el espejo PUNTO A PUNTO del lado derecho
// (calcular sobre C1/C2 y espejar el resultado; espejar el centro Y los
// puntos a la vez duplicaría la reflexión)
const SA = [
  [-tip, 0],
  ...arc2(C1, Ro, -90 * D, -180 * D, 12).map(M),   // B1 izq: (−34,0)→(−26,8)
  [-wi, r3(C2[1])],
  ...arc2(C2, Ri, 0 * D, 45 * D, 12).map(M),       // B2 izq: (−26,·)→flanco
  ...arc2(C3, Ri, 135 * D, 45 * D, 12),            // ápice interior
  ...arc2(C2, Ri, 45 * D, 0 * D, 12),              // B2 der: flanco→(26,·)
  [wi, r3(C1[1])],
  ...arc2(C1, Ro, -180 * D, -90 * D, 12),          // B1 der: (26,8)→(34,0)
  [tip, 0],
];
const SB = [
  [tip, t],
  ...arc2(C1, Ri, -90 * D, -180 * D, 12),          // B1 der int: (34,4)→(30,8)
  [wo, r3(C2[1])],
  ...arc2(C2, Ro, 0 * D, 45 * D, 12),              // B2 der ext
  ...arc2(C3, Ro, 45 * D, 135 * D, 12),            // ápice exterior
  ...arc2(C2, Ro, 45 * D, 0 * D, 12).map(M),       // B2 izq ext
  [-wo, r3(C1[1])],
  ...arc2(C1, Ri, -180 * D, -90 * D, 12).map(M),   // B1 izq int: (−30,8)→(−34,4)
  [-tip, t],
];
const perfilRC = [...SA, ...SB];

// recorte de esquinas de oreja (extremo semicircular R15 centrado en el perno)
// región: rectángulo más allá del perno menos el semidisco R15
function earCornerCut(sgn) {                            // sgn=+1 oreja derecha
  const cx = sgn * P.boltSep / 2;                       // ±48
  const R = P.strip / 2;
  const far = sgn * (tip + 6);
  const pts = [
    [r3(cx), 0], [r3(far), 0], [r3(far), P.strip], [r3(cx), P.strip],
    ...arc2([cx, yC], R, 90 * D, sgn > 0 ? -90 * D : 270 * D, 24),
  ];
  return {
    shape: 'sketch', at: [0, 0, 2], dir: [0, 0, 1], op: 'cut',
    params: { pts, u: [1, 0, 0], h: 12, side: 'pos' },
  };
}

// centro del flanco 1 (izquierdo) sobre su cara interior + normal exterior
const fT1 = [-(C2[0] + Ri / S2), r3(C2[1] + Ri / S2)];
const fT2 = [-(C3[0] + Ri / S2), r3(C3[1] + Ri / S2)];
const prisAt = [r3((fT1[0] + fT2[0]) / 2), yC, r3(-(fT1[1] + fT2[1]) / 2)];
const prisDir = [-1 / S2, 0, -1 / S2];

const partRC = {
  name: 'FAB · RC-48V retenedor asiento en V',
  color: '#2e7d32',
  flat: flatRC,
  features: [
    { id: 'F1', shape: 'sketch', at: [0, 0, 0], dir: [0, 1, 0], op: 'union',
      params: { pts: perfilRC, u: [1, 0, 0], h: P.strip, side: 'pos' } },
    { id: 'F2', ...earCornerCut(-1) },
    { id: 'F3', ...earCornerCut(1) },
    { id: 'F4', shape: 'sketch', at: [0, 0, 2], dir: [0, 0, 1], op: 'cut',
      params: { pts: slot(-P.boltSep / 2, yC, P.slotL, P.slotW), u: [1, 0, 0], h: 12, side: 'pos' } },
    { id: 'F5', shape: 'sketch', at: [0, 0, 2], dir: [0, 0, 1], op: 'cut',
      params: { pts: slot(P.boltSep / 2, yC, P.slotL, P.slotW), u: [1, 0, 0], h: 12, side: 'pos' } },
    { id: 'F6', shape: 'hole', at: prisAt, dir: prisDir,
      op: 'cut', params: { dia: P.prisDia, through: true } },
  ],
};

const partPD = {
  name: 'FAB · PD-48 placa distribuidora',
  color: '#8d959b',
  flat: flatPD,
  features: [
    { id: 'F1', shape: 'sketch', at: [0, 0, 0], dir: [0, 0, 1], op: 'union',
      params: { pts: stadium(P.pdL, P.pdW).map(([x, y]) => [r3(x - P.pdL / 2), r3(y - P.pdW / 2)]),
        u: [1, 0, 0], h: P.pdT, side: 'pos' } },
    { id: 'F2', shape: 'sketch', at: [0, 0, P.pdT + 2], dir: [0, 0, 1], op: 'cut',
      params: { pts: slot(-P.pdHoleSep / 2, 0, P.slotL, P.slotW), u: [1, 0, 0], h: 12, side: 'pos' } },
    { id: 'F3', shape: 'sketch', at: [0, 0, P.pdT + 2], dir: [0, 0, 1], op: 'cut',
      params: { pts: slot(P.pdHoleSep / 2, 0, P.slotL, P.slotW), u: [1, 0, 0], h: 12, side: 'pos' } },
  ],
};

// 12 instancias de cada una (dxf_flat.mjs agrupa por firma del flat → ×12)
const parts = [];
for (let i = 0; i < P.qty; i++) parts.push(partRC, partPD);

// ---------------------------------------------------------------------------
// Datos de cálculo y de la SECCIÓN DE PLEGADO para las láminas (planos_*.mjs)
// ---------------------------------------------------------------------------
const areaSlot = (P.slotL - P.slotW) * P.slotW + Math.PI * (P.slotW / 2) ** 2;
const areaRC = (devTotal - P.strip) * P.strip + Math.PI * (P.strip / 2) ** 2
  - 2 * areaSlot - Math.PI * (P.prisDia / 2) ** 2;
const areaPD = (P.pdL - P.pdW) * P.pdW + Math.PI * (P.pdW / 2) ** 2 - 2 * areaSlot;
const calc = {
  t, Ri, K, strip: P.strip, devTotal: r3(devTotal),
  BA90: r3(BA90), BA45: r3(BA45), BD90: r3(BD90), BD45: r3(BD45),
  bends: bends.map((b, i) => ({ n: i + 1, eje: r3(b.eje), x0: r3(b.x0), x1: r3(b.x1),
    ang: b.ang, dir: b.dir })),
  tramos: seq.map(s => ({ tramo: s.tramo, flat: r3(s.flat) })),
  masaRC_kg: r3(areaRC * t * 7.85e-6),
  masaPD_kg: r3(areaPD * P.pdT * 7.85e-6),
  seccion: {
    perfil: perfilRC,                    // (x, y hacia abajo)
    ancho: 2 * tip, altoExt: r3(C3[1] + Ro),
    intW: P.intW, depth: P.depth,
    pipe: { c: [0, r3(P.depth - 24.15 * S2)], d: 48.3 },   // asentada en la V
    anclas: [                            // punto de referencia de cada pliegue
      { n: 1, at: [-(wo + 2), 2] }, { n: 2, at: [-(wi + 1.5), r3(C2[1] + 1.5)] },
      { n: 3, at: [0, r3(C3[1] + Ro)] }, { n: 4, at: [wi + 1.5, r3(C2[1] + 1.5)] },
      { n: 5, at: [wo + 2, 2] },
    ],
  },
  earNote,
};

const doc = {
  meta: {
    nombre: 'CV-HGR-190E24 · kit colgante Hytrol 190-E24 (Rev. B-1: asiento en V, colisos)',
    proyecto: 'CV-HGR-190E24',
    marca: 'CONVEYONE',            // cajetín con logotipo del cliente (capa LOGO, azul)
    marcaSub: 'CONVEYONE SpA',
    fuente: 'input/docs/Conveyone_Colgante_Hytrol_190E24.pdf (capa user) + usuario: A36, 12 c/u, extremos R, colisos',
    material: P.material,
    cantidad_por_pieza: P.qty,
    calc,
  },
  parts,
};
writeFileSync(new URL('./hgr190e24.json', import.meta.url), JSON.stringify(doc, null, 1));

// ---------------------------------------------------------------------------
console.log('== DESARROLLO EXACTO RC-48V (tangencias + fibra neutra) ==');
console.log(`t=${t} Ri=${Ri} K=${K}  BA90=${r3(BA90)}  BA45=${r3(BA45)}  BD90=${r3(BD90)}  BD45=${r3(BD45)}`);
let x = 0;
for (const s of seq) {
  console.log(`  ${s.tramo.padEnd(9)} plano ${String(r3(s.flat)).padEnd(7)} → x=${r3(x + s.flat)}` +
    (s.ba ? `  | BA ${r3(s.ba)} eje en x=${r3(x + s.flat + s.ba / 2)} (${s.ang}° ${s.dir})` : ''));
  x += s.flat + s.ba;
}
console.log(`  DESARROLLO TOTAL = ${r3(devTotal)} mm × ${P.strip} mm  (doc: ${DOC.desarrolloTotal})`);
console.log(`  colisos ${P.slotW}×${P.slotL} en dev x=${r3(holeEar1)} / ${r3(devTotal - holeEar1)} · prisionero Ø${P.prisDia} en x=${r3(prisDev)}`);
console.log(`  CONTRASTE DOC: OK (ejes interiores ${bends.slice(1, 4).map(b => r2(b.eje)).join(' / ')})`);
console.log(`  NOTA: ${earNote}`);
console.log(`== MASAS (A36 7850 kg/m³): RC-48V ${calc.masaRC_kg} kg · PD-48 ${calc.masaPD_kg} kg — ${P.qty} c/u ==`);
console.log(`OK ensambles/hgr190e24.json (${parts.length} piezas fab)`);
