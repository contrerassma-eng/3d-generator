# Omni48-R: rueda omnidireccional doble de 2 placas tri-brazo (como la comercial
# de Ø48 con 3 rodillos barril por fila) + RODAMIENTO CAZADO EN EL PLANO MEDIO,
# atrapado entre las dos placas al atornillarlas.
#
# Parametrico (CadQuery). Por defecto:
#   D=48, 3 rodillos/fila (6 en total), rodamiento 688-2Z (8x16x5) al centro,
#   3 tornillos M3x20 + tuerca en las rendijas entre rodillos, pasadores Ø3x30.
#
# Salidas: omni48_placa_A/B (.step/.stl), omni48_rodillo (.step/.stl),
#          omni48_ensamble.step (ensamble posicionado con rodamiento y herrajes)

import cadquery as cq
from math import sin, cos, tan, atan, radians, degrees, sqrt
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ----------------------------- parametros ------------------------------------
R = 24.0            # radio exterior de la rueda (Ø48)
N = 3               # rodillos por fila
RHO0 = 7.0          # radio del rodillo en su centro
D_PIN = R - RHO0    # radio primitivo de los ejes de rodillo (17.0)
L_ROD = 20.0        # largo del rodillo
ZROW = 5.5          # plano de cada fila
W2 = 12.5           # semiancho de la rueda (ancho total 25)
PIN_D = 3.2         # taladro del pasador Ø3
ROD_BORE = 3.3
CLR = 0.8           # holgura radial placa-rodillo

BRG_OD, BRG_ID, BRG_W = 16.0, 8.0, 5.0    # 688-2Z
POCKET_D = BRG_OD + 0.15
CORE_D = 28.0
BORE_D = 9.5
SCREW_R = 10.5      # circulo de tornillos M3 (en las rendijas: 30/150/270)
SCREW_D = 3.4
CB_D, CB_H = 6.4, 3.5          # caja cabeza M3 cilindrica
NUT_AF, NUT_H = 5.7, 4.1       # alojamiento tuerca M3

ROW_A = [0, 120, 240]
ROW_B = [60, 180, 300]
SCREWS = [30, 150, 270]
ARM_HALF = 23.0     # semiangulo del brazo (centrado entre sus rodillos)

def rot(w, a):
    return w.rotate((0, 0, 0), (0, 0, 1), a)

def ring(r_in, r_out, h0, h1):
    return (cq.Workplane("XY").circle(r_out).circle(r_in)
            .extrude(h1 - h0).translate((0, 0, h0)))

def wedge(a0, a1, h0, h1, R120=120):
    pts = [(0, 0)] + [(R120 * cos(radians(a)), R120 * sin(radians(a)))
                      for a in [a0 + i * (a1 - a0) / 8 for i in range(9)]]
    return (cq.Workplane("XY").polyline(pts).close()
            .extrude(h1 - h0).translate((0, 0, h0)))

def rho(x):
    # perfil esferico: la silueta de la rueda queda EXACTAMENTE en R
    return sqrt(R * R - x * x) - D_PIN

# ----------------------------- rodillo ---------------------------------------
def rodillo(extra_r=0.0, extra_l=0.0, bore=True):
    """barril de revolucion; eje = Y, centrado; extra_* para herram. de holgura"""
    h = L_ROD / 2 + extra_l
    xs = [-h + i * (2 * h) / 24 for i in range(25)]
    pts = [(max(rho(min(max(x, -L_ROD/2), L_ROD/2)) + extra_r, 0.6), x) for x in xs]
    prof = [(0.01, -h)] + pts + [(0.01, h)]
    s = (cq.Workplane("XZ").polyline(prof).close()
         .revolve(360, (0, 0, 0), (0, 1, 0)))          # eje = Z global
    s = s.rotate((0, 0, 0), (1, 0, 0), 90)             # eje -> Y
    if bore and not extra_r:
        b = cq.Workplane(obj=cq.Solid.makeCylinder(
            ROD_BORE / 2, 60, cq.Vector(0, -30, 0), cq.Vector(0, 1, 0)))
        s = s.cut(b)
    return s

def place_roller(w, ang, zc):
    """lleva un solido construido con eje Y a su posicion de rodillo"""
    return rot(w.translate((D_PIN, 0, 0)), ang).translate((0, 0, zc))

# ----------------------------- placa -----------------------------------------
def placa(rows, fastener):
    """placa que ocupa z -W2..0; rows = angulos de SU fila (z=-ZROW);
       fastener: 'cb' (cajas de cabeza) o 'nut' (alojamientos de tuerca)"""
    # nucleo + cara
    s = cq.Workplane("XY").circle(CORE_D / 2).extrude(W2).translate((0, 0, -W2))
    # brazos en Y estilo tri-pala: 2 radios redondos por brazo hacia los
    # tetones de pasador + arco de punta + pala en la cara exterior
    def beam(p0, p1, d):
        v = cq.Vector(p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2])
        return cq.Workplane(obj=cq.Solid.makeCylinder(
            d/2, v.Length, cq.Vector(*p0), v.normalized()))
    def pol(rr, y):
        c, sn = cos(radians(rr)), sin(radians(rr))
        return (D_PIN*c - y*sn, D_PIN*sn + y*c)
    for rc in rows:
        a = (rc + 60) % 360
        p0 = (12.0*cos(radians(a)), 12.0*sin(radians(a)), -ZROW)
        for rr, t in ((rc, 1), ((rc + 120) % 360, -1)):
            y0 = t * (L_ROD / 2 + 0.6)
            # teton del pasador
            boss = cq.Workplane(obj=cq.Solid.makeCylinder(
                3.4, 3.6, cq.Vector(D_PIN, y0, -ZROW), cq.Vector(0, t, 0)))
            s = s.union(rot(boss, rr))
            # radio redondo del cubo al teton
            bx, by = pol(rr, y0 + t*1.8)
            s = s.union(beam(p0, (bx, by, -ZROW), 7.0))
        # arco de punta entre los dos tetones
        tip = (ring(19.6, 23.3, -8.8, -2.2)
               .intersect(wedge(a - 25.5, a + 25.5, -8.8, -2.2)))
        s = s.union(tip)
        # pala de la cara exterior (aspecto tri-estrella de la comercial)
        blade = (ring(9.0, 22.0, -W2, -W2 + 2.2)
                 .intersect(wedge(a - 17, a + 17, -W2, -W2 + 2.2)))
        s = s.union(blade)
    # recorte de envolvente exterior
    s = s.intersect(cq.Workplane("XY").circle(R - 0.5).extrude(W2).translate((0, 0, -W2)))
    # holgura de TODOS los rodillos (ambas filas)
    for rc in rows:
        s = s.cut(place_roller(rodillo(extra_r=CLR, extra_l=0.7, bore=False), rc, -ZROW))
    for rc in [(r0 + 60) % 360 for r0 in rows]:
        s = s.cut(place_roller(rodillo(extra_r=CLR, extra_l=0.7, bore=False), rc, +ZROW))
    # taladros de pasador (linea de cuerda de su propia fila)
    for rc in rows:
        drill = cq.Workplane(obj=cq.Solid.makeCylinder(
            PIN_D / 2, 44, cq.Vector(D_PIN, -22, -ZROW), cq.Vector(0, 1, 0)))
        s = s.cut(rot(drill, rc))
    # rodamiento cazado al medio + taladro del eje
    s = s.cut(cq.Workplane("XY").circle(POCKET_D / 2).extrude(BRG_W / 2 + 0.05)
              .translate((0, 0, -BRG_W / 2 - 0.05)))
    s = s.cut(cq.Workplane("XY").circle(13.6 / 2).extrude(BRG_W / 2 + 0.45)
              .translate((0, 0, -BRG_W / 2 - 0.45)))
    s = s.cut(cq.Workplane("XY").circle(BORE_D / 2).extrude(2 * W2)
              .translate((0, 0, -W2)))
    # tornillos
    for a in SCREWS:
        x, y = SCREW_R * cos(radians(a)), SCREW_R * sin(radians(a))
        s = s.cut(cq.Workplane("XY").circle(SCREW_D / 2).extrude(2 * W2)
                  .translate((x, y, -W2)))
        if fastener == 'cb':
            s = s.cut(cq.Workplane("XY").circle(CB_D / 2).extrude(CB_H + 0.01)
                      .translate((x, y, -W2 - 0.01)))
        else:
            s = s.cut(cq.Workplane("XY").polygon(6, NUT_AF / cos(radians(30)))
                      .extrude(NUT_H + 0.01).translate((x, y, -W2 - 0.01)))
    return s

def placa_B():
    """placa espejo: se construye con su propia fila (60/180/300) y se espeja
       en XY -> ocupa z 0..W2 con la fila en +ZROW y tornillos en 30/150/270"""
    return placa(ROW_B, 'nut').mirror(mirrorPlane="XY")

# ------- herrajes simplificados para el STEP de ensamble ----------------------
def rodamiento():
    outer = (cq.Workplane("XY").circle(BRG_OD/2).circle(BRG_OD/2-1.6).extrude(BRG_W))
    inner = (cq.Workplane("XY").circle(BRG_ID/2+1.55).circle(BRG_ID/2).extrude(BRG_W))
    shield = (cq.Workplane("XY").circle(BRG_OD/2-1.6).circle(BRG_ID/2+1.55)
              .extrude(0.7).translate((0,0,0.6)))
    shield2 = shield.translate((0,0,BRG_W-1.9))
    return outer.union(inner).union(shield).union(shield2).translate((0,0,-BRG_W/2))

def tornillo_m3():
    return (cq.Workplane("XY").circle(1.5).extrude(20)
            .union(cq.Workplane("XY").circle(2.7).extrude(3).translate((0,0,-3))))

def tuerca_m3():
    return (cq.Workplane("XY").polygon(6, 5.5/cos(radians(30))).extrude(2.4)
            .cut(cq.Workplane("XY").circle(1.5).extrude(2.4)))

def pasador():
    return cq.Workplane(obj=cq.Solid.makeCylinder(
        1.5, 28, cq.Vector(0, -14, 0), cq.Vector(0, 1, 0)))

# ----------------------------- main ------------------------------------------
if __name__ == '__main__':
    pa = placa(ROW_A, 'cb')
    pb = placa_B()
    rod = rodillo()

    for n, s in [('omni48_placa_A', pa), ('omni48_placa_B', pb),
                 ('omni48_rodillo', rod)]:
        print(f"{n:18s} vol={s.val().Volume()/1000:6.2f} cm3")
        cq.exporters.export(s, os.path.join(OUT, n + '.step'))
        cq.exporters.export(s, os.path.join(OUT, n + '.stl'),
                            tolerance=0.03, angularTolerance=0.25)

    asm = cq.Assembly(name="Omni48R")
    asm.add(pa, name="placa_A", color=cq.Color(0.75, 0.75, 0.78))
    asm.add(pb, name="placa_B", color=cq.Color(0.75, 0.75, 0.78))
    for i, a in enumerate(ROW_A):
        asm.add(rod, name=f"rodillo_A{i}", color=cq.Color(0.12, 0.12, 0.13),
                loc=cq.Location(cq.Vector(D_PIN*cos(radians(a)), D_PIN*sin(radians(a)), -ZROW),
                                cq.Vector(0, 0, 1), a))
    for i, a in enumerate(ROW_B):
        asm.add(rod, name=f"rodillo_B{i}", color=cq.Color(0.12, 0.12, 0.13),
                loc=cq.Location(cq.Vector(D_PIN*cos(radians(a)), D_PIN*sin(radians(a)), +ZROW),
                                cq.Vector(0, 0, 1), a))
    asm.add(rodamiento(), name="rodamiento_688_2Z", color=cq.Color(0.65, 0.65, 0.67))
    for i, a in enumerate(SCREWS):
        x, y = SCREW_R*cos(radians(a)), SCREW_R*sin(radians(a))
        asm.add(tornillo_m3(), name=f"M3x20_{i}", color=cq.Color(0.3, 0.3, 0.32),
                loc=cq.Location(cq.Vector(x, y, -W2+CB_H)))
        asm.add(tuerca_m3(), name=f"tuerca_M3_{i}", color=cq.Color(0.3, 0.3, 0.32),
                loc=cq.Location(cq.Vector(x, y, W2-NUT_H+0.1)))
    for i, a in enumerate(ROW_A):
        asm.add(pasador(), name=f"pasador_A{i}", color=cq.Color(0.55, 0.55, 0.58),
                loc=cq.Location(cq.Vector(D_PIN*cos(radians(a)), D_PIN*sin(radians(a)), -ZROW),
                                cq.Vector(0, 0, 1), a))
    for i, a in enumerate(ROW_B):
        asm.add(pasador(), name=f"pasador_B{i}", color=cq.Color(0.55, 0.55, 0.58),
                loc=cq.Location(cq.Vector(D_PIN*cos(radians(a)), D_PIN*sin(radians(a)), +ZROW),
                                cq.Vector(0, 0, 1), a))
    asm.save(os.path.join(OUT, 'omni48_ensamble.step'))
    print('ensamble STEP exportado')
