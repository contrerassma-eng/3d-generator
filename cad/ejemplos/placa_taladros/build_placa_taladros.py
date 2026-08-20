#!/usr/bin/env python3
"""Placa de taladros 2 mm: patron 5x13, paso 90 x 17.6, agujeros O3.2 (M3),
margen 8, partida en x=233 (3+2 columnas) para caber en la CC2."""
import numpy as np, trimesh

T, M = 2.0, 8.0
PX, PY, NX, NY, R = 90.0, 17.6, 5, 13, 1.6
W = (NX - 1) * PX + 2 * M
H = (NY - 1) * PY + 2 * M
CUT = 2 * PX + M + PX / 2

def box(x0, x1, y0, y1):
    b = trimesh.creation.box(extents=[x1 - x0, y1 - y0, T])
    b.apply_translation([(x0 + x1) / 2, (y0 + y1) / 2, T / 2])
    return b

def hole(cx, cy):
    c = trimesh.creation.cylinder(radius=R, height=T + 2, sections=48)
    c.apply_translation([cx, cy, T / 2])
    return c

holes = [(M + i * PX, M + j * PY) for i in range(NX) for j in range(NY)]
for name, x0, x1 in [("placa_taladros_A", 0.0, CUT), ("placa_taladros_B", CUT, W)]:
    part = box(x0, x1, 0, H).difference([hole(x, y) for x, y in holes if x0 < x < x1])
    assert part.is_volume
    part.apply_translation([-x0, 0, 0])
    part.export(f"{name}.stl")
    print(name, part.bounds[1] - part.bounds[0])
