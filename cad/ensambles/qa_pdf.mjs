#!/usr/bin/env node
// qa_pdf.mjs — METRÓLOGO: mira la lámina de verdad y compara dos emisiones.
//
// La regla 12 («verificación visual») se ejecutaba a ojo, sin herramienta: se
// miraba el modelo, no el PDF impreso. Esto rasteriza la lámina REAL con el
// visor PDF de Chromium (el mismo motor que usa el taller para imprimir) y,
// si se le dan dos archivos, cuenta los píxeles que cambiaron.
//
//   node ensambles/qa_pdf.mjs ver   <pdf> <pags>            → PNG por página
//   node ensambles/qa_pdf.mjs diff  <antes> <despues> <pags> → píxeles distintos
//
// <pags> = lista 1-based separada por coma («3,10,12»). Salida en
// out/qa_pdf/<nombre>/pN.png. Un cambio que se dice «sin efecto visual» se
// demuestra con `diff` dando 0 — no con la palabra del que lo hizo.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

const RAIZ = resolve(new URL('..', import.meta.url).pathname);
const OUT = join(RAIZ, 'out', 'qa_pdf');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// separa las páginas pedidas a PDF de una hoja: el visor de Chromium IGNORA
// el fragmento #page=, así que la única forma fiable de fijar la página es
// que el archivo tenga una sola.
function separa(pdf, dir, pags) {
  mkdirSync(dir, { recursive: true });
  execFileSync('python3', ['-c', `
import sys
from pypdf import PdfReader, PdfWriter
pdf, out, pags = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
r = PdfReader(pdf)
for n in pags:
    w = PdfWriter(); w.add_page(r.pages[int(n)-1])
    with open(f'{out}/p{n}.pdf','wb') as fh: w.write(fh)
`, pdf, dir, pags], { stdio: 'inherit' });
}

async function rasteriza(dir, pags) {
  const br = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await br.newPage({ viewport: { width: 1620, height: 1180 }, deviceScaleFactor: 2 });
  for (const n of pags.split(',')) {
    await pg.goto(`file://${dir}/p${n}.pdf#toolbar=0`);
    await pg.waitForTimeout(3500);                    // el visor pinta en diferido
    await pg.screenshot({ path: `${dir}/p${n}.png` });
  }
  await br.close();
}

const [modo, ...arg] = process.argv.slice(2);
if (modo === 'ver') {
  const [pdf, pags] = arg;
  const dir = join(OUT, basename(pdf, '.pdf'));
  rmSync(dir, { recursive: true, force: true });
  separa(pdf, dir, pags); await rasteriza(dir, pags);
  console.log(`OK ${dir}  (páginas ${pags})`);
} else if (modo === 'diff') {
  const [a, b, pags] = arg;
  const dA = join(OUT, 'A'), dB = join(OUT, 'B');
  for (const [p, d] of [[a, dA], [b, dB]]) {
    rmSync(d, { recursive: true, force: true });
    separa(p, d, pags); await rasteriza(d, pags);
  }
  const r = execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageChops
dA, dB, pags = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
tot = 0
for n in pags:
    a = Image.open(f'{dA}/p{n}.png').convert('RGB'); b = Image.open(f'{dB}/p{n}.png').convert('RGB')
    if a.size != b.size:
        print(f'  pag {n}: TAMAÑO DISTINTO {a.size} vs {b.size}'); tot += 1; continue
    d = ImageChops.difference(a, b)
    px = sum(1 for p in d.get_flattened_data() if p != (0, 0, 0))
    tot += px
    print(f'  pag {n}: {px} px distintos de {a.size[0]*a.size[1]}  bbox={d.getbbox()}')
print('TOTAL', tot)
`, dA, dB, pags], { encoding: 'utf-8' });
  console.log(r.trimEnd());
} else {
  console.log('uso: qa_pdf.mjs ver <pdf> <pags>  |  qa_pdf.mjs diff <antes> <despues> <pags>');
  process.exit(1);
}
