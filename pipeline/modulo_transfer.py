"""Módulo de transferencia omni + correas, insertable en roller conveyor (BF).

DISEÑO (capa `user`) parametrizado. Lecturas del pedido y esquema de alturas:
`projects/<X>/DECISIONES.md`. Sentido de avance: hileras de ruedas omni Ø58
sobre ejes hexagonales de 1/2" (RUEDA-OMNI-58). Sentido de desvío: correas
transversales en los huecos entre ejes, movidas por un eje común inferior con
tracción en cabeza con snub. Dos motores Unidrive (ZP2026): uno por sentido.

Produce en `projects/<X>/out/modulo/`:
  - STL por pieza fabricada + desarrollo de chapa DXF de los canales
  - conjunto.glb (instanciado), renders PNG, catálogo PDF, BOM, LEEME y zip
  - verificaciones: encaje en BF, coplanaridad de tangentes, apoyo de la caja
    mínima, interferencias entre trenes, y estanqueidad de STL releídos

uso: python pipeline/modulo_transfer.py projects/<X> [opciones]
  --bf <mm>            luz entre bastidores del transportador (def: 533.4 = 21")
  --holgura-bf <mm>    holgura por lado al insertar (def: 3)
  --alto <mm>          alto del alma del canal (def: 165.1 = 6.5")
  --espesor <mm>       espesor de chapa del canal (def: 3)
  --pestana-sup <mm>   pestaña superior, hacia afuera (def: 35.56 = 1.4")
  --pestana-inf <mm>   pestaña inferior, hacia afuera (def: 38.1 = 1.5")
  --resalte <mm>       tangente sobre la cara sup. de la pestaña (def: 0 = rasante)
  --hex <mm>           entrecaras del eje hexagonal (def: 12.7 = 1/2")
  --ejes <n>           número de ejes omni (def: 4)
  --paso <mm>          paso entre ejes omni (def: 110)
  --banda <mm>         ancho de la correa (def: 35, la del transfer90)
  --desnivel-correas <mm>  lomo de correa BAJO la tangente omni (def: 0 =
                       coplanar; con 1-1.5 el avance no arrastra las correas
                       paradas, a costa de exigir caja rígida al desviar)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import audit, now_iso, project_dir, sha256_file
from rueda_omni import opt
import rueda_omni_piezas as RP

IN = 25.4
K_PLIEGUE = 0.44          # factor K del desarrollo (declarado; chapa suave 90°)

COL = {
    "canal":    [176, 186, 196, 255],   # acero pintado gris claro
    "tapa":     [225, 229, 233, 255],
    "soporte":  [64, 120, 192, 255],    # bloques mecanizados, azul
    "eje":      [156, 163, 170, 255],
    "rueda_pl": [235, 235, 235, 255],
    "rueda_ro": [45, 45, 50, 255],
    "correa":   [38, 40, 44, 255],
    "polea":    [156, 166, 178, 255],
    "spool":    [216, 140, 60, 255],
    "oring":    [200, 60, 60, 255],
    "linea":    [140, 148, 156, 255],
    "motor":    [70, 74, 80, 255],
}


# ---------------------------------------------------------------------------
# Chapa plegada: canal en C con pestañas desiguales + desarrollo
# ---------------------------------------------------------------------------

def canal_c(largo, alto, p_sup, p_inf, t, agujeros_alma=(), recortes_alma=(),
            solido=False):
    """Canal en C de chapa `t`, alma en el plano YZ local (X = espesor hacia
    afuera, Y = largo, Z = alto). Pestañas horizontales hacia +X (afuera).

    `agujeros_alma`: [(y, z, dia)] taladros en el alma.
    `recortes_alma`: [shapely.Polygon en (y, z)] ventanas en el alma.
    Devuelve (malla, desarrollo) con el desarrollo como dict de polilíneas
    2D listas para DXF (contorno + líneas de pliegue), plegado rígido con
    BA = pi/2 * (R + K*t), R = t."""
    import trimesh
    from shapely.geometry import box as sbox
    from shapely.geometry import Point
    from shapely.ops import unary_union

    alma2d = sbox(0, 0, largo, alto)
    hu = [Point(y, z).buffer(d / 2, quad_segs=24) for (y, z, d) in agujeros_alma]
    hu += list(recortes_alma)
    if hu:
        alma2d = alma2d.difference(unary_union(hu))
    alma = trimesh.creation.extrude_polygon(alma2d, t)
    # a plano YZ: la extrusión sale en XY con +Z de espesor
    alma.apply_transform(np.array([[0, 0, 1, 0], [1, 0, 0, 0],
                                   [0, 1, 0, 0], [0, 0, 0, 1.0]], float))
    piezas = [alma]
    for z0, ancho, hacia_arriba in ((alto - t, p_sup, False), (0.0, p_inf, True)):
        ala = trimesh.creation.box((ancho, largo, t))
        z = z0 + (t / 2 if hacia_arriba else t / 2)
        ala.apply_translation((t + ancho / 2 - 0.0, largo / 2, z0 + t / 2))
        piezas.append(ala)
    if solido:
        m = trimesh.boolean.union(piezas)           # estanco, para STL
    else:
        m = trimesh.util.concatenate(piezas)        # rápido, para el ensamble
    m.visual.face_colors = COL["canal"]

    # Desarrollo con deducción estándar: cada pliegue a 90° resta (R+t) a las
    # DOS cotas exteriores que une y añade BA = pi/2*(R + K*t), con R = t.
    R = t
    ba = math.pi / 2 * (R + K_PLIEGUE * t)
    ala_inf = p_inf - (R + t)
    ala_sup = p_sup - (R + t)
    alma_des = alto - 2 * (R + t)
    des_alto = ala_inf + ba + alma_des + ba + ala_sup
    contorno = [(0, 0), (largo, 0), (largo, des_alto), (0, des_alto)]
    y1 = ala_inf + ba / 2                            # líneas de pliegue (centro)
    y2 = ala_inf + ba + alma_des + ba / 2
    pliegues = [((0, y1), (largo, y1)), ((0, y2), (largo, y2))]
    desarrollo = {"contorno": contorno, "pliegues": pliegues,
                  "agujeros": [(y, ala_inf + ba + (z - (R + t)), dia)
                               for (y, z, dia) in agujeros_alma],
                  "ba_mm": round(ba, 3), "k": K_PLIEGUE, "radio": R,
                  "nota": "validar BA con probeta antes de cortar la serie"}
    return m, desarrollo


def placa(poly, t, color):
    import trimesh
    m = trimesh.creation.extrude_polygon(poly, t)
    m.visual.face_colors = COL[color]
    return m


def hex_prisma(entrecaras, largo, color="eje"):
    """Prisma hexagonal de eje Y (el eje de las ruedas)."""
    import trimesh
    from shapely.geometry import Polygon
    rc = entrecaras / math.sqrt(3)
    hexa = Polygon([(rc * math.cos(math.radians(60 * k + 30)),
                     rc * math.sin(math.radians(60 * k + 30))) for k in range(6)])
    m = trimesh.creation.extrude_polygon(hexa, largo)
    m.apply_transform(trimesh.transformations.rotation_matrix(-math.pi / 2, [1, 0, 0]))
    m.visual.face_colors = COL[color]
    return m


def rueda_omni_malla(par_rueda: dict) -> "object":
    """Rueda omni completa (placas + rodillos) como UNA malla visual, centrada
    en el origen con el eje en Y. Reutiliza la geometría de RUEDA-OMNI-58."""
    import trimesh
    d = par_rueda
    g, u, h = d["derivado"], d["decidido_por_el_usuario"], d["heredado_de_la_foto"]
    piezas, _, _ = RP.construir(d, 0.4)
    mallas = []
    for nombre, (m, tipo) in piezas.items():
        if tipo == "montaje" or tipo == "placa":
            mm = m.copy()
            mallas.append(mm)
    rueda = trimesh.util.concatenate(mallas)
    # centrar: el paquete se construye de z=0 hacia arriba con eje Z
    rueda.apply_translation((0, 0, -g["espesor_paquete_placas"] / 2))
    rueda.apply_transform(trimesh.transformations.rotation_matrix(
        -math.pi / 2, [1, 0, 0]))                    # eje de giro a Y
    return rueda


def trayectoria_correa(circulos, segs_hints, n_arc=28):
    """Polilínea cerrada del EJE de una correa que envuelve círculos en un
    plano (x, z), con la topología DECLARADA por el diseño:

    - `circulos` = [(cx, cz, r, pista_arco_deg)]: pista_arco = ángulo de un
      punto interior del arco de contacto (0°=+x, 90°=+z).
    - `segs_hints[i]` = (salida_deg, llegada_deg): ángulos aproximados del
      punto de tangencia al salir del círculo i y llegar al i+1.

    Para cada pareja se evalúan las 4 tangentes comunes (2 externas, 2
    internas) y se toma la más próxima a las pistas del segmento; el arco de
    cada círculo es el que contiene su pista de arco. Sin convenciones de
    signo: determinista y auditable."""
    n = len(circulos)

    def candidatas(c1, c2):
        (x1, z1, r1, _), (x2, z2, r2, _) = c1, c2
        dx, dz = x2 - x1, z2 - z1
        d = math.hypot(dx, dz)
        ang = math.atan2(dz, dx)
        out = []
        for tipo, cc in (("ext", (r1 - r2) / d), ("int", (r1 + r2) / d)):
            if abs(cc) > 1:
                continue
            for rama in (+1, -1):
                h = rama * math.sqrt(max(1 - cc * cc, 0.0))
                nx = math.cos(ang) * cc - math.sin(ang) * h
                nz = math.sin(ang) * cc + math.cos(ang) * h
                sg = 1.0 if tipo == "ext" else -1.0
                out.append(((x1 + r1 * nx, z1 + r1 * nz),
                            (x2 + sg * r2 * nx, z2 + sg * r2 * nz)))
        return out

    def dist_ang(a, b):
        d = abs(a - b) % (2 * math.pi)
        return min(d, 2 * math.pi - d)

    tangentes = []
    for i in range(n):
        c1, c2 = circulos[i], circulos[(i + 1) % n]
        h_sal, h_lleg = segs_hints[i]
        mejor = None
        for p1, p2 in candidatas(c1, c2):
            a1 = math.atan2(p1[1] - c1[1], p1[0] - c1[0])
            a2 = math.atan2(p2[1] - c2[1], p2[0] - c2[0])
            costo = dist_ang(a1, math.radians(h_sal)) + \
                dist_ang(a2, math.radians(h_lleg))
            if mejor is None or costo < mejor[0]:
                mejor = (costo, p1, p2)
        tangentes.append((mejor[1], mejor[2]))

    pts = []
    for i in range(n):
        x, z, r, pista = circulos[i]
        lleg, sal = tangentes[i - 1][1], tangentes[i][0]
        a0 = math.atan2(lleg[1] - z, lleg[0] - x)
        a1 = math.atan2(sal[1] - z, sal[0] - x)
        ph = math.radians(pista)
        cw = (a0 - a1) % (2 * math.pi)
        ccw = (a1 - a0) % (2 * math.pi)
        en_ccw = (ph - a0) % (2 * math.pi) <= ccw + 1e-9
        sweep = ccw if en_ccw else -cw
        for k in range(n_arc + 1):
            a = a0 + sweep * k / n_arc
            pts.append((x + r * math.cos(a), z + r * math.sin(a)))
    return pts


def envolturas_lazo(circulos, segs_hints):
    """Ángulo de contacto (grados) por círculo, con la misma construcción."""
    n = len(circulos)
    pts = trayectoria_correa(circulos, segs_hints, n_arc=2)
    env = []
    for i in range(n):
        x, z, r, _ = circulos[i]
        arco = pts[i * 3:(i + 1) * 3]
        a0 = math.atan2(arco[0][1] - z, arco[0][0] - x)
        am = math.atan2(arco[1][1] - z, arco[1][0] - x)
        a1 = math.atan2(arco[2][1] - z, arco[2][0] - x)
        ccw01 = (a1 - a0) % (2 * math.pi)
        ccw0m = (am - a0) % (2 * math.pi)
        total = ccw01 if ccw0m <= ccw01 + 1e-9 else (a0 - a1) % (2 * math.pi)
        env.append(round(math.degrees(total), 1))
    return env


def correa_solido(circulos, segs_hints, ancho, espesor, y_centro):
    """Sólido de la correa: eje de trayectoria bufferizado ± espesor/2 y
    extruido `ancho` en Y, colocado con el plano de la correa en y_centro."""
    import trimesh
    from shapely.geometry import LinearRing
    eje = trayectoria_correa(circulos, segs_hints)
    banda2d = LinearRing(eje).buffer(espesor / 2, quad_segs=8,
                                     join_style=1, cap_style=1)
    m = trimesh.creation.extrude_polygon(banda2d, ancho)
    # extruido en (x, z) con espesor en +Z -> plano XZ con el ancho en Y
    m.apply_transform(np.array([[1, 0, 0, 0], [0, 0, -1, 0],
                                [0, 1, 0, 0], [0, 0, 0, 1.0]], float))
    m.apply_translation((0, y_centro + ancho, 0))
    m.visual.face_colors = COL["correa"]
    return m


def polea(dia, ancho, bore, crown=0.3, color="polea"):
    """Polea plana de eje Y centrada, con bombeo (crown) de autocentrado:
    la banda plana deriva sin él (REVISION_INGENIERIA §2)."""
    import trimesh
    r, h = dia / 2, ancho
    perfil = [[bore / 2, -h / 2], [r, -h / 2], [r + crown, 0.0],
              [r, h / 2], [bore / 2, h / 2], [bore / 2, -h / 2]]
    ext = trimesh.creation.revolve(np.array(perfil[::-1]), sections=64)
    ext.apply_transform(trimesh.transformations.rotation_matrix(
        -math.pi / 2, [1, 0, 0]))
    ext.visual.face_colors = COL[color]
    return ext


def oring_solido(c1, c2, r_polea1, r_polea2, cuerda, plano_x, eje="x"):
    """O-ring entre dos poleas: trayectoria por tangentes en el plano YZ
    (centros (y, z)), sección `cuerda`, colocado en x = plano_x."""
    import trimesh
    from shapely.geometry import LinearRing
    a12 = math.degrees(math.atan2(c2[1] - c1[1], c2[0] - c1[0]))
    circ = [(c1[0], c1[1], r_polea1 + cuerda / 2, a12 + 180.0),
            (c2[0], c2[1], r_polea2 + cuerda / 2, a12)]
    hints = [(a12 - 90.0, a12 - 90.0), (a12 + 90.0, a12 + 90.0)]
    eje2d = trayectoria_correa(circ, hints, n_arc=18)
    banda = LinearRing(eje2d).buffer(cuerda / 2, quad_segs=6)
    m = trimesh.creation.extrude_polygon(banda, cuerda)
    # extruido en (y, z) plano XY -> a plano YZ con espesor en X
    m.apply_transform(np.array([[0, 0, 1, 0], [1, 0, 0, 0],
                                [0, 1, 0, 0], [0, 0, 0, 1.0]], float))
    m.apply_translation((plano_x - cuerda / 2, 0, 0))
    m.visual.face_colors = COL["oring"]
    return m


def spool_2g(dia, ancho, bore, prof_gar=3.0, ancho_gar=5.5, hex_bore=None):
    """Spool de dos gargantas para o-ring (eje Y, centrado). Con `hex_bore` el
    barreno es HEXAGONAL (entrecaras) — lo que el STL diga es lo que se
    mecaniza, no la nota de la BOM."""
    import trimesh
    from shapely.geometry import box as sbox
    r, h = dia / 2, ancho
    perfil = sbox(0.0, -h / 2, r, h / 2)
    for yg in (-h * 0.20, h * 0.20):
        perfil = perfil.difference(sbox(r - prof_gar, yg - ancho_gar / 2,
                                        r + 1, yg + ancho_gar / 2))
    m = trimesh.creation.revolve(np.array(list(perfil.exterior.coords))[::-1],
                                 sections=48)
    corte = _hex_z(hex_bore, h * 2) if hex_bore else \
        trimesh.creation.cylinder(radius=bore / 2, height=h * 2, sections=32)
    m = trimesh.boolean.difference([m, corte])
    m.apply_transform(trimesh.transformations.rotation_matrix(
        -math.pi / 2, [1, 0, 0]))
    m.visual.face_colors = COL["spool"]
    return m


def _hex_z(entrecaras, largo):
    """Prisma hexagonal de eje Z centrado (para barrenos)."""
    import trimesh
    from shapely.geometry import Polygon
    rc = entrecaras / math.sqrt(3)
    hexa = Polygon([(rc * math.cos(math.radians(60 * k + 30)),
                     rc * math.sin(math.radians(60 * k + 30))) for k in range(6)])
    m = trimesh.creation.extrude_polygon(hexa, largo)
    m.apply_translation((0, 0, -largo / 2))
    return m


def rueda_lod(R, a, largo, n_rod, desfase, ancho_paquete, hex_mm):
    """Rueda omni simplificada para el ensamble (malla ligera): dos hileras de
    barriles + paquete central. La geometría fina vive en RUEDA-OMNI-58."""
    import trimesh
    from shapely.geometry import Point
    piezas = []
    ts = np.linspace(-largo / 2, largo / 2, 9)
    perfil = [[0.0, ts[0]]] + [[RP.rho(t, R, a), t] for t in ts] + [[0.0, ts[-1]]]
    barril = trimesh.creation.revolve(np.array(perfil), sections=14)
    paso = 360 / n_rod
    sep = 12.0                                   # separación real de planos
    for k in range(n_rod):
        for hil, (dz, off) in enumerate(((-sep / 2, 0.0), (sep / 2, desfase))):
            b = barril.copy()
            b.apply_transform(trimesh.transformations.rotation_matrix(
                math.pi / 2, [1, 0, 0]))
            b.apply_translation((a, 0, dz))
            b.apply_transform(trimesh.transformations.rotation_matrix(
                math.radians(off + k * paso), [0, 0, 1]))
            b.visual.face_colors = COL["rueda_ro"]
            piezas.append(b)
    nucleo = trimesh.creation.extrude_polygon(
        Point(0, 0).buffer(2 * a - R - 1.5, quad_segs=24).difference(
            Point(0, 0).buffer(hex_mm / math.sqrt(3), quad_segs=6)),
        ancho_paquete)
    nucleo.apply_translation((0, 0, -ancho_paquete / 2))
    nucleo.visual.face_colors = COL["rueda_pl"]
    piezas.append(nucleo)
    m = trimesh.util.concatenate(piezas)
    m.apply_transform(trimesh.transformations.rotation_matrix(
        -math.pi / 2, [1, 0, 0]))                # eje de giro a Y... (X al colocar)
    return m


# ---------------------------------------------------------------------------
# Diseño: todas las coordenadas del módulo salen de aquí, con justificación
# ---------------------------------------------------------------------------

# Rueda omni del proyecto RUEDA-OMNI-58, redeclarada AQUÍ como parámetros de
# diseño de este módulo (regla: no se leen datos de otro proyecto).
RUEDA = {"R": 29.0, "a": 22.96, "largo_rodillo": 19.66, "n_rodillos": 5,
         "desfase_deg": 36.0, "ancho_paquete": 18.0, "ancho_total": 24.08,
         "hex_barreno": 12.85}

# UniDrive ONE — ficha S-UD23062200R01 (citada en cad/ejemplos, capa user)
UNIDRIVE = {"cuerpo_dia": 118.0, "cuerpo_largo": 62.7, "boss_dia": 39.5,
            "eje_d": 12.69, "patron": (152.7, 139.7), "perno": 7.94}

FR8 = {"od": 28.575, "brida_od": 31.12, "ancho": 7.92, "brida_esp": 1.57}
ORING = 4.76                      # cuerda 3/16" (web_facts wf06)
UCFL204 = {"brida": (86, 30, 12), "cubo_dia": 42, "cubo_alto": 31,
           "collar_dia": 34, "collar_alto": 12, "paso": 64, "perno_dia": 11}


def disenar_modulo(p: dict) -> dict:
    """Resuelve el layout completo. Devuelve el diccionario de diseño con cada
    decisión y su porqué (va tal cual a piezas.json)."""
    bf, holg = p["bf"], p["holgura_bf"]
    alto, t = p["alto"], p["espesor"]
    ps, pi = p["pestana_sup"], p["pestana_inf"]
    ancho_total = bf - 2 * holg
    luz = ancho_total - 2 * pi - 2 * t          # entre caras internas de almas
    tangente = alto + p["resalte"]
    z_eje = tangente - RUEDA["R"]

    n_ejes, paso = p["ejes"], p["paso"]
    bahia = 146.0                               # bahía de motores (cola):
    # el patrón UniDrive (152.7) + holguras a casete 3 y mampara mandan
    L = n_ejes * paso + bahia
    ejes_y = [paso / 2 + i * paso for i in range(n_ejes)]
    correas_y = [paso * (i + 1) for i in range(n_ejes - 1)]

    # --- planta de ruedas: tresbolillo, tren de o-rings junto al alma B -----
    ruedas = []
    for i, ye in enumerate(ejes_y):
        xs = [36 + k * 74 for k in range(5)] if i % 2 == 0 else \
             [73 + k * 74 for k in range(4)]
        ruedas += [(x, ye) for x in xs]

    # --- correas -------------------------------------------------------------
    banda, esp_banda = p["banda"], 3.0
    r_term, r_snub, r_motriz = 30.0, 25.0, 30.0      # Ø60 / Ø50 / Ø60
    x_ls, z_ls = 160.0, 58.0                     # eje común (corre en Y)
    term_a, term_b = 35.0, 314.0
    z_term = tangente - esp_banda - r_term - p.get("desnivel_correas", 0.0)
    snub = (x_ls + 58.0, 92.0)
    circulos = [
        (term_a, z_term, r_term + esp_banda / 2, 185.0),   # envuelve su izquierda
        (term_b, z_term, r_term + esp_banda / 2, 355.0),   # envuelve su derecha
        (snub[0], snub[1], r_snub + esp_banda / 2, 275.0),   # snub por el lomo
        (x_ls, z_ls, r_motriz + esp_banda / 2, 300.0),       # motriz por abajo
    ]
    segs_hints = [(90.0, 90.0),      # ramal superior A->B
                  (265.0, 300.0),    # bajada de B al lomo del snub
                  (250.0, 35.0),     # del snub al costado derecho de la motriz
                  (230.0, 272.0)]    # retorno de la motriz al terminal A
    pantalla_x = 350.0                          # guarda entre correas y tren
    casete_fin = 348.0

    # --- tren de o-rings de las omnis (esquema ZP2026) -----------------------
    # gargantas a ±12 (más juntas que las ±16.87 del ZP2026: son spools
    # propios) para que el tren quepa entre el soporte del motor A y el bloque
    spool = {"dia": 36.0, "raiz": 32.0, "ancho": 34.0, "gargantas": (-12.0, 12.0)}
    x_spool = 414.0                              # centro de spools (ejes omni)
    planos_g = (x_spool - 16.87, x_spool + 16.87)
    mamp_y = L - 40.0
    # motor A: cuerpo Ø118 a >=2 del vuelo Ø58+2 de las ruedas del eje 4
    # (dist((y,z)-(385,136.1)) >= 90) y patrón 152.7 dentro del soporte
    motor_a = {"eje_yz": (458.0, 80.0), "cara_x": 374.0, "polea_dia": 44.0,
               "plano_anillo": planos_g[0], "conduce": f"eje{n_ejes}"}
    motor_b = {"eje_xz": (246.0, 80.0), "cara_y": mamp_y - t - 62.7,
               "polea_dia": 44.0, "plano_anillo": mamp_y + 13.0}
    y_spool_ls = mamp_y + 13.0

    d = {
        "formato": "foto3d-modulo-transfer", "version": 1, "generado": now_iso(),
        "capa": "user",
        "parametros": p,
        "frame": {"ancho_total": ancho_total, "luz": round(luz, 2), "largo": L,
                  "alto": alto, "espesor": t, "pestana_sup": ps,
                  "pestana_inf": pi, "tangente": tangente,
                  "pantalla_x": pantalla_x, "mampara_y": mamp_y,
                  "bahia_motores": bahia},
        "omnis": {"rueda": RUEDA, "z_eje": z_eje, "ejes_y": ejes_y,
                  "hex": p["hex"], "eje_x": (2.0, luz - 2.0),
                  "ruedas_xy": ruedas, "n_ruedas": len(ruedas),
                  "rodamiento": FR8},
        "correas": {"n": len(correas_y), "ys": correas_y, "banda": banda,
                    "espesor_banda": esp_banda, "circulos": circulos,
                    "segs_hints": segs_hints,
                    "z_eje_terminales": z_term, "x_terminales": (term_a, term_b),
                    "eje_comun": {"x": x_ls, "z": z_ls, "dia": 20.0,
                                  "y": (4.0, mamp_y + 25.0), "y_spool": y_spool_ls},
                    "snub": {"xz": snub, "dia": 2 * r_snub, "colisa": 16.0},
                    "casete": {"placa_z": (80.0, 158.0),
                               "sep_placas": banda + 6.0,
                               "x_ini": 6.0, "x_fin": casete_fin}},
        "tren_omni": {"x_spool": x_spool, "planos_gargantas": planos_g,
                      "spool": spool, "motor": motor_a, "oring": ORING},
        "tren_correas": {"motor": motor_b, "spool_dia": 36.0},
        "soportes": {"bloque": (12.0, 54.0, 54.0), "z_top": 159.8,
                     "rodamiento": "FR8ZZ-HexHD (web_facts wf01-wf05)"},
        "tapa": {"z": (160.0, 163.0), "ranura_rueda": (30.0, 44.0),
                 "ranura_correa": banda + 8.0},
        "justificacion": {
            "ancho": f"BF {bf:g} - 2x{holg:g} de holgura = {ancho_total:g}; "
                     f"pestañas {pi:g} afuera => luz entre almas {luz:.1f}",
            "tangente": "rasante con la cara superior de la pestaña (lectura "
                        "fijada en DECISIONES.md); labio de transición del desvío",
            "paso_ejes": f"paso {paso:g} => hueco entre coronas Ø58 = "
                         f"{paso - 2 * RUEDA['R']:g} >= banda {banda:g} + 5/lado "
                         "(regla del catálogo, rodillo_traccion_50x40)",
            "banda_35": "ancho 35x3 como el transfer90 del repo (gen_transfer90 "
                        "bandW 35, poleas de cara 39): entre casete y rueda "
                        "vecina quedan 2.5 mm — con banda de 40 quedaría cero",
            "ruedas": "tresbolillo a paso 76 con desfase 38: una caja de 250 "
                      "apoya siempre en >=2 hileras y >=3 ruedas por hilera",
            "lazo": "tracción en cabeza baja, el precedente del repo "
                    "(MEMORIA_EJES LBP530): terminales Ø60 con lomo = tangente "
                    "(la aritmética de polea_plana_60x44: 132.1+30+3=165.1), "
                    "UN snub Ø50 por correa (contraflexión = mínimo Habasit, "
                    "REVISION_INGENIERIA §2) que aprieta la banda contra la "
                    "motriz Ø60 del eje común Ø20 (envolvente ~170°, sobre el "
                    "objetivo Movex 140±10 y el gate NBT90 >=120)",
            "take_up": "colisa vertical de 20 en el snub (1-2% del lazo, "
                       "REVISION_INGENIERIA §8); los o-rings tensan por "
                       "estiramiento 10-12% (web_facts wf07-wf08)",
            "tren_omni": "esquema ZP2026: UniDrive + spools con gargantas a "
                         "±16.87 del centro (paso medido en el GLB del "
                         "catálogo) y anillos encadenados eje a eje en planos "
                         "alternados",
            "spools": "Ø36 macizos (no el speed-up spool Ø68 del catálogo): "
                      "con el eje a z=136.1 el anillo debe pasar bajo la tapa "
                      "(z=160); con Ø68 la cruzaría",
            "soportes": "bloques al alma con rodamiento FR8ZZ de barreno "
                        "hexagonal 1/2 pulg (OD 28.575, brida 31.12 - "
                        "web_facts): el eje hex gira directo, sin adaptadores",
            "bahia_motores": "los UniDrive (cuerpo Ø118x62.7, ficha "
                             "S-UD23062200R01) no caben entre casetes ni bajo "
                             "ellos: bahía de 90 en la cola; la caja de 250 la "
                             "puentea (última hilera -> primer rodillo vecino)",
            "motor_a": "sobre soporte plegado en la bahía, cuerpo hacia -X y eje "
                       "hacia +X: su anillo baja del spool del último eje omni "
                       "en el plano de garganta x=406.9",
            "motor_b": "sobre la mampara, eje en Y: anillo al spool del eje "
                       "común por detrás de la mampara (plano y=463)",
            "desvio": "las correas cubren x 35..316: desvío preferente hacia "
                      "el alma A (la caja sale sobre la pestaña rasante); "
                      "hacia B la caja puentea la franja del tren de o-rings",
        },
    }
    return d


PARAMS_DEF = {"bf": 21 * IN, "holgura_bf": 3.0, "alto": 6.5 * IN, "espesor": 3.0,
              "pestana_sup": 1.4 * IN, "pestana_inf": 1.5 * IN, "resalte": 0.0,
              "hex": 12.7, "ejes": 4, "paso": 110.0, "banda": 35.0,
              "desnivel_correas": 0.0}


# ---------------------------------------------------------------------------
# Construcción de sólidos
# ---------------------------------------------------------------------------

def motor_unidrive(largo_eje=30.0):
    """UniDrive ONE desde su ficha (S-UD23062200R01, citada en el repo):
    cuerpo Ø118×62.7, boss Ø39.5, eje D Ø12.69, y 4 ESPÁRRAGOS Ø7.94 en el
    patrón 152.7×139.7 que salen de la cara (así la envolvente coincide con el
    bbox 152.69 del catálogo: el patrón se taladra en la placa, no en orejas).
    Eje en +Z local; base del cuerpo en z=0; espárragos hacia +Z."""
    import trimesh
    u = UNIDRIVE
    px, pz = u["patron"]
    piezas = []
    cuerpo = trimesh.creation.cylinder(radius=u["cuerpo_dia"] / 2,
                                       height=u["cuerpo_largo"], sections=64)
    cuerpo.apply_translation((0, 0, u["cuerpo_largo"] / 2))
    cuerpo.visual.face_colors = COL["motor"]
    piezas.append(cuerpo)
    boss = trimesh.creation.cylinder(radius=u["boss_dia"] / 2, height=8, sections=32)
    boss.apply_translation((0, 0, u["cuerpo_largo"] + 4))
    boss.visual.face_colors = COL["motor"]
    piezas.append(boss)
    eje = trimesh.creation.cylinder(radius=u["eje_d"] / 2, height=largo_eje,
                                    sections=24)
    eje.apply_translation((0, 0, u["cuerpo_largo"] + 8 + largo_eje / 2))
    eje.visual.face_colors = COL["eje"]
    piezas.append(eje)
    for sx in (-1, 1):
        for sz in (-1, 1):
            esp = trimesh.creation.cylinder(radius=u["perno"] / 2, height=18,
                                            sections=16)
            esp.apply_translation((sx * px / 2, sz * pz / 2,
                                   u["cuerpo_largo"] + 9))
            esp.visual.face_colors = COL["eje"]
            piezas.append(esp)
    return trimesh.util.concatenate(piezas)


def _plate_xz(poly, t, y0, color):
    """Placa vertical en el plano XZ (ocupa y ∈ [y0, y0+t]) desde un polígono
    (x, z). Rotación +90° sobre X: sin espejo, normales coherentes."""
    import trimesh
    m = trimesh.creation.extrude_polygon(poly, t)
    m.apply_transform(np.array([[1, 0, 0, 0], [0, 0, -1, 0],
                                [0, 1, 0, 0], [0, 0, 0, 1.0]], float))
    m.apply_translation((0, y0 + t, 0))
    m.visual.face_colors = COL[color]
    return m


def _plate_yz(poly, t, x0, color):
    """Placa vertical en el plano YZ (espesor hacia +X) desde un polígono (y, z)."""
    import trimesh
    m = trimesh.creation.extrude_polygon(poly, t)
    m.apply_transform(np.array([[0, 0, 1, 0], [1, 0, 0, 0],
                                [0, 1, 0, 0], [0, 0, 0, 1.0]], float))
    m.apply_translation((x0, 0, 0))
    m.visual.face_colors = COL[color]
    return m


def _rot(m, eje, grados, punto=(0, 0, 0)):
    import trimesh
    m.apply_transform(trimesh.transformations.rotation_matrix(
        math.radians(grados), eje, point=punto))
    return m


def construir_modulo(d: dict):
    """Construye todas las piezas colocadas en coordenadas de módulo.

    Devuelve (piezas, unicos): `piezas` = [(nombre_instancia, malla, grupo)],
    `unicos` = {nombre_pieza: (malla_local, cantidad, nota)} para STL/BOM."""
    import trimesh
    from shapely.geometry import Point, box as sbox
    from shapely.ops import unary_union

    f, om, co = d["frame"], d["omnis"], d["correas"]
    to, tc = d["tren_omni"], d["tren_correas"]
    t = f["espesor"]
    luz, L, alto = f["luz"], f["largo"], f["alto"]
    piezas, unicos, planos2d = [], {}, {}

    def inst(nombre, malla, grupo):
        piezas.append((nombre, malla, grupo))

    # --- canales laterales (taladrados por lado) -----------------------------
    ma_y, ma_z = to["motor"]["eje_yz"]
    ag_bloques = []
    for ye in om["ejes_y"]:
        ag_bloques += [(ye - 15, 122, 5.5), (ye + 15, 122, 5.5),
                       (ye - 15, 146, 5.5), (ye + 15, 146, 5.5)]
    ag_A = list(ag_bloques)
    for yb in co["ys"]:                          # escuadras de casete al alma A
        ag_A += [(yb - co["casete"]["sep_placas"] / 2 - t - 8, 96, 5.5),
                 (yb + co["casete"]["sep_placas"] / 2 + t + 8, 96, 5.5)]
    ag_B = list(ag_bloques)
    ag_B += [(ma_y - 70, 16, 5.5), (ma_y - 70, 144, 5.5),   # soporte motor A
             (ma_y + 74, 16, 5.5), (ma_y + 74, 144, 5.5)]
    canal_A_m, des_A = canal_c(L, alto, f["pestana_sup"], f["pestana_inf"], t,
                               agujeros_alma=ag_A)
    canal_B_m, des_B = canal_c(L, alto, f["pestana_sup"], f["pestana_inf"], t,
                               agujeros_alma=ag_B)
    canal_solido = canal_c(L, alto, f["pestana_sup"], f["pestana_inf"], t,
                           agujeros_alma=ag_A, solido=True)[0]
    cA = canal_A_m
    _rot(cA, [0, 0, 1], 180)
    cA.apply_translation((0, L, 0))              # alma en x [-t, 0], alas a -X
    cB = canal_B_m
    cB.apply_translation((luz, 0, 0))            # alma en x [luz, luz+t], alas +X
    inst("canal_A", cA, "frame")
    inst("canal_B", cB, "frame")
    unicos["canal_lateral"] = (canal_solido, 2,
                               "chapa plegada 3 mm; taladrar según su DXF "
                               "(A y B difieren)")
    d["frame"]["desarrollo_canal"] = des_A
    d["frame"]["desarrollo_canal_B"] = des_B

    # --- placas extremas, mampara y pantalla ---------------------------------
    x_ls, z_ls = co["eje_comun"]["x"], co["eje_comun"]["z"]
    pl_ext = sbox(0, 12, luz, 158).difference(
        Point(x_ls, z_ls).buffer(13, quad_segs=24))
    extremoA = _plate_xz(pl_ext, t, 0.0, "canal")
    inst("placa_extremo_A", extremoA, "frame")
    pl_extB = sbox(0, 12, luz, 158)
    extremoB = _plate_xz(pl_extB, t, L - t - 0.0, "canal")
    inst("placa_extremo_B", extremoB, "frame")
    planos2d["placa_extremo"] = pl_ext
    unicos["placa_extremo"] = (_plate_xz(pl_ext, t, 0, "canal"), 2,
                               "chapa 3 mm; la A lleva el paso del eje común")
    mamp = sbox(0, 4, luz, 156).difference(
        Point(x_ls, z_ls).buffer(13, quad_segs=24))
    u = UNIDRIVE
    bx, bz = tc["motor"]["eje_xz"]
    mamp = mamp.difference(Point(bx, bz).buffer(u["boss_dia"] / 2 + 1, quad_segs=24))
    for sx in (-1, 1):
        for sz in (-1, 1):
            centro = Point(bx + sx * u["patron"][0] / 2,
                           bz + sz * u["patron"][1] / 2)
            if not mamp.contains(centro.buffer(u["perno"] / 2 + 2)):
                raise ValueError(f"taladro del motor B fuera de la mampara: "
                                 f"{centro.wkt}")
            mamp = mamp.difference(centro.buffer(u["perno"] / 2 + 0.3, quad_segs=12))
    mampara = _plate_xz(mamp, t, f["mampara_y"] - t, "canal")
    inst("mampara_motores", mampara, "frame")
    planos2d["mampara_motores"] = mamp
    unicos["mampara_motores"] = (mampara.copy(), 1,
                                 "chapa 3 mm: patrón UniDrive B + paso eje común")
    pant = sbox(4, 70, 372.0, 158)   # termina antes de los espárragos del motor A
    for ye in om["ejes_y"]:                      # pasos de los ejes hex Ø18
        pant = pant.difference(Point(ye, om["z_eje"]).buffer(9, quad_segs=16))
    pantalla = _plate_yz(pant, t, f["pantalla_x"], "tapa")
    inst("pantalla_tren", pantalla, "frame")
    planos2d["pantalla_tren"] = pant
    unicos["pantalla_tren"] = (pantalla.copy(), 1,
                               "chapa 3 mm: separa correas del tren de o-rings")

    # --- soporte del motor A (canal plegado en la bahía) ---------------------
    sop = sbox(ma_y - 85, 4, f["mampara_y"] - t, 156)
    sop = sop.difference(Point(ma_y, ma_z).buffer(u["boss_dia"] / 2 + 1, quad_segs=24))
    for sy in (-1, 1):
        for sz in (-1, 1):
            centro = Point(ma_y + sy * u["patron"][0] / 2,
                           ma_z + sz * u["patron"][1] / 2)
            if not sop.contains(centro.buffer(u["perno"] / 2 + 2)):
                raise ValueError(f"taladro del motor A fuera del soporte: "
                                 f"{centro.wkt}")
            sop = sop.difference(centro.buffer(u["perno"] / 2 + 0.3, quad_segs=12))
    sop_m = _plate_yz(sop, t, to["motor"]["cara_x"], "canal")
    inst("soporte_motor_A", sop_m, "frame")
    planos2d["soporte_motor_A"] = sop
    unicos["soporte_motor_A"] = (sop_m.copy(), 1,
                                 "chapa 3 mm con patrón UniDrive; pestañas al "
                                 "alma B y a la mampara (plegado en obra)")

    # --- ejes omni + ruedas + soportes ---------------------------------------
    ex0, ex1 = om["eje_x"]
    eje_hex = hex_prisma(om["hex"], ex1 - ex0)
    _rot(eje_hex, [0, 0, 1], -90)                # de eje Y a eje X
    unicos["eje_hexagonal"] = (eje_hex.copy(), len(om["ejes_y"]),
                               f"hex {om['hex']:g} x {ex1 - ex0:g} mm")
    rueda = rueda_lod(RUEDA["R"], RUEDA["a"], RUEDA["largo_rodillo"],
                      RUEDA["n_rodillos"], RUEDA["desfase_deg"],
                      RUEDA["ancho_paquete"], RUEDA["hex_barreno"])
    _rot(rueda, [0, 0, 1], -90)                  # eje de giro a X
    unicos["rueda_omni"] = (rueda.copy(), om["n_ruedas"],
                            "RUEDA-OMNI-58 (Ø58, barreno hex 12.85) — LOD")
    for i, ye in enumerate(om["ejes_y"]):
        e = eje_hex.copy()
        e.apply_translation((ex0, ye, om["z_eje"]))
        inst(f"eje_omni_{i+1}", e, "omnis")
    for j, (x, y) in enumerate(om["ruedas_xy"]):
        r = rueda.copy()
        r.apply_translation((x, y, om["z_eje"]))
        inst(f"rueda_{j+1}", r, "omnis")

    blq_t, blq_a, blq_h = d["soportes"]["bloque"]
    z_top = d["soportes"]["z_top"]
    perfil_blq = sbox(0, z_top - blq_h, blq_a, z_top).difference(
        Point(blq_a / 2, om["z_eje"]).buffer(FR8["od"] / 2, quad_segs=32))
    bloque = _plate_yz(perfil_blq, blq_t, 0, "soporte")
    bloque.apply_translation((0, -blq_a / 2, 0))
    planos2d["soporte_eje"] = perfil_blq
    unicos["soporte_eje"] = (bloque.copy(), 2 * len(om["ejes_y"]),
                             "bloque 20 mm, alojamiento FR8ZZ-HexHD Ø28.6")
    for i, ye in enumerate(om["ejes_y"]):
        for lado, x0 in (("A", 0.0), ("B", luz - blq_t)):
            b = bloque.copy()
            b.apply_translation((x0, ye, 0))
            inst(f"soporte_{lado}{i+1}", b, "soportes")

    # --- casetes de correa ---------------------------------------------------
    ca = co["casete"]
    x0c, x1c = ca["x_ini"], ca["x_fin"]
    z0c, z1c = ca["placa_z"]
    ta, tb = co["x_terminales"]
    sn = co["snub"]
    placa2d = sbox(x0c, z0c, x1c, z1c)
    for (cx, cz) in ((ta, co["z_eje_terminales"]), (tb, co["z_eje_terminales"])):
        placa2d = placa2d.difference(Point(cx, cz).buffer(6.1, quad_segs=16))
    sxc, szc = sn["xz"]                           # colisa vertical del snub
    colisa = sbox(sxc - 6.1, szc - sn["colisa"] / 2,
                  sxc + 6.1, szc + sn["colisa"] / 2)
    placa2d = placa2d.difference(unary_union(
        [colisa, Point(sxc, szc - sn["colisa"] / 2).buffer(6.1, 16),
         Point(sxc, szc + sn["colisa"] / 2).buffer(6.1, 16)]))
    placa2d = placa2d.difference(Point(x_ls, z_ls).buffer(15, quad_segs=24))
    sepc = ca["sep_placas"]
    placa_cas = _plate_xz(placa2d, t, 0, "tapa")
    planos2d["placa_casete"] = placa2d
    unicos["placa_casete"] = (placa_cas.copy(), 2 * co["n"],
                              "chapa 3 mm: terminales, colisas take-up y paso "
                              "del eje común")
    slider = trimesh.creation.box((tb - ta - 70, co["banda"] + 4.0, t))
    slider.visual.face_colors = COL["tapa"]
    unicos["cama_deslizante"] = (slider.copy(), co["n"],
                                 "apoyo del ramal superior (REVISION_ING. §8)")
    escuadra = trimesh.creation.box((16, 3, 40))
    escuadra_b = trimesh.creation.box((3, 16, 40))
    tensor = trimesh.creation.box((10, sepc + 2 * t, 12))
    unicos["escuadra_casete"] = (
        trimesh.util.concatenate([escuadra.copy(), escuadra_b.copy()]), 4 * co["n"],
        "L 40x16x3: fija cada placa de casete al alma A y a la pantalla (M5)")
    unicos["tensor_snub"] = (tensor.copy(), co["n"],
                             "puente M6 bajo la colisa: empuja el eje del snub "
                             "hacia abajo y fija el take-up (contratuerca)")
    for k, yb in enumerate(co["ys"]):
        for lado, dy in (("i", -sepc / 2 - t), ("d", sepc / 2)):
            pl = placa_cas.copy()
            pl.apply_translation((0, yb + dy, 0))
            inst(f"casete{k+1}_placa_{lado}", pl, "correas")
            for ori, ex in (("A", 8.0), ("P", f["pantalla_x"] - 0.5)):
                esc = (escuadra if ori == "A" else escuadra_b).copy()
                esc.apply_translation((ex, yb + dy + t / 2, 118))
                inst(f"casete{k+1}_esc_{ori}{lado}", esc, "correas")
        for lado2, dy2 in (("i", -sepc / 2 - t - 4), ("d", sepc / 2 + t + 4)):
            tn = tensor.copy()
            tn.apply_translation((sn["xz"][0], yb + dy2, sn["xz"][1] + 12))
            inst(f"casete{k+1}_tensor_{lado2}", tn, "correas")
        sl = slider.copy()
        sl.apply_translation(((ta + tb) / 2, yb, z1c + 2.6))
        inst(f"casete{k+1}_cama", sl, "correas")

    # poleas terminales, idlers omega, correa
    pol_term = polea(2 * 30.0, co["banda"] + 4.0, 12.2)
    _rot(pol_term, [0, 0, 1], 0)
    unicos["polea_terminal_60"] = (pol_term.copy(), 2 * co["n"],
                                   f"Ø60x{co['banda'] + 4:g} bore 12.2, crown "
                                   "0.3, sobre buje de bronce (catálogo: "
                                   "'loca sobre buje')")
    idler = polea(sn["dia"], co["banda"] + 4.0, 12.2)
    unicos["snub_50"] = (idler.copy(), co["n"],
                         f"Ø50x{co['banda'] + 4:g} (mínimo Habasit "
                         "contraflexión) en colisa take-up")
    pol_ls = polea(2 * 30.0, co["banda"] + 4.0, 20.2)
    unicos["polea_motriz_60"] = (pol_ls.copy(), co["n"],
                                 f"Ø60x{co['banda'] + 4:g} bore 20.2 + "
                                 "prisionero, en el eje común")
    eje12 = trimesh.creation.cylinder(radius=6, height=sepc + 2 * t, sections=24)
    _rot(eje12, [1, 0, 0], 90)
    eje12.visual.face_colors = COL["eje"]
    unicos["eje_polea_12"] = (eje12.copy(), 3 * co["n"],
                              "Ø12 h9 al ras de placas (ajuste 12.2 H11; "
                              "retención: M5 axial + arandela por fuera)")
    for k, yb in enumerate(co["ys"]):
        for nombre, (cx, cz, rr, ss) in zip(
                ("term_A", "term_B", "snub", "motriz"),
                co["circulos"]):
            if nombre == "motriz":
                po = pol_ls.copy()
            elif nombre.startswith("term"):
                po = pol_term.copy()
            else:
                po = idler.copy()
            po.apply_translation((cx, yb, cz))
            inst(f"casete{k+1}_{nombre}", po, "correas")
            if nombre != "motriz":
                ej = eje12.copy()
                ej.apply_translation((cx, yb, cz))
                inst(f"casete{k+1}_eje_{nombre}", ej, "correas")
        banda = correa_solido(co["circulos"], co["segs_hints"], co["banda"],
                              co["espesor_banda"], yb - co["banda"] / 2)
        inst(f"correa_{k+1}", banda, "correas")
    unicos["correa_plana"] = (correa_solido(co["circulos"], co["segs_hints"],
                                            co["banda"], co["espesor_banda"],
                                            -co["banda"] / 2),
                              co["n"], f"banda {co['banda']:g}x3 poliéster/NBR, lazo cerrado")

    # --- eje común + chumaceras + spool --------------------------------------
    y0l, y1l = co["eje_comun"]["y"]
    eje_ls = trimesh.creation.cylinder(radius=co["eje_comun"]["dia"] / 2,
                                       height=y1l - y0l, sections=32)
    _rot(eje_ls, [1, 0, 0], 90)
    eje_ls.apply_translation((x_ls, (y0l + y1l) / 2, z_ls))
    eje_ls.visual.face_colors = COL["linea"]
    inst("eje_comun", eje_ls, "correas")
    unicos["eje_comun_20"] = (eje_ls.copy(), 1,
                              f"Ø20 h6 x {y1l - y0l:g}; chumaceras UCFL204")
    cat = None
    try:
        import lib_componentes as LC
        cat = LC.load_catalogo()
        ucfl = LC.build_mesh(LC.get_componente(cat, "chumacera_ucfl204"))
    except Exception:
        ucfl = trimesh.creation.box((86, 30, 55))
        ucfl.visual.face_colors = COL["soporte"]
    unicos["chumacera_ucfl204"] = (ucfl.copy(), 2, "catálogo (bore Ø20, M10 a 64)")
    u1 = ucfl.copy()
    _rot(u1, [1, 0, 0], -90)
    u1.apply_translation((x_ls, t, z_ls))
    inst("ucfl204_extremoA", u1, "correas")
    u2 = ucfl.copy()
    _rot(u2, [1, 0, 0], 90)
    u2.apply_translation((x_ls, f["mampara_y"] - t, z_ls))
    inst("ucfl204_mampara", u2, "correas")

    # --- tren de o-rings de omnis --------------------------------------------
    sp = to["spool"]
    spool_m = spool_2g(sp["dia"], sp["ancho"], None, hex_bore=om["hex"] + 0.15)
    _rot(spool_m, [0, 0, 1], -90)                 # eje a X
    unicos["spool_eje_omni"] = (spool_m.copy(), len(om["ejes_y"]),
                                "Ø36 dos gargantas (±16.87, esquema ZP2026), "
                                "barreno hex + prisionero")
    for i, ye in enumerate(om["ejes_y"]):
        s2 = spool_m.copy()
        s2.apply_translation((to["x_spool"], ye, om["z_eje"]))
        inst(f"spool_eje{i+1}", s2, "tren")
    gA, gB = to["planos_gargantas"]
    r_g = sp["raiz"] / 2
    ys = om["ejes_y"]
    for i in range(len(ys) - 1):                  # anillos eje a eje
        plano = gB if i % 2 == 0 else gA           # el motor entra por gA al último
        ring = oring_solido((ys[i], om["z_eje"]), (ys[i + 1], om["z_eje"]),
                            r_g, r_g, ORING, plano - ORING / 2)
        inst(f"oring_e{i+1}_e{i+2}", ring, "tren")
    # motor A y su anillo al último eje
    motor = motor_unidrive(largo_eje=34.0)
    motor_corto = motor_unidrive(largo_eje=26.0)
    unicos["motor_unidrive"] = (motor.copy(), 2,
                                "UniDrive ONE (ficha S-UD23062200R01) — COMPRADO")
    mA = motor.copy()
    _rot(mA, [0, 0, 1], 90)                       # patrón largo al eje Y local
    _rot(mA, [0, 1, 0], 90)                       # eje del motor a +X
    mA.apply_translation((to["motor"]["cara_x"] - UNIDRIVE["cuerpo_largo"],
                          ma_y, ma_z))
    inst("motor_A", mA, "tren")
    pol_m = spool_2g(to["motor"]["polea_dia"], 20.0, UNIDRIVE["eje_d"] + 0.2,
                     prof_gar=3.0, ancho_gar=5.5)
    _rot(pol_m, [0, 0, 1], -90)
    unicos["polea_motor_2g"] = (pol_m.copy(), 2,
                                "Ø44, garganta a plano de anillo, bore D 12.7")
    pmA = pol_m.copy()
    pmA.apply_translation((gA, ma_y, ma_z))
    inst("polea_motor_A", pmA, "tren")
    ringA = oring_solido((ma_y, ma_z), (ys[-1], om["z_eje"]),
                         to["motor"]["polea_dia"] / 2 - 3,
                         r_g, ORING, gA - ORING / 2)
    inst("oring_motorA", ringA, "tren")

    # --- motor B + spool del eje común ---------------------------------------
    mB = motor_corto.copy()
    _rot(mB, [1, 0, 0], -90)                      # eje del motor a +Y
    mB.apply_translation((bx, tc["motor"]["cara_y"], bz))
    inst("motor_B", mB, "tren")
    y_sp = co["eje_comun"]["y_spool"]
    sp_ls = spool_2g(36.0, 20.0, 20.2)
    unicos["spool_eje_comun"] = (sp_ls.copy(), 1,
                                 "Ø36 una garganta útil, bore 20.2 + prisionero")
    s3 = sp_ls.copy()
    s3.apply_translation((x_ls, y_sp, z_ls))
    inst("spool_eje_comun", s3, "tren")
    pmB = pol_m.copy()
    _rot(pmB, [0, 0, 1], 90)                      # eje a Y
    pmB.apply_translation((bx, y_sp, bz))
    inst("polea_motor_B", pmB, "tren")
    ringB = oring_xz((bx, bz), (x_ls, z_ls), to["motor"]["polea_dia"] / 2 - 3,
                     16.0, ORING, y_sp)
    inst("oring_motorB", ringB, "tren")

    # --- tapa ranurada (booleana: sólido - prismas de ranura, estanca) -------
    z0t, z1t = d["tapa"]["z"]
    lw, lh = d["tapa"]["ranura_rueda"]
    base = trimesh.creation.box((luz - 8, L - 8, z1t - z0t))
    base.apply_translation((luz / 2, L / 2, (z0t + z1t) / 2))
    cortes_t = []
    for (x, y) in om["ruedas_xy"]:
        # los semicírculos entran 0.1 en la caja: la tangencia exacta deja
        # aristas no-manifold en el STL
        est = sbox(x - lw / 2, y - lh / 2, x + lw / 2, y + lh / 2).union(
            Point(x - lw / 2 + 0.1, y).buffer(lh / 2, quad_segs=12)).union(
            Point(x + lw / 2 - 0.1, y).buffer(lh / 2, quad_segs=12))
        pr = trimesh.creation.extrude_polygon(est, 9.0)
        pr.apply_translation((0, 0, z0t - 3))
        cortes_t.append(pr)
    rc = d["tapa"]["ranura_correa"]
    for yb in co["ys"]:
        pr = trimesh.creation.box((tb - ta + 68, rc, 9.0))
        pr.apply_translation(((ta + tb) / 2, yb, z0t + 1.5))
        cortes_t.append(pr)
    tapa = trimesh.boolean.difference([base] + cortes_t)
    tapa.visual.face_colors = COL["tapa"]
    tapa2d = sbox(4, 4, luz - 4, L - 4)
    for (x, y) in om["ruedas_xy"]:
        tapa2d = tapa2d.difference(
            sbox(x - lw / 2, y - lh / 2, x + lw / 2, y + lh / 2).union(
                Point(x - lw / 2 + 0.1, y).buffer(lh / 2, quad_segs=12)).union(
                Point(x + lw / 2 - 0.1, y).buffer(lh / 2, quad_segs=12)))
    for yb in co["ys"]:
        tapa2d = tapa2d.difference(sbox(ta - 34, yb - rc / 2, tb + 34, yb + rc / 2))
    planos2d["tapa_superior"] = tapa2d
    inst("tapa_superior", tapa, "frame")
    unicos["tapa_superior"] = (tapa.copy(), 1,
                               "chapa 3 mm ranurada, 2.1 bajo la tangente, "
                               "atornillada a los soportes de eje")
    return piezas, unicos, planos2d


def oring_xz(c1, c2, r1, r2, cuerda, y_plano):
    """O-ring cuyo lazo vive en un plano XZ (para el motor B)."""
    import trimesh
    from shapely.geometry import LinearRing
    a12 = math.degrees(math.atan2(c2[1] - c1[1], c2[0] - c1[0]))
    circ = [(c1[0], c1[1], r1 + cuerda / 2, a12 + 180.0),
            (c2[0], c2[1], r2 + cuerda / 2, a12)]
    hints = [(a12 - 90.0, a12 - 90.0), (a12 + 90.0, a12 + 90.0)]
    eje2d = trayectoria_correa(circ, hints, n_arc=18)
    banda = LinearRing(eje2d).buffer(cuerda / 2, quad_segs=6)
    m = trimesh.creation.extrude_polygon(banda, cuerda)
    m.apply_transform(np.array([[1, 0, 0, 0], [0, 0, -1, 0],
                                [0, 1, 0, 0], [0, 0, 0, 1.0]], float))
    m.apply_translation((0, y_plano + cuerda / 2, 0))
    m.visual.face_colors = COL["oring"]
    return m


# ---------------------------------------------------------------------------
# Verificación
# ---------------------------------------------------------------------------

def verificar_modulo(d: dict, piezas, unicos) -> dict:
    import numpy as np
    f, om, co = d["frame"], d["omnis"], d["correas"]
    v = {}

    # 1 — encaje en BF
    margen = (d["parametros"]["bf"] - f["ancho_total"]) / 2
    v["encaje_bf"] = {"ancho_total": f["ancho_total"],
                      "bf": d["parametros"]["bf"],
                      "margen_por_lado": round(margen, 2),
                      "verdicto": "PASA" if margen >= 2 else "FALLA"}

    # 2 — tangencias en el plano de transporte
    tang = f["tangente"]
    z_ruedas = [round(m.bounds[1][2], 3) for n, m, g in piezas
                if n.startswith("rueda_")]
    z_correas = [round(m.bounds[1][2], 3) for n, m, g in piezas
                 if n.startswith("correa_")]
    desn = d["parametros"].get("desnivel_correas", 0.0)
    err = max([abs(z - tang) for z in z_ruedas] +
              [abs(z - (tang - desn)) for z in z_correas])
    v["tangencia"] = {"plano": tang, "ruedas_max": max(z_ruedas),
                      "correas_max": max(z_correas),
                      "desnivel_correas": desn,
                      "error_max": round(err, 3),
                      "verdicto": "PASA" if err <= 0.1 else "FALLA"}

    # 3 — reglas del lazo de correa (envolvente motriz, contraflexión)
    env = envolturas_lazo(co["circulos"], co["segs_hints"])
    idl = [2 * (r - co["espesor_banda"] / 2)
           for i, (_, _, r, s) in enumerate(co["circulos"]) if i == 2]
    v["lazo_correa"] = {"envolvente_grados": dict(zip(
        ("term_A", "term_B", "snub", "motriz"), env)),
        "envolvente_motriz": env[3],
        "sentido_contacto": "motriz por dentro del lazo; snub por el lomo",
        "min_contraflexion": min(idl) if idl else None,
        "verdicto": "PASA" if env[3] >= 120 and (not idl or min(idl) >= 50)
        else "FALLA",
        "regla": "motriz >=120 (gate NBT90; objetivo Movex 140±10); "
                 "contraflexión >=Ø50 (Habasit)"}

    # 4 — apoyo de la caja mínima 250x250 en cualquier posición
    caja = 250.0
    zona_y = (0.0, d["parametros"]["ejes"] * d["parametros"]["paso"])
    peor_r, peor_b, peor_filas = 99, 99, 99
    for cy in np.linspace(zona_y[0], zona_y[1] - caja, 24):
        for cx in np.linspace(5, f["luz"] - caja - 5, 24):
            dentro = [(x, y) for (x, y) in om["ruedas_xy"]
                      if cx <= x <= cx + caja and cy <= y <= cy + caja]
            filas = len({y for _, y in dentro})
            peor_r = min(peor_r, len(dentro))
            peor_filas = min(peor_filas, filas)
            nb = sum(1 for yb in co["ys"] if cy <= yb <= cy + caja)
            peor_b = min(peor_b, nb)
    v["apoyo_caja_250"] = {"min_ruedas": peor_r, "min_hileras": peor_filas,
                           "min_correas": peor_b,
                           "verdicto": "PASA" if peor_r >= 4 and
                           peor_filas >= 2 and peor_b >= 2 else "FALLA"}

    # 5 — holguras críticas (analíticas, mm)
    sp, to = d["tren_omni"]["spool"], d["tren_omni"]
    z_anillo = om["z_eje"] + sp["raiz"] / 2 + ORING
    hol = {
        "anillo_oring_a_tapa": round(d["tapa"]["z"][0] - z_anillo, 2),
        "spool_a_pantalla": round((to["x_spool"] - sp["ancho"] / 2)
                                  - (f["pantalla_x"] + f["espesor"]), 2),
        "correa_a_pantalla": round(f["pantalla_x"] -
                                   (co["x_terminales"][1] + 30 + 1.5), 2),
        "lazo_a_fondo": round(co["circulos"][3][1] - co["circulos"][3][2], 2),
        "rueda_a_ranura_tapa": round((d["tapa"]["ranura_rueda"][1] -
                                      RUEDA["ancho_total"]) / 2, 2),
        "correa_a_ranura_tapa": round((d["tapa"]["ranura_correa"] -
                                       co["banda"]) / 2, 2),
        "casete_a_rueda_vecina": round((co["ys"][0] - co["casete"]["sep_placas"] / 2
                                        - f["espesor"])
                                       - (om["ejes_y"][0] + RUEDA["R"]), 2),
    }
    tc_motor_y0 = d["tren_correas"]["motor"]["cara_y"]
    ma_y, ma_z = to["motor"]["eje_yz"]
    d_eje4 = math.hypot(ma_y - om["ejes_y"][-1], ma_z - om["z_eje"])
    hol["motorA_a_eje4"] = round(d_eje4 - UNIDRIVE["cuerpo_dia"] / 2
                                 - om["hex"] / math.sqrt(3), 2)
    hol["motorA_a_vuelo_ruedas_eje4"] = round(
        d_eje4 - UNIDRIVE["cuerpo_dia"] / 2 - RUEDA["R"], 2)
    hol["motorA_cuerpo_a_mampara"] = round(
        (f["mampara_y"] - f["espesor"]) - (ma_y + UNIDRIVE["cuerpo_dia"] / 2), 2)
    hol["soporte_a_spool_eje4"] = round(
        (to["x_spool"] - to["spool"]["ancho"] / 2)
        - (to["motor"]["cara_x"] + f["espesor"]), 2)
    sn = co["snub"]
    dy_tensor = (co["ys"][0] - co["casete"]["sep_placas"] / 2 - f["espesor"]
                 - 4.0) - om["ejes_y"][0]
    hol["tensor_bajo_vuelo_rueda"] = round(
        (om["z_eje"] - math.sqrt(max(RUEDA["R"]**2 - dy_tensor**2, 0.0)))
        - (sn["xz"][1] + 24.0), 2)
    hol["esparragoA_sobre_eje4_z"] = round(
        (ma_z + UNIDRIVE["patron"][1] / 2 - UNIDRIVE["perno"] / 2)
        - (om["z_eje"] + om["hex"] / math.sqrt(3)), 2)
    hol["esparragoA_a_spool_eje4"] = round(
        (to["x_spool"] - to["spool"]["ancho"] / 2)
        - (to["motor"]["cara_x"] + 18.0), 2)
    hol["spool_a_bloque_B"] = round(
        (f["luz"] - d["soportes"]["bloque"][0])
        - (to["x_spool"] + to["spool"]["ancho"] / 2), 2)
    hol["motorA_cuerpo_a_casete3"] = round(
        (ma_y - UNIDRIVE["cuerpo_dia"] / 2)
        - (co["ys"][-1] + co["casete"]["sep_placas"] / 2 + f["espesor"]), 2)
    y_esparragos_A = ma_y - UNIDRIVE["patron"][0] / 2 - UNIDRIVE["perno"] / 2
    hol["pantalla_a_motores"] = round(
        min(y_esparragos_A, tc_motor_y0) - 372.0, 2)
    hol["paso_eje_en_pantalla"] = round(9.0 - om["hex"] / math.sqrt(3), 2)
    hol["eje_motorB_a_placa_B"] = round(
        (f["largo"] - f["espesor"]) -
        (d["tren_correas"]["motor"]["cara_y"] + 62.7 + 8 + 22), 2)
    bx, bz = d["tren_correas"]["motor"]["eje_xz"]
    d_ls = math.hypot(bx - co["eje_comun"]["x"], bz - co["eje_comun"]["z"])
    hol["motorB_a_eje_comun"] = round(d_ls - UNIDRIVE["cuerpo_dia"] / 2
                                      - co["eje_comun"]["dia"] / 2, 2)
    hol["motorB_cuerpo_a_cubo_ucfl"] = round(
        math.hypot(bx - co["eje_comun"]["x"], bz - co["eje_comun"]["z"])
        - UNIDRIVE["cuerpo_dia"] / 2 - 21.0, 2)
    hol["motorA_a_motorB_x"] = round(
        (bx + UNIDRIVE["cuerpo_dia"] / 2), 2)
    hol["motorA_a_motorB_x"] = round(
        (to["motor"]["cara_x"] - UNIDRIVE["cuerpo_largo"])
        - (bx + UNIDRIVE["cuerpo_dia"] / 2), 2)
    hol["esparragoB_z_a_brida_ucfl"] = round(
        (co["eje_comun"]["z"] - 15.0)
        - (bz - UNIDRIVE["patron"][1] / 2 + UNIDRIVE["perno"] / 2), 2)
    v["holguras"] = {"mm": hol,
                     "verdicto": "PASA" if all(h >= 1.0 for h in hol.values())
                     else "FALLA"}

    # 6 — interferencias: AABB de TODAS las parejas, sin exención por grupos.
    # Cada pareja nominal (pasantes, asientos, apoyos) está en la lista blanca
    # CON su holgura medida en `holguras` — la lección del revisor: ninguna
    # colisión puede quedar silenciada por pertenecer a un grupo "permitido".
    import itertools
    import re
    cajas = [(n, m.bounds, g) for n, m, g in piezas]

    def familia(nombre):
        if nombre in ("soporte_motor_A", "spool_eje_comun"):
            return nombre
        n = re.sub(r"oring_e\d+_e\d+", "oring_e_e", nombre)
        n = re.sub(r"casete\d+", "casete", n)
        n = re.sub(r"soporte_[AB]\d+", "soporte", n)
        n = re.sub(r"_?\d+$", "", n)
        return n

    NOMINALES = {
        # (familia_a, familia_b): por qué se tocan y dónde está la holgura real
        ("eje_omni", "soporte"): "eje dentro del FR8ZZ (barreno hex nominal)",
        ("eje_omni", "spool_eje"): "spool montado en el eje (barreno hex)",
        ("eje_omni", "rueda"): "ruedas montadas en el eje",
        ("eje_omni", "pantalla_tren"): "paso Ø16 en la pantalla",
        ("eje_omni", "oring_e_e"): "anillo en su garganta",
        ("oring_e_e", "spool_eje"): "anillo en su garganta",
        ("oring_motorA", "spool_eje"): "anillo en su garganta",
        ("oring_motorA", "polea_motor_A"): "anillo en su garganta",
        ("oring_motorA", "eje_omni"): "anillo en la garganta del spool del eje",
        ("motor_A", "polea_motor_A"): "polea en el eje D del motor",
        ("motor_A", "soporte_motor_A"): "espárragos del patrón en la placa",
        ("spool_eje", "soporte_motor_A"): "muesca Ø48 en el soporte",
        ("eje_omni", "soporte_motor_A"): "pasa por la muesca del soporte",
        ("oring_motorA", "soporte_motor_A"): "el anillo baja por la muesca",
        ("motor_A", "pantalla_tren"): "AABB de espárragos; cuerpos separados",
        ("motor_A", "eje_omni"): "espárrago 2.5 sobre el hex (holgura medida)",
        ("casete_tensor_i", "casete_placa_i"): "puente atornillado a la placa",
        ("casete_tensor_d", "casete_placa_d"): "puente atornillado a la placa",
        ("casete_tensor_i", "casete_eje_snub"): "M6 pisa el eje en la colisa",
        ("casete_tensor_d", "casete_eje_snub"): "M6 pisa el eje en la colisa",
        ("casete_tensor_i", "casete_snub"): "AABB del puente junto a la polea",
        ("casete_tensor_d", "casete_snub"): "AABB del puente junto a la polea",
        ("casete_tensor_i", "correa"): "puente fuera de las placas; banda dentro",
        ("casete_tensor_d", "correa"): "puente fuera de las placas; banda dentro",
        ("casete_tensor_i", "rueda"): "bajo el vuelo de la rueda (6.9 medido)",
        ("casete_tensor_d", "rueda"): "bajo el vuelo de la rueda (6.9 medido)",
        ("casete_cama", "tapa_superior"): "la cama asoma por la ranura de correa",
        ("casete_term_A", "tapa_superior"): "polea asoma por la ranura de correa",
        ("casete_term_B", "tapa_superior"): "polea asoma por la ranura de correa",
        ("casete_eje_term_A", "correa"): "el eje vive dentro del lazo (r 30)",
        ("casete_eje_term_B", "correa"): "el eje vive dentro del lazo (r 30)",
        ("casete_eje_snub", "correa"): "el eje vive dentro del lazo del snub",
        ("motor_A", "oring_motorA"): "anillo en la polea del eje D",
        ("spool_eje", "motor_A"): "polea del motor coplanar al spool (r 92)",
        ("motor_B", "ucfl204_mampara"): "espárragos junto a la chumacera "
                                        "(z disjunto, holgura medida)",
        ("motor_A", "motor_B"): "espárragos B (y>543) tras el cuerpo A (y<=517)",
        ("eje_comun", "motor_B"): "espárrago inferior a 34 en z del eje",
        ("motor_B", "spool_eje_comun"): "espárrago a 26 en z del spool",
        ("motor_B", "oring_motorB"): "anillo en la polea del eje D",
        ("casete_esc_Pi", "pantalla_tren"): "escuadra a la pantalla (M5)",
        ("casete_esc_Pd", "pantalla_tren"): "escuadra a la pantalla (M5)",
        ("motor_B", "polea_motor_B"): "polea en el eje D del motor",
        ("motor_B", "mampara_motores"): "espárragos del patrón en la mampara",
        ("oring_motorB", "polea_motor_B"): "anillo en su garganta",
        ("oring_motorB", "spool_eje_comun"): "anillo en su garganta",
        ("oring_motorB", "eje_comun"): "anillo en la garganta del spool",
        ("eje_comun", "spool_eje_comun"): "spool en el eje (prisionero)",
        ("eje_comun", "mampara_motores"): "paso Ø26 en la mampara",
        ("eje_comun", "placa_extremo_A"): "paso Ø26 en la placa A",
        ("eje_comun", "casete_placa_i"): "paso Ø30 en la placa",
        ("eje_comun", "casete_placa_d"): "paso Ø30 en la placa",
        ("eje_comun", "casete_motriz"): "polea motriz en el eje",
        ("eje_comun", "correa"): "la correa envuelve la motriz",
        ("eje_comun", "ucfl204_extremoA"): "eje en la chumacera",
        ("eje_comun", "ucfl204_mampara"): "eje en la chumacera",
        ("correa", "casete_term_A"): "la correa envuelve la polea",
        ("correa", "casete_term_B"): "la correa envuelve la polea",
        ("correa", "casete_snub"): "la correa pasa por el snub",
        ("correa", "casete_motriz"): "la correa envuelve la motriz",
        ("correa", "casete_cama"): "el ramal superior apoya en la cama",
        ("correa", "casete_placa_i"): "correa entre placas (holgura por cara)",
        ("correa", "casete_placa_d"): "correa entre placas (holgura por cara)",
        ("correa", "tapa_superior"): "ranura de correa en la tapa",
        ("rueda", "tapa_superior"): "ranura de rueda en la tapa",
        ("casete_term_A", "casete_placa_i"): "eje de polea entre placas",
        ("casete_term_A", "casete_placa_d"): "eje de polea entre placas",
        ("casete_term_B", "casete_placa_i"): "eje de polea entre placas",
        ("casete_term_B", "casete_placa_d"): "eje de polea entre placas",
        ("casete_snub", "casete_placa_i"): "eje del snub en la colisa",
        ("casete_snub", "casete_placa_d"): "eje del snub en la colisa",
        ("casete_eje_term_A", "casete_placa_i"): "eje en su taladro 12.2",
        ("casete_eje_term_A", "casete_placa_d"): "eje en su taladro 12.2",
        ("casete_eje_term_A", "casete_term_A"): "polea sobre su eje",
        ("casete_eje_term_B", "casete_placa_i"): "eje en su taladro 12.2",
        ("casete_eje_term_B", "casete_placa_d"): "eje en su taladro 12.2",
        ("casete_eje_term_B", "casete_term_B"): "polea sobre su eje",
        ("casete_eje_snub", "casete_placa_i"): "eje en la colisa",
        ("casete_eje_snub", "casete_placa_d"): "eje en la colisa",
        ("casete_eje_snub", "casete_snub"): "polea sobre su eje",
        ("casete_eje_snub", "casete_tensor"): "tensor M6 empuja el eje",
        ("casete_tensor", "casete_placa_i"): "tensor atornillado a las placas",
        ("casete_tensor", "casete_placa_d"): "tensor atornillado a las placas",
        ("casete_esc_Ai", "canal_A"): "escuadra al alma A (M5)",
        ("casete_esc_Ad", "canal_A"): "escuadra al alma A (M5)",
        ("casete_esc_Pi", "pantalla_tren"): "escuadra a la pantalla (M5)",
        ("casete_esc_Pd", "pantalla_tren"): "escuadra a la pantalla (M5)",
        ("casete_esc_Ai", "casete_placa_i"): "escuadra en su placa",
        ("casete_esc_Ad", "casete_placa_d"): "escuadra en su placa",
        ("casete_esc_Pi", "casete_placa_i"): "escuadra en su placa",
        ("casete_esc_Pd", "casete_placa_d"): "escuadra en su placa",
        ("soporte", "canal_A"): "bloque atornillado al alma (M5)",
        ("soporte", "canal_B"): "bloque atornillado al alma (M5)",
        ("soporte", "tapa_superior"): "la tapa apoya y atornilla en el bloque",
        ("soporte_motor_A", "canal_B"): "pestañas del soporte al alma B",
        ("soporte_motor_A", "mampara_motores"): "pestaña a la mampara",
        ("canal_A", "placa_extremo_A"): "placa atornillada entre almas",
        ("canal_A", "placa_extremo_B"): "placa atornillada entre almas",
        ("canal_A", "mampara_motores"): "mampara atornillada entre almas",
        ("canal_A", "pantalla_tren"): "pantalla atornillada",
        ("canal_A", "tapa_superior"): "borde de tapa junto al alma",
        ("canal_B", "placa_extremo_A"): "placa atornillada entre almas",
        ("canal_B", "placa_extremo_B"): "placa atornillada entre almas",
        ("canal_B", "mampara_motores"): "mampara atornillada entre almas",
        ("canal_B", "tapa_superior"): "borde de tapa junto al alma",
        ("mampara_motores", "tapa_superior"): "pestañas de la mampara a la tapa",
        ("ucfl204_extremoA", "placa_extremo_A"): "chumacera atornillada M10",
        ("ucfl204_mampara", "mampara_motores"): "chumacera atornillada M10",
    }
    sospechas, nominales_ok = [], 0
    for (n1, b1, g1), (n2, b2, g2) in itertools.combinations(cajas, 2):
        sol = np.minimum(b1[1], b2[1]) - np.maximum(b1[0], b2[0])
        if not np.all(sol > 0.3):
            continue
        f1, f2 = familia(n1), familia(n2)
        if (f1, f2) in NOMINALES or (f2, f1) in NOMINALES:
            nominales_ok += 1
            continue
        sospechas.append({"a": n1, "b": n2,
                          "solape_mm": [round(x, 1) for x in sol.tolist()]})
    v["interferencias_aabb"] = {
        "parejas_nominales_en_contacto": nominales_ok,
        "parejas_sospechosas": sospechas,
        "verdicto": "PASA" if not sospechas else "REVISAR"}
    # 7 — estimación de cargas (supuestos DECLARADOS; no sustituye cálculo)
    masa = 30.0                                   # kg, caja de diseño
    mu_b = 0.4                                    # caja sobre banda NBR parada
    g = 9.81
    lazo_pts = trayectoria_correa(co["circulos"], co["segs_hints"], n_arc=60)
    L_lazo = sum(math.hypot(lazo_pts[i + 1][0] - lazo_pts[i][0],
                            lazo_pts[i + 1][1] - lazo_pts[i][1])
                 for i in range(len(lazo_pts) - 1))
    F_avance_friccion = mu_b * masa * g * 0.5     # mitad del peso sobre bandas
    T_ring = 45.0                                 # N útiles por o-ring 3/16 al 11%
    F_desvio = mu_b * masa * g                    # las correas arrastran la caja
    v["cargas_estimadas"] = {
        "supuestos": {"masa_caja_kg": masa, "mu_caja_banda": mu_b,
                      "o_ring": "3/16 PU 83A al 10-12% (wf06-08); ~45 N útiles "
                                "por anillo (dato de fabricante a validar)",
                      "reparto": "mitad del peso sobre bandas en el peor caso"},
        "lazo_correa_mm": round(L_lazo, 1),
        "avance_friccion_sobre_bandas_N": round(F_avance_friccion, 1),
        "desvio_arrastre_necesario_N": round(F_desvio, 1),
        "anillos_en_serie": d["parametros"]["ejes"],
        "advertencia": "el tren de o-rings va EN SERIE (motor->e4->e3->e2->e1): "
                       "el par se acumula hacia el eje 1; validar deslizamiento "
                       "con la carga real o duplicar anillos por tramo",
    }
    v["verdicto_global"] = "PASA" if all(
        vv.get("verdicto") == "PASA" for k, vv in v.items()
        if isinstance(vv, dict) and "verdicto" in vv) else "REVISAR"
    return v


# ---------------------------------------------------------------------------
# Salidas
# ---------------------------------------------------------------------------

FABRICADAS = ("canal_lateral", "placa_extremo", "mampara_motores",
              "pantalla_tren", "soporte_motor_A", "soporte_eje",
              "tapa_superior", "placa_casete", "cama_deslizante",
              "eje_hexagonal", "spool_eje_omni", "spool_eje_comun",
              "polea_terminal_60", "snub_50", "polea_motriz_60",
              "polea_motor_2g", "eje_polea_12", "eje_comun_20")
COMPRADAS = {"motor_unidrive": "UniDrive ONE (S-UD23062200R01)",
             "chumacera_ucfl204": "UCFL204 bore Ø20",
             "rueda_omni": "fabricada en el proyecto RUEDA-OMNI-58 (18 uds)",
             "correa_plana": "banda plana poliéster/NBR, lazo a medida",
             "rodamiento_fr8zz_hex": "FR8ZZ-HexHD 1/2\" hex (web_facts wf01-05), 8 uds",
             "oring_316": "o-ring PU 3/16\" 83A, estirado 10-12% (wf06-08), 5 uds"}


def exportar_modulo(proj: Path, d, piezas, unicos, verif) -> list:
    import trimesh
    out = proj / "out" / "modulo"
    out.mkdir(parents=True, exist_ok=True)
    escritos = []

    # STL de piezas fabricadas + estanqueidad releída
    estanq = {}
    for nombre in FABRICADAS:
        malla, cant, nota = unicos[nombre]
        stl = out / f"{nombre}.stl"
        malla.export(stl)
        vuelta = trimesh.load(stl)
        estanq[nombre] = {"estanco": bool(vuelta.is_watertight),
                          "volumen_mm3": round(float(abs(vuelta.volume)), 1)}
        escritos.append(stl)
    d["estanqueidad_stl"] = estanq

    # GLB del conjunto
    esc = trimesh.Scene()
    for n, m, g in piezas:
        esc.add_geometry(m, node_name=n, geom_name=n)
    glb = out / "conjunto.glb"
    esc.export(glb)
    escritos.append(glb)
    return escritos


def _subdividir(m, arista_max=32.0):
    """Divide los triángulos grandes: el pintor ordena por centroide y las
    caras enormes de las placas se cuelan delante de las piezas pequeñas."""
    import trimesh
    if not len(m.faces):
        return m
    aristas = m.vertices[m.edges_unique]
    if np.linalg.norm(aristas[:, 0] - aristas[:, 1], axis=1).max() <= arista_max:
        return m
    color = np.asarray(m.visual.face_colors)[0]
    v, f = trimesh.remesh.subdivide_to_size(m.vertices, m.faces,
                                            max_edge=arista_max, max_iter=6)
    m2 = trimesh.Trimesh(vertices=v, faces=f, process=False)
    m2.visual.face_colors = color
    return m2


def render_modulo(piezas, out: Path, unicos=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import rueda_omni_piezas as RPX
    escritos = []
    piezas = [(n, _subdividir(m), g) for n, m, g in piezas]
    mallas = [m for _, m, _ in piezas]
    luz_alta = (-0.30, 0.35, 0.89)
    vistas = (("iso", 32, -55), ("planta", 0, 2),
              ("frente", 0, -88), ("interior", 212, -55))
    for nombre, az, el in vistas:
        sel = mallas if nombre != "interior" else \
            [m for n, m, g in piezas if n != "tapa_superior"]
        fig, ax = plt.subplots(figsize=(11, 8.5))
        RPX.pintar(ax, sel, az=az, el=el, luz=luz_alta)
        f = out / f"vista_{nombre}.png"
        fig.savefig(f, dpi=100, bbox_inches="tight", facecolor="white")
        plt.close(fig)
        escritos.append(f)
    return escritos


def dxf_corte(planos2d, d, path: Path) -> None:
    """DXF de corte a escala real: cada placa plana con su contorno (capa
    CORTE) en una fila, más el desarrollo del canal con líneas de pliegue."""
    import ezdxf
    from shapely.geometry import Polygon
    doc = ezdxf.new("R2018", setup=True)
    doc.header["$INSUNITS"] = 4
    for capa, color, tipo in (("CORTE", 7, "CONTINUOUS"),
                              ("PLIEGUE", 1, "DASHDOT"),
                              ("TEXTO", 7, "CONTINUOUS")):
        doc.layers.add(capa, color=color, linetype=tipo)
    msp = doc.modelspace()

    def poli(anillo, dx, dy):
        msp.add_lwpolyline([(x + dx, y + dy) for x, y in anillo.coords],
                           close=True, dxfattribs={"layer": "CORTE"})

    dx = 0.0
    for nombre, poly in planos2d.items():
        partes = getattr(poly, "geoms", [poly])
        lo = poly.bounds
        for g in partes:
            poli(g.exterior, dx - lo[0], -lo[1])
            for hueco in g.interiors:
                poli(hueco, dx - lo[0], -lo[1])
        msp.add_text(nombre, height=8, dxfattribs={"layer": "TEXTO"}
                     ).set_placement((dx, -22))
        dx += (lo[2] - lo[0]) + 40.0

    des = d["frame"]["desarrollo_canal"]
    ctn = des["contorno"]
    poli_pts = [(x + dx, y) for x, y in ctn]
    msp.add_lwpolyline(poli_pts, close=True, dxfattribs={"layer": "CORTE"})
    for (a, b) in des["pliegues"]:
        msp.add_line((a[0] + dx, a[1]), (b[0] + dx, b[1]),
                     dxfattribs={"layer": "PLIEGUE"})
    msp.add_text(f"desarrollo_canal (x2) — BA {des['ba_mm']} mm, K {des['k']}",
                 height=8, dxfattribs={"layer": "TEXTO"}).set_placement((dx, -22))
    doc.saveas(path)


def bom_modulo(d, unicos) -> list:
    filas = []
    for nombre in FABRICADAS:
        _, cant, nota = unicos[nombre]
        filas.append({"pieza": nombre, "cant": cant, "origen": "fabricar",
                      "nota": nota})
    n_ejes = d["parametros"]["ejes"]
    filas += [
        {"pieza": "motor_unidrive", "cant": 2, "origen": "comprar",
         "nota": COMPRADAS["motor_unidrive"]},
        {"pieza": "chumacera_ucfl204", "cant": 2, "origen": "comprar",
         "nota": COMPRADAS["chumacera_ucfl204"]},
        {"pieza": "rodamiento_fr8zz_hex", "cant": 2 * n_ejes, "origen": "comprar",
         "nota": "FR8ZZ-HexHD 1/2 pulg hex (web_facts wf01-wf05)"},
        {"pieza": "rueda_omni_58", "cant": d["omnis"]["n_ruedas"],
         "origen": "proyecto RUEDA-OMNI-58",
         "nota": "Ø58, barreno hex 12.85, sándwich de placas"},
        {"pieza": "correa_plana", "cant": d["correas"]["n"], "origen": "comprar",
         "nota": f"banda {d['correas']['banda']:g}x3 poliéster/NBR, lazo "
                 f"cerrado de {d['verificacion']['cargas_estimadas']['lazo_correa_mm']:g} mm"},
        {"pieza": "oring_pu_316", "cant": n_ejes + 1, "origen": "comprar",
         "nota": f"PU 3/16 pulg 83A; lazos instalados ~"
                 f"{2 * d['parametros']['paso'] + 100:.0f} (eje-eje) — pedir al "
                 "88-90% del instalado (estirado 10-12%, wf06-08)"},
        {"pieza": "tensor_snub_M6", "cant": 2 * d["correas"]["n"],
         "origen": "comprar", "nota": "tornillo M6x30 + contratuerca por puente"},
        {"pieza": "buje_bronce_12", "cant": 3 * d["correas"]["n"],
         "origen": "comprar", "nota": "Ø12/Ø14x39 para poleas locas (catálogo: "
                                      "'loca sobre buje')"},
        {"pieza": "collarin_hex_12.7", "cant": 2 * n_ejes, "origen": "comprar",
         "nota": "retención axial de cada eje hex contra el FR8ZZ"},
        {"pieza": "separador_tubo_18x13.5", "cant": 1, "origen": "comprar",
         "nota": "barra de 2 m: cortar a medida entre ruedas (retención axial)"},
        {"pieza": "tornillería M5/M4 avellanada", "cant": 1, "origen": "comprar",
         "nota": "bloques y tapa al alma; casetes a alma A y pantalla"},
    ]
    return filas


def leeme_modulo(d, bom, verif) -> str:
    import textwrap
    f, om, co = d["frame"], d["omnis"], d["correas"]
    parrafo = lambda t: textwrap.fill(t, 76, initial_indent="  ",
                                      subsequent_indent="  ")
    L = [f"MÓDULO DE TRANSFERENCIA OMNI + CORREAS — BF {d['parametros']['bf']/IN:.0f}\"",
         f"proyecto TRANSFER-BF21 · generado {d['generado'][:19]}Z · capa `user` (diseño)",
         "",
         "QUÉ ES",
         parrafo("Módulo insertable entre bastidores de un transportador de "
                 "rodillos BF 21 pulg. AVANCE: 4 ejes hexagonales de 1/2 pulg "
                 f"con {om['n_ruedas']} ruedas omni Ø58 (proyecto RUEDA-OMNI-58) "
                 "en tresbolillo. DESVÍO: 3 correas planas transversales en los "
                 "huecos entre ejes, movidas por un eje común inferior Ø20 con "
                 "tracción de cabeza baja (motriz Ø60 + snub Ø50 en colisa). "
                 "Dos motores UniDrive ONE: A para las omnis (spool + o-rings, "
                 "esquema ZP2026), B para el eje común."),
         "",
         "GEOMETRÍA CLAVE (mm)",
         f"  ancho total {f['ancho_total']:g} (BF 533.4 − 2×3) · largo {f['largo']:g} "
         f"· alto {f['alto']:g}",
         f"  plano de transporte z={f['tangente']:g} — rasante con la pestaña "
         "superior (labio de desvío)",
         f"  ejes omni z={om['z_eje']:g} · paso {d['parametros']['paso']:g} · "
         f"correas y={co['ys']}",
         f"  eje común ({co['eje_comun']['x']:g}, z={co['eje_comun']['z']:g}) · "
         f"envolvente motriz {verif['lazo_correa']['envolvente_motriz']:g}°",
         "",
         "VERIFICADO POR EL GENERADOR",
         f"  encaje en BF: margen {verif['encaje_bf']['margen_por_lado']:g} por lado",
         f"  tangencias omnis/correas/pestaña: error máx "
         f"{verif['tangencia']['error_max']:g}",
         f"  lazo: motriz {verif['lazo_correa']['envolvente_motriz']:g}° (gate "
         f">=120; Movex 140±10) · contraflexión mínima "
         f"Ø{verif['lazo_correa']['min_contraflexion']:g} (Habasit >=50)",
         f"  caja 250x250: mínimo {verif['apoyo_caja_250']['min_ruedas']} ruedas / "
         f"{verif['apoyo_caja_250']['min_hileras']} hileras / "
         f"{verif['apoyo_caja_250']['min_correas']} correas bajo la caja",
         "  holguras críticas (mm): " + ", ".join(
             f"{k} {v:g}" for k, v in verif["holguras"]["mm"].items()),
         "",
         "COMPROMISO DE TANGENTES FIJAS (sin pop-up)",
         parrafo("Avanzando, las correas están paradas y la caja desliza "
                 "sobre 3 franjas de 35: si el arrastre omni no puede con esa "
                 "fricción, regenerar con --desnivel-correas 1 a 1.5 (lomo de "
                 "correa bajo la tangente; exige caja rígida al desviar). "
                 "Desviando, los barriles de las omnis ruedan libres: no "
                 "pelean. La solución definitiva sería un pop-up como el "
                 "transfer90 del repo — fuera del alcance pedido."),
         "",
         "SECUENCIA DE MONTAJE (el orden importa: las correas son lazos SIN FIN)",
         "  1. Frame: canales + placas extremas + pantalla + mampara (sin apretar).",
         "  2. Bloques soporte al alma con sus FR8ZZ; tapa aún NO.",
         "  3. Eje común: enhebrar las 3 correas y el spool ANTES de montar las",
         "     chumaceras — las poleas motrices Ø60 entran por el extremo del eje",
         "     y se fijan con prisionero en su plano y.",
         "  4. Casetes: cada casete se arma alrededor de su correa (placas +",
         "     terminales + snub en colisa baja + cama) y se atornilla al alma A",
         "     y a la pantalla. Tensar con la colisa del snub (take-up 1-2%).",
         "  5. Ejes omni con sus ruedas y spool (prisionero), a los bloques.",
         "  6. O-rings estirados 10-12% en sus gargantas; motores A y B con sus",
         "     poleas; anillo motor-eje en su plano.",
         "  7. Tapa arriba (M4 a los bloques). Girar a mano ambos trenes antes",
         "     de conectar.",
         "",
         "LISTA DE MATERIALES"]
    for fila in bom:
        L.append(f"  {fila['cant']:>2} x {fila['pieza']:<24} [{fila['origen']}] "
                 f"{fila['nota']}")
    L += ["", "LO QUE ESTE DISEÑO NO RESUELVE AÚN",
          parrafo("Selección eléctrica de los UniDrive (par/velocidad según "
                  "carga real); par transmisible de los o-rings 3/16 con la "
                  "carga real (el esquema lineshaft mueve un rodillo por "
                  "anillo — aquí cada anillo arrastra un eje con 4-5 ruedas: "
                  "validar deslizamiento o subir a 2 anillos por tramo); "
                  "fijación del módulo al bastidor anfitrión (pestañas con "
                  "agujeros a definir sobre el transportador real); y el "
                  "desvío hacia el lado B pierde apoyo de correa en los "
                  "últimos 100 mm (franja del tren): preferir desviar hacia "
                  "el lado A."),
          "",
          "Todas las cotas heredan la incertidumbre declarada de sus fuentes "
          "(ver DECISIONES.md y web_facts.json).", ""]
    return "\n".join(L)


def catalogo_modulo_pdf(piezas, unicos, d, bom, verif, out: Path) -> Path:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_pdf import PdfPages
    import matplotlib.image as mpimg
    import rueda_omni_piezas as RPX
    A4 = (8.27, 11.69)
    path = out / "catalogo_modulo.pdf"
    with PdfPages(path) as pp:
        fig = plt.figure(figsize=A4)
        fig.text(0.08, 0.955, "Módulo transfer omni + correas — BF 21\"",
                 size=15, weight="bold")
        fig.text(0.08, 0.935, f"{d['frame']['ancho_total']:g} x "
                 f"{d['frame']['largo']:g} x {d['frame']['alto']:g} mm · "
                 f"{d['omnis']['n_ruedas']} omnis Ø58 · {d['correas']['n']} "
                 f"correas · 2 UniDrive · {d['generado'][:10]}", size=9)
        try:
            img = mpimg.imread(out / "vista_iso.png")
            ax = fig.add_axes([0.08, 0.52, 0.84, 0.40])
            ax.imshow(img)
            ax.axis("off")
        except Exception:
            pass
        tab = fig.add_axes([0.06, 0.06, 0.88, 0.45])
        tab.axis("off")
        filas = [[b["pieza"], str(b["cant"]), b["origen"]] for b in bom]
        t = tab.table(cellText=filas, colLabels=["Pieza", "Cant.", "Origen"],
                      colWidths=[0.5, 0.12, 0.3], loc="upper center",
                      cellLoc="left")
        t.auto_set_font_size(False)
        t.set_fontsize(7)
        t.scale(1, 1.18)
        for (fi, _), c in t.get_celld().items():
            c.set_linewidth(0.35)
            c.set_edgecolor("#bbbbbb")
            if fi == 0:
                c.set_facecolor("#eeeeee")
                c.set_text_props(weight="bold")
        fig.text(0.08, 0.028, "Verificación global: "
                 + d["verificacion"]["verdicto_global"]
                 + " — detalle en modulo.json y LEEME.txt", size=8)
        pp.savefig(fig)
        plt.close(fig)
        for nombre in FABRICADAS + tuple(k for k in ("motor_unidrive",
                                                     "chumacera_ucfl204")):
            malla, cant, nota = unicos[nombre]
            fig = plt.figure(figsize=A4)
            fig.text(0.08, 0.955, nombre.replace("_", " "), size=14,
                     weight="bold")
            fig.text(0.08, 0.935, f"{cant} ud · {nota}", size=8.5)
            ext = malla.extents
            semi = float(max(ext)) / 2 * 1.15
            for i, (tit, az, el) in enumerate((("isométrica", 35, -58),
                                               ("planta", 0, 2),
                                               ("alzado", 0, -88))):
                ax = fig.add_axes([0.06 + 0.31 * i, 0.60, 0.29, 0.27])
                RPX.pintar(ax, [_subdividir(malla)], az=az, el=el,
                           escala_comun=semi, luz=(-0.3, 0.35, 0.89))
                ax.set_title(tit, size=8, color="#444444")
            fig.text(0.08, 0.545, f"envolvente {ext[0]:.1f} x {ext[1]:.1f} x "
                     f"{ext[2]:.1f} mm", size=9)
            est = d.get("estanqueidad_stl", {}).get(nombre)
            if est:
                fig.text(0.08, 0.52, f"STL: {'estanco' if est['estanco'] else 'ABIERTO'}"
                         f" · volumen {est['volumen_mm3']:,.0f} mm³", size=9)
            pp.savefig(fig)
            plt.close(fig)
    return path


def zip_modulo(out: Path, archivos, texto_leeme) -> Path:
    import zipfile
    destino = out / "transfer-bf21_modulo.zip"
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("LEEME.txt", texto_leeme)
        for f in archivos:
            if f.suffix != ".zip":
                z.write(f, f.name)
    return destino


def opciones(args):
    p = dict(PARAMS_DEF)
    mapa = {"--bf": "bf", "--holgura-bf": "holgura_bf", "--alto": "alto",
            "--espesor": "espesor", "--pestana-sup": "pestana_sup",
            "--pestana-inf": "pestana_inf", "--resalte": "resalte",
            "--desnivel-correas": "desnivel_correas",
            "--hex": "hex", "--ejes": "ejes", "--paso": "paso",
            "--banda": "banda"}
    for flag, clave in mapa.items():
        val = opt(args, flag)
        if val is not None:
            p[clave] = int(val) if clave == "ejes" else float(val)
    return p


def main() -> None:
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    proj = project_dir(args[0])
    p = opciones(args[1:])
    d = disenar_modulo(p)
    piezas, unicos, planos2d = construir_modulo(d)
    verif = verificar_modulo(d, piezas, unicos)
    d["verificacion"] = verif
    out = proj / "out" / "modulo"
    out.mkdir(parents=True, exist_ok=True)
    escritos = exportar_modulo(proj, d, piezas, unicos, verif)
    escritos += render_modulo(piezas, out)
    dxf = out / "placas_corte.dxf"
    dxf_corte(planos2d, d, dxf)
    escritos.append(dxf)
    bom = bom_modulo(d, unicos)
    d["lista_de_materiales"] = bom
    escritos.append(catalogo_modulo_pdf(piezas, unicos, d, bom, verif, out))
    pj = out / "modulo.json"
    pj.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding="utf-8")
    texto = leeme_modulo(d, bom, verif)
    (out / "LEEME.txt").write_text(texto, encoding="utf-8")
    escritos.append(out / "LEEME.txt")
    escritos.append(zip_modulo(out, escritos + [pj], texto))

    f = d["frame"]
    print(f"Módulo transfer BF{p['bf']/IN:.0f}: {f['ancho_total']:g} x "
          f"{f['largo']:g} x {f['alto']:g} mm — {d['omnis']['n_ruedas']} omnis "
          f"en {p['ejes']} ejes hex Ø{p['hex']:g} + {d['correas']['n']} correas")
    for k, vv in verif.items():
        if isinstance(vv, dict) and "verdicto" in vv:
            print(f"  {k:22} {vv['verdicto']}")
    print(f"  GLOBAL: {verif['verdicto_global']}")
    abiertos = [n for n, e in d["estanqueidad_stl"].items() if not e["estanco"]]
    print(f"  STL estancos: {len(d['estanqueidad_stl']) - len(abiertos)}"
          f"/{len(d['estanqueidad_stl'])}"
          + (f"  ABIERTOS: {', '.join(abiertos)}" if abiertos else ""))
    for x in escritos + [pj]:
        print(f"  → {x.relative_to(proj)}")
    audit(proj, "MODULO", "módulo transfer omni+correas (diseño capa user)",
          verif["verdicto_global"],
          metrics={"verificacion": {k: vv.get("verdicto") for k, vv in verif.items()
                                    if isinstance(vv, dict) and "verdicto" in vv},
                   "hash_json": sha256_file(pj)})


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
