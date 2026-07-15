"""Pruebas de la carcasa parametrica ESP32 + borneras (pipeline/carcasa_esp32.py).

Verifica que la geometria derive del registro `adaptador_borneras_esp32_70x80`
del catalogo (medidas reales) y que los rasgos criticos existan de verdad:
cavidad, ventanas USB-C, muescas de cable, pilotos, ranuras de tapa y
avellanados. Usa contencion de puntos sobre las mallas estancas.

uso: python tests/test_carcasa.py
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "pipeline"))
import lib_componentes as C          # noqa: E402
import carcasa_esp32 as K            # noqa: E402

CHECKS = []


def check(name, cond):
    CHECKS.append((name, bool(cond)))
    print(("OK   " if cond else "FALLA") + " " + name)


def dentro(mesh, p):
    return bool(mesh.contains([p])[0])


def main():
    comp = C.get_componente(C.load_catalogo(), K.COMP_ID)
    d = K.Dim(comp)

    # --- derivados del registro (medidas reales del usuario) -------------
    check("registro: PCB 80 x 70 x 1.6 y 4 taladros O2.7",
          (d.pcb_x, d.pcb_y, d.pcb_t) == (80.0, 70.0, 1.6)
          and len(d.holes) == 4 and d.board_screw == 2.7)
    check("derivados = script original (cuerpo 97.8 x 87.8 x 28.4, costura 19)",
          round(d.out_x, 1) == 97.8 and round(d.out_y, 1) == 87.8
          and round(d.total, 1) == 28.4 and round(d.seam_z, 1) == 19.0
          and round(d.boss_top, 1) == 26.0 and round(d.pcb_top, 1) == 8.0)
    check("ventanas USB-C: 2, centros Y=+-6.5, centro Z=9.8",
          sorted(d.usb_ys) == [-6.5, 6.5] and round(d.usb_zc, 1) == 9.8)

    # --- base -------------------------------------------------------------
    base = K.build_base(d)
    check("base estanca", base.is_watertight)
    lo, hi = base.bounds
    check("base: extension con bridas 125.8 x 87.8, z 0-26",
          round(hi[0] - lo[0], 1) == 125.8 and round(hi[1] - lo[1], 1) == 87.8
          and abs(lo[2]) < 1e-6 and round(hi[2], 1) == 26.0)
    check("base: cavidad vacia y piso solido",
          not dentro(base, (0, 0, K.FLOOR + 5)) and dentro(base, (0, 0, 1.2)))
    check("base: ventana USB-C abierta y pared solida al lado",
          not dentro(base, (d.out_x / 2 - 1, 6.5, d.usb_zc))
          and dentro(base, (d.out_x / 2 - 1, 20, d.usb_zc)))
    check("base: muesca de cable abierta en ambas paredes y pared solida entre muescas",
          not dentro(base, (30, d.out_y / 2 - 1, 15))
          and not dentro(base, (0, -(d.out_y / 2 - 1), 15))
          and dentro(base, (15, d.out_y / 2 - 1, 15)))
    bx, by = d.bosses[0]
    check("base: torre solida con piloto O2.7 vacio",
          not dentro(base, (bx, by, d.boss_top - 2))
          and dentro(base, (bx + 2.6, by, d.boss_top - 2)))
    hx, hy = d.holes[0]
    check("base: poste de PCB con piloto de tornillo de placa",
          not dentro(base, (hx, hy, K.FLOOR + 1))
          and dentro(base, (hx + 2.6, hy, K.FLOOR + 1)))
    check("base: ranura M5 de la brida abierta",
          not dentro(base, (d.out_x / 2 + K.FLG_OUT * 0.55, 0, 2)))

    # --- tapa --------------------------------------------------------------
    tapa = K.build_tapa(d)
    check("tapa estanca", tapa.is_watertight)
    lo, hi = tapa.bounds
    check("tapa: 97.8 x 87.8, z 16.5-28.4 (costillas bajan 2.5 bajo la costura)",
          round(hi[0] - lo[0], 1) == 97.8
          and round(lo[2], 1) == round(d.seam_z - K.RIB_DROP, 1)
          and round(hi[2], 1) == 28.4)
    check("tapa: ranura superior a borneras abierta y tapa solida al centro",
          not dentro(tapa, (0, d.term_y, d.total - 1))
          and dentro(tapa, (0, 0, d.total - 1)))
    check("tapa: rebaje de etiqueta 0.8",
          not dentro(tapa, (0, 0, d.total - 0.4))
          and dentro(tapa, (0, 0, d.total - 1.2)))
    check("tapa: pasante avellanado sobre cada torre",
          all(not dentro(tapa, (x, y, d.total - 0.3)) for (x, y) in d.bosses))
    check("tapa: faldon cierra la muesca por arriba (pared del faldon solida)",
          dentro(tapa, (30, d.out_y / 2 - 1, d.seam_z + 3)))
    ciega = K.build_tapa(d, top_slots=False)
    check("tapa ciega: sin ranuras superiores",
          dentro(ciega, (0, d.term_y, d.total - 1)))

    # --- documento foto3d-cad ----------------------------------------------
    doc = K.build_cad_doc(d, comp)
    fids = [f["id"] for p in doc["parts"] for f in p["features"]]
    check("cad: 3 piezas (base fija, placa, tapa) e ids unicos",
          doc["format"] == "foto3d-cad" and len(doc["parts"]) == 3
          and doc["parts"][0]["fixed"] and len(fids) == len(set(fids)))
    check("cad: tapa posicionada en la costura",
          doc["parts"][2]["pos"] == [0, 0, d.seam_z])

    # --- CLI de punta a punta -----------------------------------------------
    tmp = Path(tempfile.mkdtemp(prefix="foto3d_carcasa_"))
    r = subprocess.run([sys.executable, str(REPO / "pipeline" / "carcasa_esp32.py"),
                        "--salida", str(tmp)], capture_output=True, text=True)
    esperados = ["carcasa_base.glb", "carcasa_base.stl", "carcasa_tapa.glb",
                 "carcasa_tapa.stl", "carcasa_ensamble.glb",
                 "carcasa_ensamble_explotado.glb", "carcasa_cad.json"]
    check("CLI: genera los 7 archivos",
          r.returncode == 0 and all((tmp / f).exists() for f in esperados))
    if r.returncode == 0:
        cad = json.loads((tmp / "carcasa_cad.json").read_text(encoding="utf-8"))
        check("CLI: carcasa_cad.json valido", cad["format"] == "foto3d-cad")

    fallas = [n for n, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(fallas)} OK, {len(fallas)} fallas")
    if fallas:
        sys.exit(1)


if __name__ == "__main__":
    main()
