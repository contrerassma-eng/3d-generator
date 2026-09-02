# Mecanum64 v7 — hex 14.5 PASANTE al centro; encajes y pernos FUERA del hex.
# (v7 parte de la v5 — sin polea ni rodamientos — con la estrella estructural
# de la v4 y filetes leves. Pedido de Sergio 01-09.)
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

R = 32.0    # radio de envolvente nominal (Ø64): destrenza los rodillos
RHO0, RHOE = 9.0, 6.5             # radios del rodillo fisico (centro / extremos)
SMAX = 33.5 / 2                   # semilargo del rodillo fisico
BETA = 46.0                       # el 45 del boceto; optimizado con d0
D0 = 23.0                         # radio primitivo de ejes: holgura rodillos 0.71
RARC = 16.75 ** 2 / (2 * 2.5) + 2.5 / 2   # 57.36: arco meridiano del rodillo FISICO
from math import cos as _cos, sin as _sin
CB = _cos(radians(BETA))
SB = _sin(radians(BETA))
ZOFF = 0.0    # P1/P2 del boceto = los dos planos de tetones (z ±14.9)
W2 = 18.3   # +1 por lado (v7.2): robustez de pestanas y tapas
BORE_D = 9.0   # (solo referencia; el hex 14 va PASANTE)
HEX_AF = 14.5        # PASANTE; vertices en 0/60/... (caras planas a 30+60k)
PIN_D = 3.2
ROD_BORE = 3.5      # perforacion real del rodillo (usuario)
CLR = 1.0           # holgura placa-rodillo: +0.3 por descuelgue (eje 3.2 en 3.5)
S_BOSS = SMAX + 0.55 + 2.4          # 19.7: centro del teton sobre el eje
BOSS_D, BOSS_L = 7.6, 5.2
ROWS = [0, 60, 120, 180, 240, 300]
SCREW_AXLES = []          # v3: todos los ejes son pasadores en cunas cerradas
# --- acople v5: tambores almenados que se topan + 4 pernos (ref. Printables 58) ---
HEX_DEPTH = 6.0           # bolsillo hex 14 e/c en cada cara
FLOOR_T = 2.5
DRUM_OUT = 13.0           # tambor almenado alrededor del hex (rfree(0)=14.0)
TEETH_H = 3.5             # altura de la corona almenada (6 dientes de 30°)
TEETH_CLR = 0.8           # holgura angular TOTAL por flanco (0.4+0.4)
SCREW4_R = 10.9           # pernos frente a las CARAS del hex (pared 2.1)
SCREW4_ANGS = [30, 150, 270]   # normales de cara plana del hex

def zc_of(k):
    return ZOFF if k % 2 == 0 else -ZOFF

def rho(s):
    s = max(min(s, SMAX), -SMAX)
    return (9.0 - RARC) + sqrt(RARC * RARC - s * s)

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

def estrella_v4(Rt, r_in, centers, hs, chord_off=6.0, n_arc=16):
    """Receta del boceto: por brazo, mini-ARCO exterior proyectado en la
    circunferencia (Rt, semiancho hs); del borde derecho, TANGENTE recta a la
    circunferencia invisible r_in; arco sobre r_in; y LADO CORTO en recta al
    borde izquierdo del siguiente mini-arco. Todo tangente y armonico."""
    da = degrees(np.arccos(r_in / Rt))          # avance de tangencia
    pts = []
    centers = sorted(centers)
    m = len(centers)
    for i, c in enumerate(centers):
        aL, aR = c - hs, c + hs
        for t in np.linspace(aL, aR, n_arc):    # mini arco exterior
            pts.append((Rt * cos(radians(t)), Rt * sin(radians(t))))
        c_next = centers[(i + 1) % m] + (360 if i == m - 1 else 0)
        t1 = aR + da                            # tangencia del flanco largo
        t2 = c_next - hs - chord_off            # arranque del lado corto
        if t2 < t1:
            t2 = t1 + 1.0
        for t in np.linspace(t1, t2, max(4, int((t2 - t1) / 6))):
            pts.append((r_in * cos(radians(t)), r_in * sin(radians(t))))
    from shapely.geometry import Polygon
    poly = Polygon(pts)
    poly = poly.buffer(3.0, quad_segs=24).buffer(-3.0, quad_segs=24)    # concavos r3 (leve)
    poly = poly.buffer(-1.5, quad_segs=24).buffer(1.5, quad_segs=24)    # puntas r1.5 (leve)
    coords = list(poly.exterior.coords)[:-1]
    return cq.Workplane("XY").polyline(coords).close()

def bombeo_solid():
    """abombado lateral: de costado la rueda cierra levemente arriba/abajo"""
    zk = W2 - 6.0
    prof = [(0.02, -W2), (R - 4.0, -W2)]
    for t in np.linspace(0, 1, 9)[1:]:
        z = -W2 + 6.0 * t
        prof.append((R - 0.8 - 3.2 * (1 - t) ** 2, z))
    prof += [(R - 0.8, zk), ]
    for t in np.linspace(0, 1, 9)[1:]:
        z = zk + (W2 - zk) * t
        prof.append((R - 0.8 - 3.2 * t ** 2, z))
    prof += [(0.02, W2)]
    return (cq.Workplane("XZ").polyline(prof).close()
            .revolve(360, (0, 0, 0), (0, 1, 0)))

def esbeltez_solid():
    """curvatura lateral leve: cara plana hasta r24, luego cae cuadratico
    1.6 mm por cara en el filo -> silueta lateral esbelta (marca amarilla)"""
    import numpy as np
    prof = [(0.02, -W2), (24.0, -W2)]
    for t in np.linspace(0, 1, 9)[1:]:
        prof.append((24.0 + (R - 24.0) * t, -(W2 - 1.6 * t * t)))
    for t in np.linspace(1, 0, 9):
        prof.append((24.0 + (R - 24.0) * t, W2 - 1.6 * t * t))
    prof += [(0.02, W2)]
    return (cq.Workplane("XZ").polyline(prof).close()
            .revolve(360, (0, 0, 0), (0, 1, 0)))

def placa(side):
    """v3 — mecanismo de acople tipo juguete:
       A (side=-1): tubo exterior con bore Ø16.2; bolsillo hex 14x6 en cara +
         placa de fondo con 3 pernos en r6.3 que entran en el tubo de B.
       B (side=+1): cilindro estrecho Ø15.9 que telescopa en A hasta z=-8.2;
         los pernos lo expanden contra A -> ensamble bloqueado.
       6 pasadores en cunas cerradas enfrentadas (caras sin taladros).
       Estrellas desfasadas 30 (patron del boceto). Patron de 6 angulos en el
       fondo del bolsillo (3 cabezas + 3 rebajes)."""
    z_face = -W2 if side < 0 else W2 - 6.0   # cara 6.0 (antes 4.6): robustez
    boss_ang = degrees(atan2(side * S_BOSS * CB, D0))
    # brazos: cada uno abarca un PAR de tetones propios (como la rueda real)
    # 6 brazos armonicos: cada brazo porta UN teton (mini-arco centrado en el)
    centers = sorted((ROWS[k] + boss_ang) % 360 for k in range(6))
    s = estrella_v4(R - 0.8, 13.5, centers, hs=10.0, chord_off=5.0) \
        .extrude(6.0).translate((0, 0, z_face))
    # cubo de cara (aloja el bolsillo hex)
    zhub = -W2 if side < 0 else W2 - (HEX_DEPTH + FLOOR_T)
    s = s.union(cq.Workplane("XY").circle(12.0).extrude(HEX_DEPTH + FLOOR_T)
                .translate((0, 0, zhub)))
    # carrete exterior (perfil libre bajo los rodillos)
    prof = free_hub_profile(-W2 if side < 0 else 0.0, 0.0 if side < 0 else W2)
    poly = [(0.02, prof[0][1])] + [(min(max(r, 9.3), 13.2), z) for r, z in prof] + \
           [(0.02, prof[-1][1])]
    s = s.union(cq.Workplane("XZ").polyline(poly).close()
                .revolve(360, (0, 0, 0), (0, 1, 0)))
    # tambor central almenado: los DIENTES de A cruzan el plano medio (z 0..3.3)
    # y entran en BOLSILLOS de B (prof. 3.5) -> bloqueo rotacional real
    if side < 0:
        s = s.union(cq.Workplane("XY").circle(DRUM_OUT)
                    .extrude(W2 + TEETH_H - 0.2).translate((0, 0, -W2)))
        for k in range(6):
            g0, g1 = 60 * k + 30 - TEETH_CLR / 2, 60 * k + 60 + TEETH_CLR / 2
            s = s.cut(wedge(g0, g1, -0.01, TEETH_H + 0.05).intersect(
                cq.Workplane("XY").circle(DRUM_OUT + 1).extrude(TEETH_H + 0.06)
                .translate((0, 0, -0.01))))
    else:
        s = s.union(cq.Workplane("XY").circle(DRUM_OUT).extrude(W2))
        for k in range(6):
            g0, g1 = 60 * k - TEETH_CLR / 2, 60 * k + 30 + TEETH_CLR / 2
            s = s.cut(wedge(g0, g1, -0.05, TEETH_H).intersect(
                cq.Workplane("XY").circle(DRUM_OUT + 1).extrude(TEETH_H + 0.05)
                .translate((0, 0, -0.05))))
    # abombado lateral + perfil de esbeltez de las caras
    s = s.intersect(bombeo_solid())
    s = s.intersect(esbeltez_solid())
    # holgura de rodillos
    for k in range(6):
        s = s.cut(rodillo_en_sitio(k, extra_r=CLR, extra_l=0.7))
    # cunas de pasador Ø3.5 (eje 3.2 flotante, capturado al cerrar)
    for k in range(6):
        u = axis_dir(k)
        if side < 0:
            p0 = axis_pt(k, -(S_BOSS + BOSS_L / 2 - 1.5))
            s = s.cut(cyl_along(p0, u, 3.5, 60))
        else:
            p_in = axis_pt(k, SMAX + 0.2)
            p_out = axis_pt(k, S_BOSS + BOSS_L / 2 - 1.5)
            seg = p_out - p_in
            Lg = float(np.linalg.norm(seg))
            for dz in np.linspace(0, 6, 13):
                s = s.cut(cq.Workplane(obj=cq.Solid.makeCylinder(
                    3.5 / 2, Lg, cq.Vector(p_in[0], p_in[1], p_in[2] - dz),
                    cq.Vector(*(seg / Lg)))))
    # 3 pernos 2.9x25 frente a las caras planas del hex (cosen la almena;
    # cada uno cruza el plano medio por el CENTRO de un diente de B)
    for a in SCREW4_ANGS:
        x, y = SCREW4_R * cos(radians(a)), SCREW4_R * sin(radians(a))
        if side < 0:
            s = s.cut(cq.Workplane("XY").circle(1.55).extrude(W2 + 1)
                      .translate((x, y, -W2 - 0.5)))
            s = s.cut(cq.Workplane("XY").circle(2.95).extrude(2.2)
                      .translate((x, y, -W2 - 0.01)))
        else:
            s = s.cut(cq.Workplane("XY").circle(1.25).extrude(11.4)
                      .translate((x, y, -0.5)))
    # hexagono 14.5 e/c PASANTE (vertices en 0/60/...; sin otro taladro)
    s = s.cut(cq.Workplane("XY").polygon(6, HEX_AF / cos(radians(30)))
              .extrude(2 * W2 + 10).translate((0, 0, -W2 - 5)))
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

def tornillo_29x25():
    return (cq.Workplane("XY").circle(1.45).extrude(25)
            .union(cq.Workplane("XY").circle(2.75).extrude(2.0).translate((0, 0, -2.0))))

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
    for i, a in enumerate(SCREW4_ANGS):
        aa = a if hand == 'izq' else -a
        asm.add(tornillo_29x25(), name=f"perno_{i}", color=cq.Color(0.5, 0.5, 0.52),
                loc=cq.Location(cq.Vector(SCREW4_R * _c(_r(aa)), SCREW4_R * _s(_r(aa)),
                                          -W2 + 2.2)))
    return pa, pb, rod, asm

if __name__ == '__main__':
    for hand in ('izq', 'der'):
        pa, pb, rod, asm = build(hand)
        for n, s in [(f'm64v7_placa_A_{hand}', pa), (f'm64v7_placa_B_{hand}', pb)]:
            print(f"{n:22s} vol={s.val().Volume()/1000:6.2f} cm3")
            cq.exporters.export(s, os.path.join(OUT, n + '.step'))
            cq.exporters.export(s, os.path.join(OUT, n + '.stl'),
                                tolerance=0.03, angularTolerance=0.25)
        asm.save(os.path.join(OUT, f'm64v7_ensamble_{hand}.step'))
        print(f'ensamble {hand} exportado')
    cq.exporters.export(rodillo_solid(), os.path.join(OUT, 'm64v7_rodillo.step'))
    cq.exporters.export(rodillo_solid(), os.path.join(OUT, 'm64v7_rodillo.stl'),
                        tolerance=0.03, angularTolerance=0.25)
    print('done')
