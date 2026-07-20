#!/usr/bin/env node
// gen_estacion_b15.mjs — ESTACIÓN B1.5 v2 (arquitectura de POSTE, depurada con
// criterio de ingeniería sobre estética, como ZL6/Sentek/Davis):
//
//   - Poste continuo SCH40 1 1/2" hasta 1.78 m con CAP roscado (la brida y el
//     "cabezal integrado" desaparecen: menos piezas torneadas, más estándar).
//   - Gabinete LATERAL al poste (2 abrazaderas U por la espalda), PUERTA
//     VERTICAL AL SUR: no entra lluvia al abrir, servicio de pie a 1.15 m,
//     electrónica en placa de espalda, sombra propia sobre la puerta.
//   - TODAS las entradas de cable POR ABAJO con lazo de goteo (regla de oro
//     IP): bus, 2 superficie, M12 servicio, Gore y panel.
//   - Ménsula del pluviómetro AL TUBO (doble abrazadera + cartela), boca a
//     1.235 m, nivelable; escudo T/HR a 1.50 m (OMM N.º 8: 1.25–2 m);
//     panel al norte en el poste; antena al tope (~1.93 m).
//   - Bus de la sonda sube por DENTRO del poste y sale por salida lateral
//     Ø16 con pasacables, directo a su entrada inferior.
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
  hole(50.6, [0, 0, 6], [0, 0, -1], { through: true, name: 'Bore Ø50.6' }),
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
    hole(16, [0, -24.2, 1004], [0, 1, 0], { depth: 8, name: 'Salida lateral bus Ø16' }),
    cyl(20, 2.5, [0, -26.5, 1004], [0, 1, 0], 'union', 'Grommet de goma'),
  ];
  for (let k = 0; k < 7; k++) {   // crestas de hilo NPT 1 1/2"-11.5 (paso 2.2)
    feats.push(cyl(49.1, 0.8, [0, 0, 2 + k * 2.2], [0, 0, 1], 'union', `Hilo inf. ${k + 1}`));
    feats.push(cyl(49.1, 0.8, [0, 0, 1652 + k * 2.2], [0, 0, 1], 'union', `Hilo sup. ${k + 1}`));
  }
  P('pilar', '14 Poste A53 SCH40 1 1/2" × 1669, hilo en puntas, galv. + salida lateral Ø16', '#8f969c', [0, 0, 86], feats, { explode: [0, 0, 150] });
}
P('cap_poste', '15 Cap roscado 1 1/2" (sella el tope del poste)', '#9aa2a8', [0, 0, 1730], [
  revolve([[22.25, 0], [29, 0], [29, 35], [0.01, 35], [0.01, 25], [22.25, 25]], [0, 0, 0], 'Cap hembra'),
  sketch(hexEnt(31.2), 12, [0, 0, 23], [0, 0, 1], [1, 0, 0], 'union', 'Hex de llave SW54'),
], { explode: [0, 0, 260] });

// ============================================================================
// GABINETE VERTICAL LATERAL (puerta al SUR −Y; espalda al poste)
// ============================================================================
const QG = qAxis([1, 0, 0], 90);          // +Z local (puerta) → −Y mundo (sur)
const GAB = [0, -29, 1150];               // espalda a 5 mm del poste
const RG = (o) => [GAB[0] + o[0], GAB[1] - o[2], GAB[2] + o[1]];  // R_x(90)·o + GAB
{
  const bossX = 84, bossY = 59;
  const boss = cyl(10, 49, [bossX, bossY, 3], [0, 0, 1], 'union', 'Torreta esquina');
  const tapM4 = hole(3.4, [bossX, bossY, 52], [0, 0, -1], { depth: 12, name: 'Rosca tapa M4' });
  const entradas = [-66, -40, -14, 12, 38, 64];   // cara inferior (local −Y)
  P('gabinete', '16 Gabinete PC IP66/67 180×130×60 vertical (2 abrazaderas U por la espalda)', '#bfc7cf', GAB, [
    box(180, 130, 52, [0, 0, 0], 'union', 'Cuerpo'),
    box(174, 124, 52, [0, 0, 3], 'cut', 'Cavidad'),
    boss, rectPat(boss.id, 2, 2, -2 * bossX, -2 * bossY),
    tapM4, rectPat(tapM4.id, 2, 2, -2 * bossX, -2 * bossY),
    ...entradas.map((x, i) => hole(i >= 3 ? 12.5 : 16.5, [x, -65, 26], [0, 1, 0],
      { depth: 4, name: `Entrada inferior ${i + 1}` })),
  ], { quat: QG, explode: [0, -180, 0] });
  P('junta', '17 Junta de tapa PU (perimetral)', '#22262b', RG([0, 0, 52]), [
    sketch([...rectEnt(-88, -63, 88, 63), ...rectEnt(-85, -60, 85, 60)], 1.5, [0, 0, 0], [0, 0, 1], [1, 0, 0], 'union', 'Marco PU'),
  ], { quat: QG, explode: [0, -260, 0] });
  const lidHole = hole(4.5, [84, 59, 8], [0, 0, -1], { through: true, name: 'Paso tornillo tapa' });
  const scrHead = cyl(7, 3.5, [84, 59, 8], [0, 0, 1], 'union', 'Tornillo DIN912 M4');
  const scrHex = hole(3, [84, 59, 11.5], [0, 0, -1], { depth: 2, name: 'Boca allen' });
  P('tapa', '18 Puerta vertical (4×M4 cautivos + cordón de retención)', '#aab4bd', RG([0, 0, 53.5]), [
    box(180, 130, 8, [0, 0, 0], 'union', 'Puerta'),
    box(164, 114, 1.2, [0, 0, 6.9], 'cut', 'Rebaje estético 1 mm'),
    lidHole, rectPat(lidHole.id, 2, 2, -168, -118),
    scrHead, rectPat(scrHead.id, 2, 2, -168, -118),
    scrHex, rectPat(scrHex.id, 2, 2, -168, -118),
  ], { quat: QG, explode: [0, -340, 0] });
}
// electrónica en placa de espalda (vertical); posiciones = mismas locales rotadas
P('pcb', '19 Nodo: WisBlock + ADS1115 (SMT50) en placa de espalda', '#1f6e43', RG([-30, 0, 9]), [
  box(100, 90, 1.6, [0, 0, 0], 'union', 'PCB 100×90'),
  box(25.5, 18, 3.1, [-30, 20, 1.6], 'union', 'Core LoRa'),
  box(15, 15.5, 3.5, [-30, -25, 1.6], 'union', 'RAK3172'),
  box(10, 6, 2, [5, 25, 1.6], 'union', 'ADS1115'),
  box(20, 15, 8, [5, -25, 1.6], 'union', 'Buck aislado'),
  box(15, 10, 9, [32, -30, 1.6], 'union', 'Borne'),
], { quat: QG, explode: [0, -300, 0] });
P('separadores', '20 Separadores nylon M3×6 (4)', '#e8e4da', RG([-30, 0, 3]), [
  (() => { const c = cyl(6, 6, [45, 40, 0], [0, 0, 1], 'union', 'Separador'); return c; })(),
], { quat: QG, explode: [0, -260, 0] });
parts[parts.length - 1].features.push(rectPat(parts[parts.length - 1].features[0].id, 2, 2, -90, -80));
P('portapilas', '21 Portapilas 2×26650 (celdas verticales)', '#3a4148', RG([52, 0, 3]), [
  box(60, 70, 5, [0, 0, 0], 'union', 'Base'),
  box(60, 4, 25, [0, -36.7, 0], 'union', 'Pared'),
  box(60, 4, 25, [0, 36.7, 0], 'union', 'Pared'),
], { quat: QG, explode: [0, -270, 0] });
P('baterias', '22 2× LiFePO4 26650', '#5a7d9a', RG([52, 0, 21.1]), [
  cyl(26.2, 65.2, [-13.5, -32.6, 0], [0, 1, 0], 'union', 'Celda 1'),
  cyl(26.2, 65.2, [13.5, -32.6, 0], [0, 1, 0], 'union', 'Celda 2'),
  cyl(8, 1.8, [-13.5, 32.6, 0], [0, 1, 0], 'union', 'Botón +'),
  cyl(8, 1.8, [13.5, 32.6, 0], [0, 1, 0], 'union', 'Botón +'),
  cyl(26.8, 0.6, [-13.5, 24, 0], [0, 1, 0], 'union', 'Ranura envoltura'),
  cyl(26.8, 0.6, [13.5, 24, 0], [0, 1, 0], 'union', 'Ranura envoltura'),
], { quat: QG, explode: [0, -320, 0] });
P('bms', '23 BMS/cargador solar LiFePO4', '#7a4a9e', RG([52, 45, 3]), [
  box(40, 20, 2, [0, 0, 0], 'union', 'BMS'),
], { quat: QG, explode: [0, -290, 0] });
P('borne_bus', '24 Bornera bus + 12 V', '#8a8f96', RG([14, -44, 3]), [
  box(30, 16, 12, [0, 0, 0], 'union', 'Bornera'),
], { quat: QG, explode: [0, -280, 0] });
P('desecante', '25 Cápsula desecante Ø30', '#d9c37a', RG([-64, -40, 3]), [
  cyl(30, 15, [0, 0, 0], [0, 0, 1], 'union', 'Desecante'),
], { quat: QG, explode: [0, -285, 0] });

// entradas inferiores (todas apuntan hacia abajo, con lazo de goteo)
const BOT = 1085, YE = -55;
P('prensa', '26 Skintop M16 bus de sonda (entrada inferior)', '#c9a227', [-66, YE, BOT - 20], [
  cyl(19, 5, [0, 0, 0], [0, 0, 1], 'union', 'Capuchón'),
  cyl(17, 7, [0, 0, 5], [0, 0, 1], 'union', 'Cuerpo'),
  sketch(hexEnt(11.55), 8, [0, 0, 12], [0, 0, 1], [1, 0, 0], 'union', 'Hex SW20'),
  cyl(15.8, 11, [0, 0, 20], [0, 0, 1], 'union', 'Rosca M16'),
  hole(8, [0, 0, 0], [0, 0, 1], { depth: 4, name: 'Boca de cable' }),
], { explode: [0, 0, -140] });
P('prensas_superficie', '27 2× Skintop M16 superficie (pluvio + escudo/hoja)', '#c9a227', [-27, YE, BOT - 20], [
  cyl(19, 5, [-13, 0, 0], [0, 0, 1], 'union', 'Capuchón 1'),
  cyl(17, 7, [-13, 0, 5], [0, 0, 1], 'union', 'Cuerpo 1'),
  cyl(15.8, 11, [-13, 0, 20], [0, 0, 1], 'union', 'Rosca 1'),
  cyl(19, 5, [13, 0, 0], [0, 0, 1], 'union', 'Capuchón 2'),
  cyl(17, 7, [13, 0, 5], [0, 0, 1], 'union', 'Cuerpo 2'),
  cyl(15.8, 11, [13, 0, 20], [0, 0, 1], 'union', 'Rosca 2'),
], { explode: [0, 0, -180] });
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
  P('m12', '28 Receptáculo M12 A-cod 5p servicio (entrada inferior)', '#2b2f36', [12, YE, BOT - 6], feats, { explode: [0, 0, -120] });
}
P('m12_tapa', '29 Tapa protectora M12 c/cadenilla', '#c9a227', [12, YE, BOT - 18], [
  cyl(16, 9, [0, 0, 0], [0, 0, 1], 'union', 'Tapa'),
], { explode: [0, 0, -170] });
P('vent', '30 Válvula Gore M12 (cara inferior: nunca sol directo)', '#e0e0e0', [38, YE, BOT - 8], [
  sketch(hexEnt(8.1), 8, [0, 0, 0], [0, 0, 1], [1, 0, 0], 'union', 'Cabeza hex SW14'),
  cyl(12, 9, [0, 0, 8], [0, 0, 1], 'union', 'Rosca'),
  hole(1.6, [6.2, 0, 4], [-1, 0, 0], { depth: 3, name: 'Venteo 1' }),
  hole(1.6, [-6.2, 0, 4], [1, 0, 0], { depth: 3, name: 'Venteo 2' }),
  hole(1.6, [0, 6.2, 4], [0, -1, 0], { depth: 3, name: 'Venteo 3' }),
  hole(1.6, [0, -6.2, 4], [0, 1, 0], { depth: 3, name: 'Venteo 4' }),
], { explode: [0, 0, -150] });
P('entrada_panel', '31 Prensaestopas M12 cable del panel (inferior)', '#c9a227', [64, YE, BOT - 10], [
  cyl(16, 10, [0, 0, 0], [0, 0, 1], 'union', 'Cuerpo'),
  cyl(12, 9, [0, 0, 10], [0, 0, 1], 'union', 'Rosca M12'),
], { explode: [0, 0, -160] });

// ============================================================================
// INSTRUMENTOS AL POSTE (alturas normativas)
// ============================================================================
{
  const feats = [cyl(10, 55, [0, 0, 0], [0, 0, 1], 'union', 'Eje escudo'),
    box(170, 18, 5, [-80, 0, 50], 'union', 'Brazo (abrazadera al poste)')];
  for (let k = 0; k < 5; k++)
    feats.push(revolve([[6, 4.5], [37, 0], [40, 0], [40, 1.5], [8, 6], [6, 6]], [0, 0, k * 11], `Plato cónico ${k + 1}`));
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
P('antena', '37 Antena 868/915 2 dBi al tope (~1.93 m)', '#30363f', [0, 0, 0], [
  ...strap(1690),
  cyl(14, 30, [-45, 0, 1700], [0, 0, 1], 'union', 'Base N/SMA'),
  cyl(15.4, 1, [-45, 0, 1704], [0, 0, 1], 'union', 'Moleteado SMA 1'),
  cyl(15.4, 1, [-45, 0, 1707], [0, 0, 1], 'union', 'Moleteado SMA 2'),
  cyl(12, 3, [-45, 0, 1730], [0, 0, 1], 'union', 'Espira 1'),
  cyl(12, 3, [-45, 0, 1735], [0, 0, 1], 'union', 'Espira 2'),
  cyl(12, 3, [-45, 0, 1740], [0, 0, 1], 'union', 'Espira 3'),
  cyl(10, 192, [-45, 0, 1733], [0, 0, 1], 'union', 'Látigo'),
], { explode: [-140, 0, 100] });

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
  { item: 8, id: 'pilar', desig: 'Poste NPS 1 1/2" SCH40 × 1669, hilo en puntas', mat: 'A53 galv. caliente', cant: 1, nota: 'Salida lateral Ø16 c/pasacables de goma + goteo; retoque zinc-rich' },
  { item: 9, id: 'cap_poste', desig: 'Cap roscado 1 1/2" (tope del poste)', mat: 'Galv./PVC', cant: 1, nota: 'PTFE + anaerobio; reemplaza a la brida y al cabezal torneado' },
  { item: 10, id: 'gabinete', desig: 'Gabinete PC IP66/67 180×130×60 VERTICAL', mat: 'Fibox/Hammond PC', cant: 1, nota: 'Puerta al SUR (sombra propia, no entra lluvia al abrir); 2 abrazaderas U por la espalda; 6 entradas INFERIORES' },
  { item: 11, id: 'junta', desig: 'Junta PU + puerta 4×M4 + cordón retención', mat: 'PU / PC', cant: 1, nota: '1.2 N·m en cruz' },
  { item: 12, id: 'pcb', desig: 'Nodo WisBlock + ADS1115 en placa de espalda', mat: 'RAK + placa Al', cant: 1, nota: 'VWC=V/3·50; T=(V−0.5)/0.01 (ficha SMT50)' },
  { item: 13, id: 'baterias', desig: '2× LiFePO4 26650 + portapilas (celdas verticales) + BMS solar', mat: '—', cant: 1, nota: '' },
  { item: 14, id: 'prensa', desig: 'Skintop M16 bus (entrada inferior)', mat: 'Latón Ni', cant: 1, nota: 'Todas las entradas por ABAJO con lazo de goteo' },
  { item: 15, id: 'prensas_superficie', desig: '2× Skintop M16 superficie', mat: 'Latón Ni', cant: 2, nota: 'Pluviómetro (pulso) y escudo/hoja' },
  { item: 16, id: 'm12', desig: 'M12 A-cod servicio + tapa c/cadenilla (inferior)', mat: 'IEC 61076-2-101', cant: 1, nota: 'Grasa dieléctrica' },
  { item: 17, id: 'vent', desig: 'Válvula Gore M12 (cara inferior)', mat: 'ePTFE', cant: 1, nota: 'Abajo: nunca sol directo ni chorro' },
  { item: 18, id: 'entrada_panel', desig: 'Prensaestopas M12 cable panel (inferior)', mat: 'Latón Ni', cant: 1, nota: 'El cable del panel baja por el poste' },
  { item: 19, id: 'escudo_thr', desig: 'SHT40 + escudo de radiación a 1.50 m', mat: 'ASA/PC', cant: 1, nota: 'OMM N.º 8: T/HR a 1.25–2 m — CUMPLE' },
  { item: 20, id: 'pluviometro', desig: 'Pluviómetro balancín Ø160 en ménsula al poste', mat: 'ABS UV + reed', cant: 1, nota: 'Boca 1.235 m; 2 abrazaderas U + cartela; NIVELAR ±1°; pincho antipájaros; sesgo por poste cercano declarado (regla 2× OMM no aplica en estación compacta)' },
  { item: 21, id: 'sensor_hoja', desig: 'Humedad de hoja capacitiva', mat: 'FR4 recubierto', cant: 1, nota: 'Al follaje a altura de fruta' },
  { item: 22, id: 'panel', desig: 'Panel 5 W ETFE + soporte al poste 20°', mat: 'Al', cant: 1, nota: 'Al NORTE (ecuador); sobre la puerta: hace de alero' },
  { item: 23, id: 'antena', desig: 'Antena 868/915 2 dBi al tope (~1.93 m)', mat: 'FV', cant: 1, nota: 'Jumper RG-316 baja por el poste a entrada inferior' },
  { item: 24, id: 'collar', desig: 'Collar antipercolación HDPE Ø160', mat: 'HDPE 6 mm', cant: 1, nota: 'Sobre bentonita' },
  { item: 25, id: 'tapon_hinca', desig: 'Cap PVC + taco (hinca)', mat: 'PVC/madera', cant: 1, nota: '1 por flota' },
  { item: 26, id: null, desig: 'Kit 5× abrazadera U 1 1/2" inox c/placa', mat: 'A2/A4', cant: 1, nota: '2 gabinete + 2 pluvio + 1 escudo (panel y antena traen la suya)' },
  { item: 27, id: null, desig: 'Pica de tierra Cu 1.2 m + cable 6 mm² + abrazadera', mat: 'Cu', cant: 1, nota: 'Poste metálico con antena: un solo punto de tierra' },
  { item: 28, id: null, desig: 'Tornillería A4: M4 tapa/placa espalda, M3 PCB; PTFE; anaerobio; Loctite 243', mat: 'A4-70', cant: 1, nota: '' },
];
const PASOS = [
  { n: 1, t: 'Recepción y verificación', partes: [], texto: 'BOM completa; tórica sin mordeduras; probar los 3 SMT50 en banco (aire/agua: V/3·50) y rotularlos por profundidad; nodo + carga solar OK.' },
  { n: 2, t: 'Punta → tubo', partes: ['punta', 'torica_punta', 'tubo'], texto: 'Engrasar tórica (Molykote 111), epoxi estructural en el collar (no sobre la tórica), insertar a tope con giro 90°. Curado 24 h vertical.' },
  { n: 3, t: 'Pasamuros POM-C', partes: ['tubo', 'pasamuro1', 'pasamuro2', 'pasamuro3'], texto: 'Pegar cada pasamuro en su Ø35 con epoxi estructural, ranura vertical. Curado 24 h.' },
  { n: 4, t: 'Sensores SMT50 + potting', partes: ['sensor1', 'sensor2', 'sensor3', 'tubo'], texto: 'Insertar hojas por las ranuras (zona sensora íntegra fuera del tubo), subir los 3 cables rotulados, potting PU hasta enrasar la brida.' },
  { n: 5, t: 'Transición cementada', partes: ['transicion', 'prensa_trans', 'tubo'], texto: 'CEMENTAR el terminal (cemento PVC presión, 1/4 de giro). Pegar el disco POM. Pasar el bus por su Skintop (2.5 N·m): conducto aislado del cuerpo. Curado 24 h.' },
  { n: 6, t: 'Poste y cap', partes: ['pilar', 'transicion', 'cap_poste'], texto: 'PTFE + anaerobio y roscar el poste a la transición (llave en el hex del fitting). Subir el bus por el ánima y sacarlo por la SALIDA LATERAL Ø16 con su pasacables de goma. Cap roscado al tope. Retoque zinc-rich.' },
  { n: 7, t: 'Gabinete al poste', partes: ['gabinete', 'pilar'], texto: 'Colgar el gabinete por la espalda con 2 abrazaderas U (puerta al SUR). Verificar vertical. El bus baja de la salida lateral con LAZO DE GOTEO y entra por su prensaestopas inferior.' },
  { n: 8, t: 'Electrónica (placa de espalda)', partes: ['separadores', 'pcb', 'portapilas', 'baterias', 'bms', 'borne_bus', 'desecante'], texto: 'Placa de espalda con nodo WisBlock+ADS1115, portapilas con celdas verticales, BMS, bornera (pantalla a tierra en un punto), desecante. SMT50 a canales 0–2 + T multiplexada.' },
  { n: 9, t: 'Entradas inferiores', partes: ['prensa', 'prensas_superficie', 'm12', 'm12_tapa', 'vent', 'entrada_panel', 'gabinete'], texto: 'Montar TODAS las entradas en la cara inferior: bus, 2 superficie, M12 servicio (grasa dieléctrica + tapa), válvula Gore y entrada del panel. Cada cable con lazo de goteo.' },
  { n: 10, t: 'Prueba de estanqueidad (GATE)', partes: ['punta', 'tubo', 'transicion', 'gabinete'], texto: 'Sonda: vacío −20 kPa 5 min o inmersión 1 m 30 min. Gabinete armado: inmersión 30 min con testigo. NO se instala sin pasar.' },
  { n: 11, t: 'Instalación en terreno', partes: ['tapon_hinca', 'collar', 'tubo', 'punta'], texto: 'Pilotar Ø45 a 750. Hincar con cap+taco hasta tubo a +50. Lechada nativa + bentonita últimos 300. Collar al ras. Roscar el poste completo. ATERRAR (pica 1.2 m).' },
  { n: 12, t: 'Instrumentos y puesta en marcha', partes: ['escudo_thr', 'pluviometro', 'sensor_hoja', 'soporte_panel', 'panel', 'antena', 'tapa', 'junta'], texto: 'Escudo T/HR a 1.50 m (OMM). Pluviómetro en su ménsula: NIVELAR ±1° y pincho antipájaros. Hoja al follaje. Panel al NORTE (20°), antena al tope. Cordón de retención + puerta 1.2 N·m en cruz. Verificar canales y LoRaWAN; bitácora.' },
];
const FEATURES = [
  'ESTACIÓN DE POSTE v2 (ingeniería sobre estética): puerta VERTICAL al sur — no entra lluvia al abrir, servicio de pie a 1.15 m, panel como alero de la puerta',
  'TODAS las entradas de cable por la cara INFERIOR con lazo de goteo (la regla de oro IP en gabinetes de intemperie) — incluida la válvula Gore, que abajo nunca recibe sol ni chorro directo',
  'Alturas normativas: T/HR a 1.50 m (OMM N.º 8: 1.25–2 m), pluviómetro boca 1.235 m nivelable, antena ~1.93 m, puerta a 1.15 m',
  'Ménsula del pluviómetro AL POSTE (2 abrazaderas U + cartela): rígida, nivelable, sin perforar la envolvente IP del gabinete',
  'Poste continuo SCH40 con cap: desaparecen la brida y el cabezal torneado (menos piezas, más ferretería estándar); el bus viaja protegido por dentro y sale por pasacables lateral',
  'SMT50 ±2 % VWC (ficha 01/2018) + T/HR + lluvia + humedad de hoja: paridad METER ZL6/CropX en un solo poste',
  'Sesgo declarado del pluviómetro compacto: el poste a 190 mm no cumple la regla 2× de OMM — igual que toda estación integrada comercial; para pluviometría de referencia usar pluviómetro exento',
];
const WEB_REF = [
  { afirmacion: 'T/HR de aire a 1.25–2 m; pluviómetro con obstáculos a >=2× (mejor 4×) su altura sobre la boca', fuente: 'OMM Guía N.º 8 (CIMO)', url: 'https://community.wmo.int/site/knowledge-hub/programmes-and-initiatives/instruments-and-methods-of-observation-programme-imop/guide-instruments-and-methods-of-observation-wmo-no-8', acceso: '2026-07-20' },
  { afirmacion: 'SMT50: 135×21.5 mm, ±2 % VWC (minerales), 0–50 %, −20…+85 °C, 0–3 V, 3.3–30 V', fuente: 'Truebner SMT50 Flyer 01/2018', url: 'https://www.truebner.de/assets/download/SMT50_Flyer_EN.pdf', acceso: '2026-07-20' },
  { afirmacion: 'Por estación la competencia ofrece T/HR (ATMOS 14), pluviómetro y humedad de hoja (PHYTOS 31)', fuente: 'METER ZL6', url: 'https://metergroup.com/products/zl6/', acceso: '2026-07-20' },
];

const doc = {
  format: 'foto3d-cad', version: 1,
  meta: {
    nombre: 'Estación de suelo+clima B1.5 v2 — poste, alturas OMM',
    proyecto: 'SONDA-SUELO-IND', capa: 'user', variante: 'smt50-v2',
    subtitulo: 'SMT50 ×3 (±2 %) · T/HR 1.5 m OMM · pluvio 1.24 m · puerta sur · entradas inferiores',
    etiquetaSensor: 'SMT50',
    fuente: 'gen_estacion_b15.mjs — depuración de ingeniería (alturas OMM, ménsula al poste, puerta vertical)',
    fecha: '2026-07-20',
    desviaciones: [
      'v2 reemplaza el cabezal integrado sobre brida por estación de poste clásica (ZL6/Sentek): la brida y el acople torneado desaparecen; el gabinete cuelga del poste y todas las entradas van por abajo.',
      'Pluviómetro compacto: no cumple la regla 2× de OMM respecto del propio poste (sesgo declarado, común a toda estación integrada).',
    ],
    explode, pasos: PASOS, bom: BOM,
    consumibles: ['Cemento PVC presión + primer', 'Epoxi estructural', 'Potting PU', 'Molykote 111', 'PTFE + anaerobio', 'Loctite 243', 'Grasa dieléctrica', 'Bentonita', 'Zinc-rich', 'Silicona neutra (salida lateral)'],
    features: FEATURES, webRef: WEB_REF,
    costoEstimado: { proto: 'US$760–950', serie25: 'US$470–540' },
  },
  params: [], parts, constraints: [],
};
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'sonda_suelo_b15.json'), JSON.stringify(doc, null, 1));
console.log(`OK sonda_suelo_b15.json v2 (${parts.length} piezas)`);
