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
import { STEP, NBT, Xc, EJES, T, y0, y1, P } from './params_adapt.mjs';

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
  desactivaPercha: false,
  desactivaPuentes: false,
  desactivaPozo: false,
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
export const TRAVESANOS = [-1520, -1390, -600, -100];
//   −1520: entre la cabecera conducida (−1560.2) y el volante V1 (−1345)
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

export const ALARGUE = {
  material: 'Acero A36 (S275JR)',
  e: 8.0,                        // dis: 8 mm — el UCF 207 lleva M12 y el alma de
                                 //   12 GA (2.657) del side no es asiento de
                                 //   rodamiento; 8 mm da 1.5 Ø de aplastamiento.
  // Plano del alma, simétrico respecto de Xc (calc):
  get xExt() { return CHAPON_INT; },                       // 499.418 (+X)
  get xInt() { return r3(CHAPON_INT - this.e); },          // 491.418 (+X)
  get dXc() { return r3(CHAPON_INT - Xc); },               // 219.962 calc
  get xNegExt() { return r3(Xc - this.dXc); },             // 59.494 (−X)
  get xNegInt() { return r3(this.xNegExt + this.e); },     // 67.494 (−X)
  // Separador alargue ↔ alma del side channel (calc, uno por perno):
  get separador() { return r3(ALMA_INT - CHAPON_INT); },   // 5.951
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
  almaZBot: -248,                // dis: 2.71 sobre el ala inferior del side (−250.71)
  lapZTop: -93,                  // dis: 2.07 bajo el ala superior del side (−90.93)
  lapY: [-1215, -732],           // dis: cubre el side (Y −1202.1…−744.9) con 13 de margen
  transicion: 35,                // dis: longitud de la diagonal de cambio de canto
  cabezalMotrizY: [-125, 90],    // calc — fuera de la ventana Y del deck
  cabezalCondY: [-1697.4, -1535],// calc — ídem, por el otro extremo
  cabezalZ: [-70, 70],           // calc: ±(46 semicuadro UCF + 24 de canto)
  cubrejuntaE: 8,                // dis: mismo espesor, por dentro del alma
  cubrejuntaZ: [-70, -45],       // calc: bajo el plano de transporte en todo caso
  mensulaY: [-1390, -600],       // dis: 2 ménsulas por lado que suben del alma al
  mensulaZ: [-70, -40],          //   travesaño PG40 y amarran el bastidor al canal

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
  pernosChaponY: [-1500, -1400, -1300, -660, -520, -380, -260, -160],
  pernosChaponZ: -92,            // calc: el chapón vive en Z −114…46 y el alma en
                                 //   −248…−70 → sólo comparten −114…−70; el perno
                                 //   va al medio, a 22 del canto del alma.
  pernoChapon: { d: 10, pasante: 11.0, rosca: 'M10' },
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
    xNeg: r3(Xc - (ALARGUE.dXc - ALARGUE.e)),     // 67.494 — cara interior del alargue −X
    xPos: r3(Xc + (ALARGUE.dXc - ALARGUE.e)),     // 491.418 — cara interior del alargue +X
    normal: 'X', rodamientos: 'hacia el interior (inboard)',
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

export { STEP, NBT, Xc, EJES, T, y0, y1, P };
export default { FLAGS, PERFIL, Z, GUIA, TRAMOS, TRAVESANOS, ALARGUE, UCF207, EJES_ARBOL, PUBLICA, CARGA };
