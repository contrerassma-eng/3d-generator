# TRANSFER-BF21 — decisiones de diseño (capa `user`)

Módulo de transferencia bidireccional insertable en un transportador de
rodillos BF 21″. Sentido de AVANCE: hileras de ruedas omni Ø58 sobre ejes
hexagonales de 1/2″. Sentido de DESVÍO: correas transversales en los huecos
entre ejes, movidas por un eje común inferior. Dos motores Unidrive por módulo
(uno por sentido). Caja mínima 250×250 mm.

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
| "dos motores por bloque" | motor A → todas las hileras omni (spool + o-rings, esquema ZP2026); motor B → eje común de correas | — |
| "movido desde más abajo eje común" | eje de línea longitudinal bajo el módulo con una polea por correa y envolvente omega | — |
| "soportes de ejes y tapa" | soportes = bloques porta-rodamiento atornillados al alma; tapa = cubierta superior ranurada 3 mm bajo el plano de transporte (cierra los huecos entre ruedas y correas) | — |

Lectura ALTERNATIVA de "1,4": tangente 1.4″ POR ENCIMA de la pestaña. Se
descartó porque dejaría el eje omni 6.6 mm sobre el borde del alma (los ejes ya
no atraviesan el canal) y anula la pestaña como labio de transición. Si era esa,
es un solo parámetro: `--resalte 35.56`.

## Esquema de alturas (z desde el borde inferior del canal, mm) — COMO CONSTRUIDO

| Elemento | z |
|---|---|
| Plano de transporte (tangente omnis = lomo de correas = cara sup. pestaña) | 165.1 |
| Eje de las ruedas omni (Ø58) | 136.1 |
| Eje de poleas terminales de correa (Ø60 + banda 3) | 132.1 |
| Tapa superior ranurada (3 mm, 2.1 bajo la tangente) | 160–163 |
| Ramal de retorno de correa | ≈100.6 |
| Snub Ø50 por correa (colisa take-up de 20) | (248, 88) |
| Eje común de correas Ø20 (motriz Ø60, envolvente ≈170°) | (190, 58) |
| Motores UniDrive (Ø118×62.7) | bahía de cola, eje a z=73 |

## Esquema en planta — COMO CONSTRUIDO

- Luz interior entre almas: 445.2. Ejes omni transversales (hex 12.7) sobre
  bloques con rodamiento FR8ZZ-HexHD contra cada alma (web_facts wf01–wf05).
- Paso entre ejes: 110 → hueco entre coronas Ø58 = 52. La correa es de **35×3**
  (la del transfer90 del repo, poleas de cara 39): con banda de 40 el casete
  tocaría el disco Ø58 de la rueda vecina; con 35 quedan 2.5 mm por lado.
- Ruedas en tresbolillo a paso 76/74: 5+4+5+4 = 18. Una caja de 250 apoya
  siempre en ≥4 ruedas de ≥2 hileras, y en ≥2 correas al desviar (verificado
  por barrido de posiciones en `modulo.json`).
- Largo del módulo 530 = 4×110 de rodadura + **bahía de motores de 90**: el
  UniDrive es un panqueque Ø118×62.7 con patrón 152.7×139.7 que NO cabe entre
  casetes; ambos motores viven en la bahía de cola (A sobre soporte plegado,
  eje en X; B sobre la mampara, eje en Y). La caja de 250 puentea la bahía
  entre la última hilera y el primer rodillo del transportador vecino.
- Tren de o-rings junto al alma B en x≈361–407 (spools Ø36 de dos gargantas a
  ±16.87, el paso medido en el GLB del ZP2026); pantalla separadora en x=352.
- Lazo de correa: terminales Ø60 en (35,132.1) y (316,132.1), snub Ø50 en
  colisa, motriz Ø60 en el eje común (190,58) — envolvente 170.3° (gate ≥120,
  objetivo Movex 140±10), contraflexión mínima Ø50 (Habasit).
- Desvío preferente hacia el alma A (las correas cubren x 35–316; hacia B la
  caja puentea la franja del tren).

## Qué viene del repo y qué se diseña

- Motor: `cv_ZP2026__300986_std_unidrive_motor_d_shaft` del catálogo (capa
  `user`, procedente del STEP del sorter). Spools y poleas: componentes
  `cv_ZP2026__speed_up_spool`, `polea_plana_60x44` y derivados.
- Ruedas omni: geometría de `pipeline/rueda_omni_piezas.py` (proyecto
  RUEDA-OMNI-58), barreno hexagonal 12.85.
- Se diseñan aquí: canales del frame (desarrollo de chapa incluido), soportes
  de eje, casetes de correa, eje de línea, soportes de motor, tapa ranurada.

Los datos de rodamientos hex y correas que vengan de la web van a
`input/web_facts.json` con URL, fecha y cita; NUNCA al modelo sin procedencia.
