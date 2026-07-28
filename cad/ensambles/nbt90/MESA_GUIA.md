# Mesa guía neumática — de pieza inventada a pieza comprable

La transferencia levanta el conjunto de rodillos con un actuador. Hasta ahora ese
actuador era una **invención**: `elevacion.mjs` lo declaraba «923.01022 · tipo SMC
MGF100», con una huella de 170 × 200 mm, 106 mm de alto, dos columnas guía Ø30 y
dos tirantes de tope M12 caseros para recortar su carrera de 20 a los 10 mm que
pide el equipo. Las cotas salían de medir el dibujo del manual, no de un catálogo:
nadie podía comprar esa pieza.

Este documento sustituye esa invención por un actuador **real, con referencia,
precio y fotografía**, y deja escrito de dónde sale cada número.

---

## 1. Qué se buscó y qué se encontró

Búsqueda en AliExpress (28-07-2026) de cilindros compactos con guías, familia MGP
— que es exactamente la arquitectura que el manual dibuja: émbolo central y **dos**
varillas guía paralelas, placa móvil arriba, cuerpo fijo abajo.

| Ficha | Vendedor | Referencia | Desde |
|---|---|---|---|
| [3256808952498802](https://www.aliexpress.com/item/3256808952498802.html) | YIYUN | «MGPM40 MGPM50 MGPM63 MGPM80 MGPM100-10-20-25-30-40-50-75-100-125-150-150A YIYUN Cylinder with guide rod» | US$ 153.07 |
| [3256806658078453](https://www.aliexpress.com/item/3256806658078453.html) | — | «MGPM12 … MGPM80 Stroke 10 to 300mm Air Pneumatic Compact Guide» | US$ 19.49 (Ø pequeños) |
| [3256812410259200](https://www.aliexpress.com/item/3256812410259200.html) | — | «MGPM MGPM50 MGPM63 MGPM80*10/20/25/30/…-Z MGP Aluminum Alloy Pneumatic Cylinder» | US$ 46.48 |

Los tres listados declaran **Ø80 con carrera de 10 mm**, que no es carrera estándar
SMC (la tabla SMC para Ø80 empieza en 25) pero sí la fabrican los clones. Eso
importa: con carrera de catálogo igual a la carrera del equipo, **los dos tirantes
de tope caseros sobran** — el propio cilindro da los 10 mm y sus topes de goma de
serie absorben el impacto en ambos extremos.

Fotografías del producto real en `ref/mesa/`:

- `aliexpress_mgpm_foto.jpg` — dos unidades MGPM40-25Z etiquetadas «MAX.PRESS: 1.0MPa».
- `aliexpress_mgp_codigo.jpg` — la tabla «How to Order» del vendedor: `MGP` + `M/L/A`
  (tipo de casquillo) + calibre + carrera + `Z` + auto-switch. Confirma que el
  vendedor usa la nomenclatura SMC sin desviarse.
- `vpc_mgp_foto.jpg` — un MGP 50X75 de otro fabricante, útil para ver las varillas
  guía saliendo por la cara inferior del cuerpo.

Una foto de catálogo de tienda está en perspectiva y **no sirve para sacar cotas
absolutas**; sirve para comprobar la arquitectura (placa con dos avellanados de
varilla + agujero central de vástago + cuatro roscas de esquina, ranuras en T en
los costados, dos puertos en una cara). Las cotas salen del dibujo acotado, y ese
dibujo sí se mide por píxeles.

---

## 2. El método de píxeles, contra verdad conocida

`ref/mesa/smc_mgp80_100_cotas.png` es la página Ø80/Ø100 del catálogo SMC MGP
rasterizada a 220 dpi. Tiene dibujo **y** tabla de cotas: es el caso ideal para
medir el dibujo a ciegas y después comprobar contra los números impresos, que es
la única forma honesta de saber cuánto vale el método.

Procedimiento (`tools/med_px.py`, las mismas órdenes que en `ESCALA.md`):

1. `circulos` sobre la vista de la placa → centros de las cuatro roscas NN y de las
   dos varillas guía.
2. `perfil --fila/--col` → cada racha oscura es una línea del dibujo; los bordes de
   placa y cuerpo salen como pares simétricos respecto del eje.
3. **Un solo anclaje**: el paso corto de las roscas de la placa, `Q = 52 mm`,
   medido en 100.0 px → **k = 0.5200 mm/px**.
4. Todo lo demás se predice con esa k y se contrasta con la tabla impresa.

| Cota | px medidos | mm por píxeles | mm de catálogo | error |
|---|---:|---:|---:|---:|
| Q — paso corto roscas placa | 100.0 | 52.0 | 52 | *ancla* |
| R — paso largo roscas placa | 334.0 | 173.7 | 174 | −0.2 % |
| S — ancho de la placa | 144.5 | 75.1 | 75 | +0.2 % |
| T — largo de la placa | 382.0 | 198.6 | 198 | +0.3 % |
| H — largo del cuerpo | 390.0 | 202.8 | 202 | +0.4 % |
| DB — Ø casquillo de guía | 58.0 | 30.2 | 30 | +0.5 % |
| U — paso entre varillas guía | 302.0 | 157.0 | 156 | +0.7 % |
| X — paso casquillos ø6 H7 | 194.0 | 100.9 | 100 | +0.9 % |

![medición sobre el dibujo de catálogo](ref/mesa/medicion_catalogo.png)

Siete cotas independientes predichas desde un único anclaje, **error máximo 0.9 %
y medio 0.4 %**. Ese es el margen real del método sobre un dibujo de líneas a 220
dpi, y es el mismo margen que hay que suponerle a las cotas que en el resto del
ensamble sólo se pudieron medir (las de `ESCALA.md`).

Con el método validado, las cotas que entran al modelo se toman **de la tabla
impresa**, no de los píxeles: cuando existe el número exacto, usarlo es mejor que
volver a medirlo.

### Y sobre la foto de la tienda, ¿qué se puede medir?

Menos de lo que parece, y conviene decirlo. `aliexpress_mgpm_foto.jpg` es una foto
en perspectiva de dos MGPM40-25Z. Una foto así **no da cotas absolutas**: no hay
escala, y la placa se ve escorzada.

Lo que sí sobrevive a la perspectiva es la **razón entre distancias medidas sobre
una misma recta**, porque proyectar los puntos de una recta sobre el eje X de la
imagen es una transformación afín de esa recta. Sobre el eje largo de la placa hay
cuatro puntos alineados: los dos extremos y los dos centros de varilla. Detectados
por umbral sobre la cara superior (`x` = 32.5, 83.7, 333.7, 388.0 px):

- el agujero central del vástago sale en x = 208.4 px y el punto medio entre
  varillas en 208.7 px — **0.1 % de diferencia**: la foto confirma que el émbolo va
  exactamente centrado entre las guías;
![medición sobre la foto de tienda](ref/mesa/medicion_foto.png)

- razón paso-de-varillas / largo-de-placa: **U/T = 0.703** medido, contra
  **86/118 = 0.729** de catálogo para el Ø40 → **−3.5 %**. La razón proyectiva
  (invariante exacto) da 0.7033, igual que la razón simple: la distorsión a lo
  largo de ese eje es despreciable, y el 3.5 % se lo llevan los extremos de la
  placa, achaflanados y a distinta profundidad que los centros de varilla.

Lo que **no** se puede medir así: el espesor de la placa. Aparente 28.0 px sobre
355.5 px de largo = 0.079, contra 12/118 = 0.102 de catálogo, un −22 % que no es
error de medida sino el coseno del ángulo de cámara. Cualquier cota que no esté
contenida en un plano paralelo al sensor está escorzada por un factor desconocido.

Conclusión práctica: **la foto sirve para identificar y para comprobar la
arquitectura** (dos varillas guía, émbolo centrado, placa con avellanados y cuatro
roscas de esquina, ranuras en T, dos puertos), y sirve como prueba de que la pieza
existe y se vende. Las cotas salen del dibujo acotado. Confundir las dos cosas es
como se cuelan errores del 20 % en un modelo.

---

## 3. Por qué Ø80 y no otro

Carga a levantar: 55 kg del conjunto móvil + 34 kg de bulto máximo = **873 N**.
Presión de trabajo del ProSort MRT según su manual: **60 psi = 4.14 bar**.

| | Ø63 | **Ø80** | Ø100 |
|---|---:|---:|---:|
| Área de empuje (mm²) | 3117 | **5027** | 7854 |
| Empuje a 4.14 bar (N) | 1290 | **2081** | 3252 |
| Factor de seguridad | **1.48** ✗ | **2.38** ✓ | 3.73 ✓ |
| Aire por ciclo a 4.14 bar (L ANR) | 0.30 | **0.49** | 0.76 |
| Huella del cuerpo (mm) | 162 × 78 | **202 × 91.5** | 240 × 111.5 |
| Alto retraído A (mm) | 106.5 | **115** | 137 |

- **Ø63 se cae por fuerza**: 1.48 no llega al 1.5 que exige la compuerta, y
  precisamente a la presión que declara el fabricante del equipo. Subir la presión
  de red para salvarlo sería cambiar el equipo, no dimensionar el actuador.
- **Ø100 se cae por geometría y por velocidad**: 22 mm más alto que el Ø80 sobre
  una cadena de alturas que ya va justa, y **57 % más de aire por ciclo**, que con
  la misma válvula y el mismo tubo es directamente 57 % más de tiempo de llenado.
- **Ø80 pasa las tres**: factor 2.38, cabe, y es el más rápido de los que pasan.

Margen de presión: con Ø80 el equipo sigue levantando con factor 1.5 hasta
**2.60 bar (38 psi)**. El retorno da 1878 N a 4.14 bar, y además baja a favor de
la gravedad.

---

## 4. La pieza: SMC MGPM80-10Z

Cotas de catálogo (`MGPM_2139.pdf` pág. 15; prestaciones pág. 6-7 y `MGP-old-e.pdf`
pág. 7). Capa `cat`.

**Geometría**

| | mm |
|---|---|
| Placa móvil `T × S × FA` | 198 × 75 × 22 |
| Hueco placa↔cuerpo `FB` (retraído / extendido) | 18 / 28 |
| Cuerpo, largo según el eje `C` | 56.5 |
| Cuerpo, sección `H × G` | 202 × 91.5 (repartido `J` 45.5 / `K` 46) |
| Varillas guía `ØDA`, paso `U` | Ø25, a 156 entre ejes |
| Salida de varillas `E` (retraído / extendido) | 18.5 / **28.5** |
| Largo total `A` (retraído / extendido) | 115 / 125 |
| Vástago del émbolo | Ø25 |
| Roscas de la placa `4-NN` | M12 × 1.75, patrón 174 × 52 |
| Roscas de fijación del cuerpo `4-MM` | M12 × 1.75 prof. 25, patrón 180 × 52 |
| Puertos | 2 × Rc 3/8 |
| Ranura en T (a/b/c/d/e) | 13.3 / 20.3 / 12 / 8 / 22.5, para tornillo M12 |

**Prestaciones**

| | |
|---|---|
| Áreas empuje / retorno | 5027 / 4536 mm² |
| Presión máx. / mín. | 1.0 / 0.1 MPa |
| Velocidad de émbolo admisible | 50 … 400 mm/s |
| Amortiguación | tope de goma en ambos extremos |
| Energía cinética admisible | 2.71 J |
| Masa (carrera 25, la menor tabulada) | 6.49 kg, de ellos 4.27 kg móviles |
| Carga lateral admisible | 352 N |
| Par admisible sobre la placa | 21.9 N·m |
| Precisión de no-giro | ±0.04° |

---

## 5. Fuerza, velocidad, geometría, estabilidad

**Fuerza.** 2081 N a 4.14 bar contra 873 N de carga → **factor 2.38**. A 6 bar,
3016 N → factor 3.46.

**Velocidad.** El límite no lo pone el cilindro (admite 400 mm/s) sino la energía
cinética del bulto: con M + m = 89 + 4.27 = 93.27 kg y 2.71 J admisibles,

    u_máx = √(2 · 2.71 / 93.27) = 0.241 m/s

Con la relación del catálogo `u = 1.4 · u_media`, la velocidad media es 172 mm/s y
los 10 mm de carrera se hacen en **58 ms**. Estrangulando a 150 mm/s de pico son
93 ms. Cualquiera de los dos sobra para un clasificador. Consumo **0.49 L ANR por
ciclo**; a 20 ciclos/min, 9.7 L/min ANR.

Esto se traduce en una condición de montaje que hay que respetar: **los reguladores
de escape tienen que dejar la velocidad de impacto por debajo de 241 mm/s**. No es
un consejo, es el límite de catálogo del actuador.

**Geometría.** La huella pasa de los 170 × 200 inventados a **91.5 (X) × 202 (Y)**:
78 mm más estrecha en la dirección de los rodillos, prácticamente igual en la de
expulsión. Eso libera el conflicto que obligaba a descentrar la mesa. En altura el
conjunto real mide 115 mm retraído contra los 106 supuestos, así que la cadena de
alturas hay que rehacerla, no estirarla.

Y aparece un requisito que la pieza inventada no tenía: **las varillas guía salen
28.5 mm por debajo del cuerpo** con el equipo levantado, de modo que el alma del
canal soporte necesita dos taladros de paso Ø30 a ±78 mm en Y del eje.

**Estabilidad.** El guiado del conjunto móvil lo dan sus propios cuatro pasadores
en colisa; las varillas guía del cilindro trabajan en paralelo con ellos. Aun
suponiendo que el cilindro se coma **todo** el momento de excentricidad —hipótesis
conservadora, porque los pasadores toman la mayor parte—, con la mesa centrada la
excentricidad tiende a cero, y con la mesa en su posición antigua (X = 245, 13.5 mm
fuera del centro de gravedad del móvil) el par sería 11.8 N·m contra 21.9 N·m
admisibles. La carga lateral sólo viene de rozamiento y desalineación: aun
atribuyéndole el 5 % de la carga, 44 N contra 352 N admisibles.

---

## 6. Lo que cambia en el modelo

Ver `elevacion.mjs` y las métricas que emite (`meta.verificaciones` del JSON del
ensamble). El resumen de la integración se añade al final de este documento cuando
la compuerta de diseño la da por buena.
