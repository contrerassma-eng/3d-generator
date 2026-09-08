# Escena v3: fabricados bo3_* + motor/carrete reales + rueda v7 real (32x:
# 4 por eje) + CORREAS POLY-V en serpentin + contexto ZP2026.
import os, glob, numpy as np, trimesh
from math import radians

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

PASO, NEJES = 74.75, 8
L_ZONA = PASO * NEJES
CARA_INT, Z_RODAD = 266.8, 115.1
Z_EJE, W2 = 83.1, 18.3
Y_RUEDAS = [-39.0, 39.0, 117.0, 195.0]
POLEA_Y, POLEA_D = 221.0, 40.0
IDLER_Z, IDLER_D = 52.0, 24.0
SPOOL_Z = Z_EJE - 87.7
MOT_DROP = 4.0
X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
cara = lambda k: -1 if k % 2 == 0 else +1
X_MOTOR = {-1: -PASO / 2, +1: +PASO / 2}
KS = {c: [k for k in range(NEJES) if cara(k) == c] for c in (-1, 1)}
X_IDLER = {c: [(X_EJES[a] + X_EJES[b]) / 2 for a, b in
               zip(KS[c][:-1], KS[c][1:])] for c in (-1, 1)}

esc = trimesh.Scene()
COL = {
    'placa': [140, 148, 158, 255], 'tapa': [188, 192, 198, 255],
    'base': [120, 128, 138, 255], 'eje': [90, 90, 96, 255],
    'buje': [222, 222, 214, 255], 'polea': [150, 130, 90, 255],
    'sep': [120, 124, 132, 255], 'motor': [52, 110, 62, 255],
    'correa': [40, 40, 44, 255], 'ctx': [110, 110, 114, 255],
    'ctx2': [130, 130, 134, 255], 'der': [45, 90, 150, 255],
    'izq': [160, 85, 35, 255],
}

def add(name, mesh, color, T=None):
    m = mesh.copy() if T is not None else mesh
    if T is not None: m.apply_transform(T)
    m.visual = trimesh.visual.ColorVisuals(m, face_colors=color)
    esc.add_geometry(m, node_name=name, geom_name=name)

def addi(name, geom_name, T):
    esc.graph.update(frame_to=name, frame_from=esc.graph.base_frame,
                     matrix=T, geometry=geom_name)

def T_from(R=np.eye(3), t=(0, 0, 0)):
    T = np.eye(4); T[:3, :3] = R; T[:3, 3] = t
    return T

tipo = lambda nm: ('base' if nm.startswith('placa_base') else
                   'placa' if nm.startswith('placa') else
                   'tapa' if nm.startswith('tapa') or nm.startswith('lateral') else
                   'eje' if nm.startswith('eje') else
                   'buje' if nm.startswith('buje') else
                   'polea' if nm.startswith('polea') or nm.startswith('idler') else 'sep')
for f in sorted(glob.glob(p('bo3_*.stl'))):
    nm = os.path.basename(f)[4:-4]
    m = trimesh.load(f); m.merge_vertices()
    add(nm, m, COL[tipo(nm)])

# ruedas reales instanciadas (16 der + 16 izq)
Rx90 = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
for h in ('izq', 'der'):
    tm = trimesh.load(p(f'm64v7_{h}.glb'))
    partes = []
    for node in tm.graph.nodes_geometry:
        T, g = tm.graph[node]
        mm = tm.geometry[g].copy(); mm.apply_transform(T)
        partes.append(mm)
    w = trimesh.util.concatenate(partes)
    w.apply_scale(1000.0)
    w.visual = trimesh.visual.ColorVisuals(w, face_colors=COL[h])
    puestos = []
    for k in range(NEJES):
        if mano(k) != h: continue
        for j, y in enumerate(Y_RUEDAS):
            giro = trimesh.transformations.rotation_matrix(
                radians(90.0 * j + 15 * k), [0, 0, 1])
            T = T_from(t=(X_EJES[k], y, Z_EJE)) @ T_from(Rx90) @ giro
            puestos.append((f'rueda_{h}_{k}_{j}', T))
    nm0, T0 = puestos[0]
    esc.add_geometry(w, geom_name=f'rueda_{h}_geom', node_name=nm0, transform=T0)
    for nm, T in puestos[1:]:
        addi(nm, f'rueda_{h}_geom', T)

# motor UniDrive + carrete reales
mot = trimesh.load(p('zp_motor.stl')); mot.merge_vertices()
spo = trimesh.load(p('zp_spool.stl')); spo.merge_vertices()
mot.apply_translation([1196.0, -2.4, 186.9])
spo.apply_translation([1196.0, -2.4, 218.4])
Rzp = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
Rz180 = np.diag([-1.0, -1.0, 1.0])
for cy in (-1, 1):
    R = Rzp if cy > 0 else Rz180 @ Rzp
    zs = SPOOL_Z - MOT_DROP
    add(f'motor_{"izq" if cy>0 else "der"}', mot, COL['motor'],
        T_from(R, (X_MOTOR[cy], cy * (POLEA_Y - 31.5), zs)))
    add(f'spool_{"izq" if cy>0 else "der"}', spo, COL['polea'],
        T_from(R, (X_MOTOR[cy], cy * POLEA_Y, zs)))

# correa Poly-V: cinta serpentin (bajo poleas de eje, sobre idlers, al motor)
def cinta(name, pts, y):
    segs = []
    for (x0, z0), (x1, z1) in zip(pts[:-1], pts[1:]):
        L = float(np.hypot(x1 - x0, z1 - z0))
        c = trimesh.creation.box(extents=(L, 10.0, 3.0))
        ang = np.arctan2(z1 - z0, x1 - x0)
        R = trimesh.transformations.rotation_matrix(ang, [0, 1, 0])[:3, :3]
        R = np.array([[np.cos(ang), 0, -np.sin(ang)],
                      [0, 1, 0],
                      [np.sin(ang), 0, np.cos(ang)]])
        segs.append((c, T_from(R, ((x0 + x1) / 2, y, (z0 + z1) / 2))))
    for i, (c, T) in enumerate(segs):
        add(f'{name}_{i}', c, COL['correa'], T)

for cy in (-1, 1):
    y = cy * POLEA_Y
    zs = SPOOL_Z - MOT_DROP
    r_sp, r_p, r_i = 31.5, POLEA_D / 2, IDLER_D / 2
    xs_p = [X_EJES[k] for k in KS[cy]]
    pts = [(X_MOTOR[cy] - r_sp, zs)]
    pts.append((xs_p[0], Z_EJE - r_p - 1.5))
    for xi, xp in zip(X_IDLER[cy], xs_p[1:]):
        pts.append((xi, IDLER_Z + r_i + 1.5))
        pts.append((xp, Z_EJE - r_p - 1.5))
    pts.append((X_MOTOR[cy] + r_sp, zs))
    cinta(f'correa_{"izq" if cy>0 else "der"}', pts, y)

# contexto ZP2026
for sy in (-1, 1):
    lg = trimesh.creation.box(extents=(L_ZONA + 6 * PASO, 38, 190.5))
    add(f'ZP_larguero_{sy}', lg, COL['ctx'],
        T_from(t=(0, sy * (CARA_INT + 19), 108 - 190.5 / 2)))
for i in (1, 2, 3):
    for sx in (-1, 1):
        x = sx * (L_ZONA / 2 + (i - 0.5) * PASO)
        ro = trimesh.creation.cylinder(radius=25.0, height=2 * CARA_INT - 4, sections=48)
        R = trimesh.transformations.rotation_matrix(radians(90), [1, 0, 0])
        add(f'ZP_rodillo_{i}_{sx}', ro, COL['ctx2'], T_from(t=(x, 0, 90.1)) @ R)

esc.export(p('bloque_omni_v3.glb'))
print('nodos:', len(esc.graph.nodes_geometry), '-> bloque_omni_v3.glb')
