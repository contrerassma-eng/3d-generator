#!/usr/bin/env bash
# vistas_interiores.sh — vistas de los COMPONENTES INTERIORES del NBT90.
#
# Las cuatro vistas de `render.mjs` enseñan la máquina cerrada, y los dos cortes
# de `regenerar.sh` enseñan el serpentín y el corte longitudinal. Falta ver los
# subconjuntos por dentro: la transmisión, la elevación, cómo se monta un
# rodillo, el rodillo de retorno y la neumática.
#
# Cada vista se arma con `solo=` (deja sólo las piezas cuyo nombre casa) o con
# `corte=` (plano de recorte real), y el visor encuadra sobre lo que queda
# visible, así que el filtro hace de zoom. `material=real` para que se distinga
# el aluminio del acero y del uretano; los cortes técnicos siguen en color de
# capa, donde el azul quiere decir MÓVIL.
#
#   cd cad && bash ensambles/nbt90/vistas_interiores.sh
set -euo pipefail
cd "$(dirname "$0")/../.."                      # → cad/
N=ensambles/nbt90
OUT=$N/vistas/interior
DOC=narrow_belt_transfer_90.json

ver() {   # ver <nombre> <query extra>
  node $N/render.mjs d "$OUT" --url "$N/ver_corte.html?doc=$DOC&nombre=$1&$2"
}

# 1. Transmisión: motorreductor, buje sin chaveta, rueda motriz, las seis poleas
#    locas, el tensor y el serpentín. Vista según Y (de costado).
ver transmision \
  'eje=y&material=real&solo=Motorreductor|Buje%20sin%20chaveta|Rueda%20motriz|Polea|Eje%20polea|Banda%20plana|Placa%20soporte%20de%20transmisi|Placa%20de%20apriete|CONTRATUERCA|Anillo%20retenci%C3%B3n%20eje%20polea|Tuerca%20hex.*eje%20polea'

# 2. Elevación: el cilindro real, su canal, la horquilla con sus ménsulas de
#    anclaje, las placas colgantes con colisas, los jack bolts y la neumática.
ver elevacion \
  'eje=y&material=real&solo=MGPM80|Canal%20de%20montaje|Brazo%20de%20empuje|M%C3%A9nsula%20de%20anclaje|Placa%20colgante|jack%20bolt|Pasador%20gu%C3%ADa|NEUM%C3%81TICA|colisa'

# 3. Neumática sola: válvula, silenciadores, racores y las dos líneas.
ver neumatica 'eje=z&material=real&solo=NEUM%C3%81TICA|Soporte%20de%20v%C3%A1lvula'

# 4. Montaje de un rodillo: tubo vulcanizado, eje escalonado, los dos
#    rodamientos con su tapa-soporte y el perno que entra por fuera de la chapa.
ver rodillo_montaje \
  'eje=z&material=real&solo=Rodillo%20vulcanizado%20|Eje%20de%20rodillo|Tapa-soporte|Rodamiento%20608|Placa%20peine|rodillo%20\(l%C3%ADnea%201'

# 5. El rodillo de retorno con su montaje sobre el alma del canal anfitrión.
ver rodillo_retorno \
  'eje=z&material=real&solo=Rodillo%20de%20retorno|retorno%20B-20760|Canal%20lateral%20anfitri'

# 6. Corte transversal por el eje del cilindro: la cadena entera de arriba abajo,
#    del plano de rodillos al canal de montaje. En color de capa (azul = MÓVIL).
ver corte_transversal 'eje=y&corte=0&lado=mas&sin=Canal%20lateral'

# 7. Planta por debajo del plano de rodillos: el serpentín y la transmisión
#    vistos desde arriba, sin los rodillos ni las bandas que los tapan.
ver planta_interior 'eje=z&corte=340&lado=menos&sin=Canal%20lateral%7CGuarda'

printf '\n\033[1mListo.\033[0m  vistas de interior → %s/\n' "$OUT"
