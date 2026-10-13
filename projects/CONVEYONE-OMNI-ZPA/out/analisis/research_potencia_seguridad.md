# Investigación: potencia DC 48/24 V, distribución en cadena, comunicación, seguridad funcional y EMC para línea ZPA + zonas Omni (Conveyone)

Fecha de acceso de todas las fuentes: **2026-09-03**. Fuentes primarias = fabricante/norma/organización del protocolo; las secundarias se marcan como **[SEC]**. Los datos que no se encontraron se marcan **NO ENCONTRADO** con lo que se buscó. Los cálculos propios se marcan **[CÁLCULO]**.

Método: 200 búsquedas web (inglés/español), lectura de fichas y manuales (PDF descargados y extraídos localmente; varias páginas devolvieron 403/503 y se indica). Archivos de texto extraídos: `scratchpad/wf/pdf/*.txt`.

---

## 1. Resumen ejecutivo

1. **Fuentes DIN Mean Well (verificado en fichas):** NDR-480-48 = 48 V/10 A/480 W, sobrecarga 105–130 % con apagado a los 3 s y rearme por corte de red, sin "power boost" ni paralelo; SDR-480-48 = 48 V/10 A con pico 15 A / 720 W por 3 s (150 %), relé DC-OK; TDR-960-48 = trifásica 340–550 VAC, 48 V/20 A, corriente compartida hasta 4 unidades ×0,9; DRP-480-48 es diseño antiguo (2021, PFC pasivo, 227 mm de ancho, 89 %). **DRP-960 no existe en el catálogo consultado.**
2. **DC/DC 48→24 V:** Mean Well DDR-240C-24 (entrada 33,6–67,2 V, 24 V/10 A, pico 150 % 3 s, aislamiento 4 kVdc, corriente compartida hasta 3+1) y DDR-120C-24 (24 V/5 A, 32 mm). Phoenix QUINT4-PS/48DC/24DC/5/PT existe (2910125) pero la ficha no pudo leerse (403); la variante de 10 A **NO ENCONTRADA**.
3. **Por qué 48 V en MDR:** Interroll: "Doubling the voltage halves the current, reducing the number of power supplies" y recomienda 48 V; corrientes EC5000 50 W: 3,4 A@24 V vs 1,7 A@48 V. Pulseroller: "Reduced cable gauge or longer cable runs due to decreased current load". Itoh Denki 48 V: **NO ENCONTRADO**.
4. **Caída de tensión [CÁLCULO con IEC 60228]:** a 20 A, 20 m ida+vuelta: 5,9 V (2,5 mm²), 3,7 V (4 mm²), 2,5 V (6 mm²). Con presupuesto de 6 V (48→42 V, mínimo de entrada motor ConveyLinx-Ai3-48), el trunk máximo a 20 A es ≈20 m (2,5 mm²), 32 m (4 mm²), 49 m (6 mm²) con carga concentrada al final.
5. **Protección selectiva DC a 48 V:** Phoenix CBM E4 24DC es **solo 18–30 V DC** (no sirve a 48 V); E-T-A ESX10-TC DC48V (18–60 V, 1–16 A, limitación 1,2×IN, 12,5 mm) sí; E-T-A REX12-T es solo 24 V. Fusibles DC: sin fuente primaria leída.
6. **Conectores:** M12 L-coded 12/16 A a 63 V DC, 4+FE (IEC 61076-2-111); M12 T-coded 12 A/63 V DC; Han Q 5/0 16 A; PTFIX 6/12×2,5 = 24 A/450 V push-in. 48 V DC queda dentro de PELV (IEC 61140: ≤120 V DC sin rizado; IEC 60204-1 §6.4: 60 V DC sin rizado en seco, cita secundaria); Interroll advierte que un EC5000 48 V en modo generador puede superar 60 V DC en el conector abierto.
7. **Comunicación en cadena:** ConveyLinx-Ai3-48 usa switch Ethernet de 3 puertos y admite hasta 221 controladores; EtherCAT cierra el puerto del vecino caído ("the rest of the network can continue") pero los aguas abajo se pierden salvo anillo; PROFINET MRP recupera en ≤200 ms para ≤50 nodos (IEC 62439-2); CANopen: 25 m@1 Mbit/s, 100 m@500 kbit/s, 500 m@125 kbit/s, 127 nodos; RS-485: 32 UL (hasta 256 con 1/8 UL), ~1200 m.
8. **Nodo intermedio sin alimentación:** en Ethernet en línea (switch embebido) se pierde el resto de la cadena salvo relé de bypass pasivo (patentes US12170518, US9641245); en CAN/RS-485 multipunto el nodo apagado queda pasivo y el bus sigue (el maestro detecta por heartbeat/boot-up).
9. **Seguridad:** EN 619:2022 (31-may-2022) cubre transportadores de rodillos e introduce PL requeridos para SRP/CS y velocidades máximas por masa y "área"; los valores concretos de PLr **NO ENCONTRADOS** (norma de pago). Relés: PNOZ s3 (PL e/Cat 4, PFHd 2,31E-9, apertura 10–20 ms), XPSUAF13AP (PL e, PFHd 1,13E-9, 500 Ω de línea), 3SK1111 (PL e, PFHd 1,7E-9). STO = parada categoría 0 sin aislamiento eléctrico ni frenado (Nidec/CT); drivers paso a paso con STO SIL 3/PL e Cat 3 existen (Oriental Motor AZ).
10. **EN ISO 13857:** ranura 20–30 mm → 850 mm (200 mm si ranura ≤65 mm); 12–20 mm → 120 mm; e ≤4 mm → 2 mm; estructuras <1400 mm no sin medidas adicionales.
11. **EMC:** ABB: bandejas separadas, ≥300/500 mm entre motor y control, cruces a 90°, blindaje 360° en ambos extremos (o capacitor 3,3 nF/630 V en el extremo remoto para señales); Parker (drivers paso a paso): filtro a ≤50 mm de la fuente, control ≥200 mm de relés/contactores, blindaje 360° al cuerpo del motor, pantalla no unida al gabinete en la entrada sino devuelta al driver.

---

## 2. Hallazgos por sub-tema

### 2(a) Fuentes DIN 48 V y 24 V, y convertidores DC/DC

#### Tabla comparativa fuentes AC/DC (fichas Mean Well leídas íntegras)

| Modelo | Entrada | Salida | Ajuste | Pico / "boost" | Inrush (typ) | Sobrecarga (texto ficha) | Paralelo | T.° trabajo | Efic. | Hold-up | Ancho | Fecha ficha |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NDR-480-48 | 90–264 VAC / 127–370 VDC | 48 V / 10 A / 480 W | 48–55 V | **No especifica pico** | 20 A/115 VAC; 35 A/230 VAC | "105 ~ 130% rated output power … Constant current limiting, unit will shut down after 3 sec., re-power on to recover" | **No mencionado** (sin P+/P−) | −20…+70 °C (con derating) | 92,5 % | 16 ms | 85,5 mm | 2025-01-10 |
| NDR-240-24 | 90–264 VAC | 24 V / 10 A / 240 W | 24–28 V | No especifica | 20 A/115; 35 A/230 | "105 ~ 130% … Constant current limiting, recovers automatically after fault condition is removed" | No mencionado | −20…+70 °C | 88,5 % | 28 ms/230 VAC | 63 mm | 2026-04-03 |
| SDR-480-48 | 90–264 VAC / 127–370 VDC | 48 V / 10 A / 480 W | 48–55 V | **15 A pico; 720 W (3 s) = 150 %** | 40 A/115; 80 A/230 | "Normally works within 110 ~ 150% rated output power for more than 3 seconds and then shut down o/p voltage with auto-recovery"; ">150% … constant current limiting with auto-recovery within 2 seconds" | No mencionado | −25…+70 °C | 94 % | 14 ms | 85,5 mm | 2025-02-17 |
| SDR-240-24 | 88–264 VAC | 24 V / 10 A / 240 W | 24–28 V | 15 A; 360 W (3 s) | 33 A/115; 55 A/230 | Igual texto que SDR-480 | No mencionado | −25…+70 °C | 94 % | 20 ms | 63 mm | 2025-02-17 |
| DRP-480-48 | **180–264 VAC** / 250–370 VDC | 48 V / 10 A / 480 W | 48–53 V | No | 40 A/230 (cold start) | "105 ~ 150% … Constant current limiting, recovers automatically" | No mencionado | −20…+70 °C | 89 % (PFC pasivo) | 16 ms | **227 mm** | 2021-09-15 |
| TDR-960-48 | **Trifásica 340–550 VAC** ("Dual phase operation possible"), 480–780 VDC | 48 V / 20 A / 960 W | 48–55 V | No | 60 A (cold start) | "105 ~ 130% … Constant current limiting, unit will shut down after 3 sec., re-power on to recover" | **Sí: hasta 4 unidades, I_total = I_nom × N × 0,9, ΔV < 0,2 V, carga mín. 5 %** | −30…+70 °C | 94,5 % | 12 ms/400 VAC | 110 mm | 2024-09-06 |
| DRP-960-48 | — | — | — | — | — | **NO ENCONTRADO**: no aparece en la búsqueda del catálogo Mean Well (solo DRP-480 y TDR-960) | — | — | — | — | — | — |

Notas de ficha relevantes:
- SDR-480 nota 6: "3 seconds peak power max. and the average output power should not exceed the rate power." Curva de pico extraída: 720 W durante 3 s y luego 480 W durante 50 s, o 720 W 3 s y 240 W 15 s (lectura de la figura; verificar en PDF).
- SDR nota 5 (holguras de montaje): "Installation clearances : 40mm on top, 20mm on the bottom, 5mm on the left and right side are recommended when loaded permanently with full power." Manual de instalación SDR: "Always allow good ventilation clearances, 5mm left and right, 40mm above and 20mm below".
- Derating térmico: todas indican "Refer to Derating Curve"; la pendiente numérica está solo en gráfico (no extraíble del texto) → **ver figura de cada PDF**. Derating por altitud: "3.5 °C/1000m with fanless models … for operating altitude higher than 2000m".
- DC-OK: SDR-480/240 y TDR-960 tienen relé DC-OK ("60Vdc/0.3A, 30Vdc/1A, 30Vac/0.5A resistive load"). NDR solo LED.
- Todas las NDR/SDR indican "(meet EN60204-1)" en normas de seguridad.

**Implicación práctica (propia):** para arrancar motores NEMA 23/BLDC con picos, la SDR (150 % 3 s) tolera transitorios; la NDR-480 se apaga tras 3 s por encima de 105–130 % y requiere corte de red para rearmar. Ninguna de las de 480 W monofásicas declara paralelo; TDR-960 sí.

#### Convertidores DC/DC 48→24 V (carril DIN)

| Modelo | Entrada | Salida | Pico | Sobrecarga | Aislamiento I/O | UVLO | Corriente compartida | Efic. | Ancho | T.° |
|---|---|---|---|---|---|---|---|---|---|---|
| Mean Well DDR-240C-24 | 33,6–67,2 Vdc; 5,6 A @48 V; inrush 30 A | 24 V / 10 A / 240 W (24–28 V) | 15 A; 360 W (3 s) | "Normally works within 150% rated output power for more than 3 seconds and then constant current protection 105~135% … with auto-recovery" | 4 kVdc I/P-O/P | ON ≥33,6 V, OFF ≤33 V | Sí: "Up to 960W (3+1 units)", máx. 4, ×0,9, carga mín. 3 % | 91 % | 40 mm | −40…+70 °C |
| Mean Well DDR-120C-24 | 33,6–67,2 Vdc; 2,8 A @48 V; inrush 5 A | 24 V / 5 A / 120 W | 7,5 A; 180 W (3 s) | Igual texto | 4 kVdc | ON ≥33,6 V, OFF ≤33 V | **No listada** en ficha | 91 % | 32 mm | −40…+70 °C |
| Phoenix QUINT4-PS/48DC/24DC/5/PT (2910125) | 48 V DC (título de producto) | 24 V DC / 5 A | SFB Technology (título) | — | — | — | — | — | — | **Ficha no legible (403 en phoenixcontact.com y en distribuidor)**; variante 10 A **NO ENCONTRADA** |

Nota: el UVLO de DDR-xxxC a 33,6 V significa que la lógica 24 V derivada del bus 48 V se cae si el bus baja de ~33 V (relevante para caída de tensión al final de la cadena).

### 2(b) Distribución DC 48 V en cadena

#### Por qué los fabricantes MDR pasan a 48 V (citas)

| Fabricante | Cita textual | Datos numéricos |
|---|---|---|
| Interroll (RollerDrive EC5000) | "Doubling the voltage halves the current, reducing the number of power supplies required compared to typical 24 VDC systems." / "the use of longer cables or cables with smaller cross-sections and helps reduce overall system costs." / "For these reasons, we recommend using RollerDrive EC5000 in 48 VDC." | Ficha EC5000 ø50 IP54: "Rated current 1.4 A 2.4 A 3.4 A 0.7 A 1.2 A 1.7 A" y "Starting current 3.0 A 5.5 A 7.5 A 1.5 A 2.8 A 3.8 A" (20/35/50 W a 24 V vs 48 V) |
| Interroll DriveControl 2048 | "Voltage range 24 V DC: 19 to 26 V DC 48 V DC: 38 to 55 V DC"; "Current consumption DriveControl: approx. 0.5 A + current of RollerDrive EC5000"; freno chopper integrado | Cable alimentación "Fine-wired, 1.5 mm² (AWG 16)" |
| Interroll manual EC5000 | "Rated voltage 48 V DC, protected extra-low voltage (PELV)"; "power supply units used are suitable for energy recovery (up to 35 V /60 V)"; "Due to tolerances and/or voltage drop on cables, it is possible that the RollerDrive does not turn." | Aviso: en 48 V "in generator operation … the permissible contact voltage of 60 V DC at the open connector is exceeded." |
| Pulseroller (Senergy-Ai-48) | "Reduced cable gauge or longer cable runs due to decreased current load." / "Potential cost savings through a reduction in required power supply units." / producto: "Longer cables feasible", "Less power supplies needed" | Motor 50 W, 48 VDC |
| Pulseroller ConveyLinx-Ai2/Ai3-48 | "Motor Input Voltage: 42 to 48 VDc"; "Logic Input Voltage: 18 to 48 VDc"; "Separate power supply for motors and logic"; "Rated Motor Output Current: 1.6A (50W)" | — |
| Itoh Denki | **NO ENCONTRADO** (3 búsquedas: "Itoh Denki 48V Power Moller", "PM605XP 48V", "itohdenki.com 48V"); solo aparecen modelos 24 V y AC | — |

#### Fórmula y ejemplos de caída de tensión **[CÁLCULO]**

ΔV = 2 · L · I · R′ (ida y vuelta, carga concentrada en el extremo), con R′ = resistencia máxima a 20 °C según IEC 60228 clase 2 (cobre desnudo, tabla Lapp/IEC 60228): 2,5 mm² = 7,41 Ω/km; 4 mm² = 4,61 Ω/km; 6 mm² = 3,08 Ω/km (clase 5 flexible: 7,98 / 4,95 / 3,30 Ω/km, ≈+7 %).

| S (mm²) | L (m) | 10 A | 20 A | 30 A |
|---|---|---|---|---|
| 2,5 | 10 | 1,48 V (3,1 %) | 2,96 V (6,2 %) | 4,45 V (9,3 %) |
| 2,5 | 20 | 2,96 V (6,2 %) | 5,93 V (12,3 %) | 8,89 V (18,5 %) |
| 2,5 | 30 | 4,45 V (9,3 %) | 8,89 V (18,5 %) | 13,34 V (27,8 %) |
| 2,5 | 50 | 7,41 V (15,4 %) | 14,82 V (30,9 %) | 22,23 V (46,3 %) |
| 4 | 10 | 0,92 V (1,9 %) | 1,84 V (3,8 %) | 2,77 V (5,8 %) |
| 4 | 20 | 1,84 V (3,8 %) | 3,69 V (7,7 %) | 5,53 V (11,5 %) |
| 4 | 30 | 2,77 V (5,8 %) | 5,53 V (11,5 %) | 8,30 V (17,3 %) |
| 4 | 50 | 4,61 V (9,6 %) | 9,22 V (19,2 %) | 13,83 V (28,8 %) |
| 6 | 10 | 0,62 V (1,3 %) | 1,23 V (2,6 %) | 1,85 V (3,9 %) |
| 6 | 20 | 1,23 V (2,6 %) | 2,46 V (5,1 %) | 3,70 V (7,7 %) |
| 6 | 30 | 1,85 V (3,9 %) | 3,70 V (7,7 %) | 5,54 V (11,5 %) |
| 6 | 50 | 3,08 V (6,4 %) | 6,16 V (12,8 %) | 9,24 V (19,2 %) |

(% referido a 48 V.) A 70 °C de conductor la resistencia es ≈20 % mayor (coeficiente del cobre; no citado, dato físico general) → sumar margen.

**Longitud máxima de trunk** L_max = ΔV_adm / (2 · I · R′). Con ΔV_adm = 6 V (48 V nominal → 42 V mínimo motor ConveyLinx-Ai3-48) y carga concentrada al final: 10 A → 40 m (2,5), 65 m (4), 97 m (6); 20 A → 20 m (2,5), 32 m (4), 49 m (6); 30 A → 13 m (2,5), 22 m (4), 32 m (6). Con ΔV_adm = 3 V, la mitad. En una cadena con carga distribuida uniformemente la caída total es ≈ la mitad de la concentrada (Σ L_i·I_i). Elevar la consigna de la fuente (ajuste 48–55 V en NDR/SDR/TDR) amplía el presupuesto, pero el máximo de entrada del equipo (p. ej. 48 V en ConveyLinx-Ai3-48, 55 V en DriveControl 2048, 60 V en ESX10-TC) lo limita.

#### Protección selectiva DC

| Dispositivo | Tensión | Corrientes | Limitación activa / disparo | Otros | Apto 48 V |
|---|---|---|---|---|---|
| Phoenix CBM E4 24DC/0.5-10A NO-R (2905743) | "Operating voltage 18 V DC ... 30 V DC"; "Overvoltage switch-off ≥ 30.5 V DC (active)" | "0.5 / 1 / 2 / 4 / 6 / 10 A DC (adjustable per output channel)"; IN máx. 40 A | "typ. 1.5 x IN (2 - 10 A)", "typ. 2.0 x IN (0.5 - 1 A)"; "0.02 s (> 1.3 x IN)", "30 s (1.1 ... 1.3 x IN)" | "Max. capacitive load 75000 µF"; "Short-circuit switching capacity 300 A"; 41 mm; push-in IN+ hasta 16 mm² | **No** (24 V) |
| E-T-A ESX10-TC DC48V | "DC 48 V (18...60 V)"; "reverse voltage protection up to 63V" | "1 A, 2 A, 3 A, 4 A, 6 A, 8 A, 10 A, 16 A, 12,5 A" | "Current limitation typically 1,2 x IN" | "only 12.5mm wide"; contacto aux. N/O 0,2 A; "selective protection for all DC 24 V, DC 36 V and DC 48 V load circuits" | **Sí** |
| E-T-A REX12-T | "DC 24 V (18...30 V)" | 1–10 A por canal | Selectivo: "responding to short circuit or overload faster than the switch mode power supply" | "up to 16 circuit protectors can be placed on the symmetrical rail"; 12,5 mm; **sin versión 48 V** | No |
| Murrelektronik MICO+ 48V DC 4.4 / 4.6 | 48 V DC (título de producto) | 4 canales, 1/2/3/4 A ó 1/2/4/6 A (snippet de búsqueda; página no legible) **[SEC, no verificado]** | — | — | Sí (según listado) |
| Fusibles DC (IEC 60269 gG) | **NO ENCONTRADO en fuente primaria** (descargas Eaton fallaron). Guía secundaria: "AC-rated fuses should not be used in DC circuits unless the datasheet explicitly supports the DC voltage and application." **[SEC]** | | | | |

#### Conectores de potencia encadenables

| Conector | Tensión / corriente | Contactos | Norma | Sección | Fuente |
|---|---|---|---|---|---|
| M12 L-coded (binder) | "Rated current of 12A/ 16A at 63VDC" | "4+FE contacts" | "DIN EN 61076-2-111"; IP67; UL 2238 | "1.00-2.50 mm² | AWG 18-14" y "2.50-6.00 mm² | AWG 14-10" | binder-usa.com |
| M12 L-coded (Molex Brad) | 16 A @63 V con 2,5 mm²; 12 A @63 V con 1,5 mm² **[snippet; PDF no legible]** | 4+FE | IEC 61076-2-111 | | molex.com (503) |
| M12 T-coded (binder) | "63 VDC", "12 A" | "4 contacts" | "DIN EN 61076-2-111"; IP67/IP68 | | binder-usa.com |
| HARTING Han Q 5/0-M-C | "16 A"; "600 V" (UL/CSA) [may.berlin: 16 A/400 V **SEC**] | 5 (+PE) | — | "0.14 ... 2.5 mm²" crimp; 500 ciclos; −40…+125 °C | harting.com |
| Phoenix PTFIX 6/12X2,5 (bloque push-in) | "24A", "450 V" | "13 connections" | — | carga 0,14–4 mm², línea 0,5–10 mm² | rspsupply.com (distribuidor) |
| M12 D-coded / X-coded (datos) | D: 4 pines, 100 Mbit/s, IEC 61076-2-101; X: 8 pines, 10 Gbit/s, IEC 61076-2-109 **[SEC: snippets Farnell/L-com; no leídos]** | | | | |

#### Clasificación PELV/SELV

- IEC 61140 (vía Wikipedia **[SEC]**): ELV "does not exceed 120 volts (V) for ripple-free direct current (DC) or 50 V RMS for alternating current (AC)"; SELV con "simple separation … from earth"; PELV "can have a protective earth (ground) connection".
- Delta **[SEC]**: SELV normal ≤60 VDC; fallo simple ≤120 VDC.
- IEC 60204-1:2016 (muestra iTeh, índice): cláusula "6.4 Protection by the use of PELV" y "6.4.2 Sources for PELV"; el límite "nominal voltage does not exceed 25 V a.c. r.m.s. or 60 V ripple-free d.c." proviene de un informe de ensayo (wewontech) visto solo en snippet **[SEC, no leído]**.
- Interroll (primaria): 24 V y 48 V declarados "protected extra-low voltage (PELV)" y aviso de 60 V DC de contacto en modo generador.
- Conclusión: un bus 48 V DC con negativo puesto a tierra (práctica ConveyLinx: "tie all DC common terminals together and a single connection to earth ground", snippet manula **[no verificado]**) es PELV; hay que asegurar que sobretensiones regenerativas (frenado) no superen 60 V → chopper/limitador (Interroll: recuperación "up to 35 V /60 V").

### 2(c) Comunicación en cadena

| Tecnología | Topología / conector | Límites | Latencia típica | Nodo intermedio sin alimentación |
|---|---|---|---|---|
| Ethernet con switch 2/3 puertos embebido (ConveyLinx) | "3-Port Ethernet switch with standard RJ-45 ports for easy daisy chaining"; "Recognizes Ethernet I/P, Modbus TCP, Profinet I/O, and CC-Link IE Field Basic"; "up to 221 controllers" | 100 m entre nodos (Ethernet) | Ciclo PROFINET RT "512 ms down to 250 µs" | El switch embebido sin alimentación corta la línea; la industria añade relé de bypass pasivo: patente US12170518 (Schneider Electric Buildings) "depletion-mode transistors...will be open when provided with power and will automatically close when power is not provided"; US9641245: "In the conventional daisy chain architecture, failure of a single communication node impacts subsequent communication nodes." ConveyLinx: lógica alimentada aparte para mantener comunicaciones en E-stop (snippet manula **[no verificado]**) |
| PROFINET MRP (anillo) | IEC 62439-2; MRM + MRC | "up to 50 nodes" | "The default maximum recovery time on the Cisco IE switch is 200 ms for a ring composed of up to 50 nodes."; perfiles "10 ms, 30 ms, 200 ms and 500 ms" | Un solo fallo (enlace o nodo) se cierra por el otro lado del anillo: "both ring ports of the MRM change to the forwarding state" |
| PROFINET IRT | Requiere hardware IRT: "All switches in the IRT domain must support IRT." | — | "cycle times down to 31.25 µs and one µs of jitter" | Igual que RT/MRP |
| EtherCAT | Línea/árbol/anillo; "Up to 65,535 devices"; "up to 100m apart" | — | "short cycle times (≤ 100 µs)"; jitter "significantly less than 1μs"; hot-connect "< 15 μs" | "If a neighboring station is removed, then the port is automatically closed so the rest of the network can continue to operate" (los aguas abajo quedan fuera en línea); anillo: "single-fault tolerant, i.e. communication with the slaves can continue if the cable is interrupted in one place"; "Failure of several EtherCAT slaves is not covered" |
| CANopen (CiA 301) | Bus lineal 120 Ω; node-ID "[1..127]" | "1 Mbit/s 25 m; 800 kbit/s 50 m; 500 kbit/s 100 m; 250 kbit/s 250 m; 125 kbit/s 500 m; 50 kbit/s 1.000 m; 20 kbit/s 2.500 m; 10 kbit/s 5.000 m" ("propagation delay of 5 ns/m") | **[CÁLCULO]** trama 8 bytes ≤ ~135 bit (Wikipedia: "8n + 44 + ⌊(34 + 8n − 1)/4⌋") → ≈0,14 ms @1 Mbit/s, ≈0,27 ms @500 kbit/s, ≈1,1 ms @125 kbit/s por trama | El nodo apagado es pasivo y el bus sigue; detección por heartbeat: "If the heartbeat cycle fails for the heartbeat producer the local application on the heartbeat consumer will be informed"; un boot-up inesperado "is considered as a sign for an error condition (e.g., erroneous power supply of the related CANopen device)" |
| RS-485 / Modbus RTU | Bus 2 hilos, terminado | TI: "Standard-compliant drivers must be able to drive 32 of these unit loads"; con 1/8 UL "up to 256"; con polarización failsafe (20 UL) "up to a maximum of 96 devices"; longitud: "the product of the line length [m] times the data rate [bps] should be < 10^7"; "For a 22 AWG cable, 120 Ω, UTP, this occurs at approximately 1200 m"; "4000-foot maximum cable length (at 100 kbps)" | Tiempo de trama = bits/baud (p. ej. 8 bytes a 19 200 bit/s ≈ 4,6 ms + silencio 3,5 caracteres — spec Modbus.org **no legible**, dato de memoria general, verificar) | Nodo apagado pasivo; el bus sigue |

Conectores de datos: M12 D-coded (4 p., 100 Mbit/s) para PROFINET/EtherCAT/EtherNet/IP; X-coded (8 p., 10 Gbit/s) **[SEC]**. CANopen usa M12 A-coded 5 p. según CiA 303-1 (no verificado en esta sesión).

### 2(d) Seguridad funcional para transportadores de acumulación

| Tema | Hallazgo | Fuente |
|---|---|---|
| EN 619:2022 | Publicada "31 May 2022"; aplica a "mobile conveyors, belt conveyors, roller conveyors, chain conveyors, etc., singly or combined to form a conveyor system"; novedades: "the area concept, subdividing locations in a company with defined boundaries", "maximum speeds depending on the mass and on the different areas", "required performance levels for safety related parts of control systems". **Valores de PLr y requisitos de paro de emergencia del texto: NO ENCONTRADOS (norma de pago; iTeh/BSI 403).** | webstore.ansi.org |
| EN 620:2021 | "Safety requirements for fixed belt conveyors for bulk materials" → no aplica a cajas (unit loads). | ANSI/BSI (títulos) |
| ISO 3691 | No investigado (título: camiones industriales); no aplica por alcance — verificar. | — |
| ISO 13849-1 | PFHd por PL (IDEC **[SEC]**): a "≥10-5 and <10-4"; b "≥3 × 10-6 and <10-5"; c "≥10-6 and <3 × 10-6"; d "≥10-7 and <10-6"; e "≥10-8 and <10-7". Parámetros gráfico de riesgo S1/S2, F1/F2, P1/P2. | idec.com |
| PLr típico del paro de emergencia | Snippet secundario: "The minimum required reliability for the emergency stop safety function is Performance Level (PLr) "c" under ISO 13849-1" y arquitectura habitual "PLd Category 3" **[SEC, página 403; no verificado en ISO 13850]**. | industrialmonitordirect.com |
| Pilz PNOZ s3 (750103/751103) | "PL e Cat. 4 SIL CL 3 2,31E-09 SIL 3 2,03E-06 20" (PFHd 1/h, PFD, TM años); 2 contactos de seguridad N/O 6 A (AC1 240 V / DC1 24 V, 150 W); "Delay-on de-energisation With E-STOP typ. 10 ms / max. 20 ms"; "With power failure typ. 40 ms / max. 60 ms"; resistencia máx. de cable 30 Ω (monocanal o bicanal con detección de cortos), 60 Ω (bicanal sin detección); 24 V DC −15/+10 %; ancho 17,5 mm; −10…55 °C. Aviso: "With single-channel wiring the safety level of your machine/plant may be lower than the safety level of the unit". | Manual 21395-EN-14 |
| Schneider XPSUAF13AP | "Can reach PL e/category 4 conforming to ISO 13849-1"; "PFHd = 1.13E-09"; "MTTFd > 30 years"; 3 NO (5 A AC-1/DC-1, 3 A DC-13); "Maximum line resistance 500 Ohm"; "Maximum response time on input open 20 Ms"; 22,5 mm; entradas conforme ISO 13850/ISO 14119/OSSD. | Ficha SE 24-Nov-2020 |
| Siemens 3SK1111-2AB30 | "stop category according to IEC 60204-1 0"; "PFHD … 1.7E-9 1/h"; "category according to EN ISO 13849-1 4"; PL "e"; SIL 3; 3 NO (5 A DC-13 24 V); "backslide delay time after opening of the safety circuits typical 10 ms"; T1 20 a; 22,5 mm; push-in. | Ficha Siemens 9/24/2024 |
| STO en drivers | Guía Control Techniques/Nidec: "STO provides a category 0 stop in accordance with IEC 60204-1 (EN 60204-1). Power is removed immediately from the motor."; "it is not intended to provide safe electrical isolation"; "STO does not provide braking". Oriental Motor (driver paso a paso AZ): "The STO function of the AZ series driver is rated for SIL 3 and PL e (Category 3)."; "meets the requirements of IEC 61800-5-2 and IEC 60204-1 (Stop Category 0)"; entradas "redundant, normally-closed safety inputs". | nidec / orientalmotor |
| EN 60204-1:2016 | Índice (muestra iTeh): "6.4 Protection by the use of PELV", "10.7 Emergency stop devices" (10.7.1 ubicación, 10.7.2 tipos, 10.7.3 uso del seccionador). Abstract IEC: cambios en "requirements pertaining to safe torque off of PDS, emergency stop, and control circuit protection". Requisito de rearme: "reset shall not initiate a restart" (snippet Synapticon/MS101 **[SEC, no leído; páginas 403]**). | iteh.ai / webstore.iec.ch |
| EN ISO 13857:2019 Tabla 4 (alcance a través de aberturas, ≥14 años; distancias s_r en mm, ranura/cuadrado/redondo) | e ≤4: ≥2/≥2/≥2; 4<e≤6: ≥10/≥5/≥5; 6<e≤8: ≥20/≥15/≥5; 8<e≤10: ≥80/≥25/≥20; 10<e≤12: ≥100/≥80/≥80; 12<e≤20: ≥120/≥120/≥120; 20<e≤30: ≥850¹/≥120/≥120; 30<e≤40: ≥850/≥200/≥120; 40<e≤120: ≥850/≥850/≥850. ¹"If the length of the slot opening is ≤ 65 mm, the thumb will act as a stop and the safety distance can be reduced to 200 mm." | Troax (reproduce ISO 13857:2019) **[SEC fiel]** |
| EN ISO 13857 alcance por encima / alrededor / cuerpo | "Protective structures lower than 1,400 mm should not be used without additional safety measures."; Tabla 3 (alcance alrededor con limitación): ≥850 / ≥550 / ≥230 / ≥130 mm; "Slot openings e > 180 mm, square and round openings e > 240 mm permit full body access."; hueco suelo-resguardo ≤180 mm (4.4). | Troax |
| Requisitos de guardas | Referencia a ISO 14120 para diseño de resguardos (Troax). Texto de EN 619 sobre nips en rodillos/correas: **NO ENCONTRADO**. | — |

### 2(e) Prácticas EMC para gabinetes con drivers paso a paso/BLDC + bus + sensores

| Práctica | Cita | Fuente |
|---|---|---|
| Separación de cables | "Install the motor cable, input power cable and control cables on separate trays."; figura: "min. 300 mm (12 in)", "min. 500 mm (20 in)", "min. 200 mm (8 in)", cruces "90°"; "Where control cables must cross power cables, make sure that they are arranged at an angle as near to 90 degrees as possible." | ABB, Grounding and cabling of drive systems |
| Blindaje 360° | "correct cabling and 360° grounding of the cable shield at both ends effectively decrease these voltages" (motor); "Ground the outer shields of all control cables 360° at a grounding clamp at the drive cable entry."; extremo remoto de cables de control: "ground them indirectly via a high-frequency capacitor with a few nanofarads, for example, 3.3 nF/630 V" | ABB |
| Señales | "Run analog and digital signals in separate, shielded cables. Do not mix 24 V DC and 115/230 V AC signals in the same cable."; "ABB recommends galvanic isolation of control signals especially at long distances." | ABB |
| PE | Conductor PE mínimo "2.5 mm² if the conductor is mechanically protected, 4 mm² if the conductor is not mechanically protected" | ABB |
| Filtro de red | "Mount the filter within 2 inches (50mm) of the power supply or transformer"; "one filter per DC power supply" | Parker OEM750 EMC guide (driver paso a paso) |
| Cables de control | "route control signal connections well away from relays and contactors—at least 8 inches (200 mm)"; "should only cross the path of these cables at right angles" | Parker |
| Cable de motor | "Termination of the braid shield at the motor must be made using a 360° bond to the motor body"; con motores de cables volantes "converted into a braided-screen cable within 4 inches (10cm) of the motor body"; "There must be no break in the 360° coverage"; "The cable screen must not be connected to the cabinet at the point of entry. Its function is to return high-frequency chopping current back to the drive or controller." | Parker |
| R-clamp / ferritas | "The function of the R-clamp is to provide a 360 degree metallic contact"; ferritas en cables de motor, E/S y comunicaciones cerca del conector | Parker |
| Holguras térmicas fuentes | "40mm on top, 20mm on the bottom, 5mm on the left and right side" | Mean Well SDR |

---

## 3. Tabla de datos numéricos con fuente

| # | Dato | Valor | Fuente (URL) | Tipo |
|---|---|---|---|---|
| 1 | NDR-480-48 salida / ajuste / inrush | 48 V, 10 A, 480 W; 48–55 V; 20 A/115 VAC, 35 A/230 VAC | https://www.meanwell.com/Upload/PDF/NDR-480/NDR-480-SPEC.PDF | Primaria |
| 2 | NDR-480 sobrecarga | 105–130 %, corte tras 3 s, rearme por corte de red | ídem | Primaria |
| 3 | NDR-480 eficiencia / hold-up / ancho / T.° | 92,5 % (48 V); 16 ms; 85,5 mm; −20…+70 °C | ídem | Primaria |
| 4 | NDR-240-24 | 24 V/10 A/240 W; inrush 20/35 A; 88,5 %; 28 ms; 63 mm | https://www.meanwell.com/Upload/PDF/NDR-240/NDR-240-SPEC.PDF | Primaria |
| 5 | SDR-480-48 pico | 15 A; 720 W (3 s) | https://www.meanwell.com/Upload/PDF/SDR-480/SDR-480-SPEC.PDF | Primaria |
| 6 | SDR-480 inrush / hold-up / efic. / T.° | 40 A/115, 80 A/230; 14 ms; 94 %; −25…+70 °C | ídem | Primaria |
| 7 | SDR-480 DC-OK relé | 60 Vdc/0,3 A; 30 Vdc/1 A | ídem | Primaria |
| 8 | SDR-240-24 | 24 V/10 A; pico 15 A/360 W 3 s; inrush 33/55 A; 20 ms; 63 mm | https://www.meanwell.com/Upload/PDF/SDR-240/SDR-240-SPEC.PDF | Primaria |
| 9 | DRP-480-48 | 180–264 VAC; 48 V/10 A; 89 %; 40 A cold start; 227 mm | https://www.meanwell.com/Upload/PDF/DRP-480/DRP-480-SPEC.PDF | Primaria |
| 10 | TDR-960-48 | 340–550 VAC 3φ; 48 V/20 A/960 W; 94,5 %; 60 A; 110 mm; −30…+70 °C | https://www.meanwell.com/Upload/PDF/TDR-960/TDR-960-SPEC.PDF | Primaria |
| 11 | TDR-960 paralelo | máx. 4 unidades; I = I_nom×N×0,9; ΔV<0,2 V; carga mín. 5 % | ídem | Primaria |
| 12 | DDR-240C-24 | 33,6–67,2 Vdc; 5,6 A@48 V; 24 V/10 A; pico 15 A/360 W 3 s; 4 kVdc; 91 %; 40 mm; inrush 30 A | https://www.meanwell.com/Upload/PDF/DDR-240/DDR-240-spec.pdf | Primaria |
| 13 | DDR-240 paralelo / UVLO | hasta 960 W (3+1); ×0,9; ON ≥33,6 V, OFF ≤33 V | ídem | Primaria |
| 14 | DDR-120C-24 | 33,6–67,2 Vdc; 2,8 A@48 V; 24 V/5 A/120 W; pico 7,5 A/180 W 3 s; 91 %; 32 mm | https://www.meanwell.com/Upload/PDF/DDR-120/DDR-120-spec.pdf | Primaria |
| 15 | EC5000 corrientes 24/48 V | nominal 1,4/2,4/3,4 A vs 0,7/1,2/1,7 A; arranque 3,0/5,5/7,5 A vs 1,5/2,8/3,8 A | https://www.interroll.com/fileadmin/products/product_data/EC-5000-IP54/EC5000_50mm_IP54_EN.pdf | Primaria |
| 16 | DriveControl 2048 rango 48 V | 38–55 V DC; 0,5 A + motor; 1,5 mm² | https://www.interroll.com/fileadmin/products/product_data/DriveControl-2048/DriveControl2048_EN.pdf | Primaria |
| 17 | EC5000 manual PELV / regeneración / 60 V | PELV 48 V; recuperación hasta 35/60 V; contacto 60 V DC en generador | https://www.interroll.com/fileadmin/Downloads/User_Manuals/RollerDrive/User_Manual_EC5000_EN.pdf | Primaria |
| 18 | ConveyLinx-Ai3-48 | motor 42–48 VDC; lógica 18–48 VDC; 1,6 A (50 W); 3 puertos; 221 controladores | https://www.pulseroller.com/products/48-volt/senergy-ai-48-controllers/conveylinx-ai2ai3-48v | Primaria |
| 19 | IEC 60228 R máx. 20 °C clase 2 | 2,5 mm² 7,41; 4 mm² 4,61; 6 mm² 3,08 Ω/km (clase 5: 7,98/4,95/3,30) | https://t3.lappcdn.com/fileadmin/DAM/Lapp_Camunacavi/catalog_pages_1_17/T11_Conductor_resistances_and_strand_structure.pdf | Primaria (tabla de fabricante que cita IEC 60228) |
| 20 | Caída de tensión 20 A, 20 m | 5,93 V (2,5); 3,69 V (4); 2,46 V (6) | cálculo con #19 | [CÁLCULO] |
| 21 | CBM E4 24DC rango / limitación / disparo | 18–30 V DC; 1,5×IN (2–10 A); 0,02 s >1,3×IN; 30 s 1,1–1,3×IN; 75 000 µF; 300 A; 41 mm | https://docs.rs-online.com/0967/0900766b81424d87.pdf | Primaria (ficha Phoenix vía RS) |
| 22 | ESX10-TC DC48V | 18–60 V; 1–16 A; 1,2×IN; 12,5 mm; inversa 63 V | https://global.e-t-a.com/products/electronic_overcurrent_protection/electronic_overcurrent_protection_dc/p/esx10_tc_dc_48_v/ ; https://global.e-t-a.com/company/news_stories/news/electronic_circuit_protector_dc_48v/ | Primaria |
| 23 | REX12-T | 18–30 V; hasta 16 en carril; 12,5 mm; sin 48 V | https://www.e-t-a.com/products/circuit_protection_devices/electronic_overcurrent_protection/p/rex12_t/ | Primaria |
| 24 | M12 L-coded | 12 A/16 A @63 VDC; 4+FE; IEC 61076-2-111; IP67 | https://www.binder-usa.com/us-en/products/automation-technology-voltage-and-power-supply/m12-l | Primaria |
| 25 | M12 T-coded | 12 A; 63 VDC; 4 contactos | https://www.binder-usa.com/us-en/products/automation-technology-voltage-and-power-supply/m12-t | Primaria |
| 26 | Han Q 5/0-M-C | 16 A; 600 V (UL/CSA); 0,14–2,5 mm²; 500 ciclos | https://www.harting.com/en-US/p/Han-Q-5-0-M-C-09120053001 | Primaria |
| 27 | PTFIX 6/12X2,5 | 24 A; 450 V; 13 conexiones; 0,14–4 / 0,5–10 mm² | https://rspsupply.com/p-41953-phoenix-contact-3273362-distribution-block-24v-24a-push-in-terminal.aspx | Distribuidor |
| 28 | ELV/SELV/PELV IEC 61140 | 120 V DC sin rizado / 50 V AC | https://en.wikipedia.org/wiki/Extra-low_voltage | [SEC] |
| 29 | SELV DC límites | 60 VDC normal; 120 VDC fallo simple | https://psu.deltaww.com/en/industry-know-how/what-is-the-difference-between-selv-pelv-and-es1-in-ac-dc-power-supplies | [SEC] |
| 30 | CiA 301 longitud vs bit rate | 25/50/100/250/500/1000/2500/5000 m para 1 M…10 k; 5 ns/m; node-ID 1..127 | https://forum.opencyphal.org/uploads/short-url/mNWuvY23DYckSFoSbfam0ji3YWn.pdf | Primaria (copia del documento CiA) |
| 31 | CiA error control | boot-up inesperado → "erroneous power supply" | https://www.can-cia.org/can-knowledge/error-control-protocols | Primaria |
| 32 | CAN trama | 8n+44+⌊(34+8n−1)/4⌋ bits; 1 Mbit/s máx. | https://en.wikipedia.org/wiki/CAN_bus | [SEC] |
| 33 | RS-485 | 32 UL; 256 con 1/8 UL; 96 con polarización; L×bps<10^7; 1200 m 22 AWG; 4000 ft @100 kbps | https://www.ti.com/lit/pdf/slla272 | Primaria |
| 34 | EtherCAT | ≤100 µs ciclo; jitter ≪1 µs; 65 535 nodos; 100 m; puerto se cierra; hot connect <15 µs | https://www.ethercat.org/en/technology.html | Primaria |
| 35 | EtherCAT redundancia | tolera 1 corte de cable; no cubre fallo de varios esclavos | https://infosys.beckhoff.com/content/1033/ethercatsystem/2474143371.html | Primaria |
| 36 | PROFINET RT / IRT | 512 ms…250 µs; IRT 31,25 µs, 1 µs jitter | https://us.profinet.com/profinet-rt-vs-irt/ | Primaria |
| 37 | MRP | IEC 62439-2; 200 ms ≤50 nodos; perfiles 10/30/200/500 ms | https://www.cisco.com/c/en/us/td/docs/switches/connectedgrid/cg-switch-sw-master/software/configuration/guide/mrp/b_mrp_ie.html | Primaria (fabricante de switches) |
| 38 | MRP tiempos por norma | 500/200/30 ms ≤50 switches; 10 ms ≤14 | https://en.wikipedia.org/wiki/Media_Redundancy_Protocol | [SEC] |
| 39 | Bypass Ethernet pasivo | transistor de deplexión puentea al perder alimentación | https://patents.google.com/patent/US12170518B2/en ; https://patents.google.com/patent/US9641245B2/en | Primaria (patentes) |
| 40 | EN 619:2022 | 31-may-2022; rodillos incluidos; PL requeridos; velocidades por masa/área | https://webstore.ansi.org/standards/bsi/bsen6192022 | Primaria (resumen de norma) |
| 41 | ISO 13849-1 PFHd | a: 1e-5…1e-4; b: 3e-6…1e-5; c: 1e-6…3e-6; d: 1e-7…1e-6; e: 1e-8…1e-7 | https://www.idec.com/en-eu/solutions/safety/law/iso-iec/iso13849 | [SEC] |
| 42 | PNOZ s3 | PL e Cat 4 SIL CL 3; PFHd 2,31E-9; TM 20 a; 10/20 ms; 30/60 Ω; 17,5 mm | https://cdn.logic-control.com/docs/pilz-safety/Manuals/PNOZ_s3_Operat_Man_21395-EN-14.pdf | Primaria |
| 43 | XPSUAF13AP | PL e/Cat 4; PFHd 1,13E-9; 500 Ω; 20 ms; 22,5 mm | https://docs.rs-online.com/4b37/A700000007186749.pdf | Primaria |
| 44 | 3SK1111-2AB30 | PL e Cat 4 SIL 3; PFHd 1,7E-9; cat. 0; 10 ms; 22,5 mm | https://docs.rs-online.com/1599/A700000008775081.pdf | Primaria |
| 45 | STO | cat. 0; sin aislamiento; sin freno | https://cdn-static.nidec-netherlands.nl/media/4358-engineering-documentatie-safe-torque-off-guide-en-iss6-0704-0000.pdf | Primaria |
| 46 | STO en driver paso a paso | SIL 3 / PL e (Cat 3); IEC 61800-5-2; entradas redundantes | https://blog.orientalmotor.com/built-in-sto-function-simplifies-safety | Primaria (fabricante) |
| 47 | ISO 13857 Tabla 4 | ver §2(d) | https://www.troax.com/app/uploads/Brochure-Safety-Guide_EN.pdf | [SEC fiel a la norma] |
| 48 | ISO 13857 estructuras | <1400 mm no; 850/550/230/130; >180/240 mm cuerpo entero | ídem | [SEC] |
| 49 | IEC 60204-1 índice | 6.4 PELV; 10.7 e-stop devices | https://cdn.standards.iteh.ai/samples/18875/90805b617b194c79a353f317536a34d5/IEC-60204-1-2016.pdf | Primaria (muestra) |
| 50 | IEC 60204-1 cambios 2016 | STO de PDS, e-stop, protección de circuitos de mando | https://webstore.iec.ch/en/publication/26037 | Primaria |
| 51 | EMC ABB separación | 300/500/200 mm; 90°; 360° ambos extremos; 3,3 nF/630 V; PE 2,5/4 mm² | https://library.e.abb.com/public/9fbb4caf4e7b4bf7970839b083ba5396/EN_Drive_systems_grounding_and_cabling_REF_D_A4.pdf | Primaria |
| 52 | EMC Parker stepper | filtro ≤50 mm; ≥200 mm relés; 360° motor; ≤10 cm cables volantes | https://www.parkermotion.com/manuals/OEM750/_App_B_EMC_750_B.pdf | Primaria |
| 53 | Holguras SDR | 40/20/5 mm | https://www.meanwell.com/Upload/PDF/SDR%20DIN%20rail.pdf | Primaria |

---

## 4. Lo que NO se encontró y dudas

1. **Mean Well DRP-960-48**: no existe en las búsquedas del catálogo (solo DRP-480, TDR-960/DRT-960). Probable confusión de modelo.
2. **NDR-480 / SDR-480 / SDR-240 / NDR-240 en paralelo**: las fichas no mencionan paralelo ni tienen terminales de corriente compartida. No asumir paralelo sin diodos/ORing. Pendiente leer el manual de instalación NDR.
3. **Pendientes de derating térmico**: solo en gráfico; no se pudo extraer el punto de inflexión ni la pendiente. Leer la figura.
4. **Phoenix QUINT4-PS/48DC/24DC**: existe la versión 5 A (2910125) pero phoenixcontact.com y distribuidores devolvieron 403; datos de boost/SFB **no verificados**. Versión 10 A **no encontrada** (podría no existir; en catálogo hay QUINT4-PS/48-110DC/24DC/25/PT según listado de búsqueda, no leído).
5. **Itoh Denki 48 V**: ninguna fuente; su gama consultada es 24 V DC y AC.
6. **Fusibles DC (IEC 60269) para 48 V**: descargas Eaton/Bussmann fallaron; solo fuente secundaria genérica. Faltan curvas y tensión DC asignada.
7. **Murrelektronik MICO+ 48 V**: solo título y valores de snippet; página requiere JavaScript.
8. **Phoenix CB TM1 SFB (termomagnético) hasta 65 V DC**: no leído (error de descarga). 
9. **EN 619:2022 texto**: PLr concretos, requisitos de paro de emergencia, puntos de atrapamiento en rodillos/correas y distancias: **no accesibles** (norma de pago; BSI/iTeh 403). Solo resumen de novedades (ANSI).
10. **ISO 13850 / EN 60204-1 texto literal** ("reset shall not initiate a restart", categorías de parada 0/1/2, PELV 25 V AC / 60 V DC): visto solo en snippets secundarios (Synapticon, MS101, informe wewontech); las páginas devolvieron 403. Marcar como **no verificado literalmente**.
11. **PLr mínimo del paro de emergencia = PL c**: afirmación secundaria (industrialmonitordirect), no confirmada en ISO 13850.
12. **Modbus over Serial Line (modbus.org)**: descarga bloqueada (JS anti-bot); no se citan 3,5 caracteres/32 nodos/1000 m desde la spec. Los límites RS-485 sí están cubiertos por TI SLLA272.
13. **ConveyLinx manual (manula.com)**: todas las páginas 403; los datos de "logic power separado para E-stop", "tie DC commons to single earth", y ajustes de corriente 48 V (1,7–4,0 A / 63–118 W) provienen de snippets **no verificados**.
14. **Comportamiento de PROFINET/EtherNet-IP en línea con nodo apagado**: no se encontró texto oficial de PI; se infiere de la física del switch embebido y de las patentes de bypass.
15. **M12 D/X-coded normas (IEC 61076-2-101/-109)**: solo snippets de Farnell/L-com.
16. **Latencia Modbus RTU y CANopen**: cálculos propios a partir de tamaños de trama; no medidos.
17. **Coeficiente térmico del cobre (+20 % a 70 °C)**: dato físico general no citado.
18. **DDR-120C hold-up y corriente compartida**: la ficha no lista P+/P−; se interpreta que no soporta paralelo (verificar con Mean Well).
19. El límite "42 to 48 VDC" de entrada de motor en ConveyLinx-Ai3-48 sugiere que el bus no debe elevarse por encima de 48 V nominal en ese ecosistema; verificar tolerancia real con Pulseroller.

---

## 5. Implicaciones para el diseño (breve, sin decidir)

- **Bus 48 V:** con 20 A por trunk y presupuesto de 6 V, 4 mm² limita a ~32 m (carga concentrada) y 6 mm² a ~49 m; conviene segmentar por grupos de zonas con una fuente por segmento (como hace ConveyLinx: "6 total modules separated into two groups of 3 modules powered by 2 separate power supplies", snippet) y verificar que la lógica 24 V derivada (DDR: UVLO 33 V) no se caiga antes que el motor.
- **Fuente:** SDR-480-48 aporta 150 % durante 3 s (arranques NEMA 23/BLDC); NDR-480-48 se apaga a los 3 s por sobrecarga y necesita corte de red para rearmar — riesgo operativo en ZPA. TDR-960-48 (trifásica) permite paralelo 4× con ×0,9. Ninguna fuente monofásica de 480 W declara paralelo.
- **Regeneración/frenado:** en 48 V, el frenado puede empujar el bus hacia 60 V (Interroll); considerar chopper/limitador por caja o en la cabecera, y el límite PELV de 60 V DC.
- **Protección:** para 48 V descartar CBM E4/REX12-T (24 V); ESX10-TC DC48V (1–16 A, 1,2×IN) y MICO+ 48 V son candidatos; la limitación activa a 1,2×IN exige dimensionar por corriente de arranque del motor (p. ej. 2,3× nominal en EC5000 48 V).
- **Conectores en cadena:** M12 L-coded (16 A/63 V DC, 4+FE) es la referencia PROFINET para potencia encadenada; T-coded (12 A) puede quedar corto para trunks de 20–30 A → Han Q (16 A) o bornes push-in 24 A por caja con derivación IN/OUT.
- **Comunicación:** si la ZPA local debe sobrevivir a un nodo sin alimentación, Ethernet en línea necesita relé de bypass o anillo (MRP ≤200 ms) o lógica alimentada aparte (patrón ConveyLinx); CAN/RS-485 toleran nodos apagados de forma nativa pero con límites de longitud (CANopen 100 m @500 kbit/s) y sin gateway PLC estándar sin equipo adicional.
- **Seguridad:** EN 619:2022 fija PL requeridos (valores a obtener de la norma); relés PL e/Cat 4 de 17,5–22,5 mm con apertura 10–20 ms son estándar; el STO del driver es parada cat. 0 sin aislamiento ni freno, por lo que la retención (HOLD) de cajas en pendiente/omni tras STO no está garantizada; distancias ISO 13857 (ranura 20–30 mm → 850 mm salvo ranura ≤65 mm → 200 mm) condicionan las aberturas de la carcasa Omni junto a correas HTD/poleas.
- **EMC:** separar motor/potencia/control ≥200–300 mm, blindaje 360° con R-clamp al plano de montaje del driver y no al gabinete en la entrada, filtro a ≤50 mm de la fuente, un filtro por fuente DC.
