# Mecanum 50 izquierda v6 — placa B corregida + placa A con encaje negativo

Corrección del modelo del usuario `Mecanum50_izq.stp` (Inventor 2027,
capa `user`): rueda mecanum izquierda de 6 rodillos a 44°, dos placas
enfrentadas, hex central 14.5 entre caras y 3 pernos M3.

Todo lo genera `gen_mecanum50_v6.py` leyendo el STEP original; el reporte
de medidas y compuertas queda en [`verificacion.json`](verificacion.json).

## Qué estaba mal (medido, no a ojo)

| | Defecto |
|---|---|
| D1 | **Los brazos no eran todos iguales**: dos familias alternadas (~2140 vs ~2630 mm³ por sector) y decalajes angulares individuales de hasta ~1 mm a r=20. Las superficies funcionales sí eran idénticas en los 6: bolsa de rodillo exactamente a 0.700 mm y ranura de pasador Ø4.1 — el error estaba en el lomo de los brazos. |
| D2 | **Esquinitas**: 24 caras sliver de menos de 0.005 mm² en los cantos de los brazos (r≈31) y en la base del cubo. |
| D3 | Las dos placas **no encajaban**: solo se tocaban en las puntas de los dientes centrales. Peor: con el reloj de montaje que traía el STEP (120°), el perno de 30° atravesaba 3.7 mm de material de la placa de abajo. |

Lo que estaba perfecto (y no se toca): los 6 pasadores y rodillos en patrón
de 60.000° exacto, el hex 14.5 con caras a 30°+60k, los pasos de perno Ø5.9
en r=10.9 a 30/150/270 y el trébol portacabeza/tuerca.

## Qué hace la v6

- **C1 — brazos uniformes**: el brazo maestro (sector 315–375°, la familia
  ancha y consistente) se patrona EXACTAMENTE 6×60° sobre el núcleo
  (r<14.5), que conserva hex, pasos de perno, trébol y dientes originales.
  La bolsa del rodillo y la ranura del pasador quedan como estaban (eran
  idénticas); solo se unifica el lomo.
- **C2 — esquinitas fuera**: saneo por defeaturing B-rep iterativo (con
  racimos de vecinas y micro-hoyuelo de último recurso), verificado por
  inventario: 24 caras sliver en la entrada → **0** en ambas placas.
- **C3 — encaje central**: en ambas placas se rellena el hueco entre
  dientes con un **collar** (Ø26) → contacto anular pleno en z=0 (antes
  solo puntitas). En la **placa B** los 6 dientes se prolongan **5.0 mm en
  macho** con piloto de entrada (escalón −0.6 × 0.55). En la **placa A** los
  mismos perfiles — espejados con la transformación real de montaje
  **Rz(60°)·Rx(180°)**, la que alinea los pernos — se cortan en **negativo**
  con 0.2 mm de holgura por flanco y 0.6 en el fondo. Con el reloj a 60° los
  dientes de B caen exactamente entre los dientes de A y los pernos pasan
  limpios por sus Ø5.9.
- El ancho total del ensamble **no cambia**: rodillos, pasadores y pernos
  quedan donde estaban.

## Compuertas (el generador FALLA si alguna no pasa)

| | Qué verifica |
|---|---|
| GM1 | mallas estancas y volúmenes sanos de A y B |
| GM2 | los 6 brazos idénticos (diferencia booleana ≈ 0 vs maestro rotado) |
| GM3 | ninguna cara < 0.005 mm² (esquinitas eliminadas) |
| GM4 | holgura placa-rodillo ≥ 0.65 en los 6 rodillos × 2 placas |
| GM5 | macho de B dentro del negativo de A sin tocar (holgura ≥ 0.15) y collar de A en z=0 |
| GM6 | calibre de perno Ø5.6 pasa recto en 30/150/270 por ambas placas |
| GM7 | calibre hex 14.4 e/c × 44 pasa por el barreno de ambas placas |

Resultados numéricos: `verificacion.json`.

## Cómo se regenera

```bash
pip install cadquery trimesh scipy rtree shapely numpy
python cad/ensambles/mecanum50/gen_mecanum50_v6.py
```

Emite en `out/` (derivados, fuera de git): `placa_B_v6.step/.stl`,
`placa_A_v6.step/.stl`, `Mecanum50_izq_v6.step` (ensamble completo con
rodillos, pasadores y pernos) y el render de verificación.

## Impresión y montaje

- Imprimir ambas placas con la **cara exterior en la cama** (la cara de
  unión, con dientes/negativos, hacia arriba): los machos salen como
  prismas verticales y los negativos como bolsillos, sin soportes en la
  zona del encaje.
- Montaje: rodillo + pasador en cada bolsa de B; enfrentar A girada de modo
  que los pernos coincidan (solo entra en los relojes correctos — los
  dientes en dos formas hacen único el calce cada 120°); los machos de B
  entran en los negativos de A hasta apoyar collar contra collar en z=0;
  3× M3 con cabeza en el trébol de un lado y tuerca en el del otro.
- El pasador queda con su tope axial original en el fondo de la ranura.

## Nota

Si prefieres una sola pieza para las dos caras (hermafrodita: macho +
negativo en la misma placa, imprimes 2 iguales), los ángulos lo permiten —
pídelo y se genera; se mantuvo B macho / A hembra porque así lo pediste.
