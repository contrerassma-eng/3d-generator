exec(open('/tmp/claude-0/-home-user/ced961d2-f149-567f-b191-1b894914d584/scratchpad/mec72_render.py').read().split('import cascadio')[0])
import cascadio, trimesh, numpy as np, math

cascadio.step_to_glb(p('bloque_omni_v8.step'), p('bo8.glb'),
                     tol_linear=0.25, tol_angular=0.4)
B = load('bo8.glb')
print('nodos', len(B))
for n in ('riel_N', 'riel_P', 'placa_base', 'tapa_superior', 'rueda_00'):
    if n in B:
        b = B[n].bounds * 1000
        print(f'  {n:14s} x {b[0][0]:7.1f}..{b[1][0]:6.1f} y {b[0][1]:7.1f}..{b[1][1]:6.1f} '
              f'z {b[0][2]:7.1f}..{b[1][2]:6.1f}')


def MAT(n, M):
    if n.startswith('correa'):
        return M['TPU']
    if n.startswith(('polea', 'tensor')):
        return M['NEGRO_POL']      # poleas y tensores: polimero negro
    if n.startswith('motor'):
        return M['STEEL']
    if n.startswith('rueda'):
        return M['NEGRO']          # rueda impresa: negro mate (placas y rodillos)
    if n.startswith(('M5', 'M6', 'M8', 'prisionero')):
        return M['INOX']           # tornilleria inoxidable
    if n.startswith('rodam'):
        return M['BRG']
    if n.startswith(('eje', 'separ')):
        return M['INOX']
    if n.startswith('tapa'):
        return M['NEGRO_TAPA']     # tapa superior negra
    return M['INOX']               # estructura: acero inoxidable


def escena(sel, cam_loc, target, lens, out, w=1800, h=1150, s=44, m=(0.05, 0.95)):
    clear(); M = mats()
    M['INOX'] = principled('INOX', (0.60, 0.61, 0.64), 0.26, 1.0)
    M['NEGRO'] = principled('NEGRO', (0.013, 0.013, 0.015), 0.90)
    M['NEGRO_POL'] = principled('NEGRO_POL', (0.016, 0.016, 0.019), 0.72)
    M['NEGRO_TAPA'] = principled('NEGRO_TAPA', (0.018, 0.018, 0.021), 0.70)
    pts = []
    for n, mesh in B.items():
        if not sel(n):
            continue
        v = mesh.vertices
        add_mesh(n, v, mesh.faces, MAT(n, M))
        pts += [v.min(0), v.max(0)]
    lights()
    # menos luz: con el esquema negro/inoxidable la escena se lavaba
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


CEN = (0.0, 0.03, 0.01)
escena(lambda n: True, (0.55, -0.70, 0.50), CEN, 42, 'bo8_modulo.png', 1900, 1200)
escena(lambda n: not n.startswith(('tapa', 'rueda', 'M5tapa')),
       (0.45, -0.62, 0.62), CEN, 42, 'bo8_bastidor.png', 1900, 1200)
# detalle de una escuadra atornillada (aqui se ven rosca, arandela y grower)
escena(lambda n: ('escuadra_N2' in n or 'M6ra_N2' in n or 'M6eb_N2' in n
                  or n in ('riel_N', 'placa_base')),
       (-0.06, -0.24, 0.06), (0.0, -0.10, -0.03), 60, 'bo8_union.png', 1700, 1200, 56)
# transmision del lado CERCANO: las 2 correas de motor
escena(lambda n: n.startswith(('motor', 'cuna', 'polea_motor', 'correa_motor',
                               'polea_eje', 'eje_', 'rodam')),
       (0.0, -0.62, 0.12), (0, 0.02, 0.04), 46, 'bo8_tren_cerca.png', 1900, 1000)
# transmision del lado LEJANO: las 4 correas eje-eje con sus tensores
escena(lambda n: n.startswith(('correa_eje', 'polea_eje', 'tensor', 'eje_',
                               'rodam', 'M8ten')),
       (0.0, 0.72, 0.14), (0, 0.10, 0.05), 46, 'bo8_tren_lejos.png', 1900, 1000)
# detalle del motor con su tornilleria y la correa dentada
escena(lambda n: any(k in n for k in ('motor', 'cuna', 'polea_motor', 'correa_motor',
                                      'M5mot', 'M6cb')),
       (-0.30, -0.36, 0.14), (-0.15, -0.09, -0.01), 58, 'bo8_motor.png', 1800, 1200)
print('ALL DONE')
