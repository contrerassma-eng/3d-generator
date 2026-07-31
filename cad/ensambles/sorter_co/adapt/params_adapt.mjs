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
  guiaSec: { ancho: 39.9, alto: 18.55, topZ: 51.7 },   // step §4.3
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
// Centro del reparto = punto medio entre caras interiores de los bastidores,
// que COINCIDE (step §1.1/§1.3) con el centro del reparto actual de bandas.
export const Xc = r3((STEP.frameIntNeg + STEP.frameIntPos) / 2);      // 208.998
export const EJES = [-2, -1, 0, 1, 2].map(k => r3(Xc + k * NBT.paso));
// [56.598, 132.798, 208.998, 285.198, 361.398] — ejes de banda = ejes de ventana.
// El perfil de cada calle va CENTRADO bajo su banda (dis): se corrige el
// descentrado de 1.000 mm banda↔perfil del modelo del cliente (step §1.1,
// «o es intencionado o es un descuido»; al re-pitchear se elimina).

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
  // largueros longitudinales (según Y), uno por costado del NBT90, cara 80
  // vertical, con UNA ranura coincidiendo con las colisas de reglaje del side
  // channel (Z_s = 234 + T.z = −104.267):
  largueroZ: [r3(NBT.sideTornZ + T.z - 60), r3(NBT.sideTornZ + T.z + 20)],  // [−164.27, −84.27]
  //   dis: ranuras de la cara 80 a centro ±20 → la ranura superior queda en
  //   −104.27 (los pernos de cuelgue) y el cuerpo del perfil por DEBAJO de las
  //   cabezas de los pernos. Ver mod_percha para las holguras verificadas.
  largueroXNeg: [-75, -35],      // dis: 15.4 mm del alma del side (hueco para las
                                 //   cabezas de los pernos de cuelgue, que asoman
                                 //   hasta −32) y 6.3 mm a la cara del bastidor
                                 //   (−81.42): ahí entra el ala de 3/16" de la
                                 //   escuadra sobre la que apoya el larguero
  largueroY: [-1190, -757],      // dis: cubre los 3 pernos por lado con margen
  travS: [-1300, -1220],         // dis: travesaño sur (sección 80 en Y × 40 en Z);
  travN: [-712, -632],           //   cara superior en Z = base de placa del puente
  travTopZ: 9.15,                // calc: 51.7 − 8.55 − 28 − 6 (cadena del puente)
  escuadraT: 4.763,              // nbt90 P.placaT — chapa 3/16" de escuadras y placas
  nEscLarg: 3,                   // dis: escuadras larguero↔bastidor por lado
  pernoCuelgue: { d: 9.525, rosca: '3/8-16 UNC × 1-1/4"' },  // dis: mismo Ø que la
                                 //   unión original side↔anfitrión del NBT90
  M8: { d: 8, pasante: 9.0 },
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
  v2: { y: -1280, z: -300 },     // dis: V2 es la TENSORA nueva, en CARRO HORIZONTAL
                                 //   (colisa según Y, cilindro C85 del cliente
                                 //   HORIZONTAL tirando del eje hacia −Y = alejar
                                 //   del módulo = tensar). Posición modelada =
                                 //   nominal (media carrera). El cilindro vertical
                                 //   no cabía: cruzaba la bajada de la banda.
  v3: { y: -672, z: -300 },      // dis: fija, colgada del travesaño norte (centro)
  v2rango: 20,                   // dis: ±viaje del carro en Y (recorrido útil 40 de
                                 //   los 80 del C85; una T5 se tensa al ~0.5 % del
                                 //   largo ≈ 21 mm de toma, y el carro toma 1.3
                                 //   mm/mm → 52 disponibles. El resto de carrera
                                 //   queda de reserva de montaje)
  cilTensor: { culataY: -1412, z: -340 },  // dis: cuerpo horizontal BAJO el reenvío
                                 //   POL-COND-TEN2 del cliente (Z −313.9) y fuera
                                 //   del arco de banda de V2 (que llega a −1341)
  // Cota que gobierna (calc): la banda pasa bajo el módulo con su cara alta a
  //   v2.z − (117.9/2) = −358.95 → holgura al fondo del NBT90 (−338.27) = 20.7
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
  // reparto nuevo de guías (las 28 guiaw del cliente, reubicadas)
  guiasSur: [[-1502, -1302]],                          // 1 × 200
  guiasNorte: [[-630, -430], [-430, -230], [-230, -130.782]],  // 2 × 200 + 1 × 99.2 (cortada)
  pletinaT: 4.763,               // 3/16" — pletinas de V1…V4 y tensor
};

export { P };
export default { STEP, NBT, FRANJA, Xc, EJES, T, y0, y1, PERCHA, POZO, CALLE };
