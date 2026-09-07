#!/usr/bin/env node
// svg2png.mjs — captura un SVG (o HTML) a PNG con el Chromium local.
// Herramienta de VERIFICACIÓN VISUAL de la célula de diseño: toda figura
// generada se mira antes de entregarse.
// Uso: node tools/svg2png.mjs <entrada.svg> <salida.png> [anchoPx]
import { chromium } from 'playwright-core';
import { statSync } from 'node:fs';
const [inFile, outFile, w] = process.argv.slice(2);
if (!inFile || !outFile) { console.error('uso: svg2png <in.svg> <out.png> [anchoPx]'); process.exit(1); }
const abs = inFile.startsWith('/') ? inFile : process.cwd() + '/' + inFile;
statSync(abs);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-gpu'] });
const pg = await b.newPage({ viewport: { width: Number(w) || 1000, height: 700 } });
await pg.goto('file://' + abs, { waitUntil: 'load', timeout: 60000 });
// tamaño real del contenido → viewport exacto y captura SIN fullPage (el
// fullPage de un SVG enorme cuelga el compositor con swiftshader)
const dims = await pg.evaluate(() => {
  const e = document.documentElement;
  return { w: Math.min(4000, Math.ceil(e.scrollWidth)), h: Math.min(12000, Math.ceil(e.scrollHeight)) };
});
await pg.setViewportSize({ width: Math.max(dims.w, 100), height: Math.max(dims.h, 100) });
await pg.waitForTimeout(250);
await pg.screenshot({ path: outFile, timeout: 90000 });
await b.close();
console.log('PNG OK', outFile, `${dims.w}x${dims.h}`);
