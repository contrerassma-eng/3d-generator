import cadquery as cq
import os
from mecanum72 import (placa, polea_gt2, retenedor, casquillo, rodamiento_6804,
                       tornillo, W2, SEAT_Z, BRG_W, SCREW4_R, LEDGE_Z)

OUT = os.path.dirname(os.path.abspath(__file__))
half = cq.Workplane("XY").box(200, 100, 200).translate((0, 50, 0))   # quita y>0

# giro -45 para que un perno central quede en el plano de corte
piezas = {
    'cutA': placa(-1).rotate((0, 0, 0), (0, 0, 1), -45),
    'cutB': placa(+1).rotate((0, 0, 0), (0, 0, 1), -45),
    'cutPOL': polea_gt2().rotate((0, 0, 0), (1, 0, 0), 180)
              .translate((0, 0, -W2)),
    'cutRET': retenedor().translate((0, 0, W2)),
    'cutBRGA': rodamiento_6804().translate((0, 0, -(W2 - BRG_W / 2))),
    'cutBRGB': rodamiento_6804().translate((0, 0, W2 - BRG_W / 2)),
    'cutCASA': casquillo().translate((0, 0, -W2)),
    'cutCASB': casquillo().rotate((0, 0, 0), (1, 0, 0), 180).translate((0, 0, W2)),
    'cutEJE': cq.Workplane("XY").circle(12.7 / 2).extrude(64).translate((0, 0, -32)),
}
per = tornillo(2.9, 20, 5.6, 2.0).translate((SCREW4_R, 0, LEDGE_Z))
piezas['cutPER'] = per

for nm, s in piezas.items():
    cq.exporters.export(s.cut(half), os.path.join(OUT, f'mec72_{nm}.stl'),
                        tolerance=0.03, angularTolerance=0.25)
    print(nm, 'ok', flush=True)
