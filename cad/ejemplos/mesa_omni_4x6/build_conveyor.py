#!/usr/bin/env python3
"""Omniwheel diverter table 4x6, pitch 90: base plate (4 equal quarters,
bracket mounting holes) + cover (4 equal quarters, wheel windows).

Assumptions (parametrized, confirm with user):
  wheel dia 50, width <=38 (40 between bracket walls), axle height 40
  (top hole row of the L-bracket) -> wheel tangent at 65 over the plate;
  cover surface at 60 (wheel pokes 5 mm); plate holes 4.5 for M4.
"""
import numpy as np, trimesh

PITCH = 90.0
COLS, ROWS = 4, 6            # X columns (axle dir), Y rows
WHEEL_D, WHEEL_W = 50.0, 38.0
HOLE_D = 4.5                 # M4 clearance in plates
PLATE_T = 6.0
COVER_TOP, COVER_T = 60.0, 3.0     # top surface height over plate, sheet/wall thickness
WIN_X, WIN_Y = 45.0, 40.0
PLATE_X, PLATE_Y = 364.0, 490.0
QX, QY = PLATE_X / 2, PLATE_Y / 2  # 182 x 245 quarters
X0 = 65.0                    # first wheel column
Y0 = 20.0                    # first wheel row
XC = [X0 + i * PITCH for i in range(COLS)]        # 65,155,245,335
YC = [Y0 + j * PITCH for j in range(ROWS)]        # 20..470

# bracket pair per wheel, same orientation, walls facing at +/-20 from center:
# bracket A flange [xc-60, xc-20] (wall at [-23,-20]); B flange [xc-17, xc+23]
# flange holes 5 & 22 from free end -> plate holes per wheel (on the row line):
HOLE_DX = [-55.0, -38.0, -12.0, +5.0]
FOOT = [(-60.0, -20.0), (-17.0, +23.0)]           # flange footprints in X, width 20 in Y

def box(x0, x1, y0, y1, z0, z1):
    b = trimesh.creation.box(extents=[x1 - x0, y1 - y0, z1 - z0])
    b.apply_translation([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])
    return b

def hole(cx, cy, r, z0, z1):
    c = trimesh.creation.cylinder(radius=r, height=(z1 - z0) + 2, sections=64)
    c.apply_translation([cx, cy, (z0 + z1) / 2])
    return c

quarters = {1: (0, 0), 2: (QX, 0), 3: (0, QY), 4: (QX, QY)}  # local origin of each

# ---------------- base quarters ----------------
holes_all = [(xc + dx, yc) for xc in XC for yc in YC for dx in HOLE_DX]
for q, (ox, oy) in quarters.items():
    body = box(0, QX, 0, QY, 0, PLATE_T)
    cuts = [hole(hx - ox, hy - oy, HOLE_D / 2, -1, PLATE_T + 1)
            for hx, hy in holes_all if ox <= hx < ox + QX and oy <= hy < oy + QY]
    part = body.difference(cuts)
    assert part.is_volume
    n = sum(1 for hx, hy in holes_all if ox <= hx < ox + QX and oy <= hy < oy + QY)
    part.export(f"base_Q{q}.stl")
    print(f"base_Q{q}: {n} holes, vol {part.volume/1000:.0f} cm3")

# ---------------- cover quarters ----------------
WALL_H = COVER_TOP - COVER_T   # 57, walls stand on the base plate
YLANES = [65.0, 155.0, 335.0, 425.0]   # clear lanes between rows (ribs)
XLANES = [91.5, 271.5]                 # clear gaps between column footprints

def seg_boxes_x(y0w, y1w, xa, xb, notches):
    """wall along X between xa..xb, minus notch intervals (full height)."""
    pts, out = sorted(notches), []
    lo = xa
    for a, b in pts:
        a, b = max(a, xa), min(b, xb)
        if b <= a:
            continue  # notch entirely outside this quarter
        if a > lo: out.append((lo, a))
        lo = max(lo, b)
    if lo < xb: out.append((lo, xb))
    return [box(a, b, y0w, y1w, 0, WALL_H) for a, b in out if b - a > 1]

for q, (ox, oy) in quarters.items():
    xa, xb, ya, yb = ox, ox + QX, oy, oy + QY
    parts = [box(xa, xb, ya, yb, WALL_H, COVER_TOP)]           # top sheet
    # X-edge walls (run along Y): outer plate edges and seam edges
    if xa == 0:
        parts.append(box(0, 3, ya, yb, 0, WALL_H))
    else:  # seam edge at x=182: inset to clear the col-3 flange that starts at 185
        parts.append(box(xa, xa + 2.5, ya, yb, 0, WALL_H))
    parts.append(box(xb - 3, xb, ya, yb, 0, WALL_H))  # x=182 seam wall clears col-2 (ends 178)
    # Y-edge walls (run along X): outer edges get notches over wheel columns
    notches = [(xc - WIN_X / 2, xc + WIN_X / 2) for xc in XC]
    if ya == 0:
        parts += seg_boxes_x(0, 3, xa, xb, notches)
    else:
        parts.append(box(xa, xb, ya, ya + 3, 0, WALL_H))
    if yb == PLATE_Y:
        parts += seg_boxes_x(PLATE_Y - 3, PLATE_Y, xa, xb, notches)
    else:
        parts.append(box(xa, xb, yb - 3, yb, 0, WALL_H))
    # internal stiffening ribs in clear lanes
    for yl in YLANES:
        if ya + 5 < yl < yb - 5:
            parts.append(box(xa, xb, yl - 1.5, yl + 1.5, 0, WALL_H))
    for xl in XLANES:
        if xa + 5 < xl < xb - 5:
            parts.append(box(xl - 1.5, xl + 1.5, ya, yb, 0, WALL_H))
    body = parts[0]
    body = body.union(parts[1:])
    # windows over wheels (cut everything in the window prism)
    wins = [box(xc - WIN_X / 2, xc + WIN_X / 2, yc - WIN_Y / 2, yc + WIN_Y / 2,
                WALL_H - 1, COVER_TOP + 1) for xc in XC for yc in YC
            if xa - WIN_X / 2 < xc < xb + WIN_X / 2 and ya - WIN_Y / 2 < yc < yb + WIN_Y / 2]
    part = body.difference(wins)
    assert part.is_volume
    part.apply_translation([-ox, -oy, 0])
    part.export(f"tapa_Q{q}.stl")
    bb = part.bounds
    print(f"tapa_Q{q}: vol {part.volume/1000:.0f} cm3, bbox {np.round(bb[1]-bb[0],1)}")
