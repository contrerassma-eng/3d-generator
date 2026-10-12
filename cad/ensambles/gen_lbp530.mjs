#!/usr/bin/env node
// gen_lbp530.mjs — Generador paramétrico de los TRANSPORTADORES DE BANDA
// MODULAR Movex serie 530 de Conveyone (proyecto projects/LBP530-18):
//
//   - CV-LBP-5000 : banda Movex 530 LBP (roller top, baja contrapresión),
//                   18 in (457.2 mm), 5.0 m nose a nose.
//   - CV-GT-600   : banda Movex 530 GT (Grip Top = friction top de la
//                   familia 530), 18 in, 0.6 m nose a nose (pedido 2026-09-08;
//                   antes 0.8 m — regenerable con GT_L=800).
//
// Especificación del usuario (capa `user`, projects/LBP530-18/input/descripcion.md):
//   - Ejes CUADRADOS de 1.5 in (38.1) con TORNEADO EN LAS PUNTAS (muñones Ø30).
//   - TRACCIÓN EN UN EXTREMO, ABAJO (motriz bajo el bastidor, lado descarga).
//   - NOSEBAR EN AMBAS PUNTAS (transferencia de punta en los dos extremos).
//   - Motorreductor de EJE HUECO Ø30 montado DIRECTO en la punta motriz.
//   - Flota: 4 líneas × (1 grip top 0.6 m + 1 LBP 5.0 m) = 8 transportadores.
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
//   cad/ensambles/lbp530_gt06.json    ensamble Grip Top (friction top) 0.6 m
//   cad/ensambles/lbp530_dims.json    dimensiones/despiece (única fuente para
//                                     planos de ejes y lista de compra)
//
// Uso:  node cad/ensambles/gen_lbp530.mjs

import { writeFileSync, existsSync } from 'node:fs';
import { bendAllowance } from '../js/sheetmetal.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const IN = 25.4;
const r2 = (v) => Math.round(v * 100) / 100;
const BR = String.fromCharCode(10);

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
  plT: 3,                      // lateral de CHAPA 3 plegada (línea BRP/Kofmelk; antes PL6)
  plTop: -8, plAlto: 300,      // alma 300 (LateralCabezal_S550 del BRP = 300)
  alaAncho: 38, lipTop: 20,    // pestaña inferior 38 hacia AFUERA (asiento escuadra ZP2026) + labio superior 20 afuera
  travesanio: 40, pasoTravLBP: 1000, pasoTravFT: 600,

  // Ejes (barra cuadrada SAE 1045 1.5 in, muñones torneados Ø30)
  sq: r2(1.5 * IN),            // 38.1
  jrnDia: 30, jrnTol: 'h6',        // ajuste eje hueco NMRV: H8/h6 (catalogo Motovario p.90) — antes j6, corregido
  // Motorreductor VERIFICADO contra catalogo NMRV (docs/lbp/criterios/accionamiento.md):
  // el trio "0,37 kW + 42 rpm + >=85 Nm" no existe. Seleccion: NMRV-P 075 FA
  // 1/30, eje hueco O30 H8, motor 80A-4 0,55 kW -> n2 46 rpm, 89 Nm, fs 2,8.
  // v banda = pi*0.1534*46 = 22,2 m/min (rango 5-45 OK).
  jrnLibre: 50,                // placa 6 + UC206 (B=38.1) + margen
  jrnMotriz: 190,              // rodamiento (UCF206 39,7 + base) + BRAZO DE REACCIÓN 20 + luz + cubo motorreductor 110 (antes 165: el brazo no cabía entre la chumacera y la cara J)
  cuboMotor: 110,
  chaveta: { w: 8, h: 7, l: 90 },   // DIN 6885 A (zona del motorreductor)
  m10: 22, garganta: 2.5,

  // Chumaceras UCF206 (bore Ø30, brida cuadrada 4 pernos)
  ucf: { bore: 30, flange: 108, boltGap: 82.6, boltDia: 12, hubDia: 62, B: 38.1 },

  // Camino de banda / tracción (manual Movex: wrap motriz 140±10°)
  // Manual Movex p.72 «Bottom head drive»: la banda sale del nosebar de
  // descarga con giro 145°±10 (ramal descendente a ~35° bajo la horizontal),
  // envuelve la motriz 140°±10, pasa por un snub y entra a la catenaria
  // (700 +200/−50) → apoyos de retorno cada 500±50 → último tramo 450±50.
  // Barrido 2026-09-08: con la motriz a 600 de la descarga el giro en el
  // nosebar queda en 144,7° y la envoltura en 140,4° (snub a 100 / z −140).
  zMotriz: -400, xMotrizDesdePunta: 600,
  zTensor: -290, xTensorDesdePunta: 300,   // deflexión inferior, lado entrada
  retTop: -135, retCada: 500,              // retorno cada ~500; eje muerto en ALMA PLANA (fuera de la zona de plegado del ala)
  gtRetDia: 63.5,                          // rodillo retorno Ø63.5 (manual: D>50)
  // GT 600 (bastidor corto, 2026-09-08). Con el lazo del GT 800 (rodillo de
  // sujeción a 300 de la motriz y tensor en 300/−290) el acortamiento a 600
  // dispara la envoltura de la motriz a 155° y el rodillo cae sobre el tensor.
  // Barrido (motriz z −400/−450 × rodillo dx 150–300, z −150…−260 × tensor
  // x 160–300, z −220…−400): la única familia válida (sin cruce del lazo,
  // envoltura 130–150) lleva el TENSOR AL FONDO Y AL EXTREMO (180/−400, giro
  // ≈180°) y el rodillo de sujeción a 225 de la motriz y z −240:
  //   envoltura motriz 143,7° (Movex 140±10) · lazo 2,33 m.
  // Con solo dos ejes (sin rodillo) la envoltura no pasa de 129° — descartado.
  // GT 600 según el mismo esquema Movex: motriz bajo el bastidor a gtMotDx de
  // la descarga, SNUB (gtRet) tras la motriz y RODILLO DE COLA en colisa
  // (tensor por gravedad/ajuste, manual p.73) bajo el nosebar de entrada; sin
  // eje tensor con sprockets (no cabe con el ramal a 35°).
  // Barrido 2026-09-08 (motriz dx 300–420 × z −220…−350 × snub × cola): la
  // familia válida es motriz a 340 de la descarga y z −220, snub a 100 / z −140,
  // rodillo de cola en x 60 / z −170 → nosebar 138,6°, motriz 141,8°, cola 143°.
  gtRet: { dx: 100, z: -140, on: true },
  // Decisión Sergio + Movex (2026-09-08): UN SOLO EJE CUADRADO por equipo (el
  // motriz, con sprockets). La entrada lleva nosebar y un RODILLO DE COLA
  // Ø63,5 en colisa 9×40 (tensor por ajuste, manual p.73), en LBP y GT.
  tail: { x: 60, z: -170 },
  gtTail: { x: 60, z: -170 },   // alias histórico
  gtMotDx: 340,
  gtMotZ: -220,
  // rodillo de retorno de EJE MUERTO (decisión usuario): tubo Ø63.5 con 2
  // rodamientos SELLADOS 6202-2RS insertos; eje Ø15 perforado y roscado M8
  // en ambas puntas → perno hexagonal M8 + golilla POR FUERA de la placa
  retEjeDia: 15, retPernoM: 8,
  retPernoPas: 9,                          // paso del M8 en la placa (holgura media ISO 273)
  sagR: 450, sagBot: -265,                 // catenaria tras la motriz (flecha 130 bajo el plano de retorno −135; manual: ≤150)
  catenLen: 750,                           // largo de catenaria snub→primer apoyo (manual p.72: 700 +200/−50)
  // snub tras la motriz (manual p.72: pegado a la salida del sprocket, a la
  // altura del plano de retorno) — completa la envoltura de 140±10
  snub: { dx: 60, z: -140 },

  // Guía de APOYO (carried way): pletina de canto 12 mm + BAR CAP UHMW
  // 17.53×19.05 enrollable (P101203-30). LBP: entre carriles, gap ≤50.
  wearLBP: { n: 10 }, wearGT: { n: 7 },
  barCap: { w: 17.53, h: 19.05 }, pletina: { t: 12, h: 30 },

  // Guía LATERAL: conical rail enrollable L 1¼ in (P12501C) sobre escuadras
  guiaAlto: 32,
  // Familia ZP2026 REAL (ZP2026\Piezas, medidas leídas del ZP2026_Acumulacion.iam):
  // escuadra B_005A_1 203×95×38 · columna SOLID_06 C 77×38×3 L=588 · base B_004A_1
  // 158×40×4 · travesaño B_002A_1 C 71×38×3. Cotas desde el borde inferior del
  // lateral (ZP: Y −82,6): escuadra −47,5 · columna −311,8 · travesaño −304,8 ·
  // base −607,5 · piso −610. Con el lateral de 300 ⇒ NPT de banda 918.
  zp: { escuadra: { l: 203, h: 95, w: 38, dz: -47.5, dyOut: 15.9 }, columna: { w: 77, d: 38, t: 3, L: 588, dz: -311.8, dyOut: 18.9 },
        base: { l: 158, w: 40, t: 4, dz: -607.5, dyOut: 16.9 }, travPatas: { dzTop: -304.8 + 19 }, hPiso: 610 },
  travC: { w: 71, h: 38, t: 3, oreja: { w: 59, h: 50 } },   // sección del B_002A_1 (ZP2026); orejas plegadas apernadas al alma
  frente: { h: 240, ala: 40 },                              // frente porta-nosebar chapa 3 (Frente_BRP 245×40)
  acople: { w: 120, h: 100 },                               // acople de tramos de lateral PL3 (Acople_BRP)
  suple: { w: 108, t: 5 },                                  // suple de descanso PL5 (SupleDescanso_UCF206 del BRP)
  pernoCoche: { dia: 10, espec: 'perno coche 3/8 in × 1 in + tuerca + golilla + golilla de presión (Merge/BRP)' },
  // Motorreductor NMRV-P 075 (Motovario, criterios/accionamiento.md p.58/82): cubo pasante
  // G1 120 → aquí el cubo útil es 110 (cuboMotor); caja A=120 entre caras; eje del
  // sinfín (motor) 75 sobre el eje de salida; brida PAM 80 B14; motor IEC 80 4P 0,55 kW;
  // brazo de reacción «gota» K1=200, KH=20, R=30 sobre la cara J, ojo en pasador Ø25.
  nmrv: { hubD: 65, caja: [160, 110, 150], cajaDz: 20, I: 75, brida: { d: 120, l: 12 }, motorD: 156, motorL: 200, ventD: 160, ventL: 45, bornes: [90, 85, 60],
          brazo: { K1: 200, KH: 20, R: 30, Rhub: 62, ojo: 25.4, luz: 2 }, separadorD: 25.4 },
};

// Derivadas
D.innerW = r2(BELT.ancho + 2 * D.claroLat);          // 470.0 entre placas
D.outerW = r2(D.innerW + 2 * D.plT);                 // 482.0 exterior
D.sqLen = r2(D.innerW - 4);                          // 466
D.yFlangeOut = r2(D.innerW / 2 + D.plT + D.alaAncho);   // 276 — borde libre de la pestaña inferior
D.pisoZ = r2(D.plTop - D.plAlto - D.zp.hPiso);       // −918: piso con la columna REAL de 588 del ZP2026
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
  const xDrv = L - (tipo === 'LBP' ? D.xMotrizDesdePunta : D.gtMotDx);
  seq.push({ c: [xDrv, tipo === 'LBP' ? D.zMotriz : D.gtMotZ], r: D.rSprk, s: -1, rol: 'motriz' });
  if (tipo === 'LBP') {
    // snub Ø63.5 tras la motriz (completa la envoltura), luego catenaria
    // (manual: sag 50–150) y RODILLOS de retorno cada ~500 hasta el tensor
    const xSnub = xDrv - D.snub.dx;
    seq.push({ c: [xSnub, D.snub.z], r: D.gtRetDia / 2, s: 1, rol: 'snub' });
    // catenaria 700 +200/−50 entre el snub y el primer apoyo; luego apoyos
    // repartidos a 500±50 hasta dejar 450±50 al eje tensor (manual p.72)
    const xPrimero = xSnub - D.catenLen;
    seq.push({ c: [(xSnub + xPrimero) / 2, D.sagBot + D.sagR], r: D.sagR, s: -1, virtual: true, rol: 'catenaria' });
    const xUltimo = D.tail.x + 450;
    const nTramos = Math.max(1, Math.round((xPrimero - xUltimo) / D.retCada));
    const paso = (xPrimero - xUltimo) / nTramos;
    for (let k = 0; k <= nTramos; k++) {
      seq.push({ c: [r2(xPrimero - k * paso), D.retTop - D.gtRetDia / 2], r: D.gtRetDia / 2, s: 1, rol: 'ret' });
    }
  } else {
    // snub tras la motriz y rodillo de cola (tensor en colisa) bajo la entrada
    if (D.gtRet.on) seq.push({ c: [xDrv - D.gtRet.dx, D.gtRet.z], r: D.gtRetDia / 2, s: 1, rol: 'snub' });
  }
  // rodillo de cola bajo el nosebar de entrada (ambos equipos)
  seq.push({ c: [D.tail.x, D.tail.z], r: D.gtRetDia / 2, s: -1, rol: 'tail' });
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
// Agujero CUADRADO del perno coche (cuello 3/8 in): el estándar de las bandas de
// referencia (Travesaño BRP, Lateral cabezal) lleva cuadrado en la pieza donde apoya
// la cabeza, para que el perno no gire al apretar. Lado 10.3 (cuello 9.5 + juego).
const PC_SQ = 10.3;
const sqhole = (name, at, eje, t) => {
  const g = PC_SQ, e = t + 6;
  const dims = eje === 'x' ? [e, g, g] : eje === 'y' ? [g, e, g] : [g, g, e];
  return box(name, at, dims[0], dims[1], dims[2], 'cut');
};
const hole = (name, at, dir, dia, depth = 0, through = true) =>
  ({ id: fid(), name, shape: 'hole', op: 'cut', at, dir, params: { dia, depth, through } });
const sketchXZ = (name, yFace, pts, h, op = 'union') =>
  ({ id: fid(), name, shape: 'sketch', op, at: [0, yFace, 0], dir: [0, -1, 0], params: { pts, h, u: [1, 0, 0] } });

// AABB en coordenadas de mundo de una feature (para bbox de pieza e interferencias)
function aabb(f, pos = [0, 0, 0]) {
  const c = [f.at[0] + pos[0], f.at[1] + pos[1], f.at[2] + pos[2]], p = f.params;
  if (f.shape === 'box') {
    // convención del formato: `at` lleva la BASE en Z (box() resta h/2) y el centro en X/Y
    return [[c[0] - p.w / 2, c[1] - p.d / 2, c[2]], [c[0] + p.w / 2, c[1] + p.d / 2, c[2] + p.h]];
  }
  if (f.shape === 'cylinder' || f.shape === 'hole') {
    const d = f.dir || [0, 0, 1], R = p.dia / 2, h = f.shape === 'hole' ? (p.through ? 1e4 : (p.depth || 1e4)) : p.h;
    const lo = [], hi = [];
    for (let i = 0; i < 3; i++) {
      const ejeI = Math.abs(d[i]) > 0.5;
      const a0 = ejeI ? c[i] : c[i] - R, a1 = ejeI ? c[i] + Math.sign(d[i] || 1) * h : c[i] + R;
      lo.push(Math.min(a0, a1)); hi.push(Math.max(a0, a1));
    }
    if (f.shape === 'hole' && p.through) { const i = d.findIndex(v => Math.abs(v) > 0.5); lo[i] = c[i] - 1e4; hi[i] = c[i] + 1e4; }
    return [lo, hi];
  }
  if (f.shape === 'sketch') {
    const u = p.u || [1, 0, 0], d = f.dir || [0, -1, 0];
    const iu = u.findIndex(v => Math.abs(v) > 0.5), id = d.findIndex(v => Math.abs(v) > 0.5);
    const iv = [0, 1, 2].find(i => i !== iu && i !== id);
    const us = p.pts.map(q => q[0]), vs = p.pts.map(q => q[1]);
    const lo = [0, 0, 0], hi = [0, 0, 0];
    lo[iu] = c[iu] + Math.min(...us); hi[iu] = c[iu] + Math.max(...us);
    lo[iv] = c[iv] + Math.min(...vs); hi[iv] = c[iv] + Math.max(...vs);
    const a0 = c[id], a1 = c[id] + Math.sign(d[id]) * p.h;
    lo[id] = Math.min(a0, a1); hi[id] = Math.max(a0, a1);
    return [lo, hi];
  }
  return null;
}

function addPart(name, color, anchor, features, extra = {}) {
  const [ax, ay, az] = anchor;
  for (const f of features) f.at = [f.at[0] - ax, f.at[1] - ay, f.at[2] - az];
  parts.push({
    id: `p${(++np)}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    name, color, pos: [ax, ay, az], quat: [0, 0, 0, 1],
    fixed: parts.length === 0, visible: true, ...extra, features,
  });
  const p = parts[parts.length - 1];
  const cajas = features.filter(f => f.op !== 'cut' && f.shape !== 'hole').map(f => aabb(f, p.pos)).filter(Boolean);
  if (cajas.length) {
    p.bbox = [0, 1, 2].map(i => r2(Math.min(...cajas.map(c => c[0][i]))))
      .concat([0, 1, 2].map(i => r2(Math.max(...cajas.map(c => c[1][i])))));
  }
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
const cuadrado = (cx, cy, l = PC_SQ) =>
  [[cx - l / 2, cy - l / 2], [cx + l / 2, cy - l / 2], [cx + l / 2, cy + l / 2], [cx - l / 2, cy + l / 2], [cx - l / 2, cy - l / 2]];
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
    .filter(h => h.dz <= almaFlat && !h.sq)   // nunca en la zona de plegado
    .map(h => ({ c: [h.x, r2(H - h.dz)], r: h.dia / 2 }));
  const polys = holesAlma.filter(h => h.dz <= almaFlat && h.sq).map(h => cuadrado(h.x, r2(H - h.dz)));
  // agujeros del ALA: yDev medido desde el BORDE LIBRE del ala (0..alaFlat)
  for (const h of holesAla) {
    if (h.yDev > alaFlat) continue;
    if (h.sq) polys.push(cuadrado(h.x, r2(h.yDev)));
    else circles.push({ c: [h.x, r2(h.yDev)], r: h.dia / 2 });
  }
  const yEje = alaFlat + BA / 2;
  return {
    contorno: rect(L, r2(H)),
    cortes: { circles, polys },
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


// Desarrollo de perfil «sombrero» (lateral): pestaña inferior | BA | alma |
// BA | labio superior — ambas pestañas hacia el MISMO lado (afuera).
// holesAlma: {x, dz (desde el borde superior del alma), dia}; holesAla: {x, yDev
// (desde el borde libre de la pestaña inferior), dia}.
function flatPerfilHat(L, almaAlto, alaBot, lipTop, t, holesAlma, holesAla, material, aviso) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const ala = alaBot - (r + t), lip = lipTop - (r + t), web = almaAlto - 2 * (r + t);
  const y1 = ala, y2 = ala + BA, y3 = y2 + web, y4 = y3 + BA, H = y4 + lip;
  const circles = [], polys = [];
  for (const h of holesAlma) {
    const off = h.dz - (r + t);                 // distancia plana desde la tangente superior
    if (off < 0 || off > web) continue;         // nunca en zona de plegado
    if (h.sq) polys.push(cuadrado(r2(h.x), r2(y3 - off)));
    else circles.push({ c: [r2(h.x), r2(y3 - off)], r: h.dia / 2 });
  }
  for (const h of holesAla) {
    if (h.yDev > ala) continue;
    if (h.sq) polys.push(cuadrado(r2(h.x), r2(h.yDev)));
    else circles.push({ c: [r2(h.x), r2(h.yDev)], r: h.dia / 2 });
  }
  const pl = [];
  for (const [ya, yb] of [[y1, y2], [y3, y4]]) {
    pl.push({ a: [0, r2(ya)], b: [L, r2(ya)], tipo: 'tangente' });
    pl.push({ a: [0, r2((ya + yb) / 2)], b: [L, r2((ya + yb) / 2)], tipo: 'eje' });
    pl.push({ a: [0, r2(yb)], b: [L, r2(yb)], tipo: 'tangente' });
  }
  return {
    contorno: rect(L, r2(H)),
    cortes: { circles, polys },
    pliegues: pl,
    etiquetas: [{ x: L / 2, y: r2((y1 + y2) / 2) + 4, s: `PLEGAR ARRIBA 90° R${r} (pestaña ${alaBot})` },
                { x: L / 2, y: r2((y3 + y4) / 2) + 4, s: `PLEGAR ARRIBA 90° R${r} (labio ${lipTop})` }],
    pliegueInfo: [{ ang: 90, r, ba: r2(BA) }, { ang: 90, r, ba: r2(BA) }],
    t, k: KCH, radio: r, material,
    avisos: aviso ? [aviso] : [],
  };
}

// Desarrollo de travesaño C con OREJAS en los extremos (prolongación del alma
// plegada 90° hacia abajo, apernada al alma del lateral con perno coche 3/8):
// dev = cruz: franja principal (ala|BA|alma|BA|ala) × Lc, y dos orejas que
// prolongan la franja del alma en ambos extremos. Origen desplazado para que
// todo quede en coordenadas positivas.
function flatPerfilCOrejas(Lc, webAncho, alaAlto, t, orejaH, holesOreja, material) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const ala = alaAlto - (r + t), web = webAncho - 2 * (r + t), tab = orejaH - (r + t);
  const ext = BA + tab;
  const y1 = ala, y2 = ala + BA, y3 = y2 + web, y4 = y3 + BA, H = y4 + ala;
  const X = (x) => r2(x + ext);
  const cont = [[0, 0], [Lc, 0], [Lc, y2], [Lc + ext, y2], [Lc + ext, y3], [Lc, y3], [Lc, H], [0, H], [0, y3], [-ext, y3], [-ext, y2], [0, y2], [0, 0]]
    .map(([x, y]) => [X(x), r2(y)]);
  const pl = [];
  for (const [ya, yb] of [[y1, y2], [y3, y4]]) {
    pl.push({ a: [X(0), r2(ya)], b: [X(Lc), r2(ya)], tipo: 'tangente' });
    pl.push({ a: [X(0), r2((ya + yb) / 2)], b: [X(Lc), r2((ya + yb) / 2)], tipo: 'eje' });
    pl.push({ a: [X(0), r2(yb)], b: [X(Lc), r2(yb)], tipo: 'tangente' });
  }
  for (const [xa, xb] of [[-BA, 0], [Lc, Lc + BA]]) {
    pl.push({ a: [X(xa), r2(y2)], b: [X(xa), r2(y3)], tipo: 'tangente' });
    pl.push({ a: [X((xa + xb) / 2), r2(y2)], b: [X((xa + xb) / 2), r2(y3)], tipo: 'eje' });
    pl.push({ a: [X(xb), r2(y2)], b: [X(xb), r2(y3)], tipo: 'tangente' });
  }
  const circles = [], polys = [];
  for (const h of holesOreja) {   // h.desdeBorde: distancia al borde libre de la oreja; h.dy: desde el centro del alma
    for (const xq of [X(-ext + h.desdeBorde), X(Lc + ext - h.desdeBorde)]) {
      if (h.sq) polys.push(cuadrado(xq, r2(y2 + web / 2 + h.dy)));
      else circles.push({ c: [xq, r2(y2 + web / 2 + h.dy)], r: h.dia / 2 });
    }
  }
  return {
    contorno: cont,
    cortes: { circles, polys },
    pliegues: pl,
    etiquetas: [{ x: X(Lc / 2), y: r2((y1 + y2) / 2) + 4, s: `PLEGAR ARRIBA 90° R${r} (×2 alas)` },
                { x: X(-ext / 2), y: r2(y3) + 4, s: `OREJAS: PLEGAR ABAJO 90° (×2)` }],
    pliegueInfo: [1, 2, 3, 4].map(() => ({ ang: 90, r, ba: r2(BA) })),
    t, k: KCH, radio: r, material,
    avisos: ['DESTAJES de esquina alas/orejas ≥ 2t (no dibujados)'],
  };
}

// Rotaciones para las piezas REALES referenciadas (familia ZP2026): matriz 3×3
// → cuaternión [x,y,z,w] (para el ensamble de Inventor).
const matMul = (A, B) => A.map((row, i) => row.map((_, j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
function matToQuat(m) {
  const tr = m[0][0] + m[1][1] + m[2][2];
  let x, y, z, w;
  if (tr > 0) {
    const S = Math.sqrt(tr + 1) * 2; w = S / 4; x = (m[2][1] - m[1][2]) / S; y = (m[0][2] - m[2][0]) / S; z = (m[1][0] - m[0][1]) / S;
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const S = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; w = (m[2][1] - m[1][2]) / S; x = S / 4; y = (m[0][1] + m[1][0]) / S; z = (m[0][2] + m[2][0]) / S;
  } else if (m[1][1] > m[2][2]) {
    const S = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; w = (m[0][2] - m[2][0]) / S; x = (m[0][1] + m[1][0]) / S; y = S / 4; z = (m[1][2] + m[2][1]) / S;
  } else {
    const S = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; w = (m[1][0] - m[0][1]) / S; x = (m[0][2] + m[2][0]) / S; y = (m[1][2] + m[2][1]) / S; z = S / 4;
  }
  return [x, y, z, w].map(v => r2(v * 1e4) / 1e4);
}

// ---------------------------------------------------------------------------
// Componentes REALES reutilizados de las carpetas de referencia (BRP / Merge /
// Gapper / Motores): se referencian por archivo (el importador de Inventor los
// copia a la carpeta del proyecto y los coloca con el cuaternión indicado). Las
// features de cada pieza son sólo la envolvente para el visor foto3d.
// Orientaciones medidas en el BRP_Yolo2025 (2026-09-08):
//   perno coche ANSI B18.5: eje +X, cara de apoyo de la cabeza en x=0, vástago hacia +X
//   golilla F436: eje X, cuerpo x∈[0, 2.03] · golilla presión B18.21.1: eje Z, cuerpo z∈[−2.39, 0]
//   tuerca AS 2465: eje X, cuerpo x∈[0, 8.56] · UCF206 (1485N3): eje Z, cara de montaje en z=−19.85
// ---------------------------------------------------------------------------
const BM_DIR = 'C:\\Users\\scont\\OneDrive\\Documentos\\Inventor\\Bandas Modulares';
const CC_BRP = BM_DIR + '\\Bandas de Recepción Pasiva\\CC\\es-ES';
const CC_GAP = BM_DIR + '\\Gapper\\CC Gapper\\es-ES';
// bb = caja envolvente REAL medida en Inventor (coordenadas propias de la pieza, mm):
// con ella el visor y la compuerta de interferencias usan la envolvente verdadera.
const REALES = {
  ucf206: { archivo: '1485N3_Mounted Ball Bearing with Four-Bolt Flan.ipt', origen: BM_DIR + '\\Motores\\Descansos\\Chumacera UCF206\\1485N3_Mounted Ball Bearing with Four-Bolt Flange', carpeta: 'Componentes Estandar\\Descansos', familia: 'UCF206 (McMaster 1485N3, mismo modelo del BRP y Merge)', esp: 39.7, bb: [-54, -54, -19.85, 54, 54, 19.85] },
  perno: {
    1: { archivo: 'ANSI B18.5 - 3_8-16 UNC - 1(8).ipt', origen: CC_BRP + '\\ANSI B18.5(08)', L: 25.4 },
    1.25: { archivo: 'ANSI B18.5 - 3_8-16 UNC - 1.25(8).ipt', origen: CC_BRP + '\\ANSI B18.5(08)', L: 31.75 },
    2: { archivo: 'ANSI B18.5 - 3_8-16 UNC - 2(8).ipt', origen: CC_BRP + '\\ANSI B18.5(08)', L: 50.8 },
    3: { archivo: 'ANSI B18.5 - 3_8-16 UNC - 3(8).ipt', origen: CC_BRP + '\\ANSI B18.5(08)', L: 76.2 },
    3.25: { archivo: 'ANSI B18.5 - 3_8-16 UNC - 3.25(8).ipt', origen: CC_BRP + '\\ANSI B18.5(08)', L: 82.55 },
    3.5: { archivo: 'ANSI B18.5 - 3_8-16 UNC - 3.5(8).ipt', origen: CC_GAP + '\\ANSI B18.5(08)', L: 88.9 },
  },
  sopGuarLatBB: [-45, -4, -151.6, 35, 36, 133.4],
  portaGuardaBB: [-52.5, -17.5, -55, 52.5, 17.5, 55],
  cajaBB: [-78, -119.5, -124, 78, 78, 249.5],
  brazoBB: [-51.75, -100, -114, -37.75, 65, -14],
  pasadorBB: [-12.7, -12.7, -24.88, 12.7, 12.7, 24.88],
  zpBB: { 'B_005A_1.ipt': [-19, -47.5, -101.5, 19, 47.5, 101.5], 'SOLID_06.ipt': [-38.5, -293.8, -19, 38.5, 293.8, 19], 'B_004A_1.ipt': [-20, -2, -79, 20, 2, 79] },
  // Accionamiento del BRP/Merge (pedido Sergio: «use the same motor reducer»): caja
  // sinfín + motor 1 HP vertical (STEP 314508014), brazo de reacción 50154 (K1 = 100,
  // ojo Ø18/Ø30) y pasador EspBrazoReac Ø25,4 × 50. Orientaciones y posiciones
  // relativas medidas en Cabezal BP_S550_b425.iam (eje hueco Ø30 = nuestro muñón).
  caja: { archivo: 'caja_314508014.ipt', origen: BM_DIR + '\\Motores\\Motor y caja\\Motor 1hp\\caja_314508014\\caja_314508014', carpeta: 'Componentes Estandar\\Motor y caja', familia: 'Motorreductor del BRP (STEP 314508014, motor 1 HP)' },
  brazo50154: { archivo: '50154.ipt', origen: BM_DIR + '\\Motores\\Motor y caja\\Motor 1hp\\50154\\50154', carpeta: 'Componentes Estandar\\Motor y caja', familia: 'Brazo de reacción 50154 (BRP)' },
  pasador: { archivo: 'EspBrazoReac_d25_L50.ipt', origen: BM_DIR + '\\Bandas de Recepción Pasiva\\Estructura\\Torno', carpeta: 'Estructura\\Torno', familia: 'Pasador brazo de reacción (BRP)', L: 49.76 },
  sopGuarLat: { archivo: 'Sop_GuarLat_BRP.ipt', origen: BM_DIR + '\\Bandas de Recepción Pasiva\\Estructura\\Guardas', carpeta: 'Guias\\Guia de cajas', familia: 'Poste de guía de cajas (BRP)' },
  portaGuarda: { archivo: 'PortaGuardaMovex_BM.ipt', origen: BM_DIR + '\\Merge\\Estructura\\Planchas\\Guardas', carpeta: 'Guias\\Guia de cajas', familia: 'Porta guía Movex BM (Merge/BRP)' },
  golilla: { archivo: 'ASTM F436 - 3_8(1).ipt', origen: CC_BRP + '\\ASTM F436(1)', esp: 2.03 },
  golillaPresion: { archivo: 'ANSI B18.21.1 - 0.375.ipt', origen: CC_BRP + '\\ANSI B18.21.1', esp: 2.39 },
  tuerca: { archivo: 'AS 2465 - 3_8  UNC(1).ipt', origen: CC_BRP + '\\AS 2465(1)', esp: 8.56 },
};
const unit = (v) => { const n = Math.hypot(...v); return v.map(a => a / n); };
// Matriz que lleva el eje `a` de la pieza al vector `n` del mundo (Rodrigues).
function rotAxisTo(a, n) {
  a = unit(a); n = unit(n);
  const v = [a[1] * n[2] - a[2] * n[1], a[2] * n[0] - a[0] * n[2], a[0] * n[1] - a[1] * n[0]];
  const c = a[0] * n[0] + a[1] * n[1] + a[2] * n[2];
  const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  if (Math.hypot(...v) < 1e-9) {
    if (c > 0) return I;
    // giro 180° en torno a un eje perpendicular a `a`
    const p = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const k = unit([a[1] * p[2] - a[2] * p[1], a[2] * p[0] - a[0] * p[2], a[0] * p[1] - a[1] * p[0]]);
    return I.map((row, i) => row.map((_, j) => 2 * k[i] * k[j] - I[i][j]));
  }
  const K = [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]];
  const K2 = matMul(K, K);
  const f = 1 / (1 + c);
  return I.map((row, i) => row.map((_, j) => row[j] + K[i][j] + K2[i][j] * f));
}
// Caja envolvente de una pieza real colocada: rota su bbox propio por R y lo lleva a `pos`.
function envolvente(bb, R, pos) {
  const esq = [];
  for (const i of [0, 3]) for (const j of [1, 4]) for (const k of [2, 5]) esq.push([bb[i], bb[j], bb[k]]);
  const m = esq.map(q => [0, 1, 2].map(r => R[r][0] * q[0] + R[r][1] * q[1] + R[r][2] * q[2]));
  const lo = [0, 1, 2].map(i => Math.min(...m.map(q => q[i])) + pos[i]);
  const hi = [0, 1, 2].map(i => Math.max(...m.map(q => q[i])) + pos[i]);
  return { c: [0, 1, 2].map(i => r2((lo[i] + hi[i]) / 2)), d: [0, 1, 2].map(i => r2(hi[i] - lo[i])) };
}
// Pieza REAL: una sola feature = su envolvente exacta (visor e interferencias), más la
// referencia al archivo para que Inventor coloque la pieza verdadera.
function piezaReal(nombre, color, spec, R, pos, bb, extra = {}) {
  const e = envolvente(bb, R, pos);
  return addPart(nombre, color, e.c, [box('Envolvente de la pieza real', e.c, e.d[0], e.d[1], e.d[2])],
    { ref: refReal(spec, R), ...extra });
}
function refReal(spec, R, carpeta = 'CC') {
  return { familia: spec.familia || 'Content Center (BRP/Gapper)', archivo: spec.archivo, origen: spec.origen, carpeta: spec.carpeta || carpeta, quat: matToQuat(R),
           nota: 'componente REAL reutilizado (mismo archivo que las bandas de referencia); no se fabrica' };
}
// Conjunto perno coche 3/8 + golilla plana + golilla de presión + tuerca en un
// apriete: P = cara de apoyo de la cabeza, n = sentido del vástago (unitario,
// alineado a un eje), stack = espesor apretado, largoIn = largo comercial.
function pernoCoche(P, n, stack, largoIn, rol, extra = {}) {
  n = unit(n);
  const pb = REALES.perno[largoIn];
  if (!pb) throw new Error(`perno coche 3/8 × ${largoIn} in no disponible en las carpetas de referencia`);
  if (stack + 12.9 > pb.L) throw new Error(`perno coche 3/8 × ${largoIn} in corto para apriete ${stack} (${rol})`);
  const at = (d) => [P[0] + n[0] * d, P[1] + n[1] * d, P[2] + n[2] * d];
  addPart(`NORM · Perno coche 3/8 in × ${largoIn} in UNC (ANSI B18.5) — ${rol}`, C.chum, at(0), [
    cyl('Cabeza redonda Ø21', at(-5.3), n, 21.4, 5.3),
    cyl('Vástago 3/8', at(0), n, 9.5, pb.L),
  ], { ref: refReal(pb, rotAxisTo([1, 0, 0], n)), hw: true, perno: { p: at(0).map(r2), n, stack, largoIn, rol }, ...extra });
  const s1 = stack;
  addPart('NORM · Golilla plana 3/8 (ASTM F436)', C.chum, at(s1), [cyl('Golilla Ø20.7', at(s1), n, 20.7, REALES.golilla.esp)],
    { ref: refReal(REALES.golilla, rotAxisTo([1, 0, 0], n)), hw: true, ...extra });
  const s2 = s1 + REALES.golilla.esp;
  addPart('NORM · Golilla de presión 3/8 (ANSI B18.21.1)', C.chum, at(s2 + REALES.golillaPresion.esp), [cyl('Golilla presión Ø17.3', at(s2), n, 17.3, REALES.golillaPresion.esp)],
    { ref: refReal(REALES.golillaPresion, rotAxisTo([0, 0, 1], n.map(v => -v))), hw: true, ...extra });
  const s3 = s2 + REALES.golillaPresion.esp;
  addPart('NORM · Tuerca hexagonal 3/8 UNC (AS 2465)', C.chum, at(s3 + REALES.tuerca.esp), [cyl('Tuerca 3/8', at(s3), n, 16.4, REALES.tuerca.esp)],
    { ref: refReal(REALES.tuerca, rotAxisTo([1, 0, 0], n.map(v => -v))), hw: true, ...extra });
}
// Chumacera UCF206 REAL: cara de montaje en y = yBase (lado s), eje Z de la pieza → s·Y
function ucfReal(xc, yBase, zc, s, extra = {}) {
  const R = s > 0 ? [[1, 0, 0], [0, 0, 1], [0, -1, 0]] : [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
  const yc = yBase + s * REALES.ucf206.esp / 2;
  piezaReal('NORM · Chumacera UCF206 Ø30 (modelo real 1485N3, como BRP/Merge)', C.chum, REALES.ucf206, R, [xc, yc, zc], REALES.ucf206.bb, extra);
}
// Metadatos de CHAPA para que Inventor construya la pieza como sheet metal real
// (pestaña de contorno + pliegues + desarrollo), como las piezas del BRP y del Merge.
//  eje  : eje de extrusión ('x' | 'y' | 'z')
//  a, b : extremos de la extrusión sobre ese eje
//  pts  : polilínea de la CARA de referencia en el plano perpendicular, en coordenadas
//         de mundo de los otros dos ejes en orden (x→[y,z], y→[x,z], z→[x,y])
//  lado : hacia qué lado del recorrido crece el material ('derecha' | 'izquierda')
function chapaPerfil(eje, a, b, pts, t, lado, nota) {
  return { eje, a: r2(Math.min(a, b)), b: r2(Math.max(a, b)), perfil: pts.map(q => [r2(q[0]), r2(q[1])]), t, radio: t, lado, nota, k: KCH };
}

// Recorte de un polígono cerrado [[x,z],…] a la franja x0 ≤ x ≤ x1 (Sutherland–Hodgman)
function clipX(pts, x0, x1) {
  const clip = (poly, dentro, cruce) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ia = dentro(a), ib = dentro(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(cruce(a, b));
    }
    return out;
  };
  const cruceEn = (xc) => (a, b) => { const t = (xc - a[0]) / (b[0] - a[0]); return [xc, r2(a[1] + t * (b[1] - a[1]))]; };
  let p = pts.filter((q, i) => i === 0 || q[0] !== pts[i - 1][0] || q[1] !== pts[i - 1][1]);
  if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p = p.slice(0, -1);
  p = clip(p, (q) => q[0] >= x0, cruceEn(x0));
  p = clip(p, (q) => q[0] <= x1, cruceEn(x1));
  return p.length ? [...p, p[0]] : p;
}
// Perfil dentado del sprocket Z-32 (dientes trapezoidales, paso 15) en el plano XZ
function perfilSprocket(xc, zc) {
  const Z = BELT.sprocket.z, Ro = BELT.sprocket.od / 2, Rr = Ro - 9, p = 2 * Math.PI / Z;
  const a = 2.2 / Ro, b = 5.0 / Rr;
  const pts = [];
  for (let i = 0; i < Z; i++) {
    const th = i * p;
    for (const [ang, r] of [[th - a, Ro], [th + a, Ro], [th + b, Rr], [th + p - b, Rr]]) {
      pts.push([r2(xc + r * Math.cos(ang)), r2(zc + r * Math.sin(ang))]);
    }
  }
  pts.push(pts[0]);
  return pts;
}
// Perfil «gota» del brazo de reacción Motovario: círculo Rhub en el eje + ojo R en K1
function perfilBrazo(xc, zc, dir) {
  const { K1, R, Rhub } = D.nmrv.brazo;
  const th0 = dir > 0 ? 0 : Math.PI;
  const alpha = Math.asin((Rhub - R) / K1);
  const pts = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {    // arco grande por la espalda
    const ang = th0 + Math.PI / 2 + alpha + i * (Math.PI - 2 * alpha) / N;
    pts.push([r2(xc + Rhub * Math.cos(ang)), r2(zc + Rhub * Math.sin(ang))]);
  }
  const xe = xc + dir * K1;
  for (let i = 0; i <= N; i++) {    // arco del ojo
    const ang = th0 - Math.PI / 2 - alpha + i * (Math.PI + 2 * alpha) / N;
    pts.push([r2(xe + R * Math.cos(ang)), r2(zc + R * Math.sin(ang))]);
  }
  pts.push(pts[0]);
  return pts;
}

// ZP2026 (Y arriba, Z = ancho) → aquí (Z arriba, Y = ancho): y = −z_zp, z = y_zp
const M_ZP = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
const ZP_ORIGEN = 'C:\\Users\\scont\\Documents\\Inventor\\ZP2026\\Piezas';
function refZP(archivo, Rzp) {
  return {
    familia: 'ZP2026', archivo, origen: ZP_ORIGEN, carpeta: 'Estructura\\Soportes\\ZP2026', quat: matToQuat(matMul(M_ZP, Rzp)),
    nota: 'pieza REAL del ZP2026 (misma escuadra/columna/base, no se fabrica una nueva); Inventor la copia a Estructura\\Soportes\\ZP2026 y la coloca con este cuaternión',
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
  const yM6 = extras ? r2(Math.abs(extras.holeY - (extras.pestFree ?? (extras.skirtY - pestW)))) : r2(pest / 2);
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
  for (const grp of [[extras?.munones, 24], [extras?.mechaMounts, 3.5], [extras?.pernosUCF, 6.5]]) {
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
    cortes: { circles: holes.filter(q => !q.sq).map(q => ({ c: [q.x, q.y], r: q.dia / 2 })),
              polys: holes.filter(q => q.sq).map(q => cuadrado(q.x, q.y)) },
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
    sketchXZ(`Corona dentada Z32 OD ${od} (dientes trapezoidales, paso 15)`, yc + 12, perfilSprocket(xc, zc), 24),
    cyl('Cuerpo moldeado', [xc, yc - ancho / 2, zc], [0, 1, 0], od - 40, ancho),
    box('Bore cuadrado 38.4', [xc, yc, zc], 38.4, ancho + 4, 38.4, 'cut'),
    hole('Grano M8 (prisionero)', [xc, yc + ancho / 2 - 8, zc + od / 2 - 20], [0, 0, 1], 6.8, 0, true),
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
  // Ejes según tipo: el LBP usa la geometría general; el GT (bastidor corto)
  // usa gtMotZ / gtTen (misma fuente que beltPath).
  const zM = esLBP ? D.zMotriz : D.gtMotZ;
  const conTensor = false;                       // un solo eje (motriz); cola con rodillo en colisa
  const xTen = D.tail.x;
  const zTen = D.tail.z;
  // z=0 = plano del producto. LBP: rodillos sobresalen 1.75 sobre la base;
  // GT: goma 2.0 sobre la base. Cara interior (inferior) de la base:
  const bo = esLBP ? BELT.lbp.protru : BELT.gt.goma;   // offset base↔producto
  const zci = -(bo + BELT.esp);                        // LBP -10.45 · GT -10.7
  const path = beltPath(L, tipo, zci);
  const { outer, inner, largo, wraps } = loopFaces(path, BELT.esp);
  const yIn = D.innerW / 2, yOut = D.outerW / 2;
  const xDrv = L - (esLBP ? D.xMotrizDesdePunta : D.gtMotDx);
  const ySprk = esLBP ? D.ySprkLBP : D.ySprkGT;

  // ---- BASTIDOR — línea BRP/Merge (Kofmelk) + familia ZP2026 ----
  // Laterales de CHAPA 3 plegada, alma 300, pestaña inferior 38 hacia AFUERA
  // (asiento de las escuadras B_005A_1 del ZP2026 y de la guarda) y labio
  // superior 20 hacia afuera. Todo lo que se une al lateral va APERNADO con
  // perno coche 3/8 (paso Ø10) como en el BRP/Merge: travesaños (orejas),
  // frentes, acoples de tramo, mechas y suples de descanso. Nada soldado.
  const yWebOut = yIn + D.plT;                 // cara exterior del alma (= yOut)
  const yFlangeOut = D.yFlangeOut;             // borde libre de la pestaña inferior (276)
  const zAlaBot = D.plTop - D.plAlto;          // cara inferior de la pestaña (−308)
  const zAlaTop = zAlaBot + D.plT;
  const PC = D.pernoCoche.dia;
  const pernosWeb = [];   // {x, z, dia, rol} agujeros en el ALMA (simétricos ambos lados)
  const pernosAla = [];   // {x, yAbs, dia, rol} agujeros en la PESTAÑA inferior (|y|, ambos lados)
  // M8 de los ejes muertos de retorno/snub/cola
  const holesAlma = [];
  for (const q of path) {
    if (q.rol !== 'ret' && q.rol !== 'snub' && q.rol !== 'tail') continue;
    holesAlma.push({ x: r2(q.c[0]), dz: r2(D.plTop - q.c[1]), dia: D.retPernoPas, rol: q.rol === 'tail' ? 'cola (COLISA 9x40 horizontal para tensado)' : 'retorno' });
  }

  // ---- Travesaños tipo ZP2026 (sección B_002A_1: C 71×38×3) con OREJAS ----
  // Cuelgan de las almas por dos orejas plegadas (2× perno coche 3/8 cada una),
  // con el alma del C ARRIBA: sobre él apoyan las pletinas de la guía de apoyo
  // (misma solución que los porta-wearstrip del BRP sobre sus travesaños).
  // Cada posición se prueba contra el lazo (ambas caras) y los cuerpos
  // redondos; si choca se corre ±200/±300 o baja a la zona «bajo» (pestaña).
  const pasoT = esLBP ? D.pasoTravLBP : D.pasoTravFT;
  const TC = D.travC;
  const zPletBot = zci - D.barCap.h - D.pletina.h + 6;          // cara inferior de la pletina = cara superior del travesaño
  const zonas = [
    // z0: ventana del cuerpo del C contra la BANDA (las orejas quedan fuera del ancho de banda);
    // z0c: ventana incluyendo las orejas contra los CUERPOS de ancho completo (rodillos, sprockets)
    { tag: 'alto', zTop: r2(zPletBot), z0: zPletBot - TC.h - 6, z0c: zPletBot - TC.h - TC.oreja.h - 4, z1: zPletBot + 4 },
    { tag: 'bajo', zTop: r2(zAlaBot + 22 + TC.h), z0: zAlaBot + 16, z0c: zAlaBot + 16, z1: zAlaBot + 22 + TC.h + 6 },
  ];
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
  const cuerpos = path.filter(q => !q.virtual && q.rol !== 'noseA' && q.rol !== 'noseB')
    .map(q => ({ x: q.c[0], z: q.c[1], r: (q.rol === 'motriz' || q.rol === 'tensor' ? BELT.sprocket.od / 2 : D.gtRetDia / 2) + 6 }));
  const circRect = (c, x0, x1, z0, z1) => {
    const dx = Math.max(x0 - c.x, 0, c.x - x1), dz = Math.max(z0 - c.z, 0, c.z - z1);
    return dx * dx + dz * dz < c.r * c.r;
  };
  const lazoChoca = (xt, z0, z1, z0c = z0) => {
    const x0 = xt - TC.w / 2 - 6, x1 = xt + TC.w / 2 + 6;
    for (const cara of [outer, inner]) {
      for (let i = 0; i < cara.length; i++) {
        if (segRect(cara[i], cara[(i + 1) % cara.length], x0, x1, z0, z1)) return true;
      }
    }
    for (const c of cuerpos) if (circRect(c, x0, x1, z0c, z1)) return true;
    return false;
  };
  const xsTrav = [];
  for (let x = pasoT / 2; x < L; x += pasoT) {
    let hit = null;
    for (const zona of zonas) {
      for (const dx of [0, -100, 100, -200, 200, -300, 300]) {
        const c = x + dx;
        if (c < 150 || c > L - 150) continue;
        if (!lazoChoca(c, zona.z0, zona.z1, zona.z0c)) { hit = { x: r2(c), zona }; break; }
      }
      if (hit) break;
    }
    if (hit === null) { console.warn(`  ! travesaño en x=${x} omitido: el lazo ocupa toda la ventana`); continue; }
    xsTrav.push(hit);
  }
  const orejaZ = (zTop) => r2(zTop - TC.t - TC.oreja.h / 2);   // centro de la oreja (cuelga bajo el alma del C)
  for (const { x, zona } of xsTrav) {
    for (const dx of [-18, 18]) pernosWeb.push({ x: r2(x + dx), z: orejaZ(zona.zTop), dia: PC, rol: 'oreja travesaño' });
  }

  // ---- Frentes porta-nosebar (chapa 3 plegada, pestañas 40 hacia adentro) ----
  const NB = { cuerpoH: 65, cuerpoT: 19, K: 152.4, cols: [15.9, 75.9, 135.9], fila1: 18.75, fila2: 37.8, holeDia: 8.5 };
  const cabTop = zci - 3;   // 1,25 de luz a la barrida de rodillos
  const frentes = [];
  for (const [x0, nm] of [[BELT.noseR + BELT.esp, 'entrada'], [L - BELT.noseR - BELT.esp, 'descarga']]) {
    const dirIn = x0 < L / 2 ? 1 : -1;
    const xc = r2(x0 + dirIn * (2 + NB.cuerpoT + D.plT / 2));
    // el frente no puede bajar sobre el rodillo de cola ni sobre el sprocket motriz:
    // se recorta su alto hasta 20 mm sobre el cuerpo redondo más alto de su huella
    const huella = [Math.min(xc - 6, xc + dirIn * D.frente.ala), Math.max(xc + 6, xc + dirIn * D.frente.ala)];
    let zMin = cabTop - D.frente.h;
    for (const q of path) {
      if (q.virtual || q.rol === 'noseA' || q.rol === 'noseB') continue;
      const R = (q.rol === 'motriz' || q.rol === 'tensor' ? BELT.sprocket.od / 2 : D.gtRetDia / 2) + 20;
      if (q.c[0] + R < huella[0] || q.c[0] - R > huella[1]) continue;
      zMin = Math.max(zMin, q.c[1] + R);
    }
    const hF = r2(Math.min(D.frente.h, cabTop - zMin));
    const zs = [r2(cabTop - 45), r2(cabTop - hF + 45)].filter((z, i, a) => i === 0 || Math.abs(z - a[0]) > 40);
    frentes.push({ x0, nm, dirIn, xc, xPerno: r2(xc + dirIn * (D.plT / 2 + 23)), zs, h: hF });
    for (const z of zs) pernosWeb.push({ x: r2(xc + dirIn * (D.plT / 2 + 23)), z, dia: PC, rol: `frente ${nm}` });
  }

  // ---- Mechas porta-chumacera PL8: solo si la brida UCF no cabe en el alma ----
  // LBP (motriz −400): la chumacera queda bajo el bastidor → mecha PL8 APERNADA
  // (4× perno coche 3/8, traslape 60). GT (motriz −220): la UCF206 va directo
  // sobre el alma con SUPLE DE DESCANSO PL5 108×108 (SupleDescanso del BRP).
  const conMecha = (zM - D.ucf.boltGap / 2 - 12) < zAlaBot + 10;
  const mechaPasoDia = 40;
  const mechaTop = r2(zAlaBot + 60);
  const mechasSpec = conMecha ? [{ rol: 'motriz', x0: xDrv - 45 - 160, x1: xDrv - 45 + 160, ejes: [{ x: xDrv, z: zM }] }] : [];
  for (const m of mechasSpec) {
    const zBot = Math.min(...m.ejes.map(e => e.z)) - 110;
    const rows = [zAlaBot - 60, zAlaBot - 160].filter(z => z > zBot + 30);
    m.mounts = [];
    for (const x of [m.x0 + 55, m.x1 - 55]) for (const z of rows) m.mounts.push({ x: r2(x), z: r2(z) });
    m.pernos = [];
    for (const x of [m.x0 + 40, m.x1 - 40]) for (const z of [zAlaBot + 18, zAlaBot + 45]) m.pernos.push({ x: r2(x), z: r2(z) });
    for (const p of m.pernos) pernosWeb.push({ ...p, dia: PC, rol: 'mecha' });
  }
  const offUCF = conMecha ? 8 + 1 + 1.5 : D.suple.t;   // base de la UCF: faldón de guarda sobre la mecha · o suple sobre el alma
  if (!conMecha) {
    pernosWeb.push({ x: r2(xDrv), z: r2(zM), dia: mechaPasoDia, rol: 'paso muñón motriz' });
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) pernosWeb.push({ x: r2(xDrv + dx * D.ucf.boltGap / 2), z: r2(zM + dz * D.ucf.boltGap / 2), dia: D.ucf.boltDia, rol: 'UCF206' });
  }

  // ---- Acoples de tramo (LBP: laterales en 2 tramos de 2500, Acople_BRP) ----
  const tramos = L > 3000 ? [[0, L / 2, 'A'], [L / 2, L, 'B']] : [[0, L, '']];
  const acoples = tramos.length > 1 ? [{ x: L / 2, z: r2(zAlaBot + 58) }] : [];
  for (const a of acoples) for (const dx of [-40, 40]) for (const dz of [-20, 20]) pernosWeb.push({ x: r2(a.x + dx), z: r2(a.z + dz), dia: PC, rol: 'acople' });

  // ---- Patas ZP2026: escuadras B_005A_1 apernadas bajo la pestaña (2× 3/8) ----
  // Posición de las patas: la escuadra ZP2026 mide 203 a lo largo del equipo y el
  // accionamiento del BRP ocupa una ventana alrededor del eje motriz; se corren las
  // patas fuera de esa ventana (lo encontró la compuerta de interferencias).
  const vetoDrive = [xDrv - 190, xDrv + 190];
  const librePata = (q) => q - 101.5 > vetoDrive[1] || q + 101.5 < vetoDrive[0];
  const acomodaPata = (q) => {
    if (librePata(q)) return r2(q);
    for (const d of [-120, -180, -240, -300, 120, 180, 240, 300]) {
      const c = q + d;
      if (c > 160 && c < L - 160 && librePata(c)) return r2(c);
    }
    return r2(q);
  };
  const patasX = (esLBP ? [700, L / 2, L - 700] : [L / 2]).map(acomodaPata);
  // subensamble «Pata ZP2026» (uno por posición; mismo archivo, origen en la pata)
  const subPata = (xq) => ({ archivo: 'Estructura\\Soportes\\Pata_ZP2026_LBP530', origen: [patasX.reduce((b, x) => Math.abs(x - xq) < Math.abs(b - xq) ? x : b), 0, 0] });
  const SUB_EJE = { archivo: `Estructura\\Torno\\ConjuntoEjeMotriz_LBP530_${esLBP ? 'LBP' : 'GT'}`, origen: [0, 0, 0] };
  for (const x of patasX) for (const dx of [-60, 60]) pernosAla.push({ x: r2(x + dx), yAbs: r2(yFlangeOut - D.zp.escuadra.w / 2), dia: PC, rol: 'escuadra B_005A_1' });

  // ---- Postes de la guía de cajas (Sop_GuarLat_BRP + PortaGuardaMovex_BM, piezas
  // REALES del BRP/Merge): por FUERA del alma, cada ≤1000, 2 pernos coche 3/8 al alma
  // (cabeza por dentro). Sobre el porta va el conical rail L 1¼ in (P12501C).
  const nPost = Math.max(2, Math.round(L / 1000) + 1);
  const xsPost = [];
  for (let i = 0; i < nPost; i++) {
    let x = r2(150 + i * (L - 300) / (nPost - 1));
    for (let k = 0; k < 4 && pernosWeb.some(p => Math.abs(p.x - x) < 70); k++) x = r2(x + 70);
    xsPost.push(x);
  }
  const POST = { zPernos: [-40, -120], zBase: 3.3, dyPorta: 7.6, dxPorta: 21.5, dzPorta: 88.4, railZ: 76, railH: 31.75 };
  for (const x of xsPost) for (const z of POST.zPernos) pernosWeb.push({ x, z, dia: PC, rol: 'poste guía de cajas' });
  // pasador del brazo de reacción 50154 (K1 = 100, hacia la cola), sólo lado motriz +Y:
  // en el alma (GT) o en la mecha + faldón (LBP)
  const dirBrazo = -1;
  const xPin = r2(xDrv + dirBrazo * 100);
  if (!conMecha) pernosWeb.push({ x: xPin, z: r2(zM), dia: 10.5, rol: 'pasador brazo de reacción', lados: [1] });

  // ---- GUARDA del cabezal motriz (solo si el lazo/sprocket sale bajo el bastidor) ----
  // Con el lateral de 300 el retorno, la catenaria y el GT completo viajan
  // DENTRO del bastidor; solo el accionamiento del LBP (motriz −400) cuelga
  // 200 bajo la pestaña → artesa en U chapa 1.5 cerrada en ambos extremos,
  // apernada M6 bajo la pestaña, faldón sandwich entre mecha y UCF.
  const zLazoMin = r2(Math.min(...outer.map(q => q[1]), zM - BELT.sprocket.od / 2 - BELT.esp));
  const conGuarda = zLazoMin < zAlaBot - 10;
  const G = {
    t: 1.5, skirtY: r2(yWebOut + (conMecha ? 8 : 0) + 1), pasoM6: 400, holeDia: 7,
    fondoZ: r2(zLazoMin - 44),
  };
  G.fondoW = r2(2 * (G.skirtY + G.t));
  G.pestW = r2(yFlangeOut - 2 - G.skirtY);
  G.holeY = r2(yFlangeOut - 12);
  const zPest = zAlaBot;
  const crucesPest = [];
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], b = outer[(i + 1) % outer.length];
    if ((a[1] - zPest) * (b[1] - zPest) < 0) {
      const t01 = (zPest - a[1]) / (b[1] - a[1]);
      crucesPest.push(r2(a[0] + t01 * (b[0] - a[0])));
    }
  }
  const ventanas = crucesPest.sort((u, v) => u - v).map(x => [x - 80, x + 100]);
  const muescasAuto = [];
  for (const w of ventanas) {
    const last = muescasAuto[muescasAuto.length - 1];
    if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
    else muescasAuto.push([...w]);
  }
  const clip = (xa, xb) => muescasAuto
    .filter(([a, b]) => b > xa && a < xb)
    .map(([a, b]) => [Math.max(xa, a), Math.min(xb, b)]);
  // la guarda arranca despejada de la escuadra de pata más cercana (su tapa de extremo
  // no puede caer sobre la pata: lo encontró la compuerta de interferencias)
  const xaGuarda = r2(Math.max(0, xDrv - 300, ...patasX.filter(q => q + 101.5 > xDrv - 300 && q < xDrv).map(q => q + 101.5 + 12)));
  const guardas = conGuarda
    ? [{ tag: 'motriz', xa: xaGuarda, xb: L, fondoZ: G.fondoZ, tapas: { a: true, b: true } }]
    : [];
  const holesAla = [];
  for (const g of guardas) {
    g.muescas = clip(g.xa, g.xb);
    // ventana bajo cada pata: la escuadra ZP2026 se aperna directo a la pestaña del
    // lateral, así que la pestaña de la guarda se recorta ahí (lo pidió la compuerta
    // de interferencias: si no, la guarda queda entre la escuadra y la pestaña)
    for (const xp of patasX) {
      if (xp + 115 > g.xa && xp - 115 < g.xb) g.muescas.push([Math.max(g.xa, xp - 115), Math.min(g.xb, xp + 115)]);
    }
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
    g.munones = [[xDrv, zM]].filter(([x]) => x > g.xa && x < g.xb).map(([x, z]) => ({ x: r2(x), z }));
    g.mechaMounts = mechasSpec.flatMap(m => (m.mounts || [])).filter(q => q.x > g.xa && q.x < g.xb);
    let tramosG = [[g.xa, g.xb]];
    for (const [m0, m1] of g.muescas) {
      tramosG = tramosG.flatMap(([a, b]) => {
        const out = [];
        if (m0 > a) out.push([a, Math.min(m0, b)]);
        if (m1 < b) out.push([Math.max(m1, a), b]);
        return out;
      });
    }
    g.tramos = tramosG.filter(([a, b]) => b - a >= 80);
    if (process.env.DBG) console.log(`  DBG guarda ${g.tag}: muescas=${JSON.stringify(g.muescas.map(m=>m.map(r2)))} tramos=${JSON.stringify(g.tramos.map(m=>m.map(r2)))}`);
    g.holesX = [];
    for (const [a, b] of g.tramos) {
      const len = b - a;
      const n = Math.max(2, Math.ceil(len / G.pasoM6) + 1);
      for (let i = 0; i < n; i++) {
        const x = r2(a + 40 + (len - 80) * (n === 1 ? 0.5 : i / (n - 1)));
        g.holesX.push(x);
        holesAla.push({ x, yDev: r2(yFlangeOut - G.holeY), dia: G.holeDia });
        pernosAla.push({ x, yAbs: G.holeY, dia: G.holeDia, rol: 'guarda M6' });
      }
    }
  }

  // ---- LATERALES (piezas) ----
  for (const s of [-1, 1]) {
    const y = s * (yIn + D.plT / 2);
    const nm = s > 0 ? 'motriz (+Y)' : 'libre (−Y)';
    for (const [xa, xb, tag] of tramos) {
      const Ls = r2(xb - xa), xm = (xa + xb) / 2;
      const f = [
        box(`Alma ${Ls}×${D.plAlto}`, [xm, y, D.plTop - D.plAlto / 2], Ls, D.plT, D.plAlto),
        box(`Pestaña inferior ${D.alaAncho} hacia afuera`, [xm, s * (yIn + (D.plT + D.alaAncho) / 2), zAlaBot + D.plT / 2], Ls, D.plT + D.alaAncho, D.plT),
        box(`Labio superior ${D.lipTop} hacia afuera`, [xm, s * (yIn + (D.plT + D.lipTop) / 2), D.plTop - D.plT / 2], Ls, D.plT + D.lipTop, D.plT),
      ];
      const hAlmaSeg = holesAlma.filter(h => h.x >= xa && h.x <= xb);
      for (const h of hAlmaSeg) f.push(hole(`Paso perno M${D.retPernoM} eje muerto ${h.rol}`, [h.x, y, D.plTop - h.dz], [0, s, 0], h.dia, 0, true));
      const pWebSeg = pernosWeb.filter(h => h.x >= xa && h.x <= xb);
      for (const h of pWebSeg) {
        if (h.lados && !h.lados.includes(s)) continue;
        if (h.dia === PC) f.push(sqhole(`Cuadrado ${PC_SQ} perno coche — ${h.rol}`, [h.x, y, h.z], 'y', D.plT));
        else f.push(hole(`Paso Ø${h.dia} ${h.rol}`, [h.x, y, h.z], [0, s, 0], h.dia, 0, true));
      }
      const pAlaSeg = pernosAla.filter(h => h.x >= xa && h.x <= xb);
      for (const h of pAlaSeg) {
        if (h.dia === PC) f.push(sqhole(`Cuadrado ${PC_SQ} perno coche — ${h.rol}`, [h.x, s * h.yAbs, zAlaBot + D.plT / 2], 'z', D.plT));
        else f.push(hole(`Paso Ø${h.dia} pestaña (${h.rol})`, [h.x, s * h.yAbs, zAlaBot + D.plT / 2], [0, 0, 1], h.dia, 0, true));
      }
      addPart(`FAB · Placa lateral ${nm} chapa 3 plegada L=${Ls}${tag ? ' tramo ' + tag : ''}`, C.placa, [xm, y, D.plTop], f, {
        chapa: chapaPerfil('x', xa, xb, [
          [s * yFlangeOut, zAlaBot], [s * yIn, zAlaBot], [s * yIn, D.plTop], [s * (yIn + D.plT + D.lipTop), D.plTop],
        ], D.plT, s > 0 ? 'derecha' : 'izquierda', `Lateral ${nm} — sombrero: pestaña ${D.alaAncho} + labio ${D.lipTop} hacia afuera`),
        flat: flatPerfilHat(Ls, D.plAlto, D.alaAncho, D.lipTop, D.plT,
          [...hAlmaSeg.map(h => ({ x: r2(h.x - xa), dz: h.dz, dia: h.dia })),
           ...pWebSeg.filter(h => !h.lados || h.lados.includes(s)).map(h => ({ x: r2(h.x - xa), dz: r2(D.plTop - h.z), dia: h.dia, sq: h.dia === PC }))],
          pAlaSeg.map(h => ({ x: r2(h.x - xa), yDev: r2(yFlangeOut - h.yAbs), dia: h.dia, sq: h.dia === PC })),
          'Acero S275JR chapa 3 — plegado en sombrero (pestaña 38 + labio 20 hacia afuera), PINTADO RAL 7035 (línea BRP/Kofmelk)',
          `TODO APERNADO con ${D.pernoCoche.espec}: travesaños (orejas), frentes${acoples.length ? ', acoples de tramo' : ''}${conMecha ? ', mecha PL8' : ', suple de descanso'} — nada soldado (ver GA)`),
      });
    }
  }

  // ---- Acoples de tramo (PL3, sobre la cara exterior del alma) ----
  for (const a of acoples) for (const s of [-1, 1]) {
    const y = s * (yWebOut + D.plT / 2);
    const f = [box(`Acople PL3 ${D.acople.w}×${D.acople.h}`, [a.x, y, a.z], D.acople.w, D.plT, D.acople.h)];
    const holes = [];
    for (const dx of [-40, 40]) for (const dz of [-20, 20]) {
      f.push(hole('Paso perno coche 3/8', [a.x + dx, y, a.z + dz], [0, s, 0], PC, 0, true));
      holes.push({ x: r2(D.acople.w / 2 + dx), y: r2(D.acople.h / 2 + dz), dia: PC });
    }
    addPart(`FAB · Acople de laterales PL3 ${D.acople.w}×${D.acople.h} (unión tramos A-B, 4× perno coche 3/8)`, C.placa, [a.x, y, a.z], f, {
      chapa: { plana: true, t: D.plT, eje: 'y', at: y, contorno: [[a.x - D.acople.w / 2, a.z - D.acople.h / 2], [a.x + D.acople.w / 2, a.z - D.acople.h / 2], [a.x + D.acople.w / 2, a.z + D.acople.h / 2], [a.x - D.acople.w / 2, a.z + D.acople.h / 2]], lado: s > 0 ? 'derecha' : 'izquierda', nota: 'Acople de laterales (placa plana)' },
      flat: flatPlaca(D.acople.w, D.acople.h, D.plT, holes, 'Acero S275JR chapa 3 — PINTADO RAL 7035', 'ACOPLE DE TRAMOS DE LATERAL (Acople_BRP): por la cara EXTERIOR del alma'),
    });
  }

  // ---- piezas de guarda ----
  // Faldones POR FUERA de la mecha (sandwich mecha–faldón–UCF); pestañas hacia
  // AFUERA apoyadas bajo la pestaña del lateral, con M6 a 12 del borde libre.
  for (const g of guardas) {
    const Lg = r2(g.xb - g.xa);
    const latAlto = r2(zAlaBot - g.fondoZ);
    const xm = (g.xa + g.xb) / 2;
    const f = [
      box('Fondo artesa', [xm, 0, g.fondoZ + G.t / 2], Lg, G.fondoW, G.t),
    ];
    for (const s of [-1, 1]) {
      f.push(box('Lateral artesa', [xm, s * (G.skirtY + G.t / 2), (zAlaBot + g.fondoZ) / 2], Lg, G.t, latAlto));
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
        f.push(box('Pestaña de montaje (hacia afuera)', [(a + b) / 2, s * (G.skirtY + G.pestW / 2), zAlaBot - G.t / 2], r2(b - a), G.pestW, G.t));
      }
      for (const x of g.holesX) {
        f.push(hole('Paso M6', [x, s * G.holeY, zAlaBot - G.t / 2], [0, 0, 1], G.holeDia, 0, true));
      }
      for (const m of g.munones) {
        f.push(hole('Paso muñón Ø48', [m.x, s * (G.skirtY + G.t / 2), m.z], [0, s, 0], 48, 0, true));
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
          f.push(hole('Paso perno UCF Ø13', [m.x + dx * D.ucf.boltGap / 2, s * (G.skirtY + G.t / 2), m.z + dz * D.ucf.boltGap / 2], [0, s, 0], 13, 0, true));
        }
        if (s > 0) f.push(hole('Paso pasador brazo de reacción', [xPin, s * (G.skirtY + G.t / 2), m.z], [0, s, 0], 10.5, 0, true));
      }
      for (const q of g.mechaMounts) {
        f.push(hole('Paso M6 a mecha', [q.x, s * (G.skirtY + G.t / 2), q.z], [0, s, 0], G.holeDia, 0, true));
      }
    }
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
        chapa: chapaPerfil('x', g.xa, g.xb, [
          [G.skirtY + G.pestW, zAlaBot], [G.skirtY, zAlaBot], [G.skirtY, g.fondoZ], [-G.skirtY, g.fondoZ], [-G.skirtY, zAlaBot], [-(G.skirtY + G.pestW), zAlaBot],
        ], G.t, 'derecha', `Guarda ${g.tag} — artesa en U con pestañas hacia afuera`),
        flat: flatGuardaU(Lg, G.fondoW, latAlto, G.pestW, G.t, g.holesX.map(x => r2(x - g.xa)),
          'Acero S275JR e1.5 — terminación PINTADO RAL 7035', g.tapas,
          g.muescas.map(([a, b]) => [Math.max(0, a - g.xa), Math.min(Lg, b - g.xa)]),
          { holeY: G.holeY, skirtY: G.skirtY, pestFree: r2(G.skirtY + G.pestW), zAlaBot, drenaje: true,
            munones: g.munones.map(m => ({ x: r2(m.x - g.xa), z: m.z })),
            pernosUCF: g.munones.flatMap(m => [-1, 1].flatMap(dx => [-1, 1].map(dz => ({ x: r2(m.x + dx * D.ucf.boltGap / 2 - g.xa), z: r2(m.z + dz * D.ucf.boltGap / 2) })))),
            mechaMounts: g.mechaMounts.map(m => ({ x: r2(m.x - g.xa), z: m.z })) }),
      });
  }

  // ---- Mechas porta-chumacera PL8 (APERNADAS al alma, solo LBP) ----
  for (const s of [-1, 1]) {
    const y = s * (yWebOut + 4);   // PL8 sobre la cara exterior del alma
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
      for (const q of (m.pernos || [])) {
        holes.push({ x: r2(q.x - m.x0), y: r2(q.z - zBot), dia: PC });
        f.push(hole('Paso perno coche 3/8 (al alma)', [q.x, y, q.z], [0, s, 0], PC, 0, true));
      }
      if (s > 0 && xPin > m.x0 + 20 && xPin < m.x1 - 20) {   // pasador del brazo de reacción (lado motriz)
        holes.push({ x: r2(xPin - m.x0), y: r2(zM - zBot), dia: 10.5 });
        f.push(hole('Paso pasador brazo de reacción 3/8', [xPin, y, zM], [0, s, 0], 10.5, 0, true));
      }
      for (const q of (m.mounts || [])) {
        holes.push({ x: r2(q.x - m.x0), y: r2(q.z - zBot), dia: 5 });
        f.push(hole('M6 roscado (montaje guarda)', [q.x, y, q.z], [0, s, 0], 5, 0, true));
      }
      for (const h of holesAlma) {
        const z = D.plTop - h.dz;
        if (h.x > m.x0 && h.x < m.x1 && z > zBot && z < mechaTop) {
          holes.push({ x: r2(h.x - m.x0), y: r2(z - zBot), dia: h.dia });
          f.push(hole(`Paso M${D.retPernoM} retorno (a través de mecha)`, [h.x, y, z], [0, s, 0], h.dia, 0, true));
        }
      }
      addPart(`FAB · Mecha porta-chumacera PL8 ${m.rol} ${w}×${hM}`, C.placa, [(m.x0 + m.x1) / 2, y, zBot + hM / 2], f, {
        chapa: { plana: true, t: 8, eje: 'y', at: y, contorno: [[m.x0, zBot], [m.x1, zBot], [m.x1, mechaTop], [m.x0, mechaTop]], lado: s > 0 ? 'derecha' : 'izquierda', nota: 'Mecha PL8 (placa plana)' },
        flat: flatPlaca(w, hM, 8, holes, 'Acero S275JR PL8 — PINTADO RAL 7035',
          'APERNADA A LA CARA EXTERIOR DEL ALMA con 4× perno coche 3/8 (traslape 60 bajo la pestaña) — no soldar; ver GA'),
      });
    }
  }

  // ---- Suple de descanso PL5 (UCF206 directo sobre el alma: GT) ----
  if (!conMecha) {
    for (const s of [-1, 1]) {
      const y = s * (yWebOut + D.suple.t / 2);
      const f = [box(`Suple PL5 ${D.suple.w}×${D.suple.w}`, [xDrv, y, zM], D.suple.w, D.suple.t, D.suple.w)];
      const holes = [{ x: D.suple.w / 2, y: D.suple.w / 2, dia: mechaPasoDia }];
      f.push(hole(`Paso muñón Ø${mechaPasoDia}`, [xDrv, y, zM], [0, s, 0], mechaPasoDia, 0, true));
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        holes.push({ x: r2(D.suple.w / 2 + dx * D.ucf.boltGap / 2), y: r2(D.suple.w / 2 + dz * D.ucf.boltGap / 2), dia: D.ucf.boltDia });
        f.push(hole('Perno chumacera Ø12', [xDrv + dx * D.ucf.boltGap / 2, y, zM + dz * D.ucf.boltGap / 2], [0, s, 0], D.ucf.boltDia, 0, true));
      }
      addPart(`FAB · Suple de descanso PL5 ${D.suple.w}×${D.suple.w} (UCF206 sobre el alma, línea BRP)`, C.placa, [xDrv, y, zM], f, {
        chapa: { plana: true, t: D.suple.t, eje: 'y', at: y, contorno: [[xDrv - D.suple.w / 2, zM - D.suple.w / 2], [xDrv + D.suple.w / 2, zM - D.suple.w / 2], [xDrv + D.suple.w / 2, zM + D.suple.w / 2], [xDrv - D.suple.w / 2, zM + D.suple.w / 2]], lado: s > 0 ? 'derecha' : 'izquierda', nota: 'Suple de descanso (placa plana)' },
        flat: flatPlaca(D.suple.w, D.suple.w, D.suple.t, holes, 'Acero S275JR PL5 — PINTADO RAL 7035', 'SUPLE ENTRE ALMA Y CHUMACERA UCF206 (SupleDescanso_UCF206 del BRP) — los 4 pernos Ø12 de la UCF atraviesan suple + alma'),
      });
    }
  }

  // ---- Travesaños (piezas) ----
  const Lc = r2(D.innerW - 2 * TC.t);          // alma del C entre las orejas (las orejas van pegadas a las almas)
  for (const { x, zona } of xsTrav) {
    const zTop = zona.zTop;
    const nom = zona.tag === 'bajo'
      ? `FAB · Travesaño BAJO tipo ZP2026 (B_002A) — C 71×38×3 con orejas (en la pestaña inferior)`
      : `FAB · Travesaño tipo ZP2026 (B_002A) — C 71×38×3 con orejas (bajo guías de apoyo)`;
    const f = [
      box('Alma C 71 (arriba)', [x, 0, zTop - TC.t / 2], TC.w, Lc, TC.t),
      box('Ala +X', [x + TC.w / 2 - TC.t / 2, 0, zTop - TC.h / 2], TC.t, Lc - 12, TC.h),
      box('Ala −X', [x - TC.w / 2 + TC.t / 2, 0, zTop - TC.h / 2], TC.t, Lc - 12, TC.h),
    ];
    const zO = orejaZ(zTop);
    for (const s of [-1, 1]) {
      f.push(box('Oreja plegada 59×50', [x, s * (yIn - TC.t / 2), zO], TC.oreja.w, TC.t, TC.oreja.h));
      for (const dx of [-18, 18]) f.push(hole('Paso perno coche 3/8', [x + dx, s * (yIn - TC.t / 2), zO], [0, s, 0], PC, 0, true));
    }
    addPart(nom, C.trav, [x, 0, zTop - TC.h / 2], f, {
      chapa: {
        ...chapaPerfil('y', -Lc / 2, Lc / 2, [
          [x - TC.w / 2, zTop - TC.h], [x - TC.w / 2, zTop], [x + TC.w / 2, zTop], [x + TC.w / 2, zTop - TC.h],
        ], TC.t, 'derecha', 'Travesaño — C 71×38 (alma arriba)'),
        // orejas: pestaña de 50 plegada 90° hacia abajo en cada extremo del ALMA
        pestanas: [-1, 1].map(sy => ({ borde: { eje: 'y', valor: sy * Lc / 2, cara: 'alma' }, alto: TC.oreja.h, ancho: TC.oreja.w, dir: 'abajo' })),
      },
      flat: flatPerfilCOrejas(Lc, TC.w, TC.h, TC.t, TC.oreja.h, [{ desdeBorde: r2(TC.oreja.h - 25), dy: -18, dia: PC, sq: false }, { desdeBorde: r2(TC.oreja.h - 25), dy: 18, dia: PC, sq: false }],
        'Acero S275JR e3 — plegado en C 71×38 (misma matriz que el B_002A_1 del ZP2026) + orejas, PINTADO RAL 7035. APERNADO a las almas con perno coche 3/8'),
    });
  }

  // ---- Guía de cajas (piezas REALES del BRP): poste + porta Movex + rail P12501C ----
  // Sop_GuarLat_BRP: cara de montaje en x_pieza = −45 contra la cara exterior del alma,
  // 285 de alto; su origen queda 3,3 sobre el plano de banda (BRP: 43 con banda a 39,7).
  // Colocación medida en el BRP: el poste apoya por FUERA del alma (su cara de montaje
  // en y = ±yWebOut) y el porta va pegado a su costado, con la base del rail 76 sobre
  // el plano de banda. Envolventes exactas (bbox real rotado).
  const R_POST = { [-1]: [[0, 1, 0], [-1, 0, 0], [0, 0, 1]], [1]: [[0, -1, 0], [1, 0, 0], [0, 0, 1]] };
  for (const x of xsPost) for (const s of [-1, 1]) {
    // Sop_GuarLat: en su sistema, y ∈ [−4, 36] es el espesor de montaje y x ∈ [−45, 35];
    // rotado, la cara de montaje queda a s·yWebOut y el poste crece hacia afuera.
    // el poste ocupa 80 mm hacia AFUERA desde la cara exterior del alma (BRP: −305…−225
    // con el alma en −225): su origen va a y = ±(yWebOut + 45)
    piezaReal('NORM · Poste guía de cajas Sop_GuarLat_BRP (pieza real BRP, 2× perno coche 3/8 al alma)', C.placa,
      REALES.sopGuarLat, R_POST[s], [x, s * (yWebOut + 45), POST.zBase], REALES.sopGuarLatBB);
    piezaReal('NORM · Porta guía Movex BM (PortaGuardaMovex_BM, pieza real Merge/BRP)', C.placa,
      REALES.portaGuarda, R_POST[s], [x - POST.dxPorta, s * (yWebOut + 45 - POST.dyPorta), POST.zBase + POST.dzPorta], REALES.portaGuardaBB);
  }

  // ---- Guía lateral de DESGASTE de la banda (como Guias_desgaste_BRP): UHMW 12×15
  // sobre el borde superior del lateral, cara interior 1,9 fuera del canto de la
  // banda: contacto lateral de la banda modular. Por tramos como el lateral.
  for (const s of [-1, 1]) for (const [xa, xb, tag] of tramos) {
    const x0 = Math.max(xa, BELT.noseR + BELT.esp + 30), x1 = Math.min(xb, L - BELT.noseR - BELT.esp - 30);
    const Lg = r2(x1 - x0);
    addPart(`FAB · Guía lateral de desgaste UHMW 12×15 (Guias_desgaste_BRP) L=${Lg}${tag ? ' tramo ' + tag : ''}`, C.uhmw, [(x0 + x1) / 2, s * (yIn + 1.5), D.plTop + 7.5], [
      box('Perfil UHMW 12×15', [(x0 + x1) / 2, s * (yIn + 1.5), D.plTop + 7.5], Lg, 12, 15),
    ]);
  }

  // ---- PERNERÍA REAL (Content Center del BRP/Gapper): perno coche 3/8 + golilla
  // plana + golilla de presión + tuerca en cada unión, cabeza por FUERA del
  // alma (como el «Armado de Merge»); en la chumacera la cabeza va por dentro.
  const HW = {
    'oreja travesaño': { yHead: (s) => s * yWebOut, dirIn: true, stack: 6, L: 1 },
    'poste guía de cajas': { yHead: (s) => s * yIn, dirIn: false, stack: 7, L: 1 },
    'acople': { yHead: (s) => s * (yWebOut + D.plT), dirIn: true, stack: 6, L: 1 },
    'mecha': { yHead: (s) => s * (yWebOut + 8), dirIn: true, stack: 11, L: 1.25 },
  };
  for (const h of pernosWeb) {
    const rolKey = h.rol.startsWith('frente') ? 'oreja travesaño' : h.rol;
    const cfg = HW[rolKey];
    if (!cfg) continue;
    for (const s of [-1, 1]) {
      if (h.lados && !h.lados.includes(s)) continue;
      pernoCoche([h.x, cfg.yHead(s), h.z], [0, cfg.dirIn ? -s : s, 0], cfg.stack, cfg.L, h.rol);
    }
  }
  for (const h of pernosAla) {
    if (h.rol !== 'escuadra B_005A_1') continue;
    for (const s of [-1, 1]) pernoCoche([h.x, s * h.yAbs, zAlaTop], [0, 0, -1], 6, 1, 'escuadra B_005A_1 bajo la pestaña', { sub: subPata(h.x) });
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
  const nbHoles = [];   // {y, dz} — y mundo; dz bajo el tope del nosebar
  for (let seg = 0; seg < 3; seg++) {
    const y0 = -BELT.ancho / 2 + seg * NB.K;
    for (const c of NB.cols) for (const dz of [NB.fila1, NB.fila2]) {
      nbHoles.push({ y: r2(y0 + c), dz });
    }
  }
  const art = esLBP ? BELT.noseArtLBP : BELT.noseArtGT;
  for (const fr of frentes) {
    const { x0, nm, dirIn, xc } = fr;
    const zN = zci - BELT.noseR;
    const fN = [
      cyl(`Punta rodamientos Ø${BELT.noseR * 2}`, [x0, -BELT.ancho / 2, zN], [0, 1, 0], BELT.noseR * 2, BELT.ancho),
      box(`Cuerpo BluLub 65×19 (3 segmentos K=${NB.K})`, [x0 + dirIn * (2 + NB.cuerpoT / 2), 0, zci - NB.cuerpoH / 2], NB.cuerpoT, BELT.ancho, NB.cuerpoH),
    ];
    for (const h of nbHoles) {
      fN.push(hole(`Ø${NB.holeDia} montaje`, [x0 + dirIn * (2 + NB.cuerpoT / 2), h.y, zci - h.dz], [dirIn, 0, 0], NB.holeDia, 0, true));
    }
    addPart(`NORM · Nosebar ${nm} 18 in (3× K6 in, montaje IDLER=acumulación) — ${art}`, C.nose, [x0, 0, zN], fN);

    // Frente porta-nosebar (FAB, línea BRP): chapa 3 plegada, pestañas 40
    // hacia ADENTRO apernadas a las almas (2× perno coche 3/8 por lado);
    // recibe los 18 M8 del nosebar con tuercas por la cara interior.
    const hF = fr.h;
    const zcF = cabTop - hF / 2;
    // el alma es la CARA del plegado: ocupa de xc hacia adentro un espesor (así el
    // sólido coincide con la chapa que construye Inventor con el mismo perfil)
    const fC = [box(`Alma frente ${D.innerW}×${hF}`, [xc + dirIn * D.plT / 2, 0, zcF], D.plT, D.innerW, hF)];
    const BAf = bendAllowance(90, D.plT, D.plT, KCH);
    const alaF = D.frente.ala - 2 * D.plT, webF0 = alaF + BAf;
    const holesFr = [];
    for (const h of nbHoles) {
      fC.push(hole('Paso M8 nosebar', [xc, h.y, zci - h.dz], [dirIn, 0, 0], 9, 0, true));
      holesFr.push({ x: r2(cabTop - (zci - h.dz)), y: r2(webF0 + h.y + D.innerW / 2 - 2 * D.plT), dia: 9 });
    }
    for (const s of [-1, 1]) {
      fC.push(box(`Pestaña ${D.frente.ala} hacia adentro`, [xc + dirIn * (D.frente.ala / 2 + D.plT / 2), s * (yIn - D.plT / 2), zcF], D.frente.ala - D.plT, D.plT, hF));
      for (const z of fr.zs) {
        fC.push(hole('Paso perno coche 3/8 (al alma)', [fr.xPerno, s * (yIn - D.plT / 2), z], [0, s, 0], PC, 0, true));
        const yDev = D.frente.ala - (D.plT / 2 + 23);   // desde el borde libre de la pestaña
        holesFr.push({ x: r2(cabTop - z), y: s < 0 ? r2(yDev) : r2(2 * alaF + 2 * BAf + (D.innerW - 2 * D.plT) - yDev), dia: PC });
      }
    }
    addPart(`FAB · Frente porta-nosebar ${nm} chapa 3 plegada ${D.innerW}×${hF}`, C.placa, [xc, 0, zcF], fC, {
      chapa: chapaPerfil('z', cabTop - hF, cabTop, [
        [xc + dirIn * D.frente.ala, yIn], [xc, yIn], [xc, -yIn], [xc + dirIn * D.frente.ala, -yIn],
      ], D.plT, dirIn > 0 ? 'izquierda' : 'derecha', `Frente ${nm} — U con pestañas ${D.frente.ala} hacia adentro`),
      flat: flatPerfilC(hF, D.innerW, D.frente.ala, D.plT,
        'Acero S275JR chapa 3 — plegado (pestañas 40), PINTADO RAL 7035 (Frente_BRP)', holesFr),
    });
    fr.flat = true;
  }

  // ---- Retorno: RODILLOS de eje muerto (decisión usuario, cotización):
  // tubo Ø63.5 con 2 rodamientos SELLADOS 6202-2RS insertos en los extremos;
  // eje muerto Ø15 perforado+roscado M8 en ambas caras → PERNO HEXAGONAL M8
  // + golilla POR FUERA de la placa (misma solución del transfer90 con M10)
  for (const q of path) {
    if (q.rol !== 'ret' && q.rol !== 'snub' && q.rol !== 'tail') continue;
    const f = [
      cyl(`Tubo Ø${D.gtRetDia} (2× 6202-2RS insertos)`, [q.c[0], -D.sqLen / 2, q.c[1]], [0, 1, 0], D.gtRetDia, D.sqLen),
      cyl(`Eje muerto Ø${D.retEjeDia} (roscado M${D.retPernoM} int. ambas puntas)`, [q.c[0], -D.innerW / 2, q.c[1]], [0, 1, 0], D.retEjeDia, D.innerW),
    ];
    for (const sd of [-1, 1]) {
      f.push(cyl(`Perno hex M${D.retPernoM} + golilla (por fuera)`, [q.c[0], sd * (D.innerW / 2 + D.plT), q.c[1]], [0, sd, 0], 13, 6));
    }
    const nomRod = q.rol === 'tail'
      ? `FAB · Rodillo de COLA (tensor) Ø${D.gtRetDia} en COLISA 9x40 — tubo A513 Ø63,5×3,0 + 2 cabezales torneados asiento Ø35 H7 (6202-2RS) · eje muerto Ø15 roscado M${D.retPernoM} · tensado por ajuste del perno en la colisa (manual Movex p.73)`
      : `FAB · Rodillo retorno Ø${D.gtRetDia} — tubo A513 Ø63,5×3,0 + 2 cabezales torneados asiento Ø35 H7 (6202-2RS) · eje muerto Ø15 SAE1045 roscado M${D.retPernoM} — plano EJ-04 pendiente`;
    addPart(nomRod, C.ret, [q.c[0], 0, q.c[1]], f);
  }

  // ---- EJE MOTRIZ (abajo, descarga) + sprockets + chumaceras + motor ----
  addPart(`FAB · EJE MOTRIZ cuadrado ${D.sq} — L=${D.ejeMotrizL} (muñones Ø30 ${D.jrnTol})`, C.eje,
    [xDrv, 0, zM], ejeMotriz(xDrv, zM), { sub: SUB_EJE });
  for (const y of ySprk) {
    addPart(`NORM · Sprocket ${BELT.sprocket.art}`, C.sprk, [xDrv, y, zM], sprocket(xDrv, y, zM), { sub: SUB_EJE });
  }
  const yFix = ySprk[Math.floor(ySprk.length / 2)];   // solo el central se fija
  for (const sd of [-1, 1]) {
    const yC = yFix + sd * (BELT.sprocket.ancho / 2 + 6);
    addPart(`NORM · Collarín ${BELT.collar.split(' — ')[0]} (fija el sprocket central)`, C.chum,
      [xDrv, yC, zM], collar(xDrv, yC, zM), { sub: SUB_EJE });
  }
  // chaveta DIN 6885 A y retención axial del motorreductor, en el muñón motriz
  const yKey = D.sqLen / 2 + D.jrnMotriz - D.cuboMotor / 2;
  addPart(`NORM · Chaveta DIN 6885 A ${D.chaveta.w}×${D.chaveta.h}×${D.chaveta.l} C45`, C.eje, [xDrv, yKey, zM + D.jrnDia / 2], [
    box('Chaveta', [xDrv, yKey, zM + D.jrnDia / 2], D.chaveta.w, D.chaveta.l, D.chaveta.h),
  ], { sub: SUB_EJE });
  const yEnd = D.sqLen / 2 + D.jrnMotriz;
  addPart('NORM · Arandela de retención Ø40×6 + tornillo M10×25 8.8 (retención axial del motorreductor)', C.chum, [xDrv, yEnd + 3, zM], [
    cyl('Arandela Ø40×6', [xDrv, yEnd, zM], [0, 1, 0], 40, 6),
    cyl('Cabeza M10', [xDrv, yEnd + 6, zM], [0, 1, 0], 16, 7),
  ], { sub: SUB_EJE });
  // chumaceras UCF206 REALES (1485N3) sobre mecha (LBP, faldón sandwich) o sobre suple (GT)
  const yBaseUCF = yOut + offUCF;
  for (const s of [-1, 1]) {
    ucfReal(xDrv, s * yBaseUCF, zM, s);
    // 4 pernos coche 3/8 × 3 in: cabeza por DENTRO (alma o mecha), tuerca sobre la brida
    const yHead = conMecha ? s * yWebOut : s * yIn;
    const stack = conMecha ? 8 + 1.5 + REALES.ucf206.esp : D.plT + D.suple.t + REALES.ucf206.esp;
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      pernoCoche([xDrv + dx * D.ucf.boltGap / 2, yHead, zM + dz * D.ucf.boltGap / 2], [0, s, 0], stack, 3, 'chumacera UCF206');
    }
  }
  // ---- Accionamiento = el del BRP (pedido Sergio): caja sinfín + motor 1 HP vertical
  // (caja_314508014), brazo de reacción 50154 (K1 = 100 hacia la cola) y pasador
  // EspBrazoReac Ø25,4 × 50 apernado con perno coche 3/8 (cabeza por dentro), en
  // la MISMA posición relativa que en el Cabezal BP_S550_b425: origen de caja y brazo
  // a 101,5 de la base del pasador, eje hueco a (x −50, z −64) del origen de la caja.
  const yPinBase = conMecha ? r2(yWebOut + 8 + 1.5) : yWebOut;   // cara donde apoya el pasador (faldón sobre la mecha · alma)
  const yCaja = r2(yPinBase + 101.5), zCaja = r2(zM + 64);
  const R_CAJA = [[0, 1, 0], [-1, 0, 0], [0, 0, 1]], R_BRAZO = [[0, -1, 0], [1, 0, 0], [0, 0, 1]], R_PIN = [[1, 0, 0], [0, 0, 1], [0, -1, 0]];
  piezaReal('NORM · Motorreductor del BRP: caja sinfín eje hueco Ø30 + motor 1 HP vertical (STEP 314508014, pieza real)', C.motor,
    REALES.caja, R_CAJA, [xDrv + 50, yCaja, zCaja], REALES.cajaBB);
  piezaReal('NORM · Brazo de reacción 50154 (BRP, K1 = 100, ojo con buje Ø30)', C.motor,
    REALES.brazo50154, R_BRAZO, [xDrv - 50, yCaja, zCaja], REALES.brazoBB);
  piezaReal('NORM · Pasador brazo de reacción EspBrazoReac Ø25,4 × 50 (BRP, pieza real)', C.eje,
    REALES.pasador, R_PIN, [xPin, yPinBase + REALES.pasador.L / 2, zM], REALES.pasadorBB);
  {
    // cabeza por dentro: en el LBP el pasador está a la cota del eje (−400), bajo el alma:
    // atraviesa sólo mecha + faldón; en el GT atraviesa el alma
    const yHeadPin = conMecha ? yWebOut : yIn;
    const stackPin = r2((yPinBase - yHeadPin) + REALES.pasador.L + 14);   // (alma | mecha + faldón) + pasador + brazo
    pernoCoche([xPin, yHeadPin, zM], [0, 1, 0], stackPin, stackPin + 12.9 <= 82.55 ? 3.25 : 3.5, 'pasador brazo de reacción');
  }

  // ---- Guía LATERAL: conical rail ENROLLABLE L 1¼ in (P12501C, cotización)
  // sobre escuadras regulables; núcleo AISI304 1.5 + cara Ti-WHITE
  for (const s of [-1, 1]) {
    // sobre el extremo interior del PortaGuardaMovex (BRP: el porta entra 12 dentro del plano del alma)
    const yRail = s * (yWebOut - 12 - 3);
    const zRail = POST.zBase + POST.railZ + POST.railH / 2;
    addPart(`NORM · Guía de cajas conical rail L 1¼ in (${BELT.railLateral.split(' — ')[0]}) sobre portas Movex`, C.guia,
      [L / 2, yRail, zRail], [
        box('Cara Ti-WHITE 1¼ in', [L / 2, yRail, zRail], L - 120, 6, POST.railH),
        box('Ala AISI304 1.5', [L / 2, s * (yWebOut - 12 - 6), zRail - POST.railH / 2 + 1], L - 120, 12, 2),
      ]);
  }

  // ---- PATAS: familia ZP2026 con las piezas REALES de ZP2026\Piezas ----
  // Escuadra B_005A_1 apernada bajo la pestaña (2× perno coche 3/8), columna
  // SOLID_06 (C 77×38×3, L=588, alma hacia afuera) apernada a la escuadra
  // (pivote + ranura en arco: regulación), placa base B_004A_1 y travesaño de
  // patas C 71×38×3 (sección del B_002A_1) que entra DENTRO del C de las
  // columnas (luz 77−2·3 = 71) y se aperna por las alas. Piso a −918 → NPT
  // de banda 918 (sin nivelador: la regulación es la ranura de la escuadra).
  const ZPE = D.zp;
  const zRel = (dy) => r2(zAlaBot + dy);
  const RZP = {
    escuadraMasZ: [[0, 0, -1], [0, 1, 0], [1, 0, 0]], escuadraMenosZ: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
    columnaMasZ: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], columnaMenosZ: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
    base: [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  };
  for (const x of patasX) {
    for (const s of [-1, 1]) {
      const ladoMasZ = s < 0;   // ZP +Z ↔ aquí −Y (M_ZP)
      const yE = s * (yFlangeOut - ZPE.escuadra.dyOut), yC = s * (yFlangeOut - ZPE.columna.dyOut), yB = s * (yFlangeOut - ZPE.base.dyOut);
      const Resc = matMul(M_ZP, ladoMasZ ? RZP.escuadraMasZ : RZP.escuadraMenosZ);
      piezaReal('ZP2026 · Escuadra de pata B_005A_1 (203×95×3 plegada, apernada bajo la pestaña con 2× perno coche 3/8)', C.pata,
        { archivo: 'B_005A_1.ipt', origen: ZP_ORIGEN, carpeta: 'Estructura\\Soportes\\ZP2026', familia: 'ZP2026' }, Resc,
        [x, yE, zRel(ZPE.escuadra.dz)], REALES.zpBB['B_005A_1.ipt'], { sub: subPata(x) });
      piezaReal(`ZP2026 · Columna de pata SOLID_06 (C ${ZPE.columna.w}×${ZPE.columna.d}×${ZPE.columna.t} · L=${ZPE.columna.L})`, C.pata,
        { archivo: 'SOLID_06.ipt', origen: ZP_ORIGEN, carpeta: 'Estructura\\Soportes\\ZP2026', familia: 'ZP2026' },
        matMul(M_ZP, ladoMasZ ? RZP.columnaMasZ : RZP.columnaMenosZ), [x, yC, zRel(ZPE.columna.dz)], REALES.zpBB['SOLID_06.ipt'], { sub: subPata(x) });
      piezaReal(`ZP2026 · Placa base de pata B_004A_1 (${ZPE.base.l}×${ZPE.base.w}×${ZPE.base.t})`, C.pata,
        { archivo: 'B_004A_1.ipt', origen: ZP_ORIGEN, carpeta: 'Estructura\\Soportes\\ZP2026', familia: 'ZP2026' },
        matMul(M_ZP, RZP.base), [x, yB, zRel(ZPE.base.dz)], REALES.zpBB['B_004A_1.ipt'], { sub: subPata(x) });
    }
    const Lp = r2(2 * yFlangeOut - 2);
    const zTp = zRel(ZPE.travPatas.dzTop);
    const fP = [
      box('Alma C 71 (arriba)', [x, 0, zTp - TC.t / 2], TC.w, Lp, TC.t),
      box('Ala +X', [x + TC.w / 2 - TC.t / 2, 0, zTp - TC.h / 2], TC.t, Lp, TC.h),
      box('Ala −X', [x - TC.w / 2 + TC.t / 2, 0, zTp - TC.h / 2], TC.t, Lp, TC.h),
    ];
    const holesP = [];
    const BAp = bendAllowance(90, TC.t, TC.t, KCH);
    const alaP = TC.h - 2 * TC.t, Hp = 2 * alaP + 2 * BAp + (TC.w - 2 * TC.t);
    for (const s of [-1, 1]) for (const sx of [-1, 1]) {
      fP.push(hole('Paso perno coche 3/8 (a la columna)', [x + sx * (TC.w / 2 - TC.t / 2), s * (yFlangeOut - 20), zTp - TC.h / 2], [sx, 0, 0], PC, 0, true));
      holesP.push({ x: r2(Lp / 2 + s * (yFlangeOut - 20)), y: sx < 0 ? r2(alaP / 2) : r2(Hp - alaP / 2), dia: PC });
    }
    addPart(`FAB · Travesaño de patas tipo ZP2026 (B_002A) — C 71×38×3 L=${Lp} (entra en el C de las columnas)`, C.pata, [x, 0, zTp - TC.h / 2], fP, {
      flat: flatPerfilC(Lp, TC.w, TC.h, TC.t, 'Acero S275JR e3 — plegado en C 71×38 (misma matriz que el B_002A_1 del ZP2026), PINTADO RAL 7035. APERNADO a las columnas por las alas (4× perno coche 3/8)', holesP),
      sub: subPata(x),
    });
    // pernería travesaño de patas ↔ alas de la columna (cabeza por fuera de la columna, eje X)
    for (const s of [-1, 1]) for (const sx of [-1, 1]) {
      pernoCoche([x + sx * ZPE.columna.w / 2, s * (yFlangeOut - 20), zTp - TC.h / 2], [-sx, 0, 0], 6, 1, 'travesaño de patas a columna', { sub: subPata(x) });
    }
  }

  // ---- BANDA (lazo cerrado, boceto XZ extruido a lo ancho) ----
  // Representación por TRAMOS (pedido Sergio): la banda se muestra sólo en el
  // cabezal (nosebar → sprocket → snub) y en la cola (nosebar + rodillo de cola),
  // para ver los soportes de guías, la estructura interior y la pernería. El lazo
  // completo sigue existiendo en el cálculo (largo, envolturas, compuertas).
  const ventanasBanda = esLBP ? [[L - 900, L + 20, 'cabezal'], [-20, 450, 'cola']] : [[L - 330, L + 20, 'cabezal'], [-20, 140, 'cola']];
  for (const [x0, x1, tag] of ventanasBanda) {
    const o = clipX(outer, x0, x1), q = clipX(inner, x0, x1);
    if (o.length < 4) continue;
    addPart(`NORM · Banda ${BELT.serie} ${esLBP ? 'LBP' : 'GT (friction top)'} 18 in — tramo ${tag} (representación; lazo completo ${r2(largo / 1000)} m)`,
      C.banda, [(Math.max(x0, 0) + Math.min(x1, L)) / 2, 0, zci + BELT.esp / 2], [
        sketchXZ(`Cara exterior del lazo (tramo ${tag})`, BELT.ancho / 2, o, BELT.ancho),
        ...(q.length >= 4 ? [sketchXZ('Vaciado interior', -BELT.ancho / 2, q, BELT.ancho, 'cut')] : []),
      ]);
  }
  const enVentana = (x) => ventanasBanda.some(([x0, x1]) => x >= x0 && x <= x1);

  // ---- Superficie del tramo de carga ----
  const xa = 2 * (BELT.noseR + BELT.esp) + 20, xb = L - xa;
  if (esLBP) {
    // rodillos LBP Ø12.2 POM rojo: filas cada 50.8 (3 por módulo de 6 in),
    // 12 carriles (los wearstrips corren por los espacios entre carriles)
    const zR = -BELT.lbp.rodDia / 2;   // tope del rodillo = plano del producto (0)
    const nCol = 12, spanC = BELT.ancho - 50, rodL = 24;
    const feats = [];
    let filas = 0;
    for (let x = xa; x <= xb; x += BELT.lbp.filaCada) {
      if (!enVentana(x)) continue;
      filas++;
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
    for (let x = xa; x <= xb; x += BELT.paso) {
      if (!enVentana(x)) continue;
      filas++;
      feats.push(box('Goma grip top', [x, 0, -BELT.gt.goma / 2], BELT.paso - 4, BELT.ancho - 50, BELT.gt.goma));
    }
    addPart(`NORM · Goma Grip Top ${BELT.gt.dureza} (+${BELT.gt.goma}, ${filas} filas)`, C.goma,
      [L / 2, 0, -BELT.gt.goma / 2], feats);
  }

  // datos para verify(): puntos del lazo, chequeo de guardas y travesaños
  const guardasChk = guardas.map(g => ({
    tag: g.tag, xa: g.xa, xb: g.xb, fondoZ: g.fondoZ, pernos: g.holesX.length * 2 + g.mechaMounts.length * 2,
  }));
  const travChk = xsTrav.filter(t => lazoChoca(t.x, t.zona.z0, t.zona.z1, t.zona.z0c)).map(t => t.x);
  const nTrav = xsTrav.length;
  let mechasOverlap = false;
  for (let i = 0; i < mechasSpec.length; i++) for (let j = i + 1; j < mechasSpec.length; j++) {
    if (mechasSpec[i].x1 > mechasSpec[j].x0 && mechasSpec[j].x1 > mechasSpec[i].x0) mechasOverlap = true;
  }
  const pernosPorLargo = {};
  for (const p of parts) { const m = /Perno coche 3\/8 in × ([\d.]+) in/.exec(p.name); if (m) pernosPorLargo[m[1]] = (pernosPorLargo[m[1]] || 0) + 1; }
  const nPernosCoche = Object.values(pernosPorLargo).reduce((a, b) => a + b, 0);
  const estructura = { conMecha, conGuarda, tramos: tramos.length, acoples: acoples.length, patas: patasX.length, travesanos: xsTrav.length,
    zonasTrav: xsTrav.map(t => t.zona.tag), nPernosCoche, pernosPorLargo, postesGuia: 2 * xsPost.length, ventanasBanda, zLazoMin, zAlaBot, NPT: -D.pisoZ,
    subensambles: [...new Set(parts.filter(p => p.sub).map(p => p.sub.archivo))], piezasReales: parts.filter(p => p.ref).length };
  return { parts, largoBanda: largo, wraps, path, pathOuterPts: outer, guardasChk, travChk, nTrav, mechasOverlap, estructura };
}

// ---------------------------------------------------------------------------
// INTERFERENCIAS (compuerta): sólidos de cada pieza contra los de las demás. Un
// solapamiento se acepta si queda dentro de un corte (agujero) de alguna de las dos
// piezas — así el perno que pasa por su agujero no cuenta — o si el par está en la
// lista de CONTACTOS previstos (banda contra lo que la sostiene, etc.).
// ---------------------------------------------------------------------------
const CONTACTOS = [
  // la BANDA se verifica con la geometría exacta del lazo (wraps, lazoChoca de los
  // travesaños, fondo de guarda): en la compuerta de cajas se excluye
  [/Banda Movex/, /./],
  [/Goma Grip|Rodillos LBP/, /Banda Movex|Nosebar|Guía de apoyo|Guía de cajas|Guía lateral de desgaste/],
  [/Sprocket/, /EJE MOTRIZ|Collarín|Banda/],
  [/Collarín/, /EJE MOTRIZ|Sprocket/],
  [/Chumacera UCF206/, /EJE MOTRIZ|Mecha|Suple|Motorreductor|Placa lateral|Perno coche|Golilla|Tuerca/],
  [/Motorreductor|Brazo de reacción|Pasador brazo/, /EJE MOTRIZ|Chumacera|Mecha|Placa lateral|Guarda inferior|Perno coche|Golilla|Tuerca|Pasador brazo|Brazo de reacción|Motorreductor/],
  [/Perno coche|Golilla|Tuerca hexagonal/, /./],           // la tornillería se chequea aparte (debe pasar por agujero)
  [/Guía de apoyo/, /Travesaño|Banda|Frente|Nosebar/],
  [/Guía de cajas conical rail/, /Porta guía Movex|Poste guía/],
  [/Porta guía Movex/, /Poste guía|Guía de cajas/],
  [/Poste guía de cajas/, /Placa lateral|Porta guía/],
  [/Guía lateral de desgaste/, /Placa lateral|Banda|Poste guía/],
  [/ZP2026 · /, /ZP2026 · |Placa lateral|Travesaño de patas|Perno coche|Golilla|Tuerca/],
  [/Travesaño de patas/, /ZP2026 · |Perno coche|Golilla|Tuerca/],
  [/Rodillo (retorno|de COLA)/, /Placa lateral|Mecha|Banda/],
  [/Nosebar/, /Frente|Banda|Placa lateral|Guía de apoyo/],
  [/EJE MOTRIZ|Chaveta|Arandela de retención/, /Sprocket|Collarín|Chumacera|Motorreductor|Mecha|Guarda|Placa lateral|Chaveta|Arandela/],
  [/Mecha porta-chumacera/, /Placa lateral|Guarda inferior|Chumacera|Perno coche|Golilla|Tuerca|Motorreductor|Pasador/],
  [/Guarda inferior/, /Placa lateral|Mecha|Chumacera|Perno coche|Golilla|Tuerca|Banda|Rodillo|EJE MOTRIZ|Sprocket|Pasador|Motorreductor|Brazo/],
  [/Frente porta-nosebar/, /Placa lateral|Nosebar|Perno coche|Golilla|Tuerca|Guía de apoyo/],
  [/Travesaño tipo ZP2026|Travesaño BAJO/, /Placa lateral|Guía de apoyo|Perno coche|Golilla|Tuerca/],
  [/Acople de laterales/, /Placa lateral|Perno coche|Golilla|Tuerca/],
  [/Suple de descanso/, /Placa lateral|Chumacera|Perno coche|Golilla|Tuerca|Motorreductor/],
  [/Placa lateral/, /Placa lateral/],
];
const contactoOk = (n1, n2) => CONTACTOS.some(([a, b]) => (a.test(n1) && b.test(n2)) || (a.test(n2) && b.test(n1)));
const solapa = (A, B) => {
  const lo = [0, 1, 2].map(i => Math.max(A[0][i], B[0][i]));
  const hi = [0, 1, 2].map(i => Math.min(A[1][i], B[1][i]));
  const d = [0, 1, 2].map(i => hi[i] - lo[i]);
  return d.every(v => v > 0.05) ? { lo, hi, vol: d[0] * d[1] * d[2] } : null;
};
const dentro = (caja, cont) => [0, 1, 2].every(i => caja.lo[i] >= cont[0][i] - 0.6 && caja.hi[i] <= cont[1][i] + 0.6);
// Cada perno coche debe pasar por un agujero: se recorre su eje y, en cada pieza
// fabricada que atraviesa, tiene que haber un corte que lo contenga.
function pernosSinAgujero(parts) {
  const fab = parts.filter(p => p.name.startsWith('FAB') && p.features.some(f => f.op !== 'cut' && f.shape !== 'hole'))
    .map(p => ({ name: p.name, solidos: p.features.filter(f => f.op !== 'cut' && f.shape !== 'hole').map(f => aabb(f, p.pos)).filter(Boolean),
                 cortes: p.features.filter(f => f.op === 'cut' || f.shape === 'hole').map(f => aabb(f, p.pos)).filter(Boolean) }));
  const malos = [];
  for (const p of parts) {
    if (!p.perno) continue;
    const { p: P0, n, stack } = p.perno;
    for (let d = 0.5; d <= stack + 0.5; d += 0.5) {
      const q = [P0[0] + n[0] * d, P0[1] + n[1] * d, P0[2] + n[2] * d];
      for (const f of fab) {
        const dentroSolido = f.solidos.some(sb => [0, 1, 2].every(i => q[i] >= sb[0][i] - 0.01 && q[i] <= sb[1][i] + 0.01));
        if (!dentroSolido) continue;
        const hayCorte = f.cortes.some(c => [0, 1, 2].every(i => q[i] >= c[0][i] - 0.01 && q[i] <= c[1][i] + 0.01));
        if (!hayCorte) malos.push(`${p.perno.rol} en [${q.map(r2)}] atraviesa «${f.name.slice(0, 50)}» sin agujero`);
      }
    }
  }
  return [...new Set(malos)];
}

// Cuerpo redondo de una feature (para no dar por chocados dos cilindros cuyas cajas
// se rozan por la esquina): {eje, c:[u,v], r} en el plano perpendicular al eje.
function redondo(f, pos) {
  const c = [f.at[0] + pos[0], f.at[1] + pos[1], f.at[2] + pos[2]];
  if (f.shape === 'cylinder') {
    const d = f.dir || [0, 0, 1], i = d.findIndex(v => Math.abs(v) > 0.5);
    const uv = [0, 1, 2].filter(k => k !== i);
    return { eje: i, c: [c[uv[0]], c[uv[1]]], r: f.params.dia / 2 };
  }
  if (f.shape === 'sketch' && /Corona dentada/.test(f.name)) {
    const d = f.dir || [0, -1, 0], i = d.findIndex(v => Math.abs(v) > 0.5);
    const uv = [0, 1, 2].filter(k => k !== i);
    const us = f.params.pts.map(q => q[0]), vs = f.params.pts.map(q => q[1]);
    const cu = (Math.min(...us) + Math.max(...us)) / 2, cv = (Math.min(...vs) + Math.max(...vs)) / 2;
    return { eje: i, c: [c[uv[0]] + cu, c[uv[1]] + cv], r: (Math.max(...us) - Math.min(...us)) / 2 };
  }
  return null;
}
// Solapamiento real entre dos sólidos: si ambos son redondos y coaxiales se compara la
// distancia entre centros; si uno es redondo, círculo contra rectángulo.
function solapaReal(A, B) {
  const ov = solapa(A.caja, B.caja);
  if (!ov) return null;
  const ra = A.circ, rb = B.circ;
  if (ra && rb && ra.eje === rb.eje) {
    const d = Math.hypot(ra.c[0] - rb.c[0], ra.c[1] - rb.c[1]);
    if (d > ra.r + rb.r - 0.05) return null;
  } else if (ra || rb) {
    const R = ra || rb, otro = ra ? B.caja : A.caja;
    const uv = [0, 1, 2].filter(k => k !== R.eje);
    const dx = Math.max(otro[0][uv[0]] - R.c[0], 0, R.c[0] - otro[1][uv[0]]);
    const dy = Math.max(otro[0][uv[1]] - R.c[1], 0, R.c[1] - otro[1][uv[1]]);
    if (Math.hypot(dx, dy) > R.r - 0.05) return null;
  }
  return ov;
}
function interferencias(parts, tolMm3 = 60) {
  const P = parts.map(p => ({
    name: p.name,
    solidos: p.features.filter(f => f.op !== 'cut' && f.shape !== 'hole')
      .map(f => ({ caja: aabb(f, p.pos), circ: redondo(f, p.pos) })).filter(q => q.caja),
    cortes: p.features.filter(f => f.op === 'cut' || f.shape === 'hole').map(f => aabb(f, p.pos)).filter(Boolean),
    bbox: p.bbox,
  })).filter(p => p.solidos.length);
  const hits = new Map();
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j];
    if (!a.bbox || !b.bbox) continue;
    if (!solapa([a.bbox.slice(0, 3), a.bbox.slice(3)], [b.bbox.slice(0, 3), b.bbox.slice(3)])) continue;
    if (contactoOk(a.name, b.name)) continue;
    let peor = 0, caja = null;
    for (const sa of a.solidos) for (const sb of b.solidos) {
      const ov = solapaReal(sa, sb);
      if (!ov || ov.vol < tolMm3) continue;
      if (a.cortes.some(c => dentro(ov, c)) || b.cortes.some(c => dentro(ov, c))) continue;
      if (ov.vol > peor) { peor = ov.vol; caja = ov; }
    }
    if (peor > tolMm3) {
      const key = `${a.name.slice(0, 60)} ⟷ ${b.name.slice(0, 60)}`;
      const prev = hits.get(key);
      if (!prev || prev.vol < peor) hits.set(key, { vol: r2(peor), en: caja.lo.map(r2) });
    }
  }
  return [...hits.entries()].map(([k, v]) => ({ par: k, vol_mm3: v.vol, en: v.en })).sort((x, y) => y.vol_mm3 - x.vol_mm3);
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
  if (Math.abs(D.pisoZ - (D.plTop - D.plAlto - D.zp.hPiso)) > 0.01) e.push('piso inconsistente con la columna real del ZP2026 (588 + escuadra + base = 610)');
  if (D.innerW / 2 + D.plT + D.alaAncho !== D.yFlangeOut) e.push('borde de pestaña inconsistente');
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
    if (!eq.nTrav) e.push(`${nm}: bastidor sin ningún travesaño (mínimo 1 además de los cabezales)`);
    if (eq.mechasOverlap) e.push(`${nm}: mechas solapadas entre sí`);
    if (nm === 'GT' && (eq.estructura.conMecha || eq.estructura.conGuarda)) e.push('GT: con el lateral de 300 el accionamiento debe caber dentro del bastidor (sin mecha ni guarda)');
    if (nm === 'LBP' && !eq.estructura.conGuarda) e.push('LBP: el accionamiento cuelga bajo el bastidor y debe llevar guarda');
    if (eq.estructura.zonasTrav.some(t => t !== 'alto')) e.push(`${nm}: algún travesaño no cabe bajo las guías de apoyo (zonas ${eq.estructura.zonasTrav})`);
    const refsZP = eq.parts.filter(p => p.ref && p.ref.familia === 'ZP2026');
    if (refsZP.length !== 6 * eq.estructura.patas) e.push(`${nm}: patas ZP2026 incompletas (${refsZP.length} piezas referenciadas para ${eq.estructura.patas} patas)`);
    const faltan = [...new Set(eq.parts.filter(p => p.ref).map(p => p.ref.origen + '\\' + p.ref.archivo))].filter(f => !existsSync(f));
    for (const f of faltan) e.push(`${nm}: componente real no encontrado: ${f}`);
    // interferencias entre piezas (sin contactos previstos ni tornillería en su agujero)
    eq.interf = interferencias(eq.parts);
    eq.pernosMal = pernosSinAgujero(eq.parts);
    for (const q of eq.pernosMal.slice(0, 8)) e.push(`${nm}: PERNO SIN AGUJERO — ${q}`);
    for (const q of eq.interf.slice(0, 12)) e.push(`${nm}: INTERFERENCIA ${q.par} — ${q.vol_mm3} mm³ en [${q.en}]`);
    if (eq.interf.length > 12) e.push(`${nm}: ${eq.interf.length - 12} interferencias más (ver lista)`);
  }
  // corte de barras (8 motrices + 4 tensores — el GT no lleva eje tensor; kerf 9 mm)
  const nMot = 8, nTen = 0;   // decisión Movex 2026-09-08: sin ejes tensores
  const corteM = nMot * (D.ejeMotrizL + 9), corteT = nTen * (D.ejeTensorL + 9);
  if (corteM > 6000) e.push(`${nMot} ejes motrices no salen de una barra de 6 m (${corteM})`);
  // ── compuertas del manual Movex p.72 (bottom head drive) y p.108 ──
  for (const [tipo, r] of Object.entries(res)) {
    const wrapDe = (rol) => { const i = r.path.findIndex(q => q.rol === rol); return i < 0 ? null : r.wraps[i]; };
    const w = wrapDe('motriz');
    if (w < 130 || w > 150) e.push(`${tipo}: envoltura de la motriz ${w}° fuera de 140±10 (manual p.72/108)`);
    r.wrapMotriz = w;
    const wN = wrapDe('noseB');
    if (wN < 135 || wN > 155) e.push(`${tipo}: giro en el nosebar de descarga ${wN}° fuera de 145±10 (manual p.72: ramal descendente a ~35°)`);
    r.wrapNoseB = wN;
    for (let i = 0; i < r.path.length; i++) {
      if (!r.path[i].virtual && r.wraps[i] > 179) e.push(`${tipo}: el lazo se cruza en «${r.path[i].rol}» (giro ${r.wraps[i]}°)`);
    }
    if (tipo === 'LBP') {
      r.sag = r2(Math.abs(D.sagBot - D.retTop));
      if (r.sag < 50 || r.sag > 150) e.push(`LBP: flecha de catenaria ${r.sag} fuera de 50–150`);
      const xs = (rol) => r.path.filter(q => q.rol === rol).map(q => q.c[0]);
      const xSnub = xs('snub')[0], rets = xs('ret').sort((a, b) => b - a);
      const catL = r2(xSnub - rets[0]);
      if (catL < 650 || catL > 900) e.push(`LBP: largo de catenaria snub→primer apoyo ${catL} fuera de 700 +200/−50`);
      for (let i = 0; i + 1 < rets.length; i++) if (Math.abs(rets[i] - rets[i + 1] - 500) > 50) e.push(`LBP: paso de apoyos de retorno ${r2(rets[i] - rets[i + 1])} fuera de 500±50`);
      const ult = r2(rets[rets.length - 1] - xs('tail')[0]);
      if (ult < 400 || ult > 500) e.push(`LBP: último tramo apoyo→rodillo de cola ${ult} fuera de 450±50`);
      r.catenLen = catL; r.ultimoTramo = ult;
    }
    const wT = wrapDe('tail');
    if (wT !== null && (wT < 60 || wT > 179)) e.push(`${tipo}: giro en el rodillo de cola ${wT}° (esperado 60–179)`);
  }
  if (e.length) {
    const msg = 'Diseño inconsistente:' + BR + '  - ' + e.join(BR + '  - ');
    if (process.env.SIN_GATE) console.warn('AVISO (SIN_GATE=1, se emite igual):' + BR + msg);
    else throw new Error(msg);
  }
  return { corteM, corteT };
}

// ---------------------------------------------------------------------------
// Emitir
// ---------------------------------------------------------------------------
const res = {};
const builds = {};
// Largo nose a nose del GT: 600 mm (pedido 2026-09-08; antes 800). Se puede
// regenerar otro largo con GT_L=800 node cad/ensambles/gen_lbp530.mjs.
export const GT_L = Number(process.env.GT_L || 600);
const gtFile = `lbp530_gt${String(Math.round(GT_L / 100)).padStart(2, '0')}.json`;
for (const [tipo, L, file, nombre] of [
  ['LBP', 5000, 'lbp530_5m.json', 'CV-LBP-5000 · Movex 530 LBP 18 in × 5.0 m'],
  ['GT', GT_L, gtFile, `CV-GT-${GT_L} · Movex 530 GT (grip top) 18 in × ${(GT_L / 1000).toFixed(1)} m`],
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
    motorreductor: 'EL MISMO DEL BRP (pedido Sergio 2026-09-08): caja sinfín eje hueco Ø30 + motor 1 HP vertical (STEP 314508014) con brazo de reacción 50154 y pasador EspBrazoReac Ø25,4 (piezas reales de la carpeta Motores); la selección NMRV-P 075 0,55 kW de criterios/accionamiento.md queda como mínimo calculado. Chaveta DIN 6885 A 8×7×90; retención arandela + tornillo M10',
  },
  traccion: 'BOTTOM HEAD DRIVE según manual Movex p.72: motriz ABAJO en la descarga con el ramal saliendo del nosebar a 145±10° y envoltura 140±10°, snub tras la motriz; LBP: catenaria 700 +200/−50, apoyos cada 500±50, último tramo 450±50; UN SOLO EJE cuadrado por equipo (decisión con Movex 2026-09-08): la entrada lleva nosebar + rodillo de cola Ø63,5 en colisa como tensor (manual p.73); NOSEBAR en ambas puntas',
  sprockets: `Z-32 MOLDEADO PD 153.4 OD 154.8 ancho 40, BORE CUADRADO 1.5 in c/grano M8 (P158808YF, cotización 26012937) — solo en el EJE MOTRIZ (un eje por equipo). 530 LBP estándar 18 in: 5 en el grid VÁLIDO A·B·C·B·C·A (centrado: -152.4/-89.05/0/+63.35/+152.4; manual p.30 = brochure p.11; poner 6 es IMPOSIBLE: las demás posiciones caen bajo los carriles de rodillos ✗; 6 aplica solo a 530 PRO LBP) · GT: 6 (indent 38.1, paso 76.2); SOLO el central FIJO (grano M8 + collarines P21703Y), resto FLOTAN (+0.4/+0.3)`,
  retorno: 'RODILLOS Ø63.5 de eje muerto cada ~500 (decisión usuario; manual Movex sugiere zapata para LBP — desviación registrada): tubo con 2 rodamientos SELLADOS 6202-2RS insertos, eje Ø15 roscado M8 interior en ambas puntas, PERNO HEX M8 + golilla POR FUERA de la placa; catenaria 50–150 tras la motriz',
  estructura: `LÍNEA BRP/Merge (Kofmelk) + familia ZP2026 (rediseño 2026-09-08 noche, pedido Sergio): laterales de CHAPA 3 plegada, alma 300, pestaña inferior 38 y labio 20 hacia afuera (LBP en 2 tramos de 2500 con acoples PL3); frentes porta-nosebar chapa 3 plegada 470×240; travesaños C 71×38×3 (sección del B_002A_1 del ZP2026) con orejas plegadas bajo las guías de apoyo; TODO APERNADO con perno coche 3/8 (nada soldado); mechas PL8 apernadas sólo en el LBP (motriz −400), GT con UCF206 sobre suple de descanso PL5; guarda sólo en el cabezal motriz del LBP. PATAS = piezas REALES del ZP2026: escuadra B_005A_1 + columna SOLID_06 (588) + placa base B_004A_1 + travesaño de patas C 71×38 (largo ${r2(2 * D.yFlangeOut - 2)}); NPT ${-D.pisoZ}. Guía de apoyo = pletina 12 de canto + BAR CAP UHMW P101203-30; guía lateral = conical rail L 1¼ in P12501C`,
  friction_top: 'GT: goma 75 ShA sobre la banda; el retorno del GT es sobre rodillos (recomendación del manual); la goma no toca el nosebar (contacto por cara interior)',
  verificaciones: {
    wrapMotrizLBP: res.LBP.wrapMotriz, wrapMotrizGT: res.GT.wrapMotriz,
    giroNosebarLBP: res.LBP.wrapNoseB, giroNosebarGT: res.GT.wrapNoseB,
    catenariaLBP: res.LBP.catenLen, ultimoTramoLBP: res.LBP.ultimoTramo,
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
  console.log(`OK ${b.file}: ${r.parts.length} piezas · lazo ${r2(r.largoBanda / 1000)} m · wrap motriz ${r.wrapMotriz}° · wraps ${r.path.map((q, i) => `${q.rol}:${r.wraps[i]}`).join(' ')}`);
}

// dimensiones/despiece — única fuente para planos de ejes y lista de compra
const lazoLBP = r2(res.LBP.largoBanda / 1000), lazoGT = r2(res.GT.largoBanda / 1000);
const dims = {
  proyecto: 'LBP530-18', lineas: 4,
  transportadoresPorLinea: { [`GT_${GT_L}`]: 1, LBP_5000: 1 },
  GT_L,
  belt: BELT, D,
  lazos_m: { LBP_5000: lazoLBP, [`GT_${GT_L}`]: lazoGT, GT: lazoGT },
  estructura: {
    estilo: 'BRP/Merge (Kofmelk) + familia ZP2026 — 2026-09-08',
    lateral: `chapa ${D.plT} plegada, alma ${D.plAlto}, pestaña inferior ${D.alaAncho} afuera + labio ${D.lipTop} afuera`,
    NPT_mm: -D.pisoZ,
    LBP: res.LBP.estructura, GT: res.GT.estructura,
    patasZP2026: { porPata: { B_005A_1: 2, SOLID_06: 2, B_004A_1: 2, travesanoPatasC71x38: 1 }, origen: ZP_ORIGEN },
    pernoCoche: { espec: D.pernoCoche.espec, porLBP: res.LBP.estructura.nPernosCoche, porGT: res.GT.estructura.nPernosCoche, flota: 4 * (res.LBP.estructura.nPernosCoche + res.GT.estructura.nPernosCoche),
                  porLargoLBP: res.LBP.estructura.pernosPorLargo, porLargoGT: res.GT.estructura.pernosPorLargo, conjunto: 'cada perno con golilla plana F436 + golilla de presión B18.21.1 + tuerca AS 2465 (Content Center, como el BRP)' },
    componentesReales: 'UCF206 = 1485N3 (BRP/Merge); pernería Content Center del BRP/Gapper; patas ZP2026; el resto (Movex 530, NMRV-P075) son sólidos del generador con el detalle del catálogo',
  },
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
      largoTotal: D.ejeTensorL, corte: D.ejeTensorL + 9, cantidad: 0,   // OBSOLETO: decisión Movex 2026-09-08, un solo eje (motriz); cola con rodillo en colisa
      tramos: [
        { nombre: 'muñón', dia: D.jrnDia, tol: D.jrnTol, largo: D.jrnLibre },
        { nombre: 'cuadrado', lado: D.sq, largo: D.sqLen },
        { nombre: 'muñón', dia: D.jrnDia, tol: D.jrnTol, largo: D.jrnLibre },
      ],
    },
    barras: {
      espec: 'Barra cuadrada 1.5 in (38.1) SAE 1045 calibrada × 6 m',
      motriz: { porBarra: 8, usado: chk.corteM }, tensor: { porBarra: 0, usado: 0 },
      comprar: 1, nota: '1 barra: 8 ejes motrices (5520 de 6000); considerar 1 barra de respaldo. Sin ejes tensores (un solo eje por equipo)',
    },
  },
  // Cotización MOVEX 26012937 (09-07-2026, EUR, EXW Castelli Calepio) —
  // projects/LBP530-18/input/docs/Cotizacion_MOVEX_26012937.pdf.
  // "necesario" = lo que consumen las 4 líneas; "cotizado" = lo ofertado.
  compraMovex: {
    banda_530LBP_18in: { art: 'P5324010018A', precioEUR_m: 174.85, necesario_m: r2(4 * lazoLBP), cotizado_m: 90.3, nota: 'cotizado cubre ~2× (repuesto/futuras líneas); rollos de 1.5 m' },
    banda_530GT_18in: { art: 'P5323010018A', precioEUR_m: 243.18, necesario_m: r2(4 * lazoGT), cotizado_m: 18.0 },
    sprockets_Z32_cuadrado15: { art: 'P158808YF', precioEUR: 17.42, necesario: 4 * BELT.nSprkLBP + 4 * BELT.nSprkGT, cotizado: 152, detalle: 'rueda moldeada Z-32 c/grano M8; LBP 5 · GT 6, solo en el eje motriz (un solo eje por equipo; la cola lleva rodillo en colisa)' },
    collarines: { art: 'P21703Y', precioEUR: 2.32, necesario: 2 * 8, cotizado: 60, detalle: '2 por eje motriz (flanquean el sprocket central fijo)' },
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
