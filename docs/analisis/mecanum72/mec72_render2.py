import bpy, json, math, os
import numpy as np
import trimesh
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

def clear():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for b in list(blk):
            if b.users == 0: blk.remove(b)

def principled(name, base, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m

def mats():
    return {'PLACA': principled('PLACA', (0.62, 0.62, 0.65), 0.42),
            'PLACA2': principled('PLACA2', (0.72, 0.45, 0.15), 0.45),
            'POLEA': principled('POLEA', (0.85, 0.42, 0.12), 0.40),
            'TPU': principled('TPU', (0.05, 0.05, 0.055), 0.5),
            'TPU2': principled('TPU2', (0.09, 0.32, 0.30), 0.5),
            'STEEL': principled('STEEL', (0.60, 0.60, 0.63), 0.25, 1.0),
            'BRG': principled('BRG', (0.45, 0.46, 0.50), 0.30, 1.0),
            'FLOOR': principled('FLOOR', (0.70, 0.70, 0.71), 0.75)}

def add_mesh(name, verts, faces, mat):
    bpy.ops.object.select_all(action='DESELECT')
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate(); me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(35))
    except Exception: bpy.ops.object.shade_smooth()
    ob.select_set(False)

def lights():
    w = bpy.context.scene.world or bpy.data.worlds.new('W')
    bpy.context.scene.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.16, 0.165, 0.18, 1)
    def area(loc, rot, size, e):
        bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot)
        L = bpy.context.object; L.data.size = size; L.data.energy = e
    area((0.25, -0.32, 0.5), (math.radians(30), 0, math.radians(35)), 0.7, 9.0)
    area((-0.5, -0.2, 0.25), (math.radians(60), 0, math.radians(-65)), 0.5, 3.2)
    area((0.1, 0.5, 0.3), (math.radians(-55), 0, 0), 0.6, 2.3)
    area((0.0, -0.55, 0.12), (math.radians(78), 0, 0), 0.6, 5.5)

def camera(loc, target, lens=52):
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.object
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens; cam.data.clip_start = 0.001
    bpy.context.scene.camera = cam
    return cam

def fit(cam, target, pts, m=(0.08, 0.92)):
    for _ in range(16):
        bpy.context.view_layer.update()
        ok = all(m[0] < world_to_camera_view(bpy.context.scene, cam, Vector(q)).x < m[1] and
                 m[0] < world_to_camera_view(bpy.context.scene, cam, Vector(q)).y < m[1] for q in pts)
        if ok: return
        cam.location = Vector(target) + (cam.location - Vector(target)) * 1.12

def render(path, w, h, s=64):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.samples = s; sc.cycles.use_denoising = True
    sc.render.resolution_x = w; sc.render.resolution_y = h
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def load(glb):
    tm = trimesh.load(p(glb))
    parts = {}
    for node in tm.graph.nodes_geometry:
        T, g = tm.graph[node]
        m = tm.geometry[g].copy(); m.apply_transform(T)
        parts[node] = m
    return parts

import cascadio
for h in ('izq', 'der'):
    cascadio.step_to_glb(p(f'mec72_ensamble_{h}.step'), p(f'mec72_{h}.glb'),
                         tol_linear=0.05, tol_angular=0.3)
izq, der = load('mec72_izq.glb'), load('mec72_der.glb')

Rx90 = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)
Rz2x = np.array([[0, 0, 1], [0, 1, 0], [-1, 0, 0]], float)

def matfor(n, M, hand='izq'):
    if n.startswith('placa'): return M['PLACA']
    if n.startswith('rodillo'): return M['TPU'] if hand == 'izq' else M['TPU2']
    if n.startswith('polea') or n.startswith('retenedor') or n.startswith('casquillo'):
        return M['POLEA']
    if n.startswith('rodamiento'): return M['BRG']
    return M['STEEL']

# ---- 1: par izq/der apoyadas, con polea y eje ----
clear(); M = mats(); allpts = []
for hand, parts, dx in (('izq', izq, -0.040), ('der', der, 0.040)):
    for n, m in parts.items():
        v = m.vertices @ Rx90.T + np.array([dx, 0, 0])
        add_mesh(hand + n, v, m.faces, matfor(n, M, hand))
        allpts += [v.min(0), v.max(0)]
fv = np.array([[-1, -1, -0.0322], [1, -1, -0.0322], [1, 1, -0.0322], [-1, 1, -0.0322]])
add_mesh('floor', fv, np.array([[0, 1, 2], [0, 2, 3]]), M['FLOOR'])
lights()
cam = camera((0.07, -0.19, 0.085), (0, 0, -0.004), 55)
fit(cam, (0, 0, -0.004), allpts)
render(p('m72_hero.png'), 1900, 1100, 72)

# ---- 2: vista del lado de la polea ----
clear(); M = mats(); allpts = []
for n, m in izq.items():
    v = m.vertices @ Rx90.T
    add_mesh(n, v, m.faces, matfor(n, M))
    allpts += [v.min(0), v.max(0)]
lights()
cam = camera((0.0, -0.175, 0.055), (0, 0, 0), 58)
fit(cam, (0, 0, 0), allpts)
render(p('m72_polea.png'), 1300, 1300, 64)


print('ALL DONE')
