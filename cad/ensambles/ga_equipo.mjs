#!/usr/bin/env node
// ga_equipo.mjs — PLANO DE CONJUNTO (GA) del equipo, generado del ensamble.
//
// Tres vistas con eliminación de líneas ocultas (js/iso3d.mjs): ELEVACIÓN
// lateral, PLANTA e ISOMÉTRICA de referencia, con globos de los conjuntos
// principales (número de ÍTEM = el del BOM/manual: una sola numeración) y
// COTAS AUTO-MEDIDAS: el valor se mide de la proyección real del modelo —
// no se transcribe — así el plano no puede mentir respecto del 3D.
//
// Uso:  DOC=ensambles/lbp530_5m.json OUTDIR=ensambles/planos_lbp530 \
//         [FECHA=…] node ensambles/ga_equipo.mjs

import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { IsoScene, drawFigure } from '../js/iso3d.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const docPath = process.env.DOC;
if (!docPath) throw new Error('falta DOC=<ensamble.json>');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
const base = docPath.split('/').pop().replace(/\.json$/, '');
const outDir = process.env.OUTDIR || 'ensambles/planos_lbp530';
const fecha = process.env.FECHA || '—';
const esLBP = /5m/.test(base);
const codigo = esLBP ? 'CV-LBP-5000' : 'CV-GT-800';
const bomPath = join(outDir, `bom_${base}.json`);
const bom = existsSync(bomPath) ? JSON.parse(readFileSync(bomPath, 'utf8')) : { filas: [] };
const itemDe = (re) => bom.filas.find(f => re.test(f.item_desc))?.item ?? '';
const r0 = (v) => Math.round(v);

const escena = () => {
  const sc = new IsoScene();
  for (const p of doc.parts) {
    if (/Rodillos LBP/.test(p.name)) continue;
    sc.add(p, { simplify: /Banda/.test(p.name) ? 'band' : undefined, paint: false });
  }
  return sc;
};

const sh = new Sheet('A2', 594, 420, 1, 1, 1);
sh.text(`PLANO DE CONJUNTO — ${codigo}`, 297, 404, 6, 'C');
sh.text(doc.meta?.nombre || base, 297, 396, 3.2, 'C');

// ── PLANTA arriba, ELEVACIÓN al medio (layout de lámina descendente) ─────────
const lat = escena().project({ dir: [0, 1, -0.0001], widthMM: 470, res: 2400 });
const top = escena().project({ dir: [0, 0, -1], up: [0, 1, 0], widthMM: 470, res: 2400 });
const oxT = (594 - top.widthMM) / 2, oyT = 388 - top.heightMM - 10;
drawFigure(sh, top, oxT, oyT, {});
sh.text('PLANTA', oxT + top.widthMM / 2, oyT - 7, 3.4, 'C');

const oxL = (594 - lat.widthMM) / 2, oyL = oyT - 30 - lat.heightMM;
drawFigure(sh, lat, oxL, oyL, {});
sh.text('ELEVACIÓN', oxL + lat.widthMM / 2, oyL - 8, 3.4, 'C');

// escala real de la vista (mm de lámina por mm de modelo) para las cotas
// AUTO-MEDIDAS: se toma del propio encuadre de la proyección
const escLat = lat.widthMM / lat.spanU;

// cota de largo total (medida del bbox proyectado — extremos de nosebar)
const dim = (x1, x2, y, txt, d = 12) => {
  const yl = y - d;
  for (const x of [x1, x2]) sh.line([x, y - Math.sign(d) * 1], [x, yl - Math.sign(d) * 1.5], 'COTAS');
  sh.line([x1, yl], [x2, yl], 'COTAS');
  sh.solid([[x1, yl], [x1 + 2.4, yl + 0.45], [x1 + 2.4, yl - 0.45]], 'COTAS');
  sh.solid([[x2, yl], [x2 - 2.4, yl + 0.45], [x2 - 2.4, yl - 0.45]], 'COTAS');
  sh.text(txt, (x1 + x2) / 2, yl + 2, 3.2, 'C', 'COTAS');
};
const dimV = (x, y1, y2, txt, d = 12) => {
  const xl = x + d;
  for (const y of [y1, y2]) sh.line([x + Math.sign(d), y], [xl + Math.sign(d) * 1.5, y], 'COTAS');
  sh.line([xl, y1], [xl, y2], 'COTAS');
  sh.solid([[xl, y1], [xl + 0.45, y1 + 2.4], [xl - 0.45, y1 + 2.4]], 'COTAS');
  sh.solid([[xl, y2], [xl + 0.45, y2 - 2.4], [xl - 0.45, y2 - 2.4]], 'COTAS');
  sh.text(txt, xl + 2, (y1 + y2) / 2, 3.2, 'ML', 'COTAS');
};
dim(oxL, oxL + lat.widthMM, oyL - 2, `${r0(lat.spanU)} (extremo a extremo, nosebar incluido)`, 14);
dimV(oxL + lat.widthMM, oyL, oyL + lat.heightMM, `${r0(lat.spanV)} (alto total al piso)`, 10);
dimV(oxT + top.widthMM, oyT, oyT + top.heightMM, `${r0(top.spanV)} (ancho total con motorreductor)`, 10);

// ── ISOMÉTRICA de referencia + globos de conjuntos ──────────────────────────
const iso = escena().project({ dir: [-1, 1, -0.62], widthMM: 190, res: 1600 });
const kIso = Math.min(1, 120 / iso.heightMM);
for (const s of iso.segments) { s.a = s.a.map(v => v * kIso); s.b = s.b.map(v => v * kIso); }
for (const pm of iso.parts) { pm.anchor = pm.anchor.map(v => v * kIso); }
iso.widthMM *= kIso; iso.heightMM *= kIso;
const oxI = 30, oyI = 42;
drawFigure(sh, iso, oxI, oyI, {});
sh.text('ISOMÉTRICA (referencia)', oxI + iso.widthMM / 2, oyI - 7, 3, 'C');

// globos de conjuntos principales, con el ÍTEM del BOM
const grupos = [
  [/Placa lateral motriz/, 'bastidor'],
  [/EJE MOTRIZ/, 'accionamiento'],
  [/Banda Movex/, 'banda'],
  [/Nosebar entrada/, 'nosebar'],
  [/Soporte tipo/, 'soportes'],
  [/Guarda inferior/, 'guardas'],
  [/Motorreductor/, 'motorreductor'],
];
let gy = oyI + iso.heightMM - 4;
for (const [re] of grupos) {
  const n = itemDe(re);
  if (n === '') continue;
  const pm = iso.parts.find((q, i) => re.test(doc.parts.filter(p => !/Rodillos LBP/.test(p.name))[i]?.name || ''));
  if (!pm) continue;
  const at = [oxI + iso.widthMM + 16, gy];
  sh.line(at, [oxI + pm.anchor[0], oyI + pm.anchor[1]], 'COTAS');
  sh.circle(at, 4.4, 'VISIBLE');
  sh.text(String(n), at[0], at[1] - 1.2, 3.2, 'C');
  gy -= 13;
}

// ── tabla resumen + cajetín ──────────────────────────────────────────────────
const nF = bom.filas.filter(f => f.tipo === 'FABRICADA').length;
const nC = bom.filas.filter(f => f.tipo === 'COMPRADA').length;
const notas = [
  `Despiece completo: bom_${base}.csv (${nF} fabricadas · ${nC} compradas) — los ÍTEM de los`,
  `globos son los del BOM y el Manual de Partes (boletín CV-MP-${esLBP ? '01' : '02'}).`,
  'Cotas medidas de la proyección del modelo paramétrico — no transcritas.',
  'Altura de faja ajustable por niveladores de soporte. Terminación: PINTADO RAL 7035.',
];
notas.forEach((t, i) => sh.text(t, 320, 92 - i * 5, 2.8, 'L'));

sh.frame();
sh.titleBlock({
  designacion: `CONJUNTO GENERAL ${codigo}`,
  proyecto: 'LBP530-18 · Conveyone', fuente: 'gen_lbp530.mjs — capa user',
  verificacion: 'COTAS AUTO-MEDIDAS DEL MODELO', piezas: '1', piezasLabel: 'CONJUNTO',
  nota: `banda ${doc.meta?.banda?.slice(0, 60) ?? ''}`,
  escala: 'según vista', fecha, numPlano: esLBP ? 'LBP530-GA-01' : 'LBP530-GA-02',
});

const pdf = exportSheetsPDF([sh], `plano_conjunto_${base}.pdf`);
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK ${join(outDir, pdf.name)} — elevación ${r0(lat.spanU)}×${r0(lat.spanV)} · planta ancho ${r0(top.spanV)}`);
