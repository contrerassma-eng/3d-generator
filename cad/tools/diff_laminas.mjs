#!/usr/bin/env node
// diff_laminas.mjs — DIFERENCIA PIXEL A PIXEL entre dos emisiones del mismo
// documento. Cierra la regla de REPRESENTACION.md §9.a: «ningún cambio al
// motor de dibujo se entrega sin diff de píxeles contra la emisión anterior».
//
// NO rasteriza por su cuenta: reusa tools/pdf2png.mjs (pdf.js dentro del
// Chromium local), que ya es la herramienta de la célula para eso. Aquí sólo
// vive lo que faltaba — comparar y decidir.
//
// Uso:
//   node tools/diff_laminas.mjs <antes.pdf> <despues.pdf> [paginas] [escala]
//
//   paginas: "1,3,5-7" (por omisión todas) · escala px/pt (por omisión 1.6)
//
// Salida: por página, cuántos píxeles cambiaron y dónde (bbox). Devuelve
// código 0 si son idénticas y 1 si cambió algo, para poder encadenarlo.
//
// Registro de uso (23/27-08): el emisor de estado gráfico persistente de
// drawing2d.js dio 0 px distintos — eso es lo que autorizó a tocar un motor ya
// aprobado. La fusión de sub-triángulos coplanares dio 0,49 % en la lámina 1
// del GA del GT-800 y por eso se revirtió (ver deuda D-14).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [antes, despues, pags = '', esc = ''] = process.argv.slice(2);
if (!antes || !despues) {
  console.error('uso: diff_laminas.mjs <antes.pdf> <despues.pdf> [paginas] [escala]');
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));
const raster = (pdf, pref) => execFileSync('node',
  [join(here, 'pdf2png.mjs'), resolve(pdf), pref, pags, esc].filter(v => v !== ''),
  { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] });

const dir = mkdtempSync(join(tmpdir(), 'difflam-'));
raster(antes, join(dir, 'A'));
raster(despues, join(dir, 'B'));

// comparación exacta por banda (no por luminancia: un cambio de color puro
// puede dar luminancia igual y pasaría inadvertido) y CLASIFICADA, que es lo
// que decide si un cambio se acepta o se revierte:
//
//   matiz    |Δluz| <= 8 — antialiasing. No es información: cuando un relleno
//            deja de dibujar las costuras que cada triángulo se trazaba a sí
//            mismo, la cara queda plana y TODA ella cambia un nivel de tono.
//   PINTADO  apareció tinta donde no había.
//   BORRADO  DESAPARECIÓ tinta — el único que obliga a justificar o revertir.
//
// Sin esta separación un 0,49 % de «píxeles distintos» se lee como daño y se
// revierte una mejora buena (fue el caso de D-14, 27-08).
const CMP = `
import sys, warnings
warnings.filterwarnings('ignore')
from PIL import Image, ImageChops
a, b = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB')
if a.size != b.size:
    print(f'TAMANO {a.size} vs {b.size}'); sys.exit(0)
d = ImageChops.difference(a, b)
matiz = pint = borr = 0
for pa, pb in zip(a.get_flattened_data(), b.get_flattened_data()):
    if pa == pb: continue
    la, lb = sum(pa) / 3, sum(pb) / 3
    if abs(lb - la) <= 8: matiz += 1
    elif lb < la: pint += 1
    else: borr += 1
print(f'{matiz + pint + borr} {a.size[0]*a.size[1]} {matiz} {pint} {borr} {d.getbbox() or ""}')
`;

const pagsA = readdirSync(dir).filter(f => f.startsWith('A-p')).sort();
let total = 0, borrado = 0, revisar = [];
for (const fa of pagsA) {
  const n = fa.slice(3, -4);                       // A-pNN.png → NN
  const fb = `B-p${n}.png`;
  if (!existsSync(join(dir, fb))) { console.log(`  p${n}: falta en la emisión nueva`); revisar.push(n); continue; }
  const r = execFileSync('python3', ['-c', CMP, join(dir, fa), join(dir, fb)], { encoding: 'utf-8' }).trim();
  if (r.startsWith('TAMANO')) { console.log(`  p${n}: ${r}`); revisar.push(n); continue; }
  const [dif, tot, matiz, pint, borr, ...bbox] = r.split(' ');
  const pct = (100 * Number(dif) / Number(tot)).toFixed(3);
  total += Number(dif); borrado += Number(borr);
  if (Number(dif)) {
    revisar.push(n);
    console.log(`  p${n}: ${dif} px (${pct} %) — matiz ${matiz} · PINTADO ${pint} · BORRADO ${borr}` +
      ` — bbox ${bbox.join(' ')}`);
  } else console.log(`  p${n}: identica`);
}
console.log(total === 0
  ? `\nIDENTICAS en ${pagsA.length} paginas — el cambio NO altera lo impreso.`
  : borrado === 0
    ? `\n${total} px cambiaron pero NINGUNO es tinta borrada (matiz y tinta nueva).` +
      ` MIRAR ${revisar.join(', ')} y aceptar si se ve bien.`
    : `\n${total} px cambiaron, ${borrado} son TINTA BORRADA. Justificar o revertir.` +
      ` MIRAR las paginas ${revisar.join(', ')}.`);
console.log('PNG en', dir);
process.exit(borrado === 0 ? 0 : 1);
