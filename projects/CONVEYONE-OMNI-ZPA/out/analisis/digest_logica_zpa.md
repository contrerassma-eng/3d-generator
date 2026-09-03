# Digest estructurado — conversación ChatGPT "Diseñar lógica Omniwheel ZPA"

**Fuente:** `chat_6a9979f1-3fb4-83e9-935e-57693181d9c9_clean.txt` (3404 líneas, ~144 k caracteres).
**Nota de reconstrucción:** el archivo extraído está en **orden cronológico inverso** (el primer mensaje del usuario aparece al final, línea 3405; el último trabajo del asistente aparece al inicio, líneas 17–110). El digest reordena todo cronológicamente. Se descartó ruido de extracción: títulos de resultados de búsqueda (ACG Conveyors, Hytrol, PFlow, Interroll, patente Roach, DynoDrive, NorthAmCon, catálogos NORVI/Industrial Shields/Olimex/Phoenix Contact/Mean Well, manuales Control Techniques Unidrive SP/M400 —variadores de frecuencia sin relación con UniDrive de transportadores—), marcadores de cita (`citeturn…`), cadenas de UI ("Alguien pensó que querrías ver este chat"), referencias `sediment://file_…` y `libfile_…`, comandos bash de la sandbox y trazas de error Python.

**Turnos identificados:** 5 mensajes de usuario (U1–U5) y 5 respuestas del asistente (A1–A5). **La respuesta final A5 (PDF "REV C") NO está capturada en el archivo**: sólo aparecen sus notas de progreso/razonamiento. Se indica explícitamente en cada sección.

---

## 1. Mensajes del usuario, textuales y en orden

### U1 (línea 3405; existe un duplicado truncado en la línea 3397)

> Necesito dar los parámetros para que un ingeniero de control dimensione los componentes y la lógica de un sistema de omniwheels que debe hacer lo siguiente. Tengo ocho ejes en un transportador de ancho 21 pulgadas útiles y dos pies de largo útiles. Tengo ocho ejes, es decir, están a 3 pulgadas de pitch cada una, pero los voy alternando en sus direcciones. Son omniwheels que tienen rodillos insertos en 45 grados hacia un costado. Entonces algunos rodillos van a la izquierda en el primer eje, después el siguiente eje va a las derechas, después el siguiente a la izquierda y los que comparten dirección comparten motor. Entonces la lógica lo que hace es decir: voy adelante con los dos, o con uno, un motor voy adelante, el otro lo apago, el otro grupo apagado, o un grupo va hacia adelante y el otro hacia atrás. Todo esto lo controlo con un motor por cada grupo. El tema mecánico lo estoy viendo por otro frente, así que necesito que trabajemos la lógica. Vamos a seleccionar motores NEMA 23 o, en su defecto, NEMA 32 o NEMA 42. Pero el prototipo lo voy a partir con NEMA 23 y su controlador básico. Quiero ocupar placas de desarrollo para riel DIN ESP 32. Esa placa de desarrollo va a tener también dos sensores, ya que el Omniwheels, el módulo, va a estar inmerso dentro de un sistema de acumulación de cajas. Es decir, voy a tener un sistema de cero presión, largo, por ejemplo, no sé, de 20 posiciones, y algunas de estas posiciones van a tener este sistema de Omniwheels. Entonces tengo por defecto el sensor de zona y tengo otro sensor que va a estar puesto en la salida, que me va a decir si esta salida está a 90 grados, no sé, en una de las dos lados, dirección izquierdo a derecha, y el sensor lo que dice es que está el espacio disponible para salir. Entonces la lógica de mi sistema completo es: yo siempre voy a estar acumulando, pero cuando me detengo por acumulación, miro hacia el lado si es que tengo espacio para salir. Entonces en ese instante tomo la decisión y si hay espacio yo salgo, es decir, la salida significa hacer andar un motor hacia adelante y el otro hacia atrás. Si no hay espacio, yo permanezco en mi posición y espero hasta que se libere adelante para avanzar. Para avanzar los dos motores giran hacia adelante. Esa es la lógica. Entonces mis placas de desarrollo las quiero conectar a través de un cable de red entre sí y también voy a tener zonas que van a estar... las zonas intermedias en realidad las quiero usar ZoneLogics Plus de Unidrive, con motores Unidrive. Entonces no sé cómo cortar esas zonas Unidrive, porque voy a tener zonas muertas, no sé, o sea zonas de acumulación normal sin salida de Omniwheels. Voy a tener, por ejemplo, no sé, cinco zonas de acumulación, un Omniwheels, después una zona Unidrive, otra Omniwheels, después cinco Unidrive, y así. La primera opción era hacer este Omniwheels con Unidrive, pero no es tan versátil. Entonces tengo que hallar la manera de comunicar los Unidrive entre sí y de bypassear quizás la acumulación o simplemente cortarla y hacerla ordenada. Pero mi idea es comunicar en serie a través de cable de red los Omniwheels o crear la alternativa de la acumulación con placa ZoneLogics Plus de Unidrive y hacer mi propio drive de cero presión con ESP 32 que alimente solamente el motor y haga la cero presión, pero desde mi drive. Entonces así conecto todos los drives en series. Esta caja eléctrica por cada módulo Omniwheels va a tener sus protecciones eléctricas y va a tener también sus terminales para entrada y salida de red. y todo esto va a ser comandado por un gateway, quien se va a comunicar con el PLC. Todo esto debe ser muy rápido y eficiente. Me estoy moviendo a por lo menos un metro por segundo y la acumulación no puede fallar. Es por eso que por confiabilidad trataría de usar Unidrive de ZoneLogics Plus, pero me encantaría lograr la misma confiabilidad con ESP 32. Las cajas eléctricas también deben tener los transformadores, porque la fuerza pretendo hacer una distribución eléctrica en paralelo trifásica o quizás usar un cable de red con fuerza PowerLink. No sé, quiero una cosa algo súper confiable y también algo realizable en poco tiempo.

Adjunto/marcador asociado (no identificable): `sediment://file_00000000d250820e8dfb47106f122f3d` (línea 3401).

### U2 (línea 2897)

> Genera un PDF con todas mis condiciones base. Genera también la arquitectura de control para que él seleccione los componentes. Sugiere componentes también, todo lo que tiene que ver con transformadores, el diseño de la pequeña caja que va a alojar el ESP32, sus conectores, sus transformadores, su protección eléctrica, las borneras, todo lo necesario para hacer estos puentes, estas conversiones y el cableado en serie. Entonces diagrama esto en un PDF, la lógica también, cómo debe ser la lógica, un PDF completo, tómate tu tiempo y representa esto muy bien, de manera gráfica, tipo diagrama de flujo, pero que se vea un documento muy profesional, bien acotado, con todos los argumentos y opciones.

Marcador asociado (no identificable): `sediment://file_00000000d058820ea656ec6dac1f4de6` (línea 2893).

### U3 (línea 871)

> En realidad, lo que quería hacer era que físicamente al menos estos módulos se vean conectados en red. O sea, perdón, en serie. Es decir, un cable entra desde un Omniviews y otro sale hacia el otro Omniviews. a la caja en realidad, a la caja eléctrica. O al Unidrive, porque el Unidrive también tiene esos conectores. O al controlador, este controlador. Entonces los casos van a ser esos que te dije, pero siempre que se vea en serie.

### U4 (línea 549)

> Mi duda es si se puede ir desde el OMNI al ZoneLogic en su mismo conector de IN, o ellos lo llaman Upstream y Downstream, usemos la misma nomenclatura. ¿O debo reemplazar ese ZoneLogics por algún drive mío? Obviamente sumando el drive básico que controla el motor, pero yo dándole las directrices si enciende o se detiene, básicamente, desde un drive mío. Entonces la comunicación sería entre mis drives y mis drives van a ser de OMNI o de zona de comunicación.

### U5 (línea 126) — con archivo adjunto

> Considera la parte mecánica y dame pdf actualizado

Adjunto: `Omniwheel_Memoria_Calculo_Transmision_REV_B(1).pdf` (línea 122; el asistente lo renderizó a 120 dpi en `/mnt/data/_renders_mech`).

---

## 2. Cronología de la conversación

### A1 — Respuesta a U1: especificación funcional para el ingeniero de control (líneas 2921–3369)

**Razonamiento previo capturado (línea 3393):** "Voy a convertir esto en una especificación de control útil para entregar a un ingeniero: arquitectura, estados, señales por zona, red, tiempos máximos y cómo convivir con ZoneLogix/UniDrive sin perder la lógica de cero presión. También voy a separar lo que conviene fijar desde ya de lo que puede quedar parametrizable." Búsquedas: `"ZoneLogix Plus" UniDrive manual accumulation conveyor communication inputs outputs`; `"UniDrive" "ZoneLogix Plus" manual pdf`.

**Concepto general.** El sistema se ordena como una **red de zonas ZPA heterogéneas**: para el resto de la línea, una zona Omniwheel debe comportarse exactamente como una zona de acumulación normal, aunque internamente tenga dos grupos de ejes motrices independientes y una segunda posibilidad de descarga lateral.

**Decisión clave fijada:** **no** meter el ESP32 dentro del protocolo nativo peer-to-peer RJ-25 de ZoneLogix emulándolo eléctricamente. ZoneLogix Plus intercambia *request/permission* entre zonas adyacentes por su conexión **RJ-25 de seis hilos**; sus interfaces **Smart I/O** permiten entregar/recibir esas señales desde dispositivos externos (cita al manual). Ese Smart I/O se usa como frontera limpia entre ambos sistemas.

**Arquitectura recomendada (diagrama):**
```text
                      PLC CENTRAL
                           │
                     EtherNet/IP
                           │
                    ┌──────────────┐
                    │   GATEWAY    │
                    │ industrial   │
                    └──────┬───────┘
                           │
                 Ethernet industrial
                           │
        ┌──────────────────┼───────────────────┐
        │                  │                   │
     OMNI #1            OMNI #2             OMNI #n
   ┌──────────┐       ┌──────────┐         ┌──────────┐
   │ ESP32    │       │ ESP32    │         │ ESP32    │
   │ industrial│      │ industrial│        │industrial│
   ├──────────┤       ├──────────┤         ├──────────┤
   │ Driver A │       │ Driver A │         │ Driver A │
   │ Driver B │       │ Driver B │         │ Driver B │
   └──────────┘       └──────────┘         └──────────┘
        │ │
        │ └── Grupo de ejes \
        └──── Grupo de ejes /

ZPA convencional:
ZoneLogix ─ ZoneLogix ─ [interfaz OMNI] ─ ZoneLogix ─ [OMNI] ─ ZoneLogix
```
- El **gateway no decide cada movimiento de cada caja**; la decisión es local. Si se pierde Ethernet o PLC durante **100 ms**, la acumulación no puede dejar de funcionar.
- Gateway: comandos de alto nivel, recetas, habilitación de desvíos, diagnóstico, conteos y estado. La lógica ZPA básica permanece distribuida en cada nodo.

**Especificación funcional — módulo Omniwheel (geometría):**
- largo útil: **24 in = 609,6 mm**
- ancho útil: **21 in = 533,4 mm**
- cantidad de ejes: **8**
- pitch: **3 in = 76,2 mm**
- orientación alternada: `A-B-A-B-A-B-A-B`
- Grupo A: ejes 1, 3, 5, 7
- Grupo B: ejes 2, 4, 6, 8
- 1 motor por grupo; 2 motores por módulo
- Cada grupo debe admitir `STOP / FORWARD / REVERSE` — no basta una salida ON/OFF.
- Prototipo con NEMA 23, pero "NEMA 23" sólo define tamaño mecánico; no define torque, potencia, velocidad ni capacidad dinámica. Driver y motor se seleccionan después de disponer de masa máxima de caja, diámetro efectivo de rueda y aceleración requerida.
- Para versión industrial a 1 m/s: preferir **stepper closed-loop o servo/BLDC con realimentación** antes que stepper abierto.

**Vectorización simplificada.** `VA` = velocidad grupo A, `VB` = velocidad grupo B; `+1` avance, `0` detenido, `-1` retroceso.

| Comando | Motor A | Motor B | Resultado |
|---|---:|---:|---|
| HOLD | 0 | 0 | caja detenida |
| FORWARD | +1 | +1 | avance longitudinal |
| DIVERT_LEFT | +1 | -1 | desplazamiento lateral |
| DIVERT_RIGHT | -1 | +1 | desplazamiento lateral opuesto |
| DIAGONAL_A | +1 | 0 | movimiento diagonal |
| DIAGONAL_B | 0 | +1 | movimiento diagonal |
| REVERSE | -1 | -1 | retroceso longitudinal |

Debe quedar parametrizado porque el signo real depende de cómo se monten ruedas y motores.

**Máquina de estados mínima (firmware de cada Omni):**
```text
EMPTY
  ↓ caja entra
RECEIVING
  ↓ sensor zona ocupado
OCCUPIED

OCCUPIED
 ├── downstream libre ─────────→ FORWARD_DISCHARGE
 │
 ├── downstream bloqueado
 │       +
 │   salida lateral libre
 │       +
 │   divert_enable
 │                  ───────────→ LATERAL_DIVERT
 │
 └── ningún destino libre ─────→ HOLD

FORWARD_DISCHARGE
  ↓ caja abandona sensor
EMPTY

LATERAL_DIVERT
  ↓ confirmación salida
EMPTY

FAULT
  └── STOP ambos motores
```
Condición agregada por el asistente: **la salida lateral sólo debe evaluarse una vez que la caja esté completamente estabilizada dentro de la zona Omni.** No cambiar directamente de `FORWARD` a `A=+ / B=-` mientras la caja todavía entra a 1 m/s. Usar `RECEIVING → CENTERED → HOLD → evaluar destinos`, aunque el `HOLD` dure sólo decenas de milisegundos.

**Sensores.** Definidos por el usuario: **S1 — Zone Sensor** (caja ocupando el módulo); **S2 — Side Clear / Side Permission** (la descarga lateral puede recibir). Recomendación: tarjeta con **mínimo 4 entradas** aunque se instalen dos:
- S1 Zone occupancy
- S2 Side destination available
- S3 opcional: confirmación de caja salida lateral
- S4 opcional: upstream/diagnóstico
Razón: `S2 = espacio libre` no demuestra que la caja realmente salió.

**Prioridad de decisión:**
```text
IF zone_occupied = FALSE:
    aceptar caja upstream

IF zone_occupied = TRUE:

    IF downstream_available:
        FORWARD

    ELSE IF side_available AND divert_enabled:
        DIVERT_SIDE

    ELSE:
        HOLD
```
Opción configurable: `divert_priority = THROUGH_FIRST | SIDE_FIRST` (para cajas que **deben** desviarse aunque adelante esté libre). Rutas: `Route = STRAIGHT | LEFT | RIGHT | ANY_AVAILABLE` → abre la puerta a sorting real sin cambiar hardware.

**Conexión de una Omni entre ZoneLogix.** ZoneLogix Plus maneja `REQUEST →  zona  PERMISSION ←`. El manual confirma que en una zona de entrada `Smart 1` funciona como **Request** y `Smart 2` como **Permission**; en una zona de salida esos papeles se invierten. Son señales **PNP** y el estado activo de Smart I/O está **sobre 18 VDC**.
```text
               LÍNEA UPSTREAM
ZoneLogix
    │
request / permission
    │
┌───────────────────────┐
│ ESP32 OMNI            │
│ "virtual ZPA zone"    │
│ Zone occupied         │
│ Downstream permission │
│ Side permission       │
└──────────┬────────────┘
           │
     request/permission
           │
       ZoneLogix
               DOWNSTREAM
```
Usar **optoacopladores o I/O industriales 24 V PNP**, nunca GPIO del ESP32 directamente. Evita descifrar/emular el cable RJ-25. El fabricante indica que las conexiones RJ-25 son peer-to-peer entre controles ZoneLogix adyacentes.

**Comunicación entre ESP32.** No hacer `ESP → ESP → ESP → ESP` dependiendo de software para que el mensaje atraviese todos. Preferir Ethernet físico con **switch industrial** (`ESP1 ESP2 ESP3 Gateway` en estrella) o switches integrados/daisy-chain industriales si realmente se necesita topología lineal. Ethernet cableado, **no Wi-Fi**, para control. Protocolo gateway ↔ nodos: **EtherNet/IP o Modbus TCP**; handshake ZPA crítico local. ESP32 en variante industrial con **PHY Ethernet físico, watchdog independiente y E/S 24 V aisladas**.

**Tiempo de respuesta a 1 m/s:** 1 ms = 1 mm; 10 ms = 10 mm; 50 ms = 50 mm; 100 ms = 100 mm.

| Parámetro | Objetivo |
|---|---:|
| Ciclo lógica local | ≤ 2 ms |
| Scan sensores | ≤ 1–2 ms |
| debounce sensor | 2–10 ms parametrizable |
| reacción lógica total | < 10 ms |
| comunicación entre nodos | no crítica para detener caja |
| watchdog firmware | 50–100 ms |
| pérdida gateway | ZPA local continúa |
| pérdida nodo adyacente | asumir `permission = FALSE` |
| sensor inconsistente | detener zona |
| driver fault | detener motores + fault |

Frase clave de la especificación: **"Ninguna función de prevención de colisión dependerá de la comunicación con PLC o gateway."**

**Velocidad y NEMA 23.** No se pueden dar RPM hasta definir el diámetro efectivo. Relación: **RPM = 60·v / (π·D)**. Para v = 1 m/s: Ø50 mm → ~382 rpm; Ø60 mm → ~318 rpm; Ø80 mm → ~239 rpm. En Omniwheel a 45° distinguir velocidad periférica de rueda de la componente útil sobre la caja. Datos para dimensionamiento definitivo:
```text
V longitudinal objetivo = 1,0 m/s mínimo
V lateral objetivo = TBD
masa caja mín / nominal / máx
dimensiones mín / máx
coeficiente fricción rueda-caja
diámetro efectivo Omni
inercia de los 4 ejes por motor
relación transmisión
aceleración deseada
tiempo deseado de desvío
```

**Fuente de alimentación.** No distribuir trifásica a cada cajita con transformador individual salvo que distancias/corrientes lo justifiquen. Arquitectura orientada a **24/48 VDC distribuido**. ZoneLogix Plus trabaja entre **22 y 28 VDC**; el fabricante recomienda alimentación **PELV 24 V**; si zonas adyacentes usan fuentes separadas, sus **0 VDC deben estar comunes, pero no sus positivos** (cita al manual).
```text
TABLERO PRINCIPAL
      │
  400 VAC 3~
      │
┌───────────────┐
│ Fuente 24 VDC │── ZoneLogix / sensores / I/O
└───────────────┘
      │
┌───────────────┐
│ Fuente 48 VDC │── motores Omni, si driver elegido = 48 V
└───────────────┘
distribución DC protegida por ramales
```
Para prototipo pequeño se pueden centralizar las fuentes. **No usar Power over Ethernet para alimentar motores**: Ethernet exclusivamente comunicaciones, potencia en conductores separados.

**Detalle favorable de ZoneLogix Plus (citado):** soporta motores UniDrive de **48, 60, 80 y 100 W**, velocidades configurables, entrada analógica diferencial **0–10 V** para ajuste dinámico; lógica propia de recuperación de cajas (*Search and Rescue*) para evitar paquetes perdidos entre sensores. Ese nivel de robustez debe replicarse en el firmware ESP32.

**Arquitectura V1 congelada:**
- ESP32 industrial Ethernet por Omni
- 2 drivers closed-loop
- inicialmente 2 NEMA23
- 2 sensores instalados, **4 entradas disponibles**
- I/O industrial 24 V PNP aislada
- 2 interfaces ZPA: `UPSTREAM` y `DOWNSTREAM`
- Ethernet al gateway
- fuente lógica/sensores 24 VDC
- fuente motores según driver, probablemente 48 VDC
- watchdog hardware
- E-stop cableado que quite energía de movimiento independientemente del ESP
- máquina de estados local
- PLC sólo supervisión/ruteo
- cero presión funcionando aunque PLC/gateway se desconecten

Diferencia con la primera idea del usuario: **no existen "zonas muertas" entre UniDrive y Omni**; la Omni se presenta eléctricamente como otra zona ZPA. Ejemplo: `ZL1 → ZL2 → ZL3 → ZL4 → ZL5 → OMNI1 → ZL6 → OMNI2 → ZL7 → ZL8 → ...`; cada elemento habla sólo con su vecino inmediato. Más escalable que un PLC gestionando 20 sensores y motores en tiempo real.

**Cierre:** faltan cuatro parámetros mecánicos críticos: `peso máximo de caja`, `diámetro exterior efectivo de Omniwheel`, `velocidad lateral deseada`, `tiempo máximo permitido para completar el desvío de 21"`.

---

### A2 — Respuesta a U2: PDF "Arquitectura de Control Omniwheel ZPA v1" (21 páginas) (líneas 1827–1870; contenido en código generador líneas 1874–2603)

**Razonamiento/progreso capturado:**
- "Voy a armarlo como una memoria técnica de control y arquitectura, no como un simple resumen: requisitos base, arquitectura por capas, caja eléctrica por Omni, interfaces con ZoneLogix, lógica de estados, protecciones, potencia, comunicaciones, BOM sugerida y criterios de selección. Además voy a incluir diagramas técnicos vectoriales dentro del PDF."
- "Estoy evaluando una arquitectura distribuida con alimentación separada para control e instrumentación, comunicación Ethernet en cadena, E/S aisladas y protección frente a motores. También estoy comparando controladores ESP32 industriales montables en riel DIN y fuentes adecuadas."
- "Ya tengo cerrada una decisión importante para el documento: separaré **potencia de motores (48 VDC recomendado)** de **control/sensores (24 VDC)** y dejaré dos variantes físicas: caja lógica compacta y caja 'todo-en-uno' con los dos drivers."
- "Estoy estructurando una guía técnica con selección preliminar de componentes, distribución eléctrica, protección, topología Ethernet, diagramas vectoriales y un programa de pruebas. Mantendré separadas las funciones de potencia y control, y marcaré los puntos que requieren validación eléctrica profesional."
- Búsquedas: `site:industrialshields.com ESP32 Ethernet PLC DIN rail 24V`; `site:norvi.lk ESP32 Ethernet industrial controller DIN rail`; `site:olimex.com ESP32 POE ISO Ethernet industrial`; `ESP32 industrial controller Ethernet DIN rail 24V input output NORVI ENET official`; `Mean Well NDR-120-48 DIN rail 48V datasheet official`; `Phoenix Contact electronic circuit breaker PTCB 24V DIN official`; `Phoenix Contact terminal block fuse DIN rail 24V official UT 4 HESI`; `ZoneLogix Plus 301208 manual Smart I/O Request Permission RJ25 UniDrive official`; `MEAN WELL HDR-60-24 datasheet`; `MEAN WELL DDR-30G-24 datasheet 48V 24V DIN rail DC DC`; `Phoenix Contact industrial ethernet switch FL SWITCH 1005N official`; `"ZoneLogix Plus" "Smart 1" "Smart 2" "Request" "Permission"`; `"ZoneLogix Plus" 301208 installation manual`. Leyó skills `pdfs` y `docx` de la sandbox.
- **Error de código capturado:** primera ejecución del generador falló con `AssertionError: Point list must have even number of elements!` en `state_diagram()` → `arrow()` → `Polygon(pts,…)` (reportlab exige lista plana de coordenadas, no lista de tuplas). La corrección no está en el archivo, pero el mensaje final confirma que el PDF de 21 páginas se renderizó y revisó visualmente.

**Mensaje final del asistente (texto):** "Listo. Preparé el documento técnico completo en **21 páginas**, revisado visualmente después de renderizarlo." Incluye: condiciones base del módulo 24" × 21", 8 ejes y pitch 3"; grupos A/B y tabla de movimientos; arquitectura ZPA híbrida **ZoneLogix + Omni ESP32**; gateway y relación con PLC; máquina de estados y lógica de decisión; handshake `REQUEST / PERMISSION`; estrategia para que la anticolisión no dependa del PLC; arquitectura Ethernet; comparación de distribución 24/48 VDC; propuesta de caja eléctrica; layout interno en riel DIN; drivers A/B; fuentes y DC/DC; protecciones y borneras; conexión PE/0 V; conectores Ethernet, sensores, potencia y motores; mapa completo de I/O; estrategia de fallas y watchdog; criterios temporales para ≥1 m/s; especificación para seleccionar NEMA 23 / closed-loop / servo; BOM preliminar; componentes candidatos de Industrial Shields, NORVI, Olimex, Phoenix Contact, Mean Well y UniDrive; procedimiento de puesta en marcha y FAT; parámetros que debe cerrar el ingeniero; referencias.

Arquitectura V1 recomendada en el mensaje:
- **48 VDC por tramos → protección local → drivers A/B**
- **48→24 VDC local → ESP32 + sensores + I/O ZPA**
- **Handshake ZPA discreto local**
- **Ethernet industrial → gateway → PLC**
- y **no** PLC/gateway dentro del lazo crítico de anticolisión.

Enlace: `sandbox:/mnt/data/Conveyone_Arquitectura_Control_Omniwheel_ZPA_v1.pdf`. Siguiente nivel propuesto: esquema eléctrico multifilar real, numeración `X1/X2/...`, bornes, fusibles, calibres de cable, conectores M8/M12, pinout ZoneLogix-Omni, I/O exactas del ESP32, cableado de los dos drivers y BOM con códigos de compra definitivos; para cerrarlo sólo falta fijar el NEMA 23/driver y la potencia mecánica requerida.

#### Contenido íntegro del PDF v1 (extraído del código reportlab)

**Estructura del generador:** Python/reportlab, A4 vertical, márgenes 16 mm, paleta NAVY/BLUE/ORANGE/GREEN/RED, estilos TitleX/H1X/H2X/BodyX/SmallX/TinyX/CalloutX/CaptionX/RefX, pie de página "Conveyone - Arquitectura de control Omniwheel/ZPA - Rev. 0" + número de página, clase `Callout` (cuadro resaltado), helper `table()`, y cinco diagramas vectoriales: `architecture_diagram()`, `omni_zone_diagram()`, `state_diagram()`, `power_diagram()`, `panel_diagram()`. Metadatos: título "Arquitectura de Control Omniwheel ZPA", autor "Conveyone". 22 secciones + portada.

**Portada.** "ARQUITECTURA DE CONTROL Y ESPECIFICACION FUNCIONAL — Modulo Omniwheel integrado en transportador de acumulacion cero presion (ZPA)". Objetivo: entregar al ingeniero de control las condiciones base, la lógica de funcionamiento, interfaces, arquitectura eléctrica y de comunicaciones, criterios de dimensionamiento y lista de componentes candidatos para un prototipo industrializable.
Figura 1 (vista superior funcional): 8 ejes E1…E8 alternando "A (45° izq.)" (E1, E3, E5, E7) y "B (45° der.)" (E2, E4, E6, E8); cota "24 in utiles = 609,6 mm" (largo); cota "21 in = 533,4 mm" (ancho); Motor A a un costado, Motor B al otro; sensor "S1 zona" al centro; "S2 salida lateral" en el borde; flecha "avance" y flecha "desvio 90°".

| Documento | Valor |
|---|---|
| Revision | 0 - Especificacion preliminar para seleccion de control |
| Fecha | 03-09-2026 |
| Estado | Base de ingenieria - requiere cierre de motor, driver y ensayos |
| Velocidad de linea | >= 1,0 m/s |
| Arquitectura objetivo | ZPA distribuida; decision local; PLC como supervisor/ruteador |

Nota: calibres, protecciones, corriente de fuentes y fusibles son preliminares; cerrar con corriente real de motores, longitud de alimentadores, corriente de cortocircuito disponible, normativa del tablero y ambiente.

**1. Condiciones base del sistema.** Línea ZPA con zonas convencionales UniDrive/ZoneLogix intercaladas con zonas Omniwheel que transportan longitudinalmente y, con flujo frontal bloqueado, descargan lateralmente a 90°.

| Parametro | Condicion de diseno |
|---|---|
| Zona Omni | 24 in utiles de largo x 21 in utiles de ancho |
| Ejes | 8 ejes a pitch nominal 3 in (76,2 mm) |
| Orientacion | Alternada A-B-A-B-A-B-A-B; rodillos de cada eje a 45 grados |
| Accionamiento | Grupo A: ejes 1/3/5/7; Grupo B: ejes 2/4/6/8; un motor por grupo |
| Prototipo | NEMA 23; dejar arquitectura escalable a motores mayores o servo/BLDC |
| Control local | ESP32 industrial / PLC compacto basado en ESP32, Ethernet cableado |
| Sensores minimos | S1 presencia/ocupacion de zona; S2 disponibilidad de salida lateral |
| Integracion | Zonas convencionales ZoneLogix Plus + zonas Omni actuando como zonas ZPA virtuales |
| Supervision | Gateway conectado al PLC; el gateway no debe cerrar el lazo de anticolision |
| Velocidad | Objetivo minimo 1,0 m/s |
| Fallo de comunicaciones | Debe producir estado seguro: no conceder permiso y detener la zona afectada |

Principio de arquitectura: la prevención de colisiones y el handshake de una zona con sus vecinas deben funcionar localmente aunque PLC, gateway o Ethernet de supervisión se desconecten.
Patrón de línea de ejemplo: Z1 ZoneLogix | Z2 ZoneLogix | Z3 ZoneLogix | Z4 ZoneLogix | Z5 ZoneLogix | **Z6 OMNI** | Z7 ZoneLogix | **Z8 OMNI** | Z9 ZoneLogix.

**2. Cinemática de mando y tabla de movimientos.** Signo de cada grupo abstracto; verificar sobre prototipo (depende del montaje de ruedas, reductores y motores).

| Comando | Grupo A | Grupo B | Resultado esperado |
|---|---:|---:|---|
| HOLD | 0 | 0 | Caja inmovilizada |
| FORWARD | +1 | +1 | Avance longitudinal |
| REVERSE | -1 | -1 | Retroceso longitudinal de servicio |
| DIVERT_LEFT | +1 | -1 | Desvio lateral en un sentido |
| DIVERT_RIGHT | -1 | +1 | Desvio lateral opuesto |
| DIAGONAL_A | +1 | 0 | Movimiento diagonal / modo de prueba |
| DIAGONAL_B | 0 | +1 | Movimiento diagonal / modo de prueba |

**Interlock obligatorio:** nunca ordenar inversión instantánea a un motor a plena velocidad; el firmware debe ejecutar **desaceleración → velocidad cero confirmada/temporizada → inversión → aceleración**, según límites del driver y del mecanismo.
Relación preliminar: **RPM = 60 · v_periferica / (π · D_efectivo)**. A 1,0 m/s: D=50 mm → ~382 rpm; D=60 mm → ~318 rpm; D=80 mm → ~239 rpm. Para Omniwheel a 45° verificar componente útil sobre la caja y deslizamiento real; no usar la ecuación sola para seleccionar torque.
Datos pendientes: masa máxima de caja, diámetro efectivo, inercia de ejes, relación de transmisión, coeficiente de fricción, aceleración longitudinal, velocidad lateral objetivo, tiempo máximo de desvío.

**3. Arquitectura de control propuesta.** Figura 2: PLC DE LINEA —(EtherNet/IP / PROFINET)— Gateway industrial PLC<->red Omni — Switch Ethernet industrial (no control crítico) — OMNI 1…4 (cada uno "ESP32 + I/O 24 V, 2 drivers motor") — fila de 4 ZoneLogix enlazados entre sí y a cada OMNI por "Handshake ZPA local: request / permission, 24 V PNP aislado".
Texto: el nodo Omni se presenta como zona ZPA; contiene ESP32, acondicionamiento de E/S industriales y dos drivers. Hacia ZoneLogix: interfaces discretas aisladas request/permission en lugar de emular el RJ-25 propietario. Gateway concentra diagnóstico, recetas, conteos, habilitación de desvío y comandos de ruteo. **V1: Modbus TCP** por simplicidad; EtherNet/IP o PROFINET si el PLC lo exige. **No usar Wi-Fi para el lazo de control** (sólo comisionamiento/diagnóstico, deshabilitable).

**4. Máquina de estados local.** Figura 3 "MAQUINA DE ESTADOS LOCAL - EL PLC NO CIERRA EL LAZO DE COLISION". Estados: EMPTY, RECEIVING, CENTERED, DECIDE, FORWARD, LATERAL DIVERT, HOLD, FAULT. Transiciones dibujadas:
- EMPTY → RECEIVING: "upstream request"
- RECEIVING → CENTERED: "S1 estable"
- CENTERED → DECIDE: "settle"
- DECIDE → FORWARD: "downstream libre"
- DECIDE → LATERAL DIVERT: "lateral libre + permiso"
- DECIDE → HOLD: "sin destino"
- FORWARD → EMPTY: "S1 libre"
- LATERAL DIVERT → EMPTY: "confirmacion salida"
- HOLD → DECIDE: "re-evaluar"
- DECIDE → FAULT: "timeout/fault"
- FAULT → HOLD: "reset autorizado"

| Estado | Accion | Condicion de salida |
|---|---|---|
| EMPTY | Motores detenidos o preparados; permission upstream segun disponibilidad | Llegada de request/caja |
| RECEIVING | A+B adelante a velocidad de recepcion | S1 ocupado estable |
| CENTERED | Completar posicionamiento y desacelerar | Caja centrada/temporizacion validada |
| DECIDE | Evaluar ruta, downstream y salida lateral | Seleccion de FORWARD, DIVERT o HOLD |
| FORWARD | A+B adelante | S1 libre y transferencia confirmada |
| LATERAL DIVERT | A y B en sentidos opuestos | Confirmacion de salida o timeout |
| HOLD | A=B=0; mantener caja | Destino disponible o nueva orden |
| FAULT | A=B=0; retirar permiso hacia upstream | Reset autorizado tras desaparecer causa |

**5. Lógica funcional.** Regla base solicitada: mientras la caja avanza normalmente se conserva ZPA; cuando la zona queda ocupada porque downstream no puede recibir, consultar salida lateral; si disponible y desvío habilitado, desviar; si no hay destino, mantener.

| S1 zona | Downstream | Side available | Route enable | Accion |
|---|---|---|---|---|
| 0 | - | - | - | EMPTY / permitir recepcion si corresponde |
| 1 | 1 | X | STRAIGHT/ANY | FORWARD |
| 1 | 0 | 1 | SIDE/ANY | LATERAL DIVERT |
| 1 | 0 | 0 | cualquiera | HOLD |
| 1 | 0 | 1 | STRAIGHT | HOLD |
| invalido | X | X | X | FAULT / detener |

Variables de receta: **RouteMode** = STRAIGHT / LEFT / RIGHT / ANY_AVAILABLE; **DivertPriority** = THROUGH_FIRST / SIDE_FIRST; velocidades de recepción/desvío; aceleración/deceleración; settle time; debounce de sensores; timeout de transferencia; timeout de desvío; tiempo mínimo de permiso; comportamiento tras pérdida de gateway.
Importante: el permiso lateral no debe interpretarse sólo como "sensor sin caja" si la salida puede ser ocupada desde otra máquina; idealmente **S2 representa una autorización de destino (clear-to-send) generada por la zona receptora**.

**6. Interfaz con UniDrive / ZoneLogix Plus.** ZoneLogix Plus P/N **301208** usa peer-to-peer upstream/downstream por RJ-25 y dispone de Smart/User I/O; el manual documenta sensores PNP, alimentación 24 VDC, modos ZPA/ZIP y diagnóstico. Se conserva ZoneLogix en zonas normales y se crea frontera discreta aislada en zonas Omni.

| Lado | Senal logica | Implementacion recomendada |
|---|---|---|
| Upstream -> Omni | REQUEST_IN | Entrada 24 V PNP aislada; indica que existe caja solicitando entrada |
| Omni -> Upstream | PERMISSION_OUT | Salida 24 V PNP aislada; solo activa si Omni puede recibir |
| Omni -> Downstream | REQUEST_OUT | Salida 24 V PNP aislada; solicita transferir caja hacia adelante |
| Downstream -> Omni | PERMISSION_IN | Entrada 24 V PNP aislada; downstream garantiza espacio |
| Salida lateral -> Omni | SIDE_PERMISSION_IN | Entrada 24 V PNP aislada o telegrama local con fail-safe a FALSE |
| Omni -> lateral | SIDE_REQUEST_OUT | Opcional; permite handshake completo con transportador receptor |

Recomendación: no conectar GPIO de 3,3 V directamente a Smart I/O, sensores o cables de campo; toda E/S 24 V por interfaz industrial con protección de polaridad, limitación de corriente, supresión de transitorios y aislamiento. Si zonas adyacentes usan fuentes de 24 VDC separadas, los 0 V deben referenciarse según fabricante y no puentear positivos.

**7. Presupuesto temporal y rendimiento.** A 1,0 m/s la caja avanza 1 mm por ms.

| Elemento | Objetivo de diseno |
|---|---|
| Lectura de entradas | 1-2 ms |
| Ciclo de maquina de estados | <= 2 ms |
| Debounce sensor | 2-10 ms parametrizable; validar sensor real |
| Decision local completa | < 10 ms |
| Actualizacion comando driver | <= 2 ms desde decision |
| Heartbeat nodo-gateway | 20-100 ms; no usado para anticolision |
| Watchdog software/hardware | 50-100 ms como punto de partida |
| Perdida de vecino / permiso | Permission = FALSE inmediatamente tras timeout local |
| Perdida de gateway | Mantener ZPA local; bloquear nuevos desvios si ruta no esta cacheada |

Tiempo de parada real = detección + debounce + lógica + retardo de driver + rampa de desaceleración + deformación/deslizamiento rueda/caja; ensayar peor caso de masa, fricción y tensión.

**8. Arquitectura de potencia recomendada.** Figura 4: TABLERO PRINCIPAL 400/230 VAC → PSU 48 VDC central (motores Omni) + PSU 24 VDC PELV (control/sensores/ZPA) → Módulo Omni 1/2/3 "protección local" → "48 V -> Drivers A/B; 24 V -> ESP/I-O; 0 V / PE". Leyenda: "No usar PoE para potencia de motores. Ethernet queda dedicado a datos." Preferida: 48 VDC drivers, 24 VDC PELV para sensores, I/O, ZoneLogix y electrónica; evitar fuentes AC individuales por módulo.

| Opcion | Ventaja | Desventaja / uso |
|---|---|---|
| A. 24 + 48 VDC central | Simple, eficiente, menos calor local | Dimensionar caida de tension y protecciones por ramal. **Opcion recomendada.** |
| B. 48 VDC central + DC/DC 48->24 local | Solo un bus de potencia largo; aislamiento local posible | Costo de DC/DC por caja. Muy buena para modularidad. |
| C. AC a cada caja + PSU locales | Caida DC menor | Mayor riesgo, volumen, protecciones y trabajo de tablero. Evitar en prototipo salvo necesidad. |
| D. PoE para ESP32 | Cableado limpio para logica | No sirve para potencia de motores; no mezclar PoE con drivers. |

**9. Caja eléctrica por módulo Omni.** Figura 5 "CAJA TODO-EN-UNO PROPUESTA": gabinete "300 x 250 x 150 mm aprox. - IP54/IP65 segun ambiente"; riel DIN superior con ESP32/PLC, DC/DC 48-24, protecciones, borneras I/O; DRIVER A y DRIVER B al centro; riel inferior con 12 bornes "48V IN/OUT - 24V - PE - sensores - ZPA upstream/downstream - motor A/B"; conectores ETH y 48V en ambos laterales.

| Elemento | Especificacion preliminar |
|---|---|
| Gabinete | Acero pintado o policarbonato industrial; IP54 minimo, IP65 si hay lavado/polvo; placa de montaje y riel DIN 35 mm |
| Tamano todo-en-uno | Punto de partida 300 x 250 x 150 mm; verificar radios de cable, conectores y disipacion de 2 drivers |
| Tamano caja logica | ~160 x 120 x 90 mm si drivers se ubican fuera |
| Separacion | Canaleta logica/sensores separada de cables de motor; PE y potencia segregados |
| Ventilacion | Conveccion natural; si T interna sube, aumentar gabinete o disipacion |
| Servicio | Bornes identificados, LEDs visibles, USB/programacion accesible sin exponer potencia |
| Conectores externos | M12 o prensaestopas para sensores; RJ45 industrial dentro de gabinete o M12 D-coded exterior; potencia con conectores adecuados a corriente |

**10. Protección eléctrica y borneras.**

| Circuito | Proteccion requerida | Criterio preliminar |
|---|---|---|
| Entrada 48 VDC | Proteccion por ramal + seccionamiento de servicio | Corriente nominal >= suma de drivers; curva/e-fuse segun inrush |
| Driver A | Fusible/e-breaker individual | Coordinar con corriente maxima y fabricante del driver |
| Driver B | Fusible/e-breaker individual | Igual que A |
| 24 VDC control | E-breaker/fusible 1-4 A tipico | Cerrar con consumo de ESP32, I/O, sensores, switch/DC-DC |
| Sensores | Proteccion comun o por grupo | 100-500 mA tipico por ramal |
| I/O externo | TVS / limitacion / optoaislamiento | 24 V PNP industrial; tolerar inversion y transitorios |
| PE | Bornera PE a gabinete y pantallas segun EMC | Conductor corto; continuidad |
| 0 V | Barra/bornes dedicados | Definir referencia y puntos de union; evitar retornos por blindajes |

Borneras de paso, portafusible 5x20 o breakers electrónicos DIN para 24 V (con salida de diagnóstico para que ESP32/gateway detecte sobrecorriente). **El paro de emergencia no debe depender del ESP32**: arquitectura de seguridad cableada, retirar energía de movimiento o STO si los drivers lo soportan.

**11. Componentes candidatos — control y red.**

| Funcion | Candidato | Por que | Estado |
|---|---|---|---|
| Control ESP32 industrial | Industrial Shields ESP32 Ethernet/WiFi/Bluetooth PLC | 12-24 VDC, formato PLC/DIN | Candidato A |
| Control ESP32 compacto | NORVI IIOT / NORVI X con Ethernet segun variante | ESP32 industrial, DIN, I/O industrial; NORVI X incorpora Ethernet/RS-485 | Candidato B |
| Desarrollo Ethernet aislado | Olimex ESP32-POE-ISO-IND | 100 Mb Ethernet, aislamiento galvanico de PoE, variante -40..85 C; con carrier I/O propio | Candidato C |
| Switch Ethernet | Phoenix Contact FL SWITCH 1005N, 1085039 | 5 x RJ45 10/100, DIN, QoS, industrial; 22,5 mm de ancho | Referencia robusta |
| Gateway | ZoneLogix PRO Monitor Gateway 301123 si se mantiene ecosistema UniDrive; o gateway PLC industrial | UniDrive publica gateway Ethernet/IP; alternativa gateway dedicado | Evaluar |

Una placa ESP32 de desarrollo sola no es suficiente para campo: carrier industrial o PLC/controlador ESP32 con bornes, rango 24 V y protecciones.

**12. Componentes candidatos — fuentes, DC/DC y protecciones.**

| Funcion | Candidato / familia | Dato relevante | Comentario |
|---|---|---|---|
| 48 VDC de prototipo | MEAN WELL NDR-120-48 | 48 V, 2,5 A, 120 W DIN | Solo si la potencia simultanea cabe con margen |
| 48->24 V local | MEAN WELL DDR-30L-24 | 30 W DIN, entrada 18-75 V, salida 24 V, aislamiento 4 kVdc | Si se distribuye solo 48 V |
| Proteccion 24 V | Phoenix Contact PTCB E1 24DC/1-4A SI-R, 1135753 | 1 canal, 1/2/3/4 A ajustable, status/reset, DIN | Diagnostico y reset remoto |
| Bornera fusible | Phoenix Contact UT 4-HESI (5x20), 3046032 | DIN, fusible 5x20, seccion nominal 4 mm2 | Alternativa sencilla |
| Borneras | Phoenix Contact UT/PT o equivalentes | Paso, PE y distribucion de potencial | Por seccion real y corriente |

**La NDR-120-48 no es selección final**: dos motores NEMA 23 pueden superar 120 W según driver y régimen; calcular potencia continua, pico, simultaneidad y margen.

**13. Driver y motor — especificación de selección.** NEMA 23 sólo fija interfaz mecánica; priorizar stepper closed-loop o servo/BLDC.

| Criterio | Requisito minimo recomendado |
|---|---|
| Alimentacion driver | Preferente 36-60 VDC; objetivo de arquitectura 48 VDC |
| Control | STEP/DIR o bus industrial; entrada ENABLE; salida FAULT |
| Realimentacion | Encoder si stepper closed-loop; servo/BLDC equivalente |
| Inversion | Soportada con rampa programable y limite de corriente |
| Protecciones | Sobretemperatura, sobrecorriente, subtension/sobretension |
| Diagnostico | FAULT fisico hacia ESP32; idealmente corriente/estado por bus |
| EMC | Cables de motor separados de sensores/Ethernet; blindaje |
| Dimensionamiento | Torque requerido a velocidad real, no torque de holding |
| Margen | Por ciclo y temperatura; no solo valor nominal |

Entradas faltantes: masa mín/nom/máx; centro de gravedad; diámetro de rueda; número de ruedas en contacto; reducción; eficiencia de transmisión; aceleración longitudinal y lateral; ciclo por hora; temperatura ambiente.

**14. Cableado en serie y conectores.** Distinguir **línea física de cableado** de **topología Ethernet**. Potencia: trunk 48 V con derivaciones protegidas. Ethernet: estrella con switch industrial es la más simple/robusta; si se exige daisy-chain físico, cada nodo necesita **dos puertos Ethernet con switch integrado** o un pequeño switch industrial; **un ESP32 con un solo PHY no permite pasar Ethernet pasivamente**.

| Interfaz | Conector sugerido | Cable / criterio |
|---|---|---|
| Ethernet gabinete | RJ45 industrial o M12 D-coded | Cat5e/Cat6 industrial; separar de motor |
| 48 V trunk | Conector industrial bloqueable o bornes | Seccion por corriente/caida; IN/OUT solo si conector y PCB soportan corriente de paso |
| 24 V local | Bornera push-in | 0,75-1,5 mm2 tipico |
| Sensores PNP | M8/M12 3/4 polos | 24 V, 0 V, señal; etiquetado S1/S2/S3/S4 |
| ZPA discreto | M8/M12 multipolo o bornera | REQUEST/PERMISSION aislados + 0 V de referencia |
| Motores | Conector del driver/fabricante | No usar conector como seccionador; alivio de tension |
| PE/pantalla | Prensa EMC / bornera PE | Terminacion 360° cuando corresponda |

**15. Mapa de I/O mínimo del nodo Omni.**

| Tag | Tipo | Descripcion | Fail state |
|---|---|---|---|
| DI_S1_ZONE | DI 24 V PNP | Sensor de presencia/ocupacion | FAULT si incoherente/timeout |
| DI_S2_SIDE_CLEAR | DI 24 V PNP | Permiso de salida lateral | FALSE |
| DI_UP_REQ | DI 24 V PNP | Request desde zona upstream | FALSE |
| DI_DN_PERM | DI 24 V PNP | Permission desde downstream | FALSE |
| DI_DRV_A_FAULT | DI | Falla driver A | FAULT |
| DI_DRV_B_FAULT | DI | Falla driver B | FAULT |
| DO_UP_PERM | DO 24 V PNP | Permission hacia upstream | OFF |
| DO_DN_REQ | DO 24 V PNP | Request hacia downstream | OFF |
| DO_SIDE_REQ | DO 24 V PNP | Solicitud al destino lateral | OFF |
| DO_DRV_A_EN | DO | Enable driver A | OFF |
| DO_DRV_B_EN | DO | Enable driver B | OFF |
| PULSE/DIR A | salida rapida | Velocidad/sentido grupo A | STOP |
| PULSE/DIR B | salida rapida | Velocidad/sentido grupo B | STOP |

Reservar capacidad: mínimo **4 DI de campo adicionales y 2 DO adicionales**.

**16. Telegrama de red y diagnóstico.** La red de supervisión no sustituye el handshake ZPA.

| Dato publicado | Ejemplo |
|---|---|
| Estado | EMPTY / RECEIVING / CENTERED / HOLD / FORWARD / DIVERT / FAULT |
| Sensores | S1, S2, request/permission |
| Motores | enable, sentido, velocidad consignada, fault |
| Contadores | cajas recibidas, forward, desviadas, rechazos |
| Tiempos | ultimo ciclo, tiempo ocupado, timeout |
| Salud | uptime, watchdog resets, temperatura, tension 24/48 V opcional |
| Version | firmware, configuracion, ID unico |

Comandos desde gateway: `ENABLE_ZONE, ROUTE_MODE, DIVERT_ENABLE, SPEED_PROFILE, RESET_FAULT, MAINTENANCE_MODE`, con validación, número de secuencia o timestamp y timeout de vigencia.

**17. Estrategia de fallas.**

| Falla | Respuesta local |
|---|---|
| Gateway/PLC fuera de linea | Continuar ZPA; bloquear desvio que requiera ruta nueva; mantener ruta confirmada segun politica |
| Ethernet de nodo perdido | No afecta handshake discreto; reportar al volver |
| Downstream permission perdido | Interpretar como FALSE; HOLD |
| S2 lateral perdido | FALSE; no desviar |
| S1 permanentemente activo | Timeout -> FAULT; retirar permission upstream |
| Driver A/B fault | Deshabilitar ambos; FAULT; no compensar con un solo grupo salvo modo manual |
| Brownout 24 V | Reset controlado; salidas OFF por hardware |
| Brownout 48 V | Drivers OFF; nodo conserva diagnostico si 24 V vive |
| Watchdog | Reinicio con salidas en estado seguro; no autorizar movimiento hasta autodiagnostico |
| E-stop | Circuito de seguridad externo desenergiza movimiento; ESP32 solo informa |

**18. Secuencia de puesta en marcha.** 1. I/O (forzar sensores/handshake, niveles 24 V, polaridad, fail state); 2. Motores sin carga (sentido A/B, límite de corriente, rampas, inversión con cero previo); 3. Caja única (CENTERED, FORWARD, ambos DIVERT a baja velocidad); 4. ZPA 3 zonas ZoneLogix-Omni-ZoneLogix sin PLC; 5. Pérdida de red (acumulación local); 6. Peor caso (caja máxima, menor fricción, 1 m/s, ciclos repetidos); 7. Timeout (bloquear/ocultar sensores → FAULT); 8. Térmica (ciclo continuo hasta estabilizar); 9. EMC (junto a variadores/cables de potencia); 10. Recuperación (power-cycle sin movimientos espontáneos).

**19. Parámetros que debe cerrar el ingeniero de control.**

| Grupo | Parametro |
|---|---|
| Caja | masa min/nom/max; largo/ancho/alto; material de fondo; CG |
| Omni | diametro efectivo; cantidad de ruedas/eje; friccion; transmision; inercias |
| Movimiento | v longitudinal; v lateral; aceleracion; jerk; tiempo maximo de desvio |
| Motor | tipo, torque/velocidad, corriente, encoder, temperatura |
| Driver | tension, corriente RMS/pico, entradas, fault, STO |
| Fuentes | potencia simultanea, inrush, margen, redundancia |
| Cable | distancias maximas, secciones, caida de tension, conectores |
| I/O | sensor exacto, PNP/NPN, tiempos de respuesta, interfaz ZoneLogix validada |
| Red | protocolo PLC, esquema IP, watchdog, diagnostico, direccionamiento |
| Seguridad | categoria/PL/SIL por evaluacion de riesgo |
| Ambiente | temperatura, polvo, humedad/lavado, vibracion, IP |

Cuatro datos desbloquean el dimensionamiento dinámico: peso máximo de caja, diámetro exterior efectivo de las Omniwheels, velocidad lateral objetivo, tiempo máximo permitido para completar el desvío.

**20. BOM preliminar por módulo Omni (48 V + 24 V local).**

| Cant. | Elemento | Especificacion / nota |
|---|---|---|
| 1 | Controlador ESP32 industrial Ethernet | Industrial Shields / NORVI, o Olimex + carrier I/O 24 V |
| 1 | DC/DC 48->24 V | 30 W aprox., DIN, aislado si bus unico 48 V |
| 2 | Driver motor | Closed-loop stepper o servo/BLDC |
| 2 | Motor grupo A/B | NEMA 23 en prototipo |
| 1-3 | Protecciones DC | Control + driver A + driver B |
| 1 | Seccionamiento local | Mantenimiento; no sustituye E-stop |
| 8-20 | Borneras | 48 V, 24 V, 0 V, PE, I/O, motor |
| 2 | Sensor minimo | S1 zona + S2 permiso lateral |
| 2-4 | Conectores sensor | M8/M12 o prensaestopas |
| 1-2 | Ethernet | 1 puerto a switch; 2 solo si switch/daisy-chain real |
| 1 | Gabinete | IP54/IP65, DIN, placa, canaleta, tierra |
| 1 | Conjunto EMC | prensas, ferritas/TVS/blindaje |

**21. Recomendación V1.** "bus 48 VDC por tramos + DC/DC 48->24 V en cada caja; ESP32 industrial Ethernet; I/O 24 V PNP aislado; dos drivers closed-loop; handshake ZPA discreto con vecinos; switch Ethernet industrial por grupo de zonas; gateway al PLC."

| Decision | Seleccion V1 |
|---|---|
| ZPA critico | Local y discreto |
| PLC | Supervision, rutas y recetas; no anticolision |
| Ethernet | Cableado industrial; **estrella por switch** |
| Wi-Fi | No usado para control |
| Potencia | 48 VDC motores; 24 VDC logica/sensores |
| ESP32 | Industrial/DIN o carrier industrial |
| Motores | NEMA 23 closed-loop para prototipo |
| Sensores | 2 instalados; >=4 DI de reserva |
| Interfaz ZoneLogix | Request/permission por I/O aislado, validado en banco |
| E-stop | Cableado de seguridad independiente |

**22. Fuentes técnicas consultadas (URLs en el PDF):**
- UniDrive — Controllers / ZoneLogix Plus 301208 y Gateway 301123: `https://www.unidrive.solutions/motors-controls/controllers`
- ZoneLogix Plus Installation and Troubleshooting Guide, P/N 301208: `https://static1.squarespace.com/static/6214ff3359371c47894906bf/t/633b2798a92e75000db37246/1664821148282/ZoneLogix%2BPlus%2BControl_ACG%2BPN%2B301208_Installation%2Band%2BUser%2BManual%2BJuly%2B2021.pdf`
- Industrial Shields — ESP32 PLC Family User Guide: `https://apps.industrialshields.com/main/documentation/User_Guides/ESP32_PLC/ESP32_PLC/ESP32_PLC_Family_User_Guide.pdf`
- NORVI IIOT: `https://www.norvi.lk/norvi-iiot-industrial-esp32-for-iiot-applications/`
- Olimex ESP32-POE-ISO: `https://www.olimex.com/Products/IoT/ESP32/ESP32-POE-ISO-EA/open-source-hardware`
- Phoenix Contact FL SWITCH 1005N 1085039: `https://www.phoenixcontact.com/es-pc/productos/industrial-ethernet-switch-fl-switch-1005n-1085039`
- MEAN WELL NDR-120: `https://www.meanwell.com/Upload/PDF/NDR-120/NDR-120-SPEC.PDF`
- MEAN WELL DDR-30: `https://www.meanwell.com/Upload/PDF/DDR-30/DDR-30-spec.pdf`
- Phoenix Contact PTCB E1 24DC/1-4A SI-R 1135753: `https://www.phoenixcontact.com/en-us/products/device-circuit-breakers-ptcb-e1-24dc1-4a-si-r-1135753`
- Phoenix Contact UT 4-HESI (5X20) 3046032: `https://www.phoenixcontact.com/us/products/3046032/pdf`
Criterio documental: candidatos técnicos, no aprobación de compra. Siguiente hito: cerrar motor/driver con la memoria mecánica y emitir esquema unifilar/multifilar, lista de cables, lista de I/O, asignación de bornes y protocolo FAT.

---

### A3 — Respuesta a U3: topología física lineal (daisy-chain) (líneas 553–867)

"Esa aclaración cambia una parte importante de la arquitectura: **quieres una topología física lineal real**, no una estrella escondida detrás de un switch."
```text
PLC / GATEWAY → OMNI #1 (NET IN / NET OUT) → OMNI #2 (NET IN / NET OUT) → CONTROL UNIDRIVE / INTERFAZ (IN / OUT) → OMNI #3
```
**Ethernet IN/OUT no puede ser un puente pasivo.** Cada caja Omni físicamente: `ETH IN`, `ETH OUT`, `POWER IN`, `POWER OUT`, conectores de sensores, motor A, motor B. Internamente `ETH IN`/`ETH OUT` pasan por un **switch Ethernet de dos puertos externos + un puerto interno hacia el ESP32** (3 puertos; enlace RMII/SPI al ESP32). Resultado: `Gateway → OMNI1 IN/OUT → OMNI2 → OMNI3 → OMNI4` sin switch grande con veinte cables desde un tablero.
UniDrive se ve igual: `ZONELOGIX IN/OUT → OMNI IN/OUT → ZONELOGIX IN/OUT → OMNI IN/OUT → ZONELOGIX`.

Internamente **dos redes distintas**, ambas se mantienen:
```text
1. BUS DE DATOS      ETH IN → switch → ETH OUT
2. HANDSHAKE ZPA     REQUEST / PERMISSION IN ; REQUEST / PERMISSION OUT
```
Razón: si `permission` depende de un paquete Ethernet que atraviesa varios módulos se introduce una dependencia innecesaria. Cada módulo: `ZPA IN/OUT` (vecino N-1/N+1) y `ETHERNET IN/OUT` (diagnóstico/rutas/PLC).

Conectores por lado — **Lado upstream:** `NETWORK IN`, `POWER IN`, `ZPA IN`. **Lado downstream:** `NETWORK OUT`, `POWER OUT`, `ZPA OUT`. **Costados:** `SENSOR ZONE`, `SENSOR SIDE`, `MOTOR A`, `MOTOR B`. Marcado físico: `← UPSTREAM … DOWNSTREAM →`, `X1 IN … X2 OUT`.

**Potencia:** `48V IN` / `48V OUT`; `FUENTE → OMNI1 → OMNI2 → OMNI3 → OMNI4`, pero eléctricamente las cargas están **en paralelo sobre un bus** (+48V / 0V); los conectores IN/OUT sólo continúan el trunk. (Aclaración a incluir en el documento para que "serie" no se interprete como conexión eléctrica serie de motores.)

Bloque interno de cada caja:
```text
             +48 V IN
                 │
       ┌─────────┴──────────┐
       │ distribución/pass  │──────── +48 V OUT
       └─────────┬──────────┘
                 │
              FUSIBLE
                 │
       ┌─────────┴─────────┐
       │                   │
    DRIVER A            DRIVER B
       │                   │
     MOTOR A             MOTOR B
                 +
            DC/DC 48→24
                 │
               ESP32
                 │
              sensores
```
Un fallo interno del módulo no obliga a interrumpir el bus principal.

**Modificación al PDF anterior:** en vez de `SWITCH / OMNI1 OMNI2 OMNI3` (estrella), la arquitectura principal debe mostrar `GATEWAY → OMNI 01 (IN/OUT) → ZoneLogix/Interface (IN/OUT) → OMNI 02 (IN/OUT) →`. Requisito formal: **"Todo módulo Omni deberá disponer de conectividad de entrada y salida para comunicaciones y potencia, permitiendo montaje físico daisy-chain sin necesidad de retornar cada módulo a un switch o tablero central."** Para Ethernet: switch interno, no dos RJ45 cableados entre sí. Mantener el handshake ZPA vecino-a-vecino independiente.

---

### A4 — Respuesta a U4: ¿conectar al RJ-25 de ZoneLogix o reemplazarlo por un drive propio? (líneas 230–532)

**Razonamiento capturado (línea 536):** "la pregunta correcta es si tu nodo OMNI puede insertarse directamente entre dos ZoneLogix usando los puertos 'Upstream / Downstream' como si fuera otro ZoneLogix. Revisé el manual porque aquí no conviene asumir el pinout ni que RJ-25 sea simplemente I/O discreto." Búsqueda: `ZoneLogix Plus 301208 upstream downstream RJ25 request permission Smart I/O manual`. Citas: manuals.plus (`https://manuals.plus/m/13de584d…`) y el PDF squarespace del manual 301208.

**Respuesta:** "**No conectaría tu OMNI directamente al puerto RJ-25 Upstream/Downstream de un ZoneLogix**" salvo que UniDrive/ACG entregue oficialmente el protocolo eléctrico y temporal. El manual define esos RJ-25 como **"Upstream Peer-to-Peer"** y **"Downstream Peer-to-Peer"**, con **cable modular de 6 conductores** entre ZoneLogix adyacentes; no está documentado como contacto `RUN/STOP` ni Ethernet convencional.

| Arquitectura | Resultado | Evaluación |
|---|---|---|
| OMNI propio ↔ ZoneLogix usando interfaz discreta Request/Permission | Conservas ZoneLogix en zonas normales | **Mejor para prototipo rápido** |
| Todos tus controladores propios: Omni-drive y Zone-drive | Toda la línea habla tu protocolo y usa Upstream/Downstream físicos propios | **Mejor como producto Conveyone definitivo** |

**La segunda idea es "particularmente buena":** un único controlador de zona Conveyone con firmware/configuración distinta según zona. Exterior idéntico: `CONVEYONE ZONE DRIVE` con `UPSTREAM IN/OUT`, `DOWNSTREAM`, `CONTROL LOCAL`, `MOTOR OUTPUTS`. Dos configuraciones:
- **ZONE DRIVE:** `Sensor zona → Controller → Basic Motor Driver → Motor UniDrive / motor DC/BLDC equivalente`
- **OMNI DRIVE:** `Sensor zona + Sensor lateral → Controller → Driver A / Driver B → Grupo A / Grupo B`
Protocolo idéntico: `UPSTREAM: REQUEST IN ◄──► DOWNSTREAM: REQUEST OUT`; `PERMISSION OUT ◄──► PERMISSION IN`.
Cadena física: `GATEWAY → ZONE DRIVE 01 → ZONE DRIVE 02 → OMNI DRIVE 03 → ZONE DRIVE 04 → OMNI DRIVE 05 → ZONE DRIVE 06`.

Lógica del Zone Drive normal (código verbatim):
```text
IF caja_en_zona = FALSE:
    permission_upstream = TRUE

IF request_upstream AND zona_disponible:
    MOTOR = RUN

IF caja_en_zona AND permission_downstream:
    MOTOR = RUN

IF caja_en_zona AND NOT permission_downstream:
    MOTOR = STOP
```
La tarjeta propia hace la inteligencia ZPA; el drive básico sólo ejecuta `RUN / STOP / SPEED / DIRECTION / FAULT`. Libera de depender de ZoneLogix.

Plataforma única: **Conveyone Zone Controller — CZC**, parámetro `ZONE_TYPE = NORMAL | OMNI`. `NORMAL`: `Motor output = M1`, `Sensor = S1`. `OMNI`: `Motor outputs = M1 + M2`, `Sensor = S1`, `Side sensor = S2`. Protocolo Upstream/Downstream idéntico → el resto de la línea no necesita saber qué tipo de zona hay.

**Separar controller de motor driver:**
```text
CONVEYONE ZONE CONTROLLER (ESP32, Ethernet, Upstream/Downstream, sensores, lógica ZPA, diagnóstico)
        │ COMMAND INTERFACE: RUN / DIR / SPEED
        ▼
BASIC MOTOR DRIVE → MOTOR
```
Omni: `CONTROLLER → MOTOR A/DRIVE A/Grupo A` y `MOTOR B/DRIVE B/Grupo B`. Al cambiar NEMA23 por BLDC, servo u otro motor UniDrive no se rehace la red ni la lógica ZPA; sólo el drive.

**¿Eliminar ZoneLogix?** Hacer ambas durante el desarrollo, diseñar hacia el controlador propio.
- V1 de pruebas: `ZoneLogix → Smart I/O / interfaz → OMNI Conveyone → Smart I/O / interfaz → ZoneLogix` (probar Omni en laboratorio UniDrive).
- Arquitectura producto: `CZC NORMAL → CZC NORMAL → CZC OMNI → CZC NORMAL`.

**Nomenclatura mantenida:** **UPSTREAM** = lado desde donde viene la caja; **DOWNSTREAM** = lado hacia donde avanza normalmente la caja. Cada controlador lleva físicamente `UPSTREAM ○`, `DOWNSTREAM ○`, más `POWER IN`, `POWER OUT`, `SENSOR 1`, `SENSOR 2`, `MOTOR 1`, `MOTOR 2`. En `NORMAL`, MOTOR 2 y SENSOR 2 quedan sin usar.

**Matiz:** ZoneLogix ya implementa funciones a replicar: handshake de zonas, ZPA/ZIP, frenado/**Zero Motion Hold**, recuperación ante paquetes entre sensores, diagnósticos y estados de falla; el controlador puede configurarse como **Basic Motor Control** (BMC). Construir un Zone Drive propio es viable; el trabajo serio es la lógica distribuida determinística y recuperación de fallas equivalente.

**Dirección del proyecto:** "**No intentar clonar el RJ-25 de ZoneLogix. Crear tu propio estándar UPSTREAM/DOWNSTREAM y tu propio Conveyone Zone Controller. Mantener ZoneLogix mediante una pequeña interfaz/adaptador únicamente durante la transición y las pruebas.**" Mismo hardware = Zone Drive u Omni Drive cambiando configuración/firmware.

---

### A5 — Respuesta a U5: PDF actualizado "REV C" con la memoria mecánica (líneas 17–19, 94–110; **texto final NO capturado**)

Notas de progreso/razonamiento capturadas:
- "Voy a actualizarlo como **REV C**, usando la memoria mecánica REV B como base real de diseño: **400 mm activos, 8 ejes, 4 OmniWheels/eje, Ø50 mm, 1,5 m/s, ~573 rpm, HTD 5M 28T 1:1, poleas fuera del rodamiento y el criterio de ≥0,6 N·m a esa velocidad**."
- "Además voy a cambiar la arquitectura principal para que los controladores se vean y se conecten físicamente **UPSTREAM → DOWNSTREAM en cadena**, y dejaré claramente comparadas las dos rutas: conservar ZoneLogix mediante bridge, o reemplazarlo por un controlador de zona propio común para zonas normales y OMNI."
- Renderizó el PDF REV B (`render_pdf.py … --dpi 120`) y "Renderizadas y analizadas las páginas del PDF".
- "Afinando la revisión mecánica: Estoy incorporando el **voladizo del rodamiento, el momento local, los esfuerzos y la envolvente de potencia**. También estoy separando claramente la cadena física propia de cualquier enlace compatible con ZoneLogix, evitando asumir compatibilidad no documentada."
- "Preparando el documento actualizado: Estoy integrando la arquitectura previa con la revisión mecánica: **nomenclatura upstream/downstream, transmisión en cadena, tensado, guías, modularidad y límites de diseño**. También estoy organizando el contenido para generar un PDF profesional y coherente."
- "Preparé el documento actualizado" (título de bloque; sin contenido).
- Búsquedas: `UniDrive ZoneLogix Plus basic motor control 301208 UniDrive ONE manual`; `UniDrive ONE motor 48W 24V input control interface run stop` (el buscador devolvió además manuales Control Techniques Unidrive SP / M400 —variadores AC, ruido no relacionado— y páginas ManualsLib del ZoneLogix 301216 y ZoneLogix PRO).

**No hay en el archivo**: el texto de respuesta final, el enlace al PDF REV C, ni las tablas/valores nuevos derivados de la mecánica (voladizo, momento, esfuerzos, envolvente de potencia). Todo lo que se sabe de REV C es la intención declarada arriba.

---

## 3. Estado final de la lógica / arquitectura de control

Estado al cierre de la conversación (A4 + intención A5; el PDF REV C no está capturado):

### 3.1 Zona Omni (planta)
- Módulo 24 in (609,6 mm) largo útil × 21 in (533,4 mm) ancho útil; 8 ejes a pitch 3 in (76,2 mm); rodillos a 45° alternados A-B-A-B-A-B-A-B; Grupo A = ejes 1/3/5/7, Grupo B = ejes 2/4/6/8; un motor por grupo, dos motores por módulo. **A5 introduce valores mecánicos REV B distintos**: 400 mm activos, 4 OmniWheels por eje, Ø50 mm, 1,5 m/s (ver §4 y §6).
- Descarga lateral a 90° hacia uno de los dos lados (desvío de 21").

### 3.2 Sensores
- S1 — Zone Sensor (ocupación de zona), DI 24 V PNP. Fail: FAULT si incoherente/timeout.
- S2 — Side Clear / Side Permission (destino lateral disponible), DI 24 V PNP; idealmente **clear-to-send generado por la zona receptora**, no sólo "sensor sin caja". Fail: FALSE.
- Reserva: S3 (confirmación de salida lateral), S4 (upstream/diagnóstico); ≥4 DI y 2 DO de reserva.

### 3.3 Actuadores, motores, drivers
- Dos grupos de ejes (A, B), cada uno con motor + driver independiente con STOP/FORWARD/REVERSE (no basta ON/OFF).
- Prototipo: 2 × NEMA 23 (usuario menciona NEMA 32/42 como alternativas); recomendación: stepper closed-loop o servo/BLDC. Driver: 36–60 VDC (objetivo 48 VDC), STEP/DIR (salidas rápidas PULSE/DIR A y B) o bus, ENABLE, FAULT, encoder, rampas programables, límite de corriente; STO si existe.
- Interlock: nunca inversión instantánea a plena velocidad; secuencia desaceleración → cero confirmado/temporizado → inversión → aceleración.
- Criterio REV B (A5): ≥0,6 N·m a ~573 rpm (1,5 m/s, Ø50 mm), transmisión HTD 5M 28T relación 1:1, poleas fuera del rodamiento.

### 3.4 Tabla de mando (familias ±45°)

| Comando | A | B | Efecto |
|---|---:|---:|---|
| HOLD | 0 | 0 | caja inmóvil |
| FORWARD | +1 | +1 | avance longitudinal (recto) |
| REVERSE | -1 | -1 | retroceso longitudinal (servicio) |
| DIVERT_LEFT | +1 | -1 | desvío lateral 90° a un lado |
| DIVERT_RIGHT | -1 | +1 | desvío lateral 90° al otro lado |
| DIAGONAL_A | +1 | 0 | diagonal 45° (modo prueba) |
| DIAGONAL_B | 0 | +1 | diagonal 45° opuesta (modo prueba) |

Los signos reales se parametrizan tras verificar el montaje.

### 3.5 Controlador
- Un **Conveyone Zone Controller (CZC)** basado en **ESP32 industrial** (Industrial Shields ESP32 PLC / NORVI IIOT-NORVI X / Olimex ESP32-POE-ISO-IND + carrier) con PHY Ethernet físico, watchdog hardware, E/S 24 V PNP aisladas, montaje DIN.
- Parámetro `ZONE_TYPE = NORMAL` (M1, S1) o `OMNI` (M1+M2, S1, S2). Mismo hardware; mismo protocolo Upstream/Downstream.
- Controller separado del **basic motor drive** por interfaz `RUN / DIR / SPEED` (+ ENABLE/FAULT).
- Conectores físicos por controlador: lado upstream `NETWORK IN / POWER IN / ZPA IN` (X1 IN); lado downstream `NETWORK OUT / POWER OUT / ZPA OUT` (X2 OUT); costados `SENSOR 1 (zona) / SENSOR 2 (lateral) / MOTOR 1 (A) / MOTOR 2 (B)`.

### 3.6 Mapa de I/O mínimo (nodo Omni)
DI_S1_ZONE, DI_S2_SIDE_CLEAR, DI_UP_REQ, DI_DN_PERM, DI_DRV_A_FAULT, DI_DRV_B_FAULT; DO_UP_PERM, DO_DN_REQ, DO_SIDE_REQ, DO_DRV_A_EN, DO_DRV_B_EN; PULSE/DIR A, PULSE/DIR B (fail states en §2/A2 sección 15).

### 3.7 Reglas ZPA / handshake
- Handshake vecino-a-vecino **discreto, 24 V PNP aislado**, independiente de Ethernet: `REQUEST IN/OUT`, `PERMISSION IN/OUT` (+ opcional `SIDE_REQUEST_OUT` / `SIDE_PERMISSION_IN`).
- UPSTREAM = de donde viene la caja; DOWNSTREAM = hacia donde avanza.
- Zona normal: `IF NOT caja_en_zona: permission_upstream = TRUE`; `IF request_upstream AND zona_disponible: RUN`; `IF caja_en_zona AND permission_downstream: RUN`; `IF caja_en_zona AND NOT permission_downstream: STOP`.
- Zona Omni: `IF NOT zone_occupied: aceptar upstream`; `IF zone_occupied: IF downstream_available → FORWARD; ELSE IF side_available AND divert_enabled → DIVERT_SIDE; ELSE → HOLD`. Configurable `DivertPriority = THROUGH_FIRST | SIDE_FIRST`; `RouteMode = STRAIGHT | LEFT | RIGHT | ANY_AVAILABLE`.
- Tabla de decisión (S1, Downstream, Side, Route → acción) según A2 sección 5.
- Pérdida de vecino/permiso → `permission = FALSE` inmediato; fallo de comunicaciones → estado seguro (no conceder permiso, detener zona).
- Frontera con ZoneLogix Plus 301208: por **Smart I/O** (Smart 1 = Request, Smart 2 = Permission en zona de entrada; invertido en salida; PNP, activo > 18 VDC), nunca por el RJ-25 peer-to-peer (6 hilos, no documentado). En producto final se reemplaza ZoneLogix por CZC NORMAL; durante transición, adaptador/bridge.

### 3.8 Máquina de estados (versión PDF v1)
EMPTY →(upstream request) RECEIVING →(S1 estable) CENTERED →(settle) DECIDE →{downstream libre → FORWARD →(S1 libre) EMPTY | lateral libre + permiso → LATERAL DIVERT →(confirmación salida) EMPTY | sin destino → HOLD →(re-evaluar) DECIDE | timeout/fault → FAULT →(reset autorizado) HOLD}. La evaluación lateral sólo tras estabilizar la caja (CENTERED), nunca en plena entrada a 1 m/s.

### 3.9 Temporización
Lectura entradas 1–2 ms; ciclo FSM ≤ 2 ms; debounce 2–10 ms; decisión < 10 ms; comando a driver ≤ 2 ms; heartbeat gateway 20–100 ms (no crítico); watchdog 50–100 ms; a 1 m/s → 1 mm/ms. Tiempo de parada real = detección + debounce + lógica + retardo driver + rampa + deslizamiento (ensayo peor caso).

### 3.10 Red y supervisión
- Topología física **daisy-chain** (U3): cada caja con `ETH IN`/`ETH OUT` mediante **switch Ethernet interno de 3 puertos** (2 externos + 1 al ESP32 por RMII/SPI); nunca puente pasivo. Bus de datos separado del handshake ZPA.
- Gateway → PLC (EtherNet/IP / PROFINET; V1 Modbus TCP hacia nodos). Gateway: recetas, rutas, `ENABLE_ZONE, ROUTE_MODE, DIVERT_ENABLE, SPEED_PROFILE, RESET_FAULT, MAINTENANCE_MODE`, diagnóstico, contadores. **Nunca en el lazo de anticolisión.** Sin Wi-Fi para control.
- Candidatos: Phoenix FL SWITCH 1005N (1085039), gateway ZoneLogix PRO Monitor Gateway 301123 o gateway PLC.

### 3.11 Potencia y caja
- Bus **48 VDC** por tramos (trunk `48V IN/OUT`, cargas en paralelo) → protección local (fusible/e-breaker por driver) → drivers A/B; **DC/DC 48→24 V** local (MEAN WELL DDR-30L-24, 30 W) → ESP32, sensores, I/O ZPA. Alternativa: 24 + 48 VDC centrales (marcada "recomendada" en sección 8 del PDF, ver §4). PSU 48 V prototipo: MEAN WELL NDR-120-48 (48 V, 2,5 A, 120 W) —no final—. ZoneLogix Plus: 22–28 VDC PELV; 0 V comunes entre fuentes, positivos no.
- Protección 24 V: Phoenix PTCB E1 24DC/1-4A SI-R (1135753) o UT 4-HESI (5x20) (3046032). Sensores 100–500 mA/ramal.
- Gabinete todo-en-uno 300×250×150 mm (IP54/IP65, DIN 35 mm) o caja lógica ~160×120×90 mm con drivers fuera. No PoE para motores. E-stop cableado independiente (retira energía de movimiento / STO).

### 3.12 Fallas
Según tabla A2 sección 17 (gateway fuera, Ethernet perdido, permission perdido → HOLD, S2 perdido → no desviar, S1 permanente → FAULT, driver fault → ambos OFF, brownout 24/48 V, watchdog, E-stop).

### 3.13 Explícitamente abierto
- Masa mín/nom/máx de caja, dimensiones, CG, material de fondo, fricción rueda-caja.
- Diámetro efectivo real de Omniwheel (A1/A2 usan 50/60/80 mm como ejemplos; REV B dice Ø50).
- Velocidad lateral objetivo y tiempo máximo de desvío (21").
- Inercias, relación de transmisión, eficiencia, aceleración/jerk, ciclos/hora.
- Motor y driver definitivos (códigos), potencia de fuentes, calibres, fusibles, esquema multifilar, numeración X1/X2, pinout ZoneLogix-Omni, I/O exactas del ESP32, BOM definitiva.
- Signos reales de A/B tras montaje.
- Protocolo PLC definitivo, esquema IP, categoría de seguridad (PL/SIL).
- Si S2 es sensor o clear-to-send de la máquina receptora.
- Contenido real del PDF REV C (no capturado).

---

## 4. Cambios de rumbo y contradicciones

| # | Tema | Antes | Después | Turnos |
|---|---|---|---|---|
| 1 | Topología Ethernet | U1 pide "conectar en serie a través de cable de red". A1: preferir **estrella con switch industrial**, no cadena ESP→ESP; A2 (PDF §14 y §21) fija "Ethernet: estrella por switch", BOM "1 puerto a switch; 2 solo si daisy-chain real". | U3 insiste en que se vea físicamente en serie. A3: **daisy-chain con switch interno de 3 puertos** en cada caja + handshake ZPA discreto separado; ordena modificar el PDF. A5 confirma "UPSTREAM → DOWNSTREAM en cadena". | U1→A1→A2→U3→A3→A5 |
| 2 | "Zonas muertas" | U1 teme zonas muertas al intercalar Omni entre UniDrive y plantea bypassear/cortar la acumulación. | A1: no existen zonas muertas; la Omni se presenta como zona ZPA virtual y habla sólo con vecinos. | U1→A1 |
| 3 | Nombres de estados | A1: EMPTY / RECEIVING / OCCUPIED / FORWARD_DISCHARGE / LATERAL_DIVERT / HOLD / FAULT, luego añade CENTERED y HOLD previo a evaluar. | A2 (PDF): EMPTY / RECEIVING / CENTERED / DECIDE / FORWARD / LATERAL DIVERT / HOLD / FAULT (OCCUPIED desaparece; aparece DECIDE; FAULT sale a HOLD con reset). | A1→A2 |
| 4 | Conservar ZoneLogix | A1/A2: ZoneLogix Plus en zonas normales; Omni interfaz por Smart I/O 24 V. | U4 pregunta si reemplazarlo por drive propio. A4: mejor producto = **CZC propio** para zonas normales y Omni; ZoneLogix sólo con adaptador en transición/pruebas. A5: comparará ambas rutas. | A1/A2→U4→A4→A5 |
| 5 | Distribución de potencia (usuario) | U1: transformadores en cada caja, distribución trifásica en paralelo o "cable de red con fuerza PowerLink". | A1: 24/48 VDC distribuido, fuentes centralizadas, **no PoE para motores**; A2/A3: bus 48 V trunk IN/OUT + DC/DC 48→24 local. | U1→A1→A2/A3 |
| 6 | Opción de potencia recomendada (inconsistencia interna del PDF v1) | PDF §8 tabla: **"A. 24 + 48 VDC central — Opción recomendada"**. | PDF §20/§21 y mensaje final de A2: V1 = **"bus 48 VDC por tramos + DC/DC 48→24 V en cada caja"** (= opción B). | A2 |
| 7 | Velocidad de diseño | U1/A1/A2: ≥ 1,0 m/s (RPM calculadas a 1 m/s: 382/318/239 rpm). | A5 (memoria REV B): **1,5 m/s, ~573 rpm** con Ø50 mm. | A2→A5 |
| 8 | Largo activo del módulo | U1/A1/A2: 24 in = 609,6 mm útiles, 8 ejes a 76,2 mm. | A5 (REV B): **400 mm activos**, 8 ejes (pitch implícito ≈ 50–57 mm, no 76,2). | A2→A5 |
| 9 | Ruedas por eje | No definido en U1–A4 (PDF §19 lo deja como parámetro "cantidad de ruedas/eje"). | A5: **4 OmniWheels/eje**. | A2→A5 |
| 10 | Rol del gateway | U1: "todo esto va a ser comandado por un gateway". | A1 en adelante: gateway sólo supervisión/rutas/recetas; decisión y anticolisión locales. | U1→A1 |
| 11 | Motores | U1: NEMA 23 con "controlador básico"; alternativas NEMA 32/42. | A1/A2: closed-loop stepper o servo/BLDC, driver con STEP/DIR/ENABLE/FAULT; A4: incluso motor UniDrive/BLDC vía basic motor drive RUN/DIR/SPEED. | U1→A1→A4 |
| 12 | Tabla de movimientos | A1: REVERSE al final "retroceso longitudinal". | A2: REVERSE = "retroceso longitudinal **de servicio**"; DIAGONAL_A/B = "modo de prueba" (no operativos). | A1→A2 |
| 13 | Nomenclatura conectores | A3: `NET IN/OUT`, `ETH IN/OUT`, `ZPA IN/OUT`, `X1 IN / X2 OUT`. | A4/U4: adoptar nombres de UniDrive **UPSTREAM / DOWNSTREAM** en el producto. | A3→U4→A4 |

---

## 5. Supuestos no verificados y fuentes citadas

### 5.1 Afirmaciones sobre ZoneLogix Plus / UniDrive (citadas al manual, no verificadas por el usuario)
- RJ-25 de 6 hilos "Upstream Peer-to-Peer" / "Downstream Peer-to-Peer" entre ZoneLogix adyacentes; protocolo no documentado como I/O discreto.
- Smart I/O: en zona de entrada Smart 1 = Request, Smart 2 = Permission; en zona de salida invertido; PNP; activo > 18 VDC.
- Alimentación 22–28 VDC, PELV 24 V recomendado; 0 V comunes entre fuentes adyacentes, positivos no puenteados.
- Soporta motores UniDrive 48/60/80/100 W; velocidades configurables; entrada analógica diferencial 0–10 V.
- Funciones: ZPA/ZIP, Search and Rescue, Zero Motion Hold, Basic Motor Control (BMC), Zone Hold input.
- P/N 301208 (ZoneLogix Plus), 301216 (ZoneLogix, aparece en resultados ManualsLib), 301810 (ZoneLogix PRO 2.0, en resultado de búsqueda), Gateway 301123 "ZoneLogix PRO Monitor Gateway" con EtherNet/IP.
- Fuentes: `https://static1.squarespace.com/static/6214ff3359371c47894906bf/t/633b2798a92e75000db37246/1664821148282/ZoneLogix%2BPlus%2BControl_ACG%2BPN%2B301208_Installation%2Band%2BUser%2BManual%2BJuly%2B2021.pdf`; `https://manuals.plus/m/13de584d037616a2251e1e71f51ebdfd9a866b88557dd53649d0c56f619d792e`; `https://www.unidrive.solutions/motors-controls/controllers`; páginas ManualsLib "Unidrive ZoneLogix 301216 Installation And Troubleshooting Manual" (pp. 4, 5, 6, 8, 9) y "ZoneLogix Plus" (pp. 10, 11); Scribd "ZoneLogix PRO Zone Controller User Guide Rev 1.0".

### 5.2 Datos de componentes (de datasheets web, no confirmados en la conversación)
- MEAN WELL NDR-120-48: 48 V, 2,5 A, 120 W (`https://www.meanwell.com/Upload/PDF/NDR-120/NDR-120-SPEC.PDF`).
- MEAN WELL DDR-30L-24: 30 W, entrada 18–75 V, 24 V, 4 kVdc (`https://www.meanwell.com/Upload/PDF/DDR-30/DDR-30-spec.pdf`). Nota: la búsqueda fue por "DDR-30G-24"; el PDF usa "DDR-30L-24" (variante de entrada 48 V nominal) — coherente, pero el cambio de sufijo no se explica.
- Phoenix Contact FL SWITCH 1005N 1085039: 5×RJ45 10/100, 22,5 mm; PTCB E1 24DC/1-4A SI-R 1135753: 1/2/3/4 A ajustable; UT 4-HESI (5X20) 3046032: 4 mm².
- Industrial Shields ESP32 PLC: 12–24 VDC (`…ESP32_PLC_Family_User_Guide.pdf`); NORVI IIOT / NORVI X con Ethernet/RS-485 (`https://www.norvi.lk/…`); Olimex ESP32-POE-ISO(-IND) 100 Mb, aislamiento PoE, -40..85 °C (`https://www.olimex.com/Products/IoT/ESP32/ESP32-POE-ISO-EA/open-source-hardware`).

### 5.3 Criterios de ingeniería sin fuente (juicio del asistente)
- Presupuesto temporal (≤ 2 ms ciclo, 2–10 ms debounce, < 10 ms decisión, 20–100 ms heartbeat, 50–100 ms watchdog, "100 ms sin PLC no puede parar la acumulación").
- Tamaños de gabinete 300×250×150 mm y 160×120×90 mm; IP54/IP65.
- Protecciones "1–4 A" en 24 V, "100–500 mA" sensores, cable 0,75–1,5 mm².
- "Dos NEMA 23 pueden superar 120 W".
- Driver 36–60 VDC preferente.
- "Un ESP32 con un solo PHY no permite pasar Ethernet pasivamente" (correcto en principio, sin cita).
- RPM = 60v/(πD) sin deslizamiento ni descomposición vectorial a 45° (el propio asistente advierte que no sirve para torque).
- Que las velocidades V1 puedan lograrse con stepper closed-loop NEMA 23.
- "NEMA 32" mencionado por el usuario no es un tamaño estándar (existen NEMA 23, 34, 42); no fue corregido.

### 5.4 Valores mecánicos REV B (provienen del PDF adjunto por el usuario, no del texto de la conversación)
400 mm activos; 8 ejes; 4 OmniWheels/eje; Ø50 mm; 1,5 m/s; ~573 rpm; HTD 5M 28T 1:1; poleas fuera del rodamiento; ≥ 0,6 N·m a esa velocidad; voladizo del rodamiento; momento local; esfuerzos; envolvente de potencia; transmisión en cadena; tensado; guías. Sólo se conocen por la nota de A5; su contexto y cálculo no están en este archivo.

### 5.5 Ruido de búsqueda que NO debe tomarse como parte del diseño
Control Techniques Unidrive SP / Unidrive Classic / Unidrive M400 (variadores AC); Hytrol EZ-Logic y acumulación mínima presión; ACG Conveyors/PFlow VRC; Interroll MCP; patente Roach "Singulating conveyor herringbone"; DynoDrive One/Core/Cube 24 V; NorthAmCon driver cards; MEAN WELL XDR/XTR/HDR/SDR/DRP/DR/IRM; Phoenix UT 4-… variantes y PTCB de 0,1/2/3/4/6/1-3/1-8 A; NORVI AGENT variantes; foros Olimex.

---

## 6. Relación con el diseño mecánico (para cruce con la memoria mecánica)

| Parámetro | Valor en esta conversación | Origen | Observación para cruce |
|---|---|---|---|
| Largo útil del módulo | 24 in = 609,6 mm ("dos pies") | U1, A1, A2 (Fig. 1, §1) | **REV B: 400 mm activos** (A5). Discrepancia 609,6 vs 400 mm. |
| Ancho útil | 21 in = 533,4 mm | U1, A1, A2 | Recorrido lateral del desvío = 21" (A1 cierre). |
| Número de ejes | 8 | U1, A1, A2, A5 | Coincide. |
| Pitch | 3 in = 76,2 mm nominal | U1, A1, A2 | Con 8 ejes → 7 × 76,2 = 533,4 mm entre primer y último eje. Con 400 mm activos REV B el pitch implícito sería ≈ 50–57 mm: **verificar**. |
| Orientación rodillos | 45° alternados A-B-A-B-A-B-A-B (A "45° izq.", B "45° der.") | U1, A2 Fig. 1 | Signos a verificar en montaje. |
| Agrupación / motores | Grupo A ejes 1/3/5/7, Grupo B ejes 2/4/6/8; 1 motor por grupo; 2 motores por módulo | U1, A1, A2 | Inercia "de los 4 ejes por motor" (A1). |
| Ruedas por eje | 4 OmniWheels/eje (→ 32 por módulo, 16 por grupo) | A5 (REV B) | No definido en A1–A4; PDF v1 lo deja como parámetro abierto. |
| Diámetro de rueda | Ejemplos 50 / 60 / 80 mm (A1, A2); **Ø50 mm** (REV B, A5) | A1, A2, A5 | RPM a 1 m/s: 382 / 318 / 239; a 1,5 m/s con Ø50: ~573 rpm. |
| Velocidad longitudinal | ≥ 1,0 m/s (U1 "por lo menos un metro por segundo"; A1/A2 objetivo mínimo) | U1, A1, A2 | **REV B: 1,5 m/s** (A5). |
| Velocidad lateral | TBD | A1, A2 | Abierta. |
| Tiempo máximo de desvío | TBD (para 21") | A1, A2 | Abierto. |
| Torque de diseño | ≥ 0,6 N·m a ~573 rpm | A5 (REV B) | *Nota del digest (cálculo propio, no de la conversación):* 0,6 N·m × 573 rpm ≈ 0,6 × 60 rad/s ≈ 36 W mecánicos por motor; comparar con NDR-120-48 (120 W) y advertencia "dos NEMA 23 pueden superar 120 W". |
| Transmisión | HTD 5M 28T, relación 1:1; poleas fuera del rodamiento; "transmisión en cadena, tensado, guías" | A5 (REV B) | PDF v1 pedía "relación de transmisión, eficiencia, inercias" como abiertos. |
| Motores | NEMA 23 prototipo (usuario: alternativas "NEMA 32" o NEMA 42); recomendación closed-loop stepper o servo/BLDC; driver 36–60 VDC, objetivo 48 VDC | U1, A1, A2 | "NEMA 23" sólo define brida; torque a velocidad real, no holding. |
| Motores de zonas normales | UniDrive 48/60/80/100 W a 24 VDC con ZoneLogix Plus 301208 (o CZC NORMAL + basic motor drive) | A1, A4 | Transportador anfitrión de rodillos motorizados 24 V MDR/ZPA. |
| Línea anfitriona | ZPA de ~20 posiciones; patrón ejemplo 5 ZoneLogix – OMNI – ZoneLogix – OMNI – 5 ZoneLogix; PDF: Z1–Z5 ZL, Z6 OMNI, Z7 ZL, Z8 OMNI, Z9 ZL | U1, A1, A2 | — |
| Caja transportada | masa mín/nom/máx, dimensiones, CG, material de fondo, fricción: **todos TBD** | A1, A2 | Cuatro datos críticos: peso máx., Ø efectivo, v lateral, t máx. desvío. |
| Aceleraciones | longitudinal, lateral, jerk: TBD | A2 | — |
| Ciclo | ciclos/hora, temperatura ambiente: TBD | A2 | — |
| Cargas estructurales (REV B) | voladizo del rodamiento, momento local, esfuerzos, envolvente de potencia | A5 | A integrar en REV C (no capturado). |
| Gabinete eléctrico por módulo | 300×250×150 mm (todo-en-uno) o ~160×120×90 mm (sólo lógica); IP54/IP65; DIN 35 mm | A2 | Espacio a reservar en el bastidor mecánico. |
| Sensores en planta | S1 al centro de la zona; S2 en la salida lateral (borde) | A2 Fig. 1 | Ubicación física a coordinar con la mecánica. |
| Distribución eléctrica física | trunk 48 V IN/OUT + Ethernet IN/OUT por módulo, marcado UPSTREAM/DOWNSTREAM, X1 IN/X2 OUT | A3, A4 | Conectores en caras upstream/downstream del módulo. |
