"""Verificación funcional del dispensador canino (gate G-DIS).

No basta con que las piezas se vean bien: hay que demostrar que el mecanismo
FUNCIONA y que lo hace dentro de los criterios empíricos citados. Este script
mide sobre las MALLAS REALES ya generadas y sobre los datos de web_facts:

  V1 Estanqueidad y volumen de cada pieza (malla imprimible).
  V2 Cabida en la cama de impresión declarada.
  V3 Barrido del cajón: interferencia contra las piezas fijas en TODA la carrera
     (posición cargada → posición de descarga), volumen de solape en mm³.
  V4 Obturación: en la posición de descarga, la boca de carga queda tapada por
     el cajón (si no, el bidón se vacía solo: falla de seguridad).
  V5 Dosis: volumen de la cavidad MEDIDO sobre la malla del cajón (no el
     nominal), y masa resultante en el rango de densidad del alimento.
  V6 Engrane cremallera-piñón: distancia entre centros, backlash y carrera real
     por barrido de palanca.
  V7 Criterio anti-arco de Jenike/Mehos en cada sección estática del camino.
  V8 Imprimibilidad: voladizos por encima del límite y espesores mínimos.
  V9 Estructura: carga por columna, tensión de aplastamiento y pandeo de Euler,
     estabilidad al vuelco.
  V10 Agua: nivel de equilibrio (Mariotte), volumen del plato y autonomía.

Un criterio que no se cumple NO se maquilla: sale como FALLA o ADVERTENCIA con
el número medido y la acción correctiva.

uso: python pipeline/verifica_dispensador.py projects/<X>
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import trimesh

sys.path.insert(0, str(Path(__file__).parent))
import lib_solidos as S
import gen_dispensador as G
import ens_dispensador as E
import ens_dispensador as EN
from lib_audit import audit, load_state, now_iso, project_dir, save_state, set_gate

E_PLA_MPA = 3500.0        # módulo elástico típico del PLA impreso (orden de magnitud)
SIGMA_PLA_MPA = 45.0      # resistencia a compresión del PLA impreso (conservador)


def _vol_interseccion(a, b) -> float:
    """Volumen de solape entre dos mallas (0.0 si no se tocan)."""
    if not _bbox_cruza(a, b):
        return 0.0
    try:
        inter = trimesh.boolean.intersection([a, b])
    except Exception:
        return float("nan")
    return float(inter.volume) if inter is not None and len(inter.faces) else 0.0


def _bbox_cruza(a, b, holgura: float = 0.0) -> bool:
    return bool(np.all(a.bounds[0] - holgura <= b.bounds[1]) and
                np.all(b.bounds[0] - holgura <= a.bounds[1]))


def verificar(proj: Path) -> dict:
    P = json.loads((proj / "input" / "params.json").read_text(encoding="utf-8"))
    C = G.calculos(P)
    do, al, ag, es, im, ve = (P["dosificador"], P["alimento"], P["agua"],
                              P["estructura"], P["impresion"], P["verificacion"])
    R: dict = {"generado": now_iso(), "proyecto": proj.name, "capa": "user", "pruebas": []}

    def prueba(id_, titulo, veredicto, medido, criterio, accion=""):
        R["pruebas"].append({"id": id_, "titulo": titulo, "veredicto": veredicto,
                             "medido": medido, "criterio": criterio, "accion": accion})

    piezas = {n: fn(P, C)[0] for n, fn in G.PIEZAS.items()}
    metas = {n: fn(P, C)[2] for n, fn in G.PIEZAS.items()}

    # ---------------- V1/V2 mallas y cama -----------------------------------
    no_estancas = [n for n, m in piezas.items() if not m.is_watertight]
    prueba("V1", "Todas las piezas son sólidos cerrados (imprimibles)",
           "PASA" if not no_estancas else "FALLA",
           {"no_estancas": no_estancas, "total": len(piezas)},
           "malla estanca (watertight) en el 100% de las piezas",
           "revisar la operación booleana de la pieza indicada")

    cama = sorted(im["cama_mm"], reverse=True)
    grandes = {}
    for n, m in piezas.items():
        d = sorted((m.bounds[1] - m.bounds[0]).tolist(), reverse=True)
        if any(a > b for a, b in zip(d, cama)):
            grandes[n] = [round(x, 1) for x in d]
    prueba("V2", "Cada pieza cabe en la cama declarada",
           "PASA" if not grandes else "FALLA", {"exceden": grandes, "cama_mm": im["cama_mm"]},
           f"envolvente ≤ {im['cama_mm']}", "partir la pieza o cambiar la cama en params.json")

    # ---------------- V3/V4 barrido del cajón --------------------------------
    y_cav_local = C["y_cavidad_local"]
    fijas = {
        "ali_canal_base": E._t(piezas["ali_canal_base"], at=(0, 0, C["z_canal_base"])),
        "ali_canal_tapa": E._t(piezas["ali_canal_tapa"], at=(0, 0, C["z_tapa_inf"])),
        "ali_adaptador_cuello": E._t(piezas["ali_adaptador_cuello"], at=(0, C["y_carga"], C["z_tapa_sup"])),
        "ali_chute": E._t(piezas["ali_chute"], at=(0, C["y_descarga"], C["z_canal_base"])),
    }
    pasos = ve.get("pasos_barrido_corredera", 21)
    peor, detalle = 0.0, []
    for k in range(pasos):
        s = k / (pasos - 1)
        y = C["y_carga"] + s * C["carrera"] - y_cav_local
        cajon = E._t(piezas["ali_corredera"], at=(0, y, C["z_deslizamiento"]))
        v = {n: round(_vol_interseccion(cajon, f), 1) for n, f in fijas.items()}
        peor = max(peor, max(v.values()))
        detalle.append({"paso": k, "avance_mm": round(s * C["carrera"], 1), "solape_mm3": v})
    tol = ve["tolerancia_interferencia_mm3"]
    prueba("V3", "El cajón recorre toda la carrera sin chocar con las piezas fijas",
           "PASA" if peor <= tol else "FALLA",
           {"solape_maximo_mm3": round(peor, 1), "pasos": pasos, "detalle": detalle},
           f"solape ≤ {tol} mm³ en los {pasos} pasos de la carrera",
           "aumentar corredera_holgura o revisar la geometría del canal")

    # V4: en descarga, la piel del cajón tapa la boca de carga
    cajon_fuera = E._t(piezas["ali_corredera"],
                       at=(0, C["y_carga"] + C["carrera"] - y_cav_local, C["z_deslizamiento"]))
    sonda = S.caja((do["cavidad_x"] - 1, do["cavidad_y"] - 1, 3.0),
                   at=(0, C["y_carga"], C["z_corredera_sup"] - 1.5))
    tapado = _vol_interseccion(cajon_fuera, sonda)
    esperado = (do["cavidad_x"] - 1) * (do["cavidad_y"] - 1) * 3.0
    cobertura = tapado / esperado if esperado else 0.0
    prueba("V4", "Con el cajón afuera, la boca de la tolva queda obturada",
           "PASA" if cobertura > 0.995 else "FALLA",
           {"cobertura": round(cobertura, 4), "volumen_sonda_mm3": round(esperado, 1)},
           "cobertura ≥ 99.5% de la boca de carga",
           "alargar la falda obturadora (sello_tabique) del cajón")

    # ---------------- V5 dosis medida sobre la malla -------------------------
    cajon0 = piezas["ali_corredera"]
    caja_cav = S.caja((do["cavidad_x"] + 40, do["cavidad_y"] + 40, C["cavidad_z"]),
                      at=(0, y_cav_local, C["cavidad_z"] / 2))
    material = _vol_interseccion(cajon0, caja_cav)
    vol_cav_medido = float(caja_cav.volume) - material
    # descontar la corona exterior de la caja sonda (solo interesa la cavidad)
    caja_int = S.caja((do["cavidad_x"], do["cavidad_y"], C["cavidad_z"]),
                      at=(0, y_cav_local, C["cavidad_z"] / 2))
    hueco = float(caja_int.volume) - _vol_interseccion(cajon0, caja_int)
    ml = hueco / 1000.0
    dosis = [round(ml * al["factor_llenado"] * r, 1) for r in al["densidad_rango_g_ml"]]
    dosis_nom = round(ml * al["factor_llenado"] * al["densidad_aparente_g_ml"], 1)
    err = abs(dosis_nom - al["dosis_objetivo_g"]) / al["dosis_objetivo_g"] * 100.0
    prueba("V5", "La cavidad entrega la dosis objetivo con el alimento de diseño",
           "PASA" if err <= ve["dosis_tolerancia_pct"] else "FALLA",
           {"volumen_cavidad_medido_ml": round(ml, 1), "volumen_nominal_ml": C["volumen_cavidad_ml"],
            "dosis_g": dosis_nom, "dosis_rango_g": dosis, "error_pct": round(err, 1),
            "objetivo_g": al["dosis_objetivo_g"]},
           f"error ≤ {ve['dosis_tolerancia_pct']}% frente a la dosis objetivo",
           "ajustar cavidad_z en params.json y regenerar",
           )
    del vol_cav_medido, material

    # ---------------- V6 engrane cremallera-piñón ----------------------------
    pin = C["pinon"]
    rp = pin["dia_primitivo"] / 2.0
    # la línea primitiva de la cremallera queda embutida respecto del flanco
    x_linea_primitiva = C["x_linea_primitiva"]
    dist_real = abs(C["x_pinon"] - x_linea_primitiva)     # centro del piñón a la línea primitiva
    error_centro = dist_real - rp
    carrera_barrido = math.pi * pin["dia_primitivo"] * C["palanca_barrido_deg"] / 360.0
    prueba("V6", "Cremallera y piñón engranan con la distancia correcta",
           "PASA" if abs(error_centro) <= 0.25 and abs(carrera_barrido - C["carrera"]) <= 0.5 else "FALLA",
           {"radio_primitivo_mm": rp, "distancia_montaje_mm": round(dist_real, 2),
            "error_mm": round(error_centro, 3), "backlash_mm": do["backlash"],
            "carrera_por_barrido_mm": round(carrera_barrido, 2), "carrera_necesaria_mm": C["carrera"],
            "barrido_palanca_deg": C["palanca_barrido_deg"], "dientes": do["pinon_z"],
            "modulo": do["modulo"], "angulo_presion": do["angulo_presion"]},
           "línea primitiva de la cremallera tangente al primitivo del piñón (±0.25 mm) "
           "y carrera por barrido = carrera necesaria (±0.5 mm)",
           "corregir x_pinon o el módulo/dientes")

    # V6c: ¿la cremallera está bajo el piñón en los dos extremos de la carrera?
    c0 = C["y_cremallera_local"] + C["y_desplazamiento_cajon"]
    ext = [round(c0 - C["cremallera_largo"] / 2, 1), round(c0 + C["cremallera_largo"] / 2, 1)]
    ext_f = [round(x + C["carrera"], 1) for x in ext]
    margen = min(ext[1] - 0.0, 0.0 - ext_f[0])       # el piñón está fijo en y=0
    prueba("V6c", "La cremallera queda engranada en los dos extremos de la carrera",
           "PASA" if margen >= 5.0 else "FALLA",
           {"tramo_cremallera_cargado_mm": ext, "tramo_cremallera_descargado_mm": ext_f,
            "posicion_pinon_mm": 0.0, "margen_de_engrane_mm": round(margen, 1)},
           "el eje del piñón (y=0) cae dentro de la cremallera en ambos extremos, con ≥5 mm de margen",
           "recentrar y_cremallera_local o alargar la cremallera")

    z_min_undercut = 17
    prueba("V6b", "El piñón no sufre socavado (undercut) a 20°",
           "PASA" if do["pinon_z"] >= z_min_undercut else "ADVERTENCIA",
           {"dientes": do["pinon_z"], "minimo_recomendado": z_min_undercut},
           "z ≥ 17 dientes con ángulo de presión de 20°",
           "subir el número de dientes o corregir el perfil")

    # ---------------- V7 anti-arco -------------------------------------------
    aa = C["anti_arco"]
    prueba("V7", "Boca de carga (abertura rasgada) sobre el criterio anti-arco",
           "PASA" if aa["cumple_tolva"] else "FALLA",
           {"ancho_mm": do["cavidad_y"], "croqueta_mm": al["croqueta_dia_mm"],
            "razon": aa["razon_tolva"], "esbeltez": aa["esbeltez_tolva"]},
           f"ancho ≥ {aa['factor_exigido_rasgada']}× la croqueta (abertura en cuña; "
           f"la circular exige {aa['factor_exigido']}×)",
           "ensanchar cavidad_y")
    prueba("V7b", "Cuello del bidón (abertura circular) sobre el criterio anti-arco",
           "PASA" if aa["cumple_cuello"] else "ADVERTENCIA",
           {"diametro_interior_mm": aa["seccion_critica_cuello_mm"],
            "croqueta_mm": al["croqueta_dia_mm"], "razon": aa["razon_cuello"],
            "croqueta_max_sin_agitador_mm": aa["croqueta_max_sin_agitador_mm"],
            "agitador_montado": True},
           f"Ø interior ≥ {aa['factor_exigido']}× la croqueta",
           "el cuello NO cumple para croqueta de "
           f"{al['croqueta_dia_mm']:.0f} mm: el agitador es OBLIGATORIO, o bien usar croqueta "
           f"≤ {aa['croqueta_max_sin_agitador_mm']:.1f} mm, o montar el adaptador de hombro "
           "(variante B, que elimina el cuello como sección crítica)")

    # ---------------- V8 imprimibilidad --------------------------------------
    # voladizo real = cara que mira hacia abajo con inclinación menor que el
    # límite Y que NO está apoyada en la cama (la primera capa no es voladizo)
    voladizos = {}
    sen = math.sin(math.radians(90.0 - im["voladizo_max_deg"]))
    for n, m0 in piezas.items():
        m = G.orientar_para_imprimir(m0, dict(metas[n], _id=n))
        z_cama = float(m.bounds[0][2])
        centros = m.triangles_center[:, 2]
        malas = (m.face_normals[:, 2] < -sen) & (centros > z_cama + 0.5)
        frac = float(m.area_faces[malas].sum()) / float(m.area)
        if frac > 0.06:
            voladizos[n] = round(frac * 100, 1)
    prueba("V8", "Voladizos dentro de lo imprimible sin soportes",
           "PASA" if not voladizos else "ADVERTENCIA",
           {"piezas_con_voladizo_pct": voladizos, "limite_deg": im["voladizo_max_deg"]},
           f"< 6% del área de cada pieza por debajo de {im['voladizo_max_deg']}° "
           "en su orientación de impresión",
           "reorientar la pieza en el laminador o activar soportes solo en ella")

    # ---------------- V9 estructura ------------------------------------------
    n_col = es["anillo_segmentos"]
    carga = max(C["carga_bidon_agua_N"], C["carga_bidon_alimento_N"])
    lado = es["pata_seccion"]
    area = lado ** 2 - max(0.0, (lado - 7.0)) ** 2 * math.pi / 4     # perfil hueco impreso
    area_perfil = lado ** 2                                          # perfil comercial macizo
    sigma = carga / n_col / area
    largo_col = C["z_anillo_alimento"] / math.cos(math.radians(es["pata_inclinacion_deg"]))
    I = lado ** 4 / 12.0
    p_critica = math.pi ** 2 * E_PLA_MPA * I / (2.0 * largo_col) ** 2   # empotrado-libre
    fs_pandeo = p_critica / (carga / n_col)
    fs_aplast = SIGMA_PLA_MPA / sigma
    r_base = (es["anillo_dia_ext"] / 2 - 4) + C["z_anillo_alimento"] * math.tan(
        math.radians(es["pata_inclinacion_deg"]))
    z_cg = C["z_labio_alimento"] + P["bidon"]["altura_total"] * 0.42
    vuelco_N = carga * r_base / z_cg
    fs_min = ve["seguridad_estructural_min"]
    prueba("V9", "Columnas y anillo soportan el bidón lleno",
           "PASA" if min(fs_aplast, fs_pandeo) >= fs_min else "ADVERTENCIA",
           {"carga_total_N": carga, "carga_por_columna_N": round(carga / n_col, 1),
            "tension_MPa": round(sigma, 2), "fs_aplastamiento": round(fs_aplast, 1),
            "fs_pandeo_columna_impresa": round(fs_pandeo, 1),
            "area_perfil_impreso_mm2": round(area, 1), "area_perfil_macizo_mm2": area_perfil,
            "empuje_lateral_para_volcar_N": round(vuelco_N, 1),
            "radio_base_mm": round(r_base, 1)},
           f"factor de seguridad ≥ {fs_min} en aplastamiento y pandeo",
           f"con {round(vuelco_N)} N de empuje lateral el conjunto vuelca: la escuadra de muro "
           "(est_escuadra_muro) es OBLIGATORIA en la unidad de alimento")

    # ---------------- V13 la palanca barre sin golpear la estructura --------
    columnas = [m for _, m in EN.estructura(P, C, piezas, C["z_anillo_alimento"],
                                            mensulas_z=C["z_canal_base"] + 18.0)[1]]
    otras = [m for n, m in EN.estructura(P, C, piezas, C["z_anillo_alimento"],
                                         mensulas_z=C["z_canal_base"] + 18.0)[0]]
    peor_p, donde = 0.0, None
    for k in range(13):
        ang = C["palanca_ang_cerrado"] - 90.0 + C["palanca_barrido_deg"] * k / 12.0
        pal = EN._t(piezas["ali_palanca"], at=(-C["x_pinon"], 0, C["z_pinon"] + 48), rz=ang)
        for j, obst in enumerate(columnas + otras):
            v = _vol_interseccion(pal, obst)
            if v > peor_p:
                peor_p, donde = v, {"paso": k, "angulo_deg": round(ang + 90, 1), "obstaculo": j}
    prueba("V13", "La palanca barre sin golpear columnas ni anillos",
           "PASA" if peor_p <= tol else "FALLA",
           {"solape_maximo_mm3": round(peor_p, 1), "primer_choque": donde,
            "barrido_deg": [C["palanca_ang_cerrado"], C["palanca_ang_abierto"]],
            "columnas_a_deg": [90, 210, 330]},
           f"solape ≤ {tol} mm³ en los 13 pasos del barrido",
           "recolocar palanca_ang_cerrado para que el barrido caiga en el hueco entre columnas, "
           "o acortar palanca_largo")

    # ---------------- V12 el biela-manivela del agitador cierra --------------
    r, Lb = C["manivela_radio"], C["biela_largo"]
    angs, errores = [], []
    for k in range(pasos):
        av = C["carrera"] * k / (pasos - 1)
        th = math.radians(G.angulo_manivela(C, av))
        y_pin = C["y_carga"] + r * math.cos(th)
        z_pin = C["z_agitador"] + r * math.sin(th)
        d = math.hypot((C["y_pasador_cerrado"] + av) - y_pin, C["z_pasador_cajon"] - z_pin)
        errores.append(abs(d - Lb))
        angs.append(math.degrees(th))
    barrido = max(angs) - min(angs)
    ok_l = max(errores) <= 0.05 and barrido >= 120.0 and Lb > r * 1.5
    prueba("V12", "El biela-manivela del agitador cierra en toda la carrera",
           "PASA" if ok_l else "FALLA",
           {"manivela_radio_mm": r, "biela_largo_mm": Lb,
            "error_maximo_cierre_mm": round(max(errores), 4),
            "giro_del_agitador_por_golpe_deg": round(barrido, 1),
            "relacion_biela_manivela": round(Lb / r, 2)},
           "la biela mantiene su largo (±0.05 mm) en los 21 pasos, el agitador gira ≥120° "
           "por golpe y la biela es ≥1.5× la manivela (sin punto muerto de bloqueo)",
           "recalcular manivela_radio y biela_largo desde las posiciones del pasador")

    # ---------------- V11 el cabezal cuelga de verdad de las columnas --------
    partes = dict(EN.conjunto_alimento(P, C, piezas))
    canal = partes["ali_canal_base"]
    pq = trimesh.proximity.ProximityQuery(canal)
    contactos = {}
    for n, m in partes.items():
        if not n.startswith("est_soporte_cabezal"):
            continue
        pts = m.vertices[np.linspace(0, len(m.vertices) - 1, 400).astype(int)]
        contactos[n] = round(float(np.abs(pq.signed_distance(pts)).min()), 2)
    ok_c = contactos and max(contactos.values()) <= 1.5
    prueba("V11", "Las tres ménsulas alcanzan las orejas del canal",
           "PASA" if ok_c else "FALLA",
           {"holgura_minima_mm": contactos,
            "nota": "distancia mínima entre cada ménsula y el cuerpo del canal"},
           "cada ménsula toca el canal (holgura ≤ 1.5 mm); la ranura del brazo da ±12 mm de ajuste",
           "corregir el radio del brazo (est_soporte_cabezal) o el de las orejas del canal")

    # ---------------- V10 agua ------------------------------------------------
    nivel_ok = abs((C["z_difusor"] + 5.0) - ag["nivel_agua"]) < 0.51
    rebalse = ag["bebedero_alto"] - ag["nivel_agua"]
    prueba("V10", "Bebedero de nivel constante coherente (principio de Mariotte)",
           "PASA" if nivel_ok and rebalse >= 25 else "FALLA",
           {"nivel_equilibrio_mm": ag["nivel_agua"],
            "borde_ventanas_difusor_mm": round(C["z_difusor"] + 5.0, 1),
            "margen_hasta_el_borde_mm": round(rebalse, 1),
            "agua_en_el_plato_ml": C["agua_util_ml"],
            "autonomia_total_l": round(C["autonomia_agua_l"], 1),
            "ajuste_de_nivel_mm": ag["bajante_carrera_ajuste"]},
           "borde inferior de las ventanas = nivel declarado (±0.5 mm) y ≥ 25 mm de "
           "margen hasta el borde del plato",
           "corregir z_difusor o el alto del bebedero")

    # ---------------- resumen -------------------------------------------------
    fallas = [p["id"] for p in R["pruebas"] if p["veredicto"] == "FALLA"]
    advert = [p["id"] for p in R["pruebas"] if p["veredicto"] == "ADVERTENCIA"]
    R["resumen"] = {"pruebas": len(R["pruebas"]), "fallas": fallas, "advertencias": advert,
                    "veredicto": "FALLA" if fallas else ("PASA_CON_ADVERTENCIAS" if advert else "PASA")}
    R["calculos"] = C
    R["masa_pla_total_g"] = round(sum(
        S.masa_pla_g(m, im["relleno_pct"] / 100.0) * metas[n].get("cantidad", 1)
        for n, m in piezas.items()), 1)
    return R


def informe_md(R: dict) -> str:
    ico = {"PASA": "PASA", "ADVERTENCIA": "ADVERTENCIA", "FALLA": "FALLA"}
    l = [f"# Verificación funcional — {R['proyecto']}", "",
         f"Generado: {R['generado']} · capa `user` (diseño, no medición).", "",
         f"**Veredicto: {R['resumen']['veredicto']}** "
         f"({R['resumen']['pruebas']} pruebas, {len(R['resumen']['fallas'])} fallas, "
         f"{len(R['resumen']['advertencias'])} advertencias)", "",
         "| Prueba | Qué comprueba | Resultado |", "|---|---|---|"]
    for p in R["pruebas"]:
        l.append(f"| {p['id']} | {p['titulo']} | **{ico[p['veredicto']]}** |")
    l.append("")
    for p in R["pruebas"]:
        l += [f"## {p['id']} — {p['titulo']}", "",
              f"- **Resultado:** {ico[p['veredicto']]}",
              f"- **Criterio:** {p['criterio']}",
              f"- **Medido:** `{json.dumps(_recorta(p['medido']), ensure_ascii=False)}`"]
        if p["accion"]:
            l.append(f"- **Acción / nota:** {p['accion']}")
        l.append("")
    return "\n".join(l)


def _recorta(d, n=8):
    """Evita volcar los 21 pasos del barrido dentro de la tabla del informe."""
    if isinstance(d, dict):
        return {k: (f"[{len(v)} pasos]" if isinstance(v, list) and len(v) > n else _recorta(v))
                for k, v in d.items()}
    return d


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    proj = project_dir(sys.argv[1])
    R = verificar(proj)
    (proj / "out").mkdir(exist_ok=True)
    (proj / "out" / "VERIFICACION.json").write_text(
        json.dumps(R, indent=2, ensure_ascii=False), encoding="utf-8")
    (proj / "out" / "VERIFICACION.md").write_text(informe_md(R), encoding="utf-8")

    for p in R["pruebas"]:
        print(f"  {p['id']:4s} {p['veredicto']:12s} {p['titulo']}")
    print(f"\nVeredicto: {R['resumen']['veredicto']}")

    state = load_state(proj)
    ok = None if R["resumen"]["advertencias"] and not R["resumen"]["fallas"] else \
        (not R["resumen"]["fallas"])
    set_gate(proj, state, "G_DIS", ok,
             {"pruebas": R["resumen"]["pruebas"], "fallas": R["resumen"]["fallas"],
              "advertencias": R["resumen"]["advertencias"],
              "dosis_g": R["calculos"]["dosis_g"], "masa_pla_total_g": R["masa_pla_total_g"]},
             [p["titulo"] for p in R["pruebas"] if p["veredicto"] == "FALLA"],
             "DISENO_VERIFICADO")
    audit(proj, "G_DIS", "verificación funcional del dispensador",
          R["resumen"]["veredicto"])


if __name__ == "__main__":
    main()
