#!/usr/bin/env python3
"""sorter_CO teselado (base.stl) → GLB de ENSAMBLE por CLASES de pieza.

Parte la malla real del STEP en sus PIEZAS (componentes conexos), las clasifica
(banda, larguero, travesaño, pata, polea/rodamiento, eje, motor, tornillería,
estructura) y exporta un GLB donde cada CLASE es un nodo-grupo con nombre. El CAD
del navegador (loadAssembly) lo inserta como ~9 PARTES editables (posición/uso),
manteniendo el detalle real. La transferencia original del STEP se borra con la
máscara base_remove.bin (por espacio para la transferencia 90 propia).

Uso:  python tools/step_sorter_to_assembly_glb.py
Reproducible: requiere cad/ensambles/base.stl y base_remove.bin (derivados del
STEP, no versionados). El GLB resultante SÍ se versiona (cad/componentes/models).
"""
import struct, json, re
from collections import defaultdict
import numpy as np, trimesh
from scipy import sparse
from scipy.sparse.csgraph import connected_components

REPO = '/home/user/3d-generator'
STL = f'{REPO}/cad/ensambles/base.stl'
REMOVE = f'{REPO}/cad/ensambles/base_remove.bin'
OUT = f'{REPO}/cad/componentes/models/sorter_CO.glb'


def classify(lo, hi):
    dx, dy, dz = hi - lo; cz = (lo[2] + hi[2]) / 2; mx = max(dx, dy, dz); mn = min(dx, dy, dz)
    if dy > 1000 and dx < 55 and dz < 55 and 25 < cz < 65:   return 'Banda', [30, 30, 30]
    if dy > 800 and dx < 140 and dz < 170 and cz < 130:       return 'Larguero lateral', [150, 160, 168]
    if dx > 380 and dy < 140:                                 return 'Travesano', [120, 144, 160]
    if dz > 200 and lo[2] < -40:                              return 'Pata soporte', [70, 86, 96]
    if mx > 250:                                              return 'Motor grupo motriz', [84, 110, 122]
    if 55 < mx < 130 and mn > 30 and abs(dy - dz) < 25:       return 'Polea rodamiento', [176, 190, 197]
    if dx > 60 and dy < 45 and dz < 45:                       return 'Eje rodillo', [190, 175, 150]
    if 40 < mx < 220 and cz > 100:                            return 'Guia perfil', [200, 208, 214]
    if mx < 35:                                               return 'Tornilleria', [110, 120, 128]
    return 'Estructura', [135, 155, 165]


def main():
    raw = open(STL, 'rb').read(); n = struct.unpack('<I', raw[80:84])[0]
    arr = np.frombuffer(raw[84:84 + 50 * n], dtype=np.uint8).reshape(n, 50)
    tris = np.ascontiguousarray(arr[:, 12:48]).view('<f4').reshape(n, 3, 3).astype(np.float64)
    mask = np.frombuffer(open(REMOVE, 'rb').read(), np.uint8)
    tris = tris[mask == 0]; n = len(tris)
    V = tris.reshape(n * 3, 3)
    q = np.round(V / 0.4).astype(np.int64)
    _, index, inverse = np.unique(q, axis=0, return_index=True, return_inverse=True)
    inverse = np.asarray(inverse).ravel(); verts = V[index]; faces = inverse.reshape(n, 3)

    Nv = len(verts)
    r = np.concatenate([faces[:, 0], faces[:, 1], faces[:, 2]])
    c = np.concatenate([faces[:, 1], faces[:, 2], faces[:, 0]])
    g = sparse.coo_matrix((np.ones(len(r), np.int8), (r, c)), shape=(Nv, Nv))
    ncomp, lab = connected_components(g, directed=False)
    fcomp = lab[faces[:, 0]]
    cmin = np.full((ncomp, 3), 1e18); cmax = np.full((ncomp, 3), -1e18)
    np.minimum.at(cmin, lab, verts); np.maximum.at(cmax, lab, verts)

    scene = trimesh.Scene(); tally = defaultdict(int)
    for ci in range(ncomp):
        fsel = fcomp == ci
        if not fsel.any(): continue
        cls, col = classify(cmin[ci], cmax[ci])
        fc = faces[fsel]; used = np.unique(fc); remap = {v: k for k, v in enumerate(used)}
        m = trimesh.Trimesh(vertices=verts[used], faces=np.vectorize(remap.get)(fc), process=False)
        m.visual.face_colors = np.tile(col + [255], (len(m.faces), 1))
        m.apply_scale(0.001)  # mm -> m (loader del CAD hace x1000)
        scene.add_geometry(m, node_name=f'{cls}_{ci}')
        tally[cls] += 1
    scene.export(OUT)
    _group_by_class(OUT)   # añade nodos-grupo por clase para que el CAD agrupe
    # variante FINA: cada pieza significativa como su propio grupo (parte); solo
    # tornillería y estructura quedan agrupadas (son ruido). Nombres con sufijo de
    # letra para no colapsar por el strip de dígitos del CAD.
    OUT2 = OUT.replace('sorter_CO.glb', 'sorter_CO_piezas.glb')
    scene.export(OUT2)
    _group_per_piece(OUT2)
    print('clases:', dict(tally))


def _letters(k):
    s = ''
    k += 1
    while k:
        k, r = divmod(k - 1, 26); s = chr(97 + r) + s
    return s


def _rewrite(path, groups):
    d = bytearray(open(path, 'rb').read())
    clen = struct.unpack('<I', d[12:16])[0]
    j = json.loads(bytes(d[20:20 + clen]))
    sc = j['scenes'][j.get('scene', 0)]
    roots = []
    for ni in sc['nodes']:
        nd = j['nodes'][ni]
        roots += nd['children'] if ('mesh' not in nd and nd.get('children')) else [ni]
    named = groups(j, roots)
    sc['nodes'] = []
    for name, ch in named:
        sc['nodes'].append(len(j['nodes']))
        j['nodes'].append({'name': name, 'children': ch})
    nj = json.dumps(j, separators=(',', ':')).encode(); nj += b' ' * ((4 - len(nj) % 4) % 4)
    binc = bytes(d[20 + clen:])
    out = bytearray(d[0:8]) + struct.pack('<I', 12 + 8 + len(nj) + len(binc))
    out += struct.pack('<I', len(nj)) + b'JSON' + nj + binc
    open(path, 'wb').write(out)


def _group_by_class(path):
    """Un nodo-grupo (nombre de clase) por clase → el CAD inserta ~9 partes."""
    def by_class(j, roots):
        g = defaultdict(list)
        for ni in roots:
            g[re.sub(r'_\d+$', '', j['nodes'][ni].get('name', '')) or 'Estructura'].append(ni)
        return list(g.items())
    _rewrite(path, by_class)


def _group_per_piece(path):
    """Cada pieza SIGNIFICATIVA como su propio grupo (parte); tornillería y
    estructura agrupadas. Nombre '<Clase> <letra>' (termina en letra → el CAD no
    lo colapsa por el strip de dígitos)."""
    GROUP = {'Tornilleria', 'Estructura'}
    def per_piece(j, roots):
        out = []; grouped = defaultdict(list); counter = defaultdict(int)
        for ni in roots:
            cls = re.sub(r'_\d+$', '', j['nodes'][ni].get('name', '')) or 'Estructura'
            if cls in GROUP:
                grouped[cls].append(ni)
            else:
                out.append((f'{cls} {_letters(counter[cls])}', [ni])); counter[cls] += 1
        for cls, ch in grouped.items():
            out.append((cls, ch))
        return out
    _rewrite(path, per_piece)


if __name__ == '__main__':
    main()
