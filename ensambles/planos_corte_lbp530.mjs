#!/usr/bin/env node
// planos_corte_lbp530.mjs — LÁMINAS DE CORTE LONGITUDINAL (corte A-A por el
// plano medio Y=0) de los transportadores del proyecto LBP530-18:
//
//   LBP530-CO-01  CV-LBP-5000  corte A-A completo (1:20)
//   LBP530-CO-02  CV-LBP-5000  detalle cabezal motriz + catenaria (1:5)
//   LBP530-CO-03  CV-LBP-5000  detalle cola tensor + nosebar de entrada (1:5)
//   LBP530-CO-04  CV-GT-<L>    corte A-A completo (1:5)
//
// Convención de corte: plano Y=0, se mira desde el costado LIBRE (-Y) hacia el
// costado MOTRIZ (+Y). Lo que atraviesa el plano se dibuja con línea gruesa y
// ACHURADO a 45°; lo que queda detrás del plano (Y>0: placa motriz, mecha,
// chumaceras, motorreductor, soportes, sprockets laterales) en línea fina; lo
// que queda delante (Y<0) se retira. Todo sale del ensamble paramétrico
// (lbp530_5m.json / lbp530_gt<L>.json), no de la malla.
//
// Uso (desde cad/): bundlear con esbuild (alias three) y ejecutar:
//   OUT=ensambles/planos_lbp530 FECHA=AAAA-MM-DD node /tmp/planos_corte.js

import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.OUT || 'ensambles/planos_lbp530';
const fecha = process.env.FECHA || new Date().toISOString().slice(0, 10);
mkdirSync(outDir, { recursive: true });
const dims = JSON.parse(readFileSync('ensambles/lbp530_dims.json', 'utf8'));
const D = dims.D;
const GT_L = dims.GT_L || 800;
const gtFile = `lbp530_gt${String(Math.round(GT_L / 100)).padStart(2, '0')}.json`;

// ---------------------------------------------------------------------------
// Geometría auxiliar
// ---------------------------------------------------------------------------
// Recorte de un polígono contra la banda x0 ≤ x ≤ x1 (Sutherland–Hodgman).
function clipX(pts, x0, x1) {
  const clipHalf = (poly, inside, inter) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(inter(a, b));
    }
    return out;
  };
  const cross = (a, b, x) => { const t = (x - a[0]) / (b[0] - a[0]); return [x, a[1] + t * (b[1] - a[1])]; };
  let p = clipHalf(pts, q => q[0] >= x0, (a, b) => cross(a, b, x0));
  if (p.length) p = clipHalf(p, q => q[0] <= x1, (a, b) => cross(a, b, x1));
  return p;
}
// Achurado a 45° (paridad par/impar sobre todas las aristas: sirve para
// polígonos con agujero). `polys` en coordenadas de papel (mm); paso en mm.
function hatch(sh, polys, paso = 1.6, ly = 'FINA') {
  const edges = [];
  let minS = Infinity, maxS = -Infinity;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      edges.push([a, b]);
      for (const q of [a, b]) { const s = q[0] + q[1]; if (s < minS) minS = s; if (s > maxS) maxS = s; }
    }
  }
  // rectas x + y = c ; parámetro a lo largo: t = x − y
  for (let c = Math.ceil(minS / paso) * paso; c < maxS; c += paso) {
    const ts = [];
    for (const [a, b] of edges) {
      const sa = a[0] + a[1] - c, sb = b[0] + b[1] - c;
      if ((sa > 0 && sb > 0) || (sa < 0 && sb < 0) || sa === sb) continue;
      const u = sa / (sa - sb);
      const x = a[0] + u * (b[0] - a[0]), y = a[1] + u * (b[1] - a[1]);
      ts.push(x - y);
    }
    ts.sort((p, q) => p - q);
    for (let i = 0; i + 1 < ts.length; i += 2) {
      const t0 = ts[i], t1 = ts[i + 1];
      if (t1 - t0 < 0.05) continue;
      sh.line([(c + t0) / 2, (c - t0) / 2], [(c + t1) / 2, (c - t1) / 2], ly);
    }
  }
}
const circlePoly = (cx, cy, r, n = 48) => {
  const out = [];
  for (let i = 0; i < n; i++) out.push([cx + r * Math.cos(2 * Math.PI * i / n), cy + r * Math.sin(2 * Math.PI * i / n)]);
  return out;
};
const rectPoly = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// La librería alinea L / C / ML; 'R' se emula con el ancho estimado del texto
const textR = (sh, t, x, y, h, ly) => sh.text(t, x - t.length * h * 0.62, y, h, 'L', ly);

// Rango Y de una feature (mm, coordenadas del equipo)
function rangoY(f, py) {
  if (f.shape === 'box') { const y = f.at[1] + py; return [y - f.params.d / 2, y + f.params.d / 2]; }
  if (f.shape === 'cylinder') {
    const y = f.at[1] + py;
    if (Math.abs(f.dir[1]) === 1) { const y2 = y + f.dir[1] * f.params.h; return [Math.min(y, y2), Math.max(y, y2)]; }
    return [y - f.params.dia / 2, y + f.params.dia / 2];
  }
  if (f.shape === 'sketch') { const y = f.at[1] + py; const y2 = y + (f.dir[1] || -1) * f.params.h; return [Math.min(y, y2), Math.max(y, y2)]; }
  return null;
}

// ---------------------------------------------------------------------------
// Lámina de corte
// ---------------------------------------------------------------------------
// win = [x0, x1] ventana en mm del equipo; den = denominador de escala.
function corteSheet(docFile, opts) {
  const doc = JSON.parse(readFileSync(join('ensambles', docFile), 'utf8'));
  const L = doc.meta.largo_nose_a_nose;
  const [wx0, wx1] = opts.win || [-150, L + 150];
  const sh = new Sheet('A3', 420, 297, 1, opts.den, 1);
  const s = 1 / opts.den;
  const ox = opts.ox ?? 30, oy = opts.oy ?? 200;   // papel de x=wx0 y de z=0
  const X = (x) => ox + (x - wx0) * s, Z = (z) => oy + z * s;
  const enVentana = (xa, xb) => xb >= wx0 && xa <= wx1;

  const cortados = [];   // polígonos (papel) que atraviesan Y=0 → achurar
  const banda = [];      // polígonos exterior+interior de la banda (achurado con agujero)
  let nCorte = 0, nFondo = 0;

  for (const p of doc.parts) {
    const [px, py, pz] = p.pos;
    const esBanda = p.name.includes('Banda');
    for (const f of p.features) {
      if (f.op === 'cut' && !(esBanda && f.shape === 'sketch')) continue;
      if (f.shape === 'hole') continue;
      const ry = rangoY(f, py);
      if (!ry) continue;
      // la banda atraviesa el plano medio siempre (exterior e interior; el boceto
      // interior 'cut' nace fuera del ancho, por eso se fuerza)
      const corta = (esBanda && f.shape === 'sketch') || (ry[0] <= 0.01 && ry[1] >= -0.01);
      const detras = ry[0] > 0;          // lado motriz (+Y): queda a la vista
      if (!corta && !detras) continue;   // lado libre (-Y): retirado por el corte

      if (f.shape === 'sketch') {
        let pts = f.params.pts.map(([u, v]) => [u + f.at[0] + px, v + f.at[2] + pz]);
        pts = clipX(pts, wx0, wx1);
        if (pts.length < 3) continue;
        const pp = pts.map(([x, z]) => [X(x), Z(z)]);
        sh.poly(pp, corta ? 'VISIBLE' : 'FINA');
        if (corta) banda.push(pp);
        continue;
      }
      if (f.shape === 'box') {
        let x0 = f.at[0] + px - f.params.w / 2, x1 = x0 + f.params.w;
        if (!enVentana(x0, x1)) continue;
        x0 = Math.max(x0, wx0); x1 = Math.min(x1, wx1);
        const z0 = f.at[2] + pz;
        const r = rectPoly(X(x0), Z(z0), (x1 - x0) * s, f.params.h * s);
        sh.poly(r, corta ? 'VISIBLE' : 'FINA');
        if (corta) { cortados.push(r); nCorte++; } else nFondo++;
      } else if (f.shape === 'cylinder' && Math.abs(f.dir[1]) === 1) {
        const cx = f.at[0] + px, cz = f.at[2] + pz, r = f.params.dia / 2;
        if (!enVentana(cx - r, cx + r)) continue;
        sh.circle([X(cx), Z(cz)], r * s, corta ? 'VISIBLE' : 'FINA');
        if (corta) { cortados.push(circlePoly(X(cx), Z(cz), r * s)); nCorte++; } else nFondo++;
      } else if (f.shape === 'cylinder') {
        // cilindro con eje X o Z: rectángulo envolvente en XZ
        const cx = f.at[0] + px, cz = f.at[2] + pz, r = f.params.dia / 2, h = f.params.h;
        let x0, x1, z0, z1;
        if (Math.abs(f.dir[0]) === 1) { x0 = Math.min(cx, cx + f.dir[0] * h); x1 = Math.max(cx, cx + f.dir[0] * h); z0 = cz - r; z1 = cz + r; }
        else { x0 = cx - r; x1 = cx + r; z0 = Math.min(cz, cz + f.dir[2] * h); z1 = Math.max(cz, cz + f.dir[2] * h); }
        if (!enVentana(x0, x1)) continue;
        x0 = Math.max(x0, wx0); x1 = Math.min(x1, wx1);
        const rr = rectPoly(X(x0), Z(z0), (x1 - x0) * s, (z1 - z0) * s);
        sh.poly(rr, corta ? 'VISIBLE' : 'FINA');
        if (corta) { cortados.push(rr); nCorte++; } else nFondo++;
      }
    }
  }
  // achurados: banda (anillo exterior−interior) y cada sólido cortado por separado
  if (banda.length) hatch(sh, banda, 1.2);
  for (const poly of cortados) {
    // no achurar sólidos de menos de 0,8 mm de papel en alguna dirección (goma, bar cap a 1:20)
    const xs = poly.map(q => q[0]), ys = poly.map(q => q[1]);
    if (Math.max(...xs) - Math.min(...xs) < 0.8 || Math.max(...ys) - Math.min(...ys) < 0.8) continue;
    hatch(sh, [poly], 1.6);
  }

  // plano de corte y piso
  sh.line([X(wx0), Z(D.pisoZ)], [X(wx1), Z(D.pisoZ)], 'PLIEGUE');
  textR(sh, 'NPT', X(wx0) - 2, Z(D.pisoZ), 2.6);
  sh.line([X(wx0), Z(0)], [X(wx1), Z(0)], 'PLIEGUE');
  textR(sh, 'z=0 plano de producto', X(wx0) - 2, Z(0) + 1.5, 2.4);

  // cotas
  const dh = (x1, x2, z, d, t) => {
    const yl = Z(z) - d;
    for (const x of [x1, x2]) sh.line([X(x), Z(z)], [X(x), yl - 1.5], 'COTAS');
    sh.line([X(x1), yl], [X(x2), yl], 'COTAS');
    sh.text(t, (X(x1) + X(x2)) / 2, yl + 1.6, 3.0, 'C', 'COTAS');
  };
  const dv = (x, z1, z2, d, t) => {
    const xl = X(x) + d;
    for (const z of [z1, z2]) sh.line([X(x), Z(z)], [xl + 1.5, Z(z)], 'COTAS');
    sh.line([xl, Z(z1)], [xl, Z(z2)], 'COTAS');
    if (d >= 0) sh.text(t, xl + 1.8, (Z(z1) + Z(z2)) / 2, 3.0, 'ML', 'COTAS');
    else textR(sh, t, xl - 1.8, (Z(z1) + Z(z2)) / 2 - 1.2, 3.0, 'COTAS');
  };
  const xDrv = L - (opts.lbp ? D.xMotrizDesdePunta : (D.gtMotDx ?? D.xMotrizDesdePunta));
  const xTen = D.tail?.x ?? D.gtTail?.x ?? D.xTensorDesdePunta;
  const zTen = D.tail?.z ?? D.gtTail?.z ?? D.zTensor;
  const zMot = opts.lbp ? D.zMotriz : (D.gtMotZ ?? D.zMotriz);
  if (!opts.win) {
    dh(0, L, D.pisoZ, 8, `${L} (nose a nose)`);
    dh(xDrv, L, D.pisoZ, 16, `${L - xDrv}`);
    dh(0, xTen, D.pisoZ, 16, `${xTen}`);
    dv(L + 60 / opts.den, D.pisoZ, 0, 10, `${-D.pisoZ} (plano de banda)`);
    dv(L + 60 / opts.den, zMot, 0, 22, `${-zMot} (eje motriz)`);
    dv(-60 / opts.den, zTen, 0, -14, `${-zTen} (rodillo de cola)`);
  } else {
    if (xDrv >= wx0 && xDrv <= wx1) { dv(wx1 + 20 / opts.den, zMot, 0, 10, `${-zMot} (eje motriz)`); dh(xDrv, L, zMot - 270, 8, `${D.xMotrizDesdePunta}`); }
    if (xTen >= wx0 && xTen <= wx1) { dv(wx0 - 20 / opts.den, zTen, 0, -10, `${-zTen} (rodillo de cola)`); dh(0, xTen, zTen - 120, 8, `${xTen}`); }
    const xCat = xDrv - (D.snub?.dx ?? 100) - D.catenLen / 2;
    if (opts.lbp && xCat > wx0 && xCat < wx1) dv(xCat, D.retTop, D.sagBot, 14, `flecha ${Math.abs(D.sagBot - D.retTop)} (Movex 50-150)`);
    if (opts.lbp && wx0 < 0) dv(-20 / opts.den, D.retTop, 0, -10, `${-D.retTop} (plano de retorno)`);
  }

  // rótulos
  const tag = (x, z, dx, dz, t) => {
    if (x < wx0 || x > wx1) return;
    sh.line([X(x), Z(z)], [X(x) + dx, Z(z) + dz], 'COTAS');
    if (dx >= 0) sh.text(t, X(x) + dx + 1, Z(z) + dz, 2.5, 'L', 'COTAS');
    else textR(sh, t, X(x) + dx - 1, Z(z) + dz, 2.5, 'COTAS');
  };
  for (const r of opts.tags || []) tag(...r);

  // leyenda
  const ly0 = 44;
  sh.text(`CORTE A-A — plano medio Y=0, visto desde el costado libre (-Y) hacia el costado motriz (+Y)`, 24, ly0, 3.2, 'L');
  sh.text(`Achurado: material que atraviesa el plano de corte (banda, ejes, travesaños, cabezales, guardas, nosebars). Línea fina: piezas detrás del plano (placa motriz, mechas, chumaceras, motorreductor, sprockets, soportes, guías).`, 24, ly0 - 4.6, 2.4, 'L');
  sh.text(`${doc.meta.nombre} · lazo ${(doc.meta.largo_banda_lazo_mm / 1000).toFixed(2)} m · envoltura motriz ${opts.wrap}° (Movex 140±10) · ${nCorte} sólidos cortados / ${nFondo} al fondo · fuente: ${docFile} (gen_lbp530.mjs, capa user)`, 24, ly0 - 9.2, 2.4, 'L');

  sh.frame();
  sh.titleBlock({
    designacion: opts.designacion, proyecto: 'LBP530-18 · Conveyone',
    fuente: 'gen_lbp530.mjs — capa user', verificacion: 'DISEÑO CAD (CAPA USER)',
    piezas: '4 (1 por línea)', piezasLabel: 'CANTIDAD',
    nota: 'corte longitudinal por el plano medio desde el ensamble paramétrico; 3D: out/cad/*.glb',
    escala: `1:${opts.den}`, fecha, numPlano: opts.numPlano,
  });
  return sh;
}

const lbpMeta = JSON.parse(readFileSync('ensambles/lbp530_5m.json', 'utf8')).meta;
const gtMeta = JSON.parse(readFileSync(join('ensambles', gtFile), 'utf8')).meta;
const Lb = lbpMeta.largo_nose_a_nose, xDrvL = Lb - D.xMotrizDesdePunta;
const xDrvG = GT_L - (D.gtMotDx ?? D.xMotrizDesdePunta), zMotG = D.gtMotZ ?? D.zMotriz;
const gtM = (GT_L / 1000).toFixed(1);

const sheets = [
  corteSheet('lbp530_5m.json', {
    den: 20, lbp: true, wrap: lbpMeta.verificaciones.wrapMotrizLBP,
    designacion: 'CV-LBP-5000 — corte longitudinal A-A (Movex 530 LBP 18 in × 5.0 m)', numPlano: 'LBP530-CO-01',
    tags: [
      [18, -20, -14, 16, 'NOSEBAR P22868 h19 c/rodamientos (entrada)'],
      [Lb - 18, -20, 14, 20, 'NOSEBAR (descarga)'],
      [xDrvL, D.zMotriz - 78, 14, -14, 'EJE MOTRIZ (LBP530-EJ-01) · sprocket central Z32 cortado · motorreductor al fondo'],
      [D.tail.x, D.tail.z - 34, 20, -40, 'RODILLO DE COLA Ø63.5 en colisa (tensor, manual p.73)'],
      [xDrvL - D.snub.dx - D.catenLen / 2, D.sagBot - 6, -10, -22, 'catenaria 750 (flecha 130)'],
      [xDrvL - D.snub.dx - D.catenLen - 500, D.retTop - 34, -10, -30, 'rodillos de retorno Ø63.5 a 500±50 (cortados)'],
      [Lb / 2, -72, 0, -40, 'travesaño C 71×38 con orejas (cortado) cada 1000, bajo las guías'],
    ],
  }),
  corteSheet('lbp530_5m.json', {
    den: 5, lbp: true, wrap: lbpMeta.verificaciones.wrapMotrizLBP, win: [Lb - 1700, Lb + 120], ox: 28, oy: 248,
    designacion: 'CV-LBP-5000 — corte A-A, detalle cabezal motriz, snub y catenaria', numPlano: 'LBP530-CO-02',
    tags: [
      [Lb - 18, -20, -14, 18, 'NOSEBAR P22868 (descarga) sobre frente chapa 3 plegada 470×240 (cortado)'],
      [xDrvL, D.zMotriz - 78, -22, -26, 'EJE MOTRIZ 38.1 cuadrado · sprocket central Z32 PD 153.4 · UCF206 y motorreductor NMRV-P075 al fondo'],
      [xDrvL - D.snub.dx, D.snub.z - 34, -12, -26, 'snub Ø63.5 (manual p.72)'],
      [xDrvL - D.snub.dx - D.catenLen / 2, D.sagBot - 6, -8, -30, 'catenaria 750 (700 +200/-50): flecha 130 (50-150)'],
      [xDrvL - D.snub.dx - D.catenLen, D.retTop - 34, -10, -34, 'rodillo de retorno Ø63.5 eje muerto Ø15 (2× 6202-2RS)'],
      [Lb - 1200, -10.45 - 9.5, -30, 30, 'guía de apoyo: pletina 12×30 + BAR CAP UHMW (al fondo, 5 pistas)'],
      [Lb - 1000, -450, -6, -22, 'guarda inferior artesa U chapa 1.5 (fondo cortado)'],
    ],
  }),
  corteSheet('lbp530_5m.json', {
    den: 5, lbp: true, wrap: lbpMeta.verificaciones.wrapMotrizLBP, win: [-120, 1400], ox: 40, oy: 248,
    designacion: 'CV-LBP-5000 — corte A-A, detalle cola tensor y nosebar de entrada', numPlano: 'LBP530-CO-03',
    tags: [
      [18, -20, -14, 16, 'NOSEBAR P22868 (entrada, lado IDLER = acumulación)'],
      [D.tail.x, D.tail.z - 34, 20, -40, 'RODILLO DE COLA Ø63.5 en COLISA 9x40 = tensor (manual p.73) · eje muerto Ø15, 2× 6202-2RS'],
      [D.tail.x + 450, D.retTop - 34, 10, -30, 'rodillos de retorno a 500±50 (último tramo 450±50)'],
      [700, -544, 20, -10, 'pata ZP2026: escuadra B_005A_1 + columna SOLID_06 + base B_004A_1 (al fondo)'],
      [500, -72, 0, -40, 'travesaño C 71×38 con orejas (cortado)'],
    ],
  }),
  corteSheet(gtFile, {
    den: 5, lbp: false, wrap: gtMeta.verificaciones.wrapMotrizGT, ox: 140, oy: 248,
    designacion: `CV-GT-${GT_L} — corte longitudinal A-A (Movex 530 GT grip top 18 in × ${gtM} m)`, numPlano: 'LBP530-CO-04',
    tags: [
      [18, -20, -14, 16, 'NOSEBAR P22862 h19 c/rodamientos (entrada)'],
      [GT_L - 18, -20, 14, 20, 'NOSEBAR (descarga)'],
      [xDrvG, zMotG - 78, 16, -16, 'EJE MOTRIZ 38.1 cuadrado (LBP530-EJ-01) · 6 sprockets Z32 al fondo · motorreductor NMRV-P075'],
      [D.gtTail?.x ?? 60, (D.gtTail?.z ?? -170) - 34, 20, -40, 'RODILLO DE COLA Ø63.5 en COLISA 9x40 = tensor (manual p.73) · eje muerto Ø15, 2× 6202-2RS'],
      [xDrvG - (D.gtRet?.dx ?? 100), (D.gtRet?.z ?? -140) + 34, -40, 34, 'snub Ø63.5 tras la motriz (manual p.72) eje muerto Ø15 (2× 6202-2RS, perno hex M8 por fuera)'],
      [400, -72, -30, -70, 'travesaño C 71×38 con orejas (cortado)'],
      [300, -10.7 - 9.5, 40, 40, 'guía de apoyo pletina 12 + BAR CAP (al fondo, 7 pistas) · goma grip top +2 sobre la banda'],
    ],
  }),
];

const pdf = exportSheetsPDF(sheets, 'planos_corte_lbp530.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK ${join(outDir, pdf.name)} (${sheets.length} láminas)`);
