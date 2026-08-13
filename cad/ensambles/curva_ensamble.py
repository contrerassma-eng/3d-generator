#!/usr/bin/env python3
"""curva_ensamble.py — Arma el GLB de la curva al MISMO nivel que el recto 24V.

La curva tiene bastidor propio: laterales, alas, guías y polines cónicos salen
de los planos Kofmelk y se generan paramétricamente (`gen_curva.mjs`). Pero los
ACCESORIOS no son propios: son exactamente los del transportador recto ZP2026
—travesaño TR_S, motor UniDrive, soporte de motor BR_3002, estación de patas—
y por eso se instancian desde el STEP del fabricante en vez de re-modelarse.

  1. `zp_componentes.mjs --extraer zp_piezas.json`  saca los componentes reales
  2. `gen_curva.mjs` emite, en `meta.montaje`, DÓNDE va cada uno
  3. este script los junta con el bastidor y escribe el GLB

  python3 ensambles/curva_ensamble.py 90 ensambles/curva_vistas/curva90_24.glb

Requiere que exista antes el GLB del bastidor (`--bastidor`, por omisión
`/tmp/curva<A>_estructura.glb`, que produce `nbt90/export_glb.mjs`).
"""
import argparse
import json
import math
import os
import struct
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_glb import leer_glb, nodo_matriz, accessor   # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))


def malla_de_glb(path):
    """Aplana un GLB a (V, F, color_por_cara) en el sistema del modelo (Z arriba)."""
    g, b = leer_glb(path)
    Vs, Fs, Cs = [], [], []
    base = 0

    def rec(i, M):
        nonlocal base
        nd = g['nodes'][i]
        M = M @ nodo_matriz(nd)
        if 'mesh' in nd:
            for prim in g['meshes'][nd['mesh']]['primitives']:
                v = accessor(g, b, prim['attributes']['POSITION']).astype(float)
                v = (M[:3, :3] @ v.T).T + M[:3, 3]
                if 'indices' in prim:
                    f = accessor(g, b, prim['indices']).astype(np.int64).reshape(-1, 3)
                else:
                    f = np.arange(len(v), dtype=np.int64).reshape(-1, 3)
                col = [0.6, 0.63, 0.6]
                mi = prim.get('material')
                if mi is not None:
                    pbr = g['materials'][mi].get('pbrMetallicRoughness', {})
                    col = pbr.get('baseColorFactor', col)[:3]
                Vs.append(v)
                Fs.append(f + base)
                Cs.append(np.tile(col, (len(f), 1)))
                base += len(v)
        for c in nd.get('children', []):
            rec(c, M)

    for r in g['scenes'][g.get('scene', 0)]['nodes']:
        rec(r, np.eye(4))
    V = np.vstack(Vs)
    # el exportador escribe Y-arriba (glTF); se vuelve al sistema del modelo
    V = np.stack([V[:, 0], -V[:, 2], V[:, 1]], axis=1)
    return V, np.vstack(Fs), np.vstack(Cs)


def instancia(pieza, R, ang_deg, z, giro=0.0):
    """Coloca un componente del recto en coordenadas polares de la curva.

    El componente sale de `zp_componentes.mjs` con su eje largo en Y (el ancho
    del recto, que en la curva es la dirección RADIAL) y el origen en la base.
    Aquí se gira para que ese eje quede radial en `ang_deg` y se lleva a (R, z).
    """
    # `ang_deg` sitúa la pieza sobre el arco; `giro` la rota SOBRE SÍ MISMA sin
    # moverla (el motor va con su eje radial, y su eje largo es X local).
    ap = math.radians(ang_deg)
    a = ap + giro
    ca, sa = math.cos(a), math.sin(a)
    cp, sp = math.cos(ap), math.sin(ap)
    # Y local -> RADIAL (el ancho del recto es el radio de la curva) y
    # X local -> TANGENCIAL. Tiene que ser una rotación PROPIA: con
    # X->(sa,-ca,0) se cumple X x Y = Z. La versión con X->(-sa,ca,0) tiene
    # determinante -1 y espeja las piezas (el motor salía al revés).
    Rot = np.array([[sa, ca, 0], [-ca, sa, 0], [0, 0, 1]], dtype=float)
    t = np.array([R * cp, R * sp, z], dtype=float)
    Vs, Fs, Cs = [], [], []
    base = 0
    for m in pieza['mallas']:
        v = np.array(m['pos'], dtype=float).reshape(-1, 3)
        v = (Rot @ v.T).T + t
        f = np.array(m['idx'], dtype=np.int64).reshape(-1, 3)
        Vs.append(v)
        Fs.append(f + base)
        Cs.append(np.tile(m['color'], (len(f), 1)))
        base += len(v)
    return np.vstack(Vs), np.vstack(Fs), np.vstack(Cs)


# --- escritor GLB mínimo ----------------------------------------------------
def escribe_glb(path, grupos):
    """grupos: [(nombre, V, F, color_rgb)] — una malla y un material por grupo."""
    bin_parts, views, accs, meshes, mats, nodes = [], [], [], [], [], []
    off = 0

    def add_view(buf):
        nonlocal off
        pad = (4 - len(buf) % 4) % 4
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(buf)})
        bin_parts.append(buf + b'\0' * pad)
        off += len(buf) + pad
        return len(views) - 1

    for name, V, F, col in grupos:
        V = np.asarray(V, dtype=np.float32)
        F = np.asarray(F, dtype=np.uint32)
        vi = add_view(V.tobytes())
        accs.append({'bufferView': vi, 'componentType': 5126, 'count': len(V),
                     'type': 'VEC3',
                     'min': V.min(0).tolist(), 'max': V.max(0).tolist()})
        pa = len(accs) - 1
        ii = add_view(F.reshape(-1).tobytes())
        accs.append({'bufferView': ii, 'componentType': 5125,
                     'count': int(F.size), 'type': 'SCALAR'})
        ia = len(accs) - 1
        mats.append({'name': f'mat_{len(mats)}', 'doubleSided': True,
                     'pbrMetallicRoughness': {
                         'baseColorFactor': list(col) + [1.0],
                         'metallicFactor': 0.15, 'roughnessFactor': 0.7}})
        meshes.append({'name': name, 'primitives': [
            {'attributes': {'POSITION': pa}, 'indices': ia, 'material': len(mats) - 1}]})
        nodes.append({'name': name, 'mesh': len(meshes) - 1})

    # nodo raíz: Z-arriba del modelo -> Y-arriba de glTF
    raiz = {'name': 'curva', 'children': list(range(len(nodes))),
            'rotation': [-math.sqrt(0.5), 0, 0, math.sqrt(0.5)]}
    nodes.append(raiz)
    binbuf = b''.join(bin_parts)
    gltf = {'asset': {'version': '2.0', 'generator': 'curva_ensamble.py (foto3d)'},
            'scene': 0, 'scenes': [{'nodes': [len(nodes) - 1]}],
            'nodes': nodes, 'meshes': meshes, 'materials': mats,
            'accessors': accs, 'bufferViews': views,
            'buffers': [{'byteLength': len(binbuf)}]}
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binbuf)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A))
        f.write(js)
        f.write(struct.pack('<II', len(binbuf), 0x004E4942))
        f.write(binbuf)
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('angulo', type=int)
    ap.add_argument('salida')
    ap.add_argument('--bastidor', default=None)
    ap.add_argument('--piezas', default=os.path.join(AQUI, 'zp_piezas.json'))
    a = ap.parse_args()

    doc = json.load(open(os.path.join(AQUI, f'curva{a.angulo}_24.json')))
    montaje = doc['meta']['montaje']
    piezas = json.load(open(a.piezas))
    bast = a.bastidor or f'/tmp/curva{a.angulo}_estructura.glb'

    grupos = []
    V, F, C = malla_de_glb(bast)
    grupos.append((f'BASTIDOR curva {a.angulo}° (planos Kofmelk)', V, F, C[0]))
    print(f'bastidor: {len(F)} triángulos')

    total = 0
    for comp, sitios in montaje.items():
        if comp not in piezas:
            print(f'  ! falta el componente «{comp}» en {a.piezas}')
            continue
        Vs, Fs, Cs, base = [], [], [], 0
        for s in sitios:
            v, f, c = instancia(piezas[comp], s['R'], s['ang'], s['z'], s.get('giro', 0))
            Vs.append(v)
            Fs.append(f + base)
            Cs.append(c)
            base += len(v)
        V, F, C = np.vstack(Vs), np.vstack(Fs), np.vstack(Cs)
        grupos.append((f'ZP2026 · {comp} ×{len(sitios)} (STEP del recto)', V, F, C[0]))
        total += len(F)
        print(f'  {comp:14s} ×{len(sitios):<3d} {len(F):6d} triángulos')

    n = escribe_glb(a.salida, grupos)
    print(f'OK: {len(grupos)} grupos, {n / 1e6:.1f} MB → {a.salida}')


if __name__ == '__main__':
    sys.exit(main())
