// params_pg40.mjs — TABLA DE COTAS del BASTIDOR PG40 del sorter CO:
//   (1) largueros de perfil de aluminio 40×40 ranura 10 bajo cada banda,
//   (2) guías de deslizamiento UHMW sobre el perfil,
//   (3) ALARGUE de la estructura lateral de la transferencia NBT90 hacia el
//       tambor motriz y el rodillo conducido, con los taladros de los soportes
//       de rodamiento,
//   (4) el amarre de todo el conjunto a los canales laterales del NBT90.
//
// Este archivo es el CONTRATO con los otros dos agentes de la adaptación:
//   · publica  → cara de apoyo del rodamiento, patrón de taladros UCF 207,
//                luz entre caras y espacio libre para la cara del tambor
//                (bloque `PUBLICA`, lo lee adapt/mod_tambores.mjs);
//   · consume  → adapt/params_tambores.mjs si existe (ejes de motriz y
//                conducida y su Z). Si no existe, manda la PROPUESTA de aquí,
//                derivada de lo medido en el STEP del cliente.
//
// Procedencia de cada valor (misma convención que params_adapt.mjs):
//   step  = MEDIDO sobre ref/sorter_CO.stp (SORTER_CO.md / analisis/*.json),
//           tomado de params_adapt.mjs (no se re-mide aquí).
//   nbt90 = especificación CONGELADA de la transferencia (nbt90/params.mjs).
//   calc  = derivado aritméticamente; la fórmula va al lado.
//   web   = dato externo con URL/fecha/cita en ../web_facts.json (se cita id).
//   dis   = decisión de diseño de este bastidor (capa user). Lleva justificación.
//
// Ejes: los del STEP (X ancho / Y flujo / Z arriba; plano de transporte 52.333).

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STEP, NBT, Xc, EJES, T, y0, y1, P, CALLE, RECORTE_ANCHO } from './params_adapt.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const r3 = (v) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------------------
// 0. BANDERAS de integración (el integrador las lee en su bloque PG40)
// ---------------------------------------------------------------------------
export const FLAGS = {
  // El cliente rediseña el bastidor a 40×40 «y nada más grueso»: el perfil
  // ranurado 40×80 del STEP y las guiaw de 39.9 que lo coronan SE SUSTITUYEN
  // por larguero PG40 40×40 + regleta UHMW. No se borran del repo: se filtran
  // por nombre en el integrador, y basta poner esto en false para recuperarlos.
  reemplazaPerfil4080: true,
  reemplazaGuiaw: true,
  // La percha, los puentes de calle y el pozo NO se desactivan: la percha sigue
  // colgando el NBT90 (la compuerta §G la exige), el puente de 30 es la única
  // sección que cabe en la ventana de 31.75 dentro del módulo, y el pozo es el
  // que resuelve la profundidad. Si el cliente los retira, estas banderas lo
  // hacen sin borrar código.
  desactivaPercha: true,   // ← ACTIVADA: ver nota en el integrador
  desactivaPuentes: false,
  desactivaPozo: false,
  // El ACCIONAMIENTO DE BANDA PLANA (adapt/mod_tambores.mjs) sustituye la
  // transmisión T5 por calle y las 4 poleas de pozo V1…V4 del diseño anterior.
  // Como dueño del bastidor las retiro por bandera, no borrando código.
  // ⚠ EN false A PROPÓSITO: el cableado está hecho y probado (ver el bloque PG40
  // del integrador), pero al retirar V1…V4 la compuerta §M reclama sus anillos
  // de retención (40 incumplimientos) porque esa comprobación vive en
  // mod_estaciones y no lleva bandera. Ponerlo en true exige guardar §M con la
  // misma bandera — es del dueño de mod_estaciones, no de este módulo.
  desactivaTransmisionT5: true,
};

// ---------------------------------------------------------------------------
// 1. EL PERFIL — 40×40 ranura 10 (web PG40-001/PG40-002)
// ---------------------------------------------------------------------------
// El cliente pide «perfil 40×40 tipo PG40, ranura 10, y nada más grueso». Se
// cita una ficha REAL con sus características de sección (web PG40-001); PG40
// es la designación del sorter, y cualquier 40×40 ranura 10 de la misma familia
// (BLOCAN PG, CS10, tipo B) es intercambiable porque comparte retícula y ranura.
export const PERFIL = {
  b: 40, h: 40,                  // web PG40-001 — «Dimensiones de retícula [mm] 40»
  ranura: 10,                    // web PG40-001 — «Ranura del perfil 10»
  ranurasAbiertas: 4,            // web PG40-001 — «Ranuras abiertas 4»
  bocaRanura: 10,                // web PG40-002 — «Ancho de la ranura: 10 mm»
  profRanura: 12,                // web PG40-002 — «Profundidad de la ranura: 12 mm»
  Ix: 9.1,                       // web PG40-001 — cm⁴ «Momento de inercia … [Ix] [cm⁴] 9.1»
  Iy: 9.1,                       // web PG40-001 — cm⁴
  Wx: 4.5,                       // web PG40-001 — cm³ «Momento de resistencia … 4.5»
  A: 5.6,                        // web PG40-001 — cm²
  masaKgM: 1.5,                  // web PG40-001 — kg/m
  aleacion: 'EN AW-6063',        // web ALU-001
  E: 69500,                      // web ALU-001 — N/mm², módulo de elasticidad
  // valores en unidades de cálculo (mm)
  get Ixmm4() { return this.Ix * 1e4; },     // 91 000 mm⁴  (calc: 1 cm⁴ = 10⁴ mm⁴)
  get Wxmm3() { return this.Wx * 1e3; },     // 4 500 mm³
};

// ---------------------------------------------------------------------------
// 2. LAS COTAS EN Z — se conserva la interfaz medida del cliente
// ---------------------------------------------------------------------------
// La cara de apoyo de la banda NO se toca: es la cota que ata el sorter a la
// transferencia (el dorso de la banda rueda a 51.7 y el plano de transporte
// queda en 52.333). De ahí baja todo lo demás.
export const Z = {
  planoBanda: STEP.planoBanda,               // 52.333 step
  guiaTop: STEP.guiaSec.topZ,                // 51.7 step — cara de apoyo del dorso
  dorso: STEP.bandaDorso,                    // 0.633 step — 52.333 − 51.7
  // El perfil del cliente corona en Z = 40 (step §4.2/§4.3: perfil 40×80 en
  // Z −40…40 con la guiaw de 11.7 encima). Se CONSERVA esa cara: el larguero
  // PG40 de 40 de canto ocupa entonces Z 0…40 exactos.
  perfilTop: 40.0,                           // step §4.3 (cara superior actual)
  get perfilBot() { return r3(this.perfilTop - PERFIL.h); },     // 0.0 calc
  get guiaSaliente() { return r3(this.guiaTop - this.perfilTop); },  // 11.7 calc
  // Travesaños: cuelgan bajo los largueros, mismo perfil 40×40 (dis).
  get travTop() { return this.perfilBot; },  // 0.0 calc — el larguero apoya encima
  get travBot() { return r3(this.travTop - PERFIL.h); },         // −40.0 calc
};

// ---------------------------------------------------------------------------
// 3. LA GUÍA UHMW (web UHMW-001) — sección y sujeción
// ---------------------------------------------------------------------------
// Ancho: la VENTANA ÚTIL POR CALLE, 31.75 (nbt90). La banda T5 de 32 (step)
// monta 0.125 por lado sobre la regleta — que es como debe ser: los cantos de
// la regleta no muerden los cantos de la banda.
export const GUIA = {
  material: 'UHMW-PE 1000',       // web UHMW-001
  ancho: NBT.ventana,             // 31.75 nbt90 — ventana útil por calle
  get vueloBanda() { return r3((STEP.bandaAncho - this.ancho) / 2); },  // 0.125 calc
  saliente: Z.guiaSaliente,       // 11.7 calc — lo que asoma sobre el perfil
  // Sujeción REAL (dis, web UHMW-001): pie de clip que entra a presión en la
  // ranura 10 de la cara superior del perfil. El pie es 0.4 más estrecho que la
  // boca (montaje a presión) y entra 6.85 de los 12 de profundidad de ranura,
  // dejando 5.15 de fondo libre para la tuerca martillo de los topes.
  pie: { ancho: r3(PERFIL.bocaRanura - 0.4), prof: 6.85 },   // 9.6 × 6.85
  get alto() { return r3(this.saliente + this.pie.prof); },  // 18.55 calc
  //   coincide con el canto medido de la guía del cliente (step guiaSec.alto
  //   = 18.55): la interfaz de montaje es la misma, cambia el ancho y el material.
  // Retención axial (dis): NO se atornilla en la cara de rodadura (un avellanado
  // en el camino de la banda es un punto de desgaste). Cada tramo queda topado
  // por escuadras de extremo M6 con tuerca martillo ranura 10 en la cara lateral.
  topeExtremo: { l: 30, a: 20, e: 3, tornillo: 'M6', pasante: 6.6 },
  moduloLargo: STEP.guiaLargo,    // 200.0 step — módulo de guía del cliente
};

// ---------------------------------------------------------------------------
// 4. EL REPARTO EN Y — dónde va perfil y dónde no
// ---------------------------------------------------------------------------
// Se respetan los tramos que ya validó la compuerta para el perfil del cliente:
// el módulo NBT90 (Y −1205…−742) y su puente de 30 mm quedan intactos; el
// larguero PG40 toma exactamente el sitio del 40×80 que sustituye.
export const TRAMOS = {
  sur: [-1551.181, -1302],       // step tslotY[0] … dis (2 antes del travesaño sur)
  norte: [-630, -58],            // dis — los mismos extremos que el perfil actual
  guiasSur: [[-1471.18, -1302]],                                  // step (guiaw reubicadas)
  guiasNorte: [[-630, -430], [-430, -230], [-230, -130.782]],     // step
};

// Travesaños (dis): posiciones elegidas por los huecos libres del conjunto y
// por la flecha (§7). Cada uno es un 40×40 que cruza de alargue a alargue.
//
// ═══════════════════════════════════════════════════════════════════════════
// A10 · EL RAMAL DE RETORNO ENTRA EN LA FRANJA DEL BASTIDOR (05-08-2026)
//
// EL CAMBIO QUE LO CAUSA. Hasta hoy el ramal de retorno de las 5 bandas corría
// LLANO a Z −59.07 de punta a punta y le pasaba 19.07 mm por debajo al fondo de
// los travesaños (Z.travBot = −40). Por eso los cuatro travesaños podían estar
// donde convenía a la flecha del larguero, sin mirar a la banda.
// Con la corrección del cliente del 03-08 el ramal de retorno CRUZA LA
// TRANSFERENCIA RECTO por el corredor del peine, a Z −9.87 de cara portante
// (params_tambores CORREDOR), sostenido por dos rodillos elevadores en Y −606 y
// −1360. Entre el tambor y el elevador norte, y entre el elevador sur y el
// conducido, hay dos RAMPAS — y las rampas suben por dentro de la franja
// Z −40…0, que es justo donde viven los travesaños.
//
// LOS CUATRO NÚMEROS (cara PORTANTE de la banda, medida sobre el contorno
// emitido del lazo; el travesaño ocupa Z −40…0 y se exigen 2 mm de holgura):
//   Y −555  · la banda pasa a Z −16.94…−27.03  → METIDA 13.0 mm en el perfil
//   Y −1440 · la banda pasa a Z −22.11…−30.64  → METIDA  9.4 mm
//   Y −1520 · la banda pasa a Z −39.16…−47.69  → METIDA  0.8 mm (roza)
//   Y −100  · la banda pasa a Z −61.59         → LIBRE por 21.6 mm (no se toca)
//
// LA CORRECCIÓN, distinta en cada uno porque el sitio es distinto:
//   · −555 → −450: SE MUEVE EN Y, sin bajarlo. A −450 el travesaño (−470…−430)
//     coge la rampa ya a Z −43.44, o sea 3.44 por debajo de su fondo. Es la
//     solución barata y es posible AQUÍ porque al norte hay hueco: el siguiente
//     travesaño está en −100 y en medio sólo vive la horquilla del tensor, que
//     ocupa Z −166.57…−56.57 y no se cruza con un perfil que muere en −40.
//     Efectos: el vano libre del larguero norte baja de 455 a 350 mm (mejora la
//     flecha) y su voladizo sur sube de 75 a 180 mm; la ménsula alma↔travesaño
//     norte viaja con él (`mensulaTravY`).
//   · −1440 y −1520 → SE BAJAN EN Z 45 mm (top −45, fondo −85). Al sur NO hay
//     hueco en Y: para librar la rampa, el de −1440 tendría que irse a −1528 o
//     más al sur y ahí ya está el de −1520; y el de −1520 no puede correrse
//     porque a −1553.4 empieza el tubo del rodillo conducido. Se comprobó y se
//     descarta, con el número. Bajándolos, la rampa les pasa POR ENCIMA con
//     14.4 y 5.8 mm y el bastidor conserva sus dos nudos donde estaban: no se
//     mueve ni la ménsula sur ni el cuadro de taladros del chapón.
// El precio de bajarlos es que su ESCUADRA larguero↔travesaño deja de ser un
// cantonera de 64 y pasa a ser una pletina de 109 de canto (ESCUADRA_LT.canto se
// calcula, no se escribe). Se declara.
// ═══════════════════════════════════════════════════════════════════════════
export const TRAVESANOS = [-1520, -1440, -450, -100];

/** Travesaños que CUELGAN más abajo de lo normal para dejar pasar la rampa del
 *  ramal de retorno recto. Clave = Y del travesaño, valor = cota de coronación.
 *  Vacío ⇒ todos a `Z.travTop` (que es lo que había antes del 05-08-2026). */
export const TRAVESANO_TOP = { '-1440': -45 };

// ═══════════════════════════════════════════════════════════════════════════
// A10-ter · EL TRAVESAÑO DE Y −1520 SE QUEDA — y estuvo retirado unas horas.
//
// Cuando los rodillos elevadores estaban en Y −606 y −1357 (que es donde cabía
// una MÉNSULA de 88×100), la rampa sur del ramal de retorno cruzaba el plano
// Z −40 DENTRO de la huella de este travesaño: le entraba 3.13 mm por el canto
// norte y no había cota que lo salvara —bajarlo topa con el cubrejunta
// alma↔cabezal (Z −125…−70) y moverlo, con el tubo del conducido (Y −1553.4)—,
// así que se retiró.
// Al pedir el cliente el rodillo SIN MÉNSULA y PEGADO a la transferencia
// (05-08), RE-S se fue de −1357 a −1206: la rampa arranca 151 mm más al sur, es
// más tendida y llega a este travesaño ya por debajo. Medido sobre el contorno
// emitido: la banda pasa a Z −52.58…−44.92 en su huella (Y −1540…−1500), o sea
// 4.92 mm por debajo de su fondo. VUELVE a su sitio y a su cota de siempre.
// Se deja escrito porque es el ejemplo de por qué las cotas de este bloque se
// RECALCULAN y no se copian: mover un rodillo 151 mm devolvió un travesaño.
// ═══════════════════════════════════════════════════════════════════════════
/** Coronación de un travesaño (calc). */
export const travTopDe = (y) => TRAVESANO_TOP[String(y)] ?? Z.travTop;
export const travBotDe = (y) => r3(travTopDe(y) - PERFIL.h);

// ---------------------------------------------------------------------------
// A1 · ESCUADRA LARGUERO ↔ TRAVESAÑO — la que no era una pieza
// ---------------------------------------------------------------------------
// Lo que había: dos cajas independientes, «Ala al larguero 6×30×32» en
// Z [travTop+4, travTop+36] y «Ala al travesaño 30×6×32» en
// Z [travBot+4, travBot+36]. Como el perfil mide 40 de canto, entre las dos
// quedaban 8.00 mm de AIRE en Z: el sólido eran dos pletinas sueltas, no una
// escuadra. Y la nota declaraba 4 M8 por escuadra (80 en el bastidor) con CERO
// taladros modelados.
//
// Lo que es ahora: UNA escuadra de RINCÓN VERTICAL. El rincón no está en Z
// (como si fuese una escuadra de repisa) sino en la arista vertical donde se
// cortan la cara +X del larguero (X = eje + 20) y la cara ±Y del travesaño
// (Y = y ± 20). Las dos alas nacen de esa arista y las dos suben y bajan el
// MISMO canto, Z −32…+32: por eso ahora se tocan, y por eso la de arriba
// alcanza la ranura del larguero (Z 15…25) y la de abajo la del travesaño
// (Z −25…−15) siendo una sola chapa.
//
// UN M8 POR ALA, y el motivo es de espacio, no de gusto: entre dos largueros
// contiguos quedan 76.2 − 40 = 36.2 mm, y entre los travesaños de −1520 y
// −1440 quedan 40. Dos Ø9 en fila piden 2.2·d₀ + 2 × 1.2·d₀ = 19.8 + 21.6 =
// 41.4 mm (EN 1993-1-8) y no caben en ninguna de las dos direcciones. Con ala
// de 34 el taladro queda centrado, a 17 de cada canto. Es además el patrón de
// catálogo de una escuadra de perfil 40×40: un tornillo por ala.
export const ESCUADRA_LT = {
  e: 6.0,                        // dis — pletina A36; se deducía de la sección
  material: 'Pletina Acero A36 (S275JR) e=6',   // dis — antes no había campo
  ala: 34,                       // calc — 1 Ø9 centrado, 17 de canto (≥ 1.2·d₀)
  holgura: 3,                    // dis — el ala no invade la sección del perfil:
                                 //   arranca 3 mm fuera de su cara (montaje)
  pasante: 9.0, rosca: 'M8', n: 2,               // 1 por ala → 2 por escuadra
  zLarguero: 20,                 // calc — eje de la ranura +X del larguero
                                 //   (Z.perfilBot + 40/2 = 20)
  // A10 · EL CANTO YA NO ES UN LITERAL. Mientras todos los travesaños coronaban
  // en Z 0 el canto era 64 (Z −32…+32: cubría la ranura del larguero, Z 15…25, y
  // la del travesaño, Z −25…−15). Ahora hay travesaños BAJADOS para dejar pasar
  // la rampa del ramal de retorno recto, y la escuadra tiene que seguir llegando
  // a las dos ranuras: se CALCULA de las dos cotas, no se escribe.
  //   canto = (12 sobre la ranura del larguero) − (12 bajo la del travesaño)
  zTravesanoDe: (y) => r3(travTopDe(y) - PERFIL.h / 2),   // eje de la ranura ±Y
  zTopDe() { return this.zLarguero + 12; },               // 32 — 12 sobre su ranura
  zBotDe(y) { return r3(this.zTravesanoDe(y) - 12); },    // 12 bajo la del travesaño
  cantoDe(y) { return r3(this.zTopDe() - this.zBotDe(y)); },   // 64 · 109 si baja 45
  // compatibilidad con el código que aún lee las cotas planas (travesaño a Z 0):
  get canto() { return this.cantoDe(-100); },    // 64
  get zBot() { return this.zBotDe(-100); },      // −32
  get zTravesano() { return this.zTravesanoDe(-100); },   // −20
  plegada: true, get radio() { return this.e; }, // r = t, como el resto de la chapa
  // A QUÉ LADO DEL TRAVESAÑO VA EL RINCÓN. El lado LIBRE: en el travesaño de
  // −1520 el lado −Y lo ocupa el rodillo conducido Ø108 (Y −1661…−1553).
  ladoRincon: (y) => (y < -1450 ? 1 : -1),
  // EN QUÉ TRAVESAÑOS VA. NO en el de −1520, y el motivo es geométrico, medido
  // con el chequeo B-rep: ese travesaño está a 80 mm del de −1440 y entre los
  // dos quedan 40 mm libres, mientras que cada ala mide 34 y el rincón se pone
  // 3 mm fuera de la cara del perfil. Con escuadra en los dos, las dos alas del
  // MISMO larguero se interpenetraban 10.07 cm³ por calle (50 en total), y si
  // se les daba la vuelta chocaban con los pernos M8 del CT-ENS del cliente
  // (X 135.06…152.36 y 439.86…457.16, Y −1429.4…−1414.4, Z −26.5…−13.5).
  // No pasa nada por dejarlo sin escuadra: el larguero APOYA encima de los dos
  // travesaños, la escuadra sólo impide que corra, y con la de −1440 a 80 mm ya
  // está impedido. Además el travesaño de −1520 muere DENTRO de los cabezales
  // de rodamiento (mod_pg40 §3, `enCabezal`), o sea que él sí está tomado por
  // sus dos extremos. Quedan 15 escuadras en vez de 20.
  enTravesano: (y) => y !== -1520,
};

// ---------------------------------------------------------------------------
// A6 · TRAVESAÑOS DE PUENTE — los dos apoyos que se llevó `desactivaPercha`
// ---------------------------------------------------------------------------
// El PUENTE DE CALLE (la única calle portante dentro de la huella del NBT90:
// el bulto lo cruza apoyado en él) descansa en 10 «Placa base de puente» que
// mod_calles pone en Y −1280 y −692 con su cara inferior en Z 9.15. Esa cota
// era la CORONACIÓN de los travesaños de la percha (params_adapt PERCHA.travS
// = [−1300,−1220] y travN = [−712,−632], travTopZ = 9.15). Al poner
// FLAGS.desactivaPercha = true esos travesaños salieron del ensamble por
// nombre y las 10 placas, los 5 puentes, las 5 regletas UHMW y 20 pernos se
// quedaron EN EL AIRE — es el hallazgo A6 de la revisión de fabricación y el
// SC-01 de la revisión estructural.
//
// LA DECISIÓN, entre las dos que planteaba el informe: se devuelve el apoyo en
// su sitio, NO se lleva el puente a los travesaños PG40 que ya existen. Motivo,
// con el número delante: los PG40 más próximos están en Y −1440 y −555, y
// apoyar ahí lleva el vano libre del puente de 588 a 885 mm — un ×1.51 en luz,
// que en flecha (∝ L³) es ×3.44 sobre una pletina 30×28 que ya estaba
// dimensionada al límite de 0.1 mm. Devolver el apoyo cuesta dos perfiles y no
// obliga a recalcular nada aguas abajo.
//
// Son PG40 40×40 ranura 10 como el resto del bastidor (no el 40×80 ranura 8 de
// la percha, que era perfil del cliente): coronan en Z 9.15 exactos, o sea
// zBot = −30.85, y su ranura superior queda bajo la placa base, que es donde
// muerden sus dos tuercas martillo M8. Y NO llevan escuadra larguero↔travesaño:
// a esas Y no hay larguero (los tramos mueren en −1302 y arrancan en −630),
// están precisamente en el hueco por el que el puente cruza la transferencia.
//
// ═══════════════════════════════════════════════════════════════════════════
// A10-bis · ESTOS DOS TRAVESAÑOS ESTÁN AHORA BAJO EL RAMAL DE RETORNO
//
// Con el retorno recto (corrección del cliente 03-08) el ramal de las 5 bandas
// cruza la transferencia por el corredor del peine a Z −9.87 de cara portante, y
// ese ramal pasa POR ENCIMA de estos dos travesaños, que coronaban en Z 7.28.
// La banda se los comía por 17.15 mm.
// LA CORRECCIÓN: el travesaño BAJA a coronar en Z −14 (fondo −54), o sea 21.28
// mm, y la «Placa base de puente» deja de ser una pletina plana de 6 y pasa a ser
// un CABALLETE que salva el ramal: dos patas de 8 mm a X = eje ± 23 (la banda
// mide 32, o sea eje ± 16 → 3 mm de aire por lado) y un ala superior de 64 × 6
// en la MISMA cota de antes, para que el puente no se entere.
// POR QUÉ NO SE MUEVEN EN Y, que era la otra salida: el puente los necesita
// donde están. Llevarlos a los travesaños PG40 vecinos dispara el vano libre del
// puente de 588 a 885 mm (×1.51 en luz, ×3.44 en flecha sobre una pletina 30×28
// ya dimensionada al límite de 0.1 mm) — es el mismo cálculo que ya cerró §A6.
// Y hacia fuera no pueden ir: la rampa del retorno sólo baja de −40 pasado
// Y −470 al norte y Y −1508 al sur, y ahí el puente no llega.
// ═══════════════════════════════════════════════════════════════════════════
export const TRAVESANOS_PUENTE = [
  { y: -1280, nom: 'sur' },      // = centro de la ranura de la placa base sur
  { y: -692, nom: 'norte' },     // = ídem norte
];
export const PUENTE_APOYO = {
  // El travesaño NO llega a hueso hasta el chapón: muere en la cara interior de
  // su escuadra de extremo (inset = espesor de la chapa 3/16"). Verificado con el
  // chequeo B-rep: a hueso, el ala vertical de la escuadra se metía 5.30 cm³
  // dentro del perfil.
  get inset() { return this.escuadra.t; },        // 4.763
  // COTA DE CORONACIÓN. No se copia el 9.15 de params_adapt PERCHA.travTopZ: se
  // RECALCULA de la cadena del puente, que es de quien depende
  //     cara de rodadura − regleta UHMW − pletina del puente − placa base.
  // Si el dueño de la banda cambia el espesor del dorso (y con él la cara de
  // rodadura), este apoyo baja con el puente en vez de quedarse clavado en una
  // cota vieja y meterse 1.87 mm dentro de la placa base — que es exactamente
  // lo que pasó al pasar la banda a su espesor real de 2.5 mm.
  // Cara inferior de la PLACA BASE (la cota que el puente exige y que no cambia)
  get baseZ() { return r3(CALLE.puente.topZ - CALLE.puente.uhmwH - CALLE.puente.aceroH - CALLE.puente.baseT); },
  // A10-bis · CORONACIÓN DEL TRAVESAÑO. Ya no es la cara inferior de la placa
  // base: entre las dos pasa ahora el ramal de retorno recto, así que el
  // travesaño baja hasta librarlo y el caballete cubre la diferencia.
  // El límite lo pone la CARA PORTANTE del ramal (params_tambores CORREDOR.zCara
  // = −9.87) menos la holgura; no se escribe un −14 a mano.
  ramalZ: -9.87,                 // params_tambores CORREDOR.zCara (se re-verifica
                                 //   en la compuerta contra el contorno emitido)
  // ⚠ LA HOLGURA NO SE MIDE CONTRA EL TRAMO RECTO, sino contra la RAMPA. Al
  // acercar los rodillos elevadores al módulo (05-08, tercera corrección del
  // cliente) el tramo recto del retorno se acortó a Y −1206…−739 y estos dos
  // travesaños quedaron FUERA de él: por su huella ya no pasa la banda plana a
  // −9.87, pasa la rampa BAJANDO. Medido sobre el contorno emitido, la cara
  // portante llega a Z −20.22 en el canto norte del travesaño de −692 y a
  // −23.62 en el canto sur del de −1280. Con la holgura vieja (4.13, o sea
  // coronar en −14) la banda se les metía 6.2 y 9.6 mm — 20.3 cm³ en la
  // verificación B-rep. La holgura pasa a 18.13 para coronar en −28, que deja
  // 7.78 y 4.38 mm a la rampa. Si el elevador se mueve otra vez, ESTE número hay
  // que rehacerlo: la §R lo canta sobre el contorno, no sobre esta línea.
  holguraRamal: 18.13,           // calc — ver arriba (antes 4.13, contra el tramo recto)
  get topZ() { return r3(this.ramalZ - this.holguraRamal); },      // −28.0 calc
  get botZ() { return r3(this.topZ - PERFIL.h); },                 // −54.0 calc
  // altura del CABALLETE: de la coronación del travesaño a la cara inferior de
  // la placa base (que no se mueve)
  get caballeteH() { return r3(this.baseZ - this.topZ); },         // 21.28 calc
  // ═════════════════════════════════════════════════════════════════════════
  // GEOMETRÍA DEL CABALLETE — dos CASQUILLOS, no dos patas de chapa.
  //
  // Se probó primero con patas de chapa de 8 y un PIE hacia fuera para el M8, y
  // NO CABE: el pie necesita 9 + 2×12 = 33 mm de ancho para un Ø9 con distancia
  // al canto, el paso de calle son 76.2 y las patas ya están a ± 23 del eje. Dos
  // caballetes contiguos se solapaban 9.8 mm (7.5 cm³ por par, lo cazó la
  // compuerta AABB). Escalonarlos en Y no vale: la AABB de la pieza sigue
  // midiendo 86 de ancho.
  // LA FORMA QUE SÍ ENTRA: el ala superior se apoya en dos CASQUILLOS cuadrados
  // que bajan hasta la coronación del travesaño, y el M8 los atraviesa de arriba
  // abajo hasta la tuerca martillo. Sin pies, sin voladizos y con el tornillo
  // accesible desde arriba, que es por donde se monta el puente.
  //   · casquillo 16×16 a X = eje ± 27  → cara interior a eje ± 19, o sea 3 mm
  //     de aire a la banda (32 de ancho, eje ± 16), y cara exterior a eje ± 35;
  //   · el caballete completo mide 72 de ancho (eje ± 36) contra los 76.2 de
  //     paso: 4.2 mm entre caballetes contiguos;
  //   · M8 × 32 desde la cara superior del ala: atraviesa ala (6) + casquillo
  //     (21.28) y entra 4.72 en la ranura del travesaño.
  // ═════════════════════════════════════════════════════════════════════════
  caballeteCasquillo: 16,        // dis — lado del casquillo (X e Y)
  caballeteCasquilloX: 27,       // dis — eje ± 27 (3 mm de aire a la banda)
  caballeteAncho: 72,            // dis — ala superior (eje ± 36, cabe en el paso 76.2)
  caballeteTornillo: { rosca: 'M8', pasante: 9.0, largo: 32 },
  // Escuadra de extremo al chapón del cliente, 3/16" (la misma chapa y el mismo
  // papel que la «Escuadra travesaño↔bastidor» que la percha llevaba): sin ella
  // el travesaño topa a hueso contra el chapón y la compuerta §S SC-11 lo cuenta.
  // ⚠ ALA VERTICAL 30 Y NO 45 (A10-bis): al bajar el travesaño 21.28 mm, un ala
  // de 45 llegaría a Z −59 y el ALMA del alargue corona en −45.12 en el lado +X
  // — la escuadra se le metía 13.9 mm. Con 30 el ala muere en −44 y libra por
  // 1.1 mm; su taladro sigue a 12 mm del canto inferior, que es lo que pide un
  // Ø9 (1.2·d₀ = 10.8).
  // …y ALA HORIZONTAL 24 y no 30 (A10-bis): el ala entra hacia dentro desde el
  // chapón y el CABALLETE de la calle 5 llega a X 467.9 (72 de ancho sobre el eje
  // 431.856). Con 30 el ala moría en 464.66 y se solapaban 3.24 mm; con 24 muere
  // en 470.66 y libran por 2.76. Sus 2 Ø9 siguen sobre la ranura del travesaño.
  escuadra: { t: 4.763, alaV: 30, alaH: 24, ancho: 60,             // nbt90 P.placaT
    pasante: 9.0, rosca: 'M8', n: 2,   // 2 al chapón + 2 a la ranura del travesaño
    radio: 4.763 },                    // r = t (mismo criterio que el resto de chapa)
};
// A10-quater · UN TRAVESAÑO BAJADO NO PUEDE LLEGAR AL CHAPÓN. Al colgar 45 mm
// más abajo, su fondo (Z −85) entra en la franja del ALMA del alargue, que ocupa
// Z −222…−70 en X 42.89…50.89 (−X) y −222…+26 en 491.42…499.42 (+X). Así que el
// travesaño bajado MUERE EN LAS CARAS INTERIORES DEL ALARGUE, igual que los que
// caen dentro de un cabezal de rodamiento: pasa de L=580.841 a L=423.924 y se
// amarra al alma en vez de al chapón.
//   −1520: RETIRADO (ver A10-ter)
//   −1390: sobre el IDLER-ENS (que vive en Z −273…−155, no compite)
//   −600 : entre el travesaño de percha norte (−632) y el volante V4 (−586)
//   −100 : antes de la cabecera motriz (−70.9) y de la polea motriz (−56)

// ---------------------------------------------------------------------------
// 5. EL ALARGUE de la estructura lateral de la transferencia
// ---------------------------------------------------------------------------
// El NBT90 NO SE TOCA. El alargue es pieza NUEVA del sorter: una pletina de
// acero cortada por láser que se atornilla al ALMA del side channel del NBT90
// (por sus colisas de reglaje, que quedaron libres al retirar el canal del
// anfitrión ProSort) y se prolonga hacia el tambor motriz y el rodillo
// conducido hasta llevar los soportes de rodamiento.
//
// DÓNDE VIVE (el hueco lo fija el chapón del cliente, no el gusto):
//   · cara interior del chapón de descarga  X = 499.418 (step frameIntPos)
//   · alma del side channel +X, cara ext.   X = 508.026 (nbt90 Xc + sideAlmaExtY)
//     … y su cara interior                  X = 505.369 (calc: − 12 GA 2.657)
//   El alargue se pone A RAS de la cara interior del chapón (contacto plano, se
//   atornilla a él) y alcanza el alma del side con casquillos separadores.
const CHAPON_INT = STEP.frameIntPos;                       // 499.418 step
const ALMA_EXT = r3(Xc + NBT.sideAlmaExtY);                // 508.026 nbt90
const ALMA_INT = r3(ALMA_EXT - P.cal12);                   // 505.369 calc (12 GA)
const ALMA_EXT_NEG = r3(Xc - NBT.sideAlmaExtY);            // 50.886 nbt90 (lado −X)

// ═══════════════════════════════════════════════════════════════════════════
// A11 · VENTANA EN EL ALMA −X PARA LA CHUMACERA DEL EJE PIVOTE (05-08-2026)
//
// LA CAUSA. El RECORTE DE ANCHO mete la cara interior del chapón −X de −81.423 a
// 40.886, y `params_tensor2.PIV.ucflX` ancla las dos chumaceras del eje pivote
// del tensor a `STEP.frameIntNeg` — o sea que la de −X viaja con el chapón y
// aterriza sobre el ALMA de este alargue, que corre por X 42.886…50.886. Solape
// medido con la verificación B-rep: 17.85 cm³.
//
// POR QUÉ LO ARREGLA ESTE MÓDULO Y NO EL DEL TENSOR. La chumacera está donde
// tiene que estar: apoyada en la cara interior del bastidor, que es donde va una
// UCFL 206 de eje pivote. Quien invade su sitio es MI alma, que es una pletina
// de 8 mm que aquí no lleva ninguna carga —su cometido es amarrar al side
// channel del NBT90 (Y −1145…−802) y sostener los cabezales de rodamiento
// (Y ≥ −125)—: entre Y −180 y su testa norte no hay ni un taladro. Se le abre
// una VENTANA y no se toca `params_tensor2`.
//
// LAS COTAS SE CITAN, NO SE IMPORTAN. `mod_pg40` no importa `params_tensor2` a
// propósito: ese archivo está en manos de otro agente ahora mismo y una
// dependencia en vuelo haría que mi geometría cambiara sin que yo lo sepa. Se
// copian sus valores publicados con su procedencia, igual que hace
// `params_tambores` con las cotas de pg40 para no cerrar un ciclo. Si el tensor
// mueve su chumacera, esta ventana deja de casar y la compuerta §W lo dice.
export const VENTANA_UCFL_PIVOTE = {
  activa: true,
  fuente: 'adapt/params_tensor2.mjs · PIV (chumacera SKF UCFL 206 del eje pivote, lado −X). '
    + 'Envolvente medida sobre el ensamble emitido: Y −175.72…−27.72 · Z −184.70…−140.70',
  y: [-175.72, -27.72],          // tensor2 (citado)
  z: [-184.70, -140.70],         // tensor2 (citado)
  holgura: 4.0,                  // dis — aire de corte láser alrededor de la brida
  // La ventana se abre SÓLO en el trozo que se solapa con el alma; hacia el
  // norte muere en la testa del alma, así que es un ESCOTE de esquina, no un
  // agujero cerrado.
  get yCorte() { return [r3(this.y[0] - this.holgura), r3(this.y[1] + this.holgura)]; },
  get zCorte() { return [r3(this.z[0] - this.holgura), r3(this.z[1] + this.holgura)]; },
  nota: 'escote de esquina en la testa norte del alma −X. No cruza ningún taladro: los 3 amarres al '
    + 'side channel están en Y −1145, −973.5 y −802, y el canto del alma sigue entero por arriba '
    + '(hasta Z −136.7) y por abajo (desde −188.7)',
};

export const ALARGUE = {
  material: 'Acero A36 (S275JR)',
  e: 8.0,                        // dis: 8 mm — el UCF 207 lleva M12 y el alma de
                                 //   12 GA (2.657) del side no es asiento de
                                 //   rodamiento; 8 mm da 1.5 Ø de aplastamiento.
  // DÓNDE CABE EL ALMA. La transferencia NO SE TOCA, así que el alargue va POR
  // FUERA de su envolvente. El hueco es distinto en cada lado — el alargue es
  // asimétrico, y no por capricho: son las cajas medidas del conjunto.
  //   · PLACA PEINE del NBT90 (MÓVIL): barre X 63.46…495.46 en Z −242.27…50.99
  //     dentro del módulo → por DENTRO del alma del side channel no cabe nada
  //     longitudinal a esa altura.
  //   · CANAL DE MONTAJE DEL CILINDRO del NBT90: X 58.31…500.61, techo Z −225.03.
  //   · ENSAMBLE MOTOR UniDrive del cliente (contexto medido, manda él):
  //     X desde 63.098, Y −1551.26…−1432.21, Z −273.02…−155.17.
  //   · Chapón de descarga del cliente: X 499.418…527.418 (en +X no hay salida
  //     hacia fuera); en −X el bastidor está a 132.3 y sobra sitio.
  // Solución: el alma se apoya en la cara EXTERIOR del alma del side channel en
  // −X (lap directo, sin casquillos) y en la cara INTERIOR del chapón en +X.
  get xExt() { return CHAPON_INT; },                       // 499.418 (+X, contra el chapón)
  get xInt() { return r3(CHAPON_INT - this.e); },          // 491.418 (+X)
  get xNegInt() { return ALMA_EXT_NEG; },                  // 50.886 (−X, cara ext. del alma del side)
  get xNegExt() { return r3(ALMA_EXT_NEG - this.e); },     // 42.886 (−X)
  // CABEZALES del lado −X: van en el plano que pide adapt/params_tambores.mjs
  // (caraApoyoX 59.494 para el motriz OUTBOARD y 67.494 para el conducido
  // INBOARD) — o sea la misma pletina de 8, corrida 8.608 hacia dentro respecto
  // del alma. El escalón se salva con casquillos separadores en el empalme.
  xCabNegExt: 59.494,
  get xCabNegInt() { return r3(this.xCabNegExt + this.e); },        // 67.494
  get escalonNeg() { return r3(this.xCabNegExt - ALMA_EXT_NEG); },  // 8.608
  // Holguras que deja esa colocación (calc, las verifica la compuerta §P):
  get holguraPeineNeg() { return r3(63.46 - this.xNegInt); },      // 12.574
  get holguraMotorNeg() { return r3(63.098 - this.xNegInt); },     // 12.212
  get holguraPeinePos() { return r3(this.xInt - 495.46); },        // −4.04 → el tramo
  //   del módulo del lado +X NO puede ir a 491.418: se mete en el hueco de
  //   5.951 que queda entre el chapón (499.418) y el alma del side (505.369),
  //   que es justo el que ya libera la MUESCA declarada del chapón. Ahí la
  //   holgura al peine es 499.418 − 495.46 = 3.958 (calc).
  lapE: 5.9,                     // dis: pletina de 6 nominal, 0.05 de holgura de montaje
  get lapXPos() { return CHAPON_INT; },                    // 499.418 → 505.318
  get holguraLapPeine() { return r3(CHAPON_INT - 495.46); },       // 3.958
  get separador() { return r3(ALMA_INT - CHAPON_INT); },   // 5.951 — el hueco que rellena
  casquillo: { od: 16 },         // dis: Ø16 sobre perno 3/8 (como PERCHA.casquilloEscote)

  // ARQUITECTURA EN TRES PIEZAS POR LADO (dis, y la razón es geométrica):
  // el DECK del sorter prohíbe cualquier cosa sobre el plano de transporte
  // dentro de X −81.423…499.418 y de Y −1530.782…−130.782 (compuerta §L). El
  // cuadro de taladros del UCF 207 mide 92 y pide canto hasta Z ±70 — por
  // encima del plano. Por eso el alargue se parte:
  //   · ALMA: corre por la banda libre (Z −248…−70), por debajo de todo el
  //     mecanismo del sorter, y hace el lap con el side channel del NBT90;
  //   · dos CABEZALES DE RODAMIENTO: sólo en los ejes, que caen FUERA de la
  //     ventana Y del deck (motriz Y 0 > −130.782 · conducido Y −1607.4 <
  //     −1530.782). Ahí sí puede subir a +70 sin invadir el paso del bulto.
  //   · dos CUBREJUNTAS por lado que empalman cabezal y alma (Z ≤ −45).
  // Alma y cabezales son COPLANARIOS: la cara de apoyo del UCF 207 no cambia.
  almaY: [-1535, -125],          // calc: hasta el borde de la ventana del deck
                                 //   (−1530.782 y −130.782) con 4.2 / 5.8 de margen
  almaZTop: -70,                 // dis: bajo el eje pivote del tensor y el árbol motriz
  almaZBot: -222,                // dis: 3.03 sobre el techo del canal de montaje del
                                 //   cilindro del NBT90 (Z −225.03) — la transferencia
                                 //   no se toca, se aparta el alargue
  lapZTop: -93,                  // dis: 2.07 bajo el ala superior del side (−90.93)
  // El lado +X va PARTIDO en dos tramos de lap: la PLACA COLGANTE DEL CANAL del
  // NBT90 ocupa X 500.61…505.37 en Y −1081.5…−865.5, justo el hueco del chapón.
  // Se la rodea, y con ello sólo quedan utilizables las colisas de −1145 y −802
  // en ese lado (la de −973.5 cae detrás de la placa colgante).
  lapY: [[-1208, -1090], [-855, -739]],
  lapPernosY: [-1145, -802],     // calc: las colisas que sí quedan libres en +X
  almaPosSur: [-1535, -1208],    // calc: +X, fuera del módulo (side desde −1202.1)
  almaPosNorte: [-739, -190],    // calc: +X, fuera del módulo (side hasta −744.9) y
                                 //   parando 19 antes de la chumacera UCFL 206 del eje
                                 //   pivote del tensor (cuerpo hasta Y −141): el hueco
                                 //   hasta el cabezal lo cose el cubrejunta, que corre
                                 //   por Z −70…−45, fuera del alcance de la chumacera
  cubreLapY: [[-1268, -1172], [-776, -700]],  // dis: empalmes alma↔lap, esquivando
                                 //   las placas peine (Y −1167.3 y −784.5)
  cubreLapX: 482.918,            // calc: xInt − 8.5, por dentro (0.5 de holgura de
                                 //   montaje al alma: a hueso el booleano deja sliver)
  transicion: 35,                // dis: longitud de la diagonal de cambio de canto
  cabezalMotrizY: [-125, 122],   // calc — fuera de la ventana Y del deck.
                                 //   A5 (revisión de fabricación 2026-08-03): el
                                 //   borde estaba en +90 y el SEGUNDO taladro de la
                                 //   placa de extremo del travesaño frontal del
                                 //   tensor cae en Y 110 — 20 mm al aire. El
                                 //   cabezal se alarga a +122 (12 de distancia al
                                 //   canto sobre el taladro) porque ES ÉL el que
                                 //   tiene que dar chapa: la placa no se puede
                                 //   estrechar sin dejar los dos pernos a un lado
                                 //   del tubo 40×40, que va de Y 58 a 98 y tapa la
                                 //   llave. Zona verificada libre: los dos únicos
                                 //   sólidos del cliente por ahí (LAT TOP y FRONT
                                 //   TOP2) mueren en Y 90.18.
  cabezalCondY: [-1697.4, -1535],// calc — ídem, por el otro extremo
  cabezalZ: [-125, 70],          // calc: +70 = 46 semicuadro UCF + 24 de canto; el
                                 //   faldón hasta −125 es el que recibe el cubrejunta
                                 //   POR DEBAJO de la pletina de soporte del conducido
                                 //   (117×117 centrada en Z −2.3, o sea hasta −60.8).
                                 //   A3: bajado de −120 a −125 para que la fila
                                 //   inferior de pernos del cubrejunta (Z −110)
                                 //   tenga 15 mm de distancia al canto. Más abajo
                                 //   no se puede ir sin acercarse al ENSAMBLE MOTOR
                                 //   UniDrive del cliente (techo Z −155.17).
  cubrejuntaE: 8,                // dis: mismo espesor, por dentro del alma
  // A3 · EL CUBREJUNTA ES LA JUNTA POR LA QUE PASA LA REACCIÓN DEL TAMBOR.
  // Declaraba «4 pernos M10 al alma y 4 al cabezal» y no tenía ni un taladro —
  // ni él ni sus dos piezas. Y con 35 de canto sólo cabía UNA fila de pernos:
  // una junta de una sola alineación no cose nada a flexión. Ahora:
  //   · canto 55 (Z −125…−70), que es lo que deja el faldón del cabezal por
  //     abajo (−125) y el canto del alma por arriba (−70);
  //   · DOS filas de pernos en Z −85 y −110 (paso 25 ≥ 2.2·d₀ = 24.2 de
  //     EN 1993-1-8) con 15 de distancia al canto arriba y abajo (≥ 1.2·d₀ =
  //     13.2), 2 pernos por fila y por pieza → 4 al alma + 4 al cabezal = los 8
  //     que la nota ya declaraba;
  //   · y los mismos Ø11 taladrados EN EL ALMA Y EN EL CABEZAL.
  cubrejuntaZ: [-125, -70],      // calc (A3): de faldón de cabezal a canto de alma
  cubrejuntaPernoZ: [-85, -110], // calc (A3): 2 filas, paso 25, canto 15
  cubrejuntaPernoDY: 16,         // calc (A3): ±16 → paso 32 en Y (≥ 24.2) sobre los
                                 //   65 mm de solape más corto (conducido), con
                                 //   16.5 de distancia al canto
  // A4 · LA MÉNSULA ERA UNA PLETINA PLANA. Vivía en el plano del alma (normal X)
  // y «subía al travesaño PG40», que es un 40×40 que corre en X con sus ranuras
  // mirando a ±Y y ±Z: una pletina contenida en el plano YZ no se puede
  // atornillar a ninguna de ellas — no había taladro ni cordón, y esta es la
  // pieza que amarra el bastidor PG40 al NBT90. Ahora es ESCUADRA en dos alas:
  //   · ALA VERTICAL 30 (Y) × 60 (Z) en el plano de solape del alma. NO lleva
  //     tornillo: va SOLDADA al alma con cordón de rincón por las dos caras del
  //     solape. Y no por gusto — por acceso: en +X la cara exterior del alma
  //     (X 499.418) es la cara interior del chapón del cliente, así que no hay
  //     sitio para tuerca ni cabeza, y una M10 roscada en 8 mm de chapa da 0.8·d
  //     de empotramiento. Se lapa 30 mm sobre el alma (Z −100…−70), que es lo
  //     que pide un cordón de garganta 5.6 en chapa de 8.
  //   · PESTAÑA 45 (X) × 36 (Z) contra la cara +Y del travesaño, con 2 Ø9 para
  //     tuerca martillo M8 en su ranura 10. Esa ranura corre en X: por eso los
  //     dos taladros se separan en X y no en Z.
  mensulaTravY: [-1440, -555],   // calc: el travesaño que amarra cada ménsula
  // La ménsula se centra 35 mm DETRÁS de la cara +Y del travesaño, y esa cota no
  // es libre: en +X la pletina de soporte del rodillo de retorno RR1 ocupa
  // Y −656…−556 en el MISMO plano de chapa (X 479.418…491.418, params_tambores),
  // así que la ménsula norte no puede bajar de Y −556 — y la ranura −Z del
  // travesaño, que está en Y −555, queda dentro de esa zona prohibida. Por eso
  // el amarre se hace por la ranura +Y y no por la de abajo.
  get mensulaY() { return this.mensulaTravY.map(y => r3(y + 20 + this.mensulaAncho / 2)); },
  mensulaZ: [-100, -4],          // calc (A4): de Z −100 (30 de solape con el alma,
                                 //   que corona en −70, para su cordón) a Z −4, que
                                 //   cubre la ranura +Y del travesaño (Z −25…−15).
                                 //   Antes era [−70, −40]: ni tocaba el alma
  mensulaE: 8,                   // dis — pletina A36, la misma chapa del alargue
  mensulaAncho: 16,              // calc — NO es libre: la «Guarda de pozo norte
                                 //   14GA» del cliente corre en Y −515.1…−513.2
                                 //   por X −73…479 y Z −118…−63, justo por donde
                                 //   pasa el ala vertical de la ménsula norte.
                                 //   Con 16 el ala llega a Y −519 y libra por 3.9
  mensulaTab: { largo: 24, alto: 36, e: 8, z: -20,   // calc — pestaña contra la cara
                                 //   +Y del travesaño; Z −38…−2 con el taladro en el
                                 //   eje de la ranura (Z −20): 18 y 18 de canto.
                                 //   El LARGO tampoco es libre: los pernos M8 del
                                 //   CT-ENS del cliente ocupan X 101.76…119.06 (−X,
                                 //   calle 1) y 439.86…457.16 (+X, calle 5) a esa
                                 //   misma Y y Z. Con 24 la pestaña muere en X 82.89
                                 //   y 459.42 y libra por 18.9 y 2.3
    pernoX: [12],                // calc: UN M8 centrado, 12 de canto (≥ 1.2·d₀ =
                                 //   10.8). Dos pedirían 41.4 mm de pestaña y ahí
                                 //   sólo caben 24: se declara y no se fuerza
    pasante: 9.0, rosca: 'M8' },
  mensulaCordon: 'cordón de rincón continuo a=5.6 por las dos caras del solape '
    + '(AWS D1.1, chapa de 8 mm), símbolo ISO 2553',   // dis
  // A5 · INTERFAZ CERRADA CON EL TENSOR (mod_tensor2 «Placa de extremo del
  // travesaño frontal»). Antes era una PETICIÓN escrita en la nota de la placa
  // («2 taladros Ø9 por cabezal, en Y 50 y 106, Z −85») que nadie ejecutaba: el
  // cabezal no tenía ningún Ø9. Ahora la cota vive aquí, la publica params_pg40
  // y la leen las DOS piezas.
  taladrosTensor: { y: [46, 110], z: -85, pasante: 9.0, rosca: 'M8', n: 2 },

  // Amarre al SIDE CHANNEL del NBT90 (nbt90): sus 3 colisas de reglaje por lado.
  //   Y = T.y − sideTornX  ·  colisa Ø10.3 × 26.3 VERTICAL centrada en Z −104.267
  get pernosSideY() { return NBT.sideTornX.map(x => r3(T.y - x)); },   // −802, −973.5, −1145
  sideColisaZc: r3(NBT.sideTornZ + T.z),                   // −104.267 calc
  sideColisaAlto: 26.3,          // nbt90
  // El perno se lleva al FONDO de la colisa (dis): a Z −104.267 el taladro
  // quedaría a 11.27 del canto superior del alargue (−93) → 5.7 de material.
  // A −113 quedan 20 de distancia al canto (≥ 1.5 Ø = 14.3, regla de taller) y
  // aún 4.4 al final del recorrido de la colisa (−117.417).
  pernoSideZ: -113,              // dis
  pernoSide: { d: P.M.b38.d, pasante: r3(P.M.b38.d + P.holgura.pasante), rosca: '3/8-16 UNC' },

  // Amarre al CHAPÓN del cliente (dis) — MODIFICACIÓN DECLARADA: 8 taladros
  // Ø11 M10 por lado en el chapón de 28. Es contacto plano cara con cara (el
  // alargue está a ras de su cara interior), sin separadores.
  // Los 8 SE REPARTEN ESQUIVANDO LAS PLETINAS DE SOPORTE de los rodillos de
  // retorno (calc, params_tambores RETORNOS.soporte): esas pletinas 100×100
  // apoyan contra ESTA MISMA cara del alma (X 479.418…491.418) y su huella en Y
  // es RR1 −656…−556 · RR2 −722…−622 · RR3 −1330…−1230 · RR4 −1375…−1275 — a la
  // cota Z −92 la cubren entera. La tuerca M10 sale 8 mm hacia dentro desde la
  // cara de apoyo, así que un perno ahí no es un solape de modelo: es que no se
  // puede montar. Los dos que caían dentro (Y −1300 en RR4 y Y −660 a 4 mm de
  // RR1, que su tuerca af16 ya invadía) se corren al hueco libre más próximo:
  //   −1300 → −1450 (el tramo sur sólo tiene libre −1535…−1375 y −1230…−1208)
  //   −660  → −540  (deja 6.76 a la pletina de RR1 y 20 al perno de −520)
  // MODIFICACIÓN DECLARADA sobre los taladros nuevos del chapón (siguen siendo 8).
  // A4 (2026-08-03): dos de los ocho se corren OTRA VEZ, ahora porque la ménsula
  // alma↔travesaño deja de ser una pletina de 30 de canto y baja a Z −100 para
  // solapar 30 mm con el alma (que es lo que pide su cordón). Sus tuercas M10,
  // que salen 8.5 mm hacia dentro desde la cara del alma, caían dentro de la
  // nueva ménsula: −1450 (tuerca Y −1458…−1442) contra la ménsula de −1440
  // (Y −1455…−1425) y −540 (tuerca Y −548…−532) contra la de −540 (Y −555…−525).
  // Cuadro nuevo del tramo sur −1500 · −1470 · −1440 (paso 30 ≥ 2.2·d₀ = 24.2,
  // todos dentro del hueco libre −1535…−1375) y del norte −480 · −450 · −360 ·
  // −260 (−480 sustituye a −540, que caía bajo la ménsula, y deja 76 mm a la
  // pletina de RR1 en vez de los 16 de antes).
  pernosChaponY: [-1500, -1470, -1440, -480, -450, -360, -260, -160],
  pernosChaponZ: -92,            // calc: el chapón vive en Z −114…46 y el alma en
                                 //   −248…−70 → sólo comparten −114…−70; el perno
                                 //   va al medio, a 22 del canto del alma.
  pernoChapon: { d: 10, pasante: 11.0, rosca: 'M10' },
  // LARGO DEL M10 AL CHAPÓN — con SALIDA DE HILO, no a ojo.
  // Lo encontró la revisión de compras y montaje: el M10×45 que había aquí
  // dejaba 0.50 mm de vástago detrás de la tuerca, o sea NI UN PASO de salida.
  // En obra eso es lo mismo que no tener rosca de salida: el último hilo de un
  // tornillo está incompleto por el biselado, así que una tuerca que muere a ras
  // del extremo no se puede apretar al par ni comprobar por inspección.
  //     L ≥ apriete + altura de tuerca + 2 pasos
  // y después se sube al ESCALÓN NORMALIZADO de la serie ISO 888, que es lo
  // único que se puede pedir: no existe un M10×47.4.
  get pernoChaponCalc() {
    const apriete = r3(STEP.frameEsp + this.e);      // 28 (chapón, step) + 8 (alma)
    const tuercaH = 8.4;                             // cat ISO 4032 — tuerca M10, m = 8.4
    const paso = 1.5;                                // cat ISO 261 — M10 rosca gruesa
    const min = r3(apriete + tuercaH + 2 * paso);    // 47.4
    const serie = [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
    const largo = serie.find(v => v >= min);
    const salida = r3(largo - apriete - tuercaH);
    return { apriete, tuercaH, paso, minTeorico: min, largo,
      salidaMm: salida, salidaPasos: r3(salida / paso) };
  },
};

// ---------------------------------------------------------------------------
// 6. LOS SOPORTES DE RODAMIENTO — interfaz con adapt/mod_tambores.mjs
// ---------------------------------------------------------------------------
// UCF 207 = unidad de rodamiento de brida cuadrada de 4 tornillos, eje Ø35
// (web BRG-UCF207). Su cara de montaje es PERPENDICULAR al eje, así que apoya
// contra el alma del alargue y los 4 pernos forman un cuadrado centrado en el eje.
export const UCF207 = {
  desig: 'UCF 207',
  bore: 35,                      // web BRG-UCF207
  J: 92,                         // web BRG-UCF207 — «Bolt Hole to Bolt Hole: 92mm»
  L: 117,                        // web BRG-UCF207 — «Overall Length: 117mm»
  perno: 'M12',                  // web BRG-UCF207
  pasante: 13.5,                 // calc: 12 + 1.5 de holgura (ISO 273 media)
  get semi() { return r3(this.J / 2); },        // 46.0 calc
  pasoEje: r3(35 + 10),          // 45 dis — taladro de paso del eje en el alma
};

// PROPUESTA de los ejes (dis/step). Manda params_tambores.mjs si existe.
const PROPUESTA_EJES = {
  motriz: { y: STEP.motrizY, z: 0.0 },          // step §4.1 (Y) · calc (Z)
  conducido: { y: STEP.conducidaY, z: 0.0 },    // step §4.1 (Y) · calc (Z)
  // Z = 0.0 (calc): la cara de rodadura del dorso está en 51.7 (step) y el radio
  // de contacto medido de las poleas del cliente es 51.7 (step polea63) →
  // eje en 51.7 − 51.7 = 0. Con los 10 mm de engomado que pide el cliente, el
  // núcleo del tambor queda en Ø 83.4 (calc: 2 × (51.7 − 10)).
  radioExt: STEP.polea63.rContacto,             // 51.7 step
  engomado: 10,                                 // dis (petición del cliente)
  get nucleoDia() { return r3(2 * (this.radioExt - this.engomado)); },   // 83.4 calc
};

// Lectura del archivo del agente de tambores, si ya lo publicó.
let TAMB = null;
try {
  if (existsSync(join(aqui, 'params_tambores.mjs'))) {
    TAMB = (await import('./params_tambores.mjs')).TAMBORES ?? null;
  }
} catch (err) {
  console.error(`[pg40] adapt/params_tambores.mjs existe pero no se pudo leer (${err.message}); se usa la PROPUESTA de params_pg40.mjs`);
}

// Rodillos de retorno y su soporte — los publica el módulo de tambores; aquí
// solo se consumen para taladrar las cartelas del alargue (no se duplican).
export const RETORNOS = TAMB?.retorno ?? [];
export const RSOP = TAMB?.retornoSoporte ?? { e: 12, lado: 100, patron: 76, taladro: 11 };

export const EJES_ARBOL = {
  motriz: TAMB?.motriz ?? PROPUESTA_EJES.motriz,
  conducido: TAMB?.conducido ?? PROPUESTA_EJES.conducido,
  fuente: TAMB ? 'adapt/params_tambores.mjs' : 'PROPUESTA de params_pg40.mjs (dis/step)',
};

// ---------------------------------------------------------------------------
// 7. LO QUE ESTE ARCHIVO PUBLICA para el agente de tambores
// ---------------------------------------------------------------------------
export const PUBLICA = {
  // Caras de apoyo del soporte de rodamiento (planos normales a X). Los
  // rodamientos van POR DENTRO: el chapón del cliente (cara interior 499.418,
  // cara exterior 527.418) no deja hueco por fuera en el lado +X.
  caraApoyo: {
    xNeg: ALARGUE.xCabNegInt,                     // 67.494 — cara INTERIOR del cabezal −X
    xNegOutboard: ALARGUE.xCabNegExt,             // 59.494 — cara EXTERIOR del cabezal −X
    xPos: ALARGUE.xInt,                           // 491.418 — cara interior del cabezal +X
    normal: 'X', rodamientos: 'hacia el interior (inboard)',
    nota: 'ASIMÉTRICO respecto de Xc (279.456): −X a 228.57 y +X a 211.962. Lo impone el '
      + 'hueco real de cada lado (peine y canal del cilindro del NBT90 por dentro, chapón '
      + 'del cliente por fuera en +X). Los dos planos están publicados: el tambor sólo '
      + 'necesita estas dos cotas.',
  },
  get luzEntreCaras() { return r3(this.caraApoyo.xPos - this.caraApoyo.xNeg); },   // 423.924
  // Ancho que las 5 bandas exigen a la cara del tambor (calc):
  //   de EJES[0] − 32/2 a EJES[4] + 32/2
  caraTamborMin: r3((EJES[4] + STEP.bandaAncho / 2) - (EJES[0] - STEP.bandaAncho / 2)),  // 336.8
  get holguraPorLado() { return r3((this.luzEntreCaras - this.caraTamborMin) / 2); },    // 43.562
  // ⚠ AVISO AL AGENTE DE TAMBORES: 43.562 mm por lado entre el canto de la banda
  // exterior y la cara de apoyo. Ahí tienen que caber el cuerpo del UCF 207 y
  // el saliente del aro interior del UC207. Si no cabe, el alargue puede
  // desplazarse hacia fuera SOLO en el lado −X (hay 132.3 de holgura al chapón);
  // en +X el tope es el chapón. Dilo por params_tambores.mjs y lo muevo.
  taladros: {
    patron: 'UCF 207 · cuadrado 92 × 92 centrado en el eje',
    dia: UCF207.pasante,
    motriz: { y: EJES_ARBOL.motriz.y, z: EJES_ARBOL.motriz.z, dY: UCF207.semi, dZ: UCF207.semi },
    conducido: { y: EJES_ARBOL.conducido.y, z: EJES_ARBOL.conducido.z, dY: UCF207.semi, dZ: UCF207.semi },
    pasoEje: UCF207.pasoEje,
  },
  ejes: EJES_ARBOL,
  tambor: PROPUESTA_EJES,
  // Cota de rodadura que el tambor tiene que respetar (step): el dorso de la
  // banda corre a Z 51.7 → radio exterior con engomado = 51.7 − eje.z.
  planoDorso: Z.guiaTop,
};

// ---------------------------------------------------------------------------
// 8. CARGA de cálculo (dis) — la que gobierna la flecha del larguero
// ---------------------------------------------------------------------------
export const CARGA = {
  bultoKg: P.cargaMaxKg,         // 34 nbt90 (bulto máximo típico del MRT)
  g: 9.81,
  get N() { return r3(this.bultoKg * this.g); },    // 333.54
  // Criterio (dis, declarado): flecha ≤ L/500 y ≤ 1.0 mm, con el bulto ENTERO
  // sobre UNA sola calle y centrado en el vano mayor. Es la hipótesis pésima:
  // un bulto de 34 kg reparte sobre 3 o 4 calles en la práctica.
  flechaMaxRel: 500,
  flechaMaxAbs: 1.0,
};

export { STEP, NBT, Xc, EJES, T, y0, y1, P, RECORTE_ANCHO };
export default { FLAGS, PERFIL, Z, GUIA, TRAMOS, TRAVESANOS, ALARGUE, UCF207, EJES_ARBOL, PUBLICA, CARGA };
