#!/usr/bin/env bash
# publicar_visor.sh — empaqueta el visor foto3d del repo en UN SOLO HTML
# autocontenido con el modelo del sorter EMBEBIDO, listo para publicarse como
# página (Artifact de claude.ai o cualquier hosting estático).
#
# Por qué existe: el GLB del ensamble pesa 171 MB (2.4 M de triángulos) y no se
# puede alojar; el JSON paramétrico pesa 2.4 MB y el navegador construye la
# geometría con el MISMO motor CSG del repo. Esto es ver.html con tres cambios:
# el documento va embebido en la página, el import dinámico de materiales pasa a
# estático (esbuild empaqueta), y el material por defecto es `real`.
#
#   bash ensambles/sorter_co/publicar_visor.sh [salida.html]
set -euo pipefail
cd "$(dirname "$0")/../.."                     # → cad/
SALIDA="${1:-/tmp/sorter_co_foto3d.html}"
T=$(mktemp -d)
python3 - "$T" <<'PY'
import pathlib, re, sys
T = pathlib.Path(sys.argv[1]); CAD = pathlib.Path.cwd()
src = (CAD/'ensambles/ver.html').read_text()
code = re.search(r'<script type="module">\n(.*?)\n</script>', src, re.S).group(1)
code = code.replace("const doc = await (await fetch(docUrl)).json();",
  "const doc = JSON.parse(document.getElementById('doc-json').textContent);")
code = f"import {{ crearMateriales }} from '{CAD}/ensambles/nbt90/materiales.mjs';\n" + code
code = code.replace("  const { crearMateriales } = await import('./nbt90/materiales.mjs');\n", "")
code = code.replace("from '../vendor/OrbitControls.js'", f"from '{CAD}/vendor/OrbitControls.js'")
code = code.replace("from '../js/model.js'", f"from '{CAD}/js/model.js'")
code = code.replace("from './estudio.mjs'", f"from '{CAD}/ensambles/estudio.mjs'")
code = code.replace("const real = (q.get('material') || 'plano').toLowerCase() === 'real';",
                    "const real = (q.get('material') || 'real').toLowerCase() !== 'plano';")
(T/'entry.mjs').write_text(code)
PY
npx --yes esbuild "$T/entry.mjs" --bundle --minify --format=iife \
  --alias:three="$PWD/vendor/three.module.min.js" --outfile="$T/bundle.js" >/dev/null 2>&1
python3 - "$T" "$SALIDA" <<'PY'
import pathlib, sys
T = pathlib.Path(sys.argv[1]); salida = pathlib.Path(sys.argv[2])
doc = pathlib.Path('ensambles/sorter_co/sorter_co_adaptado.json').read_text().replace('</', '<\\/')
bundle = (T/'bundle.js').read_text()
html = f"""<meta charset="utf-8">
<title>Sorter CO — foto3d</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  /* Tema unico a proposito: el estudio oscuro del visor foto3d del repo. */
  html, body {{ margin: 0; height: 100%; background: #14171c; overflow: hidden; }}
  body.real {{ background:
      radial-gradient(120% 90% at 50% 22%, #333b46 0%, #23272e 45%, #14171c 100%); }}
  #info {{ position: fixed; top: 8px; left: 10px; color: #cfd6e4;
          font: 12px system-ui; z-index: 2; text-shadow: 0 1px 3px #000a;
          font-variant-numeric: tabular-nums; }}
  canvas {{ display: block; }}
  #cargando {{ position: fixed; inset: 0; display: grid; place-content: center;
    color: #dfe6ee; font: 14px/1.6 system-ui; text-align: center; z-index: 3;
    background: #14171c; transition: opacity .4s; }}
  #cargando b {{ font-size: 17px; }}
  #cargando .paso {{ color: #8b97a8; font-size: 12.5px; }}
  #ayuda {{ position: fixed; right: 12px; bottom: 10px;
    font: 11.5px system-ui; z-index: 2; color: #778394; }}
</style>
<div id="cargando"><div>
  <b>SORTER CO — narrow belt + transferencia 90°</b><br>
  <span class="paso">construyendo 968 piezas desde el modelo paramétrico…<br>
  unos segundos según tu equipo (la geometría se talla en tu navegador)</span>
</div></div>
<div id="info"></div>
<div id="ayuda">arrastrar = orbitar · rueda = zoom · clic derecho = desplazar</div>
<script id="doc-json" type="application/json">{doc}</script>
<script>
addEventListener('load', () => {{
  const esconder = () => {{ const c = document.getElementById('cargando');
    if (!c) return;
    if (window.__listo) {{ c.style.opacity = '0'; setTimeout(() => c.remove(), 450); }}
    else setTimeout(esconder, 300); }};
  setTimeout(esconder, 300);
}});
</script>
<script>{bundle}</script>
"""
salida.write_text(html)
print(f'OK: {salida} · {len(html)/1e6:.2f} MB')
PY
rm -rf "$T"
