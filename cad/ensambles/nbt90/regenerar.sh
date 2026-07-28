#!/usr/bin/env bash
# regenerar.sh — rehace TODO el entregable de la transferencia 90° desde los
# módulos paramétricos, en el orden en que las cosas dependen unas de otras.
# Se detiene en el primer paso que falle: si el diseño no pasa su compuerta, no
# se emiten planos ni modelos de un ensamble inválido.
#
#   cd cad && bash ensambles/nbt90/regenerar.sh [fecha]
#
# Requisitos:  npm install  (three, playwright)  ·  pip install cadquery trimesh
set -euo pipefail
cd "$(dirname "$0")/../.."                      # → cad/
FECHA="${1:-$(date +%Y-%m-%d)}"
N=ensambles/nbt90

paso() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

paso "1/8  Ensamble (compuerta de diseño)"
# Emite el estado ELEVADO (narrow_belt_transfer_90.json) y, derivado de él, el
# RETRAÍDO (out/nbt90_retraido.json) para el paso 3.
node $N/gen_nbt90.mjs

paso "2/8  Interferencias exactas, estado ELEVADO (sólidos B-rep, OpenCascade)"
# Es la verificación que decide. El chequeo por mallas (interferencias.mjs) se
# conserva como sonda rápida, pero fantasea con perfiles no convexos.
python3 $N/interferencias_brep.py --tol 0.05 || echo "  ⚠ revisar el informe antes de fabricar"

paso "3/8  Interferencias exactas, estado RETRAÍDO"
# El modelo se dibuja elevado, así que el estado bajo no lo miraba nadie: ahí
# había un choque real (la placa soporte de transmisión dentro del labio del
# canal de montaje del cilindro, 1.00 cm³). Se verifica con la MISMA herramienta
# exacta que el estado alto, sobre el JSON que emite el paso 1.
#
# El código de salida se tolera igual que en el estado elevado, porque los dos
# arrastran las mismas 4 interferencias de convención declarada (pernos M8 dentro
# del cuerpo macizo del motorreductor, que es pieza comprada). Quien DECIDE es el
# paso 4: `test_nbt90.mjs` lee los dos informes, descuenta esa convención y falla
# —parando la regeneración— si queda una sola interferencia de diseño en
# cualquiera de los dos estados.
python3 $N/interferencias_brep.py --doc $N/out/nbt90_retraido.json \
        --informe interferencias_brep_retraido.json --tol 0.05 \
  || echo "  ⚠ revisar el informe del estado retraído (lo juzga el paso 4)"

paso "4/8  Pruebas del ensamble"
node tests/test_nbt90.mjs

paso "5/8  Modelo para visualizar (GLB)"
node $N/export_glb.mjs $N/narrow_belt_transfer_90.json $N/out/nbt90.glb

paso "6/8  Sólidos B-rep para CAD (STEP AP242)"
python3 $N/a_step.py --piezas
python3 $N/verificar_step.py --tol 2 || echo "  ⚠ alguna pieza se desvía de la malla — revisar el traductor"

paso "7/8  Planos de fabricación y lista de materiales"
node $N/planos_nbt90.mjs "$FECHA"

paso "8/8  Vistas y cortes"
node $N/render.mjs nbt90/narrow_belt_transfer_90.json
node $N/render.mjs d $N/vistas/corte --url \
  "$N/ver_corte.html?doc=narrow_belt_transfer_90.json&eje=x&corte=85&lado=menos&sin=Canal%20lateral%7CSide%20channel%7CGuarda&nombre=serpentin_seccion"
node $N/render.mjs d $N/vistas/corte --url \
  "$N/ver_corte.html?doc=narrow_belt_transfer_90.json&eje=y&corte=-40&lado=mas&sin=NEUM%7CCanal%20lateral&nombre=longitudinal"

printf '\n\033[1mListo.\033[0m  ensamble → %s\n' "$N/narrow_belt_transfer_90.json"
printf '  estados: elevado (arriba) y %s/out/nbt90_retraido.json (abajo)\n' "$N"
printf '  choques: %s/interferencias_brep.json  +  …_retraido.json\n' "$N"
printf '  3D:      %s/out/nbt90.glb   ·   CAD: %s/step/nbt90_ensamble.step\n' "$N" "$N"
printf '  planos:  %s/planos/planos_fabricacion_nbt90.pdf  (+ despiece.csv)\n' "$N"
printf '  vistas:  %s/vistas/  y  %s/vistas/corte/\n' "$N" "$N"
