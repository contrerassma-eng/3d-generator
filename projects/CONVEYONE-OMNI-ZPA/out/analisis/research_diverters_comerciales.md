# Desviadores y sorters comerciales con ruedas omni/mecanum y literatura sobre lechos mecanum de ejes fijos

Proyecto: Conveyone (Chile) — zonas especiales "Omni" (8 ejes a paso 76,2 mm, 4 ruedas mecanum Ø50 por eje, 2 familias A/B ±45°, 1 motor por familia, sin giro de disco) insertadas en línea ZPA ZP2026 (rodillos Ø50, paso 74,75 mm, UniDrive 24 V + ZoneLogix Plus, 533,4 mm entre bastidores).
Fecha de acceso de TODAS las fuentes: **2026-09-03**. Capa de información: `web` (cada dato lleva URL + cita textual ≤ 30 palabras en idioma original). Los cálculos propios se marcan *[cálculo propio]* y no son datos de catálogo. Fuentes secundarias (blogs, prensa, distribuidores, marketplaces) marcadas "(secundaria)".
Archivos de respaldo (PDF y texto extraído) en `/tmp/claude-0/-home-user/c42cee2b-b065-5cb4-b09a-2af5134275ce/scratchpad/wf/pdf/` y `.../pdftext/`. Hechos en JSON: `research_diverters_comerciales.md.facts.json`.
Nota de método: el presupuesto de WebSearch de la sesión estaba agotado; la localización se hizo con WebFetch/curl sobre sitios de fabricantes, Google Patents (páginas y endpoint XHR), CrossRef, Semantic Scholar y los manuales ya descargados en sesiones previas (Flowsort V5.2, F-RAT-NX75, Interroll HPD, Hytrol SC). Bing/DuckDuckGo/OpenAlex devolvieron bloqueos o resultados irrelevantes.

---

## 1. Resumen ejecutivo

1. **Velocidades de desvío con ruedas en la industria: 1,0–1,5 m/s es el rango típico de catálogo**; los productos "high speed" llegan a 2,0 m/s (Flowsort Speed Flow) y 2,3 m/s (Wayzim, sorter de rueda pivotante). Itoh Denki F-RAT-NX75: 56/197 FPM (0,28/1,0 m/s); Interroll HPD: 1,4 m/s; Flowsort SLD Eco: 0,1–1,5 m/s; Hytrol ProSort SC: 300 FPM (1,52 m/s); cellumation celluveyor: 1,15 m/s; Itoh MABS2/F-RAT-S300: 295 FPM (1,5 m/s, con carga reducida a 10 kg en S300).
2. **Capacidades de desvío:** Flowsort 6000–7800 pph; cellumation cv.CROSSDOCK 6000 pph; Itoh F-RAT-NX75 2250 c/h (al 50 % de desvío), MABS2 4300 c/h; Hytrol SC 65–80 cajas/min (blog); Dematic steerable wheel 40–80 cajas/min (prensa); Wayzim ≥10 000 pcs/h (piezas pequeñas).
3. **Cargas y tamaños:** máx. 35 kg (Flowsort), 50 kg (Interroll HPD, Itoh F-RAT), 30 kg/unidad (MABS2); mínimos 150×150 mm (Flowsort SLD), 80×80 (Flowsort MLD), 225×225 (F-RAT-NX75), 300×300 (F-RAT-S300, Pop-D), 6×9 in (Hytrol SC). Todos los fabricantes condicionan el rendimiento al fondo del bulto ("smooth bottom surfaces", "bottom status of trays", "object floor is almost flat").
4. **Arquitecturas comerciales occidentales:** todas usan rueda **con giro (swivel)** (Flowsort Ø180 con rodillos Ø58 PU; Interroll HPD casetes de 120 mm con 2 motores 24/48 V; Hytrol/Dematic ruedas pivotantes neumáticas/eléctricas) o **elevación/conmutación de superficie** (Itoh F-RAT, 3 MDR) o **celdas con 3 ruedas omni independientes** (celluveyor). **No se encontró ningún producto de catálogo occidental con lecho mecanum de ejes fijos y 2 motores (sin swivel).**
5. **El concepto de ejes fijos ±45° con 2 motores SÍ existe en patentes chinas de fabricantes** (Kunshan Tongri/Tungray CN111747090A y CN212314844U, 2020-21: dos "electric drums" 24 V, ejes fijos, 90° por contrarrotación, ángulo intermedio por diferencia de velocidad; FDT Qingdao CN213863900U, 2021; Huzhou Xinsheng CN222922403U, 2025; Dongfeng Design CN212639043U, 2021) y en el antecedente US 5,396,977 (1995, carga aérea: grupos de ejes con rueda omni, un motor por grupo). No se encontraron fichas técnicas públicas (velocidad, throughput) de esos productos.
6. **Literatura:** los lechos con ruedas acopladas mecánicamente (un motor por familia) **no controlan la guiñada (yaw)**; el control de orientación requiere ≥3 ruedas accionadas independientemente (BIBA EP2874923B1; Keek et al. 2021). El patrón de ruedas bajo la caja cambia con tamaño y posición (Zhang et al. 2024); las ruedas omni deslizan más que una rueda convencional y un prototipo limitó la velocidad a 0,20 m/s para reducir deslizamiento (Keek et al. 2021). SF Taisen (CN112850069B) cuantifica que una mecanum con rodillos a 45° transmite 0,5·V en su configuración.
7. **Motores/control de referencia:** Flowsort = 2× Pulseroller PGD024 (40 W, 50 W boost; ratio 11 → 52–528,9 rpm → 0,15–1,55 m/s en Ø58) + ConveyLinx-Ai2 (Modbus TCP/EtherNet/IP/PROFINET/EtherCAT/CC-Link IE); Interroll HPD = 2 motores 24/48 V (5,2 A nom., 9 A pico) + MultiControl; Itoh F-RAT = 3 MDR 24 V (56 W, 4,9 A) + tarjetas IB-E03A/IB-E04F o CB-016/CBK-109.

---

## 2. Hallazgos por sub-tema

### 2.1 Flowsort SLD/DLD/MLD (Flowsort BV, De Hooge Akker 18, 5661NG Geldrop, NL; también Flowsort Kft., Budaörs, HU)

**Principio (manual V5.2 REV1.2, 14-12-2022, alojado en robotunits.com):** disco giratorio ("wheel") Ø180 mm que aloja rodillos de PU Ø58 mm accionados; el disco gira −90°…+90° en 0,3 s (180°) por un motor PGD y los rodillos son accionados por otro PGD a través de correa Poly-V; ambos motores van a un ConveyLinx-Ai2. Se monta +2 mm sobre TOR/TOB. "The SLD/DLD diverter is used for diverting unit loads, preferably with smooth bottom surfaces, at different angles onto chutes to the right or to the left." Anchos 400/600/800/1000 mm con 2/3/4/5 conjuntos de rueda; SLD = 200 mm de largo (1 fila), DLD = 400 mm (2 filas, doble número de ruedas). MLD ("ZigZag") = 2 filas, módulo 373,2 mm, hasta 8 destinos.

| Parámetro | SLD/DLD manual V5.2 | Eco Flow SLD (web) | Speed Flow SLD (web) | Multi Line Diverter (web) | X-Flow 90 (web, correas) |
|---|---|---|---|---|---|
| Velocidad ruedas | "Diverter speed 0,1 – 1,5 m/s" | "Maximum wheel speed 1,5 m/s" | "Maximum wheel speed 2,0 m/s" | 1,5 m/s | "Belt speed 0.1 - 0,42 m/s" |
| Giro del disco | "Swivel time 180° in 0,3 sec" | "-90° to +90° in 0,3 seconds" | ídem | ídem | 90° izq/der |
| Capacidad | — | "Max sorting capacity 6000 pph" | "7800 pph" | "6000 pph" | "1700 pph" |
| Carga | "Max. load capacity 35 kg – … depending on the combination of speed & load" | 50 g – 35 kg | 50 g – 35 kg | 50 g – 35 kg | 100 g – 50 kg |
| Tamaño mín. | — | "150 x 150 mm" | 150×150 | "80 x 80 mm" | 100×100 |
| Rueda / rodillo | "Wheel diameter 180mm" / "Roller diameter 58mm", "Plastic with PU cover", rodamiento 608-2RS | ø180 / ø58, "80° shore A" | ídem | ídem | correas 14 mm ×1–4 |
| Motores | "Motor; PGD024-SE2-11AAA" (rodillos), "Motor; PGD024-SE2-15AAA" (giro) | "24 Volt or 48 Volt Pulse gear drive" | "24/48 Volt High-speed servo drive" | giro: "Advanced stepper drive"; ruedas: "Precision gear drive" | — |
| Controlador | "Controller; Conveylinx-Ai2"; "Max. power consumption 0,05kW" | Modbus/TCP, EtherNet/IP, Profinet, CC-Link IE, EtherCAT | ídem | ídem | ídem |
| Altura módulo | — | 360 mm | 227 mm | 360 mm | 227–242 mm |
| Peso módulo | "15 – 100 kg Depending on size" | — | — | 24–77 kg/módulo (manual MLD) | — |

**Integration Manual V3.1.2 (flowsort.com):** "As standard it is equipped with a PGD motor type gear ratio 11. This motor has a minimum of 52 RPM and a maximum of 528.9 RPM." → "0.15 m/s" … "1.55 m/s on the blue wheels"; ejemplo propio del manual v = π·0,058·528,9/60 = 1,606 m/s. Disco: "The mechanical ratio of the gears is 1:2", pulsos = (ángulo·30·ratio·2)/360. Rampas Accel/Decel 10–10000 (unidades no explicadas en el manual; remiten a la guía ConveyLinx). Modo recomendado "Full PLC mode". **Homing periódico obligatorio** por juego del reductor: cada 100/85 movimientos (0–10 kg, baja/alta velocidad) o 75/50 (10–25 kg). Firmware público ConveyLinxAi_6_13_2.bin y function blocks para Siemens, Beckhoff, AB, Omron, Mitsubishi, CODESYS.

**Motor PGD024 (Pulseroller, 24 V):** "40W (50W in BOOST Mode)", "2.5A (3.5A in BOOST Mode)", arranque "5A BOOST Mode / 8A BOOST-8 Mode", motor "5800 ECO / 4200 BOOST & BOOST-8" rpm máx. (antes del reductor), eje 16 mm, conector 4 pin M8 / 9 pin JST, IP54. Versión 48 V PGD-Ai-48: 50 W, 1,6 A. **Par nominal por relación (11, 15): NO ENCONTRADO** (tabla "Performance Data" en manula.com bloqueada por Cloudflare).

### 2.2 Itoh Denki F-RAT-NX75 / F-RAT-U225 / F-RAT-S300 (+ Pop-D y MABS2 como referencia)

**Principio:** no es rueda omni ni swivel: "Patented Itoh Denki Lift-Lower technology - rollers and belts change position to meet the product" (S300) / F-RAT-NX "flat transfer": "F-RAT uses MDR for each of carrier wheel transfer, roller transfer, and transfer surface switch (3 axes in total)" (M1 ruedas portadoras, M2 rodillos, M3 conmutación). Placa: "RATED INPUT: DC24V / 4.9A … PAYLOAD: max 50 kg … RATED POWER: 56W".

| Parámetro | F-RAT-NX75 | F-RAT-U225 | F-RAT-S300 | Pop-D wheel divert | MABS2 (ball sorter) |
|---|---|---|---|---|---|
| Velocidad línea | "56 or 197 FPM" (nominal 20/30/60 m/min) | "56 FPM" / "197 FPM" | "56, 197, or 295 FPM" | "197 FPM" | "295 FPM" |
| Carga | 50 kg | 50 kg | 50 kg (37,5 kg tam. A); a 295 FPM "10 kg (22 lbs)" | NO ENCONTRADO | "30 kg (66 lbs)" por unidad; 8 unidades 239 kg |
| Tamaño mín. | "225 x 225mm" | 225×225 | "300 mm x 300 mm" | "300 mm x 300 mm" | "150 mm x 100 mm" |
| Tamaño máx. | "-100mm from the length and the width of F-RAT-NX75" (p. ej. 9080: 695×795) | — | 600×650 (tam. D) | — | hasta 700×650 (800) |
| Capacidad | "Transfer capacity: 2250 c/hr (based on 13.8” x 15.4”, 66 lb. package)"; brochure: "up to 2,250 totes handled per hour (at a 50% transfer rate)" | — | "2500 c/hr" | NO ENCONTRADO | "4300 c/hr" |
| Tiempos | "One cycle time = 1,10 sec" (conmutación ruedas→rodillos→ruedas); descarga 0,5–3 s según largo 250–700 mm y 20/30/60 m/min; +0,1…0,5 s por 10…50 kg; arranque motor "15 msec or less" | — | — | — | — |
| Altura | "125 mm" | 125 mm | "170 mm" | "170 mm" | "175 mm" |
| Rodillos | "(2) 48.6 mm and (1) 57.0 mm" | — | "50 mm" | — | "(2) 57.0 mm" |
| Ángulos | 90° (4 entradas/salidas reversibles) | 90° | 90° | "30 or 45 degree" | "30, 45, and 90 degrees" |
| Tarjetas | "(1) IB-E03A and (1) IB-E04F or (2) CB-016BS7-UL and (1) CBK-109F-UL" | — | "(2) IB-E03A or (3) CB-016S7" | — | IB-E04F o IB-E06F-UL-M1 |

Advertencia de Itoh en el gráfico de throughput: "The stopping distance of trays and throughput depends on the size, material, bottom status of trays, ambient temperature, and/or the speed." Fuente de alimentación recomendada "24V DC/10A, 240W or more" por unidad.

### 2.3 Interroll High Performance Divert (RM 8711 24/48 V, RM 8712 400 V) y Split Tray MT-S

**Principio HPD:** rueda pivotante ("swivel wheel transfer") en casetes de 120 mm de largo, rodillos a paso 60×60 mm arrastrados por correa redonda ø4; "There are two motors in the HPD, one to swivel the wheels, one for driving the wheels. Each motor needs 5,2A nominal power, 9A peak power". Control por MultiControl (PROFINET/EtherNet/IP/EtherCAT), homing < 200 ms cerca de 0°, nuevo homing solo cada 30 s.

| Parámetro | RM 8711 (ficha 12/2021 + manual V1.1 02/2016) |
|---|---|
| Carga | "Max. load capacity* 50 kg" |
| Velocidad | "Max. swivel roller speed* 1.4 m/s" ("*The combination of maximum values is not always possible.") |
| Giro | "Swiveling time 0.3 s per 90°" |
| Ángulos | "Diverting angle 30°/45°/90°" |
| Largo | "Module length 120 mm x load-dependent number of cassettes" |
| Ancho | "Rated width 420, 620, 840 mm (others on request)"; manual: 420–1020 mm |
| Paso rodillos | "Roller pitch (P) 60 mm in x and y-direction" |
| Altura / ruido | 330 mm; "Leq ≤ 70 dB(A)" |
| Bulto | "preferably with smooth bottom surfaces"; "Incline/decline Not suitable" |
| Throughput | NO ENCONTRADO (no figura en ficha ni manual) |

**MT-S Split Tray Sorter (web):** "up to 1.5 m/s", "2,500 - up to 21,600 items/hour", "up to 8 kg", "max. 600 x 400 x 200mm / item" — es un sorter de bandeja basculante (no de ruedas), útil solo como referencia de velocidad de línea. La página de sorters de Interroll (2026) lista MX-H/MX-V/MX-Vs, MT-S y MC-S; el HPD ya no aparece allí (solo en fichas/manuales).

### 2.4 OEM chinos: Damon, Wayzim, Shenzhen/Hangzhou "omni wheel sorter"

| Fabricante | Producto | Datos verbatim | Observación |
|---|---|---|---|
| Wayzim (中科微至, wayzim.com) | 摆轮分拣机 (pivot-wheel sorter) | "最高运行速度 2.3m/s"; "小件理论分拣效率 ≥10,000pcs/h"; "分拣准确率 ≥99.99%" | rueda pivotante, no mecanum; tamaños/pesos NO ENCONTRADOS |
| Damon Technology Group (德马科技, 688360.SH, damon-group.com) | "Swivel Wheel Sorter" (-62), "Skewed Wheel Diverter" (-64), "Electrical Roller Transfer" (-63) | -62: "It can realize single-direction, bidirectional and multi-angle sorting"; -63: "DC24V Electrical Roller" | ningún dato numérico público; descargas requieren registro. **Datos NO ENCONTRADOS** |
| Advanced Logistics Equipment (Shenzhen) (made-in-china, secundaria) | "Custom Cross Belt Sorter Steerable Pivot Wheel Sorter System … Omni Directional Conveyor" | "FOB Price: US $99,999 / unit" | sin especificaciones |
| Kunshan Tongri / Tungray (昆山同日工业自动化), FDT Qingdao (青岛孚鼎泰), Huzhou Xinsheng (湖州鑫盛) | "麦克纳姆轮分拣机" (patentes, ver §2.7) | ver §2.7 | son fabricantes; fichas técnicas web NO ENCONTRADAS |

### 2.5 cellumation celluveyor (Bremen) y Rotzinger

**celluveyor:** "In combination with the three omnidirectional and independently driven wheels per cell, complex material flow movements are possible" (home). Ficha: "150 Cell: 150mm x 150mm", "200 Cell: 200mm x 200mm", "Up to 1.15 m/s", "All wheels are driven independently from each other.", "Any type & size, as long as the object floor is almost flat", IP54. cv.CROSSDOCK: "up to 6.000 pph", "from 1,3 m²", "< 70 dB (A)". cv.SINGULATE: "3 to 5 m²". Diámetro de rueda omni, motor por rueda y carga por celda: NO ENCONTRADOS en la web (página /technology y /downloads no existen). Base patentaria: BIBA EP2874923B1 (2017): módulo con ≥2 unidades omni contiguas; "If at least three or exactly three omnidirectional conveyor units are provided, in addition, a rotation of the objects is possible".

**Rotzinger:** rotzinger-group.com no resuelve DNS; rotzinger.ch redirige a rotzingertransver.com (Rotzinger Transver AG: cintas y buffers para alimentos). **Ningún producto omni/mecanum encontrado.**

### 2.6 Sorters de rueda pivotante / pop-up como referencia (Hytrol, Dematic, TGW, Fives)

| Producto | Velocidad | Tasa | Carga / tamaño mín. | Mecanismo | Fuente |
|---|---|---|---|---|---|
| Hytrol ProSort SC1/SC2 (belted pivot wheel) | "BELT SPEED – … 300 FPM maximum." (*[cálculo propio]* 1,52 m/s) | blog: "exceed sortation rates of 65 cases per minute"; "as high as 80 cases per minute" | "Maximum unit package weight: 75 lbs."; "Minimum: 6 in. wide x 9 in. long. Note: Small packages must not be top heavy." | "Two banks of twin pivoting 3 1/8 in. dia. wheels with urethane treads driven by 3/8 in. dia. urethane belts"; cilindro 32 mm, 30–40 psi; ruedas 5/32 in sobre correa | ficha Cisco-Eagle (primaria reproducida); blog Hytrol (secundaria) |
| Dematic Steerable Wheel Sorter | NO ENCONTRADO | "sort rates from 40 to 80 cartons/min" | "weighing up to 110 lb." | "the 4 rows of wheels turn in a forward direction" (transporte) y giran para desviar | Food Engineering 2012 (secundaria) |
| TGW / Fives | NO ENCONTRADO (tgw-group.com 403; fivesgroup.com 404) | — | — | — | — |

### 2.7 Patentes y literatura: lechos mecanum/omni de ejes fijos, 2 familias ±45°, 2 motores

**Antecedente histórico (EE. UU.):** US 5,396,977 A (1995, "Conveyor apparatus for directionally controlled translation of an article", carga de aviones): "several parallel transverse and longitudinal shafts on which are fixed for rotation wheels which contain around their periphery rollers"; "Motor means independently drive each one of the shafts of each of shaft pairs."; "the four motors M1, M2, M7, and M8 provide independent driving of the four groups of shafts". Es decir: ruedas omni fijas en ejes, un motor por grupo de ejes; el propio texto advierte que en sistemas previos "stability of direction may be marginal under wet conditions or if the rollers are dirty or worn". BIBA lo cita como estado del arte en EP2874923B1 y objeta que con él "objects, such as packets, can not be selectively conveyed in any direction in two dimensions (2D) independently of each other".

**Patentes con EXACTAMENTE el concepto del usuario (ejes fijos paralelos a los rodillos, 2 grupos de mecanum, 2 motores, sin swivel):**

| Patente | Titular / fecha | Arquitectura (citas) | Modos |
|---|---|---|---|
| CN111747090A (invención) / CN212314844U (modelo de utilidad) "麦克纳姆轮式分拣机" | 昆山同日工业自动化有限公司 (Tungray Kunshan Industrial Automation), pub. 2020-10-09 / 2021-01-08 | "the two driving electric drums 21 exist independently … preferably the DC24V driving electric drum 21 existing on the market as the driving power"; eje "rotatably installed" entre "two symmetrically distributed supports 2214"; "a plurality of Mecanum wheels are arranged on the transmission shaft, and spacers are arranged between adjacent Mecanum wheels"; ruedas en grupos izq/der "opposite in rotation direction"; se integra en el transportador de rodillos sin ocupar altura ("does not occupy the vertical space") | "当麦克纳姆轮左轮组222向前运转，麦克纳姆轮右轮组221不运转，货物向左前以45度角输出"; "left wheel group 222 runs forward, the … right wheel group 221 runs backward, and the goods are sorted and conveyed at 90°"; "the goods are output at any angle forward to the left, and the size of the angle depends on the speed difference between the left and right wheels" |
| CN213863900U "一种麦克纳姆轮分拣机" | 青岛孚鼎泰智能技术有限公司 (FDT Qingdao), pub. 2021-08-03 | "通过间隔布设的第一轴套管和第二轴套管分别在第一电动滚筒和第二电动滚筒的驱动下实现转动，设置在第一轴套管和第二轴套管上的麦克纳姆轮的设置方向不同" (dos manguitos de eje hexagonales intercalados, cada uno arrastrado por un rodillo motorizado vía poleas multi-V; inclinación de rodillos de ambas familias en ángulo agudo entre sí) | dirección de transporte ajustable invirtiendo cada tambor |
| CN222922403U "可快速更换麦克纳姆轮的分拣机" | 湖州鑫盛智能装备科技有限公司, pub. 2025-05-30 | "the first power assembly is used for driving the first rotating shaft to synchronously rotate, the second power assembly is used for driving the second rotating shaft to rotate"; cita CN213863900U como base; ejes con tramo desmontable para cambiar ruedas | ídem; motivación: "bottleneck equipment affecting the speed of an automatic sorting system is a sorting machine" |
| CN212639043U / CN111591665B "无升降动作的分拣机" | 东风设计研究院有限公司 (Dongfeng Design Institute), pub. 2021-03-02 / 2025-01-21 | "first wheeled sorting machine drive (5), second wheeled sorting drive (6)"; lechos de rodillos "dextrorotation" y "levogyration" con mecanum | "the left rotary wheel 29 … and the right rotary wheel 22 … rotate in the same direction or in the reverse direction to realize the straight-moving, left-moving and right-moving" (bandejas planas de asientos de automóvil) |
| CN220555502U "带有麦轮换向机构的输送线" | 中天钢铁集团(淮安)新材料有限公司, pub. 2024-03-05 | "Unpowered balls on the wheat wheel a and the wheat wheel b are inclined at 45 degrees, and the wheat wheel a and the wheat wheel b are installed in a mirror image mode"; ejes a/b alternados, 6–10 ruedas por eje, cada familia con su motorreductor por cadena | cambio de dirección 90° entre dos transportadores de rodillos |
| CN110538799A "全向智能快速分拣单元及分拨台" | 浙江朗奥物流科技有限公司, pub. 2019-12-06 | ruedas omni (no mecanum) "transverse omnidirectional wheel unit and a longitudinal omnidirectional wheel unit"; "four rows of longitudinally disposed omni wheels and six rows of transversely disposed omni wheels"; 2 motores (long./transv.), "independent driving and speed-regulating control channel for each driving motor" | cualquier dirección sin girar el mecanismo |
| CN210213984U "分拣输送模块及装置" | 北京京东乾石科技 (JD), pub. 2020-03-31 | "omnidirectional wheels distributed in rectangular array forming multiple omnidirectional wheel rows"; "one driving device drive a plurality of omniwheels through a transmission shaft"; ejes de ambas familias perpendiculares; "avoid all setting up a motor for every omniwheel, the cost is reduced" | selección de motor por dirección |

**Patentes relacionadas (ejes fijos pero otra función o más motores):** CN210434874U (SF Taisen, 2020): mecanum de familias ±45° intercaladas en ejes paralelos fijos, ejes sincronizados por correas y "the driving piece … used for driving any rotating shaft" → dispositivo de **centrado/alineación**, "the rotation axis of each first Mecanum wheel and … second Mecanum wheel are parallel to the second direction". CN209520057U (SF, 2019): plataforma de clasificación a 5+ salidas con "a plurality of independently driven mecanum wheels", "sorting in eight directions" y zonas de corrección de desviación. CN109625822B (Qilu Univ., 2024): 4 omni por módulo a 90° entre sí y 45° al borde, 4 motores, ecuaciones de balance de velocidades. CN109081063A/CN108639702A (Shenzhen Huazhi, 2018): "At least three Mecanum wheels … uniformly distributed around the face plate center", "At least three driving motors". CN109013366A/CN208810595U (Guangdong Changlian / Inst. Automatización Shandong, 2018): "多个所述麦克纳姆轮的轴心分别与多个电机对应连接" (un motor por rueda). CN111689188A (Guangxi Univ., 2020): 4 rodillos en diagonal a 90° + bolas, "the rollers located in the four quadrants rotate in the same direction" para girar en el sitio. CN112850069B (SF Taisen, 2022): rueda pivotante que usa mecanum como transmisión por fricción: "assuming a mecanum wheel linear velocity of V, a roller axis at 45 ° to the main axis, and a transfer wheel linear velocity of sin45 ° × sin45 ° × V = 0.5V"; "Preferably, the roller axis of the Mecanum wheel is at an angle of 30-60 to the spindle." Ferag US20240002161A1 (2024): módulos "cluster" con bolas/rodillos/omni cada uno con su accionamiento; "Balls offer greater maneuverability and flexibility … compared to rollers or omnidirectional wheels."

**Literatura académica (yaw, deslizamiento, patrones de rueda, dependencia del bulto):**
- Keek, Loh, Chong, *Machines* 2021, 9, 43 (doi 10.3390/machines9020043): sobre lechos con ruedas acopladas: "The rollers in each Flexconveyor cell are mechanically joined … Flexconveyor is incapable of realizing the yaw or orientation control of the carton"; ruedas omni: "the omniwheel experiences slippage more easily than a conventional wheel"; en su prototipo "limited to operate at approximately 0.20 ms−1, which were around 20 and 60 RPM … to reduce the significance of wheel slippage at speed beyond 0.20 ms−1"; "The “E”-shaped wheel arrangement in the EOCC allows yaw control"; simulación con "42 EOCC cells comprising 147 actuators (DC motors)". Trabajo posterior: Keek et al. 2024, *Bull. Electr. Eng. Inform.* 13, 2298–2309, "Pre-slippage detection and counter-slippage for e-pattern omniwheeled cellular conveyor" (no leído).
- Zhang, Sun, Wang, Zhang, *Actuators* 2024, 13, 441 (doi 10.3390/act13110441): lecho mixto de omni horizontales/verticales de ejes fijos: "the package actually moves with a number of different wheel patterns depending on the location and size of the packages"; "some theoretically feasible areas may become infeasible if the desired package velocities are unachievable due to the wheel velocity limits"; "Using PID control, the actual trajectories of a package on the conveyor closely match the desired trajectories"; los celulares "relies on experience provided the package can always cover at least one module".
- Zaman & Wu, *IEEE Access* 2023 (doi 10.1109/ACCESS.2023.3275962): "A single module is designed as a hexagonal shape with three omni-wheels"; "The conveyor system is driven by DC motors equipped with omni-wheels"; "this system only measures the position of the transported package via external sensors".
- Zaher, Youssef, Shihata, Azab, Mashaly, *IEEE Access* 2022 (doi 10.1109/ACCESS.2022.3156924): planificación y clasificación por RL ("Q-learning, Double Q-learning, Deep Q-learning, and the Double Deep Q-learning algorithms") sobre lecho de ruedas omni; Azab et al., *Mechatronics* 87 (2022) 102896, "Kinematic modeling and control of omnidirectional wheeled cellular conveyor" (citado, no leído).
- Sun et al., CAC 2019 (doi 10.1109/CAC48633.2019.8997050): "By adjusting the speed of the omni-wheel, it is possible to move goods at a given speed, and adjust the attitude angle of goods in the process of movement".
- Kautsar et al., *J. Robotics and Control* 2025 (doi 10.18196/jrc.v6i4.26050): Q-RCR, "integrates Q-Learning for route optimization with a rule-based conflict resolution module" en lechos omni de 4 ruedas (rejillas 8×11 a 12×12).
- Uriarte et al. 2016, "Celluveyor – Zellulare Fördertechnik für hochflexible Materialflusssysteme", 25. Deutscher Materialfluss-Kongress (doi 10.51202/9783181022757-149) — no accesible.

**Síntesis técnica de lo leído (sin datos nuevos):** (i) con 2 motores (A, B) el lecho tiene 2 grados de libertad de mando → se obtiene v_x y v_y, pero la rotación de la caja queda determinada por qué ruedas toca y no es controlable (BIBA/Keek); (ii) el patrón de contacto cambia con tamaño y posición de la caja (Zhang 2024), por lo que una caja de 300×250 mm sobre paso 76,2 mm apoya en ≤4 ejes y ≤3–4 ruedas por eje; (iii) el deslizamiento es mayor en ruedas omni y crece con la velocidad (Keek: límite 0,2 m/s en prototipo académico); (iv) los fabricantes comerciales condicionan la carga/velocidad máximas a fondo liso y a la combinación velocidad×carga (Flowsort, Interroll, Itoh).

---

## 3. Tabla de datos numéricos con fuente

| # | Tema | Dato | Cita textual | Fuente (URL) |
|---|---|---|---|---|
| 1 | Flowsort SLD/DLD | Velocidad 0,1–1,5 m/s | "Diverter speed 0,1 – 1,5 m/s" | https://robotunits.com/wp-content/uploads/2023/02/Instruction-Manual-SLD-DLD-24V-V5-REV1.2-v5.2_e.pdf |
| 2 | Flowsort SLD/DLD | Carga máx. 35 kg | "Max. load capacity 35 kg – Maximum load capacity is depending on the combination of speed & load" | ídem |
| 3 | Flowsort SLD/DLD | Disco Ø180 / rodillo Ø58 PU | "Wheel diameter 180mm … Roller diameter 58mm … Roller material Plastic with PU cover" | ídem |
| 4 | Flowsort SLD/DLD | Giro 180° en 0,3 s; ángulo −90…+90° | "Swivel time 180° in 0,3 sec"; "α-angle -90° up to +90°" | ídem |
| 5 | Flowsort SLD/DLD | Anchos 400–1000 mm, largo 200/400 mm, 15–100 kg | "SW (Sorter width) 400mm, 600mm, 800mm and 1000mm (max. +50mm)"; "Length SLD = 200mm / DLD = 400mm"; "Weight 15 – 100 kg" | ídem |
| 6 | Flowsort SLD/DLD | Motores y controlador | "Motor; PGD024-SE2-11AAA", "Motor; PGD024-SE2-15AAA", "Controller; Conveylinx-Ai2" | ídem |
| 7 | Flowsort SLD/DLD | Controlador 0,05 kW; fondo liso | "Controller DC24V – Max. power consumption 0,05kW"; "preferably with smooth bottom surfaces" | ídem |
| 8 | Flowsort integración | PGD ratio 11: 52–528,9 rpm | "This motor has a minimum of 52 RPM and a maximum of 528.9 RPM." | https://flowsort.com/wp-content/uploads/2026/03/Integration-Manual-SLD-DLD-24V-V3-1-2.pdf |
| 9 | Flowsort integración | 0,15–1,55 m/s en rueda Ø58 | "520 pulse which results in 0.15 m/s"; "5289 pulse which results in 1.55 m/s on the blue wheels" | ídem |
| 10 | Flowsort integración | Homing periódico | "Low speed (0 – 0.75m/s) High speed (0.75 – 1.55m/s) … 100 … 85 … 75 … 50 sortation movements" | ídem |
| 11 | Flowsort Eco Flow | 1,5 m/s; 6000 pph; 150×150; 50 g–35 kg | "Maximum wheel speed 1,5 m/s"; "Max sorting capacity 6000 pph"; "Min product dimensions 150 x 150 mm" | https://www.flowsort.com/product/eco-flow-sld/ |
| 12 | Flowsort Speed Flow | 2,0 m/s; 7800 pph; servo 24/48 V | "Maximum wheel speed 2,0 m/s"; "Max sorting capacity 7800 pph"; "24/48 Volt High-speed servo drive" | https://www.flowsort.com/product/speed-flow-sld/ |
| 13 | Flowsort MLD | 80×80 mm mín.; 373,2 mm; 2 filas; stepper | "Min product dimensions 80 x 80 mm"; "Module length 373,2 mm"; "Advanced stepper drive" | https://www.flowsort.com/product/multi-flow-mld/ |
| 14 | Flowsort MLD manual | Corriente por fila; 0,1–1,5 m/s | "Rated Motor Output Current / row 2.5A x 2 (ECO), 3.5A x 2 (Boost and Boost-8)"; "ZigZag sorter speed 0,1 – 1,5 m/s – Faster on request" | https://flowsort.com/wp-content/uploads/2026/03/Instruction-Manual-ZigZagSorter-24V-REV1-5-v6-1_EN.pdf |
| 15 | Flowsort X-Flow | 0,1–0,42 m/s; 1700 pph; 50 kg | "Belt speed 0.1 - 0,42 m/s"; "Max sorting capacity 1700 pph"; "Max product weight 50 kg" | https://www.flowsort.com/product/x-flow-90/ |
| 16 | Pulseroller PGD 24 V | 40/50 W; 2,5/3,5 A; 5800/4200 rpm motor | "40W (50W in BOOST Mode)"; "2.5A (3.5A in BOOST Mode)"; "5800 ECO / 4200 BOOST & BOOST-8" | https://www.pulseroller.com/products/24-volt/senergy-senergy-ai-drives/pulse-geared-drive |
| 17 | Pulseroller PGD-Ai 48 V | 50 W; 1,6 A | "Nominal Power Output: 50W"; "Rated Current: 1.6A" | https://www.pulseroller.com/products/48-volt/senergy-ai-48-drives/pulse-gear-drive |
| 18 | Itoh F-RAT-NX75 | 24 V/4,9 A; 50 kg; 56 W | "RATED INPUT: DC24V / 4.9A … PAYLOAD: max 50 kg … RATED POWER: 56W" | https://itoh-denki.com/wp-content/uploads/2021/05/Technical-document-FRAT-NX75-EN.pdf |
| 19 | Itoh F-RAT-NX75 | 3 MDR | "F-RAT uses MDR for each of carrier wheel transfer, roller transfer, and transfer surface switch (3 axes in total)" | ídem |
| 20 | Itoh F-RAT-NX75 | Tamaño mín./máx. | "Minimum load size : 225 x 225mm"; "Maximum load size : -100mm from the length and the width of F-RAT-NX75" | ídem |
| 21 | Itoh F-RAT-NX75 | Ciclo conmutación 1,10 s; arranque 15 ms | "One cycle time = 1,10 sec"; "Time from RUN signal input to motor starting 15 msec or less" | ídem |
| 22 | Itoh F-RAT-NX75 | Dependencia del fondo | "throughput depends on the size, material, bottom status of trays, ambient temperature, and/or the speed" | ídem |
| 23 | Itoh F-RAT NX brochure | 2250 totes/h al 50 % | "transfer rate of up to 2,250 totes handled per hour (at a 50% transfer rate)" | https://itoh-denki.com/wp-content/uploads/2021/07/Product-brochure-F-RAT-NX-EN.pdf |
| 24 | Itoh F-RAT NX brochure | 125 mm; tamaños 595–895 × 395–795 | "Only 125 mm"; "From 595 to 895 mm"; "From 395 to 795 mm" | ídem |
| 25 | Itoh F-RAT-NX75 (US) | 56/197 FPM; 2250 c/h; rodillos 48,6/57 mm | "Line speed: 56 or 197 FPM"; "Transfer capacity: 2250 c/hr (based on 13.8” x 15.4”, 66 lb. package)"; "Roller diameter: (2) 48.6 mm and (1) 57.0 mm" | https://www.itohdenki.com/_files/ugd/ca634a_d726e039c3ab4642870d0717178f94c7.pdf |
| 26 | Itoh F-RAT-S300 | 56/197/295 FPM; 2500 c/h; 10 kg a 295 FPM | "Line speed: 56, 197, or 295 FPM"; "Transfer capacity: 2500 c/hr"; "90 (295 FPM) 10 kg (22 lbs)" | ídem |
| 27 | Itoh MABS2 | 295 FPM; 4300 c/h; 30 kg; 2 MDR | "Transfer capacity: 4300 c/hr"; "90 (295 FPM) 30 kg (66 lbs) 239 kg (528 lbs)"; "Simplified transfer using 2 MDRs" | ídem |
| 28 | Itoh F-RAT-U225 | 56/197 FPM; 50 kg; 225×225; 125 mm | "Max Load Weight: 110 lbs (50 kg)"; "Min. Package Size: 225 mm x 225 mm" | https://www.itohdenki.com/f-rat-u225 |
| 29 | Itoh Pop-D | 197 FPM; 170 mm; 300×300; 30/45° | "197 FPM"; "170 mm (6.7")"; "300 mm x 300 mm"; "30 or 45 degree angle transfer" | https://www.itohdenki.com/pop-d-wheel-divert |
| 30 | Itoh MABS (web) | 295 FPM; 150×100; 175 mm | "295 FPM"; "Min. Package Size: 150 mm x 100 mm"; "175 mm (6.9")" | https://www.itohdenki.com/ball-sorter |
| 31 | Interroll HPD RM8711 | 50 kg; 1,4 m/s; 0,3 s/90°; 30/45/90° | "Max. load capacity* 50 kg"; "Max. swivel roller speed* 1.4 m/s"; "Swiveling time 0.3 s per 90°"; "Diverting angle 30°/45°/90°" | https://www.interroll.com/fileadmin/products/product_data/RM-8711/RM8711_EN.pdf |
| 32 | Interroll HPD RM8711 | Casetes 120 mm; anchos 420/620/840 | "One HPD module can consist of several cassettes, each 120 mm long"; "Rated width 420, 620, 840 mm" | ídem |
| 33 | Interroll HPD manual | Paso 60×60; 330 mm; ø4; 420–1020 mm; ≤70 dB(A) | "Roller pitch (P) 60 mm in x and y-direction"; "Overall height 330 mm"; "Round belt ø 4 mm"; "Between frames 420 - 1020 mm" | https://www.interroll.com/fileadmin/user_upload/AMERICAS/User_Manuals/8711_8712_8713_Interroll_High_Performance_Divert_EN_T.Nr.1103991_V1.1.pdf |
| 34 | Interroll HPD PLC | 2 motores 5,2 A / 9 A; homing < 200 ms | "Each motor needs 5,2A nominal power, 9A peak power"; "the process then only takes less than 200ms" | https://www.interroll.com/fileadmin/user_upload/A_FRANCE/French/MCP_techni_doc/MultiControl_HPD_PLC_rev04.pdf |
| 35 | Interroll MT-S | 1,5 m/s; 2500–21 600/h; 8 kg | "up to 1.5 m/s"; "2,500 - up to 21,600 items/hour"; "up to 8 kg" | https://www.interroll.com/products/sorters/mt-s-split-tray-sorter |
| 36 | Wayzim pivot wheel | 2,3 m/s; ≥10 000 pcs/h | "最高运行速度 2.3m/s"; "小件理论分拣效率 ≥10,000pcs/h" | https://www.wayzim.com/product/overview/Pivot-Wheel-Sorter |
| 37 | Damon | catálogo de sorters | "Swivel Wheel Sorter"; "Skewed Wheel Diverter"; "It can realize single-direction, bidirectional and multi-angle sorting" | https://www.damon-group.com/intelligent-sorting-system-62 |
| 38 | cellumation celluveyor | celdas 150/200 mm; 1,15 m/s; fondo plano | "150 Cell: 150mm x 150mm"; "Up to 1.15 m/s"; "as long as the object floor is almost flat" | https://cellumation.com/products/celluveyor/ |
| 39 | cellumation | 3 ruedas omni independientes por celda | "three omnidirectional and independently driven wheels per cell" | https://www.cellumation.com/ |
| 40 | cellumation cv.CROSSDOCK | 6000 pph; 1,3 m² | "up to 6.000 pph"; "from 1,3 m²" | https://cellumation.com/products/cv-crossdock/ |
| 41 | BIBA EP2874923B1 | rotación requiere ≥3 unidades | "If at least three or exactly three omnidirectional conveyor units are provided, in addition, a rotation of the objects is possible" | https://patents.google.com/patent/EP2874923B1/en |
| 42 | US5396977A | ejes fijos con omni, 1 motor por grupo | "Motor means independently drive each one of the shafts of each of shaft pairs."; "the four motors M1, M2, M7, and M8 provide independent driving of the four groups of shafts" | https://patents.google.com/patent/US5396977A/en |
| 43 | Hytrol ProSort SC | 300 FPM; 75 lb; 6×9 in | "300 FPM maximum."; "Maximum unit package weight: 75 lbs."; "Minimum: 6 in. wide x 9 in. long" | https://www.cisco-eagle.com/uploads/Hytrol-Spec-Sortation/ProSort-SC1-SC2-Specs.pdf |
| 44 | Hytrol ProSort SC | ruedas 3 1/8 in, correas 3/8 in, 30–40 psi | "Two banks of twin pivoting 3 1/8 in. dia. wheels with urethane treads driven by 3/8 in. dia. urethane belts"; "Working pressure 30 to 40 PSI" | ídem |
| 45 | Hytrol blog (secundaria) | 65–80 cajas/min | "exceed sortation rates of 65 cases per minute"; "as high as 80 cases per minute" | https://blog.hytrol.com/hytrol-sc-pivoting-wheel-sorter/ |
| 46 | Hytrol manual SC | rueda 5/32 in sobre correa | "The diverter will be adjusted to a height of 5/32 in. above the top of the belt." | https://cdn.hytrol.com/2022_660_prosortsc.pdf |
| 47 | Dematic (secundaria) | 40–80 cajas/min; 110 lb; 4 filas | "sort rates from 40 to 80 cartons/min"; "weighing up to 110 lb."; "the 4 rows of wheels turn in a forward direction" | https://www.foodengineeringmag.com/articles/89628-steerable-wheel-sorter |
| 48 | CN111747090A Tungray | 2 tambores 24 V; 90° por contrarrotación; ángulo por Δv | "the two driving electric drums 21 exist independently"; "goods are sorted and conveyed at 90°"; "the size of the angle depends on the speed difference between the left and right wheels" | https://patents.google.com/patent/CN111747090A/en |
| 49 | CN212314844U Tungray | modelo de utilidad gemelo | "Mecanum wheel sets…arranged in pairs and opposite in rotation direction" | https://patents.google.com/patent/CN212314844U/en |
| 50 | CN213863900U FDT | 2 tambores, 2 manguitos hexagonales | "通过间隔布设的第一轴套管和第二轴套管分别在第一电动滚筒和第二电动滚筒的驱动下实现转动" | https://patents.google.com/patent/CN213863900U/en |
| 51 | CN222922403U Huzhou Xinsheng | 2 ejes, 2 conjuntos de potencia (2025) | "the first power assembly is used for driving the first rotating shaft to synchronously rotate, the second power assembly is used for driving the second rotating shaft to rotate" | https://patents.google.com/patent/CN222922403U/en |
| 52 | CN212639043U Dongfeng | 2 accionamientos; recto/izq/der | "rotate in the same direction or in the reverse direction to realize the straight-moving, left-moving and right-moving" | https://patents.google.com/patent/CN212639043U/en |
| 53 | CN220555502U Zhongtian | mecanum a/b espejo 45°, 2 motores | "Unpowered balls on the wheat wheel a and the wheat wheel b are inclined at 45 degrees, and … installed in a mirror image mode" | https://patents.google.com/patent/CN220555502U/en |
| 54 | CN110538799A Lang'ao | omni long./transv., 4+6 filas, 2 motores | "four rows of longitudinally disposed omni wheels and six rows of transversely disposed omni wheels" | https://patents.google.com/patent/CN110538799A/en |
| 55 | CN210213984U JD | filas de omni en eje común | "one driving device drive a plurality of omniwheels through a transmission shaft"; "avoid all setting up a motor for every omniwheel, the cost is reduced" | https://patents.google.com/patent/CN210213984U/en |
| 56 | CN210434874U SF Taisen | ejes fijos ±45°, sincronizados, alineación | "the rotation axis of each first Mecanum wheel and the rotation axis of each second Mecanum wheel are parallel to the second direction" | https://patents.google.com/patent/CN210434874U/en |
| 57 | CN112850069B SF Taisen | mecanum 45° transmite 0,5 V | "a transfer wheel linear velocity of sin45 ° × sin45 ° × V = 0.5V"; "roller axis of the Mecanum wheel is at an angle of 30-60 to the spindle" | https://patents.google.com/patent/CN112850069B/en |
| 58 | CN209520057U SF | mecanum independientes, 8 direcciones | "a plurality of independently driven mecanum wheels"; "perform sorting in eight directions" | https://patents.google.com/patent/CN209520057U/en |
| 59 | CN109625822B Qilu | 4 omni a 90°/45°, 4 motores | "the axial included angle of each adjacent omnidirectional wheel is 90 degrees"; "45 degrees" al borde | https://patents.google.com/patent/CN109625822B/en |
| 60 | CN109081063A Huazhi | ≥3 mecanum + ≥3 motores por unidad | "At least three Mecanum wheels … At least three driving motors" | https://patents.google.com/patent/CN109081063A/en |
| 61 | CN109013366A Changlian | un motor por mecanum | "多个所述麦克纳姆轮的轴心分别与多个电机对应连接" | https://patents.google.com/patent/CN109013366A/en |
| 62 | CN111689188A Guangxi | 4 rodillos a 90° + bolas; giro in situ | "the rollers located in the four quadrants rotate in the same direction" | https://patents.google.com/patent/CN111689188A/en |
| 63 | Ferag US20240002161A1 | bolas > rodillos/omni | "Balls offer greater maneuverability and flexibility in a conveyor system application compared to rollers or omnidirectional wheels." | https://patents.google.com/patent/US20240002161A1/en |
| 64 | Keek 2021 Machines | acoplamiento mecánico ⇒ sin yaw | "Flexconveyor is incapable of realizing the yaw or orientation control of the carton" | https://doi.org/10.3390/machines9020043 |
| 65 | Keek 2021 Machines | deslizamiento; 0,20 m/s | "the omniwheel experiences slippage more easily than a conventional wheel"; "to reduce the significance of wheel slippage at speed beyond 0.20 ms−1" | ídem |
| 66 | Zhang 2024 Actuators | patrón de ruedas depende de caja | "the package actually moves with a number of different wheel patterns depending on the location and size of the packages" | https://doi.org/10.3390/act13110441 |
| 67 | Zhang 2024 Actuators | límites de velocidad de rueda | "some theoretically feasible areas may become infeasible if the desired package velocities are unachievable due to the wheel velocity limits" | ídem |
| 68 | Zaman & Wu 2023 IEEE Access | celda hexagonal 3 omni | "A single module is designed as a hexagonal shape with three omni-wheels" | https://doi.org/10.1109/ACCESS.2023.3275962 |
| 69 | Sun 2019 CAC | control de actitud por velocidades | "adjust the attitude angle of goods in the process of movement so as to arbitrarily change the shipping pose" | https://doi.org/10.1109/CAC48633.2019.8997050 |

*[cálculo propio]* Conversiones: 56 FPM = 0,28 m/s; 197 FPM = 1,00 m/s; 295 FPM = 1,50 m/s; 300 FPM = 1,52 m/s; 60 m/min = 1,0 m/s; 6000 pph = 100/min; 2250 c/h = 37,5/min; 4300 c/h = 72/min; 65–80 cajas/min = 3900–4800/h. Objetivo del usuario 1,5 m/s en Ø50 = 573 rpm, frente a 528,9 rpm máx. del PGD ratio 11 de Flowsort en Ø58 (1,55 m/s).

---

## 4. Lo que NO se encontró y dudas

- **Producto comercial occidental con lecho mecanum de ejes fijos y 2 motores (sin swivel):** NO ENCONTRADO. Buscado en Flowsort, Interroll, Itoh Denki, cellumation, Rotzinger, Hytrol, Dematic (prensa), TGW/Fives (sitios bloqueados 403/404), Damon, Wayzim, Made-in-China y en Google Patents (consultas EN/ZH: "mecanum conveyor divert/sorting/shaft/belt", "麦克纳姆轮 分拣 电动滚筒/传动轴/两个电机", "omnidirectional wheel sorting conveyor", "45 degree roller conveyor divert"). Lo más cercano son patentes de fabricantes chinos (Tungray, FDT, Huzhou Xinsheng, Dongfeng) sin ficha técnica pública.
- **Velocidad y throughput de los sorters mecanum chinos patentados:** NO ENCONTRADOS (las patentes no dan cifras).
- **Aceleraciones (m/s²)** de ningún producto: NO ENCONTRADAS; Flowsort solo expone parámetros de rampa 10–10000 sin unidades en el Integration Manual; Interroll HPD solo "0.3 s per 90°"; Itoh solo tiempos de ciclo.
- **Throughput del Interroll HPD:** NO ENCONTRADO en ficha/manual. **Página web actual del HPD:** no localizada (la sección "sorters" de interroll.com ya no lo lista).
- **Par nominal del PGD024 por relación de reducción (11/15):** NO ENCONTRADO (manula.com bloqueado).
- **Damon Industry:** especificaciones numéricas de Swivel Wheel Sorter / Skewed Wheel Diverter NO ENCONTRADAS (descargas requieren registro). **Wayzim:** tamaños/pesos NO ENCONTRADOS.
- **cellumation:** diámetro de rueda omni, motor por rueda, carga por celda NO ENCONTRADOS; ficha del celluveyor (paper DMK 2016) no accesible.
- **Dematic steerable wheel:** solo prensa (Food Engineering 2012); no se halló ficha oficial. **TGW / Fives:** sin acceso.
- **Rotzinger:** no fabrica desviadores omni (Rotzinger Transver AG = cintas para alimentos). Posible confusión de nombre en el encargo.
- **Literatura específica sobre "lecho mecanum de ejes fijos con 2 familias y 2 motores"** (control de guiñada, deslizamiento cuantificado, velocidad lateral efectiva): NO ENCONTRADA como tal; los trabajos leídos tratan celdas omni con 3+ motores o lechos con una rueda por motor. Datos cuantitativos de deslizamiento: solo el límite de 0,20 m/s del prototipo de Keek (2021) y la relación 0,5·V de SF (configuración distinta: mecanum como transmisión por fricción a una rueda de transporte).
- **Dudas:** (a) Flowsort declara "35 kg" con la salvedad de velocidad×carga, sin curva publicada; (b) Itoh F-RAT: "2250 c/hr" está condicionado a caja 13,8×15,4 in de 66 lb y 50 % de desvío; (c) la afirmación de US5396977 sobre pérdida de "stability of direction" con rodillos sucios/mojados se refiere a la técnica anterior y no aporta cifras; (d) CN213863900U solo se leyó vía resumen/XHR (la página completa devolvió 503 al reintentar).

---

## 5. Implicaciones para el diseño (sin decidir por el equipo)

1. **Velocidad:** el objetivo de 1,5 m/s coincide con el techo de catálogo de Flowsort Eco (1,5), Itoh MABS2/S300 (1,5 con carga reducida), Hytrol SC (1,52) y supera al HPD (1,4) y al celluveyor (1,15); todos ellos con ruedas Ø50–80 mm accionadas a 24/48 V. Ninguno publica un lecho mecanum de ejes fijos funcionando a esa velocidad; el único dato académico de deslizamiento (0,20 m/s) es de un prototipo de laboratorio y no es extrapolable, pero sugiere ensayar el deslizamiento a 1,0 y 1,5 m/s con las tres cajas declaradas.
2. **Guiñada:** con un motor por familia el sistema tiene 2 GDL de mando; la literatura y BIBA indican que la rotación de la caja no es controlable sin ≥3 accionamientos independientes. Convendría prever (o medir en el prototipo) el giro parásito en desvío a 90° y la necesidad de guías/alineador aguas abajo (SF usa lechos mecanum fijos precisamente como alineador, CN210434874U).
3. **Cobertura de ruedas:** con paso 76,2 mm y ruedas Ø50, la caja de 300×250 mm apoya en 3–4 ejes; Zhang et al. muestran que el patrón de contacto cambia con posición/tamaño y que los límites de velocidad de rueda reducen el espacio factible. Un módulo de 8 ejes (≈610 mm) es comparable en largo a un F-RAT (595–895 mm) y al doble de un DLD (400 mm).
4. **Fondo de la caja:** todos los fabricantes condicionan el rendimiento a fondos lisos/planos; las cajas vacías de 0,5 kg (poca fuerza normal) y las de fondo irregular son el caso a ensayar primero.
5. **Referencias de motorización:** Flowsort resuelve 1,55 m/s con PGD024 de 40 W (ratio 11, 528,9 rpm) por cada conjunto Ø58; Interroll HPD usa 2 motores 24/48 V de 5,2 A; Itoh 56 W para 3 MDR. Un NEMA 23 + driver básico está fuera de este patrón industrial (BLDC 24/48 V con controlador Ethernet), lo que afecta al requisito de "producto industrial confiable" pero no al prototipo.
6. **Homing y juego mecánico:** Flowsort exige homing cada 50–100 desvíos y Interroll cada ≤30 s; en un lecho de ejes fijos este problema desaparece (no hay posición angular), lo que es una ventaja documentable del concepto.
7. **Antecedentes de propiedad industrial:** el concepto exacto está publicado en CN111747090A/CN212314844U (2020–21), CN213863900U (2021), CN222922403U (2025) y US5396977 (1995); estas divulgaciones limitan la patentabilidad del concepto básico pero, al ser públicas y (en el caso US) expiradas, documentan que la arquitectura es conocida.
