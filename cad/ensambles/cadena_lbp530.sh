#!/usr/bin/env bash
# cadena_lbp530.sh — regenera el paquete COMPLETO del proyecto LBP530-18 en el
# ÚNICO orden válido (correr desde cad/). Un artefacto de otra corrida es
# defecto: este script es la definición ejecutable de «una corrida».
#
#   gen        modelos + dims (verify() con compuertas — si falla, NADA se emite)
#   dxf_flat   corte láser 1:1 + _planos.json           (por equipo)
#   planos_fab pasada 1: asigna planos LB/GT-nn         (por equipo)
#   bom_equipo asigna ÍTEM (= globos) leyendo planos    (por equipo)
#   planos_fab pasada 2: despiece con ÍTEM del BOM      (por equipo)
#   planos_ejes familia EJ-01…04 (lee dims)
#   ga_equipo  conjunto auto-acotado (lee BOM)          (por equipo)
#   manual     manual de partes CV-MP-01/02 (lee BOM)   (por equipo)
#
# Uso:  FECHA=2026-08-12 bash ensambles/cadena_lbp530.sh
set -euo pipefail
FECHA="${FECHA:-$(date +%F)}"
OUT=ensambles/planos_lbp530

node ensambles/gen_lbp530.mjs

for eq in "lbp530_5m LB" "lbp530_gt08 GT"; do
  set -- $eq
  DOC=ensambles/$1.json OUTDIR=$OUT PREFIJO=$2 node ensambles/dxf_flat.mjs | tail -1
  DOC=ensambles/$1.json OUTDIR=$OUT PREFIJO=$2 node ensambles/planos_fab.mjs "$FECHA" | tail -1
  DOC=ensambles/$1.json OUTDIR=$OUT LINEAS=4 node ensambles/bom_equipo.mjs | tail -1
  DOC=ensambles/$1.json OUTDIR=$OUT PREFIJO=$2 node ensambles/planos_fab.mjs "$FECHA" | tail -1
done

FECHA="$FECHA" node ensambles/planos_ejes_lbp530.mjs | tail -1

for eq in lbp530_5m lbp530_gt08; do
  DOC=ensambles/$eq.json OUTDIR=$OUT FECHA="$FECHA" node ensambles/ga_equipo.mjs | tail -1
  DOC=ensambles/$eq.json OUTDIR=$OUT FECHA="$FECHA" node ensambles/manual_partes.mjs | tail -1
done

echo "CADENA COMPLETA — paquete en $OUT (ver README_PAQUETE.md)"
