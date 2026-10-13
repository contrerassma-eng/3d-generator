import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import matplotlib.gridspec as gridspec

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

fig = plt.figure(figsize=(20, 16), dpi=100)
gs = gridspec.GridSpec(3, 3, width_ratios=[1.15, 1.0, 1.0],
                       height_ratios=[0.95, 1.0, 1.05], figure=fig)

ax = fig.add_subplot(gs[0, :])
im = mpimg.imread(p('BO4Z_conveyor.png'))
h = im.shape[0]
ax.imshow(im[int(h*0.08):int(h*0.98), :]); ax.axis('off')
ax.set_title('v4: módulo ANGOSTO en el ZP2026 completo — solo las 4 filas, zona muerta libre, '
             'apoyado en travesaños sobre las pestañas inferiores', fontsize=13, pad=6)

ax = fig.add_subplot(gs[1, 0])
ax.imshow(mpimg.imread(p('BO4Z_zona.png'))); ax.axis('off')
ax.set_title('La zona: tapa solo del ancho del módulo; franja muerta ABIERTA', fontsize=11, pad=5)

ax = fig.add_subplot(gs[1, 1])
ax.imshow(mpimg.imread(p('BO4Z_planta.png'))); ax.axis('off')
ax.set_title('Planta: módulo a la izquierda, muerta libre; travesaños x=±180', fontsize=10, pad=5)

ax = fig.add_subplot(gs[1, 2])
ax.imshow(mpimg.imread(p('BO4Z_transmision.png'))); ax.axis('off')
ax.set_title('Lado motriz abierto: rieles de 4 con pies, motores con placa de 8 a la base',
             fontsize=10, pad=5)

ax = fig.add_subplot(gs[2, 0])
ax.imshow(mpimg.imread(p('BO4Z_frente.png'))); ax.axis('off')
ax.set_title('Frente desde el lado muerto: bandas Poly-V apiladas', fontsize=10, pad=4)

ax = fig.add_subplot(gs[2, 1]); ax.axis('off')
t1 = (
    "MÓDULO v4 (angosto)\n"
    "─────────────────────────────\n"
    "ancho SOLO 4 filas: y −160…+220\n"
    " zona muerta LIBRE (106.8 al\n"
    " larguero −Y)\n"
    "2 rieles perforados de 4 mm:\n"
    " agujero Ø21, F6801ZZ embutido\n"
    " DESDE FUERA (brida Ø23.2)\n"
    "EJE HEX 1/2\" e/c con rebaje\n"
    " redondo torneado a Ø12 × 10\n"
    "buje rueda hex→hex 14.4/12.85\n"
    " sin prisioneros; PVC separa\n"
    "apoyo: 2 travesaños 50×6 en\n"
    " x±180 sobre las PESTAÑAS\n"
    " INFERIORES (z=−82.6 medido)\n"
    " + colisas 9×25 en la base\n"
    "tapa avellanada M5: 32 ventanas\n"
    " mín. · rueda +5.0 · nivel 115.1"
)
ax.text(0.0, 1.02, t1, transform=ax.transAxes, fontsize=9.2,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.5', fc='#f4f4f6', ec='#888'))

ax = fig.add_subplot(gs[2, 2]); ax.axis('off')
t2 = (
    "TRANSMISIÓN v4\n"
    "─────────────────────────────\n"
    "poleas DOBLES PJ Ø40×20 con\n"
    " agujero hexagonal\n"
    "motor → SUS 2 EJES CENTRALES\n"
    " (garganta 1) y esos 2 → los\n"
    " extremos (garganta 2)\n"
    "bandas apiladas en lado muerto:\n"
    " der −69/−79 · izq −95/−105\n"
    "motores UniDrive reales x=∓90\n"
    " escalonados (no se tocan)\n"
    "SOPORTE DE MOTOR A LA BASE:\n"
    " placa de 8 mm tipo Flowsort\n"
    " con colisas de tensado\n"
    "─────────────────────────────\n"
    "GATES\n"
    "─────────────────────────────\n"
    "nivel 115.1 / sobresale 5   OK\n"
    "banda↔rueda 6.7             OK\n"
    "lomo motor 50.4 < riel 52   OK\n"
    "cuerpos motor separados     OK\n"
    "TR_S y pestañas libres      OK\n"
    "F6801: punta Ø12 × 10       OK"
)
ax.text(0.0, 1.02, t2, transform=ax.transAxes, fontsize=9.2,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.5', fc='#eef4ee', ec='#7a8'))

fig.suptitle('Bloque OMNI v4 — módulo angosto: F6801 en placa de 4, eje hex 1/2" con rebaje Ø12, '
             'travesaños a pestañas, Poly-V motor→2→resto (bloque_omni_v4.py · bo4z_scene.py)',
             fontsize=14.5, y=0.995)
fig.subplots_adjust(top=0.95, bottom=0.02, left=0.02, right=0.99, hspace=0.2, wspace=0.05)
fig.savefig(p('BO4Z_lamina.png'), dpi=100, facecolor='white')
print('lamina ok')
