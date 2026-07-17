#!/usr/bin/env python3
"""Colorea por triángulos un STL teselado del STEP base (p. ej. base.stl de
tools/step_to_stl.py) para que NO se vea todo gris, con una paleta industrial
plausible. NO inventa geometría: solo asigna color a piezas ya existentes.

Cómo funciona: separa la malla en piezas conexas (componentes conectados sobre
las aristas de los triángulos, soldando vértices coincidentes) y pinta cada
pieza según su tamaño y forma:

    - bastidor/placas grandes            → azul de máquina
    - bandas dentadas (largas, arriba)   → negro
    - perfiles largos (PG40, largueros)  → aluminio
    - rodillos/poleas/rodamientos        → acero oscuro
    - tornillería y piezas pequeñas      → acero

Salida: un binario de N*3 bytes (RGB por triángulo, en el MISMO orden que el
STL) que el visor cad/ensambles/ver_stl.html (?colors=...) y
ver_integracion_real.html leen como color por vértice.

Es un DERIVADO del STL (a su vez derivado del STEP): regenerable, no se versiona
(ver .gitignore). Uso:

    python tools/color_step_mesh.py cad/ensambles/base.stl cad/ensambles/base_colors.bin

Requisitos: numpy, scipy.
"""
from __future__ import annotations

import struct
import sys
from pathlib import Path

import numpy as np
from scipy import sparse
from scipy.sparse.csgraph import connected_components

# paleta industrial (RGB)
BLUE = (33, 80, 150)      # bastidor / placas → azul de máquina
STEEL = (150, 158, 168)   # acero claro (tornillería, genérico)
DKSTEEL = (70, 80, 92)    # acero oscuro (rodillos, poleas, rodamientos)
BLACK = (24, 24, 26)      # bandas dentadas
ALU = (176, 184, 192)     # perfiles de aluminio (PG40, largueros)


def color_mesh(stl: Path, out: Path, weld: float = 0.4) -> None:
    raw = stl.read_bytes()
    n = struct.unpack("<I", raw[80:84])[0]
    arr = np.frombuffer(raw[84:84 + 50 * n], dtype=np.uint8).reshape(n, 50)
    verts = np.ascontiguousarray(arr[:, 12:48]).view("<f4").reshape(n, 3, 3).astype(np.float64)

    # soldar vértices coincidentes (cuantizados) → grafo de adyacencia por arista
    q = np.round(verts.reshape(n * 3, 3) / weld).astype(np.int64)
    _, inv = np.unique(q, axis=0, return_inverse=True)
    V = int(inv.max()) + 1
    vid = inv.reshape(n, 3)
    r = np.concatenate([vid[:, 0], vid[:, 1], vid[:, 2]])
    c = np.concatenate([vid[:, 1], vid[:, 2], vid[:, 0]])
    g = sparse.coo_matrix((np.ones(len(r), np.int8), (r, c)), shape=(V, V))
    ncomp, lab = connected_components(g, directed=False)
    comp = lab[vid[:, 0]]

    cmin = np.full((ncomp, 3), 1e18)
    cmax = np.full((ncomp, 3), -1e18)
    np.minimum.at(cmin, comp, verts.min(axis=1))
    np.maximum.at(cmax, comp, verts.max(axis=1))
    dims = cmax - cmin
    zc = (cmin[:, 2] + cmax[:, 2]) / 2
    size = np.linalg.norm(dims, axis=1)
    zmax = cmax[:, 2].max()
    dx, dy, dz = dims[:, 0], dims[:, 1], dims[:, 2]

    # heurística de clasificación por forma/posición
    longY = (dy > 250) & (np.maximum(dx, dz) < 70) & (dy / np.maximum(np.maximum(dx, dz), 1) > 3.5)
    high = zc > (zmax - 90)
    compact = (np.maximum.reduce([dx, dy, dz]) / np.maximum(np.minimum.reduce([dx, dy, dz]), 1)) < 2.2

    col = np.zeros((ncomp, 3), np.uint8)
    for i in range(ncomp):
        if longY[i] and high[i]:
            col[i] = BLACK
        elif longY[i]:
            col[i] = ALU
        elif size[i] > 650:
            col[i] = BLUE
        elif size[i] < 70:
            col[i] = STEEL
        elif compact[i]:
            col[i] = DKSTEEL
        else:
            col[i] = STEEL

    out.write_bytes(np.ascontiguousarray(col[comp]).tobytes())
    print(f"componentes conexos: {ncomp}")
    print(f"triangulos: {n}  -> {out.name} ({n * 3} bytes RGB)")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("uso: python tools/color_step_mesh.py <base.stl> [base_colors.bin]")
    stl = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else stl.with_name(stl.stem + "_colors.bin")
    color_mesh(stl, out)
    print(f"OK -> {out}")


if __name__ == "__main__":
    main()
