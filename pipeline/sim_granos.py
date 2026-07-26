"""Simulación de croqueta grano a grano (DEM) sobre la geometría real del YT0101.

La verificación G-DIS demuestra que el mecanismo no choca, que la cavidad tiene
el volumen que dice y que la boca cumple —o no— el criterio anti-arco. Lo que no
puede demostrar es lo que hace el ALIMENTO dentro. Eso queda como supuesto:

  · factor de llenado 0.90 de la cavidad (declarado, nunca medido)
  · el agitador «es obligatorio» porque el cuello no cumple Jenike (deducido)
  · que la croqueta se desvía en el bisel en vez de partirse (esperado)

Este módulo los pone a prueba soltando granos de verdad dentro de las mallas.

Método, en dos tiempos:

1. CALIBRAR. El modelo de grano se ajusta contra dos propiedades medidas y
   publicadas del alimento —el ángulo de reposo y la densidad aparente— usando
   geometría analítica exacta. La fricción de rodadura es el parámetro libre:
   es el sustituto habitual de la forma no esférica de la croqueta.

2. APLICAR. Con ese grano ya calibrado se simula el aparato completo: llenado,
   golpes de palanca, descarga, agitador movido por su biela real.

Nada de esto es una medición del aparato físico: es un modelo, capa `user`. Su
valor está en que las hipótesis del modelo son las publicadas y en que el
resultado se contrasta contra la calibración. La dosis definitiva se sigue
pesando con el alimento real (out/ENSAMBLE.md §5).

uso:
  python pipeline/sim_granos.py projects/<X> calibrar
  python pipeline/sim_granos.py projects/<X> dosificar [--golpes 3] [--sin-agitador]
  python pipeline/sim_granos.py projects/<X> todo [--anim]
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from functools import partial
from pathlib import Path

import numpy as np
import trimesh
from scipy.spatial import cKDTree

sys.path.insert(0, str(Path(__file__).parent))
import gen_dispensador as G
import ens_dispensador as E
import lib_dem as D
from lib_audit import audit, load_state, now_iso, project_dir, save_state, set_gate

PASO_VOXEL = 1.25          # mm; precisión de pared ≈ ±0.6 mm
MARGEN_VOXEL = 11.0        # mm; > radio del grano mayor


# ---------------------------------------------------------------------------
# Grano y material
# ---------------------------------------------------------------------------

def diametros(P: dict, n: int, rng, escala: float | None = None) -> np.ndarray:
    """Croqueta polidispersa alrededor del tamaño de diseño.

    La dispersión importa: una población monodispersa arquea distinto (los
    granos iguales se traban en capas ordenadas que no existen en el saco).
    """
    al = P["alimento"]
    dm = (escala if escala is not None else al["croqueta_dia_mm"]) * 1e-3
    lo, hi = (np.array(al["croqueta_rango_mm"]) * 1e-3).tolist()
    cv = P.get("dem", {}).get("cv_diametro", 0.12)
    d = rng.normal(dm, dm * cv, n)
    return np.clip(d, max(lo, dm * 0.55), min(hi, dm * 1.45))


def material(P: dict, dt: float, d_ref: float, mu_rod: float | None = None) -> D.Material:
    dem = P.get("dem", {})
    rho = dem.get("densidad_particula_kg_m3", 670.0)
    k_n = dem.get("rigidez_normal_N_m", 1.0e4)
    e_obj = dem.get("restitucion", 0.45)
    e_par = D.calibrar_restitucion(e_obj, rho, k_n, d_ref, dt)
    return D.Material(rho=rho, k_n=k_n, e_rest=e_par,
                      mu_pp=dem.get("friccion_grano_grano", 0.50),
                      mu_pw=dem.get("friccion_grano_pared", 0.45),
                      mu_rod=dem.get("friccion_rodadura", 0.10) if mu_rod is None else mu_rod)


def techo_diametro(P: dict, escala: float | None = None) -> float:
    """Diámetro más grande que `diametros` puede devolver.

    La siembra se espacia con ESTE valor, no con el nominal: dos granos grandes
    vecinos sembrados a un diámetro nominal nacen solapados, y un solape inicial
    es energía que el integrador no puede disipar (revienta la corrida).
    """
    al = P["alimento"]
    dm = (escala if escala is not None else al["croqueta_dia_mm"]) * 1e-3
    hi = al["croqueta_rango_mm"][1] * 1e-3
    return min(hi, dm * 1.45)


def sembrar_cilindro(radio: float, z0: float, z1: float, d_paso: float, rng,
                     d_margen: float | None = None,
                     centro: tuple[float, float] = (0.0, 0.0)) -> np.ndarray:
    """Rejilla hexagonal dentro de un cilindro (semilla, no empaquetado).

    Dos separaciones distintas, y confundirlas revienta la corrida:

      `d_paso`   separación ENTRE granos. Se siembra apretado y los granos
                 nacen encogidos (ver `inflar`), así que aquí va el diámetro
                 medio, no el mayor.
      `d_margen` holgura contra la PARED, que no se puede encoger: tiene que
                 ser el diámetro MAYOR de la población, porque un grano grande
                 sembrado a la medida del medio nace atravesando el muro.

    El empaquetamiento final lo decide la gravedad, no quien siembra: es
    justamente una de las cosas que hay que medir.
    """
    dm = d_margen if d_margen is not None else d_paso
    fila = d_paso * math.sqrt(3) / 2
    pts, nz = [], 0
    z = z0 + dm / 2
    while z < z1 - dm / 2 + 1e-12:
        for iy, yy in enumerate(np.arange(-radio, radio + 1e-9, fila)):
            dx = ((nz + iy) % 2) * d_paso / 2
            for xx in np.arange(-radio, radio + 1e-9, d_paso):
                if math.hypot(xx + dx, yy) < radio - dm * 0.55:
                    pts.append([xx + dx, yy, z])
        z += d_paso
        nz += 1
    a = np.array(pts, dtype=float).reshape(-1, 3)
    a[:, 0] += centro[0]
    a[:, 1] += centro[1]
    return a + rng.normal(0.0, d_paso * 0.005, a.shape)


def inflar(sim: D.DEM, s0: float, t_crec: float = 0.9, arrastre: float = 25.0) -> None:
    """Crece los granos de s0 a su tamaño final mientras caen y se reacomodan.

    Sembrar holgado para no solapar deja un lecho demasiado suelto y pocos
    granos por litro; sembrar apretado revienta la corrida. Nacer pequeños y
    crecer resuelve las dos cosas y además el empaquetamiento final lo decide
    la gravedad, que es lo que se quiere medir.
    """
    n = max(int(t_crec / sim.dt), 1)
    previo = sim.arrastre
    sim.arrastre = arrastre
    for k in range(n):
        sim.escalar_radios(s0 + (1.0 - s0) * (k + 1) / n)
        sim.paso()
    sim.escalar_radios(1.0)
    for _ in range(max(int(0.15 / sim.dt), 1)):      # relajar ya a tamaño final
        sim.paso()
    sim.arrastre = previo
    sim.v[:] = 0.0
    sim.w[:] = 0.0


def reposar(sim: D.DEM, t_max: float, umbral: float = 2e-5, cada: int = 400) -> float:
    """Integra hasta que el lecho se queda quieto (energía cinética específica)."""
    n = int(t_max / sim.dt)
    for k in range(n):
        sim.paso()
        if k % cada == 0 and k > cada:
            if sim.energia_cinetica() / (sim.masa_total * D.G_GRAV * 0.01) < umbral:
                break
    return sim.t


# ---------------------------------------------------------------------------
# 1. Calibración contra propiedades publicadas
# ---------------------------------------------------------------------------

def ensayo_reposo(P: dict, mu_rod: float, semilla: int = 20260726,
                  radio: float = 0.045, alto: float = 0.17) -> dict:
    """Ángulo de reposo por retirada de cilindro (el ensayo de la literatura).

    Se llena un cilindro, se levanta despacio y se mide la pendiente del talud
    que queda. Geometría analítica: aquí no se está midiendo el aparato.
    """
    rng = np.random.default_rng(semilla)
    d_med = P["alimento"]["croqueta_dia_mm"] * 1e-3
    x = sembrar_cilindro(radio, 0.0, alto, d_med, rng, d_margen=techo_diametro(P))
    r = diametros(P, len(x), rng) / 2
    dt = P.get("dem", {}).get("dt_s", 3e-5)
    mat = material(P, dt, float(2 * r.mean()), mu_rod=mu_rod)
    v_alza = 0.05
    # El reloj del cuerpo arranca en negativo: el tubo no se mueve hasta t=0, y
    # a t=0 se llega solo cuando el lecho YA está quieto. Levantarlo sobre un
    # lecho todavía en movimiento mediría la caída, no el ángulo de reposo.
    tubo = D.CuerpoTubo("tubo", radio, 0.0, alto + 0.40,
                        alza=lambda t: max(0.0, t) * v_alza)
    sim = D.DEM(x=x, r=r, mat=mat, cuerpos=[D.CuerpoPlano("suelo"), tubo],
                dt=dt, semilla=semilla)
    sim.t = -100.0                          # tubo fijo mientras se asienta
    inflar(sim, s0=d_med / (2 * float(r.max())))
    reposar(sim, 2.0)
    sim.t = 0.0
    alto_lecho = float(sim.x[:, 2].max()) + float(sim.r.max())
    for _ in range(int((alto_lecho / v_alza + 0.4) / dt)):   # liberar el talud
        sim.paso()
    reposar(sim, 2.0)

    # perfil de la superficie libre: máxima cota por anillo radial
    rho = np.hypot(sim.x[:, 0], sim.x[:, 1])
    borde = rho.max()
    bins = np.linspace(0.0, borde, 13)
    rc, zc = [], []
    for a, b in zip(bins[:-1], bins[1:]):
        m = (rho >= a) & (rho < b)
        if m.sum() >= 3:
            rc.append(0.5 * (a + b))
            zc.append(float(np.percentile(sim.x[m, 2], 90)))
    rc, zc = np.array(rc), np.array(zc)
    # ajustar el flanco: del máximo hacia fuera, ignorando la meseta central
    if len(rc) >= 4:
        i0 = int(np.argmax(zc))
        flanco = slice(max(i0, 1), len(rc))
        pend = np.polyfit(rc[flanco], zc[flanco], 1)[0] if flanco.stop - flanco.start >= 2 else 0.0
    else:
        pend = 0.0
    return {"mu_rodadura": mu_rod,
            "angulo_reposo_deg": round(math.degrees(math.atan(abs(pend))), 2),
            "particulas": int(len(sim.x)),
            "radio_talud_mm": round(borde * 1000, 1),
            "altura_talud_mm": round(float(zc.max() * 1000) if len(zc) else 0.0, 1)}


def ensayo_densidad(P: dict, mu_rod: float, semilla: int = 20260726,
                    radio: float = 0.045, alto: float = 0.13) -> dict:
    """Densidad aparente: se vierte en un recipiente y se pesa lo que cabe.

    Es la contraprueba del modelo. La densidad aparente de la croqueta está
    citada (0.40 g/ml) y NO es un parámetro de entrada: sale del tamaño de
    grano, de la densidad de partícula y del empaquetamiento que consiga la
    gravedad. Si el modelo la reproduce, el grano está bien planteado.
    """
    rng = np.random.default_rng(semilla + 1)
    x = sembrar_cilindro(radio, 0.005, alto * 2.0, techo_diametro(P), rng)
    r = diametros(P, len(x), rng) / 2
    dt = P.get("dem", {}).get("dt_s", 3e-5)
    mat = material(P, dt, float(2 * r.mean()), mu_rod=mu_rod)
    sim = D.DEM(x=x, r=r, mat=mat,
                cuerpos=[D.CuerpoPlano("suelo"), D.CuerpoTubo("vaso", radio, 0.0, alto * 3)],
                dt=dt, semilla=semilla)
    reposar(sim, 2.5)
    # enrasar a una altura donde el lecho ya es homogéneo (lejos del suelo y de
    # la superficie libre, que están perturbados por la pared y por el vertido)
    z_lo, z_hi = 0.02, 0.02 + 0.05
    dentro = (sim.x[:, 2] >= z_lo) & (sim.x[:, 2] < z_hi)
    v_solido = float((4.0 / 3.0 * math.pi * sim.r[dentro] ** 3).sum())
    v_caja = math.pi * radio ** 2 * (z_hi - z_lo)
    phi = v_solido / v_caja
    return {"mu_rodadura": mu_rod,
            "fraccion_empaquetamiento": round(phi, 4),
            "densidad_aparente_g_ml": round(phi * mat.rho / 1000.0, 4),
            "particulas_en_control": int(dentro.sum())}


def _reposo_para(P: dict, mu: float) -> dict:
    """Punto del barrido, aislado para poder repartirlo entre procesos."""
    return ensayo_reposo(P, mu)


def calibrar(P: dict, valores: list[float], hechos: dict) -> dict:
    """Barrido de fricción de rodadura contra el ángulo de reposo publicado."""
    obj = P.get("dem", {}).get("angulo_reposo_objetivo_deg")
    rango = P.get("dem", {}).get("angulo_reposo_rango_deg", [25.7, 38.7])
    # Cada punto del barrido es independiente: van en paralelo, uno por núcleo.
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=min(len(valores), os.cpu_count() or 1)) as pool:
        curva = list(pool.map(partial(_reposo_para, P), valores))
    for rep in curva:
        print(f"   mu_rod {rep['mu_rodadura']:5.3f} -> reposo "
              f"{rep['angulo_reposo_deg']:5.2f}°  ({rep['particulas']} granos)", flush=True)
    print(f"   barrido en {time.time() - t0:.0f}s", flush=True)
    if obj is None:
        obj = 0.5 * (rango[0] + rango[1])
    # Se elige la MENOR rodadura que ya cae dentro del rango publicado, no la
    # que más se acerca al centro: la rodadura es un artificio para tapar que el
    # grano no es una esfera, y cuanto menos artificio haga falta, mejor. Si
    # ninguna llega al rango, se coge la más cercana y la prueba S2 avisa.
    dentro = [c for c in curva if rango[0] <= c["angulo_reposo_deg"] <= rango[1]]
    elegido = (min(dentro, key=lambda c: c["mu_rodadura"]) if dentro
               else min(curva, key=lambda c: abs(c["angulo_reposo_deg"] - obj)))
    dens = ensayo_densidad(P, elegido["mu_rodadura"])
    return {"objetivo_deg": obj, "rango_publicado_deg": rango, "curva": curva,
            "elegido": elegido, "densidad": dens,
            "densidad_citada_g_ml": P["alimento"]["densidad_aparente_g_ml"]}


# ---------------------------------------------------------------------------
# 2. El aparato: mundo, cinemática y golpes
# ---------------------------------------------------------------------------

def mundo_alimento(P: dict, C: dict, piezas: dict, cache: Path, con_agitador: bool = True):
    """Cuerpos del cabezal de alimento en posición de trabajo.

    Las piezas entran como SDF de su MALLA real; el cuello y el hombro del
    envase entran como primitivas analíticas (el bidón no es una pieza del
    proyecto: es el envase, y su interior sólo se conoce por sus cotas).
    """
    mm = 1e-3
    do = P["dosificador"]
    fijas = {
        "ali_canal_base": (piezas["ali_canal_base"], (0, 0, C["z_canal_base"])),
        "ali_canal_tapa": (piezas["ali_canal_tapa"], (0, 0, C["z_tapa_inf"])),
        "ali_adaptador_cuello": (piezas["ali_adaptador_cuello"], (0, C["y_carga"], C["z_tapa_sup"])),
        "ali_chute": (piezas["ali_chute"], (0, C["y_descarga"], C["z_canal_base"])),
    }
    cuerpos = []
    for nombre, (malla, at) in fijas.items():
        campo = D.campo_de_malla(E._t(malla, at=at), PASO_VOXEL, MARGEN_VOXEL,
                                 cache=cache, etiqueta=nombre)
        cuerpos.append(D.Cuerpo(nombre=nombre, campo=campo))

    # --- envase: cuello recto, hombro cónico y cuerpo -----------------------
    r_cuello = C["anti_arco"]["seccion_critica_cuello_mm"] / 2 * mm
    z_boca = (C["z_tapa_sup"] + 100.0) * mm                 # tope del adaptador
    h_cuello = P["bidon"]["altura_cuello"] * mm
    r_cuerpo = 0.5 * P["bidon"]["dia_cuerpo"] * mm * 0.42   # tramo simulado del hombro
    z_hombro = z_boca + h_cuello
    z_cono = z_hombro + 0.055
    # Columna simulada por encima del hombro. No hace falta el bidón entero:
    # por Janssen la pared se come el peso y la tensión sobre la boca satura a
    # unos pocos diámetros de columna. Se simula esa altura, no 500 mm de agua
    # que no cambiarían el resultado y sí el tiempo de cálculo.
    h_cuerpo = P.get("dem", {}).get("altura_columna_simulada_mm", 130.0) * mm
    z_tope = z_cono + h_cuerpo
    # OJO: el eje del envase es el de la TOLVA (y = y_carga), no el del mundo.
    # El adaptador de cuello va montado desplazado sobre la boca de carga, así
    # que un bidón centrado en el origen quedaría descolgado 29 mm del agujero
    # por el que tiene que caer la croqueta.
    eje = (0.0, C["y_carga"] * mm)
    cuerpos += [
        D.CuerpoTubo("bidon_cuello", r_cuello, z_boca - 0.004, z_hombro, centro=eje),
        D.CuerpoCono("bidon_hombro", r_cuello, z_hombro, r_cuerpo, z_cono, centro=eje),
        D.CuerpoTubo("bidon_cuerpo", r_cuerpo, z_cono, z_tope + 0.22, centro=eje),
    ]

    # --- cajón: traslación pura a lo largo de Y ----------------------------
    y0 = (C["y_carga"] - C["y_cavidad_local"]) * mm
    z_desl = C["z_deslizamiento"] * mm
    campo_cajon = D.campo_de_malla(piezas["ali_corredera"], PASO_VOXEL, MARGEN_VOXEL,
                                   cache=cache, etiqueta="ali_corredera")

    estado = {"avance": 0.0, "vel": 0.0, "theta": 0.0, "omega": 0.0}

    def pose_cajon(t):
        return np.eye(3), np.array([0.0, y0 + estado["avance"], z_desl])

    def cinema_cajon(t):
        return np.array([0.0, estado["vel"], 0.0]), np.zeros(3)

    cuerpos.append(D.Cuerpo("ali_corredera", campo_cajon, pose_cajon, cinema_cajon))

    # --- agitador: giro alrededor de X, movido por la biela del cajón -------
    if con_agitador:
        campo_ag = D.campo_de_malla(piezas["ali_agitador"], PASO_VOXEL, MARGEN_VOXEL,
                                    cache=cache, etiqueta="ali_agitador")
        centro = np.array([0.0, C["y_carga"] * mm, C["z_agitador"] * mm])

        def pose_ag(t):
            a = estado["theta"]
            c, s = math.cos(a), math.sin(a)
            return np.array([[1, 0, 0], [0, c, -s], [0, s, c]]), centro

        def cinema_ag(t):
            return np.zeros(3), np.array([estado["omega"], 0.0, 0.0])

        cuerpos.append(D.Cuerpo("ali_agitador", campo_ag, pose_ag, cinema_ag))

    info = {"eje": eje,
            "z_salida": (C["z_canal_base"] - 95.0) * mm,
            "z_tope_relleno": z_tope,
            "r_relleno": r_cuerpo,
            "z_relleno0": z_cono + 0.002,
            "cavidad": {"x": do["cavidad_x"] * mm, "y": do["cavidad_y"] * mm,
                        "z0": z_desl, "z1": z_desl + C["cavidad_z"] * mm,
                        "y_carga": C["y_carga"] * mm},
            "carrera": C["carrera"] * mm}
    return cuerpos, estado, info


def perfil_golpe(t: float, t_ida: float, t_espera: float, carrera: float):
    """Avance y velocidad del cajón para un ciclo de palanca (ida-vuelta suave).

    Arranque y frenado suaves: una rampa lineal daría un tirón infinito al
    invertir, y el tirón es justo lo que cambiaría el llenado.
    """
    ciclo = 2 * (t_ida + t_espera)
    u = t % ciclo
    if u < t_ida:
        s = u / t_ida
        return carrera * (0.5 - 0.5 * math.cos(math.pi * s)), \
            carrera * (math.pi / (2 * t_ida)) * math.sin(math.pi * s)
    u -= t_ida
    if u < t_espera:
        return carrera, 0.0
    u -= t_espera
    if u < t_ida:
        s = u / t_ida
        return carrera * (0.5 + 0.5 * math.cos(math.pi * s)), \
            -carrera * (math.pi / (2 * t_ida)) * math.sin(math.pi * s)
    return 0.0, 0.0


def _huecos_libres(sim: D.DEM, info: dict, d_max: float, cuantos: int, rng) -> np.ndarray:
    """Sitios vacíos en lo alto del depósito para devolver los granos que salieron.

    Hay que buscar hueco, no repetir la retícula: dos tandas recicladas sobre
    los mismos puntos nacerían una encima de otra, y un solape así revienta la
    corrida justo cuando ya lleva media hora.
    """
    z0 = info["z_tope_relleno"] + 0.005
    sitios = sembrar_cilindro(info["r_relleno"] * 0.92, z0, z0 + 0.30, d_max, rng,
                              centro=info["eje"])
    if not len(sitios):
        sitios = np.array([[0.0, 0.0, z0]])
    libres = sitios[cKDTree(sim.x).query(sitios)[0] > d_max]
    if len(libres) < cuantos:                       # apilar por encima de todo
        falta = cuantos - len(libres)
        alto = float(sim.x[:, 2].max()) + d_max
        extra = np.column_stack([
            info["eje"][0] + rng.uniform(-1, 1, falta) * info["r_relleno"] * 0.5,
            info["eje"][1] + rng.uniform(-1, 1, falta) * info["r_relleno"] * 0.5,
            alto + np.arange(falta) * d_max * 1.2])
        libres = np.vstack([libres, extra]) if len(libres) else extra
    rng.shuffle(libres)
    return libres[:cuantos]


def escenario_dosificar(P, C, piezas, cache, golpes=3, con_agitador=True,
                        d_croqueta=None, t_ida=1.1, t_espera=0.35,
                        semilla=20260726, mu_rod=None, traza=None) -> dict:
    """Llena el aparato, da N golpes de palanca y pesa lo que sale por golpe."""
    mm = 1e-3
    cuerpos, estado, info = mundo_alimento(P, C, piezas, cache, con_agitador)
    rng = np.random.default_rng(semilla)

    # Sembrado en tres tramos —cuerpo, cuello y canal—, apretado y con los
    # granos encogidos: se inflan después, para que el empaquetamiento inicial
    # lo decida la gravedad y no quien siembra.
    z_ini = (C["z_deslizamiento"] + 3.0) * mm
    d_med = (d_croqueta or P["alimento"]["croqueta_dia_mm"]) * mm
    d_top = techo_diametro(P, d_croqueta)
    r_cuello = C["anti_arco"]["seccion_critica_cuello_mm"] / 2 * mm
    tramos = [(info["r_relleno"] * 0.98, info["z_relleno0"], info["z_tope_relleno"]),
              (r_cuello * 0.98, (C["z_tapa_sup"] + 102.0) * mm, info["z_relleno0"] - 0.004),
              (0.019, z_ini, (C["z_tapa_sup"] + 96.0) * mm)]
    x = np.vstack([sembrar_cilindro(rr, za, zb, d_med, rng, d_margen=d_top,
                                    centro=info["eje"])
                   for rr, za, zb in tramos])
    r = diametros(P, len(x), rng, escala=(d_croqueta or P["alimento"]["croqueta_dia_mm"])) / 2

    dt = P.get("dem", {}).get("dt_s", 3e-5)
    mat = material(P, dt, float(2 * r.mean()), mu_rod=mu_rod)
    sim = D.DEM(x=x, r=r, mat=mat, cuerpos=cuerpos, dt=dt, semilla=semilla)

    def sincronizar(t_golpe):
        av, vel = perfil_golpe(t_golpe, t_ida, t_espera, info["carrera"])
        estado["avance"], estado["vel"] = av, vel
        if con_agitador:
            th = math.radians(G.angulo_manivela(C, av / mm))
            estado["omega"] = (th - estado["theta"]) / dt
            estado["theta"] = th

    # --- asentado ----------------------------------------------------------
    sincronizar(0.0)
    estado["omega"] = 0.0
    inflar(sim, s0=d_med / (2 * float(r.max())))
    t_asiento = P.get("dem", {}).get("t_asentado_s", 1.6)
    for _ in range(int(t_asiento / dt)):
        sim.paso()
    sim.v[:] = 0.0
    sim.w[:] = 0.0
    sim.fn_max, sim.solape_max, sim.fugas = 0.0, 0.0, 0   # medir solo los golpes

    salidas, cuadros = [], []
    masa_fuera = 0.0
    n_reciclados = 0
    llenado = []
    ciclo = 2 * (t_ida + t_espera)
    pasos_golpe = int(ciclo / dt)
    cav = info["cavidad"]

    v_cavidad_m3 = cav["x"] * cav["y"] * (cav["z1"] - cav["z0"])

    def masa_en_cavidad(avance):
        """Lo que el cajón se lleva: los granos cuyo CENTRO está en la cavidad.

        Se devuelven masa y volumen sólido por separado a propósito. El factor
        de llenado del diseño es GEOMÉTRICO —qué fracción del hueco ocupa el
        lecho— y compararlo con una masa mezclaría dos cosas: cuánto entra y
        cuánto pesa lo que entró. La densidad aparente es justo el número que
        las dos fuentes citadas se contradicen.
        """
        yc = cav["y_carga"] + avance
        m = ((np.abs(sim.x[:, 0]) < cav["x"] / 2) &
             (np.abs(sim.x[:, 1] - yc) < cav["y"] / 2) &
             (sim.x[:, 2] > cav["z0"]) & (sim.x[:, 2] < cav["z1"]))
        v_solido = float((4.0 / 3.0 * math.pi * sim.r[m] ** 3).sum())
        return float(sim.m[m].sum()), int(m.sum()), v_solido

    mc0, nc0, vc0 = masa_en_cavidad(0.0)
    print(f"   [{'con' if con_agitador else 'sin'} agitador] {len(sim.x)} granos; "
          f"tras asentar la cavidad lleva {nc0} granos "
          f"({vc0 / v_cavidad_m3 * 100:.1f}% de su hueco)", flush=True)

    t0 = time.time()
    for g in range(golpes):
        masa_g = 0.0
        for k in range(pasos_golpe):
            t_golpe = k * dt
            sincronizar(t_golpe)
            sim.paso()
            if k == int(0.02 / dt):                 # justo antes de arrancar
                mc, nc, vc = masa_en_cavidad(0.0)
                llenado.append({"golpe": g + 1, "masa_g": round(mc * 1000, 2),
                                "granos": nc,
                                "fraccion_solida": round(vc / v_cavidad_m3, 4)})
            fuera = np.flatnonzero(sim.x[:, 2] < info["z_salida"])
            if len(fuera):
                masa_g += float(sim.m[fuera].sum())
                n_reciclados += len(fuera)
                sim.reciclar(fuera, _huecos_libres(sim, info, d_top, len(fuera), rng))
            if traza is not None and k % traza["cada"] == 0:
                cuadros.append({"t": round(g * ciclo + t_golpe, 4),
                                "avance_mm": round(estado["avance"] / mm, 2),
                                "x": sim.x.copy(), "r": sim.r.copy()})
        masa_fuera += masa_g
        salidas.append({"golpe": g + 1, "masa_g": round(masa_g * 1000, 2)})
        print(f"   [{'con' if con_agitador else 'sin'} agitador] golpe {g + 1}/{golpes}: "
              f"{masa_g * 1000:6.1f} g  ({time.time() - t0:.0f}s)", flush=True)

    dosis = np.array([s["masa_g"] for s in salidas])
    llen = np.array([l["masa_g"] for l in llenado])
    phi_cav = np.array([l["fraccion_solida"] for l in llenado])
    # Empaquetamiento del lecho libre en el depósito, para convertir la fracción
    # sólida de la cavidad en un factor de llenado comparable con el 0.90
    # declarado. La ventana se coloca POR DEBAJO DE LA SUPERFICIE REAL del lecho,
    # no a una altura fija: el material baja golpe a golpe, y una ventana fija
    # acaba midiendo aire y devolviendo un empaquetamiento ridículo (con él, el
    # factor de llenado salía 1.2 y 1.65, que no significan nada).
    rho_libre = np.hypot(sim.x[:, 0] - info["eje"][0], sim.x[:, 1] - info["eje"][1])
    en_deposito = rho_libre < info["r_relleno"] * 0.95
    phi_lecho = None
    if en_deposito.sum() > 40:
        z_sup = float(np.percentile(sim.x[en_deposito, 2], 95))
        banda = en_deposito & (sim.x[:, 2] < z_sup - 0.02) & (sim.x[:, 2] > z_sup - 0.08)
        if banda.sum() > 20:
            phi_lecho = float((4.0 / 3.0 * math.pi * sim.r[banda] ** 3).sum() /
                              (math.pi * (info["r_relleno"] * 0.95) ** 2 * 0.06))
    v_cav = C["volumen_cavidad_ml"]
    rho_ap = P["alimento"]["densidad_aparente_g_ml"]
    return {
        "golpes": golpes, "con_agitador": con_agitador,
        "croqueta_mm": d_croqueta or P["alimento"]["croqueta_dia_mm"],
        "particulas": int(len(sim.x)), "dt_s": dt,
        "t_ida_s": t_ida, "t_espera_s": t_espera,
        "descarga_por_golpe_g": salidas,
        "dosis_media_g": round(float(dosis.mean()), 2) if len(dosis) else 0.0,
        "dosis_desv_g": round(float(dosis.std(ddof=1)), 2) if len(dosis) > 1 else None,
        "masa_en_cavidad_g": llenado,
        "fraccion_solida_cavidad": round(float(phi_cav.mean()), 4) if len(phi_cav) else None,
        "empaquetamiento_lecho": round(phi_lecho, 4) if phi_lecho else None,
        "factor_llenado_medido": round(float(phi_cav.mean()) / phi_lecho, 3)
        if len(phi_cav) and phi_lecho else None,
        "factor_llenado_declarado": P["alimento"]["factor_llenado"],
        "masa_cavidad_media_g": round(float(llen.mean()), 2) if len(llen) else None,
        "masa_cavidad_si_densidad_citada_g": round(v_cav * rho_ap, 1),
        "granos_reciclados": n_reciclados,
        "fuerza_contacto_max_N": round(sim.fn_max, 2),
        "carga_rotura_croqueta_N": P.get("dem", {}).get("carga_rotura_croqueta_N"),
        "solape_max_pct_radio": round(100.0 * sim.solape_max, 2),
        "contactos_acotados": int(sim.fugas),
        "segundos": round(time.time() - t0, 1),
        "_cuadros": cuadros,
    }


# ---------------------------------------------------------------------------
# 3. Vista en corte: el aparato por dentro mientras dosifica
# ---------------------------------------------------------------------------

def _segmentos(malla, x0: float = 0.0):
    """Corte sagital de una malla: segmentos (y, z) en el plano x = x0."""
    try:
        seg = trimesh.intersections.mesh_plane(malla, plane_normal=[1, 0, 0],
                                               plane_origin=[x0, 0, 0])
    except Exception:
        return np.zeros((0, 2, 2))
    return np.asarray(seg)[:, :, 1:] if len(seg) else np.zeros((0, 2, 2))


def animacion_corte(P, C, piezas, cuadros, destino: Path, banda: float = 8.0) -> Path:
    """GIF del ciclo visto en corte: se ve la croqueta entrar, viajar y caer.

    Un corte por el plano de simetría dice más que cualquier vista 3D: se ve a
    la vez la tolva, la cavidad, el tabique que obtura y la boca de descarga.
    """
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.collections import LineCollection, EllipseCollection

    fijas = [E._t(piezas["ali_canal_base"], at=(0, 0, C["z_canal_base"])),
             E._t(piezas["ali_canal_tapa"], at=(0, 0, C["z_tapa_inf"])),
             E._t(piezas["ali_adaptador_cuello"], at=(0, C["y_carga"], C["z_tapa_sup"])),
             E._t(piezas["ali_chute"], at=(0, C["y_descarga"], C["z_canal_base"]))]
    seg_fijas = np.vstack([s for s in (_segmentos(m) for m in fijas) if len(s)])
    y0 = C["y_carga"] - C["y_cavidad_local"]

    destino.parent.mkdir(parents=True, exist_ok=True)
    tmp = destino.parent / "_cuadros_sim"
    tmp.mkdir(exist_ok=True)
    rutas = []
    for i, cu in enumerate(cuadros):
        fig, ax = plt.subplots(figsize=(5.4, 6.2), dpi=110)
        cajon = E._t(piezas["ali_corredera"], at=(0, y0 + cu["avance_mm"], C["z_deslizamiento"]))
        ax.add_collection(LineCollection(seg_fijas, colors="#37474f", linewidths=1.0))
        sc = _segmentos(cajon)
        if len(sc):
            ax.add_collection(LineCollection(sc, colors="#e65100", linewidths=1.4))
        cerca = np.abs(cu["x"][:, 0]) < banda * 1e-3
        pos = cu["x"][cerca] * 1e3
        rad = np.sqrt(np.maximum(cu["r"][cerca] ** 2 - cu["x"][cerca, 0] ** 2, 0.0)) * 2e3
        if len(pos):
            ax.add_collection(EllipseCollection(
                rad, rad, np.zeros(len(rad)), units="xy", offsets=pos[:, 1:],
                transOffset=ax.transData, facecolors="#8d6e63", edgecolors="#4e342e",
                linewidths=0.4, alpha=0.95))
        ax.set_xlim(-120, 120)
        ax.set_ylim(C["z_canal_base"] - 105, C["z_tapa_sup"] + 190)
        ax.set_aspect("equal")
        ax.axis("off")
        ax.set_title(f"t = {cu['t']:.2f} s     avance del cajón = {cu['avance_mm']:.0f} mm",
                     fontsize=9, color="#37474f")
        r = tmp / f"c{i:04d}.png"
        fig.savefig(r, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        rutas.append(r)

    try:
        import imageio.v2 as imageio
        imageio.mimsave(destino, [imageio.imread(r) for r in rutas], duration=0.09, loop=0)
    except ImportError:
        from PIL import Image
        ims = [Image.open(r).convert("P", palette=Image.ADAPTIVE) for r in rutas]
        ims[0].save(destino, save_all=True, append_images=ims[1:], duration=90, loop=0)
    for r in rutas:
        r.unlink()
    tmp.rmdir()
    return destino


# ---------------------------------------------------------------------------
# 4. Gate G-SIM e informe
# ---------------------------------------------------------------------------

def evaluar(P: dict, C: dict, cal: dict, casos: dict) -> list[dict]:
    """Compara lo simulado contra lo publicado y contra lo que el diseño supuso."""
    pruebas = []

    def prueba(id_, titulo, veredicto, medido, criterio, accion=""):
        pruebas.append({"id": id_, "titulo": titulo, "veredicto": veredicto,
                        "medido": medido, "criterio": criterio, "accion": accion})

    base = casos.get("base", {})
    dem = P.get("dem", {})

    # -- S1 la corrida es numéricamente utilizable ---------------------------
    sol = base.get("solape_max_pct_radio")
    acot = base.get("contactos_acotados", 0)
    if sol is None:
        sol, acot = 0.0, 0
    prueba("S1", "La corrida es numéricamente limpia",
           "PASA" if sol < 2.0 and acot == 0 else "FALLA",
           {"solape_max_pct_radio": sol, "contactos_acotados": acot},
           "solape < 2% del radio (rigidez suficiente) y ningún contacto acotado",
           "subir rigidez_normal_N_m y bajar dt_s en params.json")

    # -- S2 el grano reproduce el ángulo de reposo publicado -----------------
    ang = cal["elegido"]["angulo_reposo_deg"]
    lo, hi = cal["rango_publicado_deg"]
    prueba("S2", "El grano calibrado cae en el ángulo de reposo publicado",
           "PASA" if lo <= ang <= hi else "ADVERTENCIA",
           {"angulo_simulado_deg": ang, "rango_publicado_deg": [lo, hi],
            "mu_rodadura": cal["elegido"]["mu_rodadura"], "curva": cal["curva"]},
           f"ángulo de reposo dentro de {lo}-{hi}° (pellet extruido flotante)",
           "ampliar el barrido de friccion_rodadura en la calibración")

    # -- S3 contraprueba: densidad aparente ----------------------------------
    rho_sim = cal["densidad"]["densidad_aparente_g_ml"]
    rho_cit = cal["densidad_citada_g_ml"]
    err = abs(rho_sim - rho_cit) / rho_cit * 100 if rho_cit else 0.0
    prueba("S3", "La densidad aparente del modelo contra la citada",
           "PASA" if err <= 15.0 else "ADVERTENCIA",
           {"densidad_simulada_g_ml": rho_sim, "densidad_citada_g_ml": rho_cit,
            "discrepancia_pct": round(err, 1),
            "fraccion_empaquetamiento": cal["densidad"]["fraccion_empaquetamiento"],
            "densidad_particula_kg_m3": dem.get("densidad_particula_kg_m3")},
           "discrepancia ≤ 15% con la densidad aparente citada",
           "Dos causas distintas y las dos hay que decirlas. (1) Las fuentes se "
           "contradicen: la densidad aparente del fabricante y la densidad de "
           "partícula publicada exigirían un empaquetamiento por encima del "
           "máximo físico de un lecho de esferas, así que no son del mismo "
           "producto. (2) Con esferas se puede reproducir el ÁNGULO DE REPOSO o "
           "el EMPAQUETAMIENTO, no los dos: la rodadura alta que hace falta para "
           "el talud de un grano no esférico deja el lecho suelto. Se eligió "
           "acertar el flujo, que es lo que se está preguntando. Consecuencia: "
           "las masas simuladas salen BAJAS y el resultado que vale es el "
           "FACTOR DE LLENADO (un cociente, donde el sesgo se cancela), no los "
           "gramos. Los gramos se calibran con balanza.")

    # -- S4 el aparato no atasca ---------------------------------------------
    # Sin corrida de dosificación esta prueba NO se emite. Un gate que falla
    # porque falta el dato miente: no es lo mismo «no cumple» que «no medido».
    por_golpe = [g["masa_g"] for g in base.get("descarga_por_golpe_g", [])]
    if por_golpe:
        prueba("S4", "Entrega alimento en todos los golpes (no se atasca)",
               "PASA" if min(por_golpe) > 0.5 * max(por_golpe) and min(por_golpe) > 5
               else "FALLA",
               {"por_golpe_g": por_golpe},
               "ningún golpe entrega menos de la mitad del mayor, y ninguno sale vacío",
               "revisar el criterio anti-arco y la geometría del cuello")

    # -- S5 el factor de llenado declarado ------------------------------------
    # El factor de llenado se calcula contra el empaquetamiento medido en la
    # CALIBRACIÓN (recipiente controlado), no contra el de la corrida: en la
    # corrida el lecho se mueve y su empaquetamiento local es ruidoso.
    phi_cal = cal.get("densidad", {}).get("fraccion_empaquetamiento")
    fs = base.get("fraccion_solida_cavidad")
    fl = round(fs / phi_cal, 3) if (fs and phi_cal) else base.get("factor_llenado_medido")
    fd = base.get("factor_llenado_declarado")
    if fl is not None and fd:
        prueba("S5", "El factor de llenado declarado contra el simulado",
               "PASA" if abs(fl - fd) / fd <= 0.15 else "ADVERTENCIA",
               {"llenado_simulado": fl, "llenado_declarado": fd,
                "empaquetamiento_calibracion": phi_cal,
                "discrepancia_pct": round(abs(fl - fd) / fd * 100, 1),
                "fraccion_solida_cavidad": base.get("fraccion_solida_cavidad"),
                "empaquetamiento_lecho": base.get("empaquetamiento_lecho"),
                "masa_cavidad_media_g": base.get("masa_cavidad_media_g"),
                "masa_si_densidad_citada_g": base.get("masa_cavidad_si_densidad_citada_g"),
                "masa_en_cavidad_g": base.get("masa_en_cavidad_g")},
               "el llenado simulado no se aparta más de 15% del declarado (0.90)",
               "corregir alimento.factor_llenado en params.json y regenerar")

    # -- S6 la dosis cae en el rango de diseño --------------------------------
    dm = base.get("dosis_media_g")
    rango = C.get("dosis_rango_g")
    if dm is not None and rango:
        prueba("S6", "La dosis simulada cae en el rango de diseño",
               "PASA" if rango[0] <= dm <= rango[1] else "ADVERTENCIA",
               {"dosis_simulada_g": dm, "desviacion_g": base.get("dosis_desv_g"),
                "rango_diseno_g": rango, "objetivo_g": P["alimento"]["dosis_objetivo_g"]},
               f"dosis media dentro de {rango} g (rango por densidad del alimento)",
               "recalibrar pesando cinco golpes con el alimento real")

    # -- S7 el agitador sirve para algo ---------------------------------------
    sin = casos.get("sin_agitador")
    if sin:
        con_g = base.get("dosis_media_g") or 0.0
        sin_g = sin.get("dosis_media_g") or 0.0
        prueba("S7", "El agitador cambia el comportamiento del cuello",
               "PASA" if sin_g <= 0.5 * con_g or con_g == 0 else "ADVERTENCIA",
               {"con_agitador_g": con_g, "sin_agitador_g": sin_g,
                "por_golpe_sin": [g["masa_g"] for g in sin.get("descarga_por_golpe_g", [])]},
               "sin agitador la entrega cae al menos a la mitad (si no, el "
               "agitador no está justificado por esta simulación)",
               "si el aparato dosifica igual sin agitador, decirlo: sobra una pieza")

    # -- S8 no tritura la croqueta --------------------------------------------
    fmax = base.get("fuerza_contacto_max_N")
    rot = dem.get("carga_rotura_croqueta_N")
    if fmax is not None and rot and por_golpe:
        # Si el solape se fue del rango de validez, el contacto blando ya no
        # representa el pellizco: un grano de verdad no se aplasta 2 mm, aguanta
        # y devuelve MUCHA más fuerza. El modelo subestima, así que un «no la
        # rompe» aquí no demostraría nada y la prueba sale sin veredicto.
        creible = (base.get("solape_max_pct_radio") or 0.0) < 10.0
        prueba("S8", "La fuerza de contacto no llega a romper la croqueta",
               ("PASA" if fmax < rot[0] else "ADVERTENCIA") if creible else "ADVERTENCIA",
               {"fuerza_max_N": fmax, "carga_rotura_N": rot,
                "solape_max_pct_radio": base.get("solape_max_pct_radio"),
                "concluyente": creible},
               f"fuerza máxima de contacto por debajo de {rot[0]} N (rotura mínima "
               "publicada de croqueta de perro), Y con el solape dentro del rango "
               "de validez del contacto blando (<10% del radio)",
               "aumentar el bisel de corte o bajar la velocidad del golpe"
               if creible else
               "NO CONCLUYENTE: el solape máximo se salió del rango de validez, así "
               "que la fuerza medida es una COTA INFERIOR de la real. Para zanjarlo "
               "hay que subir rigidez_normal_N_m y bajar dt_s, que multiplica el "
               "tiempo de cálculo.")
    return pruebas


def informe(P, C, cal, casos, pruebas, destino: Path) -> Path:
    """Memoria de la simulación: qué se supuso, qué salió y qué NO demuestra."""
    dem = P["dem"]
    base = casos.get("base", {})
    L = []
    a = L.append
    a("# Simulación de croqueta grano a grano — YT0101\n")
    a(f"Generado {now_iso()}. Capa `user`: es un MODELO, no una medición del "
      "aparato físico.\n")

    a("\n## 1. Qué se puso a prueba\n")
    a("La verificación G-DIS mide geometría. Tres cosas quedaban fuera de su "
      "alcance y eran supuestos:\n")
    a("| Supuesto del diseño | Cómo estaba justificado | Qué dice ahora la simulación |")
    a("|---|---|---|")
    fl = base.get("factor_llenado_medido")
    a(f"| La cavidad se llena al {base.get('factor_llenado_declarado')} | declarado, "
      f"«conservador» | {fl if fl is not None else '—'} medido "
      f"(fracción sólida {base.get('fraccion_solida_cavidad')} contra "
      f"{base.get('empaquetamiento_lecho')} del lecho libre) |")
    s7 = next((p for p in pruebas if p["id"] == "S7"), None)
    a(f"| El agitador es obligatorio | deducido del criterio de Jenike | "
      f"{s7['veredicto'] if s7 else '—'}: "
      f"{s7['medido']['con_agitador_g'] if s7 else '—'} g con, "
      f"{s7['medido']['sin_agitador_g'] if s7 else '—'} g sin |")
    a(f"| El bisel desvía la croqueta sin partirla | esperado | fuerza máxima "
      f"{base.get('fuerza_contacto_max_N')} N contra "
      f"{dem.get('carga_rotura_croqueta_N')} N de rotura |")

    a("\n## 2. El grano: de dónde sale cada número\n")
    a("Ninguno es de croqueta de perro medida contra PLA. **Esa fuente no existe**; "
      "lo que hay es lo siguiente, con su distancia al material real declarada.\n")
    a("| Parámetro | Valor | Origen |")
    a("|---|---|---|")
    filas = [("Densidad de partícula", f"{dem['densidad_particula_kg_m3']:.0f} kg/m³",
              "croqueta de perro seca, MEDIDA (calibre + balanza)"),
             ("Restitución", f"{dem['restitucion']}",
              "EXTRAPOLADO: pellet de acuicultura extruido flotante contra ABS"),
             ("Fricción grano-pared", f"{dem['friccion_grano_pared']}",
              "EXTRAPOLADO de ABS; el PLA da COF menor → es cota superior"),
             ("Fricción grano-grano", f"{dem['friccion_grano_grano']}",
              "SIN FUENTE: adoptado dentro del rango de fricción interna del lecho"),
             ("Fricción de rodadura", f"{cal['elegido']['mu_rodadura']}",
              "CALIBRADO contra el ángulo de reposo publicado"),
             ("Rigidez normal", f"{dem['rigidez_normal_N_m']:.0f} N/m",
              f"elección numérica; solape medido {base.get('solape_max_pct_radio')}% del radio")]
    for n, v, o in filas:
        a(f"| {n} | {v} | {o} |")

    a("\n### Calibración\n")
    a(f"Barrido de fricción de rodadura contra el ángulo de reposo publicado "
      f"({cal['rango_publicado_deg'][0]}–{cal['rango_publicado_deg'][1]}°):\n")
    a("| μ rodadura | Ángulo de reposo simulado | Granos |")
    a("|---|---|---|")
    for c in cal["curva"]:
        marca = " ←" if c["mu_rodadura"] == cal["elegido"]["mu_rodadura"] else ""
        a(f"| {c['mu_rodadura']} | {c['angulo_reposo_deg']}°{marca} | {c['particulas']} |")
    d = cal["densidad"]
    a(f"\nContraprueba independiente: con ese grano el modelo empaqueta a "
      f"**φ = {d['fraccion_empaquetamiento']}** y da una densidad aparente de "
      f"**{d['densidad_aparente_g_ml']} g/ml**, contra los "
      f"{cal['densidad_citada_g_ml']} g/ml citados del fabricante. "
      "La densidad aparente NO es un parámetro de entrada: sale del tamaño de "
      "grano, de la densidad de partícula y del empaquetamiento que consigue la "
      "gravedad, así que sirve de control del modelo — y aquí NO cuadra.\n")
    a("Merece la pena separar las dos razones, porque no dicen lo mismo:\n")
    a("1. **Las fuentes citadas se contradicen entre sí.** La densidad aparente "
      f"del fabricante ({cal['densidad_citada_g_ml']} g/ml) junto con la densidad "
      f"de partícula medida de croqueta ({dem['densidad_particula_kg_m3']:.0f} kg/m³) "
      "exigiría empaquetar por encima del máximo físico de un lecho de esferas "
      "(0.64). No pueden ser el mismo producto.")
    a("2. **Con esferas no se puede acertar todo a la vez.** La rodadura alta que "
      "hace falta para levantar el talud de un grano no esférico deja el lecho "
      "suelto. Se puede reproducir el ángulo de reposo o el empaquetamiento, no "
      "los dos. Aquí se eligió el ángulo de reposo, porque lo que se está "
      "preguntando es de FLUJO: si arquea, si el agitador sirve, si la cavidad "
      "se llena.")
    a("\nConsecuencia práctica, y es la que importa: **las masas que salen de "
      "esta simulación están sesgadas a la baja**. El resultado utilizable es el "
      "FACTOR DE LLENADO —un cociente entre la fracción sólida de la cavidad y "
      "la del lecho libre, donde el sesgo se cancela—, no los gramos. La cavidad "
      "entrega un VOLUMEN verificado sobre la malla (prueba V5); convertirlo a "
      "gramos exige la densidad aparente del alimento real, medida con balanza.\n")

    a("\n## 3. Resultados\n")
    for nombre, caso in casos.items():
        if not caso:
            continue
        a(f"\n### {nombre.replace('_', ' ')}\n")
        a(f"{caso['particulas']} granos de {caso['croqueta_mm']} mm, "
          f"{caso['golpes']} golpes de {caso['t_ida_s']} s, dt = {caso['dt_s']} s.\n")
        a("| Golpe | Masa descargada |")
        a("|---|---|")
        for g in caso["descarga_por_golpe_g"]:
            a(f"| {g['golpe']} | {g['masa_g']} g |")
        if caso.get("dosis_desv_g") is not None:
            a(f"\nMedia **{caso['dosis_media_g']} g**, desviación "
              f"{caso['dosis_desv_g']} g.\n")

    a("\n## 4. Gate G-SIM\n")
    a("| Prueba | Qué comprueba | Veredicto |")
    a("|---|---|---|")
    for p in pruebas:
        a(f"| {p['id']} | {p['titulo']} | **{p['veredicto']}** |")
    for p in pruebas:
        if p["veredicto"] != "PASA":
            a(f"\n**{p['id']} — {p['veredicto']}.** {p['criterio']}. "
              f"Medido: `{json.dumps(p['medido'], ensure_ascii=False)[:400]}`. "
              f"Acción: {p['accion']}")

    a("\n## 5. Lo que esta simulación NO demuestra\n")
    a("- **No es el aparato.** Es un modelo de esferas con fricción de rodadura "
      "sobre las mallas del proyecto. La croqueta real no es una esfera: la "
      "rodadura la sustituye de forma aproximada y calibrada, no exacta.")
    a("- **Ningún parámetro de contacto es de croqueta contra PLA.** El más "
      "cercano es pellet extruido flotante contra ABS. La dirección del error se "
      "conoce (el PLA roza menos), la magnitud no.")
    a(f"- **Las paredes están resueltas a ±{PASO_VOXEL / 2:.2f} mm** por el "
      "muestreo del campo de distancia; es del orden del 5% del tamaño de grano.")
    a("- **No hay desgaste, ni humedad, ni finos.** El polvo del fondo del saco "
      "cambia la fricción y no está modelado.")
    a("- **La dosis definitiva se sigue pesando** con el alimento real: "
      "`out/ENSAMBLE.md` §5. Esta simulación acota lo que se espera encontrar, "
      "no lo reemplaza.")
    destino.write_text("\n".join(L) + "\n", encoding="utf-8")
    return destino


def main() -> None:
    ap = argparse.ArgumentParser(description="Simulación DEM de croqueta del YT0101")
    ap.add_argument("proyecto")
    ap.add_argument("modo", choices=["calibrar", "dosificar", "todo"], default="todo",
                    nargs="?")
    ap.add_argument("--golpes", type=int, default=3)
    ap.add_argument("--sin-agitador", action="store_true")
    ap.add_argument("--croqueta", type=float, default=None,
                    help="diámetro de croqueta en mm (por defecto el de diseño)")
    ap.add_argument("--anim", action="store_true", help="GIF del ciclo en corte")
    ap.add_argument("--mu-rod", type=float, nargs="*", default=None,
                    help="valores de fricción de rodadura a barrer en la calibración")
    args = ap.parse_args()

    proj = project_dir(args.proyecto)
    P = json.loads((proj / "input" / "params.json").read_text(encoding="utf-8"))
    C = G.calculos(P)
    cache = proj / "work" / "sim"
    cache.mkdir(parents=True, exist_ok=True)
    salida = proj / "out"
    salida.mkdir(exist_ok=True)
    destino_json = salida / "SIMULACION.json"

    previo = {}
    if destino_json.exists():
        previo = json.loads(destino_json.read_text(encoding="utf-8"))

    print(f"[sim] {proj.name}: construyendo piezas…", flush=True)
    piezas = {n: fn(P, C)[0] for n, fn in G.PIEZAS.items()}

    cal = previo.get("calibracion")
    if args.modo in ("calibrar", "todo") or cal is None:
        valores = args.mu_rod or P["dem"].get("barrido_rodadura", [0.02, 0.069, 0.15, 0.30])
        print(f"[sim] calibrando el grano contra el ángulo de reposo publicado…", flush=True)
        cal = calibrar(P, valores, {})

    casos = previo.get("casos", {}) if args.modo == "calibrar" else {}
    if args.modo in ("dosificar", "todo"):
        mu = cal["elegido"]["mu_rodadura"]
        print(f"[sim] dosificando con y sin agitador en paralelo (μ_rod = {mu})…",
              flush=True)
        # Los dos casos son independientes y cada uno usa un núcleo: en paralelo
        # el contraste sale en el tiempo de una sola corrida.
        comun = dict(golpes=args.golpes, d_croqueta=args.croqueta, mu_rod=mu)
        with ProcessPoolExecutor(max_workers=2) as pool:
            fut_con = pool.submit(escenario_dosificar, P, C, piezas, cache,
                                  con_agitador=True,
                                  traza={"cada": 3200} if args.anim else None, **comun)
            fut_sin = pool.submit(escenario_dosificar, P, C, piezas, cache,
                                  con_agitador=False, **comun)
            casos["base"] = fut_con.result()
            casos["sin_agitador"] = fut_sin.result()

    cuadros = casos.get("base", {}).pop("_cuadros", []) if casos.get("base") else []
    for c in casos.values():
        if isinstance(c, dict):
            c.pop("_cuadros", None)

    pruebas = evaluar(P, C, cal, casos)
    falla = [p for p in pruebas if p["veredicto"] == "FALLA"]
    avisos = [p for p in pruebas if p["veredicto"] == "ADVERTENCIA"]

    doc = {"generado": now_iso(), "proyecto": proj.name, "capa": "user",
           "modelo": "DEM esferas polidispersas, contacto lineal con historia "
                     "tangencial y fricción de rodadura",
           "paso_voxel_mm": PASO_VOXEL, "calibracion": cal, "casos": casos,
           "pruebas": pruebas,
           "resumen": {"pruebas": len(pruebas), "fallas": len(falla),
                       "advertencias": len(avisos)}}
    destino_json.write_text(json.dumps(doc, ensure_ascii=False, indent=2, default=float),
                            encoding="utf-8")
    informe(P, C, cal, casos, pruebas, salida / "SIMULACION.md")

    if cuadros:
        gif = animacion_corte(P, C, piezas, cuadros, salida / "sim" / "ciclo_granos.gif")
        print(f"[sim] animación → {gif}")

    estado = load_state(proj)
    metricas = {"pruebas": len(pruebas), "fallas": len(falla), "advertencias": len(avisos),
                "dosis_media_g": casos.get("base", {}).get("dosis_media_g"),
                "llenado_simulado": casos.get("base", {}).get("factor_llenado_medido"),
                "angulo_reposo_deg": cal["elegido"]["angulo_reposo_deg"],
                "mu_rodadura": cal["elegido"]["mu_rodadura"]}
    razones = [f"{p['id']}: {p['titulo']}" for p in pruebas if p["veredicto"] != "PASA"]
    set_gate(proj, estado, "G-SIM", False if falla else (None if avisos else True),
             metricas, razones or ["todas las pruebas del modelo pasan"],
             estado.get("stage", "S2_OK"))
    audit(proj, "SIM", "sim_granos", "FALLA" if falla else "OK",
          pruebas=len(pruebas), fallas=len(falla), advertencias=len(avisos))

    print(f"\n[sim] {len(pruebas)} pruebas · {len(falla)} fallas · {len(avisos)} advertencias")
    for p in pruebas:
        marca = {"PASA": "ok ", "ADVERTENCIA": "!! ", "FALLA": "XX "}[p["veredicto"]]
        print(f"  {marca}{p['id']:3s} {p['titulo']}")
    print(f"\n  → {destino_json}\n  → {salida / 'SIMULACION.md'}")
    sys.exit(1 if falla else 0)


if __name__ == "__main__":
    main()
