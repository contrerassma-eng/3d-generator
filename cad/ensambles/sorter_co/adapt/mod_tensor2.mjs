// mod_tensor2.mjs — TENSOR NEUMÁTICO DE BRAZOS POR BANDA.
//
// Instrucción del cliente (31-07-2026), ya cerrada tras sus dos precisiones:
//   «TERMINA EL TENSOR NEUMÁTICO QUE TIENE BRAZOS POR CADA BANDA.
//    ASEGURA SU EJE PIVOTE.»
//   «Lo único común es el eje del pivote. Nada más.»
//
// ARQUITECTURA:
//   · UN eje pivote común, que atraviesa los 5 brazos y se amarra al bastidor.
//     Es sólo la LÍNEA DE ARTICULACIÓN: no transmite par, no lleva brazos
//     solidarios. Y queda ASEGURADO (§A).
//   · CINCO brazos independientes, cada uno girando libre sobre ese eje con 2
//     casquillos de fricción.
//   · CINCO cilindros, uno por brazo, cada uno con su bisagra trasera, su
//     rótula, su regulador de caudal y su silenciador. Cada banda se tensa
//     SOLA, sin que las demás la afecten.
//   · UN regulador de PRESIÓN común a la rama: fija los 4.0 bar de trabajo y
//     con ello garantiza que las 5 bandas queden a la misma tensión.
//
// Cotas, fuerzas y procedencias: params_tensor2.mjs. Capas: FIJO = pieza nueva
// o reubicada funcional; CTX (contexto) = pieza del cliente en pose medida.

import {
  box, cyl, hole, sketchYZ, COL, r2, pernoHex, tuercaHex, rodamiento, anilloRet,
} from '../../nbt90/lib.mjs';
import { EJES } from './params_adapt.mjs';
import { GEO, PALANCA, NEUM, PIV, EJE_CALC, POL, RAMAL, TENSION, SOPORTE, SOPORTE_CALC } from './params_tensor2.mjs';
// A2 (revisión de fabricación 2026-08-03): la garganta del anillo sale de la
// TABLA DIN 471 citada (web RING-471-01/02), no de `PIV.d − 2.5`.
import { gargantaDIN471 } from './util_adapt.mjs';

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
 *  publicó; si no, se queda con los valores por defecto DECLARADOS de RAMAL. */
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
  // A. EL EJE PIVOTE COMÚN, ASEGURADO  (instrucción explícita del cliente)
  // =========================================================================
  // A2 · GARGANTA DE TABLA. Aquí ponía `dia: PIV.d − 2.5, h: 1.5`: fondo Ø27.5
  // (1.10 mm de más en Ø sobre el Ø28.6 de norma, o sea 0.55 por lado de
  // sobreprofundidad — el anillo trabajaba descentrado) y ancho 1.50 exacto
  // contra un anillo de 1.50, o sea CERO juego de montaje. Ahora sale de
  // `gargantaDIN471(30)` = Ø28.6 h12 × 1.60 H13, t = 0.7, y se centra sobre el
  // anillo dejando 0.05 por cara.
  const GP = gargantaDIN471(PIV.d);
  E.addPart(`FIJO · Eje pivote común Ø${PIV.d}×${PIV.largo} (articulación de los 5 brazos)`, COL.acero,
    [PIV.x0, PIV.y, PIV.z],
    [cyl(`Eje Ø${PIV.d}×${PIV.largo}`, [PIV.x0, PIV.y, PIV.z], [1, 0, 0], PIV.d, PIV.largo),
      ...PIV.anilloX.map((xg, i) => ({ id: `gar${i}`, name: `Garganta ${GP.desig} ${GP.cota}`, shape: 'cylinder', op: 'cut',
        at: [r2(xg - GP.juegoAxial / 2), PIV.y, PIV.z], dir: [1, 0, 0], params: { dia: GP.d2, h: GP.m } }))],
    { fabricada: true, capaInfo: 'dis (pose: step §2.4; Ø: calc)',
      gargantas: { norma: GP.desig, cota: GP.cota, t: GP.t, anilloS: GP.s, juegoAxial: GP.juegoAxial,
        fuente: 'web RING-471-01 (Aspen Fasteners, tabla DIN 471) + RING-471-02 (Ametric)' },
      ajusteMontaje: 'atraviesa los 10 casquillos de fricción, los 4 separadores, el collar y los 2 anillos '
        + 'DIN 471 alojados en sus gargantas: todos esos solapes son ENCAJE DE MONTAJE, no interferencia',
      nota: `${PIV.material}. LÍNEA DE ARTICULACIÓN: el eje NO gira y NO transmite par — los 5 brazos giran `
        + `libres sobre sus casquillos. Ø${PIV.d} y no el Ø25 medido del cliente (cambio declarado): con 5 `
        + `cilindros independientes la reacción por brazo sube a ${TENSION.reaccionPivoteN} N, y a Ø25 el eje `
        + `daría σ = 94.3 MPa y 1.26 mm de flecha; a Ø${PIV.d} queda en σ = ${EJE_CALC.sigmaMPa} MPa (FS `
        + `${EJE_CALC.fs} sobre C45) y ${EJE_CALC.flechaMm} mm. Vano entre chumaceras ${EJE_CALC.vano}.` });
  cN(`eje pivote Ø${PIV.d}×${PIV.largo} (fabricado)`, 1);

  // --- (a) retención axial DEL EJE: prisioneros del UC + anillos DIN 471 ----
  for (const [i, x] of PIV.ucflX.entries()) {
    const lado = i === 0 ? '−X' : '+X';
    anilloRet(E, { nombre: `eje pivote ${lado}`, at: [PIV.anilloX[i], PIV.y, PIV.z], dir: [1, 0, 0], eje: PIV.d, capa: 'FIJO · ' });
    cN(`anillo ${PIV.anillo.norma} (retención de seguridad del eje)`, 1);

    const xh = i === 0 ? x : r2(x - PIV.ucfl.housingW);
    E.addPart(`FIJO · Chumacera ${PIV.ucfl.designacion} (eje pivote tensor, ${lado})`, COL.rodamiento,
      [xh, PIV.y, r2(PIV.z - 20)],
      [box(`Housing FL 206 ${PIV.ucfl.housingW}×${PIV.ucfl.alto}×44`,
        [r2(xh + PIV.ucfl.housingW / 2), PIV.y, r2(PIV.z - 20)], PIV.ucfl.housingW, PIV.ucfl.alto, 44),
      hole(`Bore UC Ø${PIV.d}`, [r2(xh - 5), PIV.y, PIV.z], [1, 0, 0], PIV.d),
      ...[-1, 1].map(s => hole('Ø16 perno', [r2(xh - 1), r2(PIV.y + s * PIV.ucfl.entreTaladros / 2), PIV.z], [1, 0, 0], 16))],
      { componente: 'UCFL206', norma: `${PIV.ucfl.designacion} — soporte de brida oval, eje ${PIV.d}, entre taladros ${PIV.ucfl.entreTaladros}`,
        nota: `APOYO ${lado} del eje contra la cara interior del chapón (X ${x} step). Brida ovalada HORIZONTAL `
          + `(según Y), como la chumacera medida del cliente en este mismo eje. Sus 2 prisioneros sobre el aro `
          + `interior son la RETENCIÓN DE SERVICIO (axial y antigiro); el anillo ${PIV.anillo.norma} montado POR `
          + `DENTRO (X ${PIV.anilloX[i]}) es la de SEGURIDAD: si un prisionero se afloja, el anillo topa contra la `
          + `cara interior del UC y el eje no corre. Van hacia dentro y no hacia fuera porque a −X no hay sitio `
          + `(la caja del motorreductor del cliente llega a X −82.423, step); en pareja espejada bloquean los dos `
          + `sentidos igual. ${PIV.ucflNota}` });
    cN(`chumacera ${PIV.ucfl.designacion}`, 1);
    for (const s of [-1, 1]) {
      const yb = r2(PIV.y + s * PIV.ucfl.entreTaladros / 2);
      pernoHex(E, { nombre: `M12×45 UCFL pivote ${lado} (Y=${yb})`, at: [r2(xh + PIV.ucfl.housingW), yb, PIV.z], dir: [-1, 0, 0], dia: 12, largo: 45, af: 19, altoCab: 7.5, capa: 'FIJO · ' });
      tuercaHex(E, { nombre: `M12 UCFL pivote ${lado} (Y=${yb})`, at: [r2(xh - 28), yb, PIV.z], dir: [-1, 0, 0], dia: 12, af: 19, alto: 10.8, capa: 'FIJO · ' });
    }
  }

  // --- (b) retención axial DE LOS BRAZOS: 2 collares capturan la pila -------
  {
    const xc = PIV.collarX[0];
    E.addPart(`FIJO · Collar de apriete Ø${PIV.collar.de}×${PIV.collar.largo} (aprieta la pila de brazos, −X)`, COL.inox,
      [xc, PIV.y, PIV.z],
      [cyl(`Collar Ø${PIV.collar.de}×${PIV.collar.largo}`, [xc, PIV.y, PIV.z], [1, 0, 0], PIV.collar.de, PIV.collar.largo),
        hole(`Ø${PIV.collar.di}`, [r2(xc - 1), PIV.y, PIV.z], [1, 0, 0], PIV.collar.di)],
      { componente: 'collar_apriete_30', norma: PIV.collarDesignacion,
        ajusteMontaje: 'apriete sobre el eje pivote (unión por fricción)',
        nota: `APRIETA la pila brazo–separador–…–brazo contra el anillo ${PIV.anillo.norma} del lado +X, que hace `
          + `de tope. Va sólo en −X porque en +X, entre la cara de la pila (${PIV.pilaX[1]}) y la chumacera `
          + `(${r2(PIV.ucflX[1] - PIV.ucfl.housingW)}), sólo quedan 4.56 mm: el reparto de calles está corrido `
          + 'hacia +X y toda la holgura del eje cae en −X. Con los 4 separadores el paquete queda SIN juego '
          + 'axial: ningún brazo puede correrse. Partido, para montarlo sin desmontar las chumaceras.' });
    cN('collar de apriete Ø30 (aprieta la pila)', 1);
  }
  for (let k = 0; k < EJES.length - 1; k++) {
    const xs = r2(EJES[k] + semiPila);
    E.addPart(`FIJO · Separador Ø${PIV.separador.de}×${PIV.separador.largo} (pila del pivote, calles ${k + 1}–${k + 2})`, COL.acero,
      [xs, PIV.y, PIV.z],
      [cyl(`Separador Ø${PIV.separador.de}×${PIV.separador.largo}`, [xs, PIV.y, PIV.z], [1, 0, 0], PIV.separador.de, PIV.separador.largo),
        hole(`Ø${PIV.separador.di}`, [r2(xs - 1), PIV.y, PIV.z], [1, 0, 0], PIV.separador.di)],
      { fabricada: true,
        nota: `${PIV.cubo.largo} de cubo + 2×${PIV.casquillo.brida} de brida de casquillo + ${PIV.separador.largo} `
          + 'de separador = 76.2 = paso EXACTO (calc). Topa contra las BRIDAS de los casquillos, que son las '
          + 'caras de empuje axial del brazo.' });
    cN('separador de pila Ø38 (fabricado)', 1);
  }

  // =========================================================================
  // B. EL REGULADOR DE PRESIÓN — uno solo para toda la rama del tensor
  // =========================================================================
  E.addPart(`FIJO · Regulador de PRESIÓN ${NEUM.reguladorPresion} (rama del tensor, ${NEUM.presionTrabajoBar} bar)`, COL.neumatica,
    [NEUM.reguladorPresionX, NEUM.reguladorPresionY, NEUM.reguladorPresionZ],
    [box('AR20 40×40×90', [NEUM.reguladorPresionX, NEUM.reguladorPresionY, NEUM.reguladorPresionZ], 40, 40, 90),
      cyl('Manómetro Ø40', [NEUM.reguladorPresionX, r2(NEUM.reguladorPresionY - 20), r2(NEUM.reguladorPresionZ + 70)], [0, -1, 0], 40, 12)],
    { componente: 'AR20-02-B', norma: `${NEUM.reguladorPresion} — regulador de presión modular serie AR, R1/4 · web PNEU-009`,
      capaInfo: 'web (designación) — PIEZA NUEVA, no está en el STEP del cliente',
      nota: `ES LO QUE FIJA LA TENSIÓN. Hay que decirlo claro: el ${NEUM.accesorios.regulador} que el cliente ya `
        + `tiene es un regulador de CAUDAL (meter-out) y gobierna la VELOCIDAD del vástago, no la fuerza — no `
        + `puede fijar la tensión. Este AR20 pone la rama a ${NEUM.presionTrabajoBar} bar, que es lo que da los `
        + `${TENSION.tPorMmAncho} N/mm de banda. UNO SOLO para los 5 cilindros en paralelo: así las 5 bandas `
        + `reciben la misma presión y por tanto la misma tensión. Con manómetro, para ajustarlo en obra.` });
  cN(`regulador de presión ${NEUM.reguladorPresion} (web PNEU-009)`, 1);

  // =========================================================================
  // B-bis. EL SOPORTE DE LOS CILINDROS — «la placa frontal»
  // =========================================================================
  // Lo que faltaba y el cliente vio: las 5 bisagras traseras no tenían a qué
  // amarrarse. El cilindro NO lleva brida de nariz (bascula 10.2°, ver la
  // justificación en params_tensor2 §3-bis): va articulado por los dos
  // extremos, y lo que sostiene esas articulaciones es este travesaño.
  {
    const TR = SOPORTE.trav;
    const xc = r2((TR.x[0] + TR.x[1]) / 2), yc = r2((TR.y[0] + TR.y[1]) / 2);
    E.addPart(`FIJO · Travesaño frontal del tensor 40×40×${TR.esp} (L=${TR.luz}) — «placa frontal»`, COL.fijo,
      [xc, yc, TR.z[0]],
      [box(`Tubo 40×40 L=${TR.luz}`, [xc, yc, TR.z[0]], TR.luz, TR.perfil, TR.perfil),
        box(`Hueco del tubo (e=${TR.esp})`, [xc, yc, r2(TR.z[0] + TR.esp)],
          r2(TR.luz + 2), r2(TR.perfil - 2 * TR.esp), r2(TR.perfil - 2 * TR.esp), 'cut'),
        ...EJES.map((B, k) => hole(`Ø9 M8 ménsula calle ${k + 1} (−X)`, [r2(B - SOPORTE.mensula.semiX), r2(TR.y[0] - 1), -72], [0, 1, 0], 9)),
        ...EJES.map((B, k) => hole(`Ø9 M8 ménsula calle ${k + 1} (+X)`, [r2(B + SOPORTE.mensula.semiX), r2(TR.y[0] - 1), -72], [0, 1, 0], 9))],
      { fabricada: true,
        nota: `ESTO es la «placa frontal» que faltaba: cruza el cabezal de lado a lado y recibe las 5 bisagras `
          + `traseras. Se atornilla a las caras interiores de los DOS canales de costado del cliente `
          + `(X ${TR.x[0]} y ${TR.x[1]}, step), luz ${TR.luz}. Va DETRÁS del tambor motriz en Y (arranca en `
          + `${TR.y[0]}, el tambor acaba en 54.45) y por DEBAJO en Z (corona en ${TR.z[1]}, el tambor empieza en `
          + `−57.2): doble holgura, porque entre el fondo del tambor y la bisagra sólo hay 10.8 mm y ahí no cabe. `
          + `Carga ${SOPORTE_CALC.totalN} N (5 × ${SOPORTE_CALC.porBisagraN} N, el cilindro tira de su bisagra `
          + `hacia abajo) → flecha ${SOPORTE_CALC.flechaMm} mm, σ ${SOPORTE_CALC.sigmaMPa} MPa (FS ${SOPORTE_CALC.fs} sobre A36).` });
    cN('travesaño frontal del tensor (fabricado)', 1);

    // placas de extremo + tornillería a los canales de costado del cliente
    for (const [i, x] of TR.x.entries()) {
      const lado = i === 0 ? '−X' : '+X';
      const xp = i === 0 ? x : r2(x - 8);
      E.addPart(`FIJO · Placa de extremo del travesaño frontal (${lado}) 8×80×65`, COL.chapa,
        [r2(xp + 4), yc, r2(TR.z[0] - 20)],
        [box('Placa 8×80×65', [r2(xp + 4), yc, r2(TR.z[0] - 20)], 8, 80, 65),
          ...[-28, 28].map(dy => hole(`Ø9 M8 al cabezal (Y${dy > 0 ? '+' : ''}${dy})`, [r2(xp - 1), r2(yc + dy), r2(TR.z[0] + 20)], [1, 0, 0], 9))],
        { fabricada: true,
          nota: `suelda al travesaño y atornilla con 2 M8 al cabezal de rodamiento ${lado} del alargue PG40 `
            + `(X ${x}, adapt/params_pg40 PUBLICA.caraApoyo) — la misma placa que sostiene el tambor motriz. `
            + `INTERFAZ CON EL AGENTE DE PG40: 2 taladros Ø9 por cabezal, en Y ${r2(yc - 28)} y ${r2(yc + 28)}, `
            + `Z ${r2(TR.z[0] + 20)}. Corona en Z ${r2(TR.z[0] - 20 + 65)} para librar por 5.2 las tuercas M12 del `
            + `UCF 207 del tambor motriz, que ocupan Z −54.8…−42.8 en ese mismo cabezal (params_tambores).` });
      cN('placa de extremo del travesaño', 1);
      for (const dy of [-28, 28]) {
        pernoHex(E, { nombre: `M8×25 travesaño↔cabezal PG40 ${lado} (Y=${r2(yc + dy)})`, at: [r2(xp + (i === 0 ? -1 : 9)), r2(yc + dy), TR.z[0]], dir: [i === 0 ? -1 : 1, 0, 0], dia: 8, largo: 25, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      }
    }

    // soporte del regulador de PRESIÓN
    const RP = SOPORTE.regPresion;
    E.addPart('FIJO · Pletina soporte del regulador de presión AR20 (8×90×120)', COL.chapa,
      [RP.x, RP.y, RP.z],
      [box('Pletina 8×90×120', [RP.x, RP.y, RP.z], RP.placa[1], RP.placa[0], RP.placa[2]),
        ...[-30, 30].map(dy => hole(`Ø9 M8 al canal (Y${dy > 0 ? '+' : ''}${dy})`, [r2(RP.x - 5), r2(RP.y + dy), r2(RP.z + 100)], [1, 0, 0], 9))],
      { fabricada: true,
        nota: 'el AR20-02-B tenía designación y presión de trabajo pero no dónde ir montado. Va aquí: atornillada '
          + 'al canal de costado −X del cliente, fuera del reparto de calles y a la altura de la mano — el '
          + 'manómetro se lee y el mando se gira sin desmontar nada.' });
    cN('pletina soporte del regulador de presión', 1);
  }

  // =========================================================================
  // C. POR CALLE (×5): brazo, casquillos, polea tensora y SU PROPIO CILINDRO
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
      // OJO: sketchYZ extruye hacia +X desde xFace (su docstring dice −X, pero
      // `dir` es [1,0,0] y así lo leen bboxU, a_step.py y el visor). La cara de
      // partida es por tanto la de −X de cada pletina:
      //   −X → [B−29, B−21]   ·   +X → [B+21, B+29]
      // La polea ocupa [B−20, B+20]: 1 mm de aire a cada ala de la horquilla.
      const xFace = s > 0 ? r2(B + platX - platE / 2) : r2(B - platX - platE / 2);
      E.addPart(`FIJO · Brazo tensor e=${platE} (${s > 0 ? '+X' : '−X'}) (${c})`, COL.chapa,
        [xFace, GEO.pivoteY, GEO.pivoteZ],
        [sketchYZ('Silueta del brazo (hull pivote–polea–lóbulo)', xFace, silueta, platE),
          hole(`Ø${PIV.cubo.de} paso del cubo`, [r2(xFace - 1), GEO.pivoteY, GEO.pivoteZ], [1, 0, 0], PIV.cubo.de),
          hole(`Ø${POL.eje.d} eje de la polea`, [r2(xFace - 1), GEO.poleaY, GEO.poleaZ], [1, 0, 0], POL.eje.d),
          hole('Ø10 bulón de la rótula', [r2(xFace - 1), GEO.yugoY, GEO.lobuloZ], [1, 0, 0], 10)],
        { fabricada: true, capaInfo: 'dis (poses de las 3 zonas: step)',
          nota: `pletina A36 e=${platE}, corte láser. BALANCÍN: el lóbulo del cilindro cae a +Y del pivote `
            + `(palanca ${PALANCA.yugo}) y la polea a −Y (palanca ${PALANCA.polea}) → ventaja mecánica `
            + `×${PALANCA.ratio} (calc). Las dos pletinas van soldadas al cubo y forman la horquilla que abraza `
            + `la polea de ${POL.ancho} y, más arriba, la rótula del cilindro.` });
      cN('brazo tensor (pletina fabricada)', 1);
    }

    // --- cubo del brazo ----------------------------------------------------
    E.addPart(`FIJO · Cubo del brazo Ø${PIV.cubo.de}×${PIV.cubo.largo} (${c})`, COL.acero,
      [r2(B - semiCubo), GEO.pivoteY, GEO.pivoteZ],
      [cyl(`Cubo Ø${PIV.cubo.de}×${PIV.cubo.largo}`, [r2(B - semiCubo), GEO.pivoteY, GEO.pivoteZ], [1, 0, 0], PIV.cubo.de, PIV.cubo.largo),
        hole(`Ø${PIV.cubo.bore} H7 (asiento de casquillos)`, [r2(B - semiCubo - 1), GEO.pivoteY, GEO.pivoteZ], [1, 0, 0], PIV.cubo.bore)],
      { fabricada: true,
        nota: `tubo mecanizado Ø${PIV.cubo.de}, bore Ø${PIV.cubo.bore} H7 para los 2 casquillos. Largo `
          + `${PIV.cubo.largo}: con las 2 bridas y el separador cierra el paso 76.2 EXACTO (calc). Soldado a las `
          + '2 pletinas del brazo.' });
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
        { componente: 'casquillo_friccion_30x38x25', norma: PIV.casquilloDesignacion,
          hardware: true,
          ajusteMontaje: 'prensado H7/r6 en el cubo del brazo; el eje pivote pasa por su interior (H7/f7)',
          nota: 'el brazo gira LIBRE sobre el eje: no es solidario a él. Si lo fuera, los 5 brazos quedarían '
            + 'rígidamente acoplados entre sí y se perdería la independencia que los 5 cilindros compran. '
            + `Dos casquillos por brazo, uno en cada boca del cubo → base ancha, el brazo no cabecea. Presión `
            + `de apoyo con R = ${TENSION.reaccionPivoteN} N: ${EJE_CALC.presionCasquilloMPa} MPa (calc), muy por `
            + 'debajo de lo admisible (≥ 5 MPa). La BRIDA es la cara de empuje axial.' });
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
      { fabricada: true,
        ajusteMontaje: 'pasa por las 2 pletinas del brazo y por los 2 rodamientos W 6004-2Z (encaje de montaje)',
        nota: `patrón del eje SCMRT906VCT del cliente (Ø${POL.eje.d}, step §2.4): pasa por las 2 `
        + 'pletinas del brazo y se retiene con tornillos de testa.' });
    cN('eje de polea tensora (fabricado)', 1);

    for (const s of [-1, 1]) {
      const xr = s < 0 ? r2(B - POL.ancho / 2) : r2(B + POL.ancho / 2 - POL.rodamiento.w);
      rodamiento(E, { nombre: `${POL.rodamiento.designacion} tensora ${s < 0 ? '−X' : '+X'} (${c})`,
        at: [xr, GEO.poleaY, GEO.poleaZ], dir: [1, 0, 0],
        bore: POL.rodamiento.bore, od: POL.rodamiento.od, w: POL.rodamiento.w, capa: 'FIJO · ' });
      // los anillos van HACIA DENTRO del bore de la polea (antes caían sobre la
      // cara interior de la pletina del brazo y la mordían 0.5 mm)
      anilloRet(E, { nombre: `${POL.anillo} tensora ${s < 0 ? '−X' : '+X'} (${c})`,
        at: [r2(s < 0 ? xr + POL.rodamiento.w : xr - 1.5), GEO.poleaY, GEO.poleaZ], dir: [1, 0, 0],
        eje: POL.eje.d, capa: 'FIJO · ' });
    }

    // --- EL CILINDRO DE ESTA BANDA y sus 4 accesorios ----------------------
    const largoVastago = r2(NEUM.cuerpoZ0 - GEO.lobuloZ);
    E.addPart(`FIJO · Cilindro ${NEUM.designacion} Ø${NEUM.calibre} carrera ${NEUM.carrera} (${c})`, COL.neumatica,
      [B, NEUM.y, NEUM.cuerpoZ0],
      [cyl(`Camisa Ø${NEUM.cuerpoDia}×${NEUM.cuerpoLargo}`, [B, NEUM.y, NEUM.cuerpoZ0], [0, 0, 1], NEUM.cuerpoDia, NEUM.cuerpoLargo),
        cyl(`Vástago Ø${NEUM.vastago}×${largoVastago}`, [B, NEUM.y, GEO.lobuloZ], [0, 0, 1], NEUM.vastago, largoVastago)],
      { componente: 'CD85N25-80',
        ajusteMontaje: 'el fondo de la camisa encaja en la bisagra trasera C85C25 y los racores van ROSCADOS a sus puertos', norma: `${NEUM.designacion} — ISO 6432, doble efecto, vástago simple · web PNEU-001/002`,
        capaInfo: 'web (designación) + step (pose y camisa medidas)',
        nota: `UNO POR BANDA: esta banda se tensa SOLA, sin que las otras cuatro la afecten. TRABAJA EN TIRO `
          + `(retracción): el brazo es un balancín y empujar hacia abajo AFLOJARÍA (calc). Da `
          + `${TENSION.fTiroEfN} N efectivos a ${NEUM.presionTrabajoBar} bar → N = ${TENSION.nPoleaN} N en la `
          + `polea → T = ${TENSION.tPorBandaN} N = ${TENSION.tPorMmAncho} N/mm de banda. Se MANTIENE el Ø25 (ya `
          + `identificado y en poder del cliente) y se REGULA LA PRESIÓN a ${NEUM.presionTrabajoBar} bar en vez `
          + `de bajar el calibre: justificación en params_tensor2 §2. ${NEUM.falloSeguro}.` });
    cR(`cilindro ${NEUM.designacion} (web PNEU-001)`, 1);

    const tapaZ = r2(NEUM.cuerpoZ0 + NEUM.cuerpoLargo);       // −96.76 cara de la tapa
    const pinZ = r2(tapaZ + 24.76);                            // −72 eje del bulón trasero
    E.addPart(`FIJO · Bisagra trasera ${NEUM.accesorios.bisagra} (${c})`, COL.neumatica,
      [B, NEUM.y, tapaZ],
      [box('Clevis C85C25 40×40×32', [B, NEUM.y, tapaZ], 40, 40, 32),
        box(`Luz de horquilla ${SOPORTE.mensula.e + 1.1}`, [B, NEUM.y, r2(pinZ - 12)],
          r2(SOPORTE.mensula.e + 1.1), 44, 24, 'cut'),
        hole(`Ø${SOPORTE.bulonTrasero.d} articulación`, [r2(B - 21), NEUM.y, pinZ], [1, 0, 0], SOPORTE.bulonTrasero.d)],
      { componente: 'C85C25', norma: `${NEUM.accesorios.bisagra} — bisagra trasera (clevis) para C85 Ø20/25 · web PNEU-007`,
        capaInfo: 'web (designación) + step (pose medida en la calle 1)',
        ajusteMontaje: 'roscada sobre la tapa trasera del cilindro; su horquilla recibe la lengüeta de la ménsula',
        nota: `el kit del cliente replicado a las 5 calles (el STEP trae UNA). Se monta SOBRE la tapa trasera `
          + `(Z ${tapaZ}) y corona en ${r2(tapaZ + 32)}, librando el tambor motriz (fondo −57.2) por `
          + `${r2(-57.2 - (tapaZ + 32))} mm. Su luz de horquilla recibe la lengüeta de la ménsula y el bulón `
          + `Ø${SOPORTE.bulonTrasero.d} pasa por ambas: ES la articulación trasera del cilindro.` });
    cR(`bisagra ${NEUM.accesorios.bisagra} (1 del STEP + 4 nuevas)`, 1);

    // --- LA MÉNSULA que ata esa bisagra al travesaño frontal ---------------
    const MS = SOPORTE.mensula;
    E.addPart(`FIJO · Ménsula de bisagra — lengüeta e=${MS.e} (${c})`, COL.chapa,
      [B, r2((MS.yPunta + MS.yFrente) / 2), r2(pinZ - 13)],
      [box(`Lengüeta ${MS.e}×${r2(MS.yFrente - MS.yPunta)}×${MS.altoLenguar}`, [B, r2((MS.yPunta + MS.yFrente) / 2), r2(pinZ - 13)], MS.e, r2(MS.yFrente - MS.yPunta), MS.altoLenguar),
        box(`Base ${MS.baseAncho}×10×${MS.alto}`, [B, r2(MS.yFrente + 5), -100], MS.baseAncho, 10, MS.alto),
        hole(`Ø${SOPORTE.bulonTrasero.d} bulón`, [r2(B - MS.e), NEUM.y, pinZ], [1, 0, 0], SOPORTE.bulonTrasero.d),
        ...[-1, 1].map(sx => hole(`Ø9 M8 (${sx < 0 ? '−X' : '+X'})`, [r2(B + sx * MS.semiX), r2(MS.yFrente + 11), r2(pinZ - 8)], [0, -1, 0], 9))],
      { fabricada: true,
        nota: `pletina A36 en L: la LENGÜETA entra en la luz de la horquilla de la C85C25 y el bulón la pinza; `
          + `la BASE atornilla con 2 M8 a la cara frontal del travesaño. Es la pieza que faltaba entre la `
          + `bisagra y el bastidor. Voladizo ${r2(MS.yFrente - NEUM.y)} mm desde la cara del travesaño: `
          + `M = ${r2(TENSION.fTiroEfN * (MS.yFrente - NEUM.y))} N·mm sobre 2 secciones de ${MS.e}×${MS.alto} → σ despreciable.` });
    cN('ménsula de bisagra (fabricada)', 1);
    for (const sx of [-1, 1]) {
      pernoHex(E, { nombre: `M8×25 ménsula↔travesaño (${c}, ${sx < 0 ? '−X' : '+X'})`, at: [r2(B + sx * MS.semiX), r2(MS.yFrente + 16), r2(pinZ - 8)], dir: [0, -1, 0], dia: 8, largo: 25, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
    }
    // el BULÓN trasero y sus dos retenciones — sin esto la bisagra no ata nada
    E.addPart(`FIJO · Bulón trasero Ø${SOPORTE.bulonTrasero.d}×44 (${c})`, COL.acero,
      [r2(B - 22), NEUM.y, pinZ],
      [cyl(`Bulón Ø${SOPORTE.bulonTrasero.d}×44`, [r2(B - 22), NEUM.y, pinZ], [1, 0, 0], SOPORTE.bulonTrasero.d, 44)],
      { hardware: true, norma: SOPORTE.bulonTrasero.norma,
        ajusteMontaje: 'atraviesa las dos orejas de la horquilla C85C25 y la lengüeta de la ménsula',
        nota: 'la articulación trasera del cilindro. Retenido por 2 anillos, uno a cada lado.' });
    cN('bulón trasero Ø8', 1);
    for (const sx of [-1, 1]) {
      anilloRet(E, { nombre: `bulón trasero ${sx < 0 ? '−X' : '+X'} (${c})`,
        at: [r2(B + sx * 20.5 - (sx < 0 ? 0 : 1)), NEUM.y, pinZ], dir: [1, 0, 0], eje: SOPORTE.bulonTrasero.d, capa: 'FIJO · ' });
      cN(`anillo ${SOPORTE.bulonTrasero.anillo} (retención del bulón trasero)`, 1);
    }

    E.addPart(`FIJO · Rótula de vástago ${NEUM.accesorios.rotula} (${c})`, COL.neumatica,
      [B, NEUM.y, r2(GEO.lobuloZ - 8)],
      [box('Horquilla KJ10D 19×17×36', [B, NEUM.y, r2(GEO.lobuloZ - 8)], 19, 17, 36),
        hole('Ø10 bulón', [r2(B - 12), NEUM.y, GEO.lobuloZ], [1, 0, 0], 10)],
      { componente: 'KJ10D',
        ajusteMontaje: 'roscada M10×1.25 al vástago; su bulón Ø10 atraviesa las pletinas del brazo', norma: `${NEUM.accesorios.rotula} — horquilla de vástago con rótula, M10×1.25, bulón y seguro ISO 8140 · web PNEU-006`,
        capaInfo: 'web (designación) + step (Ø10 y M10×1.25 contrastados)',
        nota: 'toma el lóbulo del brazo por su bulón Ø10. Es RÓTULA (casquetes esféricos medidos): absorbe el '
          + 'pequeño desalineado que el arco del brazo introduce a lo largo de la carrera.' });
    cR(`rótula ${NEUM.accesorios.rotula} (1 del STEP + 4 nuevas)`, 1);

    E.addPart(`FIJO · Bulón del lóbulo Ø10×${r2(2 * platX + platE + 6)} (${c})`, COL.acero,
      [r2(B - platX - platE / 2 - 3), NEUM.y, GEO.lobuloZ],
      [cyl(`Bulón Ø10×${r2(2 * platX + platE + 6)}`, [r2(B - platX - platE / 2 - 3), NEUM.y, GEO.lobuloZ], [1, 0, 0], 10, r2(2 * platX + platE + 6))],
      { fabricada: true, nota: 'une la rótula KJ10D a las 2 pletinas del brazo; los 2 separadores Ø19×18 del '
        + 'cliente (step) centran la horquilla de 17 entre las pletinas.' });
    cN('bulón del lóbulo', 1);
    // retenciones del bulón de la rótula + los 2 separadores medidos del cliente
    for (const sx of [-1, 1]) {
      anilloRet(E, { nombre: `bulón rótula ${sx < 0 ? '−X' : '+X'} (${c})`,
        at: [r2(B + sx * 30 - (sx < 0 ? 0 : 1.2)), NEUM.y, GEO.lobuloZ], dir: [1, 0, 0], eje: 10, capa: 'FIJO · ' });
      cN(`anillo ${SOPORTE.bulonRotula.anillo} (retención del bulón de la rótula)`, 1);
      const SP = SOPORTE.separadorRotula;
      E.addPart(`CTX · Separador Ø${SP.de}×${SP.largo} del bulón KJ10D (${sx < 0 ? '−X' : '+X'}) (${c})`, COL.acero,
        [r2(B + sx * 8.5 - (sx < 0 ? SP.largo : 0)), NEUM.y, GEO.lobuloZ],
        [cyl(`Separador Ø${SP.de}×${SP.largo}`, [r2(B + sx * 8.5 - (sx < 0 ? SP.largo : 0)), NEUM.y, GEO.lobuloZ], [1, 0, 0], SP.de, SP.largo),
          hole(`Ø${SP.di}`, [r2(B + sx * 8.5 - (sx < 0 ? SP.largo + 1 : -1)), NEUM.y, GEO.lobuloZ], [1, 0, 0], SP.di)],
        { contexto: true, capaInfo: 'step (inventario: SEPARADOR ×2 por calle)',
          ajusteMontaje: 'ensartado en el bulón de la rótula',
          nota: 'centran la horquilla de 17 de la KJ10D entre las 2 pletinas del brazo (pieza medida del cliente)' });
      cR('separador de bulón KJ10D (step)', 1);
    }
    // línea de aire de esta calle
    E.addPart(`FIJO · Línea de aire PU Ø${SOPORTE.tubo.d} — AR20 → calle ${k + 1}`, COL.neumatica,
      [SOPORTE.tuboX0, SOPORTE.tuboY, r2(SOPORTE.tuboZ - k * SOPORTE.tuboPasoZ)],
      [cyl(`Tubo Ø${SOPORTE.tubo.d} L=${r2(B - SOPORTE.tuboX0)}`, [SOPORTE.tuboX0, SOPORTE.tuboY, r2(SOPORTE.tuboZ - k * SOPORTE.tuboPasoZ)], [1, 0, 0], SOPORTE.tubo.d, r2(B - SOPORTE.tuboX0))],
      { componente: 'tubo_PU_6', norma: SOPORTE.tubo.norma,
        ajusteMontaje: 'la bajada final de cada línea hasta el racor KQ2L06 de su cilindro se tiende en obra',
        nota: `las 5 líneas salen del colector del ${NEUM.reguladorPresion} y corren POR DEBAJO de todo el `
          + `conjunto frontal (Z ${r2(SOPORTE.tuboZ - k * SOPORTE.tuboPasoZ)}), que es el único corredor libre: `
          + `por debajo del travesaño (−105), de las placas de extremo (−125) y del cabezal PG40 (−120). Van en `
          + `abanico vertical, ${SOPORTE.tuboPasoZ} mm entre líneas, para no montarse. Recorrido `
          + `${r2(B - SOPORTE.tuboX0)} mm. Mismo regulador para las 5 = misma presión = misma tensión.` });
    cN('línea de aire PU Ø6', 1);

    E.addPart(`FIJO · Regulador de caudal ${NEUM.accesorios.regulador} (meter-out, ${c})`, COL.neumatica,
      [B, r2(NEUM.y + 10), -130],
      [box('AS2201FS 26.3×43.6×22.9', [B, r2(NEUM.y + 10), -130], 26.3, 43.61, 22.9)],
      { componente: 'AS2201FS-01-06S',
        ajusteMontaje: 'roscado R1/8 al puerto trasero del cilindro', norma: `${NEUM.accesorios.regulador} — regulador de caudal codo, meter-out, R1/8, tubo Ø6 · web PNEU-004`,
        capaInfo: 'web (designación) + step (caja medida)',
        nota: 'meter-out en el puerto de TIRO: gobierna la VELOCIDAD con que este brazo toma la banda, para que '
          + 'no la golpee al arrancar. NO fija la fuerza — eso lo hace el regulador de presión AR20 de la rama.' });
    cR(`regulador de caudal ${NEUM.accesorios.regulador} (4 del STEP + 1 nuevo)`, 1);

    E.addPart(`FIJO · Silenciador ${NEUM.accesorios.silenciador} (${c})`, COL.neumatica,
      [B, r2(NEUM.y - 22), r2(NEUM.cuerpoZ0 + 45)],
      [cyl('Silenciador Ø11×22.8', [B, r2(NEUM.y - 22), r2(NEUM.cuerpoZ0 + 45)], [0, -1, 0], 11, 22.8)],
      { componente: 'AN101-01', norma: `${NEUM.accesorios.silenciador} — silenciador serie AN, R1/8 · web PNEU-005`,
        capaInfo: 'web (designación, CONFIANZA BAJA) + step (caja medida)',
        nota: 'DECLARADO: la cita textual de catálogo de la serie AN no se obtuvo (web_facts PNEU-005 lo marca '
          + 'PENDIENTE); la identificación se apoya en la nomenclatura SMC AN1xx-01 y en la geometría medida.' });
    cR(`silenciador ${NEUM.accesorios.silenciador}`, 1);

    E.addPart(`FIJO · Racor codo ${NEUM.accesorios.racor} (${c})`, COL.neumatica,
      [B, r2(NEUM.y - 14), r2(NEUM.cuerpoZ0 + 12)],
      [box('KQ2L06 16×26.3×25', [B, r2(NEUM.y - 14), r2(NEUM.cuerpoZ0 + 12)], 16, 26.3, 25)],
      { componente: 'KQ2L06-01AS',
        ajusteMontaje: 'roscado R1/8 al puerto delantero del cilindro', norma: `${NEUM.accesorios.racor} — codo instantáneo macho R1/8 ↔ tubo Ø6 · web PNEU-008`,
        nota: `tubo PU Ø6 desde el colector del ${NEUM.reguladorPresion}` });
    cR(`racor ${NEUM.accesorios.racor} (web PNEU-008)`, 1);
  });

  M.piezas = E.parts.length - p0;
  M.arquitectura = {
    brazos: EJES.length,
    cilindros: NEUM.nCilindros,
    modo: NEUM.modo,
    ejeComun: 'sólo el eje pivote (línea de articulación); nada más es común',
    brazosSolidariosAlEje: false,
    ejeGira: PIV.giraElEje,
    cadaBandaIndependiente: true,
    reguladorPresion: NEUM.reguladorPresion,
    presionTrabajoBar: NEUM.presionTrabajoBar,
  };
  M.ejePivote = {
    designacion: `Ø${PIV.d}×${PIV.largo} ${PIV.material}`,
    vano: EJE_CALC.vano,
    flechaMm: EJE_CALC.flechaMm,
    sigmaMPa: EJE_CALC.sigmaMPa,
    fs: EJE_CALC.fs,
    apoyos: `2 × ${PIV.ucfl.designacion}`,
    retencionEje: `prisioneros de los 2 UC 206 (servicio) + 2 anillos ${PIV.anillo.norma} por dentro, en pareja espejada (seguridad)`,
    retencionBrazos: `collar de apriete en −X + ${EJES.length - 1} separadores Ø${PIV.separador.de}×${PIV.separador.largo} `
      + `apretados contra el anillo ${PIV.anillo.norma} de +X, que hace de tope`,
    giro: `2 casquillos de fricción Ø${PIV.casquillo.di}/Ø${PIV.casquillo.de}×${PIV.casquillo.largo} por brazo`,
    presionCasquilloMPa: EJE_CALC.presionCasquilloMPa,
    pasoCerrado: r2(PIV.cubo.largo + 2 * PIV.casquillo.brida + PIV.separador.largo),
  };
  M.tension = {
    presionTrabajoBar: NEUM.presionTrabajoBar,
    fCilindroEfN: TENSION.fTiroEfN,
    palancaRatio: PALANCA.ratio,
    nPoleaN: TENSION.nPoleaN,
    abrazadoDeg: ramal.usado.abrazadoDeg,
    tPorBandaN: TENSION.tDe(ramal.usado.abrazadoDeg),
    tPorMmAncho: Math.round(TENSION.tDe(ramal.usado.abrazadoDeg) / 32 * 1000) / 1000,
    feMaxPorBandaN: TENSION.feMaxPorBandaN,
    arrastrePorBandaN: TENSION.arrastrePorBandaN,
    margen: TENSION.margen,
    tabla: TENSION.tabla,
    tablaPresion: TENSION.tablaPresion,
    hipotesis: TENSION.hipotesis,
  };
  M.soporte = {
    placaFrontal: `travesaño 40×40×${SOPORTE.trav.esp} de ${SOPORTE.trav.luz} entre los 2 cabezales del alargue PG40`,
    cargaN: SOPORTE_CALC.totalN,
    flechaMm: SOPORTE_CALC.flechaMm,
    sigmaMPa: SOPORTE_CALC.sigmaMPa,
    fs: SOPORTE_CALC.fs,
    bridaFrontalEnElCilindro: false,
    basculacionDeg: SOPORTE_CALC.basculacionDeg,
    porQueNoLlevaBrida: `el cilindro bascula ${SOPORTE_CALC.basculacionDeg}° al seguir el arco del brazo; un `
      + 'empotramiento frontal sería ligadura redundante y partiría el vástago. Va bi-articulado: C85C25 detrás '
      + '+ KJ10D delante, que es isostático.',
    interfazPg40: `2 taladros Ø9 en cada cabezal de rodamiento motriz (X ${SOPORTE.trav.x[0]} y ${SOPORTE.trav.x[1]})`,
  };
  M.ramal = ramal;
  return M;
}
