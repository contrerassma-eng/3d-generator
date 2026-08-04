#!/usr/bin/env bash
# vistas_sorter.sh — las vistas del SORTER CO que enseñan lo que hemos hecho.
#
# Las cuatro vistas de `render.mjs` sobre el documento entero enseñan una caja
# gris: el bastidor del cliente son ENVOLVENTES MEDIDAS (`analisis/medidas.json`,
# piezas `CTX ·`), cajas macizas que tapan todo lo de dentro. Para ver la
# máquina hay que quitarlas o cortar.
#
# Cada vista se arma con `solo=` (deja sólo las piezas cuyo nombre casa),
# `sin=` (las quita) o `corte=` (plano de recorte real). El visor encuadra sobre
# lo que queda visible, así que el filtro hace de zoom. `material=real` para que
# se distinga el aluminio del acero, de la goma y del UHMW.
#
#   cd cad && bash ensambles/sorter_co/vistas_sorter.sh
set -euo pipefail
cd "$(dirname "$0")/../.."                      # → cad/
S=ensambles/sorter_co
OUT=$S/vistas
DOC=../sorter_co/sorter_co_adaptado.json        # relativo a ensambles/nbt90/

ver() {   # ver <nombre> <query extra>
  node ensambles/nbt90/render.mjs d "$OUT" --pref sco \
    --url "ensambles/nbt90/ver_corte.html?doc=$DOC&nombre=$1&$2"
}

# 1. LA MÁQUINA, sin las cajas envolventes del cliente. Es la vista que hay que
#    mirar primero: el bastidor PG40, las 5 calles, el tambor, el conducido, el
#    tensor y la transferencia en su hueco.
ver sorter_maquina 'eje=z&material=real&sin=^CTX%20·'

# 2. ACCIONAMIENTO: tambor motriz Ø108.9 engomado, sus dos UCF 207 en montaje
#    outboard, la chaveta y el saliente de eje donde va el motorreductor.
ver accionamiento \
  'eje=y&material=real&solo=TAMBOR|UCF%20207|Chaveta%20DIN%206885|alargue.*motriz|cabezal%20de%20rodamiento%20motriz'

# 3. TENSOR NEUMÁTICO: los 5 brazos, su eje pivote común con las UCFL 206, las
#    5 poleas tensoras con sus rodamientos, los 5 cilindros y el travesaño
#    frontal del que cuelgan.
ver tensor \
  'eje=y&material=real&solo=Brazo%20tensor|Eje%20pivote|UCFL%20206|Polea%20tensora|Eje%20de%20polea%20tensora|W%206004|Cilindro%20SMC|Bisagra|R%C3%B3tula|Travesa%C3%B1o%20frontal|Placa%20de%20extremo|M%C3%A9nsula%20de%20bisagra|Bul%C3%B3n|Casquillo%20de%20fricci%C3%B3n|Cubo%20del%20brazo|Collar%20de%20apriete|Separador%20%C3%9838'

# 4. LA TRANSFERENCIA EN SU HUECO: el NBT90 completo con las 5 bandas del sorter
#    pasando RECTAS entre sus rodillos. Es la comprobación visual del paso recto.
ver transferencia_paso_recto \
  'eje=y&material=real&solo=NBT90%20·|Banda%20plana%2032|Puente%20de%20calle|Gu%C3%ADa%20UHMW'

# 5. EL POZO: los 4 rodillos de retorno con sus cartelas, el ramal de retorno y
#    los volantes de contraflexión que forman la horquilla del tensor.
ver pozo_retorno \
  'eje=x&material=real&solo=RETORNO|RR[1-4]|Rodillo%20de%20retorno|cartela|Cartela|Volante%20contraflexi|Banda%20plana%2032'

# 6. CONDUCIDO: el rodillo conducido Ø108 de descansos interiores, sus 6207-2RS,
#    la pletina de eje fijo y las colisas de tracking.
ver conducido \
  'eje=y&material=real&solo=CONDUCIDO|6207|Pletina%20de%20eje|cabezal%20de%20rodamiento%20conducido|Cubrejunta.*conducido'

# 7. NEUMÁTICA COMPLETA: el grupo de acondicionamiento (corte, filtro, regulador,
#    manómetro, tes) y las 5 líneas hasta los cilindros.
ver neumatica \
  'eje=x&material=real&solo=SMC|L%C3%ADnea%20de%20aire|Pletina%20soporte%20del%20regulador'

# 8. CORTE TRANSVERSAL por el eje de la calle 3: de la banda al fondo del pozo.
ver corte_calle3 'eje=x&corte=279.456&lado=menos&material=real&sin=^CTX%20·'

printf '\n\033[1mListo.\033[0m  vistas del sorter → %s/\n' "$OUT"
