# Catálogo de componentes comprables — ensamble `nbt90`

Transferencia de bandas angostas a 90° (*narrow belt pop-up transfer*) para sorter de banda angosta.

- **Capa de datos**: `web` (dato externo con procedencia). Todos los hechos citados aquí tienen URL,
  fecha de acceso y cita textual en `analisis/web_facts.json`.
- **Fecha de acceso de todas las fuentes**: 2026-07-27.
- **Escala de la figura de referencia**: 0.5277 mm/px. La columna `px @0.5277` da el valor de catálogo
  convertido a píxeles de `ref/fig8a_vistas.png` para comparación directa con lo medido.
- **Regla dura aplicada**: si no hay fuente, el dato NO está en las tablas; está en §7 «Pendientes sin fuente».

---

## 1. Identificación del equipo — RESUELTA

**La FIGURE 8A de referencia es la página 8 del manual Hytrol *Bulletin #656, Model ProSort MRT*.**

| Evidencia | Detalle |
|---|---|
| Documento | `https://cdn.hytrol.com/2013_656_mrt.pdf` — «Effective November 2013 (Supercedes October 2007) Bulletin #656 … **Model ProSort MRT**» |
| Coincidencia de rótulos | Los 9 rótulos bilingües de la figura aparecen literales y en el mismo orden en el texto de la pág. 8: `1/4" · TAKE-UP IDLER · DRIVE BELT · CYLINDER MOUNTING CHANNEL · ADJUSTMENT SLOT · DRIVE ROLLER · 0.394"MOVEMENT · (RODILLO TENSOR) (BANDA MOTRIZ) (RODILLO MOTRIZ) (MOVIMIENTO 0.394) (CANAL DE MONTAJE DEL CILINDRO) (ORIFICIO DE AJUSTE) · 1/2 HP GEAR MOTOR 230/460 VOLT · JACK BOLTS (PERNO DE ARGOLLA)` |
| Texto que la referencia | «…Tighten the 3/8" locknut on take-up idler (See **Fig. 8A**)» / «To remove belt the drive rollers must be removed (See **Fig. 8A**)» |
| Modelo comercial | **Hytrol ProSort MRT 90** — «90° Medium Roller Transfer Conveyor». Variante hermana: ProSort MRT 30 (ruedas desviadoras a 30°). |
| Conjunto concreto de la figura | Dibujo de partes **«MRT 90 DEG. ROLLER TRANSFER ASSY.»** (págs. 13–14 del mismo manual) |

**El segundo archivo de referencia (`ref/iso_despiece.jpeg`) NO es la transferencia**: es el dibujo de
partes **«MRT PNEUMATIC TAKE-UP»** (*Dibujo de Partes del Tensionador del Modelo ProSort MRT*, pág. 11).
Verificado globo a globo: 2 = PIVOT TAKE-UP WELDMENT (brazo curvo), 4 = CYLINDER MOUNTING CHANNEL,
11 = IDLER GUARD 18-1/2 in. LONG (las 5 barras planas), 15 = 1.7 in. OD HR TUBE, 17 = FEMALE ROD END 7/16-20,
18 = FLAT BELT IDLER 4 in. DIA (las ruedas radiadas), 20 = AIR CYLINDER 8 in. STROKE × 1-1/2 in. BORE
(los 4 cilindros en fila), 25 = REFLECTOR.

> Consecuencia para el modelado: las ruedas radiadas del despiece son **poleas locas planas de Ø4 in**
> del *tensor*, no las poleas de la transferencia. Las poleas de la transferencia son Ø2-1/2 in (motriz)
> y Ø2-3/4 in (loca) — ver §4.

---

## 2. Cotas de catálogo contra la figura (escala 0.5277 mm/px)

| Cota | Valor catálogo | mm | **px @0.5277** | Fuente |
|---|---|---|---|---|
| Paso entre bandas angostas (tira de desgaste UHMW) | 3 in | 76.20 | **144.4** | Hytrol MRT 90 spec, «UHMW wear strip spaced every 3 in.» |
| Ancho de banda angosta | 15/16 in | 23.81 | **45.1** | Hytrol #656 BOM 069.7265 |
| Ø rodillo motriz de transferencia (con engomado) | 1-1/2 in | 38.10 | **72.2** | «Series of 1 1/2 in. dia. × 17 in. long drive rollers with 3/32 in. lagging» |
| Ø tubo base del rodillo de transferencia | 1-3/8 in | 34.92 | **66.2** | BOM `SA-036881-137 VULCANIZED 138 ROLLER ASSEMBLY` |
| Largo de cara del rodillo de transferencia | 17 in | 431.80 | **818.3** | ídem spec |
| Espesor del engomado (por lado) | 3/32 in | 2.38 | **4.5** | ídem spec |
| Ø rueda motriz de la banda motriz | 2-1/2 in | 63.50 | **120.3** | BOM `024.15502 FLAT 1" BELT DRIVE WHEEL 2-1/2" D × 1.772"` |
| Ancho de esa rueda motriz | 1.772 in (= 45 mm) | 45.00 | **85.3** | ídem (coincide con OD del buje sin chaveta) |
| Ø polea loca de la banda motriz | 2-3/4 in | 69.85 | **132.4** | BOM `923.00975 FLAT BELT IDLER - 2-3/4 in. DIA × 1.4 in. WIDE` |
| Ancho de la banda motriz | 1 in | 25.40 | **48.1** | «Driven by 1 in. wide flexproof endless polyester belt» |
| Ø rodillo galvanizado de extremo | 1.9 in | 48.26 | **91.5** | BOM `B-20760 1.9 in. OD GALV RLR` |
| Ø polea loca plana del tensor | 4 in | 101.60 | **192.5** | BOM `024.156 FLAT BELT IDLER - 4" DIA × 1" W × 3/8" B` |
| Ø polea motriz de extremo del sorter | 8 in | 203.20 | **385.1** | «END DRIVE PULLEY — 8 in. dia.» |
| Ø polea snub / loca de entrada | 4 in | 101.60 | **192.5** | «SNUB PULLEY — 4 in. dia.» |
| **Carrera acotada en FIGURE 8A** | 0.394 in | 10.01 | **19.0** | rótulo `0.394—MOVEMENT (MOVIMIENTO 0.394)` |
| **Cota `1/4"` de FIGURE 8A** | 0.250 in | 6.35 | **12.0** | rótulo `1/4"` |
| Carrera nominal del cilindro pop-up | 20 mm | 20.00 | **37.9** | «100 mm bore × 20 mm stroke guided table cylinder» |
| Ø émbolo del cilindro pop-up | 100 mm | 100.00 | **189.5** | ídem |
| Perfil del bastidor (alto × ala) | 6-1/2 × 1-1/2 in | 165.1 × 38.1 | **312.9 × 72.2** | «6 1/2 in. × 1 1/2 in. × 12 ga. … channel frame» |
| Espesor del bastidor (12 GA) | 0.1046 in | 2.657 | **5.0** | 12 ga. (tabla de calibres, §6) |
| Longitud de la sección de transferencia | 15-1/8 in | 384.17 | **728.0** | dibujo general MRT 90 |
| Alto de la sección (vista de descarga) | 19-3/4 in | 501.65 | **950.6** | dibujo general MRT 90 |
| Eje de la polea motriz | 1-7/16 in | 36.51 | **69.2** | «with 1 7/16 in. dia. shaft at bearings» |
| Eje de polea snub | 1 in | 25.40 | **48.1** | «with 1 in. dia. shaft at bearings» |

### Derivación del paso entre bandas (marcada como INFERENCIA, no citada)

Con la tabla oficial `BR 15/18/21/24/27 in → 4/5/6/7/8 bandas` y paso `p`, el ancho ocupado es `p·(n−1)`.
Para `p = 3 in` el margen a cada baranda resulta constante e igual a 3 in en las cinco filas
(`n = (BR − 6)/3 + 1` reproduce exactamente la tabla). Es decir: **paso 3 in con 3 in de margen a cada lado**.
Coincide con la tira de desgaste UHMW «spaced every 3 in.». Hytrol no publica el paso como cota:
esto es una inferencia consistente, no un hecho citado.

---

## 3. Datos de rendimiento del equipo (verificados)

| Parámetro | Valor | Fuente |
|---|---|---|
| Peso máximo de bulto | 75 lbs (34.0 kg) | Hytrol MRT 90 spec |
| Tamaño de bulto | mín. 8 × 6 in; máx. 28 in de largo | ídem |
| Carga viva máxima | 1200 / 1500 / 1800 / 2100 / 2400 lbs para OAW 18/21/24/27/30 in | ídem |
| Longitud máxima del sorter | 150 ft con un accionamiento | ídem |
| Anchos disponibles | BR 15/18/21/24/27 in — OAW 18/21/24/27/30 in | ídem |
| Nº de bandas | 4 / 5 / 6 / 7 / 8 según ancho | ídem |
| Presión de trabajo del pop-up | 60 PSI (4.14 bar) | «Working pressure 60 PSI» |
| Consumo de aire por ciclo | 0.0556 ft³ libres a 60 PSI (1.574 L) | ídem |
| Peso del módulo de transferencia | 102 / 114 / 126 / 138 / 150 lbs (OAW 18…30 in) | tabla *Conveyor Weights* MRT 90 |
| Peso del transportador | 13.6 … 18.5 lbs/ft (OAW 18…30 in) | ídem |
| Velocidad de transferencia | 275 FPM @60 Hz; 367 FPM @80 Hz — **publicado sólo para MRT 30** | Hytrol MRT 30 spec |
| Tasa de clasificación | hasta 100 sorts/min | Cisco-Eagle (distribuidor) |

---

## 4. Lista de componentes comprables (candidata a lista de materiales)

Referencias `PT-/WA-/SA-/B-` son números de parte **Hytrol** (repuesto original). Las columnas
«equivalente comercial» dan el componente genérico comprable a otros proveedores.

### 4.1 Bandas

| Fn | Nº parte Hytrol | Descripción de catálogo | Cota clave | Equivalente comercial |
|---|---|---|---|---|
| Banda angosta de transporte (MRT 90) | `069.7265` | «Belt - 15/16 in. Wide Aramide Power Transmission Belt» / spec: «Endless ARAMIDE Power Transmission Belt **TF-102T**» | 23.81 mm de ancho, sin fin | Habasit serie **TF** (aramida tangencial): TF-10 Dmín polea 1.0 in, k1% 57 lbs/in; TF-22 Dmín 2.4 in, 126 lbs/in; TF-33 Dmín 3.9 in, 188 lbs/in; −4…149 °F, µ 0.40 |
| Banda angosta (variante MRT 30) | — | «APH 150 HTS × 15/16 in. wide with alligator 125 staple lacing» | 23.81 mm, empalmada con grapa | Habasit **APH150HTS** + grapa Alligator 125 |
| Banda motriz de la transferencia | `069.72215/18/21/24/27` | «FLEXPROOF ENDLESS BELT - 1 in. WIDE» (una long. por BR 15/18/21/24/27 in) | 25.4 mm de ancho, sin fin | Habasit serie **TC** (poliéster, unión Flexproof): TC-20EF Dmín 1.0 in / 57 lbs/in; TC-35ER Dmín **2.0 in** / 103 lbs/in; TC-55ERA Dmín 2.8 in / 143 lbs/in |
| (alternativa de banda redonda) | — | — | — | Habasit **Polycord** TPU 90 Sh A, Ø2–15 mm; Ø6 mm → Dmín polea 2.4 in, tensión periférica nominal 12 lbs; Ø8 mm → Dmín 3.2 in, 21 lbs |

> `Flexproof` es un **método de unión sin fin de Habasit** («Joining F = Flexproof»), no una marca de banda.
> El Dmín de polea de la TC-35ER (2.0 in = 50.8 mm) es compatible con la rueda motriz Ø2-1/2 in y la polea loca Ø2-3/4 in.

### 4.2 Rodillos y poleas

| Fn | Nº parte Hytrol | Descripción de catálogo | Cota clave |
|---|---|---|---|
| Rodillo emergente (pop-up) de la transferencia | `SA-036881-137` | «VULCANIZED 138 ROLLER ASSEMBLY - 17-1/8 in. BR» — spec: «1 1/2 in. dia. × 17 in. long drive rollers with 3/32 in. lagging» | Ø1-3/8 in + 3/32 in de engomado = Ø1-1/2 in; cara 17 in; **qty 7** por módulo (21 in BR) |
| Rodillo galvanizado de extremo del módulo | `B-20760-158` | «1.9" OD GALV RLR - ABEC-1, CBT, 19-3/4" BR» | Ø1.9 in; **qty 2** |
| Rodillo de 1-3/8 in con eje hexagonal (unidad motriz) | `B-25712-004` | «138 GALV RLR - HEX SHAFT, 4-9/32" BR, HD BRG» | eje **hexagonal**, rodamiento heavy-duty |
| Rueda motriz de la banda motriz | `024.15502` | «FLAT 1" BELT DRIVE WHEEL 2-1/2" D × 1.772"» | Ø63.5 mm × 45.0 mm |
| Polea loca de la banda motriz | `923.00975` | «FLAT BELT IDLER - 2-3/4 in. DIA × 1.4 in. WIDE» | Ø69.85 mm × 35.6 mm |
| Polea loca plana del tensor | `024.156` | «FLAT BELT IDLER - 4" DIA × 1" W × 3/8" B» | Ø101.6 mm, barreno 9.53 mm; **qty 12** |
| Polea loca del tensor (variante) | `024.157` | «Flat Belt Idler 4 in. Dia. × 1-1/4 in. Wide × 3/4 in. Bore» | barreno 19.05 mm |
| Polea motriz de extremo del sorter | `SA-038509` | «8 in. DIA DRIVE PULLEY ASSEMBLY … BLUE LAG» | Ø203.2 mm, eje 1-7/16 in, engomada |
| Polea snub / loca de entrada | `WA-025843` | «4 in. DIA PULLEY WELD … FLAT FACE» / spec «4 in. dia. × 1 1/2 in. wide crowned sheave» | Ø101.6 mm |
| Rodillos de retorno | — | «1.9 in. dia. galvanized tube with ABEC bearings. With cardboard tube inserts.» | Ø48.26 mm |

**Eje hexagonal confirmado** para los rodillos de la transferencia:
«Remove by pushing one side of the **hex axle** though the transfer support channel».

#### Equivalentes comprables de rodillo (datos reales de catálogo)

| Ø rodillo | Calibre de tubo | Eje | Rodamiento | Capacidad | Fuente |
|---|---|---|---|---|---|
| **1.9 in** | 7 GA | **7/16 in hex** | ABEC-1, alojamiento plástico | 255 lbs @ 21 in BR | Con-Drives 4310-B09 |
| 1.9 in | 16 GA (pared **0.065 in** = 1.65 mm) | 7/16 in hex | — | — | SWS 0MROL00237 |
| **1-3/8 in** | 18 GA | **5/16 in hex** (puntas TPU) | ABEC-1, alojamiento plástico | 20 lbs @ 21 in BR (rodillo de gravedad) | Con-Drives 2080-B09 |
| 2-1/2 in | 11 GA | 11/16 in hex | no-precision | 630 lbs @ 21 in BR | Con-Drives 5510-A01 |

> ⚠ **Corrección a la hipótesis de partida**: el eje hexagonal de **7/16 in corresponde al Ø1.9 in**;
> para el Ø1-3/8 in (que es el del rodillo emergente de la transferencia) el estándar de catálogo es
> **5/16 in hex**. Hytrol no publica la medida del hexágono de su rodillo (§7).
>
> ⚠ **Calibre de TUBO ≠ calibre de CHAPA**: 16 GA de tubo = 0.065 in; 16 GA de chapa = 0.0598 in.
>
> ⚠ La capacidad de 20 lbs del rodillo de 1-3/8 in es de un rodillo **de gravedad** con rodamiento
> estándar. El de Hytrol es **motriz y lleva `HD BRG`**: no extrapolar ese valor.

**Recubrimiento**: el estándar comercial de camisa de uretano es **1/8 in (3.18 mm), 83 Shore A**
(Rolcon, disponible en Ø1-3/8, 1.9 y 2-1/2 in). Hytrol especifica **3/32 in (2.38 mm)**, que no
aparece como espesor de catálogo en ningún proveedor consultado ⇒ es un recubrimiento a medida.
**Modelar con 3/32 in** (dato del fabricante del equipo).

**«ABEC-1» en catálogo de transportadores**: ABEC-1 es la clase de tolerancia *más holgada* de la
escala ABMA (10 µm de excentricidad radial para barrenos de 1–18 mm). En el sector se usa como
sinónimo de «rodamiento rectificado» frente al no-precision engarzado, **no** como precisión de
máquina-herramienta. Rolcon sitúa sus rodamientos *semi-precision* hasta ~400 rpm y los *precision*
por encima de 400 rpm.

*Nota sobre cantidades*: las `qty` provienen de la columna QTY del cajetín de BOM del dibujo CAD
(texto vectorial con caracteres separados). El parseo se validó contra filas cuya pareja QTY/ITEM
es comprobable (`B-20760-158` → qty 2 / item 22; `094.121508` → qty 4 / item 20; `024.156` → qty 12 /
item 18), todas coherentes con la tabla de referencias del mismo dibujo.

*Nota sobre cantidades*: las `qty` provienen de la columna QTY del cajetín de BOM del dibujo CAD
(texto vectorial con caracteres separados). El parseo se validó contra filas cuya pareja QTY/ITEM
es comprobable (`B-20760-158` → qty 2 / item 22; `094.121508` → qty 4 / item 20; `024.156` → qty 12 /
item 18), todas coherentes con la tabla de referencias del mismo dibujo.

### 4.3 Rodamientos y bujes

| Fn | Nº parte Hytrol | Descripción de catálogo | Cota clave |
|---|---|---|---|
| Chumacera de brida 2 pernos | `010.0021` | «BEARING - CAST IRON, 2-BOLT, 1" BORE» | barreno 25.4 mm |
| Chumacera de brida 4 pernos | `010.203` | «BEARING - CAST IRON, 4-BOLT, 1-7/16" BORE» | barreno 36.51 mm |
| Chumacera de pie base roscada | `010.351` | «BEARING - CAST, PILLOW BLK, TAPPED BASE, 1" BORE» | barreno 25.4 mm |
| Tipo funcional (spec) | — | «Sealed, pre-lubricated, self-aligning ball bearings with **eccentric lock collars**» | serie con collarín excéntrico |
| Buje sin chaveta (Trantorque) | `099.128420` | «KEYLESS BUSHING - 20mm ID × 45mm OD» | apriete **1500 in-lbs = 169.5 N·m** («Tighten trantorque bushing 1500 in lbs.») |
| Separador de chumacera 4 pernos | `PT-001465` | «BEARING SPACER - 4-BOLT» | — |
| Separador de chumacera 2 pernos | `PT-085857` | «BEARING SPACER - 2-BOLT, 2-5/8" × 4"» | 66.7 × 101.6 mm |

#### Equivalentes comprables de chumacera (coinciden 1:1 con los barrenos de Hytrol)

| Parte Hytrol | Equivalente comercial | Cotas de catálogo |
|---|---|---|
| `010.0021` — 2 pernos, Ø1 in | **UCFL205-16** | Largo 5-1/8 in (130.2 mm) · Alto 2-11/16 in (68.3 mm) · **Entre-ejes de tornillos 3-57/64 in (98.8 mm)** · Carga estática 1809 lbf (8.05 kN) · Dinámica 3154 lbf (14.03 kN) · Límite 6250 rpm |
| `010.0021` con collarín excéntrico | **AMI KHFT205-16** (serie KHFT200, inserto KH200) | Ø1 in, mismo entre-ejes 3-57/64 in ⇒ intercambiable con la UCFL205-16. Equivalente Timken/Fafnir: prefijos RA / RAL / GRA |
| `010.203` — 4 pernos, Ø1-7/16 in | **UCF207-23** | Largo 4-39/64 in (116.7 mm) · **Entre-ejes 3-5/8 in (92.1 mm)** · Estática 3496 lbf (15.55 kN) · Dinámica 5775 lbf (25.69 kN) · Tornillo 1/2 in · 3.31 lb |
| (referencia métrica) | **UCFL204 / UCF204** (Ø20 mm) | UCFL204: 113 × 60 mm, entre-ejes 90 mm, agujero 12 mm, M10. UCF204: 86 mm, entre-ejes 64 mm. Sufijo `D1` = relubricable |

> La especificación Hytrol «self-aligning ball bearings with **eccentric lock collars**» apunta a la
> variante KHFT/RA (collarín excéntrico), no a la UCFL de prisioneros. Ambas comparten el mismo
> alojamiento FL205, así que la geometría de montaje del modelo 3D es la misma.

### 4.4 Accionamiento

| Fn | Nº parte Hytrol | Descripción de catálogo | Cota clave |
|---|---|---|---|
| Motorreductor de la transferencia | `300.0322` | «**EURODRIVE GEAR MOTOR - RF07 DRS71S4**» y «GEAR MOTOR - 1/2 hp, 230/460/3, **462 rpm**» | SEW-EURODRIVE, reductor helicoidal RF07 (brida), motor DRS71S4; 1/2 HP; salida 462 rpm |
| Motorreductor del sorter (referencia) | `300.0081` | «EURODRIVE GEAR MOTOR - KT47 DRE100L4» | SEW KT47 (cónico-helicoidal) |
| Variador | `032.31015` | «AC VAR SPD - 0.5 HP, 230V 3PH IN, 230V OUT» + soporte `B-21468 VSC DRIVE BRKT - **POWERFLEX 40, SIZE B**» | Allen-Bradley PowerFlex 40 tamaño B |
| Brazos de par | `PT-083789-R/-L` | «TORQUE ARM - LH/RH, 2" × 8-35/64", EURODRIVE» | montaje eje hueco + torque arm |
| Encoder de seguimiento | `032.2915` | «ENCODER KIT - 10 PPR» sobre la polea snub | 10 pulsos/rev |

> **Comprobación de coherencia** *(corregida el 2026-07-29, hallazgo DIN-01)*: 462 rpm sobre la
> rueda motriz Ø2-1/2 in dan **302 FPM de BANDA MOTRIZ**, que **no** es la velocidad de
> transferencia. La banda plana arrastra el **tubo desnudo** del rodillo (Ø28.93), no su cara
> vulcanizada (Ø34.93), así que **multiplica ×2.195**: el rodillo gira a **1 014 rpm** y su cara va a
> **1.855 m/s = 365 FPM**. Es esa cifra la que hay que contrastar con el fabricante, y cuadra:
> Hytrol declara *«Capable of 350 FPM»* para el ProSort MRT (`web` SORT-016/SORT-018), un 4.3 % por
> debajo. La nota anterior comparaba los 302 FPM de banda motriz con los 275 FPM @60 Hz del MRT 30
> como si fueran magnitudes homólogas; no lo son (los 275 del MRT 30 son velocidad de
> transferencia, `web` TR-009, y su homólogo aquí son los 365).

#### El motorreductor, caracterizado: SEW-EURODRIVE RF07

| Parámetro | Valor de catálogo |
|---|---|
| Gama de potencia R07/RF07 | **0.09 – 0.37 kW (4 polos)** ⇒ 0.37 kW = 1/2 HP es el tope de la serie |
| Par de salida máximo | 50 N·m |
| Relaciones | 2 etapas i = 3.21 – 18.31 · 3 etapas i = 21.73 – 78.24 (30 relaciones) |
| Velocidades de salida | 17 – 430 rpm (a 50 Hz) |
| Montaje RF07 | brida, con Ø de brida **120 / 140 / 160 mm** |
| Eje de salida | **Ø20 mm k6** ⇒ encaja con el buje sin chaveta de 20 mm ID (`099.128420`) |
| **Envolvente (RF07 + 0.37 kW / DT71D)** | **L = 355 mm · AC = 145 mm · AD = 122 mm** (LS 419, LB 164, LBS 228, ADS 127) |
| **Masa** | **7.9 kg (17.4 lb)** |
| Generación actual (motores DRN), RF07+71M | AC 139 · AD 118 · L 374 · LS 442 · LB 226 mm |

> **Cómo casa con los 462 rpm de Hytrol** *(cálculo, sin fuente)*: el catálogo tabula velocidades a
> 50 Hz (motor ≈1380 rpm). Con i = 3.68 el catálogo publica 375 rpm (1380/3.68 = 375 ✓). A **60 Hz**
> (≈1700 rpm) la misma relación da **1700/3.68 = 462 rpm**, exactamente la cifra de Hytrol ⇒ el
> motorreductor es un **RF07 a 3.68:1**, cuyo par de salida admisible tabulado es **9.4 N·m**.
>
> **Contraste de masa para el diseño estructural**: un motorreductor norteamericano de eje paralelo
> de la misma potencia (Bison 017-482-0143, 1/2 HP, 230/460 V) pesa **42 lb / 19 kg** frente a los
> **17.4 lb / 7.9 kg** del SEW helicoidal — ×2.4. Relevante porque el motor va montado sobre el
> conjunto que sube y baja.

### 4.5 Neumática

| Fn | Nº parte Hytrol | Descripción de catálogo | Cota clave |
|---|---|---|---|
| **Actuador pop-up de la transferencia 90°** | `923.01022` | «GUIDE TABLE - 100 mm BORE, 20 mm STROKE» / spec «100 mm bore × 20 mm stroke **guided table cylinder**» | Ø100 mm, carrera 20 mm. Fuerza teórica a 60 psi = **3253 N (731 lbf)** *(cálculo propio)* |
| Cilindro del tensor neumático | `094.121508` | «AIR CYLINDER - 8 in. STROKE × 1-1/2 in. BORE» | Ø38.1 mm, carrera 203.2 mm; **qty 4** |
| Horquilla del tensor | `019.224` | «FEMALE ROD END - 7/16-20 RH THREADS» | rosca 7/16-20 UNF |
| Cilindro del divert 30° (referencia) | `094.10652` + `094.106521` | «AIR CYLINDER - 2 in. STROKE, 40 mm BORE» + «TRUNNION BRACKET FOR AIR CYLINDER 40 mm» | montaje **pivotante por muñón** |
| Válvula de mando | `094.10795` | «4-WAY SINGLE SOLENOID AIR VALVE - 24VDC» | 4 vías, monosolenoide, 24 V DC |
| Silenciadores | `923.0059` | «MUFFLER - 1/8 in. NPT» (2 uds) | 1/8 NPT |
| Filtro-regulador principal | `094.190` / `094.194` | «Air Line Filter/Regulator W/Bracket - 1/2 in. NPT» — esquema: «FILTER REGULATOR SET AT 60 PSI», con *bowl guard*, manómetro y válvula de drenaje | 1/2 NPT, ajuste 60 PSI |
| Filtro-regulador del tensor | `094.1941` | «AIR LINE FILTER/REGULATOR, 20 PSI MAX PRE[SSURE]» — esquema: «SET AT 20-30 PSI» | 20–30 PSI |
| Manifold | `910.0004` | «Manifold - 3/8 in. Inlet, 1/4 in. Outlet» | — |
| Presostato | `094.1912` | «Air Line Pressure Switch - 24 VDC, Normal Open» | 24 V DC, NA |
| Tubo neumático | `094.1148/1149/11496` | poliuretano Ø1/4 in OD verde 95A; Ø3/8 in OD negro; Ø1/2 in OD negro | 6.35 / 9.53 / 12.7 mm OD |
| Racorería | `094.1406`, `094.14079`, `094.14089`, `094.1465`, `094.1484/85` | codos macho giratorios 360°, tee 1/2 in, reductor 3/8→1/2 push-in, tapones push-in 1/4 y 3/8 in | push-in |
| Conjunto | — | El grupo es **FR + válvula 5/2 monosolenoide 24 V DC** (no hay lubricador en la lista; es un FR, no un FRL completo) | — |

> **Ojo con el «pop-up»**: el catálogo da 20 mm de carrera para el cilindro guiado, mientras que
> FIGURE 8A acota `0.394" MOVEMENT` = 10.01 mm. Es decir: **carrera de actuador 20 mm, movimiento
> acotado del rodillo 10 mm**. Cuál de los dos es la elevación efectiva sobre la línea de banda no
> está publicado (§7).

#### El actuador pop-up, identificado: SMC serie MGF «Guide Table»

> **Nota de integración (28-07-2026).** Lo que sigue es lo que dice el catálogo Hytrol y lo que
> se dedujo de él sobre el actuador ORIGINAL. El modelo ya **no** monta un MGF100: monta un
> **SMC MGPM80-10Z** real y comprable, con carrera de catálogo igual a los 10 mm del equipo.
> Motivo, cotas, comparativa de calibres y trazabilidad en `MESA_GUIA.md`; hechos con URL y cita
> en `analisis/web_facts.json` (PNEU-016, PNEU-017, PNEU-018).

Es la única familia de catálogo cuya denominación coincide literalmente con el
«guided table cylinder» de Hytrol. **Hallazgo importante para la lista de materiales:**

> **MGF100-20 no existe como artículo estándar.** Las carreras estándar del MGF (Ø40/63/100) son
> **30, 50, 75 y 100 mm**. Las carreras intermedias se fabrican bajo pedido `-XC79` instalando un
> espaciador, en escalones de 5 mm ⇒ el actuador del ProSort MRT es un **MGF100-30 con espaciador
> de 10 mm**. El catálogo aclara que *«the full length dimension when the cylinder is retracted is
> the same as that of 30 mm stroke»*, así que **la envolvente a modelar es la del MGF100-30**.

| Parámetro MGF100 | Valor | px @0.5277 |
|---|---|---|
| Huella de montaje | **170 × 200 mm** | 322.2 × 379.0 |
| Taladros de fijación | **4 × M12 × 1.75 pasantes** | — |
| Ø cuerpo | 160 mm | 303.2 |
| Altura (cota A) | **65 mm + carrera** | 123.2 + carrera |
| Cota B | 53.5 mm + carrera | 101.4 + carrera |
| Anchos | 186 mm y 190 mm | 352.5 / 360.1 |
| Puertos | 2 × Rc / NPT / G **1/4** | — |
| Ranuras | T-slot M6 para tornillo hexagonal, 6 posiciones | — |
| Ø vástago | 36 mm | 68.2 |
| Área de émbolo | 7853 mm² (salida) / 6835 mm² (retorno) | — |
| Empuje teórico | 3141 N / 2734 N @ 0.4 MPa · **3926 N / 3417 N @ 0.5 MPa** | — |
| **Empuje a los 60 psi de Hytrol** (0.414 MPa) | **≈ 3250 N = 731 lbf** *(cálculo)* | — |
| Presiones | máx. 1.0 MPa · mín. 0.1 MPa · prueba 1.5 MPa | — |
| Velocidad de émbolo | 20 – 200 mm/s | — |
| Amortiguación / lubricación | tope de goma en ambos extremos / no lubricado | — |
| Masa | **6.2 kg** @30 mm (= la del build de 20 mm) · 7.2 / 8.4 / 9.6 kg @50/75/100 | — |
| Carga admisible (único punto con fuente) | 70 kg a 60 mm de excentricidad y 150 mm/s | — |

**Validación aritmética independiente del dato de Hytrol** *(cálculo, sin fuente)*: con área 7853 mm²,
carrera 20 mm y relación de compresión (60+14.7)/14.7 = 5.082, el consumo de doble efecto sobre área
plena es 0.3142 L × 5.082 = 1.597 L = **0.0564 cu ft/ciclo**, frente a los **0.0556 cu ft/ciclo**
publicados: desviación **+1.4 %**. El Ø100 × 20 mm del catálogo Hytrol queda así corroborado.

**Alternativa europea**: el Festo **DFM-100** tampoco llega a 20 mm — su carrera mínima de catálogo
es 25 mm (`DFM-100-25-P-A-GF`); 4712 N a 6 bar en avance, 4418 N en retroceso, 0.4 m/s máx.,
envolvente ≈ 240 × 120 × 150 mm con 4 × M12.

**Cilindro con muñón del divert 30°**: el **SMC C96/CP96 (ISO 15552) Ø40** ofrece montaje
*centre trunnion* de catálogo, vástago Ø16 mm, áreas 1257/1056 mm², puerto G 1/4 y 50 mm es carrera
estándar. A 60 psi da 520 N (117 lbf) por cilindro *(cálculo)*.

**Válvula**: equivalente comprable **SMC SY5120-5DZ-N7T** — 2 posiciones monosolenoide, 24 V DC,
puertos A/B racor instantáneo 1/4 in rosca NPTF, conexión DIN, luz + supresor, 0.1 W.

**Filtro-regulador**: equivalente **Festo LFR-1/2-D-MIDI-A** (Festo 159585) — 40 µm, 3400 l/min
(≈120 SCFM), vaso 43 cm³, histéresis 0.2 bar, 920 g, vaso PC con protector metálico y purga
automática. ⚠ Sus puertos son **G1/2 (BSPP)**; Hytrol pide **1/2 NPT** ⇒ hace falta la variante NPT.

### 4.6 Estructura y chapa

| Fn | Nº parte Hytrol | Descripción de catálogo | Cota clave |
|---|---|---|---|
| Bastidor del transportador | — | «6 1/2 in. × 1 1/2 in. × **12 ga.** powder-painted formed steel channel frame, bolted together with butt coupling» | 165.1 × 38.1 mm, 12 GA |
| Tira de desgaste | — | «UHMW wear strip spaced every 3 in.» | paso 76.2 mm |
| Bastidor del rodillo de transferencia | `WA-025802` | «ROLLER FRAME WELDMENT (SPECIFY BR)» | por BR |
| Canal base de la transferencia | `WA-025817` | «BASE CHANNEL WELDMENT (SPECIFY BR)» | — |
| **Canal de montaje del cilindro** | `WA-025833` | «CYLINDER MTG CHNL WELD» | pieza rotulada en FIGURE 8A |
| Canal transversal de la transferencia | `PT-086818` | «TRANSFER CROSS CHANNEL (SPECIFY BR)» | — |
| Ángulo transversal | `PT-086833` | «CROSS ANGLE - 8-1/2 in. LONG» | 215.9 mm |
| Canal lateral de la transferencia | `PT-087017` | «SIDE CHANNEL - 18 in. LONG» / «1'6" LG SIDE CHNL» | 457.2 mm |
| Guarda del rodillo de transferencia | `PT-086812` | «TRANSFER ROLLER GUARD - 17 in. LONG» | 431.8 mm |
| Placa espaciadora | `PT-086781` | «SPACER PLATE (SPECIFY BR), RLR SUPT» | qty 2 |
| Tubo del tensor | `B-09226-017` | «1.7 in. OD HR TUBE - 2-1/8 BR» | Ø43.2 mm |
| Baranda | `B-18590` | «GUIDE RAIL EXTRUSION» + `PT-127186 UNIVERSAL GUIDE RAIL - END RAMP CLIP` | extrusión |
| Ángulo de acople | `B-03191` | «BUTT CPLG ANGLE - 1-3/8" × 6-1/8"» | 34.9 × 155.6 mm |

### 4.7 Tornillería y elementos normalizados presentes en el equipo

Roscas realmente usadas, tomadas de las listas de partes del Bulletin #656 (todas **UNC salvo indicación**):

| Elemento | Nº parte | Descripción de catálogo |
|---|---|---|
| Tornillo hex 1/4-20 | `040.1005`, `040.101`, `040.1041` | 1/4-20 × 1/2, × 1, × 2-1/4 in LG HHCS, ZP |
| Tornillo hex 3/8-16 | `040.302`, `040.306`, `040.309` | 3/8-16 × 3/4, × 2, × 3 in LG (× 3 in *full thread*) |
| Tornillo hex 7/16-20 (UNF) | `040.3935` | 7/16-20 × 1-3/4 in LG HHCS full |
| Tornillo carriage 5/16-18 | `042.557` | 5/16-18 × 1-1/4 in LG carriage bolt, ZP |
| Tornillo carriage 3/8-16 | `042.560` | 3/8-16 × 3/4 in LG carriage bolt, ZP |
| Tornillo cabeza plana 3/8-16 | `042.2044` | 3/8-16 × 2-1/4 in LG flat head bolt |
| Tornillo de hombro | `042.512` | 5/8 in DIA × 1 in LG shoulder bolt |
| Tuerca hex 1/4-20 / 3/8-16 jam / 1/2-13 | `041.100`, `041.200`, `041.103` | semi-fin, reg series, ZP |
| **Tuerca de brida** 1/4-20 | `049.527` | «1/4-20 SMALL FLANGE LOCKNUT, ZP» |
| **Tuerca de brida** 3/8-16 | `049.5285` | «3/8-16 SMALL FLANGE LOCKNUT, ZP» |
| Tuerca autoblocante nylon | `041.800`, `041.801`, `041.802` | 1/4-20, #8-32, #10-24 nylon insert |
| Speed nut | `049.310` | «1/4-20 U-TYPE SPEED NUT (.105/.120" MATL)» |
| Prisionero | `044.100` | «SET SCREW - 1/4-20 × 5/16" LG» |
| Arandelas | `043.100/101/102/103/104`, `043.200/202/203/211` | planas y de presión 1/4, 5/16, 3/8, 1/2, 5/8 in |
| Pasador elástico | `049.110` | «SPRING LOCK PIN - 5/32 in. DIA. × 7/8 in. LONG» |
| Arandela de goma | `092.157` | «RUBBER WASHER - 1/2" ID × 1" OD × 1/4"» |
| Separador | `098.150` | «SPACER - .406" ID × .750" OD × .375" LG» |
| Separador aluminio | `098.1064` | «ALUMINUM SPACER - 1-5/8" LG» |

#### Cotas normalizadas de esa tornillería (para el modelo 3D)

| Rosca | Entrecaras hex (máx/mín) | Altura de cabeza (máx/mín) | Tuerca de brida: Ø brida | Tuerca de brida: espesor |
|---|---|---|---|---|
| 1/4-20 | 0.438 / 0.428 in (11.13/10.87 mm) | 0.163 / 0.150 in | 0.594 / 0.574 in (15.09/14.58 mm) | 0.236 / 0.222 in (5.99/5.64 mm) |
| 5/16-18 | 0.500 / 0.489 in (12.70/12.42 mm) | 0.211 / 0.195 in | — | — |
| 3/8-16 | 0.562 / 0.551 in (14.27/14.00 mm) | 0.243 / 0.226 in | 0.750 / 0.728 in (19.05/18.49 mm) | 0.347 / 0.330 in (8.81/8.38 mm) |

*Tornillos hex según ASME B18.2.1; tuercas de brida serradas según ASME B18.16.4.*
El **tornillo de brida serrada IFI-111 usa un hexágono menor** que el tornillo hex de la misma rosca
(1/4-20 → 3/8 in; 3/8-16 → 9/16 in) — importante para el espacio de llave dentro del bastidor.

**Resistencia y apriete** (SAE J429, acabado *plain*):

| Rosca | Gr. 2 tracción / apriete | Gr. 5 tracción / apriete |
|---|---|---|
| 1/4-20 | 74 ksi / 5 ft·lb (6.8 N·m) | 120 ksi / 8 ft·lb (10.8 N·m) |
| 5/16-18 | 74 ksi / 11 ft·lb (14.9 N·m) | 120 ksi / 17 ft·lb (23.1 N·m) |
| 3/8-16 | 74 ksi / 20 ft·lb (27.1 N·m) | 120 ksi / 31 ft·lb (42.0 N·m) |

*La fuente advierte que el par correcto sólo se determina experimentalmente en la junta real.*

**Anillos de retención externos** (si se usan para retener ejes en el modelo):

| Norma | Eje | Ø garganta | Ancho garganta | Espesor anillo | Empuje teórico |
|---|---|---|---|---|---|
| ANSI/Truarc 5100-050 (Rotor Clip SH-50) | 1/2 in | 0.468 in (11.89 mm) | 0.039 in (0.99 mm) | 0.035 in (0.89 mm) | 565 lbs (fluencia garganta) / 2060 lbs (corte) |
| DIN 471 | 20 mm | 19.0 mm h11 | 1.3 mm | 1.2 mm | — |

---

## 5. Verificado vs. típico del sector

**Verificado con fuente** (todo lo de §2, §3 y §4 con cita en `web_facts.json`):
identificación del equipo, número y ancho de bandas, paso de tiras de desgaste, diámetros de rodillos y
poleas, engomado, carrera y diámetro del cilindro pop-up, presión y consumo de aire, tipo de válvula,
potencia/tensión/rpm y marca-modelo del motorreductor, barrenos de chumaceras, calibre y perfil del
bastidor, tornillería por número de parte.

**Típico del sector, con fuente de catálogo pero NO verificado para este equipo concreto**
(usar sólo marcado como capa de referencia, no como cota del ProSort MRT):
- Eje hexagonal 5/16 in para Ø1-3/8 in y 7/16 in para Ø1.9 in (Con-Drives, Rolcon, Lewco).
- Pared de tubo 0.065 in (16 GA) en Ø1.9 in.
- Camisa de uretano de 1/8 in y 83 Shore A (el equipo lleva 3/32 in, a medida).
- Chumaceras UCFL205-16 / UCF207-23 / KHFT205-16 como equivalentes de las partes `010.*`.
- Anillos de retención Truarc 5100-050 / DIN 471.

**Sin fuente y NO asumido** (ver §7): que el paquete neumático sea de una marca concreta
(SMC / Festo / Numatics / Bimba). Los números `092x.`, `094.x` y `923.x` son códigos internos de
Hytrol y no revelan fabricante. Tampoco se asume que los rodillos lleven rodamientos 6203/6204:
la especificación dice rodamientos ABEC-1 de bolas con alojamiento plástico embutidos en el tubo.

---

## 6. Tablas de referencia (calibres y perfiles)

**Calibres de chapa de acero dulce** (dos fuentes concordantes: Metal Supermarkets y RMFG):

| Calibre | in | mm |
|---|---|---|
| 7 GA | 0.1793 | 4.554 |
| 10 GA | 0.1345 | 3.416 |
| 11 GA | 0.1196 | 3.038 |
| **12 GA** (bastidor del equipo) | **0.1046** | **2.656** |
| 14 GA | 0.0747 | 1.897 |
| 16 GA | 0.0598 | 1.518 |
| 1/4 in (placa) | 0.2500 | 6.350 |

> Ninguna de las dos tablas cita su norma de origen (no aparece ASTM A1011 ni «Manufacturers'
> Standard Gage»). Metal Supermarkets advierte: «Gauges are neither standard nor metric and the
> values are independent of those measurement systems». **No aplicar esta tabla a tubo de rodillo.**

**Perfiles canal American Standard** (referencia normativa; el bastidor real es canal conformado, no laminado):

| Perfil | Peralte d | Ala bf | Alma tw | Espesor de ala tf | Área | Peso |
|---|---|---|---|---|---|---|
| C3×4.1 | 3.00 in / 76.2 mm | 1.410 in / 35.81 mm | 0.170 in / 4.32 mm | 0.273 in / 6.93 mm | 1.21 in² | 4.1 lb/ft (6.10 kg/m) |
| C4×5.4 | 4.00 in / 101.6 mm | 1.584 in / 40.23 mm | 0.184 in / 4.67 mm | 0.296 in / 7.52 mm | 1.59 in² | 5.4 lb/ft (8.04 kg/m) |

---

## 7. Pendientes sin fuente (NO inventar)

| Dato faltante | Qué buscaría |
|---|---|
| Confirmación de placa: **SEW DRS71S4 = 0.37 kW / 4 polos** | El catálogo R07 acota la gama en «Power from 0.09 kW to 0.37 kW (4-pole)» y la carcasa 71 es la mayor, pero falta la hoja de datos del motor DRS71S4 en sew-eurodrive.com |
| Círculo de taladros y nº de tornillos de la brida RF07; longitud del eje de salida | El Ø de brida (120/140/160) y el eje Ø20 k6 sí tienen fuente; el círculo de taladros está en un dibujo rasterizado de la hoja de dimensiones |
| Cotas físicas (H×A×P) del filtro-regulador 1/2 NPT y de la válvula SY5120; **Cv y tiempo de respuesta** de la válvula | Páginas de SMC/distribuidores devuelven 403 y el PDF `aw.pdf` de SMC usa cifrado AES no descifrable. Pedir cut-sheet a SMC/Festo |
| **Cilindro Bimba Ø1-1/2 in × 8 in de carrera** (equivalente del tensor `094.121508`) | Todas las fuentes de catálogo devolvieron 403/503 o superaron el límite de descarga. **No inventar un nº de parte Bimba** |
| Tablas numéricas de carga excéntrica admisible y par de giro admisible del MGF100 | El catálogo las publica como gráficas. Único punto con cita: «When the load mass is 70 kg, eccentric distance is 60 mm, and the maximum speed is 150 mm/s Select MGF100 from Graph.» |
| Envolvente del cilindro SMC C96 Ø40 y cotas del soporte de muñón | Hoja de dimensiones de la serie C96 |
| Hoja PDS de **Habasit TF-102T** y **APH150HTS** (espesor, k1%, Dmín polea) | `tdm.habasit.com/PDS/…` son PDF escaneados sin capa de texto; pedir la PDS a Habasit o a un distribuidor (Michigan Industrial Belting, Vanguard) |
| Espesor de pared en pulgadas decimales del tubo Ø1-3/8 in calibre 18 | Catálogo de rodillos de Omni Metalcraft / Ashland / Lewco con tabla de tubos |
| Medida del hexágono del eje de los rodillos emergentes del ProSort MRT | El estándar de catálogo para Ø1-3/8 in es 5/16 in, pero Hytrol no lo publica: sección de repuestos de Hytrol o medición con calibre |
| **Elevación efectiva del rodillo sobre la línea de banda**: relación entre `0.394"` y la carrera de 20 mm | Dibujo de instalación acotado del módulo (pedir a Hytrol) o medición en campo |
| Nº de bandas, carrera y capacidad de transferencias equivalentes de **Interroll, Lewco, Omni Metalcraft, Dematic, Ashland** | El manual Interroll RM 8731 está escaneado (sin texto); pedir la hoja de datos del RM 8731 |
| Motorreductor **NEMA 56C** de 1/2 HP con L×A×H publicadas y salida cercana a 460 rpm; montajes C-face / eje hueco / brazo de par | Cut-sheets de Baldor/ABB, Nord, Bison o Sumitomo (las páginas de familia no traen cotas) |

---

## 8. Fuentes principales

1. Hytrol Conveyor Co. — *Bulletin #656, Model ProSort MRT, Installation and Maintenance Manual*, Nov-2013 —
   `https://cdn.hytrol.com/2013_656_mrt.pdf` (FIGURE 8A en pág. 8; despiece del tensor en pág. 11;
   dibujos de partes de la transferencia 90° en págs. 13–14).
2. Hytrol Conveyor Catalog — *PROSORT MRT 90, 90° Roller Transfer Conveyor*, págs. 9.5-1…9.5-4 —
   `https://www.cisco-eagle.com/uploads/Hytrol-Spec-Sortation/ProSort-MRT-90-Specs.pdf`
3. Hytrol Conveyor Catalog — *PROSORT MRT 30*, págs. 9.6-1…9.6-4 —
   `https://www.cisco-eagle.com/uploads/Hytrol-Spec-Sortation/ProSort-MRT-30-Specs.pdf`
4. Habasit America — *Fabric and Round Belts Product Range* (Media 4080) —
   `https://www.habasit.com/-/media/Project/Habasit/PublicWebSite/Documents/English/Habasit-America/Literature/4080-Fabric-and-Round-Belts-Product-Range.pdf`
5. Hytrol — *prosort mrt 90 and 30*, Bulletin No. 711 (folleto de producto, fuente de primera mano) —
   `https://cdn.hytrol.com/ProSortMRT_PF_2.pdf`
6. Cisco-Eagle — *Hytrol ProSort MRT Medium Roller Transfer Conveyor* —
   `https://www.cisco-eagle.com/category/3279/hytrol-prosort-mrt-medium-roller-transfer-conveyor`
7. SMC — *Best Pneumatics, Guide Table Series MGF (Ø40/63/100)* —
   `https://ca01.smcworld.com/catalog/BEST-5-3-en/pdf/3-p0511-0522-mgf_en.pdf`
8. SEW-EURODRIVE — *R07 DR/DT Helical Geared Motors*, ed. 05/2002, doc. 1054 8912 / EN —
   `https://download.sew-eurodrive.com/download/pdf/10548912.pdf`
9. Metal Supermarkets — *Sheet Metal Gauge Chart* —
   `https://www.metalsupermarkets.com/sheet-metal-gauge-chart/`

*(Las 32 URL con cita textual están en `web_facts.json`; ésta es sólo la lista corta.)*

---

## 9. Nota de auditoría sobre la calidad de las citas

Cada hecho de `web_facts.json` lleva un campo `nota` que indica si la fuente se **descargó y verificó
en esta sesión** o si la cita procede de investigación asistida sin re-descarga. En concreto:

- **Verificadas por descarga directa**: manual Hytrol #656, fichas de catálogo ProSort MRT 90 y 30,
  folleto Hytrol Bulletin 711, folleto Habasit 4080, catálogo SMC MGF (PDF cifrado RC4-128 descifrado
  localmente), tabla de calibres Metal Supermarkets, Con-Drives 4310-B09 y 2080-B09, Rolcon
  poliuretano, Bearings Direct UCFL205-16.
- **No re-descargadas**: SEW (el servidor devolvió 403 al re-verificar), Festo, resto de fichas de
  rodamientos y tornillería. Se hizo un muestreo de control de 4 fuentes del mismo lote y todas
  coincidieron literalmente.
- Los **84 números de parte Hytrol** citados se comprobaron uno a uno contra el texto extraído del
  Bulletin #656: los 84 están presentes en el documento original.
