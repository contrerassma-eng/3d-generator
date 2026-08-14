#!/usr/bin/env python3
"""render_glb.py — Render por software de un GLB del repo, sin GPU ni navegador.

`nbt90/render.mjs` captura el visor real en Chromium, que es lo correcto cuando
hay GPU. En un contenedor headless WebGL corre por swiftshader y una vista puede
tardar más que toda la generación del modelo. Este renderer no necesita nada de
eso: lee el GLB, proyecta los triángulos y los pinta con z-buffer y sombreado
plano. Es determinista, entra en segundos y sirve para documentar un ensamble.

  python3 ensambles/render_glb.py <modelo.glb> <salida/> [--prefijo curva90]

Emite una PNG por vista (iso, frente, lado, planta).
"""
import argparse
import json
import math
import struct
import sys

import numpy as np
from PIL import Image

# --- GLB -------------------------------------------------------------------
COMP = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def leer_glb(path):
    d = open(path, 'rb').read()
    magic, _, _ = struct.unpack_from('<III', d, 0)
    assert magic == 0x46546C67, 'no es un GLB'
    off, gltf, bin_ = 12, None, b''
    while off < len(d):
        ln, ty = struct.unpack_from('<II', d, off)
        chunk = d[off + 8: off + 8 + ln]
        if ty == 0x4E4F534A:
            gltf = json.loads(chunk)
        elif ty == 0x004E4942:
            bin_ = chunk
        off += 8 + ln + ((4 - ln % 4) % 4 if ln % 4 else 0)
    return gltf, bin_


def accessor(g, b, i):
    a = g['accessors'][i]
    bv = g['bufferViews'][a['bufferView']]
    n = NCOMP[a['type']]
    fmt = COMP[a['componentType']]
    itemsize = np.dtype(fmt).itemsize
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or (itemsize * n)
    out = np.empty((a['count'], n), dtype=np.dtype(fmt))
    for k in range(a['count']):
        o = start + k * stride
        out[k] = np.frombuffer(b, dtype=np.dtype(fmt), count=n, offset=o)
    return out


def nodo_matriz(nd):
    if 'matrix' in nd:
        return np.array(nd['matrix'], dtype=float).reshape(4, 4).T
    m = np.eye(4)
    if 'rotation' in nd:
        x, y, z, w = nd['rotation']
        m[:3, :3] = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    if 'scale' in nd:
        m[:3, :3] = m[:3, :3] @ np.diag(nd['scale'])
    if 'translation' in nd:
        m[:3, 3] = nd['translation']
    return m


def triangulos(g, b):
    """Devuelve (V, F, color_por_cara) en coordenadas de mundo."""
    Vs, Fs, Cs = [], [], []
    base = 0

    def recorre(idx, M):
        nonlocal base
        nd = g['nodes'][idx]
        M = M @ nodo_matriz(nd)
        if 'mesh' in nd:
            for prim in g['meshes'][nd['mesh']]['primitives']:
                v = accessor(g, b, prim['attributes']['POSITION']).astype(float)
                v = (M[:3, :3] @ v.T).T + M[:3, 3]
                if 'indices' in prim:
                    f = accessor(g, b, prim['indices']).astype(np.int64).reshape(-1, 3)
                else:                       # malla no indexada: tríos correlativos
                    f = np.arange(len(v), dtype=np.int64).reshape(-1, 3)
                col = (0.6, 0.63, 0.6)
                mi = prim.get('material')
                if mi is not None:
                    pbr = g['materials'][mi].get('pbrMetallicRoughness', {})
                    col = tuple(pbr.get('baseColorFactor', [0.6, 0.63, 0.6])[:3])
                Vs.append(v)
                Fs.append(f + base)
                Cs.append(np.tile(col, (len(f), 1)))
                base += len(v)
        for c in nd.get('children', []):
            recorre(c, M)

    for r in g['scenes'][g.get('scene', 0)]['nodes']:
        recorre(r, np.eye(4))
    return np.vstack(Vs), np.vstack(Fs), np.vstack(Cs)


# --- render ----------------------------------------------------------------
VISTAS = {
    'iso': (math.radians(35.264), math.radians(-45)),
    # isométrica SUPERIOR: más elevación que la isométrica normal, para ver la
    # cama de polines y a la vez cómo llegan los soportes al piso
    'iso_sup': (math.radians(55), math.radians(-45)),
    'iso_sup2': (math.radians(55), math.radians(-135)),
    'frente': (0.0, 0.0),
    'lado': (0.0, math.radians(-90)),
    'planta': (math.radians(89.9), 0.0),
}


def render(V, F, C, elev, azim, W=1600, H=1100, fondo=(250, 250, 248)):
    ca, sa = math.cos(azim), math.sin(azim)
    ce, se = math.cos(elev), math.sin(elev)
    # cámara: derecha, arriba, vista
    fwd = np.array([ca * ce, sa * ce, se])
    right = np.array([-sa, ca, 0.0])
    up = np.cross(fwd, right)
    P = np.stack([V @ right, V @ up, V @ fwd], axis=1)   # x, y, profundidad

    lo, hi = P[:, :2].min(0), P[:, :2].max(0)
    span = (hi - lo).max() * 1.08
    if span <= 0:
        span = 1.0
    s = min(W, H) / span
    cx, cy = (lo + hi) / 2
    px = (P[:, 0] - cx) * s + W / 2
    py = H / 2 - (P[:, 1] - cy) * s
    z = P[:, 2]

    img = np.zeros((H, W, 3), dtype=np.float32)
    img[:] = np.array(fondo) / 255.0
    zbuf = np.full((H, W), np.inf)

    a, b_, c = F[:, 0], F[:, 1], F[:, 2]
    n = np.cross(V[b_] - V[a], V[c] - V[a])
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    n = n / np.where(ln == 0, 1, ln)
    luz = np.array([0.35, 0.55, 0.76])
    luz = luz / np.linalg.norm(luz)
    lam = np.clip(np.abs(n @ luz), 0, 1)
    tono = (0.30 + 0.70 * lam)[:, None] * C

    orden = np.argsort(-(z[a] + z[b_] + z[c]))     # lejos → cerca
    for t in orden:
        i0, i1, i2 = F[t]
        xs = np.array([px[i0], px[i1], px[i2]])
        ys = np.array([py[i0], py[i1], py[i2]])
        zs = np.array([z[i0], z[i1], z[i2]])
        x0, x1 = int(max(0, np.floor(xs.min()))), int(min(W - 1, np.ceil(xs.max())))
        y0, y1 = int(max(0, np.floor(ys.min()))), int(min(H - 1, np.ceil(ys.max())))
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = ((ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2]))
        if abs(d) < 1e-9:
            continue
        w0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / d
        w1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / d
        w2 = 1 - w0 - w1
        m = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not m.any():
            continue
        zz = w0 * zs[0] + w1 * zs[1] + w2 * zs[2]
        sub = zbuf[y0:y1 + 1, x0:x1 + 1]
        vis = m & (zz < sub)
        if not vis.any():
            continue
        sub[vis] = zz[vis]
        img[y0:y1 + 1, x0:x1 + 1][vis] = tono[t]
    return Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('glb')
    ap.add_argument('salida')
    ap.add_argument('--prefijo', default='modelo')
    ap.add_argument('--vistas', default='iso,frente,lado,planta')
    ap.add_argument('--ancho', type=int, default=1600)
    ap.add_argument('--alto', type=int, default=1100)
    a = ap.parse_args()

    g, b = leer_glb(a.glb)
    V, F, C = triangulos(g, b)
    # El exportador del repo emite el GLB en Y-arriba (convención glTF) aunque
    # el modelo es Z-arriba. Las vistas de abajo son de ingeniería (Z-arriba),
    # así que se deshace ese giro: +90° en X.
    V = np.stack([V[:, 0], -V[:, 2], V[:, 1]], axis=1)
    print(f'{a.glb}: {len(V)} vértices, {len(F)} triángulos')
    import os
    os.makedirs(a.salida, exist_ok=True)
    for v in a.vistas.split(','):
        elev, azim = VISTAS[v]
        img = render(V, F, C, elev, azim, a.ancho, a.alto)
        out = os.path.join(a.salida, f'{a.prefijo}_{v}.png')
        img.save(out)
        print(f'  ✔ {v:8s} → {out}')


if __name__ == '__main__':
    sys.exit(main())
