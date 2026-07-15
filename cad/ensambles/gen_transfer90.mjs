#!/usr/bin/env node
// gen_transfer90.mjs — Generador paramétrico del MÓDULO DE TRANSFERENCIA 90°
// (solo el módulo de desviación pop-up). Emite `transfer_rodillos_90.json`
// (formato foto3d-cad).
//
// Especificación del usuario (capa `user`), iterada contra las fotos SID y
// el esquema de transmisión dibujado por el usuario (IMG_3102):
//   - Solo la transferencia: el módulo de desviación, nada más.
//   - 6 RODILLOS COMPLETOS (misma cantidad que la unidad de 90° de la foto),
//     vulcanizados en toda la cara MENOS EN UN EXTREMO (ahí sube la banda:
//     el rodillo es la polea de la primera línea).
//   - TRANSMISIÓN COMO EL ESQUEMA DEL USUARIO — NO rodillo a rodillo: UNA
//     sola banda en SERPENTÍN que pasa sobre el tramo desnudo de cada
//     rodillo, baja alrededor de un rodillo tensor entre cada par, envuelve
//     el TAMBOR MOTRIZ "M" al centro abajo y cierra por abajo con 2 POLEAS
//     DE RETORNO en las esquinas. Todo desde abajo, montado en el marco
//     elevador (la tensión no cambia con la carrera).
//   - 2 cilindros neumáticos ESTÁNDAR actuando EN DIAGONAL, carrera de 6 mm.
//   - Rodillos Ø50 con >= 50 mm entre tangentes; emergen entre las bandas
//     estrechas de 40 mm del transportador anfitrión (no modelado).
//   - Placas laterales portarodillos con la forma de la foto (peine con
//     lóbulos + faldón profundo que porta la transmisión).
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
  stroke: 6,                     // carrera de elevación (espec. usuario)

  // Rodillos de desvío (6, completos — como la foto de 90°)
  rollerLines: [-250, -150, -50, 50, 150, 250], // paso 100 → gap tangente 50
  rollerDia: 50,                 // Ø vulcanizado
  coreDia: 44,                   // núcleo desnudo (tramo de polea)
  rollerZ: 149,                  // eje elevado: tangente 174 = anfitrión + 4
  coreHalf: 145,                 // núcleo x = -145..145
  bareFrom: 93,                  // vulcanizado x = -145..93; desnudo 93..145
  axleDia: 12, axleHalf: 165,    // ejes Ø12 h9 → agujero Ø12.2

  // Placas portarodillos (peine de la foto + faldón de transmisión)
  combX: 150, plateT: 6,
  combValley: 137,
  plateHalfY: 310, apronBottom: 18,

  // Transmisión en SERPENTÍN (esquema del usuario IMG_3102)
  bandT: 3, bandW: 25,           // banda plana 25×3 (amarilla, como la foto 90°)
  beltPlane: 119,                // plano x del serpentín (centro del tramo desnudo)
  idlerDia: 24,                  // rodillos tensores entre cada par de rodillos
  idlerPos: [[-200, 118], [-100, 118], [100, 118], [200, 118]],
  retDia: 24,                    // poleas de retorno (esquinas inferiores)
  retPos: [[-280, 36], [280, 36]],
  drumDia: 90, drumW: 30,        // tambor motriz M (bore Ø25.2)
  drumPos: [0, 78],              // (y, z) del eje del tambor
  shaftDia: 25,                  // eje del tambor: apoyado en AMBAS placas
  pulleyW: 29,                   // ancho de tensores y retornos (banda + 4)

  // Marco elevador: puentes fuera del campo de la banda + cilindros diagonales
  bridgeY: 295, bridgeZ: [105, 117], bridgeL: 380,
  cylPos: [[-180, -295], [180, 295]],  // cilindros EN DIAGONAL
  pinPos: [[180, -295], [-180, 295]],  // pines guía en la diagonal contraria
  pinDia: 16,

  // Bastidor fijo
  frameY: 330, frameL: 230, frameH: 140,
  tubeX: [-60, 20], tubeZ: [20, 60],
  baseT: 6, baseW: 480, baseD: 700,

  // Holguras del método
  slide: 0.2, M4: 4.5, M5: 5.5, M6: 6.6, M8: 9.0, M10: 11.0,
};

// Secuencia del serpentín en orden de marcha (circunferencias dirigidas):
// s = +1 la banda gira CCW alrededor del centro, s = -1 CW.
// retorno izq → R1..R3 (sobre), tensores (bajo), M (envuelto), R4..R6 → retorno der.
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
// La línea media corre a r+T/2 de cada centro; las dos caras a r y r+T.
// ---------------------------------------------------------------------------
const r2 = (v) => Math.round(v * 100) / 100;
function serpentineFaces(seq, T, n = 22) {
  const rc = seq.map(q => q.r + T / 2);
  const N = seq.length;
  // normal compartida de la tangente i → i+1: n = a·u + b·rot90(u), b = -√(1-a²)
  const normals = [];
  for (let i = 0; i < N; i++) {
    const q1 = seq[i], q2 = seq[(i + 1) % N];
    const dy = q2.c[0] - q1.c[0], dz = q2.c[1] - q1.c[1], d = Math.hypot(dy, dz);
    const a = (q1.s * rc[i] - q2.s * rc[(i + 1) % N]) / d;
    if (Math.abs(a) >= 1) throw new Error(`serpentín: sin tangente entre tramo ${i} y ${i + 1}`);
    const b = -Math.sqrt(1 - a * a);
    const u = [dy / d, dz / d], w = [-u[1], u[0]];   // w = rot90(u)
    normals.push([a * u[0] + b * w[0], a * u[1] + b * w[1]]);
  }
  const faces = [[], []]; // [cara de contacto con rodillos, cara opuesta]
  for (let i = 0; i < N; i++) {
    const q = seq[i];
    const nIn = normals[(i + N - 1) % N], nOut = normals[i];
    // punto de contacto en c + s·r·n → ángulo del punto
    let aIn = Math.atan2(q.s * nIn[1], q.s * nIn[0]);
    let aOut = Math.atan2(q.s * nOut[1], q.s * nOut[0]);
    if (q.s > 0) { while (aOut < aIn - 1e-9) aOut += 2 * Math.PI; }
    else { while (aOut > aIn + 1e-9) aOut -= 2 * Math.PI; }
    // caras: radio r (contacto propio) y r+T (dorso), mismo ángulo de barrido
    faces[0].push(...arcPts(q.c[0], q.c[1], q.s > 0 ? q.r : q.r + T, aIn, aOut, n));
    faces[1].push(...arcPts(q.c[0], q.c[1], q.s > 0 ? q.r + T : q.r, aIn, aOut, n));
  }
  // exterior = polígono de mayor área
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
function insidePolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) &&
        pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
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
  if (40 > tangentGap - 2 * 4) e.push(`la banda anfitriona de 40 no pasa con >=4 mm por lado en el gap ${tangentGap}`);
  const pop = (D.rollerZ + D.rollerDia / 2) - D.hostPlane;
  const drop = D.hostPlane - (D.rollerZ - D.stroke + D.rollerDia / 2);
  if (pop < 3 || pop > 6) e.push(`sobre-elevación ${pop} fuera de 3..6 mm`);
  if (drop < 1) e.push(`retraído, el rodillo no baja del plano anfitrión (${drop})`);
  if (D.coreDia / 2 + D.bandT !== D.rollerDia / 2) e.push('banda sobre núcleo no queda al ras del vulcanizado');
  if (D.beltPlane - D.bandW / 2 < D.bareFrom || D.beltPlane + D.bandW / 2 > D.coreHalf) {
    e.push('el serpentín se sale del tramo desnudo del rodillo');
  }
  const [c1, c2] = D.cylPos;
  if (c1[0] !== -c2[0] || c1[1] !== -c2[1]) e.push('cilindros no están en esquinas diagonales opuestas');
  const [g1, g2] = D.pinPos;
  if (g1[0] !== -g2[0] || g1[1] !== -g2[1]) e.push('pines guía no están en la diagonal contraria');
  // el serpentín construye (tangentes válidas) y no invade nada
  let poly;
  try {
    poly = serpentineFaces(serpentine(), D.bandT).outer;
  } catch (err) {
    e.push(err.message);
  }
  if (poly) {
    for (const [u, v] of poly) {
      if (v < D.baseT + 4) e.push(`el serpentín raspa la placa base (z=${v})`);
      if (v > D.rollerZ + D.rollerDia / 2 + 1e-6) e.push(`el serpentín sobresale del plano de rodillos (z=${v})`);
      // puentes elevadores y cuerpos de cilindros/pines (x=±180 fuera del plano
      // de banda; solo el puente cruza el plano x=119)
      if (Math.abs(u) > D.bridgeY - 12 && v > D.bridgeZ[0] - 4 && v < D.bridgeZ[1] + 4) {
        e.push(`el serpentín toca el puente elevador (y=${u}, z=${v})`);
      }
    }
    // los ejes cantiléver de tensores/retornos no atraviesan el lazo en otro punto
    for (const [py, pz] of [...D.idlerPos, ...D.retPos]) {
      let hits = 0;
      for (const [qy, qz] of [...D.idlerPos, ...D.retPos]) {
        if (qy === py && qz === pz) continue;
        if (Math.hypot(qy - py, qz - pz) < D.idlerDia + 2) hits++;
      }
      if (hits) e.push(`tensores/retornos demasiado juntos en (${py},${pz})`);
    }
    // separación tambor M ↔ ramal inferior y M ↔ rodillos vecinos
    const beltBottomTop = D.retPos[0][1] - D.retDia / 2;              // cara superior del ramal inferior
    if (D.drumPos[1] - D.drumDia / 2 - D.bandT - beltBottomTop < 2) e.push('tambor M toca el ramal inferior');
    for (const L of D.rollerLines) {
      const dd = Math.hypot(D.drumPos[0] - L, D.drumPos[1] - D.rollerZ);
      if (dd < D.drumDia / 2 + D.rollerDia / 2 + 2) e.push(`tambor M toca el rodillo y=${L}`);
    }
  }
  return e.length
    ? (() => { throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - ')); })()
    : { tangentGap, pop, drop, carrera: D.stroke, rodillos: D.rollerLines.length };
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
// boceto XZ (normal -Y, u=+X, v=+Z): unión extruye hacia -Y desde yFace;
// corte quita material del lado +Y (anclar en la cara opuesta)
const sketchXZ = (name, yFace, pts, h, op = 'union') =>
  ({ id: fid(), name, shape: 'sketch', op, at: [0, yFace, 0], dir: [0, -1, 0], params: { pts, h, u: [1, 0, 0] } });
// boceto YZ (normal +X, u=+Y, v=+Z): unión extruye hacia +X desde xFace;
// corte quita material del lado -X
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
  azul: '#2a4fd7', azulOscuro: '#1e3aa8', banda: '#e6c229', caucho: '#212121',
  acero: '#78909c', grisClaro: '#b0bec5', gris: '#90a4ae',
  motor: '#546e7a', neumatico: '#cfd8dc', tambor: '#4a5560',
};

// ===========================================================================
// 1. PLACA BASE (pieza fija)
// ===========================================================================
function placaBase() {
  const f = [box(`Placa base ${D.baseW}×${D.baseD}×6`, [0, 0, 0], D.baseW, D.baseD, D.baseT)];
  for (const x of [-180, 0, 180]) for (const s of [-1, 1]) {
    f.push(box(`Ranura pestaña lateral x=${x}`, [x, s * D.frameY, 0], 41, D.plateT + 0.5, D.baseT, 'cut'));
  }
  for (const [cx, cy] of D.cylPos) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    f.push(hole('Ø5.5 brida neumático', [cx + sx * 22.5, cy + sy * 22.5, D.baseT], [0, 0, -1], D.M5));
  }
  for (const [px, py] of D.pinPos) for (const s of [-1, 1]) {
    f.push(hole('Ø4.5 brida pin guía', [px + s * 18, py, D.baseT], [0, 0, -1], D.M4));
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    f.push(hole('Anclaje Ø11 al anfitrión', [sx * 220, sy * 330, D.baseT], [0, 0, -1], D.M10));
  }
  addPart('Placa base', C.azulOscuro, [0, 0, 0], f);
}

// ===========================================================================
// 2. PLACAS LATERALES FIJAS (contorno de la foto) y 3. TRAVESAÑOS FIJOS
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
    for (const x of D.tubeX) for (const z of [30, 50]) {
      f.push(hole(`Ø9 travesaño x=${x}`, [x, yFace, z], [0, -1, 0], D.M8));
    }
    addPart(`Placa lateral fija ${s > 0 ? '+Y' : '-Y'}`, C.azul, [0, s * D.frameY, 0], f);
  }
}
function travesanosFijos() {
  const yIn = D.frameY - D.plateT / 2;
  for (const x of D.tubeX) {
    const f = [
      box('Tubo 40×40×2', [x, 0, D.tubeZ[0]], 40, 2 * (yIn - 5), 40),
      box('Alma hueca', [x, 0, D.tubeZ[0] + 2], 36, 2 * (yIn - 5) + 1, 36, 'cut'),
    ];
    for (const s of [-1, 1]) {
      f.push(box(`Placa extremo ${s > 0 ? '+Y' : '-Y'}`, [x, s * (yIn - 2.5), 10], 60, 5, 60));
      for (const z of [30, 50]) f.push(hole('Ø9 M8 a lateral', [x, s * yIn, z], [0, -s, 0], D.M8));
    }
    addPart(`Travesaño fijo x=${x}`, C.acero, [x, 0, D.tubeZ[0]], f);
  }
}

// ===========================================================================
// 4. ELEVACIÓN: 2 cilindros estándar EN DIAGONAL (carrera 6) + 2 pines guía
//    + 2 puentes elevadores que atraviesan ambas placas (pestaña-ranura)
// ===========================================================================
function elevacion() {
  for (const [cx, cy] of D.cylPos) {
    const f = [
      box('Brida 55×55×5', [cx, cy, D.baseT], 55, 55, 5),
      cyl('Cuerpo Ø25 (ISO 6432)', [cx, cy, D.baseT + 5], [0, 0, 1], 25, 65),
      cyl('Vástago Ø10 (extendido +6)', [cx, cy, D.baseT + 70], [0, 0, 1], 10, D.bridgeZ[0] - D.baseT - 70),
    ];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      f.push(hole('Ø5.5 brida', [cx + sx * 22.5, cy + sy * 22.5, D.baseT + 5], [0, 0, -1], D.M5, 5, false));
    }
    addPart(`Cilindro neumático Ø25 (${cx},${cy})`, C.neumatico, [cx, cy, D.baseT], f);
  }
  for (const [px, py] of D.pinPos) {
    const f = [
      cyl('Brida Ø50×5', [px, py, D.baseT], [0, 0, 1], 50, 5),
      cyl(`Pin Ø${D.pinDia} rectificado`, [px, py, D.baseT + 5], [0, 0, 1], D.pinDia, 92),
    ];
    for (const s of [-1, 1]) f.push(hole('Ø4.5 brida', [px + s * 18, py, D.baseT + 5], [0, 0, -1], D.M4, 5, false));
    addPart(`Pin guía Ø16 (${px},${py})`, C.grisClaro, [px, py, D.baseT], f);
  }
  for (const s of [-1, 1]) {
    const y = s * D.bridgeY;
    const f = [box(`Puente ${D.bridgeL}×20×12`, [0, y, D.bridgeZ[0]], D.bridgeL, 20, D.bridgeZ[1] - D.bridgeZ[0])];
    const cyl_ = D.cylPos.find(([, cy]) => cy === y);
    const pin_ = D.pinPos.find(([, py]) => py === y);
    f.push(hole('Ø8.5 vástago M8', [cyl_[0], y, D.bridgeZ[0]], [0, 0, 1], 8.5, 12, false));
    f.push(cyl('Casquillo guía Ø30', [pin_[0], y, D.bridgeZ[0] - 20], [0, 0, 1], 30, 20));
    f.push(hole('Buje Ø16.2', [pin_[0], y, D.bridgeZ[1]], [0, 0, -1], D.pinDia + D.slide, 32, false));
    addPart(`Puente elevador y=${y}`, C.acero, [0, y, D.bridgeZ[0]], f);
  }
}

// ===========================================================================
// 5. PLACAS PORTARODILLOS (forma de la foto: 6 lóbulos R16 + faldón profundo).
//    La placa +X porta tensores, retornos y la ménsula del motor.
// ===========================================================================
function contornoPeine() {
  const zL = D.rollerZ, rL = 16, zV = D.combValley, zB = D.apronBottom, yE = D.plateHalfY;
  const dy = Math.sqrt(rL * rL - (zL - zV) ** 2);
  const aIn = Math.atan2(zV - zL, -dy), aOut = Math.atan2(zV - zL, dy);
  const pts = [[-yE, zB], [-yE, 128], [-yE + 10, zV]];
  for (const cy of D.rollerLines) {
    pts.push(...arcPts(cy, zL, rL, aIn + 2 * Math.PI, aOut + 2 * Math.PI, 20));
  }
  pts.push([yE - 10, zV], [yE, 128], [yE, zB]);
  return pts.map(([u, v]) => [r2(u), r2(v)]);
}
function peines() {
  const outline = contornoPeine();
  for (const sx of [-1, 1]) {
    const xFace = sx * D.combX - D.plateT / 2;
    const f = [sketchYZ('Contorno peine + faldón', xFace, outline, D.plateT)];
    // ranuras pasantes para los puentes elevadores (pestaña-ranura láser)
    for (const s of [-1, 1]) {
      f.push(box('Ranura puente', [sx * D.combX, s * D.bridgeY, D.bridgeZ[0] - 0.25],
        D.plateT + 1, 20.5, D.bridgeZ[1] - D.bridgeZ[0] + 0.5, 'cut'));
    }
    for (const y of D.rollerLines) {
      f.push(hole(`Ø12.2 eje línea y=${y}`, [xFace, y, D.rollerZ], [1, 0, 0], D.axleDia + D.slide));
    }
    f.push(hole('Ø25.2 eje tambor M', [xFace, D.drumPos[0], D.drumPos[1]], [1, 0, 0], D.shaftDia + D.slide));
    if (sx > 0) { // placa de transmisión: tensores, retornos y ménsula del motor
      for (const [py, pz] of [...D.idlerPos, ...D.retPos]) {
        f.push(hole(`Ø12.2 eje tensor/retorno (${py},${pz})`, [xFace, py, pz], [1, 0, 0], D.axleDia + D.slide));
      }
      for (const hy of [-35, 35]) {
        f.push(hole('Ø6.6 ménsula motor', [xFace, hy, 101], [1, 0, 0], D.M6));
      }
    }
    addPart(sx > 0 ? 'Placa portarodillos de transmisión (+X)' : 'Placa portarodillos (-X)',
      C.azul, [xFace, 0, D.apronBottom], f);
  }
}

// ===========================================================================
// 6. RODILLOS COMPLETOS (6) + EJES — vulcanizados menos el extremo de polea
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
// 7. TRANSMISIÓN EN SERPENTÍN: banda única, tambor M, tensores, retornos,
//    eje del tambor en ambas placas y motorreductor en línea
// ===========================================================================
function transmision() {
  const [my, mz] = D.drumPos;
  // eje del tambor M: apoyado en las dos placas, sale al motor por +X
  addPart('Eje tambor Ø25', C.grisClaro, [-D.combX - 10, my, mz], [
    cyl('Eje Ø25 × 350', [-D.combX - 10, my, mz], [1, 0, 0], D.shaftDia, 350),
  ]);
  addPart('Tambor motriz M', C.tambor, [D.beltPlane - D.drumW / 2, my, mz - D.drumDia / 2], [
    cyl(`Tambor Ø${D.drumDia}×${D.drumW}`, [D.beltPlane - D.drumW / 2, my, mz], [1, 0, 0], D.drumDia, D.drumW),
    hole('Barreno Ø25.2 + chaveta', [D.beltPlane - D.drumW / 2, my, mz], [1, 0, 0], D.shaftDia + D.slide),
  ]);
  // tensores y retornos: eje Ø12 cantiléver desde la placa +X + polea Ø24
  const xIn = D.beltPlane - D.pulleyW / 2;
  for (const [i, [py, pz]] of [...D.idlerPos, ...D.retPos].entries()) {
    const nombre = i < D.idlerPos.length ? `Tensor Ø24 (${py},${pz})` : `Polea de retorno Ø24 (${py},${pz})`;
    addPart(nombre, C.gris, [xIn - 2, py, pz], [
      cyl(`Eje Ø12 × ${r2(D.combX + 3 - (xIn - 2))}`, [xIn - 2, py, pz], [1, 0, 0], D.axleDia, r2(D.combX + 3 - (xIn - 2))),
      cyl(`Polea Ø${D.retDia}×${D.pulleyW}`, [xIn, py, pz], [1, 0, 0], D.retDia, D.pulleyW),
    ], { componente: 'polea_retorno_24x29' });
  }
  // banda única en serpentín (el rodillo es la polea de la primera línea)
  const { outer, inner } = serpentineFaces(serpentine(), D.bandT);
  addPart('Banda serpentín 25×3', C.banda, [D.beltPlane, 0, D.retPos[0][1] - D.retDia / 2 - D.bandT], [
    sketchYZ('Cara exterior', D.beltPlane - D.bandW / 2, outer, D.bandW),
    sketchYZ('Vaciado interior', D.beltPlane + D.bandW / 2, inner, D.bandW, 'cut'),
  ]);
  // ménsula + motorreductor en línea con el eje del tambor
  const f = [
    box('Canal 42×80×6', [D.combX + 24, my, 98], 42, 80, 6),
    box('Placa frontal 6×80×61', [192, my, 43], 6, 80, 61),
  ];
  for (const hy of [-35, 35]) {
    f.push(hole('Ø6.6 a placa de transmisión', [D.combX + 6, my + hy, 101], [-1, 0, 0], D.M6, 20, false));
  }
  f.push(hole('Paso acople Ø38', [189, my, mz], [1, 0, 0], 38));
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    f.push(hole('Ø5.5 patrón motor', [195, my + sy * 30, mz + sz * 22], [-1, 0, 0], D.M5));
  }
  addPart('Ménsula motorreductor', C.azulOscuro, [D.combX + 3, my, 43], f);
  addPart('Motorreductor', C.motor, [195, my, mz - 35], [
    box('Cuerpo 90×80×70', [240, my, mz - 35], 90, 80, 70),
    cyl('Eje salida Ø25', [195, my, mz], [-1, 0, 0], D.shaftDia, 12),
  ]);
  addPart('Acople rígido Ø35', C.gris, [169, my, mz], [
    cyl('Manguito Ø35×18', [169, my, mz], [1, 0, 0], 35, 18),
    hole('Barreno Ø25.2', [169, my, mz], [1, 0, 0], D.shaftDia + D.slide),
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
peines();
rodillos();
transmision();

const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Transferencia 90° — módulo de desviación pop-up (6 rodillos, serpentín)',
    capa: 'user',
    origen: 'gen_transfer90.mjs (paramétrico); espec. usuario iterada contra las fotos SID y su esquema IMG_3102: 6 rodillos completos vulcanizados menos el extremo de polea; banda única en serpentín desde abajo (tambor M + tensores + 2 poleas de retorno); 2 cilindros estándar en diagonal con carrera 6',
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
console.log(`   rodillos=${metrics.rodillos}  gap tangente=${metrics.tangentGap}  sobre-elevación=+${metrics.pop}  bajada=-${metrics.drop}  carrera=${metrics.carrera}`);
