import math, os
import numpy as np
import trimesh
import importlib.util

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)
spec = importlib.util.spec_from_file_location('r2', p('mec72_render.py'))

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

exec(open(p('mec72_render.py')).read().split('import cascadio')[0])

# eje del ensamble -> horizontal en pantalla; cara de corte hacia la camara
M = np.array([[0, 0, 1], [0, -1, 0], [1, 0, 0]], float)

clear(); MAT = mats(); allpts = []
CUTS = [('mec72_cutA.stl', 'PLACA'), ('mec72_cutB.stl', 'PLACA2'),
        ('mec72_cutPOL.stl', 'POLEA'), ('mec72_cutRET.stl', 'POLEA'),
        ('mec72_cutBRGA.stl', 'BRG'), ('mec72_cutBRGB.stl', 'BRG'),
        ('mec72_cutCASA.stl', 'POLEA'), ('mec72_cutCASB.stl', 'POLEA'),
        ('mec72_cutEJE.stl', 'STEEL'), ('mec72_cutPER.stl', 'STEEL')]
for f, mt in CUTS:
    if not os.path.exists(p(f)):
        continue
    mm = trimesh.load(p(f)); mm.merge_vertices(); mm.apply_scale(0.001)
    v = mm.vertices @ M.T
    add_mesh(f[:-4], v, mm.faces, MAT[mt])
    allpts += [v.min(0), v.max(0)]

# rodillos: solo los que quedan DETRAS del plano de corte (y<0 tras el giro -45)
import cascadio
if not os.path.exists(p('mec72_izq.glb')):
    cascadio.step_to_glb(p('mec72_ensamble_izq.step'), p('mec72_izq.glb'),
                         tol_linear=0.05, tol_angular=0.3)
tm = trimesh.load(p('mec72_izq.glb'))
c45, s45 = math.cos(math.radians(-45)), math.sin(math.radians(-45))
Rzc = np.array([[c45, -s45, 0], [s45, c45, 0], [0, 0, 1]])
for node in tm.graph.nodes_geometry:
    if not node.startswith('rodillo'):
        continue
    T, g = tm.graph[node]
    m = tm.geometry[g].copy(); m.apply_transform(T)
    ctr = m.vertices.mean(0) @ Rzc.T
    if ctr[1] > -0.004:          # delante del plano -> tapa el corte
        continue
    v = (m.vertices @ Rzc.T) @ M.T
    add_mesh(node, v, m.faces, MAT['TPU'])
    allpts += [v.min(0), v.max(0)]

lights()
cam = camera((0.0, -0.145, 0.030), (0, 0, 0.002), 60)
fit(cam, (0, 0, 0.002), allpts, m=(0.07, 0.93))
render(p('m72_corte.png'), 1700, 1150, 72)
print('ALL DONE')
