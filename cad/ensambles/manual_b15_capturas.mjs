// manual_b15_capturas.mjs — capturas headless del visor sonda_suelo_b15.html
// para el manual/dossier PDF (manual_b15_pdf.py). Usa los hooks window.__cam /
// window.__ctr del visor y el resaltado por paso del panel de ensamble.
// Uso (desde cad/):  node ensambles/manual_b15_capturas.mjs [dirSalida]
// Requiere playwright (usa el del sistema si no está en node_modules) y
// Chromium (PLAYWRIGHT_BROWSERS_PATH o /opt/pw-browsers/chromium).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || join(here, 'planos_sonda', '_caps_b15'));
mkdirSync(out, { recursive: true });

// [nombre, {tgt, pos, suelo?, li? (índice de paso), mode?, explode?}]
const SHOTS = [
  ['hero', { tgt: [0, 0, 720], pos: [2400, -2400, 1950], suelo: true }],
  ['frente', { tgt: [0, 0, 720], pos: [80, -3100, 880], suelo: true }],
  ['cabezal', { tgt: [0, 0, 1845], pos: [430, -430, 2015] }],
  ['inferior', { tgt: [0, 0, 1750], pos: [520, -520, 1580] }],
  ['explode', { tgt: [0, 0, 1000], pos: [2100, -2100, 1900], explode: 72 }],
  ['corte', { tgt: [0, 0, 1830], pos: [540, -540, 2140], mode: 'cut' }],
  ['corte_sonda', { tgt: [0, 0, -300], pos: [640, -640, 60], mode: 'cut' }],
  ['paso1', { li: 0, tgt: [0, 0, 720], pos: [2400, -2400, 1950], suelo: true }],
  ['paso2', { li: 1, tgt: [0, 0, -500], pos: [620, -620, -160] }],
  ['paso3', { li: 2, tgt: [0, 0, -350], pos: [560, -560, -30] }],
  ['paso4', { li: 3, tgt: [0, 0, -380], pos: [640, -640, 20] }],
  ['paso5', { li: 4, tgt: [0, 0, 30], pos: [420, -420, 300] }],
  ['paso6', { li: 5, tgt: [0, 0, 950], pos: [1500, -1500, 1600], suelo: true }],
  ['paso7', { li: 6, tgt: [0, 0, 1760], pos: [430, -430, 1940] }],
  ['paso8', { li: 7, tgt: [0, 0, 1835], pos: [400, -400, 2020] }],
  ['paso9', { li: 8, tgt: [0, 0, 1930], pos: [560, -560, 2180] }],
  ['paso10', { li: 9, tgt: [0, 0, 450], pos: [1650, -1650, 1150], suelo: true }],
  ['paso11', { li: 10, tgt: [0, 0, -150], pos: [950, -950, 420], suelo: true }],
  ['paso12', { li: 11, tgt: [0, 0, 1350], pos: [1500, -1500, 1950], suelo: true }],
];

const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium',
});
const pg = await b.newPage({ viewport: { width: 1500, height: 1050 } });
await pg.goto('file://' + join(here, 'sonda_suelo_b15.html'));
await pg.waitForTimeout(2500);
await pg.addStyleTag({ content: '#hud,#panel,#foot{display:none!important}' });

let cutBuilt = false;
for (const [name, s] of SHOTS) {
  // modo
  if (s.mode === 'cut') {
    await pg.evaluate(() => document.getElementById('modeCut').click());
    await pg.waitForTimeout(cutBuilt ? 400 : 10000);
    cutBuilt = true;
  } else {
    await pg.evaluate(() => document.getElementById('modeFull').click());
  }
  // despiece
  await pg.evaluate((v) => {
    const sl = document.getElementById('explode');
    sl.value = v; sl.dispatchEvent(new Event('input'));
  }, s.explode || 0);
  // paso activo (resalta sus piezas, atenúa el resto)
  if (s.li !== undefined) {
    await pg.evaluate((i) => document.querySelectorAll('#tabBody li')[i].click(), s.li);
  }
  // suelo + cámara
  await pg.evaluate(({ tgt, pos, suelo }) => {
    const chk = document.getElementById('chkSuelo');
    if (chk.checked !== !!suelo) chk.click();
    window.__ctr.target.set(...tgt);
    window.__cam.position.set(...pos);
    window.__ctr.update();
  }, { tgt: s.tgt, pos: s.pos, suelo: !!s.suelo });
  await pg.waitForTimeout(350);
  await pg.screenshot({ path: join(out, `${name}.png`) });
  console.log(`  ${name}.png`);
}
await b.close();
console.log(`OK ${SHOTS.length} capturas → ${out}`);
