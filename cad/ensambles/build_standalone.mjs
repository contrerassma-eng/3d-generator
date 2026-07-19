// build_standalone.mjs — genera el HTML AUTOCONTENIDO de la animación (sin
// servidor): empaqueta three + model.js + animate.js + los JSON con esbuild y
// lo envuelve en un HTML con el HUD. Correr desde `cad/`:
//   node ensambles/build_standalone.mjs [salida.html]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const out = process.argv[2] || 'ensambles/transfer_animacion_standalone.html';
const tmp = '/tmp/foto3d_standalone.js';
execFileSync('npx', ['esbuild', 'ensambles/entry_standalone.mjs', '--bundle', '--format=iife',
  '--alias:three=./vendor/three.module.min.js', '--loader:.json=json', `--outfile=${tmp}`],
  { stdio: 'inherit' });
const js = readFileSync(tmp, 'utf8').replaceAll('</script>', '<\\/script>');
rmSync(tmp, { force: true });

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transfer 90° — animación (foto3d)</title>
<style>
 html,body{margin:0;height:100%;background:#12151b;overflow:hidden;font:13px system-ui}
 canvas{display:block}
 #hud{position:fixed;top:10px;left:12px;color:#cfd6e4;z-index:2;max-width:70%}
 #fase{font-size:16px;font-weight:600;color:#ffd54a;margin-top:4px}
 #ctl{position:fixed;bottom:12px;left:12px;right:12px;z-index:2;display:flex;gap:10px;align-items:center;color:#cfd6e4}
 #ctl input[type=range]{flex:1}
 button{background:#2a4fd7;color:#fff;border:0;border-radius:6px;padding:6px 12px;cursor:pointer;font:600 13px system-ui}
 .k{color:#8aa0c8}
</style></head><body>
<div id="hud"><div><span class="k">foto3d · animación (standalone)</span> — <span id="tit">...</span></div><div id="fase">...</div></div>
<div id="ctl"><button id="pp">&#9208; Pausa</button><span id="t" style="width:64px">0.0 s</span><input id="sl" type="range" min="0" max="1000" value="0"><span class="k">arrastra para escrubir</span></div>
<script>${js}</script>
</body></html>`;
writeFileSync(out, html);
console.log(`OK: HTML autocontenido (${(html.length / 1024 | 0)} KB) → ${out}  (se abre con doble clic, sin servidor)`);
