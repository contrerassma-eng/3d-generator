// materiales.mjs — DE QUÉ ESTÁ HECHA CADA PIEZA, Y CÓMO SE VE ESO.
//
// Son dos preguntas distintas con UNA sola fuente de verdad:
//
//   1) ¿de qué material se fabrica?   → `materialDe()`, la cadena que va al
//      despiece y al cajetín de los planos. Vivía dentro de planos_nbt90.mjs;
//      se muda aquí SIN CAMBIAR NADA para que planos y visores no puedan
//      divergir (la importan `planos_nbt90.mjs`, `ver.html` y `ver_corte.html`).
//
//   2) ¿cómo se ve ese material?      → `familiaDe()` traduce esa MISMA cadena
//      a una familia PBR. No hay una segunda heurística de nombres para las
//      piezas fabricadas: si `materialDe` dice «chapa galvanizada», la familia
//      es chapa galvanizada. Si `materialDe` cae en su descarte («Acero al
//      carbono»), la familia es el neutro declarado, no un invento.
//
// Las piezas COMPRADAS son el caso aparte, igual que en los planos: allí el
// cajetín cita la norma o el componente de catálogo y NO llama a `materialDe`,
// porque esa función está escrita para piezas fabricadas y sobre un nombre
// compuesto como «Perno hex 3/8-16 · Ménsula jack sup» contestaría «chapa de
// 12 GA» (el perno no es la ménsula). Para ellas se usa la tabla `CATALOGO`,
// que respeta la misma disciplina de orden: primero la pieza que manda en el
// nombre, después las palabras que solo dicen dónde va montada.
//
// Capa de procedencia: `user`. Ni el color ni el acabado son medidos; son la
// lectura razonada del material que ya declara el despiece.

import { P, enPulg } from './params.mjs';

/** Designación de la pieza: el nombre sin la capa (FIJO/MÓVIL) ni el sufijo
 *  entre paréntesis. Es la clave con la que agrupan los planos. */
export const desig = (n) =>
  n.replace(/^(FIJO|MÓVIL)\s·\s/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();

// ---------------------------------------------------------------------------
// MATERIAL DE FABRICACIÓN (texto del despiece) — movido tal cual desde
// planos_nbt90.mjs. Cualquier ajuste aquí cambia planos Y render a la vez.
// ---------------------------------------------------------------------------
export function espesorDe(n, chapa) {
  if (chapa?.t) return chapa.t;                      // lo declara la pieza: manda
  const ga = n.match(/(\d{1,2})\s*GA/i);
  if (ga) return { 7: 4.554, 10: 3.416, 11: 3.038, 12: 2.657, 14: 1.897, 16: 1.519 }[+ga[1]];
  const frac = n.match(/(\d+)\/(\d+)"/);            // 3/16", 1/4"…
  if (frac) {
    const v = (+frac[1] / +frac[2]) * 25.4;
    if (v >= 1.5 && v <= 25) return Math.round(v * 1000) / 1000;
  }
  const mm = n.match(/×(\d{1,2})(?:\s|$|\))/);       // «170×42×12»
  if (mm && +mm[1] >= 3 && +mm[1] <= 25) return +mm[1];
  // «e=8», «e = 12»: es como el sorter CO nombra el espesor de sus pletinas, y
  // sin esta línea un «Brazo tensor e=8» caía al calibre por defecto y salía
  // acotado a 2.657 mm en su propio plano — pletina de 8 pedida como chapa de
  // 12 GA. Va la ÚLTIMA de las lecturas de nombre a propósito: si la pieza
  // declara `chapa.t`, o lleva calibre GA, o fracción en pulgadas, esos mandan.
  // En el NBT90 no cambia nada: sus 6 nombres con «e=» son los vulcanizados, y
  // `materialDe` sale por `/vulcaniz/` antes de mirar el espesor.
  const eN = n.match(/\be\s*=\s*(\d{1,2}(?:\.\d+)?)/i);
  if (eN && +eN[1] >= 0.5 && +eN[1] <= 40) return +eN[1];
  return null;
}

/** El material de una pieza FABRICADA, con la regla de siempre: lo que la pieza
 *  DECLARA manda sobre lo que se lee de su nombre. Es la misma disciplina que
 *  `familiaDe` ya aplicaba a las compradas (§1 de su cuerpo), traída al lado
 *  fabricado, que es donde hacía falta.
 *
 *  Por qué: `materialDe` es un lector de nombres escrito con el vocabulario del
 *  NBT90, y sobre el sorter CO se equivoca en las piezas que ese vocabulario no
 *  conoce — un «Larguero PG40 40×40» es perfil de ALUMINIO extruido y la regla
 *  de `travesaño|soporte|escuadra` lo mandaría a «chapa de acero 12 GA»; un
 *  «Brazo tensor e=8» es pletina de 8 y saldría acotado a 2.657. Un plano que
 *  dice mal el material y el espesor es peor que no tener plano.
 *
 *  Sobre el NBT90 esto NO cambia nada y se ha comprobado: sus 36 piezas
 *  fabricadas declaran `material` CERO veces, así que todas siguen por
 *  `materialDe`. Las de contexto quedan también en el camino de antes a
 *  propósito — 5 de las 10 del NBT90 sí declaran material y no es este el
 *  momento de mover el render de piezas que ni se fabrican ni se compran. */
export const materialDePieza = (part) =>
  (typeof part.material === 'string' && part.material.trim())
    ? part.material.trim()
    : materialDe(desig(part.name), part.chapa);

export function materialDe(n, chapa) {
  const esp = espesorDe(n, chapa);
  // El orden importa: primero lo que define la PIEZA (chapa, tubo, goma) y solo
  // después las palabras que aparecen en nombres compuestos ("ménsula jack bolt"
  // es chapa, no un eje mecanizado).
  if (/regleta|UHMW/i.test(n)) return 'UHMW-PE 1000';
  if (/banda|correa/i.test(n)) return `Banda plana poliéster/uretano ${P.serpEsp} mm (empalme sin fin)`;
  if (/vulcaniz/i.test(n)) return 'Tubo de acero ST37 + vulcanizado NBR 70 ShA';
  if (/\btubo\b/i.test(n)) return 'Tubo de acero ST37';
  if (/guarda|guard|cubierta/i.test(n)) return `Chapa de acero ${enPulg(esp ?? P.cal14)}${esp ? "" : " (14 GA)"}, galvanizada`;
  if (/\bcanal\b|side channel|cross channel|brace channel|tapa extremo/i.test(n)) {
    return `Chapa de acero ${enPulg(esp ?? P.cal12)}${esp ? '' : ' (12 GA)'} conformada, galvanizada`;
  }
  if (/peine|spacer plate|placa|ménsula|mensula|soporte|escuadra|angular|angle|travesaño|plato|brazo/i.test(n)) {
    return `Chapa de acero ${enPulg(esp ?? P.cal12)}${esp ? '' : ' (12 GA)'}, galvanizada`;
  }
  if (/eje hex/i.test(n)) return 'Barra hexagonal 5/16" acero SAE 1045 estirado en frío';
  if (/\beje\b|pasador|espárrago|tirante|vástago/i.test(n)) return 'Acero SAE 1045 rectificado';
  if (/polea|rueda|loca|buje|casquillo/i.test(n)) return 'Aluminio 6061-T6 (o acero mecanizado)';
  if (/tapa|separador/i.test(n)) return 'Acero al carbono mecanizado';
  return 'Acero al carbono';
}

// ---------------------------------------------------------------------------
// FAMILIAS PBR
// ---------------------------------------------------------------------------
// Ocho familias (`familia`) con las variantes de acabado que el ensamble
// necesita de verdad. Los números no son gusto: salen de la reflectancia y del
// acabado superficial reales de cada material.
//
//  · `metalness` es binario en la física: 1 = conductor (el color TIÑE el
//    reflejo especular y no hay difusa), 0 = dieléctrico (reflejo blanco al 4 %
//    y color en la difusa). Valores intermedios solo para capas mixtas.
//  · `roughness` es la anchura del lóbulo especular, y aquí es la rugosidad
//    MEDIA: la textura la modula alrededor de este valor sin cambiar la media.
//    Referencias: cromo pulido ≈0.05-0.10, rectificado ≈0.15-0.25, torneado
//    fino ≈0.30, extrusión de matriz ≈0.40, esmalte ≈0.35, galvanizado con
//    spangle ≈0.55-0.60, caucho vulcanizado ≈0.90.
//  · `color` de un metal es su F0: aluminio ≈0.91-0.96 (casi blanco, frío),
//    acero ≈0.56 (gris neutro), zinc ≈0.66 (gris apagado y frío), latón ≈0.70
//    con fuerte caída en el azul, cromo ≈0.55 pero casi especular puro.
//  · `tex` = { tipo, mm, n } elige el acabado procedural de `estudio.mjs`
//    (`estriado`, `torneado`, `moteado`, `piel`, `grano`), el tamaño físico de
//    la baldosa en mm de pieza y la fuerza del relieve. Salvo `rug: false`, la
//    familia usa también el mapa de rugosidad del acabado.
// ---------------------------------------------------------------------------
export const PRESETS = {
  // -- aluminio -------------------------------------------------------------
  aluminio_extruido: {
    familia: 'aluminio extruido', tipo: 'fisico',
    // Perfil salido de matriz: las estrías de estirado corren a lo largo del
    // perfil, así que el reflejo se alarga en esa dirección (anisotropía). El
    // anodizado natural del cuerpo MGPM80 lo aclara y lo enfría un punto.
    // `anisotropyRotation: 0` apunta al eje mayor de la pieza porque las UV se
    // generan con `u` en esa dirección (ver `uvPorEjeLargo`).
    color: '#c5cace', metalness: 1.0, roughness: 0.42,
    anisotropy: 0.75, anisotropyRotation: 0,
    tex: { tipo: 'estriado', mm: 48, n: 0.18 },
  },
  aluminio_mecanizado: {
    familia: 'aluminio extruido',
    // Torneado/fresado fino (poleas, placa móvil del cilindro, cuerpo de la
    // válvula): la herramienta deja un acabado más cerrado que la extrusión y
    // su marca da la vuelta a la pieza, no la recorre.
    color: '#ccd0d4', metalness: 1.0, roughness: 0.30,
    tex: { tipo: 'torneado', mm: 22, n: 0.14 },
  },
  // -- acero mecanizado -----------------------------------------------------
  acero_mecanizado: {
    familia: 'acero mecanizado',
    // Ejes, pasadores, bujes, tapas torneadas. Acero rectificado: F0 ≈0.56,
    // gris neutro más oscuro que el aluminio, y espejo con microrayado.
    color: '#b4b9c0', metalness: 1.0, roughness: 0.20,
    tex: { tipo: 'torneado', mm: 18, n: 0.10 },
  },
  acero_cromado: {
    familia: 'acero mecanizado',
    // Vástago del émbolo y varillas guía del MGPM80: cromo duro rectificado y
    // pulido para sellar contra la junta. Es lo más espejo del conjunto, así
    // que solo lleva el rastro del rectificado y NO mapa de rugosidad: una
    // superficie de sellado que variase de brillo estaría mal fabricada.
    // 0.11 y no el 0.05 teórico del cromo pulido: con un lóbulo tan estrecho el
    // vástago solo devuelve el trozo de estudio que le toca de frente y, en las
    // vistas donde eso es pared oscura, sale NEGRO. Abrirlo un punto le deja
    // recoger las tiras de luz sin dejar de ser lo más espejo del conjunto.
    color: '#d6d9dd', metalness: 1.0, roughness: 0.11,
    tex: { tipo: 'torneado', mm: 30, n: 0.05, rug: false },
  },
  acero_rodamiento: {
    familia: 'acero mecanizado',
    // 608-2RS / R10-2RS: lo que se ve es el aro exterior de acero 100Cr6
    // rectificado, con el sello NBR ensuciando el conjunto → algo más apagado.
    color: '#9ba1a8', metalness: 1.0, roughness: 0.28,
    tex: { tipo: 'torneado', mm: 9, n: 0.10 },
  },
  acero_muelle: {
    familia: 'acero mecanizado',
    // Anillos de retención DIN 471/472: acero de muelle fosfatado, gris oscuro
    // y mate; no brilla como un eje rectificado.
    color: '#8d9299', metalness: 1.0, roughness: 0.45,
    tex: { tipo: 'grano', mm: 7, n: 0.10 },   // fosfatado mate
  },
  // -- acero cincado / galvanizado ------------------------------------------
  acero_galvanizado: {
    familia: 'acero cincado / galvanizado',
    // Chapa 12/14 GA galvanizada por inmersión: zinc con spangle, metálico pero
    // apagado y ligeramente frío. Es el gris «de taller» de todo el bastidor y
    // la superficie que más metros cuadrados ocupa: si esta no se lee, no se
    // lee nada. El spangle va a TAMAÑO REAL (≈13 mm por cristal).
    color: '#a3a9ae', metalness: 1.0, roughness: 0.56,
    tex: { tipo: 'moteado', mm: 95, n: 0.18 },
  },
  acero_cincado: {
    familia: 'acero cincado / galvanizado',
    // Tornillería cincada con pasivado amarillo (el dorado #d5b46a del modelo
    // no era un código: es el color real del cromatado). Metal apagado y cálido.
    // La baldosa es corta porque las piezas miden 10-20 mm.
    color: '#bfa267', metalness: 1.0, roughness: 0.40,
    tex: { tipo: 'torneado', mm: 6, n: 0.08 },
  },
  acero_negro: {
    familia: 'acero cincado / galvanizado',
    // Tubo ST37 sin acabado: laminado, oscuro y bastante mate.
    color: '#71767c', metalness: 1.0, roughness: 0.62,
    tex: { tipo: 'grano', mm: 16, n: 0.14 },   // cascarilla de laminación
  },
  // -- acero pintado --------------------------------------------------------
  acero_pintado: {
    familia: 'acero pintado', tipo: 'fisico',
    // Esmalte industrial sobre chapa (azul Hytrol). Pintura = dieléctrico: cero
    // metalness, color en la difusa y un barniz encima que da el brillo
    // especular. El color lo pone la PROPIA PIEZA, para no perder el código de
    // capa del modelo, pero pasado por dos correcciones sin las cuales se ve
    // como plástico de juguete (y así se veía):
    //   · `factorColor` — un esmalte devuelve el 10-30 % de la luz, no el 68 %
    //     del azul de pantalla.
    //   · `desat` — ningún pigmento industrial llega a la saturación de un
    //     primario RGB; se mezcla un 22 % hacia el gris de la misma luminancia,
    //     que baja la pureza sin mover el tono (sigue siendo el azul MÓVIL).
    // Y sobre todo: la piel de naranja va al mapa de normales del BARNIZ, no al
    // del sustrato. Eso es lo que rompe el reflejo de las luces del estudio en
    // manchas alargadas sobre la chapa, que es como se reconoce una pieza
    // pintada a un metro de distancia.
    color: null, factorColor: 0.42, desat: 0.22, metalness: 0.0, roughness: 0.36,
    clearcoat: 0.85, clearcoatRoughness: 0.20,
    tex: { tipo: 'piel', mm: 34, n: 0.04, barniz: 0.16 },
  },
  fundicion_pintada: {
    familia: 'acero pintado',
    // Carcasa de fundición del motorreductor SEW: pintura sobre superficie
    // rugosa de molde, mucho más apagada que la chapa esmaltada.
    color: '#525860', metalness: 0.0, roughness: 0.68,
    tex: { tipo: 'grano', mm: 13, n: 0.24 },   // la pintura copia el molde
  },
  // -- uretano / caucho -----------------------------------------------------
  uretano: {
    familia: 'uretano / caucho',
    // Rodillo vulcanizado NBR 70 ShA sobre tubo: negro, sin nada de metalness,
    // muy rugoso. Casi todo lo que se ve de él es difusa oscura; el poco brillo
    // que tiene es el que lo distingue de un plástico mate.
    color: '#1c1d20', metalness: 0.0, roughness: 0.88,
    tex: { tipo: 'grano', mm: 11, n: 0.16 },   // grano del vulcanizado
  },
  caucho: {
    familia: 'uretano / caucho',
    // Banda plana de poliéster/uretano: aún más mate que el rodillo, con la
    // trama del tejido comiéndose el poco especular que queda.
    color: '#17181b', metalness: 0.0, roughness: 0.95,
    tex: { tipo: 'grano', mm: 7, n: 0.18 },   // trama bajo el recubrimiento
  },
  // -- latón / bronce -------------------------------------------------------
  laton_niquelado: {
    familia: 'latón / bronce',
    // Racores neumáticos: latón niquelado. El níquel blanquea el latón pero
    // deja un fondo cálido; acabado pulido de fábrica.
    color: '#c0bdb6', metalness: 1.0, roughness: 0.22,
    tex: { tipo: 'torneado', mm: 8, n: 0.07 },
  },
  laton: {
    familia: 'latón / bronce',
    // Silenciadores de bronce sinterizado y casquillos: latón desnudo, cálido y
    // con la porosidad del sinterizado subiendo la rugosidad.
    color: '#ac8946', metalness: 1.0, roughness: 0.52,
    tex: { tipo: 'grano', mm: 5, n: 0.18 },   // porosidad del sinterizado
  },
  // -- plástico -------------------------------------------------------------
  plastico: {
    familia: 'plástico',
    // Tubería de poliuretano, tapones y bobinas: dieléctrico oscuro con un
    // barniz de extrusión, brillo estrecho y blanco.
    color: '#26292d', metalness: 0.0, roughness: 0.38,
    tex: { tipo: 'estriado', mm: 16, n: 0.07 },   // marca de la hilera
  },
  uhmw: {
    familia: 'plástico',
    // Regleta de desgaste UHMW-PE 1000: blanco lechoso, ceroso, mate. No se
    // simula la translucidez (no hay transmisión en este visor).
    color: '#d9dad4', metalness: 0.0, roughness: 0.58,
    tex: { tipo: 'estriado', mm: 20, n: 0.09 },   // extrusión cerosa
  },
  // -- descarte -------------------------------------------------------------
  neutro: {
    familia: 'neutro (sin clasificar)',
    // Aquí caen las piezas cuyo material `materialDe` tampoco sabe nombrar (su
    // propio descarte, «Acero al carbono»). Se pinta de un gris plano, mate y
    // SIN textura a propósito: si algo se ve así de muerto, es que falta
    // clasificarlo, y el visor lo dice por consola y en la barra de información.
    color: '#8e949a', metalness: 0.0, roughness: 0.80,
  },
};

/** Las ocho familias, en el orden en que se explican arriba. */
export const FAMILIAS = [...new Set(Object.values(PRESETS).map(p => p.familia))];

// ---------------------------------------------------------------------------
// PIEZAS COMPRADAS (hardware / componente de catálogo)
// ---------------------------------------------------------------------------
// El orden importa por la misma razón que en `materialDe`: «Tuerca hex 3/8-16
// autoblocante eje polea» es una tuerca, no un eje; «Golilla Guarda Y150» es una
// golilla, no la guarda; «Eje polea Ø5/8"» es un eje, no una polea; y «Polea
// loca BANDA PLANA» es una polea, no una banda. Por eso la tornillería va
// PRIMERO y el sustantivo de la pieza siempre antes del complemento que dice
// dónde va montada o con qué trabaja.
const CATALOGO = [
  [/golilla|arandela|\bperno\b|tuerca|tornillo|\bSHCS\b|espárrago/i, 'acero_cincado'],
  [/rodamiento|bearing/i, 'acero_rodamiento'],
  [/anillo retenci|circlip|seeger/i, 'acero_muelle'],
  [/silenciador/i, 'laton'],
  [/racor|conexión rápida/i, 'laton_niquelado'],
  [/tuber[íi]a|manguera/i, 'plastico'],
  [/v[áa]lvula/i, 'aluminio_mecanizado'],
  [/v[áa]stago|varilla gu[íi]a/i, 'acero_cromado'],
  [/cilindro compacto|MGPM\S*\s*—\s*cuerpo|cuerpo del cilindro/i, 'aluminio_extruido'],
  [/placa m[óo]vil/i, 'aluminio_mecanizado'],
  [/motorreductor|reductor|\bmotor\b/i, 'fundicion_pintada'],
  [/pasador|\beje\b/i, 'acero_mecanizado'],         // «Eje polea» es un eje…
  [/polea|rueda motriz|\bloca\b/i, 'aluminio_mecanizado'], // …y «Polea … banda plana», una polea
  [/vulcaniz/i, 'uretano'],
  [/banda|correa/i, 'caucho'],
  [/regleta|UHMW/i, 'uhmw'],
  [/buje|casquillo/i, 'acero_mecanizado'],          // materialDe admite «o acero mecanizado»
  [/tapa-soporte|tapa de extremo/i, 'acero_mecanizado'],
];

// TEXTO DE MATERIAL → familia PBR. Es la traducción, no una segunda opinión:
// cada rama de `materialDe` tiene aquí exactamente una entrada.
//
// La misma tabla sirve para el campo `material` que algunas piezas COMPRADAS
// traen escrito en el documento («tubo de acero galvanizado 0.065"», «goma
// vulcanizada sobre el tubo»). Cuando el modelo dice de qué es una pieza, eso
// manda sobre cualquier regla de nombres: por eso los patrones están escritos
// para reconocer tanto la redacción de `materialDe` como la del documento
// (`galvaniz`, no `galvanizada`; `vulcaniz`, no `vulcanizado NBR`).
//
// EL ORDEN IMPORTA: un tubo vulcanizado es goma antes que tubo, y una chapa
// galvanizada es zinc antes que acero.
const POR_MATERIAL = [
  [/UHMW/i, 'uhmw'],
  [/^Banda plana/i, 'caucho'],
  [/vulcaniz/i, 'uretano'],
  [/galvaniz/i, 'acero_galvanizado'],
  [/tubo de acero/i, 'acero_negro'],                // ST37 desnudo, 16 GA desnudo
  [/SAE 1045/i, 'acero_mecanizado'],
  [/Aluminio 6061/i, 'aluminio_mecanizado'],
  [/Acero al carbono mecanizado/i, 'acero_mecanizado'],
  [/^Acero al carbono$/i, 'neutro'],                // el descarte de materialDe
];

/** Color con el que el modelo codifica el bastidor móvil (azul Hytrol). */
export const AZUL_HYTROL = '#2a4fd7';

/**
 * Familia de material de una pieza del documento foto3d-cad.
 * Devuelve { preset, familia, material, fuente } — `fuente` dice quién decidió,
 * para poder auditarlo desde la consola del visor.
 */
export function familiaDe(part) {
  const n = desig(part.name);
  const comprada = !!(part.hardware || part.componente);

  if (comprada) {
    // 1) Si la pieza DECLARA su material en el documento, eso manda: es un dato
    //    del modelo, no una lectura del nombre. (Los planos tampoco llaman a
    //    `materialDe` para las compradas, así que aquí no se pisa a nadie.)
    if (typeof part.material === 'string' && part.material.trim()) {
      for (const [re, preset] of POR_MATERIAL) {
        if (re.test(part.material)) {
          return { preset, familia: PRESETS[preset].familia, fuente: 'material declarado',
            material: part.material };
        }
      }
    }
    // 2) Si no, la tabla de catálogo por nombre.
    for (const [re, preset] of CATALOGO) {
      if (re.test(n)) {
        return { preset, familia: PRESETS[preset].familia, fuente: 'catálogo',
          material: part.norma || part.componente || 'componente de catálogo' };
      }
    }
    // Comprada que ni declara material ni reconoce la tabla: se declara sin
    // clasificar, no se adivina. (Si esto se dispara, hay que añadir la regla,
    // no tapar el hueco.)
    return { preset: 'neutro', familia: PRESETS.neutro.familia, fuente: 'sin clasificar',
      material: part.material || part.norma || part.componente || '—' };
  }

  // Fabricada (y contexto): manda `materialDe`, la misma cadena que el despiece.
  const material = materialDe(n, part.chapa);
  let preset = 'neutro', fuente = 'sin clasificar';
  for (const [re, p] of POR_MATERIAL) if (re.test(material)) { preset = p; fuente = 'materialDe'; break; }

  // Acabado: la chapa del carro de transferencia sale galvanizada del despiece
  // y se PINTA (azul Hytrol). El sustrato lo sigue diciendo `materialDe`; esto
  // solo cambia la piel visible, y solo donde el propio modelo codifica la
  // pieza con el azul del bastidor móvil.
  if (preset === 'acero_galvanizado' && (part.color || '').toLowerCase() === AZUL_HYTROL) {
    preset = 'acero_pintado'; fuente = 'materialDe + acabado pintado';
  }
  return { preset, familia: PRESETS[preset].familia, material, fuente };
}

// ---------------------------------------------------------------------------
// FÁBRICA DE MATERIALES THREE
// ---------------------------------------------------------------------------
/**
 * Devuelve una fábrica que reparte instancias de material COMPARTIDAS (una por
 * preset, y una por color en el caso de la pintura). Compartir importa: con
 * WebGL por software cada variante de material es un programa que compilar.
 *
 *   const mats = crearMateriales(THREE, { tex: crearTexturas(THREE) }, { side });
 *   const esc = mats.detalleDe(part);      // mm por baldosa, o null
 *   if (esc) uvPorEjeLargo(THREE, geom, esc);
 *   mesh.material = mats.para(part);
 *   mats.resumen();   // → { familias, presets, sinClasificar: [...] }
 *
 * `tex` es la fábrica de texturas procedurales de `estudio.mjs`; si no se pasa,
 * los materiales salen lisos (mismos colores y rugosidades, sin microrrelieve).
 * La ESCALA en mm la pide el visor con `detalleDe(part)` y se aplica al generar
 * las UV de esa pieza, no a la textura: así una baldosa mide lo mismo en una
 * ménsula de 50 mm que en un canal de 460.
 */
export function crearMateriales(THREE, { tex = null } = {}, comun = {}) {
  const cache = new Map();
  const cuenta = new Map();
  const sinClasificar = [];

  function instancia(preset, color) {
    const d = PRESETS[preset];
    const clave = `${preset}|${d.color ? '' : color}`;
    if (cache.has(clave)) return cache.get(clave);
    const col = new THREE.Color(d.color || color || '#8899aa');
    // `factorColor` y `desat` solo se aplican cuando el color viene de la pieza.
    // Se opera en espacio LINEAL (que es donde vive un THREE.Color) y sin tocar
    // el tono: la pieza azul sigue siendo azul, solo deja de ser un primario.
    if (!d.color) {
      if (d.desat) {
        const g = col.r * 0.2126 + col.g * 0.7152 + col.b * 0.0722;   // Rec.709
        col.lerp(new THREE.Color(g, g, g), d.desat);
      }
      if (d.factorColor) col.multiplyScalar(d.factorColor);
    }
    const par = { color: col, metalness: d.metalness, roughness: d.roughness, ...comun };
    // MeshPhysicalMaterial solo donde hace falta (barniz de la pintura y
    // anisotropía del extruido): es un shader más caro y aquí no sobra tiempo.
    let m;
    if (d.tipo === 'fisico') {
      m = new THREE.MeshPhysicalMaterial(par);
      if (d.clearcoat) { m.clearcoat = d.clearcoat; m.clearcoatRoughness = d.clearcoatRoughness ?? 0.3; }
      if (d.anisotropy) { m.anisotropy = d.anisotropy; m.anisotropyRotation = d.anisotropyRotation ?? 0; }
    } else {
      m = new THREE.MeshStandardMaterial(par);
    }
    if (tex && d.tex) {
      const t = tex(d.tex.tipo);
      m.normalMap = t.normal;
      m.normalScale = new THREE.Vector2(d.tex.n, d.tex.n);
      if (d.tex.rug !== false) {
        // El mapa MULTIPLICA a `roughness`, y su media es (1 − amp). Se sube la
        // rugosidad nominal por ese factor para que la MEDIA resultante siga
        // siendo la documentada en el preset y solo cambie su dispersión.
        m.roughnessMap = t.rugosidad;
        m.roughness = Math.min(1, d.roughness / (1 - t.amp));
      }
      // La piel de naranja del esmalte va en el BARNIZ: es la capa que refleja.
      if (d.tex.barniz && m.isMeshPhysicalMaterial) {
        m.clearcoatNormalMap = t.normal;
        m.clearcoatNormalScale = new THREE.Vector2(d.tex.barniz, d.tex.barniz);
      }
    }
    m.name = preset;
    cache.set(clave, m);
    return m;
  }

  return {
    /** Material realista de una pieza. */
    para(part) {
      const f = familiaDe(part);
      cuenta.set(f.familia, (cuenta.get(f.familia) || 0) + 1);
      if (f.fuente === 'sin clasificar') sinClasificar.push(desig(part.name));
      const m = instancia(f.preset, part.color);
      m.userData.familia = f.familia;
      return m;
    },
    /**
     * Cómo se proyecta la textura de esta pieza: { mm, eje }, o null si la
     * familia no lleva. `eje` distingue la dirección de EXTRUSIÓN (estrías,
     * laminado) de la de REVOLUCIÓN (marcas de torno), que en una pieza
     * achatada como una polea no son la misma.
     */
    detalleDe(part) {
      if (!tex) return null;
      const d = PRESETS[familiaDe(part).preset].tex;
      if (!d) return null;
      return { mm: d.mm, eje: d.tipo === 'torneado' ? 'revolucion' : 'largo' };
    },
    resumen() {
      return {
        familias: [...cuenta.entries()].sort((a, b) => b[1] - a[1]),
        presets: cache.size,
        sinClasificar: [...new Set(sinClasificar)],
      };
    },
  };
}
