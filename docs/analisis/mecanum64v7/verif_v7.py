import numpy as np, trimesh, os
from math import sin, cos, radians
from scipy.spatial import cKDTree

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)
BETA, D0, W2 = 46.0, 23.0, 17.3
ROWS = [0, 60, 120, 180, 240, 300]

A = trimesh.load(p('m64v7_placa_A_izq.stl'))
B = trimesh.load(p('m64v7_placa_B_izq.stl'))
rod = trimesh.load(p('m64v7_rodillo.stl'))

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

def surf(m, n): return trimesh.sample.sample_surface(m, n)[0]

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
mA = (np.abs(sA[:,2]) < 5.5) & (np.hypot(sA[:,0], sA[:,1]) < 14.5)
mB = (np.abs(sB[:,2]) < 5.5) & (np.hypot(sB[:,0], sB[:,1]) < 14.5)
print('A dentro de B: %.3f | B dentro de A: %.3f | holgura corona %.3f' %
      (qb.signed_distance(sA[mA]).max(), qa.signed_distance(sB[mB]).max(),
       cKDTree(sA[mA]).query(sB[mB])[0].min()))
allr = np.vstack([r.vertices for r in rollers])
rr = np.hypot(allr[:,0], allr[:,1])
ang = np.degrees(np.arctan2(allr[:,1], allr[:,0])) % 360
env = [rr[(ang>=a)&(ang<a+5)].max() for a in range(0,360,5)]
print('envolvente rodillos: Ø%.1f–%.1f' % (2*min(env), 2*max(env)))

# hexagono: entre-caras y orientacion, en 3 alturas
for M, nm in ((A, 'A'), (B, 'B')):
    for z0 in ((-15.0, -8.0, 1.5) if nm == 'A' else (15.0, 8.0, 1.5)):
        sec = M.section(plane_origin=[0,0,z0], plane_normal=[0,0,1])
        if sec is None: continue
        rmin_flat, rmax_v = None, None
        for c in sec.discrete:
            r = np.hypot(c[:,0], c[:,1])
            if r.max() < 10.5:                       # contorno del hex
                az = np.degrees(np.arctan2(c[:,1], c[:,0])) % 60
                rmin_flat = r.min(); rmax_v = r.max()
        if rmin_flat:
            print(f'  {nm} z={z0:+5.1f}: hex e/c={2*rmin_flat:5.2f}  vertice Ø{2*rmax_v:5.2f}')

# pared bolsillo de cabeza vs hex (corte transversal en la zona del bolsillo de A)
sec = A.section(plane_origin=[0,0,-16.4], plane_normal=[0,0,1])
pts = np.vstack([c for c in sec.discrete])
az = np.degrees(np.arctan2(pts[:,1], pts[:,0])) % 360
m30 = (az > 20) & (az < 40)
r30 = np.sort(np.hypot(pts[m30,0], pts[m30,1]))
print('  radios de pared en azimut 30 (z=-16.4):', np.round(np.unique(np.round(r30,2)),2)[:8])

# piloto de B centrado en diente: punto (r10.9, az30, z=2) debe estar DENTRO de B
for zq in (1.5, 3.0):
    pt = np.array([[10.9*cos(radians(30)), 10.9*sin(radians(30)), zq]])
    print(f'  B en (r10.9, 30deg, z={zq}): signed={qb.signed_distance(pt)[0]:+.2f} (+=dentro)')
