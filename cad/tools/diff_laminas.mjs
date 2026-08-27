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
// puede dar luminancia igual y pasaría inadvertido)
const CMP = `
import sys, warnings
warnings.filterwarnings('ignore')
from PIL import Image, ImageChops
a, b = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB')
if a.size != b.size:
    print(f'TAMANO {a.size} vs {b.size}'); sys.exit(0)
d = ImageChops.difference(a, b)
n = sum(1 for p in d.getdata() if p != (0, 0, 0))
print(f'{n} {a.size[0]*a.size[1]} {d.getbbox() or ""}')
`;

const pagsA = readdirSync(dir).filter(f => f.startsWith('A-p')).sort();
let total = 0, revisar = [];
for (const fa of pagsA) {
  const n = fa.slice(3, -4);                       // A-pNN.png → NN
  const fb = `B-p${n}.png`;
  if (!existsSync(join(dir, fb))) { console.log(`  p${n}: falta en la emisión nueva`); revisar.push(n); continue; }
  const r = execFileSync('python3', ['-c', CMP, join(dir, fa), join(dir, fb)], { encoding: 'utf-8' }).trim();
  if (r.startsWith('TAMANO')) { console.log(`  p${n}: ${r}`); revisar.push(n); continue; }
  const [dif, tot, ...bbox] = r.split(' ');
  const pct = (100 * Number(dif) / Number(tot)).toFixed(3);
  total += Number(dif);
  if (Number(dif)) { revisar.push(n); console.log(`  p${n}: ${dif} px (${pct} %) — bbox ${bbox.join(' ')}`); }
  else console.log(`  p${n}: identica`);
}
console.log(total === 0
  ? `\nIDENTICAS en ${pagsA.length} paginas — el cambio NO altera lo impreso.`
  : `\n${total} px cambiaron. MIRAR las paginas ${revisar.join(', ')} antes de emitir.`);
console.log('PNG en', dir);
process.exit(total === 0 ? 0 : 1);
