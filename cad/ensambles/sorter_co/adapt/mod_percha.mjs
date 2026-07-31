// mod_percha.mjs — PERCHA del NBT90 al sistema de perfil ranurado del cliente
// (serie 40, ranura 8, tuercas T M8 — step §4.2/§7.2, web TSLOT-001).
//
// Sustituye al paquete de interfaz ProSort del NBT90 (canales anfitrión, jack
// bolts, B-20760 — excluidos en mod_ctx). Arquitectura:
//   · 2 LARGUEROS 40×80 según Y, uno por costado del módulo, con una ranura
//     lateral… vertical alineada a las colisas de reglaje del side channel;
//     el módulo se cuelga de ellos por 2 PLACAS DE CUELGUE (chapa 3/16 con
//     3 lengüetas plegadas que APOYAN sobre la cara superior del larguero:
//     la carga baja por apoyo, los pernos fijan y reglan);
//   · 2 TRAVESAÑOS 40×80 (40 de canto) entre bastidores: sostienen los 5
//     puentes de calle y las pletinas de V2 (tensora) y V3;
//   · escuadras de chapa 3/16 al bastidor (chapón de 28: taladros M8 roscados
//     NUEVOS — modificación al cliente, declarada).
// Pernos de cuelgue: 3/8-16 × 1" por las COLISAS DE REGLAJE existentes del
// side channel en X_nbt 60 y 403 (la posición central 231.5 no se usa: en el
// sorter queda tras la placa colgante del canal del cilindro del NBT90).

import { box, hole, COL, r2, pernoHex, tuercaHex, golilla } from '../../nbt90/lib.mjs';
import { STEP, NBT, T, PERCHA, EJES } from './params_adapt.mjs';
import { perfilRanurado } from './mod_calles.mjs';

export function percha(E) {
  const M = { piezas0: E.parts.length, tuercasT: 0 };
  const t = PERCHA.escuadraT;                       // 4.763 (3/16")
  const [zL0, zL1] = PERCHA.largueroZ;              // [−164.27, −84.27]
  const zPerno = r2(NBT.sideTornZ + T.z);           // −104.267 → r2 −104.27

  // caras exteriores de las almas de los side channels del NBT90, en el sorter
  const almaNeg = r2(T.x - NBT.sideAlmaExtY);       // −19.57
  const almaPos = r2(T.x + NBT.sideAlmaExtY);       // 437.57

  // pernos de cuelgue: X_nbt 60 y 403 → Y_s = T.y − X_nbt
  const yPernos = [r2(T.y - 60), r2(T.y - 403)];    // [−802, −1145]
  const yAlaCentral = r2(T.y - 231.5);              // −973.5 (solo apoyo + M8)

  // ---- 1. largueros -------------------------------------------------------
  for (const lado of [-1, 1]) {
    const x = lado < 0 ? PERCHA.largueroXNeg : [r2(2 * T.x - PERCHA.largueroXNeg[1]), r2(2 * T.x - PERCHA.largueroXNeg[0])];
    const xc = r2((x[0] + x[1]) / 2);
    perfilRanurado(E, `FIJO · Larguero percha 40×80 L=${r2(PERCHA.largueroY[1] - PERCHA.largueroY[0])} (${lado < 0 ? '−X' : '+X'})`,
      xc, PERCHA.largueroY, [zL0, zL1], ['+z', '-z'],
      { nota: `perfil ranurado 40×80 serie 40 (web PERF-001); cara superior a Z=${zL1}; apoya sobre las escuadras del bastidor y de él cuelga el NBT90` });

    // ---- 2. placa de cuelgue (una por costado) ---------------------------
    const alma = lado < 0 ? almaNeg : almaPos;
    const xPlaca = lado < 0 ? [r2(alma - 0.1 - t), r2(alma - 0.1)] : [r2(alma + 0.1), r2(alma + 0.1 + t)];
    const brazoZ = [-121, zL1];
    const f = [
      box(`Brazo vertical ${t}×403×${r2(brazoZ[1] - brazoZ[0])}`,
        [r2((xPlaca[0] + xPlaca[1]) / 2), r2((-1175 + -772) / 2), brazoZ[0]], t, 403, r2(brazoZ[1] - brazoZ[0])),
    ];
    // 3 lengüetas plegadas apoyadas sobre la cara superior del larguero
    const alaX = lado < 0 ? [r2(xc - 12), xPlaca[0]] : [xPlaca[1], r2(xc + 12)];
    for (const [yA, conPerno] of [[yPernos[0], true], [yAlaCentral, false], [yPernos[1], true]]) {
      f.push(box(`Lengüeta ${r2(alaX[1] - alaX[0])}×60×${t}`,
        [r2((alaX[0] + alaX[1]) / 2), yA, zL1], r2(alaX[1] - alaX[0]), 60, t));
      f.push(hole(`Ø9 M8 lengüeta`, [xc, yA, r2(zL1 + t + 1)], [0, 0, -1], 9.0));
      if (conPerno) f.push(hole(`Ø10.13 perno de cuelgue`, [r2(xPlaca[0] - 1), yA, zPerno], [1, 0, 0], 10.13));
    }
    E.addPart(`FIJO · Placa de cuelgue NBT90 3/16"×403 con 3 lengüetas (${lado < 0 ? '−X' : '+X'})`,
      COL.chapaOsc, [r2((xPlaca[0] + xPlaca[1]) / 2), r2((-1175 + -772) / 2), brazoZ[0]], f,
      {
        fabricada: true,
        chapa: { t: r2(t), material: 'acero A36', fibra: [[0, brazoZ[0]], [0, zL1], [lado < 0 ? -50 : 50, zL1]], radio: r2(t) },
        nota: 'láser + plegado; APOYA sobre el larguero (la carga baja por apoyo); '
          + 'los pernos 3/8 pasan por las colisas de reglaje del side channel (X_nbt 60/403, ±8 de reglaje vertical)',
      });
    // tornillería del cuelgue
    for (const yA of yPernos) {
      const dirIn = [lado < 0 ? 1 : -1, 0, 0];
      const xCabeza = lado < 0 ? r2(xPlaca[0] - 1.6) : r2(xPlaca[1] + 1.6);
      pernoHex(E, {
        nombre: `3/8-16×1" cuelgue NBT90 (${lado < 0 ? '−X' : '+X'}, Y=${yA})`,
        at: [xCabeza, yA, zPerno], dir: dirIn, dia: 9.525, largo: 25.4,
        af: 14.29, altoCab: 5.94, capa: 'FIJO · ',
      });
      tuercaHex(E, {
        nombre: `3/8-16 cuelgue (${lado < 0 ? '−X' : '+X'}, Y=${yA})`,
        at: [lado < 0 ? r2(almaNeg + 2.657 + 2.7) : r2(almaPos - 2.657 - 2.7 - 8.1), yA, zPerno],
        dir: [1, 0, 0], dia: 9.525, af: 14.29, alto: 8.1, capa: 'FIJO · ',
      });
      golilla(E, {
        nombre: `3/8 cuelgue (${lado < 0 ? '−X' : '+X'}, Y=${yA})`,
        at: [lado < 0 ? r2(xPlaca[0] - 1.6) : r2(xPlaca[1]), yA, zPerno],
        dir: [1, 0, 0], dia: 9.6, esp: 1.6, capa: 'FIJO · ',
      });
    }
    // M8 de las lengüetas al larguero (tuerca T en la ranura superior)
    for (const yA of [...yPernos, yAlaCentral]) {
      pernoHex(E, { nombre: `M8×16 lengüeta (${lado < 0 ? '−X' : '+X'}, Y=${yA})`, at: [xc, yA, r2(zL1 + t)], dir: [0, 0, -1], dia: 8, largo: 12, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      M.tuercasT++;
    }

    // ---- 3. escuadras larguero ↔ bastidor (2 por lado) --------------------
    // Escuadra en L con el pliegue ABAJO: el larguero APOYA sobre el ala
    // inferior (la carga baja por apoyo, no por los tornillos). Los 2 M8 al
    // bastidor van a Z −70, POR ENCIMA de la cara superior del larguero
    // (−84.27): entre bastidor y larguero solo hay 3.4 mm y una cabeza no cabe.
    const xBast = lado < 0 ? STEP.frameIntNeg : STEP.frameIntPos;
    const zAlaInf = r2(zL0 - t);                       // −169.03: ala bajo el larguero
    for (const yE of [-1075, -905]) {
      const xAlaV = lado < 0 ? [r2(xBast + 0.1), r2(xBast + 0.1 + t)] : [r2(xBast - 0.1 - t), r2(xBast - 0.1)];
      const alaH = lado < 0 ? [xAlaV[1], r2(xc + 12)] : [r2(xc - 12), xAlaV[0]];
      E.addPart(`FIJO · Escuadra larguero↔bastidor 3/16" (${lado < 0 ? '−X' : '+X'}, Y=${yE})`,
        COL.chapaOsc, [r2((xAlaV[0] + xAlaV[1]) / 2), yE, zAlaInf],
        [box(`Ala vertical ${t}×60×${r2(-60 - zAlaInf)}`, [r2((xAlaV[0] + xAlaV[1]) / 2), yE, zAlaInf], t, 60, r2(-60 - zAlaInf)),
          box(`Ala horizontal ${r2(Math.abs(alaH[1] - alaH[0]))}×60×${t}`,
            [r2((alaH[0] + alaH[1]) / 2), yE, zAlaInf], r2(Math.abs(alaH[1] - alaH[0])), 60, t),
          hole(`Ø9 M8 bastidor`, [r2(xAlaV[0] - 1), yE - 18, -70], [1, 0, 0], 9.0),
          hole(`Ø9 M8 bastidor`, [r2(xAlaV[0] - 1), yE + 18, -70], [1, 0, 0], 9.0),
          hole(`Ø9 M8 larguero`, [xc, yE, r2(zAlaInf - 1)], [0, 0, 1], 9.0)],
        {
          fabricada: true,
          chapa: { t: r2(t), material: 'acero A36', fibra: [[0, -60], [0, zL0], [lado < 0 ? 40 : -40, zL0]], radio: r2(t) },
          nota: 'pliegue abajo: el larguero apoya sobre el ala inferior; 2 M8 ROSCADOS al chapón del bastidor (taladros nuevos a Z −70, modificación declarada) + 1 M8 hacia arriba a tuerca T de la ranura inferior del larguero',
        });
      pernoHex(E, { nombre: `M8×16 escuadra↔larguero (${lado < 0 ? '−X' : '+X'}, Y=${yE})`, at: [xc, yE, zAlaInf], dir: [0, 0, 1], dia: 8, largo: 14, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      for (const dy of [-18, 18]) {
        pernoHex(E, { nombre: `M8×20 escuadra↔bastidor (${lado < 0 ? '−X' : '+X'}, Y=${yE + dy})`, at: [lado < 0 ? r2(xAlaV[1]) : r2(xAlaV[0]), r2(yE + dy), -70], dir: [lado < 0 ? -1 : 1, 0, 0], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      }
      M.tuercasT++;
    }
  }

  // ---- 4. travesaños ------------------------------------------------------
  // Se quedan a 11.4 de cada bastidor: en ese hueco entran el ala de 3/16" de
  // su escuadra y la cabeza del M8 roscado al chapón.
  const xTrav = [r2(STEP.frameIntNeg + 11.42), r2(STEP.frameIntPos - 11.42)];   // [−70, 488]
  for (const [yRange, nom] of [[PERCHA.travS, 'sur'], [PERCHA.travN, 'norte']]) {
    // sección 80 (Y) × 40 (Z): perfilRanurado extruye en Y, así que aquí el
    // perfil se modela como box directo con ranuras arriba y abajo (correr en X)
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
      { catalogo: 'perfil ranurado 40×80 ranura 8 serie 40 (web PERF-001)', nota: `sostiene los 5 puentes de calle${nom === 'sur' ? ' y las pletinas del tensor V2' : ' y las pletinas de V3'}` });

    // escuadras travesaño ↔ bastidor (en los extremos)
    for (const lado of [-1, 1]) {
      const xBast = lado < 0 ? STEP.frameIntNeg : STEP.frameIntPos;
      const xAlaV = lado < 0 ? [r2(xBast + 0.1), r2(xBast + 0.1 + t)] : [r2(xBast - 0.1 - t), r2(xBast - 0.1)];
      const alaH = lado < 0 ? [xAlaV[1], r2(xAlaV[1] + 60)] : [r2(xAlaV[0] - 60), xAlaV[0]];
      E.addPart(`FIJO · Escuadra travesaño↔bastidor 3/16" (${nom}, ${lado < 0 ? '−X' : '+X'})`,
        COL.chapaOsc, [r2((xAlaV[0] + xAlaV[1]) / 2), yc, z1],
        [box(`Ala vertical ${t}×60×45`, [r2((xAlaV[0] + xAlaV[1]) / 2), yc, r2(z1 - 45 + t)], t, 60, 45),
          box(`Ala horizontal 60×60×${t}`, [r2((alaH[0] + alaH[1]) / 2), yc, z1], 60, 60, t),
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

  // ---- métricas de la percha ---------------------------------------------
  // Capacidad del cuelgue: la carga baja por APOYO de 6 lengüetas (3 por lado)
  // sobre los largueros; los 4 pernos 3/8 fijan. Comprobación simple (A36):
  const areaApoyo = 6 * 12 * 60;                          // mm² (lengüeta sobre perfil)
  const masa = NBT.masaKg;
  M.cuelgue = {
    masaNbt90Kg: masa,
    pernos38: 4, apoyoLenguetas: 6,
    presionApoyoMPa: r2(masa * 9.80665 / areaApoyo),      // ≈ 0.26 MPa, trivial
    cortantePorPernoN: r2(masa * 9.80665 / 4),
    cortanteAdmisiblePernoN: r2(0.6 * 379 * 50.0),        // Gr2: 0.6·Sp·As (web HW-007)
  };
  M.flechaLargueroMm = r2(
    // 3 cargas puntuales ≈ carga central equivalente F·L³/(48EI); perfil 40×80
    // vertical: I ≈ 104 cm⁴ (catálogo item 8 40×80 natural, web PERF-001)
    (masa / 2 * 9.80665) * Math.pow(PERCHA.largueroY[1] - PERCHA.largueroY[0], 3)
    / (48 * 70000 * 104e4),
  );
  M.piezas = E.parts.length - M.piezas0;
  return M;
}
