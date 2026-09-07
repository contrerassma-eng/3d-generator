# Determina que piezas de un ensamble son la MISMA pieza (un solo archivo,
# fabricada N veces), cuales son ESPEJO (quirales, no intercambiables) y
# cuales son distintas. Compara un hash de los vertices recentrados y
# ordenados, probando tambien las 6 rotaciones de 60 y la reflexion en Y.
#
# El muestreo punto-a-punto NO sirve para esto (da falsos "iguales" porque la
# distancia al vecino mas cercano no es cero aunque las mallas coincidan) y la
# firma volumen/inercia tampoco distingue una pieza de su espejo.
import sys, hashlib
import numpy as np, trimesh

ROTS = (0, 60, 120, 180, 240, 300)

def huella(f, mirror_y=False, rotz=0.0, tol=2):
    m = trimesh.load(f); m.merge_vertices()
    if mirror_y:
        m.apply_transform(np.diag([1.0, -1.0, 1.0, 1.0]))
    if rotz:
        m.apply_transform(trimesh.transformations.rotation_matrix(
            np.radians(rotz), [0, 0, 1]))
    v = np.round(m.vertices - m.center_mass, tol)
    v = v[np.lexsort((v[:, 2], v[:, 1], v[:, 0]))]
    return hashlib.md5(v.tobytes()).hexdigest()[:12]

def comparar(f1, f2):
    h1 = huella(f1)
    if huella(f2) == h1:
        return 'IDENTICAS (una sola pieza)'
    if any(huella(f2, False, a) == h1 for a in ROTS[1:]):
        return 'IDENTICAS (girada)'
    if any(huella(f2, True, a) == h1 for a in ROTS):
        return 'ESPEJO (2 piezas quirales)'
    return 'DISTINTAS'

if __name__ == '__main__':
    a, b = sys.argv[1], sys.argv[2]
    print(f'{a} vs {b} -> {comparar(a, b)}')
