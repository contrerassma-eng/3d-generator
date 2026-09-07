# Cama v7: un PAR de ruedas (4 placas, izq A/B + der A/B), cara exterior abajo.
import os, numpy as np, trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)
BED = 256.0

def Rx180():
    T = np.eye(4); T[:3, :3] = np.diag([1.0, -1.0, -1.0]); return T

PIEZAS = [
    ('m64v7_placa_A_izq.stl', 'A_izq', False, (60.0, 195.0)),
    ('m64v7_placa_B_izq.stl', 'B_izq', True,  (140.0, 195.0)),
    ('m64v7_placa_A_der.stl', 'A_der', False, (60.0, 115.0)),
    ('m64v7_placa_B_der.stl', 'B_der', True,  (140.0, 115.0)),
]
piezas, tot = [], 0.0
for f, nm, flip, (cx, cy) in PIEZAS:
    m = trimesh.load(p(f)); m.merge_vertices()
    if flip: m.apply_transform(Rx180())
    b = m.bounds
    m.apply_translation([cx - (b[0][0]+b[1][0])/2, cy - (b[0][1]+b[1][1])/2, -b[0][2]])
    m.export(p(f'bed7_{nm}.stl'))
    piezas.append((nm, m)); tot += m.volume/1000
    b = m.bounds
    print(f'{nm}: {b[1][0]-b[0][0]:.1f} x {b[1][1]-b[0][1]:.1f} x {b[1][2]:.1f}  '
          f'vol {m.volume/1000:.2f} cm3')
print(f'TOTAL {tot:.1f} cm3 -> {tot*1.04:.0f} g PA-CF (100%)')
trimesh.util.concatenate([m for _, m in piezas]).export(p('M64V7_cama.3mf'))

fig, ax = plt.subplots(figsize=(8.5, 8.5), dpi=110)
ax.add_patch(plt.Rectangle((0, 0), BED, BED, fc='#2b2b30', ec='#888'))
cols = plt.cm.tab10(np.linspace(0, 1, 10))
from scipy.spatial import ConvexHull
for i, (nm, m) in enumerate(piezas):
    pts = m.vertices[:, :2]; h = ConvexHull(pts); poly = pts[h.vertices]
    ax.fill(poly[:, 0], poly[:, 1], color=cols[i], alpha=0.85, ec='white', lw=0.8)
    c = poly.mean(0); ax.text(c[0], c[1], nm, ha='center', va='center',
                              fontsize=10, color='white', weight='bold')
ax.set_xlim(-6, BED+6); ax.set_ylim(-6, BED+6); ax.set_aspect('equal')
ax.set_title(f'Mecanum64 v7 — un PAR de ruedas por cama (4 placas)\n'
             f'{tot:.1f} cm³ ≈ {tot*1.04:.0f} g PA-CF a 100 %', fontsize=11)
fig.tight_layout(); fig.savefig(p('M64V7_cama.png'), facecolor='white')
print('cama ok')
