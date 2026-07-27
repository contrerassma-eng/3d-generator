# NBT90 — Lectura de la VISTA DERECHA de `ref/fig8a_vistas.png` (FIGURE 8A)

Capa: **`measured-2D`** — cada número de este documento sale de un píxel medido con
`tools/med_px.py` sobre `cad/ensambles/nbt90/ref/fig8a_vistas.png` (2532×1170 px).
Donde hay inferencia, va marcada como tal y con `confianza`.
Datos numéricos en JSON: `vista_derecha.json`.

---

## 1. Escala — verificada, no modificada

| Patrón | Corte usado | px medidos | Valor | mm/px | px/pulgada |
|---|---|---|---|---|---|
| 1/4" (vista izq.) | `perfil --col 970/980/1010 --y0 300 --y1 400` → rachas centro **341.0** y **353.0** | **12.0** | 6.35 mm | 0.5292 | 48.00 |
| 0.394" (vista der.) | `perfil --col 2120/2130/2160/2170 --y0 290 --y1 380` → rachas centro **322.0** y **341.0** | **19.0** | 10.00 mm | 0.5263 | 48.26 |

Ambos patrones se reproducen idénticos en 4 columnas distintas cada uno.
**Escala adoptada: 0.5277 mm/px = 1.895 px/mm = 48.13 px/pulgada** (media de los dos).
Dispersión entre patrones: **0.55 %** → las dos vistas están efectivamente a la misma escala.

### Incertidumbre
- Lectura de un borde: **±1 px = ±0.53 mm** (las líneas tienen 2–3 px de grosor; se usa el centro de racha).
- Vano entre dos bordes: **±1.5 px ≈ ±0.8 mm**.
- Escala: **±0.3 %** (±0.9 mm sobre 300 mm).
- Regla práctica: cotas < 50 mm → **±0.8 mm**; cotas 50–400 mm → **±1.5 mm**.

---

## 2. Sistema de coordenadas del levantamiento

- **Origen X**: `x = 1315.5 px` = cara exterior de la placa lateral izquierda. X crece a la derecha.
- **Origen Z**: `y = 949.5 px` = línea inferior del conjunto. **Z crece hacia arriba** (`z_mm = (949.5 − y_px) · 0.5277`).
- Unidades del modelo: mm.

### Orientación de la vista — declarada, con reserva
Se adopta **elevación lateral (Z arriba, X = eje del rodillo motriz)** porque:
- Las dos vistas comparten los mismos datums horizontales: los pares de líneas fantasma
  `y = 361.0/365.5` y `y = 598.5/602.5` se dibujan **continuos a través de las dos vistas**
  (`perfil --fila 361 --x0 40 --x1 1100` → guiones desde x=100 hasta x=995;
  `--fila 361 --x0 1150` → guiones hasta x=2151).
- El motorreductor mide **Ø 229.5 px con centro en y = 632.75** en la vista derecha, y en la
  vista izquierda aparece como círculo con **centro en y ≈ 631** (`perfil --fila 632 --x0 350 --x1 760`
  → cruces en 409.5 y 651). Coincidencia de nivel dentro de 2 px.
- Las cotas 1/4" (izq.) y 0.394" (der.) comparten la línea **y = 341**.

**Reserva honesta:** dos rasgos son típicos de una **planta**, no de una elevación:
(a) el contorno inferior es un rectángulo de **esquinas muy redondeadas (r ≈ 70 px = 37 mm)** con
agujeros y una colisa obonda en su interior — firma de una **placa vista de cara**; y
(b) el "CYLINDER MOUNTING CHANNEL" aparece como rectángulo redondeado con borde uniforme de ~1/8".
Si la vista fuese planta, **las cotas verticales de este documento son profundidades, no alturas**,
y la cota 0.394 sería carrera de tensado horizontal en vez de carrera de pop-up (§5).
Los **valores medidos no cambian**; sólo cambia la etiqueta del eje.

---

## 3. Tabla de mediciones

`px` = coordenadas de la imagen original. `corte` = comando/racha exacta que dio el número.

### 3.1 Niveles horizontales maestros (barrido de filas, x ∈ [1150, 2260])

| y px | Rasgo | z mm | Corte |
|---|---|---|---|
| 322.5 | Línea **discontinua** superior (banda motriz / posición alta) | 330.9 | `fila 323` → guiones de 5 px, paso 12.5 px, de x=1431 a 2015 |
| 327.0 | Canto superior de las placas laterales | 328.5 | `col 1333 / 2029 / 2039 / 2048` → todas arrancan en 327 |
| 340.5 | **Cara superior del rodillo motriz** | 321.4 | `fila 340` → rachas (1375,1416) y (1422,2016) |
| 361.0 / 365.5 | Par de líneas fantasma (datum, cruza ambas vistas) | 310.6 / 308.2 | `fila 361`, `fila 365` |
| 371.0 | **Eje del rodillo motriz** | 305.3 | media de 339.5 y 402.5 |
| 402.5 | Cara inferior del rodillo motriz | 288.7 | `fila 402` → racha (1422,2016) |
| 509.0 | Larguero/canal superior | 232.5 | `fila 509` → racha (1433,2030) |
| 518.0 | Envolvente superior del motor | 227.7 | `col 1750 / 1870` → racha (517,519) |
| 598.5 / 602.5 | Segundo par de líneas fantasma (datum) | 185.2 / 183.1 | `fila 599`, `fila 602` |
| 632.75 | **Eje del motorreductor** | 167.1 | media de 518.0 y 747.5 |
| 747.5 | Envolvente inferior del motor | 106.6 | `col 1750 / 1870` → racha (747,748) |
| 750.5 / 760.5 | Par de largueros/base | 105.0 / 99.7 | `fila 750` (1433,2030), `fila 760` (1436,2030) |
| 949.5 | **Línea inferior del conjunto** | 0.0 | `fila 950` → racha única (1390,1965) |

### 3.2 Rodillo motriz (DRIVE ROLLER)

| Magnitud | px | mm | pulgadas | Fracción / catálogo probable | Corte | Conf. |
|---|---|---|---|---|---|---|
| Largo de cara | **594** | **313.5** | 12.341 | **12-3/8"** (12.375" = 314.3 mm) | `fila 340` y `fila 402`, racha (1422, 2016) | alta |
| Diámetro exterior | **63** | **33.2** | 1.309 | **1.315"** = OD de tubo 1" sch. (33.4 mm); alt. 1-1/4" + recubrimiento | `col 1500/1700/1900` → rachas (339-340) y (402-403) | alta |
| Ø del núcleo (sin banda), extremo izq. | 55 | 29.0 | 1.142 | ~1-1/8" | `col 1360` → rachas (343-344) y (398-399) | media |
| Altura del eje sobre la línea inferior | 578.5 | **305.3** | 12.02 | ≈ **12"** | 949.5 − 371.0 | alta |
| Altura del eje sobre el larguero y=509 | 138 | 72.8 | 2.87 | — | 509 − 371 | alta |
| Posición longitudinal (extremos del cuerpo) | x 1422 → 2016 | x 56.3 → 369.7 mm desde el origen | — | — | `fila 340` | alta |
| Radio de esquina del extremo derecho | ~12 | 6.3 | 0.25 | 1/4" | `col 2020 / 2028` | media |

**¿Rodillo de transportador o tambor?** Ninguno de los dos en sentido estricto: Ø 33.2 mm (1.31")
**no** corresponde a 1.9" (48.3 mm) ni a 2.5" (63.5 mm), que darían 91 px y 120 px respectivamente
— más del doble de lo medido. Es un **rodillo/eje de pequeño diámetro** (compatible con tubo de 1"
sch. 40, Ø 1.315") de **12-3/8" de cara**, típico de transferencias pop-up donde hay que mantener
el perfil bajo. Confianza alta en la medición, media en el "de catálogo".

### 3.3 Banda motriz (DRIVE BELT)

| Magnitud | px | mm | pulgadas | Corte | Conf. |
|---|---|---|---|---|---|
| Nivel del tramo superior (oculto) | y = 322.5 | z = 330.9 | — | `fila 323`: patrón de guiones 5 px on / 8 px off (paso 12.5 px) | alta |
| Longitud del tramo recto | 1375 → 2015 = **640** | **337.7** | 13.29 | `fila 323`, primer guión x=1431, último x=2015; tramo sólido 1375-1426 | alta |
| **Espesor de la banda** | **15.4** | **8.1** | 0.320 | **5/16"** → sección **A / 4L** (5/16" espesor × 1/2" ancho) | `col 1360` → arcos paralelos (327-328) y (343-344) | media |
| Envolvente en el extremo izq. (banda + polea) | 88 (y 327→415) | 46.4 | 1.83 | `col 1345` racha sólida (349,393) = tangente vertical del arco; `col 1360` (327-328)(413-414) | media |
| Distancia entre centros **motor ↔ rodillo** | **261.75** | **138.1** | 5.438 | **5-7/16"** | y 632.75 − 371.0 | alta |

**Ancho de la banda: NO ES LEGIBLE en esta vista.** La banda se ve de canto/oculta; su ancho
está en la dirección perpendicular al papel. La sección A/4L implicaría 1/2" (12.7 mm) — **inferencia**.

**Qué envuelve:** el tramo superior recorre toda la longitud del rodillo y **se curva hacia abajo en
los dos extremos** con el mismo radio pequeño (`col 2020`: rachas 328-329 y 344-345; `col 1345/1360`
en el otro extremo). Es decir, la banda pasa por poleas situadas **en los dos extremos**, por detrás
del rodillo (línea oculta). La polea motriz está en el eje del motorreductor (y = 618.5–632.75),
138 mm por debajo del eje del rodillo. Confianza media: **las poleas propiamente dichas quedan tapadas
por las placas laterales y no son medibles en esta vista.**

### 3.4 Motorreductor 1/2 HP 230/460 V

Cuerpo escalonado; divisiones verticales confirmadas en `fila 530/545/560/600/700/740`
(verticales estables en x = 1433.5, 1446.5, 1452.5, 1471.5, 1527, 1598.5, 1671.5, 1823.5, 1897.5, 1930.5).

| Bloque | x px | y px | Largo mm (pulg) | Alto mm (pulg) | Corte | Conf. |
|---|---|---|---|---|---|---|
| Brida / pernos de montaje | 1433.5–1471.5 | 550–701 | 20.1 (0.79") | 79.7 (3.14") | `fila 545/700`: (1433-1435)(1446-1447)(1449-1456)(1471-1472) | media |
| Reductor — bloque 1 | 1471.5–1527 | 550.5–701 | 29.3 (1.15") | **79.4 (3.13")** | `col 1480`: (550-551)(700-702) | alta |
| Reductor — bloque 2 | 1527–1598.5 | 527.5–701 | 37.7 (1.48") | **91.6 (3.61")** | `col 1560`: (527-528)(700-702) | alta |
| Reductor — bloque 3 | 1598.5–1671.5 | 539.5–726 | 38.5 (1.52") | **98.4 (3.87")** | `col 1630`: (539-540)(725-727) | alta |
| **Motor (cilindro)** | 1671.5–1897.5 | 518–747.5 | **119.3 (4.70")** | **121.1 (4.77")** | `col 1750/1870`: (517-519)(747-748) | alta |
| Campana cónica | 1897.5–1930.5 | 518→551 / 747.5→714 | 17.4 (0.69") | de 121.1 a ~86 mm | `col 1920`: (540-542)(724-726) | alta |
| **Eje de salida** | 1930.5–2030 | 607.5–629.5 | **52.5 (2.07")** saliente | **Ø 11.6 (0.457")** | `fila 607` y `fila 630` racha (1930,2030); `col 1935/1960` (607-608)(629-630) | alta |
| Chavetero (línea oculta) | 1962–1965 | y ≈ 612 | — | — | `fila 618` racha (1962,1965) | media |

Derivados:
- **Largo total del motorreductor** (brida → punta del eje): 1433.5 → 2030 = 596.5 px = **314.8 mm (12.39")**;
  sólo cuerpo (sin eje): 1433.5 → 1930.5 = **262.3 mm (10.33")**.
- **Eje del motor: y = 632.75** → z = 167.1 mm. **Eje de salida: y = 618.5** → z = 174.6 mm.
  **Están descentrados 14.25 px = 7.5 mm** → confirma reductor de ejes paralelos desplazados
  (no un motor de eje concéntrico).
- **Posición del eje de salida respecto al rodillo motriz:** Δz = 371.0 − 618.5 = 247.5 px = **130.6 mm (5.14")**
  por debajo; Δx = 2030 − 2016 = 14 px = **7.4 mm** hacia la derecha del extremo del rodillo.
- Pernos de la brida: dos, en y = 578 y y = 690 (`col 1450` rachas sólidas 567-590 y 679-702),
  separación **112 px = 59.1 mm (2.33")**, simétricos respecto al eje del motor (centro 634 ≈ 632.75). ✔

**Aviso de coherencia:** un motor de 1/2 HP NEMA 56C tiene ~6.5" (165 mm) de diámetro de carcasa.
Lo medido es **4.77" (121 mm)** — menor. Es coherente con un motor compacto tipo IEC 63/71 o con un
dibujo esquemático. **No se debe tomar 121 mm como dato de catálogo sin verificar contra la ficha real.**

### 3.5 Marco / bastidor

| Magnitud | px | mm | pulgadas | Fracción probable | Corte | Conf. |
|---|---|---|---|---|---|---|
| **Largo total** (caras exteriores placas laterales) | 1315.5 → 2048 = **732.5** | **386.5** | 15.218 | **15-1/4"** (387.4 mm) | barrido de columnas; `fila 460/700` | media |
| **Alto total** (canto sup. placas → línea inferior) | 327 → 949.5 = **622.5** | **328.5** | 12.933 | **13"** (330.2 mm) | `col 1333/2039`; `fila 950` | media |
| Alto total incluyendo la línea discontinua superior | 627 | 330.9 | 13.03 | 13" | y 322.5 → 949.5 | alta |
| Placa lateral izq. — líneas verticales | 1315.5 / 1324 / 1333 | paso 8.75 px | — | — | `fila 460`: (1323-1325)(1332-1334); `fila 700`: (1315-1316) | media |
| Placa lateral der. — líneas verticales | 2029.5 / 2039 / 2048 | paso 9.25 px | — | — | `fila 460`: (2025-2026)(2029-2030)(2038-2040)(2047-2049) | media |
| **Espesor de chapa (paso entre caras)** | **8.75–9.25** | **4.6–4.9** | 0.182–0.193 | **3/16" (4.76 mm)** | ídem | media |
| Alto de la placa izq. | 327 → 785 | 241.7 | 9.52 | 9-1/2" | `col 1333`: sólido (343,691), oculto (693,785) | media |
| Alto de la placa der. | 327 → 880 | 291.8 | 11.49 | 11-1/2" | `col 2039`: (343,880) | media |
| Larguero superior | y=509, x 1433→2030 | 315.0 largo | 12.40 | 12-3/8" | `fila 509` racha (1433,2030) | alta |
| Largueros inferiores | y=750.5 y 760.5, x 1433→2030 | separación **5.3 mm (0.21")** | — | ~3/16"–1/4" | `fila 750`, `fila 760` | alta |
| Línea inferior | y=949.5, x 1390→1965 | 303.4 largo | 11.94 | — | `fila 950` racha única | alta |
| Radio esquina inferior | ~70 | 37 | 1.45 | 1-1/2" | arco izq. (1318,890)→(1390,949): `fila 890/900/910/930`; arco der. (1965,949)→(2039,880): `col 2009 (930-932)`, `col 2030 (904-907)` | media |
| Placa de montaje del motor (vertical, extremo izq.) | x 1375→1416, y 339.5→~495 | 21.1 × 82 | 0.83" × 3.22" | — | `col 1375` (339,690); `col 1416` (339,691); `fila 340` racha (1375,1416) | media |

**CYLINDER MOUNTING CHANNEL (canal de montaje del cilindro)**

| Magnitud | px | mm | pulgadas | Corte | Conf. |
|---|---|---|---|---|---|
| Contorno exterior (rect. de esquinas redondeadas) | x 1497→1867, y 759.5→922.5 | **195.2 × 86.0** | **7.69" × 3.39"** | `col 1700`: (766-769)…(933-934); `fila 850/875/900`: (1830-1831)(1860-1862)(1867-1868) | media |
| Espesor aparente de pared | ~5.5 | 2.9 | 0.115 | ≈ **1/8"** | zoom `--roi 1420 740 1900 960 --escala 4` | media |
| Posición (esquina sup. izq.) respecto al origen | (1497, 759.5) | x = **95.8 mm**, z = **100.3 mm** | — | ídem | media |
| Rectángulo interior (¿cuerpo del cilindro?) | x 1530→1835, y 800→904 | **160.9 × 54.9** | 6.34" × 2.16" | `col 1700`: (801-802)(903-904); `fila 900` (1830-1831) | **baja** |

**ADJUSTMENT SLOT (orificio de ajuste) — dos candidatos, se reportan ambos**

| Candidato | px | mm | pulgadas | Corte | Conf. |
|---|---|---|---|---|---|
| **(A) Colisa obonda** — centro (1996, 847.5) | ancho 30.5, largo 61 | **16.1 × 32.2** | **0.634 × 1.268** → **5/8" × 1-1/4"** | `fila 820`: (1988-1993)(1999-2004) = arco sup.; `filas 830/845/860`: (1981-1982)(2010-2012) = flancos rectos; `fila 875`: (1985-1987)(2005-2007) = arco inf.; `fila 815` y `fila 880` vacías | **alta** (geometría) |
| **(B) Perno hexagonal + arandela** — centro (1541, 872) | hex 25 px entre caras, arandela Ø ~39 px | hex **13.2 mm** (0.52"), arandela **20.6 mm** | hex ≈ 1/2" entre caras → perno 5/16" | `fila 875`: (1521-1523)(1528-1529)(1549-1551)(1556-1557); zoom `--roi 1420 740 1900 960` | media |

La **directriz** del rótulo "ADJUSTMENT SLOT" termina con punta de flecha en **(1548, 897)** apuntando
arriba-izquierda hacia (B). La colisa (A) es geométricamente inequívoca (obonda de 5/8" × 1-1/4",
**carrera útil 5/8" = 15.9 mm**) pero está en el extremo opuesto de la vista. **Ambigüedad declarada.**

### 3.6 Cota "0.394 — MOVEMENT" (movimiento 0.394 = 10.0 mm)

| Dato | Valor | Corte |
|---|---|---|
| Líneas de referencia de la cota | y = 322.0 y y = 341.0, dibujadas de x = 2054 a x = 2174 | `fila 322` racha (2055,2174); `fila 341` racha (2054,2173) |
| Separación | **19.0 px = 10.0 mm = 0.394"** | `col 2120/2130/2160/2170` |
| Flechas | exteriores, apuntando hacia adentro, en y ≈ 294.5 (arriba) y y ≈ 369.5 (abajo) | `col 2140`: rachas (294.5) y (369.5) |
| **Rasgo superior referenciado** | **línea DISCONTINUA (oculta) en y = 322.5**, que recorre toda la longitud del rodillo (x 1375→2015) y se curva hacia abajo en ambos extremos | `fila 323` |
| **Rasgo inferior referenciado** | **cara superior del rodillo motriz, y = 340.5** (x 1422→2016) | `fila 340` |

**Está tomada entre la generatriz superior del rodillo motriz y una línea oculta paralela situada
10.0 mm por encima, del mismo largo y con los mismos extremos curvados.**

Interpretación (confianza **media**, ver §5): es el **desplazamiento vertical del conjunto pop-up**
— la posición alta del rodillo/banda dibujada en oculto sobre la posición baja en trazo lleno.
La cota complementaria de la vista izquierda, 1/4" (6.35 mm), se mide **desde esa misma línea y = 341
hacia abajo** hasta y = 353 (`fila 353` → 5 rachas de 52-53 px con paso 120.5 px = 63.6 mm = **2.504"**,
el paso de las bandas angostas). Es decir, ambas cotas cuelgan del mismo plano de referencia y = 341.

### 3.7 Conjunto neumático (abajo-izquierda)

| Elemento | px | mm | pulgadas | Corte | Conf. |
|---|---|---|---|---|---|
| Cuerpo completo con tuercas de unión | x 1189→1281, y 536→572 | **48.5 × 19.0** | 1.91" × 0.75" | `fila 550`: (1189-1193)(1195-1197)(1217-1220)(1249-1253)(1273-1274)(1277-1281) | alta |
| Cuerpo central (entre uniones) | x 1217→1253 | **19.0 × 19.0** | 0.75" × 0.75" | `fila 575/580`: (1217-1218)(1252-1253) | alta |
| Tuercas de unión (altura) | y 537→570 | 17.4 | 0.69" | `col 1190` y `col 1280`: racha sólida (537,570) | alta |
| Puerto/tornillo superior (círculos concéntricos) | centro (1235, 540), Ø ext ~11 px | Ø **5.8** | 0.23" | `col 1235`: (534-535)(537-538); `fila 536`: (1230-1232)(1237-1240) | media |
| Racor/vástago inferior | x 1217→1253, y 572→635 | 19.0 × 33.2 | 0.75" × 1.31" | `col 1235`: (568-572)(592-599)(603-608)(628-635) | media |
| **Tubo — diámetro exterior** | **15.0** | **7.9** | **0.312" → 5/16" (o 8 mm)** | `fila 700`: (1227-1228)(1242-1243) | alta |
| Tramo vertical del tubo | x 1227.5/1242.5, y ≈ 640 → 840 | largo ≈ 105.5 | 4.15" | `col 1227/1242` continuas | alta |
| Codo 90° y tramo horizontal | y 841/856, x ≈ 1250 → 1490 | largo ≈ 127 | 5.0" | `col 1340/1355/1370/1390/1450/1490`: (840-842)(855-857) | alta |
| Posición de montaje del cuerpo | centro (1235, 554) | **x = −42.5 mm** (a la izquierda del origen: fuera del bastidor), **z = 208.7 mm** | — | — | alta |

El cuerpo **sobresale del bastidor por la izquierda** (x = 1189 < 1315.5 = cara exterior de la placa).
Símbolo interno de triángulo y puerto superior con círculos concéntricos: compatible con
**regulador / válvula de control de caudal en línea**. No hay vaso ni manómetro dibujados.
Nomenclatura exacta: **no determinable** desde el trazo (confianza baja para el "qué es",
alta para el "cuánto mide").

### 3.8 Tornillería y patrón de perforación

| Elemento | Posición (px) | Separación | Tamaño medido | Nominal probable | Corte |
|---|---|---|---|---|---|
| Pernos placa lateral **izq.** (2) | y = 417 y y = 483; pasan de x ≈ 1316 a 1367 | **66 px = 34.8 mm (1.37" ≈ 1-3/8")** | entrecaras ≈ 21 px = **11.1 mm** | hex 7/16" AF → **perno 1/4"-20** | `f410–f430` y `f478–f490`: (1317-1318) + (1346-1347)(1355-1357)(1362-1365) |
| Pernos placa lateral **der.** (2) | y = 418 y y = 483; de x ≈ 2007 a 2055 | **65 px = 34.3 mm (1.35")** | entrecaras 20–23 px = **10.6–12.1 mm** | 7/16"–1/2" AF → **1/4"–5/16"** | `f424`: racha (2008,2022) = cabeza; `f408/f428`: (2047,2055) = tuerca |
| Pernos brida del motor (2) | y = 578 y y = 690 | **112 px = 59.1 mm (2.33")** | rachas sólidas de 24 px | — | `col 1450`: (567-590)(679-702) |
| Perno hex. en la base | centro (1541, 872) | — | entrecaras **13.2 mm**; arandela Ø 20.6 mm | perno 5/16" | `fila 875`: (1521-1523)(1528-1529)(1549-1551)(1556-1557) |
| Agujero pequeño 1 | centro (1919.5, 833.5) | — | **Ø ≈ 2.6 mm (0.10")** | 7/64"–1/8" | `col 1920`: (830-831)(836-837) |
| Agujero pequeño 2 | centro (1958, 848.5) | — | **Ø ≈ 2.1–3.7 mm** | 1/16"–1/8" | `col 1958`: (845-846)(851-852) |
| Colisa obonda | centro (1996, 847.5) | — | 16.1 × 32.2 mm | 5/8" × 1-1/4" | §3.5 |

**Patrón de perforación de las placas laterales:** dos pernos por placa, alineados verticalmente
en el mismo x, separados **1-3/8" (34.6 ± 0.8 mm)**, centrados en **z = 281.0 mm** y **z = 246.2 mm**.
No hay más taladros visibles en las placas dentro de esta vista.
Los tres agujeros de la zona inferior derecha (§3.5-A y los dos pequeños) forman un grupo
irregular, **no un patrón regular medible**.

---

## 4. Interpretación mecánica del accionamiento

Cadena cinemática tal como se lee de la vista (confianza **media-alta** salvo donde se indica):

1. **Motorreductor 1/2 HP 230/460 V**, montado **dentro** del bastidor, con el eje **paralelo al
   rodillo motriz** (ambos aparecen alargados en esta vista y circulares en la vista de extremo).
   Su eje está a **z = 167.1 mm** sobre la línea inferior; el eje de salida está **7.5 mm descentrado**
   respecto al eje del motor (reductor de ejes paralelos). El eje de salida (Ø 11.6 mm ≈ 1/2",
   2.07" de saliente, con chavetero) **atraviesa la placa lateral derecha** en x ≈ 2030, donde
   queda la polea motriz — **la polea no es visible ni medible en esta vista** (queda tapada por la
   placa; confianza **baja** en cualquier valor de diámetro de polea).

2. **Banda motriz (V, sección A/4L, espesor medido 8.1 mm)**: baja desde la polea del rodillo hasta
   la polea del reductor. **Distancia entre centros 138.1 mm (5-7/16")**. Su tramo superior se dibuja
   en línea oculta a z = 330.9 mm y **se curva hacia abajo en los dos extremos**, lo que indica poleas
   en ambos extremos por detrás del rodillo.

3. **Rodillo motriz Ø 33.2 mm × 313.5 mm de cara** (12-3/8"), eje a **z = 305.3 mm**, apoyado en las
   dos placas laterales. Es el elemento que arrastra las **bandas angostas**: el paso de éstas se lee
   en la vista izquierda, **2.504" = 63.6 mm** (`fila 353`, 5 rachas con paso 120.5 px), y su ranura de
   paso mide **10 px = 5.3 mm** (`fila 392` de la vista izquierda: 6 tramos separados por **5 huecos de 10 px**
   con el mismo paso de 120.5 px; huecos centrados en x = 255.5 / 375.5 / 496.5 / 616.5 / 737.5). Las bandas angostas corren perpendicularmente al eje del rodillo, sobre el larguero
   superior (z = 232.5 mm) y sobre el propio rodillo.

4. **Pop-up neumático**: en la parte baja, el **CYLINDER MOUNTING CHANNEL** (195 × 86 mm exterior,
   pared ~1/8") aloja el cilindro (rectángulo interior de 161 × 55 mm, confianza **baja**). El aire
   llega por el conjunto de la izquierda: cuerpo en línea de 48.5 × 19 mm con puerto superior,
   racor inferior y **tubo de 5/16" (7.9 mm)** que baja ~105 mm, gira 90° y corre ~127 mm hacia la
   derecha a z ≈ 53 mm hasta la zona del cilindro. Al presurizar, el conjunto sube y las bandas
   angostas pasan a la posición dibujada en oculto.

5. **Carrera**: la cota **0.394" = 10.0 mm** separa la generatriz superior del rodillo en trazo lleno
   de la línea oculta paralela. Se interpreta como **carrera vertical del pop-up (10 mm)**.
   La cota **1/4" (6.35 mm)** de la vista izquierda cuelga del mismo plano y = 341 hacia abajo, hasta
   el canto superior de los soportes de las bandas angostas — coherente con "banda 1/4" por debajo del
   plano de referencia en reposo, 0.394" de carrera hacia arriba".

6. **Ajuste de tensión**: la **colisa obonda de 5/8" × 1-1/4"** (carrera útil 5/8" = 15.9 mm) y los
   pernos de las placas laterales (2 por placa, a 1-3/8") permiten desplazar el conjunto motor/rodillo
   para tensar la banda motriz.

### Lectura alternativa (si la vista fuese planta)
Si la vista derecha es una **planta**, entonces: el eje "vertical" del papel es profundidad;
la cota 0.394" pasa a ser la **carrera de tensado horizontal del rodillo motriz** (y la línea oculta,
su segunda posición), lo que encaja mejor con el rótulo "ADJUSTMENT SLOT" en la misma vista y con el
contorno inferior de esquinas redondeadas (una **placa base vista de cara**). En ese caso
`z_mm` del JSON debe reinterpretarse como `y_mm` (profundidad). **Todas las magnitudes lineales
siguen siendo válidas.**

---

## 5. Lo que NO es legible en esta vista (declarado)

| Dato | Motivo |
|---|---|
| Ancho de la banda motriz | La banda se ve de canto/oculta; el ancho es perpendicular al papel. |
| Diámetro de las poleas (motriz y conducida) | Ambas quedan **tapadas por las placas laterales** (x < 1345 y x > 2029). |
| Número y ancho de las bandas angostas | Se leen en la vista izquierda (paso 2.504"), no aquí. |
| Diámetro y carrera del cilindro neumático | Sólo se ve el canal que lo aloja; el rectángulo interior (161 × 55 mm) podría ser el cilindro o una placa (confianza **baja**). |
| Tipo exacto del componente neumático | Cuerpo en línea con triángulo y puerto superior: regulador o control de caudal. Sin rótulo. |
| Espesor real de chapa | Se mide el **paso entre caras dibujadas** (4.6–4.9 mm → 3/16"); si el trazo es simbólico, el valor real puede ser 11–14 ga. |
| A qué apunta exactamente "ADJUSTMENT SLOT" | La flecha apunta a un perno hexagonal en (1541, 872), no a la colisa obonda de (1996, 847.5). Ver §3.5. |
| Longitud total real de la máquina | Esta vista mide 15.2"; la vista de extremo mide ~20" de ancho, así que **esta vista es parcial** (sólo el conjunto motriz). |

---

## 6. Contraste con el levantamiento de la vista izquierda

Comparación con `vista_izquierda.json` (mismo factor de escala 0.5277 mm/px, levantado por separado):

| Magnitud | Vista izquierda | Vista derecha (este doc.) | Δ | Lectura |
|---|---|---|---|---|
| Altura total del conjunto | 618 px = **326.1 mm** | 622.5 px = **328.5 mm** | 4.5 px = **2.4 mm (0.7 %)** | ✔ Consistente → **las dos vistas son elevaciones alineadas en altura** |
| Paso de las bandas angostas | 120.56 px = **63.62 mm** (2.505") | 120.5 px = **63.59 mm** (`fila 353` y `fila 392` de la vista izq.) | 0.06 px | ✔ Idéntico |
| BF entre almas del canal | 723 px = **381.5 mm** (15.02") | — (no visible en esta vista) | — | dirección perpendicular |
| Canal de bastidor | 264 px = **139.3 mm** (5.485" → canal de 5-1/2") | largueros y = 509 → 750.5: **241.5 px = 127.4 mm (5.02")** | 22.5 px | ⚠ distinta altura → **no son el mismo perfil**, o uno de los dos incluye alas |

Hallazgo adicional: **la separación entre los dos pares de líneas fantasma (y = 361.0 y y = 602.5) es
exactamente 241.5 px = 127.4 mm = 5.02"**, el mismo valor que la separación entre el larguero superior
(y = 509) y el inferior (y = 750.5). Es decir, el perfil dibujado en fantasma (equipo existente,
canal de ~5") y el larguero del transfer tienen **la misma altura de perfil**, desplazados 148 px
(78 mm) en vertical.

⚠ **Discrepancia declarada:** la vista izquierda sitúa el **plano de transporte en y = 347**, mientras
que en esta vista la generatriz superior del rodillo motriz está en **y = 340.5**, es decir **6.5 px
(3.4 mm) por encima** del plano de transporte. Si el rodillo estuviera bajo las bandas, debería quedar
por debajo. Posibles causas: (a) el elemento y = 339.5–402.5 no es el rodillo sino un travesaño/cubierta
del mismo diámetro aparente; (b) las dos vistas están dibujadas en estados distintos del pop-up.
**No resuelto con los píxeles disponibles.**

---

## 7. Trazabilidad

- Imagen: `cad/ensambles/nbt90/ref/fig8a_vistas.png`, SHA de referencia no calculado aquí.
- Herramienta: `tools/med_px.py` (subcomandos `perfil`, `circulos`, `rejilla`, `escala`).
- Todos los cortes citados son reproducibles literalmente, p. ej.:
  `python3 tools/med_px.py perfil cad/ensambles/nbt90/ref/fig8a_vistas.png --fila 340 --x0 1150 --x1 2260 --min 2`
- Ninguna cota de este documento proviene de estimación visual sin corte de píxeles asociado,
  salvo las marcadas con `confianza: baja` y los radios de esquina (marcados con `~`).
