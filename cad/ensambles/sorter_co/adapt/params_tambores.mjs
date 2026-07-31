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
  bandaEsp: STEP.bandaDorso,           // 0.633 step — convenio del modelo del
  //   cliente (la banda se modela por su dorso). Se respeta para no romper la
  //   cadena; una banda plana real de 2 telas mide ~2.5 (nbt90 P.bandaEsp) y si
  //   el cliente la adopta lo único que cambia es la cara de la guía UHMW, no
  //   la geometría de este archivo (que cuelga toda del DORSO).
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
  rodam: { bore: 35, od: 72, w: 17, desig: '6207-2RS', C: 25500, C0: 15300 },  // cat/web BRG-6207
  // Soporte del eje fijo (dis): pletina 117 × 117 × 12 con barreno Ø35 H8 y
  // collar de apriete partido; se atornilla al MISMO patrón 92 × 92 del UCF 207
  // que pg40 ya taladra, en la cara INTERIOR del alargue. Así pg40 no cambia el
  // taladrado entre una estación y otra: cambia la pieza que se le atornilla.
  soporte: { e: 12, lado: 117, bore: 35, patron: 92, taladro: 13.5,
    caraX: [67.494, 491.418], normal: [1, -1] },
  collar: 'Collar de apriete partido Ø35 DIN 705 A (retención axial del eje fijo)',
  tapa: { e: 10, inset: 8 },           // tapa-soporte prensada en el tubo, con
  //   hombro de tope axial del aro exterior — mismo esquema que nbt90/rodillos
  anillo: 'DIN 471 Ø35 (retención del aro interior contra el casquillo)',
};

// ---------------------------------------------------------------------------
// 4. LOS RODILLOS DE RETORNO
// ---------------------------------------------------------------------------
// CUÁNTOS Y DÓNDE (dis, con el motivo de cada uno):
// El ramal de retorno sale del tambor a Z −57.2, tiene que llegar al conducido
// a −56.3 y, ENTRE MEDIAS, no puede atravesar el módulo de transferencia, que
// ocupa Y −1205…−742 en TODA la profundidad hasta Z −338.267. O sea que el
// retorno BAJA, cruza por debajo del módulo y vuelve a subir. Eso son cuatro
// cambios de dirección, y cada cambio de dirección es un rodillo:
//   RR1  Y −606   baja el ramal (queda 136 al norte del módulo)
//   RR2  Y −672   lo pone horizontal en el fondo del pozo
//   RR3  Y −1280  lo levanta al otro lado (75 al sur del módulo)
//   RR4  Y −1325  lo devuelve a horizontal hacia el conducido
// NO HACEN FALTA MÁS (calc, y se verifica): el vano libre más largo es el
// tambor→RR1, 606 mm; con 129.05 N de tensión y 0.38 N/m de peso de banda la
// FLECHA del ramal es 0.12 mm. Un rodillo intermedio no sostendría nada.
// Las cuatro Y son las que ya tenía verificadas la versión de pozo anterior
// (params_adapt POZO v4/v3/v2/v1): libran el IDLER-ENS (Y −1391.979), el
// LAT TOP (que arranca en −513.116) y los travesaños PG40 (−1520/−1390/−600/−100).
// Ø ELEGIDO: Ø88.9 (tubo Ø88.9 × 3.2 — el MISMO tubo que el núcleo del tambor):
//   · no manda la flexión de la banda (Ø88.9 > los Ø63.5 sobre los que ya corre
//     esta familia de banda plana en el NBT90 — nbt90 P.idlerDia);
//   · manda la FLECHA del eje fijo y el hueco para el rodamiento: con eje Ø30 y
//     6206-2RS (Ø62 exterior) la corona de la tapa queda en 10.25 mm de pared;
//   · y manda el bolsillo: RR2/RR3 están a 25.6 y 30.6 mm de la cara del módulo
//     (Y −742 / −1205) — con Ø114 se lo comerían.
export const RETORNOS = {
  tubo: { od: 88.9, e: 3.2, get id() { return r3(this.od - 2 * this.e); } },   // 82.5 cat
  get od() { return this.tubo.od; },
  get r() { return r3(this.od / 2); },                       // 44.45
  cara: 360,                           // dis — igual que el conducido
  get tuboX() { return [r3(Xc - this.cara / 2), r3(Xc + this.cara / 2)]; },
  eje: { d: 30, material: 'C45 h9', gira: false },           // dis — ver §6 (flecha)
  ejeX: [62, 497],                     // calc — igual que el conducido
  rodam: { bore: 30, od: 62, w: 16, desig: '6206-2RS', C: 20300, C0: 11200 },  // cat/web BRG-6206
  soporte: { e: 12, lado: 100, bore: 30, patron: 76, taladro: 11,
    caraX: [67.494, 491.418], normal: [1, -1] },
  collar: 'Collar de apriete partido Ø30 DIN 705 A',
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
  // ↓↓↓ los cuatro rodillos de retorno, para que pg40 les cuelgue ménsulas ↓↓↓
  retorno: [
    { id: 'RR1', y: -606, z: r3(zCaraRetTambor - RETORNOS.r), papel: 'baja el ramal' },
    { id: 'RR2', y: -672, z: r3(zFondoAlto + RETORNOS.r), papel: 'fondo del pozo, norte' },
    { id: 'RR3', y: -1280, z: r3(zFondoAlto + RETORNOS.r), papel: 'fondo del pozo, sur' },
    { id: 'RR4', y: -1325, z: r3(zCaraRetConducido - RETORNOS.r), papel: 'sube el ramal' },
  ],
  retornoD: RETORNOS.od, retornoEje: RETORNOS.eje.d,
  retornoSoporte: RETORNOS.soporte,
  fuente: 'adapt/params_tambores.mjs',
};

// ↓↓↓ lo que lee adapt/mod_tensor2.mjs (leerRamal) ↓↓↓
export const RETORNO = {
  // Cota del RAMAL DE RETORNO donde el tensor puede morderlo: el tramo llano
  // que va del tambor a RR1 (Y 0 … −606). Es el dorso; la cara de la banda
  // queda `bandaEsp` por debajo.
  z: zRetTambor,                       // −57.2 calc (antes el tensor suponía −52.33)
  zCara: zCaraRetTambor,               // −57.833 calc
  tramoLibreY: [-561.55, -54.45],      // calc — entre la piel del tambor y la de
  //   RR1: 507.1 mm de ramal llano y despejado para el brazo del tensor
  zConducido: zRetConducido,           // −56.3 calc — el tramo RR4 → conducido
  tramoLibreConducidoY: [-1553.4, -1280.55],
  // ABRAZADO REAL SOBRE EL TAMBOR MOTRIZ (calc): el ramal portante llega
  // horizontal por arriba y el de retorno sale horizontal por abajo, los dos
  // tangentes al mismo cilindro ⇒ 180° exactos. El 180° que el tensor traía por
  // defecto QUEDA CONFIRMADO por la geometría, ya no es una suposición.
  abrazadoMotrizDeg: 180,
  // El abrazado sobre la POLEA DEL TENSOR no lo fija este archivo: depende de
  // cuánto meta el brazo. Se deja sin publicar a propósito para que mande
  // params_tensor2 (mod_tensor2 sólo lo lee si es número).
  abrazadoConducidoDeg: 180,
  nota: 'ramal de retorno de banda plana; el tensor muerde el tramo llano '
    + 'tambor→RR1, que es el único con 507 mm libres y acceso desde abajo',
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
    'Rodamiento SKF W 6004',                  // 40 · rodamientos de las V1…V4
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
export default { FIJO, TAMBOR, UCF207, CONDUCIDO, RETORNOS, TAMBORES, RETORNO, CARGA };
