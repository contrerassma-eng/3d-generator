# Investigación: controladores candidatos para el "Conveyone Zone Controller" (CZC)

Proyecto: Conveyone (Chile) — línea ZPA con zonas ZP2026 (UniDrive 24 V + ZoneLogix Plus) y zonas especiales "Omni" (2 motores NEMA 23 por módulo, familias A/B, modos avance / desvío 90° / HOLD).
Fecha de acceso de todas las fuentes: **2026-09-03**. Fuentes primarias = fabricante/manual/hoja de datos; las secundarias (distribuidor, prensa técnica, snippet de buscador) están marcadas como tales. Los hechos numéricos con URL y cita están en la sección 3 y en `research_controladores_din.md.facts.json`.

---

## 1. Resumen ejecutivo

1. **Ningún ESP32 DIN comercial reúne todo lo que pide el CZC** (2 puertos Ethernet para cadena upstream/downstream, CAN, RS-485, DI 24 V aisladas tipo IEC 61131-2 y certificación UL). Los más cercanos para prototipo son **M5Stack StamPLC** (RS485 + CAN + 8 DI opto 5–36 V, 42,90 USD, pero sin Ethernet y solo 0–40 °C) y **Waveshare ESP32-S3-ETH-8DI-8RO(-C)** (Ethernet W5500 + RS485 aislado + 8 DI opto + variante CAN, ≈45–50 €); **Norvi ENET/IIOT** son los únicos ESP32 DIN con declaración EN 61131-2 / EN 61010 pero están agotados y no tienen CAN.
2. **No existe una placa ESP32 comercial con dos RJ45 (switch integrado)**; Espressif sí mantiene el driver KSZ8863 (switch de 3 puertos) para ESP32 y ESP32-P4, y un proyecto comunitario (feb-2026) lo está diseñando. Para dos CAN independientes, **ESP32-C6 tiene 2 TWAI y ESP32-P4 3 TWAI** (ESP32/S3 solo 1).
3. Un esclavo EtherCAT/PROFINET/EtherNet-IP "serio" sobre ESP32 no está resuelto: EasyCAT (LAN9252) no lista ESP32 entre placas probadas y el único proyecto ESP32+EasyCAT PRO hallado está "NOT fully working"; OpENer no tiene port ESP32 documentado; p-net exige tramas L2 crudas y licencia comercial (490 €/año + 3.000 €). Los módulos embebidos certificados (**Anybus CompactCom 40 Brick**, **Hilscher netX 90 / netRAPID 90**) sí ofrecen 2 puertos + pila certificada + SPI hacia el host, pero sin precio público.
4. Como controlador de zona industrial "de compra", **Arduino Opta** (cULus UL 61010-2-201, IEC 61131-3, -20…50 °C, 166 USD) es el único de la lista con UL, pero tiene 1 Ethernet, sin CAN y entradas no aisladas; **Controllino MAXI Automation** declara EN 61131-2 y datos de vibración, pero sin RS485/CAN y entradas sin aislamiento galvánico; **Unipi Patron S107** (Linux, 479 €) es un gateway/PLC, no un controlador de zona económico.
5. Las tarjetas de zona comerciales con lógica ZPA local + modo PLC y **switch Ethernet integrado para daisy chain** existen y están certificadas: **ConveyLinx-Ai2** (3 puertos RJ45, EIP/PROFINET/Modbus TCP/CC-Link, UL Recognized/ETL, 651,82 USD), **Interroll MultiControl AI** (switch de 2 puertos M12 D, PROFINET/EIP/EtherCAT, UL-listed, 4 zonas, ≈326 USD) e **Itoh Denki IB-E03B/E04F** (2 puertos, EtherNet/IP, UL/cUL, ≈658 USD). Ninguna controla un motor paso a paso NEMA 23: para los Omni haría falta **Beckhoff EK1100 + EL7047** (48 V, 5 A, UL) o un driver propio.
6. Gateways CAN/Modbus→EtherNet/IP/PROFINET listos: Anybus AB7318 (CAN→EIP, 1.216 USD), AB7317 (CAN→PROFINET), ABC4013/ABC4090 (Ethernet↔Ethernet, 955 USD), Hilscher NT 151-RE-RE (448–1.338 USD), Moxa MGate 5105 (Modbus↔EIP, ≈682–916 USD). Un PLC compacto con dos puertos (S7-1215C 649,99 USD; CompactLogix 5380) puede hacer de cabecera/gateway.
7. Evaluación preliminar: **prototipo** = ESP32-S3/C6 en placa DIN existente (StamPLC o Waveshare 8DI-8RO-C) + CAN/RS-485 encadenado por dos conectores en la misma caja; **producto** = PCB propia (ESP32-P4/C6 o MCU industrial) con DI IEC 61131-2 aisladas, watchdog externo, dos Ethernet vía KSZ8863 o módulo Anybus/netRAPID para el gateway, o bien Ruta A/C reutilizando tarjetas comerciales certificadas.

---

## 2. Hallazgos por sub-tema

### 2(a) ESP32 (y afines) en carril DIN — tabla comparativa

Leyenda: ✔ = sí, ✘ = no, "—" = no declarado por el fabricante, (s) = fuente secundaria. Precios y disponibilidad del 2026-09-03.

| Modelo | CPU | Ethernet | CAN | RS-485 | DI 24 V aisladas | Salidas | Alim. | Temp. | Cert. declaradas | Precio / stock |
|---|---|---|---|---|---|---|---|---|---|---|
| Norvi ENET-AE06-T | ESP32-WROOM32 | 1 (W5500) | ✘ | ✘ | 8× 18–32 V (sink/source) | 4 transistor OC 100 mA/36 V | 24 V DC 0,4 A | -10…+85 °C | EN 61131-2:2007, EN 61010-1, EN IEC 61010-2-201, EMC 2014/30/EU | 119 USD, **agotado** |
| Norvi IIOT-AE01-R | ESP32-WROOM32 | ✘ | ✘ | ✔ half-duplex | 8× 18–32 V | 6 relés 5 A + 2 transistor | 24 V DC | -10…+85 °C | EN 61131-2 / EN 61010 | 88,21 USD, **agotado** |
| Norvi GSM-AE0x (s) | ESP32-WROOM-32 | solo AE08 (W5500) | ✘ | ✔ | 8× 24 V | relés 5 A / OC | 24 V DC | — | — | 82–187 USD (2G) |
| KinCony KC868-A8v3 | ESP32-S3-WROOM-1U | 1 (W5500) | ✘ | ✔ | 8× opto (contacto seco) | 8 relés 250 V/10 A | 12/24 V DC | — | — | 80 USD |
| KinCony KC868-A16v3 | ESP32-S3-WROOM-1U | 1 (W5500) | ✘ | ✔ | 16× opto (contacto seco) | 16 MOSFET | 12/24 V DC | — | — | 60 USD |
| Industrial Shields ESP32 PLC 21 | ESP32 (WROOM-32U) | 1 (W5500) | opción (s) | ✔ | 5× aisladas 7–24 V + 6 A/D + 2 INT | 8× digital aislada 5–24 V (3 PWM/analóg.) | 12–24 V DC | 0…+60 °C (s, PLC 14) | ETL/UL 61010 **solo M-Duino** (s); ESP32: NO ENCONTRADO | 239 € (s) |
| M5Stack StamPLC | ESP32-S3FN8 | ✘ | ✔ (PWR-CAN) | ✔ (PWR-485) | 8× opto 5–36 V | 4 relés 5 A | 6–36 V DC | 0–40 °C | — | 42,90 USD, en stock |
| Waveshare ESP32-S3-ETH-8DI-8RO / -C | ESP32-S3-WROOM-1U-N16R8 | 1 (W5500 SPI) | solo variante -C (aislado) | ✔ aislado | 8× opto bidir. 5–36 V | 8 relés 10 A | 7–36 V | — | — | 44,95–49,95 € (s) |
| Waveshare ESP32-S3-Relay-6CH | ESP32-S3 | ✘ | vía HAT | ✔ aislado | ✘ | 6 relés 10 A | 7–36 V | — | — | 27,85 € (s) |
| Olimex ESP32-POE-ISO(-IND) | ESP32-WROOM-32 | 1 (LAN8710, PoE aislado 3 kV) | ✘ | ✘ | ✘ (GPIO 3,3 V) | GPIO | PoE / 5 V | -40…+85 °C (IND) | CE-RED, LVD, OSHW | 24,95 € / 31,09 USD (DigiKey, stock 0) |
| Olimex ESP32-EVB(-IND) | ESP32-WROOM-32E/UE | 1 (LAN8720) | ✔ (transceptor) | ✘ | ✘ | 2 relés 10 A | 5 V DC | -40…+85 °C (IND) | DoC UE/UKCA, OSHW | 19,95 € |
| Arduino Opta RS485 | STM32H747XI | 1 (10/100) | ✘ | ✔ | 8× 0–24 V **no aisladas** (VIH ≥6,6 V, VIL ≤4,46 V) | 4 relés NO 10 A | 12–24 V DC | -20…50 °C | **cULus UL 61010-2-201**, ENEC, CE, CB, UKCA, FCC | 166 USD, en stock |
| Controllino MAXI Automation | ATmega2560 (s) | 1 (RJ45 10/100) | ✘ | ✘ (variante Automation) | 18 entradas 24 V **sin aislamiento** (alto 18–26,4 V) | 10 relés 6 A aislados + 8 DO 2 A | 24 V (20,4–30 V) | 0–55 °C | EN 61010-1, EN 61010-2-201, EN 61131-2; vibración/choque declarados | 249 € sin IVA |
| Sfera Labs Iono RP D16 (s) | RP2040 | ✘ | ✘ | ✔ | hasta 16× 24 V **IEC 61131-2** (MAX22190) | hasta 16× 24 V 640 mA (MAX14912) | 12–28 V DC | — | CE/FCC/IC | desde 276 € |
| Unipi Patron S107 | i.MX 8M Mini (Linux) | 1 (100 Mbit) | ✘ | 2× aislado (+RS232) | 4× aisladas (≥7 V / ≤3 V, máx 35 V) | 4 NPN 750 mA | 24 V DC 3 W | 0…+55 °C | LVD/EMC/RoHS; MasterWatchdog | 479 € (s) |
| Turta IoT Node (s) | ESP32 | ✘ | ✘ | ✘ | ✘ | — | USB | — | — | placa de desarrollo, **no DIN** |
| DFRobot EDGE101 (extra) | ESP32 | 1 (10/100) | ✔ aislado | ✔ aislado | — (no especificadas) | — | 9–26 V DC | -20…+75 °C | CE/RoHS | 57 USD |

Observaciones:
- Solo Norvi y Controllino declaran conformidad con **EN 61131-2** (norma de equipos PLC); solo **Arduino Opta** declara **cULus**. Ningún ESP32 DIN de la lista muestra UL.
- Los únicos con **CAN + RS-485** en la misma caja: StamPLC, Waveshare 8DI-8RO-C, DFRobot EDGE101 (y ESP32-EVB solo CAN).
- Rango térmico: los productos de origen "maker" declaran 0–40 °C (StamPLC) o nada (KinCony, Waveshare); Norvi -10…+85 °C; Olimex -IND -40…+85 °C; Opta -20…50 °C.

### 2(b) Requisitos de un controlador de zona industrial — evidencia

| Requisito | Evidencia encontrada | Implicación para el CZC |
|---|---|---|
| Aislamiento galvánico de E/S | IEC 61131-2 define tipos 1/2/3 de entrada digital; ideal ≈2 mA en ON y umbral de transición entre 5 V y 11 V (TI SLLA370). Productos: Norvi (18–32 V, 4,7 kΩ), Waveshare/StamPLC (opto 5–36 V), Iono RP (MAX22190 IEC 61131-2), Unipi (≥7 V/≤3 V aisladas). Opta y Controllino **no** aíslan entradas. | Especificar DI tipo 3 (o tipo 1) aisladas por opto/ISO121x; relés o high-side aislados; RS-485/CAN aislados (Waveshare, DFRobot, Unipi lo hacen). |
| Watchdog HW externo | ESP-IDF trae IWDT/TWDT sobre temporizadores hardware internos, pero solo detectan ISR bloqueadas o tareas que no ceden, no fallos de hardware. Supervisores externos tipo MAX6369 (2,5–5,5 V, SOT23) o TPS3823 (timeout 1,6 s) accionan reset si no hay pulso en WDI. | Añadir supervisor externo con salida a reset del ESP32 **y** a la línea de habilitación de motores. |
| Brownout / reset seguro | Detector de brownout integrado y habilitado por defecto; en ESP32-S3 el nivel por defecto es 7 = 2,44 V (seleccionable hasta 3,30 V). | Alimentar el ESP32 desde 24 V con regulación que sobreviva caídas del bus de 48 V de motores; subir el nivel de brownout si se usa 3,3 V justo. |
| Arranque con salidas en OFF | Evidencia empírica: "On ESP32, at boot or reset, the GPIO pin is going high, then low" (pulso en GPIO32/33 que activa relés; pulldown de 4,7 kΩ no lo evita). Interroll exige que los motores no puedan arrancar de forma no intencionada. Texto normativo explícito de IEC 61131-2 sobre estado de salidas en power-up: **NO ENCONTRADO** (norma de pago). | Usar pines "seguros" no strapping, drivers con enable activo-bajo y pull a OFF por hardware, y latch de habilitación controlado por el watchdog. |
| OTA de firmware | ESP-IDF: dos slots ota_0/ota_1 + partición OTA data; rollback automático si la app no se confirma; anti-rollback por versión en eFuse. | Viable en prototipo y producto; exige diseñar el flujo "OTA por cadena" (upstream→downstream). |
| Rango de temperatura | Zona de conveyor típica: ConveyLinx 0–40 °C (opción -30…40, o -40…+50 según distribuidor), Interroll -30…+40 °C, Itoh -20…40 °C, Beckhoff EL 0–55 °C. ESP32 DIN: 0–40 (StamPLC) a -40…+85 (Olimex IND). | Producto: mínimo -20…+55 °C; elegir módulos ESP32 "-IND" y componentes industriales. |
| Vibración | Beckhoff EL7047/EL7411/EK1100: "conforms to EN 60068-2-6/EN 60068-2-27". Controllino declara 5–9 Hz 3,5 mm (random) / 9–150 Hz 1,0 g (random), choque 15 g 11 ms (ejemplo de producto EN 61131-2). Tabla de vibración de IEC 61131-2: NO ENCONTRADA en texto público. | Ensayar la PCB/caja según IEC 60068-2-6 con niveles al menos iguales a los de Controllino; fijar conectores (M8/M12 o bornes con retención). |

### 2(c) Dos puertos Ethernet / dos CAN / esclavos EtherCAT / módulos embebidos

| Opción | Estado / evidencia | Comentario |
|---|---|---|
| ESP32 + KSZ8863 (switch 3 puertos, RMII) | Driver oficial Espressif v0.2.11 con targets **ESP32 y ESP32-P4**; modos simple switch, managed switch y "port mode" (dos endpoints con MAC propia); gestión por I2C/SPI. | Es la vía "propia" para UPSTREAM/DOWNSTREAM Ethernet; requiere PCB propia (no hay producto comercial: foro HA feb-2026 "after 5 years of no one making this device available"). |
| ESP32-S3 + W5500 | Solo un puerto (SPI); el S3 no tiene EMAC. | Para dos puertos habría que poner dos W5500 sin switch (no es daisy chain transparente). |
| Waveshare ESP32-S3-ETH / ESP32-P4-ETH | Un solo RJ45 (P4: EMAC + IP101 RMII). | El ESP32-P4-ETH es la base natural para añadir un KSZ8863. |
| Dos CAN | ESP32/S3: 1 TWAI; **ESP32-C6: 2 TWAI**; **ESP32-P4: 3 TWAI**; siempre con transceptor externo; sin CAN FD. | Cadena CAN con dos conectores pasantes (un solo bus) no necesita dos controladores; dos buses separados sí (C6/P4). |
| STM32/RP2040 con switch | STM32H7 + KSZ8863/KSZ8794 discutido en foros ST; Oryx CycloneTCP tiene driver KSZ8794 (STM32/ESP32/PIC32). Producto DIN abierto: NO ENCONTRADO. | Alternativa si se abandona ESP32 para el producto. |
| EasyCAT (LAN9252) | Shield Arduino: 32+32 bytes (hasta 128), SPI; placas probadas Uno…STM32 Nucleo, **ESP32 no listado**. EasyCAT PRO: para ARM/PIC vía SPI. Proyecto ESP32+EasyCAT PRO: "NOT fully working yet". MikroE EtherCAT Click (LAN9252) 19 USD (s). | Posible en prototipo con trabajo de firmware; sin certificación. |
| Anybus CompactCom 40 (Brick AB6675-D, PROFINET IRT) | 36×36×8 mm; -40…+85 °C; 3,3 V, ≤500 mA; host SPI hasta 50 MHz / paralelo / shift register; pre-certificado PNO; garantía 1 año. Precio: NO ENCONTRADO (solo AED 1.285 para AB6605-C en un distribuidor). | Camino "certificable" para que cada CZC hable PROFINET/EIP nativo; existe también versión EtherNet/IP. |
| Hilscher netX 90 / netRAPID 90 | netX 90: Fast Ethernet dual-port con PHY integrados, SPI/QSPI 125 MHz, -40…+85 °C, BGA 10×10. netRAPID 90: módulo 15×32 mm, -20…+85 °C, PROFINET/EtherCAT/EIP/PROFIBUS/DeviceNet (s). | Igual que CompactCom pero soldable; precio no público. |
| Pilas software en ESP32 | p-net (PROFINET device): C, bare-metal/RTOS, tramas L2 crudas, GPLv3 o comercial 490 €/año + 3.000 €. OpENer (EIP): sin port ESP32 documentado. | Sin hardware certificado ni conformance test; no recomendable para producto. |

### 2(d) Alternativa "comprar": tarjetas de zona comerciales

| Tarjeta | Motores | Lógica local sin PLC | Modo PLC / protocolos | Ethernet | Certif. | Temp. | Precio (s) |
|---|---|---|---|---|---|---|---|
| Pulseroller ConveyLinx-Ai2 (24 V) | 2 MDR Senergy-Ai (M8); puertos motor configurables como DO 24 V ≤1 A (s) | ZPA autoconfigurable, hasta 221 controladores | PLC I/O mode: EtherNet/IP, Modbus TCP, PROFINET IO, CC-Link IE Field Basic | **switch 3 puertos RJ45** (daisy chain) | CE, RoHS, IP54, UL Recognized, ETL Listed | 0–40 °C (opc. -30…40) | 651,82 USD |
| Interroll MultiControl AI | 4 RollerDrive EC5000 AI (24/48 V) | ZPA integrada (single/train), teach-in | PROFINET CC-B, EtherNet/IP, EtherCAT (conmutable) | **switch 2 puertos** M12 D (Link A/B) | UL-listed; IP54 (no UL) | -30…+40 °C | ≈326 USD |
| Itoh Denki IB-E03B / IB-E04F | 2 Power Moller 24 V | Master mode "stand-alone" con ladder propio (ICE) | Esclavo EtherNet/IP (implicit); AOP Rockwell; DLR. PROFINET: NO ENCONTRADO | **switch 2 puertos** integrado | UL/cUL Recognized, ODVA conformance, CE | -20…40 °C | ≈658 USD (IB-E03BP nuevo) |
| Beckhoff EK1100 + EL7047 | 1 paso a paso 8–48 V, 5 A (6,5 A con ventilador), encoder, 2 fines de carrera por EL7047 | ✘ (requiere maestro EtherCAT) | EtherCAT | EK1100: 2× RJ45 (entrada/salida) | CE, UL (EK1100 además ATEX, IECEx…) | 0…55 °C (EL); -25…+60 °C (EK) | EL7047 ≈295–519 USD; EK1100 ≈79–201 USD (eBay) |
| Beckhoff EL7411 | 1 BLDC 8–48 V, 4,5 A (9 A pico) | ✘ | EtherCAT | vía EK1100 | CE, UL | 0…55 °C | — |
| Siemens S7-1212C | E/S 24 V (8 DI/6 DO/2 AI) | PLC completo | PROFINET (1 puerto) | 1 | (Siemens) | — | 257–812 USD (rango de distribuidores) |
| Rockwell Micro820 2080-LC20-20QBB | 12 DI, 7 relés | PLC completo | EtherNet/IP (1 puerto) | 1 | (Rockwell) | — | 249,99 USD |

Nota: ninguna tarjeta de zona comercial acciona un NEMA 23; ConveyLinx e Interroll están ligadas a sus rodillos motorizados (Senergy-Ai / EC5000). Para el Omni, la única opción "de catálogo" hallada es EtherCAT (EL7047 stepper 48 V/5 A por eje → 2 por módulo) bajo un maestro EtherCAT (Beckhoff CX, o PLC con EtherCAT).

### 2(e) Gateways hacia EtherNet/IP y PROFINET, y PLC compactos con doble puerto

| Gateway | Lado de campo | Lado PLC | Puertos | Alim./Temp. | Cert. | Precio (s) |
|---|---|---|---|---|---|---|
| HMS Anybus Communicator CAN – EtherNet/IP (AB7318) | CAN 1.0/2.0A/2.0B o CANopen | Adaptador EtherNet/IP | 2 Ethernet con switch | 24 VDC; 0–55 °C | (haz. loc.) | 1.216,50 USD |
| HMS Anybus Communicator CAN – PROFINET-IO (AB7317-B) | CAN | Dispositivo PROFINET | 2 | — | — | no obtenido |
| HMS ABC4013 (PROFINET device ↔ EIP adapter) | Ethernet | Ethernet | 2+2 | 12–30 VDC; -25…+70 °C | CE, UL | 955 USD |
| HMS ABC4090-A (Common Ethernet ↔ Common Ethernet) | PROFINET/EtherCAT/EIP/Modbus TCP | ídem (firmware seleccionable) | 2+2 con switch | 12–30 VDC; -25…+70 °C | IEC 62443-4-1; garantía 5 años | — |
| Hilscher NT 151-RE-RE | PROFINET/EtherCAT/EIP/Modbus TCP/POWERLINK/Sercos (device o master) | ídem | 2+2 RJ45 | 24 V ±6 V; -20…+60 °C | CE/UKCA | 448–1.338 USD |
| Moxa MGate 5105-MB-EIP | Modbus RTU/ASCII/TCP (maestro o esclavo) | EIP scanner/adapter, MQTT | 2 Ethernet + 1 serie aislado 2 kV | 12–48 VDC redundante; 0–60 °C (-T -40…75) | UL, CE, ATEX, IECEx | 682–916 USD |
| ProSoft PLX31-EIP-MBS / PLX32 | Modbus serie / TCP | EIP | PLX31 1 puerto; PLX32 2 puertos | — | — | — |
| PLC cabecera: Siemens S7-1215C | E/S 14 DI/10 DO/2 AI/2 AO | PROFINET | **2 puertos PROFINET (switch)** | 20,4–28,8 V DC | — | 649,99 USD |
| PLC cabecera: Rockwell CompactLogix 5380 (5069-L306ER) | — | EtherNet/IP | **2 puertos: DLR/lineal o doble IP** | — | — | no obtenido |

Lectura: un gateway CAN→EIP/PROFINET por línea (no por zona) cuesta ≈1.000–1.300 USD; un PLC compacto con 2 puertos permite separar la red de zonas de la red de planta y actuar de "gateway lógico" con programa propio.

### 2(f) Evaluación preliminar prototipo vs producto

| Criterio | Prototipo rápido (semanas) | Producto industrial (CZC) |
|---|---|---|
| Base HW | Placa DIN existente: **StamPLC** (CAN+RS485+8 DI opto, sin Ethernet) o **Waveshare 8DI-8RO-C** (Ethernet+RS485+CAN+8 DI opto). Coste 43–50 USD/€. | PCB propia en caja DIN: ESP32-P4 (EMAC + 3 TWAI) o ESP32-C6 (2 TWAI) módulo -IND; o MCU industrial si se exige UL sobre el SoC. |
| Cadena UPSTREAM/DOWNSTREAM | CAN o RS-485 con dos conectores pasantes (un bus, dos M12/M8 por caja). | Igual (CAN) y/o Ethernet 2 puertos con KSZ8863 en "simple switch"; el bus CAN mantiene la ZPA local sin PLC. |
| Gateway a PLC | Un Anybus AB7318/AB7317 o Moxa MGate en cabecera (o el propio PLC de 2 puertos). | Mismo esquema, o módulo Anybus CompactCom/netRAPID en un "CZC-cabecera" si se quiere PROFINET/EIP nativo certificado. |
| Aislamiento y robustez | Aprovechar opto de la placa; sin watchdog externo. | DI IEC 61131-2 tipo 3, RS-485/CAN aislados, watchdog externo (MAX6369/TPS3823), brownout nivel alto, salidas OFF por hardware, -20…+55 °C, ensayo IEC 60068-2-6. |
| Certificación | No aplica. | UL 61010-2-201 / EN 61131-2 como en Opta/Controllino/Norvi; ningún ESP32 DIN comercial de la lista trae UL. |
| Alternativa "comprar" (Ruta A/C) | Zonas ZP2026 siguen con UniDrive+ZoneLogix; Omni con EK1100+EL7047 ×2 bajo maestro EtherCAT (≈900–1.200 USD/módulo en terminales). | ConveyLinx-Ai2 / MultiControl / Itoh como referencia de "qué debe cumplir" un CZC (switch integrado, UL, IP54, ZPA sin PLC, modo PLC I/O). |

---

## 3. Tabla de datos numéricos con fuente

Contenido idéntico al archivo `research_controladores_din.md.facts.json` (mismo orden). Fecha de acceso: 2026-09-03 en todos los casos.

<!--FACTS_TABLE-->

---

## 4. Lo que NO se encontró y dudas

- **Precio de Anybus CompactCom 40 / netRAPID 90 / EasyCAT PRO**: no publicado; solo un distribuidor con AED 1.285,20 para el AB6605-C (modelo anterior). Buscado en HMS, profibus.com, Hilscher, DirectIndustry, AB&T.
- **Certificación UL/cULus de los ESP32 DIN**: Industrial Shields solo documenta ETL (UL 61010) para M-Duino (Arduino); Norvi declara EN 61131-2/EN 61010 pero no UL; KinCony, Waveshare, M5Stack, DFRobot no declaran certificaciones. Sfera Labs Iono RP D16: página oficial no legible (JS); datos vía CNX Software.
- **Placa ESP32 comercial con dos RJ45 (switch integrado)**: no existe según lo hallado; solo driver Espressif KSZ8863 y un proyecto comunitario en curso.
- **Tabla de vibración de IEC 61131-2** y **requisito normativo textual de "salidas en OFF al arrancar"**: la norma es de pago; solo se citan datos de productos (Controllino, Beckhoff) y advertencias de fabricantes (Interroll).
- **PROFINET en Itoh Denki IB-E03/E04**: el manual solo documenta EtherNet/IP; no se halló variante PROFINET.
- **Interroll MultiControl precio oficial**: solo un distribuidor (326 USD); el número de artículo Interroll es S-1103563 y el del distribuidor 1001378 (posible discrepancia de referencia).
- **Siemens S7-1212C precio**: rango muy amplio entre distribuidores (181–812 USD); no se pudo leer la página oficial (SiePortal requiere sesión).
- **Industrial Shields ESP32 PLC 21 precio y ficha oficial**: el sitio devolvió HTTP 403; precio 239 € tomado del snippet de búsqueda y E/S del catálogo alojado en RS.
- **Temperatura de operación** de KinCony, Waveshare y Sfera Labs: no declarada.
- **ConveyLinx-Ai2 "puertos motor como salidas 24 V ≤1 A"**: procede de un snippet del manual (manula.com, sección 24V models) que no pudo leerse completo (HTTP 503).
- Duda de diseño abierta: el switch KSZ8863 en "simple switch" con dos puertos al mismo switch de planta crea bucles (advertencia de Espressif); la topología en cadena debe cerrarse con cuidado (o usar DLR/MRP solo en gateways certificados).

---

## 5. Implicaciones para el diseño (sin decidir por el equipo)

1. **Ruta A (conservar UniDrive+ZoneLogix Plus)**: las zonas Omni necesitan un driver paso a paso; el único camino de catálogo con certificación es EtherCAT (EK1100 + 2× EL7047 por módulo) más un maestro EtherCAT, lo que introduce una segunda red y un PLC/IPC. Un CZC-Omni propio (ESP32 + drivers) evita eso pero debe imitar la interfaz de ZoneLogix Plus (dato pendiente en otra investigación).
2. **Ruta B (CZC propio para todas las zonas)**: el prototipo puede montarse hoy con StamPLC o Waveshare 8DI-8RO-C y bus CAN en cadena; el producto exige PCB propia con DI IEC 61131-2 aisladas, watchdog externo, salidas OFF por hardware, módulo ESP32 -IND (o ESP32-P4/C6 para 2–3 CAN y EMAC) y, si se quiere Ethernet en cadena, KSZ8863. La pila PROFINET/EIP en ESP32 no está madura: el gateway (Anybus/Hilscher/Moxa o un PLC de 2 puertos) debe quedar en la cabecera de la línea.
3. **Ruta C (híbrida)**: ConveyLinx-Ai2 / MultiControl / Itoh demuestran el "estándar de facto" del mercado: switch Ethernet integrado, ZPA local sin PLC, modo PLC I/O, UL/ETL, IP54, -30…+40 °C. Cualquier CZC que quiera venderse como producto debería apuntar a esa lista de requisitos.
4. **Costo orientativo por zona** (solo hardware de control, precios de distribuidor, sin IVA): ESP32 DIN 43–120 USD (prototipo) · Opta 166 USD (+141 por expansión) · ConveyLinx-Ai2 652 USD · MultiControl ≈326 USD (4 zonas) · Itoh ≈658 USD · EtherCAT EL7047 ≈300–520 USD por eje + EK1100. Gateway de cabecera 700–1.300 USD (una vez por línea).
5. **Disponibilidad**: Norvi (ENET e IIOT) figura agotado; Olimex -IND sin stock en DigiKey hasta oct-2026; StamPLC, KinCony, Waveshare, Opta con stock. Para producción, comprobar plazos y segunda fuente antes de fijar la plataforma.
