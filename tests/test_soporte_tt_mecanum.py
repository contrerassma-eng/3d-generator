"""Pruebas del soporte modular TT + mecanum (pipeline/soporte_tt_mecanum.py).

Reconstruye ambas piezas imprimibles, corre la verificacion geometrica del
generador (estanqueidad, sondas de material/vacio, holguras clave) y comprueba
que el catalogo contenga los componentes del bloque con sus modelos presentes.

uso: python tests/test_soporte_tt_mecanum.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "pipeline"))
import lib_componentes as C  # noqa: E402
import soporte_tt_mecanum as S  # noqa: E402

CHECKS = []


def check(name, cond):
    CHECKS.append((name, bool(cond)))
    print(("OK   " if cond else "FALLA") + " " + name)


def main():
    base, tapa = S.build_base(), S.build_tapa()
    fallas = S.verificar(base, tapa)
    check("verificacion geometrica del generador sin fallas: " +
          (", ".join(fallas) or "-"), not fallas)
    check("base estanca y con volumen razonable (25-40 cm3)",
          base.is_watertight and 25e3 < base.volume < 40e3)
    check("tapa estanca y con volumen razonable (10-16 cm3)",
          tapa.is_watertight and 10e3 < tapa.volume < 16e3)

    # invariantes de diseno que no deben romperse al tocar parametros
    check("el eje del motor queda a la altura del eje de la rueda montada",
          abs(S.Z_EJE - (S.P["t_base"] + S.P["alzada_asiento"]
                         + S.MOTOR["alto_cuerpo"] / 2)) < 1e-9)
    check("luz entre caras de la abrazadera = caja + 2 holguras",
          abs((S.XA0 - S.XB1) - (S.MOTOR["ancho_caja"]
                                 + 2 * S.P["holgura_caja"])) < 1e-9)
    check("la lata del motor no alcanza el borde trasero de las paredes",
          S.Y_PARED1 < S.MOTOR["lata_desde"] - 1.0)
    check("el perno M3 del motor no cruza la torre",
          S.TORRE["y1"] < S.MOTOR["m3_tras"] - S.P["perno_motor_d"] / 2 - 1.0)

    cat = C.load_catalogo()
    ids = {c["id"] for c in cat["componentes"]}
    esperados = {"motor_tt_doble_eje", "rueda_mecanum_48_izq",
                 "soporte_tt_mecanum_base", "soporte_tt_mecanum_tapa",
                 "ens_soporte_tt_mecanum"}
    check("catalogo contiene los 5 componentes del bloque",
          esperados <= ids)
    for cid in sorted(esperados):
        comp = C.get_componente(cat, cid)
        check(f"{cid}: esquema valido", not C.validar_componente(comp))
        glb = (comp.get("malla") or comp.get("ensamble") or {}).get("glb")
        if glb:
            check(f"{cid}: GLB presente ({glb})",
                  (REPO / "cad" / glb).exists())
    for stl in ("soporte_tt_mecanum_base.stl", "soporte_tt_mecanum_tapa.stl"):
        check(f"STL imprimible presente ({stl})",
              (S.MODELS / stl).exists())

    # el GLB publicado coincide con lo que genera el codigo actual
    import trimesh
    pub = trimesh.load(S.MODELS / "soporte_tt_mecanum_base.glb", force="mesh")
    check("GLB publicado coincide con el generador (volumen)",
          abs(pub.volume - base.volume) < 1.0)

    malas = [n for n, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(malas)}/{len(CHECKS)} pruebas OK")
    if malas:
        sys.exit("FALLAS: " + "; ".join(malas))


if __name__ == "__main__":
    main()
