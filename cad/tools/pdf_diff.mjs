#!/usr/bin/env node
// pdf_diff.mjs — compara DOS emisiones de la misma lámina, píxel a píxel.
//
// `pdf2png.mjs` ya rasteriza (pdf.js en el Chromium local) y es la herramienta
// de verificación visual de la célula; esto NO la reescribe, la INVOCA dos
// veces y cuenta lo que cambió. Sirve para lo que antes se afirmaba de
// palabra: que un cambio de motor «no altera el dibujo». Un refactor que se
// declara sin efecto visual se DEMUESTRA con 0 px distintos.
//
//   node tools/pdf_diff.mjs <antes.pdf> <despues.pdf> [paginas] [escala]
//
// Salida: una línea por página con píxeles distintos y su bbox, y el TOTAL.
// Los PNG quedan en out/pdf_diff/{A,B}-pNN.png para mirar la diferencia.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [antes, despues, pags = '1', esc = '1.6'] = process.argv.slice(2);
if (!antes || !despues) {
  console.error('uso: pdf_diff <antes.pdf> <despues.pdf> [paginas] [escala]');
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../out/pdf_diff');
mkdirSync(out, { recursive: true });

for (const [pdf, tag] of [[antes, 'A'], [despues, 'B']]) {
  execFileSync('node', [join(here, 'pdf2png.mjs'), resolve(pdf), join(out, tag), pags, esc],
    { stdio: ['ignore', 'ignore', 'inherit'] });
}

// la comparación en Python: Pillow ya está y evita traer una dependencia nueva
console.log(execFileSync('python3', ['-c', `
import sys, glob, os
from PIL import Image, ImageChops
out = sys.argv[1]
tot = 0
for fa in sorted(glob.glob(os.path.join(out, 'A-p*.png'))):
    fb = fa.replace('/A-p', '/B-p')
    if not os.path.exists(fb):
        print(f'  {os.path.basename(fa)}: SIN PAR en la emisión nueva'); tot += 1; continue
    a = Image.open(fa).convert('RGB'); b = Image.open(fb).convert('RGB')
    if a.size != b.size:
        print(f'  {os.path.basename(fa)}: TAMAÑO DISTINTO {a.size} vs {b.size}'); tot += 1; continue
    d = ImageChops.difference(a, b)
    px = sum(1 for p in d.get_flattened_data() if p != (0, 0, 0))
    tot += px
    print(f'  {os.path.basename(fa)}: {px} px distintos de {a.size[0]*a.size[1]}  bbox={d.getbbox()}')
print('TOTAL', tot, '— IDÉNTICO' if tot == 0 else '— HAY DIFERENCIA: mirar los PNG')
`, out], { encoding: 'utf-8' }).trimEnd());
