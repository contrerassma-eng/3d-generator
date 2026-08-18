#!/usr/bin/env bash
# cadena_lbp530.sh — DELGADO desde 17-08: el LBP corre POR la cadena canónica
# genérica (cadena_equipo.sh) con su config. Este archivo existe sólo para no
# romper la invocación histórica; la verdad vive en cadena_equipo.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
FECHA="${FECHA:-$(date +%F)}" exec bash ensambles/cadena_equipo.sh ensambles/config_lbp530.sh
