# NBT90 — Revisión estructural y dinámica

Revisión de **resistencia y funcionamiento** de la transferencia 90° de rodillos
emergentes, no de encaje. Fecha: **2026-07-29**. Se revisa el ensamble emitido por
`gen_nbt90.mjs` (410 piezas) y los cuatro módulos de diseño.

**No se ha tocado geometría.** Lo único que se ha modificado son: las
comprobaciones nuevas de la compuerta (`gen_nbt90.mjs` §9), los datos de entrada
que necesitan (bloque `LIM`, con su procedencia), la verificación de masa de
`tests/test_nbt90.mjs` y los 12 hechos nuevos de `analisis/web_facts.json`. Todo
hallazgo que exige mover una cota se describe aquí con el número exacto y se deja
al dueño del módulo.

## Cómo leer esto

Está ordenado por **gravedad**, no por tema. Cada hallazgo lleva:

- **qué pasa**, con el número;
- **de dónde sale cada dato de entrada** (`med` medido · `cat` catálogo ·
  `web` fuente citada en `analisis/web_facts.json` · `txt` texto del manual ·
  `dis` decisión de diseño · `calc` calculado aquí);
- **contra qué criterio** se compara;
- **qué habría que cambiar**.

Y se distingue **NO CUMPLE** · **CUMPLE JUSTO** (margen < 1.35) · **CUMPLE** ·
**NO SE PUEDE SABER**.

Las 21 comprobaciones nuevas están en `gen_nbt90.mjs` §9 y su resultado viaja en
`meta.verificaciones.estructural` del ensamble. Las 5 que hoy incumplen están en
`HALLAZGOS_ABIERTOS` con su utilización registrada: **si una empeora, la compuerta
para**; si una se arregla, la compuerta obliga a borrar la dispensa.

---

## Resumen: el resultado del §9

| id | comprobación | valor | límite | uso | fuente del límite |
|---|---|---|---|---|---|
| **DIN-01** | velocidad declarada vs. real | 2.06× | 1.05× | **1.96** | coherencia interna |
| **EST-03** | vuelco: no despegar el apoyo de la horquilla | 63.52 N·m | 52.37 N·m | **1.21** | equilibrio + FS 1.5 `dis` |
| **DIN-12** | el bulto no despega al frenar el pop-up | 14.53 m/s² | 9.81 m/s² | **1.48** | g |
| **EST-05** | borde del taladro del perno de rodillo | 9.01 mm | 9.53 mm | **1.06** | AISI S100-16 J3.2 (`web` STR-001) |
| **EST-10** | flexión del alma del canal bajo el cilindro | 182.8 MPa | 150 MPa | **1.22** | 0.6·Fy A36 (`web` STR-005) |
| DIN-02 | velocidad periférica del rodillo | 1.85 m/s | 2.0 m/s | 0.93 | Interroll (`web` ROD-007) |
| DIN-04 | patinaje del bulto hasta sincronizar | 350.8 mm | 381 mm | 0.92 | campo de rodillos |
| DIN-07 | deslizamiento de la banda en la rueda | 2.62 | 2.83 | 0.92 | Eytelwein + FS 1.3 `dis` |
| DIN-03 | empuje disponible en la cara del rodillo | 201.0 N | 166.7 N | 0.83 | µ·m·g con µ = 0.5 `dis` |
| EST-01 | la corona del eje no despega de la placa | 8 828 N·mm | 11 302 N·mm | 0.78 | precarga Gr5 + FS 1.5 |
| EST-07 | carga radial en el eje del SEW | 542.0 N | 695 N | 0.78 | FRa SEW (`web` MOT-009) |
| DIN-09 | vida L10 del rodamiento del rodillo | 26 480 h | 20 000 h | 0.76 | ISO 281 + objetivo `dis` |
| DIN-05 | tensión del ramal tenso | 392.7 N | 533.8 N | 0.74 | k_adm Habasit (`web` BELT-005) |
| DIN-06 | Ø mínimo de envoltura de la banda | 28.92 mm | 25.4 mm | 0.88 | Dmin Habasit (`web` BELT-005) |
| DIN-08 | coeficiente estático del rodamiento | 2.39 | 1.5 | 0.63 | ISO 281 s₀, C0 (`web` BRG-006) |
| EST-02 | tensión del eje de rodillo (junta cerrada) | 71.7 MPa | 150 MPa | 0.48 | 0.6·Fy A36 |
| EST-04 | carga lateral en Y sobre la placa | 166.7 N | 352 N | 0.47 | SMC (`web` PNEU-019) |
| DIN-13 | vida L10 de las poleas locas | 51 286 h | 20 000 h | 0.39 | ISO 281 |
| EST-06 | desgarro de la placa peine | 1 117 N | 12 595 N | 0.09 | AISC J3.10 (`web` STR-004) |
| EST-09 | impacto contra los 8 pernos 3/8" | 2 710 N | 37 556 N | 0.07 | rozamiento con precarga |
| ~~EST-08~~ | conjuntos soldados sin cordón declarado | 0 | 0 | — | **cerrado el mismo día** |

---

# A · NO CUMPLE

## A1 — El cassette es una mesa apoyada en un solo punto: un bulto excéntrico está a un 24 % de despegar el apoyo `EST-03`

**Qué pasa.** Todo el conjunto móvil —55 kg declarados, 41 kg si se pesan los
sólidos— se sostiene sobre **dos zonas de contacto** de la horquilla de empuje, a
Y = ±90 mm del eje del cilindro (`elevacion.mjs`: `contactoY = [80,120]`,
`brazoY1 = 100`, o sea 20 mm de contacto por brazo, `dis`). No hay nada más: los
**4 pasadores guía** trabajan en **colisas verticales** (`guiaRecorrido = 12`,
`dis`), así que no pueden dar ninguna reacción en Z ni ningún momento alrededor de
X o de Y. Son guía lateral, no apoyo.

Un bulto de 34 kg (`web` SORT-013/014: *«Maximum unit package weight of 75 lbs»*)
sobre el rodillo extremo, Y = ±190.5 mm (`med`, paso 3" × 5/2):

| magnitud | valor | de dónde |
|---|---|---|
| momento de vuelco alrededor de X | **63.52 N·m** | `calc` 34 × 9.80665 × 0.1905 |
| momento al que se despega el apoyo −Y | **78.55 N·m** | `calc` (55 + 34) × 9.80665 × 0.090 |
| **FS al despegue** | **1.24** | |
| … con la masa que pesan los sólidos (40.98 kg) | **1.04** | `calc`, `tests/test_nbt90.mjs` |

Y basta con que el bulto esté **a 65.7 mm del centro** para superar el único
momento que SMC publica para el MGPM80 (21.9 N·m) — aunque ése es el par
**alrededor del eje del vástago**, no el de vuelco, y por tanto no es el criterio
correcto (ver D1).

**Contra qué criterio.** Equilibrio estático del cassette, con FS 1.5 al despegue
(`dis`: es el margen mínimo razonable en una máquina que además recibe un impacto
cada ciclo). El diseño da 1.24 con la masa declarada y 1.04 con la real.

**Qué pasa si despega.** El cassette bascula sobre la línea del apoyo +Y hasta que
los pasadores guía topan en el extremo de sus colisas —1 mm de sobrerrecorrido a
cada lado (`calc`: `zPin = guiaZ + guiaRecorrido/2 − 1`)—, o sea **hasta 2 mm de
desnivel entre los extremos del campo de rodillos**, y en ese momento la carga
vertical se la comen los 4 pasadores Ø12.7 en voladizo dentro de chapa de 3/16",
que no están dimensionados para eso.

**Qué habría que cambiar** (dueño: `elevacion.mjs`). Tres opciones, por orden de
coste:

1. **Separar los apoyos de la horquilla en Y.** Con los apoyos a Y = ±150 en vez
   de ±90 el momento de despegue sube a 130.9 N·m y el FS a 2.06. Los `notched
   brace channel` están en Y = ±(80…120), así que esto obliga a moverlos o a
   añadir un travesaño de apoyo más ancho.
2. **Apoyo antivuelco pasivo:** dos topes fijos bajo el cassette a |Y| ≈ 185 que
   sólo trabajen cuando el apoyo se descarga. No participan en el guiado y no
   necesitan precisión.
3. **Que los 4 pasadores guía tomen carga vertical** (rodillos-leva sobre carril
   en vez de pasador en colisa). Es la solución limpia y la más cara.

**Lo que NO sirve:** subir la masa móvil declarada. Ojo con esto, porque es
contraintuitivo: `masaMovilKg = 55` (`dis`) está **por encima** de los 41 kg que
pesan los sólidos, y eso es conservador para el factor de seguridad del actuador y
para la energía cinética, pero **anticonservador aquí**, porque la masa móvil es lo
único que estabiliza el cassette. Por eso `tests/test_nbt90.mjs` ahora comprueba
las **dos** cotas: que la declarada cubra la pesada y que no la sobrestime más de
un 60 %.

---

## A2 — La velocidad de transferencia del modelo es 2.06 veces la que declara `params.mjs` `DIN-01`

**Qué pasa.** `P.velocidad = 0.9` lleva escrito `dis: v = π·Ø·rpm/60 con Ø34.93 y
462 rpm ≈ 0.845 m/s`. Ese cálculo supone que el rodillo gira a la velocidad del
**motor**. No gira: entre el motorreductor y el rodillo hay una **multiplicación**
de banda plana.

| eslabón | Ø | de dónde |
|---|---|---|
| rueda motriz | 63.5 mm | `cat` 024.15502 (`web` TR-004) |
| tubo desnudo del rodillo (donde apoya la banda) | 28.925 mm | `calc` = `P.rodDia − 2·P.rodVulcE`, nota de coherencia de `rodillos.mjs` |
| **relación** | **2.195** | |

- velocidad de banda: **1.536 m/s** (`calc`, π·0.0635·462/60)
- **giro del rodillo: 1 014 rpm**, no 462
- **velocidad de la cara vulcanizada: 1.855 m/s = 365 fpm**

El propio `transmision.mjs` ya lo reporta correctamente
(`cinematica.vTransferencia_m_s = 1.86`): el error está sólo en `params.mjs`, y
como nada del código lee `P.velocidad`, nadie lo había notado. Pero es el número
con el que se piensa el resto del sistema.

**Contra qué criterio.** Coherencia interna: la cota declarada tiene que ser la
que sale de la cinemática, con 5 % de tolerancia.

**Por qué importa, además de por higiene.** De esa velocidad cuelgan tres
hallazgos más: el patinaje del bulto (A4/B2), la velocidad periférica frente al
límite de catálogo de un rodillo transportador (B1) y las 1 014 rpm con las que se
calcula la vida de los rodamientos (B5). Es coherente con la ficha del fabricante
—Hytrol declara el ProSort MRT *«Capable of 350 FPM»* (`web` SORT-016)—, así que
el equipo **está bien concebido a esa velocidad**; lo que está mal es el número
escrito.

**Qué habría que cambiar** (dueño: `params.mjs`): `velocidad: 1.855` con la
justificación `calc` de la multiplicación, o mejor, borrarlo y que se lea de
`transmision.cinematica`, que es quien lo sabe.

---

## A3 — Al frenar el pop-up el bulto se despega de los rodillos `DIN-12`

**Qué pasa.** `elevacion.mjs` elige la velocidad de subida por la energía cinética
admisible del cilindro: **241.06 mm/s** con 2.71 J (`cat`/`web` PNEU-019). Al
llegar al tope de goma, esa velocidad se anula:

| magnitud | valor | de dónde |
|---|---|---|
| velocidad de impacto | 241.06 mm/s | `elevacion.mjs`, `cat` Ek = 2.71 J |
| aplastamiento del tope supuesto | 2.0 mm | **`dis`** — SMC no lo publica (ver D2) |
| deceleración | **14.53 m/s² = 1.48 g** | `calc` u²/(2δ) |
| salto del bulto | **2.96 mm** | `calc` u²/(2g) — **no depende de δ** |
| energía con la que reasienta | **0.99 J** | `calc` ½·34·0.241² |

El salto de 2.96 mm es independiente del aplastamiento del tope: en cuanto la
deceleración supera 1 g, el bulto —que no está sujeto— sigue subiendo por su
cuenta y vuelve a caer sobre los rodillos. Se lleva 0.99 J que entran en el tubo,
los rodamientos, el eje y la placa peine.

**Contra qué criterio.** El bulto no puede despegar: deceleración ≤ g.

**Qué habría que cambiar** (dueño: `elevacion.mjs`). Es el hallazgo más barato de
todos: **estrangular el cilindro a ≤ 198.06 mm/s** (`calc` √(2·g·δ)). Sigue muy
por encima del mínimo de émbolo del catálogo (50 mm/s, `web` PNEU-019) y sólo
alarga la subida de 58 a 71 ms, irrelevante frente a los 600 ms de ciclo a 100
sorts/min (`web` SORT-015). Con eso además la energía de impacto baja de 2.71 J a
1.83 J y aparece el margen que hoy no existe (ver A6).

---

## A4 — El alma del canal de montaje del cilindro trabaja a 183 MPa `EST-10`

**Qué pasa.** El MGPM80 se atornilla **encima** del alma del `CYLINDER MOUNTING
CHANNEL`, que es chapa de **12 GA = 2.657 mm** (`cat` `P.cal12`, `web` HW-004) con
un **vano libre de 231.3 mm** entre las dos alas (`med` `P.canalCilY = 234`). La
huella del cilindro, 91.5 × 202 mm (`cat` G × H, `web` PNEU-016), cae **justo en
el centro del vano**.

Banda de 1 mm de ancho, apoyada en las dos alas:

| magnitud | valor | de dónde |
|---|---|---|
| carga estática sobre el alma | 936.4 N | `calc` (55+34)·g + 6.49·g (masa del cilindro, `cat`) |
| carga por mm de ancho | 4.635 N/mm | `calc` /202 |
| momento | 215.2 N·mm/mm | `calc` P/8·(2L − a) |
| **tensión** | **182.8 MPa** | `calc` /(t²/6) |
| … con la aceleración de la carrera (a = v²/2s = 2.9 m/s²) | **≈233 MPa** | `calc` |

**Por qué se calcula apoyada y no empotrada.** Las alas del canal son secciones
abiertas de 103 mm de alto en 12 GA: su rigidez torsional es GJ/L ≈ 1.1·10⁵
N·mm/rad (`calc`), o sea que un momento de borde de 27 N·m las giraría 14°. No
empotran nada. Con empotramiento perfecto saldrían 114 MPa; el valor real está
mucho más cerca de 183.

Y hay un agravante geométrico: **los dos taladros Ø30 de paso de las varillas guía
están en X = 231.5, exactamente en el centro del vano** —la sección de momento
máximo— a Y = ±78.

**Contra qué criterio.** 0.6·Fy con Fy = 250 MPa de A36 (`web` STR-005) = 150 MPa.
El material real de la chapa no se declara (`chapa.material: 'acero al carbono 12
GA'`), así que A36 es el mínimo defendible.

**Qué habría que cambiar** (dueño: `elevacion.mjs`): una **placa de refuerzo de
3/16" bajo la huella del cilindro** —soldada o atornillada con los mismos 4 M12—
o un **nervio transversal** que reduzca el vano de 231 a ~115 mm. Con el vano a la
mitad la tensión baja a 55 MPa. No hace falta cambiar el canal ni la cadena de
alturas.

---

## A5 — El taladro del perno de rodillo queda a 1.42·d del canto `EST-05`

Esta cota venía ya declarada como floja en `bastidor.mjs`. **Se confirma que
incumple, pero no por donde el comentario dice, y la consecuencia real es otra.**

**Qué pasa.**

| magnitud | valor | de dónde |
|---|---|---|
| canto superior del diente `peineZt` | 388.5 mm | `dis` (`bastidor.mjs`) |
| eje del rodillo elevado `P.rodZ` | 379.49 mm | `calc` de `planoBanda + emerge − rodDia/2` |
| **distancia al borde** | **9.01 mm = 1.419·d** | `calc` |
| mínimo exigido | **9.525 mm = 1.5·d** | **`web` STR-001** |
| déficit | **0.51 mm (5.4 %)** | |

**El comentario del código atribuye el mínimo a AISC y eso es incorrecto.** La
tabla J3.4 de AISC **no tabula tornillos menores de 1/2"**: su primera fila es
7/8" para 1/2" en canto cizallado (`web` STR-004). El criterio que sí aplica a una
placa de 3/16" con un tornillo de 1/4" es **AISI S100-16 J3.2**, *«The distance
from the center of a fastener to the edge or end of any part shall not be less
than 1.5d»* (`web` STR-001). El número, 9.525, es el mismo; la fuente, no. Y la
placa cae exactamente en la frontera: la tabla J3.3.1-1 de AISI acota su rango en
t < 0.1875" = 4.76 mm y la placa peine mide 4.763.

**Qué implica de verdad — y esto es lo importante.** Es un **requisito de detalle,
no de resistencia**. La resistencia se comprueba con el desgarro de AISC J3.10
(`web` STR-004), `EST-06`:

- distancia libre Lc = 9.01 − 7.0/2 = **5.51 mm** (`calc`)
- Rn = 1.2·Lc·t·Fu = 1.2 × 5.51 × 4.763 × 400 = **12 595 N**
- carga real por extremo de eje: **558.6 N** (`calc`, banda + bulto en un rodillo)
- **FS = 22.6**, y además **la carga del rodillo empuja hacia ABAJO**, o sea
  alejándose del canto corto. El desgarro hacia el canto superior no es un modo de
  fallo posible con carga de servicio.

Lo que sí se juega en esos 0.51 mm es **la fabricación**: 5.51 mm de ligamento en
chapa de 3/16" no admite punzonado sin abombar o agrietar el canto. Si el taladro
se punzona, el requisito de 1.5·d existe precisamente para eso.

**Qué habría que cambiar** (dueño: `bastidor.mjs`). El comentario dice que no se
puede subir `peineZt` porque el plano de bandas está 2.1 mm más arriba. **Sobra
sitio**: hay que subirlo **0.52 mm**, de 388.5 a **389.02**, y quedan **1.58 mm**
al plano de bandas. Comprobado que no rompe nada más:

- el diente sigue por debajo de la cara superior de las bandas del anfitrión;
- el bulto va 6.35 mm por encima del plano de bandas, así que libra el diente por
  7.93 mm en vez de 8.45;
- retraído el diente baja a 379.02 y el bulto pasa a 11.58 mm;
- el fondo del hueco de paso de la banda (`huecoZ = 320`) no se toca.

Alternativa si esos 0.52 mm resultaran intocables: **taladrar, no punzonar**, y
declararlo en el plano. Es la solución de coste cero, pero deja el modelo fuera de
norma y hay que escribirlo.

---

# B · CUMPLE JUSTO

## B1 — 1.855 m/s es el 93 % de la velocidad máxima de cualquier rodillo transportador de catálogo `DIN-02`

Interroll acota la velocidad de transporte por plataforma de rodamiento (`web`
ROD-007): 0.3 m/s para un rodillo Ø30 con rodamiento de acero, 0.5 m/s para la
plataforma de carga pesada y **2.0 m/s para la plataforma 1700**, que es la de
rodamientos rígidos de bolas de precisión — la familia del 608 que declara
`params.mjs`. El NBT90 va a **1.855 m/s: el 93 %**. No incumple, pero no queda
margen para subir la velocidad del sorter, y a esa velocidad no vale cualquier
rodamiento de rodillo transportador.

## B2 — El bulto patina 351 mm de los 381 que tiene de campo `DIN-04`

Al emerger, el bulto está **parado en Y** y la cara del rodillo va a 1.855 m/s.

| magnitud | valor | de dónde |
|---|---|---|
| µ bulto ↔ vulcanizado | 0.50 | **`dis`** (rango 0.35–0.70; ver D5) |
| aceleración disponible | 4.90 m/s² | `calc` µ·g, limitada además por el empuje |
| tiempo hasta sincronizar | **378 ms** | `calc` |
| **patinaje relativo** | **350.8 mm** | `calc` v²/(2a) |
| campo de rodillos | 381 mm | `med` (6−1)·3" |

O sea: **el bulto llega al borde del módulo casi sin haber sincronizado**, y el
vulcanizado restriega 351 mm bajo 34 kg en cada transferencia. Eso no es un fallo
—es cómo funciona cualquier transferencia de rodillos emergentes—, pero tiene tres
consecuencias que conviene tener escritas:

1. **desgaste del vulcanizado**: es la razón real de que el rodillo lleve goma, y
   la razón de que ROD-005 (`web`) hable de camisas de 1/8" y no de 3 mm;
2. **la velocidad de descarga no es 1.855 m/s** sino la que haya alcanzado al
   salir: con µ = 0.5, ≈1.5 m/s en el borde del campo;
3. con µ = 0.35 el patinaje sube a **501 mm** y ya no cabe: el bulto sale del
   módulo todavía acelerando. Es el caso a vigilar con producto de superficie
   deslizante o con polvo.

## B3 — El motorreductor satura en µ = 0.60 `DIN-03`

| magnitud | valor | de dónde |
|---|---|---|
| par de salida | 7.71 N·m | `calc` de `P.motorHP` 0.5 hp y `P.motorRpm` 462 (`cat`, `web` MOT-001) |
| tiro de banda | 242.7 N | `calc` /r rueda |
| **empuje en la cara del rodillo** | **201.0 N** | `calc` × Ø28.93/Ø34.93 |
| fuerza necesaria con µ = 0.5 | 166.7 N | `calc` |
| **µ al que satura** | **0.60** | `calc` |

Con un solo bulto de 34 kg y µ = 0.5 hay un 21 % de margen. **Con µ = 0.6 el
motorreductor está exactamente en el límite**, y con dos bultos simultáneos sobre
el módulo no llega. Cartón sobre goma vulcanizada está perfectamente en ese rango.

**Qué habría que hacer:** medir µ, o declarar en la especificación que la
transferencia admite **un bulto a la vez**. El VFD que menciona el manual (`web`
TR-008) permite bajar la velocidad, lo que sube el par disponible: a 300 rpm de
motor el empuje sube a 310 N.

## B4 — La corona del eje de rodillo sólo aguanta cerrada si el perno es Gr5 `EST-01` `EST-02`

Éste es el hallazgo más fino de la revisión y merece el detalle, porque cambia por
completo la respuesta a *«¿aguanta el eje?»*.

**El eje NO está simplemente apoyado.** Sus dos coronas Ø12.70 van **apretadas**
contra la cara interior de la placa peine por los pernos 1/4-20 que entran desde
fuera. Eso es un **empotramiento elástico**, y su rigidez la da el **diente de la
placa peine trabajando fuera de su plano**:

| magnitud | valor | de dónde |
|---|---|---|
| rigidez rotacional del diente (voladizo 34.2 × 4.763, h = 59.5) | 1.035·10⁶ N·mm/rad | `calc` |
| rigidez de la viga 3EI/L (Ø7.94, L = 378) | 3.093·10⁵ N·mm/rad | `calc` |
| **grado de empotramiento** | **0.77** | `calc` |

Y con eso el eje trabaja **bien**:

| caso | σ en Ø7.94 | criterio |
|---|---|---|
| junta cerrada (empotramiento 0.77) | **71.7 MPa** | 0.6·Fy(A36) = 150 → **uso 0.48** |
| **junta abierta (apoyo simple)** | **251.4 MPa** | **por encima de 150 y de la fluencia de un 1018 estirado con Kf en el escalón** |

**Todo depende de que la corona no despegue.** El momento de apertura de una
corona anular Ø12.70/Ø6.35 con precarga F:

| perno | precarga (K = 0.20) | M de despegue | M aplicado | uso |
|---|---|---|---|---|
| **SAE J429 Gr2** a 5 ft·lb | 5 338 N | 10 592 N·mm | 8 828 N·mm | **0.83 — sin margen** |
| **SAE J429 Gr5** a 8 ft·lb | 8 543 N | 16 953 N·mm | 8 828 N·mm | 0.52 → FS 1.92 |

(pares de `web` HW-008, cargas de prueba de `web` HW-007, áreas de `web` HW-011.)

**El modelo no declara grado de tornillería en ninguna parte.** El manual sólo dice
*«3/8 in. bolts»* (`txt` pág. 8). Con tornillo del comercio sin marcar —que es Gr2—
la unión está al 83 % de abrirse, y si se abre el eje pasa de 72 a 251 MPa.

**Qué habría que cambiar** (dueño: `rodillos.mjs`, y en el plano):
`1/4-20 UNC SAE J429 Gr5, par 8 ft·lb (10.85 N·m), con freno de rosca`. La
comprobación `EST-01` de la compuerta ya lo exige: está escrita con Gr5 y con Gr2
falla. Falta también:

- **el grado de acero del eje** (hoy `material: 'acero estirado en frío'`, sin
  grado) — se juzga contra A36 por defecto, que es el mínimo defendible;
- **el radio del escalón Ø12.70 → Ø7.94**, que hoy se dibuja vivo. Con la junta
  cerrada el momento en esa sección es pequeño y da igual; con la junta abierta,
  un escalón vivo (Kt ≥ 2.5, D/d = 1.6) lleva el pico a ~380 MPa y **el criterio
  de Goodman no se cumple ni con 1018 ni con 1045 estirado**. Es la segunda razón
  para asegurar el apriete.

**Y una recomendación de fondo:** el problema desaparece si el eje es **Ø12.70 en
toda su longitud** con rodamiento de barreno 1/2" (R8-2RS, el mismo que ya monta
el rodillo de retorno). σ en el caso más desfavorable, aun con la junta abierta:
**61.3 MPa**. Es además lo que exige el catálogo de ED&T que cita el propio módulo
(`web` ROD-ED&T-001/002: Interroll no ofrece *end drilled & tapped* por debajo de
Ø12), y de paso resuelve B6.

## B5 — Vida L10 de los rodamientos del rodillo: 26 500 h, y depende de una tensión de banda que nadie ha fijado `DIN-08` `DIN-09`

Nadie había calculado la carga de los rodamientos de los **rodillos** (el módulo sí
la calcula para las poleas locas). Y la carga dominante **no es el bulto: es la
banda**.

**Reparto de tensiones del serpentín** (`calc`, con T₂ = 150 N `dis` de
`transmision.mjs` y las envolventes reales del módulo):

- Un rodillo envuelto ~187° con tensiones Ta y Tb ve una resultante ≈ Ta + Tb.
- Con el bulto sobre **un** rodillo, todo el salto de tensión se concentra ahí y
  **todo el ramal anterior queda a T₁**. Un rodillo que no transmite ningún par
  sigue cargando **2·T₁**.

| caso | fuerza radial en el rodillo | por rodamiento |
|---|---|---|
| marcha en vacío real (sólo pretensión) | 300 N | 150 N |
| par pleno repartido entre los 6 | 743 N | 372 N |
| **par pleno + bulto en un rodillo** | **1 117 N** | **559 N** |

| magnitud | valor | criterio |
|---|---|---|
| 608-2RS: C = 3 207 N, C0 = 1 334 N | `web` BRG-006 | |
| coeficiente estático s₀ | **2.39** | ≥ 1.5 (carga con choque) → uso 0.63 |
| **L10 con el 10 % de duty** | **26 480 h** | objetivo 20 000 h (`dis`) → uso 0.76 |
| L10 con bulto permanente | 3 109 h | |
| L10 con el 20 % de duty | **14 510 h** | **por debajo del objetivo** |

**Lo que hay que entender de esto:** la vida sale de un `T₂ = 150 N` que es una
**decisión de diseño local de `transmision.mjs`, sin exportar y sin justificar**, y
la vida va con el cubo de la carga. Si el montador tensa la banda al doble —cosa
normalísima cuando el procedimiento es *«tension belt by pushing take-up idler
down»* (`txt` pág. 8) sin ningún número—, la vida cae a **una octava parte**.

**Qué habría que hacer:**
1. **Especificar la tensión de montaje** con un método medible (flecha bajo carga o
   frecuencia del ramal libre), no «apretar hasta que no patine».
2. Exportar `T2` desde `transmision.mjs` en vez de dejarlo como constante local.
   La compuerta ya lo reconstruye de las métricas del módulo y **falla si cambia
   sin avisar**.
3. Revisar el duty real de este divert. A partir del 15 % de duty no llega a los
   20 000 h.

## B6 — El rodamiento del rodillo no tiene ajuste: tiene 0.07 mm de holgura

`P.rodRodam = { bore: 8, … }` (`dis`) montado sobre `P.rodHex = 5/16" = 7.9375 mm`:

| magnitud | valor | de dónde |
|---|---|---|
| barreno 608 clase P0 | 7.992 … 8.000 | `web` BRG-007 |
| eje 5/16" h6 | 7.9285 … 7.9375 | `calc`, IT6 = 9 µm |
| **juego diametral** | **0.055 … 0.072 mm** | `calc` |

No es un ajuste deslizante: es holgura franca, y es la consecuencia de montar un
**rodamiento métrico sobre un eje en pulgadas**. El aro interior está quieto y la
carga también, así que un ajuste flojo es admisible en principio — pero 0.07 mm es
un orden de magnitud más que el juego de un montaje flojo normal (g6/h6, ~0.01
mm), y con la carga pulsante de cada bulto el aro martillea y se produce corrosión
por rozamiento.

**Qué habría que cambiar** (dueño: `rodillos.mjs` / `params.mjs`): o eje métrico
Ø8 h6 con el 608, o —mejor, y coherente con B4— **eje Ø1/2" con R8-2RS**, que es
la serie en pulgadas que ya usa el rodillo de retorno del mismo módulo.

## B7 — El motorreductor va al 78 % de su carga radial admisible, medida en el punto equivocado `EST-07`

| magnitud | valor | de dónde |
|---|---|---|
| resultante de la banda sobre la rueda motriz (T₁ + T₂, 187°) | **542.0 N** | `calc` |
| FRa del R07/RF07 DT71D4 | **695 N** | `cat`/`web` MOT-009 |
| uso | 0.78 | |

Pero **la FRa de SEW está definida en el punto medio del eje macizo**, y aquí la
rueda motriz queda a **34.35 mm de la cara de la brida** (`calc`: centro de la
rueda en X = 85, brida en X = 119.35). Para un eje estándar de Ø20 la corrección
por aplicación descentrada reduce la admisible; SEW la hace con dos constantes a y
b que esta hoja de catálogo **no publica** (ver D3). Con una regla de palanca
simple la admisible corregida bajaría a ~400 N y **no cumpliría**.

Se añade además el peso del motorreductor en voladizo: 7.9 kg (`cat`, `web`
MOT-007) con el centro de gravedad estimado en X = 247 (`dis`) → **9.89 N·m** sobre
la placa soporte, que reparte entre los 4 M8 de la brida IEC B14 C120 a razón de
**70 N por perno** — despreciable frente a la precarga.

**Qué habría que hacer:** pedir a SEW las constantes a y b para el R07, o acercar
la rueda motriz a la brida. Hoy hay 34.35 mm y el buje sin chaveta mide 42.

## B8 — La banda: al 74 % de su admisible y a 1.14 veces su Ø mínimo `DIN-05` `DIN-06` `DIN-07`

| magnitud | valor | criterio | fuente |
|---|---|---|---|
| T₁ (par pleno) | 392.7 N | k_adm = 533.8 N | `web` BELT-005, TC-20EF 120 lbs/in × 1" |
| Ø de envoltura mínimo (tubo desnudo) | 28.925 mm | Dmin = 25.4 mm | `web` BELT-005 |
| T₁/T₂ | 2.62 | e^(µθ)/1.3 = 2.83 | Eytelwein, µ = 0.40 (`web` BELT-005) |

Tres cosas que hay que anotar:

1. **La banda no puede ser cualquiera de la serie.** Con Dmin = 1.0" sólo valen las
   más ligeras (TC-20EF, TF-10). Una TC-35ER pide 2.0" de polea mínima y **no
   cabe** en el Ø28.93 del rodillo. Pero una TF-10 tiene k_adm = 57 lbs/in = 254 N
   y **no aguanta** los 392.7 N. La ventana es estrecha: hay que especificar la
   banda por su k_adm **y** su Dmin, no por «FLEXPROOF de 1 pulgada».
2. **µ = 0.40 es el del DORSO de la banda sobre polea de acero** (encabezado de
   columna verificado, `web` BELT-005). En un serpentín la banda presenta una cara
   a los rodillos y **la otra** a las poleas locas: hay que especificar que el
   **dorso** es la cara que toca los rodillos motrices. Hoy no está escrito en
   ninguna parte y no es libre.
3. **Contraflexión.** El serpentín dobla la banda en los dos sentidos: Ø28.93 sobre
   los rodillos y Ø63.5 bajo las locas, 13 flexiones por vuelta y una vuelta cada
   1.98 s. Habasit exige aumentar el Dmin cuando hay contraflexión, y con 1.14 de
   margen esa penalización decide si cumple (ver D4).

**Qué pasa si el bulto está sobre un solo rodillo** (el caso peor que pedía el
encargo): ese rodillo tiene que absorber un salto de tensión de 241.6 N con µ =
0.6, lo que exige **T₂ ≥ 89.4 N** para no patinar (`calc`). Los 150 N de diseño
dan FS 1.68. Cumple.

---

# C · CUMPLE, y conviene que se sepa cuánto

Todo esto se ha calculado y **no es problema**. Se deja escrito para que nadie lo
vuelva a mirar.

| elemento | solicitación | tensión / flecha | margen |
|---|---|---|---|
| **tubo del rodillo** Ø28.93 × 1.5, vano 340 | bulto 34 kg + banda | 108 MPa, flecha **0.361 mm** (L/943) | ok |
| **velocidad crítica del tubo** | 1 014 rpm de trabajo | **f₁ = 572 Hz = 34 300 rpm** | 34× |
| **velocidad crítica del eje** | — | **no tiene: el eje NO gira** (`gira: false`) | — |
| **diente de la placa peine** (voladizo 34.2 × 4.763 × 59.5) | 559 N | 10.7 MPa | 23× |
| **notched brace channel** (U 40 × 44.45 12 GA, vano 364) | 437 N centrados | 16.1 MPa, flecha **0.031 mm** | 15× (48 MPa con impacto 3×) |
| **side channel** 6-1/2" × 1-1/4" 12 GA | 500 N | 0.8 MPa | — |
| **placas colgantes** 3/16" (montantes de 36 mm) | 250 N por montante | 1.5 MPa | — |
| **8 pernos 3/8" spacer plate** (cortante) | 109 N/perno | Rn cortante 16 353 N; aplastamiento 43 544 N | 150× |
| … como unión por rozamiento | 873 N totales | 37.6 kN (Gr2) / 58.2 kN (Gr5) | 43× |
| **4 tornillos 3/8" de las colisas de cuelgue** | 264 N/perno | 4 697 N de deslizamiento (Gr2) | 18× |
| **4 jack bolts 3/8-16 × 6"** (pandeo, L = 132.5) | 264 N | Pcr Euler **20 429 N** | 78× |
| **espárrago del tensor** (Ø5/8", voladizo 28 mm) | 783 N (2·T₁) | 34 MPa; M de despegue del hombro 49 100 vs 21 900 N·mm | 2.2× |
| **presión de contacto en el apoyo de la horquilla** | 789 N sobre 20 × 75 | 0.53 MPa | — |
| **arranque contra la inercia** | J carga = 6.2·10⁻³ kg·m² al eje de salida | α = 1 243 rad/s², **39 ms**, tiro 243 N | ok |
| **desequilibrio del rodillo** a 1 014 rpm | G6.3, rotor 0.5 kg | 0.33 N | despreciable |
| **rodamientos R10 de las locas** | 392 N/rodamiento a 462 rpm | **L10 = 51 286 h** | 2.6× |

**Soldaduras.** Se localizaron **21 piezas soldadas**: `BASE CHANNEL WELDMENT` +
2 tapas, las 2 placas peine (`ROLLER FRAME WELDMENT`), 2 `transfer cross channel`,
2 `notched brace channel`, 2 `cross angle`, 2 `spacer plate`, la placa soporte de
transmisión con su doblador y sus pestañas, el canal de montaje del cilindro + 2
placas colgantes, y las 4 tuercas 3/8-16 soldadas bajo la cartela.

- **Garganta necesaria por resistencia:** el extremo de larguero más cargado
  transmite 218 N sobre 129 mm de línea de cordón = **1.69 N/mm**. Con Ω = 2.0 y
  electrodo E70 (0.6·483·0.707), la garganta necesaria es **0.017 mm**. La
  resistencia sobra por tres órdenes de magnitud en todas las juntas.
- **Cordón mínimo de norma:** AISC 360-22 J2.2b pide 1/8" para chapa ≤ 1/4", *pero
  limitado al espesor de la parte más fina* (`web` STR-002) → **2.66 mm** en 12 GA
  y **1.90 mm** en 14 GA. Y como toda la chapa es ≤ 3/16", el código aplicable es
  **AWS D1.3 (Sheet Steel), no D1.1** (`web` STR-003), que admite además punto y
  tapón de arco.
- Lo que faltaba —y **ya está resuelto**: ninguna pieza declaraba garganta,
  proceso ni norma. `EST-08` lo detectó y el bloque de fabricación §10 del
  integrador lo cerró el mismo día, con cateto = espesor de la chapa más fina,
  garganta 0.7·cateto y cordón discontinuo 25/50 (manda el alabeo, no la
  resistencia). La entrada de `HALLAZGOS_ABIERTOS` se borró.

**Reparto de carga rodillos ↔ bandas.** No existe: la emergencia de 1/4" (`txt`)
separa por completo el bulto de las bandas del anfitrión, así que o está todo en
las bandas o todo en los rodillos. Sólo durante los 58 ms de transición conviven,
y en ese instante un bulto rígido puede apoyarse en 1 rodillo y 2 bandas. Es
transitorio y la resultante no cambia.

**Impacto del pop-up sobre la estructura** `EST-09`. Con 2.71 J y 2 mm de
aplastamiento supuesto: **2 710 N** = 3.1 veces el peso, contra los 37 556 N de
capacidad por rozamiento de los 8 pernos 3/8". Uso 0.07. La estructura no se
entera; el que se entera es el bulto (A3).

---

# D · NO SE PUEDE SABER CON LO QUE HAY

Estos huecos están anotados en `analisis/web_facts.json`,
`pendientes_sin_fuente`.

**D1 · Momento de vuelco admisible del MGPM80.** SMC publica para la serie MGP
**sólo** carga lateral F (perpendicular al eje del vástago) y par de giro T
**alrededor del eje del vástago** — verificado leyendo la tabla «Operating
Conditions» del catálogo (`web` PNEU-019). **No publica momento de vuelco.** El
`parPlacaNm = 16.19` que calcula `elevacion.mjs` compara contra los 21.9 N·m el
par que el rozamiento de los apoyos puede meter alrededor de Z — eso está bien
planteado y cumple. Lo que **no** se puede juzgar es el momento de vuelco de 63.5
N·m alrededor de X (A1), porque el fabricante no da límite para ese eje. Hace
falta pedir a SMC la curva de carga admisible frente a distancia excéntrica, o la
rigidez y el juego de los casquillos de las varillas guía.

**D2 · Aplastamiento del tope de goma del MGPM.** SMC publica la energía cinética
admisible (2.71 J) pero no la carrera del tope. De ella dependen la fuerza de
impacto sobre la estructura y si el bulto despega (A3). Se supuso 2 mm (`dis`).

**D3 · Constantes a y b de SEW** para corregir FRa por aplicación descentrada
(B7). El catálogo R07DR/DT no las publica.

**D4 · Penalización de Habasit por contraflexión** sobre el Ø mínimo de polea
(B8). Con 1.14 de margen, esa regla decide si la banda cumple.

**D5 · µ entre el bulto y el vulcanizado.** No se encontró valor publicado con
cita. Se adopta 0.50 (`dis`) con rango 0.35–0.70, y la compuerta reporta el µ al
que satura el accionamiento (0.60). De este número dependen A4/B2 y B3.

**D6 · Grado y par de apriete de toda la tornillería.** El manual dice *«3/8 in.
bolts»* y *«3/8 locknut»* (`txt` pág. 8) y nada más. La comprobación `EST-01`
**exige** Gr5 a 8 ft·lb en los pernos de rodillo; con Gr2 no cumple (B4).

**D7 · Tolerancia del Ø del tubo del rodillo y del espesor del vulcanizado.** Es
lo que decide de verdad el reparto de carga entre rodillos con un bulto rígido —
más que la rigidez del bastidor, que aporta 0.03 mm de flecha—. No está declarada.
Por eso todo el §9 se calcula con el **caso peor: el bulto entero sobre un
rodillo**, que es lo que pedía el encargo.

**D8 · Paralelismo del plano de rodillos bajo carga excéntrica.** La rigidez del
cassette no es el problema (0.031 mm de flecha en los largueros); el problema es la
**basculación de la placa del actuador**, que depende del juego de los casquillos
de las varillas guía. SMC publica precisión de no-giro ±0.04° pero **eso es
alrededor del eje del vástago**, no la basculación. Con un juego típico de
casquillo de bronce (0.03–0.06 mm sobre 156 mm de paso de varillas) saldrían
0.02° = **0.13 mm sobre los 381 mm del campo de rodillos**, del mismo orden que la
tolerancia del propio rodillo (D7). Pero si el apoyo despega (A1), el desnivel lo
fijan las colisas de los pasadores: **hasta 2 mm**.

---

# E · Cosas que no son de resistencia pero aparecieron al mirar

**E1 · La comprobación de energía cinética de §6 no puede fallar nunca.**
`elevacion.mjs` calcula `uMax = √(2·Ek_adm/M)` y después
`ekDiseno = ½·M·uMax²`, que **por construcción es exactamente `Ek_adm`**. La
comprobación `energiaCineticaJ > energiaAdmisibleJ` de la compuerta es por tanto
tautológica: es imposible que salte. El gate ahora lo detecta y lo denuncia por
consola en cada generación. **Qué habría que cambiar** (dueño: `elevacion.mjs`):
declarar la velocidad de diseño como **dato independiente** —la que se va a ajustar
en el estrangulador— y calcular Ek con ella. Si se aplica A3, ese dato sería
198 mm/s y la comprobación pasaría a tener sentido y margen (1.83 J de 2.71).

**E2 · Taladros huérfanos de la placa soporte de transmisión.** `bastidor.mjs`
sigue taladrando dos pasantes Ø11.13 en el alma de **cada canal lateral del
anfitrión** (`L.transX = 127`, `L.transZ = [232, 264]`) y abriendo una `Ventana de
paso de la placa de transmisión` en el `Side channel`, para unas **orejas que
`transmision.mjs` ya no fabrica**: el módulo limita la placa a |Y| ≤ 187 y la
sujeta por las pestañas sobre las cartelas. En el ensamble emitido no hay ninguna
pieza «oreja» ni tornillería en esos taladros. Esto contradice el contrato §5.1
(*«si dos piezas se unen, existe la tornillería que las une»*) al revés: hay
agujeros sin unión. La ventana además debilita el side channel para nada. **Dueño:
`bastidor.mjs`.**

**E3 · Los 4 pasadores guía son hiperestáticos en X y no restringen Y.**
Pasador Ø12.7 en colisa de 12.9 = **0.2 mm de holgura diametral** (±0.1 en X), y
son **cuatro** — con dos bastaría para fijar X y el giro alrededor de Z. Cuatro
puntos con ±0.1 mm de holgura exigen una tolerancia de posición mejor que ±0.1 mm
sobre 227 mm en Y y 83 mm en X, entre dos conjuntos soldados de chapa. No es
alcanzable: o agarrotan o se desgastan hasta que sobra holgura. Y **en Y no
restringen nada**: el collar Ø25.4 del pasador ocupa Y 185…195 y la cara interior
de la placa colgante está en Y = 221.15, o sea **26.15 mm de hueco** (`calc`). La
reacción de empujar el bulto (166.7 N en Y) va entera al cilindro, que la aguanta
(`EST-04`, 352 N admisibles) — pero por diseño, no por casualidad, y conviene que
esté escrito. **Dueño: `elevacion.mjs`.**

**E4 · `P.cargaMaxKg` está etiquetado `dis` y es `web`.** El comentario dice
*«dis: bulto máximo típico de un MRT (75 lb)»*, pero es un dato de la ficha del
fabricante, ya citado con URL y cita textual en `web_facts.json` (SORT-013 y
SORT-014: *«Maximum unit package weight of 75 lbs»*). Debería ser `cat`/`web`.

---

# Qué se ha metido en la compuerta

`gen_nbt90.mjs` gana un bloque **§9 · Resistencia y dinámica** con **21
comprobaciones**, cada una con su umbral y la fuente del umbral en el comentario.
Lo que hace distinto a este bloque:

- **recalcula, no copia**: la cinemática, las tensiones del serpentín, el reparto
  de carga y las tensiones se derivan de `P` y de las métricas que publican los
  módulos, y §9.0 **coteja** su resultado con lo que reporta `transmision.mjs`. Si
  un módulo cambia un número por su cuenta, la compuerta lo ve;
- **vigila la tensión de montaje de la banda**: `T2 = 150 N` es una constante local
  de `transmision.mjs` que no se exporta y de la que cuelga toda la vida de los
  rodamientos. §9.0 la reconstruye de las métricas del módulo y falla si cambia;
- **`HALLAZGOS_ABIERTOS` con trinquete**: las 5 comprobaciones que hoy incumplen
  están escritas con su utilización. Si una **empeora**, la compuerta para; si una
  se **arregla**, la compuerta para pidiendo que se borre la dispensa (nada de
  dispensas caducadas); si aparece una violación **nueva**, la compuerta para sin
  más. Es el mismo patrón que `RETRAIDO_CAJA_ABIERTA`;
- **imprime siempre** el resultado por consola: un hallazgo abierto no puede
  quedar sepultado en un JSON de 800 kB.

Los límites viven en el bloque `LIM`, cada uno con el id del hecho de
`analisis/web_facts.json` que lo respalda. Los que son decisiones de diseño nuevas
de esta revisión —µ del bulto, duty, objetivo de vida L10, aplastamiento del tope,
grado de tornillería, FS de deslizamiento de la banda— van marcados `dis` y con la
razón de la elección, para que se discutan y no se hereden en silencio.

**Masa del conjunto móvil.** La comprobación está en `tests/test_nbt90.mjs` y no en
la compuerta, a propósito: pesar los sólidos cuesta ~30 s con el motor CSG y el
gate tarda 0.08 s; meterlo ahí multiplicaría por 350 el ciclo de trabajo de quien
edita un módulo. En el test el coste marginal es cero porque ya construye todas las
mallas. Comprueba las dos cotas (que la declarada cubra la pesada, y que no la
sobrestime más del 60 %) por lo dicho en A1.

## Datos que la compuerta necesitaría y hoy no están en el modelo

1. **Grado y par de apriete** de cada unión atornillada (hoy `LIM.perno14` y
   `LIM.perno38` lo declaran desde la compuerta, que es el sitio equivocado: debería
   estar en la pieza).
2. **Grado del acero** del eje de rodillo y de las chapas (hoy sólo «acero estirado
   en frío» / «acero al carbono 12 GA»; se juzga contra A36).
3. **Radio del escalón** Ø12.70 → Ø7.94 del eje.
4. **Tensión de montaje de la banda**, exportada y con método de medida.
5. **Tolerancia del Ø del rodillo y del vulcanizado**, para poder calcular el
   reparto real de carga en vez de suponer el caso peor.
6. **Velocidad de diseño del pop-up** como dato independiente de la energía
   admisible (E1).
7. **Masa de cada pieza** o su material con densidad, para que el gate pueda pesar
   sin construir mallas.

---

## Verificación

```
node ensambles/nbt90/gen_nbt90.mjs
   → 16/21 comprobaciones estructurales cumplen; 5 abiertas, listadas por consola
python3 ensambles/nbt90/interferencias_brep.py --tol 0.05
   → 4 sobre 1024 pares (convención declarada: tornillería dentro de piezas compradas)
node tests/test_nbt90.mjs
   → 53 OK, 0 fallas
```

Que las comprobaciones nuevas **muerden** se verificó forzando fallos en 21 de 21:
perturbando `P` (velocidad, rpm, carga, Ø de rueda, espesor de vulcanizado, plano
de bandas, potencia, nº de rodillos) y los límites de `LIM`, y comprobando en cada
caso que la compuerta **para** y que el mensaje nombra la comprobación esperada. Se
verificaron también las tres ramas del trinquete: violación nueva no dispensada
(para), hallazgo abierto que empeora (para), y hallazgo abierto que pasa a cumplir
(para, pidiendo borrar la dispensa).

## Aviso de concurrencia

Esta revisión se hizo mientras otros dos agentes tocaban el modelo. Los números que
dependen de cotas que puedan haberse movido son: **A4** (vano del canal, huella del
cilindro), **A5** (`peineZt`, `P.rodZ`), **B4** (`placaPeineX`, `rodamientosX`,
espesor de la placa peine) y **B5/B8** (envolventes de la banda, `T2`). Todos se
recalculan en cada pasada de la compuerta a partir de las métricas de los módulos,
así que si una cota se mueve el número se mueve con ella y el trinquete de
`HALLAZGOS_ABIERTOS` avisa. El único hallazgo que ya se cerró durante la revisión
es `EST-08` (cordones de soldadura), y lo cerró el módulo de fabricación.
