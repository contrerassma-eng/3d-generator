#!/usr/bin/env node
// render.mjs — captura las vistas del ensamble abriendo el visor del repo en un
// Chromium sin cabeza. Sirve `cad/` por HTTP en un puerto libre, abre
// `ensambles/ver.html?doc=…&view=…` y espera a `window.__listo`.
//
//   cd cad && node ensambles/nbt90/render.mjs [doc.json] [salida/] [--plano]
//
// Por defecto documenta el NBT90 en `ensambles/nbt90/vistas/`, con MATERIAL
// REAL (ver la cabecera de `ensambles/ver.html`): cada pieza según de qué está
// hecha, entorno de estudio y texturas procedurales. Con `--plano` salen en el
// color de capa de siempre (azul = MÓVIL, dorado = tornillería…), que es el que
// se lee mejor para entender el montaje.
//
// `--url <ruta?query>` no toca la query: las páginas sueltas —los cortes del
// paso 8 de `regenerar.sh`, por ejemplo— mandan sobre su propio modo.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const aquí = dirname(fileURLToPath(import.meta.url));
const raízCad = resolve(aquí, '..', '..');
// Posicionales = los que no son banderas ni el valor de `--url`.
const args = process.argv.slice(2);
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--url');
const doc = pos[0] || 'nbt90/narrow_belt_transfer_90.json';
const outDir = resolve(pos[1] || join(aquí, 'vistas'));
mkdirSync(outDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = createServer(async (req, res) => {
  try {
    const ruta = join(raízCad, decodeURIComponent(req.url.split('?')[0]));
    if (!ruta.startsWith(raízCad)) { res.writeHead(403).end(); return; }
    const buf = await readFile(ruta);
    res.writeHead(200, { 'Content-Type': MIME[extname(ruta)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404).end('no'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const puerto = server.address().port;

// Chromium: el del entorno si está preinstalado (PLAYWRIGHT_BROWSERS_PATH), si no
// el que resuelva playwright. WebGL por software (swiftshader): no hay GPU.
const chromePre = '/opt/pw-browsers/chromium';
const navegador = await chromium.launch({
  ...(existsSync(chromePre) ? { executablePath: chromePre } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const pág = await navegador.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
pág.on('pageerror', e => console.error('  ! error en el visor:', e.message));

// `--url <ruta?query>` captura UNA página cualquiera del repo (p. ej. el visor
// de corte); sin él, captura las cuatro vistas estándar del visor normal.
const iU = process.argv.indexOf('--url');
const material = process.argv.includes('--plano') ? 'plano' : 'real';
const iP = process.argv.indexOf('--pref');
const PREF = iP > 0 && process.argv[iP + 1] ? process.argv[iP + 1]
  : (/narrow_belt_transfer_90/.test(doc) ? 'nbt90'
     : (doc.split('/').pop().replace(/\.json$/, '') || 'ensamble'));
const vistas = iU > 0 ? [process.argv[iU + 1]] : ['iso', 'frente', 'lado', 'planta'];
for (const v of vistas) {
  const url = iU > 0 ? `http://127.0.0.1:${puerto}/${v}`
    : `http://127.0.0.1:${puerto}/ensambles/ver.html?doc=${encodeURIComponent(doc)}&view=${v}&material=${material}`;
  await pág.goto(url, { waitUntil: 'load', timeout: 120000 });
  await pág.waitForFunction('window.__listo === true', null, { timeout: 300000 });
  await pág.waitForTimeout(2500);                      // un par de cuadros ya renderizados
  // El prefijo sale del DOCUMENTO, no cableado a «nbt90»: con `--url` sobre el
  // sorter salían ficheros `nbt90_tensor.png` con el tensor del sorter dentro,
  // la misma trampa que tenía `a_step.py` al escribir `nbt90_ensamble.step`.
  // `--pref` lo fuerza; si no, se deduce del nombre del documento.
  const salida = join(outDir, `${PREF}_${(iU > 0 ? (new URL(url).searchParams.get('nombre') || 'corte') : v)}.png`);
  // con 300+ piezas y WebGL por software, un cuadro tarda decenas de segundos
  await pág.screenshot({ path: salida, timeout: 600000 });
  const info = await pág.textContent('#info');
  console.log(`  ✔ ${v.padEnd(7)} → ${salida}   (${info})`);
}

await navegador.close();
server.close();
console.log(`OK: ${vistas.length} vistas en ${outDir}`);
