# Revisión de taller — pieza a pieza del `sorter_co_adaptado`

**Quién revisa y con qué lente.** Ingeniería de fabricación. La pregunta única de
este documento es: *si mando esto al taller mañana, ¿lo pueden hacer?* No se juzga
si la máquina funciona, ni si las holguras cierran: eso lo miran otras revisiones.
Aquí sólo importa si cada pieza tiene material, espesor, desarrollo, tolerancia,
cordón, y si su geometría es cortable, plegable, mecanizable y montable.

**Sobre qué se revisó.** Snapshot del JSON emitido, congelado a mitad de revisión
porque el modelo se está regenerando mientras tanto:

| | |
|---|---|
| Fichero | `cad/ensambles/sorter_co/sorter_co_adaptado.json` |
| Sello | 2026-08-03 22:00:50 UTC · md5 `6592de4141125970640a1fc82be9ce84` |
| Piezas | **1020** (284 del NBT90 embebido · 161 contexto del cliente · 365 compradas · **210 a fabricar**) |
| Módulos leídos | `adapt/mod_calles · mod_guardas · mod_pg40 · mod_tambores · mod_tensor2 · mod_percha · params_*` |
| Estándar de contraste | `../nbt90/tolerancias.mjs` y `../nbt90/normalizado.mjs` |

> **Aviso de concurrencia.** Durante la revisión el ensamble pasó de 957 a 1020
> piezas: otro agente está reescribiendo `mod_tensor2.mjs` / `params_tensor2.mjs`.
> Los hallazgos de los módulos **guardas, pg40, tambores, calles y percha** están
> tomados sobre código estable. Los marcados **⟳** viven en el tensor y pueden
> haber cambiado ya; están comprobados contra el snapshot y hay que re-verificarlos.
>
> Al cerrar el documento se regeneró el ensamble (`node ensambles/sorter_co/gen_sorter_co.mjs`
> → **OK, 1020 piezas**) y se comparó pieza a pieza contra el snapshot: **17 piezas
> habían cambiado**, todas del tensor (placas de extremo de 8×80×**80** a 8×80×**65**,
> renombrado de sus pernos, y reubicación del AR20 y de las líneas de aire).
> **A5 se ha re-verificado contra esa versión y sigue exactamente igual**: los
> taladros no se han movido. El resto de hallazgos ⟳ no está entre las 17.

**Nada de este documento toca geometría.** Todo son hallazgos escritos con su
número y su corrección propuesta, para que los aplique quien tenga la pieza.

---

## Resumen de lo que impide fabricar

| # | Pieza | Uds | Qué pasa |
|---|---|---|---|
| **A1** | `PG40 · Escuadra larguero↔travesaño` | 20 | Las dos alas no se tocan: 8 mm de aire entre ellas. No es una pieza |
| **A2** | Gargantas DIN 471 de todos los ejes | 12 | Ancho de garganta 1.4 contra anillo de 1.5/1.75. El anillo no entra |
| **A3** | `PG40 · Cubrejunta …` | 6 | Declaran 8 pernos M10 cada uno y no tienen ni un taladro (ni ellos ni sus dos piezas) |
| **A4** | `PG40 · Ménsula alma↔travesaño` | 4 | Pletina plana sin taladros ni cordón, entre dos piezas en planos perpendiculares |
| **A5 ⟳** | `Placa de extremo del travesaño frontal` | 2 | Sus M8 caen fuera de la pieza a la que dicen atornillarse |
| **A6** | Puente de calle + placas base + escuadras de bastidor | 19 | Cuelgan de un travesaño que la bandera `desactivaPercha` borró del ensamble |
| **A7** | `tapa-soporte` prensadas | 10 | Prensado H7/r6 contra el Ø interior **nominal** de tubo comercial |
| **A8** | Guías de descarga y bases de guía | 4 (6 taladros) | 1.5 mm de material entre el taladro Ø9 y el borde |
| **A9** | `Escuadra travesaño↔bastidor 3/16"` | 4 | El desarrollo declara ala de 50 y el sólido dibuja 30 |

**Total de piezas que hoy no se pueden mandar al taller: 81 de 210.**

---

# 1 · NO FABRICABLE

## A1 — `PG40 · Escuadra larguero↔travesaño` (20 uds) · las dos alas no se tocan

**Qué pasa.** La escuadra son dos cajas independientes que nunca se cruzan. Con la
del cuadro (calle 1, Y −555), en coordenadas de ensamble:

```
Ala al larguero  6×30×32   →  X[147.06, 153.06]  Y[−593.00, −563.00]  Z[  4.00,  36.00]
Ala al travesaño 30×6×32   →  X[147.06, 177.06]  Y[−581.00, −575.00]  Z[−36.00,  −4.00]
                                                              hueco en Z:  −4.00 … +4.00
```

**El número: 8.00 mm de separación en Z.** Solapan en X y en Y, pero en Z hay
aire. El sólido resultante son dos pletinas sueltas, no una escuadra. El origen
está en `mod_pg40.mjs:176-177`: un ala arranca en `Z.travTop + 4` y la otra en
`Z.travBot + 4`, y como el perfil mide 40 de canto, `travTop = travBot + 40` deja
justo esos 8 mm sin cubrir.

**Segundo defecto en la misma pieza.** La nota dice *«tuercas martillo M8 ranura
10: 2 en la ranura +X del larguero y 2 en la ranura −Y del travesaño»* — **son 4
M8 por escuadra, 80 en total, y no hay ni un taladro modelado.**

**Qué habría que cambiar.**
1. Alargar el ala del larguero hacia abajo hasta `Z.travBot + 4` (largo 76 en vez
   de 32) o subir la del travesaño hasta `Z.travTop + 4`, de forma que compartan
   al menos el canto del perfil. La solución limpia es un ala de 76 y otra de 32
   con el rincón en `Z.travTop`.
2. Añadir 2 Ø9 por ala, a 15 del rincón y a 15 entre ellos, con distancia al
   canto ≥ 12 (ala de 30 de ancho → centrados).
3. Declarar espesor y material (hoy no tiene ninguno de los dos; por la sección
   6×30 se deduce pletina de 6, pero deducirlo no es especificarlo).
4. Declarar si es plegada o soldada. Si es plegada de 6 mm, con radio interior
   6 el ala mínima con matriz normal es ≈ 34 mm: **el ala de 30 no llega**, hay
   que subirla a 35 o hacerla soldada de dos pletinas con su cordón.

---

## A2 — Gargantas de anillo elástico fuera de norma · 12 gargantas en 6 ejes

**Qué pasa.** Ninguna de las 12 gargantas de anillo elástico modeladas cumple
DIN 471. La norma pide, para el eje nominal `d`:

| d | fondo de garganta d₃ | ancho m | espesor del anillo s |
|---|---|---|---|
| 30 | 28,6 h11 | **1,60** ⁺⁰·¹⁴ | 1,50 |
| 35 | 33,0 h11 | **1,85** ⁺⁰·¹⁴ | 1,75 |

Lo que dibuja el modelo:

| Pieza | Uds | Garganta modelada | Debería ser | Error |
|---|---|---|---|---|
| `FIJO · Eje pivote común Ø30×580.84` | 1 (2 gargantas) | **Ø27,5 × 1,50** | Ø28,6 × 1,60 | fondo **1,10 mm de más** en Ø · ancho **0,10 de menos** |
| `RETORNO RR1…RR4 · eje FIJO Ø30 × 435` | 4 (8 gargantas) | **Ø28,6 × 1,40** | Ø28,6 × 1,60 | ancho **0,20 de menos** |
| `CONDUCIDO Ø108 · eje FIJO Ø35 × 435` | 1 (2 gargantas) | **Ø33,6 × 1,40** | Ø33,0 × 1,85 | fondo **0,60 de menos** en Ø · ancho **0,45 de menos** |

**Consecuencia de taller: el anillo no entra.** Un DIN 471-30 tiene 1,50 mm de
espesor y no cabe en una garganta de 1,40. Un DIN 471-35 tiene 1,75 y menos aún.
Y en el eje pivote, además de que el ancho justo de 1,50 no deja el juego de
montaje, la garganta está 0,55 mm por lado demasiado profunda: el anillo trabaja
descentrado y pierde el apoyo de norma.

Los números salen de `mod_tambores.mjs:174` (`Ø = d − 1.4`, ancho fijo 1.4) y de
`mod_tensor2.mjs:95-96` (`dia: PIV.d − 2.5`, `h: 1.5`). Son fórmulas inventadas,
no la tabla.

**Qué habría que cambiar.** Tabular DIN 471 (d₃ y m por diámetro nominal) y
generar la garganta de esa tabla, como el NBT90 ya hace con el 5100-062 en
`normalizado.mjs` (donde además se declara la discrepancia cuando la geometría
no se puede tocar). Mínimo aceptable: `Ø28,6 ₋₀,₂₁ × 1,60 ⁺⁰·¹⁴` en los Ø30 y
`Ø33,0 ₋₀,₂₅ × 1,85 ⁺⁰·¹⁴` en el Ø35. Si el generador de geometría no se puede
editar, hay que **declarar la discrepancia en la pieza** y acotar la garganta
correcta en el plano.

---

## A3 — `PG40 · Cubrejunta …` (6 uds) · la unión declarada no existe en ninguna de las tres piezas

**Qué pasa.** Los cubrejuntas son el empalme entre el alma del alargue y los
cabezales de rodamiento — es decir, **por ahí pasa toda la reacción del tambor
motriz y del conducido hasta el bastidor**. Los cuatro de cabezal llevan la nota
*«4 pernos M10 al alma y 4 al cabezal»*, y:

| Pieza | Taladros modelados |
|---|---|
| `Cubrejunta alma↔cabezal motriz −X` (270×35×8) | **0** |
| `Cubrejunta alma↔cabezal conducido −X` (130×35×8) | **0** |
| `Cubrejunta alma↔cabezal motriz +X` (270×35×8) | **0** |
| `Cubrejunta alma↔cabezal conducido +X` (130×35×8) | **0** |
| `Cubrejunta alma↔lap +X` (96×100×8 y 76×100×8) | **0** (y sin nota de fijación) |
| `Alargue lateral · alma −X` | 3 × Ø11,125 (sólo las colisas del side channel) |
| `Alargue lateral · cabezal motriz −X` | 4 × Ø13,5 (UCF 207) + Ø45 de paso |

**El número: 32 pernos M10 declarados, 0 taladros en las tres piezas de la junta.**

Además, un cubrejunta de 270×35 no admite 8 pernos M10: con Ø11 y distancia al
canto mínima de 1,2·d₀ = 13,2 mm, en 35 mm de ancho sólo cabe **una fila**, y
8 pernos en una fila sobre 270 mm dan 38,5 de paso — por debajo del 2,2·d₀ = 24,2
está bien, pero la junta trabaja a flexión con un solo alineamiento de pernos y
no cose nada.

**Qué habría que cambiar.**
1. Subir el canto del cubrejunta de 35 a **80 mm** como mínimo, para poder poner
   dos filas de pernos (2 × 2 por lado, cuadro 40 × 50) y que la junta trabaje.
   Comprobar antes que los 80 caben bajo el plano de transporte: hoy el
   cubrejunta ocupa Z [−110, −75] y hay sitio hasta Z −70 arriba y hasta el techo
   del canal del cilindro del NBT90 (Z −225,03) abajo.
2. Taladrar Ø11 el cubrejunta **y** las zonas correspondientes del alma y del
   cabezal, con distancia al canto ≥ 15.
3. Los dos `Cubrejunta alma↔lap +X` no declaran ni cómo se fijan. Hay que decirlo:
   el lap es de 5,9/6 y el cubrejunta de 8, y ahí la unión pasa por el hueco de
   5,951 del chapón — ver si cabe la cabeza del perno o hay que ir a avellanado.

---

## A4 — `PG40 · Ménsula alma↔travesaño` (4 uds) · pletina plana entre dos planos perpendiculares

**Qué pasa.** La ménsula es *«el amarre del bastidor a los canales laterales del
NBT90»* según su propia nota. Es una **pletina plana** 24 × 30 × 8, dibujada en
el mismo plano que el alma del alargue (normal X), sin ningún taladro y sin
cordón declarado.

El travesaño PG40 al que sube es un perfil 40×40 que corre en X, con sus ranuras
en las caras ±Y y ±Z. **Una pletina contenida en un plano YZ no se puede
atornillar a una ranura que mira a ±Y ni a ±Z**: haría falta un ala doblada o
soldada, perpendicular a la actual.

**El número: 0 taladros, 0 cordones, 4 piezas, y la unión que amarra el bastidor
PG40 al NBT90.**

**Qué habría que cambiar.** Convertirla en escuadra: mantener el ala de 24 × 30
contra el alma (con 2 Ø11 para M10) y añadir un ala perpendicular de 30 × 40
contra la cara −Z o −Y del travesaño (con 2 Ø9 para las tuercas martillo M8 de la
ranura 10). Declarar material (A36/S275JR e=8), y si va plegada, el radio y el
desarrollo — con 8 mm de espesor el ala mínima plegable ronda los 45 mm, así que
lo más probable es que tenga que ser **soldada** y llevar su cordón.

---

## A5 ⟳ — `FIJO · Placa de extremo del travesaño frontal` (2 uds) · los pernos caen al aire

**Qué pasa.** La placa suelda al travesaño frontal del tensor —el que recibe las
5 bisagras de los cilindros— y su nota dice que atornilla *«con 2 M8 al cabezal
de rodamiento del alargue PG40»*. Comprobado en coordenadas de ensamble (y
**re-comprobado sobre la regeneración de cierre**, en la que la placa ha pasado a
8×80×65 pero **los dos taladros siguen en la misma coordenada**):

| | Taladro 1 | Taladro 2 | Cabezal al que va |
|---|---|---|---|
| Placa (−X) | (66,49 · **50** · −85) | (66,49 · **106** · −85) | plancha X 59,494…67,494 · **Y [−125, 90]** · Z [−120, 70] |
| Placa (+X) | (**482,42** · 50 · −85) | (**482,42** · 106 · −85) | plancha **X 491,418…499,418** · Y [−125, 90] |

**Los números.**
- El taladro de Y = **106** cae **16 mm fuera** del cabezal, que acaba en Y = 90.
  Detrás de ese perno no hay chapa.
- En +X, los dos taladros están en X = 482,42 y la cara del cabezal en X =
  491,418: **8,998 mm de aire**. El perno no llega a la pieza.
- El cabezal **no tiene ningún taladro Ø9**: sólo los 4 × Ø13,5 del UCF 207 y el
  paso de eje Ø45.

**Consecuencia.** El travesaño frontal del tensor —que soporta 700,95 N de tiro de
los 5 cilindros según su propia nota— no está sujeto por ningún extremo. La nota
de la pieza ya lo reconoce (*«INTERFAZ CON EL AGENTE DE PG40: 2 taladros Ø9 por
cabezal, en Y 50 y 106, Z −85»*): es una petición abierta, no una interfaz cerrada.

**Qué habría que cambiar.** Cerrar la interfaz en los dos sentidos: bajar los dos
taladros a Y = 50 y Y = 78 (o donde quepan dentro de Y [−125, 90]), poner la placa
+X en X = 491,418 en vez de 482,42, y **taladrar los 4 Ø9 en los dos cabezales**.
Mientras eso no exista en las dos piezas, la traviesa no se puede montar.

---

## A6 — Puente de calle, placas base y escuadras de bastidor (19 uds) · cuelgan de una pieza que no está

**Qué pasa.** La bandera `params_pg40.FLAGS.desactivaPercha` retira la percha del
ensamble con el filtro de `gen_sorter_co.mjs:111`. Ese filtro se lleva el
`FIJO · Travesaño percha 40×80` (**verificado: 0 unidades en el ensamble**), pero
**no** se lleva lo que se apoyaba encima, porque los nombres no casan con el regex:

| Pieza que sobrevive | Uds | Se apoya en |
|---|---|---|
| `FIJO · Placa base de puente 64×28×6` | 10 | cara superior del travesaño percha, Z 9,15 |
| `FIJO · Puente de calle — pletina 30×28×648 A36` | 5 | sobre esas placas |
| `FIJO · Puente de calle — regleta UHMW 30×8.55×648` | 5 | sobre esa pletina |
| `FIJO · Escuadra travesaño↔bastidor 3/16"` | 4 | travesaño percha ↔ chapón |
| `Perno hex M8×16 puente` | 20 | tuercas T del travesaño percha |
| `Perno hex M8×16 travesaño` | 8 | ídem |
| `Perno hex M8×20 travesaño↔bastidor` | 8 | ídem |
| `Perno hex M8×20 placa escote↔chapón` | 4 | una `Placa de escote` que el filtro sí borró |

**Los números.** Las 10 placas base están en Y = −1280 y Y = −692, con su cara
inferior en **Z = 9,15** (`PERCHA.travTopZ`). Los travesaños PG40 que sí existen
están en Y = −100, −555, −1440 y −1520. **Ninguno pasa por −1280 ni por −692, y
ninguno corona en Z 9,15.** No hay nada bajo esas placas.

**Consecuencia.** El puente de calle es la pieza que lleva la banda por encima del
módulo de transferencia — la sección crítica que tiene que pasar por la ventana de
31,75 y por los huecos de 42 de las placas peine. Hoy está en el aire, y con él
las 5 regletas UHMW y las 4 escuadras. Son **19 piezas fabricadas + 40 tornillos
huérfanos**.

**Qué habría que cambiar.** Decidir de qué cuelga el puente ahora que no hay
percha, y publicar esa cota. Dos caminos:
- llevar los apoyos del puente a los travesaños PG40 que sí existen (Y −555 y
  −1440), lo que cambia el vano libre del puente de 588 a 885 mm y obliga a
  recalcular su flecha; o
- devolver un travesaño propio en Y −1280 / −692 dentro del módulo PG40, con su
  cota de coronación.

Mientras tanto: **ampliar el filtro de `gen_sorter_co.mjs:111`** para que se
lleve también `Placa base de puente`, `Escuadra travesaño↔bastidor` y los cuatro
pernos `placa escote↔chapón`, o el ensamble seguirá emitiendo piezas sin destino.

---

## A7 — `tapa-soporte …` prensadas (10 uds) · H7/r6 contra el Ø interior nominal de un tubo comercial

**Qué pasa.** Las diez tapas-soporte de los rodillos declaran, en su campo
`ajuste`, `prensado H7/r6 en el tubo Ø82.5` (8 uds, retorno) y `… Ø100.8` (2 uds,
conducido). Esos diámetros no son cotas mecanizadas: salen de
`params_tambores.mjs:97, 208, 262` como `id = od − 2·e` — el **interior nominal de
catálogo** de un tubo `Ø88,9 × 3,2` y `Ø108 × 3,6`, EN 10220 / ASTM A513.

**Los números.** EN 10220 admite ±1 % en el Ø exterior y ±10 % en la pared. Sobre
el Ø88,9 × 3,2 eso son ±0,89 en el exterior y ±0,32 en la pared, o sea un
**interior real entre 81,25 y 83,75 mm: ±1,25 mm**. El campo de tolerancia de un
H7 en ese diámetro es de **0,035 mm**. La incertidumbre del tubo es **35 veces**
el ajuste que se pide.

**Consecuencia de taller.** Tal como está, el ajuste no se puede cumplir: unas
tapas entrarán sueltas y otras no entrarán. Y si el tubo se toma tal cual, el
prensado r6 sobre una pared de 3,2 mm mete una tensión de aro del orden de
185 MPa (interferencia máxima 0,073 mm sobre Ø82,5 → ε = 8,8·10⁻⁴ → σ ≈ 186 MPa
en S275) y deforma el exterior justo donde rueda la banda.

**Qué habría que cambiar.** Declarar en la pieza, y en el plano del rodillo, que
**el tubo se mandrina** a `Ø82,5 H7` (y `Ø100,8 H7`) en las dos testas, en la
longitud del asiento de la tapa. Añadir la cota y su tolerancia al tubo, que hoy
sólo lleva el material. Alternativa más barata: dejar la tapa en H7/j6 o H7/k6 y
retenerla con un cordón perimetral —lo que exige entonces declarar ese cordón—.
Lo mismo aplica a `TAMBOR · tapa soldada Ø82.5/Ø35 e=12`, que declara `torneado
Ø82,5 h8` contra el mismo interior sin controlar.

---

## A8 — Guías de descarga y bases de guía (4 piezas, 6 taladros) · 1,5 mm de material al borde

**Qué pasa.** El taladro Ø9 para M8 está a 6 mm del canto libre de la chapa.
Origen: `mod_guardas.mjs:265, 288-289` — `hole(…, [r2(x1 − 6), …], 9.0)`.

| Pieza | e | Taladro | Centro al canto | **Material que queda** |
|---|---|---|---|---|
| `Guía de descarga sur 12GA 70.4×52` | 2,66 | Ø9 M8 alma | 6,00 | **1,50 mm** |
| `Guía de descarga norte 12GA 70.4×52` | 2,66 | Ø9 M8 alma | 6,00 | **1,50 mm** |
| `Base de guía sur 3/16"` | 4,76 | Ø9 M8 alma inf | 5,98 | **1,48 mm** |
| `Base de guía sur 3/16"` | 4,76 | Ø9 M8 alma sup | 6,02 | **1,52 mm** |
| `Base de guía norte 3/16"` | 4,76 | Ø9 M8 alma inf | 5,98 | **1,48 mm** |
| `Base de guía norte 3/16"` | 4,76 | Ø9 M8 alma sup | 6,02 | **1,52 mm** |

**Por qué no vale.** El mínimo razonable de una unión atornillada es e₁ ≥ 1,2·d₀
(EN 1993-1-8), o sea **10,8 mm de centro a canto** para Ø11 o **10,8 para Ø9**;
por corte, ≥ 1,5·e de material remanente. Con 1,5 mm de material y una golilla M8
de Ø16 exterior, **la golilla vuela 2 mm fuera de la pieza** y el borde desgarra
al apretar. Estas guías, además, son las que aguantan el empuje lateral del bulto
en el corredor de descarga.

**Qué habría que cambiar.** Mover el taladro a `x1 − 15` (queda 10,5 mm de
material) y comprobar que el otro, hoy en `x1 − 18`, mantiene su separación entre
ejes ≥ 2,2·d₀ = 19,8. Con la guía de 70,4 de largo la pareja cabe holgada en
`x1 − 15` y `x1 − 45`. Hay que moverlo en las cuatro piezas a la vez, porque los
taladros de la guía y los del alma de su base están en la misma coordenada.

---

## A9 — `FIJO · Escuadra travesaño↔bastidor 3/16"` (4 uds) · el desarrollo no es el de la pieza

**Qué pasa.** La pieza declara `chapa.fibra = [[0, −35.85], [0, 9.15], [±50, 9.15]]`
— es decir, un ala de 45 y otra de **50**. El sólido dibuja `Ala vertical
4.763×60×45` y `Ala horizontal 30×60×4.763`, o sea un ala de 45 y otra de **30**.

**El número: 20 mm de diferencia en el ala horizontal.** El taller corta el
desarrollo, no el sólido: saldrían cuatro escuadras 20 mm más largas de lo que el
modelo monta. El origen está en `mod_percha.mjs:194`: el comentario de la línea
180 dice que el ala se bajó de 60 a 30 *«porque la de 60 pisaba la placa base del
puente»*, pero la `fibra` se quedó en 50.

**Qué habría que cambiar.** `fibra: [[0, z1 − 45], [0, z1], [lado < 0 ? 30 : −30, z1]]`.
Comprobado con el propio `desarrollo()` del repositorio (t = 4,763, r = t,
K = 0,44, pliegue de 90°, BA 10,77, retroceso 7,14): el desarrollo pasa de
**91,49 a 71,49 mm** — exactamente los 20 mm de más. (Esta pieza está además
afectada por A6: hoy no tiene a qué atornillarse.)

---

# 2 · FABRICABLE CON RESERVAS

## B1 — Ninguna de las 210 piezas propias lleva tolerancia general

Es el hallazgo transversal más grande, y se mide contra el propio estándar del
repositorio:

| | con `tol` |
|---|---|
| NBT90 embebido | **284 / 284** |
| Sorter CO (piezas propias a fabricar) | **0 / 210** |

`tolerancias.mjs` publica exactamente lo que falta: `claseGeneralDe(nombre, part)`
devuelve **ISO 2768-mK** para chapa, **ISO 2768-fH** para pieza de torno y fresa,
e **ISO 13920-BF** para conjunto soldado, con las tres tablas transcritas. El
sorter no la llama.

**Consecuencia.** El taller no sabe con qué exactitud hacer nada. Un alargue de
1410 mm sin tolerancia se puede entregar con ±5 y sigue siendo «conforme»; con
ISO 13920-B le tocan ±4, y con ISO 2768-m ±2. La diferencia decide si el cuadro
de taladros del UCF 207 coincide o no con el eje.

**Qué habría que cambiar.** Aplicar `claseGeneralDe` a las 210 piezas en
`gen_sorter_co.mjs`, después de construirlas y antes de la compuerta, igual que
hace el NBT90, y añadir una compuerta que falle si queda alguna sin clase.
Reparto esperado por lo que son las piezas: 10 de chapa → 2768-mK; ~55 de torno
(ejes, casquillos, tapas, cubos, separadores, poleas) → 2768-fH; el resto de
pletina cortada por láser → 2768-mK, y los conjuntos soldados → 13920-BF.

## B2 — Ningún conjunto soldado declara cordón, garganta ni proceso

`tolerancias.mjs` trae `cordonDe(part)`, que devuelve tipo de cordón, cateto,
garganta, disposición (discontinuo 25/50), proceso (GMAW ER70S-6 Ø0,9, Ar-CO₂
82/18) y norma (AWS D1.3 o D1.1 según espesor, símbolo ISO 2553). El NBT90 la usa
en 23 piezas. **El sorter la usa en 0.**

Piezas del sorter que dicen en texto que van soldadas y no llevan el campo:

| Pieza | Uds | Lo que dice la nota |
|---|---|---|
| `FIJO · Brazo tensor e=8` ⟳ | 10 | «las dos pletinas van soldadas al cubo» |
| `FIJO · Cubo del brazo Ø50×58` ⟳ | 5 | «soldado a las 2 pletinas del brazo» |
| `FIJO · Placa base de puente 64×28×6` | 10 | «soldada bajo la pletina del puente» |
| `FIJO · Base de guía sur/norte 3/16"` | 2 | «el alma vertical soldada porta la guía» |
| `TAMBOR · tapa soldada Ø82.5/Ø35 e=12` | 2 | «soldada al tubo y al eje» |
| `FIJO · Placa de extremo del travesaño frontal` ⟳ | 2 | «suelda al travesaño» |

**El único dato de soldadura de todo el sorter** está enterrado en el campo
`material` de la tapa del tambor: *«cordón de rincón 4 mm»* al tubo y *«2 cordones
de 5 mm»* al eje. Sin proceso, sin norma, sin símbolo, sin secuencia — y metido en
el campo equivocado.

**¿Se llega con la antorcha?** En el brazo tensor, sí: el cubo Ø50 asoma 25 mm a
cada lado de las pletinas de 8 y el rincón es accesible en toda la vuelta. En la
tapa del tambor, el cordón exterior tubo↔tapa es accesible; el cordón tapa↔eje del
lado interior **no lo es** una vez cerrado el tubo — hay que declarar que se
suelda antes de cerrar, o pasar a un solo cordón exterior por testa.

**Qué habría que cambiar.** Llamar a `cordonDe` en toda pieza con `union`,
`weldment` o nota de soldadura, y añadir la compuerta del NBT90 que exige que
ninguna quede sin cordón. Para la tapa del tambor, además, escribir la secuencia
(soldar → templar tensiones → tornear entre puntos), ver B7.

## B3 — Ningún encaje: los conjuntos soldados no se posicionan solos

`tolerancias.mjs` §3 define el registro `encaje({lengüeta, ranura, gdl…})` y
`juntaATope({posicionamiento, referencia})` precisamente para que un conjunto
soldado se arme sin utillaje propio, y la cadena de cotas (`ranuraPara`,
`largoRanura`) para calcular la holgura en vez de elegirla. **El sorter declara
0 encajes y 0 juntas a tope.**

Dónde duele más:
- **Brazo tensor** ⟳: dos pletinas de 8 soldadas a un cubo Ø50, y de la
  perpendicularidad de ese conjunto sale la alineación de la polea tensora
  Ø117,9 con la banda. Sin lengüeta ni tope, cada uno de los 5 brazos sale
  distinto.
- **Placa base de puente**: soldada bajo una pletina de 30×28×648; nada la sitúa
  en X ni la escuadra.
- **Base de guía 3/16"**: alma soldada sobre placa, sin nada que la centre.

**Qué habría que cambiar.** Al menos declarar `juntaATope` con su
`posicionamiento` y su `referencia` en las 6 familias soldadas; mejor, una
lengüeta/ranura en el brazo tensor (el cubo con dos rebajes planos de 8⁺⁰·⁴⁵ y la
pletina con su muesca), que es el único conjunto donde la geometría del producto
depende del armado.

## B4 — Material y acabado

| | |
|---|---|
| Piezas a fabricar | 210 |
| Con `material` declarado | 44 |
| Con `chapa` (espesor + fibra + radio) | 10 |
| **Sin material ni chapa** | **156** |
| Con `acabado` | **0** |

Entre las 156 sin material hay piezas que llevan carga: los 5 puentes de calle
(el nombre dice «A36» pero el campo está vacío), las 10 placas base, los 5 cubos
del brazo, los 5 ejes de polea, los 5 bulones, el eje pivote Ø30×580,84 (el
material «C45 rectificado h7» sólo aparece dentro del texto de la nota), las 20
escuadras larguero↔travesaño, las 4 ménsulas, los 6 cubrejuntas, las 4 almas y
cabezales del alargue (el material va dentro del **nombre**, no del campo), las
10 tapas-soporte y los 10 casquillos de los rodillos.

**Acabado: cero piezas.** Es un equipo de manutención con acero A36/S275JR
desnudo, con guardas de 14 GA en un pozo. Sin galvanizado o pintura declarados, el
taller entrega en negro y el cliente se encuentra óxido a los tres meses. El NBT90
declara acabado en 175 piezas.

**Qué habría que cambiar.** Rellenar `material` en todas (mover al campo lo que
hoy está en el nombre o en la nota, que es la mitad del trabajo) y declarar
acabado por familia: cincado electrolítico ISO 4042 para tornillería y piezas
pequeñas, pintura o galvanizado en caliente para chapa y estructura, y **sin
recubrimiento** en las zonas a soldar.

## B5 ⟳ — Ajustes de eje sin designación, y agujeros a hueso

El NBT90 declara 13 ajustes ISO 286 con su criterio y su fuente (`AJUSTES`, con la
regla de rodamientos de NTN 7.4). El sorter declara **10** `ajuste` (todos el
mismo texto `prensado H7/r6`) y **6** `ajusteMontaje`, que no es un ajuste sino una
nota para el verificador de interferencias. Casos concretos:

| Pieza | Cota | Contra qué | Qué falta |
|---|---|---|---|
| `Brazo tensor e=8` | Ø50 paso del cubo | cubo Ø50 | interferencia nominal 0. Es un asiento para soldar: pide **Ø50 H11** y un cordón |
| `Brazo tensor e=8` | Ø20 eje de la polea | eje Ø20 | interferencia 0. El eje toma la carga radial del tensor: pide **H8/h7** o taladro de posición como el AJ-11 del NBT90 |
| `Brazo tensor e=8` | Ø10 bulón de la rótula | bulón Ø10 | ídem, **Ø10 H9 / h8** |
| `Cubo del brazo Ø50×58` | Ø38 | 2 casquillos de fricción | «H7» aparece **sólo en el nombre del rasgo**, no en `ajuste` ni en `tol` |
| `Polea tensora Ø117.9×40` | alojamiento Ø42 pasante | 2 × W 6004-2Z | **sin hombro de tope axial y sin tolerancia**. Por el criterio del propio repositorio (carga rotante sobre el aro exterior) le toca **N7**, y los dos rodamientos necesitan un resalte o un separador que los sitúe: hoy corren libres por un barreno pasante de 40 mm |
| `Eje de polea tensora Ø20×70` | Ø20 bajo los aros interiores | W 6004-2Z | carga estacionaria sobre el aro interior → **g6**, como el AJ-02/AJ-05 del NBT90 |
| `Separador Ø38×12.2` | Ø30,5 sobre eje Ø30 | eje pivote | 0,5 de juego diametral sin designar (**H11/h9** cerraría la cadena) |

**Qué habría que cambiar.** Escribir un bloque `AJUSTES` propio del sorter con el
mismo formato del NBT90 (id, dónde, pieza, cota, ajuste, criterio, fuente) y
aplicarlo. El criterio de rodamientos ya está escrito en `tolerancias.mjs` y vale
tal cual: **el aro con carga rotante va apretado.** En el tensor gira la llanta y
el eje está quieto → alojamiento N7 y eje g6, exactamente como AJ-04/AJ-05.

## B6 — `TAMBOR · eje Ø35 × 710` · k6 donde el montaje pide juego

**Qué pasa.** El eje declara `C45 (1045) rectificado h9; asientos de rodamiento
k6`, y en la nota `saliente Ø35 k6 … para reductor de EJE HUECO Ø35 H7`.

Dos problemas distintos:
1. **Los apoyos son UCF 207**, o sea inserto UC207 con **prisioneros**. El
   fabricante de una unidad Y especifica eje **h6 / h7** justamente porque la
   unidad se desliza a mano por el eje y se bloquea con los tornillos. Un k6
   (transición, hasta +0,018 de aprieto) obliga a prensar el UC en obra y hace
   imposible desmontarlo. Además contradice el propio criterio del repositorio,
   que en este montaje da carga rotante sobre el **aro interior** (gira el eje)
   → sí, apriete… pero no con un rodamiento de prisioneros.
2. **El saliente** recibe un reductor de eje hueco H7. Con H7/k6 el juego máximo
   es 0,025 y el aprieto máximo 0,018: se monta a golpes y no se desmonta.
   Un reductor de eje hueco se monta con **H7/h6** o **H7/g6** más chaveta.

**Qué habría que cambiar.** Asientos de UC207 a **Ø35 h6**, saliente a **Ø35 h6**,
y declarar la general del eje como ISO 2768-fH (hoy pone h9, que es una
tolerancia de eje, no una clase general). El chavetero DIN 6885 A 10 × 8 × 100 con
t₁ = 5,0 es correcto para Ø35.

*Nota de clasificación:* este eje sale del ensamble marcado como **comprado**
(`componente: eje_tambor_35`) cuando es una pieza claramente **fabricada** —
Ø35 × 710 de C45 rectificado con chavetero de 100. Así no entra en el reparto de
tolerancias generales ni en la lista de planos. Hay que pasarlo a `fabricada`.

## B7 — `TAMBOR · tapa soldada Ø82.5/Ø35 e=12` · soldar C45 sin procedimiento, y sin secuencia de mecanizado

**Qué pasa.** Dos discos de S275JR de 12 mm se sueldan al tubo **y al eje**, y el
eje es **C45 rectificado**. El C45 tiene un carbono equivalente del orden de
0,45-0,50: **exige precalentamiento (150-250 °C)** y control de enfriamiento, o la
ZAT se agrieta. No hay procedimiento declarado.

Y falta la secuencia: soldar dos discos de 12 a un eje rectificado de Ø35 lo
arquea. El tambor tiene que girar con la banda encima; su excentricidad manda
sobre la deriva de las 5 bandas.

**Qué habría que cambiar.** Declarar en la pieza: (a) WPS con precalentamiento
para el C45, o cambiar el eje a un acero soldable (S355 o C22) si la resistencia
lo permite — está a σ = 27 MPa según la propia verificación, así que sobra
material; (b) **tornear el Ø108,9 engomado y los asientos del eje DESPUÉS de
soldar**, entre puntos, y acotar la excentricidad radial (0,1 mm TIR es lo
habitual en un tambor de banda plana).

## B8 — `PG40 · Alargue lateral · tramo de lap +X` (2 uds) · espesor 5,9 en el nombre

El nombre de la pieza y su geometría dicen **e = 5,9**. No existe pletina comercial
de 5,9. En `params_pg40.mjs:214` está la explicación —`lapE: 5.9 // dis: pletina de
6 nominal, 0.05 de holgura de montaje`— pero **eso no llega a la pieza emitida**:
no hay campo `material`, y el nombre que leerá el taller pone 5,9.

**Qué habría que cambiar.** `material: 'Pletina Acero A36 (S275JR) e=6'` y el
nombre a `e=6`, dejando la holgura de 0,05 donde vive: en el modelo, no en la
cota. Igual que hace el NBT90 con las líneas de vulcanizado, que declara
explícitamente la interpenetración deliberada.

## B9 — Secciones que no se compran

| Pieza | Uds | Sección modelada | Qué hay en el mercado |
|---|---|---|---|
| `Puente de calle — pletina 30×28×648 A36` | 5 | pletina **30 × 28** | EN 10058 salta de 30×25 a 30×30. Hay que **mecanizar 2 mm en 648 mm** o recortar la cadena de alturas |
| `Puente de calle — regleta UHMW 30×8.55×648` | 5 | plancha **8,55** | UHMW en 8 / 10 / 12. Se planea desde 10 |
| `PG40 · Guía UHMW 31.75×…` | 20 | perfil **31,75 × 18,55** con pie de 9,6 × 6,85 | perfil mecanizado, no extruido: hay que decirlo, y el pie de 9,6 × 6,85 recto **no clipa** en la ranura 10 — sólo se desliza desde la testa |

Ninguna impide fabricar, pero las tres suben el precio en silencio: el taller
cotiza «pletina 30×28» como si existiera y luego pasa el suplemento de mecanizado.

**Qué habría que cambiar.** Declarar en cada una el material de partida y la
operación (*«de pletina 30×30 A36, cepillada a 28»*, *«de plancha UHMW-PE 1000 de
10, planeada a 8,55»*), y en las guías, si se quieren de clip, dibujar el pie con
sus barbas o pasarlas a tornillo.

## B10 ⟳ — `FIJO · Ménsula de bisagra — lengüeta e=8` (5 uds) · L de 8 mm con alas demasiado cortas

La nota dice *«pletina A36 en L»*. Las alas son **23 mm** (lengüeta 8×32×23) y
**35 mm** (base 40×10×35). Para plegar 8 mm de A36 hace falta matriz V ≈ 64 mm, y
el ala mínima que la matriz admite ronda **45 mm**. Ninguna de las dos llega.

Además, la base tiene los 2 Ø9 a **8 mm del canto** (3,5 mm de material) — por
debajo de 1,2·d₀ = 10,8, aunque menos grave que A8 porque el espesor es 8.

**Qué habría que cambiar.** Declararla **soldada** (dos pletinas de 8 con cordón
de rincón, garganta 5,6 según `cordonDe`) o subir la base a 45 mm y aceptar el
plegado. Y mover los Ø9 a ±10 del centro (12 mm al canto).

## B11 ⟳ — `FIJO · Travesaño frontal del tensor 40×40×3` · taladros al canto y tubo sin antiaplastamiento

**Los números.** Los 10 taladros Ø9 están en Z = 33 y la cara del tubo llega a
Z = 40: **7,0 mm de centro a canto → 2,5 mm de material**, en una pared de 3 mm.
Mismo problema que A8 pero en un tubo, donde además el borde es la arista del
perfil.

Segundo: los Ø9 son **pasantes por las dos paredes** de un 40×40×3. Apretar un M8
ahí aplasta el tubo (34 mm de luz entre paredes de 3) salvo que se ponga un
casquillo antiaplastamiento. No está declarado, ni en la ménsula ni en el
travesaño.

**Qué habría que cambiar.** Bajar los taladros a Z = 20 (centro de la cara, 20 mm
al canto) y declarar un casquillo Ø16/Ø9 × 34 por perno — el mismo patrón de
casquillo separador que ya usan las guardas de pozo. El perfil 40×40×3 sí es
comercial (EN 10219), eso está bien.

## B12 — `Guarda de pozo lateral +X 14GA` · el escote corta el dobladillo que la nota dice no tocar

La nota afirma: *«El dobladillo superior (X 464,1…479,1) no se toca: pasa por
dentro y hace de puente»*. Comprobado sobre el sólido: el `Escote soporte RR2/RR3
110×32.52` ocupa **Z 55,18 … 87,70** y el `Dobladillo sup 15` está en **Z 80,80 …
82,70**. El escote se lo lleva por delante en los dos sitios.

No impide fabricar (la chapa sigue siendo cortable), pero el pliegue de rigidez
queda partido en tres tramos y la nota del plano dice lo contrario de lo que se
corta. **Corregir la nota o levantar el escote a Z ≤ 79.**

## B13 — Radio de plegado r = t en 3/16" sin declarar la dirección de laminación

Las 10 piezas con `chapa` usan `radio = t`. En 14 GA y 12 GA no hay problema. En
las de **3/16" (4,76 mm) A36 laminado en caliente**, r = t está justo en el límite:
a favor de fibra el borde exterior puede agrietarse. Lo normal es r = 1,5·t
transversal a la laminación.

**Qué habría que cambiar.** O subir a `radio: 7.14` en las de 3/16", o declarar en
el plano *«pliegue transversal a la dirección de laminación»* y dejar r = t. Las
otras ocho quedan como están. El cálculo del desarrollo (`lib.mjs:180`,
K = 0,44 con retroceso sobre la fibra media) es correcto y no hay que tocarlo.

## B14 — Duplicidad: 210 piezas son 70 referencias

Contadas por firma geométrica exacta (mismas formas, mismos parámetros, mismas
posiciones relativas): **178 de las 210 piezas son repeticiones de 38
referencias.** El ensamble emite 210 nombres distintos, así que el taller
cotizaría 210 planos.

Los grupos que más cuestan:

| Referencia real | Uds que hoy tienen nombre propio |
|---|---|
| Escuadra larguero↔travesaño | 20 |
| Placa base de puente 64×28×6 | 10 |
| Volante de horquilla Ø100/Ø110×40 | 10 — **y con dos nombres**: `guia_entrada_liso` y `guia_salida_liso` son **la misma pieza** |
| Brazo tensor e=8 ⟳ | 10 (+X y −X idénticos) |
| Guía UHMW 31,75×200 | 10 |
| Casquillo Ø42/Ø30×8 | 8 (RR1…RR4 × 2) |
| Tapa-soporte Ø82,5/Ø62×28 | 4 + 4 (una por mano) |
| Tubo Ø88,9 × 360 | 4 (RR1…RR4) |
| Eje FIJO Ø30 × 435 | 4 (RR1…RR4) |
| Pletina de soporte 100×100×12 | 8 (RR1…RR4 × 2) |

**Los cuatro rodillos de retorno RR1, RR2, RR3 y RR4 son cuatro copias exactas del
mismo rodillo**: mismo tubo, mismas tapas, mismos casquillos, mismo eje, mismas
pletinas. Hoy salen como 32 piezas con 32 nombres.

**Qué habría que cambiar.** Nombrar por referencia y no por posición: un
`RODILLO DE RETORNO Ø88.9×360 — 4 uds` con sus 6 componentes, en vez de
`RETORNO RR1 · …`, `RETORNO RR2 · …`. Es sólo nomenclatura y ahorra ~140 planos.

## B15 — Piezas del cliente marcadas como fabricadas

39 piezas llevan `fabricada` (o cuentan como tal) y su propia nota dice que son
piezas existentes del cliente reubicadas:

| Pieza | Uds | Lo que dice la nota |
|---|---|---|
| `Volante de horquilla guia_entrada/salida_liso Ø100/Ø110×40` | 10 | «pieza del cliente REUBICADA» |
| `Polea tensora POL-CON-TEN Ø117.9×40` ⟳ | 5 | «la tensora del cliente reutilizada» |
| `Puente de calle — regleta UHMW` | 5 | «la misma interfaz medida que la guía del cliente» |
| `Eje de polea tensora Ø20×70`, `Bulón del lóbulo Ø10×64` ⟳ | 10 | «patrón del eje SCMRT906VCT del cliente» |
| `Banda plana 32 × 0.633` | 5 | «Banda NUEVA» — ésta sí se compra, pero está en la lista de fabricar |

**Qué habría que cambiar.** Separar tres estados: *fabricar*, *comprar* y
**reutilizar del cliente**. Hoy el ensamble sólo tiene los dos primeros, y por eso
el taller vería 10 volantes y 5 poleas a mecanizar que ya están en la máquina. Las
5 bandas planas, además, son producto de catálogo (largo de fibra 4877,64) y deben
ir a compras, no a taller.

---

# 3 · FALTA INFORMACIÓN PARA SABERLO

## C1 — 33 piezas compradas sin norma ni referencia de catálogo

`normalizado.mjs` fija la regla del encargo: *«toda pieza comprada tiene que quedar
identificada con su norma o su referencia de catálogo, no con una descripción»*, y
el NBT90 lo cumple con una compuerta que falla si queda alguna sin designar. En el
sorter quedan **33 sin designar de 365**:

| Pieza | Uds | Qué hace falta |
|---|---|---|
| `PG40 · Tope de guía M6` | 20 | designación completa (¿prisionero ISO 4026? ¿tope de perfil de catálogo?) |
| `Rodamiento UC207` (35×72×42,9) | 2 | designación y fabricante — es el que soporta el tambor motriz |
| `Rodamiento 6207-2RS` (35×72×17) | 2 | ISO 15 / DIN 625-1 y clase |
| `Rodamiento 6206-2RS` (30×62×16) | 8 | ídem |
| `TAMBOR · eje Ø35 × 710` | 1 | **no es comprado**: ver B6 |

## C2 — 11 piezas con norma literal «PENDIENTE»

| Pieza | Uds | Texto actual |
|---|---|---|
| `Casquillo de fricción Ø30/Ø38×25 con brida` ⟳ | 10 | «PENDIENTE — casquillo de fricción con brida Ø30 int × Ø38 ext × 25» |
| `Collar de apriete Ø30` ⟳ | 1 | «PENDIENTE — collar de apriete partido Ø30, tipo DIN 705 A / abrazadera» |

Los casquillos son los que soportan los 5 brazos del tensor a 0,266 MPa. Son
medidas estándar (**iglidur / GLYCODUR F Ø30×34×25 con brida**, o casquillo
sinterizado DIN 1850), así que la designación existe: sólo hay que elegirla y
citarla. Sin ella no se puede cerrar la cadena axial de 76,2 mm que declara el
`Separador Ø38×12.2` (58 de cubo + 2 × 3 de brida + 12,2 = 76,2 EXACTO): **ese
«exacto» depende de que la brida del casquillo mida 3,0 mm**, y ningún catálogo
está citado.

## C3 — Espesor de la bancada `LAT TOP`, donde se roscan 4 M8

La `Guarda de pozo norte 14GA` va sujeta con *«4 M8×16 de frente, ROSCADOS a la
bancada»*. `SORTER_CO.md` §392 da la envolvente de `LAT TOP` (1397,9 mm, Z −433,1
… −113,0) pero **no su espesor de pared**. Para roscar M8 hacen falta ≥ 8 mm de
material (1·d) o una tuerca remachable.

Los otros roscados sí están cubiertos: el chapón de descarga tiene **28 mm de
espesor** (`params_adapt.mjs:29`, `frameEsp: 28.0`, medido en el STEP §5.1), así
que los 3 M8×25 de la guarda lateral −X, los 3 M8×35 de la +X y los 2 M8×20 al
canto entran holgados.

**Qué hace falta.** Medir el espesor de `LAT TOP` en el STEP. Si es chapa fina,
esos 4 M8 pasan a tuerca remachable o a pasante con tuerca.

## C4 ⟳ — Retención axial de los ejes y bulones del tensor

Ninguna de estas piezas tiene modelado nada que la retenga:

| Pieza | Uds | Lo que dice / lo que hay |
|---|---|---|
| `Eje de polea tensora Ø20×70` | 5 | *«se retiene con tornillos de testa»* → **no hay taladro roscado en la testa** |
| `Bulón del lóbulo Ø10×64` | 5 | cilindro liso: sin cabeza, sin garganta, sin taladro de pasador |

`params_tensor2.mjs:320-321` sí declara la intención (`bulonRotula: … anillo:
'DIN 471-10'`), pero el sólido no la lleva.

**Qué hace falta.** Decidir y modelar: rosca M6 × 12 en las dos testas del eje
Ø20 con arandela y tornillo, o gargantas DIN 471-20; y para el bulón Ø10, cabeza
+ garganta DIN 471-10 (con la garganta **de tabla**, ver A2).

## C5 ⟳ — Cómo se fija el regulador AR20 a su pletina

`FIJO · Pletina soporte del regulador de presión AR20 (8×90×120)` lleva 2 Ø9 para
atornillarse al canal del cliente, pero **ningún taladro para el propio AR20**. El
SMC AR20 se monta con escuadra o con tuerca de panel; sin saber cuál, la pletina
no está terminada.

## C6 — Secuencia de mecanizado del tambor y del conducido

Ligado a A7 y B7. Hace falta escribir, en el plano del conjunto: orden de soldado,
si se templan tensiones, y qué se tornea después de soldar (asientos de rodamiento,
Ø exterior engomado, planos de testa) con su excentricidad admisible. Hoy no hay
ninguna indicación de secuencia en ninguna de las 4 piezas del tambor.

---

# 4 · Lo que sí está bien, y conviene no romper

Para que la lista de arriba se lea en su sitio:

- **El cálculo de desarrollos es correcto.** `desarrollo()` de `lib.mjs:180` usa
  factor K = 0,44 con retroceso al punto de tangencia sobre la fibra media, que es
  lo que hay que hacer. Los seis desarrollos publicados (guarda sur 411,59 · norte
  55 · lateral −X 335,98 · lateral +X 113,68 · guías de corredor 53,88) son
  coherentes con sus fibras.
- **Todos los desarrollos caben en formato estándar.** El mayor es
  411,59 × 552 (guarda sur) y el más largo 869,9 × 335,98 (lateral −X): entran de
  sobra en chapa de 1000 × 2000. Ninguna pieza obliga a formato especial.
- **Los radios de plegado son ≥ espesor** en las 10 piezas de chapa, y las
  pestañas mínimas (dobladillos de 15 en 14 GA, labio de 15 en 12 GA, alas de
  30/45 en 3/16") están por encima del mínimo de matriz normal — salvo la ménsula
  de bisagra de 8 mm (B10).
- **Los diámetros de paso de tornillería son los de norma**: Ø9 para M8, Ø11 para
  M10, Ø13,5 para M12, Ø11,125 (7/16") para los 3/8 del NBT90 (que es el AJ-12
  del propio estándar). Ninguno es un diámetro inventado.
- **Los cuadros de taladros de las unidades de rodamiento son los de catálogo**:
  92 × 92 con Ø13,5 para el UCF 207, 76 × 76 con Ø11 para los soportes de retorno.
  Y las distancias al canto en esas piezas son sanas: 22 mm de centro a borde en
  las cartelas de retorno (Ø11 → 16,5 mm de material), 44 y 26,75 en los cabezales.
- **No hay ningún rasgo geométricamente imposible de mecanizar** en el sentido
  clásico: no hay fondos en esquina viva, no hay taladros que salgan por una cara
  curva, no hay ranuras ciegas sin entrada de herramienta ni roscas en pared
  insuficiente en piezas propias (todas las roscas van a piezas del cliente de
  28 mm, salvo el caso pendiente de `LAT TOP`). Los perfiles de tubo y las tapas
  son todos revoluciones limpias.
- **El bloque de tolerancias del NBT90 embebido está intacto**: sus 284 piezas
  siguen llevando su clase, sus 23 cordones y sus 19 encajes. El problema es que
  ese estándar no cruzó la frontera al sorter.

---

# 5 · Orden de trabajo sugerido

1. **A6** primero: hasta que no se sepa de qué cuelga el puente de calle, hay
   19 piezas y 40 tornillos que no se pueden ni acotar.
2. **A1, A3, A4, A5**: cuatro uniones estructurales sin taladros ni geometría de
   contacto. Son 32 piezas y no cuestan geometría nueva, sólo cerrarlas.
3. **A2 y A7**: dos correcciones de tabla (DIN 471) y una nota de mecanizado
   (mandrinado del tubo). Baratas y bloqueantes.
4. **A8 y A9**: mover seis taladros y corregir una fibra.
5. **B1–B4**: aplicar `claseGeneralDe`, `cordonDe` y `designar` del NBT90 a las
   210 piezas propias, con las tres compuertas que ya existen allí. Es el cambio
   que más superficie cubre por menos código.
6. **B14 y B15**: renombrar por referencia y separar *reutilizar del cliente*.
   Sin tocar geometría, quita ~140 planos del presupuesto.

---

*Revisión de fabricación · 210 piezas propias examinadas una a una sobre el
snapshot md5 `6592de41…` de 2026-08-03 22:00:50 UTC. Los puntos marcados **⟳**
pertenecen al módulo del tensor, que estaba siendo reescrito durante la revisión y
hay que re-verificar contra la versión vigente. Ninguna geometría ha sido
modificada por este documento.*
