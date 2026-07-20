#!/usr/bin/env node
// gen_sonda_suelo.mjs — SONDA DE HUMEDAD DE SUELO MULTIPROFUNDIDAD, GRADO
// INDUSTRIAL (prototipo premium). Generador paramétrico → formato foto3d-cad.
//
// Fuente dimensional (capa `user`): informe del usuario "Industrial Upgrade of
// a Multi-Depth Soil-Moisture Probe — Parametric Geometry Package", que cita
// datasheets (Truebner SMT100, Fibox ARCA PC 150/60 HG, Lapp Skintop MS-M16,
// ISO 3601/AS568, DIN 912, EN 1452). Los valores CONFIRMED del informe se
// respetan; los RECOMMENDED se ajustan donde hay conflicto geométrico y la
// desviación queda anotada en `meta.desviaciones` y en los planos.
//
// DESVIACIONES DE INGENIERÍA respecto del informe (justificadas):
//  1. El PLC DIN (90 mm) y el Mean Well DDR-15 (90 mm) NO caben en el ARCA
//     150/60 (interior ≈ 49 mm útiles): se adopta la variante que el propio
//     informe ofrece (§3): nodo de PLACA ÚNICA (ESP32 industrial + RAK3172-T
//     + buck embarcado + RS-485), 2×26650 LiFePO4 planas + BMS.
//  2. El sello tórico 46×3 sobre registro hembra Ø50.2 deja pared 0.4 mm en el
//     acople Ø56 (inviable). Se sella con ESPIGA MACHO Ø42.4 dentro del tubo
//     (ID 42.6) y tórica ISO 3601 36×3 en garganta 37.6/2.4/4.0 (apriete 17 %,
//     regla Parker 15–25 % — misma regla del informe §5.4). Igual en punta y
//     cabezal.
//  3. Sensores SMT100 en espiga RADIAL (§ Recomendación 2 del informe) por
//     pasamuros POM-C torneado pegado en taladro Ø35 (un taladro por sección,
//     desfasados 120° → el tubo no se debilita en un mismo plano).
//
// Coordenadas: Z arriba, z=0 = nivel de terreno (NPT). Eje de la sonda en
// (0,0). Unidades mm. Capa `user` (diseño, no medición).
//
// Emite:
//   cad/ensambles/sonda_suelo.json       ensamble foto3d-cad (28 piezas)
//   cad/ensambles/sonda_suelo_dims.json  dims + BOM + pasos (fuente única
//                                        para planos PDF y HTML)
//
// Uso:  node cad/ensambles/gen_sonda_suelo.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const r2 = (v) => Math.round(v * 100) / 100;
const r6 = (v) => Math.round(v * 1e6) / 1e6;   // cuaterniones: NO redondear grueso

// --- cuaterniones (sin three) ------------------------------------------------
const qAxis = (ax, deg) => {
  const a = (deg * Math.PI) / 180, s = Math.sin(a / 2);
  const n = Math.hypot(...ax);
  return [ax[0] / n * s, ax[1] / n * s, ax[2] / n * s, Math.cos(a / 2)].map(r6);
};
const qMul = (q, p) => { // q ∘ p (aplica p primero, luego q)
  const [x1, y1, z1, w1] = q, [x2, y2, z2, w2] = p;
  return [
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
  ].map(r6);
};

// ============================================================================
// D — DIMENSIONES (fuente única; los planos y el HTML leen este objeto)
// ============================================================================
export const D = {
  // tubo portante PVC-U EN 1452 PN16, SOLO enterrado (informe: CONFIRMED OD).
  // El cabezal va ELEVADO ~0.9 m sobre NPT (estado del arte: CropX pide la
  // antena sobre el canopy máximo; Sentek PLUS y METER ZL6 montan la
  // electrónica y el panel en poste) — ver meta.webRef. El tramo aéreo es un
  // PILAR de cañería acero SCH40 1 1/2" con HILO NPT EN AMBAS PUNTAS y
  // pintura especial dúplex (spec del usuario).
  tubo: { OD: 50, pared: 3.7, ID: 42.6, L: 700, zBot: -650, zTop: 50 },
  // acople de transición 316L a nivel de suelo: espiga+tórica al PVC abajo,
  // rosca hembra 1 1/2"-11.5 NPT arriba, prensaestopas M16 interno (aísla el
  // conducto del cuerpo enterrado aunque el pilar inunde)
  trans: { zBase: 32, espigaL: 18, collarD: 56, collarH: 16, cuboD: 60, boreRosca: 44.5 },
  // pilar ASTM A53 SCH40 NPS 1 1/2": OD 48.3, pared 3.68, ID 40.9; hilo
  // 1 1/2"-11.5 NPT en ambas puntas; pintura dúplex (galv. + poliéster polvo)
  pilar: { OD: 48.3, pared: 3.68, ID: 40.9, z0: 86, z1: 896, L: 810, engage: 20, hilo: '1 1/2"-11.5 NPT' },
  // sensores Truebner SMT100 RS-485 (CONFIRMED 182×30×12, −40…+80 °C)
  sensor: { L: 182, W: 30, T: 12, profundidades: [-200, -400, -600], azimuts: [0, 120, 240] },
  // pasamuros sensor POM-C (pieza torneada, pegada con epoxi estructural)
  pasamuro: { taladro: 35, cuerpoD: 34.6, flangeD: 42, ranuraW: 31, ranuraT: 13 },
  // punta de penetración 316L (cono 40° incluido, ápice romo r2)
  punta: { baseD: 50, collarH: 15, conoH: 63, apexR: 2, espigaD: 42.4, espigaL: 18 },
  // sello tórico ISO 3601 36×3 FKM en espiga macho (garganta regla Parker 80 % CS)
  torica: { id: 36, cs: 3, gargantaFondoD: 37.6, gargantaProf: 2.4, gargantaW: 4, apriete: '17 %' },
  // acople de cabezal 316L: rosca hembra 1 1/2" NPT abajo + brida Ø90 con 4×M4
  acople: { bridaD: 90, bridaH: 8, cuboD: 60, cuboH: 50, boreRosca: 44.5, roscaProf: 30, cavidadD: 36, patronM4: 56, zBase: 866 },
  // prensaestopas Lapp Skintop MS-M16 (CONFIRMED: SW20, ØA 22, C 31, rosca 7)
  prensa: { rosca: 'M16×1.5', SW: 20, cuerpoD: 19, roscaD: 15.8, agujero: 16.5 },
  // gabinete Fibox ARCA PC 150/60 HG (CONFIRMED ext. 180×130×60, IP66/67, PU)
  gab: { L: 180, W: 130, Hbase: 52, Htapa: 8, pared: 3, zPiso: 924, patronM4: 56, patronTapaX: 168, patronTapaY: 118 },
  // electrónica de placa única (variante §3 del informe para H60)
  pcb: { L: 100, W: 90, t: 1.6, z: 933, cx: -30 },
  bateria: { d: 26.2, L: 65.2, n: 2, cx: 52 },
  // conector de servicio M12 A-cod (IEC 61076-2-101) + válvula Gore M12
  m12: { cutout: 12.5, x: 60, z: 950 },
  // antena exterior 868/915 MHz 2 dBi (látigo fibra de vidrio, soporte lateral)
  antena: { x: 100, zBase: 930, whipL: 195, whipD: 10 },
  // collar antipercolación POM-C (escudo de agua superficial sobre bentonita)
  collar: { boreD: 50.6, outerD: 160, hubH: 13, rimH: 4 },
  // panel solar 5 W + soporte de aluminio 15°
  panel: { L: 190, W: 130, t: 15, angulo: 14.93 },
  hinca: { collarD: 56, collarH: 20, espigaD: 42.2, espigaL: 15 },
};

const Z_TAPA = D.gab.zPiso + D.gab.Hbase;               // 126 — borde superior base
const Z_LID_TOP = Z_TAPA + 1.5 + D.gab.Htapa;           // 135.5 — cara superior tapa

// ============================================================================
// piezas
// ============================================================================
let fid = 0;
const F = () => `f${++fid}`;
const parts = [];
const explode = {};
const P = (id, name, color, pos, features, opts = {}) => {
  parts.push({ id, name, color, pos: pos.map(r2), quat: opts.quat || [0, 0, 0, 1], fixed: !!opts.fixed, features });
  if (opts.explode) explode[id] = opts.explode;
  return id;
};
const box = (w, d, h, at, op = 'union', name = 'Caja') =>
  ({ id: F(), name, shape: 'box', op, at: at.map(r2), dir: [0, 0, 1], params: { w: r2(w), d: r2(d), h: r2(h) } });
const cyl = (dia, h, at, dir = [0, 0, 1], op = 'union', name = 'Cilindro') =>
  ({ id: F(), name, shape: 'cylinder', op, at: at.map(r2), dir, params: { dia: r2(dia), h: r2(h) } });
const hole = (dia, at, dir, opts = {}) =>
  ({ id: F(), name: opts.name || `Agujero Ø${dia}`, shape: 'hole', op: 'cut', at: at.map(r2), dir, params: { dia: r2(dia), depth: opts.depth ?? 10, through: !!opts.through } });
const rectPat = (srcId, nx, ny, dx, dy) =>
  ({ id: F(), name: 'Patrón rect.', shape: 'pattern', op: 'pattern', at: [0, 0, 0], dir: [0, 0, 1], params: { sourceId: srcId, kind: 'rect', nx, ny, dx, dy, u: [1, 0, 0], v: [0, 1, 0] } });
const circPat = (srcId, n) =>
  ({ id: F(), name: 'Patrón circ.', shape: 'pattern', op: 'pattern', at: [0, 0, 0], dir: [0, 0, 1], params: { sourceId: srcId, kind: 'circ', n, angle: 360, axisAt: [0, 0, 0], axisDir: [0, 0, 1] } });
// revolución 360° de un polígono (u=radio, v=z local) alrededor del eje z local
const revolve = (pts, at, name, op = 'union') => ({
  id: F(), name, shape: 'revolve', op, at: at.map(r2), dir: [0, -1, 0],
  params: {
    entities: pts.map((p, i) => ({ type: 'line', a: [r2(p[0]), r2(p[1])], b: [r2(pts[(i + 1) % pts.length][0]), r2(pts[(i + 1) % pts.length][1])] })),
    axis: { a: [0, 0], b: [0, 1] }, u: [1, 0, 0],
  },
});
// tórica = revolución de un círculo (torо nominal)
const torus = (ringR, csR, at, name) => ({
  id: F(), name, shape: 'revolve', op: 'union', at: at.map(r2), dir: [0, -1, 0],
  params: { entities: [{ type: 'circle', c: [r2(ringR), r2(csR)], r: r2(csR) }], axis: { a: [0, 0], b: [0, 1] }, u: [1, 0, 0] },
});
const hexEntities = (R) => {
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push([r2(R * Math.cos(i * Math.PI / 3)), r2(R * Math.sin(i * Math.PI / 3))]);
  return pts.map((p, i) => ({ type: 'line', a: p, b: pts[(i + 1) % 6] }));
};
const sketch = (entities, h, at, dir, u, op = 'union', name = 'Extrusión') =>
  ({ id: F(), name, shape: 'sketch', op, at: at.map(r2), dir, params: { entities, h: r2(h), u } });
const rectEnt = (x0, y0, x1, y1) => [
  { type: 'line', a: [x0, y0], b: [x1, y0] }, { type: 'line', a: [x1, y0], b: [x1, y1] },
  { type: 'line', a: [x1, y1], b: [x0, y1] }, { type: 'line', a: [x0, y1], b: [x0, y0] },
];

// --- 01 PUNTA CÓNICA 316L ----------------------------------------------------
{
  const d = D.punta, g = D.torica;
  const zApex = D.tubo.zBot - d.collarH - d.conoH;      // -728
  const e = d.espigaD / 2, gb = g.gargantaFondoD / 2;
  const prof = [
    [0, 0], [d.apexR, 0], [d.baseD / 2, d.conoH], [d.baseD / 2, d.conoH + d.collarH],
    [e, d.conoH + d.collarH],
    [e, d.conoH + d.collarH + 6], [gb, d.conoH + d.collarH + 6],
    [gb, d.conoH + d.collarH + 6 + g.gargantaW], [e, d.conoH + d.collarH + 6 + g.gargantaW],
    [e, d.conoH + d.collarH + d.espigaL], [0, d.conoH + d.collarH + d.espigaL],
  ];
  P('punta', '01 Punta cónica 316L (40°, ápice r2)', '#9aa5b1', [0, 0, zApex],
    [revolve(prof, [0, 0, 0], 'Revolución punta')], { fixed: false, explode: [0, 0, -130] });
}

// --- 02 TUBO PORTANTE PVC-U --------------------------------------------------
{
  const t = D.tubo;
  const feats = [
    cyl(t.OD, t.L, [0, 0, 0], [0, 0, 1], 'union', 'Tubo Ø50'),
    cyl(t.ID, t.L + 2, [0, 0, -1], [0, 0, 1], 'cut', 'Ánima Ø42.6'),
  ];
  D.sensor.profundidades.forEach((zp, i) => {
    const az = D.sensor.azimuts[i] * Math.PI / 180;
    const zl = zp - t.zBot;
    feats.push(hole(D.pasamuro.taladro,
      [(t.OD / 2 + 0.5) * Math.cos(az), (t.OD / 2 + 0.5) * Math.sin(az), zl],
      [-Math.cos(az), -Math.sin(az), 0],
      { depth: 16, name: `Taladro pasamuro Ø35 @ ${-zp} mm` }));
  });
  P('tubo', '02 Tubo portante PVC-U Ø50×3.7 L700 (EN 1452 PN16)', '#d8d3c4',
    [0, 0, t.zBot], feats, { fixed: true });
}

// --- 03-05 SENSORES SMT100 + 06-08 PASAMUROS POM-C ---------------------------
D.sensor.profundidades.forEach((zp, i) => {
  const azd = D.sensor.azimuts[i];
  const q = qMul(qAxis([0, 0, 1], azd), qAxis([0, 1, 0], 90)); // +Z local → radial
  const rad = [Math.cos(azd * Math.PI / 180), Math.sin(azd * Math.PI / 180), 0];
  // sensor: hoja 182 radial (local +Z), 30 vertical (local X), 12 tangencial (local Y)
  P(`sensor${i + 1}`, `0${3 + i} Sensor SMT100 #${i + 1} (${-zp / 10} cm)`, '#2e6f40', [0, 0, zp], [
    box(D.sensor.W, D.sensor.T, D.sensor.L, [0, 0, 10], 'union', 'Hoja SMT100'),
    cyl(8, 14, [0, 0, -4], [0, 0, 1], 'union', 'Salida de cable'),
  ], { quat: q, explode: [rad[0] * 170, rad[1] * 170, 0] });
  // pasamuro POM-C: cuerpo Ø34.6 pegado en taladro Ø35 + brida exterior Ø42
  P(`pasamuro${i + 1}`, `0${6 + i} Pasamuro sensor POM-C #${i + 1}`, '#e8e4da', [0, 0, zp], [
    cyl(D.pasamuro.cuerpoD, 15.2, [0, 0, 14], [0, 0, 1], 'union', 'Cuerpo Ø34.6'),
    cyl(D.pasamuro.flangeD, 4, [0, 0, 25.2], [0, 0, 1], 'union', 'Brida Ø42'),
    box(D.pasamuro.ranuraW, D.pasamuro.ranuraT, 22, [0, 0, 12], 'cut', 'Ranura hoja 31×13'),
  ], { quat: q, explode: [rad[0] * 80, rad[1] * 80, 0] });
});

// --- 09-10 TÓRICAS FKM 36×3 --------------------------------------------------
{
  const ringR = (D.torica.gargantaFondoD + D.torica.cs) / 2; // 20.3
  P('torica_punta', '09 Tórica FKM ISO 3601 36×3 (punta)', '#3b2f2f', [0, 0, -645.5],
    [torus(ringR, 1.5, [0, 0, 0], 'Toroide 36×3')], { explode: [0, 0, -80] });
  P('torica_cabezal', '10 Tórica FKM ISO 3601 36×3 (transición)', '#3b2f2f', [0, 0, D.trans.zBase + 6.5],
    [torus(ringR, 1.5, [0, 0, 0], 'Toroide 36×3')], { explode: [0, 0, 40] });
}

// --- 11 ACOPLE DE CABEZAL 316L (rosca hembra 1 1/2\" NPT) ------------------
{
  const a = D.acople;
  const prof = [
    [a.boreRosca / 2, 0], [a.cuboD / 2, 0], [a.cuboD / 2, a.cuboH],
    [a.bridaD / 2, a.cuboH], [a.bridaD / 2, a.cuboH + a.bridaH],
    [a.cavidadD / 2, a.cuboH + a.bridaH], [a.cavidadD / 2, a.roscaProf],
    [a.boreRosca / 2, a.roscaProf],
  ];
  const m4 = hole(3.4, [a.patronM4 / 2, a.patronM4 / 2, a.cuboH + a.bridaH], [0, 0, -1], { depth: 8, name: 'Rosca M4 (previo Ø3.4)' });
  P('acople', '11 Acople de cabezal 316L (brida 4×M4 + hembra 1 1/2\" NPT)', '#8f9aa8', [0, 0, a.zBase], [
    revolve(prof, [0, 0, 0], 'Revolución acople'),
    m4, circPat(m4.id, 4),
  ], { explode: [0, 0, 480] });

  // acople de transición a nivel de suelo (espiga+tórica al PVC, hembra NPT arriba)
  const t = D.trans;
  const profT = [
    [15, 0], [21.2, 0],
    [21.2, 6], [18.8, 6], [18.8, 10], [21.2, 10],
    [21.2, t.espigaL], [t.collarD / 2, t.espigaL],
    [t.collarD / 2, t.espigaL + t.collarH], [t.cuboD / 2, t.espigaL + t.collarH],
    [t.cuboD / 2, 74], [t.boreRosca / 2, 74], [t.boreRosca / 2, 48],
    [7, 48], [7, 44], [18, 44], [18, t.espigaL], [15, t.espigaL],
  ];
  P('transicion', '31 Acople de transición 316L (espiga PVC + hembra 1 1/2\" NPT)', '#7d8896', [0, 0, t.zBase], [
    revolve(profT, [0, 0, 0], 'Revolución transición'),
  ], { explode: [0, 0, 110] });

  // pilar de cañería SCH40 1 1/2\" con hilo en ambas puntas, pintura dúplex
  const pl = D.pilar;
  P('pilar', '32 Pilar cañería A53 SCH40 1 1/2\" hilo en puntas (dúplex RAL 7016)', '#383e42', [0, 0, pl.z0], [
    cyl(pl.OD, pl.L, [0, 0, 0], [0, 0, 1], 'union', 'Cañería Ø48.3'),
    cyl(pl.ID, pl.L + 2, [0, 0, -1], [0, 0, 1], 'cut', 'Ánima Ø40.9'),
  ], { explode: [0, 0, 260] });
}

// --- 12 PRENSAESTOPAS SKINTOP MS-M16 + 13 CONTRATUERCA ------------------------
{
  const p = D.prensa;
  P('prensa', '12 Prensaestopas Lapp Skintop MS-M16 (IP68)', '#c9a227', [0, 0, D.gab.zPiso - 20], [
    cyl(p.cuerpoD, 12, [0, 0, 0], [0, 0, 1], 'union', 'Cuerpo de apriete'),
    sketch(hexEntities(p.SW / 2 / Math.cos(Math.PI / 6)), 8, [0, 0, 12], [0, 0, 1], [1, 0, 0], 'union', 'Hexágono SW20'),
    cyl(p.roscaD, 7, [0, 0, 20], [0, 0, 1], 'union', 'Rosca M16×1.5'),
    hole(10, [0, 0, 27], [0, 0, -1], { through: true, name: 'Paso de cable Ø10' }),
  ], { explode: [0, 0, 280] });
  P('prensa_trans', '33 Prensaestopas Skintop MS-M16 (transición)', '#c9a227', [0, 0, 53], [
    cyl(p.cuerpoD, 12, [0, 0, 0], [0, 0, 1], 'union', 'Cuerpo de apriete'),
    sketch(hexEntities(p.SW / 2 / Math.cos(Math.PI / 6)), 8, [0, 0, 12], [0, 0, 1], [1, 0, 0], 'union', 'Hexágono SW20'),
    cyl(p.roscaD, 7, [0, 0, 20], [0, 0, 1], 'union', 'Rosca M16×1.5'),
    hole(10, [0, 0, 27], [0, 0, -1], { through: true, name: 'Paso de cable Ø10' }),
  ], { explode: [0, 0, 180] });
  P('contratuerca', '13 Contratuerca M16 latón niquelado', '#c9a227', [0, 0, D.gab.zPiso + 3], [
    sketch([...hexEntities(12.7), { type: 'circle', c: [0, 0], r: 8.25 }], 4, [0, 0, 0], [0, 0, 1], [1, 0, 0], 'union', 'Tuerca SW22'),
  ], { explode: [0, 0, 350] });
}

// --- 14 GABINETE FIBOX ARCA (base) + 15 JUNTA PU + 16 TAPA ---------------------
{
  const g = D.gab;
  const bossX = g.patronTapaX / 2, bossY = g.patronTapaY / 2;   // 81, 56
  const boss = cyl(10, g.Hbase - 3, [bossX, bossY, 3], [0, 0, 1], 'union', 'Torreta esquina');
  const tapM4 = hole(3.4, [bossX, bossY, g.Hbase], [0, 0, -1], { depth: 12, name: 'Rosca tapa M4' });
  const m4piso = hole(4.5, [g.patronM4 / 2, g.patronM4 / 2, 0], [0, 0, 1], { depth: 4, name: 'Paso M4 piso' });
  P('gabinete', '14 Gabinete Fibox ARCA PC 150/60 HG (base, IP66/67)', '#bfc7cf', [0, 0, g.zPiso], [
    box(g.L, g.W, g.Hbase, [0, 0, 0], 'union', 'Cuerpo'),
    box(g.L - 2 * g.pared, g.W - 2 * g.pared, g.Hbase, [0, 0, g.pared], 'cut', 'Cavidad'),
    boss, rectPat(boss.id, 2, 2, -2 * bossX, -2 * bossY),
    tapM4, rectPat(tapM4.id, 2, 2, -2 * bossX, -2 * bossY),
    hole(D.prensa.agujero, [0, 0, 0], [0, 0, 1], { depth: 4, name: 'Paso prensaestopas Ø16.5' }),
    m4piso, rectPat(m4piso.id, 2, 2, -g.patronM4, -g.patronM4),
    hole(D.m12.cutout, [D.m12.x, -g.W / 2, D.m12.z - g.zPiso], [0, 1, 0], { depth: 4, name: 'Recorte M12 servicio' }),
    hole(D.m12.cutout, [D.m12.x, g.W / 2, D.m12.z - g.zPiso], [0, -1, 0], { depth: 4, name: 'Recorte válvula Gore' }),
    hole(6.5, [g.L / 2, 0, D.m12.z - g.zPiso], [-1, 0, 0], { depth: 4, name: 'Paso SMA antena Ø6.5' }),
  ], { explode: [0, 0, 210] });

  P('junta', '15 Junta de tapa PU (perimetral)', '#22262b', [0, 0, Z_TAPA], [
    sketch([...rectEnt(-88, -63, 88, 63), ...rectEnt(-85, -60, 85, 60)], 1.5, [0, 0, 0], [0, 0, 1], [1, 0, 0], 'union', 'Marco PU'),
  ], { explode: [0, 0, 300] });

  const lidHole = hole(4.5, [bossX, bossY, D.gab.Htapa], [0, 0, -1], { through: true, name: 'Paso tornillo tapa' });
  P('tapa', '16 Tapa Fibox ARCA (4×M4 A4 cautivos)', '#aab4bd', [0, 0, Z_TAPA + 1.5], [
    box(g.L, g.W, g.Htapa, [0, 0, 0], 'union', 'Tapa'),
    lidHole, rectPat(lidHole.id, 2, 2, -2 * bossX, -2 * bossY),
  ], { explode: [0, 0, 380] });
}

// --- 17-24 ELECTRÓNICA INTERIOR ----------------------------------------------
{
  const pcbHole = hole(3.4, [45, 40, 1.6], [0, 0, -1], { through: true, name: 'Fijación M3' });
  P('pcb', '17 PCB nodo: ESP32 ind. + RAK3172-T + buck + RS-485', '#1f6e43', [D.pcb.cx, 0, D.pcb.z], [
    box(D.pcb.L, D.pcb.W, D.pcb.t, [0, 0, 0], 'union', 'PCB 100×90'),
    box(25.5, 18, 3.1, [-30, 20, D.pcb.t], 'union', 'ESP32-WROOM-32E ind.'),
    box(15, 15.5, 3.5, [-30, -25, D.pcb.t], 'union', 'RAK3172-T LoRa'),
    box(10, 6, 2, [5, 25, D.pcb.t], 'union', 'RS-485 (THVD1450)'),
    box(20, 15, 8, [5, -25, D.pcb.t], 'union', 'Buck 12→3.3 aislado'),
    box(15, 10, 9, [32, -30, D.pcb.t], 'union', 'Borne bus'),
    pcbHole, rectPat(pcbHole.id, 2, 2, -90, -80),
  ], { explode: [0, 0, 330] });

  const sep = cyl(6, 6, [45, 40, 0], [0, 0, 1], 'union', 'Separador M3×6');
  P('separadores', '18 Separadores nylon M3×6 (4)', '#e8e4da', [D.pcb.cx, 0, D.gab.zPiso + 3], [
    sep, rectPat(sep.id, 2, 2, -90, -80),
  ], { explode: [0, 0, 290] });

  P('portapilas', '19 Portapilas 2×26650 (policarbonato)', '#3a4148', [D.bateria.cx, 0, D.gab.zPiso + 3], [
    box(60, 70, 5, [0, 0, 0], 'union', 'Base'),
    box(60, 4, 25, [0, -36.7, 0], 'union', 'Pared -Y'),
    box(60, 4, 25, [0, 36.7, 0], 'union', 'Pared +Y'),
  ], { explode: [0, 0, 300] });
  P('baterias', '20 2× LiFePO4 26650 (3.2 V, ~3300 mAh)', '#5a7d9a', [D.bateria.cx, 0, D.gab.zPiso + 21.1], [
    cyl(D.bateria.d, D.bateria.L, [-13.5, -D.bateria.L / 2, 0], [0, 1, 0], 'union', 'Celda 1'),
    cyl(D.bateria.d, D.bateria.L, [13.5, -D.bateria.L / 2, 0], [0, 1, 0], 'union', 'Celda 2'),
  ], { explode: [0, 0, 355] });
  P('bms', '21 BMS/cargador solar LiFePO4 2S', '#7a4a9e', [D.bateria.cx, 45, D.gab.zPiso + 3], [
    box(40, 20, 2, [0, 0, 0], 'union', 'BMS'),
  ], { explode: [0, 0, 320] });
  P('borne_bus', '22 Bloque de bornes bus RS-485 (riel adhesivo)', '#8a8f96', [14, -44, D.gab.zPiso + 3], [
    box(30, 16, 12, [0, 0, 0], 'union', 'Bornera'),
  ], { explode: [0, 0, 310] });
  P('desecante', '23 Cápsula desecante recambiable Ø30', '#d9c37a', [-66, -44, D.gab.zPiso + 3], [
    cyl(30, 15, [0, 0, 0], [0, 0, 1], 'union', 'Desecante'),
  ], { explode: [0, 0, 315] });
}

// --- 24 CONECTOR M12 + 25 TAPA M12 + 26 VÁLVULA GORE ---------------------------
{
  const qm = qAxis([1, 0, 0], -90);     // +Z local → +Y mundo
  P('m12', '24 Receptáculo M12 A-cod 5p IP68 (servicio bus)', '#2b2f36', [D.m12.x, -71, D.m12.z], [
    cyl(17, 6, [0, 0, 0], [0, 0, 1], 'union', 'Tuerca frontal'),
    cyl(12, 8, [0, 0, 6], [0, 0, 1], 'union', 'Rosca M12×1'),
    cyl(14.5, 12, [0, 0, 14], [0, 0, 1], 'union', 'Cuerpo interior'),
  ], { quat: qm, explode: [0, -110, 230] });
  P('m12_tapa', '25 Tapa protectora M12 c/cadenilla', '#c9a227', [D.m12.x, -83, D.m12.z], [
    cyl(16, 9, [0, 0, 0], [0, 0, 1], 'union', 'Tapa'),
  ], { quat: qm, explode: [0, -160, 230] });
  const qv = qAxis([1, 0, 0], 90);      // +Z local → −Y mundo
  P('vent', '26 Válvula de equilibrio Gore M12 (PMF200392)', '#e0e0e0', [D.m12.x, 73, D.m12.z], [
    cyl(15, 8, [0, 0, 0], [0, 0, 1], 'union', 'Cabeza vent.'),
    cyl(12, 6, [0, 0, 8], [0, 0, 1], 'union', 'Rosca M12'),
  ], { quat: qv, explode: [0, 110, 230] });
}

// --- 27 COLLAR ANTIPERCOLACIÓN + 28 PANEL SOLAR + 29 SOPORTE + 30 TAPÓN HINCA --
{
  const c = D.collar;
  const setscrew = hole(4.2, [0, 32, 11], [0, -1, 0], { depth: 8, name: 'Prisionero M5' });
  P('collar', '27 Collar antipercolación POM-C (sobre bentonita)', '#23282e', [0, 0, 0], [
    revolve([[c.boreD / 2, 0], [c.outerD / 2, 0], [c.outerD / 2, c.rimH], [31, c.hubH], [c.boreD / 2, c.hubH]], [0, 0, 0], 'Collar cónico'),
    setscrew, circPat(setscrew.id, 2),
  ], { explode: [150, 0, -30] });

  const cuna = [{ type: 'line', a: [-90, 0], b: [90, 0] }, { type: 'line', a: [90, 0], b: [-90, 48] }, { type: 'line', a: [-90, 48], b: [-90, 0] }];
  P('soporte_panel', '29 Soporte panel Al 5052 15° (2 cuñas)', '#98a2ac', [0, 0, Z_LID_TOP], [
    sketch(cuna, 4, [0, -53, 0], [0, -1, 0], [1, 0, 0], 'union', 'Cuña -Y'),
    sketch(cuna, 4, [0, 57, 0], [0, -1, 0], [1, 0, 0], 'union', 'Cuña +Y'),
  ], { explode: [0, 0, 450] });
  P('panel', '28 Panel solar 5 W ETFE marco Al (190×130)', '#20344d', [0, 0, Z_LID_TOP + 24.7], [
    box(D.panel.L, D.panel.W, D.panel.t, [0, 0, 0], 'union', 'Panel'),
  ], { quat: qAxis([0, 1, 0], D.panel.angulo), explode: [0, 0, 520] });

  const h = D.hinca;
  P('tapon_hinca', '30 Tapón de hinca 316L (accesorio de instalación)', '#77828e', [300, -180, 0], [
    revolve([[0.01, 0], [h.collarD / 2, 0], [h.collarD / 2, h.collarH], [h.espigaD / 2, h.collarH], [h.espigaD / 2, h.collarH + h.espigaL], [0.01, h.collarH + h.espigaL]], [0, 0, 0], 'Tapón'),
  ], { explode: [80, -40, 0] });

  // antena exterior en soporte lateral (+X), látigo sobre el nivel del panel
  const an = D.antena;
  P('antena', '31 Antena 868/915 MHz 2 dBi + soporte L (Al)', '#30363f', [an.x, 0, an.zBase], [
    box(4, 24, 46, [-8, 0, 0], 'union', 'Placa al gabinete (2×M4)'),
    box(20, 24, 4, [0, 0, 46], 'union', 'Ala superior'),
    cyl(14, 30, [2, 0, 50], [0, 0, 1], 'union', 'Base N/SMA'),
    cyl(an.whipD, an.whipL, [2, 0, 80], [0, 0, 1], 'union', 'Látigo fibra de vidrio'),
  ], { explode: [150, 0, 140] });
}

// ============================================================================
// BOM, pasos de ensamble, features (fuente única para PDF y HTML)
// ============================================================================
const BOM = [
  { item: 1, id: 'punta', desig: 'Punta cónica de penetración', mat: '316L torneado', cant: 1, nota: 'Cono 40° incl., ápice romo r2; espiga Ø42.4 c/garganta tórica' },
  { item: 2, id: 'tubo', desig: 'Tubo portante Ø50×3.7 L700 (enterrado)', mat: 'PVC-U EN 1452 PN16', cant: 1, nota: 'No metálico: no perturba el campo dieléctrico de los sensores' },
  { item: 3, id: 'sensor1', desig: 'Sensor humedad/T° SMT100 RS-485', mat: 'Truebner (compra)', cant: 3, nota: '182×30×12, −40…+80 °C, bus RS-485 único; prof. 20/40/60 cm' },
  { item: 4, id: 'pasamuro1', desig: 'Pasamuro de sensor torneado', mat: 'POM-C', cant: 3, nota: 'Pegado epoxi estructural en taladro Ø35; ranura 31×13 + potting PU' },
  { item: 5, id: 'torica_punta', desig: 'Tórica ISO 3601 36×3', mat: 'FKM (Viton) 75 Sh', cant: 2, nota: 'Punta y transición; garganta 37.6/2.4/4.0 — apriete 17 % (regla Parker 15–25 %)' },
  { item: 6, id: 'acople', desig: 'Acople de cabezal brida + hembra 1 1/2" NPT', mat: '316L torneado', cant: 1, nota: 'Brida Ø90, 4×M4 patrón 56×56, cavidad Ø36 p/prensaestopas; rosca al pilar con PTFE + anaerobio' },
  { item: 7, id: 'prensa', desig: 'Prensaestopas Skintop MS-M16', mat: 'Latón Ni (Lapp)', cant: 2, nota: '1 cabezal + 1 transición; IP68; apriete cuerpo 2.5 N·m; rango cable 4.5–10 mm' },
  { item: 8, id: 'contratuerca', desig: 'Contratuerca M16×1.5', mat: 'Latón Ni', cant: 1, nota: 'Por dentro del piso del gabinete' },
  { item: 9, id: 'gabinete', desig: 'Gabinete ARCA PC 150/60 HG', mat: 'Policarbonato (Fibox 6011313)', cant: 1, nota: 'IP66/67, IK08, −40…+80 °C; radio-transparente (antena interna)' },
  { item: 10, id: 'junta', desig: 'Junta de tapa PU', mat: 'PU (incluida Fibox)', cant: 1, nota: 'Inspeccionar en cada servicio; reemplazar si está marcada' },
  { item: 11, id: 'tapa', desig: 'Tapa gabinete', mat: 'PC (Fibox)', cant: 1, nota: 'Tornillos A4 cautivos, apriete 1.2 N·m en cruz' },
  { item: 12, id: 'pcb', desig: 'PCB nodo telemetría', mat: 'FR4 + conformal coating', cant: 1, nota: 'ESP32 ind. + RAK3172-T (−40…+85) + buck aislado + THVD1450' },
  { item: 13, id: 'separadores', desig: 'Separador M3×6', mat: 'Nylon', cant: 4, nota: '' },
  { item: 14, id: 'portapilas', desig: 'Portapilas 2×26650', mat: 'PC', cant: 1, nota: '' },
  { item: 15, id: 'baterias', desig: 'Celda LiFePO4 26650', mat: '—', cant: 2, nota: 'Ø26.2×65.2, ~2000 ciclos, rango térmico amplio' },
  { item: 16, id: 'bms', desig: 'BMS + cargador solar 2S LiFePO4', mat: '—', cant: 1, nota: 'MPPT p/panel 5 W' },
  { item: 17, id: 'borne_bus', desig: 'Bornera bus RS-485 + 12 V', mat: '—', cant: 1, nota: 'Blindaje del bus a tierra en un solo punto' },
  { item: 18, id: 'desecante', desig: 'Cápsula desecante recambiable', mat: 'Sílica gel indicadora', cant: 1, nota: 'Cambiar en cada servicio anual' },
  { item: 19, id: 'm12', desig: 'Receptáculo M12 A-cod 5 polos', mat: 'IEC 61076-2-101, IP68', cant: 1, nota: 'Desconexión de servicio del bus; grasa dieléctrica en contactos' },
  { item: 20, id: 'm12_tapa', desig: 'Tapa protectora M12 c/cadenilla', mat: 'Latón Ni', cant: 1, nota: '' },
  { item: 21, id: 'vent', desig: 'Válvula equilibrio presión M12', mat: 'Gore/ePTFE', cant: 1, nota: 'Evita bombeo de humedad por ciclado térmico (anti-condensación)' },
  { item: 22, id: 'collar', desig: 'Collar antipercolación Ø160', mat: 'POM-C', cant: 1, nota: 'Sobre sello de bentonita; 2 prisioneros M5; desagua radialmente' },
  { item: 23, id: 'panel', desig: 'Panel solar 5 W ETFE', mat: 'Marco Al', cant: 1, nota: '' },
  { item: 24, id: 'soporte_panel', desig: 'Soporte panel 15°', mat: 'Al 5052 plegado', cant: 1, nota: 'Orientar al ecuador; ángulo limpieza/lluvia' },
  { item: 25, id: 'tapon_hinca', desig: 'Tapón de hinca (accesorio)', mat: '316L', cant: 1, nota: 'Protege el tubo al hincar; se retira antes del cabezal' },
  { item: 26, id: null, desig: 'Tornillo DIN 912 M4×12', mat: 'A4-70', cant: 8, nota: '4 gabinete→acople (Loctite 243, 2 N·m) + 4 tapa' },
  { item: 27, id: null, desig: 'Tornillo DIN 912 M3×8 + tuerca', mat: 'A4-70', cant: 4, nota: 'PCB→separadores' },
  { item: 28, id: null, desig: 'Prisionero DIN 916 M5×8', mat: 'A4', cant: 2, nota: 'Collar antipercolación' },
  { item: 29, id: 'antena', desig: 'Antena 868/915 MHz 2 dBi látigo FV + soporte L', mat: 'Fibra vidrio / Al 5052', cant: 1, nota: 'Remata a ~1.2 m sobre NPT, por sobre el nivel del panel; 2×M4 al gabinete' },
  { item: 30, id: null, desig: 'Jumper SMA-hembra→SMA-macho 300 mm', mat: 'RG-316', cant: 1, nota: 'Paso Ø6.5 en pared +X, pasacables con junta + silicona neutra' },
  { item: 31, id: 'transicion', desig: 'Acople de transición espiga PVC + hembra 1 1/2" NPT', mat: '316L torneado', cant: 1, nota: 'A nivel de suelo; tórica 36×3 al PVC + prensaestopas M16 interno (aísla el conducto del cuerpo enterrado)' },
  { item: 32, id: 'pilar', desig: 'Pilar cañería NPS 1 1/2" SCH40 × 810, hilo en ambas puntas', mat: 'Acero ASTM A53; dúplex: galv. caliente + poliéster polvo RAL 7016', cant: 1, nota: 'OD 48.3 / pared 3.68; hilo 1 1/2"-11.5 NPT; hilos enmascarados al pintar y retocados zinc-rich; alternativa NPS 1" SCH40 si prima costo' },
];

const CONSUMIBLES = [
  'Epoxi estructural bicomponente (3M DP8005 / Scotch-Weld): punta→tubo, pasamuros→tubo',
  'Potting PU dieléctrico (p. ej. Wevo PU 403): cavidad de cada pasamuro de sensor',
  'Grasa de silicona para tóricas (Molykote 111) — nunca grasa mineral sobre FKM en PVC',
  'Loctite 243 en 4×M4 gabinete→acople y prisioneros M5',
  'Grasa dieléctrica en contactos M12',
  'Bentonita granular: sello anular 0…−300 mm al instalar',
  'Cinta PTFE solo en rosca M16 si el piso no queda plano (normalmente innecesaria: junta propia del prensaestopas)',
];

const PASOS = [
  { n: 1, t: 'Recepción y verificación', partes: [], texto: 'Verificar BOM completa. Inspeccionar tóricas (sin mordeduras), gargantas pulidas Ra≤1.6, taladros Ø35 del tubo sin rebabas. Probar continuidad y dirección Modbus de cada SMT100 en banco (ID 1/2/3 según profundidad) ANTES de montar.' },
  { n: 2, t: 'Punta → tubo', partes: ['punta', 'torica_punta', 'tubo'], texto: 'Engrasar (Molykote 111) la tórica 36×3 y montarla en la garganta de la espiga de la punta. Aplicar epoxi estructural en el collar de la espiga (NO sobre la tórica). Insertar en el tubo hasta el tope con giro suave de 90°. Limpiar excedente. Curado 24 h vertical.' },
  { n: 3, t: 'Pasamuros POM-C', partes: ['tubo', 'pasamuro1', 'pasamuro2', 'pasamuro3'], texto: 'Presentar cada pasamuro en su taladro Ø35 (brida contra el tubo, ranura vertical). Pegar con epoxi estructural en todo el perímetro del cuerpo Ø34.6. Verificar que la ranura 31×13 queda alineada con el eje del tubo. Curado 24 h.' },
  { n: 4, t: 'Sensores SMT100 + potting', partes: ['sensor1', 'sensor2', 'sensor3', 'pasamuro1', 'pasamuro2', 'pasamuro3', 'tubo'], texto: 'Pasar cordón de tiro por el tubo. Insertar cada hoja SMT100 por su ranura desde afuera (cable primero), dejando la zona sensora íntegramente fuera del tubo, en suelo no perturbado. Cablear el bus RS-485 en cadena (una sola pantalla). Rellenar la cavidad de cada pasamuro con potting PU hasta enrasar la brida. Curado según ficha.' },
  { n: 5, t: 'Acople de transición', partes: ['transicion', 'torica_cabezal', 'prensa_trans', 'tubo'], texto: 'Engrasar la tórica 36×3 y montarla en la garganta de la espiga de la transición. Insertar la espiga en el tubo hasta asentar el collar Ø56 (unión de servicio: el sello es la tórica). Pasar el cable de bus por el prensaestopas M16 interno de la transición y apretarlo a 2.5 N·m: el conducto del pilar queda AISLADO del cuerpo enterrado.' },
  { n: 6, t: 'Pilar SCH40 + acople de cabezal', partes: ['pilar', 'transicion', 'acople'], texto: 'PTFE (3 vueltas) + sellador anaerobio en el hilo inferior del pilar 1 1/2"-11.5 NPT y roscar a la transición (llave en el cubo Ø60, no sobre la pintura). Subir el cable por el ánima Ø40.9 con cordón de tiro. Igual sellado en el hilo superior y roscar el acople de cabezal hasta orientar su patrón M4. Retocar hilos expuestos con zinc-rich.' },
  { n: 7, t: 'Gabinete → acople + prensaestopas', partes: ['gabinete', 'acople', 'prensa', 'contratuerca'], texto: 'Subir la rosca M16 del Skintop del cabezal por el paso Ø16.5 del piso; contratuerca por dentro a 3 N·m; pasar el cable y apretar el cuerpo a 2.5 N·m. Alinear el patrón 56×56 con las 4 roscas M4 de la brida: 4× DIN 912 M4×12 A4 + Loctite 243, en cruz a 2 N·m.' },
  { n: 8, t: 'Electrónica interior', partes: ['separadores', 'pcb', 'portapilas', 'baterias', 'bms', 'borne_bus', 'desecante'], texto: 'Separadores nylon M3×6 → PCB (4×M3×8). Portapilas + 2×26650 LiFePO4 + BMS. Bornera del bus: aterrar pantalla en un solo punto. Conectar bus, alimentación y antena LoRa interna (el PC es radio-transparente). Colocar cápsula desecante.' },
  { n: 9, t: 'M12, válvula Gore y antena', partes: ['m12', 'm12_tapa', 'vent', 'antena', 'gabinete'], texto: 'Montar receptáculo M12 A-cod en el recorte Ø12.5 (pared −Y), tuerca interior, grasa dieléctrica, tapa con cadenilla. Válvula Gore M12 en la pared opuesta. Soporte L + antena 868/915 en la pared +X (2×M4); jumper SMA por el paso Ø6.5 con junta y silicona neutra. El látigo debe rematar SOBRE el nivel del panel.' },
  { n: 10, t: 'Prueba de estanqueidad (GATE)', partes: ['punta', 'tubo', 'acople', 'gabinete'], texto: 'ANTES de instalar: prueba de vacío −20 kPa / 5 min por el M12 (caída ≤ 1 kPa) o inmersión 1 m / 30 min con papel indicador interior. Si falla: revisar tóricas y potting. NO instalar una sonda que no pasó la prueba.' },
  { n: 11, t: 'Instalación en terreno', partes: ['tapon_hinca', 'collar', 'tubo', 'punta'], texto: 'Pilotar Ø45 a 750 mm con barreno. Colocar TAPÓN DE HINCA 316L en el tubo (nunca golpear el tubo ni el cabezal). Hincar hasta que la cara superior del tubo quede a +50 sobre NPT. Rellenar el anular con lechada de la misma tierra tamizada; últimos 300 mm con bentonita. Retirar tapón, montar cabezal completo. Collar antipercolación al ras del suelo, 2×M5.' },
  { n: 12, t: 'Cierre y puesta en marcha', partes: ['junta', 'tapa', 'panel', 'soporte_panel'], texto: 'Verificar junta PU limpia y asentada. Tapa 4×M4 A4 a 1.2 N·m en cruz. Soporte 15° + panel 5 W orientado al ecuador. Verificar lecturas Modbus de los 3 sensores y enlace LoRaWAN. Registrar IDs, RSSI y fotos del cierre en la bitácora del proyecto.' },
];

const FEATURES = [
  'Cabezal ELEVADO 0.9 m sobre PILAR de cañería acero NPS 1 1/2" SCH40 con hilo en ambas puntas y pintura dúplex (galv.+poliéster polvo) — estado del arte: CropX exige antena sobre el canopy; Sentek PLUS y METER ZL6 montan electrónica+panel en poste de acero. E=200 GPa: sin oscilación ni riesgo UV, aguanta impacto de maquinaria',
  'Acople de transición 316L a nivel de suelo con prensaestopas propio: el conducto del pilar queda aislado del cuerpo enterrado (doble barrera si el pilar llegara a inundarse)',
  'Antena exterior 868/915 MHz 2 dBi en soporte lateral, látigo a ~1.2 m (además el gabinete PC es radio-transparente como respaldo)',
  'Medición de humedad y temperatura a 20/40/60 cm con 3× Truebner SMT100 (±3 % VWC, −40…+80 °C) en un solo bus RS-485/Modbus',
  'Estanqueidad IP68 por doble tórica FKM 36×3 en gargantas según regla Parker (apriete 17 %) + prensaestopas Skintop MS-M16 + potting PU en sensores',
  'Cabezal Fibox ARCA PC 150/60 HG (IP66/67, IK08, −40…+80 °C) radio-transparente: antena LoRa interna, sin pasamuro de antena',
  'Válvula Gore M12: equilibrio de presión anti-condensación (elimina el bombeo de humedad por ciclado térmico)',
  'Conector M12 A-cod de servicio: el cabezal se desconecta del bus enterrado sin abrir el gabinete',
  'Energía autónoma: panel 5 W + 2× LiFePO4 26650 + BMS solar (química apta para 60–70 °C internos de verano)',
  'Materiales no perturbadores del campo dieléctrico en la zona de medición: PVC-U + POM-C (el 316L queda solo en punta y cabezal)',
  'Collar antipercolación Ø160 sobre sello de bentonita: corta el flujo preferencial de agua superficial junto al tubo (fuente nº1 de lecturas falsas)',
  'Instalación sin daño: tapón de hinca 316L sacrificial + pilotaje Ø45 + lechada nativa',
  'Servicio en campo: tapa 4 tornillos, desecante recambiable, tóricas de repuesto en kit',
];

const WEB_REF = [
  { afirmacion: 'La antena debe quedar por encima de la altura máxima del canopy (en poste/extensión si hace falta)', fuente: 'CropX Sensor Installation Guide', url: 'https://help.cropx.com/portal/en/kb/articles/cropx-sensor-v04-installation-guide-21-9-2023-1', acceso: '2026-07-20' },
  { afirmacion: 'El DTU de telemetría Sentek PLUS va con batería 12 V recargada por panel solar, montado junto a la sonda (poste), no enterrado ni a ras', fuente: 'Sentek PLUS Standard', url: 'https://sentektechnologies.com/products/telemetry-data-transfer/plus-standard/', acceso: '2026-07-20' },
  { afirmacion: 'El logger METER ZL6 se instala vertical en poste, con el panel solar orientado al ecuador y libre de vegetación', fuente: 'METER ZL6 User Guide', url: 'https://metergroup.com/products/zl6/', acceso: '2026-07-20' },
];

const DESVIACIONES = [
  'Cabezal elevado 900 mm sobre NPT (el informe lo dejaba implícitamente a ras): alineado con la práctica CropX/Sentek/METER (meta.webRef). Tramo aéreo = PILAR de cañería acero NPS 1 1/2" SCH40 con hilo NPT en ambas puntas y pintura dúplex (spec del usuario); el PVC-U queda solo enterrado. Sobre NPT no rige la restricción dieléctrica (sensores a -200/-400/-600).',
  'PLC DIN y DDR-15 (90 mm) no caben en ARCA 150/60 (interior útil 49 mm) → nodo de placa única (variante §3 del informe). Alternativa si se exige DIN: ARCA 190×190×90.',
  'Sello por espiga macho Ø42.4 + tórica 36×3 (en vez de registro hembra Ø50.2 + tórica 46×3: dejaba pared 0.4 mm en acople Ø56). Misma regla de garganta Parker del informe §5.4.',
  'Cono de punta 40° incluido ×63 mm (opción corta recomendada por el propio informe §5.1 cuando el largo preocupa).',
];

// ============================================================================
// salida
// ============================================================================
const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Sonda de humedad de suelo multiprofundidad — grado industrial (premium)',
    proyecto: 'SONDA-SUELO-IND',
    capa: 'user',
    fuente: 'Informe paramétrico del usuario (Truebner/Fibox/Lapp/ISO 3601/DIN 912 citados allí) + decisiones de ingeniería anotadas',
    fecha: '2026-07-20',
    desviaciones: DESVIACIONES,
    webRef: WEB_REF,
    explode,
    pasos: PASOS,
    bom: BOM,
    consumibles: CONSUMIBLES,
    features: FEATURES,
  },
  params: [],
  parts,
  constraints: [],
};

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'sonda_suelo.json'), JSON.stringify(doc, null, 1));
writeFileSync(join(here, 'sonda_suelo_dims.json'), JSON.stringify({
  D, Z_TAPA, Z_LID_TOP, bom: BOM, pasos: PASOS, consumibles: CONSUMIBLES,
  features: FEATURES, desviaciones: DESVIACIONES, webRef: WEB_REF,
}, null, 1));
console.log(`OK sonda_suelo.json (${parts.length} piezas) + sonda_suelo_dims.json`);
