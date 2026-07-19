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
//     lado +X 6 mm; el cassette bascula sobre la bisagra del lado -X.
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
  // RODILLOS LARGOS (≥800): tubo x = -400..400 (800 de cara), como la cama de
  // rodillos de un transfer real (ref. construcción Hytrol MRT). El extremo +X
  // (x=355..400) es el desnudo de arrastre donde corre el serpentín.
  coreHalf: 400,                 // tubo x = -400..400 (800 de largo)
  bareFrom: 355,                 // vulcanizado x = -400..355; desnudo 355..400
  // Rodillo de EJE MUERTO MACIZO: el eje NO gira (atornillado a las placas). El
  // tubo gira sobre 2 RODAMIENTOS 6004 (20×42×12) entre eje y tubo. El eje es
  // MACIZO Ø20, taladrado y roscado M10 en cada extremo (hilo interior); desde
  // FUERA de la chapa entra un PERNO HEXAGONAL M10 + golilla que lo sujeta.
  axleDia: 20,                   // eje muerto macizo Ø20 (bore del rodamiento 6004)
  bearDia: 42, bearW: 12,        // rodamiento 6004 2RS (20×42×12)
  hexHead: 17, hexHeadH: 6.4,    // perno hexagonal M10 DIN 933 (entrecaras 17, alto 6.4)

  // Placas laterales del bastidor (canal formado): cuerpo bajo + dedos a los
  // rodillos. Separadas 830 (= largo del rodillo + acoples laterales).
  combX: 415, plateT: 6,
  plateHalfY: 345, apronBottom: 18,
  bodyTop: 118,                  // borde superior del cuerpo (sostiene las poleas)
  fingerW: 28,                   // extensiones delgadas hacia los rodillos

  // Transmisión en SERPENTÍN (esquema del usuario IMG_3102), 5 rodillos, en el
  // EXTREMO +X (sobre los tramos desnudos de los rodillos). El motor va coaxial
  // al tambor, POR DENTRO, colgado bajo el eje (en el rebaje del base).
  bandT: 3, bandW: 35,           // banda PLANA 35×3 (2 capas poliéster + cara nitrilo)
  beltPlane: 378,                // plano x del serpentín (centro del tramo desnudo +X)
  // 2ª línea de tensores MÁS GRANDES y MÁS BAJOS: bajan el ramal de la banda
  // para que el serpentín dé la compliancia del pop-up sin sobre-tensarse
  // (crece la altura del módulo). Ø80 a z=58 (antes Ø50 a z=98).
  idlerDia: 80,                  // tensores 2ª línea (mayores → más envoltura y juego)
  idlerPos: [[-208.5, 58], [-69.5, 58], [208.5, 58]],  // 3 tensores bajos; el 4º hueco lo ocupa el tambor
  retDia: 50,                    // poleas de retorno Ø50 (Habasit: Ø mín de polea
  retPos: [[-312, 45], [312, 45]],   // con contraflexión para banda 3 mm/2 telas)
  drumDia: 90, drumW: 43,        // tambor motriz liso abombado (fricción)
  drumPos: [69.5, 78],           // en el hueco R3–R4 (entre rodillos, sin tocarlos)
  shaftDia: 20,                  // eje tambor Ø20 h6 (unificado con el base)
  pulleyW: 39,                   // ancho de tensores y retornos (banda 35 + 4)

  // Chumaceras de brida UCFL204 (bore 20) — familia del base (UCFL/UC 205).
  // Ahora SOLO en el tambor motriz (los rodillos son de eje muerto con
  // rodamientos internos). Autoalineante, engrasable, collar excéntrico.
  ucfl: { bore: 20, flangeL: 86, flangeH: 30, boltGap: 64, boltDia: 11, hubDia: 42, hubLen: 31 },
  idlerAxle: 12,                 // ejes de tensores/retornos Ø12 sobre bujes de bronce

  // Puentes estructurales (unen las dos placas, rigidizan el cassette)
  bridgeY: 330, bridgeZ: [105, 117],

  // POP-UP POR BISAGRA (estructura lateral): bisagra a -combX (lado -X), empuje
  // de los 2 cilindros verticales a liftX (lado +X, fuera del plano del serpentín
  // en 378 para no chocar con las poleas de retorno).
  liftX: 300,

  // Canal FIJO (no más ancho que las placas): base + 2 alas bajas
  canalW: 836, canalD: 740, wallX: 406, wallT: 6, wallTop: 40,
  footX: 375,                    // pies de anclaje / niveladores cerca de las placas
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
  // POP-UP POR BISAGRA: eje de giro en -X, empuje de cilindros en +X. El tilt
  // (subida 6 al lado +X sobre el brazo 2·combX) debe ser pequeño y el empuje
  // debe caer dentro del módulo.
  const xh = -D.combX, xl = D.liftX;
  const arm = xl - xh;                              // brazo del cilindro desde la bisagra
  const tilt = Math.atan2(D.stroke, 2 * D.combX) * 180 / Math.PI;
  if (tilt > 1.0) e.push(`tilt del pop-up ${tilt.toFixed(2)}° > 1° (la cama se inclina demasiado)`);
  if (Math.abs(xl) > D.combX - D.plateT / 2) e.push('el cilindro de empuje cae fuera del módulo');
  if (arm < D.combX) e.push('brazo de empuje del cilindro demasiado corto respecto a la bisagra');
  const strokeCyl = 10, ang = 90;                  // cilindro VERTICAL, carrera estándar 10
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
// boceto YZ extruido en ±X (sx): para prismas hexagonales (cabezas de perno)
const sketchYZn = (name, xFace, pts, h, sx, op = 'union') =>
  ({ id: fid(), name, shape: 'sketch', op, at: [xFace, 0, 0], dir: [sx, 0, 0], params: { pts, h, u: [0, 1, 0] } });
// hexágono por entrecaras `s` centrado en (cy,cz) del plano YZ (vértice a 30°)
const hexPts = (cy, cz, s) => {
  const R = s / Math.sqrt(3), out = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; out.push([r2(cy + R * Math.cos(a)), r2(cz + R * Math.sin(a))]); }
  return out;
};

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
  }
  // agujeros COLISOS verticales para los pies de anclaje (ajuste de altura ±7)
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const dx of [-20, 20]) {
    f.push(box('Coliso M8 pie (ajuste altura)', [sx * D.footX + dx, sy * 330, D.baseT], 9, 9, D.baseT, 'cut'));
  }
  // patrones de fijación del pop-up POR BISAGRA: nudillos de bisagra en -X y
  // horquillas de cilindro en +X (M5), por lado (y=±bridgeY)
  for (const s of [-1, 1]) {
    for (const dx of [-14, 14]) f.push(hole('Ø5.5 nudillo de bisagra (-X)', [-D.combX + dx, s * D.bridgeY, D.baseT], [0, 0, -1], D.M5));
    for (const dx of [-14, 14]) f.push(hole('Ø5.5 horquilla cilindro (+X)', [D.liftX + dx, s * D.bridgeY, D.baseT], [0, 0, -1], D.M5));
  }
  // ventana en la base para que el cuerpo del motorreductor cuelgue en el
  // rebaje del transportador (queda POR DENTRO del envolvente del base)
  f.push(box('Ventana motorreductor', [D.beltPlane - 80, D.drumPos[0], D.baseT], 120, 100, D.baseT + 2, 'cut'));
  // patrón de montaje de la electroválvula (zona libre -X del canal)
  for (const dy of [-25, 25]) f.push(hole('Ø4.5 electroválvula', [-300 + dy, 330, D.baseT], [0, 0, -1], D.M4));
  // agujeros de los niveladores M12
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    f.push(hole('Ø13 nivelador M12', [sx * D.footX, sy * 320, D.baseT], [0, 0, -1], 13));
  }
  addPart('FIJO · Canal lateral de la cinta', C.fijo, [0, 0, 0], f);
  // electroválvula 5/2 monoestable 24VDC (alimenta ambos cilindros en paralelo)
  addPart('FIJO · Electroválvula 5/2 24VDC', C.motor, [-300, 330, D.baseT], [
    box('Cuerpo válvula 64×26×28', [-300, 330, D.baseT], 64, 26, 28),
    box('Solenoide 20×26×24', [-338, 330, D.baseT + 2], 20, 26, 24),
    cyl('Racor push-in Ø8 (P. trabajo 2)', [-290, 330, D.baseT + 28], [0, 0, 1], 10, 8),
    cyl('Racor push-in Ø8 (P. trabajo 4)', [-310, 330, D.baseT + 28], [0, 0, 1], 10, 8),
    cyl('Silenciador escape', [-268, 330, D.baseT + 14], [1, 0, 0], 8, 10),
    hole('Ø4.5 montaje (a)', [-325, 330, D.baseT + 28], [0, 0, -1], D.M4),
    hole('Ø4.5 montaje (b)', [-275, 330, D.baseT + 28], [0, 0, -1], D.M4),
  ]);
  // PIES DE ANCLAJE al riel T-slot del base (cero perforaciones en el base):
  // L-bracket con cara vertical atornillada al canal por colisos (ajuste de
  // ALTURA ±7) y pie horizontal con ranura para tuerca en T M6 (ajuste de
  // POSICIÓN X sobre el riel) + shim de nivelación. 4 pies.
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const px = sx * D.footX, py = sy * 330, base = -14;
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
//    POP-UP POR BISAGRA (lado -X) + 2 cilindros verticales que suben el lado +X.
// ===========================================================================
function elevacion() {
  // POP-UP POR BISAGRA integrado en la ESTRUCTURA LATERAL: el cassette pivota
  // sobre una línea de bisagra (eje en Y) al pie de la placa -X; 2 cilindros
  // verticales suben el lado +X 6 mm. Tilt = 6/(2·combX) ≈ 0.41° (despreciable).
  const xh = -D.combX, zh = D.baseT + 12;    // eje de bisagra (lado -X, estructura lateral)
  const xl = D.liftX;                    // eje de empuje de los cilindros (lado +X)
  for (const s of [-1, 1]) {
    const y = s * D.bridgeY;
    // BISAGRA: nudillo FIJO (canal) + nudillo MÓVIL (placa -X) + pasador Ø12 (eje Y).
    // Define el eje de giro del pop-up y toma el empuje lateral (sin colisas).
    addPart(`FIJO · Nudillo de bisagra ${s > 0 ? '+Y' : '-Y'}`, C.fijoClaro, [xh, y, zh], [
      box('Nudillo fijo 28×22×28', [xh, y - 13, zh], 28, 22, 28),
      box('Pie 46×26×6', [xh, y, D.baseT], 46, 26, 6),
      cyl('Buje bronce Ø12/Ø16', [xh, y - 13, zh], [0, 1, 0], 16, 22),
      hole('Bore Ø12.2 H7 bisagra', [xh, y - 13, zh], [0, 1, 0], 12.2),
      hole('Ø5.5 M5 anclaje (a)', [xh - 14, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
      hole('Ø5.5 M5 anclaje (b)', [xh + 14, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
    ]);
    addPart(`MÓVIL · Nudillo de bisagra placa -X ${s > 0 ? '+Y' : '-Y'}`, C.movil, [xh, y, zh], [
      box('Nudillo móvil 28×18×28', [xh, y + 13, zh], 28, 18, 28),
      hole('Bore Ø12.2 H7 bisagra', [xh, y + 13, zh], [0, 1, 0], 12.2),
    ]);
    addPart(`FIJO · Pasador de bisagra Ø12 h9 ${s > 0 ? '+Y' : '-Y'}`, C.grisClaro, [xh, y - 26, zh], [
      cyl('Pasador Ø12 × 54', [xh, y - 26, zh], [0, 1, 0], 12, 54),
      cyl('Cabeza Ø18×4', [xh, y - 26, zh], [0, 1, 0], 18, 4),
      hole('Ø3 pasador beta', [xh, y + 26, zh], [0, 1, 0], 3),
    ]);
    // CILINDRO ISO 6432 Ø32 VERTICAL que sube el lado +X: horquilla basculante
    // abajo (canal) + rótula M10 arriba (al puente +X del cassette). Con hinge
    // a -X, cada cilindro toma ~0.26·W (el resto va a la bisagra) → SF holgado.
    const cb = D.baseT + 8, ct = D.bridgeZ[0] - 2;   // recorrido vertical del cilindro
    addPart(`FIJO · Horquilla cilindro ${s > 0 ? '+Y' : '-Y'}`, C.fijoClaro, [xl, y, D.baseT], [
      box('Cuerpo 22×26×16', [xl, y, D.baseT], 22, 26, 16),
      box('Ranura de horquilla 24×12', [xl, y, D.baseT + 2], 24, 12, 16, 'cut'),
      box('Pie 46×26×6', [xl, y, D.baseT], 46, 26, 6),
      cyl('Perno basculante Ø10', [xl, y - 14, cb], [0, 1, 0], 10, 28),
      hole('Ø5.5 M5 (a)', [xl - 14, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
      hole('Ø5.5 M5 (b)', [xl + 14, y, D.baseT + 6], [0, 0, -1], D.M5, 6, false),
    ]);
    addPart(`FIJO · Cilindro ISO 6432 Ø32×10 (vertical) ${s > 0 ? '+Y' : '-Y'}`, C.neumatico, [xl, y, cb], [
      cyl('Tapa trasera Ø40×8 (M10 hembra)', [xl, y, cb], [0, 0, 1], 40, 8),
      cyl('Cuerpo Ø32 (ISO 6432)', [xl, y, cb + 8], [0, 0, 1], 32, ct - cb - 22),
      cyl('Tapa delantera Ø40×6', [xl, y, ct - 14], [0, 0, 1], 40, 6),
      cyl('Vástago Ø12 M10 (carrera 10 → sube +6)', [xl, y, ct - 8], [0, 0, 1], 12, 8),
    ]);
    for (const [nom, zc] of [['inferior (horquilla)', cb], ['superior (al puente +X)', ct]]) {
      addPart(`FIJO · Rótula M10 DIN ISO 12240-4 ${nom.split(' ')[0]} ${s > 0 ? '+Y' : '-Y'}`, C.gris, [xl, y, zc], [
        cyl('Cabeza Ø18×10', [xl, y - 5, zc], [0, 1, 0], 18, 10),
        cyl('Esfera Ø14 (aro interior)', [xl, y - 6, zc], [0, 1, 0], 14, 12),
        hole('Bore Ø10.2 (perno)', [xl, y - 7, zc], [0, 1, 0], 10.2),
      ]);
    }
    // TOPE de altura elevada regulable: fija los +6 mm y descarga los cilindros
    // en reposo (el peso queda sobre el tope, no sobre el aire del cilindro)
    addPart(`FIJO · Tope de altura +6 regulable ${s > 0 ? '+Y' : '-Y'}`, C.fijoClaro, [xl + 34, y, D.baseT], [
      box(`Poste tope 20×12×${ct - 6 - D.baseT}`, [xl + 34, y, D.baseT], 20, 12, ct - 6 - D.baseT),
      hole('Tornillo reglaje M10 + contratuerca', [xl + 34, y, ct - 6], [0, 0, 1], D.M10, 20, false),
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
      // pasador Ø12 del brazo de reacción del motorreductor
      f.push(hole('Ø12.2 pasador brazo de torque', [xFace, D.drumPos[0] - 55, D.drumPos[1] - 40], [1, 0, 0], 12.2));
    }
    // La placa -X es lisa (solo aloja los ejes muertos): el motor va colgado de
    // un travesaño en el extremo +X, no embridado a esta placa.
    addPart(sx > 0 ? 'MÓVIL · Placa lateral de transmisión (+X)' : 'MÓVIL · Placa lateral (-X)',
      C.movil, [xFace, 0, D.apronBottom], f);
  }
  // PUENTES: travesaños estructurales que unen las 2 placas y rigidizan el
  // cassette; el +X recibe el empuje de los cilindros, el -X pivota en la bisagra.
  for (const s of [-1, 1]) {
    const y = s * D.bridgeY;
    addPart(`MÓVIL · Puente estructural y=${y}`, C.acero, [0, y, D.bridgeZ[0]], [
      box(`Puente ${D.canalW}×20×12`, [0, y, D.bridgeZ[0]], D.canalW, 20, D.bridgeZ[1] - D.bridgeZ[0]),
      hole('Ø10.2 rótula del cilindro (+X)', [D.liftX, y, D.bridgeZ[0] + 6], [0, 1, 0], 10.2),
    ]);
  }
}

// ===========================================================================
// MÓVIL · 4. RODILLOS COMPLETOS (6) + EJES
// ===========================================================================
function rodillos() {
  const A = D.axleDia, half = D.combX, z = D.rollerZ;   // eje muerto de -415 a 415
  const vulcLen = D.coreHalf + D.bareFrom;               // -400 .. 355 (755)
  const tubeLen = 2 * D.coreHalf;                        // 800
  for (const y of D.rollerLines) {
    // EJE MUERTO MACIZO Ø20 (no gira): atornillado a ambas placas. Cada extremo
    // se PERFORA Ø8.5 y se ROSCA M10 (hilo interior); desde fuera entra el perno.
    addPart(`MÓVIL · Eje muerto macizo Ø20 roscado M10 línea y=${y}`, C.grisClaro, [-half, y, z], [
      cyl(`Cuerpo macizo Ø20 × ${2 * half}`, [-half, y, z], [1, 0, 0], A, 2 * half),
      cyl('Chaflán 1.5×45° (-X)', [-half, y, z], [1, 0, 0], A - 3, 1.5),
      cyl('Chaflán 1.5×45° (+X)', [half - 1.5, y, z], [1, 0, 0], A - 3, 1.5),
      hole('Taladro Ø8.5 + rosca M10 int. (-X)', [-half, y, z], [1, 0, 0], 8.5, 26, false),
      hole('Taladro Ø8.5 + rosca M10 int. (+X)', [half, y, z], [-1, 0, 0], 8.5, 26, false),
    ], { componente: 'eje_muerto_rodillo_20' });
    // TUBO DE ACERO Ø51 × 800 (bore Ø42 = asiento de rodamiento): superficie
    // desnuda de arrastre en el extremo +X (x=355..400, corre el serpentín)
    addPart(`MÓVIL · Tubo de acero Ø51 × ${tubeLen} rodillo línea y=${y}`, C.acero, [-D.coreHalf, y, z], [
      cyl(`Tubo Ø51 × ${tubeLen}`, [-D.coreHalf, y, z], [1, 0, 0], D.tubeDia, tubeLen),
      hole('Barreno Ø42 (asientos de rodamiento 6004)', [-D.coreHalf, y, z], [1, 0, 0], D.bearDia),
    ], { componente: 'rodillo_transfer_63' });
    // VULCANIZADO Ø63 sobre el tubo (menos el extremo desnudo de arrastre)
    addPart(`MÓVIL · Vulcanizado Ø63 rodillo línea y=${y}`, C.caucho, [-D.coreHalf, y, z], [
      cyl(`Caucho Ø${D.rollerDia} (hasta x=${D.bareFrom})`, [-D.coreHalf, y, z], [1, 0, 0], D.rollerDia, vulcLen),
      hole('Barreno Ø51 (sobre el tubo)', [-D.coreHalf, y, z], [1, 0, 0], D.tubeDia),
    ], { componente: 'rodillo_transfer_63' });
    // 2 RODAMIENTOS 6004 2RS (20×42×12) ENTRE EJE Y TUBO, uno por extremo, con
    // TAPA/SELLO de extremo (acople lateral terminado)
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? -D.coreHalf + 2 : D.coreHalf - 2 - D.bearW;   // base +X del aro
      addPart(`MÓVIL · Rodamiento 6004 2RS rodillo línea y=${y} ${sx > 0 ? '+X' : '-X'}`, C.tambor, [x0, y, z], [
        cyl('Aro Ø42×12 (entre eje y tubo)', [x0, y, z], [1, 0, 0], D.bearDia, D.bearW),
        hole('Bore Ø20', [x0, y, z], [1, 0, 0], A + 0.1),
      ], { componente: 'rodamiento_6004_2rs' });
      // tapa de extremo del tubo (retiene el rodamiento y sella el rodillo)
      const xc = sx * (D.coreHalf - 3);
      addPart(`MÓVIL · Tapa de extremo rodillo línea y=${y} ${sx > 0 ? '+X' : '-X'}`, C.grisClaro, [xc, y, z], [
        cyl('Tapa Ø51×3', [xc, y, z], [sx, 0, 0], D.tubeDia, 3),
        hole('Paso eje Ø21', [xc, y, z], [sx, 0, 0], A + 1),
      ]);
    }
    // 2 PERNOS HEXAGONALES M10 (DIN 933) + golilla: entran DESDE FUERA de la
    // chapa y roscan en el eje macizo (retención axial y anti-giro).
    for (const sx of [-1, 1]) {
      const px = sx * (D.combX + D.plateT / 2);          // cara exterior de la placa
      addPart(`MÓVIL · Perno hexagonal M10 DIN 933 + golilla eje rodillo línea y=${y} ${sx > 0 ? '+X' : '-X'}`, C.acero, [px, y, z], [
        cyl('Golilla Ø22×2.5 DIN 125', [px, y, z], [sx, 0, 0], 22, 2.5),
        sketchYZn(`Cabeza hexagonal M10 (e.c. ${D.hexHead})`, px + sx * 2.5, hexPts(y, z, D.hexHead), D.hexHeadH, sx),
        cyl('Vástago M10 (rosca al eje)', [px, y, z], [-sx, 0, 0], D.axleDia - 10, 14),
      ], { componente: 'perno_hex_m10_din933' });
    }
  }
}

// ===========================================================================
// MÓVIL · 5. TRANSMISIÓN EN SERPENTÍN + MOTOR POR DENTRO (coaxial al tambor,
//    embridado en la cara interior de la placa -X)
// ===========================================================================
function transmision() {
  const [my, mz] = D.drumPos;
  // Transmisión en el EXTREMO +X (sobre los tramos desnudos de los rodillos):
  // el tambor Ø90 en beltPlane, apoyado en 1 UCFL204 (placa +X) y accionado por
  // el motor COAXIAL POR DENTRO, colgado bajo el eje. Acople rígido entre motor
  // y eje. SIT-LOCK fija el tambor (sin chaveta); chavetas solo en el acople.
  const xUCFL = D.combX + D.plateT / 2;          // apoyo del tambor en la placa +X
  const xCoup = D.beltPlane - 110;               // arranque del eje (lado reductor)
  const Lsh = r2(xUCFL + 3 - xCoup);             // largo del eje del tambor
  addPart('MÓVIL · Eje tambor Ø20 h6 torneado', C.grisClaro, [xCoup, my, mz], [
    cyl(`Cuerpo Ø20 h6 × ${Lsh}`, [xCoup, my, mz], [1, 0, 0], D.axleDia, Lsh),
    cyl('Chaflán 1.5×45° (-X)', [xCoup, my, mz], [1, 0, 0], D.axleDia - 3, 1.5),
    cyl('Chaflán 1.5×45° (+X)', [xUCFL + 1.5, my, mz], [1, 0, 0], D.axleDia - 3, 1.5),
    box('Chavetero 6×3.5 (acople)', [xCoup + 12, my, mz + D.axleDia / 2 - 1.75], 24, 6, 3.5, 'cut'),
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
  ], { componente: 'tambor_motriz_90x30' });
  // buje cónico autocentrante SIT-LOCK CAL 1 20×28: sin chaveta, autocentrado
  addPart('MÓVIL · Buje SIT-LOCK CAL 1 20×28 (tambor)', C.gris, [D.beltPlane - D.drumW / 2 - 2, my, mz], [
    cyl('Anillo cónico Ø28×' + (D.drumW - 4), [D.beltPlane - D.drumW / 2 + 2, my, mz], [1, 0, 0], 28, D.drumW - 4),
    cyl('Brida de apriete Ø38×6', [D.beltPlane - D.drumW / 2 - 2, my, mz], [1, 0, 0], 38, 6),
    hole('Bore Ø20.05 (autocentrante)', [D.beltPlane - D.drumW / 2 - 2, my, mz], [1, 0, 0], 20.05),
  ], { componente: 'casquillo_bloqueo_lk30' });
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
  // MOTORREDUCTOR DE EJE HUECO montado DIRECTO sobre el eje del tambor (sin
  // acople ni alineación): la solución simple y confiable de un transfer MRT.
  // Cuelga bajo el eje (en el rebaje del base) y reacciona con un BRAZO DE
  // TORQUE a un pasador en la placa +X (absorbe el par sin cargar el eje).
  const gmL = 84, gmBoss = 56;                 // reductor: largo y Ø del cubo hueco
  const xBody = xCoup + 30;                     // centro del cuerpo (hacia dentro del tambor)
  addPart('MÓVIL · Motorreductor de eje hueco (i≈6.3, ~0.18 kW)', C.motor, [xCoup, my, mz], [
    cyl(`Cubo de eje hueco Ø${gmBoss}×${gmL}`, [xCoup, my, mz], [1, 0, 0], gmBoss, gmL),
    box('Cuerpo reductor 96×86×92', [xBody, my, mz - 78], 96, 86, 92),
    hole('Bore Ø20 H7 (sobre el eje del tambor)', [xCoup, my, mz], [1, 0, 0], D.shaftDia + D.slide),
  ], { componente: 'motorreductor_eje_hueco' });
  // chaveta única de arrastre eje↔reductor (chavetero N9 en el eje)
  addPart('MÓVIL · Chaveta DIN 6885 A 6×6×40 (eje↔reductor)', C.grisClaro, [xCoup + 22, my, mz + D.axleDia / 2 - 1.75], [
    box('Chaveta 40×6×6', [xCoup + 22, my, mz + D.axleDia / 2 - 1.75], 40, 6, 6),
  ]);
  // brazo de reacción (torque arm): barra del cuerpo del reductor a un pasador
  // Ø12 en la placa +X (a media altura), con buje elástico
  const xArm = D.combX - D.plateT;              // apoyo en la placa +X
  const zArm = mz - 40;
  addPart('MÓVIL · Brazo de reacción (torque arm)', C.acero, [xBody + 30, my - 55, zArm], [
    box(`Barra ${r2(xArm - (xBody + 30))}×24×10`, [(xBody + 30 + xArm) / 2, my - 55, zArm], r2(xArm - (xBody + 30)), 24, 10),
    cyl('Buje elástico Ø24', [xArm, my - 55, zArm], [1, 0, 0], 24, 16),
    hole('Ø12.2 pasador a la placa', [xArm, my - 55, zArm], [1, 0, 0], 12.2),
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
    origen: 'gen_transfer90.mjs (paramétrico); transfer de rodillos estilo MRT sobre base twin-belt (STEP sorter_CO), funcional/fabricable/simple: 5 rodillos Ø63 vulcanizados (tubo de acero Ø51) de 800 mm de cara a paso 139 = 1 por hueco entre las 4 bandas pasantes del base (X=0/139/277/416); rodillo de EJE MUERTO MACIZO Ø20 perforado y roscado M10 (perno HEXAGONAL externo), con 2 rodamientos 6004 entre eje y tubo; accionamiento por banda plana (serpentín) al extremo con MOTORREDUCTOR DE EJE HUECO + brazo de torque; POP-UP POR BISAGRA en el lado -X (estructura lateral) + 2 cilindros verticales que suben el lado +X 6 mm (la cama bascula 0.41°); canal fijo no más ancho que las placas; módulos FIJO/MÓVIL identificados',
    anfitrion: 'equipo base = sorter de bandas STEP (sorter_CO): rieles T-slot, chumaceras UCFL/UC 205 y SKF 1206, transmisión AT10, ejes Ø20 H7, tornillería M6. El módulo NO modifica el base: se monta a los rieles T-slot y solo comparte su idioma de hardware.',
    integracion: 'módulo de desviación que se monta sobre el equipo base sin perforarlo: 4 pies de anclaje a riel T-slot con tuercas en T M6 (ajuste de posición X) + colisos M8 al canal (ajuste de altura ±7) + shims de nivelación. La altura de emergencia y la separación rodillo-tensora se calibran contra el plano de banda real del base.',
    estado_modelado: `ELEVADO (+${D.stroke} mm): tangente de rodillos a ${D.rollerZ + D.rollerDia / 2} = plano anfitrión + ${metrics.pop}`,
    tolerancias: {
      rodamientos: 'RODILLOS de EJE MUERTO: el eje NO gira; el tubo gira sobre 2 rodamientos 6004 2RS (20×42×12), uno por extremo (10 en 5 rodillos). CARGA ROTANTE EN EL ARO EXTERIOR (gira con el tubo) → aro exterior AJUSTE APRETADO en el bore del tubo (Ø42 N7) y aro interior HOLGADO sobre el eje muerto (Ø20 g6, deslizante) — regla SKF/Shigley para aro exterior rotante con carga estacionaria. Retención axial del tubo: hombro en el bore + circlip interior DIN 472 Ø42 por lado (o tapa de extremo atornillada). El TAMBOR conserva 1 UCFL204 (placa +X) + el rodamiento del motorreductor. Sin rodamientos de bolas desnudos sueltos.',
      eje_rodillo: 'EJE MUERTO MACIZO Ø20 (acero C45), largo 830 (entre placas), fijo a ambas placas: cada extremo PERFORADO Ø8.5 y ROSCADO M10 × 24 (hilo interior, engagement ≥ 2×Ø); desde FUERA de la chapa entra un PERNO HEXAGONAL M10 8.8 DIN 933 + golilla Ø22 (DIN 125) que lo sujeta (par 45 N·m, freno de rosca medio) y retiene axialmente (anti-giro por apriete). Flexión del eje despreciable: la carga entra por los rodamientos a ±386 y se reacciona en las placas a ±415 (voladizo 29). Alojamiento en placa Ø20.5. Chaflanes 1.5×45°.',
      tubo_rodillo: 'tubo de acero St37 Ø51 × 800 (bore Ø42 con asientos de rodamiento a J7/N7 en los extremos, hombro interior de tope), vulcanizado NBR 75 ShA a Ø63 salvo el extremo +X desnudo (x=355..400) donde la banda del serpentín lo arrastra por fricción; tapa de extremo + circlip DIN 472 por lado. Rulli de Ø51×800 es tamaño estándar de rodillo de transporte.',
      eje_tambor: 'eje del tambor Ø20 h6 apoyado en la UCFL204 (placa +X); lo acciona el motorreductor de eje hueco montado directo sobre él (chavetero 6×3.5 N9); chaflanes 1.5×45°.',
      idlers: 'tensores y retornos: ejes cantiléver Ø12 m6 prensados en la placa; poleas locas sobre BUJE de bronce autolubricado SAE 841 Ø18/Ø12.2 H7/f7 (sin rodamiento desnudo); retención axial arandela + tornillo M6.',
      tambor: 'SIT-LOCK CAL 1 20×28 en cubo Ø28 H7 (autocentrado, sin chaveta); 1 UCFL204 en placa +X; abombado corona +0.4. LAGGING de caucho ranurado (o cerámico) e=6 en la llanta → µ≥0.7 para el arrastre por fricción (Habasit/Euler: envoltura ≈200°, T1/T2=e^{µθ}). Ø90 > Ø mín de polea motriz para banda 3 mm.',
      motor: 'MOTORREDUCTOR DE EJE HUECO montado DIRECTO sobre el eje del tambor (sin acople ni alineación): cuelga en la ventana del base y reacciona con un BRAZO DE TORQUE a un pasador Ø12 en la placa +X. Solución simple y confiable (estilo MRT). 1 chaveta DIN 6885 A 6×6×40.',
      montaje: 'pies de anclaje a riel T-slot: tuerca en T M6 en ranura (ajuste X) + 2 colisos M8 al canal (ajuste altura ±7) + shims 1 mm de nivelación. CERO perforaciones en el equipo base.',
      elevacion_bisagra: 'POP-UP POR BISAGRA integrado en la estructura lateral: línea de bisagra (eje Y) al pie de la placa -X con nudillos + pasador Ø12 h9 en buje de bronce H7 (toma el empuje lateral, sin colisas). 2 cilindros ISO 6432 Ø32 VERTICALES a +X (x=300) suben el lado +X 6 mm → la cama bascula 0.41° (despreciable). Reparto: la bisagra toma ~0.5·W y cada cilindro ~0.26·W → SF muy holgado. Topes de altura M10 regulables fijan los +6 y descargan los cilindros en reposo.',
      pasador_guia: 'Ø8 m6 en la placa; colisa 8.5 del canal (juego 0.5) por la carrera 6.',
      tensado: 'tensores en colisa vertical 12.2×22 con eje roscado M12 y tuerca: rango ±5 mm.',
      neumatica: 'cilindros ISO 6432 Ø32 carrera 10 con rótulas DIN ISO 12240-4 M10 en ambos extremos; electroválvula 5/2 monoestable 24VDC. Dimensionado: 2×Ø32@6bar = 966 N × relación de palanca 1.67 × η 0.85 ≈ 1.37 kN vs carga de elevación (cassette ~64 kg + producto) ≈ 0.9 kN → SF ≈ 1.5.',
      correa: 'banda PLANA Habasit 35×3 (poliéster/NBR), empalme sin fin; poleas con abombado (crown) para autocentrado. Ø MÍN DE POLEA respetado: motriz/rodillos Ø51-90, tensores Ø80, RETORNOS Ø50 (subidos de Ø24, que quedaba por debajo del mínimo de contraflexión Habasit para 3 mm/2 telas).',
      velocidad: 'v tangencial rodillos 80 m/min → banda 60 m/min; tambor Ø90 ~212 rpm; motorreductor i≈6.3 (~0.18 kW). Chaveta del tambor 6×6: τ≈11 MPa (holgada).',
      revision_ingenieria: 'Revisión Shigley/Habasit/Hytrol/item aplicada: fits de rodamiento corregidos (aro exterior rotante apretado), poleas de retorno a Ø mín Habasit, cilindros redimensionados a Ø32 (SF 1.5), lagging del tambor, retención axial con circlip, roscas internas con engagement 2×Ø. Ver docs/REVISION_INGENIERIA.md.',
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
