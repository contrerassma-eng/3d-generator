# Bloque OMNI tipo Flowsort para el ZP2026 (transportador de rodillos con
# acumulacion 24V). Reemplaza 8 rodillos del patron estructural (paso 74.75,
# una zona completa de 598 mm) por 8 EJES de ruedas mecanum v7 (O64 x 36.6,
# hex 14.5 pasante), alternando ejes DERECHOS e IZQUIERDOS; los derechos los
# mueve un motor y los izquierdos otro — un motor por cara interior, como el
# ZP2026 real.
#
# Datos MEDIDOS del ZP2026 (cad/componentes/models/ZP2026.glb, nodos + accessors):
#   paso rodillos 74.75 · zona 598 · caras interiores z=+-266.8 (int. 533.6)
#   rodillo O50, eje y=90.1 -> plano de rodadura 115.1 · larguero alto 190.5
#   (tope 108) · motor UniDrive 152.7x118.1x119 en cara interior · carrete
#   speed-up O68x56 · o-rings entre rodillos.
#
# Logica de caja Flowsort: 2 placas principales (portan los rodamientos),
# separadores tubulares con varilla M8, tapas laterales, tapa inferior y tapa
# superior con recortes MINIMOS (la rueda sobresale 5 sobre la tapa). Entre
# ruedas, bujes separadores de PVC 3/4" SCH40 (OD 26.7 / ID 20.9: pasa sobre
# los vertices O16.74 del hex 14.5).
#
# Coordenadas: X = flujo (largo), Y = a lo ancho (ejes), Z = arriba, mm.

import cadquery as cq
import numpy as np
from math import sin, cos, radians, sqrt
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ----- patron medido ZP2026 -----
PASO = 74.75            # paso de rodillos (medido)
NEJES = 8               # rodillos reemplazados
L_ZONA = PASO * NEJES   # 598.0
CARA_INT = 266.8        # cara interior del larguero (medido, +-)
Z_RODAD = 115.1         # plano de rodadura de los rodillos vecinos (medido)
Z_LARG_TOP = 108.0      # tope del larguero (medido)

# ----- rueda mecanum v7 (medida/verificada) -----
R_ENV = 32.0            # envolvente O64 (verificada 63.8-64.0)
W2 = 18.3               # semiancho rueda 36.6
BETA, D0 = 46.0, 23.0
RARC = 16.75 ** 2 / (2 * 2.5) + 2.5 / 2
SMAX = 33.5 / 2
CB, SB = cos(radians(BETA)), sin(radians(BETA))

# ----- bloque -----
Z_EJE = Z_RODAD - R_ENV          # 83.1: ejes de rueda al nivel de rodadura
SOBRE_TAPA = 5.0                 # la rueda sobresale 5 sobre la tapa superior
TAPA_T = 3.0
Z_TAPA_TOP = Z_RODAD - SOBRE_TAPA          # 110.1
Z_TAPA_BOT = Z_TAPA_TOP - TAPA_T           # 107.1
PLACA_T = 4.0
PLACA_Y = 250.0                  # cara interior de cada placa principal en +-250
L_PLACA = L_ZONA - 4.0           # 594: 2 de holgura por punta
Z_PLACA_LO, Z_PLACA_HI = 35.0, 106.0
NRUEDAS = 6                      # ruedas por eje
PASO_Y = 2 * PLACA_Y / NRUEDAS   # 83.33 entre centros de rueda
BUJE_OD, BUJE_ID = 26.7, 20.9    # PVC 3/4" SCH40
HEX_AF = 14.0                    # eje hexagonal 14 e/c (rueda: hex 14.5 pasante)
MUNON_D = 12.0                   # puntas torneadas O12 -> rodamiento 6001
ROD_OD, ROD_W = 28.0, 8.0        # 6001: 12x28x8, asiento en la placa
SPOOL_D, SPOOL_W = 40.0, 10.0    # carrete de o-ring en la punta motriz
MOTOR = (152.7, 118.1, 119.0)    # UniDrive medido
HOLG_TAPA = 2.0                  # holgura del recorte al envolvente

X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]   # +-261.625
Y_RUEDAS = [(j - (NRUEDAS - 1) / 2) * PASO_Y for j in range(NRUEDAS)]
# eje k par = DERECHO (motor cara -Y) · impar = IZQUIERDO (motor cara +Y)
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
cara = lambda k: -1 if k % 2 == 0 else +1


def rho(s):
    s = max(min(s, SMAX), -SMAX)
    return (9.0 - RARC) + sqrt(RARC * RARC - s * s)


def renv_perfil():
    """envolvente barrida real de la rueda v7 (independiente del azimut)."""
    sarr = np.linspace(-SMAX, SMAX, 200)
    aarr = np.linspace(0, 2 * np.pi, 160)
    S, A = np.meshgrid(sarr, aarr, indexing='ij')
    RHO = np.vectorize(rho)(S)
    P = np.stack([D0 + RHO * np.cos(A), S * CB + RHO * np.sin(A) * SB,
                  S * SB - RHO * np.sin(A) * CB], -1).reshape(-1, 3)
    rr, zz = np.hypot(P[:, 0], P[:, 1]), P[:, 2]
    zs = np.linspace(-W2, W2, 41)
    prof = []
    for z0 in zs:
        m = np.abs(zz - z0) < 0.5
        prof.append((float(rr[m].max()) if m.any() else 20.0, float(z0)))
    return prof


PERFIL_ENV = renv_perfil()
R_ENV_BORDE = PERFIL_ENV[0][0]   # radio del envolvente en el borde de la rueda


def rueda_env():
    """placeholder de rueda = solido de revolucion del envolvente barrido
    (volumen de barrido EXACTO: sirve para holguras y recortes de tapa)."""
    prof = [(1.0, -W2)] + PERFIL_ENV + [(1.0, W2)]
    return (cq.Workplane("XZ").polyline(prof).close()
            .revolve(360, (0, 0, 0), (0, 1, 0)))


def redondo2d(w, h, r):
    from shapely.geometry import box
    poly = box(-w / 2, -h / 2, w / 2, h / 2).buffer(-r).buffer(r, quad_segs=16)
    return cq.Workplane("XY").polyline(list(poly.exterior.coords)[:-1]).close()


def placa_principal(sy):
    """placa vertical portante: 8 asientos de rodamiento 6001 + colisas de
    ajuste vertical en las orejas (sistema de ajuste tipo Flowsort)."""
    h = Z_PLACA_HI - Z_PLACA_LO
    s = (cq.Workplane("XZ").rect(L_PLACA, h)
         .extrude(PLACA_T)
         .translate((0, sy * PLACA_Y + (PLACA_T if sy > 0 else 0),
                     (Z_PLACA_LO + Z_PLACA_HI) / 2)))
    for x in X_EJES:  # asiento pasante O28 (el rodamiento se retiene con tapa)
        s = s.cut(cq.Workplane("XZ").circle(ROD_OD / 2).extrude(40)
                  .translate((x, sy * (PLACA_Y + 20), Z_EJE)))
    for x in (-L_PLACA / 2 + 25, L_PLACA / 2 - 25):   # taladros de separador
        for z in (44.5,):
            s = s.cut(cq.Workplane("XZ").circle(4.25).extrude(40)
                      .translate((x, sy * (PLACA_Y + 20), z)))
    s = s.cut(cq.Workplane("XZ").circle(4.25).extrude(40)
              .translate((0, sy * (PLACA_Y + 20), 44.5)))
    return s


def eje(k):
    """eje hexagonal 14 e/c con puntas torneadas O12 (rodamiento 6001);
    la punta del lado motriz se alarga para el carrete."""
    c = cara(k)
    Lhex = 2 * PLACA_Y - 1.0
    s = (cq.Workplane("XZ").polygon(6, HEX_AF / cos(radians(30)))
         .extrude(Lhex).translate((0, Lhex / 2, 0)))
    for sgn in (-1, 1):
        L = 24.0 if sgn == c else 14.0
        s = s.union(cq.Workplane("XZ").circle(MUNON_D / 2).extrude(sgn * L)
                    .translate((0, sgn * (Lhex / 2), 0)))
    return s.translate((X_EJES[k], 0, Z_EJE))


def ruedas_y_bujes(k):
    """6 ruedas (envolvente) + bujes PVC entre ruedas y contra las placas."""
    piezas = []
    env = rueda_env()
    for j, y in enumerate(Y_RUEDAS):
        w = env.rotate((0, 0, 0), (1, 0, 0), 90).translate((X_EJES[k], y, Z_EJE))
        piezas.append((f'rueda_{mano(k)}_{k}_{j}', w))
    # bujes: 5 intermedios + 2 de extremo
    gaps = []
    for j in range(NRUEDAS - 1):
        gaps.append((Y_RUEDAS[j] + W2, Y_RUEDAS[j + 1] - W2))
    gaps.append((-PLACA_Y + 0.5, Y_RUEDAS[0] - W2))
    gaps.append((Y_RUEDAS[-1] + W2, PLACA_Y - 0.5))
    for i, (y0, y1) in enumerate(gaps):
        L = y1 - y0 - 1.0
        b = (cq.Workplane("XZ").circle(BUJE_OD / 2).circle(BUJE_ID / 2)
             .extrude(-L).translate((0, y0 + 0.5, 0))
             .translate((X_EJES[k], 0, Z_EJE)))
        piezas.append((f'buje_{k}_{i}', b))
    return piezas


def carrete(k):
    """carrete de o-ring en la punta motriz, entre placa y cara del larguero."""
    c = cara(k)
    y0 = c * (PLACA_Y + PLACA_T + 1.5)
    s = (cq.Workplane("XZ").circle(SPOOL_D / 2).extrude(c * SPOOL_W)
         .translate((X_EJES[k], y0, Z_EJE)))
    return s


def motor(caraY):
    """UniDrive (bbox medida) colgado de la cara interior de su placa, bajo
    el plano de ejes; su carrete alinea con los carretes de esa cara."""
    mx, my, mz = MOTOR
    xc = 0.0
    yc = caraY * (PLACA_Y - my / 2 - 2)
    zc = Z_PLACA_LO - 8 - mz / 2
    s = (cq.Workplane("XY").box(mx, my, mz).translate((xc, yc, zc)))
    sp = (cq.Workplane("XZ").circle(SPOOL_D / 2).extrude(caraY * SPOOL_W)
          .translate((xc, caraY * (PLACA_Y + PLACA_T + 1.5), zc)))
    return s.union(sp)


def oring(x0, x1, y, z0, z1):
    """correa o-ring O5 como 2 tramos rectos (placeholder visual)."""
    p0, p1 = np.array([x0, y, z0]), np.array([x1, y, z1])
    u = p1 - p0
    L = float(np.linalg.norm(u))
    return cq.Workplane(obj=cq.Solid.makeCylinder(
        2.5, L, cq.Vector(*p0), cq.Vector(*(u / L))))


def separadores():
    """3 tubos O12 con varilla M8 bajo el plano de ruedas (envolvente minimo
    z=51.1; tubo a z=44.5 -> tope 50.5, holgura 0.6 garantizada)."""
    piezas = []
    for i, x in enumerate((-L_PLACA / 2 + 25, 0.0, L_PLACA / 2 - 25)):
        t = (cq.Workplane("XZ").circle(6.0).circle(4.3)
             .extrude(2 * PLACA_Y).translate((x, PLACA_Y, 44.5)))
        v = (cq.Workplane("XZ").circle(4.0)
             .extrude(2 * (PLACA_Y + PLACA_T + 6))
             .translate((x, PLACA_Y + PLACA_T + 6, 44.5)))
        piezas.append((f'separador_{i}', t))
        piezas.append((f'varilla_M8_{i}', v))
    return piezas


def tapa_superior():
    """recortes MINIMOS: una ventana redondeada por rueda (48), dimensionada
    por el envolvente barrido + holgura; entre ventanas queda material."""
    dz = Z_RODAD - Z_TAPA_BOT                     # profundidad al plano inferior
    semix = sqrt(R_ENV ** 2 - (R_ENV - dz) ** 2)  # medio ancho del envolvente ahi
    vx = 2 * semix + 2 * HOLG_TAPA
    vy = 2 * W2 + 2 * HOLG_TAPA
    s = (cq.Workplane("XY").rect(L_ZONA - 2.0, 2 * (CARA_INT - 0.8))
         .extrude(TAPA_T).translate((0, 0, Z_TAPA_BOT)))
    for x in X_EJES:
        for y in Y_RUEDAS:
            v = (redondo2d(vx, vy, 8.0).extrude(TAPA_T + 2)
                 .translate((x, y, Z_TAPA_BOT - 1)))
            s = s.cut(v)
    return s, vx, vy


def tapa_inferior():
    """cierra por abajo; 2 ventanas minimas para los motores."""
    s = (cq.Workplane("XY").rect(L_ZONA - 2.0, 2 * (CARA_INT - 0.8))
         .extrude(TAPA_T).translate((0, 0, Z_PLACA_LO - TAPA_T)))
    mx, my, _ = MOTOR
    for cy in (-1, 1):
        v = (cq.Workplane("XY").rect(mx + 6, my + 6).extrude(TAPA_T + 2)
             .translate((0.0, cy * (PLACA_Y - my / 2 - 2), Z_PLACA_LO - TAPA_T - 1)))
        s = s.cut(v)
    return s


def tapa_lateral(sx):
    """tapa de extremo (entrada/salida del bloque)."""
    return (cq.Workplane("YZ").rect(2 * (CARA_INT - 0.8),
                                    Z_TAPA_BOT - (Z_PLACA_LO - TAPA_T))
            .extrude(sx * PLACA_T)
            .translate((sx * (L_ZONA / 2 - 1), 0,
                        (Z_TAPA_BOT + Z_PLACA_LO - TAPA_T) / 2)))


def mensula(sx, sy):
    """mensula de ajuste a los largueros: colisa vertical 9x25 (el sistema de
    ajuste de altura de la caja, estilo Flowsort)."""
    a = (cq.Workplane("XZ").rect(60, 40).extrude(4)
         .translate((sx * 200, sy * (CARA_INT - 0.1), 88)))
    a = a.cut(cq.Workplane("XZ").slot2D(25, 9, 90).extrude(20)
              .translate((sx * 200, sy * (CARA_INT + 10), 88)))
    b = (cq.Workplane("XY").rect(60, CARA_INT - PLACA_Y - PLACA_T).extrude(4)
         .translate((sx * 200, (sy * (CARA_INT + PLACA_Y + PLACA_T)) / 2, 106)))
    return a.union(b)


def contexto():
    """vecindario del ZP2026: 2 largueros + 3 rodillos O50 por lado (nivel)."""
    piezas = []
    for sy in (-1, 1):
        lg = (cq.Workplane("XY").rect(L_ZONA + 6 * PASO, 38)
              .extrude(190.5)
              .translate((0, sy * (CARA_INT + 19), Z_LARG_TOP - 190.5)))
        piezas.append((f'ZP_larguero_{ "izq" if sy>0 else "der"}', lg))
    for i in (1, 2, 3):
        for sx in (-1, 1):
            x = sx * (L_ZONA / 2 + (i - 0.5) * PASO)
            ro = (cq.Workplane("XZ").circle(25.0).extrude(2 * CARA_INT - 4)
                  .translate((x, CARA_INT - 2, 90.1)))
            piezas.append((f'ZP_rodillo_{i}{"+" if sx>0 else "-"}', ro))
    return piezas


def verificar(vx, vy):
    print('--- GATES bloque omni ---')
    top_rueda = Z_EJE + R_ENV
    print(f'nivel rodadura rueda={top_rueda:.1f} vs rodillos ZP={Z_RODAD:.1f} '
          f'-> {"OK" if abs(top_rueda - Z_RODAD) < 1e-6 else "FALLA"}')
    print(f'sobresale sobre tapa = {top_rueda - Z_TAPA_TOP:.1f} (pedido 5.0)')
    env_min_z = Z_EJE - R_ENV
    print(f'envolvente min z={env_min_z:.1f}; separador tope z=50.5 '
          f'-> holgura {env_min_z - 50.5:.1f}')
    gap_x = PASO - vx
    gap_y = PASO_Y - vy
    print(f'ventana tapa {vx:.1f} x {vy:.1f}; material entre ventanas: '
          f'x={gap_x:.1f}, y={gap_y:.1f} -> {"OK" if min(gap_x, gap_y) > 8 else "FALLA"}')
    borde = L_ZONA / 2 - (abs(X_EJES[0]) + vx / 2)
    print(f'ultima ventana al borde de tapa: {borde:.1f}')
    y_carrete_ext = PLACA_Y + PLACA_T + 1.5 + SPOOL_W
    print(f'carrete hasta y={y_carrete_ext:.1f} vs cara interior {CARA_INT:.1f} '
          f'-> holgura {CARA_INT - y_carrete_ext:.1f}')
    print(f'placa: borde sobre asiento rodamiento = {Z_PLACA_HI - (Z_EJE + ROD_OD/2):.1f}')
    print(f'bujes PVC: ID {BUJE_ID} vs vertices hex O16.17 -> holgura '
          f'{BUJE_ID - 14.0/cos(radians(30)):.2f}')


def build():
    asm = cq.Assembly(name='bloque_omni_zp2026')
    col = {
        'placa': cq.Color(0.55, 0.58, 0.62), 'tapa': cq.Color(0.75, 0.77, 0.80),
        'eje': cq.Color(0.35, 0.35, 0.38), 'der': cq.Color(0.16, 0.35, 0.55),
        'izq': cq.Color(0.60, 0.30, 0.12), 'buje': cq.Color(0.85, 0.85, 0.82),
        'motor': cq.Color(0.20, 0.45, 0.25), 'ctx': cq.Color(0.45, 0.45, 0.45),
        'sep': cq.Color(0.5, 0.5, 0.55), 'oring': cq.Color(0.1, 0.5, 0.35),
    }
    for sy in (-1, 1):
        asm.add(placa_principal(sy), name=f'placa_{"izq" if sy>0 else "der"}',
                color=col['placa'])
    ts, vx, vy = tapa_superior()
    asm.add(ts, name='tapa_superior', color=col['tapa'])
    asm.add(tapa_inferior(), name='tapa_inferior', color=col['tapa'])
    for sx in (-1, 1):
        asm.add(tapa_lateral(sx), name=f'tapa_lateral_{"+" if sx>0 else "-"}',
                color=col['tapa'])
        for sy in (-1, 1):
            asm.add(mensula(sx, sy), name=f'mensula_{sx}_{sy}', color=col['sep'])
    for nm, p in separadores():
        asm.add(p, name=nm, color=col['sep'])
    for k in range(NEJES):
        asm.add(eje(k), name=f'eje_{k}_{mano(k)}', color=col['eje'])
        asm.add(carrete(k), name=f'carrete_{k}', color=col['sep'])
        for nm, p in ruedas_y_bujes(k):
            c = col['der'] if '_der_' in nm else (col['izq'] if '_izq_' in nm
                                                  else col['buje'])
            asm.add(p, name=nm, color=c)
    for cy in (-1, 1):
        asm.add(motor(cy), name=f'motor_{"izq" if cy>0 else "der"}',
                color=col['motor'])
        ks = [k for k in range(NEJES) if cara(k) == cy]
        y = cy * (PLACA_Y + PLACA_T + 1.5 + SPOOL_W / 2)
        for a, b in zip(ks[:-1], ks[1:]):   # o-rings eje a eje
            for dz in (SPOOL_D / 2 - 2.5, -(SPOOL_D / 2 - 2.5)):
                asm.add(oring(X_EJES[a], X_EJES[b], y, Z_EJE + dz, Z_EJE + dz),
                        name=f'oring_{a}_{b}_{dz:+.0f}', color=col['oring'])
        zm = Z_PLACA_LO - 8 - MOTOR[2] / 2  # motor al eje central de su grupo
        km = ks[len(ks) // 2 - 1]
        for dx in (SPOOL_D / 2 - 2.5, -(SPOOL_D / 2 - 2.5)):
            asm.add(oring(0.0 + dx, X_EJES[km] + dx, y, zm, Z_EJE),
                    name=f'oring_motor_{km}_{dx:+.0f}', color=col['oring'])
    for nm, p in contexto():
        asm.add(p, name=nm, color=col['ctx'])
    return asm, vx, vy


if __name__ == '__main__':
    asm, vx, vy = build()
    verificar(vx, vy)
    asm.save(os.path.join(OUT, 'bloque_omni.step'))
    print('bloque_omni.step exportado')
