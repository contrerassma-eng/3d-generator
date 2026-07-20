#!/usr/bin/env node
// gen_lbp530.mjs — Generador paramétrico de los TRANSPORTADORES DE BANDA
// MODULAR Movex serie 530 de Conveyone (proyecto projects/LBP530-18):
//
//   - CV-LBP-5000 : banda Movex 530 LBP (roller top, baja contrapresión),
//                   18 in (457.2 mm), 5.0 m nose a nose.
//   - CV-GT-800   : banda Movex 530 GT (Grip Top = friction top de la
//                   familia 530), 18 in, 0.8 m nose a nose.
//
// Especificación del usuario (capa `user`, projects/LBP530-18/input/descripcion.md):
//   - Ejes CUADRADOS de 1.5 in (38.1) con TORNEADO EN LAS PUNTAS (muñones Ø30).
//   - TRACCIÓN EN UN EXTREMO, ABAJO (motriz bajo el bastidor, lado descarga).
//   - NOSEBAR EN AMBAS PUNTAS (transferencia de punta en los dos extremos).
//   - Motorreductor de EJE HUECO Ø30 montado DIRECTO en la punta motriz.
//   - Flota: 4 líneas × (1 friction top 0.8 m + 1 LBP 5.0 m) = 8 transportadores.
//
// Datos del fabricante Movex: capa `web`, TODOS citados con URL y cita en
// projects/LBP530-18/input/web_facts.json (brochure 530 LBP, catálogo imperial,
// datasheet sprockets 525-530, Engineering Manual V2.0). Claves:
//   paso 15 mm · base 8.7 mm · LBP H=12.2 con rodillos Ø12.2 POM (700/m²,
//   3 filas por módulo de 6 in) · GT = base + goma 2.0 (H 10.7) · backflex
//   R25 · sprocket Z24 partido PD 114.9 / OD 115.5 / ancho 24, BORE CUADRADO
//   1½ in art. 158308YF · 18 in: LBP 5 sprockets (indent 76.2) / GT 6
//   (indent 38.1, paso 76.2) · nosebar R9.5 BluLub (LBP: especial 22867/68;
//   GT: 22808/09) · wrap motriz 140±10° · catenaria 50–150 tras la motriz,
//   apoyos de retorno cada ~500 · retorno LBP = ZAPATAS deslizantes, GT =
//   rodillos D>50 · wearstrips LBP entre rodillos, gap ≤50 · holgura lateral
//   Δtérmica + 5 mm · un solo sprocket FIJO por eje (resto flota).
//
// Sistema de coordenadas: X = flujo (0 = punta de entrada), Y = ancho
// (0 = eje del transportador), Z = arriba (0 = plano del producto).
// Unidades mm.
//
// Emite (formato foto3d-cad):
//   cad/ensambles/lbp530_5m.json      ensamble LBP 5.0 m
//   cad/ensambles/lbp530_gt08.json    ensamble Grip Top (friction top) 0.8 m
//   cad/ensambles/lbp530_dims.json    dimensiones/despiece (única fuente para
//                                     planos de ejes y lista de compra)
//
// Uso:  node cad/ensambles/gen_lbp530.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const IN = 25.4;
const r2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------
// BELT — datos Movex serie 530 (capa web, input/web_facts.json)
// ---------------------------------------------------------------------------
export const BELT = {
  serie: 'Movex 530',
  ancho: 18 * IN,              // 457.2 — pedido del usuario (18 in)
  paso: 15,                    // web: movex530_paso
  esp: 8.7,                    // web: movex530_espesor (base de banda)
  backflex: 25,                // web: movex530_backflex
  maxLoadLBP: 24000,           // N/m — web: movex530lbp_carga_peso
  pesoLBP: 9.0,                // kg/m²
  maxLoadGT: 26000, pesoGT: 10.6,   // web: movex530gt_friction_top (LFA)
  lbp: { alturaTotal: 12.2, rodDia: 12.2, protru: 1.75, filaCada: 152.4 / 3, material: 'POM rojo, 700 rod/m²' },
  gt: { goma: 2.0, alturaTotal: 10.7, dureza: '75 ShA (disp. 50 ShA)' },
  sprocket: { z: 24, pd: 114.9, od: 115.5, ancho: 24, S: 53.5, art: '158308YF bore cuadrado 1.5 in, partido, poliamida' },
  nSprkLBP: 5, indentLBP: 76.2,     // web: movex530_n_sprockets_18in (manual)
  nSprkGT: 6, indentGT: 38.1, stepSprk: 76.2,
  noseR: 9.5,                  // web: movex530_nosebar (R0.37 in BluLub)
  noseArtLBP: '22867 (K3) / 22868 (K6) — nosebar especial 530 LBP doble cara',
  noseArtGT: '22808 (K3) / 22809 (K6) — nosebar 530 BluLub',
  rolloM: 1.5,                 // rollos de 1.5 m (ancho >12 in) — movex530lbp_suministro
};

// ---------------------------------------------------------------------------
// D — dimensiones de diseño (capa user, Conveyone)
// ---------------------------------------------------------------------------
export const D = {
  // Holgura lateral: Δtérmica (0.110 mm/m/°C × 0.457 m × ~25°C ≈ 1.3) + 5 básica
  claroLat: 6.4,
  plT: 6,                      // placa lateral PL6
  plTop: -8, plAlto: 180,
  alaAncho: 30,
  travesanio: 40, pasoTravLBP: 1000, pasoTravFT: 600,

  // Ejes (barra cuadrada SAE 1045 1.5 in, muñones torneados Ø30)
  sq: r2(1.5 * IN),            // 38.1
  jrnDia: 30, jrnTol: 'j6',
  jrnLibre: 50,                // placa 6 + UC206 (B=38.1) + margen
  jrnMotriz: 165,              // rodamiento 50 + garganta + cubo motorreductor 110
  cuboMotor: 110,
  chaveta: { w: 8, h: 7, l: 90 },   // DIN 6885 A (zona del motorreductor)
  m10: 22, garganta: 2.5,

  // Chumaceras UCF206 (bore Ø30, brida cuadrada 4 pernos)
  ucf: { bore: 30, flange: 108, boltGap: 82.6, boltDia: 12, hubDia: 62, B: 38.1 },

  // Camino de banda / tracción (manual Movex: wrap motriz 140±10°)
  zMotriz: -400, xMotrizDesdePunta: 120,   // motriz ABAJO, lado descarga (honda: wrap 135°)
  zTensor: -290, xTensorDesdePunta: 300,   // deflexión inferior, lado entrada
  zapataTop: -150, zapataCada: 500,        // retorno LBP: zapatas cada ~500
  zapataR: 25,                             // radio de entrada de la zapata (≥ backflex)
  gtRetDia: 63.5,                          // retorno GT: rodillo Ø63.5 (>50)
  sagR: 600, sagBot: -280,                 // catenaria tras la motriz (sag 130 ≤ 150)
  catenLen: 750,                           // largo de catenaria (manual: 500–900)

  // Desgaste / apoyo (LBP: strips ENTRE los carriles de rodillos, gap ≤50)
  wearLBP: { n: 10, w: 15, h: 10 },
  wearGT: { n: 7, w: 25, h: 10 },

  guiaAlto: 40,
  pisoZ: -900, pataPerfil: 50,
  motor: { cuerpo: [230, 180, 200], boss: 62, bossL: 120 },
};

// Derivadas
D.innerW = r2(BELT.ancho + 2 * D.claroLat);          // 470.0 entre placas
D.outerW = r2(D.innerW + 2 * D.plT);                 // 482.0 exterior
D.sqLen = r2(D.innerW - 4);                          // 466
D.ejeMotrizL = r2(D.sqLen + D.jrnLibre + D.jrnMotriz);   // 681
D.ejeTensorL = r2(D.sqLen + 2 * D.jrnLibre);             // 566
D.rSprk = r2(BELT.sprocket.pd / 2 - BELT.esp / 2);   // contacto cara interior ≈ 53.1

// posiciones Y de sprockets (manual Movex, pág. 30)
const posSprk = (n, indent) => {
  const y0 = -BELT.ancho / 2 + indent, out = [];
  for (let i = 0; i < n; i++) out.push(r2(y0 + i * BELT.stepSprk));
  return out;
};
D.ySprkLBP = posSprk(BELT.nSprkLBP, BELT.indentLBP);   // 5: ±152.4, ±76.2, 0
D.ySprkGT = posSprk(BELT.nSprkGT, BELT.indentGT);      // 6: ±190.5, ±114.3, ±38.1

// ---------------------------------------------------------------------------
// Cadena de tangentes (lazo de banda alrededor de circunferencias dirigidas,
// plano XZ) — portado de gen_transfer90.mjs; devuelve además el ángulo de
// abrace por circunferencia y el largo del lazo.
// ---------------------------------------------------------------------------
function loopFaces(seq, T, n = 24) {
  const rc = seq.map(q => q.r + T / 2);
  const N = seq.length;
  const normals = [];
  for (let i = 0; i < N; i++) {
    const q1 = seq[i], q2 = seq[(i + 1) % N];
    const dx = q2.c[0] - q1.c[0], dz = q2.c[1] - q1.c[1], d = Math.hypot(dx, dz);
    const a = (q1.s * rc[i] - q2.s * rc[(i + 1) % N]) / d;
    if (Math.abs(a) >= 1) throw new Error(`banda: sin tangente entre tramo ${i} y ${i + 1}`);
    const b = -Math.sqrt(1 - a * a);
    const u = [dx / d, dz / d], w = [-u[1], u[0]];
    normals.push([a * u[0] + b * w[0], a * u[1] + b * w[1]]);
  }
  const faces = [[], []], wraps = [];
  for (let i = 0; i < N; i++) {
    const q = seq[i];
    const nIn = normals[(i + N - 1) % N], nOut = normals[i];
    let aIn = Math.atan2(q.s * nIn[1], q.s * nIn[0]);
    let aOut = Math.atan2(q.s * nOut[1], q.s * nOut[0]);
    if (q.s > 0) { while (aOut < aIn - 1e-9) aOut += 2 * Math.PI; }
    else { while (aOut > aIn + 1e-9) aOut -= 2 * Math.PI; }
    wraps.push(r2(Math.abs(aOut - aIn) * 180 / Math.PI));
    faces[0].push(...arcPts(q.c[0], q.c[1], q.s > 0 ? q.r : q.r + T, aIn, aOut, n));
    faces[1].push(...arcPts(q.c[0], q.c[1], q.s > 0 ? q.r + T : q.r, aIn, aOut, n));
  }
  const perim = (p) => {
    let L = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      L += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return L;
  };
  const area = (p) => {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a / 2);
  };
  const [outer, inner] = area(faces[0]) >= area(faces[1])
    ? [faces[0], faces[1]] : [faces[1], faces[0]];
  return { outer, inner, largo: (perim(outer) + perim(inner)) / 2, wraps };
}
function arcPts(cu, cv, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([r2(cu + r * Math.cos(a)), r2(cv + r * Math.sin(a))]);
  }
  return out;
}

// Camino de la banda para un transportador de largo L (nose a nose).
// zci = cota de la cara interior (inferior) de la base en el tramo de carga.
function beltPath(L, tipo, zci) {
  const t = BELT.esp, rN = BELT.noseR;
  const zNose = zci - rN;
  const seq = [];
  seq.push({ c: [rN + t, zNose], r: rN, s: -1, rol: 'noseA' });
  seq.push({ c: [L - rN - t, zNose], r: rN, s: -1, rol: 'noseB' });
  const xDrv = L - D.xMotrizDesdePunta;
  seq.push({ c: [xDrv, D.zMotriz], r: D.rSprk, s: -1, rol: 'motriz' });
  if (tipo === 'LBP') {
    // snub Ø63.5 tras la motriz (completa la envoltura a ~135°), luego
    // catenaria (manual: sag 50–150) y zapatas cada ~500 hasta el tensor
    seq.push({ c: [xDrv - 300, -150], r: D.gtRetDia / 2, s: 1, rol: 'snub' });
    seq.push({ c: [xDrv - 740, D.sagBot + D.sagR], r: D.sagR, s: -1, virtual: true, rol: 'catenaria' });
    for (let x = xDrv - 1160; x > D.xTensorDesdePunta + 350; x -= D.zapataCada) {
      seq.push({ c: [x, D.zapataTop - D.zapataR], r: D.zapataR, s: 1, rol: 'zapata' });
    }
  } else {
    seq.push({ c: [L / 2 - 20, -170], r: D.gtRetDia / 2, s: 1, rol: 'retGT' });
  }
  seq.push({ c: [D.xTensorDesdePunta, D.zTensor], r: D.rSprk, s: -1, rol: 'tensor' });
  return seq;
}

// ---------------------------------------------------------------------------
// Ayudantes foto3d-cad
// ---------------------------------------------------------------------------
let nf = 0, np = 0, parts = [];
const fid = () => `f${(++nf)}`;
// `at` = CENTRO de la caja (el motor ancla en la base: se resta h/2 en Z)
const box = (name, at, w, d, h, op = 'union') =>
  ({ id: fid(), name, shape: 'box', op, at: [at[0], at[1], at[2] - h / 2], dir: [0, 0, 1], params: { w, d, h } });
const cyl = (name, at, dir, dia, h, op = 'union') =>
  ({ id: fid(), name, shape: 'cylinder', op, at, dir, params: { dia, h } });
const hole = (name, at, dir, dia, depth = 0, through = true) =>
  ({ id: fid(), name, shape: 'hole', op: 'cut', at, dir, params: { dia, depth, through } });
const sketchXZ = (name, yFace, pts, h, op = 'union') =>
  ({ id: fid(), name, shape: 'sketch', op, at: [0, yFace, 0], dir: [0, -1, 0], params: { pts, h, u: [1, 0, 0] } });

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
  placa: '#546e7a', trav: '#455a64', pata: '#37474f',
  eje: '#b0bec5', sprk: '#5d4037', chum: '#9e9e9e',
  banda: '#1565c0', rodLBP: '#c62828', goma: '#424242',
  uhmw: '#eceff1', nose: '#0d47a1', ret: '#607d8b', zapata: '#cfd8dc',
  motor: '#1b5e20', guia: '#78909c',
};

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------
function ejeMotriz(xc, zc) {
  // Barra cuadrada 38.1 SAE 1045; muñones Ø30 torneados. Lado motriz = +Y.
  const f = [];
  f.push(box(`Cuadrado ${D.sq}×${D.sq}×${D.sqLen}`, [xc, 0, zc], D.sq, D.sqLen, D.sq));
  f.push(cyl(`Muñón libre Ø${D.jrnDia}×${D.jrnLibre}`, [xc, -(D.sqLen / 2 + D.jrnLibre), zc], [0, 1, 0], D.jrnDia, D.jrnLibre));
  f.push(cyl(`Muñón motriz Ø${D.jrnDia}×${D.jrnMotriz}`, [xc, D.sqLen / 2, zc], [0, 1, 0], D.jrnDia, D.jrnMotriz));
  const zK = zc + D.jrnDia / 2 - D.chaveta.h / 2;
  const yK = D.sqLen / 2 + D.jrnMotriz - D.cuboMotor / 2;
  f.push(box(`Chavetero ${D.chaveta.w}×${D.chaveta.h}×${D.chaveta.l}`, [xc, yK, zK + D.chaveta.h / 2], D.chaveta.w, D.chaveta.l, D.chaveta.h, 'cut'));
  f.push(hole(`Rosca M10×${D.m10}`, [xc, D.sqLen / 2 + D.jrnMotriz, zc], [0, 1, 0], 8.5, D.m10, false));
  return f;
}

function ejeTensor(xc, zc) {
  const f = [];
  f.push(box(`Cuadrado ${D.sq}×${D.sq}×${D.sqLen}`, [xc, 0, zc], D.sq, D.sqLen, D.sq));
  for (const s of [-1, 1]) {
    f.push(cyl(`Muñón Ø${D.jrnDia}×${D.jrnLibre}`, [xc, s * D.sqLen / 2 + (s < 0 ? -D.jrnLibre : 0), zc], [0, 1, 0], D.jrnDia, D.jrnLibre));
  }
  return f;
}

function sprocket(xc, yc, zc) {
  // Z24 partido: disco OD 115.5 × 24, bore cuadrado 38.1 (+0.4/+0.3 flotante)
  const { od, ancho } = BELT.sprocket;
  return [
    cyl(`Disco Z24 OD ${od}`, [xc, yc - ancho / 2, zc], [0, 1, 0], od, ancho),
    box('Bore cuadrado 38.4', [xc, yc, zc], 38.4, ancho + 4, 38.4, 'cut'),
  ];
}

function chumaceraUCF(xc, ySide, zc) {
  const s = Math.sign(ySide);
  const yF = ySide + s * 2;
  const f = [
    box('Brida UCF206 108×108×14', [xc, yF + s * 7, zc], D.ucf.flange, 14, D.ucf.flange),
    cyl(`Cubo Ø${D.ucf.hubDia}`, [xc, yF, zc], [0, s, 0], D.ucf.hubDia, 34),
  ];
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    f.push(hole('Perno Ø12', [xc + dx * D.ucf.boltGap / 2, yF + s * 7, zc + dz * D.ucf.boltGap / 2], [0, s, 0], D.ucf.boltDia, 0, true));
  }
  return f;
}

// ---------------------------------------------------------------------------
// Ensamble de un transportador
// ---------------------------------------------------------------------------
function build(tipo, L) {
  nf = 0; np = 0; parts = [];
  const esLBP = tipo === 'LBP';
  // z=0 = plano del producto. LBP: rodillos sobresalen 1.75 sobre la base;
  // GT: goma 2.0 sobre la base. Cara interior (inferior) de la base:
  const bo = esLBP ? BELT.lbp.protru : BELT.gt.goma;   // offset base↔producto
  const zci = -(bo + BELT.esp);                        // LBP -10.45 · GT -10.7
  const path = beltPath(L, tipo, zci);
  const { outer, inner, largo, wraps } = loopFaces(path, BELT.esp);
  const yIn = D.innerW / 2, yOut = D.outerW / 2;
  const xDrv = L - D.xMotrizDesdePunta, xTen = D.xTensorDesdePunta;
  const ySprk = esLBP ? D.ySprkLBP : D.ySprkGT;

  // ---- Bastidor: 2 placas laterales PL6 con ala inferior ----
  for (const s of [-1, 1]) {
    const y = s * (yIn + D.plT / 2);
    const nm = s > 0 ? 'motriz (+Y)' : 'libre (−Y)';
    const f = [
      box(`Alma ${L}×${D.plAlto}`, [L / 2, y, D.plTop - D.plAlto / 2], L, D.plT, D.plAlto),
      box('Ala inferior 30×4', [L / 2, y + (s > 0 ? -1 : 1) * (D.alaAncho / 2 - D.plT / 2), D.plTop - D.plAlto + 2], L, D.alaAncho, 4),
    ];
    for (const [xc, zc, dxm] of [[xDrv, D.zMotriz, -45], [xTen, D.zTensor, 45]]) {
      const hM = (D.plTop - D.plAlto) - (zc - 110);   // desde el borde inferior del alma
      f.push(box('Mecha porta-chumacera PL8', [xc + dxm, y, zc - 110 + hM / 2], 320, D.plT + 2, hM));
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        f.push(hole('Perno chumacera Ø12', [xc + dx * D.ucf.boltGap / 2, y, zc + dz * D.ucf.boltGap / 2], [0, s, 0], D.ucf.boltDia, 0, true));
      }
    }
    addPart(`FAB · Placa lateral ${nm} PL6 L=${L}`, C.placa, [L / 2, y, D.plTop], f);
  }

  // ---- Travesaños 40×40 ----
  const pasoT = esLBP ? D.pasoTravLBP : D.pasoTravFT;
  for (let x = pasoT / 2; x < L; x += pasoT) {
    addPart('FAB · Travesaño 40×40×3', C.trav, [x, 0, D.plTop - D.plAlto + 22], [
      box('Tubo 40×40', [x, 0, D.plTop - D.plAlto + 22], D.travesanio, D.innerW, D.travesanio),
    ]);
  }

  // ---- Wearstrips UHMW del carried way ----
  // LBP: ENTRE los carriles de rodillos, gap ≤50 (web: movex_wearstrips_lbp).
  const wear = esLBP ? D.wearLBP : D.wearGT;
  const spanW = BELT.ancho - 40;
  const wearL = L - 2 * (BELT.noseR + BELT.esp + 25);
  for (let i = 0; i < wear.n; i++) {
    const y = -spanW / 2 + (i + 0.5) * spanW / wear.n;
    addPart(`NORM · Wearstrip UHMW ${wear.w}×${wear.h} (junta 6–10, fijo lado tensor)`, C.uhmw,
      [L / 2, y, zci - wear.h / 2], [
        box('UHMW', [L / 2, y, zci - wear.h / 2], wearL, wear.w, wear.h),
      ]);
  }

  // ---- Nosebar en AMBAS puntas (R9.5 BluLub; LBP: art. especial) ----
  const art = esLBP ? BELT.noseArtLBP : BELT.noseArtGT;
  for (const [x0, nm] of [[BELT.noseR + BELT.esp, 'entrada'], [L - BELT.noseR - BELT.esp, 'descarga']]) {
    const zN = zci - BELT.noseR;
    const dirIn = x0 < L / 2 ? 1 : -1;    // el cuerpo crece hacia adentro
    addPart(`NORM · Nosebar ${nm} 18 in — ${art}`, C.nose, [x0, 0, zN], [
      cyl(`Punta R${BELT.noseR}`, [x0, -BELT.ancho / 2, zN], [0, 1, 0], BELT.noseR * 2, BELT.ancho),
      box('Cuerpo BluLub', [x0 + dirIn * 25, 0, zN + 2], 50, BELT.ancho, BELT.noseR * 2 - 4),
    ]);
  }

  // ---- Retorno: LBP zapatas cada ~500 · GT rodillo Ø63.5 ----
  for (const q of path) {
    if (q.rol === 'zapata') {
      addPart('FAB · Zapata deslizante UHMW retorno LBP (tipo R230)', C.zapata, [q.c[0], 0, D.zapataTop - 10], [
        box('Zapata 80×20', [q.c[0], 0, D.zapataTop - 10], 80, D.innerW, 20),
        box('Soporte plegado 3 mm', [q.c[0], 0, D.zapataTop - 28], 60, D.innerW, 16),
      ]);
    } else if (q.rol === 'retGT' || q.rol === 'snub') {
      addPart(`NORM · Rodillo retorno Ø${D.gtRetDia} (manual: D>50)`, C.ret, [q.c[0], 0, q.c[1]], [
        cyl(`Tubo Ø${D.gtRetDia}`, [q.c[0], -D.sqLen / 2, q.c[1]], [0, 1, 0], D.gtRetDia, D.sqLen),
        cyl('Eje Ø12', [q.c[0], -D.innerW / 2 - D.plT, q.c[1]], [0, 1, 0], 12, D.innerW + 2 * D.plT),
      ]);
    }
  }

  // ---- EJE MOTRIZ (abajo, descarga) + sprockets + chumaceras + motor ----
  addPart(`FAB · EJE MOTRIZ cuadrado ${D.sq} — L=${D.ejeMotrizL} (muñones Ø30 ${D.jrnTol})`, C.eje,
    [xDrv, 0, D.zMotriz], ejeMotriz(xDrv, D.zMotriz));
  for (const y of ySprk) {
    addPart(`NORM · Sprocket Z24 ${BELT.sprocket.art}`, C.sprk, [xDrv, y, D.zMotriz], sprocket(xDrv, y, D.zMotriz));
  }
  for (const s of [-1, 1]) {
    addPart('NORM · Chumacera UCF206 Ø30', C.chum, [xDrv, s * yOut, D.zMotriz], chumaceraUCF(xDrv, s * yOut, D.zMotriz));
  }
  const yM = yOut + 30;
  addPart('NORM · Motorreductor eje hueco Ø30 + brazo de torque', C.motor, [xDrv, yM + D.motor.cuerpo[1] / 2, D.zMotriz], [
    cyl(`Cubo hueco Ø${D.motor.boss}`, [xDrv, yM - 10, D.zMotriz], [0, 1, 0], D.motor.boss, D.motor.bossL),
    box('Cuerpo reductor', [xDrv, yM + D.motor.cuerpo[1] / 2 + 40, D.zMotriz], D.motor.cuerpo[0], D.motor.cuerpo[1], D.motor.cuerpo[2]),
    box('Brazo de torque', [xDrv - 130, yM + 20, D.zMotriz - 60], 40, 12, 160),
  ]);

  // ---- EJE TENSOR/DEFLEXIÓN (abajo, entrada) + 2 sprockets locos ----
  addPart(`FAB · EJE TENSOR cuadrado ${D.sq} — L=${D.ejeTensorL} (muñones Ø30 ${D.jrnTol})`, C.eje,
    [xTen, 0, D.zTensor], ejeTensor(xTen, D.zTensor));
  for (const y of [ySprk[1], ySprk[ySprk.length - 2]]) {
    addPart('NORM · Sprocket Z24 loco (flotante +0.4/+0.3)', C.sprk, [xTen, y, D.zTensor], sprocket(xTen, y, D.zTensor));
  }
  for (const s of [-1, 1]) {
    addPart('NORM · Chumacera UCF206 Ø30', C.chum, [xTen, s * yOut, D.zTensor], chumaceraUCF(xTen, s * yOut, D.zTensor));
  }

  // ---- Guías laterales (acumulación) ----
  for (const s of [-1, 1]) {
    addPart('FAB · Guía lateral UHMW sobre escuadra', C.guia, [L / 2, s * (yIn - 5), 25], [
      box('Guía UHMW 15×40', [L / 2, s * (yIn - 5), 25], L - 120, 15, D.guiaAlto),
    ]);
  }

  // ---- Patas ----
  const patasX = esLBP ? [700, L / 2, L - 700] : [L / 2];
  for (const x of patasX) {
    for (const s of [-1, 1]) {
      addPart('FAB · Pata 50×50 regulable', C.pata, [x, s * (yOut - D.pataPerfil / 2), (D.pisoZ + D.plTop - D.plAlto) / 2], [
        box('Perfil 50×50', [x, s * (yOut - D.pataPerfil / 2), (D.pisoZ + D.plTop - D.plAlto) / 2], D.pataPerfil, D.pataPerfil, (D.plTop - D.plAlto) - D.pisoZ),
        box('Placa piso 120×120×6', [x, s * (yOut - D.pataPerfil / 2), D.pisoZ + 3], 120, 120, 6),
      ]);
    }
    addPart('FAB · Riostra pata 40×40', C.pata, [x, 0, D.pisoZ + 200], [
      box('Riostra', [x, 0, D.pisoZ + 200], 40, D.outerW - D.pataPerfil, 40),
    ]);
  }

  // ---- BANDA (lazo cerrado, boceto XZ extruido a lo ancho) ----
  addPart(`NORM · Banda ${BELT.serie} ${esLBP ? 'LBP' : 'GT (friction top)'} 18 in — lazo ${r2(largo / 1000)} m`,
    C.banda, [L / 2, 0, zci + BELT.esp / 2], [
      sketchXZ('Cara exterior del lazo', BELT.ancho / 2, outer, BELT.ancho),
      sketchXZ('Vaciado interior', -BELT.ancho / 2, inner, BELT.ancho, 'cut'),
    ]);

  // ---- Superficie del tramo de carga ----
  const xa = 2 * (BELT.noseR + BELT.esp) + 20, xb = L - xa;
  if (esLBP) {
    // rodillos LBP Ø12.2 POM rojo: filas cada 50.8 (3 por módulo de 6 in),
    // 12 carriles (los wearstrips corren por los espacios entre carriles)
    const zR = -BELT.lbp.rodDia / 2;   // tope del rodillo = plano del producto (0)
    const nCol = 12, spanC = BELT.ancho - 50, rodL = 24;
    const feats = [];
    let filas = 0;
    for (let x = xa; x <= xb; x += BELT.lbp.filaCada, filas++) {
      for (let i = 0; i < nCol; i++) {
        const y = -spanC / 2 + (i + 0.5) * spanC / nCol;
        feats.push(cyl('Rodillo LBP', [x, y - rodL / 2, zR], [0, 1, 0], BELT.lbp.rodDia, rodL));
      }
    }
    addPart(`NORM · Rodillos LBP Ø${BELT.lbp.rodDia} POM rojo (${filas} filas × ${nCol})`, C.rodLBP,
      [L / 2, 0, zR], feats);
  } else {
    // goma grip top 2.0 por fila de módulo (cada paso 15)
    const feats = [];
    let filas = 0;
    for (let x = xa; x <= xb; x += BELT.paso, filas++) {
      feats.push(box('Goma grip top', [x, 0, -BELT.gt.goma / 2], BELT.paso - 4, BELT.ancho - 50, BELT.gt.goma));
    }
    addPart(`NORM · Goma Grip Top ${BELT.gt.dureza} (+${BELT.gt.goma}, ${filas} filas)`, C.goma,
      [L / 2, 0, -BELT.gt.goma / 2], feats);
  }

  return { parts, largoBanda: largo, wraps, path };
}

// ---------------------------------------------------------------------------
// Verificaciones (fallan = no se emite)
// ---------------------------------------------------------------------------
function verify(res) {
  const e = [];
  if (r2(D.sqLen + D.jrnLibre + D.jrnMotriz) !== D.ejeMotrizL) e.push('largo eje motriz inconsistente');
  if (D.jrnDia > D.sq) e.push('el muñón Ø30 no sale de la barra cuadrada 38.1');
  if (D.cuboMotor + D.jrnLibre > D.jrnMotriz) e.push('muñón motriz corto: rodamiento + cubo motor no caben');
  if (D.chaveta.l > D.cuboMotor - 10) e.push('chavetero más largo que la zona del cubo');
  if (D.ucf.bore !== D.jrnDia) e.push('bore de chumacera ≠ Ø muñón');
  if (BELT.sprocket.od / 2 > Math.abs(D.zMotriz) - 100) e.push('sprocket motriz invade el bastidor');
  if (D.zapataR < BELT.backflex) e.push(`radio de zapata ${D.zapataR} < backflex ${BELT.backflex}`);
  if (D.gtRetDia <= 50) e.push('rodillo de retorno GT ≤ 50 (manual: D>50)');
  // corte de barras (8+8 ejes, kerf 9 mm)
  const corteM = 8 * (D.ejeMotrizL + 9), corteT = 8 * (D.ejeTensorL + 9);
  if (corteM > 6000) e.push(`8 ejes motrices no salen de una barra de 6 m (${corteM})`);
  if (corteT > 6000) e.push(`8 ejes tensores no salen de una barra de 6 m (${corteT})`);
  // envoltura de la motriz: manual Movex 140±10° (aceptamos 115–175 con aviso)
  for (const [tipo, r] of Object.entries(res)) {
    const i = r.path.findIndex(q => q.rol === 'motriz');
    const w = r.wraps[i];
    if (w < 115 || w > 175) e.push(`${tipo}: envoltura de la motriz ${w}° fuera de rango (objetivo 140±10)`);
    r.wrapMotriz = w;
    // catenaria: profundidad de sag bajo el plano de zapatas (LBP)
    if (tipo === 'LBP') r.sag = r2(Math.abs(D.sagBot - D.zapataTop));
  }
  if (e.length) throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - '));
  return { corteM, corteT };
}

// ---------------------------------------------------------------------------
// Emitir
// ---------------------------------------------------------------------------
const res = {};
const builds = {};
for (const [tipo, L, file, nombre] of [
  ['LBP', 5000, 'lbp530_5m.json', 'CV-LBP-5000 · Movex 530 LBP 18 in × 5.0 m'],
  ['GT', 800, 'lbp530_gt08.json', 'CV-GT-800 · Movex 530 GT (friction top) 18 in × 0.8 m'],
]) {
  const b = build(tipo, L);
  res[tipo] = b;
  builds[tipo] = { L, file, nombre };
}
const chk = verify(res);

const here = dirname(fileURLToPath(import.meta.url));
const metaComun = {
  capa: 'user',
  origen: 'gen_lbp530.mjs (paramétrico) — proyecto projects/LBP530-18',
  banda: `${BELT.serie} 18 in · paso 15 · base 8.7 · LBP H12.2 rodillos Ø12.2 POM · GT goma 2.0 — datos capa web citados en input/web_facts.json`,
  ejes: {
    material: 'Barra CUADRADA 1.5 in (38.1) SAE 1045 calibrada',
    motriz: `L=${D.ejeMotrizL}: cuadrado ${D.sqLen} + muñón libre Ø30 ${D.jrnTol}×${D.jrnLibre} + muñón motriz Ø30×${D.jrnMotriz} (rodamiento 50 + cubo motorreductor ${D.cuboMotor}); chavetero DIN 6885 A 8×7×${D.chaveta.l}; rosca M10×${D.m10}; garganta ${D.garganta} en la transición cuadrado→Ø30; centros DIN 332-A2.5; concentricidad ≤0.05 TIR`,
    tensor: `L=${D.ejeTensorL}: cuadrado ${D.sqLen} + 2 muñones Ø30 ${D.jrnTol}×${D.jrnLibre}`,
    chumaceras: 'UCF206 (bore Ø30, brida 108, 4×Ø12) contra la cara exterior de la placa',
    motorreductor: 'eje hueco Ø30 H7 DIRECTO sobre el muñón motriz + brazo de torque; chaveta DIN 6885 A 8×7×90; retención arandela + tornillo M10',
  },
  traccion: 'motriz ABAJO extremo descarga (wrap objetivo 140±10°, manual Movex); deflexión/tensor abajo extremo entrada; NOSEBAR en ambas puntas',
  sprockets: `Z24 PD 114.9 OD 115.5 ancho 24, partido, poliamida, BORE CUADRADO 1.5 in (art. 158308YF) — LBP: 5/eje (indent 76.2) · GT: 6/eje (indent 38.1, paso 76.2); SOLO el central FIJO (collarines), resto FLOTAN (+0.4/+0.3): dilatación térmica, manual Movex`,
  retorno: 'LBP: zapatas deslizantes UHMW (tipo R230) cada ~500 · GT: rodillos Ø63.5 (D>50); catenaria 50–150 tras la motriz, primer apoyo a ~500',
  friction_top: 'GT: goma 75 ShA sobre la banda; el retorno del GT es sobre rodillos (recomendación del manual); la goma no toca el nosebar (contacto por cara interior)',
  verificaciones: {
    wrapMotrizLBP: res.LBP.wrapMotriz, wrapMotrizGT: res.GT.wrapMotriz,
    sagCatenariaLBP: res.LBP.sag,
    corteBarraMotrices: chk.corteM, corteBarraTensores: chk.corteT,
  },
};

for (const [tipo, b] of Object.entries(builds)) {
  const r = res[tipo];
  const doc = {
    format: 'foto3d-cad', version: 1,
    meta: { nombre: b.nombre, ...metaComun, largo_nose_a_nose: b.L, largo_banda_lazo_mm: r2(r.largoBanda) },
    parts: r.parts, constraints: [],
  };
  writeFileSync(join(here, b.file), JSON.stringify(doc, null, 1));
  console.log(`OK ${b.file}: ${r.parts.length} piezas · lazo ${r2(r.largoBanda / 1000)} m · wrap motriz ${r.wrapMotriz}°`);
}

// dimensiones/despiece — única fuente para planos de ejes y lista de compra
const lazoLBP = r2(res.LBP.largoBanda / 1000), lazoGT = r2(res.GT.largoBanda / 1000);
const dims = {
  proyecto: 'LBP530-18', lineas: 4,
  transportadoresPorLinea: { GT_800: 1, LBP_5000: 1 },
  belt: BELT, D,
  lazos_m: { LBP_5000: lazoLBP, GT_800: lazoGT },
  ejes: {
    motriz: {
      plano: 'LBP530-EJ-01', material: 'SAE 1045 cuadrado 38.1 (1.5 in) calibrado',
      largoTotal: D.ejeMotrizL, corte: D.ejeMotrizL + 9, cantidad: 8,
      tramos: [
        { nombre: 'muñón libre', dia: D.jrnDia, tol: D.jrnTol, largo: D.jrnLibre },
        { nombre: 'cuadrado', lado: D.sq, largo: D.sqLen },
        { nombre: 'muñón motriz', dia: D.jrnDia, tol: D.jrnTol, largo: D.jrnMotriz },
      ],
      chaveta: D.chaveta, roscaPunta: `M10×${D.m10}`, garganta: D.garganta,
    },
    tensor: {
      plano: 'LBP530-EJ-02', material: 'SAE 1045 cuadrado 38.1 (1.5 in) calibrado',
      largoTotal: D.ejeTensorL, corte: D.ejeTensorL + 9, cantidad: 8,
      tramos: [
        { nombre: 'muñón', dia: D.jrnDia, tol: D.jrnTol, largo: D.jrnLibre },
        { nombre: 'cuadrado', lado: D.sq, largo: D.sqLen },
        { nombre: 'muñón', dia: D.jrnDia, tol: D.jrnTol, largo: D.jrnLibre },
      ],
    },
    barras: {
      espec: 'Barra cuadrada 1.5 in (38.1) SAE 1045 calibrada × 6 m',
      motriz: { porBarra: 8, usado: chk.corteM }, tensor: { porBarra: 8, usado: chk.corteT },
      comprar: 2, nota: 'considerar 1 barra extra de respaldo',
    },
  },
  compraMovex: {
    banda_530LBP_18in: { art: '5324010018A', metros: r2(4 * lazoLBP), rollos15: Math.ceil(4 * lazoLBP / BELT.rolloM), nota: 'rollos de 1.5 m (100 pasos); pedir +1 rollo de repuesto' },
    banda_530GT_18in: { art: '5323*0018A (LFA)', metros: r2(4 * lazoGT), rollos15: Math.ceil(4 * lazoGT / BELT.rolloM) },
    sprockets_Z24_cuadrado15: { art: '158308YF', cantidad: 4 * (BELT.nSprkLBP + 2) + 4 * (BELT.nSprkGT + 2), detalle: 'LBP: 5 motriz + 2 locos · GT: 6 motriz + 2 locos, por transportador' },
    nosebar_LBP: { art: '22868 (K=6 in)', cantidad: 4 * 2 * 3, detalle: '3 × K6 = 18 in por punta, 2 puntas por LBP' },
    nosebar_GT: { art: '22809 (K=6 in)', cantidad: 4 * 2 * 3 },
  },
};
writeFileSync(join(here, 'lbp530_dims.json'), JSON.stringify(dims, null, 1));
console.log(`OK lbp530_dims.json · lazo LBP ${lazoLBP} m · lazo GT ${lazoGT} m`);
