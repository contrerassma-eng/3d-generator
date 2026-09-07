"""Generador paramétrico de la parrilla YT0100 "Medio Tambor" — capa `user`.

Todo el producto nace de `design/parametros.json`: cambia un parámetro y se
regeneran el sólido, los desarrollos de corte láser, el BOM y las masas.

Salidas (en projects/YT0100-parrilla-tambor/out/):
  cad/parrilla_tambor.glb|.stl   conjunto completo (mm reales, 1 nodo por pieza)
  cad/piezas/<código>.glb|.stl   cada pieza CNC suelta (para cotizar/fabricar)
  cad/escena.json                descripción de la escena para el visor web
  drawings/desarrollo_<cód>.dxf  desarrollo plano a escala real (corte láser)
  BOM.csv                        lista de materiales con masas y proceso

uso: python design/gen_parrilla.py [--rapido]
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import trimesh
from shapely.geometry import Polygon, box

DESIGN = Path(__file__).resolve().parent
PROJ = DESIGN.parent
REPO = PROJ.parent.parent
sys.path.insert(0, str(DESIGN))
sys.path.insert(0, str(REPO / "pipeline"))

import lib_chapa as CH                                            # noqa: E402
from lib_chapa import ACERO, INOX, Chapa                          # noqa: E402

P = json.loads((DESIGN / "parametros.json").read_text(encoding="utf-8"))
T, A, B, C = P["tambor"], P["alturas"], P["bastidor"], P["chapa"]
MAD, MOT, ESP, PAR, TOR = P["madera"], P["motor"], P["espeton"], P["parrilla"], P["tornilleria"]
BRA, CAN = P["brasero"], P["canto"]

R = T["diametro_ext"] / 2                 # radio exterior del tambor
RI = R - T["espesor"]                     # radio interior
LT = T["largo"]                           # largo del tambor (= largo de la parrilla)
ZC = A["h_corte"]                         # z del plano de corte (borde de trabajo)
E3, E2 = C["e_estructural"], C["e_liviana"]
TB, TE = B["tubo"], B["tubo_espesor"]

COLOR = {
    "tambor": "#4b5158", "chapa": "#79838f", "tubo": "#33383d",
    "roble": "#b5813f", "inox": "#c6ccd2", "motor": "#1f2226",
    "tornillo": "#9aa3ab", "fundicion": "#2b2e31",
}
RHO = {"acero": 7.85e-6, "inox": 7.90e-6, "roble": 755e-9}   # kg/mm3

PIEZAS: list[dict] = []      # registro para BOM + escena
NODOS: list[tuple] = []      # (nombre, mesh) para el GLB


# ---------------------------------------------------------------------------
# Primitivas
# ---------------------------------------------------------------------------

def _color(m, hexa):
    m.visual.face_colors = trimesh.visual.color.hex_to_rgba(hexa)
    return m


def caja(dim, pos=(0, 0, 0), color="#888888"):
    m = trimesh.creation.box(extents=dim)
    m.apply_translation(pos)
    return _color(m, color)


def cilindro(dia, alto, pos=(0, 0, 0), eje=(0, 0, 1), color="#888888", secs=32):
    m = trimesh.creation.cylinder(radius=dia / 2, height=alto, sections=secs)
    eje = np.asarray(eje, dtype=float)
    eje = eje / np.linalg.norm(eje)
    if not np.allclose(eje, [0, 0, 1]):
        m.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], eje))
    m.apply_translation(pos)
    return _color(m, color)


def tubo_cuadrado(largo, lado=None, esp=None, pos=(0, 0, 0), eje=(1, 0, 0), color=None):
    """Tubo estructural cuadrado, eje según `eje`, centrado en `pos`."""
    lado = TB if lado is None else lado
    esp = TE if esp is None else esp
    ext = box(-lado / 2, -lado / 2, lado / 2, lado / 2)
    int_ = box(-lado / 2 + esp, -lado / 2 + esp, lado / 2 - esp, lado / 2 - esp)
    m = trimesh.creation.extrude_polygon(ext.difference(int_), largo)
    m.apply_translation([0, 0, -largo / 2])
    eje = np.asarray(eje, dtype=float) / np.linalg.norm(eje)
    if not np.allclose(eje, [0, 0, 1]):
        m.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], eje))
    m.apply_translation(pos)
    return _color(m, color or COLOR["tubo"])


def barra_cuadrada(largo, lado, pos=(0, 0, 0), eje=(1, 0, 0), color=None):
    m = trimesh.creation.box(extents=(lado, lado, largo))
    m.apply_translation([0, 0, 0])
    eje = np.asarray(eje, dtype=float) / np.linalg.norm(eje)
    if not np.allclose(eje, [0, 0, 1]):
        m.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], eje))
    m.apply_translation(pos)
    return _color(m, color or COLOR["inox"])


def perno(dia, largo, pos=(0, 0, 0), eje=(0, 0, 1), color=None):
    """Perno hexagonal simplificado: cabeza + vástago (para lectura del modelo)."""
    vast = trimesh.creation.cylinder(radius=dia / 2, height=largo, sections=12)
    vast.apply_translation([0, 0, -largo / 2])
    cab = trimesh.creation.cylinder(radius=dia * 0.9, height=dia * 0.65, sections=6)
    cab.apply_translation([0, 0, dia * 0.325])
    m = trimesh.util.concatenate([vast, cab])
    eje = np.asarray(eje, dtype=float) / np.linalg.norm(eje)
    if not np.allclose(eje, [0, 0, 1]):
        m.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], eje))
    m.apply_translation(pos)
    return _color(m, color or COLOR["tornillo"])


def medio_tambor(mitad="cuba", secs=96):
    """Media virola de tambor con sus dos testas y los nervios de rodadura.

    `mitad` = 'cuba' (por debajo del plano de corte) o 'tapa' (por encima).
    Se construye como revolución exacta de la sección (virola + testas) y se
    corta por el plano diametral: geometría cerrada, sin booleanas frágiles.
    """
    e = T["espesor"]
    x0, x1 = -LT / 2, LT / 2
    # sección meridiana (r, x) de la pared: virola + dos testas
    perfil = [(R, x0), (R, x1), (R - e, x1), (R - e, x0 + e),
              (0, x0 + e), (0, x0), (R, x0)]
    poly = Polygon([(px, py) for px, py in perfil])
    tramos = [poly]
    # nervios de rodadura (dos cordones anulares)
    for s in (-1, 1):
        xc = s * T["nervio_pos_rel"] * LT
        w, h = T["nervio_ancho"], T["nervio_alto"]
        tramos.append(Polygon([(R, xc - w / 2), (R + h, xc - w / 2 + 5),
                               (R + h, xc + w / 2 - 5), (R, xc + w / 2)]))
    piezas = []
    for tr in tramos:
        m = trimesh.creation.revolve(list(tr.exterior.coords), sections=secs)
        # revolve gira en torno a Z con (r,z); aquí r->radio, z->x del tambor
        m.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [0, 1, 0]))
        piezas.append(m)
    m = trimesh.util.concatenate(piezas)
    m.apply_translation([0, 0, ZC])                     # eje del tambor a la altura de corte
    caja_corte = trimesh.creation.box(extents=(LT * 1.4, 4 * R, 2 * R))
    dz = -R if mitad == "cuba" else R
    caja_corte.apply_translation([0, 0, ZC + dz])
    try:
        m = trimesh.boolean.intersection([m, caja_corte])
    except Exception:
        m = m.slice_plane([0, 0, ZC], [0, 0, -1] if mitad == "cuba" else [0, 0, 1], cap=True)
    return _color(m, COLOR["tambor"])


# ---------------------------------------------------------------------------
# Registro de piezas
# ---------------------------------------------------------------------------

def registrar(codigo, nombre, cantidad, material, proceso, masa_kg,
              mesh=None, extra=None, familia="", nota=""):
    PIEZAS.append({"codigo": codigo, "nombre": nombre, "cantidad": cantidad,
                   "material": material, "proceso": proceso,
                   "masa_kg": round(float(masa_kg), 3),
                   "masa_total_kg": round(float(masa_kg) * cantidad, 3),
                   "familia": familia, "nota": nota, **(extra or {})})
    return mesh


def nodo(nombre, mesh):
    NODOS.append((nombre, mesh))
    return mesh


def masa_mesh(mesh, rho):
    return abs(mesh.volume) * rho


# ---------------------------------------------------------------------------
# Colocación de piezas de chapa en el conjunto
# ---------------------------------------------------------------------------

def marco(eu, ev, origen):
    """4x4 a partir de dos ejes del panel base (el 3.º = eu x ev)."""
    eu = np.asarray(eu, float); ev = np.asarray(ev, float)
    ew = np.cross(eu, ev)
    X = np.eye(4)
    X[:3, 0], X[:3, 1], X[:3, 2], X[:3, 3] = eu, ev, ew, np.asarray(origen, float)
    return X


def colocar(mesh, X, espejo_x=False):
    m = mesh.copy()
    m.apply_transform(X)
    if espejo_x:
        S = np.eye(4); S[0, 0] = -1
        m.apply_transform(S)
    return m


# ---------------------------------------------------------------------------
# 1. BASTIDOR — tubo 40x40x2, uniones SOLAPADAS atornilladas (sin soldadura,
#    sin escuadras: cada tubo se traslapa contra la cara del otro y se une con
#    2 x M8 en remache-tuerca. Cero piezas intermedias en el bastidor.)
# ---------------------------------------------------------------------------

PX, PY, PZ = B["pata_x"], B["pata_y"], A["z_pata"]
LARG_Y = PY + TB                      # largueros por FUERA de las patas
TRAV_X = PX + TB                      # travesaños por FUERA de las patas
POSTE_X = B["poste_x"]                # postes de la mesa, en la testa (fuera del tambor)
L_PATA = PZ
L_LARG = (POSTE_X + TB / 2 + 20) + (TRAV_X + 20)     # el larguero llega al poste
X_LARG0 = ((TRAV_X + 20) - (POSTE_X + TB / 2 + 20)) / 2
L_TRAV = 2 * (LARG_Y + 20)
L_POSTE = 855.0
Z_LARG_S, Z_LARG_I = A["z_larguero_sup"] - TB / 2, A["z_larguero_inf"] - TB / 2
Z_TRAV_S, Z_TRAV_I = 450.0, 90.0

RHO_TUBO = (TB * TB - (TB - 2 * TE) ** 2) * 7.85e-6        # kg/mm

def bastidor():
    ms = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            ms.append(nodo(f"TUB-PATA_{sx:+d}{sy:+d}",
                           tubo_cuadrado(L_PATA, pos=(sx * PX, sy * PY, PZ / 2), eje=(0, 0, 1))))
    registrar("TUB-PATA", "Pata — tubo 40x40x2", 4, "acero A36 tubo 40x40x2",
              "corte a medida + Ø11 para remache-tuerca M8", RHO_TUBO * L_PATA,
              familia="bastidor", extra={"largo_mm": L_PATA})

    for sy in (-1, 1):
        for z in (Z_LARG_S, Z_LARG_I):
            ms.append(nodo(f"TUB-LARGUERO_{sy:+d}_{int(z)}",
                           tubo_cuadrado(L_LARG, pos=(X_LARG0, sy * LARG_Y, z), eje=(1, 0, 0))))
    registrar("TUB-LARGUERO", "Larguero — tubo 40x40x2 (llega hasta el poste de la mesa)", 4,
              "acero A36 tubo 40x40x2", "corte a medida + Ø9 de paso + Ø16 de acceso en la cara opuesta", RHO_TUBO * L_LARG,
              familia="bastidor", extra={"largo_mm": round(L_LARG, 1)})

    for sx in (-1, 1):
        for z in (Z_TRAV_S, Z_TRAV_I):
            ms.append(nodo(f"TUB-TRAVESANO_{sx:+d}_{int(z)}",
                           tubo_cuadrado(L_TRAV, pos=(sx * TRAV_X, 0, z), eje=(0, 1, 0))))
    registrar("TUB-TRAVESANO", "Travesaño — tubo 40x40x2", 4,
              "acero A36 tubo 40x40x2", "corte a medida + Ø9 de paso", RHO_TUBO * L_TRAV,
              familia="bastidor", extra={"largo_mm": round(L_TRAV, 1)})

    for sy in (-1, 1):
        ms.append(nodo(f"TUB-POSTE_{sy:+d}",
                       tubo_cuadrado(L_POSTE, pos=(-POSTE_X, sy * PY, L_POSTE / 2), eje=(0, 0, 1))))
    registrar("TUB-POSTE", "Poste de la mesa de roble — tubo 40x40x2", 2,
              "acero A36 tubo 40x40x2", "corte a medida + Ø11 remache-tuerca M8",
              RHO_TUBO * L_POSTE, familia="bastidor", extra={"largo_mm": L_POSTE})

    # pernos de las uniones solapadas (2 por unión)
    n = 0
    for sy in (-1, 1):
        for z in (Z_LARG_S, Z_LARG_I):
            for x in (-PX, PX, -POSTE_X):
                for dx in (-14, 14):
                    ms.append(perno(8, 60, pos=(x + dx, sy * (LARG_Y + TB / 2), z),
                                    eje=(0, sy, 0))); n += 1
    for sx in (-1, 1):
        for z in (Z_TRAV_S, Z_TRAV_I):
            for sy in (-1, 1):
                for dy in (-14, 14):
                    ms.append(perno(8, 60, pos=(sx * (TRAV_X + TB / 2), sy * PY + dy, z),
                                    eje=(sx, 0, 0))); n += 1
    registrar("TOR-M8x60", "Perno M8x60 cabeza hexagonal + golilla (unión solapada de tubos)",
              n, "acero zincado 8.8", "comprado", 0.038, familia="tornillería")
    registrar("REM-M8", "Remache-tuerca M8 (tubo, sin acceso interior)", n,
              "acero zincado", "comprado — se instala en el taller de tubos", 0.006,
              familia="tornillería",
              nota="Sustituye a la tuerca soldada: es LA pieza que hace posible el bastidor sin soldadura")
    return ms


# ---------------------------------------------------------------------------
# 2. CUN-CUNA — cuna de chapa que sostiene y amarra el tambor (2 uds, en espejo)
# ---------------------------------------------------------------------------

TH_TAB = math.radians(55.0)          # ángulo de las pestañas de amarre
L_TAB = 60.0                         # largo de la línea de pliegue de la pestaña


def cuna_chapa():
    """Cuna: base ancha que apoya en los dos largueros y silla que abraza la
    virola hasta ±55°, con pestañas tangentes que amarran el tambor."""
    Rc = R + T["holgura_cuna"]
    W = max(2 * (Rc * math.sin(TH_TAB) + L_TAB * math.cos(TH_TAB)) + 16.0,
            2 * (LARG_Y + 40.0))
    uc = W / 2
    vc = ZC - A["z_larguero_sup"]                       # 360: centro del tambor
    v_base = 55.0                                      # alto del faldón de apoyo
    pts_arco = [(uc + Rc * math.sin(th), vc - Rc * math.cos(th))
                for th in np.linspace(-TH_TAB, TH_TAB, 97)]
    Ap = np.array(pts_arco[-1]); Am = np.array(pts_arco[0])
    Tp = np.array([math.cos(TH_TAB), math.sin(TH_TAB)])
    Tm = np.array([-math.cos(TH_TAB), math.sin(TH_TAB)])
    Ep, Em = Ap + L_TAB * Tp, Am + L_TAB * Tm
    contorno = ([(0.0, 0.0), (W, 0.0), (W, v_base), (Ep[0], Ep[1])]
                + list(reversed(pts_arco)) + [(Em[0], Em[1]), (0.0, v_base)])
    ch = Chapa("CUN-CUNA", "Cuna del tambor (soporta y amarra)", E3, cantidad=2,
               color=COLOR["chapa"],
               nota="Misma pieza para los dos apoyos: la 2.ª se monta volteada (espejo)")
    b = ch.base(Polygon(contorno))
    for uy in (uc - LARG_Y, uc + LARG_Y):
        ch.pestana(b, ((uy - 25, 0.0), (uy + 25, 0.0)), 90.0, 90, sentido=+1,
                   u0=0, u1=50, nombre="pie sobre larguero")
    ch.pestana(b, (tuple(Ap), tuple(Ep)), 45.0, 90, sentido=+1, nombre="amarre tambor")
    ch.pestana(b, (tuple(Em), tuple(Am)), 45.0, 90, sentido=+1, nombre="amarre tambor")
    for i in range(2):
        ch.agujeros(1 + i, [(25, 28), (25, 68)], TOR["M8"])
    ch.agujeros(3, [(L_TAB / 2, 26)], TOR["M6"])
    ch.agujeros(4, [(L_TAB / 2, 26)], TOR["M6"])
    # aligeramiento: baja masa y da lectura de pieza diseñada
    for du, dv, dia in ((0, 40, 58), (-155, 55, 62), (155, 55, 62),
                        (-235, 105, 52), (235, 105, 52)):
        ch.agujero(b, (uc + du, dv), dia)
    return ch, W, max(Ep[1], Em[1])


# ---------------------------------------------------------------------------
# 3. PER-CANTO — perfil de canto que encapsula el borde cortado del tambor.
#    Es la pieza que devuelve al medio tambor la rigidez que perdió al cortarlo
#    (sin soldadura) y a la vez elimina el filo y forma el asiento de la tapa.
# ---------------------------------------------------------------------------

CANTO_WEB, CANTO_ALA = CAN["web"], CAN["ala"]
N_TORN_CANTO = CAN["tornillos"]


def canto_chapa():
    ch = Chapa("PER-CANTO", "Perfil de canto del tambor (rigidiza el corte y asienta la tapa)",
               E2, cantidad=4, color=COLOR["chapa"],
               nota="2 en la cuba y 2 en la tapa: al cerrar, las alas se enfrentan y forman el sello")
    b = ch.base(box(0, 0, LT, CANTO_WEB))
    ch.pestana(b, ((0, 0), (LT, 0)), CANTO_ALA, 90, sentido=+1, nombre="ala de asiento")
    paso = LT / N_TORN_CANTO
    ch.agujeros(b, [(paso / 2 + i * paso, 17) for i in range(N_TORN_CANTO)], TOR["M5"])
    return ch


# ---------------------------------------------------------------------------
# 4. BIS-HOJA — hoja de bisagra atornillada (4 uds: 2 bisagras).
#    Misma pieza arriba y abajo (la de la tapa va volteada).
# ---------------------------------------------------------------------------

Y_PIN, Z_PIN = R + 44.0, ZC          # eje del pasador, por fuera de las alas de canto


def bisagra_chapa():
    """Hoja con oreja en GANCHO: sólo sube por encima del borde donde ya no hay
    ala de canto (y > R+ala), de modo que la tapa cierra sin tocar la bisagra."""
    v_step = CANTO_ALA + 4.0                 # radio donde termina el ala de canto
    v_out = Y_PIN - R + 14.0                 # alcance radial de la oreja
    ch = Chapa("BIS-HOJA", "Hoja de bisagra (pasador M8)", E3, cantidad=4,
               color=COLOR["chapa"],
               nota="Las 4 hojas son la misma pieza; las de la tapa se montan volteadas")
    b = ch.base(box(0, 0, 70, 30))                 # apoyo en la pared del tambor
    ch.agujeros(b, [(18, 15), (52, 15)], TOR["M6"])
    oreja = Polygon([(6, 0), (30, 0), (30, v_out), (-20, v_out), (-20, v_step), (6, v_step)])
    ch.pestana(b, ((70, 0), (70, 30)), v_out, 90, sentido=+1, poly=oreja,
               nombre="oreja del pasador")
    ch.agujero(1, (-6, Y_PIN - R), TOR["M8"])
    return ch


# ---------------------------------------------------------------------------
# 5. CRE-RACK — cremallera de altura de la parrilla (4 uds, en las testas planas)
# ---------------------------------------------------------------------------

RACK_Y0, RACK_W, RACK_Z0 = 160.0, 66.0, 720.0
RACK_PASO = 22.0
NIVELES = A["niveles_parrilla"]


def rack_chapa():
    """Escalera de 3 peldaños: el peldaño alto queda al EXTERIOR (donde el tambor
    es más ancho) y el bajo hacia el centro. Cada peldaño lleva su tope de 8 mm
    para que la barra no se corra hacia adentro."""
    ch = Chapa("CRE-RACK", "Cremallera de altura de la parrilla (3 niveles)", E3,
               cantidad=4, color=COLOR["chapa"],
               nota="Va atornillada a la testa PLANA del tambor: contacto perfecto, sin curvatura")
    v = [n - RACK_Z0 for n in NIVELES]                    # 35 / 70 / 105
    pts = [(0.0, 0.0), (RACK_W, 0.0), (RACK_W, v[2])]
    for i in (2, 1, 0):
        u_in = i * RACK_PASO
        pts += [(u_in + 2, v[i]), (u_in + 2, v[i] + 8), (u_in, v[i] + 8),
                (u_in, v[i - 1] if i else 0.0)]
    ch.base(Polygon(pts))
    ch.agujeros(0, [(62, 15), (62, 90)], TOR["M6"])
    ch.pestana(0, ((RACK_W, 0.0), (RACK_W, v[2])), 18, 90, sentido=+1, nombre="rigidizador")
    return ch


# ---------------------------------------------------------------------------
# 6. Parrilla: 2 módulos de varillas sobre 2 barras de apoyo
# ---------------------------------------------------------------------------

GRI_L, GRI_X = PAR["modulo"]        # módulo de parrilla (Y, X)


def parrilla_comprada():
    """Malla de parrilla COMPRADA (2 módulos), modelada como marco + varillas.

    Fabricarla en el taller sin soldadura obligaría a varillas pasantes a paso
    20 mm —52 varillas, 104 agujeros y 104 inserciones de armado— para que el
    hueco entre varillas sea usable: sale más caro que comprarla hecha. El
    diseño aporta las barras de apoyo y las cremalleras, que aceptan cualquier
    parrilla de la medida.
    """
    dia, paso = PAR["varilla_dia"], PAR["paso_varilla"]
    ancho_m, esp_m = PAR["marco"]
    n = int(GRI_L // paso) - 1
    piezas = []
    for lado in (-1, 1):
        piezas.append(caja((GRI_X, esp_m, ancho_m),
                           pos=(0, lado * (GRI_L - esp_m) / 2, 0), color=COLOR["fundicion"]))
        piezas.append(caja((esp_m, GRI_L, ancho_m),
                           pos=(lado * (GRI_X - esp_m) / 2, 0, 0), color=COLOR["fundicion"]))
    for i in range(n):
        y = -GRI_L / 2 + (i + 1) * (GRI_L / (n + 1))
        piezas.append(cilindro(dia, GRI_X - 2 * esp_m, pos=(0, y, 0), eje=(1, 0, 0),
                               color=COLOR["fundicion"], secs=8))
    return trimesh.util.concatenate(piezas), n


# ---------------------------------------------------------------------------
# 7. Brasero (cama de carbón) y sus apoyos
# ---------------------------------------------------------------------------

BRA_L, BRA_W, BRA_H = BRA["largo"], BRA["ancho"], BRA["alto"]


def brasero_chapa():
    ch = Chapa("BRA-CUERPO", "Brasero perforado (cama de carbón)", E2, cantidad=1,
               color=COLOR["chapa"],
               nota="Los 4 costados plegados lo convierten en viga: 2 mm bastan para 810 mm de luz")
    b = ch.base(box(0, 0, BRA_L, BRA_W))
    ch.pestana(b, ((0, 0), (BRA_L, 0)), BRA_H, 90, sentido=+1, u0=6, u1=BRA_L - 6,
               nombre="costado largo")
    ch.pestana(b, ((BRA_L, BRA_W), (0, BRA_W)), BRA_H, 90, sentido=+1, u0=6, u1=BRA_L - 6,
               nombre="costado largo")
    ch.pestana(b, ((BRA_L, 0), (BRA_L, BRA_W)), BRA_H, 90, sentido=+1, u0=6, u1=BRA_W - 6,
               nombre="testa")
    ch.pestana(b, ((0, BRA_W), (0, 0)), BRA_H, 90, sentido=+1, u0=6, u1=BRA_W - 6,
               nombre="testa")
    paso, dia = BRA["perforacion_paso"], BRA["perforacion_dia"]
    nx = int((BRA_L - 90) // paso) + 1
    ny = int((BRA_W - 90) // paso) + 1
    ch.agujeros(b, [(BRA_L / 2 + (i - (nx - 1) / 2) * paso, BRA_W / 2 + (j - (ny - 1) / 2) * paso)
                    for i in range(nx) for j in range(ny)], dia)
    return ch


def _tangente_brasero():
    """Ángulo φ de la virola donde la línea de pliegue del apoyo cae en z_brasero.

    Resuelve  Ri·cosφ + 20·senφ = ZC − z_brasero  (20 = medio ancho del ala,
    para que la TANGENCIA quede al centro del apoyo y el hueco máximo contra
    la virola sea de 0,7 mm en los bordes).
    """
    obj = ZC - A["z_brasero"]
    rp = math.hypot(RI, 20.0)
    d = math.atan2(20.0, RI)
    phi = math.acos(obj / rp) + d
    yf = RI * math.sin(phi) - 20.0 * math.cos(phi)
    zf = ZC - RI * math.cos(phi) - 20.0 * math.sin(phi)
    return phi, yf, zf


def brasero_soporte_chapa():
    """Apoyo del brasero: LARGO en X (donde la virola es plana) y ANGOSTO en el
    sentido circunferencial, así asienta contra la pared curva sin cuñas."""
    phi, _, _ = _tangente_brasero()
    ch = Chapa("BRA-SOP", "Apoyo del brasero (riel tangente a la virola)", E3, cantidad=2,
               color=COLOR["chapa"],
               nota="Ancho 40 mm en el sentido curvo: el hueco contra la virola es 0,7 mm")
    b = ch.base(box(0, 0, 250, 40))
    ch.pestana(b, ((0, 0), (250, 0)), 45, math.degrees(phi), sentido=+1,
               nombre="repisa horizontal del brasero")
    ch.agujeros(b, [(25, 20), (225, 20)], TOR["M6"])
    return ch


# ---------------------------------------------------------------------------
# 8. Espetón: chumaceras + soporte del motor de spiedo
# ---------------------------------------------------------------------------

def chumacera_chapa():
    ch = Chapa("SOP-CHUM", "Soporte de chumacera del espetón", E3, cantidad=2,
               color=COLOR["chapa"], nota="Aloja buje de bronce Ø12/Ø16; va a la testa PLANA")
    b = ch.base(box(0, 0, 130, 80))
    ch.agujero(b, (65, 40), ESP["buje_ext"])
    ch.agujeros(b, [(18, 40), (112, 40)], TOR["M6"])
    ch.pestana(b, ((0, 0), (130, 0)), 15, 90, sentido=+1, nombre="rigidizador")
    ch.pestana(b, ((130, 80), (0, 80)), 15, 90, sentido=+1, nombre="rigidizador")
    return ch


def soporte_motor_chapa():
    """Soporte en Z: el ala del motor queda PARALELA a la testa (eje del motor
    en el eje X, alineado con el espetón) y separada 120 mm para el acople."""
    ch = Chapa("SOP-MOTOR", "Soporte del motor de spiedo", E3, cantidad=1,
               color=COLOR["chapa"],
               nota="SUPUESTO S2: patrón de montaje del motor 2 x Ø6,6 a 50 mm — verificar con el motor")
    b = ch.base(box(0, 0, 150, 110))                       # ala contra la testa
    ch.agujeros(b, [(25, 25), (25, 85)], TOR["M6"])
    a1 = ch.pestana(b, ((150, 0), (150, 110)), 120, 90, sentido=+1, nombre="separador")
    a2 = ch.pestana(a1, ((0, 120), (110, 120)), 130, 90, sentido=+1, nombre="ala del motor")
    ch.agujero(a2, (55, 90), 34.0)                          # paso del boss de salida
    ch.agujeros(a2, [(55, 90 - MOT["patron_montaje"] / 2), (55, 90 + MOT["patron_montaje"] / 2)],
                TOR["M6"])
    return ch


# ---------------------------------------------------------------------------
# 9. Herrajes de la madera y tiros
# ---------------------------------------------------------------------------

def cabezal_mesa_chapa():
    ch = Chapa("SOP-MESA", "Cabezal del poste (recibe la mesa de roble)", E3, cantidad=2,
               color=COLOR["chapa"])
    b = ch.base(box(0, 0, 220, 80))
    ch.agujero(b, (110, 40), TOR["M8"])
    ch.agujeros(b, [(25, 20), (25, 60), (195, 20), (195, 60)], 5.2)   # tirafondos a la madera
    return ch


def asa_soporte_chapa():
    ch = Chapa("ASA-SOP", "Soporte de asa de roble", E3, cantidad=4, color=COLOR["chapa"],
               nota="2 para el asa de roble de la tapa y 2 para la barra de empuje frontal")
    b = ch.base(box(0, 0, 90, 34))                         # pie contra el tambor
    ch.agujeros(b, [(20, 17), (70, 17)], TOR["M6"])
    ch.pestana(b, ((90, 0), (90, 34)), 95, 90, sentido=+1, nombre="montante")
    ch.agujeros(1, [(17, 80)], 5.2)      # tirafondo a la madera
    return ch


def tiro_chapa():
    from shapely.geometry import Point
    ch = Chapa("TIR-DISCO", "Disco de tiro regulable", E2, cantidad=4, color=COLOR["chapa"],
               nota="Gira sobre su perno central y descubre las 3 lumbreras de la testa")
    disco = Point(0, 0).buffer(50, quad_segs=24)
    ch.base(disco)
    ch.agujero(0, (0, 0), TOR["M8"])
    for i in range(3):
        a0 = i * 2 * math.pi / 3
        sector = Point(0, 0).buffer(41, quad_segs=24).difference(Point(0, 0).buffer(19, quad_segs=24))
        cuna_ = Polygon([(0, 0),
                         (200 * math.cos(a0 - 0.5), 200 * math.sin(a0 - 0.5)),
                         (200 * math.cos(a0 + 0.5), 200 * math.sin(a0 + 0.5))])
        ch.rasgadura(0, sector.intersection(cuna_))
    return ch


# ---------------------------------------------------------------------------
# 9bis. UTILLAJE — plantillas de taladrado del tambor (no van con el producto)
#
# Secuencia de fabricación: se taladra el tambor ENTERO (todavía rígido) y
# recién después se corta longitudinalmente. Así no hay que sujetar medias
# cañas ni taladrar en obra: el kit llega con todos los agujeros hechos.
# ---------------------------------------------------------------------------

def plantilla_testa_dxf(path: Path) -> dict:
    """Plantilla de las DOS testas, para taladrar antes de cortar el tambor."""
    import ezdxf
    doc = ezdxf.new("R2018", setup=True)
    doc.header["$INSUNITS"] = 4
    for nom, (aci, lt, lw) in CAPAS_DXF.items():
        doc.layers.add(nom, color=aci, linetype=lt, lineweight=lw)
    doc.layers.add("REFERENCIA", color=4, linetype="DASHED", lineweight=13)
    msp = doc.modelspace()
    # contorno de la testa y línea de corte del tambor (y = 0 aquí = eje de corte)
    msp.add_circle((0, 0), RI, dxfattribs={"layer": "REFERENCIA"})
    msp.add_line((-RI - 20, 0), (RI + 20, 0), dxfattribs={"layer": "REFERENCIA"})
    msp.add_text("LINEA DE CORTE DEL TAMBOR (plano diametral)", height=7,
                 dxfattribs={"layer": "TEXTO"}).set_placement((-RI, 6))
    ag = []                                  # (y, z-relativo-al-corte, Ø, rótulo)
    for sy in (-1, 1):
        ag += [(sy * 222, 735 - ZC, TOR["M6"], "CRE-RACK"),
               (sy * 222, 810 - ZC, TOR["M6"], "CRE-RACK")]
    ag += [(-47, A["z_espeton"] - ZC, TOR["M6"], "SOP-CHUM"),
           (47, A["z_espeton"] - ZC, TOR["M6"], "SOP-CHUM"),
           (0, A["z_espeton"] - ZC, 18.0, "PASO DEL ESPETON"),
           (-35, 770 - ZC, TOR["M6"], "SOP-MOTOR (solo testa del motor)"),
           (-35, 830 - ZC, TOR["M6"], "SOP-MOTOR (solo testa del motor)")]
    for z in (690 - ZC, 180.0):              # tiro: entrada abajo, salida arriba
        ag.append((0, z, TOR["M8"], "TIRO — perno central"))
        for i in range(3):
            a = math.radians(90 + i * 120)
            ag.append((31 * math.cos(a), z + 31 * math.sin(a), 28.0, "TIRO — lumbrera"))
    vistos = set()
    for y, z, dia, rot in ag:
        msp.add_circle((y, z), dia / 2, dxfattribs={"layer": "CORTE"})
        if rot not in vistos:
            msp.add_text(f"{rot}  O{dia:g}", height=5,
                         dxfattribs={"layer": "TEXTO"}).set_placement((y + dia / 2 + 3, z + 3))
            vistos.add(rot)
    msp.add_text("PLA-TESTA — plantilla de taladrado de las testas. Acero e3, escala 1:1. "
                 "Se taladra el tambor ENTERO y despues se corta.",
                 height=8, dxfattribs={"layer": "TEXTO"}).set_placement((-RI, -RI - 25))
    path.parent.mkdir(parents=True, exist_ok=True)
    doc.saveas(path)
    return {"agujeros": len(ag)}


def plantilla_virola_chapa():
    """Plantilla de la virola: pletina con labio que calza en el borde cortado."""
    ch = Chapa("PLA-VIROLA", "Plantilla de taladrado de la virola (utillaje)", E3,
               cantidad=1, color="#b06a2c",
               proceso="corte láser + plegado (utillaje, no va con el producto)",
               nota="El labio plegado se apoya en el canto cortado: referencia sin medir")
    b = ch.base(box(0, 0, LT, 60))
    ch.pestana(b, ((0, 0), (LT, 0)), 25, 90, sentido=+1, nombre="labio de referencia")
    paso = LT / N_TORN_CANTO
    ch.agujeros(b, [(paso / 2 + i * paso, 17) for i in range(N_TORN_CANTO)], 8.0)
    for xh in (-190.0, 120.0):
        for du in (18, 52):
            ch.agujero(b, (LT / 2 + xh + du, 21), 8.0)
    return ch


# ---------------------------------------------------------------------------
# 10. Ensamble
# ---------------------------------------------------------------------------

ESPEJO = {"x": np.diag([-1.0, 1, 1, 1]), "y": np.diag([1.0, -1, 1, 1]),
          "z": np.diag([1.0, 1, -1, 1])}


def poner(mesh, X, espejo=None, color=None):
    """Coloca una pieza; `espejo` admite 'x', 'y', 'z' o una combinación ('xy')."""
    m = mesh.copy()
    m.apply_transform(X)
    for eje in (espejo or ""):
        m.apply_transform(ESPEJO[eje])
    return _color(m, color) if color else m


def chapa_al_conjunto(ch, colocaciones):
    """Registra la pieza y devuelve sus instancias colocadas en el conjunto."""
    met = ch.metricas()
    sol = ch.solido()
    registrar(met["codigo"], met["nombre"], met["cantidad"],
              f"chapa de acero e{met['espesor']:g}", met["proceso"], met["masa_kg"],
              familia="chapa CNC",
              extra={"desarrollo_mm": met["desarrollo_mm"], "pliegues": met["pliegues"],
                     "agujeros": met["agujeros"], "largo_corte_mm": met["largo_corte_mm"],
                     "area_mm2": met["area_mm2"]},
              nota=met["nota"])
    CHAPAS[met["codigo"]] = ch
    for panel in ch.paneles:            # la tornillería se CUENTA de las piezas
        for h in panel.agujeros:
            d = 2 * math.sqrt(h.area / math.pi)
            for nom, dia in (("tirafondo", 5.2), ("M5", 5.5), ("M6", 6.6), ("M8", 8.5)):
                if abs(d - dia) < 0.2:
                    FIJACIONES[nom] = FIJACIONES.get(nom, 0) + met["cantidad"]
    out = []
    for i, (X, esp) in enumerate(colocaciones):
        out.append(nodo(f"{met['codigo']}_{i+1}", poner(sol, X, esp, ch.color)))
    return out


CHAPAS: dict[str, Chapa] = {}
FIJACIONES: dict[str, int] = {}   # tornillería contada de los agujeros reales


def conjunto():
    ms = list(bastidor())

    # --- tambor -----------------------------------------------------------
    cuba, tapa = medio_tambor("cuba"), medio_tambor("tapa")
    ms += [nodo("TAM-CUBA", cuba), nodo("TAM-TAPA", tapa)]
    registrar("TAM-CUBA", "Cuba — mitad inferior del tambor de 200 L", 1,
              "acero e1,10 (tambor recuperado)",
              "corte longitudinal por el plano diametral + taladrado con plantilla",
              masa_mesh(cuba, RHO["acero"]), familia="tambor",
              nota="[web] Ø572 x 851, e1,10. Las DOS mitades del mismo tambor se usan: cero descarte")
    registrar("TAM-TAPA", "Tapa — mitad superior del mismo tambor", 1,
              "acero e1,10 (tambor recuperado)", "misma operación de corte",
              masa_mesh(tapa, RHO["acero"]), familia="tambor")

    # --- cunas ------------------------------------------------------------
    ch_cuna, W_CUNA, _ = cuna_chapa()
    cx = B["cuna_x"]
    chapa_al_conjunto(ch_cuna, [
        (marco((0, 1, 0), (0, 0, 1), (-cx, -W_CUNA / 2, A["z_larguero_sup"])), None),
        (marco((0, -1, 0), (0, 0, 1), (cx, W_CUNA / 2, A["z_larguero_sup"])), None)])

    # --- perfiles de canto -------------------------------------------------
    chapa_al_conjunto(canto_chapa(), [
        (marco((1, 0, 0), (0, 0, -1), (-LT / 2, R, ZC)), None),          # cuba, atrás
        (marco((-1, 0, 0), (0, 0, -1), (LT / 2, -R, ZC)), None),         # cuba, adelante
        (marco((-1, 0, 0), (0, 0, 1), (LT / 2, R, ZC)), None),           # tapa, atrás
        (marco((1, 0, 0), (0, 0, 1), (-LT / 2, -R, ZC)), None)])         # tapa, adelante

    # --- bisagras (eje del pasador por fuera de las alas de canto) ----------
    ch_bis = bisagra_chapa()
    col = []
    for xh in (-190.0, 120.0):
        col.append((marco((1, 0, 0), (0, 0, -1), (xh, R, ZC - 6)), None))
        col.append((marco((-1, 0, 0), (0, 0, 1), (xh + 144, R, ZC + 6)), None))
    chapa_al_conjunto(ch_bis, col)
    for xh in (-190.0, 120.0):
        ms.append(perno(8, 70, pos=(xh + 40, Y_PIN, Z_PIN), eje=(1, 0, 0)))
    registrar("TOR-PASADOR", "Pasador de bisagra M8x70 + tuerca autoblocante", 2,
              "acero zincado", "comprado", 0.045, familia="tornillería")

    # --- cremalleras de altura (en las testas planas) ----------------------
    xi = LT / 2 - T["espesor"]
    X_rack = marco((0, 1, 0), (0, 0, 1), (-xi, RACK_Y0, RACK_Z0))
    chapa_al_conjunto(rack_chapa(), [(X_rack, e) for e in (None, "y", "x", "xy")])

    # --- barras de apoyo y módulos de parrilla ------------------------------
    y_bar = RACK_Y0 + 1.5 * RACK_PASO + 12.5
    z_bar = NIVELES[1]
    for sy in (-1, 1):
        ms.append(nodo(f"PAR-BARRA_{sy:+d}",
                       tubo_cuadrado(2 * xi - 4, 25, 2, pos=(0, sy * y_bar, z_bar + 12.5),
                                     eje=(1, 0, 0), color=COLOR["chapa"])))
    registrar("PAR-BARRA", "Barra de apoyo de la parrilla — tubo 25x25x2", 2,
              "acero tubo 25x25x2", "corte a medida",
              (25 * 25 - 21 * 21) * 7.85e-6 * (2 * xi - 4), familia="parrilla",
              extra={"largo_mm": round(2 * xi - 4, 1)})

    z_riel = z_bar + 25 + PAR["marco"][0] / 2
    malla, n_var = parrilla_comprada()
    for sx in (-1, 1):
        ms.append(nodo(f"PAR-MALLA_{sx:+d}",
                       poner(malla, marco((1, 0, 0), (0, 1, 0),
                                          (sx * (15 + GRI_X / 2), 0, z_riel)))))
    registrar("PAR-MALLA", f"Parrilla de fierro {GRI_L:.0f} x {GRI_X:.0f} — {n_var} varillas "
              f"Ø{PAR['varilla_dia']:g}, hueco {GRI_L/(n_var+1)-PAR['varilla_dia']:.0f} mm",
              PAR["modulos"], "acero al carbono", "COMPRADA", masa_mesh(malla, RHO["acero"]),
              familia="comprados",
              nota="Fabricarla sin soldadura costaría 8 piezas CNC, 104 agujeros y 104 "
                   "inserciones de armado: comprarla sale más barato y el hueco queda usable")

    # --- brasero ------------------------------------------------------------
    chapa_al_conjunto(brasero_chapa(), [
        (marco((1, 0, 0), (0, 1, 0), (-BRA_L / 2, -BRA_W / 2, A["z_brasero"])), None)])
    phi, y_sop, z_sop = _tangente_brasero()
    X_sop = marco((1, 0, 0), (0, math.cos(phi), math.sin(phi)), (-125, y_sop, z_sop))
    chapa_al_conjunto(brasero_soporte_chapa(), [(X_sop, None), (X_sop, "y")])

    # --- espetón, chumaceras y motor ---------------------------------------
    chapa_al_conjunto(chumacera_chapa(), [
        (marco((0, 1, 0), (0, 0, 1), (LT / 2, -65, A["z_espeton"] - 40)), None),
        (marco((0, 1, 0), (0, 0, 1), (LT / 2, -65, A["z_espeton"] - 40)), "x")])
    x_ala_motor = LT / 2 + 120
    chapa_al_conjunto(soporte_motor_chapa(), [
        (marco((0, 1, 0), (0, 0, 1), (LT / 2, -60, A["z_espeton"] - 55)), None)])

    ms.append(nodo("MOT-SPIEDO", caja(MOT["cuerpo"],
                   pos=(x_ala_motor + E3 + MOT["cuerpo"][0] / 2, 0, A["z_espeton"]),
                   color=COLOR["motor"])))
    ms.append(cilindro(30, 22, pos=(x_ala_motor, 0, A["z_espeton"]), eje=(1, 0, 0),
                       color=COLOR["motor"]))
    registrar("MOT-SPIEDO", "Motor de spiedo 220 V / 40 W / 2,5 rpm, eje Ø8", 1,
              "comprado", "comprado", 2.2, familia="comprados",
              nota="[web] asadoresnewen.cl — 80 kg de capacidad; el diseño pide 15 kg")

    L_ESP = x_ala_motor - 6 - (-LT / 2 - 55)
    ms.append(nodo("ESP-ESPETON", barra_cuadrada(L_ESP, ESP["seccion"],
                   pos=((x_ala_motor - 6 - LT / 2 - 55) / 2, 0, A["z_espeton"]), eje=(1, 0, 0))))
    registrar("ESP-ESPETON", f"Espetón — barra cuadrada 12x12 inox, {L_ESP:.0f} mm", 1,
              "acero al carbono 12x12 (se cura; inox es opción)", "corte a medida + acople",
              144 * L_ESP * RHO["acero"], familia="comprados")
    for sx in (-1, 1):
        hub = caja((26, 30, 30), pos=(sx * 150, 0, A["z_espeton"]), color=COLOR["inox"])
        ms.append(hub)
        for a in (0, 2 * math.pi / 3, 4 * math.pi / 3):
            ms.append(cilindro(6, 130, pos=(sx * 150 - sx * 13, 12 * math.cos(a),
                               A["z_espeton"] + 12 * math.sin(a)), eje=(-sx, 0, 0),
                               color=COLOR["inox"], secs=8))
    registrar("ESP-HORQUILLA", "Horquilla del espetón (3 puntas, prisionero M6)", 2,
              "acero al carbono", "comprado", 0.25, familia="comprados")
    registrar("ESP-BUJE", "Buje de bronce Ø12/Ø16 x 10 (chumacera del espetón)", 2,
              "bronce SAE 64", "comprado", 0.02, familia="comprados")

    # --- tiros --------------------------------------------------------------
    # tiros: entrada de aire abajo (cuba) y salida arriba (tapa), los 4 en las
    # testas PLANAS del tambor — asiento perfecto, sin fugas por curvatura
    Z_TIRO_IN, Z_TIRO_OUT = 690.0, ZC + 180.0
    chapa_al_conjunto(tiro_chapa(), [
        (marco((0, 1, 0), (0, 0, 1), (sx * (LT / 2 + E2), 0, z)), None)
        for z in (Z_TIRO_IN, Z_TIRO_OUT) for sx in (-1, 1)])

    # --- madera de roble ----------------------------------------------------
    e_mad = MAD["espesor_tabla"]
    x_mesa = -POSTE_X - 15.0
    mesa = caja((MAD["mesa"][1], MAD["mesa"][0], e_mad),
                pos=(x_mesa, 0, L_POSTE + E3 + e_mad / 2), color=COLOR["roble"])
    ms.append(nodo("MAD-MESA", mesa))
    registrar("MAD-MESA", f"Mesa de la testa — roble macizo {MAD['mesa'][0]:.0f}x{MAD['mesa'][1]:.0f}x{e_mad:.0f}",
              1, f"roble macizo e{e_mad:.0f}", "corte + canteado + aceite", masa_mesh(mesa, RHO["roble"]),
              familia="madera", nota="Va en la TESTA, fuera del alcance del cocinero (no estorba el frente)")
    est = caja((MAD["estante"][1], MAD["estante"][0], e_mad),
               pos=(0, 0, A["z_larguero_inf"] + e_mad / 2), color=COLOR["roble"])
    ms.append(nodo("MAD-ESTANTE", est))
    registrar("MAD-ESTANTE", f"Estante inferior — roble {MAD['estante'][0]:.0f}x{MAD['estante'][1]:.0f}x{e_mad:.0f}",
              1, f"roble macizo e{e_mad:.0f}", "corte + canteado + aceite",
              masa_mesh(est, RHO["roble"]), familia="madera",
              nota="Una sola tabla y 19 mm: el roble es el material más caro por kg del producto")

    chapa_al_conjunto(cabezal_mesa_chapa(), [       # cabezal ENTRE poste y madera
        (marco((1, 0, 0), (0, 1, 0), (-POSTE_X - 110, sy * PY - 40, L_POSTE)), None)
        for sy in (-1, 1)])

    z_tapa_top = ZC + R
    ch_asa = asa_soporte_chapa()
    col_asa = []
    # asa de roble de la tapa: montantes simétricos a x = ±105
    col_asa.append((marco((1, 0, 0), (0, 1, 0), (-195.0, -17, z_tapa_top)), None))
    col_asa.append((marco((-1, 0, 0), (0, 1, 0), (195.0, -17, z_tapa_top)), None))
    # barra frontal: pie sobre la cara delantera del larguero, montante horizontal
    for sx in (-1, 1):
        col_asa.append((marco((-1, 0, 0), (0, 0, -1),
                              (sx * PX + 45, -(LARG_Y + TB / 2), Z_LARG_S + 17)), None))
    chapa_al_conjunto(ch_asa, col_asa)

    asa = caja((MAD["asa_tapa"], MAD["escuadria_asa"], MAD["escuadria_asa"]),
               pos=(0, 0, z_tapa_top + 95 + E3 + MAD["escuadria_asa"] / 2), color=COLOR["roble"])
    ms.append(nodo("MAD-ASA", asa))
    registrar("MAD-ASA", f"Asa de la tapa — roble {MAD['escuadria_asa']:.0f}x{MAD['escuadria_asa']:.0f}x{MAD['asa_tapa']:.0f}",
              1, "roble macizo", "corte + redondeo + aceite", masa_mesh(asa, RHO["roble"]),
              familia="madera")
    y_barra = -(LARG_Y + TB / 2) - 80.0
    z_barra = Z_LARG_S + 17 - 34 + E3 + MAD["escuadria_asa"] / 2
    barra = caja((MAD["barra"], MAD["escuadria_asa"], MAD["escuadria_asa"]),
                 pos=(0, y_barra, z_barra), color=COLOR["roble"])
    ms.append(nodo("MAD-BARRA", barra))
    registrar("MAD-BARRA", f"Barra frontal (maniobra / utensilios) — roble {MAD['escuadria_asa']:.0f}x{MAD['escuadria_asa']:.0f}x{MAD['barra']:.0f}",
              1, "roble macizo", "corte + redondeo + aceite", masa_mesh(barra, RHO["roble"]),
              familia="madera", nota="Para maniobrar la parrilla y colgar utensilios; rigidiza el frente")

    # --- niveladores y tornillería de tambor --------------------------------
    for sx in (-1, 1):
        for sy in (-1, 1):
            ms.append(cilindro(50, 12, pos=(sx * PX, sy * PY, 6), color=COLOR["tornillo"]))
    for sy in (-1, 1):
        ms.append(cilindro(50, 12, pos=(-POSTE_X, sy * PY, 6), color=COLOR["tornillo"]))
    registrar("NIV-PATA", "Nivelador M10 con base Ø50 (regulable)", 6, "acero + nylon",
              "comprado", 0.09, familia="tornillería")
    n_m8_bastidor = next(p["cantidad"] for p in PIEZAS if p["codigo"] == "TOR-M8x60")
    m8 = FIJACIONES.get("M8", 0) + n_m8_bastidor + 2       # + 2 pasadores de bisagra
    for p in PIEZAS:
        if p["codigo"] == "TOR-M8x60":
            p["cantidad"], p["masa_total_kg"] = m8, round(p["masa_kg"] * m8, 3)
            p["nombre"] = "Perno M8 + golilla (bastidor, cunas, tiros, mesa y pasadores)"
    registrar("TOR-M6", "Perno M6 + golilla ancha + tuerca de brida serrada (chapa/tambor)",
              FIJACIONES.get("M6", 0), "acero zincado 8.8", "comprado", 0.012,
              familia="tornillería",
              nota="Golilla ancha del lado del tambor: reparte sobre la chapa de 1,1 mm")
    registrar("TOR-M5", "Perno M5 x 16 + tuerca de brida (perfiles de canto)",
              FIJACIONES.get("M5", 0), "acero zincado", "comprado", 0.007, familia="tornillería")
    registrar("TIR-MADERA", "Tirafondo 5x40 cabeza plana (madera desde abajo)",
              FIJACIONES.get("tirafondo", 0), "acero zincado", "comprado", 0.008,
              familia="tornillería",
              nota="Toda la madera se fija DESDE ABAJO: cara superior sin tornillos a la vista")
    return ms


# ---------------------------------------------------------------------------
# 11. Salidas
# ---------------------------------------------------------------------------

CAPAS_DXF = {
    "CORTE": (1, "CONTINUOUS", 50),      # lo que corta el láser
    "PLIEGUE": (5, "DASHDOT", 25),       # eje de plegado (referencia, NO se corta)
    "TANGENTE": (8, "DASHED", 13),       # tangentes de la zona de pliegue
    "TEXTO": (7, "CONTINUOUS", 25),
}


def dxf_desarrollo(ch: Chapa, path: Path) -> dict:
    """DXF del desarrollo plano a ESCALA REAL (1 unidad = 1 mm) para el láser."""
    import ezdxf
    doc = ezdxf.new("R2018", setup=True)
    doc.header["$INSUNITS"] = 4
    for nom, (aci, lt, lw) in CAPAS_DXF.items():
        doc.layers.add(nom, color=aci, linetype=lt, lineweight=lw)
    msp = doc.modelspace()
    des = ch.desarrollo()
    poly = des["contorno"]
    msp.add_lwpolyline(list(poly.exterior.coords), close=True, dxfattribs={"layer": "CORTE"})
    for anillo in poly.interiors:
        msp.add_lwpolyline(list(anillo.coords), close=True, dxfattribs={"layer": "CORTE"})
    for pl in des["pliegues"]:
        msp.add_line(pl["eje"][0], pl["eje"][1], dxfattribs={"layer": "PLIEGUE"})
        for tg in pl["tangentes"]:
            msp.add_line(tg[0], tg[1], dxfattribs={"layer": "TANGENTE"})
        mx = (pl["eje"][0][0] + pl["eje"][1][0]) / 2
        my = (pl["eje"][0][1] + pl["eje"][1][1]) / 2
        msp.add_text(f"PLEGAR {pl['sentido']} {pl['angulo']:g}deg R{pl['radio']:g}"
                     f"  (BA {pl['ba']:.2f})",
                     height=5, dxfattribs={"layer": "TEXTO"}).set_placement((mx, my + 3))
    minx, miny, maxx, maxy = poly.bounds
    met = ch.metricas()
    txt = (f"{met['codigo']} — {met['nombre']}  |  x{met['cantidad']}  |  "
           f"acero e{met['espesor']:g}  |  desarrollo {met['desarrollo_mm'][0]:g} x "
           f"{met['desarrollo_mm'][1]:g}  |  {met['pliegues']} pliegue(s), "
           f"{met['agujeros']} agujero(s)  |  masa {met['masa_kg']:.3f} kg c/u")
    msp.add_text(txt, height=7, dxfattribs={"layer": "TEXTO"}).set_placement((minx, miny - 18))
    msp.add_text("Escala real 1:1 (1 unidad = 1 mm). Capa CORTE = trayectoria del laser. "
                 "Capa PLIEGUE/TANGENTE = referencia de plegado, NO se corta. "
                 "Factor K 0.38, radio interior = espesor. Vista desde la cara EXTERIOR.",
                 height=4.5, dxfattribs={"layer": "TEXTO"}).set_placement((minx, miny - 30))
    path.parent.mkdir(parents=True, exist_ok=True)
    doc.saveas(path)
    return {"dxf": str(path.relative_to(PROJ)), "bounds": [round(maxx - minx, 1), round(maxy - miny, 1)]}


def escribir_bom(path: Path) -> None:
    import csv
    campos = ["codigo", "nombre", "familia", "cantidad", "material", "proceso",
              "largo_mm", "desarrollo_mm", "espesor_mm", "pliegues", "agujeros",
              "largo_corte_mm", "masa_kg", "masa_total_kg", "nota"]
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore", delimiter=";")
        w.writeheader()
        for p in PIEZAS:
            r = dict(p)
            if isinstance(r.get("desarrollo_mm"), list):
                r["desarrollo_mm"] = " x ".join(f"{v:g}" for v in r["desarrollo_mm"])
            w.writerow(r)


def main(argv):
    out = PROJ / "out"
    (out / "cad" / "piezas").mkdir(parents=True, exist_ok=True)
    (out / "drawings").mkdir(parents=True, exist_ok=True)

    print("Construyendo el conjunto…")
    conjunto()

    escena = trimesh.Scene()
    for nom, m in NODOS:
        escena.add_geometry(m, node_name=nom, geom_name=nom)
    glb = out / "cad" / "parrilla_tambor.glb"
    # include_normals: sin normales el GLB se ve plano/negro en cualquier visor
    glb.write_bytes(trimesh.exchange.gltf.export_glb(escena, include_normals=True))
    total = trimesh.util.concatenate([m for _, m in NODOS])
    total.export(out / "cad" / "parrilla_tambor.stl")
    bb = total.bounds
    print(f"  conjunto: {len(NODOS)} nodos, {len(total.faces)} triángulos, "
          f"envolvente {np.round(bb[1] - bb[0], 1).tolist()} mm")

    print("Desarrollos de corte láser…")
    for cod, ch in CHAPAS.items():
        info = dxf_desarrollo(ch, out / "drawings" / f"desarrollo_{cod}.dxf")
        sol = ch.solido()
        sol.export(out / "cad" / "piezas" / f"{cod}.stl")
        (out / "cad" / "piezas" / f"{cod}.glb").write_bytes(
            trimesh.exchange.gltf.export_glb(trimesh.Scene(sol), include_normals=True))
        print(f"  {cod:<12} desarrollo {info['bounds'][0]:>7.1f} x {info['bounds'][1]:>6.1f} mm")

    print("Utillaje de taladrado…")
    info = plantilla_testa_dxf(out / "drawings" / "plantilla_PLA-TESTA.dxf")
    print(f"  PLA-TESTA    {info['agujeros']} agujeros en la testa (se taladra antes de cortar)")
    pv = plantilla_virola_chapa()
    dxf_desarrollo(pv, out / "drawings" / "desarrollo_PLA-VIROLA.dxf")
    mv = pv.metricas()
    registrar(mv["codigo"], mv["nombre"], 1, f"chapa de acero e{mv['espesor']:g}",
              mv["proceso"], mv["masa_kg"], familia="utillaje",
              extra={"desarrollo_mm": mv["desarrollo_mm"], "pliegues": mv["pliegues"],
                     "agujeros": mv["agujeros"], "largo_corte_mm": mv["largo_corte_mm"],
                     "area_mm2": mv["area_mm2"]}, nota=mv["nota"])
    print(f"  PLA-VIROLA   desarrollo {mv['desarrollo_mm'][0]:.1f} x {mv['desarrollo_mm'][1]:.1f} mm")

    escribir_bom(out / "BOM.csv")

    resumen = {
        "generado": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc).isoformat(timespec="seconds"),
        "envolvente_mm": np.round(bb[1] - bb[0], 1).tolist(),
        "altura_trabajo_mm": ZC,
        "superficie_parrilla_m2": round(2 * GRI_X * GRI_L / 1e6, 3),
        "masa_total_kg": round(sum(p["masa_total_kg"] for p in PIEZAS
                                  if p["familia"] != "utillaje"), 1),
        "masas_por_familia_kg": {},
        "piezas_unicas": len({p["codigo"] for p in PIEZAS}),
        "piezas_totales": sum(p["cantidad"] for p in PIEZAS),
        "chapa": {},
        "triangulos": int(len(total.faces)),
    }
    for p in PIEZAS:
        fam = p["familia"] or "otros"
        resumen["masas_por_familia_kg"][fam] = round(
            resumen["masas_por_familia_kg"].get(fam, 0) + p["masa_total_kg"], 2)
    for e in (E3, E2):
        sel = [p for p in PIEZAS if p.get("desarrollo_mm")
               and p["material"].endswith(f"e{e:g}") and p["familia"] != "utillaje"]
        area = sum(p["area_mm2"] * p["cantidad"] for p in sel)
        bruta = sum(p["desarrollo_mm"][0] * p["desarrollo_mm"][1] * p["cantidad"] for p in sel)
        resumen["chapa"][f"e{e:g}"] = {
            "piezas": len(sel), "unidades": sum(p["cantidad"] for p in sel),
            "area_neta_m2": round(area / 1e6, 3),
            "area_bruta_m2": round(bruta / 1e6, 3),
            "largo_corte_m": round(sum(p["largo_corte_mm"] * p["cantidad"] for p in sel) / 1000, 1),
            "masa_kg": round(sum(p["masa_total_kg"] for p in sel), 2)}
    (out / "resumen.json").write_text(json.dumps(resumen, indent=2, ensure_ascii=False),
                                      encoding="utf-8")
    print(json.dumps(resumen, indent=2, ensure_ascii=False))
    return resumen


if __name__ == "__main__":
    main(sys.argv[1:])
