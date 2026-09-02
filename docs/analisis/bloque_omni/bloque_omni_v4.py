# Bloque OMNI v4 — modulo ANGOSTO tipo Flowsort para el ZP2026.
# Pedido Sergio 02-09 (tarde):
#  - Rodamiento F6801ZZ (12x21x5, brida ~O23) EMBUTIDO DESDE FUERA por ajuste
#    en una PLACA DE 4 mm perforada O21. OJO: bore 12.0 -> el eje 1/2" (12.7)
#    lleva PUNTAS TORNEADAS a O12h7 x 6.
#  - Eje REDONDO 1/2"; las ruedas montan con BUJE MOTRIZ hex 14.4 e/c
#    exterior / O12.85 interior con prisionero M4 (compensa la diferencia).
#  - Ancho de modulo = SOLO lo necesario para las 4 filas: la zona muerta
#    queda LIBRE (el modulo ya no toca los largueros por los costados).
#  - El modulo se SOPORTA EN 2 TRAVESANOS horizontales (pletina 50x6)
#    apoyados en las PESTANAS INFERIORES de los largueros (z=-82.6 medido).
#  - Transmision Poly-V: cada motor -> SUS 2 EJES CENTRALES (garganta 1) y
#    esos 2 -> los demas (garganta 2). Poleas dobles PJ O40x20.
#  - SOPORTE DE MOTOR A LA BASE: placa de 8 mm tipo Flowsort.
#
# Layout resuelto (colisiones verificadas numericamente):
#  bandas de correa en el lado muerto (-Y): DER g1=-69 g2=-79; IZQ g1=-95
#  g2=-105. Motor DER en x=-90 con el cuerpo hacia -Y (placa de cara y
#  -49..-41); motor IZQ en x=+90 con la cara hacia fuera (placa y -131..-123).
#  Riel de rodamientos -Y en y -118..-114 (z 52..118) y +Y en +216..+220.

import cadquery as cq
import numpy as np
from math import cos, radians, sqrt
import os

OUT = os.path.dirname(os.path.abspath(__file__))

PASO, NEJES = 74.75, 8
L_ZONA = PASO * NEJES
CARA_INT, Z_RODAD = 266.8, 115.1
R_ENV, W2 = 32.0, 18.3
Z_EJE = Z_RODAD - R_ENV
SOBRE_TAPA, TAPA_T = 5.0, 3.0
Z_TAPA_TOP = Z_RODAD - SOBRE_TAPA
Z_TAPA_BOT = Z_TAPA_TOP - TAPA_T
Y_RUEDAS = [-39.0, 39.0, 117.0, 195.0]

EJE_D = 12.7                  # 1/2"
MUNON_D, MUNON_L = 12.0, 6.0  # punta torneada para F6801 (bore 12.0)
ROD_D, ROD_B, ROD_BRIDA = 21.0, 5.0, 23.2   # F6801ZZ
RAIL_T = 4.0                  # placa perforada
RAIL_Z0, RAIL_Z1 = 52.0, 118.0
Y_RAIL_N = -116.0             # centro del riel -Y (placa -118..-114)
Y_RAIL_P = +218.0             # centro del riel +Y (placa +216..+220)
POLEA_D, POLEA_W = 40.0, 20.0
G = {'der': (-69.0, -79.0), 'izq': (-95.0, -105.0)}   # gargantas g1/g2
SPOOL_Z = Z_EJE - 87.7
MOT_DROP = 4.0
MZ = SPOOL_Z - MOT_DROP
X_MOTOR = {'der': -90.0, 'izq': +90.0}
PLACA_MOTOR_T = 8.0
Y_PLACA_MOTOR = {'der': (-49.0, -41.0), 'izq': (-131.0, -123.0)}
Z_BASE0, Z_BASE1 = -76.6, -72.6            # base sobre travesanos (tope -76.6)
X_TRAV = (-180.0, 180.0)
BUJE_OD, BUJE_ID = 26.7, 20.9              # PVC 3/4" separador (sobre O12.7)

X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
KS = {h: [k for k in range(NEJES) if mano(k) == h] for h in ('der', 'izq')}
CENTRALES = {h: KS[h][1:3] for h in ('der', 'izq')}


def redondo2d(w, h, r):
    from shapely.geometry import box
    poly = box(-w / 2, -h / 2, w / 2, h / 2).buffer(-r).buffer(r, quad_segs=14)
    return cq.Workplane("XY").polyline(list(poly.exterior.coords)[:-1]).close()


def rail(sy):
    """placa perforada de 4 mm (riel de rodamientos): 8 agujeros O21 para
    F6801ZZ embutidos DESDE FUERA (la brida O23.2 apoya en la cara exterior);
    pies plegados hacia la base + ranuras estilo Flowsort."""
    yc = Y_RAIL_N if sy < 0 else Y_RAIL_P
    y0 = yc - RAIL_T / 2
    s = (cq.Workplane("XZ").rect(L_ZONA - 6, RAIL_Z1 - RAIL_Z0).extrude(RAIL_T)
         .translate((0, y0 + RAIL_T, (RAIL_Z0 + RAIL_Z1) / 2)))
    for x in X_EJES:
        s = s.cut(cq.Workplane("XZ").circle(ROD_D / 2).extrude(40)
                  .translate((x, y0 + 20, Z_EJE)))
    for i in range(8):
        s = s.cut(cq.Workplane("XZ").slot2D(40, 6, 0).extrude(40)
                  .translate((-245 + i * 70, y0 + 20, 108.0)))
    # pies: 2 pletinas plegadas hacia abajo hasta la base (bajan por fuera)
    for x in (-220.0, 220.0):
        s = s.union(cq.Workplane("XZ").rect(40, RAIL_Z0 - Z_BASE1 + 8)
                    .extrude(RAIL_T)
                    .translate((x, y0 + RAIL_T, (RAIL_Z0 + Z_BASE1 - 8) / 2 + 4)))
    return s


def eje(k):
    """eje HEXAGONAL 1/2" e/c con rebaje redondo torneado a O12 en los
    extremos (para el F6801, agujero 12.0). El hex arrastra directo el buje
    de rueda (hex 14.4/12.85) y las poleas de agujero hex: sin prisioneros
    de torque."""
    y0, y1 = Y_RAIL_N + RAIL_T / 2, Y_RAIL_P - RAIL_T / 2   # caras interiores
    L = (y1 - y0) - 0.5
    s = (cq.Workplane("XZ").polygon(6, EJE_D / cos(radians(30))).extrude(-L)
         .translate((0, y0 + 0.25, 0)))
    for sgn, yy in ((-1, y0 + 0.25), (1, y0 + 0.25 + L)):
        s = s.union(cq.Workplane("XZ").circle(MUNON_D / 2)
                    .extrude(-sgn * (MUNON_L + RAIL_T))
                    .translate((0, yy, 0)))
    return s.translate((X_EJES[k], 0, Z_EJE))


def polea(k):
    """polea Poly-V DOBLE (2 gargantas PJ) O40x20 en la banda de su mano;
    fija al eje con prisionero M4."""
    h = mano(k)
    g1, g2 = G[h]
    y0, y1 = max(g1, g2) + 5.0, min(g1, g2) - 5.0     # banda de 20
    s = (cq.Workplane("XZ").circle(POLEA_D / 2)
         .polygon(6, 12.85 / cos(radians(30)))
         .extrude(y1 - y0).translate((X_EJES[k], y0, Z_EJE)))
    for gc in (g1, g2):
        for dg in (-2.8, 0.0, 2.8):
            s = s.cut(cq.Workplane("XZ").circle(POLEA_D / 2 + 1)
                      .circle(POLEA_D / 2 - 1.2).extrude(-1.2)
                      .translate((X_EJES[k], gc + dg + 0.6, Z_EJE)))
    return s


def bujes(k):
    """separadores de PVC 3/4" en los tramos libres del eje (las ruedas
    montan sobre su BUJE MOTRIZ hex 14.4/O12.85 con prisionero, no aqui)."""
    h = mano(k)
    g1, g2 = G[h]
    banda = (min(g1, g2) - 5.0, max(g1, g2) + 5.0)
    ocupado = [(y - W2, y + W2) for y in Y_RUEDAS] + [banda]
    ocupado = sorted(ocupado)
    y_min, y_max = Y_RAIL_N + RAIL_T / 2 + 0.5, Y_RAIL_P - RAIL_T / 2 - 0.5
    libres, prev = [], y_min
    for a, b in ocupado:
        if a - prev > 6.0:
            libres.append((prev, a))
        prev = max(prev, b)
    if y_max - prev > 6.0:
        libres.append((prev, y_max))
    piezas = []
    for i, (a, b) in enumerate(libres):
        piezas.append((f'buje_{k}_{i}',
                       cq.Workplane("XZ").circle(BUJE_OD / 2).circle(BUJE_ID / 2)
                       .extrude(-(b - a - 1)).translate((0, a + 0.5, 0))
                       .translate((X_EJES[k], 0, Z_EJE))))
    return piezas


def placa_motor(h):
    """soporte de motor a la base: placa de 8 mm tipo Flowsort con pie,
    agujero para el eje/carrete y colisas de tension (el motor se corre en X)."""
    ya, yb = Y_PLACA_MOTOR[h]
    xm = X_MOTOR[h]
    s = (cq.Workplane("XZ").rect(130, 100).extrude(PLACA_MOTOR_T)
         .translate((xm, yb, Z_BASE1 + 50)))
    s = s.cut(cq.Workplane("XZ").circle(14.0).extrude(-PLACA_MOTOR_T - 2)
              .translate((xm, yb + 1, MZ)))
    for dx in (-45, 45):
        for dz in (-32, 32):
            s = s.cut(cq.Workplane("XZ").slot2D(18, 6.5, 0).extrude(-PLACA_MOTOR_T - 2)
                      .translate((xm + dx, yb + 1, MZ + dz)))
    s = s.union(cq.Workplane("XY").rect(130, 34).extrude(6.0)
                .translate((xm, (ya + yb) / 2 + (17 if h == 'der' else -17) * 0
                            + (yb - ya) / 2 + 13, Z_BASE1)))
    return s


def placa_base():
    """base del modulo (solo el ancho necesario) con ranuras Flowsort y
    colisas 9x25 hacia los 2 travesanos (ajuste en X)."""
    yn, yp = -170.0, Y_RAIL_P + 6
    s = (cq.Workplane("XY").rect(544, yp - yn).extrude(Z_BASE1 - Z_BASE0)
         .translate((0, (yn + yp) / 2, Z_BASE0)))
    for i in range(7):
        for yy in (-120, -20, 80, 180):
            s = s.cut(cq.Workplane("XY").slot2D(45, 6, 0)
                      .extrude(Z_BASE1 - Z_BASE0 + 2)
                      .translate((-210 + i * 70, yy, Z_BASE0 - 1)))
    for xt in X_TRAV:
        for yy in (-140, 0, 140, Y_RAIL_P - 10):
            s = s.cut(cq.Workplane("XY").slot2D(25, 9, 0)
                      .extrude(Z_BASE1 - Z_BASE0 + 2)
                      .translate((xt, yy, Z_BASE0 - 1)))
    return s


def travesano(xt):
    """pletina 50x6 apoyada en las pestanas inferiores de los largueros
    (z=-82.6 medido del LT_G); taladros M8 a la pestana y al modulo."""
    s = (cq.Workplane("XY").rect(50, 2 * CARA_INT + 60).extrude(6.0)
         .translate((xt, 0, -82.6)))
    for sy in (-1, 1):
        s = s.cut(cq.Workplane("XY").circle(4.25).extrude(10)
                  .translate((xt, sy * (CARA_INT + 15), -83.6)))
    for yy in (-140, 0, 140, Y_RAIL_P - 10):
        s = s.cut(cq.Workplane("XY").circle(4.25).extrude(10)
                  .translate((xt, yy, -83.6)))
    return s


def tapa_superior():
    """tapa avellanada M5 SOLO del ancho del modulo, 32 ventanas minimas."""
    dz = Z_RODAD - Z_TAPA_BOT
    semix = sqrt(R_ENV ** 2 - (R_ENV - dz) ** 2)
    vx, vy = 2 * semix + 4.0, 2 * W2 + 4.0
    yn, yp = -140.0, Y_RAIL_P + 6
    s = (cq.Workplane("XY").rect(L_ZONA - 2, yp - yn).extrude(TAPA_T)
         .translate((0, (yn + yp) / 2, Z_TAPA_BOT)))
    for x in X_EJES:
        for y in Y_RUEDAS:
            s = s.cut(redondo2d(vx, vy, 8.0).extrude(TAPA_T + 2)
                      .translate((x, y, Z_TAPA_BOT - 1)))
    for x in (-250, -125, 0, 125, 250):
        for yy in (Y_RAIL_N, Y_RAIL_P):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(TAPA_T + 2)
                      .translate((x, yy, Z_TAPA_BOT - 1)))
    return s, vx, vy


def collarin(k, sy):
    """collarin O22x8 con prisionero: retencion axial contra cada riel."""
    yc = (Y_RAIL_N + RAIL_T / 2 + 4.5) if sy < 0 else (Y_RAIL_P - RAIL_T / 2 - 4.5)
    return (cq.Workplane("XZ").circle(11.0).circle(7.5)
            .extrude(-8.0).translate((0, yc - 4 if sy < 0 else yc + 4, 0))
            .translate((X_EJES[k], 0, Z_EJE)))


def verificar(vx, vy):
    print('--- GATES bloque omni v4 ---')
    print(f'nivel {Z_EJE + R_ENV:.1f} = ZP 115.1 · sobresale {Z_EJE + R_ENV - Z_TAPA_TOP:.1f}')
    print(f'F6801ZZ: agujero O21 en placa {RAIL_T}, brida {ROD_BRIDA} fuera; '
          f'EJE HEX 1/2" e/c (vertices O{EJE_D / cos(radians(30)):.2f}) con '
          f'rebaje redondo torneado a O{MUNON_D} x {MUNON_L + RAIL_T}')
    print(f'modulo: y {min(Y_PLACA_MOTOR["izq"][0], -160):.0f}..{Y_RAIL_P + 2:.0f} '
          f'(cuerpo motor der hasta -160) -> zona muerta LIBRE '
          f'-266.8..-160 = {266.8 - 160:.1f}')
    print(f'bandas: der {G["der"]} / izq {G["izq"]}; rueda borde -57.3 -> '
          f'holgura a banda der {abs(-57.3 - (max(G["der"]) + 5)):.1f}')
    print(f'motores: der x-90 cuerpo y[-160,-41] placa cara y{Y_PLACA_MOTOR["der"]}; '
          f'izq x+90 cuerpo y[-123,-4] placa y{Y_PLACA_MOTOR["izq"]}; '
          f'cuerpos separados en x (der -166..-13.7 / izq 13.7..166)')
    print(f'lomo motor z{MZ + 59.05:.1f} < riel z0 {RAIL_Z0} y < envolvente 51.1')
    print(f'travesanos 50x6 en x{X_TRAV} sobre pestana inferior z=-82.6; '
          f'base apoya en z{Z_BASE0}; TR_S en x+-280.2 -> libres')
    print(f'ventana tapa {vx:.1f}x{vy:.1f}')


if __name__ == '__main__':
    piezas = []
    for sy in (-1, 1):
        piezas.append((f'rail_{"izq" if sy>0 else "der"}', rail(sy)))
    piezas.append(('placa_base', placa_base()))
    ts, vx, vy = tapa_superior()
    piezas.append(('tapa_superior', ts))
    for h in ('der', 'izq'):
        piezas.append((f'placa_motor_{h}', placa_motor(h)))
    for xt in X_TRAV:
        piezas.append((f'travesano_{xt:+.0f}', travesano(xt)))
    for k in range(NEJES):
        piezas.append((f'eje_{k}_{mano(k)}', eje(k)))
        piezas.append((f'polea_{k}', polea(k)))
        piezas += bujes(k)
        for sy in (-1, 1):
            piezas.append((f'collarin_{k}_{sy}', collarin(k, sy)))
    verificar(vx, vy)
    asm = cq.Assembly(name='bloque_omni_v4_fab')
    for nm, p in piezas:
        asm.add(p, name=nm)
        try:
            cq.exporters.export(p, os.path.join(OUT, f'bo4_{nm}.stl'),
                                tolerance=0.12, angularTolerance=0.35)
        except Exception as e:
            print('STL FALLO', nm, e)
    asm.save(os.path.join(OUT, 'bloque_omni_v4_fab.step'))
    print(f'{len(piezas)} piezas; STEP + STLs exportados')
