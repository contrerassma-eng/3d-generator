// tolerancias.mjs — ESQUEMA DE TOLERANCIAS, AJUSTES Y ENCAJES del NBT90.
//
// Qué es esto y por qué está aparte de `params.mjs`
// ------------------------------------------------
// `params.mjs` guarda COTAS NOMINALES; aquí vive lo otro que hace falta para
// fabricar: con qué exactitud hay que respetarlas, qué ajuste lleva cada pareja
// que gira o se aprieta, y qué RASGO DE POSICIONAMIENTO (lengüeta, ranura,
// muesca, taladro de pasador) hace que un conjunto soldado se arme solo en vez
// de con un utillaje por conjunto. El contrato prohíbe editar `params.mjs` y
// `lib.mjs`; este archivo es nuevo y no los toca.
//
// Tres bloques:
//   1. TOLERANCIAS GENERALES — la norma y su clase, con las tablas transcritas
//      del propio documento normativo (procedencia `web`, ver
//      analisis/web_facts.json: TOL-2768-1, TOL-2768-2, TOL-13920).
//   2. AJUSTES — las parejas donde el ajuste manda, con su designación ISO 286
//      y el CRITERIO del que sale. El criterio de rodamientos ya existía en el
//      repositorio (transmision.mjs: aro exterior con carga rotante → apretado
//      en el alojamiento) y aquí se respeta y se cita, no se reinventa.
//   3. ENCAJES — la cadena de cotas de la holgura lengüeta↔ranura, y el
//      registro con el que la compuerta de `gen_nbt90.mjs` comprueba que cada
//      lengüeta tiene su ranura, que la holgura sale de la cadena y que ninguna
//      junta queda sobre-restringida.
//
// Unidades: mm. Procedencia de cada número: `web` (norma citada) o `dis`
// (decisión de diseño de este repositorio, siempre justificada).

import { r2 } from './lib.mjs';

// ===========================================================================
// 1. TOLERANCIAS GENERALES
// ===========================================================================
//
// Tres familias de pieza, tres normas. Ninguna es invento: las tres se citan.
//
//   · CHAPA CORTADA Y PLEGADA  → ISO 2768-mK
//     ISO 2768-1 clase m (media) para longitudes y ángulos + ISO 2768-2 clase K
//     para forma y posición. Es la clase que el repositorio ya escribía en el
//     cajetín («tol. gral. ISO 2768-mK», planos_nbt90.mjs); aquí deja de ser un
//     literal en un rótulo y pasa a ser una tabla con la que se puede comparar.
//
//   · PIEZA MECANIZADA (ejes, tapas-soporte, casquillos, llantas de polea)
//                              → ISO 2768-fH
//     Clase f (fina) + H de forma. Son piezas de torno con asientos de
//     rodamiento; su tolerancia general no puede ser la misma que la de una
//     chapa cortada por láser. Las cotas de ajuste NO usan la general: llevan
//     su designación ISO 286 individual (bloque 2).
//
//   · CONJUNTO SOLDADO         → ISO 13920-BF
//     ISO 2768 no aplica a un conjunto soldado: la norma propia es la ISO 13920,
//     que da clases A…D para longitudes/ángulos y E…H para rectitud, planitud y
//     paralelismo. Se elige B (longitudes/ángulos) y F (forma). Por qué B y no A:
//     A pide ±1 mm hasta 400 mm en un bastidor de chapa de 12 GA soldado, que
//     obliga a mecanizar después de soldar. Por qué F y no G: la cota funcional
//     del equipo es la coplanaridad de los seis rodillos, que cuelga de la
//     planitud del ROLLER FRAME WELDMENT; F da 1.5 mm sobre 400…1000 mm y G
//     daría 5.5, más que la emergencia de 6.35 mm que verifica la compuerta.
const T2768_LIN = {                                 // web: ISO 2768-1:1989, tabla 1
  rangos: [[0.5, 3], [3, 6], [6, 30], [30, 120], [120, 400], [400, 1000], [1000, 2000], [2000, 4000]],
  f: [0.05, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, null],
  m: [0.1, 0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 2.0],
  c: [0.2, 0.3, 0.5, 0.8, 1.2, 2.0, 3.0, 4.0],
  v: [null, 0.5, 1.0, 1.5, 2.5, 4.0, 6.0, 8.0],
};
const T2768_FORMA = {                               // web: ISO 2768-2:1989, tabla 1
  rangos: [[0, 10], [10, 30], [30, 100], [100, 300], [300, 1000], [1000, 3000]],
  H: [0.02, 0.05, 0.1, 0.2, 0.3, 0.4],
  K: [0.05, 0.1, 0.2, 0.4, 0.6, 0.8],
  L: [0.1, 0.2, 0.4, 0.8, 1.2, 1.6],
};
const T13920_LIN = {                                // web: ISO 13920:2023, tabla 1
  rangos: [[2, 30], [30, 120], [120, 400], [400, 1000], [1000, 2000], [2000, 4000]],
  A: [1, 1, 1, 2, 3, 4],
  B: [1, 2, 2, 3, 4, 6],
  C: [1, 3, 4, 6, 8, 11],
  D: [1, 4, 7, 9, 12, 16],
};
const T13920_FORMA = {                              // web: ISO 13920:2023, tabla 3
  rangos: [[30, 120], [120, 400], [400, 1000], [1000, 2000], [2000, 4000]],
  E: [0.5, 1, 1.5, 2, 3],
  F: [1, 1.5, 3, 4.5, 6],
  G: [1.5, 3, 5.5, 9, 11],
  H: [2.5, 5, 9, 14, 18],
};

const busca = (tabla, clase, l) => {
  const col = tabla[clase];
  if (!col) throw new Error(`tolerancias: clase «${clase}» desconocida`);
  for (let i = 0; i < tabla.rangos.length; i++) {
    const [a, b] = tabla.rangos[i];
    if (l > a && l <= b) return col[i];
    if (i === 0 && l <= b) return col[i];            // primer rango, cerrado por abajo
  }
  return null;                                        // fuera de tabla: se reporta, no se inventa
};

/** ± de ISO 2768-1 para una cota lineal `l` en la clase `clase` (f|m|c|v). */
export const tol2768 = (l, clase = 'm') => busca(T2768_LIN, clase, Math.abs(l));
/** Tolerancia de rectitud/planitud de ISO 2768-2, clase H|K|L. */
export const tolForma2768 = (l, clase = 'K') => busca(T2768_FORMA, clase, Math.abs(l));
/** ± de ISO 13920 tabla 1 (longitudes de un conjunto SOLDADO), clase A|B|C|D. */
export const tol13920 = (l, clase = 'B') => busca(T13920_LIN, clase, Math.abs(l));
/** Rectitud/planitud/paralelismo de ISO 13920 tabla 3, clase E|F|G|H. */
export const tolForma13920 = (l, clase = 'F') => busca(T13920_FORMA, clase, Math.abs(l));

export const NORMA = {
  chapa: {
    id: 'chapa',
    clase: 'ISO 2768-mK',
    titulo: 'ISO 2768-1 clase m (longitudes y ángulos) + ISO 2768-2 clase K (forma y posición)',
    aplica: 'chapa cortada por láser y plegada, y placas planas',
    ejemplo: (l) => `±${tol2768(l, 'm')} sobre ${l} mm`,
  },
  mecanizado: {
    id: 'mecanizado',
    clase: 'ISO 2768-fH',
    titulo: 'ISO 2768-1 clase f (fina) + ISO 2768-2 clase H',
    aplica: 'piezas de torno y fresa: ejes, tapas-soporte, casquillos, llantas de polea',
    nota: 'las cotas de ajuste NO se rigen por la general: llevan designación ISO 286 propia',
    ejemplo: (l) => `±${tol2768(l, 'f')} sobre ${l} mm`,
  },
  soldadura: {
    id: 'soldadura',
    clase: 'ISO 13920-BF',
    titulo: 'ISO 13920:2023 clase B (longitudes y ángulos) + clase F (rectitud, planitud y paralelismo)',
    aplica: 'conjuntos soldados (weldments) y toda cota tomada entre dos piezas soldadas entre sí',
    ejemplo: (l) => `±${tol13920(l, 'B')} sobre ${l} mm; forma ${tolForma13920(l, 'F')} mm`,
  },

  // ═════ familias añadidas para el SORTER CO (2026-08-03) ═════════════════
  // El NBT90 es chapa, mecanizado y soldadura y con esas tres se agota. El
  // sorter mete TRES MATERIAS PRIMAS MÁS —perfil extruido de aluminio, tubo
  // estructural y engomado vulcanizado— y una cuarta que no es metal, el
  // UHMW. A ninguna de las cuatro le aplica ISO 2768 tal cual: su SECCIÓN la
  // fija el proveedor y lo único nuestro es el corte a medida y el mecanizado
  // posterior. Estampar «ISO 2768-mK» en un perfil extruido sería exigirle al
  // taller una clase que ni puede verificar ni el extrusor cumple.
  //
  // Estas cuatro entradas NO cambian nada del NBT90: se comprobó regenerándolo
  // (ninguno de sus nombres casa con los patrones que las eligen — ver
  // `claseGeneralDe`), y sigue en 284/284 con la misma clase que antes.
  perfilAlu: {
    id: 'perfilAlu',
    clase: 'EN 755-9 + ISO 2768-m (largo de corte)',
    titulo: 'EN 755-9 (perfiles extruidos de aluminio: tolerancias de sección, rectitud y '
      + 'alabeo) para la SECCIÓN + ISO 2768-1 clase m para el LARGO, que es la única cota nuestra',
    aplica: 'perfil PG40 40×40 ranura 10 del bastidor: largueros de calle y travesaños',
    nota: 'la aleación es EN AW-6063 (web ALU-001 / MAT-6063-01); params_pg40.PERFIL declara la '
      + 'aleación pero NO el temple, y T5 y T6 no tienen el mismo Rp0,2 (130 vs 170 MPa): el '
      + 'plano tiene que pedir el temple, no sólo la aleación',
    ejemplo: (l) => `±${tol2768(l, 'm')} sobre ${l} mm de largo; sección y rectitud, EN 755-9`,
  },
  tuboEstructural: {
    id: 'tuboEstructural',
    clase: 'EN 10219-2 + ISO 2768-m (largo de corte)',
    titulo: 'EN 10219-2 (perfiles huecos estructurales conformados en frío: tolerancias de '
      + 'diámetro/lado, espesor y rectitud) + ISO 2768-1 clase m para el largo de corte',
    aplica: 'tubos del tambor motriz, del rodillo conducido y de los rodillos de retorno, y el '
      + 'tubo estructural 40×40×3 del travesaño frontal del tensor',
    nota: 'los tubos redondos comprados por Ø exterior citan además su serie dimensional '
      + '(EN 10220 / ASTM A513, que es lo que declara adapt/params_tambores.mjs). Las cotas que '
      + 'se TORNEAN después —asiento de tapa, Ø engomado— salen de la clase de mecanizado, no '
      + 'de ésta: son dos operaciones y dos tolerancias.',
    ejemplo: (l) => `±${tol2768(l, 'm')} sobre ${l} mm de largo; sección y espesor, EN 10219-2`,
  },
  elastomero: {
    id: 'elastomero',
    clase: 'ISO 3302-1 clase M3',
    titulo: 'ISO 3302-1 (tolerancias dimensionales de productos de caucho vulcanizado), clase M3',
    aplica: 'engomado vulcanizado del tambor motriz',
    nota: 'la cota que MANDA en un tambor engomado no es la del vulcanizado sino el Ø final, que '
      + 'se RECTIFICA después de vulcanizar (lo pide la propia revisión de taller): esa cota va '
      + 'en el plano con tolerancia de mecanizado y con su exigencia de excentricidad, y ésta '
      + 'rige sólo el espesor de aporte antes de rectificar',
    ejemplo: (l) => `ISO 3302-1 M3 sobre ${l} mm de cota vulcanizada, antes de rectificar`,
  },
  plastico: {
    id: 'plastico',
    clase: 'ISO 2768-mK a 20 °C',
    titulo: 'ISO 2768-1 clase m + ISO 2768-2 clase K aplicadas a la cota MECANIZADA y referidas '
      + 'a 20 °C',
    aplica: 'regletas y guías de deslizamiento de UHMW-PE (web UHMW-001)',
    nota: 'dis — la clase sola NO basta en un termoplástico: el UHMW dilata más de un orden de '
      + 'magnitud por encima del acero, así que en una regleta larga el salto térmico se come la '
      + 'tolerancia entera. El plano tiene que dar la temperatura de la cota y el montaje, junta '
      + 'de dilatación en los topes de extremo.',
    ejemplo: (l) => `±${tol2768(l, 'm')} sobre ${l} mm a 20 °C`,
  },
};

/** Clase de tolerancia general que le toca a una pieza, por lo que ES.
 *  El orden importa, igual que en `materialDe` de materiales.mjs: primero lo
 *  que define la pieza, después las palabras que sólo dicen dónde va montada. */
export function claseGeneralDe(nombre, part = {}) {
  if (part.weldment || part.union || /weldment/i.test(nombre)) return NORMA.soldadura;
  // --- MATERIA PRIMA cuya sección la garantiza el proveedor (SORTER CO) ----
  // Va ANTES que mecanizado/chapa a propósito: un larguero PG40 lleva «ranura»
  // y un tubo de tambor lleva «tapa», y con el orden al revés acabarían los dos
  // en una clase de chapa que nadie puede verificar sobre un extruido.
  // Cada patrón está anclado a algo que SÓLO tienen las piezas del sorter:
  //   · «40×40 ranura 10» — la designación literal del perfil PG40 (y no
  //     `\bPG40\b`, que se llevaría por delante el alargue, las cartelas y los
  //     cubrejuntas, que son pletina de acero cortada por láser);
  //   · «tubo … (e=…)» — el tubo declara su pared entre paréntesis. El NBT90
  //     tiene «Tubo de rodillo Ø28.93 × 375», sin pared declarada, y NO casa;
  //   · «engomado» — y no `vulcaniz`, que sí casaría con el «Vulcanizado negro»
  //     del NBT90 y le cambiaría la clase.
  if (/40×40 ranura 10|30×30 Línea 6/i.test(nombre)) return NORMA.perfilAlu;
  if (/\btubo\b[^·]*\(e\s*=/i.test(nombre)
    || /travesaño frontal del tensor \d+×\d+×\d+/i.test(nombre)) return NORMA.tuboEstructural;
  if (/engomad/i.test(nombre)) return NORMA.elastomero;
  if (/UHMW/i.test(nombre)) return NORMA.plastico;
  if (/\beje\b|tapa-soporte|casquillo|separador|polea|rueda motriz|\bloca\b|buje|pasador|v[áa]stago|varilla/i.test(nombre)) {
    return NORMA.mecanizado;
  }
  // Piezas de torno y fresa que el sorter tiene y el NBT90 no: el cubo del
  // brazo tensor (tubo Ø50 con bore H7), los bulones, los collares de apriete,
  // los volantes de la horquilla y las tapas torneadas del tambor. Sin esto se
  // iban todas a la clase de CHAPA, que es la que no lleva un bore H7.
  if (/\bcubo\b|bul[óo]n|\bcollar\b|volante|tapa soldada|\bchumacera\b/i.test(nombre)) {
    return NORMA.mecanizado;
  }
  return NORMA.chapa;
}

// ===========================================================================
// 2. AJUSTES (ISO 286) — donde el ajuste manda
// ===========================================================================
//
// CRITERIO DE RODAMIENTOS — ya estaba en el repositorio (transmision.mjs) y NO
// se cambia; lo que se añade es la fuente y la aplicación al resto del ensamble:
//
//   «el aro que gira RESPECTO A LA DIRECCIÓN DE LA CARGA va apretado; el que
//    está quieto respecto a ella, con juego.»
//
// En este equipo TODOS los rodamientos están montados igual: el eje NO gira
// (los rodillos de transferencia llevan eje con hilo interior apretado contra
// las placas peine; las poleas locas van sobre espárrago fijo; el rodillo de
// retorno, sobre eje atornillado al alma). Gira el tubo o la llanta. O sea:
// **carga rotante sobre el aro exterior** en los tres casos ⇒ alojamiento N7 y
// eje con juego. Fuente: NTN, Technical Data 7.4 «Recommended fits», tabla
// 7.2(1) Housing fits, fila «Outer ring rotating load / Normal to heavy load»
// → N7 (web_facts BRG-FIT-001).
export const AJUSTES = [
  {
    id: 'AJ-01',
    donde: 'Alojamiento del rodamiento 608-2RS en la tapa-soporte del rodillo de transferencia',
    pieza: /Tapa-soporte de extremo/,
    cota: 'Ø22', ajuste: 'N7', pareja: 'aro exterior del 608-2RS (Ø22 h-normal ABMA)',
    criterio: 'carga ROTANTE sobre el aro exterior (gira el tubo del rodillo, el eje está quieto)',
    fuente: 'NTN 7.4 tabla 7.2(1) · designación ISO 286-2',
  },
  {
    id: 'AJ-02',
    donde: 'Cuerpo del eje del rodillo de transferencia bajo el aro interior del 608-2RS',
    pieza: /Eje de rodillo Ø/,
    cota: 'Ø8', ajuste: 'g6',
    pareja: 'aro interior del 608-2RS, barreno Ø8 (0/−0,008, ISO 492 clase Normal)',
    criterio: 'carga ESTACIONARIA sobre el aro interior (el eje no gira) ⇒ ajuste con juego',
    juegoDiametralMm: [-0.003, 0.014],
    // Cerrado. El cuerpo del eje salía de P.rodHex = 5/16" (7,94) contra un barreno
    // Ø8: 0,052…0,069 mm de juego diametral, el de un montaje con casquillo y no el
    // de un ajuste. El eje pasa a Ø8 g6 y el juego se calcula de la cadena ISO 492
    // clase Normal contra ISO 286-2 g6, no de un literal. La compuerta lo vigila en
    // EST-11 (el asiento comparte nominal con el barreno).
    fuente: 'NTN 7.4 fig. 7.1 (loose fit g6/g5) · ISO 286-2 g6 · ISO 492 clase Normal',
  },
  {
    id: 'AJ-03',
    donde: 'Tapa-soporte prensada en el tubo del rodillo de transferencia',
    pieza: /Tapa-soporte de extremo/,
    cota: 'Ø25,93', ajuste: 'H7/r6',
    criterio: 'unión prensada permanente tubo↔tapa (ya declarada en rodillos.mjs)',
    fuente: 'ISO 286-2 · criterio preexistente del repositorio',
  },
  {
    id: 'AJ-04',
    donde: 'Alojamiento de los 2 × R10-2RS en la llanta de la polea loca / de retorno',
    pieza: /Polea loca banda plana|Polea de retorno banda plana/,
    cota: 'Ø34,925 (1-3/8")', ajuste: 'N7',
    criterio: 'carga ROTANTE sobre el aro exterior (gira la llanta, el espárrago está quieto)',
    fuente: 'NTN 7.4 tabla 7.2(1) · criterio preexistente del repositorio (transmision.mjs)',
  },
  {
    id: 'AJ-05',
    donde: 'Espárrago de polea loca bajo los aros interiores de los R10-2RS',
    pieza: /Eje polea Ø5\/8/,
    cota: 'Ø15,875 (5/8")', ajuste: 'g6',
    criterio: 'carga ESTACIONARIA sobre el aro interior ⇒ deslizante',
    fuente: 'criterio preexistente del repositorio (transmision.mjs) · ISO 286-2',
  },
  {
    id: 'AJ-06',
    donde: 'Alojamiento del R8-2RS en la tapa-soporte del rodillo de retorno B-20760',
    pieza: /Tapa-soporte de rodillo de retorno/,
    cota: 'Ø28,575 (1-1/8")', ajuste: 'N7',
    criterio: 'carga ROTANTE sobre el aro exterior (gira el tubo galvanizado; el eje va atornillado '
      + 'al alma del canal anfitrión y no gira). Mismo criterio que AJ-01 y AJ-04.',
    fuente: 'NTN 7.4 tabla 7.2(1)',
  },
  {
    id: 'AJ-07',
    donde: 'Casquillo separador del rodillo de retorno sobre el eje Ø12,70',
    pieza: /Casquillo separador/,
    cota: 'Ø13,0 H11 sobre eje Ø12,70 h9', ajuste: 'H11/h9',
    criterio: 'no gira ni transmite par: sólo separa axialmente ⇒ ajuste libre de montaje',
    fuente: 'ISO 286-2',
  },
  {
    id: 'AJ-08',
    donde: 'Centraje de la brida IEC B14 C120 del motorreductor en la placa soporte',
    pieza: /Placa soporte de transmisi/,
    cota: 'Ø60 H8', ajuste: 'H8/h8',
    criterio: 'resalte de centraje de una brida IEC: tiene que centrar, no apretar. Con H8/h8 el '
      + 'juego máximo es 0,092 mm; el modelo dibuja 0,05 de radio para que el sólido no se solape.',
    fuente: 'ISO 286-2 · IEC 60072 (patrón B14 C120)',
  },
  {
    id: 'AJ-09',
    donde: 'Barreno de la rueda motriz sobre el buje sin chaveta Ø45',
    pieza: /Rueda motriz banda plana/,
    cota: 'Ø45 H8', ajuste: 'H8',
    criterio: 'un buje cónico sin chaveta necesita barreno H8 para expandir uniformemente; con H7 '
      + 'no entra en frío y con H9 el buje se queda sin recorrido de expansión',
    fuente: 'ISO 286-2 · práctica de montaje de bujes cónicos',
  },
  {
    id: 'AJ-10',
    donde: 'Pasador de retención Ø12,70 en la colisa de la placa colgante',
    pieza: /Pasador (gu[íi]a|de retenci[óo]n)/,
    cota: 'Ø12,70 h9 en colisa 16,7 H13', ajuste: 'juego 4,00…4,31 mm',
    criterio: 'el pasador NO guía NADA: ni la carrera (la guían los casquillos del propio cilindro) '
      + 'ni el giro alrededor de Z, desde que la horquilla va ATORNILLADA al cassette y el conjunto '
      + 'móvil es solidario de la placa del MGPM (EST-03). Es sólo tope de sobrerrecorrido, y el '
      + 'juego es GRANDE a propósito: 4 mm = 2 × ISO 13920-B sobre los 390 mm que separan los dos '
      + 'pasadores, que es la precisión con la que se pueden situar dos conjuntos soldados. Con los '
      + '0,2 mm que tenía, o agarrotaba o se desgastaba hasta que sobraba holgura.',
    fuente: 'ISO 286-2 + ISO 13920-B · decisión de diseño declarada en elevacion.mjs (L.guiaHolguraX)',
  },
  {
    id: 'AJ-13',
    donde: 'Colisa del anclaje de la horquilla en la ménsula del cassette',
    pieza: /M[ée]nsula de anclaje de la horquilla/,
    cota: 'colisa 7,0 H13 × 11 (vertical)', ajuste: 'holgura 0,65 mm en X · ±2,0 mm en Z',
    criterio: 'las dos direcciones NO son iguales, y ahí está el ajuste: en X el taladro es CERRADO '
      + '(0,65 mm, el mismo criterio de AJ-11) y sitúa; en Z es colisa, porque quien fija Z es el '
      + 'APOYO PLANO del brazo contra el alma del canal y el perno no puede competir con él. Los '
      + '±2 mm de recorrido son ISO 13920-B sobre los 368,5 mm del canal soldado al que va la '
      + 'ménsula. La unión trabaja por rozamiento bajo la golilla (2 819 N por perno).',
    fuente: 'ISO 286-2 + ISO 13920-B · bastidor.mjs (ménsula) y elevacion.mjs (patrón de taladros)',
  },
  {
    id: 'AJ-11',
    donde: 'Taladro de POSICIÓN del perno de rodillo 1/4-20 en la placa peine',
    pieza: /Placa peine/,
    cota: 'Ø7,0 H12', ajuste: 'holgura 0,65 mm sobre el vástago Ø6,35',
    criterio: 'taladro de POSICIÓN, no de paso: el vástago hace de pasador y toma la carga radial '
      + 'del rodillo. Un taladro de paso normal de 1/4" sería Ø7,95 (holgura 1,6).',
    fuente: 'criterio preexistente del repositorio (bastidor.mjs L.rodPasante)',
  },
  {
    id: 'AJ-12',
    donde: 'Taladro de PASO de la tornillería de 3/8-16 (uniones atornilladas del bastidor)',
    // `pieza: /./` — a propósito: este ajuste no es de UNA pieza, es del taladro,
    // y el taladro aparece en muchas. Pero el nombre no sabe si la pieza lo lleva,
    // así que la condición de verdad la pone `aplica`: que el sólido TENGA de
    // verdad un taladro de esa cota.
    //
    // Sin ella, AJ-12 caía sobre las 36 piezas fabricadas del NBT90 y **11 no
    // tienen ningún Ø11.13** — el canal base en U, los dos notched brace channel,
    // las dos ménsulas de anclaje, el canal de montaje del cilindro, las dos
    // placas colgantes, los dos brazos de empuje y el soporte de válvula. Su
    // lámina declaraba «Ø11,13 H13 · holgura 1,60» de un taladro que no existe,
    // y el taller lo buscaría. Un ajuste declarado de más miente igual que uno
    // declarado de menos.
    pieza: /./,
    aplica: (p) => tieneTaladro(p, 11.13),
    cota: 'Ø11,13 H13', ajuste: 'holgura 1,60 mm sobre el vástago Ø9,525',
    criterio: 'taladro de paso: la unión trabaja por rozamiento bajo la golilla, no por cortadura '
      + 'del vástago. Es la contrapartida de AJ-11 y por eso se declaran juntos.',
    fuente: 'P.holgura.pasante · ASME B18.2.1 (vástago 3/8-16)',
  },
];

/** ¿La pieza tiene un taladro de este diámetro? Mira la geometría emitida, que
 *  es lo único que el taller va a encontrar cuando abra el plano. */
export function tieneTaladro(part, dia, tol = 0.3) {
  return !!part?.features?.some((f) => f.shape === 'hole'
    && Math.abs((f.params?.dia ?? 0) - dia) <= tol);
}

/** Ajustes que le tocan a una pieza.
 *
 *  `part` es opcional por compatibilidad, pero los ajustes que declaran `aplica`
 *  —los que no se pueden decidir por el nombre— sólo se conceden si se pasa la
 *  pieza Y su predicado dice que sí. Llamar sin pieza NO los concede: preferimos
 *  perder un ajuste real y que se note a colocar uno inventado en una lámina. */
export const ajustesDe = (nombre, part = null) => AJUSTES.filter(
  (a) => a.pieza.test(nombre) && (!a.aplica || (part ? a.aplica(part) : false)));

// ===========================================================================
// 3. ENCAJES — cadena de cotas de la holgura lengüeta ↔ ranura
// ===========================================================================
//
// La holgura NO se elige: se calcula. La ranura tiene que tragar la lengüeta en
// el PEOR caso, que es chapa en el extremo grueso de su tolerancia de laminación
// y ranura en el extremo estrecho de su tolerancia de corte:
//
//     ancho de ranura  =  espesor nominal
//                       + tolerancia de laminación de la chapa   (ASTM/AISI)
//                       + tolerancia de corte de la ranura        (ISO 2768-m)
//                       + holgura de montaje                      (dis)
//
// La holgura de montaje de 0,20 mm es decisión de diseño y responde a lo que
// tapa: cascarilla de laminación, rebaba de corte y espesor de pintura o
// galvanizado (un galvanizado por inmersión añade 0,05…0,10 mm por cara).
export const CHAPA = {
  // web: tabla ASTM-AISI de rangos de tolerancia de espesor (web_facts CHAPA-TOL-001).
  // El rango tabulado es máx./mín.; aquí se anota la SEMIAMPLITUD.
  '12GA': { t: 2.657, nominalIn: 0.1046, tolIn: 0.006, tol: 0.152, proceso: 'laminada en frío (CR)' },
  '14GA': { t: 1.897, nominalIn: 0.0747, tolIn: 0.005, tol: 0.127, proceso: 'laminada en frío (CR)' },
  '16GA': { t: 1.519, nominalIn: 0.0598, tolIn: 0.005, tol: 0.127, proceso: 'laminada en frío (CR)' },
  '3/16': { t: 4.763, nominalIn: 0.1875, tolIn: 0.009, tol: 0.229, proceso: 'laminada en caliente (HR)',
    nota: 'el 3/16" (0,1875") no está tabulado; se toma el calibre 6 (0,1943"), el inmediato '
      + 'superior, cuyo rango HR es 0,2033/0,1853 = ±0,009". Se declara la interpolación.' },
  '1/4': { t: 6.35, nominalIn: 0.25, tolIn: 0.010, tol: 0.254, proceso: 'laminada en caliente (HR)',
    nota: 'fuera de la tabla de calibres; se extrapola el escalón (±0,009" en calibre 6 → ±0,010").' },
};

export const HOLGURA_MONTAJE = 0.20;    // dis: cascarilla + rebaba + recubrimiento
export const CORTE_TOL = tol2768(3, 'm'); // 0.1 — ISO 2768-m para una cota de 0,5…3 mm

/** Cadena de cotas de una ranura que recibe una lengüeta de chapa `calibre`.
 *  Devuelve la ranura nominal y la holgura por lado en el mejor y el peor caso. */
export function ranuraPara(calibre) {
  const c = CHAPA[calibre];
  if (!c) throw new Error(`tolerancias: calibre «${calibre}» no tabulado`);
  const ancho = r2(c.t + c.tol + CORTE_TOL + HOLGURA_MONTAJE);
  // peor caso: chapa gruesa (t+tol) contra ranura estrecha (ancho−CORTE_TOL)
  const min = r2(((ancho - CORTE_TOL) - (c.t + c.tol)) / 2);
  const max = r2(((ancho + CORTE_TOL) - (c.t - c.tol)) / 2);
  return {
    calibre, espesor: c.t, ancho, holguraPorLado: [min, max],
    cadena: `${c.t} (nominal) + ${c.tol} (laminación ${c.proceso}, ASTM/AISI ±${c.tolIn}") `
      + `+ ${CORTE_TOL} (corte, ISO 2768-m) + ${HOLGURA_MONTAJE} (montaje: cascarilla, rebaba y `
      + `recubrimiento) = ${ancho}`,
  };
}

/** Largo de la ranura en la dirección LARGA (la del ancho de la lengüeta).
 *  `rol`:
 *    'posicion' — la ranura también sitúa en esta dirección: holgura mínima.
 *    'paso'     — la ranura NO sitúa: 1 mm por lado, para que no compita con la
 *                 de posición y no sobre-restrinja la junta. */
export function largoRanura(anchoLengueta, rol) {
  const tc = tol2768(anchoLengueta, 'm');            // corte de la lengüeta y de la ranura
  if (rol === 'posicion') {
    const largo = r2(anchoLengueta + 2 * tc + 2 * HOLGURA_MONTAJE);
    return {
      largo,
      holguraPorLado: [r2(((largo - tc) - (anchoLengueta + tc)) / 2),
        r2(((largo + tc) - (anchoLengueta - tc)) / 2)],
      cadena: `${anchoLengueta} + 2×${tc} (corte de lengüeta y ranura, ISO 2768-m) `
        + `+ 2×${HOLGURA_MONTAJE} (montaje) = ${largo}`,
    };
  }
  const largo = r2(anchoLengueta + 2.0);
  return {
    largo,
    holguraPorLado: [r2((largo - 2 * tc - anchoLengueta) / 2), r2((largo + 2 * tc - anchoLengueta) / 2)],
    cadena: `${anchoLengueta} + 2×1,0 (ranura DE PASO: no sitúa, deja libre esta dirección) = ${largo}`,
  };
}

/** Registro de un ENCAJE. Lo llevan LAS DOS piezas de la junta (la de la
 *  lengüeta con `lado:'lengueta'` y la de la ranura con `lado:'ranura'`), con el
 *  mismo `id`; la compuerta los empareja y comprueba que declaran lo mismo.
 *
 *  `gdl` es la lista de grados de libertad que ESE rasgo fija. Es lo que impide
 *  sobre-restringir: la compuerta exige que en una junta ningún grado de
 *  libertad esté fijado por dos rasgos de posición a la vez. */
export function encaje({ id, union, tipo, rol, lado, gdl, lengueta, ranura, nota }) {
  return { id, union, tipo, rol, lado, gdl, lengueta, ranura, nota };
}

// ---------------------------------------------------------------------------
// CORDÓN DE SOLDADURA — cierra el hallazgo EST-08 de la revisión estructural
// («ningún conjunto soldado declara garganta, proceso ni norma; un plano sin
// cordón no es fabricable»). El encaje sitúa la pieza; el cordón la une, y las
// dos cosas van juntas o el plano sigue sin poderse fabricar.
//
// Espesor de garganta: en chapa el cateto del filete lo limita la chapa MÁS
// FINA de la junta, así que z = t y la garganta a = 0,7·z. No hay que buscar más
// resistencia: la propia revisión estructural calcula 0,02 mm de garganta
// necesaria frente a los 2,66 disponibles en 12 GA, y por eso el cordón puede
// ser DISCONTINUO (decisión de diseño declarada: menos aporte, menos alabeo, y
// el alabeo es justo lo que se come la clase F de ISO 13920).
const espesorLocal = (nombre, part) => {
  // El cateto lo limita la chapa MÁS FINA de la junta, y ésa no siempre es la de la
  // propia pieza: una ménsula de 3/16" soldada al ala de un canal de 12 GA se suelda
  // con el cateto del 12 GA, no con el suyo. Cuando las dos chapas no son iguales, la
  // pieza lo declara y manda ese valor. (Si no lo declara se sigue usando el suyo,
  // que es lo correcto en todas las juntas de igual espesor de este ensamble.)
  if (part?.soldaduraEspesorMin) return part.soldaduraEspesorMin;
  if (part?.chapa?.t) return part.chapa.t;
  const ga = nombre.match(/(\d{1,2})\s*GA/i);
  if (ga) return { 7: 4.554, 10: 3.416, 11: 3.038, 12: 2.657, 14: 1.897, 16: 1.519 }[+ga[1]] ?? null;
  const fr = nombre.match(/(\d+)\/(\d+)"/);
  if (fr) { const v = r2((+fr[1] / +fr[2]) * 25.4); if (v >= 1.5 && v <= 25) return v; }
  // SORTER CO: sus piezas no van en calibre ni en pulgadas, declaran el espesor
  // en el nombre — «Brazo tensor e=8», «tapa soldada … e=12». Se lee AL FINAL, a
  // propósito: así ninguna pieza del NBT90 cambia de rama (la única suya con
  // «e=» es el «Vulcanizado negro e=3», que no es una junta soldada y por tanto
  // nunca llega hasta aquí). Sólo se acepta el rango de espesores soldables a
  // filete de este equipo; fuera de él se devuelve null y la compuerta lo canta.
  const ee = nombre.match(/\be\s*=\s*(\d+(?:\.\d+)?)/i);
  if (ee) { const v = +ee[1]; if (v >= 1 && v <= 25) return v; }
  return null;
};

export function cordonDe(part) {
  const n = part.name || '';
  if (/SOLDADA/.test(n)) {
    return {
      tipo: 'soldadura por resistencia, por PROYECCIÓN (la tuerca trae sus proyecciones)',
      proceso: 'RPW — puesta en taller junto con la propia cartela, no en el montaje',
      norma: 'AWS C1.1M/C1.1 — Recommended Practices for Resistance Welding',
      nota: 'la tuerca va sin recubrimiento: un zincado impide la soldadura',
    };
  }
  const t = espesorLocal(n, part);
  if (t === null) return null;
  const z = r2(t);                       // cateto = espesor de la chapa más fina
  const a = r2(0.7 * z);                 // garganta del filete
  return {
    tipo: 'cordón en ángulo (filete)',
    lado: z, garganta: a,
    disposicion: 'DISCONTINUO 25/50 (25 mm de cordón cada 50), mínimo dos tramos por junta y '
      + 'siempre uno en cada extremo del encaje',
    proceso: 'GMAW en corto circuito, hilo ER70S-6 Ø0,9 mm, Ar-CO₂ 82/18',
    norma: t <= 4.8
      ? 'AWS D1.3/D1.3M — Structural Welding Code, Sheet Steel (e ≤ 4,8 mm); símbolo según ISO 2553'
      : 'AWS D1.1/D1.1M — Structural Welding Code, Steel; símbolo según ISO 2553',
    nota: 'la garganta la fija el espesor, no la carga: la revisión estructural (EST-08) calcula '
      + '0,02 mm de garganta necesaria. Por eso el cordón es discontinuo — menos aporte y menos '
      + 'alabeo, que es lo que se come la clase F de ISO 13920.',
  };
}

/** Junta soldada SIN encaje: hay que decir cómo se posiciona. La compuerta
 *  exige que toda pieza con `union`/`weldment` declare encajes o esto. */
export function juntaATope({ id, union, motivo, posicionamiento, referencia }) {
  return { id, union, tipo: 'tope', rol: 'tope', lado: 'ambos', gdl: [], motivo, posicionamiento, referencia };
}

export default { NORMA, AJUSTES, CHAPA, ranuraPara, largoRanura, tol2768, tol13920 };
