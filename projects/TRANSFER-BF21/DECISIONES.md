# TRANSFER-BF21 — decisiones de diseño (capa `user`)

Módulo de transferencia bidireccional insertable en un transportador de
rodillos BF 21″. Sentido de AVANCE: hileras de ruedas omni Ø58 sobre ejes
hexagonales de 1/2″. Sentido de DESVÍO: las MISMAS omnis giradas 90° sobre
ejes hex cortos en los huecos entre ejes, movidas por o-rings desde un eje
común inferior. Dos motores Unidrive por módulo (uno por sentido). Caja
mínima 250×250 mm.

> **Revisión 2 (corrección del usuario).** La v1 leyó "en el otro sentido van
> con este sistema de correas" como correas planas DE TRANSPORTE en los
> huecos. El usuario corrigió mirando los renders: *"se ve una banda en un
> sentido; se supone son omnis girados 90 grados"* — en la foto de referencia
> el sentido cruzado lo hacen omnis giradas y las correas movidas "desde más
> abajo, eje común" son su TRANSMISIÓN. Se rediseñó el desvío completo;
> los casetes de correa, terminales Ø60, snub Ø50, colisas, tensores y camas
> deslizantes de la v1 quedaron eliminados.

> **Revisión 3 (corrección del usuario).** *"No puedes usar espacios que no
> están cubiertos por omnis desde vista superior. Compacta hacia abajo y la
> tapa es mejorable."* → (1) SIN bahía de motores: los dos UniDrive cuelgan
> BAJO el fondo del canal (hasta z=−160) en placas verticales con su patrón,
> atornilladas a bancadas de chapa que cruzan entre almas; el módulo se
> compacta a L=440. (2) El tren de o-rings del avance se mete DENTRO del
> campo: collares estrechos Ø36×9 en planos junto a las almas (x=18/427) que
> caben en la ventana de 13 entre columnas, y las hileras se extienden hasta
> ambas almas (22 ruedas de avance) — desaparecen la mampara, la pantalla y
> el soporte del motor A. (3) Tapa con ranuras ESTADIO uniformes 46×32 para
> ambas familias. El desvío gana la 5ª columna donde cabe (14 giradas:
> 5+4+5; se filtran los stubs cuya corona pisaría los planos de anillo).
> Reubicaciones cazadas por la verificación: la chumacera real del catálogo
> ocupa 55 a lo largo del eje, así que el anillo del motor B pasó al plano
> y=70 y el del motor A al x=100 (fuera del rango x 117–203 de la
> chumacera B).

Este documento registra CÓMO se leyó el pedido del usuario y qué se decidió
donde el texto admitía más de una lectura. Todo es parámetro del generador
(`pipeline/modulo_transfer.py`): cambiar una lectura = cambiar un argumento.

## Lecturas fijadas del pedido

| Texto del usuario | Lectura fijada | Parámetro |
|---|---|---|
| "eje hexagonal de 1/2mm" | 1/2 **pulgada** (12.7 entrecaras; el barreno 12.85 de RUEDA-OMNI-58 le da 0.15 de juego) | `--hex 12.7` |
| "canal de espesor 3mm y alto 6,5″" | canal plegado de chapa 3 mm, alma vertical de 6.5″ = 165.1 | `--espesor 3 --alto 165.1` |
| "1,4 de la pestaña superior sale tangente de omnis" | pestaña superior de **1.4″** y la tangente de las omnis RASANTE con su cara superior (la pestaña es el labio de transición del desvío) | `--pestana-sup 35.56 --resalte 0` |
| "pestañas de canal lateral apuntan hacia afuera y son de 1,5″" | pestaña inferior de **1.5″**, ambas hacia AFUERA (el canal abre hacia el exterior del módulo) | `--pestana-inf 38.1` |
| "módulo insertable en BF 21″" | el módulo ENTRA entre bastidores: ancho total (pestañas incluidas) = 533.4 − 2×3 de holgura = 527.4 | `--bf 533.4 --holgura-bf 3` |
| "en los espacios van con este sistema de correas" (rev. 2) | en los huecos van OMNIS GIRADAS 90° (4 por hueco sobre ejes hex cortos); las correas son o-rings de transmisión, no superficie | — |
| "dos motores por bloque" | motor A → todas las hileras omni (spool + o-rings, esquema ZP2026); motor B → eje común del desvío | — |
| "movido desde más abajo eje común" | eje de línea longitudinal bajo el módulo: un spool de 2 gargantas por hueco lanza 2 risers de o-ring a los stubs adyacentes; 2 cadenas stub-a-stub completan la serie | — |
| "soportes de ejes y tapa" | soportes = bloques porta-rodamiento atornillados al alma (avance) y bloques de doble FR8ZZ sobre travesaños (desvío); tapa = cubierta superior ranurada 3 mm bajo el plano de transporte | — |

Lectura ALTERNATIVA de "1,4": tangente 1.4″ POR ENCIMA de la pestaña. Se
descartó porque dejaría el eje omni 6.6 mm sobre el borde del alma (los ejes ya
no atraviesan el canal) y anula la pestaña como labio de transición. Si era esa,
es un solo parámetro: `--resalte 35.56`.

## Esquema de alturas (z desde el borde inferior del canal, mm) — COMO CONSTRUIDO

| Elemento | z |
|---|---|
| Plano de transporte (tangente de TODAS las omnis = cara sup. pestaña) | 165.1 |
| Ejes omni de avance Y ejes cortos del desvío (Ø58 ambos) | 136.1 |
| Tapa superior ranurada (3 mm, 2.1 bajo la tangente) | 160–163 |
| Poleas de desvío Ø30 y collares de avance Ø36 | 118–154 |
| Travesaños de desvío (chapa 3, pasan 2.1 bajo las coronas) | 78–105 |
| Eje común del desvío Ø20 (3 spools de 2 gargantas + spool motor B) | (160, 58) |
| Bancadas de motor (chapa 3 al ras del fondo, pestañas a las almas) | −3–0 |
| Motores UniDrive colgados (Ø118×62.7, ejes a z=−82; placas hasta −160) | bajo el fondo |

## Esquema en planta — COMO CONSTRUIDO

- Luz interior entre almas: 445.2. Ejes omni transversales (hex 12.7) sobre
  bloques con rodamiento FR8ZZ-HexHD contra cada alma (web_facts wf01–wf05).
- Paso entre ejes: 110 → hueco entre coronas Ø58 = 52: caben la rueda girada
  (24.1), su polea de 2 gargantas (12.8) y el aire verificado a las coronas.
- Ruedas de avance en tresbolillo a paso 74 con desfase 37 EXTENDIDO hasta
  ambas almas (v3): 6+5+6+5 = 22. Una caja de 250 apoya siempre en ≥4 ruedas
  de ≥2 hileras, y al desviar en ≥3 omnis giradas de ≥2 huecos (verificado
  por barrido en `modulo.json`).
- Tren de AVANCE dentro del campo (v3): collares Ø36×9 de una garganta en
  los planos x=18 y x=427 (ventanas de 13 entre columnas junto a las almas),
  anillos eje-a-eje alternando de alma (18, 427, 18) que cruzan los huecos a
  z≥116 — sobre los travesaños y lejos de las coronas giradas. El motor A
  entra por su propio collar en x=100 (ventana 85–135 del eje 4).
- DESVÍO (rev. 2): omnis giradas EN LAS COLUMNAS del tresbolillo de la
  hilera superior (huecos 1/3: x=73/147/221/295/369; hueco 2:
  110/184/258/332 — se filtran las columnas cuya corona pisaría los planos
  de anillo x=18/427). Así el bloque soporte (40 de ancho, doble FR8ZZ, en
  voladizo hacia la hilera inferior) cae centrado en la ventana libre de 50
  entre coronas de la misma paridad. El eje corto muere al ras de la polea
  (hueco+24.9): 1 mm más y tocaba la corona superior.
- Transmisión del desvío: spool de 2 gargantas por hueco en el eje común
  (planos hueco+15.5 / +21.5 — la única banda libre entre la rueda girada,
  ±12, y las coronas vecinas, ±26) → 2 risers a los stubs ADYACENTES a x=160
  (a un stub lejano el ramal cruzaría el disco de la polea intermedia:
  tangente calculada) → cadenas en serie hacia afuera con gargantas
  alternadas para que los lazos coplanares solo compartan x sobre el
  arrollado bajo del spool (holgura medida 25.9).
- Travesaños de chapa 3 (z 78–105) entre ambas almas bajo cada hueco:
  sostienen los bloques del desvío y pasan 2.1 bajo las coronas de avance.
- Motores (v3): colgados bajo el fondo en placas verticales (patrón
  UniDrive + boss) con pestaña M6 bajo su bancada; bancada = chapa 3 al ras
  del fondo con pestañas a ambas almas y RANURA para el paso del anillo.
  Motor A en (y=340, z=−82) eje a −X; motor B bajo el eje común (x=160,
  z=−82) eje a −Y. El anfitrión debe dejar libre el volumen bajo el módulo.
- Largo del módulo 440 = 4×110 de rodadura, SIN bahía (v3: los motores ya no
  consumen planta). En v1/v2 la bahía de 146 la dictaba el patrón de
  espárragos 152.7×139.7 del UniDrive; al colgar los motores el patrón vive
  en las placas verticales de abajo y el largo queda limpio.
- Anillos: 19 lazos de 2 poleas (3 links de avance + 2 de motor + 14 del
  desvío; envolvente mínima 175.7°, gate ≥120), tensados por estiramiento
  10–12% (wf07–wf08): sin colisas ni tensores. Largos por lazo en
  `desvio.lazos_mm`.
- Desvío preferente hacia el alma A; junto a cada alma queda solo la franja
  de los planos de anillo (~25) sin corona girada.
- La revisión adversarial (agente, v1) tumbó: desarrollo de chapa sin
  deducción de pliegue (−12 mm), ranuras de rueda de la tapa giradas 90°,
  patrón del motor desfasado 6 mm entre modelo y placas, casetes sin
  fijación, take-up sin mecanismo y verificación con pares silenciados por
  grupos. Todo corregido; el barrido AABB corre SIN exenciones por grupo,
  con lista blanca nominal respaldada por holguras medidas (36 entradas en
  v3). En v3 la verificación cazó además: la chumacera de 55 (anillos de
  motor reubicados), el riser al stub lejano (topología de risers
  adyacentes) y la punta de stub contra la corona superior.

## Qué viene del repo y qué se diseña

- Motor: `cv_ZP2026__300986_std_unidrive_motor_d_shaft` del catálogo (capa
  `user`, procedente del STEP del sorter). Spools/collares: esquema del
  `cv_ZP2026__speed_up_spool` con gargantas propias.
- Ruedas omni (las 36: 22 de avance y 14 de desvío): geometría de
  `pipeline/rueda_omni_piezas.py` (proyecto RUEDA-OMNI-58), barreno hex 12.85.
- Se diseñan aquí: canales del frame (desarrollo de chapa incluido), soportes
  de eje, travesaños y bloques del desvío, ejes cortos, poleas/collares/
  spools de la transmisión, eje de línea, bancadas y placas de motor, tapa
  ranurada.

Los datos de rodamientos hex y correas que vengan de la web van a
`input/web_facts.json` con URL, fecha y cita; NUNCA al modelo sin procedencia.
