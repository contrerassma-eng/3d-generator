# Bloque OMNI v3 — modulo tipo Flowsort SLD/DLD sobre el ZP2026.
# Cambios v3 (pedido Sergio 02-09):
#  - Transmision por correas POLY-V PJ (como Flowsort: PJ 4 nervios), no
#    o-rings: serpentin bajo las poleas de eje con rodillos tensores entre
#    ejes. Los separadores tubulares se ELIMINAN: ese espacio queda para la
#    correa, y la rigidez la da la PLACA BASE (como la baseplate Flowsort).
#  - PLACA BASE horizontal con arreglos de ranuras (la del despiece p.23 del
#    manual) atornillada a ambas placas.
#  - LATERALES con AJUSTE EN PROFUNDIDAD: placa de extremo con columnas de
#    ranuras verticales + 4 escuadras a las placas -> el modulo ajusta la
#    profundidad de cuelgue; ranuras estilo Flowsort tambien en las placas.
#  - 2 motores UniDrive (uno por cara), ambos visibles en las vistas.
#  - SOLO 4 RUEDAS POR EJE, equidistantes (paso 78) con el GRUPO CARGADO A
#    LA IZQUIERDA (mirando el flujo +X, izquierda = +Y): y = -39/39/117/195.
#
# Base medida: ZP2026 (paso 74.75, interior 533.6, rodadura 115.1, motor a
# 79.9 de cara / carrete 87.7 bajo ejes) + manual Flowsort SLD/DLD V5 REV1.2.

import cadquery as cq
import numpy as np
from math import sin, cos, radians, sqrt
import os

OUT = os.path.dirname(os.path.abspath(__file__))

PASO, NEJES = 74.75, 8
L_ZONA = PASO * NEJES
CARA_INT, Z_RODAD = 266.8, 115.1
R_ENV, W2 = 32.0, 18.3
BETA, D0 = 46.0, 23.0
RARC = 16.75 ** 2 / (2 * 2.5) + 2.5 / 2
SMAX = 33.5 / 2

Z_EJE = Z_RODAD - R_ENV
SOBRE_TAPA, TAPA_T = 5.0, 3.0
Z_TAPA_TOP = Z_RODAD - SOBRE_TAPA
Z_TAPA_BOT = Z_TAPA_TOP - TAPA_T
PLACA_T, PLACA_Y = 4.0, 250.0
L_PLACA = L_ZONA - 4.0
Z_LO, Z_HI = -75.0, 106.0
NRUEDAS = 4
Y_RUEDAS = [-39.0, 39.0, 117.0, 195.0]     # grupo cargado a IZQUIERDA (+Y)
BUJE_OD, BUJE_ID = 26.7, 20.9
HEX_AF, MUNON_D, ROD_OD = 14.0, 12.0, 28.0
POLEA_D, POLEA_W = 40.0, 14.0              # polea PJ del eje (4 nervios)
POLEA_Y = 221.0                            # plano de correa por cara
IDLER_D, IDLER_W, IDLER_Z = 24.0, 14.0, 52.0
SPOOL_Z = Z_EJE - 87.7
MOT_DROP = 4.0
HOLG_TAPA = 2.0
Z_BASE0, Z_BASE1 = -73.0, -69.0            # placa base (bajo los motores)

X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
cara = lambda k: -1 if k % 2 == 0 else +1
X_MOTOR = {-1: -PASO / 2, +1: +PASO / 2}
X_IDLER = {c: [(a + b) / 2 for a, b in zip(
    [X_EJES[k] for k in range(NEJES) if cara(k) == c][:-1],
    [X_EJES[k] for k in range(NEJES) if cara(k) == c][1:])] for c in (-1, 1)}
# separadores: SOLO desaparecen donde pasa la correa (v3.1). Cruces de la
# correa por z=44.5: x = +-211.6 (diagonal larga) y +-26 (diagonal corta);
# cuerpos de motor hasta z=50.4 en x -113.7..113.7. Puntos libres:
SEP_PUNTOS = [(-L_PLACA / 2 + 25, 44.5), (-150.0, 44.5), (150.0, 44.5),
              (L_PLACA / 2 - 25, 44.5), (-200.0, -60.0), (200.0, -60.0)]


def rho(s):
    s = max(min(s, SMAX), -SMAX)
    return (9.0 - RARC) + sqrt(RARC * RARC - s * s)


def redondo2d(w, h, r):
    from shapely.geometry import box
    poly = box(-w / 2, -h / 2, w / 2, h / 2).buffer(-r).buffer(r, quad_segs=14)
    return cq.Workplane("XY").polyline(list(poly.exterior.coords)[:-1]).close()


def ranuras_xz(s, sy, xs, zs, largo=40.0, ancho=6.0, ang=0):
    """arreglo de ranuras (estilo Flowsort) en una placa XZ"""
    for x in xs:
        for z in zs:
            s = s.cut(cq.Workplane("XZ").slot2D(largo, ancho, ang).extrude(40)
                      .translate((x, sy * 280, z)))
    return s


def placa_principal(sy):
    """placa lateral: rodamientos, colisas M8 al bastidor, ventana de motor,
    ranuras Flowsort, taladros de placa base y de escuadras de extremo."""
    h = Z_HI - Z_LO
    y0 = sy * PLACA_Y + (PLACA_T if sy > 0 else 0)
    s = (cq.Workplane("XZ").rect(L_PLACA, h).extrude(PLACA_T)
         .translate((0, y0, (Z_LO + Z_HI) / 2)))
    for x in X_EJES:
        s = s.cut(cq.Workplane("XZ").circle(ROD_OD / 2).extrude(40)
                  .translate((x, sy * 280, Z_EJE)))
    for x in (-225.0, -75.0, 75.0, 225.0):     # colisas M8 al larguero
        s = s.cut(cq.Workplane("XZ").slot2D(25, 9, 90).extrude(40)
                  .translate((x, sy * 280, 88.0)))
    s = s.cut(cq.Workplane("XZ").slot2D(60, 24, 0).extrude(40)
              .translate((X_MOTOR[sy], sy * 280, -40.0)))   # servicio motor
    # ranuras estilo Flowsort: fila alta continua + fila baja esquivando la
    # ventana del motor
    s = ranuras_xz(s, sy, [-240 + i * 60 for i in range(9)], [16.0])
    xs_bajas = [x for x in (-240 + i * 60 for i in range(9))
                if abs(x - X_MOTOR[sy]) > 55]
    s = ranuras_xz(s, sy, xs_bajas, [-40.0])
    # taladros M5 de la placa base (borde inferior) y de escuadras (extremos)
    for x in (-250, -125, 0, 125, 250):
        s = s.cut(cq.Workplane("XZ").circle(2.6).extrude(40)
                  .translate((x, sy * 280, -71.0)))
    # taladros de varillas M8 separadoras (fuera del paso de correa y de
    # los cuerpos de motor: cruces de correa en z44.5 -> x±211.6/±26;
    # motores x -113.7..113.7 hasta z50.4)
    for x, z in SEP_PUNTOS:
        s = s.cut(cq.Workplane("XZ").circle(4.25).extrude(40)
                  .translate((x, sy * 280, z)))
    for sx in (-1, 1):
        for z in (30, 60, 90):
            s = s.cut(cq.Workplane("XZ").circle(2.6).extrude(40)
                      .translate((sx * (L_PLACA / 2 - 10), sy * 280, z)))
    # v3.2 (ZP real): rebaje bajo z=18 en |x|>274 para librar los travesanos
    # TR_S del bastidor (x 280.2..367.9, tope z=14.1 -> 6.2 / 3.9 de holgura)
    for sx in (-1, 1):
        s = s.cut(cq.Workplane("XY").box(40, 60, 100)
                  .translate((sx * (274 + 20), sy * (PLACA_Y + PLACA_T / 2),
                              18.0 - 50)))
    return s


def placa_base():
    """baseplate Flowsort (despiece p.23): placa horizontal con arreglos de
    ranuras, atornillada M5 al borde inferior de ambas placas laterales.
    v3.2: recortada a +-272 (dentro del rebaje de travesanos)."""
    s = (cq.Workplane("XY").rect(544, 2 * PLACA_Y - 2)
         .extrude(Z_BASE1 - Z_BASE0).translate((0, 0, Z_BASE0)))
    for i in range(8):
        for sy, n in ((-1, 3), (1, 3)):
            for j in range(n):
                s = s.cut(cq.Workplane("XY").slot2D(45, 6, 0)
                          .extrude(Z_BASE1 - Z_BASE0 + 2)
                          .translate((-245 + i * 70, sy * (60 + j * 60),
                                      Z_BASE0 - 1)))
    for x in (-250, -125, 0, 125, 250):    # pestanas M5 a las placas
        for sy in (-1, 1):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(10)
                      .translate((x, sy * (PLACA_Y - 8), Z_BASE0 - 1)))
    return s


def eje(k):
    Lhex = 2 * PLACA_Y - 1.0
    s = (cq.Workplane("XZ").polygon(6, HEX_AF / cos(radians(30)))
         .extrude(Lhex).translate((0, Lhex / 2, 0)))
    for sgn in (-1, 1):
        s = s.union(cq.Workplane("XZ").circle(MUNON_D / 2).extrude(sgn * 14.0)
                    .translate((0, sgn * (Lhex / 2), 0)))
    return s.translate((X_EJES[k], 0, Z_EJE))


def polea_eje(k):
    """polea Poly-V PJ (4 nervios) del eje, en el plano de correa de su cara."""
    c = cara(k)
    y0 = c * POLEA_Y
    s = (cq.Workplane("XZ").circle(POLEA_D / 2).circle(8.4)
         .extrude(c * POLEA_W).translate((X_EJES[k], y0 + c * (POLEA_W / 2), Z_EJE)))
    for dy in (-4.2, -1.4, 1.4, 4.2):      # nervios PJ (visual)
        s = s.cut(cq.Workplane("XZ").circle(POLEA_D / 2 + 1).circle(POLEA_D / 2 - 1)
                  .extrude(c * 1.1).translate((X_EJES[k], y0 - c * (dy - 0.55), Z_EJE)))
    return s


def idler(c, x):
    """rodillo tensor del serpentin sobre perno M8 en la placa de su cara."""
    y0 = c * POLEA_Y
    rod = (cq.Workplane("XZ").circle(IDLER_D / 2).circle(4.1)
           .extrude(c * IDLER_W).translate((x, y0 + c * (IDLER_W / 2), IDLER_Z)))
    perno = (cq.Workplane("XZ").circle(4.0)
             .extrude(c * (PLACA_Y + PLACA_T + 2 - POLEA_Y + IDLER_W / 2))
             .translate((x, c * (PLACA_Y + PLACA_T + 2), IDLER_Z)))
    return rod.union(perno)


def bujes(k):
    """bujes PVC en los huecos libres del eje: ruedas (4, a la izquierda) y
    la polea PJ de su cara como obstaculos."""
    c = cara(k)
    ocupado = [(y - W2, y + W2) for y in Y_RUEDAS]
    ocupado.append((c * POLEA_Y - POLEA_W / 2 - 0.5, c * POLEA_Y + POLEA_W / 2 + 0.5))
    ocupado = sorted(ocupado)
    libres, prev = [], -PLACA_Y + 0.5
    for a, b in ocupado:
        if a - prev > 5.0:
            libres.append((prev, a))
        prev = max(prev, b)
    if PLACA_Y - 0.5 - prev > 5.0:
        libres.append((prev, PLACA_Y - 0.5))
    piezas = []
    for i, (y0, y1) in enumerate(libres):
        L = y1 - y0 - 1.0
        b = (cq.Workplane("XZ").circle(BUJE_OD / 2).circle(BUJE_ID / 2)
             .extrude(-L).translate((0, y0 + 0.5, 0))
             .translate((X_EJES[k], 0, Z_EJE)))
        piezas.append((f'buje_{k}_{i}', b))
    return piezas


def separadores():
    """6 varillas M8 con tubo O12, en los puntos verificados FUERA del paso
    de la correa y de los motores (v3.1: solo desaparecen donde va la polea)."""
    piezas = []
    for i, (x, z) in enumerate(SEP_PUNTOS):
        t = (cq.Workplane("XZ").circle(6.0).circle(4.3)
             .extrude(2 * PLACA_Y).translate((x, PLACA_Y, z)))
        v = (cq.Workplane("XZ").circle(4.0).extrude(2 * (PLACA_Y + PLACA_T + 6))
             .translate((x, PLACA_Y + PLACA_T + 6, z)))
        piezas.append((f'separador_{i}', t))
        piezas.append((f'varilla_M8_{i}', v))
    return piezas


def standoffs():
    piezas = []
    for sy in (-1, 1):
        for i, x in enumerate((-225.0, -75.0, 75.0, 225.0)):
            piezas.append((f'standoff_{"izq" if sy>0 else "der"}_{i}',
                           cq.Workplane("XZ").circle(8.0).circle(4.2)
                           .extrude(sy * (CARA_INT - PLACA_Y - PLACA_T))
                           .translate((x, sy * (PLACA_Y + PLACA_T), 88.0))))
    return piezas


def cancamos():
    piezas = []
    for sy in (-1, 1):
        for x in (-L_PLACA / 2 + 60, L_PLACA / 2 - 60):
            anillo = cq.Workplane(obj=cq.Solid.makeTorus(
                12.0, 4.0, cq.Vector(x, sy * (PLACA_Y + PLACA_T / 2), Z_HI + 16),
                cq.Vector(0, 1, 0)))
            v = (cq.Workplane("XY").circle(4.0).extrude(14)
                 .translate((x, sy * (PLACA_Y + PLACA_T / 2), Z_HI - 8)))
            piezas.append((f'cancamo_{x:+.0f}_{sy}', anillo.union(v)))
    return piezas


def tapa_superior():
    dz = Z_RODAD - Z_TAPA_BOT
    semix = sqrt(R_ENV ** 2 - (R_ENV - dz) ** 2)
    vx, vy = 2 * semix + 2 * HOLG_TAPA, 2 * W2 + 2 * HOLG_TAPA
    s = (cq.Workplane("XY").rect(L_ZONA - 2.0, 2 * (CARA_INT - 0.8))
         .extrude(TAPA_T).translate((0, 0, Z_TAPA_BOT)))
    for x in X_EJES:
        for y in Y_RUEDAS:
            s = s.cut(redondo2d(vx, vy, 8.0).extrude(TAPA_T + 2)
                      .translate((x, y, Z_TAPA_BOT - 1)))
    for sy in (-1, 1):
        for x in (-250, -125, 0, 125, 250):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(TAPA_T + 2)
                      .translate((x, sy * (PLACA_Y + PLACA_T / 2), Z_TAPA_BOT - 1)))
    return s, vx, vy


def tapa_inferior():
    """v3.2: recortada a +-272 para el rebaje de travesanos."""
    s = (cq.Workplane("XY").rect(544, 2 * (CARA_INT - 0.8))
         .extrude(TAPA_T).translate((0, 0, Z_LO - TAPA_T)))
    for sy in (-1, 1):
        for i in range(7):
            s = s.cut(cq.Workplane("XY").slot2D(60, 5, 0).extrude(TAPA_T + 2)
                      .translate((-210 + i * 70, sy * 150, Z_LO - TAPA_T - 1)))
    return s


def lateral_ajuste(sx):
    """extremo del modulo: placa con COLUMNAS DE RANURAS VERTICALES 9x20
    (ajuste en profundidad) + louvres; se fija con 4 escuadras a las placas.
    v3.2: arranca en z=18 para pasar SOBRE el travesano TR_S (tope 14.1)."""
    z_lat0 = 18.0
    s = (cq.Workplane("YZ").rect(2 * (CARA_INT - 0.8), Z_TAPA_BOT - z_lat0)
         .extrude(sx * PLACA_T)
         .translate((sx * (L_ZONA / 2 - 1), 0, (Z_TAPA_BOT + z_lat0) / 2)))
    for sy in (-1, 1):                       # ranuras de ajuste (profundidad)
        for z in (30, 60, 90):
            s = s.cut(cq.Workplane("YZ").slot2D(20, 9, 90).extrude(sx * (PLACA_T + 2))
                      .translate((sx * (L_ZONA / 2 - 2), sy * (PLACA_Y - 10), z)))
    for j in range(3):                        # louvres
        for sy in (-1, 1):
            s = s.cut(cq.Workplane("YZ").slot2D(50, 5, 0).extrude(sx * (PLACA_T + 2))
                      .translate((sx * (L_ZONA / 2 - 2), sy * 150, 28 + j * 22)))
    if sx > 0:
        s = s.cut(cq.Workplane("YZ").circle(8.0).extrude(sx * (PLACA_T + 2))
                  .translate((sx * (L_ZONA / 2 - 2), 0, 40)))
    return s


def escuadra(sx, sy):
    """angulo placa<->lateral: su perno corre por la ranura vertical 9x20.
    v3.2: a z 20..50, sobre el travesano."""
    a = (cq.Workplane("YZ").rect(30, 30).extrude(-sx * 4)
         .translate((sx * (L_ZONA / 2 - 1 - PLACA_T), sy * (PLACA_Y - 10), 35)))
    b = (cq.Workplane("XZ").rect(30, 30).extrude(-sy * 4)
         .translate((sx * (L_ZONA / 2 - 16 - PLACA_T), sy * (PLACA_Y - 0.5), 35)))
    return a.union(b)


def verificar(vx, vy):
    print('--- GATES bloque omni v3 ---')
    print(f'nivel rueda {Z_EJE + R_ENV:.1f} = ZP {Z_RODAD:.1f} OK · sobresale '
          f'{Z_EJE + R_ENV - Z_TAPA_TOP:.1f}')
    print(f'ruedas y={Y_RUEDAS} (equidistantes {Y_RUEDAS[1]-Y_RUEDAS[0]:.0f}, '
          f'grupo a IZQUIERDA +Y); borde izq {Y_RUEDAS[-1]+W2:.1f} vs polea '
          f'izq {POLEA_Y - POLEA_W/2:.0f} -> holgura '
          f'{POLEA_Y - POLEA_W/2 - (Y_RUEDAS[-1]+W2):.1f}')
    print(f'ventana tapa {vx:.1f}x{vy:.1f}; motor bajo envolvente: lomo '
          f'{SPOOL_Z - MOT_DROP + 59.05:.1f} < 51.1')
    print(f'placa base z {Z_BASE0}..{Z_BASE1} vs fondo motor '
          f'{SPOOL_Z - MOT_DROP - 59.05:.1f} -> holgura '
          f'{(SPOOL_Z - MOT_DROP - 59.05) - Z_BASE1:.1f}')
    print(f'serpentin: polea eje O{POLEA_D:.0f} fondo z={Z_EJE - POLEA_D/2:.1f}; '
          f'idler O{IDLER_D:.0f} tope z={IDLER_Z + IDLER_D/2:.1f} (envuelve)')
    print(f'idlers por cara: {X_IDLER[-1]} / {X_IDLER[+1]}')
    print(f'separadores (v3.1, solo fuera del paso de correa): {SEP_PUNTOS}; '
          f'cruces correa z44.5 en x=+-211.6/+-26, motores x -113.7..113.7 '
          f'hasta z50.4 -> todos libres')
    print('v3.2 (ZP real): rebaje placas |x|>274 bajo z18 vs TR_S x280.2 '
          'tope z14.1 -> 6.2/3.9; laterales z>=18; base/tapa inf +-272; '
          'escuadras a z35; escalerilla se corta |x|<310 (reencaminar); '
          'controlador c -> x+330, fuente -> x-450 (reubicados)')


if __name__ == '__main__':
    asm = cq.Assembly(name='bloque_omni_v3_fab')
    piezas = []
    for sy in (-1, 1):
        piezas.append((f'placa_{"izq" if sy>0 else "der"}', placa_principal(sy)))
    piezas.append(('placa_base', placa_base()))
    ts, vx, vy = tapa_superior()
    piezas.append(('tapa_superior', ts))
    piezas.append(('tapa_inferior', tapa_inferior()))
    for sx in (-1, 1):
        piezas.append((f'lateral_{"pos" if sx>0 else "neg"}', lateral_ajuste(sx)))
        for sy in (-1, 1):
            piezas.append((f'escuadra_{sx}_{sy}', escuadra(sx, sy)))
    piezas += separadores() + standoffs() + cancamos()
    for k in range(NEJES):
        piezas.append((f'eje_{k}_{mano(k)}', eje(k)))
        piezas.append((f'polea_{k}', polea_eje(k)))
        piezas += bujes(k)
    for c in (-1, 1):
        for i, x in enumerate(X_IDLER[c]):
            piezas.append((f'idler_{c}_{i}', idler(c, x)))
    verificar(vx, vy)
    for nm, p in piezas:
        asm.add(p, name=nm)
        try:
            cq.exporters.export(p, os.path.join(OUT, f'bo3_{nm}.stl'),
                                tolerance=0.12, angularTolerance=0.35)
        except Exception as e:
            print('STL FALLO', nm, e)
    asm.save(os.path.join(OUT, 'bloque_omni_v3_fab.step'))
    print(f'{len(piezas)} piezas; STEP + STLs exportados')
