# Revisión de taller — ¿se puede COMPRAR y se puede MONTAR?

Revisor: ingeniería mecánica de producto. Fecha: 03-08-2026.
Encargo: el cliente manda este ensamble al taller. Todo lo que aquí se dice está
contrastado contra el JSON emitido, contra los módulos de `adapt/`, contra
`web_facts.json` y contra ficha de catálogo cuando la hay (URL citada).

**Instantánea revisada.** `cad/ensambles/sorter_co/sorter_co_adaptado.json`
del 03-08-2026 22:06:55 UTC — **1020 piezas** (575 propias, 284 del NBT90
embebido marcadas `contexto`, 161 contexto del cliente). El fichero se está
regenerando en paralelo por otros agentes (`mod_tensor2.mjs`,
`params_tensor2.mjs`, `gen_sorter_co.mjs` modificados a las 22:01–22:06): la
partida del encargo eran 957 piezas y a mitad de revisión pasó a 1020. **Todos
los hallazgos de abajo están re-verificados sobre la instantánea de 1020**;
donde el número de piezas importa, lo digo.

**No he tocado geometría.** Tampoco he corregido `normalizado.mjs` ni
`web_facts.json`: los errores de designación que encuentro no son de esos dos
ficheros, son de `lib.mjs` (que el contrato §2 prohíbe tocar) y de módulos que
otros agentes tienen abiertos ahora mismo. Queda todo escrito con la corrección
exacta que hay que aplicar.

**Resumen en una línea.** De las ~180 referencias distintas que hay que comprar,
**hoy se pueden pedir 12** (las SMC y poco más). El resto o no tiene referencia,
o tiene una designación imposible, o no existe como pieza en el modelo. Y hay
**cuatro cosas que no se pueden montar** aunque llegue todo el material.

---

# BLOQUE A · NO SE PUEDE COMPRAR

## A1 · [BLOQUEANTE] El sorter no pasa por `normalizado.mjs`: 265 piezas con designación imposible

`ensambles/nbt90/normalizado.mjs` existe precisamente para esto — su cabecera lo
dice: *«`lib.mjs` estampaba cadenas genéricas del tipo “ASME B18.2.1 / DIN 933” a
TODOS los pernos, fueran de pulgada o métricos — o sea, dos normas incompatibles
a la vez y ninguna aplicable a la pieza concreta»*. `gen_nbt90.mjs` lo importa
(línea 31) y lo aplica a sus 410 piezas antes de la compuerta.

**`gen_sorter_co.mjs` NO lo importa.** Comprobado: `grep -rn "normaliz" ` sobre
`gen_sorter_co.mjs` y sobre los 15 módulos de `adapt/` no devuelve una sola
llamada. Resultado, sobre las 575 piezas propias:

| Cadena estampada | nº piezas | Por qué es imposible |
|---|---:|---|
| `ASME B18.2.1 / DIN 933` | **181** | ASME B18.2.1 es tornillo hexagonal **en pulgadas**; DIN 933 es **métrico**. Se estampa igual al M8×16 que al 3/8-16×2". Ninguna de las dos designa a la vez. |
| `DIN 471 / ASME B27.7` | **42** | DIN 471 es métrica; ASME B27.7 (sin «M») es **la serie de pulgadas**. Ver A2. |
| `ASME B18.2.2 / DIN 934` | **33** | Ídem: B18.2.2 pulgadas, DIN 934 métrica. |
| `DIN 125 / ASME B18.22.1` | **9** | Ídem. Además DIN 125 está **retirada** desde 2011, sustituida por ISO 7089/7090. |
| **Total** | **265** | |

Ninguna de esas 265 líneas se puede pasar a un proveedor. Y no llevan clase de
resistencia ni acabado: un M12 de la chumacera del pivote y un M8 de una guarda
salen con la misma designación (ninguna).

**Corrección.** Importar `normalizar` de `../nbt90/normalizado.mjs` en
`gen_sorter_co.mjs` y aplicarlo a `E.parts` **antes** de la compuerta, igual que
`gen_nbt90.mjs`, y **añadir a `designar()` los casos que el sorter tiene y el
NBT90 no**: M6/M8/M10/M12 (ISO 4017 clase 8.8, ISO 4032, ISO 7089, zincado ISO
4042), tuercas martillo de ranura 10, DIN 471 métrico Ø8/Ø10/Ø30/Ø35, y la serie
**ANSI B27.7M-3AM1** para el Ø20 (ver A2). Y poner la compuerta que ya tiene el
NBT90: *ninguna pieza comprada sin designar*.

## A2 · [BLOQUEANTE] Anillo métrico pedido en pulgadas — otra vez, y en 42 piezas

`normalizado.mjs` ya corrigió este defecto una vez para el 5/8" del NBT90 y lo
dejó escrito en su `aviso`. Aquí vuelve, invertido:

- **10 × «Anillo retención 3AM1-20 tensora ±X (calle N) Ø20»** con norma
  `DIN 471 / ASME B27.7`. Es un anillo **métrico de eje 20**. `web_facts`
  RING-001 lo tiene bien documentado y citado:
  *«ANSI B 27.7 (3AM1) - 1977 (R2017) **Metric** external Retaining Rings - 3AM1…
  3AM1-20 for a 20 mm diameter shaft»*
  ([globalfastener](https://www.globalfastener.com/standards/detail_23408.html)).
  La norma métrica es **ANSI/ASME B27.7M serie 3AM1**; «ASME B27.7» a secas es la
  de pulgadas, y DIN 471 es otra norma distinta con otra ranura.
  **Designación correcta: `ANSI/ASME B27.7M — 3AM1-20`** (o su equivalente
  DIN 471-20×1,2, pero **una sola**, no las dos).
- 32 anillos métricos más (Ø8 ×10, Ø10 ×10, Ø30 ×10, Ø35 ×2) con la misma cadena
  doble. Todos son **DIN 471** a secas.

## A3 · [BLOQUEANTE] «Collar de apriete PARTIDO … DIN 705 A»: la norma dice lo contrario

11 piezas: 8 collares Ø30 (rodillos de retorno), 2 Ø35 (conducido), 1 Ø50×15
(pila de brazos del pivote).

**DIN 705 forma A es un Stellring MACIZO con prisionero**, no un collar partido
([Mädler](https://www.maedler.de/product/1643/1126/din-705-a-stellringe),
[fasteners.eu](https://www.fasteners.eu/standards/din/705-A/)). No existe versión
partida en DIN 705. Y el propio modelo pide lo contrario en su nota:
*«**Partido**, para montarlo sin desmontar las chumaceras»* (`mod_tensor2.mjs`,
collar del pivote). O sea: se pide una pieza cuya función depende de ser partida
y se designa con la norma de la que no lo es.

**Corrección.** Un collar de apriete partido no tiene norma DIN/ISO: hay que
elegir fabricante y citarlo, que es lo que ya hace `normalizado.mjs` con el buje
sin chaveta. Referencias comprables: **Ruland MSP-30-SS / MSP-35-SS** (partido,
apriete por tornillo), **Misumi SSCS30 / SSCS35**, o **Mädler 62035500** serie
partida. Si de verdad se quiere DIN 705 A hay que cambiar la nota: entonces es
macizo, hay que enfilarlo por el extremo del eje y **el montaje sin desmontar
chumacera deja de ser posible**.

## A4 · [BLOQUEANTE] La chumacera del eje pivote está mal acotada: 108 contra 117 de catálogo

`adapt/params_tensor2.mjs:217`:
```js
ucfl: { designacion: 'SKF UCFL 206', bore: 30, housingW: 31, entreTaladros: 108, alto: 140 },
```
El modelo taladra el chapón del cliente a **108 mm entre centros** (los 4 pernos
salen a Y = −47,72 y Y = −155,72) y dibuja el agujero de la brida Ø16.

**Catálogo, dos fuentes independientes: J = 117 mm.**
[Bearings Direct](https://bearingsdirect.com/ucfl206-cast-iron-oval-flange-bore-size-30mm/)
da *«Bolt Hole to Bolt Hole (J) 117 mm, Overall Length (A) 148 mm»*; el resumen
de catálogo consultado
([SKF UCFL 206](https://www.skf.com/group/products/mounted-bearings/ball-bearing-units/flanged-ball-bearing-units/productid-UCFL%20206))
coincide en 117. Y encaja con la serie: UCFL205 → 99 (que es justo lo que
`web_facts` BRG-003 documenta y midió del cliente), UCFL206 → 117, UCFL207 → 130.

**Consecuencia real:** 4,5 mm de desviación por lado. Con perno M12 en agujero
Ø16 hay 2 mm de juego por lado. **La chumacera no entra en los taladros.** Y son
taladros nuevos en el chapón del cliente (modificación ya declarada): si se
taladra a 108 hay que volver a taladrar. También hay que revisar `alto: 140`
frente a los 148 de catálogo.

## A5 · [BLOQUEANTE] La designación del KJ10D mezcla dos accesorios distintos

5 × `SMC KJ10D — horquilla de vástago con rótula, M10×1.25, **bulón y seguro ISO
8140**`.

- El **KJ10D existe y es correcto** para el C85 Ø25: es un *piston rod ball joint*
  M10×1,25 ([RS 263-9183](https://uk.rs-online.com/web/p/rod-ends/2639183),
  [ficha SMC KJ_D_EU](https://static.smc.eu/pdf/KJ_D_EU.pdf)).
- Pero es una **rótula (rod end)**, no una horquilla. **ISO 8140 es la norma de
  las HORQUILLAS de vástago (rod clevises)**, la serie I-/Y-, que sí se
  suministran con bulón y clip. El KJ **no lleva bulón**.
- Y el propio ensamble lo demuestra: aparte del KJ10D fabrica un
  **«Bulón del lóbulo Ø10×64»** y compra **10 anillos DIN 471-10**. Si el bulón
  viniera con la rótula, sobra el fabricado; como no viene, sobra la cita a ISO
  8140. Hoy están las dos cosas → doble suministro en la lista de compra.
- La propia fuente lo declara flojo: `web_facts` PNEU-006, confianza *media*,
  cita *«The KJ10D **appears to be** a double knuckle joint option»*.

**Corrección.** `SMC KJ10D — rótula de vástago (rod end), rosca hembra M10×1,25,
Ø de rótula 10 mm; SIN bulón (se suministra aparte)`. Quitar ISO 8140.

## A6 · [GRAVE] Bulón trasero: ISO 2341 B y DIN 471 no pueden ir juntos

5 × «Bulón trasero Ø8×44» con norma `ISO 2341 B — bulón Ø8 con taladro de
pasador`, más **10 × «Anillo retención bulón trasero ±X Ø8»**.

ISO 2341 **forma B** es el pasador de horquilla **con taladro para pasador de
aletas** (ISO 1234). No tiene ranura para circlip. **En un ISO 2341-B no se puede
montar un DIN 471-8.** Hay que elegir:

- `ISO 2341-B 8×44` + **2 × ISO 1234 pasador de aletas 2×20** (y fuera los 10
  DIN 471-8), o
- bulón **fabricado** Ø8 h9 con dos gargantas DIN 471-8 (y entonces no es
  ISO 2341, es pieza de plano).

## A7 · [GRAVE] Piezas fabricadas presentadas como compradas, y al revés

**Se venden como compradas y no lo son:**

| Pieza | Cant. | Qué es de verdad |
|---|---:|---|
| `TAMBOR · eje Ø35 × 710 con saliente y chavetero` | 1 | Marcada `componente: eje_tambor_35`, sin norma → cuenta como comprada. Es una **pieza de plano**: Ø35 k6 en dos asientos, chavetero DIN 6885 de 100, saliente para el reductor. Necesita plano, no referencia. |
| `PG40 · Tope de guía M6` | 20 | Marcada `hardware: true`, sin norma ni referencia. Es una **pletina fabricada** más un tornillo M6 que no está modelado (ver A9). |
| `TAMBOR · Rodamiento UC207 del UCF 207` | 2 | Es **el inserto que ya viene dentro** de la UCF 207. Si se pide como línea propia se compran 2 unidades completas **y** 2 insertos sueltos. Marcar «no se suministra suelto», como hace `normalizado.mjs` con las piezas del B-20760. |

**Se compran y figuran como «sin clasificar»** (ni `hardware` ni `fabricada`, así
que no salen en ninguna de las dos listas): 5 **bandas planas**, 20 **regletas
UHMW**, 14 tramos de **perfil PG40** (10 largueros + 4 travesaños), 10 **volantes
de horquilla** y 5 **poleas tensoras** del cliente. Son **54 piezas** fuera de
todo control de lista, de un total de 139 sin clasificar.

## A8 · [BLOQUEANTE] La banda no se puede pedir

5 × `FIJO · Banda plana 32 × 0.633 — lazo del tambor motriz L=4877.64`.
**Sin fabricante, sin referencia, sin número de telas, sin recubrimiento, sin
tipo de empalme.** Lo único que hay es la propia nota del modelo, que además
avisa de que el espesor está mal: *«Modelada por su DORSO 0.633 … una banda plana
real de 2 telas mide ~2.5»*.

Consecuencias:
1. **No se puede emitir el pedido.** Una banda plana angosta se pide por
   ancho × largo de fibra neutra × construcción × cubierta × empalme.
2. El **largo está mal por construcción**: la longitud de la fibra neutra de una
   banda de 2,5 mm es ≈ 2π·(2,5−0,633)/2 ≈ **+5,9 mm** sobre los 4877,64
   calculados. Irrelevante para el tensor (tiene recorrido de sobra, ver B4)
   pero **no se puede poner 4877,64 en un plano**: es una precisión de 0,01 mm en
   una pieza que se fabrica con ±0,5 %.
3. El coeficiente de arrastre µ = 0,35 con el que se calcula la reserva ×6,9
   depende de la cubierta, que no está especificada.
4. `web_facts` ya lo tiene en `pendientes_sin_fuente`: *«Diámetro mínimo de polea
   de una banda plana angosta de 2 telas de 32 mm: no se ha encontrado ficha
   citable»*. Se cierra con el proveedor **y a la vez** se cierra la referencia.

## A9 · [GRAVE] Tornillería que el modelo dice que existe y no está en ninguna lista

Cuento sobre el JSON. Todas estas piezas están **descritas en las notas** de otras
piezas pero **no existen como pieza** y por tanto no se comprarán:

| Falta | Cant. | Dónde lo dice el modelo |
|---|---:|---|
| Tuerca martillo M8 ranura 10 | **≥ 80** | `mod_pg40.mjs`: *«tuercas martillo M8 ranura 10: 2 en la ranura +X del larguero y 2 en la ranura −Y del travesaño»* × 20 escuadras |
| Tornillo M8 de esas escuadras | **40** | ídem |
| Tornillo M6 avellanado del tope de guía | **20** | nota de `Tope de guía M6` |
| Tuerca martillo M6/M8 del tope de guía | **20** | ídem: *«agarra a tuerca martillo en la ranura lateral del perfil»* |
| Arandelas | ~200 | Sólo hay **9 golillas** entre las piezas propias, para **181 pernos**. En perfil de aluminio ranurado la arandela **no es opcional** (la cabeza muerde el labio de la ranura). |
| Escuadra `larguero↔travesaño` | 20 | Existe la pieza pero **sin referencia ni plano**: es una L de 6 mm dibujada como dos cajas, sin taladros. Ver B7. |

También: **32 pernos M10 y 8 M12** de los soportes de rodillo salen en el nombre
**sin longitud** (`Perno hex M10 soporte RETORNO RR2 Ø88.9`). La geometría dice
M10×25 y M12×25 — hay que ponerlo en el nombre o no se puede pedir.

## A10 · [GRAVE] La regleta UHMW no tiene referencia y el clip no aprieta

20 piezas, 3 largos (169,18 · 200 ×2 · 99,218 por calle). `web_facts` UHMW-001
tiene confianza **baja** y lo dice él mismo: *«PENDIENTE DE REFERENCIA DE
CATÁLOGO … NO se ha localizado una ficha con designación y sección exacta de la
regleta 31.75 × 18.55»*.

Además, del propio modelo: pie de clip **9,6 mm** en ranura de **10 mm**
(`PG40-002`). Eso es **0,4 mm de holgura**, no un clip a presión — la nota dice
*«entra a presión»* y no es cierto. La regleta se sale; lo único que la retiene
son los 20 topes de extremo (que a su vez no tienen tornillo, A9).

**Corrección:** o se compra perfil de deslizamiento de catálogo con su pie
normalizado para ranura 10 (y entonces manda la sección del catálogo, no los
31,75), o es **pieza fabricada** por mecanizado de plancha UHMW y hay que
atornillarla, no cliparla.

## A11 · [GRAVE] No hay accionamiento en la lista

`params_tambores.mjs` deja escrito el interfaz: *«saliente Ø35 k6 en X
582,868…700 para reductor de **EJE HUECO Ø35 H7** con chaveta y brazo de reacción
(montaje directo sobre el saliente; sin acoplamiento ni alineación)»*, y la
compuerta publica *«≥ 450 W a 325,325 rpm de salida, par 10,17 N·m»*.

**Ese reductor no está en el modelo ni en la lista.** Comprobado: entre X = 545 y
X = 717 sólo hay el eje, la chaveta y la UCF 207 (+X); nada más. Y el
motorreductor que el cliente tiene (`CTX · Motorreductor principal 314759014`)
está en **X = −172, el lado contrario**, y según `web_facts` MOT-002 tiene **eje
macizo Ø28**, no hueco Ø35: no vale ni desplazándolo.

Falta comprar: motorreductor de eje hueco Ø35 H7 con chavetero, ≥ 0,55 kW, ~325
rpm de salida, con brazo de reacción y su anclaje. Y falta comprobar que su
carcasa cabe: el cuerpo de la UCF 207 (+X) llega a X ≈ 572 y el saliente útil
empieza en 582,9 — quedan **117 mm de eje** para un reductor cuya campana suele
medir 150–250 mm de diámetro.

## A12 · [GRAVE] El circuito neumático está a medias

El diseño es correcto en su idea (presión constante, el cilindro como muelle
neumático: `params_tensor2` *«al perder presión el tensor afloja la banda»*).
Pero para pedirlo faltan piezas que no son opcionales:

- **Un solo AR20-02-B (una salida R1/4) alimenta 5 líneas.** No hay colector, ni
  tes, ni derivaciones. Faltan: colector de 5 salidas o 4 tes Ø6.
- **No hay filtro.** El AR20 es sólo regulador. Un cilindro ISO 6432 alimentado
  con aire sin filtrar dura poco. Falta **SMC AW20-02-B** (filtro+regulador) o
  **AF20-02** delante del AR20.
- **No hay manómetro** para poner los 4 bar que gobiernan toda la tensión
  (SMC G36-10-01 / G27-10-01).
- **No hay válvula de corte y purga.** Sin ella no se puede aflojar el tensor
  para cambiar una banda ni para intervenir: hay que cortar el aire de la
  máquina entera. Falta un 3/2 manual de corte-escape (SMC VHS20-02 o similar),
  que además es el elemento de bloqueo/consignación.
- Falta la **conexión de entrada** del AR20 a la red del cliente (racor R1/4) y
  la fijación del AR20: hay una pletina fabricada de 8×90×120 pero no la brida de
  montaje SMC.
- Los **5 m de tubo PU Ø6×4** aparecen ahora como 5 «líneas de aire» sin longitud
  declarada — hay que dar metros.

## A13 · [MENOR pero bloquea el pedido] Designaciones incompletas o sin marca

- **UCF 207**: la norma dice `unidad de rodamiento de brida cuadrada de 4
  tornillos, inserto UC207 con prisioneros (JIS B 1558 / ISO 9628)`. La geometría
  **sí cuadra con catálogo** (brida 117, taladros a 92, Ø14 — `web_facts`
  BRG-UCF207-01/02, [NTN](https://bearingfinder.ntnamericas.com/item/four-bolt-flange-unit-square-style/quare-flanged-unit-cast-housing-set-screw-ucf-type/ucf207)),
  pero **falta la marca**: UCF 207 lo fabrican NTN, AMI, FYH, SKF, ASAHI con
  cargas y calidades distintas. Elegir una y citarla.
- **Casquillo de fricción Ø30/Ø38×25 con brida**, 10 uds: norma literal
  `PENDIENTE`. Es la articulación de los 5 brazos del tensor — no puede quedar
  pendiente. Equivalentes comprables directos: **igus GFM-3038-25**,
  **SKF PCMF 303425 E**, **Oilite FF-3038-25**.
- **Collar Ø50×15** (aprieta la pila de brazos): nombre dice Ø50×15, norma dice
  «PENDIENTE — collar partido Ø30». Dos cotas distintas en la misma línea.
- **Chaveta DIN 6885 A 10×8×100**: la designación es correcta para eje Ø35
  (10×8, t1 = 5,0). ✔ Es de las pocas que se puede pedir tal cual.
- **AN101-01, KQ2L06-01AS, AS2201FS-01-06S, AR20-02-B, C85C25, CD85N25-80-B,
  KJ10D**: existen y son comprables. ✔ (AN101-01 verificado:
  [TME](https://www.tme.eu/en/details/an101-01/air-equipment/smc/) — silenciador
  de bronce sinterizado R1/8, 21 mm.) Nota: `web_facts` PNEU-005 tenía confianza
  *baja* y sin cita; **queda confirmado**, se puede subir a alta.
- **6206-2RS / 6207-2RS**: designación ISO 15 correcta y coherente con los ejes
  Ø30 / Ø35. ✔ Falta marca y jaula/sello, pero se pide.

---

# BLOQUE B · NO SE PUEDE MONTAR

## B1 · [BLOQUEANTE] Las 5 poleas tensoras NO tienen rodamiento

`mod_tensor2.mjs` los crea:
```js
rodamiento(E, { nombre: `${POL.rodamiento.designacion} tensora …`, bore: 20, od: 42, w: 12 })
// POL.rodamiento = { bore:20, od:42, w:12, designacion:'SKF W 6004-2Z' }  (web BRG-005)
```
…y **no están en el ensamble**. Comprobado: `parts.filter(p => /W 6004/.test(p.name))`
devuelve **0** tanto en la instantánea de 957 como en la de 1020.

**Causa exacta.** `adapt/params_tambores.mjs:414`, dentro de `RETIRA.rx`:
```js
'Rodamiento SKF W 6004',   // 40 · rodamientos de las V1…V4
```
El comentario dice que es para los 40 rodamientos de las poleas de pozo V1…V4
retiradas. Pero es una **subcadena sin anclar** y `gen_sorter_co.mjs:141` la
aplica a **todo** `E.parts` — y el tensor nuevo (que se genera en la línea 75,
antes) usa el mismo rodamiento. Se lleva por delante los **10 del tensor**.
Verificado ejecutando la propia `RETIRA.rx` contra el nombre generado:
`FIJO · Rodamiento SKF W 6004-2Z tensora −X (calle 1, X=127.056) (20×42×12)`
→ **FILTRADO**.

**Estado que llega al taller:** polea de Ø117,9 girando **a metal sobre el eje
Ø20**, retenida sólo por dos anillos 3AM1-20. No gira, se agarrota, y con 258 N
de carga radial se come el eje en horas.

**Corrección (en `params_tambores.mjs`, no en el tensor):** anclar la expresión a
las piezas del pozo, p. ej. `'Rodamiento SKF W 6004-2Z \\(V[1-4]'` — el mismo
criterio que ya usan las dos líneas siguientes (`'testa de eje \\(V[1-4]'`).
La compuerta de la línea 1188 no puede detectarlo: comprueba los *restos* que
siguen encajando en la expresión **después** de filtrar, y ahí ya no queda nada.

## B2 · [BLOQUEANTE] Los 4 pernos M12×45 de las chumaceras del pivote no llegan a su tuerca

Medido sobre la geometría (vástago desde `at` en la dirección `dir`, longitud
`h`, contra la posición del prisma de la tuerca):

| Perno | L vástago | La tuerca empieza en | y acaba en | Falta |
|---|---:|---:|---:|---:|
| M12×45 UCFL pivote −X (Y=−47,72) | 45 | 59,00 | 69,80 | **24,80 mm** |
| M12×45 UCFL pivote −X (Y=−155,72) | 45 | 59,00 | 69,80 | **24,80 mm** |
| M12×45 UCFL pivote +X (Y=−47,72) | 45 | 59,00 | 69,80 | **24,80 mm** |
| M12×45 UCFL pivote +X (Y=−155,72) | 45 | 59,00 | 69,80 | **24,80 mm** |

Cuadra con la geometría: el perno arranca en la cara interior de la chumacera
(31 mm de cuerpo modelado) y tiene que atravesar además el **chapón de 28 mm** del
cliente. Apriete real ≈ 31 + 28 = 59 mm; con tuerca de 10,8 y 2 hilos de salida
hace falta **M12×75**, no M12×45. `mod_tensor2.mjs:131-132`.

Con la brida real de la UCFL 206 (≈ 19 mm, no 31) sale 19 + 28 = 47 → **M12×60**.
Se cierra al corregir A4.

## B3 · [GRAVE] Ocho tuercas M12 y ocho M10 con cero hilos de salida

Mismo cálculo:

- **8 × `TAMBOR · Tuerca hex M12 UCF 207`**: la tuerca acaba **exactamente** en el
  extremo del vástago (0,00 mm). M12×34 y M12×62 → hay que subir a **M12×40** y
  **M12×70**.
- **8 × `PG40 · Tuerca hex M10 · alargue↔chapón`**: 0,50 mm de salida. M10×45 →
  **M10×50**.

Un tornillo cuya tuerca acaba a ras del último hilo no se puede apretar (el
último hilo está incompleto por el biselado) y no pasa inspección.

## B4 · [BLOQUEANTE] La banda es un lazo cerrado y no hay por dónde meterla

Con las bandas ya sin fabricante, esto es lo que decide qué banda hay que pedir.

El lazo abraza, en el plano YZ de cada calle: tambor motriz Ø108,9 (Y = 0) →
guías UHMW → conducido Ø108 (Y = −1607,4) → RR4 → RR3 → RR2 → RR1 → horquilla del
tensor. Para meter un lazo cerrado hay que **abrir el circuito** por algún sitio:

- **Tambor motriz**: tapas **soldadas** al tubo y al eje (`tapa soldada Ø82,5/Ø35
  e=12`, nota: *«el tambor y su eje son un solo cuerpo»*). Cara útil 370 dentro
  de 423,9 entre caras de apoyo → **22 mm por lado**. No se saca la banda por el
  extremo, y para sacar el eje hay que quitar las dos UCF 207 y con ellas el
  tambor de entre los dos alargues.
- **Conducido y los 4 rodillos de retorno**: eje **fijo pasante** Ø30/Ø35 entre
  dos pletinas atornilladas — se pueden desmontar (4 pernos por lado), y **ahí sí
  se abre el lazo**.
- **Polea tensora**: eje Ø20 con dos anillos → se abre.

Conclusión de taller: **el enhebrado sólo es posible desmontando un rodillo de
retorno + la polea tensora**, o montando las 5 bandas **antes** de cerrar el
bastidor. Ninguna de las dos cosas está escrita. La salida limpia, y es lo que
hay que decidir con el proveedor de banda, es pedir **banda empalmable en obra**
(dedos termosoldados tipo Flexproof — el NBT90 ya usa esa familia,
`normalizado.mjs` «Banda plana FLEXPROOF … empalme Flexproof»). Si es sin fin de
fábrica, hay que escribir el orden de montaje B6 con las bandas dentro.

*Lo que sí está bien:* recorrido de tensado. Carrera del cilindro 80 mm, relación
de palanca 1,841 → la polea recorre 80/1,841 ≈ **43,5 mm**, y con 180° de abrazado
eso absorbe **≈ 87 mm de longitud de banda** (±0,9 % sobre 4877). Sobra para la
tolerancia de fabricación de la banda y para el +5,9 mm del espesor real (A8).

## B5 · [GRAVE] No hay ningún ajuste de alineación de banda (tracking)

Cinco bandas planas arrastradas por fricción sobre un tambor común:

- El tambor **no está abombado**: `TAMBOR · engomado 10 → Ø108,9 × 370` es
  cilíndrico. La única polea abombada del conjunto es la del cliente
  (`IDLER-P01 … bombeada`) y el NBT90 (`llanta abombada 0,4 mm`, Hytrol 024.15502).
- Las **UCF 207** van con agujero Ø14 sobre M12 → **±1 mm**, y sobre un cuadro de
  taladros fijo: no es un ajuste, es una tolerancia.
- El **conducido** tiene eje fijo apretado entre dos pletinas con 4 M12 en
  agujeros redondos Ø13,5: **cero ajuste**.
- Las **guías UHMW** son 31,75 para banda de 32: la banda **vuela 0,125 por lado**,
  las regletas no la guían.

Resultado: las bandas van a derivar y no hay tornillo con el que corregirlo. La
nota del tambor lo admite —*«16,6 mm de margen de deriva por lado»*— pero eso es
aceptar la deriva, no controlarla. **Hace falta**: o abombar el tambor motriz
(0,4–0,8 mm sobre 370, que es lo que hace la propia máquina del cliente), o
poner el conducido sobre colisas con tornillo de reglaje por lado, o las dos.
Esto es decisión de diseño, la dejo escrita.

## B6 · [GRAVE] No existe una secuencia de montaje escrita, y el orden no es libre

Reconstruida del modelo, la única secuencia posible es:

1. Bastidor PG40 (largueros + travesaños + escuadras) **fuera de la máquina**.
2. Alargues laterales −X/+X atornillados a los canales del NBT90 (3+2 pernos
   3/8 por las colisas) — **antes** de bajar el NBT90 al hueco.
3. Conjunto NBT90 + alargues al hueco; 8 M10 al chapón +X.
4. Cartelas de retorno y pletinas de RR1…RR4 (4 M10 cada una).
5. **Bandas enhebradas** (ver B4).
6. Eje del tambor + tambor por el lado +X; UCF 207 −X y +X.
7. Reductor de eje hueco sobre el saliente.
8. Eje pivote Ø30 + pila brazo/separador/brazo + chumaceras UCFL 206.
9. Cilindros, rótulas, neumática.
10. Guardas (las últimas: tapan todo).

Puntos donde el orden es **obligatorio** y nadie lo ha escrito:

- **Los separadores Ø38×12,2 y los 5 brazos van enfilados en el eje pivote**: si
  el eje se monta antes que los brazos, no entran. Y el collar de apriete es
  partido (A3) precisamente por eso: si se compra DIN 705 A macizo, el orden se
  rompe.
- **El tambor no entra si las UCF 207 están puestas** (335,1 mm libres entre
  cuerpos contra 380 de tubo — el propio aviso del generador lo dice y por eso se
  montan OUTBOARD).
- **Las guardas de pozo llevan escotes por los que pasan las pletinas de RR2 y
  RR3** (declarado por el generador). Eso obliga a montar las guardas **después**
  de los rodillos, y a desmontarlas **antes** de tocar un rodamiento.

## B7 · [GRAVE] La escuadra larguero↔travesaño no es una pieza montable

20 unidades. En `mod_pg40.mjs` es literalmente dos cajas:
```js
box('Ala al larguero 6×30×32', …), box('Ala al travesaño 30×6×32', …)
```
**Sin taladros, sin referencia, sin plano, y sin la tornillería que su propia
nota describe** (A9). Y las dos alas están dibujadas separadas 12 mm en X: no
forman una L continua.

`web_facts` BRKT-001 documenta una escuadra comprable —item *Angle Bracket Set 8
40x40*, art. 0.0.670.11, *«2 Button-Head Screws ISO 7380-M8x18 … 2 T-Slot Nuts 8
St M8»*— pero **es de línea 8 (ranura 8)** y este bastidor es **ranura 10**: no
sirve, y si alguien pide por ese hecho recibe la escuadra equivocada.

**Corrección**: escuadra de catálogo para ranura 10 con su kit
(p. ej. Bosch Rexroth / Motedis serie 10, «escuadra 40×40 ranura 10 con 2
tornillos M8×20 y 2 tuercas martillo 10 M8»), 20 juegos. O plano de la L con
taladros.

## B8 · [GRAVE] Rosca insuficiente en 40 pernos de los soportes de rodillo

`RETORNO RRx · Perno hex M10 … Ø88.9` (32 uds, M10×25) y
`CONDUCIDO · Perno hex M12 … Ø108` (8 uds, M12×25): atraviesan la pletina de
soporte de **12 mm** y roscan en la cartela / alma del alargue, que son de
**8 mm**. **No hay tuerca** para ninguno de los 40.

8 mm de rosca en acero S275 son **0,8·d** en M10 y **0,67·d** en M12. Para
clase 8.8 sobre S275 se necesita ≈ 1,5·d (15 y 18 mm). Con 8 mm el hilo se
arranca antes de llegar al par de apriete.

**Corrección**: tuerca al otro lado (y perno más largo: M10×35 / M12×35), o
tuerca soldada, o engrosar la cartela a 16, o roscar en un taco postizo.

## B9 · [BLOQUEANTE de lista] 19 tornillos huérfanos y 12 duplicados de la percha desactivada

`params_pg40.FLAGS.desactivaPercha = true`. `gen_sorter_co.mjs:111` filtra las
**placas** de la percha por nombre, pero **no su tornillería**. Quedan dentro:

| Pieza que sobra | Cant. | Comprobación |
|---|---:|---|
| `Perno hex M8×16 lengüeta (−X)` | **3** | **Flotan en el aire**: son las 3 únicas piezas del ensamble sin ningún vecino a menos de 1 mm (bbox X 8,89…21,89). Sujetaban la «Placa de cuelgue con 3 lengüetas», que ya no existe. |
| `Perno hex M8×20 ménsula↔bastidor` | **12** | Su único vecino es la **guarda de pozo −X**, a la que atraviesan. La ménsula percha y la placa frontal que atornillaban están filtradas. |
| `Perno hex M8×20 placa escote↔chapón` | **4** | Su único vecino es el chapón del cliente. La «Placa de escote» está en la lista de filtrado; sus tornillos no. |
| `Perno 3/8-16×1"/×2" cuelgue NBT90` + tuerca + golilla | **12** | **Duplicados**: van a Y = −802 y Y = −1145, las **mismas colisas** que ya usan los `PG40 · Perno hex 3/8-16 × 25 · alargue`, 8,73 mm más arriba (Z = −104,27 contra Z = −113). Y el alma del alargue **sólo tiene taladro en Z = −113** (`Amarre side channel Ø11.125`, 3 agujeros): estos 4 pernos atraviesan chapa maciza. |

Son **31 elementos de ferretería** que se comprarían y no se pueden montar. Y en
esas colisas de reglaje de ±8 mm del side channel meter dos filas de pernos
separadas 8,73 mm anula el reglaje vertical del NBT90.

**Corrección**: añadir a `rxFuera` de la percha `/lengüeta|cuelgue|ménsula↔bastidor|placa escote/i`.
El precedente ya existe y está comentado en el propio fichero para la bandera de
la transmisión T5 (*«la bandera se llevaba las placas y dejaba dentro los 60 M8 …
flotando donde ya no hay placa»*): el mismo defecto, sin corregir en la percha.

## B10 · [GRAVE] Mantenimiento: no se puede cambiar un rodamiento del tambor sin desmontar media máquina

- **Rodamiento del tambor (UC207)**: el tambor y su eje son **un solo cuerpo
  soldado**. Para cambiar una UCF 207 hay que sacar el eje Ø35×710 — que atraviesa
  los dos alargues — y para sacarlo hacen falta **≈ 750 mm libres en +X**, con el
  reductor desmontado y el chapón de descarga por medio. En la práctica: sale el
  conjunto tambor entero, y para eso hay que soltar las 5 bandas.
- **Rodamientos 6206/6207**: van **dentro** del tubo, sobre eje fijo, con tapas
  prensadas H7/r6. Cambiarlos = sacar el rodillo (4+4 M10) y **prensar**. No es
  una operación de planta.
- **Cambio de banda**: ver B4, más el hecho de que **no hay válvula de purga**
  (A12) para aflojar el tensor.
- **Tensado**: esto sí está resuelto y bien — 5 brazos independientes, presión
  única en el AR20, tabla de presión↔tensión publicada (3 N/mm → 2,976 bar …
  6 N/mm → 5,951 bar). Es lo mejor del diseño. Sólo falta el manómetro (A12).

## B11 · [A VERIFICAR] Interfaz con lo que el cliente ya tiene

- Los pernos M12 de la **UCFL 206 nueva** salen a X = 429,6…506,9 y sus cajas se
  cruzan con el **brazo tensor de la calle 5** y con la **UCFL 205 existente**
  del cliente (que se conserva como contexto en X 504,1…539,8). Con la corrección
  de A4 (J = 117 en vez de 108) los pernos se separan **otros 4,5 mm por lado** y
  se acercan más al brazo. **Hay que comprobarlo con el brazo barrido en toda su
  carrera**, no en la posición dibujada.
- La **tuerca M12 del pivote +X** cae en X 429,6…440,4, y el eje de la calle 5
  está en X = 431,856: la tuerca queda **dentro del plano de la banda 5**.
  Consecuencia directa de B2 (el perno no llega a la tuerca) — se resuelve al
  recolocar el nudo, pero hay que resolverlo.
- La **muesca en el chapón de descarga** y los **8 taladros Ø11 nuevos** ya están
  declarados como modificación al cliente pendiente de su validación estructural.
  Añadir a esa lista los **4 taladros M12 de cada UCFL 206** (a 117, no a 108) y
  los **4 M12 de la UCF 207 (+X)** en el chapón.
- Se reutilizan del cliente **5 poleas tensoras POL-CON-TEN Ø117,9×40** y
  **10 volantes de horquilla Ø100/Ø110×40**. Los volantes están declarados
  *«QUEDA PENDIENTE su eje y su ménsula»* por el propio generador — sin ellos el
  abrazado del tambor cae a 114,8° y el tensor deja de poder tensar. Es trabajo
  en curso de otro agente; lo dejo señalado porque **afecta a la lista de compra**
  (faltan 10 ejes + 10 ménsulas + sus rodamientos).

---

# BLOQUE C · Lo que NO he podido evaluar

1. **Interferencia sólida real.** He trabajado con cajas envolventes (AABB) y
   con la geometría de cada rasgo. No he corrido el CSG
   (`interferencias_brep.py`) sobre esta instantánea porque el fichero se está
   regenerando en paralelo y el resultado caducaría. Los cruces que señalo en
   B11 son **candidatos por caja**, hay que confirmarlos con sólidos.
2. **Acceso de llave, cuantificado.** Intenté medirlo por barrido axial desde
   cada cabeza y el método con AABB da falsos positivos masivos (las cajas de
   tubos y cartelas ocupan volumen hueco). Lo que sí se puede afirmar sin
   medirlo: entre calles quedan **44,2 mm libres** (paso 76,2 − banda 32), y una
   llave de vaso de M12 (e/c 19) necesita ~28 mm de diámetro exterior, así que
   **todo lo que esté bajo el plano de bandas hay que atornillarlo con vaso larga
   y alargadera, y con las guardas quitadas**. La revisión formal de acceso hay
   que hacerla sobre el modelo estable.
3. **Presión de red del cliente.** Sigue siendo hipótesis declarada (6 bar,
   `web_facts` PNEU-003). Toda la cadena de tensión (4 bar → 129,04 N → 4,032
   N/mm) cuelga de ella.
4. **Par y velocidad reales del motorreductor del cliente** — `web_facts` los
   tiene en `pendientes_sin_fuente`. Sin ellos no se puede cerrar A11.
5. **Coeficiente de rozamiento µ = 0,35** del engomado del tambor: es hipótesis,
   depende de la goma que se elija y de la cubierta de la banda (A8). La reserva
   de arrastre ×6,9 es cómoda, así que el riesgo es bajo, pero no está cerrado.
6. **Cálculo estructural del chapón del cliente** con los taladros nuevos: fuera
   de mi alcance y ya declarado como pendiente de validación del cliente.
7. **Piezas del cliente sin identificar** (`CAD_STP_400_0077`, `SCMRT906V*`,
   `LK30-C65-20H7-D30-R`, los dos motores): siguen en
   `web_facts.pendientes_sin_fuente`. No afectan a lo que hay que comprar nuevo,
   salvo el motor (A11).
8. **Detalle de la horquilla del tensor** (eje y ménsula de los 10 volantes) y
   **soportes de los cilindros**: trabajo en curso de otros agentes. No lo he
   auditado a fondo para no chocar con ellos; el hueco en la lista de compra sí
   está señalado (B11).

---

# BORRADOR DE LISTA DE COMPRA

Cantidades contadas **pieza a pieza sobre el JSON** (instantánea de 1020).
Estado: ✅ se puede pedir hoy · ⚠️ falta dato para pedir · ❌ no se puede pedir.

## 1 · SE COMPRA — neumática

| # | Cant. | Referencia | Estado |
|---|---:|---|---|
| 1 | 5 | **SMC CD85N25-80-B** — cilindro ISO 6432 Ø25, carrera 80, doble efecto | ✅ |
| 2 | 5 | **SMC C85C25** — soporte clevis trasero para C85 Ø20/25 | ✅ |
| 3 | 5 | **SMC KJ10D** — rótula de vástago M10×1,25 (**sin** bulón, ver A5) | ✅ |
| 4 | 5 | **SMC AS2201FS-01-06S** — regulador de caudal codo meter-out R1/8 · tubo Ø6 | ✅ |
| 5 | 5 | **SMC AN101-01** — silenciador bronce sinterizado R1/8 | ✅ |
| 6 | 5 | **SMC KQ2L06-01AS** — codo instantáneo macho R1/8 ↔ tubo Ø6 | ✅ |
| 7 | 1 | **SMC AR20-02-B** — regulador de presión R1/4 (ajuste a 4 bar) | ✅ |
| 8 | ~15 m | Tubo PU Ø6×4 | ⚠️ falta metraje real |
| 9 | 1 | **Filtro/regulador SMC AW20-02-B** (o AF20-02 + el AR20) | ❌ falta en el modelo (A12) |
| 10 | 1 | **Manómetro SMC G36-10-01** | ❌ falta en el modelo (A12) |
| 11 | 1 | **Válvula 3/2 de corte y purga manual** (SMC VHS20-02) | ❌ falta en el modelo (A12) |
| 12 | 1 | Colector de 5 salidas Ø6 **o** 4 tes Ø6 (KQ2T06-00) | ❌ falta en el modelo (A12) |
| 13 | 1 | Brida de montaje del AR20 (Y200-tipo) | ❌ falta en el modelo |

## 2 · SE COMPRA — rodamientos y elementos de eje

| # | Cant. | Referencia | Estado |
|---|---:|---|---|
| 14 | 2 | **UCF 207** — unidad de brida cuadrada, eje 35, brida 117, taladros a 92, Ø14 | ⚠️ falta marca (A13) |
| 15 | 2 | **UCFL 206** — brida oval, eje 30, **taladros a 117** (¡no 108!) | ❌ corregir A4 antes de pedir |
| 16 | 8 | **6206-2RS** (30×62×16) — rodillos de retorno RR1…RR4 | ⚠️ falta marca |
| 17 | 2 | **6207-2RS** (35×72×17) — rodillo conducido | ⚠️ falta marca |
| 18 | **10** | **SKF W 6004-2Z** (20×42×12) — **poleas tensoras** | ❌ **HOY NO ESTÁN EN EL MODELO** (B1) |
| 19 | 10 | Casquillo de fricción con brida Ø30/Ø38×25 — igus GFM-3038-25 / SKF PCMF 303425 E | ❌ hoy dice «PENDIENTE» (A13) |
| 20 | 8 | Collar de apriete **partido** Ø30 (Ruland MSP-30-SS o equiv.) | ❌ hoy «DIN 705 A» (A3) |
| 21 | 2 | Collar de apriete **partido** Ø35 (Ruland MSP-35-SS o equiv.) | ❌ ídem |
| 22 | 1 | Collar de apriete **partido** Ø30, ancho 15, Ø ext ≈ 50 (pila de brazos) | ❌ ídem, y cotas contradictorias |
| 23 | 10 | Anillo exterior **ANSI/ASME B27.7M — 3AM1-20** (eje Ø20) | ❌ hoy «DIN 471 / ASME B27.7» (A2) |
| 24 | 10 | Anillo exterior **DIN 471-10×1,0** (bulón de rótula) | ❌ ídem |
| 25 | 10 | Anillo exterior **DIN 471-8×0,8** (bulón trasero) — **o** 10 pasadores ISO 1234, ver A6 | ❌ incompatible con ISO 2341-B |
| 26 | 10 | Anillo exterior **DIN 471-30×1,5** (2 pivote + 8 rodillos de retorno) | ❌ hoy cadena doble |
| 27 | 2 | Anillo exterior **DIN 471-35×1,5** (conducido) | ❌ ídem |
| 28 | 1 | Chaveta **DIN 6885 A 10×8×100** | ✅ |
| 29 | 5 | Bulón **ISO 2341-B 8×44** (+ 10 pasadores ISO 1234 si se va por esa vía) | ⚠️ decidir A6 |

## 3 · SE COMPRA — accionamiento

| # | Cant. | Referencia | Estado |
|---|---:|---|---|
| 30 | 1 | **Motorreductor de eje hueco Ø35 H7**, ≥ 0,55 kW, ≈ 325 rpm de salida, par ≥ 11 N·m, con brazo de reacción | ❌ **NO EXISTE EN EL MODELO** (A11) |
| 31 | 1 | Anclaje / soporte del brazo de reacción | ❌ ídem |
| 32 | 5 | **Banda plana angosta 32 mm × ~4880 mm** de fibra neutra, cubierta de arrastre, empalme a definir | ❌ sin fabricante ni referencia (A8, B4) |

## 4 · SE COMPRA — perfil, guías y tornillería

| # | Cant. | Referencia | Estado |
|---|---:|---|---|
| 33 | 10 | Perfil 40×40 ranura 10 — largueros: 5 × L=572 + 5 × L=249,2 | ⚠️ falta marca/artículo (web PG40-001 es genérico) |
| 34 | 4 | Perfil 40×40 ranura 10 — travesaños: 2 × L=580,8 + 2 × L=423,9 | ⚠️ ídem |
| 35 | 20 | Regleta de deslizamiento UHMW-PE 31,75×18,55 (5×169,2 · 10×200 · 5×99,2) | ❌ sin referencia; el clip no aprieta (A10) |
| 36 | 20 | Escuadra 40×40 **ranura 10** con kit (2 tornillos + 2 tuercas martillo) | ❌ sin referencia; BRKT-001 es ranura 8 (B7) |
| 37 | ≥100 | Tuerca martillo M8 ranura 10 | ❌ **no existe como pieza** (A9) |
| 38 | 20 | Tornillo M6 avellanado + 20 tuercas martillo (topes de guía) | ❌ **no existen como pieza** (A9) |
| 39 | 25 | ISO 4017 M8×12 8.8 zn | ❌ designación (A1) |
| 40 | 39 | ISO 4017 M8×16 8.8 zn — **menos los 3 huérfanos de B9 → 36** | ❌ designación + B9 |
| 41 | 28 | ISO 4017 M8×20 8.8 zn — **menos 12+4 huérfanos de B9 → 12** | ❌ designación + B9 |
| 42 | 17 | ISO 4017 M8×25 8.8 zn | ❌ designación |
| 43 | 3 | ISO 4017 M8×35 8.8 zn | ❌ designación |
| 44 | 32 | ISO 4017 **M10×35** 8.8 (hoy M10×25 sin longitud en el nombre, y sin tuerca) | ❌ A9 + B8 |
| 45 | 8 | ISO 4017 **M10×50** (hoy M10×45, sin hilos de salida) | ❌ B3 |
| 46 | 8 | ISO 4017 **M12×35** conducido (hoy M12×25 sin longitud, sin tuerca) | ❌ A9 + B8 |
| 47 | 4 | ISO 4017 **M12×40** UCF 207 (hoy M12×34) | ❌ B3 |
| 48 | 4 | ISO 4017 **M12×70** UCF 207 (hoy M12×62) | ❌ B3 |
| 49 | 4 | ISO 4017 **M12×60–75** UCFL pivote (hoy M12×45, no llega) | ❌ B2 |
| 50 | 5 | ASME B18.2.1 **3/8-16 UNC × 1"** grado 5 zn (alargue↔side channel) | ❌ designación (A1) |
| 51 | 5+8+12+4 | Tuercas: 3/8-16 UNC (5), ISO 4032 M10 (8), M12 (12), M8 (4) | ❌ designación; y faltan las 40 de B8 |
| 52 | ~200 | Arandelas ISO 7089 M6/M8/M10/M12 + 3/8" | ❌ sólo hay 9 en el modelo (A9) |

**Lo que sobra y hay que quitar de la lista:** 3 M8×16 «lengüeta», 12 M8×20
«ménsula↔bastidor», 4 M8×20 «placa escote», 4 pernos 3/8 + 4 tuercas + 4
golillas «cuelgue NBT90», 2 insertos UC207 sueltos. **Total 33 líneas de
ferretería a borrar** (B9, A7).

## 5 · SE FABRICA (necesita plano, no referencia)

| Cant. | Pieza | Material |
|---:|---|---|
| 1 | Eje del tambor Ø35 × 710, dos asientos k6, chavetero DIN 6885, saliente Ø35 k6 de 117 | C45 / F-1140 |
| 1 | Eje pivote común Ø30 × 580,84 h7 rectificado + gargantas DIN 471-30 | C45 |
| 5 | Eje de polea tensora Ø20 × 70 + gargantas 3AM1-20 | C45 |
| 5 | Bulón del lóbulo Ø10 × 64 + gargantas DIN 471-10 | acero |
| 4 | Separador Ø38 × 12,2 (pila del pivote) | acero |
| 10 | Brazo tensor e=8 | A36 / S275JR |
| 5 | Cubo del brazo Ø50 × 58 | acero |
| 5 | Ménsula de bisagra — lengüeta e=8 | A36 |
| 1 | Tambor motriz: tubo Ø88,9×3,2 L=380 + 2 tapas soldadas Ø82,5/Ø35 e=12 + **engomado 10 mm → Ø108,9 × 370** (¿abombado? ver B5) | acero + goma vulcanizada |
| 1 | Conducido: tubo Ø108×3,6 L=360 + 2 tapas-soporte Ø100,8/Ø72 × 29 (prensado H7/r6) + 2 casquillos Ø47/Ø35×8 + eje fijo Ø35×435 + 2 pletinas 117×117×12 | acero |
| 4 | Rodillo de retorno: tubo Ø88,9×3,2 L=360 + 2 tapas-soporte Ø82,5/Ø62×28 + 2 casquillos Ø42/Ø30×8 + eje fijo Ø30×435 + 2 pletinas 100×100×12 | acero |
| 2+2+2+2 | Alargue lateral: almas e=8 (L=1410 −X; 549 y 327 +X), 4 cabezales de rodamiento, 4 cubrejuntas, 2 tramos de lap e=5,9, 2 cubrejuntas de lap | A36 / S275JR |
| 2 | Cartela de rodillos de retorno RR1+RR2 y RR3+RR4 (−X), e=8 | A36 |
| 4 | Ménsula alma↔travesaño | A36 |
| 4 | Escuadra travesaño↔bastidor 3/16" | A36 |
| 2 | Placa de extremo del travesaño frontal 8×80×65 | A36 |
| 1 | Travesaño frontal del tensor 40×40×3 (L=423,92) | acero |
| 1 | Pletina soporte del regulador AR20 8×90×120 | A36 |
| 5 | Puente de calle — pletina 30×28×648 | A36 |
| 5 | Puente de calle — regleta UHMW 30×8,55×648 | UHMW-PE |
| 10 | Placa base de puente 64×28×6 | A36 |
| 2 | Base de guía norte/sur 3/16" (canto del chapón) | A36 |
| 4 | Guardas de pozo 14 GA: sur 552×383 · norte 552×55 · lateral −X 869,9×305 · lateral +X 869,9×82,7 (con 2 escotes) | chapa 14 GA |
| 2 | Guía de descarga norte/sur 12 GA 70,4×52 | chapa 12 GA |
| 20 | **Escuadra larguero↔travesaño** — o de catálogo, ver B7 | A36 e=6 |

## 6 · SE REUTILIZA del sorter actual del cliente

| Cant. | Pieza | Comprobación pendiente |
|---:|---|---|
| 5 | Polea tensora **POL-CON-TEN** Ø117,9×40 | barreno Ø20 y estado de la pista — **hoy sin rodamiento** (B1) |
| 5 | Volante de horquilla **guia_entrada_liso** Ø100/Ø110×40 | **falta su eje y su ménsula** (B11) |
| 5 | Volante de horquilla **guia_salida_liso** Ø100/Ø110×40 | ídem |
| 1 | Chumacera **UCFL 205** del extremo +X del eje pivote | convive con la UCFL 206 nueva — comprobar choque (B11) |
| — | Bastidor / chapones **FRAME_MIR_MIR_MIR** y bancada LAT TOP / FRONT TOP2 | **modificaciones declaradas**: muesca + 8 taladros Ø11 + taladros M12 de las chumaceras y de la UCF 207 |
| 1 | Cilindro **C85C25** y su kit (el STEP trae uno; se replica a 5) | 4 unidades son compra nueva |
| — | Cierres de guía, drive kit e IDLER-ENS del cliente | orden expresa de conservar |
| 1 | **Motorreductor principal 314759014** | **NO sirve para el tambor nuevo**: está en −X y tiene eje macizo Ø28 (A11) |

---

## Cierre — las tres respuestas del encargo

**Lo que no se puede comprar.** 265 piezas de tornillería llevan dos normas
incompatibles a la vez (A1); 42 anillos métricos van designados con la norma de
pulgadas (A2); 11 collares piden ser partidos con la norma de los macizos (A3);
la chumacera del pivote está acotada a 108 cuando el catálogo dice 117 (A4); la
rótula del vástago cita la norma de las horquillas y se le compra dos veces el
bulón (A5); el bulón trasero mezcla ISO 2341-B con DIN 471 (A6). Y hay tres cosas
que directamente **no existen en la lista**: la banda (A8), el motorreductor
(A11) y medio circuito neumático (A12). Sin resolver eso no se emite un pedido.

**Lo que no se puede montar.** Las 5 poleas tensoras se quedaron **sin
rodamiento** por una expresión de filtrado demasiado ancha (B1). Los 4 pernos de
las chumaceras del pivote **no llegan a su tuerca por 24,8 mm** (B2), y otros 16
acaban a ras del último hilo (B3). Las bandas son un **lazo cerrado sin puerta**
(B4). 40 pernos roscan 8 mm en chapa de 8 sin tuerca (B8). Y hay **31 piezas de
ferretería huérfanas o duplicadas** de un módulo desactivado, 3 de ellas
literalmente flotando en el aire (B9) — el mismo defecto que ya se corrigió una
vez en este proyecto y que aquí volvió a colarse.

**Lo que me quedó sin evaluar.** La interferencia sólida real, el acceso de
llave cuantificado, la presión de red, el par del motor del cliente, el µ del
engomado, y el detalle en curso de la horquilla del tensor y los soportes de los
cilindros. Está todo en el BLOQUE C con el motivo.
