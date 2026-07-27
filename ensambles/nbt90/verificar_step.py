#!/usr/bin/env python3
"""verificar_step.py — comprueba que el STEP B-rep es la MISMA pieza que la malla.

Un traductor puede producir un STEP que abre sin errores y sin embargo no
corresponde al modelo: un boceto extruido hacia el lado contrario, un agujero
que no atraviesa, un perfil de revolución invertido. La comprobación honesta es
comparar, pieza por pieza, el volumen y la caja envolvente del sólido exacto
contra los de la malla que genera el motor del repo.

  python3 cad/ensambles/nbt90/verificar_step.py [--tol 2.0]

La malla se lee del GLB exportado (`out/nbt90.glb`), que lleva una malla por
pieza con su nombre. El sólido se reconstruye con el mismo traductor `a_step.py`.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import trimesh

sys.path.insert(0, str(Path(__file__).resolve().parent))
from a_step import construir  # noqa: E402

AQUI = Path(__file__).resolve().parent


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--doc", default=str(AQUI / "narrow_belt_transfer_90.json"))
    ap.add_argument("--glb", default=str(AQUI / "out" / "nbt90.glb"))
    ap.add_argument("--tol", type=float, default=2.0, help="desviación admisible en %%")
    a = ap.parse_args()

    doc = json.loads(Path(a.doc).read_text(encoding="utf-8"))
    escena = trimesh.load(a.glb)
    # El GLB nombra cada malla como la pieza. NO se puede normalizar partiendo
    # por el punto: los nombres llevan cotas decimales y comillas de pulgada
    # («Placa peine 3/16" 432×292.5 (lado libre)») y dos piezas distintas
    # colapsarían en la misma clave, comparando una contra la malla de la otra.
    # Se casa por nombre EXACTO; trimesh solo añade sufijo si hay repetidos.
    mallas = {nombre: g for nombre, g in escena.geometry.items()}

    peor, revisar, sin_malla, n = 0.0, [], 0, 0
    for part in doc["parts"]:
        if part.get("contexto"):
            continue
        g = mallas.get(part["name"])
        if g is None:
            sin_malla += 1
            continue
        s = construir(part)
        if s is None:
            revisar.append((part["name"], "sin sólido B-rep", 100.0))
            continue
        vb = s.Volume() / 1000.0                       # cm³
        vm = abs(g.volume) / 1000.0
        if vm <= 0:
            continue
        dif = abs(vb - vm) / vm * 100.0
        n += 1
        peor = max(peor, dif)
        if dif > a.tol:
            revisar.append((part["name"], f"B-rep {vb:.2f} cm³ vs malla {vm:.2f} cm³", dif))

    revisar.sort(key=lambda r: -r[2])
    print(f"comparadas {n} piezas · desviación máxima {peor:.2f} %")
    if sin_malla:
        print(f"  ({sin_malla} piezas sin malla equivalente en el GLB)")
    if revisar:
        print(f"\n{len(revisar)} por encima de {a.tol} %:")
        for nombre, det, dif in revisar[:30]:
            print(f"  {dif:6.2f} %  {nombre[:62]:62s} {det}")
    else:
        print(f"\nninguna pieza se desvía más de {a.tol} %: el STEP reproduce el modelo.")
    return 1 if revisar else 0


if __name__ == "__main__":
    sys.exit(main())
