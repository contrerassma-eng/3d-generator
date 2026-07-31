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
  lobuloZ: -292.5,        // step §2.4 — Z de la oreja medida del brazo original
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
  cuerpoZ0: -264.51,                // step — cara inferior de la camisa medida
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
    rotula: 'SMC KJ10D',               // web PNEU-006 — horquilla de vástago M10×1.25
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
  collar: { de: 50, di: 30, largo: 15 },   // dis — collar de apriete partido
  collarDesignacion: 'PENDIENTE — collar de apriete partido Ø30, tipo DIN 705 A / abrazadera',
  // caras exteriores de la pila, BRIDAS INCLUIDAS (calc): ahí topan los collares
  get pilaX() {
    const s = this.cubo.largo / 2 + this.casquillo.brida;   // 32
    return [r2(EJES[0] - s), r2(EJES[4] + s)];
  },   // [95.06, 463.86]

  // --- apoyos del eje al bastidor ------------------------------------------
  // 2 chumaceras de brida ovalada, una contra la cara interior de cada chapón.
  // UCFL 206 (eje 30) y no la 205 del cliente, por el cambio de Ø del eje.
  ucfl: { designacion: 'SKF UCFL 206', bore: 30, housingW: 31, entreTaladros: 108, alto: 140 },
  ucflNota: 'misma serie SKF UC/UCFL citada en web_facts BRG-003 (allí, tamaño 205 para eje 25); '
    + 'el tamaño 206 (eje 30) se deduce del cambio de Ø del eje. Cita específica del 206: PENDIENTE.',
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
  // posición de las gargantas (calc): justo por dentro de cada housing
  get anilloX() {
    return [r2(this.ucflX[0] + this.ucfl.housingW + this.holguraAnillo),
      r2(this.ucflX[1] - this.ucfl.housingW - this.holguraAnillo - 1.5)];
  },   // [−47.42, 466.92]
  giraElEje: false,
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
  TENSOR_VIEJO, GEO, PALANCA, NEUM, PIV, EJE_CALC, POL, RAMAL, TENSION,
};
