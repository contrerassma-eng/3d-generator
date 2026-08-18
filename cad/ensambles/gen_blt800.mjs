#!/usr/bin/env node
// gen_blt800.mjs — CV-BLT-800×500: banda plana COMPLETA de ejemplo, estilo
// MB800 M-HASTE (orden de Sergio 18-08: «completa, tomo como ejemplo un largo
// de 800mm y ancho 500mm, incluye todo lo necesario»).
//
// CAPAS (PRD biblioteca/CV-BLT/PRD_mb800_soportes.md §B):
//   · web  — criterios citados de m-haste.com (18-08): bastidor perfil
//     aluminio serie 80 sin soldar/taladrar, W=500 es ancho estándar, motor
//     120 W acoplado DIRECTO al tambor (DL), tensado por TORNILLO, banda PVC.
//   · user — donde el dato vendor NO está publicado (Ø tambor, espesores,
//     cabezales), la cifra es DISEÑO PROPIO ConveyOne con materiales
//     comerciales chilenos, DECLARADA en lámina. Esto NO es el plano del
//     MB800 comprado.
//   · user-vendor — pies y placas de pata M-HASTE: envolvente aquí, geometría
//     REAL tal cual en el paquete MB800 REV A (láminas MB800-MB-01..08).
//
// Coordenadas: X = largo (0 = extremo tensor, 800 = extremo motriz),
// Y = ancho (0 al centro), Z = altura (0 = piso).

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compuertasUniversales, sellarCompuertas } from './lib_compuertas.mjs';
import { redondear, rEsquina, rect, KCH, flatPlaca } from './lib_chapa.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const r2 = (v) => Math.round(v * 100) / 100;

// ── parámetros del ejemplo (nomenclatura vendor: MB800-DL-A-L800-W500-H750) ──
const L = 800;                 // nose a nose (rango vendor 650-12000 ✓)
const WB = 500;                // ancho de banda (ancho estándar vendor ✓)
const H_TOP = 750;             // cota superior de banda (rango vendor 350-1500 ✓)
const T_BANDA = 2;             // PVC 2 mm (opción vendor)
const PERFIL = { w: 40, h: 80 };            // 4080 serie 80 (criterio vendor)
const D_MOTRIZ = 88.9, T_TUBO_M = 3;        // tubo comercial 3½ in — capa user
const D_TENSOR = 63.5, T_TUBO_T = 3;        // tubo comercial 2½ in — capa user
const CARA_TAMBOR = 520;                    // banda 500 + 10 por lado
const CARRERA_TENSADO = 40;                 // tensado por tornillo (criterio vendor)

// derivadas (cantidad-derivada: nada literal que pueda calcularse)
const Z_CAMA_TOP = H_TOP - T_BANDA;         // 748
const T_CAMA = 2;
const Z_LARG_TOP = Z_CAMA_TOP - T_CAMA;     // 746
const Z_LARG_BOT = Z_LARG_TOP - PERFIL.h;   // 666
const Y_LARG = WB / 2 + 10 + PERFIL.w / 2;  // eje del larguero (borde interior a 10 de banda)
const X_TAMBOR_T = D_TENSOR / 2 + 12;       // centro tambor tensor
const X_TAMBOR_M = L - D_MOTRIZ / 2 - 12;   // centro tambor motriz
const Z_EJES = Z_CAMA_TOP - D_MOTRIZ / 2 + 4; // tambor casi tangente a la cama
const CENTROS = r2(X_TAMBOR_M - X_TAMBOR_T);
const LAZO = r2(2 * CENTROS + Math.PI * (D_MOTRIZ + D_TENSOR) / 2);

// ── infraestructura de partes (misma convención del gen LBP) ────────────────
let nf = 0, np = 0;
const fid = () => `f${++nf}`;
const parts = [];
const box = (name, at, w, d, h, op = 'union') =>
  ({ id: fid(), name, shape: 'box', op, at: [at[0], at[1], at[2] - h / 2], dir: [0, 0, 1], params: { w, d, h } });
const cyl = (name, at, dir, dia, h, op = 'union') =>
  ({ id: fid(), name, shape: 'cylinder', op, at, dir, params: { dia, h } });
const hole = (name, at, dir, dia, depth = 0, through = true) =>
  ({ id: fid(), name, shape: 'hole', op: 'cut', at, dir, params: { dia, depth, through } });
function addPart(name, color, anchor, features, extra = {}) {
  const [ax, ay, az] = anchor;
  for (const f of features) f.at = [f.at[0] - ax, f.at[1] - ay, f.at[2] - az];
  parts.push({
    id: `p${(++np)}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    name, color, pos: [ax, ay, az], quat: [0, 0, 0, 1],
    fixed: parts.length === 0, visible: true, ...extra, features,
  });
}
const C = { estructura: '#c8c8c6', chapa: '#b7bdc2', transmision: '#3a3f45',
  banda: '#3667a6', vendor: '#8f979e', tornillo: '#6a7075' };

// ═══ 1. BASTIDOR — perfiles serie 80 COMPRADOS (corte a largo, sin plano) ═══
const L_LARG = r2(L - 2 * 58);              // largueros entre cabezales
for (const s of [-1, 1]) {
  addPart(`NORM · Perfil aluminio 4080 serie 80 — LARGUERO L=${L_LARG} (corte a largo)`, C.estructura,
    [L / 2, s * Y_LARG, (Z_LARG_TOP + Z_LARG_BOT) / 2],
    [box('Larguero', [L / 2, s * Y_LARG, (Z_LARG_TOP + Z_LARG_BOT) / 2], L_LARG, PERFIL.w, PERFIL.h)]);
}
const L_TRAV = r2(2 * Y_LARG - PERFIL.w);
for (const xt of [200, 600]) {
  addPart(`NORM · Perfil aluminio 4080 serie 80 — TRAVESAÑO L=${L_TRAV} (corte a largo)`, C.estructura,
    [xt, 0, Z_LARG_BOT + 20],
    [box('Travesaño', [xt, 0, Z_LARG_BOT + 20 + PERFIL.w / 2], PERFIL.h, L_TRAV, PERFIL.w)]);
}

// ═══ 2. CAMA DESLIZANTE — chapa propia (compuertas de chapa APLICAN) ═══════
const L_CAMA = r2(X_TAMBOR_M - X_TAMBOR_T - D_MOTRIZ / 2 - D_TENSOR / 2 - 16);
const X_CAMA = r2((X_TAMBOR_M + X_TAMBOR_T) / 2);
const W_CAMA = CARA_TAMBOR;
{
  const holes = [];
  const f = [box('Cama', [X_CAMA, 0, Z_CAMA_TOP - T_CAMA / 2], L_CAMA, W_CAMA, T_CAMA)];
  for (const xt of [200, 600]) for (const s of [-1, 1]) {
    const hx = xt, hy = s * (W_CAMA / 2 - 25);
    holes.push({ x: r2(hx - (X_CAMA - L_CAMA / 2)), y: r2(hy + W_CAMA / 2), dia: 7 });
    f.push(hole('M6 cama a travesaño', [hx, hy, Z_CAMA_TOP - T_CAMA / 2], [0, 0, 1], 7, 0, true));
  }
  addPart(`FAB · Cama deslizante e${T_CAMA} ${L_CAMA}×${W_CAMA} (apoyo de banda)`, C.chapa,
    [X_CAMA, 0, Z_CAMA_TOP - T_CAMA / 2], f, {
      flat: flatPlaca(L_CAMA, W_CAMA, T_CAMA, holes,
        'Acero inoxidable AISI 304 e2.0 — cara de deslizamiento PULIDA',
        'CARA SUPERIOR pulida (desliza la banda): sin rayas, sin salpicadura — proteger en transporte'),
    });
}

// ═══ 3. CABEZALES — placas porta-rodamiento propias (chapa PL6) ════════════
// Motriz: paso de muñón Ø22 + 2×Ø10 (portarrodamiento de brida 2 pernos
// UCFL204 Ø20) + 4×Ø9 de amarre al larguero. TODO barreno redondo (regla 20).
const PL_T = 6, PLM_W = 160, PLM_H = 140;
const Z_PL_C = Z_EJES;                       // centrada en el eje
for (const s of [-1, 1]) {
  const yPl = s * (Y_LARG + PERFIL.w / 2 + PL_T / 2);
  const holes = [
    { x: PLM_W / 2, y: PLM_H / 2, dia: 22 },
    { x: PLM_W / 2, y: PLM_H / 2 - 45, dia: 10 },
    { x: PLM_W / 2, y: PLM_H / 2 + 45, dia: 10 },
    { x: 20, y: 20, dia: 9 }, { x: PLM_W - 20, y: 20, dia: 9 },
    { x: 20, y: PLM_H - 20, dia: 9 }, { x: PLM_W - 20, y: PLM_H - 20, dia: 9 },
  ];
  const x0 = X_TAMBOR_M - PLM_W / 2, z0 = Z_PL_C - PLM_H / 2;
  const f = [box('Placa', [X_TAMBOR_M, yPl, Z_PL_C + 0], PLM_W, PL_T, PLM_H)];
  for (const q of holes) f.push(hole(q.dia === 22 ? 'Paso muñón Ø22' : q.dia === 10 ? 'UCFL204 Ø10' : 'Amarre larguero Ø9',
    [x0 + q.x, yPl, z0 + q.y], [0, s, 0], q.dia, 0, true));
  addPart(`FAB · Placa cabezal MOTRIZ PL${PL_T} ${PLM_W}×${PLM_H} (ambidiestra ×2)`, C.chapa,
    [X_TAMBOR_M, yPl, Z_PL_C], f, {
      flat: flatPlaca(PLM_W, PLM_H, PL_T, holes,
        'Acero S275JR PL6 — PINTADO RAL 7035',
        'AMBIDIESTRA — la misma placa sirve a ambos lados; portarrodamiento UCFL204 por la cara EXTERIOR'),
    });
}
// Cola/tensora: MUESCA ABIERTA del borde (carrera del tensor — muesca de
// CONTORNO, no corte interior: cumple barreno-redondo) + oreja de tornillo.
const PLT_W = 200, PLT_H = 140;
for (const s of [-1, 1]) {
  const yPl = s * (Y_LARG + PERFIL.w / 2 + PL_T / 2);
  const x0 = X_TAMBOR_T - 60, z0 = Z_PL_C - PLT_H / 2;
  // contorno con muesca abierta hacia -X (el tambor tensa ALEJÁNDOSE del motriz)
  const yr = PLT_H / 2, ab = 20.2 / 2;      // ranura abierta 20.2 (eje Ø20 con plano)
  const contorno = redondear([
    [0, yr - ab], [CARRERA_TENSADO + 30, yr - ab], [CARRERA_TENSADO + 30, yr + ab], [0, yr + ab],
    [0, PLT_H], [PLT_W, PLT_H], [PLT_W, 0], [0, 0], [0, yr - ab],
  ], rEsquina(PL_T));
  const holes = [
    { x: PLT_W - 25, y: 20, dia: 9 }, { x: PLT_W - 25, y: PLT_H - 20, dia: 9 },
    { x: PLT_W - 70, y: 20, dia: 9 }, { x: PLT_W - 70, y: PLT_H - 20, dia: 9 },
    { x: 15, y: yr + 32, dia: 8.5 },        // oreja del tornillo tensor M8
  ];
  const f = [box('Placa', [x0 + PLT_W / 2, yPl, z0 + PLT_H / 2], PLT_W, PL_T, PLT_H),
    box('Muesca carrera', [x0 + (CARRERA_TENSADO + 30) / 2, yPl, Z_PL_C], CARRERA_TENSADO + 30, PL_T + 2, 20.2, 'cut')];
  for (const q of holes) f.push(hole(q.dia === 8.5 ? 'Tornillo tensor M8' : 'Amarre larguero Ø9',
    [x0 + q.x, yPl, z0 + q.y], [0, s, 0], q.dia, 0, true));
  addPart(`FAB · Placa cabezal TENSOR PL${PL_T} ${PLT_W}×${PLT_H} — muesca de carrera ${CARRERA_TENSADO} (ambidiestra ×2)`, C.chapa,
    [x0 + PLT_W / 2, yPl, Z_PL_C], f, {
      flat: {
        contorno, cortes: { circles: holes.map(q => ({ c: [q.x, q.y], r: q.dia / 2 })), polys: [] },
        pliegues: [], etiquetas: [], pliegueInfo: [], t: PL_T, k: KCH, radio: PL_T,
        material: 'Acero S275JR PL6 — PINTADO RAL 7035',
        avisos: ['AMBIDIESTRA ×2 — muesca ABIERTA: el bloque del eje desliza y el tornillo M8 da el TENSADO (criterio vendor: screw tensioning)',
                 `CARRERA de tensado ${CARRERA_TENSADO} mm — banda PVC lazo ${LAZO} mm`],
      },
    });
}

// ═══ 4. TORNERÍA — ejes y tambores (planos_torneria_blt800 los dibuja) ═════
// EJE MOTRIZ Ø25 SAE1045: muñones Ø20 h6 (UCFL204) + extremo motor Ø14
// (reductor 120 W POR CONFIRMAR) + chavetero 6×6 bajo el tambor.
// El LARGO DERIVA de los tramos (cantidad-derivada): la lámina de tornería
// dibuja los tramos y la suma ES el eje — ninguna cifra puede discrepar.
const TRAMOS_M = [
  { d: 20, l: 30 },                          // muñón -Y
  { d: 25, l: CARA_TAMBOR + 40 },            // cuerpo bajo tambor
  { d: 20, l: 30 },                          // muñón +Y
  { d: 14, l: 40 },                          // extremo motor
];
const L_EJE_M = r2(TRAMOS_M.reduce((a, t) => a + t.l, 0));
{
  const y0 = -L_EJE_M / 2 + 20;
  const f = [
    cyl('Cuerpo Ø25', [X_TAMBOR_M, 0, Z_EJES], [0, 1, 0], 25, CARA_TAMBOR + 40),
    cyl('Muñón Ø20 h6 (-Y)', [X_TAMBOR_M, -(CARA_TAMBOR / 2 + 15 + 15), Z_EJES], [0, 1, 0], 20, 30),
    cyl('Muñón Ø20 h6 (+Y)', [X_TAMBOR_M, (CARA_TAMBOR / 2 + 15 + 15), Z_EJES], [0, 1, 0], 20, 30),
    cyl('Extremo motor Ø14 h7', [X_TAMBOR_M, (CARA_TAMBOR / 2 + 30 + 15 + 20), Z_EJES], [0, 1, 0], 14, 40),
  ];
  addPart(`FAB · EJE MOTRIZ Ø25 SAE1045 — L=${L_EJE_M} (muñones Ø20 h6 · extremo motor Ø14 h7 · chavetero 6×6)`, C.transmision,
    [X_TAMBOR_M, 0, Z_EJES], f);
}
// TAMBOR MOTRIZ: tubo Ø88.9×3 + 2 cabezales torneados; CORONA (bombé) +1 mm
// al centro TORNEADA TRAS SOLDAR (centrado de banda plana — práctica estándar).
addPart(`FAB · TAMBOR MOTRIZ Ø${D_MOTRIZ} — tubo ${D_MOTRIZ}×${T_TUBO_M} L=${CARA_TAMBOR} + 2 cabezales torneados (CORONA +1 al centro, chaveta 6×6)`, C.transmision,
  [X_TAMBOR_M, 0, Z_EJES],
  [cyl('Tubo', [X_TAMBOR_M, 0, Z_EJES], [0, 1, 0], D_MOTRIZ, CARA_TAMBOR),
   cyl('Cabezal -Y', [X_TAMBOR_M, -CARA_TAMBOR / 2 + 8, Z_EJES], [0, 1, 0], D_MOTRIZ - 2 * T_TUBO_M, 16),
   cyl('Cabezal +Y', [X_TAMBOR_M, CARA_TAMBOR / 2 - 8, Z_EJES], [0, 1, 0], D_MOTRIZ - 2 * T_TUBO_M, 16)]);
// EJE TENSOR (muerto) Ø20 con PLANOS FRESADOS 18 e/c en las puntas (calzan en
// la muesca 20.2 y NO giran) + rodamientos 6204-2RS DENTRO de los cabezales
// del tambor (patrón del rodillo de retorno LBP — plano LBP530-EJ-04).
const L_EJE_T = r2(2 * (Y_LARG + PERFIL.w / 2 + PL_T) + 2 * 25);
addPart(`FAB · EJE TENSOR muerto Ø20 SAE1045 — L=${L_EJE_T} (planos fresados 18 e/c en puntas · roscas M10 de retención)`, C.transmision,
  [X_TAMBOR_T, 0, Z_EJES],
  [cyl('Cuerpo Ø20', [X_TAMBOR_T, 0, Z_EJES], [0, 1, 0], 20, L_EJE_T)]);
addPart(`FAB · TAMBOR TENSOR Ø${D_TENSOR} — tubo ${D_TENSOR}×${T_TUBO_T} L=${CARA_TAMBOR} + 2 cabezales con asiento 6204-2RS + seeger DIN 472-47`, C.transmision,
  [X_TAMBOR_T, 0, Z_EJES],
  [cyl('Tubo', [X_TAMBOR_T, 0, Z_EJES], [0, 1, 0], D_TENSOR, CARA_TAMBOR),
   cyl('Cabezal -Y', [X_TAMBOR_T, -CARA_TAMBOR / 2 + 8, Z_EJES], [0, 1, 0], D_TENSOR - 2 * T_TUBO_T, 16),
   cyl('Cabezal +Y', [X_TAMBOR_T, CARA_TAMBOR / 2 - 8, Z_EJES], [0, 1, 0], D_TENSOR - 2 * T_TUBO_T, 16)]);

// ═══ 5. BANDA PVC (lazo calculado) + COMPRADOS ═════════════════════════════
addPart(`NORM · Banda PVC 2.0 — W${WB} × lazo ${LAZO} mm sinfín (opción vendor PVC)`, C.banda,
  [X_CAMA, 0, H_TOP - T_BANDA / 2],
  [box('Tramo superior', [X_CAMA, 0, H_TOP - T_BANDA / 2], CENTROS, WB, T_BANDA),
   box('Tramo retorno', [X_CAMA, 0, Z_EJES - D_MOTRIZ / 2 - T_BANDA / 2], CENTROS, WB, T_BANDA)]);
addPart('NORM · Motorreductor 120 W acople DIRECTO al eje (DL — criterio vendor) — marca/modelo POR CONFIRMAR', C.transmision,
  [X_TAMBOR_M, (CARA_TAMBOR / 2 + 30 + 15 + 45), Z_EJES],
  [box('Motor', [X_TAMBOR_M, (CARA_TAMBOR / 2 + 30 + 15 + 45), Z_EJES], 120, 100, 140)]);
addPart('NORM · Portarrodamiento brida 2 pernos UCFL204 Ø20 (×2)', C.tornillo,
  [X_TAMBOR_M, -(Y_LARG + PERFIL.w / 2 + PL_T + 10), Z_EJES],
  [cyl('UCFL204', [X_TAMBOR_M, -(Y_LARG + PERFIL.w / 2 + PL_T + 10), Z_EJES], [0, 1, 0], 64, 20)]);

// ═══ 6. PATAS — perfil serie 80 + partes VENDOR (envolvente declarada) ═════
const H_PATA = r2(Z_LARG_BOT - 100);
for (const xt of [200, 600]) for (const s of [-1, 1]) {
  addPart(`NORM · Perfil aluminio 4080 serie 80 — PATA L=${H_PATA} (corte a largo)`, C.estructura,
    [xt, s * Y_LARG, 100 + H_PATA / 2],
    [box('Pata', [xt, s * Y_LARG, 100 + H_PATA / 2], PERFIL.w, PERFIL.h, H_PATA)]);
  addPart('NORM · Pie nivelador M-HASTE MT800-05-301-W100 — ENVOLVENTE (geometría real: lámina MB800-MB-01)', C.vendor,
    [xt, s * Y_LARG, 50],
    [cyl('Pie envolvente', [xt, s * Y_LARG, 52], [0, 0, 1], 30, 96)]);
  addPart('NORM · Placa de pata M-HASTE MTB800-207 — ENVOLVENTE (geometría real: lámina MB800-MB-03)', C.vendor,
    [xt, s * (Y_LARG + PERFIL.h / 2 + 3), (Z_LARG_BOT + Z_LARG_BOT - 220) / 2 + 110],
    [box('Placa envolvente', [xt, s * (Y_LARG + PERFIL.h / 2 + 3), Z_LARG_BOT - 110], 250, 6, 220)]);
}

// ═══ COMPUERTAS + SELLO ════════════════════════════════════════════════════
const EXENTOS_MARGEN = [];
const DEUDA_DECLARADA = [
  { patron: /parte móvil sin cerramiento|% de su volumen fuera de toda guarda/,
    razon: 'D-10: tambores y banda SIN GUARDA en el ejemplo BLT — los nip points motriz/tensor requieren definición de guardas con Sergio (el MB800 vendor se vende abierto; DS 594 Art. 38 exige evaluación en instalación)' },
];
const uni = compuertasUniversales({ blt800: { parts } }, {
  uniones: [],
  exentosRanura: [],
  exentosEsquina: [],
  // los tambores/ejes/banda son las partes móviles: la deuda D-10 los declara
  componentesChoque: [/^NORM · /],
});
const e = [], deuda = [];
for (const msg of uni.errs) {
  const d = DEUDA_DECLARADA.find(q => q.patron.test(msg));
  (d ? deuda : e).push(d ? { msg, razon: d.razon } : msg);
}
if (deuda.length) {
  const porRazon = new Map();
  for (const d of deuda) porRazon.set(d.razon, (porRazon.get(d.razon) || 0) + 1);
  console.log('  DEUDA DECLARADA (decisión PENDIENTE de Sergio):');
  for (const [razon, n] of porRazon) console.log(`    · ${n} hallazgo(s) — ${razon}`);
}
for (const [nm, i] of Object.entries(uni.info)) {
  console.log(`  ${nm}: chapa ${i.masa_chapa_kg} kg · margen más apretado ${i.peorMargen?.margen ?? '—'} (req ${i.peorMargen?.req ?? '—'})${i.peorMargen?.exento ? ' [EXENTO]' : ''} · cobertura flats ${i.cobertura?.pct}%`);
}
if (e.length) throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - '));

// ═══ EMITIR ════════════════════════════════════════════════════════════════
const doc = {
  meta: {
    nombre: `CV-BLT-800×500 · banda plana estilo MB800 M-HASTE (ejemplo L800 W500 H750)`,
    revision: 'A', revision_causa: 'primera emisión — equipo completo de ejemplo (PRD CV-BLT §B)',
    revision_reemplaza: '—',
    capa: 'web (criterios m-haste.com citados en PRD) + user (diseño propio declarado) + user-vendor (envolventes M-HASTE)',
    origen: 'gen_blt800.mjs (paramétrico) — biblioteca/CV-BLT',
    banda: `PVC 2.0 W${WB} lazo ${LAZO} mm sinfín — opción vendor citada (m-haste.com 18-08)`,
    largo_nose_a_nose: L,
    largo_banda_lazo_mm: LAZO,
    nomenclatura_vendor: 'MB800-DL-A-L800-W500-H750-80A-S10-120M1-LA10-PVC (S y LA: supuestos DECLARADOS en PRD §D)',
    mapa_ajustes: [
      'AJUSTA · tensado: tornillo M8 sobre bloque del eje tensor — CARRERA 40 mm en muesca abierta (criterio vendor: screw tensioning)',
      'AJUSTA · pie nivelador vendor MB-01: rosca del vástago = altura fina por pata',
      'AJUSTA · uniones de perfil serie 80: posición de travesaños y patas desliza en la ranura T del perfil antes de apretar',
      'DATUM · placas cabezal→larguero: 4×Ø9 por placa fijan la posición del eje motriz (láser contra perfil)',
      'DATUM · cama→travesaños: Ø7 posicionan la cama; la cara pulida da la cota de deslizamiento',
    ],
    secciones: { aa_x: r2(L / 2), bb_y: 0.5 },
    soldadura: {
      proceso: 'GMAW (MIG) ER70S-6 Ø1.0', norma: 'AWS D1.1 — inspección visual 100%',
      uniones: [
        'Cabezales → tubo de tambor (motriz y tensor): filete 3 perimetral INTERIOR, tornear corona DESPUÉS de soldar',
        'ÚNICA soldadura del equipo: bastidor y patas van APERNADOS por interfaces del perfil serie 80 (criterio vendor: sin soldar ni taladrar)',
      ],
      nota: 'tambores balanceados estáticamente tras soldar y tornear (banda a 0-80 m/min criterio vendor)',
    },
    compuertas: sellarCompuertas(uni, {
      exenciones: EXENTOS_MARGEN,
      deuda: [...new Set(deuda.map(d => d.razon))],
      especificas: 0,
    }),
    ga: {
      proyecto: 'CV-BLT · Conveyone', boletin: '03',
      notaBanda: `banda PVC 2.0 W${WB} · lazo ${LAZO} mm — ver bom_blt800.csv`,
      numPlano: 'BLT800-GA-01',
      rotula: [
        ['Banda PVC', 'banda PVC 2.0 — tramo de carga sobre CAMA pulida y retorno libre'],
        ['Cama deslizante', 'cama AISI 304 pulida apernada M6 a travesaños'],
        ['Perfil aluminio 4080 serie 80 — LARGUERO', 'larguero perfil serie 80 — unión por interfaces del perfil (sin soldar)'],
        ['Placa cabezal MOTRIZ', 'placa cabezal motriz PL6 con UCFL204 Ø20 (ambidiestra)'],
        ['Placa cabezal TENSOR', 'placa cola PL6 — muesca de carrera 40 + tornillo tensor M8'],
        ['TAMBOR MOTRIZ', 'tambor motriz Ø88.9 con CORONA +1 (centrado de banda)'],
        ['Pie nivelador M-HASTE', 'pie nivelador vendor (geometría real: MB800-MB-01)'],
        ['Motorreductor 120 W', 'motorreductor 120 W acople directo (DL) — POR CONFIRMAR'],
      ],
      grupos: [
        ['Placa cabezal MOTRIZ', 'cabezal motriz'],
        ['TAMBOR MOTRIZ', 'tambor motriz'],
        ['Banda PVC', 'banda'],
        ['Cama deslizante', 'cama'],
        ['LARGUERO', 'bastidor'],
        ['Placa cabezal TENSOR', 'tensor'],
        ['Pie nivelador', 'pie vendor'],
      ],
    },
    manual: {
      boletin: '03', titulo: `CV-BLT-800×500 — banda plana estilo MB800`,
      accionamiento: 'Motorreductor 120 W acople DIRECTO (DL) — marca/modelo POR CONFIRMAR',
    },
    ejes: {
      motriz: {
        nombre: `EJE MOTRIZ Ø25 SAE1045 — L=${L_EJE_M}`,
        plano: 'BLT800-EJ-01',
        L: L_EJE_M, zEje: Z_EJES, x: X_TAMBOR_M,
        tramos: [
          { ...TRAMOS_M[0], label: 'MUÑÓN Ø20 h6 — asiento UCFL204 (−Y)', proc: 'torneado fino h6', color: [0.13, 0.55, 0.30], tol: 'h6' },
          { ...TRAMOS_M[1], label: `CUERPO Ø25 — zona de tambor · CHAVETERO 6×6×40 al centro`, proc: 'torneado + fresado chavetero', color: [0.62, 0.62, 0.62], chavetero: { w: 6, prof: 3.5, l: 40 } },
          { ...TRAMOS_M[2], label: 'MUÑÓN Ø20 h6 — asiento UCFL204 (+Y)', proc: 'torneado fino h6', color: [0.13, 0.55, 0.30], tol: 'h6' },
          { ...TRAMOS_M[3], label: 'EXTREMO MOTOR Ø14 h7 — entrada reductor 120 W (chaveta 5×5×25)', proc: 'torneado fino + chavetero', color: [0.16, 0.42, 0.75], tol: 'h7' },
        ],
        notas: ['Centros de torno AMBOS extremos (DIN 332-A2.5)', 'Concentricidad muñones↔cuerpo ≤0,05 TIR', 'SAE 1045 calibrado — sin tratamiento'],
      },
      tensor: {
        nombre: `EJE TENSOR muerto Ø20 SAE1045 — L=${L_EJE_T}`,
        plano: 'BLT800-EJ-02',
        L: L_EJE_T, zEje: Z_EJES, x: X_TAMBOR_T,
        tramos: [
          { d: 20, l: 25, label: 'PUNTA con PLANO FRESADO 18 e/c + rosca M10×20 de retención (−Y)', proc: 'fresado plano + rosca', color: [0.85, 0.45, 0.10] },
          { d: 20, l: L_EJE_T - 50, label: 'CUERPO Ø20 — asientos 6204-2RS en extremos (tambor gira, eje FIJO)', proc: 'torneado h6 en asientos', color: [0.62, 0.62, 0.62] },
          { d: 20, l: 25, label: 'PUNTA con PLANO FRESADO 18 e/c + rosca M10×20 de retención (+Y)', proc: 'fresado plano + rosca', color: [0.85, 0.45, 0.10] },
        ],
        notas: ['El plano fresado calza en la muesca 20.2 de la placa cola: el eje NO gira', 'Rodamientos 6204-2RS DENTRO de los cabezales del tambor (patrón LBP530-EJ-04)', 'Tensado: tornillo M8 empuja el bloque — carrera 40'],
      },
      tambor_motriz: {
        nombre: `TAMBOR MOTRIZ Ø${D_MOTRIZ}×${T_TUBO_M} — cara ${CARA_TAMBOR} con CORONA`,
        plano: 'BLT800-EJ-03',
        L: CARA_TAMBOR, d: D_MOTRIZ, t: T_TUBO_M, x: X_TAMBOR_M, zEje: Z_EJES,
        corona_mm: 1,
        notas: ['Tubo A513 Ø88.9×3 + 2 cabezales torneados soldados filete 3 interior',
                'CORONA: Ø89.9 al centro / Ø88.9 extremos — TORNEADA TRAS SOLDAR (centrado de banda)',
                'Cubo con chavetero 6×6 — monta en eje motriz Ø25', 'Balanceo estático tras tornear'],
      },
      tambor_tensor: {
        nombre: `TAMBOR TENSOR Ø${D_TENSOR}×${T_TUBO_T} — cara ${CARA_TAMBOR} loco`,
        plano: 'BLT800-EJ-04',
        L: CARA_TAMBOR, d: D_TENSOR, t: T_TUBO_T, x: X_TAMBOR_T, zEje: Z_EJES,
        corona_mm: 0,
        notas: ['Tubo A513 Ø63.5×3 + 2 cabezales con asiento de rodamiento 6204-2RS (Ø47 H7) + seeger DIN 472-47',
                'Gira LOCO sobre eje muerto Ø20 — sin chaveta', 'Asientos H7 escariados TRAS soldar'],
      },
    },
  },
  parts,
};

writeFileSync(join(here, 'blt800.json'), JSON.stringify(doc, null, 1));
const masa = uni.info.blt800?.masa_chapa_kg ?? 0;
console.log(`OK blt800.json: ${parts.length} piezas · lazo ${(LAZO / 1000).toFixed(2)} m · chapa ${masa} kg · centros ${CENTROS} mm`);
