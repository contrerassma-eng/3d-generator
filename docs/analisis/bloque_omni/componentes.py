# Biblioteca de COMPONENTES del bloque OMNI — un STEP por componente.
#
# Sergio (05-09): "You must use each step file for the belts, for the plate,
# for each component like wheels... bolts, nuts, washers, motors, belts...
# with all details."
#
# Aqui se genera UNA VEZ cada componente con detalle real y se exporta a
# componentes_step/. El ensamble (bloque_omni_v8.py) NO vuelve a modelar nada:
# importa esos STEP y los instancia. Como el exportador STEP guarda un producto
# por pieza unica y N instancias, el detalle sale casi gratis en el ensamble.
#
# Detalle que llevan:
#   - tornillos y tuercas con ROSCA METRICA HELICOIDAL de verdad (perfil ISO
#     68-1 truncado, barrido sobre helice), hexagono interior, chaflan de
#     entrada y cabeza a cota de norma.
#   - arandelas planas DIN 125 y grower DIN 127 (con su rampa y su corte).
#   - correas HTD 5M-09 con los DIENTES REALES por dentro, sobre el trazado
#     de la correa (no una banda lisa).

import cadquery as cq
import numpy as np
from math import sqrt, sin, cos, tan, radians, atan2, hypot, pi
import os

OUT = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(OUT, 'componentes_step')
os.makedirs(DIR, exist_ok=True)

# ---- cotas de norma (mm) ----
# d : (paso, D_cabeza_912, h_cabeza_912, hex_912, s_tuerca, m_tuerca,
#      D_arandela, t_arandela, D_cabeza_avell, hex_avell)
NORMA = {
    4.0: (0.70, 7.0, 4.0, 3.0, 7.0, 3.2, 9.0, 0.8, 8.96, 2.5),
    5.0: (0.80, 8.5, 5.0, 4.0, 8.0, 4.0, 10.0, 1.0, 10.0, 3.0),
    6.0: (1.00, 10.0, 6.0, 5.0, 10.0, 5.0, 12.0, 1.6, 12.0, 4.0),
    8.0: (1.25, 13.0, 8.0, 6.0, 13.0, 6.5, 16.0, 1.6, 16.4, 5.0),
    10.0: (1.50, 16.0, 10.0, 8.0, 17.0, 8.0, 20.0, 2.0, 20.0, 6.0),
}


def _helice_rosca(d, p, L, z0=0.0, holgura=0.0):
    """cordon helicoidal del perfil ISO truncado, listo para unir o restar."""
    H = p * sqrt(3) / 2
    r_raiz = d / 2 - 5 * H / 8 + holgura
    r_cre = d / 2 - H / 8 + holgura
    helix = cq.Wire.makeHelix(pitch=p, height=L + 2 * p, radius=r_raiz,
                              center=cq.Vector(0, 0, z0 - p))
    prof = (cq.Workplane("XZ", origin=(r_raiz, 0, z0 - p))
            .polyline([(0, -p / 2), (r_cre - r_raiz, -p / 16),
                       (r_cre - r_raiz, p / 16), (0, p / 2)]).close())
    return prof.sweep(cq.Workplane(obj=helix), isFrenet=True), r_raiz, r_cre


def _caja(d, z0, z1):
    return (cq.Workplane("XY").box(6 * d, 6 * d, z1 - z0, centered=(True, True, False))
            .translate((0, 0, z0)))


def vastago_roscado(d, L, z0=0.0):
    """Vastago con ROSCA METRICA HELICOIDAL real de z0 a z0+L, con chaflan de
    entrada. Se entrega como COMPOUND de nucleo + cordon: el cordon es tangente
    al nucleo, asi que el volumen es exacto y no hace falta una fusion booleana
    (que OCCT no aguanta en helices largas)."""
    p = NORMA[d][0]
    sw, r_raiz, r_cre = _helice_rosca(d, p, L, z0)
    nucleo = cq.Workplane("XY").circle(r_raiz).extrude(L).translate((0, 0, z0))
    rec = _caja(d, z0 - 4 * p, z0).union(_caja(d, z0 + L, z0 + L + 4 * p))
    sw = sw.cut(rec)
    zt, c = z0 + L, 0.9
    ch = (cq.Workplane("XZ")
          .polyline([(r_cre - c, zt), (r_cre + 2.0, zt), (r_cre + 2.0, zt - c - 2.0)])
          .close().revolve(360, (0, 0, 0), (0, 0, 1)))
    return cq.Compound.makeCompound([nucleo.cut(ch).val(), sw.cut(ch).val()])


def _hex_hueco(af, prof, z_top):
    return (cq.Workplane("XY").polygon(6, af / cos(radians(30)))
            .extrude(-prof).translate((0, 0, z_top)))


def din912(d, L):
    """tornillo de cabeza cilindrica con hexagono interior (ISO 4762 / DIN 912).
    Rosca completa. Origen en la cara de apoyo de la cabeza, vastago hacia -Z."""
    p, Dk, k, hexs = NORMA[d][0], NORMA[d][1], NORMA[d][2], NORMA[d][3]
    cab = cq.Workplane("XY").circle(Dk / 2).extrude(k)
    cab = cab.edges(">Z").fillet(0.4)
    cab = cab.cut(_hex_hueco(hexs, k * 0.62, k))
    return cq.Compound.makeCompound(
        [cab.val()] + list(vastago_roscado(d, L, z0=-L).Solids()))


def iso10642(d, L):
    """tornillo avellanado 90 grados con hexagono interior (ISO 10642).
    Es el M5x10 que el manual del Flowsort usa en la tapa superior."""
    p, Dk, hexs = NORMA[d][0], NORMA[d][8], NORMA[d][9]
    k = (Dk - d) / 2 / tan(radians(45))
    cab = (cq.Workplane("XY").circle(d / 2).workplane(offset=k)
           .circle(Dk / 2).loft())
    cab = cab.cut(_hex_hueco(hexs, k * 0.75, k))
    return cq.Compound.makeCompound(
        [cab.val()] + list(vastago_roscado(d, L, z0=-L).Solids()))


def _helice_rosca_int(d, p, L, holgura=0.05):
    """cordon helicoidal de una ROSCA INTERIOR: nace en el taladro (diametro
    mayor) y crece HACIA DENTRO hasta el diametro menor."""
    H = p * sqrt(3) / 2
    r_tal = d / 2 + holgura
    r_cre = d / 2 - 5 * H / 8 + holgura
    helix = cq.Wire.makeHelix(pitch=p, height=L + 2 * p, radius=r_tal,
                              center=cq.Vector(0, 0, -p))
    prof = (cq.Workplane("XZ", origin=(r_tal, 0, -p))
            .polyline([(0, -p / 2), (r_cre - r_tal, -p / 16),
                       (r_cre - r_tal, p / 16), (0, p / 2)]).close())
    return prof.sweep(cq.Workplane(obj=helix), isFrenet=True), r_tal


def din934(d):
    """tuerca hexagonal con ROSCA INTERIOR real."""
    s, m = NORMA[d][4], NORMA[d][5]
    n = cq.Workplane("XY").polygon(6, s / cos(radians(30))).extrude(m)
    n = n.edges(">Z or <Z").chamfer(min(0.6, m / 6))     # chaflanes de norma
    p = NORMA[d][0]
    sw, r_tal = _helice_rosca_int(d, p, m)
    n = n.cut(cq.Workplane("XY").circle(r_tal).extrude(m + 4).translate((0, 0, -2)))
    sw = sw.cut(_caja(d, -4 * p, 0.0).union(_caja(d, m, m + 4 * p)))
    return cq.Compound.makeCompound([n.val()] + list(sw.val().Solids()))


def din125(d):
    """arandela plana."""
    D, t = NORMA[d][6], NORMA[d][7]
    return cq.Workplane("XY").circle(D / 2).circle(d / 2 + 0.2).extrude(t)


def din127(d):
    """arandela grower: anillo abierto con la rampa de un espesor."""
    D, t = NORMA[d][6] - 1.0, NORMA[d][7] * 1.1
    a = cq.Workplane("XY").circle(D / 2).circle(d / 2 + 0.15).extrude(t)
    corte = cq.Workplane("XY").rect(D, 1.4).extrude(3 * t).translate((D / 4, 0, -t))
    a = a.cut(corte)
    # rampa: se inclina el anillo cortando con dos planos
    cuna = (cq.Workplane("XZ").polyline([(0, 0), (D, 0), (D, t * 0.9)]).close()
            .extrude(-D).translate((0, D / 2, t * 0.55)))
    return a.cut(cuna)


# ---------------- correa HTD 5M-09 con dientes reales ----------------
HTD_P, HTD_PLD, HTD_H, HTD_R = 5.0, 0.5715, 2.06, 1.49
CORREA_W, CORREA_ESP = 9.0, 3.6      # ancho y espesor total del 5M


def _muestrea(poly, paso):
    """puntos equiespaciados (paso) sobre el contorno cerrado, con su tangente"""
    xs = np.array(poly.exterior.coords)
    seg = np.diff(xs, axis=0)
    L = np.hypot(seg[:, 0], seg[:, 1])
    s = np.concatenate([[0], np.cumsum(L)])
    total = s[-1]
    n = int(round(total / paso))
    out = []
    for i in range(n):
        t = i * total / n
        j = np.searchsorted(s, t) - 1
        j = min(max(j, 0), len(seg) - 1)
        u = (t - s[j]) / L[j]
        pt = xs[j] + u * seg[j]
        tg = seg[j] / L[j]
        out.append((pt[0], pt[1], atan2(tg[1], tg[0])))
    return out, total, n


def correa_htd(linea_primitiva, ancho=CORREA_W):
    """Correa HTD 5M-09 REAL: cuerpo de 3.6 mm por fuera de la linea primitiva
    y los dientes (radio de valle 1.49, profundidad 2.06) por DENTRO, uno cada
    5 mm de paso, colocados sobre la propia trayectoria."""
    ext = linea_primitiva.buffer(CORREA_ESP - HTD_PLD, quad_segs=72)
    inn = linea_primitiva.buffer(-HTD_PLD, quad_segs=72)
    perfil = lambda poly: (cq.Workplane("XZ")
                           .polyline([(q[0], q[1]) for q in list(poly.exterior.coords)[:-1]])
                           .close())
    s = perfil(ext).extrude(ancho).translate((0, ancho / 2, 0))
    s = s.cut(perfil(inn).extrude(ancho + 4).translate((0, ancho / 2 + 2, 0)))
    pts, total, n = _muestrea(inn, HTD_P)
    tool = None
    for x, z, ang in pts:
        c = (cq.Workplane("XZ").circle(HTD_R).extrude(ancho + 4)
             .translate((x, ancho / 2 + 2, z)))
        tool = c if tool is None else tool.union(c)
    return s.cut(tool), n, total


# ---------------- exportacion ----------------
TORNILLOS = [('DIN912_M5x10', 5.0, 10.0), ('DIN912_M5x16', 5.0, 16.0),
             ('DIN912_M6x20', 6.0, 20.0), ('DIN912_M6x25', 6.0, 25.0),
             ('DIN912_M8x25', 8.0, 25.0), ('DIN912_M8x35', 8.0, 35.0),
             ('DIN912_M4x10', 4.0, 10.0), ('DIN912_M5x8', 5.0, 8.0)]

if __name__ == '__main__':
    import time
    for nm, d, L in TORNILLOS:
        t0 = time.time()
        s = din912(d, L)
        cq.exporters.export(s, os.path.join(DIR, f'TORNILLO_{nm}.step'))
        b = s.BoundingBox()
        print(f'  TORNILLO_{nm}: {s.Volume():7.1f} mm3 · z {b.zmin:6.2f}..{b.zmax:5.2f} · {time.time()-t0:.1f} s')
    s = iso10642(5.0, 10.0)
    cq.exporters.export(s, os.path.join(DIR, 'TORNILLO_ISO10642_M5x10.step'))
    print(f'  TORNILLO_ISO10642_M5x10 (avellanado de la tapa): {s.Volume():.1f} mm3')
    for d in (4.0, 5.0, 6.0, 8.0):
        m = int(d)
        for f, pre in ((din934, 'TUERCA_DIN934'), (din125, 'ARANDELA_DIN125'),
                       (din127, 'ARANDELA_GROWER_DIN127')):
            s = f(d)
            cq.exporters.export(s, os.path.join(DIR, f'{pre}_M{m}.step'))
        print(f'  tuerca + arandelas M{m}')
    print('componentes de tornilleria listos en', DIR)
