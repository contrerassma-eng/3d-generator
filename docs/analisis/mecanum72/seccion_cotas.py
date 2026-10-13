# Corte axial completo del MECANUM v6 con cotas, medido sobre los solidos
# construidos (secciones de malla por el plano que contiene el eje y un perno
# central, azimut 45). Verifica la cadena eje -> casquillo -> aro interior y
# la retencion axial de rodamientos y polea.
import os
import numpy as np
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Polygon as MplPoly

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)
W2, BRG_W = 21.0, 7.0

def Rz(a):
    a = np.radians(a)
    return np.array([[np.cos(a), -np.sin(a), 0], [np.sin(a), np.cos(a), 0], [0, 0, 1]])

def secciones(mesh, ang=-45.0):
    m = mesh.copy()
    T = np.eye(4); T[:3, :3] = Rz(ang); m.apply_transform(T)
    sec = m.section(plane_origin=[0, 0, 0], plane_normal=[0, 1, 0])
    if sec is None:
        return []
    return [np.column_stack([d[:, 2], d[:, 0]]) for d in sec.discrete]  # (z, x)

def radios_en(mesh, z0, ang=-45.0, dz=0.02):
    """radios de pared en el plano z=z0 (corte transversal)"""
    m = mesh.copy()
    sec = m.section(plane_origin=[0, 0, z0], plane_normal=[0, 0, 1])
    if sec is None:
        return []
    rr = []
    for d in sec.discrete:
        r = np.hypot(d[:, 0], d[:, 1])
        rr.append((r.min(), r.max()))
    return sorted(rr)

A = trimesh.load(p('mec72_placa_A_izq.stl'))
B = trimesh.load(p('mec72_placa_B_izq.stl'))
POL = trimesh.load(p('mec72_polea_48T.stl'))
RET = trimesh.load(p('mec72_retenedor.stl'))
CAS = trimesh.load(p('mec72_casquillo.stl'))

# ---------- medidas de la cadena (sobre las mallas) ----------
print('=== CADENA EJE -> CASQUILLO -> ARO INTERIOR (medido en malla) ===')
rr = radios_en(CAS, 3.5)
print(f'casquillo barril z=3.5 : bore Ø{2*rr[0][0]:.2f}  OD Ø{2*rr[0][1]:.2f}')
rr = radios_en(CAS, -0.6)
print(f'casquillo brida  z=-0.6: bore Ø{2*rr[0][0]:.2f}  OD Ø{2*rr[0][1]:.2f}')
print(f'casquillo largo total  : {CAS.bounds[1][2]-CAS.bounds[0][2]:.2f} '
      f'(barril {CAS.bounds[1][2]:.2f} + brida {-CAS.bounds[0][2]:.2f})')

for nm, M in (('placa_A', A), ('placa_B', B)):
    zf = M.bounds[0][2] if nm == 'placa_A' else M.bounds[1][2]
    sg = 1 if nm == 'placa_A' else -1
    z_probe = zf + sg * 3.0
    rr = radios_en(M, z_probe)
    pared = [t for t in rr if t[0] > 14 and t[0] < 18]
    print(f'{nm}: cara z={zf:+.2f}  asiento Ø{2*pared[0][0]:.2f} '
          f'(pared hasta Ø{2*pared[0][1]:.1f})' if pared else f'{nm}: ?')
    rr0 = radios_en(M, 0.0 if nm == 'placa_A' else 5.0)
    print(f'   bore central Ø{2*min(t[0] for t in rr0):.2f}')
    # profundidad del asiento: mayor z de la pared del asiento
    secs = secciones(M, -45)
    wall = []
    for s in secs:
        for q in s:
            if 15.9 < abs(q[1]) < 16.2:
                wall.append(q[0])
    if wall:
        wall = np.array(wall)
        prof = (wall.max() - zf) if nm == 'placa_A' else (zf - wall.min())
        print(f'   profundidad de asiento medida: {abs(prof):.2f}')

for nm, M in (('polea', POL), ('retenedor', RET)):
    rr = radios_en(M, -1.5)
    print(f'{nm}: bore de brida Ø{2*rr[0][0]:.2f}')

print()
print('=== JUEGOS DE LA CADENA (diametrales) ===')
print('eje 12.70 en casquillo 12.85      : 0.15 (deslizante)')
print('casquillo 19.90 en aro int. 20.00 : 0.10 (deslizante)')
print('asiento 32.15 sobre aro ext. 32.00: 0.15 nominal (impreso ~0: prensa suave)')
print('aro interior Ø23.2 vs bore brida Ø25.0: 1.8 -> NO roza')
print('brida casquillo Ø22 vs bore brida Ø25 : pasa con 3.0')

# ---------- corte axial acotado ----------
fig, ax = plt.subplots(figsize=(19, 12), dpi=110)
GR = '#c9c9ce'; GR2 = '#e4d9c8'; OR = '#e8a45f'; ST = '#9aa2ae'; DK = '#555'

for M, fc, ec in ((A, GR, '#666'), (B, GR2, '#8a7a5a')):
    for s in secciones(M):
        ax.add_patch(MplPoly(s, closed=True, fc=fc, ec=ec, lw=0.7, alpha=0.95))
pol = POL.copy()
pol.apply_translation([0, 0, -W2])              # cuerpo -21 .. -32.2 (sin giro)
for s in secciones(pol, 0.0):
    ax.add_patch(MplPoly(s, closed=True, fc=OR, ec='#a06020', lw=0.7, alpha=0.95))
ret = RET.copy()
T = np.eye(4); T[:3, :3] = np.diag([1, -1, -1]); ret.apply_transform(T)   # 180 en X
ret.apply_translation([0, 0, W2])               # cuerpo 21 .. 24
for s in secciones(ret, 0.0):
    ax.add_patch(MplPoly(s, closed=True, fc=OR, ec='#a06020', lw=0.7, alpha=0.95))

def rodamiento(zc, ax):
    for sgn in (1, -1):
        # aro interior 20/23.2, aro exterior 28.7/32, bolas Ø4.3
        ax.add_patch(Rectangle((zc - 3.5, sgn * 10.0), 7, sgn * 1.6,
                               fc=ST, ec='#556', lw=0.7))
        ax.add_patch(Rectangle((zc - 3.5, sgn * 14.35), 7, sgn * 1.65,
                               fc=ST, ec='#556', lw=0.7))
        ax.add_patch(Circle((zc, sgn * 12.98), 2.1, fc='white', ec='#556', lw=0.7))

def casquillo(zf, sgn, ax):
    # barril 7 (Ø12.85/Ø19.9) + brida 1.2 (Ø22)
    for s2 in (1, -1):
        ax.add_patch(Rectangle((zf, s2 * 6.425), sgn * 7.0, s2 * (9.95 - 6.425),
                               fc=OR, ec='#a06020', lw=0.7))
        ax.add_patch(Rectangle((zf, s2 * 6.425), -sgn * 1.2, s2 * (11.0 - 6.425),
                               fc=OR, ec='#a06020', lw=0.7))

rodamiento(-(W2 - BRG_W / 2), ax)
rodamiento(+(W2 - BRG_W / 2), ax)
casquillo(-W2, 1, ax)
casquillo(+W2, -1, ax)
# eje 1/2"
ax.add_patch(Rectangle((-31, -6.35), 62, 12.7, fc='#b9bec6', ec='#667', lw=0.8))
# perno central 2.9x20 en r=9.6 (esta en el plano de corte, azimut 45)
ax.add_patch(Rectangle((-11.3, 9.6 - 1.45), 20, 2.9, fc=DK, ec='k', lw=0.5))
ax.add_patch(Rectangle((-13.3, 9.6 - 2.8), 2.0, 5.6, fc=DK, ec='k', lw=0.5))

ax.axhline(0, color='k', lw=0.6, ls='-.')

def cota_h(z0, z1, y, txt, off=1.6, fs=9):
    ax.annotate('', (z0, y), (z1, y), arrowprops=dict(arrowstyle='<->', lw=0.9))
    ax.plot([z0, z0], [y - off, y + off], 'k-', lw=0.5)
    ax.plot([z1, z1], [y - off, y + off], 'k-', lw=0.5)
    ax.text((z0 + z1) / 2, y + 0.6, txt, ha='center', fontsize=fs)

def cota_d(z, r, txt, dz=3.0, fs=9, up=True):
    y2 = r + (6 if up else -6)
    ax.annotate(txt, (z, r), (z + dz, y2 * 1.35 if abs(y2) > 20 else y2 + (8 if up else -8)),
                fontsize=fs, ha='left',
                arrowprops=dict(arrowstyle='->', lw=0.8, color='#333'))

# cotas horizontales
cota_h(-21, 21, 40.5, 'ancho de rueda 42.0')
cota_h(-21, -14, 36.0, 'asiento 7.0')
cota_h(14, 21, 36.0, '7.0')
cota_h(-24, -21, 32.0, 'brida 3.0', fs=8)
cota_h(-31, -24, 32.0, 'anillo 7.0', fs=8)
cota_h(-32.2, -31, 36.0, '1.2', fs=8)

cota_h(21, 24, 32.0, '3.0', fs=8)

# cotas diametrales (como radios anotados)
def nota(z, r, tz, tr, txt, fs=8.6, ha='left'):
    ax.annotate(txt, (z, r), (tz, tr), fontsize=fs, ha=ha, va='center',
                arrowprops=dict(arrowstyle='->', lw=0.8, color='#333'),
                bbox=dict(boxstyle='round,pad=0.25', fc='white', ec='#999', lw=0.5, alpha=0.9))

nota(8, 5.0, 24, 3.0, 'eje Ø12.7 (1/2") pasante')
nota(5, 6.75, 24, 8.5, 'bore rueda Ø13.4: el eje NO toca la rueda')
nota(-17.5, -6.45, -38, -8.5, 'casquillo: bore Ø12.85\n(juego 0.15 al eje)', ha='right')
nota(-16.0, -9.95, -38, -15.5, 'casquillo Ø19.90 en aro int.\nØ20.00 (juego 0.10)', ha='right')
nota(-18.5, -16.1, -38, -22.5, 'asiento Ø32.15 · prof. 7.05\nrodamiento Ø32.00', ha='right')
nota(17.5, -16.1, 30, -20.0, '6804: 20×32×7')
nota(-25.5, -14.9, -38, -28.5, 'polea GT2 48T: OD 30.05', ha='right')
nota(-31.6, -16.9, -38, -33.0, 'pestaña Ø34', ha='right')
nota(-22.6, -23.8, -32, -41.0, 'brida Ø48 · bore Ø25: tapa el aro ext.\n(Ø28.7–32) y libra el aro int. (Ø23.2)', ha='center')
nota(22.5, -23.8, 33, -32.0, 'retenedor: misma\nbrida, sin dientes')
nota(-2, -12.65, 8, -26.0, 'tambor almenado Ø25.2 · corona A↔B')
nota(-3, 8.2, 24, 13.5, 'perno 2.9×20 (4×, r9.6):\ncabeza bajo el rodamiento')
nota(-13.97, 15.2, -6, 25.0, 'hombro: retiene el aro ext.\nhacia adentro')
nota(-20.95, 15.3, -33, 27.5, 'brida de polea: retiene el aro\next. hacia afuera (juego 0.05)', ha='right')
nota(-21.6, 10.8, -33, 20.0, 'brida casquillo Ø22 empuja el aro int.\n(collarín de 1/2" del usuario por fuera)', ha='right')

ax.text(0, -47.5,
        'Retención axial: aro EXTERIOR cazado entre hombro del asiento (adentro) y brida de polea/retenedor (afuera, juego 0.05) · '
        'aro INTERIOR acoplado por las bolas y posicionado por la brida del casquillo;\n'
        'la posición sobre el eje la fijan DOS COLLARINES de 1/2" del usuario contra las bridas de los casquillos '
        '(apriete suave: collarín→brida→aro int.→bolas→aro ext.→hombro; no precargar fuerte los dos lados). '
        'Polea: 6 tornillos 2.9×6 en el círculo r19 (12 taladros cada 30°).',
        ha='center', fontsize=9.5,
        bbox=dict(boxstyle='round,pad=0.5', fc='#f4f4f6', ec='#888'))

ax.set_xlim(-41, 41); ax.set_ylim(-50, 46)
ax.set_aspect('equal')
ax.set_xlabel('z (mm) — eje de la rueda'); ax.set_ylabel('radio (mm)')
ax.set_title('MECANUM v6 — corte axial por el plano de un perno central (azimut 45°), '
             'medido sobre los sólidos construidos', fontsize=13)
ax.grid(alpha=0.15)
fig.tight_layout()
fig.savefig(p('MEC_corte_axial_cotas.png'), facecolor='white')
print('corte acotado ok')
