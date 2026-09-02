exec(open('/tmp/claude-0/-home-user/ced961d2-f149-567f-b191-1b894914d584/scratchpad/mec72_render.py').read().split('import cascadio')[0])
import cascadio, trimesh, numpy as np

cascadio.step_to_glb(p('bloque_omni.step'), p('bloque_omni.glb'),
                     tol_linear=0.15, tol_angular=0.4)
tm = trimesh.load(p('bloque_omni.glb'))
parts = {}
for node in tm.graph.nodes_geometry:
    T, g = tm.graph[node]
    m = tm.geometry[g].copy(); m.apply_transform(T)
    parts[node] = m

def matbo(n, M):
    if 'rueda_der' in n: return M['TPU3']
    if 'rueda_izq' in n: return M['POLEA']
    if n.startswith('ZP_'): return M['FLOORG']
    if 'motor' in n: return M['VERDE']
    if 'tapa' in n: return M['PLACA']
    if 'buje' in n or 'carrete' in n: return M['PVC']
    if 'oring' in n: return M['VERDE']
    if 'eje' in n or 'varilla' in n: return M['STEEL']
    return M['PLACA2G']

def extmats(M):
    M['TPU3'] = principled('TPU3', (0.16, 0.35, 0.60), 0.45)
    M['VERDE'] = principled('VERDE', (0.15, 0.45, 0.22), 0.45)
    M['PVC'] = principled('PVC', (0.88, 0.88, 0.84), 0.55)
    M['FLOORG'] = principled('FLOORG', (0.42, 0.42, 0.44), 0.6)
    M['PLACA2G'] = principled('PLACA2G', (0.52, 0.55, 0.60), 0.5)
    return M

def escena(fname, cam_pos, look, lens, res, skip=(), solo=None):
    clear(); M = extmats(mats()); allpts = []
    for n, m in parts.items():
        if any(s in n for s in skip): continue
        if solo and not any(s in n for s in solo): continue
        v = m.vertices
        add_mesh(n, v, m.faces, matbo(n, M))
        allpts += [v.min(0), v.max(0)]
    lights()
    cam = camera(cam_pos, look, lens)
    fit(cam, look, allpts, m=(0.05, 0.95))
    render(p(fname), res[0], res[1], 64)

# 1: iso hero con tapa (contexto ZP a los lados)
escena('BO_hero.png', (0.75, -0.85, 0.75), (0, 0, 0.06), 50, (1900, 1150))
# 2: planta (recortes minimos de la tapa)
escena('BO_planta.png', (0.0, 0.0, 1.6), (0, 0, 0.09), 55, (1500, 1150))
# 3: destapado (sin tapa superior): 8 ejes alternados, bujes PVC, motores
escena('BO_destapado.png', (0.65, -0.75, 0.85), (0, 0, 0.05), 50, (1900, 1150),
       skip=('tapa_superior',))
# 4: frente (nivel de rodadura continuo con los rodillos ZP; sobresale 5)
escena('BO_frente.png', (0.0, -1.6, 0.12), (0, 0, 0.09), 85, (1900, 800))
print('ALL DONE')
