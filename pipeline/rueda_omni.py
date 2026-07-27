"""Rueda omnidireccional de doble hilera: medición sobre foto + vista de frente.

Herramienta de dos pasos, sin gate propio (capa `user`, todo auditado):

  medir <proyecto> [--foto <rel>] [--diametro <mm>]
      Mide la foto frontal del proyecto con OpenCV y escribe
      `work/00_medicion/parametros.json`: escala (px→mm) anclada al diámetro
      exterior DECLARADO por el usuario, y de ahí radio de eje de rodillo,
      diámetro y longitud de rodillo, circunferencia de tornillos y cubo
      central. Cada valor lleva su procedencia (`declarado`, `medido_foto`,
      `derivado`) y su incertidumbre. No inventa nada: lo que la foto no
      resuelve (p. ej. el barreno del eje) queda como `no_determinable`.

  vista <proyecto> [--formato A3] [--escala 2:1]
      Dibuja la VISTA DE FRENTE a partir de esos parámetros:
      `out/drawings/rueda_omni_alzado.dxf` (escala real, 1 unidad = 1 mm),
      `.pdf` (lámina ISO 5457/7200 con marco, cajetín y cotas ISO 129) y
      `.png` (previsualización).

El perfil del rodillo no es un dibujo libre: en una rueda omni la corona del
rodillo rueda a radio constante, luego rho(t) = sqrt(R^2 - t^2) - a con `a` =
radio del eje del rodillo y `t` = estación axial. Esa identidad es también el
contraste de coherencia de la medición (a + rho(0) debe dar R).

uso: python pipeline/rueda_omni.py <medir|vista> projects/<X> [opciones]
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import audit, now_iso, project_dir, sha256_file

DIAMETRO_DEFECTO = 58.0          # mm, exterior; sobrescribible con --diametro
NHILERAS, NRODILLOS = 2, 5       # contados en la foto (ver `medir`)


# ---------------------------------------------------------------------------
# Medición sobre la foto
# ---------------------------------------------------------------------------

def _recorta_rueda(img):
    """Aísla la rueda mayor de la foto (fondo blanco) y devuelve (recorte, bbox)."""
    import cv2
    import numpy as np
    gris = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mascara = cv2.morphologyEx((gris < 238).astype(np.uint8), cv2.MORPH_CLOSE,
                               np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mascara, 8)
    if n < 2:
        sys.exit("ERROR: no se distingue la pieza del fondo en la foto.")
    i = int(np.argmax(stats[1:, 4])) + 1
    x, y, w, h, _ = stats[i]
    m = 10
    y0, y1 = max(0, y - m), min(img.shape[0], y + h + m)
    x0, x1 = max(0, x - m), min(img.shape[1], x + w + m)
    return img[y0:y1, x0:x1], (int(x0), int(y0), int(w), int(h))


def _circunferencia_comun(cand, centro_rueda, r_max_px):
    """Mayor subconjunto de círculos candidatos que cae sobre una circunferencia
    común (los tornillos). Devuelve (centro ajustado, máscara de inliers).

    Se ajusta el centro en vez de usar el de la rueda: en una foto con perspectiva
    la cara frontal se proyecta desplazada respecto a la silueta, y ese
    desplazamiento —que se registra— es precisamente la medida del escorzo."""
    import itertools

    import numpy as np

    def circuncentro(p, q, r):
        (ax, ay), (bx, by), (cx_, cy_) = p, q, r
        d = 2 * (ax * (by - cy_) + bx * (cy_ - ay) + cx_ * (ay - by))
        if abs(d) < 1e-6:
            return None
        ux = ((ax**2 + ay**2) * (by - cy_) + (bx**2 + by**2) * (cy_ - ay) +
              (cx_**2 + cy_**2) * (ay - by)) / d
        uy = ((ax**2 + ay**2) * (cx_ - bx) + (bx**2 + by**2) * (ax - cx_) +
              (cx_**2 + cy_**2) * (bx - ax)) / d
        return np.array([ux, uy]), float(np.hypot(ax - ux, ay - uy))

    C = np.asarray(centro_rueda, float)
    mejor = None
    for i, j, k in itertools.combinations(range(len(cand)), 3):
        res = circuncentro(cand[i, :2], cand[j, :2], cand[k, :2])
        if res is None:
            continue
        centro, radio = res
        if np.linalg.norm(centro - C) > 0.35 * r_max_px:      # no es de esta pieza
            continue
        if not 0.30 * r_max_px < radio < 0.90 * r_max_px:
            continue
        d = np.hypot(cand[:, 0] - centro[0], cand[:, 1] - centro[1])
        inl = abs(d - radio) < 0.12 * radio
        punt = (int(inl.sum()), -float(np.abs(d[inl] - radio).mean()))
        if mejor is None or punt > mejor[0]:
            mejor = (punt, centro, inl)
    if mejor is None or mejor[0][0] < 4:
        return None
    return mejor[1], mejor[2]


def medir_foto(foto: Path, diametro_mm: float):
    """Extrae los parámetros de la rueda de una foto frontal.

    Ancla: el diámetro exterior declarado por el usuario. Todo lo demás es
    proporción medida en píxeles × esa escala.

    Devuelve (parámetros, solapado de verificación) — la imagen deja ver
    exactamente qué contornos y círculos sostienen cada número."""
    import cv2
    import numpy as np

    img = cv2.imread(str(foto))
    if img is None:
        sys.exit(f"ERROR: no se pudo leer la foto {foto}")
    rec, bbox = _recorta_rueda(img)
    gris = cv2.cvtColor(rec, cv2.COLOR_BGR2GRAY)

    # --- silueta: centro y radio máximo (envolvente de las coronas) ---------
    sil = cv2.morphologyEx((gris < 238).astype(np.uint8), cv2.MORPH_CLOSE,
                           np.ones((5, 5), np.uint8))
    cont = max(cv2.findContours(sil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0],
               key=cv2.contourArea)
    M = cv2.moments(cont)
    cx, cy = M["m10"] / M["m00"], M["m01"] / M["m00"]
    pts = cont.reshape(-1, 2).astype(float)
    r_sil = np.hypot(pts[:, 0] - cx, pts[:, 1] - cy)
    r_max_px = float(np.percentile(r_sil, 99.5))
    (_, _), (ej_a, ej_b), _ = cv2.fitEllipse(cont)
    escala = (diametro_mm / 2) / r_max_px                      # mm por píxel
    inclinacion = 100 * (1 - min(ej_a, ej_b) / max(ej_a, ej_b))  # % de escorzo

    # --- rodillos: manchas negras aisladas -----------------------------------
    # Medidas por EXTENSIÓN radial y tangencial, no por elipse ajustada: el
    # rodillo se proyecta como una lente curvada y una elipse le sobra ~13% de
    # longitud. Radialmente el contorno va de 2a-rho(0) a R; tangencialmente,
    # exactamente el largo del rodillo.
    neg = cv2.morphologyEx((gris < 115).astype(np.uint8), cv2.MORPH_OPEN,
                           np.ones((3, 3), np.uint8))
    n, lab, stats, cent = cv2.connectedComponentsWithStats(neg, 8)
    rodillos, contornos_rod = [], []
    for i in range(1, n):
        if not 4000 < stats[i, 4] < 25000:      # descarta ruido y racimos unidos
            continue
        c = max(cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL,
                                 cv2.CHAIN_APPROX_NONE)[0],
                key=cv2.contourArea).reshape(-1, 2).astype(float)
        d = c - (cx, cy)
        r = np.hypot(d[:, 0], d[:, 1])
        if r.max() < 0.95 * r_max_px:           # la corona de un rodillo llega
            continue                            # al borde; una sombra, no
        u = np.array([cent[i][0] - cx, cent[i][1] - cy])
        u /= np.linalg.norm(u) or 1.0
        tang = d @ np.array([-u[1], u[0]])      # coordenada axial del rodillo
        rodillos.append((float(np.linalg.norm([cent[i][0] - cx, cent[i][1] - cy])),
                         float(r.max() - r.min()), float(tang.max() - tang.min())))
        contornos_rod.append(c)
    if not rodillos:
        sys.exit("ERROR: no se aisló ningún rodillo en la foto; use otra toma "
                 "frontal con los rodillos bien contrastados y sin fundirse "
                 "entre sí.")
    a_px = float(np.median([r[0] for r in rodillos]))       # radio del eje
    d_rod_px = float(np.median([r[1] for r in rodillos]))   # espesor máximo
    l_rod_px = float(np.median([r[2] for r in rodillos]))   # largo axial

    # --- tornillos y cubo central (círculos de Hough) -----------------------
    # El umbral del acumulador no es transferible entre fotos (una foto suave
    # vota más que un render de bordes duros): se baja hasta que aparece un
    # conjunto que SE PARECE a lo buscado — círculos equidistantes del centro
    # para los tornillos, un círculo casi concéntrico para el cubo.
    borroso = cv2.medianBlur(gris, 3)
    r_torn_px = d_cab_px = d_cubo_px = None
    n_torn, desplaz_px, cabezas, centro_torn, cubo = 0, None, None, None, None
    for p2 in (34, 28, 22, 18, 15, 12):
        c = cv2.HoughCircles(borroso, cv2.HOUGH_GRADIENT, dp=1,
                             minDist=int(0.10 * r_max_px), param1=120, param2=p2,
                             minRadius=int(0.03 * r_max_px),
                             maxRadius=int(0.10 * r_max_px))
        if c is None:
            continue
        dist = np.hypot(c[0][:, 0] - cx, c[0][:, 1] - cy)
        cand = c[0][(dist > 0.30 * r_max_px) & (dist < 0.95 * r_max_px)]
        if not 4 <= len(cand) <= 2 * NRODILLOS:   # menos: sin evidencia; más: ruido
            continue
        ajuste_c = _circunferencia_comun(cand, (cx, cy), r_max_px)
        if ajuste_c is None:
            continue
        centro_t, inl = ajuste_c
        d_inl = np.hypot(cand[inl, 0] - centro_t[0], cand[inl, 1] - centro_t[1])
        r_torn_px = float(np.median(d_inl))
        d_cab_px = float(2 * np.median(cand[inl, 2]))
        n_torn = int(inl.sum())
        desplaz_px = float(np.hypot(*(centro_t - np.array([cx, cy]))))
        cabezas, centro_torn = cand[inl], centro_t
        break
    for p2 in (40, 30, 25, 20, 15, 12):
        c = cv2.HoughCircles(borroso, cv2.HOUGH_GRADIENT, dp=1,
                             minDist=int(0.25 * r_max_px), param1=120, param2=p2,
                             minRadius=int(0.15 * r_max_px),
                             maxRadius=int(0.32 * r_max_px))
        if c is None:
            continue
        cand = c[0]
        dist = np.hypot(cand[:, 0] - cx, cand[:, 1] - cy)
        cand = cand[dist < 0.30 * r_max_px]                 # casi concéntrico
        if len(cand):
            cubo = cand[np.argmin(np.hypot(cand[:, 0] - cx, cand[:, 1] - cy))]
            d_cubo_px = float(2 * cubo[2])
            break

    # --- placa lateral -------------------------------------------------------
    # El contorno real es festoneado (huecos para los rodillos), así que no hay
    # un "diámetro de placa". Lo único defendible es el disco CONTINUO: el radio
    # hasta el que hay plástico claro en TODAS las direcciones (cota inferior).
    # El máximo por sector no sirve: con el escorzo asoma la placa del lado
    # opuesto y daría un diámetro mayor que la propia rueda.
    yy, xx = np.mgrid[0:gris.shape[0], 0:gris.shape[1]]
    rr = np.hypot(xx - cx, yy - cy)
    th = np.degrees(np.arctan2(-(yy - cy), xx - cx)) % 360
    blanco = (gris >= 215) & (sil > 0) & (rr < r_max_px)
    alcances = [np.percentile(rr[blanco & (th >= s) & (th < s + 5)], 98)
                for s in range(0, 360, 5)
                if (blanco & (th >= s) & (th < s + 5)).sum() > 30]
    d_disco_px = float(2 * min(alcances)) if alcances else None

    # --- solapado de verificación: qué midió exactamente el detector ---------
    ov = rec.copy()
    cv2.circle(ov, (int(cx), int(cy)), int(r_max_px), (0, 140, 255), 2)
    for c in contornos_rod:
        cv2.polylines(ov, [c.astype(np.int32)], True, (0, 0, 255), 2)
    if cabezas is not None:
        cv2.circle(ov, (int(centro_torn[0]), int(centro_torn[1])),
                   int(r_torn_px), (255, 0, 0), 1)
        for x, y, r in cabezas:
            cv2.circle(ov, (int(x), int(y)), int(r), (255, 0, 0), 2)
    if cubo is not None:
        cv2.circle(ov, (int(cubo[0]), int(cubo[1])), int(cubo[2]), (0, 170, 0), 2)
    cv2.drawMarker(ov, (int(cx), int(cy)), (0, 140, 255), cv2.MARKER_CROSS, 18, 2)

    mm = lambda px: None if px is None else round(px * escala, 2)
    R = diametro_mm / 2
    a_mm, rho_mm = a_px * escala, d_rod_px * escala / 2
    residuo = a_mm + rho_mm - R                 # debe ser ~0 (corona continua)
    ajuste = residuo / 2                        # se reparte entre ambos
    par = {
        "formato": "foto3d-rueda-omni",
        "version": 1,
        "medido": now_iso(),
        "foto": {"archivo": foto.name, "sha256": sha256_file(foto),
                 "bbox_rueda_px": bbox, "escorzo_pct": round(inclinacion, 1),
                 "desplazamiento_cara_pct": None if desplaz_px is None else
                 round(100 * desplaz_px / r_max_px, 1)},
        "escala_mm_por_px": round(escala, 6),
        "hileras": NHILERAS,
        "rodillos_por_hilera": NRODILLOS,
        "desfase_hileras_deg": 360 / (NHILERAS * NRODILLOS),
        "cotas": {
            "diametro_exterior": {"mm": diametro_mm, "fuente": "declarado",
                                  "detalle": "dato del usuario; ancla de escala"},
            "radio_eje_rodillo": {
                "mm": round(a_mm - ajuste, 2), "fuente": "derivado",
                "detalle": f"medido {a_mm:.2f}; ajustado por a + rho(0) = R "
                           f"(residuo {residuo:+.2f} mm repartido)"},
            "diametro_rodillo_max": {
                "mm": round(2 * (rho_mm - ajuste), 2), "fuente": "derivado",
                "detalle": f"medido {2*rho_mm:.2f}; mismo ajuste de coherencia"},
            "longitud_rodillo": {
                "mm": mm(l_rod_px), "fuente": "medido_foto",
                "detalle": f"extensión axial de {len(rodillos)} rodillos aislados"},
            "diametro_disco_placa": {
                "mm": mm(d_disco_px), "fuente": "medido_foto",
                "detalle": "disco de placa continuo en todas las direcciones "
                           "(cota INFERIOR: entre rodillos la placa llega más lejos)"},
            "contorno_placa": {"mm": None, "fuente": "no_determinable",
                               "detalle": "festoneado, con hueco por rodillo; una "
                                          "vista frontal única no lo resuelve"},
            "circunferencia_tornillos": {
                "mm": mm(None if r_torn_px is None else 2 * r_torn_px),
                "fuente": "medido_foto" if r_torn_px else "no_determinable",
                "detalle": f"ajuste robusto sobre {n_torn} cabezas de {NRODILLOS}"
                           if r_torn_px else
                           "no se aisló un grupo de cabezas sobre una "
                           "circunferencia común"},
            "diametro_cabeza_tornillo": {
                "mm": mm(d_cab_px),
                "fuente": "medido_foto" if d_cab_px else "no_determinable",
                "detalle": "cabeza vista, no la rosca: no determina la métrica"},
            "diametro_cubo_central": {
                "mm": mm(d_cubo_px),
                "fuente": "medido_foto" if d_cubo_px else "no_determinable",
                "detalle": "rebaje circular del cubo"},
            "barreno_eje": {"mm": None, "fuente": "no_determinable",
                            "detalle": "no resuelto por la foto: medir con calibre "
                                       "o citar ficha técnica (input/web_facts.json)"},
            "ancho_rueda": {"mm": None, "fuente": "no_determinable",
                            "detalle": "una sola vista frontal no da profundidad"},
        },
        "coherencia": {"residuo_corona_mm": round(residuo, 3),
                       "residuo_pct": round(100 * residuo / R, 2)},
        "incertidumbre_pct": round(max(5.0, inclinacion), 1),
        "capa": "user",
    }
    return par, ov


# ---------------------------------------------------------------------------
# Geometría de la vista de frente (mm reales, origen en el centro de la rueda)
# ---------------------------------------------------------------------------

def perfil_rodillo(R: float, a: float, largo: float, n: int = 49):
    """Contorno cerrado de un rodillo en la vista de frente (x radial, y axial).

    El eje del rodillo es la cuerda x = a. La sección del barril en la estación
    axial t es una circunferencia de radio rho(t) contenida en el plano normal
    al eje, que se proyecta como un segmento RADIAL de a-rho(t) a a+rho(t).
    Rodadura de radio constante: sqrt((a + rho)^2 + t^2) = R, de donde
    rho(t) = sqrt(R^2 - t^2) - a. La corona resulta ser, exactamente, el arco
    de radio R (x^2 + y^2 = R^2) y las tapas planas, segmentos radiales."""
    ts = [-largo / 2 + largo * i / (n - 1) for i in range(n)]   # n impar: pasa por t=0
    ext = [(math.sqrt(max(R * R - t * t, 0.0)), t) for t in ts]
    inte = [(2 * a - x, t) for x, t in ext]
    return ext + inte[::-1]


def rota(pts, deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [(x * c - y * s, x * s + y * c) for x, y in pts]


# ---------------------------------------------------------------------------
# Lámina
# ---------------------------------------------------------------------------

class Vista:
    """Adaptador: dibuja en mm REALES sobre una `Sheet` de s6_drawings."""

    def __init__(self, sheet, centro_papel):
        self.sh, self.s, self.c = sheet, sheet.num / sheet.den, centro_papel

    def P(self, p):
        return (self.c[0] + p[0] * self.s, self.c[1] + p[1] * self.s)

    def circulo(self, r, capa):
        self.sh.circle(self.c, r * self.s, capa)

    def linea(self, p, q, capa):
        self.sh.line(self.P(p), self.P(q), capa)

    def poli(self, pts, capa, cerrar=True):
        self.sh.poly([self.P(p) for p in pts], capa, close=cerrar)

    def eje(self, r, capa="EJES"):
        """Marca de centro: cruz + circunferencia auxiliar."""
        self.linea((-r, 0), (r, 0), capa)
        self.linea((0, -r), (0, r), capa)

    def cota_diametro(self, r, ang_deg, r_texto, texto=None):
        """Cota de diámetro ISO 129 sobre la circunferencia de radio r, con el
        texto sacado fuera de la vista a `r_texto` (mm reales) y `ang_deg`."""
        sh, K = self.sh, self.sh.K
        ang = math.radians(ang_deg)
        loc = (self.c[0] + r_texto * self.s * math.cos(ang),
               self.c[1] + r_texto * self.s * math.sin(ang))
        dim = sh.msp.add_diameter_dim(
            center=sh._p(self.c), radius=r * self.s * K, location=sh._p(loc),
            dimstyle=sh.dimstyle, override={"dimtoh": 1},
            dxfattribs={"layer": "COTAS"})
        if texto:
            dim.dimension.dxf.text = texto
        dim.render()


def dibuja_lamina(sh, par, notas):
    """Compone la vista de frente y su bloque de notas sobre la lámina."""
    from s6_drawings import MARGIN, MARGIN_L, TITLE_H

    c = par["cotas"]
    val = lambda k: c[k]["mm"]
    R = val("diametro_exterior") / 2
    a = val("radio_eje_rodillo")
    d_rod = val("diametro_rodillo_max")
    largo = val("longitud_rodillo")
    r_disco = (val("diametro_disco_placa") or 0) / 2
    r_torn = (val("circunferencia_tornillos") or 0) / 2
    d_cab = val("diametro_cabeza_tornillo") or 0
    d_cubo = val("diametro_cubo_central") or 0
    n_rod = par["rodillos_por_hilera"]
    paso = 360 / n_rod
    desfase = par["desfase_hileras_deg"]

    s = sh.num / sh.den
    ancho_util = sh.W - MARGIN_L - MARGIN
    col_notas = 118.0                                   # columna derecha, mm papel
    cx = MARGIN_L + (ancho_util - col_notas) / 2
    cy = sh.H / 2                                       # el cajetín sólo ocupa
    v = Vista(sh, (cx, cy))                             # la esquina inferior dcha.

    # --- hilera posterior (oculta) y hilera frontal (vista) -----------------
    # La placa que las separa tiene contorno festoneado no acotable: no se
    # dibuja, y por eso la hilera del fondo va entera en trazo oculto.
    perfil = perfil_rodillo(R, a, largo)
    for k in range(n_rod):
        v.poli(rota(perfil, desfase + k * paso), "OCULTA")
    for k in range(n_rod):
        v.poli(rota(perfil, k * paso), "VISIBLE")
    if r_disco:
        v.circulo(r_disco, "FINA")

    # --- cubo, tornillos y ejes ---------------------------------------------
    if d_cubo:
        v.circulo(d_cubo / 2, "VISIBLE")
    for k in range(n_rod):
        ang = math.radians(desfase + k * paso)
        p = (r_torn * math.cos(ang), r_torn * math.sin(ang))
        if d_cab:
            sh.circle(v.P(p), d_cab / 2 * s, "VISIBLE")
        v.linea((p[0] * 0.82, p[1] * 0.82), (p[0] * 1.18, p[1] * 1.18), "EJES")
    v.eje(R * 1.12)
    v.circulo(r_torn, "EJES")
    v.circulo(a, "EJES")

    # --- cotas ---------------------------------------------------------------
    # Las cotas de la izquierda llevan el texto a la izquierda de su punto de
    # anclaje: se acortan los rótulos para no salirse del recuadro.
    v.cota_diametro(R, 150, R + 3, texto=f"%%c{2*R:g} DECLARADO")
    v.cota_diametro(a, 190, R + 3, texto=f"%%c{2*a:.1f} EJE RODILLOS")
    if r_disco:
        v.cota_diametro(r_disco, 228, R + 3,
                        texto=f"(%%c{2*r_disco:.1f} DISCO MÍN.)")
    if r_torn:
        v.cota_diametro(r_torn, 16, R + 4, texto=f"%%c{2*r_torn:.1f} — "
                                                 f"{n_rod}x %%c{d_cab:.1f}")
    if d_cubo:
        v.cota_diametro(d_cubo / 2, 62, R + 8, texto=f"%%c{d_cubo:.1f} CUBO")

    # rótulo de la vista y paso angular
    sh.text("VISTA DE FRENTE", cx, cy - R * s - 12, h=4.0, align="CENTER")
    sh.text(f"{n_rod} rodillos por hilera — paso {paso:g}°   ·   "
            f"{par['hileras']} hileras desfasadas {desfase:g}°",
            cx, cy - R * s - 18, h=2.6, align="CENTER")
    sh.text(f"%%c{d_rod:.1f} máx. rodillo x {largo:.1f} largo",
            cx, cy - R * s - 23, h=2.6, align="CENTER")

    # --- bloque de notas -----------------------------------------------------
    x = sh.W - MARGIN - col_notas + 6
    y = sh.H - MARGIN - 8
    sh.text("NOTAS", x, y, h=3.5)
    y -= 3
    sh.line((x, y), (x + col_notas - 12, y), "FINA")
    y -= 6
    for linea in notas:
        sh.text(linea, x, y, h=2.2)
        y -= 4.0


def datos_cajetin(proj: Path, par: dict, escala: str, formato: str) -> dict:
    diam = par["cotas"]["diametro_exterior"]["mm"]
    return {
        "designacion": f"RUEDA OMNIDIRECCIONAL DOBLE %%c{diam:g}",
        "proyecto": proj.name,
        "fuente": "foto única — capa user",
        "sha": par["foto"]["sha256"][7:19] + "…",
        "verificacion": f"NO CERTIFICADA — %%c{diam:g} declarado",
        "nota": f"Cotas medidas en foto: ±{par['incertidumbre_pct']:g}% — verificar con calibre",
        "escala": escala,
        "formato": formato,
        "lamina": "1 / 1",
        "fecha": now_iso()[:10],
        "num_plano": "RUEDA-OMNI-ALZADO-01",
    }


def notas_lamina(par: dict) -> list[str]:
    c = par["cotas"]
    inc = par["incertidumbre_pct"]
    res = par["coherencia"]
    n = [
        f"1. Ø{c['diametro_exterior']['mm']:g} es dato DECLARADO por el usuario.",
        "   Es el único ancla de escala: toda otra cota sale de la",
        f"   foto {par['foto']['archivo']} escalada por ese diámetro.",
        f"2. Cotas obtenidas de la foto: incertidumbre ±{inc:g}% por el",
        f"   escorzo medido ({par['foto']['escorzo_pct']:g}%). Capa `user`: NO",
        "   sustituyen a la medición con calibre sobre la pieza.",
        "3. Perfil del rodillo derivado, no dibujado a mano:",
        "   rho(t) = sqrt(R² - t²) - a, rodadura de radio constante.",
        f"   Contraste a + rho(0) = R: residuo {res['residuo_corona_mm']:+.2f} mm"
        f" ({res['residuo_pct']:+.2f}%).",
        "4. Barreno del eje NO determinable en la foto: sin cota.",
        "   Medir con calibre o citar ficha en input/web_facts.json.",
        "5. Ancho de la rueda y perfil no acotables desde una única",
        "   vista frontal. Para volumen medido: etapas S0–S4.",
        "6. Trazo continuo = hilera frontal; trazo a puntos = hilera",
        "   posterior. La placa que las separa tiene contorno",
        "   festoneado no acotable: no se dibuja. La circunferencia",
        "   fina es sólo el disco continuo mínimo de esa placa.",
    ]
    desp = par["foto"].get("desplazamiento_cara_pct")
    if desp:
        n += [
            f"7. La cara frontal se proyecta {desp:g}% del radio fuera del",
            "   centro de la silueta: hay perspectiva, no vista ortogonal.",
            "   Las cotas de esa cara (tornillos, cubo) pueden llevar un",
            "   sesgo adicional de ese orden. Una toma más lejana con",
            "   teleobjetivo lo reduce.",
        ]
    return n


# ---------------------------------------------------------------------------

def cmd_medir(proj: Path, args) -> None:
    foto_rel = opt(args, "--foto")
    diam = float(opt(args, "--diametro", DIAMETRO_DEFECTO))
    if foto_rel:
        foto = proj / foto_rel
    else:
        fotos = sorted(p for p in (proj / "input" / "photos").iterdir()
                       if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
        if not fotos:
            sys.exit("ERROR: no hay fotos en input/photos/")
        foto = fotos[0]
    par, solapado = medir_foto(foto, diam)
    dest = proj / "work" / "00_medicion"
    dest.mkdir(parents=True, exist_ok=True)
    salida = dest / "parametros.json"
    salida.write_text(json.dumps(par, indent=2, ensure_ascii=False), encoding="utf-8")
    import cv2
    verif = dest / "medicion.png"
    cv2.imwrite(str(verif), solapado)

    print(f"Medición sobre {foto.name}  (escala {par['escala_mm_por_px']:.5f} mm/px, "
          f"escorzo {par['foto']['escorzo_pct']:.1f}%)")
    for k, v in par["cotas"].items():
        val = "—" if v["mm"] is None else f"{v['mm']:8.2f} mm"
        print(f"  {k:28} {val}   [{v['fuente']}] {v['detalle']}")
    print(f"  coherencia corona: residuo {par['coherencia']['residuo_corona_mm']:+.3f} mm "
          f"({par['coherencia']['residuo_pct']:+.2f}%)")
    print(f"→ {salida}\n→ {verif}  (solapado: naranja silueta, rojo rodillos, "
          f"azul tornillos, verde cubo)")
    audit(proj, "RUEDA_OMNI", f"medición de {foto.name}", "OK",
          metrics={k: v["mm"] for k, v in par["cotas"].items()},
          hash_foto=par["foto"]["sha256"], hash_params=sha256_file(salida),
          hash_solapado=sha256_file(verif))


def cmd_vista(proj: Path, args) -> None:
    import ezdxf
    from s6_drawings import SHEETS, Sheet, render_pdf

    par_file = proj / "work" / "00_medicion" / "parametros.json"
    if not par_file.exists():
        sys.exit("ERROR: falta work/00_medicion/parametros.json — ejecute primero "
                 f"`python pipeline/rueda_omni.py medir {proj.name}`")
    par = json.loads(par_file.read_text(encoding="utf-8"))
    formato = opt(args, "--formato", "A3").upper()
    if formato not in SHEETS:
        sys.exit(f"ERROR: formato {formato} no normalizado ({', '.join(SHEETS)})")
    num, den = (float(x) for x in opt(args, "--escala", "2:1").split(":"))
    W, H = SHEETS[formato]
    escala = f"{num:g}:{den:g}"
    notas = notas_lamina(par)
    tb = datos_cajetin(proj, par, escala, formato)

    out = proj / "out" / "drawings"
    out.mkdir(parents=True, exist_ok=True)
    dxf_path, pdf_path = out / "rueda_omni_alzado.dxf", out / "rueda_omni_alzado.pdf"
    png_path = out / "rueda_omni_alzado.png"

    docs = {}
    for clave, K in (("real", den / num), ("papel", 1.0)):
        doc = ezdxf.new("R2018", setup=True)
        doc.header["$INSUNITS"] = 4                      # mm
        if "EJES" not in doc.layers:
            doc.layers.add("EJES", color=4, linetype="CENTER", lineweight=18)
        sh = Sheet(doc, formato, W, H, num, den, K)
        dibuja_lamina(sh, par, notas)
        sh.frame_and_title(tb)
        docs[clave] = doc
    docs["real"].saveas(dxf_path)
    render_pdf([(docs["papel"], (W, H))], pdf_path)
    _png(docs["papel"], (W, H), png_path)

    print(f"Vista de frente {escala} en {formato}:")
    for p in (dxf_path, pdf_path, png_path):
        print(f"  {p}  ({p.stat().st_size/1024:.0f} kB)")
    audit(proj, "RUEDA_OMNI", "vista de frente (DXF escala real + PDF)", "OK",
          metrics={"escala": escala, "formato": formato,
                   "hash_dxf": sha256_file(dxf_path),
                   "hash_pdf": sha256_file(pdf_path)})


def _png(doc, size, path: Path, dpi: int = 160) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from ezdxf.addons.drawing import Frontend, RenderContext
    from ezdxf.addons.drawing import config as dcfg
    from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
    W, H = size
    cfg = dcfg.Configuration(background_policy=dcfg.BackgroundPolicy.WHITE,
                             color_policy=dcfg.ColorPolicy.BLACK)
    fig = plt.figure()
    ax = fig.add_axes([0, 0, 1, 1])
    Frontend(RenderContext(doc), MatplotlibBackend(ax), config=cfg
             ).draw_layout(doc.modelspace(), finalize=True)
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlim(0, W)
    ax.set_ylim(0, H)
    fig.set_size_inches(W / 25.4, H / 25.4)
    fig.savefig(path, dpi=dpi)
    plt.close(fig)


def opt(args, name, default=None):
    return args[args.index(name) + 1] if name in args and \
        args.index(name) + 1 < len(args) else default


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 2 or args[0] not in ("medir", "vista"):
        sys.exit(__doc__)
    proj = project_dir(args[1])
    (cmd_medir if args[0] == "medir" else cmd_vista)(proj, args[2:])


if __name__ == "__main__":
    main()
