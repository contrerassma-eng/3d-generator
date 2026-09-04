# Tren motriz DETALLADO del bloque OMNI v6 — para STEP de fabricacion.
#
# Cambios de arquitectura que pidio Sergio (03-09):
#   A) POLEAS FUERA DEL RODAMIENTO, en VOLADIZO CORTO: el muñon del eje
#      atraviesa el F6801 del riel y la polea se monta por fuera.
#   B) MOTOR DESDE ADENTRO HACIA AFUERA: el cuerpo del motor va DENTRO del
#      modulo (bajo las ruedas), atraviesa el riel por una ventana O62 y su
#      BRIDA se atornilla a la cara EXTERIOR del riel; solo el eje y la
#      polea quedan fuera, en el plano de la correa.
#
# Motor real: StepperOnline 24E1K-30 (P Series NEMA 24 lazo cerrado)
#   brida 60x60 · cuerpo 107 · eje O10 x 21 con D-cut de 15 · 3 N.m ·
#   2 fases 1.8 deg · 5.0 A/fase · encoder 1000 PPR (4000 CPR)
#   COTAS MEDIDAS DEL STEP OFICIAL que subio Sergio (04-09):
#   brida 60x60 esquinas r5 · PATRON 50x50 M5 (NO 47.14: ese es NEMA 23) ·
#   piloto O38.1 · eje O10 x 22.6 SIN D-cut · cuerpo 110.8 · total 133.6 ·
#   conector del encoder sobresale 10 en Y
#
# Poleas: HTD 5M 20T con DIENTES REALES (paso 5, PLD 0.5715, profundidad
#   2.06, radio de valle 1.49) y barreno hexagonal 12.85 en las de eje.

import cadquery as cq
import numpy as np
from math import cos, sin, radians, pi
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ---- motor 24E1K-30 (cotas de ficha) ----
M_BRIDA, M_CUERPO = 60.0, 110.8    # medido del STEP real
M_PAT, M_PILOTO, M_PILOTO_H = 50.0, 38.1, 2.0   # PATRON REAL 50 (no 47.14)
M_EJE_D, M_EJE_L, M_DCUT_L = 10.0, 22.6, 0.0    # eje real: sin D-cut
M_DCUT_T = 9.0                      # cota sobre el plano del D-cut
M_ENC_D, M_ENC_L = 52.4, 22.8   # tapa trasera medida
M_CHAF = 4.0                        # chaflan de las esquinas de la brida

# ---- polea HTD 5M ----
HTD_P, HTD_PLD, HTD_H, HTD_R = 5.0, 0.5715, 2.06, 1.49
POL_Z = 20
POL_DP = POL_Z * HTD_P / pi         # 31.83
POL_OD = POL_DP - 2 * HTD_PLD       # 30.69
POL_W = 12.0                        # ancho de la polea (correa 5M-09)
POL_PEST = 1.5                      # pestana guia
HEX_POL = 12.85

# ---- geometria del modulo (v5) ----
Z_EJE = 83.1
RAIL_T, Y_RAIL_N = 4.0, -116.0
Y_RAIL_EXT = Y_RAIL_N - RAIL_T / 2  # -118 cara exterior
Y_RAIL_INT = Y_RAIL_N + RAIL_T / 2  # -114 cara interior
ROD_B = 5.0
Y_ROD_C = Y_RAIL_EXT + ROD_B / 2    # centro del F6801 (-115.5)
# planos de correa, en VOLADIZO CORTO fuera del riel
G = {'der': Y_RAIL_EXT - 1.5 - POL_W / 2,               # -125.5
     'izq': Y_RAIL_EXT - 1.5 - POL_W - 3.0 - POL_W / 2}  # -140.5
# el eje del motor mide 21: la polea izq no lo alcanza desde el riel, asi que
# ese motor va sobre un PEDESTAL que lo saca lo justo (gate D6).
PEDESTAL = {'der': 0.0,
            'izq': (G['izq'] + POL_W / 2) - (Y_RAIL_EXT - M_EJE_L) + 3.0}
EJE_AF, MUNON_D = 12.7, 12.0
Y_MUNON_FIN = G['izq'] - POL_W / 2 - 6.0        # -152.5


def tubo(ro, ri, ya, yb):
    """cilindro (o tubo) de y=ya a y=yb. OJO: en el plano XZ, extrude(+L) va
    hacia -Y, asi que hay que trasladar a yb. Este era EL BUG de la v6."""
    w = cq.Workplane("XZ").circle(ro)
    if ri:
        w = w.circle(ri)
    return w.extrude(yb - ya).translate((0, yb, 0))


def diente_htd_negativo(y0, y1):
    """los 20 valles del perfil HTD 5M, como solido a restar"""
    r_c = (POL_OD / 2 - HTD_H) + HTD_R
    tool = None
    for i in range(POL_Z):
        a = radians(360.0 * i / POL_Z)
        c = cq.Workplane("XZ").circle(HTD_R).extrude(y1 - y0 + 2) \
            .translate((r_c * cos(a), y1 + 1, r_c * sin(a)))
        tool = c if tool is None else tool.union(c)
    return tool


def polea_htd(y_centro, barreno='hex', cubo='fuera'):
    """polea HTD 5M 20T con dientes reales, pestana y prisionero M4.
    cubo='fuera': el cubo sale hacia -Y (poleas de eje, en voladizo).
    cubo='dentro': sale hacia +Y, hacia el motor (poleas de motor)."""
    y0, y1 = y_centro - POL_W / 2, y_centro + POL_W / 2
    s = tubo(POL_OD / 2, 0, y0, y1)
    s = s.cut(diente_htd_negativo(y0, y1))
    # pestana guia + cubo, los dos del mismo lado (asi el lado que mira al
    # riel queda LISO y se puede acercar sin tocar la chapa)
    if cubo == 'fuera':
        s = s.union(tubo(POL_OD / 2 + 2.0, 0, y0 - POL_PEST, y0))
        s = s.union(tubo(11.0, 0, y0 - POL_PEST - 6.0, y0 - POL_PEST))
        y_pris = y0 - POL_PEST - 3.0
    else:
        s = s.union(tubo(POL_OD / 2 + 2.0, 0, y1, y1 + POL_PEST))
        s = s.union(tubo(11.0, 0, y1 + POL_PEST, y1 + POL_PEST + 6.0))
        y_pris = y1 + POL_PEST + 3.0
    if barreno == 'hex':
        s = s.cut(cq.Workplane("XZ").polygon(6, HEX_POL / cos(radians(30)))
                  .extrude(80).translate((0, y1 + 20, 0)))
    else:                # barreno O10 h7: el eje real es LISO -> aprieta el
        s = s.cut(cq.Workplane("XZ").circle(M_EJE_D / 2 + 0.02)   # prisionero
                  .extrude(80).translate((0, y1 + 20, 0)))
    # prisionero M4 radial en el cubo
    s = s.cut(cq.Workplane("XY").circle(1.7).extrude(20)
              .translate((0, y_pris, 0)))
    return s


def eje_hex(y_int_pos=215.75):
    """eje hex 1/2" con muñon LARGO al lado motriz: atraviesa el F6801 y
    sobresale para la polea en voladizo corto."""
    y0 = Y_RAIL_INT - 0.25
    s = (cq.Workplane("XZ").polygon(6, EJE_AF / cos(radians(30)))
         .extrude(y_int_pos - y0).translate((0, y_int_pos, 0)))
    # muñon motriz (largo, hacia -Y)
    s = s.union(tubo(MUNON_D / 2, 0, Y_MUNON_FIN, y0))
    # muñon libre (corto, hacia +Y)
    s = s.union(tubo(MUNON_D / 2, 0, y_int_pos, y_int_pos + 10.0))
    # chaflanes de entrada
    for yy, d in ((Y_MUNON_FIN, 1), (y_int_pos + 10, -1)):
        cono = cq.Solid.makeCone(MUNON_D / 2 - 0.8, MUNON_D / 2 + 0.1, 0.8,
                                 cq.Vector(0, yy, 0), cq.Vector(0, -d, 0))
        big = cq.Solid.makeBox(30, 0.8, 30, cq.Vector(-15, yy if d > 0 else yy - 0.8, -15))
        s = s.cut(cq.Workplane(obj=big).cut(cq.Workplane(obj=cono)))
    return s


def nema24_real(pedestal=0.0):
    """MOTOR REAL: importa el STEP oficial de StepperOnline que subio Sergio
    y lo coloca en el modulo (eje hacia -Y, cuerpo hacia +Y por dentro).
    En el STEP el eje apunta a +Z y la cara de la brida esta en z=11.95."""
    p = os.path.join(OUT, 'NEMA24_UP', 'NEMA-24_stepperOnline.STEP')
    s = cq.importers.importStep(p)
    # centrar la brida (60x60 en 0..60) y llevar su cara a y = Y_RAIL_EXT-pedestal
    s = s.translate((-30.0, -30.0, -11.95))       # origen en el centro de la cara
    s = s.rotate((0, 0, 0), (1, 0, 0), 90)        # eje +Z -> -Y
    return s.translate((0, Y_RAIL_EXT - pedestal, 0))


def nema24_24e1k30(pedestal=0.0):
    """(modelo aproximado anterior; se conserva por si hace falta comparar)"""
    y_b = Y_RAIL_EXT - pedestal   # cara de la brida (con pedestal si lo lleva)
    from shapely.geometry import box as sbox
    poly = sbox(-M_BRIDA / 2, -M_BRIDA / 2, M_BRIDA / 2, M_BRIDA / 2)
    poly = poly.buffer(-M_CHAF).buffer(M_CHAF, join_style=2)   # esquinas cortadas
    coords = list(poly.exterior.coords)[:-1]
    perfil = lambda: cq.Workplane("XZ").polyline(coords).close()
    s = perfil().extrude(-10.0).translate((0, y_b + 10.0, 0))        # brida 10
    s = s.union(cq.Workplane("XZ").circle(M_PILOTO / 2).extrude(M_PILOTO_H)
                .translate((0, y_b + 10.0 - 10.0, 0)))               # piloto
    # cuerpo (apilado de laminas) y tapa trasera
    s = s.union(perfil().extrude(-(M_CUERPO - 20.0)).translate((0, y_b + M_CUERPO - 10.0, 0)))
    s = s.union(perfil().extrude(-10.0).translate((0, y_b + M_CUERPO, 0)))
    # encoder
    s = s.union(cq.Workplane("XZ").circle(M_ENC_D / 2).extrude(-M_ENC_L)
                .translate((0, y_b + M_CUERPO + M_ENC_L, 0)))
    # conector del encoder (cable de retorno) radial
    s = s.union(cq.Workplane("XY").box(22, 14, 12)
                .translate((0, y_b + M_CUERPO + M_ENC_L / 2, M_ENC_D / 2 + 5)))
    # eje O10 con D-cut, hacia -Y
    ej = (cq.Workplane("XZ").circle(M_EJE_D / 2).extrude(M_EJE_L)
          .translate((0, y_b, 0)))
    ej = ej.cut(cq.Workplane("XY").box(20, M_DCUT_L, 20)
                .translate((M_DCUT_T + 10 - 0.0, y_b - M_EJE_L + M_DCUT_L / 2, 0)))
    s = s.union(ej)
    # 4 tornillos M5 del patron NEMA 24
    d = M_PAT / 2
    for dx in (-d, d):
        for dz in (-d, d):
            s = s.cut(cq.Workplane("XZ").circle(2.6).extrude(-14.0)
                      .translate((dx, y_b + 10.0, dz)))
    return s


def pedestal_motor():
    """espaciador entre la brida del motor izq y el riel: saca el motor lo
    justo para que su eje de 21 atraviese la polea del segundo plano."""
    t = PEDESTAL['izq']
    from shapely.geometry import box as sbox
    poly = sbox(-M_BRIDA / 2, -M_BRIDA / 2, M_BRIDA / 2, M_BRIDA / 2)
    poly = poly.buffer(-M_CHAF).buffer(M_CHAF, join_style=2)
    s = (cq.Workplane("XZ").polyline(list(poly.exterior.coords)[:-1]).close()
         .extrude(-t).translate((0, Y_RAIL_EXT, 0)))
    s = s.cut(cq.Workplane("XZ").circle(M_PILOTO / 2 + 0.4).extrude(-t - 2)
              .translate((0, Y_RAIL_EXT + 1, 0)))
    d = M_PAT / 2
    for dx in (-d, d):
        for dz in (-d, d):
            s = s.cut(cq.Workplane("XZ").circle(2.6).extrude(-t - 2)
                      .translate((dx, Y_RAIL_EXT + 1, dz)))
    return s


def rodamiento_f6801(y_ext):
    s = (cq.Workplane("XZ").circle(21.0 / 2).circle(17.4 / 2).extrude(-ROD_B)
         .translate((0, y_ext, 0)))
    s = s.union(cq.Workplane("XZ").circle(23.2 / 2).circle(17.4 / 2).extrude(1.0)
                .translate((0, y_ext, 0)))
    s = s.union(cq.Workplane("XZ").circle(15.0 / 2).circle(MUNON_D / 2).extrude(-ROD_B)
                .translate((0, y_ext, 0)))
    for dy in (0.3, ROD_B - 0.8):
        s = s.union(cq.Workplane("XZ").circle(17.3 / 2).circle(15.1 / 2)
                    .extrude(-0.5).translate((0, y_ext - dy, 0)))
    return s


def verificar():
    print('--- TREN MOTRIZ v6 (poleas en voladizo, motor de adentro afuera) ---')
    print(f'motor REAL (STEP oficial): brida {M_BRIDA} · cuerpo {M_CUERPO} · '
          f'eje O{M_EJE_D}x{M_EJE_L} LISO · PATRON {M_PAT} (no 47.14) · piloto O{M_PILOTO}')
    print(f'polea HTD 5M {POL_Z}T: Dp {POL_DP:.2f} · OD {POL_OD:.2f} · '
          f'valle O{2*HTD_R:.2f} a r{POL_OD/2-HTD_H+HTD_R:.2f} · ancho {POL_W}')
    for h in ('der', 'izq'):
        vol = abs(G[h] - Y_ROD_C)
        F = 2 * 3000 / POL_DP
        # reparto entre rodamientos (separacion 330) con la polea en voladizo
        P_cerca = F * (1 + vol / 330.0)
        n = 298.0
        L10 = (1330 / P_cerca) ** 3 * 1e6 / (60 * n)
        L10_6001 = (5100 / P_cerca) ** 3 * 1e6 / (60 * n)
        print(f'{h}: plano de correa y={G[h]:.1f} · VOLADIZO {vol:.1f} mm desde el '
              f'rodamiento · carga en el proximo {P_cerca:.0f} N -> '
              f'F6801 L10 {L10:.0f} h · 6001-2RS {L10_6001/1000:.0f}k h')
    print(f'muñon motriz: de {Y_RAIL_INT:.1f} a {Y_MUNON_FIN:.1f} '
          f'({abs(Y_MUNON_FIN - Y_RAIL_INT):.1f} mm) · atraviesa el riel y las 2 poleas')
    print(f'separacion entre planos de correa: {abs(G["der"]-G["izq"]):.1f} mm '
          f'(correa 5M-09 de 9 -> luz {abs(G["der"]-G["izq"]) - POL_W:.1f})')
    y_cola = Y_RAIL_EXT + M_CUERPO + M_ENC_L
    print(f'motor: brida en {Y_RAIL_EXT} (cara exterior del riel) · cuerpo hacia '
          f'ADENTRO hasta y={y_cola:.1f} · bajo las ruedas (borde -57.3) '
          f'{"OK: pasa bajo las ruedas" if y_cola > -57.3 else "revisar"}')
    print(f'   el eje sale {M_EJE_L} hacia -Y: llega a y={Y_RAIL_EXT - M_EJE_L:.1f}; '
          f'polea der centrada en {G["der"]:.1f} -> '
          f'{"OK" if G["der"] > Y_RAIL_EXT - M_EJE_L else "NO ALCANZA"}')
    for h in ('der', 'izq'):
        yb = Y_RAIL_EXT - PEDESTAL[h]
        y_fin = yb - M_EJE_L
        p0, p1 = G[h] - POL_W / 2, G[h] + POL_W / 2
        agarre = min(p1, yb) - max(p0, y_fin)
        print(f'   motor {h}: pedestal {PEDESTAL[h]:.1f} · brida en {yb:.1f} · '
              f'eje hasta {y_fin:.1f} · polea {p0:.1f}..{p1:.1f} -> agarre '
              f'{agarre:.1f} de {POL_W} {"OK" if agarre >= POL_W - 0.1 else "CORTO"}')


if __name__ == '__main__':
    verificar()
    asm = cq.Assembly(name='tren_motriz_v6')
    piezas = [
        ('motor_REAL_der', nema24_real(PEDESTAL['der'])),
        ('motor_REAL_izq_con_pedestal', nema24_real(PEDESTAL['izq'])),
        ('pedestal_motor_izq', pedestal_motor()),
        ('eje_hex_1_2', eje_hex()),
        ('polea_HTD5M_20T_hex', polea_htd(G['der'])),
        ('polea_HTD5M_20T_motor_Dcut', polea_htd(G['der'], barreno='D')),
        ('F6801ZZ', rodamiento_f6801(Y_RAIL_EXT)),
    ]
    for nm, p in piezas:
        asm.add(p, name=nm)
        cq.exporters.export(p, os.path.join(OUT, f'tm_{nm}.step'))
        cq.exporters.export(p, os.path.join(OUT, f'tm_{nm}.stl'),
                            tolerance=0.02, angularTolerance=0.15)
        print(f'  {nm}: STEP + STL')
    asm.save(os.path.join(OUT, 'tren_motriz_v6.step'))
    print('tren_motriz_v6.step OK')
