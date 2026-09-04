exec(open('/tmp/claude-0/-home-user/ced961d2-f149-567f-b191-1b894914d584/scratchpad/mec72_render.py').read().split('import cascadio')[0])
import cascadio, trimesh, numpy as np, math

cascadio.step_to_glb(p('bloque_omni_v7.step'), p('bo7.glb'),
                     tol_linear=0.25, tol_angular=0.4)
B = load('bo7.glb')
print('nodos', len(B))


def MAT(n, M):
    if n.startswith('correa'):
        return M['TPU']
    if n.startswith('polea') or n.startswith('tensor'):
        return M['POLEA']
    if n.startswith('motor'):
        return M['STEEL']
    if n.startswith('rueda'):
        return M['PLACA2']
    if n.startswith('F6801') or n.startswith('eje') or n.startswith('separ'):
        return M['BRG']
    if n.startswith('tapa'):
        return M['TAPA']
    if n.startswith('cuna'):
        return M['CUNA']
    return M['PLACA']


def escena(sel, cam_loc, target, lens, out, w=1800, h=1150, s=44, m=(0.05, 0.95)):
    clear(); M = mats()
    M['TAPA'] = principled('TAPA', (0.30, 0.31, 0.34), 0.38)
    M['CUNA'] = principled('CUNA', (0.46, 0.48, 0.52), 0.40)
    pts = []
    for n, mesh in B.items():
        if not sel(n):
            continue
        v = mesh.vertices
        add_mesh(n, v, mesh.faces, MAT(n, M))
        pts += [v.min(0), v.max(0)]
    lights()
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


CEN = (0.0, 0.03, 0.01)

# 1 — modulo completo
escena(lambda n: True, (0.55, -0.70, 0.50), CEN, 42, 'bo7_modulo.png', 1900, 1200)

# 2 — sin tapas ni ruedas: el bastidor por dentro
escena(lambda n: not n.startswith(('tapa', 'rueda')),
       (0.45, -0.62, 0.62), CEN, 42, 'bo7_bastidor.png', 1900, 1200)

# 3 — el RIEL solo, alzado (aqui se lee el estilo de chapa)
escena(lambda n: n.startswith('riel_N'), (0.0, -1.20, 0.03), (0, -0.116, 0.03),
       75, 'bo7_riel.png', 2000, 620, 40, m=(0.015, 0.985))

# 4 — placa base sola, en planta
escena(lambda n: n.startswith('placa_base'), (0.0, 0.027, 1.2), (0, 0.027, -0.071),
       75, 'bo7_base.png', 1700, 1250, 40, m=(0.03, 0.97))

# 5 — estacion del motor SIN el riel cercano (para verlo)
escena(lambda n: n.startswith(('motor', 'cuna', 'polea_motor_der', 'placa_base',
                               'escuadra_N', 'travesano')) and 'izq' not in n,
       (-0.42, -0.34, 0.16), (-0.15, -0.02, -0.02), 55, 'bo7_motor.png', 1800, 1200)

# 6 — transmision sola: correas, poleas, tensores, ejes y motores en su sitio
escena(lambda n: n.startswith(('correa', 'polea', 'tensor', 'motor', 'eje',
                               'F6801')),
       (0.30, -0.85, 0.30), (0, -0.06, 0.03), 48, 'bo7_tren.png', 1900, 1100)
print('ALL DONE')
