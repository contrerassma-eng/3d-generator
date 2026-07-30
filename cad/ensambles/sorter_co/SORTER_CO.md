# SORTER CO — reconocimiento medido del clasificador del cliente

Fuente única: `ref/sorter_CO.stp` (22 559 833 bytes, AP214 `AUTOMOTIVE_DESIGN`,
`ST-DEVELOPER v20.1`, originating system **Autodesk Inventor 2026**, sellado
`2026-06-23T19:45:16-04:00`, autor `crami`).

**Unidades: milímetros.** Los 135 `GEOMETRIC_REPRESENTATION_CONTEXT` del fichero
apuntan todos a `#412011 = SI_UNIT(.MILLI.,.METRE.)`. Existe además un
`#397 = CONVERSION_BASED_UNIT('inch', …)` pero **ningún contexto geométrico lo
usa**: no hay geometría en pulgadas. Incertidumbre declarada del modelo:
`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.01))` → 0.01 mm.

Este documento **responde a `ADAPTACION.md`**, que congela la especificación de
la transferencia y enumera lo que el reconocimiento debe devolver. Sus cinco
puntos se contestan aquí: 1 y 2 en el §1, 3 en el §1.5, 4 en el §2, 5 en el §2.3.
La nota final de `ADAPTACION.md` sobre el rodillo de retorno se contesta en el §7.

Procedencia de cada número de este documento:

| Marca | Significado |
|---|---|
| `step` | **Medido** sobre el STEP con OpenCascade. Se cita la ocurrencia. |
| `web` | Dato externo. URL, fecha y cita en `web_facts.json`. |
| `dis` | Decisión o hipótesis de este análisis. Lleva justificación. |
| `nbt90` | Especificación **congelada** de la transferencia, de `cad/ensambles/nbt90/params.mjs`. |

Reproducible con:

```
python3 cad/ensambles/sorter_co/leer_step.py    # → inventario.json          (~40 s)
python3 cad/ensambles/sorter_co/medir.py        # → analisis/medidas.json    (~51 s)
python3 cad/ensambles/sorter_co/secciones.py    # → analisis/secciones.json  (~64 s)
python3 cad/ensambles/sorter_co/acople.py       # → analisis/acople.json     (~10 s)
```

---

## 0. Sistema de coordenadas del modelo del cliente

No se ha girado nada: todo lo que sigue está en el sistema del STEP tal como
viene.

```
 X = a lo ancho de la máquina = dirección en que se reparten las 4 calles
     ( = dirección de expulsión a 90°, la «Y» del NBT90 )
 Y = a lo largo = por donde corre el producto sobre las bandas
     ( = la «X» del NBT90 )
 Z = arriba.  Z = 0 en el eje del árbol motriz.
 Origen: X = 0 en el eje del perfil TSLOT de la calle 1; Y = 0 en el eje del
     árbol motriz; Z = 0 en ese mismo eje.
```

**Plano de transporte: `Z = +52.333`** `step` — lo definen a la vez la cara
superior de las bandas (`banda_T5_3p4`, Z máx 52.333) y la generatriz superior
de los rodillos (`roller/uni_002`, Z máx 52.33). Coinciden dentro de 0.003 mm.

Envolvente del conjunto `step`, descontando los dos artefactos del §5 (la pieza
colocada a 271 m y los tres ejes de Ø25 duplicados):
**X [−262.42, 541.74] · Y [−1666.02, 90.18] · Z [−433.10, 86.18]**
→ **804.2 × 1756.2 × 519.3 mm**. Tal cual viene el fichero, esos artefactos la
estiran a 272 350.7 mm en Y y a 1023.3 mm en X.

---

# 1. QUÉ HAY QUE MOVER DEL SORTER

La arquitectura está decidida: **manda la transferencia**. Lo que sigue no
juzga si entra; mide qué hay que cambiar. La especificación congelada es:

| `nbt90` | Valor |
|---|---|
| paso entre ejes de rodillos y entre bandas | **76.2** mm |
| rodillos | **6** × Ø**34.925** × 375 de cara |
| huecos de banda | **5**, ventana de **31.75** mm cada uno |
| holgura rodillo ↔ banda | **4.7625** mm por lado (76.2 − 34.925 − 2 × 4.7625 = 31.75) |
| BR entre almas | **457.2** mm |
| ancho exterior del módulo (`anchoExt`) | **534.7** mm |
| largo del módulo en el flujo (`largo`) | **463** mm |
| altura del módulo bajo el plano de banda (`altoTotal`) | **390.6** mm |
| carrera del rodillo | +6.35 elevado / −3.65 retraído sobre el plano de banda |

De ahí sale la cota que gobierna todo: **la franja de altura que barre el
rodillo**, de `planoBanda − 38.575` a `planoBanda + 6.35`. En el sorter del
cliente, con el plano en 52.333, eso es **Z ∈ [13.758, 58.683]**.

## 1.1 Paso entre bandas — la cota que gobierna

| Cota | Sorter CO `step` | `nbt90` | Δ |
|---|---|---|---|
| nº de estaciones (calles) | **4** | 5 | −1 |
| ejes de los perfiles TSLOT en X | 0 · 138.665 · 277.330 · 415.995 | — | — |
| ejes de las bandas en X | 1.000 · 139.665 · 278.330 · 416.995 | — | — |
| **paso entre estaciones** | **138.665** (los tres iguales) | **76.2** | **+62.465** |
| span de la 1.ª a la última | **415.995** | 304.8 (5 bandas) | +111.195 |
| ancho de banda | **32.000** (T5) | ventana 31.75 | +0.250 |

**El paso es 1.820 veces el que pide la transferencia.** No es un ajuste: es
volver a repartir las calles.

Un detalle medido que conviene no perder: **la banda va 1.000 mm descentrada
respecto al eje de su perfil** (eje de banda 1.000, eje de TSLOT 0.000, eje de
la guía −0.050). Con 32.000 de banda dentro de una guía de 39.900 quedan
**5.00 mm a un lado y 2.90 al otro** en vez de 3.95 y 3.95. O es intencionado o
es un descuido del modelo; el STEP no lo dice.

## 1.2 Cuánto mide la estación de ancho en la franja que barre el rodillo

Medido por barrido de ocupación en Z ∈ [13.758, 58.683], `step`:

| Pieza de la calle | Ancho en X | Cota Z que ocupa |
|---|---|---|
| `TSLOT` (perfil 40 × 80) | **40.000** | −40.000 … +40.000 |
| `guiaw` (guía de deslizamiento) | **39.900** | 33.150 … 51.700 |
| `cierre guia` | 39.900 | 36.600 … 51.700 |
| `banda_T5_3p4` | 32.000 | (dorso a 52.333) |
| **envolvente de la calle, sin los rodillos** | **40.000** | toda la franja |
| **envolvente de la calle, con los rodillos** | **127.663** | toda la franja |

Los rodillos del sorter (§4.3) van a **±46.832** del eje de calle, con Ø34.000:
sus caras exteriores quedan a ±63.832. **Esos 127.663 mm por calle son el
verdadero obstáculo**, no los 40 del perfil.

**Ventanas libres en X dentro de la franja de barrido** `step`:

| Zona en Y | Ventanas libres (mm) |
|---|---|
| **con rodillos** (Y −1489.7 … −639.7) | 17.59 · **11.00** · **11.00** · **11.00** · 19.59 |
| **sin rodillos** (Y −600 … −200) | 61.42 · **98.67** · **98.66** · **98.67** · 63.42 |

En la zona de rodillos la ventana mayor mide **19.59 mm**: no cabe ni un solo
rodillo de Ø34.925. En la zona sin rodillos caben 98.67 mm, pero a paso 138.665;
dos rodillos a 76.2 necesitan 76.2 + 34.925 = **111.125 mm** de ventana, o sea
**12.46 mm más de los que hay**. Por eso, incluso donde el deck está despejado,
**el paso actual sólo admite UN rodillo por ventana**.

## 1.3 Ancho útil del bastidor frente a BR 457.2

| Referencia `step` | Cara izq. X | Cara der. X | Luz | vs `BR` 457.2 | vs `anchoExt` 534.7 |
|---|---|---|---|---|---|
| entre bastidores `FRAME_MIR_MIR` / `_MIR_MIR_MIR` (a la altura del deck) | −81.423 | 499.418 | **580.841** | **+123.641** | **+46.141** |
| entre chapas interiores `U_007_MIR` / `U_007` (Z −359.1 … −59.1) | −68.003 | 485.998 | **554.001** | +96.801 | **+19.301** |
| entre canales `CAN0_MIR` / `CAN0` | −75.423 | 491.418 | 566.841 | +109.641 | +32.141 |

**El ancho no es problema.** El módulo completo (534.7 punta a punta de las
alas) entra por la parte estrecha, entre las chapas `U_007`, con **9.65 mm por
lado**; y por el deck, entre bastidores, con **23.07 mm por lado**. Aviso: las
chapas `U_007` pertenecen al conjunto que hay que eliminar (§2), así que ese
9.65 desaparece y queda el 23.07.

Los bastidores llegan sólo hasta **Z = +46.0**, 6.3 mm por debajo del plano de
transporte: por encima de esa cota nada limita el ancho en la ventana de trabajo.

## 1.4 Largo disponible en el flujo, y altura — aquí está el problema

Barrido fino (2 mm) buscando el tramo de Y donde las tres ventanas centrales
siguen libres, `step`:

| Situación | Tramo en Y | Largo | vs `largo` 463 |
|---|---|---|---|
| tal como está | **Y [−618.0, −150.0]** | **468.0** | **+5.0** |
| eliminando la transferencia incompleta (§2) | **Y [−1408.0, −150.0]** | **1258.0** | **+795.0** |

Tal como está, el módulo de 463 entra por **5 mm**. Eliminando el conjunto de
rodillos, el hueco pasa a 1258 mm y desaparece la restricción de largo.

**Pero la altura no da.** El módulo necesita 390.6 mm por debajo del plano de
transporte, es decir bajar hasta Z = −338.27. Medido bajo la cubierta, en toda
la anchura X [−81.42, 499.42]:

| Tramo en Y | Primer estorbo bajo la cubierta `step` | Profundidad libre desde 52.333 |
|---|---|---|
| −618.0 … −513.1 | ninguno (con §2 eliminado) | **≥ 485** mm ✔ |
| −513.1 … −459.3 | `LAT TOP` a Z = −113.05 | 165.4 mm ✘ |
| −459.3 … −349.4 | `guia_entrada_liso` a Z = −35.04 | **87.4 mm** ✘ |
| −349.4 … −250.5 | `LAT TOP` a Z = −113.05 | 165.4 mm ✘ |
| −250.5 … −140.6 | `guia_salida_liso` a Z = −35.04 | **87.4 mm** ✘ |

**Sólo 104.9 mm de los 468 tienen la profundidad que pide el módulo.** Lo que
estorba, por orden de gravedad:

1. **La horquilla vertical de la banda.** Los dos volantes lisos Ø100
   (`guia_entrada_liso` en Y −459.25 … −349.40 y `guia_salida_liso` en
   Y −250.45 … −140.60, ambos con eje en Z = −90.0) suben hasta Z = −35.04,
   a sólo 87.4 mm bajo el plano de transporte, y están **dentro** de la ventana
   de trabajo. Además el ramal de retorno baja hasta **Z = −314.40** justo ahí.
2. **`LAT TOP`** (Y −513.12 … 90.18, Z −433.10 … −113.05, todo el ancho):
   ocupa la mitad inferior de la ventana.
3. **El `Tensor`** (Y −234.72 … 12.05, Z −430.92 … −138.70) invade el extremo
   Y = −150 de la ventana.

Traducido: **re-pitchear las calles no basta.** Hay que reubicar la horquilla y
el tensor de las calles afectadas y despejar `LAT TOP` en el tramo del módulo,
o bien colocar el módulo entre Y = −618 y Y = −513 y **acortarlo**, que es
tocar la especificación congelada.

## 1.5 Cinco estaciones contra cuatro repartidas — los dos juegos de números

La transferencia tiene 5 huecos de banda. Ambas opciones, medidas contra lo que
hay:

| | **A · 5 estaciones a 76.2** | **B · 4 estaciones a 76.2** |
|---|---|---|
| ejes en X (relativos al centro) | −152.4 · −76.2 · 0 · +76.2 · +152.4 | −114.3 · −38.1 · +38.1 · +114.3 |
| span eje a eje | 304.8 | 228.6 |
| envolvente con la calle actual de 40.0 | 344.8 | 268.6 |
| envolvente con la calle reducida a 31.75 | 336.55 | 260.35 |
| ¿cabe en la luz de 580.841? | sí, sobran 236.0 | sí, sobran 312.2 |
| huecos de banda de la transferencia con banda portante | **5 de 5** | **4 de 5** — uno queda vacío |
| cambio respecto a hoy | 4 → 5 calles, +1 conjunto completo | 4 → 4 calles, sólo re-pitchear |
| anchura de deck útil (eje a eje) | 304.8 (hoy 415.995) → **−111.2** | 228.6 → **−187.4** |

**Holgura rodillo ↔ calle, que es lo que decide si la opción es fabricable:**

| Ancho de la calle | Hueco entre calles a paso 76.2 | Holgura al rodillo Ø34.925 |
|---|---|---|
| **40.000** (perfil TSLOT actual) | 36.200 | **0.638 mm por lado** ✘ |
| **39.900** (guía actual) | 36.300 | 0.688 mm por lado ✘ |
| **32.000** (sólo la banda T5) | 44.200 | 4.638 mm por lado ≈ nominal |
| **31.75** (ventana `nbt90`) | 44.450 | **4.7625 mm por lado** ✔ |

Éste es el hallazgo fino del apartado: **la banda T5 de 32.000 mm cabe casi
exactamente en la ventana de 31.75 de la transferencia** (sobra 0.25 mm, un 0.8 %).
Quien no cabe es **el perfil de 40.000 y la guía de 39.900**: sobran **8.25 y
8.15 mm** respectivamente. La conversión pasa por una guía y un soporte de calle
de ≤ 31.75 mm de ancho en la franja Z [13.758, 58.683]; por debajo de Z = 13.758
el perfil puede seguir siendo de 40, porque el rodillo ya no llega.

Y en las dos opciones, **los 8 rodillos actuales del sorter tienen que salir**:
a ±46.832 del eje de calle con Ø34.000, invadirían la calle contigua (46.832 +
17.0 = 63.832 > 76.2/2 = 38.1) y ocuparían exactamente el sitio de los rodillos
de la transferencia.

---

# 2. LA TRANSFERENCIA INCOMPLETA

## 2.1 Veredicto

**La transferencia incompleta es el conjunto de rodillos: `roller` (×8) más su
bastidor propio `U_004`, `U_005`, `U_005_MIR`, `U_006`, `U_007`, `U_007_MIR`.**

Subárboles a excluir, por ruta exacta:

```
cal_4_f40___65/roller          ×8   (cada uno: Uni_001, uni_002, uni_003,
                                     2 × skf_bearing_nk_19_20_2, U_006, U_006_MIR1)
cal_4_f40___65/U_004           ×1
cal_4_f40___65/U_005           ×1
cal_4_f40___65/U_005_MIR       ×1
cal_4_f40___65/U_006           ×1   ← huérfano suelto en la raíz, ver §5.4
cal_4_f40___65/U_007           ×1
cal_4_f40___65/U_007_MIR       ×1
```

**62 ocurrencias.** Caja del conjunto `step`:
**X [−71.05, 489.05] · Y [−1559.69, −619.69] · Z [−364.09, 52.33]**
→ **560.10 × 940.00 × 416.43 mm.**

## 2.2 La evidencia

1. **Los 8 rodillos tienen el eje paralelo al flujo.** `uni_003` es un eje
   Ø20.000 × 940 orientado según **Y**, que es la dirección en que corre el
   producto. Un rodillo cuyo eje es paralelo al flujo no transporta: **sólo
   permite que la carga se mueva en X, o sea a 90°.** Ésa es, literalmente, la
   función de una transferencia de rodillos emergentes.
2. **Su generatriz superior está exactamente en el plano de transporte**
   (Z = 52.33 contra 52.333 de la banda). Están puestos para tocar el producto.
3. **Giran libres y no los mueve nada.** `Uni_001` es un tubo Ø30.000/Ø27.000 ×
   900; `uni_002` un manguito Ø34.000/Ø30.000 × 850 encima; giran sobre dos
   `skf_bearing_nk_19_20_2` (agujas, exterior Ø27.000 alojado en el Ø27.000
   interior del tubo) montados sobre el eje fijo Ø20. **No hay piñón, ni polea,
   ni banda, ni motor en todo el subárbol.**
4. **No hay elevación.** Nada en Y ∈ [−1559.7, −619.7] por debajo de la cubierta
   es un actuador: sólo chapas (`U_004` de 30 mm, `U_005`/`U_005_MIR` de 68,
   `U_006`/`U_006_MIR1` de 4, `U_007`/`U_007_MIR` de 3.05). Los cuatro cilindros
   neumáticos del modelo están en Y ∈ [−32.4, 69.4], a 600 mm de allí, y son los
   del tensor de banda (§4.4).
5. **No hay empujador.** Sin accionamiento y sin empuje, un lecho de rodillos
   libres no puede expulsar nada: **la función está planteada y no está
   terminada.**
6. **Tiene bastidor propio y nomenclatura propia.** La serie `U_004`…`U_007` no
   se parece a la del sorter (`FRAME_MIR*`, `CAN0/1`, `TER1*`, `LAT TOP`,
   `FRONT TOP2*`), y delimita un módulo cerrado con travesaños en los dos
   extremos del tramo de rodillos.
7. **El diámetro es el de la familia correcta:** Ø34.000 contra los Ø34.925
   (1-3/8") del NBT90. Diferencia 0.925 mm: es el mismo tipo de rodillo.

## 2.3 El hueco que deja

| | Tal como está | Eliminado el conjunto |
|---|---|---|
| tramo de Y con las 3 ventanas centrales libres | **468.0 mm** (Y −618.0 … −150.0) | **1258.0 mm** (Y −1408.0 … −150.0) |
| ventanas libres en X en la franja de barrido | 17.59 / 11.00 / 11.00 / 11.00 / 19.59 | 61.42 / 98.67 / 98.66 / 98.67 / 63.42 |
| luz entre chapas interiores | 554.001 (`U_007`) | **580.841** (bastidores) |
| profundidad libre bajo la cubierta en Y −618 … −513 | limitada por `U_005_MIR` a Z −64.1 | **libre hasta el fondo del modelo** |

**Ahí es donde se monta la nuestra.** El límite en Y = −1408 lo pone el
`SOPORTE MOTRIZ P1-1/P1-2` de las calles, no el bastidor.

## 2.4 Los dos candidatos del encargo: los dos descartados, con números

### `SCMRT906V*` — **NO** es la transferencia abortada

Tres variantes, todas medidas `step`:

| Pieza | n | Geometría medida | Dónde |
|---|---|---|---|
| `SCMRT906VT-1211` | 8 | eje **Ø20.000 × 48**, taladro pasante Ø9.000 × 50, chaflanes 45° R9.5 | Y −153.1 … −98.2 · **Z −359.8 … −192.0** |
| `SCMRT906VCT-150-111` | 4 | eje **Ø20.000 × 46**, dos roscas hembra de Ø menor **8.376** (= Ø menor teórico exacto de una **M10 × 1.5**), rebajes Ø18 × 2 | Y −185.7 … −165.7 · **Z −381.9 … −361.9** |
| `SCMRT906VT-100-401_3` | 4 | (dentro de `Tensor/TENS-LN-01`) | Z bajo cubierta |

Están **todas dentro de `cal_4_f40___65/Tensor`**, entre **Z = −382 y Z = −192**,
es decir de 244 a 434 mm **por debajo** del plano de transporte. El
`SCMRT906VCT-150-111` está exactamente en el centro de la polea tensora
(Y −175.7, Z −371.9), sujeto por los anillos `ANSI B 27.7M - 3AMI-20` que son
para eje de 20 y él mide Ø20.000. **Son los ejes del tensor neumático**, la
pieza que el cliente quiere conservar y detallar. No tocan la cubierta ni de
lejos. El parecido de «906V» con «MRT 90 6…» es fonético, no geométrico.

### `CAD_STP_400_0077` — **NO** es la transferencia abortada

Dos piezas, 148.3 cm³ en total, en X [455.39, 524.00] · Y [−29.30, 45.43] ·
Z [−35.10, 29.30] — o sea **a caballo de la cara interior del bastidor derecho
(X = 499.418), sobre el eje del árbol motriz** (Y = 0, Z = 0), fuera del deck.

- `_RO3100_part1`: cuerpo con caras **Ø58.600 × 34.2** y **Ø58.500 × 15.0**,
  un **Ø30.000 × 7.3**, un Ø35.000, un Ø12.000 y dos conos de 45°; taladros
  Ø6.100 (×3) y Ø6.700 (×2) según Y. 145.3 cm³.
- `_RUP500_part2_p2`: pieza pequeña de 3.0 cm³, Ø12.000, Ø8.400, un par
  Ø18.000/Ø20.700 sobre un eje a 45° y un cono de 10.2°.

Dos sólidos, ningún rodillo, ninguna guía, ningún actuador, y colocados donde
no hay producto. **Es un componente de compra sobre el extremo del árbol
motriz**, descargado de un portal CAD (los nombres `CAD_STP_400_0077`,
`part1`, `part2_p2` son de fichero descargado, no de catálogo). **Sin
identificar** — queda en `web_facts.json` → `pendientes_sin_fuente`.

## 2.5 Otra cosa que sí está incompleta, y no es una transferencia

**8 ocurrencias del STEP no tienen ninguna geometría** (cero caras, cero sólidos):

```
cal_4_f40___65/rail/LK30-C65-20H7-D30-R                      ×4
cal_4_f40___65/rail/drive kit w timming/UA-DRIVE PULLEY      ×4
```

El subconjunto se llama literalmente **«drive kit w timming»** (kit de
accionamiento con [banda] dentada) y su polea motriz **no existe** en el
fichero, ni tampoco el casquillo de apriete que la fijaría. Añádase que
**no hay ninguna banda AT10 en todo el modelo** pese a haber cuatro poleas
`Polea_AT10_32T_pestanas`. **La transmisión transversal del sorter está sin
terminar.** Es un hallazgo distinto del §2.1 y no debe confundirse con él.

---

# 3. INVENTARIO MEDIDO

`inventario.json` — **1194 ocurrencias · 106 prototipos** con nombre, ruta en el
árbol, matriz de colocación 3×4, caja envolvente en coordenadas del conjunto,
volumen y área. Tiempos reales: carga y transferencia del STEP **28.1 s**,
recorrido y medida **11.7 s**, total **39.8 s**.

Método, y sus límites, declarados:

- **volumen y área**: `GProp` sobre el B-Rep del prototipo. Son invariantes ante
  la colocación, así que se calculan **una vez por prototipo** y se reutilizan.
- **caja por ocurrencia**: malla del prototipo (flecha lineal 0.30 mm, angular
  0.5 rad) transformada por la matriz. **El error de esa caja está acotado por
  la flecha**: 0.30 mm.
- **caja exacta**: `analisis/medidas.json` recalcula con `BRepBndLib::AddOptimal`
  sobre el B-Rep ya colocado, sin teselar, para **741 ocurrencias** (las que
  gobiernan cotas). Es la que se ha usado en los apartados 1 y 2.
- **secciones**: `analisis/secciones.json` corta sólidos con un plano y además
  levanta un **mapa de ocupación real** punto a punto con
  `BRepClass3d_SolidClassifier`. De ahí sale el perfil del TSLOT del §4.2.

El árbol del STEP: **1 raíz** (`cal_4_f40___65`), **134 `PRODUCT_DEFINITION`**,
**351 `NEXT_ASSEMBLY_USAGE_OCCURRENCE`**, que al expandirse dan las 1194 hojas.

### Reparto por subárbol de la raíz (`step`)

| Subárbol | Ocurr. | Piezas | Volumen | Caja X | Caja Y | Caja Z |
|---|---|---|---|---|---|---|
| `314759014` (motorreductor) | 1 | 1 | 8368.1 cm³ | −262.4 … −82.4 | −202.5 … 86.0 | −394.0 … 86.0 |
| `rail` ×4 | 344 | 14 | 6804.1 | −42.6 … 458.6 | −1551.2 … 53.4 | −53.4 … 53.4 |
| `roller` ×8 | 56 | 6 | 5064.6 | −63.8 … 479.8 | −1559.7 … −619.7 | −155.2 … 52.3 |
| `Conjunto_T5_hairpin_vertical` ×4 | 20 | 5 | 4381.3 | −19.0 … 437.0 | −1663.5 … 56.0 | −314.4 … 56.0 |
| `Tensor` ×4 | 104 | 16 | 3938.2 | −481.6 … 540.4 | −234.7 … 12.1 | −430.9 … −138.7 |
| `IDLER-ENS` ×4 | 480 | 26 | 2651.3 | −45.8 … 457.8 | −1653.7 … −1392.0 | −46.6 … 46.6 |
| `guiaw` ×28 | 28 | 1 | 2462.7 | −20.0 … 435.9 | −1530.8 … −130.8 | 33.2 … 51.7 |
| `FRAME_MIR_MIR` / `_MIR_MIR_MIR` | 2 | 2 | 1863.4 c/u | ±(28 de espesor) | −1662.0 … −79.7 | −114.0 … 46.0 |
| `LAT TOP` | 1 | 1 | 1397.9 | −109.4 … 527.4 | −513.1 … 90.2 | −433.1 … −113.0 |
| `U_005` / `U_005_MIR` | 2 | 1 | 1067.9 c/u | −70.0 … 486.0 | (dos tramos) | −364.1 … −64.1 |
| `Ensamble motor` | 6 | 4 | 561.8 | 63.1 … 352.9 | −1551.3 … −1432.2 | −273.0 … −155.2 |
| `cilindro` ×4 | 12 | 3 | 264.8 | −14.0 … 436.1 | −32.4 … 69.4 | −264.5 … −76.8 |
| `CAD_STP_400_0077` | 2 | 2 | 148.3 | 455.4 … 524.0 | −29.3 … 45.4 | −35.1 … 29.3 |
| `SKF_UCFL 205` | 12 | 4 | 85.0 | 504.1 … 539.8 | −166.7 … −36.7 | −198.7 … −130.5 |

(La tabla completa, con las 40 entradas y las 1194 ocurrencias, en
`analisis/acople.json` → `subarboles_de_raiz` y en `inventario.json`.)

### Lo que no se ha podido medir

- **`banda_T5_3p4` no es un sólido.** Son **29 shells abiertos**. `GProp`
  devuelve un volumen **negativo** (−296 016 917 mm³) que no significa nada.
  **Volumen, masa y número de dientes de la banda: no medibles en este STEP.**
  Lo que sí es medible: anchura **32.000**, recorrido del lazo **1712.165**,
  altura del lazo **366.731**, dorso del ramal portante en Z = 52.333.
- **`LK30-C65-20H7-D30-R` (×4, en `rail`) y `UA-DRIVE PULLEY` (×4)**: sin
  geometría (§2.5).
- **`skf_bearing_1206_etn9_2_MIR`** da volumen **negativo** (−31 901 mm³):
  orientación invertida al espejar (§5.5).

---

# 4. CÓMO FUNCIONA

## 4.1 Recorrido del producto

Cuatro calles paralelas en X, a paso 138.665, cada una con su banda dentada T5
de 32 mm corriendo **a lo largo de Y** sobre una cama de guías. El producto se
apoya en el plano Z = 52.333, que forman a la vez las cuatro bandas y los ocho
rodillos. La banda se acciona desde el extremo **Y = 0** (polea `motriz_63T`) y
va hasta **Y = −1607.4** (`conducida_63T`): distancia entre centros **1607.4 mm**.

El sentido del flujo no está declarado en el STEP y **no lo deduzco**: la
geometría es simétrica al respecto.

Una lectura del nombre de la raíz —`cal_4_f40___65`, que podría leerse
«calibrador de 4 calles, calibre 40 a 65»— encajaría con la disposición de
rodillos que hacen girar la pieza a los lados de cada banda, pero **es una
conjetura `dis` y no la doy por buena**: no hay ningún dato en el fichero que
la respalde.

## 4.2 El perfil `TSLOT` y cómo se atornilla todo a él

Medido por mapa de ocupación sobre la sección real del sólido, paso de retícula
0.5 mm (`analisis/secciones.json` → `mapas.TSLOT`):

| Cota `step` | Valor |
|---|---|
| sección | **80.000 × 40.000 mm** |
| longitud | **1497.362 mm** |
| módulo | 2 × 40 × 40 |
| **boca de ranura** | **8.2 mm** (paredes a ±4.1 del eje del módulo) |
| achaflanado de entrada | 1 × 1 mm, abre la boca a 10.2 en la superficie |
| labios de la ranura en T | de 1.8 a 4.5 mm de profundidad |
| mordaza exterior de la T | **14.516 mm** (±7.258) |
| cavidad bajo los labios | 20.8 mm (±10.4) |
| taladro central por módulo | **Ø6.800** (×2 en el perfil) |
| nº de ranuras | **6** — 2 por cara de 80, 1 por cara de 40 |
| **paso de ranuras en la cara de 80** | **40.000 mm** |

Es un perfil de **ranura 8, serie 40**, `web` (TSLOT-001). El fabricante no se
ha identificado.

**Cómo se atornilla:** con **112 `T-Sliding Nut M8`** (tuercas correderas,
7.20 × 22.00 × 13.50, rosca de Ø menor medido **6.647** = M8 exacta) alojadas en
las ranuras, más **64 tornillos `ASME/ANSI B18.3.5M - M8×16`** de cabeza
cilíndrica con hexágono interior y **48 arandelas `AS 1420 - 1973 - M8 × 16`**.
La tuerca de 7.2 mm de espesor entra bajo los labios, que dejan sitio desde
Z = 15.5 hacia dentro. Además: **40 `Unbrako M6 × 45`** (los tornillos radiales
de los casquillos de apriete Ø65 del árbol motriz), **64 `AS 1420 M4 × 12`** con
**64 `DIN 1587 M4`** ciegas y **64 `IFI 532 - 4`** dentadas en el conjunto
`IDLER-ENS`, y **24 `AS 1420 M10 × 50`**.

## 4.3 Los 8 `roller` y las 28 `guia`

**Los 8 rodillos** (`step`): eje `uni_003` **Ø20.000 × 940**; tubo `Uni_001`
**Ø30.000 exterior / Ø27.000 interior × 900** (pared 1.5); manguito `uni_002`
**Ø34.000 / Ø30.000 × 850** (pared 2.0, el que toca el producto); dos rodamientos
de agujas **SKF NK 19/20** (`web` BRG-001: Fw 19, D 27, C 20) alojados en el
Ø27.000 del tubo, uno en cada extremo, en Y = −1529.7 y Y = −649.7.
Van en **pares a ±46.832** del eje de cada calle, con la generatriz superior
en Z = 52.33. **Giran libres.** Función y estado: §2.

**Las 28 `guia`** (`step`, nombre XCAF `guiaw`): **39.900 × 200.000 × 18.550**,
de Z = 33.150 a Z = 51.700, **7 por calle × 4 calles**, colocadas testa con
testa a lo largo de Y de −1530.78 a −130.78 (**7 × 200 = 1400 mm** exactos).
Son la **cama de deslizamiento sobre la que corre el ramal portante de la banda**:
su cara superior queda **0.633 mm por debajo** del dorso de la banda, de modo que
el producto apoya en la banda y no en la guía. La sección no tiene ninguna cara
cilíndrica grande (sólo radios de Ø1 a Ø4): es un perfil prismático extruido. El
material no consta en el STEP; por función sería un plástico de deslizamiento
tipo UHMW-PE, pero **eso es hipótesis `dis`, no dato**. Las cierra por el extremo
`cierre guia` (39.900 × 80.000 × 15.100, 8 unidades, Z 36.60 … 51.70).

## 4.4 El tensor neumático: qué hace, con qué carrera y con qué fuerza

La banda de cada calle no es un lazo simple: es una **horquilla vertical**.
Perfil del lazo medido sobre la malla de la banda (`analisis/secciones.json` →
`banda.perfil_por_franja_20mm`, `step`):

- **ramal portante:** recto en Z = **52.333** de un extremo a otro.
- **ramal de retorno:** de Z = −52.33 a Z = −52.05, casi recto…
- **…salvo entre 240 y 360 mm del extremo motriz, donde baja hasta
  Z = −314.40.** Ésa es la horquilla.

Los que la forman son los dos volantes **lisos** (sin dientes) `guia_entrada_liso`
y `guia_salida_liso`: **Ø100.000 de cara útil × 34.0 de ancho, pestañas Ø110.000,
barreno Ø38.000**, con eje en **Z = −90.0** y en **Y = −404.32** y **Y = −195.52**.
Al ser lisos trabajan sobre el **dorso** de la banda: son volantes de contraflexión.
Su Ø100.000 es el mismo diámetro exterior que el de las poleas dentadas T5-63,
así que la banda no cambia de radio de trabajo.

En el fondo de la horquilla va el carro tensor: polea **`POL-CON-TEN` Ø117.9 × 40**
sobre dos rodamientos **`W 6004-2Z`** (`web` BRG-005, medido 20 × 42 × 12,
coincidencia exacta) retenidos por dos anillos **`ANSI B 27.7M - 3AMI-20`**
(`web` RING-001, para eje de 20; el eje `SCMRT906VCT-150-111` mide Ø20.000 →
coincide). Centro de esa polea: **Y = −175.72, Z = −371.89**.

El brazo del tensor son dos placas **`PZA-TEN-1` de 3.0 mm** (237.74 × 283.03)
que pivotan sobre un **eje transversal Ø25.000 × 603** (`EJE-25mm-PASADOR`) en
**Y = −101.72, Z = −164.70**, a través del casquillo **`BUJE-TECH-01`**
(Ø50.000 exterior / **Ø25.300** interior × 56) y del casquillo de PTFE
**`TEFLON 45-56.905`** (Ø45.000 / Ø25.300 × 55). El juego medido eje-casquillo
es **0.300 mm diametrales**. Ese eje se apoya en la chumacera de brida
**SKF UCFL 205** (`web` BRG-003, eje 25 mm; el eje mide Ø25.000 → coincide).

**El actuador:** `CD85N25-80T-B`, cilindro **ISO 6432 doble efecto** de SMC
(`web` PNEU-001). Medido en el STEP: **camisa interior Ø25.000** (el calibre de
catálogo, desviación **0.000 mm**), camisa exterior Ø26.600, cuerpo de 187.75 mm
en su eje; **vástago Ø10.000** y émbolo Ø25.000 (`C8525-80T_ROD_CPY2`). Trabaja
**vertical, según Z**, entre Z = −264.5 y Z = −76.8.

- **Carrera: 80 mm** `web`, de la designación. **No es medible** en el STEP: el
  modelo está en una sola posición. Lo único medible es que el conjunto
  vástago + horquilla llega hasta Z = −321.4.
- **Fuerza teórica** con el calibre y el vástago **medidos**, a 6 bar
  (la presión es hipótesis `dis`; el STEP no la declara):
  **empuje 294.5 N · tiro 247.4 N.**
  Sobre la polea del tensor eso da, a igualdad de brazo, unos **147 N por ramal**
  de tensión — cifra orientativa, porque la relación de brazos del balancín no
  se ha medido.
- Lo acompañan el regulador de caudal **`AS2201FS-01-06S`** (`web` PNEU-004,
  **meter-out**: regula el escape, o sea la velocidad de salida del vástago) y el
  silenciador **`AN101-01-01`**. La unión al brazo es la rótula **`KJ10D`**
  (`web` PNEU-006), que **no es un racor** como decía el encargo: tiene rosca
  hembra de Ø menor **8.647 mm** = **M10 × 1.25 exacta** (la rosca del vástago
  del C85 Ø25), taladro de bulón Ø10.000 y dos casquetes esféricos Ø19.000.
  Por eso vive en el subconjunto llamado `hoquilla-M10`.

## 4.5 Qué papel juega cada polea

| Polea `step` | n | Medida | Dónde | Papel |
|---|---|---|---|---|
| `motriz_63T` | 4 | pestañas Ø112.000, barreno Ø38.000, ancho 40.000; 256 caras planas (los 63 dientes) | Y 0, Z 0 | mueve la banda T5 de su calle. Primitivo 63 × 5/π = **100.268** |
| `conducida_63T` | 4 | idéntica | Y −1607.4, Z 0 | retorno de la banda |
| `guia_entrada_liso` | 4 | Ø**100.000** × 34.0, pestañas Ø110.000, barreno Ø38.000 | Y −404.32, Z −90.0 | contraflexión: mete el retorno en la horquilla |
| `guia_salida_liso` | 4 | idéntica | Y −195.52, Z −90.0 | contraflexión: saca el retorno de la horquilla |
| `Polea_AT10_32T_pestanas` | 4 | **32 fondos de diente de Ø100.000**, pestañas Ø112.000, **barreno Ø65.000**, ancho 42.000 | Y 0, Z 0 | recibe el accionamiento común. Primitivo 32 × 10/π = **101.859**; PLD medido 0.93 contra 1.0 nominal |
| `POL-CON-TEN` | 4 | Ø117.9 × 40 | Y −175.7, Z −371.9 | tensa la banda en el fondo de la horquilla |
| `POL-COND-TEN2` | 8 | cara Ø60.662 × 35, pestañas Ø71.581, barreno Ø25.478 | Y ≈ −1515 | reenvío en el extremo del motor |
| `IDLER-P01` | 4 | Ø40.024 × 30 **con bombeo de 0.62°**, pestañas Ø42.5, barreno Ø25.120 | Y ≈ −1607 | polea loca de `IDLER-ENS`, sobre 2 × `Bearing 6203 2RS` con `DIN 472` |

**Lo que no se puede explicar con lo que hay.** La cadena que va del motor a las
cuatro calles **no se puede trazar**: los cuatro `Polea_AT10_32T_pestanas` están
en Y = 0 y el `Ensamble motor` en Y ≈ −1490, y **no hay ninguna banda AT10 en el
modelo**. Además esas cuatro poleas AT10 **ocupan el mismo espacio** que las
`motriz_63T` (§5.2). Con este STEP **no sé cómo se transmite el par**, y no lo
invento.

Sobre el árbol de cada calle sí está medido: eje `SH-04` (**muñones Ø29.880**
para dos **SKF 1206 ETN9** de barreno Ø30 — `web` BRG-002 —, cuerpo Ø55.000,
93.22 de largo, barreno Ø24.060) en soportes `SOPORTE MOTRIZ 2 T` / `_MIR`, y
casquillos de apriete `LK30-C65-20H7-D30-RD` de **Ø65.000 exterior** que cierran
sobre el **barreno Ø65.000** de la polea AT10 — esa pareja de 65.000 contra
65.000 sí encaja.

---

# 5. DEFECTOS DEL MODELO DEL CLIENTE

Nueve cosas que hay que devolverle antes de trabajar sobre el fichero.

**5.1 Una pieza colocada a 271 metros.** `cal_4_f40___65/FRAME_MIR` está en
**Y = −271 393.910**. No es un error de lectura: el punto está escrito en el
propio STEP, entidad `#411681 = CARTESIAN_POINT('', (519.417725756884,
-271393.910233833, -24.1813936379805))`, y es la única coordenada del fichero
por encima de 5203 en valor absoluto. La pieza mide 34 × 1582.282 × 160 y es
**distinta** de `FRAME_MIR_MIR` (28 de espesor): no es un duplicado sin más.
**Falta un bastidor en su sitio.**

**5.2 Cuatro pares de poleas ocupando el mismo volumen.** Para las cuatro calles,
`motriz_63T` y `Polea_AT10_32T_pestanas` están **coaxiales y superpuestas**:
ambas en Y [−56.000, 56.000] y Z [−56.000, 56.000], con X solapado
(p. ej. calle 1: 63T en X [−19.000, 21.000] y AT10 en X [−21.000, 21.000]).
**40 mm de solape en toda la sección Ø112.** O son una sola polea compuesta sin
fusionar, o falta separarlas a lo largo del eje.

**5.3 Cuatro ejes de Ø25 en el mismo sitio.** `EJE-25mm-PASADOR` sale 4 veces,
una por `Tensor`, todos **Ø25.000 × 603, colineales** (misma Y = −101.7, misma
Z = −164.7) y desplazados 138.665 en X, así que se solapan entre sí. Físicamente
**es un solo eje transversal compartido** modelado dentro de un subconjunto que
se copió cuatro veces. Efecto secundario: la envolvente del conjunto se alarga
hasta X = −481.61 y +540.39, 372 mm más allá de los bastidores por cada lado.

**5.4 Una pieza huérfana duplicada.** Hay **9** `U_006` cuando deberían ser 8:
ocho dentro de `roller` (en Y −1545.69 … −1541.69) y **uno suelto en la raíz**,
desplazado **0.46 mm** (Y −1545.23 … −1541.23). Sobra.

**5.5 Un sólido con la orientación invertida.** `skf_bearing_1206_etn9_2_MIR`
da **volumen negativo** (−31 901.27 mm³) mientras su gemelo sin espejar da
+27 138.54. Al espejar no se corrigió la orientación. Además los dos volúmenes
**no coinciden** (−31 901 vs +27 139), lo que indica que no son la misma pieza
espejada sino dos geometrías distintas.

**5.6 La banda no es un sólido.** `banda_T5_3p4`: **0 sólidos, 29 shells**,
2170 caras, todas planas. No admite volumen ni masa, y **no se pueden contar sus
dientes**.

**5.7 Ocho ocurrencias vacías.** `rail/LK30-C65-20H7-D30-R` (×4) y
`rail/drive kit w timming/UA-DRIVE PULLEY` (×4): declaradas en el árbol, sin
una sola cara. Véase §2.5.

**5.8 Un rodamiento que no cabe en su eje.** `skf_bearing_nk_19_20_2` es una
**SKF NK 19/20**, cuyo Fw de catálogo es **19 mm** (`web` BRG-001), y va montado
sobre `uni_003`, medido **Ø20.000**. Son **1.0 mm de interferencia diametral**
contra el catálogo (y **0.4 mm** contra la propia pista interior modelada, que
mide Ø19.600). O el eje real es Ø19, o el rodamiento real es una NK 20/20.
**A resolver con el cliente.**

**5.9 Un rodamiento modelado fuera de cota.** `skf_bearing_1206_etn9_2`:
exterior modelado **Ø61.700** contra los **Ø62.000** de catálogo (`web` BRG-002).
0.300 mm de menos. La anchura, 16.000, sí coincide.

Para el registro, `analisis/acople.json` → `solapes_de_caja` recoge **1477**
pares de ocurrencias de ramas distintas cuyas cajas exactas se solapan más de
0.5 mm en los tres ejes y más de 2 cm³. **Una caja solapada no prueba que los
sólidos choquen** —las cajas son envolventes—, pero es la lista por donde
empezar a mirar; los peores 40 están ordenados por volumen de solape.

---

# 6. RESUMEN DE COTAS DE ACOPLAMIENTO

| Cota | Sorter CO `step` | `nbt90` congelado | ¿Coincide? |
|---|---|---|---|
| paso entre bandas | **138.665** | 76.2 | **NO** · +62.465 (1.82×) |
| nº de bandas | **4** | 5 | **NO** · falta una |
| ancho de banda | **32.000** | ventana 31.75 | **casi** · +0.25 (0.8 %) |
| ancho de la calle en la franja del rodillo | **40.000** | 31.75 | **NO** · +8.25 |
| plano de transporte | **Z = +52.333** | referencia | — |
| luz entre bastidores (en el deck) | **580.841** | BR 457.2 / ext. 534.7 | **SÍ** · +123.6 / +46.1 |
| luz entre chapas interiores | **554.001** | ext. 534.7 | **SÍ** · +19.3 |
| largo libre en el flujo, hoy | **468.0** | 463 | **justo** · +5.0 |
| largo libre en el flujo, sin §2 | **1258.0** | 463 | **SÍ** · +795.0 |
| **profundidad libre bajo la cubierta** | **87.4 … 165.4** en el 78 % del hueco | **390.6** | **NO** · falta hasta 303 mm |
| rodillos ya presentes | 8 × Ø34.000 × 850, eje ∥ flujo, ±46.832 | 6 × Ø34.925 × 375 a paso 76.2 | **NO** · hay que quitarlos |
| perfil de la calle | TSLOT 40 × 80, ranura 8.2, paso de ranura 40 | — | — |
| paso entre estaciones en Y | no aplica: las 4 son **paralelas**, no consecutivas | — | — |

**Corrección al enunciado del encargo:** el árbol no tiene «cuatro estaciones»
una detrás de otra. Tiene **cuatro calles paralelas** repartidas a lo ancho, a
paso 138.665 en X, cada una con su `Conjunto_T5_hairpin_vertical`, su `rail`,
su `Tensor`, su `cilindro`, su `hoquilla-M10`, su `IDLER-ENS`, su
`Polea_AT10_32T_pestanas` y su `SOPORTE MOTRIZ 2 T`. Por eso **no existe**
«distancia entre estaciones» a lo largo del flujo: la cota equivalente es el
paso transversal, y es la del §1.1.

---

# 7. RESPUESTA A LAS DOS NOTAS ABIERTAS DE `ADAPTACION.md`

## 7.1 El rodillo de retorno B-20760: **no aplica**

En el NBT90 ese rodillo Ø1.9" limita los **ramales de retorno** de las bandas
planas del anfitrión, que corren sueltos por debajo del bastidor. Medido en el
sorter CO, esa función ya está resuelta y en otro sitio:

- el ramal de retorno de cada calle **no corre suelto**: entra en una horquilla
  vertical guiada por dos volantes lisos Ø100.000 con pestañas Ø110.000
  (`guia_entrada_liso` / `guia_salida_liso`), que lo encarrilan lateralmente;
- el retorno baja hasta **Z = −314.40**, es decir **366.7 mm por debajo** del
  plano de transporte, mientras que el rodillo de retorno del NBT90 vive a
  61.4 mm del plano de banda (`P.bandaRetornoDZ`). **No hay nada que limitar a
  esa cota**: a 61.4 mm bajo la cubierta del sorter CO no pasa ningún ramal.

**Conclusión medida: el B-20760 sobra en esta integración.** Lo que sí hay que
mirar en su lugar es el choque contrario — la horquilla y su tensor ocupan
justamente el volumen que quiere el módulo (§1.4).

## 7.2 El sistema de perfil: la familia está medida, la marca no

La lectura de `ADAPTACION.md` («sistema item/item24») es **compatible** con lo
medido, pero lo medido no llega a la marca. Lo que sí está determinado `step`:

| | Medido |
|---|---|
| sección | 80.000 × 40.000, módulo 40 × 40 |
| boca de ranura | **8.2 mm** → familia **ranura 8, serie 40** |
| paso de ranuras en la cara de 80 | 40.000 |
| taladro central por módulo | Ø6.800 (el de roscar M8) |
| tuerca corredera | `T-Sliding Nut M8`, 7.20 × 22.00 × 13.50, rosca M8 confirmada por Ø menor 6.647 |
| tornillo asociado | `ASME/ANSI B18.3.5M - M8×16` (cabeza cilíndrica con hexágono interior) |

Ranura 8 con núcleo Ø6.8 y tuerca T de 13.5 es la geometría común de **item /
Bosch Rexroth / Minitec y sus equivalentes**. **El STEP no nombra al
fabricante**, así que la percha de montaje se puede diseñar contra estas cotas
—que son las que importan— pero la designación de catálogo hay que pedírsela al
cliente. Queda anotado en `web_facts.json` → `pendientes_sin_fuente`.
