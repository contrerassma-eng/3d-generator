// mod_percha.mjs — PERCHA del NBT90 al sistema de perfil ranurado del cliente
// (serie 40, ranura 8, tuercas T M8 — step §4.2/§7.2, web TSLOT-001/PERF-001).
//
// Sustituye al paquete de interfaz ProSort del NBT90 (canales anfitrión, jack
// bolts, B-20760 — excluidos en mod_ctx). Con el reparto corrido al lado de
// descarga (params §3) la percha es ASIMÉTRICA:
//   · LADO −X (holgado, 132 mm al bastidor): LARGUERO 40×80 según Y con la
//     ranura superior en la cota de las colisas del side (−104.27), sobre 3
//     MÉNSULAS de perfil 40×40 empotradas al bastidor; el NBT90 cuelga por la
//     PLACA DE CUELGUE de 3 lengüetas que APOYAN sobre el larguero.
//   · LADO +X: el side channel entra 8.61 mm en la MUESCA del chapón de
//     descarga (mod_ctx); cuelga de la PLACA DE ESCOTE atornillada al chapón
//     por fuera, con casquillos separadores sobre los pernos 3/8.
//   · 2 TRAVESAÑOS 40×80 (40 de canto) entre bastidores: sostienen los 5
//     puentes de calle y las pletinas de V2/V3 del pozo.
// Tornillería al bastidor: M8 ROSCADOS al chapón de 28 (taladros nuevos,
// modificación declarada al cliente).

import { box, hole, cyl, COL, r2, pernoHex, tuercaHex, golilla } from '../../nbt90/lib.mjs';
import { STEP, NBT, T, Xc, PERCHA, EJES, bordeExtDescarga } from './params_adapt.mjs';
import { perfilRanurado } from './mod_calles.mjs';

export function percha(E) {
  const M = { piezas0: E.parts.length, tuercasT: 0 };
  const t = PERCHA.escuadraT;                       // 4.763 (3/16")
  const [zL0, zL1] = PERCHA.largueroZ;              // [−164.27, −84.27]
  const zPerno = r2(NBT.sideTornZ + T.z);           // −104.27

  const almaNeg = r2(Xc - NBT.sideAlmaExtY);        // 50.89 — cara ext alma side −X
  const almaPos = r2(Xc + NBT.sideAlmaExtY);        // 508.03 — ídem +X (en la muesca)
  const yPernos = [r2(T.y - 60), r2(T.y - 403)];    // [−802, −1145] (colisas del side)
  const yAlaCentral = r2(T.y - 231.5);              // −973.5 (solo apoyo)

  // =========================================================================
  // LADO −X: larguero + ménsulas + placa de cuelgue
  // =========================================================================
  const xL = PERCHA.largueroXNeg;                   // [−4.61, 35.39]
  const xcL = r2((xL[0] + xL[1]) / 2);              // 15.39
  perfilRanurado(E, `FIJO · Larguero percha 40×80 L=${r2(PERCHA.largueroY[1] - PERCHA.largueroY[0])} (−X)`,
    xcL, PERCHA.largueroY, [zL0, zL1], ['+z', '-x'],
    { nota: `perfil 40×80 serie 40 (web PERF-001); ranura superior en Z=${zL1}; apoya sobre 3 ménsulas al bastidor y de él cuelga el side −X del NBT90` });

  // placa de cuelgue −X (brazo vertical contra el alma + 3 lengüetas de apoyo)
  {
    const xPlaca = [r2(almaNeg - 0.1 - t), r2(almaNeg - 0.1)];   // [46.03, 50.79]
    const brazoZ = [-121, zL1];
    const f = [
      box(`Brazo vertical ${t}×403×${r2(brazoZ[1] - brazoZ[0])}`,
        [r2((xPlaca[0] + xPlaca[1]) / 2), r2((-1175 + -772) / 2), brazoZ[0]], t, 403, r2(brazoZ[1] - brazoZ[0])),
    ];
    const alaX = [r2(xcL - 12), xPlaca[0]];
    for (const [yA, conPerno] of [[yPernos[0], true], [yAlaCentral, false], [yPernos[1], true]]) {
      f.push(box(`Lengüeta ${r2(alaX[1] - alaX[0])}×60×${t}`,
        [r2((alaX[0] + alaX[1]) / 2), yA, zL1], r2(alaX[1] - alaX[0]), 60, t));
      f.push(hole(`Ø9 M8 lengüeta`, [xcL, yA, r2(zL1 + t + 1)], [0, 0, -1], 9.0));
      if (conPerno) f.push(hole(`Ø10.13 perno de cuelgue`, [r2(xPlaca[0] - 1), yA, zPerno], [1, 0, 0], 10.13));
    }
    E.addPart(`FIJO · Placa de cuelgue NBT90 3/16"×403 con 3 lengüetas (−X)`,
      COL.chapaOsc, [r2((xPlaca[0] + xPlaca[1]) / 2), r2((-1175 + -772) / 2), brazoZ[0]], f,
      {
        fabricada: true,
        chapa: { t: r2(t), material: 'acero A36', fibra: [[0, brazoZ[0]], [0, zL1], [-50, zL1]], radio: r2(t) },
        nota: 'láser + plegado; APOYA sobre el larguero (la carga baja por apoyo); los pernos 3/8 pasan por las colisas de reglaje del side channel (X_nbt 60/403, ±8 de reglaje vertical)',
      });
    for (const yA of yPernos) {
      pernoHex(E, {
        nombre: `3/8-16×1" cuelgue NBT90 (−X, Y=${yA})`,
        at: [r2(xPlaca[0] - 1.6), yA, zPerno], dir: [1, 0, 0], dia: 9.525, largo: 25.4,
        af: 14.29, altoCab: 5.94, capa: 'FIJO · ',
      });
      tuercaHex(E, {
        nombre: `3/8-16 cuelgue (−X, Y=${yA})`,
        at: [r2(almaNeg + 2.657 + 2.7), yA, zPerno],
        dir: [1, 0, 0], dia: 9.525, af: 14.29, alto: 8.1, capa: 'FIJO · ',
      });
      golilla(E, { nombre: `3/8 cuelgue (−X, Y=${yA})`, at: [r2(xPlaca[0] - 1.6), yA, zPerno], dir: [1, 0, 0], dia: 9.6, esp: 1.6, capa: 'FIJO · ' });
    }
    for (const yA of [...yPernos, yAlaCentral]) {
      pernoHex(E, { nombre: `M8×16 lengüeta (−X, Y=${yA})`, at: [xcL, yA, r2(zL1 + t)], dir: [0, 0, -1], dia: 8, largo: 12, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      M.tuercasT++;
    }
  }

  // ménsulas 40×40 al bastidor −X (el larguero apoya encima). La placa frontal
  // va ENTRE el bastidor y la ménsula; sus 4 M8 al chapón, en las esquinas,
  // FUERA de la huella 40×40 (si no, la ménsula tapa las cabezas).
  for (const yM of PERCHA.mensulasY) {
    const xM = [r2(STEP.frameIntNeg + 0.15 + t), r2(xL[0] - t - 0.2)];    // [−76.51, −9.57]
    const f = [box(`Perfil 40×40×${r2(xM[1] - xM[0])}`, [r2((xM[0] + xM[1]) / 2), yM, r2(zL0 - 40)], r2(xM[1] - xM[0]), 40, 40),
      { id: `mens_${String(yM).replace(/\W/g, '_')}_r`, name: 'Ranura 8 (inf)', shape: 'box', op: 'cut',
        at: [r2((xM[0] + xM[1]) / 2), yM, r2(zL0 - 40)], dir: [0, 0, 1], params: { w: r2(xM[1] - xM[0]), d: 8.2, h: 12 } }];
    E.addPart(`FIJO · Ménsula percha 40×40 L=${r2(xM[1] - xM[0])} (−X, Y=${yM})`, COL.acero,
      [r2((xM[0] + xM[1]) / 2), yM, r2(zL0 - 40)], f,
      { catalogo: 'perfil ranurado 40×40 ranura 8 serie 40 (web PERF-001)', nota: 'el larguero apoya sobre ella; nudo al larguero con escuadra de chapa y al bastidor con placa frontal' });
    // escuadra ménsula↔larguero (ala vertical a la cara −X del larguero con 2 M8
    // a la ranura lateral baja; ala horizontal bajo la ménsula, 1 M8 a su ranura)
    E.addPart(`FIJO · Escuadra ménsula↔larguero 3/16" (Y=${yM})`, COL.chapaOsc,
      [r2(xL[0] - t - 0.1), yM, r2(zL0 - 40)],
      [box(`Ala vertical ${t}×60×${r2(40 + 36)}`, [r2(xL[0] - t / 2 - 0.1), yM, r2(zL0 - 36)], t, 60, 76),
        box(`Ala horizontal 50×60×${t}`, [r2(xL[0] - t - 0.1 - 25), yM, r2(zL0 - 40 - t)], 50, 60, t),
        hole(`Ø9 M8 larguero`, [r2(xL[0] - t - 1), r2(yM - 15), r2(zL0 + 20)], [1, 0, 0], 9.0),
        hole(`Ø9 M8 larguero`, [r2(xL[0] - t - 1), r2(yM + 15), r2(zL0 + 20)], [1, 0, 0], 9.0),
        hole(`Ø9 M8 ménsula`, [r2(xL[0] - t - 0.1 - 25), yM, r2(zL0 - 40 - t - 1)], [0, 0, 1], 9.0)],
      { fabricada: true, chapa: { t: r2(t), material: 'acero A36', fibra: [[0, 36], [0, -40], [-50, -40]], radio: r2(t) }, nota: '2 M8 a la ranura lateral −X del larguero (Z −144.27) + 1 M8 hacia arriba a la ranura inferior de la ménsula' });
    M.tuercasT += 3;
    // placa frontal ménsula↔bastidor (4 M8 roscados al chapón, en esquinas)
    E.addPart(`FIJO · Placa frontal ménsula↔bastidor 3/16"×76×60 (Y=${yM})`, COL.chapaOsc,
      [r2(STEP.frameIntNeg + 0.05), yM, r2(zL0 - 50)],
      [box(`Placa ${t}×76×60`, [r2(STEP.frameIntNeg + 0.05 + t / 2), yM, r2(zL0 - 50)], t, 76, 60),
        hole(`Ø9 M8`, [r2(STEP.frameIntNeg - 1), r2(yM - 29), r2(zL0 - 35)], [1, 0, 0], 9.0),
        hole(`Ø9 M8`, [r2(STEP.frameIntNeg - 1), r2(yM + 29), r2(zL0 - 35)], [1, 0, 0], 9.0),
        hole(`Ø9 M8`, [r2(STEP.frameIntNeg - 1), r2(yM - 29), r2(zL0 - 5)], [1, 0, 0], 9.0),
        hole(`Ø9 M8`, [r2(STEP.frameIntNeg - 1), r2(yM + 29), r2(zL0 - 5)], [1, 0, 0], 9.0)],
      { fabricada: true, nota: 'soldada a la testa de la ménsula; 4 M8×20 ROSCADOS al chapón del bastidor (taladros nuevos, modificación declarada), en las esquinas para que la ménsula no tape las cabezas' });
    for (const [dy, dz] of [[-29, -35], [29, -35], [-29, -5], [29, -5]]) {
      pernoHex(E, { nombre: `M8×20 ménsula↔bastidor (Y=${r2(yM + dy)}, Z=${r2(zL0 + dz)})`, at: [r2(STEP.frameIntNeg + 0.05 + t), r2(yM + dy), r2(zL0 + dz)], dir: [-1, 0, 0], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
    }
  }

  // =========================================================================
  // LADO +X: placa de escote al chapón de descarga
  // =========================================================================
  {
    const xChapaExt = bordeExtDescarga;              // 527.418
    const xPlaca = [r2(xChapaExt + 0.1), r2(xChapaExt + 0.1 + t)];
    const f = [box(`Placa ${t}×513×95`, [r2((xPlaca[0] + xPlaca[1]) / 2), r2((PERCHA.muesca.y[0] + PERCHA.muesca.y[1]) / 2 - 0), -150], t, r2(PERCHA.muesca.y[1] - PERCHA.muesca.y[0] + 40), 95)];
    for (const yA of yPernos) f.push(hole(`Ø10.13 perno cuelgue`, [r2(xPlaca[0] - 1), yA, zPerno], [1, 0, 0], 10.13));
    // 6 taladros M8 al chapón: 4 sobre la muesca (Z −70) y 2 laterales (Z −100)
    for (const yA of [-1180, -1030, -880, -760]) f.push(hole(`Ø9 M8 chapón`, [r2(xPlaca[0] - 1), yA, -70], [1, 0, 0], 9.0));
    for (const yA of [r2(PERCHA.muesca.y[0] - 12), r2(PERCHA.muesca.y[1] + 12)]) f.push(hole(`Ø9 M8 chapón`, [r2(xPlaca[0] - 1), yA, -100], [1, 0, 0], 9.0));
    E.addPart(`FIJO · Placa de escote NBT90 3/16"×${r2(PERCHA.muesca.y[1] - PERCHA.muesca.y[0] + 40)}×95 (+X)`,
      COL.chapaOsc, [r2((xPlaca[0] + xPlaca[1]) / 2), r2((PERCHA.muesca.y[0] + PERCHA.muesca.y[1]) / 2), -150], f,
      { fabricada: true, nota: 'tapa la muesca del chapón de descarga POR FUERA; 6 M8×20 roscados al chapón (donde queda chapa: 4 a Z −70, 2 laterales a Z −100); de ella cuelga el side +X con casquillos separadores' });
    for (const yA of yPernos) {
      // perno 3/8×2": cabeza dentro del side, casquillo alma→placa, tuerca fuera
      pernoHex(E, {
        nombre: `3/8-16×2" cuelgue NBT90 (+X, Y=${yA})`,
        at: [r2(almaPos - 2.657 - 6), yA, zPerno], dir: [1, 0, 0], dia: 9.525, largo: 50.8,
        af: 14.29, altoCab: 5.94, capa: 'FIJO · ',
      });
      E.addPart(`FIJO · Casquillo separador Ø16×${PERCHA.casquilloEscote.largo} (+X, Y=${yA})`, COL.acero,
        [r2(almaPos + 0.01), yA, zPerno],
        [cyl(`Casquillo Ø16×${PERCHA.casquilloEscote.largo}`, [r2(almaPos + 0.01), yA, zPerno], [1, 0, 0], 16, r2(PERCHA.casquilloEscote.largo - 0.02)),
          hole(`Ø10.5`, [r2(almaPos - 1), yA, zPerno], [1, 0, 0], 10.5)],
        { fabricada: true, nota: 'entre el alma del side (508.03) y la placa de escote (527.52), a través de la muesca' });
      tuercaHex(E, {
        nombre: `3/8-16 cuelgue (+X, Y=${yA})`,
        at: [r2(xPlaca[1] + 1.7), yA, zPerno], dir: [1, 0, 0], dia: 9.525, af: 14.29, alto: 8.1, capa: 'FIJO · ',
      });
      golilla(E, { nombre: `3/8 cuelgue (+X, Y=${yA})`, at: [r2(xPlaca[1] + 0.05), yA, zPerno], dir: [1, 0, 0], dia: 9.6, esp: 1.6, capa: 'FIJO · ' });
    }
    for (const yA of [-1180, -1030, -880, -760]) {
      pernoHex(E, { nombre: `M8×20 placa escote↔chapón (Y=${yA})`, at: [xPlaca[1], yA, -70], dir: [-1, 0, 0], dia: 8, largo: 20, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
    }
  }

  // =========================================================================
  // Travesaños 40×80 (40 de canto) entre bastidores
  // =========================================================================
  const xTrav = [r2(STEP.frameIntNeg + 11.42), r2(STEP.frameIntPos - 11.42)];   // [−70, 488]
  for (const [yRange, nom] of [[PERCHA.travS, 'sur'], [PERCHA.travN, 'norte']]) {
    const yc = r2((yRange[0] + yRange[1]) / 2);
    const z0 = r2(PERCHA.travTopZ - 40), z1 = PERCHA.travTopZ;
    const L = r2(xTrav[1] - xTrav[0]);
    const f = [box(`Perfil 40×80×${L}`, [r2((xTrav[0] + xTrav[1]) / 2), yc, z0], L, 80, 40)];
    let nrr = 0;
    for (const dy of [-20, 20]) {
      f.push({ id: `trv_${nom}_r${++nrr}`, name: 'Ranura 8 (sup)', shape: 'box', op: 'cut',
        at: [r2((xTrav[0] + xTrav[1]) / 2), r2(yc + dy), r2(z1 - 12)], dir: [0, 0, 1], params: { w: L, d: 8.2, h: 12 } });
      f.push({ id: `trv_${nom}_r${++nrr}`, name: 'Ranura 8 (inf)', shape: 'box', op: 'cut',
        at: [r2((xTrav[0] + xTrav[1]) / 2), r2(yc + dy), z0], dir: [0, 0, 1], params: { w: L, d: 8.2, h: 12 } });
    }
    E.addPart(`FIJO · Travesaño percha 40×80 L=${L} (${nom})`, COL.acero,
      [r2((xTrav[0] + xTrav[1]) / 2), yc, z0], f,
      { catalogo: 'perfil ranurado 40×80 ranura 8 serie 40 (web PERF-001)', nota: `sostiene los 5 puentes de calle y las pletinas de ${nom === 'sur' ? 'V1/V2' : 'V3'}` });

    for (const lado of [-1, 1]) {
      const xBast = lado < 0 ? STEP.frameIntNeg : STEP.frameIntPos;
      const xAlaV = lado < 0 ? [r2(xBast + 0.1), r2(xBast + 0.1 + t)] : [r2(xBast - 0.1 - t), r2(xBast - 0.1)];
      // ala horizontal de 30: la de 60 pisaba la placa base del puente de la
      // calle extrema (que con el reparto corrido llega a X 463.9)
      const alaH = lado < 0 ? [xAlaV[1], r2(xAlaV[1] + 30)] : [r2(xAlaV[0] - 30), xAlaV[0]];
      E.addPart(`FIJO · Escuadra travesaño↔bastidor 3/16" (${nom}, ${lado < 0 ? '−X' : '+X'})`,
        COL.chapaOsc, [r2((xAlaV[0] + xAlaV[1]) / 2), yc, z1],
        [box(`Ala vertical ${t}×60×45`, [r2((xAlaV[0] + xAlaV[1]) / 2), yc, r2(z1 - 45 + t)], t, 60, 45),
          box(`Ala horizontal 30×60×${t}`, [r2((alaH[0] + alaH[1]) / 2), yc, z1], 30, 60, t),
          hole(`Ø9 M8 bastidor`, [r2(xAlaV[0] - 1), r2(yc - 20), r2(z1 - 18)], [1, 0, 0], 9.0),
          hole(`Ø9 M8 bastidor`, [r2(xAlaV[0] - 1), r2(yc + 20), r2(z1 - 18)], [1, 0, 0], 9.0),
          hole(`Ø9 M8 travesaño`, [r2((alaH[0] + alaH[1]) / 2), r2(yc - 20), r2(z1 + t + 1)], [0, 0, -1], 9.0),
          hole(`Ø9 M8 travesaño`, [r2((alaH[0] + alaH[1]) / 2), r2(yc + 20), r2(z1 + t + 1)], [0, 0, -1], 9.0)],
        {
          fabricada: true,
          chapa: { t: r2(t), material: 'acero A36', fibra: [[0, r2(z1 - 45)], [0, z1], [lado < 0 ? 50 : -50, z1]], radio: r2(t) },
          nota: '2 M8 roscados al bastidor + 2 M8 a tuercas T de las ranuras superiores del travesaño',
        });
      for (const dy of [-20, 20]) {
        pernoHex(E, { nombre: `M8×16 travesaño (${nom}, ${lado < 0 ? '−X' : '+X'}, ${dy > 0 ? '+' : '-'})`, at: [r2((alaH[0] + alaH[1]) / 2), r2(yc + dy), r2(z1 + t)], dir: [0, 0, -1], dia: 8, largo: 12, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
        pernoHex(E, { nombre: `M8×20 travesaño↔bastidor (${nom}, ${lado < 0 ? '−X' : '+X'}, ${dy > 0 ? '+' : '-'})`, at: [lado < 0 ? xAlaV[1] : xAlaV[0], r2(yc + dy), r2(z1 - 18)], dir: [lado < 0 ? -1 : 1, 0, 0], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
        M.tuercasT++;
      }
    }
  }

  // ---- métricas -----------------------------------------------------------
  const areaApoyo = 3 * 12 * 60;                          // lengüetas −X sobre larguero
  const masa = NBT.masaKg;
  M.cuelgue = {
    masaNbt90Kg: masa,
    pernos38: 4, apoyoLenguetas: 3, placaEscoteM8: 6,
    presionApoyoMPa: r2(masa / 2 * 9.80665 / areaApoyo),
    cortantePorPernoN: r2(masa * 9.80665 / 4),
    cortanteAdmisiblePernoN: r2(0.6 * 379 * 50.0),        // Gr2 (web HW-007)
    cortanteM8EscoteN: r2(masa / 2 * 9.80665 / 6),
  };
  M.flechaLargueroMm = r2(
    (masa / 2 * 9.80665) * Math.pow(PERCHA.largueroY[1] - PERCHA.largueroY[0], 3)
    / (48 * 70000 * 101.19e4),   // Iy = 101.19 cm⁴ (item 0.0.026.04, web PERF-001)
  );
  M.muesca = { ...PERCHA.muesca, cantoRestanteChapon: r2(46 - PERCHA.muesca.zTop) };
  M.piezas = E.parts.length - M.piezas0;
  return M;
}
