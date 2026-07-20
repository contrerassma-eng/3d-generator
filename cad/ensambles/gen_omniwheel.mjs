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
  R1: 35,  W1: 50,              // rueda omni Ø70 (snapshot) — ejes A (avance)
  R2: 60,  W2: 62,              // rueda omni Ø120 (derivada) — ejes B (eyección)
  ejeDia: 15,                   // ejes calibrados Ø15 h6, chaveta 5×5 (ambas familias)
  luzMin: 5,                    // luz mínima admisible en cualquier cruce
  pitch: 6 * IN,                // 152.4 — paso de la retícula de contactos
  ejesA_X: [-1.5, -0.5, 0.5, 1.5].map(k => k * 6 * IN),   // ±76.2, ±228.6
  ejesB_Y: [-1, 0, 1].map(k => k * 6 * IN),               // 0, ±152.4
  ruedasA_Y: [-1.5, -0.5, 0.5, 1.5].map(k => k * 6 * IN), // 4 ruedas Ø70 por eje A
  ruedasB_X: [-1, 0, 1].map(k => k * 6 * IN),             // 3 ruedas Ø120 por eje B
  placa: 6, placaZ0: 40, placaZ1: 168,   // placas perimetrales (top 2 bajo tangente)
  fondo: 5, fondoZ: 35,                  // bandeja de fondo
  chum: [42, 22, 42],                    // chumacera/soporte de eje (caja)
  fotoX: 0.82,                           // fotocélula a 0.82·L (modo 'stop')
  // --- transmisión (motor UniDrive de biblioteca + polea síncrona ad-hoc) ---
  motor: { id: 'cv_ZP2026__300986_std_unidrive_motor_d_shaft', bbox: [152.69, 118.12, 119.05] },
  motorShaftZ: 59.5,            // eje del motor al centro de la sección 118×119 (VERIFICAR vs GLB)
  motorZ: -32.5,                // altura del eje de todos los motores (colgados bajo la bandeja)
  polea: { id: 'polea_sincrona_htd5m_28t', R: 26, dp: 44.563, span: [-10.5, 22.5] }, // +X local = cubo
  correaW: 15, stubDia: 12,
  bracket: { id: 'bracket_motor_unidrive_omni', plan: [150, 136] },   // origen = cara superior del ala
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
const MLEN = D.motor.bbox[0], MWID = D.motor.bbox[1], MHIG = D.motor.bbox[2];
const BODY_GAP = 33;                                  // polea + stub de eje D entre estación y cuerpo
const bodyCenter = (d) => d.st + d.dir * (BODY_GAP + MLEN / 2);

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
// 10) cuerpo del motor bajo la bandeja: no toca el fondo ni sale del módulo,
//     y los 7 conjuntos motor+bracket no se solapan en planta (luz ≥ 2)
gate('luz_motor_fondo', D.fondoZ - (D.motorZ - D.motorShaftZ + MHIG), D.luzMin);
const rects = [];
for (const d of DRIVES) {
  const c = bodyCenter(d), L2 = Math.max(MLEN, D.bracket.plan[0]) / 2, W2m = Math.max(MWID, D.bracket.plan[1]) / 2;
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

const C = { placa: '#212121', fondo: '#263238', eje: '#b0bec5', chum: '#455a64', motor: '#37474f', correa: '#111111', foto: '#c62828' };
const H = D.mod / 2;

// bastidor: bandeja (con RANURAS de paso de correa por estación) + 4 placas
const fondoFeats = [box('Fondo 609.6×609.6×5', [0, 0, D.fondoZ], D.mod, D.mod, D.fondo, C.fondo)];
for (const d of DRIVES) {
  const at = d.fam === 'A' ? [d.at, d.st, D.fondoZ - 1] : [d.st, d.at, D.fondoZ - 1];
  const [w, dd] = d.fam === 'A' ? [56, D.correaW + 4] : [D.correaW + 4, 56];
  fondoFeats.push({ id: fid(), name: `Ranura de correa ${d.fam} ${d.at.toFixed(0)}`, shape: 'box', op: 'cut', at, dir: [0, 0, 1], params: { w, d: dd, h: D.fondo + 2 } });
}
part('Bandeja de fondo', C.fondo, fondoFeats);
for (const s of [-1, 1]) {
  part(`Placa lateral Y${s > 0 ? '+' : '-'}`, C.placa,
    [box(`Placa 609.6×${D.placa}×${D.placaZ1 - D.placaZ0}`, [0, s * (H - D.placa / 2), D.placaZ0], D.mod, D.placa, D.placaZ1 - D.placaZ0, C.placa)]);
  part(`Placa frontal X${s > 0 ? '+' : '-'}`, C.placa,
    [box(`Placa ${D.placa}×${D.mod - 2 * D.placa}×${D.placaZ1 - D.placaZ0}`, [s * (H - D.placa / 2), 0, D.placaZ0], D.placa, D.mod - 2 * D.placa, D.placaZ1 - D.placaZ0, C.placa)]);
}

// ejes A (avance): Ø15 a lo ancho (Y), z=135, con chumaceras en las placas Y±
for (const x of D.ejesA_X) {
  const fe = [cyl(`Eje A Ø${D.ejeDia}×${D.mod}`, [x, -H, zA], [0, 1, 0], D.ejeDia, D.mod, C.eje)];
  for (const s of [-1, 1]) fe.push(box('Chumacera eje A', [x, s * (H - D.placa - D.chum[1] / 2), zA - D.chum[2] / 2], D.chum[0], D.chum[1], D.chum[2], C.chum));
  part(`Eje A (avance) x=${x.toFixed(1)}`, C.eje, fe);
  for (const y of D.ruedasA_Y) placeComp(`Rueda avance Ø70 (${x.toFixed(0)},${y.toFixed(0)})`, 'rueda_omni_70_doble', [x, y, D.tang - 2 * D.R1], Q_XtoY);
}

// ejes B (eyección): Ø15 según flujo (X), z=110, chumaceras en placas X±
for (const y of D.ejesB_Y) {
  const fe = [cyl(`Eje B Ø${D.ejeDia}×${D.mod}`, [-H, y, zB], [1, 0, 0], D.ejeDia, D.mod, C.eje)];
  for (const s of [-1, 1]) fe.push(box('Chumacera eje B', [s * (H - D.placa - D.chum[1] / 2), y, zB - D.chum[2] / 2], D.chum[1], D.chum[0], D.chum[2], C.chum));
  part(`Eje B (eyección) y=${y.toFixed(1)}`, C.eje, fe);
  for (const x of D.ruedasB_X) placeComp(`Rueda eyección Ø120 (${x.toFixed(0)},${y.toFixed(0)})`, 'rueda_omni_120_doble', [x, y, D.tang - 2 * D.R2]);
}

// transmisión por eje: motor UniDrive DE BIBLIOTECA (malla real del ZP2026)
// colgado bajo la bandeja en bracket estilo ZP2026 + polea síncrona HTD 5M 28T
// ad-hoc en eje y motor (1:1) + correa por la ranura de la bandeja
const QZ = (deg) => [0, 0, Math.sin(deg * Math.PI / 360), Math.cos(deg * Math.PI / 360)];
for (const d of DRIVES) {
  const zEje = d.fam === 'A' ? zA : zB;
  const Cc = zEje - D.motorZ;                                   // distancia entre centros
  const bc = bodyCenter(d);
  const pt = (u, v) => d.fam === 'A' ? [v, u, 0] : [u, v, 0];   // (coord. según eje, transversal) → XY
  // cuaterniones: local +X del componente → dirección del cubo (polea) o del
  // extremo de eje del motor (−dir) en el eje real (Y en fam A, X en fam B)
  const qAxis = (sign) => d.fam === 'A' ? QZ(sign > 0 ? 90 : -90) : (sign > 0 ? [0, 0, 0, 1] : QZ(180));
  const tag = d.fam === 'A' ? `eje A x=${d.at.toFixed(0)}` : `eje B y=${d.at.toFixed(0)}`;
  // poleas conducida (sobre el eje) y motriz (sobre el eje D del motor)
  const [px, py] = pt(d.st, d.at);
  placeComp(`Polea conducida ${tag}`, D.polea.id, [px, py, zEje - D.polea.R], qAxis(d.hub));
  placeComp(`Polea motriz ${tag}`, D.polea.id, [px, py, D.motorZ - D.polea.R], qAxis(d.hub));
  // motor de biblioteca (bbox 152.7×118.1×119, recentrado XY / base Z=0)
  const [mx, my] = pt(bc, d.at);
  placeMesh(`Motor ${tag}`, D.motor.id, [mx, my, D.motorZ - D.motorShaftZ], qAxis(-d.dir));
  // bracket colgante (origen = cara superior del ala, bajo la bandeja)
  placeComp(`Bracket motor ${tag}`, D.bracket.id, [mx, my, D.fondoZ], d.fam === 'A' ? QZ(90) : [0, 0, 0, 1]);
  // correa (lazo simplificado) + stub del eje D del motor hasta la polea
  const dirEje = d.fam === 'A' ? [0, 1, 0] : [1, 0, 0];
  part(`Transmisión ${tag}`, C.correa, [
    { id: fid(), name: `Correa HTD 5M-${Math.round(2 * Cc + Math.PI * D.polea.dp)}-15`, shape: 'box', op: 'union', at: [px, py, D.motorZ], dir: [0, 0, 1], params: { w: d.fam === 'A' ? 52 : D.correaW, d: d.fam === 'A' ? D.correaW : 52, h: Cc }, color: C.correa },
    cyl(`Eje D del motor Ø${D.stubDia}`, [px, py, D.motorZ], dirEje.map(v => v * d.dir), D.stubDia, BODY_GAP, C.eje),
  ]);
}

// fotocélula del modo 'stop' a 0.82·L (doc omniwheel.md del simulador)
const fx = -H + D.fotoX * D.mod;
part('Fotocélula S1 (modo stop)', C.foto, [
  box('Poste', [fx, -(H - D.placa - 8), D.placaZ1], 10, 10, D.tang + 18 - D.placaZ1, C.placa),
  box('Fotocélula', [fx, -(H - D.placa - 8), D.tang + 8], 16, 22, 34, C.foto),
]);

// ------------------------------------------------------------------- salida
const metrics = {
  modulo: `24"×24" (${D.mod}×${D.mod}), tangente Z=${D.tang}`,
  ruedas: `${D.ejesA_X.length * D.ruedasA_Y.length}× Ø70 avance + ${D.ejesB_Y.length * D.ruedasB_X.length}× Ø120 eyección`,
  ejes: `${D.ejesA_X.length} ejes A Ø15 (Y, z=${zA}) + ${D.ejesB_Y.length} ejes B Ø15 (X, z=${zB}) — cruzados con luz ${(zA - zB - D.ejeDia).toFixed(0)} mm`,
  contactos: `retícula 6" (152.4): avance 4×4 intercalada con eyección 3×3 (tresbolillo, contacto más próximo ${(D.pitch / Math.SQRT2).toFixed(1)} mm)`,
  motores: `${D.ejesA_X.length + D.ejesB_Y.length} UniDrive (malla ${D.motor.id}) + 1 adicional (BOM CV-OMW); 14 poleas HTD 5M 28T; correas 4× 5M-475-15 + 3× 5M-425-15; 7 brackets colgantes estilo ZP2026`,
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
