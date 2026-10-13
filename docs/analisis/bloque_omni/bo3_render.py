exec(open('/tmp/claude-0/-home-user/ced961d2-f149-567f-b191-1b894914d584/scratchpad/mec72_render.py').read().split('import cascadio')[0])
import trimesh, numpy as np

tm = trimesh.load(p('bloque_omni_v3.glb'))
parts = []
for node in tm.graph.nodes_geometry:
    T, g = tm.graph[node]
    parts.append((node, g, T))
geoms = tm.geometry

def matbo(n, M):
    if 'rueda_der' in n: return M['DER']
    if 'rueda_izq' in n: return M['IZQ']
    if n.startswith('ZP_'): return M['CTX']
    if 'motor' in n: return M['VERDE']
    if 'spool' in n or 'polea' in n or 'idler' in n: return M['CARR']
    if 'correa' in n: return M['NEGRO']
    if n.startswith('tapa') or n.startswith('lateral'): return M['TAPA']
    if 'buje' in n: return M['PVC']
    if 'eje' in n or 'cancamo' in n or 'escuadra' in n: return M['STEEL']
    return M['PLACAG']

def extmats(M):
    M['DER'] = principled('DER', (0.16, 0.34, 0.58), 0.45)
    M['IZQ'] = principled('IZQ', (0.62, 0.32, 0.12), 0.45)
    M['VERDE'] = principled('VERDE', (0.14, 0.42, 0.20), 0.42)
    M['VERDE2'] = principled('VERDE2', (0.10, 0.45, 0.32), 0.5)
    M['PVC'] = principled('PVC', (0.90, 0.90, 0.86), 0.55)
    M['CTX'] = principled('CTX', (0.44, 0.44, 0.46), 0.6)
    M['PLACAG'] = principled('PLACAG', (0.52, 0.56, 0.62), 0.45)
    M['TAPA'] = principled('TAPA', (0.72, 0.74, 0.78), 0.5)
    M['CARR'] = principled('CARR', (0.62, 0.50, 0.28), 0.4)
    M['NEGRO'] = principled('NEGRO', (0.05, 0.05, 0.055), 0.6)
    return M

def escena(fname, cam_pos, look, lens, res, skip=(), m=(0.05, 0.95)):
    clear(); M = extmats(mats()); allpts = []
    for n, g, T in parts:
        if any(s in n for s in skip): continue
        mm = geoms[g]
        v = (mm.vertices @ T[:3, :3].T + T[:3, 3]) * 0.001
        add_mesh(n, v, mm.faces, matbo(n, M))
        allpts += [v.min(0), v.max(0)]
    lights()
    cam = camera(cam_pos, look, lens)
    fit(cam, look, allpts, m=m)
    render(p(fname), res[0], res[1], 64)

escena('BO3_hero.png', (0.78, -0.88, 0.72), (0, 0, 0.02), 50, (1900, 1150),
       skip=('cancamo',))
escena('BO3_planta.png', (0.0, 0.0, 1.7), (0, 0, 0.09), 55, (1500, 1150),
       skip=('cancamo',))
escena('BO3_destapado.png', (0.62, -0.72, 0.80), (0, 0, 0.04), 50, (1900, 1150),
       skip=('tapa_superior',))
escena('BO3_transmision.png', (0.35, -0.75, 0.28), (0, 0.05, 0.00), 52,
       (1900, 1150), skip=('tapa_', 'lateral', 'ZP_', 'placa_der', 'cancamo'))
escena('BO3_motores.png', (0.55, -0.55, -0.42), (0, 0, 0.02), 50,
       (1700, 1100), skip=('tapa_inferior', 'ZP_', 'cancamo', 'placa_base'))
escena('BO3_frente.png', (0.0, -1.35, 0.30), (0, 0, 0.06), 75, (1900, 850),
       skip=('ZP_larguero_-1', 'cancamo'))
print('ALL DONE')
