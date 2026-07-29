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

/** Aplica `designar` a todas las piezas compradas del ensamble.
 *  Devuelve {designadas, sinDesignar:[nombres], avisos:[…]}. */
export function normalizar(parts) {
  const sinDesignar = [], avisos = [];
  let designadas = 0;
  for (const p of parts) {
    if (p.contexto) continue;
    const comprada = !!(p.hardware || p.componente) && !p.fabricada;
    if (!comprada) continue;
    const d = designar(p);
    if (!d) { sinDesignar.push(p.name); continue; }
    p.norma = d.norma;
    if (d.clase) p.clase_material = d.clase;
    if (d.acabado) p.acabado = d.acabado;
    p.familia_componente = d.familia;
    if (d.aviso) { p.aviso_designacion = d.aviso; avisos.push(`${p.name}: ${d.aviso}`); }
    designadas++;
  }
  return { designadas, sinDesignar, avisos };
}

export default { designar, normalizar };
