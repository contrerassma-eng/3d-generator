#!/usr/bin/env bash
# cadena_equipo.sh — LA CADENA CANÓNICA GENÉRICA: regenera el paquete completo
# de CUALQUIER tipo de equipo en el ÚNICO orden válido. Un artefacto de otra
# corrida es defecto: este script es la definición ejecutable de «una corrida»,
# y un generador nuevo la HEREDA en vez de copiarla (la copia se desactualiza:
# así se perdió la compuerta del BOM al renombrar un agujero).
#
#   gen         modelos + dims (verify() con compuertas — si falla, NADA se emite)
#   dxf_flat    corte láser 1:1 + _corte/_agujeros.csv       (por equipo)
#   planos_fab  pasada 1: asigna códigos de plano             (por equipo)
#   bom_equipo  asigna ÍTEM (= globos) leyendo planos         (por equipo)
#   planos_fab  pasada 2: despiece con ÍTEM del BOM           (por equipo)
#   [ejes]      familia de planos de ejes si el proyecto la trae
#   ga_equipo   conjunto auto-acotado + secciones (lee BOM)   (por equipo)
#   manual      manual de partes (lee BOM)                    (por equipo)
#   paquete     libro único: portada + índice + TODAS las láminas
#
# Uso (desde cad/):
#   FECHA=2026-08-17 bash ensambles/cadena_equipo.sh <config.sh>
#
# El CONFIG es un .sh corto por PROYECTO que declara:
#   GEN=ensambles/gen_lbp530.mjs          # generador (corre una vez)
#   OUT=ensambles/planos_lbp530           # carpeta del paquete
#   EQUIPOS=("lbp530_5m LB" "lbp530_gt08 GT")   # "docBase PREFIJO" por equipo
#   LINEAS=4                              # multiplicador de proyecto para el BOM
#   EJES=ensambles/planos_ejes_lbp530.mjs # opcional: láminas de ejes
#   REGISTRO_DIR=../../conveyone-simulator/biblioteca/CV-LBP18   # registro persistente de ítems (D-08)
#
# Ejemplo vivo: ensambles/config_lbp530.sh (el LBP corre POR esta cadena).
set -euo pipefail
CONFIG="${1:?uso: cadena_equipo.sh <config.sh>}"
# shellcheck source=/dev/null
source "$CONFIG"
: "${GEN:?config sin GEN}"; : "${OUT:?config sin OUT}"
[ "${#EQUIPOS[@]}" -gt 0 ] || { echo "config sin EQUIPOS"; exit 1; }
FECHA="${FECHA:-$(date +%F)}"
LINEAS="${LINEAS:-1}"
# el GA proyecta el modelo completo con topología cacheada: aire al heap
export NODE_OPTIONS="--max-old-space-size=8192 ${NODE_OPTIONS:-}"

node "$GEN"

for eq in "${EQUIPOS[@]}"; do
  set -- $eq
  DOC=ensambles/$1.json OUTDIR=$OUT PREFIJO=$2 node ensambles/dxf_flat.mjs | tail -1
  DOC=ensambles/$1.json OUTDIR=$OUT PREFIJO=$2 node ensambles/planos_fab.mjs "$FECHA" | tail -1
  REG=""; [ -n "${REGISTRO_DIR:-}" ] && REG="$REGISTRO_DIR/items_$1.json"
  DOC=ensambles/$1.json OUTDIR=$OUT LINEAS=$LINEAS REGISTRO="$REG" node ensambles/bom_equipo.mjs | tail -2
  DOC=ensambles/$1.json OUTDIR=$OUT PREFIJO=$2 node ensambles/planos_fab.mjs "$FECHA" | tail -1
done

if [ -n "${EJES:-}" ]; then FECHA="$FECHA" node "$EJES" | tail -1; fi

# STEP AP203 por pieza FABRICADA (Sergio 19-08): el proveedor externo abre
# STEP en cualquier CAD — sin él, cada cotización empieza pidiendo el 3D.
# Nomenclatura de tres niveles TIPO-FAMILIA-ÍTEM (docs/sr/NOMENCLATURA.md).
if [ -n "${TIPO:-}" ]; then
  for eq in "${EQUIPOS[@]}"; do
    set -- $eq
    DOC=ensambles/$1.json TIPO="$TIPO" OUTDIR=$OUT/step REGISTRO_DIR="${REGISTRO_DIR:-}" node ensambles/step_export.mjs | tail -1
  done
fi

for eq in "${EQUIPOS[@]}"; do
  set -- $eq
  DOC=ensambles/$1.json OUTDIR=$OUT FECHA="$FECHA" node ensambles/ga_equipo.mjs | tail -1
  DOC=ensambles/$1.json OUTDIR=$OUT FECHA="$FECHA" node ensambles/manual_partes.mjs | tail -1
done

OUTDIR=$OUT FECHA="$FECHA" node ensambles/paquete_unico.mjs | tail -1

# el README del paquete declara la fecha de LA corrida (panel 18-08: decía
# 2026-08-12 con artefactos del 18 — la promesa «una corrida» quedaba falsa)
[ -f "$OUT/README_PAQUETE.md" ] && sed -i -E "s/el 20[0-9-]{8} en UNA/el $FECHA en UNA/" "$OUT/README_PAQUETE.md"

echo "CADENA COMPLETA — paquete en $OUT (ver README_PAQUETE.md)"
