import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import matplotlib.gridspec as gridspec

OUT = os.path.dirname(os.path.abspath(__file__))
p = lambda f: os.path.join(OUT, f)

fig = plt.figure(figsize=(20, 15.5), dpi=100)
gs = gridspec.GridSpec(3, 3, width_ratios=[1.25, 1.0, 1.0],
                       height_ratios=[1.05, 1.0, 1.05], figure=fig)

ax = fig.add_subplot(gs[0, 0])
ax.imshow(mpimg.imread(p('BO3_hero.png'))); ax.axis('off')
ax.set_title('v3 en su zona del ZP2026 — 4 ruedas/eje, grupo a la IZQUIERDA', fontsize=13, pad=6)

ax = fig.add_subplot(gs[0, 1:])
ax.imshow(mpimg.imread(p('BO3_destapado.png'))); ax.axis('off')
ax.set_title('Sin tapa superior: 8 ejes alternados, ruedas equidistantes (paso 78) '
             'cargadas a +Y, bujes PVC en el lado libre', fontsize=12, pad=6)

ax = fig.add_subplot(gs[1, 0])
ax.imshow(mpimg.imread(p('BO3_planta.png'))); ax.axis('off')
ax.set_title('Planta: 32 ventanas mínimas; franja derecha CERRADA (grupo a la izquierda)',
             fontsize=11, pad=6)

ax = fig.add_subplot(gs[1, 1:])
ax.imshow(mpimg.imread(p('BO3_transmision.png'))); ax.axis('off')
ax.set_title('Serpentín POLY-V PJ (cara −Y abierta): UniDrive real → correa bajo las '
             '4 poleas Ø40 con 3 tensores Ø24 entre ejes', fontsize=11, pad=6)

ax = fig.add_subplot(gs[2, 0])
ax.imshow(mpimg.imread(p('BO3_motores.png'))); ax.axis('off')
ax.set_title('Desde abajo (sin tapa inferior ni base): LOS DOS UniDrive, uno por cara, '
             'con su serpentín', fontsize=10, pad=4)

ax = fig.add_subplot(gs[2, 1]); ax.axis('off')
t1 = (
    "MÓDULO (caja Flowsort v3)\n"
    "─────────────────────────────\n"
    "2 placas laterales 594×181×4\n"
    "  con RANURAS Flowsort (2 filas)\n"
    "PLACA BASE 582×498×4 con\n"
    "  arreglos de ranuras (p.23)\n"
    "6 separadores M8: solo salen\n"
    "  DONDE PASA LA CORREA (cruces\n"
    "  z44.5: x±211.6/±26; motores\n"
    "  hasta z50.4 → central a ±150)\n"
    "LATERALES de extremo con\n"
    "  columnas de ranuras verticales\n"
    "  9×20 + 4 escuadras → AJUSTE\n"
    "  EN PROFUNDIDAD del módulo\n"
    "tapa superior avellanada M5×10:\n"
    "  32 ventanas mín. · rueda +5.0\n"
    "tapa inferior con louvres\n"
    "colisas M8 9×25 al larguero\n"
    "  (Ø8.2, M8×16) → TOR +0…+2\n"
    "4 cáncamos M8 (§4.3)\n"
    "─────────────────────────────\n"
    "EJES Y RUEDAS\n"
    "─────────────────────────────\n"
    "8 ejes hex 14 (6001, paso 74.75)\n"
    "4 mecanum v7 REALES por eje:\n"
    "  y = −39/39/117/195 (paso 78,\n"
    "  grupo CARGADO A IZQUIERDA +Y)\n"
    "bujes PVC 3/4\"; el lado derecho\n"
    "  libre lleva buje largo (191)"
)
ax.text(0.0, 1.02, t1, transform=ax.transAxes, fontsize=9.2,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.5', fc='#f4f4f6', ec='#888'))

ax = fig.add_subplot(gs[2, 2]); ax.axis('off')
t2 = (
    "TRANSMISIÓN POLY-V (Flowsort)\n"
    "─────────────────────────────\n"
    "correa PJ 4 nervios por cara\n"
    "  (como SLD/DLD: PJ 559/4)\n"
    "serpentín: motor → BAJO las 4\n"
    "  poleas Ø40 del eje → SOBRE 3\n"
    "  tensores Ø24 entre ejes\n"
    "  (fondo polea 63.1 / tope\n"
    "  tensor 64.0 → abraza)\n"
    "2 UniDrive 24V reales DENTRO,\n"
    "  uno por cara, carrete real Ø68\n"
    "  87.7 bajo el plano de ejes\n"
    "cara −Y → 4 ejes DERECHOS\n"
    "cara +Y → 4 ejes IZQUIERDOS\n"
    "iguales→recto · diferencial→45°\n"
    "─────────────────────────────\n"
    "GATES (bloque_omni_v3.py)\n"
    "─────────────────────────────\n"
    "nivel 115.1 = ZP        OK\n"
    "sobresale tapa 5.0      OK\n"
    "polea 214–228 vs rueda\n"
    "  213.3 → holgura 0.7   OK\n"
    "lomo motor 50.4 < 51.1  OK\n"
    "base −73/−69 vs fondo\n"
    "  motor −67.7 → 1.3     OK\n"
    "ventanas 46.3×40.6      OK"
)
ax.text(0.0, 1.02, t2, transform=ax.transAxes, fontsize=9.2,
        family='monospace', va='top',
        bbox=dict(boxstyle='round,pad=0.5', fc='#eef4ee', ec='#7a8'))

fig.suptitle('Bloque OMNI v3 — módulo Flowsort completo: Poly-V, placa base, laterales con '
             'ajuste en profundidad, 4 ruedas/eje a la izquierda (bloque_omni_v3.py · bo3_scene.py)',
             fontsize=14.5, y=0.995)
fig.subplots_adjust(top=0.94, bottom=0.02, left=0.02, right=0.99, hspace=0.24, wspace=0.06)
fig.savefig(p('BO3_lamina.png'), dpi=100, facecolor='white')
print('lamina ok')
