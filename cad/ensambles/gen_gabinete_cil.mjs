#!/usr/bin/env node
// gen_gabinete_cil.mjs — OPCIÓN "GABINETE CILÍNDRICO ESPECIAL" (compacto, bajo norma).
//
// Concepto: cápsula COAXIAL al mástil. El poste SCH40 1 1/2" ATRAVIESA el centro
// (continuidad estructural intacta) y la electrónica vive en la CAVIDAD ANULAR
// sellada alrededor. Es la forma más compacta y de menor carga de viento para una
// estación de poste: silueta cilíndrica lisa, sin caja saliente, antivandálica.
//
// Doble barrera de estanqueidad (regla de oro IP, IEC 60529 IP68):
//   - Tubo interior "seco/húmedo": aísla el conducto de cables (interior del poste,
//     húmedo) de la cavidad de electrónica (seca). Los cables entran por un puerto
//     lateral Ø16 del poste y cruzan a la cavidad por un pasacables sellado.
//   - Tapas roscadas con tórica RADIAL FKM sobre el diámetro interior del cuerpo
//     (ISO 3601), + tóricas de eje FKM donde el tubo interior abraza el poste.
//
// Normas aplicadas (ver webRef): IEC 60529 IP68 · EN 62208 (envolventes vacías) ·
//   ISO 3601 (tóricas) · DIN 912 (tornillería) · IEC 60068-2-6/-27 (vibración/choque)
//   · NEMA 250 tipo 6P (equivalente sumergible).
//
// Coordenadas: Z arriba, z=0 = NPT, +Y = norte. mm. Capa `user` (diseño CAD).
// Uso: node cad/ensambles/gen_gabinete_cil.mjs  → gabinete_cil.json

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
const torus = (ringR, csR, at, name) => ({
  id: F(), name, shape: 'revolve', op: 'union', at: at.map(r2), dir: [0, 0, 1],
  params: { entities: [{ type: 'circle', c: [r2(ringR), r2(csR)], r: r2(csR) }], axis: { a: [0, 0], b: [0, 1] }, u: [1, 0, 0] },
});
const sketch = (entities, h, at, dir, u, op = 'union', name = 'Extrusión') =>
  ({ id: F(), name, shape: 'sketch', op, at: at.map(r2), dir, params: { entities, h: r2(h), u } });
const hexEnt = (R) => {
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push([r2(R * Math.cos(i * Math.PI / 3)), r2(R * Math.sin(i * Math.PI / 3))]);
  return pts.map((pt, i) => ({ type: 'line', a: pt, b: pts[(i + 1) % 6] }));
};
// receptáculo M12 A-cod (tuerca moleteada + rosca + cuerpo + 5 pines), eje +Z local
const m12Feats = (x, y, tag) => {
  const f = [
    cyl(17, 6, [x, y, 0], [0, 0, 1], 'union', `Tuerca ${tag}`),
    cyl(17.8, 0.8, [x, y, 1], [0, 0, 1], 'union', `Moleteado ${tag} a`),
    cyl(17.8, 0.8, [x, y, 2.6], [0, 0, 1], 'union', `Moleteado ${tag} b`),
    cyl(17.8, 0.8, [x, y, 4.2], [0, 0, 1], 'union', `Moleteado ${tag} c`),
    cyl(12, 8, [x, y, 6], [0, 0, 1], 'union', `Rosca ${tag}`),
    cyl(14.5, 12, [x, y, 14], [0, 0, 1], 'union', `Cuerpo ${tag}`),
  ];
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    f.push(cyl(0.9, 2, [x + 3.3 * Math.cos(a), y + 3.3 * Math.sin(a), -1.8], [0, 0, 1], 'union', `Pin ${tag}${k + 1}`));
  }
  f.push(cyl(0.9, 2, [x, y, -1.8], [0, 0, 1], 'union', `Pin ${tag}5`));
  return f;
};

// ---- geometría maestra ------------------------------------------------------
const MAST = 48.3;             // OD SCH40 1 1/2"
const BODY_OD = 160, WALL = 5; // cuerpo aluminio extruido anodizado
const BODY_ID = BODY_OD - 2 * WALL;         // 150
const H = 220;                 // altura de la cápsula
const Z0 = 1090, Z1 = Z0 + H;  // 1090 → 1310 (banda de instrumentos)
const ZC = (Z0 + Z1) / 2;      // 1200 centro
const SLV_OD = 56, SLV_ID = 50; // tubo interior seco/húmedo alrededor del poste
const ANN_RM = (SLV_OD / 2 + BODY_ID / 2) / 2; // radio medio del anillo ≈ 51.5

// ============================================================================
// 1 · MÁSTIL pasante (contexto; continuidad estructural intacta)
// ============================================================================
{
  const feats = [
    cyl(MAST, 710, [0, 0, 0], [0, 0, 1], 'union', 'Poste SCH40 1 1/2"'),
    cyl(40.9, 710, [0, 0, 0], [0, 0, 1], 'cut', 'Bore interior (conducto)'),
    hole(16, [0, 0, 220], [0, 1, 0], { depth: 30, name: 'Puerto lateral de cables Ø16' }),
    cyl(20, 3, [0, 24.15, 220], [0, 1, 0], 'union', 'Grommet del puerto'),
  ];
  P('mastil', '1 Poste A53 SCH40 1 1/2" (pasa por el eje — estructura continua)', '#8f969c', [0, 0, 850], feats, { fixed: true });
}

// ============================================================================
// 2 · CUERPO cilíndrico — aluminio 6063-T6 anodizado marino, extruido
// ============================================================================
{
  const feats = [
    cyl(BODY_OD, H, [0, 0, 0], [0, 0, 1], 'union', 'Cuerpo extruido Ø160'),
    cyl(BODY_ID, H, [0, 0, 0], [0, 0, 1], 'cut', 'Cavidad anular'),
    // asiento de tórica radial en cada extremo (rebaje interior para la tapa)
    cyl(BODY_ID + 3, 14, [0, 0, 0], [0, 0, 1], 'cut', 'Alojamiento tapa inf.'),
    cyl(BODY_ID + 3, 14, [0, 0, H - 14], [0, 0, 1], 'cut', 'Alojamiento tapa sup.'),
  ];
  // dos molduras anulares (estética industrial, define la banda rotulada)
  feats.push(cyl(BODY_OD + 0.6, 2, [0, 0, (ZC - Z0) - 16], [0, 0, 1], 'union', 'Moldura sup.'));
  feats.push(cyl(BODY_OD + 0.6, 2, [0, 0, (ZC - Z0) + 16], [0, 0, 1], 'union', 'Moldura inf.'));
  // banda rotulada grabada por láser (rebaje 0.4 mm) al frente
  feats.push(box(70, 1, 26, [0, -BODY_OD / 2 + 0.4, ZC - Z0], 'cut', 'Banda rotulada (láser)'));
  P('cuerpo', '2 Cuerpo cilíndrico Al 6063-T6 anodizado Ø160×220 (extruido, estrías 0.5 mm)', '#5b6570', [0, 0, Z0], feats, { explode: [0, -240, 0] });
}

// ============================================================================
// 3 · TUBO INTERIOR seco/húmedo (aísla el conducto del poste de la electrónica)
// ============================================================================
P('sleeve', '3 Tubo interior seco/húmedo Al Ø56 (separa conducto de cavidad)', '#78828d', [0, 0, Z0], [
  cyl(SLV_OD, H, [0, 0, 0], [0, 0, 1], 'union', 'Tubo Ø56'),
  cyl(SLV_ID, H, [0, 0, 0], [0, 0, 1], 'cut', 'Paso del poste Ø50'),
  hole(16, [0, 0, 110], [0, 1, 0], { through: true, name: 'Cruce de cables a cavidad' }),
  cyl(19, 4, [0, 25, 110], [0, 1, 0], 'union', 'Prensa interior del cruce'),
  // 3 prisioneros DIN 913 M6 que fijan la cápsula al poste (a 120°)
  ...[0, 1, 2].map(k => {
    const a = k * 2 * Math.PI / 3;
    return cyl(6, 4, [(SLV_OD / 2) * Math.cos(a), (SLV_OD / 2) * Math.sin(a), 20], [Math.cos(a), Math.sin(a), 0], 'union', `Prisionero M6 ${k + 1}`);
  }),
], { explode: [0, 0, 0] });

// ============================================================================
// 4 · TAPAS roscadas con tórica radial FKM (IP68) — sup. e inf.
// ============================================================================
const capFeats = (isTop) => {
  const f = [
    cyl(BODY_OD + 4, 10, [0, 0, 0], [0, 0, 1], 'union', 'Ala moleteada'),
    cyl(BODY_ID + 2.6, 16, [0, 0, isTop ? -16 : 0], [0, 0, 1], 'union', 'Tapón roscado'),
    cyl(SLV_ID + 0.4, 22, [0, 0, isTop ? -18 : -2], [0, 0, 1], 'union', 'Cubo central'),
    cyl(MAST + 0.6, 26, [0, 0, isTop ? -20 : -4], [0, 0, 1], 'cut', 'Paso del poste'),
  ];
  // ranura de tórica radial (ISO 3601) en el tapón
  f.push(cyl(BODY_ID + 2.6, 3, [0, 0, isTop ? -8 : 6], [0, 0, 1], 'cut', 'Ranura tórica radial'));
  // moldura de agarre del ala (aro fino, evita el moleteado costoso en CSG)
  f.push(cyl(BODY_OD + 6, 3, [0, 0, 3.5], [0, 0, 1], 'union', 'Aro de agarre'));
  return f;
};
P('cap_top', '4 Tapa superior roscada Al + tórica radial FKM (antena/SMA)', '#6d7883', [0, 0, Z1 - 4], [
  ...capFeats(true),
  cyl(15, 12, [0, 40, 6], [0, 0, 1], 'union', 'Boss antena N-hembra'),
  hole(6, [0, 40, 6], [0, 0, 1], { depth: 10, name: 'Rosca antena' }),
], { explode: [0, 0, 240] });
P('cap_bot', '5 Tapa inferior roscada Al + tórica radial FKM (interfaz de servicio)', '#6d7883', [0, 0, Z0 + 4], [
  ...capFeats(false),
], { explode: [0, 0, -240] });

// tóricas FKM (ISO 3601): 2 radiales de cuerpo + 2 de eje sobre el poste
P('or_top', '6 Tórica radial FKM 150×3 (tapa sup.)', '#1c1c1c', [0, 0, Z1 - 12], [
  torus((BODY_ID + 2.6) / 2, 1.5, [0, 0, 0], 'O-ring 150×3'),
], { explode: [0, 0, 180] });
P('or_bot', '7 Tórica radial FKM 150×3 (tapa inf.)', '#1c1c1c', [0, 0, Z0 + 12], [
  torus((BODY_ID + 2.6) / 2, 1.5, [0, 0, 0], 'O-ring 150×3'),
], { explode: [0, 0, -180] });
P('or_mast_t', '8 Tórica de eje FKM 48×3 sobre el poste (sup.)', '#1c1c1c', [0, 0, Z1 - 18], [
  torus(MAST / 2 + 0.5, 1.5, [0, 0, 0], 'O-ring eje 48×3'),
], { explode: [0, 0, 140] });
P('or_mast_b', '9 Tórica de eje FKM 48×3 sobre el poste (inf.)', '#1c1c1c', [0, 0, Z0 + 16], [
  torus(MAST / 2 + 0.5, 1.5, [0, 0, 0], 'O-ring eje 48×3'),
], { explode: [0, 0, -140] });

// ============================================================================
// 5 · CHASIS anular de electrónica (bandeja curva) + PCB + celdas + BMS
// ============================================================================
// bandeja anular: dos sectores curvos que se apoyan entre sleeve y cuerpo
{
  const seg = [];
  const rIn = SLV_OD / 2 + 1, rOut = BODY_ID / 2 - 1;
  for (let k = 0; k < 40; k++) {              // corona de 300° (deja 60° para el cruce)
    const a = (-150 + k * 300 / 39) * Math.PI / 180;
    seg.push(cyl(4, 3, [((rIn + rOut) / 2) * Math.cos(a), ((rIn + rOut) / 2) * Math.sin(a), 0], [0, 0, 1], 'union', `Nervio ${k + 1}`));
  }
  seg.push(cyl(BODY_ID - 4, 3, [0, 0, 0], [0, 0, 1], 'union', 'Aro chasis'));
  seg.push(cyl(SLV_OD + 6, 3, [0, 0, 0], [0, 0, 1], 'cut', 'Vaciado central'));
  P('chasis', '10 Chasis anular de electrónica (bandeja curva impresa/mecanizada)', '#2f3540', [0, 0, ZC - 50], seg, { explode: [0, 0, -70] });
}
// PCB curvada al norte (detrás, protegida de la puerta de servicio al sur)
P('pcb', '11 Nodo WisBlock + ADS1115 en PCB (sector norte del anillo)', '#1f6e43', [0, ANN_RM, ZC - 30], [
  box(96, 3, 60, [0, 0, 0], 'union', 'PCB flexo-rígida'),
  box(25.5, 3, 18, [-28, 3, 12], 'union', 'Core LoRa'),
  box(15, 3.5, 15.5, [-28, 3, -14], 'union', 'RAK3172'),
  box(10, 2, 6, [6, 3, 14], 'union', 'ADS1115'),
  box(20, 8, 15, [6, 3, -12], 'union', 'Buck aislado'),
  cyl(2, 1, [26, 3, 22], [0, 1, 0], 'union', 'LED estado'),
  cyl(2, 1, [26, 3, 16], [0, 1, 0], 'union', 'LED LoRa'),
], { explode: [0, 260, 0] });
// celdas 18650 verticales repartidas en el anillo (4 celdas)
{
  const cells = [];
  const ang = [200, 235, 305, 340];   // grados, evitando el sector PCB (norte)
  ang.forEach((deg, i) => {
    const a = deg * Math.PI / 180, R = ANN_RM;
    cells.push(cyl(18.6, 65, [R * Math.cos(a), R * Math.sin(a), 0], [0, 0, 1], 'union', `Celda 18650 ${i + 1}`));
    cells.push(cyl(8, 1.5, [R * Math.cos(a), R * Math.sin(a), 65], [0, 0, 1], 'union', `Botón + ${i + 1}`));
    cells.push(cyl(19.2, 0.6, [R * Math.cos(a), R * Math.sin(a), 50], [0, 0, 1], 'union', `Ranura envoltura ${i + 1}`));
  });
  P('baterias', '12 4× LiFePO4 18650 (pack curvo en el anillo)', '#5a7d9a', [0, 0, ZC - 32], cells, { explode: [0, 0, 90] });
}
P('bms', '13 BMS / cargador solar MPPT (sector sur-este)', '#7a4a9e', [26, -ANN_RM + 8, ZC - 20], [
  box(42, 22, 3, [0, 0, 0], 'union', 'BMS'),
  box(8, 6, 5, [-14, 0, 3], 'union', 'Bobina'),
], { explode: [30, -120, 0] });
P('desecante', '14 Cápsula desecante Ø30 con indicador de humedad', '#d9c37a', [-30, -ANN_RM + 10, ZC - 20], [
  cyl(30, 14, [0, 0, 0], [0, 0, 1], 'union', 'Cuerpo'),
  cyl(31, 2.5, [0, 0, 14], [0, 0, 1], 'union', 'Tapa perforada'),
  ...Array.from({ length: 6 }, (_, k) => {
    const a = k * Math.PI / 3;
    return hole(2.2, [9 * Math.cos(a), 9 * Math.sin(a), 16.5], [0, 0, -1], { depth: 2, name: `Perf. ${k + 1}` });
  }),
], { explode: [-30, -120, 0] });

// ============================================================================
// 6 · INTERFAZ DE SERVICIO en la tapa inferior: patch panel M12 + Gore + bus
// ============================================================================
P('m12_panel', '15 Patch panel M12 en la base: LLUVIA · T/HR · HOJA (recambio sin abrir)', '#2b2f36', [0, 0, Z0 - 8], [
  ...m12Feats(-38, 42, 'LLUVIA'), ...m12Feats(0, 52, 'T/HR'), ...m12Feats(38, 42, 'HOJA'),
  // arco rotulado
  sketch([{ type: 'circle', c: [0, 0], r: 60 }], 1.2, [0, 0, -0.6], [0, 0, 1], [1, 0, 0], 'cut', 'ref'),
], { explode: [0, 0, -300] });
P('vent', '16 Respiradero Gore M12 (compensación de presión IP68)', '#3a3f47', [-50, -30, Z0 - 6], [
  cyl(15, 5, [0, 0, 0], [0, 0, 1], 'union', 'Cuerpo Gore'),
  sketch(hexEnt(9), 3, [0, 0, 5], [0, 0, 1], [1, 0, 0], 'union', 'Hex'),
  cyl(11.8, 6, [0, 0, 8], [0, 0, 1], 'union', 'Rosca M12'),
], { explode: [0, 0, -260] });
P('gland_bus', '17 Prensa Skintop M16 del bus de la sonda (entrada por la base)', '#c9a227', [52, -28, Z0 - 8], [
  cyl(19, 5, [0, 0, 0], [0, 0, 1], 'union', 'Capuchón'),
  cyl(17, 7, [0, 0, 5], [0, 0, 1], 'union', 'Cuerpo'),
  sketch(hexEnt(11.55), 8, [0, 0, 12], [0, 0, 1], [1, 0, 0], 'union', 'Hex SW20'),
  cyl(15.8, 11, [0, 0, 20], [0, 0, 1], 'union', 'Rosca M16'),
  hole(8, [0, 0, 0], [0, 0, 1], { depth: 4, name: 'Boca de cable' }),
], { explode: [0, 0, -240] });

// ============================================================================
// 7 · ANTENA al tope (contexto)
// ============================================================================
P('antena', '18 Antena LoRa 868 MHz (dipolo, N-macho) sobre la tapa', '#22262b', [0, 40, Z1 + 8], [
  cyl(8, 14, [0, 0, 0], [0, 0, 1], 'union', 'Base'),
  cyl(5, 150, [0, 0, 14], [0, 0, 1], 'union', 'Radomo'),
  cyl(6.5, 6, [0, 0, 160], [0, 0, 1], 'union', 'Punta'),
], { explode: [0, 0, 200] });

// ---- meta -------------------------------------------------------------------
const PASOS = [
  { n: 1, texto: 'Deslizar el TUBO INTERIOR Ø56 sobre el poste hasta z=1090; alinear su cruce Ø16 con el puerto lateral del poste y sellar el pasacables interior.' },
  { n: 2, texto: 'Fijar la cápsula al poste con los 3 prisioneros DIN 913 M6 a 120° (torque 6 N·m); verificar verticalidad.' },
  { n: 3, texto: 'Montar el CHASIS anular; atornillar la PCB al sector norte y el pack de 4×18650 en su corona; conectar BMS y desecante.' },
  { n: 4, texto: 'Pasar el bus de la sonda por la prensa M16 de la base y cablear la bornera; dejar lazo de goteo dentro del conducto.' },
  { n: 5, texto: 'Engrasar (grasa de silicona) las tóricas RADIALES 150×3 y las de EJE 48×3; enroscar la TAPA INFERIOR con el patch panel M12 y el Gore.' },
  { n: 6, texto: 'Enroscar la TAPA SUPERIOR; montar la antena en su boss N. Apriete a mano firme (moleteado) — sin herramienta.' },
  { n: 7, texto: 'Enchufar cada sensor a su receptáculo M12 ROTULADO (LLUVIA/T-HR/HOJA) con grasa dieléctrica: recambio futuro sin abrir la cápsula.' },
  { n: 8, texto: 'Prueba de estanqueidad: presurizar a 0.3 bar por el Gore y verificar caída <10 % en 5 min (IP68).' },
];
const BOM = [
  { item: 1, cant: 1, desc: 'Poste A53 SCH40 1 1/2" (pasante, continuo)', nota: 'estructura no interrumpida' },
  { item: 2, cant: 1, desc: 'Cuerpo Al 6063-T6 anodizado marino Ø160×220, extruido', nota: 'estrías 0.5 mm; banda láser' },
  { item: 3, cant: 1, desc: 'Tubo interior seco/húmedo Al Ø56/Ø50', nota: 'barrera conducto↔cavidad' },
  { item: 4, cant: 2, desc: 'Tapa roscada Al anodizado + moleteado', nota: 'apriete a mano' },
  { item: 5, cant: 2, desc: 'Tórica radial FKM 150×3 (ISO 3601)', nota: 'sello IP68 del cuerpo' },
  { item: 6, cant: 2, desc: 'Tórica de eje FKM 48×3 (ISO 3601)', nota: 'sello sobre el poste' },
  { item: 7, cant: 3, desc: 'Prisionero DIN 913 M6 inox A4', nota: 'fijación a 120°' },
  { item: 8, cant: 1, desc: 'Chasis anular (Al mecanizado o PA-CF impreso)', nota: 'bandeja curva' },
  { item: 9, cant: 1, desc: 'Nodo WisBlock + RAK3172 + ADS1115', nota: 'PCB flexo-rígida curva' },
  { item: 10, cant: 4, desc: 'Celda LiFePO4 18650', nota: 'pack curvo en el anillo' },
  { item: 11, cant: 1, desc: 'BMS/MPPT solar', nota: '' },
  { item: 12, cant: 1, desc: 'Patch panel M12 (3 receptáculos A-cod IP68)', nota: 'LLUVIA/T-HR/HOJA' },
  { item: 13, cant: 1, desc: 'Respiradero Gore M12', nota: 'compensación de presión' },
  { item: 14, cant: 1, desc: 'Prensa Skintop M16', nota: 'bus de la sonda' },
  { item: 15, cant: 1, desc: 'Cápsula desecante Ø30 con indicador', nota: '' },
  { item: 16, cant: 1, desc: 'Antena LoRa 868 MHz', nota: 'boss N en tapa sup.' },
];
const WEB_REF = [
  { fuente: 'IEC 60529 (grados de protección IP)', dato: 'IP68 con doble tórica radial FKM + Gore de compensación', url: 'https://webstore.iec.ch/publication/2452', acceso: '2026-07-21' },
  { fuente: 'EN 62208 (envolventes vacías BT)', dato: 'requisitos de envolvente; cilíndrica cumple', url: 'https://www.cencenelec.eu', acceso: '2026-07-21' },
  { fuente: 'ISO 3601-1 (tóricas)', dato: 'series y compresión 15–30 %; 150×3 y 48×3', url: 'https://www.iso.org/standard/71976.html', acceso: '2026-07-21' },
  { fuente: 'NEMA 250 tipo 6P', dato: 'equivalente sumergible; coherente con IP68', url: 'https://www.nema.org', acceso: '2026-07-21' },
];

const here = dirname(fileURLToPath(import.meta.url));
const doc = {
  parts,
  meta: {
    nombre: 'Estación — OPCIÓN gabinete CILÍNDRICO coaxial (compacto, IP68)',
    proyecto: 'YT-sonda',
    capa: 'user',
    variante: 'CIL',
    subtitulo: 'Cápsula Al Ø160 coaxial al poste · patch panel M12 · IP68 (IEC 60529)',
    etiquetaSensor: 'SMT50 ×3',
    fuente: 'gen_gabinete_cil.mjs',
    fecha: '2026-07-21',
    desviaciones: [
      'Cavidad anular ≈ 1.3 L útil: suficiente para nodo + 4×18650, menor que el gabinete rectangular (≈ 1.9 L).',
      'Servicio requiere desenroscar una tapa (sin bisagra); mitigado por el patch panel M12 (recambio de sensores sin abrir).',
    ],
    explode,
    pasos: PASOS,
    bom: BOM,
    consumibles: ['Grasa de silicona para tóricas', 'Grasa dieléctrica M12', 'Fijador de rosca medio (prisioneros)'],
    features: [
      'Silueta cilíndrica lisa coaxial: Cd≈0.7 vs 1.1–1.2 de una caja → ~40 % menos carga de viento.',
      'Doble barrera IP68: tóricas radiales de cuerpo + tóricas de eje sobre el poste + Gore.',
      'Estructura continua: el poste no se corta; la cápsula se cuelga con 3 prisioneros.',
      'Interfaz de servicio íntegra en la base: patch panel M12, Gore y prensa del bus.',
      'Anodizado marino + estrías 0.5 mm: agarre, disipación y estética industrial.',
    ],
    webRef: WEB_REF,
    costoEstimado: 'Δ ≈ +45–70 € vs gabinete PC rectangular (cuerpo Al anodizado + 2 tapas mecanizadas).',
  },
};
writeFileSync(join(here, 'gabinete_cil.json'), JSON.stringify(doc, null, 1));
console.log(`gabinete_cil.json — ${parts.length} piezas`);
