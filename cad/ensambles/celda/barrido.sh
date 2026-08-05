#!/usr/bin/env bash
# barrido.sh — busca el radio de rueda MÍNIMO que pasa la verificación EXACTA de
# interferencias (sólidos B-rep, OpenCascade), no solo el sondeo por cajas.
#
#   cd cad && bash ensambles/celda/barrido.sh [motor-dentro|motor-fuera] [R0] [R1]
#
# El sondeo por cajas de gen_celda.mjs sirve para descartar rápido, pero puede
# dejar pasar solapes que no meten ningún vértice ni baricentro dentro de la otra
# pieza. Aquí manda OpenCascade.
set -euo pipefail
cd "$(dirname "$0")/../.."

MODO="${1:-motor-dentro}"
R0="${2:-30}"
R1="${3:-120}"
N=ensambles/celda
FLAG=""; [ "$MODO" = "motor-fuera" ] && FLAG="--motor-fuera"

echo "barrido $MODO · R de $R0 a $R1 mm · verificación exacta B-rep"
for R in $(seq "$R0" 1 "$R1"); do
  node $N/gen_celda.mjs --R "$R" $FLAG >/dev/null 2>&1 || continue
  SALIDA=$(python3 $N/../nbt90/interferencias_brep.py --doc $N/celda3.json --tol 0.05 2>&1 || true)
  NINT=$(printf '%s' "$SALIDA" | grep -oE '^[0-9]+ interferencia' | grep -oE '^[0-9]+' || echo 999)
  AF=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$N/celda3.json','utf8')).metricas.hexagonoEntreCaras.toFixed(1))")
  if [ "$NINT" = "0" ]; then
    echo "  R = $R mm → hexágono e/c $AF mm · 0 interferencias  ✔ MÍNIMO"
    exit 0
  fi
  echo "  R = $R mm → $NINT interferencias"
done
echo "sin solución en el rango"
exit 1
