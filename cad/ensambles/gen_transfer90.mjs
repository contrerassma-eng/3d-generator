#!/usr/bin/env node
// gen_transfer90.mjs — Generador paramétrico del MÓDULO DE TRANSFERENCIA 90°
// (solo el módulo de desviación pop-up, sin el módulo principal de bandas del
// transportador anfitrión). Emite `transfer_rodillos_90.json` (foto3d-cad).
//
// Especificación del usuario (capa `user`):
//   - Solo la transferencia: el módulo de desviación, nada más.
//   - 2 cilindros neumáticos ESTÁNDAR actuando EN DIAGONAL, carrera de 6 mm.
//   - Rodillos COMPLETOS (una sola pieza por línea) y VULCANIZADOS en toda la
//     cara MENOS EN UN EXTREMO: ahí sube (envuelve) el sistema de bandas de la
//     imagen de referencia — los rodillos son las poleas de la primera línea.
//   - Rodillos Ø50 con >= 50 mm entre tangentes; emergen entre las bandas
//     estrechas de 40 mm del transportador anfitrión (no modelado).
//   - Placas laterales portarodillos con la forma de la foto (peine).
//
// Sistema de coordenadas: X = flujo del anfitrión, Y = expulsión a 90°,
// Z = arriba. mm. Estado modelado: ELEVADO (+6 mm de carrera aplicados).
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
  stroke: 6,                     // carrera de elevación (espec. usuario)

  // Rodillos de desvío (3 líneas, completos)
  rollerLines: [-100, 0, 100],   // paso 100 → gap tangente 50 (espec. usuario)
  rollerDia: 50,                 // Ø vulcanizado
  coreDia: 44,                   // núcleo desnudo (extremo sin vulcanizar)
  rollerZ: 149,                  // eje elevado: tangente 174 = anfitrión + 4
  coreHalf: 145,                 // núcleo x = -145..145
  bareFrom: 93,                  // vulcanizado x = -145..93; desnudo 93..145
  axleDia: 12,                   // eje Ø12 h9 → Ø12.2
  axleHalf: 165,                 // eje x = -165..165

  // Placas portarodillos (peine, forma de la foto)
  combX: 150,                    // planos medios x = ±150
  plateT: 6,
  combTop: 165,                  // lóbulos R16 sobre cada eje
  combValley: 137,
  combBottom: 122,
  footY: 130, footW: 30,         // pies-pestaña sobre los largueros

  // Sistema de bandas de transmisión (los rodillos = poleas de primera línea)
  bandT: 3, bandW: 15,           // banda plana 15×3: exterior queda AL RAS del Ø50
  bandX1: 106,                   // plano banda R1↔R2 (centro)
  bandX2: 134,                   // plano banda R2↔R3 y banda motriz (escalonadas)
  motorPulleyDia: 50, motorPulleyW: 20,
  motorAxis: { y: -140, z: 70 }, // bajo para que la banda motriz libre el larguero

  // Marco elevador
  beamY: 130,                    // largueros en y = ±130
  beamZ: [110, 122],
  cylPos: [[-105, -130], [105, 130]],   // cilindros EN DIAGONAL (esquinas opuestas)
  pinPos: [[105, -130], [-105, 130]],   // pines guía en la diagonal contraria
  pinDia: 16,

  // Bastidor fijo
  frameY: 180,                   // placas laterales fijas
  frameL: 230, frameH: 140,
  tubeX: [-60, 60], tubeZ: [30, 70],
  baseT: 6, baseW: 480, baseD: 400,

  // Holguras del método
  slide: 0.2, M4: 4.5, M5: 5.5, M6: 6.6, M8: 9.0, M10: 11.0,
};

// ---------------------------------------------------------------------------
// Verificaciones (fallan = no se emite el JSON)
// ---------------------------------------------------------------------------
function verify() {
  const e = [];
  const pitch = D.rollerLines[1] - D.rollerLines[0];
  const tangentGap = pitch - D.rollerDia;
  if (tangentGap < 50) e.push(`gap tangente ${tangentGap} < 50 mm (espec. usuario)`);
  if (40 > tangentGap - 2 * 4) e.push(`la banda anfitriona de 40 no pasa con >=4 mm por lado en el gap ${tangentGap}`);
  const pop = (D.rollerZ + D.rollerDia / 2) - D.hostPlane;
  const drop = D.hostPlane - (D.rollerZ - D.stroke + D.rollerDia / 2);
  if (pop < 3 || pop > 6) e.push(`sobre-elevación ${pop} fuera de 3..6 mm`);
  if (drop < 1) e.push(`retraído, el rodillo no baja del plano anfitrión (${drop})`);
  // banda sobre el núcleo desnudo queda AL RAS del vulcanizado
  if (D.coreDia / 2 + D.bandT !== D.rollerDia / 2) e.push('banda sobre núcleo no queda al ras del vulcanizado');
  // las bandas escalonadas caben en el extremo desnudo sin tocarse
  const bare = [D.bareFrom, D.coreHalf];
  for (const bx of [D.bandX1, D.bandX2]) {
    if (bx - D.bandW / 2 < bare[0] || bx + D.bandW / 2 > bare[1]) e.push(`banda en x=${bx} fuera del tramo desnudo`);
  }
  if (Math.abs(D.bandX2 - D.bandX1) < D.bandW + 2) e.push('bandas de transmisión se tocan');
  // cilindros en diagonal y pines en la diagonal contraria
  const [c1, c2] = D.cylPos;
  if (c1[0] !== -c2[0] || c1[1] !== -c2[1]) e.push('cilindros no están en esquinas diagonales opuestas');
  const [g1, g2] = D.pinPos;
  if (g1[0] !== -g2[0] || g1[1] !== -g2[1]) e.push('pines guía no están en la diagonal contraria');
  // material mínimo alrededor del agujero del eje en el lóbulo del peine
  if (D.combTop - D.rollerZ < 1.5 * (D.axleDia + D.slide) - 3) e.push('lóbulo del peine con poco material sobre el eje');
  // el peine elevado no alcanza el plano del anfitrión
  if (D.combTop >= D.hostPlane - 3) e.push('peine invade el plano de transporte');
  if (e.length) throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - '));
  return { tangentGap, pop, drop, carrera: D.stroke };
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
// boceto XZ (normal -Y, u=+X, v=+Z): la unión extruye de yFace hacia -Y;
// el corte quita material del lado +Y de yFace (anclar en la cara opuesta)
const sketchXZ = (name, yFace, pts, h, op = 'union') =>
  ({ id: fid(), name, shape: 'sketch', op, at: [0, yFace, 0], dir: [0, -1, 0], params: { pts, h, u: [1, 0, 0] } });
// boceto YZ (normal +X, u=+Y, v=+Z): la unión extruye de xFace hacia +X;
// el corte quita material del lado -X de xFace
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

const r2 = (v) => Math.round(v * 100) / 100;
function arcPts(cu, cv, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([r2(cu + r * Math.cos(a)), r2(cv + r * Math.sin(a))]);
  }
  return out;
}
// Contorno de correa alrededor de dos circunferencias (radios r1, r2 quizá
// distintos): dos arcos envolventes unidos por las tangentes exteriores.
function beltContour(c1, r1, c2, r2, n = 28) {
  const dy = c2[0] - c1[0], dz = c2[1] - c1[1];
  const d = Math.hypot(dy, dz);
  const psi = Math.atan2(dz, dy);
  const phi = Math.asin((r1 - r2) / d);
  // normales de tangencia: psi ± (π/2 + phi)
  const aUp = psi + Math.PI / 2 + phi, aDn = psi - Math.PI / 2 - phi;
  return [
    ...arcPts(c1[0], c1[1], r1, aUp, aDn + 2 * Math.PI, n),   // envuelve c1 por el lado lejano
    ...arcPts(c2[0], c2[1], r2, aDn + 2 * Math.PI, aUp + 2 * Math.PI, n), // envuelve c2 por el frente
  ];
}

const C = {
  azul: '#2a4fd7', azulOscuro: '#1e3aa8', banda: '#212121', caucho: '#37474f',
  acero: '#78909c', grisClaro: '#b0bec5', gris: '#90a4ae',
  motor: '#546e7a', neumatico: '#cfd8dc',
};

// ===========================================================================
// 1. PLACA BASE (pieza fija) — ranuras láser, patrones de brida y anclaje
// ===========================================================================
function placaBase() {
  const f = [box(`Placa base ${D.baseW}×${D.baseD}×6`, [0, 0, 0], D.baseW, D.baseD, D.baseT)];
  for (const x of [-180, 0, 180]) for (const s of [-1, 1]) {
    f.push(box(`Ranura pestaña lateral x=${x}`, [x, s * D.frameY, 0], 41, D.plateT + 0.5, D.baseT, 'cut'));
  }
  // brida de cada cilindro neumático: 4×Ø5.5 en patrón 45×45
  for (const [cx, cy] of D.cylPos) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    f.push(hole('Ø5.5 brida neumático', [cx + sx * 22.5, cy + sy * 22.5, D.baseT], [0, 0, -1], D.M5));
  }
  // brida de cada pin guía: 2×Ø4.5
  for (const [px, py] of D.pinPos) for (const s of [-1, 1]) {
    f.push(hole('Ø4.5 brida pin guía', [px + s * 18, py, D.baseT], [0, 0, -1], D.M4));
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    f.push(hole('Anclaje Ø11 al anfitrión', [sx * 220, sy * 180, D.baseT], [0, 0, -1], D.M10));
  }
  addPart('Placa base', C.azulOscuro, [0, 0, 0], f);
}

// ===========================================================================
// 2. PLACAS LATERALES FIJAS (contorno de la foto: chaflanes, ventanas, pestañas)
//    Bajas (top 140) para no invadir la expulsión a 90° sobre el plano 170.
// ===========================================================================
function placasLateralesFijas() {
  const L = D.frameL, H = D.frameH, zb = D.baseT;
  const outline = [
    [-L, zb], [-L, 100], [-190, H], [190, H], [L, 100], [L, zb],
    [200, zb], [200, 0], [160, 0], [160, zb],
    [20, zb], [20, 0], [-20, 0], [-20, zb],
    [-160, zb], [-160, 0], [-200, 0], [-200, zb],
  ];
  const ventana = (cx, cz, w, h, r) => {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - h / 2, z1 = cz + h / 2;
    return [
      ...arcPts(x1 - r, z1 - r, r, 0, Math.PI / 2, 6),
      ...arcPts(x0 + r, z1 - r, r, Math.PI / 2, Math.PI, 6),
      ...arcPts(x0 + r, z0 + r, r, Math.PI, 1.5 * Math.PI, 6),
      ...arcPts(x1 - r, z0 + r, r, 1.5 * Math.PI, 2 * Math.PI, 6),
    ];
  };
  for (const s of [-1, 1]) {
    const yFace = s * D.frameY + D.plateT / 2;
    const f = [sketchXZ('Contorno lateral (chaflanes + pestañas)', yFace, outline, D.plateT)];
    for (const cx of [-110, 110]) {
      f.push(sketchXZ(`Ventana aligeramiento (${cx},90)`, yFace - D.plateT, ventana(cx, 90, 100, 30, 10), D.plateT, 'cut'));
    }
    for (const x of D.tubeX) for (const z of [40, 60]) {
      f.push(hole(`Ø9 travesaño x=${x}`, [x, yFace, z], [0, -1, 0], D.M8));
    }
    addPart(`Placa lateral fija ${s > 0 ? '+Y' : '-Y'}`, C.azul, [0, s * D.frameY, 0], f);
  }
}

// ===========================================================================
// 3. TRAVESAÑOS FIJOS 40×40×2 con placas de extremo
// ===========================================================================
function travesanosFijos() {
  const yIn = D.frameY - D.plateT / 2;
  for (const x of D.tubeX) {
    const f = [
      box('Tubo 40×40×2', [x, 0, D.tubeZ[0]], 40, 2 * (yIn - 5), 40),
      box('Alma hueca', [x, 0, D.tubeZ[0] + 2], 36, 2 * (yIn - 5) + 1, 36, 'cut'),
    ];
    for (const s of [-1, 1]) {
      f.push(box(`Placa extremo ${s > 0 ? '+Y' : '-Y'}`, [x, s * (yIn - 2.5), 20], 60, 5, 60));
      for (const z of [40, 60]) f.push(hole('Ø9 M8 a lateral', [x, s * yIn, z], [0, -s, 0], D.M8));
    }
    addPart(`Travesaño fijo x=${x}`, C.acero, [x, 0, D.tubeZ[0]], f);
  }
}

// ===========================================================================
// 4. ELEVACIÓN: 2 cilindros estándar EN DIAGONAL (carrera 6) + 2 pines guía
// ===========================================================================
function elevacion() {
  for (const [cx, cy] of D.cylPos) {
    const f = [
      box('Brida 55×55×5', [cx, cy, D.baseT], 55, 55, 5),
      cyl('Cuerpo Ø25 (ISO 6432)', [cx, cy, D.baseT + 5], [0, 0, 1], 25, 70),
      cyl('Vástago Ø10 (extendido +6)', [cx, cy, D.baseT + 75], [0, 0, 1], 10, D.beamZ[0] - D.baseT - 75),
    ];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      f.push(hole('Ø5.5 brida', [cx + sx * 22.5, cy + sy * 22.5, D.baseT + 5], [0, 0, -1], D.M5, 5, false));
    }
    addPart(`Cilindro neumático Ø25 (${cx},${cy})`, C.neumatico, [cx, cy, D.baseT], f);
  }
  for (const [px, py] of D.pinPos) {
    const f = [
      cyl('Brida Ø50×5', [px, py, D.baseT], [0, 0, 1], 50, 5),
      cyl(`Pin Ø${D.pinDia} rectificado`, [px, py, D.baseT + 5], [0, 0, 1], D.pinDia, 105),
    ];
    for (const s of [-1, 1]) f.push(hole('Ø4.5 brida', [px + s * 18, py, D.baseT + 5], [0, 0, -1], D.M4, 5, false));
    addPart(`Pin guía Ø16 (${px},${py})`, C.grisClaro, [px, py, D.baseT], f);
  }
}

// ===========================================================================
// 5. LARGUEROS ELEVADORES: ranuras láser para los peines, casquillos guía,
//    anclaje de vástagos y de la ménsula del motor
// ===========================================================================
function largueros() {
  for (const s of [-1, 1]) {
    const y = s * D.beamY;
    const f = [box('Larguero 340×40×12', [0, y, D.beamZ[0]], 340, 40, D.beamZ[1] - D.beamZ[0])];
    for (const x of [-D.combX, D.combX]) {
      f.push(box(`Ranura peine x=${x}`, [x, y, D.beamZ[0]], D.plateT + 0.5, D.footW + 0.5, D.beamZ[1] - D.beamZ[0], 'cut'));
    }
    // extremo con cilindro y extremo con casquillo guía (disposición diagonal)
    const cyl_ = D.cylPos.find(([, cy]) => cy === y);
    const pin_ = D.pinPos.find(([, py]) => py === y);
    f.push(hole('Ø8.5 vástago M8', [cyl_[0], y, D.beamZ[0]], [0, 0, 1], 8.5, 12, false));
    f.push(cyl('Casquillo guía Ø30', [pin_[0], y, D.beamZ[0] - 20], [0, 0, 1], 30, 20));
    f.push(hole('Buje Ø16.2', [pin_[0], y, D.beamZ[1]], [0, 0, -1], D.pinDia + D.slide, 32, false));
    if (s < 0) { // lado motor: 2×Ø6.6 para la ménsula
      for (const x of [140, 160]) f.push(hole('Ø6.6 ménsula motor', [x, y, D.beamZ[0]], [0, 0, 1], D.M6));
    }
    addPart(`Larguero elevador y=${y}`, C.acero, [0, y, D.beamZ[0]], f);
  }
}

// ===========================================================================
// 6. PLACAS PORTARODILLOS (el peine de la foto: 3 lóbulos R16, valles,
//    chaflanes y pies-pestaña) — sujetan los 3 rodillos completos
// ===========================================================================
function contornoPeine() {
  const zL = D.rollerZ, rL = 16, zV = D.combValley, zB = D.combBottom, zT = D.beamZ[0];
  const dy = Math.sqrt(rL * rL - (zL - zV) ** 2);
  const aIn = Math.atan2(zV - zL, -dy), aOut = Math.atan2(zV - zL, dy);
  const pts = [[-160, zB], [-160, 128], [-150, zV]];
  for (const cy of D.rollerLines) {
    pts.push(...arcPts(cy, zL, rL, aIn + 2 * Math.PI, aOut + 2 * Math.PI, 20));
  }
  pts.push([150, zV], [160, 128], [160, zB]);
  for (const cy of [D.footY, -D.footY]) {
    pts.push([cy + D.footW / 2, zB], [cy + D.footW / 2, zT], [cy - D.footW / 2, zT], [cy - D.footW / 2, zB]);
  }
  return pts.map(([u, v]) => [r2(u), r2(v)]);
}
function peines() {
  const outline = contornoPeine();
  for (const sx of [-1, 1]) {
    const xFace = sx * D.combX - D.plateT / 2;
    const f = [sketchYZ('Contorno peine (lóbulos + pies)', xFace, outline, D.plateT)];
    for (const y of D.rollerLines) {
      f.push(hole(`Ø12.2 eje línea y=${y}`, [xFace, y, D.rollerZ], [1, 0, 0], D.axleDia + D.slide));
    }
    addPart(`Placa portarodillos x=${sx * D.combX}`, C.azul, [xFace, 0, D.beamZ[0]], f);
  }
}

// ===========================================================================
// 7. RODILLOS COMPLETOS: núcleo Ø44 + vulcanizado Ø50 menos el extremo
//    desnudo (ahí suben las bandas: el rodillo es la polea) + ejes Ø12
// ===========================================================================
function rodillos() {
  for (const y of D.rollerLines) {
    addPart(`Eje rodillo Ø12 línea y=${y}`, C.grisClaro, [-D.axleHalf, y, D.rollerZ], [
      cyl(`Eje Ø12 × ${2 * D.axleHalf}`, [-D.axleHalf, y, D.rollerZ], [1, 0, 0], D.axleDia, 2 * D.axleHalf),
    ]);
    const f = [
      cyl(`Núcleo Ø${D.coreDia} × ${2 * D.coreHalf}`, [-D.coreHalf, y, D.rollerZ], [1, 0, 0], D.coreDia, 2 * D.coreHalf),
      cyl(`Vulcanizado Ø${D.rollerDia} (hasta x=${D.bareFrom})`, [-D.coreHalf, y, D.rollerZ], [1, 0, 0], D.rollerDia, D.coreHalf + D.bareFrom),
      hole('Barreno Ø12.2', [-D.coreHalf, y, D.rollerZ], [1, 0, 0], D.axleDia + D.slide),
    ];
    addPart(`Rodillo completo vulcanizado línea y=${y}`, C.caucho, [0, y, D.rollerZ - D.rollerDia / 2], f,
      { componente: 'rodillo_vulcanizado_50x290' });
  }
}

// ===========================================================================
// 8. SISTEMA DE BANDAS DE TRANSMISIÓN (en el extremo desnudo): R1↔R2, R2↔R3
//    escalonadas + banda motriz motor→R1; exterior AL RAS del vulcanizado
// ===========================================================================
function bandaTransmision(name, xCenter, c1, r1, c2, r2) {
  const xE = xCenter + D.bandW / 2; // cara este; unión ancla oeste, corte ancla este
  const f = [
    sketchYZ('Contorno exterior', xCenter - D.bandW / 2, beltContour(c1, r1 + D.bandT, c2, r2 + D.bandT), D.bandW),
    sketchYZ('Vaciado interior', xE, beltContour(c1, r1, c2, r2), D.bandW, 'cut'),
  ];
  addPart(name, C.banda, [xCenter, (c1[0] + c2[0]) / 2, Math.min(c1[1], c2[1])], f);
}
function bandas() {
  const rC = D.coreDia / 2;
  const [l1, l2, l3] = D.rollerLines;
  bandaTransmision(`Banda transmisión R1↔R2 (x=${D.bandX1})`, D.bandX1, [l1, D.rollerZ], rC, [l2, D.rollerZ], rC);
  bandaTransmision(`Banda transmisión R2↔R3 (x=${D.bandX2})`, D.bandX2, [l2, D.rollerZ], rC, [l3, D.rollerZ], rC);
  bandaTransmision(`Banda motriz motor→R1 (x=${D.bandX2})`, D.bandX2,
    [D.motorAxis.y, D.motorAxis.z], D.motorPulleyDia / 2, [l1, D.rollerZ], rC);
}

// ===========================================================================
// 9. ACCIONAMIENTO: ménsula colgada del larguero, motorreductor y polea motriz
//    (montados en el marco elevador: la tensión no cambia con la carrera)
// ===========================================================================
function accionamiento() {
  const { y: my, z: mz } = D.motorAxis;
  const f = [
    box('Ala superior 42×40×6', [151, -D.beamY, D.beamZ[0] - 6], 42, 40, 6),
    box('Placa vertical 6×70×70', [173, my, 40], 6, 70, 70),
  ];
  for (const x of [140, 160]) f.push(hole('Ø6.6 a larguero', [x, -D.beamY, D.beamZ[0] - 6], [0, 0, 1], D.M6));
  f.push(hole('Paso eje motor Ø12.4', [170, my, mz], [1, 0, 0], D.axleDia + 0.4));
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    f.push(hole('Ø5.5 patrón motor', [176, my + sy * 25, mz + sz * 20], [-1, 0, 0], D.M5));
  }
  addPart('Ménsula motorreductor', C.azulOscuro, [150, -D.beamY, D.beamZ[0] - 6], f);
  addPart('Motorreductor', C.motor, [176, my, mz - 35], [
    box('Cuerpo 90×70×70', [221, my, mz - 35], 90, 70, 70),
    cyl('Eje salida Ø12', [176, my, mz], [-1, 0, 0], D.axleDia, 56),
  ]);
  addPart('Polea motriz Ø50×20', C.acero, [D.bandX2 - D.motorPulleyW / 2, my, mz], [
    cyl(`Polea Ø${D.motorPulleyDia}×${D.motorPulleyW}`, [D.bandX2 - D.motorPulleyW / 2, my, mz], [1, 0, 0], D.motorPulleyDia, D.motorPulleyW),
    hole('Barreno Ø12.2 + prisionero', [D.bandX2 - D.motorPulleyW / 2, my, mz], [1, 0, 0], D.axleDia + D.slide),
  ]);
}

// ===========================================================================
// Ensamblar y emitir
// ===========================================================================
const metrics = verify();
placaBase();
placasLateralesFijas();
travesanosFijos();
elevacion();
largueros();
peines();
rodillos();
bandas();
accionamiento();

const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Transferencia 90° — módulo de desviación pop-up (rodillos vulcanizados)',
    capa: 'user',
    origen: 'gen_transfer90.mjs (paramétrico); espec. usuario: solo el módulo de desvío, 2 cilindros estándar en diagonal con carrera 6, rodillos completos vulcanizados menos el extremo donde las bandas los usan como poleas de primera línea',
    anfitrion: 'transportador de bandas estrechas de 40 mm (plano a 170 mm) — NO modelado',
    estado_modelado: `ELEVADO (+${D.stroke} mm): tangente de rodillos a ${D.rollerZ + D.rollerDia / 2} = plano anfitrión + ${metrics.pop}`,
    verificaciones: metrics,
  },
  parts,
  constraints: [],
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'transfer_rodillos_90.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas, ${nf} funciones → ${out}`);
console.log(`   gap tangente=${metrics.tangentGap}  sobre-elevación=+${metrics.pop}  bajada=-${metrics.drop}  carrera=${metrics.carrera}`);
