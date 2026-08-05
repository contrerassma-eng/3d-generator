// params_tambores.mjs — TABLA ÚNICA del ACCIONAMIENTO DE BANDA PLANA del
// sorter CO: TAMBOR MOTRIZ común, RODILLO CONDUCIDO y RODILLOS DE RETORNO.
//
// Arquitectura (giro del cliente, 31-07-2026): las 5 calles dejan de tener
// transmisión propia (polea T5 por calle sobre árbol común) y pasan a la
// arquitectura de BANDA PLANA ANGOSTA — la misma de la que salió la
// transferencia NBT90: un TAMBOR MOTRIZ engomado que arrastra las 5 bandas por
// fricción, un RODILLO CONDUCIDO en el otro extremo, un TENSOR de brazos
// (adapt/mod_tensor2.mjs, otro módulo) y RODILLOS DE RETORNO que sostienen y
// encaminan los 5 ramales de retorno por debajo del módulo de transferencia.
//
// Procedencia de cada cota (regla de oro del repo):
//   step = MEDIDO sobre ref/sorter_CO.stp (SORTER_CO.md, analisis/*.json).
//   nbt90= especificación CONGELADA de la transferencia (ensambles/nbt90/params.mjs).
//   cat  = dimensión normalizada de catálogo/norma (tubo, rodamiento, chaveta).
//   web  = dato externo con URL, fecha y cita en ../web_facts.json (se cita id).
//   calc = derivado aritméticamente (la fórmula va al lado).
//   dis  = decisión de diseño de este módulo (capa `user`). Lleva justificación.
//
// Ejes: los del STEP del cliente. X = ancho (reparto de calles) · Y = flujo ·
// Z = arriba. Plano de transporte Z = +52.333; DORSO de la banda (cara de
// rodadura sobre la guía UHMW y sobre los tambores) Z = +51.7.
//
// ───────────────────────────────────────────────────────────────────────────
// LO QUE ESTE ARCHIVO PUBLICA (contrato con los otros dos módulos)
//   · adapt/params_pg40.mjs   lee  `TAMBORES` → {motriz, conducido} con su
//                             (y, z), la cara de apoyo del soporte y el patrón
//                             de taladros que tiene que hacer en el alargue.
//   · adapt/mod_tensor2.mjs   lee  `RETORNO`  → cota del ramal de retorno y los
//                             abrazados reales (deja de suponer 180°).
// LO QUE ESTE ARCHIVO CONSUME
//   · adapt/params_pg40.mjs   `PUBLICA` (caras de apoyo, luz entre caras,
//                             UCF207) y `TRAMOS`/`Z` para verificar holguras.
//                             Si aún no existe, se usan los valores step/calc
//                             equivalentes y se declara.
// ───────────────────────────────────────────────────────────────────────────

import { STEP, NBT, EJES, Xc, T, y0, y1, P } from './params_adapt.mjs';

const r3 = (v) => Math.round(v * 1000) / 1000;

// NOTA DE DEPENDENCIAS (importante): este archivo NO importa params_pg40.mjs.
// Es al revés — params_pg40 hace `await import('./params_tambores.mjs')` para
// leer `TAMBORES`, así que importarlo desde aquí cerraría un ciclo con await de
// nivel superior en los dos lados y Node se quedaría colgado (comprobado). Las
// cotas de pg40 que hacen falta se citan por su valor step/calc equivalente y
// mod_tambores.mjs —que sí puede— las relee para VERIFICAR las holguras.

// ---------------------------------------------------------------------------
// 0. Las cotas CONGELADAS que gobiernan (no se tocan)
// ---------------------------------------------------------------------------
export const FIJO = {
  paso: NBT.paso,                      // 76.2 nbt90
  ejes: EJES,                          // step/calc — X de las 5 bandas
  Xc,                                  // 279.456 calc
  planoTransporte: STEP.planoBanda,    // 52.333 step — cara SUPERIOR de la banda
  planoDorso: STEP.guiaSec.topZ,       // 51.7 step — cara de rodadura (= pg40 Z.guiaTop)
  bandaEsp: P.bandaEsp,                // 2.5 med (nbt90 params.mjs, «med 2.53»)
  //   Aquí decía `STEP.bandaDorso` = 0.633, y el comentario que lo acompañaba
  //   se equivocaba en la parte que importa. 0.633 es correcto pero es de OTRA
  //   banda: es el dorso medido de la **T5 DENTADA** del cliente (dorso 52.333
  //   − cara de guía 51.7), donde el diente corre en la ranura y sólo asoman
  //   0.633 por encima. Esta máquina lleva banda PLANA de 2 telas: 2.5 mm.
  //
  //   Y no cambiaba «sólo la cara de la guía UHMW»: 0.633 → 2.5 baja el eje del
  //   tambor a −4.617, el del conducido a −4.167, RR1/RR4 a −106.017/−105.117,
  //   la cara del ramal de retorno a −61.567 y los volantes a −111.567; el largo
  //   de fibra sube a 4882.02. Lo que NO se mueve —y es la comprobación de que
  //   esto está bien puesto— es el PLANO DE TRANSPORTE: sigue en 52.333, porque
  //   con banda plana la cara portante es la de arriba y el espesor cuelga hacia
  //   abajo. La cara de rodadura baja a 52.333 − 2.5 = 49.833, que es justo donde
  //   el NBT90 declara la regleta de su anfitrión (49.84). Si en vez de eso
  //   hubiéramos subido el plano 1.867, la emergencia útil del rodillo caería de
  //   6.35 a 4.483 (−29 %) y el bulto quedaría 1.87 sobre el datum del cliente.
  //   Hallazgo SC-10 de la revisión estructural.
  bandaAncho: STEP.bandaAncho,         // 32.0 step
  frameIntNeg: STEP.frameIntNeg,       // −81.423 step
  frameIntPos: STEP.frameIntPos,       // 499.418 step
  frameEsp: STEP.frameEsp,             // 28.0 step
  bordeExtDescarga: r3(STEP.frameIntPos + STEP.frameEsp),   // 527.418 calc
  get luzBastidores() { return r3(this.frameIntPos - this.frameIntNeg); },   // 580.841
  motrizY: STEP.motrizY,               // 0.0 step §4.1 — árbol motriz del cliente
  conducidaY: STEP.conducidaY,         // −1607.4 step §4.1 — polea conducida
  moduloY: [y0, y1],                   // [−1205, −742] calc — huella del NBT90
  fondoNbt90: T.z,                     // −338.267 calc — cara inferior del módulo
  // Ancho que las 5 bandas exigen a la cara del tambor (calc):
  get bandasX() { return [r3(EJES[0] - this.bandaAncho / 2), r3(EJES[4] + this.bandaAncho / 2)]; },
  get caraMin() { return r3(this.bandasX[1] - this.bandasX[0]); },   // 336.8
};

// ---------------------------------------------------------------------------
// 1. EL TAMBOR MOTRIZ  (instrucción literal del cliente: UCF 207 + 10 de goma)
// ---------------------------------------------------------------------------
// Ø DEL TUBO — por qué Ø88.9 × 3.2 y no otro (dis, con los cuatro números que
// lo aprietan por arriba y por abajo):
//   (a) POR ARRIBA lo limita el hueco entre los largueros PG40. El larguero
//       norte arranca en Y = −58 (pg40 TRAMOS.norte) y el tambor está en Y = 0:
//       su radio no puede pasar de 58. Con engomado de 10 por lado eso deja
//       tubo ≤ Ø76. Pero el larguero SUR arranca en Y = −1551.181 y el
//       conducido está en −1607.4 → radio ≤ 56.2. Ø108.9 (r 54.45) es el
//       ESCALÓN NORMALIZADO MÁS GRANDE que cabe: el siguiente (Ø114.3) daría
//       r 57.15 y se comería el larguero sur.
//   (b) POR ABAJO lo limita el par: con Ø108.9 el esfuerzo tangencial de
//       régimen es 285 N (§4) y el capstan sobre goma da 5.2 de reserva.
//   (c) el barreno del UCF 207 impone eje Ø35 (web BRG-UCF207): en un disco de
//       tapa de Ø82.5 (interior del tubo) el cubo Ø35 deja 23.75 de corona.
//   (d) Ø88.9 × 3.2 es tubo de línea corriente (EN 10220 / ASTM A513) —
//       disponibilidad inmediata, que es lo que pide el plazo.
export const TAMBOR = {
  tubo: { od: 88.9, e: 3.2, get id() { return r3(this.od - 2 * this.e); } },   // 82.5 cat
  tuboDesig: 'Tubo Ø88.9 × 3.2 EN 10220 / ASTM A513, acero S275JR',            // cat
  engomado: 10.0,                      // dis — instrucción literal del cliente
  gomaDesig: 'Caucho natural/SBR 60 ± 5 Sh A vulcanizado en caliente, 10 mm, cara lisa',
  get od() { return r3(this.tubo.od + 2 * this.engomado); },                   // 108.9 calc
  get r() { return r3(this.od / 2); },                                         // 54.45 calc
  // Cara engomada (dis): cubre las 5 bandas con MEDIA BANDA de margen por lado
  // — el margen de deriva (tracking) clásico de banda plana angosta.
  caraGoma: 370,                       // dis
  caraTubo: 380,                       // dis — 5 por testa de tubo desnudo, canto
  //   de la goma matado a 45° para que el vulcanizado no despegue por el borde
  get gomaX() { return [r3(Xc - this.caraGoma / 2), r3(Xc + this.caraGoma / 2)]; },   // 94.456…464.456
  get tuboX() { return [r3(Xc - this.caraTubo / 2), r3(Xc + this.caraTubo / 2)]; },   // 89.456…469.456
  get margenBanda() { return r3(FIJO.bandasX[0] - this.gomaX[0]); },           // 16.6 calc

  // -------------------------------------------------------------------------
  // ABOMBADO (corona) DEL ENGOMADO — el ajuste de alineación que faltaba
  // -------------------------------------------------------------------------
  // Hallazgo B5 de la revisión de compras: el tambor era CILÍNDRICO, la UCF 207
  // va en taladros redondos y el conducido tenía eje fijo en agujeros redondos.
  // Cinco bandas planas de 4877 mm sin ningún medio de centrado se salen, y la
  // nota que había («16.6 mm de margen de deriva por lado») ACEPTA la deriva en
  // vez de controlarla. Habasit lo dice con todas las letras (web CROWN-HAB-01):
  // «Pulleys with cylindrical shape exert no centering effect to the belt. It is,
  // therefore, of high importance that the conveyor system features at least one
  // measure to keep the belt on center».
  //
  // POR QUÉ UNA CORONA POR CALLE Y NO UNA SOLA SOBRE LOS 370 (calc, y es lo que
  // decide el diseño): una banda se va hacia el punto de MAYOR diámetro. Con una
  // corona única centrada en el tambor, las CINCO bandas migrarían hacia el
  // centro del tambor —las de fuera están a ±152.4 mm— y acabarían montándose
  // unas sobre otras. Cada banda tiene que ver SU PROPIA cima. Por eso el
  // engomado se tornea con 5 coronas, una por eje de calle, y entre ellas un
  // rebaje plano. La cima queda en Ø108.9 EXACTO, que es el diámetro con el que
  // está trazado todo el lazo: el abombado no mueve ni una cota del recorrido.
  //
  // ALTURA (web CROWN-HAB-01): h = 2…3 × (0.001·d + 0.075) para banda de 2 telas
  // contra polea de ACERO → con d = 108.9: 0.368…0.552 mm. Y la misma fuente:
  // «for … applications with lagged pulleys, it is advisable to reduce the height
  // of crown, h, to approximately 50% of the afore-listed values» → 0.184…0.276.
  // Se adopta h = 0.25 mm. Contraste: la única polea abombada que la máquina del
  // cliente ya tiene es la rueda motriz Hytrol 024.15502, «llanta abombada
  // 0,4 mm» (nbt90/normalizado.mjs) — mismo orden de magnitud, y la nuestra va
  // engomada y ella no.
  //
  // ANCHO DE CADA CORONA (web CROWN-HAB-01): «Belt width bo ≤ 100 mm: b = bo +
  // 20 mm» → 32 + 20 = 52. Parte cilíndrica: «bc = bo / 2» → 16 mm.
  // Forma: TRAPEZOIDAL (cilindro central + dos conos). Vale, porque Ammeraal
  // limita la trapezoidal a poleas de ≤ 8" de ancho (web CROWN-AMM-01) y aquí
  // cada corona mide 52 mm = 2.05". Habasit añade que a efectos de tracking la
  // radial y la trapezoidal son equivalentes; se elige la trapezoidal porque se
  // tornea con dos pasadas rectas sobre la goma vulcanizada.
  corona: {
    h: 0.25,                 // cat/calc — web CROWN-HAB-01 (2..3×(0.001·d+0.075), ×50 % por engomado)
    ancho: 52,               // cat — web CROWN-HAB-01: b = bo + 20 con bo = 32
    cilindrica: 16,          // cat — web CROWN-HAB-01: bc = bo / 2
    get cono() { return r3((this.ancho - this.cilindrica) / 2); },     // 18.0 por lado
    get pendiente() { return r3(this.h / this.cono * 1000) / 1000; },  // 0.0139 = 1:72
    // radio de corona equivalente si se prefiere tornear RADIAL en vez de
    // trapezoidal (web CROWN-HAB-01: R = h/2 + b²/(8h))
    get radioEquivalente() { return r3(this.h / 2 + this.ancho ** 2 / (8 * this.h)); },   // 1352.1
    get rebajeOd() { return r3(TAMBOR.od - 2 * this.h); },   // 108.4 — Ø del valle entre coronas
    get paso() { return r3(FIJO.ejes[1] - FIJO.ejes[0]); },            // 76.2 — paso de calle
    get separacionEntreCoronas() { return r3(this.paso - this.ancho); },   // 24.2 de rebaje
    // La fuente que fija cuándo un abombado SIRVE (web CROWN-AMM-01): «This span
    // should be maximized and in the range of 2 to 5 belt widths».
    get tramoLibreMin() { return r3(2 * FIJO.bandaAncho); },   // 64
    get tramoLibreMax() { return r3(5 * FIJO.bandaAncho); },   // 160
    porQueSoloElMotriz: 'sólo se abomba el TAMBOR MOTRIZ. El conducido y los 4 rodillos de retorno '
      + 'quedan cilíndricos: Habasit dice que «tail, deflection, snub, guide and tension pulleys are '
      + 'usually made with cylindrical shape» y Ammeraal que «do not crown adjacent rollers … the '
      + 'different arrangements can counteract each other» (web CROWN-HAB-01 / CROWN-AMM-01). El '
      + 'reglaje fino se hace con las colisas del conducido (CONDUCIDO.soporte.colisa), que NO es un '
      + 'segundo dispositivo de centrado sino el retoque de oblicuidad, y se deja a cero de fábrica.',
  },
  // EJE (cat: barreno del UCF 207) — pasante, soldado a las dos tapas
  eje: { d: 35, material: 'C45 (1045) rectificado h9; asientos de rodamiento k6' },
  ejeX: [-10, 700],                    // calc — ver `rodamientos` y `saliente`
  tapa: { e: 12, get od() { return TAMBOR.tubo.id; }, bore: 35, cuboOd: 60, cuboL: 25, inset: 10 },
  tapaDesig: 'Disco S275JR e=12 torneado Ø82.5 h8 / barreno Ø35 H7, soldado al tubo '
    + '(cordón de rincón 4 mm) y al eje (2 cordones de 5 mm)',
  // ACCIONAMIENTO (dis)
  saliente: { x: [582.868, 700], d: 35, ajuste: 'k6' },   // calc — fuera del inserto +X
  chavetero: 'DIN 6885 A 10 × 8 × 100 (t1 = 5.0 en el eje)',    // cat — Ø35 → 10×8
  chaveteroX: [590, 690],              // dis — dentro del saliente
  motorreductor: 'reductor de EJE HUECO Ø35 H7 con chaveta y brazo de reacción '
    + '(montaje directo sobre el saliente; sin acoplamiento ni alineación)',
  // POR QUÉ EL ACCIONAMIENTO VA EN +X (dis, declarado): el apoyo −X del tambor
  // cae en X = 25.494 (cara exterior del alargue −X de pg40), o sea DENTRO de
  // la máquina, con el chapón del cliente (−109.4…−81.4) por fuera: un saliente
  // a ese lado sería un voladizo de 270 mm colgando un motorreductor. En +X el
  // apoyo está en 561.418, ya fuera del chapón de descarga, y el saliente sale
  // al aire libre con 117 de voladizo. En Y = 0 el lado +X NO es corredor de
  // descarga (el corredor vive en Y −1205…−742, a 742 de aquí).
};

// ---------------------------------------------------------------------------
// 1-bis. LA BANDA — sin esto no se puede emitir el pedido (hallazgo A8)
// ---------------------------------------------------------------------------
// Estaban las 5 bandas en el modelo como «Banda plana 32 × 0.633 … L=4877.64»:
// sin fabricante, sin número de telas, sin cubierta, sin tipo de empalme y con
// una longitud dada a 0.01 mm en una pieza que se fabrica con tolerancia de
// fábrica. Aquí queda la REFERENCIA con la que se pide, y las tres cotas que
// mandan sobre ella. La geometría del lazo la sigue trazando mod_calles: esto
// no la toca (ver `discrepanciaEspesor`).
export const BANDA = {
  ref: 'Habasit SAB-8E 07',            // web BELT-SAB8E-01
  desig: 'Habasit SAB-8E 07 — banda plana de 2 TELAS, capa de tracción de poliéster (PET), cubierta '
    + 'de transporte PVC lisa antracita y cara de polea en tejido PET; 32 mm de ancho',
  telas: 2,                            // web BELT-SAB8E-01
  espesorMm: 2.03,                     // web BELT-SAB8E-01 — 0.08 in
  poleaMinimaMm: 40.6,                 // web BELT-SAB8E-01 — 1.6 in
  kAdmNmm: 12.08,                      // web BELT-SAB8E-01 — 69 lbs/in
  k1pctNmm: 9.98,                      // web BELT-SAB8E-01 — 57 lbs/in
  muDorsoAcero: 0.20,                  // web BELT-SAB8E-01 — dorso sobre polea motriz de ACERO
  muDorsoCama: 0.15,                   // web BELT-SAB8E-01 — dorso sobre cama de inoxidable
  empalme: 'LACED con grapa Clipper 36SP (empalmable EN OBRA) — alternativa: Flexproof sin fin de '
    + 'fábrica. Se PIDE CON GRAPA: es lo que resuelve el hallazgo B4, porque el lazo es cerrado y '
    + 'la única forma de meterlo sin grapa sería desmontar un rodillo de retorno y la polea tensora, '
    + 'o montar las 5 bandas antes de cerrar el bastidor',
  cant: 5,
  // POR QUÉ ÉSTA Y NO LA QUE PONE HYTROL EN LA MÁQUINA HERMANA (calc, y decide):
  // el ProSort MRT 30 lleva «APH 150 HTS x 15/16 in. wide with alligator 125
  // staple lacing» (nbt90 web SORT-006). La APH-150 HTS exige polea mínima de
  // 4.0 in = 101.6 mm (web BELT-SAB8E-01, misma tabla): pasaría por el tambor
  // (108.9) y por el conducido (108.0), pero NO por los CUATRO RODILLOS DE
  // RETORNO, que son Ø88.9. La SAB-8E 07 pide 40.6 mm y pasa por todos con
  // holgura ×2.2 sobre el más pequeño.
  // ⚠ ACTUALIZADO 05-08: el rodillo más pequeño del lazo YA NO es el de retorno
  // de pozo Ø88.9 — con el retorno recto son los dos ELEVADORES Ø48.26 (el
  // B-20760). Sigue cumpliendo (48.26 ≥ 40.6) pero el margen baja de ×2.19 a
  // ×1.19, y encima es flexión INVERSA: ver `ELEVADORES.flexionInversa`, donde
  // queda declarado que la fuente no publica mínimo de contraflexión.
  get poleaMinimaCumple() {
    const menor = RETIRA_POZO.activo ? ELEVADORES.dia : RETORNOS.od;
    return { tambor: TAMBOR.od, conducido: 108.0, retorno: menor, minimoBanda: this.poleaMinimaMm,
      margen: r3(menor / this.poleaMinimaMm), cumpleTodas: menor >= this.poleaMinimaMm,
      flexionInversa: 'los rodillos que cierran el mínimo muerden la CARA PORTANTE (s = −1): '
        + 'la flexión es inversa a la del tambor. La fuente citada no distingue sentido' };
  },
  // LONGITUD DE PEDIDO — y aquí hay que ser exacto sobre lo que NO se sabe.
  // El lazo lo traza mod_calles y lo publica como `banda.largoDesarrollado`. Ese
  // número está medido sobre la superficie que el módulo use como referencia (el
  // DORSO), no sobre la FIBRA NEUTRA, que es por donde se pide una banda. La
  // corrección es la misma para todos los arcos: Δr = e/2 − dorsoDeTrazado,
  // multiplicado por la suma de abrazados del lazo (943.9° = 16.47 rad).
  //
  // Se deja como FUNCIÓN a propósito: el dorso de trazado está en manos de
  // mod_calles/FIJO.bandaEsp y ahora mismo hay otro trabajo en vuelo sobre él
  // (SC-10). Congelar aquí un 4885 sería volver a poner una longitud falsa en un
  // plano, que es justamente el hallazgo A8. El pedido se emite con el número
  // que devuelva esta función alimentada con el `largoDesarrollado` del día.
  sumaAbrazadosRad: 16.47,             // calc — 180+180+96.5+96.5+102.39+102.39+186.12 grados
  pedidoDesde(largoTrazadoMm, dorsoDeTrazadoMm = FIJO.bandaEsp) {
    const correccion = r3(((this.espesorMm / 2) - dorsoDeTrazadoMm) * this.sumaAbrazadosRad);
    const bruto = largoTrazadoMm + correccion;
    const pedido = Math.round(bruto / 5) * 5;          // al escalón de 5 mm
    return { largoTrazadoMm, dorsoDeTrazadoMm, correccionEspesorMm: correccion,
      largoPedidoMm: pedido, toleranciaMm: r3(pedido * this.toleranciaPct / 100) };
  },
  // Valor de referencia con el trazado que este archivo declara HOY (dorso
  // 0.633, largo 4877.64): 4877.64 + 6.29 → 4885 ± 24.4.
  largoTrazadoMm: 4877.64,             // calc — mod_calles con el dorso declarado en FIJO.bandaEsp
  get correccionEspesorMm() { return this.pedidoDesde(this.largoTrazadoMm, 0.633).correccionEspesorMm; },
  get largoPedidoMm() { return this.pedidoDesde(this.largoTrazadoMm, 0.633).largoPedidoMm; },
  toleranciaPct: 0.5,                  // dis — tolerancia de fabricación habitual de banda plana
  get toleranciaMm() { return r3(this.largoPedidoMm * this.toleranciaPct / 100); },   // ±24.4
  // …y por qué esa tolerancia no es un problema: el tensor tiene recorrido de
  // sobra (mod_tensor2 publica 43.5 mm de carrera de polea × 2 ramales ≈ 87 mm
  // de longitud absorbida, params_tensor2 §B4 de la revisión).
  absorbeElTensorMm: 87,
  discrepanciaEspesor: 'DECLARADA, no corregida aquí: FIJO.bandaEsp = 0.633 (convenio del cliente) '
    + 'contra los 2.03 reales de catálogo. Es exactamente lo que canta la comprobación SC-10 del '
    + 'generador; corregirlo mueve tambor, conducido, RR1…RR4 y las 20 regletas UHMW, o sea es otro '
    + 'encargo. La REFERENCIA de compra sí queda cerrada.',
  fuente: 'web BELT-SAB8E-01 (Habasit, Fabric and Round Belts Product Range 4080)',
};

// ---------------------------------------------------------------------------
// 1-ter. EL ACCIONAMIENTO — tampoco estaba en la lista (hallazgo A11)
// ---------------------------------------------------------------------------
// El interfaz estaba escrito (TAMBOR.motorreductor) y la potencia publicada por
// la compuerta, pero el motorreductor NO EXISTÍA como línea de compra. Aquí
// queda, con su especificación y con el conflicto DECLARADO, no maquillado.
export const ACCIONAMIENTO = {
  interfaz: 'eje HUECO Ø35 H7 con chavetero para chaveta DIN 6885 A 10×8×100 y brazo de reacción; '
    + 'montaje directo sobre el saliente del tambor (X 582.868…700), sin acoplamiento ni alineación',
  potenciaMinW: 450,                   // calc — lo publica mod_tambores (arrastre)
  rpmSalida: 325.325,                  // calc — ídem
  parMinNm: 11,                        // calc — 10.17 redondeado al alza
  candidato: 'Motovario NMRV-P090 (barreno hueco de salida Ø35, brida IEC 80–112) con motor IEC 80 '
    + 'de 0.55 kW · web MOT-003 — CANDIDATO, no elección: demuestra que el interfaz existe en '
    + 'catálogo. La relación no se cierra aquí (ver `relacionAbierta`)',
  relacionAbierta: '325 rpm de salida con un motor de 4 polos son i = 4.3, que un sinfín no da: hay '
    + 'que elegir entre reductor coaxial/ortogonal de i ≈ 4 o sinfín de i ≈ 15 con variador. Lo cierra '
    + 'el cliente al fijar la velocidad de banda, que su propia ficha declara «determined by '
    + 'application requirements» (nbt90 web SORT-018)',
  // ⚠ CONFLICTO CON LO QUE EL CLIENTE YA TIENE — se dice, no se tapa:
  conflictoConElMotorDelCliente: 'el motorreductor principal del cliente (CTX 314759014, web MOT-002) '
    + 'NO SIRVE para este tambor, por DOS motivos independientes: (1) está en X = −172, el lado '
    + 'CONTRARIO al saliente, que sale en X 582.868…700 — y el saliente no se puede pasar a −X porque '
    + 'ahí el apoyo cae dentro de la máquina y quedaría un voladizo de 270 mm; (2) tiene eje MACIZO '
    + 'Ø28 (web MOT-002) frente al hueco Ø35 H7 que pide este interfaz. Ni desplazándolo vale. Es '
    + 'COMPRA NUEVA, y el motor viejo queda libre o se retira.',
  espacioPendiente: 'SIN CERRAR: entre el cuerpo del UCF 207 (+X, llega a X ≈ 572) y el final del eje '
    + '(700) hay 128 mm de saliente útil. Una campana IEC 80–112 mide 150–250 mm de DIÁMETRO, así que '
    + 'cabe en X pero hay que comprobar que su envolvente no muerde el chapón de descarga ni la guarda. '
    + 'Requiere la ficha del reductor elegido: no se puede cerrar con lo que hay.',
  masaPendiente: 'la MASA del reductor sigue en web_facts.pendientes_sin_fuente: en el rango 15–30 kg '
    + 'la reacción del apoyo +X sube de 700 N a 869–1037 N (+24 a +48 %).',
};

// ---------------------------------------------------------------------------
// 2. LOS APOYOS DEL TAMBOR — UCF 207 (web BRG-UCF207-01/02)
// ---------------------------------------------------------------------------
// ⚠ CORRECCIÓN DE INTERFAZ PARA pg40 (lo pedía su propio AVISO):
// pg40 publicó `caraApoyo … rodamientos hacia el interior (inboard)` sobre las
// caras INTERIORES del alargue (67.494 / 491.418). NO CABE, y el número es
// éste: el cuerpo del UCF 207 sobresale 44.4 de su cara de montaje (web), así
// que hacia dentro llegaría a X = 111.894 y a 447.018 — y la banda 1 empieza en
// 111.056 y la banda 5 acaba en 447.856. La cara útil del tambor se quedaría en
// 335.124 cuando las bandas piden 336.8: faltarían 1.676 mm y las dos bandas
// exteriores se saldrían del tambor.
// SOLUCIÓN (dis, sin mover el alargue, que era la otra alternativa que pg40
// ofrecía): la unidad se atornilla por FUERA.
//   · lado −X: contra la cara EXTERIOR del alargue (X = 59.494) → el cuerpo se
//     va hacia −X, al aire, y la cara del tambor gana los 44.4.
//   · lado +X: contra la cara EXTERIOR del CHAPÓN de descarga (X = 527.418).
//     Ahí no vale el alargue: su cara exterior (499.418) está en contacto plano
//     con el chapón, y una unidad montada sobre ella tendría el cuerpo dentro
//     del chapón. Los 4 pernos M12 pasan alargue (8) + chapón (28) = 36 mm de
//     acero, que es mejor apoyo que los 8 solos. Taladros nuevos en el chapón:
//     MODIFICACIÓN DECLARADA (pg40 ya declara otros 8 por lado).
export const UCF207 = {
  desig: 'UCF 207',                    // web BRG-UCF207-01
  norma: 'unidad de rodamiento de brida cuadrada de 4 tornillos, inserto UC207 '
    + 'con prisioneros (JIS B 1558 / ISO 9628)',
  bore: 35,                            // web BRG-UCF207-01 — «Bore diameter: 35 mm»
  brida: 117,                          // web BRG-UCF207-01 — L «4.5937 in / 117.0 mm»
  J: 92,                               // web BRG-UCF207-01 — J «3.6250 in / 92.0 mm»
  N: 14,                               // web BRG-UCF207-01 — N «0.5469 in / 14.0 mm»
  perno: 'M12 ISO 4017 8.8 + tuerca ISO 7040 + arandelas',   // cat — Ø14 aloja M12
  bridaE: 16,                          // web BRG-UCF207-02 — AMI «g = 16 mm»
  saliente: 44.4,                      // web BRG-UCF207-01/02 — A0 / Z «44.4 mm»
  aOffset: 34,                         // web BRG-UCF207-01/02 — NTN A (= A1 15 + A2 19)
  //   y AMI x = 34: separación entre la cara de montaje y el plano medio del
  //   rodamiento. Es la ÚNICA cota de las citadas cuya lectura no es literal en
  //   la fuente (se declara): NO afecta al taladrado, sólo a cuánto eje hace
  //   falta por fuera, y aquí sobra eje por los dos lados.
  Bi: 42.9,                            // web BRG-UCF207-01/02 — ancho del aro interior
  insertoOd: 72,                       // cat — UC207 = 6207 de aro exterior esférico
  C: 25700, C0: 15300,                 // web BRG-UCF207-01 — N (25.70 / 15.30 kN)
  get semi() { return r3(this.J / 2); },        // 46.0 calc
  pasoEje: 45,                         // dis — taladro de paso del eje en el alma
  //   (= pg40 UCF207.pasoEje: Ø35 + 10 de holgura de montaje)
  // Caras de montaje y centros del inserto (calc):
  caraX: [59.494, 527.418],            // −X cara exterior del alargue · +X cara
  //   exterior del chapón de descarga
  normal: [-1, 1],                     // hacia dónde crece el cuerpo desde su cara
  get insertoX() { return [r3(this.caraX[0] - this.aOffset), r3(this.caraX[1] + this.aOffset)]; },
  //   [25.494, 561.418] — planos medios de los dos rodamientos
  get vano() { return r3(this.insertoX[1] - this.insertoX[0]); },   // 535.924 calc
};

// ---------------------------------------------------------------------------
// 3. EL RODILLO CONDUCIDO (descansos interiores, eje fijo pasante)
// ---------------------------------------------------------------------------
// Ø ELEGIDO: Ø108.0 (tubo Ø108 × 3.6, EN 10220). Los tres criterios, con número:
//   (1) RELACIÓN CON EL TAMBOR: 108.0 / 108.9 = 0.992. Igualar el Ø del tambor
//       engomado es lo que deja el ramal PORTANTE y el de RETORNO horizontales
//       de punta a punta (los dos ejes quedan a la misma cota, ±0.45): ni cuñas
//       de reglaje ni banda trabajando en rampa.
//   (2) Ø MÍNIMO DE POLEA de la banda: NO se ha encontrado ficha citable del
//       Ø mínimo de una banda plana angosta de 2 telas (queda anotado en
//       ../web_facts.json → pendientes_sin_fuente, y el cliente lo cierra con
//       su proveedor). Lo que SÍ es dato firme del repo: la misma familia de
//       banda plana de 1" corre en el NBT90 sobre rueda motriz Ø63.5 y poleas
//       locas Ø63.5 (nbt90 P.ruedaDia / P.idlerDia, cat+med). Ø108 es 1.7 veces
//       ese diámetro ya probado en la máquina, así que la flexión no es el
//       criterio que manda aquí: manda (3).
//   (3) FLECHA CON LA TENSIÓN: con el eje FIJO Ø35 y el vano de 411.9 entre
//       soportes, la carga de 1290.5 N (5 bandas × 2 ramales × 129.05 N,
//       tensor2 TENSION) deja σ = 18.7 MPa y δ = 0.076 mm (calc en mod_tambores,
//       se reporta). Un Ø88.9 también aguantaría, pero perdería (1).
// Si el conducido bajara a Ø88.9 su eje quedaría 10 más alto y el ramal de
// retorno saldría a Z −46.3, POR ENCIMA del fondo del perfil PG40 (Z −40 …
// pg40 Z.travBot): chocaría con los travesaños. Otro número que manda Ø108.
export const CONDUCIDO = {
  tubo: { od: 108.0, e: 3.6, get id() { return r3(this.od - 2 * this.e); } },   // 100.8 cat
  tuboDesig: 'Tubo Ø108 × 3.6 EN 10220, acero S275JR',
  get od() { return this.tubo.od; },
  get r() { return r3(this.od / 2); },                       // 54.0
  cara: 360,                           // dis — 10 menos que la cara engomada del
  //   tambor: sigue cubriendo las 5 bandas (99.456…459.456 sobre 111.056…447.856,
  //   11.6 de margen por lado) y deja 20 mm de eje libre en cada testa para el
  //   COLLAR DE APRIETE, que va por dentro de su pletina (ver `collar`)
  get tuboX() { return [r3(Xc - this.cara / 2), r3(Xc + this.cara / 2)]; },   // 89.456…469.456
  // EJE FIJO PASANTE Ø35 (dis): el mismo Ø que el del tambor — una sola barra
  // en el pedido, un solo Ø de asiento. Con Ø35 el rodamiento es 6207-2RS.
  eje: { d: 35, material: 'C45 h9', gira: false },
  ejeX: [62, 497],                     // calc — muere DENTRO de las pletinas
  //   (67.494…79.494 y 479.418…491.418): no asoma al chapón de descarga
  rodam: { bore: 35, od: 72, w: 17, desig: '6207-2RS', C: 25500, C0: 15300 },  // cat/web BRG-6207-01
  //   ⚠ REVISIÓN ESTRUCTURAL 2026-08-03: el id `BRG-6207` que había aquí NO
  //   EXISTÍA en ningún web_facts.json — el C y el C0 estaban sin procedencia.
  //   Se ha añadido el hecho BRG-6207-01 (Timken, cita verbatim): C = 25 700 N,
  //   C0 = 15 300 N. El C declarado arriba (25 500) queda 0.8 % POR DEBAJO del
  //   de catálogo, o sea del lado seguro: no se toca. La compuerta §S (SC-07)
  //   calcula la vida con el 25 700 citado.
  // Soporte del eje fijo (dis): pletina 117 × 117 × 12 con barreno Ø35 H8 y
  // collar de apriete partido; se atornilla al MISMO patrón 92 × 92 del UCF 207
  // que pg40 ya taladra, en la cara INTERIOR del alargue. Así pg40 no cambia el
  // taladrado entre una estación y otra: cambia la pieza que se le atornilla.
  //
  // ⚠ AÑADIDO 03-08-2026 (revisión de compras B5) — REGLAJE DE ALINEACIÓN.
  // Los 4 taladros de cada pletina pasan de REDONDOS a COLISAS en Y (dirección
  // de la banda). El patrón 92×92 del alargue NO se toca: la colisa está en MI
  // pletina, así que pg40 no cambia ni un taladro. Moviendo las dos pletinas a
  // la vez se hace TAKE-UP; moviéndolas en sentidos opuestos se OBLICUA el
  // rodillo, que es el reglaje de tracking que faltaba (ver TAMBOR.corona: el
  // centrado lo da la corona del tambor motriz; esto es el retoque fino).
  soporte: { e: 12, lado: 117, bore: 35, patron: 92, taladro: 13.5,
    caraX: [67.494, 491.418], normal: [1, -1],
    colisa: {
      carrera: 6.0,                    // dis — ±6 mm por pletina sobre el nominal
      get largo() { return r3(13.5 + 2 * this.carrera); },   // 25.5 de colisa
      // separación entre las DOS pletinas = luz entre caras de montaje (calc)
      vano: 423.924,                   // = caraX[1] − caraX[0]
      get oblicuidadMaxDeg() {         // reglaje diferencial máximo (+6 / −6)
        return r3(Math.atan(2 * this.carrera / this.vano) * 180 / Math.PI);
      },                               // 1.622°
      nota: 'reglaje DIFERENCIAL (una pletina hacia +Y, la otra hacia −Y). La banda deriva hacia el '
        + 'lado donde el rodillo va ADELANTADO; con 1 mm de diferencia entre pletinas la oblicuidad es '
        + '0.135°, que es el orden del retoque real. La carrera completa (±6) está para el montaje, no '
        + 'para el uso diario. Se bloquea con los propios 4 pernos M12 de cada pletina.',
    },
  },
  collar: 'Mädler 62343500 — collar de apriete PARTIDO en dos mitades (double-split), acero C45 '
    + 'pavonado, Ø35 int × Ø57 ext × 15, 2 tornillos M6×18 DIN 912 12.9 · web COLL-SPLIT-01 '
    + '(equiv. Ruland MSP-35-SS / Misumi SSCS35). Retención axial del eje fijo. NO es DIN 705 A: '
    + 'esa norma es el anillo MACIZO con prisionero y aquí el collar TIENE que ser partido, porque '
    + 'entra en el hueco de 20 mm entre la testa del tubo y su pletina con el eje ya pasado',
  collarDe: 57,                        // cat COLL-SPLIT-01 — d2 (antes 55, sin fuente)
  collarR: 61.6,                       // cat COLL-SPLIT-01 — envolvente sobre la cabeza del tornillo
  tapa: { e: 10, inset: 8 },           // tapa-soporte prensada en el tubo, con
  //   hombro de tope axial del aro exterior — mismo esquema que nbt90/rodillos
  anillo: 'DIN 471 Ø35 (retención del aro interior contra el casquillo)',
};

// ---------------------------------------------------------------------------
// 4. EL RAMAL DE RETORNO — POR EL CORREDOR, RECTO (corrección del cliente 03-08)
// ---------------------------------------------------------------------------
// ⚠ ESTE BLOQUE SE REESCRIBIÓ EL 05-08-2026. Lo que decía antes —«el retorno NO
// cabe recto porque el tambor es Ø108.9: su ramal sale a Z −59.07 y el suelo del
// corredor está en −9.87, faltan 49.2 mm; para entrar, el tambor tendría que
// bajar a Ø ≤ 59.7»— es ARITMÉTICA CORRECTA SOBRE UNA HIPÓTESIS FALSA. Daba por
// supuesto que el ramal de retorno tiene que ir RECTO DESDE LA TANGENTE DEL
// TAMBOR hasta el módulo, y por eso concluía que el Ø del tambor gobierna la
// cota del corredor. No la gobierna: entre el tambor y el módulo hay 742 mm de
// Y libre, y subir 49.2 mm en 742 mm es una RAMPA DE 3.8°. El Ø del tambor fija
// dónde ARRANCA el ramal, no por dónde CRUZA la transferencia.
//
// LO QUE PIDE EL CLIENTE (instrucción literal del 03-08, sobre el croquis de
// vistas/sco_corte_calle3.png): «la banda debe seguir linea roja asi fue
// concebido, eliminar poleas "x" incluso para asegurar no interferencias existen
// los rodillos (verdes) que tenias uno en modelo anterior esa era funcion».
//   · LÍNEA ROJA  = el ramal de RETORNO cruza la transferencia RECTO, a la cota
//                   alta, por el mismo corredor del peine que ya usa el portante.
//   · 4 ASPAS     = RR1…RR4 y el pozo: FUERA (bandera `RETIRA_POZO`).
//   · 2 CÍRCULOS  = dos RODILLOS ELEVADORES, uno a cada lado de la huella del
//                   módulo, que suben el ramal a la cota del corredor. El
//                   cliente señala que «tenías uno en el modelo anterior»: es el
//                   RODILLO DE RETORNO B-20760 del NBT90, cuya función declarada
//                   en su propio despiece es «limita los ramales de retorno de
//                   las bandas del anfitrión» (nbt90/rodillos.mjs §2). Estaba en
//                   el ensamble y lo sacó mod_ctx.EXCLUIR_NBT90 con el motivo
//                   «aquí no limita ningún ramal (el retorno pasa a −358.95)».
//                   Con el retorno recto vuelve a limitarlo: por eso vuelve.
//
// LA COTA DEL CORREDOR (calc, y es la que manda sobre todo lo demás):
//   suelo útil  Z −9.87 = techo del motorreductor SEW del cassette (−11.87,
//               medido sobre su caja real por la §R) + 2 de holgura.
//   la ranura del peine mantiene el ancho pleno (42) para la banda de 32 hasta
//               Z −18.14, o sea 8.27 mm POR DEBAJO de donde va el ramal: la
//               limitación no es la ranura, es el motorreductor.
//   techo       Z 13.28 = cara inferior de la pletina del puente de calle.
//   El NBT90 declara el retorno de su anfitrión en Z −11.57…−9.07 por este mismo
//   hueco. El nuestro va 1.7 mm más alto porque exigimos 2 mm al SEW donde el
//   anfitrión se conforma con 0.3. Es el PRECEDENTE, y nos parecemos a él.
//
// LOS DOS RODILLOS ELEVADORES (dis, con el porqué de cada cota):
//   · Y: **LOS MISMOS SITIOS QUE OCUPABAN RR1 Y RR4**, que son los dos rodillos
//     de hombro del pozo — uno a cada lado de la huella del módulo, que es
//     exactamente donde el cliente dibuja sus dos círculos verdes. RE-N hereda
//     el bolsillo de RR1 (Y −606) y RE-S el de RR4, corrido a −1360.
//     Y NO es una elección estética: es el ÚNICO hueco donde caben. La ménsula
//     es una pletina de 100×100 (patrón 76×76) y tiene que vivir entre los
//     travesaños del PG40, que la atraviesan de lado a lado:
//       norte  hueco libre Y (−672 … −470) tras correr el travesaño de −555 a
//              −450 (ver más abajo): 202 mm → la pletina (−656…−556) entra con
//              16 mm al travesaño de puente y 86 al de −450.
//       sur    hueco libre Y (−1420 … −1300): 120 mm → la pletina (−1410…−1310)
//              entra con 10 mm por cada lado. Ese hueco fija RE-S entre −1370 y
//              −1350; se toma −1360, el centro.
//     Se probaron los bolsillos pegados al módulo (−739 y −1218, que es donde
//     está el B-20760 del NBT90): la BANDA cabe, pero la PLETINA no —al norte
//     sólo hay 67.7 mm entre la placa peine (−779.72) y el travesaño de puente
//     (−712)— y habría que inventar un patrón de taladros más pequeño que el
//     76×76 que el alargue ya lleva. Se descarta y queda dicho.
//   · Ø: 48.26 (1.9") = el B-20760 que el cliente señala. Es además el Ø máximo
//     que admite el hueco norte más estrecho que se estudió (54 mm).
//   · Z: eje en −34.0 = suelo del corredor (−9.87) − radio (24.13). El rodillo
//     TANGENTE POR ARRIBA al ramal, igual que el B-20760 en el NBT90.
//
// ⚠ LO QUE ESTO LE CUESTA AL BASTIDOR PG40, dicho aquí y no escondido: el ramal
// de retorno pasa a ocupar la franja Z −40…0 que hasta ahora era SÓLO del
// bastidor (los travesaños cuelgan bajo los largueros y el retorno les pasaba 19
// mm por debajo). Cuatro travesaños se cruzan con el ramal nuevo y hay que
// moverlos — está en adapt/params_pg40.mjs §4 y §A6, con el número de cada uno.
//
// ⚠ EL ELEVADOR TOCA LA CARA PORTANTE Y HACE FLEXIÓN INVERSA — declarado, no
// escondido. En el convenio de `bandaFaces` (lib.mjs) los elementos con s = −1
// muerden el contorno EXTERIOR del lazo, que en el ramal de retorno es la cara
// de transporte (la sucia, la que lleva el bulto). Los dos elevadores son s = −1,
// así que la banda los envuelve por su cara portante y se dobla al REVÉS que
// sobre el tambor. Es inevitable en esta arquitectura —el ramal tiene que subir
// y sólo se sube empujando desde abajo— y es lo mismo que hace el B-20760 con
// los ramales del anfitrión. No es nuevo en este lazo: RR1 y RR4 (Ø88.9) y los
// dos volantes de horquilla (Ø100) ya lo hacían. Radio mínimo de flexión y
// margen frente al catálogo: `ELEVADORES.flexionInversa`.
export const ELEVADORES = {
  ref: 'Hytrol B-20760 «1.9 in. OD Galv Return Roller — ABEC-1 (Specify BR −1-1/4)»',
  fuente: 'nbt90/bastidor.mjs `rodRetorno` + nbt90/rodillos.mjs §2 (item 22 del despiece de la '
    + 'pág. 13 del manual; item 9 del de la pág. 12). Es la MISMA referencia que la transferencia '
    + 'ya lleva y la que el cliente señala en su croquis',
  dia: 48.26,                          // cat B-20760 «1.9 in. OD» (nbt90 med 48.03, −0.5 %)
  get r() { return r3(this.dia / 2); },                      // 24.13
  pared: 1.65,                         // cat Interroll 1.9" C/S galvanizado 0.065" (nbt90)
  eje: { d: 12.7, material: 'acero estirado en frío 1/2"', gira: false },   // cat 1/2" ED&T
  rodam: { bore: 12.7, od: 28.575, w: 7.938, desig: 'R8-2RS' },   // cat ABEC-1 (nbt90 L.retRodam)
  rosca: '1/4-20 UNC-2B ED&T × 15.88 (5/8") en las dos puntas del eje',   // cat (nbt90)
  // CARA: la misma que el conducido y que los retornos que se retiran — cubre las
  // 5 bandas (111.056…447.856) con 11.6 de margen por lado y deja 20 mm de eje
  // libre en cada testa para el collar. No se usa la regla «BR − 1-1/4"» del
  // catálogo porque aquí el rodillo NO se atornilla al alma de un canal Hytrol
  // sino a las pletinas del alargue PG40, que es otro vano.
  cara: 360,                           // dis
  get tuboX() { return [r3(Xc - this.cara / 2), r3(Xc + this.cara / 2)]; },
  ejeX: [62, 497],                     // calc — igual que el conducido y los retornos
  // MÉNSULA: la que YA existe para los rodillos de retorno (patrón 76×76,
  // taladro Ø11) — no se inventa un amarre nuevo. Cambia el barreno, que pasa de
  // Ø30 a Ø12.7.
  // ⚠ EL CUADRADO DE 100 NO ENTRA, y el número es éste: el bolsillo del lado sur
  // mide 94 mm limpios —de la «Ménsula alma↔travesaño Y −1412» (cara −1404) a la
  // «Escuadra travesaño de puente↔chapón sur» (cara −1310)— y las dos piezas
  // viven en el MISMO plano de chapa que esta pletina. Así que la pletina se
  // estrecha en Y a 88 (3 mm de aire a cada vecina) y CONSERVA los 100 en Z, que
  // es la dirección donde no estorba nadie: patrón 64 (Y) × 76 (Z), distancia al
  // canto 12 en las dos direcciones (la misma que tenían las pletinas de los
  // rodillos de pozo). No cuesta nada aguas abajo porque el alargue PG40 todavía
  // NO ha taladrado este cuadro: es una interfaz DECLARADA PENDIENTE
  // (`interfazPG40.retornosNecesitanMensula`). Y no cuesta nada mecánicamente: la
  // resultante sobre un elevador es 2·T·sen(abrazado/2) = 16 N por banda, contra
  // los 192 N que llevaba un rodillo de hombro del pozo.
  soporte: { e: 12, ladoY: 88, ladoZ: 100, bore: 12.7,
    patronY: 64, patronZ: 76, taladro: 11,
    get lado() { return this.ladoZ; }, get patron() { return this.patronZ; },
    caraX: [67.494, 491.418], normal: [1, -1] },
  collar: 'Mädler 62341270 — collar de apriete PARTIDO en dos mitades (double-split), acero C45 '
    + 'pavonado, Ø12.7 int × Ø30 ext × 11, 2 tornillos M4×12 DIN 912 12.9 · web COLL-SPLIT-01 '
    + '(misma familia y mismo fabricante que los Ø30 y Ø35 del resto del lazo; el Ø y el largo son '
    + 'los de la talla 1/2" de esa familia). Retención axial del eje fijo',
  collarDe: 30,                        // cat COLL-SPLIT-01 (talla 1/2")
  collarR: 34,                         // cat — envolvente sobre la cabeza del tornillo
  tapa: { e: 8, inset: 6 },
  anillo: 'DIN 471 Ø12',
  // POSICIONES (dis — el hueco libre a cada lado, medido sobre el ensamble
  // emitido; ver el bloque de arriba). `s` = −1 en el convenio de bandaFaces:
  // la banda los envuelve POR ARRIBA y los toca con su CARA PORTANTE.
  // ⚠ RE-S NO ESTÁ EN EL CENTRO DE SU HUECO, y el motivo es una pieza concreta:
  // la «Ménsula alma↔travesaño (Y −1412)» del PG40 —la escuadra soldada que
  // amarra el alargue al travesaño de −1440— ocupa Y −1420…−1404 en el MISMO
  // plano de chapa que la pletina del elevador. Con RE-S en −1360 la pletina
  // (−1410…−1310) se le metía 6 mm. El hueco real es (−1404, −1300) = 104 mm
  // para una pletina de 100, así que RE-S sólo puede estar entre −1354 y −1350.
  y: { norte: -606, sur: -1357 },
  // Hueco libre en Y para la PLETINA de 100 (que es lo que manda, no el rodillo)
  huecoLibre: {
    norte: { entre: ['PG40 Travesaño de puente norte (cara −672)', 'PG40 Travesaño Y −450 (cara −470)'],
      mm: 202, pletinaY: [-650, -562], holguraPorLado: [22, 92] },
    sur: { entre: ['PG40 Ménsula alma↔travesaño Y −1412 (cara −1404)', 'PG40 Travesaño de puente sur (cara −1300)'],
      mm: 94, pletinaY: [-1401, -1313], holguraPorLado: [3, 3] },
    descartado: 'los bolsillos pegados a la huella (−739 y −1218, donde el NBT90 pone su B-20760): '
      + 'la banda cabe, la pletina de 100 no — al norte sólo quedan 67.7 mm entre la placa peine '
      + '(−779.72) y el travesaño de puente (−712), y exigiría un patrón menor que el 76×76 que el '
      + 'alargue PG40 ya taladra para los rodillos de retorno',
  },
  // FLEXIÓN INVERSA — el número que hay que declarar (calc + web BELT-SAB8E-01)
  get flexionInversa() {
    return {
      cara: 'PORTANTE (la de transporte, la que lleva el bulto)',
      sentido: 'INVERSO al del tambor motriz y al del conducido',
      diaFlexionMm: this.dia,                       // 48.26
      diaMinimoCatalogoMm: BANDA.poleaMinimaMm,     // 40.6 web BELT-SAB8E-01
      margen: r3(this.dia / BANDA.poleaMinimaMm),   // 1.189
      cumple: this.dia >= BANDA.poleaMinimaMm,
      // LO QUE LA FUENTE NO DICE, y se dice: la tabla de Habasit publica UN
      // «Pulley diameter, minimum» (1.6 in) y NO distingue flexión directa de
      // inversa. Ninguna fuente citable del repositorio da un Ø mínimo de
      // CONTRAFLEXIÓN para esta banda. Queda declarado como pendiente con dueño
      // (../web_facts.json → pendientes_sin_fuente) y NO se sustituye por una
      // regla de pulgar del tipo «×1.5 en contraflexión».
      pendiente: 'web BELT-SAB8E-01 no publica Ø mínimo de CONTRAFLEXIÓN; el 40.6 citado es el '
        + 'mínimo de polea sin distinguir sentido. Con 48.26 se cumple el único número citable, con '
        + 'un margen de 1.19. Si el proveedor da un mínimo de contraflexión mayor que 48.26, el hueco '
        + 'libre del lado norte (54 mm) NO admite un rodillo más grande: habría que mover el travesaño '
        + 'de puente norte, y eso está dicho aquí para que se pregunte antes de comprar la banda',
      precedenteEnEsteLazo: 'no es nuevo: los volantes de horquilla Ø100 del cliente y los RR1/RR4 '
        + 'Ø88.9 que se retiran ya mordían la cara portante con s = −1. El elevador es el más pequeño '
        + 'de los tres, y es el que fija el radio mínimo de flexión inversa del lazo',
      precedenteEnLaMaquina: 'el B-20760 del NBT90 hace exactamente esto mismo, con el mismo Ø, '
        + 'contra los ramales de retorno del anfitrión',
    };
  },
};

// ---------------------------------------------------------------------------
// 4-bis. LOS CUATRO RODILLOS DE RETORNO DE POZO — RETIRADOS POR BANDERA
// ---------------------------------------------------------------------------
// Se conservan la tabla y el código: `RETIRA_POZO.activo = false` devuelve el
// pozo entero (rodillos, guardas y ramal por debajo) tal como estaba. Lo que ya
// NO vuelve es la justificación de arriba, que era falsa.
//   RR1  Y −606   bajaba el ramal        RR2  Y −672   fondo del pozo, norte
//   RR3  Y −1280  fondo del pozo, sur    RR4  Y −1325  lo subía al conducido
export const RETORNOS = {
  tubo: { od: 88.9, e: 3.2, get id() { return r3(this.od - 2 * this.e); } },   // 82.5 cat
  get od() { return this.tubo.od; },
  get r() { return r3(this.od / 2); },                       // 44.45
  cara: 360,                           // dis — igual que el conducido
  get tuboX() { return [r3(Xc - this.cara / 2), r3(Xc + this.cara / 2)]; },
  eje: { d: 30, material: 'C45 h9', gira: false },           // dis — ver §6 (flecha)
  ejeX: [62, 497],                     // calc — igual que el conducido
  rodam: { bore: 30, od: 62, w: 16, desig: '6206-2RS', C: 20300, C0: 11200 },  // cat/web BRG-6206-01
  //   ⚠ REVISIÓN ESTRUCTURAL 2026-08-03: igual que en el conducido, el id
  //   `BRG-6206` no existía. El hecho citable es BRG-6206-01 (Timken): C =
  //   19 500 N, C0 = 11 300 N. Aquí el C declarado (20 300) está 4.1 % POR
  //   ENCIMA del de catálogo, es decir del lado INSEGURO. No se corrige desde
  //   la revisión (el número es de este módulo), pero la compuerta §S (SC-07)
  //   calcula la vida con el 19 500 citado. Con C/P ≈ 30 la conclusión no
  //   cambia; el dato sí hay que corregirlo.
  soporte: { e: 12, lado: 100, bore: 30, patron: 76, taladro: 11,
    caraX: [67.494, 491.418], normal: [1, -1] },
  // ⚠ CORREGIDO 03-08-2026 (revisión de compras A3): decía «DIN 705 A», que es
  // el anillo MACIZO con prisionero. No existe DIN 705 partido, así que la
  // línea no se podía pedir. Referencia real de collar PARTIDO, citada:
  collar: 'Mädler 62343000 — collar de apriete PARTIDO en dos mitades (double-split), acero C45 '
    + 'pavonado, Ø30 int × Ø54 ext × 15, 2 tornillos M6×18 DIN 912 12.9 · web COLL-SPLIT-01 '
    + '(equiv. Ruland MSP-30-SS / Misumi SSCS30)',
  collarDe: 54,                        // cat COLL-SPLIT-01 — d2 (antes 50, sin fuente)
  collarR: 58.6,                       // cat COLL-SPLIT-01 — envolvente sobre la cabeza del tornillo
  tapa: { e: 10, inset: 8 },
  anillo: 'DIN 471 Ø30',
  holguraFondo: 20.0,                  // dis — aire entre el dorso del ramal de
  //   fondo y la cara inferior del NBT90 (Z −338.267)
};

// ---------------------------------------------------------------------------
// 5. LA GEOMETRÍA DEL LAZO (calc) — de aquí cuelga todo lo demás
// ---------------------------------------------------------------------------
// El DORSO de la banda rueda sobre el tambor y sobre el conducido, así que el
// eje de cada uno está a `planoDorso − radio`. Todas las cotas de retorno salen
// por tangencia de ahí; ninguna se escribe a mano.
const zEjeTambor = r3(FIJO.planoDorso - TAMBOR.r);            // 51.7 − 54.45 = −2.75
const zEjeConducido = r3(FIJO.planoDorso - CONDUCIDO.r);      // 51.7 − 54.0  = −2.30
// dorso del ramal de retorno al salir de cada extremo (calc):
const zRetTambor = r3(zEjeTambor - TAMBOR.r);                 // −57.2
const zRetConducido = r3(zEjeConducido - CONDUCIDO.r);        // −56.3
// cara de la banda en el retorno (la que tocan RR1 y RR4, que van POR DEBAJO):
const zCaraRetTambor = r3(zRetTambor - FIJO.bandaEsp);        // −57.833
const zCaraRetConducido = r3(zRetConducido - FIJO.bandaEsp);  // −56.933
// ramal de fondo: cara ALTA del lazo bajo el módulo (la que se juega la holgura)
const zFondoAlto = r3(FIJO.fondoNbt90 - RETORNOS.holguraFondo);   // −358.267

// ---------------------------------------------------------------------------
// 5-bis. EL CORREDOR RECTO — la cota que gobierna el retorno nuevo
// ---------------------------------------------------------------------------
// Las tres cotas son MEDIDAS sobre el ensamble emitido (la §R las vuelve a medir
// por su cuenta sobre el boceto real de las placas peine y sobre la caja real
// del motorreductor: aquí NO se declara nada que la compuerta no compruebe).
export const CORREDOR = {
  techoMovilZ: -11.87,     // med — techo del motorreductor SEW RF07DRS71S4 del
  //   cassette (NBT90 MÓVIL, Y −1175.35…−793.35, X 206.96…351.96). Es la pieza
  //   más alta bajo la ranura en las calles 2-4 y la que fija el suelo.
  holguraAlTecho: 2.0,     // dis — la misma holgura mínima que el resto del módulo
  get sueloZ() { return r3(this.techoMovilZ + this.holguraAlTecho); },       // −9.87
  fondoRanuraBandaZ: -18.14,   // med — cota más baja a la que la ranura del peine
  //   sigue teniendo los 42 mm de ancho pleno para la banda de 32
  techoZ: 13.28,           // calc — cara inferior de la pletina del puente de calle
  // CARA PORTANTE (exterior) del ramal recto = suelo del corredor. El dorso queda
  // un espesor por ENCIMA, porque en el retorno la banda va del revés.
  get zCara() { return this.sueloZ; },                                       // −9.87
  get zDorso() { return r3(this.zCara + FIJO.bandaEsp); },                   // −7.37
  get holguraRanura() { return r3(this.zCara - this.fondoRanuraBandaZ); },   // 8.27
  get holguraPuente() { return r3(this.techoZ - this.zDorso); },             // 20.65
  anfitrionZ: [-11.57, -9.07],   // nbt90 — donde la transferencia declara el ramal
  //   de retorno de SU anfitrión, por este mismo hueco. Es el precedente.
  nota: 'el ramal de retorno del sorter va 1.7 mm más alto que el que el NBT90 declara para su '
    + 'anfitrión porque exigimos 2 mm al motorreductor donde el anfitrión se conforma con 0.3',
};

// ---------------------------------------------------------------------------
// 5-ter. LO QUE RETIRA EL RETORNO RECTO (bandera, no borrado)
// ---------------------------------------------------------------------------
// El pozo entero: los 4 rodillos RR1…RR4 con todo su conjunto (tubos, tapas,
// rodamientos, casquillos, anillos, ejes, pletinas, collares y tornillería) y
// las 4 guardas de pozo con su ferretería. Con `activo: false` vuelve todo.
//
// ⚠ ANCLAJE DE LAS EXPRESIONES. Esta misma noche han salido TRES fallos por
// regex demasiado ancha (94f7271, 6b4e780 y el de los casquillos de guarda), así
// que aquí cada expresión va anclada a algo que SÓLO case con lo que se quiere,
// y `esperadas` fija el recuento: si una expresión se lleva una pieza de más o
// de menos, la compuerta §F7b para el generador.
//   · `RETORNO RR[1-4] Ø` — el prefijo que mod_tambores pone a TODAS las piezas
//     del conjunto de cada rodillo de pozo (`RETORNO RR1 Ø88.9 · tubo …`). No
//     vale `RETORNO` a secas: cazaría los rodillos elevadores nuevos, que se
//     llaman `ELEVADOR RE-N/RE-S`, y la palabra sale en decenas de notas.
//   · `\(RETORNO RR[1-4] Ø` — los rodamientos y anillos, que mod_tambores nombra
//     al revés (`6206-2RS (RETORNO RR1 Ø88.9, −X)`).
//   · `soporte RETORNO RR[1-4] Ø` — los 32 pernos M10 de las pletinas.
//   · `Guarda de pozo` / `guarda (sur|norte|lateral)` — las 4 guardas y su
//     ferretería. ANCLADAS a «pozo»: las «Guía de descarga» del mismo módulo NO
//     llevan esa palabra y se quedan, que es lo correcto (no son del pozo).
export const RETIRA_POZO = {
  activo: true,
  // Cada expresión con su cuenta ESPERADA y qué se lleva. El integrador aplica
  // la unión y publica el recuento REAL por expresión; la compuerta lo compara
  // contra `esperadas` y PARA si no coincide — en los dos sentidos, porque una
  // expresión que se lleva de menos deja piezas huérfanas y una que se lleva de
  // más borra piezas vivas (que es exactamente lo que pasó con
  // `Rodamiento SKF W 6004` en la bandera hermana).
  patrones: [
    // Las TRES primeras esperan 0 A PROPÓSITO y hay que decir por qué, porque un
    // filtro que no caza nada es sospechoso por definición: los 4 rodillos de
    // pozo ya NO SE EMITEN. La misma bandera conmuta `TAMBORES.retorno`, que es
    // de donde mod_tambores saca qué rodillos construir y mod_calles qué lazo
    // trazar, así que a la lista de piezas no llegan. Las expresiones se quedan
    // como RED DE SEGURIDAD: si cualquier otro módulo volviera a emitir un
    // rodillo de pozo con el pozo retirado, se lo lleva esto — y si alguna
    // llegara a cazar algo, la compuerta §R para y lo dice, porque el recuento
    // no cuadraría con este 0.
    { rx: 'RETORNO RR[1-4] Ø', esperadas: 0,
      que: 'red de seguridad: los 4 conjuntos de rodillo de pozo (tubo, tapas, casquillos, eje, '
        + 'pletinas y collares). Hoy no se emiten — los conmuta TAMBORES.retorno' },
    { rx: '\\(RETORNO RR[1-4] Ø', esperadas: 0,
      que: 'red de seguridad: sus rodamientos 6206-2RS y sus anillos DIN 471, que mod_tambores '
        + 'nombra al revés («6206-2RS (RETORNO RR1 Ø88.9, −X)»)' },
    { rx: 'soporte RETORNO RR[1-4] Ø', esperadas: 0,
      que: 'red de seguridad: los pernos M10 de sus pletinas de soporte' },
    { rx: 'Guarda de pozo', esperadas: 4,
      que: 'las 4 chapas 14 GA de cierre del pozo (2 testas + 2 laterales)' },
    { rx: 'guarda (sur|norte|lateral) \\(', esperadas: 5,
      que: 'los 5 M8×12 que cuelgan la guarda de testa SUR de las tuercas T (uno por calle)' },
    { rx: 'guarda norte↔bancada', esperadas: 4,
      que: 'los 4 M8×16 de la franja de la guarda norte a la bancada' },
    { rx: 'guarda (−X|\\+X)↔chapón', esperadas: 6,
      que: 'los 6 M8 que cosen las dos guardas laterales al chapón (3 por lado)' },
    // ⚠ ESTA FALTABA y la habría dejado huérfana: los casquillos que salvan el
    // gap guarda↔chapón. No los caza ninguna de las de arriba porque su nombre
    // es «Casquillo separador Ø16×4.43 guarda −X (Y=…)» — la palabra «guarda» va
    // DESPUÉS del Ø y antes del lado, no delante. Es el mismo tipo de despiste
    // que dejó 40 rodamientos flotando cuando se retiraron las poleas de pozo.
    // ANCLADA al formato «Ø<n>×<n> guarda »: el casquillo del rodillo elevador
    // se llama «Casquillo separador Ø17.7/Ø12.7 × 8» y NO cae aquí.
    { rx: 'Casquillo separador Ø\\d+×[\\d.]+ guarda ', esperadas: 6,
      que: 'los 6 casquillos separadores que salvan el gap de las guardas laterales al chapón' },
  ],
  get rx() { return new RegExp(this.patrones.map(p => p.rx).join('|')); },
  get esperadasTotal() { return this.patrones.reduce((a, p) => a + p.esperadas, 0); },
  motivo: 'corrección del cliente 03-08-2026: el ramal de retorno cruza la transferencia RECTO por '
    + 'el corredor del peine, sostenido por los dos rodillos elevadores. Sin pozo no hay rodillos de '
    + 'pozo ni guardas de pozo',
  // comprobaciones que dejan de aplicar (se apagan con esta misma bandera):
  guarda: ['§E holgura del ramal de fondo al NBT90', '§4.5 de mod_tambores (fondo del pozo)'],
};

export const TAMBORES = {
  // ↓↓↓ lo que lee adapt/params_pg40.mjs (EJES_ARBOL) ↓↓↓
  motriz: { y: FIJO.motrizY, z: zEjeTambor, d: TAMBOR.od, eje: TAMBOR.eje.d,
    soporte: 'UCF 207', caraApoyoX: UCF207.caraX, normal: UCF207.normal,
    montaje: 'OUTBOARD — la unidad se atornilla por FUERA (ver §2: inboard no cabe)',
    patron: { tipo: 'cuadrado', j: UCF207.J, dia: 13.5, semi: UCF207.semi },
    pasoEje: UCF207.pasoEje },
  conducido: { y: FIJO.conducidaY, z: zEjeConducido, d: CONDUCIDO.od, eje: CONDUCIDO.eje.d,
    soporte: 'pletina de eje fijo Ø35 + collar de apriete (NO lleva UCF 207: los '
      + 'rodamientos van DENTRO del tubo, eje fijo pasante — instrucción del cliente)',
    caraApoyoX: CONDUCIDO.soporte.caraX, normal: CONDUCIDO.soporte.normal,
    montaje: 'INBOARD — pletina de 12 contra la cara interior del alargue',
    patron: { tipo: 'cuadrado', j: CONDUCIDO.soporte.patron, dia: CONDUCIDO.soporte.taladro,
      semi: r3(CONDUCIDO.soporte.patron / 2) },
    pasoEje: 0 },   // no hay paso de eje: el eje MUERE en la pletina
  // ↓↓↓ los rodillos del RAMAL DE RETORNO, para que pg40 les cuelgue ménsulas ↓↓↓
  // `s` = sentido de envolvente de la banda sobre el rodillo, en el convenio de
  // lib.mjs `bandaFaces` (+1 la banda lo envuelve CCW, −1 CW). Va AQUÍ, con la
  // cota, y no cableado en mod_calles: así el lazo de la banda es CONSECUENCIA
  // de esta tabla — quitar o añadir un rodillo es cambiar esta lista y nada más.
  // Los que muerden el ramal por ARRIBA van con +1; los que lo muerden por
  // DEBAJO (y por tanto tocan la cara PORTANTE), con −1.
  //
  // CON EL RETORNO RECTO (RETIRA_POZO.activo) la lista son los DOS ELEVADORES,
  // tangentes por arriba al ramal del corredor. Con la bandera a false vuelven
  // los cuatro rodillos de pozo y su geometría antigua, intacta.
  retorno: RETIRA_POZO.activo ? [
    { id: 'RE-N', y: ELEVADORES.y.norte, z: r3(CORREDOR.zCara - ELEVADORES.r), s: -1,
      papel: 'eleva el ramal al corredor (lado del tambor motriz)' },
    { id: 'RE-S', y: ELEVADORES.y.sur, z: r3(CORREDOR.zCara - ELEVADORES.r), s: -1,
      papel: 'eleva el ramal al corredor (lado del conducido)' },
  ] : [
    { id: 'RR1', y: -606, z: r3(zCaraRetTambor - RETORNOS.r), s: -1, papel: 'baja el ramal' },
    { id: 'RR2', y: -672, z: r3(zFondoAlto + RETORNOS.r), s: +1, papel: 'fondo del pozo, norte' },
    { id: 'RR3', y: -1280, z: r3(zFondoAlto + RETORNOS.r), s: +1, papel: 'fondo del pozo, sur' },
    { id: 'RR4', y: -1325, z: r3(zCaraRetConducido - RETORNOS.r), s: -1, papel: 'sube el ramal' },
  ],
  get retornoD() { return RETIRA_POZO.activo ? ELEVADORES.dia : RETORNOS.od; },
  get retornoEje() { return RETIRA_POZO.activo ? ELEVADORES.eje.d : RETORNOS.eje.d; },
  get retornoSoporte() { return RETIRA_POZO.activo ? ELEVADORES.soporte : RETORNOS.soporte; },
  fuente: 'adapt/params_tambores.mjs',
};

// ↓↓↓ lo que lee adapt/mod_tensor2.mjs (leerRamal) ↓↓↓
// EL TRAMO LLANO DEL TENSOR SOBREVIVE AL RETORNO RECTO, y es lo primero que hubo
// que comprobar. La horquilla del tensor (volante de entrada → polea tensora →
// volante de salida) muerde el ramal ENTRE el tambor y el primer rodillo del
// retorno, o sea FUERA de la huella del módulo. Con el pozo, ese primer rodillo
// era RR1 (Y −606) y el tramo medía 507.1 mm. Con el retorno recto el primer
// rodillo es RE-N (Y −739), así que el tramo llano CRECE a 660.4 mm: el brazo
// tiene más sitio, no menos. La cota del ramal donde el tensor lo muerde NO
// cambia —sigue siendo la generatriz baja del tambor— porque los dos volantes
// siguen tangentes a ella; lo que cambia es que, pasado el volante de entrada, el
// ramal SUBE en rampa hacia el corredor en vez de bajar al pozo.
export const RETORNO = {
  // Cota del RAMAL DE RETORNO donde el tensor puede morderlo: el tramo llano que
  // sale del tambor. Es el dorso; la cara de la banda queda `bandaEsp` por debajo.
  z: zRetTambor,                       // −59.067 calc
  zCara: zCaraRetTambor,               // −61.567 calc
  // calc — entre la piel del tambor (−54.45) y la del primer rodillo de retorno:
  // con elevadores, RE-N a Y −739 menos su radio 24.13 → −714.87 (660.4 mm).
  get tramoLibreY() {
    const R0 = TAMBORES.retorno[0];
    const rr = RETIRA_POZO.activo ? ELEVADORES.r : RETORNOS.r;
    return [r3(R0.y + rr), r3(FIJO.motrizY - TAMBOR.r)];
  },
  zConducido: zRetConducido,           // −58.167 calc — el tramo del lado conducido
  get tramoLibreConducidoY() {
    const R = TAMBORES.retorno[TAMBORES.retorno.length - 1];
    const rr = RETIRA_POZO.activo ? ELEVADORES.r : RETORNOS.r;
    return [r3(FIJO.conducidaY + CONDUCIDO.r), r3(R.y - rr)];
  },
  // ABRAZADO REAL SOBRE EL TAMBOR MOTRIZ (calc): el ramal portante llega
  // horizontal por arriba y el de retorno sale horizontal por abajo, los dos
  // tangentes al mismo cilindro ⇒ 180° exactos. NO lo toca el retorno recto: el
  // ramal sale del tambor HORIZONTAL igual que antes y no empieza a subir hasta
  // pasado el volante de salida de la horquilla. Es la comprobación que decide
  // que este rediseño no le cuesta arrastre al accionamiento (§J pide ≥ 150°).
  abrazadoMotrizDeg: 180,
  // EL DEL CONDUCIDO SÍ CAMBIA, Y AL ALZA: el ramal de retorno ya no sale
  // horizontal de él sino SUBIENDO hacia RE-S, así que el arco envuelto crece de
  // 180° a 187.5° (calc por tangencia; lo verifica mod_tambores §4.6 y lo publica
  // mod_calles). Más abrazado es más margen contra §J, no menos.
  abrazadoConducidoDeg: 180,
  nota: 'ramal de retorno de banda plana; el tensor muerde el tramo llano que sale del tambor, '
    + 'el único con acceso desde abajo. Con el retorno recto ese tramo mide 660.4 mm (antes 507.1)',
};

// ---------------------------------------------------------------------------
// 6. CARGAS E HIPÓTESIS (dis/calc) — se declaran, no se esconden
// ---------------------------------------------------------------------------
export const CARGA = {
  // Tensión por banda y ramal: la que pone el tensor de brazos (params_tensor2
  // TENSION.tPorBandaN con abrazado 180°, que es el que confirma `RETORNO`).
  tRamalN: 129.05,                     // tensor2 (dis, hipótesis 6 bar)
  nBandas: NBT.nBandas,                // 5
  mu: 0.35,                            // dis — goma vulcanizada lisa ↔ dorso de
  //   banda plana, seco. Valor conservador (0.35 frente a los 0.4–0.5 que se
  //   citan para tambor engomado) porque el sorter trabaja en ambiente sucio.
  cargaMaxKg: P.cargaMaxKg,            // 34.0 web SORT-013 (bulto máximo)
  bultosSimultaneos: 2,                // dis — 2 bultos de 34 kg sobre las 5 calles
  muGuia: 0.25,                        // dis — banda plana ↔ regleta UHMW-PE 1000
  vBanda: 1.855,                       // nbt90 P.velocidad — se iguala la velocidad
  //   de la cara vulcanizada de los rodillos de la transferencia; si no, el
  //   bulto derraparía al pasar de la banda al rodillo emergente
  sigmaAdmMPa: 80,                     // dis — C45 a flexión con seguridad amplia
  flechaLimite: 0.5,                   // dis — ≤ 0.5 mm (~1/1000 del vano)
  fsCapstanMin: 2.0,                   // dis — reserva mínima de arrastre
};

// ---------------------------------------------------------------------------
// 7. LO QUE ESTE ACCIONAMIENTO RETIRA (bandera, no borrado)
// ---------------------------------------------------------------------------
// Dos accionamientos no pueden convivir: el tambor motriz común y la
// transmisión T5 por calle ocupan LA MISMA línea de árbol (Y = 0), y la
// verificación B-rep exacta lo dijo con el número más grande del informe —
// 341.81 cm³ de solape macizo entre «Eje motriz común Ø30/Ø25» y el eje Ø35 del
// tambor, más la AT10 y el casquillo LK30 metidos dentro del UCF 207.
//
// `params_pg40.FLAGS.desactivaTransmisionT5` ya retira las POLEAS (63T motrices
// y conducidas) y las 4 poleas de pozo V1…V4. Esta es su HERMANA y cubre el
// resto de la línea de árbol, que es lo que sustituye el tambor: el eje común,
// sus bujes y chavetas, la chumacera que lo sujeta y la pareja AT10 + LK30 que
// colgaba de él. Las piezas NO se borran del repo: las emiten mod_estaciones y
// mod_calles y se filtran por nombre en el integrador; con `activo: false`
// vuelven solas.
//
// Qué NO entra en la lista, a propósito:
//   · `Chumacera SKF UCFL 206 (eje pivote tensor…)` y su tornillería «UCFL
//     pivote»: son del TENSOR NUEVO, no del accionamiento viejo. Por eso la
//     expresión pide literalmente «UCFL 205 (eje motriz».
//   · `Chaveta DIN 6885 A 10×8×100`: es la del propio tambor. Por eso la
//     expresión pide el tamaño de las otras, «8×7×32».
//   · el `Acople LK30-…-R` y el `Drive kit` del cliente: son contexto medido
//     (capa CTX), no piezas de este diseño; se quedan como testigo de dónde
//     estaba el motor.
export const RETIRA = {
  activo: true,
  // una sola expresión, comentada pieza a pieza para que se pueda auditar:
  rx: new RegExp([
    'Eje motriz común',                       // el árbol T5 que cruzaba el tambor
    'Buje 63T',                               // los 5 bujes de las poleas 63T
    'Chaveta DIN 6885 A 8×7×32',              // sus 5 chavetas (NO la del tambor)
    'Polea AT10 32T',                         // toma auxiliar del árbol viejo
    'Casquillo LK30-',                        // su casquillo cónico
    'Chumacera SKF UCFL 205 \\(eje motriz',   // el apoyo +X del árbol viejo
    'UCFL↔chapón',                            // sus pernos
    'hex M12 UCFL \\(Z=',                      // sus tuercas
    'Golilla M12 UCFL \\(Z=',                 // sus golillas
    // …y la FERRETERÍA HUÉRFANA de las poleas de pozo V1…V4: la bandera de pg40
    // se llevó las poleas, sus ejes y sus anillos, pero dejó dentro los 40
    // rodamientos W 6004-2Z, los 40 pernos de testa y las 40 golillas, flotando
    // donde ya no hay polea. La verificación B-rep los encontró metidos en los
    // ejes de mis rodillos de retorno (145 cm³ en 120 pares). Se van con el
    // resto del pozo, que es a lo que pertenecían.
    // ⚠ ANCLADA A `(V1…V4,` A PROPÓSITO. Aquí decía `'Rodamiento SKF W 6004'`
    //   a secas, y esa subcadena NO distingue de quién es el rodamiento: la
    //   polea tensora del tensor NUEVO usa el MISMO W 6004-2Z (params_tensor2
    //   §POL.rodamiento, web BRG-005) y se llama `Rodamiento SKF W 6004-2Z
    //   tensora ±X (calle n…)`. La regex se los llevaba también: las 5 poleas
    //   tensoras Ø117.9 quedaban girando METAL SOBRE METAL en su eje Ø20 con
    //   258 N encima. Lo encontró la revisión de compras y montaje (B1).
    //   El nombre de las del pozo lleva `(V1,`…`(V4,` (mod_estaciones §pozo);
    //   el del tensor, `tensora −X`. Discriminar por eso, no por el rodamiento.
    'Rodamiento SKF W 6004-2Z \\(V[1-4],',    // 40 · rodamientos de las V1…V4
    'testa de eje \\(V[1-4]',                 // 40 · pernos de testa de sus ejes
    'ancha testa \\(V[1-4]',                  // 40 · sus golillas
  ].join('|')),
  // lo que ya retira la bandera de pg40 (se documenta aquí para que la lista
  // completa de «lo que sustituye el accionamiento» esté en un solo sitio):
  yaRetiradoPorPG40: ['Polea motriz T5-63T', 'Polea conducida T5-63T',
    'Volante contraflexión', 'Polea plana Ø117.9', 'Pletina de volante', 'Pletina V2/V3',
    'Eje Ø20×50 de pozo', 'Espaciador de aros', 'Anillo 3AM1-20', 'Anillo DIN 472-42'],
  // comprobaciones de la compuerta que dejan de aplicar al retirarlas (se
  // apagan con esta misma bandera, no se borran): §M1 (existencia y bujes del
  // eje común) y §M3 (flecha y torsión de ese eje).
  guarda: ['§M1 eje motriz común', '§M3 rigidez y par del eje común'],
};

export { STEP, NBT, EJES, Xc, P };
export default { FIJO, TAMBOR, UCF207, CONDUCIDO, RETORNOS, ELEVADORES, CORREDOR,
  TAMBORES, RETORNO, CARGA, RETIRA_POZO };

// ═══════════════════════════════════════════════════════════════════════════
// A7 · MANDRINADO DE LAS TESTAS DEL TUBO (revisión de fabricación 2026-08-03)
//
// EL DEFECTO. Las diez tapas-soporte de los rodillos declaraban, en su campo
// `ajuste`, «prensado H7/r6 en el tubo Ø82.5» (retorno) y «… Ø100.8»
// (conducido). Esos Ø NO son cotas mecanizadas: salen de `id = od − 2·e`, o sea
// del INTERIOR NOMINAL DE CATÁLOGO de un tubo comercial. Y el interior de un
// tubo comercial no es una cota: es el resultado de restar dos veces una pared
// con tolerancia a un exterior con tolerancia.
//
// EL NÚMERO (web TUBE-A513-01, tabla verbatim de tolerancias ASTM A513 Tipo 1):
//   · Ø88.9 × 3.2  (3-1/2" × 0.126"): exterior ±0.0090" = ±0.229 mm · pared
//     +0.004/−0.012" = +0.102/−0.305 mm  →  interior real 82.068 … 83.338
//   · Ø108 × 3.6   (4-1/4" × 0.142"): exterior ±0.0200" = ±0.508 mm · pared
//     +0.004/−0.014" = +0.102/−0.356 mm  →  interior real 100.089 … 102.019
// El campo de tolerancia de un H7 en esos diámetros es IT7 = 0.035 mm (banda
// 80-120 de ISO 286). La incertidumbre del tubo es 36 y 55 VECES el ajuste que
// se pide: unas tapas entrarían sueltas y otras no entrarían.
//
// LA CORRECCIÓN. El tubo SE MANDRINA en las dos testas, en la longitud del
// asiento de la tapa, al Ø H7 nominal. Eso convierte el interior en una cota de
// plano, con su tolerancia, y hace posible el H7/r6. La longitud de mandrinado
// es la de la tapa más 2 mm de sobrerrecorrido de la herramienta.
// ═══════════════════════════════════════════════════════════════════════════
const L_TAPA_LABIO = 2.0;        // dis — el mismo labio de tope axial que usa
                                 //   adapt/mod_tambores.mjs (bloque L.tapaLabio)
const IT7_80_120 = 0.035;        // web/cat ISO 286-2, IT7 en la banda 80-120 mm
const A513 = {                   // web TUBE-A513-01 (pulgadas → mm)
  'Ø88.9×3.2': { od: 0.0090 * 25.4, eMas: 0.004 * 25.4, eMenos: 0.012 * 25.4 },
  'Ø108×3.6': { od: 0.0200 * 25.4, eMas: 0.004 * 25.4, eMenos: 0.014 * 25.4 },
};
/** Interior REAL de un tubo comercial y el veredicto sobre un H7 en él. */
function interiorTubo(od, e, clave) {
  const t = A513[clave];
  const idMax = r3(od + t.od - 2 * (e - t.eMenos));
  const idMin = r3(od - t.od - 2 * (e + t.eMas));
  return { nominal: r3(od - 2 * e), idMin, idMax, banda: r3(idMax - idMin),
    campoH7: IT7_80_120, veces: r3((idMax - idMin) / IT7_80_120), fuente: 'web TUBE-A513-01' };
}
export const MANDRINADO = {
  tambor: {
    ...interiorTubo(TAMBOR.tubo.od, TAMBOR.tubo.e, 'Ø88.9×3.2'),
    cota: `Ø${r3(TAMBOR.tubo.id)} H7`,
    largo: r3(TAMBOR.tapa.e + 2),
    nota: 'las DOS testas, en la longitud del asiento de la tapa + 2 de sobrerrecorrido',
  },
  conducido: {
    ...interiorTubo(CONDUCIDO.tubo.od, CONDUCIDO.tubo.e, 'Ø108×3.6'),
    cota: `Ø${r3(CONDUCIDO.tubo.id)} H7`,
    largo: r3(CONDUCIDO.tapa.e + L_TAPA_LABIO + CONDUCIDO.rodam.w + 2),
  },
  retorno: {
    ...interiorTubo(RETORNOS.tubo.od, RETORNOS.tubo.e, 'Ø88.9×3.2'),
    cota: `Ø${r3(RETORNOS.tubo.id)} H7`,
    largo: r3(RETORNOS.tapa.e + L_TAPA_LABIO + RETORNOS.rodam.w + 2),
  },
  // La alternativa que NO se toma, y por qué se declara: dejar la tapa en H7/j6
  // o H7/k6 y retenerla con un cordón perimetral. Es más barata, pero exige
  // declarar ESE cordón y mete calor en la testa de un tubo que después tiene
  // que girar redondo. Si el cliente la prefiere, se cambia aquí y se añade el
  // cordón a la tapa — no se deja el H7/r6 contra un Ø sin controlar.
  alternativaDeclarada: 'H7/j6 o H7/k6 + cordón perimetral en la testa (exige declarar el cordón)',
  // Y el aro de tensión que el prensado mete en la pared, que es la otra razón
  // para mandrinar: con r6 sobre Ø82.5 la interferencia máxima es 0.073 mm →
  // ε = 8.8e-4 → σ ≈ 186 MPa en S275, justo donde rueda la banda.
  tensionAroMPa: 186,
};
