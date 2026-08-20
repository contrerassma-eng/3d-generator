#!/usr/bin/env python3
"""Placa de pares 7x5: pares de agujeros O3.2 separados 17.6 en X (patron
M3 del motor), 7 pares a paso 90 en X y 5 filas a paso 90 en Y, espesor 2,
margen 8. Total 573.6 x 376, partida a mitad de vano en 6 piezas para la
cama CC2 de 256: X 241.8/180/151.8 x Y 233/143."""
import trimesh

T, M, PP, P, NS, NR, R = 2.0, 8.0, 17.6, 90.0, 7, 5, 1.6
W = (NS-1)*P + PP + 2*M
H = (NR-1)*P + 2*M
sx = [M + PP/2 + i*P for i in range(NS)]
ry = [M + j*P for j in range(NR)]
holes = [(x+d, y) for x in sx for y in ry for d in (-PP/2, PP/2)]
XCUTS = [0.0, 241.8, 421.8, W]
YCUTS = [0.0, 233.0, H]

def box(x0,x1,y0,y1):
    b = trimesh.creation.box(extents=[x1-x0, y1-y0, T])
    b.apply_translation([(x0+x1)/2, (y0+y1)/2, T/2]); return b
def hole(cx,cy):
    c = trimesh.creation.cylinder(radius=R, height=T+2, sections=48)
    c.apply_translation([cx, cy, T/2]); return c

for i in range(3):
    for j in range(2):
        x0,x1,y0,y1 = XCUTS[i],XCUTS[i+1],YCUTS[j],YCUTS[j+1]
        p = box(x0,x1,y0,y1).difference([hole(x,y) for x,y in holes if x0<x<x1 and y0<y<y1])
        assert p.is_volume
        p.apply_translation([-x0,-y0,0])
        p.export(f"pares_X{i+1}Y{j+1}.stl")
        print(f"pares_X{i+1}Y{j+1}: {x1-x0:.1f} x {y1-y0:.1f}")
