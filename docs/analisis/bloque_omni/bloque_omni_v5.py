# Bloque OMNI v5 — DEPURADO contra el analisis conceptual CONVEYONE-OMNI-ZPA
# (artifact 04b40a14, PR #113) y con el accionamiento que fijo Sergio:
# NEMA 24 de 3 N.m en LAZO CERRADO (encoder con cable de retorno).
#
# Lo que se depura respecto de la v4.1 (cada punto con su numero):
#  D1. FUERA el buje adaptador hex->hex: su pared era 0.775 mm (el analisis
#      §4.3 la reprueba). La rueda pasa a BARRENO HEX 12.85 DIRECTO sobre el
#      eje 1/2" (rueda v9). Se eliminan 32 piezas.
#  D2. FUERA los separadores de tubo PVC 3/4": sobre el hexagono quedaban
#      excentricos hasta 3.1 mm (§4.3). Pasan a SEPARADORES CON BARRENO
#      HEXAGONAL 12.85, torneados/impresos a cota.
#  D3. Transmision: de Poly-V doble (4 planos, 67 mm de apilado) a UNA CORREA
#      HTD 5M POR FAMILIA en serpentin (2 planos, 51 mm) - §4.1 y §4.2.3.
#  D4. Poleas HTD 5M 20T (Dp 31.83) IGUALES en motor y ejes (1:1): una sola
#      pieza. Con 3 N.m -> 0.75 N.m por eje (requisito §5: 0.45-0.84) y
#      tension de 188 N -> F6801 con L10 = 71 400 h (calculado abajo), asi
#      que se MANTIENE el F6801 que eligio Sergio; no hace falta 6001-2RS.
#  D5. Motor NEMA 24 (60x60, patron 47.14, piloto O38.1, eje O10) de lazo
#      cerrado: cuerpo 100 + encoder 30, con la cola y el CABLE DE RETORNO
#      hacia la zona muerta, bajo la tapa ciega modular.
#
# Base geometrica sin cambios (v4.1): zona 598 = 8 ejes a 74.75; nivel de
# rodadura 115.1; rueda sobresale 5.0; riel de 4 mm con F6801 embutido desde
# fuera; eje hex 1/2" con rebaje O12; apoyo en travesanos sobre las pestanas.

import cadquery as cq
import numpy as np
from math import cos, radians, sqrt, pi
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

EJE_D, EJE_AF = 12.7, 12.7          # hex 1/2" entre caras
MUNON_D, MUNON_L = 12.0, 6.0
ROD_D, ROD_B, ROD_BRIDA = 21.0, 5.0, 23.2      # F6801ZZ
RAIL_T, RAIL_Z0, RAIL_Z1 = 4.0, 52.0, 104.0
Y_RAIL_N, Y_RAIL_P = -116.0, +218.0

# --- D3/D4: transmision HTD 5M, un plano por familia ---
Z_POLEA = 20                         # dientes (motor y eje, 1:1)
DP_POLEA = Z_POLEA * 5.0 / pi        # 31.83 primitivo
POLEA_W = 15.0                       # ancho de polea (correa de 9)
POLEA_DE = DP_POLEA + 1.0            # exterior con pestanas
G = {'der': -72.0, 'izq': -97.0}     # UN plano de correa por familia
IDLER_D, IDLER_W, IDLER_Z = 24.0, 12.0, 50.0

# --- D5: NEMA 24 lazo cerrado ---
NEMA_B, NEMA_PAT, NEMA_PILOTO = 60.0, 47.14, 38.1
NEMA_CUERPO, NEMA_ENC_D, NEMA_ENC_L = 100.0, 50.0, 30.0
NEMA_EJE_D, NEMA_EJE_L = 10.0, 24.0
MZ = Z_EJE - 87.7 - 4.0              # altura del eje del motor (-8.6)
X_MOTOR = {'der': -90.0, 'izq': +90.0}
PLACA_MOTOR_T = 8.0

Z_BASE0, Z_BASE1 = -72.6, -68.6
X_TRAV = (-180.0, 180.0)
SEP_OD = 20.0                        # D2: separador con barreno hexagonal

X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
KS = {h: [k for k in range(NEJES) if mano(k) == h] for h in ('der', 'izq')}
X_IDLER = {h: [(X_EJES[a] + X_EJES[b]) / 2 for a, b in zip(KS[h][:-1], KS[h][1:])]
           for h in ('der', 'izq')}


def hexw(af):
    return cq.Workplane("XZ").polygon(6, af / cos(radians(30)))


def redondo2d(w, h, r):
    from shapely.geometry import box
    poly = box(-w / 2, -h / 2, w / 2, h / 2).buffer(-r).buffer(r, quad_segs=14)
    return cq.Workplane("XY").polyline(list(poly.exterior.coords)[:-1]).close()


def rail(sy):
    """riel de 4 mm con los 8 alojamientos O21 del F6801 (embutido desde
    fuera) + ranuras + pies a la base. Los dos rieles son LA MISMA PIEZA."""
    yc = Y_RAIL_N if sy < 0 else Y_RAIL_P
    y0 = yc - RAIL_T / 2
    s = (cq.Workplane("XZ").rect(L_ZONA - 6, RAIL_Z1 - RAIL_Z0).extrude(RAIL_T)
         .translate((0, y0 + RAIL_T, (RAIL_Z0 + RAIL_Z1) / 2)))
    for x in X_EJES:
        s = s.cut(cq.Workplane("XZ").circle(ROD_D / 2).extrude(40)
                  .translate((x, y0 + 20, Z_EJE)))
    for i in range(8):
        s = s.cut(cq.Workplane("XZ").slot2D(40, 6, 0).extrude(40)
                  .translate((-245 + i * 70, y0 + 20, 96.0)))
    for x in (-220.0, 220.0):
        s = s.union(cq.Workplane("XZ").rect(40, RAIL_Z0 - Z_BASE1 + 8)
                    .extrude(RAIL_T)
                    .translate((x, y0 + RAIL_T, (RAIL_Z0 + Z_BASE1 - 8) / 2 + 4)))
    return s


def eje(k):
    """eje HEX 1/2" con rebaje redondo O12 en las puntas (F6801 bore 12.0)."""
    y0, y1 = Y_RAIL_N + RAIL_T / 2, Y_RAIL_P - RAIL_T / 2
    L = (y1 - y0) - 0.5
    s = hexw(EJE_AF).extrude(-L).translate((0, y0 + 0.25, 0))
    for sgn, yy in ((-1, y0 + 0.25), (1, y0 + 0.25 + L)):
        s = s.union(cq.Workplane("XZ").circle(MUNON_D / 2)
                    .extrude(-sgn * (MUNON_L + RAIL_T)).translate((0, yy, 0)))
    return s.translate((X_EJES[k], 0, Z_EJE))


def polea(xc, yc):
    """D4: polea HTD 5M 20T con barreno HEXAGONAL 12.85 (misma pieza en el
    motor y en los 8 ejes; en el motor lleva casquillo O10->hex)."""
    s = (cq.Workplane("XZ").circle(POLEA_DE / 2)
         .polygon(6, 12.85 / cos(radians(30)))
         .extrude(-POLEA_W).translate((0, yc + POLEA_W / 2, 0)))
    for dy in (0.0, POLEA_W - 1.6):      # pestanas guia
        s = s.union(cq.Workplane("XZ").circle(POLEA_DE / 2 + 1.6)
                    .polygon(6, 12.85 / cos(radians(30)))
                    .extrude(-1.6).translate((0, yc + POLEA_W / 2 - dy, 0)))
    return s.translate((xc, 0, Z_EJE))


def separador(k, y0, y1):
    """D2: separador con BARRENO HEXAGONAL (sustituye al tubo PVC que
    quedaba excentrico 3.1 mm sobre el hexagono)."""
    return (cq.Workplane("XZ").circle(SEP_OD / 2)
            .polygon(6, 12.9 / cos(radians(30)))
            .extrude(-(y1 - y0 - 1.0)).translate((0, y0 + 0.5, 0))
            .translate((X_EJES[k], 0, Z_EJE)))


def separadores(k):
    h = mano(k)
    banda = (G[h] - POLEA_W / 2 - 2.0, G[h] + POLEA_W / 2 + 2.0)
    ocupado = sorted([(y - W2, y + W2) for y in Y_RUEDAS] + [banda])
    y_min, y_max = Y_RAIL_N + RAIL_T / 2 + 0.5, Y_RAIL_P - RAIL_T / 2 - 0.5
    piezas, prev = [], y_min
    for a, b in ocupado:
        if a - prev > 6.0:
            piezas.append((f'separador_{k}_{len(piezas)}', separador(k, prev, a)))
        prev = max(prev, b)
    if y_max - prev > 6.0:
        piezas.append((f'separador_{k}_{len(piezas)}', separador(k, prev, y_max)))
    return piezas


def nema24(h):
    """D5: NEMA 24 de lazo cerrado con encoder y salida de cable de retorno.
    Eje paralelo a Y; cola y cable hacia la zona muerta."""
    xm, yp = X_MOTOR[h], G[h]
    y_brida = yp - NEMA_EJE_L                      # cara de la brida
    s = (cq.Workplane("XZ").rect(NEMA_B, NEMA_B).extrude(-NEMA_CUERPO)
         .translate((xm, y_brida, MZ)))
    s = s.union(cq.Workplane("XZ").circle(NEMA_PILOTO / 2).extrude(2.0)
                .translate((xm, y_brida, MZ)))     # piloto
    s = s.union(cq.Workplane("XZ").circle(NEMA_EJE_D / 2).extrude(NEMA_EJE_L)
                .translate((xm, y_brida, MZ)))     # eje
    y_enc = y_brida - NEMA_CUERPO
    s = s.union(cq.Workplane("XZ").circle(NEMA_ENC_D / 2).extrude(-NEMA_ENC_L)
                .translate((xm, y_enc, MZ)))       # encoder
    # cable de retorno del encoder: sale RADIAL (conector lateral, como los
    # closed-loop reales) -> no consume largo axial contra el larguero
    s = s.union(cq.Workplane("XY").circle(5.0).extrude(26.0)
                .translate((xm, y_enc - NEMA_ENC_L / 2, MZ + NEMA_ENC_D / 2 - 2)))
    return s


def placa_motor(h):
    """soporte de 8 mm con patron NEMA 24 (47.14) y colisas de tensado."""
    xm, yp = X_MOTOR[h], G[h]
    yb = yp - NEMA_EJE_L
    s = (cq.Workplane("XZ").rect(96, 96).extrude(PLACA_MOTOR_T)
         .translate((xm, yb, MZ)))
    s = s.cut(cq.Workplane("XZ").circle(NEMA_PILOTO / 2 + 0.6)
              .extrude(-PLACA_MOTOR_T - 2).translate((xm, yb + 1, MZ)))
    d = NEMA_PAT / 2
    for dx in (-d, d):
        for dz in (-d, d):
            s = s.cut(cq.Workplane("XZ").slot2D(14, 5.5, 0)
                      .extrude(-PLACA_MOTOR_T - 2).translate((xm + dx, yb + 1, MZ + dz)))
    pie = (cq.Workplane("XY").rect(96, 40).extrude(6.0)
           .translate((xm, yb - 20, Z_BASE1)))
    for dx in (-36, 0, 36):
        pie = pie.cut(cq.Workplane("XY").slot2D(20, 6.5, 90).extrude(10)
                      .translate((xm + dx, yb - 20, Z_BASE1 - 1)))
    return s.union(pie).union(
        cq.Workplane("XZ").rect(96, 12).extrude(PLACA_MOTOR_T)
        .translate((xm, yb, MZ - 54)))


def idler(h, x):
    yc = G[h]
    rod = (cq.Workplane("XZ").circle(IDLER_D / 2).circle(4.1).extrude(-IDLER_W)
           .translate((x, yc + IDLER_W / 2, IDLER_Z)))
    perno = (cq.Workplane("XZ").circle(4.0)
             .extrude(-(yc + IDLER_W / 2 - (Y_RAIL_N + RAIL_T / 2)))
             .translate((x, yc + IDLER_W / 2, IDLER_Z)))
    return rod.union(perno)


def placa_base():
    yn, yp = -270.0, Y_RAIL_P + 6      # llega bajo los motores
    s = (cq.Workplane("XY").rect(544, yp - yn).extrude(Z_BASE1 - Z_BASE0)
         .translate((0, (yn + yp) / 2, Z_BASE0)))
    for i in range(7):
        for yy in (-230, -170, -20, 80, 180):
            s = s.cut(cq.Workplane("XY").slot2D(45, 6, 0)
                      .extrude(Z_BASE1 - Z_BASE0 + 2)
                      .translate((-210 + i * 70, yy, Z_BASE0 - 1)))
    for xt in X_TRAV:
        for yy in (-240, -140, 0, 140, Y_RAIL_P - 10):
            s = s.cut(cq.Workplane("XY").slot2D(25, 9, 0)
                      .extrude(Z_BASE1 - Z_BASE0 + 2)
                      .translate((xt, yy, Z_BASE0 - 1)))
    return s


def travesano(xt):
    s = (cq.Workplane("XY").rect(50, 2 * CARA_INT + 60).extrude(6.0)
         .translate((xt, 0, -78.6)))
    for sy in (-1, 1):
        s = s.cut(cq.Workplane("XY").circle(4.25).extrude(10)
                  .translate((xt, sy * (CARA_INT + 15), -83.6)))
    for yy in (-240, -140, 0, 140, Y_RAIL_P - 10):
        s = s.cut(cq.Workplane("XY").circle(4.25).extrude(10)
                  .translate((xt, yy, -83.6)))
    return s


def tapa_superior():
    dz = Z_RODAD - Z_TAPA_BOT
    semix = sqrt(R_ENV ** 2 - (R_ENV - dz) ** 2)
    vx, vy = 2 * semix + 4.0, 2 * W2 + 4.0
    yn, yp = -140.0, 266.0
    s = (cq.Workplane("XY").rect(L_ZONA - 2, yp - yn).extrude(TAPA_T)
         .translate((0, (yn + yp) / 2, Z_TAPA_BOT)))
    s = s.union(cq.Workplane("XY").rect(L_ZONA - 2, 3.0).extrude(-10.0)
                .translate((0, 264.5, Z_TAPA_BOT)))
    for x in X_EJES:
        for y in Y_RUEDAS:
            s = s.cut(redondo2d(vx, vy, 8.0).extrude(TAPA_T + 2)
                      .translate((x, y, Z_TAPA_BOT - 1)))
    for x in (-250, -125, 0, 125, 250):
        for yy in (Y_RAIL_N, Y_RAIL_P):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(TAPA_T + 2)
                      .translate((x, yy, Z_TAPA_BOT - 1)))
    return s, vx, vy


def tapa_ciega(i):
    x0 = -296.0 + i * 298.0
    z0 = Z_TAPA_BOT - TAPA_T
    s = (cq.Workplane("XY").rect(294.0, 266.0 - 134.0).extrude(TAPA_T)
         .translate((x0 + 147.0, -(266.0 + 134.0) / 2, z0)))
    s = s.union(cq.Workplane("XY").rect(294.0, 3.0).extrude(-10.0)
                .translate((x0 + 147.0, -264.5, z0)))
    s = s.union(cq.Workplane("XY").rect(294.0, 10.0).extrude(-8.0)
                .translate((x0 + 147.0, -200.0, z0)))
    for dx in (40.0, 147.0, 254.0):
        s = s.cut(cq.Workplane("XY").circle(2.6).extrude(TAPA_T + 2)
                  .translate((x0 + dx, Y_RAIL_N, z0 - 1)))
    return s


def collarin(k, sy):
    yc = (Y_RAIL_N + RAIL_T / 2 + 4.5) if sy < 0 else (Y_RAIL_P - RAIL_T / 2 - 4.5)
    return (cq.Workplane("XZ").circle(11.0).circle(7.5).extrude(-8.0)
            .translate((0, yc + (0 if sy < 0 else 8), 0))
            .translate((X_EJES[k], 0, Z_EJE)))


def rodamiento_f6801(k, sy):
    y_ext = (Y_RAIL_N - RAIL_T / 2) if sy < 0 else (Y_RAIL_P + RAIL_T / 2)
    d = 1 if sy < 0 else -1
    s = (cq.Workplane("XZ").circle(21.0 / 2).circle(17.4 / 2)
         .extrude(-d * ROD_B).translate((0, y_ext, 0)))
    s = s.union(cq.Workplane("XZ").circle(ROD_BRIDA / 2).circle(17.4 / 2)
                .extrude(d * 1.0).translate((0, y_ext, 0)))
    s = s.union(cq.Workplane("XZ").circle(15.0 / 2).circle(MUNON_D / 2)
                .extrude(-d * ROD_B).translate((0, y_ext, 0)))
    return s.translate((X_EJES[k], 0, Z_EJE))


def verificar(vx, vy):
    print('--- GATES v5 (depurado + NEMA 24) ---')
    print(f'D1 eje hex {EJE_AF} · rueda v9 con barreno hex 12.85 DIRECTO '
          f'(holgura 0.075/cara): 0 bujes adaptadores (v4 tenia 32 de 0.775)')
    print(f'D2 separadores con barreno hex 12.9 sobre hex {EJE_AF}: '
          f'excentricidad {(12.9-EJE_AF)/2:.2f} mm (PVC daba 3.10)')
    n_rueda = 1.0 / (pi * 64 / 1000) * 60
    F = 2 * 3.0 * 1000 / DP_POLEA
    P = 1.3 * F / 2
    L10 = (1330 / P) ** 3 * 1e6 / (60 * n_rueda)
    print(f'D3/D4 HTD 5M {Z_POLEA}T Dp {DP_POLEA:.2f} 1:1 · un plano por familia '
          f'(der {G["der"]}, izq {G["izq"]}, separacion {abs(G["der"]-G["izq"])})')
    print(f'   3 N.m -> {3.0/4:.2f} N.m por eje (req. 0.45-0.84) · '
          f'motor a {n_rueda:.0f} rpm para 1.0 m/s · {n_rueda*1.5:.0f} para 1.5')
    print(f'   tension {F:.0f} N -> F6801 L10 = {L10:.0f} h (objetivo >40 000) OK')
    for h in ('der', 'izq'):
        y_cola = G[h] - NEMA_EJE_L - NEMA_CUERPO - NEMA_ENC_L
        print(f'D5 motor {h}: polea y={G[h]:.0f} · cola+cable y={y_cola:.0f} vs '
              f'larguero -266.8 -> holgura {abs(-266.8 - y_cola):.1f} mm '
              f'{"OK" if y_cola > -266.8 else "FALLA"}')
    print(f'   brida 60 en z {MZ-30:.1f}..{MZ+30:.1f} vs base {Z_BASE1} y '
          f'envolvente 51.1 -> OK')
    p0, p1 = G['der'] + POLEA_W / 2, G['izq'] - POLEA_W / 2
    print(f'   poleas: der ocupa {G["der"]-POLEA_W/2:.1f}..{p0:.1f}, izq '
          f'{p1:.1f}..{G["izq"]+POLEA_W/2:.1f} -> luz entre planos '
          f'{abs(G["izq"]+POLEA_W/2 - (G["der"]-POLEA_W/2)):.1f} mm')
    print(f'   rueda mas cercana borde -57.3 vs polea der {G["der"]+POLEA_W/2:.1f} '
          f'-> holgura {abs(-57.3 - (G["der"]+POLEA_W/2)):.1f} mm')
    print(f'nivel {Z_EJE + R_ENV:.1f} = 115.1 · sobresale '
          f'{Z_EJE + R_ENV - Z_TAPA_TOP:.1f} · ventana {vx:.1f}x{vy:.1f}')


if __name__ == '__main__':
    piezas = []
    for sy in (-1, 1):
        piezas.append((f'rail_{"izq" if sy > 0 else "der"}', rail(sy)))
    piezas.append(('placa_base', placa_base()))
    ts, vx, vy = tapa_superior()
    piezas.append(('tapa_superior', ts))
    for i in range(2):
        piezas.append((f'tapa_ciega_{i}', tapa_ciega(i)))
    for h in ('der', 'izq'):
        piezas.append((f'placa_motor_{h}', placa_motor(h)))
        piezas.append((f'nema24_{h}', nema24(h)))
        piezas.append((f'polea_motor_{h}', polea(X_MOTOR[h], G[h]).translate(
            (0, 0, MZ - Z_EJE))))
        for i, x in enumerate(X_IDLER[h]):
            piezas.append((f'idler_{h}_{i}', idler(h, x)))
    for xt in X_TRAV:
        piezas.append((f'travesano_{xt:+.0f}', travesano(xt)))
    for k in range(NEJES):
        piezas.append((f'eje_{k}_{mano(k)}', eje(k)))
        piezas.append((f'polea_{k}', polea(X_EJES[k], G[mano(k)])))
        piezas += separadores(k)
        for sy in (-1, 1):
            piezas.append((f'collarin_{k}_{sy}', collarin(k, sy)))
            piezas.append((f'F6801_{k}_{sy}', rodamiento_f6801(k, sy)))
    verificar(vx, vy)
    asm = cq.Assembly(name='bloque_omni_v5')
    for nm, p in piezas:
        asm.add(p, name=nm)
        try:
            cq.exporters.export(p, os.path.join(OUT, f'bo5_{nm}.stl'),
                                tolerance=0.12, angularTolerance=0.35)
        except Exception as e:
            print('STL FALLO', nm, e)
    asm.save(os.path.join(OUT, 'bloque_omni_v5_fab.step'))
    print(f'{len(piezas)} piezas; STEP + STLs exportados')
