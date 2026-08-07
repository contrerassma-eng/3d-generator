# Sorter CO — Revisión estructural de lo que se ha FABRICADO para el sorter

Revisión de **resistencia y funcionamiento** de las piezas nuevas del sorter CO:
tambor motriz, rodillo conducido, rodillos de retorno, bastidor PG40, puentes de
calle, alargue lateral y tensor de brazos. Fecha: **2026-08-03**. Se revisa el
ensamble que emite `gen_sorter_co.mjs` y los ocho módulos de `adapt/`.

> **Recuento de piezas.** El día de la revisión el ensamble pasó de 957 a **1 030
> piezas**: hay otros agentes emitiendo en paralelo (soportes de cilindro,
> rodamientos de las tensoras). Todos los números de este informe están
> recalculados contra el ensamble de 1 030 piezas y, más importante, **la
> compuerta los recalcula sola en cada pasada**: no hay ninguna cifra copiada.

**La transferencia NBT90 NO se revisa aquí.** Tiene su propia revisión cerrada
(`../nbt90/REVISION_ESTRUCTURAL.md`, 24 comprobaciones, 0 hallazgos abiertos) y
no se repite nada de ella.

**No se ha tocado geometría.** Hay otros agentes trabajando el trazado de banda y
los soportes de los cilindros. Lo único modificado es:

- las **12 comprobaciones nuevas** de la compuerta (`gen_sorter_co.mjs` §S) y los
  datos de entrada que necesitan (bloques `LIMS` y `HALLAZGOS_SC`, con su
  procedencia);
- los **8 casos nuevos** del banco `TEST_ROMPE`;
- **6 hechos nuevos** en `web_facts.json`, todos con cita verbatim de la página o
  del PDF, y 7 entradas nuevas en `pendientes_sin_fuente`;
- **dos citas** de `adapt/params_tambores.mjs` que apuntaban a ids inexistentes
  (`BRG-6207` y `BRG-6206`) → ahora `BRG-6207-01` y `BRG-6206-01`. Es corrección
  de procedencia, no de cota: **ningún número del modelo ha cambiado**.

Todo hallazgo que exige mover una cota se describe aquí con el número exacto y se
deja al dueño del módulo.

## Cómo leer esto

Está ordenado por **gravedad**. Cada hallazgo lleva:

- **qué pasa**, con el número;
- **de dónde sale cada dato de entrada** — `step` medido sobre el STEP del
  cliente · `nbt90` especificación congelada de la transferencia · `cat`
  catálogo · `web` hecho citado en `web_facts.json` con URL, fecha y cita ·
  `dis` decisión de diseño · `calc` calculado aquí;
- **contra qué criterio** se compara, con la fuente;
- **qué habría que cambiar**, con la cota.

Y se distingue **NO CUMPLE** · **CUMPLE JUSTO** (utilización > 0,74, o sea margen
< 1,35) · **CUMPLE** · **NO SE PUEDE SABER**.

Las comprobaciones viven en `gen_sorter_co.mjs` §S y su resultado viaja en
`meta.verificaciones.estructural` del ensamble. Las que incumplen están en
`HALLAZGOS_SC` con su utilización registrada: **si una empeora, la compuerta
para**; si una se arregla, la compuerta obliga a borrar la dispensa.

---

## Resumen: el resultado del §S

> **Estado al 2026-08-03.** 12 comprobaciones · **6 hallazgos abiertos**. El
> ensamble sigue emitiéndose porque los seis están dispensados con su utilización
> registrada; ninguno se puede cerrar sin mover geometría, que es lo que esta
> revisión tiene prohibido.
>
> Los dos que hay que mirar antes de mandar nada al taller son **`SC-01`** —los
> cinco puentes que cruzan la transferencia no se apoyan en nada— y
> **`SC-02`/`SC-03`** —el tensor pone menos de la mitad de la tensión que declara.

| id | comprobación | valor | límite | uso | fuente del límite |
|---|---|---|---|---|---|
| **SC-03** | coherencia tensión declarada ↔ geometría construida | **111,13 %** | 5 % | **22,23** | `dis` (coherencia entre módulos) |
| **SC-01** | apoyos reales bajo las placas base del puente | **10 placas** | 0 | **11** | `dis` (una viga necesita 2 apoyos) |
| **SC-11** | extremos de travesaño PG40 sin pieza de unión | **4** | 0 | **5** | `dis` + el propio `mod_pg40` |
| **SC-10** | espesor de la banda con que se traza el lazo | **0,633 mm** | 2,0 mm | **3,16** | `nbt90` P.bandaEsp = 2,5 (med) |
| **SC-02** | tensión que da la GEOMETRÍA del balancín | **1,91 N/mm** | 3 N/mm | **1,57** | rango sano de `params_tensor2` |
| **SC-05** | aplastamiento del labio de la ranura | **178,06 MPa** | 130 MPa | **1,37** | `web` TNUT-10-M8-01 + MAT-6063-01 |
| SC-04 | reserva de arrastre en ARRANQUE | 1,62 | 1,5 | **0,93** | Euler–Eytelwein + FS 1,5 `dis` |
| SC-09 | eje pivote Ø30 con 5 cargas PUNTUALES | 69,54 MPa | 101,67 MPa | 0,68 | `web` MAT-C45-01 + FS 3 |
| SC-08 | flecha del travesaño (luz real + NBT90) | 0,34 mm | 1,0 mm | 0,34 | `params_pg40` CARGA.flechaMaxAbs |
| SC-06 | eje del tambor con la carga real T1+T2 | 30,95 MPa | 101,67 MPa | 0,30 | `web` MAT-C45-01 + FS 3 |
| SC-07 | vida L10 del rodamiento más cargado | 1 137 889 h | 20 000 h | 0,02 | `web` BRG-L10-01 (ISO 281) |
| SC-12 | ids `web` citados en `adapt/` sin hecho | 0 | 0 | 0 | regla de oro nº 1 del repo |

---

# A · NO CUMPLE

## A1 — Los cinco puentes de calle no se apoyan en nada `SC-01`

**Qué pasa.** El **puente de calle** es la única superficie portante dentro de la
huella del NBT90: pletina A36 de **30 × 28 × 648** con regleta UHMW encima
(`params_adapt.CALLE.puente`, `dis`), una por calle, de **Y −1294 a −646**. El
bulto de 34 kg cruza los 463 mm de transferencia apoyado en la banda que corre
sobre esos cinco puentes.

Cada puente lleva dos **placas base** de 64 × 28 × 6 (`mod_calles.mjs` §3, `dis`)
en **Y = −1280 y Y = −692**, con 2 M8×16 cada una «a tuercas T de la ranura
superior del travesaño». Ese travesaño es el de la **percha**
(`params_adapt.PERCHA.travS = [−1300, −1220]`, `travN = [−712, −632]`, cara
superior en `travTopZ = 9.15`).

**La percha está desactivada.** `params_pg40.FLAGS.desactivaPercha = true`, y el
integrador filtra por `/percha/i` (`gen_sorter_co.mjs`, bloque PG40), lo que se
lleva los dos travesaños. Las placas base **no**: su nombre no casa con el
filtro. Resultado medido sobre la geometría emitida (§S SC-01, barrido AABB con
3 mm de tolerancia por debajo de cada placa):

| | |
|---|---|
| placas base de puente emitidas | **10** |
| placas con algo estructural debajo | **0** |
| lo único que tocan | su propio puente, sus 2 pernos M8 y la banda |
| travesaño PG40 más próximo, en Y | **71 mm** de hueco (el de Y −555 contra el extremo norte del puente, −646) |
| y en Z | la cara superior del travesaño está en **Z = 0**; la base de la placa, en **Z = 9,15** → **9,15 mm** por debajo |
| tramo de larguero más próximo | el sur muere en Y −1302 (8 mm antes del puente) y el norte arranca en −630 (16 mm después) |

O sea: **no es que el apoyo esté flojo, es que no existe**, ni en Y ni en Z, ni
por los travesaños ni por los largueros. Los 4 M8 de cada puente atornillan al
aire, y las 4 `Escuadra travesaño↔bastidor 3/16"` que quedaron en el modelo
(Y −1290…−1230 y −702…−642, atornilladas a los chapones) sujetan travesaños que
ya no están.

**Criterio.** No hay norma que citar: una viga necesita dos apoyos. El límite del
§S es **0 placas sin apoyo** (`dis`).

**Qué pasaría si se monta así.** El puente cae sobre el cassette del NBT90 —
debajo, a Z 15,15 − 5,62 = 9,53, está el *cross channel* elevado (§H de la
compuerta)—, y el bulto se hunde 43 mm hasta el plano del peine. Con la
transferencia elevando rodillos debajo, es un atrapamiento.

**Qué habría que cambiar (cota exacta).** Dos travesaños 40×40 ranura 10 en
**Y = −1280 y Y = −692**, cruzando de alargue a alargue, con la **cara superior
en Z = 9,15** — que es exactamente `PERCHA.travTopZ`, ya calculada como
`51,7 − 8,55 (UHMW) − 28 (pletina) − 6 (placa base)`. Como los travesaños PG40 se
emiten con `Z.travBot = −40` y canto 40 (cara superior en Z = 0), estos dos son
**distintos de los otros cuatro**: van 9,15 mm más altos. Dos caminos:

1. **Añadir `TRAVESANOS_ALTOS = [−1280, −692]`** a `params_pg40.mjs` con su propio
   `zBot = −30,85`, y que `mod_pg40` los emita con esa cota. Chocan con el
   travesaño de −555? No: quedan a 137 y 725 mm de él.
2. O **bajar la placa base 9,15 mm** (haciéndola de 15,15 de canto en vez de 6) y
   llevar dos travesaños PG40 normales a esas dos Y. Cuesta menos código y más
   chapa.

En cualquiera de los dos hay que comprobar después la **§B de la compuerta**: en
Y −1280 y −692 el travesaño está **fuera** de la huella del módulo (−1205…−742),
así que no entra en la franja del rodillo y no le aplica la ventana de 31,75.
Dueño: `adapt/params_pg40.mjs` + `adapt/mod_calles.mjs`.

---

## A2 — El tensor pone menos de la mitad de la tensión que declara `SC-02` `SC-03`

**Qué pasa.** `params_tensor2.mjs` calcula la tensión así:

```
F_tiro_ef = p · A_tiro · η = 0,4 · 412,33 · 0,85 = 140,19 N      (4 bar)
N_polea   = F · PALANCA.ratio = 140,19 · 1,841   = 258,09 N
T         = N / (2·sen(β/2)) = 258,09 / 2        = 129,04 N = 4,03 N/mm
```

y `PALANCA.ratio = 136,22 / 74,00` son las distancias **horizontales** del pivote
al yugo y del pivote a la polea (`step`, §2.4 y §4.5 del reconocimiento). Esa
relación de brazos **sólo vale si la resultante de la banda sobre la polea tensora
es vertical**.

En el lazo que construye `mod_calles.mjs` no lo es. La horquilla es asimétrica:
el volante de entrada está en **Y = −404,4** y el de salida en **Y = −195,5**, los
dos a **Z = −107,83**, y la tensora en **(−175,72, −371,89)**. Calculadas las dos
tangentes reales con la misma fórmula que usa `lib.mjs` (§S SC-02):

| | |
|---|---|
| dirección del ramal de entrada | (−0,3845, +0,9231) |
| dirección del ramal de salida | (−0,4807, +0,8769) |
| módulo de la suma | 1,9971 = 2·sen(186,12°/2) ✔ (la magnitud del módulo es correcta) |
| **dirección de la resultante** | (−0,4332, +0,9013) → **25,67° fuera de la vertical** |

Y esos 25,67° importan mucho, porque la polea está **207,19 mm por debajo** del
pivote: la componente horizontal hace momento con ese brazo. Equilibrio de
momentos completo respecto del pivote (r × F):

```
momento de la banda   = |(−74)·(+0,9013) − (−207,19)·(−0,4332)| · |Fu| · T
                      = (66,70 + 89,75) · 1,9971 · T = 312,45 · T   [N·mm por N de T]
momento del cilindro  = 136,22 · F                                  [vertical]
⇒ T = 140,19 · 136,22 / 312,45 = 61,12 N = 1,91 N/mm
```

El módulo supone **148 · T** (= 2·T vertical × 74) donde la geometría da **312,45 · T**:
un factor **2,11**. La tensión real es el **47,4 %** de la declarada.

| | declarado | geometría | criterio |
|---|---|---|---|
| T por banda | 129,04 N | **61,12 N** | — |
| T por mm de ancho | 4,03 N/mm | **1,91 N/mm** | rango sano 3…10 N/mm (`dis` del propio `params_tensor2`) |
| reacción en el pivote | 398,28 N | **255,73 N** | (favorable: el eje va sobrado, ver C3) |

**Y no se arregla subiendo la presión.** Para llegar al mínimo del rango sano
(3 N/mm) harían falta **6,28 bar** en el `AR20-02-B` — por encima de la presión
de red que el propio módulo declara como hipótesis (6 bar, `web` PNEU-003). A los
6 bar de red la tensión se queda en **2,87 N/mm**, todavía por debajo de 3.

El peso propio del brazo ayuda un poco y va a favor: la polea tensora
`POL-CON-TEN` Ø117,9 × 40 pesa 3,43 kg (`calc`, acero) y cuelga a −74 mm en Y del
pivote, o sea del mismo lado que tensa → aporta 2,49 N·m frente a los 19,1 N·m
del cilindro y sube T de 61,1 a **69,1 N = 2,16 N/mm**. Sigue fuera de rango, y el
módulo no lo cuenta ni en un sentido ni en el otro.

**Criterio.** El rango sano 3…10 N/mm es una decisión declarada del propio
`params_tensor2.TENSION.rangoSanoNmm`; **no la he cambiado**: la uso tal cual y la
comprobación falla contra ella. La coherencia entre módulos (SC-03) se juzga con
un 5 % (`dis`): por encima de eso los dos módulos están calculando geometrías
distintas y uno de los dos números es falso.

**Consecuencia funcional.** El arrastre no se cae —la reserva de capstan sigue en
3,28 en régimen (C1)—, pero:

- una banda plana por debajo de 3 N/mm **no se encarrila**: deriva sobre el tambor
  y se sale por el canto, que es justo lo que los 16,6 mm de margen de deriva del
  engomado están para absorber, no para corregir;
- el **arranque** se queda en 1,62 de reserva cuando debería ir sobrado (B1);
- y la flecha del ramal de retorno en el vano largo tambor→RR1 (507,1 mm) sube a
  **0,52 mm** con banda de 2 telas (`calc`, w = 0,98 N/m).

**Qué habría que cambiar.** Tres caminos, en orden de coste:

1. **Bajar el volante de entrada de la horquilla** hasta que la resultante quede
   vertical. Con la salida en Y −195,5 y la tensora en −175,72, la resultante es
   vertical cuando los dos ramales son simétricos respecto de la vertical de la
   tensora → el volante de entrada tendría que ir a **Y ≈ −155,9** en vez de
   −404,4. No cabe: se lo come el cilindro. Descartado, pero hay que decir por qué.
2. **Alargar el lóbulo del yugo**: con la geometría actual haría falta
   `PALANCA.yugo = 312,45/2 · 2 / 2 = 156,2`… más exacto: para T = 4,03 N/mm hace
   falta `M_cilindro = 129,04 · 312,45 = 40 320 N·mm` → con F = 140,19 N el brazo
   debe ser **287,6 mm** en vez de 136,22. El lóbulo se sale de la bahía.
3. **Subir el calibre del cilindro** (el camino B que `params_tensor2` §2 ya había
   descartado por la rótula): con un **C85 Ø32** a 4 bar el área de tiro pasa de
   412,33 a 725,7 mm² → F = 246,7 N → **T = 107,6 N = 3,36 N/mm**, dentro de rango
   y con reserva hasta 5 bar. Arrastra rótula (M10×1,25 sigue valiendo en el Ø32
   de la serie C85) y bisagra nuevas: hay que citarlas.

Dueño: `adapt/params_tensor2.mjs`. **Aviso al agente que está tocando los soportes
de los cilindros: la corrección 3 cambia el Ø de la camisa de 26,6 a ~34 y el
soporte tiene que rehacerse con esa cota.**

---

## A3 — Los travesaños del bastidor no están amarrados a nada `SC-11`

**Qué pasa.** `mod_pg40.mjs` §3 dice literalmente: *«los travesaños cruzan la LUZ
ENTRE BASTIDORES (580,84, cota congelada) […] Se amarran a ellos por escuadra, y
a los CANALES LATERALES del NBT90 por las ménsulas que suben del alma del
alargue»*. Medido sobre la geometría emitida (§S SC-11, barrido de 8 mm en cada
extremo):

| travesaño | extremo −X | extremo +X |
|---|---|---|
| Y −1520 (L = 423,9) | cabezal de rodamiento del alargue (contacto, sin tornillo) | ídem |
| **Y −1440 (L = 580,8)** | **nada: topa contra el chapón `FRAME_MIR_MIR`** | **nada: topa contra el chapón `FRAME_MIR_MIR_MIR`** |
| **Y −555 (L = 580,8)** | **nada** | **nada** |
| Y −100 (L = 423,9) | cabezal de rodamiento | canal `TER1/CAN0` + cabezal |

**4 extremos sin ninguna pieza de unión.** No hay escuadra, ni tuerca martillo, ni
tornillo: el perfil de aluminio termina a hueso contra la cara interior del
chapón de acero del cliente (X −81,423 y 499,418 `step`).

Y hay un segundo tramo del mismo camino de carga sin resolver: las **4
`Ménsula alma↔travesaño`** (24 × 30 × 8, `dis`) que suben del alma del alargue al
travesaño **sólo topan**: su canto superior está en Z = −40 y la cara inferior del
travesaño también, es un contacto de arista y **no llevan tornillería emitida**.

**Por qué importa aquí y no en la versión anterior.** Con la percha desactivada,
**el NBT90 entero (113,9 kg, `nbt90` masaKg, cota superior) cuelga del alargue**, y
el alargue del lado −X no tiene más apoyo vertical que esas dos ménsulas (el lado
+X sí: 8 M10 al chapón). O sea que **medio módulo de transferencia —558 N— baja
por dos chapitas de 8 mm que sólo apoyan sobre un perfil de aluminio que a su vez
no está sujeto a la máquina**.

**Las cuentas, para que se vea que el problema es la unión y no la sección:**

| | valor | criterio |
|---|---|---|
| carga por ménsula | 279,2 N (`calc`: 113,9 kg / 4) | — |
| compresión en la ménsula (24 × 8) | 1,45 MPa | A36, sobrado |
| flecha del travesaño con esa carga + bulto | **0,34 mm** (§S SC-08) | ≤ 1,0 mm ✔ |
| σ en el travesaño | 18,07 MPa | Rp0,2 6063-T5 = 130 (`web` MAT-6063-01) ✔ |

**Qué habría que cambiar.** Una escuadra de 4 tornillos por extremo de travesaño
largo contra el chapón (los chapones son de 28 mm: rosca M8 directa, o pasante con
tuerca), y **2 M8 con tuerca martillo por ménsula** a la ranura inferior del
travesaño. Son 8 escuadras + 8 tornillos y 8 tuercas martillo. Dueño:
`adapt/mod_pg40.mjs`.

---

## A4 — Todo el lazo está trazado con un espesor de banda que no es de banda plana `SC-10`

**Qué pasa.** `params_adapt.STEP.bandaDorso = 0,633` es una cota **medida**, sí,
pero es el **convenio con el que el cliente modeló su banda T5 DENTADA**
(`SORTER_CO.md` §4.3: dorso 52,333 − cara de guía 51,7). El propio
`params_tambores.FIJO.bandaEsp` lo dice y lo asume: *«una banda plana real de 2
telas mide ~2,5 (nbt90 P.bandaEsp) y si el cliente la adopta lo único que cambia
es la cara de la guía UHMW»*.

**No es lo único que cambia.** El dato firme del repositorio es
`nbt90/params.mjs` **`bandaEsp: 2,5` (med 2,53)** — la banda plana de 1" que ya
corre en la transferencia. Con 2,5 mm en vez de 0,633:

| | con 0,633 (modelo) | con 2,5 (banda real) |
|---|---|---|
| cara superior de la banda sobre el tambor | 52,333 (= plano congelado) | **54,20** → el plano de transporte sube **1,87 mm** |
| emergencia útil del rodillo del NBT90 | +6,35 sobre el bulto | +4,48 |
| holgura conducido Ø108 ↔ larguero sur | **2,22 mm** (`mod_tambores` §4.3) | **0,35 mm** |
| holgura tambor Ø108,9 ↔ larguero norte | 3,55 mm | 1,68 mm |

Los 1,87 mm no son de la guía UHMW: son del **tambor, del conducido y de las 20
regletas**, porque los tres definen la cota de rodadura del **dorso**. Y las
holguras a los largueros están medidas al **tubo**, no a la banda: al meter la
banda real se comen 1,87 mm y la del conducido se queda en **0,35 mm**, que no es
una holgura de montaje.

**Criterio.** ≥ 2,0 mm (`dis`, con el 2,5 medido del NBT90 como referencia).

**Qué habría que cambiar.** Cerrar el espesor con el proveedor de banda (está en
`pendientes_sin_fuente`) y, con él:
`Z.guiaTop`, `TAMBORES.motriz.z`, `TAMBORES.conducido.z` y las 4 Z de RR1…RR4
bajan esa misma cantidad; el resto del lazo se recalcula solo porque cuelga de
`planoDorso`. Dueño: `adapt/params_tambores.mjs`.

---

## A5 — El labio de la ranura se aplasta al apretar la tuerca martillo `SC-05`

**Qué pasa.** Es el modo de fallo típico del perfil ranurado y no lo mira nadie.
La tuerca martillo apoya sobre los **dos labios** de la ranura y el apriete del
tornillo se descarga entero sobre ellos.

| dato | valor | procedencia |
|---|---|---|
| par máximo de una tuerca T M8 en ranura 10 | **25 N·m** | `web` **TNUT-10-M8-01** — Bosch Rexroth, *«10mm T-Nuts … M8 25 Nm»* |
| factor par/precarga K | 0,20 | `dis` (el mismo que `nbt90` LIM.perno38.K) |
| **precarga** | **15 625 N** | `calc` = 25 000 / (0,20 · 8) |
| huella del ala sobre los 2 labios | 87,75 mm² (2 × 19,5 × 2,25) | `dis` — la tuerca real no está modelada ni designada |
| **presión sobre el labio** | **178,06 MPa** | `calc` |
| Rp0,2 EN AW-6063 **T5**, t ≤ 10 | **130 MPa** | `web` **MAT-6063-01** — Hydro, EN 755-2:2016 |
| Rp0,2 EN AW-6063 **T6**, t ≤ 10 | 170 MPa | ídem |

**`params_pg40.PERFIL` declara la aleación (`EN AW-6063`) pero no el temple**, así
que el §S juzga con el más débil de la familia: **178,06 / 130 = 1,37**. Ni
siquiera con T6 pasa (1,05).

**Esto no es un fallo de servicio.** Las cargas de servicio sobre las tuercas
martillo son de decenas de newton (el bulto de 333,54 N se reparte en 4 tornillos
por puente, y va a **compresión** contra el perfil, no a arranque). El fallo es
**de montaje**: el montador aprieta al par de catálogo y hunde el labio, y a
partir de ahí la unión ya no tiene precarga y se afloja con la vibración.

**Qué habría que cambiar.** Dos cosas, las dos en `params_pg40.mjs`:

1. **Declarar el temple** — mínimo **T6** (`Rp0,2 = 170`).
2. **Declarar el par de apriete** de las tuercas martillo. Con la huella de 87,75
   mm² y T6, el par admisible es **18,25 N·m** (`calc`, §S lo publica en
   `SC.tuercaT.parAdmisibleConEsteTempleNm`); con T5, 13,96 N·m.

Alternativa si el perfil que compre el cliente resulta ser T5: **arandela de
reparto bajo cada tuerca**, que sube la huella de 87,75 a ~200 mm² y baja la
presión a 78 MPa. Dueño: `adapt/params_pg40.mjs`.

---

# B · CUMPLE JUSTO

## B1 — El arranque va con 1,62 de reserva contra el patinaje `SC-04`

**Qué pasa.** `mod_tambores.mjs` §4.7 comprueba el capstan **sólo en régimen**:
`Te_max = 5·T2·(e^{µπ} − 1)` contra `Te_req = 186,77 N` → reserva 6,92 con la
tensión declarada. El caso que manda es el **arranque**, y no lo mira nadie.

Inercias, calculadas de los Ø publicados (`calc`, acero 7,85 g/cm³, goma 1,15,
banda 1,25 con el espesor real de 2,5):

| elemento | J (kg·m²) | referido al tambor | % |
|---|---|---|---|
| tambor Ø108,9 (tubo + goma + eje) | 0,00984 | 0,00984 | 8,5 |
| conducido Ø108 | 0,00910 | 0,00926 | 8,0 |
| 4 rodillos de retorno Ø88,9 | 0,00448 c/u | 0,02688 | 23,1 |
| 5 poleas tensoras Ø117,9 | 0,00596 c/u | 0,02544 | 21,9 |
| **10 volantes de contraflexión Ø110** | 0,00317 c/u | **0,03766** | **32,4** |
| 5 bandas | — | 0,00723 | 6,2 |
| **J equivalente** | | **0,110 kg·m²** | |
| + 2 bultos de 34 kg (si no patinan) | | 0,2016 | |

Lo que más inercia mete son **los diez volantes de la horquilla del tensor**, que
existen sólo porque el ramal tiene que rodear la tensora. Con eso:

| rampa | α (rad/s²) | Te en la banda | Te máx del capstan | reserva |
|---|---|---|---|---|
| 0,25 s | 136,3 | 954 N | 612 N | **0,64 → PATINA** |
| 0,50 s | 68,1 | 572 N | 612 N | 1,07 |
| **1,00 s (declarada aquí)** | 34,1 | **378,6 N** | **612,1 N** | **1,62** |

- `Te máx` está calculado con la tensión **real** de A2 (61,12 N/banda), no con la
  declarada. Con la declarada la reserva subiría a 3,41.
- **Rampa mínima admisible: 0,87 s** para el FS 1,5.

**Criterio.** FS ≥ 1,5 en el transitorio (`dis`, declarado en `LIMS.arranque`).
El módulo ya exige 2,0 en régimen (`CARGA.fsCapstanMin`); en el arranque se admite
menos porque dura menos de un segundo y no se repite con carga.

**La rampa de 1,0 s es una decisión NUEVA de esta revisión**, no un dato del
diseño: en ningún parámetro hay rampa declarada. Está en `LIMS.arranque.rampaS`
con su justificación y queda en `pendientes_sin_fuente`.

**Qué habría que cambiar.** Declarar la rampa en `params_tambores.mjs` y ponerla
en el arrancador: **≥ 0,9 s**, y si se cierra A2 (tensión correcta) el margen se
triplica y deja de ser crítica. El par de arranque queda en **10,75 N·m** con esa
rampa, contra los 10,17 de régimen: **el motorreductor no cambia**.

---

# C · CUMPLE

## C1 — Tensión de banda y arrastre, de punta a punta

Rehecha la cadena completa con las envolventes que emite `mod_calles`
(tambor 180°, conducido 180°, RR1/RR2 96,5°, RR3/RR4 102,39°, tensora 186,12°):

| paso | declarado | recalculado | veredicto |
|---|---|---|---|
| F del cilindro a 4 bar | 140,19 N | 140,19 N | ✔ (área de tiro y η bien) |
| N sobre la tensora | 258,09 N | **122,1 N** | ✘ ver A2 |
| T por banda | 129,04 N | **61,12 N** | ✘ ver A2 |
| capstan e^{0,35·π} | 3,003 | 3,003 | ✔ |
| Te máx (5 bandas) | 1 292 N | **612 N** | — |
| Te requerido en régimen | 186,77 N | 186,77 N | ✔ |
| **reserva al patinaje, régimen** | ×6,92 | **×3,28** | ✔ (mín 2,0) |

La `reserva ×15,5` que imprime el bloque TENSOR es otra cosa: compara `Fe` contra
el **arrastre del bulto sobre el UHMW repartido entre 5 bandas** (16,68 N/banda),
sin contar los 20 N de los rodillos ni los 2 bultos simultáneos que sí cuenta
`mod_tambores`. Las dos cuentas son correctas, pero **no son la misma** y en el
informe salen juntas como si lo fueran. La que manda es la de `mod_tambores`
(×6,92 declarada, **×3,28 real**).

## C2 — Ejes del accionamiento

Viga biapoyada con las 5 cargas puntuales en los ejes de banda, carga **T1 + T2**
(no 2·T2: en marcha el ramal tenso vale `T2 + Te/5` = 166,4 N):

| eje | vano | σ | flecha | criterio | uso |
|---|---|---|---|---|---|
| **tambor Ø35** (2 × UCF 207) | 535,92 | 30,85 MPa · τ 1,42 → **30,95 von Mises** | 0,24 mm | 305/3 = 101,67 MPa | **0,30** |
| **conducido Ø35 fijo** | 411,92 | 22,63 MPa | 0,11 mm | ídem | 0,22 |
| **retorno Ø30 fijo** (RR3/RR4, el peor) | 411,92 | 28,01 MPa | 0,15 mm | ídem | 0,28 |

- El límite es **C45 en estado NORMALIZADO, Rp0,2 = 305 MPa** (`web` MAT-C45-01,
  EN 10083-2, 16–100 mm) con FS 3, porque **`params` no declara el estado de
  suministro** (dice sólo «C45 rectificado h9»). Si el cliente los pide
  bonificados (+QT), el admisible sube a 430/3 = 143 MPa y sobra todavía más.
- El cálculo es **conservador a propósito**: modela toda la luz como eje desnudo
  Ø35, cuando entre las dos tapas soldadas el tubo Ø88,9 × 3,2 aporta
  **I = 791 900 mm⁴ frente a 73 662** del eje, 10,7 veces más. La flecha real del
  tambor es una fracción de esos 0,24 mm.
- **Torsión: no es el criterio.** Par de régimen 10,17 N·m → τ = 1,21 MPa. Con el
  motorreductor de ≥ 450 W a 325,3 rpm el par nominal es 13,21 N·m (τ = 1,57) y
  con factor de arranque ×2,5, 33,0 N·m (τ = 3,92). Un Ø35 va sobradísimo.
- **Chaveta DIN 6885 A 10 × 8 × 100:** al par nominal, F = 755 N →
  aplastamiento en el eje (t1 = 5) **1,51 MPa**, cortante en la chaveta 0,76 MPa.
  Con arranque ×2, 3,02 y 1,51 MPa. Trivial.

## C3 — Eje pivote del tensor, brazos y apoyos `SC-09`

**El eje cumple, pero el número del módulo está mal calculado.**
`params_tensor2.EJE_CALC` usa la fórmula de **carga repartida** (`M = W·L/8`,
`δ = 5WL³/384EI`) para **5 cargas concentradas** que además no están centradas en
el vano: los ejes de calle van de 127,06 a 431,86 y las chumaceras de −81,42 a
499,42.

| | módulo (repartida) | §S (5 puntuales) | diferencia |
|---|---|---|---|
| σ | 54,55 MPa | **69,54 MPa** | **+27,5 %** |
| flecha máxima | 0,609 mm | **0,75 mm** (en X = 223,5) | **+23,2 %** |
| reacciones | — | 754 / 1 237 N | asimétricas |

Y el `fyMPa = 430` que usa es el del **C45 bonificado** (`web` MAT-C45-01: +QT,
Ø16–40); el §S lo juzga con el **normalizado, 305 MPa**, que es lo que se compra
si no se especifica. Aun así: **69,54 < 101,67 → uso 0,68, CUMPLE.** Con la
tensión real de A2 la reacción por brazo baja de 398,28 a 255,73 N y σ a 44,6 MPa.

- **Casquillos del pivote:** 398,28 / (30 × 25 × 2) = **0,266 MPa**. Sobrado
  (los casquillos de fricción admiten ≥ 5 MPa). Con la reacción real, 0,171.
- **Chumaceras UCFL 206:** P = 1 237 N la más cargada. La designación está
  declarada como **PENDIENTE de cita específica** en el propio módulo
  (`ucflNota`); con la C de una UC 206 (≈ 19,5 kN) la vida es de varios millones
  de horas y el criterio no manda.
- **Brazo del tensor** (2 pletinas A36 e = 8): M = N · r_polea = 258,09 × 220,01 =
  **56,8 N·m** con la N declarada. Con un canto de 50 mm junto al cubo,
  W = 6 667 mm³ → **8,52 MPa**. Con la N real, 4,03 MPa. Sobrado en cualquier
  hipótesis de silueta.

## C4 — El engomado del tambor

| | valor | criterio |
|---|---|---|
| presión radial banda↔goma, `p = T/(r·b)` | **0,074 MPa** (declarada) · **0,035** (real) | — |
| cortante en el vulcanizado goma↔tubo, `Te/(π·D·L)` | **0,0018 MPa** | — |

Los dos están **dos y tres órdenes de magnitud** por debajo de cualquier valor
razonable para un caucho de 60 Sh A vulcanizado en caliente. **No se ha encontrado
ficha citable** de presión admisible ni de adherencia del vulcanizado (queda en
`pendientes_sin_fuente`), así que el veredicto es **cumple por margen, no por
cita**. Con esos números no hace falta la cita: haría falta multiplicar la tensión
por 20 para acercarse a algo.

Lo que sí conviene decir: **las 5 bandas ocupan 160 mm de los 370 de cara
engomada** (43 %). La goma trabaja en cinco franjas de 32 mm con 44 mm de goma
descargada entre ellas; eso es correcto para el tracking, pero el desgaste será
en cinco surcos y hay que preverlo en el mantenimiento (rectificado del engomado).

## C5 — Rodamientos: vida L10 `SC-07`

ISO 281 (`web` **BRG-L10-01**): `L10 = (C/P)³` Mrev, `L10h = L10·10⁶/(60n)`, con
las C de catálogo citadas y la carga T1 + T2:

| rodamiento | P | n | C (catálogo) | C/P | L10 |
|---|---|---|---|---|---|
| UC 207 del tambor (el más cargado) | 777 N | 325,3 rpm | 25 700 N (`web` BRG-UCF207-01) | 33,1 | 1 852 604 h |
| 6207-2RS del conducido (×2) | 739 N | 328,0 rpm | 25 700 N (`web` BRG-6207-01) | 34,8 | 2 140 549 h |
| 6206-2RS de RR3/RR4 (el peor) | 648 N | 398,6 rpm | 19 500 N (`web` BRG-6206-01) | 30,1 | **1 137 889 h** |

Objetivo 20 000 h (`dis`, el mismo que fijó la revisión del NBT90) → **uso 0,02**.
La carga mínima orientativa de SKF para estos tamaños (≈ 62–73 N) queda muy por
debajo de la de trabajo: **no hay riesgo de patinaje de las bolas** por carga
insuficiente.

**Dos correcciones de dato, ya aplicadas a las citas:**

- `params_tambores` citaba **`BRG-6207`** y **`BRG-6206`**, ids que **no existían
  en ningún `web_facts.json`**: las C y C0 estaban inventadas. Ya están los
  hechos `BRG-6207-01` y `BRG-6206-01` (Timken, cita verbatim) y las citas
  corregidas.
- El **C = 20 300 N declarado para el 6206** está **4,1 % por encima** del de
  catálogo (19 500). Es del lado inseguro. No lo he cambiado —el número es de ese
  módulo— pero **§S calcula la vida con el 19 500 citado**, y hay que corregirlo.

## C6 — Bastidor PG40: flecha del larguero y de los travesaños `SC-08`

**La flecha declarada de 0,103 mm es correcta**, verificada con la sección real:

```
δ = P·L³/(48·E·I) = 333,54 · 455³ / (48 · 69 500 · 91 000) = 0,1035 mm
```

con `P = 34 kg · 9,81 = 333,54 N` (`nbt90` cargaMaxKg, `web` SORT-013), `E = 69 500`
(`web` ALU-001), `Ix = 9,1 cm⁴ = 91 000 mm⁴` (`web` PG40-001) y el vano mayor entre
travesaños, **455 mm** (de −555 a −100). Límite `min(1,0 ; L/500) = 0,91 mm` →
**uso 0,114**. σ = (P·L/4)/Wx = **8,43 MPa** contra 130 MPa de Rp0,2 T5 (`web`
MAT-6063-01) → uso 0,065. El peso propio del perfil + regleta añade 0,0018 mm.

Lo que el módulo **no** mira y aquí se añade:

| caso | flecha | σ | veredicto |
|---|---|---|---|
| voladizo sur del larguero (138 mm más allá del travesaño de −1440) | **0,073 mm** | 10,23 MPa | ✔ |
| voladizo norte (75 mm más allá del de −555) | 0,052 mm | — | ✔ |
| **travesaño con la luz REAL** (580,84, no los 423,92 que usa el módulo) | 0,215 mm | 10,76 MPa | ✔ |
| **travesaño con la luz real + el NBT90 colgado** (279,2 N por ménsula) | **0,34 mm** | **18,07 MPa** | ✔ (uso 0,34) |

`mod_pg40` calcula la flecha del travesaño sobre `PUBLICA.luzEntreCaras = 423,924`,
que es la luz entre las **caras de apoyo de los rodamientos**, no la del travesaño
que emite (**580,841**, de chapón a chapón). Es un factor 2,57 en L³. Aun así
cumple: 0,34 < 1,0 mm. **La sección del perfil no es el problema del bastidor; el
problema es que no está amarrado (A3).**

## C7 — Puente de calle: la sección aguanta, lo que falta es el apoyo

Pletina A36 30 × 28 → `I = 54 880 mm⁴`, `W = 3 920 mm³`. Con el vano de diseño de
**588 mm** (entre las placas base de −1280 y −692), **si tuviera los apoyos**:

| hipótesis | flecha | σ |
|---|---|---|
| bulto entero (333,54 N) al centro | **0,129 mm** | 12,51 MPa |
| medio bulto (la hipótesis de `params_adapt`) | 0,064 mm | 6,25 MPa |

Cumple con holgura contra A36 (0,6·Fy = 150 MPa, `web` STR-005 del NBT90). El
comentario de `CALLE.puente` (*«flecha < 0,1 mm con medio bulto»*) es correcto.
**Todo esto es académico mientras no exista el apoyo (A1).**

Y la presión sobre la regleta UHMW es despreciable: con el bulto sobre una sola
calle y una huella de 300 mm, **0,035 MPa**; PV = 0,013 MPa·m/s.

## C8 — Alargue lateral: la sección va sobrada, la unión también

El alargue es la pletina de acero A36 **e = 8** que lleva los rodamientos del
tambor y del conducido, y es a la vez el **tirante** que cierra la tensión de las
5 bandas entre los dos extremos.

| | valor | criterio | veredicto |
|---|---|---|---|
| tracción total del lazo (5 × (T1 + T2)) | 1 477 N → **739 N por lado** | — | — |
| sección del alma (8 × 152) | 1 216 mm² | | |
| **σ de tracción** | **0,61 MPa** | 150 MPa (0,6·Fy A36) | uso 0,004 |
| excentricidad de la línea de carga (entra en Z ≈ −2,5, centroide del alma en −146) | 143,5 mm → M = **106 N·m** | — | — |
| σ de flexión en el cabezal (8 × 190 en su plano, W = 48 133 mm³) | **1,2 MPa** | | ✔ |
| NBT90 colgado de 6 pernos 3/8 | **186,2 N/perno** | 0,6·Sp·As = 11 370 N Gr2 (`web` HW-007) | **FS 61** |
| aplastamiento en el alma de 8 | 2,44 MPa | | ✔ |
| aplastamiento en el alma 12 GA del side channel (2,657) | 7,36 MPa | | ✔ |
| unión al chapón: 8 M10 por lado | 8 × ~93 N | — | ✔ |

**Estructuralmente el alargue no tiene ningún problema: va dos órdenes de magnitud
por debajo.** Lo que sí hay que registrar es que **la comprobación §G de la
compuerta (cuelgue del NBT90) se apaga entera cuando `desactivaPercha = true`** y
nadie la sustituyó: la carga cambió de camino y el nuevo camino no se comprobaba.
Aquí queda comprobado (los 186,2 N/perno de arriba) y el eslabón débil del nuevo
camino no es el perno: es A3.

## C9 — Trazabilidad `SC-12`

Escaneados los 8 ficheros de `adapt/`: **32 ids `web` citados**, contrastados
contra `web_facts.json` del sorter y `../nbt90/analisis/web_facts.json` (cita
cruzada legítima a la especificación congelada). Tras corregir los dos huérfanos,
**0 sin fuente**. La comprobación queda en la compuerta y muerde
(`TEST_ROMPE=fuente`).

---

# D · NO SE PUEDE SABER

Siete datos que **no están en el modelo ni se pueden medir en el STEP**, y sin los
cuales una comprobación se queda abierta. Todos quedan en
`web_facts.json → pendientes_sin_fuente`.

## D1 — La masa del motorreductor que cuelga del eje del tambor

`params_tambores.TAMBOR.motorreductor` es *«reductor de EJE HUECO Ø35 H7 con
chaveta y brazo de reacción (montaje directo sobre el saliente; sin acoplamiento
ni alineación)»*. **No hay masa declarada, y el reductor cuelga en voladizo del
propio eje** (saliente X 582,868…700; chavetero 590…690, o sea que el cubo hueco
carga centrado en X ≈ 640, a **78,6 mm del apoyo +X**).

Barrido del efecto (`calc`, con la carga de banda T1 + T2 de fondo):

| masa | fuerza | M en el apoyo | σ de voladizo | reacción del apoyo +X |
|---|---|---|---|---|
| — | — | — | — | 700 N |
| 15 kg | 147 N | 11,6 N·m | 2,75 MPa | **869 N** (+24 %) |
| 20 kg | 196 N | 15,4 N·m | 3,66 MPa | **925 N** (+32 %) |
| 25 kg | 245 N | 19,3 N·m | 4,58 MPa | **981 N** (+40 %) |
| 30 kg | 294 N | 23,1 N·m | 5,49 MPa | **1 037 N** (+48 %) |

Aun con 30 kg el eje va a 36 MPa y la vida del UC 207 sigue en 10⁶ horas: **el
hallazgo no es que no aguante, es que la comprobación no se puede cerrar** y el
apoyo +X sube casi un 50 %. Lo cierra el cliente eligiendo el reductor.

**Y hay una pieza que falta.** El **brazo de reacción** necesita un anclaje, y en
el modelo no existe ninguno. La fuerza es pequeña —con 250 mm de brazo, 40,7 N en
régimen, 105,7 N con arranque ×2— pero la pieza tiene que estar y hoy no está.
Dueño: `adapt/params_tambores.mjs`.

## D2 — La banda plana: fabricante, telas, espesor, k_adm y Ø mínimo

Ya estaba en `pendientes_sin_fuente` para el Ø mínimo de polea; se amplía. Sin el
espesor real no se cierra A4; sin el `k_adm` no se puede juzgar la tensión por
resistencia (con 1,91 N/mm estamos al 9 % del `k_adm` de la banda plana del NBT90,
21 N/mm `web` BELT-005, así que el riesgo es bajo, pero es una extrapolación).

## D3 — El estado de suministro de los ejes de C45

`params` dice «C45 rectificado h7/h9». **+N → Rp0,2 = 305 MPa · +QT → 430 MPa**
(`web` MAT-C45-01): un 41 % de diferencia. `params_tensor2.EJE_CALC.fyMPa` ya usa
el 430 del bonificado sin decirlo. El §S juzga con el 305 y todo sigue cumpliendo,
pero **hay que escribir el estado en el plano**.

## D4 — El temple del perfil PG40 y el par de apriete

Ver A5. Sin las dos cosas, SC-05 no se cierra.

## D5 — La rampa de arranque

Ver B1. `LIMS.arranque.rampaS = 1,0` es una hipótesis **de esta revisión**, no un
dato del diseño.

## D6 — Presión admisible del engomado y adherencia del vulcanizado

Ver C4. No se ha encontrado ficha citable. Veredicto por margen, no por cita.

## D7 — La designación de la tuerca martillo

No hay pieza ni designación en el modelo: sólo la mención «tuercas martillo M8
ranura 10» en las notas de `mod_pg40`. La huella de 87,75 mm² con la que se juzga
A5 es la del catálogo citado, no la de la tuerca que se compre.

---

# E · Qué se ha metido en la compuerta y cómo se ha verificado que muerde

## E1 — Las 12 comprobaciones

Viven en `gen_sorter_co.mjs`, bloque **`▼▼▼ S. REVISIÓN ESTRUCTURAL ▼▼▼`** dentro
de `verify()`, con la misma mecánica que `../nbt90/gen_nbt90.mjs` §9:

- **`LIMS`** — todos los límites, cada uno con su id de `web_facts.json` o marcado
  `dis` con su justificación. **Ninguno se ha ajustado para que algo pase**; el
  rango sano de banda (3…10 N/mm) y los límites de flecha son los que ya
  declaraban los propios módulos.
- **`HALLAZGOS_SC`** — las 6 dispensas, con su `uso` y su dueño. Si una **empeora**
  (> ×1,02) la compuerta para; si una **pasa a cumplir**, la compuerta para
  pidiendo que se borre la dispensa; si aparece una violación que no está en la
  lista, para sin más.
- **`vigaS` / `tangenteS` / `L10hS`** — las cuentas se escriben en la compuerta y
  **no se importan de ningún módulo**: el sentido de §S es recalcular por su
  cuenta lo que los módulos declaran. `vigaS` repite a propósito la viga de
  `mod_tambores`.
- El resultado va a `meta.verificaciones.estructural` del JSON emitido (tabla,
  abiertos, datos y límites) y se imprime **siempre**, cumpla o no, **antes** del
  veredicto.

Seis de las doce leen **la geometría emitida**, no parámetros: SC-01 (barrido AABB
bajo cada placa base), SC-02/03 (tangentes reales del lazo que construyó
`mod_calles`), SC-08 (luz medida del travesaño emitido), SC-11 (extremos de
travesaño) y SC-12 (escaneo de los fuentes de `adapt/`).

## E2 — El banco: 8 casos nuevos, cada uno verificado

`TEST_ROMPE` pasa de 16 a **24 casos**. Los 8 nuevos:

| caso | qué inyecta | qué pasa | verificado |
|---|---|---|---|
| `apoyo` | devuelve un travesaño bajo cada placa base | **SC-01 pasa a cumplir** → falla pidiendo borrar la dispensa (y SC-11 empeora de 5 a 9: el travesaño de banco tampoco lleva amarre) | exit 1 |
| `presion` | baja la presión de trabajo a 2,5 bar | **SC-02 empeora** de 1,57 a 2,51 → falla; arrastra SC-04 a 1,01 | exit 1 |
| `rampa` | rampa de 0,25 s | **SC-04 cae a 0,64** (patina) → falla, no tiene dispensa | exit 1 |
| `apriete` | par de tuerca martillo a 60 N·m | **SC-05 empeora** de 1,37 a 3,29 | exit 1 |
| `eje` | adelgaza el eje del tambor a Ø22 | **SC-06 se dispara** a 124,59 MPa > 101,67 (y con él la §(6) de TAMBORES: el eje deja de ser el barreno del UCF 207) | exit 1 |
| `rodamiento` | un 6206 de C = 2 600 N | **SC-07 cae a 2 697 h** < 20 000 | exit 1 |
| `banda` | pone el dorso de banda en 2,5 mm | **SC-10 pasa a cumplir** → falla pidiendo borrar la dispensa | exit 1 |
| `fuente` | inyecta un id `web` sin hecho | **SC-12 lo encuentra** | exit 1 |

Los tres casos que faltan por banco (SC-08, SC-09, SC-11 en su dirección propia)
usan exactamente la misma máquina de `chkS` que los ocho de arriba: la lógica de
«empeora» y «ya cumple» queda demostrada por `apoyo`, `presion`, `apriete` y
`banda`.

### E2-bis — Dos casos del banco ANTERIOR se han quedado muertos

Pasado el banco entero, **22 de los 24 casos paran la compuerta y dos no**:

| caso | exit | por qué |
|---|---|---|
| `at10` | **0** | mueve la `Polea AT10 32T … recolocada`, que ya **no se emite**: se la lleva `params_tambores.RETIRA.rx` («Polea AT10 32T») al pasar al tambor motriz |
| `retencion` | **0** | roba los `Anillo 3AM1-20 (V2…)` de las poleas de pozo V1…V4, que ya no existen (`FLAGS.desactivaTransmisionT5`), y la comprobación §M4 que los reclamaba está apagada por esa misma bandera |

**No es un defecto que haya introducido esta revisión** — los dos casos murieron
cuando el cliente cambió de arquitectura y las piezas que inyectaban el defecto
dejaron de emitirse. Pero un caso de banco que devuelve 0 es peor que no tenerlo:
parece que la compuerta está probada y no lo está. Hay que retirarlos o
reescribirlos contra las piezas nuevas. **No los he tocado**: son de
`mod_estaciones`/`mod_calles` y quitarlos sería decidir por su dueño.

**Verificación de partida y de llegada**, desde `cad/`:

```
node ensambles/sorter_co/gen_sorter_co.mjs
→ §S REVISIÓN ESTRUCTURAL: 12 comprobaciones · 6 hallazgo(s) abierto(s)
→ OK: 1030 piezas (585 propias, 284 del NBT90 embebido, 161 contexto cliente)
```

## E3 — Qué NO he tocado

- **Ninguna cota geométrica.** Ni un Ø, ni una Y, ni una Z.
- **Ningún umbral existente.** El rango sano de banda, `flechaMaxAbs`,
  `flechaMaxRel`, `sigmaAdmMPa`, `fsCapstanMin` y `L10objetivoH` se usan tal como
  estaban.
- **Los valores de C declarados** en `params_tambores` (25 500 y 20 300): sólo he
  corregido el **id de la cita** y he anotado en el propio fichero que el 20 300
  está 4,1 % por encima del catálogo. El cálculo de §S usa el de catálogo.

---

## Lista de la compra para cerrar los seis abiertos

| # | hallazgo | dueño | qué hay que hacer |
|---|---|---|---|
| 1 | `SC-01` | `params_pg40` + `mod_calles` | 2 travesaños 40×40 en Y −1280 y −692 con cara superior en Z 9,15 |
| 2 | `SC-02`/`SC-03` | `params_tensor2` | C85 **Ø32** (o rehacer el balancín): T pasa de 1,91 a 3,36 N/mm |
| 3 | `SC-05` | `params_pg40` | declarar temple ≥ T6 y par de apriete ≤ 18,25 N·m |
| 4 | `SC-10` | `params_tambores` | cerrar el espesor real de banda y bajar tambor, conducido y las 20 regletas esa cantidad |
| 5 | `SC-11` | `mod_pg40` | 8 escuadras de travesaño a chapón + 2 M8 por ménsula |
| 6 | — | `params_tambores` | corregir C del 6206 a 19 500 N y declarar la masa del motorreductor y su brazo de reacción |
| 7 | `E2-bis` | `mod_estaciones` / `mod_calles` | retirar o reescribir `TEST_ROMPE=at10` y `=retencion`, que ya no paran nada |

---

## Reproducir

Desde `cad/`:

```
node ensambles/sorter_co/gen_sorter_co.mjs                 # baseline: OK + tabla §S
TEST_ROMPE=apoyo      node ensambles/sorter_co/gen_sorter_co.mjs   # SC-01
TEST_ROMPE=presion    node ensambles/sorter_co/gen_sorter_co.mjs   # SC-02/03
TEST_ROMPE=rampa      node ensambles/sorter_co/gen_sorter_co.mjs   # SC-04
TEST_ROMPE=apriete    node ensambles/sorter_co/gen_sorter_co.mjs   # SC-05
TEST_ROMPE=eje        node ensambles/sorter_co/gen_sorter_co.mjs   # SC-06
TEST_ROMPE=rodamiento node ensambles/sorter_co/gen_sorter_co.mjs   # SC-07
TEST_ROMPE=banda      node ensambles/sorter_co/gen_sorter_co.mjs   # SC-10
TEST_ROMPE=fuente     node ensambles/sorter_co/gen_sorter_co.mjs   # SC-12
```

Los números de este informe salen de `meta.verificaciones.estructural` del
`sorter_co_adaptado.json` emitido (`comprobaciones`, `abiertos`, `datos`,
`limites`).
