"""Pruebas del motor DEM.

No comprueban que el aparato funcione (para eso está el gate G-SIM): comprueban
que el MOTOR hace física. Un integrador que se ve bien en una animación puede
estar equivocado en la restitución, en el solape o en la fricción estática, y
entonces todo lo que se mida con él es decorado.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
import trimesh

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "pipeline"))
import lib_dem as D           # noqa: E402
import sim_granos as SG       # noqa: E402
import json                   # noqa: E402

OK, FALLOS = 0, []


def comprueba(cond: bool, titulo: str, detalle: str = "") -> None:
    global OK
    if cond:
        OK += 1
        print(f"  OK   {titulo}")
    else:
        FALLOS.append(f"{titulo} — {detalle}")
        print(f"  FALLA {titulo} — {detalle}")


P = json.loads((RAIZ / "projects/YT0101-dispensador-canino/input/params.json").read_text())
MAT = D.Material(rho=540.0, k_n=1.0e4, e_rest=0.4, mu_pp=0.5, mu_pw=0.5, mu_rod=0.0)
D_G = 0.012


# --- geometría analítica ---------------------------------------------------
print("\n[geometría]")
pl = D.CuerpoPlano("suelo", 0.0)
d, n = pl.contacto(np.array([[0.0, 0.0, 0.03]]), 0.0)
comprueba(abs(d[0] - 0.03) < 1e-12 and abs(n[0, 2] - 1.0) < 1e-12,
          "plano: distancia y normal", f"d={d[0]}")

inc = D.CuerpoPlano("rampa", 0.0, normal=(math.sin(math.radians(20)), 0.0,
                                          math.cos(math.radians(20))))
d, _ = inc.contacto(np.array([[0.0, 0.0, 1.0]]), 0.0)
comprueba(abs(d[0] - math.cos(math.radians(20))) < 1e-12,
          "plano inclinado: distancia perpendicular", f"d={d[0]}")

tubo = D.CuerpoTubo("tubo", 0.05, 0.0, 1.0)
d, n = tubo.contacto(np.array([[0.03, 0.0, 0.5]]), 0.0)
comprueba(abs(d[0] - 0.02) < 1e-12 and abs(n[0, 0] + 1.0) < 1e-12,
          "tubo: distancia a la pared y normal hacia el eje", f"d={d[0]} n={n[0]}")

cono = D.CuerpoCono("cono", 0.02, 0.0, 0.06, 0.10)
d, _ = cono.contacto(np.array([[0.0, 0.0, 0.05]]), 0.0)
esperado = 0.04 / math.hypot(1.0, 0.4)
comprueba(abs(d[0] - esperado) < 1e-9, "cono: distancia perpendicular a la generatriz",
          f"d={d[0]} esperado={esperado}")


# --- campo de distancia sobre malla ----------------------------------------
print("\n[campo sobre malla]")
esfera = trimesh.creation.icosphere(subdivisions=3, radius=30.0)
campo = D.campo_de_malla(esfera, 1.25, 15.0)
pts = np.array([[0.0, 0.0, 0.0], [0.040, 0.0, 0.0], [0.0, 0.050, 0.0]])
d, g = campo.distancia(pts)
comprueba(abs(d[0] + 0.030) < 1.5e-3, "SDF: centro de la esfera a −R", f"d={d[0]:.5f}")
comprueba(abs(d[1] - 0.010) < 1.5e-3, "SDF: 10 mm fuera de la esfera", f"d={d[1]:.5f}")
comprueba(abs(g[1, 0] - 1.0) < 0.05, "SDF: gradiente radial saliente", f"g={g[1]}")


# --- dinámica ---------------------------------------------------------------
print("\n[dinámica]")
libre = D.DEM(x=[[0.0, 0.0, 1.0]], r=[D_G / 2], mat=MAT, cuerpos=[], dt=1e-5)
for _ in range(20000):
    libre.paso()
caida = 1.0 - libre.x[0, 2]
comprueba(abs(caida - 0.5 * D.G_GRAV * 0.2 ** 2) < 1e-4,
          "caída libre sigue g·t²/2", f"caída={caida:.5f}")

est = D.DEM(x=[[0.0, 0.0, D_G / 2]], r=[D_G / 2], mat=MAT,
            cuerpos=[D.CuerpoPlano("suelo")], dt=2e-5)
for _ in range(20000):
    est.paso()
solape = D_G / 2 - est.x[0, 2]
comprueba(abs(solape - est.m[0] * D.G_GRAV / MAT.k_n) < 1e-7,
          "reposo estático: solape = mg/k", f"{solape * 1e6:.3f} µm")

e_obj = 0.45
par = D.calibrar_restitucion(e_obj, 540.0, 1.0e4, D_G, 2e-5)
e_med = D.restitucion_efectiva(540.0, 1.0e4, par, D_G, 2e-5)
comprueba(abs(e_med - e_obj) < 0.01, "la restitución se invierte al valor pedido",
          f"pedido {e_obj}, medido {e_med:.3f} con parámetro {par:.3f}")


# --- fricción estática: el resorte tangencial con historia ------------------
print("\n[fricción estática]")
mu = 0.5
ang_roz = math.degrees(math.atan(mu))


def desliza(grados: float) -> float:
    """Recorrido de un grano sobre una rampa, con el giro bloqueado.

    El giro se bloquea a propósito: una ESFERA rueda por cualquier pendiente
    aunque la fricción de deslizamiento la sujete, así que dejarla girar mediría
    la rodadura y no el resorte tangencial. Bloqueada, el umbral tiene que ser
    exactamente tan(θ) = μ.
    """
    a = math.radians(grados)
    n = np.array([math.sin(a), 0.0, math.cos(a)])
    normal = tuple(n)
    mat = D.Material(rho=540.0, k_n=1.0e4, e_rest=0.3, mu_pp=mu, mu_pw=mu, mu_rod=0.0)
    # Apoyado justo sobre el plano: a r·n del origen, no a z = r. Puesto a z = r
    # el grano nace clavado en la rampa y sale disparado, y lo que se mediría es
    # el vuelo, no el rozamiento.
    x0 = (D_G / 2 * n).reshape(1, 3)
    s = D.DEM(x=x0.copy(), r=[D_G / 2], mat=mat,
              cuerpos=[D.CuerpoPlano("rampa", 0.0, normal=normal)], dt=2e-5)
    for _ in range(30000):
        s.paso()
        s.w[:] = 0.0
    return float(np.linalg.norm(s.x[0] - x0[0]))


quieto = desliza(ang_roz - 8.0)
corre = desliza(ang_roz + 8.0)
comprueba(quieto < 1e-3, f"por debajo del ángulo de rozamiento ({ang_roz:.1f}°) no desliza",
          f"recorrió {quieto * 1000:.2f} mm")
comprueba(corre > 10 * max(quieto, 1e-6), "por encima del ángulo de rozamiento sí desliza",
          f"recorrió {corre * 1000:.2f} mm")


# --- siembra e inflado ------------------------------------------------------
print("\n[siembra e inflado]")
rng = np.random.default_rng(3)
radio = 0.045
x = SG.sembrar_cilindro(radio, 0.0, 0.12, D_G, rng, d_margen=SG.techo_diametro(P))
r = SG.diametros(P, len(x), rng) / 2
comprueba(len(x) > 100, "la siembra produce un lecho utilizable", f"{len(x)} granos")

from scipy.spatial import cKDTree            # noqa: E402
# El lecho se siembra apretado y los granos nacen ENCOGIDOS (se inflan después):
# el solape que importa es el del tamaño inicial, no el del final.
s0 = D_G / (2 * float(r.max()))
r0 = r * s0
pares = np.array(list(cKDTree(x).query_pairs(2 * float(r0.max())))).reshape(-1, 2)
if len(pares):
    sol = (r0[pares[:, 0]] + r0[pares[:, 1]]) - np.linalg.norm(x[pares[:, 1]] - x[pares[:, 0]], axis=1)
    peor = float(sol.max())
else:
    peor = -1.0
comprueba(peor <= 1e-9, "ningún par nace solapado (al tamaño inicial del inflado)",
          f"solape máximo {peor * 1000:.3f} mm")

cuerpos = [D.CuerpoPlano("suelo"), D.CuerpoTubo("tubo", radio, 0.0, 0.5)]
peor_pared = max(float((r - c.contacto(x, 0.0)[0]).max()) for c in cuerpos)  # a tamaño FINAL
comprueba(peor_pared <= 0.0, "ningún grano nace atravesando la pared",
          f"penetración máxima {peor_pared * 1000:.3f} mm")

sim = D.DEM(x=x, r=r, mat=MAT, cuerpos=cuerpos, dt=3e-5)
SG.inflar(sim, s0=D_G / (2 * float(r.max())), t_crec=0.5)
comprueba(sim.fugas == 0, "el inflado no cuela ningún grano por la pared",
          f"{sim.fugas} contactos acotados")
comprueba(float(np.abs(sim.v).max()) < 1e-9, "el inflado termina en reposo",
          f"v_max={float(np.abs(sim.v).max()):.4f} m/s")

print(f"\n{OK}/{OK + len(FALLOS)} pruebas OK")
for f in FALLOS:
    print(f"  · {f}")
sys.exit(1 if FALLOS else 0)
