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
> abajo, eje común" son su TRANSMISIÓN. Se rediseñó el desvío completo
> (esta versión); los casetes de correa, terminales Ø60, snub Ø50, colisas,
> tensores y camas deslizantes de la v1 quedaron eliminados.

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
| Poleas de desvío Ø30 (2 gargantas, sobre el eje corto) | 121.1–151.1 |
| Travesaños de desvío (chapa 3, pasan 2.1 bajo las coronas) | 78–105 |
| Eje común del desvío Ø20 (3 spools de 2 gargantas + spool motor B) | (160, 58) |
| Motores UniDrive (Ø118×62.7, espárragos al patrón 152.7×139.7) | bahía de cola, ejes a z=80 |

## Esquema en planta — COMO CONSTRUIDO

- Luz interior entre almas: 445.2. Ejes omni transversales (hex 12.7) sobre
  bloques con rodamiento FR8ZZ-HexHD contra cada alma (web_facts wf01–wf05).
- Paso entre ejes: 110 → hueco entre coronas Ø58 = 52: caben la rueda girada
  (24.1), su polea de 2 gargantas (12.8) y el aire verificado a las coronas.
- Ruedas de avance en tresbolillo a paso 74 con desfase 37: 5+4+5+4 = 18. Una
  caja de 250 apoya siempre en ≥4 ruedas de ≥2 hileras, y al desviar en ≥3
  omnis giradas de ≥2 huecos (verificado por barrido en `modulo.json`).
- DESVÍO (rev. 2): 4 omnis giradas por hueco EN LAS COLUMNAS del tresbolillo
  de la hilera superior (huecos 1/3: x=73/147/221/295; hueco 2: 36/110/184/258
  — la columna 332 invadiría la pantalla). Así el bloque soporte (40 de ancho,
  doble FR8ZZ, en voladizo hacia la hilera inferior) cae centrado en la
  ventana libre de 50 entre coronas de la misma paridad. El eje corto muere
  al ras de la polea (hueco+24.9): 1 mm más y tocaba la corona superior.
- Transmisión del desvío: spool de 2 gargantas por hueco en el eje común
  (planos hueco+15.5 / +21.5 — la única banda libre entre la rueda girada,
  ±12, y las coronas vecinas, ±26) → 2 risers a los stubs ADYACENTES a x=160
  (a un stub lejano el ramal cruzaría el disco de la polea intermedia:
  tangente calculada) → 2 cadenas hacia afuera con gargantas alternadas para
  que los lazos coplanares solo compartan x sobre el arrollado bajo del spool
  (holgura medida 25.9).
- Travesaños de chapa 3 (z 78–105) del alma A a la pantalla bajo cada hueco:
  sostienen los bloques del desvío y pasan 2.1 bajo las coronas de avance.
- Largo del módulo 586 = 4×110 de rodadura + **bahía de motores de 146**: el
  UniDrive es un panqueque Ø118×62.7 cuyo patrón de espárragos 152.7×139.7
  dicta la bahía (la revisión adversarial tumbó las bahías de 90 y 140: el
  patrón no cabía o chocaba con la mampara/el casete 3). Motor A en (y=458,
  z=80) sobre soporte propio, eje en X; motor B en (x=246, z=80) sobre la
  mampara, eje en Y; a x<252 los dos cuerpos Ø118 se cruzaban y a x>269 el
  motor B se comía el cubo de la chumacera — 246 con el eje común en x=160
  libra ambos, todo con holgura medida en `modulo.json`.
- Tren de o-rings junto al alma B: spools Ø36×34 con gargantas a ±12 (más
  juntas que las ±16.87 del ZP2026 para librar el soporte del motor y el
  bloque B de 12), planos de anillo x=402/426; pantalla separadora en x=350
  con pasos Ø18 para los ejes, terminada en y=372.
- Anillos del desvío: 12 lazos de 2 poleas (envolvente mínima 175.7°, gate
  ≥120), tensados por estiramiento 10–12% (wf07–wf08): sin colisas ni
  tensores. Largos instalados ~238–298 por lazo (ver `desvio.lazos_mm`).
- Desvío preferente hacia el alma A (las omnis giradas cubren coronas x
  7–324; hacia B la caja cruza la franja del tren sobre la pestaña rasante).
- La revisión adversarial (agente) tumbó además: desarrollo de chapa sin
  deducción de pliegue (−12 mm), ranuras de rueda de la tapa giradas 90°,
  patrón del motor desfasado 6 mm entre modelo y placas, casetes sin fijación,
  take-up sin mecanismo y verificación con pares silenciados por grupos. Todo
  corregido; el barrido AABB ya corre SIN exenciones por grupo, con lista
  blanca nominal respaldada por holguras medidas (23 entradas).

## Qué viene del repo y qué se diseña

- Motor: `cv_ZP2026__300986_std_unidrive_motor_d_shaft` del catálogo (capa
  `user`, procedente del STEP del sorter). Spools: esquema del
  `cv_ZP2026__speed_up_spool` con gargantas propias.
- Ruedas omni (las 30: avance y desvío): geometría de
  `pipeline/rueda_omni_piezas.py` (proyecto RUEDA-OMNI-58), barreno hex 12.85.
- Se diseñan aquí: canales del frame (desarrollo de chapa incluido), soportes
  de eje, travesaños y bloques del desvío, ejes cortos, poleas y spools de la
  transmisión, eje de línea, soportes de motor, tapa ranurada.

Los datos de rodamientos hex y correas que vengan de la web van a
`input/web_facts.json` con URL, fecha y cita; NUNCA al modelo sin procedencia.
