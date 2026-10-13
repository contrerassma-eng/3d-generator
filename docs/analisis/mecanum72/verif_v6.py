import numpy as np, trimesh, os
from math import sin, cos, radians
from scipy.spatial import cKDTree

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)
BETA, D0, W2 = 46.0, 23.0, 21.0
ROWS = [0, 60, 120, 180, 240, 300]

A = trimesh.load(p('mec72_placa_A_izq.stl'))
B = trimesh.load(p('mec72_placa_B_izq.stl'))
rod = trimesh.load(p('mec72_rodillo.stl')) if os.path.exists(p('mec72_rodillo.stl')) \
    else trimesh.load(p('mec50_rodillo.stl'))
pol = trimesh.load(p('mec72_polea_48T.stl'))
ret = trimesh.load(p('mec72_retenedor.stl'))

def Rx(a):
    a = radians(a); return np.array([[1,0,0],[0,cos(a),-sin(a)],[0,sin(a),cos(a)]])
def Rzm(a):
    a = radians(a); return np.array([[cos(a),-sin(a),0],[sin(a),cos(a),0],[0,0,1]])

def roller_at(k):
    m = rod.copy()
    T = np.eye(4); T[:3,:3] = Rx(-(90-BETA)); m.apply_transform(T)
    m.apply_translation([D0,0,0])
    T = np.eye(4); T[:3,:3] = Rzm(ROWS[k]); m.apply_transform(T)
    return m

def surf(m, n):
    return trimesh.sample.sample_surface(m, n)[0]

rollers = [roller_at(k) for k in range(6)]
sA, sB = surf(A, 20000), surf(B, 20000)
tA, tB = cKDTree(sA), cKDTree(sB)
qa, qb = trimesh.proximity.ProximityQuery(A), trimesh.proximity.ProximityQuery(B)

dA = min(tA.query(surf(r, 6000))[0].min() for r in rollers)
dB = min(tB.query(surf(r, 6000))[0].min() for r in rollers)
pen = max(max(qa.signed_distance(surf(r, 2000)).max(),
              qb.signed_distance(surf(r, 2000)).max()) for r in rollers[:3])
print(f'rodillo-placa: A={dA:.3f} B={dB:.3f}  interferencia={pen:.3f}')

sr = [surf(r, 8000) for r in rollers]
print('rodillo-rodillo min = %.3f' %
      min(cKDTree(sr[k]).query(sr[(k+1)%6])[0].min() for k in range(6)))

mA = (np.abs(sA[:,2]) < 5.5) & (np.hypot(sA[:,0], sA[:,1]) < 15.5)
mB = (np.abs(sB[:,2]) < 5.5) & (np.hypot(sB[:,0], sB[:,1]) < 15.5)
print('A dentro de B: %.3f | B dentro de A: %.3f | holgura corona %.3f' %
      (qb.signed_distance(sA[mA]).max(), qa.signed_distance(sB[mB]).max(),
       cKDTree(sA[mA]).query(sB[mB])[0].min()))

allr = np.vstack([r.vertices for r in rollers])
rr = np.hypot(allr[:,0], allr[:,1])
ang = np.degrees(np.arctan2(allr[:,1], allr[:,0])) % 360
env = [rr[(ang>=a)&(ang<a+5)].max() for a in range(0,360,5)]
print('envolvente rodillos: Ø%.1f–%.1f' % (2*min(env), 2*max(env)))

# asiento 6804: radio libre en la cara y profundidad
for nm, M in (('A', A), ('B', B)):
    v = M.vertices
    zf = v[:,2].min() if nm == 'A' else v[:,2].max()
    sg = 1 if nm == 'A' else -1
    for d in (0.5, 3.5, 6.5, 7.5, 9.0):
        z = zf + sg*d
        m = np.abs(v[:,2]-z) < 0.35
        if m.any():
            r = np.hypot(v[m,0], v[m,1])
            inner = r[r < 25]
            print(f'  {nm} z=cara+{d:4.1f}: r_int_min={inner.min():5.2f} '
                  f'r_int_max={inner.max():5.2f}')

# taladros de brida vs pilotos de placa
for nm, M, rref in (('polea', pol, None), ('retenedor', ret, None)):
    v = M.vertices
    zt = v[:,2].max()
    m = np.abs(v[:,2]-(zt-0.05)) < 0.3
    r = np.hypot(v[m,0], v[m,1])
    print(f'  {nm}: r en cara de montaje {r.min():.2f}..{r.max():.2f} '
          f'(bore {2*r.min():.1f})')

# dientes GT2 de la polea: contar picos a media altura del anillo
v = pol.vertices
zr = v[:,2].max() - 3.0 - 3.5      # media del anillo (cara-brida arriba)
m = np.abs(v[:,2]-zr) < 0.6
th = np.sort(np.degrees(np.arctan2(v[m,1], v[m,0])) % 360)
rr2 = np.hypot(v[m,0], v[m,1])
print(f'  anillo GT2: r {rr2.min():.2f}..{rr2.max():.2f} '
      f'(OD {2*rr2.max():.2f}, esperado 30.05)')
bins = np.zeros(720)
for a, r_ in zip(np.degrees(np.arctan2(v[m,1], v[m,0])) % 360, rr2):
    bins[int(a*2) % 720] = max(bins[int(a*2) % 720], r_)
thr = (rr2.max()+rr2.min())/2
picos = sum(1 for i in range(720)
            if bins[i] > thr and bins[i-1] <= thr)
print(f'  dientes contados = {picos} (esperado 48)')
