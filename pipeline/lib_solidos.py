"""Sólidos paramétricos para diseño mecánico imprimible (capa `user`).

Complementa `lib_geometry.py` (que deriva geometría de la malla MEDIDA) con
primitivas de DISEÑO: todo lo que aquí se construye es capa `user` y nace
acotado en milímetros reales, nunca se mezcla con `measured`.

Contenido:
- primitivas: caja, cilindro, cono/tronco, prisma desde polígono, revolución;
- perfiles: engranaje recto de perfil de EVOLVENTE (ISO 53 / DIN 867), rueda de
  trinquete, corona dentada;
- utilidades de impresión FDM: holguras, chaflanes de punta, verificación de
  estanqueidad y volumen;
- exportación STL + GLB con color por pieza.

Convención de ejes del proyecto: Z arriba, Y hacia el frente del aparato
(donde come el perro), X a la derecha. Unidades: milímetros y grados.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import trimesh
from shapely.geometry import Polygon
from shapely.ops import unary_union

# ---------------------------------------------------------------------------
# Primitivas
# ---------------------------------------------------------------------------

EJES = {"x": (1.0, 0.0, 0.0), "y": (0.0, 1.0, 0.0), "z": (0.0, 0.0, 1.0)}


def _mover(mesh: trimesh.Trimesh, at=(0.0, 0.0, 0.0)) -> trimesh.Trimesh:
    mesh.apply_translation(np.asarray(at, dtype=float))
    return mesh


def _alinear(mesh: trimesh.Trimesh, eje) -> trimesh.Trimesh:
    """Gira la pieza para que su eje local +Z apunte a `eje`."""
    v = np.asarray(EJES[eje] if isinstance(eje, str) else eje, dtype=float)
    v = v / np.linalg.norm(v)
    z = np.array([0.0, 0.0, 1.0])
    if np.allclose(v, z):
        return mesh
    if np.allclose(v, -z):
        mesh.apply_transform(trimesh.transformations.rotation_matrix(math.pi, [1, 0, 0]))
        return mesh
    axis = np.cross(z, v)
    ang = math.acos(float(np.clip(np.dot(z, v), -1, 1)))
    mesh.apply_transform(trimesh.transformations.rotation_matrix(ang, axis))
    return mesh


def caja(dim, at=(0, 0, 0)) -> trimesh.Trimesh:
    """Caja centrada en `at` con dimensiones (dx, dy, dz)."""
    return _mover(trimesh.creation.box(extents=np.asarray(dim, dtype=float)), at)


def cilindro(dia: float, alto: float, at=(0, 0, 0), eje="z", secciones: int = 96) -> trimesh.Trimesh:
    """Cilindro centrado en `at`, altura sobre `eje`."""
    m = trimesh.creation.cylinder(radius=dia / 2.0, height=alto, sections=secciones)
    return _mover(_alinear(m, eje), at)


def tubo(dia_ext: float, dia_int: float, alto: float, at=(0, 0, 0), eje="z",
         secciones: int = 96) -> trimesh.Trimesh:
    """Tubo (cilindro hueco) centrado en `at`."""
    ext = trimesh.creation.cylinder(radius=dia_ext / 2.0, height=alto, sections=secciones)
    int_ = trimesh.creation.cylinder(radius=dia_int / 2.0, height=alto + 2.0, sections=secciones)
    m = ext.difference(int_)
    return _mover(_alinear(m, eje), at)


def tronco_cono(dia_inf: float, dia_sup: float, alto: float, at=(0, 0, 0), eje="z",
                secciones: int = 96) -> trimesh.Trimesh:
    """Tronco de cono macizo; `at` es el centro de su altura."""
    perfil = np.array([[0.0, -alto / 2.0],
                       [dia_inf / 2.0, -alto / 2.0],
                       [dia_sup / 2.0, +alto / 2.0],
                       [0.0, +alto / 2.0]])
    m = revolucion(perfil, secciones=secciones)
    return _mover(_alinear(m, eje), at)


def tronco_cono_hueco(dia_inf: float, dia_sup: float, alto: float, espesor: float,
                      at=(0, 0, 0), eje="z", secciones: int = 96) -> trimesh.Trimesh:
    """Tolva/embudo: tronco de cono con pared de `espesor` (medido horizontal)."""
    ri, rs, e = dia_inf / 2.0, dia_sup / 2.0, espesor
    perfil = np.array([[ri, -alto / 2.0],
                       [rs, +alto / 2.0],
                       [rs + e, +alto / 2.0],
                       [ri + e, -alto / 2.0]])
    m = revolucion(perfil, secciones=secciones)
    return _mover(_alinear(m, eje), at)


def prisma(poligono, alto: float, at=(0, 0, 0), eje="z") -> trimesh.Trimesh:
    """Extruye un polígono 2D (lista de puntos o shapely.Polygon) `alto` mm.

    El sólido queda centrado en su altura para que `at` sea su centro.
    """
    poly = poligono if isinstance(poligono, Polygon) else Polygon(np.asarray(poligono, dtype=float))
    if not poly.is_valid:
        poly = poly.buffer(0)
    m = trimesh.creation.extrude_polygon(poly, float(alto))
    m.apply_translation([0, 0, -alto / 2.0])
    return _mover(_alinear(m, eje), at)


def revolucion(perfil, angulo_deg: float = 360.0, secciones: int = 96) -> trimesh.Trimesh:
    """Revoluciona un perfil CERRADO (Nx2, coordenadas radio-altura) alrededor de Z."""
    p = np.asarray(perfil, dtype=float)
    if not np.allclose(p[0], p[-1]):
        p = np.vstack([p, p[0]])
    # el perfil debe recorrerse en sentido antihorario en el plano (r, z) para
    # que las normales del sólido queden hacia afuera (volumen positivo)
    area2 = float(np.sum(p[:-1, 0] * p[1:, 1] - p[1:, 0] * p[:-1, 1]))
    if area2 < 0:
        p = p[::-1]
    m = trimesh.creation.revolve(p, angle=math.radians(angulo_deg), sections=secciones)
    m.remove_unreferenced_vertices()
    m.merge_vertices()
    return m


def sector_anular(r_int: float, r_ext: float, ang_ini: float, ang_fin: float, alto: float,
                  at=(0, 0, 0), pasos: int = 48) -> trimesh.Trimesh:
    """Sector de corona circular extruido en Z (celda de rotor, ranura, tope)."""
    a = np.radians(np.linspace(ang_ini, ang_fin, pasos))
    pts = [(r_ext * math.cos(t), r_ext * math.sin(t)) for t in a]
    pts += [(r_int * math.cos(t), r_int * math.sin(t)) for t in a[::-1]]
    return prisma(pts, alto, at=at)


def loft(pts_inf, pts_sup, z_inf: float = 0.0, z_sup: float = 10.0) -> trimesh.Trimesh:
    """Sólido reglado entre dos contornos 2D del MISMO número de vértices.

    Sirve para tolvas y canaletas: sección de entrada y de salida distintas,
    unidas por caras planas (lo que una impresora FDM reproduce sin problema).
    """
    a = np.asarray(pts_inf, dtype=float)
    b = np.asarray(pts_sup, dtype=float)
    if len(a) != len(b):
        raise ValueError("loft: ambos contornos deben tener el mismo número de puntos")
    n = len(a)
    if np.sum(a[:, 0] * np.roll(a[:, 1], -1) - np.roll(a[:, 0], -1) * a[:, 1]) < 0:
        a, b = a[::-1], b[::-1]                    # ambos en sentido antihorario
    v = np.vstack([np.c_[a, np.full(n, z_inf)], np.c_[b, np.full(n, z_sup)]])
    f = []
    for k in range(n):
        k2 = (k + 1) % n
        f += [[k, k2, n + k], [k2, n + k2, n + k]]
    for k in range(1, n - 1):
        f += [[0, k + 1, k], [n, n + k, n + k + 1]]
    m = trimesh.Trimesh(vertices=v, faces=f, process=True)
    m.fix_normals()
    return m


def union(*mallas) -> trimesh.Trimesh:
    ms = [m for m in mallas if m is not None]
    return ms[0] if len(ms) == 1 else trimesh.boolean.union(ms)


def resta(base: trimesh.Trimesh, *herramientas) -> trimesh.Trimesh:
    hs = [h for h in herramientas if h is not None]
    return base if not hs else trimesh.boolean.difference([base] + hs)


def interseccion(*mallas) -> trimesh.Trimesh:
    return trimesh.boolean.intersection([m for m in mallas if m is not None])


# ---------------------------------------------------------------------------
# Engranaje recto de perfil de evolvente (ISO 53, ángulo de presión 20°)
# ---------------------------------------------------------------------------

def _evolvente(rb: float, r: float) -> tuple[float, float]:
    """Punto de la evolvente de base rb a radio r → (radio, ángulo polar)."""
    if r <= rb:
        return rb, 0.0
    a = math.acos(rb / r)
    return r, math.tan(a) - a          # ángulo de evolvente inv(a)


def perfil_engranaje(m: float, z: int, alfa_deg: float = 20.0, ha_coef: float = 1.0,
                     hf_coef: float = 1.25, backlash: float = 0.0, pts_flanco: int = 14) -> Polygon:
    """Polígono 2D de un engranaje recto de evolvente.

    m módulo (mm), z nº de dientes, alfa ángulo de presión, backlash juego de
    flanco TOTAL en mm repartido a ambos lados (holgura de impresión FDM).
    """
    alfa = math.radians(alfa_deg)
    r = m * z / 2.0                     # primitivo
    rb = r * math.cos(alfa)             # base
    ra = r + ha_coef * m                # cabeza
    rf = max(r - hf_coef * m, 0.6 * rb)  # pie (no bajar del alma)
    # semiespesor angular del diente en el primitivo, menos backlash
    s = (math.pi * m / 2.0) - backlash
    semi = s / (2.0 * r)
    inv_alfa = math.tan(alfa) - alfa

    # flanco: (radio, ángulo respecto al eje del diente), de la raíz a la cabeza
    flanco = []
    if rf < rb:                       # tramo recto radial bajo el círculo base
        flanco.append((rf, semi + inv_alfa))
    for rr in np.linspace(max(rb, rf), ra, pts_flanco):
        rr_, inv = _evolvente(rb, float(rr))
        flanco.append((rr_, semi + inv_alfa - inv))
    th_raiz, th_punta = flanco[0][1], flanco[-1][1]

    puntos = []
    paso = 2.0 * math.pi / z
    for k in range(z):
        b = k * paso
        # flanco izquierdo: de la raíz a la cabeza (ángulo creciente ⇒ CCW)
        for rr, th in flanco:
            puntos.append((rr * math.cos(b - th), rr * math.sin(b - th)))
        # arco de cabeza
        for t in np.linspace(b - th_punta, b + th_punta, 5)[1:-1]:
            puntos.append((ra * math.cos(t), ra * math.sin(t)))
        # flanco derecho: de la cabeza a la raíz
        for rr, th in reversed(flanco):
            puntos.append((rr * math.cos(b + th), rr * math.sin(b + th)))
        # arco de raíz hasta el diente siguiente
        for t in np.linspace(b + th_raiz, b + paso - th_raiz, 6)[1:-1]:
            puntos.append((rf * math.cos(t), rf * math.sin(t)))
    poly = Polygon(puntos)
    if not poly.is_valid:
        poly = poly.buffer(0)
    return poly


def engranaje(m: float, z: int, ancho: float, dia_eje: float = 0.0, alfa_deg: float = 20.0,
              backlash: float = 0.0, at=(0, 0, 0), eje="z") -> trimesh.Trimesh:
    """Engranaje recto listo para imprimir (con taladro de eje opcional)."""
    g = prisma(perfil_engranaje(m, z, alfa_deg, backlash=backlash), ancho)
    if dia_eje > 0:
        g = resta(g, cilindro(dia_eje, ancho + 4.0))
    return _mover(_alinear(g, eje), at)


def perfil_cremallera(m: float, dientes: int, alto_base: float, alfa_deg: float = 20.0,
                      ha_coef: float = 1.0, hf_coef: float = 1.25, backlash: float = 0.0) -> Polygon:
    """Polígono 2D de una cremallera recta (el engranaje de radio infinito).

    Línea primitiva en y=0; los dientes suben en +y y el cuerpo baja en −y.
    El flanco es RECTO e inclinado el ángulo de presión: es la propia definición
    de la evolvente, por eso engrana con cualquier rueda del mismo módulo.
    """
    p = math.pi * m                       # paso
    t = math.tan(math.radians(alfa_deg))
    ha, hf = ha_coef * m, hf_coef * m
    s = p / 2.0 - backlash                # espesor del diente en la primitiva
    s_punta = s - 2 * ha * t
    s_raiz = s + 2 * hf * t
    largo = dientes * p

    pts = [(0.0, -alto_base), (0.0, -hf)]
    x = 0.0
    for _ in range(dientes):
        hueco = (p - s_raiz) / 2.0
        pts += [(x + hueco, -hf),
                (x + hueco + (s_raiz - s_punta) / 2.0, ha),
                (x + hueco + (s_raiz + s_punta) / 2.0, ha),
                (x + hueco + s_raiz, -hf)]
        x += p
    pts += [(largo, -hf), (largo, -alto_base)]
    poly = Polygon(pts)
    return poly if poly.is_valid else poly.buffer(0)


def datos_engranaje(m: float, z: int, alfa_deg: float = 20.0) -> dict:
    """Cotas normalizadas del engranaje (para la memoria y el plano)."""
    r = m * z / 2.0
    return {"modulo": m, "dientes": z, "angulo_presion": alfa_deg,
            "dia_primitivo": 2 * r, "dia_cabeza": 2 * (r + m),
            "dia_pie": 2 * (r - 1.25 * m), "dia_base": 2 * r * math.cos(math.radians(alfa_deg)),
            "paso": math.pi * m}


def distancia_centros(m: float, z1: int, z2: int) -> float:
    return m * (z1 + z2) / 2.0


# ---------------------------------------------------------------------------
# Rueda de trinquete (ratchet) — indexado mecánico exacto de 1/z de vuelta
# ---------------------------------------------------------------------------

def perfil_trinquete(dia_ext: float, z: int, prof_diente: float,
                     ang_cara_deg: float = 8.0, r_fondo: float = 0.6) -> Polygon:
    """Rueda de trinquete de dientes asimétricos.

    Cara de empuje casi radial (ang_cara respecto al radio → autoenganche) y
    dorso inclinado para que el gatillo resbale en el retorno.
    """
    re = dia_ext / 2.0
    ri = re - prof_diente
    paso = 2 * math.pi / z
    cara = math.radians(ang_cara_deg)
    pts = []
    for k in range(z):
        b = k * paso
        # punta del diente
        pts.append((re * math.cos(b), re * math.sin(b)))
        # cara de empuje: casi radial, ligeramente socavada (undercut) → agarre
        pts.append((ri * math.cos(b + cara), ri * math.sin(b + cara)))
        # fondo redondeado (evita concentración de tensión en PLA)
        for t in np.linspace(b + cara, b + paso, 6)[1:-1]:
            rr = ri + r_fondo * math.sin(math.pi * (t - b - cara) / (paso - cara))
            pts.append((rr * math.cos(t), rr * math.sin(t)))
    poly = Polygon(pts)
    return poly if poly.is_valid else poly.buffer(0)


def rueda_trinquete(dia_ext: float, z: int, prof_diente: float, ancho: float,
                    dia_eje: float = 0.0, at=(0, 0, 0), eje="z") -> trimesh.Trimesh:
    w = prisma(perfil_trinquete(dia_ext, z, prof_diente), ancho)
    if dia_eje > 0:
        w = resta(w, cilindro(dia_eje, ancho + 4.0))
    return _mover(_alinear(w, eje), at)


# ---------------------------------------------------------------------------
# Utilidades de impresión FDM y verificación
# ---------------------------------------------------------------------------

def hexagono(entre_caras: float) -> Polygon:
    """Polígono hexagonal regular definido por la distancia entre caras."""
    r = entre_caras / math.sqrt(3.0)          # circunradio
    return Polygon([(r * math.cos(math.radians(60 * k)), r * math.sin(math.radians(60 * k)))
                    for k in range(6)])


def agujero_lagrima(dia: float, largo: float, at=(0, 0, 0), eje="y") -> trimesh.Trimesh:
    """Agujero horizontal en forma de lágrima: evita el voladizo de la bóveda.

    El cilindro se corona con un prisma triangular a 45°, así la capa superior
    nunca supera el voladizo imprimible sin soporte.
    """
    r = dia / 2.0
    cyl = trimesh.creation.cylinder(radius=r, height=largo, sections=64)
    # prisma triangular sobre el cilindro (mismo eje local Z): cumbrera a 45°
    tri = trimesh.creation.extrude_polygon(
        Polygon([(-r, 0), (r, 0), (0, r * math.sqrt(2))]), largo)
    tri.apply_translation([0, 0, -largo / 2.0])
    return _mover(_alinear(union(cyl, tri), eje), at)


def chaflan_punta(mesh: trimesh.Trimesh, dia_ext: float, chaflan: float,
                  alto: float, at=(0, 0, 0)) -> trimesh.Trimesh:
    """Rebaja las puntas de un rotor con un cono invertido (entrada suave)."""
    r = dia_ext / 2.0
    perfil = np.array([[r - chaflan, -alto / 2.0 - 1],
                       [r + 5.0, -alto / 2.0 - 1],
                       [r + 5.0, alto / 2.0 + 1],
                       [r - chaflan, alto / 2.0 + 1]])
    return resta(mesh, _mover(revolucion(perfil), at))


def reparar(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """Limpieza estándar antes de exportar (sin alterar la geometría útil)."""
    mesh.remove_unreferenced_vertices()
    mesh.merge_vertices()
    mesh.remove_degenerate_faces() if hasattr(mesh, "remove_degenerate_faces") else None
    mesh.fix_normals()
    return mesh


def metricas(mesh: trimesh.Trimesh) -> dict:
    """Métricas de la pieza para la verificación funcional y el informe."""
    b = mesh.bounds
    dim = (b[1] - b[0]).round(2)
    vol = float(mesh.volume)
    return {"estanca": bool(mesh.is_watertight),
            "volumen_cm3": round(vol / 1000.0, 2),
            "area_cm2": round(float(mesh.area) / 100.0, 2),
            "bbox_mm": [float(x) for x in dim],
            "triangulos": int(len(mesh.faces))}


DENSIDAD_PLA_G_CM3 = 1.24     # ficha técnica genérica PLA (1.24 g/cm³)


def masa_pla_g(mesh: trimesh.Trimesh, relleno: float = 0.35, perimetros_frac: float = 0.45) -> float:
    """Estimación de masa impresa: fracción sólida = cascarón + relleno.

    Aproximación deliberadamente conservadora para la lista de compra: se asume
    que `perimetros_frac` del volumen es material sólido (paredes/tapas) y el
    resto se rellena al `relleno` indicado.
    """
    v_cm3 = mesh.volume / 1000.0
    solido = perimetros_frac + (1 - perimetros_frac) * relleno
    return round(v_cm3 * solido * DENSIDAD_PLA_G_CM3, 1)


COLORES = {
    "estructura": "#455a64", "rotor": "#ef6c00", "carcasa": "#78909c",
    "palanca": "#c62828", "engranaje": "#00695c", "agua": "#0277bd",
    "bidon": "#90caf9", "bandeja": "#6d4c41", "trinquete": "#ad1457",
}


def exportar(mesh: trimesh.Trimesh, carpeta: Path, nombre: str, color: str = "#9e9e9e",
             stl: bool = True) -> dict:
    """Escribe <carpeta>/<nombre>.glb (+ .stl) y devuelve rutas y métricas."""
    carpeta.mkdir(parents=True, exist_ok=True)
    mesh = reparar(mesh.copy())
    rgba = trimesh.visual.color.hex_to_rgba(color)
    mesh.visual = trimesh.visual.ColorVisuals(mesh=mesh, face_colors=np.tile(rgba, (len(mesh.faces), 1)))
    salidas = {}
    glb = carpeta / f"{nombre}.glb"
    glb.write_bytes(trimesh.exchange.gltf.export_glb(trimesh.Scene(mesh)))
    salidas["glb"] = glb
    if stl:
        st = carpeta / f"{nombre}.stl"
        mesh.export(st)
        salidas["stl"] = st
    return {"rutas": salidas, "metricas": metricas(mesh)}
