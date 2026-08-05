# Diseño industrial — módulo transportador omnidireccional 3×3 (banco EXPERIMENTAL)

Objeto: 9 celdas hexagonales, 27 ruedas omni Ø48, 713.8 × 588.8 mm, bultos de cartón
de hasta 3 kg, traslación en cualquier dirección y giro. **No es un producto: es un
banco de laboratorio que se va a enseñar, desarmar, reconfigurar y depurar.** Todo lo
que sigue está escrito con esa prioridad y no con otra.

## 0. Base de partida y procedencia de las cotas

Las cotas se clasifican igual que en el resto del repositorio:

| Marca | Significado |
|---|---|
| `calc` | **calculada** a partir de `params.mjs` / `celda.mjs`. No es opinión: sale del modelo. |
| `dis` | **decisión de diseño de este documento**. Capa `user`. Justificada, no verificada. |
| `pat` | leída de las figuras de la patente DE 10 2012 014 181 A1 en `ref/patente_p11…p20.png`. |

Lo que doy por **fijo** (mecanismo ya resuelto y verificado con B-rep):

| Cota | Valor | Marca |
|---|---|---|
| Hexágono entre caras / lado | 203.95 / 117.75 mm | `calc` |
| Radio de rueda R | 76.0 mm, ejes radiales, motor hacia el centro | `calc` |
| Módulo 3×3 (envolvente) | **713.8 × 588.8 mm** | `calc` |
| Asomo de rueda sobre el deck | 5.0 mm | `calc` |
| Ranura de rueda en el deck | 30.5 × 45.0 mm | `calc` |
| Punto más bajo del mecanismo | Z = **−84** (fondo de la campana del motor) | `calc` |
| Tren radial por unidad | rodamiento · rueda · rodamiento · acople · motor · encoder | `calc` |

Lo que **propongo cambiar** está en §9. Los tres cambios grandes son: deck de una sola
pieza, cartucho de accionamiento y bolas locas de apoyo.

---

## 1. Concepto

**El objeto tiene que comunicar una sola idea: la superficie es una retícula de
actuadores idénticos, y todo lo demás es servicio de esa retícula.**

Quien mire el banco tiene que poder decir, sin que nadie se lo explique: *son 27
ruedas iguales, cada una con su motor igual, mandadas por 9 controladores iguales*. Si
al mirarlo se ve un amasijo de cables y soportes distintos, el banco ha fracasado como
objeto docente aunque funcione perfectamente.

**El principio que ordena la forma es una sola trama: el hexágono de 203.95 mm entre
caras.** De ella salen —y solo de ella— las posiciones de las ruedas, los apoyos
pasivos, los grabados del deck, los canales de cable, las columnas del bastidor y los
paneles del faldón. Ningún elemento se coloca por composición. Si algo no cae sobre la
trama o sobre su perpendicular, es que está mal resuelto, no que sea "libre".

Tres reglas duras que se aplican a todo el documento:

1. **Arriba, un solo plano limpio.** Nada sobresale del plano de transporte. Lo único
   que lo cruza son las ruedas, las bolas y cabezas avellanadas enrasadas (±0.1 mm).
   Ningún escalón mayor de 0.5 mm, ningún canto vivo, ninguna cabeza de tornillo.
2. **Abajo, una sola pieza repetida 27 veces.** Todo el mantenimiento consiste en
   sacar y poner esa pieza. Si para arreglar algo hay que desmontar otra cosa, está
   mal resuelto.
3. **En medio, nada.** El volumen bajo cada cartucho, hasta 20 mm por debajo del punto
   más bajo del mecanismo, es **volumen de extracción**: no pasa por él ningún cable,
   ninguna electrónica ni ninguna viga. Es una zona prohibida dibujada en el CAD y
   verificada con B-rep, no una buena intención (§4.6).

---

## 2. Arquitectura de capas

Z = 0 en el plano de transporte, positivo hacia arriba (convenio del repositorio).

| Cota Z | Plano | Qué vive ahí | Marca |
|---|---|---|---|
| **0** | **plano de transporte** | coronas de las 27 ruedas | `calc` |
| −0.8 | corona de las bolas locas | apoyo de rescate, regulable ±0.5 | `dis` |
| −5 | cara superior del deck | grabado láser, avellanados enrasados | `calc` |
| **−8** | **cara inferior del deck** (con deck de 3 mm) | **datum estructural: todo cuelga de aquí** | `dis` |
| −14 | tope del cuerpo del motor TT | | `calc` |
| −24 | eje de las 27 ruedas | | `calc` |
| −37 | pie de los bloques porta-rodamiento | | `calc` |
| −43…−57 | PCB del sensor de encoder | | `calc` |
| −48 | fondo de las ruedas | | `calc` |
| −51 | fin de la reductora | | `calc` |
| **−84** | **fondo de la campana del motor** | punto más bajo del mecanismo | `calc` |
| **−104** | **plano de descenso libre** | 20 mm bajo el mecanismo: es lo que baja el cartucho antes de salir de lado | `dis` |
| **−110** | **suelo de la bahía de celda** | ala inferior de la viga perimetral y techo de los travesaños | `dis` |
| −110…−155 | cinturón eléctrico perimetral | troncal 12 V, bus, maestro, panel frontal | `dis` |
| −155 | base del bastidor / zócalo | | `dis` |
| −175 | suelo | 4 pies regulables M8 ±10 | `dis` |

Cuatro capas, y cada una tiene una razón concreta para existir con ese espesor:

**A · Superficie de transporte (0 … −8).** 8 mm de canto total. Es la única capa que
toca el bulto y la única que no se puede tocar durante el servicio. Deck de aluminio
5754-H22 de **3 mm**, no acrílico de 5: el acrílico fisura alrededor de las tuercas
remachables, fluye bajo carga puntual y se raya en una semana de demostraciones. El
aluminio además cierra el circuito de tierra funcional que drena la estática del
cartón. Cambiar `placaEsp` de 5 a 3 sube `zPlaca` de −10 a −8 y reduce 2 mm la altura
de los 54 bloques porta-rodamiento y de los 27 soportes de motor: es un cambio de
`params.mjs`, no un rediseño.

**B · Bahía de celda (−8 … −110).** 102 mm libres, de los cuales el mecanismo consume 76
(hasta −84). **Los 20 mm que sobran no son holgura: son el recorrido de descenso del
cartucho.** El cartucho tiene que bajar lo suficiente para que la rueda salga de su
ranura (asoma 5, más holgura) antes de poder salir de lado; con 20 mm va sobrado y aún
quedan 6 mm hasta el ala del bastidor. Si esta capa se dimensiona "con lo que quede", el
§4 deja de ser cierto: es el error más fácil de cometer en todo el módulo.

La bahía contiene **solo dos familias de objetos**: los 27 cartuchos de accionamiento y
los 9 nodos de celda. Nada más. Ni canaletas cruzando, ni travesaños, ni fuente.

**C · Cinturón eléctrico (−110 … −155).** 45 mm de altura, **solo en el perímetro**, sobre
la cara interior del faldón. Nunca una bandeja continua: una bandeja continua bajo las
celdas convertiría el cambio de un motor en un desmontaje. Aquí viven la troncal de
12 V, el bus, el maestro y el panel frontal de mando. Se ve desde fuera a través del
faldón transparente, que es exactamente lo que se quiere enseñar.

**D · Estructura (−8 … −175).** **Viga perimetral rectangular** de chapa plegada 2 mm,
sección C de 40 × 102, contorno exterior **720 × 595**, ala superior a −8 (asiento del deck)
y ala inferior a −110. El rectángulo **no intenta seguir el contorno dentado del teselado**:
lo enmarca, y en los dientes su ala superior queda a la vista, que es justamente donde
se atornillan la orla y las rampas (§3.4). Formalmente eso vale la pena decirlo: **el
rectángulo es el bastidor y el teselado hexagonal flota dentro de él**, separado por una
junta de sombra de 3 mm.

**Dos travesaños del mismo perfil a Z = −110…−140**, en las líneas y = 176.6 e y = 353.2
del módulo. Van **por debajo del plano de descenso libre**, así que no estorban a ningún
cartucho aunque pasen por debajo de ellos: es la única forma de tener travesaños rectos
de lado a lado en una planta donde 27 piezas tienen que poder bajar. Un travesaño a
media altura de la bahía sí chocaría — la comprobación es directa: la huella de
extracción de un cartucho a 210° se extiende 45.3 mm en Y a cada lado (`calc`), o sea que
cualquier viga transversal por encima de −104 muerde alguna.

El deck se apoya además en **4 columnas Ø25 × 102** que suben de los travesaños a la cara
inferior del deck, en las coordenadas de módulo **(203.9, 176.6) · (407.9, 176.6) ·
(305.9, 353.2) · (509.9, 353.2)** (`calc`): son los **4 vértices vacíos totalmente interiores**
de la trama, el único sitio del interior libre de −8 a −110. Con eso ningún vano del deck
pasa de ~235 mm. Flecha estimada bajo 3 kg puntuales < 0.3 mm (`dis`, **sin verificar**:
hay que calcularla).

Nota que importa: **en los otros 4 vértices interiores —los de triplete de ruedas— no se
puede poner columna**, porque el PCB del sensor de encoder llega a R = 109.75 y solo deja
8 mm hasta el vértice (`calc`). Es otra factura que paga la posición del encoder (§9 #8).

Masa estimada del conjunto: deck 3.4 kg + 27 cartuchos ≈ 6.8 kg + bastidor ≈ 4 kg +
faldón ≈ 2 kg + eléctrica ≈ 1.5 kg → **≈ 18 kg** (`dis`, estimación). Es una carga de dos
personas: lleva dos asas plegadas de 120 × 30 en las caras cortas.

---

## 3. Superficie de transporte

### 3.1 El problema que nadie ha mirado todavía: no hay apoyo

Con las 27 ruedas y nada más, **el mayor círculo de la superficie que no toca ningún
apoyo tiene 103.4 mm de radio, o sea Ø207 mm** (`calc`). Está en los "vértices vacíos" de
la trama: los vértices del hexágono en las direcciones 30°/150°/270°, hacia los que no
apunta ninguna rueda, y que son vértices vacíos también para las tres celdas que los
comparten. En el centro de cada celda hay otro hueco de Ø152.

Consecuencia medida sobre el modelo, con la caja entera apoyada sobre el deck y en su
**peor** posición (`calc`):

| Lado de la caja | Apoyos garantizados hoy | Con las 24 bolas de más abajo |
|---|---|---|
| 100 mm | **0** | 0 |
| 120 mm | **0** | 1 |
| 150 mm | **0** | 1 |
| 180 mm | 2 | **3** |
| 200 mm | 2 | **3** |
| 250 mm | **3** | 5 |
| 300 mm | 4 | 7 |

Es decir: **hoy una caja de hasta 150 mm puede colocarse sobre el deck sin tocar
ninguna rueda.** Se hunde los 5 mm de asomo, se posa sobre el aluminio y se queda
quieta. Y **hasta los 250 mm no hay tres apoyos garantizados**, que es lo mínimo para que
la caja no cabecee. El banco, tal como está, solo mueve cajas grandes, y esa limitación
no está escrita en ningún sitio.

La patente lo resuelve con apoyos pasivos: en la Figura 1 y la Figura 6 (`ref/patente_p11.png`,
`ref/patente_p19.png`) el elemento **26** son bolas locas repartidas por la placa entre las
ruedas. No es decoración: es la condición para que la celda funcione con bultos
pequeños.

**Propuesta: 24 bolas locas** (`dis`)

| Dónde | Cantidad | Por qué |
|---|---|---|
| Vértice vacío de la trama (dirección 30°/150°/270°, R = 117.75) | 15 (compartidas entre 3 celdas) | tapan el hueco mayor y **dibujan la trama** sobre el deck |
| Centro de cada celda (R = 0) | 9 | tapan el hueco de Ø152 del centro |

Resultado calculado: **el mayor hueco sin apoyo baja de Ø207 a Ø119**, y **el bulto mínimo
con tres apoyos garantizados baja de 250 a 180 mm** (tabla de arriba). Si se quieren 27
bolas más (a R = 76 en las direcciones vacantes) el hueco baja a Ø105, pero es dinero y
taladros por una mejora pequeña: **empezar por 24**.

Cotas y montaje de la bola (`dis`):

- Unidad de bola **Ø12.7 de perfil bajo, cuerpo Ø19 × 14, brida inferior con 2 taladros**.
  El límite de Ø22 para el cuerpo **no es arbitrario**: en el centro de la celda las tres
  campanas de motor empiezan a R = 12 (`calc`), así que un portabolas de Ø25 choca.
- Taladro en el deck **Ø14 H12**. El anillo libre queda en 0.65 mm: no atrapa cartón.
- **Portabolas impreso en PETG**, atornillado a la cara inferior con 2 × M3 avellanados
  DIN 7991 desde arriba (cabeza Ø6, avellanado de 1.5 en chapa de 3, enrasado ±0.1).
- **Corona de la bola a Z = −0.8**, regulable ±0.5 con la rosca del cuerpo y bloqueada
  con contratuerca. La bola **no** va a Z = 0: si fuese al mismo nivel que las ruedas se
  llevaría parte de la carga normal y le quitaría tracción a las ruedas, que solo dan
  0.98 N cada una. La bola es **apoyo de rescate**, no apoyo primario: solo entra en
  contacto cuando el bulto se hunde.
- Límite que hay que declarar en la ficha del banco: **bulto mínimo 180 × 180 mm** con
  las 24 bolas puestas; **250 × 250 mm** sin ellas.

### 3.2 La ranura de rueda es una trampa abierta

La ranura es un rectángulo de 30.5 × 45.0 mm, pero **la rueda solo ocupa 29.3 mm de esos
45 a la altura de la cara superior del deck** (semicuerda de la Ø48 a 5 mm de la
corona = 14.66). Es decir: **en cada extremo de cada ranura hay un agujero abierto de
7.8 × 30.5 mm y más de 5 mm de profundidad, que da directamente al mecanismo.** Son 54
agujeros en la superficie de transporte. Ahí entran esquinas de cartón, solapas,
etiquetas, tornillos caídos y yemas de dedo: 7.8 mm supera los 4 mm por debajo de los
cuales una ranura no admite la yema (criterio de aberturas de ISO 13857).

**Propuesta: collarín de ranura impreso** (`dis`), una pieza por rueda, 27 unidades:

- PETG (o TPU 95A si se quiere que sea además tope blando), **labio de 1.0 mm** que apoya
  sobre la cara superior del deck dentro de un rebaje láser de 1.0 × 32 × 47.
- Se clipa en la ranura desde arriba con **4 pestañas de 0.6 mm de interferencia**. Sin
  tornillos: tiene que poder quitarse con la uña para ver la rueda en una demostración.
- Su abertura interior sigue la silueta de la rueda con **holgura uniforme de 2.0 mm**:
  óvalo de 33.3 × 28.5 en el labio.
- En los dos extremos, una **rampa interior a 25°** que baja del labio hasta 2 mm de la
  envolvente de la rueda. Eso convierte el agujero pasante en un bolsillo cerrado.
- Baja el hueco máximo de 7.8 a 2.0 mm: por debajo del límite de dedo, y el cartón ya no
  encuentra borde donde clavarse.

### 3.3 Fijaciones: la superficie no es un panel de servicio

Hoy `placa_hexagonal.dxf` lleva **24 taladros pasantes Ø3.4 por celda** (12 de unión entre
celdas + 12 de los bloques porta-rodamiento) y los tornillos entran **desde arriba**: son
**216 cabezas de M3 sobre el plano por el que pasa el cartón**. Con cabeza cilíndrica son
2 mm de resalte, 216 veces.

Y falta contar seis: `piezas.mjs` taladra además `M3 placa (±)` para el ala de cada
soporte de motor (2 por unidad, 6 por celda), y esos **no están en el DXF**. El total real
es de **30 taladros por placa, 270 en el módulo**. Es un error de coherencia entre
`planos_celda.mjs` y `piezas.mjs` que hay que corregir en cualquier caso.

Regla: **ningún elemento sobresale del plano de transporte.** De ahí salen dos
consecuencias que hay que aplicar sin excepción:

- Todo tornillo que cruce el deck es **avellanado DIN 7991 enrasado** (M3 cabeza Ø6 o M4
  cabeza Ø8), y el avellanado va en el DXF, no en el taller.
- Todo lo demás se atornilla **desde abajo**, contra **tuercas remachables ciegas M4** puestas
  en el deck (cuerpo Ø6, para chapa 2.5–3.5, brida reducida). Son ciegas justamente
  para que arriba no aparezca un agujero: 54 unidades, una pareja por cartucho.

### 3.4 Bordes: por dónde entra y sale el bulto

El contorno del módulo **no es un rectángulo**: es el borde de un teselado hexagonal
escalonado. Medido sobre el modelo (`calc`):

- En los **lados largos** (713.8 mm) el borde es un diente de sierra de **±58.9 mm** de
  amplitud y 203.95 de paso (los vértices inferiores de los hexágonos).
- En los **lados cortos** (588.8 mm) el escalón es de **102.0 mm**, porque la fila central
  está desplazada media celda.

**Primera decisión: entrada y salida por los lados largos.** Por los cortos habría que
rellenar 102 mm de superficie muerta sin ruedas, donde el bulto perdería tracción a
media transferencia. Se declara en el rotulado del deck.

**Orla perimetral** (`dis`) — chapa de aluminio 2 mm, cortada al diente de sierra real,
4 tramos + 4 esquinas, atornillada al canto del deck desde abajo con M4 cada 100 mm:

- Ancho 30 mm en horizontal. **Cara superior a Z = −1.0**, es decir 1 mm por debajo del
  plano de transporte: un bulto que sale baja 1 mm, uno que entra sube 1 mm. Con cartón
  rígido de 3 kg eso no engancha, y es preferible a dejarlo enrasado, donde cualquier
  tolerancia lo pondría por encima.
- Canto exterior con **plegado a 30° de 8 mm** que baja hasta Z = −8 y **radio interior
  r = 2**. Ningún canto de chapa cortada queda expuesto.
- Cierra además la rendija entre el canto del deck y el faldón.

**Rampas de transferencia** (`dis`) — 2 unidades, desmontables, solo en los lados largos:

- Chapa 2 mm plegada en forma de **peine** que engrana con el diente de sierra del
  contorno y lleva la superficie hasta una **línea recta**, 130 mm de profundidad.
- Cara superior a Z = −1.0, subiendo a Z = 0 en el borde exterior.
- **8 bolas locas Ø12.7 a paso de 70 mm en el borde exterior**, corona a Z = 0: son las que
  sostienen el bulto justo cuando está a medio entrar y solo lo tocan una o dos ruedas.
- Sujeción con **4 tornillos moleteados M5** sin herramienta. Se quitan para enseñar el
  módulo con su contorno hexagonal honesto, se ponen para conectarlo a algo.

### 3.5 Unión entre celdas

En el módulo hay **16 aristas compartidas, 1.88 m de junta** (`calc`) si el deck se hace en
9 placas. Cada junta es un tope entre dos cantos de corte láser: gap variable de 0.2 a
1 mm y, sobre todo, **un escalón de coplanaridad** que depende de 9 placas, 12 pletinas de
unión y 216 tornillos. Un escalón de 0.5 mm a 0.5 m/s es un enganche.

Y hay algo peor, geométrico: **de las 15 bolas de vértice vacío, 8 caen sobre juntas** — 4
en puntos donde concurren **tres** placas y 4 sobre juntas entre **dos** (`calc`). Ahí no se
puede hacer un taladro Ø14: media bola quedaría en cada placa.

**Propuesta: deck de una sola pieza** (`dis`), 713.8 × 588.8 en aluminio 3 mm, con las 27
ranuras, los 24 taladros de bola, las 54 tuercas remachables y los 54 taladros de
espiga cortados en una sola operación. Razones, por orden de peso:

1. **Alineación angular.** Lo que decide si el bulto va recto o cangrejea es la
   orientación relativa de las 27 ruedas. En una pieza es tolerancia de láser (±0.1 mm
   sobre 700 → ±0.3° `dis`). En 9 placas es una cadena de 12 juntas atornilladas: fácilmente
   ±1.5 mm y más de 1°.
2. Desaparecen 1.88 m de junta y el escalón de coplanaridad.
3. Se pueden poner las bolas de vértice vacío.
4. Sale más barato: 1 corte contra 9 hexágonos + 12 pletinas + 108 tornillos.

**Lo que se pierde** —y hay que decirlo— es la modularidad "una celda = una placa". Mi
argumento es que en este banco la reconfiguración real no es re-teselar hexágonos: es
cambiar cartuchos, control y ley de mando. Esa modularidad se conserva íntegra. Y la
identidad hexagonal se conserva **gráficamente**, grabada en el deck (§6), que para
enseñar funciona igual de bien.

Si el usuario quiere conservar las 9 placas, entonces son obligatorios: **chaflán de
0.5 × 45° en el canto superior de cada placa** (la junta se lee como una V de 1 mm en vez
de dos cantos vivos), **pletina de unión de 25 × 2 mm bajo cada junta con 2 M3
avellanados por lado**, y un asiento de bastidor rectificado a ±0.15 mm en todo el
perímetro de cada hexágono.

---

## 4. Acceso y mantenimiento

**Este es el punto que decide si el banco sirve. Lo juzgo con dureza, empezando por lo
que hay.**

### 4.1 Veredicto sobre el diseño actual: no tiene concepto de servicio

Secuencia real para cambiar un motor quemado de la celda 5 (la central), leída del
modelo, no supuesta:

| Paso | Qué hay que hacer | Problema |
|---|---|---|
| 1 | Soltar 2 × M3 del ala del soporte de motor | **Las cabezas están en el plano de transporte.** Para cambiar un motor hay que meter el destornillador por la superficie por la que pasa el cartón. |
| 2 | Soltar 2 × M3 del soporte a la reductora y **retirar el soporte** | El alma del soporte ocupa el radio 7.25…11.25, o sea justo el camino por el que hay que sacar el motor: no es opcional, va primero. |
| 3 | Tirar del motor **8.0 mm** hacia el centro para desenfilar el doble D del acople | 8.0 mm es exactamente `acopleLargo − acopleEncaje − 1` (`calc`). El motor entra en el racimo de los otros dos: la holgura entre reductoras baja de 10.5 a **5.1 mm** y entre campanas de 18.0 a **11.4 mm** (`calc`). Cabe, pero es maniobra a ciegas entre tres motores. |
| 4 | Sacar el motor por abajo | Funciona **por casualidad**: hoy no hay nada definido debajo. En cuanto se ponga una bandeja de electrónica, deja de funcionar. |
| 5 | Volver a montar | Enfilar un doble D de 5.5 en un alojamiento impreso de 8 mm de fondo, a ciegas, a 300 mm del borde del módulo. |

Cuatro tornillos, sobre el papel. En la práctica: dos de ellos por la cara buena, una
pieza intermedia que hay que desmontar antes, 5 mm de holgura para maniobrar a ciegas y
una probabilidad alta de partir el acople impreso al reenfilar. En la celda central, con
el módulo sobre la mesa, es un trabajo de 20 minutos con linterna. **Multiplicado por 27
unidades y por un banco que se va a depurar constantemente, es inaceptable.**

Y hay una consecuencia peor que el tiempo: cada intervención toca la fijación que
posiciona la rueda respecto al deck, así que **cada cambio de motor desalinea la celda**.
En un transportador omnidireccional eso se paga en trayectorias.

### 4.2 La solución está en la patente que ya estamos replicando

Figuras 5a–5d y 6 (`ref/patente_p15.png` … `ref/patente_p19.png`): el elemento **32** es un
estribo de chapa plegada en U que sostiene **la rueda y el motor juntos**, y se cuelga de
la cara inferior de la placa por dos pestañas (**34**) con dos taladros (**36**) contra unos
soportes (**28**) de la placa. La unidad motriz completa es un **cartucho enchufable**. Eso
es lo que hay que copiar, y no se está copiando.

### 4.3 Cartucho de accionamiento CA-01 (`dis`)

Una pieza de chapa de aluminio 5052-H32 de **2 mm**, plegada en U (radio de plegado = 2,
por convenio del repositorio), que sustituye la función de "atornillar cada cosa al
deck":

| Elemento | Cota | Nota |
|---|---|---|
| Luz interior entre brazos | **47.5 mm** | es exactamente `tBloqueM1 − tBloqueL0` (`calc`): el cartucho abraza el tren completo |
| Ancho exterior | 51.5 mm | |
| Altura de brazos | 50 mm | de la cara inferior del deck (−8) a −58, por debajo del fondo de rueda (−48) y del PCB del sensor (−57) |
| Pestañas superiores | 2, de 20 × 25, plegadas a 90° | apoyan contra la cara inferior del deck |
| Fijación | **2 × M4×10 hexágono interior, desde abajo**, contra tuercas remachables ciegas del deck | |
| Posicionado | **2 espigas Ø4 h7 × 3.0 remachadas en las pestañas**, entrando en Ø4 H8 del deck | la espiga acaba **enrasada**, no sobresale |
| Cuelgan del cartucho | los 2 bloques porta-rodamiento (2 × M3 c/u, desde fuera), el soporte de motor, el sensor de encoder y el portaconector | |

Lo que hacen las dos espigas es lo importante: **la orientación de la rueda deja de
depender del montaje y pasa a depender del corte láser del deck**. Los tornillos solo
aprietan. Se puede desmontar y montar 50 veces sin perder alineación, que es
literalmente lo que va a pasar en este banco.

### 4.4 Procedimiento de servicio y cuenta de tornillos

**Cambiar un motor quemado, módulo montado:**

| Paso | Acción | Herramienta | Tiempo |
|---|---|---|---|
| 1 | Bascular el módulo 90° sobre sus muñones y pasar el pasador de tope | ninguna | 15 s |
| 2 | Desenchufar **1 conector** de 6 vías del cartucho | ninguna | 5 s |
| 3 | Aflojar **2 tornillos M4** | Allen 3 | 30 s |
| 4 | Sacar el cartucho completo | ninguna | 10 s |
| 5 | En la mesa: **2 tornillos M3** y el motor sale del acople con 60 mm libres alrededor | Allen 2.5 | 60 s |
| 6 | Montar el motor nuevo, recolocar el cartucho sobre sus espigas, apretar 2 M4, enchufar | | 90 s |

**2 tornillos y 1 conector para sacar el cartucho. 4 tornillos y 1 conector para
cambiar el motor. Ninguno de ellos está en el plano de transporte. Cero alineación que
recuperar.** Menos de 4 minutos, en la celda central igual que en una de esquina.

Balance de pernería del módulo entero:

| | Actual | Propuesto |
|---|---|---|
| Tornillos para separar todo el mecanismo del deck | 162 × M3 (4 bloques + 2 soporte por unidad) | **54 × M4** |
| Tornillos que cruzan el plano de transporte | 270 (162 de mecanismo + 108 de unión entre placas) | **48**, todos avellanados **enrasados**, y ninguno de mecanismo (solo los portabolas) |
| Cabezas que sobresalen del plano de transporte | 270 | **0** |
| Deck fuera del bastidor | no definido | 12 × M5 |
| Abrir el faldón | no definido | 0 (16 tornillos moleteados) |

### 4.5 El módulo bascula

Detalle barato y decisivo (`dis`): **dos muñones Ø10 en las caras cortas del bastidor**, en
el eje del canto trasero a Z = −140, y **un pasador Ø8 de tope a 95°**. El módulo se
vuelca sobre su canto y se queda de pie. Toda la cara inferior queda vertical y a la
altura del pecho, y cualquiera de los 27 cartuchos queda al alcance de la mano sin
tumbarse en el suelo ni levantar 18 kg. Cuesta 2 casquillos, 2 ejes y un pasador.

Además es el mejor momento de la demostración: se enseña la superficie, se vuelca el
banco y se enseña el mecanismo, sin desmontar nada.

### 4.6 Regla que hay que respetar para que todo esto sea verdad

**Volumen de extracción** (`dis`), en dos partes y las dos hay que dibujarlas en el CAD
como sólidos de referencia:

1. **Descenso**: un prisma de **60 (radial) × 70 (tangencial) mm en planta** bajo cada
   cartucho, orientado con la unidad, **desde Z = −8 hasta Z = −104**. Es lo que hace
   falta para que la rueda salga de su ranura. En Y ese prisma se extiende 45.3 mm a
   cada lado para una unidad a 210° (`calc`): esa cifra es la que descarta cualquier
   travesaño por encima de −104.
2. **Salida**: cada prisma tiene que tener, **a menos de 60 mm en planta, suelo de bahía
   abierto** —ni travesaño, ni cinturón eléctrico, ni pata—, por donde el cartucho sale
   una vez descendido y basculado. Con los travesaños reducidos a dos bandas de 40 mm
   en y = 176.6 y y = 353.2, se cumple en las 27 posiciones (`calc`).

Con el módulo volcado sobre sus muñones (§4.5) el "descenso" es un movimiento
horizontal hacia el operario y la gravedad deja de estorbar: es la posición normal de
servicio.

Prohibido en ambos volúmenes: cables, electrónica, travesaños y patas. Entran en la
verificación de interferencias B-rep igual que las piezas. Sin esa regla, el §4.4 es una
promesa; con ella, es una comprobación automática que falla sola si alguien mete un
cable donde no debe.

---

## 5. Gestión del cableado

Punto de partida: **27 motores × 2 hilos + 27 sensores × 3 hilos = 135 conductores** en el
mecanismo, más la alimentación. Si esos 135 hilos llegan hasta la electrónica, el banco
se convierte en un nido y el §4 deja de ser cierto.

**La idea de fondo es que el número de hilos colapse en el primer salto.**

### Nivel 0 — el cartucho lleva un solo conector

- Latiguillo único de **180 mm** por cartucho, 5 conductores: motor A/B (2 × AWG24, 0.5 A),
  sensor VCC/GND/OUT (3 × AWG26), en **funda trenzada Ø6**.
- Termina en **conector de 6 vías con enclavamiento y polarización** (JST-XH 6 o Micro-Fit
  3.0 6). La sexta vía se deja libre y sirve de llave: no se puede enchufar del revés ni
  cruzar un cartucho con el de al lado.
- El conector va en un **portaconector impreso en la cara exterior del cartucho, mirando
  hacia abajo, a Z ≈ −58**: se desenchufa de un tirón con una mano y con el módulo
  basculado queda de frente.
- Sujeción del latiguillo al cartucho con brida por un **ojal punzonado de 4 × 8** en el
  brazo. Ningún cable atado a otro cable.

### Nivel 1 — un nodo por celda, siempre en el mismo sitio

**Cassette de nodo** impreso (PETG), **95 × 50 × 45**, colgado de la cara inferior del deck
con **2 × M4**, **siempre en el bolsillo de 270°** de cada celda (`dis`). Los tres bolsillos a
30°/150°/270° están libres de −8 a −110 porque los motores convergen en el centro
(R = 11…33) y los cartuchos están a 90°/210°/330°: entre R = 40 y R = 100 quedan unos
**100 × 55 mm útiles** (`calc`), y el cassette se dimensiona 5 mm por debajo. Elegir siempre
el mismo bolsillo es lo que hace que las 9 celdas se lean como 9 copias en vez de como
nueve montajes parecidos.

Contenido del cassette, idéntico en las 9 celdas:

- 1 × ESP32 (DevKitC o C3 SuperMini, ambos en `componentes/catalogo.json`)
- 2 × TB6612FNG (4 canales, 3 usados; el cuarto queda de repuesto en caliente)
- 1 × buck LM2596 12 → 6 V
- 1 × polyfuse 2 A: **una celda en corto no puede tumbar el banco**
- 3 hembras de 6 vías en un costado, 1 conector de 4 vías en el otro
- Tapa transparente a presión en PET de 0.5 mm, para que se vean los LED

**Aquí ocurre el colapso: entran 15 hilos por celda (3 × 5) y salen 4** — +12 V, GND, bus A,
bus B. De 135 conductores en el mecanismo se pasa a **36 conductores** saliendo de los
nodos.

### Nivel 2 — troncal en peine

Aquí no vale poner la canaleta "por donde quepa": la planta de la bahía está tomada por
27 volúmenes de extracción. Proyectados sobre el eje Y, esos volúmenes ocupan las
bandas [−83.3, 7.3] · [46, 183.9] · [222.6, 360.5] · [399.2, 459.2] (`calc`), y dejan
exactamente **tres corredores libres de 38.7 mm de ancho**, en

> **y = 7.3…46 · y = 183.9…222.6 · y = 360.5…399.2**

que atraviesan el módulo de lado a lado en la dirección larga. Esa es la única
canalización recta posible dentro de la bahía, y no es una elección estética: es lo que
queda.

**Tres canales en U de chapa 1.5 mm, 30 ancho × 25 alto**, uno por corredor, atornillados
a la cara inferior del deck con M4 cada 120 mm, de 714 mm cada uno. Tapas impresas a
presión de 200 mm, en naranja. Cada uno **baja al cinturón eléctrico por un pasacables
Ø20 con arandela de goma** en el alma de la viga perimetral: **la troncal no vive en la
bahía, vive en el cinturón**, y en la bahía solo hay tres tramos rectos y visibles. Cada
nodo de celda se conecta a su corredor con **4 hilos y ≤ 250 mm**.

Por los canales van solo: **2 × AWG12 (12 V / GND)** y **2 × AWG24 (bus)**. A 14 A y 2 m de
recorrido el AWG12 cae ~0.15 V (`dis`, estimación). Bus **RS-485 semidúplex a 250 kbit/s en cadena
margarita, terminado con 120 Ω en los dos extremos**: se elige cableado y no Wi-Fi
precisamente porque en un banco docente el bus tiene que ser una cosa que se ve, se
sigue con el dedo y se puede pinchar con un analizador. El Wi-Fi de los ESP32 queda
como canal de telemetría, no de control.

### Nivel 3 — acometida y mando, todo en un solo panel

**Panel frontal de 200 × 60**, chapa 2 mm, en el faldón delantero izquierdo (`dis`):
entrada de 12 V (XT60 o Anderson PP45), portafusible 25 A, interruptor iluminado,
**seta de emergencia Ø22**, 3 LED de estado y un pasamuros USB-C al maestro. Todo lo que
un operador toca está en un sitio y a la vista.

**La fuente de 12 V 20 A vive FUERA del módulo**, en su propia caja ventilada con entrada
IEC C14 y fusible. Dos razones: (1) dentro del volumen del banco no debe haber nada por
encima de 60 V CC, y así el módulo entero es SELV y se puede manipular con las manos
mientras funciona; (2) una fuente de 199 × 98 × 38 dentro del cinturón se comería el
acceso justamente por donde hace falta. Se conecta con un solo cable.

### Reglas de cableado (no negociables)

1. Ningún cable cruza un volumen de extracción.
2. Ningún cable se ata a otro cable: todo va a un ojal o a un canal.
3. Longitudes fijas por tipo (180 mm latiguillo cartucho→nodo, 250 mm nodo→canal). Nada
   cortado a ojo, ni un solo cable de "la longitud que hizo falta ese día".
4. **Anillo identificador impreso** en los dos extremos de cada latiguillo, 8 mm de ancho,
   texto en relieve de 0.6 mm: `C5-B`. No etiquetas adhesivas, que se despegan y se borran.
5. Código de color: **rojo** +12 V · **negro** GND · **azul** bus · **amarillo** señal de sensor ·
   **blanco/verde** motor A/B.

Longitud total estimada: ≈ **50 m** de conductor — 24 m en los latiguillos, 9 m de nodo a
canal, 17 m de troncal y cinturón (`dis`, estimación).

---

## 6. Legibilidad para demostración

Un banco que se enseña tiene que poder explicarse **sin hablar**. Lo que se ve y lo que
no se ve es una decisión de diseño, no una consecuencia.

**Se deja ver:**

- Las 27 ruedas y su dirección de rodadura.
- Los 27 cartuchos, idénticos: la repetición *es* la lección. Un visitante que ve 27
  objetos negros iguales colgados de una placa entiende el sistema en tres segundos.
- Los 9 nodos de celda, cableados idénticos, con sus LED a través de la tapa.
- El bus, como un único recorrido continuo que se puede seguir con el dedo.

**Se tapa:**

- La fuente (fuera del módulo).
- La troncal de 12 V (dentro del canal, con tapa).
- Nada más. Lo que no se puede enseñar sin que dé vergüenza es que está mal ordenado.

**Código de color** — funcional, no decorativo, y con una sola regla que memorizar (`dis`):

| Elemento | Acabado | Regla que enseña |
|---|---|---|
| Deck | aluminio anodizado natural mate | fondo neutro; mandan el cartón y las ruedas |
| Cartuchos y bastidor | anodizado negro | "esto es estructura y mecanismo" |
| Ruedas | tal como se compran | no se pintan: son la pieza comprada |
| Impresión 3D **naranja RAL 2003** | collarines, portaconectores, tapas, pomos | **naranja = se toca y se quita sin herramienta** |
| Impresión 3D **gris antracita** | bloques, acoples, soportes, portabolas | **gris = estructura, no se toca** |

Una sola frase basta para enseñar el código: *lo naranja se quita con la mano, lo gris no*.

**Rotulado — grabado láser directamente en el deck anodizado** (`dis`), no serigrafía ni
vinilo, que se despegan:

- Las 6 aristas de cada hexágono, línea de 0.3 mm: **la trama sigue leyéndose aunque el
  deck sea de una pieza.**
- **Número de celda 1–9**, 12 mm de altura, junto a la bola central.
- **Letra de unidad A/B/C** junto a cada rueda, 6 mm, más una **flecha de 20 mm en la
  dirección de rodadura** (tangencial). Con eso un visitante lee la cinemática de la
  celda directamente del suelo del banco.
- **Rosa de ejes X/Y de 25 mm** y origen del módulo en una esquina.
- **Cartela de 60 × 15** en la esquina delantera derecha: proyecto, versión, fecha.
- Flechas de **entrada/salida** en los dos lados largos, y su ausencia en los cortos.

**Un solo identificador, repetido en cuatro sitios.** `C5-B` aparece grabado en el deck,
en el anillo del latiguillo, en el cassette del nodo junto a la hembra, y en la propia
pestaña del cartucho (grabado en la chapa). Es la regla que convierte una avería en un
diagnóstico de diez segundos.

**Dos extras baratos que valen mucho en demostración:**

1. **Cartucho de exposición.** El usuario tiene 28 ruedas y 30 motores para 27 unidades.
   Montar el sobrante como un **cartucho nº 28 despiezado sobre un soporte impreso**, al
   lado del banco, para que la gente lo toque y lo desarme sin acercarse a la máquina.
2. **Tira LED de 12 V en la cara interior del faldón delantero**, apuntando hacia dentro:
   ilumina la bahía y hace que el mecanismo se lea a través del policarbonato. Cuesta
   dos euros y cambia por completo cómo se ve el banco.

---

## 7. Seguridad

Conviene decir primero lo obvio para no sobreproteger: **es una máquina de 12 V cuyo
motor da 0.0785 N·m a rotor bloqueado, o sea 3.3 N en el radio de la rueda** (`calc`), y
0.98 N en régimen. Una rueda bloqueada empuja menos que un dedo apoyado. Sobreguardar
este banco sería un error de diseño: lo volvería opaco sin hacerlo más seguro. Los
riesgos reales son otros tres.

**7.1 Atrapamiento rueda / placa.** La rueda asoma 5 mm por una ranura con 3.0 mm de
holgura lateral, y por el criterio de aberturas de ISO 13857 una ranura de e ≤ 4 mm no
admite la yema del dedo. Pero **los dos extremos de la ranura abren 7.8 mm** (§3.2), y ahí
sí entra. El collarín impreso deja la holgura uniforme en **2.0 mm** en todo el contorno y
cierra los extremos: es un elemento de seguridad, no un embellecedor, y es la primera
pieza que hay que hacer. (La aplicación exacta de la norma hay que verificarla: aquí se
usa como criterio de orden de magnitud, `dis`.)

**7.2 Cantos de chapa.** Regla, sin excepciones:

- Todo canto expuesto lleva **plegado de refuerzo (hem) de 8 mm a 180°** o **radio r ≥ 1.5**.
  Aplica al borde inferior del faldón, a los brazos del cartucho y a los canales.
- Donde el hem sea imposible: **desbarbado 0.3 × 45° y canto sellado**.
- Todo recorte interior de chapa lleva **radio R ≥ 5 en las esquinas** (también por
  fatiga y por el plegado).
- El canto del deck no queda expuesto: lo cubre la orla con r = 2 (§3.4).

**7.3 Electrónica.** Dentro del módulo, nada por encima de 60 V CC: la fuente y la red
viven fuera (§5). Protecciones: **fusible 25 A en la acometida** y **polyfuse de 2 A por
celda** — un TB6612 en corto no puede llevarse por delante los otros ocho controladores,
que es exactamente lo que pasa en un banco que se depura. **Seta de emergencia Ø22 en el
panel frontal** cortando el raíl de 12 V de motores mediante relé de 30 A, **manteniendo
viva la lógica** para que el banco pueda decir por qué se ha parado. **Borne de tierra
funcional M4** uniendo deck, bastidor y chasis de la fuente, para drenar la estática que
genera el cartón deslizando.

**7.4 Modo de enseñanza.** El faldón transparente se puede quitar, y con él quitado hay
dedos a 40 mm de las ruedas. Se resuelve con una regla escrita, no con una pieza:
**paneles puestos siempre que el banco funcione con público; paneles quitados solo en
demostración dirigida y con el mando limitado a 2 V (0.17 m/s frente a los 0.50 m/s de
régimen)**. El limitador lo impone el firmware del maestro y se indica con el LED ámbar
del panel.

**7.5 Manipulación.** 18 kg estimados: **dos asas plegadas de 120 × 30 con hem** en las caras
cortas, y **cuatro pies M8 regulables con base de goma Ø40**. El basculamiento (§4.5) lleva
**tope mecánico a 95° con pasador**, para que el módulo no pueda pasarse de vuelta.

---

## 8. Tres alternativas formales para el faldón

Restricción común: chapa plegada, pernería e impresión 3D; el faldón no soporta el
mecanismo (eso lo hace la viga perimetral) y no puede invadir el volumen de extracción.
Superficie a cubrir: perímetro de 2.63 m × **147 mm** de altura (de Z = −8 a −155).

### Alternativa A — Caja cerrada

Faldón continuo de chapa 1.5 mm plegada en U, 4 piezas (2 largas + 2 cortas), esquinas a
inglete con pestaña de solape de 25 mm, unidas con M4 y tuerca de canal. Rejillas
troqueladas de 60 × 15 en las caras cortas. Borde inferior con hem de 10 mm.

- **A favor:** rigidez torsional máxima (el faldón trabaja como cajón); protege la
  electrónica del polvo y de los golpes; superficie continua y limpia para rotular;
  es lo más barato en piezas.
- **En contra:** **mata la legibilidad**, que es el objetivo declarado del banco; para
  acceder al cinturón eléctrico hay que soltar 12–16 tornillos y descolgar un faldón
  entero de 700 mm; acumula el calor de 9 bucks y 14 drivers en un volumen cerrado;
  convierte un banco docente en una caja opaca.

### Alternativa B — Chasis expuesto

Solo la viga perimetral (sección C de 40 × 70, chapa 2 mm) rematando el canto del deck,
un zócalo bajo de 40 mm que une los pies, y **nada más**: el vientre del módulo queda a la
vista por los cuatro lados.

- **A favor:** legibilidad máxima; acceso total sin desmontar nada; el más ligero
  (≈ 2 kg de chapa); ventilación natural; el más barato; y es coherente con la idea de
  que el banco no esconde nada.
- **En contra:** expone dedos al mecanismo y a la electrónica en cualquier situación,
  no solo en demostración dirigida; menos rígido (exige el travesaño central para no
  alabear); entra polvo y virutas en los rodamientos abiertos 624ZZ; y **obliga a que el
  cableado esté impecable siempre**, porque no hay dónde esconder un mal día.

### Alternativa C — Marco estructural + paneles transparentes desmontables

La viga perimetral de B, más **8 paneles de policarbonato incoloro de 3 mm** (2 por lado
largo, 2 por lado corto), de ~350 × 145 y ~290 × 145, cada uno con **2 tornillos moleteados
M4** contra tuercas remachables en la viga, y **pestaña inferior de 15 mm que engancha en
el zócalo** (así el panel se cuelga primero y luego se atornilla: se monta con una mano).
Bordes fresados y radio R5 en esquinas. Un panel es el **panel frontal de mando** en chapa
2 mm (§5).

- **A favor:** resuelve a la vez las dos exigencias contradictorias del encargo —ver y
  proteger—; un panel se abre en 5 segundos sin herramienta y deja 350 × 145 de acceso
  local, en vez de descolgar un faldón entero; se puede exponer el banco con los
  paneles quitados y transportarlo con ellos puestos; la estructura no depende de los
  paneles, así que el banco funciona igual con cero, cuatro u ocho puestos.
- **En contra:** es la que más piezas tiene (8 paneles + 16 pomos + 16 tuercas
  remachables); el policarbonato se raya y se electriza, y con estática atrae
  precisamente el polvillo de cartón; es la más cara de las tres (≈ 0.4 m² de PC).

### Recomendación: **C**

Argumento, en orden:

1. **El encargo dice que el banco se va a enseñar, desarmar y depurar constantemente.**
   Esas tres palabras excluyen A: una caja cerrada obliga a un desmontaje para cada
   una de ellas.
2. B es tentadora y es la más honesta, pero falla en un punto concreto: los 54
   rodamientos 624ZZ son abiertos con tapa metálica, y un banco de laboratorio en una
   mesa con cartón produce polvillo. Sin ninguna barrera, se comen los rodamientos.
   También falla en que la seguridad quedaría enteramente delegada a una regla de uso.
3. C **desacopla estructura y cerramiento**, que es lo que permite tener las dos cosas:
   la viga hace el trabajo mecánico y los paneles son consumibles de uso. Se puede
   empezar construyendo B (solo viga y zócalo) y añadir los paneles después sin
   rediseñar nada: **C es B más ocho piezas**. Para un banco que va a evolucionar, esa
   propiedad vale más que los 8 paneles.
4. El rayado del policarbonato se acepta explícitamente: los paneles son piezas de
   0.4 m² de plancha, se vuelven a cortar cuando estén feos. No es una pieza noble.

---

## 9. Lo que hay que decidir o medir antes de cortar

| # | Cuestión | Consecuencia si se decide al revés |
|---|---|---|
| 1 | **Deck de 1 pieza en aluminio 3 mm** (§3.5) contra 9 hexágonos de acrílico 5 mm | Cambia `placaEsp` (5 → 3) y con él `zPlaca` (−10 → −8) y la altura de 54 bloques y 27 soportes. Si se mantienen las 9 placas, no hay bolas de vértice vacío y hacen falta 12 pletinas, chaflanes y un asiento rectificado. |
| 2 | **Cartucho CA-01** (§4.3) contra atornillar cada pieza al deck | Es el cambio que decide el §4 entero. Añade 27 piezas de chapa plegada y quita 162 tornillos M3. |
| 3 | **24 bolas locas** (§3.1) | Sin ellas el bulto mínimo con tres apoyos garantizados es de **250 mm**, y una caja de 150 puede quedarse parada sobre el aluminio. Si no se ponen, hay que escribirlo en la ficha del banco. |
| 4 | **Collarín de ranura** (§3.2) | Sin él quedan **54 aberturas de 7.8 × 30.5 mm** en la superficie de transporte, abiertas al mecanismo. Es el punto más flojo del diseño actual después del mantenimiento. |
| 5 | Confirmar con calibre el **agujero de la rueda** (4 o 6 mm) | Ya está anotado en el README: cambia 54 rodamientos, 27 ejes y la luz interior del cartucho (47.5 mm). |
| 6 | Verificar con el barrido B-rep el **portabolas central Ø19** contra las tres campanas de motor a R = 12 | Si no cabe, la bola central se sustituye por 3 a R = 45 y el hueco máximo sube. |
| 7 | Comprobar la **flecha del deck** con 3 kg puntuales y las 4 columnas | Si supera 0.5 mm hay que añadir columnas o pasar a chapa de 4 mm. |
| 8 | **Corregir la incoherencia de taladros** entre `planos_celda.mjs` (24/placa) y `piezas.mjs` (30/placa) | Hoy el DXF que se manda a cortar no lleva los 6 taladros del soporte de motor. Se corrige tanto si se hace el deck de 1 pieza como si no. |
| 9 | **Meter el volumen de extracción en el CAD** (§4.6) como sólido de referencia | Sin él, cualquier añadido futuro —una bandeja, una canaleta, un travesaño— puede romper el mantenimiento sin que nadie se entere hasta el montaje. |
| 10 | **Posición del encoder.** Hoy el sensor está en el extremo exterior del eje, a R = 109.75, y **es él quien fija el tamaño del hexágono**, no la rueda (que solo llega a R = 88.25) | Llevarlo al lado del motor o cambiarlo por un encoder magnético en la punta del eje quitaría ~10 mm de radio: el módulo bajaría de 71.4 a ≈65 cm, los huecos de apoyo se encogerían con él y se podrían poner columnas en los 4 vértices de triplete (§2). Es la mejora estructural más barata que le queda a este diseño. |
