"""Soporte modular imprimible: motor TT doble eje + rueda mecanum 48 (FIT0662).

Genera las DOS piezas imprimibles del bloque modular (base y tapa) como mallas
estancas (booleanos manifold), listas para laminar, mas un GLB del ensamble con
el motor y la rueda de referencia posicionados. Capa `user`: las dimensiones
del motor y la rueda se midieron de los STEP aportados por el usuario
(TT Motor Dual Shaft.step, Mecanum Left v5.step) — verificar con calibre antes
de imprimir en serie.

Concepto (ver docs/SOPORTE_TT_MECANUM.md):
  - Base cuadrada 74 x 74 con abrazadera del motor por ambos costados
    (paredes con ranura de insercion vertical + 2 pernos M3x30 pasantes),
    horquilla que captura la lengueta frontal, cuna para la lata del motor,
    ranura pasante por donde la rueda asoma hacia abajo y 4 anclajes
    para apernar el bloque al chasis (desde abajo, roscan en los postes).
  - Separadores integrados (postes + torre) con piloto para hilo M3 arriba
    (tapa) y abajo (chasis).
  - Tapa 74 x 74 con recorte por donde asoma la rueda hacia arriba,
    4 tornillos M3 avellanados y muesca pasacables.

Convencion de coordenadas del modulo: origen en el centro de la placa base,
Z=0 el plano inferior de la placa, +Z arriba. La rueda queda al lado +X,
el frente del motor (lengueta) hacia -Y y la lata del motor hacia +Y.
Con la rueda en el suelo, la placa flota LUZ_SUELO sobre el piso.

uso:
  python pipeline/soporte_tt_mecanum.py [--salida <dir>] [--proyecto <X>] [--png]

Sin --salida escribe en cad/componentes/models/ (los GLB/STL del catalogo).
Con --proyecto <X> escribe en projects/<X>/out/componentes/ y audita.
--png ademas renderiza previews y lamina de cotas en docs/img/.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import audit, project_dir, sha256_file  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
MODELS = REPO / "cad" / "componentes" / "models"
SEGS = 64

# --------------------------------------------------------------------------
# Parametros (mm). MOTOR y RUEDA: medidos de los STEP del usuario (capa user).
# --------------------------------------------------------------------------

MOTOR = dict(
    ancho_caja=18.8,      # entre las dos caras planas por donde sale el eje
    alto_cuerpo=22.5,     # dimension vertical al montar (eje horizontal)
    eje_d=5.4,            # eje doble plano (doble-D)
    eje_saliente=9.0,     # saliente del eje por cada lado
    boss_d=7.2, boss_h=1.1,   # anillo alrededor del eje en ambas caras
    m3_tras=20.6,         # taladros M3 pasantes: distancia detras del eje
    m3_sep=17.5,          # separacion vertical entre ambos taladros (+-8.75)
    tab_delante=13.8,     # centro del agujero O2.8 de la lengueta frontal
    tab_punta=15.2, tab_esp=3.0, tab_alto=5.8,
    caja_frente=12.0,     # cara frontal de la caja reductora delante del eje
    lata_d=22.5,          # lata del motor (sobresale de las caras planas)
    lata_desde=25.65, lata_hasta=49.0,   # extension de la lata detras del eje
    lata_off=0.65,        # eje de la lata desplazado hacia la pared lejana
    tapa_motor_d=15.8, tapa_motor_l=5.0, nub_d=1.8, nub_l=0.9,
)

RUEDA = dict(
    dia=48.0, ancho_total=32.5,
    cubo_d=29.1,          # cubo lateral de montaje (cara al ras del extremo)
    rodillos_retiro=6.4,  # los rodillos empiezan 6.4 adentro de la cara del cubo
)

P = dict(
    lado=74.0, t_base=4.0, t_pared=4.0, t_tapa=3.0,
    holgura_caja=0.2,        # por lado, entre caja del motor y cada pared
    alzada_asiento=1.0,      # cama bajo el motor (despeja cabeza de perno bajo)
    alto_pared=25.0,         # sobre la cara superior de la placa
    alto_separador=28.0,     # postes/torre: cara inferior de la tapa
    ranura_eje_ancho=8.0,    # ranura vertical de insercion (boss O7.2 + holgura)
    perno_motor_d=3.4,       # pasante M3
    tuerca_af=5.8,           # alojamiento hex tuerca M3 (entrecaras 5.5 + holg.)
    tuerca_prof=2.0,
    rebaje_cubo_d=33.0, rebaje_cubo_prof=2.0,   # despeje del cubo en pared A
    horquilla_esp=4.6, horquilla_alto=18.5,     # captura de la lengueta
    horquilla_ranura=3.6, horquilla_taladro=2.8,
    holgura_lata=0.25,       # radial, cuna de la lata
    piloto_d=2.8,            # hilo M3 autoformado en postes/torre
    piloto_prof=10.0,
    aux_d=3.4,               # perforaciones auxiliares de apernado/estructura
    ranura_rueda_holg=0.75,  # por lado, rueda vs ranura
    ranura_r=6.0,            # radio de esquinas de las ranuras
    poste_d=10.0,
    avellanado_d=6.4,        # tornillo M3 cabeza plana en la tapa
    muesca_cables_r=4.0,
)

# ---- posiciones derivadas (modulo) ---------------------------------------

H = P["lado"] / 2.0                                   # 37.0
Z_EJE = P["t_base"] + P["alzada_asiento"] + MOTOR["alto_cuerpo"] / 2.0  # 16.25
LUZ_SUELO = RUEDA["dia"] / 2.0 - Z_EJE                # 7.75
X_CARA_A = -11.5          # cara de la caja lado rueda
X_CARA_B = X_CARA_A - MOTOR["ancho_caja"]             # -30.3
XA0 = X_CARA_A + P["holgura_caja"]                    # pared A interna -11.3
XA1 = XA0 + P["t_pared"]                              # pared A externa -7.3
XB1 = X_CARA_B - P["holgura_caja"]                    # pared B interna -30.5
XB0 = XB1 - P["t_pared"]                              # pared B externa -34.5
Y_PARED0, Y_PARED1 = -MOTOR["caja_frente"], 24.5      # extension de las paredes
Z_PARED1 = P["t_base"] + P["alto_pared"]              # 29.0
Z_SEP = P["t_base"] + P["alto_separador"]             # 32.0 (asiento de la tapa)

# rueda montada: cara del cubo contra el fondo del rebaje de pared A (+0.1)
X_CUBO = XA1 - P["rebaje_cubo_prof"] - 0.1            # -9.4
X_RUEDA1 = X_CUBO + RUEDA["ancho_total"]              # 23.1 extremo exterior
X_ROD0 = X_CUBO + RUEDA["rodillos_retiro"]            # -3.0 inicio rodillos

# ranura de la rueda (pasante en base y tapa; solo envolvente de rodillos)
RAN_X0 = X_ROD0 - P["ranura_rueda_holg"] + 0.15       # -3.6
RAN_X1 = X_RUEDA1 + 1.5                               # 24.6
RAN_Y_BASE = 22.5     # semichord a nivel placa: 20.6 + holgura
RAN_Y_TAPA = 20.0     # semichord a nivel tapa: 18.1 + holgura
# bolsillo del cubo (el cubo O29.1 baja 2.3 bajo la cara superior de la placa)
POCK_X0, POCK_X1, POCK_Y, POCK_Z = -9.6, RAN_X0, 9.5, 1.5

# lata del motor
X_LATA = X_CARA_A - (MOTOR["ancho_caja"] / 2.0 + MOTOR["lata_off"])   # -21.55
R_CUNA = MOTOR["lata_d"] / 2.0 + P["holgura_lata"]    # 11.5

# separadores: 3 postes + torre adosada a la pared B (la lata del motor O22.5
# invade la esquina -X,+Y y los pernos M3 del motor cruzan en y=20.6, asi que
# la torre vive en 12.9..17.4, libre de ambos)
POSTES = [(-30.0, -30.0), (30.0, -30.0), (30.0, 30.0)]
TORRE = dict(x0=-36.0, x1=XB1, y0=12.9, y1=17.4, cx=-33.25, cy=15.15)
ANCLAJES = POSTES + [(TORRE["cx"], TORRE["cy"])]      # tapa y chasis
AUX = [(0.0, 31.5), (0.0, -31.5)]

X_TAB = X_CARA_A + (-10.9 - 7.9) / 2.0                # centro lengueta -20.9
Z_M3 = (Z_EJE - MOTOR["m3_sep"] / 2.0, Z_EJE + MOTOR["m3_sep"] / 2.0)  # 7.5, 25


# --------------------------------------------------------------------------
# Utileria de mallas
# --------------------------------------------------------------------------

def _ext(poly, z0, z1):
    import trimesh
    m = trimesh.creation.extrude_polygon(poly, z1 - z0)
    m.apply_translation([0, 0, z0])
    return m


def _caja(x0, x1, y0, y1, z0, z1):
    from shapely.geometry import box as sbox
    return _ext(sbox(x0, y0, x1, y1), z0, z1)


def _cil(d, p0, p1, sections=SEGS):
    import trimesh
    return trimesh.creation.cylinder(radius=d / 2.0, segment=[p0, p1],
                                     sections=sections)


def _roundrect(x0, x1, y0, y1, r):
    from shapely.geometry import box as sbox
    return sbox(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, quad_segs=SEGS // 4)


def _hex_x(af, y, z, x0, x1):
    """Prisma hexagonal (tuerca) con eje X, vertice hacia arriba (imprimible)."""
    from shapely.geometry import Polygon
    r = 2.0 * af / np.sqrt(3.0) / 2.0     # radio circunscrito desde entrecaras
    ang = np.radians(np.arange(6) * 60.0 + 30.0)
    pts2 = np.stack([np.cos(ang), np.sin(ang)], axis=1) * r
    m = _ext(Polygon(pts2), 0, x1 - x0)   # hex en XY (vertices a 30, 90, ...)
    v = m.vertices.copy()
    # permutacion ciclica (det +1): (hx, hy, largo) -> (x, y, z)=(x0+largo, hx, hy)
    m.vertices = np.stack([x0 + v[:, 2], v[:, 0], v[:, 1]], axis=1)
    m.apply_translation([0, y, z])
    return m


def _union(meshes):
    import trimesh
    return trimesh.boolean.union(meshes, engine="manifold")


def _diff(base, cutters):
    import trimesh
    return trimesh.boolean.difference([base] + cutters, engine="manifold")


def _color(m, hexcolor):
    c = hexcolor.lstrip("#")
    m.visual.face_colors = [int(c[i:i + 2], 16) for i in (0, 2, 4)] + [255]
    return m


# --------------------------------------------------------------------------
# Piezas imprimibles
# --------------------------------------------------------------------------

def _pared_2d():
    """Perfil (y,z) de una pared: rectangulo - taladros M3 pasantes (la ranura
    del eje se corta en 3D, para ambas paredes a la vez)."""
    from shapely.geometry import Point, box as sbox
    poly = sbox(Y_PARED0, P["t_base"], Y_PARED1, Z_PARED1)
    for z in Z_M3:
        poly = poly.difference(Point(MOTOR["m3_tras"], z)
                               .buffer(P["perno_motor_d"] / 2, quad_segs=SEGS // 4))
    return poly


def build_base():
    import trimesh
    from shapely.geometry import box as sbox

    t, lado = P["t_base"], P["lado"]
    solidos = [
        _ext(sbox(-H, -H, H, H), 0, t),                                 # placa
        _caja(XB1 - 0.2, XA0 + 0.2, -11.5, Y_PARED1, t, t + P["alzada_asiento"]),
    ]
    # paredes: perfil (y,z) extruido en su espesor y llevado al eje X
    for x0 in (XA0, XB0):
        pared = _ext(_pared_2d(), 0, P["t_pared"])
        v = pared.vertices.copy()
        # permutacion ciclica (det +1): (y, z, espesor) -> (x, y, z)
        pared.vertices = np.stack([x0 + v[:, 2], v[:, 0], v[:, 1]], axis=1)
        solidos.append(pared)
    # horquilla de la lengueta (puente entre ambas paredes)
    solidos.append(_caja(XB1, XA0, -MOTOR["tab_punta"] - 1.4, Y_PARED0,
                         t, t + P["horquilla_alto"]))
    # cuna de la lata (bordes dentro del arco: sin paredes residuales delgadas)
    solidos.append(_caja(-33.0, -10.3, 26.0, 31.0, t, 16.0))
    # postes y torre
    for (px, py) in POSTES:
        c = _cil(P["poste_d"], [px, py, t - 0.5], [px, py, Z_SEP])
        solidos.append(c)
    solidos.append(_caja(TORRE["x0"], TORRE["x1"], TORRE["y0"], TORRE["y1"],
                         t, Z_SEP))

    base = _union(solidos)

    cortes = []
    # ranura pasante de la rueda + bolsillo del cubo
    cortes.append(_ext(_roundrect(RAN_X0, RAN_X1, -RAN_Y_BASE, RAN_Y_BASE,
                                  P["ranura_r"]), -1, t + P["alzada_asiento"] + 0.5))
    cortes.append(_caja(POCK_X0, POCK_X1 + 0.01, -POCK_Y, POCK_Y,
                        POCK_Z, t + P["alzada_asiento"] + 0.5))
    # ranura de insercion del eje (ambas paredes) + semicirculo inferior
    w = P["ranura_eje_ancho"] / 2.0
    cortes.append(_caja(-36, -6, -w, w, Z_EJE, Z_PARED1 + 0.5))
    cortes.append(_cil(P["ranura_eje_ancho"], [-36, 0, Z_EJE], [-6, 0, Z_EJE]))
    # alojamientos hex de tuerca (pared A, cara externa) para los pernos M3
    for z in Z_M3:
        cortes.append(_hex_x(P["tuerca_af"], MOTOR["m3_tras"], z,
                             XA1 - P["tuerca_prof"], XA1 + 0.5))
    # rebaje circular del cubo en pared A (solo sobre la placa)
    reb = _cil(P["rebaje_cubo_d"], [XA1 - P["rebaje_cubo_prof"], 0, Z_EJE],
               [XA1 + 0.5, 0, Z_EJE])
    clip = _caja(XA1 - P["rebaje_cubo_prof"] - 0.5, XA1 + 1, -17, 17,
                 t + 0.4, Z_PARED1 + 1)
    cortes.append(trimesh.boolean.intersection([reb, clip], engine="manifold"))
    # horquilla: ranura de la lengueta + taladro O2.8 en X
    cortes.append(_caja(X_TAB - P["horquilla_ranura"] / 2,
                        X_TAB + P["horquilla_ranura"] / 2,
                        -MOTOR["tab_punta"] - 2, Y_PARED0 + 0.5,
                        t + 6.0, t + P["horquilla_alto"] + 0.5))
    cortes.append(_cil(P["horquilla_taladro"],
                       [XB1 - 0.5, -MOTOR["tab_delante"], Z_EJE],
                       [XA0 + 0.5, -MOTOR["tab_delante"], Z_EJE]))
    # arco de la cuna (despeje de la lata)
    cortes.append(_cil(2 * R_CUNA, [X_LATA, 25.0, Z_EJE], [X_LATA, 32.0, Z_EJE]))
    # pilotos M3: arriba (tapa) y abajo (anclaje al chasis, pasante por placa)
    for (px, py) in ANCLAJES:
        cortes.append(_cil(P["piloto_d"], [px, py, Z_SEP - P["piloto_prof"]],
                           [px, py, Z_SEP + 0.5]))
        cortes.append(_cil(P["piloto_d"], [px, py, -1],
                           [px, py, t + P["piloto_prof"]]))
    # perforaciones auxiliares
    for (px, py) in AUX:
        cortes.append(_cil(P["aux_d"], [px, py, -1], [px, py, t + 1]))

    return _diff(base, cortes)


def build_tapa():
    """Tapa en coordenadas locales (z=0 su cara inferior); en el ensamble va
    a z=Z_SEP."""
    import trimesh
    from shapely.geometry import box as sbox
    t = P["t_tapa"]
    tapa = _ext(sbox(-H, -H, H, H), 0, t)
    cortes = [_ext(_roundrect(RAN_X0, RAN_X1, -RAN_Y_TAPA, RAN_Y_TAPA,
                              P["ranura_r"]), -1, t + 1)]
    for (px, py) in ANCLAJES:
        cortes.append(_cil(P["aux_d"], [px, py, -1], [px, py, t + 1]))
        cono = trimesh.creation.cone(radius=P["avellanado_d"] / 2.0,
                                     height=P["avellanado_d"] / 2.0,
                                     sections=SEGS)
        cono.apply_transform(trimesh.transformations.rotation_matrix(
            np.radians(180), [1, 0, 0]))
        cono.apply_translation([px, py, t + 0.01])   # base del cono en la cara
        cortes.append(cono)
    for (px, py) in AUX:
        cortes.append(_cil(P["aux_d"], [px, py, -1], [px, py, t + 1]))
    cortes.append(_cil(2 * P["muesca_cables_r"], [X_LATA, H, -1],
                       [X_LATA, H, t + 1]))
    return _diff(tapa, cortes)


# --------------------------------------------------------------------------
# Referencias del ensamble (motor y rueda, solo visualizacion)
# --------------------------------------------------------------------------

def build_motor_ref():
    M, t = MOTOR, P["t_base"]
    z0 = t + P["alzada_asiento"]
    piezas = [
        _color(_caja(X_CARA_B, X_CARA_A, -M["caja_frente"], M["lata_desde"],
                     z0, z0 + M["alto_cuerpo"]), "#e8c84a"),
        _color(_caja(X_TAB - M["tab_esp"] / 2, X_TAB + M["tab_esp"] / 2,
                     -M["tab_punta"], -M["caja_frente"],
                     Z_EJE - M["tab_alto"] / 2, Z_EJE + M["tab_alto"] / 2),
               "#e8c84a"),
        _color(_cil(M["lata_d"], [X_LATA, M["lata_desde"], Z_EJE],
                    [X_LATA, M["lata_hasta"], Z_EJE]), "#c8ccd2"),
        _color(_cil(M["tapa_motor_d"], [X_LATA, M["lata_hasta"], Z_EJE],
                    [X_LATA, M["lata_hasta"] + M["tapa_motor_l"], Z_EJE]),
               "#3a3f45"),
        _color(_cil(M["eje_d"], [X_CARA_A, 0, Z_EJE],
                    [X_CARA_A + M["eje_saliente"], 0, Z_EJE]), "#f2f2f2"),
        _color(_cil(M["eje_d"], [X_CARA_B, 0, Z_EJE],
                    [X_CARA_B - M["eje_saliente"], 0, Z_EJE]), "#f2f2f2"),
        _color(_cil(M["boss_d"], [X_CARA_A, 0, Z_EJE],
                    [X_CARA_A + M["boss_h"], 0, Z_EJE]), "#e8c84a"),
        _color(_cil(M["boss_d"], [X_CARA_B, 0, Z_EJE],
                    [X_CARA_B - M["boss_h"], 0, Z_EJE]), "#e8c84a"),
    ]
    import trimesh
    return trimesh.util.concatenate(piezas)


def build_rueda_ref():
    import trimesh
    R = RUEDA
    piezas = [
        _color(_cil(R["cubo_d"], [X_CUBO, 0, Z_EJE], [X_RUEDA1, 0, Z_EJE]),
               "#8a929c"),
        _color(_cil(R["dia"], [X_ROD0, 0, Z_EJE], [X_RUEDA1, 0, Z_EJE]),
               "#4a4f55"),
    ]
    return trimesh.util.concatenate(piezas)


# --------------------------------------------------------------------------
# Verificacion geometrica (la malla ES el plano: se comprueba contra si misma)
# --------------------------------------------------------------------------

def verificar(base, tapa) -> list[str]:
    fallas = []

    def chk(nombre, cond):
        if not cond:
            fallas.append(nombre)

    chk("base estanca", base.is_watertight)
    chk("tapa estanca", tapa.is_watertight)
    bb = base.bounds
    chk("base 74x74", np.allclose(bb[1][:2] - bb[0][:2], [P["lado"]] * 2, atol=0.01))
    chk("base alto = asiento tapa", abs(bb[1][2] - Z_SEP) < 0.01)
    bt = tapa.bounds
    chk("tapa 74x74x3", np.allclose(bt[1] - bt[0],
                                    [P["lado"], P["lado"], P["t_tapa"]], atol=0.01))

    dentro = base.contains(np.array([
        [-33.0, -33.0, 2.0],      # placa maciza en esquina delantera izquierda
        [-32.5, 20.6, 12.0],      # pared B entre ambos taladros M3
        [-10.5, 10.0, 12.0],      # pared A plena (bajo el rebaje del cubo)
        [-21.0, 5.0, 4.5],        # asiento del motor
        [-32.8, 28.5, 6.0],       # cuna, costado
        [-27.0, -30.0, 30.0],     # poste delantero (fuera del piloto)
        [-33.25, 13.4, 30.0],     # torre (fuera del piloto)
        [30.0, 30.0, 18.0],       # poste trasero derecho (entre ambos pilotos)
        [31.0, 0.0, 2.0],         # banda derecha de la placa
    ]))
    chk("material presente donde corresponde", bool(np.all(dentro)))

    fuera = base.contains(np.array([
        [10.0, 0.0, 2.0],         # ranura de la rueda (vacio pasante)
        [-8.0, -5.0, 2.5],        # bolsillo del cubo
        [-21.0, 5.0, 15.0],       # hueco del motor entre paredes
        [-9.3, 0.0, 20.0],        # ranura del eje en pared A
        [-32.5, 20.6, 7.5],       # taladro M3 inferior
        [-32.5, 20.6, 25.0],      # taladro M3 superior
        [-8.0, 20.6, 7.5],        # alojamiento de tuerca
        [X_TAB, -13.8, 12.0],     # ranura de la lengueta
        [X_LATA, 28.5, 10.0],     # arco de la cuna
        [-30.0, -30.0, 30.0],     # piloto superior del poste
        [-30.0, -30.0, 1.0],      # piloto inferior (anclaje chasis)
        [0.0, 31.5, 2.0],         # perforacion auxiliar
    ]))
    chk("vacios presentes donde corresponde", bool(not np.any(fuera)))

    tdentro = tapa.contains(np.array([[-33.0, 0.0, 1.5], [34.0, -30.0, 1.5]]))
    tfuera = tapa.contains(np.array([
        [10.0, 0.0, 1.5],                    # recorte de la rueda
        [-30.0, -30.0, 1.5],                 # tornillo avellanado
        [X_LATA, H - 1.0, 1.5],              # muesca pasacables
        [0.0, 31.5, 1.5],
    ]))
    chk("tapa: material y recortes", bool(np.all(tdentro) and not np.any(tfuera)))

    # holguras clave del diseno (independientes de la malla)
    chk("rueda dentro de la ranura (X)",
        RAN_X0 < X_ROD0 - 0.5 and X_RUEDA1 + 1.0 < RAN_X1 + 0.6)
    chk("rueda asoma sobre la tapa",
        Z_EJE + RUEDA["dia"] / 2 > Z_SEP + P["t_tapa"] + 3.0)
    chk("luz al suelo positiva", LUZ_SUELO > 5.0)
    chk("lata no toca postes",
        min(abs(px - X_LATA) for px, py in POSTES if py > 0) - P["poste_d"] / 2
        > MOTOR["lata_d"] / 2 + 0.3)
    chk("cubo no toca la tapa",
        Z_EJE + RUEDA["cubo_d"] / 2 < Z_SEP - 0.5)
    return fallas


# --------------------------------------------------------------------------
# Salidas
# --------------------------------------------------------------------------

def exportar(salida: Path, png: bool = False):
    import trimesh
    salida.mkdir(parents=True, exist_ok=True)
    base, tapa = build_base(), build_tapa()
    fallas = verificar(base, tapa)
    if fallas:
        sys.exit("FALLA verificacion geometrica: " + "; ".join(fallas))

    _color(base, "#7f9dc4")
    _color(tapa, "#b6c4d4")
    rutas = {}
    for nombre, m in (("soporte_tt_mecanum_base", base),
                      ("soporte_tt_mecanum_tapa", tapa)):
        for ext in ("glb", "stl"):
            p = salida / f"{nombre}.{ext}"
            m.export(p)
            rutas[f"{nombre}.{ext}"] = p

    tapa_pos = tapa.copy()
    tapa_pos.apply_translation([0, 0, Z_SEP])
    ens = trimesh.util.concatenate(
        [base, tapa_pos, build_motor_ref(), build_rueda_ref()])
    p = salida / "soporte_tt_mecanum_ensamble.glb"
    ens.export(p)
    rutas["ensamble"] = p
    rutas["plantilla"] = _dxf_chasis(salida)

    print(f"Base:  {len(base.faces)} caras, vol {base.volume/1000:.1f} cm3, "
          f"estanca={base.is_watertight}")
    print(f"Tapa:  {len(tapa.faces)} caras, vol {tapa.volume/1000:.1f} cm3, "
          f"estanca={tapa.is_watertight}")
    print(f"Eje a {Z_EJE} mm de la placa · luz al suelo {LUZ_SUELO:.2f} mm · "
          f"la rueda asoma {Z_EJE + RUEDA['dia']/2 - Z_SEP - P['t_tapa']:.2f} mm "
          f"sobre la tapa")
    for k, v in rutas.items():
        print(f"  -> {v}")
    if png:
        _previews(base, tapa_pos, ens)
        _lamina_cotas()
    return base, tapa, rutas


def _dxf_chasis(salida: Path) -> Path:
    """Plantilla DXF a escala real para perforar el chasis: contorno del
    modulo, abertura de la rueda y los 4 anclajes M3 (roscan en los postes
    desde abajo). Capa ESPEJO: el mismo modulo girado 180 (lado opuesto)."""
    import ezdxf
    dxf = ezdxf.new("R2018", setup=True)
    dxf.header["$INSUNITS"] = 4
    msp = dxf.modelspace()
    for capa, color in (("CONTORNO", 7), ("ABERTURA", 1), ("ANCLAJES", 3),
                        ("ESPEJO", 8), ("TEXTO", 7)):
        dxf.layers.add(capa, color=color)

    def dibujar(rot, capa):
        s = -1.0 if rot else 1.0
        msp.add_lwpolyline([(s * H, s * H), (-s * H, s * H), (-s * H, -s * H),
                            (s * H, -s * H)], close=True,
                           dxfattribs={"layer": capa})
        a = 1.5  # holgura extra de la abertura respecto de la ranura de la base
        msp.add_lwpolyline([(s * (RAN_X0 - a), s * (RAN_Y_BASE + a)),
                            (s * (RAN_X1 + a), s * (RAN_Y_BASE + a)),
                            (s * (RAN_X1 + a), s * (-RAN_Y_BASE - a)),
                            (s * (RAN_X0 - a), s * (-RAN_Y_BASE - a))],
                           close=True,
                           dxfattribs={"layer": "ABERTURA" if not rot else capa})
        for (px, py) in ANCLAJES:
            msp.add_circle((s * px, s * py), 3.2 / 2,
                           dxfattribs={"layer": "ANCLAJES" if not rot else capa})
    dibujar(False, "CONTORNO")
    dibujar(True, "ESPEJO")
    msp.add_text("soporte_tt_mecanum - plantilla de chasis (mm reales). "
                 "ANCLAJES O3.2 pasantes; ABERTURA de la rueda; "
                 "ESPEJO = modulo girado 180 (rueda al lado opuesto)",
                 dxfattribs={"layer": "TEXTO", "height": 2.5}
                 ).set_placement((-H, H + 4))
    p = salida / "soporte_tt_mecanum_plantilla_chasis.dxf"
    dxf.saveas(p)
    return p


def _lamina_cotas():
    """Lamina 2D con cotas principales, dibujada desde los mismos parametros
    que generan la malla (una sola fuente de verdad)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Circle, FancyArrowPatch, Rectangle

    img_dir = REPO / "docs" / "img"
    img_dir.mkdir(parents=True, exist_ok=True)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 8.2), dpi=110)

    def cota(ax, p0, p1, texto, off=(0, 0), ha="center", va="bottom"):
        ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="<->", mutation_scale=9,
                                     color="#c23", lw=0.9))
        mx, my = (p0[0] + p1[0]) / 2 + off[0], (p0[1] + p1[1]) / 2 + off[1]
        ax.text(mx, my, texto, color="#c23", fontsize=8, ha=ha, va=va)

    def rect(ax, x0, y0, w, h, **kw):
        ax.add_patch(Rectangle((x0, y0), w, h, fill=False, **kw))

    # ---- planta de la base ----
    ax = ax1
    rect(ax, -H, -H, P["lado"], P["lado"], lw=1.4, ec="k")
    rect(ax, RAN_X0, -RAN_Y_BASE, RAN_X1 - RAN_X0, 2 * RAN_Y_BASE,
         lw=1.1, ec="#06c")                                  # ranura rueda
    rect(ax, POCK_X0, -POCK_Y, POCK_X1 - POCK_X0, 2 * POCK_Y,
         lw=0.8, ec="#06c", ls="--")                         # bolsillo cubo
    for x0, x1 in ((XA0, XA1), (XB0, XB1)):
        rect(ax, x0, Y_PARED0, x1 - x0, Y_PARED1 - Y_PARED0, lw=1.0, ec="k")
    rect(ax, XB1, -MOTOR["tab_punta"] - 1.4, XA0 - XB1,
         MOTOR["tab_punta"] + 1.4 + Y_PARED0, lw=0.9, ec="k")     # horquilla
    rect(ax, -33.0, 26.0, 22.7, 5.0, lw=0.9, ec="k")              # cuna
    rect(ax, TORRE["x0"], TORRE["y0"], TORRE["x1"] - TORRE["x0"],
         TORRE["y1"] - TORRE["y0"], lw=1.0, ec="k")
    for (px, py) in POSTES:
        ax.add_patch(Circle((px, py), P["poste_d"] / 2, fill=False, lw=1.0))
    for (px, py) in ANCLAJES:
        ax.add_patch(Circle((px, py), P["piloto_d"] / 2, fill=False,
                            lw=0.8, ec="#c60"))
        ax.plot([px - 3, px + 3], [py, py], "#c60", lw=0.5)
        ax.plot([px, px], [py - 3, py + 3], "#c60", lw=0.5)
    for (px, py) in AUX:
        ax.add_patch(Circle((px, py), P["aux_d"] / 2, fill=False, lw=0.8,
                            ec="#080"))
    ax.plot([XB0 - 4, XA1 + 4], [MOTOR["m3_tras"]] * 2, ls="-.", color="#888",
            lw=0.9)
    ax.text(XB0 - 4, MOTOR["m3_tras"] + 1, "2x M3x35 pasante (y=+20.6)",
            fontsize=7, color="#888")
    cota(ax, (-H, -H - 4), (H, -H - 4), f"{P['lado']:g}")
    cota(ax, (H + 4, -H), (H + 4, H), f"{P['lado']:g}", ha="left")
    cota(ax, (RAN_X0, RAN_Y_BASE + 2.5), (RAN_X1, RAN_Y_BASE + 2.5),
         f"{RAN_X1 - RAN_X0:g}")
    cota(ax, (RAN_X1 + 2.5, -RAN_Y_BASE), (RAN_X1 + 2.5, RAN_Y_BASE),
         f"{2 * RAN_Y_BASE:g}", ha="left")
    cota(ax, (XB0, -H + 8), (XA1, -H + 8),
         f"abrazadera {XA1 - XB0:g} (luz {XA0 - XB1:g})", off=(0, 1))
    ax.text(-30, -30, "  M3\n  x4", fontsize=7, color="#c60", ha="left")
    ax.text(0, 31.5, "  aux O3.4", fontsize=7, color="#080", ha="left")
    ax.set_title("Base - planta (rueda al lado +X, frente del motor abajo)",
                 fontsize=10)

    # ---- alzado (corte por el eje de la rueda) ----
    ax = ax2
    ax.plot([-48, 48], [-LUZ_SUELO, -LUZ_SUELO], color="#666", lw=2)  # suelo
    ax.text(40, -LUZ_SUELO - 3.4, "suelo", fontsize=7, color="#666")
    rect(ax, -H, 0, P["lado"], P["t_base"], lw=1.2, ec="k")
    for x0, x1 in ((XA0, XA1), (XB0, XB1)):
        rect(ax, x0, P["t_base"], x1 - x0, Z_PARED1 - P["t_base"], lw=1, ec="k")
    for (px, _) in POSTES[:1] + POSTES[1:2]:
        rect(ax, px - 5, P["t_base"], 10, Z_SEP - P["t_base"], lw=0.9, ec="k")
    rect(ax, -H, Z_SEP, P["lado"], P["t_tapa"], lw=1.2, ec="k")
    rect(ax, X_CUBO, Z_EJE - RUEDA["dia"] / 2, RUEDA["ancho_total"],
         RUEDA["dia"], lw=1.2, ec="#06c")                # perfil del cilindro
    rect(ax, X_CARA_B, P["t_base"] + P["alzada_asiento"], MOTOR["ancho_caja"],
         MOTOR["alto_cuerpo"], lw=1.0, ec="#b80")
    ax.plot([X_CARA_B - 9, X_CUBO + RUEDA["ancho_total"]], [Z_EJE, Z_EJE],
            ls="-.", color="#999", lw=0.8)
    cota(ax, (-44, 0), (-44, Z_EJE), f"eje a {Z_EJE:g}", ha="right")
    cota(ax, (-40, -LUZ_SUELO), (-40, 0), f"luz {LUZ_SUELO:g}", ha="right")
    cota(ax, (40, Z_SEP), (40, Z_SEP + P["t_tapa"]),
         f"tapa {P['t_tapa']:g}", ha="left", va="center")
    cota(ax, (44, 0), (44, Z_SEP), f"separadores {Z_SEP - P['t_base']:g}",
         ha="left")
    cota(ax, (36, Z_SEP + P["t_tapa"]), (36, Z_EJE + RUEDA["dia"] / 2),
         f"asoma {Z_EJE + RUEDA['dia'] / 2 - Z_SEP - P['t_tapa']:g}", ha="left")
    cota(ax, (X_CARA_B, -3.5), (X_CARA_B + MOTOR["ancho_caja"], -3.5),
         f"caja {MOTOR['ancho_caja']:g}", va="top", off=(0, -1))
    ax.text(X_CUBO + 10, Z_EJE - 2.5, f"rueda O{RUEDA['dia']:g}", color="#06c",
            fontsize=8)
    ax.set_title("Alzado - corte por el eje (mm)", fontsize=10)

    for ax in (ax1, ax2):
        ax.set_xlim(-52, 55)
        ax.set_ylim(-52 if ax is ax1 else -14, 55)
        ax.set_aspect("equal")
        ax.tick_params(labelsize=7)
        ax.grid(alpha=0.15)
    fig.suptitle("Soporte modular TT + mecanum 48 - cotas principales "
                 "(fuente unica: parametros del generador)", fontsize=11)
    fig.tight_layout()
    p = img_dir / "soporte_tt_mecanum_cotas.png"
    fig.savefig(p, bbox_inches="tight")
    plt.close(fig)
    print(f"  -> {p}")


def _previews(base, tapa_pos, ens):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection

    img_dir = REPO / "docs" / "img"
    img_dir.mkdir(parents=True, exist_ok=True)

    def draw(ax, mesh, alpha=1.0):
        col = Poly3DCollection(mesh.vertices[mesh.faces], alpha=alpha)
        fc = np.asarray(mesh.visual.face_colors, dtype=float) / 255.0
        # sombreado plano sencillo por orientacion de la cara
        n = mesh.face_normals
        luz = np.clip(0.55 + 0.45 * (n @ np.array([0.4, -0.5, 0.75])), 0.25, 1)
        col.set_facecolor(fc[:, :3] * luz[:, None])
        col.set_edgecolor("none")
        ax.add_collection3d(col)

    fig = plt.figure(figsize=(13, 10), dpi=110)
    vistas = [("Isometrica (ensamble)", (28, -50), ens, None),
              ("Alzado — la rueda asoma arriba y abajo", (0, -90), ens, None),
              ("Perfil (desde la rueda)", (0, 0), ens, None),
              ("Base sola (isometrica)", (32, -125), base, None)]
    for i, (titulo, (elev, azim), mesh, _) in enumerate(vistas, 1):
        ax = fig.add_subplot(2, 2, i, projection="3d")
        draw(ax, mesh)
        ax.view_init(elev=elev, azim=azim)
        ax.set_proj_type("ortho")
        lim = 48
        ax.set_xlim(-lim, lim); ax.set_ylim(-lim, lim)
        ax.set_zlim(-14, 2 * lim - 14)
        ax.set_box_aspect((1, 1, 1))
        ax.set_axis_off()
        ax.set_title(titulo, fontsize=10)
    fig.suptitle("Soporte modular TT + mecanum 48 — vista previa (mm reales)",
                 fontsize=12)
    fig.tight_layout()
    p = img_dir / "soporte_tt_mecanum_preview.png"
    fig.savefig(p, bbox_inches="tight")
    plt.close(fig)
    print(f"  -> {p}")


def main() -> None:
    args = sys.argv[1:]

    def opt(name):
        return args[args.index(name) + 1] if name in args else None

    proy = opt("--proyecto")
    if proy:
        proj = project_dir(proy)
        salida = proj / "out" / "componentes"
    else:
        proj = None
        salida = Path(opt("--salida") or MODELS)
    base, tapa, rutas = exportar(salida, png="--png" in args)
    if proj is not None:
        audit(proj, "COMPONENTES", "soporte_tt_mecanum: base+tapa+ensamble",
              "OK", hash=sha256_file(rutas["soporte_tt_mecanum_base.stl"]),
              capa="user", confianza="cad")


if __name__ == "__main__":
    main()
