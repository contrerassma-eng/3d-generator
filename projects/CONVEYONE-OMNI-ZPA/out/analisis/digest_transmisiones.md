# Digest fiel — conversación ChatGPT "Dimensionar transmisiones Omniwheel"

**Fuente:** `chat_6a997a54-e33c-83e9-84d1-e90d12103977_clean.txt` (4334 líneas, ~189 kB). El archivo de extracción está en orden cronológico **inverso** (lo más reciente arriba; dentro de cada turno, el mensaje final aparece antes que sus pasos intermedios). Este digest lo reordena cronológicamente. Se descartó ruido de interfaz (cadenas UI, slugs de modelo, JSON de "products", cadenas `citeturn…`), pero los resultados de búsqueda web capturados se conservan en un anexo porque contienen referencias comerciales y precios.

**Estructura de la conversación:** 4 turnos de usuario (U1–U4) y 4 respuestas (A1–A4). Se generaron dos PDFs (memoria REV A de 13 páginas y memoria REV B) y un ZIP.

---

## 1. Mensajes del usuario, textuales y en orden

### U1
> Estoy desarrollando un sistema de Omniwheels con rodillos inclinados en 45 grados. Entonces tengo un eje con rodillos que van a la izquierda, luego el eje siguiente va hacia la derecha y luego izquierda a la derecha. Entonces, por suma de vectores, haciendo girar los grupos de ejes todos hacia adelante, las componentes horizontales se anulan y puedo sacar las cajas en la dirección que yo quiera. Ahora, si hago un grupo girar un grupo hacia atrás y el otro hacia adelante, también cambian los vectores. O, si tengo un eje apagado y el otro andando, también cambian los vectores. Entonces ese es el sistema que estoy desarrollando. Comercialmente en Chile encontré barra hexagonal de media pulgada, trefilada, que voy a ocupar como eje. Entonces voy a adaptar, les voy a refrentar, no perdón, les voy a cilindrar sus extremos y voy a ocupar rodamientos de 12 milímetros. En los extremos voy a ocupar unas ruedas Omniwheel comerciales que están en China, que son para esto, que tienen eje de 14 milímetros. Entonces debo hacer unos adaptadores de 14 milímetros hexagonal a media hexagonal. Entre Omniwheels, que van a ser 6 por cada eje, van separados de PVC. Pero debo alimentar esto desde un motor NEMA 23 que va a estar en una base un poco más abajo que los ejes. Entonces necesito, en realidad son dos NEMA 23, que necesito dimensionar las correas y las poleas. Las poleas van a ir adosadas al eje hexagonal y esa polea no debe ser, incluyendo la polea de correa, el diámetro no puede ser mayor a 50 milímetros. De hecho debe ser levemente inferior. Y debo dimensionar la distancia también. El pitch o paso entre ejes es de 3 pulgadas, para que lo consideres. Y el NEMA 23, las ruedas son de 50 milímetros, el NEMA 23 tiene un eje de 8 milímetros y la velocidad tangencial a la que yo me quiero mover es 1.5 metros por segundo. Entonces necesito, dadas las condiciones del motor NEMA 23, necesito dimensionar las transmisiones. Estaba pensando en poleas Poly-V o poleas sincrónicas con correas sincrónicas, tratando de ajustarme a lo que sea más común en el mercado chileno. Entonces ahí pasaría del motor a los dos rodillos, que van a estar entre sí a 6 pulgadas, ya que tengo el paso de 3 pulgadas, pero voy alternando las direcciones de los ejes. Así que un motor que va a ir por un costado de la estructura alimenta desde abajo, en diagonal hacia arriba, a una distancia, digamos horizontal de 6 pulgadas, no sé cuál será la diagonal, un poco más, en ambos costados. El motor alimenta con una correa hacia un lado y con la otra hacia el otro, en diagonal hacia arriba. y por el otro lado tengo lo mismo para el otro grupo de ejes. Luego entre sí, desde el primer rodillo transmitido desde el motor, tengo que avanzar hacia adelante, hacia el otro rodillo de ese grupo, que también va a estar a 6 pulgadas. También con otro tipo de transmisión, o puede ser la misma polea Poly-V. Entonces dimensioname eso, que se ajuste a mi configuración. Así lo hacen los chinos en los sistemas de Omniwheels que venden. Así que sería buen punto de partida y tratar de buscarlo acá en Chile.

### U2
> Genera un PDF con la memoria de cálculo, con la selección de componentes con link y con diagramas bien representados. Necesito que utilices toda tu potencia para generar vistas frontales y laterales de la transmisión, pero que aparezcan los componentes reales, sus proporciones reales, sin errores gráficos, es decir, trata de omitir el generador de imágenes, ya que puede inducir errores. Pero sí necesito un detalle geométrico real para plano técnico. Entonces usa todas tus herramientas, toda tu potencia. Si es necesario, modela en CAD y usa tus motores para generar estas vistas técnicas perfectas y la memoria de cálculo con todas sus ecuaciones bien representadas, con las condiciones de borde de lo que yo te planteé como problema inicial y tu solución.

### U3
> Considera el peso de las cajas y cada eje va a tener cuatro OmniWheels, cambiamos los cuatro, distribuidas en un espacio de 40 o 35 centímetros, ya que las cajas tienen de ancho, como máximo 30 centímetros. Sí, las cajas van a tener 30 centímetros de ancho. Entonces el ancho del cuerpo de desviación va a ser 40 centímetros, ahí van a estar apoyados los ejes. Después tengo que rellenar una zona hasta llegar a las 21 pulgadas, pero eso es una etapa nomás. Toda mi transmisión debe estar centrada en estos 400 cargados hacia un lado, estos 40 centímetros. y ahí tengo cuatro ruedas, cuatro ruedas OmniWheels. Eso. Quizás la polea, si molesta, podría estar por fuera del rodamiento donde tengo el espacio muerto. No se vería mal. De hecho queda bastante bien y bastante mejor que estuviera la transmisión. evalúalo como una opción. Ah, y las cajas tienen 5 kilos y esas cajas tienen de largo 500 milímetros. y también la mayoría de las cajas son de 250 milímetros de ancho por 30 centímetros de largo y esas pesan 2,5 kilos. y tengo otro grupo de cajas que pesan 500 gramos y son cajas vacías de las mismas dimensiones, tanto grandes y chicas.

(Junto a U3 aparece en la extracción una referencia `sediment://file_000000004d8c820e8ed716dd61029596`: un archivo adjunto —probablemente una imagen— cuyo contenido no es recuperable desde la extracción. Ver §6.)

### U4
> Dámelo en zip no puedo descargar pdf

---

## 2. Cronología de la conversación

### A1 — Dimensionamiento base de la transmisión (responde a U1)

**Pasos intermedios visibles (razonamiento/búsquedas):**
- "Voy a tratarlo como una transmisión real, no sólo geométrica: primero fijo las rpm necesarias en la rueda de 50 mm, luego relación de poleas, límites de Ø<50 mm, recorrido entre ejes de 152,4 mm y finalmente qué familia de correa conviene comprar en Chile. También voy a comprobar qué perfiles/tamaños se consiguen hoy."
- Búsquedas: "Chile polea correa sincronica HTD 5M 8M 3M 40 dientes 8 mm eje distribuidor Chile"; "Chile correa Poly-V PJ polea distribuidor industrial Chile"; "NEMA 23 8mm shaft typical torque speed 300 rpm 600 rpm stepper datasheet"; búsqueda de producto "polea sincronica HTD 5M 8mm eje; correa HTD 5M Chile"; "Chile HTD 5M 445 9mm correa"; "Chile polea HTD 5M 28 dientes 8mm"; `site:cpgoma.com HTD 5M 445`; `site:transmifuerza.cl HTD 445 5M`.
- "Estoy calculando unas 573 rpm para una rueda de 50 mm a 1.5 m/s. La selección de torque no puede cerrarse sin la curva del motor, carga, aceleración y voltaje. Una transmisión 1:1 parece viable, cuidando diámetro y espacio de poleas."
- "Ya aparece una combinación especialmente limpia para tu paso de 6" = 152,4 mm: con HTD 5M y poleas iguales de 28 dientes, el diámetro primitivo queda en 44,56 mm y una correa de 445 mm deja el entrecentro calculado prácticamente clavado en 152,5 mm. Eso encaja muy bien con tu restricción de Ø50 mm."
- Cálculo Python de longitudes de correas diagonales (`d = 28·5/π`; `L = 2C + π·d`, fórmula de poleas iguales; redondeo a múltiplo de 5 mm):

| Δx horizontal motor→eje | Caída h | C = √(Δx²+h²) | L calculada | Correa 5M redondeada |
|---|---|---|---|---|
| 76,2 mm | 50 mm | 91,14 mm | 322,28 mm | 320 |
| 76,2 mm | 75 mm | 106,92 mm | 353,84 mm | **355** |
| 76,2 mm | 100 mm | 125,72 mm | 391,45 mm | 390 |
| 152,4 mm | 50 mm | 160,39 mm | 460,79 mm | 460 |
| 152,4 mm | 75 mm | 169,86 mm | 479,71 mm | 480 |
| 152,4 mm | 100 mm | 182,28 mm | 504,56 mm | 505 |

**Respuesta final A1 (contenido íntegro):**

- Recomendación: **correa sincrónica HTD 5M, no Poly-V**, al menos para el primer prototipo funcional: control exacto de rpm de cada familia de ejes, inversión sin patinamiento, rodillos sincronizados (importante para que los vectores ±45° sean repetibles).
- Dimensionamiento base: D = 50 mm = 0,05 m; v = 1,5 m/s; **n = 60v/(πD) = 60(1,5)/(π·0,05) = 573 rpm**. Por tanto **no reduciría el NEMA 23**: transmisión **1:1**, motor comandado a ≈573 rpm.
- Tabla "La combinación que mejor calza con tu máquina":

| Elemento | Selección inicial |
|---|---|
| Rueda Omni | Ø50 mm |
| Paso entre todos los ejes | 76,2 mm / 3" |
| Paso entre ejes del mismo grupo | **152,4 mm / 6"** |
| Correa | **HTD 5M** |
| Ancho inicial | **9 mm** |
| Polea eje | **28 dientes** |
| Polea motor | **28 dientes** |
| Relación | **1:1** |
| Ø primitivo polea 28T | **44,56 mm** |
| Ø exterior comercial aprox. | **48 mm** |
| Velocidad eje | **573 rpm** |
| Velocidad tangencial | **1,50 m/s** |

- Justificación del límite Ø50: "En catálogos industriales una polea 28T HTD-5M aparece con Ø primitivo 44,56 mm y Ø exterior aproximadamente 48 mm; la de **30T ya puede llegar a Ø exterior ≈51 mm**, así que 28 dientes es prácticamente el máximo razonable bajo tu límite de 50 mm." (cita: catálogo de poleas en rackcdn, `Poleas.pdf`).
- Coincidencia con 6": para dos poleas iguales **L ≈ 2C + π·Dp**; con C = 152,4 mm y Dp = 44,56 mm → **L = 2(152,4) + π(44,56) ≈ 444,8 mm → 445-5M**. "Una 445-5M tiene exactamente 445 mm, 89 dientes y existe comercialmente incluso en 9 mm de ancho" (cita GPR Industrial 445-5M-09). Eje→eje del grupo: **28T — 445-5M-09 — 28T** → entrecentro teórico **≈152,5 mm** contra 152,4 mm reales: "coincidencia casi perfecta".
- Esquema de grupos (ASCII): PASO GENERAL = 3" = 76,2 mm; secuencia Grupo A (rodillos /), Grupo B (rodillos \), A, B; ejes A1, B1, A2, B2 a 76,2 mm; A1–A2 = 152,4 mm; NEMA A debajo, entre A1 y A2, con correas a ambos; NEMA B con B1–B2 "al otro costado, o en otra línea de poleas".
- Control de dirección: A adelante + B adelante → componente transversal se cancela; A adelante + B atrás → desplazamiento lateral; A apagado + B girando → movimiento diagonal; A y B con distintas velocidades → dirección intermedia. Con steppers se pueden variar continuamente ω_A y ω_B, no sólo ON/OFF/inversión.
- Transmisión entre ejes: A1→A2: **28T/28T + 445-5M-09**; B1→B2: **28T/28T + 445-5M-09**. "Para más ejes puedes repetir módulos cada 6"."
- Detalle mecánico: **no meter todas las transmisiones en un único plano axial** de la barra hexagonal; usar polea doble o dos poleas lado a lado. Esquema: `──[ OMNI ][PVC][ OMNI ]───[HTD A][HTD B]──rodamiento` — una pista recibe potencia del motor y la otra continúa hacia el siguiente eje (simplifica montaje, tensión y reemplazo de correas). (Nota: en A1 las poleas quedan **dentro** del rodamiento.)
- Poly-V vs HTD: Poly-V muy disponible en Chile; catálogo nacional de perfil **PJ** (paso 2,34 mm, espesor 3,5 mm) (cita CP Goma); correas **PK** disponibles (cita Transmifuerza). Pero para esta máquina **HTD 5M > Poly-V** por cuatro requisitos: inversión frecuente, aceleraciones/deceleraciones, sincronismo entre varios ejes, control vectorial basado en velocidades conocidas. Poly-V "muy interesante más adelante" por menos ruido, menor costo, tolerancia a desalineaciones, para repartir potencia entre muchos rodillos.
- Polea de motor (eje NEMA 23 Ø8 mm): **28T HTD-5M, ancho 9 mm, agujero Ø8 H7**, con chaveta si el eje la tiene, o preferiblemente **hub de apriete/clamping** antes que uno o dos prisioneros.
- Poleas de eje hexagonal 1/2": **alojamiento hexagonal AF 12,7 mm** mecanizado directo o mediante pequeño hub adaptador, para que el torque no dependa de un prisionero contra una cara del hexágono.
- Productos mostrados: "Poleas HTD-5M 15-30 dientes para ejes de 8 mm a 19 mm" — **$15.274** (cnc.pe); "Polea dentada T5-14 eje 8 mm" — **$2.400** (Cimech 3D; título del proveedor: "Polea dentada T5-14 (14 dientes)(D.I. 8mm)(B máx: 15mm)"). "La primera referencia es dimensionalmente cercana a lo que necesitas; no la tomaría todavía como especificación final de compra hasta verificar ancho, bridas y diámetro exterior."
- Correa desde el NEMA hacia arriba: falta sólo la caída vertical del motor. Con 28T/28T: **L = 2C + 140,0** (aprox.), **C = √(ΔX² + ΔY²)**. Si hay 6" horizontales = 152,4 mm motor→eje:

| Caída vertical motor | Distancia diagonal C | Correa HTD aproximada |
|---|---|---|
| 50 mm | 160,4 mm | **460-5M** |
| 75 mm | 169,9 mm | **480-5M** |
| 100 mm | 182,3 mm | **505-5M** |

- Alternativa "geométricamente mejor": **NEMA centrado debajo de A1 y A2** → componente horizontal motor→cada eje = 152,4/2 = **76,2 mm**, dos correas simétricas. Con caída 75 mm: **C = √(76,2² + 75²) = 106,9 mm → L ≈ 354 mm → 355-5M-09**; ranuras de regulación en la placa del motor de **±5–10 mm**. "Extremadamente compacta".
- Punto NO cerrado: torque del NEMA 23. "NEMA 23 define principalmente dimensiones de montaje, no el torque disponible a 573 rpm." Para cerrarlo se requiere la curva torque/rpm del modelo concreto y: masa máxima de caja, cantidad de cajas simultáneas, longitud de ejes, cantidad total de Omniwheels por NEMA, aceleración deseada. Dato crítico: **torque dinámico alrededor de 600 rpm**, no holding torque. Si se pretende pasar de +1,5 a −1,5 m/s rápido, la exigencia viene de aceleración/inercia de los seis Omniwheels + eje + caja.
- "Diseño que congelaría ahora": D_Omni = 50 mm; v = 1,5 m/s; n = 573 rpm; p_ejes = 76,2 mm; p_grupo = 152,4 mm; HTD-5M-09; Z1 = Z2 = 28T; Dp = 44,56 mm; D_ext ≈ 48 mm; A1–A2: 445-5M-09; i = 1:1.
- Siguiente paso: dimensionar el NEMA 23 real, aceleración máxima, torque por eje y tensión/ancho final HTD (9 vs 15 mm); requiere modelo exacto de motor y peso máximo de caja.

### A2 — Memoria de cálculo REV A en PDF (responde a U2)

**Pasos intermedios visibles:**
- "Voy a construirlo como una memoria de cálculo de ingeniería, no como folleto: fijaré hipótesis y condiciones de borde, verificaré componentes comerciales actuales, generaré geometría proporcional a escala para vistas frontal/lateral y ensamblaje de transmisión, y luego cerraré todo en PDF con ecuaciones, BOM y enlaces. No usaré generación de imágenes; las vistas las haré geométricamente desde dimensiones reales."
- Búsquedas: "Chile correa HTD 5M 445 9 mm polea 28 dientes HTD 5M Chile"; "Gates PowerGrip HTD 5M pulley 28 teeth pitch diameter 44.56 pdf" (gates.com); "SKF 6001 bearing 12 mm bore dimensions" (skf.com); "NEMA 23 stepper 8 mm shaft torque 3 Nm Chile"; `site:cimech3d.cl NEMA 23 3 Nm 8 mm DM556`; `site:megatronica.cl "NEMA 23" 8mm`; `site:mercadolibre.cl NEMA 23 3Nm 8mm Chile driver DM556`; `site:rsdelivers.com/cl motor paso a paso NEMA 23 8 mm`; "445 5M HTD belt"; "355 5M HTD belt"; "450 5M HTD belt Chile"; "445-5M-09"; "355-5M-09"; "28-5M pulley pitch diameter 44.56 outside diameter"; "28 teeth 5M outside diameter pulley"; "28-5M-09 timing pulley"; "50mm omni wheel 14mm hex"; "50 mm omniwheel 14 mm hex bore"; "50mm omni wheel 45 degree roller 14mm"; búsqueda dentro del manual Gates: "5M POWER RATINGS", "28", "5MGT".
- "Estoy verificando la selección nominal de 75 mm para un NEMA 23 de 57 mm y revisando si existe una correa 445-5M. También calcularé la distancia exacta y prepararé planos técnicos exportables."
- "La geometría del motor también cierra mejor de lo que parecía: usando **28T/28T HTD-5M** y una correa **355-5M**, el entrecentro es **~107,5 mm**. Si el motor queda exactamente entre dos ejes del mismo grupo (±76,2 mm en horizontal), la caída vertical resultante es **≈75,8 mm**. Eso permite dibujar una transmisión simétrica y completamente determinada, sin inventar una diagonal."
- "Estoy estimando la fuerza tangencial a partir de 3 N·m y una polea de 28 dientes. Usaré 9 mm como mínimo preliminar, pero recomendaré 15 mm si la aceleración o el torque efectivo son altos, pendiente de confirmar con tablas del fabricante."
- "También cerré el ancho de correa con catálogo de potencia, no por intuición: para **HTD 5M, 28 dientes y ~600 rpm**, Gates entrega una capacidad base de **334 W para 9 mm**; aplicando factor de longitud, queda aprox. **267 W para 355 mm** y **301 W para 445 mm**. Incluso usando como caso límite 3 N·m a 573 rpm (~180 W) más margen, 9 mm resulta defendible para el prototipo; dejaré 15 mm como opción de robustez."
- "Estoy usando dimensiones comerciales de referencia para el NEMA 23, dejando claro que el modelo exacto puede cambiar la longitud. También estoy buscando una rueda omnidireccional compatible y prepararé planos con cotas verificables."
- "Estoy estructurando un informe con ocho ejes separados 76.2 mm, una longitud útil de 609.6 mm y transmisión por correa. Incluiré vistas, cotas, supuestos, enlaces de referencia y advertencias sobre dimensiones que dependen del modelo exacto."
- Verificación de herramientas (reportlab, matplotlib, svglib). Script generador: `/mnt/data/create_omni_report.py` (reportlab + matplotlib → SVG → svglib). Correcciones de sintaxis/NumPy (`ax.arrow` con floats; `origins=[-120,0,120]`). Render de páginas a PNG a 160 dpi (`/mnt/data/omni_render/page-*.png`), hoja de contacto `/mnt/data/omni_contact.png`, preflight `pdf_preflight.py`.
- "Encontré y estoy corrigiendo una inconsistencia de representación antes de entregarlo: en el plano lateral, las correas del motor deben estar en **dos planos axiales distintos** sobre el eje de 8 mm; una sola garganta no puede alimentar dos ramales independientes. El PDF lo va a dejar explícito para evitar que el dibujo induzca a fabricar algo imposible."

**Contenido de la memoria REV A (`Omniwheel_Memoria_Calculo_Transmision.pdf`, 13 páginas), según el script generador:**

Cálculos núcleo del script: Dwheel = 50 mm; v = 1,5 m/s; rpm = 60·v/(π·0,05) = **572,96 rpm** (mostrado "573,0 rpm"); ω = 2π·n/60 = **60,00 rad/s**; pitch_all = 76,2; pitch_group = 152,4; z = 28; p = 5 mm; **Dp = z·p/π = 44,56 mm**; Do (De) = **43,42 mm**; Df = **48,0 mm**; r_pitch = 22,28 mm; L_between = 445 → **C_between = (445 − π·Dp)/2 = 152,50 mm**; L_motor = 355 → **C_motor = (355 − π·Dp)/2 = 107,50 mm**; half = 76,2 → **drop = √(107,50² − 76,2²) = 75,83 mm**; P_hold = 3,0·ω = **180 W**; Ft_full = 3,0/(r_pitch) = **≈135 N**; Pbase = 334 W; P355 = 334·0,8 = **267 W**; P445 = 334·0,9 = **301 W**.

Título: "MEMORIA DE CALCULO - TRANSMISION PARA TRANSPORTADOR OMNIWHEEL 45°". Base de diseño: 8 ejes a paso 3 in, dos familias alternadas A/B, ruedas Ø50 mm, eje hexagonal 1/2 in, dos NEMA 23 independientes.

Tabla resumen:

| Parámetro | Valor de diseño | Estado |
|---|---|---|
| Velocidad tangencial | 1,50 m/s | Dato de entrada |
| Rpm de los ejes | 573,0 rpm | Calculado |
| Paso entre ejes | 76,2 mm | Dato de entrada |
| Paso mismo grupo | 152,4 mm | Calculado |
| Transmisión | HTD 5M, 28T/28T, ancho 9 mm | Selección |
| Correa eje-eje | 445-5M-09 | Selección |
| Correa motor-eje | 355-5M-09 | Selección |
| Caída vertical motor | 75,8 mm (con motor centrado) | Calculado |
| Polea 28T | Dp 44,56 / De 43,42 / brida 48 mm | Verificado |
| Rodamiento extremo | 6001-2RS, 12x28x8 mm | Selección |
| Motor referencia | NEMA 23, 3,0 Nm, eje Ø8, 57x57x102 | Referencia comercial |

Conclusión ejecutiva: 28T HTD 5M satisface el límite radial de 50 mm. 445-5M con poleas iguales → C = 152,50 mm (≈ paso 152,4). Diagonales: 355-5M → C = 107,50 mm; motor centrado → h = 75,83 mm. Correa 9 mm con capacidad nominal suficiente para el caso de referencia; **15 mm** recomendada si impactos, aceleraciones severas o motor con mayor potencia dinámica.

Sección 1 — Condiciones de borde y supuestos:

| Condición | Definición utilizada |
|---|---|
| Geometría transportador | 24 in útiles longitudinales; 21 in útiles de ancho |
| Ejes | 8 ejes; centros longitudinales a 3 in (76,2 mm) |
| Familias | A y B alternadas; ejes de una misma familia separados 6 in (152,4 mm) |
| Omniwheels | 6 por eje; Ø50 mm; rodillos a +45° / −45° según familia |
| Eje | Barra hexagonal trefilada 1/2 in AF = 12,7 mm; extremos torneados a Ø12 mm |
| Apoyo | Rodamiento rígido de bolas sellado 6001-2RS, 12x28x8 |
| Interfaz rueda | Rueda con hexágono 14 mm; adaptador 14 mm hex → 1/2 in hex |
| Motor | Dos NEMA 23 independientes. Referencia de mercado: 3,0 Nm, eje Ø8 mm |
| Restricción polea | Diámetro total, incluida brida, menor a 50 mm |
| Velocidad | 1,5 m/s periféricos en rueda Ø50 mm |
| No cerrado | Masa máxima de caja, aceleración exigida, ciclo de trabajo, rueda china definitiva y rigidez exacta del bastidor |

Figura 1 (vista superior a escala): rectángulo 609,6 × 533,4 mm; 8 ejes en x = 38,1 + i·76,2 (38,1; 114,3; 190,5; 266,7; 342,9; 419,1; 495,3; 571,5 mm), etiquetados E1…E8 con dirección "A /" o "B \"; **seis ruedas por eje con envolvente comercial 50 × 27,5 mm**, centros equiespaciados entre 25 y 508,4 mm (espaciamiento axial provisional uniforme); cotas "609.6 mm = 24 in (longitud util)", "76.2 mm = 3 in", "152.4 mm = 6 in (mismo grupo)", "533.4 mm = 21 in ancho util". Nota: el paso axial definitivo de los separadores PVC debe congelarse con la rueda comprada.

Sección 2 — Cinemática: n = 60v/(πD) = 60(1,5)/[π(0,05)] = 573,0 rpm; ω = 2πn/60 = 60,00 rad/s; con 1:1 el motor trabaja ≈573 rpm. Figura 2: suma vectorial idealizada de familias ±45° (casos A+,B+ / A+,B− / A+,B=0). Nota de control: el vector real de la caja no es la suma ideal si hay deslizamiento, diferencias de carga, deformación de rodillos o pérdida de contacto; calibrar ω_A/ω_B experimentalmente; rampas S o trapezoidales para no perder pasos.

Sección 3 — Perfil de correa y polea: HTD 5M frente a Poly-V (inversión frecuente, relación definida, sin deslizamiento). Dp = z·p/π = 28(5)/π = 44,56 mm. Polea comercial 28-5M-09: Dp = 44,56 mm, De = 43,42 mm, Df = 48,0 mm → Df < 50 mm. Figura 3 (envolvente polea): Df = 48,0 mm; De = 43,42 mm; **L = 22,5 mm** (longitud total); **B = 14,5 mm** (cara); "28-5M-09 | z=28 | Dp=44.56 mm | **max bore catálogo 18 mm**". Fuentes: polea 28-5M-09F (beltingonline), Gates PowerGrip HTD.

Sección 4 — Transmisión eje-eje a 6 in: L = 2C + π·Dp → C = (L − π·Dp)/2; con L = 445 → **C = 152,50 mm**; error vs 152,4 mm: **+0,10 mm** (absorbible con ranuras, tolerancia de montaje). Correa 445-5M-09, 89 dientes, 9 mm (bbman). Ajuste recomendado: alojamiento de rodamiento o soporte de polea con recorrido útil mínimo **±2 mm** en la dirección del tramo. No pretensión excesiva (carga radial en los 6001 y en el eje del stepper).

Sección 5 — Geometría motor → dos ejes centrales: motor a mitad de dos ejes consecutivos de la misma familia → distancia horizontal 76,2 mm. **C_motor = (355 − π·Dp)/2 = 107,50 mm**; **h = √(C_motor² − 76,2²) = 75,83 mm**. Figura 4 (triángulo de montaje): cota 75,8 mm desde centro de eje motor a línea de centros de ejes Omni; 152,4 mm entre ejes A2–A3; 76,2 mm a cada lado; C = 107,50 mm en cada diagonal. Correa 355-5M-09, 71 dientes, 9 mm. Soporte del motor con ranuras verticales o radiales de **al menos 5 mm de ajuste total**, con ambas diagonales tensadas equivalentemente.

Sección 6 — Arquitectura completa de una familia (Figura 5): 4 ejes A1..A4 en 0 / 152,4 / 304,8 / 457,2 mm; motor centrado entre A2 y A3 (x = 228,6 mm), caída 75,83 mm; motor → A2 y motor → A3 con dos **355-5M-09**; A2 → A1 y A3 → A4 con **445-5M-09**; el grupo B replica la geometría en el costado opuesto del bastidor. Cuerpo comercial de referencia del motor: **57 × 57 × 102 mm; eje 8 mm**. Importante de montaje: el eje de motor necesita **dos poleas 28T adyacentes o una polea doble con dos pistas independientes**; en los ejes centrales deben separarse axialmente las pistas de entrada y salida; no superponer dos correas en una misma pista. Opción: tres planos axiales en el lado A (plano 1 motor→A2, plano 2 A2→A1, plano 3 A3→A4 / motor→A3), o dividir la transmisión a ambos costados del bastidor.

Sección 7 — Verificación preliminar de capacidad de correa: catálogo Gates HTD 5M, a 600 rpm y polea de 28 dientes: **potencia base 334 W para ancho 9 mm**; factores de longitud **0,8 para correas ≤440 mm** y **0,9 para 441–550 mm** → **P_cap,355 = 334 × 0,8 = 267 W**; **P_cap,445 = 334 × 0,9 = 301 W**. Caso límite mecánico (par de retención 3,0 Nm como si estuviera disponible a 573 rpm): **P = T·ω = 3,0 × 60,00 = 180 W**; fuerza tangencial sobre r = 22,28 mm: **F_t = T/r = 135 N**. En operación real un stepper de 3 Nm no conserva el par de retención a ~600 rpm. Decisión: HTD 5M de 9 mm adecuada como base; subir a **15 mm** si caja pesada, inversiones agresivas o cambio a servo/NEMA 34. Fuente: Gates Industrial Timing Belt Design Manual, tabla 5M.

Sección 8 — Eje, rodamientos y adaptador (Figura 6, detalle axial conceptual): segmentos en orden: rosca/retención 15 mm (Ø12) → asiento rodamiento Ø12, 8 mm → hombro 4 mm (Ø14) → hex 1/2 in AF 110 mm (12,7) → adaptador 12,7→14 hex 12 mm (Ø18) → rueda Omni 50 × 27,5 → espaciador PVC 25 mm (Ø20); rodamiento 6001-2RS 12x28x8 sobre el asiento; "mecanizado sólo en extremos para Ø12 mm"; "No se fija longitud total de eje: depende del ancho de bastidor y apoyos fuera de los 21 in útiles". Velocidad límite del 6001-2RS "muy superior" a 573 rpm. Rodamiento local: RS PRO 6001-2RS/C3. Rueda: referencia comercial Ø50 con hexágono 14 mm que ofrece adaptador directo a 1/2 in hex (AndyMark 2 in Dualie Omni; Omnia/Rotacaster 50 mm) — valida la interfaz geométrica pero **no debe asumirse que la rueda china final tenga el mismo ancho o forma**.

Sección 9 — Motor NEMA 23 y soporte: referencia de compra en Chile: kit NEMA 23 de **3,0 Nm con driver DM556, brida 57 × 57 mm, cuerpo 102 mm, eje Ø8 mm × 21 mm**. Polea motriz con agujero terminado Ø8 y fijación positiva. Figura 7: envolventes radiales del extremo: rueda Ø50, rodamiento Ø28, polea con brida Ø48. Advertencia: NEMA 23 define la brida, no garantiza potencia a velocidad; obtener la curva torque-rpm a tensión y driver reales; a 573 rpm inductancia, tensión del bus y microstepping afectan fuertemente el par.

Sección 10 — BOM funcional:

| Ítem | Descripción | Cantidad sistema | Referencia |
|---|---|---|---|
| M1-M2 | NEMA 23, eje Ø8, ~3 Nm + driver DM556 | 2 | MercadoLibre Chile |
| P | Polea HTD 5M, 28T, para correa 9 mm, brida Ø48 | mín. 12* | 28-5M-09 (beltingonline) |
| B355 | Correa 355-5M-09, 71 dientes | 4 | bbman |
| B445 | Correa 445-5M-09, 89 dientes | 4 | bbman |
| BRG | 6001-2RS, 12x28x8 | 16 | RS Chile |
| AX | Barra hexagonal trefilada 1/2 in AF | 8 | Compra local / mecanizado extremos |
| OMNI | Omniwheel Ø50, rodillos ±45°, hex 14 | 48 | Proveedor China definitivo |
| ADP | Adaptador hex 14 → hex 1/2 in | 48 | Comercial o mecanizado |
| SP | Separadores PVC | según layout | Corte a medida |

*La cantidad de poleas depende de la solución final de planos axiales (dos pistas en el motor y una o dos por eje central); congelar en CAD 3D antes de comprar.

Sección 11 — Criterios de fabricación y liberación: alineación de poleas; tensión (ranuras; no sobrecargar 6001 ni eje NEMA); guardas; tolerancia asiento Ø12; tolerancia AF real de barra hex 1/2 y juego del adaptador; rueda china: medir ancho real, hexágono, capacidad de carga, dureza de roller y sentido L/R; motor: validar curva T-n a 573 rpm, tensión de bus, corriente, driver y aceleración; caja: falta masa máxima y coeficiente de fricción; FAT: ensayar velocidades A/B, inversión, diagonales, carga máxima, temperatura y pérdida de pasos. Estado: transmisión geométrica y familia de componentes definidas para prototipo; motor definitivo y validación de vida/carga requieren masa de caja, aceleración y ciclo de trabajo.

Sección 12 — Fuentes (URLs; ver §5).

**Mensaje final A2:** "Listo. Preparé una memoria de cálculo de 13 páginas, con geometría calculada y dibujos técnicos vectoriales; no usé generación de imágenes." Incluye: 8 ejes, cinemática ±45°, 572,96 rpm, HTD 5M, poleas 28T, correas 355-5M-09 y 445-5M-09, NEMA 23 a **75,83 mm** bajo la línea de ejes, verificación de capacidad de correas, eje hexagonal 1/2", 6001-2RS, adaptador 14 mm → 1/2", ambos ramales, BOM y enlaces. **Corrección respecto a la conversación anterior:** "la polea 28T tiene **Ø primitivo 44,56 mm, Ø exterior dentado 43,42 mm y Ø máximo de brida 48 mm**, por lo que sí queda dentro de tu límite de Ø50 mm" (cita catálogo Challenge PT). PDF: `sandbox:/mnt/data/Omniwheel_Memoria_Calculo_Transmision.pdf`. Vistas "vectoriales y proporcionales, no renders inventados". Queda sin congelar el dimensionamiento dinámico del NEMA 23 (faltan masa máxima de caja, aceleración deseada y ciclo de trabajo).

### A3 — Memoria REV B: 4 ruedas/eje, 400 mm, cargas, polea exterior (responde a U3)

**Pasos intermedios visibles:**
- "Con esos nuevos datos cambia bastante el dimensionamiento dinámico y también mejora la arquitectura mecánica. Voy a recalcular con **4 OmniWheels por eje**, cajas de **5 kg / 2,5 kg / 0,5 kg**, ancho activo de **400 mm**, y voy a evaluar específicamente la alternativa de llevar la polea **por fuera del rodamiento**, en la zona muerta lateral, porque mecánicamente puede ser una solución mejor."
- "Estoy estimando la carga por eje, la fuerza de aceleración y la resistencia al rodamiento para separar el torque gravitacional del torque de accionamiento. Me faltan aceleración, coeficiente de fricción y distribución exacta de motores, así que presentaré supuestos explícitos."
- Cálculo rpm/ω: `(572.9577951308232, 60.0)`.
- Búsquedas: "Chile polea HTD 5M 28 dientes 8 mm"; "Chile correa HTD 5M 355 9 mm"; "Chile correa HTD 5M 445 9 mm"; "Chile rodamiento 6001 2RS 12 mm"; `site:cl.rsdelivers.com HTD 5M timing belt 9mm 445`; `site:cl.rsdelivers.com HTD 5M pulley 28 teeth`; `site:mercadolibre.cl polea HTD 5M 28 dientes`; `site:mercadolibre.cl correa HTD 5M 445 9mm`.
- "Estoy optando por rehacer el documento desde cero y mantenerlo conciso. Incluiré vistas superior, lateral y frontal, un módulo de 400 mm, ocho ejes separados 76,2 mm y poleas externas junto a los rodamientos para conservar el ancho útil."
- "Estoy calculando la inercia de ejes y ruedas para confirmar que el torque dinámico sea pequeño. También estoy revisando la carga radial de las correas y el esfuerzo del extremo del eje; ambos parecen moderados con diámetros y rodamientos adecuados."
- "La opción de **polea por fuera del rodamiento** sale favorable. Con la polea inmediatamente adyacente al 6001-2RS, la carga de correa queda en un voladizo muy corto; a cambio, liberas completamente los 400 mm útiles para las cuatro OmniWheels, mejoras acceso a correas y puedes poner una guarda lateral independiente. En la revisión la dejaré como **arquitectura preferida**, con la condición de mantener la polea lo más cerca posible del rodamiento."

**Contenido de la memoria REV B (`Omniwheel_Memoria_Calculo_Transmision_REV_B.pdf`; script reportlab con tres dibujos vectoriales `top_revB`, `side_revB`, `end_revB`):**

Título: "MEMORIA DE CÁLCULO - TRANSMISIÓN OMNIWHEEL — Revisión B - 4 OmniWheels por eje, ancho activo 400 mm, evaluación de polea exterior al rodamiento". Objeto: módulo de desviación con 8 ejes a pitch 3 in, familias alternadas ±45°, dos NEMA 23, HTD 5M. Alcance: reemplaza 6 OmniWheels/eje por 4 y agrega los tres formatos de carga; el torque final del motor sigue sujeto a la curva del NEMA 23 elegido.

Tabla de parámetros:

| Parámetro | Valor de diseño |
|---|---|
| Ancho activo del cuerpo | 400 mm |
| Ancho total posterior | 21 in = 533,4 mm (relleno lateral fuera del cuerpo activo) |
| Nº ejes | 8 |
| Pitch entre ejes | 76,2 mm (3 in) |
| Separación ejes de igual familia | 152,4 mm (6 in) |
| OmniWheels por eje | 4 |
| Diámetro OmniWheel | 50 mm |
| Velocidad tangencial objetivo | 1,5 m/s |
| Eje | Hexagonal 1/2 in AF = 12,7 mm, extremos torneados Ø12 mm |
| Rodamiento | 6001-2RS, 12 x 28 x 8 mm |

Sección 1 — Cargas y cajas:

| Caso | Huella aproximada | Masa | Ejes simultáneamente bajo la caja* |
|---|---|---|---|
| A - caja grande | 500 x 300 mm | 5,0 kg | 6-7 |
| B - caja chica | 300 x 250 mm | 2,5 kg | 4-5 |
| C - caja vacía grande | 500 x 300 mm | 0,5 kg | 6-7 |
| D - caja vacía chica | 300 x 250 mm | 0,5 kg | 4-5 |

*Valor geométrico con la caja plenamente contenida; para entrada/salida verificar transitorios con sólo 3-4 ejes en contacto. Caso conservador local: caja de 5 kg sobre sólo 4 ejes: **W = m·g = 5 · 9,81 = 49,05 N**; **carga por eje = 49,05/4 = 12,26 N**; **carga por OmniWheel = 12,26/4 = 3,07 N ≈ 0,313 kgf**. Por capacidad vertical, ni el eje de 1/2 in ni el 6001-2RS quedan exigidos; el criterio dominante pasa a rigidez/alineación, aceleración, tensión de correa y calidad de contacto rueda-caja. Figura 1 (vista superior 400 × 609,6 mm): 8 ejes desde x = (609,6 − 7·76,2)/2 = 38,1 mm a paso 76,2; **centros de ruedas a 50 / 150 / 250 / 350 mm** (distribución base); familias alternadas ±45°; caja 500 × 300 / 5 kg centrada.

Sección 2 — Cinemática y transmisión: **n = 60·v/(π·D) = 60·1,5/(π·0,05) = 572,96 rpm**; **ω = v/r = 1,5/0,025 = 60 rad/s**; transmisión 1:1; HTD 5M, 28 dientes, 9 mm.

| Elemento | Selección |
|---|---|
| Poleas motor y ejes | HTD 5M - 28T |
| Diámetro primitivo | 44,56 mm |
| Diámetro máximo de brida de referencia | ≈48 mm (<50 mm) |
| Motor → primer par simétrico | 355-5M-09 |
| Eje → eje mismo grupo | 445-5M-09 |
| Relación | 1:1 |

Figura 2 (vista lateral): ejes A1 y A2 a 152,4 mm; polea motor (NEMA 23 / 28T) en x = 76,2, y = −75,83; radio primitivo 44,56/2; "Correa motor → eje: 355-5M; poleas 28T/28T. Entrecentro geométrico ≈107,50 mm."; "Entre ejes del mismo grupo: 28T/28T + 445-5M; entrecentro ≈152,50 mm (ajustar con ranura/tensor)."

Sección 3 — Fuerza y torque por grupo (sensibilidad): resistencia equivalente conservadora **μr = 0,03**; las dos familias ±45° comparten el esfuerzo longitudinal. **F_req = m·a + μr·m·g**; cada familia aporta componente longitudinal cos45° → **F_grupo = F_req/(2·cos45°) = F_req/√2**; **T_caja = F_grupo · r**, r = 0,025 m. Con m = 5 kg:

| Aceleración caja | Tiempo ideal 0→1,5 m/s | F requerida 5 kg | Torque contacto / grupo |
|---|---|---|---|
| 0,5 m/s² | 3,00 s | 3,97 N | 0,070 N·m |
| 1,0 m/s² | 1,50 s | 6,47 N | 0,114 N·m |
| 2,0 m/s² | 0,75 s | 11,47 N | 0,203 N·m |
| 3,0 m/s² | 0,50 s | 16,47 N | 0,291 N·m |

"A 2 m/s², el torque requerido para acelerar la caja es sólo ~0,203 N·m por motor. Deben agregarse inercia de 4 ejes, pérdidas y margen de control." Inercia: con 4 ruedas/eje y 4 ejes por motor, usando **0,10 kg por OmniWheel** como sensibilidad, la contribución rotacional resulta **0,04–0,06 N·m** para a = 2 m/s²; aun duplicando la masa sigue siendo secundaria. **Recomendación:** NEMA 23 que entregue **al menos 0,6 N·m continuos a ~573 rpm**, preferiblemente **0,8 N·m o más**; no seleccionar por holding torque; si la curva real cae bajo ese valor, aumentar tensión de alimentación/driver compatible o migrar a servo/BLDC.

Sección 4 — Polea por fuera del rodamiento (Figura 3, vista frontal/axial): resultado: **preferible para el prototipo**; no ocupa ancho útil, correas accesibles, guarda lateral desmontable; condición: plano medio de la polea muy próximo al rodamiento. Con carga radial de correa **≈100 N** y voladizo **15 mm** → **M ≈ 1,5 N·m**; extremo torneado Ø12: **σ = 32M/(π·d³) ≈ 8,8 MPa**; con 200 N → **≈17,7 MPa**, "muy por debajo de la capacidad típica de un acero trefilado"; no sustituye verificación de fatiga ni concentraciones de tensión del hombro. 6001-2RS (RS Chile): 12 int / 28 ext / 8 ancho; **versión C3 declara 5,4 kN de carga dinámica básica**. Dibujo: 4 ruedas dibujadas con 20 mm de espesor axial y Ø50 dentro de los 400 mm; placa lateral 8 mm; rodamiento Ø28; eje Ø12 torneado; polea 28T HTD-5M ancho 9 mm, Ø brida máx ≈48 mm, a **3-5 mm** de la placa. "Recomendación: mantener la polea inmediatamente fuera del rodamiento; no desplazarla varios centímetros hacia afuera."

Sección 5 — Arquitectura axial propuesta:

| Zona | Configuración propuesta |
|---|---|
| Ancho activo 400 mm | 4 OmniWheels; centros iniciales 50 / 150 / 250 / 350 mm |
| Soporte lateral | Placa con alojamiento de 6001-2RS |
| Extremo del eje | Hexagonal 1/2 in en zona útil; transición torneada Ø12 mm para rodamiento |
| Exterior rodamiento | Separador 3-5 mm + polea HTD 5M 28T |
| Fijación polea | Preferir cubo de apriete o adaptación hexagonal dedicada; evitar depender sólo de prisionero |
| Protección | Guarda lateral desmontable sobre poleas/correas |
| Relleno hasta 21 in | Módulo pasivo posterior; no necesita formar parte de la transmisión activa |

Toda la transmisión concentrada en un lateral del cuerpo de 400 mm; los **133,4 mm restantes** hasta 21 in como transición/mesa muerta o rodillos pasivos. Para caja de 300 mm de ancho, 4 ruedas sobre 400 mm dejan margen lateral; separación de 100 mm entre centros es buen punto inicial, a revisar contra geometría real de la rueda china y rigidez del fondo de cada caja.

Sección 6 — Componentes y enlaces: Rodamiento 6001-2RS 12x28x8 (RS Chile, URL 6190121); alternativa NSK 6001-2RS (Rudolfbike Chile); correa HTD 5M (MercadoLibre Chile MLC-1927382825, referencia de disponibilidad); polea HTD 5M: "buscar/solicitar específicamente 28T, ancho 9 o 15 mm, bore Ø8 para motor y cubo especial para eje 1/2 in hex"; correa entre ejes 445-5M-09 (si no está local, pedir por longitud/paso a casa de transmisión industrial); correa motor 355-5M-09 (motor en ranuras). Nota: confirmar stock exacto de 28T y longitudes 355/445 en Chile antes de comprar; **evitar sustituir 28T por 30T si la brida supera Ø50 mm**.

Sección 7 — Condiciones de borde y puntos a congelar en CAD:

| Ítem | Condición |
|---|---|
| Ejes | 8 ejes a 76,2 mm; familias alternadas A/B; 4 ejes por motor |
| Ancho activo | 400 mm |
| Ruedas | 4 por eje, Ø50 mm, rodillos ±45° |
| Caja crítica | 5 kg, 500 x 300 mm |
| Velocidad | 1,5 m/s; 572,96 rpm en eje |
| Transmisión | HTD 5M 28T/28T, 1:1 |
| Poleas de ejes | Fuera del rodamiento, lado transmisión |
| Rodamiento | 6001-2RS; asiento Ø12 mm |
| Motor | NEMA 23 eje Ø8 mm; validar ≥0,6 N·m a 573 rpm en curva real |
| Tensión | Ranuras de motor y/o tensor; no fijar centros sin capacidad de ajuste |
| Seguridad | Guarda completa lateral sobre correas y poleas |

Conclusión: reducir de 6 a 4 OmniWheels por eje no genera problema de carga; la arquitectura con poleas exteriores es mecánicamente más limpia y libera el ancho útil; el cuello de botella es la selección del motor a alta rpm, la calidad de la aceleración y la tensión/guarda de correas. Para pasar a plano de fabricación faltan del proveedor: **ancho axial real de la OmniWheel, geometría exacta del cubo hexagonal de 14 mm, masa/inercia real de cada rueda**.

**Mensaje final A3:** "Actualicé la memoria con tus nuevos datos y rearmé el análisis mecánico." REV B considera 4 OmniWheels/eje, cuerpo activo 400 mm, cajas 5 / 2,5 / 0,5 kg, huellas 500×300 y 300×250 mm, transmisión por fuera del rodamiento como opción preferente. Caja de 5 kg sobre 4 ejes → **3,07 N (~0,31 kgf)** por OmniWheel. Problema de diseño: aceleración, sincronismo, tensión de correas y torque del NEMA 23 a ~573 rpm. Con **2 m/s²** el torque directo es **≈0,203 N·m por grupo/motor**; sumando inercia, pérdidas y margen: NEMA 23 con **mínimo ~0,6 N·m a 573 rpm, idealmente 0,8 N·m o más**; no por holding torque. Polea exterior: libera los 400 mm, cuatro ruedas dentro de la zona activa, simplifica mantenimiento y protección; con 100 N de carga radial y 15 mm de voladizo, flexión nominal en Ø12 ≈ **8,8 MPa**; 6001-2RS 12×28×8; RS Chile versión C3 con **5,4 kN** de capacidad dinámica. Vistas técnicas superior, lateral y axial sin generación de imágenes. PDF: `sandbox:/mnt/data/Omniwheel_Memoria_Calculo_Transmision_REV_B.pdf`. Distribución base de ruedas **50 / 150 / 250 / 350 mm**; afinar cuando se tenga el **ancho axial real de la OmniWheel china** para cerrar eje completo, separadores PVC, hombros, rodamiento, polea exterior y longitud total de mecanizado.

### A4 — Entrega en ZIP (responde a U4)

Comando: `cd /mnt/data && zip -j Omniwheel_Memoria_Calculo_REV_B.zip Omniwheel_Memoria_Calculo_Transmision_REV_B.pdf`. Respuesta: "Claro. Aquí está comprimido en ZIP: [Descargar ZIP — Memoria Omniwheel REV B](sandbox:/mnt/data/Omniwheel_Memoria_Calculo_REV_B.zip)". Sin cambios de diseño.

---

## 3. Estado final del diseño (al cierre de la conversación, REV B)

**Geometría del módulo**
- Módulo de desviación con **8 ejes** paralelos, pitch **76,2 mm (3 in)**; longitud útil dibujada **609,6 mm (24 in)**; primer eje a 38,1 mm del borde (ejes en 38,1 + i·76,2).
- Dos familias de ejes alternadas **A (rodillos +45°) / B (−45°)**; ejes de la misma familia separados **152,4 mm (6 in)**; **4 ejes por motor**, 2 motores NEMA 23 independientes (uno por familia).
- **Ancho activo 400 mm** (U3: "40 o 35 cm" → fijado 400); ancho total posterior **21 in = 533,4 mm** con **133,4 mm** de relleno pasivo (mesa muerta o rodillos pasivos) fuera del cuerpo activo. Toda la transmisión concentrada en un lateral del cuerpo de 400 mm.

**Ruedas**
- **4 OmniWheels por eje**, Ø50 mm, rodillos ±45°, cubo hexagonal 14 mm (rueda china comercial, sin modelo definido). Centros a **50 / 150 / 250 / 350 mm** dentro de los 400 mm (paso 100 mm, distribución base a afinar). Separadores PVC entre ruedas. Total 32 ruedas (REV A tenía 48 en BOM con 6/eje; REV B no reemitió BOM).
- Adaptador hex 14 mm → hex 1/2 in por rueda.

**Ejes y apoyos**
- Barra hexagonal trefilada **1/2 in AF = 12,7 mm**; extremos cilindrados a **Ø12 mm** para rodamiento **6001-2RS (12×28×8 mm)**; versión C3 con C dinámica 5,4 kN (RS Chile). Placa lateral con alojamiento del rodamiento. Longitud total de eje **no fijada**.
- Detalle axial conceptual REV A (por extremo): rosca/retención 15 mm → asiento Ø12 × 8 mm → hombro 4 mm (Ø14) → hex 12,7 → adaptador 12,7→14 hex (12 mm, Ø18) → rueda → PVC (25 mm dibujado).

**Transmisión**
- **HTD 5M, poleas 28T/28T, relación 1:1, ancho de correa 9 mm** (15 mm como opción de robustez). Polea 28T: **Dp 44,56 mm, De 43,42 mm, Ø brida 48 mm (< 50 mm)**; envolvente comercial de referencia L = 22,5 mm, cara 14,5 mm, bore máx. catálogo 18 mm. Nunca 30T (brida ≈51 mm).
- Motor → dos ejes centrales de su familia: motor centrado entre ambos (76,2 mm horizontal a cada eje), **caída vertical 75,83 mm** bajo la línea de ejes, dos correas **355-5M-09 (71 dientes)** simétricas, entrecentro **107,50 mm**. Eje motor requiere **dos poleas 28T adyacentes o polea doble** (dos pistas independientes). Soporte del motor con ranuras ≥5 mm de ajuste total (A1 sugería ±5–10 mm).
- Eje → eje de la misma familia: **445-5M-09 (89 dientes)**, entrecentro calculado **152,50 mm** (error +0,10 mm vs 152,4), ajuste ±2 mm por ranuras/tensor.
- Arquitectura por familia (REV A, mantenida en REV B): motor → A2 y A3 con 355; A2 → A1 y A3 → A4 con 445; pistas de entrada y salida separadas axialmente en los ejes centrales; posible esquema de tres planos axiales.
- **Posición de poleas de eje: por fuera del rodamiento**, en la zona muerta lateral, con separador 3–5 mm respecto a la placa, plano medio lo más cerca posible del rodamiento (voladizo ≈15 mm considerado). Fijación por cubo de apriete o alojamiento hexagonal dedicado, no sólo prisionero. Polea motor: bore Ø8 H7 con fijación positiva (clamping hub). Guarda lateral desmontable sobre poleas y correas.
- Capacidad de correa (Gates 5M, 28T, 600 rpm, 9 mm): base 334 W → 267 W (355) / 301 W (445); demanda caso límite 180 W (3 Nm × 60 rad/s), F_t ≈ 135 N.

**Cinemática y cargas**
- v = 1,5 m/s → **n = 572,96 rpm ≈ 573 rpm; ω = 60 rad/s** en ejes y motor (1:1).
- Cajas: A 500×300 mm / 5,0 kg; B 300×250 mm / 2,5 kg; C 500×300 / 0,5 kg; D 300×250 / 0,5 kg. Ejes bajo caja: 6–7 (grande), 4–5 (chica); transitorios con 3–4 ejes.
- Carga estática caso conservador (5 kg sobre 4 ejes): 49,05 N → 12,26 N/eje → 3,07 N (0,313 kgf) por rueda.
- Torque de contacto por grupo con μr = 0,03 y reparto 1/√2: 0,070 / 0,114 / 0,203 / 0,291 N·m para 0,5 / 1 / 2 / 3 m/s². Inercia rotacional (0,10 kg/rueda, 16 ruedas por motor): 0,04–0,06 N·m a 2 m/s².
- **Motor:** NEMA 23, eje Ø8 mm (×21 mm en referencia), brida 57×57, cuerpo ~102 mm; referencia comercial 3,0 Nm + driver DM556. Requisito: **≥0,6 N·m continuos a 573 rpm en curva real, ideal ≥0,8 N·m**; si no, subir tensión de bus/driver o pasar a servo/BLDC. Modelo concreto **no seleccionado**.
- Esfuerzo de flexión en el extremo Ø12 con polea exterior: 8,8 MPa (100 N, 15 mm) / 17,7 MPa (200 N).

**Explícitamente abierto al final**
- Modelo concreto del NEMA 23 y su curva torque-rpm a tensión/driver reales; aceleración objetivo y ciclo de trabajo.
- Ancho axial real, geometría del cubo hex 14 mm, masa/inercia, dureza de roller y sentido L/R de la OmniWheel china → cierre de eje completo (separadores, hombros, longitud de mecanizado) y de la cota 50/150/250/350.
- Ancho final de correa 9 vs 15 mm; cantidad exacta de poleas (planos axiales) a congelar en CAD 3D.
- Stock real en Chile de poleas 28T (bore Ø8 y cubo hex 1/2 in) y correas 355/445-5M-09.
- Verificación de fatiga/concentración de tensiones del hombro Ø12; tolerancias de asiento Ø12 y AF del hexágono; rigidez del bastidor; coeficiente de fricción real rueda-caja.
- Diseño del relleno hasta 21 in (etapa posterior).

---

## 4. Cambios de rumbo y contradicciones

| # | Tema | Antes | Después | Turnos |
|---|---|---|---|---|
| 1 | OmniWheels por eje | 6 por eje (U1; A1 "seis Omniwheels"; REV A: 6/eje, 48 ruedas en BOM) | **4 por eje** | U3 → A3 (REV B) |
| 2 | Ancho del cuerpo | REV A: 21 in = 533,4 mm de "ancho útil" con 6 ruedas repartidas entre 25 y 508,4 mm | **400 mm activos** con 4 ruedas a 50/150/250/350; 21 in pasa a ser ancho total con 133,4 mm de relleno pasivo | A2 → U3/A3 |
| 3 | Ø exterior de la polea 28T | A1: "Ø exterior comercial aprox. 48 mm" | A2: **Ø exterior dentado 43,42 mm; Ø brida 48 mm**; Dp 44,56 (corrección explícita "respecto a nuestra conversación anterior") | A1 → A2 |
| 4 | Caída vertical del motor | A1: valor de ejemplo 75 mm → C = 106,9 mm → L ≈ 354 → 355-5M | A2/A3: derivada de la correa 355-5M: C = 107,50 mm → **h = 75,83 mm** (cota de diseño) | A1 → A2 |
| 5 | Distancia horizontal motor→eje | U1: "distancia horizontal de 6 pulgadas" (152,4 mm) a cada eje; A1 tabuló esa opción (460/480/505-5M) | A1 propuso y A2/A3 adoptaron motor **centrado** entre los dos ejes: **76,2 mm** a cada lado | U1 → A1 → A2 |
| 6 | Ubicación de las poleas de eje | A1/A2: poleas sobre el hexágono, dentro del rodamiento (`[OMNI][PVC][OMNI]──[HTD A][HTD B]──rodamiento`) | U3 sugiere fuera del rodamiento; A3 lo adopta como **arquitectura preferida** | A1/A2 → U3 → A3 |
| 7 | Especificación de torque del motor | A1/A2: referencia 3,0 Nm; "no se puede cerrar"; caso límite 180 W / 135 N | A3: requisito **≥0,6 N·m a 573 rpm (ideal ≥0,8)** basado en sensibilidad de aceleración | A2 → A3 |
| 8 | Ancho activo dicho por el usuario | U3: "40 o 35 centímetros" | Asistente fija **400 mm** sin discutir la alternativa de 350 | U3 → A3 |
| 9 | Espesor axial de rueda en dibujos | REV A: envolvente 50 × 27,5 mm (referencia comercial AndyMark/Omnia) | REV B: dibujada con 20 mm de espesor axial (sólo representación) — ambos son placeholders | A2 → A3 |
| 10 | Número de ejes / largo del módulo | U1 no fija número de ejes ni longitud; A1: "repetir módulos cada 6"" | A2 introduce **8 ejes, 24 in útiles** (609,6 mm) sin que el usuario lo indique en este chat; REV B lo mantiene | A1 → A2 |
| 11 | Poly-V vs sincrónica | U1 abierto a Poly-V "lo más común en Chile" | A1 descarta Poly-V para el prototipo; HTD 5M en todo | U1 → A1 |
| 12 | Control | U1: grupos ON/OFF/adelante/atrás | A1/A2: ω_A y ω_B continuas, rampas S/trapezoidales, calibración experimental | U1 → A1/A2 |
| 13 | Ajuste de tensión motor | A1: ranuras ±5–10 mm | A2: "al menos 5 mm de ajuste total" | A1 → A2 |

Inconsistencia menor no corregida: REV B, tabla de cajas, dice caja chica "300 x 250 mm" y el usuario "250 mm de ancho por 30 cm de largo" (mismas dimensiones, orden invertido; coherente). REV B cita "Caja crítica 5 kg, 500 x 300 mm" combinando "5 kg, 500 mm de largo" y "30 cm de ancho máximo" de U3.

---

## 5. Supuestos no verificados y fuentes citadas

### Supuestos/valores afirmados sin fuente verificable en el chat
- Cinemática base (573 rpm, ω = 60 rad/s, Dp = 140/π = 44,56 mm, C = (L − πDp)/2, h = 75,83 mm): cálculo propio, verificable.
- Polea 30T HTD 5M "puede llegar a Ø exterior ≈51 mm" (A1, cita genérica a catálogo).
- Polea 28-5M-09: De 43,42 / Df 48,0 / L 22,5 / cara 14,5 / bore máx. 18 mm — atribuido a catálogo comercial (beltingonline, Challenge PT, Maedler); los resultados capturados muestran Maedler 28T 25 mm ancho OD 43,42 mm, pero el Df 48 no aparece verificado textualmente.
- Capacidad Gates HTD 5M: 334 W base (28T, 600 rpm, 9 mm); factores de longitud 0,8 (≤440 mm) y 0,9 (441–550 mm) — atribuido al "Gates Industrial Timing Belt Design Manual 2009 (KR)"; no se ve el extracto.
- Referencia motor "NEMA 23 3,0 Nm, 57×57×102 mm, eje Ø8×21 mm, kit con DM556 en MercadoLibre Chile" (dimensiones no verificadas en el texto; los listados capturados muestran 57×57×100 / 113 / 76 mm para 3,0 / 3,0 / 1,9 Nm).
- **μr = 0,03** (resistencia equivalente al rodamiento/contacto), elegido "conservador".
- Reparto de esfuerzo longitudinal entre familias: F_grupo = F_req/√2 (supone ambas familias traccionando con cos45°).
- **0,10 kg por OmniWheel** (sensibilidad) y contribución inercial 0,04–0,06 N·m a 2 m/s² (no se muestra el cálculo).
- Requisito de motor ≥0,6 / 0,8 N·m a 573 rpm: margen de juicio, sin curva de motor.
- Carga radial de correa 100 N (y 200 N) y voladizo 15 mm; σ = 8,8 / 17,7 MPa; "capacidad típica de un acero trefilado".
- 6001-2RS/C3 "5,4 kN carga dinámica básica" (RS Chile), "velocidad límite muy superior a 573 rpm".
- Ejes simultáneamente bajo la caja: 6–7 / 4–5; transitorios 3–4.
- 8 ejes, 24 in de largo útil, 21 in de ancho: no provienen de U1/U2 (probablemente contexto previo/memoria del asistente; el usuario confirma sólo las 21 in en U3).
- Envolvente de rueda 50 × 27,5 mm (AndyMark 2 in Dualie / Omnia) y adaptador 14 hex → 1/2 in hex "ofrecido" por AndyMark.
- Perfil Poly-V PJ: paso 2,34 mm, espesor 3,5 mm (cita CP Goma).
- Afirmación del usuario (capa "user"): "Así lo hacen los chinos en los sistemas de Omniwheels que venden"; barra hexagonal 1/2" trefilada disponible en Chile; rueda china Ø50 con eje 14 mm.

### Fuentes/URLs citadas explícitamente por el asistente
- A1: GPR Industrial 445-5M-09 — `https://www.gprindustrial.com/es/correas-de-tiempo-tipo-5m/9923-445-5M-09-htd-timing-belt.html`; CP Goma Poly-V — `https://cpgoma.com/correa/poly-v.html`; Transmifuerza 4PK-710 — `https://transmifuerza.cl/producto/correa-poli-v-4pk-710/`; catálogo de poleas (rackcdn) — `https://15f8034cdff6595cbfa1-1dd67c28d3aade9d3442ee99310d18bd.ssl.cf3.rackcdn.com/67b8d390a0fa99e15e7bda60794153f6/Poleas.pdf`.
- A2 (sección 12 del PDF REV A): Gates HTD — `https://www.gates.com/es/es/power-transmission/synchronous-belts/rubber-synchronous-belts.p.9293-000000-000000.html`; Gates manual — `https://www.gates.com/content/dam/gates/home/knowledge-center/resource-library/catalogs/korea/industrial-timing-belt-design-manual-2009-kr.pdf`; Polea 28T — `https://www.beltingonline.com/product/28-5m-09f-pilot-bore-htd-pulley/`; Belt445 — `https://www.bbman.com/catalog/product/445-5m-09`; Belt355 — `https://www.bbman.com/catalog/product/355-5m-09`; Bearing RS — `https://cl.rsdelivers.com/product/rs-pro/6001-2rs/c3/rodamiento-de-bolas-6001-2rs/c3-rs-pro-de-acero-1-filas-%C3%B8-int-12-mm-diamint-%C3%B8-8/1883280`; Motor — `https://www.mercadolibre.cl/kit-motor-paso-a-paso-nema-23-30-nm--driver-cnc-router/up/MLCU23745692`; Omni — `https://www.andymark.com/products/2-in-dualie-omni-wheel`; Omnia — `https://www.rotacaster.com.au/shop-product/robotic-wheels/50mm-rotacaster-omni-wheels---select-roller-hardness-and-acetal-bearing--copy-rtgqyt-`; catálogo Challenge PT Pulleys — `https://en.challengept.com/amfile/file/download/file/4/product/24576/`.
- A3 (sección 6 del PDF REV B): RS Chile 6001-2RS — `https://cl.rsdelivers.com/product/rs-pro/6001-2rs/rodamiento-de-bolas-rodamiento-de-bolas-de-ranura/6190121`; NSK 6001-2RS Rudolfbike — `https://www.rudolfbike.cl/rodamientos/3149-rodamiento-sellado-nsk-6001-2rs.html`; correa HTD 5M MercadoLibre — `https://articulo.mercadolibre.cl/MLC-1927382825-correa-dentada-htd-5m-para-sistemas-de-automatizacion-_JM`.

---

## 6. Documentos, imágenes y archivos referenciados

| Referencia | Tipo | Contenido según la conversación |
|---|---|---|
| `Omniwheel_Memoria_Calculo_Transmision.pdf` (REV A) | PDF generado por A2, 13 páginas, A4 | Memoria completa: tabla resumen, 12 secciones (condiciones de borde, cinemática, selección HTD 5M/28T, eje-eje 445-5M, motor 355-5M con h = 75,83 mm, arquitectura de familia, capacidad de correa 334/267/301 W, eje/rodamiento/adaptador, motor NEMA 23, BOM, criterios de liberación, fuentes) y 7 figuras vectoriales (01_top_layout, 02_side_transmission, 03_triangle, 04_pulley, 05_shaft_adapter, 06_vectors, 07_end_view en `/mnt/data/omni_assets/*.svg`). Generado por `/mnt/data/create_omni_report.py`; renders de verificación en `/mnt/data/omni_render/page-*.png` y hoja de contacto `/mnt/data/omni_contact.png`. |
| `Omniwheel_Memoria_Calculo_Transmision_REV_B.pdf` (REV B) | PDF generado por A3 | Memoria rehecha: parámetros 400 mm / 4 ruedas / 8 ejes; cargas de cajas (3,07 N por rueda); cinemática 572,96 rpm; tabla de sensibilidad de aceleración (0,070–0,291 N·m); recomendación ≥0,6/0,8 N·m; evaluación de polea exterior (8,8 MPa); arquitectura axial; componentes y enlaces; condiciones a congelar en CAD. Figuras: `top_revB` (vista superior 400 × 609,6), `side_revB` (lateral HTD 5M), `end_revB` (frontal/axial polea fuera del rodamiento), generadas como PDF apaisado y convertidas a PNG a 120 dpi. |
| `Omniwheel_Memoria_Calculo_REV_B.zip` | ZIP generado por A4 | Contiene únicamente el PDF REV B. |
| `sediment://file_000000004d8c820e8ed716dd61029596` | Adjunto no identificado (probable imagen del usuario) junto a U3 | Contenido no recuperable de la extracción; el asistente no lo menciona explícitamente. |
| "Gates Industrial Timing Belt Design Manual KR 2009", "Powergrip Drive Design Manual", "PowerGrip GT3 / HTD", "HT200/HTD Synchronous Belt Drives", "6001 Y-Bearings", "Pulleys ENGLISH ISSUE 1 www.challengept.com" | Documentos abiertos por búsqueda durante A2 | Tablas de potencia 5M (334 W), dimensiones de polea 28T. |
| Catálogos capturados como resultados de búsqueda (Maedler, Optibelt, Contitech, Dayco, Carlisle, SKF TraceParts, Beltex, Hnfhxj, Octaforce, Aratron, "5M Pulley Outside Diameter Guide", Black Gold, tesis "Steveen Baltierrez 2019") | Resultados web | No discutidos en el texto de respuesta; ver anexo. |
| Diagramas ASCII en A1 | Texto | Secuencia A/B de ejes, NEMA centrado bajo A1–A2, esquema axial `[OMNI][PVC][OMNI]──[HTD A][HTD B]──rodamiento`. |

No hay canvases ni imágenes generadas por IA (el usuario lo prohibió en U2 y el asistente lo reiteró).

---

## Anexo — Referencias comerciales capturadas en los resultados de búsqueda (no discutidas en las respuestas, útiles para abastecimiento)

**Correas HTD 5M**
- 355-5M-09: 71 dientes, 355 mm, 9 mm, altura total 2,80 mm (GPR Industrial); MDS $4,99; D&D $2,31 (reg. $4,26); Gates A6R25M071090; PolyBelt; Diesel Belting; Zoro (D&D T71); Radwell/Megadyne/Jason. Variantes 355-5M-15 y 355-5M-25 (GPR, TBS, B&B, York 25 mm).
- 445-5M-09: 89 dientes, 445 mm, 9 mm, altura 2,80 mm (GPR Industrial, $10,00 GPR Belts); D&D $3,26; $2,90 (reg. $9,68); Gates A6R25M089090; Zoro; Walmart/eBay D&D Dura-Flex; SKF PHG 445-5M-9 (Rodavigo); Goodyear 445-5M-9 (Findchips/RS Allied). Variantes 445-5M-15, 445-5M-25.
- 450-5M-09 (£1,63 / £1,36 ex. IVA); Contitech 450 5M 9 (RS 475-0248), 450 5M 15 (RS 475-0355; Gates 359-7945), 475 5M 9 (RS 475-0254), 475 5M 15 (RS 475-0361), 550 5M 9 (RS 475-0282), 950 5M 15 (RS 475-0513), HTD 1125-5M-09 (RS 182-1274), 1595-5M-09 (RS 182-1279; ATTI 055248), 1690-5M-15 (RS 182-1285), 2525-5M-15 (RS 182-1287); Gates 425-5M-09 (85 dientes, MI #00742207); Rettigs 450-5M-15 $11,93; McMaster 450-R5M-15; Uxcell 355×15 mm ×3,6 mm (Lider); MercadoLibre Chile: correa HTD-5M automatización $7.428, 400×15 80T, 395×15, 355×25 71T, 295×25 59T.
- Fuerza de tracción admisible (Reichelt): 5M 208 N a 10 mm de ancho (3M 100 N; 8M 375 N).

**Poleas HTD 5M**
- 28T: Maedler PN 17222800 (acero, 9 mm) y 17242800 (acero, 25 mm; OD 43,42 mm); Belting Online 28-5M-09F £8,08 (£6,73 ex IVA), 28-5M-25F £12,11; BearingBoys 28-5M-09 (BB-21218); 28-5M-15F(PB) £13,45 (0,25 kg); 28-5M-25F(PB) £15,55 (0,35 kg); TYMA 28-5M-9 6F acero €3,39 (€4,10 IVA); ZRS-28-5M-15 EUR 17,67/14,13; Arrow 28-5M-25 £20,48; Haberkorn T22074 "28 5M 09/2F"; Gates 28-5M09-6FA3 (P28-5M-09AL, 78821023) y 28-5M15-6FA3 (P28-5M-15AL, 78821024); Grainger 816VD5 (28-5M-FA aluminio) y 816V82 (28-5M-PS8A, OD 1,709 in); York SAV-28-5M-15 × 1/4 (1,754 / 1,709 / 1,875 in); TBS 28-5M15-6A3 (1/4 in bore); polea 28T 16 mm ancho bore 19 mm chavetero 6×2,8; Rodavigo HD 28-5M 09.
- Otros dientes: Maedler 26T 17222600 / 17242600 (Dp 40,24, brida 44, De 41,38); 18T 17221800; SKF PHP 24-5M-09RSB (Dp 38,2, brida 42), PHP 26-5M-09RSB (Dp 41,38... ); tabla 12T: Dp 19,10 / De 17,96 / Df 23 / L 20 / d 6; RS PRO 18T 9 mm bore 6 (182-767), 32T 15 mm bore 8 (184-505), 36T 9 mm bore 8 (183-344), 48T alu 9 mm bore 8 (184-527), HTD 8X20X30 30T (183-293); TechGoZone 40T/50T acero €22,29–31,39; MercadoLibre Chile 20T $41.513, 50T $24.788, 30T bore 12, 32T, 48T; Optibelt 32-5M-15 (Dp 50,93 / De 49,79 / Df 54), 36-5M-15 (57,30/56,16/60), 40-5M-15 (63,66/62,52/71); productos: "Poleas HTD-5M 15-30 dientes para ejes de 8 mm a 19 mm" $15.274 (cnc.pe); "Polea dentada T5-14 eje 8 mm" $2.400 (Cimech 3D); Pnloog idler 5M 30T bore 8/10/12/15.

**Rodamientos 6001-2RS (12×28×8)**
- Chile: Motorline $2.990; PFI 6001-2RSC3 $5.990 (HP Plus); NSK $6.990 (Rudolfbike); MercadoLibre $6.600; Motosyrepuestos $2.030 (antes $2.900); rogeca $1.900 (500 disp.); RS PRO 6001-2RS (261-2582; 619-0121), 6001-2RS/C3 (188-3280); Takora; BC Bearing UBC; SKF 6001-2RS1 / 6001-2Z / 6001-2Z/C3 (₹144–175 India); Millasur 99-5504.

**Motores NEMA 23 / drivers**
- StepperOnline 23HS39-5004S 3,00 Nm 5,0 A 57×57×100; 23HS45-4204S1 3 Nm 4,2 A 8 mm 57×57×113; 23HS45-4204D-B200 3 Nm con freno 2 Nm; 23HS30-2804S2 1,9 Nm 2,8 A 57×57×76,5 Ø8; KL23H2100-42-4A 425 oz-in 8 mm; Spark Robotic 425 oz/in 8 mm; BESFOC BF57HSN30 lazo cerrado 3 N·m; Zaber NMS23; Cimech 3D (Ñuñoa, Santiago): 57HS112-3004 2,9 N·m 3,0 A; 57HS86-3004 2,45 N·m 3 A $22.500 (antes $45.000); 57HS76-3004 1,9 N·m 3 A $17.500 (antes $35.000); 23HD5241Z-21B-145 1,26 N·m 2,8 A; lazo cerrado integrado 3 N·m 4,0 A 36 V $199.990; kit lazo cerrado 2 N·m + driver $80.000 (antes $160.000); driver DM556 5,6 A $33.990; fuente Meanwell 12 V 10 A $18.000; RM Partes kit NEMA 23 2 Nm 220 V; MercadoLibre Chile: Ok57h18112a 4,2 A 3 Nm + DM860h; 2,4 Nm (340 oz) 4,0 A Ø8; kit 23hs5628 lazo cerrado; kit StepperOnline DM542T; kit 3,0 Nm + driver (MLCU23745692); DM556 varios; RS PRO steppers 180-5282, 535-0401 (0,44 Nm, 0,9°), 535-0502 (1,26 Nm, 0,9°).

**Ruedas omnidireccionales**
- AndyMark 2 in Dualie Omni: 14 mm hex (am-3902, $14,39 RobotShop), 1/2 in hex 35A (am-3951_green), $7,60–8,25 (antes $15,20–16,50), 35A/90A; Studica 2" omni 35A 1/2 in hex $23,00; Rotacaster/Omnia 50 mm R2 (bore 8 mm acero, acetal, 60A; 90 mm $39,85 AUD); ZOTY ZOTYLR-65 (65 mm mecanum para transportador); Huzhou Longwei; Sinbo (nylon roller, MOQ 10–20); 4×50 mm omni + TT motor.

**Poly-V (Chile)**: Transmifuerza 3PK-550 $3.310; 4PK-710/780 $5.783/785 $5.869/835 $6.214/855 $6.387/885 $6.560/890 $6.646/915 $6.818; 5PK-865 $7.662; 5PK-1335 $15.328; 5PK-1645 $18.848; 6PK-915 $13.088; 6PK-1055 $14.688; 6PK-2170 $28.768; 10PK-1370 $30.688; 10PK-1610 $38.368. CP Goma: PJ/PK/PL, HTD/STD/RPP (1090 medidas), guía de selección ("¿sincronización exacta? → HTD").
