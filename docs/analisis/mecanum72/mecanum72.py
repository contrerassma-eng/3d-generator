# Mecanum72 v6 — rodillos existentes de Sergio + rodamientos 6804 en cada cara
# + polea GT2 48T (correa 6) sobre el costado + eje pasante redondo 1/2".
#
# Rodillos (capa user, gospel): L=33.5, Ø18 centro, Ø13 extremos, perforacion
# 3.5, pasador Ø3.2 (1/8"). beta=46. Ø64 (rodillos destrenzados) se CONSERVA;
# la rueda se ENSANCHA a 42 para alojar el 6804 (a z=-14 hay r libre 18.78).
# Centro: bore pasante Ø14.6 (eje 12.7 + holgura); tambores almenados v5 y los
# 4 pernos centrales SOBREVIVEN (ahora 2.9x16, cabezas ocultas bajo el
# rodamiento). Polea y anillo retenedor: discos-brida con 12 taladros
# (patron simetrico: sirven a placa A o B, izq o der) + 6 tornillos 2.9x9.5
# a los brazos de la estrella. Par de correa via los 6 tornillos.

import cadquery as cq
import numpy as np
from math import sin, cos, radians, degrees, sqrt, atan2
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------- parametros ----------------
D0 = 23.0                 # radio primitivo de ejes de rodillo (Ø64: destrenzado)
R = D0 + 9.0              # 32: radio de envolvente nominal (Ø64)
BETA = 46.0
SMAX = 33.5 / 2
RARC = 16.75 ** 2 / (2 * 2.5) + 2.5 / 2   # 57.36 arco meridiano del rodillo
CB, SB = cos(radians(BETA)), sin(radians(BETA))
W2 = 21.0                 # semiancho: 42 de ancho para alojar los 6804
ROD_BORE = 3.5
CLR = 1.0                 # holgura placa-rodillo (radial); 0.7 axial
PIN_D = 3.2
S_BOSS = SMAX + 0.55 + 2.4          # 19.7 sobre el eje del rodillo
BOSS_L = 5.2
ROWS = [0, 60, 120, 180, 240, 300]
BOSS_ANG = degrees(atan2(S_BOSS * CB, D0))   # 26.9: desfase angular del teton
# acople central (v5)
DRUM_OUT = 12.6           # tambor almenado (rfree(0)=14.0 -> holgura 1.4)
TEETH_H = 3.5
TEETH_CLR = 0.8           # holgura angular TOTAL por flanco (0.4+0.4)
SCREW4_R = 9.6
SCREW4_ANGS = [45, 135, 225, 315]
LEDGE_Z = -11.3           # asiento de cabeza de los pernos centrales (en A)
# rodamiento 6804: 20 x 32 x 7
BRG_OD, BRG_ID, BRG_W = 32.0, 20.0, 7.0
SEAT_D = BRG_OD + 0.15    # 32.15 prensa suave en PA-CF
SEAT_Z = W2 - BRG_W       # 14.0: plano del fondo del asiento
BOSS_R = 21.0             # cubo de cara (pared 2.5+ sobre el asiento)
BORE_D = 13.4             # pasante: eje redondo 1/2" (12.7) + holgura
BOLT_R = 19.0             # 6 tornillos 2.9x6 de brida, en el cubo
BOLT_ANGS = [30 * i for i in range(12)]   # patron cada 30: sirve A/B, izq/der
# polea GT2 48T, correa 6
GT2_TEETH = 48
GT2_PD = GT2_TEETH * 2.0 / np.pi          # 30.558
GT2_OD = GT2_PD - 2 * 0.254               # 30.05
FL_D, FL_T = 48.0, 3.0                    # disco-brida
FL_BORE = 25.0                            # libra la pista interior del 6804
RING_W = 7.0                              # ancho dentado (correa 6)
LIP_D, LIP_T = 34.0, 1.2                  # pestaña exterior

def Rz(a):
    a = radians(a)
    return np.array([[cos(a), -sin(a), 0], [sin(a), cos(a), 0], [0, 0, 1]])

def rho(s):
    s = max(min(s, SMAX), -SMAX)
    return (9.0 - RARC) + sqrt(RARC * RARC - s * s)

def axis_pt(k, s):
    return Rz(ROWS[k]) @ np.array([D0, s * CB, s * SB])

def axis_dir(k):
    return Rz(ROWS[k]) @ np.array([0, CB, SB])

def wedge(a0, a1, h0, h1, R120=120):
    pts = [(0, 0)] + [(R120 * cos(radians(a)), R120 * sin(radians(a)))
                      for a in [a0 + i * (a1 - a0) / 8 for i in range(9)]]
    return (cq.Workplane("XY").polyline(pts).close()
            .extrude(h1 - h0).translate((0, 0, h0)))

def cyl_along(p0, u, d, L):
    return cq.Workplane(obj=cq.Solid.makeCylinder(
        d / 2, L, cq.Vector(*p0), cq.Vector(*u)))

def rodillo_solid(extra_r=0.0, extra_l=0.0, bore=True):
    h = SMAX + extra_l
    xs = np.linspace(-h, h, 41)
    prof = [(0.01, -h)] + [(rho(x) + extra_r, float(x)) for x in xs] + [(0.01, h)]
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

def estrella_v4(Rt, r_in, centers, hs, chord_off=5.0, n_arc=16):
    """receta del boceto (flancos tangentes rectos) + filetes leves 3.0/1.5"""
    da = degrees(np.arccos(r_in / Rt))
    pts = []
    centers = sorted(centers)
    m = len(centers)
    for i, c in enumerate(centers):
        aL, aR = c - hs, c + hs
        for t in np.linspace(aL, aR, n_arc):
            pts.append((Rt * cos(radians(t)), Rt * sin(radians(t))))
        c_next = centers[(i + 1) % m] + (360 if i == m - 1 else 0)
        t1, t2 = aR + da, c_next - hs - chord_off
        if t2 < t1:
            t2 = t1 + 1.0
        for t in np.linspace(t1, t2, max(4, int((t2 - t1) / 6))):
            pts.append((r_in * cos(radians(t)), r_in * sin(radians(t))))
    from shapely.geometry import Polygon
    # redondeo LEVE (pedido 01-09): la estrella vuelve a la silueta v4 — los
    # flancos rectos estructurales se conservan; solo se matan los vertices:
    # concavos r3.0, convexos (puntas) r1.5. Nada de r10: eso borraba las lineas.
    poly = Polygon(pts)
    poly = poly.buffer(3.0, quad_segs=24).buffer(-3.0, quad_segs=24)
    poly = poly.buffer(-1.5, quad_segs=24).buffer(1.5, quad_segs=24)
    coords = list(poly.exterior.coords)[:-1]
    return cq.Workplane("XY").polyline(coords).close()

def bombeo_solid():
    zk = W2 - 6.0
    prof = [(0.02, -W2), (R - 4.0, -W2)]
    for t in np.linspace(0, 1, 9)[1:]:
        prof.append((R - 0.8 - 3.2 * (1 - t) ** 2, -W2 + 6.0 * t))
    prof += [(R - 0.8, zk)]
    for t in np.linspace(0, 1, 9)[1:]:
        prof.append((R - 0.8 - 3.2 * t ** 2, zk + (W2 - zk) * t))
    prof += [(0.02, W2)]
    return (cq.Workplane("XZ").polyline(prof).close()
            .revolve(360, (0, 0, 0), (0, 1, 0)))

def arm_angles(side):
    return sorted((ROWS[k] + (-1 if side < 0 else 1) * BOSS_ANG) % 360
                  for k in range(6))

def placa(side):
    """side=-1 -> placa A (dientes de corona); +1 -> placa B (bolsillos).
    Cara con asiento 6804 abierto hacia afuera; sin taladros visibles salvo
    los 6 pilotos de brida en los brazos."""
    z_face = -W2 if side < 0 else W2 - 4.6
    zf = -W2 if side < 0 else W2
    centers = arm_angles(side)
    s = estrella_v4(R - 0.8, 12.0, centers, hs=10.0, chord_off=5.0) \
        .extrude(4.6).translate((0, 0, z_face))
    # cubo de cara (porta el asiento del rodamiento)
    zb = (-W2, -SEAT_Z + 3.5) if side < 0 else (SEAT_Z - 3.5, W2)
    s = s.union(cq.Workplane("XY").circle(BOSS_R).extrude(zb[1] - zb[0])
                .translate((0, 0, zb[0])))
    # tambor central almenado
    if side < 0:
        s = s.union(cq.Workplane("XY").circle(DRUM_OUT)
                    .extrude(SEAT_Z + TEETH_H - 0.2).translate((0, 0, -SEAT_Z)))
        for k in range(6):
            g0 = 60 * k + 30 - TEETH_CLR / 2
            g1 = 60 * k + 60 + TEETH_CLR / 2
            s = s.cut(wedge(g0, g1, -0.01, TEETH_H + 0.05).intersect(
                cq.Workplane("XY").circle(DRUM_OUT + 1).extrude(TEETH_H + 0.06)
                .translate((0, 0, -0.01))))
    else:
        s = s.union(cq.Workplane("XY").circle(DRUM_OUT).extrude(SEAT_Z))
        for k in range(6):
            g0 = 60 * k - TEETH_CLR / 2
            g1 = 60 * k + 30 + TEETH_CLR / 2
            s = s.cut(wedge(g0, g1, -0.05, TEETH_H).intersect(
                cq.Workplane("XY").circle(DRUM_OUT + 1).extrude(TEETH_H + 0.05)
                .translate((0, 0, -0.05))))
    # abombado lateral
    s = s.intersect(bombeo_solid())
    # holgura de rodillos
    for k in range(6):
        s = s.cut(rodillo_en_sitio(k, extra_r=CLR, extra_l=0.7))
    # cunas de pasador Ø3.5
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
    # asiento 6804 (abierto a la cara) + alivio bajo el aro interior
    if side < 0:
        s = s.cut(cq.Workplane("XY").circle(SEAT_D / 2).extrude(BRG_W + 0.1)
                  .translate((0, 0, -W2 - 0.05)))
        s = s.cut(cq.Workplane("XY").circle(14.0).extrude(0.7)
                  .translate((0, 0, -SEAT_Z - 0.05)))
    else:
        s = s.cut(cq.Workplane("XY").circle(SEAT_D / 2).extrude(BRG_W + 0.1)
                  .translate((0, 0, W2 - BRG_W - 0.05)))
        s = s.cut(cq.Workplane("XY").circle(14.0).extrude(0.7)
                  .translate((0, 0, SEAT_Z - 0.65)))
    # pilotos de brida: 12 cada 30 (polea/retenedor calzan en cualquier cara)
    for a in BOLT_ANGS:
        x, y = BOLT_R * cos(radians(a)), BOLT_R * sin(radians(a))
        s = s.cut(cq.Workplane("XY").circle(1.25).extrude(4.4)
                  .translate((x, y, zf if side < 0 else zf - 4.4)))
    # 4 pernos centrales 2.9x16 (cabezas ocultas bajo el rodamiento de A)
    for a in SCREW4_ANGS:
        x, y = SCREW4_R * cos(radians(a)), SCREW4_R * sin(radians(a))
        if side < 0:
            s = s.cut(cq.Workplane("XY").circle(2.95)
                      .extrude(LEDGE_Z - (-SEAT_Z - 0.7))
                      .translate((x, y, -SEAT_Z - 0.7)))
            s = s.cut(cq.Workplane("XY").circle(1.55).extrude(SEAT_Z + 1.3)
                      .translate((x, y, -SEAT_Z - 0.8)))
        else:
            s = s.cut(cq.Workplane("XY").circle(1.25).extrude(9.5)
                      .translate((x, y, -0.5)))
    # bore pasante del eje 1/2"
    s = s.cut(cq.Workplane("XY").circle(BORE_D / 2).extrude(2 * W2 + 10)
              .translate((0, 0, -W2 - 5)))
    return s

# ---------------- polea / retenedor / herrajes ----------------
def gt2_ring_2d():
    """contorno 2D del anillo dentado GT2 48T (perfil droftarts + holgura)"""
    from shapely.geometry import Polygon, Point
    from shapely.ops import unary_union
    half = [(0.747183, -0.5), (0.747183, 0), (0.647876, 0.037218),
            (0.598311, 0.130528), (0.578556, 0.238423), (0.547158, 0.343077),
            (0.504649, 0.443762), (0.451556, 0.53975), (0.358229, 0.636924),
            (0.2484, 0.707276), (0.127259, 0.750044), (0, 0.76447)]
    tooth = [(x * 1.08, y * 1.06) for x, y in half]
    tooth = [(-x, y) for x, y in reversed(tooth)][:-1] + tooth
    Ro = GT2_OD / 2
    disc = Point(0, 0).buffer(Ro, quad_segs=180)
    cavs = []
    for i in range(GT2_TEETH):
        th = radians(i * 360.0 / GT2_TEETH)
        u = np.array([cos(th), sin(th)])
        t = np.array([-sin(th), cos(th)])
        cavs.append(Polygon([tuple((Ro - y) * u + x * t) for x, y in tooth]))
    ring = disc.difference(unary_union(cavs))
    return list(ring.exterior.coords)[:-1]

def brida_comun(con_anillo):
    """disco-brida Ø46x3, 12 taladros 2.9 (patron ±26.9 mod 60: sirve para
    A/B, izq/der); la polea añade el anillo dentado GT2. Marco local: z=0 =
    plano contra la cara de la rueda; el cuerpo crece hacia -z."""
    s = cq.Workplane("XY").circle(FL_D / 2).extrude(-FL_T)
    if con_anillo:
        s = s.union(cq.Workplane("XY").polyline(gt2_ring_2d()).close()
                    .extrude(-RING_W).translate((0, 0, -FL_T)))
        zl = -FL_T - RING_W
        s = s.union(cq.Workplane("XY").circle(LIP_D / 2).extrude(-LIP_T)
                    .translate((0, 0, zl)))
        ch = (LIP_D - GT2_OD + 1) / 2
        s = s.union(cq.Workplane("XZ").polyline(
            [(GT2_OD / 2 - 0.5, zl), (LIP_D / 2, zl),
             (GT2_OD / 2 - 0.5, zl + ch)]).close()
            .revolve(360, (0, 0, 0), (0, 1, 0)))
    # bore central: cubre el aro exterior del 6804 (lo retiene) y libra el interior
    s = s.cut(cq.Workplane("XY").circle(FL_BORE / 2).extrude(30)
              .translate((0, 0, -15)))
    # 12 taladros 2.9 pasantes + cajas de cabeza en la cara exterior
    for a in BOLT_ANGS:
        x, y = BOLT_R * cos(radians(a)), BOLT_R * sin(radians(a))
        s = s.cut(cq.Workplane("XY").circle(1.55).extrude(FL_T + 0.2)
                  .translate((x, y, -FL_T - 0.1)))
        s = s.cut(cq.Workplane("XY").circle(2.95).extrude(1.2)
                  .translate((x, y, -FL_T - 0.01)))
    return s

def polea_gt2():
    return brida_comun(True)

def retenedor():
    return brida_comun(False)

def casquillo():
    """reductor eje 1/2" -> bore 20 del 6804, con brida de empuje Ø22"""
    s = (cq.Workplane("XY").circle(19.9 / 2).extrude(BRG_W)
         .union(cq.Workplane("XY").circle(22.0 / 2).extrude(1.2)
                .translate((0, 0, -1.2))))
    return s.cut(cq.Workplane("XY").circle(12.85 / 2).extrude(12)
                 .translate((0, 0, -2)))

def eje_stub(L=60.0):
    s = cq.Workplane("XY").circle(12.65 / 2).extrude(L - 1.0)
    s = s.union(cq.Workplane("XZ").polyline(
        [(0.02, L - 1.0), (12.65 / 2, L - 1.0), (12.65 / 2 - 1.0, L),
         (0.02, L)]).close().revolve(360, (0, 0, 0), (0, 1, 0)))
    return s

def rodamiento_6804():
    def ring(r0, r1, w):
        return (cq.Workplane("XY").circle(r1).circle(r0).extrude(w)
                .translate((0, 0, -w / 2)))
    return (ring(BRG_ID / 2, 11.6, BRG_W)
            .union(ring(14.35, BRG_OD / 2, BRG_W))
            .union(ring(11.6, 14.35, 3.4)))

def pasador():
    return cq.Workplane("XY").circle(PIN_D / 2).extrude(2 * (S_BOSS + 1.8)) \
        .translate((0, 0, -(S_BOSS + 1.8)))

def tornillo(d_shank, L, d_head, h_head):
    return (cq.Workplane("XY").circle(d_shank / 2).extrude(L)
            .union(cq.Workplane("XY").circle(d_head / 2).extrude(h_head)
                   .translate((0, 0, -h_head))))

def build(hand='izq'):
    pa, pb = placa(-1), placa(+1)
    rod = rodillo_solid()
    if hand == 'der':
        pa = pa.mirror(mirrorPlane="XZ")
        pb = pb.mirror(mirrorPlane="XZ")
    asm = cq.Assembly(name=f"Mecanum72_{hand}")
    asm.add(pa, name="placa_A", color=cq.Color(0.72, 0.72, 0.75))
    asm.add(pb, name="placa_B", color=cq.Color(0.72, 0.72, 0.75))
    for k in range(6):
        a = ROWS[k] if hand == 'izq' else -ROWS[k]
        tilt = -(90 - BETA) if hand == 'izq' else (90 - BETA)
        loc = (cq.Location(cq.Vector(0, 0, 0), cq.Vector(0, 0, 1), a) *
               cq.Location(cq.Vector(D0, 0, 0)) *
               cq.Location(cq.Vector(0, 0, 0), cq.Vector(1, 0, 0), tilt))
        asm.add(rod, name=f"rodillo_{k}", color=cq.Color(0.10, 0.10, 0.11), loc=loc)
        asm.add(pasador(), name=f"pasador_{k}", color=cq.Color(0.45, 0.45, 0.48),
                loc=loc)
    for zs, nm in ((-1, 'A'), (1, 'B')):
        asm.add(rodamiento_6804(), name=f"rodamiento_{nm}",
                color=cq.Color(0.62, 0.62, 0.65),
                loc=cq.Location(cq.Vector(0, 0, zs * (W2 - BRG_W / 2))))
        asm.add(casquillo(), name=f"casquillo_{nm}", color=cq.Color(0.9, 0.7, 0.25),
                loc=(cq.Location(cq.Vector(0, 0, -W2)) if zs < 0 else
                     cq.Location(cq.Vector(0, 0, W2), cq.Vector(1, 0, 0), 180)))
    asm.add(polea_gt2(), name="polea_48T", color=cq.Color(0.85, 0.45, 0.15),
            loc=cq.Location(cq.Vector(0, 0, -W2)))
    asm.add(retenedor(), name="retenedor", color=cq.Color(0.85, 0.45, 0.15),
            loc=cq.Location(cq.Vector(0, 0, W2), cq.Vector(1, 0, 0), 180))
    asm.add(eje_stub(), name="eje_media", color=cq.Color(0.55, 0.55, 0.58),
            loc=cq.Location(cq.Vector(0, 0, -30)))
    for i, a in enumerate(SCREW4_ANGS):
        aa = a if hand == 'izq' else -a
        asm.add(tornillo(2.9, 20, 5.6, 2.0), name=f"perno_c{i}",
                color=cq.Color(0.5, 0.5, 0.52),
                loc=cq.Location(cq.Vector(SCREW4_R * cos(radians(aa)),
                                          SCREW4_R * sin(radians(aa)), LEDGE_Z)))
    return pa, pb, rod, asm

if __name__ == '__main__':
    for hand in ('izq', 'der'):
        pa, pb, rod, asm = build(hand)
        for n, s in [(f'mec72_placa_A_{hand}', pa), (f'mec72_placa_B_{hand}', pb)]:
            print(f"{n:22s} vol={s.val().Volume()/1000:6.2f} cm3", flush=True)
            cq.exporters.export(s, os.path.join(OUT, n + '.step'))
            cq.exporters.export(s, os.path.join(OUT, n + '.stl'),
                                tolerance=0.03, angularTolerance=0.25)
        asm.save(os.path.join(OUT, f'mec72_ensamble_{hand}.step'))
        print(f'ensamble {hand} exportado', flush=True)
    for nm, s in [('mec72_polea_48T', polea_gt2()), ('mec72_retenedor', retenedor()),
                  ('mec72_casquillo', casquillo()), ('mec72_eje_test', eje_stub())]:
        print(f"{nm:22s} vol={s.val().Volume()/1000:6.2f} cm3", flush=True)
        cq.exporters.export(s, os.path.join(OUT, nm + '.step'))
        cq.exporters.export(s, os.path.join(OUT, nm + '.stl'),
                            tolerance=0.03, angularTolerance=0.25)
    print('done', flush=True)
