import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import matplotlib.gridspec as gridspec

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

fig = plt.figure(figsize=(20, 15.0), dpi=100)
gs = gridspec.GridSpec(3, 3, width_ratios=[1.3, 1.0, 1.0],
                       height_ratios=[1.05, 0.95, 1.15], figure=fig)

ax = fig.add_subplot(gs[0, 0])
ax.imshow(mpimg.imread(p('BO2_hero.png'))); ax.axis('off')
ax.set_title('v2 en su zona del ZP2026 — ruedas mecanum v7 REALES (48×)', fontsize=13, pad=6)

ax = fig.add_subplot(gs[0, 1:])
ax.imshow(mpimg.imread(p('BO2_destapado.png'))); ax.axis('off')
ax.set_title('Sin tapa superior: 8 ejes hex 14 alternados (azul der / naranja izq), '
             'bujes PVC, cáncamos de izaje (Flowsort §4.3)', fontsize=12, pad=6)

ax = fig.add_subplot(gs[1, 0])
ax.imshow(mpimg.imread(p('BO2_planta.png'))); ax.axis('off')
ax.set_title('Planta: 48 ventanas mínimas 46.3×40.6 — se ven los rodillos a 45° '
             'de cada mano', fontsize=11, pad=6)

ax = fig.add_subplot(gs[1, 1:])
ax.imshow(mpimg.imread(p('BO2_transmision.png'))); ax.axis('off')
ax.set_title('Transmisión (placa −Y abierta): motor UniDrive REAL + carrete speed-up '
             'REAL → o-rings → carretes Ø40 de eje', fontsize=11, pad=6)

ax = fig.add_subplot(gs[2, 0])
im = mpimg.imread(p('BO2_frente.png'))
h = im.shape[0]
ax.imshow(im[int(h*0.10):int(h*0.95), :]); ax.axis('off')
ax.set_title('Frente: caja profunda dentro del larguero; nivel continuo; '
             'colisas 9×25 (ajuste TOR +0…+2)', fontsize=10, pad=4)

ax = fig.add_subplot(gs[2, 1]); ax.axis('off')
t1 = (
    "CAJA (interpretación Flowsort)\n"
    "─────────────────────────────\n"
    "2 placas laterales 594×181×4\n"
    "  (z −75…106, motores DENTRO)\n"
    "tapa superior e3 avellanada\n"
    "  M5×10 a 3 Nm (§4.3) · 48\n"
    "  ventanas mín. · rueda +5.0\n"
    "tapa inferior + 2 laterales\n"
    "  con louvres · grommet Ø16\n"
    "montaje bastidor §4.4: M8×16\n"
    "  en Ø8.2, colisa 9×25, casqui-\n"
    "  llo Ø16×12.8 → TOR +0…+2\n"
    "4 cáncamos M8 izaje (§4.3)\n"
    "5 varillas M8 + tubo separador\n"
    "─────────────────────────────\n"
    "EJES Y RUEDAS\n"
    "─────────────────────────────\n"
    "8 ejes hex 14 e/c en 6001,\n"
    "  paso 74.75 = patrón ZP2026\n"
    "6 mecanum v7 por eje (Ø64,\n"
    "  hex 14.5) · paso transv. 78\n"
    "bujes PVC 3/4\" SCH40; lado\n"
    "  motriz partido por carrete"
)
ax.text(0.0, 1.02, t1, transform=ax.transAxes, fontsize=9.2,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.5', fc='#f4f4f6', ec='#888'))

ax = fig.add_subplot(gs[2, 2]); ax.axis('off')
t2 = (
    "ACCIONAMIENTO (ZP2026 real)\n"
    "─────────────────────────────\n"
    "2 UniDrive 24V (malla real del\n"
    "  GLB) dentro de la caja,\n"
    "  frente contra su placa\n"
    "carrete speed-up REAL Ø68 en\n"
    "  plano y=±221 · z −8.6\n"
    "  (87.7 bajo ejes, como ZP)\n"
    "o-rings: motor→2 ejes centrales\n"
    "  + eje↔eje (salto 149.5);\n"
    "  4 lazos por cara\n"
    "cara −Y → ejes DERECHOS\n"
    "cara +Y → ejes IZQUIERDOS\n"
    "iguales→recto · diferencial→45°\n"
    "─────────────────────────────\n"
    "GATES (bloque_omni_v2.py)\n"
    "─────────────────────────────\n"
    "nivel 115.1 = ZP        OK\n"
    "sobresale tapa 5.0      OK\n"
    "lomo motor 50.4 < 51.1  OK\n"
    "carrete 216–226 libre   OK\n"
    "ventanas 46.3×40.6      OK\n"
    "buje ID20.9/hex Ø16.17  OK"
)
ax.text(0.0, 1.02, t2, transform=ax.transAxes, fontsize=9.2,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.5', fc='#eef4ee', ec='#7a8'))

fig.suptitle('Bloque OMNI v2 — interpretación detallada Flowsort SLD/DLD + rueda v7 real + '
             'motor/carrete reales del ZP2026 (bloque_omni_v2.py · bo2_scene.py)',
             fontsize=15, y=0.995)
fig.subplots_adjust(top=0.94, bottom=0.02, left=0.02, right=0.99, hspace=0.24, wspace=0.06)
fig.savefig(p('BO2_lamina.png'), dpi=100, facecolor='white')
print('lamina ok')
