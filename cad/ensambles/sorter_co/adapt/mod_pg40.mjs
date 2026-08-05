// mod_pg40.mjs — BASTIDOR PG40 del sorter CO:
//   §1 largueros de perfil de aluminio 40×40 ranura 10, uno bajo cada banda;
//   §2 guías de deslizamiento UHMW sobre el perfil, con su pie de clip;
//   §3 travesaños 40×40 que cruzan de alargue a alargue;
//   §4 ALARGUE de la estructura lateral del NBT90 hacia el tambor motriz y el
//      rodillo conducido, con los taladros de los soportes UCF 207;
//   §5 el amarre: pernos 3/8 a las colisas del side channel con casquillos
//      separadores, y M10 al chapón del cliente;
//   §6 comprobaciones (flecha del larguero y del travesaño, holguras del
//      alargue contra las alas del side channel).
//
// El NBT90 NO SE TOCA: el alargue es pieza NUEVA del sorter que se atornilla a
// su canal lateral por las colisas de reglaje que quedaron libres al retirar el
// canal del anfitrión ProSort.
//
// Todas las cotas salen de adapt/params_pg40.mjs; aquí no se inventa ninguna.

import { box, cyl, hole, sketchYZ, sketchXY, pernoHex, tuercaHex, golilla, desarrollo, COL, r2 }
  from '../../nbt90/lib.mjs';
import {
  FLAGS, PERFIL, Z, GUIA, TRAMOS, TRAVESANOS, TRAVESANOS_PUENTE, PUENTE_APOYO,
  ESCUADRA_LT, ALARGUE, UCF207, EJES_ARBOL, travTopDe, travBotDe,
  PUBLICA, CARGA, RETORNOS, RSOP, STEP, NBT, Xc, EJES, T,
} from './params_pg40.mjs';

const r3 = (v) => Math.round(v * 1000) / 1000;
const COL_ALU = '#b9c4cc';        // aluminio anodizado natural
const COL_UHMW = '#e6e2d2';       // UHMW-PE 1000 natural

// ---------------------------------------------------------------------------
// Helper: perfil ranurado 40×40 ranura 10 (boca 10, profundidad 12 — web PG40-002)
// `eje` = 'y' (larguero, corre según Y) | 'x' (travesaño, corre según X).
// ---------------------------------------------------------------------------
function perfilPG40(E, nombre, eje, transversal, rango, zBot, extra = {}) {
  const b = PERFIL.b, h = PERFIL.h, L = r3(rango[1] - rango[0]);
  const c = r3((rango[0] + rango[1]) / 2);
  const zTop = r3(zBot + h), zc = r3(zBot + h / 2);
  const bo = PERFIL.bocaRanura, pr = PERFIL.profRanura;
  const at = eje === 'y' ? [transversal, c, zBot] : [c, transversal, zBot];
  const f = [eje === 'y'
    ? box(`Perfil ${b}×${h}×${L}`, at, b, L, h)
    : box(`Perfil ${b}×${h}×${L}`, at, L, b, h)];
  let nr = 0;
  const corte = (nom, cAt, w, d, hh) => f.push({
    id: `${nombre.replace(/\W+/g, '_').slice(0, 40)}_r${++nr}`, name: nom,
    shape: 'box', op: 'cut', at: cAt, dir: [0, 0, 1], params: { w: r2(w), d: r2(d), h: r2(hh) },
  });
  if (eje === 'y') {
    corte('Ranura 10 (+z)', [transversal, c, r3(zTop - pr)], bo, L, pr);
    corte('Ranura 10 (−z)', [transversal, c, zBot], bo, L, pr);
    corte('Ranura 10 (+x)', [r3(transversal + b / 2 - pr / 2), c, r3(zc - bo / 2)], pr, L, bo);
    corte('Ranura 10 (−x)', [r3(transversal - b / 2 + pr / 2), c, r3(zc - bo / 2)], pr, L, bo);
  } else {
    corte('Ranura 10 (+z)', [c, transversal, r3(zTop - pr)], L, bo, pr);
    corte('Ranura 10 (−z)', [c, transversal, zBot], L, bo, pr);
    corte('Ranura 10 (+y)', [c, r3(transversal + b / 2 - pr / 2), r3(zc - bo / 2)], L, pr, bo);
    corte('Ranura 10 (−y)', [c, r3(transversal - b / 2 + pr / 2), r3(zc - bo / 2)], L, pr, bo);
  }
  return E.addPart(nombre, COL_ALU, at, f, {
    catalogo: `perfil de aluminio ${b}×${b} ranura ${PERFIL.ranura} tipo PG40 · ${PERFIL.aleacion} `
      + `· Ix=Iy=${PERFIL.Ix} cm⁴ · ${PERFIL.masaKgM} kg/m (web PG40-001/PG40-002)`,
    capaInfo: 'web+dis', masaKg: r3(PERFIL.masaKgM * L / 1000), ...extra,
  });
}

/** Escuadra de unión (pletina en L, e=6) entre dos elementos. */
function escuadra(E, nombre, at, alas, extra = {}) {
  const e = 6, [ay, az] = alas;
  return E.addPart(nombre, COL.chapaOsc, at, [
    box(`Ala vertical ${ay}×${e}×${az}`, at, ay, e, az),
    box(`Ala horizontal ${ay}×${az}×${e}`, [at[0], r3(at[1] + az / 2 - e / 2), at[2]], ay, az, e),
  ], { capaInfo: 'dis', ...extra });
}

// ===========================================================================
export function pg40(E) {
  const out = { piezas: 0, largueros: 0, guias: 0, travesanos: 0, alargues: 0, tornilleria: 0 };
  const p0 = E.parts.length;

  // -------------------------------------------------------------------------
  // §1 LARGUEROS DE CALLE — un 40×40 bajo cada una de las 5 bandas
  // -------------------------------------------------------------------------
  // Su única misión es soportar la guía UHMW: Z 0…40 exactos, porque la cara
  // superior del perfil que sustituye está medida en Z=40 (step §4.3) y la
  // guía asoma 11.7 hasta la cara de rodadura del dorso, Z 51.7 (step).
  for (let k = 0; k < EJES.length; k++) {
    const X = EJES[k], c = `calle ${k + 1}`;
    for (const [nom, rango] of [['conducido', TRAMOS.sur], ['motriz', TRAMOS.norte]]) {
      perfilPG40(E, `PG40 · Larguero de calle 40×40 ranura 10 tramo ${nom} `
        + `L=${r3(rango[1] - rango[0])} (${c}, X ${X})`, 'y', X, rango, Z.perfilBot);
      out.largueros++;
    }
  }

  // -------------------------------------------------------------------------
  // §2 GUÍAS UHMW — regleta de 31.75 (= ventana útil) con pie de clip
  // -------------------------------------------------------------------------
  // La banda T5 de 32 (step) monta 0.125 por lado sobre la regleta: los cantos
  // de la regleta no muerden los cantos de la banda. El pie de 9.6 entra a
  // presión en la ranura 10 de la cara superior del perfil.
  const guiaTramos = [...TRAMOS.guiasSur, ...TRAMOS.guiasNorte];
  for (let k = 0; k < EJES.length; k++) {
    const X = EJES[k], c = `calle ${k + 1}`;
    for (const [a, b] of guiaTramos) {
      const L = r3(b - a), yc = r3((a + b) / 2);
      E.addPart(`PG40 · Guía UHMW ${GUIA.ancho}×${L} (${c}, Y ${a}…${b})`, COL_UHMW,
        [X, yc, Z.perfilTop], [
          box(`Regleta ${GUIA.ancho}×${L}×${GUIA.saliente}`, [X, yc, Z.perfilTop], GUIA.ancho, L, GUIA.saliente),
          box(`Pie de clip ${GUIA.pie.ancho}×${L}×${GUIA.pie.prof}`,
            [X, yc, r3(Z.perfilTop - GUIA.pie.prof)], GUIA.pie.ancho, L, GUIA.pie.prof),
        ], {
          capaInfo: 'dis', material: GUIA.material,
          catalogo: `regleta de deslizamiento ${GUIA.material} ${GUIA.ancho}×${GUIA.alto}, `
            + `clip a ranura 10 (web UHMW-001)`,
          nota: `cara de rodadura en Z ${Z.guiaTop} (step); la banda de ${STEP.bandaAncho} `
            + `vuela ${GUIA.vueloBanda} por lado sobre la regleta`,
        });
      out.guias++;
    }
    // topes de extremo (retención axial sin tornillo en la cara de rodadura).
    // Van en los extremos de la CAMA DE GUÍAS, metidos 3 mm hacia dentro: así no
    // pisan los «cierre guía» del cliente, que hay orden expresa de conservar.
    const camaSur = [TRAMOS.guiasSur[0][0], TRAMOS.guiasSur.at(-1)[1]];
    const camaNorte = [TRAMOS.guiasNorte[0][0], TRAMOS.guiasNorte.at(-1)[1]];
    for (const [rango, nom] of [[camaSur, 'conducido'], [camaNorte, 'motriz']]) {
      for (const y0t of rango) {
        const dentro = y0t === rango[0] ? 1 : -1;
        const y = r3(y0t + dentro * 3);
        E.addPart(`PG40 · Tope de guía M6 (${c}, tramo ${nom}, Y ${y})`, COL.chapaOsc,
          [X, r3(y + dentro * GUIA.topeExtremo.e / 2), Z.perfilTop], [
            box(`Tope ${GUIA.topeExtremo.l}×${GUIA.topeExtremo.e}×${GUIA.saliente}`,
              [X, r3(y + dentro * GUIA.topeExtremo.e / 2), Z.perfilTop],
              GUIA.topeExtremo.l, GUIA.topeExtremo.e, GUIA.saliente),
          ], { capaInfo: 'dis', hardware: true,
            nota: `Retención de extremo de la regleta: tornillo ${GUIA.topeExtremo.tornillo} avellanado `
              + 'que ROSCA en el testero del UHMW y agarra a tuerca martillo en la ranura lateral del '
              + 'perfil. Va marcado como `hardware`: por convención del repositorio la tornillería vive '
              + 'DENTRO de la pieza que atornilla, y así lo distingue el informe de interferencias.' });
        out.piezas++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // §3 TRAVESAÑOS — 40×40 de alargue a alargue, bajo los largueros
  // -------------------------------------------------------------------------
  // Los travesaños cruzan la LUZ ENTRE BASTIDORES (580.84, cota congelada): de
  // cara interior a cara interior de los chapones del cliente. Se amarran a
  // ellos por escuadra, y a los CANALES LATERALES del NBT90 por las ménsulas
  // que suben del alma del alargue (§4-e) — que es lo que pide el cliente:
  // «todo el conjunto tiene que quedar amarrado a ellos».
  const xTrav = [STEP.frameIntNeg, STEP.frameIntPos];
  const luzBastidores = r3(xTrav[1] - xTrav[0]);
  for (const y of TRAVESANOS) {
    // Si el travesaño cae dentro de un CABEZAL DE RODAMIENTO, muere en sus caras
    // de apoyo en vez de atravesarlo: ahí el travesaño se apoya en los cabezales,
    // que es mejor nudo que llegar hasta los chapones.
    const enCabezal = [ALARGUE.cabezalMotrizY, ALARGUE.cabezalCondY]
      .some(r => y > r[0] - 20 && y < r[1] + 20);
    // A10-quater · un travesaño BAJADO tampoco llega al chapón: su fondo entraría
    // en la franja del alma del alargue (Z −222…+26). Muere en sus caras interiores.
    const bajadoAqui = travBotDe(y) !== Z.travBot;
    const xR = (enCabezal || bajadoAqui) ? [ALARGUE.xCabNegInt, ALARGUE.xInt] : xTrav;
    // A10 · la coronación ya no es común: los travesaños que se cruzan con la
    // RAMPA del ramal de retorno recto cuelgan más abajo para dejarla pasar.
    const zBotY = travBotDe(y), bajado = zBotY !== Z.travBot;
    perfilPG40(E, `PG40 · Travesaño 40×40 ranura 10 L=${r3(xR[1] - xR[0])} (Y ${y})`,
      'x', y, xR, zBotY,
      { nota: 'cruza la luz entre bastidores 580.84 (cota congelada); los 5 largueros apoyan encima'
          + (bajado
            ? `. A10 · BAJADO ${r3(Z.travBot - zBotY)} mm respecto de los demás (corona en `
              + `Z ${travTopDe(y)} y no en ${Z.travTop}): por aquí sube la RAMPA del ramal de retorno `
              + 'recto hacia el corredor del peine, y con el travesaño en su cota de siempre la banda '
              + 'se le metía dentro. Su escuadra al larguero crece en consecuencia (no es una '
              + 'cantonera de 64, es una pletina de ' + ESCUADRA_LT.cantoDe(y) + ' de canto)'
            : '') });
    out.travesanos++;
    // escuadras larguero ↔ travesaño (una por calle) — A1
    for (let k = 0; ESCUADRA_LT.enTravesano(y) && k < EJES.length; k++) {
      // Escuadra de RINCÓN VERTICAL: un ala contra la cara +X del LARGUERO (que
      // corre en Y) y otra contra la cara ±Y del TRAVESAÑO (que corre en X). Las
      // dos quedan POR FUERA de sus perfiles — el ala no se mete en la ranura, se
      // atornilla a ella con tuerca martillo M8, que es como se monta de verdad.
      // El rincón se elige por el lado LIBRE: en el travesaño de −1520 el lado
      // −Y lo ocupa el rodillo conducido Ø108 (Y −1661…−1553), así que va al +Y.
      //
      // A1 · LAS DOS ALAS COMPARTEN LA ARISTA VERTICAL y el mismo canto en Z
      // (ESCUADRA_LT.canto = 64, de Z −32 a +32). Antes una arrancaba en
      // Z.travTop+4 y la otra en Z.travBot+4, con 32 de canto cada una: como el
      // perfil mide 40, entre las dos quedaban 8.00 mm de aire y no había pieza.
      const S = ESCUADRA_LT;
      const sgn = ESCUADRA_LT.ladoRincon(y);
      const sCanto = S.cantoDe(y), sZBot = S.zBotDe(y), sZTrav = S.zTravesanoDe(y);
      const xCara = r3(EJES[k] + PERFIL.b / 2);          // cara +X del larguero
      const yCara = r3(y + sgn * PERFIL.b / 2);          // cara ±Y del travesaño
      const xe = r3(xCara + S.holgura + S.e / 2);        // eje de la chapa del ala A
      const ye = r3(yCara + sgn * (S.holgura + S.e / 2));// eje de la chapa del ala B
      // ala A (al larguero): crece en −sgn·Y desde el rincón; ala B (al travesaño):
      // crece en +X desde el rincón. Las dos, de Z −32 a +32.
      const yA = r3(yCara + sgn * (S.ala / 2));          // centro del ala A en Y
      const xB = r3(xCara + S.ala / 2);                  // centro del ala B en X
      // Fibra media en planta (X, Y), del extremo libre del ala A al del ala B:
      const fibra = [[xe, r3(yCara + sgn * S.ala)], [xe, ye], [r3(xCara + S.ala), ye]];
      const des = desarrollo(fibra, S.e, S.radio);
      E.addPart(`PG40 · Escuadra larguero↔travesaño (calle ${k + 1}, Y ${y})`, COL.chapaOsc,
        [xe, ye, sZBot], [
          box(`Ala al larguero ${S.e}×${S.ala}×${sCanto}`, [xe, yA, sZBot], S.e, S.ala, sCanto),
          box(`Ala al travesaño ${S.ala}×${S.e}×${sCanto}`, [xB, ye, sZBot], S.ala, S.e, sCanto),
          hole(`Ø${S.pasante} ${S.rosca} a la ranura +X del larguero`,
            [r3(xe + S.e / 2 + 1), yA, S.zLarguero], [-1, 0, 0], S.pasante),
          hole(`Ø${S.pasante} ${S.rosca} a la ranura ${sgn > 0 ? '+' : '−'}Y del travesaño`,
            [xB, r3(ye + sgn * (S.e / 2 + 1)), sZTrav], [0, -sgn, 0], S.pasante),
        ], { capaInfo: 'dis', fabricada: true, material: S.material,
          chapa: { t: S.e, material: S.material, fibra, radio: S.radio },
          desarrolloMm: des.largo,
          uniones: [
            { rosca: S.rosca, n: 1, pasante: S.pasante,
              a: `ranura 10 (+X) del larguero de la calle ${k + 1} — tuerca martillo` },
            { rosca: S.rosca, n: 1, pasante: S.pasante,
              a: `ranura 10 (${sgn > 0 ? '+' : '−'}Y) del travesaño Y ${y} — tuerca martillo` },
          ],
          nota: `A1 CERRADO. Escuadra de rincón VERTICAL: las dos alas comparten la arista `
            + `(X ${xCara}, Y ${yCara}) y el mismo canto Z ${sZBot}…${r3(sZBot + sCanto)}, así que `
            + `es UNA pieza. Plegada de ${S.material.toLowerCase()}, radio interior ${S.radio} (= t), `
            + `desarrollo ${des.largo} mm; alas de ${S.ala}, por encima del mínimo de matriz normal para `
            + `e = ${S.e} (≈34). UNA tuerca martillo M8 ranura 10 por ala (2 por escuadra, 40 en el `
            + `bastidor), taladro Ø${S.pasante} centrado a ${S.ala / 2} del canto: dos Ø9 en fila pedirían `
            + `41.4 mm (2.2·d₀ + 2 × 1.2·d₀, EN 1993-1-8) y entre largueros contiguos sólo hay 36.2 y `
            + `entre los travesaños de −1520 y −1440 sólo 40. Ninguna ala invade la sección de los perfiles.` });
      out.piezas++;
      // la tornillería declarada, emitida: 1 M8×20 por ala con su tuerca martillo
      pernoHex(E, { nombre: `M8×20 escuadra↔larguero (calle ${k + 1}, Y ${y})`,
        at: [r3(xe + S.e / 2), yA, S.zLarguero], dir: [-1, 0, 0], dia: 8, largo: 20, af: 13, altoCab: 5.3, capa: 'PG40 · ' });
      pernoHex(E, { nombre: `M8×20 escuadra↔travesaño (calle ${k + 1}, Y ${y})`,
        at: [xB, r3(ye + sgn * S.e / 2), sZTrav], dir: [0, -sgn, 0], dia: 8, largo: 20, af: 13, altoCab: 5.3, capa: 'PG40 · ' });
      out.tornilleria += 2;
    }
  }

  // -------------------------------------------------------------------------
  // §3-bis TRAVESAÑOS DE PUENTE — A6: los dos apoyos que faltaban
  // -------------------------------------------------------------------------
  // El puente de calle cruza la transferencia apoyado en 10 placas base que
  // mod_calles pone en Y −1280 y −692 con su cara inferior en Z 9.15. Esos dos
  // apoyos eran los travesaños de la PERCHA, y FLAGS.desactivaPercha se los
  // llevó por nombre dejando 19 piezas y 40 tornillos en el aire (hallazgo A6 /
  // SC-01). Se devuelven aquí, en el módulo que sí existe, con perfil PG40 y su
  // coronación en la cota que la cadena del puente exige.
  const xTravP = [r3(xTrav[0] + PUENTE_APOYO.inset), r3(xTrav[1] - PUENTE_APOYO.inset)];
  const luzTravP = r3(xTravP[1] - xTravP[0]);
  for (const TP of TRAVESANOS_PUENTE) {
    perfilPG40(E, `PG40 · Travesaño de puente 40×40 ranura 10 L=${luzTravP} (${TP.nom}, Y ${TP.y})`,
      'x', TP.y, xTravP, PUENTE_APOYO.botZ, {
        sostiene: 'Placa base de puente',
        sinTaladro: 'perfil ranurado: la fijación de las placas base del puente y de las escuadras de '
          + 'extremo es por TUERCA MARTILLO en la ranura 10 superior, que no lleva taladro. La unión se '
          + 'declara (y se comprueba) en la pieza que sí se taladra: la placa base y la escuadra.',
        nota: `A6 · APOYO DEL PUENTE DE CALLE. Corona en Z ${PUENTE_APOYO.topZ} (= params_adapt `
          + `PERCHA.travTopZ, la cadena 51.7 − 8.55 − 28 − 6), que es la cara inferior de las 5 placas `
          + `base de esta fila; sus 2 tuercas martillo M8 por placa muerden la ranura 10 superior. `
          + `Sustituye al travesaño 40×80 de la percha que retiró FLAGS.desactivaPercha. NO lleva `
          + `escuadra larguero↔travesaño: a esta Y no hay larguero (los tramos mueren en −1302 y `
          + `arrancan en −630) — está justo en el hueco por el que el puente cruza la transferencia. `
          + `Vano libre del puente entre los dos apoyos: 588 mm, el de diseño. Muere en la cara `
          + `interior de su escuadra de extremo (X ${xTravP[0]}…${xTravP[1]}), no a hueso contra el chapón.` });
    out.travesanos++;
    // escuadra de extremo a cada chapón: sin ella el travesaño topa a hueso
    const EA = PUENTE_APOYO.escuadra;
    for (const lado of [-1, 1]) {
      const xBast = lado < 0 ? STEP.frameIntNeg : STEP.frameIntPos;
      const xV = lado < 0 ? xBast : r3(xBast - EA.t);            // ala vertical (contra el chapón)
      const xH = lado < 0 ? r3(xBast + EA.t + EA.alaH / 2) : r3(xBast - EA.t - EA.alaH / 2);
      const zH = PUENTE_APOYO.topZ;                              // el ala horizontal apoya arriba
      const fibra = [[lado < 0 ? 0 : 0, r3(zH - EA.alaV)], [0, zH], [lado < 0 ? EA.alaH : -EA.alaH, zH]];
      const des = desarrollo(fibra, EA.t, EA.radio);
      E.addPart(`PG40 · Escuadra travesaño de puente↔chapón 3/16" (${TP.nom}, ${lado < 0 ? '−X' : '+X'})`,
        COL.chapaOsc, [r3(xV + EA.t / 2), TP.y, zH], [
          box(`Ala vertical ${EA.t}×${EA.ancho}×${EA.alaV}`,
            [r3(xV + EA.t / 2), TP.y, r3(zH - EA.alaV + EA.t)], EA.t, EA.ancho, EA.alaV),
          box(`Ala horizontal ${EA.alaH}×${EA.ancho}×${EA.t}`, [xH, TP.y, zH], EA.alaH, EA.ancho, EA.t),
          ...[-20, 20].map(dy => hole(`Ø${EA.pasante} ${EA.rosca} al chapón`,
            [r3(xV + lado * (EA.t + 1)), r3(TP.y + dy), r3(zH - 18)], [-lado, 0, 0], EA.pasante)),
          ...[-20, 20].map(dy => hole(`Ø${EA.pasante} ${EA.rosca} a la ranura 10 superior del travesaño`,
            [xH, r3(TP.y + dy), r3(zH + EA.t + 1)], [0, 0, -1], EA.pasante)),
        ], { fabricada: true, capaInfo: 'dis',
          chapa: { t: EA.t, material: 'Acero A36 (S275JR) 3/16"', fibra, radio: EA.radio },
          desarrolloMm: des.largo,
          apoyaEn: `PG40 · Travesaño de puente`,
          uniones: [
            { rosca: EA.rosca, n: 2, pasante: EA.pasante, a: 'chapón del cliente (roscados, e = 28 step)' },
            { rosca: EA.rosca, n: 2, pasante: EA.pasante, a: 'ranura 10 superior del travesaño — tuerca martillo' },
          ],
          nota: `Amarra el travesaño de puente al chapón del cliente. 2 M8 roscados al chapón (28 mm de `
            + `espesor medido, step) + 2 M8 a tuercas martillo de la ranura superior del travesaño. `
            + `Desarrollo ${des.largo} mm, radio ${EA.radio} (= t). Es la misma función que hacía la `
            + `«Escuadra travesaño↔bastidor» de la percha, con su fibra CORRECTA desde el primer día `
            + `(ala horizontal ${EA.alaH}, no 50: el defecto A9 del informe).` });
      out.piezas++;
      for (const dy of [-20, 20]) {
        pernoHex(E, { nombre: `M8×25 escuadra puente↔chapón (${TP.nom}, ${lado < 0 ? '−X' : '+X'}, ${dy > 0 ? '+' : '-'})`,
          at: [r3(xV + lado * EA.t * 0), r3(TP.y + dy), r3(zH - 18)], dir: [lado, 0, 0], dia: 8, largo: 25, af: 13, altoCab: 5.3, capa: 'PG40 · ' });
        pernoHex(E, { nombre: `M8×16 escuadra puente↔travesaño (${TP.nom}, ${lado < 0 ? '−X' : '+X'}, ${dy > 0 ? '+' : '-'})`,
          at: [xH, r3(TP.y + dy), r3(zH + EA.t)], dir: [0, 0, -1], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'PG40 · ' });
        out.tornilleria += 2;
      }
    }
  }

  // -------------------------------------------------------------------------
  // §4 ALARGUE DE LA ESTRUCTURA LATERAL DE LA TRANSFERENCIA
  // -------------------------------------------------------------------------
  // Pletina de acero de 8 cortada por láser. Su silueta esquiva las ALAS del
  // side channel del NBT90 dentro del tramo del módulo (canto entre −248 y −93)
  // y sube a ±70 fuera de él para alojar el cuadro de taladros del UCF 207.
  const A = ALARGUE;
  const rect = (y, z) => [[y[0], z[0]], [y[1], z[0]], [y[1], z[1]], [y[0], z[1]]];
  const ejesArbol = [['motriz', EJES_ARBOL.motriz, A.cabezalMotrizY],
    ['conducido', EJES_ARBOL.conducido, A.cabezalCondY]];
  const zAlma = [A.almaZBot, A.almaZTop];

  // -------------------------------------------------------------------------
  // A3 · EL CUADRO DE PERNOS DEL CUBREJUNTA — calculado UNA vez y leído por las
  //      TRES piezas de la junta (cubrejunta, alma y cabezal).
  // -------------------------------------------------------------------------
  // El defecto era que la unión sólo existía en la nota: «4 pernos M10 al alma
  // y 4 al cabezal», 32 pernos en los 4 cubrejuntas de cabezal, y CERO taladros
  // en las tres piezas. Ahora el cuadro se calcula del SOLAPE REAL de cada
  // cubrejunta con cada pieza, se emite en las tres, y la compuerta lo exige.
  const CUBRES = [['motriz', [-260, 10]], ['conducido', [-1600, -1470]]];
  const inter = (a, b) => [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
  /** Los 2 Y de un cuadro de pernos dentro del solape de `yCub` con `yPza`.
   *  Devuelve [] si el solape no da para 2·1.2·d₀ + 2.2·d₀ = 41.4 mm. */
  const cuadroY = (yCub, yPza) => {
    const [a, b] = inter(yCub, yPza);
    const minimo = 2 * A.cubrejuntaPernoDY + 2 * 1.2 * A.pernoChapon.pasante;   // 58.4
    if (b - a < minimo) return [];
    const c = r3((a + b) / 2);
    return [r3(c - A.cubrejuntaPernoDY), r3(c + A.cubrejuntaPernoDY)];
  };
  /** Rangos Y del ALMA en cada lado (en +X va partida en dos tramos). */
  const almaYde = (s) => (s < 0 ? [A.almaY] : [A.almaPosSur, A.almaPosNorte]);

  for (const s of [-1, 1]) {                       // −1 = lado −X, +1 = lado +X
    const lado = s < 0 ? '−X' : '+X';
    // Cara desde la que se extruye el boceto YZ (crece en +X):
    const xFace = s < 0 ? A.xNegExt : A.xInt;      // alma: −X 42.886 · +X 491.418
    const xCab = s < 0 ? A.xCabNegExt : A.xInt;    // cabezal: el plano que pide tambores
    const xExt = s < 0 ? A.xNegExt : A.xExt;       // cara exterior (hacia el bastidor)
    const xApoyo = s < 0 ? A.xCabNegInt : A.xInt; // cara de apoyo del soporte de rodamiento
    const dirIn = [s > 0 ? -1 : 1, 0, 0];          // hacia el interior del sorter
    const fuera = r3(xExt + s * 2);                // arranque de los taladros
    // Cubrejuntas y ménsulas van SIEMPRE en el plano de al lado (hacia el
    // interior), nunca en el del alma o el cabezal: si son coplanarias no
    // empalman nada, se interpenetran.
    const xCubre = s < 0 ? A.xCabNegInt : r3(A.xInt - A.e);   // −X 67.494 · +X 483.418
    const xMens = s < 0 ? A.xNegInt : r3(A.xInt - A.e);       // −X 50.886 · +X 483.418
    const almaExt = r3(Xc + s * NBT.sideAlmaExtY);           // 50.886 / 508.026
    const almaInt = r3(almaExt + (s > 0 ? -1 : 1) * 2.657);  // 53.543 / 505.369

    // --- (a) ALMA -----------------------------------------------------------
    // −X: una sola pletina POR FUERA del alma del side channel (lap directo).
    // +X: dos tramos por dentro del chapón, fuera del módulo, más el tramo de
    //     LAP que se mete en el hueco de 5.951 del chapón (la muesca declarada).
    const tramosAlma = s < 0
      ? [['', A.almaY]]
      : [['sur ', A.almaPosSur], ['norte ', A.almaPosNorte]];
    for (const [suf, yR] of tramosAlma) {
      // La chapa se emite en DOS TANDAS: primero TODAS las uniones (el rectángulo
      // del alma y los lóbulos), después TODOS los cortes. No es estilo: es la
      // única forma correcta de modelar UNA pieza de corte láser.
      //   · si un lóbulo se añade DESPUÉS del taladro de paso de su vecino, le
      //     vuelve a tapar el agujero — y ahí es donde el eje fijo Ø30 de RR1 se
      //     encontraba 1.031 cm³ de acero macizo del lóbulo de RR2, que llega
      //     hasta Y −612 y le pisa 9 mm del muñón (verificación B-rep);
      //   · y el lóbulo, al no ser el PRIMER feature, se extruye con los 0.2 mm
      //     de solape de fusión del traductor (a_step.solido_sketch): sobresalía
      //     0.2 por la CARA DE APOYO y se metía en las 4 pletinas de soporte de
      //     los rodillos de retorno (1.696 + 1.655 + 1.655 + 1.636 cm³). Se
      //     arranca 0.2 más adentro y con 0.2 menos de canto: el sólido queda
      //     EXACTAMENTE en el plano de la chapa (de xFace a xFace + e) y la
      //     fusión ocurre DENTRO del material, que es donde debe ocurrir.
      const FUS = 0.2;                                   // a_step.solido_sketch
      const fUnion = [sketchYZ(`Pletina ${A.material} e=${A.e} · ${r3(yR[1] - yR[0])} × ${r3(zAlma[1] - zAlma[0])}`,
        xFace, rect(yR, zAlma), A.e)];
      const fCut = [];
      // CARTELAS DE RODILLO DE RETORNO del lado +X: van en el MISMO plano que el
      // alma (X 491.418…499.418, que es la cara de apoyo que publica
      // adapt/params_tambores.mjs para el soporte INBOARD). Coplanarias ⇒ no
      // pueden ser piezas sueltas: se resuelven como LÓBULOS DEL PROPIO CORTE
      // LÁSER del alma. Una sola pieza, sin solape y sin mover la cara de apoyo.
      const rrAqui = s > 0 ? RETORNOS.filter(rr => rr.y > yR[0] && rr.y < yR[1]) : [];
      for (const rr of rrAqui) {
        const zLo = r3(Math.min(rr.z - 60, zAlma[0])), zHi = r3(Math.max(rr.z + 60, zAlma[1]));
        fUnion.push(sketchYZ(`Lóbulo de cartela ${rr.id} (Y ${rr.y}, Z ${rr.z})`,
          r3(xFace + FUS), rect([r3(rr.y - 60), r3(rr.y + 60)], [zLo, zHi]), r3(A.e - FUS)));
        for (const dy of [-(RSOP.patronY ?? RSOP.patron) / 2, (RSOP.patronY ?? RSOP.patron) / 2]) {
          for (const dz of [-(RSOP.patronZ ?? RSOP.patron) / 2, (RSOP.patronZ ?? RSOP.patron) / 2]) {
            fCut.push(hole(`Soporte de retorno ${rr.id} Ø${RSOP.taladro}`,
              [fuera, r3(rr.y + dy), r3(rr.z + dz)], dirIn, RSOP.taladro));
          }
        }
        // PASO DEL EJE FIJO: Ø30 h9 del rodillo de retorno (params_tambores
        // RETORNOS.eje) con 10 de holgura de montaje → Ø40. Es el «taladro de
        // paso» que reclamaba el AVISO del módulo de tambores; se corta DESPUÉS
        // de todos los lóbulos para que ninguno lo vuelva a tapar.
        fCut.push(hole(`Paso del eje de retorno ${rr.id} Ø${r3((RSOP.bore ?? 30) + 10)}`,
          [fuera, rr.y, rr.z], dirIn, r3((RSOP.bore ?? 30) + 10)));
      }
      // pernos a las colisas del side channel (solo el lado −X los lleva en el
      // alma: en +X los lleva el tramo de lap, que es el que toca el alma del side)
      if (s < 0) {
        for (const y of A.pernosSideY) {
          fCut.push(hole(`Amarre side channel Ø${A.pernoSide.pasante} (Y ${y})`,
            [fuera, y, A.pernoSideZ], dirIn, A.pernoSide.pasante));
        }
      } else {
        for (const y of A.pernosChaponY.filter(y => y > yR[0] && y < yR[1])) {
          fCut.push(hole(`Amarre chapón Ø${A.pernoChapon.pasante} (Y ${y})`,
            [fuera, y, A.pernosChaponZ], dirIn, A.pernoChapon.pasante));
        }
      }
      // A3 · LOS TALADROS DEL CUBREJUNTA, EN EL ALMA. Son los que faltaban:
      // el cubrejunta declaraba 4 M10 a esta chapa y esta chapa no tenía ni uno.
      let nCubreAlma = 0;
      for (const [nom, yCub] of CUBRES) {
        for (const yb of cuadroY(yCub, yR)) {
          for (const zb of A.cubrejuntaPernoZ) {
            fCut.push(hole(`Cubrejunta ${nom} Ø${A.pernoChapon.pasante} (Y ${yb}, Z ${zb})`,
              [fuera, yb, zb], dirIn, A.pernoChapon.pasante));
            nCubreAlma++;
          }
        }
      }
      // A3-bis · LOS TALADROS ROSCADOS DEL CUBREJUNTA ALMA↔LAP, EN EL ALMA.
      // Son ciegos y roscados (M8 en los 8 mm de la chapa, 1.0·d): el taladro
      // es el de fondo de rosca Ø6.8, no un pasante Ø9 — por la cara exterior
      // del alma está el chapón y no hay sitio para tuerca.
      let nLapAlma = 0;
      if (s > 0) {
        for (const yCub of A.cubreLapY) {
          for (const yb of cuadroY(yCub, yR)) {
            fCut.push(hole(`Cubrejunta alma↔lap M8 (fondo de rosca Ø6.8, Y ${yb})`,
              [fuera, yb, -150], dirIn, 6.8, 8, false));
            nLapAlma++;
          }
        }
      }
      const fa = [...fUnion, ...fCut];
      E.addPart(`PG40 · Alargue lateral · alma ${suf}${lado} (pletina ${A.material} e=${A.e}, L=${r3(yR[1] - yR[0])})`,
        COL.chapa, [xFace, 0, 0], fa, {
          capaInfo: 'dis',
          uniones: [
            ...(nCubreAlma ? [{ rosca: A.pernoChapon.rosca, n: nCubreAlma,
              pasante: A.pernoChapon.pasante, a: 'PG40 · Cubrejunta alma↔cabezal' }] : []),
            ...(nLapAlma ? [{ rosca: 'M8', n: nLapAlma, pasante: 6.8, enContra: 9.0,
              a: 'PG40 · Cubrejunta alma↔lap' }] : []),
          ].length ? [
            ...(nCubreAlma ? [{ rosca: A.pernoChapon.rosca, n: nCubreAlma,
              pasante: A.pernoChapon.pasante, a: 'PG40 · Cubrejunta alma↔cabezal' }] : []),
            ...(nLapAlma ? [{ rosca: 'M8', n: nLapAlma, pasante: 6.8, enContra: 9.0,
              a: 'PG40 · Cubrejunta alma↔lap' }] : []),
          ] : undefined,
          nota: s < 0
            ? `Corre POR FUERA del alma del side channel (cara exterior X ${almaExt}) y se atornilla `
              + `a ella por sus 3 colisas de reglaje. Deja ${A.holguraPeineNeg} a la placa peine del `
              + `NBT90 y ${A.holguraMotorNeg} al ensamble motor del cliente: la transferencia no se toca.`
            : `Corre a ras de la cara interior del chapón (X ${A.xExt}) FUERA del tramo del módulo; `
              + `dentro del módulo el relevo lo toma el tramo de lap. Techo Z ${A.almaZTop}, suelo `
              + `Z ${A.almaZBot} — 3.03 sobre el canal de montaje del cilindro del NBT90.`,
        });
      out.alargues++;
    }

    // --- (a-bis) TRAMO DE LAP del lado +X ----------------------------------
    if (s > 0) {
      for (const yR of A.lapY) {
        const pernos = A.lapPernosY.filter(y => y > yR[0] && y < yR[1]);
        const fl = [sketchYZ(`Pletina ${A.material} e=${A.lapE} · ${r3(yR[1] - yR[0])} × ${r3(A.lapZTop - A.almaZBot)}`,
          A.lapXPos, rect(yR, [A.almaZBot, A.lapZTop]), A.lapE)];
        for (const y of pernos) {
          fl.push(hole(`Amarre side channel Ø${A.pernoSide.pasante} (Y ${y})`,
            [fuera, y, A.pernoSideZ], dirIn, A.pernoSide.pasante));
        }
        // A3-bis: los M6 ciegos del cubrejunta alma↔lap (fondo de rosca Ø5.0 en
        // los 5.9 de la pletina: 0.98·d de empotramiento).
        let nLap = 0;
        for (const yCub of A.cubreLapY) {
          for (const yb of cuadroY(yCub, yR)) {
            fl.push(hole(`Cubrejunta alma↔lap M6 (fondo de rosca Ø5.0, Y ${yb})`,
              [r3(A.lapXPos + A.lapE + 1), yb, -150], [-1, 0, 0], 5.0, A.lapE, false));
            nLap++;
          }
        }
        E.addPart(`PG40 · Alargue lateral · tramo de lap +X (Y ${yR.join('…')}, ${A.material} e=${A.lapE})`,
          COL.chapa, [A.lapXPos, 0, 0], fl, {
            capaInfo: 'dis',
            uniones: nLap ? [{ rosca: 'M6', n: nLap, pasante: 5.0, enContra: 6.6,
              a: 'PG40 · Cubrejunta alma↔lap' }] : undefined,
            nota: `Rellena el hueco de ${A.separador} entre la cara interior del chapón (${A.xExt}) y la `
              + `del alma del side channel (${almaInt}); ahí van los pernos 3/8 a las colisas SIN casquillos. `
              + `Vive dentro de la MUESCA ya declarada del chapón (techo Z ${A.lapZTop} < −83) y deja `
              + `${A.holguraLapPeine} a la placa peine. Partido en dos para rodear la PLACA COLGANTE DEL `
              + `CANAL del NBT90 (X 500.61…505.37, Y −1081.5…−865.5), que es intocable.`,
          });
        out.alargues++;
      }
      // A3-bis · LOS DOS CUBREJUNTAS ALMA↔LAP tampoco decían CÓMO se fijan.
      // Ahora sí: 2 M8 avellanados a cada pieza, y con el motivo del avellanado
      // y del casquillo escrito, porque aquí el hueco manda.
      const zCubreLap = [-200, -100];
      const gapLap = r3(A.lapXPos - (A.cubreLapX + A.e));      // 8.5 al plano del lap
      for (const yR of A.cubreLapY) {
        const yAl = cuadroY(yR, A.almaPosSur[1] > yR[0] && A.almaPosSur[0] < yR[1] ? A.almaPosSur : A.almaPosNorte);
        const yLp = A.lapY.map(l => cuadroY(yR, l)).find(v => v.length) || [];
        const fcl = [sketchYZ(`Cubrejunta ${r3(yR[1] - yR[0])}×100×${A.e}`, A.cubreLapX, rect(yR, zCubreLap), A.e)];
        for (const yb of yAl) {
          fcl.push(hole(`Al alma Ø9 M8 avellanado (Y ${yb})`,
            [r3(A.cubreLapX - 1), yb, -150], [1, 0, 0], 9.0));
        }
        for (const yb of yLp) {
          fcl.push(hole(`Al lap Ø6.6 M6 avellanado (Y ${yb})`,
            [r3(A.cubreLapX - 1), yb, -150], [1, 0, 0], 6.6));
        }
        E.addPart(`PG40 · Cubrejunta alma↔lap +X (Y ${yR.join('…')})`, COL.chapaOsc, [A.cubreLapX, 0, 0], fcl,
          { capaInfo: 'dis', fabricada: true, material: A.material,
            uniones: [
              ...(yAl.length ? [{ rosca: 'M8', n: yAl.length, pasante: 9.0, enContra: 6.8,
                a: 'PG40 · Alargue lateral · alma' }] : []),
              ...(yLp.length ? [{ rosca: 'M6', n: yLp.length, pasante: 6.6, enContra: 5.0,
                a: 'PG40 · Alargue lateral · tramo de lap' }] : []),
            ],
            nota: `Empalma alma y lap por dentro; esquiva las placas peine del NBT90. CÓMO SE FIJA (lo que `
              + `faltaba): ${yAl.length} tornillos M8 avellanados DIN 7991 ROSCADOS AL ALMA (e = ${A.e}, `
              + `empotramiento 1.0·d) y ${yLp.length} M6 avellanados ROSCADOS AL LAP a través de un casquillo `
              + `separador Ø14/Ø6.6 × ${gapLap} (el lap vive un plano más afuera). Los dos avellanados van `
              + `en la cara INTERIOR del cubrejunta, que es la única accesible: por fuera del lap quedan `
              + `0.05 mm hasta el alma del side channel del NBT90 (X ${r3(A.lapXPos + A.lapE)} contra `
              + `505.369) — no cabe cabeza ni tuerca, y por eso NO son pernos pasantes. M6 y no M8 en el `
              + `lap porque su espesor es ${A.lapE}: con M8 el empotramiento bajaría a 0.74·d. Los 0.5 mm `
              + `entre cubrejunta y alma son holgura de MODELO (evita el sliver booleano): en montaje es `
              + `contacto plano.` });
        out.piezas++;
      }
    }

    // --- (b) CABEZALES DE RODAMIENTO: el cuadro UCF 207 ---------------------
    for (const [nom, eje, yR] of ejesArbol) {
      const fueraCab = s < 0 ? r3(xCab - 2) : fuera;
      const fc = [sketchYZ(`Cabezal ${A.material} e=${A.e} · ${r3(yR[1] - yR[0])} × ${r3(A.cabezalZ[1] - A.cabezalZ[0])}`,
        xCab, rect(yR, A.cabezalZ), A.e)];
      for (const dy of [-UCF207.semi, UCF207.semi]) {
        for (const dz of [-UCF207.semi, UCF207.semi]) {
          fc.push(hole(`Soporte Ø${UCF207.pasante} (${dy > 0 ? '+' : '−'}Y${dz > 0 ? '+' : '−'}Z)`,
            [fueraCab, r3(eje.y + dy), r3(eje.z + dz)], dirIn, UCF207.pasante));
        }
      }
      // El eje del conducido es FIJO Y PASANTE (params_tambores lo declara así),
      // así que el cabezal lleva su paso aunque el patrón publique pasoEje 0.
      const dPaso = eje.pasoEje > 0 ? eje.pasoEje : r3((eje.eje ?? 35) + 10);
      fc.push(hole(`Paso de eje Ø${dPaso}`, [fueraCab, eje.y, eje.z], dirIn, dPaso));
      // A3 · LOS TALADROS DEL CUBREJUNTA, EN EL CABEZAL (la otra mitad de la
      // junta que no existía en ninguna de las tres piezas).
      const uni = [];
      let nCubreCab = 0;
      for (const [nomC, yCub] of CUBRES) {
        for (const yb of cuadroY(yCub, yR)) {
          for (const zb of A.cubrejuntaPernoZ) {
            fc.push(hole(`Cubrejunta ${nomC} Ø${A.pernoChapon.pasante} (Y ${yb}, Z ${zb})`,
              [fueraCab, yb, zb], dirIn, A.pernoChapon.pasante));
            nCubreCab++;
          }
        }
      }
      if (nCubreCab) uni.push({ rosca: A.pernoChapon.rosca, n: nCubreCab,
        pasante: A.pernoChapon.pasante, a: 'PG40 · Cubrejunta alma↔cabezal' });
      // A5 · LOS 2 Ø9 DE LA PLACA DE EXTREMO DEL TRAVESAÑO FRONTAL DEL TENSOR.
      // La nota de esa placa los pedía («INTERFAZ CON EL AGENTE DE PG40») y el
      // cabezal no tenía ninguno: los 5 cilindros del tensor, 700.95 N de tiro,
      // colgaban de una interfaz abierta. Ahora la cota la publica
      // params_pg40.ALARGUE.taladrosTensor y la ejecutan LAS DOS piezas.
      const TT = A.taladrosTensor;
      if (nom === 'motriz') {
        for (const yt of TT.y) {
          fc.push(hole(`Placa de extremo del travesaño frontal del tensor Ø${TT.pasante} (Y ${yt})`,
            [fueraCab, yt, TT.z], dirIn, TT.pasante));
        }
        uni.push({ rosca: TT.rosca, n: TT.y.length, pasante: TT.pasante,
          a: 'FIJO · Placa de extremo del travesaño frontal' });
      }
      E.addPart(`PG40 · Alargue lateral · cabezal de rodamiento ${nom} ${lado} `
        + `(${eje.soporte ?? UCF207.desig}, eje Y ${eje.y} Z ${eje.z})`, COL.chapa, [xCab, 0, 0], fc, {
          capaInfo: 'dis', uniones: uni.length ? uni : undefined,
          nota: `Cara de apoyo del ${UCF207.desig} en X ${xApoyo} (rodamientos hacia dentro): cuadro `
            + `${UCF207.J}×${UCF207.J} de Ø${UCF207.pasante} centrado en el eje, más paso de eje `
            + `Ø${UCF207.pasoEje}. Coplanario con el alma y empalmado a ella por cubrejunta — con `
            + `${nCubreCab} Ø${A.pernoChapon.pasante} en Z ${A.cubrejuntaPernoZ.join(' y ')} (A3). Vive fuera `
            + `de la ventana Y del deck, por eso puede subir sobre el plano de transporte.`
            + (nom === 'motriz'
              ? ` A5: lleva además los ${TT.y.length} Ø${TT.pasante} (Y ${TT.y.join(' y ')}, Z ${TT.z}) de la `
                + `placa de extremo del travesaño frontal del tensor; por eso el canto llega a Y `
                + `${yR[1]} y no a 90, que dejaba el segundo perno 20 mm al aire.`
              : ''),
        });
      out.alargues++;
    }

    // --- (c) CUBREJUNTAS alma ↔ cabezal ------------------------------------
    // A3 · POR AQUÍ PASA LA REACCIÓN DEL TAMBOR MOTRIZ Y DEL CONDUCIDO HASTA EL
    // BASTIDOR, y era la junta que declaraba 8 pernos M10 y no tenía ninguno.
    const escalonCubre = s < 0 ? r3(A.xCabNegInt - A.xNegInt) : 0;   // −X: 16.608
    for (const [nom, yR] of CUBRES) {
      const yCab = nom === 'motriz' ? A.cabezalMotrizY : A.cabezalCondY;
      const fc = [sketchYZ(`Cubrejunta ${r3(yR[1] - yR[0])}×${r3(A.cubrejuntaZ[1] - A.cubrejuntaZ[0])}×${A.e}`,
        xCubre, rect(yR, A.cubrejuntaZ), A.e)];
      const fueraCu = r3(xCubre - 2);
      let nAlma = 0, nCab = 0;
      for (const yb of almaYde(s).flatMap(yA => cuadroY(yR, yA))) {
        for (const zb of A.cubrejuntaPernoZ) {
          fc.push(hole(`Al alma Ø${A.pernoChapon.pasante} (Y ${yb}, Z ${zb})`,
            [fueraCu, yb, zb], [1, 0, 0], A.pernoChapon.pasante));
          nAlma++;
        }
      }
      for (const yb of cuadroY(yR, yCab)) {
        for (const zb of A.cubrejuntaPernoZ) {
          fc.push(hole(`Al cabezal Ø${A.pernoChapon.pasante} (Y ${yb}, Z ${zb})`,
            [fueraCu, yb, zb], [1, 0, 0], A.pernoChapon.pasante));
          nCab++;
        }
      }
      E.addPart(`PG40 · Cubrejunta alma↔cabezal ${nom} ${lado} (${A.material} e=${A.e})`,
        COL.chapaOsc, [xCubre, 0, 0], fc, {
          capaInfo: 'dis', fabricada: true, material: A.material,
          uniones: [
            { rosca: A.pernoChapon.rosca, n: nAlma, pasante: A.pernoChapon.pasante,
              a: 'PG40 · Alargue lateral · alma' },
            { rosca: A.pernoChapon.rosca, n: nCab, pasante: A.pernoChapon.pasante,
              a: 'PG40 · Alargue lateral · cabezal de rodamiento' },
          ],
          nota: `A3 CERRADO. ${nAlma} pernos M10 al alma y ${nCab} al cabezal, EMITIDOS en las tres `
            + `piezas: dos filas en Z ${A.cubrejuntaPernoZ.join(' y ')} (paso `
            + `${r2(Math.abs(A.cubrejuntaPernoZ[0] - A.cubrejuntaPernoZ[1]))} ≥ 2.2·d₀ = `
            + `${r2(2.2 * A.pernoChapon.pasante)}) y dos columnas a ±${A.cubrejuntaPernoDY} del centro del `
            + `solape (paso ${2 * A.cubrejuntaPernoDY}), con ≥ 15 mm de distancia al canto en las tres `
            + `chapas (mínimo 1.2·d₀ = ${r2(1.2 * A.pernoChapon.pasante)}, EN 1993-1-8). El canto del `
            + `cubrejunta sube de 35 a ${r3(A.cubrejuntaZ[1] - A.cubrejuntaZ[0])} (Z `
            + `${A.cubrejuntaZ.join('…')}): con 35 sólo cabía UNA fila y la junta no cosía nada. No sube `
            + `a 80 porque el faldón del cabezal muere en Z ${A.cabezalZ[0]} y por abajo está el ensamble `
            + `motor UniDrive del cliente (techo Z −155.17). Queda bajo el plano de transporte.`
            + (s < 0
              ? ` Lado −X: entre el plano del cubrejunta (X ${xCubre}) y el del alma (X ${A.xNegInt}) hay `
                + `el escalón de ${escalonCubre} mm del alargue → los ${nAlma} pernos al alma llevan `
                + `CASQUILLO SEPARADOR Ø${A.casquillo.od}/Ø${A.pernoChapon.pasante} × ${escalonCubre}. `
                + `Los del cabezal son contacto plano.`
              : ' Lado +X: contacto plano cara con cara contra alma y cabezal (los tres en X '
                + `${xCubre}…${r3(xCubre + A.e)} / ${A.xInt}).`) });
      out.piezas++;
    }

    // --- (c-bis) CARTELAS DE LOS RODILLOS DE RETORNO -----------------------
    // Patrón y cara de apoyo los publica adapt/params_tambores.mjs
    // (retornoSoporte: cuadrado 76×76 de Ø11, cara 67.494 / 491.418, INBOARD).
    // Van en el plano de los cabezales, corridas 8.608 respecto del alma en −X:
    // el escalón se salva con casquillos separadores en los pernos de empalme.
    if (s < 0) {
      // RR1/RR2 y RR3/RR4 están a 66 y 45 mm: sus cartelas se pisarían. Se
      // agrupan las que se solapan y sale UNA cartela por grupo.
      const grupos = [];
      for (const rr of [...RETORNOS].sort((a, b) => b.y - a.y)) {
        const g = grupos.find(gr => gr.some(q => Math.abs(q.y - rr.y) < 120));
        if (g) g.push(rr); else grupos.push([rr]);
      }
      for (const g of grupos) {
        const ys = g.map(q => q.y), zs = g.map(q => q.z);
        const yR = [r3(Math.min(...ys) - 60), r3(Math.max(...ys) + 60)];
        const zLo = r3(Math.min(...zs, -200) - 60), zHi = r3(Math.max(...zs, -190) + 60);
        const fr = [sketchYZ(`Cartela ${r3(yR[1] - yR[0])}×${r3(zHi - zLo)}×${A.e}`,
          xCab, rect(yR, [zLo, zHi]), A.e)];
        for (const rr of g) {
          for (const dy of [-(RSOP.patronY ?? RSOP.patron) / 2, (RSOP.patronY ?? RSOP.patron) / 2]) {
            for (const dz of [-(RSOP.patronZ ?? RSOP.patron) / 2, (RSOP.patronZ ?? RSOP.patron) / 2]) {
              fr.push(hole(`Soporte de retorno ${rr.id} Ø${RSOP.taladro}`,
                [r3(xCab - 2), r3(rr.y + dy), r3(rr.z + dz)], dirIn, RSOP.taladro));
            }
          }
          fr.push(hole(`Paso del eje de retorno ${rr.id} Ø${r3((RSOP.bore ?? 30) + 10)}`,
            [r3(xCab - 2), rr.y, rr.z], dirIn, r3((RSOP.bore ?? 30) + 10)));
        }
        E.addPart(`PG40 · Cartela de rodillos de retorno ${g.map(q => q.id).join('+')} ${lado}`,
          COL.chapaOsc, [xCab, 0, 0], fr, {
            capaInfo: 'dis',
            nota: `Lleva el cuadro ${RSOP.patronY ?? RSOP.patron}×${RSOP.patronZ ?? RSOP.patron} de Ø${RSOP.taladro} de `
              + `${g.map(q => q.id).join(' y ')} en la cara de apoyo X ${xApoyo} que publica `
              + 'adapt/params_tambores.mjs, más el paso de cada eje fijo. Una sola cartela por grupo: '
              + 'a 66 y 45 mm de separación, dos placas independientes se pisarían.',
          });
        out.piezas++;
      }
    }

    // --- (d) MÉNSULAS alma → travesaño PG40 (el amarre del bastidor) -------
    // A4 · ERA UNA PLETINA PLANA sin taladro ni cordón, en el plano YZ, y decía
    // atornillarse a un travesaño cuyas ranuras miran a ±Y y ±Z. Ahora es
    // escuadra: ala vertical SOLDADA al alma (solape de 30 mm) + ala horizontal
    // bajo el travesaño con 2 M8 de tuerca martillo en su ranura −Z.
    for (const [i, y] of A.mensulaY.entries()) {
      const yTrav = A.mensulaTravY[i];
      const TB = A.mensulaTab;
      const semi = A.mensulaAncho / 2;
      const yCaraTrav = r3(yTrav + PERFIL.b / 2);           // cara +Y del travesaño
      const yTab = r3(yCaraTrav + TB.e / 2);                // eje de la pestaña
      const xIn = s < 0 ? r3(xMens + A.e) : xMens;          // cara interior del ala vertical
      const xT = s < 0 ? r3(xIn + TB.largo / 2) : r3(xIn - TB.largo / 2);
      const fm = [
        sketchYZ(`Ala vertical ${A.mensulaAncho}×${r3(A.mensulaZ[1] - A.mensulaZ[0])}×${A.e}`,
          xMens, rect([r3(y - semi), r3(y + semi)], A.mensulaZ), A.e),
        box(`Pestaña al travesaño ${TB.largo}×${TB.e}×${TB.alto}`,
          [xT, yTab, r3(TB.z - TB.alto / 2)], TB.largo, TB.e, TB.alto),
      ];
      for (const dx of TB.pernoX) {
        fm.push(hole(`Ø${TB.pasante} ${TB.rosca} a la ranura +Y del travesaño (X +${dx})`,
          [r3(xIn - s * dx), r3(yTab + TB.e / 2 + 1), TB.z], [0, -1, 0], TB.pasante));
      }
      E.addPart(`PG40 · Ménsula alma↔travesaño ${lado} (Y ${y})`, COL.chapaOsc, [xMens, 0, 0], fm,
        { capaInfo: 'dis', fabricada: true, material: A.material,
          cordon: A.mensulaCordon,
          uniones: [{ rosca: TB.rosca, n: TB.pernoX.length, pasante: TB.pasante,
            a: `ranura 10 (+Y) del travesaño Y ${yTrav} — tuerca martillo` }],
          nota: `A4 CERRADO. Sube del alma del alargue al travesaño PG40: es EL AMARRE del bastidor a los `
            + `canales laterales del NBT90, y hasta ahora era una PLETINA PLANA, contenida en el plano YZ, `
            + `sin un solo taladro ni cordón — y una pletina en ese plano no se puede atornillar a un `
            + `perfil cuyas ranuras miran a ±Y y ±Z. Ahora son dos alas: la VERTICAL `
            + `(${A.mensulaAncho} × ${r3(A.mensulaZ[1] - A.mensulaZ[0])} × ${A.e}) solapa `
            + `${r3(A.almaZTop - A.mensulaZ[0])} mm sobre el alma (Z ${A.mensulaZ[0]}…${A.almaZTop}) y va `
            + `SOLDADA — ${A.mensulaCordon}. Soldada y no atornillada por acceso: en +X la cara exterior `
            + `del alma ES la cara interior del chapón del cliente y no hay sitio para tuerca, y una M10 `
            + `roscada en ${A.e} mm de chapa daría 0.8·d de empotramiento. La PESTAÑA `
            + `(${TB.largo} × ${TB.alto} × ${TB.e}) apoya contra la cara +Y del travesaño (Y ${yCaraTrav}) `
            + `con 2 Ø${TB.pasante} para tuerca martillo M8 en su ranura 10, separados `
            + `${TB.pernoX[1] - TB.pernoX[0]} en X (≥ 2.2·d₀ = 19.8) y a ${TB.pernoX[0]} del rincón `
            + `(≥ 1.2·d₀ = 10.8). Va a la ranura +Y y no a la de abajo porque en +X la pletina de soporte `
            + `de RR1 ocupa Y −656…−556 en este mismo plano de chapa: la ranura −Z del travesaño norte `
            + `(Y ${yTrav}) cae dentro de esa zona y la pieza no se podría montar.` });
      out.piezas++;
      for (const dx of TB.pernoX) {
        pernoHex(E, { nombre: `M8×20 ménsula↔travesaño ${lado} (Y ${yTrav}, X +${dx})`,
          at: [r3(xIn - s * dx), r3(yTab + TB.e / 2), TB.z], dir: [0, -1, 0], dia: 8, largo: 20, af: 13, altoCab: 5.3, capa: 'PG40 · ' });
        out.tornilleria++;
      }
    }

    // --- (e) TORNILLERÍA del amarre a las colisas del side channel ---------
    for (const y of (s > 0 ? A.lapPernosY : A.pernosSideY)) {
      pernoHex(E, { nombre: `3/8-16 × 25 · alargue ${lado} Y ${y}`, at: [almaExt, y, A.pernoSideZ],
        dir: dirIn, dia: A.pernoSide.d, largo: 25, capa: 'PG40 · ' });
      golilla(E, { nombre: `alargue ${lado} Y ${y}`, at: [almaExt, y, A.pernoSideZ], dir: dirIn, dia: A.pernoSide.d, capa: 'PG40 · ' });
      tuercaHex(E, { nombre: `3/8-16 · alargue ${lado} Y ${y}`, at: [almaInt, y, A.pernoSideZ], dir: dirIn, dia: A.pernoSide.d, capa: 'PG40 · ' });
      out.tornilleria += 3;
    }
    // --- (f) TORNILLERÍA M10 al chapón (solo +X) ---------------------------
    if (s > 0) {
      // SALIDA DE HILO. Aquí ponía M10×45 escrito a mano: con 36 de apriete
      // (chapón 28 + alma 8) y una tuerca ISO 4032 de 8.4, el vástago moría
      // 0.50 mm detrás de la tuerca — ni un paso de salida, o sea una unión que
      // no se puede apretar al par ni comprobar por inspección. El largo lo
      // calcula ahora params_pg40 ALARGUE.pernoChaponCalc con el criterio
      // escrito: L ≥ apriete + tuerca + 2 pasos, subido al escalón ISO 888.
      const PC = A.pernoChaponCalc;
      for (const y of A.pernosChaponY) {
        const pb = pernoHex(E, { nombre: `M10 × ${PC.largo} · alargue↔chapón Y ${y}`,
          at: [r3(STEP.frameIntPos + STEP.frameEsp), y, A.pernosChaponZ],
          dir: [-1, 0, 0], dia: A.pernoChapon.d, largo: PC.largo, capa: 'PG40 · ' });
        pb.salidaHilo = { apriete: PC.apriete, tuercaH: PC.tuercaH, paso: PC.paso,
          minTeorico: PC.minTeorico, largo: PC.largo, salidaMm: PC.salidaMm, salidaPasos: PC.salidaPasos };
        pb.nota = `M10 × ${PC.largo} (ISO 888) y no ×45: apriete ${PC.apriete} = chapón `
          + `${STEP.frameEsp} (step) + alma ${A.e}, tuerca ISO 4032 de ${PC.tuercaH}, más 2 pasos de `
          + `${PC.paso} de SALIDA DE HILO → mínimo ${PC.minTeorico}, escalón normalizado ${PC.largo}. `
          + `Quedan ${PC.salidaMm} mm (${PC.salidaPasos} pasos) sobresaliendo de la tuerca; con el ×45 `
          + `quedaban 0.50 mm, que en obra es no tener salida: el último hilo va biselado y una tuerca `
          + `a ras del extremo no se puede apretar al par.`;
        const tu = tuercaHex(E, { nombre: `M10 · alargue↔chapón Y ${y}`, at: [xApoyo, y, A.pernosChaponZ],
          dir: [-1, 0, 0], dia: A.pernoChapon.d, alto: PC.tuercaH, capa: 'PG40 · ' });
        tu.nota = `Tuerca ISO 4032 M10 (m = ${PC.tuercaH}). Su perno es el M10 × ${PC.largo} de esta `
          + `misma Y: cierra sobre la cara interior del alma (X ${xApoyo}) y deja ${PC.salidaMm} mm de `
          + `vástago por detrás — ${PC.salidaPasos} pasos de salida de hilo, sobre el mínimo de 2.`;
        out.tornilleria += 2;
      }
    }
  }

  // -------------------------------------------------------------------------
  // §5 COMPROBACIONES (se devuelven; la compuerta las exige)
  // -------------------------------------------------------------------------
  // (a) flecha del larguero: bulto ENTERO (34 kg) sobre UNA calle, centrado en
  //     el vano mayor entre travesaños. δ = P·L³/(48·E·I)  [viga biapoyada]
  const vanos = [];
  for (const rango of [TRAMOS.sur, TRAMOS.norte]) {
    const ap = TRAVESANOS.filter(y => y > rango[0] && y < rango[1]).sort((a, b) => a - b);
    for (let i = 1; i < ap.length; i++) vanos.push(r3(ap[i] - ap[i - 1]));
  }
  const vanoMax = Math.max(...vanos);
  const EI = PERFIL.E * PERFIL.Ixmm4;
  const flechaLarguero = r3(CARGA.N * vanoMax ** 3 / (48 * EI));
  const sigmaLarguero = r3((CARGA.N * vanoMax / 4) / PERFIL.Wxmm3);
  // (b) flecha del travesaño: la misma carga por el larguero central, que cae
  //     justo en el centro del vano entre alargues (X 279.456 = centro de 423.924)
  const flechaTravesano = r3(CARGA.N * PUBLICA.luzEntreCaras ** 3 / (48 * EI));

  // (c) holguras del alargue contra las ALAS del side channel del NBT90
  //     (alas en Z −253.37…−250.71 y −90.93…−88.27, cajas del JSON transformado)
  const alaInfTop = -250.71, alaSupBot = -90.93;
  const holguraAlaInf = r3(ALARGUE.almaZBot - alaInfTop);     // 2.71
  const holguraAlaSup = r3(alaSupBot - ALARGUE.lapZTop);      // 2.07
  // (d) el perno de amarre cae DENTRO del recorrido de la colisa vertical
  const colisa = [r3(ALARGUE.sideColisaZc - ALARGUE.sideColisaAlto / 2),
    r3(ALARGUE.sideColisaZc + ALARGUE.sideColisaAlto / 2)];
  const pernoEnColisa = ALARGUE.pernoSideZ > colisa[0] && ALARGUE.pernoSideZ < colisa[1];
  const cantoPerno = r3(ALARGUE.pernoSideZ - ALARGUE.lapZTop) * -1;   // 20 al canto superior

  out.piezas = E.parts.length - p0;
  return {
    ...out,
    perfil: `40×40 ranura ${PERFIL.ranura} · ${PERFIL.aleacion} · Ix=${PERFIL.Ix} cm⁴ · ${PERFIL.masaKgM} kg/m (web PG40-001)`,
    guia: `${GUIA.material} ${GUIA.ancho}×${GUIA.alto} · clip a ranura 10 · cara de rodadura Z ${Z.guiaTop} · vuelo de banda ${GUIA.vueloBanda}/lado`,
    flecha: {
      vanoMax, flechaLarguero, flechaTravesano, sigmaLarguero,
      limite: r3(Math.min(CARGA.flechaMaxAbs, vanoMax / CARGA.flechaMaxRel)),
      hipotesis: `bulto de ${CARGA.bultoKg} kg (${CARGA.N} N) ENTERO sobre una calle, centrado en el vano`,
    },
    alargue: {
      material: ALARGUE.material, e: ALARGUE.e,
      largo: r3(ALARGUE.almaY[1] - ALARGUE.almaY[0]),
      alcance: r3(ALARGUE.cabezalMotrizY[1] - ALARGUE.cabezalCondY[0]),
      caraApoyo: PUBLICA.caraApoyo, luzEntreCaras: PUBLICA.luzEntreCaras,
      separador: ALARGUE.separador,
      holguraAlaInf, holguraAlaSup, pernoEnColisa, cantoPerno,
      pernosSide: ALARGUE.pernosSideY.length * 2, pernosChapon: ALARGUE.pernosChaponY.length,
    },
    publica: PUBLICA,
    modificacionCliente: `${ALARGUE.pernosChaponY.length} taladros Ø${ALARGUE.pernoChapon.pasante} `
      + `(${ALARGUE.pernoChapon.rosca}) en el chapón de descarga FRAME_MIR_MIR_MIR, en Z ${ALARGUE.pernosChaponZ}. `
      + 'MODIFICACIÓN AL CLIENTE declarada, como la muesca: revisión estructural pendiente de su validación.',
  };
}

export { FLAGS };
