import os, re, subprocess
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import matplotlib.gridspec as gridspec

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

fig = plt.figure(figsize=(20, 11.5), dpi=100)
gs = gridspec.GridSpec(2, 3, width_ratios=[1.3, 1.0, 1.0], figure=fig)

ax = fig.add_subplot(gs[0, 0])
ax.imshow(mpimg.imread(p('m64v7_hero.png'))); ax.axis('off')
ax.set_title('Mecanum64 v7 — par IZQ / DER (β=46°)', fontsize=14, pad=6)

ax = fig.add_subplot(gs[0, 1])
ax.imshow(mpimg.imread(p('m64v7_cara.png'))); ax.axis('off')
ax.set_title('Cara: estrella estructural + hex 14.5 PASANTE', fontsize=12, pad=6)
ax.text(0.5, -0.04, 'Flancos rectos tangentes (líneas verdes de tu anotación) ·\n'
        'filetes leves: r3 cóncavos, r1.5 puntas · 3 cabezas frente a caras del hex',
        transform=ax.transAxes, fontsize=9, ha='center', va='top', color='#333')

ax = fig.add_subplot(gs[0, 2])
ax.imshow(mpimg.imread(p('m64v7_corte.png'))); ax.axis('off')
ax.set_title('Corte por un perno (azimut 30°)', fontsize=12, pad=6)
ax.text(0.5, -0.04, 'Hex pasante al centro · tambor Ø26 almenado alrededor ·\n'
        'perno 2.9×25 entre la cara plana del hex (2.1) y los rodillos',
        transform=ax.transAxes, fontsize=9, ha='center', va='top', color='#333')

ax = fig.add_subplot(gs[1, 0])
ax.imshow(mpimg.imread(p('M64V7_cama.png'))); ax.axis('off')

ax = fig.add_subplot(gs[1, 1]); ax.axis('off')
tabla = (
    "GEOMETRÍA v7\n"
    "─────────────────────────────\n"
    "Rueda    Ø64 × 34.6 (como v5)\n"
    "Rodillo  33.5 · Ø18 · Ø13 ·\n"
    "  perf. 3.5 · eje Ø3.2 · β=46°\n"
    "Centro   HEX 14.5 e/c PASANTE\n"
    "  (vértices Ø16.74; sin más\n"
    "  taladros en el centro)\n"
    "Acople   corona almenada Ø26\n"
    "  alrededor del hex + 3 pernos\n"
    "  2.9×25 en r10.9, frente a\n"
    "  las caras PLANAS del hex\n"
    "Estrella flancos rectos + filetes\n"
    "  leves r3 / r1.5\n"
    "─────────────────────────────\n"
    "VERIFICADO (malla)\n"
    "rodillo-rodillo   0.728\n"
    "rodillo-placa     0.70\n"
    "corona A↔B        0.013\n"
    "envolvente     Ø63.8–64.0\n"
    "hex: caras 7.25 · vért. 8.37 ✓\n"
    "pared perno→hex   2.1\n"
    "placas   9.6 / 9.9 cm³"
)
ax.text(0.0, 1.0, tabla, transform=ax.transAxes, fontsize=10.5,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.6', fc='#f4f4f6', ec='#888'))

ax = fig.add_subplot(gs[1, 2]); ax.axis('off')
try:
    cola = subprocess.run(['tail', '-c', '400000', p('M64V7_cama_PACF_100.gcode')],
                          capture_output=True).stdout.decode('utf8', 'replace')
    tiempo = re.search(r'estimated printing time \(normal mode\) = (.+)', cola).group(1).strip()
    gramos = re.search(r'total filament used \[g\] = ([\d.]+)', cola).group(1)
except Exception:
    tiempo, gramos = '—', '—'
imp = (
    "MONTAJE\n"
    "─────────────────────────────\n"
    "1. pasador en cada rodillo; los\n"
    "   6 a las cunas ciegas de A\n"
    "2. B baja: cunas capturan los\n"
    "   extremos; corona engrana\n"
    "3. 3 pernos 2.9×25 desde la\n"
    "   cara A -> cosen A y B\n"
    "4. eje HEX de 14 entra pasante\n"
    "   (holgura 0.5 al 14.5)\n"
    "─────────────────────────────\n"
    "IMPRESIÓN — Centauri Carbon 2\n"
    "PA-CF 0.4/0.2 · 100 % relleno\n"
    "soporte árbol · brim 5\n"
    "UN PAR (4 placas) por cama:\n"
    "M64V7_cama_PACF_100.gcode\n"
    f"  {gramos} g · {tiempo}\n"
    "─────────────────────────────\n"
    "Comprar por rueda: 6 varillas\n"
    "1/8\"×43 + 3 tornillos 2.9×25"
)
ax.text(0.0, 1.0, imp, transform=ax.transAxes, fontsize=10.5,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.6', fc='#eef4ee', ec='#7a8'))

fig.suptitle('Mecanum64 v7 — hex 14.5 pasante, acople fuera del hexágono, estrella estructural '
             '(mecanum64v7.py)', fontsize=16, y=0.99)
fig.subplots_adjust(top=0.92, bottom=0.03, left=0.02, right=0.99, hspace=0.30, wspace=0.07)
fig.savefig(p('M64V7_lamina.png'), dpi=100, facecolor='white')
print('lamina ok')
