# Rueda V7-L — aligerado paramétrico de Polea y Separador (vaciados + nervios)
# Reconstruido desde mediciones directas del STEP Rueda_V7 (Inventor 2027).
#
# Interfaces conservadas exactamente:
#  - garganta de O-ring: fondo Ø55 (z7..13), pestañas Ø65, flancos trompeta
#  - lengüetas de arco Ø41.2/Ø31.6 × 39° a ±45/±135 (pilotan el anillo lobulado
#    y encajan en el trébol del separador)
#  - taladros M5: Ø5.5 (z0..4.5) + caja Ø9, círculo Ø28, a 0/90/180/270
#  - cavidad interna Ø37 z7..11 (ya existía en el original)
#  - bolsillo de rodamiento: 6004 -> Ø42.2 x12 ; 608 -> Ø22.15 x7.3
#  - separador: trébol R20.7/R15.5, largo 35, taladro Ø16.4, porta-tuercas 8.4
#
# Variantes de polea:
#   '6004' -> rodamiento original SKF 6004-2Z (20x42x12)
#   '608'  -> rodamiento 608-2Z (8x22x7): mismo plástico aprox, -114 g de acero
#             por rueda y rodamientos mucho más baratos; el eje pasa a Ø8 (M8)
#
# Uso: python rueda_v7L.py  -> exporta STEP+STL y reporta volúmenes

import cadquery as cq
from math import sin, cos, radians
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ------------------------------------------------------------------ helpers
def wedge(a0, a1, h0, h1, R=120):
    pts = [(0, 0)] + [(R * cos(radians(a)), R * sin(radians(a)))
                      for a in [a0 + i * (a1 - a0) / 8 for i in range(9)]]
    return (cq.Workplane("XY").polyline(pts).close()
            .extrude(h1 - h0).translate((0, 0, h0)))

def ring(r_in, r_out, h0, h1):
    return (cq.Workplane("XY").circle(r_out).circle(r_in)
            .extrude(h1 - h0).translate((0, 0, h0)))

def radial_box(width, r0, r1, h0, h1, ang):
    b = (cq.Workplane("XY")
         .rect(r1 - r0, width).extrude(h1 - h0)
         .translate(((r0 + r1) / 2, 0, h0)))
    return b.rotate((0, 0, 0), (0, 0, 1), ang)

def boss_cyl(d, r_pos, ang, h0, h1):
    return (cq.Workplane("XY").circle(d / 2).extrude(h1 - h0)
            .translate((r_pos * cos(radians(ang)), r_pos * sin(radians(ang)), h0)))

# perfil exterior medido (r, z): z=0 cara interna (lado anillo), z=23 cara exterior
PERFIL_EXT = [
    (32.5, 0.0), (32.5, 3.0), (32.3, 4.0), (31.8, 4.5), (30.5, 5.0),
    (28.0, 5.5), (27.68, 6.0), (27.52, 6.5), (27.5, 7.0),
    (27.5, 13.0), (27.55, 13.5), (28.0, 14.0), (28.4, 14.5), (30.78, 15.0),
    (31.8, 15.5), (32.2, 16.0), (32.48, 16.5), (32.5, 17.0),
    (32.5, 19.5), (26.9, 20.0), (26.2, 20.5), (26.1, 21.5), (25.1, 23.0),
]

def polea(variant='6004', aligerar=True):
    if variant == '6004':
        inner = [(21.1, 23.0), (21.1, 11.0),               # bolsillo Ø42.2 x12
                 (18.5, 11.0), (18.5, 7.0), (9.5, 7.0),    # cavidad Ø37 original
                 (9.5, 5.0), (8.25, 5.0)]
    else:  # 608-2Z: bolsillo pequeño al fondo, se conservan las cavidades
        inner = [(11.075, 23.0), (11.075, 15.7),           # bolsillo Ø22.15 x7.3
                 (21.1, 15.7), (21.1, 11.0),               # cavidad Ø42.2 z11..15.7
                 (18.5, 11.0), (18.5, 7.0), (9.5, 7.0),
                 (9.5, 5.0), (8.25, 5.0)]
    prof = [(8.25, 0.0)] + PERFIL_EXT + inner
    body = (cq.Workplane("XZ").polyline(prof).close()
            .revolve(360, (0, 0, 0), (0, 1, 0)))

    # lengüetas de arco a ±45/±135, span 39° (z -8..0)
    lugs = None
    for a in (45, 135, 225, 315):
        piece = ring(15.8, 20.6, -8.0, 0.0).intersect(
            wedge(a - 19.5, a + 19.5, -8.0, 0.0))
        lugs = piece if lugs is None else lugs.union(piece)
    body = body.union(lugs)

    # taladros M5 en circulo r14: Ø5.5 z0..4.5, caja Ø9 z4.5..7 (asiento cabeza)
    for a in (0, 90, 180, 270):
        body = body.cut(boss_cyl(5.5, 14, a, -9.0, 4.5))
        body = body.cut(boss_cyl(9.0, 14, a, 4.5, 7.01))
        if variant == '608':
            # acceso de llave/cabeza a traves de la cara exterior (el bolsillo
            # Ø22.15 ya no deja llegar a r14)
            body = body.cut(boss_cyl(9.5, 14, a, 15.69, 24.0))
    if not aligerar:
        return body

    # ---------------- vaciados + nervios ----------------
    # celdas abiertas hacia la cara interna (arriba en la orientacion de
    # impresion bolsillo-abajo: sin soportes)
    cells = ring(12.0, 24.5, 0.0, 9.0)
    keep = None
    for a in (0, 90, 180, 270):                 # torres de tornillo Ø12
        k = boss_cyl(12.0, 14, a, 0.0, 9.0)
        keep = k if keep is None else keep.union(k)
    for a in (45, 135, 225, 315):               # columnas bajo lengüetas
        keep = keep.union(ring(15.5, 20.9, 0.0, 9.0)
                          .intersect(wedge(a - 20.5, a + 20.5, 0.0, 9.0)))
    for a in [22.5 + 45 * i for i in range(8)]:  # 8 nervios radiales 2.0
        keep = keep.union(radial_box(2.0, 11.5, 31.0, 0.0, 9.0, a))
    body = body.cut(cells.cut(keep))

    # celdas someras bajo la pestaña interior Ø65 (z0..3, techo 1.5 al flanco)
    cells_f = ring(24.5, 30.4, 0.0, 3.0)
    keep_f = None
    for a in [22.5 + 45 * i for i in range(8)]:
        k = radial_box(2.0, 24.0, 31.0, 0.0, 3.0, a)
        keep_f = k if keep_f is None else keep_f.union(k)
    body = body.cut(cells_f.cut(keep_f))

    if variant == '608':
        # celdas en el anillo que rodea al bolsillo pequeño (abiertas a la cara
        # exterior = cama de impresion: imprimen como paredes, sin soporte)
        cells2 = ring(13.7, 20.9, 15.7, 23.0)
        keep2 = None
        for a in (0, 90, 180, 270):
            k = boss_cyl(12.5, 14, a, 15.7, 23.0)
            keep2 = k if keep2 is None else keep2.union(k)
        for a in (45, 135, 225, 315):
            keep2 = keep2.union(radial_box(2.0, 13.0, 21.5, 15.7, 23.0, a))
        body = body.cut(cells2.cut(keep2))
    return body


def separador(aligerar=True):
    L = 35.0
    base = cq.Workplane("XY").circle(20.7).extrude(L)
    for a in (45, 135, 225, 315):               # rebajes R15.5 (pista de lengüetas)
        base = base.cut(ring(15.5, 60.0, 0.0, L)
                        .intersect(wedge(a - 21, a + 21, 0.0, L)))
    base = base.cut(cq.Workplane("XY").circle(8.2).extrude(L))   # taladro Ø16.4
    for a in (0, 90, 180, 270):                 # taladros M5 pasantes
        base = base.cut(boss_cyl(5.5, 14, a, -1.0, L + 1.0))
    # porta-tuercas: las dos filas originales (8.4 x 4.15) fusionadas en una
    # ventana alta 8.85..26.15 -> mismas caras de apoyo de tuerca, menos material
    for a in (0, 90, 180, 270):
        w = (cq.Workplane("XY").rect(12.0, 8.4).extrude(26.15 - 8.85)
             .translate((15.0, 0, 8.85))
             .rotate((0, 0, 0), (0, 0, 1), a))
        base = base.cut(w)
    if not aligerar:
        return base
    # vaciados pasantes alrededor del tubo del eje + 4 nervios diagonales
    cells = ring(10.6, 13.5, 0.0, L)
    for a in (0, 90, 180, 270):
        cells = cells.cut(boss_cyl(12.0, 14, a, 0.0, L))
    for a in (45, 135, 225, 315):
        cells = cells.cut(radial_box(2.0, 10.0, 14.0, 0.0, L, a))
    return base.cut(cells)


def separador_original():
    """referencia fiel: dos filas de ventanas separadas"""
    L = 35.0
    base = cq.Workplane("XY").circle(20.7).extrude(L)
    for a in (45, 135, 225, 315):
        base = base.cut(ring(15.5, 60.0, 0.0, L)
                        .intersect(wedge(a - 21, a + 21, 0.0, L)))
    base = base.cut(cq.Workplane("XY").circle(8.2).extrude(L))
    for a in (0, 90, 180, 270):
        base = base.cut(boss_cyl(5.5, 14, a, -1.0, L + 1.0))
    for a in (0, 90, 180, 270):
        for z0 in (8.85, 22.0):
            w = (cq.Workplane("XY").rect(12.0, 8.4).extrude(4.15)
                 .translate((15.0, 0, z0)).rotate((0, 0, 0), (0, 0, 1), a))
            base = base.cut(w)
    return base


def espaciador_eje_608(largo=66.4):
    """tubo Ø12/Ø8.3 entre aros interiores de los dos 608 (eje M8)"""
    return cq.Workplane("XY").circle(6.0).circle(4.15).extrude(largo)


if __name__ == '__main__':
    jobs = {
        'polea_original_ref': (polea('6004', aligerar=False), False),
        'polea_v7L_6004': (polea('6004'), True),
        'polea_v7L_608': (polea('608'), True),
        'separador_original_ref': (separador_original(), False),
        'separador_v7L': (separador(), True),
        'espaciador_eje_608': (espaciador_eje_608(), True),
    }
    for name, (s, export) in jobs.items():
        v = s.val().Volume() / 1000.0
        print(f"{name:24s} vol={v:7.2f} cm3")
        if export:
            cq.exporters.export(s, os.path.join(OUT, name + '.step'))
            cq.exporters.export(s, os.path.join(OUT, name + '.stl'),
                                tolerance=0.03, angularTolerance=0.2)
    print('done')
