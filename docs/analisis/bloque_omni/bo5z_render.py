exec(open('/tmp/claude-0/-home-user/ced961d2-f149-567f-b191-1b894914d584/scratchpad/mec72_render.py').read().split('import cascadio')[0])
import trimesh, numpy as np

tm = trimesh.load(p('bloque_omni_zp_v5.glb'))
parts = []
for node in tm.graph.nodes_geometry:
    T, g = tm.graph[node]
    parts.append((node, g, T))
geoms = tm.geometry

def extmats(M):
    M['DER'] = principled('DER', (0.16, 0.34, 0.58), 0.45)
    M['IZQ'] = principled('IZQ', (0.62, 0.32, 0.12), 0.45)
    M['VERDE'] = principled('VERDE', (0.14, 0.42, 0.20), 0.42)
    M['PVC'] = principled('PVC', (0.90, 0.90, 0.86), 0.55)
    M['PLACAG'] = principled('PLACAG', (0.52, 0.56, 0.62), 0.45)
    M['TAPA'] = principled('TAPA', (0.72, 0.74, 0.78), 0.5)
    M['CARR'] = principled('CARR', (0.62, 0.50, 0.28), 0.4)
    M['NEGRO'] = principled('NEGRO', (0.05, 0.05, 0.055), 0.6)
    M['ZPF'] = principled('ZPF', (0.30, 0.32, 0.36), 0.55)     # bastidor
    M['ZPR'] = principled('ZPR', (0.78, 0.78, 0.80), 0.35)     # rodillos
    M['ZPX'] = principled('ZPX', (0.45, 0.46, 0.50), 0.55)     # resto
    M['ROJO'] = principled('ROJO', (0.55, 0.12, 0.10), 0.5)
    return M

def matbo(n, M):
    if n.startswith('ZP_'):
        if '_pos' in n[:7]: return M['ZPR']
        if 'LT_G' in n or 'TR_S' in n or 'GUARDA' in n or 'B_A' in n or 'BR_' in n: return M['ZPF']
        if 'UniDrive' in n: return M['VERDE']
        if 'SPEED' in n: return M['CARR']
        if 'Sensor' in n: return M['ROJO']
        return M['ZPX']
    if 'rueda_der' in n: return M['DER']
    if 'rueda_izq' in n: return M['IZQ']
    if 'nema24' in n: return M['VERDE']
    if 'polea' in n or 'idler' in n: return M['CARR']
    if 'correa' in n: return M['NEGRO']
    if n.startswith('tapa') or n.startswith('lateral'): return M['TAPA']
    if 'buje' in n: return M['PVC']
    if 'eje' in n or 'cancamo' in n or 'escuadra' in n: return M['STEEL']
    return M['PLACAG']

def escena(fname, cam_pos, look, lens, res, skip=(), m=(0.05, 0.95), xlim=None):
    clear(); M = extmats(mats()); allpts = []
    for n, g, T in parts:
        if any(s in n for s in skip): continue
        mm = geoms[g]
        v = (mm.vertices @ T[:3, :3].T + T[:3, 3]) * 0.001
        if xlim is not None:
            cx = (v[:, 0].min() + v[:, 0].max()) / 2
            if not (xlim[0] < cx < xlim[1]): continue
        add_mesh(n, v, mm.faces, matbo(n, M))
        allpts += [v.min(0), v.max(0)]
    lights()
    cam = camera(cam_pos, look, lens)
    fit(cam, look, allpts, m=m)
    render(p(fname), res[0], res[1], 64)

escena('BO5Z_conveyor.png', (1.9, -2.4, 1.6), (0, 0, -0.15), 42, (2100, 1100))
escena('BO5Z_zona.png', (0.75, -0.95, 0.75), (0, 0, 0.03), 48, (1900, 1150), xlim=(-0.75, 0.75))
escena('BO5Z_planta.png', (0.0, 0.0, 2.0), (0, 0, 0.1), 50, (1700, 1100), xlim=(-0.62, 0.62))
# transmision: NEMA 24 con encoder + serpentin HTD, sin tapas ni larguero cercano
escena('BO5Z_transmision.png', (0.40, -0.88, 0.36), (0, -0.06, -0.01), 50,
       (1900, 1100), skip=('tapa_', 'ZP_LT_G:2', 'ZP_GUARDA_MIR'), xlim=(-0.8, 0.8))
# detalle del motor: brida, encoder y cable de retorno
escena('BO5Z_motor.png', (0.30, -0.42, 0.10), (-0.09, -0.17, -0.01), 55,
       (1700, 1100), skip=('tapa_', 'ZP_'), xlim=(-0.55, 0.25))
print('ALL DONE')
