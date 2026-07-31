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
// 2. EL CILINDRO — uno COMÚN a los 5 brazos, trabajando en TIRO
// ===========================================================================
// PRESIÓN: 6 bar. Es una HIPÓTESIS DECLARADA (web_facts PNEU-003: «La PRESION
// es una hipotesis (capa 'dis'): 6 bar, presion de red habitual. El STEP no
// declara presion»). Si la red del cliente trabaja a otra presión, TODA la
// cadena de fuerza escala linealmente — ver TENSION.escalaConPresion.
export const NEUM = {
  presionBar: 6.0,                  // dis/web PNEU-003 — HIPÓTESIS, no medida
  designacion: 'SMC CD85N25-80-B',  // web PNEU-001 — ISO 6432 Ø25, carrera 80
  calibre: 25.0,                    // web PNEU-001 (contrastado: Ø25.000 medido)
  vastago: 10.0,                    // web PNEU-002 (contrastado: Ø10.000 medido)
  carrera: 80,                      // web PNEU-001
  cuerpoDia: STEP.cilC85.cuerpoDia,     // 26.6 step — camisa exterior medida
  cuerpoLargo: STEP.cilC85.cuerpoLargo, // 187.75 step
  cuerpoZ0: -264.51,                // step — cara inferior de la camisa medida
  // MODO DE TRABAJO (dis): el cilindro trabaja en TIRO (retracción). Motivo
  // geométrico, no de gusto: el brazo es un BALANCÍN (los dos lóbulos caen a
  // lados opuestos del pivote en Y). Empujar hacia abajo en el lóbulo del yugo
  // (Y = +136.22 del pivote) SUBIRÍA la polea (Y = −74) y AFLOJARÍA la banda.
  // Tirando hacia arriba, la polea BAJA contra el ramal y tensa.  (calc)
  modo: 'tiro',
  // Consecuencia declarada y deseada: al perder aire el tensor SUELTA la banda
  // (no la deja mordida). Es el comportamiento de seguridad normal en un
  // tensor neumático.
  falloSeguro: 'al perder presión el tensor afloja la banda (no la muerde)',
  rendimiento: 0.85,   // dis — rendimiento del cilindro por fricción de juntas
                       //   (valor de práctica para ISO 6432 de pequeño calibre).
                       //   Conservador: si el cilindro rinde más, sobra tensión.
  accesorios: {
    bisagra: 'SMC C85C25',          // web PNEU-007 — bisagra trasera (clevis) C85 Ø20/25
    rotula: 'SMC KJ10D',            // web PNEU-006 — horquilla de vástago, rosca M10×1.25
    regulador: 'SMC AS2201FS-01-06S',  // web PNEU-004 — regulador de caudal meter-out
    silenciador: 'SMC AN101-01',    // web PNEU-005 — silenciador R1/8 (confianza BAJA:
                                    //   PENDIENTE de cita textual, ver web_facts)
    racor: 'SMC KQ2L06-01AS',       // web PNEU-008 — codo instantáneo R1/8 ↔ tubo Ø6
  },
  // Un solo cilindro y no cinco (dis, justificado con la fuerza en §5):
  // 250 N efectivos en empuje / 210 en tiro alcanzan de sobra para los 5 brazos
  // (42 N por brazo bastan, ver TENSION). Cinco cilindros Ø25 darían 210 N a
  // CADA brazo: 5× sobredimensionado, 5× la neumática y 5× el mantenimiento.
  // El calibre 25 es además el que el cliente ya tiene y ya está identificado.
  nCilindros: 1,
  // Va en el HUECO ENTRE CALLES más próximo al centro del yugo (dis): los ejes
  // de calle están ocupados por los 5 resortes (mismo Y = 34.5 que el cilindro),
  // así que el cilindro no cabe sobre ninguno. El hueco entre las calles 3 y 4
  // queda a medio paso (38.1) del centro del yugo (279.456): es el punto libre
  // más centrado, y las 2 columnas guía absorben ese pequeño momento.
  x: r2(EJES[2] + 76.2 / 2),   // 317.556
  get excentricidadYugoMm() { return r2(this.x - (EJES[0] + EJES[4]) / 2); },  // 38.1
};

// ===========================================================================
// 3. EL REPARTO: yugo + 5 resortes = precarga global, compensación individual
// ===========================================================================
// Por qué no atacar los 5 brazos rígidamente desde un eje de torsión: con un
// único grado de libertad, el eje se posiciona según la banda MÁS tensa y las
// otras cuatro quedan flojas en cuanto las longitudes difieran (desgaste
// dispar, tolerancia de fabricación de la banda). En un sorter de 5 bandas eso
// pasa siempre.
// Solución (dis, decisión del cliente 31-07): los brazos giran LIBRES sobre
// casquillos en un eje pivote que es sólo ARTICULACIÓN FIJA al bastidor; el
// cilindro tira de un YUGO (barra de reparto) que precarga 5 RESORTES, uno por
// brazo. Cada banda recibe su fuerza casi independiente de la posición del
// resto: si una se estira, su brazo baja, su resorte se comprime un poco más y
// la fuerza sube sólo lo que diga la constante k (muy blanda a propósito).
export const RESORTE = {
  k: 2.0,              // dis — N/mm. BLANDA a propósito: ver toleranciaMm.
  largoLibre: 75,      // dis
  largoMontado: 54,    // dis — precarga 21 mm × 2.0 N/mm = 42.0 N (calc)
  get precargaN() { return r2(this.k * (this.largoLibre - this.largoMontado)); },  // 42.0
  diaExt: 20,          // dis — cabe holgado en el paso 76.2
  diaHilo: 2.5,        // dis
  guia: 10,            // dis — vástago guía Ø10 solidario al yugo, evita pandeo
  // Cuánta diferencia de longitud entre bandas tolera sin descompensar (calc):
  // la banda abraza la tensora ~180°, luego 1 mm de recorrido de polea = 2 mm
  // de longitud de banda. Recorrido de polea → recorrido en el resorte × ratio.
  //   Δlongitud 10 mm → Δpolea 5 mm → Δresorte 5 × 1.841 = 9.2 mm → ΔF 18.4 N
  get toleranciaMm() { return 10; },
  get deltaFpor10mm() { return r2(this.k * 10 / 2 * PALANCA.ratio); },   // 18.4 N (44 %)
  // PENDIENTE: designación de catálogo del resorte. Se especifica por
  // características (k, largos, Ø) porque NO se ha verificado una referencia
  // comercial concreta — la regla del repo prohíbe inventar procedencia `web`.
  designacion: 'PENDIENTE — resorte de compresión k=2.0 N/mm, L0=75, Øe=20, Ød=2.5',
};

export const YUGO = {
  // barra de reparto: cruza las 5 calles a la altura del cilindro
  y: GEO.yugoY,                                   // 34.5 step
  topZ: r2(GEO.lobuloZ - RESORTE.largoMontado),   // −346.5 calc: asiento inferior
                                                  //   del resorte, 54 bajo el lóbulo
  secY: 40, secZ: 30,                             // dis — sección de la barra
  get z() { return r2(this.topZ - this.secZ / 2); },   // −361.5 — eje de la barra
  x: [r2(EJES[0] - 30), r2(EJES[4] + 30)],        // dis — [97.06, 461.86]: sobresale
                                                  //   30 de las calles extremas para
                                                  //   alojar las 2 guías verticales
  get largo() { return r2(this.x[1] - this.x[0]); },   // 364.8
  guiaDia: 12,                                    // dis — 2 columnas guía Ø12 que
                                                  //   impiden que el yugo bascule
  guiaX: [r2(EJES[0] - 30), r2(EJES[4] + 30)],    // en los extremos de la barra
  // Flexión del yugo (calc): carga 5 × 42 N repartida, apoyo en las 2 guías.
  // I = 40 × 30³/12 = 90 000 mm⁴ (barra 40 ancho en Y × 30 alto en Z)
  //   δ = 5 W L³ /(384 E I) con W = 210 N, L = 364.8, E = 210 000 MPa
  get flechaMm() {
    const W = 5 * RESORTE.precargaN, L = this.largo, I = this.secY * this.secZ ** 3 / 12;
    return r3(5 * W * L ** 3 / (384 * 210000 * I));
  },
};

// ===========================================================================
// 4. EL EJE PIVOTE ASEGURADO — el corazón de la instrucción del cliente
// ===========================================================================
// «ASEGURA SU EJE PIVOTE»: hay que resolver TRES cosas distintas y aquí van las
// tres, cada una con su pieza.
//   (a) que el eje no se salga ni se desplace a lo largo → retención axial DEL EJE;
//   (b) que los brazos no se muevan a lo largo del eje  → retención axial DE LOS BRAZOS;
//   (c) que los brazos giren suave y el eje no trabaje a torsión → casquillos.
export const PIV = {
  d: 25.0,                 // step — el Ø25 del EJE-25mm-PASADOR del cliente
  material: 'C45 rectificado h7',   // dis — asiento de casquillos de fricción
  y: GEO.pivoteY, z: GEO.pivoteZ,

  // --- (c) GIRO: cada brazo sobre 2 casquillos de fricción -----------------
  casquillo: { di: 25, de: 32, largo: 25, brida: 3, bridaDe: 42 },  // dis
  // 2 por brazo, uno en cada boca del cubo → base ancha, el brazo no cabecea.
  // PENDIENTE: designación de catálogo (bronce sinterizado autolubricado o
  // polímero tipo iglidur). Se especifica por cotas; no se inventa referencia.
  casquilloDesignacion: 'PENDIENTE — casquillo de fricción con brida Ø25 int × Ø32 ext × 25',
  // Presión de apoyo (calc, ver TENSION.reaccionPivoteN):
  //   p = R /(di × largo × 2 casquillos) = 42.1/(25 × 25 × 2) = 0.034 MPa
  //   Dos órdenes de magnitud por debajo de lo admisible de cualquier casquillo
  //   de fricción (≥ 5 MPa). Sobra material.

  // --- cubo del brazo -------------------------------------------------------
  cubo: { de: 45, largo: 58, bore: 32 },   // dis — Ø45 exterior, 58 de largo
  //   El paso se cierra EXACTO (calc):
  //     58 de cubo + 2 × 3 de brida de casquillo + 12.2 de separador = 76.2
  //   El paquete queda sin juego axial acumulado: los separadores fijan el paso
  //   y las BRIDAS de los casquillos son las caras de empuje axial del brazo.
  separador: { de: 30, di: 25.5, largo: r2(76.2 - 58 - 2 * 3) },   // 12.2 calc

  // --- (b) RETENCIÓN AXIAL DE LOS BRAZOS -----------------------------------
  // La pila brazo–separador–brazo–…–brazo se captura entre DOS collares de
  // apriete apretados al eje. Los brazos no pueden correrse a lo largo porque
  // no hay hueco: el paso lo fijan los separadores y los topes son los collares.
  collar: { de: 45, di: 25, largo: 15 },   // dis — collar de apriete partido
  collarDesignacion: 'PENDIENTE — collar de apriete partido Ø25, tipo DIN 705 A / abrazadera',
  // caras exteriores de la pila, BRIDAS INCLUIDAS (calc): es donde topan los
  // collares de apriete que capturan todo el paquete
  get pilaX() {
    const s = this.cubo.largo / 2 + this.casquillo.brida;   // 32
    return [r2(EJES[0] - s), r2(EJES[4] + s)];
  },   // [95.06, 463.86] — 368.8 de pila

  // --- apoyos del eje al bastidor ------------------------------------------
  // 2 chumaceras de brida ovalada UCFL 205 (Ø25), una contra la cara interior
  // de cada chapón del bastidor. Es la misma chumacera que el cliente ya tiene
  // montada en este eje (step: una UCFL medida en X 504.09…539.79) — se
  // conserva el tipo y se completa la pareja.
  ucfl: { designacion: 'SKF UCFL 205', bore: 25, housingW: 27, entreTaladros: 99, alto: 130 },
  ucflX: [STEP.frameIntNeg, STEP.frameIntPos],   // [−81.423, 499.418] step — caras
                                                  //   interiores de los dos chapones
  // --- (a) RETENCIÓN AXIAL DEL EJE -----------------------------------------
  // DOBLE, a propósito (el cliente pidió expresamente que no se salga):
  //   1. los prisioneros del aro interior de cada UC 205 aprietan sobre el eje
  //      (es la retención de servicio, y además impide que el eje gire);
  //   2. 2 anillos DIN 471-25 en gargantas, POR FUERA de cada chumacera: si un
  //      prisionero se afloja, el anillo topa contra la cara del UC y el eje
  //      sigue sin poder salirse. Es la retención de seguridad.
  anillo: { norma: 'DIN 471-25', eje: 25 },
  // el eje sobresale 12 de cada chumacera para alojar la garganta (dis):
  voladizoAnillo: 12,
  get x0() { return r2(this.ucflX[0] - this.voladizoAnillo); },   // −93.42
  get x1() { return r2(this.ucflX[1] + this.voladizoAnillo); },   // 511.42
  get largo() { return r2(this.x1 - this.x0); },                  // 604.84
  // El eje NO gira (los brazos giran sobre sus casquillos): es una articulación
  // fija. Por eso los prisioneros del UC son admisibles como anclaje — no hay
  // par que los afloje.
  giraElEje: false,
};

// Flexión y tensión del eje pivote (calc — se comprueban en la compuerta):
//   5 cargas de R por brazo, vano entre chumaceras L = 580.84
//   I = π·25⁴/64 = 19 175 mm⁴ ; E = 210 000 MPa
export const EJE_CALC = {
  vano: r2(PIV.ucflX[1] - PIV.ucflX[0]),        // 580.84
  get I() { return r3(Math.PI * PIV.d ** 4 / 64); },       // 19 174.76
  W: 5,                                          // nº de cargas
};

// ===========================================================================
// 5. LA POLEA TENSORA y el ramal donde apoya
// ===========================================================================
export const POL = {
  dia: STEP.polTensora.dia,      // 117.9 step — POL-CON-TEN del cliente reutilizada
  ancho: STEP.polTensora.ancho,  // 40 step
  eje: { d: 20, largo: 70 },     // dis — patrón del eje SCMRT906VCT del cliente (Ø20)
  rodamiento: { bore: 20, od: 42, w: 12, designacion: 'SKF W 6004-2Z' },  // igual que
                                 //   la retención de V1…V4 de mod_estaciones (RETEN)
  anillo: '3AM1-20',             // igual criterio que RETEN
};

// El RAMAL sobre el que se tensa. La posición del tambor motriz y del rodillo
// conducido las publica adapt/params_tambores.mjs (otro agente, en curso).
// Mientras no exista, se trabaja con los valores por defecto DECLARADOS de
// abajo; mod_tensor2.mjs los lee de allí en cuanto el archivo aparezca.
export const RAMAL = {
  z: -52.33,          // dis — cota del ramal de retorno del cliente hoy (step §4.4,
                      //   citada en params_adapt §6). SE RELEE de params_tambores.
  motrizY: STEP.motrizY,        // 0.0 step
  conducidaY: STEP.conducidaY,  // −1607.4 step
  // ABRAZADO de la banda sobre la polea tensora. Por defecto 180° (dis):
  // es la arquitectura del propio tensor que el cliente tenía, cuya envolvente
  // MEDIDA sobre la tensora era 186.25° (verificaciones del run anterior:
  // envolventes.tensoraOriginal). El ramal baja al tensor, lo rodea y vuelve.
  // SE RELEE de params_tambores si publica la geometría real de los rodillos
  // de retorno; si cambia, cambia la fila de la tabla de TENSION.tabla.
  abrazadoDeg: 180,
  origenAbrazado: 'dis (por defecto) — medida del tensor original: 186.25°',
};

// ===========================================================================
// 6. LA TENSIÓN QUE SE CONSIGUE  (calc — el número que pidió el cliente)
// ===========================================================================
export const TENSION = {
  // (1) fuerza del cilindro. Áreas con el calibre y el vástago MEDIDOS.
  get areaEmpuje() { return r2(Math.PI / 4 * NEUM.calibre ** 2); },              // 490.87
  get areaTiro() { return r2(Math.PI / 4 * (NEUM.calibre ** 2 - NEUM.vastago ** 2)); },  // 412.33
  get fEmpujeTeorN() { return r2(NEUM.presionBar / 10 * this.areaEmpuje); },     // 294.5  ← PNEU-003
  get fTiroTeorN() { return r2(NEUM.presionBar / 10 * this.areaTiro); },         // 247.4  ← PNEU-003
  get fTiroEfN() { return r2(this.fTiroTeorN * NEUM.rendimiento); },             // 210.3
  // (2) reparto: 1 cilindro → yugo → 5 resortes
  get fPorBrazoN() { return r2(this.fTiroEfN / EJES.length); },                  // 42.06
  // El resorte se precarga EXACTAMENTE a esa fuerza (RESORTE.precargaN = 42.0):
  // el cilindro sólo tiene que vencer la suma de las 5 precargas.
  // (3) palanca: el brazo multiplica ×1.841
  get nPoleaN() { return r2(this.fPorBrazoN * PALANCA.ratio); },                 // 77.43
  // (4) tensión de la banda. Una polea que desvía la banda un ángulo θ recibe
  //     N = 2·T·sin(θ/2)  →  T = N /(2·sin(θ/2)).
  tDe(abrazadoDeg) {
    const b = abrazadoDeg * Math.PI / 360;      // θ/2 en radianes
    return r2(this.nPoleaN / (2 * Math.sin(b)));
  },
  get tPorBandaN() { return this.tDe(RAMAL.abrazadoDeg); },                      // 38.72 a 180°
  get tPorMmAncho() { return r3(this.tPorBandaN / STEP.bandaAncho); },           // 1.21 N/mm
  // (5) ¿arrastra sin patinar? Criterio de capstan (Euler–Eytelwein) sobre el
  //     tambor motriz engomado: T1/T2 = e^(μθ). El tensor pone T2 (ramal flojo).
  mu: 0.35,             // dis — goma/uretano seco sobre banda. Conservador:
                        //   los engomados de tambor motriz dan 0.35…0.45 en seco.
  abrazadoMotrizDeg: 180,   // dis — tambor motriz común; SE RELEE de params_tambores
  get capstan() { return r3(Math.exp(this.mu * this.abrazadoMotrizDeg * Math.PI / 180)); },  // 3.003
  get feMaxPorBandaN() { return r2(this.tPorBandaN * (this.capstan - 1)); },     // 77.55
  get feMaxTotalN() { return r2(this.feMaxPorBandaN * EJES.length); },           // 387.8
  // (6) la demanda: arrastre del bulto sobre la cama de deslizamiento UHMW
  bultoKg: 34,          // dis — el mismo bulto con que se dimensionó el puente de
                        //   calle (params_adapt CALLE.puente: «medio bulto de 34 kg»)
  muUhmw: 0.25,         // dis — banda sobre regleta UHMW, en seco
  get arrastreTotalN() { return r2(this.bultoKg * 9.81 * this.muUhmw); },        // 83.4
  get arrastrePorBandaN() { return r2(this.arrastreTotalN / EJES.length); },     // 16.68
  get margen() { return r3(this.feMaxPorBandaN / this.arrastrePorBandaN); },     // 4.65
  // (7) tabla T(abrazado) — si al integrar con params_tambores cambia el
  //     abrazado, se lee la fila que toque y se decide si hay que reajustar
  //     la presión con el regulador AS2201FS.
  get tabla() {
    return [30, 45, 60, 90, 120, 150, 180].map(a => ({
      abrazadoDeg: a,
      tPorBandaN: this.tDe(a),
      tPorMmAncho: r3(this.tDe(a) / STEP.bandaAncho),
      feMaxPorBandaN: r2(this.tDe(a) * (this.capstan - 1)),
      margen: r3(this.tDe(a) * (this.capstan - 1) / this.arrastrePorBandaN),
    }));
  },
  // (8) reacción en el pivote (para el eje y los casquillos): el brazo está en
  //     equilibrio bajo N (arriba, en la polea) y F del resorte (arriba, en el
  //     lóbulo del yugo). La reacción del eje sobre el brazo cierra el sistema.
  get reaccionPivoteN() { return r2(this.nPoleaN - this.fPorBrazoN); },          // 35.37
  // (9) escalado con la presión real de la red
  escalaConPresion: 'todas las fuerzas escalan LINEALMENTE con la presión: a P bar, '
    + 'multiplicar por P/6. La tensión T y la fuerza de arrastre Fe escalan igual.',
  hipotesis: `${NEUM.presionBar} bar (HIPÓTESIS declarada — web_facts PNEU-003; el STEP no declara presión)`,
};

export default {
  TENSOR_VIEJO, GEO, PALANCA, NEUM, RESORTE, YUGO, PIV, EJE_CALC, POL, RAMAL, TENSION,
};
