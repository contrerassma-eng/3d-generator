# Cortes v8: seccion por el CENTRO de un diente (azimut 15) para ver el snap
# encajado, y una vista de detalle del barb en su rebaje.
import cadquery as cq
import os
from mecanum64v8 import placa, W2

OUT = os.path.dirname(os.path.abspath(__file__))
half = cq.Workplane("XY").box(200, 100, 200).translate((0, 50, 0))

# giro -15: el centro del diente/bolsillo queda en el plano de corte XZ
for nm, s in (('cutA', placa(-1).rotate((0, 0, 0), (0, 0, 1), -15)),
              ('cutB', placa(+1).rotate((0, 0, 0), (0, 0, 1), -15))):
    cq.exporters.export(s.cut(half), os.path.join(OUT, f'm64v8_{nm}.stl'),
                        tolerance=0.02, angularTolerance=0.2)
    print(nm, 'ok', flush=True)

# corte tangencial: plano a r=11.5 mirando el flanco (para ver barb+rebaje)
tang = cq.Workplane("XY").box(200, 200, 200).translate((0, 0, -100 - 1.0))
for nm, s in (('detA', placa(-1).rotate((0, 0, 0), (0, 0, 1), -15)),
              ('detB', placa(+1).rotate((0, 0, 0), (0, 0, 1), -15))):
    caja = cq.Workplane("XY").box(40, 40, 20).translate((11.0, 0, 2.5))
    cq.exporters.export(s.intersect(caja), os.path.join(OUT, f'm64v8_{nm}.stl'),
                        tolerance=0.015, angularTolerance=0.15)
    print(nm, 'ok', flush=True)
