#!/usr/bin/env node
// gen_omniwheel.mjs — MÓDULO DESVIADOR OMNIWHEEL (CV-OMW del conveyone-simulator),
// resuelto con EJES PERPENDICULARES CRUZADOS y TANGENTE DE TRANSPORTE COMÚN:
//
//   - Ejes A (AVANCE): transversales (a lo ancho, Y), ruedas omni Ø70 del
//     snapshot del usuario (omniwheel10 · Omni-Wheel.iam) → empujan en +X.
//   - Ejes B (EYECCIÓN): longitudinales (según flujo, X), ruedas omni Ø120
//     DERIVADAS de la Ø70 → empujan en ±Y.
//
//   La condición de diseño pedida: MISMA TANGENTE de transporte (todas las
//   ruedas tocan el plano Z = TANG) con CENTROS Y EJES SIN INTERFERENCIA.
//   Al ser la rueda B de mayor diámetro, su eje queda ΔZ = R_B − R_A más
//   abajo, y los ejes perpendiculares se cruzan en planta con luz vertical:
//
//       luz = ΔZ − r_ejeA − r_ejeB = (60−35) − 7.5 − 7.5 = 10 mm
//
//   El script VERIFICA (y aborta si falla) todas las condiciones de no
//   interferencia; los márgenes quedan en meta.verificaciones.
//
// Marco = módulo CV-OMW 24"×24" (609.6): X = flujo, Y = ancho, Z = arriba,
// plano de transporte Z = 170 (mismo idioma que gen_base.mjs). Uso:
//   node cad/ensambles/gen_omniwheel.mjs   → omni_modulo.json

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CAT = JSON.parse(readFileSync(join(here, '..', '..', 'componentes', 'catalogo.json'), 'utf8'));
const COMP = new Map(CAT.componentes.map(c => [c.id, c]));

// ---------------------------------------------------------------- parámetros
const IN = 25.4;
const D = {
  mod: 24 * IN,                 // 609.6 — largo y ancho del módulo (norma CV-OMW)
  tang: 170,                    // plano de transporte (marco del módulo)
  R1: 35,  W1: 38,              // rueda omni Ø70 (refinada s/ referencias web) — ejes A
  R2: 60,  W2: 46,              // rueda omni Ø120 (derivada) — ejes B (eyección)
  ejeDia: 15,                   // ejes calibrados Ø15 h6, chaveta 5×5 (ambas familias)
  luzMin: 5,                    // luz mínima admisible en cualquier cruce
  pitch: 6 * IN,                // 152.4 — paso de la retícula de contactos
  ejesA_X: [-1.5, -0.5, 0.5, 1.5].map(k => k * 6 * IN),   // ±76.2, ±228.6
  ejesB_Y: [-1, 0, 1].map(k => k * 6 * IN),               // 0, ±152.4
  ruedasA_Y: [-1.5, -0.5, 0.5, 1.5].map(k => k * 6 * IN), // 4 ruedas Ø70 por eje A
  ruedasB_X: [-1, 0, 1].map(k => k * 6 * IN),             // 3 ruedas Ø120 por eje B
  placa: 6, placaZ0: 40, placaZ1: 163,   // placas perimetrales (la tapa apoya encima)
  fondo: 5, fondoZ: 35,                  // bandeja de fondo
  tapa: 5, tapaZ0: 163,                  // TAPA portante negra: solo asoman las coronas
  holgTapa: 4,                           // holgura de las aberturas alrededor de cada rueda
  fotoX: 0.82,                           // fotocélula a 0.82·L (modo 'stop')
  // --- transmisión (motor UniDrive de biblioteca + polea síncrona ad-hoc) ---
  // Perfil MEDIDO del GLB (probe por rebanadas, marco local recentrado base Z=0):
  // eje D Ø12 en z 0..60 (punta en el ORIGEN), boza Ø36 en 60..79, cuerpo plano
  // ("pancake") en 82..119: 152.7 × 118.1 × espesor 37. Se cuelga en posición
  // pancake VERTICAL: eje D horizontal (local +Z → eje conducido), cara 152.7
  // vertical (local X), 118.1 transversal (local Y).
  motor: { id: 'cv_ZP2026__300986_std_unidrive_motor_d_shaft', bbox: [152.69, 118.12, 119.05], axial: [82, 119], shaftL: 60 },
  motorZ: -47.5,                // altura del eje D de todos los motores (da dientes enteros)
  polea: { id: 'polea_sincrona_htd5m_28t', R: 26, dp: 44.563, span: [-10.5, 22.5] }, // +X local = cubo
  correaW: 15,
  sep: 22,                       // separadores tubulares Ø22 entre ruedas (posición axial)
  brida: { dia: 35, e: 14, placa: [12, 64, 64] },  // chumacera de brida en las placas perimetrales
  bracket: { id: 'bracket_motor_unidrive_omni', plan: [56, 140] },   // origen = cara superior del ala
};
const zA = D.tang - D.R1;      // 135 — centro de ejes A
const zB = D.tang - D.R2;      // 110 — centro de ejes B

// Estaciones de transmisión (una por eje). st = coordenada de la correa sobre
// el eje conducido (Y en ejes A, X en ejes B), elegida en una VENTANA LIBRE
// entre ruedas/ejes; dir = sentido hacia el que se extiende el cuerpo del
// motor; hub = lado del cubo de la polea (local +X del componente).
const DRIVES = [
  ...D.ejesA_X.map(x => ({ fam: 'A', at: x, st: x < 0 ? -38 : 38, dir: Math.sign(x), hub: -Math.sign(x) })),
  { fam: 'B', at: -152.4, st: 44, dir: 1, hub: 1 },
  { fam: 'B', at: 152.4, st: -44, dir: -1, hub: -1 },
  { fam: 'B', at: 0, st: 260, dir: -1, hub: 1 },   // ventana exterior (tras el último eje A)
];
// Pancake vertical: mitades del cuerpo — VERTICAL (cara larga local X) y
// TRANSVERSAL (local Y); intervalo AXIAL del cuerpo respecto de la punta del
// eje D (que se coloca en la estación, sobre la polea).
const MVERT = D.motor.bbox[0] / 2, MTRAN = D.motor.bbox[1] / 2;
const bodyAxial = (d) => [d.st + d.dir * D.motor.axial[0], d.st + d.dir * D.motor.axial[1]].sort((a, b) => a - b);
const bodyCenter = (d) => d.st + d.dir * (D.motor.axial[0] + D.motor.axial[1]) / 2;

// ------------------------------------------------------------ verificaciones
const chk = {};
function gate(nombre, valor, minimo) {
  chk[nombre] = `${valor.toFixed(1)} mm (mín ${minimo})`;
  if (valor < minimo) throw new Error(`INTERFERENCIA ${nombre}: ${valor.toFixed(2)} < ${minimo}`);
}
// tangente común (por construcción; se comprueba igual)
if (zA + D.R1 !== D.tang || zB + D.R2 !== D.tang) throw new Error('tangente no común');
chk.tangente = `Z=${D.tang} común: zA+R1 = ${zA + D.R1} · zB+R2 = ${zB + D.R2}`;
// 1) cruce eje A sobre eje B: luz vertical entre superficies
gate('luz_cruce_ejes', (zA - zB) - D.ejeDia, D.luzMin);
// 2) eje A (X=±76.2…) junto al disco de la rueda B (ancho W2 en X): luz axial
gate('luz_ejeA_ruedaB', (D.pitch / 2) - D.W2 / 2 - D.ejeDia / 2, D.luzMin);
//    y si algún día el eje A pasara sobre el disco: semicuerda de la Ø120 a la
//    altura del eje A (gobernaría con pasos menores)
chk.semicuerda_B_en_zA = `${Math.sqrt(D.R2 ** 2 - (zA - zB) ** 2).toFixed(1)} mm (< ${(D.pitch / 2 - D.ejeDia / 2).toFixed(1)} disponible)`;
// 3) eje B (z=110) atraviesa la franja vertical de la rueda A (llega a z=100):
//    luz axial en Y entre eje B y cara de la rueda A
gate('luz_ejeB_ruedaA', (D.pitch / 2) - D.W1 / 2 - D.ejeDia / 2, D.luzMin);
// 4) rueda A vs rueda B en planta (gap en X entre el disco Ø120 y el Ø70)
gate('gap_planta_AB_X', (D.pitch / 2) - D.W2 / 2 - D.R1, D.luzMin);
// 5) ruedas B entre ejes vecinos (Ø120 con paso 152.4 en Y)
gate('luz_ruedaB_ruedaB', D.pitch - 2 * D.R2, D.luzMin);
// 6) rueda B sobre el fondo
gate('luz_ruedaB_fondo', (D.tang - 2 * D.R2) - (D.fondoZ + D.fondo), D.luzMin);

// --- gates de la transmisión (motores colgados bajo la bandeja) ---
// 7) correas con número ENTERO de dientes HTD 5M (paso 5) en relación 1:1
for (const [fam, zEje] of [['A', zA], ['B', zB]]) {
  const L = 2 * (zEje - D.motorZ) + Math.PI * D.polea.dp;
  const T = L / 5;
  chk[`correa_${fam}`] = `HTD 5M-${Math.round(L)}-15 (${Math.round(T)}T, C=${(zEje - D.motorZ).toFixed(1)})`;
  if (Math.abs(T - Math.round(T)) > 0.02) throw new Error(`correa ${fam}: ${T.toFixed(3)} dientes no enteros`);
}
// 8) la polea (ancho total 33 con cubo) cabe en su ventana entre ruedas y ejes
//    perpendiculares con luz ≥ 2 a cada lado
const MIN_POL = 2;
function ventana(span, obstaculos, nombre) {
  let luz = 1e9;
  for (const [lo, hi] of obstaculos) {
    if (span[0] < hi && span[1] > lo) throw new Error(`polea ${nombre}: solapa obstáculo [${lo},${hi}]`);
    luz = Math.min(luz, span[0] >= hi ? span[0] - hi : lo - span[1]);
  }
  chk[`ventana_polea_${nombre}`] = `${luz.toFixed(1)} mm (mín ${MIN_POL})`;
  if (luz < MIN_POL) throw new Error(`polea ${nombre}: luz ${luz.toFixed(2)} < ${MIN_POL}`);
}
const spanPolea = (d) => [d.st + Math.min(...D.polea.span.map(v => v * d.hub)), d.st + Math.max(...D.polea.span.map(v => v * d.hub))];
for (const d of DRIVES) {
  if (d.fam === 'A')      // obstáculos sobre el eje A: ejes B (Ø15) y ruedas Ø70 (ancho 50)
    ventana(spanPolea(d), [...D.ejesB_Y.map(y => [y - 7.5, y + 7.5]), ...D.ruedasA_Y.map(y => [y - D.W1 / 2, y + D.W1 / 2])], `A_x${d.at.toFixed(0)}`);
  else                    // obstáculos sobre el eje B: ejes A (Ø15) y ruedas Ø120 (ancho 62)
    ventana(spanPolea(d), [...D.ejesA_X.map(x => [x - 7.5, x + 7.5]), ...D.ruedasB_X.map(x => [x - D.W2 / 2, x + D.W2 / 2])], `B_y${d.at.toFixed(0)}`);
}
// 9) el disco de la polea de los ejes A (Ø52 en el plano XZ) no toca las
//    ruedas Ø120 vecinas (separación en X)
gate('gap_poleaA_ruedaB', (D.pitch / 2) - 26 - D.W2 / 2, D.luzMin);
// 10) cuerpo pancake del motor bajo la bandeja: no toca el fondo ni sale del
//     módulo, y los 7 conjuntos motor+bracket no se solapan en planta (luz ≥ 2)
gate('luz_motor_fondo', D.fondoZ - (D.motorZ + MVERT), D.luzMin);
const rects = [];
for (const d of DRIVES) {
  const c = bodyCenter(d);
  const L2 = Math.max(D.motor.axial[1] - D.motor.axial[0], D.bracket.plan[0]) / 2;
  const W2m = Math.max(MTRAN, D.bracket.plan[1] / 2);
  rects.push(d.fam === 'A'
    ? { n: `A_x${d.at.toFixed(0)}`, x: [d.at - W2m, d.at + W2m], y: [c - L2, c + L2] }
    : { n: `B_y${d.at.toFixed(0)}`, x: [c - L2, c + L2], y: [d.at - W2m, d.at + W2m] });
}
let luzMot = 1e9;
for (let i = 0; i < rects.length; i++) {
  const r = rects[i];
  if (Math.max(Math.abs(r.x[0]), Math.abs(r.x[1]), Math.abs(r.y[0]), Math.abs(r.y[1])) > D.mod / 2)
    throw new Error(`motor ${r.n} sale del módulo`);
  for (let j = i + 1; j < rects.length; j++) {
    const s = rects[j];
    const dx = Math.max(s.x[0] - r.x[1], r.x[0] - s.x[1]), dy = Math.max(s.y[0] - r.y[1], r.y[0] - s.y[1]);
    const sep = Math.max(dx, dy);
    if (sep < MIN_POL) throw new Error(`motores ${r.n} y ${s.n} se solapan en planta (sep ${sep.toFixed(1)})`);
    luzMot = Math.min(luzMot, sep);
  }
}
chk.luz_entre_motores = `${luzMot.toFixed(1)} mm (mín ${MIN_POL})`;
// 11) TAPA portante: sobre la polea más alta (la de los ejes A) y bajo la
//     tangente, con las coronas asomando por las aberturas
gate('luz_tapa_poleaA', D.tapaZ0 - (zA - D.polea.R + 52), MIN_POL);
gate('luz_tapa_tangente', D.tang - (D.tapaZ0 + D.tapa), MIN_POL);
chk.asomo_coronas = `Ø70 asoma ${(D.tang - D.tapaZ0 - D.tapa).toFixed(0)} mm por abertura de ${(2 * D.R1 + 2 * D.holgTapa).toFixed(0)}×${(D.W1 + 2 * D.holgTapa).toFixed(0)} · Ø120 por ${(D.W2 + 2 * D.holgTapa).toFixed(0)}×${(2 * D.R2 + 2 * D.holgTapa).toFixed(0)}`;

// --------------------------------------------------------------- constructor
let np = 0, nf = 0;
const fid = () => `of${++nf}`;
const parts = [];
const box = (name, at, w, d, h, color) => ({ id: fid(), name, shape: 'box', op: 'union', at, dir: [0, 0, 1], params: { w, d, h }, color });
const cyl = (name, at, dir, dia, h, color) => ({ id: fid(), name, shape: 'cylinder', op: 'union', at, dir, params: { dia, h }, color });
const part = (name, color, feats, pos = [0, 0, 0], quat = [0, 0, 0, 1], extra = {}) =>
  parts.push({ id: `op${++np}`, name, color, pos, quat, fixed: false, visible: true, features: feats, ...extra });

function compFeatures(id) {
  const c = COMP.get(id);
  if (!c) throw new Error(`componente no está en la biblioteca: ${id}`);
  return c.solidos.map(s => s.tipo === 'caja'
    ? { id: fid(), name: s.nombre, shape: 'box', op: 'union', at: [...s.at], dir: [0, 0, 1], params: { w: s.dim[0], d: s.dim[1], h: s.dim[2] }, color: s.color }
    : { id: fid(), name: s.nombre, shape: 'cylinder', op: 'union', at: [...s.at], dir: s.eje || [0, 0, 1], params: { dia: s.dia, h: s.alto }, color: s.color });
}
function placeComp(nombre, id, pos, quat = [0, 0, 0, 1]) {
  const c = COMP.get(id);
  parts.push({ id: `op${++np}_${id}`, name: `${nombre} · ${c.nombre}`, biblioteca: id, color: '#1976d2', pos, quat, fixed: false, visible: true, base_ref: true, features: compFeatures(id) });
}
const Q_XtoY = [0, 0, Math.SQRT1_2, Math.SQRT1_2]; // eje local X → Y (ruedas de avance)

// pieza de MALLA REAL de la biblioteca (GLB del ZP2026): el visor fusiona la
// instancia del nodo y la recentra XY con base en Z=0 (eje del motor según X)
function placeMesh(nombre, compId, pos, quat = [0, 0, 0, 1], color = '#37474f') {
  const c = COMP.get(compId);
  if (!c || !c.malla) throw new Error(`componente de malla no está en la biblioteca: ${compId}`);
  parts.push({
    id: `op${++np}_${compId}`, name: `${nombre} · ${c.nombre}`, biblioteca: compId, componente: compId,
    color, pos, quat, fixed: false, visible: true,
    features: [{ id: fid(), name: `Malla · ${c.nombre}`, shape: 'mesh', op: 'mesh', at: [0, 0, 0], dir: [0, 0, 1], params: { src: c.malla.glb, nodo: c.malla.nodo, bbox: c.bbox_mm } }],
  });
}

const C = { placa: '#212121', fondo: '#263238', tapa: '#1a1d21', eje: '#b0bec5', chum: '#455a64', sep: '#546e7a', motor: '#37474f', correa: '#111111', foto: '#c62828', rodillo: '#1e63c0', plato: '#b9c2c9', cubo: '#6d777f', pin: '#dfe5ea' };
const H = D.mod / 2;

// ---- RUEDA OMNI TORNEADA (revoluciones de boceto: superficie continua) ----
// Rodillos = revolución del ARCO de la envolvente (barril abombado exacto,
// r(t) = √(R²−t²) − rc) y cubo/platos = perfil torneado con chaflanes.
let nsk = 0;
const mkLine = (a, b) => ({ id: `sk${++nsk}`, type: 'line', a, b });
const mkArc = (c, r, a0, a1) => ({ id: `sk${++nsk}`, type: 'arc', c, r, a0, a1 });
const mkCircle = (c, r) => ({ id: `sk${++nsk}`, type: 'circle', c, r });
const revolve = (name, at, dir, u, entities, color) =>
  ({ id: fid(), name, shape: 'revolve', op: 'union', at, dir, params: { entities, dims: [], axis: { a: [0, 0], b: [1, 0] }, u, angle: 360 }, color });
// contorno cerrado por puntos (líneas)
const poly = (pts) => pts.map((p, i) => mkLine(p, pts[(i + 1) % pts.length]));

// Referencias de construcción real (ver docs/OMNIWHEEL_MODULO.md § Referencias):
// Nexus 14073 (Ø127 doble aluminio): 22 rodillos (11/corona) Ø19 de goma con
// rodamiento, 2 placas de aluminio, ancho total 29 — MUCHOS rodillos DELGADOS
// y rueda ANGOSTA. Rotacaster: cuerpo araña (web-like), no discos llenos.
// → coronas de 8/12 rodillos finos, placas exteriores FESTONEADAS de aluminio
//   con pernos pasantes entre rodillos, y ancho total 38/46.
function ruedaTorneada(nombre, biblioteca, pos, quat, P) {
  // P: {R, rrod, nrod, Lrod, rHub, rPlato, ePlato, wMid, chaflan}
  const rc = P.R - P.rrod;
  const half = P.wMid / 2 + 2 * P.rrod + P.ePlato;   // semiancho total
  const fe = [];
  const ch = P.chaflan;
  // cubo torneado + disco central (perfil de revolución con chaflanes)
  fe.push(revolve(`Cubo torneado Ø${2 * P.rHub}`, [0, 0, P.R], [0, 1, 0], [1, 0, 0],
    poly([[-half, 8], [half, 8], [half, P.rHub - ch], [half - ch, P.rHub], [-half + ch, P.rHub], [-half, P.rHub - ch]]), C.cubo));
  fe.push(revolve(`Disco central Ø${2 * P.rPlato}`, [0, 0, P.R], [0, 1, 0], [1, 0, 0],
    poly([[-P.wMid / 2, P.rHub], [P.wMid / 2, P.rHub], [P.wMid / 2, P.rPlato - ch], [P.wMid / 2 - ch, P.rPlato], [-P.wMid / 2 + ch, P.rPlato], [-P.wMid / 2, P.rPlato - ch]]), C.plato));
  // barril: arco exacto de la envolvente
  const hL = P.Lrod / 2;
  const yE = Math.sqrt(P.R ** 2 - hL ** 2) - rc;
  const aR = Math.acos(hL / P.R);
  const paso = 360 / P.nrod;
  const rowOff = { '-1': 0, 1: paso / 2 };
  // placas exteriores FESTONEADAS (boceto extruido): valles en los ángulos de
  // los rodillos de SU corona (el barril asoma por la escotadura) y lóbulos
  // entre rodillos con perno pasante
  const rv = yE + 1.2;                                // radio de la escotadura
  const gam = Math.acos((rc ** 2 + P.rPlato ** 2 - rv ** 2) / (2 * rc * P.rPlato)); // semiapertura del valle
  for (const s of [-1, 1]) {
    const ents = [];
    for (let k = 0; k < P.nrod; k++) {
      const tv = (rowOff[s] + k * paso) * Math.PI / 180;            // ángulo del valle
      const tn = (rowOff[s] + (k + 1) * paso) * Math.PI / 180;      // valle siguiente
      const vk = [rc * Math.cos(tv), rc * Math.sin(tv)];
      const A = [P.rPlato * Math.cos(tv - gam), P.rPlato * Math.sin(tv - gam)];
      const B = [P.rPlato * Math.cos(tv + gam), P.rPlato * Math.sin(tv + gam)];
      let a = Math.atan2(A[1] - vk[1], A[0] - vk[0]), b = Math.atan2(B[1] - vk[1], B[0] - vk[0]);
      if (((b - a) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) > Math.PI) [a, b] = [b, a];
      ents.push(mkArc(vk, rv, a, b));                               // escotadura del rodillo
      ents.push(mkArc([0, 0], P.rPlato, tv + gam, tn - gam));       // lóbulo entre rodillos
    }
    ents.push(mkCircle([0, 0], P.rHub + 0.5));                      // agujero central (anillo)
    const x0 = s < 0 ? -half : half - P.ePlato;
    fe.push({ id: fid(), name: `Placa festoneada Ø${2 * P.rPlato}`, shape: 'sketch', op: 'union', at: [x0, 0, P.R], dir: [1, 0, 0], params: { entities: ents, dims: [], h: P.ePlato, side: 'pos', u: [0, 1, 0] }, color: C.plato });
    // pernos pasantes en los lóbulos (referencia: placas apernadas entre rodillos)
    for (let k = 0; k < P.nrod; k++) {
      const fm = (rowOff[s] + (k + 0.5) * paso) * Math.PI / 180;
      fe.push(cyl('Perno M4', [s * half, (rc - 1) * Math.sin(fm), P.R + (rc - 1) * Math.cos(fm)], [s, 0, 0], 6, 2.5, C.pin));
    }
  }
  // rodillos finos abombados + pasadores
  for (const [s, off] of [[-1, 0], [1, paso / 2]]) {
    const xRow = s * (P.wMid / 2 + P.rrod);
    for (let k = 0; k < P.nrod; k++) {
      const ph = (off + k * paso) * Math.PI / 180;
      const cRod = [xRow, rc * Math.sin(ph), P.R + rc * Math.cos(ph)];
      const tHat = [0, Math.cos(ph), -Math.sin(ph)];
      const ents = [
        mkLine([-hL, 1.4], [hL, 1.4]), mkLine([hL, 1.4], [hL, yE]),
        mkArc([0, -rc], P.R, aR, Math.PI - aR), mkLine([-hL, yE], [-hL, 1.4]),
      ];
      fe.push(revolve(`Rodillo barril Ø${2 * P.rrod}`, cRod, [1, 0, 0], tHat, ents, C.rodillo));
      const Lp = P.Lrod + 6;
      fe.push(cyl('Pasador Ø4', [cRod[0], cRod[1] - tHat[1] * Lp / 2, cRod[2] - tHat[2] * Lp / 2], tHat, 4, Lp, C.pin));
    }
  }
  parts.push({ id: `op${++np}_rt`, name: nombre, biblioteca, componente: biblioteca, color: C.rodillo, pos, quat, fixed: false, visible: true, base_ref: true, features: fe });
}
const RT70 = { R: 35, rrod: 7, nrod: 8, Lrod: 16, rHub: 15, rPlato: 27.5, ePlato: 3, wMid: 4, chaflan: 1.2 };
const RT120 = { R: 60, rrod: 9, nrod: 12, Lrod: 22, rHub: 22, rPlato: 47, ePlato: 3, wMid: 4, chaflan: 1.5 };

// bastidor: bandeja (con RANURAS de paso de correa por estación) + 4 placas
// perimetrales (con pasadas Ø16 de los ejes) + TAPA portante con aberturas
const fondoFeats = [box('Fondo 609.6×609.6×5', [0, 0, D.fondoZ], D.mod, D.mod, D.fondo, C.fondo)];
for (const d of DRIVES) {
  const at = d.fam === 'A' ? [d.at, d.st, D.fondoZ - 1] : [d.st, d.at, D.fondoZ - 1];
  const [w, dd] = d.fam === 'A' ? [56, D.correaW + 4] : [D.correaW + 4, 56];
  fondoFeats.push({ id: fid(), name: `Ranura de correa ${d.fam} ${d.at.toFixed(0)}`, shape: 'box', op: 'cut', at, dir: [0, 0, 1], params: { w, d: dd, h: D.fondo + 2 } });
}
part('Bandeja de fondo', C.fondo, fondoFeats);
for (const s of [-1, 1]) {
  const fy = [box(`Placa 609.6×${D.placa}×${D.placaZ1 - D.placaZ0}`, [0, s * (H - D.placa / 2), D.placaZ0], D.mod, D.placa, D.placaZ1 - D.placaZ0, C.placa)];
  for (const x of D.ejesA_X) fy.push({ id: fid(), name: `Pasada eje A Ø${D.ejeDia + 1}`, shape: 'cylinder', op: 'cut', at: [x, s * (H - D.placa) - (s > 0 ? 1 : 0), zA], dir: [0, 1, 0], params: { dia: D.ejeDia + 1, h: D.placa + 2 } });
  part(`Placa lateral Y${s > 0 ? '+' : '-'}`, C.placa, fy);
  const fx = [box(`Placa ${D.placa}×${D.mod - 2 * D.placa}×${D.placaZ1 - D.placaZ0}`, [s * (H - D.placa / 2), 0, D.placaZ0], D.placa, D.mod - 2 * D.placa, D.placaZ1 - D.placaZ0, C.placa)];
  for (const y of D.ejesB_Y) fx.push({ id: fid(), name: `Pasada eje B Ø${D.ejeDia + 1}`, shape: 'cylinder', op: 'cut', at: [s * (H - D.placa) - (s > 0 ? 1 : 0), y, zB], dir: [1, 0, 0], params: { dia: D.ejeDia + 1, h: D.placa + 2 } });
  part(`Placa frontal X${s > 0 ? '+' : '-'}`, C.placa, fx);
}
// TAPA portante: cuerpo cerrado negro mate — por fuera solo asoma la corona
// de las ruedas (docs/omniwheel.md del simulador)
const tapaFeats = [box(`Tapa 609.6×609.6×${D.tapa}`, [0, 0, D.tapaZ0], D.mod, D.mod, D.tapa, C.tapa)];
for (const x of D.ejesA_X) for (const y of D.ruedasA_Y)
  tapaFeats.push({ id: fid(), name: 'Abertura rueda Ø70', shape: 'box', op: 'cut', at: [x, y, D.tapaZ0 - 1], dir: [0, 0, 1], params: { w: 2 * D.R1 + 2 * D.holgTapa, d: D.W1 + 2 * D.holgTapa, h: D.tapa + 2 } });
for (const y of D.ejesB_Y) for (const x of D.ruedasB_X)
  tapaFeats.push({ id: fid(), name: 'Abertura rueda Ø120', shape: 'box', op: 'cut', at: [x, y, D.tapaZ0 - 1], dir: [0, 0, 1], params: { w: D.W2 + 2 * D.holgTapa, d: 2 * D.R2 + 2 * D.holgTapa, h: D.tapa + 2 } });
part('Tapa portante (aberturas de coronas)', C.tapa, tapaFeats);

// eje DETALLADO: eje calibrado Ø15 pasante + chumaceras de BRIDA en las placas
// (placa cuadrada + boza) + SEPARADORES tubulares Ø22 que fijan la posición
// axial de ruedas y polea sobre el eje
function ejeParte(tag, fam, at, zEje, ruedas, halfW) {
  const drv = DRIVES.find((d) => d.fam === fam && d.at === at);
  const inner = H - D.placa;                       // cara interior de la placa
  const uvw = (u, z = zEje) => fam === 'A' ? [at, u, z] : [u, at, z];
  const dirEje = fam === 'A' ? [0, 1, 0] : [1, 0, 0];
  const fe = [cyl(`Eje Ø${D.ejeDia}×${D.mod} h6 (chaveta 5×5)`, uvw(-H), dirEje, D.ejeDia, D.mod, C.eje)];
  const tBr = 12, ladoBr = fam === 'A' ? 52 : 64;  // placa de brida (bajo la tapa en ejes A)
  for (const s of [-1, 1]) {
    const uc = s * (inner - tBr / 2);              // centro de la placa de brida
    fe.push(fam === 'A'
      ? box('Placa de brida', [at, uc, zEje - ladoBr / 2], ladoBr, tBr, ladoBr, C.chum)
      : box('Placa de brida', [uc, at, zEje - ladoBr / 2], tBr, ladoBr, ladoBr, C.chum));
    fe.push(cyl(`Boza de rodamiento Ø${D.brida.dia}`, uvw(s > 0 ? inner - tBr - D.brida.e : -inner + tBr), dirEje, D.brida.dia, D.brida.e, C.chum));
  }
  // separadores en los tramos libres entre ruedas / polea / bridas
  const occ = ruedas.map((c) => [c - halfW, c + halfW]);
  if (drv) occ.push(spanPolea(drv));
  occ.sort((a, b) => a[0] - b[0]);
  let u = -(inner - tBr - D.brida.e);
  for (const [lo, hi] of [...occ, [inner - tBr - D.brida.e, inner]]) {
    if (lo - u >= 8) fe.push(cyl(`Separador Ø${D.sep}×${(lo - u).toFixed(0)}`, uvw(u), dirEje, D.sep, lo - u, C.sep));
    u = Math.max(u, hi);
  }
  part(tag, C.eje, fe);
}
for (const x of D.ejesA_X) {
  ejeParte(`Eje A (avance) x=${x.toFixed(1)}`, 'A', x, zA, D.ruedasA_Y, D.W1 / 2);
  for (const y of D.ruedasA_Y) ruedaTorneada(`Rueda avance Ø70 torneada (${x.toFixed(0)},${y.toFixed(0)})`, 'rueda_omni_70_doble', [x, y, D.tang - 2 * D.R1], Q_XtoY, RT70);
}
for (const y of D.ejesB_Y) {
  ejeParte(`Eje B (eyección) y=${y.toFixed(1)}`, 'B', y, zB, D.ruedasB_X, D.W2 / 2);
  for (const x of D.ruedasB_X) ruedaTorneada(`Rueda eyección Ø120 torneada (${x.toFixed(0)},${y.toFixed(0)})`, 'rueda_omni_120_doble', [x, y, D.tang - 2 * D.R2], [0, 0, 0, 1], RT120);
}

// transmisión por eje: motor UniDrive DE BIBLIOTECA (malla real del ZP2026)
// colgado bajo la bandeja en bracket estilo ZP2026 + polea síncrona HTD 5M 28T
// ad-hoc en eje y motor (1:1) + correa por la ranura de la bandeja
const QZ = (deg) => [0, 0, Math.sin(deg * Math.PI / 360), Math.cos(deg * Math.PI / 360)];
// cuaternión que lleva la base local (X,Y,Z) a las columnas dadas (ortonormales)
function quatBasis(cx, cy, cz) {
  const m = [cx[0], cy[0], cz[0], cx[1], cy[1], cz[1], cx[2], cy[2], cz[2]];
  const tr = m[0] + m[4] + m[8];
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; return [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4]; }
  if (m[0] > m[4] && m[0] > m[8]) { const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; return [s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s]; }
  if (m[4] > m[8]) { const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; return [(m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s, (m[2] - m[6]) / s]; }
  const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; return [(m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4, (m[3] - m[1]) / s];
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
for (const d of DRIVES) {
  const zEje = d.fam === 'A' ? zA : zB;
  const Cc = zEje - D.motorZ;                                   // distancia entre centros
  const pt = (u, v) => d.fam === 'A' ? [v, u, 0] : [u, v, 0];   // (según eje, transversal) → XY
  // polea: local +X del componente → lado del cubo sobre el eje real
  const qAxis = (sign) => d.fam === 'A' ? QZ(sign > 0 ? 90 : -90) : (sign > 0 ? [0, 0, 0, 1] : QZ(180));
  const tag = d.fam === 'A' ? `eje A x=${d.at.toFixed(0)}` : `eje B y=${d.at.toFixed(0)}`;
  const [px, py] = pt(d.st, d.at);
  placeComp(`Polea conducida ${tag}`, D.polea.id, [px, py, zEje - D.polea.R], qAxis(d.hub));
  placeComp(`Polea motriz ${tag}`, D.polea.id, [px, py, D.motorZ - D.polea.R], qAxis(d.hub));
  // motor pancake VERTICAL: punta del eje D (origen local) en la estación, a
  // la altura del eje motriz; local +Z → eje conducido (hacia el cuerpo),
  // local +X → vertical (cara 152.7 de pie), local +Y → transversal
  const axis = d.fam === 'A' ? [0, d.dir, 0] : [d.dir, 0, 0];
  const qMotor = quatBasis([0, 0, 1], cross(axis, [0, 0, 1]), axis);
  placeMesh(`Motor ${tag}`, D.motor.id, [px, py, D.motorZ], qMotor);
  // bracket mordaza (origen = cara superior del ala, bajo la bandeja)
  const [mx, my] = pt(bodyCenter(d), d.at);
  placeComp(`Bracket motor ${tag}`, D.bracket.id, [mx, my, D.fondoZ], d.fam === 'A' ? QZ(90) : [0, 0, 0, 1]);
  // correa (lazo simplificado); el eje D REAL del motor llega hasta la polea
  part(`Transmisión ${tag}`, C.correa, [
    { id: fid(), name: `Correa HTD 5M-${Math.round(2 * Cc + Math.PI * D.polea.dp)}-15`, shape: 'box', op: 'union', at: [px, py, D.motorZ], dir: [0, 0, 1], params: { w: d.fam === 'A' ? 52 : D.correaW, d: d.fam === 'A' ? D.correaW : 52, h: Cc }, color: C.correa },
  ]);
}

// fotocélula del modo 'stop' a 0.82·L (doc omniwheel.md del simulador)
const fx = -H + D.fotoX * D.mod;
part('Fotocélula S1 (modo stop)', C.foto, [
  box('Poste', [fx, -(H - D.placa - 8), D.tapaZ0 + D.tapa], 10, 10, D.tang + 18 - D.tapaZ0 - D.tapa, C.placa),
  box('Fotocélula', [fx, -(H - D.placa - 8), D.tang + 8], 16, 22, 34, C.foto),
]);

// ------------------------------------------------------------------- salida
const metrics = {
  modulo: `24"×24" (${D.mod}×${D.mod}), tangente Z=${D.tang}`,
  ruedas: `${D.ejesA_X.length * D.ruedasA_Y.length}× Ø70 avance + ${D.ejesB_Y.length * D.ruedasB_X.length}× Ø120 eyección`,
  ejes: `${D.ejesA_X.length} ejes A Ø15 (Y, z=${zA}) + ${D.ejesB_Y.length} ejes B Ø15 (X, z=${zB}) — cruzados con luz ${(zA - zB - D.ejeDia).toFixed(0)} mm`,
  contactos: `retícula 6" (152.4): avance 4×4 intercalada con eyección 3×3 (tresbolillo, contacto más próximo ${(D.pitch / Math.SQRT2).toFixed(1)} mm)`,
  motores: `${D.ejesA_X.length + D.ejesB_Y.length} UniDrive pancake (malla ${D.motor.id}) + 1 adicional (BOM CV-OMW); 14 poleas HTD 5M 28T; correas ${D.ejesA_X.length}× 5M-${Math.round(2 * (zA - D.motorZ) + Math.PI * D.polea.dp)}-15 + ${D.ejesB_Y.length}× 5M-${Math.round(2 * (zB - D.motorZ) + Math.PI * D.polea.dp)}-15; 7 brackets mordaza estilo ZP2026`,
  ...chk,
};
const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Módulo desviador Omniwheel CV-OMW — ejes perpendiculares, tangente común',
    capa: 'user',
    origen: 'gen_omniwheel.mjs (paramétrico). Ruedas: rueda_omni_70_doble (snapshot Inventor del usuario, omniwheel10) y rueda_omni_120_doble (derivada mayor). La familia de EYECCIÓN usa la rueda MAYOR: con tangente común su eje queda ΔZ=25 más abajo y los ejes perpendiculares se cruzan en planta sin tocarse (luz 10 mm entre ejes Ø15).',
    anfitrion: 'CV-OMW del conveyone-simulator (docs/omniwheel.md): módulo 24"×24" inserto EN LÍNEA; lógicas dyn 30° / stop 90° con fotocélula a 0.82·L; 1 motor UniDrive 60 W por fila + 1 adicional, correa síncrona interior; 24 VDC.',
    integracion: 'se acopla en línea como un transportador (entrada connIn / salida en cadena); salidas laterales outL/outR según configuración. El plano de transporte Z=170 es el del marco del módulo (mismo idioma que base_sorter).',
    tolerancias: {
      ejes: 'ejes calibrados Ø15 h6 pasantes, chaveta DIN 6885 5×5 bajo cada rueda, chumaceras de brida en las placas perimetrales; familias a Z distinta (135/110): en los 12 cruces de planta la luz entre superficies de eje es 10 mm.',
      ruedas: 'rodillos reales ABOMBADOS (perfil torneado al radio de rodadura) para envolvente continua; en el modelo primitivo son cilindros y la envolvente de la Ø120 excede 0.8 mm radiales en los extremos de rodillo — desaparece con el abombado.',
      transmision: 'motor UniDrive DE BIBLIOTECA (cv_ZP2026__300986_std_unidrive_motor_d_shaft, malla real del ZP2026) por eje, COLGADO BAJO LA BANDEJA en bracket de chapa 4 mm estilo ZP2026 (bracket_motor_unidrive_omni, colisas Ø9×20 para tensar); polea síncrona ad-hoc HTD 5M 28T (polea_sincrona_htd5m_28t) en el eje y en el eje D del motor, relación 1:1; correas HTD 5M-475-15 (95T, ejes A, C=167.5) y 5M-425-15 (85T, ejes B, C=142.5) pasando por RANURAS de 56×19 en la bandeja. Todos los ejes de motor a Z=−32.5. La altura del eje D del motor se asume al centro de la sección 118×119 del GLB — VERIFICAR; las colisas del bracket absorben la diferencia.',
    },
    verificaciones: metrics,
  },
  parts,
  constraints: [],
};
writeFileSync(join(here, 'omni_modulo.json'), JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas, ${nf} funciones → omni_modulo.json`);
for (const [k, v] of Object.entries(metrics)) console.log(`   ${k}: ${v}`);
