#!/usr/bin/env node
// gen_sonda_campo.mjs — VARIANTE D "CAMPO DIRECTO" de la estación de humedad
// de suelo (formato foto3d-cad): sensores económicos industriales ENTERRADOS
// DIRECTO en el relleno del barreno (práctica METER/Dragino/SenseCAP) + poste
// nipple SCH40 1 1/2" concretado con el cabezal solar/LoRa arriba.
//
// Escalón de costo mínimo SIN ceder supervivencia (IP66/68, −40…+80 °C,
// LiFePO4, prensaestopas, Gore, acero galvanizado). Lo que se cede vs A/B:
// exactitud de calibración del sensor, extraibilidad (quedan enterrados) y
// perfil inalterado (primer mes de reasentamiento del relleno). Ver
// sonda_estado_del_arte_seleccion.pdf §escalera de variantes.
//
// Coordenadas: Z arriba, z=0 = NPT. mm. Capa `user`.
// Uso:  node cad/ensambles/gen_sonda_campo.mjs

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
  ({ id: F(), name, shape: 'box', op, at: at.map(r2), dir: [0, 0, 1], params: { w, d, h } });
const cyl = (dia, h, at, dir = [0, 0, 1], op = 'union', name = 'Cilindro') =>
  ({ id: F(), name, shape: 'cylinder', op, at: at.map(r2), dir, params: { dia, h } });
const hole = (dia, at, dir, opts = {}) =>
  ({ id: F(), name: opts.name || `Agujero Ø${dia}`, shape: 'hole', op: 'cut', at: at.map(r2), dir, params: { dia, depth: opts.depth ?? 10, through: !!opts.through } });
const rectPat = (srcId, nx, ny, dx, dy) =>
  ({ id: F(), name: 'Patrón rect.', shape: 'pattern', op: 'pattern', at: [0, 0, 0], dir: [0, 0, 1], params: { sourceId: srcId, kind: 'rect', nx, ny, dx, dy, u: [1, 0, 0], v: [0, 1, 0] } });
const circPat = (srcId, n) =>
  ({ id: F(), name: 'Patrón circ.', shape: 'pattern', op: 'pattern', at: [0, 0, 0], dir: [0, 0, 1], params: { sourceId: srcId, kind: 'circ', n, angle: 360, axisAt: [0, 0, 0], axisDir: [0, 0, 1] } });
const revolve = (pts, at, name) => ({
  id: F(), name, shape: 'revolve', op: 'union', at: at.map(r2), dir: [0, -1, 0],
  params: {
    entities: pts.map((p, i) => ({ type: 'line', a: [r2(p[0]), r2(p[1])], b: [r2(pts[(i + 1) % pts.length][0]), r2(pts[(i + 1) % pts.length][1])] })),
    axis: { a: [0, 0], b: [0, 1] }, u: [1, 0, 0],
  },
});

const ZPISO = 924, ZTAPA = ZPISO + 52, ZLID = ZTAPA + 1.5 + 8;

// --- estructura -------------------------------------------------------------
P('dado', '01 Dado de concreto Ø220×500 (in situ)', '#a9a49a', [0, 0, -500], [
  cyl(220, 500, [0, 0, 0], [0, 0, 1], 'union', 'Dado'),
], { fixed: true });
P('poste', '02 Poste nipple A53 SCH40 1 1/2" × 1350 galv. (hilo arriba)', '#8f969c', [0, 0, -450], [
  cyl(48.3, 1346, [0, 0, 0], [0, 0, 1], 'union', 'Nipple'),
  cyl(40.9, 1348, [0, 0, -1], [0, 0, 1], 'cut', 'Ánima'),
], { explode: [0, 0, 150] });
{
  const m4 = hole(4.5, [28, 28, 58], [0, 0, -1], { through: true, name: 'Paso M4' });
  P('brida', '03 Brida roscada 1 1/2" comercial (galv.) + 4×M4', '#9aa2a8', [0, 0, 866], [
    revolve([[22.25, 0], [27, 0], [27, 50], [50, 50], [50, 58], [18, 58], [18, 30], [22.25, 30]], [0, 0, 0], 'Brida'),
    m4, circPat(m4.id, 4),
  ], { explode: [0, 0, 320] });
}

// --- gabinete (PC IP66/67 tipo Hammond 1554 / Fibox) -------------------------
{
  const bossX = 84, bossY = 59;
  const boss = cyl(10, 49, [bossX, bossY, 3], [0, 0, 1], 'union', 'Torreta esquina');
  const tapM4 = hole(3.4, [bossX, bossY, 52], [0, 0, -1], { depth: 12, name: 'Rosca tapa M4' });
  const m4piso = hole(4.5, [28, 28, 0], [0, 0, 1], { depth: 4, name: 'Paso M4 piso' });
  const gl = hole(16.5, [-50, -65, 26], [0, 1, 0], { depth: 4, name: 'Paso prensaestopas M16' });
  P('gabinete', '04 Gabinete PC IP66/67 180×130×60 (Hammond 1554 / Fibox)', '#bfc7cf', [0, 0, ZPISO], [
    box(180, 130, 52, [0, 0, 0], 'union', 'Cuerpo'),
    box(174, 124, 52, [0, 0, 3], 'cut', 'Cavidad'),
    boss, rectPat(boss.id, 2, 2, -2 * bossX, -2 * bossY),
    tapM4, rectPat(tapM4.id, 2, 2, -2 * bossX, -2 * bossY),
    m4piso, rectPat(m4piso.id, 2, 2, -56, -56),
    gl, rectPat(gl.id, 3, 1, 50, 0),
    hole(12.5, [60, 65, 26], [0, -1, 0], { depth: 4, name: 'Recorte válvula Gore' }),
  ], { explode: [0, 0, 420] });
  P('junta', '05 Junta de tapa PU', '#22262b', [0, 0, ZTAPA], [
    { id: F(), name: 'Marco PU', shape: 'sketch', op: 'union', at: [0, 0, 0], dir: [0, 0, 1], params: { entities: [
      { type: 'line', a: [-88, -63], b: [88, -63] }, { type: 'line', a: [88, -63], b: [88, 63] },
      { type: 'line', a: [88, 63], b: [-88, 63] }, { type: 'line', a: [-88, 63], b: [-88, -63] },
      { type: 'line', a: [-85, -60], b: [85, -60] }, { type: 'line', a: [85, -60], b: [85, 60] },
      { type: 'line', a: [85, 60], b: [-85, 60] }, { type: 'line', a: [-85, 60], b: [-85, -60] },
    ], h: 1.5, u: [1, 0, 0] } },
  ], { explode: [0, 0, 500] });
  const lidHole = hole(4.5, [84, 59, 8], [0, 0, -1], { through: true, name: 'Paso tornillo tapa' });
  P('tapa', '06 Tapa (4×M4 cautivos)', '#aab4bd', [0, 0, ZTAPA + 1.5], [
    box(180, 130, 8, [0, 0, 0], 'union', 'Tapa'),
    lidHole, rectPat(lidHole.id, 2, 2, -168, -118),
  ], { explode: [0, 0, 580] });
}

// --- electrónica ------------------------------------------------------------
P('nodo', '07 Nodo RAK WisBlock (base+RS-485+carga solar) + RAK3172', '#1f6e43', [-30, 10, ZPISO + 9], [
  box(100, 60, 1.6, [0, 0, 0], 'union', 'Base WisBlock'),
  box(30, 25, 6, [-25, 5, 1.6], 'union', 'Core RAK3172'),
  box(20, 15, 5, [20, 5, 1.6], 'union', 'Módulo RS-485'),
  box(18, 12, 4, [20, -18, 1.6], 'union', 'Cargador solar'),
], { explode: [0, 0, 520] });
P('separadores', '08 Separadores nylon M3×6 (4)', '#e8e4da', [-30, 10, ZPISO + 3], [
  (() => { const c = cyl(6, 6, [45, 25, 0], [0, 0, 1], 'union', 'Separador'); return c; })(),
], { explode: [0, 0, 480] });
parts[parts.length - 1].features.push(rectPat(parts[parts.length - 1].features[0].id, 2, 2, -90, -50));
P('bateria', '09 LiFePO4 26650 + portapilas', '#5a7d9a', [40, -35, ZPISO + 3], [
  box(75, 34, 5, [0, 0, 0], 'union', 'Portapilas'),
  cyl(26.2, 65.2, [-32.6, 0, 18.1], [1, 0, 0], 'union', 'Celda'),
], { explode: [0, 0, 540] });
P('borne_bus', '10 Bornera bus RS-485 + 12 V', '#8a8f96', [40, 35, ZPISO + 3], [
  box(30, 16, 12, [0, 0, 0], 'union', 'Bornera'),
], { explode: [0, 0, 500] });
P('desecante', '11 Cápsula desecante Ø30', '#d9c37a', [-64, -40, ZPISO + 3], [
  cyl(30, 15, [0, 0, 0], [0, 0, 1], 'union', 'Desecante'),
], { explode: [0, 0, 505] });
{
  const qv = qAxis([1, 0, 0], 90);
  P('vent', '12 Válvula de equilibrio Gore M12', '#e0e0e0', [60, 73, 950], [
    cyl(15, 8, [0, 0, 0], [0, 0, 1], 'union', 'Cabeza'),
    cyl(12, 6, [0, 0, 8], [0, 0, 1], 'union', 'Rosca'),
  ], { quat: qv, explode: [0, 110, 420] });
}
{
  const qm = qAxis([1, 0, 0], -90);
  P('prensas', '13 3× Skintop MS-M16 (entrada de sensores, pared −Y)', '#c9a227', [0, -71, 950], [
    cyl(19, 6, [-50, 0, 0], [0, 0, 1], 'union', 'Prensaestopas 1'),
    cyl(19, 6, [0, 0, 0], [0, 0, 1], 'union', 'Prensaestopas 2'),
    cyl(19, 6, [50, 0, 0], [0, 0, 1], 'union', 'Prensaestopas 3'),
    cyl(15.8, 10, [-50, 0, 6], [0, 0, 1], 'union', 'Rosca 1'),
    cyl(15.8, 10, [0, 0, 6], [0, 0, 1], 'union', 'Rosca 2'),
    cyl(15.8, 10, [50, 0, 6], [0, 0, 1], 'union', 'Rosca 3'),
  ], { quat: qm, explode: [0, -120, 420] });
}

// --- panel solar ------------------------------------------------------------
{
  const cuna = [{ type: 'line', a: [-90, 0], b: [90, 0] }, { type: 'line', a: [90, 0], b: [-90, 48] }, { type: 'line', a: [-90, 48], b: [-90, 0] }];
  P('soporte_panel', '14 Soporte panel Al 15° (2 cuñas)', '#98a2ac', [0, 0, ZLID], [
    { id: F(), name: 'Cuña -Y', shape: 'sketch', op: 'union', at: [0, -53, 0], dir: [0, -1, 0], params: { entities: cuna, h: 4, u: [1, 0, 0] } },
    { id: F(), name: 'Cuña +Y', shape: 'sketch', op: 'union', at: [0, 57, 0], dir: [0, -1, 0], params: { entities: cuna, h: 4, u: [1, 0, 0] } },
  ], { explode: [0, 0, 650] });
  P('panel', '15 Panel solar 5 W ETFE (190×130)', '#20344d', [0, 0, ZLID + 24.7], [
    box(190, 130, 15, [0, 0, 0], 'union', 'Panel'),
  ], { quat: qAxis([0, 1, 0], 14.93), explode: [0, 0, 720] });
}

// --- sensores enterrados + conducto -----------------------------------------
[-200, -400, -600].forEach((zp, i) => {
  const az = [25, 145, 265][i];
  const q = qAxis([0, 0, 1], az);
  const pin = cyl(4, 70, [0, 0, -70], [0, 0, 1], 'union', 'Púa 316');
  P(`sensor${i + 1}`, `${16 + i} Sensor S-Soil MTEC-02A #${i + 1} (${-zp / 10} cm, enterrado)`, '#2e6f40',
    [200 * Math.cos(az * Math.PI / 180), 200 * Math.sin(az * Math.PI / 180), zp], [
      box(45, 16, 145, [0, 0, 0], 'union', 'Cuerpo resina'),
      { ...pin, at: [-12, 0, -70] }, { ...cyl(4, 70, [0, 0, -70], [0, 0, 1], 'union', 'Púa 316'), at: [0, 0, -70] },
      { ...cyl(4, 70, [0, 0, -70], [0, 0, 1], 'union', 'Púa 316'), at: [12, 0, -70] },
    ], { quat: q, explode: [Math.cos(az * Math.PI / 180) * 160, Math.sin(az * Math.PI / 180) * 160, 0] });
});
P('conducto', '19 Conducto flex UV Ø18 (cables sensores, zunchado al poste)', '#4a4f55', [-34, 0, -60], [
  cyl(18, 1000, [0, 0, 0], [0, 0, 1], 'union', 'Flex'),
], { explode: [-120, 0, 0] });

// --- meta -------------------------------------------------------------------
const BOM = [
  { item: 1, id: 'dado', desig: 'Dado de concreto Ø220×500', mat: 'Hormigón in situ', cant: 1, nota: '~$5 — el poste se aploma antes de fraguar' },
  { item: 2, id: 'poste', desig: 'Poste nipple 1 1/2" SCH40 × 1350 (hilo superior)', mat: 'A53 galv. caliente', cant: 1, nota: '~$20; 450 embebido / 900 aéreo' },
  { item: 3, id: 'brida', desig: 'Brida roscada 1 1/2" comercial', mat: 'Galvanizada', cant: 1, nota: '~$12 con pernos; PTFE + anaerobio' },
  { item: 4, id: 'gabinete', desig: 'Gabinete PC IP66/67 180×130×60', mat: 'Hammond 1554 (o Fibox +$20)', cant: 1, nota: '~$25; PC radio-transparente: antena LoRa interna' },
  { item: 5, id: 'junta', desig: 'Junta de tapa PU', mat: 'incluida', cant: 1, nota: '—' },
  { item: 6, id: 'tapa', desig: 'Tapa 4×M4', mat: 'PC', cant: 1, nota: '1.2 N·m en cruz' },
  { item: 7, id: 'nodo', desig: 'RAK WisBlock base + RS-485 + carga solar + RAK3172', mat: 'RAKwireless', cant: 1, nota: '~$55; hardware de campo validado, antena PCB interna' },
  { item: 8, id: 'separadores', desig: 'Separadores M3×6 + tornillería', mat: 'Nylon/A4', cant: 1, nota: '~$3' },
  { item: 9, id: 'bateria', desig: 'LiFePO4 26650 + portapilas + BMS solar', mat: '—', cant: 1, nota: '~$18' },
  { item: 10, id: 'borne_bus', desig: 'Bornera bus', mat: '—', cant: 1, nota: '~$4; pantalla a tierra en un punto' },
  { item: 11, id: 'desecante', desig: 'Desecante recambiable', mat: 'Sílica indicadora', cant: 1, nota: '~$3' },
  { item: 12, id: 'vent', desig: 'Válvula equilibrio Gore M12', mat: 'ePTFE', cant: 1, nota: '~$6; anti-condensación' },
  { item: 13, id: 'prensas', desig: 'Prensaestopas Skintop MS-M16', mat: 'Latón Ni', cant: 3, nota: '~$12; un cable de sensor por prensaestopas' },
  { item: 14, id: 'soporte_panel', desig: 'Soporte panel Al 15°', mat: 'Al 5052', cant: 1, nota: '~$8' },
  { item: 15, id: 'panel', desig: 'Panel solar 5 W ETFE', mat: 'marco Al', cant: 1, nota: '~$15' },
  { item: 16, id: 'sensor1', desig: 'Sensor S-Soil MTEC-02A RS-485 Modbus', mat: 'Seeed (IP68, −40…+80 °C)', cant: 3, nota: '~$130 los 3; ENTERRADOS en el relleno (no extraíbles; se abandonan al recambiar)' },
  { item: 17, id: 'conducto', desig: 'Conducto flex UV Ø18 + zunchos inox', mat: 'PA/PVC UV', cant: 1, nota: '~$8; cables al gabinete por pared −Y' },
  { item: 18, id: null, desig: 'Bentonita + relleno nativo tamizado', mat: '—', cant: 1, nota: '~$8; compactar por capas de 100 mm' },
];
const PASOS = [
  { n: 1, t: 'Verificación en banco', partes: [], texto: 'Probar los 3 MTEC-02A en banco: dirección Modbus 1/2/3 según profundidad, lectura en aire y en agua. Verificar nodo WisBlock + carga solar. Etiquetar cada sensor con su profundidad.' },
  { n: 2, t: 'Excavación', partes: ['dado'], texto: 'Barreno Ø150–200 a 700 mm para los sensores (a ~200 mm del eje del poste) y hoyo Ø250×500 para el dado. No mezclar horizontes de suelo: apilar por capas en orden.' },
  { n: 3, t: 'Poste y dado', partes: ['poste', 'dado'], texto: 'Concretar el poste aplomado (hilo protegido con el cap). Curado 48 h antes de cargar el cabezal.' },
  { n: 4, t: 'Sensores enterrados', partes: ['sensor1', 'sensor2', 'sensor3'], texto: 'Insertar cada MTEC en suelo NO perturbado de la pared del barreno (púas horizontales, cuerpo vertical) a 20/40/60 cm. Rellenar por capas de 100 mm con el MISMO suelo en el MISMO orden, compactando suave. Bentonita en los últimos 300 mm alrededor de los cables.' },
  { n: 5, t: 'Conducto y cables', partes: ['conducto', 'poste'], texto: 'Subir los 3 cables por el conducto flex UV zunchado al poste. Dejar goteo (lazo bajo) antes de entrar al gabinete.' },
  { n: 6, t: 'Brida y gabinete', partes: ['brida', 'gabinete'], texto: 'PTFE + anaerobio y roscar la brida al poste. Fijar el gabinete con 4×M4 A4 + Loctite 243 (2 N·m). Entrar cada cable por su Skintop M16 (2.5 N·m) y la válvula Gore en la pared opuesta.' },
  { n: 7, t: 'Electrónica y energía', partes: ['separadores', 'nodo', 'bateria', 'borne_bus', 'desecante'], texto: 'WisBlock en separadores, batería + BMS, bornera (pantalla a tierra en un solo punto), desecante. Verificar lectura Modbus de los 3 sensores.' },
  { n: 8, t: 'Cierre y puesta en marcha', partes: ['junta', 'tapa', 'soporte_panel', 'panel'], texto: 'Junta limpia, tapa a 1.2 N·m en cruz. Soporte 15° + panel al ecuador. Verificar enlace LoRaWAN y registrar IDs/RSSI en bitácora. NOTA: el primer mes de lecturas es de reasentamiento del relleno.' },
];
const FEATURES = [
  'VARIANTE D — CAMPO DIRECTO: el costo mínimo que mantiene la supervivencia industrial (IP66/68, −40…+80 °C, LiFePO4, Gore, acero galvanizado): ~US$310–360 por punto',
  'Sensores IP68 enterrados directo en el relleno (práctica METER/Dragino): a ~$43 c/u se abandonan al recambiar — sin mecanizado, sin cuerpo de sonda',
  'Poste nipple SCH40 1 1/2" concretado + brida comercial: 100 % ferretería industrial',
  'Nodo RAK WisBlock validado en campo con antena LoRa interna (gabinete PC radio-transparente)',
  'Pensada para DENSIDAD: muchas D por cuartel + algunas sondas A/B como puntos de referencia calibrados',
  'Cede vs A/B (decláralo en la ficha): calibración genérica ±3–5 % VWC, sensores no extraíbles, y perfil perturbado el primer mes',
];
const doc = {
  format: 'foto3d-cad', version: 1,
  meta: {
    nombre: 'Estación de humedad de suelo — VARIANTE D: campo directo',
    proyecto: 'SONDA-SUELO-IND', capa: 'user', variante: 'campo',
    subtitulo: 'MTEC-02A ×3 enterrados (20/40/60 cm) · poste SCH40 · IP66/68',
    etiquetaSensor: 'MTEC',
    fuente: 'Escalón D de la escalera de variantes (ver sonda_estado_del_arte_seleccion.pdf)',
    fecha: '2026-07-20',
    desviaciones: [],
    explode, pasos: PASOS, bom: BOM,
    consumibles: ['Concreto (1 saco)', 'Bentonita granular', 'PTFE + sellador anaerobio', 'Loctite 243', 'Zunchos inox', 'Silicona neutra'],
    features: FEATURES,
    costoEstimado: { proto: 'US$310–360', serie25: 'US$260–300' },
  },
  params: [], parts, constraints: [],
};
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'sonda_campo.json'), JSON.stringify(doc, null, 1));
console.log(`OK sonda_campo.json (${parts.length} piezas)`);
