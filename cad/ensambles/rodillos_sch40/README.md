# RC-SCH40-48 — rodillo transportador PLANO y CÓNICO sobre cañería SCH 40 NPS 1-1/2"

Diseño fabricable de dos rodillos que comparten el mismo núcleo:

- **PLANO** (cilíndrico) — el rodillo base.
- **CÓNICO** (para curva) — *exactamente el mismo rodillo plano* más tres camisas
  plásticas cónicas encajadas sobre el tubo.

Réplica funcional de los Damon **2.240.SHC.AFA** (recto) y **2.640.SHJ.AFA**
(cónico), sustituyendo el tubo Ø50×1.5 por **cañería ASTM A53 Gr.B SCH 40 NPS
1-1/2"** (Ø48.26 × 3.68), que es lo que se consigue en Chile.

**El envolvente es idéntico al del catálogo** — luz entre largueros 532, sobre
tapas 531, sobre ejes 553, tubo 522 — así que el rodillo entra en el mismo
bastidor sin tocar nada.

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `params.mjs` | todas las cotas, cada una con su procedencia (`cat`/`med`/`nor`/`dis`/`req`) |
| `plano.mjs` | el núcleo del rodillo: tubo, tapas, rodamientos, eje pasante, anillos, resortes |
| `conico.mjs` | el mismo núcleo + las camisas cónicas |
| `gen_rodillos.mjs` | integrador y **compuerta de verificación** (falla y no escribe si algo no cierra) |
| `lib.mjs` | primitivas de geometría (copia literal de la del NBT90) |
| `_check.mjs` | banco de pruebas por módulo (malla real de cada pieza) |
| `planos_rodillos.mjs` | planos de fabricación + lista de materiales |
| `a_step.py` / `verificar_step.py` | STEP AP242 y su verificación contra la malla |
| `interferencias_brep.py` | interferencias exactas con sólidos OpenCascade |
| `export_glb.mjs` | GLB para el visor |
| `regenerar.sh` | rehace todo de una vez |
| `abastecimiento.mjs` | cantidades, plazos, rutas de compra y costo para un lote con fecha |
| `ABASTECIMIENTO.md` | **el plan de compra**: qué se trae de China, qué se compra en Chile, qué se fabrica |
| `ver_corte.html` / `render.mjs` | visor de corte y renderizador de vistas |
| `ESCALA.md` | de qué píxeles del catálogo sale cada cota |
| `rodillos_sch40.json` | **el modelo** — se abre en la app de diseño del repo |

## Cómo se usa

```bash
cd cad
npm install                 # three
pip install cadquery trimesh
bash ensambles/rodillos_sch40/regenerar.sh
```

Abrir el modelo en la **app de diseño del repo**:

```
cad/index.html  →  📂 Abrir  →  ensambles/rodillos_sch40/rodillos_sch40.json
```

o el visor de sólo lectura (servir `cad/` por HTTP):

```
cad/ensambles/ver.html?doc=rodillos_sch40/rodillos_sch40.json&view=iso|frente|lado|planta
```

Trabajar un módulo suelto: `node ensambles/rodillos_sch40/_check.mjs plano --v`

## Las cinco decisiones que mandan en este diseño

### 1. Hay que CONTRATALADRAR el tubo. No es opcional.

El cuerpo de prensa de los portarodamientos SKPB48xx es **Ø45** (variante de tubo
de 1.5 mm) o **Ø44** (variante de 2.0 mm). El interior de la cañería SCH 40 es
**Ø40.94 nominal**, y con las tolerancias de laminación de A53
(`OD +0.397/−0.794`, pared `−12.5 %`) queda entre **39.4 y 42.2**. Además es tubo
con costura: tiene cordón interior.

O sea: **ninguna tapa de catálogo entra en la cañería en bruto**, y aunque
entrara, un interior laminado con ±1.4 mm de dispersión y un cordón de soldadura
no es asiento para nada.

> **Solución:** refrentar las dos testas y **contrataladrar Ø44 H8 × 14 de
> profundidad**, Ra ≤ 3.2, eliminando el cordón en esa zona.

Se usa la tapa de la variante **de 2.0 mm de pared** (`SKPB4812-2.0`, Ø44) y no la
de 1.5 (Ø45) precisamente por esto: el Ø44 deja **2.13 mm** de pared en el
contrataladro (**1.73 mm** en el peor caso de tolerancia) contra los 1.63 / 1.23
que dejaría el Ø45. Es 0.5 mm más de pared en la zona más comprometida de la
pieza, y no cuesta nada — es otro artículo del mismo catálogo.

La profundidad son **14** contra los **10** de tapa que entran: la posición axial
la fija la **brida contra la testa del tubo**, no el fondo del contrataladro, así
que esos 4 mm de sobra sólo son margen por si la tapa real resulta más larga que
lo medido.

Esto se hace al torno con luneta (la cañería de 522 no pasa por el husillo) o con
cabezal de mandrinar. Es la operación que más encarece la pieza y es la que hay
que cotizar primero.

### 2. El resorte va con EJE PASANTE, no con muñones

Intentar meter el resorte en la tapa no funciona: para que empuje el eje hacia
AFUERA tendría que apoyarse en una cara del tubo que esté *por fuera* del anillo
del eje, y en la tapa de catálogo sólo hay 4.5 mm de morro. La cuenta no da.

La solución real (patente **US8439573B2**) es otra:

> *"A compression spring is captured on either or both ends of the axle between a
> swage or other stop and the bushing… **The spring urges the axle toward its
> opposite end.** Two such springs in each end of the roller balance one another
> and permit the axle to be retracted momentarily from either end."*

Es decir: **un eje pasante Ø12 × 553** y, dentro del tubo, **un resorte por
extremo**, apoyado en la cara interior del aro interior del rodamiento y contra un
**anillo DIN 471** del eje. Cada resorte empuja el eje **hacia el extremo
contrario**; los dos se equilibran y el eje queda centrado con las dos puntas
afuera. Al empujar una punta hacia adentro se comprime el resorte del otro lado.

Ventajas, y por eso se adoptó:

- la **tapa de catálogo sirve tal cual** (no hay que fabricar una tapa especial),
- el **tubo sigue midiendo 522** y toda la cadena de cotas del Damon se conserva,
- el eje se monta y desmonta desde cualquiera de los dos lados,
- son 2 anillos y 2 resortes, nada más.

Resorte dimensionado: **Ø18 ext. × 1.4 de alambre, 7.5 espiras, L0 = 32**, montado
a 26. Da **9.1 N de precarga** y **32.6 N** a fondo, con **15.5 mm de carrera**
disponible contra los **12.5 mm** que se necesitan (10.5 de saliente + 2 de
margen). La compuerta verifica que el resorte no llegue a bloque antes de eso.

> Nota honesta: **ningún fabricante publica la fuerza del resorte** de sus
> rodillos. Estos 9.1 N son un dimensionamiento nuestro con el criterio "que
> aguante la vibración y se pueda comprimir con el pulgar". Si tienes un rodillo
> comercial a mano, mide el suyo y ajusta `P.resorte`.

### 3. Los ajustes de rodamiento van AL REVÉS de lo habitual

En un rodillo transportador **el eje no gira y el tubo sí**. La carga (el peso del
bulto) apunta siempre hacia abajo:

- respecto del **aro exterior**, que gira, la carga **rota** → **aprieto**;
- respecto del **aro interior**, que está quieto, la carga es **estacionaria** → **holgado**.

NTN, tabla 7.1: *"For bearing rings under rotating loads, a tight fit is
necessary… For bearing rings under static loads, on the other hand, a loose fit is
sufficient."* Y tabla 7.2(1), aro interior estacionario que **debe poder
desplazarse** (nuestro caso: el eje desliza contra el resorte) → **g6**.

| Interfaz | Ajuste | Por qué |
|---|---|---|
| eje Ø12 ↔ aro interior 6201 | **g6** | carga estacionaria + tiene que deslizar |
| aro exterior Ø32 ↔ alojamiento de la tapa | **M7 / N7** | carga rotatoria: aprieto obligatorio |
| tapa Ø44 ↔ contrataladro del tubo | **H8 / u7** | prensado permanente |
| camisa Ø48.5 ↔ cañería Ø48.26 | deslizante + adhesivo | ver §Camisas |

Es un error clásico apretar el eje y dejar suelto el exterior. Aquí es al revés.

### 4. Los canales para correa redonda NO se pueden hacer sobre SCH 40

El catálogo lleva dos canales de fondo **Ø38.5** (centros a 35 y 65 de la cara
exterior de la tapa, perfil de **un solo arco R5** — verificado en píxeles, ver
`ESCALA.md`). Eso exige rebajar

```
(48.26 − 38.5)/2 = 4.88 mm
```

y la pared de la SCH 40 es **3.68 mm**. **El canal es más profundo que la pared:
se atraviesa el tubo.** No es cuestión de herramienta ni de habilidad — es
aritmética. Tampoco sirve conformarlo por rodillos: 3.68 mm de pared no se
deforma así.

La compuerta lo reporta como aviso en cada corrida. Tres salidas, en orden de
preferencia:

1. **No llevar canales** — es lo que hace este modelo. Rodillo por gravedad o
   arrastrado por banda sobre el tubo desnudo.
2. **Collar de canales postizo**: un anillo mecanizado (o impreso) que calza sobre
   la cañería y lleva los dos canales. Como tiene que envolver el tubo, su
   diámetro exterior queda **por encima** de Ø48.26 (≈Ø58–60), así que sobresale
   de la superficie de carga: hay que comprobar que no choque con el larguero.
3. **Cambiar de tubo**: si los canales integrados son un requisito, la cañería no
   sirve y hay que usar tubo mecánico **Ø50 × 1.5–2.0**, que es justo lo que usa
   el catálogo.

### 5. El eje hexagonal: "11 Hex" es 11 mm métrico, y en Chile no hay

Tres cosas que conviene tener claras antes de comprar:

- El **`11 Hex`** del plano Damon es **11 mm entre caras, métrico**. Su propio
  catálogo lo lista bajo *"Hexagonal shaft(mm): S: 11hex"*, e Interroll usa el
  mismo estándar (*"conveyor profiles with 11 mm (+0.3/0.8 mm) hexagonal holes"*).
- **9/16" no es una medida estándar** de rodillo por gravedad. No se encontró
  ninguna fuente que la liste. Las norteamericanas son **7/16" (11.11 mm)** y
  **11/16" (17.46 mm)**. El 7/16" queda a 0.11 mm del 11 mm métrico.
- **No se encontró barra hexagonal de 11 mm en Chile.**

O sea que la intuición de ir a **eje redondo con caras planas fue la correcta**, y
es lo que implementa este diseño. Si de todas formas quisieras hexágono: 11 mm
entre caras mide **12.70 entre vértices**, o sea que sale exactamente de una barra
**SAE 1045 de 1/2"** — que sí se consigue (Küpfer).

## El eje: opción A vs opción B

Las dos que planteaste, resueltas — y con una corrección de material que salió al
cotizar (ver `ABASTECIMIENTO.md` §4):

| | **A — barra Ø12 trefilada** *(elegida)* | **B — barra 1/2" rebajada** |
|---|---|---|
| Material | **SAE 1045 trefilado Ø12 h11, barra de 6 m** | SAE 1045 Ø12.70 (1/2") |
| Mecanizado | 2 caras planas + 2 gargantas + **rectificar 40 mm de cada punta a g6** | **rebajar todo el cuerpo a Ø12** + caras + gargantas |
| Asiento del rodamiento | sólo las puntas | hay que tornear 553 mm de largo |
| Aprovechamiento | **10 ejes por barra de 6 m** | 10 ejes por barra |
| Costo material (80 ejes) | **≈ US$ 95–125** | similar |
| Disponibilidad Chile | Otero (1045 trefilado H11, 6–65 mm), Küpfer, Aceros RAY | Küpfer (SAE 1045 1/2") |

**Recomendación: A, pero con 1045 trefilado — NO con acero plata.**

> ⚠️ **Corrección respecto de la primera versión de este documento.** Antes se
> recomendaba «barra calibrada / acero plata Ø12». Al cotizar apareció que **el
> acero plata se vende en barras de 1 metro** (ISESA, $29.760 CLP), y con un eje
> de 553 mm sale **un eje por barra**: 45 % de desperdicio y **≈ US$ 2 506** en
> material contra los ≈ US$ 110 del trefilado en barra de 6 m. **Casi 20 veces.**
> El acero plata es material de matricería vendido al detalle, no materia prima de
> producción.

El trefilado de catálogo viene **h11** (−0/−0.11 sobre Ø12), demasiado holgado
para que el aro interior no baile. Por eso el eje se compra h11 y se **rectifica a
g6 sólo los 40 mm de cada punta** — el tramo que recorre el aro interior (10 de
ancho del rodamiento + los ~13 de carrera del resorte + margen). Es la misma
sujeción en la que ya se hacen las caras planas y las gargantas: no agrega
operación.

La opción B tiene sentido si vas a hacer el hexágono de 11 mm: ahí la barra de
1/2" es la materia prima correcta y el rebaje deja de ser trabajo extra.

**Caras planas:** dos, entre caras **11 mm**, **12 mm de largo** desde cada punta.
Cubren los 10.5 mm que sobresalen del larguero. Son el seguro antigiro: el eje no
puede girar en la ranura del bastidor. La ranura del larguero debe ser de **11.2
mm** (H13) para que entre sin juego apreciable.

⚠️ Las caras planas terminan a 12 mm de la punta y la garganta del anillo está a
42.5 mm: **no se tocan**, y la compuerta lo verifica. Si alargas las caras, el
anillo se queda sin asiento circular completo.

## Los seguros

| Seguro | Qué asegura | Norma / cota |
|---|---|---|
| **Anillo DIN 471 Ø12** ×2 | asiento del resorte sobre el eje; es lo que impide que el eje se salga | garganta **Ø11.5 × 1.1**, anillo e = 1.0 |
| **Hombro Ø28 de la tapa** | tope axial del aro exterior del rodamiento hacia afuera | integral de la tapa |
| **Prensado Ø44 H8/u7** | la tapa contra el tubo | interferencia; opcional **Loctite 638** |
| **Caras planas 11 e/c** | antigiro del eje en el larguero | ranura del bastidor 11.2 H13 |
| **Adhesivo + 2 prisioneros M5** | las camisas cónicas contra el tubo | ver §Camisas |

Cadena de carga axial: el resorte empuja el eje → el anillo apoya en el aro
interior → bolas → aro exterior → **hombro de la tapa** → tapa → tubo. Todo cierra
contra una cara mecanizada; no hay ningún tornillo trabajando a tracción.

> La tabla DIN 471 usada (garganta Ø11.5, ancho 1.1, espesor 1.0) sale de
> fasteners.eu y es autoconsistente ((12 − 11.5)/2 = 0.25 de profundidad). La
> **letra de tolerancia** de la garganta no quedó confirmada: verifícala contra un
> anillo comprado antes de soltar el plano a taller.

## Secuencia de armado

1. Cortar la cañería a **522 ±0.2**, refrentar a escuadra (0.1).
2. **Contrataladrar Ø44 H8 × 14** en las dos testas; quitar el cordón interior de
   la costura en esa zona; achaflanar 0.5 × 45° la boca.
3. Desengrasar y zincar (o pintar) el tubo.
4. Prensar el **rodamiento 6201-2Z** en cada tapa, **desde el lado interior**,
   hasta el hombro Ø28. (Se hace en el banco: adentro del tubo no hay acceso.)
5. Enfilar en el eje: anillo izq → resorte izq → *(el eje entra por el tubo)* →
   resorte der → anillo der.
6. Prensar la tapa+rodamiento izquierda en el tubo, con el eje ya dentro.
7. Comprimir el resorte derecho, entrar el eje en el rodamiento derecho y prensar
   la segunda tapa. La brida topa contra la testa del tubo — esa es la cota que
   fija los 531 sobre tapas.
8. Comprobar: el rodillo gira libre, el eje se retrae ≥ 12.5 mm por cualquiera de
   los dos lados y vuelve solo.
9. *(Sólo cónico)* deslizar las tres camisas, pegarlas y fijar los prisioneros.

## Rodillo cónico — las camisas

### El cono del catálogo es UN SOLO CONO

La tabla `WT / D1 / D2` del 2.640.SHJ.AFA tiene 18 filas. Calculando
`k = (D2 − D1)/WT` fila por fila sale **0.06289 constante** (σ = 0.00008). No son
18 conos: es **un único cono del que se cortan trozos a distinta distancia del
vértice**. Los dos valores de D1 (52.5 y 55.6) son sólo dos radios de arranque.

Lo confirman tres fuentes independientes:

- Damon publica **`Taper: 3.6°`**;
- Interroll: *"The shaft of the conveyor roller is inclined by **1.8°**"*;
- medición en píxeles sobre el plano: **k = 0.0645** (2.6 % del valor de tabla).

`2·arctan(0.06289/2) = 3.6027°` → semiángulo **1.8014°**. Cuadra.

`gen_rodillos.mjs` reproduce las **18 filas** con error máximo **0.08 mm** y falla
si supera 0.35. Es la compuerta más útil del conjunto: si alguien toca `k`, salta.

### La regla de la curva

El vértice del cono tiene que caer **en el centro de la curva** — sólo así cada
punto del rodillo tiene velocidad proporcional a su radio y el bulto no patina.
Damon lo escribe así:

> *"In theory, the geometric extension line of the tapered roller should join with
> the centre of the radius of the curve frame."* con `R = D/K − c`

Para este rodillo:

```
D1 = 55.6  ·  k = 0.06289  ·  WT = 507
R interior = D1/k − c = 884.1 − c        (c = holgura camisa↔larguero)
R exterior = R interior + 507
D2 = D1 + k·WT = 87.49
```

Con `c ≈ 5` queda **R interior ≈ 880 mm**, que es exactamente uno de los radios
tabulados por Damon (`Curve radius: 830 / 880`). O sea: este rodillo sirve para
una **curva de 880 mm de radio interior**.

> **Si tu curva no es de 880**, cambia `P.camisa.D1`: `D1 = 2·(R + c)·tan(1.8°)`.
> El semiángulo **no** se toca — es lo que hace que las camisas sean compatibles
> con las del catálogo.

### Construcción de las camisas

Tres segmentos de **169 mm**, Ø55.6 → Ø66.23 → Ø76.86 → Ø87.49. Cada uno es una
**cáscara cónica de 4 mm de pared con un cubo en cada testa** (barreno Ø48.5,
10 mm de largo), no un cono macizo: en el extremo mayor la pared maciza llegaría a
**19 mm**, un disparate en peso y en horas de impresión.

- **Material:** el catálogo dice *"tapered sleeve-black, antistatic"* → PA6 negro
  antiestático moldeado. Impreso: **PA6-CF o PA12-CF**.
- **Sujeción:** barreno Ø48.5 deslizante sobre la cañería + **adhesivo anaeróbico
  de retención** (Loctite 638 o equivalente) + **2 prisioneros M5** en la camisa
  mayor, contra dos avellanados de Ø4 hechos en el tubo. Axialmente la pila queda
  **atrapada entre las bridas de las dos tapas**, así que el adhesivo sólo tiene
  que aguantar el par de fricción del bulto, que es pequeño.
- **Impresión:** eje del cono **vertical (a lo largo de Z)**. Ver §Anisotropía.

## Tapa metálica de catálogo vs tapa impresa en nylon con carbono

### La metálica (la que manda el diseño)

**SKPB4812-2.0**: brida F = 48, cuerpo de prensa **D = 44**, alojamiento D2 = 32,
para rodamiento 6201ZZ. Acero al carbono embutido y zincado. Es la variante para
tubo de **2.0 mm de pared**; se elige sobre la de 1.5 (D = 45) porque deja 0.5 mm
más de pared en el contrataladro — ver §1.

**Largo: 14.5 mm, medido, no supuesto.** El catálogo no lo tabula, pero el croquis
**Type 1** de la lámina sí está a escala. Midiéndolo en píxeles con ancla en el
barreno `d = 12.1` (0.063351 mm/px, con la que la brida sale **48.37** contra 48
nominal — 0.8 % de error) el cuerpo de la tapa da **12.42 mm**. Ese croquis está
dibujado para la variante de **6001** (D2 = 28, aro de 8 de ancho), lo que además
se confirma por el saliente del aro interior (Ø17.3 medido contra Ø17.0 de la
ficha del 6001); nuestro **6201 es de 10 de ancho**, así que **12.42 + 2 = 14.5**.

Contraste independiente dentro del mismo catálogo: la serie **SKP** publica
**H = 12** para `SKP5012-1.0`, y la tabla *Pressed Bearing* da **H = 12.0** para
`SK1232A`. Un portarodamiento embutido de este porte mide 12, no 24.

Procedimiento completo en `ESCALA.md`.

⚠️ Sigue conviniendo **medir la tapa comprada** antes de mecanizar la serie: la
medición en píxeles fija el valor con ~1 % de error, no con centésimas. Por eso el
contrataladro se hace de **14** de profundidad para 10 de tapa: la posición axial
la fija la brida contra la testa, y esos 4 mm sobran de margen.

⚠️ La brida es **Ø48** y la cañería es **Ø48.26**: la tapa queda **0.13 mm
rehundida** por lado. Es cosmético y no afecta a nada, pero conviene saberlo.

### La impresa en PA-CF — evaluación

Se puede, con condiciones. Lo que dicen las fichas técnicas reales:

| | PA6-CF (Bambu) | PA-CF (PA6+PA12, Bambu) |
|---|---|---|
| Tracción X-Y / Z | **102 / 48 MPa** | 96 / 50 MPa |
| Módulo flexión X-Y | 5460 MPa | 4420 MPa |
| **Tg** | **68 °C** | **60 °C** |
| HDT 1.8 MPa | 164 °C | 160 °C |
| Absorción de agua | **2.35 %** | 1.70 % |

Y ahora las cuatro cosas que hay que decir:

1. **El HDT no sirve para juzgar un prensado.** 164 °C describe una deflexión de
   corto plazo. Lo que gobierna la fluencia bajo carga sostenida es la **Tg = 68
   °C**, y encima es el valor **en seco**: el PA6 absorbe 2.35 % de agua, y el agua
   plastifica la poliamida y baja la Tg. Un prensado en un galpón húmedo trabaja
   mucho más cerca de la Tg de lo que sugiere el HDT.
2. **Ningún fabricante publica datos de fluencia (creep) de PA6-CF ni PA12-CF.**
   Se buscaron y no existen: ni módulo de fluencia, ni curvas isócronas, ni
   relajación de tensiones. **La pérdida de aprieto del prensado con el tiempo no
   se puede cuantificar con ninguna fuente publicada.** Que nadie te dé un número.
3. **La anisotropía es el riesgo mayor, y se controla con la orientación.** Un
   prensado genera tensión **circunferencial**. Con el eje del barreno **en Z**
   (tapa impresa "de pie"), esa tensión queda en el plano X-Y, donde el material da
   102 MPa. Con el eje horizontal, parte del contorno trabaja **entre capas**, a
   48 MPa — menos de la mitad — y la tapa se abre. **La orientación de impresión es
   un requisito de plano, no una preferencia del laminador.**
4. **No traslades los ajustes M7/N7 al plástico.** Esas clases están calificadas
   por NTN explícitamente *"for cast iron or steel housings"*. El único dato
   publicado para polímero que se encontró es un ensayo revisado por pares (MDPI,
   *Polymers* 2025, doi 10.3390/polym17222971) sobre alojamiento de **PA6 colado y
   mecanizado**, no impreso: recomienda **IT8** y **0.5 mm de interferencia sobre
   Ø110**, es decir **≈0.45 % del barreno**. Extrapolado a Ø32 daría ≈0.14 mm —
   pero es una extrapolación, no un dato.

**Veredicto:** la tapa impresa es **viable como repuesto de servicio o para
prototipo**, no como pieza de serie, y **sólo con estos cambios**:

- barreno del rodamiento **Ø32 IT8** con **0.10–0.15 mm** de interferencia (no M7/N7);
- **no confiar el retén axial a la fricción**: agregar un **anillo DIN 472 Ø32**
  en el alojamiento, en garganta Ø33.7 × 1.3 (el hombro Ø28 sigue haciendo de tope
  del otro lado). Con eso, aunque el prensado se relaje por fluencia, el rodamiento
  no se mueve;
- pared mínima **3 mm** en el cuerpo de prensa y **4 mm** alrededor del alojamiento;
- **≥ 6 perímetros** y 100 % de relleno en la zona del barreno;
- **eje del barreno en Z**;
- secar el filamento antes de imprimir y **recocer 80 °C / 12 h** (es la condición
  en la que están medidos los datos de la ficha);
- revisar el apriete a las 200 h de servicio la primera vez.

Si el rodillo va a la intemperie o cerca de un horno, **usa la metálica**.

## Peso — el costo real de usar cañería

| Pieza | Volumen | Material | Masa |
|---|---|---|---|
| Tubo SCH 40 Ø48.26×3.68 × 522 | 261.2 cm³ | acero | **2 050 g** |
| Eje pasante Ø12 × 553 | 62.3 cm³ | acero | 489 g |
| Tapas ×2 | 8.5 cm³ c/u | acero | 134 g |
| Rodamientos 6201-2Z ×2 | — | — | 78 g |
| Resortes ×2 + anillos ×2 | — | — | 32 g |
| **Rodillo PLANO** | | | **≈ 2.78 kg** |
| Camisas ×3 | 512.5 cm³ | PA6-CF (1.09) | 559 g |
| **Rodillo CÓNICO** | | | **≈ 3.34 kg** |

Para comparar: el tubo Ø50×1.5 del catálogo original pesa **937 g** contra los
**2 050 g** de la cañería. **El tubo pesa 2.2× más.**

Estructuralmente sobra —la flecha bajo 500 N es de **0.056 mm** y el rodamiento
tiene `s₀ = 12.4` y `L10h ≈ 2×10⁶ h`— pero en un transportador por gravedad el
peso **sí** importa: más inercia por rodillo significa más pendiente para arrancar
y más golpe al frenar. Si el transportador es por gravedad y los bultos son
livianos, vale la pena preguntar el precio del tubo mecánico Ø50×2 antes de
casarse con la cañería.

## Reglas que verifica la compuerta

`gen_rodillos.mjs` **no escribe el modelo** si algo de esto falla:

1. envolvente idéntico al catálogo (532 / 531 / 553 / 522);
2. el contrataladro supera el ID de la cañería **en el peor caso de tolerancia** y
   deja ≥ 1.2 mm de pared (≥ 0.9 en el peor caso); hoy quedan 2.13 / 1.73;
3. el alojamiento del rodamiento cabe en el cuerpo de prensa y el hombro lo retiene;
4. el resorte da la carrera necesaria sin llegar a bloque, queda precargado, pasa
   por el eje y entra en el faldón;
5. las caras planas no invaden la garganta del anillo;
6. el eje pasante cubre las dos gargantas;
7. **el cono reproduce las 18 filas de la tabla del catálogo** (error ≤ 0.35 mm) y
   el semiángulo es 1.8°;
8. las camisas tienen ≥ 3 mm de pared en la testa menor y deslizan sobre el tubo;
9. el rodamiento cumple `s₀ ≥ 2` y `L10h ≥ 20 000 h` con la carga supuesta.

Además, fuera de la compuerta:

- **interferencias exactas B-rep**: `0 sobre 59 pares` con tolerancia 0.05 cm³;
- **STEP vs malla**: desviación máxima **0.29 %** sobre 23 piezas;
- **malla de todas las piezas**: 23/23 con volumen positivo.

## Lo que NO está verificado

Honestidad sobre los huecos, para que nadie los descubra en el taller:

| Dato | Estado |
|---|---|
| Largo de la tapa de catálogo (14.5) | **medido en píxeles** sobre el croquis Type 1 (~1 % de error) y contrastado con los H = 12 de la serie SKP. No está tabulado: medir la pieza comprada para cerrar centésimas. El contrataladro lleva 4 mm de margen justamente por esto. |
| **Fuerza del resorte** | dimensionada por nosotros; ningún fabricante la publica. |
| Letra de tolerancia de la garganta DIN 471 | ambigua en la fuente; verificar con un anillo. |
| `C` del 6001-2Z (si cambias de rodamiento) | fuentes en conflicto (4.42 vs 5.4 kN). El **6201-2Z** usado aquí sí está confirmado: C = 7.28 kN, C0 = 3.1 kN (ficha SKF). |
| Fluencia del PA-CF | **no existe dato publicado**. Ver §Tapa impresa. |
| Barra Ø12 en Chile | resuelto: **1045 trefilado h11 en barra de 6 m** y rectificar 40 mm por punta a g6. El acero plata (barras de 1 m) costaba 20× — ver ABASTECIMIENTO.md §4. Falta el precio del trefilado. |
| Hipótesis de carga (500 N, 0.5 m/s) | **supuesta**. Confírmala y vuelve a correr la compuerta. |

## Procedencia

- **Catálogo del usuario** (`doc`): planos Damon 2.240.SHC.AFA y 2.640.SHJ.AFA
  rev A 17/3/16 y catálogo de portarodamientos. Cadena de cotas, canales, tabla
  del cono, serie SKPB.
- **Medición en píxeles** (`measured-2D`): escala 0.104712 mm/px verificada con dos
  anclas ortogonales; cadena 553/531/522 confirmada; perfil del canal = arco único
  R5; D1 y `k` del cono confirmados. Detalle en `ESCALA.md`.
- **Web** (`web`): ASTM A53 / ASME B36.10M, ficha SKF 6201-2Z, NTN tablas 7.1/7.2,
  DIN 471/472, US8439573B2, catálogos Damon e Interroll, fichas PA6-CF/PA-CF,
  MDPI *Polymers* 2025. Con URL, fecha y cita en
  `projects/RC-SCH40-48/input/web_facts.json`.
- **Usuario** (`user`): cañería SCH 40 1-1/2", eje redondo Ø12 con caras planas,
  tapa metálica de catálogo, camisas plásticas, evaluar tapa impresa en PA-CF.

Los planos del fabricante se usan como referencia dimensional y de nomenclatura.
No se redistribuyen: la geometría de este directorio es propia y paramétrica.
