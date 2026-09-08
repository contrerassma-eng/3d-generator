exec(open('/tmp/claude-0/-home-user/ced961d2-f149-567f-b191-1b894914d584/scratchpad/mec72_render.py').read().split('import cascadio')[0])
import cascadio, trimesh, numpy as np, math

cascadio.step_to_glb(p('m64v8_ensamble_izq.step'), p('m64v8_izq.glb'),
                     tol_linear=0.04, tol_angular=0.25)
tm = trimesh.load(p('m64v8_izq.glb')); izq = {}
for node in tm.graph.nodes_geometry:
    T, g = tm.graph[node]
    m = tm.geometry[g].copy(); m.apply_transform(T)
    izq[node] = m

def extm(M):
    M['PLACA3'] = principled('PLACA3', (0.66, 0.66, 0.69), 0.42)
    M['PLACA4'] = principled('PLACA4', (0.78, 0.52, 0.22), 0.45)
    return M

Rx90b = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)

# 1: cara (estrella sin cabezas de perno)
clear(); M = extm(mats()); allpts = []
for n, m in izq.items():
    mt = M['PLACA3'] if n.startswith('placa') else (M['TPU'] if n.startswith('rodillo') else M['STEEL'])
    v = m.vertices @ Rx90b.T
    add_mesh(n, v, m.faces, mt); allpts += [v.min(0), v.max(0)]
lights(); cam = camera((0.0, -0.155, 0.010), (0, 0, 0), 60)
fit(cam, (0, 0, 0), allpts); render(p('m64v8_cara.png'), 1300, 1300, 64)

# 2: corte por el centro del diente (se ve el snap encajado)
Mm = np.array([[0, 0, 1], [0, -1, 0], [1, 0, 0]], float)
clear(); M = extm(mats()); allpts = []
for f, mt in [('m64v8_cutA.stl', 'PLACA3'), ('m64v8_cutB.stl', 'PLACA4')]:
    mm = trimesh.load(p(f)); mm.merge_vertices(); mm.apply_scale(0.001)
    v = mm.vertices @ Mm.T
    add_mesh(f[:-4], v, mm.faces, M[mt]); allpts += [v.min(0), v.max(0)]
c15, s15 = math.cos(math.radians(-15)), math.sin(math.radians(-15))
Rzc = np.array([[c15, -s15, 0], [s15, c15, 0], [0, 0, 1]])
for n, m in izq.items():
    if not n.startswith('rodillo'): continue
    if (m.vertices.mean(0) @ Rzc.T)[1] > -0.004: continue
    v = (m.vertices @ Rzc.T) @ Mm.T
    add_mesh(n, v, m.faces, M['TPU']); allpts += [v.min(0), v.max(0)]
lights(); cam = camera((0.0, -0.115, 0.025), (0, 0, 0.002), 58)
fit(cam, (0, 0, 0.002), allpts, m=(0.06, 0.94))
render(p('m64v8_corte.png'), 1600, 1150, 64)

# 3: DETALLE del snap (trozo del diente + trozo del bolsillo)
clear(); M = extm(mats()); allpts = []
for f, mt in [('m64v8_detA.stl', 'PLACA3'), ('m64v8_detB.stl', 'PLACA4')]:
    mm = trimesh.load(p(f)); mm.merge_vertices(); mm.apply_scale(0.001)
    v = mm.vertices @ Mm.T
    add_mesh(f[:-4], v, mm.faces, M[mt]); allpts += [v.min(0), v.max(0)]
lights(); cam = camera((0.010, -0.045, 0.020), (0.0, 0, 0.003), 50)
fit(cam, (0.0, 0, 0.003), allpts, m=(0.10, 0.90))
render(p('m64v8_snap.png'), 1500, 1100, 72)
print('ALL DONE')
