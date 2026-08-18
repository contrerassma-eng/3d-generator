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
import { compuertasUniversales, sellarCompuertas, cajaMundo } from './lib_compuertas.mjs';
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
  // Rev.C (directriz Sergio 12-08): canal PROFUNDO — el retorno y la catenaria
  // viajan DENTRO del bastidor (la banda ±228,6 solapa el ala; con placa 180 el
  // lazo cruzaba el plano del ala en toda bajada). Ala solo con muescas en las
  // 2 bajadas de extremo. plAlto = |sagBot| + banda + margen − |plTop|.
  plTop: -8, plAlto: 285,
  // Rev.D: 38 (era 30) — el ala es el ASIENTO del ala horizontal del bracket
  // B_005A: su barreno M8 cae a 16,65 del borde libre del ala del bracket
  // (measured) → con ala 38 el margen agujero→borde da 12,15 (piso 12);
  // con 30 daba 4. Mismo fondo que el ZP (su ala también es ~38).
  alaAncho: 38,
  travesanio: 40, pasoTravLBP: 1000, pasoTravFT: 600,
  // Sistema 24V adoptado (dims MEASURED del ZP2026_MDR.glb; soporte RE-MEDIDO
  // lazo a lazo de la malla 13-08 tras dos rechazos de Sergio: «copia el
  // soporte a piso con bracket del 24V — deben verse IGUALES, solo ajustar
  // el ancho»):
  // TR_S: perfil sombrero 88×88×e3 con orejas apernables («mismo travesaño,
  //   cambiar largo»). SOPORTE por pata (todas las cotas extraídas de los
  //   lazos de la malla, no a ojo):
  //   · B_005A = ÁNGULO plegado 203×(95+38)×3: ala HORIZONTAL con 4
  //     cruciformes 32×19 (en ±21,6 y ±73,7; centro a 16,65 del borde libre)
  //     que aperna POR DEBAJO del ala inferior del canal, y placa VERTICAL
  //     trapezoidal 203×95 COPLANAR con el alma (la continúa hacia abajo):
  //     lados rectos hasta v=25, afinando a 66 en el borde inferior; PIVOTE
  //     Ø11 abajo-centro (v=82,7) + ranura en ARCO R52,1×11 (vano 44°–136°)
  //     + 2 bloqueos discretos Ø11 a R52,1 en 30°/150° (aplome de la pata en
  //     el plano del eje del transportador — tramos inclinados).
  //   · COLUMNA canal C 77×38×3, alma contra la CARA INTERIOR de la placa:
  //     pivote a 64,7 del tope + agujero de arco a 52,1 bajo el tope; abajo
  //     3×Ø11 de apriete (149/179/204 del pie) + ranura VERTICAL 11×110
  //     (centro a 77 del pie: ajuste continuo/vernier) + ranura PESTAÑA
  //     11,6×3,6 del travesaño.
  //   · TIRA BR_3002 canal 84×38×3 ×369, alma en el MISMO plano del
  //     alma/placa, 10 ranuras 11×20 paso 34 (1ª a 38 del pie, última a 25
  //     del tope), desliza POR FUERA de la columna; pata B_004A 158×40×4
  //     SOLDADA con 2 ranuras de anclaje 11×22 en ±63,6.
  //   · TRAVESAÑO B_002A canal 71×38×3 (alma ARRIBA, alas colgando) que se
  //     ENCAJA DENTRO de las columnas (71 = luz interior de 77−2×3), tope a
  //     ~320 del pie de columna, unión PESTAÑA-EN-RANURA + soldadura
  //     (soportes a piso: soldar permitido).
  travTR: { w: 88, h: 88, t: 3, tabW: 120, tabH: 60, tabT: 4, tabHoleSep: 60, holeDia: 7 },
  portacarril: { w: 50, t: 6, clip: { lado: 30, t: 3, largo: 40 } },
  sop24: {
    brk: { w: 203, alto: 95, t: 3, flangeD: 35, cruzOffs: [-73.7, -21.6, 21.6, 73.7],
           cruzW: 32, cruzH: 19, cruzDesdeBorde: 14.5, pivotDia: 11, pvV: 82.7,
           arcoR: 52.1, arcoW: 11, arcoA0: 44, arcoA1: 136, lockDia: 11, lockAng: [30, 150],
           vRecto: 25, wFondo: 66 },
    col: { w: 77, d: 38, t: 3, holeDia: 11, upSep: 52.1, pvDesdeTope: 64.7,
           clampOffs: [149, 179, 204], slotInf: { w: 11, h: 110, c: 77 },
           tabSlot: { w: 11.6, h: 3.6 } },
    tira: { w: 84, d: 38, t: 3, largo: 369, slotW: 11, slotH: 20, slotPitch: 34, nSlots: 10, slot0: 38 },
    b002: { alto: 38, d: 71, t: 3 },     // alma 71 horizontal ARRIBA, alas 38 colgando
    piso: { w: 158, h: 40, t: 4, slotW: 11, slotH: 22, slotOff: 63.6 },
  },

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
  // Rev.C: con canal profundo (fondo −293) el tensor a −290 quedaba EN el
  // borde de la placa (paso Ø48 imposible) — baja a −340: 47 de luz bajo la
  // placa, mismo criterio que la motriz (el lazo se recalcula y las
  // compuertas de envoltura/catenaria juzgan)
  zTensor: -340, xTensorDesdePunta: 300,
  // Rev.E (orden Sergio 13-08): el GT es de UN SOLO EJE — sin tensor. El
  // retorno sale de la motriz, viaja por 2 rodillos altos y ABRAZA el rodillo
  // del nosebar de ENTRADA (P22862 CON RODAMIENTOS h19, flexión normal al
  // mismo radio 9,5 de la nariz — para eso el artículo trae rodamientos).
  // Sin excursión bajo el ala en el vano: el ala queda ÍNTEGRA de punta a
  // muesca de la motriz y caben DOS estaciones de soporte (una sola no es
  // estable — directriz Sergio).
  // retorno del GT Rev.E.1 (hallazgo Sergio 13-08: el 2º rodillo a x=160
  // quedaba BAJO la línea natural del retorno — la cadena de tangentes lo
  // resolvía con una vuelta imposible de ~336°, y la subida tendida invadía
  // la placa del cabezal): UN apoyo tras la motriz + un SNUB que PRESIONA
  // DESDE ARRIBA cerca de la nariz — la banda cae casi vertical detrás del
  // nosebar (como el nose-tail real), pasa BAJO la placa del cabezal (holgura
  // en compuerta) y corre al apoyo. gtSnub = [x, z] del rodillo prensor.
  gtRets: [[510, -211.75]],
  gtSnub: [80, -140],
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
    // Rev.E.1: GT de UN SOLO EJE — apoyo tras la motriz, SNUB prensor (s:-1,
    // la banda pasa POR DEBAJO) cerca de la nariz, y el lazo cierra
    // abrazando el rodillo del nosebar de entrada (noseA) con caída casi
    // vertical detrás del cabezal.
    for (const [x, zc] of D.gtRets) {   // orden del recorrido: motriz→nose
      seq.push({ c: [x, zc], r: D.gtRetDia / 2, s: 1, rol: 'ret' });
    }
    seq.push({ c: [...D.gtSnub], r: D.gtRetDia / 2, s: -1, rol: 'snub' });
  }
  if (tipo === 'LBP') seq.push({ c: [D.xTensorDesdePunta, D.zTensor], r: D.rSprk, s: -1, rol: 'tensor' });
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
function flatPlacaConAla(L, almaAlto, alaAncho, t, holesAlma, material, aviso, holesAla = [], muescasAla = []) {
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
  // MUESCAS DEL ALA: la banda (±228,6) solapa 17,6 mm con el ala (borde
  // interior 211) — donde el lazo cruza el plano del ala, el ala NO puede
  // existir (interferencia detectada por Sergio 12-08). La muesca corta ala
  // completa + zona de plegado (hasta la tangente del alma): contorno inferior
  // con escotaduras rectangulares.
  const dM = r2(alaFlat + BA);
  const mk = (muescasAla || []).map(m => [Math.max(0, r2(m[0])), Math.min(L, r2(m[1]))])
    .filter(([a, b]) => b > a).sort((u, v) => u[0] - v[0]);
  let contorno;
  if (mk.length) {
    const pts = [[0, 0]];
    for (const [a, b] of mk) pts.push([a, 0], [a, dM], [b, dM], [b, 0]);
    pts.push([L, 0], [L, r2(H)], [0, r2(H)], [0, 0]);
    contorno = pts;
  } else contorno = rect(L, r2(H));
  // pliegues sólo en los TRAMOS con ala
  const tramosAla = [];
  {
    let x0 = 0;
    for (const [a, b] of mk) { if (a > x0) tramosAla.push([x0, a]); x0 = b; }
    if (x0 < L) tramosAla.push([x0, L]);
  }
  const pl = [];
  for (const [a, b] of (mk.length ? tramosAla : [[0, L]])) {
    pl.push({ a: [a, r2(alaFlat)], b: [b, r2(alaFlat)], tipo: 'tangente' });
    pl.push({ a: [a, r2(yEje)], b: [b, r2(yEje)], tipo: 'eje' });
    pl.push({ a: [a, r2(alaFlat + BA)], b: [b, r2(alaFlat + BA)], tipo: 'tangente' });
  }
  return {
    contorno,
    cortes: { circles, polys: [] },
    pliegues: pl,
    etiquetas: [{ x: L / 2, y: r2(yEje) + 4, s: `PLEGAR ARRIBA 90° R${r}${mk.length ? ' — ala SEGMENTADA (muescas = paso del lazo de banda)' : ''}` }],
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

// Desarrollo del COSTADO de caja de accionamiento (perfil en C con pestaña):
// dev Y de abajo hacia arriba: pestaña | BA | alma | BA | tira superior.
// Cotas EXTERIORES. Agujeros del alma en coordenadas del EQUIPO (x absoluta,
// z absoluta): la conversión a desarrollo vive AQUÍ, una sola vez — el 3D y
// el láser no pueden divergir porque nacen de la misma lista.
function flatCostadoCaja(Lg, altura, alaW, pestW, t, x0, zTop, holesAlma, holesPestX, material, avisos) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const pest = pestW - (r + t), alma = altura - 2 * (r + t), ala = alaW - (r + t);
  const H = pest + BA + alma + BA + ala;
  const yl = [0, pest, pest + BA, pest + BA + alma, pest + BA + alma + BA, H];
  const pl = [];
  for (const i of [1, 3]) {
    pl.push({ a: [0, r2(yl[i])], b: [Lg, r2(yl[i])], tipo: 'tangente' });
    pl.push({ a: [0, r2((yl[i] + yl[i + 1]) / 2)], b: [Lg, r2((yl[i] + yl[i + 1]) / 2)], tipo: 'eje' });
    pl.push({ a: [0, r2(yl[i + 1])], b: [Lg, r2(yl[i + 1])], tipo: 'tangente' });
  }
  const zBot = zTop - altura;
  const devY = (z) => r2(pest + BA + (z - (zBot + r + t)));
  const circles = [];
  for (const h of holesAlma) circles.push({ c: [r2(h.x - x0), devY(h.z)], r: h.dia / 2 });
  for (const x of holesPestX) circles.push({ c: [r2(x - x0), 12.5], r: 3.5 });
  return {
    contorno: rect(Lg, r2(H)),
    cortes: { circles, polys: [] },
    pliegues: pl,
    etiquetas: [{ x: Lg / 2, y: r2(yl[2] + alma / 2), s: `2 PLIEGUES 90° R${r} — COSTADO EN C (pestaña ${pestW} · alma ${altura} · tira ${alaW})` }],
    pliegueInfo: [1, 2].map(() => ({ ang: 90, r, ba: r2(BA) })),
    t, k: KCH, radio: r, material,
    avisos,
  };
}

// Desarrollo del FONDO con tapa de extremo (1 pliegue): dev X = fondo | BA |
// tapa. Para tapa al INICIO el dev se refleja (xDev = xb − x) para que la
// tapa quede siempre al extremo alto del desarrollo.
function flatFondoTapa(Lf, W, t, tapaAlt, xa, xb, yF0, holes, tapaEn, material, avisos) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const fondo = Lf - (r + t), tapa = tapaAlt - (r + t);
  const Ldev = fondo + BA + tapa;
  const xl = [fondo, fondo + BA];
  const pl = [
    { a: [r2(xl[0]), 0], b: [r2(xl[0]), W], tipo: 'tangente' },
    { a: [r2((xl[0] + xl[1]) / 2), 0], b: [r2((xl[0] + xl[1]) / 2), W], tipo: 'eje' },
    { a: [r2(xl[1]), 0], b: [r2(xl[1]), W], tipo: 'tangente' },
  ];
  const xDev = (x) => r2(tapaEn === 'fin' ? x - xa : xb - x);
  const circles = holes.map(h => ({ c: [xDev(h.x), r2(h.y - yF0)], r: h.dia / 2 }));
  return {
    contorno: rect(r2(Ldev), W),
    cortes: { circles, polys: [] },
    pliegues: pl,
    etiquetas: [{ x: fondo / 2, y: W / 2, s: `1 PLIEGUE 90° R${r} — TAPA DE EXTREMO ${tapaAlt} ARRIBA` }],
    pliegueInfo: [{ ang: 90, r, ba: r2(BA) }],
    t, k: KCH, radio: r, material,
    avisos,
  };
}

// Placa plana sin pliegues (mechas, placas de piso, guardas planas).
function flatPlaca(w, h, t, holes, material, aviso) {
  return {
    contorno: rect(w, h),
    // rosca: se propaga al DXF/_agujeros — un Ø5 sin llamado de rosca llega
    // al taller como agujero liso (hallazgo del panel: los M6 de la mecha)
    cortes: { circles: holes.map(q => ({ c: [q.x, q.y], r: q.dia / 2, ...(q.rosca ? { rosca: q.rosca } : {}) })), polys: [] },
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
  // detalle real de componentes (directriz 12-08: colores incluidos)
  ucf: '#1e6b45',          // fundición VERDE (estilo Asahi/NTN, catálogo)
  rodamiento: '#15181b',   // cara del sello 2RS negra
};

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------
// muñón CON SUS PROCESOS visibles (observación de Sergio 12-08: a los ejes
// les faltaban procesos mecánicos): garganta de salida de rectificado en el
// hombro (anillo rebajado 2,5) y chaflán de montaje 2×45° en la punta
// (anillo Ø−4×2, misma convención que el rodillo de retorno). y0 = cara del
// hombro; dirY = hacia la punta; largo = largo total del muñón.
function munon(f, nombre, xc, zc, y0, dirY, largo) {
  const g = D.garganta, ch = 2;
  f.push(cyl(`Garganta ${g}×0,5 — salida de rectificado (${nombre})`,
    [xc, y0 + (dirY < 0 ? -g : 0), zc], [0, 1, 0], D.jrnDia - 3, g));
  f.push(cyl(`Muñón ${nombre} Ø${D.jrnDia}×${largo}`,
    [xc, y0 + dirY * g + (dirY < 0 ? -(largo - g - ch) : 0), zc], [0, 1, 0], D.jrnDia, largo - g - ch));
  f.push(cyl(`Chaflán 2×45° punta (${nombre})`,
    [xc, y0 + dirY * (largo - ch) + (dirY < 0 ? -ch : 0), zc], [0, 1, 0], D.jrnDia - 2 * ch, ch));
}

function ejeMotriz(xc, zc) {
  // Barra cuadrada 38.1 SAE 1045; muñones Ø30 torneados. Lado motriz = +Y.
  const f = [];
  f.push(box(`Cuadrado ${D.sq}×${D.sq}×${D.sqLen}`, [xc, 0, zc], D.sq, D.sqLen, D.sq));
  munon(f, 'libre', xc, zc, -D.sqLen / 2, -1, D.jrnLibre);
  munon(f, 'motriz', xc, zc, D.sqLen / 2, 1, D.jrnMotriz);
  const zK = zc + D.jrnDia / 2 - D.chaveta.h / 2;
  const yK = D.sqLen / 2 + D.jrnMotriz - D.cuboMotor / 2;
  f.push(box(`Chavetero ${D.chaveta.w}×${D.chaveta.h}×${D.chaveta.l}`, [xc, yK, zK + D.chaveta.h / 2], D.chaveta.w, D.chaveta.l, D.chaveta.h, 'cut'));
  f.push(hole(`Rosca M10×${D.m10}`, [xc, D.sqLen / 2 + D.jrnMotriz, zc], [0, 1, 0], 8.5, D.m10, false));
  return f;
}

function ejeTensor(xc, zc) {
  const f = [];
  f.push(box(`Cuadrado ${D.sq}×${D.sq}×${D.sqLen}`, [xc, 0, zc], D.sq, D.sqLen, D.sq));
  munon(f, 'tensor −Y', xc, zc, -D.sqLen / 2, -1, D.jrnLibre);
  munon(f, 'tensor +Y', xc, zc, D.sqLen / 2, 1, D.jrnLibre);
  return f;
}

function sprocket(xc, yc, zc) {
  // Z-32 MOLDEADO (P158808YF): PD 153.4, OD 154.8, corona 24 de ancho, bore
  // cuadrado 38.4 (flotante +0.4/+0.3), prisionero (grano) M8 en el cubo.
  // DIENTES REPRESENTADOS TAL CUAL SON (directriz Sergio 12-08): 32 dientes
  // redondeados en el PD — paso angular 11,25°, cresta al OD; el diente de
  // sprocket de banda modular es un lóbulo que engancha la bisagra paso 15.
  const { pd, od, ancho, z } = BELT.sprocket;
  const f = [
    cyl(`Corona raíz Ø${r2(pd - 16)}`, [xc, yc - 12, zc], [0, 1, 0], pd - 16, 24),
    cyl('Cuerpo moldeado', [xc, yc - ancho / 2, zc], [0, 1, 0], od - 44, ancho),
    box('Bore cuadrado 38.4', [xc, yc, zc], 38.4, ancho + 4, 38.4, 'cut'),
  ];
  const rD = (pd - 16) / 2 + 0.5;                 // pie del diente sobre la raíz
  for (let i = 0; i < z; i++) {
    const a = (i / z) * 2 * Math.PI;
    const dx = Math.cos(a), dz = Math.sin(a);
    // lóbulo del diente: cilindro Ø8 axial cuya cresta llega al OD
    const rC = od / 2 - 4;                        // centro tal que cresta ≈ OD
    f.push(cyl(`Diente ${i + 1}/32`, [xc + rC * dx, yc - 12, zc + rC * dz], [0, 1, 0], 8, 24));
  }
  return f;
}

function collar(xc, yc, zc) {
  // Collarín de referencia P21703Y 1.5×1.5 in: fija axialmente el sprocket
  // CENTRAL (los demás flotan) — indicación Movex
  return [
    cyl('Collarín P21703Y', [xc, yc - 5, zc], [0, 1, 0], 60, 10),
    box('Bore cuadrado 38.3', [xc, yc, zc], 38.3, 14, 38.3, 'cut'),
  ];
}

// UCF206 al DETALLE desde datos públicos de catálogo (NTN/Asahi UCF206:
// brida cuadrada L=108, entre pernos J=82,6, pernos Ø11,9→M10, altura al eje
// A2=35,7, cubo esférico del inserto UC206 Ø62, collarín con 2 prisioneros
// M6×0,75, grasera 45°) — directriz Sergio 12-08: geometría y colores reales.
function chumaceraUCF(xc, ySide, zc) {
  const s = Math.sign(ySide);
  const yF = ySide + s * 2;
  const f = [
    // cuerpo de fundición: brida cuadrada con esquinas achaflanadas (rombo)
    box('Brida UCF206 108×108×15', [xc, yF + s * 7.5, zc], D.ucf.flange, 15, D.ucf.flange),
    box('Chaflán de esquinas (rombo)', [xc, yF + s * 7.5, zc], D.ucf.flange * 0.72, 15.2, D.ucf.flange * 1.18, 'cut'),
    box('Chaflán de esquinas (rombo) 2', [xc, yF + s * 7.5, zc], D.ucf.flange * 1.18, 15.2, D.ucf.flange * 0.72, 'cut'),
    // caja esférica del inserto + collarín de fijación con prisioneros
    cyl('Caja esférica UC206 Ø62', [xc, yF + s * 4, zc], [0, s, 0], 62, 26),
    cyl('Collarín del inserto Ø55', [xc, yF + s * 30, zc], [0, s, 0], 55, 8),
    cyl('Prisionero M6 (1/2)', [xc + 24, yF + s * 33, zc + 8], [1, 0, 0.33], 5, 6),
    cyl('Prisionero M6 (2/2)', [xc - 24, yF + s * 33, zc - 8], [-1, 0, -0.33], 5, 6),
    // grasera a 45° en el cuerpo
    cyl('Grasera DIN 71412 45°', [xc, yF + s * 10, zc + 33], [0, s * 0.7, 0.7], 6, 9),
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
  const xDrv = L - D.xMotrizDesdePunta;
  const xTen = D.xTensorDesdePunta, zTen = D.zTensor;   // solo LBP (GT Rev.E: un solo eje)
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
    holesAlma.push({ x: r2(q.c[0]), dz: r2(D.plTop - q.c[1]), dia: D.retPernoPas, rol: 'retorno',
      nombre: `Paso perno M${D.retPernoM} eje muerto retorno` });
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
      { rol: 'tensor', x0: xTen + 45 - 160, x1: xTen + 45 + 160, ejes: [{ x: xTen, z: zTen }] },
    ]
    // GT Rev.E (un solo eje): mecha de motriz igual a la del LBP.
    : [{ rol: 'motriz', x0: xDrv - 45 - 160, x1: xDrv - 45 + 160, ejes: [{ x: xDrv, z: D.zMotriz }] }];
  // Montaje faldón→mecha: donde las pestañas no tienen tramo libre (tensor y
  // GT: la mecha ocupa el plano del ala), la guarda se aperna POR EL FALDÓN a
  // la mecha con M6 ROSCADO en la PL8 (2 columnas × 2 filas por mecha, lejos
  // de la grilla UCF). Comparten coordenadas: no pueden desalinearse.
  for (const m of mechasSpec) {
    const zBot = Math.min(...m.ejes.map(e => e.z)) - 110;
    const rows = [-250, -350].filter(z => z > zBot + 30 && z < -210);
    m.mounts = [];
    // ±50 del borde de mecha (era ±55): a ±55 el separador Ø12 del montaje de
    // guarda quedaba TANGENTE al canto de la brida UCF206 (x 4940 vs cara
    // 4934: luz 6 − r6 = 0). A ±50 la luz es 5 y el roscado conserva 50 al
    // borde de la mecha.
    for (const x of [m.x0 + 50, m.x1 - 50]) for (const z of rows) m.mounts.push({ x: r2(x), z });
  }
  // GT Rev.F: la caja de accionamiento arranca en x 610 (la tira telescópica
  // de la pata 2 cruza el plano del fondo hasta x 599, y es AJUSTABLE) y la
  // columna de separadores de x 530 quedaría fuera de la caja. Los 4 roscados
  // M6 de guarda de la mecha GT se recolocan a x 660/735 · z −250/−330,
  // verificados contra los M10 de la propia mecha (515/755 × −113/−183/−253)
  // y los pernos de chumacera (638,7/721,3 × −359/−441): pared mínima 11,9.
  if (!esLBP) mechasSpec[0].mounts = [660, 735].flatMap(x => [-250, -330].map(z => ({ x, z })));

  // ---- CAJAS DE ACCIONAMIENTO (Rev.F — reemplazan a las artesas) ----
  // El perfil MEDIDO del lazo (17-08) desmontó la artesa corrida de Rev.E.1:
  // fuera de las envolturas la banda nunca baja de −274 y viaja DENTRO de las
  // placas (fondo −293) — la artesa motriz cuidaba aire, sus faldones
  // atravesaban la brida de las seis chumaceras (D-07) y las columnas de
  // soporte perforaban su fondo (LBP pata 4300, GT patas 150 y 382). Lo
  // profundo real: el tensor (sag −421 en x 150..450) y las envolturas
  // motrices (−481). Cada zona lleva su CAJA: dos costados en C colgados de
  // los roscados M6 de la mecha con SEPARADORES (la fijación queda unida a la
  // máquina: ISO 14120 §5.19), tira superior que sella contra la cara de la
  // mecha, y fondo con tapa de extremo plegada. Los costados van POR FUERA de
  // chumaceras y puntas de eje (D-05 y D-07 cerradas); el costado motor pasa
  // entre la chumacera (287) y el cuerpo del reductor (311) con paso Ø70
  // ajustado al cubo Ø62 — anillo de 4 mm: ISO 13857 e≤4 → s≥2, cumple.
  const tCaja = 2, topCaja = -230, pestCaja = 27;
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
  // tramos del ala ENTRE las ventanas del lazo (fuente única: también los
  // usan las placas 3D y la compuerta de asiento del bracket Rev.D)
  const alaSegs = (() => {
    let tr = [[0, L]];
    for (const [m0, m1] of muescasAuto) {
      tr = tr.flatMap(([a, b]) => {
        const out = [];
        if (m0 > a) out.push([a, Math.min(m0, b)]);
        if (m1 < b) out.push([Math.max(m1, a), b]);
        return out;
      });
    }
    return tr.filter(([a, b]) => b - a >= 30).map(([a, b]) => [r2(a), r2(b)]);
  })();
  if (process.env.DBG_ALA) console.log('DBG', esLBP?'LBP':'GT', 'muescas', JSON.stringify(muescasAuto.map(m=>m.map(r2))), 'segs', JSON.stringify(alaSegs));
  // La caja motriz cubre desde antes de la bajada al snub hasta 3 tras la
  // placa (la tapa cierra fuera de la barrida de la envoltura: 4957 en LBP,
  // 757 en GT). El fondo motriz a −560 libra el brazo de torque (−540) y el
  // tensor a −465 deja 44 a la sag medida (−421, compuerta exige ≥40).
  const cajas = [{
    tag: 'motriz', xa: esLBP ? 4645 : 610, xb: L + 3, fondoZ: -560,
    yn: -314, yp: 300, tapa: 'fin',
    hub: { x: xDrv, z: D.zMotriz, dia: 70 },
    grasa: [{ s: -1, x: xDrv, z: -361 }],
    puerto: [{ s: 1, x: xDrv, z: -480 }],
  }];
  if (esLBP) cajas.push({
    tag: 'tensor', xa: -3, xb: 614, fondoZ: -465,
    yn: -314, yp: 314, tapa: 'inicio',
    grasa: [{ s: -1, x: xTen, z: -301 }, { s: 1, x: xTen, z: -301 }],
    puerto: [],
  });
  // M6 por TRAMO de pestaña (entre muescas): ≥1 por tramo ≥80, a 40 de cada
  // borde y relleno cada ≤400 — así ninguna guarda queda sin fijación.
  const holesAla = [];
  // soportes a piso Rev.D: definidos ANTES de las guardas — el ala horizontal
  // del bracket B_005A ocupa la cara inferior del ala en [x±101,5] y la
  // pestaña de la guarda debe abrirse ahí (misma mecánica que las mechas).
  // La posición NOMINAL se ajusta al tramo de ala ÍNTEGRO más cercano (el
  // bracket aperna al ala: no puede caer sobre una muesca del lazo).
  const brkSemiancho = D.sop24.brk.w / 2;
  const snapPata = (p) => {
    const semi = brkSemiancho + 2;   // +2 de holgura de corte; los barrenos los vigila la compuerta de margen
    let mejor = null;
    for (const [a, b] of alaSegs) {
      if (b - a < 2 * semi) continue;
      const x = Math.max(a + semi, Math.min(b - semi, p));
      if (!mejor || Math.abs(x - p) < Math.abs(mejor - p)) mejor = x;
    }
    return r2(mejor ?? p);       // sin tramo posible: la compuerta lo reporta
  };
  // GT Rev.E: DOS estaciones (una sola no es estable — directriz Sergio 13-08);
  // snapPata las asienta en el tramo de ala íntegro que deja el lazo sin tensor.
  const patasX = (esLBP ? [700, L / 2, L - 700] : [150, 520]).map(snapPata);
  for (const K of cajas) {
    K.mounts = (mechasSpec.find(m => m.rol === K.tag) || mechasSpec[0]).mounts;
  }

  // ---- POSICIONES de la estructura transversal Rev.C (sistema 24V) ----
  // Se calculan AQUÍ (antes de las placas: las placas llevan los agujeros de
  // las orejas del TR_S, de los clips del portacarril y del bracket B_005A).
  const segRect0 = (a, b, x0, x1, z0, z1) => {
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
  const lazoOcupa = (x0, x1, z0, z1) => {
    for (const cara of [outer, inner]) {
      for (let i = 0; i < cara.length; i++) {
        if (segRect0(cara[i], cara[(i + 1) % cara.length], x0, x1, z0, z1)) return true;
      }
    }
    return false;
  };
  const posicionesLibres = (paso, halfW, z0, z1, margen = 150) => {
    const xs = [];
    for (let x = paso / 2; x < L; x += paso) {
      let xt = null;
      for (const dx of [0, -200, 200, -300, 300]) {
        const c = x + dx;
        if (c < margen || c > L - margen) continue;
        if (!lazoOcupa(c - halfW - 10, c + halfW + 10, z0, z1)) { xt = r2(c); break; }
      }
      if (xt === null) console.warn(`  ! elemento transversal en x=${x} omitido (lazo ocupa la ventana z ${z0}..${z1})`);
      else xs.push(xt);
    }
    return xs;
  };
  const pasoT = esLBP ? D.pasoTravLBP : D.pasoTravFT;
  const TT = D.travTR, PC = D.portacarril;
  // portacarril plano 50×6 con su cara superior tocando la cara inferior de la
  // pletina del carril (cerraba el vacío «pletina flotante» del panel)
  const zPCtop = r2(zci - D.barCap.h - D.pletina.h + 6);
  const xsPC = posicionesLibres(pasoT, PC.w / 2, zPCtop - PC.t - 4, zPCtop + 4);
  // TR_S en la zona BAJA del canal: bajo el retorno (−147) y sobre el fondo
  const zTRtop = -160;
  const xsTrav = posicionesLibres(pasoT, TT.w / 2, zTRtop - TT.h - 6, zTRtop + 6);
  // agujeros ESTRUCTURALES del alma (apernado 24V): orejas TR_S y clips del
  // portacarril — entran al desarrollo y al 3D por holesAlma, con nombre
  // propio para que el BOM cuente cada perno real
  for (const x of xsTrav) {
    for (const dz of [r2(D.plTop - (zTRtop - 15)), r2(D.plTop - (zTRtop - 15 - TT.tabHoleSep))]) {
      holesAlma.push({ x, dz, dia: TT.holeDia, rol: 'trav', nombre: 'Paso M6 oreja travesaño TR' });
    }
  }
  for (const x of xsPC) {
    for (const dx of [-12, 12]) {
      holesAlma.push({ x: r2(x + dx), dz: r2(D.plTop - (zPCtop - PC.t - 14)), dia: 7, rol: 'clip', nombre: 'Paso M6 clip portacarril' });
    }
  }
  // Rev.D: el bracket B_005A ya NO aperna al alma — su ala horizontal aperna
  // POR DEBAJO del ala inferior del canal: 4×Ø9 por estación EN EL ALA, a la
  // Y del centro del cruciforme (16,65 del borde libre del ala = measured)
  // 14,5 del borde libre (era 16,65 = centro del cruciforme measured): a 16,65
  // el Ø9 entraba 1,15 en la ZONA DE PLEGADO del ala de 1½ in. El ala NO se
  // ensancha (38,1 es el idioma del sistema 24 V — directriz Sergio 13-08) y
  // el bracket measured tampoco cambia: la RANURA CRUCIFORME 32×19 del
  // B_005A absorbe los 2,15 de corrimiento, que es para lo que existe.
  const yBrkAla = r2(yIn + D.plT - D.alaAncho + D.sop24.brk.cruzDesdeBorde);
  for (const x of patasX) {
    for (const du of D.sop24.brk.cruzOffs) {
      holesAla.push({ x: r2(x + du), yDev: D.sop24.brk.cruzDesdeBorde, dia: 9,
        yAbs: yBrkAla, nombre: 'Paso M8 bracket soporte' });
    }
  }
  // Rev.C: pasos del alma que NACEN en piezas construidas después (mecha
  // apernada 6×M10 y clips del cabezal) — la posición se decide AQUÍ, antes
  // de las placas, para que 3D y desarrollo lleven el agujero; las piezas
  // reutilizan estas mismas listas (un solo origen, compuerta 1:1 en el BOM).
  const NB = { cuerpoH: 65, cuerpoT: 19, K: 152.4, cols: [15.9, 75.9, 135.9], fila1: 18.75, fila2: 37.8, holeDia: 8.5 };
  // cabH 55 (era 90): la placa terminaba a −103 y el tramo libre del retorno
  // la cruzaba en AMBOS equipos (hallazgo Sergio 13-08, compuerta
  // lazo↔cabezal). A 55 la placa termina sobre la línea del retorno y las dos
  // filas M8 del nosebar conservan margen ≥ max(1×Ø, 2×t) al borde inferior.
  const cabH = 55, cabTop = zci - 3;   // 1,25 de luz a la barrida de rodillos
  // filas a paso 70 (no 80): la fila honda debe librar el borde de las
  // muescas del ala, que a esas X sube ~12 dentro del alma (compuerta margen)
  const mechaBoltXZ = mechasSpec.flatMap(m =>
    [m.x0 + 40, m.x1 - 40].flatMap(xb =>
      [mechaTop - 25, mechaTop - 95, mechaTop - 165].map(zb => ({ x: r2(xb), z: r2(zb) }))));
  for (const q of mechaBoltXZ) {
    holesAlma.push({ x: q.x, dz: r2(D.plTop - q.z), dia: 11, rol: 'mecha', nombre: 'Paso M10 mecha' });
  }
  const cabClipXZ = [BELT.noseR + BELT.esp, L - BELT.noseR - BELT.esp].flatMap(x0 => {
    const dirIn = x0 < L / 2 ? 1 : -1;
    return [12, 36].map(dzc => ({ x: r2(x0 + dirIn * (2 + NB.cuerpoT + 3) + dirIn * 12), z: r2(cabTop - cabH + dzc) }));
  });
  for (const q of cabClipXZ) {
    holesAlma.push({ x: q.x, dz: r2(D.plTop - q.z), dia: 7, rol: 'cab', nombre: 'Paso M6 cabezal' });
  }

  // tramos del ala ENTRE las ventanas del lazo (misma lista muescasAuto que
  // recorta las pestañas de la guarda: guardas y ala quedan consistentes;
  // alaSegs viene de ARRIBA — misma fuente que la compuerta del bracket)
  for (const s of [-1, 1]) {
    const y = s * (yIn + D.plT / 2);
    const nm = s > 0 ? 'motriz (+Y)' : 'libre (−Y)';
    const f = [
      box(`Alma ${L}×${D.plAlto}`, [L / 2, y, D.plTop - D.plAlto / 2], L, D.plT, D.plAlto),
    ];
    for (const [a, b] of alaSegs) {
      f.push(box(`Ala inferior tramo ${a}–${b}`, [(a + b) / 2, y + (s > 0 ? -1 : 1) * (D.alaAncho / 2 - D.plT / 2), D.plTop - D.plAlto + D.plT / 2], b - a, D.alaAncho, D.plT));
    }
    for (const h of holesAlma) {
      f.push(hole(h.nombre || `Paso perno M${D.retPernoM} eje muerto retorno`, [h.x, y, D.plTop - h.dz], [0, s, 0], h.dia, 0, true));
    }
    for (const h of holesAla) {
      f.push(hole(h.nombre || 'Paso en ala', [h.x, s * h.yAbs, zAlaTop - D.plT / 2], [0, 0, 1], h.dia, 0, true));
    }
    addPart(`FAB · Placa lateral ${nm} PL6 L=${L}`, C.placa, [L / 2, y, D.plTop], f, {
      flat: flatPlacaConAla(L, D.plAlto, D.alaAncho, D.plT, holesAlma,
        'Acero S275JR PL6 — terminación PINTADO RAL 7035 (decisión Sergio 12-08)',
        'MECHAS PORTA-CHUMACERA APERNADAS 6×M10 (Rev.C — ver plano de mecha)', holesAla, muescasAuto),
    });
  }

  // ---- piezas de las cajas de accionamiento (Rev.F) ----
  // Costado en C por lado (pestaña 27 · alma · tira superior hasta la cara de
  // la mecha) + fondo con tapa de extremo. Fijación: separadores torneados
  // Ø12 sobre los roscados M6 de la mecha — el perno queda unido a la máquina
  // al desmontar (ISO 14120 §5.19). Puertos de grasera Ø25 SIEMPRE con ojal
  // ciego (ISO 13857: e=25 → s≥120, y la punta de eje gira a 10 del plano);
  // el lado motor engrasa por manguera de extensión M6×1 al puerto Ø8 bajo.
  for (const K of cajas) {
    const Lg = r2(K.xb - K.xa), xm = (K.xa + K.xb) / 2;
    const altura = r2(topCaja - K.fondoZ);
    const pestHolesX = [K.xa + 60, xm, K.xb - 60].map(r2);
    for (const s of [-1, 1]) {
      const yIn0 = s < 0 ? K.yn : K.yp;          // cara interior del alma
      const yExt = yIn0 + s * tCaja;             // cara exterior
      const alaW = r2(Math.abs(yExt) - 249);     // tira superior hasta la mecha
      const yPest = yExt - s * (pestCaja / 2);   // centro de pestaña de fondo
      const yM6 = s * (Math.abs(yExt) - 14.5);   // M6 pestaña↔fondo (12,5 del borde libre)
      const f = [
        box('Tira superior', [xm, s * (249 + alaW / 2), topCaja - tCaja / 2], Lg, alaW, tCaja),
        box('Alma', [xm, yIn0 + s * tCaja / 2, (topCaja + K.fondoZ) / 2], Lg, tCaja, altura),
        box('Pestaña de fondo', [xm, yPest, K.fondoZ + tCaja / 2], Lg, pestCaja, tCaja),
      ];
      const hAlma = [];
      for (const q of K.mounts) {
        hAlma.push({ x: q.x, z: q.z, dia: 7 });
        f.push(hole('Paso M6 separador a mecha', [q.x, yIn0 + s * tCaja / 2, q.z], [0, s, 0], 7, 0, true));
      }
      for (const g of K.grasa) if (g.s === s) {
        hAlma.push({ x: g.x, z: g.z, dia: 25 });
        f.push(hole('Puerto de grasera Ø25 (ojal ciego OBLIGATORIO)', [g.x, yIn0 + s * tCaja / 2, g.z], [0, s, 0], 25, 0, true));
      }
      for (const g of K.puerto) if (g.s === s) {
        hAlma.push({ x: g.x, z: g.z, dia: 8 });
        f.push(hole('Puerto Ø8 extensión de grasera', [g.x, yIn0 + s * tCaja / 2, g.z], [0, s, 0], 8, 0, true));
      }
      if (K.hub && s > 0) {
        hAlma.push({ x: K.hub.x, z: K.hub.z, dia: K.hub.dia });
        f.push(hole(`Paso cubo reductor Ø${K.hub.dia}`, [K.hub.x, yIn0 + s * tCaja / 2, K.hub.z], [0, s, 0], K.hub.dia, 0, true));
      }
      for (const x of pestHolesX) f.push(hole('M6 pestaña a fondo', [x, yM6, K.fondoZ + tCaja / 2], [0, 0, 1], 7, 0, true));
      const lado = K.hub ? (s > 0 ? 'motor' : 'libre') : 'lateral';
      addPart(`FAB · Guarda ${K.tag} — costado ${lado} e${tCaja} (${Lg}×${altura})`, C.guarda,
        [xm, yExt, (topCaja + K.fondoZ) / 2], f, {
          flat: flatCostadoCaja(Lg, altura, alaW, pestCaja, tCaja, K.xa, topCaja, hAlma, pestHolesX,
            'Acero S275JR e2.0 — terminación PINTADO RAL 7035',
            ['MONTA EN ESPÁRRAGOS M6 FIJOS EN LA MECHA + SEPARADOR Ø12 + TUERCA CIEGA — el fijador queda en la máquina (ISO 14120 §5.19)',
             ...(hAlma.some(h => h.dia === 25) ? ['PUERTO Ø25: OJAL CIEGO OBLIGATORIO — se retira solo para engrasar'] : []),
             ...(hAlma.some(h => h.dia === 8) ? ['PUERTO Ø8: manguera de extensión de grasera M6×1 (el niple queda dentro)'] : [])]),
        });
    }
    // fondo con tapa de extremo plegada (misma pieza, 1 pliegue)
    const yF0 = K.yn + 1, yF1 = K.yp - 1, WF = r2(yF1 - yF0), yFc = (yF0 + yF1) / 2;
    const enFin = K.tapa === 'fin';
    const xF0 = K.xa + (enFin ? 0 : tCaja), xF1 = K.xb - (enFin ? tCaja : 0);
    const xTapa = enFin ? K.xb - tCaja / 2 : K.xa + tCaja / 2;
    const fF = [
      box('Fondo', [(xF0 + xF1) / 2, yFc, K.fondoZ + tCaja / 2], r2(xF1 - xF0), WF, tCaja),
      box('Tapa de extremo', [xTapa, yFc, (topCaja + K.fondoZ) / 2], tCaja, WF, altura),
    ];
    const hFondo = [];
    for (const s of [-1, 1]) {
      const yM6 = s * (Math.abs((s < 0 ? K.yn : K.yp) + s * tCaja) - 14.5);
      for (const x of pestHolesX) {
        hFondo.push({ x, y: yM6, dia: 7 });
        fF.push(hole('M6 a pestaña de costado', [x, yM6, K.fondoZ + tCaja / 2], [0, 0, 1], 7, 0, true));
      }
    }
    for (let x = K.xa + 80; x <= K.xb - 80; x += 300) {
      hFondo.push({ x: r2(x), y: 0, dia: 8 });
      fF.push(hole('Drenaje Ø8', [r2(x), 0, K.fondoZ + tCaja / 2], [0, 0, 1], 8, 0, true));
    }
    addPart(`FAB · Guarda ${K.tag} — fondo con tapa e${tCaja} (${r2(xF1 - xF0)}×${WF})`, C.guarda,
      [(xF0 + xF1) / 2, yFc, K.fondoZ], fF, {
        flat: flatFondoTapa(Lg, WF, tCaja, altura, K.xa, K.xb, yF0, hFondo, K.tapa,
          'Acero S275JR e2.0 — terminación PINTADO RAL 7035',
          ['MONTA M6 BAJO LAS PESTAÑAS DE LOS COSTADOS — desmontable para mantención']),
      });
    // separadores torneados (uno por roscado, por lado) + ojales de puerto
    for (const s of [-1, 1]) {
      const len = r2(Math.abs(s < 0 ? K.yn : K.yp) - 249);
      for (const q of K.mounts) {
        addPart(`NORM · Separador guarda Ø12×${len} (pasada Ø6,4, torneado)`, C.chum,
          [q.x, s * 249, q.z], [cyl(`Separador Ø12×${len}`, [q.x, s * 249, q.z], [0, s, 0], 12, len)]);
      }
    }
    for (const g of K.grasa) {
      addPart('NORM · Ojal ciego Ø25 EPDM (tapón de puerto de grasera)', C.goma,
        [g.x, g.s * (Math.abs(g.s < 0 ? K.yn : K.yp) + tCaja), g.z],
        [cyl('Ojal Ø28×5', [g.x, g.s * (Math.abs(g.s < 0 ? K.yn : K.yp) + tCaja), g.z], [0, g.s, 0], 28, 5)]);
    }
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
        holes.push({ x: r2(q.x - m.x0), y: r2(q.z - zBot), dia: 5, rosca: 'M6' });
        f.push(hole('M6 roscado (montaje guarda)', [q.x, y, q.z], [0, s, 0], 5, 0, true));
      }
      // Rev.C: mecha APERNADA a la placa (6×M10) — la soldadura queda solo
      // para piezas pequeñas y soportes (directriz). Las posiciones viven en
      // mechaBoltXZ (calculadas ANTES de las placas: un solo origen).
      for (const q of mechaBoltXZ) {
        if (q.x <= m.x0 || q.x >= m.x1) continue;
        holes.push({ x: r2(q.x - m.x0), y: r2(q.z - zBot), dia: 11 });
        f.push(hole('Paso M10 mecha a placa', [q.x, y, q.z], [0, s, 0], 11, 0, true));
      }
      // pasos para los M8 del alma que caen dentro de la huella de la mecha
      // (en el GT el eje muerto del retorno atraviesa placa + mecha) — SOLO
      // los del retorno: los demás roles tienen su propio agujero en la pieza
      for (const h of holesAlma) {
        if (h.rol !== 'retorno') continue;
        const z = D.plTop - h.dz;
        if (h.x > m.x0 && h.x < m.x1 && z > zBot && z < mechaTop) {
          holes.push({ x: r2(h.x - m.x0), y: r2(z - zBot), dia: h.dia });
          f.push(hole(`Paso M${D.retPernoM} retorno (a través de mecha)`, [h.x, y, z], [0, s, 0], h.dia, 0, true));
        }
      }
      addPart(`FAB · Mecha porta-chumacera PL8 ${m.rol} ${w}×${hM}`, C.placa, [(m.x0 + m.x1) / 2, y, zBot + hM / 2], f, {
        flat: flatPlaca(w, hM, 8, holes, 'Acero S275JR PL8 — PINTADO RAL 7035',
          'APERNADA 6×M10 A CARA EXTERIOR DEL ALMA (Rev.C — sin soldadura); escariar Ø40 del muñón tras pintura'),
      });
    }
  }

  // ---- ESTRUCTURA TRANSVERSAL Rev.C: sistema 24V APERNADO ----
  // (dims MEASURED de ZP2026_MDR.glb, 12-08 — «mismos travesaños del equipo
  // 24V, cambiar largo si es necesario; todo apernado; soldar solo piezas
  // pequeñas y soportes a piso» — directriz Sergio)
  //
  // (a) PORTACARRIL plano 50×6 bajo las pletinas del carril: clips ángulo
  //     30×30×3×40 SOLDADOS a sus extremos (pieza pequeña) y APERNADOS 2×M6
  //     al alma; la pletina del carril se aperna M6 al portacarril en cada
  //     cruce (cierra el vacío «pletina flotante 9 mm» del panel).
  const wearPre = esLBP ? D.wearLBP : D.wearGT;
  const spanWpre = BELT.ancho - 40;
  for (const x of xsPC) {
    const f = [
      box(`Pletina portacarril ${PC.w}×${PC.t}`, [x, 0, zPCtop - PC.t / 2], PC.w, D.innerW - 2 * PC.clip.t - 2, PC.t),
    ];
    for (const sd of [-1, 1]) {
      const yClip = sd * (D.innerW / 2 - PC.clip.t / 2 - 0.5);
      // clip: ala vertical contra el alma + ala horizontal soldada al portacarril
      f.push(box('Clip ángulo ala vertical (soldado al portacarril)', [x, yClip, zPCtop - PC.t - PC.clip.largo / 2 + 6], PC.clip.largo, PC.clip.t, PC.clip.largo));
      f.push(box('Clip ángulo ala horizontal', [x, yClip - sd * (PC.clip.lado / 2), zPCtop - PC.t - PC.clip.t / 2], PC.clip.largo, PC.clip.lado, PC.clip.t));
      for (const dx of [-12, 12]) {
        f.push(hole('Paso M6 clip a alma', [x + dx, yClip, zPCtop - PC.t - 14], [0, sd, 0], 7, 0, true));
      }
    }
    // roscados M6 del carril: la pletina de canto (12) se rosca; el perno
    // entra desde ABAJO a través del portacarril — un paso por carril
    for (let i = 0; i < wearPre.n; i++) {
      const yw = -spanWpre / 2 + (i + 0.5) * spanWpre / wearPre.n;
      f.push(hole('Paso M6 a pletina carril', [x, yw, zPCtop - PC.t], [0, 0, 1], 7, 0, true));
    }
    addPart('FAB · Portacarril 50×6 con clips (apernado M6 al alma)', C.trav, [x, 0, zPCtop - PC.t / 2], f, {
      flat: flatPlaca(D.innerW - 2 * PC.clip.t - 2, PC.w, PC.t,
        Array.from({ length: wearPre.n }, (_, i) => ({ x: r2(D.innerW / 2 - PC.clip.t - 1 + (-spanWpre / 2 + (i + 0.5) * spanWpre / wearPre.n)), y: PC.w / 2, dia: 7 })),
        'Acero S275JR e6 — PINTADO RAL 7035',
        'CLIPS ángulo 30×30×3×40 SOLDADOS en extremos (2 cordones 25×3); conjunto APERNADO 2×M6 por lado al alma'),
    });
  }

  // (b) TRAVESAÑO TR_S: C 88×88×3 con OREJAS 120×60×4 soldadas (pieza
  //     pequeña) y apernadas 2×M6 por extremo al alma — zona baja del canal.
  const TRlargo = r2(D.innerW - 2 * TT.tabT - 2);
  for (const x of xsTrav) {
    const f = [
      box('Alma superior C88', [x, 0, zTRtop - TT.t / 2], TT.w, TRlargo, TT.t),
      box('Ala +X C88', [x + TT.w / 2 - TT.t / 2, 0, zTRtop - TT.h / 2], TT.t, TRlargo, TT.h),
      box('Ala −X C88', [x - TT.w / 2 + TT.t / 2, 0, zTRtop - TT.h / 2], TT.t, TRlargo, TT.h),
    ];
    for (const sd of [-1, 1]) {
      const yTab = sd * (D.innerW / 2 - TT.tabT / 2 - 0.5);
      f.push(box('Oreja de extremo 120×60×4 (soldada)', [x, yTab, zTRtop - 15 - TT.tabHoleSep / 2], TT.tabW, TT.tabT, TT.tabH + TT.tabHoleSep - 30));
      for (const dzt of [15, 15 + TT.tabHoleSep]) {
        f.push(hole('Paso M6 oreja a alma', [x, yTab, zTRtop - dzt], [0, sd, 0], TT.holeDia, 0, true));
      }
    }
    addPart(`FAB · Travesaño TR_S 24V — C 88×88×3, orejas apernadas (L=${TRlargo})`, C.trav, [x, 0, zTRtop - TT.h / 2], f, {
      flat: flatPerfilC(TRlargo, TT.w, TT.h, TT.t,
        'Acero S275JR e3 — plegado C 88×88 (perfil TR_S del ZP2026), PINTADO RAL 7035. OREJAS 120×60×4 soldadas en extremos; conjunto APERNADO 2×M6 por extremo'),
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
  const nbHoles = [];   // {y, dz} — y mundo; dz bajo el tope del nosebar (NB hoisted junto a holesAlma)
  for (let seg = 0; seg < 3; seg++) {
    const y0 = -BELT.ancho / 2 + seg * NB.K;
    for (const c of NB.cols) for (const dz of [NB.fila1, NB.fila2]) {
      nbHoles.push({ y: r2(y0 + c), dz });
    }
  }
  const art = esLBP ? BELT.noseArtLBP : BELT.noseArtGT;
  const cabChk = {};   // rectángulo de cada placa de cabezal → compuerta lazo↔cabezal
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
    // el concepto IDLER=acumulación es EXCLUSIVO del nosebar LBP (22868);
    // el 22862 del GT es transfer plate estándar «LBP version excluded»
    // (catálogo imperial p.227) — el panel encontró el texto LBP aplicado al GT
    addPart(esLBP
      ? `NORM · Nosebar ${nm} 18 in (3× K6 in, montaje IDLER=acumulación) — ${art}`
      : `NORM · Nosebar ${nm} 18 in (3× K6 in, transfer plate c/rodamientos) — ${art}`,
      C.nose, [x0, 0, zN], fN);

    // Cabezal porta-nosebar (FAB): recibe los 18 M8 del nosebar
    const xc = x0 + dirIn * (2 + NB.cuerpoT + 3);
    cabChk[nm] = { x0: r2(xc - D.plT / 2), x1: r2(xc + D.plT / 2), zTop: r2(cabTop), zBot: r2(cabTop - cabH),
      nose: [x0, zci - BELT.noseR],
      // cuerpo BluLub (caja sustituta del perfil moldeado): la banda de
      // retorno PUEDE tocar su cara inferior — es la guía de retorno del
      // fabricante. El perfil real va relevado (ver Abiertas: sección P22868).
      cuerpo: { bx0: r2(Math.min(x0 + dirIn * 2, x0 + dirIn * (2 + NB.cuerpoT))), bx1: r2(Math.max(x0 + dirIn * 2, x0 + dirIn * (2 + NB.cuerpoT))), bzBot: r2(zci - NB.cuerpoH), bzTop: r2(zci) } };
    const fC = [box(`Placa cabezal PL6 ${D.innerW}×${cabH}`, [xc, 0, cabTop - cabH / 2], D.plT, D.innerW, cabH)];
    const holesCab = [];
    for (const h of nbHoles) {
      fC.push(hole('Paso M8 nosebar', [xc, h.y, zci - h.dz], [dirIn, 0, 0], 9, 0, true));
      holesCab.push({ x: r2(h.y + D.innerW / 2), y: r2((zci - h.dz) - (cabTop - cabH)), dia: 9 });
    }
    // Rev.C: cabezal APERNADO — clips ángulo 40×40×4×60 soldados a sus
    // extremos (pieza pequeña) y apernados 2×M6 a cada placa
    for (const sd of [-1, 1]) {
      const yTab = sd * (D.innerW / 2 - 2 - 2);
      fC.push(box('Clip ángulo cabezal (soldado)', [xc + dirIn * 12, yTab, cabTop - cabH + 24], 4, 60, 48));
      for (const dzc of [12, 36]) {
        // paso correspondiente del alma: en cabClipXZ (hoisted, un solo origen)
        fC.push(hole('Paso M6 clip cabezal', [xc + dirIn * 12, yTab, cabTop - cabH + dzc], [0, sd, 0], 7, 0, true));
      }
    }
    addPart(`FAB · Cabezal porta-nosebar ${nm} PL6 ${D.innerW}×${cabH}`, C.placa, [xc, 0, cabTop - cabH / 2], fC, {
      flat: flatPlaca(D.innerW, cabH, D.plT, holesCab, 'Acero S275JR PL6 — PINTADO RAL 7035',
        'GRILLA = 6×Ø9 POR SEGMENTO DE NOSEBAR (Movex 22868: cols 15.9/75.9/135.9 · filas 18.75/+19.05). APERNADO 2×M6 por extremo vía clips soldados — tuercas M8 del nosebar por cara interior'),
    });
  }

  // ---- Retorno: RODILLOS de eje muerto (decisión usuario, cotización):
  // tubo Ø63.5 con 2 rodamientos SELLADOS 6202-2RS insertos en los extremos;
  // eje muerto Ø15 perforado+roscado M8 en ambas caras → PERNO HEXAGONAL M8
  // + golilla POR FUERA de la placa (misma solución del transfer90 con M10)
  for (const q of path) {
    if (q.rol !== 'ret' && q.rol !== 'snub') continue;
    const f = [
      cyl(`Tubo Ø${D.gtRetDia} (cabezales insertos)`, [q.c[0], -D.sqLen / 2 + 2, q.c[1]], [0, 1, 0], D.gtRetDia, D.sqLen - 4),
      cyl('Chaflán 2×45° extremo −Y', [q.c[0], -D.sqLen / 2, q.c[1]], [0, 1, 0], D.gtRetDia - 4, 2),
      cyl('Chaflán 2×45° extremo +Y', [q.c[0], D.sqLen / 2 - 2, q.c[1]], [0, 1, 0], D.gtRetDia - 4, 2),
      cyl(`Eje muerto Ø${D.retEjeDia} (roscado M${D.retPernoM} int., chaflán 1×45°)`, [q.c[0], -D.innerW / 2, q.c[1]], [0, 1, 0], D.retEjeDia, D.innerW),
    ];
    for (const sd of [-1, 1]) {
      f.push(cyl(`Perno hex M${D.retPernoM} + golilla (por fuera)`, [q.c[0], sd * (D.innerW / 2 + D.plT), q.c[1]], [0, sd, 0], 13, 6));
    }
    addPart(`FAB · Rodillo retorno Ø${D.gtRetDia} — tubo A513 Ø63,5×3,0 + 2 cabezales torneados asiento Ø35 H7 + seeger DIN 472-35 · eje muerto Ø15 SAE1045 roscado M${D.retPernoM} — plano LBP530-EJ-04`,
      C.ret, [q.c[0], 0, q.c[1]], f);
    for (const sd of [-1, 1]) {
      addPart('NORM · Rodamiento 6202-2RS (15×35×11) sellado', C.rodamiento,
        [q.c[0], sd * (D.sqLen / 2 - 5.5), q.c[1]], [
          cyl('Aro exterior + sello 2RS', [q.c[0], sd * (D.sqLen / 2 - 11), q.c[1]], [0, sd, 0], 34.5, 11),
        ]);
    }
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
    addPart('NORM · Chumacera UCF206 Ø30', C.ucf, [xDrv, s * (yOut + 8), D.zMotriz], chumaceraUCF(xDrv, s * (yOut + 8), D.zMotriz));
  }
  const yM = yOut + 30;
  addPart('NORM · Motorreductor NMRV-P 075 FA 1/30 PAM 80B14 eje hueco Ø30 H8 + motor 0,55 kW 80A-4 (46 rpm · 89 Nm · fs 2,8) + brazo de torque', C.motor, [xDrv, yM + D.motor.cuerpo[1] / 2, D.zMotriz], [
    cyl(`Cubo hueco Ø${D.motor.boss}`, [xDrv, yM - 10, D.zMotriz], [0, 1, 0], D.motor.boss, D.motor.bossL),
    box('Cuerpo reductor', [xDrv, yM + D.motor.cuerpo[1] / 2 + 40, D.zMotriz], D.motor.cuerpo[0], D.motor.cuerpo[1], D.motor.cuerpo[2]),
    box('Brazo de torque', [xDrv - 130, yM + 20, D.zMotriz - 60], 40, 12, 160),
  ]);

  // ---- EJE TENSOR/DEFLEXIÓN (abajo, entrada) + 2 sprockets locos ----
  // SOLO LBP — el GT Rev.E es de UN SOLO EJE: su retorno lo devuelve el
  // rodillo del nosebar de entrada (P22862 c/rodamientos), sin eje tensor.
  if (esLBP) {
    addPart(`FAB · EJE TENSOR cuadrado ${D.sq} — L=${D.ejeTensorL} (muñones Ø30 ${D.jrnTol})`, C.eje,
      [xTen, 0, zTen], ejeTensor(xTen, zTen));
    const yLocos = [-152.4, 152.4];
    for (const y of yLocos) {
      addPart('NORM · Sprocket Z32 loco (flotante +0.4/+0.3, grano suelto)', C.sprk, [xTen, y, zTen], sprocket(xTen, y, zTen));
    }
    // retención axial del EJE TENSOR: collarines flanqueando el sprocket de
    // REFERENCIA (−Y) — un sprocket retenido por eje posiciona el eje; el
    // resto sigue a la banda. Collarines = 2 por eje (la compra se DERIVA
    // del conteo de piezas — divergencia ×2 que el panel encontró).
    for (const sd of [-1, 1]) {
      const yC = yLocos[0] + sd * (BELT.sprocket.ancho / 2 + 6);
      addPart(`NORM · Collarín ${BELT.collar.split(' — ')[0]} (referencia eje tensor)`, C.chum,
        [xTen, yC, zTen], collar(xTen, yC, zTen));
    }
    for (const s of [-1, 1]) {
      addPart('NORM · Chumacera UCF206 Ø30', C.ucf, [xTen, s * (yOut + 8), zTen], chumaceraUCF(xTen, s * (yOut + 8), zTen));
    }
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

  // ---- SOPORTES 24V TELESCÓPICOS con ajuste angular (ZP2026, measured) ----
  // Copia fiel re-derivada de los LAZOS de la malla (13-08, tercer intento):
  // BRACKET B_005A = ÁNGULO (ala horizontal con 4 cruciformes apernada BAJO
  // el ala del canal + placa vertical trapezoidal que CONTINÚA el plano del
  // alma, con pivote abajo + arco R52,1 + 2 bloqueos discretos a ±60°) →
  // COLUMNA canal C 77×38 colgada del pivote por DENTRO de la placa → TIRA
  // BR_3002 84×38 (10 ranuras) deslizando POR FUERA de la columna, alma al
  // plano del alma, con pata B_004A soldada (ranuras de anclaje 11×22) →
  // TRAVESAÑO B_002A 71×38 ENCAJADO dentro de las columnas (pestaña-en-
  // ranura + soldadura; soportes a piso: soldar permitido).
  const SB = D.sop24.brk, SC = D.sop24.col, SP = D.sop24.piso;
  const ST = D.sop24.tira, SB2 = D.sop24.b002;
  const deg = Math.PI / 180;
  // boceto extruido/cortado en un plano (para cortes que NO son círculos:
  // cruciformes, ranura en arco, ranuras oblongas)
  const sk = (name, at, dir, u, pts, h, op = 'union') =>
    ({ name, shape: 'sketch', op, at, dir, params: { pts: pts.map(q => [r2(q[0]), r2(q[1])]), h, u } });
  // centro del alma en el DESARROLLO de un canal (para ubicar barrenos)
  const webMidC = (webAncho, alaAlto, t) =>
    r2((alaAlto - 2 * t) + bendAllowance(90, t, t, KCH) + (webAncho - 4 * t) / 2);
  const cruciformePoly = (cx, cy) => {
    const w = SB.cruzW / 2, h = SB.cruzH / 2, b2 = 5.5;   // brazo 11 de ancho
    return [
      [cx - b2, cy - h], [cx + b2, cy - h], [cx + b2, cy - b2], [cx + w, cy - b2],
      [cx + w, cy + b2], [cx + b2, cy + b2], [cx + b2, cy + h], [cx - b2, cy + h],
      [cx - b2, cy + b2], [cx - w, cy + b2], [cx - w, cy - b2], [cx - b2, cy - b2],
      [cx - b2, cy - h],
    ].map(q => [r2(q[0]), r2(q[1])]);
  };
  const ranuraPoly = (cx, cy, w, h) => [
    [cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2],
    [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2], [cx - w / 2, cy - h / 2],
  ].map(q => [r2(q[0]), r2(q[1])]);
  const arcoPoly = (cx, cy, R, w, a0, a1) => {
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) { const a2 = a0 + (a1 - a0) * i / n; pts.push([cx + (R + w / 2) * Math.cos(a2), cy + (R + w / 2) * Math.sin(a2)]); }
    for (let i = n; i >= 0; i--) { const a2 = a0 + (a1 - a0) * i / n; pts.push([cx + (R - w / 2) * Math.cos(a2), cy + (R - w / 2) * Math.sin(a2)]); }
    pts.push(pts[0]);
    return pts.map(q => [r2(q[0]), r2(q[1])]);
  };
  // --- geometría vertical del soporte (toda MEASURED, encadenada) ---
  const zBrkTop = zAlaBot;                              // pliegue del ángulo = asiento del ala del canal
  const zPv = r2(zBrkTop - SB.pvV);                     // pivote: 82,7 bajo el pliegue
  const zColTop = r2(zPv + SC.pvDesdeTope);             // tope de columna: pivote a 64,7 del tope
  const zColBot = r2(D.pisoZ + SP.t + 7);               // pie de columna 7 sobre la pata (measured)
  const hCol = r2(zColTop - zColBot);                   // largo de columna (corte a medida)
  const zTira0 = r2(D.pisoZ + SP.t);                    // pie de la tira sobre la pata
  const zB2Top = r2(zColBot + 319.7);                   // tope del travesaño (measured desde el pie de columna)
  // dev del bracket: ÁNGULO con un pliegue — placa 203×95 (abajo) + BA + ala
  // 203×flangeD. Y del dev: 0 = borde INFERIOR de la placa.
  const flatBracket = () => {
    const rb = SB.t;
    const BA = bendAllowance(90, rb, SB.t, KCH);
    const placaFlat = SB.alto;                          // hasta la tangente del pliegue
    const alaFlat = SB.flangeD - (rb + SB.t);
    const H = placaFlat + BA + alaFlat;
    const cx0 = SB.w / 2;
    const circles = [{ c: [cx0, r2(SB.alto - SB.pvV)], r: SB.pivotDia / 2 }];
    for (const ang of SB.lockAng) {
      circles.push({ c: [r2(cx0 + SB.arcoR * Math.cos(ang * deg)), r2(SB.alto - SB.pvV + SB.arcoR * Math.sin(ang * deg))], r: SB.lockDia / 2 });
    }
    const polys = [arcoPoly(cx0, SB.alto - SB.pvV, SB.arcoR, SB.arcoW, SB.arcoA0 * deg, SB.arcoA1 * deg)];
    for (const du of SB.cruzOffs) {
      polys.push(cruciformePoly(cx0 + du, H - SB.cruzDesdeBorde));
    }
    return {
      // contorno: trapecio (fondo 66) + lados rectos (v 25 arriba) + ala
      contorno: [
        [r2(cx0 - SB.wFondo / 2), 0], [r2(cx0 + SB.wFondo / 2), 0],
        [SB.w, r2(SB.alto - SB.vRecto)], [SB.w, r2(H)], [0, r2(H)],
        [0, r2(SB.alto - SB.vRecto)], [r2(cx0 - SB.wFondo / 2), 0],
      ],
      cortes: { circles, polys },
      pliegues: [
        { a: [0, r2(placaFlat)], b: [SB.w, r2(placaFlat)], tipo: 'tangente' },
        { a: [0, r2(placaFlat + bendAllowance(90, rb, SB.t, KCH) / 2)], b: [SB.w, r2(placaFlat + bendAllowance(90, rb, SB.t, KCH) / 2)], tipo: 'eje' },
        { a: [0, r2(placaFlat + bendAllowance(90, rb, SB.t, KCH))], b: [SB.w, r2(placaFlat + bendAllowance(90, rb, SB.t, KCH))], tipo: 'tangente' },
      ],
      etiquetas: [{ x: SB.w / 2, y: r2(placaFlat + bendAllowance(90, rb, SB.t, KCH) / 2) + 4, s: `PLEGAR ARRIBA 90° R${rb} (ala de apriete al canal)` }],
      pliegueInfo: [{ ang: 90, r: rb, ba: r2(bendAllowance(90, rb, SB.t, KCH)) }],
      t: SB.t, k: KCH, radio: rb,
      material: 'Acero S275JR e3 — PINTADO RAL 7035',
      avisos: ['BRACKET B_005A (24V, ÁNGULO): ala horizontal con 4 cruciformes → aperna POR DEBAJO del ala del canal; placa vertical con pivote + ARCO R52 (aplome de la pata en tramos inclinados) + 2 bloqueos discretos a ±60°'],
    };
  };
  // dev de la tira BR_3002 (canal 84×38 con 10 ranuras 11×20 paso 34; X del
  // dev: 0 = extremo de la PATA)
  const flatTira = () => {
    const f = flatPerfilC(ST.largo, ST.w, ST.d, ST.t,
      'Acero S275JR e3 — PINTADO RAL 7035');
    const wmT = webMidC(ST.w, ST.d, ST.t);
    f.cortes.polys = [];
    for (let i = 0; i < ST.nSlots; i++) {
      f.cortes.polys.push(ranuraPoly(r2(ST.slot0 + i * ST.slotPitch), wmT, ST.slotH, ST.slotW));
    }
    f.avisos = [
      'TIRA BR_3002 (24V): desliza POR FUERA de la columna; ranuras 11×20 = ajuste de altura (apriete 3×M10, vernier con la ranura 11×110 de la columna)',
      `PATA B_004A: platina ${SP.w}×${SP.h}×${SP.t} con 2 ranuras de anclaje ${SP.slotW}×${SP.slotH} en ±${SP.slotOff} — cortar aparte y SOLDAR al extremo X=0 (soporte a piso: soldar permitido)`,
    ];
    return f;
  };
  for (const x of patasX) {
    for (const sd of [-1, 1]) {
      // --- BRACKET B_005A: placa vertical que CONTINÚA el plano del alma ---
      const yPlacaC = sd * (yOut - SB.t / 2);           // placa en el mismo plano del alma
      const atB = [x, yPlacaC - SB.t / 2, zBrkTop];     // v del boceto crece hacia ABAJO
      const fB = [sk(`Placa vertical ${SB.w}×${SB.alto} (trapecio)`, atB, [0, 1, 0], [1, 0, 0], [
        [-SB.wFondo / 2, SB.alto], [SB.wFondo / 2, SB.alto],
        [SB.w / 2, SB.vRecto], [SB.w / 2, 0], [-SB.w / 2, 0], [-SB.w / 2, SB.vRecto],
      ], SB.t)];
      // ala horizontal apernada BAJO el ala del canal (cruciformes reales)
      fB.push(box(`Ala de apriete ${SB.w}×${SB.flangeD}`, [x, sd * (yOut - SB.t - SB.flangeD / 2), zBrkTop - SB.t / 2], SB.w, SB.flangeD, SB.t));
      for (const du of SB.cruzOffs) {
        fB.push(sk('Cruciforme (paso M8 regulable)', [x, sd * yBrkAla, zBrkTop - SB.t], [0, 0, 1], [1, 0, 0],
          cruciformePoly(du, 0), SB.t, 'cut'));
      }
      // pivote + ranura en ARCO real + 2 bloqueos discretos (los ángulos son
      // del MUNDO: v del boceto crece hacia abajo → ángulo negado)
      fB.push(hole('Pivote de columna Ø11', [x, yPlacaC, zPv], [0, 1, 0], SB.pivotDia, 0, true));
      fB.push(sk('Arco de aplome (ranura R52×11)', atB, [0, 1, 0], [1, 0, 0],
        arcoPoly(0, SB.pvV, SB.arcoR, SB.arcoW, -SB.arcoA0 * deg, -SB.arcoA1 * deg), SB.t, 'cut'));
      for (const ang of SB.lockAng) {
        fB.push(hole('Bloqueo discreto Ø11 (aplome ±60°)',
          [r2(x + SB.arcoR * Math.cos(ang * deg)), yPlacaC, r2(zPv + SB.arcoR * Math.sin(ang * deg))],
          [0, 1, 0], SB.lockDia, 0, true));
      }
      addPart('FAB · Bracket soporte B_005A 24V (ángulo: cruciformes + pivote/arco de aplome)', C.pata, [x, sd * yOut, zBrkTop], fB, { flat: flatBracket() });

      // --- COLUMNA canal C 77×38×3, alma contra la CARA INTERIOR de la placa ---
      const yColWeb = sd * (yOut - SB.t - SC.t / 2);
      const fC = [
        box(`Alma canal ${SC.w}×${SC.t}`, [x, yColWeb, zColTop - hCol / 2], SC.w, SC.t, hCol),
      ];
      for (const dxf2 of [-1, 1]) {
        fC.push(box(`Ala canal ${SC.d}`, [x + dxf2 * (SC.w / 2 - SC.t / 2), sd * (yOut - SB.t - SC.t - (SC.d - SC.t) / 2), zColTop - hCol / 2], SC.t, SC.d - SC.t, hCol));
      }
      // 2 Ø11 arriba: pivote + perno del arco (calzan con el bracket)
      fC.push(hole('Pivote Ø11 (a bracket)', [x, yColWeb, zPv], [0, 1, 0], SC.holeDia, 0, true));
      fC.push(hole('Aplome Ø11 (perno del arco)', [x, yColWeb, r2(zPv + SC.upSep)], [0, 1, 0], SC.holeDia, 0, true));
      // 3 Ø11 abajo: apriete del telescópico contra las ranuras de la tira
      for (const off of SC.clampOffs) {
        fC.push(hole('Apriete telescópico Ø11 (a ranura de tira)', [x, yColWeb, r2(zColBot + off)], [0, 1, 0], SC.holeDia, 0, true));
      }
      // ranura VERTICAL 11×110 (ajuste continuo/vernier con la tira)
      const atC = [x, yColWeb - SC.t / 2, zColTop];
      fC.push(sk(`Ranura vernier ${SC.slotInf.w}×${SC.slotInf.h}`, atC, [0, 1, 0], [1, 0, 0],
        ranuraPoly(0, r2(hCol - SC.slotInf.c), SC.slotInf.w, SC.slotInf.h), SC.t, 'cut'));
      // ranura PESTAÑA del travesaño B_002A (unión pestaña-en-ranura + soldar)
      fC.push(sk(`Ranura pestaña travesaño ${SC.tabSlot.w}×${SC.tabSlot.h}`, atC, [0, 1, 0], [1, 0, 0],
        ranuraPoly(0, r2(zColTop - (zB2Top - SB2.t / 2)), SC.tabSlot.w, SC.tabSlot.h), SC.t, 'cut'));
      addPart('FAB · Columna soporte 24V canal C 77×38×3 (pivote+arco / apriete 3×M10)', C.pata, [x, yColWeb, zColTop - hCol / 2], fC, {
        flat: (() => {
          const f = flatPerfilC(hCol, SC.w, SC.d, SC.t,
            'Acero S275JR e3 — PINTADO RAL 7035',
            [{ x: r2(hCol - SC.pvDesdeTope), y: webMidC(SC.w, SC.d, SC.t), dia: SC.holeDia },
             { x: r2(hCol - SC.pvDesdeTope + SC.upSep), y: webMidC(SC.w, SC.d, SC.t), dia: SC.holeDia },
             ...SC.clampOffs.map(off => ({ x: off, y: webMidC(SC.w, SC.d, SC.t), dia: SC.holeDia }))]);
          const wmC = webMidC(SC.w, SC.d, SC.t);
          f.cortes.polys.push(ranuraPoly(SC.slotInf.c, wmC, SC.slotInf.h, SC.slotInf.w));
          f.cortes.polys.push(ranuraPoly(r2(zB2Top - SB2.t / 2 - zColBot), wmC, SC.tabSlot.h, SC.tabSlot.w));
          f.avisos = ['COLUMNA (24V): X=0 del dev = PIE. Ranura 11×110 = ajuste continuo; ranura 11,6×3,6 = pestaña del travesaño B_002A (soldar tras montar)'];
          return f;
        })(),
      });

      // --- TIRA BR_3002 (canal 84×38×3): alma en el MISMO plano del alma ---
      const yTiraWeb = sd * (yOut - ST.t / 2);
      const fT = [
        box(`Alma tira ${ST.w}×${ST.t}`, [x, yTiraWeb, zTira0 + ST.largo / 2], ST.w, ST.t, ST.largo),
      ];
      for (const dxf2 of [-1, 1]) {
        fT.push(box(`Ala tira ${ST.d}`, [x + dxf2 * (ST.w / 2 - ST.t / 2), sd * (yOut - ST.t - (ST.d - ST.t) / 2), zTira0 + ST.largo / 2], ST.t, ST.d - ST.t, ST.largo));
      }
      // 10 ranuras OBLONGAS reales (1ª a 38 del pie, última a 25 del tope)
      const atT = [x, yTiraWeb - ST.t / 2, r2(zTira0 + ST.largo)];
      for (let i = 0; i < ST.nSlots; i++) {
        const vC = r2(ST.largo - (ST.slot0 + i * ST.slotPitch));   // v crece hacia abajo
        fT.push(sk(`Ranura ${ST.slotW}×${ST.slotH} telescópica ${i + 1}/${ST.nSlots}`,
          atT, [0, 1, 0], [1, 0, 0],
          ranuraPoly(0, vC, ST.slotW, ST.slotH), ST.t, 'cut'));
      }
      // pata B_004A soldada bajo la tira (158×40×4, ranuras de anclaje 11×22)
      fT.push(box(`Pata B_004A ${SP.w}×${SP.h}`, [x, sd * (yOut - SP.h / 2), D.pisoZ + SP.t / 2], SP.w, SP.h, SP.t));
      for (const dxp of [-1, 1]) {
        fT.push(sk(`Ranura de anclaje ${SP.slotW}×${SP.slotH}`, [x, sd * (yOut - SP.h / 2), D.pisoZ], [0, 0, 1], [1, 0, 0],
          ranuraPoly(dxp * SP.slotOff, 0, SP.slotW, SP.slotH), SP.t, 'cut'));
      }
      addPart(`FAB · Tira telescópica BR_3002 84×38×3 (${ST.nSlots} ranuras ${ST.slotW}×${ST.slotH}) + pata B_004A (soldada)`, C.pata,
        [x, yTiraWeb, zTira0 + ST.largo / 2], fT, { flat: flatTira() });
    }

    // --- TRAVESAÑO B_002A: canal 71×38 ENCAJADO dentro de las columnas ---
    // (alma ARRIBA, alas colgando; pestañas del alma entran en la ranura de
    // cada columna → soldar. 71 = luz interior del canal de columna 77−2×3.)
    const LB2 = r2(2 * (yOut - SB.t - SC.t));           // entre caras interiores de las almas
    const fX = [
      box(`Alma B_002A ${SB2.d}×${SB2.t}`, [x, 0, zB2Top - SB2.t / 2], SB2.d, LB2, SB2.t),
    ];
    for (const dxf2 of [-1, 1]) {
      fX.push(box(`Ala B_002A ${SB2.alto}`, [x + dxf2 * (SB2.d / 2 - SB2.t / 2), 0, zB2Top - SB2.t - (SB2.alto - SB2.t) / 2], SB2.t, LB2, SB2.alto - SB2.t));
    }
    for (const sdy of [-1, 1]) {
      fX.push(box('Pestaña de alma (a ranura de columna)', [x, sdy * (LB2 / 2 + SC.t / 2), zB2Top - SB2.t / 2], 11, SC.t, SB2.t));
    }
    addPart(`FAB · Travesaño de patas B_002A canal ${SB2.d}×${SB2.alto}×${SB2.t} (L=${LB2})`, C.pata, [x, 0, zB2Top], fX, {
      flat: (() => {
        const f = flatPerfilC(LB2, SB2.d, SB2.alto, SB2.t,
          'Acero S275JR e3 — PINTADO RAL 7035');
        const wmX = webMidC(SB2.d, SB2.alto, SB2.t);
        const W = f.contorno[2][1];                     // alto total del dev
        f.contorno = [
          [0, 0], [LB2, 0], [LB2, r2(wmX - 5.8)], [r2(LB2 + SC.t), r2(wmX - 5.8)],
          [r2(LB2 + SC.t), r2(wmX + 5.8)], [LB2, r2(wmX + 5.8)], [LB2, W], [0, W],
          [0, r2(wmX + 5.8)], [r2(-SC.t), r2(wmX + 5.8)], [r2(-SC.t), r2(wmX - 5.8)],
          [0, r2(wmX - 5.8)], [0, 0],
        ];
        f.avisos = ['TRAVESAÑO B_002A (24V): pestañas 11×3 en ambos extremos del alma → entran en la ranura de cada columna; SOLDAR filete 3 perimetral tras aplomar (soporte a piso: soldar permitido)'];
        return f;
      })(),
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
  const guardasChk = cajas.map(K => ({
    tag: K.tag, xa: K.xa, xb: K.xb, fondoZ: K.fondoZ, pernos: K.mounts.length * 2,
  }));
  // volúmenes de cerramiento DECLARADOS (los tres costados + fondo + tapa +
  // mecha cierran la caja, pero ninguna pieza sola representa el volumen)
  const cajasDecl = cajas.map(K => ({
    nombre: `caja de accionamiento ${K.tag} (costados + fondo + tapa + mecha)`,
    caja: [K.xa, K.xb, K.yn - tCaja, K.yp + tCaja, K.fondoZ, topCaja],
  }));
  // Rev.C: cada elemento transversal verifica su PROPIA banda z contra el lazo
  const travChk = [
    ...xsTrav.filter(x => lazoOcupa(x - TT.w / 2 - 10, x + TT.w / 2 + 10, zTRtop - TT.h - 6, zTRtop + 6)).map(x => `TR@${x}`),
    ...xsPC.filter(x => lazoOcupa(x - PC.w / 2 - 10, x + PC.w / 2 + 10, zPCtop - PC.t - 4, zPCtop + 4)).map(x => `PC@${x}`),
  ];
  let mechasOverlap = false;
  for (let i = 0; i < mechasSpec.length; i++) for (let j = i + 1; j < mechasSpec.length; j++) {
    if (mechasSpec[i].x1 > mechasSpec[j].x0 && mechasSpec[j].x1 > mechasSpec[i].x0) mechasOverlap = true;
  }
  return {
    parts, largoBanda: largo, wraps, path, pathOuterPts: outer, guardasChk, cajasDecl, travChk, mechasOverlap, cabChk,
    // interferencia ala↔banda (hallazgo de Sergio 12-08): el lazo solo puede
    // cruzar la banda z del ala DENTRO de una muesca
    alaChk: { zBot: D.plTop - D.plAlto, zTop: D.plTop - D.plAlto + D.plT, muescas: muescasAuto, alaSegs },
    // Rev.D: el ala del bracket B_005A aperna BAJO el ala del canal — cada
    // estación exige su tramo de ala ÍNTEGRO (sin muesca) con margen para
    // los 4 barrenos del cruciforme
    brkAlaChk: patasX.map(px => ({ px, xa: r2(px - D.sop24.brk.w / 2), xb: r2(px + D.sop24.brk.w / 2) })),
    // posiciones para los PLANOS DE CORTE del GA (se eligen aquí, con el
    // layout a la vista): A-A transversal en vano libre entre travesaños,
    // mirando hacia la pata más cercana; B-B longitudinal apenas fuera del
    // plano medio (evita el corte degenerado por caras coincidentes en y=0)
    secciones: (() => {
      // A-A POR un portacarril cercano al medio: muestra el sándwich bar
      // cap→pletina→portacarril→clips y la catenaria dentro del canal
      const aa = xsPC.reduce((p, q) => Math.abs(q - L / 2) < Math.abs(p - L / 2) ? q : p, xsPC[0]);
      return { aa_x: r2(aa + 0.5), bb_y: 0.5, xsTrav: [...xsTrav].sort((a, b) => a - b), patasX };
    })(),
  };
}

// ---------------------------------------------------------------------------
// Verificaciones (fallan = no se emite)
// ---------------------------------------------------------------------------
// Especificación de SOLDADURA — fuente única: la usan el GA, el manual y la
// compuerta «pieza sin fijación» (una pieza sin barrenos es legítima si esta
// lista la declara soldada; si no la declara, la compuerta la caza)
const SOLDADURA = {
    proceso: 'GMAW (MIG) ER70S-6 Ø1.0 — alternativa SMAW E7018',
    norma: 'AWS D1.1 — inspección visual 100%',
    // Rev.C: construcción APERNADA — soldar SOLO piezas pequeñas en taller y
    // los soportes a piso (directriz Sergio 12-08). Ninguna soldadura en obra.
    uniones: [
      'Orejas 120×60×4 → travesaño TR_S: filete 3 ×40 doble cara (taller; conjunto APERNADO 2×M6/extremo)',
      'Clips ángulo 30×30×3 → portacarril: 2 cordones 25×3 (taller; conjunto APERNADO 2×M6/lado)',
      'Clips ángulo 40×40×4 → cabezal porta-nosebar: filete 3 perimetral (taller; APERNADO 2×M6/extremo)',
      'Tira BR_3002 → pata B_004A: filete 4 perimetral (SOPORTE A PISO: permitido)',
      'Travesaño B_002A → columnas: pestaña 11×3 en ranura + filete 3 perimetral, soldar APLOMADO (SOPORTE A PISO: permitido)',
      'Retención de cabezales del rodillo de retorno: 3 puntos esmerilados a ras (LBP530-EJ-04)',
    ],
    nota: 'mechas, cabezales, travesaños TR_S, portacarriles, brackets y guardas van APERNADOS — sin soldadura en obra; el marco en H del soporte (pata+travesaño B_002A) se suelda en taller; retocar RAL 7035 tras soldar',
  };

// ── COMPUERTAS UNIVERSALES (lib_compuertas.mjs) ─────────────────────────────
// Las reglas que NO dependen de este equipo viven en la librería: un generador
// nuevo las hereda llamando compuertasUniversales(). Aquí solo se declaran las
// EXENCIONES y la DEUDA (hallazgos reales con decisión pendiente) — declarar
// es legítimo, silenciar no.
const EXENTOS_MARGEN = [
  // grillas DICTADAS por el fabricante y cotas MEASURED que se copian tal cual
  /Cabezal porta-nosebar/, /Bracket soporte B_005A/, /Columna soporte 24V/,
];
// DEUDA vigente: vacía. La de los 54 barrenos en zona de plegado se RESOLVIÓ
// el 13-08 (Sergio: «keep one and a half inch, there is a solution for the
// nine hole, you cannot increase that»): el ala sigue en 38,1 y los pasos se
// corrieron dentro de la ranura cruciforme del bracket / con la pestaña de la
// guarda ensanchada. La regla de borde pasó a depender del PROCESO (láser vs
// punzonado), que era el error de fondo.
// ── CERRAMIENTO POR ESTRUCTURA (compuerta peligro-expuesto) ──────────────────
// La artesa en U no es el único cierre del equipo: entre las dos placas
// laterales PL6 (Y ±203..241, Z −293..−8, en TODO el largo) el volumen queda
// cerrado por los costados, arriba por la banda y abajo por la propia artesa,
// que arranca en −294. Se declara como caja porque ninguna PIEZA la representa
// — y se declara con las cotas de las placas reales, no con las que convienen:
// por eso los sprockets locos del tensor (Y ±164, dentro) dejan de contarse
// como expuestos y los muñones de eje (Y 398 y −283, FUERA de la placa) siguen
// contándose.
const cerramientosDe = (nm, eq) => {
  const out = [];
  const pl = eq.parts.filter(p => /Placa lateral/.test(p.name || '')).map(cajaMundo).filter(Boolean);
  if (pl.length >= 2) out.push({
    nombre: 'entre placas laterales PL6 (costados), banda arriba',
    caja: [Math.min(...pl.map(c => c[0])), Math.max(...pl.map(c => c[1])),
      Math.min(...pl.map(c => c[2])), Math.max(...pl.map(c => c[3])),
      Math.min(...pl.map(c => c[4])), Math.max(...pl.map(c => c[5]))],
  });
  // Volúmenes de las cajas de accionamiento (declarados por build(): los
  // costados, el fondo, la tapa y la mecha cierran la caja entre todos, y
  // ninguna pieza sola contiene su volumen).
  for (const c of eq.cajasDecl || []) out.push(c);
  // El muñón que corre DENTRO del eje hueco lo cierra el cubo del reductor;
  // los 16 mm que asoman tras el cubo terminan dentro del alojamiento del
  // cárter y se cierran con el TAPÓN PROTECTOR del eje hueco (accesorio
  // estándar NMRV — pedirlo EN la OC del motorreductor).
  for (const p of eq.parts) {
    if (!/Motorreductor/.test(p.name || '')) continue;
    const cc = cajaMundo(p);
    if (cc) out.push({ nombre: 'carcasa reductor + tapón de eje hueco (accesorio NMRV en OC)', caja: cc });
    for (const f of p.features || []) {
      if (!/cubo hueco/i.test(f.name || '')) continue;
      const P = p.pos || [0, 0, 0], a = f.at || [0, 0, 0];
      const R = (f.params?.dia ?? 0) / 2, h = f.params?.h ?? 0, dir = f.dir || [0, 0, 1];
      const ax = dir.findIndex(v => Math.abs(v) > 0.5);
      const lo = [0, 1, 2].map(i => i === ax ? a[i] : a[i] - R);
      const hi = [0, 1, 2].map(i => i === ax ? a[i] + h : a[i] + R);
      out.push({ nombre: `cubo hueco Ø${f.params?.dia} del reductor`,
        caja: [lo[0] + P[0], hi[0] + P[0], lo[1] + P[1], hi[1] + P[1], lo[2] + P[2], hi[2] + P[2]] });
    }
  }
  return out;
};
// El motorreductor es componente COMERCIAL con carcasa propia: sus partes
// móviles (ventilador bajo capot, engranaje sinfín-corona en cárter cerrado)
// vienen protegidas de fábrica. Lo que NO tiene guarda de fábrica es la
// interfaz con nuestro eje —muñón, chavetero, brazo de reacción— y eso NO se
// exime: es la deuda D-05.
const EXENTOS_PELIGRO = [
  { patron: /Motorreductor/, razon: 'componente comercial: cárter cerrado y ventilador bajo capot, protegidos de fábrica. La interfaz con nuestro eje (muñón, chaveta, brazo de reacción) NO queda eximida — va en D-05' },
];
// DEUDA vigente: VACÍA. D-05 y D-07 se cerraron el 17-08 con las cajas de
// accionamiento Rev.F. Un patrón que ya no caza nada NO se deja «por si
// acaso»: un patrón dormido se traga en silencio la próxima violación real.
const DEUDA_DECLARADA = [];

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
    // Rev.D: cada bracket B_005A necesita su tramo de ala completo (el ala
    // del ángulo aperna POR DEBAJO del ala del canal — una muesca ahí
    // dejaría los cruciformes al aire)
    for (const bk of eq.brkAlaChk || []) {
      const seg = (eq.alaChk.alaSegs || []).find(([a, b]) => a <= bk.xa && b >= bk.xb);
      if (!seg) e.push(`${nm}: bracket en x=${bk.px} sin tramo de ala íntegro [${bk.xa}..${bk.xb}] (muesca del lazo encima — mover patasX)`);
    }
    // retención axial: 2 collarines por eje PRESENTE (LBP 2 ejes = 4;
    // GT Rev.E 1 eje = 2) — la compra se deriva del conteo
    const nEjesEq = eq.parts.filter(p => /FAB · EJE (MOTRIZ|TENSOR)/.test(p.name)).length;
    const nCol = eq.parts.filter(p => /Collarín/.test(p.name)).length;
    if (nCol !== 2 * nEjesEq) e.push(`${nm}: ${nCol} collarines ≠ 2 por eje (${nEjesEq} ejes)`);
    // interferencia ala↔banda: la banda (±228,6) SOLAPA el ala (borde int. 211)
    // — todo cruce del lazo por la banda z del ala debe caer DENTRO de una
    // muesca (con 15 de margen). Hallazgo de Sergio 12-08 → compuerta.
    if (eq.alaChk) {
      const { zBot, zTop, muescas } = eq.alaChk;
      const pts = eq.pathOuterPts;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        for (const zc of [zBot, zTop]) {
          if ((a[1] - zc) * (b[1] - zc) < 0) {
            const xq = a[0] + (zc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
            const dentro = muescas.some(([m0, m1]) => xq > m0 + 15 && xq < m1 - 15);
            if (!dentro) e.push(`${nm}: el lazo cruza el plano del ala en x=${r2(xq)} FUERA de muesca — interferencia ala↔banda`);
          }
        }
      }
    }
    // ── holgura lazo↔placa de cabezal (hallazgo Sergio 13-08: «the road is
    // going in a wrong way» en la zona del nosebar de retorno del GT). El
    // tramo libre del retorno debe pasar a ≥8 de la placa (abajo/frente);
    // se EXCLUYE la zona de la nariz (radio+banda): ahí el contacto con el
    // cuerpo BluLub del nosebar es DE DISEÑO (guía de retorno del fabricante).
    for (const [cn, rc] of Object.entries(eq.cabChk || {})) {
      const infl = 8;
      const X0 = rc.x0 - infl, X1 = rc.x1 + infl, Z0 = rc.zBot - infl, Z1 = rc.zTop;
      const pts = eq.pathOuterPts;
      const cu = rc.cuerpo;
      let peor = null;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
        for (let j = 0; j <= n; j++) {
          const x = a[0] + (b[0] - a[0]) * j / n, z = a[1] + (b[1] - a[1]) * j / n;
          if (Math.hypot(x - rc.nose[0], z - rc.nose[1]) <= BELT.noseR + BELT.esp + 1.5) continue;
          // zona del cuerpo BluLub (+2): contacto de guía PERMITIDO por diseño
          if (cu && x > cu.bx0 - 2 && x < cu.bx1 + 2 && z > cu.bzBot - 2 && z < cu.bzTop) continue;
          if (x > X0 && x < X1 && z > Z0 && z < Z1) {
            const pen = r2(Math.min(x - X0, X1 - x, z - Z0, Z1 - z));
            if (!peor || pen > peor.pen) peor = { x: r2(x), z: r2(z), pen };
          }
        }
      }
      if (peor) e.push(`${nm}: el lazo INVADE la zona de la placa de cabezal ${cn} en (${peor.x}, ${peor.z}) — holgura mínima 8 a la placa [${rc.x0}..${rc.x1}]×[${rc.zBot}..${rc.zTop}]`);
    }
    // ── envoltura de rodillos de retorno/snub ≤90° — una envoltura mayor en
    // un rodillo loco delata el ARTEFACTO DE BOBINADO de la cadena de
    // tangentes (rodillo al lado equivocado de la línea de banda): el lazo se
    // dibuja y MIDE con una vuelta de ~360° que no existe físicamente.
    for (let i = 0; i < eq.path.length; i++) {
      const q = eq.path[i];
      const tope = q.rol === 'snub' ? 130 : 90;   // un snub prensor legítimo llega a ~130
      if ((q.rol === 'ret' || q.rol === 'snub') && !q.virtual && eq.wraps[i] > tope)
        e.push(`${nm}: envoltura ${eq.wraps[i]}° en ${q.rol} x=${q.c[0]} (>${tope} — rodillo al lado equivocado de la línea del lazo)`);
    }
  }
  // corte de barras (kerf 9 mm) — motrices 8 (uno por transportador);
  // tensores DERIVADOS de los equipos que llevan eje tensor (Rev.E: solo LBP)
  const nTenProy = 4 * [res.LBP, res.GT].filter(eq => eq && eq.parts.some(p => /FAB · EJE TENSOR/.test(p.name))).length;
  const corteM = 8 * (D.ejeMotrizL + 9), corteT = nTenProy * (D.ejeTensorL + 9);
  if (corteM > 6000) e.push(`8 ejes motrices no salen de una barra de 6 m (${corteM})`);
  if (corteT > 6000) e.push(`${nTenProy} ejes tensores no salen de una barra de 6 m (${corteT})`);
  // envoltura de la motriz: manual Movex 140±10° (aceptamos 115–175 con aviso)
  for (const [tipo, r] of Object.entries(res)) {
    const i = r.path.findIndex(q => q.rol === 'motriz');
    const w = r.wraps[i];
    if (w < 115 || w > 175) e.push(`${tipo}: envoltura de la motriz ${w}° fuera de la banda admisible 115–175 (objetivo manual 140±10)`);
    r.wrapMotriz = w;
    // catenaria: profundidad de sag bajo el plano de zapatas (LBP)
    if (tipo === 'LBP') r.sag = r2(Math.abs(D.sagBot - D.retTop));
  }
  // margen agujero→borde: la regla VIVE EN lib_compuertas.mjs (una sola
  // verdad, sensible al proceso de corte). Aquí sólo se declaran las
  // exenciones (EXENTOS_MARGEN) y el informe sale del `info` de la librería.
  // esbeltez (informativo con techo duro): vano entre travesaños / espesor
  // de placa — placas guiadas arriba por la banda y abajo por el retorno
  const vanoMax = Math.max(D.pasoTravLBP, D.pasoTravFT);
  const esb = r2(vanoMax / D.plT);
  console.log(`  esbeltez placa: vano máx ${vanoMax} / t${D.plT} = ${esb} (techo 250 con refuerzo, placa arriostrada por travesaños)`);
  if (esb > 250) e.push(`esbeltez de placa ${esb} > 250: acortar paso de travesaños o subir espesor`);
  const nEspecificas = e.length;   // compuertas propias del equipo ya evaluadas
  // ── universales: heredadas de la librería, no reescritas aquí ──
  const uni = compuertasUniversales(res, { exentos: EXENTOS_MARGEN, uniones: SOLDADURA.uniones,
    cerramientosDe, exentosPeligro: EXENTOS_PELIGRO,
    // la guarda tampoco puede ocupar el espacio de la ESTRUCTURA que la
    // rodea: columnas, tiras telescópicas y travesaños de pata (así se
    // cazaron las columnas que perforaban el fondo de la artesa Rev.E.1)
    componentesChoque: [/^NORM · /, /Columna soporte/, /Tira telescópica/, /Travesaño de patas/] });
  const deuda = [], nuevos = [];
  for (const msg of uni.errs) {
    const d = DEUDA_DECLARADA.find(q => q.patron.test(msg));
    (d ? deuda : nuevos).push(d ? { msg, razon: d.razon } : msg);
  }
  e.push(...nuevos);
  if (deuda.length) {
    const porRazon = new Map();
    for (const d of deuda) porRazon.set(d.razon, (porRazon.get(d.razon) || 0) + 1);
    console.log('  DEUDA DECLARADA (compuerta universal en rojo, decisión PENDIENTE de Sergio):');
    for (const [razon, n] of porRazon) console.log(`    · ${n} hallazgo(s) — ${razon}`);
  }
  for (const [nm, i] of Object.entries(uni.info)) {
    console.log(`  ${nm}: chapa ${i.masa_chapa_kg} kg · margen más apretado ${i.peorMargen?.margen} (req ${i.peorMargen?.req})${i.peorMargen?.exento ? ' [EXENTO declarado]' : ''}`);
  }

  if (e.length) throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - '));
  return { corteM, corteT, nTenProy,
    sello: sellarCompuertas(uni, {
      exenciones: EXENTOS_MARGEN,
      deuda: [...new Set(deuda.map(d => d.razon))],
      especificas: nEspecificas,
    }) };
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
  revision: 'F',
  revision_causa: 'guardas: las artesas Rev.E.1 se reemplazan por cajas de accionamiento — el faldón atravesaba la brida de las 6 chumaceras (D-07), la punta de muñón giraba al aire (D-05), las columnas de soporte perforaban el fondo, y el perfil medido del lazo mostró que la artesa motriz cubría una catenaria que ya no existe (la banda nunca baja de −274 fuera de las envolturas)',
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
  traccion: 'motriz ABAJO extremo descarga (wrap objetivo 140±10°, manual Movex); LBP: deflexión/tensor abajo extremo entrada · GT Rev.E: UN SOLO EJE — el retorno lo devuelve el RODILLO DEL NOSEBAR de entrada (P22862 c/rodamientos, flexión normal radio 9,5); NOSEBAR en ambas puntas',
  sprockets: `Z-32 MOLDEADO PD 153.4 OD 154.8 ancho 40, BORE CUADRADO 1.5 in c/grano M8 (P158808YF, cotización 26012937) — 530 LBP estándar 18 in: 5/eje en el grid VÁLIDO A·B·C·B·C·A (centrado: -152.4/-89.05/0/+63.35/+152.4; manual p.30 = brochure p.11; poner 6 es IMPOSIBLE: las demás posiciones caen bajo los carriles de rodillos ✗; 6 aplica solo a 530 PRO LBP) · GT: 6/eje (indent 38.1, paso 76.2) y UN SOLO EJE (Rev.E — sin tensor ni locos); MOTRIZ: solo el central FIJO (grano M8 + collarines P21703Y), resto FLOTAN (+0.4/+0.3) · TENSOR (solo LBP): sprockets locos de grano suelto, con el de REFERENCIA (−Y) flanqueado por collarines (posiciona el eje, sin grano)`,
  retorno: 'RODILLOS Ø63.5 de eje muerto cada ~500 (decisión usuario; manual Movex sugiere zapata para LBP — desviación registrada): tubo con 2 rodamientos SELLADOS 6202-2RS insertos, eje Ø15 roscado M8 interior en ambas puntas, PERNO HEX M8 + golilla POR FUERA de la placa; catenaria 50–150 tras la motriz',
  estructura: 'soportes COPIA del ZP2026 por pata: bracket B_005A = ÁNGULO 203×(95+38)×3 (ala horizontal con 4 cruciformes apernada BAJO el ala del canal + placa vertical con pivote, arco R52 de aplome y 2 bloqueos a ±60°) + columna canal C 77×38×3 (por dentro de la placa) + tira BR_3002 84×38×3 con 10 ranuras 11×20 (telescópica, por fuera, alma al plano del alma) + pata B_004A 158×40×4 (ranuras de anclaje 11×22); travesaño B_002A 71×38×3 ENCAJADO dentro de las columnas (pestaña-en-ranura + soldadura); travesaños de bastidor TR_S C 88×88×3; guía de apoyo = pletina 12 de canto + BAR CAP UHMW P101203-30; guía lateral = conical rail L 1¼ in P12501C sobre escuadras',
  friction_top: 'GT: goma 75 ShA sobre la banda; el retorno del GT es sobre rodillos (recomendación del manual) y cierra en el rodillo del nosebar de entrada (UN SOLO EJE, Rev.E); la goma no toca nariz ni rodillos (contacto por cara interior)',
  verificaciones: {
    wrapMotrizLBP: res.LBP.wrapMotriz, wrapMotrizGT: res.GT.wrapMotriz,
    wrapNoseEntradaGT: res.GT.wraps?.[res.GT.path.findIndex(q => q.rol === 'noseA')],
    sagCatenariaLBP: res.LBP.sag,
    corteBarraMotrices: chk.corteM, corteBarraTensores: chk.corteT,
  },
};

for (const [tipo, b] of Object.entries(builds)) {
  const r = res[tipo];
  const doc = {
    format: 'foto3d-cad', version: 1,
    // SELLO de compuertas: sin él, dxf_flat / bom_equipo / planos_fab /
    // ga_equipo / manual_partes se NIEGAN a emitir (CELULA_DISENO regla 11)
    meta: { nombre: b.nombre, ...metaComun, largo_nose_a_nose: b.L, largo_banda_lazo_mm: r2(r.largoBanda), secciones: r.secciones, compuertas: chk.sello },
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
      largoTotal: D.ejeTensorL, corte: D.ejeTensorL + 9, cantidad: chk.nTenProy,
      soloEn: 'LBP (el GT Rev.E es de un solo eje)',
      tramos: [
        { nombre: 'muñón', dia: D.jrnDia, tol: D.jrnTol, largo: D.jrnLibre },
        { nombre: 'cuadrado', lado: D.sq, largo: D.sqLen },
        { nombre: 'muñón', dia: D.jrnDia, tol: D.jrnTol, largo: D.jrnLibre },
      ],
    },
    barras: {
      espec: 'Barra cuadrada 1.5 in (38.1) SAE 1045 calibrada × 6 m',
      motriz: { porBarra: 8, usado: chk.corteM }, tensor: { porBarra: chk.nTenProy, usado: chk.corteT },
      comprar: 2, nota: 'considerar 1 barra extra de respaldo',
    },
    // Conteos de estructura DERIVADOS de las piezas reales (el literal
    // «16 sop.» de EJ-03 dejaba media flota sin patas — hallazgo del panel)
    soportes: {
      // una PATA = una tira BR_3002 (el regex /Soporte tipo/ de Rev.C quedó
      // obsoleto con los nombres Rev.D y contaba 0 — corregido)
      LBP: res.LBP.parts.filter(p => /Tira telescópica BR_3002/.test(p.name)).length,
      GT: res.GT.parts.filter(p => /Tira telescópica BR_3002/.test(p.name)).length,
      proyecto: 4 * res.LBP.parts.filter(p => /Tira telescópica BR_3002/.test(p.name)).length
              + 4 * res.GT.parts.filter(p => /Tira telescópica BR_3002/.test(p.name)).length,
    },
    // Rodillo de retorno de eje muerto — plano propio de la familia EJ para
    // que planos_fab NO le emita lámina duplicada. Cantidad DERIVADA de las
    // piezas reales de los dos ensambles (nada estimado a mano).
    retorno: {
      plano: 'LBP530-EJ-04',
      tubo: { dia: D.gtRetDia, espesor: 3.0, espesorProc: 'POR CONFIRMAR contra stock proveedor (tubo A513 2½ in)', largo: D.sqLen },
      // Rev.C: el asiento crece para alojar la RANURA SEEGER DIN 472-35 entre
      // el rodamiento y la cara (n=3 al borde, DIN) + chaflán de montaje 2×45°
      // que guía la prensa. asientoProf = n 3.0 + m 1.6 + rodamiento 11 = 15.6
      cabezal: { od: D.gtRetDia - 2 * 3.0, ancho: 19, asientoDia: 35, asientoTol: 'H7', asientoProf: 15.6, pasoInterior: 20,
        seeger: { norma: 'DIN 472-35', d2: 37, tol_d2: '+0,25/0', m: 1.6, tol_m: 'H13', n: 3.0 },
        chaflan: '2×45°' },
      ejeMuerto: { dia: D.retEjeDia, largo: D.innerW, rosca: `M${D.retPernoM}×16 interior ambas caras`, material: 'SAE 1045 calibrado' },
      rodamiento: '6202-2RS (15×35×11) sellado',
      perno: `M${D.retPernoM}×25 8.8 + golilla plana y presión, por fuera de la placa`,
      porEquipo: {
        LBP: res.LBP.parts.filter(p => /Rodillo retorno/.test(p.name)).length,
        GT: res.GT.parts.filter(p => /Rodillo retorno/.test(p.name)).length,
      },
      cantidad: 4 * res.LBP.parts.filter(p => /Rodillo retorno/.test(p.name)).length
              + 4 * res.GT.parts.filter(p => /Rodillo retorno/.test(p.name)).length,
    },
  },
  // Especificación de SOLDADURA del bastidor (el panel encontró «SOLDAR según
  // GA» sin que el GA especificara nada): la leen ga_equipo y manual_partes.
  soldadura: SOLDADURA,

  // Cotización MOVEX 26012937 (09-07-2026, EUR, EXW Castelli Calepio) —
  // projects/LBP530-18/input/docs/Cotizacion_MOVEX_26012937.pdf.
  // "necesario" = lo que consumen las 4 líneas; "cotizado" = lo ofertado.
  compraMovex: {
    banda_530LBP_18in: { art: 'P5324010018A', precioEUR_m: 174.85, necesario_m: r2(4 * lazoLBP), cotizado_m: 90.3, nota: 'cotizado cubre ~2× (repuesto/futuras líneas); rollos de 1.5 m' },
    banda_530GT_18in: { art: 'P5323010018A', precioEUR_m: 243.18, necesario_m: r2(4 * lazoGT), cotizado_m: 18.0 },
    sprockets_Z32_cuadrado15: {
      art: 'P158808YF', precioEUR: 17.42,
      // DERIVADO de las piezas reales (Rev.E: el GT no lleva tensor ni locos)
      necesario: 4 * res.LBP.parts.filter(p => /Sprocket/.test(p.name)).length
               + 4 * res.GT.parts.filter(p => /Sprocket/.test(p.name)).length,
      cotizado: 152,
      detalle: 'rueda moldeada Z-32 c/grano M8; LBP 5+2 locos · GT 6 (Rev.E: un solo eje) por transportador',
    },
    collarines: {
      art: 'P21703Y', precioEUR: 2.32,
      // DERIVADO de las piezas reales (la fórmula 2×16 divergía ×2 del modelo
      // cuando el tensor no llevaba collarines — hallazgo del panel)
      necesario: 4 * res.LBP.parts.filter(p => /Collarín/.test(p.name)).length
               + 4 * res.GT.parts.filter(p => /Collarín/.test(p.name)).length,
      cotizado: 60,
      detalle: '2 por eje: motriz flanquean el sprocket central FIJO; tensor flanquean el sprocket de REFERENCIA (−Y)',
    },
    nosebar_LBP: { art: 'P22868', precioEUR: 38.73, necesario: 4 * 2 * 3, cotizado: 51, detalle: 'h19 C/RODAMIENTOS, L=6 in: 3 por punta × 2 puntas × 4 LBP' },
    nosebar_GT: { art: 'P22862', precioEUR: 31.0, necesario: 4 * 2 * 3, cotizado: 51, detalle: 'transfer plate C/RODAMIENTOS h19, L=6 in' },
    bar_cap: {
      art: 'P101203-30', precioEUR_m: 6.96,
      // metros DERIVADOS de las guías reales de ambos ensambles ×4 líneas
      necesario_m: r2((res.LBP.parts.filter(p => /Guía de apoyo/.test(p.name))
        .reduce((a, p) => a + (p.features.find(f => /Bar cap/.test(f.name))?.params.w || 0), 0)
        + res.GT.parts.filter(p => /Guía de apoyo/.test(p.name))
        .reduce((a, p) => a + (p.features.find(f => /Bar cap/.test(f.name))?.params.w || 0), 0)) * 4 / 1000),
      cotizado_m: 360,
      detalle: 'BAR CAP UHMW 17.53×19.05 p/pletina 12 — guía de APOYO enrollable (rollo 30 m)',
    },
    conical_rail_T1: { art: 'P12201C', precioEUR_m: 17.14, cotizado_m: 156, detalle: 'T-shape 1 in blanco/acero 1.5 — guía lateral/apoyo según layout' },
    conical_rail_T40: { art: 'P12401C', precioEUR_m: 18.63, cotizado_m: 105, detalle: 'T-shape 40 mm Ti-WHITE AISI304' },
    conical_rail_L114: {
      art: 'P12501C', precioEUR_m: 23.08,
      necesario_m: r2((res.LBP.parts.filter(p => /Guía lateral/.test(p.name))
        .reduce((a, p) => a + Math.max(...p.features.map(f => f.params?.w || 0)), 0)
        + res.GT.parts.filter(p => /Guía lateral/.test(p.name))
        .reduce((a, p) => a + Math.max(...p.features.map(f => f.params?.w || 0)), 0)) * 4 / 1000),
      cotizado_m: 105,
      detalle: 'L-shape 1¼ in Ti-WHITE AISI304 — guía LATERAL del modelo',
    },
  },
};
writeFileSync(join(here, 'lbp530_dims.json'), JSON.stringify(dims, null, 1));
console.log(`OK lbp530_dims.json · lazo LBP ${lazoLBP} m · lazo GT ${lazoGT} m`);


