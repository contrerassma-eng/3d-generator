import cadquery as cq
import os
from mecanum64v7 import placa, tornillo_29x25, W2, SCREW4_R

OUT = os.path.dirname(os.path.abspath(__file__))
half = cq.Workplane("XY").box(200, 100, 200).translate((0, 50, 0))

# giro -30: el perno de azimut 30 queda en el plano de corte XZ
piezas = {
    'cutA': placa(-1).rotate((0, 0, 0), (0, 0, 1), -30),
    'cutB': placa(+1).rotate((0, 0, 0), (0, 0, 1), -30),
    'cutPER': tornillo_29x25().translate((SCREW4_R, 0, -W2 + 2.2)),
}
for nm, s in piezas.items():
    cq.exporters.export(s.cut(half), os.path.join(OUT, f'm64v7_{nm}.stl'),
                        tolerance=0.03, angularTolerance=0.25)
    print(nm, 'ok', flush=True)
