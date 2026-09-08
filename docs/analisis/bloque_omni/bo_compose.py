import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import matplotlib.gridspec as gridspec

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

fig = plt.figure(figsize=(20, 12.5), dpi=100)
gs = gridspec.GridSpec(3, 3, width_ratios=[1.35, 1.0, 1.0],
                       height_ratios=[1.15, 1.0, 0.52], figure=fig)

ax = fig.add_subplot(gs[0, 0])
ax.imshow(mpimg.imread(p('BO_hero.png'))); ax.axis('off')
ax.set_title('Bloque OMNI en su zona del ZP2026 (reemplaza 8 rodillos)', fontsize=13, pad=6)

ax = fig.add_subplot(gs[0, 1:])
ax.imshow(mpimg.imread(p('BO_destapado.png'))); ax.axis('off')
ax.set_title('Destapado: 8 ejes hex 14 — azul DERECHOS / naranja IZQUIERDOS — '
             'bujes PVC 3/4" entre ruedas', fontsize=12, pad=6)

ax = fig.add_subplot(gs[1, 0])
ax.imshow(mpimg.imread(p('BO_planta.png'))); ax.axis('off')
ax.set_title('Planta: tapa superior con 48 ventanas MÍNIMAS (46.3 × 40.6)', fontsize=12, pad=6)

ax = fig.add_subplot(gs[1, 1]); ax.axis('off')
t1 = (
    "MEDIDO DEL ZP2026 (GLB real)\n"
    "─────────────────────────────\n"
    "paso rodillos      74.75\n"
    "zona (8 pasos)     598.0\n"
    "interior caras     533.6\n"
    "rodillo            Ø50 · eje 90.1\n"
    "plano de rodadura  115.1\n"
    "larguero           190.5 (tope 108)\n"
    "motor UniDrive     152.7×118.1×119\n"
    "                   por cara interior\n"
    "─────────────────────────────\n"
    "BLOQUE (caja Flowsort)\n"
    "─────────────────────────────\n"
    "largo 598 = LA zona; ejes en las\n"
    "  8 posiciones de los rodillos\n"
    "2 placas 594×71×4 + 3 separadores\n"
    "  M8 + tapas lat./inf./superior\n"
    "ménsulas con colisa 9×25 (ajuste)\n"
    "eje hex 14 e/c, puntas Ø12\n"
    "  en rodamientos 6001 (12×28×8)\n"
    "6 ruedas mecanum v7 por eje\n"
    "  (Ø64×36.6, hex 14.5 pasante)\n"
    "bujes PVC 3/4\" SCH40 entre ruedas"
)
ax.text(0.0, 1.02, t1, transform=ax.transAxes, fontsize=10,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.55', fc='#f4f4f6', ec='#888'))

ax = fig.add_subplot(gs[1, 2]); ax.axis('off')
t2 = (
    "GATES (bloque_omni.py)\n"
    "─────────────────────────────\n"
    "nivel rueda 115.1 = ZP 115.1  OK\n"
    "sobresale sobre tapa    5.0   OK\n"
    "ventana mín. 46.3×40.6; queda\n"
    "  material 28.4 (X) / 42.7 (Y)\n"
    "separador z44.5 vs envolvente\n"
    "  mín 51.1 → holgura 0.6      OK\n"
    "carrete→cara interior   1.3   OK\n"
    "buje ID 20.9 vs hex Ø16.17\n"
    "  → holgura 4.73              OK\n"
    "─────────────────────────────\n"
    "ACCIONAMIENTO (como ZP2026)\n"
    "─────────────────────────────\n"
    "motor cara −Y → ejes 1·3·5·7\n"
    "  (DERECHOS)\n"
    "motor cara +Y → ejes 2·4·6·8\n"
    "  (IZQUIERDOS)\n"
    "carrete Ø40 en punta motriz +\n"
    "  o-rings eje a eje (salto 149.5)\n"
    "= velocidades iguales → recto;\n"
    "  diferencial → desvío a 45°\n"
    "─────────────────────────────\n"
    "POR BLOQUE: 24 ruedas der +\n"
    "24 izq · 8 ejes · 16× 6001 ·\n"
    "~38 bujes PVC · 2 UniDrive"
)
ax.text(0.0, 1.02, t2, transform=ax.transAxes, fontsize=10,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.55', fc='#eef4ee', ec='#7a8'))

ax = fig.add_subplot(gs[2, :])
im = mpimg.imread(p('BO_frente.png'))
h, w = im.shape[:2]
ax.imshow(im[int(h*0.28):int(h*0.62), :]); ax.axis('off')
ax.set_title('Frente: nivel de rodadura continuo con los rodillos vecinos; '
             'la rueda sobresale 5 sobre la tapa', fontsize=11, pad=4)

fig.suptitle('Bloque OMNI tipo Flowsort para el ZP2026 — 8 ejes mecanum v7 alternados, '
             'un motor por cara interior (bloque_omni.py)', fontsize=15, y=0.995)
fig.subplots_adjust(top=0.93, bottom=0.02, left=0.02, right=0.99, hspace=0.22, wspace=0.06)
fig.savefig(p('BO_lamina.png'), dpi=100, facecolor='white')
print('lamina ok')
