// bastidor.mjs — ESTRUCTURA DE CHAPA de la transferencia 90° de bandas angostas
// (Hytrol ProSort MRT 90° Transfer). Módulo del ensamble NBT90; ver CONTRATO.md.
//
//   Capa FIJO  : cuelga del transportador anfitrión y no se mueve.
//   Capa MÓVIL : ROLLER FRAME WELDMENT, sube `P.carrera` (10 mm) con el pop-up.
//                El modelo está en estado ELEVADO.
//
// Ejes: X = eje de los rodillos (flujo del anfitrión) · Y = expulsión a 90°
//       Z = arriba, 0 en la cara inferior del bastidor.
//
// Procedencia de las cotas locales:  med = medido sobre las vistas (k = 0.6320)
//   cat = catálogo del fabricante · txt = texto del manual · dis = decisión de
//   diseño de este repositorio (capa `user`). Toda cota compartida sale de `P`.

import {
  Ensamble, box, cyl, hole, sketchXZ, sketchYZ, sketchXY, seccionChapa, desarrollo,
  rectR, colisa, arcoPts, pernoHex, tuercaHex, golilla, COL, PASO, r2,
} from './lib.mjs';
import { P } from './params.mjs';
// Esquema de tolerancias y encajes (archivo nuevo; no toca params.mjs ni lib.mjs).
import { ranuraPara, largoRanura, encaje, juntaATope, NORMA, tol13920 } from './tolerancias.mjs';

// ---------------------------------------------------------------------------
// Cotas locales de ESTE módulo (nadie más las usa)
// ---------------------------------------------------------------------------
const T12 = P.cal12;                       // 2.657 — chapa 12 GA del bastidor
const T14 = P.cal14;                       // 1.897 — chapa 14 GA de la guarda
const T316 = P.placaT;                     // 4.763 — 3/16" de las placas peine
const RB = P.radioPliegue;                 // radio interior de plegado = espesor
const KF = P.factorK;

const D38 = P.M.b38.d;                     // 9.525 — perno 3/8-16
const PAS38 = r2(D38 + P.holgura.pasante); // 11.13 — taladro pasante de 3/8"
const GOL = 1.6;                           // dis: golilla plana 3/8" ASME B18.22.1
const GOLD = r2(2.2 * D38);                // Ø exterior de la golilla

const L = {
  // ---- placas peine (ROLLER FRAME WELDMENT) -------------------------------
  placaXa: 40.1,        // dis: cara interior en X=42.48 → 1.52 mm de juego axial
  placaXb: 422.9,       // dis: cara interior en X=420.52 (rodillo ocupa X 44…419)
  peineY: 216,          // dis: cubre los 6 rodillos (±207.6) sin tocar el canal anfitrión
  peineYbajo: 185,      // dis: libra las alas del SIDE CHANNEL (punta en Y=189.14)
  peineZ0: 96,          // dis: encierra las poleas de retorno (fondo en Z=144.85)
  peineZ1: 285,         // dis: fin del tramo estrecho
  peineZ2: 294,         // dis: arranque del tramo ancho (bajo el cross channel)
  peineZt: 388.5,       // dis: 2.1 mm bajo el plano de banda (P.planoBanda)
  huecoZ: 320,          // dis: fondo del hueco de cada banda (8 mm bajo el ramal
                        //      de retorno del anfitrión, que pasa a Z 328…330.5)
  dienteSemi: 17.1,     // dis: semiancho del diente (hueco = 42 > regleta 31.75)
  huecoR: 6,            // dis: radio del fondo del hueco (desahogo)
  // MONTAJE ATORNILLADO DEL RODILLO (sustituye a la ranura en U + anillos DIN 471).
  // El cliente describe el montaje real: «sujeciones con perforación y rodillo con
  // su eje con hilo interior, entonces perno por fuera chapa». Aquí sólo vive el
  // TALADRO PASANTE del diente; el eje roscado y el perno los pone rodillos.mjs.
  //   · Ø 7.0 = taladro de paso CERRADO para 1/4-20 (0.65 mm de holgura, no los
  //     1.6 de `P.holgura.pasante`): así el vástago hace también de pasador y toma
  //     la carga radial del rodillo en vez de dejarla a la fricción bajo la golilla.
  //   · Distancia al canto superior de la placa = peineZt − P.rodZ = 9.01 mm =
  //     1.42·d. El mínimo de AISC para 1/4" en canto cizallado es 3/8" = 9.53, o
  //     sea queda 0.5 mm corto; se declara. No se sube `peineZt` porque el plano
  //     de bandas del anfitrión está 2.1 mm más arriba (P.planoBanda = 390.6).
  rodPasante: PASO['1/4'],          // 7.0 · dis (ver arriba)

  // ---- travesaños del cassette móvil --------------------------------------
  cruzY: 214,           // dis: alma del TRANSFER CROSS CHANNEL (±). Tiene que quedar
                        //      FUERA del serpentín: el B-rep exacto da la banda hasta
                        //      Y=201.3 en la franja Z 318…346, que es justo esta.
  cruzZ0: 297, cruzZ1: 347.8,   // dis: 2" de canto; el ala superior queda 4.2 mm bajo la
                                //      generatriz inferior del rodillo RETRAÍDO (Z=352.0)
  cruzAla: P.canalAla,          // 38.1 — ala hacia dentro
  serpMuescaX: [62, 108],       // dis: muesca de las alas en el plano del serpentín
  serpMuescaY: [151, 212],      //      (la banda ocupa X 72.3…97.7 y llega a Y=201.3).
                                //      Se recortan las dos alas; el alma (Y ≥ 212.67)
                                //      queda entera y el canal no se parte.
  braceY: 100,          // dis: alma del NOTCHED BRACE CHANNEL (±). El motorreductor
                        //      ocupa Y ±72.5 y el plato de empuje de la mesa Y ±100:
                        //      80…120 es la única banda libre a esta altura.
  braceSemi: 20,        // dis: semiancho del canal de refuerzo (40 mm de alma)
  braceZ0: P.rielInfZ,  // 143.5 — la CARA INFERIOR del alma es el «riel del bastidor
                        //      móvil» contra el que empuja el plato de la mesa guía.
                        //      Deja 17.7 mm sobre el canal de montaje del cilindro
                        //      (Z ≤ 115.8) aun con los 10 mm de carrera retraídos.
  braceAlto: r2(1.75 * 25.4),   // 44.45 (1-3/4") — el ala no alcanza la banda que
                        //      envuelve por debajo la polea tensora (Z = 194.4)
  get braceZ1() { return r2(this.braceZ0 + this.braceAlto); },
  muescaX0: 57, muescaX1: 113,  // dis: muesca que deja pasar el serpentín (X=85 ± 28)
  muescaZ1: 150,        // dis: hasta aquí se recorta el ALMA (paso del ramal de retorno);
                        //      por encima sólo se recorta el ala exterior
  angX0: 47.24,         // dis: los CROSS ANGLE son las cartelas que puentean la muesca
  angY: [83.99, 109.39],// dis: el ala vertical apoya en la cara INTERIOR del ala del brace
                        //      channel (Y=82.66); si se pone en la exterior, el ala
                        //      horizontal de la cartela se come el ala del canal.
  angTorn: [[134, 90.5], [162, 90.5]],   // interfaz transmision.mjs: la pestaña de la
                        //      placa soporte (X 113…178) apoya sobre la cara superior de
                        //      la cartela (Z = braceZ1 = 187.95) y la atornilla con 2×3/8".
                        // El ala es de 12 GA (2.657) y por debajo queda el hueco ciego del
                        // canal: no hay llave para una tuerca suelta. Solución: TUERCA
                        // HEXAGONAL SOLDADA a la cara inferior del ala (DIN 929 / soldadura
                        // por proyección), puesta en taller junto con la propia cartela —
                        // que ya es una pieza soldada— y no en el montaje. Se atornilla
                        // solo desde arriba.
                        //   · roscar directo el ala: 2.657 / 1.588 (paso 3/8-16) = 1.67
                        //     filetes → descartado, muy por debajo de la carga de prueba.
                        //   · tuerca remachable: en 2.657 mm está en el extremo alto de su
                        //     rango de agarre y gira al reapretar → descartada.
                        //   · tuerca soldada 3/8-16 (e/c 14.27, alto 8.33): 5.2 filetes en
                        //     la tuerca; con el ala, agarre 10.99 = 1.15·d ≥ 1·d (acero).
  angZ0: 150,           // dis: arrancan donde termina la muesca del alma
  espX: [42.48, 415.76],// dis: SPACER PLATE contra la cara interior de cada peine
  espZ0: 96, espZ1: 176,// dis
  espTornZ: 112,        // dis: fila de pernos bajo el motorreductor (Ø145 llega a Z=126.4)
  espTornY: [-170, -55, 55, 170],   // dis: fuera de las alas de los brace channel
  motorPaso: r2(P.motorDia + 5),    // 150 — pasante del motorreductor: el SEW mide 314 mm
                        //      desde la brida y su cola cae en X=433.4, o sea ATRAVIESA la
                        //      placa peine libre (X 420.5…425.3). Es como se monta de veras.
  // ---- guarda del rodillo (TRANSFER ROLLER GUARD) -------------------------
  // La placa soporte de la transmisión (X 106.5…155, Y ±187, Z 128…278) ya cierra
  // el serpentín por el lado del accionamiento: una guarda ahí sería redundante y
  // además no cabe. La cara que SÍ queda expuesta es la exterior de la placa peine
  // motriz — cabezas de los pernos de rodillo y el pinzamiento contra el canal
  // cuando el cassette sube. Ahí va la guarda, y su largo de catálogo (17" = 431.8)
  // coincide con el de la placa peine (432).
  guardaX: 24,          // dis: cara exterior del alma de la guarda
  guardaPest: 11.82,    // dis: la pestaña de retorno llega a la cara exterior del peine
  guardaTab: 26,        // dis: alto de la pestaña atornillada. Con 11 no cabía: la
                        //      cabeza del perno (R=8.24) se comía el ala inferior.
  guardaZ0: 181, guardaZ1: 299,   // dis: la pestaña inferior tiene que quedar POR ENCIMA
                        //      de la spacer plate (acaba en Z=176), que es donde iban a
                        //      parar las tuercas de sus pernos
  guardaY: 185,         // dis: el catálogo da 17" (431.8) pero con el SIDE CHANNEL puesto
                        //      no cabe: su ala superior llega a Y ±192.34 en Z 247.3…250.
                        //      370 de largo deja 7.34 mm y la holgura no cambia con la carrera.
  guardaTornY: [-150, 150], guardaTornZ: [196, 284],   // dis: 4 pernos de 3/8"
  // ---- estructura fija ----------------------------------------------------
  canalZ1: P.canalTopZ,                       // med 383.1 — cara superior del ala
  get canalZ0() { return r2(this.canalZ1 - P.canalAlto); },  // 218.0 (cat 6-1/2")
                        // comprobación: 218.0 + T12 = 220.66 = P.canalBotZ (med) ✓
  ladoY: 227.24,        // dis: alma del SIDE CHANNEL, a tope con el alma anfitriona
  ladoAla: r2(1.25 * 25.4),   // 31.75 (1-1/4") — med: el vuelo del ala medido en la vista
                        //      izquierda es 1.226" (analisis/vista_izquierda.md §3), no 1-1/2".
                        //      Con la punta en Y ±195.49 el ramal que sube de la polea de
                        //      retorno al rodillo exterior (Y ∓189.25, Z 248.81) pasa con
                        //      6.24 mm y la pestaña Ø73.5 de la loca Y=152.4 con 6.34 mm.
  ladoZ1: 250,          // dis: solapa 32 mm con el alma del canal anfitrión
  get ladoZ0() { return r2(this.ladoZ1 - P.canalAlto); },    // 84.9
  ladoLargo: r2(18 * 25.4),                   // cat PT-087017 «SIDE CHANNEL - 18 in.»
  cilgX: [141.5, 321.5],                      // interfaz elevacion.mjs: tornillos 3/8" que
  cilgZ: 180,                                 //   cuelgan y regulan el canal de montaje del
  cilgD: 10.3,                                //   cilindro. Agujero REDONDO: el recorrido
                                              //   vertical lo da la colisa 12.7×38.1 de la
                                              //   placa colgante, no este taladro.
  ventanaX: [103, 147],                       // dis: paso de la oreja de transmision.mjs
  ventanaZ: 220,                              // dis: desde aquí hasta el canto superior
  baseX0: 26, baseX1: 102.2,                  // dis: canal base de 3" de ancho, corrido al
                                              //      extremo motriz para dejar libre la
                                              //      huella de la mesa guía (X 146.5…316.5)
  baseTapaX: [20, 108], baseTornX: [32, 95],  // dis: tapas de extremo y su tornillería.
                                              //   Antes 22…105: se ensancha 2 mm por lado para
                                              //   que las ranuras del encaje U4 queden a ≥1.5·e
                                              //   (4.0 mm) del canto de la chapa de 12 GA; con
                                              //   105 la ranura de la derecha quedaba a 3.78.
  baseZ1: 56.1,                               // dis: P.baseZ + 1-1/2"
  jackX: [115.75, 347.25],                    // dis: 1/4 y 3/4 del largo (4 jack bolts)
  transX: 127, transZ: [232, 264],            // interfaz transmision.mjs: pernos 3/8-16
                                              //   de la oreja de la placa soporte
  jackAncho: 50,                              // dis: ancho de las ménsulas inferiores en X
  jackSupAncho: 96,                           // dis: la ménsula superior es más larga para
  jackSupTornX: 30,                           //   llevar sus 2 tornillos ALINEADOS EN X a
                                              //   ±30 del eje del jack bolt: rodeándolo no
                                              //   caben (una golilla de 3/8" ya mide Ø25.4)
                                              //   y hay que dejar llave a sus dos tuercas.
  jackY0: 232, jackY1: 262,                   // dis: la oreja abraza P.jackY = 247.4
};

// ---------------------------------------------------------------------------
// ENCAJES DE POSICIONAMIENTO de los conjuntos soldados de este módulo
// ---------------------------------------------------------------------------
// Qué problema resuelven: los conjuntos soldados se apoyaban «donde toca» según
// la cota, así que cada uno pedía un utillaje propio o un soldador midiendo. Con
// estos rasgos el conjunto se sitúa solo y el utillaje pasa a ser una mesa plana.
//
// REGLA (la verifica la compuerta, §9 de gen_nbt90.mjs): en cada junta, cada
// grado de libertad lo fija UN SOLO rasgo. Por eso hay dos papeles distintos:
//   · `posicion` — ranura ajustada: sitúa. Como mucho una por junta y dirección.
//   · `paso`     — ranura 1 mm más grande por lado en LAS DOS direcciones: no
//                  sitúa nada. Sujeta mientras se puntea y deja ventana de
//                  soldadura. Que sea holgada es lo que impide que el conjunto
//                  no entre por competir con la de posición.
//   · `tope`     — cara contra cara: fija la dirección normal a esa cara.
//
// La holgura no se elige: sale de `ranuraPara()` (espesor nominal + tolerancia
// de laminación ASTM/AISI + tolerancia de corte ISO 2768-m + montaje).
const RAN12 = ranuraPara('12GA');           // 3.11 · holgura por lado 0.10…0.35

const ENC = {
  // -- U1: TRANSFER CROSS CHANNEL → PLACA PEINE ----------------------------
  // La lengüeta NO puede ir en el alma del canal: el alma está en |Y| = 214 y el
  // canto de la placa peine en 216, o sea 0.67 mm de distancia al borde — una
  // ranura ahí revienta el canto. Va en el ALA SUPERIOR, que a |Y| = 195 tiene
  // 11.2 mm hasta el hueco de paso de banda (acaba en 173.4) y 10.6 hasta el
  // canto (216); las dos por encima de 1.5·e = 7.1 mm de la chapa de 3/16".
  // Una sola por extremo, y de posición: sitúa Y y Z. La testa del canal contra
  // la cara interior de la placa fija X. Θ lo fijan las dos lengüetas del canal,
  // separadas 378 mm.
  u1: { y: 195, ancho: 20, get z() { return r2(L.cruzZ1 - T12 / 2); } },
  // -- U2: NOTCHED BRACE CHANNEL → SPACER PLATE ----------------------------
  // Lengüeta de posición en el ALMA (horizontal, Z = 144.83): sitúa Z y Y con
  // 47 mm de canto por debajo y 30 por arriba en la spacer plate. La segunda,
  // en el ala interior, es DE PASO: ventana de soldadura, no sitúa.
  u2: { y: 100, ancho: 24, get z() { return r2(L.braceZ0 + T12 / 2); },
    pasoZ: [148, 166], get pasoY() { return r2(L.braceY - L.braceSemi + T12 / 2); } },
  // -- U3: CROSS ANGLE → NOTCHED BRACE CHANNEL -----------------------------
  // Solape cara contra cara (el ala vertical de la cartela sobre la cara interior
  // del ala del canal). En un solape de chapas PARALELAS no cabe lengüeta: el
  // rasgo que sitúa son dos AGUJEROS DE PASADOR coincidentes, uno redondo y otro
  // en colisa (el clásico redondo + colisa, que sitúa sin sobre-restringir).
  // Tras puntear se retiran los pasadores y los agujeros quedan como soldadura
  // de tapón.
  u3: { x: [130, 240], z: 168, dia: 8.0, colisa: 12.0 },
  // -- U4: TAPA DE EXTREMO → CANAL BASE EN U -------------------------------
  // Lengüetas en las DOS alas verticales del canal. La tapa se ensancha de
  // X 22…105 a 20…108 porque con la anterior la ranura izquierda quedaba a
  // 3.78 mm del canto y hacen falta 1.5·e = 4.0 en chapa de 12 GA.
  u4: { zPos: [30, 48], zPaso: [29, 49] },
};

// Largos de ranura derivados (la holgura sale de la cadena, no de una elección)
const u1Largo = largoRanura(ENC.u1.ancho, 'posicion').largo;          // 20.8
const u2Largo = largoRanura(ENC.u2.ancho, 'posicion').largo;          // 24.8
const u2PasoAlto = r2(ENC.u2.pasoZ[1] - ENC.u2.pasoZ[0]);             // 18
const u2PasoLargo = largoRanura(u2PasoAlto, 'paso').largo;            // 20

const n3 = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Contorno rectangular de una ranura de encaje, en el plano del boceto.
 *  Esquinas VIVAS a propósito: el radio interior que deja un corte por láser
 *  (≤0.3 mm) es menor que la holgura de esquina del encaje, así que redondear
 *  el modelo mentiría sobre el ajuste. */
const ranuraRect = (u, v, du, dv) =>
  rectR(r2(u - du / 2), r2(v - dv / 2), r2(u + du / 2), r2(v + dv / 2), 0);

/** Interfaces que consumen los otros módulos (nunca duplican un valor de P). */
export const padMovilZ = L.braceZ0;      // = P.rielInfZ (143.5): cara inferior del alma de
                                         // los brace channel, donde empuja el plato de la mesa
export const guardaRodilloX = L.guardaX; // cara exterior de la guarda del rodillo (X 24…37.7)
/** El serpentín lo cierra la placa soporte de transmision.mjs; este módulo no pone
 *  guarda ahí (no cabe entre la banda, X≤97.7, y esa placa, X≥106.5).
 *  Compartimento del motorreductor: arranca tras la placa soporte de la transmisión y
 *  ATRAVIESA la placa peine libre por el pasante Ø150 (la cola del SEW llega a X≈433). */
export const motorEnvX = [121.35, P.largo];   // dis: tras la placa soporte de transmisión
export const motorPasoD = L.motorPaso;
/** Huella libre para la mesa guía neumática (bajo el centro, sin estructura fija). */
export const mesaHuella = { x: [110, 375], y: [-185, 185], z: [P.baseZ + 2, L.braceZ0] };

/** MONTAJE ATORNILLADO DE LOS 6 RODILLOS DE TRANSFERENCIA — interfaz con
 *  rodillos.mjs. Las placas peine son de este módulo, así que aquí viven sus
 *  planos y el Ø del taladro; rodillos.mjs deriva de ahí el largo del eje, la
 *  profundidad de rosca y por dónde entra el perno. Ningún número se duplica. */
export const rodMontaje = {
  placaX: [L.placaXa, L.placaXb],                 // planos medios de las dos placas
  t: T316,                                        // 4.763 — 3/16"
  get caraInt() { return [r2(this.placaX[0] + this.t / 2), r2(this.placaX[1] - this.t / 2)]; },
  get caraExt() { return [r2(this.placaX[0] - this.t / 2), r2(this.placaX[1] + this.t / 2)]; },
  pasante: L.rodPasante,                          // 7.0 — taladro de paso cerrado 1/4"
  torn: P.M.b14,                                  // 1/4-20 UNC (perno por fuera)
};

/** RODILLO DE RETORNO B-20760 «1.9 in. OD Galv Return Roller – ABEC-1
 *  (Specify BR −1-1/4)» — item 22 del despiece de la pág. 13 del manual y item 9
 *  del de la pág. 12. Es el elemento transversal que se ve cruzando la vista
 *  izquierda de FIGURE 8A: sostiene y LIMITA los ramales de retorno de las bandas
 *  angostas del clasificador. Va FIJO, atornillado al ALMA de los dos canales
 *  laterales del anfitrión (los únicos perfiles fijos que llegan a esa altura:
 *  Z 218…383.1); este módulo pone los taladros, rodillos.mjs pone el rodillo. */
export const rodRetorno = {
  dia: r2(1.9 * 25.4),        // 48.26 · cat B-20760 «1.9 in. OD» (med 48.03, −0.5 %)
  eje: r2(0.5 * 25.4),        // 12.70 · cat Interroll 1.9": eje 1/2" redondo ED&T
  pared: r2(0.065 * 25.4),    // 1.65 · cat Interroll: tubo 1.9" C/S galvanizado 0.065"
  y: P.almaY,                 // 229.9 — alma del canal anfitrión (med). El detalle
                              //   ampliado de la 8A pone la chapa en |Y| = 222.5 (x =
                              //   170.5 px); se monta sobre el alma del anfitrión
                              //   porque es la ÚNICA chapa fija que llega a Z ≈ 303
                              //   (Z 218…383.1). Desviación declarada: +7.4 mm.
  t: T12,
  // El perno sale del propio dibujo, no de una preferencia: en el extremo ampliado
  // el vástago que atraviesa la chapa mide 10 px = 6.32 mm (1/4" = 6.35, error
  // 0.5 %) y la cabeza hexagonal, 20 px entre vértices = 12.64 (AC de una cabeza
  // de 7/16" e/c = 12.83, error 1.5 %; alto 7 px = 4.4 frente a 4.14 de catálogo).
  // O sea: 1/4-20 UNC. Interroll da 5/16-18 para su eje de 1/2" en tubo de 1.9",
  // pero 1/4-20 x 5/8 también es rosca ED&T de catálogo (serie 1100) y es la que
  // mide el dibujo; además deja 3.18 mm de pared en el eje en vez de 2.38.
  pasante: PASO['1/4'],       // 7.0 — taladro de paso cerrado del perno 1/4-20
  torn: P.M.b14,
  roscaProf: r2(0.625 * 25.4),  // 15.88 = 5/8" · cat «ED&T … x 5/8 deep»
  // X: el cassette MÓVIL (placas peine X 37.72…425.28 y los dos transfer cross
  // channel, que a |Y| = 214 barren Z 287…347.8) ocupa toda la franja de altura
  // de este rodillo. El único hueco en el que un rodillo FIJO de Ø48.26 no toca
  // nada que suba y baje es POR FUERA de la placa peine libre: de ahí X = 452
  // (cuerpo X 427.9…476.1, con 2.6 mm a la placa). Es además donde funcionalmente
  // toca: en el borde de la boca de la transferencia, que es lo que «limita» las
  // bandas. Alternativa descartada: montarlo entre los cross channel obligaba a
  // recortarles alma y alas, y el taladro del perno caía en el radio de plegado.
  x: 452,                     // dis (ver arriba)
  // Z: TANGENTE por arriba al ramal de retorno de las bandas del anfitrión — que
  // es su función y lo que se ve en el dibujo (los 5 ramales apoyan en él).
  // Medido en FIGURE 8A: eje en y = 485.5 px → Z = 303.06 (error 0.5 mm).
  get z() { return r2(P.planoBanda - P.bandaRetornoDZ - P.bandaEsp - this.dia / 2); },
  // Largo del tubo: la regla de catálogo es «Specify BR − 1-1/4», y encaja sola
  // con el montaje sobre las almas del anfitrión (BF = BR = 18" = 457.2), dejando
  // 5/8" de eje a la vista en cada extremo — justo la profundidad de rosca ED&T.
  get largo() { return r2(P.BR - 1.25 * 25.4); },      // 425.45 (med 414.9, −2.5 %)
  get ejeLargo() { return r2(2 * (this.y - this.t / 2)); },   // 457.14 = BR
};

// Envolvente del SIDE CHANNEL fijo, para que la transmisión verifique contra la
// geometría REAL y no contra un literal copiado: la punta del ala se movió al
// acortarla a 1-1/4" y el valor viejo dejó el gate en falso.
export const canalFijoY = [r2(L.ladoY - L.ladoAla), L.ladoY];
export const canalFijoZ = [L.ladoZ0, L.ladoZ1];


// ---------------------------------------------------------------------------
// Tornillería: perno hexagonal 3/8-16 + 2 golillas + tuerca. `at` es la cara
// exterior por donde entra el perno; `agarre` la suma de espesores apretados.
// ---------------------------------------------------------------------------
// `at` = CARA EXTERIOR de la pieza por la que entra el perno. Reparto a lo largo
// de `dir`:  cabeza (−GOL−hh … −GOL) · golilla (−GOL … 0) · agarre (0 … agarre)
// · golilla (agarre … agarre+GOL) · tuerca. `pernoHex` dibuja la cabeza HACIA ATRÁS
// desde `at`, así que el perno se ancla en la cara exterior de la golilla.
function tornilleria(E, { nombre, at, dir, agarre, capa }) {
  const d = n3(dir), p = (s) => add(at, mul(d, s));
  const largo = r2(agarre + 2 * GOL + P.M.b38.tuerca + 4);
  golilla(E, { nombre: `${nombre} (cabeza)`, at: p(-GOL), dir: d, dia: D38, ext: GOLD, esp: GOL, capa });
  pernoHex(E, {
    nombre: `3/8-16 × ${largo} · ${nombre}`, at: p(-GOL), dir: d, dia: D38,
    largo, af: P.M.b38.af, altoCab: P.M.b38.hh, capa,
  });
  golilla(E, { nombre: `${nombre} (tuerca)`, at: p(agarre), dir: d, dia: D38, ext: GOLD, esp: GOL, capa });
  tuercaHex(E, {
    nombre: `3/8-16 · ${nombre}`, at: p(agarre + GOL), dir: d, dia: D38,
    af: P.M.b38.af, alto: P.M.b38.tuerca, capa,
  });
}

// ---------------------------------------------------------------------------
// Silueta de la placa peine (contorno cerrado en (Y, Z))
// ---------------------------------------------------------------------------
// El canto superior de cada diente es ahora RECTO: el eje del rodillo ya no baja
// desde arriba a una ranura en U, sino que topa contra la cara interior del diente
// y lo atraviesa sólo el perno (taladro `L.rodPasante`, hecho en la pieza).
function siluetaPeine() {
  const { peineY: Ye, peineYbajo: Yb, peineZ0: Z0, peineZ1: Z1, peineZ2: Z2,
    peineZt: Zt, huecoZ: Zh, dienteSemi: ds, huecoR: rc } = L;
  const pts = [[-Yb, Z0], [Yb, Z0], [Yb, Z1], [Ye, Z2], [Ye, Zt]];
  const rod = P.rodY;                                  // [-190.5 … +190.5]
  for (let i = rod.length - 1; i > 0; i--) {           // hueco de paso de la banda
    const a = rod[i] - ds, b = rod[i - 1] + ds;
    pts.push([a, Zt], [a, Zh + rc]);
    pts.push(...arcoPts(a - rc, Zh + rc, rc, 0, -Math.PI / 2, 6));
    pts.push(...arcoPts(b + rc, Zh + rc, rc, -Math.PI / 2, -Math.PI, 6));
    pts.push([b, Zh + rc], [b, Zt]);
  }
  pts.push([-Ye, Zt], [-Ye, Z2], [-Yb, Z1]);
  return pts.map((q) => [r2(q[0]), r2(q[1])]);
}

// ---------------------------------------------------------------------------
// MÓDULO
// ---------------------------------------------------------------------------
export function bastidor(E) {
  const M = { chapas: 0, pernos: 0, desarrollos: {} };
  const FIJO = 'FIJO · ', MOVIL = 'MÓVIL · ';
  const chapa = (t, fibra, mat = 'acero A36 laminado en frío') =>
    ({ chapa: { t: r2(t), material: mat, fibra: fibra.map((q) => [r2(q[0]), r2(q[1])]), radio: r2(RB) } });
  const desa = (k, fibra, t) => { M.desarrollos[k] = desarrollo(fibra, t, RB, KF).largo; };

  // =========================================================================
  // 1. FIJO — canales laterales del transportador anfitrión (6-1/2" × 1-1/2" 12 GA)
  //    Sección conformada por su fibra media; alas hacia AFUERA. De ellos cuelga
  //    toda la transferencia. med: alma en Y=±229.9, ala superior en Z=383.1.
  // =========================================================================
  const zAlaSup = r2(L.canalZ1 - T12 / 2), zAlaInf = r2(L.canalZ0 + T12 / 2);
  for (const s of [1, -1]) {
    const fib = [
      [s * (P.almaY + P.canalAla), zAlaSup], [s * P.almaY, zAlaSup],
      [s * P.almaY, zAlaInf], [s * (P.almaY + P.canalAla), zAlaInf],
    ];
    const f = [sketchYZ(`Canal C 6-1/2×1-1/2 12 GA`, 0, seccionChapa(fib, T12, RB), P.largo)];
    // taladros de los 4 jack bolts (ala inferior) y del SIDE CHANNEL (alma)
    for (const x of L.jackX) {
      f.push(hole(`Jack bolt 3/8" Ø${PAS38}`, [x, s * P.jackY, L.canalZ0 + T12 + 2], [0, 0, -1], PAS38, 8, false));
      for (const dx of [-L.jackSupTornX, L.jackSupTornX]) {
        f.push(hole(`Ménsula jack sup Ø${PAS38}`, [x + dx, s * P.jackY, L.canalZ0 + T12 + 2], [0, 0, -1], PAS38, 8, false));
      }
    }
    for (const x of [60, 231.5, 403]) f.push(hole(`Unión SIDE CHANNEL Ø${PAS38}`, [x, s * (P.almaY + 4), 234], [0, -s, 0], PAS38, 10, false));
    // paso del perno 5/16-18 del RODILLO DE RETORNO B-20760 (entra desde fuera)
    f.push(hole(`Rodillo de retorno B-20760 Ø${rodRetorno.pasante}`,
      [rodRetorno.x, s * (P.almaY + 4), rodRetorno.z], [0, -s, 0], rodRetorno.pasante, 10, false));
    // paso de los 2 pernos de la oreja de la placa soporte de transmisión
    for (const z of L.transZ) f.push(hole(`Placa de transmisión Ø${PAS38}`, [L.transX, s * (P.almaY + 4), z], [0, -s, 0], PAS38, 10, false));
    E.addPart(`${FIJO}Canal lateral anfitrión 6-1/2"×1-1/2" 12 GA × ${P.largo} (${s > 0 ? '+Y' : '-Y'})`,
      COL.chapa, [0, s * P.almaY, L.canalZ0], f,
      { ...chapa(T12, fib), catalogo: 'perfil conformado 6-1/2 × 1-1/2 × 12 ga.' });
    M.chapas++;
    if (s > 0) desa('canal_anfitrion', fib, T12);
  }

  // =========================================================================
  // 2. FIJO — SIDE CHANNEL - 18 in. LONG (PT-087017). Cuelga a tope contra el
  //    alma del canal anfitrión; alas hacia DENTRO. Se atornilla con COLISAS
  //    verticales (txt pág. 8: "loosen the 3/8 in. bolts…" = reglaje de altura).
  // =========================================================================
  const ladoX0 = r2((P.largo - L.ladoLargo) / 2);
  const zLadoSup = r2(L.ladoZ1 - T12 / 2), zLadoInf = r2(L.ladoZ0 + T12 / 2);
  for (const s of [1, -1]) {
    const fib = [
      [s * (L.ladoY - L.ladoAla), zLadoSup], [s * L.ladoY, zLadoSup],
      [s * L.ladoY, zLadoInf], [s * (L.ladoY - L.ladoAla), zLadoInf],
    ];
    const f = [sketchYZ('Canal C 6-1/2×1-1/2 12 GA', ladoX0, seccionChapa(fib, T12, RB), L.ladoLargo)];
    // colisas verticales de reglaje (±8 mm) en el alma
    for (const x of [60, 231.5, 403]) {
      f.push(sketchXZ(`Colisa reglaje ${PAS38}×${r2(PAS38 + 16)}`,
        s > 0 ? L.ladoY - 3 : -(L.ladoY + 3), colisa(x, 234, r2(PAS38 + 16), PAS38, true), 6, 'cut'));
    }
    // taladros de las ménsulas de jack bolt inferiores y de las tapas del canal base
    for (const x of L.jackX) for (const z of [100, 118]) {
      f.push(hole(`Ménsula jack Ø${PAS38}`, [x, s * (L.ladoY + 4), z], [0, -s, 0], PAS38, 10, false));
    }
    for (const x of L.baseTornX) {
      f.push(hole(`Tapa canal base Ø${PAS38}`, [x, s * 210, L.ladoZ0 - 2], [0, 0, 1], PAS38, 8, false));
    }
    // paso de los tornillos que cuelgan y regulan el canal de montaje del cilindro
    for (const x of L.cilgX) {
      f.push(hole(`Cuelgue canal del cilindro Ø${L.cilgD}`, [x, s * (L.ladoY + 4), L.cilgZ],
        [0, -s, 0], L.cilgD, 10, false));
    }
    // Ventana de paso de la OREJA de la placa soporte de transmisión: esa oreja
    // busca el ALMA DEL CANAL ANFITRIÓN (Y = P.almaY) y este canal se le cruza.
    f.push(box('Ventana de paso de la placa de transmisión',
      [r2((L.ventanaX[0] + L.ventanaX[1]) / 2), s * r2(L.ladoY - L.ladoAla / 2), L.ventanaZ],
      r2(L.ventanaX[1] - L.ventanaX[0]), r2(L.ladoAla + 14), r2(L.ladoZ1 - L.ventanaZ + 6), 'cut'));
    E.addPart(`${FIJO}Side channel 6-1/2"×1-1/4" 12 GA × ${L.ladoLargo} (${s > 0 ? '+Y' : '-Y'})`,
      COL.fijo, [ladoX0, s * L.ladoY, L.ladoZ0], f,
      { ...chapa(T12, fib), catalogo: 'PT-087017 · SIDE CHANNEL - 18 in. LONG' });
    M.chapas++;
    if (s > 0) desa('side_channel', fib, T12);
    // tornillería alma-contra-alma (entra desde fuera del transportador)
    for (const x of [60, 231.5, 403]) {
      tornilleria(E, {
        nombre: `Side channel ${s > 0 ? '+Y' : '-Y'} X${x}`, capa: FIJO,
        at: [x, s * r2(P.almaY + T12 / 2), 234], dir: [0, -s, 0], agarre: 2 * T12,
      });
      M.pernos++;
    }
  }

  // =========================================================================
  // 3. FIJO — BASE CHANNEL WELDMENT (WA-025817): canal en U que une los dos
  //    laterales por abajo (Z = P.baseZ) + 2 tapas de extremo soldadas.
  // =========================================================================
  {
    const yTapa = r2(L.ladoY - T12 / 2 - T12);           // cara interior del alma − tapa
    const fib = [
      [L.baseX0 + T12 / 2, L.baseZ1 - T12 / 2], [L.baseX0 + T12 / 2, P.baseZ + T12 / 2],
      [L.baseX1 - T12 / 2, P.baseZ + T12 / 2], [L.baseX1 - T12 / 2, L.baseZ1 - T12 / 2],
    ];
    const yv = r2(L.ladoY - T12 / 2 - T12 / 2);          // fibra media del alma de la tapa
    const xAlaIzq = r2(L.baseX0 + T12 / 2), xAlaDer = r2(L.baseX1 - T12 / 2);   // 27.33 / 100.87
    const u4Pos = largoRanura(18, 'posicion');
    const u4Paso = largoRanura(20, 'paso');
    const zU4 = r2((ENC.u4.zPos[0] + ENC.u4.zPos[1]) / 2);                       // 39
    // ENCAJE U4 — lengüetas del canal base que atraviesan las tapas de extremo
    const fBase = [sketchXZ('Canal U 3"×1-1/2" 12 GA', yTapa, seccionChapa(fib, T12, RB), r2(2 * yTapa))];
    for (const s of [1, -1]) {
      fBase.push(box(`Lengüeta de posición ${T12}×18 (ala −X, ${s > 0 ? '+Y' : '−Y'})`,
        [xAlaIzq, s * r2(yTapa + T12 / 2), ENC.u4.zPos[0]], T12, T12, 18));
      fBase.push(box(`Lengüeta de paso ${T12}×20 (ala +X, ${s > 0 ? '+Y' : '−Y'})`,
        [xAlaDer, s * r2(yTapa + T12 / 2), ENC.u4.zPaso[0]], T12, T12, 20));
    }
    E.addPart(`${FIJO}Canal base en U 76×38 12 GA × ${r2(2 * yTapa)}`, COL.fijo,
      [0, yTapa, P.baseZ], fBase,
      { ...chapa(T12, fib), catalogo: 'WA-025817 · BASE CHANNEL WELDMENT', union: 'soldada a las tapas',
        encajes: [1, -1].flatMap((s) => [
          encaje({ id: `U4-${s > 0 ? '+Y' : '-Y'}-pos`, union: 'Canal base ↔ Tapa de extremo',
            tipo: 'lengueta', rol: 'posicion', lado: 'lengueta', gdl: ['X', 'Z'],
            lengueta: { calibre: '12GA', t: T12, ancho: 18, sale: T12 },
            ranura: { ancho: RAN12.ancho, largo: u4Pos.largo },
            nota: `ala −X del canal (X=${xAlaIzq}); sitúa la tapa en X y en Z. ${RAN12.cadena}` }),
          encaje({ id: `U4-${s > 0 ? '+Y' : '-Y'}-paso`, union: 'Canal base ↔ Tapa de extremo',
            tipo: 'lengueta', rol: 'paso', lado: 'lengueta', gdl: [],
            lengueta: { calibre: '12GA', t: T12, ancho: 20, sale: T12 },
            ranura: { ancho: r2(RAN12.ancho + 2), largo: u4Paso.largo },
            nota: 'ala +X: ranura 1 mm más grande por lado en las DOS direcciones — no sitúa, '
              + 'sujeta mientras se puntea y deja ventana de soldadura' }),
        ]) });
    M.chapas++; desa('canal_base', fib, T12);

    for (const s of [1, -1]) {
      const fibT = [[s * yv, P.baseZ], [s * yv, 83.57], [s * 200, 83.57]];
      const largoTapa = r2(L.baseTapaX[1] - L.baseTapaX[0]);
      const f = [sketchYZ('Tapa en L', L.baseTapaX[0], seccionChapa(fibT, T12, RB), largoTapa)];
      for (const x of L.baseTornX) f.push(hole(`Unión side channel Ø${PAS38}`, [x, s * 210, 80], [0, 0, 1], PAS38, 10, false));
      // ENCAJE U4 — ranuras que reciben las lengüetas del canal base
      // `sketchXZ` corta de yFace−0.5 a yFace+h (normal −Y): se encuadra el alma
      // de la tapa (|Y| 223.25…225.91) con 0.75 mm de sobra por cada cara.
      const yCorte = s > 0 ? r2(yv - T12 / 2 - 0.75) : r2(-(yv + T12 / 2) - 1.75);
      f.push(sketchXZ(`Ranura de posición ${RAN12.ancho}×${u4Pos.largo} (ala −X)`,
        yCorte, ranuraRect(xAlaIzq, zU4, RAN12.ancho, u4Pos.largo), 5, 'cut'));
      f.push(sketchXZ(`Ranura de paso ${r2(RAN12.ancho + 2)}×${u4Paso.largo} (ala +X)`,
        yCorte, ranuraRect(xAlaDer, zU4, r2(RAN12.ancho + 2), u4Paso.largo), 5, 'cut'));
      E.addPart(`${FIJO}Tapa extremo canal base 12 GA ${largoTapa}×67 (${s > 0 ? '+Y' : '-Y'})`, COL.fijo,
        [L.baseTapaX[0], s * yv, P.baseZ], f, { ...chapa(T12, fibT), union: 'soldada al canal base',
          encajes: [
            encaje({ id: `U4-${s > 0 ? '+Y' : '-Y'}-pos`, union: 'Canal base ↔ Tapa de extremo',
              tipo: 'ranura', rol: 'posicion', lado: 'ranura', gdl: ['X', 'Z'],
              lengueta: { calibre: '12GA', t: T12, ancho: 18, sale: T12 },
              ranura: { ancho: RAN12.ancho, largo: u4Pos.largo },
              nota: `holgura por lado ${RAN12.holguraPorLado.join('…')} mm en X y `
                + `${u4Pos.holguraPorLado.join('…')} en Z` }),
            encaje({ id: `U4-${s > 0 ? '+Y' : '-Y'}-paso`, union: 'Canal base ↔ Tapa de extremo',
              tipo: 'ranura', rol: 'paso', lado: 'ranura', gdl: [],
              lengueta: { calibre: '12GA', t: T12, ancho: 20, sale: T12 },
              ranura: { ancho: r2(RAN12.ancho + 2), largo: u4Paso.largo },
              nota: 'no sitúa: ≈1 mm de holgura por lado en las dos direcciones' }),
          ] });
      M.chapas++;
      for (const x of L.baseTornX) {
        tornilleria(E, {
          nombre: `Canal base ${s > 0 ? '+Y' : '-Y'} X${x}`, capa: FIJO,
          at: [x, s * 210, r2(83.57 - T12 / 2)], dir: [0, 0, 1], agarre: 2 * T12,
        });
        M.pernos++;
      }
    }
  }

  // =========================================================================
  // 4. FIJO — ménsulas de los JACK BOLTS (4 arriba + 4 abajo). Sólo las orejas
  //    con su agujero de paso de 3/8"; los tornillos los pone elevacion.mjs.
  //    med: jack bolts en Y = ±P.jackY, Z = P.jackSupZ / P.jackInfZ.
  // =========================================================================
  for (const s of [1, -1]) for (const x of L.jackX) {
    // superior: doblador bajo el ala inferior del canal anfitrión
    const zSup = r2(L.canalZ0 - T12);
    const fSup = [
      box(`Placa ${L.jackSupAncho}×${r2(L.jackY1 - L.jackY0)} 12 GA`,
        [x, s * r2((L.jackY0 + L.jackY1) / 2), zSup], L.jackSupAncho, r2(L.jackY1 - L.jackY0), T12),
      hole(`Paso jack bolt Ø${PAS38}`, [x, s * P.jackY, zSup - 2], [0, 0, 1], PAS38, 8, false),
    ];
    for (const dx of [-L.jackSupTornX, L.jackSupTornX]) {
      fSup.push(hole(`Fijación Ø${PAS38}`, [x + dx, s * P.jackY, zSup - 2], [0, 0, 1], PAS38, 8, false));
    }
    E.addPart(`${FIJO}Ménsula jack bolt superior 12 GA ${L.jackSupAncho}×30 (${s > 0 ? '+Y' : '-Y'} X${x})`,
      COL.fijo, [x, s * P.jackY, zSup], fSup, { chapa: { t: r2(T12), material: 'acero A36', fibra: [], radio: 0 } });
    M.chapas++;
    for (const dx of [-L.jackSupTornX, L.jackSupTornX]) {
      tornilleria(E, {
        nombre: `Ménsula jack sup ${s > 0 ? '+Y' : '-Y'} X${r2(x + dx)}`, capa: FIJO,
        at: [x + dx, s * P.jackY, zSup], dir: [0, 0, 1], agarre: 2 * T12,
      });
      M.pernos++;
    }
    // inferior: angular atornillado al alma exterior del SIDE CHANNEL
    // el ala vertical apoya en la cara EXTERIOR del alma del SIDE CHANNEL (Y=228.57):
    // su fibra media va medio espesor más afuera, o si no se mete dentro del alma.
    const yAlma = P.almaY;
    const fibInf = [[s * yAlma, 130], [s * yAlma, P.jackInfZ], [s * L.jackY1, P.jackInfZ]];
    const fInf = [
      sketchYZ('Angular ménsula', x - L.jackAncho / 2, seccionChapa(fibInf, T12, RB), L.jackAncho),
      hole(`Paso jack bolt Ø${PAS38}`, [x, s * P.jackY, P.jackInfZ + T12 / 2 + 2], [0, 0, -1], PAS38, 8, false),
    ];
    for (const z of [100, 118]) fInf.push(hole(`Fijación Ø${PAS38}`, [x, s * (yAlma + 4), z], [0, -s, 0], PAS38, 10, false));
    E.addPart(`${FIJO}Ménsula jack bolt inferior 12 GA ${L.jackAncho}×47 (${s > 0 ? '+Y' : '-Y'} X${x})`,
      COL.fijo, [x, s * yAlma, P.jackInfZ], fInf, { ...chapa(T12, fibInf) });
    M.chapas++;
    for (const z of [100, 118]) {
      tornilleria(E, {
        nombre: `Ménsula jack inf ${s > 0 ? '+Y' : '-Y'} X${x} Z${z}`, capa: FIJO,
        at: [x, s * r2(P.almaY + T12 / 2), z], dir: [0, -s, 0], agarre: 2 * T12,
      });
      M.pernos++;
    }
  }

  // =========================================================================
  // 5. MÓVIL — ROLLER FRAME WELDMENT: 2 placas peine de 3/16"
  //    6 taladros pasantes a paso P.paso para los pernos de los rodillos, huecos
  //    de paso de las 5 bandas angostas, y (lado motriz) los ejes del serpentín.
  // =========================================================================
  const sil = siluetaPeine();
  const idlerY = P.bandaY.filter((y) => Math.abs(y) > 1);      // 4 poleas locas
  for (const [i, xc] of [L.placaXa, L.placaXb].entries()) {
    const motriz = i === 0;
    const f = [sketchYZ(`Placa peine 3/16" ${2 * L.peineY}×${r2(L.peineZt - L.peineZ0)}`,
      r2(xc - T316 / 2), sil, T316)];
    if (motriz) {
      for (const y of idlerY) f.push(hole(`Eje polea loca 9/16" Ø${r2(P.idlerEje + P.holgura.deslizante)}`,
        [xc - T316, y, P.idlerZ], [1, 0, 0], r2(P.idlerEje + P.holgura.deslizante), T316 + 4, false));
      for (const s of [1, -1]) f.push(hole(`Eje polea retorno Ø${r2(P.idlerEje + P.holgura.deslizante)}`,
        [xc - T316, s * P.retornoY, P.retornoZ], [1, 0, 0], r2(P.idlerEje + P.holgura.deslizante), T316 + 4, false));
      f.push(hole(`Paso eje motriz / buje Ø${r2(P.bujeDia + P.holgura.pasante)}`,
        [xc - T316, 0, P.motrizZ], [1, 0, 0], r2(P.bujeDia + P.holgura.pasante), T316 + 4, false));
    }
    for (const y of L.espTornY) {
      f.push(hole(`Spacer plate Ø${PAS38}`, [xc - T316, y, L.espTornZ], [1, 0, 0], PAS38, T316 + 4, false));
    }
    // MONTAJE DEL RODILLO: un taladro pasante por diente, coaxial con el rodillo.
    // Por él entra —desde FUERA de la placa— el perno 1/4-20 que rosca en el hilo
    // interior de la punta del eje (rodillos.mjs). Sustituye a la ranura en U.
    for (const y of P.rodY) {
      f.push(hole(`Perno de rodillo 1/4-20 Ø${L.rodPasante}`, [xc - T316, y, P.rodZ],
        [1, 0, 0], L.rodPasante, T316 + 4, false));
    }
    if (motriz) {                         // fijación de la TRANSFER ROLLER GUARD
      for (const y of L.guardaTornY) for (const z of L.guardaTornZ) {
        f.push(hole(`Guarda Ø${PAS38}`, [xc - T316, y, z], [1, 0, 0], PAS38, T316 + 4, false));
      }
    }
    // ENCAJE U1 — ranuras que reciben la lengüeta del ala superior de cada
    // TRANSFER CROSS CHANNEL. `sketchYZ` corta de xFace−h a xFace+0.5, así que
    // se ancla en la cara +X de la placa y se le da h = espesor + 2.
    for (const s of [1, -1]) {
      f.push(sketchYZ(`Ranura de posición ${u1Largo}×${RAN12.ancho} (cross channel ${s > 0 ? '+Y' : '−Y'})`,
        r2(xc + T316 / 2), ranuraRect(s * ENC.u1.y, ENC.u1.z, u1Largo, RAN12.ancho), r2(T316 + 2), 'cut'));
    }
    if (!motriz) {                        // paso de la cola del motorreductor
      f.push(hole(`Paso del motorreductor Ø${L.motorPaso}`, [xc - T316, 0, P.motrizZ],
        [1, 0, 0], L.motorPaso, T316 + 6, false));
    }
    E.addPart(`${MOVIL}Placa peine 3/16" ${2 * L.peineY}×${r2(L.peineZt - L.peineZ0)} (lado ${motriz ? 'motriz' : 'libre'})`,
      COL.movil, [r2(xc - T316 / 2), 0, L.peineZ0], f, {
        chapa: { t: r2(T316), material: 'acero A36 laminado en caliente 3/16"', fibra: [], radio: 0 },
        catalogo: 'WA-025802 · ROLLER FRAME WELDMENT (SPECIFY BR)', corte: 'láser / plasma, contorno único',
        weldment: 'WA-025802',
        encajes: [1, -1].map((s) => encaje({
          id: `U1-${motriz ? 'motriz' : 'libre'}-${s > 0 ? '+Y' : '-Y'}`,
          union: 'Transfer cross channel ↔ Placa peine',
          tipo: 'ranura', rol: 'posicion', lado: 'ranura', gdl: ['Y', 'Z'],
          lengueta: { calibre: '12GA', t: T12, ancho: ENC.u1.ancho, sale: T316 },
          ranura: { ancho: RAN12.ancho, largo: u1Largo },
          nota: `en el ala superior del canal (Z=${ENC.u1.z}), a |Y|=${ENC.u1.y}: 11.2 mm al hueco `
            + `de paso de banda y 10.6 al canto de la placa, los dos por encima de 1.5·e = 7.1 mm. `
            + `Holgura por lado ${RAN12.holguraPorLado.join('…')} mm en Z y `
            + `${largoRanura(ENC.u1.ancho, 'posicion').holguraPorLado.join('…')} en Y`,
        })),
      });
    M.chapas++;
  }

  // =========================================================================
  // 6. MÓVIL — TRANSFER CROSS CHANNEL ×2 (PT-086818): canal en U que une las dos
  //    placas peine por arriba. Alas hacia dentro; queda bajo el barrido del
  //    rodillo (Z ≤ 355.8 frente a la generatriz inferior 362 − 10 de carrera).
  // =========================================================================
  const xCruz0 = r2(L.placaXa + T316 / 2), xCruz1 = r2(L.placaXb - T316 / 2);
  for (const s of [1, -1]) {
    const fib = [
      [s * (L.cruzY - L.cruzAla), L.cruzZ0 + T12 / 2], [s * L.cruzY, L.cruzZ0 + T12 / 2],
      [s * L.cruzY, L.cruzZ1 - T12 / 2], [s * (L.cruzY - L.cruzAla), L.cruzZ1 - T12 / 2],
    ];
    const f = [sketchYZ('Canal U 2"×1-1/2" 12 GA', xCruz0, seccionChapa(fib, T12, RB), r2(xCruz1 - xCruz0))];
    // MUESCA de las alas en el plano del serpentín: el ramal que sube de la polea
    // loca Y=152.4 al rodillo Y=190.5 cruza este canal. Se recortan las dos alas y
    // el alma (Y ≥ 196) queda entera.
    f.push(box('Muesca de paso del serpentín',
      [r2((L.serpMuescaX[0] + L.serpMuescaX[1]) / 2), s * r2((L.serpMuescaY[0] + L.serpMuescaY[1]) / 2), L.cruzZ0 - 4],
      r2(L.serpMuescaX[1] - L.serpMuescaX[0]), r2(L.serpMuescaY[1] - L.serpMuescaY[0]),
      r2(L.cruzZ1 - L.cruzZ0 + 8), 'cut'));
    for (const x of [118, 133]) f.push(hole(`Guarda serpentín Ø${PAS38}`, [x, s * 175, L.cruzZ0 - 2], [0, 0, 1], PAS38, 8, false));
    // ENCAJE U1 — una lengüeta de posición por extremo, en el ALA SUPERIOR.
    // Sale hasta la cara EXTERIOR de la placa peine (largo = espesor de la placa)
    // y no la sobrepasa: por fuera está la guarda del rodillo.
    for (const [j, xTab] of [r2(xCruz0 - T316 / 2), r2(xCruz1 + T316 / 2)].entries()) {
      f.push(box(`Lengüeta de posición ${ENC.u1.ancho}×${T12} (extremo ${j ? 'libre' : 'motriz'})`,
        [xTab, s * ENC.u1.y, r2(ENC.u1.z - T12 / 2)], T316, ENC.u1.ancho, T12));
    }
    E.addPart(`${MOVIL}Transfer cross channel 2"×1-1/2" 12 GA × ${r2(xCruz1 - xCruz0)} (${s > 0 ? '+Y' : '-Y'})`,
      COL.movil, [xCruz0, s * L.cruzY, L.cruzZ0], f,
      { ...chapa(T12, fib), catalogo: 'PT-086818 · TRANSFER CROSS CHANNEL', union: 'soldada a las placas peine',
        encajes: ['motriz', 'libre'].map((ext) => encaje({
          id: `U1-${ext}-${s > 0 ? '+Y' : '-Y'}`, union: 'Transfer cross channel ↔ Placa peine',
          tipo: 'lengueta', rol: 'posicion', lado: 'lengueta', gdl: ['Y', 'Z'],
          lengueta: { calibre: '12GA', t: T12, ancho: ENC.u1.ancho, sale: T316 },
          ranura: { ancho: RAN12.ancho, largo: u1Largo },
          nota: 'una sola lengüeta por extremo: dos (ala superior + ala inferior) fijarían Z dos '
            + 'veces en la misma estación y el conjunto no entraría. X lo fija la TESTA del canal '
            + 'contra la cara interior de la placa; θ, las dos lengüetas separadas 378 mm.',
        })).concat([
          juntaATope({ id: `U1-tope-${s > 0 ? '+Y' : '-Y'}`, union: 'Transfer cross channel ↔ Placa peine',
            motivo: 'la testa cortada del canal apoya plana contra la cara INTERIOR de la placa peine',
            posicionamiento: 'extremo MOTRIZ = referencia (a tope); en el extremo libre la holgura de '
              + `ajuste (hasta ${tol13920(r2(xCruz1 - xCruz0), 'B')} mm por ISO 13920-B sobre `
              + `${r2(xCruz1 - xCruz0)} mm) la absorbe el cordón`,
            referencia: 'cara interior de la placa peine del lado motriz (X = 42.48)' }),
        ]) });
    M.chapas++;
    if (s > 0) desa('cross_channel', fib, T12);
  }

  // =========================================================================
  // 7. MÓVIL — NOTCHED BRACE CHANNEL WELDMENT ×2: canal en U con MUESCA que deja
  //    pasar el serpentín (plano X = P.planoSerp). Su cara inferior (Z = P.rielInfZ)
  //    es el riel contra el que empuja el plato de la mesa guía neumática.
  // =========================================================================
  // X del canal: de cara a cara de las dos SPACER PLATE. La motriz se extruye
  // desde `espX[0]` hacia +X (ocupa 42.48…47.24) y la libre desde `espX[1]`
  // hacia +X (415.76…420.52), así que el canal va de 47.24 a 415.76.
  // Estaba `espX[1] − T316` = 411.0: el canal se quedaba a 4.76 mm de la spacer
  // plate libre, o sea que la unión que el propio nombre declara soldada NO
  // TOCABA. Corregido; el tramo ganado está libre (el ventilador del SEW llega a
  // |Y| = 65 y este canal empieza en |Y| = 80).
  const xBr0 = r2(L.espX[0] + T316), xBr1 = L.espX[1];
  for (const s of [1, -1]) {
    const yi = s * (L.braceY - L.braceSemi), yo = s * (L.braceY + L.braceSemi);
    const fib = [
      [yi + s * T12 / 2, L.braceZ1 - T12 / 2], [yi + s * T12 / 2, L.braceZ0 + T12 / 2],
      [yo - s * T12 / 2, L.braceZ0 + T12 / 2], [yo - s * T12 / 2, L.braceZ1 - T12 / 2],
    ];
    const f = [
      sketchYZ('Canal U 1-3/4"×40 12 GA', xBr0, seccionChapa(fib, T12, RB), r2(xBr1 - xBr0)),
      // MUESCA A — recorta el ALMA: por aquí cruza a lo ancho el ramal de retorno
      // del serpentín (Z 142.4…144.9) entre las dos poleas de retorno.
      box('Muesca del alma (ramal de retorno)', [r2((L.muescaX0 + L.muescaX1) / 2), s * L.braceY, L.braceZ0 - 3],
        r2(L.muescaX1 - L.muescaX0), 2 * L.braceSemi + 6, r2(L.muescaZ1 - L.braceZ0 + 3), 'cut'),
      // MUESCA B — recorta el ALA EXTERIOR: por aquí pasan las poleas de retorno
      // Ø2-1/2" (Y 112.8…176.3). El ala interior sigue de largo y hace de puente.
      box('Muesca del ala exterior (poleas de retorno)',
        [r2((L.muescaX0 + L.muescaX1) / 2), s * r2(L.braceY + L.braceSemi / 2 + 3), L.muescaZ1],
        r2(L.muescaX1 - L.muescaX0), r2(L.braceSemi + 6), 60, 'cut'),
    ];
    // desahogos de pliegue en las esquinas de la muesca
    for (const x of [L.muescaX0, L.muescaX1]) for (const yy of [yi, yo]) {
      f.push(hole(`Desahogo Ø${r2(2 * T12)}`, [x, yy - s * 8, L.muescaZ1 - 3], [0, s, 0], r2(2 * T12), 16, false));
    }
    // ENCAJE U3 — agujeros de pasador / soldadura de tapón que reciben la cartela
    // (CROSS ANGLE). Aquí van los DOS redondos; la cartela lleva uno redondo y el
    // otro en colisa, que es lo que sitúa sin sobre-restringir.
    for (const x of ENC.u3.x) {
      f.push(hole(`Pasador de montaje / tapón Ø${ENC.u3.dia} (cartela, X=${x})`,
        [x, s * (L.braceY - L.braceSemi - 4), ENC.u3.z], [0, s, 0], ENC.u3.dia, 12, false));
    }
    // ENCAJE U2 — lengüetas en las dos SPACER PLATE
    for (const [j, xTab] of [r2(xBr0 - T316 / 2), r2(xBr1 + T316 / 2)].entries()) {
      f.push(box(`Lengüeta de posición ${ENC.u2.ancho}×${T12} en el alma (extremo ${j ? 'libre' : 'motriz'})`,
        [xTab, s * ENC.u2.y, r2(ENC.u2.z - T12 / 2)], T316, ENC.u2.ancho, T12));
      f.push(box(`Lengüeta de paso ${u2PasoAlto}×${T12} en el ala interior (extremo ${j ? 'libre' : 'motriz'})`,
        [xTab, s * ENC.u2.pasoY, ENC.u2.pasoZ[0]], T316, T12, u2PasoAlto));
    }
    E.addPart(`${MOVIL}Notched brace channel 1-3/4"×40 12 GA × ${r2(xBr1 - xBr0)} (${s > 0 ? '+Y' : '-Y'})`,
      COL.movil, [xBr0, s * L.braceY, L.braceZ0], f,
      { ...chapa(T12, fib), catalogo: 'NOTCHED BRACE CHANNEL WELDMENT', union: 'soldada a las spacer plate',
        encajes: ['motriz', 'libre'].flatMap((ext) => [
          encaje({ id: `U2-${ext}-${s > 0 ? '+Y' : '-Y'}-pos`, union: 'Notched brace channel ↔ Spacer plate',
            tipo: 'lengueta', rol: 'posicion', lado: 'lengueta', gdl: ['Y', 'Z'],
            lengueta: { calibre: '12GA', t: T12, ancho: ENC.u2.ancho, sale: T316 },
            ranura: { ancho: RAN12.ancho, largo: u2Largo },
            nota: `en el ALMA (Z=${ENC.u2.z}), a |Y|=${ENC.u2.y}: 47 mm al canto inferior de la `
              + 'spacer plate y 30 al superior' }),
          encaje({ id: `U2-${ext}-${s > 0 ? '+Y' : '-Y'}-paso`, union: 'Notched brace channel ↔ Spacer plate',
            tipo: 'lengueta', rol: 'paso', lado: 'lengueta', gdl: [],
            lengueta: { calibre: '12GA', t: T12, ancho: u2PasoAlto, sale: T316 },
            ranura: { ancho: r2(RAN12.ancho + 2), largo: u2PasoLargo },
            nota: 'en el ala interior; holgada en las dos direcciones para no competir con la de '
              + 'posición. Sujeta el canal mientras se puntea.' }),
        ]).concat([
          encaje({ id: `U3-${s > 0 ? '+Y' : '-Y'}-a`, union: 'Cross angle ↔ Notched brace channel',
            tipo: 'pasador', rol: 'posicion', lado: 'pasador', gdl: ['X', 'Z'],
            lengueta: { dia: ENC.u3.dia }, ranura: { dia: ENC.u3.dia },
            nota: `redondo Ø${ENC.u3.dia} H8 en X=${ENC.u3.x[0]}, Z=${ENC.u3.z}` }),
          encaje({ id: `U3-${s > 0 ? '+Y' : '-Y'}-b`, union: 'Cross angle ↔ Notched brace channel',
            tipo: 'pasador', rol: 'paso', lado: 'pasador', gdl: [],
            lengueta: { dia: ENC.u3.dia }, ranura: { dia: ENC.u3.dia, colisa: ENC.u3.colisa },
            nota: `redondo Ø${ENC.u3.dia} en el canal contra COLISA ${ENC.u3.dia}×${ENC.u3.colisa} en `
              + 'la cartela: absorbe la tolerancia de distancia entre los dos taladros y sólo deja '
              + 'fijado el giro' }),
        ]) });
    M.chapas++;
    if (s > 0) desa('brace_channel', fib, T12);
  }

  // =========================================================================
  // 8. MÓVIL — CROSS ANGLE - 8-1/2 in. LONG ×2 (PT-086833): angular transversal
  //    soldado bajo los dos NOTCHED BRACE CHANNEL; cierra el cassette por abajo.
  // =========================================================================
  const angLargo = r2(8.5 * 25.4);                       // cat 215.9 = 8-1/2"
  for (const s of [1, -1]) {
    const zTop = r2(L.braceZ1 - T12 / 2);
    const fib = [[s * L.angY[0], L.angZ0], [s * L.angY[0], zTop], [s * L.angY[1], zTop]];
    const fAng = [sketchYZ('Angular 1-3/4×1 12 GA', L.angX0, seccionChapa(fib, T12, RB), angLargo)];
    for (const [tx, ty] of L.angTorn) {
      fAng.push(hole(`Placa de transmisión Ø${PAS38}`, [tx, s * ty, r2(L.braceZ1 + 2)], [0, 0, -1], PAS38, 8, false));
    }
    // relieve para las 2 TUERCAS de esos pernos: quedan bajo el ala horizontal y su
    // hexágono (R=8.24 en torno a Y=90.5) llega a Y=82.25, dentro del ala vertical.
    fAng.push(box('Relieve de las tuercas de la placa de transmisión',
      [r2((L.angTorn[0][0] + L.angTorn[1][0]) / 2), s * r2(L.angY[0] + 2), 173],
      r2(L.angTorn[1][0] - L.angTorn[0][0] + 22), 10, r2(L.braceZ1 - T12 - 173), 'cut'));
    // ENCAJE U3 — REDONDO + COLISA. La cartela se solapa cara contra cara con el
    // ala del canal: en chapas PARALELAS no cabe lengüeta, así que lo que sitúa
    // son dos agujeros de pasador de montaje. El segundo va en colisa porque dos
    // redondos sobre dos redondos exigirían que la distancia entre taladros
    // coincidiera en las dos piezas dentro de la holgura del pasador; con la
    // colisa, la tolerancia de esa distancia (±0.5 por ISO 2768-m sobre 110 mm)
    // deja de ser un problema y el conjunto sigue sin poder girar.
    // Cortan de yFace−0.5 a yFace+h (normal −Y de `sketchXZ`).
    const yCortAng = s > 0 ? r2(L.angY[0] - T12 / 2 - 1) : r2(-(L.angY[0] + T12 / 2) - 2);
    fAng.push(hole(`Pasador de montaje / tapón Ø${ENC.u3.dia} H8 (X=${ENC.u3.x[0]})`,
      [ENC.u3.x[0], s * (L.angY[0] - 6), ENC.u3.z], [0, s, 0], ENC.u3.dia, 12, false));
    fAng.push(sketchXZ(`Colisa de montaje / tapón ${ENC.u3.dia}×${ENC.u3.colisa} (X=${ENC.u3.x[1]})`,
      yCortAng, colisa(ENC.u3.x[1], ENC.u3.z, ENC.u3.colisa, ENC.u3.dia, false), 6, 'cut'));
    E.addPart(`${MOVIL}Cross angle 1-3/4"×1" 12 GA × ${angLargo} (cartela de la muesca ${s > 0 ? '+Y' : '-Y'})`,
      COL.movil, [L.angX0, s * L.angY[0], L.angZ0], fAng,
      { ...chapa(T12, fib), catalogo: 'PT-086833 · CROSS ANGLE - 8-1/2 in. LONG',
        union: 'soldada al ala interior del brace channel; puentea la muesca',
        encajes: [
          encaje({ id: `U3-${s > 0 ? '+Y' : '-Y'}-a`, union: 'Cross angle ↔ Notched brace channel',
            tipo: 'pasador', rol: 'posicion', lado: 'agujero', gdl: ['X', 'Z'],
            lengueta: { dia: ENC.u3.dia }, ranura: { dia: ENC.u3.dia },
            nota: `Ø${ENC.u3.dia} H8 con pasador Ø${ENC.u3.dia} h8; tras puntear se retira y el `
              + 'agujero queda como soldadura de tapón' }),
          encaje({ id: `U3-${s > 0 ? '+Y' : '-Y'}-b`, union: 'Cross angle ↔ Notched brace channel',
            tipo: 'pasador', rol: 'paso', lado: 'agujero', gdl: [],
            lengueta: { dia: ENC.u3.dia }, ranura: { dia: ENC.u3.dia, colisa: ENC.u3.colisa },
            nota: `colisa ${ENC.u3.dia}×${ENC.u3.colisa} orientada en X, que es la dirección en la `
              + 'que se acumula la tolerancia de distancia entre los dos taladros' }),
          juntaATope({ id: `U3-solape-${s > 0 ? '+Y' : '-Y'}`, union: 'Cross angle ↔ Notched brace channel',
            motivo: 'solape de chapas paralelas: la cara del ala vertical de la cartela apoya en la '
              + 'cara interior del ala del canal, y esa cara fija Y',
            posicionamiento: 'apoyo plano + los dos pasadores de montaje',
            referencia: 'cara interior del ala del notched brace channel (|Y| = 82.66)' }),
        ] });
    M.chapas++;
    if (s > 0) desa('cross_angle', fib, T12);
    // tuercas soldadas bajo el ala: el perno de transmision.mjs entra desde arriba
    for (const [tx, ty] of L.angTorn) {
      tuercaHex(E, {
        nombre: `3/8-16 SOLDADA bajo la cartela (X=${tx}, ${s > 0 ? '+Y' : '−Y'})`, capa: MOVIL,
        at: [tx, s * ty, r2(L.braceZ1 - T12)], dir: [0, 0, -1],
        dia: D38, af: P.M.b38.af, alto: P.M.b38.tuerca,
      });
      M.tuercasSoldadas = (M.tuercasSoldadas || 0) + 1;
    }
  }

  // =========================================================================
  // 9. MÓVIL — SPACER PLATE ×2 (PT-086781): placa de 3/16" atornillada a la cara
  //    interior de cada peine; cuadra el cassette y recibe los brace channel.
  // =========================================================================
  for (const [i, x0] of L.espX.entries()) {
    const f = [
      sketchYZ(`Placa 3/16" ${2 * L.peineYbajo}×${r2(L.espZ1 - L.espZ0)}`, x0,
        rectR(-L.peineYbajo, L.espZ0, L.peineYbajo, L.espZ1, 8), T316),
    ];
    for (const y of L.espTornY) f.push(hole(`Unión peine Ø${PAS38}`, [x0 - 2, y, L.espTornZ], [1, 0, 0], PAS38, T316 + 4, false));
    if (i) f.push(hole(`Paso del motorreductor Ø${L.motorPaso}`, [x0 - 2, 0, P.motrizZ], [1, 0, 0], L.motorPaso, T316 + 6, false));
    // ENCAJE U2 — ranuras que reciben las lengüetas de los 2 NOTCHED BRACE CHANNEL
    const zU2Paso = r2((ENC.u2.pasoZ[0] + ENC.u2.pasoZ[1]) / 2);
    for (const s of [1, -1]) {
      f.push(sketchYZ(`Ranura de posición ${u2Largo}×${RAN12.ancho} (brace channel ${s > 0 ? '+Y' : '−Y'}, alma)`,
        r2(x0 + T316), ranuraRect(s * ENC.u2.y, ENC.u2.z, u2Largo, RAN12.ancho), r2(T316 + 2), 'cut'));
      f.push(sketchYZ(`Ranura de paso ${r2(RAN12.ancho + 2)}×${u2PasoLargo} (brace channel ${s > 0 ? '+Y' : '−Y'}, ala)`,
        r2(x0 + T316), ranuraRect(s * ENC.u2.pasoY, zU2Paso, r2(RAN12.ancho + 2), u2PasoLargo), r2(T316 + 2), 'cut'));
    }
    E.addPart(`${MOVIL}Spacer plate 3/16" ${2 * L.peineYbajo}×${r2(L.espZ1 - L.espZ0)} (lado ${i ? 'libre' : 'motriz'})`,
      COL.movil, [x0, 0, L.espZ0], f, {
        chapa: { t: r2(T316), material: 'acero A36 3/16"', fibra: [], radio: 0 },
        catalogo: 'PT-086781 · SPACER PLATE (SPECIFY BR), RLR SUPT',
        union: 'atornillada a la placa peine; recibe soldados los 2 notched brace channel',
        encajes: [1, -1].flatMap((s) => [
          encaje({ id: `U2-${i ? 'libre' : 'motriz'}-${s > 0 ? '+Y' : '-Y'}-pos`,
            union: 'Notched brace channel ↔ Spacer plate',
            tipo: 'ranura', rol: 'posicion', lado: 'ranura', gdl: ['Y', 'Z'],
            lengueta: { calibre: '12GA', t: T12, ancho: ENC.u2.ancho, sale: T316 },
            ranura: { ancho: RAN12.ancho, largo: u2Largo },
            nota: `holgura por lado ${RAN12.holguraPorLado.join('…')} mm en Z y `
              + `${largoRanura(ENC.u2.ancho, 'posicion').holguraPorLado.join('…')} en Y` }),
          encaje({ id: `U2-${i ? 'libre' : 'motriz'}-${s > 0 ? '+Y' : '-Y'}-paso`,
            union: 'Notched brace channel ↔ Spacer plate',
            tipo: 'ranura', rol: 'paso', lado: 'ranura', gdl: [],
            lengueta: { calibre: '12GA', t: T12, ancho: u2PasoAlto, sale: T316 },
            ranura: { ancho: r2(RAN12.ancho + 2), largo: u2PasoLargo },
            nota: 'no sitúa: ≈1 mm de holgura por lado en las dos direcciones' }),
        ]),
      });
    M.chapas++;
    for (const y of L.espTornY) {
      const dir = i ? [-1, 0, 0] : [1, 0, 0];
      const at = i ? [r2(L.placaXb + T316 / 2), y, L.espTornZ] : [r2(L.placaXa - T316 / 2), y, L.espTornZ];
      tornilleria(E, { nombre: `Spacer plate ${i ? 'libre' : 'motriz'} Y${y}`, capa: MOVIL, at, dir, agarre: 2 * T316 });
      M.pernos++;
    }
  }

  // =========================================================================
  // 10. MÓVIL — TRANSFER ROLLER GUARD - 17 in. LONG (PT-086812): tapa de chapa
  //     14 GA sobre la cara EXTERIOR de la placa peine motriz. Sección en Z: alma
  //     separada 12 mm de la placa + dos pestañas de retorno que apoyan en ella y
  //     se atornillan con 4 pernos de 3/8" que entran desde fuera.
  // =========================================================================
  {
    const xPeine = r2(L.placaXa - T316 / 2);            // 37.72 — cara exterior del peine
    const xa = r2(L.guardaX + T14 / 2);                 // fibra media del alma
    const xb = r2(xPeine - T14 / 2);                    // fibra media de las pestañas
    const z0 = r2(L.guardaZ0 + T14 / 2), z1 = r2(L.guardaZ1 - T14 / 2);
    const fib = [
      [xb, r2(z0 + L.guardaTab)], [xb, z0], [xa, z0], [xa, z1], [xb, z1], [xb, r2(z1 - L.guardaTab)],
    ];
    const f = [sketchXZ('Guarda en Z 14 GA', L.guardaY, seccionChapa(fib, T14, RB), r2(2 * L.guardaY))];
    for (const y of L.guardaTornY) for (const z of L.guardaTornZ) {
      f.push(hole(`Fijación a la placa peine Ø${PAS38}`, [xPeine - T14 - 2, y, z], [1, 0, 0], PAS38, T14 + 5, false));
    }
    E.addPart(`${MOVIL}Transfer roller guard 14 GA ${r2(2 * L.guardaY)}×${r2(L.guardaZ1 - L.guardaZ0)}`,
      COL.guarda, [L.guardaX, L.guardaY, L.guardaZ0], f,
      { ...chapa(T14, fib, 'acero A36 14 GA'), catalogo: 'PT-086812 · TRANSFER ROLLER GUARD - 17 in. LONG' });
    M.chapas++; desa('guarda_rodillo', fib, T14);
    for (const y of L.guardaTornY) for (const z of L.guardaTornZ) {
      tornilleria(E, {
        nombre: `Guarda Y${y} Z${z}`, capa: MOVIL,
        at: [r2(xPeine - T14), y, z], dir: [1, 0, 0], agarre: r2(T14 + T316),
      });
      M.pernos++;
    }
  }

  // ------------------------------------------------------------------ métricas
  M.piezas = E.parts.length;
  M.juegoAxialRodillo = r2(P.rodX0 - (L.placaXa + T316 / 2));      // ≥ 1.5 mm por lado
  M.montajeRodillo = {
    tipo: 'taladro pasante en la placa + hilo interior en la punta del eje + perno por fuera',
    pasanteD: L.rodPasante, perno: '1/4-20 UNC', ejeZ: r2(P.rodZ),
    dienteSobreEje: r2(L.peineZt - P.rodZ),         // 9.01 = 1.42·d (AISC pide 9.53)
    taladros: 2 * P.nRodillos,
  };
  M.pasoRodillo = 'el rodillo se extrae VERTICALMENTE: quitados los 2 pernos nada lo retiene';
  M.interfaces = { apoyoMesaGuiaZ: padMovilZ, motorEnvX, mesaHuella, rodMontaje, rodRetorno };
  return M;
}

export default bastidor;
