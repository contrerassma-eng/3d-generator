exec(open('/tmp/claude-0/-home-user/ced961d2-f149-567f-b191-1b894914d584/scratchpad/mec72_render.py').read().split('import cascadio')[0])
import cascadio, trimesh, numpy as np, math, json
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

for h in ('izq', 'der'):
    cascadio.step_to_glb(p(f'm64v7_ensamble_{h}.step'), p(f'm64v7_{h}.glb'),
                         tol_linear=0.05, tol_angular=0.3)

def load7(f):
    tm = trimesh.load(p(f)); parts = {}
    for node in tm.graph.nodes_geometry:
        T, g = tm.graph[node]
        m = tm.geometry[g].copy(); m.apply_transform(T)
        parts[node] = m
    return parts

izq, der = load7('m64v7_izq.glb'), load7('m64v7_der.glb')
Rx90 = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)
Rz2x = np.array([[0, 0, 1], [0, 1, 0], [-1, 0, 0]], float)

def matfor7(n, M, hand='izq'):
    if n.startswith('placa'): return M['PLACA']
    if n.startswith('rodillo'): return M['TPU'] if hand == 'izq' else M['TPU2']
    return M['STEEL']

# 1: par izq/der como la imagen anotada de Sergio
clear(); M = mats(); allpts = []
for hand, parts, dx in (('izq', izq, -0.036), ('der', der, 0.036)):
    for n, m in parts.items():
        v = m.vertices @ Rx90.T + np.array([dx, 0, 0])
        add_mesh(hand + n, v, m.faces, matfor7(n, M, hand))
        allpts += [v.min(0), v.max(0)]
fv = np.array([[-1,-1,-0.0322],[1,-1,-0.0322],[1,1,-0.0322],[-1,1,-0.0322]])
add_mesh('floor', fv, np.array([[0,1,2],[0,2,3]]), M['FLOOR'])
lights()
cam = camera((0.06, -0.17, 0.075), (0, 0, -0.004), 55)
fit(cam, (0, 0, -0.004), allpts)
render(p('m64v7_hero.png'), 1900, 1100, 72)

# 2: cara (estrella estructural + hex 14.5 pasante)
clear(); M = mats(); allpts = []
for n, m in izq.items():
    v = m.vertices @ Rx90.T
    add_mesh(n, v, m.faces, matfor7(n, M))
    allpts += [v.min(0), v.max(0)]
lights()
cam = camera((0.0, -0.155, 0.010), (0, 0, 0), 60)
fit(cam, (0, 0, 0), allpts)
render(p('m64v7_cara.png'), 1300, 1300, 64)

# 3: corte por un perno (azimut 30): solidos cortados por CQ
clear(); M = mats(); allpts = []
Mm = np.array([[0, 0, 1], [0, -1, 0], [1, 0, 0]], float)
for f, mt in [('m64v7_cutA.stl', 'PLACA'), ('m64v7_cutB.stl', 'PLACA2'),
              ('m64v7_cutPER.stl', 'STEEL')]:
    if not os.path.exists(p(f)): continue
    mm = trimesh.load(p(f)); mm.merge_vertices(); mm.apply_scale(0.001)
    v = mm.vertices @ Mm.T
    add_mesh(f[:-4], v, mm.faces, M[mt])
    allpts += [v.min(0), v.max(0)]
c30, s30 = math.cos(math.radians(-30)), math.sin(math.radians(-30))
Rzc = np.array([[c30, -s30, 0], [s30, c30, 0], [0, 0, 1]])
for n, m in izq.items():
    if not n.startswith('rodillo'): continue
    ctr = m.vertices.mean(0) @ Rzc.T
    if ctr[1] > -0.004: continue
    v = (m.vertices @ Rzc.T) @ Mm.T
    add_mesh(n, v, m.faces, M['TPU'])
    allpts += [v.min(0), v.max(0)]
lights()
cam = camera((0.0, -0.13, 0.028), (0, 0, 0.002), 58)
fit(cam, (0, 0, 0.002), allpts, m=(0.09, 0.91))
render(p('m64v7_corte.png'), 1600, 1150, 64)
print('ALL DONE')
