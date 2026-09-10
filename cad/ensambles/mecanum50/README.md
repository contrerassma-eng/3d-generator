# Mecanum 50 izquierda — v7 (actual) y v6

## v7 — UNA SOLA PIEZA con corona dentada (`gen_mecanum50_v7.py`)

Rediseño del encaje pedido por el usuario para impresión por capas:

- **Corona anular de 3 dientes trapezoidales** a todo el ancho del collar
  (desde la pared del hex hasta Ø26): **8 mm de engrane** (±4 sobre el
  plano de unión) con **flancos inclinados 15°** → la fuerza entra
  oblicua a las capas (compresión de flanco repartida en ~40 capas, no
  cizalle en un plano de capa) y la raíz del diente es mucho más ancha.
  El propio flanco guía la entrada y auto-centra al apretar. Apoyo de
  raíz en z=0, holgura de flanco 0.05 y alivio de 0.4 en fondos.
- **A = B**: una sola pieza (`placa_v7.stl`), se imprime **2 veces** y se
  montan enfrentadas (rotación de 180° sobre la línea a 30°). Los huecos
  de la corona son la imagen de montaje de los propios dientes:
  complementariedad exacta por construcción.
- **Pernería alternada** (como la rueda comercial de referencia):
  6 posiciones a 60° alternando bolsillo hex de tuerca (60°+120k) y
  asiento de cabeza DIN912 (0°+120k). Montada, cada **M3×40** encuentra
  tuerca capturada en una placa y cabeza asentada en la otra; quedan 3
  perforaciones sin usar por lado (aceptado). Los pasos Ø5.9 viejos
  (30°+120k) van tapados.
- **Hex de ½ pulgada**: barreno 12.70 + 0.15 de ajuste = **12.85 e/c**
  (parámetro `hex_ajuste`; calibrar con impresión de prueba — "un par de
  micras" no es resolución FDM). El hex 14.5 anterior se rellena.
- Sin cambios: brazos unificados (C1 de la v6), rodillos y pasadores
  intactos del STEP del usuario, ancho total del ensamble.

Compuertas v7 (todas en verde, `verificacion_v7.json`): GM1 estanca ·
GM2 brazos idénticos · GM3 cero esquinitas · GM4 holgura de rodillo
0.700 · GM5 corona montada sin interferencia, apoyo z=0, flanco 0.048 ·
GM6 pernería alternada (tuerca capturada: girada 30° choca) · GM7 la
barra de ½ in pasa y el barreno no queda sobredimensionado.

```bash
python cad/ensambles/mecanum50/gen_mecanum50_v7.py   # emite out/placa_v7.step/.stl
```

**BOM v7**: 2 × `placa_v7` (PETG) · 6 rodillos + 6 pasadores (del diseño
original) · 3 × M3×40 DIN912 · 3 × tuerca M3.

---

# v6 (iteración anterior) — placa B corregida + placa A con encaje negativo

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
- **C3 — encaje central A PRESIÓN**: en ambas placas se rellena el hueco
  entre dientes con un **collar** (Ø26) → contacto anular pleno en z=0
  (antes solo puntitas). En la **placa B** los 6 dientes se prolongan
  **5.0 mm en macho** con **chanfle de entrada** (0.6 × 0.6, escalonado —
  la impresora lo escalona igual). En la **placa A** los mismos perfiles —
  espejados con la transformación real de montaje **Rz(60°)·Rx(180°)**, la
  que alinea los pernos — se cortan en **negativo MENOR que el perfil**:
  **apriete de 0.05 mm por flanco** (macho −0.05, hembra −0.10). Entra a
  presión con golpe suave y queda ajustado; 0.6 de luz solo en el fondo
  para que el tope axial siga siendo collar contra collar.
- **C4 — asiento de cabeza y encaje de tuerca** (el paso Ø5.9 original no
  tenía hombro: la cabeza se colaba): en la **placa A** el paso se tapona y
  se re-taladra **Ø3.4** → hombro anular en z=18.3 donde asienta la cabeza
  DIN912, alojada bajo la cara exterior. En la **placa B**, bolsillo
  **hexagonal 5.6 e/c × 3** (apriete leve sobre la tuerca M3 de 5.5: entra
  a presión y **no gira** — se aprieta con una sola llave), sin invadir la
  cajera central del trébol. Perno resultante: **M3×40** (queda a ras).
- El ancho total del ensamble **no cambia**: rodillos y pasadores quedan
  exactamente donde estaban.

## Compuertas (el generador FALLA si alguna no pasa)

| | Qué verifica |
|---|---|
| GM1 | mallas estancas y volúmenes sanos de A y B |
| GM2 | los 6 brazos idénticos (diferencia booleana ≈ 0 vs maestro rotado) |
| GM3 | ninguna cara < 0.005 mm² (esquinitas eliminadas) |
| GM4 | holgura placa-rodillo ≥ 0.65 en los 6 rodillos × 2 placas |
| GM5 | encaje a presión: EXISTE la interferencia de diseño (~0.05/flanco, mediana en [0.01,0.10]) y la punta chanfleada entra libre; collar de A en z=0 |
| GM6 | pernería M3×40: vástago Ø3.2 pasa, cabeza alojada, hombro presente, tuerca entra en su bolsillo y girada 30° CHOCA (capturada) |
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
  que los pernos coincidan (los dientes en dos formas hacen único el calce
  cada 120°); presentar los machos por el chanfle y **prensar** hasta que
  apoye collar contra collar en z=0 (golpe suave o prensa — hay 0.05 de
  apriete por flanco); meter las 3 tuercas M3 a presión en sus bolsillos
  hex de B y apretar los 3 **M3×40** desde el lado A (una sola llave: la
  tuerca no gira).
- El pasador queda con su tope axial original en el fondo de la ranura.

**BOM comprada**: 3 × perno M3×40 DIN912 · 3 × tuerca M3 DIN934 (los
M3×25 del modelo de entrada no alcanzaban la tuerca).

## Nota

Si prefieres una sola pieza para las dos caras (hermafrodita: macho +
negativo en la misma placa, imprimes 2 iguales), los ángulos lo permiten —
pídelo y se genera; se mantuvo B macho / A hembra porque así lo pediste.
