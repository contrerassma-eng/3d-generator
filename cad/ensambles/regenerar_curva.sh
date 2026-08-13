#!/usr/bin/env bash
# regenerar_curva.sh — Regenera TODO lo de las curvas 24" de una pasada.
# Se corre desde `cad/`:   bash ensambles/regenerar_curva.sh
set -euo pipefail

ESB="npx esbuild --bundle --format=esm --platform=node --alias:three=./vendor/three.module.min.js"
FECHA=${FECHA:-$(date +%F)}
mkdir -p ensambles/curva_vistas

echo "== 1. modelo paramétrico (bastidor desde los planos Kofmelk)"
node ensambles/gen_curva.mjs

echo "== 2. compuertas"
node tests/test_curva.mjs

echo "== 3. componentes REALES del recto 24V (ZP2026, STEP del fabricante)"
$ESB ensambles/zp_componentes.mjs --outfile=/tmp/zp.mjs
node /tmp/zp.mjs --extraer ensambles/zp_piezas.json

echo "== 4. láminas PDF (disposición Kofmelk)"
$ESB ensambles/planos_curva.mjs --outfile=/tmp/pc.mjs
for A in 60 90; do ANG=$A node /tmp/pc.mjs "$FECHA"; done

echo "== 5. DXF de corte láser + CSV"
$ESB ensambles/dxf_flat.mjs --outfile=/tmp/dxf_curva.mjs
for A in 60 90; do
  DOC=ensambles/curva${A}_24.json OUTDIR=ensambles/planos_curva PREFIJO=CU node /tmp/dxf_curva.mjs
done

echo "== 6. GLB del bastidor (LOD de render: sin barrenos)"
$ESB ensambles/nbt90/export_glb.mjs --outfile=/tmp/glb.mjs
python3 - <<'PY'
import json
for A in (60, 90):
    d = json.load(open(f'ensambles/curva{A}_24.json'))
    for p in d['parts']:
        p['features'] = [x for x in p['features'] if x['shape'] != 'hole']
        p.pop('flat', None)
    d['meta']['nombre'] += ' — LOD de render (sin barrenos)'
    json.dump(d, open(f'/tmp/curva{A}_estructura.json', 'w'), indent=1)
PY
for A in 60 90; do node /tmp/glb.mjs /tmp/curva${A}_estructura.json /tmp/curva${A}_estructura.glb; done

echo "== 7. ensamble: bastidor propio + componentes del recto"
for A in 60 90; do
  python3 ensambles/curva_ensamble.py $A ensambles/curva_vistas/curva${A}_24.glb
done

echo "== 8. vistas"
for A in 60 90; do
  python3 ensambles/render_glb.py ensambles/curva_vistas/curva${A}_24.glb \
    ensambles/curva_vistas --prefijo curva${A}
done

echo "OK — todo en ensambles/planos_curva/ y ensambles/curva_vistas/"
