#!/usr/bin/env python3
"""Rubilar2: U motor mount (from user's annotated render + Apoyo.stl topology).
- base 40x40x5, corner bolt holes 4.5 inset 7 mm (as original), flat pads,
  >=10 mm head room above (no gussets near corners)
- walls 20 wide x 45 tall x 4 thick, inner gap 19.5 (motor 19)
- wall holes, both walls identical (coaxial): A 5 from left edge / 5 below top,
  B 17 below A, C 15 from left edge (5 from right), centered in the 17 span
- one 45-deg gusset per wall, outer face, centered on width
Holes 4 mm in walls (assumed; confirm M3 if motor screws), 4.5 in base corners.
"""
import numpy as np, trimesh

BASE, BASE_T = 40.0, 5.0
WALL_W, WALL_H, WALL_T, GAP = 20.0, 45.0, 4.0, 19.5
HOLE_R, CORNER_R, CORNER_IN = 2.0, 2.25, 5.5
TOP = BASE_T + WALL_H                      # 50
X1 = (BASE - GAP - 2 * WALL_T) / 2         # 6.25
W1 = (X1, X1 + WALL_T)                     # 6.25..10.25
W2 = (BASE - X1 - WALL_T, BASE - X1)       # 29.75..33.75
Y0, Y1 = (BASE - WALL_W) / 2, (BASE + WALL_W) / 2   # 10..30

def box(x0, x1, y0, y1, z0, z1):
    b = trimesh.creation.box(extents=[x1 - x0, y1 - y0, z1 - z0])
    b.apply_translation([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])
    return b

def cyl(r, length, center, axis):
    c = trimesh.creation.cylinder(radius=r, height=length, sections=64)
    rot = {"z": None, "x": [0, 1, 0], "y": [1, 0, 0]}[axis]
    if rot is not None:
        c.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, rot))
    c.apply_translation(center)
    return c

def gusset(tri_xz, y0, width):
    """triangular prism: triangle in (x,z), extruded along y."""
    g = trimesh.creation.extrude_triangulation(
        vertices=np.array(tri_xz), faces=np.array([[0, 1, 2]]), height=width)
    g.vertices = g.vertices[:, [0, 2, 1]] + [0, y0, 0]
    trimesh.repair.fix_normals(g)
    return g

solid = box(0, BASE, 0, BASE, 0, BASE_T)
solid = solid.union(box(*W1, Y0, Y1, BASE_T, TOP)).union(box(*W2, Y0, Y1, BASE_T, TOP))
G = 6.0  # gusset leg
solid = solid.union(gusset([[W1[0], BASE_T], [W1[0], BASE_T + G], [W1[0] - G, BASE_T]], 15.0, 10.0))
solid = solid.union(gusset([[W2[1], BASE_T], [W2[1], BASE_T + G], [W2[1] + G, BASE_T]], 15.0, 10.0))

zA = TOP - 5.0
zB = zA - 17.0
zC = (zA + zB) / 2
holes = [(Y0 + 5.0, zA), (Y0 + 5.0, zB), (Y0 + 15.0, zC)]
cuts = [cyl(HOLE_R, BASE + 4, [BASE / 2, y, z], "x") for y, z in holes]
for cx in (CORNER_IN, BASE - CORNER_IN):
    for cy in (CORNER_IN, BASE - CORNER_IN):
        cuts.append(cyl(CORNER_R, BASE_T + 4, [cx, cy, BASE_T / 2], "z"))
part = solid.difference(cuts)
assert part.is_volume
# head-room check: 10 mm clear cylinder over each corner pad
for cx in (CORNER_IN, BASE - CORNER_IN):
    for cy in (CORNER_IN, BASE - CORNER_IN):
        probe = cyl(4.0, 10.0, [cx, cy, BASE_T + 5.0 + 0.01], "z")
        inter = part.intersection([probe])
        blocked = inter.is_volume and inter.volume > 1e-6
        assert not blocked, f"head room blocked at {cx},{cy}"
print("head room OK | vol", round(part.volume / 1000, 1), "cm3 | bbox", part.bounds.tolist())
print("agujeros pared (y, z):", holes, "| eje C a", zC, "sobre placa base")
part.export("rubilar2.stl")
