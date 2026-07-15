# -*- coding: utf-8 -*-
# REFERENCIA DE PROCEDENCIA (capa user, medidas reales del usuario, 2026-07).
# Script CadQuery original del que derivan el registro
# `adaptador_borneras_esp32_70x80` de componentes/catalogo.json y el generador
# del repo pipeline/carcasa_esp32.py (que NO requiere CadQuery). No forma parte
# del pipeline; se conserva sin modificar como fuente de las dimensiones.
"""
CASE ESP32 + ADAPTADOR BORNERAS - v3
------------------------------------
v3 = v2 + SALIDAS LATERALES DE CABLE:
  - Muescas en U en las paredes largas (+-X, lado borneras), ABIERTAS POR
    ARRIBA (llegan a la costura). Flujo: sacar tapa -> pasar cable por la
    muesca -> apretar bornera -> poner tapa. El faldon de la tapa cierra
    la muesca por arriba y queda todo tapado.
  - 3 salidas por lado (y = -30, 0, +30), ancho 7 mm (cable hasta ~O6.5).
    Editable en NOTCH_YS / NOTCH_W.
  - Se quitan las costillas de alineacion de los lados largos para que el
    cable no tope (quedan las de los extremos + los 4 tornillos).
  - TOP_SLOTS: True = tapa como la referencia (ranuras superiores);
    False = tapa ciega (solo salidas laterales).
Tornillos tapa: 4x M3x16 avellanado cabeza plana DIN 965 (90 grados).
"""
import cadquery as cq

# ============ PARAMETROS ============
PCB_W, PCB_L, PCB_T = 70.0, 80.0, 1.6
BELOW_PCB, COMP_H, TOP_CLEAR = 4.0, 15.5, 2.5
HOLE_DX, HOLE_DY = 32.0, 73.0
BOARD_SCREW, STANDOFF_D = 2.7, 6.5
TERM_DEPTH = 9.0

TOP_SLOTS   = True     # ranuras superiores de la tapa (referencia)
TERM_SLOT_W, TERM_SLOT_L = 12.0, 72.0

USB_W, USB_H, USB_GAP, USB_Zc, USB_N = 10.5, 5.2, 2.5, 1.8, 2

WALL, FLOOR, LID_T = 2.4, 2.4, 2.4
PCB_GAP, SKIRT_H = 6.5, 7.0

BOSS_D, PILOT_D, CSK_THRU, CSK_D, CSK_ANG = 7.0, 2.7, 3.4, 6.6, 90.0
PILOT_DEPTH = 12.0

FLG_OUT, FLG_W, FLG_T = 14.0, 28.0, 4.0
SLOT_W5, SLOT_L5 = 5.4, 11.0
FILLET_V, CHAM_TOP = 2.0, 1.0

# --- Salidas laterales de cable (paredes +-X) ---
NOTCH_W     = 7.0            # ancho muesca (cable hasta ~O6.5)
NOTCH_DEPTH = 9.5            # profundidad desde la costura hacia abajo
NOTCH_YS    = [-30.0, 0.0, 30.0]   # posiciones a lo largo (por lado)

# ============ DERIVADOS ============
CAV_W, CAV_L = PCB_W + 2*PCB_GAP, PCB_L + 2*PCB_GAP
OUT_W, OUT_L = CAV_W + 2*WALL, CAV_L + 2*WALL
INT_H  = BELOW_PCB + PCB_T + COMP_H + TOP_CLEAR
TOTAL  = FLOOR + INT_H + LID_T
SEAM_Z = TOTAL - LID_T - SKIRT_H
BOSS_TOP = TOTAL - LID_T
PCB_TOP  = FLOOR + BELOW_PCB + PCB_T

hx, hy = HOLE_DX/2, HOLE_DY/2
HOLES  = [( hx, hy), (-hx, hy), ( hx,-hy), (-hx,-hy)]
bx, by = CAV_W/2 - BOSS_D/2 + 0.3, CAV_L/2 - BOSS_D/2 + 0.3
BOSSES = [( bx, by), (-bx, by), ( bx,-by), (-bx,-by)]
term_x = PCB_W/2 - TERM_DEPTH/2
NOTCH_BOT = SEAM_Z - NOTCH_DEPTH
R = NOTCH_W/2

print(f"Cuerpo {OUT_W:.1f} x {OUT_L:.1f} x {TOTAL:.1f} | costura z={SEAM_Z:.1f} | muesca z {NOTCH_BOT:.1f}-{SEAM_Z:.1f}")

# ============ BASE ============
base = cq.Workplane("XY").box(OUT_W, OUT_L, SEAM_Z, centered=(True, True, False))
try: base = base.edges("|Z").fillet(FILLET_V)
except Exception as e: print("fillet base:", e)
base = base.cut(cq.Workplane("XY").workplane(offset=FLOOR)
                .box(CAV_W, CAV_L, SEAM_Z, centered=(True, True, False)))

for (x, y) in BOSSES:
    base = base.union(cq.Workplane("XY").workplane(offset=FLOOR)
                      .center(x, y).circle(BOSS_D/2).extrude(BOSS_TOP - FLOOR))
    base = base.cut(cq.Workplane("XY").workplane(offset=BOSS_TOP)
                    .center(x, y).circle(PILOT_D/2).extrude(-PILOT_DEPTH))
for (x, y) in HOLES:
    base = base.union(cq.Workplane("XY").workplane(offset=FLOOR)
                      .center(x, y).circle(STANDOFF_D/2).extrude(BELOW_PCB))
    base = base.cut(cq.Workplane("XY").workplane(offset=FLOOR-0.5)
                    .center(x, y).circle(BOARD_SCREW/2).extrude(BELOW_PCB+1.0))

usb_tot = USB_N*USB_W + (USB_N-1)*USB_GAP
for i in range(USB_N):
    xc = -usb_tot/2 + USB_W/2 + i*(USB_W+USB_GAP)
    base = base.cut(cq.Workplane("XZ").workplane(offset=OUT_L/2+1)
                    .center(xc, PCB_TOP + USB_Zc).rect(USB_W, USB_H).extrude(-(WALL+3)))

for sgn in (+1, -1):
    fl = (cq.Workplane("XY").center(0, sgn*(OUT_L/2 + FLG_OUT/2 - 0.1))
          .box(FLG_W, FLG_OUT+0.2, FLG_T, centered=(True, True, False)))
    try: fl = fl.edges("|Z").fillet(3.0)
    except Exception: pass
    base = base.union(fl)
    base = base.cut(cq.Workplane("XY").workplane(offset=-0.5)
                    .center(0, sgn*(OUT_L/2 + FLG_OUT*0.55))
                    .slot2D(SLOT_L5, SLOT_W5, 90).extrude(FLG_T+1.0))

# --- MUESCAS LATERALES DE CABLE (abiertas hacia la costura) ---
for y in NOTCH_YS:
    zc_rect = (SEAM_Z + 2 + NOTCH_BOT + R) / 2
    h_rect  = (SEAM_Z + 2) - (NOTCH_BOT + R)
    cutter = (cq.Workplane("YZ").center(y, zc_rect)
              .rect(NOTCH_W, h_rect).extrude(OUT_W/2 + 2, both=True))
    cutter = cutter.union(cq.Workplane("YZ").center(y, NOTCH_BOT + R)
                          .circle(R).extrude(OUT_W/2 + 2, both=True))
    base = base.cut(cutter)      # corta ambas paredes +-X a la vez

# ============ TAPA ============
lid = (cq.Workplane("XY").workplane(offset=SEAM_Z)
       .box(OUT_W, OUT_L, LID_T + SKIRT_H, centered=(True, True, False)))
try: lid = lid.edges("|Z").fillet(FILLET_V)
except Exception as e: print("fillet tapa:", e)
try: lid = lid.edges(">Z").chamfer(CHAM_TOP)
except Exception as e: print("chamfer tapa:", e)
lid = lid.cut(cq.Workplane("XY").workplane(offset=SEAM_Z - 0.1)
              .rect(OUT_W - 2*WALL, OUT_L - 2*WALL).extrude(SKIRT_H + 0.1))

# costillas SOLO en extremos +-Y (los lados largos quedan libres p/ cables)
RIB_T, RIB_DROP = 1.6, 2.5
for sgn in (+1, -1):
    lid = lid.union(cq.Workplane("XY").workplane(offset=SEAM_Z - RIB_DROP)
                    .center(0, sgn*(CAV_L/2 - 0.2 - RIB_T/2))
                    .box(46, RIB_T, SKIRT_H + RIB_DROP, centered=(True, True, False)))

if TOP_SLOTS:
    for sgn in (+1, -1):
        lid = lid.cut(cq.Workplane("XY").workplane(offset=SEAM_Z + SKIRT_H - 0.1)
                      .center(sgn*term_x, 0)
                      .slot2D(TERM_SLOT_L, TERM_SLOT_W, 90)
                      .extrude(LID_T + CHAM_TOP + 0.2))

LBL_W = 2*(term_x - TERM_SLOT_W/2) - 8
lid = lid.cut(cq.Workplane("XY").workplane(offset=TOTAL)
              .rect(LBL_W - 6, 58 - 6).offset2D(3.0).extrude(-0.8))

lid = (lid.faces(">Z").workplane(centerOption="CenterOfBoundBox")
       .pushPoints(BOSSES).cskHole(CSK_THRU, CSK_D, CSK_ANG, depth=None))

# ============ EXPORT ============
cq.exporters.export(base, "case_v3_base.step"); cq.exporters.export(base, "case_v3_base.stl")
cq.exporters.export(lid,  "case_v3_tapa.step"); cq.exporters.export(lid,  "case_v3_tapa.stl")
assy = cq.Assembly()
assy.add(base, name="base", color=cq.Color(0.13,0.13,0.15))
assy.add(lid,  name="tapa", color=cq.Color(0.18,0.18,0.20))
try: assy.export("case_v3_ensamble.step")
except Exception: assy.save("case_v3_ensamble.step")
print("OK v3")
