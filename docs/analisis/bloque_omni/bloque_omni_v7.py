# Bloque OMNI v7 — ENSAMBLE COMPLETO con las placas en estilo Flowsort.
#
# Dos cosas que arregla respecto de la v6:
#  1) Las placas de soporte pasan a tener el LENGUAJE DE CHAPA del Flowsort
#     (ver placas_flowsort.py: colisas obround, columnas de ajuste, alas
#     plegadas, ventanas de aligeramiento, lamas, cancamos).
#  2) EL STEP ANTERIOR ERA UN CATALOGO, NO UN ENSAMBLE: las 7 piezas estaban
#     todas en x=0 apiladas unas dentro de otras, por eso al abrirlo solo se
#     veia "un motor y un eje". Aqui cada pieza va en su POSICION REAL.
#
# Montaje del motor (queda fijado aqui): la brida del NEMA 24 apoya en la CARA
# INTERIOR del riel (y=-114), el cuerpo entra al modulo bajo las ruedas y solo
# el eje sale por el piloto O39.2. El motor de la familia lejana lleva polea
# de CUBO LARGO hacia el motor (15 mm) para alcanzar el segundo plano de
# correa sin pedestal: asi las dos estaciones de motor son identicas y los dos
# rieles siguen siendo la misma pieza.

import cadquery as cq
from math import pi
import os
from shapely.geometry import Point
from shapely.ops import unary_union

import tren_motriz as tm
import placas_flowsort as pf

OUT = os.path.dirname(os.path.abspath(__file__))
P = lambda n: os.path.join(OUT, n)

Y_BRIDA = pf.Y_RAIL_INT              # -114: brida contra la cara interior
HUB_LARGO = 13.0                     # cubo de la polea del motor lejano


def tubo(ro, ri, ya, yb):
    w = cq.Workplane("XZ").circle(ro)
    if ri:
        w = w.circle(ri)
    return w.extrude(yb - ya).translate((0, yb, 0))


# ---------------- piezas del tren motriz, EN SU SITIO ----------------
def motor(h):
    return tm.nema24_real(pedestal=-pf.RAIL_T).translate((pf.X_MOTOR[h], 0, pf.ZM))


def polea_motor(h):
    p = tm.polea_htd(tm.G[h], barreno='D', cubo='dentro')
    if abs(tm.G[h]) > abs(tm.G['der']):          # familia del plano lejano
        y1 = tm.G[h] + tm.POL_W / 2 + tm.POL_PEST
        p = p.union(tubo(11.0, tm.M_EJE_D / 2 + 0.02, y1, y1 + HUB_LARGO))
    return p.translate((pf.X_MOTOR[h], 0, pf.ZM))


def polea_eje(k):
    return tm.polea_htd(tm.G[pf.mano(k)]).translate((pf.X_EJES[k], 0, pf.Z_EJE))


def eje(k):
    return tm.eje_hex().translate((pf.X_EJES[k], 0, pf.Z_EJE))


def rodamiento(k, sy):
    """F6801ZZ embutido DESDE FUERA en la chapa de 4 mm del riel."""
    if sy < 0:
        ya, yb, fa, fb = pf.Y_RAIL_EXT, pf.Y_RAIL_EXT + 5.0, pf.Y_RAIL_EXT - 1.0, pf.Y_RAIL_EXT
    else:
        ye = pf.Y_RAIL_P + pf.RAIL_T / 2
        ya, yb, fa, fb = ye - 5.0, ye, ye, ye + 1.0
    s = tubo(21.0 / 2, 17.4 / 2, ya, yb)
    s = s.union(tubo(23.2 / 2, 17.4 / 2, fa, fb))
    s = s.union(tubo(15.0 / 2, tm.MUNON_D / 2, ya, yb))
    for f in (0.3, 4.2):
        s = s.union(tubo(17.3 / 2, 15.1 / 2, ya + f, ya + f + 0.5))
    return s.translate((pf.X_EJES[k], 0, pf.Z_EJE))


def idler(h, i):
    """Tensor de la correa: rodillo liso sobre perno que atraviesa el riel por
    una colisa vertical (asi se da y se quita tension, §6.7 del manual)."""
    x, z = pf.TENSORES[h][i]
    yc = tm.G[h]
    s = tubo(pf.IDLER_D / 2, 4.1, yc - pf.IDLER_W / 2, yc + pf.IDLER_W / 2)
    s = s.union(tubo(4.0, 0, yc - pf.IDLER_W / 2, pf.Y_RAIL_INT + 6.0))
    s = s.union(tubo(9.0, 0, pf.Y_RAIL_INT, pf.Y_RAIL_INT + 6.0))
    return s.translate((x, 0, z))


def correa(h):
    """Correa HTD 5M-09 por familia: envolvente comun (todas las poleas giran
    en el mismo sentido) sobre el motor y las 4 poleas de eje."""
    hull = pf.envolvente(h)
    ext = hull.buffer(2.5, quad_segs=72)
    inn = hull.buffer(-tm.HTD_PLD, quad_segs=72)
    yc = tm.G[h]
    b = 9.0
    s = (cq.Workplane("XZ").polyline([(p[0], p[1]) for p in list(ext.exterior.coords)[:-1]])
         .close().extrude(b).translate((0, yc + b / 2, 0)))
    s = s.cut(cq.Workplane("XZ")
              .polyline([(p[0], p[1]) for p in list(inn.exterior.coords)[:-1]])
              .close().extrude(b + 4).translate((0, yc + b / 2 + 2, 0)))
    return s


def rueda_envolvente(k, y):
    """Envolvente barrida de la mecanum v9 (el solido real va aparte: el STEP
    de 32 ruedas completas no lo abre ningun visor)."""
    r = tm.cq.Workplane("XZ")
    s = (cq.Workplane("XZ").circle(pf.R_ENV).extrude(2 * pf.W2)
         .translate((0, y + pf.W2, 0)))
    s = s.cut(cq.Workplane("XZ").circle(pf.R_ENV - 4.0).extrude(2 * pf.W2 - 12)
              .translate((0, y + pf.W2 - 6, 0)))
    s = s.union(tubo(15.0, 6.5, y - pf.W2, y + pf.W2))
    return s.translate((pf.X_EJES[k], 0, pf.Z_EJE))


# ---------------- gates ----------------
def verificar():
    print('=== BLOQUE OMNI v7 — placas estilo Flowsort + ENSAMBLE real ===')
    y_eje_fin = Y_BRIDA - tm.M_EJE_L
    print(f'motor: brida en y={Y_BRIDA} (cara interior del riel) · cuerpo hasta '
          f'y={Y_BRIDA + tm.M_CUERPO:.1f} · cola/encoder hasta '
          f'{Y_BRIDA + tm.M_CUERPO + tm.M_ENC_L:.1f} · eje hasta {y_eje_fin:.1f}')
    for h in ('der', 'izq'):
        p0, p1 = tm.G[h] - tm.POL_W / 2, tm.G[h] + tm.POL_W / 2
        agarre = min(p1, Y_BRIDA) - max(p0, y_eje_fin)
        hub = HUB_LARGO if abs(tm.G[h]) > abs(tm.G['der']) else 0.0
        p1h = p1 + tm.POL_PEST
        tot = agarre + min(hub, Y_BRIDA - p1h) if hub else agarre
        print(f'  motor {h}: plano {tm.G[h]:.1f} · polea {p0:.1f}..{p1:.1f} · '
              f'agarre en dentado {agarre:.1f} + cubo largo {hub:.0f} '
              f'-> {tot:.1f} mm de eje tomado ' + ('OK' if tot >= 12 else 'CORTO'))
        if hub:
            print(f'     cubo llega a y={p1h + hub:.1f}; cara exterior del riel '
                  f'{pf.Y_RAIL_EXT} -> luz {pf.Y_RAIL_EXT - (p1h + hub):.1f}')
    F = 2 * 3000 / tm.POL_DP
    for h in ('der', 'izq'):
        vol = abs(tm.G[h] - (pf.Y_RAIL_EXT + 2.5))
        Pc = F * (1 + vol / 330.0)
        print(f'  {h}: voladizo {vol:.1f} · carga rodamiento proximo {Pc:.0f} N · '
              f'F6801 L10 {(1330/Pc)**3*1e6/(60*298)/1000:.1f}k h · '
              f'6001-2RS {(5100/Pc)**3*1e6/(60*298)/1000:.0f}k h')
    print(f'placas: riel z {pf.RAIL_Z0}..{pf.RAIL_Z1} ({pf.RAIL_Z1-pf.RAIL_Z0:.1f} '
          f'de alto) · escuadras en x {[round(x,2) for x in pf.X_ESC]}')
    print(f'estilo: colisas M6 {pf.COL_W}x{24.0} y M5 {pf.COL5_W}x14 · esquinas R'
          f'{pf.BORDE_R} · alas {pf.ALA} · ventanas {pf.VENT_W}x{pf.VENT_L} · '
          f'lamas {pf.LAMA_W}x{pf.LAMA_L} paso {pf.LAMA_P} · pasacables O{pf.GROMMET_D}')


# ---------------- ensamble ----------------
def ensamble(con_ruedas=True):
    a = cq.Assembly(name='bloque_omni_v7')
    col = cq.Color
    a.add(pf.placa_base(), name='placa_base', color=col(0.62, 0.64, 0.67))
    for i, xt in enumerate(pf.X_TRAV):
        a.add(pf.travesano(xt), name=f'travesano_{i}', color=col(0.55, 0.57, 0.60))
    for sy in (-1, 1):
        a.add(pf.riel(sy), name=f'riel_{"N" if sy < 0 else "P"}',
              color=col(0.70, 0.72, 0.75))
        for j, x in enumerate(pf.X_ESC):
            a.add(pf.escuadra(x, sy), name=f'escuadra_{"N" if sy<0 else "P"}{j}',
                  color=col(0.60, 0.62, 0.65))
    for h in ('der', 'izq'):
        a.add(pf.cuna_motor(h), name=f'cuna_motor_{h}', color=col(0.45, 0.47, 0.50))
        a.add(motor(h), name=f'motor_NEMA24_{h}', color=col(0.30, 0.32, 0.35))
        a.add(polea_motor(h), name=f'polea_motor_{h}', color=col(0.20, 0.20, 0.22))
        a.add(correa(h), name=f'correa_HTD5M_{h}', color=col(0.12, 0.12, 0.13))
        for j in range(len(pf.TENSORES[h])):
            a.add(idler(h, j), name=f'tensor_{h}{j}', color=col(0.25, 0.27, 0.30))
    for k in range(pf.NEJES):
        a.add(eje(k), name=f'eje_{k}', color=col(0.75, 0.76, 0.78))
        a.add(polea_eje(k), name=f'polea_eje_{k}', color=col(0.20, 0.20, 0.22))
        a.add(pf.separadores(k), name=f'separadores_{k}', color=col(0.85, 0.86, 0.88))
        for sy in (-1, 1):
            a.add(rodamiento(k, sy), name=f'F6801_{k}{"N" if sy<0 else "P"}',
                  color=col(0.80, 0.81, 0.83))
        if con_ruedas:
            for i, y in enumerate(pf.Y_RUEDAS):
                a.add(rueda_envolvente(k, y), name=f'rueda_env_{k}{i}',
                      color=col(0.78, 0.52, 0.22))
    tap, vx, vy = pf.tapa_superior()
    a.add(tap, name='tapa_superior', color=col(0.35, 0.36, 0.38))
    for i in range(2):
        a.add(pf.tapa_ciega(i), name=f'tapa_ciega_{i}', color=col(0.35, 0.36, 0.38))
    return a, vx, vy


def tren_ensamblado():
    """SOLO el tren motriz, pero con TODO en su posicion real (esto es lo que
    el STEP anterior no hacia)."""
    a = cq.Assembly(name='tren_motriz_ensamblado')
    for h in ('der', 'izq'):
        a.add(motor(h), name=f'motor_NEMA24_{h}')
        a.add(polea_motor(h), name=f'polea_motor_{h}')
        a.add(correa(h), name=f'correa_HTD5M_{h}')
        for j in range(len(pf.TENSORES[h])):
            a.add(idler(h, j), name=f'tensor_{h}{j}')
    for k in range(pf.NEJES):
        a.add(eje(k), name=f'eje_{k}')
        a.add(polea_eje(k), name=f'polea_eje_{k}')
        for sy in (-1, 1):
            a.add(rodamiento(k, sy), name=f'F6801_{k}{"N" if sy<0 else "P"}')
    return a


PIEZAS = [
    ('riel_flowsort', lambda: pf.riel(-1)),
    ('escuadra', lambda: pf.escuadra(0.0, -1)),
    ('placa_base', pf.placa_base),
    ('cuna_motor', lambda: pf.cuna_motor('der')),
    ('travesano', lambda: pf.travesano(pf.X_TRAV[0])),
    ('tapa_superior', lambda: pf.tapa_superior()[0]),
    ('tapa_ciega', lambda: pf.tapa_ciega(0)),
    ('separadores_eje', lambda: pf.separadores(0)),
    ('eje_hex_1_2', tm.eje_hex),
    ('polea_HTD5M_20T_hex', lambda: tm.polea_htd(0.0)),
    ('polea_motor_cubo_largo', lambda: polea_motor('izq').translate(
        (-pf.X_MOTOR['izq'], 0, -pf.ZM))),
]

if __name__ == '__main__':
    verificar()
    for nm, f in PIEZAS:
        s = f()
        cq.exporters.export(s, P(f'v7_{nm}.step'))
        cq.exporters.export(s, P(f'v7_{nm}.stl'), tolerance=0.03, angularTolerance=0.2)
        print(f'  pieza {nm}: STEP + STL')
    tren_ensamblado().save(P('tren_motriz_ENSAMBLADO.step'))
    print('tren_motriz_ENSAMBLADO.step OK')
    a, vx, vy = ensamble()
    a.save(P('bloque_omni_v7.step'))
    print(f'bloque_omni_v7.step OK · ventana de rueda {vx:.1f}x{vy:.1f} · '
          f'{len(list(a.traverse()))} nodos')
