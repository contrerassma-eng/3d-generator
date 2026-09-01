#!/usr/bin/env node
// raster_pdf.mjs <dir> <pag,pag,…> — rasteriza <dir>/pN.pdf → <dir>/pN.png
// con el visor PDF de Chromium (el mismo motor con el que se mira el libro).
// Lo usa tools/diff_paginas.py; no se llama a mano.
import { chromium } from '../node_modules/playwright/index.mjs';

const [dir, pags] = process.argv.slice(2);
const EXE = process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const br = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const pg = await br.newPage({ viewport: { width: 1620, height: 1180 }, deviceScaleFactor: 2 });
for (const n of pags.split(',')) {
  await pg.goto(`file://${dir}/p${n}.pdf#toolbar=0`);
  await pg.waitForTimeout(3500);            // el visor pinta el vector en diferido
  await pg.screenshot({ path: `${dir}/p${n}.png` });
}
await br.close();
