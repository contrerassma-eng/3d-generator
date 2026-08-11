#!/usr/bin/env bash
# regenerar.sh — rehace TODO el entregable del RC-SCH40-48 de una sola vez.
#
#   cd cad && bash ensambles/rodillos_sch40/regenerar.sh [fecha]
#
# Requisitos:  npm install (three)  ·  pip install cadquery trimesh
set -euo pipefail
cd "$(dirname "$0")/../.."          # → cad/
N=ensambles/rodillos_sch40
FECHA="${1:-$(date +%Y-%m-%d)}"
mkdir -p "$N/out"

echo "1/6  Ensamble + compuerta de diseño"
node $N/gen_rodillos.mjs

echo "2/6  Interferencias exactas (sólidos B-rep, OpenCascade)"
python3 $N/interferencias_brep.py --tol 0.05 || echo "  ⚠ revisar el informe antes de fabricar"

echo "3/6  Modelo para la app de diseño y para visualizar (GLB)"
node $N/export_glb.mjs $N/rodillos_sch40.json $N/out/rodillos_sch40.glb

echo "4/6  Sólidos B-rep para CAD (STEP AP242)"
python3 $N/a_step.py --piezas
python3 $N/verificar_step.py --tol 2 || echo "  ⚠ alguna pieza se desvía de la malla"

echo "5/6  Planos de fabricación y lista de materiales"
node $N/planos_rodillos.mjs "$FECHA"

echo "6/6  Listo."
echo "     App de diseño : cad/index.html → 📂 Abrir → $N/rodillos_sch40.json"
echo "     Visor rápido  : cad/ensambles/ver.html?doc=rodillos_sch40/rodillos_sch40.json&view=iso"
