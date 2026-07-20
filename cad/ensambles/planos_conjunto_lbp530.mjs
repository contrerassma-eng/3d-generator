#!/usr/bin/env node
// planos_conjunto_lbp530.mjs — LÁMINAS DE ARREGLO GENERAL (elevación lateral
// acotada) de los transportadores del proyecto LBP530-18:
//
//   LBP530-GA-01  CV-LBP-5000 (Movex 530 LBP 18 in × 5.0 m)
//   LBP530-GA-02  CV-GT-800   (Movex 530 GT friction top 18 in × 0.8 m)
//
// Dibuja la elevación desde los propios ensambles paramétricos (lazo de banda
// real + rectángulos/círculos de cada pieza en el plano XZ) — NO desde la
// malla (el S6 sobre la malla del conjunto produce DXF inmanejables).
//
// Uso (desde cad/): bundlear con esbuild (alias three) y ejecutar:
//   OUT=ensambles/planos_lbp530 node /tmp/planos_conjunto.js

import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.OUT || 'ensambles/planos_lbp530';
const fecha = process.env.FECHA || '2026-07-19';
mkdirSync(outDir, { recursive: true });
const dims = JSON.parse(readFileSync('ensambles/lbp530_dims.json', 'utf8'));
const D = dims.D;

function gaSheet(docFile, opts) {
  const doc = JSON.parse(readFileSync(join('ensambles', docFile), 'utf8'));
  const L = doc.meta.largo_nose_a_nose;
  const sh = new Sheet('A3', 420, 297, 1, opts.den, 1);
  const s = 1 / opts.den;
  const ox = 30, oy = 210;   // origen de dibujo: x=0, z=0 (plano de banda)
  const X = (x) => ox + x * s, Z = (z) => oy + z * s;

  // piezas: cajas → rectángulos XZ; cilindros con eje Y → círculos
  for (const p of doc.parts) {
    const [px, py, pz] = p.pos;
    const banda = p.name.includes('Banda');
    for (const f of p.features) {
      if (f.op === 'cut' || f.shape === 'hole') continue;
      if (banda && f.shape === 'sketch') {
        const pts = f.params.pts.map(([u, v]) => [X(u + f.at[0] + px), Z(v + f.at[2] + pz)]);
        sh.poly(pts, 'VISIBLE');
        break;    // solo la cara exterior
      }
      if (f.shape === 'box') {
        const x0 = f.at[0] + px - f.params.w / 2, z0 = f.at[2] + pz;
        sh.rect(X(x0), Z(z0), f.params.w * s, f.params.h * s, 'FINA');
      } else if (f.shape === 'cylinder' && Math.abs(f.dir[1]) === 1) {
        sh.circle([X(f.at[0] + px), Z(f.at[2] + pz)], (f.params.dia / 2) * s, 'FINA');
      }
    }
  }

  // línea de piso
  sh.line([X(-150), Z(D.pisoZ)], [X(L + 150), Z(D.pisoZ)], 'PLIEGUE');
  sh.text('NPT', X(-150) - 2, Z(D.pisoZ), 2.6, 'R');

  // cotas principales
  const dh = (x1, x2, z, d, t) => {
    const yl = Z(z) - d;
    for (const x of [x1, x2]) sh.line([X(x), Z(z)], [X(x), yl - 1.5], 'COTAS');
    sh.line([X(x1), yl], [X(x2), yl], 'COTAS');
    sh.text(t, (X(x1) + X(x2)) / 2, yl + 1.6, 3.0, 'C', 'COTAS');
  };
  dh(0, L, D.pisoZ, 8, `${L} (nose a nose)`);
  const xDrv = L - D.xMotrizDesdePunta, xTen = D.xTensorDesdePunta;
  dh(xDrv, L, D.pisoZ, 16, `${D.xMotrizDesdePunta}`);
  dh(0, xTen, D.pisoZ, 16, `${D.xTensorDesdePunta}`);
  // alturas
  const dv = (x, z1, z2, d, t) => {
    const xl = X(x) + d;
    for (const z of [z1, z2]) sh.line([X(x), Z(z)], [xl + 1.5, Z(z)], 'COTAS');
    sh.line([xl, Z(z1)], [xl, Z(z2)], 'COTAS');
    sh.text(t, xl + 1.8, (Z(z1) + Z(z2)) / 2, 3.0, 'ML', 'COTAS');
  };
  dv(L + 60 / opts.den, D.pisoZ, 0, 10, '900 (plano de banda)');
  dv(L + 60 / opts.den, D.zMotriz, 0, 22, `${-D.zMotriz} (eje motriz)`);

  // rótulos con línea de referencia
  const tag = (x, z, dx, dz, t) => {
    sh.line([X(x), Z(z)], [X(x) + dx, Z(z) + dz], 'COTAS');
    sh.text(t, X(x) + dx + (dx >= 0 ? 1 : -1), Z(z) + dz, 2.5, dx >= 0 ? 'L' : 'R', 'COTAS');
  };
  tag(xDrv, D.zMotriz - 58, 14, -14, `EJE MOTRIZ cuadrado 1.5in (LBP530-EJ-01) + ${opts.nSprk} sprockets Z24 + UCF206 + motorreductor eje hueco O30`);
  tag(xTen, D.zTensor - 58, 20, -20, 'EJE TENSOR (LBP530-EJ-02) + 2 sprockets Z24 locos + UCF206');
  tag(18, -20, -14, 16, `NOSEBAR ${opts.noseArt}`);
  tag(L - 18, -20, 14, 20, 'NOSEBAR (descarga)');
  if (opts.lbp) {
    tag(xDrv - 740, -285, -10, -26, 'catenaria: sag 130 (Movex 50-150)');
    tag(xDrv - 1660, -160, -10, -34, 'zapatas de retorno UHMW cada ~500 (Movex)');
  } else {
    tag(L / 2 - 20, -180, -14, -30, 'rodillo de retorno O63.5 (Movex D>50)');
  }

  const notas = [
    `Banda: ${doc.meta.nombre} · lazo ${(doc.meta.largo_banda_lazo_mm / 1000).toFixed(2)} m · wrap motriz ${opts.wrap}° (Movex 140±10)`,
    `Ancho banda 457.2 (18 in) · entre placas 470 · exterior 482 · holgura lateral 6.4/lado (dilatación POM + 5 básica)`,
    'Ejes: ver láminas LBP530-EJ-01/02/03 (fabricación y corte de barras). Datos Movex: input/web_facts.json.',
  ];
  notas.forEach((t, i) => sh.text(t, 24, 60 - i * 5, 2.6, 'L'));

  sh.frame();
  sh.titleBlock({
    designacion: opts.designacion, proyecto: 'LBP530-18 · Conveyone',
    fuente: 'gen_lbp530.mjs — capa user', verificacion: 'DISEÑO CAD (CAPA USER)',
    piezas: '4 (1 por línea)', piezasLabel: 'CANTIDAD',
    nota: 'elevación lateral desde el ensamble paramétrico; 3D: out/cad/*.glb',
    escala: `1:${opts.den}`, fecha, numPlano: opts.numPlano,
  });
  return sh;
}

const sheets = [
  gaSheet('lbp530_5m.json', {
    den: 20, lbp: true, nSprk: dims.belt.nSprkLBP, wrap: 135,
    noseArt: 'especial 530 LBP art. 22868', designacion: 'CV-LBP-5000 — arreglo general (Movex 530 LBP 18 in × 5.0 m)',
    numPlano: 'LBP530-GA-01',
  }),
  gaSheet('lbp530_gt08.json', {
    den: 5, lbp: false, nSprk: dims.belt.nSprkGT, wrap: 133,
    noseArt: '530 art. 22809', designacion: 'CV-GT-800 — arreglo general (Movex 530 GT friction top 18 in × 0.8 m)',
    numPlano: 'LBP530-GA-02',
  }),
];

const pdf = exportSheetsPDF(sheets, 'planos_conjunto_lbp530.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK ${join(outDir, pdf.name)} (${sheets.length} láminas)`);
