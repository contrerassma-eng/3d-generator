#!/usr/bin/env node
// planos_sonda.mjs — LÁMINAS PDF de la sonda de humedad de suelo industrial
// (ensambles/sonda_suelo.json). Un solo PDF con:
//   SND-GA-01  arreglo general (elevación acotada, profundidades, NPT)
//   SND-ISO-02 vistas normalizadas + isométrica sombreada del CONJUNTO (malla CSG)
//   SND-ISO-03 ídem del CABEZAL (gabinete + acople + electrónica)
//   SND-CT-04  CORTE A-A longitudinal completo con achurado y globos → BOM
//   SND-CT-05  CORTE B-B del cabezal (1:2): tórica, prensaestopas, piso, junta
//   SND-DT-06  detalles: garganta tórica 5:1, pasamuro sensor 2:1, aprietes
//   SND-EN-07/08 instrucciones de ensamble (12 pasos con viñetas de sección)
//   SND-BM-09  lista de materiales + consumibles + features + desviaciones
//
// Reutiliza el motor CAD (model.js) y el exportador de láminas del navegador
// (drawing2d.js: marco ISO 5457, cajetín ISO 7200, escritor PDF propio).
//
// Uso (desde cad/): bundlear con esbuild (alias three) y ejecutar:
//   npx esbuild ensambles/planos_sonda.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/planos_sonda.mjs
//   node /tmp/planos_sonda.mjs

import { buildPartGeometry, partMatrix } from '../js/model.js';
import { buildSheet, Sheet, exportSheetsPDF, scaleLabel } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.OUT || 'ensambles/planos_sonda';
const fecha = process.env.FECHA || '2026-07-20';
mkdirSync(outDir, { recursive: true });
const doc = JSON.parse(readFileSync('ensambles/sonda_suelo.json', 'utf8'));
const dims = JSON.parse(readFileSync('ensambles/sonda_suelo_dims.json', 'utf8'));
const D = dims.D;

// el escritor PDF es cp1252: sanear caracteres fuera de la página de códigos
const SAN = [[/\u2192/g, '->'], [/\u2212/g, '-'], [/\u2248/g, '~'], [/\u2713/g, 'OK'], [/\u2265/g, '>='], [/\u2264/g, '<=']];
const _text = Sheet.prototype.text;
Sheet.prototype.text = function (t, ...rest) {
  let v = String(t);
  for (const [re, rep] of SAN) v = v.replace(re, rep);
  return _text.call(this, v, ...rest);
};

const PROYECTO = 'SONDA-SUELO-IND · foto3d';
const FUENTE = 'gen_sonda_suelo.mjs — capa user';
const tb = (sh, designacion, numPlano, escala, nota, piezas = '1') => {
  sh.frame();
  sh.titleBlock({
    designacion, proyecto: PROYECTO, fuente: FUENTE,
    verificacion: 'DISEÑO CAD (CAPA USER)', piezas, piezasLabel: 'CANTIDAD',
    nota, escala, fecha, numPlano,
  });
};
const wrap = (t, n) => {
  const out = []; let line = '';
  for (const w of t.split(' ')) {
    if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out;
};

// ---------------------------------------------------------------------------
// dibujo de secciones/proyecciones en el plano XZ (y=0) — coordenadas de mundo
// ---------------------------------------------------------------------------
function hatchRect(sh, x, y, w, h, sp = 2.6) {
  for (let t = -h; t < w; t += sp) {
    let x1 = x + t, y1 = y, x2 = x + t + h, y2 = y + h;
    if (x1 < x) { y1 += x - x1; x1 = x; }
    if (x2 > x + w) { y2 -= x2 - (x + w); x2 = x + w; }
    if (x2 > x1 + 0.05) sh.line([x1, y1], [x2, y2], 'FINA');
  }
}

// Registro de dibujo por pieza. Cada fn recibe (sh, X, Z, s, ly, hatch):
// X(x)/Z(z) mapean mundo→papel; s = escala; ly = capa; hatch = achurar corte.
const DRAW = {
  punta(sh, X, Z, s, ly, ha) {
    const p = [[-2, -728], [2, -728], [25, -665], [25, -650], [21.2, -650], [21.2, -632],
      [-21.2, -632], [-21.2, -650], [-25, -650], [-25, -665]];
    sh.poly([...p.map(([x, z]) => [X(x), Z(z)]), [X(-2), Z(-728)]], ly);
    if (ha) {
      hatchRect(sh, X(-25), Z(-665), 50 * s, 15 * s);
      hatchRect(sh, X(-21.2), Z(-650), 42.4 * s, 18 * s);
      hatchRect(sh, X(-12), Z(-700), 24 * s, 20 * s);
    }
  },
  tubo(sh, X, Z, s, ly, ha) {
    const wall = (x0, x1, z0, z1) => {
      sh.rect(X(x0), Z(z0), (x1 - x0) * s, (z1 - z0) * s, ly);
      if (ha) hatchRect(sh, X(x0), Z(z0), (x1 - x0) * s, (z1 - z0) * s, 2.0);
    };
    wall(-25, -21.3, -650, 50);
    wall(21.3, 25, -650, -217.5);      // interrumpido por el taladro Ø35 del sensor 1
    wall(21.3, 25, -182.5, 50);
  },
  sensor1(sh, X, Z, s, ly, ha) {
    sh.rect(X(10), Z(-215), 182 * s, 30 * s, ly);
    if (ha) hatchRect(sh, X(10), Z(-215), 182 * s, 30 * s, 4);
  },
  sensor2(sh, X, Z, s, ly) { // proyección (fuera del plano de corte, az 120°)
    sh.rect(X(-96), Z(-415), 91 * s, 30 * s, 'FINA');
  },
  sensor3(sh, X, Z, s, ly) { // proyección az 240°
    sh.rect(X(-96), Z(-615), 91 * s, 30 * s, 'FINA');
  },
  pasamuro1(sh, X, Z, s, ly) {
    sh.rect(X(14), Z(-217.3), 15.2 * s, 34.6 * s, ly);
    sh.rect(X(25.2), Z(-221), 4 * s, 42 * s, ly);
  },
  torica_punta(sh, X, Z, s, ly) {
    for (const sg of [-1, 1]) sh.circle([X(sg * 20.3), Z(-642)], 1.5 * s, ly);
  },
  torica_cabezal(sh, X, Z, s, ly) {
    for (const sg of [-1, 1]) sh.circle([X(sg * 20.3), Z(890)], 1.5 * s, ly);
  },
  acople(sh, X, Z, s, ly, ha) {
    for (const sg of [1, -1]) {
      const p = [[15, 882], [21.2, 882], [21.2, 900], [28, 900], [28, 916], [45, 916],
        [45, 924], [18, 924], [18, 900], [15, 900]];
      sh.poly([...p.map(([x, z]) => [X(sg * x), Z(z)]), [X(sg * 15), Z(882)]], ly);
      if (ha) {
        hatchRect(sh, X(sg === 1 ? 15 : -21.2), Z(882), 6.2 * s, 18 * s, 1.8);
        hatchRect(sh, X(sg === 1 ? 18 : -28), Z(900), 10 * s, 16 * s, 1.8);
        hatchRect(sh, X(sg === 1 ? 18 : -45), Z(916), 27 * s, 8 * s, 1.8);
      }
    }
  },
  prensa(sh, X, Z, s, ly) {
    sh.rect(X(-9.5), Z(904), 19 * s, 12 * s, ly);
    sh.rect(X(-11.55), Z(916), 23.1 * s, 8 * s, ly);
    sh.rect(X(-7.9), Z(924), 15.8 * s, 7 * s, ly);
    sh.line([X(-5), Z(904)], [X(-5), Z(931)], 'FINA');
    sh.line([X(5), Z(904)], [X(5), Z(931)], 'FINA');
  },
  contratuerca(sh, X, Z, s, ly) { sh.rect(X(-12.7), Z(927), 25.4 * s, 4 * s, ly); },
  gabinete(sh, X, Z, s, ly, ha) {
    for (const sg of [1, -1]) {
      sh.rect(X(sg === 1 ? 87 : -90), Z(924), 3 * s, 52 * s, ly);          // paredes ±X
      if (ha) hatchRect(sh, X(sg === 1 ? 87 : -90), Z(924), 3 * s, 52 * s, 1.6);
      sh.rect(X(sg === 1 ? 8.25 : -87), Z(924), 78.75 * s, 3 * s, ly);     // piso c/paso Ø16.5
      if (ha) hatchRect(sh, X(sg === 1 ? 8.25 : -87), Z(924), 78.75 * s, 3 * s, 1.6);
    }
  },
  junta(sh, X, Z, s, ly) {
    sh.rect(X(-88), Z(976), 3 * s, 1.5 * s, ly);
    sh.rect(X(85), Z(976), 3 * s, 1.5 * s, ly);
  },
  tapa(sh, X, Z, s, ly, ha) {
    sh.rect(X(-90), Z(977.5), 180 * s, 8 * s, ly);
    if (ha) hatchRect(sh, X(-90), Z(977.5), 180 * s, 8 * s, 3.2);
  },
  pcb(sh, X, Z, s, ly) { sh.rect(X(-80), Z(933), 100 * s, 1.6 * s, ly); },
  separadores(sh, X, Z, s, ly) {
    for (const x of [-75, 15]) sh.rect(X(x - 3), Z(927), 6 * s, 6 * s, ly);
  },
  portapilas(sh, X, Z, s, ly) { sh.rect(X(22), Z(927), 60 * s, 5 * s, ly); },
  baterias(sh, X, Z, s, ly) {
    sh.circle([X(38.5), Z(945.1)], 13.1 * s, ly);
    sh.circle([X(65.5), Z(945.1)], 13.1 * s, ly);
  },
  bms(sh, X, Z, s, ly) { sh.rect(X(32), Z(927), 40 * s, 2 * s, 'FINA'); },
  borne_bus(sh, X, Z, s, ly) { sh.rect(X(-1), Z(927), 30 * s, 12 * s, 'FINA'); },
  desecante(sh, X, Z, s, ly) { sh.rect(X(-81), Z(927), 30 * s, 15 * s, 'FINA'); },
  m12(sh, X, Z, s, ly) { sh.circle([X(60), Z(950)], 8.5 * s, 'FINA'); },
  m12_tapa(sh, X, Z, s, ly) { sh.circle([X(60), Z(950)], 9.5 * s, 'FINA'); },
  vent(sh, X, Z, s, ly) { sh.circle([X(60), Z(950)], 7.5 * s, 'FINA'); },
  antena(sh, X, Z, s, ly) {
    sh.rect(X(90), Z(930), 4 * s, 46 * s, ly);           // placa al gabinete
    sh.rect(X(90), Z(976), 20 * s, 4 * s, ly);           // ala superior
    sh.rect(X(95), Z(980), 14 * s, 30 * s, ly);          // base N/SMA
    sh.rect(X(97), Z(1010), 10 * s, 195 * s, ly);        // látigo 868/915
  },
  collar(sh, X, Z, s, ly, ha) {
    for (const sg of [1, -1]) {
      const p = [[25.3, 0], [80, 0], [80, 4], [31, 13], [25.3, 13]];
      sh.poly([...p.map(([x, z]) => [X(sg * x), Z(z)]), [X(sg * 25.3), Z(0)]], ly);
      if (ha) hatchRect(sh, X(sg === 1 ? 25.3 : -80), Z(0), 54.7 * s, 4 * s, 2.2);
    }
  },
  panel(sh, X, Z, s, ly) {
    const th = D.panel.angulo * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
    const P0 = (x, h) => [X(x * c + h * sn), Z(1010.2 - x * sn + h * c)];
    sh.poly([P0(-95, 0), P0(95, 0), P0(95, 15), P0(-95, 15), P0(-95, 0)], ly);
  },
  soporte_panel(sh, X, Z, s, ly) {
    sh.poly([[X(-90), Z(985.5)], [X(90), Z(985.5)], [X(-90), Z(1033.5)], [X(-90), Z(985.5)]], ly);
  },
  tapon_hinca(sh, X, Z, s, ly) {
    // se dibuja centrado en el eje (posición de uso durante la hinca)
    sh.poly([[X(-28), Z(902)], [X(28), Z(902)], [X(28), Z(922)], [X(21.1), Z(922)], [X(21.1), Z(937)],
      [X(-21.1), Z(937)], [X(-21.1), Z(922)], [X(-28), Z(922)], [X(-28), Z(902)]], ly);
  },
};

// facade de Sheet que RECORTA todo a la caja [bx,by,bw,bh] (Liang-Barsky)
function clippedSheet(sh, bx, by, bw, bh) {
  const x1 = bx, y1 = by, x2 = bx + bw, y2 = by + bh;
  const clipLine = (a, b) => {
    let [ax, ay] = a, [bx2, by2] = b;
    let t0 = 0, t1 = 1;
    const dx = bx2 - ax, dy = by2 - ay;
    for (const [p, q] of [[-dx, ax - x1], [dx, x2 - ax], [-dy, ay - y1], [dy, y2 - ay]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
      else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [[ax + t0 * dx, ay + t0 * dy], [ax + t1 * dx, ay + t1 * dy]];
  };
  return {
    line(a, b, ly) { const c = clipLine(a, b); if (c) sh.line(c[0], c[1], ly); },
    rect(x, y, w, h, ly) {
      this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], ly);
    },
    poly(pts, ly) { for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i], pts[i + 1], ly); },
    circle(c, r, ly) {
      if (c[0] - r >= x1 && c[0] + r <= x2 && c[1] - r >= y1 && c[1] + r <= y2) sh.circle(c, r, ly);
    },
    text(t, x, y, hh, al, ly) { if (x >= x1 && x <= x2 && y >= y1 && y <= y2) sh.text(t, x, y, hh, al, ly); },
  };
}

// dibuja un conjunto de piezas en una ventana [x0,x1]×[z0,z1] centrada en caja,
// RECORTANDO a la caja para que el contexto no se desborde de la viñeta
function drawWindow(sh, ids, win, bx, by, bw, bh, opts = {}) {
  const s = Math.min(bw / (win.x1 - win.x0), bh / (win.z1 - win.z0));
  const ox = bx + (bw - (win.x1 - win.x0) * s) / 2;
  const oy = by + (bh - (win.z1 - win.z0) * s) / 2;
  const X = (x) => ox + (x - win.x0) * s;
  const Z = (z) => oy + (z - win.z0) * s;
  const cs = clippedSheet(sh, bx, by, bw, bh);
  const all = opts.contexto || [];
  for (const id of all) if (DRAW[id] && !ids.includes(id)) DRAW[id](cs, X, Z, s, 'FINA', false);
  for (const id of ids) if (DRAW[id]) DRAW[id](cs, X, Z, s, 'VISIBLE', !!opts.hatch);
  return { X, Z, s };
}
const CTX_TODAS = Object.keys(DRAW);
const idsPaso = (p) => {
  const ids = [];
  for (const raw of p.partes) {
    if (DRAW[raw]) ids.push(raw);
    else if (raw === 'pasamuro2' || raw === 'pasamuro3') continue;
  }
  return ids;
};

// ---------------------------------------------------------------------------
// SND-GA-01 — arreglo general (elevación 1:5, A2 para holgura de cotas)
// ---------------------------------------------------------------------------
function gaSheet() {
  const sh = new Sheet('A2', 594, 420, 1, 10, 1);
  const s = 1 / 10;
  const ox = 300, oy = 55;                       // origen: eje sonda, z=-740
  const X = (x) => ox + x * s, Z = (z) => oy + (z + 740) * s;
  for (const id of CTX_TODAS) DRAW[id](sh, X, Z, s, 'VISIBLE', false);
  // línea de terreno
  sh.line([X(-1100), Z(0)], [X(1300), Z(0)], 'PLIEGUE');
  sh.text('NPT 0.00 (nivel de terreno)', X(-1100) - 2, Z(0), 3.0, 'R');
  // cotas de profundidad / elevación (a la izquierda)
  const dv = (x, z1, z2, d, t) => {
    const xl = X(x) - d;
    for (const z of [z1, z2]) sh.line([X(x), Z(z)], [xl - 1.5, Z(z)], 'COTAS');
    sh.line([xl, Z(z1)], [xl, Z(z2)], 'COTAS');
    sh.text(t, xl - 1.8, (Z(z1) + Z(z2)) / 2, 3.0, 'MR', 'COTAS');
  };
  dv(-80, 0, -200, 14, '200');
  dv(-80, 0, -400, 26, '400');
  dv(-80, 0, -600, 38, '600');
  dv(-80, 0, -728, 52, '728 (ápice)');
  dv(-80, 900, 0, 14, '900 (elevación cabezal)');
  dv(-80, 1205, 0, 30, '1205 (tope antena)');
  // cotas horizontales
  sh.dimH(X(-25), X(25), Z(-745), 9, 50);
  sh.dimH(X(-90), X(90), Z(1040), 10, 180);
  sh.dimH(X(-80), X(80), Z(-14), 20, 160);
  // rótulos
  const tag = (x, z, dx, dz, t) => {
    sh.line([X(x), Z(z)], [X(x) + dx, Z(z) + dz], 'COTAS');
    sh.text(t, X(x) + dx + (dx >= 0 ? 1 : -1), Z(z) + dz, 2.6, dx >= 0 ? 'L' : 'R', 'COTAS');
  };
  tag(25, -200, 46, 6, 'SMT100 #1 @ −20 cm (az 0°) en pasamuro POM-C Ø35');
  tag(-96, -400, -14, 6, 'SMT100 #2 @ −40 cm (az 120°)');
  tag(-96, -600, -14, 6, 'SMT100 #3 @ −60 cm (az 240°)');
  tag(25, -690, 40, -6, 'Punta 316L cono 40°, ápice romo r2');
  tag(80, 6, 44, -12, 'Collar antipercolación Ø160 POM-C + sello de bentonita');
  tag(25, 450, 50, 0, 'TRAMO ELEVADOR (mismo tubo PVC-U): cabezal a 0.9 m — panel y antena');
  tag(25, 450, 50, -5.2, 'despejados de vegetación/anegamiento (práctica CropX · Sentek · METER)');
  tag(90, 950, 32, 4, 'Gabinete Fibox ARCA PC 150/60 HG (IP66/67) + M12 servicio + válvula Gore');
  tag(60, 1025, 30, 8, 'Panel solar 5 W sobre soporte Al 15° (orientar al ecuador)');
  tag(102, 1120, 26, 4, 'Antena 868/915 MHz 2 dBi — remata SOBRE el panel');
  tag(25, 888, 48, -8, 'Acople 316L + tórica FKM 36×3 + Skintop MS-M16');
  const notas = [
    'Sonda multiprofundidad grado industrial: 3× Truebner SMT100 (RS-485) a 200/400/600, tubo PVC-U Ø50×3.7 EN 1452 (portante + elevador L1550).',
    'CABEZAL ELEVADO 900 mm (estado del arte): CropX exige la antena sobre el canopy máximo; Sentek PLUS y METER ZL6 montan electrónica y panel en poste — referencias con URL en sonda_suelo_dims.json (webRef).',
    'Sensores en espiga radial desfasados 120°: zona sensora en suelo NO perturbado y tubo sin debilitarse en un mismo plano.',
    'IP68: tóricas FKM 36×3 (punta y cabezal), potting PU en pasamuros, Skintop MS-M16, junta PU de tapa, válvula Gore anti-condensación.',
    'Tramo aéreo del tubo pintado blanco (protección UV) o PVC estabilizado; opcional funda/mástil galvanizado si hay tránsito de maquinaria.',
    'Corte completo y globos → SND-CT-04 · corte del cabezal → SND-CT-05 · instrucciones → SND-EN-07/08 · BOM → SND-BM-09.',
  ];
  notas.forEach((t, i) => sh.text(t, 24, 46 - i * 5, 2.6, 'L'));
  tb(sh, 'Sonda de humedad de suelo industrial — arreglo general', 'SND-GA-01', '1:10',
    'elevación XZ desde el ensamble paramétrico; 3D: sonda_suelo.json');
  return sh;
}

// ---------------------------------------------------------------------------
// SND-ISO-02 / ISO-03 — vistas normalizadas + isométrica sombreada (malla CSG)
// ---------------------------------------------------------------------------
function bakeParts(filterIds) {
  const out = [];
  for (const part of doc.parts) {
    if (filterIds && !filterIds.includes(part.id)) continue;
    const g = buildPartGeometry(part);
    g.applyMatrix4(partMatrix(part));
    out.push({ geometry: g });
  }
  return out;
}
const HEAD_IDS = ['acople', 'torica_cabezal', 'prensa', 'contratuerca', 'gabinete', 'junta',
  'tapa', 'pcb', 'separadores', 'portapilas', 'baterias', 'bms', 'borne_bus', 'desecante',
  'm12', 'm12_tapa', 'vent', 'panel', 'soporte_panel', 'antena'];

// ---------------------------------------------------------------------------
// SND-CT-04 — corte A-A completo con globos
// ---------------------------------------------------------------------------
function corteSheet() {
  const sh = new Sheet('A2', 594, 420, 1, 10, 1);
  const s = 1 / 10;
  const ox = 265, oy = 52;
  const X = (x) => ox + x * s, Z = (z) => oy + (z + 760) * s;
  const activos = ['punta', 'tubo', 'sensor1', 'pasamuro1', 'torica_punta', 'torica_cabezal',
    'acople', 'prensa', 'contratuerca', 'gabinete', 'junta', 'tapa', 'pcb', 'separadores',
    'portapilas', 'baterias', 'collar', 'panel', 'soporte_panel', 'antena'];
  for (const id of ['sensor2', 'sensor3', 'bms', 'borne_bus', 'desecante', 'm12', 'vent'])
    DRAW[id](sh, X, Z, s, 'FINA', false);
  for (const id of activos) DRAW[id](sh, X, Z, s, 'VISIBLE', true);
  // eje y línea de suelo
  sh.line([X(0), Z(-750)], [X(0), Z(1230)], 'PLIEGUE');
  sh.line([X(-500), Z(0)], [X(900), Z(0)], 'PLIEGUE');
  sh.text('NPT 0.00', X(-500) - 2, Z(0), 2.8, 'R');
  // ruta del bus (cables interiores)
  for (let z = -630; z < 910; z += 26) sh.line([X(6), Z(z)], [X(6), Z(Math.min(z + 14, 910))], 'COTAS');
  sh.text('bus RS-485 interior (3 sensores en cadena)', X(12), Z(-320), 2.5, 'L', 'COTAS');
  // globos → ítems de la BOM
  const globo = (n, xw, zw, xp, zp) => {
    sh.line([X(xw), Z(zw)], [xp, zp], 'COTAS');
    sh.circle([xp, zp], 3.4, 'COTAS');
    sh.text(String(n), xp, zp - 1.2, 3.2, 'C', 'COTAS');
  };
  const L = 165, R = 372;
  globo(1, -12, -700, L, Z(-700));
  globo(5, -20.3, -642, L, Z(-560));
  globo(2, -23, -300, L, Z(-300));
  globo(22, -78, 6, L, Z(-60));
  globo(4, 27, -200, R, Z(-260));
  globo(3, 150, -200, R, Z(-120));
  // cabezal: columnas ordenadas por z del objetivo (líneas sin cruces)
  globo(5, -20.3, 890, L, Z(620));
  globo(7, -9, 912, L, Z(705));
  globo(6, -40, 920, L, Z(790));
  globo(8, -12.7, 929, L, Z(875));
  globo(12, -60, 934, L, Z(960));
  globo(9, -89, 950, L, Z(1045));
  globo(10, -86.5, 977, L, Z(1130));
  globo(11, -80, 981, L, Z(1215));
  globo(14, 50, 929, R, Z(700));
  globo(15, 65.5, 945, R, Z(790));
  globo(19, 62, 950, R, Z(880));
  globo(21, 68, 958, R, Z(970));
  globo(24, 80, 990, R, Z(1060));
  globo(23, 60, 1020, R, Z(1150));
  globo(29, 102, 1120, R, Z(1240));
  sh.text('Los números de globo corresponden al ÍTEM de la BOM (lámina SND-BM-09).', 24, 52, 2.8, 'L');
  sh.text('Sensores #2/#3, bornera, BMS, desecante, M12 y válvula quedan FUERA del plano de corte: se muestran en línea fina (proyección).', 24, 47, 2.8, 'L');
  sh.text('CORTE A-A (plano vertical por el eje y el sensor #1) — achurado = material seccionado · cabezal elevado 900 sobre NPT', 24, 57, 3.4, 'L');
  tb(sh, 'Sonda de suelo industrial — corte longitudinal A-A', 'SND-CT-04', '1:10',
    'sección analítica del ensamble paramétrico con globos a BOM');
  return sh;
}

// ---------------------------------------------------------------------------
// SND-CT-05 — corte del cabezal (1:2)
// ---------------------------------------------------------------------------
function corteCabezalSheet() {
  const sh = new Sheet('A3', 420, 297, 1, 2, 1);
  const s = 1 / 2;
  const ox = 175, oy = 60;
  const X = (x) => ox + x * s, Z = (z) => oy + (z - 858) * s;
  const activos = ['torica_cabezal', 'acople', 'prensa', 'contratuerca', 'gabinete',
    'junta', 'tapa', 'pcb', 'separadores', 'portapilas', 'baterias', 'panel', 'soporte_panel', 'antena'];
  // tubo elevador (se corta abajo en la rotura)
  const wall = (x0, x1, z0, z1) => {
    sh.rect(X(x0), Z(z0), (x1 - x0) * s, (z1 - z0) * s, 'VISIBLE');
    hatchRect(sh, X(x0), Z(z0), (x1 - x0) * s, (z1 - z0) * s, 1.8);
  };
  wall(-25, -21.3, 860, 900); wall(21.3, 25, 860, 900);
  for (const id of activos) DRAW[id](sh, X, Z, s, 'VISIBLE', true);
  for (const id of ['bms', 'borne_bus', 'desecante', 'm12', 'm12_tapa', 'vent'])
    DRAW[id](sh, X, Z, s, 'FINA', false);
  sh.line([X(0), Z(855)], [X(0), Z(1045)], 'PLIEGUE');
  // cotas clave
  sh.dimH(X(-21.3), X(21.3), Z(862), 8, 42.6);
  sh.dimH(X(-28), X(28), Z(902), 16, 56);
  sh.dimH(X(-45), X(45), Z(918), 24, 90);
  const tag = (x, z, dx, dz, t) => {
    sh.line([X(x), Z(z)], [X(x) + dx, Z(z) + dz], 'COTAS');
    sh.text(t, X(x) + dx + (dx >= 0 ? 1 : -1), Z(z) + dz, 2.5, dx >= 0 ? 'L' : 'R', 'COTAS');
  };
  tag(-20.3, 890, -26, -10, 'Tórica FKM 36×3 en garganta 37.6/2.4/4.0 (detalle X, SND-DT-06)');
  tag(-21.2, 894, -30, 6, 'Espiga Ø42.4 f7 en tubo ID 42.6 (juego 0.2)');
  tag(-45, 920, -18, 14, 'Brida Ø90 · 4×M4 patrón 56×56 + Loctite 243 (2 N·m)');
  tag(-11.5, 920, -34, 26, 'Skintop MS-M16 colgado en cavidad Ø36 (gland-down, protegido)');
  tag(-12.7, 929, -40, 38, 'Contratuerca M16 por dentro (3 N·m)');
  tag(-84, 970, -12, 20, 'Junta PU + tapa 4×M4 (1.2 N·m en cruz)');
  tag(38.5, 945, 40, -18, '2× LiFePO4 26650 + BMS solar');
  tag(-60, 934, -20, 44, 'PCB nodo: ESP32 ind. + RAK3172-T + buck aislado + THVD1450');
  tag(60, 950, 46, -6, 'M12 A-cod servicio (pared −Y) / válvula Gore (pared +Y) — fuera de plano');
  tag(60, 1018, 40, 14, 'Panel 5 W + soporte Al 15°');
  tag(100, 995, 26, 26, 'Antena 868/915 2 dBi + jumper SMA por paso Ø6.5 sellado');
  sh.text('CORTE B-B DEL CABEZAL (a 900 sobre NPT) — el prensaestopas queda gland-down DENTRO de la cavidad del acople: cable sin radio expuesto y sin goteo hacia la rosca.', 22, 46, 2.8, 'L');
  tb(sh, 'Sonda de suelo industrial — corte B-B del cabezal', 'SND-CT-05', '1:2',
    'interfaz tubo–acople–gabinete con sellos y aprietes');
  return sh;
}

// ---------------------------------------------------------------------------
// SND-DT-06 — detalles de sellos y pasamuro + tabla de aprietes
// ---------------------------------------------------------------------------
function detallesSheet() {
  const sh = new Sheet('A3', 420, 297, 1, 1, 1);
  // --- detalle X: garganta tórica (5:1), lado derecho de la espiga ---
  {
    const s = 5, ox = 60, oy = 150;
    const X = (r) => ox + (r - 16) * s, Z = (z) => oy + (z - 0) * s;
    // espiga (corte): pared desde r16 a r21.2, garganta 6..10
    sh.poly([[X(16), Z(-6)], [X(21.2), Z(-6)], [X(21.2), Z(6)], [X(18.8), Z(6)],
      [X(18.8), Z(10)], [X(21.2), Z(10)], [X(21.2), Z(22)], [X(16), Z(22)], [X(16), Z(-6)]], 'VISIBLE');
    hatchRect(sh, X(16), Z(-6), 5.2 * s, 12 * s, 2.4);
    hatchRect(sh, X(16), Z(10), 5.2 * s, 12 * s, 2.4);
    hatchRect(sh, X(16), Z(6), 2.8 * s, 4 * s, 2.4);
    // tubo (pared ID 21.3)
    sh.rect(X(21.3), Z(-6), 3.7 * s, 28 * s, 'VISIBLE');
    hatchRect(sh, X(21.3), Z(-6), 3.7 * s, 28 * s, 2.4);
    // tórica comprimida (elipse aproximada por círculo)
    sh.circle([X(20.05), Z(8)], 1.5 * s, 'VISIBLE');
    sh.dimV(X(18.8), Z(6), Z(10), 10, 4.0);
    sh.dimH(X(18.8), X(21.2), Z(-2), 8, 2.4);
    sh.text('DETALLE X — GARGANTA TÓRICA (5:1)', ox + 8, oy + 122, 3.5, 'L');
    const t = ['Tórica ISO 3601 36×3 FKM 75 Sh', 'Fondo de garganta Ø37.6',
      'Apriete 17 % (regla Parker 15–25 %)', 'Llenado de garganta ≈ 74 %',
      'Ra garganta ≤ 1.6 · flancos 0–5°', 'Grasa Molykote 111 al montar'];
    t.forEach((x, i) => sh.text(x, ox + 2, oy - 16 - i * 4.6, 2.8, 'L'));
  }
  // --- detalle Y: pasamuro de sensor (2:1) ---
  {
    const s = 2, ox = 210, oy = 150;
    const X = (x) => ox + x * s, Z = (z) => oy + z * s;   // x = radial, z = vertical local
    // pared del tubo con taladro Ø35
    for (const sg of [1, -1]) {
      sh.rect(X(-10), Z(sg === 1 ? 17.5 : -37.5), 31.3 * s, 20 * s, 'VISIBLE');
      hatchRect(sh, X(-10), Z(sg === 1 ? 17.5 : -37.5), 31.3 * s, 20 * s, 2.2);
    }
    // pasamuro POM-C
    sh.rect(X(-7.3), Z(-17.3), 15.2 * s, 34.6 * s, 'VISIBLE');
    sh.rect(X(3.9), Z(-21), 4 * s, 42 * s, 'VISIBLE');
    // hoja del sensor
    sh.rect(X(-14), Z(-15), 60 * s, 30 * s, 'VISIBLE');
    sh.text('DETALLE Y — PASAMURO SMT100 (2:1)', ox - 16, oy + 122, 3.5, 'L');
    const t = ['Taladro tubo Ø35 · cuerpo POM-C Ø34.6 pegado (epoxi estructural)',
      'Ranura 31×13 (hoja 30×12, juego 0.5 por lado)',
      'Cavidad rellena con POTTING PU dieléctrico hasta la brida',
      'Brida exterior Ø42 asentada al tubo (saddle mecanizado)',
      'Zona sensora ≥100 mm fuera del tubo: suelo NO perturbado'];
    t.forEach((x, i) => sh.text(x, ox - 20, oy - 50 - i * 4.6, 2.8, 'L'));
  }
  // --- tabla de aprietes/sellado ---
  {
    const x0 = 300, y0 = 250, wCols = [58, 22, 22];
    const rows = [
      ['UNIÓN', 'PAR', 'SEGURO'],
      ['4×M4 gabinete→acople', '2.0 N·m', 'Loctite 243'],
      ['4×M4 tapa (en cruz)', '1.2 N·m', '—'],
      ['Cuerpo Skintop MS-M16', '2.5 N·m', '—'],
      ['Contratuerca M16', '3.0 N·m', '—'],
      ['4×M3 PCB', '0.5 N·m', '—'],
      ['2×M5 prisioneros collar', '1.5 N·m', 'Loctite 243'],
      ['M12 acoplamiento', 'a mano', 'grasa dieléctr.'],
    ];
    sh.text('PARES DE APRIETE Y SELLADO', x0, y0 + 6, 3.5, 'L');
    rows.forEach((r, i) => {
      let x = x0;
      r.forEach((c, j) => { sh.text(c, x, y0 - 6 - i * 5.4, i ? 2.7 : 2.9, 'L', i ? 'TEXTO' : 'COTAS'); x += wCols[j]; });
    });
    const notas = ['Prueba IP68 (GATE, paso 10): vacío −20 kPa 5 min (caída ≤1 kPa)',
      'o inmersión 1 m / 30 min con testigo de humedad interior.',
      'Tóricas: NUNCA reutilizar tras desmontar el cabezal.'];
    notas.forEach((t, i) => sh.text(t, x0, y0 - 6 - rows.length * 5.4 - 6 - i * 4.6, 2.8, 'L'));
  }
  tb(sh, 'Sonda de suelo industrial — detalles de sellado', 'SND-DT-06', '5:1 / 2:1',
    'garganta tórica (Parker), pasamuro POM-C con potting, aprietes');
  return sh;
}

// ---------------------------------------------------------------------------
// SND-EN-07/08 — instrucciones de ensamble con viñetas
// ---------------------------------------------------------------------------
const VENT = {   // ventana de dibujo por paso
  1: null,
  2: { x0: -60, x1: 60, z0: -740, z1: -600 },
  3: { x0: -120, x1: 210, z0: -680, z1: -140 },
  4: { x0: -120, x1: 210, z0: -680, z1: -140 },
  5: { x0: -70, x1: 70, z0: 840, z1: 940 },
  6: { x0: -70, x1: 70, z0: 860, z1: 990 },
  7: { x0: -110, x1: 110, z0: 860, z1: 1000 },
  8: { x0: -100, x1: 100, z0: 910, z1: 990 },
  9: { x0: -130, x1: 150, z0: 890, z1: 1220 },
  10: { x0: -130, x1: 130, z0: -760, z1: 1230 },
  11: { x0: -220, x1: 340, z0: -760, z1: 1000 },
  12: { x0: -140, x1: 140, z0: 940, z1: 1230 },
};
function ensambleSheet(pasos, numPlano, parte) {
  const sh = new Sheet('A2', 594, 420, 1, 1, 1);
  const cols = 3, colW = 178, rowH = 158;
  pasos.forEach((p, i) => {
    const cx = 30 + (i % cols) * (colW + 8);
    const cy = 236 - Math.floor(i / cols) * (rowH + 14);
    sh.rect(cx, cy, colW, rowH + 8, 'FINA');
    sh.text(`PASO ${p.n} — ${p.t.toUpperCase()}`, cx + 3, cy + rowH + 2.4, 3.1, 'L', 'COTAS');
    const win = VENT[p.n];
    if (win) {
      const ids = idsPaso(p);
      drawWindow(sh, ids.length ? ids : CTX_TODAS, win, cx + 10, cy + 58, colW - 20, rowH - 56,
        { contexto: CTX_TODAS });
    } else {
      sh.text('(banco: verificación de BOM,', cx + 8, cy + 120, 2.8, 'L');
      sh.text('tóricas y bus Modbus)', cx + 8, cy + 115, 2.8, 'L');
    }
    wrap(p.texto, 118).slice(0, 13).forEach((ln, k) =>
      sh.text(ln, cx + 3, cy + 50 - k * 3.9, 2.35, 'L'));
  });
  tb(sh, `Sonda de suelo industrial — instrucciones de ensamble (${parte})`, numPlano, '—',
    'viñetas: sección con piezas del paso destacadas (resto en línea fina)');
  return sh;
}

// ---------------------------------------------------------------------------
// SND-BM-09 — BOM + consumibles + features + desviaciones
// ---------------------------------------------------------------------------
function bomSheet() {
  const sh = new Sheet('A2', 594, 420, 1, 1, 1);
  let y = 390;
  sh.text('LISTA DE MATERIALES (BOM)', 24, y, 4.2, 'L'); y -= 8;
  const cols = [10, 100, 66, 14, 160];
  const header = ['ÍT', 'DESIGNACIÓN', 'MATERIAL / NORMA', 'CANT', 'NOTA'];
  let x = 24;
  header.forEach((h, j) => { sh.text(h, x, y, 2.9, 'L', 'COTAS'); x += cols[j]; });
  y -= 5.5;
  for (const b of dims.bom) {
    x = 24;
    const cells = [String(b.item), b.desig, b.mat, String(b.cant), b.nota || '—'];
    cells.forEach((c, j) => {
      const lines = wrap(c, j === 4 ? 108 : j === 1 ? 66 : 44).slice(0, 2);
      lines.forEach((ln, k) => sh.text(ln, x, y - k * 3.4, 2.5, 'L'));
      x += cols[j];
    });
    y -= (b.nota && b.nota.length > 108) || b.desig.length > 66 ? 8.4 : 5.8;
    sh.line([24, y + 4.3], [24 + cols.reduce((a, b2) => a + b2, 0), y + 4.3], 'FINA');
  }
  // columna derecha: features / consumibles / desviaciones
  const xr = 384; let yr = 390;
  sh.text('FEATURES DEL PROTOTIPO', xr, yr, 4.2, 'L'); yr -= 7;
  for (const f of dims.features) {
    for (const ln of wrap('· ' + f, 78)) { sh.text(ln, xr, yr, 2.5, 'L'); yr -= 3.6; }
    yr -= 1.2;
  }
  yr -= 4;
  sh.text('CONSUMIBLES DE ENSAMBLE', xr, yr, 3.6, 'L'); yr -= 6;
  for (const c of dims.consumibles) {
    for (const ln of wrap('· ' + c, 78)) { sh.text(ln, xr, yr, 2.4, 'L'); yr -= 3.4; }
    yr -= 1;
  }
  yr -= 4;
  sh.text('DESVIACIONES DE INGENIERÍA vs INFORME', xr, yr, 3.6, 'L', 'COTAS'); yr -= 6;
  for (const d of dims.desviaciones) {
    for (const ln of wrap('· ' + d, 78)) { sh.text(ln, xr, yr, 2.4, 'L'); yr -= 3.4; }
    yr -= 1;
  }
  tb(sh, 'Sonda de suelo industrial — BOM, consumibles y features', 'SND-BM-09', '—',
    'fuente única: sonda_suelo_dims.json (capa user)', '—');
  return sh;
}

// ---------------------------------------------------------------------------
// armado del PDF
// ---------------------------------------------------------------------------
console.log('GA-01…');
const sheets = [gaSheet()];
console.log('ISO-02 (malla CSG del conjunto)…');
sheets.push(buildSheet(bakeParts(null), 1, {
  designacion: 'Sonda de suelo industrial — vistas normalizadas del conjunto',
  proyecto: PROYECTO, fuente: FUENTE, piezas: '30', numPlano: 'SND-ISO-02', fecha,
  nota: 'alzado/planta/perfil/isométrica desde la malla CSG del ensamble',
}));
console.log('ISO-03 (malla CSG del cabezal)…');
sheets.push(buildSheet(bakeParts(HEAD_IDS), 1, {
  designacion: 'Sonda de suelo industrial — cabezal (gabinete + acople + electrónica)',
  proyecto: PROYECTO, fuente: FUENTE, piezas: String(HEAD_IDS.length), numPlano: 'SND-ISO-03', fecha,
  nota: 'isométrica sombreada del cabezal completo',
}));
console.log('CT-04 / CT-05 / DT-06…');
sheets.push(corteSheet(), corteCabezalSheet(), detallesSheet());
console.log('EN-07 / EN-08…');
sheets.push(ensambleSheet(dims.pasos.slice(0, 6), 'SND-EN-07', 'pasos 1–6'));
sheets.push(ensambleSheet(dims.pasos.slice(6), 'SND-EN-08', 'pasos 7–12'));
console.log('BM-09…');
sheets.push(bomSheet());

const pdf = exportSheetsPDF(sheets, 'sonda_suelo_premium.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK ${join(outDir, pdf.name)} (${sheets.length} láminas)`);
