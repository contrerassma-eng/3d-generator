"""Módulo de transferencia omni bidireccional, insertable en roller conveyor (BF).

DISEÑO (capa `user`) parametrizado. Lecturas del pedido y esquema de alturas:
`projects/<X>/DECISIONES.md`. Sentido de AVANCE: hileras de ruedas omni Ø58
sobre ejes hexagonales de 1/2" (RUEDA-OMNI-58). Sentido de DESVÍO: en los
huecos entre ejes van las MISMAS omnis GIRADAS 90° sobre ejes hex cortos; el
"sistema de correas movido desde abajo por el eje común" es su TRANSMISIÓN
(o-rings: 2 risers por hueco desde un spool del eje común + 2 cadenas
stub-a-stub), no una superficie de transporte. Dos motores Unidrive (ZP2026):
uno por sentido. Al ser omnis cruzadas, ambos sentidos comparten la tangente
sin pelearse: los barriles de la familia parada ruedan libres.

Produce en `projects/<X>/out/modulo/`:
  - STL por pieza fabricada + desarrollo de chapa DXF de los canales
  - conjunto.glb (instanciado), renders PNG, catálogo PDF, BOM, LEEME y zip
  - verificaciones: encaje en BF, coplanaridad de tangentes, apoyo de la caja
    mínima, envolventes de anillos, interferencias y estanqueidad de STL

uso: python pipeline/modulo_transfer.py projects/<X> [opciones]
  --bf <mm>            luz entre bastidores del transportador (def: 533.4 = 21")
  --holgura-bf <mm>    holgura por lado al insertar (def: 3)
  --alto <mm>          alto del alma del canal (def: 165.1 = 6.5")
  --espesor <mm>       espesor de chapa del canal (def: 3)
  --pestana-sup <mm>   pestaña superior, hacia afuera (def: 35.56 = 1.4")
  --pestana-inf <mm>   pestaña inferior, hacia afuera (def: 38.1 = 1.5")
  --resalte <mm>       tangente sobre la cara sup. de la pestaña (def: 0 = rasante)
  --hex <mm>           entrecaras del eje hexagonal (def: 12.7 = 1/2")
  --ejes <n>           número de ejes omni de avance (def: 4)
  --paso <mm>          paso entre ejes omni (def: 110)
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


def spool_2g(dia, ancho, bore, prof_gar=3.0, ancho_gar=5.5, hex_bore=None,
             gargantas=None):
    """Spool de dos gargantas para o-ring (eje Y, centrado). Con `hex_bore` el
    barreno es HEXAGONAL (entrecaras) — lo que el STL diga es lo que se
    mecaniza, no la nota de la BOM. `gargantas` fija las posiciones (y1, y2)
    de las gargantas respecto al centro (def: ±20% del ancho)."""
    import trimesh
    from shapely.geometry import box as sbox
    r, h = dia / 2, ancho
    perfil = sbox(0.0, -h / 2, r, h / 2)
    for yg in (gargantas if gargantas else (-h * 0.20, h * 0.20)):
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
    # v3 ("compacta hacia abajo"): SIN bahía de motores — los UniDrive cuelgan
    # bajo el fondo del canal sobre bancadas y toda la planta queda cubierta
    L = n_ejes * paso
    ejes_y = [paso / 2 + i * paso for i in range(n_ejes)]
    huecos_y = [paso * (i + 1) for i in range(n_ejes - 1)]

    # --- planta de ruedas: tresbolillo extendido hasta ambas almas ----------
    ruedas = []
    for i, ye in enumerate(ejes_y):
        x0 = 36 if i % 2 == 0 else 73
        xs = [x0 + 74 * k for k in range(7) if x0 + 74 * k < luz - 38]
        ruedas += [(x, ye) for x in xs]

    # --- desvío: omnis giradas 90° en los huecos --------------------------
    # Corrección del usuario sobre la foto de referencia: en el sentido
    # cruzado NO hay correas de transporte — son omnis giradas 90°; las
    # correas desde el eje común inferior son su transmisión. Cada hueco
    # lleva 4 ruedas sobre ejes hex cortos (eje en Y) EN LAS COLUMNAS DEL
    # TRESBOLILLO DE LA HILERA SUPERIOR: así el bloque soporte (lado de la
    # hilera inferior) cae en la ventana libre de 50 entre coronas de la
    # misma paridad, y las ruedas quedan alternadas hueco a hueco.
    x_ls, z_ls = 160.0, 58.0                     # eje común (corre en Y)
    pol = {"dia": 30.0, "raiz": 24.0, "ancho": 12.8, "dy_centro": 18.5,
           "dy_gargantas": (15.5, 21.5)}         # respecto al centro del hueco
    sp_ls = {"dia": 36.0, "raiz": 30.0, "ancho": 15.0}
    # planos de anillo del tren de AVANCE, junto a cada alma (collares
    # estrechos dentro del campo de ruedas) y el del motor A
    w_A, w_B, w_motorA = 18.0, 427.0, 100.0
    huecos = []
    for k, g in enumerate(huecos_y):
        fila_sup = k + 1                         # índice de la hilera superior
        x0 = 36 if fila_sup % 2 == 0 else 73
        xs = [x0 + 74 * j for j in range(7)
              if x0 + 74 * j < luz - 38
              # la corona girada (±29) no debe pisar los planos de anillo
              # del tren de avance junto a las almas
              and abs(x0 + 74 * j - w_A) > RUEDA["R"] + ORING / 2 + 1
              and abs(x0 + 74 * j - w_B) > RUEDA["R"] + ORING / 2 + 1]
        g1, g2 = (g + pol["dy_gargantas"][0], g + pol["dy_gargantas"][1])
        # 2 risers desde el spool del eje común a los DOS stubs ADYACENTES a
        # x=160 (a un stub lejano el ramal cruzaría el disco de la polea
        # intermedia) + cadenas en serie hacia afuera con gargantas
        # alternadas para que los lazos coplanares no compartan rango de x
        iL = max(i for i, x in enumerate(xs) if x < x_ls)
        iR = iL + 1
        cadenas = []
        for i in range(iR, len(xs) - 1):         # rama derecha
            cadenas.append((xs[i], xs[i + 1], g1 if (i - iR) % 2 == 0 else g2))
        for i in range(iL, 0, -1):               # rama izquierda
            cadenas.append((xs[i], xs[i - 1], g2 if (iL - i) % 2 == 0 else g1))
        huecos.append({
            "y": g, "stubs_x": xs,
            "spool_y": g + pol["dy_centro"],
            "risers": [(xs[iR], g2), (xs[iL], g1)],
            "cadenas": cadenas,
        })
    ruedas_desvio = [(x, h["y"]) for h in huecos for x in h["stubs_x"]]

    # --- tren de AVANCE dentro del campo (v3) --------------------------------
    # Collares estrechos Ø36x9 de una garganta en planos que caben en la
    # ventana de 13 entre columnas junto a cada alma; los anillos eje-a-eje
    # alternan de alma (A, B, A) y cruzan los huecos POR ENCIMA de los
    # travesaños (z>=116) y lejos de las coronas giradas (filtro de stubs).
    collar = {"dia": 36.0, "raiz": 30.0, "ancho": 9.0}
    links = [(i, i + 1, w_A if i % 2 == 0 else w_B)
             for i in range(n_ejes - 1)]
    # motores COLGADOS bajo el fondo del canal sobre bancadas: placa vertical
    # con el patrón 152.7x139.7 + pestaña superior atornillada a la bancada
    motor_a = {"y": 340.0, "z": -82.0, "cara_x": 110.0, "polea_dia": 44.0,
               "polea_centro": 96.0, "plano_anillo": w_motorA,
               "conduce": f"eje{n_ejes}"}
    # la chumacera del catálogo ocupa 55 a lo largo del eje (x 117..203):
    # el anillo del motor B libra su cubo por y (plano 70 > 58) y el del
    # motor A lo libra por x (banda 97.6..102.4 < 117)
    motor_b = {"x": x_ls, "z": -82.0, "cara_y": 80.0, "polea_dia": 44.0,
               "polea_centro": 66.0, "plano_anillo": 70.0}
    bancadas = {"z": (-3.0, 0.0), "tab_alto": 25.0,
                "A": {"y": (255.0, 425.0), "slot": (93.0, 107.0, 328.0, 384.0)},
                "B": {"y": (4.0, 160.0), "slot": (135.0, 185.0, 64.0, 76.0)}}
    placa_motor = {"x_span": 20.0, "z0": -160.0}

    d = {
        "formato": "foto3d-modulo-transfer", "version": 1, "generado": now_iso(),
        "capa": "user",
        "parametros": p,
        "frame": {"ancho_total": ancho_total, "luz": round(luz, 2), "largo": L,
                  "alto": alto, "espesor": t, "pestana_sup": ps,
                  "pestana_inf": pi, "tangente": tangente},
        "omnis": {"rueda": RUEDA, "z_eje": z_eje, "ejes_y": ejes_y,
                  "hex": p["hex"], "eje_x": (2.0, luz - 2.0),
                  "ruedas_xy": ruedas, "n_ruedas": len(ruedas),
                  "rodamiento": FR8},
        "desvio": {"n_ruedas": len(ruedas_desvio), "huecos_y": huecos_y,
                   "huecos": huecos, "ruedas_xy": ruedas_desvio,
                   "z_eje": z_eje, "hex": p["hex"],
                   # el eje muere al ras de la polea: a +27 la punta entraba
                   # 1 mm en la banda de la corona superior (y = hueco+26)
                   "eje_y_rel": (-46.0, 24.9),
                   "bloque": {"ancho_x": 40.0, "espesor_y": 30.0,
                              "z": (85.0, 160.0), "y_rel": (-46.0, -16.0)},
                   "travesano": {"z": (78.0, 105.0), "x": (3.0, luz - 3.0),
                                 "y_rel": (-49.0, -46.0)},
                   "polea": pol, "spool": sp_ls,
                   "eje_comun": {"x": x_ls, "z": z_ls, "dia": 20.0,
                                 "y": (4.0, L - 7.0)},
                   "rodamiento": FR8},
        "tren_avance": {"planos": {"wA": w_A, "wB": w_B, "motor": w_motorA},
                        "collar": collar, "links": links, "motor": motor_a,
                        "oring": ORING},
        "tren_desvio": {"motor": motor_b, "spool_dia": 36.0},
        "bancadas": bancadas,
        "placa_motor": placa_motor,
        "soportes": {"bloque": (12.0, 54.0, 54.0), "z_top": 159.8,
                     "rodamiento": "FR8ZZ-HexHD (web_facts wf01-wf05)"},
        "tapa": {"z": (160.0, 163.0), "ranura_rueda": (32.0, 46.0),
                 "ranura_desvio": (46.0, 32.0)},
        "justificacion": {
            "ancho": f"BF {bf:g} - 2x{holg:g} de holgura = {ancho_total:g}; "
                     f"pestañas {pi:g} afuera => luz entre almas {luz:.1f}",
            "tangente": "rasante con la cara superior de la pestaña (lectura "
                        "fijada en DECISIONES.md); labio de transición del desvío",
            "paso_ejes": f"paso {paso:g} => hueco entre coronas Ø58 = "
                         f"{paso - 2 * RUEDA['R']:g}: caben la rueda girada "
                         "(24.1), su polea (12.8) y el bloque soporte (30) "
                         "entre los ejes vecinos",
            "ruedas": "tresbolillo a paso 74 con desfase 37 EXTENDIDO hasta "
                      "ambas almas (v3: la caja no debe pisar planta sin "
                      "omnis): una caja de 250 apoya siempre en >=2 hileras "
                      "y >=4 ruedas de avance",
            "desvio_omnis": "lo que la foto de referencia muestra en el "
                            "sentido cruzado son omnis giradas 90° (corrección "
                            "del usuario): misma RUEDA-OMNI-58 sobre ejes hex "
                            "cortos en Y, tangentes al MISMO plano de "
                            "transporte — las omnis no necesitan pop-up porque "
                            "sus barriles ruedan libres en el sentido pasivo",
            "stubs_en_columnas": "los ejes cortos van en las columnas del "
                                 "tresbolillo de la hilera SUPERIOR del hueco: "
                                 "el bloque (40 de ancho) cae centrado en la "
                                 "ventana libre de 50 entre coronas de la "
                                 "hilera inferior, y hueco a hueco las ruedas "
                                 "de desvío quedan alternadas 37 en x",
            "transmision_desvio": "por hueco: spool de 2 gargantas en el eje "
                                  "común (planos a hueco+15.5/+21.5, la banda "
                                  "libre entre la rueda girada y la corona "
                                  "vecina) lanza 2 risers de o-ring a los DOS "
                                  "stubs adyacentes a x=160 — a un stub "
                                  "lejano el ramal cruzaría el disco de la "
                                  "polea intermedia — y 2 cadenas stub-a-stub "
                                  "salen hacia afuera con gargantas "
                                  "alternadas para que los lazos coplanares "
                                  "no compartan rango de x (holgura medida)",
            "take_up": "los o-rings tensan por estiramiento 10-12% "
                       "(web_facts wf07-wf08): sin colisas ni tensores",
            "tren_avance": "v3: anillos eje-a-eje DENTRO del campo, en planos "
                           "junto a las almas (x=18 y x=427, alternando) que "
                           "caen en la ventana de 13 entre columnas; collares "
                           "estrechos Ø36x9 de una garganta en vez del spool "
                           "ancho ZP2026 (un spool de 34 pisaría las coronas "
                           "vecinas). Los anillos cruzan los huecos a z>=116: "
                           "sobre los travesaños (105) y lejos de las coronas "
                           "giradas (los stubs que pisarían esos planos se "
                           "filtran del desvío)",
            "collares": "Ø36 raíz 30: el anillo pasa bajo la tapa (z=160) "
                        "con 4 de aire y sobre el travesaño con 11",
            "soportes": "bloques al alma con rodamiento FR8ZZ de barreno "
                        "hexagonal 1/2 pulg (OD 28.575, brida 31.12 - "
                        "web_facts): el eje hex gira directo, sin adaptadores",
            "motores_debajo": "v3 (\"compacta hacia abajo\"): los UniDrive "
                              "(Ø118x62.7) cuelgan BAJO el fondo del canal en "
                              "placas verticales con el patrón 152.7x139.7, "
                              "atornilladas a bancadas de chapa que cruzan "
                              "entre almas — la planta completa queda "
                              "cubierta por omnis y el módulo se compacta a "
                              f"L={n_ejes * paso:g}",
            "motor_a": "bajo el eje 4 (y=340, z=-75), eje hacia -X: su "
                       "anillo sube por el plano x=126.5 (ventana entre "
                       "columnas 110/147 del eje 4) hasta un collar propio; "
                       "el patrón cabe en y 264..416 < largo del módulo",
            "motor_b": "bajo el eje común (x=160, z=-75), eje hacia -Y: "
                       "anillo vertical en el plano y=49 al spool del eje "
                       "común (tras el cubo de la chumacera A, que llega a "
                       "y=34)",
            "desvio_lado": "las ruedas giradas cubren coronas x 7..398: "
                           "desvío preferente hacia el alma A; junto a las "
                           "almas quedan solo los planos de anillo del tren "
                           "(franjas de ~25)",
        },
    }
    return d


PARAMS_DEF = {"bf": 21 * IN, "holgura_bf": 3.0, "alto": 6.5 * IN, "espesor": 3.0,
              "pestana_sup": 1.4 * IN, "pestana_inf": 1.5 * IN, "resalte": 0.0,
              "hex": 12.7, "ejes": 4, "paso": 110.0}


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

    f, om, dv = d["frame"], d["omnis"], d["desvio"]
    to, tc = d["tren_avance"], d["tren_desvio"]
    bc, pm = d["bancadas"], d["placa_motor"]
    t = f["espesor"]
    luz, L, alto = f["luz"], f["largo"], f["alto"]
    piezas, unicos, planos2d = [], {}, {}

    def inst(nombre, malla, grupo):
        piezas.append((nombre, malla, grupo))

    # --- canales laterales (taladrados por lado) -----------------------------
    ag_bloques = []
    for ye in om["ejes_y"]:
        ag_bloques += [(ye - 15, 122, 5.5), (ye + 15, 122, 5.5),
                       (ye - 15, 146, 5.5), (ye + 15, 146, 5.5)]
    for (y0b, y1b) in (bc["A"]["y"], bc["B"]["y"]):   # pestañas de bancada
        ag_bloques += [(y0b + 15, 12, 5.5), (y1b - 15, 12, 5.5)]
    ag_A = list(ag_bloques)
    ag_B = list(ag_bloques)
    for g in dv["huecos_y"]:                     # pestañas de travesaño (ambas)
        ag_A += [(g - 43, 91.5, 5.5), (g - 30, 91.5, 5.5)]
        ag_B += [(g - 43, 91.5, 5.5), (g - 30, 91.5, 5.5)]
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

    # --- placas extremas -----------------------------------------------------
    x_ls, z_ls = dv["eje_comun"]["x"], dv["eje_comun"]["z"]
    pl_ext = sbox(0, 12, luz, 158).difference(
        Point(x_ls, z_ls).buffer(13, quad_segs=24))
    extremoA = _plate_xz(pl_ext, t, 0.0, "canal")
    inst("placa_extremo_A", extremoA, "frame")
    pl_extB = sbox(0, 12, luz, 158)
    extremoB = _plate_xz(pl_extB, t, L - t - 0.0, "canal")
    inst("placa_extremo_B", extremoB, "frame")
    planos2d["placa_extremo"] = pl_ext
    unicos["placa_extremo"] = (_plate_xz(pl_ext, t, 0, "canal"), 2,
                               "chapa 3 mm; la A lleva el paso del eje común, "
                               "la B recibe la chumacera interior")

    # --- bancadas y placas de motor COLGADAS (v3) ----------------------------
    # bancada: chapa 3 horizontal al ras del fondo (z -3..0) con pestañas
    # dobladas hacia arriba atornilladas a ambas almas y ranura para el
    # anillo del motor; la placa de motor cuelga vertical de su cara inferior
    u = UNIDRIVE
    z0bc, z1bc = bc["z"]

    def bancada(nombre, y0b, y1b, slot):
        plan = sbox(2.0, y0b, luz - 2.0, y1b).difference(
            sbox(slot[0], slot[2], slot[1], slot[3]))
        base = trimesh.creation.extrude_polygon(plan, z1bc - z0bc)
        base.apply_translation((0, 0, z0bc))
        tabs = []
        for x0t in (0.0, luz - t):
            tb = trimesh.creation.box((t, y1b - y0b - 4, bc["tab_alto"]))
            tb.apply_translation((x0t + t / 2, (y0b + y1b) / 2,
                                  bc["tab_alto"] / 2 - 1.0))
            tabs.append(tb)
        m = trimesh.boolean.union([base] + tabs)
        m.visual.face_colors = COL["canal"]
        planos2d[nombre] = plan
        return m

    def perfil_placa_motor(nombre, boss_uv):
        """Polígono (u, z) de una placa de motor colgada: boss + patrón del
        UniDrive con verificación de que cada taladro cae dentro."""
        u0, u1 = boss_uv[0] - 95.0, boss_uv[0] + 95.0
        pl = sbox(u0, pm["z0"], u1, z0bc - 2.0)
        pl = pl.difference(Point(*boss_uv).buffer(u["boss_dia"] / 2 + 1,
                                                  quad_segs=24))
        for su in (-1, 1):
            for sz in (-1, 1):
                centro = Point(boss_uv[0] + su * u["patron"][0] / 2,
                               boss_uv[1] + sz * u["patron"][1] / 2)
                if not pl.contains(centro.buffer(u["perno"] / 2 + 2)):
                    raise ValueError(f"taladro de {nombre} fuera de la placa: "
                                     f"{centro.wkt}")
                pl = pl.difference(centro.buffer(u["perno"] / 2 + 0.3,
                                                 quad_segs=12))
        planos2d[nombre] = pl
        return pl, (u0, u1)

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
    unicos["rueda_omni"] = (rueda.copy(), om["n_ruedas"] + dv["n_ruedas"],
                            "RUEDA-OMNI-58 (Ø58, barreno hex 12.85) — LOD; "
                            f"{om['n_ruedas']} de avance + {dv['n_ruedas']} "
                            "giradas 90° en el desvío")
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

    # --- desvío: travesaños, ejes cortos, omnis giradas y su transmisión -----
    z_dv = dv["z_eje"]
    y0r, y1r = dv["eje_y_rel"]
    blq_d, tw, pol, spl = dv["bloque"], dv["travesano"], dv["polea"], dv["spool"]

    # travesaño: chapa 3 plegada, cuerpo perpendicular a Y (z 78..105, pasa
    # 2.1 bajo las coronas) con pestañas a ambas almas
    x0w, x1w = tw["x"]
    z0w, z1w = tw["z"]
    cuerpo_w = trimesh.creation.box((x1w - 4.0, t, z1w - z0w))
    cuerpo_w.apply_translation((2.0 + (x1w - 4.0) / 2, t / 2, (z0w + z1w) / 2))
    tab_a = trimesh.creation.box((t, 25.0, z1w - z0w))
    tab_a.apply_translation((t / 2, 12.5, (z0w + z1w) / 2))
    tab_p = trimesh.creation.box((t, 25.0, z1w - z0w))
    tab_p.apply_translation((x1w - t / 2, 12.5, (z0w + z1w) / 2))
    trav = trimesh.boolean.union([cuerpo_w, tab_a, tab_p])
    trav.visual.face_colors = COL["canal"]
    unicos["travesano_desvio"] = (trav.copy(), len(dv["huecos"]),
                                  "chapa 3 mm plegada bajo cada hueco: "
                                  "pestañas a ambas almas (M5); los bloques "
                                  "del desvío atornillan a su cara")

    # bloque soporte en voladizo: DOBLE FR8ZZ (los dos asientos en línea),
    # atornillado al travesaño; la tapa remata arriba
    perfil_bd = sbox(-blq_d["ancho_x"] / 2, blq_d["z"][0],
                     blq_d["ancho_x"] / 2, blq_d["z"][1]).difference(
        Point(0, z_dv).buffer(FR8["od"] / 2, quad_segs=32))
    bloque_dm = _plate_xz(perfil_bd, blq_d["espesor_y"], 0.0, "soporte")
    planos2d["soporte_desvio"] = perfil_bd
    unicos["soporte_desvio"] = (bloque_dm.copy(), dv["n_ruedas"],
                                "bloque 30 con DOS FR8ZZ-HexHD en línea "
                                "(voladizo de rueda+polea), 2x M5 al travesaño")

    eje_dm = hex_prisma(dv["hex"], y1r - y0r)
    unicos["eje_desvio_hex"] = (eje_dm.copy(), dv["n_ruedas"],
                                f"hex {dv['hex']:g} x {y1r - y0r:g} mm; "
                                "collarín en el lado del bloque, el "
                                "prisionero de la polea retiene el otro")
    rueda_d = rueda_lod(RUEDA["R"], RUEDA["a"], RUEDA["largo_rodillo"],
                        RUEDA["n_rodillos"], RUEDA["desfase_deg"],
                        RUEDA["ancho_paquete"], RUEDA["hex_barreno"])
    polea_dm = spool_2g(pol["dia"], pol["ancho"], None, prof_gar=3.0,
                        ancho_gar=5.5, hex_bore=dv["hex"] + 0.15,
                        gargantas=(-3.0, 3.0))
    unicos["polea_desvio_2g"] = (polea_dm.copy(), dv["n_ruedas"],
                                 f"Ø{pol['dia']:g} dos gargantas (±3), "
                                 "barreno hex: recibe riser o cadena")
    spool_dm = spool_2g(spl["dia"], spl["ancho"], 20.2, gargantas=(-3.0, 3.0))
    unicos["spool_desvio_2g"] = (spool_dm.copy(), len(dv["huecos"]),
                                 f"Ø{spl['dia']:g} dos gargantas (±3) bore "
                                 "20.2 + prisionero, en el eje común")
    r_sp, r_pd = spl["raiz"] / 2, pol["raiz"] / 2
    for k, h in enumerate(dv["huecos"]):
        g = h["y"]
        tv = trav.copy()
        tv.apply_translation((0, g + tw["y_rel"][0], 0))
        inst(f"trav_h{k+1}", tv, "desvio")
        for j, x in enumerate(h["stubs_x"]):
            b = bloque_dm.copy()
            b.apply_translation((x, g + blq_d["y_rel"][0], 0))
            inst(f"soporte_desvio_h{k+1}_{j+1}", b, "desvio")
            e = eje_dm.copy()
            e.apply_translation((x, g + y0r, z_dv))
            inst(f"eje_desvio_h{k+1}_{j+1}", e, "desvio")
            r = rueda_d.copy()
            r.apply_translation((x, g, z_dv))
            inst(f"rueda_desvio_h{k+1}_{j+1}", r, "desvio")
            po = polea_dm.copy()
            po.apply_translation((x, g + pol["dy_centro"], z_dv))
            inst(f"polea_desvio_h{k+1}_{j+1}", po, "desvio")
        s = spool_dm.copy()
        s.apply_translation((x_ls, h["spool_y"], z_ls))
        inst(f"spool_desvio_h{k+1}", s, "desvio")
        for tag, (xr, gy) in zip(("a", "b"), h["risers"]):
            ring = oring_xz((x_ls, z_ls), (xr, z_dv), r_sp, r_pd, ORING, gy)
            inst(f"oring_riser_h{k+1}_{tag}", ring, "desvio")
        for j, (xa, xb, gy) in enumerate(h["cadenas"]):
            ring = oring_xz((xa, z_dv), (xb, z_dv), r_pd, r_pd, ORING, gy)
            inst(f"oring_cadena_h{k+1}_{j+1}", ring, "desvio")

    # --- eje común + chumaceras + spool --------------------------------------
    y0l, y1l = dv["eje_comun"]["y"]
    eje_ls = trimesh.creation.cylinder(radius=dv["eje_comun"]["dia"] / 2,
                                       height=y1l - y0l, sections=32)
    _rot(eje_ls, [1, 0, 0], 90)
    eje_ls.apply_translation((x_ls, (y0l + y1l) / 2, z_ls))
    eje_ls.visual.face_colors = COL["linea"]
    inst("eje_comun", eje_ls, "desvio")
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
    inst("ucfl204_extremoA", u1, "desvio")
    u2 = ucfl.copy()
    _rot(u2, [1, 0, 0], 90)
    u2.apply_translation((x_ls, L - t, z_ls))
    inst("ucfl204_extremoB", u2, "desvio")

    # --- tren de AVANCE: collares junto a las almas + anillos eje a eje ------
    co_ = to["collar"]
    collar_m = spool_2g(co_["dia"], co_["ancho"], None,
                        hex_bore=om["hex"] + 0.15, gargantas=(0.0,))
    _rot(collar_m, [0, 0, 1], -90)                # eje a X
    n_collares = 0
    ys = om["ejes_y"]
    r_g = co_["raiz"] / 2
    for (i, j, w) in to["links"]:
        for eje_idx in (i, j):
            c2 = collar_m.copy()
            c2.apply_translation((w, ys[eje_idx], om["z_eje"]))
            inst(f"collar_e{eje_idx+1}_w{int(w)}", c2, "tren")
            n_collares += 1
        ring = oring_solido((ys[i], om["z_eje"]), (ys[j], om["z_eje"]),
                            r_g, r_g, ORING, w)
        inst(f"oring_link_{i+1}", ring, "tren")
    unicos["collar_anillo"] = (collar_m.copy(), n_collares + 1,
                               f"Ø{co_['dia']:g}x{co_['ancho']:g} una "
                               "garganta, barreno hex + prisionero: cabe en "
                               "la ventana de 13 entre columnas")

    # --- motores COLGADOS bajo el fondo, sobre bancadas ----------------------
    ma = to["motor"]
    mb = tc["motor"]
    banc_A = bancada("bancada_A", *bc["A"]["y"], bc["A"]["slot"])
    inst("bancada_A", banc_A, "motores")
    unicos["bancada_motor_A"] = (banc_A.copy(), 1,
                                 "chapa 3 al ras del fondo con pestañas a "
                                 "ambas almas y ranura del anillo del motor A")
    banc_B = bancada("bancada_B", *bc["B"]["y"], bc["B"]["slot"])
    inst("bancada_B", banc_B, "motores")
    unicos["bancada_motor_B"] = (banc_B.copy(), 1,
                                 "chapa 3 al ras del fondo con pestañas a "
                                 "ambas almas y ranura del anillo del motor B")

    motor = motor_unidrive(largo_eje=34.0)
    unicos["motor_unidrive"] = (motor.copy(), 2,
                                "UniDrive ONE (ficha S-UD23062200R01) — COMPRADO")
    pol_m = spool_2g(ma["polea_dia"], 20.0, UNIDRIVE["eje_d"] + 0.2,
                     prof_gar=3.0, ancho_gar=5.5)
    _rot(pol_m, [0, 0, 1], -90)                   # eje a X

    # motor A: eje hacia -X en (y=340, z=-75); placa vertical perpendicular
    # a X con pestaña superior doblada bajo la bancada A
    pl_A, (uA0, uA1) = perfil_placa_motor("placa_motor_A", (ma["y"], ma["z"]))
    plA = _plate_yz(pl_A, t, ma["cara_x"] - t, "canal")
    flA = trimesh.creation.box((18.0, uA1 - uA0 - 4, t))
    flA.apply_translation((ma["cara_x"] - t + 1.0 + 9.0, (uA0 + uA1) / 2,
                           z0bc - 3.0 + t / 2))
    placa_A = trimesh.boolean.union([plA, flA])
    placa_A.visual.face_colors = COL["canal"]
    inst("placa_motor_A", placa_A, "motores")
    unicos["placa_motor_A"] = (placa_A.copy(), 1,
                               "chapa 3 colgada: patrón UniDrive 152.7x139.7 "
                               "+ boss Ø41.5; pestaña M6 bajo la bancada A")
    mA = motor.copy()
    _rot(mA, [0, 0, 1], 90)                       # patrón largo al eje Y local
    _rot(mA, [0, 1, 0], -90)                      # eje del motor a -X
    mA.apply_translation((ma["cara_x"] + UNIDRIVE["cuerpo_largo"],
                          ma["y"], ma["z"]))
    inst("motor_A", mA, "motores")
    pmA = pol_m.copy()
    pmA.apply_translation((ma["polea_centro"], ma["y"], ma["z"]))
    inst("polea_motor_A", pmA, "motores")
    unicos["polea_motor_2g"] = (pol_m.copy(), 2,
                                "Ø44, garganta a plano de anillo, bore D 12.7")
    ringA = oring_solido((ma["y"], ma["z"]), (ys[-1], om["z_eje"]),
                         ma["polea_dia"] / 2 - 3, r_g, ORING,
                         to["planos"]["motor"])
    inst("oring_motorA", ringA, "tren")
    cmot = collar_m.copy()
    cmot.apply_translation((to["planos"]["motor"], ys[-1], om["z_eje"]))
    inst(f"collar_e{len(ys)}_w{int(to['planos']['motor'])}", cmot, "tren")

    # motor B: eje hacia -Y en (x=160, z=-75) bajo el eje común; placa
    # vertical perpendicular a Y con pestaña bajo la bancada B
    pl_B, (uB0, uB1) = perfil_placa_motor("placa_motor_B", (mb["x"], mb["z"]))
    plB = _plate_xz(pl_B, t, mb["cara_y"] - t, "canal")
    flB = trimesh.creation.box((uB1 - uB0 - 4, 18.0, t))
    flB.apply_translation(((uB0 + uB1) / 2, mb["cara_y"] - t + 1.0 + 9.0,
                           z0bc - 3.0 + t / 2))
    placa_B = trimesh.boolean.union([plB, flB])
    placa_B.visual.face_colors = COL["canal"]
    inst("placa_motor_B", placa_B, "motores")
    unicos["placa_motor_B"] = (placa_B.copy(), 1,
                               "chapa 3 colgada: patrón UniDrive 152.7x139.7 "
                               "+ boss Ø41.5; pestaña M6 bajo la bancada B")
    mB = motor.copy()
    _rot(mB, [1, 0, 0], 90)                       # eje del motor a -Y
    mB.apply_translation((mb["x"], mb["cara_y"] + UNIDRIVE["cuerpo_largo"],
                          mb["z"]))
    inst("motor_B", mB, "motores")
    sp_ls = spool_2g(36.0, 20.0, 20.2)
    unicos["spool_eje_comun"] = (sp_ls.copy(), 1,
                                 "Ø36 una garganta útil, bore 20.2 + prisionero")
    s3 = sp_ls.copy()
    s3.apply_translation((x_ls, mb["plano_anillo"] + 4.0, z_ls))
    inst("spool_eje_comun", s3, "desvio")
    pmB = pol_m.copy()
    _rot(pmB, [0, 0, 1], 90)                      # eje a Y
    pmB.apply_translation((mb["x"], mb["polea_centro"], mb["z"]))
    inst("polea_motor_B", pmB, "motores")
    ringB = oring_xz((mb["x"], mb["z"]), (x_ls, z_ls),
                     mb["polea_dia"] / 2 - 3, 16.0, ORING, mb["plano_anillo"])
    inst("oring_motorB", ringB, "motores")

    # --- tapa ranurada (booleana: sólido - prismas de ranura, estanca) -------
    # v3: ranuras ESTADIO uniformes (mismo 46x32 con extremos r16) para ambas
    # familias, con el eje largo en el sentido de rodadura de cada rueda
    z0t, z1t = d["tapa"]["z"]
    an_r, lg_r = d["tapa"]["ranura_rueda"]        # (ancho 32, largo 46)
    base = trimesh.creation.box((luz - 8, L - 8, z1t - z0t))
    base.apply_translation((luz / 2, L / 2, (z0t + z1t) / 2))

    def ranura(x, y, largo, ancho, rodadura_y):
        """Estadio limpio de `largo` total con extremos semicirculares
        r=ancho/2 (los semicírculos entran 0.1: la tangencia exacta deja
        aristas no-manifold en el STL)."""
        semi = (largo - ancho) / 2
        if rodadura_y:
            est = sbox(x - ancho / 2, y - semi, x + ancho / 2, y + semi)
            caps = (Point(x, y - semi + 0.1), Point(x, y + semi - 0.1))
        else:
            est = sbox(x - semi, y - ancho / 2, x + semi, y + ancho / 2)
            caps = (Point(x - semi + 0.1, y), Point(x + semi - 0.1, y))
        for c in caps:
            est = est.union(c.buffer(ancho / 2, quad_segs=16))
        return est

    ranuras2d = [ranura(x, y, lg_r, an_r, True) for (x, y) in om["ruedas_xy"]]
    ranuras2d += [ranura(x, y, lg_r, an_r, False) for (x, y) in dv["ruedas_xy"]]
    cortes_t = []
    for est in ranuras2d:
        pr = trimesh.creation.extrude_polygon(est, 9.0)
        pr.apply_translation((0, 0, z0t - 3))
        cortes_t.append(pr)
    tapa = trimesh.boolean.difference([base] + cortes_t)
    tapa.visual.face_colors = COL["tapa"]
    tapa2d = sbox(4, 4, luz - 4, L - 4)
    for est in ranuras2d:
        tapa2d = tapa2d.difference(est)
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
    f, om, dv = d["frame"], d["omnis"], d["desvio"]
    v = {}

    # 1 — encaje en BF
    margen = (d["parametros"]["bf"] - f["ancho_total"]) / 2
    v["encaje_bf"] = {"ancho_total": f["ancho_total"],
                      "bf": d["parametros"]["bf"],
                      "margen_por_lado": round(margen, 2),
                      "verdicto": "PASA" if margen >= 2 else "FALLA"}

    # 2 — tangencias en el plano de transporte (avance y desvío coplanares:
    # las omnis cruzadas no se pelean — el sentido parado rueda libre)
    tang = f["tangente"]
    z_av = [round(m.bounds[1][2], 3) for n, m, g in piezas
            if n.startswith("rueda_") and not n.startswith("rueda_desvio")]
    z_de = [round(m.bounds[1][2], 3) for n, m, g in piezas
            if n.startswith("rueda_desvio")]
    err = max(abs(z - tang) for z in z_av + z_de)
    v["tangencia"] = {"plano": tang, "avance_max": max(z_av),
                      "desvio_max": max(z_de),
                      "error_max": round(err, 3),
                      "verdicto": "PASA" if err <= 0.1 else "FALLA"}

    # 3 — TODOS los anillos (avance, motores y desvío): envolvente y longitud
    x_ls, z_ls = dv["eje_comun"]["x"], dv["eje_comun"]["z"]
    z_dv = dv["z_eje"]
    to_, tc_ = d["tren_avance"], d["tren_desvio"]
    r_sp, r_pd = dv["spool"]["raiz"] / 2, dv["polea"]["raiz"] / 2
    r_co = to_["collar"]["raiz"] / 2

    def lazo_2p(c1, c2, r1, r2):
        a12 = math.degrees(math.atan2(c2[1] - c1[1], c2[0] - c1[0]))
        circ = [(c1[0], c1[1], r1 + ORING / 2, a12 + 180.0),
                (c2[0], c2[1], r2 + ORING / 2, a12)]
        hints = [(a12 - 90.0, a12 - 90.0), (a12 + 90.0, a12 + 90.0)]
        env = envolturas_lazo(circ, hints)
        pts = trayectoria_correa(circ, hints, n_arc=40)
        largo = sum(math.hypot(pts[i + 1][0] - pts[i][0],
                               pts[i + 1][1] - pts[i][1])
                    for i in range(len(pts) - 1))
        largo += math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1])
        return env, round(largo, 1)

    anillos = []
    ys_e = om["ejes_y"]
    for (i, j, w) in to_["links"]:
        env, largo = lazo_2p((ys_e[i], om["z_eje"]), (ys_e[j], om["z_eje"]),
                             r_co, r_co)
        anillos.append({"anillo": f"link_e{i+1}_e{j+1}", "envolventes": env,
                        "largo_mm": largo})
    ma_, mb_ = to_["motor"], tc_["motor"]
    env, largo = lazo_2p((ma_["y"], ma_["z"]), (ys_e[-1], om["z_eje"]),
                         ma_["polea_dia"] / 2 - 3, r_co)
    anillos.append({"anillo": "motor_A", "envolventes": env, "largo_mm": largo})
    env, largo = lazo_2p((mb_["x"], mb_["z"]), (x_ls, z_ls),
                         mb_["polea_dia"] / 2 - 3, 16.0)
    anillos.append({"anillo": "motor_B", "envolventes": env, "largo_mm": largo})
    for k, h in enumerate(dv["huecos"]):
        for tag, (xr, gy) in zip(("riser_a", "riser_b"), h["risers"]):
            env, largo = lazo_2p((x_ls, z_ls), (xr, z_dv), r_sp, r_pd)
            anillos.append({"anillo": f"h{k+1}_{tag}", "envolventes": env,
                            "largo_mm": largo})
        for j, (xa, xb, gy) in enumerate(h["cadenas"]):
            env, largo = lazo_2p((xa, z_dv), (xb, z_dv), r_pd, r_pd)
            anillos.append({"anillo": f"h{k+1}_cadena_{j+1}",
                            "envolventes": env, "largo_mm": largo})
    env_min = min(min(a["envolventes"]) for a in anillos)
    d["desvio"]["lazos_mm"] = {a["anillo"]: a["largo_mm"] for a in anillos}
    v["anillos"] = {
        "n_anillos": len(anillos), "envolvente_min": env_min,
        "anillos": anillos,
        "verdicto": "PASA" if env_min >= 120 else "FALLA",
        "regla": "envolvente >=120 en toda polea (gate NBT90; lazos de 2 "
                 "poleas ~180); tensado por estiramiento 10-12% (wf07-08)"}

    # 4 — apoyo de la caja mínima 250x250 en cualquier posición
    caja = 250.0
    zona_y = (0.0, d["parametros"]["ejes"] * d["parametros"]["paso"])
    peor_r, peor_filas = 99, 99
    peor_d, peor_hd = 99, 99
    for cy in np.linspace(zona_y[0], zona_y[1] - caja, 24):
        for cx in np.linspace(5, f["luz"] - caja - 5, 24):
            dentro = [(x, y) for (x, y) in om["ruedas_xy"]
                      if cx <= x <= cx + caja and cy <= y <= cy + caja]
            filas = len({y for _, y in dentro})
            peor_r = min(peor_r, len(dentro))
            peor_filas = min(peor_filas, filas)
            de = [(x, y) for (x, y) in dv["ruedas_xy"]
                  if cx <= x <= cx + caja and cy <= y <= cy + caja]
            peor_d = min(peor_d, len(de))
            peor_hd = min(peor_hd, len({y for _, y in de}))
    v["apoyo_caja_250"] = {"min_ruedas_avance": peor_r,
                           "min_hileras": peor_filas,
                           "min_ruedas_desvio": peor_d,
                           "min_huecos_desvio": peor_hd,
                           "verdicto": "PASA" if peor_r >= 4 and
                           peor_filas >= 2 and peor_d >= 3 and peor_hd >= 2
                           else "FALLA"}

    # 5 — holguras críticas (analíticas, mm)
    p_ = d["parametros"]
    pol, blq_d, tw = dv["polea"], dv["bloque"], dv["travesano"]
    co_ = to_["collar"]
    w_A, w_B = to_["planos"]["wA"], to_["planos"]["wB"]
    w_M = to_["planos"]["motor"]
    z_anillo = om["z_eje"] + co_["raiz"] / 2 + ORING
    semi_h = p_["paso"] / 2                        # centro de hueco a eje vecino
    col_par = [36 + 74 * k for k in range(7) if 36 + 74 * k < f["luz"] - 38]
    col_impar = [73 + 74 * k for k in range(7) if 73 + 74 * k < f["luz"] - 38]
    hol = {
        "anillo_avance_a_tapa": round(d["tapa"]["z"][0] - z_anillo, 2),
        "anillo_avance_a_travesano": round(
            (om["z_eje"] - co_["raiz"] / 2 - ORING) - tw["z"][1], 2),
        "collar_wA_a_rueda_vecina": round(
            (min(col_par) - RUEDA["ancho_total"] / 2)
            - (w_A + co_["ancho"] / 2), 2),
        "collar_wA_a_soporte_pared": round(
            (w_A - co_["ancho"] / 2) - d["soportes"]["bloque"][0], 2),
        "collar_wB_a_rueda_vecina": round(
            (w_B - co_["ancho"] / 2)
            - (max(col_par) + RUEDA["ancho_total"] / 2), 2),
        "collar_wB_a_soporte_pared": round(
            (f["luz"] - d["soportes"]["bloque"][0])
            - (w_B + co_["ancho"] / 2), 2),
        "collar_motorA_a_rueda": round(
            min(abs(c - w_M) for c in col_impar)
            - RUEDA["ancho_total"] / 2 - co_["ancho"] / 2, 2),
        "anillo_avance_a_corona_girada": round(
            min(abs(x - w) for h in dv["huecos"] for x in h["stubs_x"]
                for w in (w_A, w_B)) - RUEDA["R"] - ORING / 2, 2),
        "rueda_a_ranura_tapa": round((d["tapa"]["ranura_rueda"][0] -
                                      RUEDA["ancho_total"]) / 2, 2),
        "rueda_desvio_a_ranura_tapa": round((d["tapa"]["ranura_desvio"][1] -
                                             RUEDA["ancho_total"]) / 2, 2),
        # desvío: todo vive en la banda libre entre la rueda girada (±12.04)
        # y las coronas vecinas (paso/2 - 29 = ±26)
        "polea_desvio_a_corona_vecina": round(
            (semi_h - RUEDA["R"]) - (pol["dy_centro"] + pol["ancho"] / 2), 2),
        "anillo_sup_a_corona_vecina": round(
            (semi_h - RUEDA["R"]) - (pol["dy_gargantas"][1] + ORING / 2), 2),
        "cadena_inf_a_rueda_desvio": round(
            (pol["dy_gargantas"][0] - ORING / 2) - RUEDA["ancho_total"] / 2, 2),
        "bloque_desvio_a_eje_inferior": round(
            (semi_h - p_["hex"] / math.sqrt(3)) + blq_d["y_rel"][0], 2),
        "stub_a_eje_superior": round(
            (semi_h - p_["hex"] / math.sqrt(3)) - dv["eje_y_rel"][1], 2),
        "stub_a_corona_superior": round(
            (semi_h - RUEDA["R"]) - dv["eje_y_rel"][1], 2),
        "travesano_a_vuelo_ruedas": round(
            (om["z_eje"] - RUEDA["R"]) - tw["z"][1], 2),
        "travesano_a_eje_inferior_z": round(
            (om["z_eje"] - p_["hex"] / math.sqrt(3)) - tw["z"][1], 2),
        "polea_desvio_a_tapa": round(
            d["tapa"]["z"][0] - (z_dv + pol["dia"] / 2), 2),
        "anillo_riser_a_tapa": round(
            d["tapa"]["z"][0] - (z_dv + r_pd + ORING), 2),
    }

    # el riser y la cadena coplanar (misma garganta) comparten rango de x
    # solo en el arrollado bajo del spool: medir el paso más apretado
    def z_riser_en(x, c1, r1, c2, r2):
        """Cota z superior del lazo riser en x (arrollados + ramal superior)."""
        zs = []
        for (cx, cz, rr) in ((c1[0], c1[1], r1 + ORING),
                             (c2[0], c2[1], r2 + ORING)):
            if abs(x - cx) <= rr:
                zs.append(cz + math.sqrt(rr * rr - (x - cx) ** 2))
        dx, dz2 = c2[0] - c1[0], c2[1] - c1[1]
        dd = math.hypot(dx, dz2)
        ph = math.asin((r1 - r2) / dd)
        th = math.atan2(dz2, dx)
        lado = 1.0 if dx >= 0 else -1.0
        nx, nz = -lado * math.sin(th - lado * ph), lado * math.cos(th - lado * ph)
        p1 = (c1[0] + (r1 + ORING) * nx, c1[1] + (r1 + ORING) * nz)
        p2 = (c2[0] + (r2 + ORING) * nx, c2[1] + (r2 + ORING) * nz)
        x0s, x1s = min(p1[0], p2[0]), max(p1[0], p2[0])
        if x0s <= x <= x1s and abs(p2[0] - p1[0]) > 1e-9:
            zs.append(p1[1] + (p2[1] - p1[1]) * (x - p1[0]) / (p2[0] - p1[0]))
        return max(zs) if zs else None

    margen_riser = 99.0
    gap_cadenas = 99.0
    fondo_cadena = z_dv - r_pd - ORING
    rw = r_pd + ORING
    for h in dv["huecos"]:
        for (xr, gr) in h["risers"]:
            for (xa, xb, gc) in h["cadenas"]:
                if abs(gc - gr) > 1e-6:
                    continue
                c_lo = min(xa, xb) - rw
                c_hi = max(xa, xb) + rw
                for x in np.linspace(c_lo, c_hi, 41):
                    z = z_riser_en(x, (x_ls, z_ls), r_sp, (xr, z_dv), r_pd)
                    if z is not None:
                        margen_riser = min(margen_riser, fondo_cadena - z)
        for i1 in range(len(h["cadenas"])):
            for i2 in range(i1 + 1, len(h["cadenas"])):
                (xa1, xb1, g1c) = h["cadenas"][i1]
                (xa2, xb2, g2c) = h["cadenas"][i2]
                if abs(g1c - g2c) > 1e-6:
                    continue
                lo1, hi1 = min(xa1, xb1) - rw, max(xa1, xb1) + rw
                lo2, hi2 = min(xa2, xb2) - rw, max(xa2, xb2) + rw
                gap_cadenas = min(gap_cadenas,
                                  max(lo2 - hi1, lo1 - hi2))
    hol["riser_bajo_cadena_coplanar"] = round(margen_riser, 2)
    hol["cadenas_coplanares_gap_x"] = round(gap_cadenas, 2)

    # el anillo del motor A cruza en x alguna cadena del último hueco: a esa
    # y el lazo va muy abajo — medirlo con la misma construcción de tangentes
    margen_mA = 99.0
    for (xa, xb, gy) in dv["huecos"][-1]["cadenas"]:
        if not (min(xa, xb) - rw <= w_M <= max(xa, xb) + rw):
            continue
        for yq in np.linspace(gy - ORING / 2, gy + ORING / 2, 9):
            z = z_riser_en(yq, (ma_["y"], ma_["z"]),
                           ma_["polea_dia"] / 2 - 3,
                           (om["ejes_y"][-1], om["z_eje"]), r_co)
            if z is not None:
                margen_mA = min(margen_mA, fondo_cadena - z)
    hol["anillo_motorA_bajo_cadenas_h3"] = round(margen_mA, 2)

    # motores colgados: todo su volumen vive bajo el fondo (z<0)
    hol["motorA_cuerpo_bajo_fondo"] = round(
        0.0 - (ma_["z"] + UNIDRIVE["cuerpo_dia"] / 2), 2)
    hol["motorB_cuerpo_bajo_fondo"] = round(
        0.0 - (mb_["z"] + UNIDRIVE["cuerpo_dia"] / 2), 2)
    hol["motorA_a_motorB_y"] = round(
        (ma_["y"] - UNIDRIVE["cuerpo_dia"] / 2)
        - (mb_["cara_y"] + UNIDRIVE["cuerpo_largo"]), 2)
    hol["polea_motorA_a_placa"] = round(
        (ma_["cara_x"] - f["espesor"]) - (ma_["polea_centro"] + 10.0), 2)
    hol["polea_motorB_a_placa"] = round(
        (mb_["cara_y"] - f["espesor"]) - (mb_["polea_centro"] + 10.0), 2)
    hol["patron_A_dentro_del_largo"] = round(
        f["largo"] - (ma_["y"] + UNIDRIVE["patron"][0] / 2
                      + UNIDRIVE["perno"] / 2), 2)
    hol["spool_comun_a_cubo_ucfl_A"] = round(
        (mb_["plano_anillo"] + 4.0 - 10.0) - 58.0, 2)
    hol["anillo_motorA_a_ucfl_B_x"] = round(
        117.0 - (to_["planos"]["motor"] + ORING / 2), 2)
    hol["anillo_motorB_a_trav_h1_y"] = round(
        (mb_["plano_anillo"] - ORING / 2)
        - (dv["huecos_y"][0] + tw["y_rel"][1] + 25.0 - 3.0 - 22.0), 2)
    hol["anillo_motorA_a_polea_desvio"] = round(
        min(abs(x - w_M) for x in dv["huecos"][-1]["stubs_x"])
        - pol["dia"] / 2 - ORING / 2, 2)
    hol["anillo_motorA_a_bloque_h3"] = round(
        (ma_["y"] - (ma_["polea_dia"] / 2 - 3 + ORING))
        - (dv["huecos_y"][-1] + blq_d["y_rel"][1]), 2)
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
        if nombre == "spool_eje_comun":
            return nombre
        n = re.sub(r"collar_e\d+_w\d+", "collar", nombre)
        n = re.sub(r"_h\d+(_\d+|_[ab])?$", "", n)
        n = re.sub(r"soporte_[AB]\d+", "soporte", n)
        n = re.sub(r"_?\d+$", "", n)
        return n

    NOMINALES = {
        # (familia_a, familia_b): por qué se tocan y dónde está la holgura real
        ("eje_omni", "soporte"): "eje dentro del FR8ZZ (barreno hex nominal)",
        ("eje_omni", "collar"): "collar montado en el eje (barreno hex)",
        ("eje_omni", "rueda"): "ruedas montadas en el eje",
        ("eje_omni", "oring_link"): "anillo en la garganta del collar",
        ("oring_link", "collar"): "anillo en su garganta",
        ("oring_motorA", "collar"): "anillo en la garganta del collar",
        ("oring_motorA", "polea_motor_A"): "anillo en su garganta",
        ("oring_motorA", "eje_omni"): "anillo en la garganta del collar",
        ("oring_motorA", "motor_A"): "anillo en la polea del eje D",
        ("oring_motorA", "bancada_A"): "el ramal sube por la ranura de la "
                                       "bancada",
        ("oring_motorA", "rueda_desvio"): "AABB grueso del lazo: a la y de la "
                                          "corona (y<=342) el ramal va a "
                                          "z<-60 (holgura analítica)",
        ("motor_A", "polea_motor_A"): "polea en el eje D del motor",
        ("motor_A", "placa_motor_A"): "espárragos del patrón en la placa",
        ("placa_motor_A", "bancada_A"): "pestaña M6 bajo la bancada",
        ("placa_motor_B", "bancada_B"): "pestaña M6 bajo la bancada",
        ("bancada_A", "canal_A"): "pestaña de bancada al alma (M5)",
        ("bancada_A", "canal_B"): "pestaña de bancada al alma (M5)",
        ("bancada_B", "canal_A"): "pestaña de bancada al alma (M5)",
        ("bancada_B", "canal_B"): "pestaña de bancada al alma (M5)",
        ("motor_B", "placa_motor_B"): "espárragos del patrón en la placa",
        ("motor_B", "oring_motorB"): "anillo en la polea del eje D",
        ("motor_B", "polea_motor_B"): "polea en el eje D del motor",
        ("oring_motorB", "polea_motor_B"): "anillo en su garganta",
        ("oring_motorB", "spool_eje_comun"): "anillo en su garganta",
        ("oring_motorB", "eje_comun"): "anillo en la garganta del spool",
        ("oring_motorB", "bancada_B"): "el ramal sube por la ranura de la "
                                       "bancada",
        ("eje_comun", "spool_eje_comun"): "spool en el eje (prisionero)",
        ("eje_comun", "placa_extremo_A"): "paso Ø26 en la placa A",
        ("eje_comun", "ucfl204_extremoA"): "eje en la chumacera",
        ("eje_comun", "ucfl204_extremoB"): "eje en la chumacera",
        ("rueda", "tapa_superior"): "ranura de rueda en la tapa",
        # desvío: omnis giradas 90° y su transmisión
        ("eje_desvio", "soporte_desvio"): "hex en los DOS FR8ZZ del bloque",
        ("eje_desvio", "rueda_desvio"): "rueda montada en el eje corto",
        ("eje_desvio", "polea_desvio"): "polea de 2 gargantas en el hex",
        ("rueda_desvio", "polea_desvio"): "polea a tope contra la rueda",
        ("rueda_desvio", "tapa_superior"): "ranura de desvío en la tapa",
        ("soporte_desvio", "trav"): "bloque atornillado al travesaño (2x M5)",
        ("soporte_desvio", "tapa_superior"): "la tapa remata en el bloque (M4)",
        ("trav", "canal_A"): "pestaña del travesaño al alma A (M5)",
        ("trav", "canal_B"): "pestaña del travesaño al alma B (M5)",
        ("oring_riser", "spool_desvio"): "anillo en su garganta",
        ("oring_riser", "polea_desvio"): "anillo en su garganta",
        ("oring_riser", "eje_comun"): "anillo en la garganta del spool",
        ("oring_riser", "eje_desvio"): "anillo en la garganta de la polea",
        ("oring_cadena", "polea_desvio"): "anillo en su garganta",
        ("oring_cadena", "eje_desvio"): "anillo en la garganta de la polea",
        ("oring_riser", "oring_cadena"): "coplanares solo sobre el arrollado "
                                         "bajo del spool (holgura "
                                         "riser_bajo_cadena_coplanar)",
        ("oring_cadena", "oring_motorA"): "el lazo del motor cruza esa y a "
                                          "z<=88 y la cadena vive a z>=119 "
                                          "(holgura anillo_motorA_bajo_"
                                          "cadenas_h3)",
        ("trav", "oring_motorB"): "AABB compuesta: el lazo (y 67.6..72.4) "
                                  "libra el cuerpo del travesaño 1 (y<=64, "
                                  "holgura anillo_motorB_a_trav_h1_y) y las "
                                  "pestañas viven en x 0..3 / 439..442",
        ("spool_desvio", "eje_comun"): "spool en el eje (prisionero)",
        ("soporte", "canal_A"): "bloque atornillado al alma (M5)",
        ("soporte", "canal_B"): "bloque atornillado al alma (M5)",
        ("soporte", "tapa_superior"): "la tapa apoya y atornilla en el bloque",
        ("canal_A", "placa_extremo_A"): "placa atornillada entre almas",
        ("canal_A", "placa_extremo_B"): "placa atornillada entre almas",
        ("canal_A", "tapa_superior"): "borde de tapa junto al alma",
        ("canal_B", "placa_extremo_A"): "placa atornillada entre almas",
        ("canal_B", "placa_extremo_B"): "placa atornillada entre almas",
        ("canal_B", "tapa_superior"): "borde de tapa junto al alma",
        ("ucfl204_extremoA", "placa_extremo_A"): "chumacera atornillada M10",
        ("ucfl204_extremoB", "placa_extremo_B"): "chumacera atornillada M10",
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
    mu_o = 0.6                                    # caja sobre barril PU (estático)
    crr = 0.03                                    # rodadura declarada barril/caja
    g = 9.81
    v["cargas_estimadas"] = {
        "supuestos": {"masa_caja_kg": masa, "mu_caja_rueda": mu_o,
                      "coef_rodadura": crr,
                      "o_ring": "3/16 PU 83A al 10-12% (wf06-08); ~45 N útiles "
                                "por anillo (dato de fabricante a validar)"},
        "desvio_traccion_disponible_N": round(mu_o * masa * g, 1),
        "desvio_resistencia_rodadura_N": round(2 * crr * masa * g, 1),
        "ventaja_omnis_cruzadas": "al avanzar, los barriles de las ruedas de "
                                  "desvío ruedan libres (y viceversa): no hay "
                                  "arrastre de superficie parada",
        "anillos_en_serie_avance": d["parametros"]["ejes"],
        "anillos_en_serie_desvio": 1 + max(
            len(h["cadenas"]) - 1 for h in dv["huecos"]) if dv["huecos"] else 0,
        "advertencia": "ambos trenes van EN SERIE por o-rings (avance: motor->"
                       "e4->e3->e2->e1; desvío: eje común->riser->stub->"
                       "cadenas): validar deslizamiento con la carga real o "
                       "duplicar anillos por tramo",
    }
    v["verdicto_global"] = "PASA" if all(
        vv.get("verdicto") == "PASA" for k, vv in v.items()
        if isinstance(vv, dict) and "verdicto" in vv) else "REVISAR"
    return v


# ---------------------------------------------------------------------------
# Salidas
# ---------------------------------------------------------------------------

FABRICADAS = ("canal_lateral", "placa_extremo", "bancada_motor_A",
              "bancada_motor_B", "placa_motor_A", "placa_motor_B",
              "soporte_eje", "tapa_superior", "travesano_desvio",
              "soporte_desvio", "eje_hexagonal", "eje_desvio_hex",
              "polea_desvio_2g", "spool_desvio_2g", "collar_anillo",
              "spool_eje_comun", "polea_motor_2g", "eje_comun_20")
COMPRADAS = {"motor_unidrive": "UniDrive ONE (S-UD23062200R01)",
             "chumacera_ucfl204": "UCFL204 bore Ø20",
             "rueda_omni": "fabricada en el proyecto RUEDA-OMNI-58 (30 uds)",
             "rodamiento_fr8zz_hex": "FR8ZZ-HexHD 1/2\" hex (web_facts wf01-05)",
             "oring_316": "o-ring PU 3/16\" 83A, estirado 10-12% (wf06-08)"}


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
    dv = d["desvio"]
    lazos = dv.get("lazos_mm", {})
    largos = sorted(set(round(x) for x in lazos.values()))
    filas += [
        {"pieza": "motor_unidrive", "cant": 2, "origen": "comprar",
         "nota": COMPRADAS["motor_unidrive"]},
        {"pieza": "chumacera_ucfl204", "cant": 2, "origen": "comprar",
         "nota": COMPRADAS["chumacera_ucfl204"]},
        {"pieza": "rodamiento_fr8zz_hex",
         "cant": 2 * n_ejes + 2 * dv["n_ruedas"], "origen": "comprar",
         "nota": "FR8ZZ-HexHD 1/2 pulg hex (web_facts wf01-wf05): 2 por eje "
                 "de avance y 2 por bloque de desvío"},
        {"pieza": "rueda_omni_58",
         "cant": d["omnis"]["n_ruedas"] + dv["n_ruedas"],
         "origen": "proyecto RUEDA-OMNI-58",
         "nota": "Ø58, barreno hex 12.85, sándwich de placas "
                 f"({d['omnis']['n_ruedas']} avance + {dv['n_ruedas']} desvío)"},
        {"pieza": "oring_pu_316", "cant": len(lazos), "origen": "comprar",
         "nota": "PU 3/16 pulg 83A; lazos instalados "
                 f"~{largos} mm (ver desvio.lazos_mm) — pedir al 88-90% "
                 "del instalado (estirado 10-12%, wf06-08)"},
        {"pieza": "collarin_hex_12.7",
         "cant": 2 * n_ejes + dv["n_ruedas"], "origen": "comprar",
         "nota": "retención axial contra el FR8ZZ (2 por eje de avance, 1 "
                 "por stub de desvío: la polea retiene el otro extremo)"},
        {"pieza": "separador_tubo_18x13.5", "cant": 1, "origen": "comprar",
         "nota": "barra de 2 m: cortar a medida entre ruedas (retención axial)"},
        {"pieza": "tornillería M5/M4 avellanada", "cant": 1, "origen": "comprar",
         "nota": "bloques y tapa al alma; travesaños y bancadas a ambas "
                 "almas; bloques de desvío al travesaño"},
    ]
    return filas


def leeme_modulo(d, bom, verif) -> str:
    import textwrap
    f, om, dv = d["frame"], d["omnis"], d["desvio"]
    parrafo = lambda t: textwrap.fill(t, 76, initial_indent="  ",
                                      subsequent_indent="  ")
    L = [f"MÓDULO DE TRANSFERENCIA OMNI BIDIRECCIONAL — BF {d['parametros']['bf']/IN:.0f}\"",
         f"proyecto TRANSFER-BF21 · generado {d['generado'][:19]}Z · capa `user` (diseño)",
         "",
         "QUÉ ES",
         parrafo("Módulo insertable entre bastidores de un transportador de "
                 "rodillos BF 21 pulg, con la PLANTA COMPLETA cubierta por "
                 "omnis (v3). AVANCE: 4 ejes hexagonales de 1/2 pulg con "
                 f"{om['n_ruedas']} ruedas omni Ø58 (proyecto RUEDA-OMNI-58) "
                 "en tresbolillo hasta ambas almas, encadenados por anillos "
                 f"en planos junto a las almas. DESVÍO: {dv['n_ruedas']} "
                 "ruedas omni IGUALES, GIRADAS 90°, sobre ejes hex cortos en "
                 "los huecos entre ejes, movidas desde el eje común inferior "
                 "Ø20 por o-rings (2 risers por hueco a un spool de 2 "
                 "gargantas + cadenas stub-a-stub). Dos motores UniDrive ONE "
                 "COLGADOS BAJO EL FONDO en bancadas (\"compacta hacia "
                 "abajo\"): A para el avance, B para el eje común del "
                 "desvío. Ambos sentidos comparten la tangente: la familia "
                 "parada rueda libre sobre sus barriles."),
         "",
         "GEOMETRÍA CLAVE (mm)",
         f"  ancho total {f['ancho_total']:g} (BF 533.4 − 2×3) · largo {f['largo']:g} "
         f"· alto {f['alto']:g} + motores colgados hasta z=-150",
         f"  plano de transporte z={f['tangente']:g} — rasante con la pestaña "
         "superior (labio de desvío)",
         f"  ejes omni z={om['z_eje']:g} · paso {d['parametros']['paso']:g} · "
         f"huecos de desvío y={dv['huecos_y']}",
         f"  eje común ({dv['eje_comun']['x']:g}, z={dv['eje_comun']['z']:g}) · "
         f"envolvente mínima de anillo "
         f"{verif['anillos']['envolvente_min']:g}°",
         "",
         "VERIFICADO POR EL GENERADOR",
         f"  encaje en BF: margen {verif['encaje_bf']['margen_por_lado']:g} por lado",
         f"  tangencias avance/desvío/pestaña: error máx "
         f"{verif['tangencia']['error_max']:g}",
         f"  anillos (avance + motores + desvío): "
         f"{verif['anillos']['n_anillos']} lazos, envolvente mínima "
         f"{verif['anillos']['envolvente_min']:g}° (gate >=120)",
         f"  caja 250x250: mínimo {verif['apoyo_caja_250']['min_ruedas_avance']} "
         f"ruedas de avance / {verif['apoyo_caja_250']['min_hileras']} hileras "
         f"/ {verif['apoyo_caja_250']['min_ruedas_desvio']} ruedas de desvío "
         f"en {verif['apoyo_caja_250']['min_huecos_desvio']} huecos",
         "  holguras críticas (mm): " + ", ".join(
             f"{k} {v:g}" for k, v in verif["holguras"]["mm"].items()),
         "",
         "POR QUÉ OMNIS GIRADAS Y NO CORREAS",
         parrafo("Corrección del usuario sobre la foto de referencia: lo que "
                 "se ve como banda en el sentido cruzado son omnis giradas "
                 "90°; las correas desde abajo son su transmisión. Ventaja "
                 "mecánica: al avanzar no se arrastra ninguna superficie "
                 "parada (los barriles del desvío ruedan libres) y no hace "
                 "falta pop-up ni desnivel."),
         "",
         "SECUENCIA DE MONTAJE",
         "  1. Frame: canales + placas extremas (sin apretar); bancadas A y B",
         "     abajo con sus pestañas a ambas almas (M5).",
         "  2. Travesaños de desvío entre almas (M5).",
         "  3. Bloques de avance al alma con sus FR8ZZ; bloques de desvío (2x",
         "     FR8ZZ cada uno) a los travesaños; tapa aún NO.",
         "  4. Eje común con sus 3 spools de 2 gargantas y el spool del motor B",
         "     (prisioneros), a las chumaceras UCFL204 de ambas placas extremas.",
         "  5. Ejes cortos del desvío: rueda + polea 2G (prisionero) + collarín,",
         "     en sus bloques. Ejes de avance con ruedas y collares, a los suyos.",
         "  6. Placas de motor con su UniDrive colgadas bajo las bancadas (M6);",
         "     poleas 2G en los ejes D.",
         "  7. O-rings estirados 10-12% en sus gargantas (links de avance,",
         "     risers, cadenas y anillos de motor por las ranuras de bancada).",
         "  8. Tapa arriba (M4 a los bloques). Girar a mano ambos trenes antes",
         "     de conectar.",
         "",
         "LISTA DE MATERIALES"]
    for fila in bom:
        L.append(f"  {fila['cant']:>2} x {fila['pieza']:<24} [{fila['origen']}] "
                 f"{fila['nota']}")
    L += ["", "LO QUE ESTE DISEÑO NO RESUELVE AÚN",
          parrafo("Selección eléctrica de los UniDrive (par/velocidad según "
                  "carga real); par transmisible de los o-rings 3/16 con la "
                  "carga real (ambos trenes van en serie: avance 4 anillos, "
                  "desvío riser+cadena — validar deslizamiento o duplicar "
                  "anillos); fijación del módulo al bastidor anfitrión "
                  "(pestañas con agujeros a definir sobre el transportador "
                  "real); y el espacio bajo el módulo que ocupan los motores "
                  "colgados (hasta z=-160) debe estar libre en el bastidor "
                  "anfitrión."),
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
        fig.text(0.08, 0.955, "Módulo transfer omni bidireccional — BF 21\"",
                 size=15, weight="bold")
        fig.text(0.08, 0.935, f"{d['frame']['ancho_total']:g} x "
                 f"{d['frame']['largo']:g} x {d['frame']['alto']:g} mm · "
                 f"{d['omnis']['n_ruedas']} omnis Ø58 de avance · "
                 f"{d['desvio']['n_ruedas']} giradas 90° en desvío · "
                 f"2 UniDrive · {d['generado'][:10]}", size=9)
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
            if f.suffix != ".zip" and f.name != "LEEME.txt":
                z.write(f, f.name)
    return destino


def opciones(args):
    p = dict(PARAMS_DEF)
    mapa = {"--bf": "bf", "--holgura-bf": "holgura_bf", "--alto": "alto",
            "--espesor": "espesor", "--pestana-sup": "pestana_sup",
            "--pestana-inf": "pestana_inf", "--resalte": "resalte",
            "--hex": "hex", "--ejes": "ejes", "--paso": "paso"}
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
          f"en {p['ejes']} ejes hex Ø{p['hex']:g} + {d['desvio']['n_ruedas']} "
          "giradas 90° en el desvío")
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
    audit(proj, "MODULO", "módulo transfer omni bidireccional (diseño capa user)",
          verif["verdicto_global"],
          metrics={"verificacion": {k: vv.get("verdicto") for k, vv in verif.items()
                                    if isinstance(vv, dict) and "verdicto" in vv},
                   "hash_json": sha256_file(pj)})


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
