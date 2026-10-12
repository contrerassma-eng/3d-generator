#!/usr/bin/env python3
"""YOLO NoLabel (x2): twin belt 80+150+80, justificador y girador con omniwheels B4.

Calcula y dibuja, con los parametros de P (se cambian aqui o en el JSON que se escribe):
  1. Margenes de lectura del QR de 25 mm por la luz de 150 (caja 300x250 y 500x300
     justificadas a la derecha) y apoyo de la caja chica sobre la banda izquierda.
  2. Campo, resolucion y tiempo de lectura de la Keyence SR-X300W desde abajo.
  3. Cinematica Mecanum: vx=(wA+wB)/2, vy=(wA-wB)/2 (ruedas que ruedan en X) y
     vx=(rA-rB)/2, vy=(rA+rB)/2 (modulo girado, ruedas que ruedan en Y).
  4. Simulacion fisica (caja rigida sobre contactos con friccion de Coulomb en el eje de
     cada rodillo) del justificado y del giro de 90 grados de la caja chica.
  5. Tiempos por caja en el girador, paso minimo y cadencia maxima.
Salida: planta_unidad_twinbelt.png, verificacion_qr.png, girador_secuencia.png en --out,
y parametros/resultados JSON en projects/YOLO-NOLABEL-GIRO90/.

Uso: python tools/gen_nolabel_twinbelt.py --out "<carpeta de imagenes>"
Ejes: X = avance (0 = inicio del justificado), Y = lateral medido desde la guia derecha
(cara de la caja que imprime la NoLabel) hacia la izquierda. Z = arriba. Cotas en mm.
"""
import argparse
import json
import math
import os

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Rectangle, Polygon, FancyArrowPatch  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
PROY = os.path.normpath(os.path.join(AQUI, "..", "projects", "YOLO-NOLABEL-GIRO90"))

P = {
    "cajas": {"chica": {"ancho": 300, "largo": 250}, "grande": {"ancho": 500, "largo": 300}},
    "qr": 25,
    "tol": {"ancho_caja": 5.0, "holgura_guia_max": 5.0, "qr_ubicacion": 5.0,
            "deriva_banda": 2.0, "zona_quieta": 4.0},
    "twin_belt": {"banda": 80, "luz": 150, "centro_luz": 202.5, "largo": 1200, "v_mmin": 30},
    "camara": {"modelo": "Keyence SR-X300W", "px": [1920, 1200], "campo_ref": [267, 166],
               "dist_ref": 300, "dist": 300, "x_tb": 150, "inclinacion_deg": 15,
               "fuente": "Data Sheet SR-X300W, Keyence America 2025-03-06"},
    "layout": {"MB800": [-400, -30], "J1": [0, 390], "J2": [410, 800], "TB": [820, 2020],
               "G": [2060, 2658], "cabezal_x": 1420, "fotocelda_nolabel_x": 1380,
               "secadores_x": [1540, 2020], "mb800_ancho_banda": 490},
    "J": {"ejes_y0": 10, "paso": 74.75, "n_ejes": 8, "ruedas_x": [78, 156, 234, 312],
          "v_guia": 30, "vy": -24, "vy_retener": -8, "d_rueda": 64, "v_mb800": 30, "mu_banda": 0.8},
    "G": {"ejes_x0": 37.4, "paso": 74.75, "n_ejes": 8, "ruedas_y": [80, 158, 236, 314],
          "ancho_rueda": 40, "v_max": 60, "a": 3.0, "v_trans": 60, "u_giro": 20, "t_giro": 0.65,
          "placa_x": 600, "v_contacto": 15, "v_empuje": 30, "v_apriete": 3,
          "y_libre": 520, "salida_y0": 420, "t_asiento": 0.10},
    "sim": {"mu": 0.5, "c_rod": 0.05, "mu_guia": 0.2},
}

C_A = "#2f6db3"   # mano A: rodillos "/" vistos desde arriba
C_B = "#d9822b"   # mano B: rodillos "\"
C_OK = "#2e8b57"
C_MAL = "#c0392b"
C_GRIS = "#8a8f98"


# ----------------------------------------------------------------------------- calculo
def margenes(P):
    tb, t, q = P["twin_belt"], P["tol"], P["qr"]
    y_der = tb["centro_luz"] - tb["luz"] / 2
    y_izq = tb["centro_luz"] + tb["luz"] / 2
    r = {"banda_der": [y_der - tb["banda"], y_der], "banda_izq": [y_izq, y_izq + tb["banda"]],
         "luz": [y_der, y_izq]}
    s_med = t["holgura_guia_max"] / 2
    sig = math.sqrt((t["ancho_caja"] / 2) ** 2 + (t["holgura_guia_max"] / 2) ** 2
                    + t["qr_ubicacion"] ** 2 + t["deriva_banda"] ** 2)
    for k, c in P["cajas"].items():
        yc = c["ancho"] / 2
        nom = [yc + s_med - q / 2, yc + s_med + q / 2]
        peor = [yc - t["ancho_caja"] / 2 - t["qr_ubicacion"] - t["deriva_banda"] - q / 2,
                yc + t["ancho_caja"] / 2 + t["holgura_guia_max"] + t["qr_ubicacion"]
                + t["deriva_banda"] + q / 2]
        rss = [yc + s_med - sig - q / 2, yc + s_med + sig + q / 2]
        r[k] = {"centro": yc, "nom": nom, "peor": peor, "rss": rss,
                "margen_der": {"nom": nom[0] - y_der, "rss": rss[0] - y_der, "peor": peor[0] - y_der},
                "margen_izq": {"nom": y_izq - nom[1], "rss": y_izq - rss[1], "peor": y_izq - peor[1]}}
    ch = P["cajas"]["chica"]["ancho"]
    r["apoyo_chica_izq"] = {"nom": ch + s_med - y_izq, "min": ch - t["ancho_caja"] - y_izq,
                            "max": ch + t["ancho_caja"] + t["holgura_guia_max"] - y_izq}
    r["sigma_rss"] = sig
    return r


def camara(P):
    c, v = P["camara"], P["twin_belt"]["v_mmin"] / 60 * 1000  # mm/s
    k = c["dist"] / c["dist_ref"]
    cy, cx = c["campo_ref"][0] * k, c["campo_ref"][1] * k        # a lo ancho (Y) y a lo largo (X)
    mm_px = cy / c["px"][0]
    t_vista = (cx - P["qr"]) / v
    # presupuesto lectura -> impresion (peor caso: lectura al salir del campo)
    L = P["layout"]
    x_cam = L["TB"][0] + c["x_tb"]
    x_ult = x_cam + (cx - P["qr"]) / 2
    pres = {}
    for kk, cj in P["cajas"].items():
        x_centro_disparo = L["fotocelda_nolabel_x"] - cj["largo"] / 2
        pres[kk] = {"peor_s": (x_centro_disparo - x_ult) / v,
                    "mejor_s": (x_centro_disparo - (x_cam - (cx - P["qr"]) / 2)) / v}
    return {"campo_Y": cy, "campo_X": cx, "mm_px": mm_px, "px_qr": P["qr"] / mm_px,
            "px_modulo_v2": (P["qr"] / 25) / mm_px, "px_modulo_v3": (P["qr"] / 29) / mm_px,
            "t_en_campo_s": t_vista, "x_cam": x_cam, "presupuesto_lectura_impresion": pres,
            "semi_angulo_Y_deg": math.degrees(math.atan(c["campo_ref"][0] / 2 / c["dist_ref"])),
            "semi_angulo_X_deg": math.degrees(math.atan(c["campo_ref"][1] / 2 / c["dist_ref"]))}


def mando_J(J):
    """Modulo girado (ruedas ruedan en Y): vx=(rA-rB)/2, vy=(rA+rB)/2.
    La mano A fija la velocidad de la caja ya apoyada en la guia (rA = v_guia);
    la mano B pone el empuje lateral de la caja suelta."""
    rA = J["v_guia"]
    rB = 2 * J["vy"] - rA
    return rA, rB, (rA - rB) / 2


def justificador(P):
    J = P["J"]
    rA, rB, vx_libre = mando_J(J)
    vy = J["vy"]
    rpm = lambda r: abs(r) / (math.pi * J["d_rueda"] / 1000)
    largo_J = P["layout"]["J2"][1] - P["layout"]["J1"][0]
    dy_max = P["layout"]["mb800_ancho_banda"] - P["cajas"]["chica"]["ancho"] + 10
    return {"rA": rA, "rB": rB, "vx_libre": vx_libre, "rpmA": rpm(rA), "rpmB": rpm(rB),
            "angulo_libre_deg": math.degrees(math.atan2(-vy, vx_libre)), "dy_max_diseno": dy_max,
            "retener": {"rA": J["vy_retener"], "rB": J["vy_retener"]}, "largo": largo_J}


def perfil_centrado(v0, d, a, vmax):
    vp = min(vmax, math.sqrt((v0 ** 2 + 2 * a * d) / 2))
    t1, d1 = (vp - v0) / a, (vp ** 2 - v0 ** 2) / (2 * a)
    t3, d3 = vp / a, vp ** 2 / (2 * a)
    t2 = max(0.0, d - d1 - d3) / vp
    return vp, t1 + t2 + t3


def perfil_a_placa(v0, d, a, vmax, vc, d_final=0.02):
    """De v0 a vmax y frena a vc, recorriendo d; los ultimos d_final a vc (contacto suave)."""
    d_ef = d - d_final
    vp = min(vmax, math.sqrt((v0 ** 2 + vc ** 2 + 2 * a * d_ef) / 2))
    t1, d1 = (vp - v0) / a, (vp ** 2 - v0 ** 2) / (2 * a)
    t3, d3 = (vp - vc) / a, (vp ** 2 - vc ** 2) / (2 * a)
    t2 = max(0.0, d_ef - d1 - d3) / vp
    return vp, t1 + t2 + t3 + d_final / vc


def tiempos(P, sg):
    """Ciclo del girador por caja: desde que el frente entra al girador hasta que queda libre."""
    G, v0 = P["G"], P["twin_belt"]["v_mmin"] / 60
    a, vmax, vt = G["a"], G["v_max"] / 60, G["v_trans"] / 60
    xs = (G["ejes_x0"] + G["paso"] * (G["n_ejes"] - 1) / 2) / 1000     # centro del modulo
    ta, da = vt / a, vt ** 2 / (2 * a)
    out = {}
    # grande: directo a la placa, contacto a v_contacto, y transfiere sin girar
    c = P["cajas"]["grande"]
    x_fin = (G["placa_x"] - c["largo"] / 2) / 1000
    vp, t_c = perfil_a_placa(v0, x_fin, a, vmax, G["v_contacto"] / 60)
    t_in = c["largo"] / 2000 / v0 + t_c
    t_tr = ta + max(0.0, G["y_libre"] / 1000 - da) / vt
    T = t_in + G["t_asiento"] + t_tr
    out["grande"] = {"v_pico_mmin": vp * 60, "t_entrada": t_in, "t_giro": 0.0, "t_transfer": t_tr, "ciclo": T}
    # chica: frena al centro, gira por tiempo, avanza contra la placa (escuadra) y transfiere
    c = P["cajas"]["chica"]
    vp, t_c = perfil_centrado(v0, xs, a, vmax)
    t_in = c["largo"] / 2000 / v0 + t_c
    y_der = sg["y_cara_der_fin_mm"] / 1000
    t_tr = ta + max(0.0, G["y_libre"] / 1000 - y_der - da) / vt
    t_rot = sg["t_escuadrada_s"]
    T = t_in + t_rot + G["t_asiento"] + t_tr
    out["chica"] = {"v_pico_mmin": vp * 60, "t_entrada": t_in, "t_giro": t_rot, "t_transfer": t_tr, "ciclo": T}
    for k, cj in P["cajas"].items():
        o = out[k]
        o["cadencia"] = 60 / o["ciclo"]
        o["paso_tb_mm"] = v0 * o["ciclo"] * 1000
        o["gap_tb_mm"] = o["paso_tb_mm"] - cj["largo"]
    Tm = (out["chica"]["ciclo"] + out["grande"]["ciclo"]) / 2
    out["mezcla_50"] = {"ciclo": Tm, "cadencia": 60 / Tm}
    return out


# ----------------------------------------------------------------------------- simulacion
def sim_caja(cx, cy, mano, rim, box0, dims, t_end, guia=False, sim=None, dt=2e-4,
             parar=None, eps=0.003, placa=None, banda=None):
    """Caja rigida sobre contactos puntuales (m, s). mano: +1 A '/', -1 B '\\'.
    rim(t) -> (ux_rim, uy_rim) velocidad de la parte alta de cada rueda.
    banda: (bx, by, v, mu) puntos de una banda comun (roce isotropo) que avanza a v en X."""
    mu, cr, mug = sim["mu"], sim["c_rod"], sim["mu_guia"]
    if banda is not None:
        bbx, bby, bv, bmu = banda
    ux = np.full(cx.shape, 1 / math.sqrt(2)); uy = mano / math.sqrt(2)
    nx, ny = -uy, ux
    a, b = dims
    Iom = ((2 * a) ** 2 + (2 * b) ** 2) / 12
    x, y, th, vx, vy, w = box0
    g, K = 9.81, 1e5
    D = 2 * math.sqrt(K)
    hist = []
    t = 0.0
    while t < t_end:
        c, s = math.cos(th), math.sin(th)
        dx, dy = cx - x, cy - y
        bx, by = c * dx + s * dy, -s * dx + c * dy
        act = (np.abs(bx) <= a) & (np.abs(by) <= b)
        n = int(act.sum())
        ax = ay = tau = 0.0
        nb = 0
        if banda is not None:
            ddx, ddy = bbx - x, bby - y
            qx, qy = c * ddx + s * ddy, -s * ddx + c * ddy
            actb = (np.abs(qx) <= a) & (np.abs(qy) <= b)
            nb = int(actb.sum())
        if nb:
            Nb = g / (n + nb)
            ddx, ddy = ddx[actb], ddy[actb]
            sx, sy = (vx - w * ddy) - bv, (vy + w * ddx)
            sm = np.hypot(sx, sy) + 1e-12
            f = -bmu * Nb * np.tanh(sm / eps) / sm
            Fbx, Fby = f * sx, f * sy
            ax += Fbx.sum(); ay += Fby.sum()
            tau += (ddx * Fby - ddy * Fbx).sum()
        if n:
            N = g / (n + nb)
            rx, ry = rim(t)
            sx = (vx - w * dy) - rx
            sy = (vy + w * dx) - ry
            su = sx * ux + sy * uy
            sn = sx * nx + sy * ny
            fu = -mu * N * np.tanh(su / eps)
            fn = -cr * N * np.tanh(sn / eps)
            Fx = (fu * ux + fn * nx)[act]
            Fy = (fu * uy + fn * ny)[act]
            ax += Fx.sum(); ay += Fy.sum()
            tau += (dx[act] * Fy - dy[act] * Fx).sum()
        if guia:
            for px, py in ((a, b), (a, -b), (-a, b), (-a, -b)):
                rxw, ryw = c * px - s * py, s * px + c * py
                yc = y + ryw
                if yc < 0:
                    vcx, vcy = vx - w * ryw, vy + w * rxw
                    Fn = max(0.0, K * (-yc) - D * vcy)
                    Ft = -mug * Fn * math.tanh(vcx / eps)
                    ax += Ft; ay += Fn
                    tau += rxw * Fn - ryw * Ft
        if placa is not None:                       # placa frontal de tope en x = placa
            for px, py in ((a, b), (a, -b), (-a, b), (-a, -b)):
                rxw, ryw = c * px - s * py, s * px + c * py
                if x + rxw > placa:
                    vcx, vcy = vx - w * ryw, vy + w * rxw
                    Fn = max(0.0, K * (x + rxw - placa) + D * vcx)
                    Ft = -mug * Fn * math.tanh(vcy / eps)
                    ax += -Fn; ay += Ft
                    tau += rxw * Ft + ryw * Fn
        vx += ax * dt; vy += ay * dt; w += tau / Iom * dt
        x += vx * dt; y += vy * dt; th += w * dt
        t += dt
        hist.append((t, x, y, th, vx, vy, w))
        if parar and parar(t, x, y, th, vx, vy, w):
            break
    return np.array(hist)


def _contactos_girador(G):
    xk = np.array([G["ejes_x0"] + G["paso"] * k for k in range(G["n_ejes"])])
    X, Y = np.meshgrid(xk, np.array(G["ruedas_y"], float), indexing="ij")
    mano = np.where((np.arange(G["n_ejes"]) % 2) == 0, 1.0, -1.0)[:, None] * np.ones_like(Y)
    return X.ravel(), Y.ravel(), mano.ravel(), xk.mean()


def sim_girador(P, u_mmin=None, t_giro=None, libre=False):
    """Caja chica detenida al centro: giro libre por tiempo (4 grupos) y luego avance contra la
    placa frontal, que la escuadra a 90 si al soltar el giro va entre ~50 y ~130 grados.
    libre=True: solo giro, sin placa (para mostrar por que no basta)."""
    G, S = P["G"], P["sim"]
    X, Y, mano, xs = _contactos_girador(G)
    u = (u_mmin if u_mmin is not None else G["u_giro"]) / 60
    tg = t_giro if t_giro is not None else G["t_giro"]
    wa = np.where(X > xs, u, -u) * mano          # A: +u adelante / -u atras ; B al reves
    ve = G["v_empuje"] / 60
    zeros = 0 * wa
    rim = (lambda t: (wa, zeros)) if libre else (lambda t: (wa, zeros) if t < tg else (zeros + ve, zeros))
    ch = P["cajas"]["chica"]
    dims = (ch["largo"] / 2000, ch["ancho"] / 2000)
    h = sim_caja(X / 1000, Y / 1000, mano, rim, (xs / 1000, ch["ancho"] / 2000, 0, 0, 0, 0), dims,
                 3.0 if libre else tg + 1.8, sim=S, placa=None if libre else G["placa_x"] / 1000)
    th = np.degrees(h[:, 3])
    i_suelta = int(np.searchsorted(h[:, 0], tg))
    ok = np.where((np.abs(th - 90) < 1.0) & (np.abs(h[:, 6]) < 0.05) & (np.arange(len(h)) > i_suelta))[0]
    f = h[-1]
    return {"u_mmin": u * 60, "t_giro_s": tg, "th_al_soltar_deg": float(th[min(i_suelta, len(th) - 1)]),
            "t_escuadrada_s": float(h[ok[0], 0]) if len(ok) else None, "th_fin_deg": float(th[-1]),
            "centro_fin_mm": [float(f[1] * 1000), float(f[2] * 1000)],
            "y_cara_der_fin_mm": float(f[2] * 1000 - dims[0] * 1000),
            "th_max_libre_deg": float(th.max()), "hist": h[::50, :4].tolist()}


def sim_justificado(P, caja="chica", dy0=200.0):
    J, L, S = P["J"], P["layout"], P["sim"]
    ys = np.array([J["ejes_y0"] + J["paso"] * k for k in range(J["n_ejes"])])
    xw = []
    for mod in ("J1", "J2"):
        xw += [L[mod][0] + x for x in J["ruedas_x"]]
    X, Y = np.meshgrid(np.array(xw, float), ys, indexing="ij")
    mano = np.ones_like(Y) * np.where((np.arange(J["n_ejes"]) % 2) == 0, 1.0, -1.0)[None, :]
    rA, rB, _ = mando_J(J)
    ry = np.where(mano > 0, rA / 60, rB / 60).ravel()
    c = P["cajas"][caja]
    dims = (c["largo"] / 2000, c["ancho"] / 2000)
    # banda MB800 (roce isotropo) desde X = MB800[0] hasta MB800[1]
    gx, gy = np.meshgrid(np.arange(L["MB800"][0], L["MB800"][1] + 1, 40.0),
                         np.arange(0, L["mb800_ancho_banda"] + 1, 40.0), indexing="ij")
    banda = (gx.ravel() / 1000, gy.ravel() / 1000, J["v_mb800"] / 60, J["mu_banda"])
    x0 = L["MB800"][1] / 1000 - dims[0]          # frente justo al final de la MB800
    y0 = dy0 / 1000 + dims[1]
    reg = {"x_toque": None, "t_toque": None}
    x_tb = L["TB"][0] / 1000

    def parar(t, x, y, th, *r):
        ymin = y - dims[0] * abs(math.sin(th)) - dims[1] * abs(math.cos(th))
        if reg["x_toque"] is None and ymin < 0.002:
            reg["x_toque"], reg["t_toque"] = (x + dims[0]) * 1000, t
        return x + dims[0] >= x_tb
    h = sim_caja(X.ravel() / 1000, Y.ravel() / 1000, mano.ravel(), lambda t: (0 * ry, ry),
                 (x0, y0, 0, J["v_mb800"] / 60, 0, 0), dims, 5.0, guia=True, sim=S, parar=parar, banda=banda)
    fin = h[-1]
    return {"caja": caja, "dy0_mm": dy0, "x_frente_al_tocar_guia_mm": reg["x_toque"],
            "y_cara_der_al_llegar_tb_mm": float((fin[2] - dims[1]) * 1000),
            "angulo_al_llegar_tb_deg": float(math.degrees(fin[3])),
            "angulo_max_deg": float(np.degrees(np.abs(h[:, 3])).max()),
            "vx_al_llegar_tb_mmin": float(fin[4] * 60), "t_s": float(fin[0])}


# ----------------------------------------------------------------------------- dibujo
def _ruedas_girado(ax, x0, J, alpha=1.0):
    """Modulo B4 girado: ejes a lo largo de X, ruedas que ruedan en Y."""
    for k in range(J["n_ejes"]):
        yk = J["ejes_y0"] + J["paso"] * k
        col, hat = (C_A, "////") if k % 2 == 0 else (C_B, "\\\\\\\\")
        ax.plot([x0 + J["ruedas_x"][0] - 30, x0 + J["ruedas_x"][-1] + 30], [yk, yk], color="#555", lw=0.8, zorder=2)
        for xr in J["ruedas_x"]:
            ax.add_patch(Rectangle((x0 + xr - 20, yk - 32), 40, 64, fc="white", ec=col, hatch=hat,
                                   lw=0.8, alpha=alpha, zorder=3))


def _ruedas_std(ax, x0, G, y_off=0.0, alpha=1.0):
    """Modulo B4 estandar: ejes a lo ancho (Y), ruedas que ruedan en X."""
    for k in range(G["n_ejes"]):
        xk = x0 + G["ejes_x0"] + G["paso"] * k
        col, hat = (C_A, "////") if k % 2 == 0 else (C_B, "\\\\\\\\")
        ax.plot([xk, xk], [G["ruedas_y"][0] - 30 + y_off, G["ruedas_y"][-1] + 30 + y_off], color="#555", lw=0.8, zorder=2)
        for yr in G["ruedas_y"]:
            ax.add_patch(Rectangle((xk - 32, yr - 20 + y_off), 64, 40, fc="white", ec=col, hatch=hat,
                                   lw=0.8, alpha=alpha, zorder=3))


def _caja(ax, xc, yc, L, W, th=0.0, **kw):
    c, s = math.cos(th), math.sin(th)
    pts = [(-L / 2, -W / 2), (L / 2, -W / 2), (L / 2, W / 2), (-L / 2, W / 2)]
    ax.add_patch(Polygon([(xc + c * px - s * py, yc + s * px + c * py) for px, py in pts], closed=True, **kw))


def _flecha(ax, x0, y0, x1, y1, col="k", lw=1.6, ms=12, z=6):
    ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle="-|>", mutation_scale=ms, color=col, lw=lw, zorder=z))


def _cota(ax, x0, x1, y, txt, col="#333"):
    ax.annotate("", xy=(x0, y), xytext=(x1, y), arrowprops=dict(arrowstyle="<->", color=col, lw=1))
    ax.text((x0 + x1) / 2, y + 18, txt, ha="center", va="bottom", fontsize=9, color=col)


def fig_planta(P, R, out):
    L, J, G, tb = P["layout"], P["J"], P["G"], P["twin_belt"]
    fig, ax = plt.subplots(figsize=(16, 8.6), dpi=110)
    # MB800
    ax.add_patch(Rectangle((L["MB800"][0], 0), L["MB800"][1] - L["MB800"][0], L["mb800_ancho_banda"], fc="#e6e6e6", ec=C_GRIS))
    ax.text((L["MB800"][0] + L["MB800"][1]) / 2, 245, "MB800\nexistente\nbanda 490", ha="center", va="center", fontsize=9, color="#555")
    # justificador
    for mod in ("J1", "J2"):
        x0, x1 = L[mod]
        ax.add_patch(Rectangle((x0, -35), x1 - x0, 610, fc="#f4f7fb", ec="#9fb3c8", lw=1.2, zorder=1))
        _ruedas_girado(ax, x0, J)
        ax.text((x0 + x1) / 2, 590, f"{mod} · B4 girado 90°", ha="center", fontsize=9, color="#34495e")
    # guia
    ax.plot([-120, 1330], [-4, -4], color="#1f2d3a", lw=3.2, zorder=5)
    ax.text(-110, -40, "guía derecha UHMW (Y = 0: cara que imprime la NoLabel)", fontsize=8.5, color="#1f2d3a", va="top")
    # twin belt
    for y0, y1 in (R["m"]["banda_der"], R["m"]["banda_izq"]):
        ax.add_patch(Rectangle((L["TB"][0], y0), L["TB"][1] - L["TB"][0], y1 - y0, fc="#5b6570", ec="#39424b", zorder=2))
    ax.add_patch(Rectangle((L["TB"][0], R["m"]["luz"][0]), L["TB"][1] - L["TB"][0], tb["luz"], fc="#dff3e6", ec="none", zorder=1))
    ax.text(830, 385, "Twin belt M-Haste 1.200 · 2 bandas de 80 · luz 150", ha="left", fontsize=9.5, color="#2c3e50", zorder=7)
    # camara
    cam = R["cam"]
    xc = cam["x_cam"]
    ax.add_patch(Rectangle((xc - cam["campo_X"] / 2, tb["centro_luz"] - cam["campo_Y"] / 2), cam["campo_X"], cam["campo_Y"],
                           fc="none", ec=C_OK, ls="--", lw=1.4, zorder=6))
    ax.add_patch(Rectangle((xc - 18, tb["centro_luz"] - 28), 36, 56, fc=C_OK, ec="k", lw=0.6, zorder=7))
    ax.text(xc - 40, -70, "SR-X300W 300 mm bajo la banda\ncampo 267 × 166 (verde)", ha="center", va="top", fontsize=8.5, color=C_OK, zorder=7)
    # cabezal y secadores
    ax.add_patch(Rectangle((L["cabezal_x"] - 105, -153), 210, 150, fc="#f2f2f2", ec="#b03a2e", lw=1.5, zorder=4))
    ax.add_patch(Rectangle((L["cabezal_x"] - 120, -8), 240, 5, fc="#c0392b", ec="none", zorder=5))
    ax.text(L["cabezal_x"], -80, "cabezal\nNoLabel", ha="center", va="center", fontsize=8.5, color="#b03a2e")
    xs0, xs1 = L["secadores_x"]
    w3 = (xs1 - xs0) / 3
    for i in range(3):
        ax.add_patch(Rectangle((xs0 + i * w3 + 6, -150 + 25 * i), w3 - 12, 110, fc="#4a4a4a", ec="#222", zorder=4))
        ax.add_patch(Rectangle((xs0 + i * w3 + 20, -44 + 25 * i), w3 - 40, 8, fc="#f1c40f", ec="none", zorder=5))
    ax.text((xs0 + xs1) / 2, -205, "3 secadores UV Excelitas/Phoseon FJ100 (ventana 150 × 20)", ha="center", fontsize=8.5, color="#333")
    # girador
    gx0, gx1 = L["G"]
    ax.add_patch(Rectangle((gx0, 5), gx1 - gx0, 410, fc="#fbf7f1", ec="#c8a97e", lw=1.2, zorder=1))
    _ruedas_std(ax, gx0, G)
    xs = gx0 + G["ejes_x0"] + G["paso"] * (G["n_ejes"] - 1) / 2
    ax.plot([xs, xs], [0, 420], color="#8e44ad", ls=":", lw=1.3, zorder=4)
    ax.text(gx0 + 150, -45, "zona trasera\nTA · TB", ha="center", va="top", fontsize=8.5, color="#6c3483")
    ax.text(gx0 + 430, -45, "zona delantera\nDA · DB", ha="center", va="top", fontsize=8.5, color="#6c3483")
    ax.text((gx0 + gx1) / 2, -125, "G · B4 con 4 grupos", ha="center", va="top", fontsize=9, color="#34495e")
    xpl = gx0 + G["placa_x"]
    # salida (carril comun: x de la placa - 300 a la placa)
    xc_s = xpl - 150
    sx0, sx1 = xc_s - 305, xc_s + 305
    ax.add_patch(Rectangle((sx0, G["salida_y0"]), sx1 - sx0, 700, fc="#eef2f5", ec="#9aa7b3", zorder=1))
    for yy in np.arange(G["salida_y0"] + 30, G["salida_y0"] + 700, 75):
        ax.plot([sx0 + 10, sx1 - 10], [yy, yy], color="#c3ccd4", lw=1, zorder=1)
    ax.plot([xpl - 315, xpl - 315], [G["y_libre"] + 20, G["salida_y0"] + 700], color="#1f2d3a", lw=2)
    ax.plot([xpl, xpl], [-150, G["salida_y0"] + 700], color="#1f2d3a", lw=4, zorder=6)
    ax.text(xpl + 12, -140, "placa de tope\nUHMW (escuadra)", fontsize=8.5, color="#1f2d3a", va="bottom")
    for yy in (60, 240):
        ax.plot([xpl - 8], [yy], marker="s", ms=7, mfc="#e67e22", mec="k", zorder=8)
    ax.text(xpl + 12, 150, "PE-P1\nPE-P2", fontsize=8.5, color="#e67e22", fontweight="bold", va="center")
    _flecha(ax, xc_s, 880, xc_s, 1080, col=C_OK, lw=2.2, ms=18)
    ax.text(xc_s - 140, 640, "salida 90° izquierda\n(supuesto) · 60 m/min\n10 mm más baja", fontsize=7.5, color=C_OK, ha="left")
    # cajas fantasma: chica justificandose, grande en la camara, chica girando y escuadrada
    ch, gr = P["cajas"]["chica"], P["cajas"]["grande"]
    for xcj, ycj, al in ((95, 350, 0.35), (420, 240, 0.5), (690, 150, 0.8)):
        _caja(ax, xcj, ycj, ch["largo"], ch["ancho"], fc=C_A, ec=C_A, alpha=al * 0.25, lw=1.2, zorder=6)
    _flecha(ax, 150, 330, 640, 175, col=C_A, lw=1.5)
    rA, rB, vxl = mando_J(J)
    ax.text(0, 640, f"caja suelta: vx {vxl:.0f} · vy {J['vy']} m/min · apoyada en la guía: {rA:.0f} m/min", fontsize=8.5, color=C_A, zorder=8)
    _caja(ax, 1840, 250, gr["largo"], gr["ancho"], fc="none", ec=C_B, lw=1.5, ls="-", zorder=6)
    ax.text(1840, 520, "caja 500 × 300", ha="center", fontsize=8.5, color=C_B)
    _caja(ax, xs, 150, ch["largo"], ch["ancho"], th=math.radians(70), fc="none", ec=C_A, lw=1.3, ls="--", zorder=6)
    _caja(ax, xpl - 150, 175, ch["largo"], ch["ancho"], th=math.radians(90), fc="none", ec=C_A, lw=1.3, ls=":", zorder=6)
    # sensores
    sens = [(-60, "PE-M"), (790, "PE-J"), (xc, "PE-L"), (gx0 - 10, "PE-T")]
    for x, nom in sens:
        ax.plot([x, x], [-25, 560], color="#e67e22", lw=1.1, ls="-.", zorder=7)
        ax.text(x, 565, nom, ha="center", va="bottom", fontsize=8.5, color="#e67e22", fontweight="bold")
    ax.plot([xc], [420], marker="o", ms=8, mfc="#e67e22", mec="k", zorder=8)
    ax.text(xc + 18, 440, "PE-W", fontsize=8.5, color="#e67e22", fontweight="bold", va="bottom")
    ax.plot([sx0, sx1], [G["y_libre"] + 20, G["y_libre"] + 20], color="#e67e22", lw=1.1, ls="-.")
    ax.text(sx0 - 12, G["y_libre"] + 20, "PE-S", fontsize=8.5, color="#e67e22", fontweight="bold", va="center", ha="right")
    # cotas
    yb = -300
    _cota(ax, 0, 800, yb, "justificado 800 (≤ 1.000)")
    _cota(ax, 820, 2020, yb, "twin belt 1.200")
    _cota(ax, gx0, gx1, yb, "girador 598")
    _cota(ax, 0, gx1, yb - 90, f"desde el inicio del justificado hasta el fin del girador: {gx1:,.0f}".replace(",", "."))
    # leyenda de manos
    ax.add_patch(Rectangle((-380, 900), 40, 60, fc="white", ec=C_A, hatch="////"))
    ax.text(-330, 930, "mano A: rodillos «/» vistos desde arriba", fontsize=8.5, va="center", color=C_A)
    ax.add_patch(Rectangle((-380, 820), 40, 60, fc="white", ec=C_B, hatch="\\\\\\\\"))
    ax.text(-330, 850, "mano B: rodillos «\\»", fontsize=8.5, va="center", color=C_B)
    ax.text(-380, 1060, "Flujo →   ·   arriba del dibujo = lado izquierdo   ·   abajo = lado derecho (NoLabel)", fontsize=9.5, color="#333")
    ax.set_title("YOLO NoLabel (x2) · planta de la unidad con twin belt 80 + 150 + 80 · cotas en mm", fontsize=12, loc="left")
    ax.set_xlim(-420, 2900); ax.set_ylim(-420, 1120)
    ax.set_aspect("equal"); ax.axis("off")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "planta_unidad_twinbelt.png"), facecolor="white")
    plt.close(fig)


def fig_verificacion(P, R, out):
    m, tb, q, cam = R["m"], P["twin_belt"], P["qr"], R["cam"]
    ch, gr = P["cajas"]["chica"], P["cajas"]["grande"]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 7.6), dpi=115, gridspec_kw={"width_ratios": [1.0, 1.25]})
    # ---- planta
    xc = 0.0
    for y0, y1 in (m["banda_der"], m["banda_izq"]):
        a1.add_patch(Rectangle((-230, y0), 460, y1 - y0, fc="#5b6570", ec="#39424b", alpha=0.85, zorder=1))
    a1.add_patch(Rectangle((-230, m["luz"][0]), 460, tb["luz"], fc="#dff3e6", ec="none", zorder=0))
    a1.plot([-230, 230], [0, 0], color="#1f2d3a", lw=3)
    _caja(a1, xc, ch["ancho"] / 2, ch["largo"], ch["ancho"], fc="none", ec=C_A, lw=2, zorder=3)
    _caja(a1, xc, gr["ancho"] / 2, gr["largo"], gr["ancho"], fc="none", ec=C_B, lw=2, zorder=3)
    for k, col in (("chica", C_A), ("grande", C_B)):
        yc = R["m"][k]["centro"] + P["tol"]["holgura_guia_max"] / 2
        a1.add_patch(Rectangle((xc - q / 2, yc - q / 2), q, q, fc=col, ec="k", lw=0.6, zorder=5))
        lo, hi = R["m"][k]["peor"]
        a1.add_patch(Rectangle((xc - q / 2 - P["tol"]["qr_ubicacion"], lo), q + 2 * P["tol"]["qr_ubicacion"], hi - lo,
                               fc="none", ec=col, ls=":", lw=1.4, zorder=5))
    a1.add_patch(Rectangle((xc - cam["campo_X"] / 2, tb["centro_luz"] - cam["campo_Y"] / 2), cam["campo_X"], cam["campo_Y"],
                           fc="none", ec=C_OK, ls="--", lw=1.6, zorder=4))
    a1.text(-225, 520, "caja 500 × 300", color=C_B, fontsize=10, fontweight="bold")
    a1.text(-225, 305, "caja 300 × 250", color=C_A, fontsize=10, fontweight="bold")
    a1.text(95, m["luz"][0] + 6, "campo SR-X300W\n267 × 166 a 300 mm", color=C_OK, fontsize=8.5)
    a1.text(-225, -12, "guía (cara impresa)", fontsize=8.5, va="top")
    a1.text(160, (m["banda_der"][0] + m["banda_der"][1]) / 2, "banda 80", color="white", fontsize=8.5, va="center", ha="center", zorder=6)
    a1.text(160, (m["banda_izq"][0] + m["banda_izq"][1]) / 2, "banda 80", color="white", fontsize=8.5, va="center", ha="center", zorder=6)
    mc, mg = R["m"]["chica"], R["m"]["grande"]
    a1.annotate("", xy=(-60, m["luz"][0]), xytext=(-60, mc["nom"][0]), arrowprops=dict(arrowstyle="<->", color=C_A))
    a1.text(-66, (m["luz"][0] + mc["nom"][0]) / 2, f"{mc['margen_der']['nom']:.1f}", ha="right", va="center", fontsize=8.5, color=C_A)
    a1.annotate("", xy=(-60, m["luz"][1]), xytext=(-60, mg["nom"][1]), arrowprops=dict(arrowstyle="<->", color=C_B))
    a1.text(-66, (m["luz"][1] + mg["nom"][1]) / 2, f"{mg['margen_izq']['nom']:.1f}", ha="right", va="center", fontsize=8.5, color=C_B)
    a1.set_xlim(-235, 235); a1.set_ylim(-45, 560); a1.set_aspect("equal")
    a1.set_xlabel("X (avance) mm"); a1.set_ylabel("Y desde la guía derecha, mm")
    a1.set_title("Planta en la cámara: las dos cajas superpuestas, justificadas a la derecha", fontsize=10.5, loc="left")
    a1.grid(alpha=0.25)
    # ---- corte
    for (y0, y1), lado in ((m["banda_der"], -1), (m["banda_izq"], 1)):
        a2.add_patch(Rectangle((y0, -5), y1 - y0, 5, fc="#39424b", ec="none", zorder=3))
        # larguero de cada banda: a ras de la luz por dentro, crece solo hacia afuera
        a2.add_patch(Rectangle((y0 - 12 if lado < 0 else y0, -75), y1 - y0 + 12, 68, fc="#b8c2cc", ec="#7f8c99", zorder=2))
    a2.text(m["luz"][0] + 4, -60, "larguero a ras\nde la luz", fontsize=7.5, color="#555")
    a2.add_patch(Rectangle((m["luz"][0], -5), tb["luz"], 5, fc="#dff3e6", ec="none", zorder=1))
    yc_cam = tb["centro_luz"]
    d = P["camara"]["dist"]
    a2.add_patch(Polygon([(yc_cam, -d), (yc_cam - cam["campo_Y"] / 2, 0), (yc_cam + cam["campo_Y"] / 2, 0)],
                         closed=True, fc=C_OK, alpha=0.10, ec=C_OK, ls="--", zorder=1))
    a2.add_patch(Rectangle((yc_cam - 18.5, -d - 62), 37, 62, fc=C_OK, ec="k", zorder=4))
    a2.text(yc_cam + 30, -d - 30, "SR-X300W (37 × 62)\nventana a 300 mm\n(ficha: 50–1.000 mm)", fontsize=8.5, color=C_OK, va="center")
    a2.add_patch(Rectangle((0, 0), ch["ancho"], 220, fc=C_A, alpha=0.08, ec=C_A, lw=1.8, zorder=2))
    a2.add_patch(Rectangle((0, 0), gr["ancho"], 280, fc="none", ec=C_B, lw=1.8, ls="-", zorder=2))
    for k, col in (("chica", C_A), ("grande", C_B)):
        yc = R["m"][k]["centro"] + P["tol"]["holgura_guia_max"] / 2
        a2.plot([yc - q / 2, yc + q / 2], [2, 2], color=col, lw=5, zorder=6, solid_capstyle="butt")
    a2.add_patch(Rectangle((-14, 15), 12, 40, fc="#f5f5f5", ec="#1f2d3a", zorder=3))
    a2.text(-20, 35, "guía", ha="right", va="center", fontsize=8.5)
    a2.text(ch["ancho"] / 2, 232, "caja 300 (alto ilustrativo)", ha="center", color=C_A, fontsize=8.5)
    a2.text(gr["ancho"] - 5, 290, "caja 500", ha="right", color=C_B, fontsize=8.5)
    ap = R["m"]["apoyo_chica_izq"]
    a2.annotate("", xy=(m["banda_izq"][0], 60), xytext=(ch["ancho"], 60), arrowprops=dict(arrowstyle="<->", color=C_A))
    a2.text(ch["ancho"] + 6, 72, f"apoyo de la chica en la banda izquierda: {ap['nom']:.1f} ({ap['min']:.1f}–{ap['max']:.1f})",
            fontsize=8.5, color=C_A)
    for x0, x1, yy, txt in ((0, m["banda_der"][0], -95, f"{m['banda_der'][0]:.1f}"), (m["banda_der"][0], m["banda_der"][1], -95, "80"),
                            (m["luz"][0], m["luz"][1], -95, "luz 150"), (m["banda_izq"][0], m["banda_izq"][1], -95, "80")):
        a2.annotate("", xy=(x0, yy), xytext=(x1, yy), arrowprops=dict(arrowstyle="<->", color="#333", lw=0.9))
        a2.text((x0 + x1) / 2, yy - 6, txt, ha="center", va="top", fontsize=8.5)
    a2.set_xlim(-70, 560); a2.set_ylim(-d - 90, 330); a2.set_aspect("equal")
    a2.set_xlabel("Y desde la guía derecha, mm"); a2.set_ylabel("Z, mm (0 = cara de apoyo de la caja)")
    a2.set_title("Corte en la cámara: la luz de 150 ve los dos QR de 25", fontsize=10.5, loc="left")
    a2.grid(alpha=0.25)
    fig.suptitle("Verificación a escala · QR de 25 mm al centro de la base · luz centrada a 202,5 mm de la guía", fontsize=12, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "verificacion_qr.png"), facecolor="white")
    plt.close(fig)


def fig_girador(P, R, out):
    G = P["G"]
    ch, gr = P["cajas"]["chica"], P["cajas"]["grande"]
    xs = G["ejes_x0"] + G["paso"] * (G["n_ejes"] - 1) / 2
    xpl = G["placa_x"]
    sg = R["sim_giro"]
    hist = np.array(sg["hist"])
    u, vt, va = G["u_giro"], G["v_trans"], G["v_apriete"]
    fig, axs = plt.subplots(2, 3, figsize=(15, 10.4), dpi=105)
    pasos = [
        ("grande", "1. Recibe a 30, acelera a 60 y llega a la placa a 15", [(xpl - 150, gr["ancho"] / 2, 0, 0.25)], (1, 0),
         {"TA": "+30→60→15", "TB": "+30→60→15", "DA": "+30→60→15", "DB": "+30→60→15"}),
        ("grande", "2. Transfiere a 90° pegada a la placa, sin girar", [(xpl - 150, gr["ancho"] / 2 + 60, 0, 0.25)], (0, 1),
         {"TA": f"+{vt + va}", "TB": f"−{vt - va}", "DA": f"+{vt + va}", "DB": f"−{vt - va}"}),
        ("grande", "3. Sale con 300 atravesados; G libre al pasar PE-S", [(xpl - 150, 800, 0, 0.25)], (0, 1),
         {"TA": "0", "TB": "0", "DA": "0", "DB": "0"}),
        ("chica", "1. Recibe, acelera y frena al centro del módulo", [(xs, ch["ancho"] / 2, 0, 0.25)], (1, 0),
         {"TA": "+30→60→0", "TB": "+30→60→0", "DA": "+30→60→0", "DB": "+30→60→0"}),
        ("chica", f"2. Gira {G['t_giro']} s a {u} m/min por zona: suelta a ≈{sg['th_al_soltar_deg']:.0f}°", None, None,
         {"TA": f"−{u}", "TB": f"+{u}", "DA": f"+{u}", "DB": f"−{u}"}),
        ("chica", "3. Avanza a 30 contra la placa: queda a 90° y sale como la grande", None, (0, 1),
         {"TA": "+30 → +63", "TB": "+30 → −57", "DA": "+30 → +63", "DB": "+30 → −57"}),
    ]
    for n, (ax, (tipo, tit, cajas, vel, grupos)) in enumerate(zip(axs.ravel(), pasos)):
        ax.add_patch(Rectangle((0, 5), 598, 410, fc="#fbf7f1", ec="#c8a97e", zorder=0))
        _ruedas_std(ax, 0, G)
        ax.plot([xs, xs], [0, 420], color="#8e44ad", ls=":", lw=1.2)
        ax.add_patch(Rectangle((xpl - 150 - 305, G["salida_y0"]), 610, 640, fc="#eef2f5", ec="#9aa7b3", zorder=0))
        ax.plot([xpl, xpl], [-120, 1060], color="#1f2d3a", lw=4, zorder=6)
        ax.plot([xpl - 315, xpl - 315], [G["y_libre"] + 20, 1060], color="#1f2d3a", lw=2, zorder=6)
        ax.add_patch(Rectangle((-260, 47.5), 220, 80, fc="#5b6570", ec="none"))
        ax.add_patch(Rectangle((-260, 277.5), 220, 80, fc="#5b6570", ec="none"))
        ax.text(-150, 20, "twin belt", ha="center", fontsize=8, color="#555")
        c = P["cajas"][tipo]
        col = C_B if tipo == "grande" else C_A
        if cajas:
            for bx, by, bth, al in cajas:
                _caja(ax, bx, by, c["largo"], c["ancho"], th=math.radians(bth), fc=col, alpha=al, ec=col, lw=2, zorder=5)
            bx, by = cajas[-1][0], cajas[-1][1]
        if n == 4:      # giro simulado: contornos cada ~0,1 s hasta soltar
            tg = G["t_giro"]
            sel = hist[hist[:, 0] <= tg + 1e-6]
            for k, row in enumerate(sel[:: max(1, len(sel) // 6)]):
                _caja(ax, row[1] * 1000, row[2] * 1000, c["largo"], c["ancho"], th=row[3], fc="none", ec=col,
                      lw=1.0 + 0.2 * k, ls="--", alpha=0.5 + 0.08 * k, zorder=5)
            last = sel[-1]
            _caja(ax, last[1] * 1000, last[2] * 1000, c["largo"], c["ancho"], th=last[3], fc=col, alpha=0.25, ec=col, lw=2, zorder=5)
            ax.add_patch(FancyArrowPatch((xs + 110, 60), (xs - 20, 330), connectionstyle="arc3,rad=0.45",
                                         arrowstyle="-|>", mutation_scale=16, color="k", lw=1.8, zorder=7))
            ax.text(20, 520, "contornos: simulación física\n(roce 0,5 en el eje del rodillo)", fontsize=8, color="#555")
        if n == 5:
            sel = hist[hist[:, 0] > G["t_giro"]]
            for row in sel[:: max(1, len(sel) // 4)]:
                _caja(ax, row[1] * 1000, row[2] * 1000, c["largo"], c["ancho"], th=row[3], fc="none", ec=col,
                      lw=1, ls="--", alpha=0.6, zorder=5)
            cf = sg["centro_fin_mm"]
            _caja(ax, cf[0], cf[1], c["largo"], c["ancho"], th=math.radians(90), fc=col, alpha=0.25, ec=col, lw=2, zorder=5)
            bx, by = cf
            ax.text(20, 520, f"a 90° en {sg['t_escuadrada_s']:.2f} s desde que parte el giro\ncentro final y = {cf[1]:.0f} (sobre las ruedas)",
                    fontsize=8, color="#555")
        if vel:
            _flecha(ax, bx, by, bx + vel[0] * 170, by + vel[1] * 170, lw=2.2, ms=18, z=7)
        pos = {"TA": (-200, -110, C_A), "TB": (-200, -175, C_B), "DA": (300, -110, C_A), "DB": (300, -175, C_B)}
        for g, (gx, gy, gc) in pos.items():
            val = grupos[g]
            fin_v = val.split("→")[-1].strip()
            sgn = 0 if fin_v == "0" else (-1 if fin_v.startswith("−") else 1)
            if sgn:
                _flecha(ax, gx - 35 * sgn, gy, gx + 35 * sgn, gy, col=gc, lw=2, ms=13)
            ax.text(gx + 48, gy, f"{g} {val}", va="center", fontsize=8.3, color=gc)
        ax.text(xpl + 10, 1000, "placa", fontsize=8, color="#1f2d3a")
        ax.set_title(("GRANDE 500 × 300\n" if tipo == "grande" else "CHICA 300 × 250\n") + tit, fontsize=9.3, loc="left")
        ax.set_xlim(-270, 760); ax.set_ylim(-205, 1060); ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("Girador (1 módulo B4, 4 grupos, placa de tope) · flechas de color = sentido de la parte alta de la rueda, m/min (+ = aguas abajo) · salida a la izquierda",
                 fontsize=10.5, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "girador_secuencia.png"), facecolor="white")
    plt.close(fig)


# ----------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--sin-dibujo", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    os.makedirs(PROY, exist_ok=True)
    R = {"m": margenes(P), "cam": camara(P), "J": justificador(P)}
    R["sim_giro"] = sim_girador(P)
    R["sim_giro_libre_12"] = {k: v for k, v in sim_girador(P, u_mmin=12, libre=True).items() if k != "hist"}
    R["sim_giro_ventana"] = [{k: v for k, v in sim_girador(P, u_mmin=u, t_giro=tg).items() if k != "hist"}
                             for u, tg in ((20, 0.45), (20, 0.60), (20, 0.75), (24, 0.60))]
    R["sim_just"] = [sim_justificado(P, "chica", 200.0), sim_justificado(P, "chica", 250.0),
                     sim_justificado(P, "grande", 10.0)]
    R["t"] = tiempos(P, R["sim_giro"])
    with open(os.path.join(PROY, "parametros_twinbelt.json"), "w", encoding="utf-8") as f:
        json.dump(P, f, ensure_ascii=False, indent=1)
    with open(os.path.join(PROY, "resultados_twinbelt.json"), "w", encoding="utf-8") as f:
        json.dump(R, f, ensure_ascii=False, indent=1, default=float)
    print(json.dumps(R, ensure_ascii=False, indent=1, default=lambda o: round(float(o), 3)))
    if not a.sin_dibujo:
        fig_planta(P, R, a.out)
        fig_verificacion(P, R, a.out)
        fig_girador(P, R, a.out)


if __name__ == "__main__":
    main()
