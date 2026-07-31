// mod_tensor2.mjs — TENSOR NEUMÁTICO DE BRAZOS POR BANDA (5 brazos, eje pivote
// común asegurado, un cilindro común con reparto por resortes).
//
// Instrucción literal del cliente (31-07-2026):
//   «TERMINA EL TENSOR NEUMÁTICO QUE TIENE BRAZOS POR CADA BANDA.
//    ASEGURA SU EJE PIVOTE.»
//
// Lo que monta este módulo:
//   POR CALLE (×5): brazo basculante de horquilla (2 pletinas + cubo), 2
//     casquillos de fricción con brida, polea tensora Ø117.9 con su eje, sus
//     2 rodamientos y sus anillos, bulón del lóbulo del yugo y su resorte.
//   COMÚN (×1): eje pivote Ø25 asegurado (2 chumaceras UCFL 205, 4 separadores,
//     2 collares de apriete, 2 anillos DIN 471-25), yugo de reparto con sus 2
//     columnas guía, y el cilindro SMC CD85N25-80 con su bisagra C85C25, su
//     rótula KJ10D, su regulador AS2201FS-01-06S, su silenciador AN101-01 y su
//     racor KQ2L06-01AS.
//
// Cotas, fuerzas y procedencias: params_tensor2.mjs. Capas: FIJO = pieza nueva
// o reubicada funcional; CTX (contexto) = pieza del cliente en pose medida.

import {
  box, cyl, hole, sketchYZ, COL, r2, pernoHex, tuercaHex, golilla, rodamiento, anilloRet,
} from '../../nbt90/lib.mjs';
import { EJES, STEP } from './params_adapt.mjs';
import { GEO, PALANCA, NEUM, RESORTE, YUGO, PIV, EJE_CALC, POL, RAMAL, TENSION } from './params_tensor2.mjs';

// ---------------------------------------------------------------------------
// Envolvente convexa de discos en el plano YZ (silueta de chapa recortada).
// Mismo criterio que mod_calles: la pieza real se define por sus zonas
// funcionales (pivote, polea, lóbulo) y el contorno es su envolvente.
// ---------------------------------------------------------------------------
function hullDiscos(discos, n = 36) {
  const pts = [];
  for (const [cy, cz, r] of discos) {
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * i / n;
      pts.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of pts) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (const p of [...pts].reverse()) {
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop();
    hi.push(p);
  }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

/** Lee la geometría del ramal de params_tambores.mjs si el otro agente ya lo
 *  publicó; si no, se queda con los valores por defecto DECLARADOS de RAMAL.
 *  Devuelve además de dónde salió cada número, para que quede en el informe. */
export async function leerRamal() {
  const usado = { z: RAMAL.z, abrazadoDeg: RAMAL.abrazadoDeg, abrazadoMotrizDeg: TENSION.abrazadoMotrizDeg };
  const origen = { fuente: 'params_tensor2.RAMAL (dis, por defecto)', tambores: false };
  try {
    const M = await import('./params_tambores.mjs');
    const R = M.RETORNO || M.RAMAL || M.default?.RETORNO || M.default?.RAMAL;
    if (R) {
      if (typeof R.z === 'number') usado.z = R.z;
      if (typeof R.abrazadoTensorDeg === 'number') usado.abrazadoDeg = R.abrazadoTensorDeg;
      if (typeof R.abrazadoMotrizDeg === 'number') usado.abrazadoMotrizDeg = R.abrazadoMotrizDeg;
      origen.fuente = 'adapt/params_tambores.mjs (publicado por el módulo de tambores)';
      origen.tambores = true;
    }
  } catch { /* aún no existe: se sigue con los valores por defecto declarados */ }
  return { usado, origen };
}

// ---------------------------------------------------------------------------
export function tensor2(E, ramal) {
  const M = { piezas: 0, nuevas: {}, reuso: {} };
  const cuenta = (d, k, n) => { d[k] = (d[k] || 0) + n; };
  const cN = (k, n) => cuenta(M.nuevas, k, n);
  const cR = (k, n) => cuenta(M.reuso, k, n);
  const p0 = E.parts.length;

  const semiCubo = PIV.cubo.largo / 2;                 // 29
  const semiPila = semiCubo + PIV.casquillo.brida;     // 32
  const platE = 8;                                     // dis — espesor de pletina del brazo
  const platX = 25;                                    // dis — pletinas a ±25 del eje de calle
                                                       //   (luz interior 42 > 40 de la polea)

  // =========================================================================
  // A. EL EJE PIVOTE ASEGURADO  (la instrucción explícita del cliente)
  // =========================================================================
  // (a) el eje
  E.addPart(`FIJO · Eje pivote común Ø${PIV.d}×${PIV.largo} (5 brazos del tensor)`, COL.acero,
    [PIV.x0, PIV.y, PIV.z],
    [cyl(`Eje Ø${PIV.d}×${PIV.largo}`, [PIV.x0, PIV.y, PIV.z], [1, 0, 0], PIV.d, PIV.largo),
      // gargantas de los 2 anillos DIN 471-25, por FUERA de cada chumacera
      ...PIV.ucflX.map((x, i) => {
        const xg = i === 0 ? r2(x - PIV.voladizoAnillo / 2) : r2(x + PIV.voladizoAnillo / 2 - 1.35);
        return { id: `gar${i}`, name: `Garganta DIN 471-25`, shape: 'cylinder', op: 'cut',
          at: [xg, PIV.y, PIV.z], dir: [1, 0, 0], params: { dia: PIV.d - 2.2, h: 1.35 } };
      })],
    { fabricada: true, capaInfo: 'dis (Ø25 y pose: step §2.4)',
      nota: `${PIV.material}. ARTICULACIÓN FIJA: el eje NO gira (los 5 brazos giran sobre sus `
        + `casquillos), por eso los prisioneros de los UC 205 valen como anclaje — no hay par que los afloje. `
        + `Vano entre chumaceras ${EJE_CALC.vano}; sobresale ${PIV.voladizoAnillo} de cada una para la garganta del anillo.` });
  cN(`eje pivote Ø${PIV.d}×${PIV.largo} (fabricado)`, 1);

  // (a) retención axial DEL EJE — doble: prisioneros del UC + anillos DIN 471
  for (const [i, x] of PIV.ucflX.entries()) {
    const lado = i === 0 ? '−X' : '+X';
    const xa = i === 0 ? r2(x - PIV.voladizoAnillo / 2) : r2(x + PIV.voladizoAnillo / 2 - 1.35);
    anilloRet(E, { nombre: `eje pivote ${lado}`, at: [xa, PIV.y, PIV.z], dir: [1, 0, 0], eje: PIV.d, capa: 'FIJO · ' });
    cN(`anillo ${PIV.anillo.norma} (retención de seguridad del eje)`, 1);
    // chumacera de brida ovalada
    const xh = i === 0 ? x : r2(x - PIV.ucfl.housingW);
    E.addPart(`FIJO · Chumacera ${PIV.ucfl.designacion} (eje pivote tensor, ${lado})`, COL.rodamiento,
      [xh, PIV.y, r2(PIV.z - 20)],
      [box(`Housing FL 205 ${PIV.ucfl.housingW}×${PIV.ucfl.alto}×40`,
        [r2(xh + PIV.ucfl.housingW / 2), PIV.y, r2(PIV.z - 20)], PIV.ucfl.housingW, PIV.ucfl.alto, 40),
      hole(`Bore UC Ø${PIV.d}`, [r2(xh - 5), PIV.y, PIV.z], [1, 0, 0], PIV.d),
      ...[-1, 1].map(s => hole(`Ø16 perno`, [r2(xh - 1), r2(PIV.y + s * PIV.ucfl.entreTaladros / 2), PIV.z], [1, 0, 0], 16))],
      { componente: 'UCFL205', norma: `${PIV.ucfl.designacion} — soporte de brida oval, eje ${PIV.d}, entre taladros ${PIV.ucfl.entreTaladros} · web BRG-003`,
        nota: `apoyo ${lado} del eje pivote contra la cara interior del chapón (X ${x} step). Brida ovalada `
          + `HORIZONTAL (según Y), como la chumacera medida del cliente en este mismo eje. Sus 2 prisioneros `
          + `sobre el aro interior son la RETENCIÓN DE SERVICIO del eje (axial y antigiro); el anillo ${PIV.anillo.norma} `
          + `de fuera es la de SEGURIDAD: si un prisionero se afloja, el anillo topa contra la cara del UC y el eje no sale.` });
    cN(`chumacera ${PIV.ucfl.designacion} (web BRG-003)`, 1);
    for (const s of [-1, 1]) {
      const yb = r2(PIV.y + s * PIV.ucfl.entreTaladros / 2);
      pernoHex(E, { nombre: `M12×45 UCFL pivote tensor ${lado} (Y=${yb})`, at: [r2(xh + PIV.ucfl.housingW), yb, PIV.z], dir: [-1, 0, 0], dia: 12, largo: 45, af: 19, altoCab: 7.5, capa: 'FIJO · ' });
      tuercaHex(E, { nombre: `M12 UCFL pivote tensor ${lado} (Y=${yb})`, at: [r2(xh - 28), yb, PIV.z], dir: [-1, 0, 0], dia: 12, af: 19, alto: 10.8, capa: 'FIJO · ' });
    }
  }

  // (b) retención axial DE LOS BRAZOS: 2 collares de apriete que capturan la pila
  for (const [i, x] of PIV.pilaX.entries()) {
    const lado = i === 0 ? '−X' : '+X';
    const xc = i === 0 ? r2(x - PIV.collar.largo) : x;
    E.addPart(`FIJO · Collar de apriete Ø${PIV.collar.de}×${PIV.collar.largo} (tope de la pila de brazos, ${lado})`, COL.inox,
      [xc, PIV.y, PIV.z],
      [cyl(`Collar Ø${PIV.collar.de}×${PIV.collar.largo}`, [xc, PIV.y, PIV.z], [1, 0, 0], PIV.collar.de, PIV.collar.largo),
        hole(`Ø${PIV.collar.di}`, [r2(xc - 1), PIV.y, PIV.z], [1, 0, 0], PIV.collar.di)],
      { componente: 'collar_apriete_25', norma: PIV.collarDesignacion,
        nota: `TOPE de la pila brazo–separador–…–brazo (cara ${lado} en X ${x}). Con los 4 separadores fija el `
          + `paso 76.2 y deja el paquete SIN juego axial: ningún brazo puede correrse a lo largo del eje. `
          + `Partido y con tornillo de apriete para poder montarlo sin desmontar las chumaceras.` });
    cN('collar de apriete Ø25 (tope de pila)', 1);
  }
  // 4 separadores entre brazos consecutivos
  for (let k = 0; k < EJES.length - 1; k++) {
    const xs = r2(EJES[k] + semiPila);
    E.addPart(`FIJO · Separador Ø${PIV.separador.de}×${PIV.separador.largo} (pila del pivote, calles ${k + 1}–${k + 2})`, COL.acero,
      [xs, PIV.y, PIV.z],
      [cyl(`Separador Ø${PIV.separador.de}×${PIV.separador.largo}`, [xs, PIV.y, PIV.z], [1, 0, 0], PIV.separador.de, PIV.separador.largo),
        hole(`Ø${PIV.separador.di}`, [r2(xs - 1), PIV.y, PIV.z], [1, 0, 0], PIV.separador.di)],
      { fabricada: true,
        nota: `casquillo separador: ${PIV.cubo.largo} de cubo + 2×${PIV.casquillo.brida} de brida de casquillo `
          + `+ ${PIV.separador.largo} de separador = 76.2 = paso EXACTO (calc). Topa contra las BRIDAS de los `
          + `casquillos de fricción, que son las caras de empuje axial del brazo.` });
    cN('separador de pila Ø30 (fabricado)', 1);
  }

  // =========================================================================
  // B. EL YUGO DE REPARTO + sus columnas guía
  // =========================================================================
  const yugoXc = r2((YUGO.x[0] + YUGO.x[1]) / 2);
  E.addPart(`FIJO · Yugo de reparto ${YUGO.largo}×${YUGO.secY}×${YUGO.secZ} (barra de los 5 resortes)`, COL.fijo,
    [yugoXc, YUGO.y, r2(YUGO.z - YUGO.secZ / 2)],
    [box(`Barra ${YUGO.largo}×${YUGO.secY}×${YUGO.secZ}`, [yugoXc, YUGO.y, r2(YUGO.z - YUGO.secZ / 2)], YUGO.largo, YUGO.secY, YUGO.secZ),
      ...EJES.map((B, k) => hole(`Ø${RESORTE.guia} guía resorte calle ${k + 1}`, [B, YUGO.y, r2(YUGO.z - YUGO.secZ / 2 - 1)], [0, 0, 1], RESORTE.guia)),
      ...YUGO.guiaX.map((gx, i) => hole(`Ø${YUGO.guiaDia + 0.2} columna guía ${i + 1}`, [gx, YUGO.y, r2(YUGO.z - YUGO.secZ / 2 - 1)], [0, 0, 1], YUGO.guiaDia + 0.2))],
    { fabricada: true,
      nota: `barra de reparto: el cilindro tira de ELLA y ella precarga los 5 resortes. Cara superior en Z `
        + `${YUGO.topZ} = asiento inferior de los resortes. Flecha con las 5 cargas de ${RESORTE.precargaN} N: `
        + `${YUGO.flechaMm} mm (calc, apoyo en las 2 columnas). Excentricidad del cilindro respecto del centro: `
        + `${NEUM.excentricidadYugoMm} mm — la absorben las columnas.` });
  cN('yugo de reparto (fabricado)', 1);

  for (const [i, gx] of YUGO.guiaX.entries()) {
    E.addPart(`FIJO · Columna guía del yugo Ø${YUGO.guiaDia}×170 (${i === 0 ? '−X' : '+X'})`, COL.acero,
      [gx, YUGO.y, -430],
      [cyl(`Columna Ø${YUGO.guiaDia}×170`, [gx, YUGO.y, -430], [0, 0, 1], YUGO.guiaDia, 170)],
      { fabricada: true,
        nota: 'impide que el yugo bascule o gire: sólo le deja el grado de libertad vertical que el cilindro '
          + 'gobierna. Empotrada en su ménsula al bastidor; casquillo de deslizamiento en el yugo.' });
    cN('columna guía del yugo (fabricada)', 1);
    E.addPart(`FIJO · Ménsula de columna guía ${i === 0 ? '−X' : '+X'} (60×40×8)`, COL.chapa,
      [gx, YUGO.y, -438],
      [box('Ménsula 60×40×8', [gx, YUGO.y, -438], 60, 40, 8),
        hole(`Ø${YUGO.guiaDia}`, [gx, YUGO.y, -439], [0, 0, 1], YUGO.guiaDia)],
      { fabricada: true, nota: 'pletina de anclaje de la columna al bastidor inferior (LAT TOP). AVISO: LAT TOP '
        + 'está modelado como caja envolvente medida — verificar en obra la viga real bajo la ménsula.' });
    cN('ménsula de columna guía', 1);
  }

  // =========================================================================
  // C. EL CILINDRO COMÚN y su neumática (todo con designación citada)
  // =========================================================================
  const CX = NEUM.x;
  E.addPart(`FIJO · Cilindro ${NEUM.designacion} Ø${NEUM.calibre} carrera ${NEUM.carrera} (común a los 5 brazos)`, COL.neumatica,
    [CX, NEUM.y ?? GEO.yugoY, NEUM.cuerpoZ0],
    [cyl(`Camisa Ø${NEUM.cuerpoDia}×${NEUM.cuerpoLargo}`, [CX, GEO.yugoY, NEUM.cuerpoZ0], [0, 0, 1], NEUM.cuerpoDia, NEUM.cuerpoLargo),
      cyl(`Vástago Ø${NEUM.vastago}×${r2(NEUM.cuerpoZ0 - YUGO.z)}`, [CX, GEO.yugoY, YUGO.z], [0, 0, 1], NEUM.vastago, r2(NEUM.cuerpoZ0 - YUGO.z))],
    { componente: 'CD85N25-80', norma: `${NEUM.designacion} — ISO 6432, doble efecto, vástago simple · web PNEU-001/002`,
      capaInfo: 'web (designación) + step (pose y camisa medidas)',
      nota: `UNO para las 5 calles y no cinco (dis): en TIRO da ${TENSION.fTiroEfN} N efectivos y sólo hacen falta `
        + `${TENSION.fPorBrazoN} N por brazo — cinco cilindros Ø25 darían ${TENSION.fTiroEfN} N a CADA brazo, `
        + `5× sobredimensionado y 5× la neumática. TRABAJA EN TIRO (retracción): el brazo es un balancín y `
        + `empujar hacia abajo AFLOJARÍA (calc). ${NEUM.falloSeguro}. PRESIÓN ${NEUM.hipotesis}.` });
  cN(`cilindro ${NEUM.designacion} (web PNEU-001)`, 1);

  E.addPart(`FIJO · Bisagra trasera ${NEUM.accesorios.bisagra} (anclaje del cilindro común)`, COL.neumatica,
    [CX, GEO.yugoY, -100],
    [box('Clevis C85C25 40×40×32', [CX, GEO.yugoY, -100], 40, 40, 32),
      hole('Ø8 articulación', [r2(CX - 21), GEO.yugoY, -90], [1, 0, 0], 8)],
    { componente: 'C85C25', norma: `${NEUM.accesorios.bisagra} — bisagra trasera (clevis) para C85 Ø20/25 · web PNEU-007`,
      capaInfo: 'web (designación) + step (pose medida en la calle 1)',
      nota: 'el kit del cliente, replicado UNA sola vez (antes iba uno por calle): con un cilindro común sólo hay '
        + 'un anclaje. Cuelga de la cabecera FRONT TOP2; el cuerpo del cilindro queda por debajo y el vástago baja al yugo.' });
  cR(`bisagra ${NEUM.accesorios.bisagra} (1 del STEP)`, 1);

  E.addPart(`FIJO · Rótula de vástago ${NEUM.accesorios.rotula} (vástago ↔ yugo)`, COL.neumatica,
    [CX, GEO.yugoY, r2(YUGO.z - 8)],
    [box('Horquilla KJ10D 19×17×36', [CX, GEO.yugoY, r2(YUGO.z - 8)], 19, 17, 36),
      hole('Ø10 bulón', [r2(CX - 12), GEO.yugoY, YUGO.z], [1, 0, 0], 10)],
    { componente: 'KJ10D', norma: `${NEUM.accesorios.rotula} — horquilla de vástago con rótula, rosca M10×1.25, bulón y seguro ISO 8140 · web PNEU-006`,
      capaInfo: 'web (designación) + step (Ø10 y M10×1.25 contrastados)',
      nota: 'toma el yugo por su bulón Ø10. Es RÓTULA (casquetes esféricos medidos): admite el pequeño desalineado '
        + 'que introduce la excentricidad del cilindro respecto del centro del yugo.' });
  cR(`rótula ${NEUM.accesorios.rotula} (1 del STEP)`, 1);

  E.addPart(`FIJO · Regulador de caudal ${NEUM.accesorios.regulador} (meter-out, puerto de tiro)`, COL.neumatica,
    [CX, r2(GEO.yugoY + 20), r2(NEUM.cuerpoZ0 + NEUM.cuerpoLargo - 25)],
    [box('AS2201FS 26.3×43.6×22.9', [CX, r2(GEO.yugoY + 20), r2(NEUM.cuerpoZ0 + NEUM.cuerpoLargo - 25)], 26.3, 43.61, 22.9)],
    { componente: 'AS2201FS-01-06S', norma: `${NEUM.accesorios.regulador} — regulador de caudal codo, meter-out, R1/8, tubo Ø6 · web PNEU-004`,
      capaInfo: 'web (designación) + step (caja medida)',
      nota: 'meter-out en el puerto de TIRO: gobierna la velocidad con que el tensor toma la banda, para que no '
        + 'la golpee al arrancar. De las 4 unidades del cliente sólo hace falta 1 (un solo cilindro).' });
  cR(`regulador ${NEUM.accesorios.regulador} (1 de 4 del STEP)`, 1);

  E.addPart(`FIJO · Silenciador ${NEUM.accesorios.silenciador} (escape del puerto de empuje)`, COL.neumatica,
    [CX, r2(GEO.yugoY - 20), r2(NEUM.cuerpoZ0 + 12)],
    [cyl('Silenciador Ø11×22.8', [CX, r2(GEO.yugoY - 20), r2(NEUM.cuerpoZ0 + 12)], [0, -1, 0], 11, 22.8)],
    { componente: 'AN101-01', norma: `${NEUM.accesorios.silenciador} — silenciador serie AN, R1/8 · web PNEU-005`,
      capaInfo: 'web (designación, CONFIANZA BAJA) + step (caja medida)',
      nota: 'DECLARADO: la cita textual de catálogo de la serie AN no se obtuvo (web_facts PNEU-005 lo marca '
        + 'PENDIENTE); la identificación se apoya en la nomenclatura SMC AN1xx-01 y en la geometría medida.' });
  cR(`silenciador ${NEUM.accesorios.silenciador} (1 del STEP)`, 1);

  E.addPart(`FIJO · Racor codo ${NEUM.accesorios.racor} (puerto de empuje)`, COL.neumatica,
    [CX, r2(GEO.yugoY - 14), r2(NEUM.cuerpoZ0 + 12)],
    [box('KQ2L06 16×26.3×25', [CX, r2(GEO.yugoY - 14), r2(NEUM.cuerpoZ0 + 12)], 16, 26.3, 25)],
    { componente: 'KQ2L06-01AS', norma: `${NEUM.accesorios.racor} — codo instantáneo macho R1/8 ↔ tubo Ø6 · web PNEU-008`,
      nota: 'tubo PU Ø6 a la válvula del cliente' });
  cR(`racor ${NEUM.accesorios.racor} (web PNEU-008)`, 1);

  // =========================================================================
  // D. POR CALLE (×5): brazo, casquillos, polea tensora, bulón y resorte
  // =========================================================================
  const silueta = hullDiscos([
    [GEO.pivoteY, GEO.pivoteZ, PIV.cubo.de / 2],
    [GEO.poleaY, GEO.poleaZ, 30],
    [GEO.yugoY, GEO.lobuloZ, 20],
  ]);

  EJES.forEach((B, k) => {
    const c = `calle ${k + 1}, X=${B}`;

    // --- brazo: 2 pletinas en horquilla ------------------------------------
    for (const s of [-1, 1]) {
      const xFace = s > 0 ? r2(B + platX + platE / 2) : r2(B - platX + platE / 2);
      E.addPart(`FIJO · Brazo tensor e=${platE} (${s > 0 ? '+X' : '−X'}) (${c})`, COL.chapa,
        [xFace, GEO.pivoteY, GEO.pivoteZ],
        [sketchYZ('Silueta del brazo (hull pivote–polea–lóbulo)', xFace, silueta, platE),
          hole(`Ø${PIV.cubo.de} paso del cubo`, [r2(xFace + 1), GEO.pivoteY, GEO.pivoteZ], [-1, 0, 0], PIV.cubo.de),
          hole(`Ø${POL.eje.d} eje de la polea`, [r2(xFace + 1), GEO.poleaY, GEO.poleaZ], [-1, 0, 0], POL.eje.d),
          hole('Ø10 bulón del lóbulo', [r2(xFace + 1), GEO.yugoY, GEO.lobuloZ], [-1, 0, 0], 10)],
        { fabricada: true, capaInfo: 'dis (poses de las 3 zonas: step)',
          nota: `pletina A36 e=${platE}, corte láser. BALANCÍN: el lóbulo del yugo cae a +Y del pivote `
            + `(palanca ${PALANCA.yugo}) y la polea a −Y (palanca ${PALANCA.polea}) → ventaja mecánica `
            + `×${PALANCA.ratio} (calc). Las dos pletinas van soldadas al cubo y forman la horquilla que `
            + `abraza la polea de ${POL.ancho} de ancho.` });
      cN('brazo tensor (pletina fabricada)', 1);
    }

    // --- cubo del brazo ----------------------------------------------------
    E.addPart(`FIJO · Cubo del brazo Ø${PIV.cubo.de}×${PIV.cubo.largo} (${c})`, COL.acero,
      [r2(B - semiCubo), GEO.pivoteY, GEO.pivoteZ],
      [cyl(`Cubo Ø${PIV.cubo.de}×${PIV.cubo.largo}`, [r2(B - semiCubo), GEO.pivoteY, GEO.pivoteZ], [1, 0, 0], PIV.cubo.de, PIV.cubo.largo),
        hole(`Ø${PIV.cubo.bore} H7 (asiento de casquillos)`, [r2(B - semiCubo - 1), GEO.pivoteY, GEO.pivoteZ], [1, 0, 0], PIV.cubo.bore)],
      { fabricada: true,
        nota: `tubo mecanizado Ø${PIV.cubo.de}, bore Ø${PIV.cubo.bore} H7 para los 2 casquillos. Largo ${PIV.cubo.largo}: `
          + `con las 2 bridas y el separador cierra el paso 76.2 EXACTO (calc). Soldado a las 2 pletinas del brazo.` });
    cN('cubo del brazo (fabricado)', 1);

    // --- (c) los 2 casquillos de fricción con brida ------------------------
    for (const s of [-1, 1]) {
      const xb = s < 0 ? r2(B - semiCubo) : r2(B + semiCubo - PIV.casquillo.largo);
      const xf = s < 0 ? r2(B - semiPila) : r2(B + semiCubo);
      E.addPart(`FIJO · Casquillo de fricción Ø${PIV.casquillo.di}/Ø${PIV.casquillo.de}×${PIV.casquillo.largo} con brida (${s < 0 ? '−X' : '+X'}) (${c})`, COL.uretano,
        [xb, GEO.pivoteY, GEO.pivoteZ],
        [cyl(`Casquillo Ø${PIV.casquillo.de}×${PIV.casquillo.largo}`, [xb, GEO.pivoteY, GEO.pivoteZ], [1, 0, 0], PIV.casquillo.de, PIV.casquillo.largo),
          cyl(`Brida Ø${PIV.casquillo.bridaDe}×${PIV.casquillo.brida}`, [xf, GEO.pivoteY, GEO.pivoteZ], [1, 0, 0], PIV.casquillo.bridaDe, PIV.casquillo.brida),
          hole(`Ø${PIV.casquillo.di}`, [r2(xb - 4), GEO.pivoteY, GEO.pivoteZ], [1, 0, 0], PIV.casquillo.di)],
        { componente: 'casquillo_friccion_25x32x25', norma: PIV.casquilloDesignacion,
          nota: `los brazos giran LIBRES sobre el eje (no son solidarios a él): así cada banda compensa su propio `
            + `desgaste. Dos casquillos por brazo, uno en cada boca del cubo → base ancha, el brazo no cabecea. `
            + `Presión de apoyo con R = ${TENSION.reaccionPivoteN} N: ${r2(TENSION.reaccionPivoteN / (PIV.casquillo.di * PIV.casquillo.largo * 2) * 100) / 100} MPa `
            + `(calc) — dos órdenes por debajo de lo admisible (≥ 5 MPa). La BRIDA es la cara de empuje axial.` });
      cN('casquillo de fricción con brida', 1);
    }

    // --- polea tensora + su eje, rodamientos y anillos ---------------------
    E.addPart(`FIJO · Polea tensora POL-CON-TEN Ø${POL.dia}×${POL.ancho} (${c})`, COL.polea,
      [r2(B - POL.ancho / 2), GEO.poleaY, GEO.poleaZ],
      [cyl(`Llanta Ø${POL.dia}×${POL.ancho}`, [r2(B - POL.ancho / 2), GEO.poleaY, GEO.poleaZ], [1, 0, 0], POL.dia, POL.ancho),
        hole(`Alojamiento Ø${POL.rodamiento.od}`, [r2(B - POL.ancho / 2 - 1), GEO.poleaY, GEO.poleaZ], [1, 0, 0], POL.rodamiento.od)],
      { contextoInfo: 'pieza del cliente reubicada', capaInfo: 'step §4.5',
        nota: `la tensora del cliente (Ø${POL.dia}×${POL.ancho} medida) reutilizada, una por calle. Apoya en el `
          + `ramal de retorno (Z ${ramal.usado.z}) con abrazado ${ramal.usado.abrazadoDeg}° → recibe `
          + `N = ${TENSION.nPoleaN} N y pone T = ${TENSION.tDe(ramal.usado.abrazadoDeg)} N en la banda (calc).` });
    cR('polea tensora POL-CON-TEN (del cliente)', 1);

    E.addPart(`FIJO · Eje de polea tensora Ø${POL.eje.d}×${POL.eje.largo} (${c})`, COL.acero,
      [r2(B - POL.eje.largo / 2), GEO.poleaY, GEO.poleaZ],
      [cyl(`Eje Ø${POL.eje.d}×${POL.eje.largo}`, [r2(B - POL.eje.largo / 2), GEO.poleaY, GEO.poleaZ], [1, 0, 0], POL.eje.d, POL.eje.largo)],
      { fabricada: true, nota: `patrón del eje SCMRT906VCT del cliente (Ø${POL.eje.d}, step §2.4): pasa por las 2 `
        + 'pletinas del brazo y se retiene con tornillos de testa.' });
    cN('eje de polea tensora (fabricado)', 1);

    for (const s of [-1, 1]) {
      const xr = s < 0 ? r2(B - POL.ancho / 2) : r2(B + POL.ancho / 2 - POL.rodamiento.w);
      rodamiento(E, { nombre: `${POL.rodamiento.designacion} tensora ${s < 0 ? '−X' : '+X'} (${c})`,
        at: [xr, GEO.poleaY, GEO.poleaZ], dir: [1, 0, 0],
        bore: POL.rodamiento.bore, od: POL.rodamiento.od, w: POL.rodamiento.w, capa: 'FIJO · ' });
      anilloRet(E, { nombre: `${POL.anillo} tensora ${s < 0 ? '−X' : '+X'} (${c})`,
        at: [r2(s < 0 ? xr - 1.5 : xr + POL.rodamiento.w + 0.3), GEO.poleaY, GEO.poleaZ], dir: [1, 0, 0],
        eje: POL.eje.d, capa: 'FIJO · ' });
    }

    // --- bulón del lóbulo + resorte de compensación ------------------------
    E.addPart(`FIJO · Bulón del lóbulo Ø10×${r2(2 * platX + platE + 6)} (${c})`, COL.acero,
      [r2(B - platX - platE / 2 - 3), GEO.yugoY, GEO.lobuloZ],
      [cyl(`Bulón Ø10×${r2(2 * platX + platE + 6)}`, [r2(B - platX - platE / 2 - 3), GEO.yugoY, GEO.lobuloZ], [1, 0, 0], 10, r2(2 * platX + platE + 6))],
      { fabricada: true, nota: 'asiento SUPERIOR del resorte: el resorte empuja este bulón hacia arriba y el brazo gira.' });
    cN('bulón del lóbulo del yugo', 1);

    E.addPart(`FIJO · Resorte de compensación k=${RESORTE.k} N/mm (${c})`, COL.inox,
      [B, GEO.yugoY, YUGO.topZ],
      [cyl(`Resorte Ø${RESORTE.diaExt}×${RESORTE.largoMontado}`, [B, GEO.yugoY, YUGO.topZ], [0, 0, 1], RESORTE.diaExt, RESORTE.largoMontado),
        hole(`Ø${RESORTE.guia + 1} vástago guía`, [B, GEO.yugoY, r2(YUGO.topZ - 1)], [0, 0, 1], RESORTE.guia + 1)],
      { componente: 'resorte_compresion_2Nmm', norma: RESORTE.designacion,
        nota: `LA COMPENSACIÓN INDIVIDUAL: comprimido de ${RESORTE.largoLibre} a ${RESORTE.largoMontado} da `
          + `${RESORTE.precargaN} N, justo la fuerza que le toca a este brazo. Blando a propósito (k=${RESORTE.k}): `
          + `${RESORTE.toleranciaMm} mm de diferencia de longitud entre bandas sólo mueve la fuerza `
          + `±${RESORTE.deltaFpor10mm} N (calc). Con un eje de torsión rígido, en cambio, la banda más tensa `
          + `mandaría y las otras cuatro quedarían flojas.` });
    cN('resorte de compensación', 1);

    E.addPart(`FIJO · Vástago guía del resorte Ø${RESORTE.guia}×${r2(RESORTE.largoMontado + 10)} (${c})`, COL.acero,
      [B, GEO.yugoY, r2(YUGO.topZ - 5)],
      [cyl(`Vástago Ø${RESORTE.guia}×${r2(RESORTE.largoMontado + 10)}`, [B, GEO.yugoY, r2(YUGO.topZ - 5)], [0, 0, 1], RESORTE.guia, r2(RESORTE.largoMontado + 10))],
      { fabricada: true, nota: 'solidario al yugo; impide que el resorte pandee.' });
    cN('vástago guía de resorte', 1);
  });

  M.piezas = E.parts.length - p0;
  M.arquitectura = {
    brazos: EJES.length,
    cilindros: NEUM.nCilindros,
    modo: NEUM.modo,
    reparto: 'yugo + 5 resortes (precarga global, compensación individual)',
    brazosSolidariosAlEje: false,
    ejeGira: PIV.giraElEje,
  };
  M.ejePivote = {
    designacion: `Ø${PIV.d}×${PIV.largo} ${PIV.material}`,
    vano: EJE_CALC.vano,
    apoyos: `2 × ${PIV.ucfl.designacion}`,
    retencionEje: `prisioneros de los 2 UC 205 (servicio) + 2 anillos ${PIV.anillo.norma} por fuera (seguridad)`,
    retencionBrazos: `2 collares de apriete + ${EJES.length - 1} separadores Ø${PIV.separador.de}×${PIV.separador.largo}`,
    giro: `2 casquillos de fricción Ø${PIV.casquillo.di}/Ø${PIV.casquillo.de}×${PIV.casquillo.largo} por brazo`,
    pasoCerrado: r2(PIV.cubo.largo + 2 * PIV.casquillo.brida + PIV.separador.largo),
  };
  M.ramal = ramal;
  return M;
}
