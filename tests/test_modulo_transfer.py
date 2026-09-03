"""Pruebas del módulo de transferencia (pipeline/modulo_transfer.py).

Verifica los invariantes que hacen INSERTABLE y MONTABLE el módulo sin
ejecutar los renders/PDF (lentos): diseño, construcción y verificación
geométrica en memoria. v2: el desvío son omnis giradas 90° movidas por
o-rings. v3: planta COMPLETA cubierta por omnis (sin bahía), motores
UniDrive colgados bajo el fondo en bancadas y tren de avance dentro del
campo. Ver DECISIONES.md.

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
    to = d["tren_avance"]
    paso = d["parametros"]["paso"]

    # --- alturas y encaje ----------------------------------------------------
    check("tangente rasante con la pestaña superior",
          f["tangente"] == d["parametros"]["alto"] + d["parametros"]["resalte"])
    check(f"encaje BF: {f['ancho_total']:g} + 2x3 = {d['parametros']['bf']:g}",
          abs(f["ancho_total"] + 2 * d["parametros"]["holgura_bf"]
              - d["parametros"]["bf"]) < 1e-6)
    check("v3: módulo compactado (largo = ejes x paso, sin bahía)",
          f["largo"] == d["parametros"]["ejes"] * paso)
    check("ejes de avance y de desvío a la MISMA z (tangentes coplanares)",
          dv["z_eje"] == om["z_eje"] == f["tangente"] - 29.0)

    # --- avance: campo extendido y tren dentro -------------------------------
    check("22 ruedas de avance (6+5+6+5, hasta ambas almas)",
          om["n_ruedas"] == 22)
    xs_av = sorted({x for x, _ in om["ruedas_xy"]})
    check("columnas extendidas 36..406 (pares) y 73..369 (impares)",
          min(xs_av) == 36 and max(xs_av) == 406)
    wA, wB, wM = to["planos"]["wA"], to["planos"]["wB"], to["planos"]["motor"]
    check("planos de anillo del avance junto a las almas y alternados",
          wA < 36 - 12 and wB > 406 + 12 and
          [w for (_, _, w) in to["links"]] == [wA, wB, wA])
    check("plano del motor A fuera de la chumacera B (x 117..203)",
          wM + 2.4 < 117.0)

    # --- desvío: planta y transmisión ---------------------------------------
    check("14 omnis giradas (5+4+5), stubs filtrados de los planos wA/wB",
          dv["n_ruedas"] == 14 and
          [len(h["stubs_x"]) for h in dv["huecos"]] == [5, 4, 5])
    ok_filtro = all(abs(x - w) > 29 + 2.4
                    for h in dv["huecos"] for x in h["stubs_x"]
                    for w in (wA, wB))
    check("ninguna corona girada pisa los planos de anillo del avance",
          ok_filtro)
    x_ls = dv["eje_comun"]["x"]
    ok_ady = all(h["risers"][0][0] > x_ls > h["risers"][1][0]
                 for h in dv["huecos"])
    check("risers solo a los DOS stubs adyacentes al eje común", ok_ady)
    ok_garg = all(len({r[1] for r in h["risers"]}) == 2 for h in dv["huecos"])
    check("gargantas de riser alternadas por hueco", ok_garg)
    check("punta del stub libra la corona superior (>=1 mm)",
          (paso / 2 - 29.0) - dv["eje_y_rel"][1] >= 1.0)
    check("bloque de desvío libra el eje inferior (>=1 mm)",
          (paso / 2 - 12.7 / math.sqrt(3)) + dv["bloque"]["y_rel"][0] >= 1.0)
    check("travesaño pasa bajo el vuelo de las coronas",
          dv["travesano"]["z"][1] <= om["z_eje"] - 29.0 - 2.0)

    # --- motores colgados ----------------------------------------------------
    ma, mb = to["motor"], d["tren_desvio"]["motor"]
    check("motores bajo el fondo (cuerpo Ø118 entero a z<0)",
          ma["z"] + 59 < 0 and mb["z"] + 59 < 0)
    check("patrón del motor A dentro del largo del módulo",
          ma["y"] + 76.35 + 4 < f["largo"])
    check("anillo del motor B tras el cubo de la chumacera A (55 real)",
          mb["plano_anillo"] - 2.38 > 58.0)

    # --- construcción + verificación -----------------------------------------
    piezas, unicos, planos2d = MT.construir_modulo(d)
    verif = MT.verificar_modulo(d, piezas, unicos)
    for clave in ("encaje_bf", "tangencia", "anillos", "apoyo_caja_250",
                  "holguras", "interferencias_aabb"):
        check(f"verificación {clave}: {verif[clave]['verdicto']}",
              verif[clave]["verdicto"] == "PASA")
    check("verificación global PASA", verif["verdicto_global"] == "PASA")
    check("todas las holguras >= 1 mm",
          all(v >= 1.0 for v in verif["holguras"]["mm"].values()))
    check(f"envolvente mínima de anillo "
          f"{verif['anillos']['envolvente_min']}° >= 120 (gate NBT90)",
          verif["anillos"]["envolvente_min"] >= 120)
    check("19 lazos de o-ring (3 links + 2 motores + 14 del desvío)",
          verif["anillos"]["n_anillos"] == 19
          and len(d["desvio"]["lazos_mm"]) == 19)
    check(f"apoyo caja 250: {verif['apoyo_caja_250']['min_ruedas_avance']} av / "
          f"{verif['apoyo_caja_250']['min_ruedas_desvio']} desvío",
          verif["apoyo_caja_250"]["min_ruedas_avance"] >= 4
          and verif["apoyo_caja_250"]["min_ruedas_desvio"] >= 3
          and verif["apoyo_caja_250"]["min_huecos_desvio"] >= 2)

    # envolvente insertable: solo los motores colgados sobresalen, por abajo
    lo = np.min([m.bounds[0] for _, m, _ in piezas], axis=0)
    hi = np.max([m.bounds[1] for _, m, _ in piezas], axis=0)
    check("nada sobre la tangente y nada bajo z=-160 (placas de motor)",
          hi[2] <= f["tangente"] + 0.1 and lo[2] >= -160.01)
    check(f"ancho real {hi[0] - lo[0]:.1f} = ancho total {f['ancho_total']:g}",
          abs((hi[0] - lo[0]) - f["ancho_total"]) < 0.5)
    sobre_cero = [n for n, m, _ in piezas if m.bounds[0][2] < -0.01
                  and not (n.startswith(("motor_", "placa_motor", "bancada",
                                         "oring_motor", "polea_motor")))]
    check("solo el grupo de motores vive bajo el fondo", not sobre_cero)

    # piezas y perfiles completos
    check("todas las FABRICADAS tienen malla única",
          all(n in unicos for n in MT.FABRICADAS))
    check("perfiles 2D para corte de las placas",
          {"placa_extremo", "placa_motor_A", "placa_motor_B", "bancada_A",
           "bancada_B", "soporte_desvio", "tapa_superior",
           "soporte_eje"} <= set(planos2d))
    n_av = sum(1 for n, _, _ in piezas
               if n.startswith("rueda_") and not n.startswith("rueda_desvio"))
    n_de = sum(1 for n, _, _ in piezas if n.startswith("rueda_desvio"))
    check("22 ruedas de avance + 14 giradas 90°", n_av == 22 and n_de == 14)
    check("4 ejes de avance + 14 ejes cortos de desvío",
          sum(1 for n, _, _ in piezas if n.startswith("eje_omni_")) == 4 and
          sum(1 for n, _, _ in piezas if n.startswith("eje_desvio_")) == 14)
    check("3 travesaños, 14 bloques y 14 poleas de desvío",
          sum(1 for n, _, _ in piezas if n.startswith("trav_")) == 3 and
          sum(1 for n, _, _ in piezas if n.startswith("soporte_desvio_")) == 14
          and sum(1 for n, _, _ in piezas if n.startswith("polea_desvio_")) == 14)
    check("7 collares del tren de avance",
          sum(1 for n, _, _ in piezas if n.startswith("collar_")) == 7)
    check("2 motores UniDrive y 2 bancadas",
          sum(1 for n, _, _ in piezas if n.startswith("motor_")) == 2 and
          sum(1 for n, _, _ in piezas if n.startswith("bancada_")) == 2)
    check("19 o-rings instanciados",
          sum(1 for n, _, _ in piezas if n.startswith("oring")) == 19)

    fails = [n for n, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(fails)}/{len(CHECKS)} pruebas OK")
    if fails:
        sys.exit("FALLAN: " + ", ".join(fails))


if __name__ == "__main__":
    main()
