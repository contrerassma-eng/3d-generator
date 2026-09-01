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

R = 28.0    # Ø56: autorizado aumentar el diametro para los rodillos existentes
RHO0, RHOE = 9.0, 6.5
SMAX = 33.5 / 2
D0 = R - RHO0            # contacto exacto en R; el cruce entre rodillos (~0.05)
                         # es el mismo de la rueda fisica (rodillos moldeados)
CB = sqrt(R * R - (D0 + RHOE) ** 2) / SMAX   # beta del perfil medido
SB = sqrt(1 - CB * CB)
BETA = degrees(np.arcsin(SB))
ZOFF = 0.0    # P1/P2 del boceto = los dos planos de tetones (z ±14.9)
W2 = 17.2
BORE_D = 9.0   # (solo referencia; el hex 14 va PASANTE)
HEX_AF = 14.0
PIN_D = 3.2
ROD_BORE = 3.4
CLR = 0.7
S_BOSS = SMAX + 0.55 + 2.4          # 19.7: centro del teton sobre el eje
BOSS_D, BOSS_L = 7.6, 5.2
ROWS = [0, 60, 120, 180, 240, 300]
SCREW_AXLES = []          # v3: todos los ejes son pasadores en cunas cerradas
# --- acople telescopico central (mecanismo 'juguete') ---
HEX_DEPTH = 6.0           # bolsillo hex 14 e/c en cada cara
FLOOR_T = 2.5             # placa de fondo tras el bolsillo
TUBE_B_OUT = 7.95         # cilindro estrecho de B (calza en el bore de A)
TUBE_A_BORE = 8.10        # bore del cilindro de A
TUBE_B_END = -8.2         # hasta donde telescopa B dentro de A
SCREW_R_T = 6.3           # circulo de los 3 pernos A->B (expansion)
SCREW_ANGS = [30, 150, 270]
DECOR_ANGS = [90, 210, 330]

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

def ring(r_in, r_out, h0, h1):
    return (cq.Workplane("XY").circle(r_out).circle(r_in)
            .extrude(h1 - h0).translate((0, 0, h0)))

def wedge(a0, a1, h0, h1, R120=120):
    pts = [(0, 0)] + [(R120 * cos(radians(a)), R120 * sin(radians(a)))
                      for a in [a0 + i * (a1 - a0) / 8 for i in range(9)]]
    return (cq.Workplane("XY").polyline(pts).close()
            .extrude(h1 - h0).translate((0, 0, h0)))

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

def estrella_2d(r_punta, r_valle, ang0, p=1.55, n=84):
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
    """v3 — mecanismo de acople tipo juguete:
       A (side=-1): tubo exterior con bore Ø16.2; bolsillo hex 14x6 en cara +
         placa de fondo con 3 pernos en r6.3 que entran en el tubo de B.
       B (side=+1): cilindro estrecho Ø15.9 que telescopa en A hasta z=-8.2;
         los pernos lo expanden contra A -> ensamble bloqueado.
       6 pasadores en cunas cerradas enfrentadas (caras sin taladros).
       Estrellas desfasadas 30 (patron del boceto). Patron de 6 angulos en el
       fondo del bolsillo (3 cabezas + 3 rebajes)."""
    z_face = -W2 if side < 0 else W2 - 4.6
    boss_ang = degrees(atan2(side * S_BOSS * CB, D0))
    star_ang = 0.0 if side < 0 else 30.0
    s = estrella_2d(R - 1.0, 13.0, star_ang).extrude(4.6).translate((0, 0, z_face))
    # cubo de cara (aloja el bolsillo hex)
    zhub = -W2 if side < 0 else W2 - (HEX_DEPTH + FLOOR_T)
    s = s.union(cq.Workplane("XY").circle(12.0).extrude(HEX_DEPTH + FLOOR_T)
                .translate((0, 0, zhub)))
    # carrete exterior (perfil libre bajo los rodillos)
    prof = free_hub_profile(-W2 if side < 0 else 0.0, 0.0 if side < 0 else W2)
    poly = [(0.02, prof[0][1])] + [(min(max(r, 9.3), 11.8), z) for r, z in prof] + \
           [(0.02, prof[-1][1])]
    s = s.union(cq.Workplane("XZ").polyline(poly).close()
                .revolve(360, (0, 0, 0), (0, 1, 0)))
    if side > 0:
        # cilindro estrecho de B: telescopa dentro de A
        s = s.union(cq.Workplane("XY").circle(TUBE_B_OUT)
                    .extrude(0.0 - TUBE_B_END).translate((0, 0, TUBE_B_END)))
    # tetones + brazos espiral
    rb = float(np.hypot(*axis_pt(0, side * S_BOSS)[:2]))
    for k in range(6):
        p = axis_pt(k, side * S_BOSS)
        u = axis_dir(k) * side
        s = s.union(cyl_along(p - u * (BOSS_L / 2), u, BOSS_D, BOSS_L + 1.2))
        a_pt = ROWS[k] + star_ang
        a_bs = ROWS[k] + boss_ang
        a0, a1 = min(a_pt, a_bs), max(a_pt, a_bs)
        s = s.union(ring(rb - 4.0, R - 1.2, z_face, z_face + 4.6)
                    .intersect(wedge(a0 - 4, a1 + 4, z_face - 0.1, z_face + 4.7)))
        pf = np.array([(rb - 1.0) * cos(radians(a_bs)),
                       (rb - 1.0) * sin(radians(a_bs)), z_face + 2.3])
        v = p - pf
        L = float(np.linalg.norm(v))
        if L > 1.0:
            s = s.union(cq.Workplane(obj=cq.Solid.makeCylinder(
                3.2, L + 1.2, cq.Vector(*pf), cq.Vector(*(v / L)))))
    s = s.intersect(cq.Workplane("XY").circle(R - 0.6).extrude(2 * W2)
                    .translate((0, 0, -W2)))
    half = cq.Workplane("XY").box(150, 150, 2 * W2 + 20) \
        .translate((0, 0, (W2 + 10) if side > 0 else (-W2 - 10)))
    s = s.intersect(half)
    if side > 0:
        # restaurar el tubo de B (la mitad lo recorto): re-union tras el corte
        s = s.union(cq.Workplane("XY").circle(TUBE_B_OUT)
                    .extrude(0.0 - TUBE_B_END).translate((0, 0, TUBE_B_END)))
    # holgura de rodillos
    for k in range(6):
        s = s.cut(rodillo_en_sitio(k, extra_r=CLR, extra_l=0.55))
    # cunas de pasador (bloqueo positivo, caras cerradas)
    for k in range(6):
        u = axis_dir(k)
        if side < 0:
            p0 = axis_pt(k, -(S_BOSS + BOSS_L / 2 - 1.5))
            s = s.cut(cyl_along(p0, u, 3.35, 60))
        else:
            p_in = axis_pt(k, SMAX + 0.2)
            p_out = axis_pt(k, S_BOSS + BOSS_L / 2 - 1.5)
            seg = p_out - p_in
            Lg = float(np.linalg.norm(seg))
            for dz in np.linspace(0, 6, 13):
                s = s.cut(cq.Workplane(obj=cq.Solid.makeCylinder(
                    3.35 / 2, Lg, cq.Vector(p_in[0], p_in[1], p_in[2] - dz),
                    cq.Vector(*(seg / Lg)))))
    # bolsillo hex en la cara + taladro Ø9 pasante
    zhx = (-W2 - 0.01) if side < 0 else (W2 - HEX_DEPTH + 0.01)
    s = s.cut(cq.Workplane("XY").polygon(6, HEX_AF / cos(radians(30)))
              .extrude(HEX_DEPTH).translate((0, 0, zhx)))
    s = s.cut(cq.Workplane("XY").circle(BORE_D / 2).extrude(2 * W2 + 22)
              .translate((0, 0, -W2 - 11)))
    if side < 0:
        # bore del tubo de A (recibe el cilindro de B)
        s = s.cut(cq.Workplane("XY").circle(TUBE_A_BORE)
                  .extrude(W2).translate((0, 0, -(W2 - HEX_DEPTH - FLOOR_T))))
        # 3 pernos de expansion: taladro Ø2.9 con asiento de cabeza en el fondo
        for a in SCREW_ANGS:
            x, y = SCREW_R_T * cos(radians(a)), SCREW_R_T * sin(radians(a))
            s = s.cut(cq.Workplane("XY").circle(1.45).extrude(FLOOR_T + 1.0)
                      .translate((x, y, -W2 + HEX_DEPTH - 0.5)))
        # patron de 6 angulos: 3 rebajes gemelos
        for a in DECOR_ANGS:
            x, y = SCREW_R_T * cos(radians(a)), SCREW_R_T * sin(radians(a))
            s = s.cut(cq.Workplane("XY").circle(2.8).extrude(1.2)
                      .translate((x, y, -W2 + HEX_DEPTH - 0.01)))
    else:
        # extremo del tubo de B: 3 pilotos Ø2.4 (el perno expande la corona)
        for a in SCREW_ANGS:
            x, y = SCREW_R_T * cos(radians(a)), SCREW_R_T * sin(radians(a))
            s = s.cut(cq.Workplane("XY").circle(1.2).extrude(7.5)
                      .translate((x, y, TUBE_B_END - 0.01)))
        # patron de 6 angulos en el fondo de su bolsillo
        for a in SCREW_ANGS + DECOR_ANGS:
            x, y = SCREW_R_T * cos(radians(a)), SCREW_R_T * sin(radians(a))
            s = s.cut(cq.Workplane("XY").circle(2.8).extrude(1.8)
                      .translate((x, y, W2 - HEX_DEPTH - 1.79)))
    return s

def pasador():
    return cq.Workplane("XY").circle(PIN_D / 2).extrude(2 * (S_BOSS + 1.8)) \
        .translate((0, 0, -(S_BOSS + 1.8)))

def tornillo_m3x40():
    return (cq.Workplane("XY").circle(1.5).extrude(40)
            .union(cq.Workplane("XY").circle(2.8).extrude(3).translate((0, 0, -3)))
            .translate((0, 0, -20)))

def tornillo_m3x40_eje():
    return (cq.Workplane("XY").circle(1.5).extrude(40)
            .union(cq.Workplane("XY").circle(2.75).extrude(3).translate((0, 0, -3)))
            .translate((0, 0, -20)))

def perno_expansion():
    return (cq.Workplane("XY").circle(1.45).extrude(9.5)
            .union(cq.Workplane("XY").circle(2.6).extrude(1.8).translate((0, 0, -1.8))))

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
    from math import cos as _c, sin as _s, radians as _r
    for i, a in enumerate([30, 150, 270]):
        aa = a if hand == 'izq' else -a
        asm.add(perno_expansion(), name=f"perno_{i}", color=cq.Color(0.5, 0.5, 0.52),
                loc=cq.Location(cq.Vector(6.3 * _c(_r(aa)), 6.3 * _s(_r(aa)),
                                          -17.2 + 6.0)))
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
