"""Planta y elevacion acotadas de la unidad YOLO-NOLABEL-GIRO90 (concepto) y calculo de cadencia.

Lee projects/YOLO-NOLABEL-GIRO90/parametros_unidad.json y escribe PNG + SVG en la carpeta --out.
Uso: python tools/gen_nolabel_giro90.py --out <carpeta>
"""
import os, json, argparse
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Circle, FancyArrowPatch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARAM = os.path.join(ROOT, "projects", "YOLO-NOLABEL-GIRO90", "parametros_unidad.json")

COL = {"M1": "#4d7ea8", "M2": "#2f9e8f", "M3": "#8a6fb3", "M4": "#c98b2b", "M5": "#4d7ea8", "M6": "#8f9aa6"}
INK = "#1d2733"


def cadencia(P):
    c, v = P["caja_ref"], P["velocidad"]
    vl = v["linea_m_min"] / 60.0
    ve = vl * v["enhancer_factor"]
    vlat = v["omni_lateral_m_min"] / 60.0
    L, W = c["largo"] / 1000, c["ancho"] / 1000
    omni = next(m for m in P["modulos"] if m["id"] == "M5")
    S = omni["largo"] / 1000
    t_entra = L / ve                                  # entrar completa al omni
    t_giro = (S + W) / 2 / vlat + 0.25                # desplazamiento lateral hasta despejar + 0,25 s de conmutacion
    occ_giro = t_entra + t_giro
    occ_recto = (L + S) / ve
    paso_giro = ve * occ_giro                         # paso minimo entre cajas en el enhancer
    return {
        "v_linea_m_s": round(vl, 3), "v_enhancer_m_s": round(ve, 3),
        "ocupacion_giro_s": round(occ_giro, 2), "ocupacion_recto_s": round(occ_recto, 2),
        "cadencia_todas_giran_cpm": round(60 / occ_giro, 1),
        "cadencia_ninguna_gira_cpm": round(60 / occ_recto, 1),
        "gap_min_enhancer_giro_mm": round((paso_giro - L) * 1000),
        "gap_min_linea_giro_mm": round((paso_giro * vl / ve - L) * 1000),
    }


def dim(ax, x0, x1, y, txt, off=0):
    ax.annotate("", xy=(x0, y), xytext=(x1, y), arrowprops=dict(arrowstyle="<->", color=INK, lw=0.8))
    ax.text((x0 + x1) / 2, y + 18 + off, txt, ha="center", va="bottom", fontsize=7, color=INK)


def planta(P, out):
    fig, ax = plt.subplots(figsize=(16, 6.2))
    g = P["gabinete"]
    ax.add_patch(FancyBboxPatch((g["x0"], g["y0"]), g["largo"], g["ancho"], boxstyle="round,pad=0,rounding_size=120",
                                fill=False, ls="--", lw=1.2, ec="#7a8794"))
    ax.text(g["x0"] + 30, g["y0"] + g["ancho"] - 60, "Gabinete (parametrizado) %d x %d x %d" % (g["largo"], g["ancho"], g["alto"]),
            fontsize=7.5, color="#5a6570")
    pr = g["protuberancia"]
    ax.add_patch(Rectangle((g["x0"] + (g["largo"] - pr["largo"]) / 2, g["y0"] - pr["ancho"]), pr["largo"], pr["ancho"],
                           fill=False, ls=":", ec="#7a8794"))
    ax.text(g["x0"] + g["largo"] + 40, g["y0"] - pr["ancho"] / 2, "<- protuberancia: botonera y baliza", ha="left", va="center", fontsize=6.5, color="#5a6570")
    for m in P["modulos"]:
        y0 = -m["ancho"] / 2
        ax.add_patch(Rectangle((m["x0"], y0), m["largo"], m["ancho"], fc=COL[m["id"]], alpha=0.22, ec=COL[m["id"]], lw=1.4))
        ax.text(m["x0"] + m["largo"] / 2, 0, "%s\n%s\n%d x %d" % (m["id"], m["nombre"], m["largo"], m["ancho"]),
                ha="center", va="center", fontsize=7, color=INK)
        dim(ax, m["x0"], m["x0"] + m["largo"], -960, "%d" % m["largo"])
    tb = next(m for m in P["modulos"] if m["id"] == "M2")
    for yb in (-90, 90):
        ax.add_patch(Rectangle((tb["x0"], yb - 40), tb["largo"], 80, fc="#1f3a5a", alpha=0.35, ec="none"))
    c = P["camara"]
    ax.add_patch(Circle((c["x"], 0), 45, fc="#0d0d0d", ec="white", lw=1))
    ax.text(c["x"], -120, "camara\ninferior", ha="center", fontsize=6.5, color=INK)
    nl = P["nolabel"]
    ax.add_patch(Rectangle((nl["x_cabezal"] - 60, 305), 120, 160, fc="#f4f4f4", ec="#c62828", lw=1.5))
    ax.text(nl["x_cabezal"], 500, "cabezal\nNoLabel", ha="center", fontsize=6.5, color="#c62828")
    for xs in nl["x_secadores"]:
        ax.add_patch(Rectangle((xs - 75, 330), 150, 40, angle=0, fc="#3a6fd8", alpha=0.6, ec="none"))
    ax.text(nl["x_secadores"][1], 395, "3 secadores UV", ha="center", fontsize=6.5, color="#3a6fd8")
    cj = P["caja_ref"]
    yj = P["frame_estandar"]["ancho_util"] / 2
    for xc in (300, 1500, 2700, 4000):
        ax.add_patch(Rectangle((xc, yj - cj["ancho"]), cj["largo"], cj["ancho"], fc="#d8b27a", alpha=0.55, ec="#8a6a3a", lw=0.8))
    ax.plot([0, 3900], [yj, yj], color="#c62828", lw=0.8, ls="-.")
    ax.text(40, yj + 12, "referencia de justificado (+Y): cara impresa", fontsize=6.5, color="#c62828")
    for s in P["sensores"]:
        ax.plot([s["x"], s["x"]], [-330, 330], color="#e0a000", lw=0.8)
        ax.text(s["x"], 345 if s["id"] not in ("PE3",) else 560, s["id"], ha="center", fontsize=6.5, color="#9a6b00")
    om = next(m for m in P["modulos"] if m["id"] == "M5")
    sgn = -1 if P["salida_giro"] == "-Y" else 1
    ax.add_patch(FancyArrowPatch((om["x0"] + om["largo"] / 2, 0), (om["x0"] + om["largo"] / 2, sgn * 620),
                                 arrowstyle="-|>", mutation_scale=16, color="#2e7d32", lw=1.6))
    ax.text(om["x0"] + om["largo"] / 2 + 40, sgn * 650, "salida a 90\n(selectiva)", fontsize=7, color="#2e7d32", va="center")
    ax.add_patch(FancyArrowPatch((5700, 0), (6300, 0), arrowstyle="-|>", mutation_scale=16, color="#2e7d32", lw=1.6))
    tot = om["x0"] + om["largo"]
    dim(ax, 0, tot, -1080, "hasta el omni 90: %d" % tot)
    dim(ax, 0, 6260, -1200, "con salida recta: 6260")
    ax.set_xlim(-150, 6450); ax.set_ylim(-1260, 1000); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("YOLO-NOLABEL-GIRO90 · planta (x2 unidades) · cotas en mm · flujo ->", fontsize=10, color=INK, loc="left")
    for ext in ("png", "svg"):
        fig.savefig(os.path.join(out, "planta_unidad." + ext), dpi=170, bbox_inches="tight")
    plt.close(fig)


def elevacion(P, out):
    fig, ax = plt.subplots(figsize=(16, 4.6))
    h = P["altura_trabajo"]
    ax.plot([-100, 6400], [0, 0], color=INK, lw=1)
    g = P["gabinete"]
    ax.add_patch(FancyBboxPatch((g["x0"], 0), g["largo"], g["alto"], boxstyle="round,pad=0,rounding_size=120",
                                fill=False, ls="--", ec="#7a8794"))
    pr = g["protuberancia"]
    ax.add_patch(Rectangle((g["x0"] + (g["largo"] - pr["largo"]) / 2, pr["z_centro"] - pr["alto"] / 2), pr["largo"], pr["alto"],
                           fill=False, ls=":", ec="#7a8794"))
    ax.add_patch(Rectangle((g["x0"] + g["largo"] / 2 - 25, g["alto"]), 50, 200, fc="#e53935", ec="none"))
    ax.text(g["x0"] + g["largo"] / 2 + 60, g["alto"] + 120, "baliza", fontsize=6.5)
    for m in P["modulos"]:
        ax.add_patch(Rectangle((m["x0"], h - 190), m["largo"], 190, fc=COL[m["id"]], alpha=0.25, ec=COL[m["id"]]))
        ax.text(m["x0"] + m["largo"] / 2, h - 95, m["id"], ha="center", va="center", fontsize=7)
        for xp in (m["x0"] + 60, m["x0"] + m["largo"] - 60):
            ax.plot([xp, xp], [0, h - 190], color="#6b7580", lw=2)
    cj = P["caja_ref"]
    for xc in (300, 1500, 2700, 4000):
        ax.add_patch(Rectangle((xc, h), cj["largo"], cj["alto"], fc="#d8b27a", alpha=0.6, ec="#8a6a3a"))
    c = P["camara"]
    ax.add_patch(Rectangle((c["x"] - 45, h - c["z_bajo_banda"] - 140), 90, 140, fc="#111", ec="none"))
    ax.annotate("", xy=(c["x"], h), xytext=(c["x"], h - c["z_bajo_banda"]), arrowprops=dict(arrowstyle="->", color="#0d6efd"))
    nl = P["nolabel"]
    zc = h + 30 + nl["altura_impresion"] / 2
    ax.add_patch(Rectangle((nl["x_cabezal"] - 60, zc - 60), 120, 120, fc="#f4f4f4", ec="#c62828", lw=1.5))
    ax.text(nl["x_cabezal"], zc + 80, "cabezal (108 mm de impresion)", ha="center", fontsize=6.5, color="#c62828")
    ax.annotate("", xy=(-60, h), xytext=(-60, 0), arrowprops=dict(arrowstyle="<->", color=INK, lw=0.8))
    ax.text(-80, h / 2, "%d" % h, rotation=90, ha="right", va="center", fontsize=7)
    ax.annotate("", xy=(g["x0"] + g["largo"] + 80, g["alto"]), xytext=(g["x0"] + g["largo"] + 80, 0),
                arrowprops=dict(arrowstyle="<->", color=INK, lw=0.8))
    ax.text(g["x0"] + g["largo"] + 100, g["alto"] / 2, "%d" % g["alto"], rotation=90, va="center", fontsize=7)
    ax.set_xlim(-200, 6450); ax.set_ylim(-50, 1850); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("YOLO-NOLABEL-GIRO90 · elevacion desde el lado operador (-Y) · cotas en mm", fontsize=10, color=INK, loc="left")
    for ext in ("png", "svg"):
        fig.savefig(os.path.join(out, "elevacion_unidad." + ext), dpi=170, bbox_inches="tight")
    plt.close(fig)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    P = json.load(open(PARAM, encoding="utf-8"))
    planta(P, a.out)
    elevacion(P, a.out)
    r = cadencia(P)
    json.dump(r, open(os.path.join(a.out, "cadencia.json"), "w", encoding="utf-8"), indent=1)
    print(json.dumps(r, indent=1))
