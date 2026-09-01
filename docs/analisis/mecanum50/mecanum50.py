# Mecanum50 — rueda de rodillos a 49.4° segun boceto y cotas de Sergio.
#
# Datos medidos (capa user): rodillo L=33.5, Ø18 centro, Ø13 extremos, eje Ø3.2
# (=1/8"); rueda Ø50 nominal, hexagono 14 e/c en ambas caras.
# El barril medido ES el perfil mecanum exacto para R=25, d0=16, beta=49.37°:
#   rho(s) = sqrt(R² − s²cos²β) − d0   ->  Ø18 centro / Ø13.0 extremos.
#
# Del boceto: 6 rodillos a 60°, planos P1/P2 desfasados en profundidad
# (zc=∓0.9), tetones de cada eje ENFRENTADOS Y ALINEADOS (extremo -s en placa
# A, extremo +s en placa B). 3 ejes = pasador Ø3.2; 3 ejes = M3x40 que ademas
# aprietan las placas (cabeza en teton A, tuerca cautiva en teton B).
# Estrella de cara suave (spline). Versiones izquierda y derecha.

import cadquery as cq
import numpy as np
from math import sin, cos, radians, degrees, sqrt, atan2
import os

OUT = os.path.dirname(os.path.abspath(__file__))

R = 25.0
RHO0, RHOE = 9.0, 6.5
SMAX = 33.5 / 2
D0 = (R - RHO0) + 0.30    # +0.30: holgura entre rodillos (el fisico roza)
CB = sqrt(R * R - ((R - RHO0) + RHOE) ** 2) / SMAX   # beta del perfil medido
SB = sqrt(1 - CB * CB)
BETA = degrees(np.arcsin(SB))
ZOFF = 0.0    # P1/P2 del boceto = los dos planos de tetones (z ±14.9)
W2 = 17.4
BORE_D = 9.0
HEX_AF = 14.0
PIN_D = 3.2
ROD_BORE = 3.4
CLR = 0.7
S_BOSS = SMAX + 0.55 + 2.4          # 19.7: centro del teton sobre el eje
BOSS_D, BOSS_L = 7.6, 5.2
ROWS = [0, 60, 120, 180, 240, 300]
SCREW_AXLES = []    # jaula de 6 pasadores: autoblocante, sin tornillos

def zc_of(k):
    return ZOFF if k % 2 == 0 else -ZOFF

def rho(s):
    s = max(min(s, SMAX), -SMAX)
    return sqrt(R * R - (s * CB) ** 2) - D0

def Rz(a):
    a = radians(a)
    return np.array([[cos(a), -sin(a), 0], [sin(a), cos(a), 0], [0, 0, 1]])

def axis_pt(k, s):
    return Rz(ROWS[k]) @ np.array([D0, s * CB, s * SB]) + np.array([0, 0, zc_of(k)])

def axis_dir(k):
    return Rz(ROWS[k]) @ np.array([0, CB, SB])

def cyl_along(p0, u, d, L):
    return cq.Workplane(obj=cq.Solid.makeCylinder(
        d / 2, L, cq.Vector(*p0), cq.Vector(*u)))

def prism_hex_along(p_center, u, af, L):
    """prisma hexagonal (entre caras af) a lo largo de u, centrado en p_center"""
    w = cq.Workplane("XY").polygon(6, af / cos(radians(30))).extrude(L) \
        .translate((0, 0, -L / 2))
    w = w.rotate((0, 0, 0), (1, 0, 0), -(90 - BETA))
    # ahora su eje es (0,CB,SB); girarlo al angulo de u en planta
    ang = degrees(atan2(u[1], u[0])) - degrees(atan2(CB, 0))
    w = w.rotate((0, 0, 0), (0, 0, 1), ang)
    return w.translate(tuple(p_center))

def rodillo_solid(extra_r=0.0, extra_l=0.0, bore=True):
    h = SMAX + extra_l
    xs = np.linspace(-h, h, 41)
    pts = [(rho(x) + extra_r, float(x)) for x in xs]
    prof = [(0.01, -h)] + pts + [(0.01, h)]
    s = (cq.Workplane("XZ").polyline(prof).close()
         .revolve(360, (0, 0, 0), (0, 1, 0)))
    if bore and extra_r == 0.0:
        s = s.cut(cq.Workplane("XY").circle(ROD_BORE / 2).extrude(80)
                  .translate((0, 0, -40)))
    return s

def rodillo_en_sitio(k, extra_r=0.0, extra_l=0.0):
    w = rodillo_solid(extra_r, extra_l, bore=False)
    w = w.rotate((0, 0, 0), (1, 0, 0), -(90 - BETA))
    w = w.rotate((0, 0, 0), (0, 0, 1), ROWS[k])
    return w.translate(tuple(axis_pt(k, 0)))

def free_hub_profile(zlo, zhi):
    s = np.linspace(-SMAX, SMAX, 140)
    a = np.linspace(0, 2 * np.pi, 100)
    S, A = np.meshgrid(s, a, indexing='ij')
    RHO = np.vectorize(rho)(S)
    P0 = np.stack([D0 + RHO * np.cos(A),
                   S * CB + RHO * np.sin(A) * SB,
                   S * SB - RHO * np.sin(A) * CB], -1).reshape(-1, 3)
    allp = []
    for k in range(6):
        q = P0 @ Rz(ROWS[k]).T
        q = q + np.array([0, 0, zc_of(k)])
        allp.append(q)
    allp = np.vstack(allp)
    prof = []
    for z0 in np.linspace(zlo, zhi, 25):
        m = np.abs(allp[:, 2] - z0) < 0.7
        rfree = (np.hypot(allp[m, 0], allp[m, 1]).min() - 0.9) if m.any() else 12.0
        prof.append((float(min(rfree, 11.5)), float(z0)))
    return prof

def estrella_2d(r_punta, r_valle, ang0, p=1.7, n=72):
    """estrella suave de 6 puntas: r(t)=rv+(rp-rv)*(0.5+0.5*cos(6t))^p"""
    pts = []
    for i in range(n):
        t = i * 360.0 / n
        w = (0.5 + 0.5 * cos(radians(6 * t))) ** p
        rr = r_valle + (r_punta - r_valle) * w
        ang = radians(ang0 + t)
        pts.append((rr * cos(ang), rr * sin(ang)))
    return cq.Workplane("XY").polyline(pts).close()

def placa(side):
    """side=-1: placa A (z -W2..0, tetones en extremos -s, cajas de cabeza)
       side=+1: placa B (z 0..W2, tetones en extremos +s, tuercas cautivas)"""
    z_face = -W2 if side < 0 else W2 - 4.6
    boss_ang = degrees(atan2(side * S_BOSS * CB, D0))
    star = estrella_2d(24.0, 12.5, ROWS[0] + boss_ang).extrude(4.6) \
        .translate((0, 0, z_face))
    s = star
    zhub = -W2 if side < 0 else W2 - 7.0
    s = s.union(cq.Workplane("XY").circle(12.0).extrude(7.0).translate((0, 0, zhub)))
    prof = free_hub_profile(-W2 if side < 0 else 0.0, 0.0 if side < 0 else W2)
    poly = [(0.02, prof[0][1])] + [(max(r, 5.0), z) for r, z in prof] + \
           [(0.02, prof[-1][1])]
    s = s.union(cq.Workplane("XZ").polyline(poly).close()
                .revolve(360, (0, 0, 0), (0, 1, 0)))
    for k in range(6):
        p = axis_pt(k, side * S_BOSS)
        u = axis_dir(k) * side          # apunta hacia AFUERA del rodillo
        s = s.union(cyl_along(p - u * (BOSS_L / 2), u, BOSS_D, BOSS_L))
        pf = np.array([16.5 * cos(radians(ROWS[k] + boss_ang)),
                       16.5 * sin(radians(ROWS[k] + boss_ang)),
                       z_face + 2.3])
        v = p - pf
        L = float(np.linalg.norm(v))
        s = s.union(cq.Workplane(obj=cq.Solid.makeCylinder(
            3.2, L + 1.5, cq.Vector(*pf), cq.Vector(*(v / L)))))
    s = s.intersect(cq.Workplane("XY").circle(24.6).extrude(2 * W2)
                    .translate((0, 0, -W2)))
    half = cq.Workplane("XY").box(120, 120, 2 * W2) \
        .translate((0, 0, (W2) if side > 0 else (-W2)))
    s = s.intersect(half)               # cada placa en su mitad
    for k in range(6):
        s = s.cut(rodillo_en_sitio(k, extra_r=CLR, extra_l=0.55))
    for k in range(6):
        u = axis_dir(k)
        if side < 0:
            # placa A: alojamiento CIEGO Ø3.15 (cola del pasador a presion)
            p0 = axis_pt(k, -(S_BOSS + BOSS_L / 2 - 1.4))
            s = s.cut(cyl_along(p0, u, 3.15, 60))
        else:
            # placa B: taladro PASANTE Ø3.3 (el pasador entra por aqui)
            p0 = axis_pt(k, S_BOSS + BOSS_L)
            s = s.cut(cyl_along(p0, -u, 3.3, 2 * (S_BOSS + BOSS_L)))
    zhx = -W2 - 0.01 if side < 0 else W2 - 5.99
    s = s.cut(cq.Workplane("XY").polygon(6, HEX_AF / cos(radians(30)))
              .extrude(6.0).translate((0, 0, zhx)))
    s = s.cut(cq.Workplane("XY").circle(BORE_D / 2).extrude(2 * W2 + 2)
              .translate((0, 0, -W2 - 1)))
    return s

def pasador():
    return cq.Workplane("XY").circle(PIN_D / 2).extrude(2 * (S_BOSS + 1.8)) \
        .translate((0, 0, -(S_BOSS + 1.8)))

def tornillo_m3x40():
    return (cq.Workplane("XY").circle(1.5).extrude(40)
            .union(cq.Workplane("XY").circle(2.8).extrude(3).translate((0, 0, -3)))
            .translate((0, 0, -20)))

def build(hand='izq'):
    pa = placa(-1)
    pb = placa(+1)
    rod = rodillo_solid()
    if hand == 'der':
        pa = pa.mirror(mirrorPlane="XZ")
        pb = pb.mirror(mirrorPlane="XZ")
    asm = cq.Assembly(name=f"Mecanum50_{hand}")
    asm.add(pa, name="placa_A", color=cq.Color(0.72, 0.72, 0.75))
    asm.add(pb, name="placa_B", color=cq.Color(0.72, 0.72, 0.75))
    for k in range(6):
        a = ROWS[k] if hand == 'izq' else -ROWS[k]
        tilt = -(90 - BETA) if hand == 'izq' else (90 - BETA)
        zc = zc_of(k)
        loc = (cq.Location(cq.Vector(0, 0, zc)) *
               cq.Location(cq.Vector(0, 0, 0), cq.Vector(0, 0, 1), a) *
               cq.Location(cq.Vector(D0, 0, 0)) *
               cq.Location(cq.Vector(0, 0, 0), cq.Vector(1, 0, 0), tilt))
        asm.add(rod, name=f"rodillo_{k}", color=cq.Color(0.10, 0.10, 0.11), loc=loc)
        herr = pasador()
        nm = f"pasador_{k}"
        asm.add(herr, name=nm, color=cq.Color(0.45, 0.45, 0.48), loc=loc)
    return pa, pb, rod, asm

if __name__ == '__main__':
    for hand in ('izq', 'der'):
        pa, pb, rod, asm = build(hand)
        for n, s in [(f'mec50_placa_A_{hand}', pa), (f'mec50_placa_B_{hand}', pb)]:
            print(f"{n:22s} vol={s.val().Volume()/1000:6.2f} cm3")
            cq.exporters.export(s, os.path.join(OUT, n + '.step'))
            cq.exporters.export(s, os.path.join(OUT, n + '.stl'),
                                tolerance=0.03, angularTolerance=0.25)
        asm.save(os.path.join(OUT, f'mec50_ensamble_{hand}.step'))
        print(f'ensamble {hand} exportado')
    cq.exporters.export(rodillo_solid(), os.path.join(OUT, 'mec50_rodillo.step'))
    cq.exporters.export(rodillo_solid(), os.path.join(OUT, 'mec50_rodillo.stl'),
                        tolerance=0.03, angularTolerance=0.25)
    print('done')
