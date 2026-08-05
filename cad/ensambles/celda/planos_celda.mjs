#!/usr/bin/env node
// planos_celda.mjs — entregables de taller de la celda triple:
//   placa_hexagonal.dxf : contorno de corte a escala real (1 unidad = 1 mm)
//   despiece.csv        : lista de materiales del MÓDULO de 9 celdas
//
//   cd cad && node ensambles/celda/planos_celda.mjs
//
// El DXF sale con la geometría de corte y nada más —hexágono, ranuras y
// taladros— porque es lo que come una cortadora láser; el plano acotado con
// cajetín se emite aparte con el generador de láminas del repo.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { P } from './params.mjs';
import { geometriaPlaca, anguloUnidad } from './celda.mjs';

const aquí = dirname(fileURLToPath(import.meta.url));
const out = join(aquí, 'out');
mkdirSync(out, { recursive: true });

// --- DXF R12 mínimo: solo POLYLINE cerradas y CIRCLE -------------------------
function dxf(contornos, circulos) {
  const L = [];
  const g = (c, v) => L.push(String(c), String(v));
  g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  for (const { pts, capa } of contornos) {
    g(0, 'POLYLINE'); g(8, capa); g(66, 1); g(70, 1);
    for (const [x, y] of pts) { g(0, 'VERTEX'); g(8, capa); g(10, x.toFixed(3)); g(20, y.toFixed(3)); }
    g(0, 'SEQEND');
  }
  for (const { x, y, d, capa } of circulos) {
    g(0, 'CIRCLE'); g(8, capa); g(10, x.toFixed(3)); g(20, y.toFixed(3)); g(40, (d / 2).toFixed(3));
  }
  g(0, 'ENDSEC'); g(0, 'EOF');
  return L.join('\r\n') + '\r\n';
}

const G = geometriaPlaca();
const contornos = [{ pts: G.hexagono, capa: 'CORTE_EXTERIOR' }];
for (const r of G.ranuras) contornos.push({ pts: r, capa: 'RANURA_RUEDA' });

// Los taladros salen de `geometriaPlaca`, la MISMA fuente que usa el modelo 3D.
const circulos = [];
for (const t of G.taladros) circulos.push({ x: t.x, y: t.y, d: t.d, capa: 'TALADRO_M3' });

writeFileSync(join(out, 'placa_hexagonal.dxf'), dxf(contornos, circulos), 'latin1');

// --- despiece del MÓDULO de 9 celdas ----------------------------------------
const n = P.nCeldas, u = n * P.nRuedas;                // 9 celdas · 27 unidades
const items = [
  ['Rueda omni Ø48 × 24.5, bore 4', u, 'COMPRADA', 'el usuario tiene 28'],
  ['Motor TT 1:48 3–6 V doble eje', u, 'COMPRADA', 'el usuario tiene 30'],
  ['Rodamiento 624ZZ 4×13×5', u * 2, 'COMPRADA', 'dos por rueda: el motor no carga peso'],
  [`Eje Ø${P.ejeDia} × 58.5 (acero plata)`, u, 'FABRICADA', `${(u * 58.5 / 1000).toFixed(2)} m de barra Ø4`],
  ['Bloque porta-rodamiento 26×10×26', u * 2, 'IMPRESA', 'PETG'],
  ['Acople TT 5.5 plano → Ø4', u, 'IMPRESA', 'PETG'],
  ['Soporte motor TT', u, 'IMPRESA', 'PETG'],
  ['Disco encoder 36 ranuras Ø30', u, 'IMPRESA', 'PETG · 10° de resolución'],
  ['Sensor ranurado IR LM393', u, 'COMPRADA', 'sobre el eje de la RUEDA'],
  [`Placa hexagonal e/c ${G.af} × ${P.placaEsp}`, n, 'FABRICADA', 'corte láser, placa_hexagonal.dxf'],
  ['Driver TB6612FNG (2 canales)', Math.ceil(u / 2), 'COMPRADA', `${u} canales`],
  ['ESP32 DevKit', n + 1, 'COMPRADA', 'uno por celda + maestro'],
  ['Buck 12→6 V 5 A', n, 'COMPRADA', 'uno por celda'],
  ['Fuente 12 V 20 A', 1, 'COMPRADA', `${(u * 0.5).toFixed(0)} A con carga`],
  ['Tornillo M3×12 + tuerca', u * 4 + n * 12, 'COMPRADA', 'bloques y unión entre celdas'],
];
const csv = 'item,designacion,cantidad,tipo,nota\n'
  + items.map((it, i) => [i + 1, `"${it[0]}"`, it[1], it[2], `"${it[3]}"`].join(',')).join('\n') + '\n';
writeFileSync(join(out, 'despiece_modulo.csv'), csv);

console.log(`placa: hexágono e/c ${G.af} mm · ranura ${G.anchoRanura}×${G.largoRanura} mm`);
console.log(`  ${contornos.length} contornos + ${circulos.length} taladros → ${join(out, 'placa_hexagonal.dxf')}`);
console.log(`despiece del módulo de ${n} celdas (${u} unidades motrices) → ${join(out, 'despiece_modulo.csv')}`);
