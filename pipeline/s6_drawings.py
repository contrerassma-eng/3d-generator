"""S6 — Dibujo técnico normalizado (gate G6).

Genera desde la malla medida (o un sólido CAD de out/cad/):
- `out/drawings/<nombre>.dxf` — geometría A ESCALA REAL (1 unidad = 1 mm),
  acotada (ISO 129), con marco y cajetín (ISO 5457 / ISO 7200) escalados de
  modo que al trazar a la escala indicada se obtiene la lámina física.
- `out/drawings/<nombre>.pdf` — lámina(s) listas para imprimir: vistas en
  primer diedro (alzado, planta, perfil — ISO 5456-2) + isométrica, y una
  lámina adicional por cada despliegue de chapa solicitado.

La escala métrica proviene de factor_escala (S4). Sin factor, la lámina se
emite igualmente con la leyenda "ESCALA NO CERTIFICADA" y G6 = SIN_CONTRASTE.

uso: python pipeline/s6_drawings.py projects/<X> [opciones]
  --fuente <rel>     malla a dibujar (def: out/model.glb; admite out/cad/*.glb)
  --vistas a,b,...   subconjunto de alzado,planta,perfil,isometrica
  --chapa [auto|N]   añade lámina de despliegue de chapa (raíz auto o región N)
  --angulo G         umbral de arista característica en grados (def: 25)
  --formato F        A4|A3|A2|A1|A0 (def: auto, el menor donde quepa)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from lib_audit import (audit, load_state, load_thresholds, now_iso,
                       project_dir, save_state, sha256_file)
import lib_geometry as G

# --- norma ------------------------------------------------------------------
SHEETS = {"A4": (297, 210), "A3": (420, 297), "A2": (594, 420),
          "A1": (841, 594), "A0": (1189, 841)}          # apaisado, mm
MARGIN, MARGIN_L = 10.0, 20.0                            # ISO 5457 (izq. archivado)
TITLE_W, TITLE_H = 180.0, 42.0                           # cajetín ISO 7200
GAP = 26.0                                               # separación entre vistas
REDUCTIONS = [1, 2, 2.5, 5, 10, 20, 50, 100, 200, 500, 1000]
ENLARGEMENTS = [2, 5, 10, 20, 50]
GRIDREF = {  # retícula de referencia ISO 5457: campos ≈50 mm (horiz, vert)
    "A4": (6, 4), "A3": (8, 6), "A2": (12, 8), "A1": (16, 12), "A0": (24, 16)}
GRID_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"                # sin I ni O (ISO 5457)
LAYERS = {  # nombre: (color ACI, tipo de línea, grosor mm*100)
    "NORMA":   (7, "CONTINUOUS", 70),
    "FINA":    (7, "CONTINUOUS", 18),
    "VISIBLE": (7, "CONTINUOUS", 50),
    "OCULTA":  (8, "DASHED", 25),
    "COTAS":   (7, "CONTINUOUS", 25),
    "PLIEGUE": (1, "DASHDOT", 25),
    "TEXTO":   (7, "CONTINUOUS", 25),
}
ORDER = ["alzado", "planta", "perfil", "isometrica"]


def scale_label(num: float, den: float) -> str:
    fmt = lambda x: f"{x:g}"
    return f"{fmt(num)}:{fmt(den)}"


def choose_sheet(w: float, h: float, formato: str | None):
    """Menor lámina y mejor escala normalizada (ISO 5455) donde quepa el
    conjunto de w×h mm reales. Devuelve (nombre, W, H, num, den)."""
    small = max(w, h) < 50
    prefs = ([(m, 1) for m in sorted(ENLARGEMENTS, reverse=True)] if small else []) \
        + [(1, 1)] + [(1, d) for d in REDUCTIONS[1:]]
    names = [formato] if formato else list(SHEETS)
    best = None
    for name in names:
        W, H = SHEETS[name]
        uw = W - MARGIN_L - MARGIN
        uh = H - 2 * MARGIN - TITLE_H - 5
        for num, den in prefs:
            s = num / den
            if w * s <= uw and h * s <= uh:
                if best is None or s > best[3] / best[4]:
                    best = (name, W, H, num, den)
                break
    if best is None:
        name = formato or "A0"
        W, H = SHEETS[name]
        best = (name, W, H, 1, REDUCTIONS[-1])
    return best


class Sheet:
    """Dibuja una lámina en un doc DXF aplicando un multiplicador global K.

    K=1        → coordenadas de papel (para el PDF; las cotas usan DIMLFAC).
    K=den/num  → geometría a escala real 1:1 mm; marco y textos quedan ×K y
                 al trazar a la escala indicada recuperan su tamaño normativo.
    """

    def __init__(self, doc, name, W, H, num, den, K, origin=(0.0, 0.0)):
        self.doc, self.msp = doc, doc.modelspace()
        self.name, self.W, self.H = name, W, H
        self.num, self.den, self.K = num, den, K
        self.ox, self.oy = origin
        for lname, (color, ltype, lw) in LAYERS.items():
            if lname not in doc.layers:
                doc.layers.add(lname, color=color, linetype=ltype, lineweight=lw)
        style = f"F3D_{int(K * 1000)}"
        if style not in doc.dimstyles:
            ds = doc.dimstyles.add(style)
            ds.dxf.dimtxt = 3.5 * K
            ds.dxf.dimasz = 2.5 * K
            ds.dxf.dimexo = 1.0 * K
            ds.dxf.dimexe = 1.5 * K
            ds.dxf.dimgap = 0.9 * K
            ds.dxf.dimtad = 1
            ds.dxf.dimdec = 1
            ds.dxf.dimdsep = ord(".")
            ds.dxf.dimlfac = (self.den / self.num) / K
        self.dimstyle = style

    # --- primitivas (reciben mm de papel, aplican K y origen) ---------------
    def _p(self, xy):
        return ((self.ox + xy[0]) * self.K, (self.oy + xy[1]) * self.K)

    def line(self, a, b, layer):
        self.msp.add_line(self._p(a), self._p(b), dxfattribs={"layer": layer})

    def rect(self, x, y, w, h, layer="NORMA"):
        pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        self.msp.add_lwpolyline([self._p(p) for p in pts], close=True,
                                dxfattribs={"layer": layer})

    def text(self, s, x, y, h=3.5, layer="TEXTO", align="LEFT"):
        from ezdxf.enums import TextEntityAlignment as TA
        al = {"LEFT": TA.LEFT, "CENTER": TA.MIDDLE_CENTER,
              "MIDDLE_LEFT": TA.MIDDLE_LEFT, "MIDDLE_RIGHT": TA.MIDDLE_RIGHT}[align]
        self.msp.add_text(s, height=h * self.K, dxfattribs={"layer": layer}
                          ).set_placement(self._p((x, y)), align=al)

    def circle(self, c, r, layer="TEXTO"):
        self.msp.add_circle(self._p(c), r * self.K, dxfattribs={"layer": layer})

    def poly(self, pts, layer="TEXTO", close=True):
        self.msp.add_lwpolyline([self._p(p) for p in pts], close=close,
                                dxfattribs={"layer": layer})

    def segments(self, segs, layer, offset, s):
        """Segmentos 2D en mm reales, escalados por `s` y colocados en offset."""
        ox, oy = offset
        for (a, b) in np.asarray(segs):
            self.line((ox + a[0] * s, oy + a[1] * s),
                      (ox + b[0] * s, oy + b[1] * s), layer)

    def dim(self, p1, p2, offset_dist, vertical=False):
        """Cota lineal entre dos puntos de papel; el texto muestra mm REALES."""
        p1, p2 = self._p(p1), self._p(p2)
        d = offset_dist * self.K
        base = (p1[0] - d, p1[1]) if vertical else (p1[0], p1[1] - d)
        self.msp.add_linear_dim(base=base, p1=p1, p2=p2,
                                angle=90 if vertical else 0,
                                dimstyle=self.dimstyle,
                                dxfattribs={"layer": "COTAS"}).render()

    # --- norma ---------------------------------------------------------------
    def cell(self, x, y, w, h, label, value, vh=2.6, align="MIDDLE_LEFT"):
        """Casilla ISO 7200: rótulo pequeño arriba-izquierda, valor centrado
        verticalmente en el espacio restante. Si el valor no cabe, primero se
        reduce su altura de letra (hasta 2 mm) y solo después se trunca."""
        self.text(label, x + 1.3, y + h - 2.4, h=1.4)
        cw = 0.80                                    # anchura media por carácter
        if value and len(value) * vh * cw > w - 3.2:
            vh = max(2.0, (w - 3.2) / (len(value) * cw))
        max_chars = max(3, int((w - 3.2) / (vh * cw)))
        s = value if len(value) <= max_chars else value[:max_chars - 1] + "…"
        yc = y + (h - 2.8) / 2
        if align == "CENTER":
            self.text(s, x + w / 2, yc, h=vh, align="CENTER")
        else:
            self.text(s, x + 1.6, yc, h=vh, align="MIDDLE_LEFT")

    def projection_symbol(self, cx, cy, s=1.0):
        """Símbolo de primer diedro (ISO 5456-2): vista frontal (círculos) a la
        IZQUIERDA y tronco de cono con el lado estrecho ALEJADO de ellos."""
        r1, r2, L, gap = 2.6 * s, 1.4 * s, 6.2 * s, 1.8 * s
        cxc = cx - (2 * r1 + gap + L) / 2 + r1        # centro de los círculos
        tx = cxc + r1 + gap                           # arranque del trapecio
        self.circle((cxc, cy), r1)
        self.circle((cxc, cy), r2)
        self.poly([(tx, cy - r1), (tx + L, cy - r2),
                   (tx + L, cy + r2), (tx, cy + r1)])
        self.line((cxc - r1 - 1.2 * s, cy), (tx + L + 1.2 * s, cy), "FINA")

    def frame(self):
        """Marco ISO 5457: borde de hoja, recuadro de dibujo, marcas de
        centrado y retícula de referencia con letras/números."""
        W, H = self.W, self.H
        self.rect(0, 0, W, H, "FINA")                            # hoja recortada
        self.rect(MARGIN_L, MARGIN, W - MARGIN_L - MARGIN,
                  H - 2 * MARGIN, "NORMA")                       # recuadro
        for a, b in (((0, H / 2), (MARGIN_L + 5, H / 2)),        # centrado
                     ((W, H / 2), (W - MARGIN - 5, H / 2)),
                     ((W / 2, 0), (W / 2, MARGIN + 5)),
                     ((W / 2, H), (W / 2, H - MARGIN - 5))):
            self.line(a, b, "NORMA")
        nx, ny = GRIDREF[self.name]
        for i in range(1, nx):                                   # divisiones
            x = W / nx * i
            self.line((x, 0), (x, MARGIN), "FINA")
            self.line((x, H - MARGIN), (x, H), "FINA")
        for j in range(1, ny):
            y = H / ny * j
            self.line((0, y), (MARGIN, y), "FINA")
            self.line((W - MARGIN, y), (W, y), "FINA")
        for i in range(nx):                                      # números 1..nx
            x = W / nx * (i + 0.5)
            for y in (MARGIN / 2, H - MARGIN / 2):
                self.text(str(i + 1), x, y, h=2.5, align="CENTER")
        for j in range(ny):                                      # letras A..(top)
            y = H - H / ny * (j + 0.5)
            for x in (MARGIN / 2, W - MARGIN / 2):
                self.text(GRID_LETTERS[j], x, y, h=2.5, align="CENTER")

    def title_block(self, tb):
        """Cajetín ISO 7200 en tres zonas: marca | datos | clasificación."""
        x0, y0 = self.W - MARGIN - TITLE_W, MARGIN
        self.rect(x0, y0, TITLE_W, TITLE_H, "NORMA")
        ys = [y0 + TITLE_H]                       # techos de fila, de arriba abajo
        for rh in (13.0, 10.0, 10.0, 9.0):
            ys.append(ys[-1] - rh)
        xa, xb = x0 + 40.0, x0 + 134.0            # límites de zonas A|B|C
        self.line((xa, y0), (xa, y0 + TITLE_H), "NORMA")
        self.line((xb, y0), (xb, y0 + TITLE_H), "NORMA")

        # zona A — marca del método + símbolo de proyección
        cxa = x0 + 20.0
        self.line((x0, ys[2]), (xa, ys[2]), "FINA")
        self.text("foto3d", cxa, ys[0] - 8.2, h=6.0, align="CENTER")
        self.line((cxa - 13.5, ys[0] - 13.4), (cxa + 13.5, ys[0] - 13.4), "FINA")
        self.text("FOTOGRAMETRÍA · 3D AUDITABLE", cxa, ys[0] - 16.2,
                  h=1.3, align="CENTER")
        self.text("ISO 5457 · 7200 · 129 · 5456-2", cxa, ys[0] - 19.4,
                  h=1.3, align="CENTER")
        self.text("PROYECCIÓN — PRIMER DIEDRO", cxa, ys[2] - 2.4, h=1.4,
                  align="CENTER")
        self.projection_symbol(cxa, y0 + (ys[2] - y0 - 4.0) / 2, s=1.15)

        # zona B — identificación (rejilla con rótulos)
        for y in (ys[1], ys[2], ys[3]):
            self.line((xa, y), (xb, y), "FINA")
        self.line((xa + 47, ys[2]), (xa + 47, ys[1]), "FINA")
        self.line((xa + 56, ys[3]), (xa + 56, ys[2]), "FINA")
        self.cell(xa, ys[1], 94, 13, "DESIGNACIÓN", tb["designacion"], vh=4.2)
        self.cell(xa, ys[2], 47, 10, "PROYECTO", tb["proyecto"], vh=2.8)
        self.cell(xa + 47, ys[2], 47, 10, "FUENTE", tb["fuente"], vh=2.4)
        self.cell(xa, ys[3], 56, 10, "VERIFICACIÓN DE ESCALA",
                  tb["verificacion"], vh=2.4)
        self.cell(xa + 56, ys[3], 38, 10, "SHA-256", tb["sha"], vh=2.2)
        self.cell(xa, y0, 94, 9, "NOTA", tb["nota"], vh=2.2)

        # zona C — clasificación (escala protagonista)
        for y in (ys[1], ys[2], ys[3]):
            self.line((xb, y), (x0 + TITLE_W, y), "FINA")
        self.line((xb + 23, ys[2]), (xb + 23, ys[1]), "FINA")
        self.line((xb + 26, ys[3]), (xb + 26, ys[2]), "FINA")
        self.cell(xb, ys[1], 46, 13, "ESCALA", tb["escala"], vh=5.0,
                  align="CENTER")
        self.cell(xb, ys[2], 23, 10, "FORMATO", tb["formato"], vh=3.0,
                  align="CENTER")
        self.cell(xb + 23, ys[2], 23, 10, "LÁMINA", tb["lamina"], vh=3.0,
                  align="CENTER")
        self.cell(xb, ys[3], 26, 10, "FECHA", tb["fecha"], vh=2.6,
                  align="CENTER")
        self.cell(xb + 26, ys[3], 20, 10, "UNIDADES", "mm", vh=3.0,
                  align="CENTER")
        self.cell(xb, y0, 46, 9, "Nº DE PLANO", tb["num_plano"], vh=2.6,
                  align="CENTER")

    def frame_and_title(self, tb):
        self.frame()
        self.title_block(tb)


# -----------------------------------------------------------------------------
# Composición de vistas
# -----------------------------------------------------------------------------

def build_views(mesh, names, angle_deg):
    """Proyecta la malla en cada vista → segmentos por capa + bbox real (mm)."""
    views = {}
    for name in names:
        mv = G.mesh_in_view(mesh, name)
        edges = G.view_edges(mv, angle_deg)
        outline = G.polygon_segments(G.view_outline(mv))
        allpts = mv.vertices[:, :2]
        lo, hi = allpts.min(axis=0), allpts.max(axis=0)
        views[name] = {"visible": np.concatenate([edges["visible"], outline])
                       if len(outline) else edges["visible"],
                       "oculta": edges["oculta"], "lo": lo, "hi": hi,
                       "size": hi - lo}
    return views


def layout_views(views):
    """Posiciones en primer diedro (mm reales, origen local 0,0):
    planta debajo del alzado, perfil a su derecha, isométrica a la derecha."""
    sz = {k: v["size"] for k, v in views.items()}
    z = np.zeros(2)
    a, pl = sz.get("alzado", z), sz.get("planta", z)
    pos = {}
    y_row = pl[1] + GAP if "planta" in views else 0.0
    x = 0.0
    if "alzado" in views:
        pos["alzado"] = np.array([0.0, y_row])
    if "planta" in views:
        # centrada bajo el alzado (correspondencia de proyección en X)
        pos["planta"] = np.array([(a[0] - pl[0]) / 2 if "alzado" in views else 0.0, 0.0])
    x = max(a[0], (pos["planta"][0] + pl[0]) if "planta" in views else 0.0)
    for name in ("perfil", "isometrica"):
        if name in views:
            x += GAP if x else 0.0
            pos[name] = np.array([x, y_row])
            x += sz[name][0]
    # normaliza a origen (0,0) y calcula el tamaño total del conjunto
    lo = np.min([pos[k] for k in pos], axis=0)
    hi = np.max([pos[k] + sz[k] for k in pos], axis=0)
    for k in pos:
        pos[k] = pos[k] - lo
    return pos, hi[0] - lo[0], hi[1] - lo[1]


def draw_views_sheet(sheet: Sheet, views, pos, total_w, total_h, dims_on):
    s = sheet.num / sheet.den
    uw = sheet.W - MARGIN_L - MARGIN
    uh = sheet.H - 2 * MARGIN - TITLE_H - 5
    ox = MARGIN_L + (uw - total_w * s) / 2
    oy = MARGIN + TITLE_H + 5 + (uh - total_h * s) / 2
    labels = {"alzado": "ALZADO", "planta": "PLANTA", "perfil": "PERFIL",
              "isometrica": "ISOMÉTRICA"}
    for name, v in views.items():
        # origen de la vista en papel: posición del layout menos su esquina real
        vx = ox + pos[name][0] * s - v["lo"][0] * s
        vy = oy + pos[name][1] * s - v["lo"][1] * s
        sheet.segments(v["visible"], "VISIBLE", (vx, vy), s)
        sheet.segments(v["oculta"], "OCULTA", (vx, vy), s)
        cx = vx + (v["lo"][0] + v["size"][0] / 2) * s
        sheet.text(labels[name], cx, vy + v["hi"][1] * s + 4, h=3.5, align="CENTER")
        if name in dims_on:
            x1, y1 = vx + v["lo"][0] * s, vy + v["lo"][1] * s
            x2, y2 = vx + v["hi"][0] * s, vy + v["hi"][1] * s
            if "ancho" in dims_on[name]:
                sheet.dim((x1, y1), (x2, y1), 9)
            if "alto" in dims_on[name]:
                sheet.dim((x2, y1), (x2, y2), -9, vertical=True)


def draw_flat_sheet(sheet: Sheet, flat):
    s = sheet.num / sheet.den
    segs = np.asarray(flat["contorno"])
    pts = segs.reshape(-1, 2)
    lo, hi = pts.min(axis=0), pts.max(axis=0)
    size = hi - lo
    uw = sheet.W - MARGIN_L - MARGIN
    uh = sheet.H - 2 * MARGIN - TITLE_H - 5
    off = (MARGIN_L + (uw - size[0] * s) / 2 - lo[0] * s,
           MARGIN + TITLE_H + 5 + (uh - size[1] * s) / 2 - lo[1] * s)
    sheet.segments(flat["contorno"], "VISIBLE", off, s)
    sheet.segments(flat["pliegues"], "PLIEGUE", off, s)
    x1, y1 = off[0] + lo[0] * s, off[1] + lo[1] * s
    x2, y2 = off[0] + hi[0] * s, off[1] + hi[1] * s
    sheet.dim((x1, y1), (x2, y1), 9)
    sheet.dim((x2, y1), (x2, y2), -9, vertical=True)
    sheet.text("DESPLIEGUE DE CHAPA — desarrollo rígido sin factor K "
               "(línea de pliegue = eje medido)", x1, off[1] + hi[1] * s + 6, h=3.5)
    return size


# -----------------------------------------------------------------------------

def title_data(proj, meta, stem, sheet_no, total, scale, formato, extra=""):
    cert = "CERTIFICADA (G4)" if meta["certified"] else \
        "NO CERTIFICADA — requiere S4"
    return {
        "designacion": meta["desc"].get("objeto", "—"),
        "proyecto": proj.name,
        "fuente": meta["source"],
        "sha": meta["hash"][7:19] + "…",
        "verificacion": cert,
        "nota": extra or "Cotas en mm reales sobre geometría medida — ISO 129",
        "escala": scale,
        "formato": formato,
        "lamina": f"{sheet_no} / {total}",
        "fecha": now_iso()[:10],
        "num_plano": f"{stem.upper()}-{sheet_no:02d}",
    }


def render_pdf(docs_sizes, pdf_path: Path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_pdf import PdfPages
    from ezdxf.addons.drawing import Frontend, RenderContext
    from ezdxf.addons.drawing import config as dcfg
    from ezdxf.addons.drawing.matplotlib import MatplotlibBackend

    cfg = dcfg.Configuration(background_policy=dcfg.BackgroundPolicy.WHITE,
                             color_policy=dcfg.ColorPolicy.BLACK)
    with PdfPages(pdf_path) as pp:
        for doc, (W, H) in docs_sizes:
            fig = plt.figure()
            ax = fig.add_axes([0, 0, 1, 1])
            Frontend(RenderContext(doc), MatplotlibBackend(ax),
                     config=cfg).draw_layout(doc.modelspace(), finalize=True)
            ax.set_aspect("equal", adjustable="box")
            ax.set_xlim(0, W)
            ax.set_ylim(0, H)
            fig.set_size_inches(W / 25.4, H / 25.4)
            pp.savefig(fig)
            plt.close(fig)


def main() -> None:
    import ezdxf
    args = sys.argv[1:]
    proj = project_dir(args[0])

    def opt(name, default=None):
        return args[args.index(name) + 1] if name in args and \
            args.index(name) + 1 < len(args) else default

    source = opt("--fuente", "out/model.glb")
    names = [v.strip() for v in opt("--vistas", ",".join(ORDER)).split(",")
             if v.strip() in ORDER]
    angle = float(opt("--angulo", "25"))
    formato = opt("--formato")
    chapa = opt("--chapa") if "--chapa" in args else None

    th = load_thresholds(proj).get("G6_dibujo", {})
    state = load_state(proj)
    mesh, factor, certified = G.load_project_mesh(proj, source)
    meta = {"desc": __import__("s4_provenance").parse_descripcion(
        proj / "input" / "descripcion.md"),
        "source": source, "hash": sha256_file(proj / source),
        "certified": certified}
    if source != "out/model.glb":
        meta["desc"] = dict(meta["desc"],
                            objeto=f"{Path(source).stem} (sólido CAD, capa user)")

    out_dir = proj / "out" / "drawings"
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = "plano" if source == "out/model.glb" else Path(source).stem
    dxf_path, pdf_path = out_dir / f"{stem}.dxf", out_dir / f"{stem}.pdf"

    # --- lámina 1: vistas ----------------------------------------------------
    views = build_views(mesh, names, angle)
    pos, tw, thh = layout_views(views)
    laminas = [("vistas", (tw, thh))]

    flat = None
    if chapa is not None:
        regions = G.planar_regions(mesh)
        root = None if chapa in ("auto", "", None) else int(chapa)
        flat = G.unfold_sheet(mesh, regions, root_id=root)
        if flat is None:
            print("AVISO: no se encontró cadena de regiones planas plegadas; "
                  "sin lámina de despliegue.")
        else:
            p = flat["contorno"].reshape(-1, 2)
            laminas.append(("chapa", tuple(p.max(axis=0) - p.min(axis=0))))

    total = len(laminas)
    dims_on = {"alzado": ("ancho", "alto"), "planta": ("alto",)}

    # DXF a escala real (todas las láminas, colocadas una junto a otra)
    real = ezdxf.new("R2018", setup=True)
    real.header["$INSUNITS"] = 4  # mm
    # PDF: un doc de papel por lámina
    paper_docs = []
    x_cursor = 0.0
    for i, (kind, (w, h)) in enumerate(laminas, start=1):
        name, W, H, num, den = choose_sheet(w, h, formato)
        scale = scale_label(num, den)
        K = den / num
        extra = "" if kind == "vistas" else "Desarrollo de chapa (sin factor K)"
        pdoc = ezdxf.new("R2018", setup=True)
        pdoc.header["$INSUNITS"] = 4
        for target, KK, origin in ((real, K, (x_cursor / K, 0.0)),
                                   (pdoc, 1.0, (0.0, 0.0))):
            sh = Sheet(target, name, W, H, num, den, KK, origin=origin)
            if kind == "vistas":
                draw_views_sheet(sh, views, pos, tw, thh, dims_on)
            else:
                draw_flat_sheet(sh, flat)
            sh.frame_and_title(title_data(proj, meta, stem, i, total,
                                          scale, name, extra))
        paper_docs.append((pdoc, (W, H)))
        x_cursor += W * K + 50.0
        print(f"Lámina {i}/{total} [{kind}]: {name} escala {scale}")

    real.saveas(dxf_path)
    render_pdf(paper_docs, pdf_path)

    # --- gate G6 (no muta la etapa de la máquina S0–S5) ----------------------
    required = th.get("archivos_requeridos", [f"{stem}.dxf", f"{stem}.pdf"])
    missing = [f for f in (dxf_path.name, pdf_path.name)
               if f in required and not (out_dir / f).stat().st_size]
    missing += [f for f in required if not (out_dir / f).exists()]
    passed = (None if not certified else True) if not missing else False
    verdict = "PASA" if passed else ("SIN_CONTRASTE" if passed is None else "FALLA")
    reasons = ([f"faltan archivos: {sorted(set(missing))}"] if missing else
               ([] if certified else ["escala no certificada: defina factor_escala "
                                      "en descripcion.md y re-ejecute S4"]))
    metrics = {"laminas": total, "vistas": list(views),
               "escala_certificada": certified, "factor_escala": factor,
               "dxf": str(dxf_path.relative_to(proj)).replace("\\", "/"),
               "pdf": str(pdf_path.relative_to(proj)).replace("\\", "/"),
               "hash_dxf": sha256_file(dxf_path), "hash_pdf": sha256_file(pdf_path)}
    state.setdefault("gates", {})["G6"] = {"verdict": verdict, "metrics": metrics,
                                           "reasons": reasons, "ts": now_iso()}
    save_state(proj, state)
    audit(proj, "S6", f"dibujo técnico de {source}", verdict, metrics=metrics)
    print(f"G6 {verdict} — {dxf_path} (escala real) + {pdf_path}")
    if reasons:
        print("  " + "; ".join(reasons))
    if passed is False:
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main()
