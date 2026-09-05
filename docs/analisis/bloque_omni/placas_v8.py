# Placas del bloque OMNI v8 — estilo Flowsort Y PLEGADO REAL.
#
# Igual lenguaje de chapa que la v7 (colisas obround, columnas de ajuste,
# ventanas, lamas, cancamos) pero cada ala plegada se construye con su RADIO
# DE PLEGADO (interior R4, exterior R8 en chapa de 4), no como una caja pegada
# a tope. Cada pieza reporta ademas su DESARROLLO, que es lo que se manda a
# cortar en plano.

import cadquery as cq
from math import cos, radians, sqrt
import os

import placas_flowsort as pf
import chapa

t = pf.RAIL_T                       # 4 mm en todo el bastidor
R = chapa.R_PLEG

rrect, colisa = pf.rrect, pf.colisa
X_EJES, X_MED, X_ESC = pf.X_EJES, pf.X_MED, pf.X_ESC
Z_EJE, ZM, X_MOTOR = pf.Z_EJE, pf.ZM, pf.X_MOTOR
TENSORES = pf.TENSORES

# posiciones de tornilleria, que el ensamble reutiliza para poner los tornillos
X_TAPA = [-258 + i * 86 for i in range(7)]
Z_COL_ESC = (-24.0, 6.0)
DX_ESC = (-18.0, 18.0)


def riel(sy):
    """Riel de 4 mm PLEGADO: alma vertical + ala superior a 90 grados con radio
    interior 4. Lleva la hilera de F6801, las dos estaciones de motor, las
    columnas de colisas de ajuste, las colisas de los tensores, dos hileras de
    ventanas, los M5 de la tapa y los cancamos."""
    yc = pf.Y_RAIL_N if sy < 0 else pf.Y_RAIL_P
    fuera = -1 if sy < 0 else 1
    y0 = yc - t / 2
    z_ala = pf.RAIL_Z1 - t / 2
    pts = [(yc, pf.RAIL_Z0), (yc, z_ala), (yc + fuera * pf.ALA, z_ala)]
    s = chapa.plegada(pts, t, pf.RAIL_LX, "YZ").translate((-pf.RAIL_LX / 2, 0, 0))
    # el contorno en planta se redondea en las 4 esquinas
    s = s.intersect(rrect("XZ", pf.RAIL_LX, pf.RAIL_Z1 - pf.RAIL_Z0 + 40, pf.BORDE_R)
                    .extrude(60).translate((0, y0 + 40,
                                            (pf.RAIL_Z0 + pf.RAIL_Z1 + 40) / 2)))
    for x in X_EJES:
        s = s.cut(cq.Workplane("XZ").circle(21.0 / 2).extrude(40)
                  .translate((x, y0 + 20, Z_EJE)))
    for xm in (X_MOTOR['der'], X_MOTOR['izq']):
        s = s.cut(cq.Workplane("XZ").circle(39.2 / 2).extrude(40)
                  .translate((xm, y0 + 20, ZM)))
        for dx in (-25.0, 25.0):
            for dz in (-25.0, 25.0):
                s = s.cut(colisa("XZ", pf.COL5_W, 14.0, 90).extrude(40)
                          .translate((xm + dx, y0 + 20, ZM + dz)))
    for x in X_ESC:
        for z in Z_COL_ESC:
            s = s.cut(colisa("XZ", pf.COL_W, 24.0, 90).extrude(40)
                      .translate((x, y0 + 20, z)))
    for x in X_MED:
        s = s.cut(colisa("XZ", pf.VENT_W, pf.VENT_L, 0).extrude(40)
                  .translate((x, y0 + 20, 45.0)))
    for x in X_EJES:
        if min(abs(x - X_MOTOR['der']), abs(x - X_MOTOR['izq'])) < 46:
            continue
        s = s.cut(colisa("XZ", 16.0, 40.0, 0).extrude(40)
                  .translate((x, y0 + 20, -34.0)))
    for h in ('der', 'izq'):
        for xt, zt in TENSORES[h]:
            s = s.cut(colisa("XZ", 8.5, 32.0, 90).extrude(40)
                      .translate((xt, y0 + 20, zt)))
    ya = yc + fuera * (pf.ALA - 4.0)      # centro del tramo plano del ala
    for x in X_TAPA:
        s = s.cut(cq.Workplane("XY").circle(2.6).extrude(20)
                  .translate((x, ya, pf.RAIL_Z1 - t - 1)))
    for x in (-284.0, 284.0):
        s = s.cut(cq.Workplane("XY").circle(5.5).extrude(20)
                  .translate((x, ya, pf.RAIL_Z1 - t - 1)))
    return s, chapa.desarrollo(pts, t)


def escuadra():
    """L de 4 mm PLEGADA (radio interior 4). Se construye en el sitio del riel
    cercano; el ensamble la instancia girada para el lejano."""
    yc = pf.Y_RAIL_N
    y_v = yc + t / 2 + t / 2                 # alma contra la cara interior
    y_h = pf.y_pie_escuadra(-1)
    z_h = pf.Z_BASE1 + t / 2
    pts = [(y_v, 22.0), (y_v, z_h), (y_h + 26.0, z_h)]
    s = chapa.plegada(pts, t, 56.0, "YZ").translate((-28.0, 0, 0))
    s = s.intersect(rrect("YZ", 400.0, 56.0, 6.0).extrude(200)
                    .translate((-100.0, 0, 0)).rotate((0, 0, 0), (1, 0, 0), 0)
                    if False else
                    cq.Workplane("XY").rect(56.0, 400.0).extrude(300)
                    .translate((0, 0, -150)))
    for z in Z_COL_ESC:
        s = s.cut(cq.Workplane("XZ").circle(3.3).extrude(20)
                  .translate((0, y_v + 10, z)))
    s = s.cut(colisa("XZ", 16.0, 30.0, 0).extrude(20)
              .translate((0, y_v + 10, -34.0)))
    for dx in DX_ESC:
        s = s.cut(colisa("XY", pf.COL_W, 26.0, 90).extrude(20)
                  .translate((dx, y_h, pf.Z_BASE1 - 1)))
    return s, chapa.desarrollo(pts, t)


def placa_base():
    """Placa base de 4 mm con las dos alas plegadas hacia abajo (radio real)."""
    zc = (pf.Z_BASE0 + pf.Z_BASE1) / 2
    pts = [(pf.BASE_YN, zc - 20.0), (pf.BASE_YN, zc),
           (pf.BASE_YP, zc), (pf.BASE_YP, zc - 20.0)]
    s = chapa.plegada(pts, t, pf.BASE_LX, "YZ").translate((-pf.BASE_LX / 2, 0, 0))
    s = s.intersect(rrect("XY", pf.BASE_LX, pf.BASE_YP - pf.BASE_YN + 60, 10.0)
                    .extrude(80).translate((0, (pf.BASE_YN + pf.BASE_YP) / 2,
                                            zc - 60)))
    for xt in pf.X_TRAV:
        for y in pf.Y_BASE_TRAV:
            s = s.cut(colisa("XY", 9.0, 28.0, 0).extrude(20)
                      .translate((xt, y, pf.Z_BASE0 - 1)))
    for sy in (-1, 1):
        y_h = pf.y_pie_escuadra(sy)
        for x in X_ESC:
            for dx in DX_ESC:
                s = s.cut(cq.Workplane("XY").circle(3.3).extrude(20)
                          .translate((x + dx, y_h, pf.Z_BASE0 - 1)))
    for x in [-240 + i * 80 for i in range(7)]:
        if any(abs(x - xt) < 45 for xt in pf.X_TRAV):
            continue
        for y in (-10.0, 70.0, 150.0):
            s = s.cut(colisa("XY", pf.VENT_W, pf.VENT_L, 90).extrude(20)
                      .translate((x, y, pf.Z_BASE0 - 1)))
    for x in (X_MOTOR['der'] - 62, X_MOTOR['izq'] + 62):
        s = s.cut(cq.Workplane("XY").circle(pf.GROMMET_D / 2).extrude(20)
                  .translate((x, -140.0, pf.Z_BASE0 - 1)))
    for x in (-278.0, 278.0):
        for y in (-140.0, 208.0):
            s = s.cut(cq.Workplane("XY").circle(5.5).extrude(20)
                      .translate((x, y, pf.Z_BASE0 - 1)))
    for h in ('der', 'izq'):
        for dx in (-46.0, 0.0, 46.0):
            s = s.cut(colisa("XY", pf.COL_W, 26.0, 90).extrude(20)
                      .translate((X_MOTOR[h] + dx, pf.Y_CUNA + 22.0,
                                  pf.Z_BASE0 - 1)))
    return s, chapa.desarrollo(pts, t)


def cuna_motor():
    """Cuna del motor: 8 mm, PLEGADA (radio interior 8 en chapa de 8)."""
    tc = pf.MOT_PLACA_T
    y_v = pf.Y_CUNA + tc / 2
    z_h = pf.Z_BASE1 + tc / 2
    pts = [(y_v, 47.0), (y_v, z_h), (y_v + 44.0, z_h)]
    s = chapa.plegada(pts, tc, 120.0, "YZ", R=8.0).translate((-60.0, 0, 0))
    s = s.intersect(cq.Workplane("XY").rect(120.0, 400.0).extrude(300)
                    .translate((0, 0, -150)))
    s = s.cut(rrect("XZ", 61.0, 61.0, 6.0).extrude(30)
              .translate((0, y_v + 15, ZM)))
    s = s.cut(colisa("XZ", 26.0, 40.0, 90).extrude(30)
              .translate((0, y_v + 15, ZM - 34.0)))
    for dx in (-44.0, 44.0):
        s = s.cut(colisa("XZ", 16.0, 44.0, 90).extrude(30)
                  .translate((dx, y_v + 15, ZM + 4.0)))
    for dx in (-46.0, 0.0, 46.0):
        s = s.cut(colisa("XY", pf.COL_W, 26.0, 90).extrude(20)
                  .translate((dx, pf.Y_CUNA + 22.0, pf.Z_BASE1 - 1)))
    return s, chapa.desarrollo(pts, tc, R=8.0)


def travesano():
    """Perfil en U de 4 mm PLEGADO (dos pliegues de radio real)."""
    ly = 2 * (pf.CARA_INT + 12.0)
    z_alma = pf.Z_PESTANA + 2.0 + t / 2
    pts = [(-30.0, z_alma - 26.0), (-30.0, z_alma),
           (30.0, z_alma), (30.0, z_alma - 26.0)]
    s = chapa.plegada(pts, t, ly, "XZ").translate((0, ly / 2, 0))
    for sy in (-1, 1):
        s = s.cut(colisa("XY", 9.0, 30.0, 90).extrude(30)
                  .translate((0, sy * (pf.CARA_INT + 2.0), pf.Z_PESTANA - 5)))
    for y in pf.Y_BASE_TRAV:
        s = s.cut(cq.Workplane("XY").circle(4.3).extrude(30)
                  .translate((0, y, pf.Z_PESTANA - 5)))
    for y in [-230 + i * 65 for i in range(8)]:
        if min(abs(y - q) for q in pf.Y_BASE_TRAV) < 28:
            continue
        if abs(y) > pf.CARA_INT - 20:
            continue
        s = s.cut(cq.Workplane("XY").circle(11.0).extrude(30)
                  .translate((0, y, pf.Z_PESTANA - 5)))
    return s, chapa.desarrollo(pts, t)


def tapa_superior():
    """Tapa de 3 mm con el canto lejano plegado (radio real)."""
    tt = pf.TAPA_T
    yn, yp = -140.0, 266.0
    zc = pf.Z_TAPA_BOT + tt / 2
    pts = [(yn, zc), (yp, zc), (yp, zc - 12.0)]
    s = chapa.plegada(pts, tt, pf.RAIL_LX, "YZ").translate((-pf.RAIL_LX / 2, 0, 0))
    s = s.intersect(rrect("XY", pf.RAIL_LX, yp - yn, 10.0).extrude(40)
                    .translate((0, (yn + yp) / 2, zc - 20)))
    dz = pf.Z_RODAD - pf.Z_TAPA_BOT
    semix = sqrt(pf.R_ENV ** 2 - (pf.R_ENV - dz) ** 2)
    vx, vy = 2 * semix + 4.0, 2 * pf.W2 + 4.0
    for x in X_EJES:
        for y in pf.Y_RUEDAS:
            s = s.cut(colisa("XY", vy, vx, 0).extrude(20)
                      .translate((x, y, pf.Z_TAPA_BOT - 1)))
    for x in X_TAPA:
        for y in (pf.Y_RAIL_N - (pf.ALA - 4.0), pf.Y_RAIL_P + (pf.ALA - 4.0)):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(20)
                      .translate((x, y, pf.Z_TAPA_BOT - 1)))
    for i in range(6):
        for x in (-200.0, 0.0, 200.0):
            s = s.cut(colisa("XY", pf.LAMA_W, pf.LAMA_L, 0).extrude(20)
                      .translate((x, 240.0 + (i - 3) * pf.LAMA_P,
                                  pf.Z_TAPA_BOT - 1)))
    return s, vx, vy, chapa.desarrollo(pts, tt)


def tapa_ciega():
    """Tapa ciega modular de 3 mm con canto plegado, para la zona muerta."""
    tt = pf.TAPA_T
    yn, yp = -266.0, -140.0
    zc = pf.Z_TAPA_BOT + tt / 2
    pts = [(yn, zc - 12.0), (yn, zc), (yp, zc)]
    s = chapa.plegada(pts, tt, 294.0, "YZ").translate((-147.0, 0, 0))
    s = s.intersect(rrect("XY", 294.0, yp - yn, 10.0).extrude(40)
                    .translate((0, (yn + yp) / 2, zc - 20)))
    for j in range(9):
        for x in (-90.0, 0.0, 90.0):
            s = s.cut(colisa("XY", pf.LAMA_W, pf.LAMA_L, 0).extrude(20)
                      .translate((x, -240.0 + j * pf.LAMA_P, pf.Z_TAPA_BOT - 1)))
    for dx in (-110.0, 0.0, 110.0):
        for y in (-146.0, -260.0):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(20)
                      .translate((dx, y, pf.Z_TAPA_BOT - 1)))
    return s, chapa.desarrollo(pts, tt)
