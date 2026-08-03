// normalizado.mjs — DESIGNACIÓN DE LOS COMPONENTES COMPRADOS.
//
// Regla del encargo: «toda pieza comprada tiene que quedar identificada con su
// norma o su referencia de catálogo, no con una descripción». Antes cada pieza
// llevaba lo que le pusiera su módulo, y `lib.mjs` estampaba cadenas genéricas
// del tipo «ASME B18.2.1 / DIN 933» a TODOS los pernos, fueran de pulgada o
// métricos — o sea, dos normas incompatibles a la vez y ninguna aplicable a la
// pieza concreta. Aquí se designa cada una una sola vez, en un sitio, leyendo su
// nombre; `gen_nbt90.mjs` lo aplica a las 410 piezas después de construirlas y
// ANTES de la compuerta, que exige que no quede ninguna sin designar.
//
// `lib.mjs` no se toca (contrato §2): lo que hace este módulo es sobreescribir
// el campo `norma` de la pieza ya creada, que es un dato del documento, no del
// motor de geometría.
//
// Procedencia: cada designación cita norma (`web`, con su ficha en
// analisis/web_facts.json) o referencia de catálogo del fabricante (`cat`).

import { r2 } from './lib.mjs';

const IN = 25.4;

// --- arandelas planas de pulgada, ASME B18.22.1 tipo A ----------------------
// Ø exterior tabulado de las series estrecha (N) y ancha (W), en mm. Sirve para
// decidir QUÉ serie es la que el modelo dibuja y para denunciar la que no cuadre.
const ARANDELA_IN = {
  '1/4': { N: r2(0.562 * IN), W: r2(0.734 * IN) },
  '5/16': { N: r2(0.688 * IN), W: r2(0.875 * IN) },
  '3/8': { N: r2(0.812 * IN), W: r2(1.0 * IN) },
};

const rosca = (n) => {
  const m = n.match(/\b(1\/4-20|5\/16-18|3\/8-16|7\/16-14|1\/2-13)\b/);
  if (m) return { sistema: 'UNC', desig: m[1], nominal: m[1].split('-')[0] };
  const mm = n.match(/\bM(\d{1,2})(?:\s*×\s*[\d.]+)?\b/);
  if (mm) return { sistema: 'ISO', desig: `M${mm[1]}`, nominal: `M${mm[1]}` };
  return null;
};

/** Designación normalizada de una pieza comprada.
 *  Devuelve `null` si la pieza no es comprada (o si no se sabe designarla: en
 *  ese caso la compuerta lo denuncia, que es justo lo que se quiere). */
export function designar(p) {
  const n = p.name;
  const R = rosca(n);

  // ---------------------------------------------------------------- pernos
  if (/\bPerno hex\b/.test(n)) {
    if (R?.sistema === 'UNC') {
      // Un jack bolt trabaja a compresión entre dos tuercas y necesita rosca
      // hasta la cabeza; los demás son tornillos de cabeza hexagonal normales.
      const ft = /jack bolt/i.test(n);
      return {
        norma: `ASME B18.2.1 — tornillo de cabeza hexagonal ${R.desig} UNC-2A${ft ? ', rosca total (FT)' : ''}`,
        clase: 'SAE J429 grado 5 (carga de prueba 85 ksi)',
        acabado: 'zincado electrolítico ASTM F1941 Fe/Zn 5AN',
        familia: 'perno',
      };
    }
    if (R?.sistema === 'ISO') {
      return {
        norma: `ISO 4017 (DIN 933) — tornillo de cabeza hexagonal ${R.desig}, rosca total`,
        clase: 'clase de resistencia 8.8 (ISO 898-1)',
        acabado: 'zincado electrolítico ISO 4042',
        familia: 'perno',
      };
    }
  }

  // -------------------------------------------------- tornillos de cabeza cilíndrica
  if (/\bSHCS\b|cabeza cil[íi]ndrica/i.test(n) && R?.sistema === 'ISO') {
    return {
      norma: `ISO 4762 (DIN 912) — tornillo de cabeza cilíndrica con hexágono interior ${R.desig}`,
      clase: 'clase de resistencia 12.9 (ISO 898-1)',
      acabado: 'pavonado',
      familia: 'perno',
    };
  }

  // ---------------------------------------------------------------- tuercas
  if (/\bTuerca hex\b/.test(n)) {
    if (/SOLDADA/i.test(n)) {
      // NO existe norma ISO ni ASME de tuerca soldable en pulgadas (la DIN 929 es
      // métrica). Como el encargo pide elegir fabricante y citarlo cuando la pieza
      // no se puede designar de otra forma, se designa por catálogo.
      return {
        norma: `Tuerca hexagonal para SOLDAR POR PROYECCIÓN ${R?.desig ?? '3/8-16'} UNC-2B, `
          + 'piloto corto — sin norma ISO/ASME en pulgadas',
        clase: 'catálogo: Albany County Fasteners 8100-006 «Hex Weld Nuts (6 Projections & Short '
          + 'Pilot), Plain Steel, 3/8"-16» (equivalente métrico normalizado: DIN 929)',
        acabado: 'acero al carbono SIN recubrimiento (un zincado impide la soldadura)',
        familia: 'tuerca',
      };
    }
    if (/autoblocante|CONTRATUERCA|locknut/i.test(n)) {
      return {
        norma: `ASME B18.16.6 — tuerca autoblocante con inserto de nailon ${R?.desig ?? ''} UNC-2B`,
        clase: 'grado A (equivale a SAE J995 grado 5); temperatura máx. 120 °C por el inserto',
        acabado: 'zincado electrolítico ASTM F1941',
        familia: 'tuerca',
      };
    }
    if (R?.sistema === 'UNC') {
      return {
        norma: `ASME B18.2.2 — tuerca hexagonal ${R.desig} UNC-2B`,
        clase: 'SAE J995 grado 5',
        acabado: 'zincado electrolítico ASTM F1941 Fe/Zn 5AN',
        familia: 'tuerca',
      };
    }
    if (R?.sistema === 'ISO') {
      return {
        norma: `ISO 4032 (DIN 934) — tuerca hexagonal ${R.desig}`,
        clase: 'clase 8 (ISO 898-2)', acabado: 'zincado ISO 4042', familia: 'tuerca',
      };
    }
  }

  // -------------------------------------------------------------- arandelas
  if (/\bGolilla\b/.test(n)) {
    // Ø exterior REAL que dibuja el modelo, para poder cotejarlo con la tabla.
    const de = p.features?.find((f) => f.shape === 'cylinder')?.params?.dia;
    if (R?.sistema === 'ISO' || /Ø1[02]\b|M1[02]/.test(n)) {
      const estrecha = de !== undefined && de <= 2.0 * (parseFloat((n.match(/M(\d+)/) || [0, 12])[1]) || 12);
      return {
        norma: estrecha
          ? 'ISO 7092 (DIN 433) — arandela plana, serie estrecha'
          : 'ISO 7089 (DIN 125 A) — arandela plana, serie normal',
        clase: `dureza 200 HV; Ø exterior modelado ${de ?? '—'} mm`,
        acabado: 'zincado ISO 4042', familia: 'arandela',
      };
    }
    const nom = R?.nominal ?? (/Ø6\.35|1\/4/.test(n) ? '1/4' : '3/8');
    const tab = ARANDELA_IN[nom];
    let serie = 'sin tabular', nota = '';
    if (tab && de !== undefined) {
      const dN = Math.abs(de - tab.N), dW = Math.abs(de - tab.W);
      serie = dN <= dW ? `estrecha (N, Ø ext. ${tab.N})` : `ancha (W, Ø ext. ${tab.W})`;
      const err = Math.min(dN, dW);
      if (err > 0.05 * de) nota = ` — AVISO: el modelo dibuja Ø${de}, ${r2(err)} mm fuera de tabla`;
    }
    return {
      norma: `ASME B18.22.1 — arandela plana tipo A, ${nom}", serie ${serie}${nota}`,
      clase: 'acero al carbono', acabado: 'zincado ASTM F1941', familia: 'arandela',
    };
  }

  // ------------------------------------------------------- anillos elásticos
  if (/Anillo retenci[óo]n interior/.test(n)) {
    return {
      norma: 'DIN 472 — anillo de retención interior Ø35 × 1,5 para alojamiento',
      clase: 'acero para muelles C67S, ranura Ø37,0 H12 × 1,6',
      acabado: 'fosfatado',
      familia: 'anillo',
      aviso: 'el alojamiento del modelo es Ø34,925 (1-3/8") y el anillo es de Ø35 nominal: '
        + 'trabaja 0,075 mm más comprimido, dentro de su rango. Se declara.',
    };
  }
  // Anillos EXTERIORES MÉTRICOS (SORTER CO). Se reconocen porque el nombre
  // TERMINA en un Ø ENTERO —«… bulón trasero +X Ø8», «… CONDUCIDO Ø108 (−X) Ø35»—.
  // Lo de ENTERO no es cosmética y es lo único que separa las dos series: la
  // DIN 471 sólo existe para diámetros nominales enteros de milímetro, y un eje
  // de pulgadas expresado en mm nunca lo es. El NBT90 tiene 6 anillos «Anillo
  // retención eje polea (…) Ø15.875» —5/8" en mm— que con un Ø decimal admitido
  // se habrían ido a la DIN 471: se probó, y les cambiaba la designación. Con el
  // Ø entero el NBT90 vuelve a salir byte a byte igual (comprobado regenerándolo).
  // El anillo INTERIOR queda fuera por la rama de arriba, que va antes.
  const ejeAnillo = /Anillo retenci[óo]n/.test(n) && n.match(/Ø(\d+)\s*$/);
  if (ejeAnillo) {
    const d = +ejeAnillo[1];
    if (/3AM1/.test(n)) {
      return {
        norma: `ANSI/ASME B27.7M — anillo de retención exterior MÉTRICO serie 3AM1, `
          + `referencia 3AM1-${d} (eje Ø${d})`,
        clase: 'acero para muelles SAE 1060-1090',
        acabado: 'fosfatado',
        familia: 'anillo',
        aviso: 'CORREGIDO: se designaba «DIN 471 / ASME B27.7», dos normas a la vez y ninguna '
          + 'aplicable. Es MÉTRICO — web_facts RING-001: «ANSI B 27.7 (3AM1) … Metric external '
          + 'Retaining Rings … 3AM1-20 for a 20 mm diameter shaft». «ASME B27.7» a secas es la '
          + 'serie de PULGADAS y DIN 471 es otra norma con otra ranura: hay que pedir UNA.',
      };
    }
    return {
      norma: `DIN 471 — anillo de retención exterior para eje Ø${d}`,
      clase: d === 30 ? 'acero para muelles C67S, s = 1,50; ranura Ø28,6 × 1,6, profundidad 0,7 (web RING-471-01)'
        : d === 35 ? 'acero para muelles C67S, s = 1,50; ranura Ø33,0 h12 × 1,6, profundidad 1,0 (web RING-471-01)'
          : 'acero para muelles C67S',
      acabado: 'fosfatado',
      familia: 'anillo',
      aviso: 'CORREGIDO: se designaba «DIN 471 / ASME B27.7». DIN 471 es MÉTRICA y ASME B27.7 es '
        + 'la serie de PULGADAS: no designan la misma pieza y no pueden ir juntas. Este anillo es '
        + 'métrico y se pide por DIN 471.',
    };
  }
  if (/Anillo retenci[óo]n/.test(n)) {
    // Eje de 5/8": la DIN 471 es MÉTRICA y no tiene esa medida. La serie de
    // pulgadas es la 5100 de ASME B27.7 (Truarc/Rotor Clip).
    return {
      norma: 'ASME B27.7 — anillo de retención exterior serie 5100, referencia 5100-062 (eje 0,625")',
      clase: 'acero SAE 1060-1090, e = 0,035" (0,89 mm)',
      acabado: 'fosfatado',
      familia: 'anillo',
      aviso: 'CORREGIDO: se designaba «DIN 471 / ASME B27.7». DIN 471 es métrica y no cubre 5/8". '
        + 'La ranura que exige el 5100-062 es Ø14,94 −0,05 × 1,07 +0,05; el modelo la dibuja '
        + 'Ø14,7 × 1,3 porque esa geometría la genera `anilloRet` de lib.mjs, que no se puede '
        + 'editar (contrato §2). Discrepancia declarada: 0,24 mm de profundidad.',
    };
  }

  // ---------------------------------------------------------- rodamientos
  if (/\bRodamiento\b/.test(n)) {
    if (/608/.test(n)) {
      return {
        norma: 'ISO 15 / DIN 625-1 — rodamiento rígido de bolas 608-2RS (8 × 22 × 7)',
        clase: 'clase de tolerancia normal (ISO 492 P0); 2RS = dos tapas de goma',
        familia: 'rodamiento',
      };
    }
    if (/R10/.test(n)) {
      return {
        norma: 'ABMA — rodamiento rígido de bolas serie R en pulgadas, R10-2RS (5/8" × 1-3/8" × 5/16")',
        clase: 'ABEC-1 (ABMA Std. 20); 2RS = dos tapas de goma',
        familia: 'rodamiento',
      };
    }
    if (/R8/.test(n)) {
      return {
        norma: 'ABMA — rodamiento rígido de bolas serie R en pulgadas, R8-2RS (1/2" × 1-1/8" × 5/16")',
        clase: 'ABEC-1, la clase que especifica el manual del equipo para este rodillo',
        familia: 'rodamiento',
      };
    }
    // ---- rodamientos MÉTRICOS del SORTER CO --------------------------------
    // Las cotas se leen del propio nombre, que las trae entre paréntesis
    // («… 6207-2RS (CONDUCIDO Ø108, +X) (35×72×17)»); si no las trae, se
    // designa igual pero sin ellas y se dice. Ninguna pieza del NBT90 entra
    // aquí: sus tres rodamientos (608, R10, R8) salen en las ramas de arriba.
    const dims = n.match(/\((\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)\)/);
    const cota = dims ? ` (${dims[1]} × ${dims[2]} × ${dims[3]})` : '';
    const uc = n.match(/\bUC(\d{3})\b/);
    if (uc) {
      // El inserto de una unidad de brida NO se compra suelto: se compra la
      // unidad. Mismo criterio con el que el NBT90 designa los componentes del
      // conjunto B-20760.
      return {
        norma: `Inserto UC${uc[1]} de la unidad de rodamiento de brida — no se suministra suelto: `
          + `se pide la UNIDAD (UCF ${uc[1]}, brida cuadrada de 4 tornillos, JIS B 1558 / ISO 9628)`,
        clase: `aro interior prolongado con 2 prisioneros y obturación, barreno de ${uc[1].slice(1)} mm`
          + `${cota ? `; cotas del modelo${cota}` : ''} (web BRG-UCF207-01)`,
        familia: 'rodamiento',
      };
    }
    const w = n.match(/\bW\s?(6\d{3})-(2Z|2RS|Z|RS)\b/);
    if (w) {
      return {
        norma: `SKF W ${w[1]}-${w[2]} — rodamiento rígido de bolas de ACERO INOXIDABLE `
          + `(prefijo W)${cota}`,
        clase: 'clase de tolerancia normal (ISO 492 P0); 2Z = dos placas de protección '
          + '(web BRG-005)',
        familia: 'rodamiento',
      };
    }
    const met = n.match(/\b(6\d{3})-(2RS|2Z|RS|Z)\b/);
    if (met) {
      return {
        norma: `ISO 15 / DIN 625-1 — rodamiento rígido de bolas ${met[1]}-${met[2]}${cota}`,
        clase: `clase de tolerancia normal (ISO 492 P0); ${met[2].includes('RS') ? '2RS = dos '
          + 'obturaciones de goma' : '2Z = dos placas de protección'}`,
        familia: 'rodamiento',
      };
    }
  }

  // ---- SORTER CO: mecánica que el NBT90 no tiene ---------------------------
  // COLLAR DE APRIETE PARTIDO. La revisión de taller (§A3) lo denunció: los
  // módulos lo designan «DIN 705 A», y DIN 705 forma A es un Stellring MACIZO
  // con prisionero — no existe versión partida en esa norma, y el propio modelo
  // pide justo lo contrario. No hay norma ISO/DIN del collar partido, así que se
  // designa por TIPO y se deja dicho que falta elegir fabricante: el mismo
  // criterio con el que la tuerca de soldar de arriba se designa por catálogo.
  if (/collar de apriete/i.test(n)) {
    // El Ø DEL EJE es el que va detrás de «partido» — así lo nombran los módulos
    // de los tambores («CONDUCIDO Ø108 · collar de apriete partido Ø35»), y por
    // eso NO vale coger el primer Ø del nombre: ése es el del rodillo, y saldría
    // un collar «para eje Ø108» que no existe. Cuando el nombre da en cambio
    // «Ø<ext>×<ancho>» —el collar que aprieta la pila de brazos— eso no es el
    // barreno: se designa por lo que el nombre dice y se pide el barreno aparte,
    // porque inventarlo sería pedir otra pieza.
    const eje = n.match(/partido\s+Ø(\d+(?:[.,]\d+)?)/i);
    const ext = n.match(/Ø(\d+(?:[.,]\d+)?)\s*×\s*(\d+(?:[.,]\d+)?)/);
    const cota = eje ? `para eje Ø${eje[1]}`
      : ext ? `Ø exterior ${ext[1]} × ${ext[2]} de ancho — el BARRENO no aparece en el nombre y `
        + 'hay que declararlo antes de pedirlo'
        : 'sin cotas en el nombre';
    // Si la PIEZA ya trae una referencia de fabricante en su `norma`, esa manda:
    // esta regla existe para que no salga una designación imposible, no para
    // pisar una elección hecha con catálogo delante. La revisión de compras
    // eligió Mädler 62343000 (Ø30×Ø54×15) y 62343500 (Ø35×Ø57×15) con el hecho
    // COLL-SPLIT-01, y esta regla se la estaba borrando, devolviendo la línea a
    // «PENDIENTE fabricante» cuando ya no lo estaba.
    if (/\b[A-Z][A-Za-zä]+\s*\d{4,}|Mädler|Ruland|KTR/.test(p.norma || '')) {
      return { norma: p.norma, clase: p.clase_material || 'acero al carbono, zincado',
        acabado: 'zincado', familia: 'mecanica',
        aviso: 'referencia de fabricante declarada por el módulo: la regla genérica de '
          + '`normalizado.mjs` NO la sustituye (antes sí, y devolvía la línea a «PENDIENTE»).' };
    }
    return {
      // DE DOS MITADES, no de una pieza con corte. Aquí decía «de una pieza, con
      // tornillo de apriete», que es un *single-split*, y ése no sirve en esta
      // máquina: el Ø exterior (54 para el de Ø30) es MAYOR que el barreno Ø30
      // de la chumacera UC 206, así que con las chumaceras montadas un collar de
      // una pieza no se enfila por ningún extremo del eje. La geometría decide
      // el tipo, no la costumbre.
      norma: `Collar de apriete PARTIDO DE DOS MITADES (double-split, 2 tornillos), ${cota} — `
        + 'SIN norma ISO/DIN aplicable: se designa por tipo y hay que citar fabricante',
      clase: 'acero al carbono o inoxidable según fabricante; el par de apriete del tornillo lo '
        + 'fija el catálogo y es el que decide la carga axial que retiene — PENDIENTE de elegir',
      acabado: 'zincado',
      familia: 'mecanica',
      aviso: 'CORREGIDO: se designaba «DIN 705 A». DIN 705 forma A es un Stellring MACIZO con '
        + 'prisionero, no un collar PARTIDO; la norma dice lo contrario que la pieza. Un '
        + 'prisionero sobre eje rectificado marca el eje y agarra menos: por eso el modelo pide '
        + 'partido. Y tiene que ser de DOS MITADES para poder montarlo con las chumaceras '
        + 'puestas (REVISION_TALLER §A3).',
    };
  }
  // CASQUILLO DE FRICCIÓN CON BRIDA del pivote del tensor. adapt/params_tensor2
  // lo declara literalmente «PENDIENTE»; aquí se le da la serie dimensional a la
  // que pertenece —que sí es normalizada— y se conserva el pendiente a la vista.
  if (/Casquillo de fricci[óo]n/i.test(n)) {
    const m2 = n.match(/Ø(\d+(?:\.\d+)?)\/Ø(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)/);
    const [di, de, lg] = m2 ? [m2[1], m2[2], m2[3]] : ['30', '38', '25'];
    return {
      norma: `Casquillo de fricción CON BRIDA d ${di} × D ${de} × L ${lg} — serie dimensional de `
        + `casquillo macizo de aleación de cobre (ISO 4379); el par d/D ${di}/${de} es de tabla`,
      clase: 'material y fabricante PENDIENTES (así lo declara adapt/params_tensor2.mjs): entre '
        + 'bronce macizo y casquillo compuesto con capa de PTFE cambia la presión admisible y el '
        + 'juego de montaje, y el brazo tiene que girar libre',
      familia: 'mecanica',
      aviso: 'la designación identifica la SERIE, no el artículo. Falta elegir material y '
        + 'fabricante y contrastar la presión de contacto que calcula EJE_CALC.presionCasquilloMPa '
        + 'contra el pV admisible del que se elija.',
    };
  }
  // CHAVETA PARALELA del tambor motriz.
  if (/\bchaveta\b/i.test(n) && /DIN\s*6885/i.test(n)) {
    const c = n.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
    return {
      norma: `DIN 6885-1 forma A — chaveta paralela ${c ? `${c[1]} × ${c[2]} × ${c[3]}` : ''} `
        + '(extremos redondeados)',
      clase: 'acero C45+C, dureza 125…245 HB',
      familia: 'mecanica',
      nota: 'el chavetero del eje y el del cubo del reductor tienen que declarar su profundidad '
        + '(t1/t2) y su tolerancia de ancho en el plano: la chaveta sola no basta',
    };
  }
  // TORNILLO AVELLANADO de los topes de guía del bastidor PG40.
  if (/Tope de gu[íi]a\b/i.test(n)) {
    const md = n.match(/\bM(\d{1,2})\b/);
    return {
      norma: `ISO 10642 (DIN 7991) — tornillo de cabeza avellanada con hexágono interior `
        + `M${md ? md[1] : '6'}`,
      clase: 'clase de resistencia 8.8 (ISO 898-1)',
      acabado: 'zincado ISO 4042',
      familia: 'perno',
      nota: 'retención de extremo de la regleta UHMW; agarra en tuerca martillo de ranura 10, '
        + 'que NO está modelada y hay que añadir a la lista de compra con su par máximo',
    };
  }

  // ------------------------------------------------------------ mecánica
  if (/Buje sin chaveta/.test(n)) {
    return {
      norma: 'Buje cónico sin chaveta 20 mm ID × 45 mm OD — Hytrol 099.128420',
      clase: 'fabricante elegido y citado: Fenner Drives Trantorque GT ref. 6202811 '
        + '(d 20, D 45,0, L 22,2, par de apriete 170 N·m, par transmisible 290 N·m, '
        + 'Ø mínimo de cubo 55,7 mm)',
      acabado: 'zincado claro RoHS',
      familia: 'transmision',
      aviso: 'el modelo dibuja 42 mm de largo total (manguito 32 + tuerca 10); el catálogo da '
        + 'L1 = 47,6 mm con la tuerca. Diferencia declarada: −5,6 mm.',
    };
  }
  // «guía» → «retención» desde que la horquilla va atornillada al cassette (EST-03):
  // el paralelismo lo dan las varillas del MGPM y estos pasadores se quedan de tope
  // de sobrerrecorrido. La pieza comprada es la misma; se aceptan los dos nombres.
  if (/Pasador (gu[íi]a|de retenci[óo]n)/.test(n)) {
    return {
      norma: 'ASME B18.3 — tornillo de hombro, hombro Ø1/2" × 25, rosca 3/8-16 UNC · Hytrol 042.512',
      clase: 'acero aleado templado 45 HRC mínimo, hombro rectificado h9',
      acabado: 'pavonado', familia: 'pasador',
    };
  }
  if (/Motorreductor SEW/.test(n)) {
    return {
      norma: 'SEW-EURODRIVE RF07 DRS71S4 — motorreductor de ejes paralelos con brida · Hytrol 300.0322',
      clase: '1/2 hp, 230/460 V 3~, 462 rpm de salida; brida IEC 60072 B14 C120 (Ø120, círculo Ø100, 4 × M8)',
      familia: 'accionamiento',
    };
  }
  if (/Cilindro compacto con gu[íi]as|MGPM80/.test(n)) {
    return {
      norma: 'SMC serie MGP — MGPM80-10Z, cilindro compacto con guías Ø80, carrera 10 mm, '
        + 'casquillo de deslizamiento, con imán',
      clase: 'roscas de montaje M12 × 1,75 (patrones MM 180 × 54 y NN 174 × 52); puertos Rc 3/8 (ISO 7-1)',
      familia: 'neumatica',
    };
  }
  if (/V[áa]lvula 4 v[íi]as/.test(n)) {
    return {
      norma: 'Válvula 5/2 monoestable 24 V CC · Hytrol 094.10795',
      clase: 'equivalente comprable citado: SMC SY5120-5DZ-N7T (2 posiciones monosolenoide, 24 V CC, '
        + 'racor instantáneo 1/4", rosca NPTF, conexión DIN, 0,1 W)',
      familia: 'neumatica',
    };
  }
  if (/Silenciador/.test(n)) {
    return {
      norma: 'Silenciador de bronce sinterizado, rosca 1/8-27 NPT (ASME B1.20.1) · Hytrol 923.0059',
      clase: 'caudal libre ≥ 200 Nl/min', familia: 'neumatica',
    };
  }
  if (/Racor codo giratorio/.test(n)) {
    const cil = /Rc3\/8/.test(n);
    return {
      norma: cil
        ? 'Racor codo giratorio 360°, macho Rc 3/8 (ISO 7-1) — tubo 1/4" OD · Hytrol 094.1406'
        : 'Racor codo giratorio 360°, macho 1/4-18 NPT (ASME B1.20.1) — tubo 1/4" OD · Hytrol 094.1406',
      clase: 'cuerpo de latón niquelado, pinza de acero inoxidable', familia: 'neumatica',
    };
  }
  if (/Tuber[íi]a 1\/4/.test(n)) {
    return {
      norma: 'Tubo de poliuretano 1/4" OD × 0,160" ID (6,35 × 4,06 mm) · Hytrol 094.1148',
      clase: 'PU 95 Sh A, presión de trabajo ≥ 10 bar a 20 °C', familia: 'neumatica',
    };
  }
  if (/Banda plana FLEXPROOF/.test(n)) {
    return {
      norma: 'Banda de transmisión sin fin de 1" de ancho, empalme Flexproof · Hytrol 069.722xx',
      clase: 'poliéster/uretano, 2 telas, e = 2,5 mm; Ø mínimo de polea 1,0"', familia: 'banda',
    };
  }
  // SORTER CO: las 5 bandas planas del accionamiento por tambor. Va DESPUÉS de
  // la FLEXPROOF a propósito, para no tocar la del NBT90. Es pieza COMPRADA
  // (banda sin fin, no se fabrica en el taller) aunque su módulo no la marque.
  if (/Banda plana\s+[\d.]+\s*×/.test(n)) {
    const g = n.match(/Banda plana\s+([\d.]+)\s*×\s*([\d.]+)/);
    const L = n.match(/L\s*=\s*([\d.]+)/);
    return {
      norma: `Banda plana de transmisión SIN FIN, ${g ? g[1] : '—'} mm de ancho`
        + `${L ? `, largo de fibra ${L[1]} mm` : ''} — empalme sin fin (vulcanizado o de dedos)`,
      clase: 'poliéster/uretano, 2 telas; el Ø mínimo de polea que admita tiene que cubrir el '
        + 'rodillo de retorno más pequeño del lazo, y el coeficiente de rozamiento contra el '
        + 'engomado del tambor es el que sostiene el cálculo de arrastre',
      familia: 'banda',
      aviso: `el modelo la dibuja de ${g ? g[2] : '—'} mm de dorso, que es el convenio con el que `
        + 'el CLIENTE modeló su banda T5 dentada, no el espesor de una banda plana real (~2,5 mm, '
        + 'que es lo que mide la del NBT90). La diferencia sube la cara de apoyo y hay que '
        + 'llevarla al plano antes de pedir la banda.',
    };
  }
  if (/Rueda motriz banda plana/.test(n)) {
    return {
      norma: 'Rueda motriz de banda plana Ø2-1/2" × 1,772", barreno Ø45 H8 · Hytrol 024.15502',
      clase: 'llanta abombada 0,4 mm; el barreno recibe el buje sin chaveta', familia: 'transmision',
    };
  }
  if (/Rodillo de retorno B-20760/.test(n)) {
    return {
      norma: 'Rodillo de retorno galvanizado Ø1.9", rodamientos ABEC-1 · Hytrol B-20760 (Specify BR −1-1/4)',
      clase: 'tubo de acero galvanizado 1.9" × 0,065" de pared', familia: 'rodillo',
    };
  }
  // Piezas internas del conjunto B-20760 (tapas-soporte, casquillos y eje): no se
  // compran sueltas, van dentro del conjunto y se designan por él.
  if (p.componente === 'B-20760') {
    return {
      norma: 'Componente del conjunto Hytrol B-20760 «1.9 in. OD Galv Return Roller — ABEC-1» '
        + '(no se suministra suelto)',
      clase: 'eje 1/2" estirado en frío con hilo interior 1/4-20 ED&T; tapas y casquillos mecanizados',
      familia: 'rodillo',
    };
  }
  if (/SA-036881|VULCANIZED/.test(p.conjunto ?? '') || p.componente === 'SA-036881') {
    return {
      norma: 'Conjunto de rodillo vulcanizado Ø1-3/8" · Hytrol SA-036881 «VULCANIZED 138 ROLLER ASSEMBLY»',
      clase: 'tubo de acero 16 GA con cubierta vulcanizada; eje con hilo interior 1/4-20 (end drilled & tapped)',
      familia: 'rodillo',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// CADENAS QUE NO DESIGNAN NADA
// ---------------------------------------------------------------------------
// Las cuatro primeras son las que estampa `lib.mjs` a todo lo que se le parece:
// dos normas incompatibles a la vez —una de pulgadas y otra métrica— y ninguna
// aplicable a la pieza concreta. La quinta es la DIN 705 A del collar partido,
// que designa la pieza CONTRARIA (ver `designar`). Y `PENDIENTE` es lo que un
// módulo escribe cuando sabe que le falta la referencia: es honesto, pero no es
// una designación y no puede pasar por una.
//
// Sirve para dos cosas: para que `normalizar` distinga una designación de
// verdad que ya trae el módulo (un SMC CD85N25-80-B, una SKF UCFL 206) de una
// cadena de relleno, y para que la compuerta del integrador pueda exigir que no
// quede ninguna.
export const GENERICAS = [
  /^\s*ASME B18\.2\.1\s*\/\s*DIN 933\s*$/,
  /^\s*ASME B18\.2\.2\s*\/\s*DIN 934\s*$/,
  /^\s*DIN 471\s*\/\s*ASME B27\.7\s*$/,
  /^\s*DIN 125\s*\/\s*ASME B18\.22\.1\s*$/,
  /^\s*DIN 705 A\s*$/,
  /^\s*PENDIENTE\b/i,
  /^\s*[—-]?\s*$/,
];
/** ¿la `norma` que trae una pieza es de relleno (o no hay)? */
export const esGenerica = (norma) => GENERICAS.some((rx) => rx.test(String(norma ?? '')));

/** Aplica `designar` a todas las piezas compradas del ensamble.
 *  `opts.comprada` permite al integrador corregir la clasificación de una pieza
 *  concreta cuyo módulo la marca mal (el sorter tiene dos casos, documentados
 *  allí); si no se pasa, rige exactamente el mismo criterio de siempre.
 *  Devuelve {designadas, deModulo:[nombres], sinDesignar:[nombres], avisos:[…]}. */
export function normalizar(parts, opts = {}) {
  const esComprada = opts.comprada
    ?? ((p) => !!(p.hardware || p.componente) && !p.fabricada);
  const sinDesignar = [], avisos = [], deModulo = [];
  let designadas = 0;
  for (const p of parts) {
    if (p.contexto) continue;
    if (!esComprada(p)) continue;
    const d = designar(p);
    if (!d) {
      // La pieza puede traer YA una designación específica de su propio módulo
      // —un SMC CD85N25-80-B, una SKF UCFL 206, un tubo PU Ø6×4—: eso ya es una
      // designación normalizada y no se pisa ni se cuenta como fallo. Sólo son
      // «sin designar» las que llegan con una cadena de relleno o sin ninguna.
      if (!esGenerica(p.norma)) { deModulo.push(p.name); designadas++; continue; }
      sinDesignar.push(p.name);
      continue;
    }
    p.norma = d.norma;
    if (d.clase) p.clase_material = d.clase;
    if (d.acabado) p.acabado = d.acabado;
    p.familia_componente = d.familia;
    if (d.aviso) { p.aviso_designacion = d.aviso; avisos.push(`${p.name}: ${d.aviso}`); }
    designadas++;
  }
  return { designadas, deModulo, sinDesignar, avisos };
}

export default { designar, normalizar, esGenerica, GENERICAS };
