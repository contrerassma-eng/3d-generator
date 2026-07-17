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

  // Rodillos de desvío — AJUSTADOS AL ESPACIO DEL EQUIPO BASE (STEP sorter_CO):
  // 4 bandas pasantes a X=0/139/277/416 (paso 139, hueco libre ~99). Se pone
  // UN rodillo centrado en cada hueco + los 2 bordes → 5 rodillos a paso 139,
  // que emergen limpios ENTRE las bandas reales (líneas en el frame del módulo,
  // centradas en 0; al integrar se colocan en X base = 208 − línea).
  rollerLines: [-278, -139, 0, 139, 278], // paso 139 (= paso de banda del base)
  rollerDia: 63,                 // Ø vulcanizado (llena el hueco de ~99 con holgura)
  tubeDia: 51,                   // tubo de acero (corazón); superficie desnuda de arrastre
  rollerZ: 142.5,                // eje: tangente 174 = anfitrión + 4 (con Ø63)
  coreHalf: 138,                 // tubo x = -138..138 (entre placas, 276 largo)
  bareFrom: 95,                  // vulcanizado x = -138..95; desnudo (arrastre) 95..138
  // Rodillo de EJE MUERTO: el eje NO gira (atornillado a las placas); el tubo
  // gira sobre 2 RODAMIENTOS 6004 (20×42×12) entre eje y tubo. El eje se perfora
  // y se rosca M10 en cada extremo; un perno M10 + golilla lo sujeta a la placa.
  axleDia: 20,                   // eje muerto Ø20 (bore del rodamiento 6004)
  bearDia: 42, bearBore: 20, bearW: 12,  // rodamiento 6004 2RS
  retBoltDia: 11,                // paso del perno M10 de sujeción del eje

  // Placas porta-poleas MÓVILES (cuerpo bajo + dedos delgados a los rodillos)
  combX: 150, plateT: 6,
  plateHalfY: 345, apronBottom: 18,
  bodyTop: 118,                  // borde superior del cuerpo (sostiene las poleas)
  fingerW: 28,                   // extensiones delgadas hacia los rodillos

  // Transmisión en SERPENTÍN (esquema del usuario IMG_3102), 5 rodillos
  bandT: 3, bandW: 35,           // banda PLANA 35×3 (2 capas poliéster + cara nitrilo)
  beltPlane: 119,                // plano x del serpentín (centro del tramo desnudo)
  idlerDia: 50,                  // tensores 2ª línea
  idlerPos: [[-208.5, 98], [-69.5, 98], [208.5, 98]],  // 3 tensores; el 4º hueco lo ocupa el tambor
  retDia: 24,                    // poleas de retorno (esquinas inferiores)
  retPos: [[-312, 36], [312, 36]],
  drumDia: 90, drumW: 43,        // tambor motriz liso abombado (fricción)
  drumPos: [69.5, 78],           // en el hueco R3–R4 (entre rodillos, sin tocarlos)
  shaftDia: 20,                  // eje tambor Ø20 h6 (unificado con el base)
  pulleyW: 39,                   // ancho de tensores y retornos (banda 35 + 4)

  // Chumaceras de brida UCFL204 (bore 20) — familia del base (UCFL/UC 205).
  // Ahora SOLO en el tambor motriz (los rodillos son de eje muerto con
  // rodamientos internos). Autoalineante, engrasable, collar excéntrico.
  ucfl: { bore: 20, flangeL: 86, flangeH: 30, boltGap: 64, boltDia: 11, hubDia: 42, hubLen: 31 },
  idlerAxle: 12,                 // ejes de tensores/retornos Ø12 sobre bujes de bronce

  // Puentes elevadores (unen las dos placas, dentro del ancho del módulo)
  bridgeY: 330, bridgeZ: [105, 117],

  // Elevación por 2 cilindros DIAGONALES con pivote + palanca (por dentro)
  lever: {
    pivot: [-118, 70],           // pivote fijo de la palanca (x, z)
    input: [85, 55],             // ojo del vástago (x, z)
    cam: [4, 93], camDia: 24,    // leva a +4: relación 122/203 → carrera estándar 10
    lug: [30, 14],               // horquilla basculante del cilindro en la base
  },

  // Canal FIJO (no más ancho que las placas): base + 2 alas bajas
  canalW: 306, canalD: 740, wallX: 141, wallT: 6, wallTop: 40,
  guideY: 290,                   // pasador guía Ø8 en colisa vertical del canal
  baseT: 6,

  // Holguras del método
  slide: 0.2, M4: 4.5, M5: 5.5, M6: 6.6, M8: 9.0, M10: 11.0,
};

// Secuencia del serpentín en orden de marcha (circunferencias dirigidas):
// s = +1 la banda gira CCW alrededor del centro, s = -1 CW.
function serpentine() {
  const seq = [];
  const R = D.rollerLines;
  // la banda gira alrededor del TUBO desnudo (Ø51) de cada rodillo, no del vulcanizado
  const roller = (y) => ({ c: [y, D.rollerZ], r: D.tubeDia / 2, s: -1 });
  const idler = ([y, z]) => ({ c: [y, z], r: D.idlerDia / 2, s: 1 });
  seq.push({ c: D.retPos[0], r: D.retDia / 2, s: -1 });
  seq.push(roller(R[0]), idler(D.idlerPos[0]), roller(R[1]), idler(D.idlerPos[1]), roller(R[2]));
  seq.push({ c: D.drumPos, r: D.drumDia / 2, s: 1 });  // tambor M (hueco R3–R4)
  seq.push(roller(R[3]), idler(D.idlerPos[2]), roller(R[4]));
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
  // 5 rodillos a paso uniforme (1 por hueco de banda del base, paso 139)
  if (D.rollerLines.length !== 5) e.push('deben ser 5 rodillos (1 por hueco entre las 4 bandas del base)');
  for (let i = 2; i < D.rollerLines.length; i++) {
    if (Math.abs((D.rollerLines[i] - D.rollerLines[i - 1]) - pitch) > 1e-6) e.push('paso de rodillos no uniforme');
  }
  if (tangentGap < 50) e.push(`gap tangente ${tangentGap} < 50 mm (espec. usuario)`);
  const pop = (D.rollerZ + D.rollerDia / 2) - D.hostPlane;
  const drop = D.hostPlane - (D.rollerZ - D.stroke + D.rollerDia / 2);
  if (pop < 3 || pop > 6) e.push(`sobre-elevación ${pop} fuera de 3..6 mm`);
  if (drop < 1) e.push(`retraído, el rodillo no baja del plano anfitrión (${drop})`);
  if (D.tubeDia / 2 + D.bandT > D.rollerDia / 2) e.push('la banda sobresale del vulcanizado');
  if (D.bearDia >= D.tubeDia) e.push('el rodamiento 6004 no cabe dentro del tubo del rodillo');
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
  if (Math.abs(strokeCyl - 10) > 0.5) e.push(`carrera de cilindro ${strokeCyl.toFixed(1)} != 10 estándar ISO 6432`);
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
// Chumacera de brida UCFL204 (bore Ø20) atornillada a la cara EXTERIOR de una
// placa; sx=+1 en la placa +X (crece hacia +X), sx=-1 en la placa -X. El eje
// Ø20 pasa por la placa y gira en la unidad. Autoalineante + collar excéntrico
// (fija el eje axialmente) + graseras; bulones M10 a y±boltGap/2. Familia del
// equipo base (UCFL/UC 205). Reemplaza los rodamientos desnudos.
function ucflUnit(name, xOuter, y, z, sx) {
  const U = D.ucfl, dir = [sx, 0, 0];
  addPart(name, C.acero, [xOuter, y, z], [
    box('Brida 12×86×30', [xOuter + sx * 6, y, z - U.flangeH / 2], 12, U.flangeL, U.flangeH),
    cyl(`Cubo Ø${U.hubDia}×${U.hubLen}`, [xOuter + sx * 12, y, z], dir, U.hubDia, U.hubLen),
    cyl('Collar excéntrico Ø34×12', [xOuter + sx * (12 + U.hubLen), y, z], dir, 34, 12),
    cyl('Grasera M6', [xOuter + sx * 20, y, z + U.hubDia / 2], [0, 0, 1], 7, 7),
    hole('Bore Ø20', [xOuter + sx * 6, y, z], dir, U.bore + 0.3),
    hole('Bulón M10 (a)', [xOuter + sx * 6, y + U.boltGap / 2, z], dir, U.boltDia, 12),
    hole('Bulón M10 (b)', [xOuter + sx * 6, y - U.boltGap / 2, z], dir, U.boltDia, 12),
  ], { componente: 'chumacera_ucfl204' });
}

function canalFijo() {
  const f = [box(`Base ${D.canalW}×${D.canalD}×6`, [0, 0, 0], D.canalW, D.canalD, D.baseT)];
  for (const s of [-1, 1]) {
    f.push(box(`Ala x=${s * D.wallX}`, [s * D.wallX, 0, D.baseT], D.wallT, D.canalD, D.wallTop - D.baseT));
    // colisa vertical para el pasador guía Ø8 del módulo móvil (carrera 6)
    f.push(box('Colisa guía 8.5×18', [s * D.wallX, -s * D.guideY, 18], D.wallT + 1, 8.5, 18, 'cut'));
  }
  // agujeros COLISOS verticales para los pies de anclaje (ajuste de altura ±7)
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const dx of [-20, 20]) {
    f.push(box('Coliso M8 pie (ajuste altura)', [sx * 130 + dx, sy * 330, D.baseT], 9, 9, D.baseT, 'cut'));
  }
  // patrones de horquillas y soportes de pivote (M5)
  for (const s of [-1, 1]) {
    for (const dx of [-8, 8]) f.push(hole('Ø5.5 horquilla cilindro', [D.lever.lug[0] + dx, s * D.bridgeY, D.baseT], [0, 0, -1], D.M5));
    for (const dx of [-8, 8]) f.push(hole('Ø5.5 soporte pivote', [D.lever.pivot[0] + dx, s * D.bridgeY, D.baseT], [0, 0, -1], D.M5));
  }
  // patrón de montaje de la electroválvula
  for (const dy of [-25, 25]) f.push(hole('Ø4.5 electroválvula', [-80 + dy, 330, D.baseT], [0, 0, -1], D.M4));
  // agujeros de los niveladores M12
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    f.push(hole('Ø13 nivelador M12', [sx * 110, sy * 320, D.baseT], [0, 0, -1], 13));
  }
  addPart('FIJO · Canal lateral de la cinta', C.fijo, [0, 0, 0], f);
  // electroválvula 5/2 monoestable 24VDC (alimenta ambos cilindros en paralelo)
  addPart('FIJO · Electroválvula 5/2 24VDC', C.motor, [-80, 330, D.baseT], [
    box('Cuerpo válvula 64×26×28', [-80, 330, D.baseT], 64, 26, 28),
    box('Solenoide 20×26×24', [-118, 330, D.baseT + 2], 20, 26, 24),
    cyl('Racor push-in Ø8 (P. trabajo 2)', [-70, 330, D.baseT + 28], [0, 0, 1], 10, 8),
    cyl('Racor push-in Ø8 (P. trabajo 4)', [-90, 330, D.baseT + 28], [0, 0, 1], 10, 8),
    cyl('Silenciador escape', [-48, 330, D.baseT + 14], [1, 0, 0], 8, 10),
    hole('Ø4.5 montaje (a)', [-105, 330, D.baseT + 28], [0, 0, -1], D.M4),
    hole('Ø4.5 montaje (b)', [-55, 330, D.baseT + 28], [0, 0, -1], D.M4),
  ]);
  // PIES DE ANCLAJE al riel T-slot del base (cero perforaciones en el base):
  // L-bracket con cara vertical atornillada al canal por colisos (ajuste de
  // ALTURA ±7) y pie horizontal con ranura para tuerca en T M6 (ajuste de
  // POSICIÓN X sobre el riel) + shim de nivelación. 4 pies.
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const px = sx * 130, py = sy * 330, base = -14;
    addPart(`FIJO · Pie anclaje T-slot (${px},${py})`, C.fijoClaro, [px, py, base], [
      box('Cara vertical 60×8×34', [px, py + sy * 4, base], 60, 8, 34),           // atornilla al canal
      box('Pie horizontal 60×46×8', [px, py + sy * 27, base], 60, 46, 8),         // apoya en el riel
      box('Ranura T-nut M6 (ajuste X)', [px, py + sy * 27, base], 8, 30, 8, 'cut'),
      hole('Coliso M8 a canal (a)', [px - 20, py, base + 12], [0, sy, 0], 9, 8, false),
      hole('Coliso M8 a canal (b)', [px + 20, py, base + 12], [0, sy, 0], 9, 8, false),
    ]);
    addPart(`FIJO · Shim de nivelación 1 mm (${px},${py})`, C.grisClaro, [px, py, -6], [
      box('Lámina 60×40×1', [px, py + sy * 20, -6], 60, 40, 1),
      hole('Paso M6', [px, py + sy * 20, -6], [0, 0, 1], D.M6),
    ]);
  }
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
      box('Cuerpo 18×24×16', [L.lug[0], y, D.baseT], 18, 24, 16),
      box('Ranura de horquilla 20×11', [L.lug[0], y, D.baseT + 2], 20, 11, 15, 'cut'),
      box('Pie 36×24×6', [L.lug[0], y, D.baseT], 36, 24, 6),
      cyl('Perno basculante Ø8', [L.lug[0], y - 13, L.lug[1]], [0, 1, 0], 8, 26),
      hole('Ø5.5 M5', [L.lug[0] - 8, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
      hole('Ø5.5 M5 (b)', [L.lug[0] + 8, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
    ]);
    // cilindro ESTANDARIZADO ISO 6432 Ø25 carrera 10 (p. ej. DSNU-25-10),
    // basculante, con RÓTULAS DIN ISO 12240-4 (M8) en ambos extremos
    const B = [L.lug[0], y, L.lug[1]];
    addPart(`FIJO · Cilindro ISO 6432 Ø25×10 ${s > 0 ? '+Y' : '-Y'}`, C.neumatico, B, [
      cyl('Tapa trasera Ø32×8 (rosca M8 hembra)', [B[0] + u[0] * 8, y, B[2] + u[2] * 8], u, 32, 8),
      cyl('Cuerpo Ø25 (ISO 6432)', [B[0] + u[0] * 16, y, B[2] + u[2] * 16], u, 25, 32),
      cyl('Tapa delantera Ø32×6', [B[0] + u[0] * 48, y, B[2] + u[2] * 48], u, 32, 6),
      cyl('Vástago Ø10 M8 (extendido +6 vertical)', [B[0] + u[0] * 54, y, B[2] + u[2] * 54], u, 10, len - 64),
    ]);
    for (const [nom, P, dirShank, yOff] of [['trasera', B, 1, 0], ['delantera', [L.input[0], y, L.input[1]], -1, -11]]) {
      addPart(`FIJO · Rótula M8 DIN ISO 12240-4 ${nom} ${s > 0 ? '+Y' : '-Y'}`, C.gris, [P[0], y + yOff - 6, P[2]], [
        cyl('Cabeza Ø16×10', [P[0], y + yOff - 5, P[2]], [0, 1, 0], 16, 10),
        cyl('Esfera Ø12 (aro interior)', [P[0], y + yOff - 6, P[2]], [0, 1, 0], 12, 12),
        cyl('Caña rosca M8×10', [P[0] + dirShank * u[0] * 8, y + yOff, P[2] + dirShank * u[2] * 8], [dirShank * u[0], 0, dirShank * u[2]], 8, 10),
        hole('Bore Ø8.2 (perno)', [P[0], y + yOff - 7, P[2]], [0, 1, 0], 8.2),
      ]);
    }
    // palanca con rodillo de leva (empuja el puente hacia arriba)
    const barra = [[-119, 83], [98, 69], [98, 41], [-117, 57]];
    const f = [
      sketchXZ('Barra de palanca', y + 5, barra, 10),
      box('Cuello de leva 16×10×20', [L.cam[0], y, 75], 16, 10, 20),
      cyl(`Rodillo de leva Ø${L.camDia}`, [L.cam[0], y - 7, L.cam[1]], [0, 1, 0], L.camDia, 14),
      hole('Ø12.2 H7 pivote (buje)', [L.pivot[0], y + 5, L.pivot[1]], [0, -1, 0], 12.2),
      hole('Ø12.2 H7 entrada (buje)', [L.input[0], y + 5, L.input[1]], [0, -1, 0], 12.2),
    ];
    addPart(`FIJO · Palanca elevadora ${s > 0 ? '+Y' : '-Y'}`, C.fijoClaro, [L.pivot[0], y, L.pivot[1]], f);
    for (const [nom, [bx, bz]] of [['pivote', L.pivot], ['entrada', L.input]]) {
      addPart(`FIJO · Buje bronce Ø12/Ø8.2 ${nom} ${s > 0 ? '+Y' : '-Y'}`, '#b08d57', [bx, y - 6, bz], [
        cyl('Buje Ø12×12', [bx, y - 6, bz], [0, 1, 0], 12, 12),
        hole('Bore Ø8.2 H7/f7', [bx, y - 6, bz], [0, 1, 0], 8.2),
      ]);
    }
    for (const [nom, [px2, pz2]] of [['pivote', L.pivot], ['basculante', L.lug], ['entrada', L.input]]) {
      addPart(`FIJO · Seeger DIN 471-8 ${nom} ${s > 0 ? '+Y' : '-Y'}`, C.gris, [px2, y + 11.2, pz2], [
        cyl('Anillo Ø15×1', [px2, y + 11.2, pz2], [0, 1, 0], 15, 1),
        hole('Bore Ø7.4', [px2, y + 11.2, pz2], [0, 1, 0], 7.4),
      ]);
    }
    // perno de unión vástago-palanca
    addPart(`FIJO · Perno entrada Ø8 ${s > 0 ? '+Y' : '-Y'}`, C.grisClaro, [L.input[0], y - 19, L.input[1]], [
      cyl('Perno Ø8×32', [L.input[0], y - 19, L.input[1]], [0, 1, 0], 8, 32),
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
    const ib = D.idlerAxle + D.slide;
    // rodillos de EJE MUERTO: alojamiento Ø20.5 del extremo del eje (el perno
    // M10 lo atraviesa desde fuera y rosca en el eje; la golilla lo retiene).
    for (const y of D.rollerLines) {
      f.push(hole(`Alojamiento eje muerto Ø20.5 línea y=${y}`, [xFace, y, D.rollerZ], [1, 0, 0], D.axleDia + 0.5));
    }
    if (sx > 0) { // placa de transmisión: UCFL del tambor + tensores/retornos
      f.push(hole('Paso eje tambor Ø22', [xFace, D.drumPos[0], D.drumPos[1]], [1, 0, 0], D.axleDia + 2));
      for (const dy of [-D.ucfl.boltGap / 2, D.ucfl.boltGap / 2]) {
        f.push(hole('Ø11 bulón UCFL204 tambor', [xFace, D.drumPos[0] + dy, D.drumPos[1]], [1, 0, 0], D.ucfl.boltDia));
      }
      for (const [py, pz] of D.idlerPos) {  // TENSORES: colisa vertical (tensado de banda)
        f.push(hole(`Ø12.2 eje tensor (${py},${pz})`, [xFace, py, pz - 5], [1, 0, 0], ib));
        f.push(hole(`Ø12.2 colisa sup (${py},${pz})`, [xFace, py, pz + 5], [1, 0, 0], ib));
        f.push(box(`Colisa tensora 12.2×10 (${py},${pz})`, [sx * D.combX, py, pz - 5], D.plateT + 1, 12.2, 10, 'cut'));
      }
      for (const [py, pz] of D.retPos) {
        f.push(hole(`Ø12.2 eje retorno (${py},${pz})`, [xFace, py, pz], [1, 0, 0], ib));
      }
    } else {      // placa -X: brida del motorreductor por DENTRO (apoya el eje)
      f.push(hole('Piloto motor Ø30', [xFace, D.drumPos[0], D.drumPos[1]], [1, 0, 0], 30));
      for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        f.push(hole('Ø6.6 brida motor', [xFace, D.drumPos[0] + sy * 30, D.drumPos[1] + sz * 22], [1, 0, 0], D.M6));
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
        cyl('Pasador Ø8 m6 ×15', [x0, -s * D.guideY, 30], [-sx, 0, 0], 8, 15),
        cyl('Chaflán 1×45°', [x0 - sx * 15, -s * D.guideY, 30], [-sx, 0, 0], 6.5, 1),
      ]);
  }
}

// ===========================================================================
// MÓVIL · 4. RODILLOS COMPLETOS (6) + EJES
// ===========================================================================
function rodillos() {
  const A = D.axleDia, half = D.combX, z = D.rollerZ;   // eje muerto de -150 a 150
  const vulcLen = D.coreHalf + D.bareFrom;               // -138 .. 95
  for (const y of D.rollerLines) {
    // EJE MUERTO Ø20 (no gira): atornillado a ambas placas. Cada extremo se
    // PERFORA Ø8.5 y se ROSCA M10 (hilo interior) para el perno de sujeción.
    addPart(`MÓVIL · Eje muerto rodillo Ø20 perforado M10 línea y=${y}`, C.grisClaro, [-half, y, z], [
      cyl('Cuerpo Ø20 × 300', [-half, y, z], [1, 0, 0], A, 2 * half),
      cyl('Chaflán 1.5×45° (-X)', [-half, y, z], [1, 0, 0], A - 3, 1.5),
      cyl('Chaflán 1.5×45° (+X)', [half - 1.5, y, z], [1, 0, 0], A - 3, 1.5),
      hole('Taladro Ø8.5 + rosca M10 (-X)', [-half, y, z], [1, 0, 0], 8.5, 24, false),
      hole('Taladro Ø8.5 + rosca M10 (+X)', [half, y, z], [-1, 0, 0], 8.5, 24, false),
    ], { componente: 'eje_muerto_rodillo_20' });
    // TUBO DE ACERO Ø51 (bore Ø42 = asiento de rodamiento): es la superficie
    // desnuda de arrastre en el extremo +X (donde corre la banda del serpentín)
    addPart(`MÓVIL · Tubo de acero Ø51 rodillo línea y=${y}`, C.acero, [-D.coreHalf, y, z], [
      cyl('Tubo Ø51 × 276', [-D.coreHalf, y, z], [1, 0, 0], D.tubeDia, 2 * D.coreHalf),
      hole('Barreno Ø42 (asientos de rodamiento 6004)', [-D.coreHalf, y, z], [1, 0, 0], D.bearDia),
    ], { componente: 'tubo_rodillo_51x276' });
    // VULCANIZADO Ø63 sobre el tubo (menos el extremo desnudo de arrastre)
    addPart(`MÓVIL · Vulcanizado Ø63 rodillo línea y=${y}`, C.caucho, [-D.coreHalf, y, z], [
      cyl(`Caucho Ø${D.rollerDia} (hasta x=${D.bareFrom})`, [-D.coreHalf, y, z], [1, 0, 0], D.rollerDia, vulcLen),
      hole('Barreno Ø51 (sobre el tubo)', [-D.coreHalf, y, z], [1, 0, 0], D.tubeDia),
    ], { componente: 'vulcanizado_rodillo_63' });
    // 2 RODAMIENTOS 6004 2RS (20×42×12) ENTRE EJE Y TUBO, uno por extremo
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? -D.coreHalf + 2 : D.coreHalf - 2 - D.bearW;   // base +X del aro
      addPart(`MÓVIL · Rodamiento 6004 2RS rodillo línea y=${y} ${sx > 0 ? '+X' : '-X'}`, C.tambor, [x0, y, z], [
        cyl('Aro Ø42×12 (entre eje y tubo)', [x0, y, z], [1, 0, 0], D.bearDia, D.bearW),
        hole('Bore Ø20', [x0, y, z], [1, 0, 0], A + 0.1),
      ], { componente: 'rodamiento_6004_2rs' });
    }
    // 2 PERNOS M10 + golilla: sujetan el eje muerto a cada placa (retención
    // axial y anti-giro). Cabeza y golilla apoyan en la cara exterior de la placa.
    for (const sx of [-1, 1]) {
      const px = sx * (D.combX + D.plateT / 2);
      addPart(`MÓVIL · Perno M10×25 + golilla eje rodillo línea y=${y} ${sx > 0 ? '+X' : '-X'}`, C.grisClaro, [px, y, z], [
        cyl('Golilla Ø22×2.5 DIN 125', [px, y, z], [sx, 0, 0], 22, 2.5),
        cyl('Perno M10 cabeza Ø17×10', [px + sx * 2.5, y, z], [sx, 0, 0], 17, 10),
        cyl('Vástago M10 (rosca al eje)', [px, y, z], [-sx, 0, 0], D.axleDia - 10, 12),
      ], { componente: 'perno_m10_retencion_eje' });
    }
  }
}

// ===========================================================================
// MÓVIL · 5. TRANSMISIÓN EN SERPENTÍN + MOTOR POR DENTRO (coaxial al tambor,
//    embridado en la cara interior de la placa -X)
// ===========================================================================
function transmision() {
  const [my, mz] = D.drumPos;
  const xMotorFace = -D.combX + D.plateT / 2;      // cara interior de la placa -X
  // eje del tambor Ø20 h6: apoyado en 1 chumacera UCFL204 (placa +X) y en el
  // rodamiento de salida del motor (placa -X, por dentro); acople entre ambos.
  // Tambor fijado con SIT-LOCK (sin chaveta). Chavetero solo en el acople (-X).
  addPart('MÓVIL · Eje tambor Ø20 h6 torneado', C.grisClaro, [-64, my, mz], [
    cyl('Cuerpo Ø20 h6 × 234', [-64, my, mz], [1, 0, 0], D.axleDia, 234),
    cyl('Chaflán 1.5×45° (-X)', [-64, my, mz], [1, 0, 0], D.axleDia - 3, 1.5),
    cyl('Chaflán 1.5×45° (+X)', [168.5, my, mz], [1, 0, 0], D.axleDia - 3, 1.5),
    box('Chavetero 6×3.5 (acople)', [-52, my, mz + D.axleDia / 2 - 1.75], 24, 6, 3.5, 'cut'),
  ]);
  const x0T = D.beltPlane - D.drumW / 2;
  addPart('MÓVIL · Tambor motriz abombado (llanta + tapas + cubo)', C.tambor, [x0T, my, mz - D.drumDia / 2], [
    cyl(`Llanta Ø${D.drumDia - 0.8}×${D.drumW}`, [x0T, my, mz], [1, 0, 0], D.drumDia - 0.8, D.drumW),
    cyl(`Corona Ø${D.drumDia}×14 (abombado central)`, [D.beltPlane - 7, my, mz], [1, 0, 0], D.drumDia, 14),
    hole('Vaciado interior Ø74 (llanta rolada e=8)', [x0T, my, mz], [1, 0, 0], 74),
    cyl('Tapa lateral Ø74×6 (-X, soldada)', [x0T, my, mz], [1, 0, 0], 74, 6),
    cyl('Tapa lateral Ø74×6 (+X, soldada)', [x0T + D.drumW - 6, my, mz], [1, 0, 0], 74, 6),
    cyl('Cubo Ø46 pasante', [x0T, my, mz], [1, 0, 0], 46, D.drumW),
    hole('Barreno del cubo Ø28 H7 (buje SIT-LOCK)', [x0T, my, mz], [1, 0, 0], 28),
  ]);
  // buje cónico autocentrante SIT-LOCK CAL 1 20×28: sin chaveta, autocentrado
  addPart('MÓVIL · Buje SIT-LOCK CAL 1 20×28 (tambor)', C.gris, [D.beltPlane - D.drumW / 2 - 2, my, mz], [
    cyl('Anillo cónico Ø28×' + (D.drumW - 4), [D.beltPlane - D.drumW / 2 + 2, my, mz], [1, 0, 0], 28, D.drumW - 4),
    cyl('Brida de apriete Ø38×6', [D.beltPlane - D.drumW / 2 - 2, my, mz], [1, 0, 0], 38, 6),
    hole('Bore Ø20.05 (autocentrante)', [D.beltPlane - D.drumW / 2 - 2, my, mz], [1, 0, 0], 20.05),
  ]);
  // 1 chumacera UCFL204 para el tambor en la placa +X (el -X lo apoya el motor)
  ucflUnit('MÓVIL · Chumacera UCFL204 tambor +X', D.combX + D.plateT / 2, my, mz, 1);
  const xIn = D.beltPlane - D.pulleyW / 2;
  for (const [i, [py, pz]] of [...D.idlerPos, ...D.retPos].entries()) {
    const esTensor = i < D.idlerPos.length;
    const dia = esTensor ? D.idlerDia : D.retDia;
    // eje cantiléver torneado: chaflán + ranura seeger; los TENSORES llevan
    // rosca M12 y tuerca de apriete en la colisa vertical (tensado)
    addPart(`MÓVIL · Eje cantiléver Ø12 (${py},${pz})`, C.grisClaro, [xIn - 4, py, pz], [
      cyl(`Eje Ø12 × ${r2(D.combX + 3 - (xIn - 3))}`, [xIn - 3, py, pz], [1, 0, 0], D.idlerAxle, r2(D.combX + 3 - (xIn - 3))),
      cyl('Chaflán 1×45°', [xIn - 4, py, pz], [1, 0, 0], 10, 1),
      ...(esTensor ? [cyl('Rosca M12×14', [D.combX + 3, py, pz], [1, 0, 0], D.idlerAxle, 12)] : []),
    ]);
    if (esTensor) {
      addPart(`MÓVIL · Tuerca tensora M12 + golilla (${py},${pz})`, C.grisClaro, [D.combX + 3, py, pz], [
        cyl('Golilla plana Ø24×2.5', [D.combX + 3, py, pz], [1, 0, 0], 24, 2.5),
        cyl('Tuerca M12 DIN 934 (e=19)', [D.combX + 5.5, py, pz], [1, 0, 0], 19, 10),
        hole('Paso rosca M12', [D.combX + 3, py, pz], [1, 0, 0], 12.2),
      ]);
    }
    // polea con ABOMBADO (corona 0.4 por lado para autocentrado de la banda)
    const nombre = esTensor ? `MÓVIL · Tensor abombado Ø${dia} (${py},${pz})` : `MÓVIL · Polea de retorno abombada Ø${dia} (${py},${pz})`;
    addPart(nombre, C.gris, [xIn, py, pz - dia / 2], [
      cyl(`Cuerpo Ø${dia - 0.8}×${D.pulleyW}`, [xIn, py, pz], [1, 0, 0], dia - 0.8, D.pulleyW),
      cyl(`Corona Ø${dia}×12 (abombado)`, [xIn + D.pulleyW / 2 - 6, py, pz], [1, 0, 0], dia, 12),
      hole('Alojamiento buje Ø18 H7', [xIn, py, pz], [1, 0, 0], 18),
    ], { componente: esTensor ? 'polea_tensora_50x29' : 'polea_retorno_24x29' });
    // idlers SIN rodamiento desnudo: buje de bronce autolubricado (SAE 841),
    // sellado y sin mantenimiento — baja carga y velocidad (tensor y retorno)
    addPart(`MÓVIL · Buje bronce Ø18/Ø12.2 ${esTensor ? 'tensor' : 'retorno'} (${py},${pz})`, '#b08d57', [xIn, py, pz], [
      cyl(`Buje Ø18×${D.pulleyW - 4}`, [xIn, py, pz], [1, 0, 0], 18, D.pulleyW - 4),
      hole('Bore Ø12.2 H7/f7', [xIn, py, pz], [1, 0, 0], 12.2),
    ]);
    // retención axial de la polea loca: arandela + tornillo M6 en el extremo
    // del eje cantiléver (sin seeger; sin rodamiento desnudo)
    addPart(`MÓVIL · Retención M6 polea ${esTensor ? 'tensor' : 'retorno'} (${py},${pz})`, C.grisClaro, [xIn - 2, py, pz], [
      cyl('Arandela Ø18×2', [xIn - 2, py, pz], [1, 0, 0], 18, 2),
      cyl('Tornillo M6 cabeza Ø10', [xIn - 8, py, pz], [1, 0, 0], 10, 6),
    ]);
  }
  const { outer, inner } = serpentineFaces(serpentine(), D.bandT);
  addPart('MÓVIL · Banda plana 35×3 (serpentín)', C.banda, [D.beltPlane, 0, D.retPos[0][1] - D.retDia / 2 - D.bandT], [
    sketchYZ('Cara exterior', D.beltPlane - D.bandW / 2, outer, D.bandW),
    sketchYZ('Vaciado interior', D.beltPlane + D.bandW / 2, inner, D.bandW, 'cut'),
  ]);
  // motorreductor POR DENTRO: brida a la cara interior de la placa -X, coaxial
  addPart('MÓVIL · Motorreductor (por dentro)', C.motor, [xMotorFace, my, mz - 33], [
    box('Cuerpo 88×80×66', [xMotorFace + 44, my, mz - 33], 88, 80, 66),
    cyl('Brida Ø70×8', [xMotorFace, my, mz], [1, 0, 0], 70, 8),
    cyl('Eje salida Ø20', [xMotorFace + 88, my, mz], [1, 0, 0], D.shaftDia, 15),
  ]);
  addPart('MÓVIL · Acople rígido Ø32 (chaveteros 6 DIN 6885)', C.gris, [-70, my, mz], [
    cyl('Manguito Ø32×24', [-70, my, mz], [1, 0, 0], 32, 24),
    hole('Barreno Ø20.2', [-70, my, mz], [1, 0, 0], D.shaftDia + D.slide),
    hole('Ranura prisionero M6 (a)', [-64, my - 16, mz], [0, 1, 0], D.M6, 6, false),
    hole('Ranura prisionero M6 (b)', [-52, my - 16, mz], [0, 1, 0], D.M6, 6, false),
  ]);
  // chavetas DIN 6885 del acople: lado motor y lado eje del tambor (chaveteros N9)
  addPart('MÓVIL · Chaveta DIN 6885 A 6×6×12 (motor↔acople)', C.grisClaro, [-66, my, mz + D.axleDia / 2 - 1.75], [
    box('Chaveta 12×6×6', [-66, my, mz + D.axleDia / 2 - 1.75], 12, 6, 6),
  ]);
  addPart('MÓVIL · Chaveta DIN 6885 A 6×6×12 (eje↔acople)', C.grisClaro, [-52, my, mz + D.axleDia / 2 - 1.75], [
    box('Chaveta 12×6×6', [-52, my, mz + D.axleDia / 2 - 1.75], 12, 6, 6),
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
    origen: 'gen_transfer90.mjs (paramétrico); espec. usuario + AJUSTE AL EQUIPO BASE (STEP sorter_CO): 5 rodillos Ø63 vulcanizados (tubo de acero Ø51) a paso 139 = 1 por hueco entre las 4 bandas pasantes del base (X=0/139/277/416); rodillo de EJE MUERTO Ø20 perforado y roscado M10, con 2 rodamientos 6004 entre eje y tubo y perno M10+golilla de sujeción a las placas; serpentín IMG_3102; motor y 2 cilindros por dentro; cilindros diagonales con pivote y palanca (subida vertical 6); canal fijo no más ancho que las placas; módulos FIJO/MÓVIL identificados; placas con dedos delgados hacia los rodillos',
    anfitrion: 'equipo base = sorter de bandas STEP (sorter_CO): rieles T-slot, chumaceras UCFL/UC 205 y SKF 1206, transmisión AT10, ejes Ø20 H7, tornillería M6. El módulo NO modifica el base: se monta a los rieles T-slot y solo comparte su idioma de hardware.',
    integracion: 'módulo de desviación que se monta sobre el equipo base sin perforarlo: 4 pies de anclaje a riel T-slot con tuercas en T M6 (ajuste de posición X) + colisos M8 al canal (ajuste de altura ±7) + shims de nivelación. La altura de emergencia y la separación rodillo-tensora se calibran contra el plano de banda real del base.',
    estado_modelado: `ELEVADO (+${D.stroke} mm): tangente de rodillos a ${D.rollerZ + D.rollerDia / 2} = plano anfitrión + ${metrics.pop}`,
    tolerancias: {
      rodamientos: 'RODILLOS de EJE MUERTO: el eje NO gira; el tubo gira sobre 2 rodamientos 6004 2RS (20×42×12) alojados en el bore Ø42 del tubo, uno por extremo (10 rodamientos en 5 rodillos). El TAMBOR conserva 1 unidad de brida UCFL204 (placa +X) + el rodamiento de salida del motor (placa -X). Sin rodamientos de bolas desnudos sueltos.',
      eje_rodillo: 'EJE MUERTO Ø20 h6, fijo a ambas placas: cada extremo PERFORADO Ø8.5 y ROSCADO M10 (hilo interior); un PERNO M10×25 + golilla Ø22 (DIN 125) lo sujeta y retiene axialmente contra la cara exterior de cada placa (anti-giro por apriete). Alojamiento en placa Ø20.5. Chaflanes 1.5×45°.',
      tubo_rodillo: 'tubo de acero Ø51 (bore Ø42 H7 para los rodamientos 6004), vulcanizado a Ø63 salvo el extremo +X desnudo (x=95..138) donde la banda del serpentín lo arrastra por fricción. Ajuste rodamiento: aro exterior J7 en el tubo, aro interior sobre el eje Ø20 j5.',
      eje_tambor: 'eje del tambor Ø20 h6 que gira en la UCFL204 (placa +X) y en el rodamiento del motor (placa -X); chaflanes 1.5×45°; chavetero 6×3.5 N9 en el acople.',
      idlers: 'tensores y retornos: ejes cantiléver Ø12 m6 prensados en la placa; poleas locas sobre BUJE de bronce autolubricado SAE 841 Ø18/Ø12.2 H7/f7 (sin rodamiento desnudo); retención axial arandela + tornillo M6.',
      tambor: 'SIT-LOCK CAL 1 20×28 en cubo Ø28 H7 (autocentrado, sin chaveta); 1 UCFL204 en placa +X + rodamiento del motor en -X; abombado corona +0.4.',
      acople: '2 chavetas DIN 6885 A 6×6×12 (motor↔acople↔eje), chaveteros N9; manguito Ø32 barreno Ø20.2.',
      montaje: 'pies de anclaje a riel T-slot: tuerca en T M6 en ranura (ajuste X) + 2 colisos M8 al canal (ajuste altura ±7) + shims 1 mm de nivelación. CERO perforaciones en el equipo base.',
      palanca: 'pernos Ø8 h9 en bujes de bronce Ø12/Ø8.2 H7 en la palanca; seegers DIN 471-8; leva Ø24 rodante; carrera cilindro 10 → 6 vertical (relación 122/203).',
      pasador_guia: 'Ø8 m6 en la placa; colisa 8.5 del canal (juego 0.5) por la carrera 6.',
      tensado: 'tensores en colisa vertical 12.2×22 con eje roscado M12 y tuerca: rango ±5 mm.',
      neumatica: 'cilindros ISO 6432 Ø25 carrera 10 con rótulas DIN ISO 12240-4 M8 en ambos extremos; electroválvula 5/2 monoestable 24VDC.',
      correa: 'banda PLANA 35×3 nitrilo/poliéster, empalme vulcanizado; abombado de tambor y tensores para autocentrado.',
      velocidad: 'v tangencial rodillos 80 m/min → banda 60 m/min; tambor Ø90 ~212 rpm; motorreductor i≈6.3 (~0.18 kW).',
    },
    verificaciones: metrics,
  },
  parts,
  constraints: [],
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'transfer_rodillos_90.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas, ${nf} funciones → ${out}`);
console.log(`   rodillos=${metrics.rodillos}  gap=${metrics.tangentGap}  carrera=${metrics.carrera}  cilindros=${metrics.cilindros} a ${metrics.anguloCilindro}° (carrera cil. ${metrics.carreraCilindro})  ancho=${metrics.anchoModulo}`);
