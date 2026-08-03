// params_tensor2.mjs — TENSOR NEUMÁTICO DE BRAZOS POR BANDA (arquitectura de
// banda plana angosta). Instrucción literal del cliente (31-07-2026):
//   «TERMINA EL TENSOR NEUMÁTICO QUE TIENE BRAZOS POR CADA BANDA.
//    ASEGURA SU EJE PIVOTE.»
//
// Sustituye al tensor original conservado (params_adapt.mjs §6-bis + el bloque
// 4-bis de mod_estaciones), que se desactiva por bandera TENSOR_VIEJO=false.
//
// Procedencia de cada valor (misma convención que params_adapt.mjs):
//   step = MEDIDO sobre ref/sorter_CO.stp (SORTER_CO.md, analisis/*.json).
//   web  = dato externo con URL/fecha/cita en ../web_facts.json (se cita el id).
//   calc = derivado aritméticamente de cotas step/web (fórmula al lado).
//   dis  = decisión de diseño de esta adaptación (capa user). Lleva justificación.
//
// Ejes: los del STEP del cliente. X = ancho (reparto de calles) · Y = flujo ·
// Z = arriba. Plano de transporte Z = +52.333 (step).

import { STEP, EJES, CALLE } from './params_adapt.mjs';

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;

// ===========================================================================
// 0. BANDERA: el tensor viejo se DESACTIVA, no se borra
// ===========================================================================
// El cliente se rinde con la adaptación anterior y rediseña a banda plana
// angosta. El tensor original (brazo diagonal PZA-TEN-1 + tensora en el fondo
// de su pozo + cilindro vertical) queda SIN USO, pero su código y sus cotas
// medidas se conservan por si el cliente vuelve atrás.
export const TENSOR_VIEJO = false;   // dis — poner true para restituir el tensor
                                     //   original (mod_calles §7 + mod_estaciones §4-bis)

// ===========================================================================
// 1. LA GEOMETRÍA DEL BRAZO — toda la cinemática es `step`
// ===========================================================================
// Se REUTILIZA la bahía del tensor del cliente: su eje pivote medido, su polea
// tensora medida y su bahía de cilindro medida. Motivo (dis): es el único
// volumen del sorter donde ya vivía un tensor, luego está probado que cabe; y
// así la cinemática no se inventa, se mide. Lo nuevo es multiplicarla a 5
// brazos y el reparto de fuerza.
export const GEO = {
  pivoteY: -101.72,       // step §2.4 — eje EJE-25mm-PASADOR Ø25 medido
  pivoteZ: -164.7,        // step §2.4
  poleaY: -175.72,        // step §4.5 — POL-CON-TEN Ø117.9×40 medida
  poleaZ: -371.89,        // step §4.5
  yugoY: 34.5,            // step §2.4 — eje del C85 vertical medido (la línea de
                          //   acción del cilindro pasa por aquí)
  lobuloZ: -312.5,        // step §2.4 (−292.5) BAJADO 20 (dis, 01-08): ver
                          //   NEUM.cuerpoZ0 — al bajar el cilindro para que su
                          //   bisagra libre el tambor motriz, el vástago tiene
                          //   que seguir teniendo sitio para la rótula KJ10D
                          //   (36 de alto). NO altera el cálculo de tensión: la
                          //   palanca del cilindro es la distancia HORIZONTAL
                          //   pivote↔eje del cilindro (136.22), que no depende de Z.
                          //   (donde la KJ10D tomaba el brazo); se conserva como
                          //   Z del asiento superior del resorte
};

// Brazos de palanca respecto del pivote (calc):
export const PALANCA = {
  yugo: r2(Math.abs(GEO.yugoY - GEO.pivoteY)),     // 136.22 — distancia horizontal
                                                   //   pivote → línea de acción vertical
                                                   //   del cilindro/yugo
  polea: r2(Math.abs(GEO.poleaY - GEO.pivoteY)),   // 74.00 — pivote → línea de acción
                                                   //   vertical de la reacción de la banda
  get ratio() { return r3(this.yugo / this.polea); },  // 1.841 — VENTAJA MECÁNICA
  // Radios reales de los dos lóbulos (para dibujar el brazo):
  rPolea: r2(Math.hypot(GEO.poleaY - GEO.pivoteY, GEO.poleaZ - GEO.pivoteZ)),   // 220.00
  rYugo: r2(Math.hypot(GEO.yugoY - GEO.pivoteY, GEO.lobuloZ - GEO.pivoteZ)),    // 186.79
};

// ===========================================================================
// 2. LOS CILINDROS — CINCO, uno por brazo (corrección del cliente 31-07)
// ===========================================================================
// Arquitectura FIJADA por el cliente: lo único común es el eje del pivote.
// Cada banda lleva su cilindro y se tensa SOLA, sin que las demás la afecten.
// Desaparecen el yugo de reparto y los resortes de compensación de la versión
// anterior: ya no hacen falta, porque la independencia la da el propio cilindro.
export const NEUM = {
  nCilindros: 5,                    // uno por brazo (instrucción del cliente)
  designacion: 'SMC CD85N25-80-B',  // web PNEU-001 — ISO 6432 Ø25, carrera 80
  calibre: 25.0,                    // web PNEU-001 (contrastado: Ø25.000 medido)
  vastago: 10.0,                    // web PNEU-002 (contrastado: Ø10.000 medido)
  carrera: 80,                      // web PNEU-001
  cuerpoDia: STEP.cilC85.cuerpoDia,     // 26.6 step — camisa exterior medida
  cuerpoLargo: STEP.cilC85.cuerpoLargo, // 187.75 step
  cuerpoZ0: -284.51,      // step (−264.51) BAJADO 20 (dis, 01-08). Obligado por
                          //   la geometría: la bisagra C85C25 se monta SOBRE la
                          //   tapa trasera y sube 32; con la tapa en −76.76 el
                          //   pin y la bisagra quedaban en Z −44.8, y el tambor
                          //   motriz ocupa Z −57.2…51.7 (params_tambores) — la
                          //   bisagra habría chocado de lleno contra el tambor.
                          //   Bajando 20 la bisagra corona en −64.76 y libra el
                          //   tambor por 7.56 mm. La camisa medida (187.75) y el
                          //   eje Y 34.5 no cambian, luego la tensión tampoco.
  y: 34.5,                          // step — eje del C85 vertical medido

  // --- LA DECISIÓN DE DIÁMETRO / PRESIÓN (lo único que quedaba por resolver) --
  // El Ø25 a 6 bar da 210 N efectivos en tiro → T = 193 N = 6.0 N/mm. Está en
  // rango, pero en su parte alta y sin margen de reglaje hacia arriba. El
  // objetivo es caer en la mitad del rango sano de banda plana (3…10 N/mm).
  //
  // Camino A (ELEGIDO): mantener el Ø25 y REGULAR LA PRESIÓN a 4.0 bar.
  // Camino B (descartado): bajar a un C85 Ø20, que a 6 bar daría 3.9 N/mm.
  //
  // Por qué A y no B, con números y con procedencia:
  //   1. El CD85N25-80 ya está IDENTIFICADO con cita verificada (PNEU-001) y
  //      MEDIDO en el STEP (Ø25.000 exacto): el cliente ya los tiene. El Ø20
  //      obliga a comprar cilindros nuevos.
  //   2. La rótula KJ10D es M10×1.25 (PNEU-006, contrastada con el Ø menor
  //      8.647 medido) = la rosca de vástago del Ø25. Un C85 Ø20 lleva vástago
  //      M8 → haría falta otra horquilla (KJ8D), que NO está identificada ni
  //      citada. Cambiar el calibre arrastra la rótula y el soporte.
  //   3. Reserva de tensado: con el Ø25 a 4 bar se trabaja a 4.03 N/mm y basta
  //      subir el regulador a 6 bar para llegar a 6.0 N/mm si alguna banda
  //      pidiera más agarre. Un Ø20 a 6 bar ya está en su techo.
  //   4. Regular es reversible y no cuesta pieza nueva salvo el regulador de
  //      presión, que de todas formas hacía falta (ver reguladorPresion).
  presionRedBar: 6.0,        // dis/web PNEU-003 — HIPÓTESIS de presión de red
                             //   (el STEP no la declara). NO es la de trabajo.
  presionTrabajoBar: 4.0,    // dis — LA DECISIÓN: presión de trabajo del tensor,
                             //   fijada para que T caiga en 4.03 N/mm (calc).
                             //   Se ajusta con el regulador de presión de abajo.

  // MODO DE TRABAJO (dis): TIRO (retracción). Motivo geométrico, no de gusto:
  // el brazo es un BALANCÍN (los dos lóbulos caen a lados opuestos del pivote
  // en Y). Empujar hacia abajo en el lóbulo (Y = +136.22 del pivote) SUBIRÍA la
  // polea (Y = −74) y AFLOJARÍA la banda. Tirando hacia arriba, la polea BAJA
  // contra el ramal y tensa. (calc)
  modo: 'tiro',
  falloSeguro: 'al perder presión el tensor afloja la banda (no la muerde)',
  rendimiento: 0.85,   // dis — rendimiento del cilindro por fricción de juntas
                       //   (práctica para ISO 6432 de pequeño calibre).
                       //   Conservador: si rinde más, sobra tensión.

  // --- accesorios: los 4 que pidió el cliente, UNO POR CILINDRO -------------
  accesorios: {
    bisagra: 'SMC C85C25',             // web PNEU-007 — bisagra trasera (clevis) C85 Ø20/25
    rotula: 'SMC KJ10D',               // web PNEU-006 — RÓTULA de vástago (rod end), M10×1.25,
                                       //   rótula esférica Ø10 H7. NO es horquilla y NO trae bulón.
    rotulaNorma: 'SMC KJ10D — rótula de vástago (rod end / piston rod end bracket), rosca hembra '
      + 'M10×1.25, rótula esférica de casquillo deslizante Ø10 H7, inclinación admisible 13°; '
      + 'SIN bulón (despiece de catálogo: cuerpo + rodamiento + liner) · web PNEU-006',
    regulador: 'SMC AS2201FS-01-06S',  // web PNEU-004 — regulador de CAUDAL meter-out
    silenciador: 'SMC AN101-01',       // web PNEU-005 — silenciador R1/8 (confianza BAJA)
    racor: 'SMC KQ2L06-01AS',          // web PNEU-008 — codo instantáneo R1/8 ↔ tubo Ø6
  },
  // --- el regulador que fija la PRESIÓN (pieza nueva, citada) ---------------
  // OJO, y hay que decirlo: el AS2201FS-01-06S es un regulador de CAUDAL
  // (meter-out). Gobierna la VELOCIDAD del vástago, no la fuerza. NO puede
  // fijar la tensión. Para eso hace falta un regulador de PRESIÓN, que el STEP
  // del cliente no trae:
  reguladorPresion: 'SMC AR20-02-B',   // web PNEU-009 — regulador de presión modular R1/4
  // UNO SOLO para toda la rama del tensor (dis): alimentando los 5 cilindros en
  // paralelo desde el mismo regulador, las 5 bandas reciben EXACTAMENTE la
  // misma presión y por tanto la misma tensión. Con cinco reguladores separados
  // habría cinco tensiones distintas y cinco cosas que desajustar.
  reguladorPresionX: 20,     // dis — fuera del reparto de calles, junto al
  reguladorPresionY: 34.5,   //   bastidor −X, accesible para el ajuste
  reguladorPresionZ: -200,

  // --- ACONDICIONAMIENTO Y REPARTO DEL AIRE (hallazgo A12) ------------------
  // Faltaba MEDIO CIRCUITO: el AR20 es SÓLO un regulador de presión con una
  // salida R1/4, y de él colgaban 5 líneas sin filtro, sin manómetro, sin
  // derivación y sin corte. Se cierran las cuatro cosas con referencia citada.
  // Son piezas de COMPRA sin geometría fina (viven en el cuadro de aire, fuera
  // del volumen que este ensamble dibuja): se declaran aquí y salen en la lista
  // de compra del módulo, que es donde el taller las lee.
  acondicionamiento: {
    corte: {
      ref: 'SMC VHS20-02',   // web PNEU-012
      web: 'PNEU-012',
      desig: 'SMC VHS20-02 — válvula manual de corte y ESCAPE de presión residual, 3 vías, R1/4, '
        + 'con agujeros de candado (conforme a OSHA) · web PNEU-012',
      cant: 1,
      porQue: 'sin ella no se puede aflojar el tensor para cambiar una banda ni para intervenir: hoy '
        + 'habría que cortar el aire de la máquina entera. Es ADEMÁS el elemento de bloqueo y '
        + 'consignación (LOTO) del tensor: al girar la maneta corta la alimentación Y purga los 5 '
        + 'cilindros, con lo que los 5 brazos aflojan la banda (falloSeguro) y se pueden candar.',
    },
    filtro: {
      ref: 'SMC AF20-02-B',  // web PNEU-010
      web: 'PNEU-010',
      desig: 'SMC AF20-02-B — filtro de aire modular, R1/4, grado de filtración 5 µm, con brida de '
        + 'montaje (sufijo B) · web PNEU-010',
      cant: 1,
      porQue: 'el AR20 es SÓLO regulador. Un ISO 6432 de Ø25 alimentado con aire sin filtrar se raya '
        + 'la camisa. Va DELANTE del AR20 y modula con él (misma serie 20, mismo cuerpo).',
    },
    manometro: {
      ref: 'SMC G36-10-01',  // web PNEU-011
      web: 'PNEU-011',
      desig: 'SMC G36-10-01 — manómetro redondo Ø37, 0…1.0 MPa, rosca R1/8, accesorio de catálogo del '
        + 'cuerpo tamaño 20 (AR20/AW20) · web PNEU-011',
      cant: 1,
      porQue: 'los 4.0 bar de trabajo son EL parámetro del que cuelga toda la tensión de las 5 bandas '
        + '(tabla presión↔tensión de TENSION.tablaPresion). Sin manómetro el ajuste no es medible ni '
        + 'repetible. Va en el puerto de manómetro R1/8 del propio AR20.',
    },
    reparto: {
      ref: 'SMC KQ2T06-00',  // web PNEU-013
      web: 'PNEU-013',
      desig: 'SMC KQ2T06-00 — te de unión instantánea Ø6 (tubo a tubo), PBT/NBR, −100 kPa…1 MPa · '
        + 'web PNEU-013',
      cant: 4,
      porQue: 'el AR20-02-B tiene UNA salida R1/4 y hay que alimentar CINCO cilindros en paralelo. '
        + '4 tes en cascada dan las 5 derivaciones (1→2, 2→3, 3→4, 4→5). Es la alternativa barata al '
        + 'colector de 5 salidas; si se prefiere colector, una sola pieza lo sustituye.',
    },
    bridaAR20: 'NO hace falta pieza aparte: el sufijo «-B» del AR20-02-B ES la brida de montaje con '
      + 'sus tuercas (misma nomenclatura de accesorio que el AF20-02-B) · web PNEU-010',
  },
  // Metraje del tubo (calc, sobre el trazado declarado abajo): 5 líneas que
  // arrancan en X 24 (tuboX0), corren a Z −135 / Y 78 hasta el eje de su calle
  // y suben al racor del cilindro (Z −96.76). Longitud por línea = tramo en X
  // (|Xcalle − 24|) + subida (135 − 96.76 = 38.24) + 300 de curvas y holgura.
  get tuboLineasMm() {
    return EJES.map((x, i) => ({ calle: i + 1, mm: r2(Math.abs(x - 24) + 38.24 + 300) }));
  },
  get tuboTotalM() {
    const s = this.tuboLineasMm.reduce((a, l) => a + l.mm, 0);
    // + acometida red→VHS20→AF20→AR20 (1.5 m declarado) y 10 % de merma
    return r2((s * 1.1 / 1000) + 1.5);
  },
};

// ===========================================================================
// 3. EL EJE PIVOTE ASEGURADO — el corazón de la instrucción del cliente
// ===========================================================================
// «ASEGURA SU EJE PIVOTE», y la precisión del 31-07: «lo único común es el eje
// del pivote. Nada más». Es una LÍNEA DE ARTICULACIÓN: atraviesa los 5 brazos,
// se amarra al bastidor, y NO transmite par (ningún brazo es solidario a él).
// Hay que resolver TRES cosas distintas y aquí van las tres, cada una con su
// pieza:
//   (a) que el eje no se salga ni se desplace a lo largo → retención axial DEL EJE;
//   (b) que los brazos no se muevan a lo largo del eje  → retención axial DE LOS BRAZOS;
//   (c) que los brazos giren suaves y libres            → casquillos.
export const PIV = {
  // Ø30 y no el Ø25 del cliente (dis, forzado por el número): con 5 cilindros
  // independientes la reacción por brazo sube a 398 N (antes, con el reparto
  // por resortes, era 35 N). A Ø25 el eje daría σ = 94.3 MPa y una flecha de
  // 1.26 mm; a Ø30 baja a σ = 54.5 MPa y 0.61 mm (calc, ver EJE_CALC).
  // Cambio declarado sobre la pieza medida del cliente (EJE-25mm-PASADOR Ø25).
  d: 30.0,
  material: 'C45 rectificado h7',   // dis — asiento de casquillos de fricción
  y: GEO.pivoteY, z: GEO.pivoteZ,

  // --- (c) GIRO: cada brazo LIBRE sobre 2 casquillos de fricción -----------
  // Los brazos NO son solidarios al eje: si lo fueran quedarían rígidamente
  // acoplados entre sí y se perdería la independencia que los 5 cilindros
  // compran. El eje es articulación, no transmisión.
  casquillo: { di: 30, de: 38, largo: 25, brida: 3, bridaDe: 48 },  // dis
  casquilloDesignacion: 'PENDIENTE — casquillo de fricción con brida Ø30 int × Ø38 ext × 25',

  // --- cubo del brazo -------------------------------------------------------
  cubo: { de: 50, largo: 58, bore: 38 },   // dis
  //   El paso se cierra EXACTO (calc):
  //     58 de cubo + 2 × 3 de brida de casquillo + 12.2 de separador = 76.2
  //   El paquete queda sin juego axial acumulado: los separadores fijan el paso
  //   y las BRIDAS de los casquillos son las caras de empuje axial del brazo.
  separador: { de: 38, di: 30.5, largo: 12.2 },   // calc

  // --- (b) RETENCIÓN AXIAL DE LOS BRAZOS -----------------------------------
  // La pila brazo–separador–brazo–…–brazo se captura entre DOS collares de
  // apriete apretados al eje. Ningún brazo puede correrse a lo largo porque no
  // hay hueco: el paso lo fijan los separadores y los topes son los collares.
  // UN solo collar, en el lado −X (dis, forzado por el espacio): el reparto de
  // calles está corrido hacia +X, así que entre la cara +X de la pila (463.86) y
  // la chumacera +X (468.418) sólo quedan 4.56 mm — no caben ni un collar de 15
  // ni nada más. Toda la holgura del eje (145.5 mm) está en el lado −X.
  // El paquete queda igualmente capturado: el collar −X aprieta la pila contra
  // el anillo +X, que hace de TOPE además de retener el eje (ver anilloX).
  // COTAS DE CATÁLOGO, no inventadas (web COLL-SPLIT-01): Mädler 62343000,
  // «Clamp collar double-split steel C45 … bore 30mm» → d1 30 · d2 54 · b 15,
  // 2 tornillos M6×18 DIN 912 12.9. El Ø50 que había aquí no era de ninguna
  // ficha; se sube a los 54 de catálogo. Envolvente real sobre la cabeza del
  // tornillo: R = 58.6 (declarado, no modelado: el modelo lleva el cuerpo).
  collar: { de: 54, di: 30, largo: 15, rSobreTornillo: 58.6 },   // cat COLL-SPLIT-01
  // POR QUÉ NO DIN 705 A: DIN 705 forma A es un Stellring MACIZO con prisionero
  // — no existe versión partida en esa norma. Y aquí el collar TIENE que ser
  // partido: su Ø exterior (54) no pasa por el barreno Ø30 del UC 206, así que
  // una vez montadas las dos chumaceras un collar macizo YA NO SE PUEDE ENFILAR
  // por ningún extremo del eje. La pieza partida no tiene norma DIN/ISO: se
  // designa por fabricante, que es lo que se hace aquí.
  collarDesignacion: 'Mädler 62343000 — collar de apriete PARTIDO en dos mitades (double-split), '
    + 'acero C45 pavonado, Ø30 int × Ø54 ext × 15, 2 tornillos M6×18 DIN 912 12.9 · web COLL-SPLIT-01 '
    + '(equivalente: Ruland MSP-30-SS). NO es DIN 705 A: esa norma es el anillo MACIZO con prisionero',
  get collarX() { return [r2(this.pilaX[0] - this.collar.largo), this.pilaX[0]]; },  // [80.06, 95.06]
  // caras exteriores de la pila, BRIDAS INCLUIDAS (calc): ahí topan los collares
  get pilaX() {
    const s = this.cubo.largo / 2 + this.casquillo.brida;   // 32
    return [r2(EJES[0] - s), r2(EJES[4] + s)];
  },   // [95.06, 463.86]

  // --- apoyos del eje al bastidor ------------------------------------------
  // 2 chumaceras de brida ovalada, una contra la cara interior de cada chapón.
  // UCFL 206 (eje 30) y no la 205 del cliente, por el cambio de Ø del eje.
  // ⚠ CORREGIDO 03-08-2026 (revisión de compras A4): estaba `entreTaladros: 108`
  // y `alto: 140`, cotas SIN FUENTE. Catálogo, dos fuentes independientes
  // (web BRG-UCFL206-01 NTN y BRG-UCFL206-02 AMI): J = 117.0 · A (ancho de
  // cuerpo) = 31.0 · H (largo del óvalo) = 148.0 · L (ancho de brida) = 80.0 ·
  // N (Ø del taladro) = 16.0. Con 108 el chapón del cliente se taladraba 4.5 mm
  // fuera POR LADO y la chumacera no entraba en sus propios taladros — y son
  // taladros NUEVOS en pieza del cliente, o sea irreversibles.
  ucfl: { designacion: 'SKF UCFL 206', bore: 30, housingW: 31, entreTaladros: 117, alto: 148,
    taladro: 16, bridaAncho: 80 },   // cat — web BRG-UCFL206-01/02
  ucflNota: 'cotas de catálogo verificadas contra DOS fuentes independientes (web BRG-UCFL206-01 NTN '
    + '«J 117.0 · A 31.0 · H 148.0 · N 16.0» y BRG-UCFL206-02 AMI «e 117 · a 148 · x 31 · s 16»), y '
    + 'coherentes con la serie: UCFL205 → J 99 (= lo medido del cliente, web BRG-003), UCFL206 → 117, '
    + 'UCFL207 → 130. El taladro es Ø16: catálogo AMI declara perno M14; aquí se monta M12 con arandela '
    + '(mismo M12 que el resto de la máquina) y queda 2 mm de juego radial por lado — DECLARADO, es la '
    + 'holgura de montaje de la brida, no un reglaje. La MARCA queda abierta: la 206 la fabrican NTN, '
    + 'AMI, FYH, ASAHI y SKF con la misma cota JIS y calidades distintas; elegir una antes de pedir.',
  // ancho del óvalo (Z en este montaje): el modelo dibuja el cuerpo como un
  // prisma de 44 y NO los 80 de brida de catálogo, porque la brida real es una
  // oreja delgada y modelarla llena chocaría en falso con el brazo de la calle 5
  // (ver hallazgo B11). Queda DECLARADO para que la comprobación sólida lo mire.
  ucflBridaDeclarada: 'brida oval real 148 × 80 × ~16 de espesor; el modelo la simplifica a un prisma '
    + '31 × 148 × 44. Pendiente de comprobar con sólidos el cruce con el brazo de la calle 5 barrido.',
  ucflX: [STEP.frameIntNeg, STEP.frameIntPos],   // [−81.423, 499.418] step

  // --- (a) RETENCIÓN AXIAL DEL EJE -----------------------------------------
  // DOBLE, a propósito (el cliente pidió expresamente que no se salga):
  //   1. los prisioneros del aro interior de cada UC 206 aprietan sobre el eje
  //      (retención de servicio; además impiden que el eje gire);
  //   2. 2 anillos DIN 471-30 en gargantas, POR FUERA de cada chumacera: si un
  //      prisionero se afloja, el anillo topa contra la cara del UC y el eje
  //      sigue sin poder salirse. Retención de seguridad.
  anillo: { norma: 'DIN 471-30', eje: 30 },
  // Los 2 anillos van POR DENTRO de sus chumaceras, no por fuera (dis, forzado
  // por el espacio): hacia −X el eje no puede sobresalir, porque la caja del
  // motorreductor principal del cliente llega hasta X −82.423 (step) y el
  // chapón −X está en −81.423 — no hay sitio para voladizo. Montados hacia
  // dentro funcionan igual, en pareja espejada: el anillo −X impide que el eje
  // corra hacia −X (topa contra la cara interior de su UC) y el +X impide que
  // corra hacia +X. Entre los dos lo dejan sin recorrido axial en ningún sentido.
  holguraAnillo: 3,        // dis — separación anillo ↔ cara interior del housing
  get x0() { return this.ucflX[0]; },                             // −81.423
  get x1() { return this.ucflX[1]; },                             // 499.418
  get largo() { return r2(this.x1 - this.x0); },                  // 580.84
  // Posición de las gargantas (calc). El anillo −X va justo por dentro de su
  // housing. El anillo +X va pegado a la cara +X de la pila: en ese lado sólo
  // hay 4.56 mm libres hasta la chumacera, así que el anillo cumple DOS papeles
  // a la vez — retiene el eje contra el desplazamiento +X y hace de TOPE de la
  // pila de brazos contra el que aprieta el collar −X. Admisible porque la
  // carga de los brazos sobre el eje es RADIAL (398 N); lo axial es incidental.
  get anilloX() {
    return [r2(this.ucflX[0] + this.ucfl.housingW + this.holguraAnillo),
      r2(this.pilaX[1] + 0.05)];
  },   // [−47.42, 463.91] — el +X deja 3.0 mm libres hasta la chumacera
  giraElEje: false,
};

// ===========================================================================
// 3-bis. EL SOPORTE DE LOS CILINDROS — «la placa frontal» que faltaba
// ===========================================================================
// Corrección del cliente (01-08): «No veo el soporte de los cilindros
// neumáticos en ninguno de los dos extremos. Falta la placa frontal.» Tenía
// razón: salían 5 bisagras y 5 rótulas sin nada que las amarrase.
//
// ¿LLEVA EL CILINDRO PLACA FRONTAL (brida de nariz)?  NO, y hay que explicarlo
// con la geometría delante, porque es la pregunta que hizo el cliente:
//   El cilindro BASCULA. El lóbulo del brazo describe un arco de radio 186.79
//   alrededor del pivote; para una carrera útil de ±20 mm de polea el brazo
//   gira 15.5° (calc: dφ = 20 / |Y_polea−Y_pivote| = 20/74) y el extremo del
//   vástago se desplaza 34.5 mm en Y. Con el pin trasero a Z −90 y la rótula a
//   Z −292.5 (202.5 de brazo), eso obliga al cilindro a bascular
//   atan(34.5/202.5) = 9.7°.
//   Un empotramiento frontal rígido (brida o tuerca de nariz) sería una
//   ligadura redundante sobre un cilindro que bascula: doblaría el vástago y lo
//   partiría por la rosca. Por eso el montaje correcto —y el que el propio
//   cliente compró— es ARTICULADO EN LOS DOS EXTREMOS: bisagra trasera C85C25
//   (PNEU-007) + rótula de vástago KJ10D (PNEU-006). Esas dos piezas juntas SON
//   la firma de un montaje bi-articulado; si fuese de brida frontal no habría
//   bisagra trasera.
//   ⇒ El cilindro queda ISOSTÁTICO: 2 articulaciones, ninguna ligadura sobrante.
//
// LO QUE EL CLIENTE ECHA EN FALTA, entonces, no es una brida en el cilindro:
// es la ESTRUCTURA QUE SOSTIENE LAS 5 BISAGRAS. Y esa sí es una placa frontal:
// un travesaño que cruza el cabezal motriz de lado a lado por delante de la
// máquina, apoyado en los dos canales de costado del cliente.
export const SOPORTE = {
  // --- el travesaño frontal (la «placa frontal») ---------------------------
  // Perfil rectangular 40×40×3 (dis). Va DETRÁS del tambor motriz en Y y por
  // DEBAJO de él en Z, con doble holgura, porque entre el fondo del tambor
  // (Z −57.2, params_tambores) y la cara alta de la bisagra (Z −68) sólo hay
  // 10.8 mm: no cabe ahí ningún travesaño, y por eso se lleva atrás.
  trav: {
    y: [58, 98],            // dis — arranca 3.55 detrás del tambor (Y 54.45)
    z: [-105, -65],         // dis — techo 7.8 bajo el fondo del tambor (−57.2)
    perfil: 40, esp: 3,     // dis — tubo estructural 40×40×3
    // Se atornilla a los DOS cabezales de rodamiento del alargue PG40
    // (adapt/params_pg40 PUBLICA.caraApoyo): son las dos placas estructurales
    // que ya sujetan el tambor motriz, presentes en ambos extremos y a la
    // altura justa (Y −125…90, Z −120…70). Se descartó anclarlo a los canales
    // de costado del cliente porque el cabezal +X ocupa X 491.4…499.4 y la
    // placa de extremo chocaba con él (10.24 cm³), y la del lado −X mordía la
    // caja del motorreductor principal (X hasta −82.4).
    x: [67.494, 491.418],   // pg40 PUBLICA.caraApoyo.xNeg / .xPos
    get luz() { return r2(this.x[1] - this.x[0]); },   // 566.84
  },
  // --- la ménsula de cada bisagra ------------------------------------------
  mensula: {
    semiX: 12,              // dis — 2 M8 a ±12 del eje de calle
    baseAncho: 40,          // dis — ±20: los soportes del drive kit del cliente
                            //   arrancan en ±21.04 (step), así que la base no puede
                            //   pasar de ±20 sin morderlos
    e: 8,                   // dis — pletina A36
    yFrente: 58,            // = trav.y[0]: la base atornilla a la cara frontal
    yPunta: 26,             // dis — la oreja sobrepasa el pin 8.5
    alto: 35,               // dis — la base ocupa el canto del travesaño (Z −100…−65)
                            //   y NO puede subir de −57.2, que es el fondo del tambor motriz
    altoLenguar: 23,        // dis — lengüeta Z −85…−62: cubre el pin (−72) y libra
                            //   el tambor por 4.8
    perno: { d: 8, n: 2 },  // dis — 2 M8 por ménsula a la cara del travesaño
  },
  // --- los bulones y sus retenciones ---------------------------------------
  // Los DOS extremos del cilindro pinzan con bulón + anillo a cada lado. Es lo
  // que faltaba: sin bulón la bisagra no transmite nada.
  //
  // ⚠ CORREGIDO 03-08-2026 (revisión de compras A5 y A6). Los dos bulones son
  // ahora PIEZA DE PLANO, la misma familia, y con UNA sola retención cada uno:
  //
  //   · A6 — el trasero decía a la vez «ISO 2341 B» y «DIN 471-8». No pueden ir
  //     juntos: la FORMA B de ISO 2341 lleva TALADRO DE PASADOR DE ALETAS
  //     (ISO 1234) y no tiene garganta donde alojar un circlip. Se elige la vía
  //     del CIRCLIP —no la del pasador de aletas— por tres razones de montaje:
  //     (1) el bulón delantero ya es fabricado con gargantas DIN 471-10, así que
  //     el taller monta un solo tipo de retención en todo el tensor;
  //     (2) el bulón de circlip es simétrico y reversible, y aquí se monta a
  //     ciegas entre el tambor motriz y el travesaño;
  //     (3) un pasador de aletas asoma 10–12 mm en el plano de la banda 1 o 5 y
  //     hay que doblarlo con la guarda puesta.
  //     Coste: deja de ser pieza de catálogo y necesita plano (Ø8 h9 × 44 con
  //     2 gargantas 7.6−0.09 × 0.9, según DIN 471-8). Se declara como tal.
  //
  //   · A5 — el delantero decía «bulón Ø10 del kit KJ10D (ISO 8140)». Dos
  //     errores: ISO 8140 es la norma de las HORQUILLAS de vástago (rod clevis,
  //     serie I-/Y-), no de las rótulas (web PIN-ISO8140-01); y la KJ10D NO
  //     LLEVA BULÓN — su despiece de catálogo tiene exactamente tres piezas:
  //     «q Body · w Bearing · e Liner» (web PNEU-006). El modelo ya fabrica el
  //     bulón Ø10×64; con la cita a ISO 8140 fuera, el suministro es UNO SOLO.
  bulonTrasero: { d: 8, largo: 44, fabricado: true,
    norma: 'FABRICADO — bulón Ø8 h9 × 44, acero C45, con 2 gargantas para anillo DIN 471-8 (pieza de '
      + 'plano). NO es ISO 2341: la forma B de esa norma lleva taladro de pasador de aletas ISO 1234 y '
      + 'NO admite circlip; llevaba las dos designaciones a la vez',
    anillo: 'DIN 471-8' },
  bulonRotula: { d: 10, fabricado: true,
    norma: 'FABRICADO — bulón Ø10 h9 con 2 gargantas para anillo DIN 471-10 (pieza de plano). La KJ10D '
      + 'NO lo incluye: su despiece de catálogo es «Body · Bearing · Liner», tres piezas (web PNEU-006). '
      + 'Se retira la cita a ISO 8140, que es la norma de las HORQUILLAS de vástago, no de las rótulas '
      + '(web PIN-ISO8140-01). UNA sola procedencia del bulón: éste',
    anillo: 'DIN 471-10' },
  // separadores Ø19×18 medidos del cliente, que centran la horquilla de 17 de
  // la KJ10D entre las 2 pletinas del brazo (step, inventario)
  separadorRotula: { de: 19, di: 10.2, largo: 18 },
  // --- soporte del regulador de presión y las 5 líneas ---------------------
  regPresion: { x: 20, y: 60, z: -180, placa: [90, 8, 120] },   // dis — pletina
                          //   a Z −180…−60: libra por 12.2 el cuerpo del UCF 207 del
                          //   tambor motriz (fondo −47.8, params_tambores)
                          //   atornillada al canal de costado −X, accesible
  tubo: { d: 6, norma: 'tubo PU Ø6×4 (el que piden los KQ2L06 y el AS2201FS)' },
  tuboZ: -135,            // dis — las 5 líneas corren POR DEBAJO de todo el
                          //   conjunto frontal: bajo el travesaño (fondo −105),
                          //   bajo las placas de extremo (−125) y bajo el
                          //   cabezal PG40 (−120). Es el único corredor libre.
  tuboY: 78,              // dis — detrás de las bisagras (acaban en Y 54.5) y
                          //   de las ménsulas (68), en la sombra del travesaño
  tuboPasoZ: 8,           // dis — 8 mm de separación entre líneas: van en
                          //   abanico vertical para no montarse unas sobre otras
  tuboX0: 24,             // dis — arrancan en la cara interior de la pletina
                          //   del AR20 (X 16…24)
};

// Carga que baja al travesaño (calc): el cilindro trabaja en TIRO, así que tira
// de su bisagra HACIA ABAJO con la misma fuerza que hace en el vástago.
export const SOPORTE_CALC = {
  get porBisagraN() { return TENSION.fTiroEfN; },                    // 140.19
  get totalN() { return r2(this.porBisagraN * EJES.length); },       // 700.95
  // tubo 40×40×3: I = (40⁴ − 34⁴)/12
  get I() { return r3((40 ** 4 - 34 ** 4) / 12); },                  // 101 972
  get Wsec() { return r3(2 * this.I / 40); },                        // 5 098.6
  get flechaMm() {
    return r3(5 * this.totalN * SOPORTE.trav.luz ** 3 / (384 * 210000 * this.I));
  },
  get momentoNmm() { return r2(this.totalN * SOPORTE.trav.luz / 8); },
  get sigmaMPa() { return r2(this.momentoNmm / this.Wsec); },
  fyMPa: 250,             // A36
  get fs() { return r3(this.fyMPa / this.sigmaMPa); },
  // basculación del cilindro (calc) — la que prohíbe el empotramiento frontal
  recorridoPoleaMm: 20,
  get giroBrazoDeg() { return r3(this.recorridoPoleaMm / PALANCA.polea * 180 / Math.PI); },
  get desplLobuloMm() { return r2(Math.abs(GEO.pivoteZ - GEO.lobuloZ) * this.recorridoPoleaMm / PALANCA.polea); },
  get basculacionDeg() {
    return r3(Math.atan(this.desplLobuloMm / Math.abs(GEO.lobuloZ - (-90))) * 180 / Math.PI);
  },
};

// ===========================================================================
// 4. LA POLEA TENSORA y el ramal donde apoya
// ===========================================================================
export const POL = {
  dia: STEP.polTensora.dia,      // 117.9 step — POL-CON-TEN del cliente reutilizada
  ancho: STEP.polTensora.ancho,  // 40 step
  eje: { d: 20, largo: 70 },     // dis — patrón del eje SCMRT906VCT del cliente
  rodamiento: { bore: 20, od: 42, w: 12, designacion: 'SKF W 6004-2Z' },  // web BRG-005
  anillo: '3AM1-20',
  // ⚠ CORREGIDO 03-08-2026 (revisión de compras A2). `lib.mjs anilloRet()`
  // estampa a TODOS los anillos la cadena «DIN 471 / ASME B27.7», que a este
  // anillo no le vale por partida doble: DIN 471 es otra norma con otra ranura,
  // y «ASME B27.7» A SECAS es la serie de PULGADAS. La serie métrica es
  // B27.7M — lo dice la propia fuente que ya está citada (web RING-001):
  // «ANSI B 27.7 (3AM1) … Metric external Retaining Rings … 3AM1-20 for a 20 mm
  // diameter shaft». Es el mismo anillo que el cliente ya tiene medido en su
  // eje Ø20 (contraste_con_lo_medido de RING-001: «ANSI B 27.7M - 3AMI-20»).
  // mod_tensor2 pisa la cadena de lib.mjs con ésta, que es UNA sola norma.
  anilloNorma: 'ANSI/ASME B27.7M — anillo de retención exterior 3AM1-20 (eje 20 mm) · web RING-001',
};

// El RAMAL sobre el que se tensa. La posición del tambor motriz y del rodillo
// conducido las publica adapt/params_tambores.mjs (otro agente, en curso).
// Mientras no exista se trabaja con los valores por defecto DECLARADOS de
// abajo; mod_tensor2.mjs los lee de allí en cuanto el archivo aparezca.
export const RAMAL = {
  z: -52.33,          // dis — cota del ramal de retorno del cliente hoy (step §4.4,
                      //   citada en params_adapt §6). SE RELEE de params_tambores.
  motrizY: STEP.motrizY,        // 0.0 step
  conducidaY: STEP.conducidaY,  // −1607.4 step
  // ABRAZADO sobre la polea tensora. Por defecto 180° (dis): es la arquitectura
  // del propio tensor que el cliente tenía, cuya envolvente MEDIDA sobre la
  // tensora era 186.25°. El ramal baja al tensor, lo rodea y vuelve.
  abrazadoDeg: 180,
  origenAbrazado: 'dis (por defecto) — medida del tensor original: 186.25°',
};

// ===========================================================================
// 5. LA TENSIÓN QUE SE CONSIGUE  (calc — el número que pidió el cliente)
// ===========================================================================
export const TENSION = {
  // (1) fuerza del cilindro, con el calibre y el vástago MEDIDOS
  get areaEmpuje() { return r2(Math.PI / 4 * NEUM.calibre ** 2); },              // 490.87
  get areaTiro() { return r2(Math.PI / 4 * (NEUM.calibre ** 2 - NEUM.vastago ** 2)); },  // 412.33
  // a la PRESIÓN DE TRABAJO elegida (4.0 bar), no a la de red
  get fTiroTeorN() { return r2(NEUM.presionTrabajoBar / 10 * this.areaTiro); },  // 164.93
  get fTiroEfN() { return r2(this.fTiroTeorN * NEUM.rendimiento); },             // 140.19
  // (2) un cilindro por brazo: NO hay reparto
  get fPorBrazoN() { return this.fTiroEfN; },                                    // 140.19
  // (3) palanca del balancín: ×1.841
  get nPoleaN() { return r2(this.fPorBrazoN * PALANCA.ratio); },                 // 258.09
  // (4) tensión de la banda. Una polea que desvía la banda un ángulo θ recibe
  //     N = 2·T·sin(θ/2)  →  T = N /(2·sin(θ/2)).
  tDe(abrazadoDeg) {
    const b = abrazadoDeg * Math.PI / 360;
    return r2(this.nPoleaN / (2 * Math.sin(b)));
  },
  get tPorBandaN() { return this.tDe(RAMAL.abrazadoDeg); },                      // 129.05 a 180°
  get tPorMmAncho() { return r3(this.tPorBandaN / STEP.bandaAncho); },           // 4.03 N/mm
  rangoSanoNmm: [3, 10],   // dis — banda plana de poliéster/uretano sobre cama
                           //   de deslizamiento. 4.03 cae en la mitad baja: bien.
  // (5) ¿arrastra sin patinar? Capstan (Euler–Eytelwein) sobre el tambor motriz
  //     engomado: T1/T2 = e^(μθ). El tensor pone T2 (ramal flojo).
  mu: 0.35,                 // dis — goma/uretano seco. Conservador (0.35…0.45).
  abrazadoMotrizDeg: 180,   // dis — tambor motriz común; SE RELEE de params_tambores
  get capstan() { return r3(Math.exp(this.mu * this.abrazadoMotrizDeg * Math.PI / 180)); },  // 3.003
  get feMaxPorBandaN() { return r2(this.tPorBandaN * (this.capstan - 1)); },     // 258.5
  get feMaxTotalN() { return r2(this.feMaxPorBandaN * EJES.length); },           // 1292.5
  // (6) la demanda: arrastre del bulto sobre la cama de deslizamiento UHMW
  bultoKg: 34,          // dis — el mismo bulto con que se dimensionó el puente de
                        //   calle (params_adapt CALLE.puente)
  muUhmw: 0.25,         // dis — banda sobre regleta UHMW, en seco
  get arrastreTotalN() { return r2(this.bultoKg * 9.81 * this.muUhmw); },        // 83.4
  get arrastrePorBandaN() { return r2(this.arrastreTotalN / EJES.length); },     // 16.68
  get margen() { return r3(this.feMaxPorBandaN / this.arrastrePorBandaN); },     // 15.5
  // (7) tabla T(abrazado): si al integrar con params_tambores cambia el
  //     abrazado, se lee la fila que toque y se decide si hay que reajustar la
  //     presión con el AR20-02-B.
  get tabla() {
    return [30, 45, 60, 90, 120, 150, 180].map(a => ({
      abrazadoDeg: a,
      tPorBandaN: this.tDe(a),
      tPorMmAncho: r3(this.tDe(a) / STEP.bandaAncho),
      enRango: this.tDe(a) / STEP.bandaAncho >= 3 && this.tDe(a) / STEP.bandaAncho <= 10,
      feMaxPorBandaN: r2(this.tDe(a) * (this.capstan - 1)),
      margen: r3(this.tDe(a) * (this.capstan - 1) / this.arrastrePorBandaN),
    }));
  },
  // (8) qué presión haría falta para una tensión unitaria dada (para el
  //     ajustador en obra: se lee aquí y se pone en el AR20-02-B)
  presionParaNmm(nmm) {
    const T = nmm * STEP.bandaAncho;
    const N = T * 2 * Math.sin(RAMAL.abrazadoDeg * Math.PI / 360);
    const F = N / PALANCA.ratio;
    return r3(F / (NEUM.rendimiento * this.areaTiro) * 10);
  },
  get tablaPresion() {
    return [3, 4, 5, 6].map(n => ({ nMm: n, barNecesarios: this.presionParaNmm(n) }));
  },
  // (9) reacción en el pivote (dimensiona el eje y los casquillos): el brazo
  //     está en equilibrio bajo N (arriba, en la polea) y F del cilindro
  //     (arriba, en el lóbulo). Ambas hacia arriba, a lados opuestos del
  //     pivote: sus PARES se oponen, pero sus FUERZAS se suman en el apoyo.
  get reaccionPivoteN() { return r2(this.nPoleaN + this.fPorBrazoN); },          // 398.28
  escalaConPresion: 'todas las fuerzas escalan LINEALMENTE con la presión: a P bar, '
    + 'multiplicar por P/4.0 (la presión de trabajo elegida).',
  hipotesis: `presión de trabajo ${NEUM.presionTrabajoBar} bar fijada con el ${NEUM.reguladorPresion} `
    + `(web PNEU-009); la presión de RED (${NEUM.presionRedBar} bar) es HIPÓTESIS declarada — web_facts PNEU-003`,
};

// Flexión y tensión del eje pivote (calc — se comprueban en la compuerta):
//   5 cargas de reaccionPivoteN, vano entre chumaceras L = 580.84
//   I = π·d⁴/64 ; E = 210 000 MPa ; se trata como carga repartida equivalente
export const EJE_CALC = {
  get vano() { return r2(PIV.ucflX[1] - PIV.ucflX[0]); },        // 580.84
  get I() { return r3(Math.PI * PIV.d ** 4 / 64); },             // 39 760.78
  get Wsec() { return r3(Math.PI * PIV.d ** 3 / 32); },          // 2 650.72
  get cargaTotalN() { return r2(TENSION.reaccionPivoteN * EJES.length); },   // 1991.4
  get flechaMm() {
    return r3(5 * this.cargaTotalN * this.vano ** 3 / (384 * 210000 * this.I));
  },                                                              // 0.609
  get momentoNmm() { return r2(this.cargaTotalN * this.vano / 8); },         // 144 578
  get sigmaMPa() { return r2(this.momentoNmm / this.Wsec); },                // 54.54
  fyMPa: 430,           // C45 — límite elástico de referencia
  get fs() { return r3(this.fyMPa / this.sigmaMPa); },                       // 7.88
  // La flecha NO es un problema funcional: un tensor neumático es un
  // dispositivo de FUERZA CONSTANTE, no de posición. Si el eje cede 0.6 mm, el
  // cilindro simplemente recorre 0.6 mm más de sus 80 de carrera y la tensión
  // no cambia. La flecha importa sólo por el canteo de los casquillos, y
  // 0.6 mm en 580.84 de vano son 0.06° de giro: despreciable.
  notaFlecha: 'el tensor es de fuerza constante: la flecha del eje la absorbe la carrera '
    + 'del cilindro sin alterar la tensión',
  get presionCasquilloMPa() {
    return r3(TENSION.reaccionPivoteN / (PIV.casquillo.di * PIV.casquillo.largo * 2));
  },                                                              // 0.266
};

export default {
  TENSOR_VIEJO, GEO, PALANCA, NEUM, PIV, EJE_CALC, POL, RAMAL, TENSION, SOPORTE, SOPORTE_CALC,
};
