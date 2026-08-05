# Levantamiento dimensional por píxeles — DE 10 2012 014 181 A1 ("celluveyor", BIBA Bremen)

Capa de información: **`measured-2D`** (medición por píxeles sobre las láminas rasterizadas de la
patente). No hay ninguna cota métrica en el documento, así que **todo se expresa en proporciones y
ángulos**. Cualquier milímetro que aparezca en el diseño tendrá que salir de otra fuente (`web` o
`user`), nunca de aquí.

- Material: `patente_p01.png` … `patente_p40.png` (300 dpi, 2481 × 3508 px). Láminas de figuras: p11–p40.
- Herramienta: `tools/med_px.py` (`perfil`, `circulos`, `lineas`, `rejilla`). Todas las coordenadas
  citadas son píxeles de la **imagen original**.
- Datos numéricos completos y trazables: `figuras_medicion.json`.

> **Fallo corregido en la herramienta.** `med_px.py lineas` reventaba con
> `TypeError: cannot unpack non-iterable numpy.int32` porque `cv2.HoughLinesP` devuelve `(N,4)` en
> OpenCV ≥ 5 y `(N,1,4)` en OpenCV < 5. Se normaliza ahora con `reshape(-1,4)`. Sin ese arreglo no se
> podían medir los ángulos, que es lo más valioso de estas figuras.

---

## Parámetro maestro

Todo el diseño se deja atado a un único parámetro:

**`a` = circunradio del hexágono del módulo = longitud del lado del hexágono.**

| Magnitud | Valor |
|---|---|
| Entrecaras del hexágono (= **paso de teselado**) | `√3·a` = 1.732·a |
| Entrevértices | `2·a` |
| Apotema | `0.866·a` |
| **Radio del círculo de disposición de ruedas `R`** | **`a/2`** |
| Recorte cuadrado de la rueda | `0.44·a` |
| Diámetro real de la rueda `Ø` | ≈ `0.52·a` |
| Separación entre centros de rueda vecinos | `√3·R` = `0.866·a` ≈ 1.7·Ø |
| Brida del motor (cuadrada, tipo NEMA) | `0.37…0.43·a` ≈ 0.7·Ø |
| Bola loca (Ø exterior) | `0.18·a` ≈ 0.35·Ø |

`a` medido en las distintas láminas: 590 px (Fig. 1), 790 px (Fig. 8), 1340 px (Fig. 2), 205 px (Fig. 19a).

---

## Figura por figura

### Fig. 1 (p11) — planta del módulo 10. **La lámina de referencia.**
Chapa hexagonal 12, tres unidades 14 (rueda omni doble 16 + motor propio 18), tres recortes cuadrados
20, bolas locas 26 y el triángulo equilátero de construcción **D** con sus mediatrices `r, s, t`
(= ejes de giro **H**), concurrentes en el centro **M**.

Lo medido y aprovechable:
- **M = (1310, 1747) px**, donde convergen los seis rayos de `r,s,t`.
- Hexágono: vértices en las bolas locas (800,1450) y (800,2042) → **a = 590 px**, arista izquierda
  vertical, vértices a 150°/90°/30°/−30°/−90°/−150°.
- **Ejes H a 0°, −60.0°, +60.0° → γ = 120° exactos** (medido 119.7°–120.3°).
- Lados del triángulo D a −90.0°, +30.2°, −29.8° → mutuamente 60°, y **cada uno a β = 90.0°±0.2° de su
  mediatriz**.
- **R = 302 px = 0.512·a** (distancia M→lado del triángulo, tres medidas: 299/303/304).
- Recorte 20: **260 × 260 px = cuadrado**, `0.441·a`; su centro cae exactamente sobre el lado del
  triángulo y sobre el eje H.
- Bolas locas: 1 en M; 3 a `r = 0.536·a` en 0°/±120° (**en los huecos entre ruedas**); las de los
  vértices están dibujadas sólo en las dos de la izquierda (las otras son escotaduras).
- Motor: brida 219.5 px = `0.372·a`, ocupando **r = 0.86·a … 1.13·a**, es decir, **sobresale del
  propio hexágono**.

### Fig. 2 (p12) — planta de **una celda** con su chapa pentagonal
Es la celda elemental del proyecto. Vértices ajustados por intersección de rectas:
`C(514,1723) – M2(1089,737) – V(1667,1059) – V(1667,2399) – M4(1081,2717)`.

- Lados: 1141 / 662 / **1340** / 667 / 1144 px → normalizados **0.851 : 0.494 : 1.000 : 0.498 : 0.854**.
- Eso coincide (error < 2 %) con la partición exacta de un hexágono regular en tres partes iguales:
  **0.866 : 0.5 : 1 : 0.5 : 0.866**, con ángulos interiores **120°, 150°, 120°, 120°, 150°**.
  → **La celda es literalmente 1/3 del hexágono**: vértice C = centro del módulo, dos vértices del
  hexágono y dos puntos medios de arista.
- Recorte cuadrado 590 × 595 px = `0.442·a` (idéntico a Fig. 1).
- Centro de rueda a **671 px de C = 0.501·a** → **confirmación independiente de R = a/2**.
- Cinco escotaduras semicirculares 38, **una por vértice** (1/3 de círculo en C, 1/4 en los demás,
  según [0057]).
- El motor sale por la arista larga (hacia el exterior del módulo).

### Fig. 3 (p13) — perspectiva de la celda
Cualitativa. Confirma que la unidad va **colgada bajo la chapa** y que las celdas se unen por
**pestañas dobladas hacia abajo (28) con taladros (30)**.

### Fig. 4 (p14) — alzado lateral de la celda
Chapa 12 con el ápice de la rueda (24) asomando 57 px por encima; motor 18 colgando entre las
pestañas. Da la relación sobresaliente / profundidad bajo chapa ≈ 0.107. Espesor de chapa dibujado
≈ 19 px (no fiable como proporción).

### Fig. 5a–5d (p15–p18) — la unidad motriz (lo más útil para el CAD del accionamiento)
- **5a**: soporte en C 32 abierto hacia arriba, rueda dentro, motor atornillado a una pata.
  **Sin correa, polea ni engranaje: accionamiento directo.**
- **5b** (planta): brida del motor 392 px, cuerpo 332 px (L/brida ≈ 0.85); anchura axial de la rueda
  ≈ 430 px = 1.10 × brida; Ø rueda 563–587 px.
- **5c** (vista según el eje): **brida cuadrada 450 × 448 px** con **4 taladros en cuadrado de 377 px
  (0.84 × brida)** → motor tipo NEMA. Arco de la rueda → **Ø = 1.42 × brida**.
- **5d** (frontal): brida 436, cuerpo 330; Ø rueda 558–597 → 1.28–1.37 × brida.
  Se cuentan **3 rodillos abarrilados por disco**, discos desfasados 60° (rueda omni **doble**).

**Conclusión del accionamiento: Ø rueda ≈ 1.3–1.45 × brida del motor; motor en línea, eje colineal
con el eje de giro de la rueda, cuerpo bajo la chapa.**

### Fig. 6 (p19) — perspectiva del módulo
Cualitativa: los tres motores **por debajo** de la chapa, ejes radiales, cuerpos hacia fuera.

### Fig. 7 (p20) — alzado lateral del módulo
- Brida del motor visto de frente: **309 × 313 px** (el rectángulo mayor 465 px es el soporte en C, no
  el motor — cuidado con confundirlos).
- Ø de rueda ≈ 425 px = **0.51·a**; **sobresaliente sobre la chapa = 70 px = 0.165·Ø = 0.084·a**.
- La cuerda de la rueda al nivel de la chapa (0.73·Ø) es menor que el recorte (0.85·Ø) → **holgura de
  diseño**, la ventana no toca la rueda.

### Fig. 8 (p21) — módulo 200 con ruedas **Mecanum**
Misma arquitectura, ruedas distintas. Hexágono limpio: vértices (690,1328) y (692,2118) → centro
(1374,1723), **a = 790 px**. Bola loca en el centro; tres a `0.539·a` en 0°/±120°; **R = 394 px =
0.499·a** (tercera confirmación). El recorte pasa a ser **rectangular ≈ 0.32·a × 0.61·a** porque la
rueda Mecanum es distinta (medida de baja confianza, leída sobre rejilla).

### Fig. 9 y 10 (p22–p23) — perspectiva y alzado del módulo 200
Cualitativas. En Fig. 10 los rodillos a 45° hacen ambigua la silueta: no se acota.

### Fig. 11 (p24) — **esquema cinemático**. La segunda lámina más importante.
- Círculo de disposición: centro (1250,1663), **R = 362 px** (360.8 vertical / 363.6 horizontal).
- **Ejes H (radios) a 180°, −60.1°, +60.0° → 120°.**
- **Direcciones eficaces `v` (eje largo de cada rueda, ⟂ H) a 90.0°, +30.5°, −30.2°** → separadas
  59.5°, 59.8° y 60.7°: **60° como rectas, 120° como vectores tangenciales**. Ni ortogonales
  (reivindicación 3) ni con dos paralelas (reivindicación 2).
- **H ⟂ v medido 90.6° y 90.2°** → rueda tipo *Omniwheel* (dirección eficaz = dirección de rotación),
  no Mecanum.
- El centro de rueda cae **exactamente sobre** el círculo (|M−centro| = 363 vs R = 362).
- ⚠️ La proporción largo/ancho del rectángulo esquemático (3.34) **no es la proporción real** de la
  rueda (≈1.3). No usarla.

### Fig. 12a / 12b (p25–p26) — variante **no uniforme**
La patente cubre también disposiciones irregulares: tres círculos concéntricos de radios
**R1:R2:R3 ≈ 1 : 1.21 : 1.37** (286/345/392 px) y dos de los tres ejes H no colineales con su radio.
La desviación angular exacta **no es medible con fiabilidad** en esta lámina. Para replicar conviene
la variante uniforme de Fig. 1/11, que es la que el propio texto dice que "simplifica las matemáticas
del control" ([0062]).

### Fig. 13a–13d (p27–p30) — módulo **pasivo** 270
La misma celda pentagonal, **sin motor**, con la rueda libre en su soporte. Se usa en los bordes de la
plataforma para dejar el contorno recto y que los paquetes no se enganchen.
En 13d se aprecia que **la corona de la bola loca y el punto más alto de la rueda quedan a la misma
altura** (coherente con [0050]) — dato de diseño relevante.
El pentágono de 13b **no se puede ajustar** (contorno a mano alzada con marcas de rotura): para la
geometría de la celda hay que usar Fig. 2.

### Fig. 14a–14d (p31–p34) — diagramas de control
Combinaciones de los tres vectores `v` y el movimiento resultante `F`: recta oblicua, curva, rotación
pura y traslación. Confirman que **un módulo de 3 ruedas a 120° ya da los 3 GDL del plano
(vx, vy, ω)**. No aportan geometría.

### Fig. 15–18 (p35–p38) — la plataforma 300
Módulos activos 10 + pasivos 270 sobre un bastidor de mesa 39, en **panal edge-to-edge**. Fig. 17
muestra trayectorias (recta, diagonal, curva con rotación, transversal, rotación pura); Fig. 18, la
formación simultánea de una capa de paquetes.

### Fig. 19a (p39) — **teselado ampliado en planta**. La lámina para el paso de módulos.
- Hexágono unitario: vértices (598,1103)(795,993)(952,1105)(952,1300)(795,1443)(598,1305) → centro
  (775,1218), **a ≈ 205 px**, misma orientación que Fig. 1.
- **Paso entre centros = 355 px = √3·a = entrecaras**, en las 6 direcciones a 60° (red triangular).
- **Todos los módulos con idéntica orientación** (traslación pura, sin giro alternado).
- El motor izquierdo se ve entre r ≈ 0.76·a y 1.10·a con apotema 0.866·a → **cruza la arista y queda
  bajo la chapa del vecino**, a ≈0.63·a del centro de éste. Coincide con Fig. 1 (0.86·a…1.13·a).

### Fig. 19b (p40) — el mismo trozo **visto por debajo**
Tres motores por módulo, a 120°, eje radial, cuerpo hacia fuera; los motores de módulos vecinos se
entrelazan sin tocarse. **Ninguna correa, cadena ni reductora**: se ve el motor directamente pegado al
soporte de la rueda.

---

## Respuestas directas a las preguntas del encargo

| Pregunta | Respuesta medida | Confianza |
|---|---|---|
| ¿Cuántas ruedas por celda y a qué ángulos? | **3 ruedas por módulo hexagonal (1 por celda pentagonal)**. Ejes de giro H radiales a **120°**; direcciones eficaces **⟂ a H**, a **60° entre sí como rectas / 120° como vectores tangenciales**. | Alta |
| ¿Celda hexagonal, triangular o cuadrada? | El **módulo** es un **hexágono regular**; la **celda** (1 rueda + 1 motor) es un **pentágono = 1/3 exacto del hexágono** (lados 0.866 : 0.5 : 1 : 0.5 : 0.866·a). La construcción cinemática se apoya en un **triángulo equilátero** con las ruedas en los puntos medios de sus lados. | Alta |
| ¿Cómo teselan los módulos? | **Panal edge-to-edge**, red triangular de centros con paso **√3·a** (= entrecaras) en las 6 direcciones a 60°, **todos con la misma orientación**. Bordes rectos completados con módulos pasivos. | Alta |
| ¿Dónde van los motores? | **En línea** con la rueda (eje del motor = eje de giro H), **por debajo de la chapa**, colgados del mismo soporte en C, con el cuerpo **hacia fuera**: ocupa r ≈ 0.86·a…1.13·a, o sea **sobresale del propio hexágono y se aloja bajo la chapa del módulo vecino**. Las prolongaciones de los tres ejes se cortan en el centro M. | Alta |
| ¿Transmisión intermedia? | **No. Accionamiento directo.** En ninguna de las 30 láminas hay correa, polea, cadena ni engranaje. | Alta |
| ¿Proporción Ø rueda / tamaño de celda? | **Ø rueda ≈ 0.52·a**; entrecaras del módulo ≈ **3.3 × Ø**; entrevértices ≈ **3.8 × Ø**; **R = a/2 ≈ 0.96 × Ø**; separación entre centros de rueda ≈ **1.7 × Ø**; recorte cuadrado = **0.85 × Ø**; brida del motor ≈ **0.7 × Ø**; bola loca ≈ **0.35 × Ø**. | Media-alta (Ø real medido en 4 láminas: 1.3–1.45 × brida del motor) |

---

## Lo que **no** se puede medir (y no se inventa)

1. **Ninguna cota métrica.** La patente no acota en mm en ninguna lámina.
2. **Fig. 12b**: desviación angular exacta entre H y R — lámina de baja calidad, discontinuas confundidas
   con las flechas.
3. **Fig. 13b**: el pentágono de la celda pasiva — contorno a mano alzada con marcas de rotura.
4. **Fig. 8**: bordes exactos del recorte Mecanum (sólo lectura sobre rejilla, confianza baja).
5. **Espesor de la chapa portante**: sólo se dibuja engrosado, no es proporción fiable.
6. **Figuras en perspectiva** (3, 5a, 6, 9, 13a, 15, 16, 19b): sin escala uniforme, sólo cualitativas.

## Cómo usar esto en el CAD

Parametriza el ensamble **por `a`** (o por el Ø de rueda comercial que se compre, con `a = Ø/0.52`) y
deriva el resto de la tabla del parámetro maestro. Las únicas decisiones que **no** salen de la patente
son las dimensiones absolutas: hay que fijarlas eligiendo una rueda omni real y un motor real, y
registrar esa elección como capa `user` (o `web`, con URL y fecha, si viene de una ficha técnica).
