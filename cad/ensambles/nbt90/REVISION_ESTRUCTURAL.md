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

Las comprobaciones están en `gen_nbt90.mjs` §9 y su resultado viaja en
`meta.verificaciones.estructural` del ensamble. Las que incumplen están en
`HALLAZGOS_ABIERTOS` con su utilización registrada: **si una empeora, la compuerta
para**; si una se arregla, la compuerta obliga a borrar la dispensa.

**Segunda pasada, 2026-07-29.** Este informe se emitió con **21 comprobaciones y 5
hallazgos abiertos**, y sin tocar geometría. Después se cerraron **`DIN-01`**
(velocidad), **`EST-05`** (borde del taladro) y **`AJ-02`/B6** (ajuste del eje de
rodillo), esta vez **sí moviendo cotas** en `params.mjs`, `bastidor.mjs` y
`rodillos.mjs`; §9 pasó a **22 comprobaciones** con la nueva `EST-11`.

**Tercera pasada, 2026-07-29 (los tres hallazgos de `elevacion.mjs`).** Se cerraron
**`DIN-12`** (el bulto despegaba al frenar el pop-up) y **`EST-10`** (el alma del
canal del cilindro), y con ellos **`E1`**, la comprobación tautológica: §9 pasó a
**23 comprobaciones** con la nueva `DIN-14`. **`EST-03`** —el vuelco del cassette—
**sigue abierto**: se mejoró la geometría que se podía mejorar desde este módulo y se
corrigió la base de masa con la que se juzga, con lo que su utilización pasó de 1.21 a
**1.35**; cerrarlo exige 4 taladros en una pieza de `bastidor.mjs` (ver A1).

**Cuarta pasada, 2026-07-29 (`EST-03`, el último hallazgo abierto).** **CERRADO**, y
no por donde decía la tercera pasada. La horquilla deja de sólo apoyar: cada brazo va
**atornillado** al cassette con 2 pernos 1/4-20 horizontales contra una **ménsula de
3/16" soldada a la cara EXTERIOR del ala** del `NOTCHED BRACE CHANNEL`. Los 4 taladros
Ø9 en el ALMA que proponía A1 **caben pero no se pueden apretar** —la evidencia, en el
recuadro de A1—. Al hacerlo aparecieron **dos términos del caso de carga que faltaban**
y que empeoran el número de partida: la reacción de arrastrar el bulto (42.25 N·m más
de vuelco) y el vuelco alrededor de **Y**, que nadie miraba. Con los dos, el diseño
anterior no «iba justo»: **volcaba por los dos ejes** (FS 0.67 y 0.92). §9 pasa a
**24 comprobaciones** con la nueva **`EST-12`** —el par de giro sobre la placa, que
antes lo acotaba el rozamiento de los apoyos y ahora ya no—, y a **0 hallazgos
abiertos**.

Los apartados cerrados llevan un recuadro al principio que dice cómo se cerraron y qué
colgaba de ellos; el texto original se conserva debajo, sin retocar, porque es el que
explica por qué el hallazgo existía.

---

## Resumen: el resultado del §9

> **Estado al 2026-07-29 (cuarta pasada).** **Las cinco que incumplían están
> cerradas y no queda ningún hallazgo abierto**: `DIN-01` (velocidad) y `EST-05`
> (borde del taladro) en `params.mjs`/`bastidor.mjs`/`rodillos.mjs`; `DIN-12` (el
> bulto despegaba al frenar) y `EST-10` (el alma del canal del cilindro) en
> `elevacion.mjs`; y **`EST-03`** (el vuelco del cassette) en `elevacion.mjs` +
> `bastidor.mjs`, atornillando la horquilla al cassette. Las cinco dispensas se
> borraron de `HALLAZGOS_ABIERTOS`. El bloque §9 pasó de 21 a **24**
> comprobaciones: `EST-11` cierra el ajuste `AJ-02` del eje de rodillo, `DIN-14`
> —energía cinética de impacto— cierra el hallazgo `E1`, y **`EST-12`** —par de giro
> sobre la placa del actuador— es la consecuencia de `EST-03`: con la unión
> atornillada, el par que llega a la placa ya no lo acota el rozamiento de los
> apoyos. Las filas cerradas van tachadas abajo y el detalle de cómo se cerraron, en
> A1, A2, A3, A4, A5, B6 y E1.

| id | comprobación | valor | límite | uso | fuente del límite |
|---|---|---|---|---|---|
| ~~DIN-01~~ | ~~velocidad declarada vs. real~~ | **0.28 %** | 5 % | **0.06** | **cerrado 2026-07-29** (ver A2) |
| ~~EST-03~~ | ~~vuelco: no despegar el apoyo de la horquilla~~ | **105.77 N·m** | 498.16 N·m | **0.21** | **cerrado 2026-07-29** (ver A1) |
| ~~DIN-12~~ | ~~el bulto no despega al frenar el pop-up~~ | **7.06 m/s²** | 9.81 m/s² | **0.72** | **cerrado 2026-07-29** (ver A3) |
| ~~EST-05~~ | ~~borde del taladro del perno de rodillo~~ | **9.77 mm** | 9.53 mm | **0.97** | **cerrado 2026-07-29** (ver A5) |
| ~~EST-10~~ | ~~flexión del alma del canal bajo el cilindro~~ | **80.1 MPa** | 150 MPa | **0.53** | **cerrado 2026-07-29** (ver A4) |
| EST-11 | asiento del rodamiento del rodillo (nuevo) | 0 mm | 0 mm | **0** | nominal del barreno (cierra `AJ-02`) |
| DIN-14 | energía cinética contra los topes (nueva) | 1.32 J | 2.71 J | **0.49** | Ek adm SMC (`web` PNEU-019); cierra `E1` |
| EST-12 | par de giro sobre la placa del actuador (nueva) | 14.32 N·m | 21.9 N·m | **0.65** | SMC (`web` PNEU-019); consecuencia de `EST-03` |
| DIN-02 | velocidad periférica del rodillo | 1.85 m/s | 2.0 m/s | 0.93 | Interroll (`web` ROD-007) |
| DIN-04 | patinaje del bulto hasta sincronizar | 350.8 mm | 381 mm | 0.92 | campo de rodillos |
| DIN-07 | deslizamiento de la banda en la rueda | 2.62 | 2.83 | 0.92 | Eytelwein + FS 1.3 `dis` |
| DIN-03 | empuje disponible en la cara del rodillo | 201.0 N | 166.7 N | 0.83 | µ·m·g con µ = 0.5 `dis` |
| EST-01 | la corona del eje no despega de la placa | 8 764 N·mm | 11 302 N·mm | 0.78 | precarga Gr5 + FS 1.5 |
| EST-07 | carga radial en el eje del SEW | 542.0 N | 695 N | 0.78 | FRa SEW (`web` MOT-009) |
| DIN-09 | vida L10 del rodamiento del rodillo | 26 480 h | 20 000 h | 0.76 | ISO 281 + objetivo `dis` |
| DIN-05 | tensión del ramal tenso | 392.7 N | 533.8 N | 0.74 | k_adm Habasit (`web` BELT-005) |
| DIN-06 | Ø mínimo de envoltura de la banda | 28.92 mm | 25.4 mm | 0.88 | Dmin Habasit (`web` BELT-005) |
| DIN-08 | coeficiente estático del rodamiento | 2.39 | 1.5 | 0.63 | ISO 281 s₀, C0 (`web` BRG-006) |
| EST-02 | tensión del eje de rodillo (junta cerrada) | 71.3 MPa | 150 MPa | 0.48 | 0.6·Fy A36 |
| EST-04 | carga lateral en Y sobre la placa | 166.7 N | 352 N | 0.47 | SMC (`web` PNEU-019) |
| DIN-13 | vida L10 de las poleas locas | 51 286 h | 20 000 h | 0.39 | ISO 281 |
| EST-06 | desgarro de la placa peine | 1 117 N | 14 332 N | 0.08 | AISC J3.10 (`web` STR-004) |
| EST-09 | impacto contra los 8 pernos 3/8" | 1 316 N | 37 556 N | 0.04 | rozamiento con precarga |
| ~~EST-08~~ | conjuntos soldados sin cordón declarado | 0 | 0 | — | **cerrado el mismo día** |

---

# A · NO CUMPLE

## A1 — ~~El cassette es una mesa apoyada en un solo punto~~ `EST-03` · **CERRADO 2026-07-29**

> **Cómo se cerró: la horquilla deja de sólo apoyar.** Cada brazo va **atornillado**
> al cassette con **2 pernos 1/4-20 UNC × 3/4" SAE J429 Gr5** metidos en HORIZONTAL
> (X = 206.7 y 256.3, Z = 132.5, |Y| = 120), que atraviesan una **ménsula de 3/16"
> soldada a la cara EXTERIOR del ala del `NOTCHED BRACE CHANNEL`** y roscan 16 mm en
> el propio brazo. Con eso el despegue **deja de ser un modo de fallo**: la unión
> trabaja a tracción y el momento resistente ya no depende sólo de la masa.
> Utilización **1.35 → 0.21**.
>
> **Lo que NO se hizo, y por qué — la propuesta de la tercera pasada no es
> construible.** Decía «4 taladros Ø9 en el ALMA de los dos brace channel (X 205.5 y
> 257.5, Y = ±100) y 4 M8 desde abajo con la rosca en el brazo». Dos cosas:
>
> - **«desde abajo» y «rosca en el brazo» se contradicen**: el brazo está DEBAJO del
>   alma, así que si la rosca va en el brazo el perno entra por arriba, y si entra por
>   abajo la rosca tendría que ir en la chapa de 12 GA (2.657 mm = 2.1 filetes de M8).
> - **los taladros caben, pero la unión no se puede apretar por ninguno de los dos
>   lados.** Caben: el alma tiene 40 mm y su tramo plano entre tangentes de pliegue va
>   de |Y| 85.32 a 114.68, o sea que un Ø9 centrado en 100 deja **10.2 mm** hasta el
>   arranque del pliegue (la regla de plegadora pide 1.5·t = 4.0). Pero:
>   - **por arriba** la cabeza queda dentro de la artesa en U del canal —34.7 mm de
>     boca, 41.8 de fondo— y encima la **cartela** (`cross angle`, X 47.24…263.14,
>     Y 82.66…110.72, Z 185.3) la techa **justo en esos dos X**. Una llave de estrella
>     apoyada en el fondo gira **3°** antes de topar con las alas del canal; no hay
>     ningún X sobre el brazo (194…269) que quede fuera de la cartela salvo 5.9 mm;
>   - **por abajo** no cabe la herramienta: entre el canto de la placa móvil del
>     cilindro (|Y| = 99) y el arranque del pliegue del alma (114.68) hay 15.7 mm, y
>     un perno pide 7.5 mm de radio de cabeza a un lado y 4.5 + 4.0 de taladro y
>     ligamento al otro. **Falla por 0.3 mm** (106.5 necesarios contra 106.2
>     disponibles).
>
> **Por dónde sí.** La cara accesible es la **exterior**: entre el ala del brace
> channel (|Y| = 120) y el `SIDE CHANNEL` fijo (195.5) hay un corredor de **75 mm
> libre de cualquier pieza en los dos estados**, y bajo él otros 106 mm de altura
> libre (a X 194…269 el canal de montaje es sólo su alma, Z ≤ 15). El test
> `test_nbt90.mjs` comprueba ese corredor con un envolvente de Ø25 —vaso de 1/4" con
> su carraca— elevado y retraído. La ménsula lleva **colisa vertical** 7.0 × 11: el
> apoyo plano sigue fijando Z y el perno no compite con él (la misma doctrina
> «redondo + colisa» de los encajes U3), y los 4 mm de recorrido son exactamente el
> ±2 que ISO 13920-B admite sobre los 368.5 mm del canal soldado.
>
> **1/4-20 y no M8.** Es la familia del equipo —el manual sólo habla de pulgadas y los
> pernos de rodillo ya son 1/4-20—, reutiliza el grado y el par que la propia
> compuerta fija y cita para `EST-01` (SAE J429 Gr5 a 8 ft·lb = 10.85 N·m,
> `web` HW-007/008) y no obliga a meter una serie métrica nueva de arandela. No hace
> falta más: la demanda es de 176 N y un solo perno da **2 819 N** de deslizamiento
> (µ = 0.33, AISC clase A) y 10 172 N a cortante si la junta llegara a deslizar.
>
> ### Lo que apareció al cerrarlo: el caso de carga estaba incompleto por dos sitios
>
> Los dos términos que faltaban van **contra** el diseño, o sea que el 1.35 de partida
> era optimista. Con ellos, el diseño anterior no «iba justo»: **volcaba**.
>
> 1. **La reacción de arrastrar el bulto.** El rodillo lo empuja con µ·m·g = 166.7 N
>    y la reacción entra en el cassette en la **generatriz superior del rodillo**,
>    (`P.rodZ` + Ø/2 − `P.rielInfZ`) = **253.45 mm por encima** del plano de apoyo:
>    **42.25 N·m** más de vuelco. Con el bulto en el rodillo extremo −Y y el arrastre
>    hacia +Y —un bulto que viaja pegado a ese costado del anfitrión, que es lo normal
>    en un sorter con guía lateral— los dos momentos **se suman**: 63.52 + 42.25 =
>    **105.77 N·m** contra los 70.60 que da el peso. El apoyo +Y no iba justo: se
>    despegaba (**FS 0.67**).
> 2. **El vuelco alrededor de Y, que nadie miraba.** La huella de la horquilla mide
>    **75 mm en X** (el ancho de la placa del cilindro) y el campo de rodillos, 375.
>    La excentricidad no es libre: el equipo no admite bultos de menos de 8" de largo
>    (`web` SORT-014, *«Minimum of 8 in. long x 6 in. wide»*), así que el centroide de
>    contacto se queda en **±(375 − 203.2)/2 = ±85.9 mm**. Con eso basta:
>    **28.64 N·m** de vuelco contra **26.48** de peso estabilizador → **FS 0.92**.
>
> Y un tercer síntoma del mismo hueco, que el anclaje arregla de paso: esa reacción de
> 166.7 N en Y sólo la podía transmitir el **rozamiento** de los apoyos, que da
> µ·N = 0.20 × 706 = **141 N**. O sea que el cassette, además de bascular, **resbalaba**
> — y `EST-04` llevaba desde el principio dando por hecho que la carga lateral llega
> al cilindro. Con la horquilla atornillada, por fin llega.
>
> ### Lo que esto cambia en el resto del diseño (y hay que leerlo)
>
> - **Paralelismo del plano de rodillos: mejora, no empeora.** Antes el cassette
>   podía bascular sobre la línea de apoyo sin que nada lo retuviese —los 4 pasadores
>   no están empotrados en nada (E3)—, así que el desnivel no estaba acotado por
>   ninguna cota del modelo. Ahora el cassette es solidario de la placa del MGPM y su
>   paralelismo **es el de la placa**, que es justo lo que el módulo decía que
>   garantizaba el cilindro: 0.02° por el juego de los casquillos de las varillas =
>   **0.13 mm sobre los 381 mm** del campo de rodillos (D8), del orden de la
>   tolerancia del propio rodillo.
> - **Sobre-restricción: no la hay hoy, pero había una trampa y se ha quitado.** Con
>   el cassette solidario de la placa, el conjunto tiene **un solo grado de libertad**
>   y los 4 pasadores en colisa serían **redundantes** en X y en θz si llegaran a
>   engranar. No engranan —flotan (E3)—, pero dejar una colisa de 0.2 mm de holgura
>   pretendiendo guiar entre **dos conjuntos soldados**, cuya distancia relativa sólo
>   se garantiza a ±2 mm (ISO 13920-B sobre 390 mm), es exactamente lo que E3 denuncia.
>   Se les quita el papel de guía: la colisa se ensancha a `guiaPasador + 4.0` y pasan
>   a llamarse **pasadores de retención**. Conservan el tope de sobrerrecorrido en Z,
>   que es la función que sí tiene sentido. **Lo que sigue abierto de E3 —que no
>   estén empotrados en nada— no es de este hallazgo y no se toca.**
> - **Desmontaje: se conserva.** La ménsula va **por fuera** del brazo (|Y| ≥ 120), o
>   sea que no se solapan en planta: sacados los 4 pernos, el cassette se levanta en
>   vertical sin nada que lo enganche. Lo comprueba el test. Y el ajuste de altura del
>   manual (*«Loosen 3/8 in. bolts holding the cylinder-mounting channel…»*) no se
>   toca: sigue haciéndose desde las colisas de las placas colgantes, por fuera.
> - **Lo que le llega al vástago.** Antes sólo empujaba; ahora también puede tirar. El
>   **momento** sobre la placa **no cambia** por atornillar: mientras no despegue, la
>   resultante que le llega es la misma (peso + arrastre) — lo que cambia es que ya no
>   está obligada a caer dentro de la huella. En **tracción** el vástago no ve nada
>   nuevo en servicio (la reacción de despegue, 176 N, la toman los pernos del anclaje
>   entre sí, no el vástago); lo único que puede tirar del cassette es el **retorno**
>   del cilindro si el conjunto se agarrota, y ahí el tope es la propia fuerza de
>   retorno a la presión de trabajo, **1 878 N** sobre un vástago Ø25 → **3.8 MPa**.
>   Nada. **Lo que sí cambia de verdad es el par alrededor de Z**: mientras la
>   horquilla sólo apoyaba, el rozamiento lo acotaba en 17.97 N·m y lo que excediera
>   hacía **girar** el cassette sin que nada lo retuviera; ahora la junta no desliza y
>   a la placa le llega el par real, 166.7 N × 85.9 mm = **14.32 N·m** frente a los
>   **21.9** que SMC publica para el MGPM80 (`web` PNEU-019) — satura con 131 mm de
>   excentricidad. Es la comprobación **`EST-12`**, nueva, y es la deuda que había que
>   pagar por quitar el tope de rozamiento: se paga con 0.65 de utilización.
> - **Lo que NO cambia**: la huella de apoyo (|Y| 80…120) se deja donde estaba a
>   propósito. Llevarla más afuera —lo que el apartado proponía como opción 1— habría
>   subido el radio polar y con él el par de rozamiento sobre la placa a **24.5 N·m**
>   contra 21.9: habría cambiado un incumplimiento por otro. Coste del anclaje:
>   **0.89 kg** (2 ménsulas + 8 piezas de tornillería) y ninguna cota de la cadena de
>   alturas.
>
> ### Las tres opciones que este apartado proponía, comprobadas una por una
>
> 1. **separar los apoyos a Y = ±150** — para FS 1.5 hace falta el centroide en
>    **Y = 135** (224.7 con el caso de carga completo) y **el cassette no ofrece nada
>    entre Y 120 y 195 a esa altura**: en toda la banda de X que alcanza el cilindro
>    (185…280) y entre Z 120 y 215 no hay ninguna pieza `MÓVIL` — sólo los
>    `SIDE CHANNEL`, que son fijos. Y aunque se añadiera, el par de rozamiento se sale
>    de catálogo (ver arriba);
> 2. **topes fijos bajo el cassette a |Y| ≈ 185** — un tope FIJO sólo toca en el estado
>    **retraído**; elevado queda 10 mm por debajo, que es justo cuando hace falta;
> 3. **que los pasadores tomen carga vertical** — corren en colisas **verticales** y
>    además no están empotrados en nada (E3). Y aunque lo estuvieran, un apoyo con
>    juego no arregla el paralelismo: el desnivel pasaría a fijarlo la holgura del
>    pasador en su colisa.

<details><summary>Texto original del hallazgo (se conserva sin retocar)</summary>

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

</details>

---

## A2 — ~~La velocidad de transferencia del modelo es 2.06 veces la que declara `params.mjs`~~ `DIN-01` · **CERRADO 2026-07-29**

> **Cómo se cerró.** `P.velocidad` dejó de ser un literal: `params.mjs` lo **deriva de
> la cadena** (`motorRpm` → `ruedaDia` → `rodDiaArrastre` → `rodDia`), junto con
> `rodRpm`, `vBanda`, `relacionBanda` y `velocidadFpm`. Ya no se puede desincronizar.
> Como «declarada vs. calculada» habría quedado **tautológica** —el vicio que este
> mismo informe denuncia en E1—, `DIN-01` se reescribió como **cotejo a tres bandas**:
> lo que declara `P`, lo que recalcula la compuerta y lo que reporta
> `transmision.mjs` por su cuenta; ese tercer camino es independiente y es el que
> muerde. Se mide la **desviación en %** (0.27 % de 5 admitido), no el cociente, para
> que la utilización no mienta. Se plegó ahí el `e.push` suelto que hacía el mismo
> cotejo en §9.0, para que la cinemática viva en un solo sitio.
>
> **Lo que colgaba del número equivocado y también se corrigió:**
> - `tests/test_nbt90.mjs` calculaba `π·Ø34.93·462/60` y comprobaba que cayera entre
>   0.3 y 1.5 m/s: **pasaba confirmando una cadena inexistente**. Ahora comprueba la
>   cadena real eslabón a eslabón, que las tres fuentes coinciden, que el resultado
>   **no** es la cuenta ingenua, y el contraste con la ficha del fabricante.
> - `web_facts.json`, nota de `MOT-001`: decía que los 302 FPM de **banda motriz**
>   eran «coherentes con los 275 FPM de transferencia del MRT 30». No son magnitudes
>   homólogas. Corregida, y añadido el hecho **`SORT-018`** con la hoja de
>   especificaciones del MRT 90 (URL, fecha 2026-07-29 y cita textual).
> - `analisis/catalogo_componentes.md` repetía la misma comparación. Corregida.
> - `transmision.mjs` publica ahora `multiplicacion` y `vTransferencia_fpm`.
>
> **Contraste con el fabricante:** 365 fpm frente a los *«Capable of 350 FPM»* de
> Hytrol (`web` SORT-016/SORT-018) → **+4.3 %**. No se convierte en umbral de la
> compuerta: 350 FPM es una capacidad de folleto, no un máximo de norma; el techo
> duro sigue siendo el de `DIN-02` (Interroll, 2.0 m/s).

Lo que decía el hallazgo:

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
`transmision.cinematica`, que es quien lo sabe. → **Hecho, por la tercera vía: se
deriva en `params.mjs` de la cadena, que es la única forma de que no vuelva a
desincronizarse. Ver el recuadro del principio de este apartado.**

---

## A3 — ~~Al frenar el pop-up el bulto se despega de los rodillos~~ `DIN-12` · **CERRADO 2026-07-29**

> **Cómo se cerró.** `elevacion.mjs` deja de despejar la velocidad de subida del
> límite de energía del catálogo y la declara como **dato de diseño**:
> `L.velEmboloMmS = 120 mm/s` de velocidad **media de émbolo** —la que se ajusta en
> los reguladores de caudal y la que mide el catálogo con su banda 50…400—. De ahí
> salen, en este orden: impacto = 1.4 × media = **168 mm/s** (`cat`, nota de la hoja
> MGP), deceleración = u²/2δ = **7.06 m/s² = 0.72 g** y Ek = ½Mu² = **1.32 J** de los
> 2.71 admisibles.
>
> **Por qué 120 y no los 198 del límite justo.** Los 198.06 mm/s que calcula este
> informe son la velocidad de *impacto* a la que la deceleración vale exactamente g:
> poner el diseño ahí deja utilización 1.000 y ningún margen para lo que **no se
> sabe**, que es δ (D2: SMC publica la energía admisible pero no la carrera del
> tope). Con 168 mm/s de impacto la comprobación sigue cumpliendo mientras el tope
> real aplaste **≥ 1.44 mm**; con 198 fallaría con cualquier δ por debajo de 2.0. La
> compuerta imprime esa cota en cada pasada.
>
> **Lo que cuesta.** El tiempo de subida pasa de 58 a **83 ms** — el 14 % del ciclo de
> 600 ms de un sorter a 100 sorts/min (`web` SORT-015), y este divert ve un bulto cada
> ~5 s, no cada 0.6. **Lo que se gana**, además de que el bulto no despegue: la
> energía de impacto baja de 2.71 J (el límite) a 1.32, la fuerza sobre la estructura
> de 2 710 a **1 316 N** (`EST-09` pasa de 0.07 a 0.04) y la aceleración de arranque
> de la carrera de 2.9 a **1.41 m/s²**, que es la que carga el alma del canal en A4.
>
> **Y de paso, `E1`:** al ser la velocidad un dato y la energía una consecuencia,
> nació **`DIN-14`** —Ek ≤ Ek_adm— que ya es una comprobación con dos lados. El
> detector de tautología se conserva en la compuerta como **guardián**: si alguien
> vuelve a derivar la velocidad del límite, lo denuncia por consola.

<details><summary>Texto original del hallazgo (se conserva sin retocar)</summary>

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

</details>

---

## A4 — ~~El alma del canal de montaje del cilindro trabaja a 183 MPa~~ `EST-10` · **CERRADO 2026-07-29**

> **Cómo se cerró.** El `CYLINDER MOUNTING CHANNEL` pasa de **12 GA (2.657) a 3/16"
> (4.763 = `P.placaT`)**. σ de sección bruta: **56.2 MPa**; con la sección neta de los
> dos taladros Ø30 —que este informe señalaba como agravante pero no metía en el
> número— **80.1 MPa**, y **91.6** con la aceleración de la carrera. Frente a 150.
>
> **Por qué el calibre y no un refuerzo.** Las tres soluciones «obvias» chocan con la
> cadena de alturas del §0 de `elevacion.mjs`, que está cerrada por los dos extremos:
>
> - **chapa de refuerzo o segunda piel POR ENCIMA del alma** → sube el cilindro y hay
>   que recuperar esa altura acortando la horquilla, que es lo único que **no** se
>   puede tocar: con `platoT = 22` la cara superior de la placa móvil ya está a
>   **2.4 mm** del cárter del motorreductor (Z = 123.9), y la placa de un MGPM no se
>   rebaja —ahí se atornillan el vástago y las dos varillas guía—;
> - **chapa de refuerzo POR DEBAJO** → el canal baja lo mismo y las cabezas de los 4
>   M12 de fijación (7.5 + 2 de golilla) se salen por debajo del bastidor: hoy acaban
>   en Z = 0.74 con el alma ya engordada;
> - **nervios en la artesa de 12.34 mm que queda bajo el alma** → sí caben (3 tiras de
>   4 × 12.34 a Y = 0 y ±112 dan 96 MPa), pero hay que esquivar las 4 cabezas M12
>   (Y = ±90, con su vaso) y las dos varillas guía, que **retraídas bajan a Z = −3.5**;
>   y son tres cordones sobre chapa fina, con su alabeo, para ahorrar 3.4 kg.
>
> Subir el calibre **no gasta espacio**: el alma crece hacia **abajo** —`canalZ0` de
> 12.34 a 10.24— y la cara de fijación (`webZ` = 15.0) no se mueve, porque la fija la
> cadena desde `P.rielInfZ`. Todo lo que hay por encima queda idéntico.
>
> **Dos holguras del estado RETRAÍDO mejoran de regalo**, que era justo lo que había
> que vigilar: el techo del canal baja de 115.34 a **113.24** y por primera vez queda
> **por debajo** del cárter del motorreductor retraído (113.9) en vez de solaparlo
> 1.44 mm; y la placa soporte de transmisión libra ese techo por **4.76 mm** en vez de
> 2.66. 3/16" no es un calibre nuevo: es el de las placas peine, las spacer plate y
> las propias placas colgantes de este canal. Coste: **+3.4 kg** en una pieza FIJA,
> que no entra en la masa móvil ni en el vuelco.

<details><summary>Texto original del hallazgo (se conserva sin retocar)</summary>

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

</details>

---

## A5 — ~~El taladro del perno de rodillo queda a 1.42·d del canto~~ `EST-05` · **CERRADO 2026-07-29**

> **Cómo se cerró.** `L.peineZt` dejó de ser el literal `388.5` y **sale de la propia
> norma**: `P.rodZ + 1.5·d + 0.25` = **389.26**. La distancia al canto pasa de 9.01 a
> **9.77 mm = 1.54·d** (uso 0.97) y quedan **1.34 mm** al plano de bandas. Los 0.25 mm
> de margen son `dis` y están justificados: cubren la tolerancia general de la chapa
> cortada (ISO 2768-m da ±0.2 sobre una cota de 6…30 mm), así que **la cota aguanta el
> peor caso** — 9.575 ≥ 9.525 — en vez de quedarse clavada en el mínimo.
>
> **El comentario del código, que afirmaba lo contrario, se corrigió entero**: decía
> que no se podía subir `peineZt` «porque el plano de bandas está 2.1 mm más arriba»,
> y de esos 2.1 sólo hacían falta 0.775. También atribuía el mínimo a **AISC**, que no
> tabula tornillos menores de 1/2"; la fuente correcta es **AISI S100-16 J3.2**.
>
> **Y se cerró el hueco que dejaba abierto:** nadie comprobaba el techo. La compuerta
> (§2) exige ahora que el canto del diente quede **por debajo** del plano de bandas, y
> `bastidor.mjs` publica `dienteBajoPlanoBanda`. Sin esa comprobación, subir el
> taladro para cumplir la norma podría hacer que el diente enganchara al producto que
> viaja sobre las bandas del anfitrión — y nada lo habría detectado.
>
> Comprobado que no rompe lo demás: emergencia **6.35 mm** (1/4") y holgura
> rodillo↔regleta **4.76 mm**, las dos intactas; 0 interferencias nuevas en elevado y
> en retraído.

Lo que decía el hallazgo:

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

## B6 — ~~El rodamiento del rodillo no tiene ajuste: tiene 0.07 mm de holgura~~ · **CERRADO 2026-07-29** (`AJ-02` / `EST-11`)

> **Cómo se cerró.** El `P.rodHex` de 5/16" describía **una pieza que el modelo ya no
> tiene**: desde que el montaje es «eje con hilo interior + perno por fuera», el eje es
> redondo y escalonado, y quien fija el Ø del cuerpo **no es el hexágono de catálogo
> sino el barreno del rodamiento**. La clave pasa a `P.rodEjeD = 8` con
> `P.rodEjeAjuste = 'g6'` y sus desviaciones citadas. Juego diametral: de
> **0.055…0.072 mm** a **−0.003…+0.014 mm** — un orden de magnitud —, calculado de la
> cadena ISO 492 clase Normal (0/−0.008, `web` BRG-007) contra ISO 286-2 g6
> (−0.005/−0.014), no de un literal. `g6` es lo que NTN recomienda para **aro interior
> con carga estacionaria** (`web` BRG-FIT-001); el intervalo 0.005…0.022 que se cita
> en el enunciado del hallazgo corresponde en realidad a **f6**, que daría más juego
> justo donde el problema era el martilleo del aro.
>
> **Las otras dos salidas se descartaron con números, no por gusto:**
> - *Rodamiento de barreno en pulgadas*: la serie R **no tiene 5/16"** (salta de R4 =
>   1/4" a R6 = 3/8"), igual que ya se documentó para el eje de las poleas locas. El
>   R6-2RS sí cabría en el tubo Ø28.93 (OD 22.23 contra los 22 del 608), pero su C0 es
>   del orden de 780 N: `DIN-08` caería de s₀ = 2.39 a ≈1.4 y **dejaría de cumplir**.
> - *Casquillo*: para 0.03 mm de pared. No es una pieza.
>
> Efecto lateral favorable: el cuerpo pasa de Ø7.94 a Ø8.00, así que `EST-02` baja de
> 71.66 a **71.28 MPa**. Y `med` daba 8.53: Ø8 se acerca más a lo medido que 5/16".
>
> **Lo que queda en otro módulo (no lo toco):** `tolerancias.mjs` sigue declarando
> `AJ-02` con la cota `Ø7,94 (5/16") h6` y el juego `0.052…0.069`. La compuerta lo
> **denuncia por consola en cada generación** y lo escribe en
> `meta.verificaciones.estructural.avisos`; corregirlo es del dueño de ese archivo.

Lo que decía el hallazgo:

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
→ **Se hizo lo primero (Ø8, con g6 en vez de h6: h6 daría hasta 8 µm de aprieto).
Lo segundo NO cabe y conviene dejarlo escrito para que nadie lo intente otra vez:
el R8-2RS mide Ø1-1/8" = 28.575 mm de exterior y el tubo del rodillo de
transferencia tiene Ø25.93 interior. Cabe en el rodillo de retorno porque aquél es
Ø1.9". La recomendación de fondo de B4 —eje Ø12.70 en toda su longitud— sigue en
pie, pero exige otro rodamiento, y eso ya no es este hallazgo.**

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
Conditions» del catálogo (`web` PNEU-019). **No publica momento de vuelco.** Lo que
sí se puede juzgar, y cumple, es el par alrededor de Z: `EST-12` compara los
**14.32 N·m** de la reacción de arrastre por su excentricidad contra los 21.9 de
catálogo. Lo que **no** se puede juzgar es el momento de vuelco alrededor de X, que
con el caso de carga completo vale **105.77 N·m** (63.52 de peso excéntrico + 42.25
de la reacción de arrastre; A1), porque el fabricante no da límite para ese eje.
**Y ahora importa más que antes**, porque al atornillar la horquilla al cassette ese
momento le llega entero a la placa en vez de descargarse despegando el apoyo — que
es lo que hacía antes, y era peor. Estimación de orden con lo que sí se sabe: el
momento lo reaccionan los dos casquillos de las varillas Ø25 (156 mm de paso, 56.5
mm de guiado), o sea ≈936 N de contacto en cada extremo de cada casquillo, ≈2.7 MPa
de presión proyectada — holgado para un casquillo de deslizamiento, pero es una
estimación, no un dato. Hace falta pedir a SMC la curva de carga admisible frente a
distancia excéntrica, o la rigidez y el juego de los casquillos de las varillas guía.

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
tolerancia del propio rodillo (D7).

> **Al 2026-07-29 esto pasó a ser la ÚNICA fuente de desnivel, y eso es una mejora.**
> Antes, si el apoyo despegaba (A1) el desnivel lo fijaban las colisas de los
> pasadores —hasta 2 mm— y en realidad ni eso, porque los pasadores no están
> empotrados en nada (E3): el cassette basculaba sin cota que lo acotase. Con la
> horquilla **atornillada** el cassette es solidario de la placa, así que el
> paralelismo del plano de rodillos **es** el de la placa y se queda en esos 0.13 mm
> estimados. Lo que sigue faltando es el dato de SMC para convertir la estimación en
> número: el juego de los casquillos de las varillas.

---

# E · Cosas que no son de resistencia pero aparecieron al mirar

**E1 · ~~La comprobación de energía cinética de §6 no puede fallar nunca.~~ ·
CERRADO 2026-07-29.** La velocidad de subida es ahora un dato de diseño
(`L.velEmboloMmS` = 120 mm/s de émbolo, `dis`) y la energía cinética su consecuencia:
1.32 J de los 2.71 admisibles. Nació **`DIN-14`**, que compara las dos y sí puede
fallar —verificado subiendo la velocidad a 260 mm/s: la compuerta para—. El detector
de tautología no se ha quitado: se queda como **guardián**, y si alguien vuelve a
despejar la velocidad del propio límite lo denuncia por consola. Texto original:
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

> **Ampliación 2026-07-29, al buscarle apoyo vertical al pasador para A1: los cuatro
> pasadores no están empotrados en nada.** `L.guiaMontY = 195` declara *«cara del
> bastidor móvil donde va empotrado el pasador»*, pero en X = 190 y 273, con
> |Y| entre 185 y 195, **el cassette no tiene ninguna pieza**: sus estructuras a esa
> altura son los `notched brace channel` (|Y| ≤ 120) y, mucho más afuera en X, las
> spacer plate (X 42…47 y 416…420) y las placas peine (X 38…42 y 421…425). Los
> pasadores flotan. O sea que hoy **no guían tampoco en X ni en θz**: ni sujetan, ni
> topan, ni reaccionan nada, y la primera consecuencia práctica es que si el apoyo de
> la horquilla despega (A1) no hay nada que retenga el cassette — ni siquiera los
> 2 mm de colisa que este informe daba por buenos. Esto contradice el contrato §5.1
> («nada flota») y la compuerta no lo ve, porque no comprueba adyacencia. Arreglarlo
> exige una cara del cassette donde empotrarlos, que es pieza de `bastidor.mjs`: los
> mismos taladros que pide A1 resolverían las dos cosas si se hacen a la vez.
>
> **Rectificación 2026-07-29, al cerrar A1: la corrección de E3 ya NO es empotrarlos.**
> Con la horquilla atornillada al cassette, el conjunto móvil queda solidario de la
> placa del MGPM y tiene **un solo grado de libertad**; los 4 pasadores en colisa
> serían **redundantes** en X y en θz si llegaran a engranar, y con 0.2 mm de holgura
> entre dos conjuntos SOLDADOS —cuya distancia relativa sólo se garantiza a ±2 mm por
> ISO 13920-B sobre 390 mm— agarrotarían o se desgastarían, que es lo que este mismo
> apartado ya decía. Así que se les quita el papel de guía: la colisa se ensancha a
> `guiaPasador + 4.0` (`L.guiaHolguraX`, derivado de esa misma tolerancia) y las
> piezas pasan a llamarse **pasadores de retención**; conservan el tope de
> sobrerrecorrido en Z, que es la única función que les queda con sentido.
> **Lo que sigue abierto es sólo que floten** (contrato §5.1): o se les da una cara
> del cassette donde topar —ya sólo como retención, con juego, no como guía— o se
> retiran del modelo. Dueño: `elevacion.mjs`.

**E4 · ~~`P.cargaMaxKg` está etiquetado `dis` y es `web`~~ · CORREGIDO 2026-07-29.**
El comentario decía *«dis: bulto máximo típico de un MRT (75 lb)»*, pero es un dato
de la ficha del fabricante, ya citado con URL y cita textual en `web_facts.json`
(SORT-013 y SORT-014: *«Maximum unit package weight of 75 lbs»*). Ya está como
`cat`/`web`, con los dos ids en el comentario.

---

# Qué se ha metido en la compuerta

`gen_nbt90.mjs` gana un bloque **§9 · Resistencia y dinámica** con **21
comprobaciones** —**22** desde que `EST-11` cerró `AJ-02`, **23** desde que `DIN-14`
cerró `E1` y **24** desde que `EST-12` (par de giro sobre la placa) nació al cerrar
`EST-03`—, cada una con su umbral y
la fuente del umbral en el comentario. Lo que hace distinto a este bloque:

- **recalcula, no copia**: la cinemática, las tensiones del serpentín, el reparto
  de carga y las tensiones se derivan de `P` y de las métricas que publican los
  módulos, y §9.0 **coteja** su resultado con lo que reporta `transmision.mjs`. Si
  un módulo cambia un número por su cuenta, la compuerta lo ve;
- **vigila la tensión de montaje de la banda**: `T2 = 150 N` es una constante local
  de `transmision.mjs` que no se exporta y de la que cuelga toda la vida de los
  rodamientos. §9.0 la reconstruye de las métricas del módulo y falla si cambia;
- **vigila el µ del bulto**: `L.muBulto` es un `dis` que vive a la vez en
  `elevacion.mjs` (que lo necesita desde que el anclaje hizo real la carga lateral y
  el par sobre la placa) y en `LIM.muBulto`. §9.0 exige que no se hayan separado,
  igual que con la T2;
- **`HALLAZGOS_ABIERTOS` con trinquete**: las comprobaciones que incumplen (5 al
  emitir este informe, **3** tras la segunda pasada, **1** tras la tercera y
  **ninguna** tras la cuarta) están escritas con su utilización. Si una
  **empeora**, la compuerta para; si una
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
6. ~~**Velocidad de diseño del pop-up** como dato independiente de la energía
   admisible (E1).~~ **PUESTO 2026-07-29**: `elevacion.mjs` lo declara en
   `L.velEmboloMmS` (120 mm/s de émbolo, `dis`) y lo publica en sus métricas como
   `velocidadDisenoMmS`; la compuerta lo comprueba contra la banda 50…400 del
   catálogo y deriva de él el impacto, la energía (`DIN-14`) y la deceleración
   (`DIN-12`).
8. **Cota INFERIOR de la masa del conjunto móvil.** Falta de nacimiento y se ha
   puesto ahora (`masaMovilVuelcoKg` = 38 kg, `dis`): la declarada de 55 es una cota
   superior y en el vuelco el lado seguro es el contrario (A1). Lo que sigue
   faltando es que **cada pieza declare su masa o su material con densidad**, para
   que la compuerta pueda pesar el cassette en vez de creerse dos números `dis`;
   hoy sólo lo hace `tests/test_nbt90.mjs`, que construye las 420 mallas.
7. **Masa de cada pieza** o su material con densidad, para que el gate pueda pesar
   sin construir mallas.
9. **Posición del bulto sobre el campo de rodillos.** Al cerrar `EST-03` hizo falta
   acotar dos cosas que el modelo no tenía: dónde puede estar el centroide del bulto
   en Y (se conserva el caso peor, el rodillo extremo) y en X. La segunda se resolvió
   con `web` SORT-014 —el equipo no admite bultos de menos de 8" de largo, así que el
   centroide de contacto se queda en ±85.9 mm— y de ella cuelgan `EST-12` y el vuelco
   alrededor de Y. Si el cliente admitiera bultos más cortos, los dos números se
   mueven: `L.bultoMinLargo` de `elevacion.mjs`.

---

## Verificación

Estado tras la cuarta pasada (2026-07-29, cierre de `EST-03`):

```
node ensambles/nbt90/gen_nbt90.mjs
   → 24/24 comprobaciones estructurales cumplen; NINGUNA abierta
     (420 piezas: +2 ménsulas de anclaje, +4 pernos, +4 golillas)
python3 ensambles/nbt90/interferencias_brep.py --tol 0.05
   → 4 sobre 1052 pares en elevado y 4 sobre 1058 en retraído (convención declarada:
     tornillería dentro de piezas compradas) — ninguna nueva
node tests/test_nbt90.mjs
   → 74 OK, 0 fallas
node ensambles/nbt90/planos_nbt90.mjs
   → 73 láminas; despiece de 352 ítems
```

En la primera pasada eran 16/21, 5 abiertas y 53 OK; en la segunda, 19/22, 3 abiertas
y 63 OK; en la tercera, 22/23, 1 abierta y 64 OK.

Las comprobaciones tocadas en la tercera pasada se verificaron **forzando el fallo**
desde `elevacion.mjs`, una a una, y comprobando que la compuerta para y nombra la
comprobación esperada: velocidad de émbolo a 160 mm/s (`DIN-12` a 12.54 m/s²), a 260
(`DIN-14` a 6.18 J **y** el `e.push` de §6), a 30 (por debajo del mínimo de émbolo del
catálogo), canal otra vez en 12 GA (`EST-10` a 259 MPa) y horquilla otra vez a Y = 100
(`EST-03` **ha EMPEORADO**, rama del trinquete).

Las de la cuarta pasada, igual — **cinco perturbaciones, cinco paradas**:

| perturbación | qué tiene que pasar | qué pasó |
|---|---|---|
| `anclajeHorquilla.nPorBrazo` 2 → **0** (sin retención) | `EST-03` falla | para: 105.77 N·m > 47.07, **utilización 2.25** |
| `L.bultoMinLargo` 203.2 → **60** mm | `EST-12` falla | para: par 26.26 > 21.9 N·m (uso 1.20) **y** el `e.push` de §6 |
| `L.muBulto` 0.50 → **0.45** | §9.0 denuncia la divergencia | para: «el µ del bulto de elevacion.mjs (0.45) ya no es el de `LIM.muBulto`» |
| `L.anclaProf` 16 → **10** mm (el perno tocaría fondo) | el test falla | falla: «rosca engranada 12.64 mm dentro de los 10 mm de hilo» |
| anclaje subido a **Z = 179** (a la altura de los pasadores) | el corredor de llave falla | falla en los DOS estados: 2 estorbos, los pasadores de retención |

Y la rama del trinquete que faltaba por ejercitar: **volver a meter la dispensa de
`EST-03` con el hallazgo ya cerrado** → la compuerta para y pide borrarla («YA CUMPLE
(utilización 0.21): borra su entrada de `HALLAZGOS_ABIERTOS`»).

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
