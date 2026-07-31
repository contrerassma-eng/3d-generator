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

import { box, cyl, hole, sketchYZ, pernoHex, tuercaHex, golilla, COL, r2 }
  from '../../nbt90/lib.mjs';
import {
  FLAGS, PERFIL, Z, GUIA, TRAMOS, TRAVESANOS, ALARGUE, UCF207, EJES_ARBOL,
  PUBLICA, CARGA, STEP, NBT, Xc, EJES, T,
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
          ], { capaInfo: 'dis', nota: `escuadra de tope con tuerca martillo ${GUIA.topeExtremo.tornillo} en la ranura lateral` });
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
    perfilPG40(E, `PG40 · Travesaño 40×40 ranura 10 L=${luzBastidores} (Y ${y})`,
      'x', y, xTrav, Z.travBot,
      { nota: 'cruza la luz entre bastidores 580.84 (cota congelada); los 5 largueros apoyan encima' });
    out.travesanos++;
    // escuadras larguero ↔ travesaño (una por calle)
    for (let k = 0; k < EJES.length; k++) {
      escuadra(E, `PG40 · Escuadra larguero↔travesaño (calle ${k + 1}, Y ${y})`,
        [EJES[k], r3(y - PERFIL.b / 2 - 3), Z.travTop], [PERFIL.b, 35],
        { nota: 'tuercas martillo M8 ranura 10 en larguero y travesaño' });
      out.piezas++;
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

  for (const s of [-1, 1]) {                       // −1 = lado −X, +1 = lado +X
    const lado = s < 0 ? '−X' : '+X';
    // Cara desde la que se extruye el boceto YZ (crece en +X):
    const xFace = s < 0 ? A.xNegExt : A.xInt;      // alma: −X 42.886 · +X 491.418
    const xCab = s < 0 ? A.xCabNegExt : A.xInt;    // cabezal: el plano que pide tambores
    const xExt = s < 0 ? A.xNegExt : A.xExt;       // cara exterior (hacia el bastidor)
    const xApoyo = s < 0 ? A.xCabNegInt : A.xInt; // cara de apoyo del soporte de rodamiento
    const dirIn = [s > 0 ? -1 : 1, 0, 0];          // hacia el interior del sorter
    const fuera = r3(xExt + s * 2);                // arranque de los taladros
    const xCubre = s < 0 ? A.xCabNegExt : r3(A.xInt - A.e);  // cubrejunta, en el plano del cabezal
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
      const fa = [sketchYZ(`Pletina ${A.material} e=${A.e} · ${r3(yR[1] - yR[0])} × ${r3(zAlma[1] - zAlma[0])}`,
        xFace, rect(yR, zAlma), A.e)];
      // pernos a las colisas del side channel (solo el lado −X los lleva en el
      // alma: en +X los lleva el tramo de lap, que es el que toca el alma del side)
      if (s < 0) {
        for (const y of A.pernosSideY) {
          fa.push(hole(`Amarre side channel Ø${A.pernoSide.pasante} (Y ${y})`,
            [fuera, y, A.pernoSideZ], dirIn, A.pernoSide.pasante));
        }
      } else {
        for (const y of A.pernosChaponY.filter(y => y > yR[0] && y < yR[1])) {
          fa.push(hole(`Amarre chapón Ø${A.pernoChapon.pasante} (Y ${y})`,
            [fuera, y, A.pernosChaponZ], dirIn, A.pernoChapon.pasante));
        }
      }
      E.addPart(`PG40 · Alargue lateral · alma ${suf}${lado} (pletina ${A.material} e=${A.e}, L=${r3(yR[1] - yR[0])})`,
        COL.chapa, [xFace, 0, 0], fa, {
          capaInfo: 'dis',
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
        E.addPart(`PG40 · Alargue lateral · tramo de lap +X (Y ${yR.join('…')}, ${A.material} e=${A.lapE})`,
          COL.chapa, [A.lapXPos, 0, 0], fl, {
            capaInfo: 'dis',
            nota: `Rellena el hueco de ${A.separador} entre la cara interior del chapón (${A.xExt}) y la `
              + `del alma del side channel (${almaInt}); ahí van los pernos 3/8 a las colisas SIN casquillos. `
              + `Vive dentro de la MUESCA ya declarada del chapón (techo Z ${A.lapZTop} < −83) y deja `
              + `${A.holguraLapPeine} a la placa peine. Partido en dos para rodear la PLACA COLGANTE DEL `
              + `CANAL del NBT90 (X 500.61…505.37, Y −1081.5…−865.5), que es intocable.`,
          });
        out.alargues++;
      }
      for (const yR of A.cubreLapY) {
        E.addPart(`PG40 · Cubrejunta alma↔lap +X (Y ${yR.join('…')})`, COL.chapaOsc, [A.cubreLapX, 0, 0], [
          sketchYZ(`Cubrejunta ${r3(yR[1] - yR[0])}×100×${A.e}`, A.cubreLapX, rect(yR, [-200, -100]), A.e),
        ], { capaInfo: 'dis', nota: 'empalma alma y lap por dentro; esquiva las placas peine del NBT90' });
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
      const dPaso = eje.pasoEje ?? UCF207.pasoEje;
      if (dPaso > 0) fc.push(hole(`Paso de eje Ø${dPaso}`, [fueraCab, eje.y, eje.z], dirIn, dPaso));
      E.addPart(`PG40 · Alargue lateral · cabezal de rodamiento ${nom} ${lado} `
        + `(${eje.soporte ?? UCF207.desig}, eje Y ${eje.y} Z ${eje.z})`, COL.chapa, [xCab, 0, 0], fc, {
          capaInfo: 'dis',
          nota: `Cara de apoyo del ${UCF207.desig} en X ${xApoyo} (rodamientos hacia dentro): cuadro `
            + `${UCF207.J}×${UCF207.J} de Ø${UCF207.pasante} centrado en el eje, más paso de eje `
            + `Ø${UCF207.pasoEje}. Coplanario con el alma y empalmado a ella por cubrejunta. Vive fuera `
            + `de la ventana Y del deck, por eso puede subir sobre el plano de transporte.`,
        });
      out.alargues++;
    }

    // --- (c) CUBREJUNTAS alma ↔ cabezal ------------------------------------
    for (const [nom, yR] of [['motriz', [-260, 10]], ['conducido', [-1600, -1470]]]) {
      E.addPart(`PG40 · Cubrejunta alma↔cabezal ${nom} ${lado} (${A.material} e=${A.e})`,
        COL.chapaOsc, [xCubre, 0, 0], [
          sketchYZ(`Cubrejunta ${r3(yR[1] - yR[0])}×${r3(A.cubrejuntaZ[1] - A.cubrejuntaZ[0])}×${A.e}`,
            xCubre, rect(yR, A.cubrejuntaZ), A.e),
        ], { capaInfo: 'dis', nota: '4 pernos M10 al alma y 4 al cabezal; queda bajo el plano de transporte' });
      out.piezas++;
    }

    // --- (d) MÉNSULAS alma → travesaño PG40 (el amarre del bastidor) -------
    for (const y of A.mensulaY) {
      E.addPart(`PG40 · Ménsula alma↔travesaño ${lado} (Y ${y})`, COL.chapaOsc, [xFace, 0, 0], [
        sketchYZ(`Ménsula ${PERFIL.b}×${r3(A.mensulaZ[1] - A.mensulaZ[0])}×${A.e}`,
          xFace, rect([r3(y - PERFIL.b / 2), r3(y + PERFIL.b / 2)], A.mensulaZ), A.e),
      ], { capaInfo: 'dis',
        nota: 'sube del alma del alargue al travesaño PG40: es el amarre del bastidor a los canales laterales del NBT90' });
      out.piezas++;
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
      for (const y of A.pernosChaponY) {
        pernoHex(E, { nombre: `M10 × 45 · alargue↔chapón Y ${y}`, at: [r3(STEP.frameIntPos + 28), y, A.pernosChaponZ],
          dir: [-1, 0, 0], dia: A.pernoChapon.d, largo: 45, capa: 'PG40 · ' });
        tuercaHex(E, { nombre: `M10 · alargue↔chapón Y ${y}`, at: [xApoyo, y, A.pernosChaponZ], dir: [-1, 0, 0], dia: A.pernoChapon.d, capa: 'PG40 · ' });
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
