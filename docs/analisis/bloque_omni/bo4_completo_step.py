# Ensamble COMPLETO v4 en BREP (STEP para Inventor): modulo con TODOS sus
# elementos (rodamientos F6801 modelados, bujes adaptadores, poleas, correas,
# motores) + las 32 ruedas mecanum v7 REALES instanciadas + el TRANSPORTADOR
# ZP2026 dimensionado de las mediciones del GLB (largueros con pestanas,
# guardas, travesanos TR_S, patas, 32 rodillos vecinos, escalerilla cortada,
# motores de zona, fuente y controlador reubicados).
# Los motores/fuente/controlador van como solidos simplificados a bbox real
# (la malla exacta vive en bloque_omni_zp_v4.glb).
import cadquery as cq
import numpy as np
from math import cos, radians
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bloque_omni_v4 as B

OUT = os.path.dirname(os.path.abspath(__file__))
L = cq.Location
V = cq.Vector

asm = cq.Assembly(name='bloque_omni_v4_completo')
C = {
    'chapa': cq.Color(0.55, 0.58, 0.62), 'tapa': cq.Color(0.74, 0.76, 0.80),
    'acero': cq.Color(0.42, 0.42, 0.45), 'pvc': cq.Color(0.88, 0.88, 0.84),
    'polea': cq.Color(0.62, 0.50, 0.28), 'motor': cq.Color(0.18, 0.45, 0.24),
    'correa': cq.Color(0.10, 0.10, 0.11), 'zp': cq.Color(0.48, 0.48, 0.50),
    'rodillo': cq.Color(0.80, 0.80, 0.82), 'rod': cq.Color(0.70, 0.70, 0.74),
    'sensor': cq.Color(0.62, 0.15, 0.12),
}

# ---------- modulo (todas las piezas v4) ----------
for sy in (-1, 1):
    asm.add(B.rail(sy), name=f'rail_{sy}', color=C['chapa'])
asm.add(B.placa_base(), name='placa_base', color=C['chapa'])
ts, vx, vy = B.tapa_superior()
asm.add(ts, name='tapa_superior', color=C['tapa'])
for i in range(2):
    asm.add(B.tapa_ciega(i), name=f'tapa_ciega_{i}', color=C['tapa'])
for h in ('der', 'izq'):
    asm.add(B.placa_motor(h), name=f'placa_motor_{h}', color=C['chapa'])
for xt in B.X_TRAV:
    asm.add(B.travesano(xt), name=f'travesano_{xt:+.0f}', color=C['chapa'])
for k in range(B.NEJES):
    asm.add(B.eje(k), name=f'eje_{k}', color=C['acero'])
    asm.add(B.polea(k), name=f'polea_{k}', color=C['polea'])
    for nm, p in B.bujes(k):
        asm.add(p, name=nm, color=C['pvc'])
    for sy in (-1, 1):
        asm.add(B.collarin(k, sy), name=f'collarin_{k}_{sy}', color=C['acero'])
        asm.add(B.rodamiento_f6801(k, sy), name=f'F6801ZZ_{k}_{sy}', color=C['rod'])
    for j in range(4):
        asm.add(B.buje_adaptador(k, j), name=f'bujeadap_{k}_{j}', color=C['polea'])

# ---------- ruedas reales (importadas del STEP, instanciadas) ----------
rueda = {h: cq.importers.importStep(os.path.join(OUT, f'm64v7_ensamble_{h}.step'))
         for h in ('izq', 'der')}
for k in range(B.NEJES):
    h = B.mano(k)
    for j, y in enumerate(B.Y_RUEDAS):
        loc = (L(V(B.X_EJES[k], y, B.Z_EJE)) *
               L(V(0, 0, 0), V(1, 0, 0), 90) *
               L(V(0, 0, 0), V(0, 0, 1), 90 * j + 15 * k))
        asm.add(rueda[h], name=f'rueda_{h}_{k}_{j}', loc=loc)

# ---------- motores del modulo (simplificados a bbox real) + correas ----------
def motor_simple(xc, yc):
    cuerpo = (cq.Workplane("XY").box(152.7, 119.0, 118.1)
              .translate((xc, yc, B.MZ)))
    return cuerpo

def spool_simple(xc, ys):
    return (cq.Workplane("XZ").circle(34.0).circle(10)
            .extrude(-56.0).translate((0, ys - 28.0, 0)).translate((xc, 0, B.MZ)))

MOTS = {'der': (B.X_MOTOR['der'], B.G['der'][0] - 31.5, B.G['der'][0]),
        'izq': (B.X_MOTOR['izq'], B.G['izq'][0] + 31.5, B.G['izq'][0])}
for h, (xc, ymc, ys) in MOTS.items():
    asm.add(motor_simple(xc, ymc), name=f'unidrive_{h}', color=C['motor'])
    asm.add(spool_simple(xc, ys), name=f'spool_{h}', color=C['polea'])

def cinta(nm, pts, y):
    for i, ((x0, z0), (x1, z1)) in enumerate(zip(pts[:-1], pts[1:])):
        d = np.hypot(x1 - x0, z1 - z0)
        ang = np.degrees(np.arctan2(z1 - z0, x1 - x0))
        seg = (cq.Workplane("XY").box(float(d), 9.0, 3.0)
               .rotate((0, 0, 0), (0, 1, 0), -float(ang))
               .translate(((x0 + x1) / 2, y, (z0 + z1) / 2)))
        asm.add(seg, name=f'{nm}_{i}', color=C['correa'])

r_p = B.POLEA_D / 2
for h in ('der', 'izq'):
    g1, g2 = B.G[h]
    xm = B.X_MOTOR[h]
    ks = B.KS[h]
    c1, c2 = [B.X_EJES[k] for k in ks[1:3]]
    cinta(f'correa_{h}_m', [(xm - 31.5, B.MZ), (c1, B.Z_EJE - r_p - 1.5),
                            (c2, B.Z_EJE - r_p - 1.5), (xm + 31.5, B.MZ)], g1)
    a, d4 = B.X_EJES[ks[0]], B.X_EJES[ks[3]]
    for (u, w) in ((a, c1), (c2, d4)):
        for dz in (r_p - 2.0, -(r_p - 2.0)):
            cinta(f'correa_{h}_t{u:.0f}_{dz:+.0f}',
                  [(u, B.Z_EJE + dz), (w, B.Z_EJE + dz)], g2)

# ---------- transportador ZP2026 (BREP dimensionado de las mediciones) ----
CI = B.CARA_INT     # 266.8
for sy in (-1, 1):
    web = (cq.Workplane("XY").box(2990, 4, 190.6)
           .translate((0, sy * (CI + 2), 12.7)))
    ala = (cq.Workplane("XY").box(2990, 37.9, 4)
           .translate((0, sy * (CI + 37.9 / 2), 106.0)))
    pest = (cq.Workplane("XY").box(2990, 30, 4)
            .translate((0, sy * (CI - 15), -80.6)))
    guarda = (cq.Workplane("XY").box(2989, 37.9, 38)
              .translate((0, sy * (CI + 19), 127.0)))
    asm.add(web.union(ala).union(pest), name=f'ZP_larguero_{sy}', color=C['zp'])
    asm.add(guarda, name=f'ZP_guarda_{sy}', color=C['zp'])
for xt in (-1445.3, -922.05, -324.05, 324.05, 922.05, 1445.3):
    asm.add(cq.Workplane("XY").box(87.6, 533, 87.7).translate((xt, 0, -29.75)),
            name=f'ZP_TRS_{xt:+.0f}', color=C['zp'])
for sx in (-1, 1):                                      # patas simplificadas
    for sy in (-1, 1):
        asm.add(cq.Workplane("XY").box(40, 40, 606)
                .translate((sx * 1445, sy * 287.8, -385.6)),
                name=f'ZP_pata_{sx}_{sy}', color=C['zp'])
    asm.add(cq.Workplane("XY").box(158, 620, 10).translate((sx * 1445, 0, -693)),
            name=f'ZP_pie_{sx}', color=C['zp'])
rodz = (cq.Workplane("XZ").circle(25.0).circle(0).extrude(-533)
        .translate((0, -266.5, 0)))
rodz = rodz.union(cq.Workplane("XZ").circle(6).extrude(-565).translate((0, -282.5, 0)))
RX = [336.4, 411.1, 485.9, 560.6, 635.4, 710.1, 784.9, 859.6,
      934.4, 1009.1, 1083.9, 1158.6, 1233.4, 1308.1, 1382.9, 1457.6]
for xr in RX + [-x for x in RX]:
    asm.add(rodz, name=f'ZP_rodillo_{xr:+.0f}', loc=L(V(xr, 0, 90.1)),
            color=C['rodillo'])
for xz in (-1196.0, -598.0, 598.0, 1196.0):             # motores de zona
    asm.add(cq.Workplane("XY").box(152.7, 119.0, 118.1)
            .translate((xz, 186.9, 2.4)), name=f'ZP_motor_{xz:+.0f}',
            color=C['motor'])
    asm.add(cq.Workplane("XZ").circle(34).circle(10).extrude(-56)
            .translate((0, 190.4, 0)).translate((xz, 0, 2.4)),
            name=f'ZP_spool_{xz:+.0f}', color=C['polea'])
for sxe in (-1, 1):                                     # escalerilla cortada
    Lz = 1190.0
    xc = sxe * (310 + Lz / 2)
    fondo = (cq.Workplane("XY").box(Lz, 112.1, 3).translate((xc, -104.55, -20.4)))
    for syw in (-1, 1):
        fondo = fondo.union(cq.Workplane("XY").box(Lz, 3, 53.8)
                            .translate((xc, -104.55 + syw * 54.5, 5.0)))
    asm.add(fondo, name=f'ZP_escalerilla_{sxe}', color=C['zp'])
asm.add(cq.Workplane("XY").box(150.4, 84.7, 147.2).translate((-450, -224.3, -9)),
        name='ZP_fuente24V', color=C['correa'])
asm.add(cq.Workplane("XY").box(155.1, 41.9, 53.2).translate((330, -246.2, -2.6)),
        name='ZP_controlador', color=C['correa'])
asm.add(cq.Workplane("XY").box(12, 518, 21.4).translate((-305, -3, 57.2)),
        name='ZP_sensor_zona2', color=C['sensor'])

asm.save(os.path.join(OUT, 'bloque_omni_v4_completo.step'))
print('bloque_omni_v4_completo.step OK')
