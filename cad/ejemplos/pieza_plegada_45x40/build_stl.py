#!/usr/bin/env python3
"""STL of the bent L-part, oriented for support-free printing:
flange flat on the bed, 45 mm wall vertical."""
import numpy as np
import trimesh

T, H, D, W, R = 3.0, 45.0, 40.0, 20.0, 2.0  # thickness, wall, flange, width, hole radius

def box(x0, x1, y0, y1, z0, z1):
    b = trimesh.creation.box(extents=[x1 - x0, y1 - y0, z1 - z0])
    b.apply_translation([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2])
    return b

def cyl(radius, length, center, axis):
    c = trimesh.creation.cylinder(radius=radius, height=length, sections=96)
    if axis == "y":
        c.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    c.apply_translation(center)
    return c

# L-solid: flange z in [0,T], y in [0,D]; wall y in [D-T,D], z in [0,H]
solid = box(0, W, 0, D, 0, T).union(box(0, W, D - T, D, 0, H))

# 45-degree ribs (nervios), both sides: triangular prisms 15x15, thickness T,
# joining flange top (z=T) and wall inner face (y=D-T), flush with outer edges
RIB = 15.0
tri = [[D - T, T], [D - T - RIB, T], [D - T, T + RIB]]  # (y,z) right angle at corner
def rib(x0):
    m = trimesh.creation.extrude_triangulation(
        vertices=[[y, z] for y, z in tri], faces=[[0, 1, 2]], height=T)
    # extruded along +z of its own frame: remap (y,z,x) -> world (x=x0+, y, z)
    m.vertices = m.vertices[:, [2, 0, 1]] + [x0, 0, 0]
    trimesh.repair.fix_normals(m)
    return m
solid = solid.union(rib(0.0)).union(rib(W - T))

# wall holes (axis y): 5 mm from top and sides, second row 17 mm below
wall_holes = [(5.0, H - 5.0), (W - 5.0, H - 5.0),
              (5.0, H - 22.0), (W - 5.0, H - 22.0)]
cutters = [cyl(R, T + 4, [x, D - T / 2, z], "y") for x, z in wall_holes]
# flange holes (axis z): centerline, 5 and 22 mm from the free end (ASSUMED)
cutters += [cyl(R, T + 4, [W / 2, y, T / 2], "z") for y in (5.0, 22.0)]

part = solid.difference(trimesh.util.concatenate(cutters) if False else cutters)
assert part.is_watertight, "mesh not watertight"
assert part.is_volume
print("volume mm3:", round(part.volume, 1), "| bbox:", part.bounds.tolist())
part.export("/tmp/claude-0/-home-user/316fb065-df6d-5264-b06c-484bb72fe3e3/scratchpad/pieza_plegada_45x40.stl")
print("STL written")
