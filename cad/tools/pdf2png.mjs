#!/usr/bin/env node
// pdf2png.mjs — rasteriza páginas de un PDF a PNG con pdf.js dentro del
// Chromium local. Herramienta de VERIFICACIÓN VISUAL de la célula de diseño
// (complementa svg2png.mjs): toda lámina generada se mira antes de entregarse.
// Uso: node tools/pdf2png.mjs <in.pdf> <outPrefix> [paginas] [escala]
//   paginas: "1,3,5-7" (por omisión: todas) · escala: px/pt (por omisión 1.6)
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const [inFile, outPrefix, pagSpec, escArg] = process.argv.slice(2);
if (!inFile || !outPrefix) { console.error('uso: pdf2png <in.pdf> <outPrefix> [paginas] [escala]'); process.exit(1); }
const esc = Number(escArg) || 1.6;
const here = dirname(fileURLToPath(import.meta.url));
const pdfjs = resolve(here, '../node_modules/pdfjs-dist/build/pdf.min.mjs');
const worker = resolve(here, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const b64 = readFileSync(resolve(inFile)).toString('base64');

const parsePags = (s, n) => {
  if (!s) return Array.from({ length: n }, (_, i) => i + 1);
  const out = [];
  for (const t of s.split(',')) {
    const m = t.match(/^(\d+)-(\d+)$/);
    if (m) { for (let i = +m[1]; i <= +m[2]; i++) out.push(i); }
    else out.push(+t);
  }
  return out.filter(p => p >= 1 && p <= n);
};

const br = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'],
});
const pg = await br.newPage({ viewport: { width: 1200, height: 800 } });
pg.on('pageerror', (e) => console.error('pageerror:', e.message));
// página REAL file:// JUNTO a node_modules (about:blank es origen opaco y
// desde /tmp el import de módulos file:// cruza de árbol y Chromium lo veta);
// se borra al terminar — no debe quedar en el repo
const hostHTML = join(here, `.pdf2png_host_${process.pid}.html`);
writeFileSync(hostHTML, '<!doctype html><html><body></body></html>');
await pg.goto('file://' + hostHTML);
const res = await pg.evaluate(async ({ pdfjsURL, workerURL, b64, esc }) => {
  const pdfjsLib = await import(pdfjsURL);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerURL;
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const doc = await pdfjsLib.getDocument({ data: raw }).promise;
  const out = { n: doc.numPages, pages: [] };
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: esc });
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    out.pages.push({ p, w: cv.width, h: cv.height, data: cv.toDataURL('image/png') });
  }
  return out;
}, { pdfjsURL: 'file://' + pdfjs, workerURL: 'file://' + worker, b64, esc });
await br.close();
try { (await import('node:fs')).unlinkSync(hostHTML); } catch {}

const want = new Set(parsePags(pagSpec, res.n));
for (const pgD of res.pages) {
  if (!want.has(pgD.p)) continue;
  const f = `${outPrefix}-p${String(pgD.p).padStart(2, '0')}.png`;
  writeFileSync(f, Buffer.from(pgD.data.split(',')[1], 'base64'));
  console.log('PNG OK', f, `${pgD.w}x${pgD.h}`);
}
