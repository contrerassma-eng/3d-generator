# Escalado de las vistas — cómo se fijó (y por qué se corrigió)

Las dos vistas de partida (`ref/fig8a_vistas.png`) son la **FIGURE 8A** de la
página 8 del manual *Installation and Maintenance Manual — Model ProSort MRT*
(Hytrol Conveyor Co., bulletin 656). La segunda imagen (`ref/iso_despiece.jpeg`)
es el despiece de la **página 11**, *MRT Pneumatic Take-Up*. El manual trae
además, en la **página 13**, el despiece y la lista de partes del conjunto que
se modela aquí: *MRT 90° Transfer*.

> Procedencia (capa `web`): PDF público del fabricante,
> `https://cdn.hytrol.com/2013_656_mrt.pdf`, consultado el 2026-07-27.
> Los planos del manual llevan aviso de confidencialidad de Hytrol: aquí se usan
> **solo como referencia dimensional y de nomenclatura de componentes
> comprables**; la geometría de este repositorio es un diseño paramétrico propio
> y el PDF no se redistribuye.

## Dos hipótesis de escala

**H1 — desde las cotas dibujadas** (la primera que se probó). Las dos cotas
rotuladas de la lámina miden, por perfil de píxeles:

| Cota | píxeles | mm/px |
|---|---|---|
| 1/4" = 6.35 mm (vista izq., cols 975–1005, y 341→353) | 12.0 | 0.5292 |
| 0.394" = 10 mm (vista der., cols 2130–2160, y 322→341) | 19.0 | 0.5263 |

⇒ **0.5277 mm/px**, con las dos anclas concordando al 0.5 %.

**H2 — desde los componentes de catálogo.** Con H1, *todos* los diámetros
salían entre 15 % y 20 % por debajo de las piezas que la lista de partes de la
página 13 nombra. Reescalando con el **paso de bandas = 3"** (76.2 mm sobre
120.56 px medidos, promedio de 5 pasos consecutivos) resulta

⇒ **k = 0.6320 mm/px**

## Por qué gana H2

Con k = 0.6320 mm/px, ocho magnitudes medidas de forma independiente caen sobre
un valor de catálogo, casi todas con error < 2 %:

| Medida (px) | H1 (mm) | **H2 (mm)** | Pieza de catálogo | Error H2 |
|---|---|---|---|---|
| Ø rodillo de transferencia | 29.16 | **34.92** | `SA-036881` *VULCANIZED **138** ROLLER* = Ø1-3/8" = 34.93 | **0.03 %** |
| Ø rueda motriz de banda plana | 52.88 | **63.33** | `024.15502` *FLAT BELT DRIVE WHEEL 2-1/2"* = 63.5 | 0.3 % |
| Ø cuerpo del motor | 121.1 | **145.0** | SEW `RF07DRS71S4`: carcasa DRS71 ≈ Ø145 | ≈0 % |
| Alto del canal lateral | 139.3 | **166.8** | canal conformado **6-1/2"** = 165.1 | 1.0 % |
| Ala del canal | 31.1 | **37.3** | ala **1-1/2"** = 38.1 | 2.1 % |
| Espesor de chapa | 2.11 | **2.53** | **12 GA** = 2.66 | 4.9 % |
| Ø vástago del jack bolt | 7.1–7.9 | **8.5–9.5** | *"3/8 in. bolts"* (texto pág. 8) = 9.53 | 0.3 % |
| Entrecaras del eje del rodillo | 7.12 | **8.53** | eje hexagonal **5/16"** = 7.94 | 7 % |

Con H1 ninguna de esas ocho coincide. La probabilidad de que ocho piezas
distintas acierten por casualidad su tamaño comercial es despreciable.

## Qué pasa entonces con las dos cotas rotuladas

Bajo H2 medirían 0.30" y 0.47" sobre el papel en vez de 0.25" y 0.394": están
**dibujadas exageradas ≈20 %**, que es la práctica normal de un manual cuando la
cota es un hueco de 6 mm que a escala real sería ilegible. Lo que importa de
ellas es el **texto**, no el trazo, y el texto es dato duro:

- **1/4" = 6.35 mm** — cuánto emergen los rodillos sobre el plano de las bandas.
- **0.394" = 10 mm** — el `MOVEMENT`, la carrera vertical del conjunto.

Ambos se usan tal cual en el modelo. El resto de la geometría se escala con
**k = 0.6320 mm/px**.

## Consecuencia sobre la arquitectura

Con H2 la lectura de las dos vistas cierra con la lista de partes:

- **BR = 18"** (457 mm entre almas de los canales laterales; medido 459.7).
- **6 rodillos** vulcanizados Ø1-3/8" a paso 3", eje hexagonal 5/16", cara 375 mm.
- **5 bandas angostas** del clasificador de 1", intercaladas a media distancia
  entre rodillos (medido: desfase 38.1 mm = 1-1/2" exacto). El ramal portante se
  mide 32.9 mm de ancho (banda de 1" sobre su **regleta de desgaste** UHMW de
  1-1/4") y el de retorno 26.6 mm (la banda sola).
- **Serpentín** de una sola banda `FLEXPROOF ENDLESS BELT - 1 in. WIDE` que
  arrastra los 6 rodillos, alternando por encima de cada rodillo y por debajo de
  las poleas locas Ø2-1/2" intercaladas, con dos poleas de retorno abajo y la
  rueda motriz sobre el eje del motorreductor.
- **Motorreductor** SEW `RF07DRS71S4`, 1/2 HP, 230/460 V, 462 rpm, con **buje sin
  chaveta** 20 mm ID × 45 mm OD (`099.128420`, tipo Trantorque — el manual pide
  apretarlo a 1500 lb·in).
- **Elevación** por *guide table* neumática de Ø100 mm y 20 mm de carrera
  (`923.01022`), con válvula 4 vías monosolenoide 24 VDC y silenciador;
  la altura fina se ajusta con los **4 jack bolts** del canal de montaje del
  cilindro, aflojando los tornillos de 3/8" (procedimiento de la pág. 8).
