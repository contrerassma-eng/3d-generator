#!/usr/bin/env node
// gen_estacion_b15.mjs — ESTACIÓN B1.5 v3 (cabezal CILÍNDRICO COMPACTO
// coaxial al poste, en norma — pedido del usuario: reemplazar la caja
// rectangular lateral de v2 por una envolvente cilíndrica normalizada):
//
//   - Poste continuo SCH40 1 1/2" hasta 1.78 m; sobre su hilo superior rosca
//     la BASE torneada del cabezal (hembra 1 1/2"-11.5 NPT) — el cap y las
//     abrazaderas del gabinete desaparecen.
//   - CABEZAL Ø125×~195: base y tapa torneadas (POM-C) + CUERPO DE TUBO
//     ESTÁNDAR PVC-U DN125 PN16 (EN ISO 1452, Ø125×7.4) fijado con 4+4
//     DIN 912 M4 radiales. Sellado por 2 tóricas radiales ISO 3601 104×3
//     FKM en gargantas regla Parker (Ø105.0 / prof. 2.55 / W 4.0 — 15 %).
//   - CERO prensaestopas de cable: el 100 % del cableado sube por DENTRO
//     del poste y entra por el conducto central de la base (Ø30 → plenum →
//     pasa-piso Ø15). Únicas penetraciones exteriores: receptáculo M12 de
//     servicio y válvula Gore en la cara INFERIOR del disco (sombra, sin
//     chorro). Goterón perimetral en la tapa.
//   - Electrónica en pila vertical: portapilas 2×26650 al piso + placa
//     portadora circular Ø100 (WisBlock + ADS1115 + BMS + bornera) sobre
//     3 columnas M4. Desecante recambiable al piso.
//   - Antena sobre pasamuro N/SMA de la tapa (~2.15 m). Ménsula del
//     pluviómetro AL POSTE, boca 1.235 m; escudo T/HR a 1.50 m (OMM N.º 8:
//     1.25–2 m); panel al norte en el poste.
//
// Alturas normativas aplicadas (ver webRef): OMM N.º 8 T/HR 1.25–2 m;
// pluviómetro: obstáculos a >=2× su altura sobre la boca (una estación
// compacta NO cumple 2× con su propio poste — sesgo declarado, igual que
// toda estación integrada comercial).
//
// Sonda enterrada idéntica a la variante B con SMT50 (ficha 01/2018).
// Coordenadas: Z arriba, z=0 = NPT, +Y = norte (ecuador). mm. Capa `user`.
// Uso: node cad/ensambles/gen_estacion_b15.mjs  → sonda_suelo_b15.json

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const r2 = (v) => Math.round(v * 100) / 100;
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const qAxis = (ax, deg) => {
  const a = (deg * Math.PI) / 180, s = Math.sin(a / 2);
  const n = Math.hypot(...ax);
  return [ax[0] / n * s, ax[1] / n * s, ax[2] / n * s, Math.cos(a / 2)].map(r6);
};
const qMul = (q, p) => {
  const [x1, y1, z1, w1] = q, [x2, y2, z2, w2] = p;
  return [
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
  ].map(r6);
};

let fid = 0;
const F = () => `f${++fid}`;
const parts = [];
const explode = {};
const P = (id, name, color, pos, features, opts = {}) => {
  parts.push({ id, name, color, pos: pos.map(r2), quat: opts.quat || [0, 0, 0, 1], fixed: !!opts.fixed, features });
  if (opts.explode) explode[id] = opts.explode;
};
const box = (w, d, h, at, op = 'union', name = 'Caja') =>
  ({ id: F(), name, shape: 'box', op, at: at.map(r2), dir: [0, 0, 1], params: { w: r2(w), d: r2(d), h: r2(h) } });
const cyl = (dia, h, at, dir = [0, 0, 1], op = 'union', name = 'Cilindro') =>
  ({ id: F(), name, shape: 'cylinder', op, at: at.map(r2), dir, params: { dia: r2(dia), h: r2(h) } });
const hole = (dia, at, dir, opts = {}) =>
  ({ id: F(), name: opts.name || `Agujero Ø${dia}`, shape: 'hole', op: 'cut', at: at.map(r2), dir, params: { dia: r2(dia), depth: opts.depth ?? 10, through: !!opts.through } });
const rectPat = (srcId, nx, ny, dx, dy) =>
  ({ id: F(), name: 'Patrón rect.', shape: 'pattern', op: 'pattern', at: [0, 0, 0], dir: [0, 0, 1], params: { sourceId: srcId, kind: 'rect', nx, ny, dx, dy, u: [1, 0, 0], v: [0, 1, 0] } });
const revolve = (pts, at, name) => ({
  id: F(), name, shape: 'revolve', op: 'union', at: at.map(r2), dir: [0, -1, 0],
  params: {
    entities: pts.map((p, i) => ({ type: 'line', a: [r2(p[0]), r2(p[1])], b: [r2(pts[(i + 1) % pts.length][0]), r2(pts[(i + 1) % pts.length][1])] })),
    axis: { a: [0, 0], b: [0, 1] }, u: [1, 0, 0],
  },
});
const revCut = (pts, at, name) => { const r = revolve(pts, at, name); r.op = 'cut'; return r; };
const torus = (ringR, csR, at, name) => ({
  id: F(), name, shape: 'revolve', op: 'union', at: at.map(r2), dir: [0, -1, 0],
  params: { entities: [{ type: 'circle', c: [r2(ringR), r2(csR)], r: r2(csR) }], axis: { a: [0, 0], b: [0, 1] }, u: [1, 0, 0] },
});
const sketch = (entities, h, at, dir, u, op = 'union', name = 'Extrusión') =>
  ({ id: F(), name, shape: 'sketch', op, at: at.map(r2), dir, params: { entities, h: r2(h), u } });
const hexEnt = (R) => {
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push([r2(R * Math.cos(i * Math.PI / 3)), r2(R * Math.sin(i * Math.PI / 3))]);
  return pts.map((pt, i) => ({ type: 'line', a: pt, b: pts[(i + 1) % 6] }));
};
const rectEnt = (x0, y0, x1, y1) => [
  { type: 'line', a: [x0, y0], b: [x1, y0] }, { type: 'line', a: [x1, y0], b: [x1, y1] },
  { type: 'line', a: [x1, y1], b: [x0, y1] }, { type: 'line', a: [x0, y1], b: [x0, y0] },
];
// cable realista: polilínea 3D de segmentos cilíndricos con solape
const cableFeats = (pts, dia, name) => {
  const out = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const L = Math.hypot(...d);
    if (L < 0.5) continue;
    const u = d.map(v => r6(v / L));
    const a2 = [a[0] - u[0] * 0.6, a[1] - u[1] * 0.6, a[2] - u[2] * 0.6];
    out.push(cyl(dia, L + 1.2, a2, u, 'union', `${name} tramo ${i + 1}`));
  }
  return out;
};

// abrazadera U al poste (visual): placa con paso Ø49
const strap = (z, name = 'Abrazadera U 1 1/2"') => [
  box(60, 60, 10, [0, 0, z], 'union', name),
  hole(49, [0, 0, z + 10], [0, 0, -1], { through: true, name: 'Paso poste' }),
  cyl(6, 58, [28, -29, z + 5], [0, 1, 0], 'union', 'Perno U izq.'),
  cyl(6, 58, [-28, -29, z + 5], [0, 1, 0], 'union', 'Perno U der.'),
  cyl(11, 4.4, [28, 30, z + 5], [0, 1, 0], 'union', 'Tuerca'),
  cyl(11, 4.4, [-28, 30, z + 5], [0, 1, 0], 'union', 'Tuerca'),
];

// ============================================================================
// SONDA ENTERRADA (idéntica a variante B con SMT50)
// ============================================================================
{
  const prof = [
    [0, 0], [2, 0], [25, 63], [25, 78], [21.2, 78],
    [21.2, 84], [18.8, 84], [18.8, 88], [21.2, 88],
    [21.2, 96], [0, 96],
  ];
  P('punta', '01 Punta cónica 316L (40°, ápice r2)', '#9aa5b1', [0, 0, -728],
    [revolve(prof, [0, 0, 0], 'Revolución punta')], { explode: [0, 0, -130] });
}
{
  const feats = [
    cyl(50, 700, [0, 0, 0], [0, 0, 1], 'union', 'Tubo Ø50'),
    cyl(42.6, 702, [0, 0, -1], [0, 0, 1], 'cut', 'Ánima Ø42.6'),
  ];
  [-200, -400, -600].forEach((zp, i) => {
    const az = [0, 120, 240][i] * Math.PI / 180;
    feats.push(hole(35, [25.5 * Math.cos(az), 25.5 * Math.sin(az), zp + 650],
      [-Math.cos(az), -Math.sin(az), 0], { depth: 16, name: `Taladro pasamuro Ø35 @ ${-zp} mm` }));
  });
  P('tubo', '02 Tubo portante PVC-U Ø50×3.7 L700 (EN 1452 PN16)', '#d8d3c4', [0, 0, -650], feats, { fixed: true });
}
[-200, -400, -600].forEach((zp, i) => {
  const azd = [0, 120, 240][i];
  const q = qMul(qAxis([0, 0, 1], azd), qAxis([0, 1, 0], 90));
  const rad = [Math.cos(azd * Math.PI / 180), Math.sin(azd * Math.PI / 180), 0];
  P(`sensor${i + 1}`, `0${3 + i} Sensor SMT50 #${i + 1} (${-zp / 10} cm, ±2 % VWC)`, '#3f8f4a', [0, 0, zp], [
    sketch([{ type: 'line', a: [-10.75, 10], b: [10.75, 10] }, { type: 'line', a: [10.75, 10], b: [10.75, 115] },
      { type: 'line', a: [10.75, 115], b: [0, 145] }, { type: 'line', a: [0, 145], b: [-10.75, 115] },
      { type: 'line', a: [-10.75, 115], b: [-10.75, 10] }], 8, [0, 4, 0], [0, -1, 0], [1, 0, 0], 'union', 'Hoja SMT50 (punta 30°)'),
    cyl(15, 22, [0, 0, -12], [0, 0, 1], 'union', 'Capuchón'),
    cyl(16.5, 2, [0, 0, 8], [0, 0, 1], 'union', 'Anillo capuchón'),
    cyl(4.8, 6, [0, 0, -18], [0, 0, 1], 'union', 'Cable 4 hilos'),
  ], { quat: q, explode: [rad[0] * 170, rad[1] * 170, 0] });
  P(`pasamuro${i + 1}`, `0${6 + i} Pasamuro sensor POM-C #${i + 1}`, '#e8e4da', [0, 0, zp], [
    cyl(34.6, 15.2, [0, 0, 14], [0, 0, 1], 'union', 'Cuerpo Ø34.6'),
    cyl(42, 4, [0, 0, 25.2], [0, 0, 1], 'union', 'Brida Ø42'),
    cyl(39, 1.2, [0, 0, 29.2], [0, 0, 1], 'union', 'Chaflán de brida'),
    hole(28, [0, 0, 30.4], [0, 0, -1], { depth: 2.4, name: 'Rebaje de potting Ø28' }),
    box(23, 9, 22, [0, 0, 12], 'cut', 'Ranura hoja 23×9'),
  ], { quat: q, explode: [rad[0] * 80, rad[1] * 80, 0] });
});
P('torica_punta', '09 Tórica FKM ISO 3601 36×3 (punta)', '#3b2f2f', [0, 0, -645.5],
  [torus(20.3, 1.5, [0, 0, 0], 'Toroide 36×3')], { explode: [0, 0, -80] });
P('transicion', '10 Terminal PVC-U Ø50 cementado × hembra 1 1/2" + disco M16', '#b9bdc4', [0, 0, 32], [
  revolve([[25.1, 2], [31.5, 2], [31.5, 34], [29, 42], [29, 74], [22.25, 74], [22.25, 48],
    [7, 48], [7, 44], [22, 44], [22, 18.6], [25.1, 18.6]], [0, 0, 0], 'Terminal + disco'),
  sketch(hexEnt(35.8), 14, [0, 0, 52], [0, 0, 1], [1, 0, 0], 'union', 'Hex de llave SW62'),
], { explode: [0, 0, 110] });
P('prensa_trans', '11 Prensaestopas Skintop MS-M16 (transición)', '#c9a227', [0, 0, 53], [
  cyl(19, 5, [0, 0, 0], [0, 0, 1], 'union', 'Capuchón'),
  cyl(17, 7, [0, 0, 5], [0, 0, 1], 'union', 'Cuerpo'),
  sketch(hexEnt(11.55), 8, [0, 0, 12], [0, 0, 1], [1, 0, 0], 'union', 'Hex SW20'),
  cyl(15.8, 7, [0, 0, 20], [0, 0, 1], 'union', 'Rosca M16'),
  hole(8, [0, 0, 0], [0, 0, 1], { depth: 4, name: 'Boca de cable' }),
], { explode: [0, 0, 180] });
P('collar', '12 Collar antipercolación HDPE (disco, sobre bentonita)', '#23282e', [0, 0, 0], [
  cyl(160, 6, [0, 0, 0], [0, 0, 1], 'union', 'Disco Ø160×6'),
  cyl(150, 1.2, [0, 0, 6], [0, 0, 1], 'union', 'Chaflán perimetral'),
  hole(50.6, [0, 0, 7.2], [0, 0, -1], { through: true, name: 'Bore Ø50.6' }),
  box(160, 2, 1.5, [0, 0, 5.7], 'cut', 'Ranura de drenaje X'),
  box(2, 160, 1.5, [0, 0, 5.7], 'cut', 'Ranura de drenaje Y'),
], { explode: [150, 0, -30] });
P('tapon_hinca', '13 Cap PVC Ø63 + taco (accesorio de hinca)', '#b9bdc4', [300, -180, 0], [
  cyl(63, 40, [0, 0, 0], [0, 0, 1], 'union', 'Cap PVC'),
  cyl(48, 25, [0, 0, 40], [0, 0, 1], 'union', 'Taco'),
], { explode: [80, -40, 0] });

// ============================================================================
// POSTE CONTINUO + CAP (la brida desaparece)
// ============================================================================
{
  const feats = [
    cyl(48.3, 1669, [0, 0, 0], [0, 0, 1], 'union', 'Cañería Ø48.3'),
    cyl(40.9, 1671, [0, 0, -1], [0, 0, 1], 'cut', 'Ánima Ø40.9'),
    hole(10, [-24.2, 0, 1064], [1, 0, 0], { depth: 8, name: 'Pasacables pluviómetro Ø10' }),
    cyl(14, 2.5, [-26.5, 0, 1064], [1, 0, 0], 'union', 'Grommet pluviómetro'),
    hole(10, [24.2, 0, 1406], [-1, 0, 0], { depth: 8, name: 'Pasacables escudo Ø10' }),
    cyl(14, 2.5, [26.5, 0, 1406], [-1, 0, 0], 'union', 'Grommet escudo'),
    hole(10, [0, 24.2, 1526], [0, -1, 0], { depth: 8, name: 'Pasacables panel Ø10' }),
    cyl(14, 2.5, [0, 26.5, 1526], [0, -1, 0], 'union', 'Grommet panel'),
    hole(8, [24.2, 0, 34], [-1, 0, 0], { depth: 8, name: 'Pasacables sensor de hoja Ø8' }),
    cyl(12, 2.5, [26.5, 0, 34], [-1, 0, 0], 'union', 'Grommet hoja'),
  ];
  for (let k = 0; k < 7; k++) {   // crestas de hilo NPT 1 1/2"-11.5 (paso 2.2)
    feats.push(cyl(49.1, 0.8, [0, 0, 2 + k * 2.2], [0, 0, 1], 'union', `Hilo inf. ${k + 1}`));
    feats.push(cyl(49.1, 0.8, [0, 0, 1652 + k * 2.2], [0, 0, 1], 'union', `Hilo sup. ${k + 1}`));
  }
  P('pilar', '14 Poste A53 SCH40 1 1/2" × 1669, hilo en puntas, galv. (cableado 100 % interior)', '#8f969c', [0, 0, 86], feats, { explode: [0, 0, 150] });
}

// ============================================================================
// CABEZAL CILÍNDRICO COAXIAL (v3): base torneada roscada al hilo superior del
// poste + cuerpo de TUBO ESTÁNDAR PVC-U DN125 PN16 (EN ISO 1452, Ø125×7.4,
// ID 110.2) + tapa torneada con goterón y pasamuro N/SMA. Sellado: 2 tóricas
// radiales ISO 3601 104×3 FKM en garganta regla Parker (piso Ø105.0, prof.
// 2.55, W 4.0 — apriete 15 %). SIN prensaestopas de cable: el cableado sube
// por dentro del poste y entra por el conducto central Ø30 → plenum →
// pasa-piso Ø15. Penetraciones exteriores solo en la cara INFERIOR del
// disco: receptáculo M12 de servicio y válvula Gore (sombra, sin chorro).
// Cavidad útil: Ø110.2 × z 1785–1901.
// ============================================================================
{
  // base: hub NPT hembra z1730–1755, disco Ø132 z1755–1765 (entradas por
  // abajo), espiga Ø110.1 z1765–1785 con garganta y piso integral z1779–1785;
  // plenum de cables z1765–1779 entre disco y piso.
  P('cabezal_base', '15 Cabezal: base POM-C torneada — hembra 1 1/2" NPT, disco de entradas, espiga c/tórica y piso', '#e8e4da', [0, 0, 1730], [
    revolve([[22.25, 0], [29, 0], [29, 25], [66, 25], [66, 35], [55.05, 35], [55.05, 55],
      [0.01, 55], [0.01, 49], [49, 49], [49, 35], [15, 35], [15, 25], [22.25, 25]], [0, 0, 0], 'Cuerpo torneado'),
    sketch(hexEnt(31.2), 12, [0, 0, 7], [0, 0, 1], [1, 0, 0], 'union', 'Hex de llave SW54'),
    revCut([[52.5, 39], [57, 39], [57, 43], [52.5, 43]], [0, 0, 0], 'Garganta tórica Ø105.0×2.55 W4 (Parker 15 %)'),
    hole(15, [38.1, 13.9, 56], [0, 0, -1], { depth: 8, name: 'Pasa-cables del piso Ø15' }),
    hole(12, [0, -41, 24], [0, 0, 1], { depth: 12, name: 'Rosca M12 receptáculo servicio' }),
    hole(12, [0, 41, 24], [0, 0, 1], { depth: 12, name: 'Rosca M12 válvula Gore' }),
  ], { explode: [0, 0, 90] });
  P('torica_base', '16 Tórica ISO 3601 104×3 FKM (base ↔ cuerpo)', '#3b2f2f', [0, 0, 1769.5],
    [torus(54, 1.5, [0, 0, 0], 'Toroide 104×3')], { explode: [0, 0, 150] });
  const feats = [
    cyl(125, 150, [0, 0, 0], [0, 0, 1], 'union', 'Tubo Ø125'),
    cyl(110.2, 152, [0, 0, -1], [0, 0, 1], 'cut', 'Ánima Ø110.2'),
  ];
  [45, 135, 225, 315].forEach((a, i) => {
    const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180);
    feats.push(hole(4.5, [c * 63, s * 63, 10], [-c, -s, 0], { depth: 15, name: `Paso M4 inferior ${i + 1}` }));
    feats.push(cyl(7, 3, [c * 63.5, s * 63.5, 10], [-c, -s, 0], 'union', `DIN 912 M4 inf. ${i + 1}`));
    feats.push(hole(4.5, [c * 63, s * 63, 140], [-c, -s, 0], { depth: 15, name: `Paso M4 superior ${i + 1}` }));
    feats.push(cyl(7, 3, [c * 63.5, s * 63.5, 140], [-c, -s, 0], 'union', `DIN 912 M4 sup. ${i + 1}`));
  });
  P('cabezal_cuerpo', '17 Cabezal: cuerpo tubo PVC-U DN125 PN16 EN ISO 1452 × 150 + 8× DIN 912 M4 radiales', '#bfc7cf', [0, 0, 1765], feats, { explode: [0, 0, 430] });
  P('torica_tapa', '18 Tórica ISO 3601 104×3 FKM (cuerpo ↔ tapa)', '#3b2f2f', [0, 0, 1904.5],
    [torus(54, 1.5, [0, 0, 0], 'Toroide 104×3')], { explode: [0, 0, 505] });
  P('cabezal_tapa', '19 Cabezal: tapa POM-C torneada — espiga c/tórica, goterón, pasamuro N/SMA', '#e8e4da', [0, 0, 1901], [
    revolve([[49, 0], [55.05, 0], [55.05, 14], [66, 14], [66, 22], [0.01, 22], [0.01, 8], [49, 8]], [0, 0, 0], 'Tapa torneada'),
    revCut([[52.5, 3], [57, 3], [57, 7], [52.5, 7]], [0, 0, 0], 'Garganta tórica Ø105.0×2.55 W4 (Parker 15 %)'),
    revCut([[58, 13], [61, 13], [61, 15.5], [58, 15.5]], [0, 0, 0], 'Goterón perimetral'),
    cyl(120, 2.5, [0, 0, 22], [0, 0, 1], 'union', 'Realce superior'),
    cyl(16, 5, [0, 0, 24.5], [0, 0, 1], 'union', 'Torreta pasamuro antena'),
    hole(6.5, [0, 0, 30.5], [0, 0, -1], { through: true, name: 'Pasamuro N/SMA Ø6.5' }),
  ], { explode: [0, 0, 560] });
}
// electrónica en pila vertical dentro del cilindro (cavidad Ø110.2, z 1785–1901)
P('columnas', '20 3× columna separadora M4 Al (piso → placa portadora)', '#98a2ac', [0, 0, 1785], [
  cyl(8, 81, [0, 48, 0], [0, 0, 1], 'union', 'Columna N'),
  cyl(8, 81, [-41.57, -24, 0], [0, 0, 1], 'union', 'Columna SO'),
  cyl(8, 81, [41.57, -24, 0], [0, 0, 1], 'union', 'Columna SE'),
], { explode: [0, 0, 260] });
P('portapilas', '21 Portapilas 2×26650 al piso (celdas verticales)', '#3a4148', [-6, 0, 1785], [
  box(60, 70, 5, [0, 0, 0], 'union', 'Base'),
  box(60, 4, 68, [0, -33, 5], 'union', 'Pared S'),
  box(60, 4, 68, [0, 33, 5], 'union', 'Pared N'),
  box(3, 62, 60, [0, 0, 5], 'union', 'Divisor central'),
  box(16, 16, 1.5, [-13.5, 0, 5], 'union', 'Contacto celda 1'),
  box(16, 16, 1.5, [13.5, 0, 5], 'union', 'Contacto celda 2'),
  box(44, 12, 1.5, [0, 0, 73], 'union', 'Puente superior'),
], { explode: [0, 0, 195] });
P('baterias', '22 2× LiFePO4 26650 (verticales)', '#5a7d9a', [-6, 0, 1792], [
  cyl(26.2, 65.2, [-13.5, 0, 0], [0, 0, 1], 'union', 'Celda 1'),
  cyl(26.2, 65.2, [13.5, 0, 0], [0, 0, 1], 'union', 'Celda 2'),
  cyl(8, 1.8, [-13.5, 0, 65.2], [0, 0, 1], 'union', 'Botón +'),
  cyl(8, 1.8, [13.5, 0, 65.2], [0, 0, 1], 'union', 'Botón +'),
  cyl(26.8, 0.6, [-13.5, 0, 8], [0, 0, 1], 'union', 'Ranura envoltura'),
  cyl(26.8, 0.6, [13.5, 0, 8], [0, 0, 1], 'union', 'Ranura envoltura'),
], { explode: [0, 0, 230] });
P('pcb', '23 Nodo: placa portadora circular Ø100 — WisBlock + ADS1115 + BMS + bornera', '#1f6e43', [0, 0, 1866], [
  cyl(100, 1.6, [0, 0, 0], [0, 0, 1], 'union', 'PCB Ø100'),
  box(25.5, 18, 3.1, [-30, 20, 1.6], 'union', 'Core LoRa'),
  box(15, 15.5, 3.5, [-30, -25, 1.6], 'union', 'RAK3172'),
  cyl(3, 1.6, [-19, -33, 1.6], [0, 0, 1], 'union', 'Conector u.FL'),
  box(10, 6, 2, [5, 25, 1.6], 'union', 'ADS1115'),
  box(20, 15, 8, [8, -22, 1.6], 'union', 'Buck aislado'),
  box(20, 40, 2.4, [35, 0, 1.6], 'union', 'BMS/cargador solar'),
  box(30, 16, 12, [0, -38, 1.6], 'union', 'Bornera bus + 12 V'),
  box(9, 7, 3.2, [-45.5, 10, 1.6], 'union', 'USB-C'),
  box(25, 2.5, 8.5, [-5, 33, 1.6], 'union', 'Header 2×10'),
  cyl(2, 1, [14, 38, 1.6], [0, 0, 1], 'union', 'LED estado'),
  cyl(2, 1, [20, 38, 1.6], [0, 0, 1], 'union', 'LED LoRa'),
  cyl(8, 0.8, [0, 48, -0.8], [0, 0, 1], 'union', 'Golilla columna N'),
  cyl(8, 0.8, [-41.57, -24, -0.8], [0, 0, 1], 'union', 'Golilla columna SO'),
  cyl(8, 0.8, [41.57, -24, -0.8], [0, 0, 1], 'union', 'Golilla columna SE'),
], { explode: [0, 0, 300] });
P('desecante', '24 Cápsula desecante Ø18 recambiable (al piso)', '#d9c37a', [43, -6, 1785], [
  cyl(18, 10, [0, 0, 0], [0, 0, 1], 'union', 'Cuerpo'),
  cyl(19, 2, [0, 0, 10], [0, 0, 1], 'union', 'Tapa perforada'),
  ...Array.from({ length: 6 }, (_, k) => {
    const a = k * Math.PI / 3;
    return hole(1.8, [5.5 * Math.cos(a), 5.5 * Math.sin(a), 12.5], [0, 0, -1], { depth: 2, name: `Perforación ${k + 1}` });
  }),
], { explode: [0, 0, 210] });

// penetraciones exteriores: SOLO bajo el disco de la base (sombra permanente,
// sin sol ni chorro directo — ya no hay prensaestopas de cable)
{
  const feats = [
    cyl(17, 6, [0, 0, 0], [0, 0, 1], 'union', 'Tuerca moleteada'),
    cyl(17.8, 0.8, [0, 0, 1], [0, 0, 1], 'union', 'Moleteado 1'),
    cyl(17.8, 0.8, [0, 0, 2.6], [0, 0, 1], 'union', 'Moleteado 2'),
    cyl(17.8, 0.8, [0, 0, 4.2], [0, 0, 1], 'union', 'Moleteado 3'),
    cyl(12, 8, [0, 0, 6], [0, 0, 1], 'union', 'Rosca M12'),
    cyl(14.5, 12, [0, 0, 14], [0, 0, 1], 'union', 'Cuerpo interior'),
  ];
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    feats.push(cyl(0.9, 2, [3.3 * Math.cos(a), 3.3 * Math.sin(a), -1.8], [0, 0, 1], 'union', `Pin ${k + 1}`));
  }
  feats.push(cyl(0.9, 2, [0, 0, -1.8], [0, 0, 1], 'union', 'Pin 5'));
  P('m12', '28 Receptáculo M12 A-cod 5p servicio (bajo el disco, al sur)', '#2b2f36', [0, -41, 1747], feats, { explode: [0, -70, -130] });
}
P('m12_tapa', '29 Tapa protectora M12 c/cadenilla', '#c9a227', [0, -41, 1733], [
  cyl(16, 9, [0, 0, 0], [0, 0, 1], 'union', 'Tapa'),
  cyl(16.8, 0.8, [0, 0, 1.5], [0, 0, 1], 'union', 'Moleteado 1'),
  cyl(16.8, 0.8, [0, 0, 3.5], [0, 0, 1], 'union', 'Moleteado 2'),
  cyl(16.8, 0.8, [0, 0, 5.5], [0, 0, 1], 'union', 'Moleteado 3'),
  box(5, 3, 4, [10, 0, 1], 'union', 'Oreja cadenilla'),
  hole(2, [10, -2, 3], [0, 1, 0], { through: true, name: 'Paso cadenilla' }),
], { explode: [0, -70, -180] });
P('vent', '30 Válvula Gore M12 (bajo el disco, al norte: nunca sol directo)', '#e0e0e0', [0, 41, 1746], [
  sketch(hexEnt(8.1), 8, [0, 0, 0], [0, 0, 1], [1, 0, 0], 'union', 'Cabeza hex SW14'),
  cyl(12, 9, [0, 0, 8], [0, 0, 1], 'union', 'Rosca'),
  hole(1.6, [6.2, 0, 4], [-1, 0, 0], { depth: 3, name: 'Venteo 1' }),
  hole(1.6, [-6.2, 0, 4], [1, 0, 0], { depth: 3, name: 'Venteo 2' }),
  hole(1.6, [0, 6.2, 4], [0, -1, 0], { depth: 3, name: 'Venteo 3' }),
  hole(1.6, [0, -6.2, 4], [0, 1, 0], { depth: 3, name: 'Venteo 4' }),
], { explode: [0, 70, -130] });

// ============================================================================
// INSTRUMENTOS AL POSTE (alturas normativas)
// ============================================================================
{
  const feats = [cyl(10, 55, [0, 0, 0], [0, 0, 1], 'union', 'Eje escudo'),
    box(170, 18, 5, [-80, 0, 50], 'union', 'Brazo (abrazadera al poste)')];
  for (let k = 0; k < 5; k++)
    feats.push(revolve([[6, 4.5], [37, 0], [40, 0], [40, 1.5], [8, 6], [6, 6]], [0, 0, k * 11], `Plato cónico ${k + 1}`));
  feats.push(cyl(8, 30, [0, 0, 14], [0, 0, 1], 'union', 'Sonda SHT40'));
  feats.push(cyl(3.5, 18, [0, 0, 44], [0, 0, 1], 'union', 'Cable de la sonda'));
  P('escudo_thr', '32 T/HR: SHT40 en escudo de radiación a 1.50 m (OMM 1.25–2 m)', '#e8e4da',
    [160, 0, 1470], feats, { explode: [170, 0, 0] });
}
P('pluviometro', '33 Pluviómetro Ø160 en ménsula AL POSTE (2 abrazaderas + cartela), boca 1.235 m', '#aab4bd', [0, 0, 0], [
  ...strap(1050), ...strap(1130),
  box(6, 40, 120, [-33, 0, 1040], 'union', 'Placa vertical'),
  box(150, 18, 5, [-108, 0, 1150], 'union', 'Brazo'),
  sketch([{ type: 'line', a: [-36, 1150], b: [-36, 1105] }, { type: 'line', a: [-36, 1105], b: [-120, 1150] },
    { type: 'line', a: [-120, 1150], b: [-36, 1150] }], 5, [0, 2.5, 0], [0, -1, 0], [1, 0, 0], 'union', 'Cartela'),
  cyl(90, 58, [-190, 0, 1155], [0, 0, 1], 'union', 'Cuerpo'),
  cyl(96, 3, [-190, 0, 1155], [0, 0, 1], 'union', 'Anillo base'),
  cyl(5, 8, [-150, 0, 1148], [0, 0, 1], 'union', 'Perno nivelación 1'),
  cyl(5, 8, [-210, 34.6, 1148], [0, 0, 1], 'union', 'Perno nivelación 2'),
  cyl(5, 8, [-210, -34.6, 1148], [0, 0, 1], 'union', 'Perno nivelación 3'),
  box(10, 14, 18, [-148, 0, 1162], 'union', 'Caja del reed'),
  hole(3, [-190, -44, 1158], [0, 1, 0], { depth: 4, name: 'Drenaje del cuerpo' }),
  revolve([[6, 0], [80, 18.5], [80, 21], [77, 21], [5, 2.2]], [-190, 0, 1213], 'Embudo cónico Ø160'),
  cyl(12, 3, [-152, 0, 1155], [0, 0, 1], 'union', 'Nivel de burbuja'),
  ...Array.from({ length: 8 }, (_, k) => {
    const a = k * Math.PI / 4;
    return cyl(1.6, 22, [-190 + 72 * Math.cos(a), 72 * Math.sin(a), 1234], [0, 0, 1], 'union', `Pincho antipájaros ${k + 1}`);
  }),
], { explode: [-190, 0, 40] });
P('sensor_hoja', '34 Humedad de hoja — al follaje (heladas/enfermedades)', '#7aa05a', [250, 150, 0], [
  cyl(8, 440, [0, 0, 0], [0, 0, 1], 'union', 'Varilla ref.'),
  box(60, 35, 3, [0, 30, 440], 'union', 'Placa capacitiva'),
], { explode: [140, 90, 0] });
P('soporte_panel', '35 Soporte panel al poste (abrazadera + brazo 20°)', '#98a2ac', [0, 0, 0], [
  ...strap(1570),
  box(24, 60, 14, [0, 45, 1582], 'union', 'Brazo +N'),
  box(80, 12, 10, [0, 68, 1594], 'union', 'Travesaño'),
  sketch([{ type: 'line', a: [32, 1582], b: [70, 1594] }, { type: 'line', a: [70, 1594], b: [32, 1594] },
    { type: 'line', a: [32, 1594], b: [32, 1582] }], 4, [-2, 0, 0], [1, 0, 0], [0, 1, 0], 'union', 'Cartela'),
  cyl(7, 3, [30, 68, 1604], [0, 0, 1], 'union', 'Perno panel 1'),
  cyl(7, 3, [-30, 68, 1604], [0, 0, 1], 'union', 'Perno panel 2'),
], { explode: [0, 120, 60] });
P('panel', '36 Panel solar 5 W ETFE al NORTE (20°)', '#20344d', [0, 60, 1640], [
  box(190, 130, 15, [0, 0, 0], 'union', 'Panel'),
  box(174, 114, 1.2, [0, 0, 14.4], 'cut', 'Rebaje del vidrio'),
  box(1.4, 114, 1, [-43.5, 0, 14.2], 'cut', 'Retícula v1'),
  box(1.4, 114, 1, [0, 0, 14.2], 'cut', 'Retícula v2'),
  box(1.4, 114, 1, [43.5, 0, 14.2], 'cut', 'Retícula v3'),
  box(174, 1.4, 1, [0, -28.5, 14.2], 'cut', 'Retícula h1'),
  box(174, 1.4, 1, [0, 28.5, 14.2], 'cut', 'Retícula h2'),
  box(34, 24, 6, [0, -30, -6], 'union', 'Caja de conexiones'),
], { quat: qAxis([1, 0, 0], -20), explode: [0, 180, 120] });
P('antena', '37 Antena 868/915 2 dBi sobre el pasamuro N/SMA de la tapa (~2.15 m)', '#30363f', [0, 0, 0], [
  cyl(14, 28, [0, 0, 1930], [0, 0, 1], 'union', 'Base N/SMA'),
  cyl(15.4, 1, [0, 0, 1934], [0, 0, 1], 'union', 'Moleteado SMA 1'),
  cyl(15.4, 1, [0, 0, 1937], [0, 0, 1], 'union', 'Moleteado SMA 2'),
  cyl(12, 3, [0, 0, 1958], [0, 0, 1], 'union', 'Espira 1'),
  cyl(12, 3, [0, 0, 1963], [0, 0, 1], 'union', 'Espira 2'),
  cyl(12, 3, [0, 0, 1968], [0, 0, 1], 'union', 'Espira 3'),
  cyl(10, 192, [0, 0, 1961], [0, 0, 1], 'union', 'Látigo'),
], { explode: [0, 0, 640] });

// ============================================================================
// CABLES (recorrido realista: cada instrumento entra al poste por su
// pasacables y sube por DENTRO hasta el cabezal — no hay bajadas exteriores)
// ============================================================================
P('cable_pluvio', '40 Cable pluviómetro (reed → pasacables del poste)', '#1c1f24', [0, 0, 0],
  cableFeats([[-146, 0, 1156], [-112, 0, 1150], [-64, 0, 1147], [-27, 0, 1150]], 5, 'Pluvio'),
  { explode: [-90, 0, 30] });
P('cable_escudo', '41 Cable SHT40 (escudo → pasacables del poste)', '#1c1f24', [0, 0, 0],
  cableFeats([[160, 0, 1528], [122, 0, 1519], [72, 0, 1504], [27, 0, 1492]], 4.5, 'Escudo'),
  { explode: [90, 0, 30] });
P('cable_panel', '42 Cable panel (caja de conexiones → pasacables)', '#1c1f24', [0, 0, 0],
  cableFeats([[0, 35, 1624], [0, 32, 1604], [0, 26, 1612]], 5, 'Panel'),
  { explode: [0, 90, 40] });
P('cable_hoja', '44 Cable sensor de hoja (enterrado somero → pasacables bajo)', '#1c1f24', [0, 0, 0],
  cableFeats([[248, 148, 12], [170, 100, 4], [90, 46, 3], [40, 12, 8], [26, 2, 32]], 4, 'Hoja'),
  { explode: [100, 60, 0] });

// ============================================================================
// BOM / pasos / features
// ============================================================================
const BOM = [
  { item: 1, id: 'punta', desig: 'Punta cónica 316L', mat: '316L torneado', cant: 1, nota: 'Única pieza torneada de acero; tórica 36×3 FKM' },
  { item: 2, id: 'tubo', desig: 'Tubo portante PVC-U Ø50×3.7 L700', mat: 'EN 1452 PN16', cant: 1, nota: 'Solo enterrado (dieléctrico)' },
  { item: 3, id: 'sensor1', desig: 'Sensor Truebner SMT50 (0–3 V)', mat: 'Truebner directo, EUR 71 c/u', cant: 3, nota: '135×21.5, ±2 % VWC minerales, 0–50 %, −20…+85 °C (ficha 01/2018)' },
  { item: 4, id: 'pasamuro1', desig: 'Pasamuro POM-C + potting PU', mat: 'POM-C', cant: 3, nota: 'Ranura 23×9; epoxi estructural en Ø35' },
  { item: 5, id: 'torica_punta', desig: 'Tórica ISO 3601 36×3', mat: 'FKM 75 Sh', cant: 1, nota: 'Garganta Parker 37.6/2.4/4.0 (17 %)' },
  { item: 6, id: 'transicion', desig: 'Terminal PVC-U Ø50 cementado × hembra 1 1/2" + disco POM M16', mat: 'PVC-U + POM', cant: 1, nota: 'Unión CEMENTADA PN16; el disco porta el Skintop que aísla el conducto' },
  { item: 7, id: 'prensa_trans', desig: 'Skintop MS-M16 transición', mat: 'Latón Ni', cant: 1, nota: '2.5 N·m' },
  { item: 8, id: 'pilar', desig: 'Poste NPS 1 1/2" SCH40 × 1669, hilo en puntas', mat: 'A53 galv. caliente', cant: 1, nota: 'Cableado 100 % interior; pasacables de goma por instrumento; retoque zinc-rich' },
  { item: 9, id: 'cabezal_base', desig: 'Cabezal: base torneada hembra 1 1/2" NPT + disco de entradas + espiga', mat: 'POM-C (o Al 6082 anodizado)', cant: 1, nota: 'Conducto central Ø30 → plenum → pasa-piso Ø15; garganta tórica regla Parker; hex SW54' },
  { item: 10, id: 'cabezal_cuerpo', desig: 'Cabezal: cuerpo tubo PVC-U DN125 PN16 × 150 (Ø125×7.4)', mat: 'EN ISO 1452-2', cant: 1, nota: 'Corte de tubo estándar de catálogo; 4+4 pasos M4 radiales' },
  { item: 11, id: 'cabezal_tapa', desig: 'Cabezal: tapa torneada c/goterón y pasamuro N/SMA', mat: 'POM-C', cant: 1, nota: 'Espiga con garganta Parker; goterón perimetral; torreta de antena' },
  { item: 12, id: 'torica_base', desig: '2× tórica ISO 3601 104×3', mat: 'FKM 75 Sh', cant: 2, nota: 'Garganta radial Ø105.0 / prof. 2.55 / W 4.0 — apriete 15 % (regla Parker); Molykote 111' },
  { item: 13, id: 'pcb', desig: 'Nodo WisBlock + ADS1115 + BMS + bornera en placa portadora circular Ø100', mat: 'RAK + FR4', cant: 1, nota: 'VWC=V/3·50; T=(V−0.5)/0.01 (ficha SMT50); sobre 3 columnas M4' },
  { item: 14, id: 'baterias', desig: '2× LiFePO4 26650 + portapilas al piso (celdas verticales)', mat: '—', cant: 1, nota: 'Pila vertical: aprovecha la sección circular' },
  { item: 16, id: 'm12', desig: 'M12 A-cod servicio + tapa c/cadenilla (bajo el disco)', mat: 'IEC 61076-2-101', cant: 1, nota: 'Grasa dieléctrica; cara inferior del disco: sombra permanente' },
  { item: 17, id: 'vent', desig: 'Válvula Gore M12 (bajo el disco)', mat: 'ePTFE', cant: 1, nota: 'Abajo: nunca sol directo ni chorro' },
  { item: 18, id: 'desecante', desig: 'Cápsula desecante Ø18 recambiable', mat: 'Sílica gel', cant: 1, nota: 'Al piso del cabezal; cambiar en cada servicio' },
  { item: 19, id: 'escudo_thr', desig: 'SHT40 + escudo de radiación a 1.50 m', mat: 'ASA/PC', cant: 1, nota: 'OMM N.º 8: T/HR a 1.25–2 m — CUMPLE' },
  { item: 20, id: 'pluviometro', desig: 'Pluviómetro balancín Ø160 en ménsula al poste', mat: 'ABS UV + reed', cant: 1, nota: 'Boca 1.235 m; 2 abrazaderas U + cartela; NIVELAR ±1°; pincho antipájaros; sesgo por poste cercano declarado (regla 2× OMM no aplica en estación compacta)' },
  { item: 21, id: 'sensor_hoja', desig: 'Humedad de hoja capacitiva', mat: 'FR4 recubierto', cant: 1, nota: 'Al follaje a altura de fruta' },
  { item: 22, id: 'panel', desig: 'Panel 5 W ETFE + soporte al poste 20°', mat: 'Al', cant: 1, nota: 'Al NORTE (ecuador); cable interior al poste' },
  { item: 23, id: 'antena', desig: 'Antena 868/915 2 dBi sobre pasamuro N/SMA de la tapa (~2.15 m)', mat: 'FV', cant: 1, nota: 'Jumper u.FL → N/SMA interior al cabezal' },
  { item: 24, id: 'collar', desig: 'Collar antipercolación HDPE Ø160', mat: 'HDPE 6 mm', cant: 1, nota: 'Sobre bentonita' },
  { item: 25, id: 'tapon_hinca', desig: 'Cap PVC + taco (hinca)', mat: 'PVC/madera', cant: 1, nota: '1 por flota' },
  { item: 26, id: null, desig: 'Kit 3× abrazadera U 1 1/2" inox c/placa', mat: 'A2/A4', cant: 1, nota: '2 pluvio + 1 escudo (panel trae la suya; el cabezal va roscado, sin abrazaderas)' },
  { item: 29, id: null, desig: 'Kit pasacables de goma (4× Ø10/Ø8) + cinta pasacables', mat: 'EPDM', cant: 1, nota: 'CABLEADO INTERIOR AL POSTE: cada instrumento entra al SCH40 junto a su montaje y sube al cabezal — cero cables ni prensas a la vista' },
  { item: 27, id: null, desig: 'Pica de tierra Cu 1.2 m + cable 6 mm² + abrazadera', mat: 'Cu', cant: 1, nota: 'Poste metálico con antena: un solo punto de tierra' },
  { item: 28, id: 'columnas', desig: 'Tornillería A4: 8× DIN 912 M4×8 radiales, 3× columna M4, M3 PCB; PTFE; anaerobio; Loctite 243', mat: 'A4-70 / Al', cant: 1, nota: '' },
];
const PASOS = [
  { n: 1, t: 'Recepción y verificación', partes: [], texto: 'BOM completa; tórica sin mordeduras; probar los 3 SMT50 en banco (aire/agua: V/3·50) y rotularlos por profundidad; nodo + carga solar OK.' },
  { n: 2, t: 'Punta → tubo', partes: ['punta', 'torica_punta', 'tubo'], texto: 'Engrasar tórica (Molykote 111), epoxi estructural en el collar (no sobre la tórica), insertar a tope con giro 90°. Curado 24 h vertical.' },
  { n: 3, t: 'Pasamuros POM-C', partes: ['tubo', 'pasamuro1', 'pasamuro2', 'pasamuro3'], texto: 'Pegar cada pasamuro en su Ø35 con epoxi estructural, ranura vertical. Curado 24 h.' },
  { n: 4, t: 'Sensores SMT50 + potting', partes: ['sensor1', 'sensor2', 'sensor3', 'tubo'], texto: 'Insertar hojas por las ranuras (zona sensora íntegra fuera del tubo), subir los 3 cables rotulados, potting PU hasta enrasar la brida.' },
  { n: 5, t: 'Transición cementada', partes: ['transicion', 'prensa_trans', 'tubo'], texto: 'CEMENTAR el terminal (cemento PVC presión, 1/4 de giro). Pegar el disco POM. Pasar el bus por su Skintop (2.5 N·m): conducto aislado del cuerpo. Curado 24 h.' },
  { n: 6, t: 'Poste y pesca de cables', partes: ['pilar', 'transicion'], texto: 'PTFE + anaerobio y roscar el poste a la transición (llave en el hex del fitting). Pesca con cinta guía desde el tope hacia cada pasacables lateral (pluvio, escudo, panel, hoja) y dejar hilos de nylon dentro. Subir el bus por el ánima hasta el tope. Zinc-rich.' },
  { n: 7, t: 'Cabezal: base al poste y entradas inferiores', partes: ['cabezal_base', 'pilar', 'm12', 'm12_tapa', 'vent'], texto: 'PTFE + anaerobio y roscar la BASE del cabezal al hilo superior (llave en el hex SW54), orientando el pasa-piso al NE. Sacar todos los cables por el conducto central y el pasa-piso Ø15. Roscar bajo el disco el receptáculo M12 de servicio (grasa dieléctrica + tapa) y la válvula Gore — quedan a la sombra, sin sol ni chorro.' },
  { n: 8, t: 'Electrónica (pila vertical)', partes: ['columnas', 'portapilas', 'baterias', 'pcb', 'desecante'], texto: '3 columnas M4 al piso, portapilas con 2×26650 verticales, placa portadora circular Ø100 (nodo WisBlock + ADS1115 + BMS + bornera; pantalla a tierra en un punto) sobre las columnas, desecante al piso. SMT50 a canales 0–2 + T multiplexada.' },
  { n: 9, t: 'Cuerpo, tapa y antena', partes: ['cabezal_cuerpo', 'torica_base', 'torica_tapa', 'cabezal_tapa', 'antena'], texto: 'Engrasar la tórica de la base (Molykote 111), calzar el tubo DN125 y fijar los 4 DIN 912 M4 radiales inferiores (0.8 N·m). Conectar el jumper u.FL → pasamuro N/SMA, engrasar la tórica de la tapa, calzarla y fijar los 4 M4 superiores. Roscar la antena a la torreta.' },
  { n: 10, t: 'Prueba de estanqueidad (GATE)', partes: ['punta', 'tubo', 'transicion', 'cabezal_cuerpo'], texto: 'Sonda: vacío −20 kPa 5 min o inmersión 1 m 30 min. Cabezal armado: inmersión 30 min con testigo de humedad. NO se instala sin pasar.' },
  { n: 11, t: 'Instalación en terreno', partes: ['tapon_hinca', 'collar', 'tubo', 'punta'], texto: 'Pilotar Ø45 a 750. Hincar con cap+taco hasta tubo a +50. Lechada nativa + bentonita últimos 300. Collar al ras. Roscar el poste completo. ATERRAR (pica 1.2 m).' },
  { n: 12, t: 'Instrumentos y puesta en marcha', partes: ['escudo_thr', 'pluviometro', 'sensor_hoja', 'soporte_panel', 'panel', 'cable_pluvio', 'cable_escudo', 'cable_panel', 'cable_hoja'], texto: 'Escudo T/HR a 1.50 m (OMM). Pluviómetro en su ménsula: NIVELAR ±1° y pincho antipájaros. Hoja al follaje. Panel al NORTE (20°). Cada cable entra al poste por su pasacables y sube al cabezal. Verificar canales y LoRaWAN; bitácora.' },
];
const FEATURES = [
  'CABEZAL CILÍNDRICO COMPACTO COAXIAL AL POSTE (v3, pedido del usuario): Ø125×~195, base y tapa torneadas + cuerpo de TUBO ESTÁNDAR PVC-U DN125 PN16 (EN ISO 1452) de catálogo — arquitectura de cabezal en poste como CropX/Sentek PLUS',
  'CERO prensaestopas de cable: el 100 % del cableado entra al SCH40 por pasacables de goma junto a cada instrumento y sube POR DENTRO hasta el conducto central del cabezal — ni un cable ni una prensa a la vista (mejor que ZL6/Sentek, que los amarran por fuera)',
  'Sellado en norma: 2× tórica radial ISO 3601 104×3 FKM en gargantas regla Parker (Ø105.0 / prof. 2.55 / W 4.0 — apriete 15 %); 8× DIN 912 M4 A4 radiales; goterón perimetral en la tapa',
  'Únicas penetraciones exteriores en la cara INFERIOR del disco de la base (receptáculo M12 de servicio + válvula Gore): sombra permanente, nunca sol ni chorro directo',
  'Alturas normativas: T/HR a 1.50 m (OMM N.º 8: 1.25–2 m), pluviómetro boca 1.235 m nivelable, antena ~2.15 m sobre la tapa (mejor horizonte LoRa)',
  'Ménsula del pluviómetro AL POSTE (2 abrazaderas U + cartela): rígida, nivelable, sin perforar la envolvente IP del cabezal',
  'Electrónica en pila vertical: 2×26650 al piso + placa portadora circular Ø100 sobre columnas — la sección circular se aprovecha completa; desecante recambiable al piso',
  'SMT50 ±2 % VWC (ficha 01/2018) + T/HR + lluvia + humedad de hoja: paridad METER ZL6/CropX en un solo poste',
  'Sesgo declarado del pluviómetro compacto: el poste a 190 mm no cumple la regla 2× de OMM — igual que toda estación integrada comercial; para pluviometría de referencia usar pluviómetro exento',
];
const WEB_REF = [
  { afirmacion: 'T/HR de aire a 1.25–2 m; pluviómetro con obstáculos a >=2× (mejor 4×) su altura sobre la boca', fuente: 'OMM Guía N.º 8 (CIMO)', url: 'https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/instruments-and-methods-of-observation-programme-imop/guide-instruments-and-methods-of-observation-wmo-no-8', acceso: '2026-07-20' },
  { afirmacion: 'SMT50: 135×21.5 mm, ±2 % VWC (minerales), 0–50 %, −20…+85 °C, 0–3 V, 3.3–30 V', fuente: 'Truebner SMT50 Flyer 01/2018', url: 'https://www.truebner.de/assets/download/SMT50_Flyer_EN.pdf', acceso: '2026-07-20' },
  { afirmacion: 'Por estación la competencia ofrece T/HR (ATMOS 14), pluviómetro y humedad de hoja (PHYTOS 31)', fuente: 'METER ZL6', url: 'https://metergroup.com/products/zl6/', acceso: '2026-07-20' },
  { afirmacion: 'La antena debe quedar por encima de la altura máxima del canopy (en poste/extensión si hace falta)', fuente: 'CropX installation guide', url: 'https://help.cropx.com/portal/en/kb/articles/cropx-sensor-v04-installation-guide-21-9-2023-1', acceso: '2026-07-20' },
];

const doc = {
  format: 'foto3d-cad', version: 1,
  meta: {
    nombre: 'Estación de suelo+clima B1.5 v3 — cabezal cilíndrico coaxial, alturas OMM',
    proyecto: 'SONDA-SUELO-IND', capa: 'user', variante: 'smt50-v3',
    subtitulo: 'SMT50 ×3 (±2 %) · cabezal Ø125 EN ISO 1452 + tóricas ISO 3601 · T/HR 1.5 m OMM · pluvio 1.24 m · entradas bajo el disco',
    etiquetaSensor: 'SMT50',
    fuente: 'gen_estacion_b15.mjs — v3: cabezal cilíndrico compacto en norma (tubo EN ISO 1452 + tóricas ISO 3601 regla Parker). Manual/dossier: manual_b15_capturas.mjs + manual_b15_pdf.py',
    fecha: '2026-07-20',
    desviaciones: [
      'v3 (pedido del usuario): la caja rectangular lateral de v2 se reemplaza por un CABEZAL CILÍNDRICO COMPACTO coaxial al poste — base/tapa torneadas POM-C + cuerpo de tubo estándar EN ISO 1452 DN125 y tóricas ISO 3601 en gargantas regla Parker; desaparecen el cap, las 2 abrazaderas del gabinete y TODOS los prensaestopas de cable.',
      'El acceso de servicio sube de 1.15 m (puerta de v2) a ~1.9 m (tapa superior, 4×M4): aceptado a cambio de eliminar todas las penetraciones de cable exteriores; se alcanza de pie, sin escalera.',
      'La electrónica pasa de placa de espalda rectangular a placa portadora circular Ø100 (mismos módulos WisBlock/ADS1115/BMS/bornera).',
      'Pluviómetro compacto: no cumple la regla 2× de OMM respecto del propio poste (sesgo declarado, común a toda estación integrada).',
    ],
    explode, pasos: PASOS, bom: BOM,
    consumibles: ['Cemento PVC presión + primer', 'Epoxi estructural', 'Potting PU', 'Molykote 111', 'PTFE + anaerobio', 'Loctite 243', 'Grasa dieléctrica', 'Bentonita', 'Zinc-rich', 'Silicona neutra (pasacables del poste)'],
    features: FEATURES, webRef: WEB_REF,
    costoEstimado: { proto: 'US$760–950', serie25: 'US$470–540' },
  },
  params: [], parts, constraints: [],
};
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'sonda_suelo_b15.json'), JSON.stringify(doc, null, 1));
console.log(`OK sonda_suelo_b15.json v3 (${parts.length} piezas)`);
