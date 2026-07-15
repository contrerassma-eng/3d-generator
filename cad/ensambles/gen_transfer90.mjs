#!/usr/bin/env node
// gen_transfer90.mjs — Generador paramétrico del MÓDULO DE TRANSFERENCIA 90°
// (solo el módulo de desviación pop-up). Emite `transfer_rodillos_90.json`
// (formato foto3d-cad).
//
// Especificación del usuario (capa `user`), iterada contra las fotos SID y
// su esquema de transmisión (IMG_3102):
//   - Solo la transferencia: el módulo de desviación, nada más.
//   - 6 RODILLOS COMPLETOS Ø40 vulcanizados (corazón de tubo Ø30) menos un
//     extremo desnudo: ahí sube la banda (el rodillo es la polea de la 1ª línea).
//   - TRANSMISIÓN EN SERPENTÍN (NO rodillo a rodillo): una banda 25×3 sobre
//     cada rodillo, tensores Ø50 (2ª línea, mayores) entre pares, tambor
//     motriz M Ø90 al centro y 2 poleas de retorno en las esquinas.
//   - TODO POR DENTRO: el sistema de poleas, el MOTOR (embridado por dentro
//     de la placa -X, coaxial al tambor) y los 2 CILINDROS (solo dos, sin
//     pines que parezcan cuatro).
//   - Cilindros EN DIAGONAL (inclinados ~37°) con PIVOTE: cada uno bascula
//     en una horquilla de la base y empuja una PALANCA pivotada que sube el
//     puente EN VERTICAL (relación de palanca; carrera vertical 6 mm).
//   - La estructura fija NO es más ancha que la cara que sostiene las
//     poleas: canal fijo de 306 mm = ancho exterior de las placas.
//   - Se identifican los módulos: piezas "FIJO ·" (canal lateral de la
//     cinta, gris) y "MÓVIL ·" (módulo que sube, azul). Pasadores guía de
//     las placas móviles corren en colisas verticales del canal fijo.
//   - Las placas porta-poleas extienden EXTENSIONES DELGADAS (dedos de 28)
//     hacia cada rodillo: entre dedos pasan a lo largo las bandas de 40 del
//     anfitrión (no modelado).
//
// Sistema de coordenadas: X = flujo del anfitrión (eje de los rodillos),
// Y = expulsión a 90°, Z = arriba. mm. Estado modelado: ELEVADO (+6).
//
// Uso:  node cad/ensambles/gen_transfer90.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ---------------------------------------------------------------------------
// Parámetros de diseño
// ---------------------------------------------------------------------------
export const D = {
  hostPlane: 170,                // plano de transporte del anfitrión (bandas de 40)
  stroke: 6,                     // carrera vertical (espec. usuario)

  // Rodillos de desvío (6, completos — como la foto de 90°)
  rollerLines: [-250, -150, -50, 50, 150, 250], // paso 100 → gap tangente 60
  rollerDia: 40,                 // Ø vulcanizado (espec. usuario)
  coreDia: 30,                   // corazón de tubo de hierro (espec. usuario)
  rollerZ: 154,                  // eje elevado: tangente 174 = anfitrión + 4
  coreHalf: 145,                 // núcleo x = -145..145
  bareFrom: 93,                  // vulcanizado x = -145..93; desnudo 93..145
  axleDia: 12, axleHalf: 165,    // ejes Ø12 h9 → agujero Ø12.2

  // Placas porta-poleas MÓVILES (cuerpo bajo + dedos delgados a los rodillos)
  combX: 150, plateT: 6,
  plateHalfY: 310, apronBottom: 18,
  bodyTop: 136,                  // borde superior del cuerpo (sostiene las poleas)
  fingerW: 28,                   // extensiones delgadas hacia los rodillos

  // Transmisión en SERPENTÍN (esquema del usuario IMG_3102)
  bandT: 3, bandW: 25,           // banda plana 25×3
  beltPlane: 119,                // plano x del serpentín (centro del tramo desnudo)
  idlerDia: 50,                  // tensores 2ª línea (mayores que los rodillos)
  idlerPos: [[-200, 118], [-100, 118], [100, 118], [200, 118]],
  retDia: 24,                    // poleas de retorno (esquinas inferiores)
  retPos: [[-280, 36], [280, 36]],
  drumDia: 90, drumW: 30,        // tambor motriz M (bore Ø25.2)
  drumPos: [0, 78],
  shaftDia: 25,
  pulleyW: 29,

  // Puentes elevadores (unen las dos placas, dentro del ancho del módulo)
  bridgeY: 295, bridgeZ: [105, 117],

  // Elevación por 2 cilindros DIAGONALES con pivote + palanca (por dentro)
  lever: {
    pivot: [-118, 70],           // pivote fijo de la palanca (x, z)
    input: [85, 55],             // ojo del vástago (x, z)
    cam: [0, 93], camDia: 24,    // rodillo de leva: contacto en z=105 (puente)
    lug: [30, 14],               // horquilla basculante del cilindro en la base
  },

  // Canal FIJO (no más ancho que las placas): base + 2 alas bajas
  canalW: 306, canalD: 700, wallX: 141, wallT: 6, wallTop: 40,
  guideY: 250,                   // pasador guía Ø8 en colisa vertical del canal
  baseT: 6,

  // Holguras del método
  slide: 0.2, M4: 4.5, M5: 5.5, M6: 6.6, M8: 9.0, M10: 11.0,
};

// Secuencia del serpentín en orden de marcha (circunferencias dirigidas):
// s = +1 la banda gira CCW alrededor del centro, s = -1 CW.
function serpentine() {
  const seq = [];
  const roller = (y) => ({ c: [y, D.rollerZ], r: D.coreDia / 2, s: -1 });
  const idler = ([y, z]) => ({ c: [y, z], r: D.idlerDia / 2, s: 1 });
  seq.push({ c: D.retPos[0], r: D.retDia / 2, s: -1 });
  seq.push(roller(D.rollerLines[0]), idler(D.idlerPos[0]), roller(D.rollerLines[1]),
    idler(D.idlerPos[1]), roller(D.rollerLines[2]));
  seq.push({ c: D.drumPos, r: D.drumDia / 2, s: 1 });  // tambor M
  seq.push(roller(D.rollerLines[3]), idler(D.idlerPos[2]), roller(D.rollerLines[4]),
    idler(D.idlerPos[3]), roller(D.rollerLines[5]));
  seq.push({ c: D.retPos[1], r: D.retDia / 2, s: -1 });
  return seq;
}

// ---------------------------------------------------------------------------
// Geometría del serpentín: tangentes entre circunferencias dirigidas y arcos.
// ---------------------------------------------------------------------------
const r2 = (v) => Math.round(v * 100) / 100;
function serpentineFaces(seq, T, n = 22) {
  const rc = seq.map(q => q.r + T / 2);
  const N = seq.length;
  const normals = [];
  for (let i = 0; i < N; i++) {
    const q1 = seq[i], q2 = seq[(i + 1) % N];
    const dy = q2.c[0] - q1.c[0], dz = q2.c[1] - q1.c[1], d = Math.hypot(dy, dz);
    const a = (q1.s * rc[i] - q2.s * rc[(i + 1) % N]) / d;
    if (Math.abs(a) >= 1) throw new Error(`serpentín: sin tangente entre tramo ${i} y ${i + 1}`);
    const b = -Math.sqrt(1 - a * a);
    const u = [dy / d, dz / d], w = [-u[1], u[0]];
    normals.push([a * u[0] + b * w[0], a * u[1] + b * w[1]]);
  }
  const faces = [[], []];
  for (let i = 0; i < N; i++) {
    const q = seq[i];
    const nIn = normals[(i + N - 1) % N], nOut = normals[i];
    let aIn = Math.atan2(q.s * nIn[1], q.s * nIn[0]);
    let aOut = Math.atan2(q.s * nOut[1], q.s * nOut[0]);
    if (q.s > 0) { while (aOut < aIn - 1e-9) aOut += 2 * Math.PI; }
    else { while (aOut > aIn + 1e-9) aOut -= 2 * Math.PI; }
    faces[0].push(...arcPts(q.c[0], q.c[1], q.s > 0 ? q.r : q.r + T, aIn, aOut, n));
    faces[1].push(...arcPts(q.c[0], q.c[1], q.s > 0 ? q.r + T : q.r, aIn, aOut, n));
  }
  const area = (p) => {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a / 2);
  };
  return area(faces[0]) >= area(faces[1])
    ? { outer: faces[0], inner: faces[1] }
    : { outer: faces[1], inner: faces[0] };
}
function arcPts(cu, cv, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([r2(cu + r * Math.cos(a)), r2(cv + r * Math.sin(a))]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Verificaciones (fallan = no se emite el JSON)
// ---------------------------------------------------------------------------
function verify() {
  const e = [];
  const pitch = D.rollerLines[1] - D.rollerLines[0];
  const tangentGap = pitch - D.rollerDia;
  if (D.rollerLines.length !== 6) e.push('deben ser 6 rodillos (misma cantidad que la foto de 90°)');
  if (tangentGap < 50) e.push(`gap tangente ${tangentGap} < 50 mm (espec. usuario)`);
  const pop = (D.rollerZ + D.rollerDia / 2) - D.hostPlane;
  const drop = D.hostPlane - (D.rollerZ - D.stroke + D.rollerDia / 2);
  if (pop < 3 || pop > 6) e.push(`sobre-elevación ${pop} fuera de 3..6 mm`);
  if (drop < 1) e.push(`retraído, el rodillo no baja del plano anfitrión (${drop})`);
  if (D.coreDia / 2 + D.bandT > D.rollerDia / 2) e.push('la banda sobresale del vulcanizado');
  if (D.beltPlane - D.bandW / 2 < D.bareFrom || D.beltPlane + D.bandW / 2 > D.coreHalf) {
    e.push('el serpentín se sale del tramo desnudo del rodillo');
  }
  // estructura fija no más ancha que la cara que sostiene las poleas
  const plateOuter = D.combX + D.plateT / 2;
  if (D.canalW / 2 > plateOuter) e.push(`canal fijo (${D.canalW}) más ancho que las placas (${2 * plateOuter})`);
  if (D.wallX + D.wallT / 2 > D.combX - D.plateT / 2) e.push('las alas del canal chocan con las placas móviles');
  // dedos delgados: la banda anfitriona de 40 pasa entre ellos
  if (pitch - D.fingerW < 40 + 8) e.push('entre dedos no pasa la banda anfitriona de 40 con holgura');
  // palanca: contacto de leva = fondo del puente, relación y diagonal del cilindro
  const L = D.lever;
  if (L.cam[1] + L.camDia / 2 !== D.bridgeZ[0]) e.push('la leva no toca el fondo del puente');
  const rCam = L.cam[0] - L.pivot[0], rIn = L.input[0] - L.pivot[0];
  const strokeCyl = D.stroke * rIn / rCam;
  if (strokeCyl < 6 || strokeCyl > 15) e.push(`carrera de cilindro ${strokeCyl.toFixed(1)} fuera de 6..15`);
  const dir = [L.input[0] - L.lug[0], L.input[1] - L.lug[1]];
  const ang = Math.atan2(dir[1], dir[0]) * 180 / Math.PI;
  if (ang < 25 || ang > 60) e.push(`cilindro a ${ang.toFixed(0)}° — no es diagonal (25..60°)`);
  // todo por dentro: mecanismo dentro del ancho de las placas
  for (const [nombre, x] of [['pivote', L.pivot[0]], ['ojo', L.input[0]], ['horquilla', L.lug[0]]]) {
    if (Math.abs(x) > D.combX - D.plateT / 2 - 10) e.push(`${nombre} de palanca fuera del módulo`);
  }
  // el serpentín construye y no invade base/plano/puentes
  let poly;
  try { poly = serpentineFaces(serpentine(), D.bandT).outer; } catch (err) { e.push(err.message); }
  if (poly) {
    for (const [u, v] of poly) {
      if (v < D.baseT + 4) e.push(`el serpentín raspa la base (z=${v})`);
      if (v > D.rollerZ + D.rollerDia / 2 + 1e-6) e.push(`el serpentín sobresale del plano de rodillos (z=${v})`);
      if (Math.abs(u) > D.bridgeY - 12 && v > D.bridgeZ[0] - 4 && v < D.bridgeZ[1] + 4) {
        e.push(`el serpentín toca el puente elevador (y=${u}, z=${v})`);
      }
    }
    const beltBottomTop = D.retPos[0][1] - D.retDia / 2;
    if (D.drumPos[1] - D.drumDia / 2 - D.bandT - beltBottomTop < 2) e.push('tambor M toca el ramal inferior');
    for (const Ln of D.rollerLines) {
      const dd = Math.hypot(D.drumPos[0] - Ln, D.drumPos[1] - D.rollerZ);
      if (dd < D.drumDia / 2 + D.rollerDia / 2 + 2) e.push(`tambor M toca el rodillo y=${Ln}`);
    }
  }
  return e.length
    ? (() => { throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - ')); })()
    : {
        tangentGap, pop, drop, carrera: D.stroke, rodillos: D.rollerLines.length,
        cilindros: 2, anguloCilindro: +ang.toFixed(1), carreraCilindro: +strokeCyl.toFixed(1),
        anchoModulo: D.canalW,
      };
}

// ---------------------------------------------------------------------------
// Ayudantes foto3d-cad
// ---------------------------------------------------------------------------
let nf = 0, np = 0;
const fid = () => `f${(++nf)}`;
const parts = [];

const box = (name, at, w, d, h, op = 'union') =>
  ({ id: fid(), name, shape: 'box', op, at, dir: [0, 0, 1], params: { w, d, h } });
const cyl = (name, at, dir, dia, h, op = 'union') =>
  ({ id: fid(), name, shape: 'cylinder', op, at, dir, params: { dia, h } });
const hole = (name, at, dir, dia, depth = 0, through = true) =>
  ({ id: fid(), name, shape: 'hole', op: 'cut', at, dir, params: { dia, depth, through } });
// boceto XZ (normal -Y, u=+X, v=+Z); el corte se ancla en la cara opuesta
const sketchXZ = (name, yFace, pts, h, op = 'union') =>
  ({ id: fid(), name, shape: 'sketch', op, at: [0, yFace, 0], dir: [0, -1, 0], params: { pts, h, u: [1, 0, 0] } });
// boceto YZ (normal +X, u=+Y, v=+Z)
const sketchYZ = (name, xFace, pts, h, op = 'union') =>
  ({ id: fid(), name, shape: 'sketch', op, at: [xFace, 0, 0], dir: [1, 0, 0], params: { pts, h, u: [0, 1, 0] } });

function addPart(name, color, anchor, features, extra = {}) {
  const [ax, ay, az] = anchor;
  for (const f of features) f.at = [f.at[0] - ax, f.at[1] - ay, f.at[2] - az];
  parts.push({
    id: `p${(++np)}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    name, color, pos: [ax, ay, az], quat: [0, 0, 0, 1],
    fixed: parts.length === 0, visible: true, ...extra, features,
  });
}

const C = {
  fijo: '#455a64', fijoClaro: '#607d8b',            // canal y mecanismo FIJO (gris)
  movil: '#2a4fd7',                                  // módulo MÓVIL (azul de la foto)
  banda: '#e6c229', caucho: '#212121', tambor: '#4a5560',
  acero: '#78909c', grisClaro: '#b0bec5', gris: '#90a4ae',
  motor: '#546e7a', neumatico: '#cfd8dc',
};

// ===========================================================================
// FIJO · 1. CANAL LATERAL (pieza fija): base + 2 alas bajas con colisas guía.
//    Ancho total = ancho exterior de las placas porta-poleas (306).
// ===========================================================================
function canalFijo() {
  const f = [box(`Base ${D.canalW}×${D.canalD}×6`, [0, 0, 0], D.canalW, D.canalD, D.baseT)];
  for (const s of [-1, 1]) {
    f.push(box(`Ala x=${s * D.wallX}`, [s * D.wallX, 0, D.baseT], D.wallT, D.canalD, D.wallTop - D.baseT));
    // colisa vertical para el pasador guía Ø8 del módulo móvil (carrera 6)
    f.push(box('Colisa guía 8.5×18', [s * D.wallX, -s * D.guideY, 18], D.wallT + 1, 8.5, 18, 'cut'));
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    f.push(hole('Anclaje Ø11 al anfitrión', [sx * 130, sy * 330, D.baseT], [0, 0, -1], D.M10));
  }
  // patrones de horquillas y soportes de pivote (M5)
  for (const s of [-1, 1]) {
    for (const dx of [-8, 8]) f.push(hole('Ø5.5 horquilla cilindro', [D.lever.lug[0] + dx, s * D.bridgeY, D.baseT], [0, 0, -1], D.M5));
    for (const dx of [-8, 8]) f.push(hole('Ø5.5 soporte pivote', [D.lever.pivot[0] + dx, s * D.bridgeY, D.baseT], [0, 0, -1], D.M5));
  }
  addPart('FIJO · Canal lateral de la cinta', C.fijo, [0, 0, 0], f);
}

// ===========================================================================
// FIJO · 2. ELEVACIÓN: por lado, un cilindro DIAGONAL basculante en horquilla
//    + palanca pivotada con rodillo de leva que sube el puente EN VERTICAL.
// ===========================================================================
function elevacion() {
  const L = D.lever;
  const dir = [L.input[0] - L.lug[0], 0, L.input[1] - L.lug[1]];
  const len = Math.hypot(dir[0], dir[2]);
  const u = [dir[0] / len, 0, dir[2] / len];
  for (const s of [-1, 1]) {
    const y = s * D.bridgeY;
    // soporte de pivote (fijo, atornillado M5 a la base)
    addPart(`FIJO · Soporte pivote ${s > 0 ? '+Y' : '-Y'}`, C.fijoClaro, [L.pivot[0], y, D.baseT], [
      box('Poste 20×12×70', [L.pivot[0], y, D.baseT], 20, 12, 70),
      box('Pie 36×24×6', [L.pivot[0], y, D.baseT], 36, 24, 6),
      cyl('Perno pivote Ø8', [L.pivot[0], y - 13, L.pivot[1]], [0, 1, 0], 8, 26),
      hole('Ø5.5 M5', [L.pivot[0] - 8, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
      hole('Ø5.5 M5 (b)', [L.pivot[0] + 8, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
    ]);
    // horquilla basculante del cilindro (fija, M5 a la base)
    addPart(`FIJO · Horquilla cilindro ${s > 0 ? '+Y' : '-Y'}`, C.fijoClaro, [L.lug[0], y, D.baseT], [
      box('Cuerpo 18×12×16', [L.lug[0], y, D.baseT], 18, 12, 16),
      box('Pie 36×24×6', [L.lug[0], y, D.baseT], 36, 24, 6),
      cyl('Perno basculante Ø8', [L.lug[0], y - 13, L.lug[1]], [0, 1, 0], 8, 26),
      hole('Ø5.5 M5', [L.lug[0] - 8, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
      hole('Ø5.5 M5 (b)', [L.lug[0] + 8, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
    ]);
    // cilindro neumático diagonal (basculante; mostrado EXTENDIDO)
    const B = [L.lug[0], y, L.lug[1]];
    addPart(`FIJO · Cilindro diagonal Ø25 ${s > 0 ? '+Y' : '-Y'}`, C.neumatico, B, [
      cyl('Ojo trasero Ø16', [B[0], y - 6, B[2]], [0, 1, 0], 16, 12),
      cyl('Cuerpo Ø25 (ISO 6432)', [B[0] + u[0] * 6, y, B[2] + u[2] * 6], u, 25, 40),
      cyl('Vástago Ø10 (extendido)', [B[0] + u[0] * 46, y, B[2] + u[2] * 46], u, 10, len - 46),
      cyl('Ojo delantero Ø16', [L.input[0], y - 6, L.input[1]], [0, 1, 0], 16, 12),
      hole('Ø8.2 ojo trasero', [B[0], y - 7, B[2]], [0, 1, 0], 8.2),
      hole('Ø8.2 ojo delantero', [L.input[0], y - 7, L.input[1]], [0, 1, 0], 8.2),
    ]);
    // palanca con rodillo de leva (empuja el puente hacia arriba)
    const barra = [[-119, 83], [98, 69], [98, 41], [-117, 57]];
    const f = [
      sketchXZ('Barra de palanca', y + 5, barra, 10),
      box('Cuello de leva 16×10×20', [L.cam[0], y, 75], 16, 10, 20),
      cyl(`Rodillo de leva Ø${L.camDia}`, [L.cam[0], y - 7, L.cam[1]], [0, 1, 0], L.camDia, 14),
      hole('Ø8.2 pivote', [L.pivot[0], y + 5, L.pivot[1]], [0, -1, 0], 8.2),
      hole('Ø8.2 entrada', [L.input[0], y + 5, L.input[1]], [0, -1, 0], 8.2),
    ];
    addPart(`FIJO · Palanca elevadora ${s > 0 ? '+Y' : '-Y'}`, C.fijoClaro, [L.pivot[0], y, L.pivot[1]], f);
    // perno de unión vástago-palanca
    addPart(`FIJO · Perno entrada Ø8 ${s > 0 ? '+Y' : '-Y'}`, C.grisClaro, [L.input[0], y - 13, L.input[1]], [
      cyl('Perno Ø8×26', [L.input[0], y - 13, L.input[1]], [0, 1, 0], 8, 26),
    ]);
  }
}

// ===========================================================================
// MÓVIL · 3. PLACAS PORTA-POLEAS con DEDOS delgados hacia los rodillos
//    (entre dedos pasan a lo largo las bandas de 40 del anfitrión) + puentes
//    + pasadores guía en las colisas del canal fijo.
// ===========================================================================
function contornoPlaca() {
  const zB = D.apronBottom, zT = D.bodyTop, yE = D.plateHalfY;
  const pts = [[-yE, zB], [-yE, zT]];
  for (const cy of D.rollerLines) {   // dedo delgado por rodillo, punta R14
    pts.push([cy - D.fingerW / 2, zT]);
    pts.push(...arcPts(cy, D.rollerZ, D.fingerW / 2, Math.PI, 0, 16));
    pts.push([cy + D.fingerW / 2, zT]);
  }
  pts.push([yE, zT], [yE, zB]);
  return pts.map(([u, v]) => [r2(u), r2(v)]);
}
function placas() {
  const outline = contornoPlaca();
  for (const sx of [-1, 1]) {
    const xFace = sx * D.combX - D.plateT / 2;
    const f = [sketchYZ('Contorno: cuerpo porta-poleas + dedos', xFace, outline, D.plateT)];
    for (const s of [-1, 1]) {
      f.push(box('Ranura puente', [sx * D.combX, s * D.bridgeY, D.bridgeZ[0] - 0.25],
        D.plateT + 1, 20.5, D.bridgeZ[1] - D.bridgeZ[0] + 0.5, 'cut'));
    }
    for (const y of D.rollerLines) {
      f.push(hole(`Ø12.2 eje línea y=${y}`, [xFace, y, D.rollerZ], [1, 0, 0], D.axleDia + D.slide));
    }
    if (sx > 0) { // placa de transmisión: tambor, tensores y retornos
      f.push(hole('Ø25.2 eje tambor M', [xFace, D.drumPos[0], D.drumPos[1]], [1, 0, 0], D.shaftDia + D.slide));
      for (const [py, pz] of [...D.idlerPos, ...D.retPos]) {
        f.push(hole(`Ø12.2 eje tensor/retorno (${py},${pz})`, [xFace, py, pz], [1, 0, 0], D.axleDia + D.slide));
      }
    } else {      // placa -X: brida del motorreductor por DENTRO
      f.push(hole('Piloto motor Ø30', [xFace, D.drumPos[0], D.drumPos[1]], [1, 0, 0], 30));
      for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        f.push(hole('Ø5.5 brida motor', [xFace, D.drumPos[0] + sy * 30, D.drumPos[1] + sz * 22], [1, 0, 0], D.M5));
      }
    }
    addPart(sx > 0 ? 'MÓVIL · Placa porta-poleas de transmisión (+X)' : 'MÓVIL · Placa porta-poleas lado motor (-X)',
      C.movil, [xFace, 0, D.apronBottom], f);
  }
  for (const s of [-1, 1]) {
    const y = s * D.bridgeY;
    addPart(`MÓVIL · Puente elevador y=${y}`, C.acero, [0, y, D.bridgeZ[0]], [
      box('Puente 306×20×12', [0, y, D.bridgeZ[0]], D.canalW, 20, D.bridgeZ[1] - D.bridgeZ[0]),
    ]);
    // pasador guía Ø8: de la placa móvil hacia la colisa vertical del canal
    const sx = -s; // en diagonal: uno por placa, en esquinas opuestas
    const x0 = sx * (D.combX + D.plateT / 2);          // cara exterior de la placa
    addPart(`MÓVIL · Pasador guía Ø8 (${sx > 0 ? '+X' : '-X'}, y=${-s * D.guideY})`, C.grisClaro,
      [x0, -s * D.guideY, 30], [
        cyl('Pasador Ø8×16', [x0, -s * D.guideY, 30], [-sx, 0, 0], 8, 16),
      ]);
  }
}

// ===========================================================================
// MÓVIL · 4. RODILLOS COMPLETOS (6) + EJES
// ===========================================================================
function rodillos() {
  for (const y of D.rollerLines) {
    addPart(`MÓVIL · Eje rodillo Ø12 línea y=${y}`, C.grisClaro, [-D.axleHalf, y, D.rollerZ], [
      cyl(`Eje Ø12 × ${2 * D.axleHalf}`, [-D.axleHalf, y, D.rollerZ], [1, 0, 0], D.axleDia, 2 * D.axleHalf),
    ]);
    const f = [
      cyl(`Corazón de tubo Ø${D.coreDia} × ${2 * D.coreHalf}`, [-D.coreHalf, y, D.rollerZ], [1, 0, 0], D.coreDia, 2 * D.coreHalf),
      cyl(`Vulcanizado Ø${D.rollerDia} (hasta x=${D.bareFrom})`, [-D.coreHalf, y, D.rollerZ], [1, 0, 0], D.rollerDia, D.coreHalf + D.bareFrom),
      hole('Barreno Ø12.2', [-D.coreHalf, y, D.rollerZ], [1, 0, 0], D.axleDia + D.slide),
    ];
    addPart(`MÓVIL · Rodillo vulcanizado línea y=${y}`, C.caucho, [0, y, D.rollerZ - D.rollerDia / 2], f,
      { componente: 'rodillo_vulcanizado_40x290' });
  }
}

// ===========================================================================
// MÓVIL · 5. TRANSMISIÓN EN SERPENTÍN + MOTOR POR DENTRO (coaxial al tambor,
//    embridado en la cara interior de la placa -X)
// ===========================================================================
function transmision() {
  const [my, mz] = D.drumPos;
  const xMotorFace = -D.combX + D.plateT / 2;      // cara interior de la placa -X
  // eje del tambor: del acople del motor a la placa +X (saliente 7)
  addPart('MÓVIL · Eje tambor Ø25', C.grisClaro, [-52, my, mz], [
    cyl('Eje Ø25 × 212', [-52, my, mz], [1, 0, 0], D.shaftDia, 212),
  ]);
  addPart('MÓVIL · Tambor motriz M', C.tambor, [D.beltPlane - D.drumW / 2, my, mz - D.drumDia / 2], [
    cyl(`Tambor Ø${D.drumDia}×${D.drumW}`, [D.beltPlane - D.drumW / 2, my, mz], [1, 0, 0], D.drumDia, D.drumW),
    hole('Barreno Ø25.2 + chaveta', [D.beltPlane - D.drumW / 2, my, mz], [1, 0, 0], D.shaftDia + D.slide),
  ]);
  const xIn = D.beltPlane - D.pulleyW / 2;
  for (const [i, [py, pz]] of [...D.idlerPos, ...D.retPos].entries()) {
    const esTensor = i < D.idlerPos.length;
    const dia = esTensor ? D.idlerDia : D.retDia;
    const nombre = esTensor ? `MÓVIL · Tensor Ø${dia} (${py},${pz})` : `MÓVIL · Polea de retorno Ø${dia} (${py},${pz})`;
    addPart(nombre, C.gris, [xIn - 2, py, pz], [
      cyl(`Eje Ø12 × ${r2(D.combX + 3 - (xIn - 2))}`, [xIn - 2, py, pz], [1, 0, 0], D.axleDia, r2(D.combX + 3 - (xIn - 2))),
      cyl(`Polea Ø${dia}×${D.pulleyW}`, [xIn, py, pz], [1, 0, 0], dia, D.pulleyW),
    ], { componente: esTensor ? 'polea_tensora_50x29' : 'polea_retorno_24x29' });
  }
  const { outer, inner } = serpentineFaces(serpentine(), D.bandT);
  addPart('MÓVIL · Banda serpentín 25×3', C.banda, [D.beltPlane, 0, D.retPos[0][1] - D.retDia / 2 - D.bandT], [
    sketchYZ('Cara exterior', D.beltPlane - D.bandW / 2, outer, D.bandW),
    sketchYZ('Vaciado interior', D.beltPlane + D.bandW / 2, inner, D.bandW, 'cut'),
  ]);
  // motorreductor POR DENTRO: brida a la cara interior de la placa -X, coaxial
  addPart('MÓVIL · Motorreductor (por dentro)', C.motor, [xMotorFace, my, mz - 33], [
    box('Cuerpo 88×80×66', [xMotorFace + 44, my, mz - 33], 88, 80, 66),
    cyl('Brida Ø70×8', [xMotorFace, my, mz], [1, 0, 0], 70, 8),
    cyl('Eje salida Ø25', [xMotorFace + 88, my, mz], [1, 0, 0], D.shaftDia, 15),
  ]);
  addPart('MÓVIL · Acople rígido Ø35', C.gris, [-64, my, mz], [
    cyl('Manguito Ø35×24', [-64, my, mz], [1, 0, 0], 35, 24),
    hole('Barreno Ø25.2', [-64, my, mz], [1, 0, 0], D.shaftDia + D.slide),
  ]);
}

// ===========================================================================
// Ensamblar y emitir
// ===========================================================================
const metrics = verify();
canalFijo();
elevacion();
placas();
rodillos();
transmision();

const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Transferencia 90° — módulo de desviación pop-up (serpentín, todo por dentro)',
    capa: 'user',
    origen: 'gen_transfer90.mjs (paramétrico); espec. usuario: 6 rodillos Ø40 (corazón Ø30) vulcanizados menos el extremo de polea; serpentín IMG_3102; motor y 2 cilindros por dentro; cilindros diagonales con pivote y palanca (subida vertical 6); canal fijo no más ancho que las placas; módulos FIJO/MÓVIL identificados; placas con dedos delgados hacia los rodillos',
    anfitrion: 'transportador de bandas estrechas de 40 mm a lo largo (plano a 170 mm) — NO modelado; las bandas pasan entre los dedos de las placas',
    estado_modelado: `ELEVADO (+${D.stroke} mm): tangente de rodillos a ${D.rollerZ + D.rollerDia / 2} = plano anfitrión + ${metrics.pop}`,
    verificaciones: metrics,
  },
  parts,
  constraints: [],
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'transfer_rodillos_90.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas, ${nf} funciones → ${out}`);
console.log(`   rodillos=${metrics.rodillos}  gap=${metrics.tangentGap}  carrera=${metrics.carrera}  cilindros=${metrics.cilindros} a ${metrics.anguloCilindro}° (carrera cil. ${metrics.carreraCilindro})  ancho=${metrics.anchoModulo}`);
