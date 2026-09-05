# Plegado de chapa REAL: perfiles con radio de plegado, no cajas a tope.
#
# Sergio (05-09): "blended metal parts with all details".
# Hasta la v7 mis alas plegadas eran cajas pegadas a 90 grados con arista viva:
# eso no es una chapa plegada, es imposible de fabricar tal cual. Aqui la
# seccion se construye como LINEA MEDIA con arcos de radio Rm = R + t/2 y se
# engorda al espesor t; el resultado tiene el radio interior R y el exterior
# R + t, que es lo que sale de la plegadora.

import cadquery as cq
import numpy as np
from math import hypot, atan2, acos, tan, pi
from shapely.geometry import LineString

R_PLEG = 4.0            # radio interior de plegado por defecto (chapa de 4 mm)


def _arco(p0, p1, p2, R, n=14):
    """sustituye el vertice p1 por un arco de radio R tangente a los dos lados"""
    p0, p1, p2 = map(np.array, (p0, p1, p2))
    d0, d2 = p0 - p1, p2 - p1
    l0, l2 = np.linalg.norm(d0), np.linalg.norm(d2)
    d0, d2 = d0 / l0, d2 / l2
    cosang = np.clip(np.dot(d0, d2), -1, 1)
    ang = acos(cosang)                      # angulo interior entre lados
    if ang > pi - 1e-6 or ang < 1e-6:
        return [tuple(p1)]
    t = R / tan(ang / 2)
    t = min(t, 0.45 * l0, 0.45 * l2)
    R_ef = t * tan(ang / 2)
    a, b = p1 + d0 * t, p1 + d2 * t
    bis = d0 + d2
    bis = bis / np.linalg.norm(bis)
    c = p1 + bis * (R_ef / np.sin(ang / 2))
    a0, a1 = atan2(*(a - c)[::-1]), atan2(*(b - c)[::-1])
    if a1 - a0 > pi:
        a1 -= 2 * pi
    if a0 - a1 > pi:
        a1 += 2 * pi
    return [tuple(c + R_ef * np.array([np.cos(a0 + (a1 - a0) * i / n),
                                       np.sin(a0 + (a1 - a0) * i / n)]))
            for i in range(n + 1)]


def seccion(pts, t, R=R_PLEG):
    """poligono shapely del MATERIAL de una chapa de espesor t cuya linea media
    pasa por pts, con los vertices interiores redondeados al radio de plegado"""
    Rm = R + t / 2.0
    linea = [pts[0]]
    for i in range(1, len(pts) - 1):
        linea += _arco(pts[i - 1], pts[i], pts[i + 1], Rm)
    linea.append(pts[-1])
    return LineString(linea).buffer(t / 2.0, cap_style=2, join_style=1,
                                    quad_segs=12)


def plegada(pts, t, largo, plano="YZ", R=R_PLEG):
    """solido de chapa plegada: la seccion se extruye `largo` mm en la normal
    del plano ("YZ" -> a lo largo de X, "XZ" -> a lo largo de -Y)."""
    poly = seccion(pts, t, R)
    prof = (cq.Workplane(plano)
            .polyline([(q[0], q[1]) for q in list(poly.exterior.coords)[:-1]])
            .close())
    return prof.extrude(largo)


def desarrollo(pts, t, R=R_PLEG, k=0.38):
    """longitud desarrollada de la chapa (para cortar el plano en plano):
    tramos rectos + longitud de fibra neutra en cada pliegue (factor K)."""
    Rm = R + t / 2.0
    L = 0.0
    puntos = list(map(np.array, pts))
    for i in range(len(puntos) - 1):
        L += np.linalg.norm(puntos[i + 1] - puntos[i])
    for i in range(1, len(puntos) - 1):
        d0 = puntos[i - 1] - puntos[i]
        d2 = puntos[i + 1] - puntos[i]
        d0 /= np.linalg.norm(d0)
        d2 /= np.linalg.norm(d2)
        ang = acos(np.clip(np.dot(d0, d2), -1, 1))
        pliegue = pi - ang                       # angulo de plegado
        t_rec = Rm / tan(ang / 2)
        L -= 2 * t_rec
        L += pliegue * (R + k * t)
    return L
