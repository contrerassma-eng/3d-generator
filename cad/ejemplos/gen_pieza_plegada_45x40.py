#!/usr/bin/env python3
"""Comprehension sketch: bent L-part 45x40x20, t=3, hole pattern.

Confirmed by user:
  - thickness 3 mm (corrected from 4)
  - legs 45 mm (vertical face) and 40 mm (bottom flange)
  - width ~20 mm
  - vertical face: hole 5 mm from top edge, 5 mm from side edge;
    second hole 17 mm below it; mirrored across width -> 4 holes
  - bottom flange: 2 holes on the centerline

Assumed (to confirm):
  - hole diameter 4 mm
  - bottom holes: 5 mm from the free end, then 17 mm inward (same
    pattern logic as the vertical face)
"""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MplPolygon, Circle
from matplotlib.gridspec import GridSpec

# ---------------- part parameters (mm) ----------------
T = 3.0          # thickness
H = 45.0         # vertical leg height
D = 40.0         # bottom flange depth
W = 20.0         # width
HOLE_D = 4.0     # ASSUMED
R = HOLE_D / 2

# vertical face holes (x across width, z up from bottom), face y=0
FACE_HOLES = [(5.0, H - 5.0), (W - 5.0, H - 5.0),
              (5.0, H - 5.0 - 17.0), (W - 5.0, H - 5.0 - 17.0)]
# bottom flange holes on centerline (x=W/2), y from back of vertical face
FLANGE_HOLES_Y = [D - 5.0, D - 5.0 - 17.0]   # ASSUMED positions
# same holes measured from the free end (iso view has free end at y=0)
FLANGE_HOLES_Y_ISO = [D - y for y in FLANGE_HOLES_Y]

# ---------------- isometric projection ----------------
C30, S30 = np.cos(np.radians(30)), np.sin(np.radians(30))

def iso(p):
    x, y, z = p
    return np.array([(x - y) * C30, (x + y) * S30 + z])

def iso_poly(ax, pts3, **kw):
    pts2 = np.array([iso(p) for p in pts3])
    ax.add_patch(MplPolygon(pts2, closed=True, **kw))
    return pts2

def iso_circle(ax, center, radius, plane, **kw):
    """plane 'y': circle in x-z plane at y=c ; plane 'z': in x-y at z=c."""
    th = np.linspace(0, 2 * np.pi, 64)
    cx, cy, cz = center
    if plane == "y":
        pts3 = [(cx + radius * np.cos(t), cy, cz + radius * np.sin(t)) for t in th]
    else:
        pts3 = [(cx + radius * np.cos(t), cy + radius * np.sin(t), cz) for t in th]
    return iso_poly(ax, pts3, **kw)

# ---------------- 2D dimension helper ----------------
def dim(ax, p1, p2, offset, text, vertical=False, fs=8.5, color="#1a5276"):
    p1, p2 = np.asarray(p1, float), np.asarray(p2, float)
    if vertical:
        a, b = p1 + [offset, 0], p2 + [offset, 0]
        for p, q in ((p1, a), (p2, b)):
            ax.plot([p[0], q[0] + np.sign(offset) * 1], [p[1], q[1]],
                    lw=0.5, color=color)
        ax.annotate("", a, b, arrowprops=dict(arrowstyle="<->", lw=0.8, color=color))
        ax.text(a[0] + np.sign(offset) * 1.2, (a[1] + b[1]) / 2, text, fontsize=fs,
                color=color, ha="left" if offset > 0 else "right", va="center",
                rotation=90)
    else:
        a, b = p1 + [0, offset], p2 + [0, offset]
        for p, q in ((p1, a), (p2, b)):
            ax.plot([p[0], q[0]], [p[1], q[1] + np.sign(offset) * 1],
                    lw=0.5, color=color)
        ax.annotate("", a, b, arrowprops=dict(arrowstyle="<->", lw=0.8, color=color))
        ax.text((a[0] + b[0]) / 2, a[1] + np.sign(offset) * 1.2, text, fontsize=fs,
                color=color, ha="center", va="bottom" if offset > 0 else "top")

# ================= figure =================
fig = plt.figure(figsize=(13, 8), dpi=150)
gs = GridSpec(2, 2, width_ratios=[1.45, 1], height_ratios=[H + 14, D + 14],
              wspace=0.05, hspace=0.12)
axi = fig.add_subplot(gs[:, 0])   # isometric
axf = fig.add_subplot(gs[0, 1])   # front view (45 mm face)
axb = fig.add_subplot(gs[1, 1])   # bottom flange view
for ax in (axi, axf, axb):
    ax.set_aspect("equal"); ax.axis("off")

EDGE = "#212f3d"; FACE_FRONT = "#aed6f1"; FACE_TOP = "#d6eaf8"
FACE_SIDE = "#85c1e9"; HOLE_FILL = "#1b2631"

# ---------- isometric ----------
# Layout: vertical wall at the back (y in [D-T, D]), flange extends toward
# the viewer (y in [0, D], z in [0, T]).  We look into the inner corner, so
# the wall's inner face (4 holes) and the flange top (2 holes) both show.
# right side of the whole L (x = W), the L-profile
Lprof = [(W, 0, 0), (W, 0, T), (W, D - T, T), (W, D - T, H), (W, D, H), (W, D, 0)]
iso_poly(axi, Lprof, facecolor=FACE_SIDE, edgecolor=EDGE, lw=1.1)
# wall inner face (y = D-T) with its 4 holes
iso_poly(axi, [(0, D - T, T), (W, D - T, T), (W, D - T, H), (0, D - T, H)],
         facecolor=FACE_FRONT, edgecolor=EDGE, lw=1.1)
for cx, cz in FACE_HOLES:
    iso_circle(axi, (cx, D - T, cz), R, "y",
               facecolor=HOLE_FILL, edgecolor=EDGE, lw=0.8)
# wall top face (z = H)
iso_poly(axi, [(0, D - T, H), (W, D - T, H), (W, D, H), (0, D, H)],
         facecolor=FACE_TOP, edgecolor=EDGE, lw=1.1)
# flange top face (z = T) with its 2 centerline holes
iso_poly(axi, [(0, 0, T), (W, 0, T), (W, D - T, T), (0, D - T, T)],
         facecolor=FACE_TOP, edgecolor=EDGE, lw=1.1)
for y in FLANGE_HOLES_Y_ISO:
    iso_circle(axi, (W / 2, y, T), R, "z",
               facecolor=HOLE_FILL, edgecolor=EDGE, lw=0.8)
# flange front end face (y = 0), shows the thickness
iso_poly(axi, [(0, 0, 0), (W, 0, 0), (W, 0, T), (0, 0, T)],
         facecolor="#7fb3d5", edgecolor=EDGE, lw=1.1)

# labels on isometric
def iso_label(p3, text, dxy, color="#1a5276"):
    p = iso(p3)
    axi.annotate(text, p, p + np.array(dxy), fontsize=9.5, color=color,
                 arrowprops=dict(arrowstyle="-", lw=0.7, color=color),
                 ha="center", va="center")

iso_label((0, D - T, H * 0.55), "45", (-10, 4))
iso_label((W / 2, 0, 0), "20", (3, -6))
iso_label((0, D * 0.45, T), "40", (-11, -4))
iso_label((W * 0.75, 0, T / 2), "t = 3", (10, -3))
axi.set_title("Isometric view — bent part (all mm)", fontsize=12, pad=6)
axi.relim(); axi.autoscale_view()
axi.set_xlim(axi.get_xlim()[0] - 8, axi.get_xlim()[1] + 8)

# ---------- front view (45 mm face) ----------
axf.add_patch(MplPolygon([(0, 0), (W, 0), (W, H), (0, H)], closed=True,
                         facecolor=FACE_FRONT, edgecolor=EDGE, lw=1.2))
axf.plot([0, W], [T, T], lw=0.7, ls="--", color=EDGE)  # bend line
for cx, cz in FACE_HOLES:
    axf.add_patch(Circle((cx, cz), R, facecolor="white", edgecolor=EDGE, lw=1))
    axf.plot([cx - R - 1.5, cx + R + 1.5], [cz, cz], lw=0.4, color="#7b241c")
    axf.plot([cx, cx], [cz - R - 1.5, cz + R + 1.5], lw=0.4, color="#7b241c")
dim(axf, (0, H), (5, H), 6, "5")
dim(axf, (W - 5, H), (W, H), 6, "5")
dim(axf, (0, 0), (0, H), -6, "45", vertical=True)
dim(axf, (W, H - 5), (W, H), 5, "5", vertical=True)
dim(axf, (W, H - 5 - 17), (W, H - 5), 5, "17", vertical=True)
dim(axf, (0, 0), (W, 0), -6, "20")
axf.text(W / 2, (H - 5 + H - 5 - 17) / 2, "Ø4*\n×4 mirrored", fontsize=8,
         ha="center", va="center", color="#7b241c")
axf.set_title("Front view — 45 mm face", fontsize=10, pad=4)
axf.relim(); axf.autoscale_view()

# ---------- bottom flange view (top view) ----------
axb.add_patch(MplPolygon([(0, 0), (W, 0), (W, D), (0, D)], closed=True,
                         facecolor=FACE_TOP, edgecolor=EDGE, lw=1.2))
axb.plot([0, W], [T, T], lw=0.7, ls="--", color=EDGE)  # bend line
axb.plot([W / 2, W / 2], [-3, D + 3], lw=0.6, ls="-.", color="#7b241c")  # centerline
for y in FLANGE_HOLES_Y:
    axb.add_patch(Circle((W / 2, y), R, facecolor="white", edgecolor=EDGE, lw=1))
    axb.plot([W / 2 - R - 1.5, W / 2 + R + 1.5], [y, y], lw=0.4, color="#7b241c")
dim(axb, (0, 0), (0, D), -6, "40", vertical=True)
y1, y2 = FLANGE_HOLES_Y
dim(axb, (W, y1), (W, D), 5, "5*", vertical=True)
dim(axb, (W, y2), (W, y1), 5, "17*", vertical=True)
axb.text(W / 2, (y1 + y2) / 2, "Ø4*\non ℄", fontsize=8,
         ha="center", va="center", color="#7b241c")
axb.text(1.5, T + 1.5, "bend", fontsize=7, ha="left", va="bottom",
         color="#566573")
axb.set_title("Bottom flange — 40 mm leg (top view)", fontsize=10, pad=4)
axb.relim(); axb.autoscale_view()

fig.suptitle("Bent part 45 × 40 × 20 mm, t = 3 mm — comprehension check",
             fontsize=13, y=0.985)
fig.text(0.5, 0.015,
         "* assumed values, please confirm: hole Ø = 4 mm; bottom-flange holes at "
         "5 mm from the free end and 17 mm apart (same pattern as the face).",
         fontsize=9, ha="center", color="#7b241c")
out = "/tmp/claude-0/-home-user/316fb065-df6d-5264-b06c-484bb72fe3e3/scratchpad/bent_part_check.png"
fig.savefig(out, bbox_inches="tight", facecolor="white")
print(out)
