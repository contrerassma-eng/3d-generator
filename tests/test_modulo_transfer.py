"""Pruebas del módulo de transferencia (pipeline/modulo_transfer.py).

Verifica los invariantes que hacen INSERTABLE y MONTABLE el módulo sin
ejecutar los renders/PDF (lentos): diseño, construcción y verificación
geométrica en memoria. Desde la revisión 2 el desvío son omnis giradas 90°
movidas por o-rings (no correas de transporte): ver DECISIONES.md.

uso: python tests/test_modulo_transfer.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "pipeline"))
import modulo_transfer as MT  # noqa: E402

CHECKS = []


def check(name, cond):
    CHECKS.append((name, bool(cond)))
    print(f"  {'OK  ' if cond else 'FALLA'} {name}")


def main():
    d = MT.disenar_modulo(MT.PARAMS_DEF)
    f, om, dv = d["frame"], d["omnis"], d["desvio"]
    paso = d["parametros"]["paso"]

    # --- alturas y encaje ----------------------------------------------------
    check("tangente rasante con la pestaña superior",
          f["tangente"] == d["parametros"]["alto"] + d["parametros"]["resalte"])
    check(f"encaje BF: {f['ancho_total']:g} + 2x3 = {d['parametros']['bf']:g}",
          abs(f["ancho_total"] + 2 * d["parametros"]["holgura_bf"]
              - d["parametros"]["bf"]) < 1e-6)
    check("ejes de avance y de desvío a la MISMA z (tangentes coplanares)",
          dv["z_eje"] == om["z_eje"] == f["tangente"] - 29.0)

    # --- desvío: planta y transmisión ---------------------------------------
    check("4 omnis giradas por hueco, 3 huecos",
          dv["n_ruedas"] == 12 and len(dv["huecos"]) == 3)
    cols = {0: [73, 147, 221, 295], 1: [36, 110, 184, 258]}
    ok_cols = all(h["stubs_x"] == cols[k % 2] for k, h in enumerate(dv["huecos"]))
    check("stubs en las columnas del tresbolillo de la hilera superior", ok_cols)
    x_ls = dv["eje_comun"]["x"]
    ok_ady = all(h["stubs_x"][1] < x_ls < h["stubs_x"][2] and
                 {h["risers"][0][0], h["risers"][1][0]} ==
                 {h["stubs_x"][1], h["stubs_x"][2]} for h in dv["huecos"])
    check("risers solo a los DOS stubs adyacentes al eje común", ok_ady)
    ok_cad = all(set(c[:2]) in ({h["stubs_x"][2], h["stubs_x"][3]},
                                {h["stubs_x"][1], h["stubs_x"][0]})
                 for h in dv["huecos"] for c in h["cadenas"])
    check("cadenas stub-a-stub hacia afuera", ok_cad)
    ok_garg = all(h["risers"][0][1] != h["risers"][1][1] and
                  h["cadenas"][0][2] != h["cadenas"][1][2] and
                  h["risers"][0][1] == h["cadenas"][1][2]
                  for h in dv["huecos"])
    check("gargantas alternadas riser/cadena (lazos coplanares disjuntos en x)",
          ok_garg)
    check("punta del stub libra la corona superior (>=1 mm)",
          (paso / 2 - 29.0) - dv["eje_y_rel"][1] >= 1.0)
    check("bloque de desvío libra el eje inferior (>=1 mm)",
          (paso / 2 - 12.7 / math.sqrt(3)) + dv["bloque"]["y_rel"][0] >= 1.0)
    check("travesaño pasa bajo el vuelo de las coronas",
          dv["travesano"]["z"][1] <= om["z_eje"] - 29.0 - 2.0)
    xmax = max(x for x, _ in dv["ruedas_xy"])
    check("coronas del desvío libran la pantalla",
          xmax + 29.0 <= f["pantalla_x"] - 20)

    # --- construcción + verificación -----------------------------------------
    piezas, unicos, planos2d = MT.construir_modulo(d)
    verif = MT.verificar_modulo(d, piezas, unicos)
    for clave in ("encaje_bf", "tangencia", "anillos_desvio", "apoyo_caja_250",
                  "holguras", "interferencias_aabb"):
        check(f"verificación {clave}: {verif[clave]['verdicto']}",
              verif[clave]["verdicto"] == "PASA")
    check("verificación global PASA", verif["verdicto_global"] == "PASA")
    check("todas las holguras >= 1 mm",
          all(v >= 1.0 for v in verif["holguras"]["mm"].values()))
    check(f"envolvente mínima de anillo "
          f"{verif['anillos_desvio']['envolvente_min']}° >= 120 (gate NBT90)",
          verif["anillos_desvio"]["envolvente_min"] >= 120)
    check(f"apoyo caja 250: {verif['apoyo_caja_250']['min_ruedas_avance']} av / "
          f"{verif['apoyo_caja_250']['min_ruedas_desvio']} desvío",
          verif["apoyo_caja_250"]["min_ruedas_avance"] >= 4
          and verif["apoyo_caja_250"]["min_ruedas_desvio"] >= 3
          and verif["apoyo_caja_250"]["min_huecos_desvio"] >= 2)
    check("12 lazos de o-ring en el desvío",
          verif["anillos_desvio"]["n_anillos"] == 12
          and len(d["desvio"]["lazos_mm"]) == 12)

    # nada sobresale de la envolvente insertable
    lo = np.min([m.bounds[0] for _, m, _ in piezas], axis=0)
    hi = np.max([m.bounds[1] for _, m, _ in piezas], axis=0)
    check("nada bajo el fondo del canal ni sobre la tangente",
          lo[2] >= -0.01 and hi[2] <= f["tangente"] + 0.1)
    check(f"ancho real {hi[0] - lo[0]:.1f} = ancho total {f['ancho_total']:g}",
          abs((hi[0] - lo[0]) - f["ancho_total"]) < 0.5)

    # piezas y perfiles completos
    check("todas las FABRICADAS tienen malla única",
          all(n in unicos for n in MT.FABRICADAS))
    check("perfiles 2D para corte de las placas",
          {"placa_extremo", "mampara_motores", "pantalla_tren",
           "soporte_desvio", "tapa_superior", "soporte_eje"} <= set(planos2d))
    n_av = sum(1 for n, _, _ in piezas
               if n.startswith("rueda_") and not n.startswith("rueda_desvio"))
    n_de = sum(1 for n, _, _ in piezas if n.startswith("rueda_desvio"))
    check("18 ruedas de avance + 12 giradas 90°", n_av == 18 and n_de == 12)
    check("4 ejes de avance + 12 ejes cortos de desvío",
          sum(1 for n, _, _ in piezas if n.startswith("eje_omni_")) == 4 and
          sum(1 for n, _, _ in piezas if n.startswith("eje_desvio_")) == 12)
    check("3 travesaños, 12 bloques y 12 poleas de desvío",
          sum(1 for n, _, _ in piezas if n.startswith("trav_")) == 3 and
          sum(1 for n, _, _ in piezas if n.startswith("soporte_desvio_")) == 12
          and sum(1 for n, _, _ in piezas if n.startswith("polea_desvio_")) == 12)
    check("2 motores UniDrive en el conjunto",
          sum(1 for n, _, _ in piezas if n.startswith("motor_")) == 2)
    check("17 o-rings (3 eje-eje + motor A + motor B + 12 del desvío)",
          sum(1 for n, _, _ in piezas if n.startswith("oring")) == 17)

    fails = [n for n, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(fails)}/{len(CHECKS)} pruebas OK")
    if fails:
        sys.exit("FALLAN: " + ", ".join(fails))


if __name__ == "__main__":
    main()
