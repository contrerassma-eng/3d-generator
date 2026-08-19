#!/usr/bin/env python3
"""Omniwheel table v2: flat-sandwich cover.
- base quarters: 182x245x6, bracket holes + separator bolt holes
- top quarters: 182x245x4 FLAT sheet, wheel windows + countersunk bolt holes
- hex separators: AF12 (AF9 at Y-edges) x 56 tall, 4.6 through-hole,
  bolted M4x70 top-sheet -> post -> base -> nut.
Heights: wheel axle 40, tangent 65, top surface 60 (sheet 4 + post 56).
Posts sit on Y-lanes (clear of brackets/wheels by construction); per-quarter
posts inset 8 mm from seams so no bolt hole lands on a cut line.
"""
import numpy as np, trimesh

PITCH = 90.0; XC = [65.0, 155.0, 245.0, 335.0]; YC = [20.0 + 90 * j for j in range(6)]
PLATE_X, PLATE_Y = 364.0, 490.0; QX, QY = 182.0, 245.0
PLATE_T, TOP_T, POST_H = 6.0, 4.0, 56.0
WIN_X, WIN_Y = 45.0, 40.0
HOLE_D = 4.5; POST_HOLE = 4.6; CSK_D = 9.0
HOLE_DX = [-55.0, -38.0, -12.0, +5.0]

# separator positions (full-plate coords): per-quarter 3x3 grid + Y-edge posts
POSTS = []
for xs in ([8.0, 91.5, 174.0], [190.0, 272.5, 356.0]):
    for ys in ([65.0, 155.0, 237.0], [253.0, 335.0, 425.0]):
        POSTS += [(x, y, 12.0) for x in xs for y in ys]
POSTS += [(91.5, 5.0, 9.0), (271.5, 5.0, 9.0), (91.5, 485.0, 9.0), (271.5, 485.0, 9.0)]
assert len(POSTS) == 40

def box(x0, x1, y0, y1, z0, z1):
    b = trimesh.creation.box(extents=[x1 - x0, y1 - y0, z1 - z0])
    b.apply_translation([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])
    return b

def hole(cx, cy, r, z0, z1):
    c = trimesh.creation.cylinder(radius=r, height=(z1 - z0) + 2, sections=64)
    c.apply_translation([cx, cy, (z0 + z1) / 2])
    return c

def hexprism(cx, cy, af, h):
    r = af / np.sqrt(3)  # circumscribed radius from across-flats
    ang = np.arange(6) * np.pi / 3 + np.pi / 6
    v2 = np.c_[r * np.cos(ang), r * np.sin(ang)]
    faces = np.array([[0, i, i + 1] for i in range(1, 5)])
    m = trimesh.creation.extrude_triangulation(v2, faces, height=h)
    m.apply_translation([cx, cy, 0])
    return m

quarters = {1: (0, 0), 2: (QX, 0), 3: (0, QY), 4: (QX, QY)}
holes_bracket = [(xc + dx, yc) for xc in XC for yc in YC for dx in HOLE_DX]

# ---------------- base quarters (bracket + separator holes) ----------------
for q, (ox, oy) in quarters.items():
    body = box(0, QX, 0, QY, 0, PLATE_T)
    cuts = [hole(hx - ox, hy - oy, HOLE_D / 2, -1, PLATE_T + 1)
            for hx, hy in holes_bracket if ox <= hx < ox + QX and oy <= hy < oy + QY]
    cuts += [hole(px - ox, py - oy, HOLE_D / 2, -1, PLATE_T + 1)
             for px, py, af in POSTS if ox <= px < ox + QX and oy <= py < oy + QY]
    part = body.difference(cuts)
    assert part.is_volume
    part.export(f"base_Q{q}.stl")
    print(f"base_Q{q}: {len(cuts)} holes, vol {part.volume/1000:.0f} cm3")

# ---------------- flat top quarters ----------------
for q, (ox, oy) in quarters.items():
    xa, xb, ya, yb = ox, ox + QX, oy, oy + QY
    body = box(xa, xb, ya, yb, 0, TOP_T)   # local z 0..4 (assembled at 56..60)
    cuts = [box(xc - WIN_X / 2, xc + WIN_X / 2, yc - WIN_Y / 2, yc + WIN_Y / 2, -1, TOP_T + 1)
            for xc in XC for yc in YC
            if xa - WIN_X / 2 < xc < xb + WIN_X / 2 and ya - WIN_Y / 2 < yc < yb + WIN_Y / 2]
    for px, py, af in POSTS:
        if xa <= px < xb and ya <= py < yb:
            cuts.append(hole(px, py, HOLE_D / 2, -1, TOP_T + 1))
            # 90-deg countersink: cone base D9 exactly at the top face, apex down
            cone = trimesh.creation.cone(radius=CSK_D / 2, height=CSK_D / 2, sections=64)
            cone.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))
            cone.apply_translation([px, py, TOP_T])
            cuts.append(cone)
    part = body.difference(cuts)
    assert part.is_volume
    part.apply_translation([-ox, -oy, 0])
    part.export(f"tapaplana_Q{q}.stl")
    print(f"tapaplana_Q{q}: vol {part.volume/1000:.0f} cm3")

# ---------------- posts, LYING DOWN on a hex flat (fast to print) ----------
def hexprism_flat(af, h):
    """hex prism, vertices at 0/60/... deg so a flat faces -y; axis Z."""
    r = af / np.sqrt(3)
    ang = np.arange(6) * np.pi / 3
    v2 = np.c_[r * np.cos(ang), r * np.sin(ang)]
    return trimesh.creation.extrude_triangulation(v2, np.array([[0, i, i + 1] for i in range(1, 5)]), height=h)

def lying_post(af):
    p = hexprism_flat(af, POST_H).difference(hole(0, 0, POST_HOLE / 2, -1, POST_H + 1))
    p.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    p.apply_translation(-p.bounds[0])  # rest on the bed at origin
    return p

for plate_i, batch in enumerate([[(12.0, 20), (9.0, 3)], [(12.0, 20), (9.0, 3)]], 1):
    parts, i = [], 0
    for af, n in batch:
        for _ in range(n):
            p = lying_post(af)
            p.apply_translation([(i % 8) * 20.0, (i // 8) * 62.0, 0])
            parts.append(p)
            i += 1
    plate = trimesh.util.concatenate(parts)
    plate.export(f"postes_hex_p{plate_i}.stl")
    bb = plate.bounds
    print(f"postes_hex_p{plate_i}: {i} postes tumbados, bbox {np.round(bb[1]-bb[0],1)}, vol {plate.volume/1000:.0f} cm3")
