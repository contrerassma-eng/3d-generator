#!/usr/bin/env node
// planos_omniwheel.mjs — PLANOS DE FABRICACIÓN + DESPIECE del módulo desviador
// Omniwheel CV-OMW HD (omni_modulo.json, ruedas de COMPRA Alibaba/Nexus).
//
// Mismo esquema que planos_fab.mjs: agrupa piezas idénticas por firma
// geométrica, dibuja lámina ISO por pieza FABRICADA (model.js + drawing2d.js)
// y arma portada + lista de materiales donde las COMPRAS llevan su fuente
// (producto Nexus/Alibaba) y las normalizadas su norma. Salida:
//   ensambles/planos_omniwheel/planos_fabricacion_omniwheel.pdf
//   ensambles/planos_omniwheel/_despiece.json
//
// Uso (desde cad/):
//   npx esbuild ensambles/planos_omniwheel.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/planos_omni.mjs
//   node /tmp/planos_omni.mjs 2026-07-20

import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import { buildSheet, Sheet, chooseSheet, scaleLabel, exportSheetsPDF } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const MARGIN = 10, MARGIN_L = 20, TITLE_H = 42, GAP = 26;

// Lámina de ENVOLVENTE (3 vistas) para mallas grandes (tapa/bandeja con cortes)
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
    designacion: meta.designacion, proyecto: meta.proyecto, fuente: meta.fuente,
    verificacion: 'ENVOLVENTE (MALLA COMPLEJA)', piezas: String(meta.piezas),
    nota: (meta.nota ? meta.nota + ' · ' : '') + 'vistas envolventes — features en el JSON',
    escala: scaleLabel(num, den), fecha: meta.fecha, numPlano: meta.numPlano,
  });
  return sh;
}

// Lámina ANALÍTICA DE EJE: vista lateral por features (cilindros escalonados
// sobre la línea de eje + bridas), con Ø y largo total — sin malla.
function ejeSheet(part, fam, meta) {
  const ax = fam === 'A' ? 1 : 0;                    // índice axial (Y en fam A)
  const cyls = [], cajas = [];
  for (const f of part.features) {
    if (f.shape === 'cylinder') cyls.push({ u0: f.at[ax], len: f.params.h, r: f.params.dia / 2, n: f.name });
    if (f.shape === 'box') cajas.push({ u0: f.at[ax] - (ax === 1 ? f.params.d : f.params.w) / 2, len: ax === 1 ? f.params.d : f.params.w, r: f.params.h / 2, n: f.name });
  }
  const u0 = Math.min(...cyls.map(c => c.u0)), u1 = Math.max(...cyls.map(c => c.u0 + c.len));
  const L = u1 - u0, rMax = Math.max(...cyls.map(c => c.r), ...cajas.map(c => c.r));
  const [name, PW, PH, num, den] = chooseSheet(L + 60, 2 * rMax + 90);
  const sh = new Sheet(name, PW, PH, num, den, 1);
  const s = num / den;
  const ox = MARGIN_L + (PW - MARGIN_L - MARGIN - L * s) / 2 - u0 * s;
  const ycl = MARGIN + TITLE_H + 45 + rMax * s;
  sh.line([ox + u0 * s - 6, ycl], [ox + u1 * s + 6, ycl], 'FINA');   // línea de eje
  const marcas = new Set([u0, u1]);
  for (const c of cyls) {
    sh.rect(ox + c.u0 * s, ycl - c.r * s, c.len * s, 2 * c.r * s, 'VISIBLE');
    marcas.add(c.u0); marcas.add(c.u0 + c.len);
    if (c.r >= 8) sh.text(`Ø${2 * c.r}`, ox + (c.u0 + c.len / 2) * s, ycl + c.r * s + 2.5, 2.6, 'C');
  }
  for (const c of cajas) sh.rect(ox + c.u0 * s, ycl - c.r * s, c.len * s, 2 * c.r * s, 'FINA');
  sh.dimH(ox + u0 * s, ox + u1 * s, ycl - rMax * s, 12, L);
  // cotas encadenadas de las fronteras (posiciones de montaje)
  const us = [...marcas].sort((a, b) => a - b);
  let prev = us[0];
  for (const u of us.slice(1)) {
    if (u - prev > 14) sh.dimH(ox + prev * s, ox + u * s, ycl + rMax * s, 8, Math.round((u - prev) * 10) / 10);
    prev = u;
  }
  sh.text('VISTA LATERAL ANALÍTICA — eje Ø15 h6 con separadores Ø22 y bridas (chaveta 5×5 en asientos de rueda/polea)', ox + (u0 + L / 2) * s, ycl - rMax * s - 18, 2.8, 'C');
  sh.frame();
  sh.titleBlock({
    designacion: meta.designacion, proyecto: meta.proyecto, fuente: meta.fuente,
    verificacion: 'ANALÍTICA (FEATURES)', piezas: String(meta.piezas),
    nota: (meta.nota ? meta.nota + ' · ' : '') + 'posiciones exactas en omni_modulo.json',
    escala: scaleLabel(num, den), fecha: meta.fecha, numPlano: meta.numPlano,
  });
  return sh;
}

// Lámina ANALÍTICA DE CORTE: cara principal por features (contorno + cortes
// rectangulares/agujeros acotados) — para láser/plegado de bandeja/tapa/placas.
function corteSheet(part, meta) {
  const base = part.features.find(f => f.op === 'union' && f.shape === 'box');
  if (!base) return null;
  const cuts = part.features.filter(f => f.op === 'cut');
  // plano de cara: bandeja/tapa → XY; placas verticales → cara mayor (X–Z o Y–Z)
  const dims = [base.params.w, base.params.d, base.params.h];
  const ejeMenor = dims.indexOf(Math.min(...dims));                 // espesor
  const [iu, iv] = [[1, 2], [0, 2], [0, 1]][ejeMenor];
  const U = (p) => p[iu], V = (p) => p[iv];
  const cu = base.at[iu], cv = ejeMenor === 2 ? base.at[iv] : base.at[iv] + dims[iv] / 2;
  const W = dims[iu], H = dims[iv];
  const [name, PW, PH, num, den] = chooseSheet(W + 60, H + 90);
  const sh = new Sheet(name, PW, PH, num, den, 1);
  const s = num / den;
  const ox = MARGIN_L + (PW - MARGIN_L - MARGIN - W * s) / 2;
  const oy = MARGIN + TITLE_H + 25 + 8;
  const T = (u, v) => [ox + (u - (cu - W / 2)) * s, oy + (v - (cv - H / 2)) * s];
  sh.rect(ox, oy, W * s, H * s, 'VISIBLE');
  for (const f of cuts) {
    if (f.shape === 'box') {
      const w = f.params.w ?? 0, d = f.params.d ?? 0, h = f.params.h ?? 0;
      const fw = [w, d, h][iu], fh = [w, d, h][iv];
      const at = [f.at[0], f.at[1], f.at[2] + (iv === 2 ? h / 2 : 0)];
      const [x, y] = T(at[iu] - fw / 2, at[iv] - fh / 2);
      sh.rect(x, y, fw * s, fh * s, 'VISIBLE');
      sh.text(`${fw}×${fh}`, x + fw * s / 2, y + fh * s / 2 - 1, 2.2, 'C');
      sh.dimH(ox, x, oy + H * s, 8 + (at[iv] % 40) / 8, Math.round((at[iu] - fw / 2 - (cu - W / 2)) * 10) / 10);
    } else if (f.shape === 'cylinder') {
      const [x, y] = T(f.at[iu], f.at[iv]);
      sh.circle([x, y], (f.params.dia / 2) * s, 'VISIBLE');
      sh.text(`Ø${f.params.dia}`, x, y + (f.params.dia / 2) * s + 2.2, 2.2, 'C');
    }
  }
  sh.dimH(ox, ox + W * s, oy, 10, W);
  sh.dimV(ox + W * s, oy, oy + H * s, 10, H);
  sh.text(`CARA DE CORTE (espesor ${dims[ejeMenor]} mm) — posiciones exactas de cortes en omni_modulo.json`, ox + W * s / 2, oy + H * s + 6, 2.8, 'C');
  sh.frame();
  sh.titleBlock({
    designacion: meta.designacion, proyecto: meta.proyecto, fuente: meta.fuente,
    verificacion: 'ANALÍTICA (FEATURES)', piezas: String(meta.piezas),
    nota: (meta.nota ? meta.nota + ' · ' : '') + 'láser + plegado; rebabar cortes',
    escala: scaleLabel(num, den), fecha: meta.fecha, numPlano: meta.numPlano,
  });
  return sh;
}

const jsonPath = process.env.DOC || 'ensambles/omni_modulo.json';
const doc = JSON.parse(readFileSync(jsonPath, 'utf8'));
const outDir = process.env.OUTDIR || 'ensambles/planos_omniwheel';
mkdirSync(outDir, { recursive: true });

// --- Clasificación ----------------------------------------------------------
// COMPRA: rueda/motor/correa/fotocélula — sin plano; el despiece lleva la fuente
const COMPRA = [
  { re: /Rueda avance Ø100/, src: 'Nexus 14182 · Ø100×66 doble PU alu · 80 kg · bore Ø15 H7 + chaveta 5×5 por OEM' },
  { re: /Rueda eyección Ø152/, src: 'Nexus NW152A · Ø152×90 industrial acero+PU · 100 kg · bore Ø15 por OEM' },
  { re: /^Motor eje A/, src: 'UniDrive 300986 (eje D Ø12) · 60 W 24 VDC — malla ZP2026' },
  { re: /^Motor eje B/, src: 'UniDrive 300986 (eje D Ø12) · 60 W 24 VDC — malla ZP2026' },
  { re: /Transmisión eje A/, src: 'Correa síncrona HTD 5M-535-15 (107T)' },
  { re: /Transmisión eje B/, src: 'Correa síncrona HTD 5M-485-15 (97T)' },
  { re: /Fotocélula/, src: 'Fotocélula difusa M18 · 24 VDC · PNP' },
];
const materialDe = (n) => {
  if (/Bandeja|Tapa|Placa lateral|Placa frontal/.test(n)) return 'Acero S275JR e=5/6 (corte láser + plegado)';
  if (/^Eje A|^Eje B/.test(n)) return 'Eje SAE 1045 Ø15 h6 + separadores Ø22 + bridas (conjunto)';
  if (/Polea/.test(n)) return 'Aluminio 6061-T6 (dentado HTD 5M)';
  if (/Bracket/.test(n)) return 'Chapa S275JR e=4 plegada';
  return 'Acero';
};

function designacion(name) {
  let s = name.replace(/\s*\([^)]*\)/g, (m) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(m.replace(/[XY]/g, '')) ? m : '');
  s = s.replace(/\s*[xy]=-?[\d.]+/g, '').replace(/\s*[+-][XY]\b/g, '')
       .replace(/ · Polea sincronica.*$/, ' · HTD 5M 28T')
       .replace(/ · Bracket motor UniDrive.*$/, ' · mordaza chapa 4');
  return s.replace(/\s+/g, ' ').trim();
}
function firma(part) {
  const fs = part.features.map(f => {
    const p = Object.entries(f.params || {}).map(([k, v]) =>
      `${k}:${typeof v === 'number' ? Math.round(v * 100) / 100 : typeof v === 'object' ? 'o' : v}`).sort().join(',');
    return `${f.shape}|${f.op}|${p}`;
  });
  return `${designacion(part.name)}||${fs.length}|${fs.join(';').length}`;
}

const grupos = new Map();
for (const part of doc.parts) {
  const key = firma(part);
  let g = grupos.get(key);
  if (!g) grupos.set(key, g = { part, cant: 0, name: part.name });
  g.cant++;
}
const esCompra = (n) => COMPRA.find(x => x.re.test(n));
const esMesh = (p) => p.features.length === 1 && p.features[0].shape === 'mesh';
const grupoOrden = (n) => {
  if (/Bandeja|Tapa|Placa/.test(n)) return 0;
  if (/^Eje|Rueda/.test(n)) return 1;
  if (/Polea|Bracket|Transmisión|Motor/.test(n)) return 2;
  return 3;
};
const lista = [...grupos.values()].sort((a, b) =>
  grupoOrden(a.name) - grupoOrden(b.name) || a.name.localeCompare(b.name));

// --- Emitir láminas + despiece ----------------------------------------------
const despiece = [];
const fabSheets = [];
let itemN = 0, planoN = 0;
const M4 = new THREE.Matrix4();
const fecha = process.argv[2] || '—';

for (const g of lista) {
  itemN++;
  const compra = esCompra(g.name);
  const fabricada = !compra && !esMesh(g.part);
  const desig = designacion(g.name);
  const material = compra ? compra.src : materialDe(g.name);
  let plano = '';
  if (fabricada) {
    planoN++;
    plano = `OW-${String(planoN).padStart(2, '0')}`;
    const meta = {
      designacion: desig, piezas: g.cant, proyecto: 'MÓDULO OMNIWHEEL CV-OMW HD',
      fuente: 'diseño paramétrico — capa user', numPlano: plano, fecha,
      nota: `Material: ${material} · tol. gral. ISO 2768-mK`,
    };
    try {
      let sheet = null;
      const mEje = g.name.match(/^Eje ([AB]) /);
      if (mEje) sheet = ejeSheet(g.part, mEje[1], meta);
      else if (/Bandeja|Tapa|Placa lateral|Placa frontal/.test(g.name)) sheet = corteSheet(g.part, meta);
      if (!sheet) {
        const geom = buildPartGeometry(g.part);
        const tris = geom.attributes.position.count / 3;
        sheet = tris > 12000
          ? simpleSheet(geom, meta)
          : buildSheet([{ geometry: geom, matrixWorld: M4 }], 'paper', meta);
      }
      fabSheets.push(sheet);
    } catch (e) {
      console.warn(`  ! sin geometría para plano: ${desig} (${e.message})`);
      planoN--; plano = '';
    }
  }
  despiece.push({
    item: itemN, designacion: desig, cant: g.cant,
    tipo: fabricada ? 'FABRICADA' : 'COMPRA',
    material_norma: material, plano: plano || '—',
  });
}
// ítems de BOM sin pieza en escena
despiece.push(
  { item: ++itemN, designacion: 'Motor UniDrive adicional (repuesto BOM CV-OMW)', cant: 1, tipo: 'COMPRA', material_norma: 'UniDrive 300986 · 60 W 24 VDC', plano: '—' },
  { item: ++itemN, designacion: 'Chaveta DIN 6885 A 5×5×20 (ruedas y poleas)', cant: 15, tipo: 'NORMALIZADA', material_norma: 'DIN 6885 A · 5×5', plano: '—' },
  { item: ++itemN, designacion: 'Rodamiento de brida Ø35 (bore Ø15) por extremo de eje', cant: 10, tipo: 'NORMALIZADA', material_norma: 'UCFL202 o brida Ø35 equivalente', plano: '—' },
  { item: ++itemN, designacion: 'Perno M6 + tuerca T (bracket a bandeja, colisas)', cant: 20, tipo: 'NORMALIZADA', material_norma: 'DIN 933 M6 8.8', plano: '—' },
);

// --- Portada + despiece -------------------------------------------------------
const A3 = () => new Sheet('A3', 420, 297, 1, 1, 1);
function portada() {
  const sh = A3();
  sh.frame();
  const cx = 210;
  sh.text('PLANOS DE FABRICACIÓN + BOM', cx, 235, 9, 'C');
  sh.text('MÓDULO DESVIADOR OMNIWHEEL CV-OMW HD — RUEDAS DE COMPRA (ALIBABA/NEXUS)', cx, 222, 4.0, 'C');
  sh.line([70, 215], [350, 215], 'NORMA');
  const filas = [
    ['Ensamble', 'omni_modulo.json (formato foto3d-cad, capa user)'],
    ['Piezas totales', String(doc.parts.length)],
    ['Ítems distintos', String(despiece.length)],
    ['Planos de fabricación', `${planoN}  (OW-01 … OW-${String(planoN).padStart(2, '0')})`],
    ['Compras / normalizadas', String(despiece.filter(d => d.tipo !== 'FABRICADA').length)],
    ['Ruedas', 'avance 9× Nexus 14182 Ø100 PU · eyección 4× NW152A Ø152 (bore Ø15+chaveta OEM)'],
    ['Norma de láminas', 'ISO 5457 (marco) · 7200 (cajetín) · 129 (cotas) · 5456-2 (1er diedro)'],
    ['Tolerancia general', 'ISO 2768-mK salvo indicación'],
    ['Unidades', 'mm · proyección primer diedro'],
    ['Fecha', fecha],
  ];
  let y = 195;
  for (const [k, v] of filas) {
    sh.text(k.toUpperCase(), 60, y, 3.0, 'L');
    sh.text(v, 150, y, 3.2, 'L');
    y -= 9;
  }
  sh.text('foto3d — método algorítmico fotos→3D · diseño (capa user), no medición.', cx, 70, 2.6, 'C');
  sh.text('Cotas oficiales de ruedas del fabricante; interiores estimados: pedir plano OEM antes de fabricar ejes.', cx, 64, 2.6, 'C');
  return sh;
}
function despieceSheets() {
  const sheets = [];
  const cols = [
    ['ÍTEM', 18, 'C'], ['DESIGNACIÓN', 132, 'L'], ['CANT', 16, 'C'],
    ['TIPO', 26, 'C'], ['FUENTE / MATERIAL / NORMA', 142, 'L'], ['PLANO', 24, 'C'],
  ];
  const x0 = 20, rowH = 7.2, headY = 250;
  const totalW = cols.reduce((a, c) => a + c[1], 0);
  const perPage = 26;
  for (let p = 0; p * perPage < despiece.length; p++) {
    const sh = A3();
    sh.frame();
    const np = Math.ceil(despiece.length / perPage);
    sh.text(`DESPIECE / LISTA DE MATERIALES  (${p + 1}/${np})`, 210, 265, 5, 'C');
    const drawRow = (y, vals) => {
      let cx = x0;
      for (let i = 0; i < cols.length; i++) {
        const [, w, al] = cols[i];
        sh.text(String(vals[i]), al === 'C' ? cx + w / 2 : cx + 2, y + 1.4, 2.4, al === 'C' ? 'C' : 'L');
        cx += w;
      }
    };
    sh.rect(x0, headY - rowH, totalW, rowH, 'NORMA');
    drawRow(headY - rowH + 1.4, cols.map(c => c[0]));
    let y = headY - rowH;
    for (const r of despiece.slice(p * perPage, (p + 1) * perPage)) {
      y -= rowH;
      sh.rect(x0, y, totalW, rowH, 'FINA');
      drawRow(y + 1.4, [r.item, r.designacion, r.cant, r.tipo, r.material_norma, r.plano]);
    }
    let cx2 = x0;
    for (const [, w] of cols) { sh.line([cx2, y], [cx2, headY], 'FINA'); cx2 += w; }
    sh.line([cx2, y], [cx2, headY], 'FINA');
    sheets.push(sh);
  }
  return sheets;
}

const todas = [portada(), ...despieceSheets(), ...fabSheets];
const pdf = exportSheetsPDF(todas, 'planos_fabricacion_omniwheel.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
writeFileSync(join(outDir, '_despiece.json'), JSON.stringify({
  proyecto: 'Módulo desviador Omniwheel CV-OMW HD (ruedas de compra)',
  archivo: 'omni_modulo.json',
  fecha,
  total_piezas: doc.parts.length,
  items_distintos: despiece.length,
  planos_fabricacion: planoN,
  despiece,
}, null, 2));
console.log(`OK: PDF de ${todas.length} páginas (portada + ${despieceSheets().length} despiece + ${planoN} planos) → ${join(outDir, pdf.name)}`);
console.log(`    ${despiece.length} ítems, ${doc.parts.length} piezas`);
