#!/usr/bin/env python3
"""Tesela un STEP (B-rep) a STL binario con gmsh/OpenCASCADE, para VER la
geometría real del equipo base (p. ej. sorter_CO.stp) en el visor
cad/ensambles/ver_stl.html.

Este entorno no tiene un CAD interactivo; gmsh (que embebe OpenCASCADE) importa
el B-rep, lo malla en superficie y exporta STL. Los STEP grandes traen wires
OCC que gmsh no puede sanear: con General.AbortOnError=0 se saltan y se malla el
resto. La malla es GRUESA (solo para visualizar); no sustituye al modelo CAD.

Requisitos (una vez):
    pip install gmsh
    apt-get install -y libglu1-mesa libxft2 libxinerama1 libxcursor1 \\
        libxrender1 libxfixes3 libfontconfig1 libxext6

Uso:
    python tools/step_to_stl.py <archivo.stp> [salida.stl] [size_max]

Luego servir cad/ y abrir:
    ver_stl.html?stl=<salida>.stl&view=iso

El STL resultante NO se versiona (ver .gitignore): es un derivado grande y
regenerable a partir del STEP. Un punto atípico ocasional del STEP (pieza mal
ubicada) se filtra por caja envolvente antes de escribir.
"""
from __future__ import annotations

import struct
import sys
from pathlib import Path


def mesh_step(step: Path, out: Path, size_max: float = 250.0) -> None:
    import gmsh
    gmsh.initialize()
    gmsh.option.setNumber("General.Terminal", 1)
    gmsh.option.setNumber("General.Verbosity", 1)
    gmsh.option.setNumber("General.AbortOnError", 0)      # saltar superficies malas
    gmsh.option.setNumber("Geometry.OCCImportLabels", 0)
    gmsh.option.setNumber("Mesh.Binary", 1)
    gmsh.open(str(step))
    gmsh.option.setNumber("Mesh.MeshSizeMin", max(4.0, size_max / 12))
    gmsh.option.setNumber("Mesh.MeshSizeMax", size_max)
    gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 8)
    gmsh.option.setNumber("Mesh.Algorithm", 6)
    try:
        gmsh.model.mesh.generate(2)
    except Exception as e:                                # noqa: BLE001
        print("aviso de malla:", repr(e)[:80])
    tmp = out.with_suffix(".raw.stl")
    gmsh.write(str(tmp))
    gmsh.finalize()
    _filter_outliers(tmp, out)
    tmp.unlink(missing_ok=True)


def _filter_outliers(src: Path, dst: Path, limit: float = 5000.0) -> None:
    """Copia el STL binario descartando facets con vértices muy lejos del
    origen (piezas atípicas del STEP), y reporta la caja envolvente real."""
    raw = src.read_bytes()
    n = struct.unpack("<I", raw[80:84])[0]
    kept = bytearray()
    lo = [1e18] * 3
    hi = [-1e18] * 3
    nk = 0
    off = 84
    for _ in range(n):
        facet = raw[off:off + 50]
        off += 50
        xyz = struct.unpack("<9f", facet[12:48])
        ys = (xyz[1], xyz[4], xyz[7])
        if min(ys) < -limit or max(ys) > limit + 100000:
            continue
        nk += 1
        kept += facet
        for k in range(3):
            for j in range(3):
                v = xyz[k * 3 + j]
                lo[j] = min(lo[j], v)
                hi[j] = max(hi[j], v)
    hdr = b"foto3d: STEP teselado (gmsh/OCC)".ljust(80, b" ")
    dst.write_bytes(hdr + struct.pack("<I", nk) + bytes(kept))
    print(f"facets {n} -> {nk}")
    print("bbox min", [round(v, 1) for v in lo])
    print("bbox max", [round(v, 1) for v in hi])
    print("tamano mm", [round(hi[i] - lo[i], 1) for i in range(3)])


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("uso: python tools/step_to_stl.py <archivo.stp> [salida.stl] [size_max]")
    step = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else step.with_suffix(".stl")
    size_max = float(sys.argv[3]) if len(sys.argv) > 3 else 250.0
    mesh_step(step, out, size_max)
    print(f"OK -> {out}")


if __name__ == "__main__":
    main()
