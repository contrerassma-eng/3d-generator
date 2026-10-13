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
im = mpimg.imread(p('BO3Z_conveyor.png'))
h = im.shape[0]
ax.imshow(im[int(h*0.08):int(h*0.98), :]); ax.axis('off')
ax.set_title('El ZP2026 COMPLETO (todos los nodos del GLB real) con el bloque OMNI ocupando '
             'su zona central — patas, largueros perforados, guardas, 32 rodillos, motores, '
             'sensores y escalerilla', fontsize=13, pad=6)

ax = fig.add_subplot(gs[1, 0])
ax.imshow(mpimg.imread(p('BO3Z_zona.png'))); ax.axis('off')
ax.set_title('La zona: rodillos reales Ø50 a ambos lados, nivel continuo 115.1', fontsize=11, pad=5)

ax = fig.add_subplot(gs[1, 1])
ax.imshow(mpimg.imread(p('BO3Z_planta.png'))); ax.axis('off')
ax.set_title('Planta: escalerilla CORTADA en la zona (se reencamina); barra sensora '
             'vecina (roja) intacta', fontsize=10, pad=5)

ax = fig.add_subplot(gs[1, 2])
ax.imshow(mpimg.imread(p('BO3Z_perfil.png'))); ax.axis('off')
ax.set_title('Lado motriz abierto: el bloque entre las zonas MDR vecinas', fontsize=11, pad=5)

ax = fig.add_subplot(gs[2, 0])
ax.imshow(mpimg.imread(p('BO3_transmision.png'))); ax.axis('off')
ax.set_title('Serpentín Poly-V del bloque (UniDrive + carrete reales)', fontsize=10, pad=4)

ax = fig.add_subplot(gs[2, 1]); ax.axis('off')
t1 = (
    "OCUPACIÓN DE LA ZONA (v3.2)\n"
    "─────────────────────────────\n"
    "se retiran de la zona central:\n"
    " 8 rodillos 'pos' + casetes,\n"
    " correas pale-blue, o-rings,\n"
    " UniDrive + carrete de zona y\n"
    " su tornillería (38 nodos)\n"
    "se conservan: largueros, TR_S,\n"
    " guardas, patas, sensores de\n"
    " zonas vecinas\n"
    "escalerilla: CORTADA |x|<310 →\n"
    " reencaminar por fuera\n"
    "controlador 'c' → x+330\n"
    "fuente 24V → x−450 (reubicados\n"
    " sobre el mismo larguero)\n"
    "─────────────────────────────\n"
    "ADAPTACIÓN AL BASTIDOR REAL\n"
    "─────────────────────────────\n"
    "rebaje de placas |x|>274 bajo\n"
    " z18 vs travesaño TR_S (x280.2,\n"
    " tope z14.1) → holg. 6.2 / 3.9\n"
    "laterales desde z18 (pasan\n"
    " SOBRE el travesaño); escuadras\n"
    " a z35; base y tapa inf. ±272\n"
    "colisas M8 → taladros Ø8.2 del\n"
    " larguero real (Flowsort §4.4)"
)
ax.text(0.0, 1.02, t1, transform=ax.transAxes, fontsize=9.2,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.5', fc='#f4f4f6', ec='#888'))

ax = fig.add_subplot(gs[2, 2]); ax.axis('off')
t2 = (
    "EL BLOQUE (sin cambios v3.1)\n"
    "─────────────────────────────\n"
    "8 ejes hex 14 (paso 74.75 del\n"
    " patrón real) · 4 mecanum v7\n"
    " REALES por eje, equidistantes\n"
    " (78), grupo a la IZQUIERDA\n"
    "Poly-V PJ por cara: serpentín\n"
    " bajo 4 poleas Ø40, 3 tensores\n"
    "2 UniDrive reales dentro\n"
    "6 separadores M8 (solo salen\n"
    " donde pasa la correa)\n"
    "placa base + tapa avellanada\n"
    " M5×10 con 32 ventanas mín.\n"
    "rueda sobresale 5.0 · nivel\n"
    " 115.1 = rodillos reales\n"
    "─────────────────────────────\n"
    "GATES\n"
    "─────────────────────────────\n"
    "nivel/sobresale/polea    OK\n"
    "TR_S 6.2 (x) 3.9 (z)     OK\n"
    "base vs fondo motor 1.3  OK\n"
    "40 rodillos ZP alineados\n"
    " (verificado: 0 torcidos)\n"
    "38 nodos retirados, 199 quedan"
)
ax.text(0.0, 1.02, t2, transform=ax.transAxes, fontsize=9.2,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.5', fc='#eef4ee', ec='#7a8'))

fig.suptitle('Bloque OMNI v3.2 — ocupando TAL CUAL el transportador cero presión ZP2026 '
             '(bo3z_scene.py: GLB real completo + bloque en la zona central)',
             fontsize=15, y=0.995)
fig.subplots_adjust(top=0.95, bottom=0.02, left=0.02, right=0.99, hspace=0.2, wspace=0.05)
fig.savefig(p('BO3Z_lamina.png'), dpi=100, facecolor='white')
print('lamina ok')
