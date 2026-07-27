# NBT90 — Lectura métrica de la VISTA IZQUIERDA de `FIGURE 8A`

Fuente: `cad/ensambles/nbt90/ref/fig8a_vistas.png` (2532 × 1170 px), región x ≈ 50…1010, y ≈ 300…965.
Herramienta: `tools/med_px.py` (`perfil`, `circulos`, `rejilla`). Todas las coordenadas están en
**píxeles de la imagen original**. Datos gemelos en `vista_izquierda.json`.

---

## 1. Escala — VERIFICADA, no modificada

| Cota del plano | Corte usado | Lectura | mm/px |
|---|---|---|---|
| `1/4"` = 6.35 mm (vista izq.) | columnas x = 975, 980, 985, 990, 995, 1000, 1005 → rachas centradas en **y = 341.0** y **y = 353.0** | **12.0 px** (idéntico en las 7 columnas) | 0.5292 |
| `0.394` = 10.0 mm (vista der.) | columnas x = 2130, 2135, 2140, 2145, 2150, 2155, 2160 → rachas centradas en **y = 322.0** y **y = 341.0** | **19.0 px** (idéntico en las 7 columnas) | 0.5263 |

**Escala adoptada: k = 0.5277 mm/px = 1.8949 px/mm = 48.13 px/pulgada.** Las dos cotas concuerdan
al 0.55 %; ambas vistas comparten la línea y = 341.0, luego están al mismo factor.

**Contraste independiente (confirma la escala):** la luz entre almas de los dos largueros mide
723.0 px → 381.5 mm → **15.022"**, es decir 15" nominal (medida "between frame" de catálogo).
El canal lateral mide 264 px de alto → **5.485"** → 5.5" nominal. Dos redondeos de catálogo
exactos obtenidos con la escala dada = escala correcta.

## 2. Sistema de referencia adoptado

- **X = 0** en el eje de simetría de la vista, **x = 522.6 px**. Verificado por 4 pares simétricos:
  poleas superiores (221.0 + 823.8)/2 = 522.4; poleas medias (281.8 + 763.8)/2 = 522.8;
  poleas inferiores (294.25 + 751.25)/2 = 522.75; jack bolts (131.25 + 914.5)/2 = 522.9.
- **Z = 0** en **y = 347.0 px**, borde superior de las barras macizas = punto más alto de la
  máquina = plano de transporte. Z positivo hacia arriba. `Z = (347.0 − y_px) · k`.

---

## 3. Marco y estructura

| Elemento | Medida en px | Corte exacto | mm | pulgadas | Redondeo de catálogo | Conf. |
|---|---|---|---|---|---|---|
| Alma larguero **izq.** (2 líneas) | centros 157.0 / 161.0 → esp. 4.0 | col 110 · col 180 · fila 400 · fila 608 | 2.11 | 0.083" | chapa 12–13 ga | alta |
| Alma larguero **der.** (2 líneas) | centros 884.0 / 888.5 → esp. 4.5 | fila 608 (883-885, 887-890) | 2.37 | 0.093" | chapa 12 ga | alta |
| **Luz entre almas (BF)** | 884.0 − 161.0 = **723.0** | filas 400, 608 | **381.5** | **15.02"** | **15"** | alta |
| Ala superior izq. (2 líneas) | y = 357.0 / 361.0; se extiende x = 100…159 | col 110, fila 358 | esp. 2.11 | 0.083" | — | alta |
| Ala superior der. (2 líneas) | y = 357.0 / 361.0; se extiende x = 886…946 | col 920, fila 358 (racha 886-946) | esp. 2.11 | 0.083" | — | alta |
| Ala inferior izq. (2 líneas) | y = 614.0 / 618.0 | col 110 | esp. 2.11 | 0.083" | — | alta |
| **Altura exterior del canal** | y 355.5 → 619.5 = **264.0** | col 110 | **139.3** | **5.485"** | **5.5"** | alta |
| Vuelo del ala (alma → punta) | 159 → 100 = **59.0** | fila 358 | 31.1 | 1.226" | 1-1/4" | media (¿corte de rotura?) |
| Ancho exterior alas | 100 → 946 = **846.0** | fila 358 + bbox banda y 330-365 | 446.4 | 17.58" | 15" + 2 × 1-1/4" | media |
| Línea horizontal larga (borde sup. barras) | y = 347.0 | fila 347 | Z = 0 | — | — | alta |
| Línea horizontal larga | y = 387.5 y y = 392.5 (banda de 5 px) | col 180, col 305; recorre todo el ancho | Z = −21.4 / −24.0 | — | — | alta |
| Línea horizontal larga | y = 424.5 | col 281, col 305 | Z = −40.9 | — | — | alta |
| Línea horizontal larga | y = 447.5 | col 210, col 305 (max. 679 px oscuros) | Z = −53.0 | — | — | alta |
| Líneas horizontales | y = 475.5 / 480.5 / 490.5 / 495.5 | col 180, col 860 (perno pasante) | — | — | — | alta |
| Línea horizontal larga | y = 510.0 y y = 523.5 | col 281, col 522 | Z = −86.0 / −93.1 | — | — | alta |
| Riel inferior (2 líneas) | y = 736.0 / 740.0 | col 400 | Z = −205.3 | — | — | alta |
| Traviesa de base (2 líneas) | y = 933.0 / 940.0 | col 400, col 522 (max. 731) | Z = −309.2 | — | — | alta |
| **Fondo del dibujo** (pies de los largueros) | y = 965 | bbox x 95…945 | Z = −326.1 | — | — | alta |
| **Altura total de la vista** | 347 → 965 = **618.0** | — | **326.1** | **12.84"** | ≈ 12-7/8" | alta |
| Plano de transporte sobre el ala del larguero | 355.5 − 347.0 = 8.5 | col 110 vs fila 347 | 4.49 | 0.177" | — | alta |

---

## 4. Poleas / sheaves

Todos los diámetros se dan **dos veces**: `Ø polea` = círculo interior (superficie donde apoya la
banda) y `Ø envolvente` = círculo exterior (superficie exterior de la banda). La diferencia radial
coincide con el grosor de banda medido en los tramos libres (≈ 4 px), lo que confirma la lectura.

### 4.1 Fila SUPERIOR — 6 poleas pequeñas, cy = 386.2 px (Z = −20.7 mm)

| id | cx px | X mm | Ø polea px | Ø polea mm | Ø polea " | Ø envolvente px / mm / " | Conf. |
|---|---|---|---|---|---|---|---|
| POL_SUP_1 | 221.0 | −159.15 | 55.25 | 29.16 | 1.148" | 62.5 / 32.98 / 1.299" | alta |
| POL_SUP_2 | 341.5 | −95.57 | 55.25 | 29.16 | 1.148" | 62.5 / 32.98 / 1.299" | alta |
| POL_SUP_3 | 462.0 | −31.98 | 55.25 | 29.16 | 1.148" | 62.5 / 32.98 / 1.299" | alta |
| POL_SUP_4 | 582.5 | +31.61 | 55.25 | 29.16 | 1.148" | 62.5 / 32.98 / 1.299" | alta |
| POL_SUP_5 | 703.0 | +95.20 | 55.25 | 29.16 | 1.148" | 62.5 / 32.98 / 1.299" | alta |
| POL_SUP_6 | 823.8 | +158.94 | 55.25 | 29.16 | 1.148" | 62.5 / 32.98 / 1.299" | alta |

Cortes: **fila 386** da, para POL_SUP_1, las rachas 187-191 / 193-195 (izq.) y 248-250 / 252-254
(der.) → Ø env. 64.0, Ø polea 55.0. **col 221** da 354-356 / 358-360 (arriba) y 414-415 / 417-418
(abajo) → Ø env. 62.5, Ø polea 55.5. Se adopta la lectura de columna (la de fila incluye los
ramales tangentes). Comprobación en x = 200 y x = 210: los 4 cruces caen a ±0.5 px del círculo
teórico r = 31.25 / 27.6 centrado en (221.3, 386.5). **Hexágono central:** 13.5 px entre caras
(fila 386: 214.5 / 228.0) = 7.12 mm = 0.281" (entre 1/4" y 5/16"; confianza media).

**PASO ENTRE EJES = (823.8 − 221.0)/5 = 120.56 px = 63.62 mm = 2.505" → 2.500" nominal.**
Pasos individuales medidos: 120.5, 120.5, 120.5, 120.5, 120.8 px (dispersión ±0.15 px).

### 4.2 Fila MEDIA — 4 poleas grandes, cy = 564.8 px (Z = −114.9 mm)

| id | cx px | X mm | Ø polea px / mm / " | Ø envolvente px / mm / " | Conf. |
|---|---|---|---|---|---|
| POL_MED_1 | 281.8 | −127.07 | 102.0 / 53.83 / 2.119" | 110.5 / 58.31 / 2.296" | alta |
| POL_MED_2 | 402.2 | −63.54 | 102.0 / 53.83 / 2.119" | 110.5 / 58.31 / 2.296" | alta |
| POL_MED_3 | 522.6 | 0.00 | **posición VACANTE** | — | alta |
| POL_MED_4 (**TAKE-UP IDLER**) | 643.2 | +63.64 | 102.0 / 53.83 / 2.119" | 110.5 / 58.31 / 2.296" | media |
| POL_MED_5 | 763.8 | +127.28 | 102.0 / 53.83 / 2.119" | 110.5 / 58.31 / 2.296" | alta |

Cortes: **fila 565** → POL_MED_1: 226.5 / 230.5 (izq.) y 332.5 / 337.0 (der.); hexágono 270.5 /
293.0. **col 281** → 615.5 / 620.0 (abajo) y 509.5 (arriba, ext.). Verificado además en y = 595 y
y = 610 (semianchos 46.0 y 31.75 px, coherentes con r = 55.25). **Hexágono:** 22.5 px entre caras
(fila 565) = **11.87 mm = 0.467"** → eje hexagonal de **7/16"** (0.4375") o 1/2"; el hexágono está
dibujado con vértices arriba/abajo (col 281: 552.0 / 577.5 = 25.5 px entre vértices; 25.5·0.866 =
22.1 ✓).
**POL_MED_3 no existe:** la `fila 565` recorrida de x = 440 a 600 sólo devuelve 443-445, 453-454,
457-458 (borde de POL_MED_2), 475-476, 479-480 y 566-567, 570 (ramales de banda) y 588-589,
592-593 (borde de POL_MED_4). El hueco central lo ocupa el conjunto motriz (§4.4).
Paso entre ejes medios: 402.2 − 281.8 = 120.4 px; 763.8 − 643.2 = 120.6 px → **mismo paso 2.5"**.
La retícula media está **desfasada medio paso (60.3 px = 31.8 mm)** respecto de la superior.

### 4.3 Fila INFERIOR — 2 poleas grandes, cy = 685.5 px (Z = −178.6 mm)

| id | cx px | X mm | Ø polea px / mm / " | Ø envolvente px / mm / " | Conf. |
|---|---|---|---|---|---|
| POL_INF_1 | 294.25 | −120.50 | 102.0 / 53.83 / 2.119" | 110.25 / 58.18 / 2.291" | alta |
| POL_INF_2 | 751.25 | +120.66 | 102.0 / 53.83 / 2.119" | 110.0 / 58.05 / 2.285" | alta |

Cortes: **fila 686** → POL_INF_1: 237.5 (izq., fundido con la banda), hexágono 283.0 / 305.5,
349.5 (der.). POL_INF_2: hexágono 740.0 / 762.5, borde derecho 806.0 / 809.5.
**col 295** → 630.5 (arriba) y 736.5 / 740.5 (abajo). **col 751** → 630.5 y 736.5 / 740.5.
Separación entre las dos: 457.0 px = **241.2 mm = 9.50"**. NO caen sobre la retícula de 2.5".

### 4.4 Conjunto motriz central

| id | cx / cy px | X / Z mm | Ø px | Ø mm | Ø " | Corte | Conf. |
|---|---|---|---|---|---|---|---|
| POL_MOTRIZ (polea de banda) | 522.75 / 650.25 | +0.08 / −160.03 | 100.2 | 52.88 | 2.082" | fila 650: 468.5 / 472.5 y 572.5 / 577.0 · col 522: 600.0, 700.5, 704.5 | alta |
| POL_MOTRIZ envolvente banda | — | — | 108.5 | 57.26 | 2.255" | col 522 (600.0 → 704.5) | alta |
| **DISCO_MOTRIZ** (tambor coaxial) | 522.75 / 650.5 | +0.08 / −160.16 | **228.5** | **120.58** | **4.748"** | fila 650: 408.5 y 637.0 · col 522: 533.5 y 764.5 | alta |

Verificación cruzada del disco: en fila 685 sus bordes caen en 414.0 y 631.5; el círculo teórico
r = 114.25 centrado en (522.75, 650.5) predice 411.5 / 634.0 (±2.5 px, línea gruesa). En fila 740
la traza horizontal larga se interrumpe justo entre x = 455 y x = 590, que es donde el disco la
tapa (predicción 451.8 / 593.8) ✓.
El disco es **concéntrico** con POL_MOTRIZ y está dibujado con una sola línea (sin banda alrededor
en esta vista): es la polea grande accionada por la `DRIVE BELT` del motorreductor, que se ve en
la vista derecha. Redondeo de catálogo plausible: **4-3/4"**.

---

## 5. Bandas

| Concepto | Medida | Corte | mm | " |
|---|---|---|---|---|
| **Grosor de la banda** (línea doble) | 4.0 px entre centros | filas 490 (205.5/209.5 · 235.5/240.0), 520 (210.5/214.5 · 232.0/236.0), 550, 565 | 2.11 | 0.083" |
| Grosor corregido por inclinación (9.8° respecto a la vertical) | 3.94 px | trayectoria de x = 189 (y = 386) a x = 219.5 (y = 580) | 2.08 | 0.082" |
| Grosor deducido del radial polea↔envolvente (superiores) | (62.5 − 55.25)/2 = 3.63 px | col 221 | 1.92 | 0.076" |
| Grosor deducido del radial (grandes) | (110.5 − 102.0)/2 = 4.25 px | fila 565 | 2.24 | 0.088" |
| **Nº de ramales libres** entre fila superior y fila media | 12 (2 por polea superior) | filas 470–550, x = 150…900 | — | — |

**Trayectoria trazada ramal a ramal** (una sola banda en serpentín; ver §9):

| Tramo | Evolución medida (x del par de líneas, por filas) |
|---|---|
| POL_SUP_1 → POL_MED_1 (ramal derecho) | y 386: 249/253 · 490: 235.5/240.0 · 520: 232/236 · 550: 228/232.5 · 565: tangente a 226.5 (borde de POL_MED_1) |
| POL_SUP_1 → POL_INF_1 (ramal izquierdo) | y 386: 189/194 · 490: 205.5/209.5 · 565: 217.5/221.5 · 610: 224.5/228.5 · 655: 231.5/235.5 · 690: 238.5 (tangente a POL_INF_1) |
| POL_MED_1 → POL_SUP_2 | y 565: 347/351.5 → 520: 327.5/331.5 → 490: 323.5/327.5 → 420: 314.5/318.5 |
| Retorno inferior POL_INF_1 → POL_INF_2 | banda horizontal continua en **fila 740**, rachas 279-455 y 590-766 (cortada sólo por DISCO_MOTRIZ) |

---

## 6. Barras macizas superiores e inferiores (5 + 5)

Dos hileras de 5 rectángulos rellenos de negro, **al mismo paso 2.5"** que las poleas medias y
**exactamente alineados con ellas en x**.

| Hilera | y px | Alto px / mm | Ancho px / mm / " | cx px (fila 347 / 444) | Corte |
|---|---|---|---|---|---|
| Superior | 347…357 | 10.0 / 5.28 | 42.0 arriba, 52.0 abajo / 22.2 y 27.4 / 0.873" y 1.080" | 281.5 · 402.5 · 522.5 · 643.5 · 763.5 | fila 347 (261-302, 382-423, 502-543, 623-664, 743-784) y fila 352 (256-308, 376-428, 497-549, 617-669, 738-790) |
| Inferior | 439…448 | 9.0 / 4.75 | 42.0 / 22.2 / 0.873" | 282 · 402 · 523 · 643 · 764 | fila 444 (261-303, 381-423, 502-544, 622-664, 743-785) |

Separación vertical entre hileras: 439 − 347 = 92 px = **48.5 mm = 1.913"** (≈ 1-15/16").
Entre las dos barras de cada estación hay una caja hueca de 52 px de ancho (paredes de 2–3 px):
`col 265` → 347-357, 367-388, 392-393, 423-425, 439-448; `col 305` → 350-356, 367-369, 386-388,
392-393, 424-426, 447-448.

---

## 7. Tensor (TAKE-UP IDLER)

La flecha rotulada `TAKE-UP IDLER (RODILLO TENSOR)` termina en ≈ (658, 508) px, es decir sobre el
cuadrante superior derecho de **POL_MED_4** (cx = 643.2, cy ≈ 564).

| Concepto | Medida px | Corte | mm | " |
|---|---|---|---|---|
| Ranura vertical, ancho exterior | 633 … 653 = 20.0 | fila 640 (634-640, 650-652) y fila 620 (633-653) | 10.55 | 0.416" |
| Ranura, ancho entre centros de pared | 637.0 → 651.0 = 14.0 | fila 640 | 7.39 | 0.291" |
| Ranura, largo total (extremos redondeados) | y 565 … 662 = 97.0 | col 636 (557-653), col 640 (573-689) | 51.19 | 2.017" |
| **Carrera útil del tensor** (largo − ancho) | 77.0 | derivado | **40.6** | **1.60"** | 
| cy real de POL_MED_4 | 563.9 ± 1.5 | col 665 (512.0 y 615.5), col 680 (570.0/575.0 y 600.0/606.0) | — | — |

Confianza **media**: la ranura está parcialmente solapada por el círculo de la polea y por el arco
del DISCO_MOTRIZ; los extremos redondeados se leen a ±2 px.

---

## 8. JACK BOLTS y tornillería visible

| id | Eje x px | Y px | Ø vástago px / mm / " | Tuerca entre caras px / mm / " | Corte | Conf. |
|---|---|---|---|---|---|---|
| JACK_BOLT_SUP_DER | 914.5 | 604…655 | 13.5 / 7.12 / 0.280" | 22.5 / 11.87 / 0.467" | fila 608 y 632: contorno 901.5 / 927.5, líneas internas 908.0 / 921.5; col 910: 604.5, 614, 618, 623.5, 627.5, 637, 643.5 | alta |
| JACK_BOLT_SUP_IZQ | 131.25 | 604…655 | 13.0 / 6.86 / 0.270" | 23.0 / 12.14 / 0.478" | fila 630: contorno 118.0 / 144.5, líneas internas 124.5 / 137.5 | alta |
| JACK_BOLT_INF_DER | 912.0 | 786…917 | 15.0 / 7.92 / 0.312" | ≈ 22 / 11.6 / 0.46" | fila 812 y 820: vástago entre 904.5 y 919.5 (**la punta de la flecha `JACK BOLTS` está en x ≈ 931, y = 820, apuntando a este vástago**) | alta |
| JACK_BOLT_INF_IZQ | — | — | — | — | zona x 100…230, y 780…920 | **NO MEDIBLE** — el bloque de válvulas neumáticas la tapa |

Geometría del tornillo de gato inferior derecho (`col 910`): tuerca 786…801, **ménsula (ala) en
y ≈ 801–811**, tuerca 805…822, vástago libre 822…840, tuerca 840…856, **segunda ménsula en
y ≈ 855–870**, y por debajo un perno con cabeza hasta y ≈ 917. Separación entre las dos ménsulas:
**56 px = 29.6 mm = 1.16"**. Los dos jack bolts superiores atraviesan una sola ménsula (y = 614 /
618) con tuerca por encima y por debajo.
El contorno de la tuerca (26 px) y sus dos líneas internas (13 px, exactamente la mitad) confirman
un hexágono visto **entre vértices**; entre caras = 26 · 0.866 = 22.5 px. Catálogo plausible:
tuerca de **1/2" entre caras → perno 5/16"**.

Los cuatro jack bolts son **simétricos respecto a x = 522.6**: (131.25 + 914.5)/2 = 522.9.

| Otra tornillería | Eje px | Ø vástago px / mm | Ø cabeza-arandela px / mm | Corte | Conf. |
|---|---|---|---|---|---|
| Perno horizontal larguero IZQ | (180, 485.5) | 10.0 / 5.28 (0.208") | 20.0 / 10.55 | col 180: 475.5, 480.5, 490.5, 495.5 | alta |
| Perno horizontal larguero DER | (860, 485.5) | 10.0 / 5.28 (0.208") | 20.0 / 10.55 | col 860: 475.5, 480.5, 490.5, 495.5 | alta |
| Perno riel inferior IZQ | (274, 765) | 13.0 / 6.86 (0.270") | tuerca 243…262, cabeza 286…322 | fila 765 | media |
| Perno riel inferior DER | (771, 765) | 13.0 / 6.86 (0.270") | 724…759 y 784…802 | fila 765 | media |
| Perno/pasador vertical izq. | (170.5, 386…770) | 2 px (línea) | — | filas 400–740 (racha constante 170-171) | baja |

---

## 9. La cota de 1/4" — qué mide exactamente

**Hecho medido, no interpretado:**
- La línea de referencia SUPERIOR está en **y = 341.0** y es la racha `830 … 1018` de la `fila 341`.
  Nace en x = 830 (sobre el larguero derecho) y **no toca ninguna geometría dibujada**.
- La línea de referencia INFERIOR está en **y = 353.0** y es la racha `956 … 1018` de la `fila 353`.
  Las otras rachas de esa fila (617-669, 738-790) son el interior negro de las barras macizas.
- Las dos puntas de flecha están en x ≈ 990 (col 990: rachas 309-322 y 373-386), apuntando hacia
  dentro. Distancia entre líneas: **12.0 px = 6.35 mm = 1/4"**.
- El borde superior de las barras macizas (y = 347.0) queda **exactamente a mitad** entre ambas
  (341 + 6 y 353 − 6). El ala superior del larguero está en y = 355.5, es decir 14.5 px = 7.7 mm
  por debajo de la línea superior.

**Interpretación (confianza media):** es la **carrera del pop-up**, no una cota de pieza: la línea
y = 341 es la posición ELEVADA y la y = 353 la posición BAJADA del plano de banda, dibujándose la
máquina en la posición nominal intermedia (y = 347). Refuerza esta lectura que la vista derecha
acota `0.394—MOVEMENT (MOVIMIENTO 0.394)` = 10.0 mm **desde la misma línea y = 341** hacia arriba
(y = 322): son dos recorridos distintos referidos a la misma cota de origen — muy probablemente
**6.35 mm de subida de la banda** frente a **10 mm de movimiento del actuador**, lo que implica
una palanca desmultiplicadora (la pieza 2 del despiece isométrico es precisamente un brazo).
**No es** el sobresalir de la banda sobre el larguero: ese valor está medido y vale 8.5 px = 4.49 mm.

---

## 10. Incertidumbres

- Lectura de cada borde: ±0.5 px → **cada longitud ±1 px = ±0.53 mm**.
- Escala: las dos cotas dan 0.5292 y 0.5263 mm/px → **±0.3 %**. Sobre la mayor dimensión medida
  (846 px) eso son ±1.3 mm; sobre el paso de bandas (120.6 px), ±0.19 mm.
- Diámetros de polea: ±1 px = ±0.53 mm (±0.02").
- Centros de polea: ±0.5 px = ±0.26 mm.
- Paso entre bandas: dispersión real medida ±0.15 px → **63.62 ± 0.28 mm** (incluida la escala).
- Ranura del tensor y pernos del riel inferior: ±2 px = ±1.1 mm (rasgos solapados).

## 11. Lo que NO se pudo medir (declarado, no rellenado)

1. **Jack bolt inferior izquierdo:** tapado por el bloque de válvulas neumáticas (x 100…230,
   y 780…920). No se le asigna posición.
2. **Diámetro real del eje** de cualquier polea: sólo se ve el hexágono central; no hay línea de eje
   cilíndrico. Lo medido (22.5 px entre caras en las grandes, 13.5 px en las pequeñas) es el
   hexágono, no un diámetro.
3. **Rodamientos / chumaceras:** no hay ninguno dibujado con su contorno reconocible en esta vista;
   los conjuntos entre poleas (§6) son cajas cerradas sin detalle interno legible.
4. **Espesor real de la envolvente de banda en las poleas grandes** frente a las pequeñas: difieren
   0.6 px (4.25 vs 3.63), dentro del error de trazo. Se toma un único grosor de banda de 4 px.
5. **cy exacto de POL_MED_4 (tensor):** ±1.5 px por solape con la ménsula ranurada.
6. **Vuelo del ala del larguero (59 px):** ambas alas terminan simétricamente en x = 100 y x = 946,
   lo que puede ser una **rotura de dibujo** y no el ancho real del ala. Confianza media.
7. **Anchura de las barras macizas en la dirección perpendicular al papel:** imposible desde una
   sola vista.

---

## 12. Interpretación mecánica

Se trata de la **vista de extremo del módulo motriz de un transfer de bandas angostas tipo pop-up**.
Todos los ejes de giro son perpendicular al papel, de modo que las bandas se ven **de perfil**
(bandas dobles de 4 px = 2.1 mm de grosor) y las poleas como círculos verdaderos. La lectura de la
cinemática es directa y está respaldada por el trazado ramal a ramal de §5:

**Existe un único ramal de transmisión en serpentín.** Partiendo de la polea inferior izquierda
POL_INF_1 (294, 686) la banda sube, pasa **por encima** de la polea pequeña POL_SUP_1 (221, 386),
baja y envuelve **por debajo** la polea grande POL_MED_1 (282, 565); vuelve a subir a POL_SUP_2
(342, 386), baja a POL_MED_2 (402, 565), sube a POL_SUP_3 (462, 386), baja al **conjunto motriz
central** POL_MOTRIZ (523, 650), sube a POL_SUP_4 (583, 386), baja a POL_MED_4 (643, 565), sube a
POL_SUP_5 (703, 386), baja a POL_MED_5 (764, 565), sube a POL_SUP_6 (824, 386) y baja a
POL_INF_2 (751, 686), desde donde el ramal de retorno cruza horizontalmente la máquina por
y ≈ 738 (racha continua 279…766 de la `fila 740`, interrumpida sólo donde la tapa el DISCO_MOTRIZ)
y cierra el circuito. Este trenzado impone una alternancia perfecta poleas pequeñas arriba /
poleas grandes abajo, con **retículas desfasadas medio paso (60.3 px = 31.8 mm)** — que es
exactamente lo medido.

**Qué acciona qué.** El DISCO_MOTRIZ (Ø 120.6 mm = 4.75") es coaxial con POL_MOTRIZ y no lleva
banda dibujada en esta vista: lo mueve la `DRIVE BELT` del motorreductor de 1/2 HP que aparece en
la vista derecha. Por tanto **un solo motor** arrastra, a través del serpentín, las **5 poleas
grandes de trabajo** (las 4 de la fila media más la central), todas de Ø 53.8 mm = 2.12". Las 6
poleas pequeñas de Ø 29.2 mm = 1.15" son **desviadoras**: no transmiten par útil, sólo fuerzan el
abrazamiento (≈ 180°) sobre cada polea grande, que es lo que permite mover cinco salidas con una
sola correa. Las dos poleas inferiores (294 y 751, separadas 241.2 mm) cierran el bucle y dan
retorno.

**Cómo se tensa.** POL_MED_4 (x = 643) es el `TAKE-UP IDLER`: va montada sobre una **ménsula con
ranura vertical** de 10.6 mm de ancho y 51.2 mm de largo, con una carrera útil de **40.6 mm =
1.60"** hacia abajo desde el centro nominal. Al bajar esa polea se alarga el recorrido del ramal y
se tensa todo el serpentín de una sola vez. Es la única de las cinco grandes que no está fijada
rígidamente, y por eso su cota vertical es la de menor confianza del levantamiento.

**Qué sube y qué queda fijo.** El **larguero-canal de 5.5" × 1-1/4"** (almas en x = 159 y x = 886,
luz entre almas 381.5 mm = 15") es la estructura FIJA del transportador: sus alas superiores están
en y = 357/361 y las inferiores en y = 614/618. Todo el tren de poleas, el riel inferior (y = 738),
las barras macizas y la traviesa de base (y = 933/940) forman el **bastidor MÓVIL**, que cuelga del
larguero fijo a través de los cuatro **JACK BOLTS** (vástago Ø 7.1–7.9 mm ≈ 5/16", tuerca de 11.9 mm
entre caras ≈ 1/2"), situados simétricamente en x = 131 y x = 914 (dos arriba, a y ≈ 623, y dos
abajo, a y ≈ 833). Cada jack bolt atraviesa una ménsula con tuerca por encima y por debajo: aflojando
una y apretando la otra se sube o se baja ese punto del bastidor móvil, es decir, **los jack bolts
calibran la altura y el paralelismo del plano de banda**, y son el ajuste que fija el 1/4" de la
cota. El movimiento de subida/bajada propiamente dicho lo produce el cilindro neumático (canal de
montaje en la vista derecha; en esta vista se ven la conexión giratoria de aire en x ≈ 69, y ≈ 564,
el tubo que baja por x ≈ 66 y el bloque de válvulas en x 130…230, y 780…925).

**Sobre las 10 barras macizas** (5 arriba en y = 347…357, 5 abajo en y = 439…448, ambas a paso
63.6 mm y alineadas en x con las 5 poleas grandes de trabajo): la medida es firme pero la
identificación **no** (confianza baja). Las dos hipótesis compatibles con lo medido son
(a) las **5 bandas angostas** vistas en sección — apoya que sean 5, que estén exactamente sobre
las 5 poleas de trabajo, que midan 27.4 mm ≈ 1-1/16" de ancho, y que haya un ramal superior
(portante) y otro inferior (retorno) separados 48.5 mm; y (b) los **travesaños/pletinas del
bastidor** vistos de canto — apoya que la pieza 11 del despiece isométrico sea justamente un juego
de pletinas planas con un agujero en cada extremo. Para el modelo 3D conviene dejar este elemento
parametrizado hasta cotejarlo con la vista derecha o con el despiece.
