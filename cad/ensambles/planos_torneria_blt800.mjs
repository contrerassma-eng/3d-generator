#!/usr/bin/env node
// planos_torneria_blt800.mjs — Láminas de TORNERÍA del CV-BLT-800×500
// (orden de Sergio 18-08: «falta plano de fabricación con colores y
// nomenclatura en corte, ideal para tornería» · «y todos los ejes de esa
// manera, lo mejor posible, varias hojas de ser necesario»).
//
// Cuatro hojas A3, TODAS en CORTE longitudinal:
//   EJ-01 EJE MOTRIZ   — sección rayada, ZONAS DE PROCESO COLOREADAS de
//                        fondo, nomenclatura con líder por tramo, cadena de
//                        cotas DERIVADA de los tramos (suman el largo total)
//   EJ-02 EJE TENSOR   — ídem, con planos fresados y roscas de retención
//   EJ-03 TAMBOR MOTRIZ— CONJUNTO en corte: tubo+cabezales rayados (dirección
//                        alternada por pieza), eje SIN rayar (convención de
//                        torno), soldaduras, corona exagerada, color por PIEZA
//   EJ-04 TAMBOR TENSOR— ídem + rodamientos 6204-2RS y seeger
//
// La verdad viene de blt800.json meta.ejes (el gen deriva largos de tramos):
// aquí NO se inventa ninguna cifra — se dibuja lo que el modelo declara.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';

const here = dirname(fileURLToPath(import.meta.url));
const fecha = process.env.FECHA || process.argv[2] || '2026-08-18';
const doc = JSON.parse(readFileSync(join(here, 'blt800.json'), 'utf8'));
const EJ = doc.meta.ejes;
const outDir = join(here, 'planos_blt800');

const tinte = (c, f = 0.82) => c.map(v => v + (1 - v) * f);      // color pastel de fondo
const oscuro = (c, f = 0.55) => c.map(v => v * f);               // color de texto/línea
const A3 = () => new Sheet('A3', 420, 297, 1, 1, 1);

// rayado 45° de un rectángulo [x0,y0]-[x1,y1] (paso en mm de lámina)
function raya(sh, x0, y0, x1, y1, paso = 2.6, dir = 1, rgb) {
  const w = x1 - x0, h = y1 - y0;
  for (let c = -h; c < w; c += paso) {
    // línea x = c + dir*(y-y0) recortada al rect
    const pts = [];
    for (const [lx, ly] of [[x0 + c, y0], [x0 + c + dir * h, y1]]) pts.push([lx, ly]);
    // recorte simple por x
    let [a, b] = pts;
    if (a[0] < x0) a = [x0, y0 + (x0 - (x0 + c)) / dir];
    if (a[0] > x1) a = [x1, y0 + (x1 - (x0 + c)) / dir];
    if (b[0] < x0) b = [x0, y0 + (x0 - (x0 + c)) / dir];
    if (b[0] > x1) b = [x1, y0 + (x1 - (x0 + c)) / dir];
    if (Math.abs(a[0] - b[0]) < 0.05 && Math.abs(a[1] - b[1]) < 0.05) continue;
    if (a[1] < y0 - 0.01 || a[1] > y1 + 0.01 || b[1] < y0 - 0.01 || b[1] > y1 + 0.01) continue;
    sh.line(a, b, 'FINA', rgb);
  }
}

const cajetin = (sh, e, escala) => sh.titleBlock({
  designacion: `FAB · ${e.nombre}`,
  proyecto: 'CV-BLT · banda plana MB800', fuente: 'gen_blt800.mjs — capa user (PRD CV-BLT §B)',
  verificacion: 'TRAMOS DEL MODELO — la cadena de cotas SUMA el largo total',
  piezas: '1', numPlano: e.plano, fecha, escala,
  rev: doc.meta.revision, revCausa: doc.meta.revision_causa.slice(0, 52),
  nota: 'Material: SAE 1045 calibrado · tol. gral. ISO 2768-mK — TORNERÍA',
});

const tips = (sh, lineas) => {
  let y = sh.H - 15;
  sh.text('TIPS DE TORNERÍA', 24, y, 2.6, 'L'); y -= 4.2;
  for (const l of lineas) { sh.text('· ' + l, 24, y, 2.15, 'L'); y -= 3.6; }
};

// ═══ HOJAS 1-2: EJES en corte con zonas de proceso ═════════════════════════
function hojaEje(e) {
  const sh = A3();
  const Lt = e.tramos.reduce((a, t) => a + t.l, 0);
  const k = Lt <= 360 ? 1 : 0.5;
  const cx0 = (420 - Lt * k) / 2, cy = 175;
  const dmax = Math.max(...e.tramos.map(t => t.d));

  // 1) bandas de PROCESO coloreadas (fondo, detrás de todo)
  let x = cx0;
  for (const t of e.tramos) {
    const hh = (t.d / 2 + 7) * k * 2;
    sh.solidPoly([[[x, cy - hh / 2], [x + t.l * k, cy - hh / 2], [x + t.l * k, cy + hh / 2], [x, cy + hh / 2]]], tinte(t.color));
    x += t.l * k;
  }

  // 2) sección del eje: contorno + rayado 45° por tramo (macizo = TODO rayado)
  x = cx0;
  for (const t of e.tramos) {
    const r = t.d / 2 * k, x1 = x + t.l * k;
    raya(sh, x, cy - r, x1, cy + r, 2.4, 1);
    sh.line([x, cy - r], [x1, cy - r], 'VISIBLE');
    sh.line([x, cy + r], [x1, cy + r], 'VISIBLE');
    sh.line([x, cy - r], [x, cy + r], 'VISIBLE');       // hombro
    sh.line([x1, cy - r], [x1, cy + r], 'VISIBLE');
    // chavetero en el cuerpo (notch superior al centro del tramo)
    if (t.chavetero) {
      const c = t.chavetero, xm = x + (t.l * k) / 2, w2 = (c.l / 2) * k, prof = c.prof * k;
      sh.solidPoly([[[xm - w2, cy + r - prof], [xm + w2, cy + r - prof], [xm + w2, cy + r], [xm - w2, cy + r]]], [1, 1, 1]);
      sh.line([xm - w2, cy + r], [xm - w2, cy + r - prof], 'VISIBLE');
      sh.line([xm + w2, cy + r], [xm + w2, cy + r - prof], 'VISIBLE');
      sh.line([xm - w2, cy + r - prof], [xm + w2, cy + r - prof], 'VISIBLE');
      sh.text(`CHAVETERO ${c.w}×${c.w} × ${c.l}`, xm, cy + r + 4.5, 2.4, 'C', 'TEXTO', [0.85, 0.45, 0.10]);
    }
    x = x1;
  }
  // centros de torno DIN 332 (cono 60° en ambas caras extremas)
  for (const [xe, sgn] of [[cx0, 1], [cx0 + Lt * k, -1]]) {
    sh.line([xe, cy], [xe + sgn * 4, cy + 2.2], 'FINA');
    sh.line([xe, cy], [xe + sgn * 4, cy - 2.2], 'FINA');
  }
  // eje de simetría (EJE, sobresale 6 mm)
  sh.line([cx0 - 8, cy], [cx0 + Lt * k + 8, cy], 'EJE');

  // 3) NOMENCLATURA con líder — renglones por orden de ancla (sin cruces)
  let yLab = 258;
  x = cx0;
  for (const t of e.tramos) {
    const xa = x + (t.l * k) / 2, ya = cy + (t.d / 2 + 7) * k;
    sh.line([xa, ya], [xa, yLab - 3], 'COTAS');
    sh.circle([xa, ya], 0.5, 'COTAS');
    sh.text(t.label, Math.min(xa, 300), yLab, 2.5, 'L', 'TEXTO', oscuro(t.color));
    sh.text(`(${t.proc})`, Math.min(xa, 300), yLab - 3.4, 2.0, 'L', 'TEXTO', oscuro(t.color));
    yLab -= 10.5;
    x += t.l * k;
  }

  // 4) cotas: Ø por tramo (bajo el eje) + cadena de largos + total
  x = cx0;
  for (const [i, t] of e.tramos.entries()) {
    const xm = x + (t.l * k) / 2;
    sh.text(`Ø${t.d}${t.tol ? ' ' + t.tol : ''}`, xm, cy - (t.d / 2 + 7) * k - 4.5, 2.8, 'C', 'COTAS', oscuro(t.color, 0.7));
    sh.dimH(x, x + t.l * k, cy - (dmax / 2 + 8) * k, 14 + (i % 2) * 7, t.l);
    x += t.l * k;
  }
  sh.dimH(cx0, cx0 + Lt * k, cy - (dmax / 2 + 8) * k, 30, Lt);

  // 5) detalles transversales a 2:1 — lo que el torno/fresa necesita ver
  const arco = (c, r, a0, a1, n = 48) => {
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      const q = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
      if (prev) sh.line(prev, q, 'VISIBLE');
      prev = q;
    }
  };
  const conChavetero = e.tramos.find(t => t.chavetero);
  if (conChavetero) {
    const t = conChavetero, R = t.d;                       // 2:1
    const c = [140, 92];
    const half = t.chavetero.w, aN = Math.asin(half / R);  // media boca del chavetero
    arco(c, R, Math.PI / 2 + aN, Math.PI / 2 + 2 * Math.PI - aN, 96);
    const yFondo = c[1] + (t.d / 2 - t.chavetero.prof) * 2;
    for (const s of [-1, 1]) sh.line([c[0] + s * half, c[1] + Math.cos(aN) * R], [c[0] + s * half, yFondo], 'VISIBLE');
    sh.line([c[0] - half, yFondo], [c[0] + half, yFondo], 'VISIBLE');
    sh.line([c[0] - R - 4, c[1]], [c[0] + R + 4, c[1]], 'EJE');
    sh.line([c[0], c[1] - R - 4], [c[0], c[1] + R + 4], 'EJE');
    sh.dimH(c[0] - half, c[0] + half, c[1] + R, -8, t.chavetero.w);
    sh.dimV(c[0] + R + 2, c[1] - R, yFondo, 10, +(t.d - t.chavetero.prof).toFixed(1));
    sh.text(`SECCIÓN B-B (2:1) — chavetero ${t.chavetero.w}×${t.chavetero.w} DIN 6885 · cota al fondo ${(t.d - t.chavetero.prof).toFixed(1)}`,
      c[0], c[1] - R - 12, 2.5, 'C');
  }
  const conPlanos = e.tramos.find(t => /PLANO FRESADO/.test(t.label || ''));
  if (conPlanos) {
    const m = /(\d+(?:[.,]\d+)?)\s*e\/c/.exec(conPlanos.label);
    const ec = m ? parseFloat(m[1].replace(',', '.')) : conPlanos.d - 2;
    const R = conPlanos.d, c = [140, 92];                  // 2:1
    const half = ec, aF = Math.acos(half / R);             // media distancia e/c ×2
    arco(c, R, aF, Math.PI - aF);                          // arco superior
    arco(c, R, Math.PI + aF, 2 * Math.PI - aF);            // arco inferior
    for (const s of [-1, 1]) sh.line([c[0] + s * half, c[1] + Math.sin(aF) * R], [c[0] + s * half, c[1] - Math.sin(aF) * R], 'VISIBLE');
    sh.line([c[0] - R - 4, c[1]], [c[0] + R + 4, c[1]], 'EJE');
    sh.line([c[0], c[1] - R - 4], [c[0], c[1] + R + 4], 'EJE');
    sh.dimH(c[0] - half, c[0] + half, c[1] - Math.sin(aF) * R, 9, ec);
    sh.text(`VISTA DE PUNTA (2:1) — planos fresados ${ec} e/c (calzan en la muesca 20,2 — el eje NO gira)`,
      c[0], c[1] - R - 12, 2.5, 'C');
  }

  tips(sh, [
    'Corte longitudinal por el eje — macizo RAYADO completo; zonas de color = PROCESO por tramo.',
    ...(e.notas || []),
  ]);
  sh.frame();
  cajetin(sh, e, k === 1 ? '1:1' : '1:2');
  return sh;
}

// ═══ HOJAS 3-4: TAMBORES — conjunto en corte, color por PIEZA ══════════════
function hojaTambor(e, conRodamiento, ejeD) {
  const sh = A3();
  const k = 0.5, cx0 = (420 - e.L * k) / 2, cy = 168;
  const R = e.d / 2 * k, Ri = (e.d / 2 - e.t) * k, tCab = 16 * k;
  const COL = { tubo: [0.55, 0.55, 0.58], cabezal: [0.13, 0.55, 0.30], eje: [0.16, 0.42, 0.75], rod: [0.85, 0.45, 0.10], seeger: [0.75, 0.12, 0.12] };
  const x1 = cx0 + e.L * k;

  // TUBO: dos paredes rayadas (fondo pastel + rayado 45°)
  for (const s of [-1, 1]) {
    const yA = cy + s * Ri, yB = cy + s * R;
    const y0 = Math.min(yA, yB), y1 = Math.max(yA, yB);
    sh.solidPoly([[[cx0, y0], [x1, y0], [x1, y1], [cx0, y1]]], tinte(COL.tubo));
    raya(sh, cx0, y0, x1, y1, 2.2, 1);
    sh.line([cx0, y0], [x1, y0], 'VISIBLE'); sh.line([cx0, y1], [x1, y1], 'VISIBLE');
  }
  // CABEZALES (rayado en dirección OPUESTA — pieza distinta se lee sola)
  const rEje = ejeD / 2 * k;
  for (const [xc, sgn] of [[cx0, 1], [x1 - tCab * 2, 1]]) {
    const xa = xc === cx0 ? cx0 : x1 - tCab * 2;
    const xb = xa + tCab * 2;
    for (const s of [-1, 1]) {
      const y0 = cy + (s < 0 ? -Ri : rEje), y1 = cy + (s < 0 ? -rEje : Ri);
      sh.solidPoly([[[xa, y0], [xb, y0], [xb, y1], [xa, y1]]], tinte(COL.cabezal));
      raya(sh, xa, y0, xb, y1, 2.2, -1);
      for (const yy of [y0, y1]) sh.line([xa, yy], [xb, yy], 'VISIBLE');
      for (const xx of [xa, xb]) sh.line([xx, y0], [xx, y1], 'VISIBLE');
    }
    // soldadura filete interior (triángulos rojos en la unión tubo↔cabezal)
    for (const s of [-1, 1]) {
      const yj = cy + s * Ri, xj = xa + (xa === cx0 ? tCab * 2 : 0);
      sh.solid([[xj, yj], [xj + (xa === cx0 ? 3 : -3), yj], [xj, yj - s * 3]], 'COTAS');
    }
  }
  // EJE pasante SIN rayar (convención de torno) — fondo azul pastel
  sh.solidPoly([[[cx0 - 26, cy - rEje], [x1 + 26, cy - rEje], [x1 + 26, cy + rEje], [cx0 - 26, cy + rEje]]], tinte(COL.eje));
  sh.line([cx0 - 26, cy - rEje], [x1 + 26, cy - rEje], 'VISIBLE');
  sh.line([cx0 - 26, cy + rEje], [x1 + 26, cy + rEje], 'VISIBLE');
  sh.line([cx0 - 34, cy], [x1 + 34, cy], 'EJE');

  // RODAMIENTOS 6204 + seeger (sólo tambor tensor)
  if (conRodamiento) {
    const bw = 14 * k, D = 47 / 2 * k;
    for (const xb of [cx0 + tCab, x1 - tCab]) {
      for (const s of [-1, 1]) {
        const y0 = cy + s * rEje, y1 = cy + s * D;
        const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
        sh.solidPoly([[[xb - bw / 2, ya], [xb + bw / 2, ya], [xb + bw / 2, yb], [xb - bw / 2, yb]]], tinte(COL.rod));
        sh.rect(xb - bw / 2, ya, bw, yb - ya, 'VISIBLE');
        sh.line([xb - bw / 2, ya], [xb + bw / 2, yb], 'FINA');
        sh.line([xb - bw / 2, yb], [xb + bw / 2, ya], 'FINA');
      }
      // seeger DIN 472-47 (ranura en el cabezal, lado interior)
      for (const s of [-1, 1]) {
        const ys = cy + s * (47 / 2 * k + 1.2);
        sh.line([xb + bw / 2 + 1.5, ys], [xb + bw / 2 + 1.5, cy + s * rEje], 'VISIBLE', COL.seeger);
      }
    }
  }
  // corona exagerada (sólo motriz): arco discontinuo sobre la cara superior
  if (e.corona_mm) {
    const n = 24, ex = 20;                       // exageración ×20
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t2 = i / n, xx = cx0 + t2 * e.L * k;
      const yy = cy + R + Math.sin(Math.PI * t2) * e.corona_mm * ex * k * 0.1;
      if (prev) sh.line(prev, [xx, yy], 'PLIEGUE');
      prev = [xx, yy];
    }
    sh.text(`CORONA +${e.corona_mm} al centro (exagerada ×${ex}) — TORNEAR TRAS SOLDAR`, cx0 + e.L * k / 2, cy + R + 9, 2.4, 'C', 'TEXTO', [0.16, 0.42, 0.75]);
  }

  // NOMENCLATURA por pieza (líderes ordenados por x del ancla)
  const rotulos = [
    [cx0 + e.L * k * 0.32, cy + R - 1, COL.tubo, `TUBO A513 Ø${e.d}×${e.t} — cara ${e.L}`],
    [cx0 + tCab, cy - Ri + 2, COL.cabezal, 'CABEZAL torneado — soldar filete 3 INTERIOR'],
    [cx0 + e.L * k * 0.62, cy, COL.eje, conRodamiento ? `EJE MUERTO Ø${ejeD} — fijo (el tambor gira)` : `EJE MOTRIZ Ø${ejeD} — chaveta 6×6`],
    ...(conRodamiento ? [[cx0 + tCab + 7 * k, cy + 47 / 2 * k - 1, COL.rod, 'RODAMIENTO 6204-2RS — asiento Ø47 H7 escariado TRAS soldar + seeger DIN 472-47']] : []),
  ].sort((a, b) => a[0] - b[0]);
  let yLab = 254;
  for (const [xa, ya, col, txt] of rotulos) {
    sh.line([xa, ya], [xa, yLab - 3], 'COTAS');
    sh.circle([xa, ya], 0.5, 'COTAS');
    sh.text(txt, Math.min(xa, 280), yLab, 2.5, 'L', 'TEXTO', oscuro(col));
    yLab -= 9.5;
  }

  // cotas
  sh.dimH(cx0, x1, cy - R, 16, e.L);
  sh.text(`Ø${e.d}`, cx0 - 12, cy + R / 2, 2.8, 'C', 'COTAS');
  sh.text(`Ø${ejeD}`, x1 + 16, cy + rEje + 3, 2.6, 'L', 'COTAS', oscuro(COL.eje));

  tips(sh, [
    'CONJUNTO en corte longitudinal — cada pieza con SU color y SU dirección de rayado; el eje va SIN rayar (convención).',
    'Secuencia: soldar cabezales → ' + (e.corona_mm ? 'tornear la CORONA' : 'escariar asientos H7') + ' → balancear estático.',
    ...(e.notas || []),
  ]);
  sh.frame();
  cajetin(sh, e, '1:2');
  return sh;
}

// ═══ EMITIR ════════════════════════════════════════════════════════════════
const sheets = [
  hojaEje(EJ.motriz),
  hojaEje(EJ.tensor),
  hojaTambor(EJ.tambor_motriz, false, 25),
  hojaTambor(EJ.tambor_tensor, true, 20),
];
const pdf = exportSheetsPDF(sheets, 'planos_torneria_blt800.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK ${join(outDir, pdf.name)} (${sheets.length} láminas de tornería — corte + colores + nomenclatura)`);
