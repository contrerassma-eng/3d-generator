#!/usr/bin/env node
// planos_fab.mjs — Genera los PLANOS DE FABRICACIÓN (PDF) de todas las piezas
// del ensamble transfer_rodillos_90.json.
//
// Reutiliza el motor CAD (model.js) para construir la malla de cada pieza y el
// exportador de planos del navegador (drawing2d.js: vistas del primer diedro,
// isométrica, cotas envolventes y cajetín ISO 7200/5457/129/5456-2, con
// escritor PDF propio). Agrupa piezas idénticas por firma geométrica y emite:
//   - out/planos/PN-NN_<pieza>.pdf   (un plano por pieza FABRICADA, con cantidad)
//   - out/planos/_despiece.json      (lista de materiales: fabricadas + normalizadas)
// Un paso Python (pipeline/planos_pdf.py) arma la portada + despiece y funde
// todo en out/planos/planos_fabricacion_transfer90.pdf.
//
// Uso:  node cad/ensambles/planos_fab.mjs   (desde la raíz del repo)

import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import { buildSheet, Sheet, chooseSheet, scaleLabel, exportSheetsPDF } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Lámina SIMPLIFICADA (3 vistas envolventes) para piezas con malla muy grande,
// donde la extracción de aristas del exportador no escala (p. ej. el canal con
// decenas de miles de triángulos por sus muchos agujeros). Toma la caja
// envolvente de la malla y dibuja rectángulos acotados + cajetín ISO.
const MARGIN = 10, MARGIN_L = 20, TITLE_H = 42, GAP = 26;
// Lámina ANALÍTICA para piezas dominadas por un boceto extruido (placas peine):
// dibuja el contorno del boceto (perfil real) + los agujeros como círculos, sin
// malla. Da un plano útil de la cara de la placa, instantáneo y con las cotas
// envolventes. El boceto está en plano YZ (u=Y, v=Z); los agujeros en (y,z).
function plateSheet(part, meta) {
  const sk = part.features.find(f => f.shape === 'sketch' && f.params.pts);
  if (!sk) return null;
  const pts = sk.params.pts;                       // [[u=Y, v=Z], ...]
  const dz = -sk.at[2];                             // los agujeros vienen en z-dz
  const holes = part.features.filter(f => f.shape === 'hole')
    .map(f => ({ y: f.at[1], z: f.at[2] + dz, d: f.params.dia }));
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const [u, v] of pts) { lo = [Math.min(lo[0], u), Math.min(lo[1], v)]; hi = [Math.max(hi[0], u), Math.max(hi[1], v)]; }
  const W = hi[0] - lo[0], H = hi[1] - lo[1];
  const [name, PW, PH, num, den] = chooseSheet(W, H + 20);
  const sh = new Sheet(name, PW, PH, num, den, 1);
  const s = num / den;
  const uw = PW - MARGIN_L - MARGIN, uh = PH - 2 * MARGIN - TITLE_H - 5;
  const ox = MARGIN_L + (uw - W * s) / 2 - lo[0] * s;
  const oy = MARGIN + TITLE_H + 5 + (uh - H * s) / 2 - lo[1] * s;
  const T = (u, v) => [ox + u * s, oy + v * s];
  sh.poly(pts.map(([u, v]) => T(u, v)), 'VISIBLE');
  for (const h of holes) sh.circle(T(h.y, h.z), (h.d / 2) * s, 'VISIBLE');
  sh.text('VISTA DE CARA (perfil del boceto + perforaciones)', ox + lo[0] * s + W * s / 2, oy + hi[1] * s + 5, 3.5, 'C');
  sh.dimH(ox + lo[0] * s, ox + hi[0] * s, oy + lo[1] * s, 9, W);
  sh.dimV(ox + hi[0] * s, oy + lo[1] * s, oy + hi[1] * s, 9, H);
  sh.frame();
  sh.titleBlock({
    designacion: meta.designacion, proyecto: meta.proyecto ?? 'foto3d CAD',
    fuente: meta.fuente ?? 'diseño paramétrico — capa user',
    verificacion: 'PERFIL DE BOCETO (CAPA USER)', piezas: String(meta.piezas),
    nota: (meta.nota ? meta.nota + ' · ' : '') + 'cara con perforaciones; espesor y cortes en el JSON',
    escala: scaleLabel(num, den), fecha: meta.fecha ?? '—', numPlano: meta.numPlano ?? 'CAD-01',
  });
  return sh;
}

function simpleSheet(geom, meta) {
  const p = geom.attributes.position;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.count; i++) {
    const v = [p.getX(i), p.getY(i), p.getZ(i)];
    for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], v[a]); hi[a] = Math.max(hi[a], v[a]); }
  }
  const W = hi[0] - lo[0], D = hi[1] - lo[1], H = hi[2] - lo[2];
  const tw = W + GAP + D, th = H + GAP + D;
  const [name, PW, PH, num, den] = chooseSheet(tw, th);
  const sh = new Sheet(name, PW, PH, num, den, 1);
  const s = num / den;
  const uw = PW - MARGIN_L - MARGIN, uh = PH - 2 * MARGIN - TITLE_H - 5;
  const ox = MARGIN_L + (uw - tw * s) / 2, oy = MARGIN + TITLE_H + 5 + (uh - th * s) / 2;
  const view = (dx, dy, w, h, label) => {
    const x = ox + dx * s, y = oy + dy * s;
    sh.rect(x, y, w * s, h * s, 'VISIBLE');
    sh.text(label, x + w * s / 2, y + h * s + 4, 3.5, 'C');
  };
  view(0, D + GAP, W, H, 'ALZADO');
  view(0, 0, W, D, 'PLANTA');
  view(W + GAP, D + GAP, D, H, 'PERFIL');
  sh.dimH(ox, ox + W * s, oy + (D + GAP) * s, 9, W);
  sh.dimV(ox + W * s, oy + (D + GAP) * s, oy + (D + GAP + H) * s, 9, H);
  sh.dimV(ox + W * s, oy, oy + D * s, 9, D);
  sh.frame();
  sh.titleBlock({
    designacion: meta.designacion, proyecto: meta.proyecto ?? 'foto3d CAD',
    fuente: meta.fuente ?? 'diseño paramétrico — capa user',
    verificacion: 'ENVOLVENTE (MALLA COMPLEJA)', piezas: String(meta.piezas),
    nota: (meta.nota ? meta.nota + ' · ' : '') + 'vistas envolventes — ver features en el JSON',
    escala: scaleLabel(num, den), fecha: meta.fecha ?? '—', numPlano: meta.numPlano ?? 'CAD-01',
  });
  return sh;
}

// tras el bundle, import.meta.url apunta al bundle: usar rutas desde el cwd
// (el script se corre desde cad/, como las pruebas).
const jsonPath = process.env.DOC || 'ensambles/transfer_rodillos_90.json';
const doc = JSON.parse(readFileSync(jsonPath, 'utf8'));
const outDir = process.env.OUTDIR || 'ensambles/planos_transfer90';
mkdirSync(outDir, { recursive: true });

// --- Clasificación: piezas NORMALIZADAS (compradas, solo van al despiece) ----
const NORMA = [
  { re: /Rodamiento 6004/, norma: 'DIN 625 · 6004-2RS (20×42×12)' },
  { re: /Rodamiento 6901/, norma: 'DIN 625 · 6901-2RS (12×24×6)' },
  { re: /Rodamiento 6205/, norma: 'DIN 625 · 6205-2RS (25×52×15)' },
  { re: /Chumacera UCFL204/, norma: 'Unidad de brida UCFL204 · bore Ø20' },
  { re: /Perno hexagonal M10/, norma: 'DIN 933 · M10 + golilla DIN 125' },
  { re: /Seeger DIN 471-12/, norma: 'DIN 471 · Ø12' },
  { re: /Seeger DIN 471-25/, norma: 'DIN 471 · Ø25' },
  { re: /Seeger DIN 471-8/, norma: 'DIN 471 · Ø8' },
  { re: /Seeger DIN 472-52/, norma: 'DIN 472 · Ø52' },
  { re: /Buje bronce/, norma: 'Buje sinterizado SAE 841' },
  { re: /Buje SIT-LOCK|SIT-LOCK/, norma: 'SIT-LOCK CAL 1 · 25×34' },
  { re: /Golilla plana DIN 125|Golilla plana Ø/, norma: 'DIN 125' },
  { re: /Golilla de presión DIN 127/, norma: 'DIN 127' },
  { re: /Tuerca .*M10|Tuerca hex M10/, norma: 'DIN 934 · M10' },
  { re: /Tuerca tensora M12|Tuerca M12/, norma: 'DIN 934 · M12' },
  { re: /Chaveta/, norma: 'DIN 6885 A 8×7' },
  { re: /Rótula/, norma: 'DIN ISO 12240-4 · M10' },
  { re: /Grasera/, norma: 'DIN 71412 · M6' },
  { re: /Electroválvula/, norma: 'Válvula 5/2 24VDC · racor Ø8' },
  { re: /Motorreductor/, norma: 'Motorreductor ~0.18 kW i≈6.3' },
  { re: /Cilindro ISO 6432/, norma: 'ISO 6432 · Ø32 c.10' },
  { re: /Pasador guía/, norma: 'Pasador rectificado Ø8 m6' },
  { re: /Golilla de empuje/, norma: 'Arandela de empuje nylon Ø22×1.5' },
];
// piezas que son AGRUPACIONES de normalizadas (no llevan plano propio):
const SOLO_DESPIECE = [/^MÓVIL · Fijación eje/];

// Material sugerido por tipo de pieza fabricada
function materialDe(name) {
  if (/Canal|Placa|Puente|Palanca|Soporte|Horquilla|Ménsula|Portarodamiento/.test(name)) return 'Acero S275JR';
  if (/Eje|Pasador|Cubo/.test(name)) return 'Acero SAE 1045';
  if (/Vulcanizado/.test(name)) return 'Vulcanizado NBR sobre tubo (dureza 75 ShA)';
  if (/Tubo de acero/.test(name)) return 'Tubo St37 Ø51 (bore Ø42 H7)';
  if (/Rodillo/.test(name)) return 'Tubo St37 + vulcanizado NBR';
  if (/Tambor/.test(name)) return 'Acero St37 (rolado + soldado)';
  if (/Tensor|Polea de retorno/.test(name)) return 'Aluminio 6061-T6';
  if (/Banda/.test(name)) return 'Banda plana nitrilo/poliéster 3 mm';
  if (/Separador|Descanso|Nivelador|Acople/.test(name)) return 'Bronce / acero';
  return 'Acero';
}

// Designación legible: quita sufijos de posición/lado para agrupar idénticas.
// Un grupo entre paréntesis se considera POSICIÓN (se borra) si no contiene
// ninguna palabra real de 3+ letras tras quitar los marcadores de eje X/Y
// (así "(+X)", "(0,78)", "(, y=-250)" se van, pero "(llanta + tapas + cubo)",
// "(chaveteros 8 DIN 6885)", "(serpentín)" se conservan).
function designacion(name) {
  let s = name.replace(/^(MÓVIL|FIJO) · /, '');
  s = s.replace(/\s*\([^)]*\)/g, (m) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(m.replace(/[XY]/g, '')) ? m : '');
  s = s.replace(/\s*línea y=-?\d+/g, '')
       .replace(/\s*y=-?\d+/g, '').replace(/\s*x=-?\d+/g, '')
       .replace(/\s*[+-][XY]\b/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

// Firma geométrica local (agrupa piezas idénticas, incluidas las espejo L/R:
// usa la designación normalizada — sin sufijos de posición — + las funciones,
// ignorando la traslación absoluta `at`).
function firma(part) {
  const fs = part.features.map(f => {
    const p = Object.entries(f.params || {}).map(([k, v]) =>
      `${k}:${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`).sort().join(',');
    return `${f.shape}|${f.op}|${p}`;
  });
  return `${designacion(part.name)}||${fs.join(';')}`;
}

// --- Agrupar ----------------------------------------------------------------
const grupos = new Map();
for (const part of doc.parts) {
  const key = firma(part);
  let g = grupos.get(key);
  if (!g) grupos.set(key, g = { part, cant: 0, name: part.name });
  g.cant++;
}

const esNorma = (n) => NORMA.find(x => x.re.test(n));
const esSoloDespiece = (n) => SOLO_DESPIECE.some(re => re.test(n));

// Orden de despiece: canal/estructura, elevación, placas, rodillos, transmisión
const grupoOrden = (n) => {
  if (/Canal|Ala|Nivelador/.test(n)) return 0;
  if (/Cilindro|Palanca|Soporte|Horquilla|Puente|Rótula|Perno|Electro|Pasador/.test(n)) return 1;
  if (/Placa|Fijación/.test(n)) return 2;
  if (/Rodillo|Eje rodillo|Golilla|Tuerca hex|Rodamiento 6901|Seeger DIN 471-12/.test(n)) return 3;
  return 4; // transmisión (tambor, poleas, banda, motor, acople, descansos)
};
const lista = [...grupos.values()].sort((a, b) =>
  grupoOrden(a.name) - grupoOrden(b.name) || a.name.localeCompare(b.name));

// --- Emitir láminas de las FABRICADAS + construir despiece --------------------
const despiece = [];
const fabSheets = [];
let itemN = 0, planoN = 0;
const M4 = new THREE.Matrix4();
const fecha = process.argv[2] || '—';   // fecha inyectada (por reproducibilidad)

for (const g of lista) {
  itemN++;
  const norma = esNorma(g.name);
  const fabricada = !norma && !esSoloDespiece(g.name);
  let desig = designacion(g.name);
  // desambiguar los dos ejes cantiléver (tensor lleva rosca M12; retorno no)
  if (/Eje cantiléver/.test(desig)) {
    desig += g.part.features.some(f => /Rosca M12/.test(f.name)) ? ' (tensor)' : ' (retorno)';
  }
  const material = norma ? norma.norma : materialDe(g.name);
  let plano = '';
  if (fabricada) {
    planoN++;
    plano = `TR-${String(planoN).padStart(2, '0')}`;
    const geom = buildPartGeometry(g.part);
    const tris = geom.attributes.position.count / 3;
    const meta = {
      designacion: desig, piezas: g.cant, proyecto: 'TRANSFERENCIA 90°',
      fuente: 'diseño paramétrico — capa user', numPlano: plano, fecha,
      nota: `Material: ${material} · tol. gral. ISO 2768-mK`,
    };
    try {
      // malla grande: la extracción de aristas no escala. Placas peine (boceto
      // dominante) → perfil analítico con perforaciones; otras mallas grandes
      // (canal, chumaceras) → envolvente; el resto → plano completo con vistas.
      let sheet = null;
      if (tris > 12000) sheet = plateSheet(g.part, meta) || simpleSheet(geom, meta);
      else sheet = buildSheet([{ geometry: geom, matrixWorld: M4 }], 'paper', meta);
      fabSheets.push(sheet);
    } catch (e) {
      console.warn(`  ! sin geometría para plano: ${desig} (${e.message})`);
      planoN--; plano = '';
    }
  }
  despiece.push({
    item: itemN, designacion: desig, cant: g.cant,
    tipo: fabricada ? 'FABRICADA' : (norma ? 'NORMALIZADA' : 'CONJUNTO'),
    material_norma: material, plano: plano || '—',
  });
}

// --- Portada + despiece (láminas A3 propias) ---------------------------------
const A3 = () => new Sheet('A3', 420, 297, 1, 1, 1);

function portada() {
  const sh = A3();
  sh.frame();
  const cx = 210;
  sh.text('PLANOS DE FABRICACIÓN', cx, 235, 9, 'C');
  sh.text('SORTER DE TRANSFERENCIA 90° — MÓDULO DE DESVIACIÓN POP-UP', cx, 222, 4.2, 'C');
  sh.line([70, 215], [350, 215], 'NORMA');
  const filas = [
    ['Ensamble', 'transfer_rodillos_90.json (formato foto3d-cad, capa user)'],
    ['Piezas totales', String(doc.parts.length)],
    ['Ítems distintos', String(despiece.length)],
    ['Planos de fabricación', String(planoN) + '  (TR-01 … TR-' + String(planoN).padStart(2, '0') + ')'],
    ['Normalizadas / conjuntos', String(despiece.filter(d => d.tipo !== 'FABRICADA').length)],
    ['Norma de láminas', 'ISO 5457 (marco) · 7200 (cajetín) · 129 (cotas) · 5456-2 (1er diedro)'],
    ['Tolerancia general', 'ISO 2768-mK salvo indicación; ajustes por asiento en cada plano'],
    ['Unidades', 'mm · proyección primer diedro'],
    ['Fecha', fecha],
  ];
  let y = 195;
  for (const [k, v] of filas) {
    sh.text(k.toUpperCase(), 70, y, 3.0, 'L');
    sh.text(v, 165, y, 3.2, 'L');
    y -= 9;
  }
  sh.text('foto3d — método algorítmico fotos→3D · diseño (capa user), no medición.',
    cx, 70, 2.6, 'C');
  sh.text('Verificar dimensiones nominales con la unidad real antes de cortar/mecanizar.',
    cx, 64, 2.6, 'C');
  return sh;
}

// Tabla de despiece paginada (una lámina A3 por bloque de filas)
function despieceSheets() {
  const sheets = [];
  const cols = [
    ['ÍTEM', 18, 'C'], ['DESIGNACIÓN', 150, 'L'], ['CANT', 16, 'C'],
    ['TIPO', 30, 'C'], ['MATERIAL / NORMA', 120, 'L'], ['PLANO', 26, 'C'],
  ];
  const x0 = 20, rowH = 7.2, headY = 250;
  const totalW = cols.reduce((a, c) => a + c[1], 0);
  const perPage = 26;
  for (let p = 0; p * perPage < despiece.length; p++) {
    const sh = A3();
    sh.frame();
    const np = Math.ceil(despiece.length / perPage);
    sh.text(`DESPIECE / LISTA DE MATERIALES  (${p + 1}/${np})`, 210, 265, 5, 'C');
    // encabezado
    let x = x0;
    const drawRow = (y, vals, h = 2.6, bold = false) => {
      let cx = x0;
      for (let i = 0; i < cols.length; i++) {
        const [, w, al] = cols[i];
        const tx = al === 'C' ? cx + w / 2 : cx + 2;
        sh.text(String(vals[i]), tx, y + 1.4, h, al === 'C' ? 'C' : 'L');
        cx += w;
      }
    };
    sh.rect(x0, headY - rowH, totalW, rowH, 'NORMA');
    drawRow(headY - rowH + 1.4, cols.map(c => c[0]), 2.4);
    let y = headY - rowH;
    for (const r of despiece.slice(p * perPage, (p + 1) * perPage)) {
      y -= rowH;
      sh.rect(x0, y, totalW, rowH, 'FINA');
      drawRow(y + 1.4, [r.item, r.designacion, r.cant, r.tipo, r.material_norma, r.plano], 2.4);
    }
    // líneas verticales de columna
    let cx = x0;
    for (const [, w] of cols) { sh.line([cx, y], [cx, headY], 'FINA'); cx += w; }
    sh.line([cx, y], [cx, headY], 'FINA');
    sheets.push(sh);
  }
  return sheets;
}

const todas = [portada(), ...despieceSheets(), ...fabSheets];
const pdf = exportSheetsPDF(todas, 'planos_fabricacion_transfer90.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));

writeFileSync(join(outDir, '_despiece.json'), JSON.stringify({
  proyecto: 'Transferencia 90° — módulo de desviación pop-up',
  archivo: 'transfer_rodillos_90.json',
  fecha,
  total_piezas: doc.parts.length,
  items_distintos: despiece.length,
  planos_fabricacion: planoN,
  despiece,
}, null, 2));

console.log(`OK: PDF de ${todas.length} páginas (portada + ${despieceSheets().length} despiece + ${planoN} planos) → ${join(outDir, pdf.name)}`);
console.log(`    ${despiece.length} ítems, ${doc.parts.length} piezas`);
