"""Generador paramétrico del dispensador canino (alimento dosificado + agua).

Capa `user`: TODA la geometría que sale de aquí es diseño, no medición. Los
números que la gobiernan viven en `projects/<X>/input/params.json` y cada uno
apunta (campo `*_ref`) al hecho citado de `input/web_facts.json` que lo respalda.
Nada se dibuja "a ojo": si un dato no está citado, el parámetro lleva
`_capa: user` y queda declarado como supuesto.

Arquitectura del aparato (dos cabezales sobre la MISMA estructura):

  ALIMENTO — cajón dosificador de cavidad fija accionado por cremallera+piñón.
    El bidón invertido (base recortada = boca de carga) es la tolva. La croqueta
    llena una cavidad pasante de volumen conocido; al tirar de la palanca la
    cavidad viaja hasta la boca de descarga y cae la dosis, mientras el propio
    cajón tapa la tolva. Un agitador movido por biela rompe el arco de croquetas
    en el cuello. Sin motores, sin electrónica y sin resortes impresos.

  AGUA — bidón invertido íntegro sobre bajante de nivel ajustable (botella de
    Mariotte): el agua sale hasta que el labio del tubo queda sumergido y el
    aire deja de entrar; el nivel del bebedero se autorregula.

uso:
  python pipeline/gen_dispensador.py projects/<X> [--solo <pieza>] [--sin-stl]
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import trimesh
from shapely.geometry import Polygon

sys.path.insert(0, str(Path(__file__).parent))
import lib_solidos as S
from lib_audit import audit, now_iso, project_dir, sha256_file

M4 = 4.4          # taladro pasante para M4 (holgura de montaje)
M4_CAB = 8.2      # alojamiento de cabeza cilíndrica M4
M4_TUERCA = 8.1   # entrecaras de tuerca M4 (DIN 934: 7.0) + holgura FDM


# ===========================================================================
# Cálculos derivados: de la dosis pedida a las cotas de la máquina
# ===========================================================================

def calculos(P: dict) -> dict:
    al, do, ag, es, im = (P["alimento"], P["dosificador"], P["agua"],
                          P["estructura"], P["impresion"])
    bi = P["bidon"]
    C: dict = {}

    # --- dosificación: volumen de cavidad necesario para la dosis objetivo ---
    vol_mm3 = al["dosis_objetivo_g"] / (al["densidad_aparente_g_ml"] * al["factor_llenado"]) * 1000.0
    cav_z = do["cavidad_z"] or vol_mm3 / (do["cavidad_x"] * do["cavidad_y"])
    cav_z_min = do["cavidad_z_min_croquetas"] * al["croqueta_dia_mm"]
    C["cavidad_z_calculada"] = round(cav_z, 2)
    C["cavidad_z"] = round(max(cav_z, cav_z_min), 1)
    C["cavidad_z_limitada_por_croqueta"] = cav_z < cav_z_min
    C["volumen_cavidad_ml"] = round(do["cavidad_x"] * do["cavidad_y"] * C["cavidad_z"] / 1000.0, 1)

    # dosis resultante y su sensibilidad al alimento real (rango de densidad)
    def dosis(rho):
        return round(C["volumen_cavidad_ml"] * al["factor_llenado"] * rho, 1)
    C["dosis_g"] = dosis(al["densidad_aparente_g_ml"])
    C["dosis_rango_g"] = [dosis(al["densidad_rango_g_ml"][0]), dosis(al["densidad_rango_g_ml"][1])]

    # --- cinemática cremallera-piñón ---
    C["carrera"] = round(do["cavidad_y"] + do["sello_tabique"], 1)
    C["pinon"] = S.datos_engranaje(do["modulo"], do["pinon_z"], do["angulo_presion"])
    C["paso_cremallera"] = round(math.pi * do["modulo"], 3)
    barrido = C["carrera"] / (math.pi * C["pinon"]["dia_primitivo"]) * 360.0
    C["palanca_barrido_deg"] = round(barrido, 1)
    C["cremallera_dientes"] = int(math.ceil((C["carrera"] + 3 * C["paso_cremallera"]) / C["paso_cremallera"]))
    C["cremallera_largo"] = round(C["cremallera_dientes"] * C["paso_cremallera"], 1)
    # fuerza en el mango: par = F_corredera * radio primitivo
    C["ventaja_palanca"] = round(do["palanca_largo"] / (C["pinon"]["dia_primitivo"] / 2.0), 2)

    # --- cajón y canal ---
    # el cajón tapa la tolva mientras viaja: detrás de la cavidad lleva una
    # falda maciza igual a la carrera (más margen) que hace de obturador
    C["falda_obturadora"] = round(C["carrera"] + do["cola_extra"], 1)
    C["corredera_largo"] = round(C["falda_obturadora"] + do["cavidad_y"] + do["frente"], 1)
    C["corredera_ancho"] = round(do["cavidad_x"] + 2 * do["canal_ala"], 1)
    C["canal_largo"] = round(do["cavidad_y"] + C["carrera"] + 30.0, 1)
    C["canal_ancho"] = round(C["corredera_ancho"] + 2 * (do["corredera_holgura"] + do["canal_pared"]), 1)
    C["y_carga"] = round(-C["carrera"] / 2.0, 2)
    C["y_descarga"] = round(+C["carrera"] / 2.0, 2)

    # --- alturas de la máquina (mm sobre el suelo) ---
    C["z_canal_base"] = 330.0
    C["z_deslizamiento"] = C["z_canal_base"] + 6.0
    C["z_corredera_sup"] = C["z_deslizamiento"] + C["cavidad_z"]
    C["z_tapa_inf"] = C["z_corredera_sup"] + do["corredera_holgura"]
    C["z_tapa_sup"] = C["z_tapa_inf"] + 6.0
    C["z_agitador"] = C["z_tapa_sup"] + do["agitador_alto_sobre_canal"]
    # cono de transición: pared a 65° desde la horizontal (flujo másico)
    ang = math.radians(al["angulo_pared_tolva_deg"])
    corrida = (do["cavidad_x"] - bi["dia_boca_ext"]) / 2.0
    C["transicion_alto"] = round(max(corrida * math.tan(ang), do["agitador_alto_sobre_canal"] + 20.0), 1)
    C["z_labio_alimento"] = round(C["z_tapa_sup"] + C["transicion_alto"], 1)
    # piñón de EJE VERTICAL al costado: engrana en la cremallera tallada en el
    # flanco del cajón. Así los dientes se imprimen en el plano XY (sin escalón
    # de capa en el perfil) y la palanca barre en horizontal.
    # la línea primitiva de la cremallera queda embutida en el flanco del cajón
    C["x_linea_primitiva"] = round(C["corredera_ancho"] / 2.0
                                   - do["cremallera_empotre"] - do["modulo"], 2)
    C["x_pinon"] = round(C["x_linea_primitiva"] + C["pinon"]["dia_primitivo"] / 2.0, 2)
    C["y_cavidad_local"] = round(C["corredera_largo"] / 2.0 - do["frente"] - do["cavidad_y"] / 2.0, 2)
    # el piñón está fijo en y=0; la cremallera debe quedar bajo él durante TODA
    # la carrera, así que se centra en el punto medio de su recorrido
    C["y_desplazamiento_cajon"] = round(C["y_carga"] - C["y_cavidad_local"], 2)
    C["y_cremallera_local"] = round(-C["y_desplazamiento_cajon"] - C["carrera"] / 2.0, 2)
    C["z_pinon"] = round(C["z_deslizamiento"] + C["cavidad_z"] / 2.0, 1)

    # --- biela-manivela del agitador -------------------------------------
    # El cajón hace de corredera: al recorrer su carrera arrastra la biela y
    # ésta da una vuelta COMPLETA a la manivela del agitador. Manivela y biela
    # no se eligen a ojo: salen de las dos posiciones extremas del pasador.
    C["x_biela"] = round(do["cavidad_x"] / 2.0 + 58.0 / 2.0 + 9.0, 1)
    C["z_pasador_cajon"] = round(C["z_corredera_sup"] + 6.0, 2)
    y_or_local = -C["corredera_largo"] / 2.0 + 5.0
    y_cerrado = y_or_local + C["y_desplazamiento_cajon"]
    C["y_pasador_cerrado"] = round(y_cerrado, 2)
    C["y_pasador_abierto"] = round(y_cerrado + C["carrera"], 2)
    dz = C["z_agitador"] - C["z_pasador_cajon"]
    d_max = abs(C["y_carga"] - C["y_pasador_cerrado"])      # cajón dentro
    d_min = abs(C["y_carga"] - C["y_pasador_abierto"])       # cajón afuera
    h_max, h_min = math.hypot(d_max, dz), math.hypot(d_min, dz)
    C["biela_largo"] = round((h_max + h_min) / 2.0, 2)
    C["manivela_radio"] = round((h_max - h_min) / 2.0, 2)
    C["agitador_largo"] = round(do["cavidad_x"] + 58.0, 1)
    C["biela_dz"] = round(dz, 2)

    # el hombro del bidón toca el anillo donde el cono alcanza dia_asiento_hombro
    C["hombro_alto"] = 150.0            # supuesto declarado (perfil del envase)
    C["subida_asiento"] = round((bi["dia_asiento_hombro"] - bi["dia_boca_ext"])
                                / (bi["dia_cuerpo"] - bi["dia_boca_ext"]) * C["hombro_alto"], 1)
    C["z_anillo_alimento"] = round(C["z_labio_alimento"] + bi["altura_cuello"] + C["subida_asiento"], 1)
    C["z_tope_bidon_alimento"] = round(C["z_labio_alimento"] + bi["altura_total"], 1)

    # --- agua ---
    C["z_labio_agua"] = 210.0
    C["z_anillo_agua"] = round(C["z_labio_agua"] + bi["altura_cuello"] + C["subida_asiento"], 1)
    # cadena del bajante (de abajo hacia arriba): difusor → tubo de nivel
    # (deslizante) → tramo fijo → boquilla en el cuello del bidón
    C["z_difusor"] = round(ag["nivel_agua"] - 5.0, 1)          # borde inferior de ventanas = nivel
    C["z_tubo_nivel_inf"] = round(C["z_difusor"] + 34.0 - 16.0, 1)
    C["z_tubo_nivel_sup"] = round(C["z_tubo_nivel_inf"] + ag["bajante_carrera_ajuste"] + 60.0, 1)
    C["z_bajante_inf"] = round(C["z_tubo_nivel_sup"] - 55.0, 1)
    C["bajante_largo"] = round(C["z_labio_agua"] - 8.0 - C["z_bajante_inf"], 1)
    r_int = ag["bebedero_dia_ext"] / 2.0 - ag["bebedero_pared"]
    C["agua_util_ml"] = round((math.pi * r_int ** 2 * ag["nivel_agua"]
                               - math.pi * (ag["bajante_dia_int"] / 2 + ag["bajante_pared"]) ** 2
                               * ag["nivel_agua"]) / 1000.0, 0)
    C["autonomia_agua_l"] = 20.0 + C["agua_util_ml"] / 1000.0

    # --- criterio anti-arco (Jenike/Mehos: abertura >= 6 x partícula) ---
    f = P["verificacion"]["factor_anti_arco"]
    C["anti_arco"] = {
        "factor_exigido": f,
        "seccion_critica_cuello_mm": bi["dia_boca_ext"] - 2 * 2.5,   # ID ≈ OD − 2·espesor
        "seccion_critica_tolva_mm": min(do["cavidad_x"], do["cavidad_y"]),
        "croqueta_mm": al["croqueta_dia_mm"],
    }
    # el cuello es una abertura CIRCULAR (exige f) y la boca de carga es una
    # abertura RASGADA en cuña: para el mismo material pide ~la mitad de ancho
    C["anti_arco"]["razon_cuello"] = round(C["anti_arco"]["seccion_critica_cuello_mm"] / al["croqueta_dia_mm"], 2)
    C["anti_arco"]["razon_tolva"] = round(do["cavidad_y"] / al["croqueta_dia_mm"], 2)
    C["anti_arco"]["esbeltez_tolva"] = round(do["cavidad_x"] / do["cavidad_y"], 2)
    C["anti_arco"]["factor_exigido_rasgada"] = f / 2.0
    C["anti_arco"]["cumple_cuello"] = C["anti_arco"]["razon_cuello"] >= f
    C["anti_arco"]["cumple_tolva"] = C["anti_arco"]["razon_tolva"] >= f / 2.0
    C["anti_arco"]["croqueta_max_sin_agitador_mm"] = round(C["anti_arco"]["seccion_critica_cuello_mm"] / f, 1)
    C["anti_arco"]["agitador_obligatorio"] = not C["anti_arco"]["cumple_cuello"]

    # --- estructura ---
    C["z_anillo"] = {"agua": C["z_anillo_agua"], "alimento": C["z_anillo_alimento"]}
    C["carga_bidon_agua_N"] = round(bi["masa_lleno_kg"] * 9.81, 1)
    masa_alimento = round(20.0 * al["densidad_aparente_g_ml"], 2)      # 20 L de croqueta
    C["masa_alimento_kg"] = masa_alimento
    C["carga_bidon_alimento_N"] = round((masa_alimento + bi["masa_vacio_kg"]) * 9.81, 1)
    C["autonomia_alimento_dosis"] = int(masa_alimento * 1000 / C["dosis_g"])
    return C


def angulo_manivela(C, avance: float) -> float:
    """Ángulo de la manivela del agitador (grados) para un avance del cajón.

    Cierre del cuadrilátero: el pasador del cajón está a distancia `biela_largo`
    del pasador de la manivela, que gira en torno al eje del agitador.
    """
    a = (C["y_pasador_cerrado"] + avance) - C["y_carga"]      # horizontal
    b = C["z_pasador_cajon"] - C["z_agitador"]                # vertical
    r, L = C["manivela_radio"], C["biela_largo"]
    R = math.hypot(a, b)
    k = (r * r + R * R - L * L) / (2.0 * r * R)
    k = max(-1.0, min(1.0, k))
    return math.degrees(math.atan2(b, a) + math.acos(k))


# ===========================================================================
# Piezas — estructura compartida
# ===========================================================================

def est_anillo_segmento(P, C):
    """1/3 del anillo que recibe el hombro del bidón y ata las tres columnas.

    La misma pieza sirve arriba (asiento del envase) y abajo (anillo de
    arriostramiento que triangula las patas).
    """
    es, bi = P["estructura"], P["bidon"]
    re = es["anillo_dia_ext"] / 2.0
    ri = bi["dia_asiento_hombro"] / 2.0 - es["anillo_ancho"] + 6.0
    h = es["anillo_espesor"]
    ang = 360.0 / es["anillo_segmentos"]
    seg = S.sector_anular(ri, re, -ang / 2, ang / 2, h, pasos=64)
    # asiento cónico interior: el hombro del envase apoya en toda una corona
    a = math.radians(es["anillo_asiento_ang"])
    perfil = np.array([[ri - 1, -h / 2 - 1], [bi["dia_asiento_hombro"] / 2.0, -h / 2 - 1],
                       [bi["dia_asiento_hombro"] / 2.0 + h / math.tan(a) + 2, h / 2 + 1],
                       [ri - 1, h / 2 + 1]])
    seg = S.resta(seg, S.revolucion(perfil, secciones=96))
    # orejas de unión entre segmentos (2 tornillos M4 por junta)
    for s in (-1, 1):
        a0 = math.radians(s * ang / 2)
        for rr in (re - 12, ri + 14):
            c = (rr * math.cos(a0) - s * 9 * math.sin(a0), rr * math.sin(a0) + s * 9 * math.cos(a0))
            seg = S.union(seg, S.caja((16, 16, h), at=(c[0], c[1], 0)))
            seg = S.resta(seg, S.cilindro(M4, h + 4, at=(c[0], c[1], 0)))
    # abrazadera de la columna: recibe el perfil 20x20 inclinado hacia afuera
    lado = es["pata_seccion"] + es["pata_holgura"]
    incl = math.radians(es["pata_inclinacion_deg"])
    y0 = re - 4.0
    bloque = S.caja((lado + 12, lado + 12, h + 34), at=(0, y0, -h / 2 + (h + 34) / 2))
    seg = S.union(seg, bloque)
    hueco = S.caja((lado, lado, h + 80))
    hueco.apply_transform(trimesh.transformations.rotation_matrix(incl, [1, 0, 0]))
    hueco.apply_translation([0, y0, 0])
    seg = S.resta(seg, hueco)
    for dz in (-4.0, 14.0):                       # dos tornillos de apriete M4
        seg = S.resta(seg, S.cilindro(M4, lado + 40, at=(0, y0, dz), eje="y"))
    return seg, "estructura", {
        "cantidad": 6,
        "nota": "3 arriba (asiento del bidón) + 3 abajo (arriostre). Verificar el asiento "
                "con el envase real: el cono admite Ø160-200."}


def est_barra(P, C):
    """Columna 100% impresa (alternativa al perfil comercial de 20x20)."""
    es = P["estructura"]
    largo, lado = 200.0, es["pata_seccion"]
    b = S.caja((lado, lado, largo))
    b = S.resta(b, S.cilindro(lado - 7.0, largo + 4))          # aligera el alma
    for i in range(int(largo // 10) - 1):
        z = -largo / 2 + 10.0 * (i + 1)
        b = S.resta(b, S.cilindro(M4, lado + 4, at=(0, 0, z), eje="y"))
    return b, "estructura", {
        "cantidad": 0,
        "nota": "OPCIONAL. Solo si no se consigue perfil 20x20: 2 barras solapadas por columna "
                "en la unidad de agua. Para la unidad de alimento usar perfil comercial."}


def est_pie(P, C):
    """Pie: ensancha la base, recibe la columna y da regulación de nivel."""
    es = P["estructura"]
    lado = es["pata_seccion"] + es["pata_holgura"]
    incl = math.radians(es["pata_inclinacion_deg"])
    pie = S.caja((78, 62, 8), at=(0, 0, 4))
    pie = S.union(pie, S.caja((lado + 12, lado + 12, 54), at=(0, 0, 8 + 27)))
    pie = S.union(pie, S.prisma([(-39, 0), (39, 0), (lado / 2 + 6, 46), (-lado / 2 - 6, 46)],
                                8.0, at=(0, 0, 0), eje="x"))
    hueco = S.caja((lado, lado, 70))
    hueco.apply_transform(trimesh.transformations.rotation_matrix(incl, [1, 0, 0]))
    hueco.apply_translation([0, 0, 8 + 34])
    pie = S.resta(pie, hueco)
    for z in (28.0, 50.0):
        pie = S.resta(pie, S.cilindro(M4, lado + 40, at=(0, 0, z), eje="y"))
    pie = S.resta(pie, S.caja((66, 50, 2.2), at=(0, 0, 1.1)))   # rebaje del pad
    return pie, "estructura", {"cantidad": 3,
                               "nota": "Pegar fieltro o goma EVA de 2 mm en el rebaje inferior."}


def est_collar_cuello(P, C):
    """Media abrazadera del cuello del bidón (Ø48-56): centra y sujeta."""
    bi = P["bidon"]
    d = bi["dia_boca_ext"]
    ext = d + 16.0
    mitad = S.tubo(ext, d + 0.8, 22.0)
    mitad = S.interseccion(mitad, S.caja((ext + 2, ext + 2, 30), at=(0, (ext + 2) / 4 + 0.5, 0)))
    for s in (-1, 1):
        oreja = S.caja((14, 20, 22), at=(s * (ext / 2 + 5), 6, 0))
        mitad = S.union(mitad, oreja)
        mitad = S.resta(mitad, S.cilindro(M4, 30, at=(s * (ext / 2 + 5), 6, 0), eje="y"))
    # labio interior que engancha bajo el collarín moldeado del envase
    labio = S.tubo(d + 0.8, d - 5.0, 3.0, at=(0, 0, -9.5))
    labio = S.interseccion(labio, S.caja((ext + 2, ext + 2, 30), at=(0, (ext + 2) / 4 + 0.5, 0)))
    return S.union(mitad, labio), "estructura", {
        "cantidad": 2,
        "nota": "Dos mitades iguales + 2 tornillos M4x30. Apretar sobre el cuello; el peso NO cuelga de aquí."}


def est_soporte_cabezal(P, C):
    """Ménsula que cuelga el cabezal dosificador de una columna.

    Abraza el perfil 20x20 a la altura que se quiera (la ranura del brazo da
    ±12 mm de ajuste radial) y termina en el taladro donde apoya la oreja del
    canal. Tres iguales por aparato.
    """
    es = P["estructura"]
    lado = es["pata_seccion"] + es["pata_holgura"]
    incl = math.radians(es["pata_inclinacion_deg"])
    largo = 78.0
    m = S.caja((lado + 12, lado + 12, 46), at=(0, 0, 0))
    m = S.union(m, S.caja((22, largo, 10), at=(0, -largo / 2 - lado / 2, -18)))
    hueco = S.caja((lado, lado, 70))
    hueco.apply_transform(trimesh.transformations.rotation_matrix(incl, [1, 0, 0]))
    m = S.resta(m, hueco)
    for z in (-14.0, 14.0):                      # tornillos de apriete del perfil
        m = S.resta(m, S.cilindro(M4, lado + 40, at=(0, 0, z), eje="y"))
    # ranura del brazo: ajuste radial fino al montar
    ranura = S.union(S.cilindro(M4, 20, at=(0, -largo - lado / 2 + 14, -18)),
                     S.caja((M4, 24, 20), at=(0, -largo - lado / 2 + 26, -18)),
                     S.cilindro(M4, 20, at=(0, -largo - lado / 2 + 38, -18)))
    m = S.resta(m, ranura)
    # cartela: el brazo trabaja en voladizo
    cart = S.prisma([(0, 0), (0, 34), (58, 0)], 8.0, eje="x")
    cart.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [0, 0, 1]))
    cart.apply_translation([0, -lado / 2 - 2, -13])
    m = S.union(m, cart)
    return m, "estructura", {"cantidad": 3,
                             "nota": "Sujeta el canal a las columnas. Montar con nivel: el canal debe "
                                     "quedar horizontal o la dosis varía."}


def est_escuadra_muro(P, C):
    """Escuadra de anclaje a muro: el conjunto es alto y esbelto."""
    e = S.caja((60, 8, 90), at=(0, 4, 45))
    e = S.union(e, S.caja((60, 70, 8), at=(0, 39, 86)))
    e = S.union(e, S.prisma([(0, 0), (0, 60), (55, 0)], 8, at=(0, 0, 0), eje="x"))
    for z in (25, 65):
        e = S.resta(e, S.cilindro(5.5, 30, at=(0, 4, z), eje="y"))
    for y in (25, 60):
        e = S.resta(e, S.cilindro(M4, 30, at=(0, y, 86)))
    return e, "estructura", {"cantidad": 2, "nota": "Tarugo Ø6 + tornillo Ø5 al muro. Obligatoria en la unidad de alimento."}


# ===========================================================================
# Piezas — cabezal de AGUA (principio de la botella de Mariotte)
# ===========================================================================

def agua_bebedero(P, C):
    """Bebedero de nivel constante. El nivel lo fija el labio del bajante."""
    ag = P["agua"]
    re, h, t, f = ag["bebedero_dia_ext"] / 2.0, ag["bebedero_alto"], ag["bebedero_pared"], ag["bebedero_fondo"]
    perfil = np.array([[0, 0], [re, 0], [re, h], [re - t, h], [re - t, f], [0, f]])
    v = S.revolucion(perfil, secciones=128)
    # marca de nivel: rebaje anular a la altura de equilibrio (control visual)
    v = S.resta(v, S.tubo(2 * re + 2, 2 * (re - 1.2), 1.6, at=(0, 0, ag["nivel_agua"])))
    # tres nervios que centran el difusor y evitan que se pegue al fondo
    for k in range(3):
        a = math.radians(120 * k)
        r0 = ag["bajante_dia_int"] / 2 + ag["bajante_pared"] + 6
        v = S.union(v, S.caja((14, 5, 8), at=(r0 * math.cos(a), r0 * math.sin(a), f + 4)))
    return v, "agua", {"cantidad": 1,
                       "nota": f"Nivel de equilibrio {ag['nivel_agua']} mm ≈ {C['agua_util_ml']:.0f} ml en el plato."}


def agua_boquilla(P, C):
    """Tapón cónico que entra en el cuello del bidón y recibe el bajante."""
    bi, ag = P["bidon"], P["agua"]
    d_int = bi["dia_boca_ext"] - 2 * 2.5          # Ø interior estimado del cuello
    perfil = np.array([
        [0, 0], [d_int / 2 + 6, 0], [d_int / 2 + 6, 6],          # brida de tope sobre el labio
        [d_int / 2 - 0.5, 6], [d_int / 2 - 3.0, 34], [0, 34]])
    b = S.revolucion(perfil, secciones=96)
    # tres acanaladuras para cinta de teflón / junta de silicona
    for z in (12, 20, 28):
        b = S.resta(b, S.tubo(d_int + 4, d_int - 6.0, 2.0, at=(0, 0, z)))
    # paso central: por aquí baja el agua y SUBE el aire (contracorriente)
    b = S.resta(b, S.cilindro(ag["bajante_dia_int"], 60, at=(0, 0, 17)))
    # cuello de encastre para el tubo bajante
    b = S.union(b, S.tubo(ag["bajante_dia_int"] + 2 * ag["bajante_pared"] + 2 * 1.2,
                          ag["bajante_dia_int"] + 2 * 0.4, 16.0, at=(0, 0, -8)))
    return b, "agua", {"cantidad": 1,
                       "nota": "Sellar con 2-3 vueltas de cinta de teflón en las acanaladuras antes de invertir el bidón."}


def agua_bajante(P, C):
    """Tubo de bajada (a medida del alto de trabajo) con encastre superior."""
    ag = P["agua"]
    di, t = ag["bajante_dia_int"], ag["bajante_pared"]
    largo = min(C["bajante_largo"], 200.0)
    tubo = S.tubo(di + 2 * t, di, largo, at=(0, 0, largo / 2))
    # ranura longitudinal de ajuste + tope: el tramo inferior desliza dentro
    tubo = S.union(tubo, S.tubo(di + 2 * t + 2 * 1.2, di + 2 * t + 0.7, 18.0, at=(0, 0, largo - 9)))
    return tubo, "agua", {"cantidad": 1,
                          "nota": f"Tramo fijo de {largo:.0f} mm; el nivel fino se ajusta con el tramo deslizante."}


def agua_tubo_nivel(P, C):
    """Tramo deslizante: subiéndolo o bajándolo se fija el nivel del agua."""
    ag = P["agua"]
    di, t = ag["bajante_dia_int"], ag["bajante_pared"]
    largo = ag["bajante_carrera_ajuste"] + 60.0
    tubo = S.tubo(di + 2 * t, di, largo, at=(0, 0, largo / 2))
    # collar de apriete con tornillo M4 (fija la altura elegida)
    tubo = S.union(tubo, S.caja((di + 2 * t + 18, 14, 14), at=(0, 0, largo - 10)))
    tubo = S.resta(tubo, S.cilindro(M4, di + 2 * t + 24, at=(0, 0, largo - 10), eje="x"))
    for k in range(int(ag["bajante_carrera_ajuste"] / 10) + 1):
        z = largo - 26 - 10 * k
        tubo = S.resta(tubo, S.caja((1.2, di / 2 + t + 2, 1.2), at=(0, (di + 2 * t) / 2, z)))
    return tubo, "agua", {"cantidad": 1, "nota": "Marcas cada 10 mm: cada marca = 10 mm de nivel de agua."}


def agua_difusor(P, C):
    """Boca inferior del bajante: ventanas laterales, deflector y pies.

    Es la pieza que materializa el principio de Mariotte: mientras el agua tape
    las ventanas no entra aire y el bidón no vacía; al bajar el nivel entra aire
    por ellas y repone exactamente hasta volver a taparlas. El borde INFERIOR de
    las ventanas es, por tanto, la cota que fija el nivel del bebedero.
    """
    ag = P["agua"]
    di, t = ag["bajante_dia_int"], ag["bajante_pared"]
    alto, d_def = 34.0, di + 2 * t + 8.0
    d = S.tubo(di + 2 * t, di, alto, at=(0, 0, alto / 2))
    d = S.union(d, S.cilindro(d_def, 3.0, at=(0, 0, 1.5)))            # deflector
    for k in range(3):                                                # pies
        a = math.radians(120 * k + 45)
        r = d_def / 2 - 6
        d = S.union(d, S.caja((10, 6, 8), at=(r * math.cos(a), r * math.sin(a), -2.0)))
    d = S.union(d, S.tubo(di + 2 * t + 2 * 1.2, di + 2 * t + 0.7, 16.0, at=(0, 0, alto - 8)))
    for k in range(ag["difusor_ventanas"]):                           # ventanas
        a = math.radians(360 / ag["difusor_ventanas"] * k)
        w = S.caja((15, di + 2 * t + 20, 12), at=(0, 0, 11.0))
        w.apply_transform(trimesh.transformations.rotation_matrix(a, [0, 0, 1]))
        d = S.resta(d, w)
    return d, "agua", {"cantidad": 1,
                       "nota": "El borde INFERIOR de las ventanas (z=+5 mm de la pieza) fija el nivel del agua."}


# ===========================================================================
# Piezas — cabezal de ALIMENTO (cajón dosificador de cavidad fija)
# ===========================================================================

def _perfil_canal(P, C):
    """Sección del hueco por donde corre el cajón (cavidad + holgura)."""
    do = P["dosificador"]
    return C["corredera_ancho"] + 2 * do["corredera_holgura"], C["cavidad_z"] + do["corredera_holgura"]


def ali_canal_base(P, C):
    """Base del canal: piso, carriles, boca de descarga y torre del piñón."""
    do = P["dosificador"]
    W, L = C["canal_ancho"], C["canal_largo"]
    piso, pared = 6.0, do["canal_pared"]
    alto_carril = C["cavidad_z"] + do["corredera_holgura"]

    base = S.caja((W, L, piso), at=(0, 0, piso / 2))
    for s in (-1, 1):
        base = S.union(base, S.caja((pared, L, piso + alto_carril),
                                    at=(s * (W - pared) / 2, 0, (piso + alto_carril) / 2)))
    # boca de descarga (posición avanzada del cajón) con labios achaflanados
    yd = C["y_descarga"]
    base = S.resta(base, S.caja((do["cavidad_x"], do["cavidad_y"], piso + 6), at=(0, yd, piso / 2)))
    for s in (-1, 1):
        labio = S.prisma([(0, 0), (7, 0), (0, 7)], do["cavidad_x"] + 12, eje="x")
        labio.apply_transform(trimesh.transformations.rotation_matrix(
            math.pi if s > 0 else 0, [0, 0, 1]))
        labio.apply_translation([0, yd + s * do["cavidad_y"] / 2, 0])
        base = S.resta(base, labio)
    # ventana lateral por donde el piñón alcanza la cremallera del cajón
    base = S.resta(base, S.caja((3 * pared, do["pinon_ancho"] + 24, alto_carril + 2),
                                at=(-(W - pared) / 2, 0, piso + alto_carril / 2)))
    # torre del piñón: dos apoyos del eje vertical, arriba y abajo
    xp = C["x_pinon"]
    torre = S.caja((34, 40, piso + alto_carril + 26), at=(-xp, 0, (piso + alto_carril + 26) / 2))
    torre = S.union(torre, S.caja((xp - W / 2 + 20, 40, piso),
                                  at=(-(W / 2 + (xp - W / 2) / 2), 0, piso / 2)))
    base = S.union(base, torre)
    base = S.resta(base, S.caja((26, 30, alto_carril + 4),
                                at=(-xp, 0, piso + 2 + alto_carril / 2)))
    base = S.resta(base, S.cilindro(do["eje_pinon_entrecaras"] + 1.0, 200, at=(-xp, 0, 0)))
    # taladros de unión con la tapa
    for sx in (-1, 1):
        for sy in (-1, 1):
            base = S.resta(base, S.cilindro(M4, 3 * (piso + alto_carril),
                                            at=(sx * (W - pared) / 2, sy * (L / 2 - 12), 0)))
    # tres orejas a 0/120/240° donde apoyan las ménsulas de las columnas
    r_or = 95.0
    for k in range(3):
        a = math.radians(120 * k + 90)
        cx, cy = r_or * math.cos(a), r_or * math.sin(a)
        orej = S.caja((26, 26, piso), at=(cx, cy, piso / 2))
        puente = S.caja((22, 2 * r_or, piso), at=(0, 0, piso / 2))
        puente.apply_transform(trimesh.transformations.rotation_matrix(a - math.pi / 2, [0, 0, 1]))
        base = S.union(base, S.interseccion(
            puente, S.cilindro(2 * r_or + 26, piso + 2, at=(0, 0, piso / 2))), orej)
        base = S.resta(base, S.cilindro(M4, piso + 8, at=(cx, cy, piso / 2)))
    return base, "carcasa", {"cantidad": 1,
                             "nota": "Imprimir apoyada en el piso: carriles y torre salen sin soportes."}


def ali_canal_tapa(P, C):
    """Tapa del canal: boca de carga (tolva) y brida del adaptador del bidón."""
    do = P["dosificador"]
    W, L = C["canal_ancho"], C["canal_largo"]
    t = 6.0
    tapa = S.caja((W, L, t), at=(0, 0, t / 2))
    yc = C["y_carga"]
    tapa = S.resta(tapa, S.caja((do["cavidad_x"], do["cavidad_y"], t + 4), at=(0, yc, t / 2)))
    tapa = S.union(tapa, S.caja((do["cavidad_x"] + 20, do["cavidad_y"] + 20, 8), at=(0, yc, t + 4)))
    tapa = S.resta(tapa, S.caja((do["cavidad_x"], do["cavidad_y"], 24), at=(0, yc, t + 4)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            tapa = S.resta(tapa, S.cilindro(M4, 40, at=(sx * (do["cavidad_x"] / 2 + 5),
                                                        yc + sy * (do["cavidad_y"] / 2 + 5), t + 4)))
            tapa = S.resta(tapa, S.cilindro(M4, 30, at=(sx * (W - do["canal_pared"]) / 2,
                                                        sy * (L / 2 - 12), t / 2)))
    return tapa, "carcasa", {"cantidad": 1,
                             "nota": "Imprimir con la brida hacia arriba; sin soportes."}


def ali_corredera(P, C):
    """El cajón: cavidad de volumen calibrado, falda obturadora y cremallera.

    Es una CÁSCARA: piel superior continua (la que tapa la tolva mientras la
    dosis viaja) y paredes de la cavidad colgando hasta el piso del canal. Se
    imprime boca abajo: la cara que sella queda contra la cama, lisa y plana,
    que es justo lo que necesita para no dejar pasar croqueta.

    La cremallera va EMBUTIDA en un rebaje del flanco izquierdo: sus puntas
    quedan por dentro del plano de deslizamiento, así el piñón entra por la
    ventana del carril y nada roza.
    """
    do = P["dosificador"]
    W, Lp, h = C["corredera_ancho"], C["corredera_largo"], C["cavidad_z"]
    piel, y_cav = 5.0, C["y_cavidad_local"]
    c = S.caja((W, Lp, piel), at=(0, 0, h - piel / 2))          # piel obturadora
    marco = S.caja((do["cavidad_x"] + 12, do["cavidad_y"] + 12, h), at=(0, y_cav, h / 2))
    marco = S.resta(marco, S.caja((do["cavidad_x"], do["cavidad_y"], h + 6), at=(0, y_cav, h / 2)))
    c = S.union(c, marco)
    for s in (-1, 1):                                           # patines de guía
        c = S.union(c, S.caja((6, Lp, h), at=(s * (W - 6) / 2, 0, h / 2)))
    for dy in (do["cavidad_y"] / 2 + 24.0, C["falda_obturadora"] - 10.0):  # nervios de la falda
        c = S.union(c, S.caja((W - 12, 6, h), at=(0, y_cav - dy, h / 2)))
    c = S.resta(c, S.caja((do["cavidad_x"], do["cavidad_y"], h + 6), at=(0, y_cav, h / 2)))
    # bisel del canto de corte: la croqueta se desvía en vez de guillotinarse
    b = do["bisel_corte"]
    for s in (-1, 1):
        cuchilla = S.prisma([(0, 0), (2 * b, 0), (0, 2 * b)], do["cavidad_x"] + 8, eje="x")
        cuchilla.apply_transform(trimesh.transformations.rotation_matrix(
            math.pi if s > 0 else 0, [0, 0, 1]))
        cuchilla.apply_translation([0, y_cav + s * do["cavidad_y"] / 2, h])
        c = S.resta(c, cuchilla)
    # rebaje y cremallera en el flanco izquierdo
    prof = do["cremallera_empotre"] + do["modulo"] * 2.25 + do["cremallera_base"] + 3.0
    largo_r = C["cremallera_largo"] + 6.0
    c = S.resta(c, S.caja((prof, largo_r, h + 4),
                          at=(-W / 2 + prof / 2 - 0.01, C["y_cremallera_local"], h / 2)))
    cre = S.prisma(S.perfil_cremallera(do["modulo"], C["cremallera_dientes"], do["cremallera_base"] + 6.0,
                                       do["angulo_presion"], backlash=do["backlash"]), h - 1.0)
    # giro +90°: (x,y)→(−y,x), así la PUNTA del diente (+y del perfil) apunta a −x
    # y el largo de la cremallera queda sobre +Y (la dirección de la carrera)
    cre.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [0, 0, 1]))
    cre.apply_translation([-C["x_linea_primitiva"],
                           C["y_cremallera_local"] - C["cremallera_largo"] / 2, h / 2 - 0.5])
    c = S.union(c, cre)
    # tirador integrado: ranura para los dedos en la cola (no alarga la pieza)
    y_cola = -Lp / 2
    c = S.resta(c, S.caja((70, 16, piel + 4), at=(0, y_cola + 16, h - piel / 2)))
    c = S.union(c, S.caja((78, 6, 14), at=(0, y_cola + 8, h - 7)))
    # oreja de la biela: viaja SIEMPRE por detrás del canal, y por fuera de los
    # carriles, así que nunca se cruza con la tapa
    y_or = y_cola + 5.0
    voladizo = C["x_biela"] - W / 2
    c = S.union(c, S.caja((voladizo + 12, 10, 22), at=(W / 2 + voladizo / 2 - 6, y_or, h + 3)))
    c = S.resta(c, S.cilindro(4.3, 40, at=(C["x_biela"], y_or, h + 6), eje="x"))
    return c, "rotor", {"cantidad": 1,
                        "nota": f"Cavidad {do['cavidad_x']:.0f}x{do['cavidad_y']:.0f}x{h:.1f} mm "
                                f"= {C['volumen_cavidad_ml']:.0f} ml -> {C['dosis_g']:.0f} g por golpe. "
                                "Imprimir boca abajo (piel contra la cama)."}


def ali_inserto_dosis(P, C):
    """Inserto que reduce la cavidad a media dosis (encaja a presión)."""
    do = P["dosificador"]
    h = C["cavidad_z"]
    largo = do["cavidad_y"] / 2.0
    e = 2.4                                          # cáscara cerrada por arriba
    i = S.caja((do["cavidad_x"] - 0.4, largo - 0.4, h - 0.4), at=(0, 0, h / 2))
    i = S.resta(i, S.caja((do["cavidad_x"] - 0.4 - 2 * e, largo - 0.4 - 2 * e, h - e),
                          at=(0, 0, (h - e) / 2 - 1)))
    for s in (-1, 1):
        i = S.union(i, S.caja((10, 3.0, 3.0), at=(s * (do["cavidad_x"] / 2 - 6), 0, h - 1.2)))
    i = S.resta(i, S.cilindro(16, largo + 4, at=(0, 0, h - 8), eje="y"))
    return i, "rotor", {"cantidad": 1, "nota": f"Media dosis: {C['dosis_g'] / 2:.0f} g por golpe."}


def ali_pinon(P, C):
    """Piñón m2.5 z22 de eje vertical: convierte el barrido de la palanca en carrera."""
    do = P["dosificador"]
    p = S.engranaje(do["modulo"], do["pinon_z"], do["pinon_ancho"],
                    alfa_deg=do["angulo_presion"], backlash=do["backlash"])
    p = S.union(p, S.cilindro(26, 8, at=(0, 0, do["pinon_ancho"] / 2 + 4)))
    p = S.resta(p, S.prisma(S.hexagono(do["eje_pinon_entrecaras"] + 0.35), do["pinon_ancho"] + 20))
    return p, "engranaje", {"cantidad": 1,
                            "nota": f"O primitivo {C['pinon']['dia_primitivo']:.1f} mm, 20 grados, "
                                    f"backlash {do['backlash']} mm. Imprimir plano: 5 perimetros, 40% relleno."}


def ali_eje_pinon(P, C):
    """Eje hexagonal vertical del piñón (une piñón y palanca)."""
    do = P["dosificador"]
    largo = C["cavidad_z"] + 70.0
    e = S.prisma(S.hexagono(do["eje_pinon_entrecaras"]), largo)
    for s in (-1, 1):
        e = S.union(e, S.cilindro(do["eje_pinon_entrecaras"] - 0.3, 12, at=(0, 0, s * (largo / 2 - 6))))
    e = S.resta(e, S.cilindro(3.2, do["eje_pinon_entrecaras"] + 4, at=(0, 0, -largo / 2 + 6), eje="y"))
    return e, "engranaje", {"cantidad": 1, "nota": "Pasador O3 abajo: retiene el eje en la torre."}


def ali_palanca(P, C):
    """Palanca horizontal: un barrido completo = una dosis exacta."""
    do = P["dosificador"]
    L = do["palanca_largo"]
    p = S.caja((34, 34, 16))
    p = S.union(p, S.caja((16, L, 16), at=(0, L / 2 - 10, 0)))
    p = S.union(p, S.cilindro(30, 16, at=(0, L - 22, 0)))          # empuñadura vertical
    p = S.resta(p, S.cilindro(18, 20, at=(0, L - 22, 0)))
    p = S.resta(p, S.prisma(S.hexagono(do["eje_pinon_entrecaras"] + 0.3), 30))
    return p, "palanca", {"cantidad": 1,
                          "nota": f"Barrido util {C['palanca_barrido_deg']:.0f} grados = 1 dosis. "
                                  f"Ventaja mecanica {C['ventaja_palanca']:.1f}:1."}


def ali_adaptador_cuello(P, C):
    """Variante A: abraza el cuello moldeado del bidón y baja a la boca de carga.

    Es el camino recomendado si la croqueta es pequeña; el cuello del envase es
    la sección crítica y por eso el agitador es obligatorio (ver anti_arco).
    """
    do, bi, al = P["dosificador"], P["bidon"], P["alimento"]
    H = C["transicion_alto"]
    dcuello = bi["dia_boca_ext"]
    # cuerpo: pirámide truncada de la boca de carga (abajo) al cuello (arriba)
    inf = Polygon([(-do["cavidad_x"] / 2, -do["cavidad_y"] / 2), (do["cavidad_x"] / 2, -do["cavidad_y"] / 2),
                   (do["cavidad_x"] / 2, do["cavidad_y"] / 2), (-do["cavidad_x"] / 2, do["cavidad_y"] / 2)])
    ext = S.prisma(inf.buffer(5.0, join_style=2), 6.0, at=(0, 0, 3))       # brida inferior
    cono = _piramide_a_circulo(inf.buffer(5.0, join_style=2), dcuello / 2 + 5.0, 6.0, H - 6.0)
    hueco = _piramide_a_circulo(inf, dcuello / 2 - 2.0, 2.0, H)
    a = S.resta(S.union(ext, cono), hueco)
    # abrazadera partida sobre el cuello
    a = S.union(a, S.tubo(dcuello + 12.0, dcuello + 0.8, 26.0, at=(0, 0, H + 12)))
    a = S.resta(a, S.caja((2.5, dcuello + 20, 30), at=(0, (dcuello + 12) / 2, H + 12)))
    for s in (-1, 1):
        a = S.union(a, S.caja((16, 12, 26), at=(s * (dcuello / 2 + 10), 8, H + 12)))
        a = S.resta(a, S.cilindro(M4, 40, at=(s * (dcuello / 2 + 10), 8, H + 12), eje="y"))
    # apoyos del agitador (agujero pasante Ø8.5 en ambas paredes)
    za = C["z_agitador"] - C["z_tapa_sup"]
    a = S.resta(a, S.cilindro(8.6, do["cavidad_x"] + 60, at=(0, 0, za), eje="x"))
    for sx in (-1, 1):                                    # refuerzo del cojinete
        a = S.union(a, S.cilindro(20, 8, at=(sx * (do["cavidad_x"] / 2 - 4), 0, za), eje="x"))
    a = S.resta(a, S.cilindro(8.6, do["cavidad_x"] + 60, at=(0, 0, za), eje="x"))
    for sx in (-1, 1):
        for sy in (-1, 1):
            a = S.resta(a, S.cilindro(M4, 14, at=(sx * (do["cavidad_x"] / 2 + 5),
                                                  sy * (do["cavidad_y"] / 2 + 5), 3)))
    return a, "carcasa", {"cantidad": 1,
                          "nota": f"Pared a {al['angulo_pared_tolva_deg']:.0f}° (flujo másico). "
                                  "Imprimir invertida (brida arriba): sin soportes."}


def _piramide_a_circulo(poly_inf: Polygon, r_sup: float, z0: float, alto: float, segs: int = 64):
    """Sólido de transición entre un contorno rectangular y uno circular.

    Cada generatriz une puntos del MISMO ángulo polar (rayo desde el centro),
    así la superficie reglada no se retuerce y el sólido queda cerrado.
    """
    from shapely.geometry import LineString, Point
    cx, cy = poly_inf.centroid.x, poly_inf.centroid.y
    borde = poly_inf.exterior
    lejos = 4.0 * max(poly_inf.bounds[2] - poly_inf.bounds[0], poly_inf.bounds[3] - poly_inf.bounds[1]) + r_sup
    low, up = [], []
    for k in range(segs):
        th = 2 * math.pi * k / segs
        rayo = LineString([(cx, cy), (cx + lejos * math.cos(th), cy + lejos * math.sin(th))])
        inter = borde.intersection(rayo)
        p = inter if isinstance(inter, Point) else (
            min(inter.geoms, key=lambda g: g.distance(Point(cx, cy))) if hasattr(inter, "geoms") else
            Point(inter.coords[0]))
        low.append([p.x, p.y])
        up.append([cx + r_sup * math.cos(th), cy + r_sup * math.sin(th)])
    low, up = np.asarray(low), np.asarray(up)
    v = np.vstack([np.c_[low, np.full(segs, z0)], np.c_[up, np.full(segs, z0 + alto)]])
    f = []
    for k in range(segs):
        k2 = (k + 1) % segs
        f += [[k, k2, segs + k], [k2, segs + k2, segs + k]]
    for k in range(1, segs - 1):                          # tapas
        f += [[0, k + 1, k], [segs, segs + k, segs + k + 1]]
    m = trimesh.Trimesh(vertices=v, faces=f, process=True)
    m.fix_normals()
    return m


def ali_adaptador_hombro(P, C):
    """Variante B: el bidón se corta en el hombro (Ø152) y se apoya en este cono.

    Elimina el cuello como sección crítica: la abertura estática mínima pasa a
    ser la propia boca de carga, que sí cumple el criterio anti-arco.
    """
    do, al = P["dosificador"], P["alimento"]
    d_corte = 152.0
    ang = math.radians(al["angulo_pared_tolva_deg"])
    H = (d_corte / 2 - do["cavidad_x"] / 2) * math.tan(ang)
    H = max(H, C["transicion_alto"])
    inf = Polygon([(-do["cavidad_x"] / 2, -do["cavidad_y"] / 2), (do["cavidad_x"] / 2, -do["cavidad_y"] / 2),
                   (do["cavidad_x"] / 2, do["cavidad_y"] / 2), (-do["cavidad_x"] / 2, do["cavidad_y"] / 2)])
    ext = S.prisma(inf.buffer(5.0, join_style=2), 6.0, at=(0, 0, 3))
    cono = _piramide_a_circulo(inf.buffer(5.0, join_style=2), d_corte / 2 + 5.0, 6.0, H - 6.0)
    hueco = _piramide_a_circulo(inf, d_corte / 2, 2.0, H)
    a = S.resta(S.union(ext, cono), hueco)
    # garganta de recepción del canto cortado del envase (apoya por gravedad)
    a = S.union(a, S.tubo(d_corte + 14.0, d_corte + 2.0, 20.0, at=(0, 0, H + 9)))
    za = C["z_agitador"] - C["z_tapa_sup"]
    a = S.resta(a, S.cilindro(8.6, d_corte + 40, at=(0, 0, za), eje="x"))
    for sx in (-1, 1):
        for sy in (-1, 1):
            a = S.resta(a, S.cilindro(M4, 14, at=(sx * (do["cavidad_x"] / 2 + 5),
                                                  sy * (do["cavidad_y"] / 2 + 5), 3)))
    return a, "carcasa", {"cantidad": 1,
                          "nota": "Alternativa: cortar el envase donde mide Ø152 y apoyarlo aquí. "
                                  "Mejor flujo, pero el corte queda a la vista y hay que desbarbarlo."}


def ali_agitador(P, C):
    """Rompe-arcos: cuatro dedos que barren la garganta en cada golpe."""
    do = P["dosificador"]
    largo = C["agitador_largo"]
    eje = S.cilindro(8.0, largo, eje="x")
    r = do["agitador_dia"] / 2.0
    for k in range(do["agitador_dedos"]):
        a = 2 * math.pi * k / do["agitador_dedos"]
        for x in (-do["cavidad_x"] / 4, do["cavidad_x"] / 4):
            dedo = S.caja((7, 5, r), at=(x, 0, r / 2))
            dedo.apply_transform(trimesh.transformations.rotation_matrix(a, [1, 0, 0]))
            eje = S.union(eje, dedo)
    eje = S.union(eje, S.prisma(S.hexagono(8.0), 18, at=(largo / 2 + 9, 0, 0), eje="x"))
    return eje, "rotor", {"cantidad": 1,
                          "nota": "Gira ~130° por golpe: rompe el puente de croquetas en el cuello."}


def ali_manivela(P, C):
    """Manivela del agitador: la carrera del cajón la hace dar una vuelta entera."""
    r = C["manivela_radio"]
    m = S.caja((8, r + 22, 14), at=(0, r / 2, 0))
    m = S.union(m, S.cilindro(20, 8, eje="x"))
    m = S.resta(m, S.prisma(S.hexagono(8.3), 20, eje="x"))
    m = S.union(m, S.cilindro(14, 8, at=(0, r, 0), eje="x"))
    m = S.resta(m, S.cilindro(4.3, 20, at=(0, r, 0), eje="x"))
    return m, "palanca", {"cantidad": 1,
                          "nota": f"Radio {r:.1f} mm (calculado): con la biela de "
                                  f"{C['biela_largo']:.0f} mm da una vuelta completa por golpe."}


def ali_biela(P, C):
    """Biela cajón → manivela del agitador (largo calculado, no elegido)."""
    do = P["dosificador"]
    largo = C["biela_largo"]
    b = S.caja((do["biela_espesor"], largo, do["biela_ancho"]), at=(0, largo / 2, 0))
    for y in (0.0, largo):
        b = S.union(b, S.cilindro(do["biela_ancho"] + 6, do["biela_espesor"], at=(0, y, 0), eje="x"))
        b = S.resta(b, S.cilindro(4.3, do["biela_espesor"] + 6, at=(0, y, 0), eje="x"))
    return b, "palanca", {"cantidad": 1,
                          "nota": f"Entre ejes {largo:.1f} mm. Unir con M4 y tuerca FLOJA: "
                                  "es una articulación, no un apriete."}


def _rect(x0, x1, y0, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def ali_chute(P, C):
    """Canaleta de descarga: cuelga bajo la boca y lleva la dosis al plato.

    Se construye hacia ABAJO desde la brida de montaje (z=0 local): boca
    superior igual a la de descarga, boca inferior más ancha y adelantada.
    """
    do = P["dosificador"]
    x0, y0 = do["cavidad_x"] / 2, do["cavidad_y"] / 2
    caida, avance, e = 95.0, 55.0, 3.5
    sup = _rect(-x0, x0, -y0, y0)
    inf = _rect(-x0 - 12, x0 + 12, -y0 + avance, y0 + avance + 26)
    sup_i = _rect(-x0 + e, x0 - e, -y0 + e, y0 - e)
    inf_i = _rect(-x0 - 12 + e, x0 + 12 - e, -y0 + avance + e, y0 + avance + 26 - e)
    c = S.resta(S.loft(inf, sup, -caida, 0.0), S.loft(inf_i, sup_i, -caida - 6.0, 6.0))
    # brida de montaje bajo la base del canal
    brida = S.caja((do["cavidad_x"] + 34, do["cavidad_y"] + 34, 5.0), at=(0, 0, -2.5))
    brida = S.resta(brida, S.caja((do["cavidad_x"] - 2 * e, do["cavidad_y"] - 2 * e, 14)))
    c = S.union(c, brida)
    for sx in (-1, 1):
        for sy in (-1, 1):
            c = S.resta(c, S.cilindro(M4, 14, at=(sx * (x0 + 11), sy * (y0 + 11), -2.5)))
    return c, "bandeja", {"cantidad": 1,
                          "nota": "Se atornilla bajo la boca de descarga; entrega a ~95 mm por debajo "
                                  "y 55 mm por delante. Imprimir con la boca ancha sobre la cama."}


# ===========================================================================
# Registro de piezas y ensambles
# ===========================================================================

PIEZAS = {
    "est_anillo_segmento": est_anillo_segmento,
    "est_barra": est_barra,
    "est_pie": est_pie,
    "est_collar_cuello": est_collar_cuello,
    "est_soporte_cabezal": est_soporte_cabezal,
    "est_escuadra_muro": est_escuadra_muro,
    "agua_bebedero": agua_bebedero,
    "agua_boquilla": agua_boquilla,
    "agua_bajante": agua_bajante,
    "agua_tubo_nivel": agua_tubo_nivel,
    "agua_difusor": agua_difusor,
    "ali_canal_base": ali_canal_base,
    "ali_canal_tapa": ali_canal_tapa,
    "ali_corredera": ali_corredera,
    "ali_inserto_dosis": ali_inserto_dosis,
    "ali_pinon": ali_pinon,
    "ali_eje_pinon": ali_eje_pinon,
    "ali_palanca": ali_palanca,
    "ali_adaptador_cuello": ali_adaptador_cuello,
    "ali_adaptador_hombro": ali_adaptador_hombro,
    "ali_agitador": ali_agitador,
    "ali_manivela": ali_manivela,
    "ali_biela": ali_biela,
    "ali_chute": ali_chute,
}


# Orientación de impresión: las piezas se modelan en su posición de MONTAJE y
# se exportan giradas a como se apoyan en la cama. `IMPRIMIR` guarda ese giro
# (grados) para que el STL salga listo para laminar sin tocar nada.
IMPRIMIR = {
    "ali_agitador": {"ry": 90},        # eje vertical: las aspas quedan verticales
    "ali_biela": {"ry": 90},
    "ali_manivela": {"ry": 90},
    "ali_inserto_dosis": {"rx": 180},  # boca abierta hacia arriba: sin puente
    "agua_boquilla": {"rx": 180},      # el encastre arriba, la brida en la cama
    "est_escuadra_muro": {"rx": -90},
}


def orientar_para_imprimir(mesh, meta: dict):
    giro = IMPRIMIR.get(meta.get("_id", ""), meta.get("imprimir"))
    if not giro:
        return mesh
    m = mesh.copy()
    for k, ax in (("rx", [1, 0, 0]), ("ry", [0, 1, 0]), ("rz", [0, 0, 1])):
        if giro.get(k):
            m.apply_transform(trimesh.transformations.rotation_matrix(math.radians(giro[k]), ax))
    m.apply_translation([0, 0, -m.bounds[0][2]])       # apoyada en z=0
    return m


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    proj = project_dir(sys.argv[1])
    args = sys.argv[2:]
    solo = args[args.index("--solo") + 1] if "--solo" in args else None
    stl = "--sin-stl" not in args

    P = json.loads((proj / "input" / "params.json").read_text(encoding="utf-8"))
    C = calculos(P)
    (proj / "out").mkdir(exist_ok=True)
    (proj / "out" / "CALCULOS.json").write_text(
        json.dumps({"generado": now_iso(), "calculos": C}, indent=2, ensure_ascii=False), encoding="utf-8")

    destino = proj / "out" / "piezas"
    cama = P["impresion"]["cama_mm"]
    indice, fallas = {}, []
    for nombre, fn in PIEZAS.items():
        if solo and solo not in nombre:
            continue
        mesh, color, meta = fn(P, C)
        meta["_id"] = nombre
        mesh = orientar_para_imprimir(mesh, meta)
        r = S.exportar(mesh, destino, nombre, S.COLORES.get(color, "#9e9e9e"), stl=stl)
        m = r["metricas"]
        bbox = sorted(m["bbox_mm"], reverse=True)
        cabe = all(b <= c for b, c in zip(bbox, sorted(cama, reverse=True)))
        m |= {"cabe_en_cama": cabe, "masa_pla_g": S.masa_pla_g(mesh, P["impresion"]["relleno_pct"] / 100.0)}
        indice[nombre] = {"metricas": m, **meta,
                          "archivos": {k: str(v.relative_to(proj)) for k, v in r["rutas"].items()}}
        if not m["estanca"]:
            fallas.append(f"{nombre}: malla no estanca")
        if not cabe:
            fallas.append(f"{nombre}: {m['bbox_mm']} no cabe en la cama {cama}")
        print(f"  {nombre:24s} {m['bbox_mm']}  {m['masa_pla_g']:6.1f} g PLA"
              f"{'' if m['estanca'] else '  ¡NO ESTANCA!'}{'' if cabe else '  ¡NO CABE!'}")

    total = sum(v["metricas"]["masa_pla_g"] * v.get("cantidad", 1) for v in indice.values())
    (destino / "INDICE.json").write_text(json.dumps(
        {"proyecto": proj.name, "generado": now_iso(), "capa": "user",
         "piezas": indice, "masa_pla_total_g": round(total, 1)},
        indent=2, ensure_ascii=False), encoding="utf-8")

    audit(proj, "CAD", f"generadas {len(indice)} piezas paramétricas del dispensador",
          "OK" if not fallas else "CON_ADVERTENCIAS",
          piezas=len(indice), masa_pla_g=round(total, 1), advertencias=fallas,
          hash_indice=sha256_file(destino / "INDICE.json"))
    print(f"\n{len(indice)} piezas → {destino}")
    print(f"PLA estimado (todas las unidades): {total:.0f} g")
    print(f"Dosis por golpe: {C['dosis_g']:.0f} g (rango según alimento: "
          f"{C['dosis_rango_g'][0]:.0f}-{C['dosis_rango_g'][1]:.0f} g)")
    if fallas:
        print("\nADVERTENCIAS:")
        for f in fallas:
            print(f"  - {f}")


if __name__ == "__main__":
    main()
