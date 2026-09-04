#!/usr/bin/env node
// muestra_acotado.mjs — lámina de muestra con TODAS las primitivas de acotado
// nuevas, para MIRARLAS (regla 12) antes de meterlas en un plano real.
import { writeFileSync } from 'node:fs';
import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';

const sh = new Sheet('A3', 420, 297, 1, 1, 1);
sh.frame();
sh.text('MUESTRA DE ACOTADO — primitivas ISO 129 / 1101 / 1302', 20, 275, 5, 'L');

// 1) diámetro y marca de centro
sh.text('Ø + marca de centro', 30, 258, 3, 'L');
sh.circle([45, 235], 9, 'VISIBLE'); sh.marcaCentro([45, 235], 9);
sh.dimDia([45, 235], 9, 'Ø18', 40);

// 2) radio + angular
sh.text('R + angular', 105, 258, 3, 'L');
sh.circle([120, 235], 14, 'VISIBLE'); sh.marcaCentro([120, 235], 2);
sh.dimRad([120, 235], 14, 'R14', 130);
sh.dimAng([120, 235], 20, -20, 55, '75°');

// 3) directriz
sh.text('directriz', 195, 258, 3, 'L');
sh.circle([205, 235], 5, 'VISIBLE');
sh.directriz([208, 238], [222, 250], '4× Ø10 H9', 1);

// 4) GD&T + datum
sh.text('tolerancia geométrica (ISO 1101)', 275, 258, 3, 'L');
sh.marcoGDT(275, 245, 'concentricidad', '0.05', ['A', 'B']);
sh.marcoGDT(275, 236, 'posicion', 'Ø0.2', ['A']);
sh.marcoGDT(275, 227, 'perpendicularidad', '0.1', ['A']);
sh.marcoGDT(330, 245, 'paralelismo', '0.15', ['B']);
sh.marcoGDT(330, 236, 'cilindricidad', '0.02', []);
sh.marcoGDT(330, 227, 'salto', '0.05', ['A-B']);
sh.line([275, 218], [355, 218], 'VISIBLE');
sh.datum([300, 218], 'A', 0, -11);

// 5) rugosidad
sh.text('rugosidad (ISO 1302)', 30, 205, 3, 'L');
sh.line([30, 190], [90, 190], 'VISIBLE');
sh.rugosidad([45, 190], 'Ra 1.6');
sh.rugosidad([70, 190], 'Ra 3.2');

// 6) ordenadas — el acotado de una chapa de láser
sh.text('acotado por ordenadas desde cero declarado', 120, 205, 3, 'L');
sh.rect(130, 150, 120, 40, 'VISIBLE');
const barrenos = [[145, 178, 5], [175, 178, 5], [205, 178, 5], [235, 178, 5], [160, 160, 3.5], [220, 160, 3.5]];
for (const [x, y, r] of barrenos) { sh.circle([x, y], r, 'VISIBLE'); sh.marcaCentro([x, y], r); }
sh.ordenadasH(130, barrenos.map(b => ({ v: b[0] - 130, x: b[0], yFeat: b[1] - b[2] })), 148, 8);
sh.ordenadasV(150, barrenos.map(b => ({ v: b[1] - 150, y: b[1], xFeat: b[0] - b[2] })), 128, 8);

// 7) tabla de barrenos
sh.text('tabla de barrenos', 285, 205, 3, 'L');
sh.tablaBarrenos(285, 190, [
  ['A', 'Ø10', '4', '15.0', '28.0'],
  ['B', 'Ø7', '2', '30.0', '10.0'],
  ['C', 'Ø11', '3', '—', 'ver DXF'],
]);

// 8) comparación: cota lineal de siempre
sh.text('cota lineal (la que ya existía)', 30, 130, 3, 'L');
sh.rect(30, 95, 80, 25, 'VISIBLE');
sh.dimH(30, 110, 95, 9, 80);
sh.dimV(110, 95, 120, 9, 25);

writeFileSync('/tmp/muestra_acotado.pdf', exportSheetsPDF([sh], 'muestra.pdf').data);
console.log('OK /tmp/muestra_acotado.pdf');
