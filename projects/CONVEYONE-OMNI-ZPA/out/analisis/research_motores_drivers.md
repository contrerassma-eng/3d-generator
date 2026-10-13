# Investigación: motor + driver para el módulo Omni (eje motriz 1:1, ruedas Ø50)

Proyecto: Conveyone (Chile) — zona especial "Omni" en línea ZPA ZP2026/UniDrive/ZoneLogix Plus.
Fecha de acceso de TODAS las fuentes: **2026-09-03**. Autor: investigación asistida (Claude). Estado: FINAL.

Puntos de operación del eje motriz (1:1 con ejes de rueda Ø50 por HTD 5M 28T/28T):
- **573 rpm ↔ 1.5 m/s** y **382 rpm ↔ 1.0 m/s** [cálculo propio: v = π·0.050 m·n/60].
- Par continuo requerido en el motor: **≥ 0.6–0.8 N·m** (memoria REV B), servicio continuo con inversiones frecuentes, bus 48 VDC preferido.
- Con 2000 micropasos/rev, 573 rpm ⇔ 19.1 kpps y 382 rpm ⇔ 12.7 kpps [cálculo propio].

Nota metodológica. La cuota de WebSearch de la sesión estaba agotada al iniciar esta tarea; la evidencia se obtuvo por
acceso directo (WebFetch/curl) a fichas y manuales de fabricantes/distribuidores y por lectura de PDFs descargados
(curvas leídas como imagen: los valores de curva son **lecturas aproximadas ±5 %** salvo cuando la curva trae puntos
rotulados). El dominio omc-stepperonline.com bloquea el acceso automatizado (HTTP 403, desafío Cloudflare) y
web.archive.org no es alcanzable; **el dominio oficial stepperonline.es sí es accesible** y sirve los mismos PDF oficiales
(`https://www.stepperonline.es/download/<archivo>.pdf`). Los precios en EUR son de stepperonline.es; en CLP de AFEL (Chile).

---

## 1. Resumen ejecutivo

1. **NEMA 23 open-loop 3 N·m (23HS45-4204S) a 573 rpm: la curva oficial NO cubre ese punto.** StepperOnline publica la curva a 36 V/4.2 A solo hasta 420 rpm (1.84 N·m pull-out a 420 rpm); no existe curva a 48 V. La curva del mismo cuerpo con encoder (23HE45-4204S, 36 V, DM556T 4.1 A, medida en lazo abierto) da ≈1.63 N·m a 510 rpm y 1.30 N·m a 600 rpm → ≈1.4 N·m a 573 rpm [interpolación].
2. A 48 V las curvas oficiales disponibles muestran par pull-out a 573–600 rpm de **1.12 N·m (23HS30-2804S, 1.9 N·m nominal, 2.69 A RMS)**, ≈1.15 N·m (Leadshine 57CM26, 2.6 N·m, 5 A) y ≈1.45 N·m (Leadshine 57CM23, 2.3 N·m, 5 A). Es decir, la clase NEMA 23 de 2–3 N·m entrega **1.1–1.5 N·m de par pull-out a 573 rpm**: 1.4–1.9× sobre 0.8 N·m, pero pull-out ≠ par continuo y sin realimentación la pérdida de sincronismo no se detecta.
3. **Closed-loop NEMA 23 (23HE45-4204S + CL57T-V41 ≈ €54)** mantiene ≈1.3–1.7 N·m a 600 rpm (Leadshine CS-M22323 a 48 V ≈1.7 N·m), con salida ALM configurable, protección "position following error" y "no torque reservation" según Leadshine. **NEMA 34 closed-loop 34HE46-6004D-E1000 + CL86T a 48 V: 1.85 N·m a 600 rpm** (curva oficial con puntos), €32.82 + €42.14.
4. **Servos integrados**: iSV57T-180 (20–50 VDC, 0.6 N·m nominal / 1.1 pico, 3000 rpm, €71.80) queda **justo en el mínimo** 0.6 N·m; el 48 V de 400 W (JMC iHSV60-30-40-48 / StepperOnline IDS-C60AP-48V400W: 1.27 N·m nominal, 3000 rpm, 10–11.2 A, €148.87) cumple con holgura, pero a 573 rpm usa 19 % de su velocidad nominal (sobredimensionado en rpm, no en par).
5. **Ecosistema MDR a 48 V como accionamiento externo**: Interroll EC5000 50 W 9:1 (2.01 m/s máx, 0.63 N·m nominal, 1.58 N·m aceleración, 2.54 N·m arranque; 1.7 A a 48 V) y Pulseroller PGD-Ai-48 11:1 (52.8–637.5 rpm, 0.75 N·m nominal, 1.86 N·m holding, 1.6 A, eje 16 mm) están **en el límite** del requisito 0.6–0.8 N·m a 573 rpm; con 13:1/15:1 (≤531/467 rpm) solo alcanzan 1.0–1.2 m/s pero con 0.91–1.02 N·m.
6. **UniDrive CORE (ACG)**: motor pancake **24 o 48 V**, 60/120 W, 350/700 rpm, **15 in·lbf (1.7 N·m) continuos a velocidad máxima**, 3.3 A a 48 V, sin electrónica a bordo (fases U/V/W, requiere conmutación externa). Es el único motor del ecosistema del cliente con 48 V y 573 rpm dentro de la zona continua. UniDrive Signature 100 W (24 V, 560 rpm, 15 in·lbf, 6 A) y ZoneLogix PRO 2.0 UD100 (115–570 rpm) cubren 24 V.
7. Itoh Denki: "FE" = tarjeta externa, no motor externo; PM605FE (24 V) código 90 alcanza 2.1 m/s con 21.8–33.4 N nominales (≈0.66–1.0 N·m a Ø60.5) y código 60 (1.25 m/s) 36.7–56.4 N (≈1.1–1.7 N·m). No se halló motor externo Itoh.
8. **Regeneración a 48 V**: Interroll exige chopper de freno (MultiControl actúa a 52 V; HP5448 con "brake chopper") o fuentes que absorban hasta 60 V; los drivers stepper/servo consultados disparan sobretensión a **60 VDC (DM556T, iSV-B23)** u 80 V (JMC iHSS): con bus 48 V el margen es 12 V.
9. **Salidas de fallo**: DM556T (V4.0) y DM542T tienen ALM (30 V/100 mA); CL57T ALM configurable ALARM/IN-POSITION/BRAKE; CS-D508 "Fault output or brake control or in-position"; JMC ALM±/PED±; UniDrive ONE "Fault Output" colector abierto; Interroll EC5000 AI pin 4 error.
10. **Chile**: AFEL vende DM556 ($16.000 CLP, 115 en stock) y NEMA 23 4 A 30 kg·cm ($49.990, 1 en stock). No se halló stock local de closed-loop, servos 48 V, Interroll, Pulseroller ni UniDrive. Envío de stepperonline.es a Chile: NO VERIFICADO.
11. Juicio (ver §5): un NEMA 23 open-loop de 3 N·m **probablemente arranca y gira** a 573 rpm con 0.6–0.8 N·m de carga a 36–48 V (margen 1.4–1.9× sobre pull-out), pero **no está certificado por curva oficial a 48 V ni a 573 rpm**, no da diagnóstico de pérdida de pasos y opera justo tras el "codo" de la curva (300–550 rpm). Para prototipo es defendible; para producto industrial la evidencia favorece lazo cerrado o servo/BLDC 48 V.

---

## 2. Hallazgos por sub-tema

### 2a. NEMA 23 paso a paso open-loop (curvas oficiales 24/36/48 V)

Fuentes primarias: PDFs oficiales StepperOnline (dominio .es) y ficha Leadshine "CM Series Stepper Motor".

**Tabla 2a-1. Par pull-out (N·m) leído de curvas oficiales** — 573 rpm interpolado linealmente entre puntos vecinos [cálculo propio].

| Motor (holding, I nominal) | Condición de ensayo (fuente) | 300 rpm | 400 rpm | 500 rpm | 573 rpm | 600 rpm | Fuente |
|---|---|---|---|---|---|---|---|
| **23HS45-4204S** (3.0 N·m, 4.2 A) | 36 V, 4.2 A, medio paso; eje hasta 420 rpm | 2.07 | ≈1.88 (interp. 360→1.97, 420→1.84) | **NO PUBLICADO** (curva termina en 420 rpm) | NO PUBLICADO | NO PUBLICADO | stepperonline.es/download/23HS45-4204S_Torque_Curve.pdf |
| 23HS45-4204S a 48 V | — | NO ENCONTRADO (no existe curva a 48 V) | — | — | — | — | ídem |
| **23HE45-4204S** (mismo cuerpo 3.0 N·m/4.2 A, serie E con encoder; curva en lazo abierto) | 36 V, DM556T 4.1 A, 2000 µpasos | 2.40 (3.1 A: 2.15) | ≈1.97 (390 rpm: 2.01) | ≈1.66 (510 rpm: 1.63) | ≈1.40 | 1.30 (3.1 A: 1.31; DM542T 3.0 A: 1.28) | stepperonline.es/download/23HE45-4204S_Torque_Curve.pdf |
| **23HS30-2804S** (1.9 N·m, 2.8 A) | DM542T, 36/48 V, 2.69 A RMS, 2000 µpasos | 36 V 1.44 / 48 V 1.76 | ≈1.26 / ≈1.54 (390 rpm: 1.28/1.56) | ≈1.02 / ≈1.30 (510 rpm: 1.00/1.28) | ≈0.92 / ≈1.17 | 0.88 / 1.12 | stepperonline.es/download/23HS30-2804S_Torque_Curve.pdf |
| 23HS41-4204S (3.0 N·m, 4.2 A, 100 mm) | — | **NO ENCONTRADO**: sin producto en stepperonline.es, PDF 404; omc-stepperonline.com bloqueado | | | | | búsqueda .es "23HS41-4204S" |
| Leadshine **57CM23** (2.3 N·m, 5 A RMS) | 24/36/48 V (curvas del fabricante) | ≈1.9 (todas) | ≈1.7 | ≈1.5 | ≈1.35/1.42/1.47 | ≈1.3/1.4/1.45 | leadshine.com CM datasheet p.5 |
| Leadshine **57CM26** (2.6 N·m, 5 A RMS) | 24/36/48 V | ≈2.1 | ≈1.6 | ≈1.35–1.45 | ≈1.05/1.12/1.18 | ≈1.0/1.1/1.15 | ídem |
| Leadshine 57CM13 (1.3 N·m, 4 A) | 24/36/48 V | ≈1.1/1.1/1.1 | ≈0.9/1.03/1.08 | ≈0.8/0.95/1.0 | — | ≈0.65/0.85/0.95 | ídem |

Observaciones con evidencia:
- La curva 23HS45-4204S está rotulada "PULL OUT TORQUE(36V 4.2A HELF STEP)" con eje 30–420 rpm: **no hay dato oficial a 500/600 rpm ni a 48 V**.
- Las curvas Leadshine 57CM26 y CS-M22326 muestran una caída abrupta de ≈2.3 → ≈1.0–1.2 N·m entre 250 y 550 rpm ("codo"): **573 rpm queda justo después del codo**; el 57CM23 (76 mm) tiene el codo más suave. Advertencia explícita de resonancia media (mid-band) en las fichas: **NO ENCONTRADA**; solo declaraciones genéricas: DM556T "Anti-Resonance for optimal torque, extra smooth motion, low motor heating and noise"; CL57T/DM556T "higher voltage may cause bigger motor vibration at lower speed".
- Efecto de la tensión: con 23HS30-2804S el par a 600 rpm sube de 0.88 (36 V) a 1.12 N·m (48 V), +27 % [cálculo propio]; a 300 rpm +22 %.
- Corrientes: 23HS45-4204S 4.2 A/fase, 0.88 Ω, 3.4 mH; el DM556T entrega 1.8–5.6 A pico (4.0 A RMS) y el DM542T 1.0–4.5 A (3.2 A RMS) → el DM542T no alcanza 4.2 A RMS del 23HS45.
- Pérdida de pasos: la ficha Leadshine CS lo enuncia como problema del lazo abierto ("designed to solve the loss of step problem in open loop stepper control systems") y afirma que en lazo cerrado "do not need torque reservation (100% torque implementation)" — implícitamente el lazo abierto requiere reserva de par (factor no cuantificado en las fuentes).

### 2b. NEMA 23 / NEMA 34 closed-loop

| Ítem | Datos (fuente) |
|---|---|
| **23HE45-4204S** (StepperOnline) | 3.0 N·m, 4.2 A, 0.88 Ω, 3.4 mH, 113 mm, eje Ø10, 1.8 kg, €20.95, stock 200. Curva 36 V (ver 2a). Inercia: NO ENCONTRADA. |
| **CL57T (manual)** | "Input voltage 24-48VDC, output peak current 0-8.0A"; encoder 1000 ppr; ALM+/ALM- "sourcing 20mA current at 5-24V… configured as one of the 3 types, ALARM (default), IN POSITION, or BRAKE CONTROL"; protecciones "over-voltage, over-current and position following error"; alarma 4 "Fail to lock motor shaft"; puerto RS232 para corriente pico/holding. **CL57T-V41 €33.11**; **CL57RS** (Modbus RS485, 24–48 V, 0.1–7.0 A) €81.43. |
| **Leadshine CS-D508** | "Input Voltage Range: 20 - 50 VDC", "Suggested Power Supply Voltage Range: 24 - 48 VDC", "maximum output current of 8.0A", "Digital Outputs: Fault outout or brake control or in-position output", "Protection: … position following error". CS-D507E: 20–50 V, 7 A pico; CS-D1008E: 30–110 VDC, 8 A. ALM/PEND "sinking or sourcing 100mA current at 5-24V. Max 30V". RST borra alarma de "Position following error" y "Fail to lock motor shaft". |
| **Leadshine CS-M22323 / CS-M22326** (motores closed-loop 2.3/2.6 N·m, 5 A, 95/103 mm) | Curvas 24/36/48 V: CS-M22323 ≈2.1 (300) / 1.95 (400) / 1.8 (500) / 1.5–1.7 (600 rpm; 48 V ≈1.7); CS-M22326 ≈2.45 / 1.9 / 1.5 / 1.1–1.25 (48 V ≈1.25). |
| **JMC iHSS57-36-20 / iHSS57-36-30** (integrados) | 36 V; 2.0 N·m 5 A / 3.0 N·m 4 A (listado JMC). Manual iHSS: "Input Voltage 24~50VDC(36V Typical)", "Over current peak value 8A±10%", "Over voltage value 80V", puertos ALM+/ALM-, PED+/PED-. Curvas: NO ENCONTRADAS. |
| **ISD08** | NO ENCONTRADO (ninguna fuente accesible identifica un producto "ISD08"). |
| **NEMA 34 34HE46-6004D-E1000 + CL86T** | 9.0 N·m, 6.0 A, 0.45 Ω, 4.6 mH, 4.15 kg, encoder 1000 ppr, €32.82. Curva oficial (CL86T, 48/60 V, 6 A RMS, 2000 µpasos): **48 V: 300 rpm 3.60, 450 rpm 2.53, 510 rpm 2.24, 600 rpm 1.85, 900 rpm 1.15 N·m; 60 V: 300 rpm 4.25, 450 rpm 3.00, 600 rpm 2.43, 900 rpm 1.65**. 573 rpm ≈2.0 N·m a 48 V [interp.]. CL86T-V41: 18–80 VAC / 24–110 VDC, €42.14. |
| Comportamiento en inversión | Ninguna ficha stepper cuantifica la inversión; el CL57T exige "DIR signal… established at least 5μs before the pulse" (setup) y el JMC iHSV "at least 6us". La inversión se gobierna por la rampa del generador de pulsos (ESP32). |
| Freno regenerativo | Drivers stepper: sin resistencia de frenado; protección por sobretensión (DM556T "greater than 60VDC"; CL57T "over-voltage point" no cuantificado). Ver 2e. |

### 2c. Servos integrados 48 V y BLDC 48 V con reductor

| Modelo | Tensión | Potencia | Par nominal / pico | rpm nominal / máx | Corriente | Precio | Fuente |
|---|---|---|---|---|---|---|---|
| **StepperOnline iSV57T-180** (NEMA 23, encoder magnético 16 bit) | "20-50V CC(típico 36V CC)" | 180 W | 0.6 / 1.1 N·m | 3000 / 4000 | 0–6 A | €71.80 (antes €79.78), stock 200 | stepperonline.es |
| Leadshine iSV-B23180-S21 (misma familia) | 36 V nominal; "24-36VDC recommended"; sobretensión a 60 VDC | 180 W | 0.6 / 1.1 N·m | 3000 / 4000 | 7.5 Arms | NO ENCONTRADO | leadshine.com datasheet iSV-B23 |
| Leadshine iSV serie (web) | "24~48VDC" | 90/130/180 W | — | — | — | — | leadshine.com |
| Leadshine iSV2-RS (60/80 mm) | "24~60VDC" | 200–750 W | pico hasta 7.2 N·m; sobrecarga 250–300 % (3 s) | — | — | NO ENCONTRADO | leadshine.com |
| Leadshine iSV57T-180 (página oficial) | NO ENCONTRADO (leadshine.com devuelve error 500) | | | | | | |
| **JMC iHSV57-30-18-36** | 36 V | 180 W | 0.6 N·m (manual) / 0.64 (listado web) — discrepancia | 3000 / 4200 | 7.5 A (web) | NO ENCONTRADO | jmc-motor.com |
| **JMC iHSV60-30-40-48** | 48 V | 400 W | 1.27 N·m | 3000 / 4000 | 11.2 A | NO ENCONTRADO | jmc-motor.com |
| **StepperOnline IDS-C60AP-48V400W** (CANopen/RS485/pulsos, encoder 17 bit) | "30–60 VCC, con 48 VCC como tensión de entrada típica" | 400 W | 1.27 N·m / pico NO ESPECIFICADO | 3000 ±10 % / 3600 | 10 A | €148.87 | stepperonline.es |
| StepperOnline iSV2-57TR-48V400A (57 mm, 48 V, 400 W) | descontinuado | | | | | | búsqueda .es |
| BLDC 48 V sin reductor 57BSA100-48-01 | 48 V | 188 W | 0.6 N·m | 3000 | 5.4 A | €39.76 | stepperonline.es |
| BLDC 48 V sin reductor 86BSA108-48-01 | 48 V | 440 W | 1.4 N·m | 3000 | 11.7 A | €63.26 | stepperonline.es |
| BLDC 48 V **con reductor planetario** (StepperOnline) | NO ENCONTRADO en la primera página de resultados (solo BLDC 24 V con planetario y escobillas 48 V) | | | | | | |
| **Pulseroller PGD-Ai-48** (BLDC 48 V + planetario metálico, eje 16 mm chaveta 5×5×25) | 48 V | 50 W | 11:1: 0.75 / holding 1.86 N·m; 15:1: 1.02 / 2.54; 27:1: 1.25 / 3.10 | 11:1: 52.82–637.52 rpm; 15:1: 38.67–466.67; 27:1: 21.48–259.26 | 1.6 A nominal, 4.0 A arranque | NO ENCONTRADO | Pulseroller Catalog 2025 |
| **UniDrive CORE** (pancake 24/48 V, sin electrónica) | 24/48 V | 60/120 W | 15 in·lbf (1.7 N·m) a vel. máx y nominal; arranque >15 | 350/700 rpm máx; mín 70/140 | 3.4/3.3 A | NO ENCONTRADO | unidrive.solutions spec sheet |

Nota de rendimiento: los servos de 3000 rpm nominales operan a 573 rpm al 19 % de su velocidad, por lo que su potencia útil real es P = 0.8 N·m × 60 rad/s ≈ 48 W [cálculo propio]; el criterio de selección es el par continuo a baja velocidad, no la potencia nominal. Curvas par-velocidad de los servos integrados: NO ENCONTRADAS (solo valores nominal/pico).

### 2d. Motores del ecosistema MDR como accionamiento externo por correa

**Interroll RollerDrive EC5000** (manual v4.0 10/2022 y catálogo DC Platform 12/2025; Ø50, motor 6900 rpm nominal, 9 relaciones):

| Variante | Relación | v máx / mín (m/s, Ø50) | rpm rodillo máx [cálc.] | Par nominal | Par aceleración = holding (2.5×) | Par arranque (breakaway) | I nominal / arranque 48 V | I nominal / arranque 24 V |
|---|---|---|---|---|---|---|---|---|
| 50 W | 9:1 | 2.01 / 0.09 | 767 | **0.63 N·m** | 1.58 | 2.54 | 1.7 / 3.8 A | 3.4 / 7.5 A |
| 50 W | 13:1 | 1.39 / 0.06 | 531 | 0.91 | 2.29 | 3.66 | ídem | ídem |
| 50 W | 18:1 | 1.00 / 0.04 | 383 | 1.27 | 3.17 | 5.07 | ídem | ídem |
| 35 W | 9:1 | 2.01 | 767 | 0.44 | 1.11 | 1.77 | 1.2 / 2.8 A | 2.4 / 5.5 A |
| 35 W | 13:1 | 1.39 | 531 | 0.64 | 1.60 | 2.56 | ídem | ídem |
| 20 W | 9:1 | 2.01 | 767 | 0.25 | 0.63 | 1.01 | 0.7 / 1.5 A | 1.4 / 3.0 A |

- Definiciones (manual): "Rated torque: Torque that the RollerDrive can deliver at an ambient temperature of 20°C and at the rated speed during continuous operation"; "Acceleration torque = rated torque x 2.5"; "The breakaway torque is available at a motor speed of <350 rpm and a motor temperature of <70°C… 1 s - 4 x MRated/2 s - 2.5 x MRated". Tolerancia ±20 % antes del rodaje, ±10 % después.
- Velocidad mínima 300 rpm de motor (2.3 V) → con 9:1 ≈ 33 rpm de rodillo; la señal 0–10 V regula 300–6900 rpm.
- Uso con cabezal de transmisión: "Maximum load capacity per RollerDrive with drive head (PolyVee, round or toothed belt) 350 N".
- "Do not attempt to operate a RollerDrive EC5000 24 V DC at 48 V DC. This will destroy the motor".
- Sólo la 9:1 alcanza 573 rpm (1.5 m/s); 13:1 sirve para 1.0 m/s (382 rpm) con 0.91 N·m nominal en 50 W [cálculo propio].
- Precio (secundario, Ultimation EE. UU.): EC5000 1.90″×21″ BF 24 V 35 W US$239.80 (antes 288.50); 48 V: NO ENCONTRADO. HP5424 US$1,348.95.

**Pulseroller Senergy-Ai-48 (rodillo Ø48.6/50/60.5) y PGD-Ai-48 (motor externo)** — Catálogo 2025:
- Rodillo Ø48.6: código 60 (11:1): 0.13–1.62 m/s, 0.75 N·m nominal, 1.86 holding; código 45 (15:1): 0.10–1.19 m/s, 1.02 / 2.54; código 35 (55/3): 0.08–0.97 m/s, 1.25 / 3.10; código 20 (33:1): 0.04–0.54 m/s, 2.16 / 5.82; código 15 (45:1): 0.03–0.40 m/s, 2.95 / 7.94.
- "Input Voltage 48 VDC", "Nominal Power Output 50W", "Rated Current 1.6A", "Starting Current 4.0A", "Maximum Motor RPM 7000", "Minimum Motor RPM 580", "Minimum Duty Cycle 0.5 sec ON / 0.5 sec OFF", "Continuous Operation: No overheat at rated load/current".
- Controlador: ConveyLinx-Ai2-48 / Ai3-48-FC: "Motor Input Voltage 42 to 48 VDc", "Rated Motor Output Current 1.6A (50W)", arranque configurable hasta "4.0 Setting: 4.0A (118W)".
- Precio: NO ENCONTRADO.

**Itoh Denki** (documentos técnicos oficiales):
- "FE" significa tarjeta de control **externa** ("This circuit board is separated from the gear-motor"), no motor externo. Motor externo Itoh para correa: **NO ENCONTRADO** (la página de productos devuelve solo un marcador "TODO"). PM486FE: PDF 404 → NO ENCONTRADO.
- **PM605FE** (24 VDC ±10 %, Ø60.5, con CBM-105): códigos 17/25/60/90, reducciones 1/44.95, 1/26.67, 1/12.64, 1/7.5; fuerza tangencial nominal 114.8–176.4 / 68.1–104.6 / 36.7–56.4 / **21.8–33.4 N**; arranque 293.2 / 174 / 93.7 / 55.6 N; velocidad sin carga 2.6–21 / 4.4–35.4 / 9.3–74.7 / **15.7–125.9 m/min**; potencia absorbida nominal 45.6–81.6 W, arranque 96 W; "1800 starts / hour maxi", "Minimum duty cycle = 1 s ON / 1 s OFF"; freno dinámico; salida de error "Over-heating, wiring error, under-voltage, over-voltage". [cálculo propio, r = 0.03025 m] código 90 → 0.66–1.01 N·m a 0.26–2.10 m/s; código 60 → 1.11–1.71 N·m a 0.16–1.25 m/s.
- **PM500XE** (Ø50, 24 V, M8 5 pines, fusible 5 A): códigos 17/30/60/100 (1/44.97, 1/26.67, 1/12.65, 1/7.5); tabla código 17: 17.4 m/min, 70.0 N nominal / 264.6 N arranque, **1.75 N·m nominal / 6.62 arranque**, 1.7 A nominal. Tablas de los códigos 60/100: NO EXTRAÍDAS (no localizadas en el texto del PDF).
- PM500FE con HB510 (código 17): 17.4 m/min, 143.0 N / 355.4 N, 3.57 / 8.89 N·m, 3.4 A nominal.

**UniDrive (Automation Controls Group)**:
- **UniDrive ONE**: "24V brushless DC motor", "60W rated output", "Speed ranges from 70 - 350 RPM", "14 in-lbf continuous torque", 2 A nominal / 4 A stall, M8 con "Fault Output Open Collector… Fault: Signal High".
- **Signature UL Listed**: 48/60/80/100/120 W; 100 W: 6 A, 560 rpm máx, 15 in·lbf a vel. máx, 530 rpm nominal, mín 110 rpm; 120 W: 7.5 A, 700 rpm máx, 14 in·lbf a vel. máx, 660 rpm nominal, mín 140; "Performance shown is typical and is dependent on the control used and the motor temperature".
- **ZoneLogix PRO 2.0**: UD100 115–570 rpm, "5.6A @ 15 in-lbs", máx 7.0 A; UD120 145–715 rpm, "6.4A @ 14 in-lbs", máx 7.5 A; "15 in-lbf equals 1.7 N-m"; "25 starts/stops per minute (At Max Current Limit)"; "Stall Torque approximately 80% Rated Torque". Solo 24 V (22–28 V).
- **CORE**: "24 or 48V brushless DC motor", "60/120W rated outputs", "Speed ranges from 55 - 700 RPM", "Up to 15 in-lbf continuous torque"; tabla 24/48 V: 3.4/3.3 A, 350/700 rpm, 15 in·lbf a vel. máx, mín 70/140 rpm, arranque >15; gráfico "Rated Speed @ 48V: 701 RPM", "Rated @ 48V: 124 W"; conector M8 con fases U/V/W (sin sensores ni control a bordo). Controlador 48 V de ACG: NO ENCONTRADO.

### 2e. Requisitos de driver (E/S, regeneración, corriente pico, consumo)

| Requisito | Evidencia |
|---|---|
| Entradas RUN/DIR/SPEED/ENABLE | Steppers: PUL/DIR/ENA optoaislados 5 V o 24 V (DM556T "Optically isolated inputs with 5V or 24V"; CL57T ENA "4.5-24VDC"); la velocidad es la frecuencia de pulsos (≤200 kHz; CL57T/iSV hasta 300–500 kHz). MDR: interfaz analógica M8 (UniDrive ONE/EC5000 AI): +V, DIR (<4 V CCW / >7 V CW), GND, FALLO, VELOCIDAD 2.3–10 V; EC5000 "2.3 V = Minimum speed = 300 rpm, 10 V = Maximum speed = 6900 rpm". Itoh PM605FE: "Start / Stop, Direction of rotation", "20 speeds by external analog voltage of 0-10VDC". |
| Salida FAULT | DM556T V4.0: "ALM+ (1) Maximum 30V/100mA output (2) Sinking or sourcing (3)… low impedance as default, and will change to high when the drive goes into error protection" (el manual antiguo V1.0 no la tenía; la página .es indica "Salida de alarma: Sí"). DM542T: "Salida de alarma: Sí". CL57T: ALM 20 mA 5–24 V, ALARM/IN POSITION/BRAKE. CS-D508: fault/brake/in-position. JMC: ALM±, PED±; ENA borra alarma. UniDrive ONE: "Fault Output Open Collector… Vmax = 30 VDC for Icmax = 200 mA". |
| Clamping / regeneración a 48 V | Interroll: "The RollerDrive recovers energy when braking" y, sin chopper en el control, "it must be ensured that the power supply units used are suitable for energy recovery (up to 35 V /60 V)"; MultiControl: "The brake chopper is activated when the voltage rises above 28 V/52 V"; HP5448: "Brake chopper for limiting feedback voltage – resulting in feedback capability", 48 V, 960 W, "Max. 2,000 W at 48 V DC for 4 s", "41 A at 48 V DC for 4 s". Drivers stepper: DM556T "Over-voltage protection activated when drive working voltage is greater than 60VDC"; iSV-B23 "Over-voltage protection activated when drive working voltage is greater than 60VDC"; JMC iHSS "Over voltage value 80V"; CL57T y DM556T: "back EMF voltage generated during motor deceleration needs also to be taken into account… +24 - +48 VDC, leaving room". ZoneLogix UL (24 V): "Over Voltage on Input Over 28 VDC Applies Dynamic Braking". → A 48 V el margen hasta 60 V es 12 V; ninguna ficha stepper/servo consultada incluye resistencia de frenado. [cálculo propio] energía cinética de una caja de 5 kg a 1.5 m/s = 5.6 J, más la inercia de 8 ejes: se disipa en cada inversión. |
| Corriente pico en inversión | Servos: iSV serie "180%~250% (1s)"; iSV2-RS "250%~300% (3s)"; iSV-B23 sobrecorriente a 18 A pico. MDR: EC5000 arranque 3.8 A (48 V, 50 W) = 2.2× nominal; Senergy-Ai-48 4.0 A arranque vs 1.6 A; UniDrive UD100 máx 7 A vs 5.6 A. Steppers: corriente fija (5.6 A pico DM556T), no depende de la inversión. |
| Consumo típico | EC5000 48 V 50 W: 1.7 A nominal; PGD-Ai-48: 1.6 A (50 W); UniDrive CORE 48 V: 3.3 A (120 W); IDS-C60AP: 10 A (400 W); iSV57T-180: 0–6 A; stepper 23HS45 + DM556T: 4.2 A/fase fijos (idle 50/90 %). Fuentes 48 V StepperOnline: 350 W €23.41, 500 W €42.12, 1000 W €163.81. |

---

## 3. Tabla de datos numéricos con fuente

(Todos con fecha_acceso 2026-09-03; "≈" = lectura de curva; "[interp.]" = interpolación propia. Lista completa en `research_motores_drivers.md.facts.json`.)

| # | Modelo | Tensión | Par a 400 rpm | Par a 600 rpm (573) | Corriente | Precio | Disponibilidad | Fuente principal |
|---|---|---|---|---|---|---|---|---|
| 1 | StepperOnline 23HS45-4204S (3 N·m open-loop) | 36 V (curva) | ≈1.88 N·m [interp.] | NO PUBLICADO (curva hasta 420 rpm: 1.84) | 4.2 A | €26.12 (.es, stock 500); US$33.92 (BOM GitHub, secundario) | .es stock 500; Chile: equivalente AFEL 4 A $49.990 (1 ud.) | stepperonline.es/download/23HS45-4204S_Torque_Curve.pdf |
| 2 | 23HE45-4204S (3 N·m, serie E) open-loop DM556T 4.1 A | 36 V | ≈1.97 | 1.30 (573: ≈1.40) | 4.2 A | €20.95 | .es stock 200 | …/23HE45-4204S_Torque_Curve.pdf |
| 3 | 23HS30-2804S (1.9 N·m) DM542T 2.69 A RMS | 36 / 48 V | ≈1.26 / ≈1.54 | 0.88 / 1.12 (573: ≈0.92 / ≈1.17) | 2.8 A | NO ENCONTRADO en .es | — | …/23HS30-2804S_Torque_Curve.pdf |
| 4 | Leadshine 57CM23 (2.3 N·m) | 24/36/48 V | ≈1.7 | ≈1.3/1.4/1.45 | 5 A RMS | NO ENCONTRADO | NO ENCONTRADO | CM datasheet p.5 |
| 5 | Leadshine 57CM26 (2.6 N·m) | 24/36/48 V | ≈1.6 | ≈1.0/1.1/1.15 | 5 A | NO ENCONTRADO | NO ENCONTRADO | CM datasheet p.5 |
| 6 | Leadshine CS-M22323 closed-loop (2.3 N·m) | 24/36/48 V | ≈1.95 | ≈1.5/1.65/1.7 | 5 A | NO ENCONTRADO | NO ENCONTRADO | CS-M datasheet p.4 |
| 7 | Leadshine CS-M22326 closed-loop (2.6 N·m) | 24/36/48 V | ≈1.9 | ≈1.1/1.2/1.25 | 5 A | NO ENCONTRADO | NO ENCONTRADO | CS-M datasheet p.4 |
| 8 | 34HE46-6004D-E1000 + CL86T (NEMA 34, 9 N·m) | 48 / 60 V | ≈2.8 / ≈3.5 [interp. 390 rpm ≈2.85/3.4] | 1.85 / 2.43 (573: ≈2.0 / ≈2.55) | 6 A | €32.82 + €42.14 | .es stock 200 | …/34HE46-6004D-E1000_Torque_Curve.pdf |
| 9 | CL57T-V41 / CL57RS / CS-D508 | 24–48 V / 20–50 V | — | — | 8 A / 7 A / 8 A pico | €33.11 / €81.43 / NO ENCONTRADO | .es / .es / — | manual CL57T; leadshine.com |
| 10 | iSV57T-180 (Leadshine iSV-B23180) | 20–50 V (36 típ.) | 0.6 nominal / 1.1 pico (constante hasta 3000 rpm; curva NO ENCONTRADA) | ídem | 0–6 A (7.5 Arms) | €71.80 | .es stock 200 | stepperonline.es; datasheet iSV-B23 |
| 11 | JMC iHSV57-30-18-36 | 36 V | 0.6 (0.64 web) nominal | ídem | 7.5 A | NO ENCONTRADO | NO ENCONTRADO | jmc-motor.com manual/listado |
| 12 | JMC iHSV60-30-40-48 | 48 V | 1.27 nominal | ídem | 11.2 A | NO ENCONTRADO | NO ENCONTRADO | jmc-motor.com |
| 13 | StepperOnline IDS-C60AP-48V400W | 30–60 V (48 típ.) | 1.27 nominal (pico NO ESPEC.) | ídem | 10 A | €148.87 | .es | stepperonline.es |
| 14 | BLDC 57BSA100-48-01 / 86BSA108-48-01 (sin reductor) | 48 V | 0.6 / 1.4 nominal a 3000 rpm | — | 5.4 / 11.7 A | €39.76 / €63.26 | .es | stepperonline.es |
| 15 | Pulseroller PGD-Ai-48 11:1 (15:1) | 48 V | 0.75 (1.02) nominal; holding 1.86 (2.54) | 11:1 hasta 637.5 rpm; 15:1 hasta 466.7 rpm | 1.6 A nom / 4.0 A arranque | NO ENCONTRADO | LatAm: Brasil/"South America" (secundario, invest. previa) | Pulseroller Catalog 2025 p.23 |
| 16 | Interroll EC5000 50 W 9:1 (13:1) | 24 / 48 V | 0.63 (0.91) nominal; accel 1.58 (2.29); arranque 2.54 (3.66) | 9:1 hasta 767 rpm (2.01 m/s); 13:1 hasta 531 rpm | 1.7 A / 3.8 A arranque (48 V) | 24 V 35 W US$239.80 (Ultimation); 48 V NO ENCONTRADO | Brasil (fábrica), Chile NO ENCONTRADO | manual EC5000 §3.8; DC Platform catalog |
| 17 | Itoh PM605FE código 90 (60) | 24 V | 21.8–33.4 N ≈ 0.66–1.01 N·m (36.7–56.4 N ≈ 1.11–1.71) | hasta 125.9 m/min (74.7) sin carga | 45.6–81.6 W nominal / 96 W arranque | NO ENCONTRADO | México (URANY, invest. previa) | Technical-document-PM605FE-EN.pdf p.7 |
| 18 | UniDrive CORE 48 V (24 V) | 48 (24) V | 15 in·lbf = 1.7 N·m continuo hasta 700 (350) rpm | 700 rpm máx a 48 V | 3.3 (3.4) A | NO ENCONTRADO | EE. UU./México (fábrica) | UniDrive CORE spec sheet |
| 19 | UniDrive Signature UL 100 W / 120 W | 24 V | 15 / 15 in·lbf a nominal; 15 / 14 a máx | 560 / 700 rpm máx | 6 / 7.5 A | NO ENCONTRADO | ídem | Signature UL spec sheet |
| 20 | DM556T (V4.0) / DM542T | 20–50 V / 18–50 V | — | — | 1.8–5.6 A (4.0 RMS) / 1.0–4.5 A (3.2 RMS) | €20.86 / €17.88; Chile DM556 $16.000 CLP | .es; AFEL 115 uds. | manual DM556T V4.0; stepperonline.es; afel.cl |

---

## 4. Lo que NO se encontró y dudas

1. **23HS45-4204S a 48 V y a 500/600 rpm**: no existe curva oficial (la publicada es 36 V, ≤420 rpm). **23HS41-4204S**: sin producto ni PDF en stepperonline.es; omc-stepperonline.com bloqueado (403).
2. **Curva del 23HE45-4204S en lazo cerrado con CL57T** (la publicada es en lazo abierto con DM556T/DM542T a 36 V) y a 48 V: NO ENCONTRADA. Ficha completa 23HE45 (inercia): bloqueada por JavaScript.
3. **Leadshine iSV57T-180 e iSV2-RS en leadshine.com**: páginas con error 500; datos tomados de stepperonline.es y de la ficha iSV-B23. **CS-D507/CL57 en leadshine.com**: listados no accesibles; usados CS-D508 y datasheet CS.
4. **"ISD08"**: no identificado en ninguna fuente. **JMC iHSS57 curvas y datos de ALM**: solo manual genérico iHSS60.
5. **Curvas par-velocidad de servos integrados** (iSV57T, IDS, JMC): NO ENCONTRADAS; los fabricantes solo publican nominal/pico. **Resistencia de frenado / regeneración** en drivers stepper y servos integrados: no documentada (solo umbrales de sobretensión).
6. **Precios**: Leadshine, JMC, Interroll 48 V, Pulseroller, UniDrive, Itoh: NO ENCONTRADOS (venta por canal). RobotShop, DigiKey (sin resultados), MercadoLibre y Altronics: bloqueados (403).
7. **Disponibilidad en Chile**: solo AFEL (stepper/DM556); MCI sin resultados; stepperonline.es no muestra política de envío (página vacía). Interroll/Pulseroller/Itoh: solo Brasil/México/"South America" (investigación previa).
8. **UniDrive 48 V**: existe el motor CORE 24/48 V, pero no se halló controlador ACG de 48 V ni el UD100/UD120 en 48 V; ZoneLogix PRO 2.0 es solo 24 V.
9. **Itoh Denki motor externo** ("external drive") y PM486FE: NO ENCONTRADOS. Tablas de PM500XE códigos 60/100: no localizadas en el texto.
10. **Interroll EC5000 48 V como motor externo**: el manual limita la carga con cabezal a 350 N y no publica curva par-velocidad (solo nominal/aceleración/arranque). **Pulseroller PGD-Ai-48**: sin curva, solo tabla por relación.
11. Dudas de lectura: valores "≈" leídos de gráficos escaneados (±5 % del fondo de escala); la interpolación a 573 rpm es lineal entre puntos vecinos.
12. Advertencias explícitas de resonancia/pérdida de pasos por modelo: NO ENCONTRADAS más allá de frases genéricas (anti-resonancia del driver; "loss of step problem in open loop").

---

## 5. Implicaciones para el diseño (sin decidir por el equipo)

- **¿Cumple un NEMA 23 open-loop 0.6–0.8 N·m a 573 rpm?** Evidencia a favor: par pull-out a 573–600 rpm de 1.1–1.5 N·m en la clase 2–3 N·m a 36–48 V (23HE45 36 V ≈1.4; 23HS30 48 V 1.12; 57CM23 48 V ≈1.45; 57CM26 48 V ≈1.15) → factor 1.4–1.9× sobre 0.8 N·m y 1.9–2.4× sobre 0.6 N·m. Evidencia en contra: (a) el 23HS45-4204S en concreto **no tiene curva oficial a 48 V ni sobre 420 rpm**; (b) pull-out no es par continuo y el fabricante del lazo cerrado señala que el lazo abierto necesita reserva de par; (c) el punto de trabajo está justo tras el codo 300–550 rpm de las curvas de motores de 85–113 mm; (d) sin encoder no hay señal de pérdida de sincronismo hacia el ESP32/gateway. Conclusión con evidencia: **viable para prototipo con DM556T a 48 V y rampas**, pero **no certificable como producto industrial** con las fuentes disponibles; el paso a 23HE45-4204S + CL57T-V41 cuesta ≈€54 y añade ALM, "position following error" y par ≈1.7 N·m a 600 rpm (CS-M22323 48 V).
- **Bus 48 V**: los drivers stepper/servo consultados disparan sobretensión a 60 V (DM556T, iSV-B23) — margen 12 V para la energía de las inversiones. El ecosistema MDR resuelve esto con chopper (HP5448, MultiControl 52 V). Un diseño con bus 48 V para 2 motores por módulo Omni y muchas inversiones debería prever clamping/chopper propio o fuente con capacidad de absorción, independiente del motor elegido.
- **Opciones del ecosistema MDR 48 V** (PGD-Ai-48 11:1: 0.75 N·m; EC5000 50 W 9:1: 0.63 N·m nominal) quedan en el borde inferior del requisito a 573 rpm, con reserva de aceleración 2.5× (Interroll) y holding 2.5× (Pulseroller) que sí cubre el transitorio de 0.203 + 0.15 N·m; a 1.0 m/s (382 rpm) las relaciones 13:1/15:1 dan 0.91–1.02 N·m. Ventaja: E/S M8 compatibles con los controles ZPA ya usados; desventaja: precios no publicados y sin canal en Chile.
- **UniDrive CORE 48 V** (1.7 N·m continuos hasta 700 rpm, 3.3 A) es el candidato con más margen de par dentro del ecosistema del cliente, pero exige diseñar la conmutación (sin sensores ni control a bordo) — coherente con el objetivo de tarjeta propia con ESP32, pero es un desarrollo de electrónica de potencia adicional.
- **Servos 48 V de 400 W** (IDS-C60AP-48V400W €148.87; JMC iHSV60-30-40-48) cumplen par con holgura (1.27 N·m nominal) y traen ALM, CANopen/RS485 y protecciones, pero doblan el coste del stepper closed-loop y consumen 10–11 A nominales a 3000 rpm (a 573 rpm el consumo real será mucho menor, no documentado).
- Si se mantiene stepper, la evidencia sugiere validar en banco: par a 573 rpm con carga de 0.8 N·m, temperatura de carcasa en servicio continuo, y comportamiento en inversiones con rampa; y registrar la curva medida como capa `measured` del proyecto.
