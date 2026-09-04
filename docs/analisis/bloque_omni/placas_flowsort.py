# Placas de soporte del bloque OMNI — ESTILO FLOWSORT (v7)
#
# Sergio: "placas de soporte quiero con estilo, revisa modelo pdf que te pase
# de flowsort". Hasta la v6 mis placas eran rectangulos pelados con ranuras
# genericas. Este archivo aplica el LENGUAJE DE CHAPA leido de las laminas de
# despiece del manual SLD/DLD 24V (pag. 22, 23 y 24 — §6.6.3/6.6.4/6.6.5):
#
#   M1. NADA de ranuras rectangulares: TODA ranura es COLISA de extremos
#       redondos (r = ancho/2). Relacion largo/ancho 4.5-5 en las de ajuste.
#   M2. Las colisas van en COLUMNAS/HILERAS de paso constante, no sueltas.
#   M3. Ajuste: colisas VERTICALES donde se regula altura, colisas EN Y donde
#       se regula profundidad. Flowsort pone DOS por punto de fijacion.
#   M4. Toda placa lleva ALAS PLEGADAS a 90 grados (12-20 mm) en los cantos
#       libres: rigidiza y da la cara donde atornillar la tapa.
#   M5. Contornos con RADIO DE ESQUINA (R8/R10), nunca vivos.
#   M6. VENTANAS DE ALIGERAMIENTO obround en las bandas sin funcion.
#   M7. Agujeros de CANCAMO (M10) en los extremos para izar el modulo.
#   M8. Tapas con LAMAS de ventilacion (hileras de colisas finas).
#   M9. PASACABLES redondos O34 en la placa base ("put all cables through the
#       holes in the bottom plate", pag. 24 paso 7).
#
# Tornilleria del manual: M5x16 socket head + arandela grower en los grupos
# motrices, M5x12 hexagonal en la tapa inferior, M5x10 avellanado en la tapa
# superior. Se respeta.

import cadquery as cq
from math import cos, radians, sqrt, hypot
import os
from shapely.geometry import box as sbox, Point
from shapely.ops import unary_union

import tren_motriz as tm

OUT = os.path.dirname(os.path.abspath(__file__))

# ---------------- geometria base del modulo ----------------
PASO, NEJES = 74.75, 8
L_ZONA = PASO * NEJES                      # 598
X_EJES = [(k - (NEJES - 1) / 2) * PASO for k in range(NEJES)]
X_MED = [(X_EJES[i] + X_EJES[i + 1]) / 2 for i in range(NEJES - 1)]
mano = lambda k: 'der' if k % 2 == 0 else 'izq'
KS = {h: [k for k in range(NEJES) if mano(k) == h] for h in ('der', 'izq')}

Z_RODAD, R_ENV, W2 = 115.1, 32.0, 18.3
Z_EJE = Z_RODAD - R_ENV                    # 83.1
SOBRE_TAPA, TAPA_T = 5.0, 3.0
Z_TAPA_BOT = Z_RODAD - SOBRE_TAPA - TAPA_T # 107.1
Y_RUEDAS = [-39.0, 39.0, 117.0, 195.0]
Y_RUEDA_N, Y_RUEDA_P = Y_RUEDAS[0] - W2, Y_RUEDAS[-1] + W2   # -57.3 .. 213.3

RAIL_T = 4.0
Y_RAIL_N, Y_RAIL_P = -116.0, 218.0
Y_RAIL_EXT, Y_RAIL_INT = Y_RAIL_N - RAIL_T / 2, Y_RAIL_N + RAIL_T / 2  # -118/-114
RAIL_Z0, RAIL_Z1 = -46.0, Z_TAPA_BOT
RAIL_LX = 604.0

Z_BASE0, Z_BASE1 = -72.6, -68.6            # placa base de 4 mm
BASE_YN, BASE_YP = -154.0, 224.0
BASE_LX = 604.0
X_TRAV = (-180.0, 180.0)
Z_PESTANA = -78.6                          # pestana inferior del ZP2026
CARA_INT = 266.8                           # semiancho interior del conveyor

ZM = -8.6                                  # altura del eje de los motores
X_MOTOR = {'der': -149.5, 'izq': 149.5}    # paso intermedio: no pisan ejes
MOT_PLACA_T = 8.0                          # cuna trasera del motor (Flowsort)
SEP_OD = 20.0

# ---------------- M1-M5: primitivas del lenguaje de chapa ----------------
COL_W, COL_L = 6.6, 30.0        # colisa de ajuste M6  (relacion 4.5)
COL5_W = 5.5                    # colisa de fijacion M5
BORDE_R = 8.0                   # M5 radio de esquina
ALA = 18.0                      # M4 ala plegada
VENT_W, VENT_L = 22.0, 52.0     # M6 ventana de aligeramiento
LAMA_W, LAMA_L, LAMA_P = 4.5, 62.0, 9.0    # M8 lama de ventilacion
GROMMET_D = 34.0                # M9 pasacables


def rrect(plano, w, h, r):
    """M5: contorno rectangular con esquinas redondeadas."""
    p = sbox(-w / 2, -h / 2, w / 2, h / 2).buffer(-r).buffer(r, quad_segs=16)
    return cq.Workplane(plano).polyline(list(p.exterior.coords)[:-1]).close()


def colisa(plano, w, l, ang=0):
    """M1: LA ranura del Flowsort — extremos completamente redondos."""
    return cq.Workplane(plano).slot2D(l, w, ang)


# ---------------- trazado de la correa y de los tensores ----------------
IDLER_D, IDLER_W = 24.0, 12.0


def envolvente(h):
    """Linea primitiva de la correa de la familia h: envolvente convexa de las
    4 poleas de eje + la del motor (todas giran en el mismo sentido)."""
    c = [(X_EJES[k], Z_EJE, tm.POL_DP / 2) for k in KS[h]]
    c += [(X_MOTOR[h], ZM, tm.POL_DP / 2)]
    return unary_union([Point(x, z).buffer(r, quad_segs=72) for x, z, r in c]).convex_hull


def tensores(h):
    """Dos tensores por familia, en los DOS RAMALES INCLINADOS (nunca en el
    ramal de arrastre): tangentes por fuera de la correa, con colisa vertical
    en el riel para dar/quitar tension como en el Flowsort (§6.7)."""
    hull = envolvente(h)
    cs = list(hull.exterior.coords)
    cen = hull.centroid
    cand = []
    for a, b in zip(cs[:-1], cs[1:]):
        L = hypot(b[0] - a[0], b[1] - a[1])
        if L < 40:
            continue
        if (a[1] + b[1]) / 2 > Z_EJE:
            continue                     # ramal de arrastre: ahi no va tensor
        cand.append((L, a, b))
    cand.sort(reverse=True)
    out = []
    ocupado = X_EJES + [x for x in X_MED if abs(abs(x) - 149.5) > 1]
    for L, a, b in cand[:2]:
        nx, nz = (b[1] - a[1]) / L, -(b[0] - a[0]) / L
        mx0, mz0 = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        if (mx0 + nx - cen.x) ** 2 + (mz0 + nz - cen.y) ** 2 < \
           (mx0 - nx - cen.x) ** 2 + (mz0 - nz - cen.y) ** 2:
            nx, nz = -nx, -nz
        d = 2.5 + IDLER_D / 2
        mejor = None
        for i in range(41):                      # buscar el punto del ramal
            t = 0.25 + 0.5 * i / 40              # que mas se aleja de todo
            px = a[0] + t * (b[0] - a[0]) + nx * d
            pz = a[1] + t * (b[1] - a[1]) + nz * d
            if not (RAIL_Z0 + 22 < pz < Z_EJE - 24):
                continue
            hueco = min(abs(px - q) for q in ocupado)
            if mejor is None or hueco > mejor[0]:
                mejor = (hueco, px, pz)
        out.append((mejor[1], mejor[2]))
    return out


TENSORES = {h: tensores(h) for h in ('der', 'izq')}


# ---------------- 1. RIEL PRINCIPAL (2x, la misma pieza) ----------------
def riel(sy):
    """Riel de 4 mm en estilo Flowsort: hilera de alojamientos O21 del F6801,
    estacion de motor (piloto O39.2 + patron 50x50 en colisas verticales),
    columnas de colisas de ajuste de altura, ventanas de aligeramiento y ala
    superior plegada donde atornilla la tapa.

    Los dos rieles son LA MISMA PIEZA: el patron es simetrico respecto de x=0
    (las DOS estaciones de motor existen en ambos rieles aunque solo se usen
    las del riel cercano), asi que el riel lejano es el cercano girado 180
    grados sobre Z."""
    yc = Y_RAIL_N if sy < 0 else Y_RAIL_P
    y0 = yc - RAIL_T / 2
    h = RAIL_Z1 - RAIL_Z0
    zc = (RAIL_Z0 + RAIL_Z1) / 2
    fuera = -1 if sy < 0 else 1            # hacia donde pliega el ala

    s = (rrect("XZ", RAIL_LX, h, BORDE_R).extrude(RAIL_T)
         .translate((0, y0 + RAIL_T, zc)))

    for x in X_EJES:                        # alojamientos del F6801
        s = s.cut(cq.Workplane("XZ").circle(21.0 / 2).extrude(40)
                  .translate((x, y0 + 20, Z_EJE)))

    # estacion de motor: piloto + 4 colisas VERTICALES (M3: altura del eje)
    for xm in (X_MOTOR['der'], X_MOTOR['izq']):
        s = s.cut(cq.Workplane("XZ").circle(39.2 / 2).extrude(40)
                  .translate((xm, y0 + 20, ZM)))
        for dx in (-25.0, 25.0):
            for dz in (-25.0, 25.0):
                s = s.cut(colisa("XZ", COL5_W, 14.0, 90).extrude(40)
                          .translate((xm + dx, y0 + 20, ZM + dz)))

    # M2/M3: columnas de 2 colisas verticales = fijacion a las escuadras con
    # AJUSTE DE ALTURA (asi se cuadra el nivel de rodadura con el ZP2026)
    for x in X_MED:
        if min(abs(x - X_MOTOR['der']), abs(x - X_MOTOR['izq'])) < 60:
            continue
        for z in (-24.0, 6.0):
            s = s.cut(colisa("XZ", COL_W, 24.0, 90).extrude(40)
                      .translate((x, y0 + 20, z)))

    # M6: dos hileras de ventanas de aligeramiento (paso constante, como en
    # la placa base del Flowsort): una entre rodamientos y colisas, otra baja
    for x in X_MED:
        s = s.cut(colisa("XZ", VENT_W, VENT_L, 0).extrude(40)
                  .translate((x, y0 + 20, 45.0)))
    for x in X_EJES:
        if min(abs(x - X_MOTOR['der']), abs(x - X_MOTOR['izq'])) < 46:
            continue
        s = s.cut(colisa("XZ", 16.0, 40.0, 0).extrude(40)
                  .translate((x, y0 + 20, -34.0)))

    # colisas verticales de los TENSORES (dar/quitar tension a la correa)
    for h in ('der', 'izq'):
        for xt, zt in TENSORES[h]:
            if min(abs(xt - x) for x in X_EJES) < 16 and abs(zt - Z_EJE) < 22:
                continue
            s = s.cut(colisa("XZ", 8.5, 32.0, 90).extrude(40)
                      .translate((xt, y0 + 20, zt)))

    # M4: ala superior plegada hacia fuera + M5 de la tapa + M7 cancamos
    ya = yc + fuera * (RAIL_T / 2 + ALA / 2)
    ala = (rrect("XY", RAIL_LX, ALA, 4.0).extrude(RAIL_T)
           .translate((0, ya, RAIL_Z1 - RAIL_T)))
    for x in [-258 + i * 86 for i in range(7)]:
        ala = ala.cut(cq.Workplane("XY").circle(2.6).extrude(20)
                      .translate((x, ya, RAIL_Z1 - RAIL_T - 1)))
    for x in (-284.0, 284.0):
        ala = ala.cut(cq.Workplane("XY").circle(5.5).extrude(20)
                      .translate((x, ya, RAIL_Z1 - RAIL_T - 1)))
    return s.union(ala)


# ---------------- 2. ESCUADRA riel <-> base (10x, la misma pieza) --------
X_ESC = [x for x in X_MED
         if min(abs(x - X_MOTOR['der']), abs(x - X_MOTOR['izq'])) >= 60]


def y_pie_escuadra(sy):
    yc = Y_RAIL_N if sy < 0 else Y_RAIL_P
    return yc + (1 if sy < 0 else -1) * (RAIL_T / 2 + 30.0)


def escuadra(x, sy):
    """L de 4 mm: ala vertical contra la cara interior del riel (los M6 pasan
    por las colisas verticales -> AJUSTE DE ALTURA) y ala horizontal sobre la
    placa base con colisas en Y (-> AJUSTE DE PROFUNDIDAD)."""
    yc = Y_RAIL_N if sy < 0 else Y_RAIL_P
    dentro = 1 if sy < 0 else -1
    t = 4.0
    y_v = yc + dentro * (RAIL_T / 2 + t / 2)
    zv0, zv1 = Z_BASE1, 22.0
    v = (rrect("XZ", 56.0, zv1 - zv0, 6.0).extrude(t)
         .translate((x, y_v + t / 2, (zv0 + zv1) / 2)))
    for z in (-24.0, 6.0):
        v = v.cut(cq.Workplane("XZ").circle(3.3).extrude(20)
                  .translate((x, y_v + 10, z)))
    v = v.cut(colisa("XZ", 16.0, 30.0, 0).extrude(20)      # M6 aligeramiento
              .translate((x, y_v + 10, -52.0)))
    y_h = y_pie_escuadra(sy)
    hpl = (rrect("XY", 56.0, 60.0, 6.0).extrude(t)
           .translate((x, y_h, Z_BASE1)))
    for dx in (-18.0, 18.0):
        hpl = hpl.cut(colisa("XY", COL_W, 26.0, 90).extrude(20)
                      .translate((x + dx, y_h, Z_BASE1 - 1)))
    return v.union(hpl)


# ---------------- 3. PLACA BASE ----------------
Y_BASE_TRAV = (-150.0, -60.0, 30.0, 120.0, 205.0)


def placa_base():
    """Placa base de 4 mm: contorno R10, alas plegadas en los dos cantos
    largos, colisas sobre los travesanos (ajuste longitudinal), agujeros de
    las escuadras, ventanas de aligeramiento, pasacables O34 y cancamos."""
    ly = BASE_YP - BASE_YN
    yc = (BASE_YN + BASE_YP) / 2
    s = (rrect("XY", BASE_LX, ly, 10.0).extrude(Z_BASE1 - Z_BASE0)
         .translate((0, yc, Z_BASE0)))
    for xt in X_TRAV:
        for y in Y_BASE_TRAV:
            s = s.cut(colisa("XY", 9.0, 28.0, 0).extrude(20)
                      .translate((xt, y, Z_BASE0 - 1)))
    for sy in (-1, 1):
        y_h = y_pie_escuadra(sy)
        for x in X_ESC:
            for dx in (-18.0, 18.0):
                s = s.cut(cq.Workplane("XY").circle(3.3).extrude(20)
                          .translate((x + dx, y_h, Z_BASE0 - 1)))
    for x in [-240 + i * 80 for i in range(7)]:
        for y in (-10.0, 70.0, 150.0):
            if any(abs(x - xt) < 45 for xt in X_TRAV):
                continue
            s = s.cut(colisa("XY", VENT_W, VENT_L, 90).extrude(20)
                      .translate((x, y, Z_BASE0 - 1)))
    for x in (X_MOTOR['der'] - 62, X_MOTOR['izq'] + 62):
        s = s.cut(cq.Workplane("XY").circle(GROMMET_D / 2).extrude(20)
                  .translate((x, -140.0, Z_BASE0 - 1)))
    for x in (-278.0, 278.0):
        for y in (-152.0, 208.0):
            s = s.cut(cq.Workplane("XY").circle(5.5).extrude(20)
                      .translate((x, y, Z_BASE0 - 1)))
    for y, d in ((BASE_YN, 1), (BASE_YP, -1)):
        s = s.union(rrect("XZ", BASE_LX, 20.0, 4.0).extrude(4.0)
                    .translate((0, y + d * 4.0, Z_BASE0 - 10.0)))
    return s


# ---------------- 4. CUNA DEL MOTOR, 8 mm (2x) ----------------
# la cuna abraza el CUERPO del motor a media altura, por delante del conector
# del encoder (que sale por abajo entre y=-38 y y=-6, medido del STEP oficial)
Y_CUNA = -64.0


def cuna_motor(h):
    """Placa de 8 mm 'tipo Flowsort' del motor a la base: silla O53 que toma
    la cola del NEMA 24 (voladizo de ~1.3 kg), ventanas de aligeramiento y
    pie plegado con colisas de ajuste sobre la placa base."""
    xm = X_MOTOR[h]
    zv0, zv1 = Z_BASE1, 47.0
    s = (rrect("XZ", 120.0, zv1 - zv0, 10.0).extrude(MOT_PLACA_T)
         .translate((xm, Y_CUNA + MOT_PLACA_T, (zv0 + zv1) / 2)))
    # silla: cuadrado 61 con esquinas R6 (el cuerpo del NEMA 24 es 60x60) mas
    # el paso del conector del encoder por debajo
    s = s.cut(rrect("XZ", 61.0, 61.0, 6.0).extrude(30)
              .translate((xm, Y_CUNA + 20, ZM)))
    s = s.cut(colisa("XZ", 26.0, 40.0, 90).extrude(30)
              .translate((xm, Y_CUNA + 20, ZM - 34.0)))
    for dx in (-44.0, 44.0):
        s = s.cut(colisa("XZ", 16.0, 44.0, 90).extrude(30)
                  .translate((xm + dx, Y_CUNA + 20, ZM + 4.0)))
    pie = (rrect("XY", 120.0, 44.0, 8.0).extrude(MOT_PLACA_T)
           .translate((xm, Y_CUNA + 22.0, Z_BASE1)))
    for dx in (-46.0, 0.0, 46.0):
        pie = pie.cut(colisa("XY", COL_W, 26.0, 90).extrude(20)
                      .translate((xm + dx, Y_CUNA + 22.0, Z_BASE1 - 1)))
    return s.union(pie)


# ---------------- 5. TRAVESANO en U (2x) ----------------
def travesano(xt):
    """Perfil en U de 4 mm que apoya en las pestanas inferiores del ZP2026.
    Alma arriba (recibe la placa base), dos alas hacia abajo, colisas EN Y en
    los apoyos (ajuste de profundidad) y aligeramiento redondo."""
    ly = 2 * (CARA_INT + 12.0)
    s = (rrect("XY", 60.0, ly, 8.0).extrude(4.0)
         .translate((xt, 0, Z_PESTANA + 2.0)))
    for d in (-1, 1):
        s = s.union(rrect("YZ", ly, 26.0, 5.0).extrude(4.0)
                    .translate((xt + d * 28.0, 0, Z_PESTANA - 11.0)))
    for sy in (-1, 1):
        s = s.cut(colisa("XY", 9.0, 30.0, 90).extrude(20)
                  .translate((xt, sy * (CARA_INT + 2.0), Z_PESTANA)))
    for y in Y_BASE_TRAV:
        s = s.cut(cq.Workplane("XY").circle(4.3).extrude(20)
                  .translate((xt, y, Z_PESTANA)))
    for y in [-230 + i * 65 for i in range(8)]:
        if min(abs(y - yy) for yy in Y_BASE_TRAV) < 28:
            continue
        if abs(y) > CARA_INT - 20:
            continue
        s = s.cut(cq.Workplane("XY").circle(11.0).extrude(20)
                  .translate((xt, y, Z_PESTANA)))
    return s


# ---------------- 6. TAPA SUPERIOR ----------------
def tapa_superior():
    """Tapa de 3 mm: ventana obround por rueda (corte minimo), M5x10
    avellanados sobre el ala de los rieles y lamas de ventilacion en la banda
    ciega. Llega hasta la cara interior del conveyor."""
    dz = Z_RODAD - Z_TAPA_BOT
    semix = sqrt(R_ENV ** 2 - (R_ENV - dz) ** 2)
    vx, vy = 2 * semix + 4.0, 2 * W2 + 4.0
    yn, yp = -140.0, 266.0
    s = (rrect("XY", RAIL_LX, yp - yn, 10.0).extrude(TAPA_T)
         .translate((0, (yn + yp) / 2, Z_TAPA_BOT)))
    s = s.union(rrect("XZ", RAIL_LX, 12.0, 4.0).extrude(3.0)
                .translate((0, yp - 1.5, Z_TAPA_BOT - 4.5)))
    for x in X_EJES:
        for y in Y_RUEDAS:
            s = s.cut(colisa("XY", vy, vx, 0).extrude(20)
                      .translate((x, y, Z_TAPA_BOT - 1)))
    for x in [-258 + i * 86 for i in range(7)]:
        for y in (Y_RAIL_N - RAIL_T / 2 - ALA / 2,
                  Y_RAIL_P + RAIL_T / 2 + ALA / 2):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(20)
                      .translate((x, y, Z_TAPA_BOT - 1)))
    for i in range(6):
        for x in (-200.0, 0.0, 200.0):
            s = s.cut(colisa("XY", LAMA_W, LAMA_L, 0).extrude(20)
                      .translate((x, 240.0 + (i - 3) * LAMA_P, Z_TAPA_BOT - 1)))
    return s, vx, vy


# ---------------- 7. TAPA CIEGA MODULAR (2x) ----------------
def tapa_ciega(i):
    """Tapa ciega de la zona muerta (el lado ancho): misma chapa de 3 mm,
    contorno R10, lamas de ventilacion y ala de canto. Es modular: dos por
    modulo, se quitan sin tocar la tapa de ruedas."""
    xc = -149.0 + i * 298.0
    z0 = Z_TAPA_BOT
    yn, yp = -266.0, -140.0      # de la cara interior del ZP2026 al modulo
    s = (rrect("XY", 294.0, yp - yn, 10.0).extrude(TAPA_T)
         .translate((xc, (yn + yp) / 2, z0)))
    s = s.union(rrect("XZ", 294.0, 12.0, 4.0).extrude(3.0)
                .translate((xc, yn + 1.5, z0 - 4.5)))
    for j in range(9):
        for x in (xc - 90.0, xc, xc + 90.0):
            s = s.cut(colisa("XY", LAMA_W, LAMA_L, 0).extrude(20)
                      .translate((x, -240.0 + j * LAMA_P, z0 - 1)))
    for dx in (-110.0, 0.0, 110.0):
        for y in (-146.0, -260.0):
            s = s.cut(cq.Workplane("XY").circle(2.6).extrude(20)
                      .translate((xc + dx, y, z0 - 1)))
    return s


# ---------------- separadores hexagonales de los ejes ----------------
def separadores(k):
    tramos = [(Y_RUEDA_N - 2.0, Y_RUEDAS[0] - W2)]
    for i in range(len(Y_RUEDAS) - 1):
        tramos.append((Y_RUEDAS[i] + W2, Y_RUEDAS[i + 1] - W2))
    tramos.append((Y_RUEDAS[-1] + W2, 215.5))
    t = None
    for y0, y1 in tramos:
        if y1 - y0 < 2:
            continue
        c = (cq.Workplane("XZ").circle(SEP_OD / 2).extrude(y1 - y0)
             .translate((0, y1, 0)))
        c = c.cut(cq.Workplane("XZ").polygon(6, 12.9 / cos(radians(30)))
                  .extrude(y1 - y0 + 4).translate((0, y1 + 2, 0)))
        t = c if t is None else t.union(c)
    return t.translate((X_EJES[k], 0, Z_EJE))
