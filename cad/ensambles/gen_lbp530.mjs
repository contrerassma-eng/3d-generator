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
import { bendAllowance } from '../js/sheetmetal.js';
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
  // Cotización MOVEX 26012937 (input/docs/): rueda MOLDEADA (stampata) Z-32
  // serie 525-530, bore cuadrado 1.5 in, c/GRANO M8 — art. P158808YF
  sprocket: { z: 32, pd: 153.4, od: 154.8, ancho: 40, S: 72.5, art: 'P158808YF moldeado Z-32, bore cuadrado 1.5 in, grano M8 (cotización 26012937)' },
  collar: 'P21703Y — collare di riferimento 1.5 in × 1.5 in (cotización)',
  nSprkLBP: 5, indentLBP: 76.2,     // web: movex530_n_sprockets_18in (manual)
  nSprkGT: 6, indentGT: 38.1, stepSprk: 76.2,
  noseR: 9.5,                  // nosebar h19 c/rodamientos (Ø19 → R9.5)
  noseArtLBP: 'P22868 — nosebar 530 LBP h19 C/RODAMIENTOS, L=6 in, 6 forai, BluLub (cotización)',
  noseArtGT: 'P22862 — transfer plate C/RODAMIENTOS h19, L=6 in (cotización)',
  barCap: 'P101203-30 — BAR CAP 17.53×19.05 UHMW blanco p/pletina 12 mm, rollo 30 m (cotización)',
  railLateral: 'P12501C — L-Shape CONICAL RAIL 1¼ in AISI304+Ti-WHITE, enrollable (cotización; también T 1 in P12201C y T 40 mm P12401C)',
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
  jrnDia: 30, jrnTol: 'h6',        // ajuste eje hueco NMRV: H8/h6 (catalogo Motovario p.90) — antes j6, corregido
  // Motorreductor VERIFICADO contra catalogo NMRV (docs/lbp/criterios/accionamiento.md):
  // el trio "0,37 kW + 42 rpm + >=85 Nm" no existe. Seleccion: NMRV-P 075 FA
  // 1/30, eje hueco O30 H8, motor 80A-4 0,55 kW -> n2 46 rpm, 89 Nm, fs 2,8.
  // v banda = pi*0.1534*46 = 22,2 m/min (rango 5-45 OK).
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
  retTop: -135, retCada: 500,              // retorno cada ~500; eje muerto en ALMA PLANA (fuera de la zona de plegado del ala)
  gtRetDia: 63.5,                          // rodillo retorno Ø63.5 (manual: D>50)
  // rodillo de retorno de EJE MUERTO (decisión usuario): tubo Ø63.5 con 2
  // rodamientos SELLADOS 6202-2RS insertos; eje Ø15 perforado y roscado M8
  // en ambas puntas → perno hexagonal M8 + golilla POR FUERA de la placa
  retEjeDia: 15, retPernoM: 8,
  retPernoPas: 9,                          // paso del M8 en la placa (holgura media ISO 273)
  sagR: 600, sagBot: -265,                 // catenaria tras la motriz (flecha 130 bajo el plano de retorno −135; manual: ≤150)
  catenLen: 750,                           // largo de catenaria (manual: 500–900)

  // Guía de APOYO (carried way): pletina de canto 12 mm + BAR CAP UHMW
  // 17.53×19.05 enrollable (P101203-30). LBP: entre carriles, gap ≤50.
  wearLBP: { n: 10 }, wearGT: { n: 7 },
  barCap: { w: 17.53, h: 19.05 }, pletina: { t: 12, h: 30 },

  // Guía LATERAL: conical rail enrollable L 1¼ in (P12501C) sobre escuadras
  guiaAlto: 32,
  pisoZ: -900,
  // Soportes tipo ZP2026 (B_005A 203×95) y travesaños tipo ZP2026 (TR_S, C 88×40)
  sop: { w: 203, d: 95, t: 3, pie: 120 },
  travC: { w: 88, h: 40, t: 3 },
  motor: { cuerpo: [230, 180, 200], boss: 62, bossL: 120 },
};

// Derivadas
D.innerW = r2(BELT.ancho + 2 * D.claroLat);          // 470.0 entre placas
D.outerW = r2(D.innerW + 2 * D.plT);                 // 482.0 exterior
D.sqLen = r2(D.innerW - 4);                          // 466
D.ejeMotrizL = r2(D.sqLen + D.jrnLibre + D.jrnMotriz);   // 681
D.ejeTensorL = r2(D.sqLen + 2 * D.jrnLibre);             // 566
D.rSprk = r2(BELT.sprocket.pd / 2 - BELT.esp / 2);   // contacto cara interior ≈ 53.1

// posiciones Y de sprockets (manual Movex pág. 30 + brochure LBP pág. 11 —
// AMBOS coinciden: 530 LBP estándar 18 in = 5 sprockets; 6 es solo PRO LBP).
// LBP: grid VÁLIDO A·B·C·B·C·A = 76.2/63.35/89.05/63.35/89.05/76.2 (posiciones
// entre los carriles de rodillos; las demás están PROHIBIDAS ✗ en el manual):
// desde el borde: 76.2, 139.55, 228.6, 291.95, 381.0 → centrado:
D.ySprkLBP = [-152.4, -89.05, 0, 63.35, 152.4];
// GT/Others: indent 38.1 + paso 76.2 → 6 equiespaciados:
const posSprk = (n, indent) => {
  const y0 = -BELT.ancho / 2 + indent, out = [];
  for (let i = 0; i < n; i++) out.push(r2(y0 + i * BELT.stepSprk));
  return out;
};
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
    // snub Ø63.5 tras la motriz (completa la envoltura), luego catenaria
    // (manual: sag 50–150) y RODILLOS de retorno cada ~500 hasta el tensor
    seq.push({ c: [xDrv - 300, -140], r: D.gtRetDia / 2, s: 1, rol: 'snub' });
    seq.push({ c: [xDrv - 740, D.sagBot + D.sagR], r: D.sagR, s: -1, virtual: true, rol: 'catenaria' });
    for (let x = xDrv - 1160; x > D.xTensorDesdePunta + 350; x -= D.retCada) {
      seq.push({ c: [x, D.retTop - D.gtRetDia / 2], r: D.gtRetDia / 2, s: 1, rol: 'ret' });
    }
  } else {
    seq.push({ c: [L / 2 - 20, -160], r: D.gtRetDia / 2, s: 1, rol: 'ret' });
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

// ---------------------------------------------------------------------------
// Desarrollos planos (bloque `flat` por pieza de chapa) — ANALÍTICOS: salen de
// los mismos parámetros que generan el 3D, no de la malla. Los consume
// ensambles/dxf_flat.mjs → DXF 1:1 de corte láser + tabla de agujeros.
// Convención del plano de desarrollo: X = a lo largo de la pieza, Y = a lo
// alto del desarrollo (0 abajo). BA = θ·(R+K·t), K=0.44 acero (sheetmetal.js),
// R = t (mismo criterio que el módulo de chapa del CAD).
// ---------------------------------------------------------------------------
const KCH = 0.44;
const rect = (w, h, x0 = 0, y0 = 0) =>
  [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]];

// Desarrollo de placa con UNA pestaña inferior a 90° (alma + ala):
// dev = alaFlat | BA | almaFlat, con el eje de plegado marcado.
function flatPlacaConAla(L, almaAlto, alaAncho, t, holesAlma, material, aviso, holesAla = []) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const alaFlat = alaAncho - (r + t);
  const almaFlat = almaAlto - (r + t);
  const H = alaFlat + BA + almaFlat;
  // hole dz = distancia desde el BORDE SUPERIOR del alma (3D: plTop − z)
  const circles = holesAlma
    .filter(h => h.dz <= almaFlat)          // nunca en la zona de plegado
    .map(h => ({ c: [h.x, r2(H - h.dz)], r: h.dia / 2 }));
  // agujeros del ALA: yDev medido desde el BORDE LIBRE del ala (0..alaFlat)
  for (const h of holesAla) {
    if (h.yDev <= alaFlat) circles.push({ c: [h.x, r2(h.yDev)], r: h.dia / 2 });
  }
  const yEje = alaFlat + BA / 2;
  return {
    contorno: rect(L, r2(H)),
    cortes: { circles, polys: [] },
    pliegues: [
      { a: [0, r2(alaFlat)], b: [L, r2(alaFlat)], tipo: 'tangente' },
      { a: [0, r2(yEje)], b: [L, r2(yEje)], tipo: 'eje' },
      { a: [0, r2(alaFlat + BA)], b: [L, r2(alaFlat + BA)], tipo: 'tangente' },
    ],
    etiquetas: [{ x: L / 2, y: r2(yEje) + 4, s: `PLEGAR ARRIBA 90° R${r}` }],
    pliegueInfo: [{ ang: 90, r, ba: r2(BA) }],
    t, k: KCH, radio: r, material,
    avisos: aviso ? [aviso] : [],
  };
}

// Desarrollo de perfil C (dos pestañas a 90°): ala | BA | web | BA | ala.
function flatPerfilC(largo, webAncho, alaAlto, t, material, holes = []) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const ala = alaAlto - (r + t);
  const web = webAncho - 2 * (r + t);
  const H = 2 * ala + 2 * BA + web;
  const y1 = ala, y2 = ala + BA, y3 = ala + BA + web, y4 = ala + BA + web + BA;
  const pl = [];
  for (const [ya, yb] of [[y1, y2], [y3, y4]]) {
    pl.push({ a: [0, r2(ya)], b: [largo, r2(ya)], tipo: 'tangente' });
    pl.push({ a: [0, r2((ya + yb) / 2)], b: [largo, r2((ya + yb) / 2)], tipo: 'eje' });
    pl.push({ a: [0, r2(yb)], b: [largo, r2(yb)], tipo: 'tangente' });
  }
  return {
    contorno: rect(largo, r2(H)),
    cortes: { circles: holes.map(h => ({ c: [h.x, h.y], r: h.dia / 2 })), polys: [] },
    pliegues: pl,
    etiquetas: [{ x: largo / 2, y: r2((y1 + y2) / 2) + 4, s: `PLEGAR ARRIBA 90° R${r} (×2)` }],
    pliegueInfo: [{ ang: 90, r, ba: r2(BA) }, { ang: 90, r, ba: r2(BA) }],
    t, k: KCH, radio: r, material,
    avisos: [],
  };
}

// Desarrollo de la GUARDA INFERIOR (artesa en U con pestañas de montaje):
// fondo + 2 laterales + 2 pestañas superiores hacia afuera, 4 pliegues a 90°.
// dev Y (de abajo hacia arriba): pestaña | BA | lateral | BA | fondo | BA |
// lateral | BA | pestaña. Agujeros de montaje en las pestañas (M6, Ø7).
function flatGuardaU(Lg, fondoW, latAlto, pestW, t, holesX, material, tapasExtremo, muescas, extras) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  // Cotas EXTERIORES → franjas planas: pestaña pestW−r · lateral latAlto−2(r+t)
  // · fondo fondoW−2r (correccion del panel: antes el reparto corria 1,5 mm)
  const pest = pestW - r, lat = latAlto - 2 * (r + t), fondo = fondoW - 2 * r;
  const H = 2 * pest + 4 * BA + 2 * lat + fondo;
  const yl = [];  // fronteras acumuladas de franjas
  let acc = 0;
  for (const seg of [pest, BA, lat, BA, fondo, BA, lat, BA, pest]) { yl.push(acc); acc += seg; }
  yl.push(acc);
  const pl = [];
  for (const i of [1, 3, 5, 7]) {
    pl.push({ a: [0, r2(yl[i])], b: [Lg, r2(yl[i])], tipo: 'tangente' });
    pl.push({ a: [0, r2((yl[i] + yl[i + 1]) / 2)], b: [Lg, r2((yl[i] + yl[i + 1]) / 2)], tipo: 'eje' });
    pl.push({ a: [0, r2(yl[i + 1])], b: [Lg, r2(yl[i + 1])], tipo: 'tangente' });
  }
  const circles = [];
  // M6 de pestaña: misma cota que el 3D — holeY desde el eje ⇒ distancia al
  // borde libre de la pestaña = holeY − (skirtY − pestW). (Antes pest/2: 7,5 mm
  // de desalineación detectados por el panel.)
  const yM6 = extras ? r2(extras.holeY - (extras.skirtY - pestW)) : r2(pest / 2);
  for (const x of holesX) {
    circles.push({ c: [r2(x), yM6], r: 3.5 });
    circles.push({ c: [r2(x), r2(H - yM6)], r: 3.5 });
  }
  // Drenaje del fondo (criterio guardas.md): Ø8 al eje, cada ~450
  if (extras?.drenaje) {
    for (let x = 90; x <= Lg - 90; x += 450) {
      circles.push({ c: [r2(x), r2(pest + BA + lat + BA + fondo / 2)], r: 4 });
    }
  }
  // Pasos de muñón en los FALDONES (los ejes salen del bastidor hacia las
  // chumaceras): Ø48 en ambas franjas laterales, a la altura real del eje.
  for (const grp of [[extras?.munones, 24], [extras?.mechaMounts, 3.5]]) {
    for (const m of (grp[0] || [])) {
      // franja lateral inferior corre de la pestaña (z=ala) hacia el fondo:
      // devY = inicio de franja + distancia plana desde la tangente del ala
      const latOff = r2((extras.zAlaBot - m.z) - (r + t));
      circles.push({ c: [r2(m.x), r2(pest + BA + latOff)], r: grp[1] });
      circles.push({ c: [r2(m.x), r2(pest + BA + lat + BA + fondo + BA + (lat - latOff))], r: grp[1] });
    }
  }
  // Tapas de extremo: pestaña adicional del FONDO, plegada 90° hacia arriba,
  // que cierra la cara del extremo (acceso principal al accionamiento).
  const y4 = yl[4], y5 = yl[5];                    // franja del fondo en el dev
  const tapaDev = lat - 3;                          // llega casi al ala, con luz
  let cont;
  const tapas = { a: !!tapasExtremo?.a, b: !!tapasExtremo?.b };
  const xa0 = tapas.a ? -(BA + tapaDev) : 0, xb0 = Lg + (tapas.b ? BA + tapaDev : 0);
  // Muescas: ventanas [x0,x1] donde la PESTAÑA se recorta (la bajada de banda
  // al motriz/tensor cruza el plano de la pestaña; sin muesca, roce).
  const mk = (muescas || []).map(m => [r2(m[0]), r2(m[1])]).sort((a, b) => a[0] - b[0]);
  const bordeConMuescas = (yBorde, yFondoPest, reverse) => {
    // recorre el borde exterior de la franja de pestaña insertando escalones
    const pts = [];
    let x = 0;
    for (const [m0, m1] of mk) {
      pts.push([x, yBorde], [m0, yBorde], [m0, yFondoPest], [m1, yFondoPest], [m1, yBorde]);
      x = m1;
    }
    pts.push([x, yBorde], [Lg, yBorde]);
    return reverse ? pts.reverse() : pts;
  };
  cont = [...bordeConMuescas(0, yl[1], false), [Lg, y4]];
  if (tapas.b) cont.push([xb0, y4], [xb0, y5]);
  cont.push([Lg, y5], [Lg, r2(H)]);
  cont.push(...bordeConMuescas(r2(H), r2(yl[8]), true));
  cont.push([0, y5]);
  if (tapas.a) cont.push([xa0, y5], [xa0, y4]);
  cont.push([0, y4], [0, 0]);
  for (const [on, xl] of [[tapas.a, 0], [tapas.b, Lg]]) {
    if (!on) continue;
    pl.push({ a: [xl, r2(y4)], b: [xl, r2(y5)], tipo: 'eje' });
  }
  return {
    contorno: cont.map(p => [r2(p[0]), r2(p[1])]),
    cortes: { circles, polys: [] },
    pliegues: pl,
    etiquetas: [{ x: Lg / 2, y: r2(yl[4] + fondo / 2), s: `4 PLIEGUES 90° R${r} — ARTESA EN U${tapas.a || tapas.b ? ' + TAPA(S) DE EXTREMO' : ''}` }],
    pliegueInfo: [1, 2, 3, 4].map(() => ({ ang: 90, r, ba: r2(BA) })),
    t, k: KCH, radio: r, material,
    avisos: ['MONTA APERNADA M6 AL ALA INFERIOR DE LAS PLACAS (desmontable para mantención)'],
  };
}

// Placa plana sin pliegues (mechas, placas de piso, guardas planas).
function flatPlaca(w, h, t, holes, material, aviso) {
  return {
    contorno: rect(w, h),
    cortes: { circles: holes.map(q => ({ c: [q.x, q.y], r: q.dia / 2 })), polys: [] },
    pliegues: [], etiquetas: [], pliegueInfo: [],
    t, k: KCH, radio: t, material,
    avisos: aviso ? [aviso] : [],
  };
}

// Paleta alineada al estandar visual de los equipos Conveyone (materiales del
// LBP530.glb del simulador): estructura RAL 7035 gris luz, componentes de
// transmision antracita, banda azul LFA con rodillos POM rojos.
const C = {
  placa: '#d3d5cf', trav: '#c7c9c3', pata: '#d3d5cf',
  eje: '#9aa2a8', sprk: '#3d4348', chum: '#565d63',
  banda: '#1a4f9c', rodLBP: '#c0392b', goma: '#3a3f43',
  uhmw: '#f2f4f0', nose: '#24313d', ret: '#8d959b', zapata: '#cfd8dc',
  motor: '#33383c', guia: '#aeb4ac', guarda: '#d3d5cf',
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
  // Z-32 MOLDEADO (P158808YF): corona OD 154.8, cuerpo 40 de ancho, bore
  // cuadrado 38.4 (flotante +0.4/+0.3), prisionero (grano) M8 en el cubo
  const { od, ancho } = BELT.sprocket;
  return [
    cyl(`Corona Z32 OD ${od}`, [xc, yc - 12, zc], [0, 1, 0], od, 24),
    cyl('Cuerpo moldeado', [xc, yc - ancho / 2, zc], [0, 1, 0], od - 40, ancho),
    box('Bore cuadrado 38.4', [xc, yc, zc], 38.4, ancho + 4, 38.4, 'cut'),
  ];
}

function collar(xc, yc, zc) {
  // Collarín de referencia P21703Y 1.5×1.5 in: fija axialmente el sprocket
  // CENTRAL (los demás flotan) — indicación Movex
  return [
    cyl('Collarín P21703Y', [xc, yc - 5, zc], [0, 1, 0], 60, 10),
    box('Bore cuadrado 38.3', [xc, yc, zc], 38.3, 14, 38.3, 'cut'),
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
  // Agujeros del alma (compartidos por la placa 3D y su desarrollo): el paso
  // del perno M8 que fija el EJE MUERTO de cada rodillo de retorno. El perno
  // entra POR FUERA de la placa y rosca en la punta del eje Ø15 (misma
  // solución del transfer90). Sin estos agujeros el desarrollo no era
  // cotizable a corte láser. dz = distancia desde el borde superior del alma.
  const holesAlma = [];
  for (const q of path) {
    if (q.rol !== 'ret' && q.rol !== 'snub') continue;
    holesAlma.push({ x: r2(q.c[0]), dz: r2(D.plTop - q.c[1]), dia: D.retPernoPas, rol: 'retorno' });
  }

  // ---- GUARDAS INFERIORES (artesa en U, chapa 1.5, apernadas M6 al ala) ----
  // El accionamiento cuelga 212 bajo el bastidor (zMotriz −400): la guarda
  // cierra por debajo y por el extremo la zona de motriz + snub + catenaria,
  // y otra igual la zona del tensor. Desmontables para tensado y mantención.
  const mechaPasoDia = 40;
  const mechaTop = -88;   // traslape con el alma plana: 88 sobre la tangente del pliegue (−176)
  // Especificación de cada mecha: [x0,x1] huella, muñones {x,z} que pasa
  const mechasSpec = esLBP
    ? [
      { rol: 'motriz', x0: xDrv - 45 - 160, x1: xDrv - 45 + 160, ejes: [{ x: xDrv, z: D.zMotriz }] },
      { rol: 'tensor', x0: xTen + 45 - 160, x1: xTen + 45 + 160, ejes: [{ x: xTen, z: D.zTensor }] },
    ]
    // GT: xDrv−xTen=380 < 2×320 → las dos mechas se solapaban 30 mm (panel).
    // Una sola mecha COMBINADA por costado con los dos pasos y las dos grillas.
    : [{ rol: 'combinada', x0: xTen - 115, x1: xDrv + 115, ejes: [{ x: xTen, z: D.zTensor }, { x: xDrv, z: D.zMotriz }] }];
  // Montaje faldón→mecha: donde las pestañas no tienen tramo libre (tensor y
  // GT: la mecha ocupa el plano del ala), la guarda se aperna POR EL FALDÓN a
  // la mecha con M6 ROSCADO en la PL8 (2 columnas × 2 filas por mecha, lejos
  // de la grilla UCF). Comparten coordenadas: no pueden desalinearse.
  for (const m of mechasSpec) {
    const zBot = Math.min(...m.ejes.map(e => e.z)) - 110;
    const rows = [-250, -350].filter(z => z > zBot + 30 && z < -210);
    m.mounts = [];
    for (const x of [m.x0 + 55, m.x1 - 55]) for (const z of rows) m.mounts.push({ x: r2(x), z });
  }

  const G = {
    t: 1.5, fondoW: 504, skirtY: 252, pestW: 36, holeY: 222,
    fondoZ: -525, fondoZTen: -415, pasoM6: 400, holeDia: 7,
  };
  const zAlaTop = D.plTop - D.plAlto + D.plT;      // cara superior del ala
  const zAlaBot = D.plTop - D.plAlto;              // cara inferior del ala (asiento de guarda)
  // Muescas de pestaña CALCULADAS desde el lazo real: cada cruce del contorno
  // exterior de la banda por el plano de pestañas (z ala) abre una ventana
  // [x−80, x+100] — el panel encontró 5 de 6 cruces sin muesca con la lista
  // manual. Cubre además la variación de flecha de catenaria (50–150).
  const zPest = D.plTop - D.plAlto;
  const crucesPest = [];
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], b = outer[(i + 1) % outer.length];
    if ((a[1] - zPest) * (b[1] - zPest) < 0) {
      const t01 = (zPest - a[1]) / (b[1] - a[1]);
      crucesPest.push(r2(a[0] + t01 * (b[0] - a[0])));
    }
  }
  const ventanas = crucesPest.sort((u, v) => u - v).map(x => [x - 80, x + 100]);
  // fusionar ventanas solapadas
  const muescasAuto = [];
  for (const w of ventanas) {
    const last = muescasAuto[muescasAuto.length - 1];
    if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
    else muescasAuto.push([...w]);
  }
  const clip = (xa, xb) => muescasAuto
    .filter(([a, b]) => b > xa && a < xb)
    .map(([a, b]) => [Math.max(xa, a), Math.min(xb, b)]);
  const guardas = esLBP
    ? [
      { tag: 'motriz', xa: r2(xDrv - 1450), xb: L, fondoZ: G.fondoZ, tapas: { a: false, b: true } },
      { tag: 'tensor', xa: 0, xb: r2(xTen + 350), fondoZ: G.fondoZTen, tapas: { a: true, b: false } },
    ]
    : [{ tag: 'unica', xa: 0, xb: L, fondoZ: G.fondoZ, tapas: { a: true, b: true } }];
  // M6 por TRAMO de pestaña (entre muescas): ≥1 por tramo ≥80, a 40 de cada
  // borde y relleno cada ≤400 — así ninguna guarda queda sin fijación.
  const holesAla = [];
  for (const g of guardas) {
    g.muescas = clip(g.xa, g.xb);
    for (const m of mechasSpec) {
      if (m.x1 > g.xa && m.x0 < g.xb) g.muescas.push([Math.max(g.xa, m.x0 - 10), Math.min(g.xb, m.x1 + 10)]);
    }
    g.muescas.sort((u, v) => u[0] - v[0]);
    const fus = [];
    for (const w of g.muescas) {
      const last = fus[fus.length - 1];
      if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
      else fus.push([...w]);
    }
    g.muescas = fus;
    g.munones = [[xDrv, D.zMotriz], [xTen, D.zTensor]]
      .filter(([x]) => x > g.xa && x < g.xb).map(([x, z]) => ({ x: r2(x), z }));
    g.mechaMounts = mechasSpec.flatMap(m => (m.mounts || []))
      .filter(q => q.x > g.xa && q.x < g.xb);
    let tramos = [[g.xa, g.xb]];
    for (const [m0, m1] of g.muescas) {
      tramos = tramos.flatMap(([a, b]) => {
        const out = [];
        if (m0 > a) out.push([a, Math.min(m0, b)]);
        if (m1 < b) out.push([Math.max(m1, a), b]);
        return out;
      });
    }
    g.tramos = tramos.filter(([a, b]) => b - a >= 80);
    if (process.env.DBG) console.log(`  DBG guarda ${g.tag}: muescas=${JSON.stringify(g.muescas.map(m=>m.map(r2)))} tramos=${JSON.stringify(g.tramos.map(m=>m.map(r2)))}`);
    g.holesX = [];
    for (const [a, b] of g.tramos) {
      const len = b - a;
      const n = Math.max(2, Math.ceil(len / G.pasoM6) + 1);
      for (let i = 0; i < n; i++) {
        const x = r2(a + 40 + (len - 80) * (n === 1 ? 0.5 : i / (n - 1)));
        g.holesX.push(x);
        holesAla.push({ x, yDev: 11, dia: G.holeDia });
      }
    }
  }

  for (const s of [-1, 1]) {
    const y = s * (yIn + D.plT / 2);
    const nm = s > 0 ? 'motriz (+Y)' : 'libre (−Y)';
    const f = [
      box(`Alma ${L}×${D.plAlto}`, [L / 2, y, D.plTop - D.plAlto / 2], L, D.plT, D.plAlto),
      box(`Ala inferior ${D.alaAncho}×${D.plT}`, [L / 2, y + (s > 0 ? -1 : 1) * (D.alaAncho / 2 - D.plT / 2), D.plTop - D.plAlto + D.plT / 2], L, D.alaAncho, D.plT),
    ];
    for (const h of holesAlma) {
      f.push(hole(`Paso perno M${D.retPernoM} eje muerto retorno`, [h.x, y, D.plTop - h.dz], [0, s, 0], h.dia, 0, true));
    }
    for (const h of holesAla) {
      f.push(hole('Paso M6 guarda inferior', [h.x, s * G.holeY, zAlaTop - D.plT / 2], [0, 0, 1], h.dia, 0, true));
    }
    addPart(`FAB · Placa lateral ${nm} PL6 L=${L}`, C.placa, [L / 2, y, D.plTop], f, {
      flat: flatPlacaConAla(L, D.plAlto, D.alaAncho, D.plT, holesAlma,
        'Acero S275JR PL6 — terminación PINTADO RAL 7035 (decisión Sergio 12-08)',
        'MECHAS PORTA-CHUMACERA VAN SOLDADAS (ver GA y plano de mecha)', holesAla),
    });
  }

  // ---- piezas de guarda ----
  // Faldones POR FUERA del bastidor (interior 485 > banda 457,2 y > exterior
  // 482): la catenaria y la banda descendente viajan dentro de la artesa sin
  // roce. Pestañas hacia ADENTRO apoyadas bajo el ala, con M6 en la zona
  // plana del ala (11 del borde libre) y tramos segmentados por las muescas.
  for (const g of guardas) {
    const Lg = r2(g.xb - g.xa);
    const latAlto = r2(zAlaBot - g.fondoZ);
    const xm = (g.xa + g.xb) / 2;
    const f = [
      box('Fondo artesa', [xm, 0, g.fondoZ + G.t / 2], Lg, G.fondoW, G.t),
    ];
    for (const s of [-1, 1]) {
      f.push(box('Lateral artesa', [xm, s * (G.skirtY + G.t / 2), (zAlaBot + g.fondoZ) / 2], Lg, G.t, latAlto));
      // pestaña hacia adentro, segmentada entre muescas
      let segs = [[g.xa, g.xb]];
      for (const [m0, m1] of g.muescas) {
        segs = segs.flatMap(([a, b]) => {
          const out = [];
          if (m0 > a) out.push([a, Math.min(m0, b)]);
          if (m1 < b) out.push([Math.max(m1, a), b]);
          return out;
        });
      }
      for (const [a, b] of segs) {
        if (b - a < 30) continue;
        f.push(box('Pestaña de montaje', [(a + b) / 2, s * (G.skirtY - G.pestW / 2), zAlaBot - G.t / 2], r2(b - a), G.pestW, G.t));
      }
      for (const x of g.holesX) {
        f.push(hole('Paso M6', [x, s * G.holeY, zAlaBot - G.t / 2], [0, 0, 1], G.holeDia, 0, true));
      }
      // pasos de muñón: el eje sale del faldón hacia la chumacera/motor
      for (const m of g.munones) {
        f.push(hole('Paso muñón Ø48', [m.x, s * (G.skirtY + G.t / 2), m.z], [0, s, 0], 48, 0, true));
      }
      // montaje faldón→mecha (M6 a los roscados de la PL8)
      for (const q of g.mechaMounts) {
        f.push(hole('Paso M6 a mecha', [q.x, s * (G.skirtY + G.t / 2), q.z], [0, s, 0], G.holeDia, 0, true));
      }
    }
    // drenaje del fondo (criterio guardas.md)
    for (let x = g.xa + 90; x <= g.xb - 90; x += 450) {
      f.push(hole('Drenaje Ø8', [r2(x), 0, g.fondoZ + G.t / 2], [0, 0, 1], 8, 0, true));
    }
    for (const [on, xe] of [[g.tapas.a, g.xa], [g.tapas.b, g.xb]]) {
      if (!on) continue;
      const xin = xe === g.xa ? xe + G.t / 2 : xe - G.t / 2;
      f.push(box('Tapa de extremo', [xin, 0, (zAlaBot - 3 + g.fondoZ) / 2], G.t, G.fondoW, r2(zAlaBot - 3 - g.fondoZ)));
    }
    addPart(`FAB · Guarda inferior ${g.tag} — artesa U chapa ${G.t} (${Lg}×${G.fondoW})`, C.guarda,
      [xm, 0, g.fondoZ], f, {
        flat: flatGuardaU(Lg, G.fondoW, latAlto, G.pestW, G.t, g.holesX.map(x => r2(x - g.xa)),
          'Acero S275JR e1.5 — terminación PINTADO RAL 7035', g.tapas,
          g.muescas.map(([a, b]) => [Math.max(0, a - g.xa), Math.min(Lg, b - g.xa)]),
          { holeY: G.holeY, skirtY: G.skirtY, zAlaBot, drenaje: true,
            munones: g.munones.map(m => ({ x: r2(m.x - g.xa), z: m.z })),
            mechaMounts: g.mechaMounts.map(m => ({ x: r2(m.x - g.xa), z: m.z })) }),
      });
  }

  // ---- Mechas porta-chumacera PL8 (pieza PROPIA, soldada a cada placa) ----
  // Antes vivían como features de la placa: la maestranza no sabía que eran
  // una pieza aparte ni dónde soldarla, y les faltaba el agujero MÁS
  // importante — el PASO DEL MUÑÓN Ø30 (el modelo solo traslapaba mallas).
  // Paso Ø40: muñón Ø30 h6 + holgura de montaje y giro (no toca la mecha).
  for (const s of [-1, 1]) {
    const y = s * (yIn + D.plT + 4);   // PL8 centrada sobre la cara exterior de la placa
    for (const m of mechasSpec) {
      const zBot = Math.min(...m.ejes.map(e => e.z)) - 110;
      const hM = r2(mechaTop - zBot);
      const w = r2(m.x1 - m.x0);
      const holes = [];
      const f = [box(`Mecha PL8 ${w}×${hM}`, [(m.x0 + m.x1) / 2, y, zBot + hM / 2], w, 8, hM)];
      for (const e of m.ejes) {
        const xd = r2(e.x - m.x0), yd = r2(e.z - zBot);
        holes.push({ x: xd, y: yd, dia: mechaPasoDia });
        f.push(hole(`Paso muñón Ø${mechaPasoDia}`, [e.x, y, e.z], [0, s, 0], mechaPasoDia, 0, true));
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
          holes.push({ x: r2(xd + dx * D.ucf.boltGap / 2), y: r2(yd + dz * D.ucf.boltGap / 2), dia: D.ucf.boltDia });
          f.push(hole('Perno chumacera Ø12', [e.x + dx * D.ucf.boltGap / 2, y, e.z + dz * D.ucf.boltGap / 2], [0, s, 0], D.ucf.boltDia, 0, true));
        }
      }
      // roscados M6 del montaje de guarda (broca Ø5 en plano; roscar M6)
      for (const q of (m.mounts || [])) {
        holes.push({ x: r2(q.x - m.x0), y: r2(q.z - zBot), dia: 5 });
        f.push(hole('M6 roscado (montaje guarda)', [q.x, y, q.z], [0, s, 0], 5, 0, true));
      }
      // pasos para los M8 del alma que caen dentro de la huella de la mecha
      // (en el GT el eje muerto del retorno atraviesa placa + mecha)
      for (const h of holesAlma) {
        const z = D.plTop - h.dz;
        if (h.x > m.x0 && h.x < m.x1 && z > zBot && z < mechaTop) {
          holes.push({ x: r2(h.x - m.x0), y: r2(z - zBot), dia: h.dia });
          f.push(hole(`Paso M${D.retPernoM} retorno (a través de mecha)`, [h.x, y, z], [0, s, 0], h.dia, 0, true));
        }
      }
      addPart(`FAB · Mecha porta-chumacera PL8 ${m.rol} ${w}×${hM}`, C.placa, [(m.x0 + m.x1) / 2, y, zBot + hM / 2], f, {
        flat: flatPlaca(w, hM, 8, holes, 'Acero S275JR PL8 — PINTADO RAL 7035',
          'SOLDAR A CARA EXTERIOR DEL ALMA — traslape 88 mm sobre la tangente del pliegue; 3 cordones 4 mm (superior + verticales), ver GA'),
      });
    }
  }

  // ---- Travesaños tipo ZP2026 (TR_S): perfil C plegado 88×40×3 ----
  const pasoT = esLBP ? D.pasoTravLBP : D.pasoTravFT;
  const zTv = D.plTop - D.plAlto + 22;
  // Huella del travesaño: x±44, z −186…−146 (+margen 6). El panel encontró la
  // catenaria atravesando el de x=4500 y la envoltura del retorno el de x=300
  // (GT): ahora cada posición se prueba contra el lazo (ambas caras) y se
  // corre ±200/±300 si choca; si no hay hueco, se omite con aviso.
  const segRect = (a, b, x0, x1, z0, z1) => {
    const dentro = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= z0 && p[1] <= z1;
    if (dentro(a) || dentro(b)) return true;
    const cruza = (p, q, v, lo, hi, ax) => {
      const pa = ax ? p[0] : p[1], pb = ax ? q[0] : q[1];
      if ((pa - v) * (pb - v) >= 0) return false;
      const t01 = (v - pa) / (pb - pa);
      const o = ax ? p[1] + t01 * (q[1] - p[1]) : p[0] + t01 * (q[0] - p[0]);
      return o >= lo && o <= hi;
    };
    return cruza(a, b, x0, z0, z1, true) || cruza(a, b, x1, z0, z1, true) ||
           cruza(a, b, z0, x0, x1, false) || cruza(a, b, z1, x0, x1, false);
  };
  const lazoChoca = (xt) => {
    const x0 = xt - 50, x1 = xt + 50, z0 = -192, z1 = -140;
    for (const cara of [outer, inner]) {
      for (let i = 0; i < cara.length; i++) {
        if (segRect(cara[i], cara[(i + 1) % cara.length], x0, x1, z0, z1)) return true;
      }
    }
    return false;
  };
  const xsTrav = [];
  for (let x = pasoT / 2; x < L; x += pasoT) {
    let xt = null;
    for (const dx of [0, -200, 200, -300, 300]) {
      const c = x + dx;
      if (c < 150 || c > L - 150) continue;
      if (!lazoChoca(c)) { xt = r2(c); break; }
    }
    if (xt === null) { console.warn(`  ! travesaño en x=${x} omitido: el lazo ocupa toda la ventana`); continue; }
    xsTrav.push(xt);
  }
  for (const x of xsTrav) {
    addPart('FAB · Travesaño tipo ZP2026 (TR_S) — C 88×40×3', C.trav, [x, 0, zTv], [
      box('Alma C 88', [x, 0, zTv - D.travC.h / 2 + D.travC.t / 2], D.travC.w, D.innerW, D.travC.t),
      box('Ala +X', [x + D.travC.w / 2 - D.travC.t / 2, 0, zTv], D.travC.t, D.innerW, D.travC.h),
      box('Ala −X', [x - D.travC.w / 2 + D.travC.t / 2, 0, zTv], D.travC.t, D.innerW, D.travC.h),
    ], {
      flat: flatPerfilC(D.innerW, D.travC.w, D.travC.h, D.travC.t,
        'Acero S275JR e3 — plegado en C 88×40 (matriz ZP2026), PINTADO RAL 7035. SOLDAR a placas laterales según GA'),
    });
  }

  // ---- Guía de APOYO (carried way): pletina de canto 12 + BAR CAP UHMW
  // enrollable P101203-30 (cotización). LBP: entre carriles, gap ≤50.
  const wear = esLBP ? D.wearLBP : D.wearGT;
  const spanW = BELT.ancho - 40;
  const wearL = L - 2 * (BELT.noseR + BELT.esp + 30);   // 30 del eje de nariz: luz declarada 2,8 al cabezal (panel)
  for (let i = 0; i < wear.n; i++) {
    const y = -spanW / 2 + (i + 0.5) * spanW / wear.n;
    addPart(`NORM · Guía de apoyo: pletina 12×${D.pletina.h} + BAR CAP ${D.barCap.w}×${D.barCap.h} (${BELT.barCap.split(' — ')[0]})`, C.uhmw,
      [L / 2, y, zci - D.barCap.h / 2], [
        box('Bar cap UHMW', [L / 2, y, zci - D.barCap.h / 2], wearL, D.barCap.w, D.barCap.h),
        box('Pletina 12 de canto', [L / 2, y, zci - D.barCap.h - D.pletina.h / 2 + 6], wearL, D.pletina.t, D.pletina.h),
      ]);
  }

  // ---- Nosebar en AMBAS puntas + CABEZAL porta-nosebar ----
  // Geometría real del 22868 (brochure Movex p.8, catálogo imperial p.227):
  // cuerpo 65 de alto × 19 de espesor, 6 agujeros Ø8.5 por segmento K=152.4
  // (columnas a 15.9/75.9/135.9 del inicio del segmento; filas a 18.75 del
  // borde superior y +19.05). Para 18 in van 3 segmentos. Montaje LADO IDLER
  // (rodillos libres = acumulación); girado 180° acelera — misma pieza.
  // El cabezal es la pieza FAB que lo recibe: placa PL6 vertical soldada
  // entre las placas laterales, con la MISMA grilla en Ø9 (paso M8) y tuercas
  // por la cara interior.
  const NB = { cuerpoH: 65, cuerpoT: 19, K: 152.4, cols: [15.9, 75.9, 135.9], fila1: 18.75, fila2: 37.8, holeDia: 8.5 };
  const nbHoles = [];   // {y, dz} — y mundo; dz bajo el tope del nosebar
  for (let seg = 0; seg < 3; seg++) {
    const y0 = -BELT.ancho / 2 + seg * NB.K;
    for (const c of NB.cols) for (const dz of [NB.fila1, NB.fila2]) {
      nbHoles.push({ y: r2(y0 + c), dz });
    }
  }
  const art = esLBP ? BELT.noseArtLBP : BELT.noseArtGT;
  const cabH = 90, cabTop = zci - 3;   // 1,25 de luz a la barrida de rodillos (panel: antes penetraba 2 la banda)
  for (const [x0, nm] of [[BELT.noseR + BELT.esp, 'entrada'], [L - BELT.noseR - BELT.esp, 'descarga']]) {
    const zN = zci - BELT.noseR;
    const dirIn = x0 < L / 2 ? 1 : -1;    // el cuerpo crece hacia adentro
    const fN = [
      cyl(`Punta rodamientos Ø${BELT.noseR * 2}`, [x0, -BELT.ancho / 2, zN], [0, 1, 0], BELT.noseR * 2, BELT.ancho),
      box(`Cuerpo BluLub 65×19 (3 segmentos K=${NB.K})`, [x0 + dirIn * (2 + NB.cuerpoT / 2), 0, zci - NB.cuerpoH / 2], NB.cuerpoT, BELT.ancho, NB.cuerpoH),
    ];
    for (const h of nbHoles) {
      fN.push(hole(`Ø${NB.holeDia} montaje`, [x0 + dirIn * (2 + NB.cuerpoT / 2), h.y, zci - h.dz], [dirIn, 0, 0], NB.holeDia, 0, true));
    }
    addPart(`NORM · Nosebar ${nm} 18 in (3× K6 in, montaje IDLER=acumulación) — ${art}`, C.nose, [x0, 0, zN], fN);

    // Cabezal porta-nosebar (FAB): recibe los 18 M8 del nosebar
    const xc = x0 + dirIn * (2 + NB.cuerpoT + 3);
    const fC = [box(`Placa cabezal PL6 ${D.innerW}×${cabH}`, [xc, 0, cabTop - cabH / 2], D.plT, D.innerW, cabH)];
    const holesCab = [];
    for (const h of nbHoles) {
      fC.push(hole('Paso M8 nosebar', [xc, h.y, zci - h.dz], [dirIn, 0, 0], 9, 0, true));
      holesCab.push({ x: r2(h.y + D.innerW / 2), y: r2((zci - h.dz) - (cabTop - cabH)), dia: 9 });
    }
    addPart(`FAB · Cabezal porta-nosebar ${nm} PL6 ${D.innerW}×${cabH}`, C.placa, [xc, 0, cabTop - cabH / 2], fC, {
      flat: flatPlaca(D.innerW, cabH, D.plT, holesCab, 'Acero S275JR PL6 — PINTADO RAL 7035',
        'GRILLA = 6×Ø9 POR SEGMENTO DE NOSEBAR (Movex 22868: cols 15.9/75.9/135.9 · filas 18.75/+19.05). SOLDAR entre placas laterales — tuercas M8 por cara interior'),
    });
  }

  // ---- Retorno: RODILLOS de eje muerto (decisión usuario, cotización):
  // tubo Ø63.5 con 2 rodamientos SELLADOS 6202-2RS insertos en los extremos;
  // eje muerto Ø15 perforado+roscado M8 en ambas caras → PERNO HEXAGONAL M8
  // + golilla POR FUERA de la placa (misma solución del transfer90 con M10)
  for (const q of path) {
    if (q.rol !== 'ret' && q.rol !== 'snub') continue;
    const f = [
      cyl(`Tubo Ø${D.gtRetDia} (2× 6202-2RS insertos)`, [q.c[0], -D.sqLen / 2, q.c[1]], [0, 1, 0], D.gtRetDia, D.sqLen),
      cyl(`Eje muerto Ø${D.retEjeDia} (roscado M${D.retPernoM} int. ambas puntas)`, [q.c[0], -D.innerW / 2, q.c[1]], [0, 1, 0], D.retEjeDia, D.innerW),
    ];
    for (const sd of [-1, 1]) {
      f.push(cyl(`Perno hex M${D.retPernoM} + golilla (por fuera)`, [q.c[0], sd * (D.innerW / 2 + D.plT), q.c[1]], [0, sd, 0], 13, 6));
    }
    addPart(`FAB · Rodillo retorno Ø${D.gtRetDia} — tubo A513 Ø63,5×3,0 + 2 cabezales torneados asiento Ø35 H7 (6202-2RS) · eje muerto Ø15 SAE1045 roscado M${D.retPernoM} — plano EJ-04 pendiente`,
      C.ret, [q.c[0], 0, q.c[1]], f);
  }

  // ---- EJE MOTRIZ (abajo, descarga) + sprockets + chumaceras + motor ----
  addPart(`FAB · EJE MOTRIZ cuadrado ${D.sq} — L=${D.ejeMotrizL} (muñones Ø30 ${D.jrnTol})`, C.eje,
    [xDrv, 0, D.zMotriz], ejeMotriz(xDrv, D.zMotriz));
  for (const y of ySprk) {
    addPart(`NORM · Sprocket ${BELT.sprocket.art}`, C.sprk, [xDrv, y, D.zMotriz], sprocket(xDrv, y, D.zMotriz));
  }
  const yFix = ySprk[Math.floor(ySprk.length / 2)];   // solo el central se fija
  for (const sd of [-1, 1]) {
    const yC = yFix + sd * (BELT.sprocket.ancho / 2 + 6);
    addPart(`NORM · Collarín ${BELT.collar.split(' — ')[0]} (fija el sprocket central)`, C.chum,
      [xDrv, yC, D.zMotriz], collar(xDrv, yC, D.zMotriz));
  }
  for (const s of [-1, 1]) {
    addPart('NORM · Chumacera UCF206 Ø30', C.chum, [xDrv, s * (yOut + 8), D.zMotriz], chumaceraUCF(xDrv, s * (yOut + 8), D.zMotriz));
  }
  const yM = yOut + 30;
  addPart('NORM · Motorreductor NMRV-P075 1/30 eje hueco Ø30 H8 · 0,55 kW 4P (46 rpm · 89 Nm) + brazo de torque', C.motor, [xDrv, yM + D.motor.cuerpo[1] / 2, D.zMotriz], [
    cyl(`Cubo hueco Ø${D.motor.boss}`, [xDrv, yM - 10, D.zMotriz], [0, 1, 0], D.motor.boss, D.motor.bossL),
    box('Cuerpo reductor', [xDrv, yM + D.motor.cuerpo[1] / 2 + 40, D.zMotriz], D.motor.cuerpo[0], D.motor.cuerpo[1], D.motor.cuerpo[2]),
    box('Brazo de torque', [xDrv - 130, yM + 20, D.zMotriz - 60], 40, 12, 160),
  ]);

  // ---- EJE TENSOR/DEFLEXIÓN (abajo, entrada) + 2 sprockets locos ----
  addPart(`FAB · EJE TENSOR cuadrado ${D.sq} — L=${D.ejeTensorL} (muñones Ø30 ${D.jrnTol})`, C.eje,
    [xTen, 0, D.zTensor], ejeTensor(xTen, D.zTensor));
  const yLocos = esLBP ? [-152.4, 152.4] : [ySprk[1], ySprk[ySprk.length - 2]];
  for (const y of yLocos) {
    addPart('NORM · Sprocket Z32 loco (flotante +0.4/+0.3, grano suelto)', C.sprk, [xTen, y, D.zTensor], sprocket(xTen, y, D.zTensor));
  }
  for (const s of [-1, 1]) {
    addPart('NORM · Chumacera UCF206 Ø30', C.chum, [xTen, s * (yOut + 8), D.zTensor], chumaceraUCF(xTen, s * (yOut + 8), D.zTensor));
  }

  // ---- Guía LATERAL: conical rail ENROLLABLE L 1¼ in (P12501C, cotización)
  // sobre escuadras regulables; núcleo AISI304 1.5 + cara Ti-WHITE
  for (const s of [-1, 1]) {
    addPart(`NORM · Guía lateral conical rail L 1¼ in (${BELT.railLateral.split(' — ')[0]}) + escuadras`, C.guia,
      [L / 2, s * (yIn - 5), 25], [
        box('Cara Ti-WHITE 1¼ in', [L / 2, s * (yIn - 5), 25], L - 120, 6, D.guiaAlto),
        box('Núcleo/ala AISI304 1.5', [L / 2, s * (yIn - 5) + s * 5, 25 + D.guiaAlto / 2 - 1], L - 120, 12, 2),
      ]);
  }

  // ---- Soportes tipo ZP2026 (B_005A 203×95, chapa plegada 3 mm) ----
  const patasX = esLBP ? [700, L / 2, L - 700] : [L / 2];
  const hSop = (D.plTop - D.plAlto) - D.pisoZ;   // frame → NPT (con nivelador)
  for (const x of patasX) {
    for (const s of [-1, 1]) {
      const y = s * (yOut + D.sop.t / 2);
      const zc = (D.pisoZ + D.plTop - D.plAlto) / 2;
      addPart('FAB · Soporte tipo ZP2026 (B_005A) 203×95×3 + nivelador', C.pata, [x, y, zc], [
        box('Alma 203', [x, y, zc], D.sop.w, D.sop.t, hSop),
        box('Ala +X', [x + D.sop.w / 2 - D.sop.t / 2, y - s * (D.sop.d / 2 - D.sop.t / 2), zc], D.sop.t, D.sop.d, hSop),
        box('Ala −X', [x - D.sop.w / 2 + D.sop.t / 2, y - s * (D.sop.d / 2 - D.sop.t / 2), zc], D.sop.t, D.sop.d, hSop),
        box('Placa piso + nivelador', [x, y - s * D.sop.d / 4, D.pisoZ + 3], D.sop.pie, D.sop.pie, 6),
      ]);
    }
    addPart('FAB · Riostra de soportes (tipo ZP2026)', C.pata, [x, 0, D.pisoZ + 200], [
      box('Riostra C 88×40', [x, 0, D.pisoZ + 200], D.travC.w, D.outerW - D.sop.d, D.travC.h),
    ], {
      flat: flatPerfilC(D.outerW - D.sop.d, D.travC.w, D.travC.h, D.travC.t,
        'Acero S275JR e3 — plegado en C 88×40 (matriz ZP2026), PINTADO RAL 7035. SOLDAR a soportes según GA'),
    });
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

  // datos para verify(): puntos del lazo, chequeo de guardas y travesaños
  const guardasChk = guardas.map(g => ({
    tag: g.tag, xa: g.xa, xb: g.xb, fondoZ: g.fondoZ, pernos: g.holesX.length * 2 + g.mechaMounts.length * 2,
  }));
  const travChk = xsTrav.filter(x => lazoChoca(x));
  let mechasOverlap = false;
  for (let i = 0; i < mechasSpec.length; i++) for (let j = i + 1; j < mechasSpec.length; j++) {
    if (mechasSpec[i].x1 > mechasSpec[j].x0 && mechasSpec[j].x1 > mechasSpec[i].x0) mechasOverlap = true;
  }
  return { parts, largoBanda: largo, wraps, path, pathOuterPts: outer, guardasChk, travChk, mechasOverlap };
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
  if (D.gtRetDia / 2 < BELT.backflex) e.push(`rodillo de retorno R${D.gtRetDia / 2} < backflex ${BELT.backflex}`);
  // grid de sprockets del 530 LBP (manual p.30 / brochure p.11): A·B·C·B·C·A
  const gaps = D.ySprkLBP.slice(1).map((y, i) => r2(y - D.ySprkLBP[i]));
  if (JSON.stringify(gaps) !== JSON.stringify([63.35, 89.05, 63.35, 89.05]))
    e.push(`grid de sprockets LBP inválido: gaps ${gaps} (esperado B,C,B,C = 63.35,89.05,...)`);
  const margen = r2(BELT.ancho / 2 - Math.max(...D.ySprkLBP.map(Math.abs)));
  if (margen !== 76.2) e.push(`indent A del grid LBP = ${margen} (esperado 76.2)`);
  if (D.gtRetDia <= 50) e.push('rodillo de retorno GT ≤ 50 (manual: D>50)');
  // ── compuertas nacidas del panel adversarial (12-08) ──
  for (const eq of [res.LBP, res.GT]) {
    if (!eq) continue;
    const nm = eq === res.LBP ? 'LBP' : 'GT';
    for (const g of eq.guardasChk || []) {
      const pts = eq.pathOuterPts.filter(q => q[0] > g.xa && q[0] < g.xb);
      const zMin = pts.length ? Math.min(...pts.map(q => q[1])) : Infinity;
      if (zMin < g.fondoZ + 40)
        e.push(`${nm}/guarda ${g.tag}: fondo a ${g.fondoZ} deja ${r2(zMin - g.fondoZ)} de holgura al lazo (mínimo 40)`);
      if (g.pernos < 4) e.push(`${nm}/guarda ${g.tag}: solo ${g.pernos} pernos M6 (mínimo 2 por lado)`);
    }
    for (const c of eq.travChk || []) e.push(`${nm}: travesaño x=${c} cruzado por el lazo`);
    if (eq.mechasOverlap) e.push(`${nm}: mechas solapadas entre sí`);
  }
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
    if (tipo === 'LBP') r.sag = r2(Math.abs(D.sagBot - D.retTop));
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
  sprockets: `Z-32 MOLDEADO PD 153.4 OD 154.8 ancho 40, BORE CUADRADO 1.5 in c/grano M8 (P158808YF, cotización 26012937) — 530 LBP estándar 18 in: 5/eje en el grid VÁLIDO A·B·C·B·C·A (centrado: -152.4/-89.05/0/+63.35/+152.4; manual p.30 = brochure p.11; poner 6 es IMPOSIBLE: las demás posiciones caen bajo los carriles de rodillos ✗; 6 aplica solo a 530 PRO LBP) · GT: 6/eje (indent 38.1, paso 76.2); SOLO el central FIJO (grano M8 + collarines P21703Y), resto FLOTAN (+0.4/+0.3)`,
  retorno: 'RODILLOS Ø63.5 de eje muerto cada ~500 (decisión usuario; manual Movex sugiere zapata para LBP — desviación registrada): tubo con 2 rodamientos SELLADOS 6202-2RS insertos, eje Ø15 roscado M8 interior en ambas puntas, PERNO HEX M8 + golilla POR FUERA de la placa; catenaria 50–150 tras la motriz',
  estructura: 'soportes tipo ZP2026 (B_005A, chapa plegada 3 mm, 203×95, con nivelador) y travesaños tipo ZP2026 (TR_S, C 88×40×3); guía de apoyo = pletina 12 de canto + BAR CAP UHMW P101203-30 (enrollable, rollo 30 m); guía lateral = conical rail enrollable L 1¼ in P12501C sobre escuadras',
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
  // Cotización MOVEX 26012937 (09-07-2026, EUR, EXW Castelli Calepio) —
  // projects/LBP530-18/input/docs/Cotizacion_MOVEX_26012937.pdf.
  // "necesario" = lo que consumen las 4 líneas; "cotizado" = lo ofertado.
  compraMovex: {
    banda_530LBP_18in: { art: 'P5324010018A', precioEUR_m: 174.85, necesario_m: r2(4 * lazoLBP), cotizado_m: 90.3, nota: 'cotizado cubre ~2× (repuesto/futuras líneas); rollos de 1.5 m' },
    banda_530GT_18in: { art: 'P5323010018A', precioEUR_m: 243.18, necesario_m: r2(4 * lazoGT), cotizado_m: 18.0 },
    sprockets_Z32_cuadrado15: { art: 'P158808YF', precioEUR: 17.42, necesario: 4 * (BELT.nSprkLBP + 2) + 4 * (BELT.nSprkGT + 2), cotizado: 152, detalle: 'rueda moldeada Z-32 c/grano M8; LBP 5+2 · GT 6+2 por transportador' },
    collarines: { art: 'P21703Y', precioEUR: 2.32, necesario: 2 * 16, cotizado: 60, detalle: '2 por eje (flanquean el sprocket central fijo)' },
    nosebar_LBP: { art: 'P22868', precioEUR: 38.73, necesario: 4 * 2 * 3, cotizado: 51, detalle: 'h19 C/RODAMIENTOS, L=6 in: 3 por punta × 2 puntas × 4 LBP' },
    nosebar_GT: { art: 'P22862', precioEUR: 31.0, necesario: 4 * 2 * 3, cotizado: 51, detalle: 'transfer plate C/RODAMIENTOS h19, L=6 in' },
    bar_cap: { art: 'P101203-30', precioEUR_m: 6.96, cotizado_m: 360, detalle: 'BAR CAP UHMW 17.53×19.05 p/pletina 12 — guía de APOYO enrollable (rollo 30 m)' },
    conical_rail_T1: { art: 'P12201C', precioEUR_m: 17.14, cotizado_m: 156, detalle: 'T-shape 1 in blanco/acero 1.5 — guía lateral/apoyo según layout' },
    conical_rail_T40: { art: 'P12401C', precioEUR_m: 18.63, cotizado_m: 105, detalle: 'T-shape 40 mm Ti-WHITE AISI304' },
    conical_rail_L114: { art: 'P12501C', precioEUR_m: 23.08, cotizado_m: 105, detalle: 'L-shape 1¼ in Ti-WHITE AISI304 — guía LATERAL del modelo' },
  },
};
writeFileSync(join(here, 'lbp530_dims.json'), JSON.stringify(dims, null, 1));
console.log(`OK lbp530_dims.json · lazo LBP ${lazoLBP} m · lazo GT ${lazoGT} m`);
