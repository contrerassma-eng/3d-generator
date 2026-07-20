// build_sonda_html.mjs — genera el HTML AUTOCONTENIDO (sin servidor) del visor
// premium de la sonda de suelo: empaqueta three + model.js + csg.js +
// entry_sonda.mjs + sonda_suelo.json con esbuild y lo envuelve en un HTML con
// HUD, panel de instrucciones/BOM/features y controles de corte/despiece.
// Correr desde `cad/`:  node ensambles/build_sonda_html.mjs [salida.html]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const out = process.argv[2] || 'ensambles/sonda_suelo_premium.html';
const tmp = '/tmp/foto3d_sonda.js';
execFileSync('npx', ['esbuild', 'ensambles/entry_sonda.mjs', '--bundle', '--format=iife',
  '--minify', '--alias:three=./vendor/three.module.min.js', '--loader:.json=json', `--outfile=${tmp}`],
  { stdio: 'inherit' });
const js = readFileSync(tmp, 'utf8').replaceAll('</script>', '<\\/script>');
rmSync(tmp, { force: true });

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sonda de humedad de suelo industrial — corte, despiece e instrucciones (foto3d)</title>
<style>
 html,body{margin:0;height:100%;background:#10141a;overflow:hidden;font:13px/1.45 system-ui;color:#cfd6e4}
 #view{position:fixed;inset:0}
 canvas{display:block}
 #hud{position:fixed;top:10px;left:12px;z-index:3;max-width:min(64vw,560px)}
 #hud h1{font-size:15px;margin:0 0 2px;color:#fff}
 #hud .sub{color:#8aa0c8;font-size:11.5px;margin-bottom:8px}
 .row{display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap}
 .row label{color:#8aa0c8}
 button{background:#1d2530;color:#dbe4f0;border:1px solid #2e3a4a;border-radius:7px;
   padding:6px 10px;cursor:pointer;font:600 12.5px system-ui}
 button.on{background:#2a4fd7;border-color:#2a4fd7;color:#fff}
 input[type=range]{width:150px;accent-color:#2a4fd7}
 select{background:#1d2530;color:#dbe4f0;border:1px solid #2e3a4a;border-radius:6px;padding:4px}
 #panel{position:fixed;top:0;right:0;bottom:0;width:min(380px,92vw);z-index:4;
   background:#161b22ee;border-left:1px solid #263140;display:flex;flex-direction:column;
   transition:transform .25s}
 #panel.closed{transform:translateX(calc(100% - 0px))}
 #panelToggle{position:absolute;left:-34px;top:12px;width:34px;height:44px;border-radius:8px 0 0 8px;
   border-right:0;font-size:16px}
 #tabs{display:flex;gap:4px;padding:10px 10px 0}
 #tabs button{flex:1}
 #tabBody{overflow:auto;padding:10px;flex:1}
 .stepNav{display:flex;gap:8px;align-items:center;margin-bottom:8px}
 .stepNav button{width:44px}
 #pTit{flex:1;font-weight:700;color:#ffd54a}
 .stepTxt{background:#0f1319;border:1px solid #263140;border-radius:8px;padding:10px;color:#e6ecf5}
 .stepList{margin:10px 0 0;padding-left:18px}
 .stepList li{margin:4px 0;cursor:pointer;color:#9fb0c8}
 .stepList li.cur{color:#ffd54a;font-weight:700}
 .stepList li:hover{color:#fff}
 table.bom{width:100%;border-collapse:collapse;font-size:11.5px}
 .bom th,.bom td{border-bottom:1px solid #263140;padding:4px 5px;text-align:left;vertical-align:top}
 .bom th{color:#8aa0c8;position:sticky;top:-10px;background:#161b22}
 .feat{padding-left:18px}.feat li{margin:6px 0}
 .note{margin-top:12px;color:#9fb0c8;font-size:11.5px}
 .note ul{padding-left:16px}
 #foot{position:fixed;left:12px;bottom:8px;z-index:3;color:#5d6b80;font-size:11px}
 @media (max-width:720px){ #hud{max-width:92vw} #panel{width:88vw} }
</style></head><body>
<div id="view"></div>
<div id="hud">
 <h1>Sonda de humedad de suelo multiprofundidad — grado industrial</h1>
 <div class="sub">31 piezas · SMT100 ×3 (20/40/60 cm) · IP68 · capa <b>user</b> (diseño CAD paramétrico, mm)</div>
 <div class="row">
  <button id="modeFull" class="on">⬒ Completo</button>
  <button id="modeCut">▤ Corte A-A</button>
  <button id="modeClip">✂ Corte libre</button>
  <span style="width:10px"></span>
  <button id="vIso">ISO</button><button id="vFrente">Frente</button><button id="vCabezal">Cabezal</button>
 </div>
 <div class="row" id="rowExplode"><label>Despiece</label><input id="explode" type="range" min="0" max="100" value="0">
  <label><input id="chkSuelo" type="checkbox" checked> suelo</label></div>
 <div class="row" id="rowClip" style="display:none"><label>Plano</label>
  <select id="clipAxis"><option value="y">Y (A-A)</option><option value="x">X</option><option value="z">Z</option></select>
  <input id="clipPos" type="range" min="0" max="100" value="50"></div>
</div>
<div id="panel">
 <button id="panelToggle">☰</button>
 <div id="tabs">
  <button id="tPasos" class="on">🛠 Ensamble</button>
  <button id="tBom">🧾 BOM</button>
  <button id="tFeat">★ Features</button>
 </div>
 <div id="tabBody"></div>
</div>
<div id="foot">foto3d CAD · corte A-A = booleana CSG real con caras de corte destacadas · 1 dedo orbita / 2 dedos zoom</div>
<script>${js}</script>
</body></html>`;
writeFileSync(out, html);
console.log(`OK: HTML autocontenido (${(html.length / 1024 | 0)} KB) → ${out}`);
