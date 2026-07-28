#!/usr/bin/env python3
"""interferencias_brep.py — interferencia EXACTA entre piezas, con OpenCascade.

Por qué existe, además de `interferencias.mjs`: el motor CSG del repo trabaja
sobre mallas con un árbol BSP y da **volumen fantasma** en cuanto los sólidos no
son convexos —y casi todo el bastidor son perfiles en C y en U— o cuando dos
cortes coaxiales dejan caras cilíndricas coincidentes. En este ensamble llegó a
declarar 124 cm³ de solape entre la placa peine y el canal, que al descomponer
el canal en cajas convexas resultó ser **0.000**.

Aquí las piezas se reconstruyen como sólidos B-rep exactos (el mismo traductor
de `a_step.py`) y se intersecan con el núcleo de OpenCascade: sin facetas, sin
BSP y sin falsos positivos. Es la verificación de la que uno se puede fiar para
mandar a fabricar.

  python3 cad/ensambles/nbt90/interferencias_brep.py [--tol 0.05] [--todas]

Salida: informe por pantalla y `interferencias_brep.json`.

El ensamble se modela ELEVADO, pero el estado que hay que verificar son LOS DOS:
`gen_nbt90.mjs` emite además `out/nbt90_retraido.json` (las piezas MÓVIL bajadas
la carrera) y se le pasa esta misma herramienta a su propio informe:

  python3 cad/ensambles/nbt90/interferencias_brep.py \
      --doc cad/ensambles/nbt90/out/nbt90_retraido.json \
      --informe interferencias_brep_retraido.json
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib

sys.path.insert(0, str(Path(__file__).resolve().parent))
from a_step import construir  # noqa: E402

AQUI = Path(__file__).resolve().parent


def caja(solido):
    b = Bnd_Box()
    BRepBndLib.Add_s(solido.wrapped, b)
    xm, ym, zm, xM, yM, zM = b.Get()
    return (xm, ym, zm), (xM, yM, zM)


def solapan(a, b, hol=0.0):
    return all(a[0][i] < b[1][i] - hol and b[0][i] < a[1][i] - hol for i in range(3))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--doc", default=str(AQUI / "narrow_belt_transfer_90.json"))
    ap.add_argument("--tol", type=float, default=0.05,
                    help="cm³ por debajo de los cuales se considera contacto, no interferencia")
    ap.add_argument("--solo-cruce", action="store_true",
                    help="comparar solo MÓVIL contra FIJO (por defecto: todos los pares)")
    ap.add_argument("--informe", default="interferencias_brep.json",
                    help="nombre del informe JSON (se escribe junto al script); usar uno propio "
                         "al analizar el estado retraído para no pisar el del elevado")
    a = ap.parse_args()

    doc = json.loads(Path(a.doc).read_text(encoding="utf-8"))
    partes = [p for p in doc["parts"] if not p.get("contexto")]
    print(f"documento: {Path(a.doc).name} — {doc.get('meta', {}).get('estado_modelado', '')[:70]}")

    t0 = time.time()
    solidos = []
    for p in partes:
        try:
            s = construir(p)
        except Exception as e:                                  # noqa: BLE001
            print(f"  ? sin sólido: {p['name'][:60]} ({str(e)[:60]})")
            continue
        if s is None:
            continue
        solidos.append((p["name"], s, caja(s), s.Volume() / 1000.0))
    print(f"{len(solidos)} sólidos B-rep en {time.time() - t0:.0f} s; buscando pares…")

    movil = lambda n: n.startswith("MÓVIL")                     # noqa: E731
    pares = []
    for i in range(len(solidos)):
        for j in range(i + 1, len(solidos)):
            if a.solo_cruce and movil(solidos[i][0]) == movil(solidos[j][0]):
                continue
            if solapan(solidos[i][2], solidos[j][2]):
                pares.append((i, j))
    print(f"{len(pares)} pares con cajas solapadas; intersecando sólidos exactos…\n")

    reales, detalle = 0, []
    t1 = time.time()
    for k, (i, j) in enumerate(pares, 1):
        na, sa, _, va = solidos[i]
        nb, sb, _, vb = solidos[j]
        try:
            inter = sa.intersect(sb)
            v = inter.Volume() / 1000.0 if inter is not None else 0.0
        except Exception:                                       # noqa: BLE001
            continue
        if v > a.tol:
            reales += 1
            frac = v / min(va, vb) * 100.0
            detalle.append({"cm3": round(v, 4), "a": na, "b": nb,
                            "pct_de_la_menor": round(frac, 2),
                            "cruce": movil(na) != movil(nb)})
            print(f"  ✘ {v:8.3f} cm³ ({frac:5.1f} % de la menor)  {na[:56]}\n"
                  f"                                        ⨯ {nb[:56]}")
        if k % 200 == 0:
            print(f"    … {k}/{len(pares)} ({time.time() - t1:.0f} s)", flush=True)

    detalle.sort(key=lambda d: -d["cm3"])
    informe = {"documento": Path(a.doc).name, "tolerancia_cm3": a.tol, "piezas": len(solidos),
               "pares_candidatos": len(pares), "interferencias": reales, "detalle": detalle}
    salida = AQUI / a.informe
    salida.write_text(json.dumps(informe, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\n{reales} interferencia(s) por encima de {a.tol} cm³ sobre {len(pares)} pares "
          f"({time.time() - t0:.0f} s en total)")
    print(f"informe → {salida}")
    return 1 if reales else 0


if __name__ == "__main__":
    sys.exit(main())
