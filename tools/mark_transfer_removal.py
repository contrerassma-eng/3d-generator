#!/usr/bin/env python3
"""Marca, en un STL teselado del STEP base (tools/step_to_stl.py), los triángulos
de la TRANSFERENCIA DE RODILLOS DELGADOS original (rodillos finos + su
transmisión en el cabezal) para que el visor combinado
(cad/ensambles/ver_integracion_real.html) los OMITA y en su lugar se calce el
módulo de transferencia Ø63 nuevo.

No borra geometría del STEP: solo produce una máscara (1 byte/triángulo, 1 =
omitir) alineada con el orden del STL. Conserva las bandas pasantes y el
bastidor.

Cómo decide qué quitar: separa la malla en piezas conexas y remueve las que
están en el cabezal de transferencia (Y < −640, medido en el teselado), NO caen
sobre una banda pasante (X = 0/139/277/416) y NO son bloque estructural
(sección transversal > 75). Eso captura los rodillos finos, sus poleas y la
transmisión; deja bandas y frame.

Es un DERIVADO del STL (a su vez derivado del STEP): regenerable, no se versiona
(ver .gitignore). Uso:

    python tools/mark_transfer_removal.py cad/ensambles/base.stl cad/ensambles/base_remove.bin

Requisitos: numpy, scipy.
"""
from __future__ import annotations

import struct
import sys
from pathlib import Path

import numpy as np
from scipy import sparse
from scipy.sparse.csgraph import connected_components

LANES = (0.0, 139.0, 277.0, 416.0)   # bandas pasantes del base (X), paso 139


def mark(stl: Path, out: Path, weld: float = 0.4,
         head_y: float = -640.0, lane_tol: float = 32.0, frame_mid: float = 75.0) -> None:
    raw = stl.read_bytes()
    n = struct.unpack("<I", raw[80:84])[0]
    arr = np.frombuffer(raw[84:84 + 50 * n], dtype=np.uint8).reshape(n, 50)
    verts = np.ascontiguousarray(arr[:, 12:48]).view("<f4").reshape(n, 3, 3).astype(np.float64)

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
    ctr = (cmin + cmax) / 2
    midd = np.sort(dims, axis=1)[:, 1]

    lanes = np.array(LANES)
    onlane = np.min(np.abs(ctr[:, 0:1] - lanes[None, :]), axis=1) < lane_tol
    head = ctr[:, 1] < head_y
    frame = midd > frame_mid            # bloque/placa estructural: conservar
    rem = head & (~onlane) & (~frame)

    mask = np.zeros(ncomp, np.uint8)
    mask[rem] = 1
    np.ascontiguousarray(mask[comp]).tofile(out)
    nrem = int((mask[comp] == 1).sum())
    print(f"piezas removidas: {int(rem.sum())} de {ncomp}")
    print(f"triangulos marcados: {nrem} de {n}  -> {out.name}")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("uso: python tools/mark_transfer_removal.py <base.stl> [base_remove.bin]")
    stl = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else stl.with_name(stl.stem + "_remove.bin")
    mark(stl, out)
    print(f"OK -> {out}")


if __name__ == "__main__":
    main()
