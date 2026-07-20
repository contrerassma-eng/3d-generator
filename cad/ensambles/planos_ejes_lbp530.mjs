#!/usr/bin/env node
// planos_ejes_lbp530.mjs — PLANOS DE FABRICACIÓN DE LOS EJES del proyecto
// LBP530-18 (transportadores Movex 530 LBP 5.0 m y 530 GT 0.8 m, 18 in):
//
//   LBP530-EJ-01  EJE MOTRIZ  — barra cuadrada 1.5 in SAE 1045, muñones Ø30
//                 torneados: libre 50, motriz 165 (rodamiento + cubo del
//                 motorreductor de eje hueco Ø30), chavetero DIN 6885 A
//                 8×7×90, rosca M10. Acotado COMPLETO para el tornero.
//   LBP530-EJ-02  EJE TENSOR  — cuadrado + 2 muñones Ø30×50.
//   LBP530-EJ-03  CORTE DE BARRAS + LISTA DE COMPRA (4 líneas = 8 equipos).
//
// Lee cad/ensambles/lbp530_dims.json (emitido por gen_lbp530.mjs — única
// fuente de dimensiones) y emite un único PDF con las 3 láminas.
//
// Uso (desde cad/):
//   npx esbuild ensambles/planos_ejes_lbp530.mjs --bundle --format=esm \
//     --platform=node --alias:three=./vendor/three.module.min.js \
//     --outfile=/tmp/planos_ejes.js
//   OUT=<dir> FECHA=2026-07-19 node /tmp/planos_ejes.js

import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dims = JSON.parse(readFileSync(process.env.DIMS || 'ensambles/lbp530_dims.json', 'utf8'));
const outDir = process.env.OUT || 'ensambles/planos_lbp530';
const fecha = process.env.FECHA || '2026-07-19';
mkdirSync(outDir, { recursive: true });

const { D, belt } = { D: dims.D, belt: dims.belt };
const sheets = [];

// --- ayudantes de acotado (texto libre: Ø, tolerancias) ---------------------
function dimHt(sh, x1, x2, y, d, label) {
  const yl = y - d;
  for (const x of [x1, x2]) sh.line([x, y - Math.sign(d)], [x, yl - Math.sign(d) * 1.5], 'COTAS');
  sh.line([x1, yl], [x2, yl], 'COTAS');
  sh.solid([[x1, yl], [x1 + 2.2, yl + 0.4], [x1 + 2.2, yl - 0.4]], 'COTAS');
  sh.solid([[x2, yl], [x2 - 2.2, yl + 0.4], [x2 - 2.2, yl - 0.4]], 'COTAS');
  sh.text(label, (x1 + x2) / 2, yl + 1.6, 3.0, 'C', 'COTAS');
}
function dimVt(sh, x, y1, y2, d, label) {
  const xl = x + d;
  for (const y of [y1, y2]) sh.line([x + Math.sign(d), y], [xl + Math.sign(d) * 1.5, y], 'COTAS');
  sh.line([xl, y1], [xl, y2], 'COTAS');
  sh.solid([[xl, y1], [xl + 0.4, y1 + 2.2], [xl - 0.4, y1 + 2.2]], 'COTAS');
  sh.solid([[xl, y2], [xl + 0.4, y2 - 2.2], [xl - 0.4, y2 - 2.2]], 'COTAS');
  sh.text(label, xl + 1.8, (y1 + y2) / 2, 3.0, 'ML', 'COTAS');
}
function leader(sh, from, to, label, al = 'L') {
  sh.line(from, to, 'COTAS');
  sh.solid([[from[0], from[1]], [from[0] + 1.8, from[1] + 0.8], [from[0] + 1.2, from[1] - 1.2]], 'COTAS');
  sh.text(label, to[0] + (al === 'L' ? 1.2 : -1.2), to[1], 2.8, al, 'COTAS');
}

// --- lámina de eje ----------------------------------------------------------
// tramos = [{dia|lado, largo}...] de −Y a +Y; se dibuja horizontal.
function shaftSheet(eje, opts) {
  const sh = new Sheet('A3', 420, 297, 1, 2, 1);   // escala 1:2
  const s = 0.5;
  const L = eje.largoTotal;
  const ox = (420 - 20 - 10 - L * s) / 2 + 20, oy = 195;
  let x = ox;
  const stepX = [];   // fronteras entre tramos (coordenada de lámina)
  // contorno
  for (const t of eje.tramos) {
    const h = (t.dia ?? t.lado) / 2 * s;
    const x2 = x + t.largo * s;
    sh.poly([[x, oy - h], [x2, oy - h], [x2, oy + h], [x, oy + h]], 'VISIBLE');
    stepX.push([x, x2, h, t]);
    x = x2;
  }
  // eje de simetría
  sh.line([ox - 8, oy], [x + 8, oy], 'PLIEGUE');
  // chaflanes 2×45° en las puntas (líneas)
  for (const [xc, dir] of [[ox, 1], [x, -1]]) {
    sh.line([xc, oy - 15 * s], [xc + dir * 2 * s, oy - 13 * s], 'FINA');
    sh.line([xc, oy + 15 * s], [xc + dir * 2 * s, oy + 13 * s], 'FINA');
  }

  // cotas de largos (cadena bajo el eje) + total
  let cx = ox;
  for (const t of eje.tramos) {
    dimHt(sh, cx, cx + t.largo * s, oy - 22, 12, String(t.largo));
    cx += t.largo * s;
  }
  dimHt(sh, ox, x, oy - 22, 26, `${L} TOTAL`);

  // cotas de diámetros / lado
  const [j1, sq, j2] = stepX;
  dimVt(sh, j1[0] + 6, oy - j1[2], oy + j1[2], -(j1[0] - ox + 14), `Ø${j1[3].dia} ${j1[3].tol}`);
  dimVt(sh, (sq[0] + sq[1]) / 2 + 30, oy - sq[2], oy + sq[2], 14, `${sq[3].lado} x ${sq[3].lado}`);
  if (j2[3].dia) dimVt(sh, j2[1] - 10, oy - j2[2], oy + j2[2], 20, `Ø${j2[3].dia} ${j2[3].tol}`);

  if (eje.chaveta) {
    // chavetero DIN 6885 A sobre el muñón motriz (tramo 3): ranura vista de lado
    const ch = eje.chaveta;
    const zTop = oy + 15 * s;                       // borde superior Ø30
    const xkEnd = x - 10 * s;                       // termina a 10 del extremo
    const xk0 = xkEnd - ch.l * s;
    sh.line([xk0, zTop - 4 * s], [xkEnd, zTop - 4 * s], 'VISIBLE');   // fondo (t1=4)
    sh.line([xk0, zTop], [xk0, zTop - 4 * s], 'VISIBLE');
    sh.line([xkEnd, zTop], [xkEnd, zTop - 4 * s], 'VISIBLE');
    dimHt(sh, xk0, xkEnd, oy + 22, -12, `chavetero ${ch.w}×${ch.h}×${ch.l} DIN 6885 A`);
    dimHt(sh, xkEnd, x, oy + 22, -24, '10');
    // rosca de retención en la punta motriz
    leader(sh, [x, oy], [x - 30, oy + 40], `${eje.roscaPunta} (retención motorreductor)`, 'R');
    // gargantas de salida de torneado
    leader(sh, [sq[1], oy - 16 * s], [sq[1] + 14, oy - 40], `garganta ${eje.garganta ?? 2.5}×0.5 (2×)`, 'L');
    // zona del cubo del motorreductor
    dimHt(sh, x - D.cuboMotor * s, x, oy + 22, -38, `zona cubo motorreductor eje hueco Ø30 H7 — ${D.cuboMotor}`);
  }

  // sección del cuadrado (B-B) y vista del extremo motriz
  const sx = 70, sy = 78, r = 19.05 * 0.9;
  sh.poly([[sx - r, sy - r], [sx + r, sy - r], [sx + r, sy + r], [sx - r, sy + r]], 'VISIBLE');
  sh.circle([sx, sy], 15 * 0.9, 'OCULTA');
  sh.text('SECCIÓN B-B (1:1.1)', sx, sy - r - 6, 2.8, 'C');
  sh.text('CUADRADO 38.1 (barra calibrada)', sx, sy + r + 3, 2.6, 'C');
  const ex = 150, ey = 78, re = 15 * 1.6;
  sh.circle([ex, ey], re, 'VISIBLE');
  if (eje.chaveta) {
    sh.poly([[ex - 4 * 1.6, ey + re - 4 * 1.6 - 6.4], [ex + 4 * 1.6, ey + re - 4 * 1.6 - 6.4], [ex + 4 * 1.6, ey + re + 1], [ex - 4 * 1.6, ey + re + 1]], 'VISIBLE');
    sh.text('EXTREMO MOTRIZ (1:0.6)', ex, ey - re - 6, 2.8, 'C');
    sh.text('Ø30 j6 · chavetero 8 JS9', ex, ey + re + 4, 2.6, 'C');
  } else {
    sh.text('EXTREMO (1:0.6)', ex, ey - re - 6, 2.8, 'C');
    sh.text('Ø30 j6 (liso, sin chavetero)', ex, ey + re + 4, 2.6, 'C');
  }

  // notas
  const nx = 216, ny0 = 142;
  const notas = [
    'NOTAS:',
    `1. Material: ${eje.material}.`,
    '2. Tornear entre centros DIN 332-A2.5 en ambas caras.',
    '3. Muñones Ø30 j6: rugosidad Ra 1.6; concentricidad entre muñones',
    '   y respecto del cuadrado <= 0.05 TIR.',
    '4. Chaflanes 2×45° en ambos extremos; aristas del cuadrado matadas 0.5.',
    ...(eje.chaveta ? [
      '5. Chavetero DIN 6885 A 8×7×90, ancho 8 JS9, profundidad t1 = 4.0.',
      '6. Rosca de punta M10×22 con chaflán de entrada; sirve de retención',
      '   axial del motorreductor (arandela Ø40×6 + tornillo 8.8 + Loctite 243).',
      '7. El muñón motriz recibe: chumacera UCF206 (50) y cubo del',
      '   motorreductor de eje hueco Ø30 H7 (110). Ajuste j6/H7.',
      '8. Tolerancia general ISO 2768-mK.',
    ] : [
      '5. Ambos muñones reciben chumacera UCF206 (bore Ø30, prisioneros).',
      '6. Tolerancia general ISO 2768-mK.',
    ]),
  ];
  notas.forEach((t, i) => sh.text(t, nx, ny0 - i * 4.6, 2.6, 'L'));

  sh.frame();
  sh.titleBlock({
    designacion: opts.designacion, proyecto: 'LBP530-18 · Conveyone',
    fuente: 'gen_lbp530.mjs — capa user', verificacion: 'DISEÑO CAD (CAPA USER)',
    piezas: `${eje.cantidad} (4 líneas)`, piezasLabel: 'CANTIDAD',
    nota: `corte en sierra: ${eje.corte} mm/u · banda ${belt.serie} 18in paso 15`,
    escala: '1:2', fecha, numPlano: eje.plano,
  });
  return sh;
}

sheets.push(shaftSheet(dims.ejes.motriz, {
  designacion: 'EJE MOTRIZ — cuadrado 1.5 in, muñones Ø30 torneados',
}));
sheets.push(shaftSheet(dims.ejes.tensor, {
  designacion: 'EJE TENSOR — cuadrado 1.5 in, muñones Ø30 torneados',
}));

// --- lámina 3: corte de barras + lista de compra ----------------------------
{
  const sh = new Sheet('A3', 420, 297, 1, 1, 1);
  sh.text('CORTE DE BARRAS Y LISTA DE COMPRA — EJES PARA 4 LÍNEAS (8 transportadores)', 210, 280, 4.5, 'C');

  // diagrama de corte de las 2 barras de 6 m (escala 1:20)
  const bs = 1 / 20 * 1000;  // mm de lámina por m de barra
  const drawBar = (y, titulo, nPz, corte) => {
    sh.text(titulo, 24, y + 8, 3.0, 'L');
    sh.rect(24, y, 6 * bs, 6, 'VISIBLE');
    let x = 24;
    for (let i = 0; i < nPz; i++) {
      x += corte / 1000 * bs;
      sh.line([x, y], [x, y + 6], 'COTAS');
      sh.text(String(i + 1), x - corte / 2000 * bs, y + 2, 2.2, 'C');
    }
    const sobra = 6000 - nPz * corte;
    sh.text(`retazo ${sobra} mm`, 24 + 6 * bs - 2, y + 2, 2.2, 'ML');
  };
  drawBar(252, `BARRA 1 — ${dims.ejes.barras.espec}: 8 × EJE MOTRIZ (corte ${dims.ejes.motriz.corte})`, 8, dims.ejes.motriz.corte);
  drawBar(232, `BARRA 2 — ídem: 8 × EJE TENSOR (corte ${dims.ejes.tensor.corte})`, 8, dims.ejes.tensor.corte);
  sh.text('Kerf de sierra considerado: 9 mm por corte (incluido en el largo de corte). Refrentar a largo final en torno.', 24, 224, 2.6, 'L');

  // tabla: acero + normalizados
  const rows1 = [
    ['POS', 'DESCRIPCIÓN', 'CANT', 'OBSERVACIÓN'],
    ['A1', 'Barra CUADRADA 1.5 in (38.1) SAE 1045 calibrada × 6 m', '2 (+1 resp.)', 'ejes motriz y tensor — ver diagrama'],
    ['A2', 'Chumacera de brida UCF206 (bore Ø30, 4 pernos)', '32', '4 por transportador (2 ejes × 2)'],
    ['A3', 'Chaveta DIN 6885 A 8×7×90, acero C45', '8 (+4 resp.)', '1 por eje motriz'],
    ['A4', 'Arandela retención Ø40×6 + tornillo M10×25 8.8', '8', 'retención axial del motorreductor'],
    ['A5', 'Motorreductor eje hueco Ø30 H7, 0.37 kW, n2 ~ 55 rpm, par >= 64 Nm', '8', 'montaje directo + brazo de torque'],
    ['A6', 'Collarín/retén para sprocket central en eje cuadrado 1.5 in', '16 pares', 'solo el sprocket central se fija'],
    ['A7', 'Perno M12×40 8.8 + tuerca (chumaceras a mecha PL8)', '128', '4 por chumacera'],
  ];
  const rows2 = [
    ['POS', 'MOVEX (movexii.com) — capa web: input/web_facts.json', 'CANT', 'OBSERVACIÓN'],
    ['M1', `Banda 530 LBP 18 in LFA — art. 5324010018A`, `${dims.compraMovex.banda_530LBP_18in.metros} m (${dims.compraMovex.banda_530LBP_18in.rollos15}+1 rollos 1.5 m)`, `lazo ${dims.lazos_m.LBP_5000} m × 4 equipos`],
    ['M2', `Banda 530 GT (friction top) 18 in LFA — art. 5323*0018A`, `${dims.compraMovex.banda_530GT_18in.metros} m (${dims.compraMovex.banda_530GT_18in.rollos15}+1 rollos 1.5 m)`, `lazo ${dims.lazos_m.GT_800} m × 4 equipos`],
    ['M3', 'Sprocket Z24 partido, PD 114.9, BORE CUADRADO 1.5 in — art. 158308YF', `${dims.compraMovex.sprockets_Z24_cuadrado15.cantidad}`, 'LBP 5+2 · GT 6+2 por equipo; sólo 1 fijo/eje'],
    ['M4', 'Nosebar especial 530 LBP (doble cara) — art. 22868 (K=6 in)', `${dims.compraMovex.nosebar_LBP.cantidad}`, '3×K6 = 18 in por punta × 2 puntas × 4 LBP'],
    ['M5', 'Nosebar 530 BluLub — art. 22809 (K=6 in)', `${dims.compraMovex.nosebar_GT.cantidad}`, 'ídem para los 4 GT'],
    ['M6', 'Perfil wearstrip UHMW y zapata de retorno LBP (tipo R230)', 'según obra', 'LBP: strips entre rodillos, gap <=50'],
  ];
  const table = (rows, y0) => {
    const cx = [24, 40, 250, 306];
    rows.forEach((r, i) => {
      const y = y0 - i * 7.2;
      r.forEach((c, j) => sh.text(String(c), cx[j] + 1.5, y, i === 0 ? 2.8 : 2.5, 'L'));
      sh.line([24, y - 2.2], [396, y - 2.2], 'FINA');
    });
    sh.line([24, y0 + 5], [396, y0 + 5], 'NORMA');
  };
  table(rows1, 208);
  table(rows2, 138);
  const notas = [
    'Cálculo (memoria en projects/LBP530-18/out/MEMORIA_EJES.md): tiro de banda LBP ~ 0.8 kN (7% de la carga admisible',
    'Movex 24 kN/m×0.457; límite de diseño 50%) · par en eje ~ 43 Nm · torsión muñón O30 ~ 8 MPa (SF>7) · deflexión ~ 0.06 mm',
    '(supuesto industria <=2.5 mm) · wrap motriz 135° (Movex 140±10°) · velocidad 20 m/min -> 55 rpm (PD 114.9).',
  ];
  notas.forEach((t, i) => sh.text(t, 24, 88 - i * 4.6, 2.5, 'L'));

  sh.frame();
  sh.titleBlock({
    designacion: 'EJES — corte de barras y lista de compra (4 líneas)',
    proyecto: 'LBP530-18 · Conveyone', fuente: 'gen_lbp530.mjs — capa user',
    verificacion: 'DISEÑO CAD (CAPA USER)', piezas: '16 ejes', piezasLabel: 'CANTIDAD',
    nota: 'datos Movex citados en input/web_facts.json; confirmar nº de sprockets LBP con Movex (manual 5 vs brochure 6)',
    escala: '—', fecha, numPlano: dims.ejes.barras ? 'LBP530-EJ-03' : 'EJ-03',
  });
  sheets.push(sh);
}

const pdf = exportSheetsPDF(sheets, 'planos_ejes_lbp530.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK ${join(outDir, pdf.name)} (${sheets.length} láminas)`);
