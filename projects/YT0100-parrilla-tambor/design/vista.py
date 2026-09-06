"""Vistas rápidas del conjunto (PNG sombreado) para revisar el modelo.

uso: python design/vista.py [iso|iso2|alzado|planta|perfil ...]
"""
from __future__ import annotations

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import trimesh
from matplotlib.collections import PolyCollection

PROJ = Path(__file__).resolve().parent.parent
VISTAS = {
    "iso":     (np.array([-1.0, -1.4, 0.75]), (0, 0, 1)),
    "iso2":    (np.array([1.0, -1.2, 0.6]), (0, 0, 1)),
    "alzado":  (np.array([0.0, -1.0, 0.0]), (0, 0, 1)),
    "perfil":  (np.array([-1.0, 0.0, 0.0]), (0, 0, 1)),
    "planta":  (np.array([0.0, 0.0, 1.0]), (0, 1, 0)),
}


def render(scene_path: Path, vista: str, out: Path, ancho=1500):
    esc = trimesh.load(str(scene_path))
    mallas = list(esc.geometry.values()) if isinstance(esc, trimesh.Scene) else [esc]
    V, F, C = [], [], []
    off = 0
    for m in mallas:
        V.append(m.vertices)
        F.append(m.faces + off)
        col = np.asarray(m.visual.face_colors, dtype=float)[:, :3] / 255.0
        if col.shape[0] != len(m.faces):
            col = np.tile([[0.55, 0.58, 0.6]], (len(m.faces), 1))
        C.append(col)
        off += len(m.vertices)
    V, F, C = np.vstack(V), np.vstack(F), np.vstack(C)

    d, up = VISTAS[vista]
    d = d / np.linalg.norm(d)
    right = np.cross(d, up); right /= np.linalg.norm(right)
    upv = np.cross(right, d)
    P = V @ np.column_stack([right, upv])
    prof = V @ d
    tris = P[F]
    z = prof[F].mean(axis=1)
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    ln = np.linalg.norm(n, axis=1, keepdims=True); ln[ln == 0] = 1
    n = n / ln
    luz = np.array([-0.35, -0.75, 0.56]); luz /= np.linalg.norm(luz)
    lam = np.clip(np.abs(n @ luz), 0, 1)
    color = np.clip(C * (0.30 + 0.70 * lam)[:, None], 0, 1)
    # `d` apunta de la escena HACIA el observador ⇒ mayor V·d = más cerca.
    # Pintor: primero lo lejano (menor V·d).
    orden = np.argsort(z)

    mn, mx = P.min(axis=0), P.max(axis=0)
    ext = mx - mn
    fig_w = ancho / 100
    fig = plt.figure(figsize=(fig_w, fig_w * ext[1] / ext[0]), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_axis_off()
    ax.set_facecolor("#eceff1")
    ax.add_collection(PolyCollection(tris[orden], facecolors=color[orden],
                                     edgecolors="none", antialiased=False))
    ax.set_xlim(mn[0] - 20, mx[0] + 20); ax.set_ylim(mn[1] - 20, mx[1] + 20)
    ax.set_aspect("equal")
    fig.savefig(out, facecolor="#eceff1")
    plt.close(fig)
    return out


if __name__ == "__main__":
    src = PROJ / "out" / "cad" / "parrilla_tambor.glb"
    dst = PROJ / "out" / "vistas"
    dst.mkdir(parents=True, exist_ok=True)
    for v in (sys.argv[1:] or ["iso", "alzado", "perfil", "planta"]):
        print("→", render(src, v, dst / f"vista_{v}.png").relative_to(PROJ))
