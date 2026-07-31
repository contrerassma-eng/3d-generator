// mod_estaciones.mjs — DETALLE FABRICABLE DE LAS ESTACIONES del sorter CO
// adaptado (encargo §8). Cuatro de los seis puntos viven aquí; las guardas del
// pozo y las guías del corredor van en mod_guardas.mjs.
//
//   1. Anclaje superior del cilindro C85 del tensor + racordaje (por calle):
//      bisagra C85C25 del cliente (pose medida, replicada a las 5 calles),
//      ménsula hembra nueva a la cabecera FRONT TOP2, bulón Ø8, racor KQ2L06.
//   2. Retención axial de V1…V4 del pozo (por calle): eje Ø20×50 (patrón
//      SCMRT906VCT del cliente), 2×W 6004-2Z, anillos 3AM1-20, espaciador,
//      alojamientos Ø42 N7 + DIN 472-42. Reemplaza los ejes/poleas esbozados
//      que mod_calles traía con nota `dis`.
//   3. Polea loca interior del IDLER-ENS: MEDIDA (analisis/estaciones.json) y
//      modelada fiel en su posición interior, capa step, con su defecto
//      declarado (coaxial con la conducida_63T).
//   4. Accionamiento común: eje motriz común Ø30/Ø25 con bujes a las 5 63T,
//      UCFL 205 al chapón de descarga, acople LK30-R del cliente conservado,
//      pareja AT10+LK30-RD recolocada sin superposición, y el eje pivote Ø25
//      único con su segunda UCFL 205 (cierre del defecto §5.3).
//   5a. Tornillería fina de extremos de estación (CT-ENS y drive kit al perfil).
//
// Cotas y procedencias: params_estaciones.mjs. Capas: FIJO = nuevo o reubicado
// funcional; CTX (contexto) = pieza del cliente en pose medida.

import {
  box, cyl, hole, revolve, COL, r2, pernoHex, tuercaHex, golilla, rodamiento,
} from '../../nbt90/lib.mjs';
import { STEP, EJES, POZO, TENSOR, bordeExtDescarga } from './params_adapt.mjs';
import { CLEVIS, RETEN, IDLER, EJEC, PIVOTE, EXTREMOS } from './params_estaciones.mjs';

// ---------------------------------------------------------------------------
/** Paquete de giro sobre eje Ø20 (punto 2): eje (con taladros de testa) +
 *  2 W6004 (aros a ±17.5) + espaciador (11) + 2 anillos 3AM1-20 pegados a los
 *  aros (ranura a ±18.25) + tornillos de testa M10×1.5 con golilla ancha. */
function paqueteEjeV(E, c, nom, B, y, z, cuenta) {
  const L = RETEN.eje.largo, R = RETEN.eje;
  const x0 = r2(B - L / 2);
  const caraExt = /V[14]/.test(nom) ? 24.96 : 25.28;   // cara exterior de la pletina
  // eje Ø20×50 con ranuras Ø18 (perfil del SCMRT906VCT-150-111 del cliente)
  const f = [cyl(`Eje Ø20×${L}`, [x0, y, z], [1, 0, 0], R.d, L)];
  for (const s of [-1, 1]) {
    f.push(cyl(`Ranura anillo Ø${R.ranura.d}×${R.ranura.ancho}`,
      [r2(B + s * R.ranura.pos - R.ranura.ancho / 2), y, z], [1, 0, 0],
      R.ranura.d + 4, R.ranura.ancho, 'cut'));
    f.push(cyl(`Fondo ranura Ø${R.ranura.d}`,
      [r2(B + s * R.ranura.pos - R.ranura.ancho / 2), y, z], [1, 0, 0],
      R.ranura.d, R.ranura.ancho, 'union'));
    f.push(hole(`Taladro rosca M10×1.5 (testa ${s < 0 ? '−X' : '+X'})`,
      [r2(B + s * 26), y, z], [s < 0 ? 1 : -1, 0, 0], 10, 21.1, false));
  }
  E.addPart(`FIJO · Eje Ø20×${L} de pozo (${nom}) (${c})`, COL.acero, [x0, y, z], f, {
    fabricada: true,
    nota: `patrón del eje del carro tensor del cliente (SCMRT906VCT-150-111, step): Ø20 g6 bajo los aros `
      + `interiores (carga estacionaria — criterio NTN del repo, BRG-FIT-001), roscas de testa M10×1.5×16, `
      + `ranuras Ø18×${R.ranura.ancho} a ±${R.ranura.pos} para anillos 3AM1-20 (el STEP las modela de 1.0: discrepancia declarada)`,
  });
  cuenta('eje Ø20×50 de pozo (fabricado)', 1);
  // 2 rodamientos W 6004-2Z (aros a ±17.5) + arandelas + anillos + tornillería
  for (const s of [-1, 1]) {
    const xr = s < 0 ? r2(B - 17.5) : r2(B + 17.5 - RETEN.rodamiento.w);
    rodamiento(E, {
      nombre: `SKF W 6004-2Z (${nom}, ${s < 0 ? '−X' : '+X'}) (${c})`,
      at: [xr, y, z], dir: [1, 0, 0],
      bore: RETEN.rodamiento.b, od: RETEN.rodamiento.D, w: RETEN.rodamiento.w, capa: 'FIJO · ',
    });
    cuenta('rodamiento SKF W 6004-2Z (web BRG-005)', 1);
    const xa = r2(B + s * RETEN.eje.ranura.pos - 0.55);
    E.addPart(`FIJO · Anillo 3AM1-20 (${nom}, ${s < 0 ? '−X' : '+X'}) (${c})`, COL.inox,
      [xa, y, z],
      [cyl(`Anillo Ø25.2×1.1`, [xa, y, z], [1, 0, 0], 25.2, 1.1),
        hole(`Ø18.2`, [r2(xa - 1), y, z], [1, 0, 0], 18.2)],
      { hardware: true, norma: 'ANSI/ASME B27.7M — anillo de retención exterior 3AM1-20 (eje 20 mm) · web RING-001' });
    cuenta('anillo 3AM1-20 (web RING-001)', 1);
    // tornillo de testa a la rosca M10×1.5 del eje, con golilla ANCHA (el
    // taladro de la pletina es Ø20.2: la golilla Ø30 puentea) — patrón cliente
    pernoHex(E, {
      nombre: `M10×1.5×20 testa de eje (${nom}, ${s < 0 ? '−X' : '+X'}) (${c})`,
      at: [r2(B + s * (caraExt + 2)), y, z], dir: [s > 0 ? -1 : 1, 0, 0],
      dia: 10, largo: 20, af: 17, altoCab: 6.4, capa: 'FIJO · ',
    });
    golilla(E, { nombre: `M10 ancha testa (${nom}, ${s < 0 ? '−' : '+'}X) (${c})`, at: [r2(B + s * caraExt + (s < 0 ? -2 : 0)), y, z], dir: [1, 0, 0], dia: 10.5, ext: 30, esp: 2, capa: 'FIJO · ' });
  }
  E.addPart(`FIJO · Espaciador de aros Ø25×11 (${nom}) (${c})`, COL.acero,
    [r2(B - 5.5), y, z],
    [cyl(`Tubo Ø25×11`, [r2(B - 5.5), y, z], [1, 0, 0], RETEN.espaciador.dExt, RETEN.espaciador.largo),
      hole(`Ø20.4`, [r2(B - 6.5), y, z], [1, 0, 0], RETEN.espaciador.dInt)],
    { fabricada: true, nota: 'entre los aros interiores: cierra la cadena axial anillo→arandela→aro→espaciador→aro→arandela→anillo' });
  cuenta('espaciador de aros Ø25×11', 1);
}

/** Polea de pozo con alojamientos de rodamiento (bore Ø38 + Ø42 N7 + DIN 472). */
function poleaPozo(E, nombre, nomV, c, B, y, z, cara, pest, pestE, color, extra, cuenta) {
  const w = 40;
  const at = [r2(B - w / 2), y, z];
  const f = [cyl(`Cara Ø${cara}×${pestE > 0 ? 34 : w}`, pestE > 0 ? [r2(B - 17), y, z] : at, [1, 0, 0], cara, pestE > 0 ? 34 : w)];
  if (pestE > 0 && pest > cara) {
    f.push(cyl(`Pestaña Ø${pest}`, at, [1, 0, 0], pest, pestE));
    f.push(cyl(`Pestaña Ø${pest}`, [r2(B + w / 2 - pestE), y, z], [1, 0, 0], pest, pestE));
  }
  f.push(hole(`Bore Ø${RETEN.alojamiento.hombroCentral}`, [r2(B - w / 2 - 1), y, z], [1, 0, 0], RETEN.alojamiento.hombroCentral));
  for (const s of [-1, 1]) {
    const xal = s < 0 ? r2(B - w / 2 - 1) : r2(B + w / 2 - RETEN.alojamiento.prof);
    f.push(hole(`Alojamiento Ø42 N7 ×${RETEN.alojamiento.prof}`, [xal, y, z], [1, 0, 0],
      RETEN.alojamiento.d, RETEN.alojamiento.prof + 1, false));
    f.push(cyl(`Ranura DIN 472 Ø44.5×1.85`, [r2(B + s * 18.55 - 0.93), y, z], [1, 0, 0],
      RETEN.alojamiento.din472.ranuraD, RETEN.alojamiento.din472.ranuraW, 'cut'));
  }
  const p = E.addPart(nombre, color, at, f, extra);
  // 2 anillos DIN 472-42 (retención de los aros exteriores, tras el aro a ±17.5)
  for (const s of [-1, 1]) {
    const xa = r2(B + s * 18.55 - 0.875);
    E.addPart(`FIJO · Anillo DIN 472-42 (${nomV}) (${s < 0 ? '−X' : '+X'}) (${c})`, COL.inox,
      [xa, y, z],
      [cyl(`Anillo Ø44.4×1.75`, [xa, y, z], [1, 0, 0], 44.4, 1.75),
        hole(`Ø39`, [r2(xa - 1), y, z], [1, 0, 0], 39)],
      { hardware: true, norma: 'DIN 472 — anillo de retención interior Ø42×1.75, ranura Ø44.5 H12 × 1.85 H13 · web RING-003' });
    cuenta('anillo DIN 472-42 (web RING-003)', 1);
  }
  return p;
}

// ---------------------------------------------------------------------------
export function estaciones(E) {
  const M = { piezas0: E.parts.length, reuso: {}, nuevas: {}, retirados: EJEC.retirados };
  const cuentaN = (k, n = 1) => { M.nuevas[k] = (M.nuevas[k] || 0) + n; };
  const cuentaR = (k, n = 1) => { M.reuso[k] = (M.reuso[k] || 0) + n; };

  // =========================================================================
  // 4. ACCIONAMIENTO COMÚN (una vez, no por calle)
  // =========================================================================
  {
    const L = r2(EJEC.x1 - EJEC.x0);
    const f = [
      cyl(`Cuerpo Ø30×${r2(EJEC.munonUcfl.x[0] - EJEC.x0)}`, [EJEC.x0, 0, 0], [1, 0, 0], EJEC.d, r2(EJEC.munonUcfl.x[0] - EJEC.x0)),
      cyl(`Muñón Ø25 k6 ×${r2(EJEC.x1 - EJEC.munonUcfl.x[0])} (UCFL)`, [EJEC.munonUcfl.x[0], 0, 0], [1, 0, 0], EJEC.munonUcfl.d, r2(EJEC.x1 - EJEC.munonUcfl.x[0])),
    ];
    for (const B of EJES) {
      f.push(box(`Chavetero DIN 6885 8×32×4 (calle X=${B})`, [B, 0, r2(EJEC.d / 2 - 4)], 32, 8, 5, 'cut'));
    }
    E.addPart(`FIJO · Eje motriz común Ø30/Ø25 ×${L} (X ${EJEC.x0}…${EJEC.x1})`, COL.acero,
      [EJEC.x0, 0, 0], f, {
        fabricada: true,
        nota: `sustituye los 4 árboles SH-04 (93.22 > paso 76.2, step: los vecinos solaparían 17.0) y sus `
          + `soportes 2T (89.22 > 76.2). Entra 30 mm en el asiento Ø30.063 del acople LK30-R del cliente `
          + `(pose medida, mismo pasamuros del chapón −X); muñón Ø25 k6 en la UCFL 205 (+X). `
          + `Chaveteros DIN 6885 A bajo los 5 bujes. Apoyos: acople rígido al motorreductor (−X, como el `
          + `esquema original del cliente con autoalineantes) + UCFL 205 de rótula (+X). Flecha y torsión: en la compuerta.`,
      });
    cuentaN('eje motriz común Ø30/Ø25 (fabricado)', 1);

    // acople del cliente LK30-C65-20H7-D30-R en pose medida (CTX)
    E.addPart('CTX · Acople LK30-C65-20H7-D30-R Ø65×99.5 (motor↔eje común, pose original)', COL.acero,
      [-112.42, 0, 0],
      [cyl('Manguito Ø65×99.5', [-112.42, 0, 0], [1, 0, 0], 65, 99.5),
        hole('Ø30.06 (lado eje común)', [-45, 0, 0], [1, 0, 0], 30.06),
        hole('Ø20 (lado motor)', [-113.5, 0, 0], [1, 0, 0], 20, 35, false)],
      { contexto: true, capaInfo: 'step (inventario/medidas: X −112.42…−12.92, asientos Ø30.063 y Ø20.000)',
        nota: 'acople de apriete del cliente conservado: une el eje Ø20 del motorreductor principal con el eje común nuevo por el pasamuros existente del chapón −X' });
    cuentaR('acople LK30-C65-20H7-D30-R del cliente', 1);

    // bujes Ø38/Ø30 de las 5 motrices 63T + chavetas
    for (const B of EJES) {
      E.addPart(`FIJO · Buje 63T Ø38 g6/Ø30 H7 ×40 con valona (calle X=${B})`, COL.acero,
        [r2(B - 20), 0, 0],
        [cyl('Buje Ø38×40', [r2(B - 20), 0, 0], [1, 0, 0], EJEC.buje.dExt, EJEC.buje.largo),
          cyl(`Valona Ø48×4`, [r2(B - 24), 0, 0], [1, 0, 0], EJEC.buje.valona.d, EJEC.buje.valona.t),
          hole('Ø30 H7', [r2(B - 26), 0, 0], [1, 0, 0], EJEC.buje.dInt),
          box('Chavetero 8×32×3.3', [B, 0, r2(EJEC.d / 2 - 0.2)], 32, 8.2, 3.5, 'cut')],
        { fabricada: true,
          nota: 'entra al bore liso Ø38.000 de la 63T reutilizada (step §4.5); par por chaveta DIN 6885 A 8×7×32; '
            + 'retención axial: prisionero ISO 4029 M8×10 sobre la chaveta + 2 prisioneros ISO 4029 M6×8 radiales '
            + 'polea→buje (taladros M6 nuevos en el cubo de la 63T — operación declarada a pieza reutilizada; '
            + 'prisioneros no modelados, quedan embutidos — patrón del UC 205 con sus prisioneros, web BRG-003)' });
      cuentaN('buje 63T Ø38/Ø30 con valona (fabricado)', 1);
      E.addPart(`FIJO · Chaveta DIN 6885 A 8×7×32 (calle X=${B})`, COL.tornillo,
        [r2(B - 16), 0, r2(EJEC.d / 2 - 4)],
        [box('Chaveta 8×32×7', [B, 0, r2(EJEC.d / 2 - 4)], 32, 8, 7)],
        { hardware: true, norma: 'DIN 6885 forma A — chaveta paralela 8×7×32, acero C45K' });
      cuentaN('chaveta DIN 6885 A 8×7×32', 1);
    }

    // UCFL 205 del eje motriz, contra la cara interior del chapón de descarga
    const xu = EJEC.ucfl.posX;                    // 499.418 (cara interior)
    E.addPart('FIJO · Chumacera SKF UCFL 205 (eje motriz común, +X)', COL.rodamiento,
      [r2(xu - EJEC.ucfl.housingW), 0, -65],
      [box(`Housing FL 205 27×40×130`, [r2(xu - EJEC.ucfl.housingW / 2), 0, -65], EJEC.ucfl.housingW, 40, 130),
        hole('Bore UC Ø25', [r2(xu - EJEC.ucfl.housingW - 5), 0, 0], [1, 0, 0], 25),
        hole('Ø16 perno', [r2(xu - EJEC.ucfl.housingW - 1), 0, -49.5], [1, 0, 0], 16),
        hole('Ø16 perno', [r2(xu - EJEC.ucfl.housingW - 1), 0, 49.5], [1, 0, 0], 16)],
      { componente: 'UCFL205', norma: 'SKF UCFL 205 — soporte de brida oval, eje 25, entre taladros 99 · web BRG-003',
        nota: 'brida contra la cara interior del chapón de descarga (X 499.418 step); el UC 205 es de rótula '
          + '(autoalineante) y retiene el eje con sus prisioneros (web BRG-003). 2 pernos M12×45 pasantes '
          + 'al chapón de 28 — taladros Ø14 nuevos, modificación declarada.' });
    cuentaN('chumacera SKF UCFL 205 (web BRG-003)', 1);
    for (const dz of [-49.5, 49.5]) {
      golilla(E, { nombre: `M12 UCFL (Z=${dz})`, at: [r2(xu - EJEC.ucfl.housingW - 2.55), 0, dz], dir: [1, 0, 0], dia: 13, esp: 2.5, capa: 'FIJO · ' });
      pernoHex(E, { nombre: `M12×45 UCFL↔chapón (Z=${dz})`, at: [r2(xu - EJEC.ucfl.housingW - 2.6), 0, dz], dir: [1, 0, 0], dia: 12, largo: 45, af: 19, altoCab: 7.5, capa: 'FIJO · ' });
      tuercaHex(E, { nombre: `M12 UCFL (Z=${dz})`, at: [r2(bordeExtDescarga + 0.1), 0, dz], dir: [1, 0, 0], dia: 12, af: 19, alto: 10.8, capa: 'FIJO · ' });
    }

    // pareja AT10 32T + LK30-RD recolocada al tramo libre (sin superposición)
    const [ax0, ax1] = EJEC.at10.x;
    const axc = r2((ax0 + ax1) / 2);
    E.addPart(`FIJO · Polea AT10 32T Ø112/Ø100×42 recolocada (X ${ax0}…${ax1})`, COL.polea,
      [ax0, 0, 0],
      [cyl('Cara Ø100×42', [ax0, 0, 0], [1, 0, 0], 100, EJEC.at10.ancho),
        cyl('Pestaña Ø112', [ax0, 0, 0], [1, 0, 0], EJEC.at10.pest, 2.5),
        cyl('Pestaña Ø112', [r2(ax1 - 2.5), 0, 0], [1, 0, 0], EJEC.at10.pest, 2.5),
        hole('Bore Ø65', [r2(ax0 - 1), 0, 0], [1, 0, 0], EJEC.at10.bore)],
      { contextoInfo: 'pieza del cliente reubicada', capaInfo: 'step §4.5',
        nota: `recolocación SIN superposición (defecto §5.2 del STEP resuelto): del solape 40 mm con la 63T a un `
          + `tramo propio del eje común. Papel: ${EJEC.at10.papel}. La 63T+AT10 lado a lado no caben a paso 76.2 `
          + `(40+42=82): las otras 3 AT10 quedan de excedente.` });
    cuentaR('polea AT10 32T recolocada (de 4 del cliente)', 1);
    E.addPart(`FIJO · Casquillo LK30-C65-20H7-D30-RD Ø65×66 (AT10 recolocada)`, COL.acero,
      [r2(axc - 33), 0, 0],
      [cyl('Casquillo Ø65×66', [r2(axc - 33), 0, 0], [1, 0, 0], 65, EJEC.at10.lk30rd.largo),
        hole('Ø30.06', [r2(axc - 34), 0, 0], [1, 0, 0], EJEC.at10.lk30rd.asiento)],
      { contextoInfo: 'pieza del cliente reubicada', capaInfo: 'step (inventario)',
        nota: 'cierra la AT10 (bore Ø65) sobre el cuerpo Ø30 h7 del eje común — su asiento medido es Ø30.063; '
          + 'tornillos radiales Unbrako M6×45 del cliente (inventario)' });
    cuentaR('casquillo LK30-C65-20H7-D30-RD recolocado (de 8)', 1);
  }

  // =========================================================================
  // 4-bis. EJE PIVOTE COMÚN Ø25 con su segunda UCFL 205 (defecto §5.3 cerrado)
  // =========================================================================
  {
    E.addPart(`FIJO · Eje pivote común Ø25×${r2(PIVOTE.x1 - PIVOTE.x0)} (sustituye las 4 copias del STEP)`, COL.acero,
      [PIVOTE.x0, TENSOR.pivote.y, TENSOR.pivote.z],
      [cyl(`Eje Ø25×${r2(PIVOTE.x1 - PIVOTE.x0)}`, [PIVOTE.x0, TENSOR.pivote.y, TENSOR.pivote.z], [1, 0, 0], PIVOTE.d, r2(PIVOTE.x1 - PIVOTE.x0))],
      { fabricada: true,
        nota: 'el eje físico ÚNICO del defecto §5.3 (4 copias colineales de EJE-25mm-PASADOR Ø25×603), alargado '
          + '19.4 (603→622) para alcanzar su chumacera −X nueva sin mover la +X medida. Acero C45, extremos con '
          + 'chaflán 1×45° como el original (step).' });
    cuentaN('eje pivote común Ø25×622 (fabricado, sustituye 4 copias)', 1);
    // chumacera −X nueva, ÓVALO HORIZONTAL como la medida del cliente (la +X
    // medida sigue como CTX en mod_calles): así libra el ala del canal TER1_MIR
    const xb = PIVOTE.ucflNegX.posX;              // −81.423 cara interior chapón −X
    E.addPart('FIJO · Chumacera SKF UCFL 205 (eje pivote, −X)', COL.rodamiento,
      [xb, TENSOR.pivote.y, r2(TENSOR.pivote.z - 20)],
      [box('Housing FL 205 27×130×40', [r2(xb + EJEC.ucfl.housingW / 2), TENSOR.pivote.y, r2(TENSOR.pivote.z - 20)], EJEC.ucfl.housingW, 130, 40),
        hole('Bore UC Ø25', [r2(xb - 5), TENSOR.pivote.y, TENSOR.pivote.z], [1, 0, 0], 25),
        hole('Ø16 perno', [r2(xb - 1), r2(TENSOR.pivote.y - 49.5), TENSOR.pivote.z], [1, 0, 0], 16),
        hole('Ø16 perno', [r2(xb - 1), r2(TENSOR.pivote.y + 49.5), TENSOR.pivote.z], [1, 0, 0], 16)],
      { componente: 'UCFL205', norma: 'SKF UCFL 205 — soporte de brida oval, eje 25, entre taladros 99 · web BRG-003',
        nota: 'la chumacera −X que el STEP no tiene (§5.3: una sola UCFL medida, en X 504.1…539.8): brida contra '
          + 'la cara interior del chapón −X, óvalo HORIZONTAL como la medida (Y −166.7…−36.7). 2 M12×45 pasantes, '
          + 'taladros Ø14 nuevos declarados. AVISO: la bancada LAT TOP es caja envolvente — verificar en obra la '
          + 'viga real de la bancada en la zona de la brida.' });
    cuentaN('chumacera SKF UCFL 205 (web BRG-003)', 1);
    for (const dy of [-49.5, 49.5]) {
      pernoHex(E, { nombre: `M12×45 UCFL pivote (Y=${r2(TENSOR.pivote.y + dy)})`, at: [r2(xb + EJEC.ucfl.housingW), r2(TENSOR.pivote.y + dy), TENSOR.pivote.z], dir: [-1, 0, 0], dia: 12, largo: 45, af: 19, altoCab: 7.5, capa: 'FIJO · ' });
      tuercaHex(E, { nombre: `M12 UCFL pivote (Y=${r2(TENSOR.pivote.y + dy)})`, at: [r2(-109.523), r2(TENSOR.pivote.y + dy), TENSOR.pivote.z], dir: [-1, 0, 0], dia: 12, af: 19, alto: 10.8, capa: 'FIJO · ' });
    }
  }

  // =========================================================================
  // por calle: 1 (anclaje cilindro), 2 (retención V1…V4), 3 (IDLER), 5a
  // =========================================================================
  EJES.forEach((B, k) => {
    const c = `calle ${k + 1}, X=${B}`;

    // --- 1. ANCLAJE SUPERIOR DEL CILINDRO + RACORDAJE ----------------------
    const CV = CLEVIS;
    E.addPart(`CTX · Bisagra trasera SMC C85C25 (pose medida) (${c})`, COL.neumatica,
      [r2(B + CV.caja.dx[0]), CV.caja.y[0], CV.caja.z[0]],
      [box(`Cuerpo 29.5×40×32`, [B, r2((CV.caja.y[0] + CV.caja.y[1]) / 2), CV.caja.z[0]],
        r2(CV.caja.dx[1] - CV.caja.dx[0]), r2(CV.caja.y[1] - CV.caja.y[0]), r2(CV.caja.z[1] - CV.caja.z[0])),
        box(`Luz de orejas 16.1`, [B, r2(CV.pivote.y), r2(CV.caja.z[0] - 1)], CV.luzOrejas, 24, 24, 'cut')],
      { contexto: true, capaInfo: 'step estaciones.json / web PNEU-007',
        nota: 'bisagra trasera del C85 Ø25 (el STEP trae UNA, calle 1; se replica a las 5 calles). Orejas de 4.0 '
          + 'con luz 16.1 centrada en el eje de banda; articulación en (Y 56.18, Z −90) con bulón Ø8 según X (medido).' });
    cuentaR('bisagra C85C25 (1 del STEP + 4 nuevas — web PNEU-007)', 1);
    // ménsula-REPISA: el kit C85C25 ancla por su taladro VERTICAL Ø12 (step:
    // en (B−5, 80.18)); la repisa lo toma con un perno M12 vertical y queda
    // 10.8 SOBRE la tapa trasera del cilindro (−76.76): no toca la camisa
    const yBase = CV.caraNorteCabecera;           // 90.18
    E.addPart(`FIJO · Ménsula de clevis — escuadra con repisa 3/16" (${c})`, COL.chapaOsc,
      [B, r2(yBase + 0.05), -120],
      [box(`Ala vertical ${CV.placaBase.t}×70×${CV.placaBase.h}`,
        [B, r2(yBase + 0.05 + CV.placaBase.t / 2), -120], CV.placaBase.w, CV.placaBase.t, CV.placaBase.h),
        box(`Repisa ${CV.repisa.w}×${r2(yBase - CV.repisa.vueloY)}×${CV.repisa.t}`,
          [B, r2((CV.repisa.vueloY + yBase) / 2), r2(CV.repisa.z - CV.repisa.t)],
          CV.repisa.w, r2(yBase - CV.repisa.vueloY), CV.repisa.t),
        hole(`Ø13 perno M12`, [r2(B + CV.taladroVert.dx), CV.taladroVert.y, r2(CV.repisa.z + 1)], [0, 0, -1], CV.repisa.taladro),
        box('Escote de cabeza M12 26×14', [r2(B + CV.taladroVert.dx), r2(yBase + 0.05 + CV.placaBase.t / 2), -66.5],
          26, r2(CV.placaBase.t + 2), 14, 'cut'),
        hole('Ø9 M8', [r2(B - 25), r2(yBase - 1), -95], [0, 1, 0], 9.0),
        hole('Ø9 M8', [r2(B + 25), r2(yBase - 1), -95], [0, 1, 0], 9.0)],
      { fabricada: true,
        chapa: { t: r2(CV.repisa.t), material: 'acero A36', fibra: [[0, -120], [0, r2(CV.repisa.z - CV.repisa.t)], [r2(CV.repisa.vueloY - yBase), r2(CV.repisa.z - CV.repisa.t)]], radio: r2(CV.repisa.t) },
        nota: 'escuadra plegada: ala vertical con 2 M8×20 ROSCADOS a la cara norte de la cabecera FRONT TOP2 '
          + '(taladros nuevos en pieza del cliente — modificación declarada, mismo patrón que el chapón); '
          + 'repisa horizontal a Z −66 (2 sobre la bisagra, 10.8 sobre la tapa del cilindro) con Ø13 para el '
          + 'perno M12 vertical del taladro Ø12 MEDIDO del kit' });
    cuentaN('ménsula de clevis (escuadra con repisa)', 1);
    golilla(E, { nombre: `M12 clevis (${c})`, at: [r2(B + CV.taladroVert.dx), CV.taladroVert.y, r2(CV.repisa.z + 0.05)], dir: [0, 0, 1], dia: 13, esp: 2.5, capa: 'FIJO · ' });
    pernoHex(E, {
      nombre: `M12×30 clevis↔repisa (${c})`,
      at: [r2(B + CV.taladroVert.dx), CV.taladroVert.y, r2(CV.repisa.z + 2.6)], dir: [0, 0, -1],
      dia: 12, largo: 30, af: 19, altoCab: 7.5, capa: 'FIJO · ',
    });
    tuercaHex(E, { nombre: `M12 clevis (${c})`, at: [r2(B + CV.taladroVert.dx), CV.taladroVert.y, r2(CV.repisa.z - CV.repisa.t - 10.85)], dir: [0, 0, 1], dia: 12, af: 19, alto: 10.8, capa: 'FIJO · ' });
    for (const dy of [-25, 25]) {
      pernoHex(E, { nombre: `M8×20 ménsula↔cabecera (${c}, ${dy > 0 ? '+' : '-'})`, at: [r2(B + dy), r2(yBase + 0.05 + CV.placaBase.t), -95], dir: [0, -1, 0], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
    }
    // racordaje: el AS2201FS del cliente ya está (mod_calles); el puerto contrario
    E.addPart(`FIJO · Racor codo SMC KQ2L06-01AS R1/8→Ø6 (puerto trasero) (${c})`, COL.neumatica,
      [B, r2(TENSOR.cilindro.y + CV.racor.dy), CV.racor.puertoZ],
      [box(`Codo 16×26.3×25`, [B, r2(TENSOR.cilindro.y + CV.racor.dy / 2 - 5), CV.racor.puertoZ], 16, 26.3, 25)],
      { hardware: true, norma: 'SMC KQ2L06-01AS — codo instantáneo macho R1/8 → tubo Ø6, con sellante · web PNEU-008',
        nota: 'puerto trasero (culata superior) del C85: el puerto de trabajo delantero lleva el regulador '
          + 'AS2201FS-01-06S del cliente (meter-out, web PNEU-004); tubo PU Ø6 a la válvula del cliente' });
    cuentaN('racor SMC KQ2L06-01AS (web PNEU-008)', 1);
    // los 2 separadores medidos del bulón inferior (completan la horquilla KJ10D)
    for (const s of [-1, 1]) {
      const xs = s < 0 ? r2(B - 24 + 9) : r2(B + 8 + 9);
      E.addPart(`CTX · Separador Ø19×18 del bulón KJ10D (${s < 0 ? '−X' : '+X'}) (${c})`, COL.acero,
        [r2(xs - 9), -2.3, -307.5],
        [cyl('Casquillo Ø19×18', [r2(xs - 9), -2.3, -307.5], [1, 0, 0], 19, 18),
          hole('Ø10.2', [r2(xs - 10), -2.3, -307.5], [1, 0, 0], 10.2)],
        { contexto: true, capaInfo: 'step estaciones.json (SEPARADOR ×2 por calle)',
          nota: 'centran el brazo sobre el bulón del KJ10D (luz de pletinas ↔ horquilla de 17)' });
      cuentaR('separador de bulón KJ10D (step)', 1);
    }

    // --- 2. RETENCIÓN AXIAL DE V1…V4 (reemplaza los esbozos de mod_calles) --
    // V1/V4: volantes Ø100 con alojamientos mecanizados; V2/V3: poleas Ø117.9
    for (const [V, nomV] of [[POZO.v1, 'V1'], [POZO.v4, 'V4']]) {
      poleaPozo(E, `FIJO · Volante contraflexión Ø100 con alojamientos Ø42 (${nomV}) (${c})`,
        nomV, c, B, V.y, V.z, 100, 110, 3, COL.polea,
        { fabricada: true,
          nota: 'geometría del guia_*_liso del cliente (step §4.5) con los extremos del bore Ø38 MECANIZADOS a '
            + 'Ø42 N7 ×12.2 (operación declarada a pieza reutilizada / pieza nueva según BOM); el bore Ø38 '
            + 'central queda de hombro. Carga rotante en el aro exterior → N7 (criterio del repo, web BRG-FIT-001).' }, cuentaN);
      paqueteEjeV(E, c, nomV, B, V.y, V.z, cuentaN);
    }
    for (const [V, nomV] of [[POZO.v2, 'V2'], [POZO.v3, 'V3']]) {
      poleaPozo(E, `FIJO · Polea plana Ø117.9×40 fija con alojamientos Ø42 (${nomV}) (${c})`,
        nomV, c, B, V.y, V.z, 117.9, 0, 0, COL.polea,
        { fabricada: true,
          nota: 'como la POL-CON-TEN del cliente (Ø117.9×40 sobre 2×W 6004-2Z, step §4.4); toca la cara dentada '
            + 'igual que la tensora. Alojamientos Ø42 N7 + DIN 472-42; retención del paquete interior por '
            + 'anillos 3AM1-20 en el eje (patrón del cliente, step/web RING-001).' }, cuentaN);
      paqueteEjeV(E, c, nomV, B, V.y, V.z, cuentaN);
    }
    cuentaN('paquete de retención axial V1…V4 completo (por calle)', 4);

    // --- 3. POLEA LOCA INTERIOR DEL IDLER-ENS (medida; capa step) ----------
    const ix = r2(B + IDLER.dxEjeBanda);
    E.addPart(`CTX · Polea loca IDLER-P01 Ø92.4×40 bombeada (posición interior medida) (${c})`, COL.polea,
      [r2(ix - 20), IDLER.y, IDLER.z],
      [cyl(`Disco Ø92.4×40 (bombeo cónico 0.62°)`, [r2(ix - 20), IDLER.y, IDLER.z], [1, 0, 0], IDLER.cara.dMax, IDLER.cara.ancho),
        hole(`Paso central Ø25.12`, [r2(ix - 21), IDLER.y, IDLER.z], [1, 0, 0], IDLER.pasoCentral),
        hole(`Alojamiento Ø40.02 (−X)`, [r2(ix - 21), IDLER.y, IDLER.z], [1, 0, 0], IDLER.alojamiento, 5.5, false),
        hole(`Alojamiento Ø40.02 (+X)`, [r2(ix + 20 - 4.45), IDLER.y, IDLER.z], [1, 0, 0], IDLER.alojamiento, 5.5, false),
        cyl(`Ranura DIN 472 Ø42.5`, [r2(ix - IDLER.ranuraDin472.pos - 0.93), IDLER.y, IDLER.z], [1, 0, 0], IDLER.ranuraDin472.d, 1.85, 'cut'),
        cyl(`Ranura DIN 472 Ø42.5`, [r2(ix + IDLER.ranuraDin472.pos - 0.93), IDLER.y, IDLER.z], [1, 0, 0], IDLER.ranuraDin472.d, 1.85, 'cut')],
      { contexto: true, capaInfo: 'step estaciones.json (reproducible: adapt/medir_estaciones.py)',
        nota: `POSICIÓN INTERIOR MEDIDA: eje a ${IDLER.dxEjeBanda} del eje de banda, Y ${IDLER.y}, Z 0, a `
          + `${IDLER.ejeAExtremoSur} del extremo sur de su horquilla UR-P01; el eje real está inclinado 2.0° en XZ `
          + `(se modela recto y se declara). DEFECTO DEL STEP DECLARADO: COAXIAL con la conducida_63T (ΔY=ΔZ=0.000) `
          + `con ${IDLER.solapeConducidaX} de solape en X — dos discos interpenetrados. La banda medida respalda a la `
          + `63T (radio de vuelta 52.33 vs 48.4 que daría la loca); el bore Ø17 de sus 6203 no tiene eje en el STEP. `
          + `63T o polea loca con eje nuevo: DECIDE EL CLIENTE; hasta entonces la loca va fiel, capa step, fuera del B-rep.` });
    cuentaR('polea loca IDLER-P01 (posición interior medida)', 1);
    for (const s of [-1, 1]) {
      const xr = s < 0 ? r2(ix - 20 + 1.5) : r2(ix + 20 - 13.5);
      rodamiento(E, {
        nombre: `6203-2RS IDLER (${s < 0 ? '−X' : '+X'}) (${c})`,
        at: [xr, IDLER.y, IDLER.z], dir: [1, 0, 0],
        bore: IDLER.rodamiento.b, od: IDLER.rodamiento.D, w: IDLER.rodamiento.w, capa: 'CTX · ',
      });
      const rp = E.parts[E.parts.length - 1];
      rp.contexto = true;
      rp.capaInfo = 'step (inventario) / web BRG-004';
      const xa = r2(ix + s * IDLER.ranuraDin472.pos - 0.88);
      E.addPart(`CTX · Anillo DIN 472-40 IDLER (${s < 0 ? '−X' : '+X'}) (${c})`, COL.inox,
        [xa, IDLER.y, IDLER.z],
        [cyl('Anillo Ø42.4×1.75', [xa, IDLER.y, IDLER.z], [1, 0, 0], 42.4, 1.75),
          hole('Ø36.5', [r2(xa - 1), IDLER.y, IDLER.z], [1, 0, 0], 36.5)],
        { contexto: true, capaInfo: 'step (inventario: DIN 472 ×2 por polea) / web RING-002' });
    }
    E.addPart(`CTX · Espaciador IDLER-E Ø23.5×6.63 (${c})`, COL.acero,
      [r2(ix - 2 - 6.63 / 2 + 1), IDLER.y, IDLER.z],
      [cyl('Espaciador Ø23.5×6.63', [r2(ix - 2 - 6.63 / 2 + 1), IDLER.y, IDLER.z], [1, 0, 0], IDLER.espaciadorE.dExt, IDLER.espaciadorE.largo),
        hole('Ø17.4', [r2(ix - 8), IDLER.y, IDLER.z], [1, 0, 0], 17.4)],
      { contexto: true, capaInfo: 'step estaciones.json (caja IDLER-E)',
        nota: 'entre los aros interiores de los 6203 (el eje Ø17 que los atraviesa NO existe en el STEP — pendiente cliente)' });
    // los 2 M8×65 pasantes de la horquilla (poses medidas)
    for (const ym of [-1612.4, -1602.6]) {
      pernoHex(E, { nombre: `M8×65 horquilla IDLER (${c}, Y=${ym})`, at: [r2(ix - 36), ym, r2((ym < -1607.5 ? -1 : 1) * 1.1)], dir: [1, 0, 0], dia: 8, largo: 65, af: 13, altoCab: 5.3, capa: 'CTX · ' });
      const pp = E.parts[E.parts.length - 1];
      pp.contexto = true;
      pp.capaInfo = 'step (inventario: AS 1420 M8×65 ×2, con tuerca ISO 8673 y golilla 0.375)';
      tuercaHex(E, { nombre: `M8 ISO 8673 horquilla (${c}, Y=${ym})`, at: [r2(ix + 30), ym, r2((ym < -1607.5 ? -1 : 1) * 1.1)], dir: [1, 0, 0], dia: 8, af: 13, alto: 6.5, capa: 'CTX · ' });
      E.parts[E.parts.length - 1].contexto = true;
    }
    cuentaR('paquete interior IDLER (2×6203 + 2×DIN472 + espaciador + 2×M8×65)', 1);

    // --- 5a. TORNILLERÍA FINA DE EXTREMOS ----------------------------------
    // carro tensor CT-ENS → perfil sur (poses medidas, re-pitcheadas):
    for (const dz of [-20, 20]) {
      for (const s of [-1, 1]) {
        pernoHex(E, {
          nombre: `M8×12 CT-ENS↔perfil (${c}, Z=${dz}, ${s > 0 ? '+X' : '−X'})`,
          at: [r2(B + s * 20), EXTREMOS.ctens.m8y[0], dz], dir: [s > 0 ? -1 : 1, 0, 0],
          dia: 8, largo: 12, af: 13, altoCab: 5.3, capa: 'FIJO · ',
        });
        cuentaN('tuerca T M8 (ranura 8) — extremos', 1);
      }
    }
    // drive kit P1 → perfil norte:
    for (const ym of EXTREMOS.driveKit.m8y) {
      for (const s of [-1, 1]) {
        pernoHex(E, {
          nombre: `M8×12 drive kit↔perfil (${c}, Y=${ym}, ${s > 0 ? '+X' : '−X'})`,
          at: [r2(B + s * 20), ym, -20], dir: [s > 0 ? -1 : 1, 0, 0],
          dia: 8, largo: 12, af: 13, altoCab: 5.3, capa: 'FIJO · ',
        });
        cuentaN('tuerca T M8 (ranura 8) — extremos', 1);
      }
    }
  });

  // ---- métricas del módulo (para la compuerta) ----------------------------
  M.ejeComun = {
    d: EJEC.d, munonUcfl: EJEC.munonUcfl.d, x: [EJEC.x0, EJEC.x1],
    L: r2(EJEC.x1 - EJEC.x0),
    vanoApoyosMm: r2(EJEC.ucfl.posX - EJEC.ucfl.housingW / 2 - (-28)),  // acople (centro −28) → UCFL
    cargaPorCalleN: EJEC.flecha.cargaPorCalleN,
  };
  M.at10 = { x: EJEC.at10.x, bandaDimensionada: EJEC.bandaAT10 };
  M.idler = {
    dxEjeBanda: IDLER.dxEjeBanda, y: IDLER.y, solapeConducidaX: IDLER.solapeConducidaX,
    declarado: 'defecto del cliente: IDLER-P01 coaxial con conducida_63T; decide el cliente',
  };
  M.piezas = E.parts.length - M.piezas0;
  return M;
}
