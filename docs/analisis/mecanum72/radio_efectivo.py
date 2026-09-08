# Radio efectivo de rodadura de la rueda mecanum, vuelta completa.
#
# La rueda gira sobre Z. El suelo es un plano que contiene la direccion Z, a
# distancia h del eje. La altura del eje sobre el suelo para un giro theta es
# la FUNCION SOPORTE de la proyeccion de la rueda sobre el plano XY:
#
#     h(theta) = max_P [ -rho_P * sin(alpha_P + theta) ]
#
# (z no interviene: el suelo se extiende a lo largo del eje). El suelo solo
# puede tocar la envolvente CONVEXA de esa proyeccion, asi que basta evaluar
# la funcion soporte en los vertices del casco convexo.
#
# Salidas: radio medio (= avance por vuelta / 2pi), rizado, posicion axial del
# punto de contacto, relevo entre rodillos y comparacion Ø64 vs Ø72.

import numpy as np
from math import cos, sin, radians, sqrt, pi
from scipy.spatial import ConvexHull
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os, json

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

SMAX = 33.5 / 2                      # semilargo del rodillo fisico (medido)
RHO0 = 9.0                           # radio en el centro (Ø18)
RHOE = 6.5                           # radio en el extremo (Ø13)
RARC = SMAX ** 2 / (2 * (RHO0 - RHOE)) + (RHO0 - RHOE) / 2   # 57.36

def rho(s):
    """meridiano del barril fisico: arco de radio RARC"""
    return (RHO0 - RARC) + np.sqrt(RARC * RARC - np.clip(s, -SMAX, SMAX) ** 2)

def rho_ideal(s, R, d0, beta):
    """perfil mecanum EXACTO que daria envolvente cilindrica perfecta"""
    cb = cos(radians(beta))
    return np.sqrt(np.maximum(R * R - (s * cb) ** 2, 0.0)) - d0

def puntos_rodillos(D0, beta, perfil='fisico', R=None, ns=520, na=520, nrod=6):
    cb, sb = cos(radians(beta)), sin(radians(beta))
    s = np.linspace(-SMAX, SMAX, ns)
    a = np.linspace(0, 2 * pi, na, endpoint=False)
    S, A = np.meshgrid(s, a, indexing='ij')
    RH = rho(S) if perfil == 'fisico' else rho_ideal(S, R, D0, beta)
    P0 = np.stack([D0 + RH * np.cos(A),
                   S * cb + RH * np.sin(A) * sb,
                   S * sb - RH * np.sin(A) * cb], -1).reshape(-1, 3)
    out = []
    for k in range(nrod):
        th = radians(360.0 / nrod * k)
        c, sn = cos(th), sin(th)
        Rz = np.array([[c, -sn, 0], [sn, c, 0], [0, 0, 1]])
        q = P0 @ Rz.T
        out.append(np.hstack([q, np.full((len(q), 1), k, float)]))
    return np.vstack(out)

def soporte(P3, nth=1440):
    """h(theta) y punto de contacto, via casco convexo de la proyeccion XY"""
    xy = P3[:, :2]
    hull = ConvexHull(xy)
    idx = hull.vertices
    rho_h = np.hypot(xy[idx, 0], xy[idx, 1])
    al_h = np.arctan2(xy[idx, 1], xy[idx, 0])
    th = np.linspace(0, 2 * pi, nth, endpoint=False)
    # matriz nth x nvert
    M = -rho_h[None, :] * np.sin(al_h[None, :] + th[:, None])
    j = M.argmax(1)
    h = M[np.arange(nth), j]
    cont = P3[idx[j]]                     # punto de contacto en 3D + id rodillo
    return np.degrees(th), h, cont

def analiza(nombre, D0, beta, perfil='fisico', R=None, nrod=6):
    P3 = puntos_rodillos(D0, beta, perfil, R, nrod=nrod)
    th, h, cont = soporte(P3)
    hmin, hmax, hmean = h.min(), h.max(), h.mean()
    # avance por vuelta = perimetro de la curva de rodadura = integral de h
    avance = np.trapezoid(np.r_[h, h[0]], np.r_[np.radians(th), 2 * pi])
    r_eq = avance / (2 * pi)
    rel = (hmax - hmin) / hmean * 100
    print(f'\n=== {nombre} ===')
    print(f'  radio efectivo   min {hmin:7.3f}  max {hmax:7.3f}  medio {hmean:7.3f} mm')
    print(f'  Ø envolvente     {2*hmin:7.2f} .. {2*hmax:7.2f} mm')
    print(f'  rizado           {hmax-hmin:6.3f} mm  ({rel:.3f} % del radio)')
    print(f'  avance/vuelta    {avance:8.2f} mm   -> radio equivalente {r_eq:.3f} mm')
    print(f'  contacto axial z {cont[:,2].min():7.2f} .. {cont[:,2].max():7.2f} mm')
    print(f'  rodillos usados  {sorted(set(cont[:,3].astype(int)))}')
    return dict(nombre=nombre, th=th, h=h, cont=cont, hmin=hmin, hmax=hmax,
                hmean=hmean, rizado=hmax - hmin, rel=rel, avance=avance, r_eq=r_eq)

print('perfil del rodillo fisico: RARC = %.2f  (Ø centro %.1f, Ø extremo %.1f, L %.1f)'
      % (RARC, 2 * rho(0.0), 2 * rho(SMAX), 2 * SMAX))

res = {}
res['v6']    = analiza('MECANUM v6 — d0=23, beta=46 (el construido)', 23.0, 46.0)
res['d0_27'] = analiza('Variante d0=27 (Ø72 nominal, descartada)', 27.0, 46.0)
res['ideal'] = analiza('Ideal: perfil mecanum exacto R=32, d0=23, beta=46',
                       23.0, 46.0, perfil='ideal', R=32.0)

# cuanto se aparta el barril fisico del perfil ideal
s = np.linspace(-SMAX, SMAX, 400)
d = rho(s) - rho_ideal(s, 32.0, 23.0, 46.0)
print(f'\ndesviacion barril fisico vs perfil exacto (R=32,d0=23,b=46): '
      f'{d.min():+.3f} .. {d.max():+.3f} mm  (rms {np.sqrt((d**2).mean()):.3f})')

# ---------------- graficas ----------------
fig, axs = plt.subplots(2, 2, figsize=(15, 9), dpi=110)

ax = axs[0, 0]
for k, c in (('v6', '#1f77b4'), ('d0_27', '#d62728'), ('ideal', '#2ca02c')):
    r = res[k]
    ax.plot(r['th'], r['h'], color=c, lw=1.6,
            label=f"{r['nombre'].split('—')[0].strip()}  rizado {r['rizado']:.3f} mm")
ax.set_xlim(0, 120); ax.grid(alpha=.3)
ax.set_xlabel('giro de la rueda θ (°)'); ax.set_ylabel('radio efectivo h(θ)  (mm)')
ax.set_title('Radio efectivo — el suelo apoya en la envolvente convexa')
ax.legend(fontsize=8, loc='lower right')

ax = axs[0, 1]
for k, c in (('v6', '#1f77b4'), ('d0_27', '#d62728')):
    r = res[k]
    ax.plot(r['th'], r['h'] - r['hmean'], color=c, lw=1.6,
            label=f"{k}: ±{r['rizado']/2:.3f} mm ({r['rel']:.2f} %)")
ax.axhline(0, color='k', lw=.6)
ax.set_xlim(0, 120); ax.grid(alpha=.3)
ax.set_xlabel('giro θ (°)'); ax.set_ylabel('oscilación del eje (mm)')
ax.set_title('Sacudida vertical del eje (rueda ideal = línea recta)')
ax.legend(fontsize=9)

ax = axs[1, 0]
r = res['v6']
sc = ax.scatter(r['th'], r['cont'][:, 2], c=r['cont'][:, 3], cmap='tab10', s=4)
ax.set_xlim(0, 120); ax.grid(alpha=.3)
ax.set_xlabel('giro θ (°)'); ax.set_ylabel('z del punto de contacto (mm)')
ax.set_title('Recorrido axial del contacto y relevo entre rodillos (v6)')

ax = axs[1, 1]
ax.plot(s, rho(s), lw=2, color='#1f77b4', label='barril físico medido (33.5/Ø18/Ø13)')
ax.plot(s, rho_ideal(s, 32.0, 23.0, 46.0), '--', lw=1.6, color='#2ca02c',
        label='perfil mecanum exacto R=32, d0=23, β=46°')
ax.plot(s, rho_ideal(s, 36.0, 27.0, 46.0), ':', lw=1.6, color='#d62728',
        label='perfil exacto para Ø72 (R=36, d0=27)')
ax.grid(alpha=.3); ax.set_xlabel('s a lo largo del eje del rodillo (mm)')
ax.set_ylabel('ρ(s) (mm)'); ax.legend(fontsize=8)
ax.set_title('Por qué el Ø64 es el que corresponde a TUS rodillos')

fig.suptitle('MECANUM v6 — radio efectivo de rodadura en una vuelta', fontsize=15)
fig.tight_layout(rect=[0, 0, 1, 0.965])
fig.savefig(p('MEC_radio_efectivo.png'), facecolor='white')

json.dump({k: dict(hmin=float(v['hmin']), hmax=float(v['hmax']),
                   hmean=float(v['hmean']), rizado=float(v['rizado']),
                   rel=float(v['rel']), avance=float(v['avance']),
                   r_eq=float(v['r_eq'])) for k, v in res.items()},
          open(p('radio_efectivo.json'), 'w'), indent=1)
print('\ngrafica ok')
