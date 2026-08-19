# config del proyecto CV-BLT (banda plana MB800 ejemplo L800×W500) para
# cadena_equipo.sh — hereda la cadena canónica, nada copiado.
GEN=ensambles/gen_blt800.mjs
OUT=ensambles/planos_blt800
EQUIPOS=("blt800 BT")
LINEAS=1
# sin EJES: el CV-BLT es equipo de CATÁLOGO (Rev.B) — no torneamos nada, las
# piezas del fabricante se DOCUMENTAN en el paquete de originales MB800
REGISTRO_DIR=../../conveyone-simulator/biblioteca/CV-BLT
export PAQUETE=BLT800
export PORTADA_1='Proyecto CV-BLT — banda plana estilo MB800 M-HASTE · EJEMPLO L800 × W500 × H750'
export PORTADA_2='Perfil serie 80 · banda PVC W500 · motor 120 W acople directo (DL) · tensado por tornillo — PRD CV-BLT'
export GEN_NOMBRE=gen_blt800.mjs
export COMPLEMENTOS='DXF de corte láser 1:1 (dxf_blt800/) + BOM CSV + paquete soportes vendor MB800 REV A'
