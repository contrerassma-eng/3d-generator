"""Pruebas del módulo de transferencia (pipeline/modulo_transfer.py).

Verifica los invariantes que hacen INSERTABLE y MONTABLE el módulo sin
ejecutar los renders/PDF (lentos): diseño, construcción y verificación
geométrica en memoria, más el constructor de lazos por tangentes.

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
    f, om, co = d["frame"], d["omnis"], d["correas"]

    # --- lazo de correa: el constructor por pistas ---------------------------
    env = MT.envolturas_lazo(co["circulos"], co["segs_hints"])
    check(f"envolvente motriz {env[3]}° >= 120 (gate NBT90)", env[3] >= 120)
    check(f"contraflexión del snub Ø{co['snub']['dia']:g} >= 50 (Habasit)",
          co["snub"]["dia"] >= 50)
    pts = MT.trayectoria_correa(co["circulos"], co["segs_hints"], n_arc=60)
    zs = [q[1] for q in pts]
    check(f"lomo de correa = tangente ({max(zs):.2f} vs {f['tangente']:g})",
          abs(max(zs) + co["espesor_banda"] / 2 - f["tangente"]) < 0.01)
    check(f"el lazo no toca el fondo (z mín {min(zs):.1f})", min(zs) > 5)
    # el ramal superior es plano: muchos puntos a la misma z máxima
    planos = sum(1 for q in pts if abs(q[1] - max(zs)) < 0.01)
    check(f"ramal superior plano ({planos} puntos a z máx)", planos >= 2)

    # --- alturas y encaje ----------------------------------------------------
    check("tangente rasante con la pestaña superior",
          f["tangente"] == d["parametros"]["alto"] + d["parametros"]["resalte"])
    check(f"encaje BF: {f['ancho_total']:g} + 2x3 = {d['parametros']['bf']:g}",
          abs(f["ancho_total"] + 2 * d["parametros"]["holgura_bf"]
              - d["parametros"]["bf"]) < 1e-6)
    check("aritmética del terminal (132.1 + 30 + 3 = tangente)",
          abs(co["z_eje_terminales"] + 30 + 3 - f["tangente"]) < 1e-6)

    # --- planta --------------------------------------------------------------
    check(f"hueco entre coronas {d['parametros']['paso'] - 58:g} >= banda + 10",
          d["parametros"]["paso"] - 58 >= co["banda"] + 10)
    borde = co["ys"][0] - co["casete"]["sep_placas"] / 2 - f["espesor"]
    check(f"casete no toca la rueda vecina ({borde - (om['ejes_y'][0] + 29):.1f} mm)",
          borde - (om["ejes_y"][0] + 29.0) >= 2.0)
    xs_r = [x for x, _ in om["ruedas_xy"]]
    check("ruedas dentro de la zona (no invaden tren ni bloques)",
          min(xs_r) - 12.05 >= 20.0 and max(xs_r) + 12.05 <= f["pantalla_x"] - 4)

    # --- construcción + verificación -----------------------------------------
    piezas, unicos, planos2d = MT.construir_modulo(d)
    verif = MT.verificar_modulo(d, piezas, unicos)
    for clave in ("encaje_bf", "tangencia", "lazo_correa", "apoyo_caja_250",
                  "holguras", "interferencias_aabb"):
        check(f"verificación {clave}: {verif[clave]['verdicto']}",
              verif[clave]["verdicto"] == "PASA")
    check("verificación global PASA", verif["verdicto_global"] == "PASA")
    check("todas las holguras >= 1 mm",
          all(v >= 1.0 for v in verif["holguras"]["mm"].values()))
    check(f"apoyo caja 250: {verif['apoyo_caja_250']['min_ruedas']} ruedas, "
          f"{verif['apoyo_caja_250']['min_correas']} correas",
          verif["apoyo_caja_250"]["min_ruedas"] >= 4
          and verif["apoyo_caja_250"]["min_correas"] >= 2)

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
          {"placa_extremo", "mampara_motores", "pantalla_tren", "placa_casete",
           "tapa_superior", "soporte_eje"} <= set(planos2d))
    check("18 ruedas y 4 ejes hex instanciados",
          sum(1 for n, _, _ in piezas if n.startswith("rueda_")) == 18 and
          sum(1 for n, _, _ in piezas if n.startswith("eje_omni_")) == 4)
    check("2 motores UniDrive en el conjunto",
          sum(1 for n, _, _ in piezas if n.startswith("motor_")) == 2)
    check("5 o-rings (4 encadenados + motor A... y el del motor B)",
          sum(1 for n, _, _ in piezas if n.startswith("oring")) == 5)

    fails = [n for n, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(fails)}/{len(CHECKS)} pruebas OK")
    if fails:
        sys.exit("FALLAN: " + ", ".join(fails))


if __name__ == "__main__":
    main()
