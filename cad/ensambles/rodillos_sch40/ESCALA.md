# ESCALA.md — de qué píxeles salen las cotas

## Procedencia

Dos planos de catálogo **entregados por el usuario** en esta sesión:

| Archivo | Pieza | Rev. |
|---|---|---|
| `2D2.240.SHC.AFAW522.pdf` | Damon **2.240.SHC.AFA** — rodillo recto Ø50×1.5, eje 11hex, spring loaded | A · 17/3/16 |
| `2D2.640.SHJ.AFAW522.pdf` | Damon **2.640.SHJ.AFA** — rodillo cónico, misma base + camisas | A · 17/3/16 |
| `Rod.pdf` (15 p.) | catálogo de portarodamientos SKPB / SKP / SKPRB | — |

Los tres son PDF **vectoriales sin capa de texto** en las vistas (el `get_text()` de
las láminas devuelve sólo el número de pieza). Por eso las cotas se leen de dos
maneras y se contrastan entre sí: el **texto de las cotas** que sí extrae el PDF y
la **medición en píxeles** del rasterizado.

> Uso de los planos del fabricante: referencia dimensional y de nomenclatura. No
> se redistribuyen ni se copian; el modelo de este directorio es geometría propia.

## Rasterizado

`PyMuPDF` a **400 dpi**. La página es A4 (841.92 × 595.32 pt) aunque el cajetín
declara formato A3 y escala 1:1 — el dibujo fue reducido para caber, así que la
escala del cajetín **no sirve** y hay que derivarla.

```
página 4678 × 3308 px  →  15.7503 px/mm de papel
```

## Derivación de la escala — dos anclas independientes

| # | Rasgo medido | Píxeles | Cota de catálogo | mm/px |
|---|---|---|---|---|
| 1 | Ø exterior del tubo (columna x = 2000, cantos en y = 1027.5 y 1505.5) | **478.0** | Ø50 | **0.104603** |
| 2 | paso entre los centros de los dos canales (fila y = 1050, centros en x = 1323.5 y 1610.0) | **286.5** | 30 | **0.104712** |

Las dos coinciden dentro del **0.10 %**, y son ortogonales entre sí (una vertical
—un diámetro—, otra horizontal —una distancia—). Se adopta

```
escala = 0.104712 mm/px          (ancla horizontal, la que gobierna la cadena de cotas)
eje del rodillo: y = 1266.5 px   ((1027.5 + 1505.5)/2 = 1266.5, medido 1267 en el eje de simetría)
```

## Verificación de la cadena de cotas 553 / 532 / 531 / 522

El dibujo tiene una **rotura (zigzag)** en el centro: las distancias largas NO son
proporcionales. Lo que sí es medible es **dónde arranca cada línea de referencia**
de cada cota. Barriendo filas por debajo de la pieza:

| Fila | Líneas de referencia encontradas (px) | Cota a la que pertenecen |
|---|---|---|
| y = 1800 | 888.0 · 3278.0 | **553** |
| y = 1700 | 888.0 · **993.5** · 3173.5 · 3278.0 | **531** |
| y = 1600 | 888.0 · 993.5 · **1037.0** · 3130.0 · 3173.5 | **522** |

De ahí, en el extremo izquierdo:

| Tramo | px | mm medidos | mm esperados | Error |
|---|---|---|---|---|
| punta del eje → cara exterior de la tapa (888 → 993.5) | 105.5 | **11.05** | (553−531)/2 = 11.0 | 0.5 % |
| cara exterior de la tapa → testa del tubo (993.5 → 1037) | 43.5 | **4.56** | (531−522)/2 = 4.5 | 1.3 % |

**Conclusión:** la cadena impresa es consistente y está dibujada a escala.
El eje sobresale **10.5 mm** de la cara interior del larguero, la tapa asoma
**4.5 mm** de la testa del tubo, y el tubo mide **522**. Esas tres cifras son las
que fija `params.mjs` (`salienteEje`, `salienteTapa`, `tuboLargo`).

También queda fijado que la cota **«35» se mide desde la CARA EXTERIOR DE LA TAPA**,
no desde la testa del tubo: 1323.5 − 993.5 = 330 px = 34.56 mm ≈ 35.

## Perfil del canal para correa redonda — es un arco único R5

Medido a la altura y = 1050 px (radio 217 px = Ø45.4), los flancos del primer
canal caen en x = 1278.0 y 1369.0 → **ancho 91 px = 9.53 mm**.

Un canal formado por **un solo arco R5** cuyo centro está a radio 24.25 (fondo
Ø38.5 = 24.25 − 5) predice, a Ø45.4:

```
ancho = 2·√(5² − (22.7 − 24.25)²) = 2·√22.60 = 9.51 mm
```

**9.53 medido vs 9.51 predicho (0.2 %).** El canal NO tiene fondo plano: es un
arco R5 tangente, de 9.89 mm de boca y 4.88 mm de profundidad.

## Rodillo cónico — el cono se confirma en píxeles

En `SHJ_400.png` el eje está en y = 1262.5 y los tramos rectos del cabezal miden
363 px, que con Ø50 dan **0.13774 mm/px** (esta lámina está más reducida que la
otra porque la pieza es más larga).

| Rasgo | px | mm | Catálogo |
|---|---|---|---|
| tramo recto del tubo | 363 | 50.0 | Ø50 ✔ |
| fondo de los canales | 283 | 38.98 | Ø38.5 (1.2 %) |
| **testa menor de la camisa** | **407** | **56.06** | **D1 = 55.6** (0.8 %) ✔ |
| crecimiento del cono (x 1644 → 1799) | +10 px en 155 px | +1.377 mm en 21.35 mm | **k = 0.0645** |

La tabla del catálogo da **k = (D2−D1)/WT = 0.06289** constante en las 18 filas
(σ = 0.00008). La medición en píxeles da **0.0645**, un 2.6 % arriba — dentro de
lo que permite medir un tramo de sólo 21 mm de papel. **Ambos métodos coinciden en
que las 18 filas de la tabla son un único cono**, y ese es el resultado que usa
`conico.mjs`.

Se adopta el valor de **tabla** (0.06289), no el de píxeles, porque procede de
números impresos y además cuadra con lo que publican los fabricantes:
Damon `Taper: 3.6°` e Interroll `the shaft ... is inclined by 1.8°`
→ semiángulo 1.8014° = k 0.06289. `gen_rodillos.mjs` lo verifica contra las 18
filas y falla si el error supera 0.35 mm (hoy: **0.08 mm**).

## Largo de la tapa — medido en el croquis «Type 1» del catálogo

El plano del rodillo **no dibuja la tapa por dentro** (no hay líneas ocultas), así
que de ahí no sale el largo. Pero la lámina de portarodamientos (`Rod.pdf`) trae
arriba los croquis **Type 1…4 en corte**, y ésos sí están dibujados a escala.

Rasterizado de la p. 2 a 600 dpi. Eje del croquis Type 1 en **y = 1245.8 px**
(punto medio de todos los pares simétricos hallados).

**Ancla:** el barreno `d = 12.1`, que es el rasgo más nítido y el único que se
identifica sin ambigüedad. Par simétrico medido en la columna x = 520:
**r = 95.5 px** → escala **0.063351 mm/px**.

Contraste con las otras cotas tabuladas:

| Cota | px medidos | mm con esa escala | Nominal | Error |
|---|---|---|---|---|
| `d` (barreno) | r = 95.5 | 12.10 | 12.1 | **0.0 %** |
| `F` (brida, radio de la silueta) | r = 381.8 | 48.37 | 48 | **0.8 %** |
| `D2` (línea de cota en x = 825) | r = 228.0 | 28.89 | 28 | 3.2 % |

Dos de tres dentro del 1 %. Además `D2 ≈ 28` identifica **de qué pieza es el
croquis**: la variante de la `SKPB4812-1.5` que lleva **6001ZZ** (`F 48 · D 45 ·
d 12.1 · D2 28`), no la de 6201. Lo confirma el saliente del aro interior que
asoma del cubo: **r = 136.8 px → Ø17.3**, y el aro interior de un 6001 mide
**Ø17.0** (`d1` de la ficha SKF).

**Largo:** la silueta da el cuerpo de la tapa entre **x = 514 y x = 710 px**:

```
196 px × 0.063351 = 12.42 mm
```

Contraste independiente, dentro del mismo catálogo: la tabla de la serie **SKP**
publica **H = 12** para `SKP5012-1.0` (F = 50), y la de **Pressed Bearing** da
**H = 12.0** para `SK1232A` y `SK1235A`. Un portarodamiento embutido de este porte
mide 12, no 24.

**Corrección aplicada al diseño:** el croquis es de la variante con **6001**
(aro de **8** de ancho). Nuestro rodamiento es un **6201**, de **10** de ancho, así
que el cubo crece 2 mm:

```
largo de la tapa = 12.42 + 2 = 14.5 mm     (4.5 fuera del tubo + 10 dentro)
```

> Antes de esta medición el modelo llevaba **24.5 mm supuestos**. Era el único dato
> del conjunto que no estaba ni medido ni citado, y estaba mal por casi el doble.

## Reproducir estas mediciones

```bash
# rasterizar
python3 - <<'PY'
import fitz
d = fitz.open('2D2.240.SHC.AFAW522.pdf')
d[0].get_pixmap(dpi=400).save('SHC_400.png')
PY

# anclas de escala
python3 tools/med_px.py perfil SHC_400.png --col 2000 --y0 800 --y1 1800
python3 tools/med_px.py perfil SHC_400.png --fila 1050 --x0 900 --x1 1900

# líneas de referencia de las cotas de largo
for Y in 1600 1700 1800; do python3 tools/med_px.py perfil SHC_400.png --fila $Y --x0 850 --x1 3400; done

# croquis Type 1 del catálogo de portarodamientos (p. 2 a 600 dpi, banda superior)
python3 tools/med_px.py perfil rod_p2_types.png --col 520 --y0 830 --y1 1690   # diámetros
python3 tools/med_px.py perfil rod_p2_types.png --col 825 --y0 830 --y1 1690   # línea de cota D2
python3 tools/med_px.py perfil rod_p2_types.png --fila 1010 --x0 400 --x1 1000 # extremos axiales
```
