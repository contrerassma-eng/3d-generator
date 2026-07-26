"""Pruebas del dispensador canino (lib_solidos + gen_dispensador).

Comprueban la geometría que sostiene el mecanismo, sin depender de artefactos
ya generados: se construyen las piezas en memoria y se miden. No se prueba
aquí el gate G-DIS completo (eso lo hace pipeline/verifica_dispensador.py
sobre un proyecto real), sino los invariantes de las herramientas.

uso: python tests/test_dispensador.py
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "pipeline"))
import lib_solidos as S            # noqa: E402
import gen_dispensador as G        # noqa: E402

CHECKS = []


def check(nombre, cond, detalle=""):
    CHECKS.append((nombre, bool(cond), detalle))
    print(f"  {'OK  ' if cond else 'FALLA'} {nombre}{'  — ' + detalle if detalle and not cond else ''}")


def casi(a, b, tol=1e-6):
    return abs(a - b) <= tol


# ---------------------------------------------------------------------------
print("Engranaje recto de evolvente")
for m, z in ((2.0, 30), (2.5, 22), (1.5, 17)):
    g = S.engranaje(m, z, 10.0, dia_eje=8.0)
    d = S.datos_engranaje(m, z)
    r = np.linalg.norm(g.vertices[:, :2], axis=1)
    check(f"m={m} z={z}: malla cerrada", g.is_watertight)
    check(f"m={m} z={z}: Ø cabeza = m(z+2)",
          casi(2 * r.max(), d["dia_cabeza"], 0.02), f"medido {2 * r.max():.3f} vs {d['dia_cabeza']:.3f}")
    check(f"m={m} z={z}: Ø primitivo = m·z", casi(d["dia_primitivo"], m * z))
    # el radio de pie tiene que aparecer en el perfil (fuera del taladro del eje)
    fuera = r[r > 4.5]
    check(f"m={m} z={z}: Ø pie = m(z−2.5)",
          casi(2 * fuera.min(), d["dia_pie"], 0.02), f"medido {2 * fuera.min():.3f} vs {d['dia_pie']:.3f}")
    # simetría angular: z dientes ⇒ el perfil se repite cada 360/z grados
    ang = np.degrees(np.arctan2(g.vertices[:, 1], g.vertices[:, 0])) % (360.0 / z)
    check(f"m={m} z={z}: {z} dientes repartidos", ang.max() <= 360.0 / z + 1e-6)

backlash = 0.4
g0 = S.perfil_engranaje(2.0, 30, backlash=0.0)
g1 = S.perfil_engranaje(2.0, 30, backlash=backlash)
check("el backlash adelgaza el diente (no lo engorda)", g1.area < g0.area,
      f"área {g1.area:.1f} vs {g0.area:.1f}")

# ---------------------------------------------------------------------------
print("Cremallera")
for m, n in ((2.5, 8), (2.0, 12)):
    poly = S.perfil_cremallera(m, n, 6.0)
    x0, y0, x1, y1 = poly.bounds
    check(f"m={m}: largo = n·π·m", casi(x1 - x0, n * math.pi * m, 1e-6),
          f"medido {x1 - x0:.3f} vs {n * math.pi * m:.3f}")
    check(f"m={m}: cabeza del diente en +m sobre la primitiva", casi(y1, m, 1e-9))
    check(f"m={m}: cuerpo bajo la primitiva", casi(y0, -6.0, 1e-9))
    check(f"m={m}: contorno válido", poly.is_valid and poly.area > 0)

# el flanco recto de la cremallera debe estar al ángulo de presión
poly = S.perfil_cremallera(2.5, 4, 5.0, alfa_deg=20.0)
xs = np.asarray(poly.exterior.coords)
# tomar un flanco: dos puntos consecutivos que suben de −hf a +ha
subidas = [(a, b) for a, b in zip(xs[:-1], xs[1:]) if b[1] > a[1] + 1e-9 and b[0] > a[0]]
if subidas:
    a, b = subidas[0]
    alfa = math.degrees(math.atan2(b[0] - a[0], b[1] - a[1]))
    check("flanco de la cremallera a 20° del ángulo de presión", casi(alfa, 20.0, 0.01),
          f"medido {alfa:.3f}°")

# ---------------------------------------------------------------------------
print("Primitivas de sólido")
t = S.tronco_cono_hueco(60, 120, 80, 3)
check("revolución con perfil en sentido horario: volumen positivo", t.volume > 0 and t.is_watertight)
lo = S.loft([(-10, -10), (10, -10), (10, 10), (-10, 10)],
            [(-20, -20), (20, -20), (20, 20), (-20, 20)], 0.0, 10.0)
check("loft entre dos rectángulos: sólido cerrado", lo.is_watertight and lo.volume > 0)
check("loft: volumen = tronco de pirámide", casi(lo.volume, 10 / 3 * (400 + 1600 + math.sqrt(400 * 1600)), 1.0),
      f"medido {lo.volume:.1f}")
hx = S.hexagono(12.0)
check("hexágono definido por la distancia entre caras", casi(hx.bounds[3] - hx.bounds[1], 12.0, 1e-9))

# ---------------------------------------------------------------------------
print("Cálculos del dispensador")
P = json.loads((REPO / "projects" / "YT0101-dispensador-canino" / "input" / "params.json")
               .read_text(encoding="utf-8"))
C = G.calculos(P)
al, do = P["alimento"], P["dosificador"]

vol_ml = do["cavidad_x"] * do["cavidad_y"] * C["cavidad_z"] / 1000.0
check("volumen de cavidad coherente con sus cotas", casi(vol_ml, C["volumen_cavidad_ml"], 0.05))
check("la dosis sale del volumen por densidad y llenado",
      casi(C["dosis_g"], C["volumen_cavidad_ml"] * al["factor_llenado"] * al["densidad_aparente_g_ml"], 0.05))
check("la dosis alcanza el objetivo pedido",
      abs(C["dosis_g"] - al["dosis_objetivo_g"]) / al["dosis_objetivo_g"] <= 0.15,
      f"{C['dosis_g']} vs {al['dosis_objetivo_g']}")
check("la cavidad tiene al menos dos croquetas de fondo",
      C["cavidad_z"] >= do["cavidad_z_min_croquetas"] * al["croqueta_dia_mm"] - 1e-9)
check("carrera = cavidad + tabique de sello",
      casi(C["carrera"], do["cavidad_y"] + do["sello_tabique"], 1e-9))
check("el barrido de palanca produce exactamente la carrera",
      casi(math.pi * C["pinon"]["dia_primitivo"] * C["palanca_barrido_deg"] / 360.0, C["carrera"], 0.05))
check("el piñón queda tangente a la línea primitiva de la cremallera",
      casi(C["x_pinon"] - C["x_linea_primitiva"], C["pinon"]["dia_primitivo"] / 2.0, 1e-6))
check("la cremallera es más larga que la carrera", C["cremallera_largo"] > C["carrera"] + 5)

# la cremallera tiene que quedar bajo el piñón en los dos extremos del recorrido
c0 = C["y_cremallera_local"] + C["y_desplazamiento_cajon"]
check("cremallera engranada con el cajón cargado",
      c0 - C["cremallera_largo"] / 2 <= 0 <= c0 + C["cremallera_largo"] / 2)
check("cremallera engranada con el cajón afuera",
      c0 + C["carrera"] - C["cremallera_largo"] / 2 <= 0 <= c0 + C["carrera"] + C["cremallera_largo"] / 2)

check("la falda obturadora cubre la carrera", C["falda_obturadora"] > C["carrera"])
check("el nivel del bebedero coincide con el borde de las ventanas",
      casi(C["z_difusor"] + 5.0, P["agua"]["nivel_agua"], 1e-9))
check("el bajante llega del cuello al plato",
      C["bajante_largo"] > 0 and C["z_bajante_inf"] < C["z_labio_agua"])
check("criterio anti-arco evaluado en las dos secciones",
      {"cumple_tolva", "cumple_cuello"} <= set(C["anti_arco"]))
check("el cuello del bidón se declara como sección crítica (no se oculta)",
      C["anti_arco"]["agitador_obligatorio"] == (not C["anti_arco"]["cumple_cuello"]))

# ---------------------------------------------------------------------------
print("Piezas (muestra)")
for nombre in ("ali_pinon", "ali_inserto_dosis", "est_collar_cuello", "agua_difusor"):
    mesh, color, meta = G.PIEZAS[nombre](P, C)
    check(f"{nombre}: sólido cerrado", mesh.is_watertight and mesh.volume > 0)
    d = sorted((mesh.bounds[1] - mesh.bounds[0]).tolist(), reverse=True)
    check(f"{nombre}: cabe en la cama",
          all(a <= b for a, b in zip(d, sorted(P["impresion"]["cama_mm"], reverse=True))),
          f"{[round(x, 1) for x in d]}")
    check(f"{nombre}: lleva nota de montaje", bool(meta.get("nota")))

pin = G.PIEZAS["ali_pinon"](P, C)[0]
hex_r = S.hexagono(do["eje_pinon_entrecaras"] + 0.35).bounds
dentro = pin.contains(np.array([[0, 0, 0]]))
check("el piñón tiene el hexágono del eje pasante", not bool(dentro[0]))
del hex_r

# ---------------------------------------------------------------------------
fallas = [n for n, ok, _ in CHECKS if not ok]
print(f"\n{len(CHECKS) - len(fallas)}/{len(CHECKS)} pruebas OK")
if fallas:
    print("FALLAN:")
    for f in fallas:
        print(f"  - {f}")
sys.exit(1 if fallas else 0)
