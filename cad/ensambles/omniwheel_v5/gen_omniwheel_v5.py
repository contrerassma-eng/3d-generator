#!/usr/bin/env python3
# gen_omniwheel_v5.py — RUEDA OMNIDIRECCIONAL v5, cuerpo VACIADO con NERVIOS.
#
# Rueda omni de doble hilera pensada como reemplazo de envolvente del
# `rodillo_traccion_50x40` del catálogo (rueda de desvío del sorter):
#   Ø50 sobre rodillos · barreno Ø12.2 (deslizante sobre eje Ø12 h9) ·
#   cubos separadores integrados Ø18 x 22 por lado (como el original).
#
# Capa `user` (decisión de diseño, dims nominales → verificar con calibre).
# No hay dato `measured` ni `web` en esta pieza; TODA cota sale de la tabla
# P de abajo, cada una con su procedencia (dis = decisión de diseño,
# cat = catálogo/ecosistema del repo).
#
# OBJETIVO DE LA v5 (pedido del usuario): vaciar el cuerpo e integrar
# nervios para conservar función y estructura bajando el tiempo de
# impresión 3D. La rigidez la dan nervios diseñados (orientados con la
# carga), no el relleno del slicer: el cuerpo se lamina con 0–5 % de
# relleno y 2 perímetros.
#
# Arquitectura (2 piezas iguales + rodillos + pasadores):
#   - hilera: cubo separador + núcleo de cubo + alma exterior de 2 mm +
#     12 nervios radiales + banda portarodillos con techo de cierre.
#     Se imprime con la CARA DE UNIÓN en la cama: cero soportes, cero
#     puentes largos.
#   - 6 rodillos tonel por hilera (perfil de corona R25 → la envolvente
#     de rodadura es un círculo Ø50 continuo entre las dos hileras,
#     desfasadas media división = 30°).
#   - pasador Ø3 por rodillo: cae por la ranura vertical y queda CAUTIVO
#     al enfrentar la otra hilera (su techo cierra las ranuras).
#
# Compuertas (el script FALLA si alguna no pasa; no se "ajustan"):
#   GV1 estanqueidad     — toda malla emitida es watertight
#   GV2 cobertura        — la envolvente de rodadura cubre 360° con solape
#   GV3 colisión         — ningún rodillo (inflado +0.35) toca el cuerpo
#   GV4 apoyo de pasador — cada extremo del pasador apoya >= 3.5 mm
#   GV5 envolvente       — el cuerpo nunca sobresale del círculo de rodadura
#   GV6 espesores        — paredes >= mínimos imprimibles FDM 0.4
#
# Emite en out/ (derivados, fuera de git; se regeneran con este script):
#   hilera_v5.stl        cuerpo vaciado con nervios (imprimir x2, PETG)
#   rodillo_v5.stl       rodillo tonel (imprimir x12, TPU 95A)
#   cuerpo_macizo_ref.stl referencia v4-equivalente maciza (solo comparar)
#   omniwheel_v5.glb     ensamble coloreado para el visor
# y junto al generador (versionado): verificacion.json con métricas,
# compuertas y ahorro de material.
#
# Uso:  python cad/ensambles/omniwheel_v5/gen_omniwheel_v5.py

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix, translation_matrix

AQUI = Path(__file__).parent
OUT = AQUI / "out"

# ---------------------------------------------------------------------------
# P — tabla única de cotas (mm). Procedencia: cat = ecosistema del repo
# (rodillo_traccion_50x40 / eje Ø12 h9), dis = decisión de diseño v5.
# ---------------------------------------------------------------------------
P = {
    "D_rodadura": 50.0,   # cat: Ø50 sobre rodillos, como el rodillo del sorter
    "bore": 12.2,         # cat: deslizante sobre eje Ø12 h9
    "cubo_d": 18.0,       # cat: cubo separador Ø18 del original
    "cubo_l": 22.0,       # cat: 22 por lado, como el original; 0 = sin cubos
                          #      (uso genérico robot: -25 % más de material)
    "W_hilera": 19.0,     # dis: 2 hileras -> 38 de cuerpo (original: cara 40)
    "N": 6,               # dis: rodillos por hilera
    "d_rodillo": 12.0,    # dis: Ø máx del tonel
    "L_rodillo": 13.0,    # dis: largo del tonel
    "eje_rodillo": 3.0,   # dis: pasador Ø3 (varilla/clavo calibrado)
    "hub_d": 19.0,        # dis: núcleo del cubo Ø19 (pared 3.4 sobre el barreno)
    "alma_e": 1.6,        # dis: alma exterior
    "alma_re": 18.0,      # dis: el alma llega a r18; de ahí al borde ata la llanta
    "techo_e": 1.6,       # dis: techo de cierre de la banda portarodillos
    "nervio_e": 2.0,      # dis: nervio principal (6 uds, uno por mordaza)
    "nervio2_e": 1.6,     # dis: nervio corto (6 uds, intercalado)
    "banda_ri": 16.0,     # dis: radio interior de la banda portarodillos
    "holgura_rod": 0.8,   # dis: holgura tonel-cuerpo (giro libre + tolerancia FDM)
    "holgura_eje": 0.2,   # dis: ranura 3.2 para pasador Ø3
    "holgura_bore": 0.0,  # dis: el 12.2 ya incluye la holgura sobre eje Ø12
    "pin_L": 22.0,        # dis: largo del pasador
    "z_rodillo": 9.5,     # dis: eje de rodillos al centro de la hilera
}

SEC = 128          # resolución angular de cilindros/anillos
SEC_REV = 96       # resolución del revolucionado del tonel

R = P["D_rodadura"] / 2.0                    # 25 — radio de rodadura
R_P = R - P["d_rodillo"] / 2.0               # 19 — radio primitivo (ejes de rodillos)
W = P["W_hilera"]                            # 19
Z_ROD = P["z_rodillo"]                       # 9.5
BANDA_RE = R - 2.0                           # 23 — radio ext. del cuerpo (2 bajo rodadura)
PASO = 360.0 / P["N"]                        # 60°
DESFASE = PASO / 2.0                         # 30° entre hileras


def cil(radio, z0, z1, sections=SEC):
    m = trimesh.creation.cylinder(radius=radio, height=z1 - z0, sections=sections)
    m.apply_translation([0, 0, (z0 + z1) / 2.0])
    return m


def anillo(r0, r1, z0, z1):
    m = trimesh.creation.annulus(r_min=r0, r_max=r1, height=z1 - z0, sections=SEC)
    m.apply_translation([0, 0, (z0 + z1) / 2.0])
    return m


def caja(ext, centro, ang_deg=0.0):
    m = trimesh.creation.box(extents=ext)
    m.apply_translation(centro)
    if ang_deg:
        m.apply_transform(rotation_matrix(math.radians(ang_deg), [0, 0, 1]))
    return m


def perfil_tonel(medio_largo, inflar=0.0, bore=None):
    """Polígono cerrado (radio, z) del tonel: corona esférica R que mantiene
    la envolvente de rodadura circular. rho(t) = sqrt(R^2 - t^2) - R_P."""
    ts = np.linspace(-medio_largo, medio_largo, 41)
    rhos = np.sqrt(R * R - ts * ts) - R_P + inflar
    r_int = bore / 2.0 if bore else 0.05
    pts = [(r_int, -medio_largo)]
    pts += [(float(r), float(t)) for r, t in zip(rhos, ts)]
    pts += [(r_int, medio_largo), (r_int, -medio_largo)]
    return np.array(pts)


def revolucion(perfil):
    return trimesh.creation.revolve(perfil, sections=SEC_REV)


def a_tangente(mesh, ang_deg, radio, z):
    """Lleva una malla construida sobre el eje Z al eje tangente del rodillo
    en (ang, radio, z): Z local -> dirección tangencial."""
    a = math.radians(ang_deg)
    tang = np.array([-math.sin(a), math.cos(a), 0.0])
    T = trimesh.geometry.align_vectors([0, 0, 1], tang)
    m = mesh.copy()
    m.apply_transform(T)
    m.apply_translation([radio * math.cos(a), radio * math.sin(a), z])
    return m


def rodillo_v5():
    """Tonel con cavidad interna: barreno Ø3.4 pasante y cámara Ø7 central
    con conos a 45° (autosoportados al imprimir el rodillo en vertical).
    Pared central 2.5 y extremos macizos: rueda bajo carga sin aplastarse."""
    L2 = P["L_rodillo"] / 2.0
    rb = (P["eje_rodillo"] + 0.4) / 2.0          # 1.7
    rc, tc = 3.5, 2.7                            # cámara Ø7, medio largo 2.7
    t1 = tc + (rc - rb)                          # cono 45°
    ts = np.linspace(-L2, L2, 41)
    rhos = np.sqrt(R * R - ts * ts) - R_P
    pts = [(rb, -L2)]
    pts += [(float(r), float(t)) for r, t in zip(rhos, ts)]
    pts += [(rb, L2), (rb, t1), (rc, tc), (rc, -tc), (rb, -t1), (rb, -L2)]
    return revolucion(np.array(pts))


def corte_rodillo(ang_deg):
    """Volumen que el tonel exige al cuerpo: revolucionado inflado con la
    holgura + barrido radial hacia afuera (ventana de inserción) + prisma
    superior (canal de montaje y plano del techo)."""
    base = revolucion(perfil_tonel(P["L_rodillo"] / 2.0 + P["holgura_rod"],
                                   inflar=P["holgura_rod"]))
    base = a_tangente(base, ang_deg, R_P, Z_ROD)
    a = math.radians(ang_deg)
    rad = np.array([math.cos(a), math.sin(a), 0.0])
    fuera = base.copy()
    fuera.apply_translation(rad * 12.0)
    barrido = trimesh.util.concatenate([base, fuera]).convex_hull
    # prisma sobre el eje del rodillo hasta bajo el techo de cierre, en el
    # marco del rodillo: x = tangente, y = radial, z = eje de la rueda
    lt = P["L_rodillo"] / 2.0 + P["holgura_rod"]
    prisma = trimesh.creation.box(extents=[2 * lt, 26.0 - 13.2, W - P["techo_e"] - Z_ROD])
    T = np.eye(4)
    tang = np.array([-math.sin(a), math.cos(a), 0.0])
    T[:3, 0], T[:3, 1], T[:3, 2] = tang, rad, [0, 0, 1]
    T[:3, 3] = rad * (13.2 + 26.0) / 2.0 + [0, 0, (Z_ROD + (W - P["techo_e"])) / 2.0]
    prisma.apply_transform(T)
    return trimesh.boolean.union([barrido, prisma])


def corte_ranura(ang_deg):
    """Ranura del pasador: canal vertical de ancho 3.2 que atraviesa el techo
    y las mordazas, con asiento semicircular en el eje del rodillo."""
    d = P["eje_rodillo"] + P["holgura_eje"]
    L = P["pin_L"] + 1.0
    cilindro = trimesh.creation.cylinder(radius=d / 2.0, height=L, sections=48)
    cilindro = a_tangente(cilindro, ang_deg, R_P, Z_ROD)
    a = math.radians(ang_deg)
    tang = np.array([-math.sin(a), math.cos(a), 0.0])
    rad = np.array([math.cos(a), math.sin(a), 0.0])
    canal = trimesh.creation.box(extents=[L, d, W + 2 - Z_ROD])
    T = np.eye(4)
    T[:3, 0], T[:3, 1], T[:3, 2] = tang, rad, [0, 0, 1]
    T[:3, 3] = rad * R_P + [0, 0, (Z_ROD + W + 2) / 2.0]
    canal.apply_transform(T)
    return trimesh.boolean.union([cilindro, canal])


def cortes_comunes():
    """Cortes que comparten la hilera v5 y la referencia maciza."""
    cortes = [cil(P["bore"] / 2.0, -P["cubo_l"] - 1, W + 1)]
    for k in range(P["N"]):
        ang = k * PASO
        cortes.append(corte_rodillo(ang))
        cortes.append(corte_ranura(ang))
    # marca de montaje: muesca en la cara exterior del alma, en el ángulo 0
    marca = caja([3.0, 1.4, 1.4], [14.5, 0, 0.0])
    cortes.append(marca)
    return cortes


def aligeramientos():
    """Cortes SOLO de la v5 (la referencia maciza no los lleva):
    - bolsillo interno en cada mordaza, bajo la zona de apoyo del pasador
      (el apoyo trabaja en z 7.3-9.5; el bolsillo termina en 6.8);
    - piso de cada bahía abierto (puro forro sin función; de paso la cara
      exterior deja de necesitar puentes sobre las bahías al imprimir)."""
    cortes = [caja([4.0, 4.4, 4.8], [19.5, 0, 4.4], DESFASE + k * PASO)
              for k in range(P["N"])]
    lt = P["L_rodillo"] / 2.0 + P["holgura_rod"]
    for k in range(P["N"]):
        a = math.radians(k * PASO)
        tang = np.array([-math.sin(a), math.cos(a), 0.0])
        rad = np.array([math.cos(a), math.sin(a), 0.0])
        piso = trimesh.creation.box(extents=[2 * lt, 26.0 - 16.05,
                                             W - P["techo_e"] + 1.0])
        T = np.eye(4)
        T[:3, 0], T[:3, 1], T[:3, 2] = tang, rad, [0, 0, 1]
        T[:3, 3] = rad * (16.05 + 26.0) / 2.0 + \
            [0, 0, (W - P["techo_e"] - 1.0) / 2.0]
        piso.apply_transform(T)
        cortes.append(piso)
    return cortes


def hilera_v5():
    hub_r = P["hub_d"] / 2.0
    partes = [
        anillo(P["bore"] / 2.0 - 0.6, hub_r, 0, W),                          # núcleo del cubo
        anillo(P["bore"] / 2.0 - 0.6, P["alma_re"], 0, P["alma_e"]),         # alma exterior
        anillo(P["banda_ri"], BANDA_RE, 0, W),                               # banda portarodillos
    ]
    # nervios: 6 principales (bajo cada mordaza) + 6 cortos intercalados,
    # limitados al radio libre que dejan los toneles al hundirse
    for k in range(P["N"]):
        ang = DESFASE + k * PASO
        r0, r1 = hub_r - 0.2, P["banda_ri"] + 0.8
        partes.append(caja([r1 - r0, P["nervio_e"], W],
                           [(r0 + r1) / 2.0, 0, W / 2.0], ang))
    r_libre = min_radio_tonel(15.0) - P["holgura_rod"]
    for k in range(P["N"]):
        ang = k * PASO + 15.0  # a 15° del centro del tonel: radio capado
        r0, r1 = hub_r - 0.2, r_libre
        partes.append(caja([r1 - r0, P["nervio2_e"], W],
                           [(r0 + r1) / 2.0, 0, W / 2.0], ang))
    if P["cubo_l"] > 0:
        partes.append(anillo(P["bore"] / 2.0 - 0.6, P["cubo_d"] / 2.0,
                             -P["cubo_l"], 0))                               # cubo separador
    cuerpo = trimesh.boolean.union(partes)
    return trimesh.boolean.difference([cuerpo] + cortes_comunes() + aligeramientos())


def cuerpo_macizo_ref():
    """Referencia v4-equivalente: misma función, sin vaciado ni nervios."""
    partes = [anillo(P["bore"] / 2.0 - 0.6, BANDA_RE, 0, W)]
    if P["cubo_l"] > 0:
        partes.append(anillo(P["bore"] / 2.0 - 0.6, P["cubo_d"] / 2.0,
                             -P["cubo_l"], 0))
    cuerpo = trimesh.boolean.union(partes)
    return trimesh.boolean.difference([cuerpo] + cortes_comunes())


def min_radio_tonel(ang_offset_deg):
    """Radio mínimo (desde el eje de la rueda) de la superficie del tonel a
    `ang_offset_deg` del centro del rodillo — cuánto se hunde hacia el cubo."""
    t = R_P * math.tan(math.radians(ang_offset_deg))
    if abs(t) > P["L_rodillo"] / 2.0:
        return P["banda_ri"]
    rho = math.sqrt(R * R - t * t) - R_P
    return math.sqrt(R_P * R_P + t * t) - rho


# ---------------------------------------------------------------------------
# Compuertas
# ---------------------------------------------------------------------------
def compuertas(hilera, rodillo, macizo):
    res = {}
    fallas = []

    # GV1 estanqueidad
    wt = {"hilera": bool(hilera.is_watertight),
          "rodillo": bool(rodillo.is_watertight),
          "macizo_ref": bool(macizo.is_watertight)}
    res["GV1_estanqueidad"] = wt
    if not all(wt.values()):
        fallas.append(f"GV1: malla no estanca: {wt}")

    # GV2 cobertura de rodadura 360° con solape
    semiabanico = math.degrees(math.atan((P["L_rodillo"] / 2.0) / R_P))
    solape = 2 * semiabanico - DESFASE
    res["GV2_cobertura"] = {"abanico_por_rodillo_deg": round(2 * semiabanico, 2),
                            "solape_en_junta_deg": round(solape, 2)}
    if solape < 3.0:
        fallas.append(f"GV2: solape {solape:.2f} grados < 3")

    # GV3 colisión rodillo-cuerpo con holgura garantizada de 0.35
    inflado = revolucion(perfil_tonel(P["L_rodillo"] / 2.0 + 0.35, inflar=0.35))
    peor = 0.0
    for k in range(P["N"]):
        r = a_tangente(inflado, k * PASO, R_P, Z_ROD)
        inter = trimesh.boolean.intersection([hilera, r])
        if len(inter.faces):
            peor = max(peor, abs(float(inter.volume)))
    res["GV3_colision"] = {"volumen_interseccion_inflado_0p35": round(peor, 4)}
    if peor > 1e-3:
        fallas.append(f"GV3: el rodillo inflado toca el cuerpo (V={peor:.3f} mm3)")

    # GV4 apoyo del pasador: longitud embebida en la mordaza por lado
    s0 = P["L_rodillo"] / 2.0 + P["holgura_rod"] + 0.1
    s1 = P["pin_L"] / 2.0
    ss = np.linspace(s0, s1, 60)
    apoyo_min = 1e9
    for k in range(P["N"]):
        a = math.radians(k * PASO)
        tang = np.array([-math.sin(a), math.cos(a), 0.0])
        cen = np.array([R_P * math.cos(a), R_P * math.sin(a), Z_ROD])
        for lado in (+1, -1):
            # asiento real del pasador: 2.2 bajo el eje (el taladro llega a -1.6)
            pts = cen + np.outer(lado * ss, tang) + [0, 0, -2.2]
            dentro = hilera.contains(pts)
            apoyo = float(np.sum(dentro)) * (s1 - s0) / len(ss)
            apoyo_min = min(apoyo_min, apoyo)
    res["GV4_apoyo_pasador"] = {"apoyo_min_por_lado_mm": round(apoyo_min, 2)}
    if apoyo_min < 3.5:
        fallas.append(f"GV4: apoyo del pasador {apoyo_min:.2f} < 3.5 mm")

    # GV5 envolvente: el cuerpo no sobresale del círculo de rodadura
    r_cuerpo = float(np.max(np.linalg.norm(hilera.vertices[:, :2], axis=1)))
    res["GV5_envolvente"] = {"r_max_cuerpo": round(r_cuerpo, 3), "r_rodadura": R}
    if r_cuerpo > BANDA_RE + 0.05:
        fallas.append(f"GV5: cuerpo hasta r={r_cuerpo:.2f} > {BANDA_RE}")

    # GV6 espesores mínimos FDM 0.4 (paramétrico)
    esp = {
        "nervio_principal": P["nervio_e"],
        "nervio_corto": P["nervio2_e"],
        "alma": P["alma_e"],
        "techo_cierre": P["techo_e"],
        "pared_cubo_nucleo": (P["hub_d"] - P["bore"]) / 2.0,
        "pared_cubo_separador": (P["cubo_d"] - P["bore"]) / 2.0,
        "pared_tonel_extremo": round((math.sqrt(R * R - (P["L_rodillo"] / 2.0) ** 2)
                                      - R_P) - (P["eje_rodillo"] + 0.4) / 2.0, 2),
        "pared_tonel_media": round((R - R_P) - 3.5, 2),
    }
    res["GV6_espesores"] = esp
    minimos = {"nervio_principal": 2.0, "nervio_corto": 1.6, "alma": 1.6,
               "techo_cierre": 1.4, "pared_cubo_nucleo": 3.0,
               "pared_cubo_separador": 2.4, "pared_tonel_extremo": 2.0,
               "pared_tonel_media": 2.2}
    for k, vmin in minimos.items():
        if esp[k] < vmin:
            fallas.append(f"GV6: {k} = {esp[k]} < {vmin}")

    return res, fallas


# ---------------------------------------------------------------------------
# Ensamble y salida
# ---------------------------------------------------------------------------
def ensamble_glb(hilera, rodillo, ruta):
    esc = trimesh.Scene()
    gris, azul, naranja, acero = (96, 105, 112, 255), (38, 92, 130, 255), \
        (230, 126, 34, 255), (176, 190, 197, 255)

    def poner(m, color, nombre, T=None):
        c = m.copy()
        if T is not None:
            c.apply_transform(T)
        c.visual.face_colors = color
        esc.add_geometry(c, node_name=nombre)

    T_B = translation_matrix([0, 0, 2 * W]) @ \
        rotation_matrix(math.radians(DESFASE), [0, 0, 1]) @ \
        rotation_matrix(math.pi, [1, 0, 0], [0, 0, 0])

    poner(hilera, azul, "hilera_A")
    poner(hilera, naranja, "hilera_B", T_B)
    pin = trimesh.creation.cylinder(radius=P["eje_rodillo"] / 2.0,
                                    height=P["pin_L"], sections=32)
    for k in range(P["N"]):
        ang = k * PASO
        poner(a_tangente(rodillo, ang, R_P, Z_ROD), gris, f"rodillo_A{k}")
        poner(a_tangente(pin, ang, R_P, Z_ROD), acero, f"pin_A{k}")
        rB = a_tangente(rodillo, ang, R_P, Z_ROD)
        pB = a_tangente(pin, ang, R_P, Z_ROD)
        poner(rB, gris, f"rodillo_B{k}", T_B)
        poner(pB, acero, f"pin_B{k}", T_B)
    esc.export(ruta)


def main():
    OUT.mkdir(exist_ok=True)
    print("Generando hilera v5 (vaciada + nervios)…")
    hilera = hilera_v5()
    print("Generando rodillo tonel…")
    rodillo = rodillo_v5()
    print("Generando referencia maciza v4-equivalente…")
    macizo = cuerpo_macizo_ref()

    print("Ejecutando compuertas…")
    res, fallas = compuertas(hilera, rodillo, macizo)

    v_v5 = float(hilera.volume)
    v_mac = float(macizo.volume)
    v_rod = float(rodillo.volume)
    ahorro = 100.0 * (1.0 - v_v5 / v_mac)

    # Estimación de material LAMINADO (0.4 boquilla): piel de 1.2 mm sobre la
    # superficie + relleno del volumen interior. El v5 se lamina al 5 % (los
    # nervios son la estructura); el macizo necesita ~35 % para ir cargado.
    def laminado(mesh, relleno):
        piel = min(float(mesh.volume), float(mesh.area) * 1.2)
        return piel + relleno * max(0.0, float(mesh.volume) - piel)

    lam_v5 = 2 * laminado(hilera, 0.05)
    lam_mac = 2 * laminado(macizo, 0.35)
    ahorro_lam = 100.0 * (1.0 - lam_v5 / lam_mac)
    reporte = {
        "pieza": "omniwheel v5 — doble hilera, cuerpo vaciado con nervios",
        "capa": "user",
        "parametros": P,
        "derivados": {
            "radio_rodadura": R, "radio_primitivo": R_P,
            "paso_deg": PASO, "desfase_hileras_deg": DESFASE,
            "ancho_cuerpo_total": 2 * W,
            "largo_total_con_cubos": 2 * W + 2 * P["cubo_l"],
        },
        "volumenes_mm3": {
            "hilera_v5": round(v_v5, 1),
            "cuerpo_macizo_ref": round(v_mac, 1),
            "rodillo": round(v_rod, 1),
        },
        "material_cuerpo": {
            "v5_2_hileras_cm3": round(2 * v_v5 / 1000.0, 2),
            "macizo_2_hileras_cm3": round(2 * v_mac / 1000.0, 2),
            "ahorro_pct": round(ahorro, 1),
            "petg_v5_g": round(2 * v_v5 / 1000.0 * 1.27, 1),
            "petg_macizo_g": round(2 * v_mac / 1000.0 * 1.27, 1),
            "tpu_rodillos_g": round(12 * v_rod / 1000.0 * 1.21, 1),
        },
        "laminado_estimado": {
            "nota": "piel 1.2 mm + relleno interior; v5 al 5 %, macizo al 35 %",
            "v5_cm3": round(lam_v5 / 1000.0, 2),
            "macizo_cm3": round(lam_mac / 1000.0, 2),
            "ahorro_tiempo_estimado_pct": round(ahorro_lam, 1),
        },
        "compuertas": res,
        "fallas": fallas,
    }
    # el reporte se versiona junto al generador (out/ queda fuera de git)
    (AQUI / "verificacion.json").write_text(
        json.dumps(reporte, indent=1, ensure_ascii=False), encoding="utf-8")

    if fallas:
        print("COMPUERTA FALLIDA — no se emiten STL/GLB:")
        for f in fallas:
            print("  -", f)
        sys.exit(1)

    hilera.export(OUT / "hilera_v5.stl")
    rodillo.export(OUT / "rodillo_v5.stl")
    macizo.export(OUT / "cuerpo_macizo_ref.stl")
    ensamble_glb(hilera, rodillo, OUT / "omniwheel_v5.glb")

    print(f"OK — todas las compuertas pasan.")
    print(f"  cuerpo v5 (x2 hileras): {2 * v_v5 / 1000.0:.1f} cm3  "
          f"vs macizo {2 * v_mac / 1000.0:.1f} cm3  ->  ahorro {ahorro:.1f} %")
    print(f"  salidas en {OUT}")


if __name__ == "__main__":
    main()
