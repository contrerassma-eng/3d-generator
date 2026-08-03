// params_adapt.mjs — TABLA ÚNICA de cotas de la ADAPTACIÓN del sorter CO a la
// transferencia NBT90. Decisión del cliente (ADAPTACION.md): el sorter cede;
// manda el espacio entre bandas de la transferencia.
//
// Procedencia de cada valor (regla de oro del repo):
//   step = MEDIDO sobre ref/sorter_CO.stp (SORTER_CO.md + analisis/*.json; se
//          cita la sección o el JSON).
//   nbt90= especificación CONGELADA de la transferencia (ensambles/nbt90/params.mjs).
//   calc = derivado aritméticamente de cotas step/nbt90 (la fórmula está al lado).
//   web  = dato externo con URL/fecha/cita en ../web_facts.json (se cita id).
//   dis  = decisión de diseño de esta adaptación (capa user). Lleva justificación.
//
// Ejes: los del STEP del cliente (SORTER_CO.md §0):
//   X = a lo ancho (reparto de calles) · Y = flujo del producto · Z = arriba.
//   Plano de transporte Z = +52.333 (step).

import { P } from '../../nbt90/params.mjs';

const r3 = (v) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------------------
// 1. Lo medido del cliente que esta adaptación usa como dato (step)
// ---------------------------------------------------------------------------
export const STEP = {
  planoBanda: 52.333,            // step §0 — cara superior de bandas y rodillos
  frameIntNeg: -81.423,          // step §1.3 — cara interior bastidor FRAME_MIR_MIR
  frameIntPos: 499.418,          // step §1.3 — cara interior FRAME_MIR_MIR_MIR
  frameZ: [-114.0, 46.0],        // step medidas.json — canto de los bastidores
  frameEsp: 28.0,                // step §5.1 — espesor del chapón del bastidor
  tslotY: [-1551.181, -53.819],  // step medidas.json — extremos del perfil TSLOT actual
  tslotSec: [40.0, 80.0],        // step §4.2 — sección del perfil (ranura 8, serie 40)
  guiaY: [-1530.782, -130.782],  // step medidas.json — cama de guías actual (7×200)
  // CARA DE RODADURA DE LA BANDA (`topZ`). Es la cota que leen como plano de
  // apoyo params_pg40 (`Z.guiaTop` → las 20 regletas UHMW), params_tambores
  // (`FIJO.planoDorso` → tambor, conducido y RR1…RR4), `CALLE.puente.topZ` y las
  // guías guiaw que reubica mod_calles. De ella cuelga TODO el lazo, así que la
  // define la banda:
  //   · con la T5 DENTADA del cliente valía 51.7 —la cara MEDIDA de su guía, step
  //     §4.3—, porque los dientes corrían dentro de la ranura de la guía y sólo el
  //     dorso (0.633) subía hasta el plano de transporte;
  //   · con BANDA PLANA la cara portante es la de ARRIBA y el espesor cuelga hacia
  //     ABAJO desde el plano de transporte, que es la cota que NO se puede mover
  //     (la fija la transferencia: el NBT90 declara su portante de anfitrión en
  //     Z 49.83…52.33, su regleta a 49.84 y su rodillo asomando +6.35 sobre
  //     52.333). Así que la rodadura baja a 52.333 − 2.5 = 49.833.
  // El 51.7 medido NO se pierde: queda en `topZmedidoT5`, y la diferencia es lo
  // que hay que rebajar/calzar en obra (`bajadaRequeridaMm`). Hallazgo SC-10.
  guiaSec: {
    ancho: 39.9, alto: 18.55,
    topZ: r3(52.333 - P.bandaEsp),        // 49.833 calc = planoBanda − nbt90 P.bandaEsp (med 2.5)
    topZmedidoT5: 51.7,                   // step §4.3 — la guía del cliente TAL COMO ESTÁ
    get bajadaRequeridaMm() { return r3(this.topZmedidoT5 - this.topZ); },   // 1.867
  },
  guiaLargo: 200.0,              // step §4.3 — módulo de guía individual
  bandaAncho: 32.0,              // step §1.1 — banda T5
  bandaDorso: 0.633,             // step §4.3 — dorso 52.333 − cara de guía 51.7
  motrizY: 0.0,                  // step §4.1 — eje del árbol motriz
  conducidaY: -1607.4,           // step §4.1 — eje de la polea conducida
  polea63: { rContacto: 51.7, pest: 112.0, bore: 38.0, ancho: 40.0 },
  //   step §4.5 — rContacto = 52.333 − 0.633: radio al que apoya el dorso de la
  //   banda modelada por su dorso (ver bandaT más abajo); pestañas Ø112 medidas.
  volante: { cara: 100.0, pest: 110.0, ancho: 34.0, bore: 38.0 },  // step §4.5
  polTensora: { dia: 117.9, ancho: 40.0 },                          // step §4.5 POL-CON-TEN
  ejeTensor: { d: 20.0, largo: 46.0 },   // step §2.4 SCMRT906VCT-150-111 (roscas M10×1.5)
  cilC85: { cuerpoDia: 26.6, cuerpoLargo: 187.75, vastagoDia: 10.0, carrera: 80 },
  //   step/web PNEU-001/002 — carrera 80 de la designación (web), resto medido
  idlerEnsY: [-1653.7, -1391.979],  // step acople.json — caja del IDLER-ENS (límite sur)
  ensMotor: { x: [63.098, 352.898], y: [-1551.261, -1432.211], z: [-273.023, -155.172] }, // step
  latTopY: [-513.116, 90.183],   // step medidas.json — LAT TOP (se conserva intacto)
  latTopZ: [-433.103, -113.049],
  huecoClienteY: [-1559.69, -619.69],  // step §2.1 — caja Y del conjunto eliminado
};

// ---------------------------------------------------------------------------
// 2. La especificación congelada de la transferencia que gobierna (nbt90)
// ---------------------------------------------------------------------------
export const NBT = {
  paso: P.paso,                  // 76.2
  nBandas: P.nBandas,            // 5
  nRodillos: P.nRodillos,        // 6
  rodDia: P.rodDia,              // 34.925
  ventana: 31.75,                // nbt90 — ventana útil por hueco de banda
  planoBanda: P.planoBanda,      // 390.6 (coordenadas propias del NBT90)
  largo: P.largo,                // 463
  anchoExt: P.anchoExt,          // 534.7 (con canales anfitrión; sin ellos ver §5)
  almaY: P.almaY,                // 229.9
  carrera: P.carrera,            // 10
  emerge: P.emerge,              // 6.35
  rodZ: P.rodZ,                  // 379.4875
  bandaY: P.bandaY,              // [-152.4 … +152.4]
  rodY: P.rodY,                  // [-190.5 … +190.5]
  sideAlmaExtY: 228.57,          // nbt90 bastidor.mjs — cara exterior del alma del
                                 //   SIDE CHANNEL (caja medida del JSON emitido)
  sideTornX: [60, 231.5, 403],   // nbt90 bastidor.mjs — colisas de reglaje del alma
  sideTornZ: 234,                // nbt90 — eje de esas colisas (Ø10.3 × 26.3 vertical)
  crossZ: [297, 347.8],          // nbt90 bastidor.mjs cruzZ0/cruzZ1 — transfer cross channel
  canalCilX: [114.5, 348.5],     // nbt90 — canal de montaje del cilindro (caja JSON)
  canalCilZ: [10.24, 113.24],
  peineX: [[37.72, 42.48], [420.52, 425.28]],  // nbt90 JSON — las dos placas peine
  peineHuecoSemi: 38.1 - 17.1,   // 21.0 · nbt90 bastidor.mjs — semiancho del hueco de
                                 //   banda del peine (paso/2 − dienteSemi)
  peineHuecoZ0: 320,             // nbt90 bastidor.mjs huecoZ — fondo del hueco
  masaKg: 113.9,                 // calc — Σ volúmenes B-rep del JSON emitido × 7.85 g/cm³
                                 //   (cota SUPERIOR: el motorreductor se modela macizo).
                                 //   Reproducible: suma con a_step.construir() sobre
                                 //   narrow_belt_transfer_90.json (410 piezas, 14 510 cm³).
};

// La franja de altura que barre el rodillo, en coordenadas del sorter (calc):
//   de planoBanda − (rodDia + carrera − emerge) a planoBanda + emerge
export const FRANJA = {
  z0: r3(STEP.planoBanda - (NBT.rodDia + NBT.carrera - NBT.emerge)),  // 13.758
  z1: r3(STEP.planoBanda + NBT.emerge),                               // 58.683
};

// ---------------------------------------------------------------------------
// 3. EL REPARTO (dis, con los números del §1.5 del reconocimiento)
// ---------------------------------------------------------------------------
// 5 estaciones a paso 76.2 y no 4: la transferencia tiene 5 huecos de banda;
// con 4 el hueco central queda sin banda portante y el bulto corto se hunde
// (SORTER_CO.md §1.5). El span 344.8 cabe en la luz 580.841 sobrando 236.
//
// CENTRO DEL REPARTO (corrección del cliente, 31-07): el reparto NO va centrado
// entre bastidores: se corre hacia el lado de descarga (+X) hasta que el
// EXTREMO de la cara del último rodillo de la transferencia queda a 40.0 mm
// del BORDE EXTERIOR del sorter (cara exterior del bastidor de descarga,
// X = 527.418 step), para que la caja no pierda apoyo antes de salir:
//   Xc = 527.418 − 40 − (2.5·paso + rodDia/2) = 279.456   (calc)
export const bordeExtDescarga = 527.418;   // step — cara exterior FRAME_MIR_MIR_MIR
export const Xc = r3(bordeExtDescarga - 40 - (2.5 * NBT.paso + NBT.rodDia / 2));  // 279.456
export const EJES = [-2, -1, 0, 1, 2].map(k => r3(Xc + k * NBT.paso));
// [127.056, 203.256, 279.456, 355.656, 431.856] — ejes de banda = ejes de ventana.
// El perfil de cada calle va CENTRADO bajo su banda (dis): se corrige el
// descentrado de 1.000 mm banda↔perfil del modelo del cliente (step §1.1).
// Consecuencia del corrimiento (declarada): el side channel +X del NBT90
// (alma exterior a Xc + 228.57 = 508.03) penetra 8.61 mm en el plano del
// chapón del bastidor de descarga (cara interior 499.418) en la franja
// Z −114…−88.3 → MUESCA en el canto inferior del chapón (ver PERCHA.muesca);
// el lado −X gana toda la holgura (alma −X a 50.89, a 132.3 del bastidor).

// ---------------------------------------------------------------------------
// 4. LA COLOCACIÓN del NBT90 (dis, verificada por la compuerta)
// ---------------------------------------------------------------------------
// Rotación Rz(−90°): X_nbt (flujo del anfitrión) → −Y_sorter; Y_nbt (expulsión)
// → +X_sorter (el producto se expulsa hacia +X, el lado opuesto al motorreductor
// principal del sorter, que cuelga en X −262…−82, step §3).
//   [X_s, Y_s, Z_s] = [ y_nbt + T.x , −x_nbt + T.y , z_nbt + T.z ]
export const T = {
  x: Xc,                                   // centra los 5 huecos en los 5 ejes (calc)
  y: -742,                                 // dis — ver justificación de y0/y1
  z: r3(STEP.planoBanda - NBT.planoBanda), // −338.267 (calc): plano de bandas del
                                           //   sorter = plano de referencia del NBT90
};
// Huella del módulo en el flujo (calc): X_nbt ∈ [0, 463] → Y_s ∈ [y0, y1]
export const y0 = r3(T.y - NBT.largo);     // −1205
export const y1 = T.y;                     // −742
// Por qué ahí (dis): dentro del hueco que deja la transferencia incompleta
// eliminada (step §2.3: Y −1559.7…−619.7), que es el tramo que el cliente ya
// había elegido para transferir y el ÚNICO con profundidad libre hasta el
// fondo; corrido hacia +Y hasta que el pozo de retorno (§6) libra el IDLER-ENS
// (caja hasta −1391.98) y hacia −Y hasta que el volante V4 libra el LAT TOP
// (arranca en −513.1). Campo de rodillos resultante: Y −1161…−786.

// ---------------------------------------------------------------------------
// 5. LA PERCHA (dis) — el NBT90 se cuelga del sistema de perfil ranurado
// ---------------------------------------------------------------------------
// El paquete de interfaz del NBT90 con su anfitrión ProSort NO VIAJA al sorter:
// canales laterales anfitrión 6-1/2"×1-1/2", su tornillería, los 4 jack bolts
// con sus ménsulas, y el rodillo de retorno B-20760 (SORTER_CO.md §7.1: no
// aplica). Los sustituye una percha de perfil ranurado 40 (ranura 8, tuercas T
// M8 — el sistema del propio sorter, step §4.2/§7.2):
export const PERCHA = {
  perfil: { b: 40, h: 80 },      // web PERF-001 — perfil 40×80 ranura 8 serie 40
  // PERCHA ASIMÉTRICA (consecuencia del corrimiento del reparto):
  //  · lado −X (holgado): LARGUERO 40×80 según Y con la ranura superior en la
  //    cota de las colisas del side (−104.27), sostenido por 3 ménsulas de
  //    perfil 40×40 al bastidor −X; el NBT90 cuelga por la placa de 3 lengüetas.
  //  · lado +X (el side entra en la muesca del chapón): PLACA DE ESCOTE
  //    atornillada al chapón por fuera; los pernos 3/8 del side llegan a ella
  //    con casquillos separadores a través de la muesca.
  largueroZ: [r3(NBT.sideTornZ + T.z - 60), r3(NBT.sideTornZ + T.z + 20)],  // [−164.27, −84.27]
  get largueroXNeg() {           // calc: [alma −X − 55.5, alma −X − 15.5]
    const alma = r3(Xc - NBT.sideAlmaExtY);            // 50.89
    return [r3(alma - 55.5), r3(alma - 15.5)];         // [−4.61, 35.39]
  },
  largueroY: [-1190, -757],      // dis: cubre los 3 pernos por lado con margen
  mensulasY: [-1145, -973.5, -802],  // dis: ménsulas 40×40 al bastidor −X, bajo
                                 //   los puntos de cuelgue (la carga baja recta)
  travS: [-1300, -1220],         // dis: travesaño sur (sección 80 en Y × 40 en Z);
  travN: [-712, -632],           //   cara superior en Z = base de placa del puente
  get travTopZ() {               // calc: rodadura − 8.55 (regleta) − 28 (pletina) − 6
    return r3(STEP.guiaSec.topZ - CALLE.puente.uhmwH - CALLE.puente.aceroH - CALLE.puente.baseT);
  },                             //   7.283 con banda plana (era 9.15 con la cadena
  //   del dorso T5: 51.7 − 8.55 − 28 − 6). No se escribe a mano: cuelga de la cara
  //   de rodadura, que es quien manda desde que la banda es plana (ver guiaSec).
  //   AVISO: `params_pg40` repite este 9.15 A MANO en el travesaño de puente
  //   (SC-01) — hay que bajarlo a 7.283 o el travesaño se come la placa base.
  escuadraT: 4.763,              // nbt90 P.placaT — chapa 3/16" de escuadras y placas
  pernoCuelgue: { d: 9.525, rosca: '3/8-16 UNC' },     // dis: mismo Ø que la unión
                                 //   original side↔anfitrión del NBT90
  M8: { d: 8, pasante: 9.0 },
  muesca: {                      // dis — muesca en el canto INFERIOR del chapón de
    y: [-1210, -737],            //   descarga (FRAME_MIR_MIR_MIR): el side +X del
    zTop: -83,                   //   NBT90 (Z −253.4…−88.3) solo solapa el chapón
                                 //   (Z −114…46) en la franja −114…−88.3; la
                                 //   muesca llega a −83 (5.3 de holgura) y deja
                                 //   129 de los 160 de canto. Revisión estructural
                                 //   del bastidor: para el cliente (declarada).
  },
  casquilloEscote: { od: 16, largo: 19.39 },  // calc: alma side (508.03) → placa
                                 //   de escote (527.52), sobre el perno 3/8
};

// ---------------------------------------------------------------------------
// 6. EL POZO DE RETORNO (dis) — resuelve la profundidad
// ---------------------------------------------------------------------------
// El ramal de retorno de cada calle corre hoy a Z −52.33 (step §4.4) y NO puede
// atravesar el NBT90: dentro del módulo, a esa altura y en las ventanas de
// banda, viven las poleas locas del serpentín (pestañas hasta Z_s −48.6), el
// motorreductor SEW (Z_s hasta −11.9) y el cross channel (Z_s −41.3…+9.5)
// — cajas del JSON del NBT90 transformadas. El hueco del peine por el que pasa
// el retorno del anfitrión ProSort (Z_nbt 328…330.5) tampoco sirve: nuestro
// retorno viaja 104.7 bajo el plano, no 61.4. ⇒ el retorno BAJA y pasa POR
// DEBAJO del módulo completo (fondo Z_s −338.27), igual que ya hace la horquilla
// del cliente en su pozo del tensor, pero con el pozo ENSANCHADO a todo el módulo.
export const POZO = {
  // V1/V4: los volantes de contraflexión Ø100 del cliente (guia_entrada_liso /
  // guia_salida_liso) REUBICADOS: tocan el dorso y doblan el retorno hacia abajo.
  // A Z −104 y no a su Z actual −90 (dis): con la pestaña Ø110 a eje −104 la cima
  // queda en −49 y libra el perfil TSLOT (fondo −40) que pasa por encima.
  v1: { y: -1325, z: -104 },     // dis: caja del volante [−1345,−1305] libra el
                                 //   IDLER-ENS (−1391.98) por 47 y queda bajo el
                                 //   TSLOT sur (que llega a −1295)
  v4: { y: -606, z: -104 },      // dis: caja [−626,−586]; el tramo llano −52.33
                                 //   sigue hacia la motriz POR ENCIMA del LAT TOP
                                 //   (techo −113.05), que se conserva INTACTO.
                                 //   A −606 sus pletinas caen dentro del perfil
                                 //   norte y el volante libra el travesaño (−632)
  // V2/V3: poleas planas nuevas Ø117.9×40 (la misma que la tensora POL-CON-TEN
  // del cliente; tocan la cara dentada, como la tensora de hoy — step §4.4).
  v2: { y: -1280, z: -300 },     // dis: polea plana FIJA (Ø117.9), esquina sur del
                                 //   pozo; sus pletinas cuelgan del travesaño sur
  v3: { y: -672, z: -300 },      // dis: polea plana FIJA, colgada del travesaño norte
  // Cota que gobierna (calc): la banda pasa bajo el módulo con su cara alta a
  //   v2.z − (117.9/2) = −358.95 → holgura al fondo del NBT90 (−338.27) = 20.7
};

// ---------------------------------------------------------------------------
// 6-bis. EL TENSOR ORIGINAL, EN SU POSE DIAGONAL (corrección del cliente 31-07)
// ---------------------------------------------------------------------------
// El tensor del cliente NO se rediseña: se CONSERVA COMPLETO en su pose medida
// (brazo PZA-TEN-1 en diagonal, cilindro C85 vertical, tensora POL-CON-TEN en
// el fondo de su horquilla), re-pitcheado en X con su calle. El pozo original
// de la horquilla se mantiene en el lazo: mi pozo del módulo queda con 4 poleas
// FIJAS (V1…V4) y la toma de tensión la sigue dando el brazo original.
//   · Por qué no podía tensarse bajo el módulo: la tensora Ø117.9 sube a
//     eje −380 + 59 = −321 y el fondo del NBT90 está en −338.27 → −17.2 de
//     interferencia (calc). Por qué el brazo diagonal no alcanza la bajada del
//     pozo nuevo: con su Δ fijo (74, 207.2) el pivote caería dentro del
//     travesaño sur y la polea del brazo quedaría a 93.5 de V2 < 118 (suma de
//     radios) — chocan (calc). Conservarlo en su sitio no choca con nada.
export const TENSOR = {        // cotas step de analisis/medidas.json e inventario
  pivote: { y: -101.72, z: -164.7 },      // eje Ø25 común (EJE-25mm-PASADOR)
  tensora: { y: -175.72, z: -371.89 },    // POL-CON-TEN Ø117.9×40 (entra al lazo)
  volEntrada: { y: -404.4, z: -97 },      // guia_entrada_liso: pose original Z=−90
  volSalida: { y: -195.5, z: -97 },       //   BAJADOS 7 (dis): la pestaña Ø110 del
                                          //   modelo del cliente INTERPENETRA el
                                          //   perfil (cima −35 vs fondo −40, step);
                                          //   a eje −97 la cima queda en −42 y
                                          //   libra el perfil por 2.0 (corrección
                                          //   de colocación declarada, §5-bis)
  oreja: { y: 0.9, z: -292.5 },           // donde la KJ10D toma el brazo (step)
  cilindro: { y: 34.5, z0: -264.51, largo: 187.75 },   // C85 vertical (step)
  brazoSemiX: 26.5,                       // pletinas PZA-TEN-1 a ±26.5 del eje
  // El pivote a paso 76.2 (dis, con números): el paquete de cubo del brazo mide
  // 111 sobre el eje común (BUJE-TECH-01 Ø50×56 + casquillo PTFE Ø45×55, step)
  // y el paso nuevo solo deja 76.2 → el PTFE se RECORTA de 55 a 15. Apoyo
  // restante 71 sobre Ø25.3: con ~150 N por ramal del tensor (PNEU-003) la
  // presión de apoyo queda en 0.08 MPa — dos órdenes por debajo de lo admisible
  // de un PTFE (≥ 5 MPa). Se declara; el cliente valida.
  ptfeLargo: 15,
  ejeComunX: [-65.6, 537.4],              // step (defecto §5.3 del cliente: las 4
                                          //   copias solapadas son UN eje físico;
                                          //   aquí se modela UNO, en la pose de la
                                          //   copia que cubre las 5 calles nuevas)
};

// ---------------------------------------------------------------------------
// 7. LA CALLE NUEVA en la zona de transferencia (dis)
// ---------------------------------------------------------------------------
export const CALLE = {
  // el perfil TSLOT se corta en dos tramos; el módulo y el pozo quedan sin perfil
  tslotSurY: [STEP.tslotY[0], -1302],   // dis: muere 2 antes del travesaño sur
                                        //   (−1300) y deja pasar la bajada del pozo
  tslotNorteY: [-630, -58],             // dis: arranca 2 después del travesaño
                                        //   norte (−632) y muere a 2 de la pestaña
                                        //   Ø112 de la polea motriz (r 56): el
                                        //   extremo actual del cliente (−53.82)
                                        //   INTERPENETRA esa pestaña — otro solape
                                        //   de su modelo que no se arrastra
  // el PUENTE: la calle portante dentro del módulo, sección ≤ 31.75 en la franja
  puente: {
    y: [-1294, -646],            // dis: apoya en los dos travesaños de la percha
                                 //   (placas base centradas en las ranuras
                                 //   superiores: Y −1280 y −692) con voladizo
                                 //   norte hasta 16 de la cama de guías
    ancho: 30.0,                 // dis: ≤ ventana 31.75; holgura al rodillo
                                 //   (76.2 − 34.925 − 30)/2 = 5.64 por lado (calc)
    aceroH: 28.0,                // dis: pletina A36; flecha < 0.1 mm con medio
                                 //   bulto de 34 kg al centro del vano (calc)
    uhmwH: 8.55,                 // dis: regleta de deslizamiento UHMW; conserva
                                 //   la interfaz medida de la guía del cliente
    topZ: STEP.guiaSec.topZ,     // 51.7 step — misma cara de apoyo que guiaw
    baseT: 6.0, baseAncho: 60, baseLargo: 28,  // dis: placas de apoyo en extremos
  },
  // reparto nuevo de guías (las 28 guiaw del cliente, reubicadas). La guía sur
  // se acorta a 169.2 para que el CIERRE de guía (la protección del espacio de
  // la conducida) quede en su pose ORIGINAL pegado al arranque del perfil.
  guiasSur: [[-1471.18, -1302]],                       // 1 × 169.2 (cortada)
  guiasNorte: [[-630, -430], [-430, -230], [-230, -130.782]],  // 2 × 200 + 1 × 99.2 (cortada)
  // protecciones de los espacios de poleas (corrección del cliente 31-07):
  // los 8 «cierre guia» del STEP (39.9×80×15.1, Z 36.6…51.7) se CONSERVAN en su
  // pose medida — junto a la conducida arrancan donde arranca el perfil
  // (Y −1551.18) y junto a la motriz acaban donde acababa la cama (−50.78);
  // las cabeceras FRONT TOP2/_MIR (tapas de los extremos) ya van en contexto.
  cierres: [[-1551.181, -1471.181, 'conducida'], [-130.782, -50.782, 'motriz']],
  pletinaT: 4.763,               // 3/16" — pletinas de V1…V4 y tensor
};

export { P };
export default { STEP, NBT, FRANJA, Xc, EJES, T, y0, y1, PERCHA, POZO, CALLE };
