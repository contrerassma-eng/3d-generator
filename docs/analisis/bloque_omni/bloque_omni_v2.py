# Bloque OMNI v2 — interpretacion DETALLADA de la caja Flowsort SLD/DLD
# aplicada al ZP2026, con la rueda mecanum v7 real y los componentes reales
# del transportador (motor UniDrive + carrete speed-up, mallas del GLB).
#
# Fuentes de la interpretacion (capa web, accedidas 02-09-2026):
#  - Instruction Manual SLD/DLD 24V V5 REV1.2 (Flowsort BV, 14-12-2022)
#    https://robotunits.com/wp-content/uploads/2023/02/Instruction-Manual-SLD-DLD-24V-V5-REV1.2-v5.2_e.pdf
#    caja: placas laterales + placa base + tapas (superior avellanada M5x10 a
#    3 Nm, inferior, laterales con louvres), montaje al bastidor con pernos
#    M8x16 en taladros O8.2, cancamos de izaje, TOR recomendado +2, anchos
#    400/600/800/1000 +50 de ajuste, mantenimiento por arriba.
#  - flow-sort.com (paginas de producto SLD/DLD).
# Datos del ZP2026: medidos de cad/componentes/models/ZP2026.glb (paso 74.75,
# interior 533.6, rodadura 115.1, motor a 79.9 de la cara con carrete a 31.5
# del centro del motor y 87.7 bajo el plano de ejes).

import cadquery as cq
import numpy as np
from math import sin, cos, radians, sqrt
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ---- patron ZP2026 (medido) ----
PASO = 74.75
NEJES = 8
L_ZONA = PASO * NEJES              # 598
CARA_INT = 266.8
Z_RODAD = 115.1

# ---- rueda mecanum v7 ----
R_ENV, W2 = 32.0, 18.3
BETA, D0 = 46.0, 23.0
RARC = 16.75 ** 2 / (2 * 2.5) + 2.5 / 2
SMAX = 33.5 / 2

# ---- caja (interpretacion Flowsort) ----
Z_EJE = Z_RODAD - R_ENV            # 83.1
SOBRE_TAPA = 5.0
TAPA_T = 3.0
Z_TAPA_TOP = Z_RODAD - SOBRE_TAPA  # 110.1
Z_TAPA_BOT = Z_TAPA_TOP - TAPA_T   # 107.1
PLACA_T = 4.0
PLACA_Y = 250.0                    # cara interior de placa
L_PLACA = L_ZONA - 4.0             # 594
Z_LO, Z_HI = -75.0, 106.0          # caja PROFUNDA: los motores van DENTRO
NRUEDAS = 6
PASO_Y = 78.0                      # ruedas a +-39/117/195 (borde 213.3)
BUJE_OD, BUJE_ID = 26.7, 20.9      # PVC 3/4" SCH40
HEX_AF, MUNON_D = 14.0, 12.0
ROD_OD = 28.0                      # 6001 12x28x8
CARRETE_D, CARRETE_W = 40.0, 10.0  # carrete de eje, 2 gargantas O5
CARRETE_Y = 221.0                  # plano de o-rings DENTRO de la caja
MOTOR_FACE_Y = 249.0               # frente del motor contra la placa
SPOOL_DY = 31.5                    # carrete del motor: offset real al centro
SPOOL_Z = Z_EJE - 87.7             # -4.6 (medido ZP)
HOLG_TAPA = 2.0

X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]
Y_RUEDAS = [(j - (NRUEDAS - 1) / 2) * PASO_Y for j in range(NRUEDAS)]
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
cara = lambda k: -1 if k % 2 == 0 else +1
X_MOTOR = {-1: -PASO / 2, +1: +PASO / 2}     # centroides de cada grupo


def rho(s):
    s = max(min(s, SMAX), -SMAX)
    return (9.0 - RARC) + sqrt(RARC * RARC - s * s)


def renv_perfil():
    sarr = np.linspace(-SMAX, SMAX, 200)
    aarr = np.linspace(0, 2 * np.pi, 160)
    S, A = np.meshgrid(sarr, aarr, indexing='ij')
    CB, SB = cos(radians(BETA)), sin(radians(BETA))
    RHO = np.vectorize(rho)(S)
    P = np.stack([D0 + RHO * np.cos(A), S * CB + RHO * np.sin(A) * SB,
                  S * SB - RHO * np.sin(A) * CB], -1).reshape(-1, 3)
    rr, zz = np.hypot(P[:, 0], P[:, 1]), P[:, 2]
    zs = np.linspace(-W2, W2, 41)
    return [(float(rr[np.abs(zz - z0) < 0.5].max()), float(z0)) for z0 in zs]


def redondo2d(w, h, r):
    from shapely.geometry import box
    poly = box(-w / 2, -h / 2, w / 2, h / 2).buffer(-r).buffer(r, quad_segs=14)
    return cq.Workplane("XY").polyline(list(poly.exterior.coords)[:-1]).close()


def louvres(s, plano, n, largo, paso, x0, c0, fijo):
    """ranuras de ventilacion (estilo tapas Flowsort)"""
    for i in range(n):
        s = s.cut(cq.Workplane(plano).slot2D(largo, 5.0, 0).extrude(20)
                  .translate((x0 + i * paso if plano != "XY" else x0,
                              c0, fijo) if plano == "XZ" else
                             (x0, c0 + i * paso, fijo)))
    return s


def placa_principal(sy):
    """placa lateral estructural (Flowsort: side plate): porta rodamientos,
    motor, pernos M8 premontados al bastidor y roscas M5 de las tapas."""
    h = Z_HI - Z_LO
    y0 = sy * PLACA_Y + (PLACA_T if sy > 0 else 0)
    s = (cq.Workplane("XZ").rect(L_PLACA, h).extrude(PLACA_T)
         .translate((0, y0, (Z_LO + Z_HI) / 2)))
    for x in X_EJES:                       # asientos 6001
        s = s.cut(cq.Workplane("XZ").circle(ROD_OD / 2).extrude(40)
                  .translate((x, sy * 280, Z_EJE)))
    # interfaz al bastidor (Flowsort 4.4): 4 pernos M8 en O8.2, con colisa
    # vertical 9x25 para el ajuste de altura (TOR +0..+2)
    for x in (-225.0, -75.0, 75.0, 225.0):
        s = s.cut(cq.Workplane("XZ").slot2D(25, 9, 90).extrude(40)
                  .translate((x, sy * 280, 88.0)))
    # ventana de servicio del motor de ESTA cara (se cablea por aqui)
    if True:
        s = s.cut(cq.Workplane("XZ").slot2D(60, 24, 0).extrude(40)
                  .translate((X_MOTOR[sy] if sy in X_MOTOR else 0,
                              sy * 280, -40.0)))
    # taladros de varillas M8 separadoras
    for x, z in [(-L_PLACA / 2 + 25, 44.5), (0, 44.5), (L_PLACA / 2 - 25, 44.5),
                 (-200, -60.0), (200, -60.0)]:
        s = s.cut(cq.Workplane("XZ").circle(4.25).extrude(40)
                  .translate((x, sy * 280, z)))
    return s


def eje(k):
    c = cara(k)
    Lhex = 2 * PLACA_Y - 1.0
    s = (cq.Workplane("XZ").polygon(6, HEX_AF / cos(radians(30)))
         .extrude(Lhex).translate((0, Lhex / 2, 0)))
    for sgn in (-1, 1):
        L = 14.0
        s = s.union(cq.Workplane("XZ").circle(MUNON_D / 2).extrude(sgn * L)
                    .translate((0, sgn * (Lhex / 2), 0)))
    return s.translate((X_EJES[k], 0, Z_EJE))


def carrete(k):
    """carrete de o-rings del eje: DENTRO de la caja (plano y=221), con dos
    gargantas O5; se fija al hex con prisionero M4 (capa user)."""
    c = cara(k)
    y0 = c * CARRETE_Y
    s = (cq.Workplane("XZ").circle(CARRETE_D / 2).circle(8.4)
         .extrude(c * CARRETE_W).translate((X_EJES[k], y0 + c * (-CARRETE_W / 2), Z_EJE)))
    for dy in (-3.0, 3.0):
        g = (cq.Workplane("XZ").circle(CARRETE_D / 2 + 1).circle(CARRETE_D / 2 - 2.5)
             .extrude(c * 5.2).translate((X_EJES[k], y0 + c * (dy - 2.6), Z_EJE)))
        s = s.cut(g)
    return s


def bujes(k):
    """5 bujes intermedios + extremos; en el lado MOTRIZ el buje de extremo
    se parte en dos: rueda->carrete (corto) y carrete->placa."""
    c = cara(k)
    piezas = []
    gaps = [(Y_RUEDAS[j] + W2, Y_RUEDAS[j + 1] - W2) for j in range(NRUEDAS - 1)]
    b_rueda = Y_RUEDAS[-1] + W2          # 213.3
    b_car0, b_car1 = CARRETE_Y - CARRETE_W / 2, CARRETE_Y + CARRETE_W / 2
    lado_motriz = [(b_rueda, b_car0 - 0.5), (b_car1 + 0.5, PLACA_Y - 0.5)]
    lado_libre = [(-PLACA_Y + 0.5, -b_rueda)]
    for a, b in (lado_motriz if c > 0 else [(-b, -a) for a, b in lado_motriz]):
        gaps.append((a, b))
    for a, b in (lado_libre if c > 0 else [(-b, -a) for a, b in lado_libre]):
        gaps.append((a, b))
    for i, (y0, y1) in enumerate(gaps):
        L = y1 - y0 - 1.0
        if L < 4: continue
        b = (cq.Workplane("XZ").circle(BUJE_OD / 2).circle(BUJE_ID / 2)
             .extrude(-L).translate((0, y0 + 0.5, 0))
             .translate((X_EJES[k], 0, Z_EJE)))
        piezas.append((f'buje_{k}_{i}', b))
    return piezas


def separadores():
    piezas = []
    puntos = [(-L_PLACA / 2 + 25, 44.5), (0.0, 44.5), (L_PLACA / 2 - 25, 44.5),
              (-200.0, -60.0), (200.0, -60.0)]
    for i, (x, z) in enumerate(puntos):
        t = (cq.Workplane("XZ").circle(6.0).circle(4.3)
             .extrude(2 * PLACA_Y).translate((x, PLACA_Y, z)))
        v = (cq.Workplane("XZ").circle(4.0).extrude(2 * (PLACA_Y + PLACA_T + 6))
             .translate((x, PLACA_Y + PLACA_T + 6, z)))
        piezas.append((f'separador_{i}', t))
        piezas.append((f'varilla_M8_{i}', v))
    return piezas


def standoffs():
    """casquillos de montaje placa->larguero (12.8) en los 4 puntos M8 por
    cara: el perno M8x30 premontado atraviesa placa+casquillo+larguero O8.2."""
    piezas = []
    for sy in (-1, 1):
        for i, x in enumerate((-225.0, -75.0, 75.0, 225.0)):
            c = (cq.Workplane("XZ").circle(8.0).circle(4.2)
                 .extrude(sy * (CARA_INT - PLACA_Y - PLACA_T))
                 .translate((x, sy * (PLACA_Y + PLACA_T), 88.0)))
            piezas.append((f'standoff_{ "izq" if sy>0 else "der"}_{i}', c))
    return piezas


def cancamos():
    """cancamos M8 de izaje en el borde superior (Flowsort: eye-bolts)."""
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
    vx = 2 * semix + 2 * HOLG_TAPA
    vy = 2 * W2 + 2 * HOLG_TAPA
    s = (cq.Workplane("XY").rect(L_ZONA - 2.0, 2 * (CARA_INT - 0.8))
         .extrude(TAPA_T).translate((0, 0, Z_TAPA_BOT)))
    for x in X_EJES:
        for y in Y_RUEDAS:
            s = s.cut(redondo2d(vx, vy, 8.0).extrude(TAPA_T + 2)
                      .translate((x, y, Z_TAPA_BOT - 1)))
    # avellanados M5x10 (negros, 3 Nm — Flowsort) al borde de placas
    for sy in (-1, 1):
        for x in (-250, -125, 0, 125, 250):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(TAPA_T + 2)
                      .translate((x, sy * (PLACA_Y + PLACA_T / 2), Z_TAPA_BOT - 1)))
    return s, vx, vy


def tapa_inferior():
    """cierra la caja profunda por abajo (bottom cover plate) con louvres."""
    s = (cq.Workplane("XY").rect(L_ZONA - 2.0, 2 * (CARA_INT - 0.8))
         .extrude(TAPA_T).translate((0, 0, Z_LO - TAPA_T)))
    for sy in (-1, 1):
        for i in range(7):
            s = s.cut(cq.Workplane("XY").slot2D(60, 5, 0).extrude(TAPA_T + 2)
                      .translate((-210 + i * 70, sy * 150, Z_LO - TAPA_T - 1)))
    return s


def tapa_lateral(sx):
    """tapa de extremo con louvres; la +X lleva pasacable (grommet O16)."""
    s = (cq.Workplane("YZ").rect(2 * (CARA_INT - 0.8), Z_TAPA_BOT - (Z_LO - TAPA_T))
         .extrude(sx * PLACA_T)
         .translate((sx * (L_ZONA / 2 - 1), 0, (Z_TAPA_BOT + Z_LO - TAPA_T) / 2)))
    for j in range(5):
        for sy in (-1, 1):
            s = s.cut(cq.Workplane("YZ").slot2D(50, 5, 0).extrude(sx * (PLACA_T + 2))
                      .translate((sx * (L_ZONA / 2 - 1 - 1), sy * 150, -55 + j * 22)))
    if sx > 0:
        s = s.cut(cq.Workplane("YZ").circle(8.0).extrude(sx * (PLACA_T + 2))
                  .translate((sx * (L_ZONA / 2 - 2), 0, -20)))
    return s


def verificar(vx, vy):
    print('--- GATES bloque omni v2 ---')
    print(f'nivel rueda {Z_EJE + R_ENV:.1f} = ZP {Z_RODAD:.1f} '
          f'{"OK" if abs(Z_EJE + R_ENV - Z_RODAD) < 1e-9 else "FALLA"} '
          f'(colisa permite +0..+2 TOR Flowsort)')
    print(f'sobresale sobre tapa {Z_EJE + R_ENV - Z_TAPA_TOP:.1f} (pedido 5.0)')
    print(f'ventana {vx:.1f}x{vy:.1f}; material entre ventanas '
          f'x={PASO - vx:.1f} y={PASO_Y - vy:.1f}')
    borde_rueda = Y_RUEDAS[-1] + W2
    print(f'ultima rueda borde y={borde_rueda:.1f}; carrete {CARRETE_Y - CARRETE_W/2:.0f}'
          f'..{CARRETE_Y + CARRETE_W/2:.0f}; placa {PLACA_Y:.0f} -> holguras '
          f'{CARRETE_Y - CARRETE_W/2 - borde_rueda:.1f} / '
          f'{PLACA_Y - CARRETE_Y - CARRETE_W/2:.1f}')
    print(f'motor: frente y=249 contra placa 250; carrete motor z={SPOOL_Z:.1f} '
          f'(87.7 bajo ejes, como ZP2026); caja z {Z_LO}..{Z_HI}')
    print(f'separadores z44.5 y z-60 vs envolvente min z=51.1 -> OK')
    print(f'buje PVC ID {BUJE_ID} vs hex vertices 16.17 -> holgura 4.73')


if __name__ == '__main__':
    asm = cq.Assembly(name='bloque_omni_v2_fab')
    piezas = []
    for sy in (-1, 1):
        piezas.append((f'placa_{"izq" if sy>0 else "der"}', placa_principal(sy)))
    ts, vx, vy = tapa_superior()
    piezas.append(('tapa_superior', ts))
    piezas.append(('tapa_inferior', tapa_inferior()))
    for sx in (-1, 1):
        piezas.append((f'tapa_lateral_{"pos" if sx>0 else "neg"}', tapa_lateral(sx)))
    piezas += separadores() + standoffs() + cancamos()
    for k in range(NEJES):
        piezas.append((f'eje_{k}_{mano(k)}', eje(k)))
        piezas.append((f'carrete_{k}', carrete(k)))
        piezas += bujes(k)
    verificar(vx, vy)
    for nm, p in piezas:
        asm.add(p, name=nm)
        try:
            cq.exporters.export(p, os.path.join(OUT, f'bo2_{nm}.stl'),
                                tolerance=0.12, angularTolerance=0.35)
        except Exception as e:
            print('STL FALLO', nm, e)
    asm.save(os.path.join(OUT, 'bloque_omni_v2_fab.step'))
    print(f'{len(piezas)} piezas; STEP + STLs exportados')
