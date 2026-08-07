# Sorter CO ← transferencia NBT90: quién se adapta a quién

Decisión del cliente (30-07-2026, capa `user`): **el sorter se adapta a la
transferencia**. La cota que gobierna es el **espacio entre bandas**; el resto
del sorter debe poder moverse. Y una segunda instrucción: el STEP del sorter
contiene una **transferencia incompleta** de un intento anterior — **se elimina**
del modelo integrado, y en su hueco se monta la nuestra.

Este documento congela la especificación que el sorter debe cumplir. Todos los
números salen de `cad/ensambles/nbt90/params.mjs`, donde cada uno lleva su
procedencia (`med`/`cat`/`txt`/`dis`); aquí sólo se recopilan.

## La especificación que manda (fija, no negociable)

| Cota | Valor | De dónde |
|---|---|---|
| Paso entre ejes de rodillos y de bandas | **76.2 mm (3")** | `P.paso` |
| Rodillos | 6 × Ø34.93 (1-3/8") × 375 de cara | `P.nRodillos`, `P.rodDia`, `P.rodCara` |
| Huecos de banda | **5**, uno entre cada par de rodillos | `P.nBandas` |
| Ventana útil por hueco | **31.75 mm** = 76.2 − 34.93 − 2 × 4.76 de holgura | `P.paso`, `P.rodDia`, holgura rodillo↔regleta |
| Ancho de banda portante + regleta en el NBT90 | 25.4 + regleta = 31.75 (1-1/4") | `P.bandaAncho`, `P.regletaAncho` |
| Ancho útil entre almas del bastidor | **BR = 457.2 mm (18")** | `P.BR` |
| Almas del anfitrión | \|Y\| = 229.9, chapa 12 GA | `P.almaY` |
| Plano de transporte | rodillo asoma **+6.35** elevado, **−3.65** retraído | `P.emerge`, `P.carrera` |
| Largo del módulo en X | 463 (campo de rodillos 375) | `P.largo` |
| Carrera del pop-up | 10.0 mm en 83 ms | `P.carrera`, verificaciones |

Consecuencia directa: **la franja de altura que barre el rodillo** va del plano
de banda −38.58 (fondo del rodillo retraído) a +6.35 (cresta elevada). Dentro de
esa franja, y a lo largo de los 463 mm del módulo, cada estación de banda del
sorter tiene que caber en su **ventana de 31.75 mm** — carril, guía y banda
incluidos. Fuera de esa franja y de ese tramo de X, la estación puede ser tan
ancha como quiera.

## Lo que el reconocimiento debe devolver (en curso)

1. A qué paso están hoy las 4 estaciones `Conjunto_T5_hairpin_vertical` y cuánto
   mide su sección en la franja crítica.
2. El ancho útil del bastidor del sorter frente a los 457.2 + 2 × chapa.
3. **4 estaciones contra 5**: la transferencia tiene 5 huecos; con 4 bandas queda
   un hueco sin apoyo y el bulto corto puede hundirse. Números de las dos
   opciones — añadir una quinta estación (son modulares: el STEP trae 4 iguales)
   o repartir 4 dejando el hueco central vacío.
4. **Qué subárboles son la transferencia incompleta** que hay que eliminar, con
   evidencia geométrica. Candidatos por nombre: piezas `SCMRT906V*` (huele a
   «MRT 90 6…»; cuidado: viven dentro de los conjuntos `Tensor`, y el tensor
   neumático del sorter SÍ se conserva y se detalla) y `CAD_STP_400_0077`
   (`_RO3100`, `_RUP500`). La identificación es del reconocimiento, no de esta
   página.
5. El **hueco** que deja la transferencia eliminada: ahí se monta el NBT90.

## Montaje previsto (a validar con las medidas)

El NBT90 hoy cuelga de dos canales de acero con almas a ±229.9 y tornillería de
3/8". El sorter CO está construido con **perfil ranurado** (`TSLOT`,
`T-Sliding Nut M8`, soportes «tipo item» — la lectura de «item24» es el sistema
de perfiles item/item24, coherente con las tuercas T M8 del propio STEP). La
percha de montaje se rediseña a ese sistema: escuadras y tuercas T sobre el
perfil, fabricables, con su designación de catálogo — como pide el cliente para
los soportes de polea.

Nota sobre el rodillo de retorno B-20760 del NBT90: limita los ramales de
retorno de las bandas del anfitrión **de banda plana**. En el sorter CO cada
estación es una horquilla vertical que gestiona su propio retorno dentro del
carril — puede que el rodillo de retorno no aplique. Se decide con las medidas,
no por costumbre.
