#!/usr/bin/env node
// paquete_unico.mjs — UN SOLO PDF con el paquete completo de fabricación y
// montaje del proyecto LBP530-18 (pedido de Sergio 12-08: «un PDF que incluya
// todas las páginas»). Portada + índice con marca ConveyOne, y luego, por
// equipo: plano de conjunto (con secciones), planos de fabricación, familia
// de ejes y manuales de partes. Se corre como ÚLTIMO paso de la cadena — los
// números de página del índice se calculan de los PDF reales, no se escriben.
//
// Uso:  OUTDIR=ensambles/planos_lbp530 FECHA=2026-08-12 node ensambles/paquete_unico.mjs

import { PDFDocument } from 'pdf-lib';
import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.OUTDIR || 'ensambles/planos_lbp530';
const fecha = process.env.FECHA || '—';

// ── contenido, en orden de lectura del constructor ───────────────────────────
const SECCIONES = [
  ['plano_conjunto_lbp530_5m.pdf', 'CV-LBP-5000 — plano de conjunto + SECCIONES A-A/B-B', 'LBP530-GA-01'],
  ['planos_fabricacion_lbp530_5m.pdf', 'CV-LBP-5000 — planos de fabricación por pieza (LB-nn)', 'LB-nn'],
  ['plano_conjunto_lbp530_gt08.pdf', 'CV-GT-800 — plano de conjunto + SECCIONES A-A/B-B', 'LBP530-GA-02'],
  ['planos_fabricacion_lbp530_gt08.pdf', 'CV-GT-800 — planos de fabricación por pieza (GT-nn)', 'GT-nn'],
  ['planos_ejes_lbp530.pdf', 'Familia de ejes y rodillo de retorno (tornería)', 'LBP530-EJ-01…04'],
  ['manual_partes_lbp530_5m.pdf', 'CV-LBP-5000 — manual de partes y montaje', 'boletín CV-MP-01'],
  ['manual_partes_lbp530_gt08.pdf', 'CV-GT-800 — manual de partes y montaje', 'boletín CV-MP-02'],
];

const docs = [];
for (const [file, titulo, codigo] of SECCIONES) {
  const p = join(outDir, file);
  if (!existsSync(p)) throw new Error(`falta ${p} — correr la cadena completa antes del paquete único`);
  const pdf = await PDFDocument.load(readFileSync(p));
  docs.push({ file, titulo, codigo, pdf, n: pdf.getPageCount() });
}

// ── portada + índice (2 láminas A3 apaisadas, marca ConveyOne) ───────────────
const sh = new Sheet('A3', 420, 297, 1, 1, 1);
sh.frame();
sh.text('ConveyOne', 210, 226, 13, 'C');
sh.line([130, 219], [290, 219], 'NORMA');
sh.text('PAQUETE DE FABRICACIÓN Y MONTAJE', 210, 200, 7.5, 'C');
sh.text('Proyecto LBP530-18 — 4 líneas × (CV-LBP-5000 + CV-GT-800)', 210, 188, 4.2, 'C');
sh.text('Transportadores de acumulación banda modular Movex 530 LBP / GT · 18 in · paso 15', 210, 180, 3.2, 'C');
const resumen = [
  ['Contenido', 'conjuntos con secciones · planos de fabricación por pieza · ejes y rodillo · manuales de partes'],
  ['Complementos digitales', 'DXF de corte láser 1:1 por pieza (dxf_lbp530_5m/ · dxf_lbp530_gt08/) + BOM CSV'],
  ['Numeración única', 'ÍTEM (BOM = globos) · LBD/GTD-nn corte · LB/GT-nn vistas · LBP530-EJ-nn ejes · GA-nn conjuntos'],
  ['Origen', 'modelo paramétrico gen_lbp530.mjs (capa user) — regenerado completo en UNA corrida'],
  ['Fecha de la corrida', fecha],
];
let y = 158;
for (const [k, v] of resumen) {
  sh.text(k.toUpperCase(), 60, y, 3.0, 'L');
  sh.text(v, 150, y, 3.0, 'L');
  y -= 9;
}
sh.text('Los ÍTEM de los globos del manual y del GA son los del BOM: una sola numeración en todo el proyecto.', 210, 96, 2.8, 'C');
sh.text('Toda lámina se genera del modelo 3D y se verifica visualmente antes de entregar (célula de diseño ConveyOne).', 210, 90, 2.8, 'C');

const shI = new Sheet('A3', 420, 297, 1, 1, 1);
shI.frame();
shI.text('ÍNDICE DEL PAQUETE', 210, 272, 6, 'C');
shI.text('SECCIÓN', 40, 252, 3.0, 'L');
shI.text('CÓDIGOS', 268, 252, 3.0, 'L');
shI.text('PÁGINAS', 340, 252, 3.0, 'L');
shI.line([36, 248], [384, 248], 'NORMA');
let pag = 3;   // portada=1, índice=2
let yI = 240;
for (const d of docs) {
  shI.text(d.titulo, 40, yI, 3.1, 'L');
  shI.text(d.codigo, 268, yI, 2.8, 'L');
  shI.text(`${pag} – ${pag + d.n - 1}`, 340, yI, 3.1, 'L');
  shI.line([36, yI - 3.4], [384, yI - 3.4], 'FINA');
  d.desde = pag;
  pag += d.n;
  yI -= 11;
}
shI.text(`Total: ${pag - 1} páginas · generado ${fecha}`, 40, yI - 4, 2.8, 'L');

const cover = await PDFDocument.load(exportSheetsPDF([sh, shI], 'portada.pdf').data);

// ── fusión ───────────────────────────────────────────────────────────────────
const out = await PDFDocument.create();
out.setTitle('ConveyOne — Paquete de fabricación LBP530-18');
out.setAuthor('ConveyOne SpA');
for (const src of [cover, ...docs.map(d => d.pdf)]) {
  const pages = await out.copyPages(src, src.getPageIndices());
  for (const p of pages) out.addPage(p);
}
const bytes = await out.save();
const dest = join(outDir, 'PAQUETE_FABRICACION_LBP530-18.pdf');
writeFileSync(dest, bytes);
console.log(`OK ${dest} — ${pag - 1} páginas (${docs.map(d => d.n).join('+')} + portada/índice)`);
