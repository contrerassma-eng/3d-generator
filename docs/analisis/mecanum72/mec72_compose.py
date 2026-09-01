import json, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import matplotlib.gridspec as gridspec

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)
BOX = dict(boxstyle='round,pad=0.4', fc='white', ec='#555', alpha=0.93, lw=0.8)

fig = plt.figure(figsize=(21, 16), dpi=100)
gs = gridspec.GridSpec(3, 3, height_ratios=[1.0, 1.0, 0.95],
                       width_ratios=[1.25, 1.0, 0.95], figure=fig)

ax = fig.add_subplot(gs[0, 0])
ax.imshow(mpimg.imread(p('m72_hero.png'))); ax.axis('off')
ax.set_title('Mecanum64 v6 — par IZQ/DER con polea GT2 48T', fontsize=14, pad=6)

ax = fig.add_subplot(gs[0, 1])
ax.imshow(mpimg.imread(p('m72_polea.png'))); ax.axis('off')
ax.set_title('Lado de la polea (correa 6 mm)', fontsize=13, pad=6)
ax.text(0.5, -0.02, 'Brida Ø48 atornillada al cubo con 6 tornillos 2.9×6 ·\n'
        'patrón de 12 taladros cada 30°: la misma polea sirve izq/der y A/B',
        transform=ax.transAxes, fontsize=9.5, ha='center', va='top', color='#333')

ax = fig.add_subplot(gs[0, 2])
ax.imshow(mpimg.imread(p('m72_corte.png'))); ax.axis('off')
ax.set_title('Corte: 6804 en cada cara + eje 1/2"', fontsize=13, pad=6)
ax.text(0.5, -0.02, 'Asiento Ø32.15×7 con hombro · casquillo PA-CF 12.7→20 ·\n'
        'la brida tapa el aro exterior y libra el interior (bore Ø25)',
        transform=ax.transAxes, fontsize=9.5, ha='center', va='top', color='#333')

ax = fig.add_subplot(gs[1, 0:2])
img = mpimg.imread(p('m72_exploded.png')); H, W = img.shape[:2]
ax.imshow(img); ax.axis('off')
anchors = json.load(open(p('m72_anchors.json')))
items = sorted(anchors.items(), key=lambda kv: kv[1][0])
for i, (label, (px, py)) in enumerate(items):
    top = (i % 2 == 0)
    ty = -0.10 * H if top else 1.10 * H
    tx = (i + 0.5) / len(items) * W
    ax.annotate(label, xy=(px, py), xytext=(tx, ty), fontsize=9,
                ha='center', va='center', bbox=BOX,
                arrowprops=dict(arrowstyle='->', color='#333', lw=1.0, shrinkB=4),
                annotation_clip=False)
ax.set_xlim(0, W); ax.set_ylim(H, 0)

ax = fig.add_subplot(gs[1, 2]); ax.axis('off')
tabla = (
    "GEOMETRÍA\n"
    "─────────────────────────────\n"
    "Rueda    Ø64 × 42 de ancho\n"
    "  (se ensanchó 34.6→42 para\n"
    "  alojar los 6804; el Ø64 se\n"
    "  MANTIENE: rizado 0.2 mm)\n"
    "Rodillo  33.5 · Ø18 · Ø13\n"
    "  perf. 3.5 · eje Ø3.2 · β=46°\n"
    "Rodam.   6804 ×2 (20×32×7)\n"
    "  asiento Ø32.15×7, pared 2.7\n"
    "Eje      1/2\" (12.7) redondo,\n"
    "  pasante · bore Ø13.4\n"
    "Polea    GT2 48T, correa 6\n"
    "  PD 30.56 · OD 30.05\n"
    "  anillo 7 · pestaña Ø34\n"
    "─────────────────────────────\n"
    "VERIFICADO (malla)\n"
    "rodillo-rodillo   0.726\n"
    "rodillo-placa     0.70\n"
    "corona A↔B        0.011\n"
    "envolvente     Ø63.8–64.0\n"
    "─────────────────────────────\n"
    "DESCARTADO: Ø72 (D0=27) para\n"
    "meter el 6804 sin ensanchar:\n"
    "los rodillos quedaban a 4.15 y\n"
    "la envolvente ondulaba 2.5 mm"
)
ax.text(0.0, 0.99, tabla, transform=ax.transAxes, fontsize=10,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.6', fc='#f4f4f6', ec='#888'))

ax = fig.add_subplot(gs[2, 0:2])
ax.imshow(mpimg.imread(p('MECANUM72_cama.png'))); ax.axis('off')

ax = fig.add_subplot(gs[2, 2]); ax.axis('off')
try:
    import re
    g = open(p('MECANUM72_cama_PACF_100.gcode'), errors='replace')
    head = ''.join([next(g) for _ in range(400)])
    tiempo = re.search(r'estimated printing time \(normal mode\) = (.+)', head)
    tiempo = tiempo.group(1) if tiempo else '—'
except Exception:
    tiempo = '—'
imp = (
    "IMPRESIÓN — Centauri Carbon 2\n"
    "─────────────────────────────\n"
    "Perfil reconstruido de tu propio\n"
    "gcode: PA-CF 280 °C / cama 100,\n"
    "boquilla 0.4, capa 0.2, 2 paredes\n"
    "RELLENO 100 % (rectilíneo)\n"
    "Soporte ÁRBOL auto (umbral 30°,\n"
    "  gap 0.2) · BRIM 5 mm\n"
    "─────────────────────────────\n"
    "1 ensamble por cama (sin rodillos\n"
    "ni pasadores) + trozo de eje:\n"
    "  placa A · placa B · polea 48T\n"
    "  retenedor · 2 casquillos · eje\n"
    "─────────────────────────────\n"
    "MECANUM72_cama_PACF_100.gcode\n"
    f"  ≈ 53 g de PA-CF\n"
    f"  tiempo estimado {tiempo}\n"
    "─────────────────────────────\n"
    "Tras imprimir: retirar soporte del\n"
    "asiento Ø32, repasar cunas Ø3.5 y\n"
    "prensar los 6804 en frío."
)
ax.text(0.0, 0.99, imp, transform=ax.transAxes, fontsize=10,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.6', fc='#eef4ee', ec='#7a8'))

fig.suptitle('Mecanum64 v6 — rodamientos 6804 en ambas caras, polea GT2 48T y eje pasante 1/2" '
             '(mecanum72.py)', fontsize=17, y=0.995)
fig.subplots_adjust(top=0.945, bottom=0.02, left=0.02, right=0.99, hspace=0.22, wspace=0.06)
fig.savefig(p('MECANUM72_lamina.png'), dpi=100, facecolor='white')
print('lamina ok')
