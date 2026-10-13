# Escena completa v2: fabricados (STL de CQ) + mallas REALES del ZP2026
# (motor UniDrive, carrete speed-up) + rueda mecanum v7 REAL instanciada 48x
# + o-rings + contexto ZP (largueros y rodillos vecinos). Exporta
# bloque_omni_v2.glb con geometria compartida (las 24+24 ruedas son 2 mallas).
import os, glob, numpy as np, trimesh
from math import radians, cos, sin

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

PASO, NEJES = 74.75, 8
L_ZONA = PASO * NEJES
CARA_INT, Z_RODAD = 266.8, 115.1
Z_EJE, W2 = 83.1, 18.3
PASO_Y, NRUEDAS = 78.0, 6
CARRETE_Y, CARRETE_D = 221.0, 40.0
SPOOL_Z = Z_EJE - 87.7
X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]
Y_RUEDAS = [(j - (NRUEDAS - 1) / 2) * PASO_Y for j in range(NRUEDAS)]
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
cara = lambda k: -1 if k % 2 == 0 else +1
X_MOTOR = {-1: -PASO / 2, +1: +PASO / 2}

esc = trimesh.Scene()

COL = {
    'placa': [140, 148, 158, 255], 'tapa': [188, 192, 198, 255],
    'eje': [90, 90, 96, 255], 'buje': [222, 222, 214, 255],
    'carrete': [150, 130, 90, 255], 'sep': [120, 124, 132, 255],
    'motor': [52, 110, 62, 255], 'oring': [30, 120, 90, 255],
    'ctx': [110, 110, 114, 255], 'ctx2': [130, 130, 134, 255],
    'der': [45, 90, 150, 255], 'izq': [160, 85, 35, 255],
}

def add(name, mesh, color, T=None):
    m = mesh.copy() if T is not None else mesh
    if T is not None: m.apply_transform(T)
    m.visual = trimesh.visual.ColorVisuals(m, face_colors=color)
    esc.add_geometry(m, node_name=name, geom_name=name)

def addi(name, geom_name, T):
    """instancia: agrega nodo que comparte geometria ya registrada"""
    esc.graph.update(frame_to=name, frame_from=esc.graph.base_frame,
                     matrix=T, geometry=geom_name)

def T_from(R=np.eye(3), t=(0, 0, 0)):
    T = np.eye(4); T[:3, :3] = R; T[:3, 3] = t
    return T

# ---- fabricados ----
tipo = lambda nm: ('placa' if nm.startswith('placa') else
                   'tapa' if nm.startswith('tapa') else
                   'eje' if nm.startswith('eje') or nm.startswith('varilla') else
                   'buje' if nm.startswith('buje') else
                   'carrete' if nm.startswith('carrete') else 'sep')
for f in sorted(glob.glob(p('bo2_*.stl'))):
    nm = os.path.basename(f)[4:-4]
    m = trimesh.load(f); m.merge_vertices()
    add(nm, m, COL[tipo(nm)])

# ---- ruedas reales instanciadas (24 der + 24 izq) ----
Rx90 = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)  # eje rueda z->y
for h in ('izq', 'der'):
    tm = trimesh.load(p(f'm64v7_{h}.glb'))
    partes = []
    for node in tm.graph.nodes_geometry:
        T, g = tm.graph[node]
        mm = tm.geometry[g].copy(); mm.apply_transform(T)
        partes.append(mm)
    w = trimesh.util.concatenate(partes)
    w.apply_scale(1000.0)                      # GLB de cascadio esta en metros
    w.visual = trimesh.visual.ColorVisuals(w, face_colors=COL[h])
    puestos = []
    for k in range(NEJES):
        if mano(k) != h: continue
        for j, y in enumerate(Y_RUEDAS):
            giro = trimesh.transformations.rotation_matrix(
                radians(60.0 * j + 15 * k), [0, 0, 1])
            T = T_from(t=(X_EJES[k], y, Z_EJE)) @ T_from(Rx90) @ giro
            puestos.append((f'rueda_{h}_{k}_{j}', T))
    nm0, T0 = puestos[0]
    esc.add_geometry(w, geom_name=f'rueda_{h}_geom', node_name=nm0, transform=T0)
    for nm, T in puestos[1:]:
        addi(nm, f'rueda_{h}_geom', T)

# ---- motor UniDrive + carrete speed-up REALES ----
mot = trimesh.load(p('zp_motor.stl')); mot.merge_vertices()
spo = trimesh.load(p('zp_spool.stl')); spo.merge_vertices()
# recentrar al centro medido ZP: motor c=(-1196, 2.4, -186.9), spool z -218.4
mot.apply_translation([1196.0, -2.4, 186.9])
spo.apply_translation([1196.0, -2.4, 218.4])
# ZP: x=flujo -> X; y=arriba -> Z; z (hacia -cara) -> Y: v_blk=(x, -z, y),
# rotacion propia Rx(+90). Para la cara -Y se gira ademas 180 sobre Z.
Rzp = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
Rz180 = np.diag([-1.0, -1.0, 1.0])
MOT_DROP = 4.0     # baja el motor 4: su lomo queda bajo el envolvente (51.1)
for cy in (-1, 1):
    R = Rzp if cy > 0 else Rz180 @ Rzp
    y_spool = 221.0
    zs = SPOOL_Z - MOT_DROP
    Tm = T_from(R, (X_MOTOR[cy], cy * (y_spool - 31.5), zs))
    Ts = T_from(R, (X_MOTOR[cy], cy * y_spool, zs))
    add(f'motor_{"izq" if cy>0 else "der"}', mot, COL['motor'], Tm)
    add(f'spool_{"izq" if cy>0 else "der"}', spo, COL['carrete'], Ts)

# ---- o-rings (tramos rectos indicativos O5) ----
def oring(name, p0, p1):
    p0, p1 = np.array(p0, float), np.array(p1, float)
    L = np.linalg.norm(p1 - p0)
    c = trimesh.creation.cylinder(radius=2.5, height=L, sections=16)
    u = (p1 - p0) / L
    R = trimesh.geometry.align_vectors([0, 0, 1], u)
    T = T_from(np.eye(3), (p0 + p1) / 2) @ R
    add(name, c, COL['oring'], T)

for cy in (-1, 1):
    ks = [k for k in range(NEJES) if cara(k) == cy]
    y = cy * CARRETE_Y
    r_c = CARRETE_D / 2 - 2.5
    # motor -> 2 ejes centrales del grupo
    for km in (ks[1], ks[2]):
        for lado in (-1, 1):
            oring(f'or_m{cy}_{km}_{lado}',
                  (X_MOTOR[cy] + lado * 28, cy * 221.0, SPOOL_Z - 4.0),
                  (X_EJES[km] + lado * r_c, y, Z_EJE))
    # eje a eje en los extremos
    for a, b in ((ks[0], ks[1]), (ks[2], ks[3])):
        for dz in (r_c, -r_c):
            oring(f'or_{a}_{b}_{dz:+.0f}',
                  (X_EJES[a], y, Z_EJE + dz), (X_EJES[b], y, Z_EJE + dz))

# ---- contexto ZP2026 ----
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

esc.export(p('bloque_omni_v2.glb'))
print('nodos:', len(esc.graph.nodes_geometry), '-> bloque_omni_v2.glb')
