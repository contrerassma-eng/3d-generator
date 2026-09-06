"""Chapa plegada: sólido 3D + desarrollo plano REAL para corte láser.

Capa `user` (diseño). Una pieza de chapa se declara por sus **cotas exteriores**
(como se acota un plano de taller: "escuadra 60×60") y la librería calcula el
desarrollo con la deducción de plegado real, de modo que el DXF que se manda al
láser produce, tras plegar, exactamente la pieza modelada.

Fórmulas (norma de taller, factor K):
    BA  = θ · (R + K·t)                 desarrollo del arco (bend allowance)
    SB  = (R + t) · tan(θ/2)            retroceso exterior (outside setback)
    BD  = 2·SB − BA                     deducción de plegado (bend deduction)
    Lp  = A + B − BD                    largo plano de dos alas exteriores A y B

Convenio: cada panel vive en su propio plano local (u, v); el material ocupa
w ∈ [0, t] hacia +w. Un pliegue nace de una recta del panel padre (la "línea de
molde", intersección de las caras exteriores) y su ala se acota DESDE esa recta.

Límite conocido y declarado: en el sólido 3D los pliegues se representan a
arista viva (ingletado exacto de las caras exteriores e interiores); el radio
real solo interviene donde importa para fabricar, que es el DESARROLLO. Con
R = t y 90°, la diferencia geométrica en el sólido es de 0,43·t.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
from shapely import affinity
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

RHO_ACERO = 7.85e-6      # kg/mm3
SEG = 64                 # segmentos por círculo completo


# ---------------------------------------------------------------------------
# Material de chapa
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Material:
    nombre: str
    k: float             # factor K (fibra neutra) nominal de taller
    rho: float = RHO_ACERO

ACERO = Material("acero al carbono", 0.38)
INOX = Material("acero inoxidable", 0.44)


def bend_allowance(ang_deg: float, r: float, t: float, k: float) -> float:
    return math.radians(ang_deg) * (r + k * t)


def bend_deduction(ang_deg: float, r: float, t: float, k: float) -> float:
    sb = (r + t) * math.tan(math.radians(ang_deg) / 2)
    return 2 * sb - bend_allowance(ang_deg, r, t, k)


# ---------------------------------------------------------------------------
# Panel: una cara plana de la pieza
# ---------------------------------------------------------------------------

@dataclass
class Panel:
    poly: Polygon                       # contorno en (u, v) locales, hasta la línea de molde
    origen: np.ndarray                  # origen del panel en 3D
    eu: np.ndarray                      # eje u en 3D
    ev: np.ndarray                      # eje v en 3D
    ew: np.ndarray                      # espesor en 3D (material 0..t)
    M: np.ndarray                       # 2x2: (u,v) -> plano de desarrollo
    T: np.ndarray                       # traslación del desarrollo
    ajustes: list = field(default_factory=list)    # (poly, signo) aplicados SOLO en el desarrollo
    agujeros: list = field(default_factory=list)   # geometrías 2D a restar (en u,v)
    padre: int | None = None
    pliegue: dict | None = None

    def a3d(self, uv) -> np.ndarray:
        uv = np.atleast_2d(np.asarray(uv, dtype=float))
        return self.origen + uv[:, :1] * self.eu + uv[:, 1:2] * self.ev

    def plano(self, geom):
        """Geometría del panel llevada al plano de desarrollo."""
        a, b = self.M[0, 0], self.M[0, 1]
        c, d = self.M[1, 0], self.M[1, 1]
        return affinity.affine_transform(geom, [a, b, c, d, self.T[0], self.T[1]])

    def perfil(self) -> Polygon:
        """Contorno con agujeros, para el sólido."""
        p = self.poly
        for h in self.agujeros:
            p = p.difference(h)
        return p

    def perfil_plano(self) -> Polygon:
        """Contorno con el ajuste de BD de cada pliegue, en el plano de desarrollo.

        Cada pliegue consume BD y ese consumo se reparte BD/2 a cada lado de la
        línea de molde: al ala del padre se le quita (o se le agrega, si BD < 0)
        una franja de BD/2 SOLO en el ancho del ala plegada.
        """
        p = self.poly
        for (geom, signo) in self.ajustes:
            p = p.difference(geom) if signo < 0 else p.union(geom)
        for h in self.agujeros:
            p = p.difference(h)
        return self.plano(p)


def _semiplano(pt, n, off, grande=1e4) -> Polygon:
    """Semiplano {x : (x-pt)·n <= off} como polígono grande."""
    pt = np.asarray(pt, dtype=float)
    n = np.asarray(n, dtype=float) / np.linalg.norm(n)
    d = np.array([-n[1], n[0]])
    c = pt + n * off
    return Polygon([c + d * grande, c + d * grande - n * grande,
                    c - d * grande - n * grande, c - d * grande])


# ---------------------------------------------------------------------------
# Pieza de chapa
# ---------------------------------------------------------------------------

class Chapa:
    def __init__(self, codigo: str, nombre: str, espesor: float, cantidad: int = 1,
                 material: Material = ACERO, radio: float | None = None,
                 color: str = "#7d8895", proceso: str = "corte láser + plegado",
                 nota: str = ""):
        self.codigo, self.nombre = codigo, nombre
        self.t = float(espesor)
        self.cantidad = int(cantidad)
        self.material = material
        self.radio = float(radio) if radio else float(espesor)   # R = t (regla de Inventor)
        self.color, self.proceso, self.nota = color, proceso, nota
        self.paneles: list[Panel] = []

    # -- construcción -------------------------------------------------------
    def base(self, poly: Polygon) -> int:
        self.paneles.append(Panel(poly, np.zeros(3), np.array([1.0, 0, 0]),
                                  np.array([0.0, 1, 0]), np.array([0.0, 0, 1]),
                                  np.eye(2), np.zeros(2)))
        return 0

    def pestana(self, padre: int, linea, largo: float, angulo: float = 90.0,
                sentido: int = -1, u0: float | None = None, u1: float | None = None,
                poly: Polygon | None = None, radio: float | None = None,
                nombre: str = "") -> int:
        """Ala plegada desde una recta del panel `padre`.

        `linea` = ((u1,v1),(u2,v2)) en el panel padre: es la LÍNEA DE MOLDE
        (intersección de las caras exteriores). `largo` es la cota exterior del
        ala medida desde esa recta. `sentido` +1 pliega hacia +w del padre,
        −1 hacia −w. El desarrollo descuenta BD/2 a cada lado.
        """
        P = self.paneles[padre]
        p1 = np.asarray(linea[0], dtype=float)
        p2 = np.asarray(linea[1], dtype=float)
        d = p2 - p1
        L = np.linalg.norm(d)
        if L < 1e-9:
            raise ValueError(f"{self.codigo}: línea de pliegue degenerada")
        d = d / L
        n = np.array([d[1], -d[0]])
        # n debe apuntar HACIA AFUERA del material del padre
        cen = np.asarray(P.poly.representative_point().coords[0])
        if np.dot(cen - p1, n) > 0:
            n = -n
        r = float(radio) if radio else self.radio
        bd = bend_deduction(angulo, r, self.t, self.material.k)
        ba = bend_allowance(angulo, r, self.t, self.material.k)
        th = math.radians(angulo)
        th_half = th / 2

        a = 0.0 if u0 is None else float(u0)
        b = L if u1 is None else float(u1)
        a, b = min(a, b), max(a, b)
        # solape del rincón: con el pliegue hacia -w el ala nace separada del
        # padre; se la prolonga t·tan(θ/2) hacia atrás para que el rincón
        # exterior quede lleno (el desarrollo recorta esa prolongación).
        ext = self.t * math.tan(th_half) if sentido < 0 else 0.0
        v0 = min(0.0, bd / 2) - ext
        if poly is None:
            poly = box(a, v0, b, largo)
        elif ext or bd < 0:
            poly = poly.union(box(a, v0, b, max(0.0, bd / 2)))

        # marco 3D del ala
        n3 = n[0] * P.eu + n[1] * P.ev
        d3 = d[0] * P.eu + d[1] * P.ev
        ev = n3 * math.cos(th) + sentido * P.ew * math.sin(th)
        # El espesor del ala crece SIEMPRE hacia adentro de la línea de molde,
        # sea el pliegue hacia arriba o hacia abajo: así las caras exteriores de
        # las dos alas se cortan justo en la línea dada (rincón exterior vivo,
        # sin hueco ni solape) y `largo` es la cota EXTERIOR del ala, que es la
        # que descuenta BD en el desarrollo.
        ew = -n3 * math.sin(th) + P.ew * math.cos(th)
        org = P.origen + p1[0] * P.eu + p1[1] * P.ev

        # marco del desarrollo: (u,v) -> padre2D: p1 + u·d + (v − BD)·n
        A = np.column_stack([d, n])
        tA = p1 - bd * n
        M = P.M @ A
        T = P.M @ tA + P.T

        hijo = Panel(poly, org, d3, ev, ew, M, T, padre=padre,
                     pliegue={"angulo": angulo, "radio": r, "ba": ba, "bd": bd,
                              "sentido": sentido, "nombre": nombre, "u": (a, b)})
        # ajuste del hijo: su desarrollo empieza en v = BD/2 (la junta)
        hijo.ajustes.append((box(a - 1e3, v0 - 1e3, b + 1e3, bd / 2), -1))
        # ajuste del padre: franja de BD/2 en el ancho del ala, con su signo
        q = [p1 + a * d, p1 + b * d, p1 + b * d - (bd / 2) * n, p1 + a * d - (bd / 2) * n]
        if abs(bd) > 1e-9:
            P.ajustes.append((Polygon(q).buffer(0), -1 if bd > 0 else +1))
        self.paneles.append(hijo)
        return len(self.paneles) - 1

    def agujero(self, panel: int, pos, dia: float) -> None:
        from shapely.geometry import Point
        self.paneles[panel].agujeros.append(
            Point(pos).buffer(dia / 2, quad_segs=SEG // 4))

    def agujeros(self, panel: int, posiciones, dia: float) -> None:
        for p in posiciones:
            self.agujero(panel, p, dia)

    def rasgadura(self, panel: int, geom) -> None:
        self.paneles[panel].agujeros.append(geom)

    # -- salidas ------------------------------------------------------------
    def solido(self):
        import trimesh
        cuerpos = []
        for P in self.paneles:
            perfil = P.perfil()
            if perfil.is_empty or perfil.area < 1e-6:
                continue
            m = trimesh.creation.extrude_polygon(perfil, self.t)
            X = np.eye(4)
            X[:3, 0], X[:3, 1], X[:3, 2] = P.eu, P.ev, P.ew
            X[:3, 3] = P.origen
            m.apply_transform(X)   # trimesh reorienta las caras si det < 0
            cuerpos.append(m)
        if not cuerpos:
            raise ValueError(f"{self.codigo}: sin paneles")
        if len(cuerpos) == 1:
            return cuerpos[0]
        try:
            u = trimesh.boolean.union(cuerpos)
            if u is not None and len(u.faces) and u.volume > 0:
                return u
        except Exception:
            pass
        return trimesh.util.concatenate(cuerpos)

    def desarrollo(self) -> dict:
        """Contorno plano, agujeros y líneas de plegado (mm, escala real)."""
        caras = [P.perfil_plano() for P in self.paneles]
        caras = [c for c in caras if not c.is_empty]
        plano = unary_union(caras)
        if plano.geom_type == "MultiPolygon":
            plano = max(plano.geoms, key=lambda g: g.area)
        pliegues = []
        for i, P in enumerate(self.paneles):
            if P.pliegue is None:
                continue
            pl = P.pliegue
            # la línea de molde del hijo está en v = 0; su eje de plegado en el
            # desarrollo cae en v = BD/2 del marco del hijo (junta de las dos alas)
            u0, u1 = pl["u"]
            eje = [P.plano(_pt(u0, pl["bd"] / 2)), P.plano(_pt(u1, pl["bd"] / 2))]
            tg0 = [P.plano(_pt(u0, pl["bd"] / 2 - pl["ba"] / 2)),
                   P.plano(_pt(u1, pl["bd"] / 2 - pl["ba"] / 2))]
            tg1 = [P.plano(_pt(u0, pl["bd"] / 2 + pl["ba"] / 2)),
                   P.plano(_pt(u1, pl["bd"] / 2 + pl["ba"] / 2))]
            pliegues.append({
                "eje": [(p.x, p.y) for p in eje],
                "tangentes": [[(p.x, p.y) for p in tg0], [(p.x, p.y) for p in tg1]],
                "angulo": pl["angulo"], "radio": pl["radio"], "ba": pl["ba"],
                "sentido": "ARRIBA" if pl["sentido"] > 0 else "ABAJO",
                "nombre": pl["nombre"],
            })
        return {"contorno": plano, "pliegues": pliegues}

    # -- métricas -----------------------------------------------------------
    def metricas(self) -> dict:
        des = self.desarrollo()
        p = des["contorno"]
        minx, miny, maxx, maxy = p.bounds
        corte = p.exterior.length + sum(r.length for r in p.interiors)
        return {
            "codigo": self.codigo, "nombre": self.nombre, "cantidad": self.cantidad,
            "espesor": self.t, "material": self.material.nombre,
            "desarrollo_mm": [round(maxx - minx, 1), round(maxy - miny, 1)],
            "area_mm2": round(p.area, 0),
            "area_bruta_mm2": round((maxx - minx) * (maxy - miny), 0),
            "largo_corte_mm": round(corte, 0),
            "pliegues": len(des["pliegues"]),
            "agujeros": sum(len(P.agujeros) for P in self.paneles),
            "masa_kg": round(p.area * self.t * self.material.rho, 3),
            "proceso": self.proceso,
            "nota": self.nota,
        }


def _pt(u, v):
    from shapely.geometry import Point
    return Point(u, v)
