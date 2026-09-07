# Dispone las piezas de UN ensamble Mecanum72 (sin rodillos ni pasadores) en
# la cama 256x256 del Elegoo Centauri Carbon 2, ya orientadas para imprimir.
# Exporta STL por pieza (en coordenadas de cama), un 3MF combinado y un plano.
import os, json
import numpy as np
import trimesh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)
BED = 256.0

def Rx180():
    T = np.eye(4)
    T[:3, :3] = np.array([[1, 0, 0], [0, -1, 0], [0, 0, -1]], float)
    return T

# (archivo, nombre en cama, girar 180 en X, centro XY, rotacion Z opcional)
# posiciones dentro del area de malla de cama de la CC2 (x 20..221, y 51..240)
PIEZAS = [
    ('mec72_placa_A_izq.stl', 'placa_A',     False, (60.0, 195.0)),
    ('mec72_placa_B_izq.stl', 'placa_B',     True,  (140.0, 195.0)),
    ('mec72_polea_48T.stl',   'polea_48T',   True,  (50.0, 105.0)),
    ('mec72_retenedor.stl',   'retenedor',   True,  (115.0, 105.0)),
    ('mec72_casquillo.stl',   'casquillo_1', True,  (170.0, 92.0)),
    ('mec72_casquillo.stl',   'casquillo_2', True,  (170.0, 142.0)),
    ('mec72_eje_test.stl',    'eje_test',    False, (205.0, 105.0)),
]

def main():
    piezas, info = [], []
    for f, nm, flip, (cx, cy) in PIEZAS:
        m = trimesh.load(p(f))
        m.merge_vertices()
        if flip:
            m.apply_transform(Rx180())
        b = m.bounds
        # centrar en XY y apoyar en z=0
        m.apply_translation([cx - (b[0][0] + b[1][0]) / 2,
                             cy - (b[0][1] + b[1][1]) / 2,
                             -b[0][2]])
        m.export(p(f'bed_{nm}.stl'))
        piezas.append((nm, m))
        b = m.bounds
        info.append(dict(nombre=nm, archivo=f'bed_{nm}.stl',
                         x=[round(float(b[0][0]), 2), round(float(b[1][0]), 2)],
                         y=[round(float(b[0][1]), 2), round(float(b[1][1]), 2)],
                         alto=round(float(b[1][2]), 2),
                         vol_cm3=round(float(m.volume) / 1000, 2)))
        print(f'{nm:12s} {b[1][0]-b[0][0]:6.1f} x {b[1][1]-b[0][1]:6.1f} x '
              f'{b[1][2]:5.1f}   vol {m.volume/1000:6.2f} cm3')

    total = sum(i['vol_cm3'] for i in info)
    print(f'TOTAL {total:.2f} cm3  ->  {total*1.04:.0f} g de PA-CF (100% relleno)')
    json.dump(info, open(p('mec72_cama.json'), 'w'), indent=1)

    escena = trimesh.util.concatenate([m for _, m in piezas])
    escena.export(p('MECANUM72_cama.3mf'))
    escena.export(p('MECANUM72_cama.stl'))

    # plano de cama (vista superior)
    fig, ax = plt.subplots(figsize=(9, 9), dpi=110)
    ax.add_patch(plt.Rectangle((0, 0), BED, BED, fc='#2b2b30', ec='#888'))
    cols = plt.cm.tab10(np.linspace(0, 1, 10))
    for i, (nm, m) in enumerate(piezas):
        pts = m.vertices[:, :2]
        try:
            from scipy.spatial import ConvexHull
            h = ConvexHull(pts)
            poly = pts[h.vertices]
        except Exception:
            poly = pts
        ax.fill(poly[:, 0], poly[:, 1], color=cols[i % 10], alpha=0.85, ec='white', lw=0.8)
        c = poly.mean(0)
        ax.text(c[0], c[1], nm.replace('_', '\n'), ha='center', va='center',
                fontsize=8, color='white', weight='bold')
    ax.set_xlim(-6, BED + 6); ax.set_ylim(-6, BED + 6); ax.set_aspect('equal')
    ax.set_title('Mecanum72 — 1 ensamble en cama 256×256 (Centauri Carbon 2)\n'
                 f'sin rodillos ni pasadores · {total:.1f} cm³ ≈ {total*1.04:.0f} g PA-CF a 100 %',
                 fontsize=11)
    ax.set_xlabel('X (mm)'); ax.set_ylabel('Y (mm)')
    fig.tight_layout(); fig.savefig(p('MECANUM72_cama.png'), facecolor='white')
    print('cama ok')

if __name__ == '__main__':
    main()
