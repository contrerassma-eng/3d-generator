"""Motor de elementos discretos (DEM) para granos secos sobre geometría real.

Simula partículas esféricas polidispersas contra las MALLAS del proyecto —no
contra una idealización dibujada aparte—, para poder medir cosas que la
verificación geométrica no puede: cuánto se llena de verdad una cavidad, si un
cuello atasca, si el agitador sirve, cuánta masa sale por golpe.

Modelo de contacto (blando, tipo Cundall-Strack), el estándar de la literatura
DEM de granos:

  normal      F_n = k_n·δ − γ_n·v_n            (δ = solape, F_n ≥ 0)
  tangencial  F_t = −k_t·ξ − γ_t·v_t,  |F_t| ≤ μ·F_n   (ξ = resorte con historia)
  rodadura    M_r = −μ_r·R_ef·F_n·ω̂             (torque direccional constante)

El resorte tangencial CON HISTORIA es lo que permite el reposo estático: sin él
no hay ángulo de reposo ni arcos, y justamente eso es lo que hay que medir.

La rodadura es el sustituto habitual de la forma no esférica: una esfera rueda
demasiado, y μ_r es el parámetro que se calibra contra el ángulo de reposo
publicado. Es un modelo, no una medición: los resultados se declaran como capa
`user`.

Las paredes entran como campo de distancia con signo (SDF) muestreado sobre la
malla real. Cada cuerpo lleva su campo en su marco local y una pose(t), así que
las piezas móviles (el cajón, el agitador) se mueven sin recalcular nada.
"""
from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree

LEJOS = 1.0e3           # distancia "no toca" devuelta fuera de la rejilla (m)
G_GRAV = 9.80665        # m/s²


# ---------------------------------------------------------------------------
# Campo de distancia con signo sobre una malla
# ---------------------------------------------------------------------------

@dataclass
class Campo:
    """SDF muestreado en rejilla regular. Negativo dentro del sólido.

    Todo en metros. `origen` es el centro del vóxel (0,0,0).
    """
    sdf: np.ndarray                  # float32 (nx, ny, nz)
    origen: np.ndarray               # (3,)
    paso: float

    @property
    def limites(self) -> np.ndarray:
        n = np.array(self.sdf.shape, dtype=float) - 1.0
        return np.stack([self.origen, self.origen + n * self.paso])

    def _indice(self, p: np.ndarray):
        lim = self.limites
        dentro = np.all((p >= lim[0] + self.paso) & (p <= lim[1] - self.paso), axis=1)
        return dentro, (p[dentro] - self.origen) / self.paso

    def valor(self, p: np.ndarray) -> np.ndarray:
        """Distancia con signo en los puntos locales `p` (N,3).

        Fuera de la rejilla devuelve LEJOS: el margen del campo garantiza que
        cualquier punto capaz de tocar la pieza cae dentro.
        """
        d = np.full(len(p), LEJOS, dtype=float)
        dentro, u = self._indice(p)
        if dentro.any():
            d[dentro] = ndimage.map_coordinates(self.sdf, u.T, order=1, mode="nearest")
        return d

    def gradiente(self, p: np.ndarray) -> np.ndarray:
        """Normal saliente unitaria. Seis muestreos por punto: se pide SOLO para
        los granos que están tocando, que son un puñado de los que hay."""
        grad = np.zeros((len(p), 3), dtype=float)
        dentro, u = self._indice(p)
        if not dentro.any():
            return grad
        g = np.empty((int(dentro.sum()), 3))
        for k in range(3):
            du = np.zeros(3)
            du[k] = 1.0
            mas = ndimage.map_coordinates(self.sdf, (u + du).T, order=1, mode="nearest")
            menos = ndimage.map_coordinates(self.sdf, (u - du).T, order=1, mode="nearest")
            g[:, k] = (mas - menos) / (2.0 * self.paso)
        grad[dentro] = g / np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-12)
        return grad

    def distancia(self, p: np.ndarray, con_gradiente: bool = True):
        d = self.valor(p)
        return (d, self.gradiente(p)) if con_gradiente else (d, np.zeros_like(p))


def campo_de_malla(malla, paso_mm: float, margen_mm: float, cache: Path | None = None,
                   etiqueta: str = "") -> Campo:
    """Vóxeliza la malla y saca su SDF por transformada de distancia euclídea.

    La malla llega en mm (convención del proyecto); el campo sale en metros.
    Precisión de la pared ≈ paso/2: es el precio de resolver la geometría real
    en vez de una idealización, y se declara en el informe.
    """
    clave = None
    if cache is not None:
        h = hashlib.sha256()
        h.update(np.ascontiguousarray(malla.vertices, dtype=np.float64).tobytes())
        h.update(np.ascontiguousarray(malla.faces, dtype=np.int64).tobytes())
        h.update(f"{paso_mm:.4f}|{margen_mm:.4f}|v2".encode())
        clave = cache / f"campo_{etiqueta}_{h.hexdigest()[:16]}.npz"
        if clave.exists():
            z = np.load(clave)
            return Campo(sdf=z["sdf"], origen=z["origen"], paso=float(z["paso"]))

    vox = malla.voxelized(pitch=paso_mm).fill()
    occ = np.asarray(vox.matrix, dtype=bool)
    pad = int(math.ceil(margen_mm / paso_mm))
    occ = np.pad(occ, pad, mode="constant", constant_values=False)
    origen_mm = np.asarray(vox.transform)[:3, 3] - pad * paso_mm

    d_out = ndimage.distance_transform_edt(~occ)
    d_in = ndimage.distance_transform_edt(occ)
    # el −0.5 pone la superficie a media celda del último vóxel lleno
    sdf_mm = np.where(occ, -(d_in - 0.5), (d_out - 0.5)) * paso_mm

    campo = Campo(sdf=(sdf_mm * 1e-3).astype(np.float32),
                  origen=origen_mm * 1e-3, paso=paso_mm * 1e-3)
    if clave is not None:
        clave.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(clave, sdf=campo.sdf, origen=campo.origen, paso=campo.paso)
    return campo


# ---------------------------------------------------------------------------
# Cuerpos: campo local + pose(t)
# ---------------------------------------------------------------------------

@dataclass
class Cuerpo:
    """Sólido rígido con su campo en marco local.

    `pose(t)` devuelve (R, c): el punto local q va al mundo como R·q + c.
    `cinema(t)` devuelve (v, ω) del cuerpo en el mundo, para el rozamiento y
    para que el agitador EMPUJE al grano en vez de atravesarlo.
    """
    nombre: str
    campo: Campo
    pose: Callable[[float], tuple[np.ndarray, np.ndarray]] = \
        field(default=lambda t: (np.eye(3), np.zeros(3)))
    cinema: Callable[[float], tuple[np.ndarray, np.ndarray]] = \
        field(default=lambda t: (np.zeros(3), np.zeros(3)))

    def contacto(self, x: np.ndarray, t: float, r=None):
        """Distancia y normal saliente (mundo) para cada partícula.

        Con `r` (los radios) la normal se calcula solo donde hay contacto. Es la
        diferencia entre seis muestreos del campo por grano y seis por grano que
        de verdad toca, que son unos pocos: el paso de integración se vuelve
        varias veces más barato sin cambiar un solo resultado.
        """
        R, c = self.pose(t)
        q = (x - c) @ R                                  # R⁻¹·(x−c) con R ortonormal
        d = self.campo.valor(q)
        n = np.zeros_like(x)
        cerca = np.ones(len(x), dtype=bool) if r is None else (d < r)
        if cerca.any():
            n[cerca] = self.campo.gradiente(q[cerca]) @ R.T
        return d, n

    def velocidad_en(self, x: np.ndarray, t: float) -> np.ndarray:
        v, w = self.cinema(t)
        _, c = self.pose(t)
        return v + np.cross(w, x - c)


class CuerpoPlano(Cuerpo):
    """Semiespacio exacto. Sin error de vóxel: la calibración se hace sobre
    geometría analítica y solo la aplicación usa las mallas.

    Admite normal cualquiera, que es lo que permite comprobar la fricción
    estática sobre un plano inclinado: un grano tiene que quedarse quieto por
    debajo del ángulo de rozamiento y deslizar por encima.
    """

    def __init__(self, nombre: str, z0: float = 0.0, normal=(0.0, 0.0, 1.0)):
        self.nombre, self.z0 = nombre, z0
        self.n = np.asarray(normal, dtype=float)
        self.n /= np.linalg.norm(self.n)

    def contacto(self, x, t, r=None):
        return x @ self.n - self.z0, np.tile(self.n, (len(x), 1))

    def velocidad_en(self, x, t):
        return np.zeros_like(x)


class CuerpoTubo(Cuerpo):
    """Pared interior de un tubo vertical de radio R entre z0 y z1.

    `alza(t)` permite levantarlo: es el ensayo de ángulo de reposo por
    retirada de cilindro, que es como se mide en la literatura.
    """

    def __init__(self, nombre: str, radio: float, z0: float, z1: float,
                 alza: Callable[[float], float] | None = None,
                 centro: tuple[float, float] = (0.0, 0.0)):
        self.nombre, self.radio, self.z0, self.z1 = nombre, radio, z0, z1
        self.alza = alza or (lambda t: 0.0)
        self.cx, self.cy = centro

    def contacto(self, x, t, r=None):
        dz = self.alza(t)
        rho = np.hypot(x[:, 0] - self.cx, x[:, 1] - self.cy)
        d = self.radio - rho                                   # + hacia dentro
        n = np.zeros_like(x)
        seguro = rho > 1e-9
        n[seguro, 0] = -(x[seguro, 0] - self.cx) / rho[seguro]
        n[seguro, 1] = -(x[seguro, 1] - self.cy) / rho[seguro]
        fuera = (x[:, 2] < self.z0 + dz) | (x[:, 2] > self.z1 + dz) | (d < -0.02)
        d = np.where(fuera, LEJOS, d)
        return d, n

    def velocidad_en(self, x, t):
        h = 1e-4
        vz = (self.alza(t + h) - self.alza(t - h)) / (2 * h)
        v = np.zeros_like(x)
        v[:, 2] = vz
        return v


class CuerpoCono(Cuerpo):
    """Pared interior de un tronco de cono vertical (el hombro del envase).

    Radio r0 en z0 y r1 en z1. Exacto, sin error de vóxel.
    """

    def __init__(self, nombre: str, r0: float, z0: float, r1: float, z1: float,
                 centro: tuple[float, float] = (0.0, 0.0)):
        self.nombre = nombre
        self.r0, self.z0, self.r1, self.z1 = r0, z0, r1, z1
        self.pend = (r1 - r0) / (z1 - z0)
        self.cos = 1.0 / math.hypot(1.0, self.pend)
        self.cx, self.cy = centro

    def contacto(self, x, t, r=None):
        rho = np.hypot(x[:, 0] - self.cx, x[:, 1] - self.cy)
        r_pared = self.r0 + self.pend * (x[:, 2] - self.z0)
        d = (r_pared - rho) * self.cos                        # distancia perpendicular
        n = np.zeros_like(x)
        seguro = rho > 1e-9
        n[seguro, 0] = -(x[seguro, 0] - self.cx) / rho[seguro] * self.cos
        n[seguro, 1] = -(x[seguro, 1] - self.cy) / rho[seguro] * self.cos
        n[:, 2] = self.pend * self.cos
        fuera = (x[:, 2] < self.z0) | (x[:, 2] > self.z1)
        return np.where(fuera, LEJOS, d), n

    def velocidad_en(self, x, t):
        return np.zeros_like(x)


# ---------------------------------------------------------------------------
# Material y motor
# ---------------------------------------------------------------------------

@dataclass
class Material:
    rho: float             # densidad de partícula, kg/m³
    k_n: float             # rigidez normal, N/m
    e_rest: float          # coeficiente de restitución
    mu_pp: float           # fricción grano-grano
    mu_pw: float           # fricción grano-pared
    mu_rod: float          # fricción de rodadura (adimensional)
    kt_kn: float = 2.0 / 7.0   # relación estándar para contacto de Hertz-Mindlin


class DEM:
    """Integrador simpléctico con lista de vecinos y resortes tangenciales.

    Las historias tangenciales viven en arrays alineados con la lista de pares;
    al reconstruir la lista se remapean por clave, que es lo que permite tener
    fricción estática de verdad sin un diccionario por paso.
    """

    def __init__(self, x, r, mat: Material, cuerpos: list[Cuerpo], dt: float,
                 semilla: int = 20260726, piel: float = 0.25, refresco: int = 15):
        self.x = np.asarray(x, dtype=float)
        self.r = np.asarray(r, dtype=float)
        self.r_final = self.r.copy()
        self.n = len(self.x)
        self.v = np.zeros((self.n, 3))
        self.w = np.zeros((self.n, 3))
        self.mat = mat
        self.m = mat.rho * (4.0 / 3.0) * math.pi * self.r ** 3
        self.I = 0.4 * self.m * self.r ** 2
        self.cuerpos = cuerpos
        self.dt = dt
        self.t = 0.0
        self.rng = np.random.default_rng(semilla)
        self.piel = piel * float(self.r.mean())
        self.refresco = refresco
        self._paso_lista = -10 ** 9
        self.pares = np.zeros((0, 2), dtype=np.int64)
        self.xi = np.zeros((0, 3))
        self.clave_par = np.zeros(0, dtype=np.int64)
        self.xi_w = np.zeros((len(cuerpos), self.n, 3))
        self.k_paso = 0
        self.fugas = 0            # contactos con solape acotado (granos que se colaron)
        self.arrastre = 0.0       # amortiguamiento global, SOLO para generar empaquetados
        self.fn_max = 0.0         # mayor fuerza normal de contacto vista (N)
        self.solape_max = 0.0     # mayor solape visto, en fracción del radio
        # amortiguamiento a partir de la restitución (Schäfer/Tsuji, lineal)
        le = math.log(max(mat.e_rest, 1e-3))
        self.zeta = -2.0 * le * math.sqrt(mat.k_n / (math.pi ** 2 + le ** 2))
        self.k_t = mat.kt_kn * mat.k_n

    # -- vecinos ------------------------------------------------------------
    def _reconstruir(self):
        rmax = float(self.r.max())
        arbol = cKDTree(self.x)
        pares = np.asarray(list(arbol.query_pairs(2.0 * rmax + self.piel)), dtype=np.int64)
        if pares.size == 0:
            pares = np.zeros((0, 2), dtype=np.int64)
        clave = pares[:, 0] * self.n + pares[:, 1] if len(pares) else np.zeros(0, np.int64)
        orden = np.argsort(clave)
        pares, clave = pares[orden], clave[orden]
        xi = np.zeros((len(pares), 3))
        if len(self.clave_par) and len(clave):          # arrastrar historia viva
            pos = np.searchsorted(self.clave_par, clave)
            pos = np.clip(pos, 0, len(self.clave_par) - 1)
            coincide = self.clave_par[pos] == clave
            xi[coincide] = self.xi[pos[coincide]]
        self.pares, self.clave_par, self.xi = pares, clave, xi
        self._paso_lista = self.k_paso

    # -- un paso ------------------------------------------------------------
    def paso(self):
        if self.k_paso - self._paso_lista >= self.refresco:
            self._reconstruir()
        F = np.zeros((self.n, 3))
        T = np.zeros((self.n, 3))
        F[:, 2] -= self.m * G_GRAV
        if self.arrastre:
            # Freno viscoso artificial: disipa la energía elástica que mete el
            # inflado y deja el lecho cuasi-estático. Se apaga antes de medir
            # nada; si quedara puesto, falsearía el flujo.
            F -= self.arrastre * self.m[:, None] * self.v
            T -= self.arrastre * self.I[:, None] * self.w

        self._grano_grano(F, T)
        self._grano_pared(F, T)

        self.v += (F / self.m[:, None]) * self.dt
        self.w += (T / self.I[:, None]) * self.dt
        self.x += self.v * self.dt
        self.t += self.dt
        self.k_paso += 1

    def _fuerza_contacto(self, delta, vn, vt, xi, m_ef, mu):
        """Normal + tangencial con tope de Coulomb. Devuelve (Fn escalar, Ft vector)."""
        gamma = self.zeta * np.sqrt(m_ef)
        fn = self.mat.k_n * delta - gamma * vn
        fn = np.maximum(fn, 0.0)
        ft = -self.k_t * xi - 0.5 * gamma[:, None] * vt
        norma = np.linalg.norm(ft, axis=1)
        tope = mu * fn
        exceso = norma > tope
        if exceso.any():
            escala = np.where(norma[exceso] > 1e-14, tope[exceso] / norma[exceso], 0.0)
            ft[exceso] *= escala[:, None]
            # el resorte se relaja hasta el límite de deslizamiento
            xi[exceso] = -ft[exceso] / self.k_t
        return fn, ft

    def _registrar(self, fn, delta, escala):
        """Guarda el pico de fuerza y de solape.

        La fuerza pico es lo que se contrasta con la carga de rotura publicada
        de la croqueta: si el mecanismo la supera, el aparato tritura el
        alimento en vez de dosificarlo. El solape valida la rigidez elegida.
        """
        if len(fn):
            self.fn_max = max(self.fn_max, float(fn.max()))
            self.solape_max = max(self.solape_max, float((delta / escala).max()))

    def _grano_grano(self, F, T):
        if not len(self.pares):
            return
        i, j = self.pares[:, 0], self.pares[:, 1]
        d = self.x[j] - self.x[i]
        dist = np.linalg.norm(d, axis=1)
        suma_r = self.r[i] + self.r[j]
        toca = dist < suma_r
        if not toca.any():
            self.xi[:] = 0.0
            return
        self.xi[~toca] = 0.0
        idx = np.flatnonzero(toca)
        i, j = i[idx], j[idx]
        nrm = d[idx] / dist[idx][:, None]
        delta = suma_r[idx] - dist[idx]
        r_ef = self.r[i] * self.r[j] / (self.r[i] + self.r[j])
        m_ef = self.m[i] * self.m[j] / (self.m[i] + self.m[j])

        # Velocidad de j respecto de i en el punto de contacto. El giro entra
        # como n × (r_i·ω_i + r_j·ω_j); al revés, el rozamiento haría girar los
        # granos en el sentido contrario al que impone el deslizamiento.
        v_rel = (self.v[j] - self.v[i]) + np.cross(
            nrm, self.w[i] * self.r[i][:, None] + self.w[j] * self.r[j][:, None])
        vn = np.einsum("ij,ij->i", v_rel, nrm)       # < 0 al acercarse
        vt = v_rel - vn[:, None] * nrm

        xi = self.xi[idx]
        xi -= np.einsum("ij,ij->i", xi, nrm)[:, None] * nrm      # proyectar al plano
        xi += vt * self.dt
        fn, ft = self._fuerza_contacto(delta, vn, vt, xi, m_ef, self.mat.mu_pp)
        self.xi[idx] = xi
        self._registrar(fn, delta, r_ef * 2.0)

        fuerza = fn[:, None] * nrm + ft
        np.add.at(F, i, -fuerza)
        np.add.at(F, j, fuerza)
        par = np.cross(nrm, ft)
        np.add.at(T, i, -par * self.r[i][:, None])
        np.add.at(T, j, -par * self.r[j][:, None])

        w_rel = self.w[j] - self.w[i]
        nw = np.linalg.norm(w_rel, axis=1)
        vivo = nw > 1e-9
        if vivo.any():
            mr = (-self.mat.mu_rod * r_ef[vivo] * fn[vivo])[:, None] * \
                (w_rel[vivo] / nw[vivo][:, None])
            np.add.at(T, i[vivo], -mr)
            np.add.at(T, j[vivo], mr)

    def _grano_pared(self, F, T):
        for b, cuerpo in enumerate(self.cuerpos):
            d, nrm = cuerpo.contacto(self.x, self.t, self.r)
            toca = d < self.r
            if not toca.any():
                self.xi_w[b, :] = 0.0
                continue
            fuera = ~toca
            self.xi_w[b, fuera] = 0.0
            idx = np.flatnonzero(toca)
            n_i = nrm[idx]
            delta = self.r[idx] - d[idx]
            # Un grano que se coló al otro lado de la pared daría un solape
            # enorme y una fuerza que revienta el integrador. Se acota, pero se
            # CUENTA: si el contador no es cero, la corrida no es limpia y hay
            # que decirlo, no taparlo.
            tope = 0.35 * self.r[idx]
            colado = delta > tope
            if colado.any():
                self.fugas += int(colado.sum())
                delta = np.minimum(delta, tope)
            # Velocidad del GRANO respecto de la PARED en el punto de contacto,
            # que está a −r·n del centro. Este orden importa: invertido, el
            # rozamiento empuja al grano en el sentido de su marcha en vez de
            # frenarlo, y sin rozamiento que frene no hay ángulo de reposo ni
            # arcos —justo lo que se quiere medir—.
            v_pared = cuerpo.velocidad_en(self.x[idx], self.t)
            u = (self.v[idx] - v_pared) - self.r[idx][:, None] * np.cross(self.w[idx], n_i)
            vn = np.einsum("ij,ij->i", u, n_i)
            vt = u - vn[:, None] * n_i

            xi = self.xi_w[b, idx]
            xi -= np.einsum("ij,ij->i", xi, n_i)[:, None] * n_i
            xi += vt * self.dt
            fn, ft = self._fuerza_contacto(delta, vn, vt, xi, self.m[idx], self.mat.mu_pw)
            self.xi_w[b, idx] = xi
            self._registrar(fn, delta, self.r[idx])

            F[idx] += fn[:, None] * n_i + ft
            T[idx] -= self.r[idx][:, None] * np.cross(n_i, ft)

            nw = np.linalg.norm(self.w[idx], axis=1)
            vivo = nw > 1e-9
            if vivo.any():
                sel = idx[vivo]
                T[sel] -= (self.mat.mu_rod * self.r[sel] * fn[vivo])[:, None] * \
                    (self.w[sel] / nw[vivo][:, None])

    def escalar_radios(self, s: float) -> None:
        """Fija los radios a una fracción `s` de los finales (masa e inercia al día).

        Sirve para nacer pequeño y crecer: se siembra denso, sin solape, y los
        granos se inflan mientras la gravedad los reacomoda. Es la forma barata
        de empezar de un empaquetamiento realista en vez de uno elegido.
        """
        self.r = self.r_final * s
        self.m = self.mat.rho * (4.0 / 3.0) * math.pi * self.r ** 3
        self.I = 0.4 * self.m * self.r ** 2

    def reciclar(self, idx: np.ndarray, destino: np.ndarray) -> None:
        """Devuelve los granos que salieron a lo alto del depósito.

        Mantiene constante la carga sobre la boca: sin esto la columna baja
        golpe a golpe y la dosis medida arrastraría esa deriva. Se borra toda
        la historia de contacto de esos granos, que ya no es la suya.
        """
        if not len(idx):
            return
        self.x[idx] = destino
        self.v[idx] = 0.0
        self.w[idx] = 0.0
        self.xi_w[:, idx, :] = 0.0
        self._paso_lista = -10 ** 9          # forzar reconstrucción de vecinos

    # -- utilidades ---------------------------------------------------------
    @property
    def masa_total(self) -> float:
        return float(self.m.sum())

    def energia_cinetica(self) -> float:
        return float(0.5 * (self.m * (self.v ** 2).sum(1)).sum() +
                     0.5 * (self.I * (self.w ** 2).sum(1)).sum())

    def dt_critico(self) -> float:
        """Periodo del contacto más rígido / 2π: el dt debe quedar muy por debajo."""
        return float(math.sqrt(self.m.min() / self.mat.k_n))


# ---------------------------------------------------------------------------
# Calibración del modelo de contacto
# ---------------------------------------------------------------------------

def restitucion_efectiva(rho: float, k_n: float, e_param: float, d: float,
                         dt: float, altura: float = 0.094) -> float:
    """Restitución que REALMENTE sale del modelo, medida dejando caer un grano.

    No coincide con el parámetro nominal: el tope fn ≥ 0 (el contacto no puede
    tirar del grano) recorta el amortiguamiento al final del choque y sube el
    rebote. Se mide en vez de suponerse.
    """
    mat = Material(rho=rho, k_n=k_n, e_rest=e_param, mu_pp=0.0, mu_pw=0.0, mu_rod=0.0)
    s = DEM(x=[[0.0, 0.0, d / 2 + altura]], r=[d / 2], mat=mat,
            cuerpos=[CuerpoPlano("suelo")], dt=dt)
    v_ant = 0.0
    for _ in range(int(3.0 * math.sqrt(2 * altura / G_GRAV) / dt)):
        s.paso()
        if v_ant > 0.0 and s.v[0, 2] <= 0.0:
            return math.sqrt(max(s.x[0, 2] - d / 2, 0.0) / altura)
        v_ant = s.v[0, 2]
    return float("nan")


def calibrar_restitucion(objetivo: float, rho: float, k_n: float, d: float,
                         dt: float, vueltas: int = 12) -> float:
    """Parámetro nominal que produce la restitución medida `objetivo` (bisección)."""
    lo, hi = 0.02, 0.98
    for _ in range(vueltas):
        med = 0.5 * (lo + hi)
        if restitucion_efectiva(rho, k_n, med, d, dt) > objetivo:
            hi = med
        else:
            lo = med
    return 0.5 * (lo + hi)
