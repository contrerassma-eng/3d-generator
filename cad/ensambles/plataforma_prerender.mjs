// plataforma_prerender.mjs — hornea (pre-renderiza) el estado inicial del
// dashboard dentro del HTML, para que los DATOS se vean aun cuando el visor
// no ejecuta JavaScript (paneles/artefactos con CSP estricta). El <script>
// permanece: cuando SÍ hay JS, re-renderiza idéntico y añade interactividad.
// Idempotente: el script hace innerHTML = ... (reemplaza), así re-hornear no
// duplica nada.
// Uso (desde cad/):  node ensambles/plataforma_prerender.mjs [archivo.html]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(process.argv[2] || join(here, 'plataforma_foto3d_demo.html'));

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium' });
const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await pg.goto('file://' + file);
await pg.waitForTimeout(1000);                 // deja correr renderAll()
// congela el reloj a un valor estable para el estado horneado
await pg.evaluate(() => { const c = document.getElementById('clock'); if (c) c.textContent = 'EN VIVO · 00:00';
  const u = document.getElementById('upd'); if (u) u.textContent = 'hace unos segundos'; });
const html = await pg.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);
await b.close();

writeFileSync(file, html);
const kb = (Buffer.byteLength(html) / 1024) | 0;
console.log(`OK pre-render horneado en ${file} (${kb} KB)`);
