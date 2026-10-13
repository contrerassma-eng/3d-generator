exec(open('/tmp/claude-0/-home-user/ced961d2-f149-567f-b191-1b894914d584/scratchpad/mec72_render.py').read().split('import cascadio')[0])
import cascadio, trimesh, numpy as np, math, os

GLB = p('bo8.glb')
if not os.path.exists(GLB) or os.path.getmtime(GLB) < os.path.getmtime(p('bloque_omni_v8.step')):
    cascadio.step_to_glb(p('bloque_omni_v8.step'), GLB, tol_linear=0.25, tol_angular=0.4)
B = load('bo8.glb')
print('nodos', len(B))

# TODO el ensamble MENOS la tapa superior (y sus avellanados)
SIN_TAPA = lambda n: not n.startswith(('tapa', 'M5tapa', 'M5ciega'))


def MAT(n, M):
    if n.startswith('correa'):
        return M['NEGRO']
    if n.startswith(('polea', 'tensor')):
        return M['NEGRO_POL']
    if n.startswith('motor'):
        return M['STEEL']
    if n.startswith('rueda'):
        return M['NEGRO']
    if n.startswith(('M5', 'M6', 'M8', 'prisionero')):
        return M['INOX']
    if n.startswith('rodam'):
        return M['BRG']
    if n.startswith(('eje', 'separ')):
        return M['INOX']
    return M['INOX']


def escena(sel, cam_loc, target, lens, out, w=1900, h=1200, s=48, m=(0.04, 0.96),
           piso=False):
    clear(); M = mats()
    M['INOX'] = principled('INOX', (0.60, 0.61, 0.64), 0.26, 1.0)
    M['NEGRO'] = principled('NEGRO', (0.013, 0.013, 0.015), 0.90)
    M['NEGRO_POL'] = principled('NEGRO_POL', (0.016, 0.016, 0.019), 0.72)
    pts = []
    for n, mesh in B.items():
        if not sel(n):
            continue
        v = mesh.vertices
        add_mesh(n, v, mesh.faces, MAT(n, M))
        pts += [v.min(0), v.max(0)]
    if piso:
        fv = np.array([[-1.4, -1.4, -0.104], [1.4, -1.4, -0.104],
                       [1.4, 1.4, -0.104], [-1.4, 1.4, -0.104]])
        add_mesh('piso', fv, np.array([[0, 1, 2], [0, 2, 3]]),
                 principled('PISO', (0.10, 0.105, 0.115), 0.85))
    lights()
    bpy.context.scene.world.node_tree.nodes['Background'] \
        .inputs['Color'].default_value = (0.055, 0.058, 0.065, 1)
    for ob in bpy.data.objects:
        if ob.type == 'LIGHT':
            ob.data.energy *= 0.55
    cam = camera(cam_loc, target, lens)
    for _ in range(40):
        bpy.context.view_layer.update()
        ok = all(m[0] < world_to_camera_view(bpy.context.scene, cam, Vector(q)).x < m[1] and
                 m[0] < world_to_camera_view(bpy.context.scene, cam, Vector(q)).y < m[1]
                 for q in pts)
        if ok:
            break
        cam.location = Vector(target) + (cam.location - Vector(target)) * 1.10
    render(p(out), w, h, s)


CEN = (0.0, 0.042, 0.010)

# 1 — tres cuartos desde la esquina de los motores
escena(SIN_TAPA, (0.62, -0.66, 0.44), CEN, 45, 'bo8v_hero1.png', piso=True)
# 2 — tres cuartos desde el lado opuesto (se ven las correas eje-eje)
escena(SIN_TAPA, (-0.60, 0.72, 0.42), CEN, 45, 'bo8v_hero2.png', piso=True)
# 3 — PLANTA: las 4 filas de 8 ruedas y el reparto de la transmision
escena(SIN_TAPA, (0.0, 0.042, 1.20), (0.0, 0.042, 0.0), 60, 'bo8v_planta.png',
       1900, 1350)
# 4 — ALZADO del lado cercano: los dos motores y sus correas
escena(SIN_TAPA, (0.0, -1.15, 0.10), (0.0, 0.02, 0.030), 60, 'bo8v_frente.png',
       2000, 900)
# 5 — ALZADO del lado lejano: la cadena de correas eje-eje con sus tensores
escena(SIN_TAPA, (0.0, 1.25, 0.11), (0.0, 0.04, 0.030), 60, 'bo8v_atras.png',
       2000, 900)
# 6 — PERFIL: se lee la altura de rodadura, la base y los travesanos
escena(SIN_TAPA, (1.15, 0.042, 0.10), (0.0, 0.042, 0.015), 55, 'bo8v_perfil.png',
       1500, 1100)
# 7 — estacion de motor en su contexto
escena(SIN_TAPA, (-0.46, -0.40, 0.14), (-0.225, -0.02, 0.000), 55,
       'bo8v_motor.png', 1900, 1200, 52)
# 8 — UN eje completo: sus 4 ruedas, separadores, rodamientos y las 2 poleas
EJE0 = ('eje_0', 'separadores_0', 'polea_eje_0_0', 'polea_eje_0_1',
        'rodam_0N', 'rodam_0P', 'rueda_00', 'rueda_01', 'rueda_02', 'rueda_03',
        'prisionero_0_0', 'prisionero_0_1', 'correa_motor_der0', 'correa_eje_der1')
escena(lambda n: n in EJE0, (0.30, -0.42, 0.30), (-0.262, 0.045, 0.075), 48,
       'bo8v_eje.png', 1900, 1250, 56, m=(0.06, 0.94))
print('ALL DONE')
