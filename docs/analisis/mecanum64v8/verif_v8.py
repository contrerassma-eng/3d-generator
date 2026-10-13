# Verificacion v8 (encaje a presion con clic, sin pernos).
import numpy as np, trimesh
from scipy.spatial import cKDTree
from math import sin, cos, radians, sqrt

W2, D0, BETA = 18.3, 23.0, 46.0
SMAX, RARC = 33.5 / 2, 16.75 ** 2 / (2 * 2.5) + 2.5 / 2
CB, SB = cos(radians(BETA)), sin(radians(BETA))
DRUM_OUT, TEETH_H = 13.0, 5.0

A = trimesh.load('m64v8_placa_A_izq.stl'); A.merge_vertices()
B = trimesh.load('m64v8_placa_B_izq.stl'); B.merge_vertices()
R = trimesh.load('m64v8_rodillo.stl'); R.merge_vertices()

def Rz(a):
    a = radians(a); return np.array([[cos(a), -sin(a), 0], [sin(a), cos(a), 0], [0, 0, 1]])

def rho(s):
    s = max(min(s, SMAX), -SMAX)
    return (9.0 - RARC) + sqrt(RARC * RARC - s * s)

# --- rodillos en sitio ---
rods = []
for k in range(6):
    m = R.copy()
    m.apply_transform(trimesh.transformations.rotation_matrix(radians(-(90 - BETA)), [1, 0, 0]))
    m.apply_transform(trimesh.transformations.rotation_matrix(radians(60 * k), [0, 0, 1]))
    m.apply_translation(Rz(60 * k) @ np.array([D0, 0, 0]))
    rods.append(m)
ROD = trimesh.util.concatenate(rods)

pa = A.sample(120000); pb = B.sample(120000); pr = ROD.sample(160000)
tr = cKDTree(pr)
print(f'rodillo-placa: A={tr.query(pa)[0].min():.3f}  B={tr.query(pb)[0].min():.3f}')
d_rr = []
for i in range(6):
    o = trimesh.util.concatenate([rods[j] for j in range(6) if j != i])
    d_rr.append(cKDTree(o.sample(120000)).query(rods[i].sample(60000))[0].min())
print(f'rodillo-rodillo min = {min(d_rr):.3f}')

# --- envolvente ---
rr = np.hypot(ROD.vertices[:, 0], ROD.vertices[:, 1])
print(f'envolvente rodillos: O{2*rr.max()-0.4:.1f}-{2*rr.max():.1f}')

# --- ENCAJE: interferencia disenada A<->B en la corona ---
pqB = trimesh.proximity.ProximityQuery(B)
sel = pa[(pa[:, 2] > 0.2) & (pa[:, 2] < TEETH_H - 0.3) &
         (np.hypot(pa[:, 0], pa[:, 1]) < DRUM_OUT + 0.5)]
sd = pqB.signed_distance(sel)          # + = dentro de B  -> interferencia
print(f'--- ENCAJE (muestras del diente de A dentro de la zona de corona) ---')
print(f'interferencia MAX (aprieta) = {sd.max():.3f} mm  ·  '
      f'holgura max = {-sd.min():.3f} mm')
for z0, z1, et in [(0.2, 1.5, 'base   (apriete lateral)'),
                   (2.85, 3.40, 'barb   (retencion/clac)'),
                   (4.2, 4.7, 'punta  (entrada libre)')]:
    m = (sel[:, 2] > z0) & (sel[:, 2] < z1)
    if m.any():
        print(f'  z {z0:.2f}-{z1:.2f} {et}: interf. max {sd[m].max():+.3f} '
              f'/ media {sd[m].mean():+.3f}')

# --- pared entre ranura elastica y hexagono ---
pq = trimesh.proximity.ProximityQuery(A)
pts = []
for k in range(6):
    c = 60 * k + 15
    for z in np.linspace(-5, 4, 10):
        for r in np.linspace(8.3, 10.6, 24):
            pts.append(Rz(c) @ np.array([r, 0, z]))
pts = np.array(pts)
s2 = pq.signed_distance(pts)
dentro = pts[s2 > 0]
if len(dentro):
    rr2 = np.hypot(dentro[:, 0], dentro[:, 1])
    print(f'pared hex->ranura: material de r={rr2.min():.2f} a r={rr2.max():.2f} '
          f'(espesor {rr2.max()-rr2.min():.2f})')

# --- lengueta: geometria y tension estimada ---
E, delta, t, Lf = 5000.0, 0.19, 2.30, 8.85
sig = 3 * E * delta * t / (2 * Lf ** 2)
I = 3.5 * t ** 3 / 12
F = delta * 3 * E * I / Lf ** 3
print(f'lengueta: brazo {Lf} · espesor {t} · deflexion {delta} -> '
      f'sigma {sig:.0f} MPa (PA-CF en XY ~90-110) · F {F:.0f} N/lengueta · '
      f'12 lenguetas -> ~{12*F*(0.3+0.231)/(1-0.3*0.231):.0f} N de insercion')

# --- hex y volumenes ---
for nm, M in (('A', A), ('B', B)):
    pq2 = trimesh.proximity.ProximityQuery(M)
    z = -15.0 if nm == 'A' else 15.0
    caras = [pq2.signed_distance(np.array([[r*cos(radians(30)), r*sin(radians(30)), z]]))[0]
             for r in (7.25,)]
    print(f'placa {nm}: {M.volume/1000:.2f} cm3 · hex cara r7.25 signed={caras[0]:+.2f}')
print(f'ancho total = {A.bounds[1][2]-A.bounds[0][2] + B.bounds[1][2]-B.bounds[0][2] - TEETH_H + 0.2:.1f}')
