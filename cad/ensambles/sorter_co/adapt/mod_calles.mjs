// mod_calles.mjs — las 5 CALLES del sorter adaptado, a paso 76.2, centradas en
// los 5 huecos de banda del NBT90. Por calle:
//   · perfil TSLOT en DOS tramos (el módulo y el pozo quedan sin perfil);
//   · cama de guías UHMW re-repartida (piezas guiaw del cliente reubicadas);
//   · el PUENTE: la calle portante dentro del módulo, 30 mm de ancho en la
//     franja que barre el rodillo, apoyado en los travesaños de la percha;
//   · la banda T5 con el lazo NUEVO: el retorno baja en un pozo ancho y pasa
//     POR DEBAJO del módulo (así se resuelve la profundidad);
//   · V1/V4: los volantes Ø100 del cliente reubicados (contraflexión, dorso);
//   · V2: TENSORA nueva en colisa vertical (polea Ø117.9 = POL-CON-TEN del
//     cliente + su eje Ø20 + su cilindro C85: el brazo pivotante desaparece);
//   · V3: polea plana Ø117.9 fija colgada del travesaño norte;
//   · el grupo motriz/conducida y el resto del conjunto de calle del cliente,
//     como contexto reubicado con su caja medida.
// Capas: todo lo nuevo es FIJO (el único móvil del conjunto es el cassette del
// NBT90). Procedencias en params_adapt.mjs.

import {
  box, cyl, hole, sketchYZ, bandaFaces, largoBanda, envolventes, COL, r2, pernoHex,
} from '../../nbt90/lib.mjs';
import { STEP, NBT, FRANJA, EJES, T, y0, y1, PERCHA, POZO, CALLE } from './params_adapt.mjs';

const T_BANDA = STEP.bandaDorso;          // 0.633 — la banda se modela POR SU DORSO
// (cota step: dorso 52.333 − cara de guía 51.7). Los dientes (espesor total T5
// ≈ 2.2) corren entre los rieles de la guía y no se modelan: así el contacto
// banda↔guía queda EXACTO a lo medido y sin interferencias fantasma.
const DIENTE_EXTRA = 2.2 - T_BANDA;       // 1.567 — resalto real del diente (T5 cat)

// Radios de contacto del lazo (ver justificación en cada elemento):
const R_63T = STEP.polea63.rContacto;     // 51.7 → dorso a ±52.333 en motriz/conducida
const R_VOL = STEP.volante.cara / 2;      // 50.0 — volante toca el DORSO
const R_TEN = STEP.polTensora.dia / 2 + DIENTE_EXTRA;  // 60.517 — la polea plana toca
// la cara DENTADA (como la tensora del cliente hoy): el dorso queda 1.567 más afuera.

// ---------------------------------------------------------------------------
/** Perfil ranurado 40×80 (o 40×40) como box + ranuras de boca 8.2 (step §4.2)
 *  en las caras que llevan tornillería, para que los tornillos entren sin
 *  interferencia. dirLargo: 'y'. Caras: '+z','-z','+x','-x'. */
export function perfilRanurado(E, nombre, xCentro, yRange, zRange, caras, extra = {}) {
  const L = r2(yRange[1] - yRange[0]);
  const b = 40, h = r2(zRange[1] - zRange[0]);
  const yc = r2((yRange[0] + yRange[1]) / 2);
  const f = [box(`Perfil ${b}×${h}×${L}`, [xCentro, yc, zRange[0]], b, L, h)];
  const boca = 8.2, prof = 12;            // step TSLOT-001: boca 8.2; prof. útil labios+cavidad
  let nr = 0;
  const ranura = (x, z0, z1, w, hgt) => f.push(
    { id: `${nombre.replace(/\W+/g, '_')}_r${++nr}`, name: `Ranura 8`, shape: 'box', op: 'cut',
      at: [x, yc, z0], dir: [0, 0, 1], params: { w, d: L, h: hgt } });
  const zc = r2((zRange[0] + zRange[1]) / 2);
  for (const c of caras) {
    if (c === '+z') ranura(xCentro, r2(zRange[1] - prof), 0, boca, prof);
    if (c === '-z') ranura(xCentro, zRange[0], 0, boca, prof);
    // caras laterales: ranuras al paso de 40 (una por módulo de 40 de canto)
    if (c === '+x' || c === '-x') {
      const x = c === '+x' ? r2(xCentro + b / 2 - prof / 2) : r2(xCentro - b / 2 + prof / 2);
      const zs = h > 40 ? [r2(zc - 20), r2(zc + 20)] : [zc];
      for (const z of zs) ranura(x, r2(z - boca / 2), 0, prof, boca);
    }
  }
  return E.addPart(nombre, COL.acero, [xCentro, yc, zRange[0]], f, {
    catalogo: `perfil ranurado ${b}×${h} ranura 8 serie 40 (familia del TSLOT del cliente, web TSLOT-001)`,
    ...extra,
  });
}

/** Polea de calle (revolve simplificado a cilindros coaxiales según X). */
function poleaX(E, nombre, xc, y, z, cara, ancho, pest, pestE, bore, color, extra = {}) {
  const at = [r2(xc - ancho / 2), y, z];
  const f = [cyl(`Cara Ø${cara}×${ancho}`, at, [1, 0, 0], cara, ancho)];
  if (pestE > 0 && pest > cara) {
    f.push(cyl(`Pestaña Ø${pest}`, at, [1, 0, 0], pest, pestE));
    f.push(cyl(`Pestaña Ø${pest}`, [r2(xc + ancho / 2 - pestE), y, z], [1, 0, 0], pest, pestE));
  }
  f.push(hole(`Bore Ø${bore}`, [r2(xc - ancho / 2 - 1), y, z], [1, 0, 0], bore));
  return E.addPart(nombre, color, at, f, extra);
}

// ---------------------------------------------------------------------------
export function calles(E) {
  const M = { piezas0: E.parts.length, porCalle: [], reuso: {}, nuevas: {} };
  const cuenta = (obj, k, n = 1) => { obj[k] = (obj[k] || 0) + n; };

  // --- el LAZO de banda (idéntico en las 5 calles; plano YZ) ---------------
  const seq = [
    { c: [STEP.motrizY, 0], r: R_63T, s: +1 },        // motriz 63T (dientes)
    { c: [STEP.conducidaY, 0], r: R_63T, s: +1 },     // conducida 63T
    { c: [POZO.v1.y, POZO.v1.z], r: R_VOL, s: -1 },   // V1 contraflexión (dorso)
    { c: [POZO.v2.y, POZO.v2.z], r: R_TEN, s: +1 },   // V2 tensora (dientes)
    { c: [POZO.v3.y, POZO.v3.z], r: R_TEN, s: +1 },   // V3 fija (dientes)
    { c: [POZO.v4.y, POZO.v4.z], r: R_VOL, s: -1 },   // V4 contraflexión (dorso)
  ];
  const largo = largoBanda(seq, T_BANDA);
  const env = envolventes(seq, T_BANDA);
  // La poligonal de bandaFaces va INSCRITA en cada circunferencia y sus lados
  // morderían la llanta la flecha f = r·(1−cos(paso/2)). Igual que el serpentín
  // del NBT90 (transmision.mjs): se levanta cada radio esa flecha y la poligonal
  // queda CIRCUNSCRITA (toca sin penetrar). Largo y envolventes, con seq real.
  const nArco = 26;
  const flecha = seq.map((q, i) => q.r * (1 - Math.cos(env[i] * Math.PI / 180 / nArco / 2)));
  const seqFacetas = seq.map((q, i) => ({ c: q.c, r: q.r + flecha[i], s: q.s }));
  const caras = bandaFaces(seqFacetas, T_BANDA, nArco);
  const zTop = Math.max(...caras.outer.map(p => p[1]));
  const zFondo = Math.min(...caras.outer.map(p => p[1]));

  // Holgura de la banda al conjunto del cilindro tensor (numérica, sobre los
  // puntos reales del contorno): cuerpo HORIZONTAL a Z = POZO.cilTensor.z,
  // extendido hacia −Y desde la culata; y tirantes del yugo al nivel del eje.
  const cilR = STEP.cilC85.cuerpoDia / 2;
  const cilYRange = [r2(POZO.cilTensor.culataY - STEP.cilC85.cuerpoLargo), POZO.cilTensor.culataY];
  let holguraBandaCil = Infinity;
  // los TRAMOS RECTOS del lazo no tienen puntos propios (bandaFaces solo emite
  // arcos): se muestrea la POLILÍNEA completa cada ≤5 mm
  const muestrea = (poly) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(L / 5));
      for (let j = 0; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    return out;
  };
  for (const p of [...muestrea(caras.outer), ...muestrea(caras.inner)]) {
    if (p[0] >= cilYRange[0] - 5 && p[0] <= cilYRange[1] + 5) {
      holguraBandaCil = Math.min(holguraBandaCil, Math.abs(p[1] - POZO.cilTensor.z) - cilR);
    }
    // vástago + traviesa + KJ10D (Y −1412…−1354, radio efectivo 5 en Z −340;
    // la traviesa sube a Z −280): contra el arco de V2 y la bajada
    if (p[0] >= -1412 && p[0] <= -1354) {
      holguraBandaCil = Math.min(holguraBandaCil, Math.abs(p[1] - POZO.cilTensor.z) - 5);
    }
  }

  // --- piezas por calle ----------------------------------------------------
  EJES.forEach((B, k) => {
    const c = `calle ${k + 1}, X=${B}`;

    // 1. perfil en dos tramos (ranuras: superior para futura tornillería de
    //    cama, inferior para las pletinas de V1/V2/V4)
    perfilRanurado(E, `FIJO · Perfil ranurado 40×80 tramo conducido L=${r2(CALLE.tslotSurY[1] - CALLE.tslotSurY[0])} (${c})`,
      B, CALLE.tslotSurY, [-40, 40], ['+z', '-z'],
      { nota: 'reutiliza el TSLOT del cliente cortado (1497.4 da los dos tramos); queda CENTRADO bajo la banda (se corrige el descentrado de 1.0 mm, step §1.1)' });
    perfilRanurado(E, `FIJO · Perfil ranurado 40×80 tramo motriz L=${r2(CALLE.tslotNorteY[1] - CALLE.tslotNorteY[0])} (${c})`,
      B, CALLE.tslotNorteY, [-40, 40], ['+z', '-z'], {});
    cuenta(M.reuso, 'TSLOT del cliente cortado en 2 tramos', 1);

    // 2. cama de guías (guiaw del cliente reubicadas; caja step 39.9×200×18.55).
    // El sólido se modela de Z 40.0 (cara superior del perfil) a 51.7: los 6.85
    // inferiores de la envolvente real (33.15…40, el encaje de la guía dentro
    // del perfil) no se modelan para no fingir un solape; el perfil interior es
    // el del cliente.
    for (const [a, b] of [...CALLE.guiasSur, ...CALLE.guiasNorte]) {
      const L = r2(b - a);
      E.addPart(`FIJO · Guía de deslizamiento ${STEP.guiaSec.ancho}×${L} (guiaw reubicada) (${c}, Y ${a}…${b})`,
        COL.uretano, [B, r2((a + b) / 2), 40.0],
        [box(`Guía ${STEP.guiaSec.ancho}×${L}×${r2(STEP.guiaSec.topZ - 40)}`,
          [B, r2((a + b) / 2), 40.0], STEP.guiaSec.ancho, L, r2(STEP.guiaSec.topZ - 40))],
        { nota: 'pieza guiaw del cliente reubicada; cara de apoyo a Z=51.7 (step); el encaje bajo Z=40 no se modela' });
      cuenta(M.reuso, 'guiaw del cliente reubicada', 1);
      if (L < STEP.guiaLargo - 1) cuenta(M.nuevas, 'guiaw cortada a medida', 1);
    }

    // 3. el PUENTE (la calle dentro del módulo)
    const P0 = CALLE.puente;
    const zBase = r2(P0.topZ - P0.uhmwH - P0.aceroH);            // 15.15
    const yc = r2((P0.y[0] + P0.y[1]) / 2), Lp = r2(P0.y[1] - P0.y[0]);
    E.addPart(`FIJO · Puente de calle — pletina ${P0.ancho}×${P0.aceroH}×${Lp} A36 (${c})`,
      COL.chapa, [B, yc, zBase],
      [box(`Pletina ${P0.ancho}×${Lp}×${P0.aceroH}`, [B, yc, zBase], P0.ancho, Lp, P0.aceroH)],
      { fabricada: true, nota: `sección ≤ ${NBT.ventana} en la franja del rodillo Z [${FRANJA.z0}, ${FRANJA.z1}]; pasa por los huecos de 42 de las placas peine del NBT90` });
    E.addPart(`FIJO · Puente de calle — regleta UHMW ${P0.ancho}×${P0.uhmwH}×${Lp} (${c})`,
      COL.uretano, [B, yc, r2(zBase + P0.aceroH)],
      [box(`Regleta ${P0.ancho}×${Lp}×${P0.uhmwH}`, [B, yc, r2(zBase + P0.aceroH)], P0.ancho, Lp, P0.uhmwH)],
      { fabricada: true, nota: `cara de apoyo a Z=${P0.topZ}, la misma interfaz medida que la guía del cliente (banda apoyada con el dorso a ${STEP.planoBanda})` });
    cuenta(M.nuevas, 'pletina de puente 30×28', 1);
    cuenta(M.nuevas, 'regleta UHMW de puente 30×8.55', 1);
    // placas base y tornillos a los travesaños. Los 2 M8 de cada placa van
    // ALINEADOS SEGÚN X en la ranura superior del travesaño (S: Y=−1280,
    // N: Y=−692, las ranuras a yc±20 del perfil 80×40).
    for (const [yr, lado] of [[-1280, 'S'], [-692, 'N']]) {
      const ybc = yr;
      E.addPart(`FIJO · Placa base de puente 64×${P0.baseLargo}×${P0.baseT} (${c}, travesaño ${lado})`,
        COL.chapa, [B, ybc, r2(zBase - P0.baseT)],
        [box(`Placa 64×${P0.baseLargo}×${P0.baseT}`, [B, ybc, r2(zBase - P0.baseT)], 64, P0.baseLargo, P0.baseT),
          hole(`Ø9 M8`, [r2(B - 23), ybc, r2(zBase + 1)], [0, 0, -1], 9.0),
          hole(`Ø9 M8`, [r2(B + 23), ybc, r2(zBase + 1)], [0, 0, -1], 9.0)],
        { fabricada: true, nota: 'soldada bajo la pletina del puente; 2 M8×16 a tuercas T de la ranura superior del travesaño (las cabezas libran el canto de la pletina de 30)' });
      for (const dx of [-23, 23]) {
        pernoHex(E, { nombre: `M8×16 puente (${c}, ${lado}${dx > 0 ? '+' : '-'})`, at: [r2(B + dx), ybc, zBase], dir: [0, 0, -1], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
        // vástago corto: muere en la ranura del travesaño; la TUERCA T M8 dentro
        // de la ranura no se modela (se cuenta en la lista de materiales)
        cuenta(M.nuevas, 'tuerca T M8 (ranura 8)', 1);
      }
      cuenta(M.nuevas, 'placa base de puente', 1);
    }

    // 4. banda T5 (lazo nuevo). El corte del hueco sigue el convenio del motor
    //    (los cut de sketch se extruyen hacia ATRÁS del plano): se ancla en la
    //    cara trasera +0.5 con h = ancho+1, igual que el serpentín del NBT90.
    E.addPart(`FIJO · Banda T5×32 lazo nuevo L=${largo} (${c})`,
      COL.banda, [r2(B - STEP.bandaAncho / 2), 0, 0],
      [sketchYZ(`Lazo (dorso ${T_BANDA})`, r2(B - STEP.bandaAncho / 2), caras.outer, STEP.bandaAncho),
        sketchYZ(`Hueco del lazo`, r2(B + STEP.bandaAncho / 2 + 0.5), caras.inner, r2(STEP.bandaAncho + 1), 'cut')],
      { nota: `modelada por su dorso (0.633, step: 52.333−51.7); largo desarrollado de fibra ${largo} mm; el cliente decide reempalme de la actual (abierta + soldadura PU) o banda nueva` });
    cuenta(M.nuevas, `banda T5×32 (largo ${largo})`, 1);

    // 5. poleas motriz y conducida (63T, cotas step §4.5) — reubicadas en X
    poleaX(E, `FIJO · Polea motriz T5-63T Ø112/Ø100×40 (${c})`, B, STEP.motrizY, 0,
      100, 40, 112, 2.5, 38, COL.polea, { nota: 'pieza del cliente re-pitcheada (step §4.5); el árbol y su soporte, en contexto' });
    poleaX(E, `FIJO · Polea conducida T5-63T Ø112/Ø100×40 (${c})`, B, STEP.conducidaY, 0,
      100, 40, 112, 2.5, 38, COL.polea, {});
    cuenta(M.reuso, 'poleas 63T del cliente re-pitcheadas', 2);

    // 6. V1/V4: volantes Ø100 del cliente reubicados + eje + pletinas al perfil
    for (const [V, nom, tslot] of [[POZO.v1, 'V1 entrada pozo', CALLE.tslotSurY], [POZO.v4, 'V4 salida pozo', CALLE.tslotNorteY]]) {
      poleaX(E, `FIJO · Volante contraflexión Ø100 cara 34 / total 40 (${nom}) (${c})`, B, V.y, V.z,
        STEP.volante.cara, 40, STEP.volante.pest, 3, STEP.volante.bore, COL.polea,
        { nota: 'guia_entrada/salida_liso del cliente REUBICADO: de (Y −404.3/−195.5, Z −90) a aquí; toca el dorso como hoy. Ancho total medido 40 (caja step −19…21): cara útil 34 entre pestañas Ø110×3' });
      cuenta(M.reuso, 'volante liso Ø100 del cliente reubicado', 1);
      E.addPart(`FIJO · Eje de volante Ø38×52 (${nom}) (${c})`, COL.acero,
        [r2(B - 26), V.y, V.z],
        [cyl(`Eje Ø38×52`, [r2(B - 26), V.y, V.z], [1, 0, 0], 38, 52)],
        { fabricada: true, nota: 'dis: el STEP no declara el eje del volante (solo barreno Ø38); verificar con el despiece del cliente' });
      cuenta(M.nuevas, 'eje de volante Ø38×52', 1);
      if (V === POZO.v1) continue;   // V1 se soporta en las pletinas del CARRO (bloque 8)
      // V4: pletinas LATERALES pegadas a las caras de 80 del perfil norte, con
      // 2 M8 horizontales cada una a las tuercas T de la ranura lateral baja (Z −20)
      for (const s of [-1, 1]) {
        const xp = s > 0 ? r2(B + 20 + 0.1) : r2(B - 20 - 0.1 - CALLE.pletinaT);
        E.addPart(`FIJO · Pletina de volante 3/16"×46×${r2(-10 - (V.z - 36))} (${nom}, ${s > 0 ? '+X' : '−X'}) (${c})`,
          COL.chapaOsc, [xp, V.y, r2(V.z - 36)],
          [box(`Pletina ${CALLE.pletinaT}×46×${r2(-10 - (V.z - 36))}`,
            [r2(xp + CALLE.pletinaT / 2), V.y, r2(V.z - 36)], CALLE.pletinaT, 46, r2(-10 - (V.z - 36))),
            hole(`Ø38 eje`, [r2(xp - 1), V.y, V.z], [1, 0, 0], 38),
            hole(`Ø9 M8`, [r2(xp - 1), r2(V.y - 15), -20], [1, 0, 0], 9.0),
            hole(`Ø9 M8`, [r2(xp - 1), r2(V.y + 15), -20], [1, 0, 0], 9.0)],
          { fabricada: true, nota: 'pegada a la cara lateral del perfil; 2 M8×16 a tuercas T de la ranura lateral baja (Z=−20)' });
        cuenta(M.nuevas, 'pletina de volante', 1);
        cuenta(M.nuevas, 'tuerca T M8 (ranura 8)', 2);
      }
    }

    // 7. V3 fija (polea plana nueva) colgada del travesaño norte
    poleaX(E, `FIJO · Polea plana Ø117.9×40 (V3, fija) (${c})`, B, POZO.v3.y, POZO.v3.z,
      STEP.polTensora.dia, STEP.polTensora.ancho, STEP.polTensora.dia, 0, 20, COL.polea,
      { fabricada: true, nota: 'igual a POL-CON-TEN del cliente (Ø117.9×40 sobre 2×SKF W 6004-2Z, eje Ø20); toca la cara dentada como la tensora de hoy (step §4.4)' });
    cuenta(M.nuevas, 'polea plana Ø117.9×40 (tipo POL-CON-TEN)', 1);
    E.addPart(`FIJO · Eje tensor Ø20×46 (V3) (${c})`, COL.acero, [r2(B - 23), POZO.v3.y, POZO.v3.z],
      [cyl(`Eje Ø20×46`, [r2(B - 23), POZO.v3.y, POZO.v3.z], [1, 0, 0], 20, 46)],
      { nota: 'como SCMRT906VCT-150-111 del cliente (Ø20, roscas M10×1.5 en las puntas)' });
    cuenta(M.nuevas, 'eje Ø20×46 tipo SCMRT906VCT', 1);
    // pletinas de V3: cuelgan de la CARA INFERIOR del travesaño norte con un
    // ala plegada; los M8 verticales caen en las ranuras inferiores (Y −692/−652)
    for (const s of [-1, 1]) {
      const xp = r2(B + s * 22.9 - CALLE.pletinaT / 2);
      const zTopP = r2(PERCHA.travTopZ - 40);          // −30.85 cara inferior del travesaño
      E.addPart(`FIJO · Pletina V3 3/16"×44×${r2(zTopP - (POZO.v3.z - 20))} con ala (${s > 0 ? '+X' : '−X'}) (${c})`,
        COL.chapaOsc, [xp, POZO.v3.y, r2(POZO.v3.z - 20)],
        [box(`Alma ${CALLE.pletinaT}×44`, [r2(xp + CALLE.pletinaT / 2), POZO.v3.y, r2(POZO.v3.z - 20)], CALLE.pletinaT, 44, r2(zTopP - (POZO.v3.z - 20))),
          // ala plegada HACIA DENTRO (16): las de calles vecinas no se tocan y
          // las ranuras inferiores del travesaño corren continuas según X
          box(`Ala 16×44×${CALLE.pletinaT}`, [r2(B + s * 12.52), POZO.v3.y, r2(zTopP - CALLE.pletinaT)], 16, 44, CALLE.pletinaT),
          hole(`Ø20 eje`, [r2(xp - 1), POZO.v3.y, POZO.v3.z], [1, 0, 0], 20),
          hole(`Ø9 M8`, [r2(B + s * 12.52), r2(POZO.v3.y - 20), r2(zTopP - CALLE.pletinaT - 1)], [0, 0, 1], 9.0),
          hole(`Ø9 M8`, [r2(B + s * 12.52), r2(POZO.v3.y + 20), r2(zTopP - CALLE.pletinaT - 1)], [0, 0, 1], 9.0)],
        { fabricada: true, nota: 'chapa plegada en L; 2 M8×16 hacia arriba a tuercas T de las ranuras inferiores del travesaño norte (Y −692/−652)' });
      cuenta(M.nuevas, 'pletina V3 plegada', 1);
      cuenta(M.nuevas, 'tuerca T M8 (ranura 8)', 2);
    }

    // 8. V2 = TENSORA en CARRO HORIZONTAL (sustituye al brazo pivotante del
    //    cliente MANTENIENDO su función: tensado neumático con el mismo C85).
    //    El eje Ø20 de la tensora corre en colisas horizontales de dos pletinas
    //    grandes que también soportan V1; el cilindro, HORIZONTAL, tira del eje
    //    hacia −Y (alejar del módulo = alargar el lazo = tensar).
    poleaX(E, `FIJO · Polea tensora Ø117.9×40 en carro (V2, nominal Y=${POZO.v2.y}) (${c})`, B, POZO.v2.y, POZO.v2.z,
      STEP.polTensora.dia, STEP.polTensora.ancho, STEP.polTensora.dia, 0, 20, COL.polea,
      { nota: `POL-CON-TEN del cliente REUBICADA; carro horizontal, carrera ${STEP.cilC85.carrera} (rango eje Y ${POZO.v2.y - POZO.v2rango}…${POZO.v2.y + POZO.v2rango})` });
    cuenta(M.reuso, 'POL-CON-TEN del cliente reubicada (tensora V2)', 1);
    E.addPart(`FIJO · Eje tensor Ø20×62 del carro (V2) (${c})`, COL.acero, [r2(B - 31), POZO.v2.y, POZO.v2.z],
      [cyl(`Eje Ø20×62`, [r2(B - 31), POZO.v2.y, POZO.v2.z], [1, 0, 0], 20, 62)],
      { fabricada: true, nota: 'dis: como el SCMRT906VCT-150-111 del cliente (Ø20, roscas hembra M10×1.5 axiales en las puntas) pero de 62: las puntas asoman de las pletinas de colisa y toman los ojos de los tirantes, retenidos por los M10 axiales' });
    cuenta(M.nuevas, 'eje Ø20×62 (tipo SCMRT906VCT alargado)', 1);
    // pletinas del carro (2 por calle): plano YZ, del travesaño sur hacia abajo
    // hasta Z −325 (dejan pasar POR DEBAJO la traviesa del yugo); llevan el
    // taladro Ø38 de V1 y la colisa horizontal del carro
    const zTopP = r2(PERCHA.travTopZ - 40);            // −30.85 cara inferior del travesaño S
    const zBotP = -325;
    for (const s of [-1, 1]) {
      const xp = r2(B + s * 22.9 - CALLE.pletinaT / 2);
      E.addPart(`FIJO · Pletina carro tensor 3/16"×140×${r2(zTopP - zBotP)} (V1+V2, ${s > 0 ? '+X' : '−X'}) (${c})`,
        COL.chapaOsc, [xp, -1300, zBotP],
        [box(`Alma ${CALLE.pletinaT}×140`, [r2(xp + CALLE.pletinaT / 2), -1300, zBotP], CALLE.pletinaT, 140, r2(zTopP - zBotP)),
          box(`Ala 16×60×${CALLE.pletinaT}`, [r2(B + s * 12.52), -1260, r2(zTopP - CALLE.pletinaT)], 16, 60, CALLE.pletinaT),
          hole(`Ø38 eje V1`, [r2(xp - 1), POZO.v1.y, POZO.v1.z], [1, 0, 0], 38),
          { id: `col_${k}_${s > 0 ? 'p' : 'n'}`, name: `Colisa 20.5×${r2(2 * POZO.v2rango + 20.5)}`, shape: 'box', op: 'cut',
            at: [r2(xp + CALLE.pletinaT / 2), POZO.v2.y, r2(POZO.v2.z - 10.25)], dir: [0, 1, 0],
            params: { w: CALLE.pletinaT + 2, d: r2(2 * POZO.v2rango + 20.5), h: 20.5 } },
          hole(`Ø9 M8`, [r2(B + s * 12.52), -1280, r2(zTopP - CALLE.pletinaT - 1)], [0, 0, 1], 9.0),
          hole(`Ø9 M8`, [r2(B + s * 12.52), -1240, r2(zTopP - CALLE.pletinaT - 1)], [0, 0, 1], 9.0)],
        { fabricada: true, nota: 'chapa plegada en L colgada del travesaño sur (2 tuercas T M8 en las ranuras Y −1280/−1240); lleva el eje fijo de V1 y la colisa horizontal 20.5×60.5 del carro tensor' });
      cuenta(M.nuevas, 'pletina de carro tensor (lleva V1 y la colisa)', 1);
      cuenta(M.nuevas, 'tuerca T M8 (ranura 8)', 2);
    }
    // el TIRO del carro: la banda envuelve V2 hasta el nivel del eje (el arco
    // llega a Y = v2.y − 61.15 = −1341.15), así que el vástago NO puede llegar
    // al eje por el plano central. Se tira con YUGO: dos tirantes M10 roscados
    // a las puntas del eje (a X = B±27.65, FUERA de la banda y de las pletinas)
    // hasta una traviesa; el cilindro tira de la traviesa con la KJ10D.
    const CIL = STEP.cilC85, TEN = POZO.cilTensor;
    // tirantes del yugo: PLETINAS de canto 70 con ojo Ø20 arriba (enfilado en
    // la punta del eje POR FUERA de las pletinas de colisa, retenido por el
    // tornillo M10 axial en la rosca del eje) y Ø10.5 abajo a la traviesa
    for (const s of [-1, 1]) {
      const xt = r2(B + s * 27.76 - CALLE.pletinaT / 2);
      E.addPart(`FIJO · Tirante del yugo 3/16"×70×114 (${s > 0 ? '+X' : '−X'}) (${c})`, COL.acero,
        [xt, POZO.v2.y, -357.5],
        [box(`Pletina ${CALLE.pletinaT}×114×70`, [r2(xt + CALLE.pletinaT / 2), r2(POZO.v2.y - 47), -357.5], CALLE.pletinaT, 114, 70),
          hole(`Ojo Ø20 al eje`, [r2(xt - 1), POZO.v2.y, POZO.v2.z], [1, 0, 0], 20),
          hole(`Ø10.5 a la traviesa`, [r2(xt - 1), -1374, -347.5], [1, 0, 0], 10.5)],
        { fabricada: true, nota: 'ojo Ø20 en la punta del eje (retención: tornillo M10×20 + golilla ancha en la rosca axial del eje del cliente); desliza junto a la pletina de colisa al tensar; baja el tiro del nivel del eje (−300) al del cilindro (−347.5 el tornillo, −340 el vástago)' });
      cuenta(M.nuevas, 'tirante de yugo (pletina con ojo)', 1);
    }
    // traviesa del yugo: pasa POR DEBAJO de las pletinas de colisa (que acaban
    // en −325) y se atornilla a los dos tirantes con M10; el bulón de la KJ10D
    // entra en su taladro central
    E.addPart(`FIJO · Traviesa del yugo 50.56×8×70 (${c})`, COL.chapa,
      [B, -1374, -365],
      [box(`Traviesa 50.56×8×70`, [B, -1374, -365], 50.56, 8, 70),
        hole(`Ø10.5 tirante −X`, [r2(B - 26.5), -1374, -347.5], [1, 0, 0], 10.5, 4, false),
        hole(`Ø10.5 tirante +X`, [r2(B + 22.5), -1374, -347.5], [1, 0, 0], 10.5, 4, false),
        hole(`Ø10 bulón KJ10D`, [B, -1379, TEN.z], [0, 1, 0], 10)],
      { fabricada: true, nota: 'atornillada a los tirantes con 2 M10×25 + tuercas autoblocantes; viaja con el eje (recorrido ±20); el par del tiro descentrado lo toman los dos tirantes (declarado)' });
    cuenta(M.nuevas, 'traviesa del yugo', 1);
    // el actuador del cliente, reubicado HORIZONTAL y a Z −340: BAJO el
    // reenvío POL-COND-TEN2 (Z −313.9) y fuera del arco de banda de V2 (−1341)
    E.addPart(`CTX · Cilindro SMC CD85N25-80 horizontal del carro (${c})`, COL.neumatica,
      [B, TEN.culataY, TEN.z],
      [cyl(`Cuerpo Ø${CIL.cuerpoDia}×${CIL.cuerpoLargo}`, [B, TEN.culataY, TEN.z], [0, -1, 0], CIL.cuerpoDia, CIL.cuerpoLargo),
        cyl(`Vástago Ø10`, [B, r2(TEN.culataY + 34), TEN.z], [0, -1, 0], CIL.vastagoDia, 34)],
      { contexto: true, capaInfo: 'step/web PNEU-001/003', nota: 'cilindro del cliente REUBICADO horizontal (cuerpo fijado a las pletinas del carro por placa de culata, detalle al agente de estaciones): tira de la traviesa hacia −Y = tensa; tiro 247.4 N a 6 bar (PNEU-003)' });
    E.addPart(`CTX · Horquilla KJ10D a la traviesa (${c})`, COL.neumatica,
      [B, -1386, TEN.z],
      [box(`KJ10D 17×16×34.3`, [B, -1394, r2(TEN.z - 17.15)], 17, 16, 34.3)],
      { contexto: true, capaInfo: 'step/web PNEU-006', nota: 'horquilla del cliente reubicada (hoquilla-M10): bulón Ø10 a la traviesa del yugo' });
    E.addPart(`CTX · Regulador AS2201FS + silenciador AN101 (${c})`, COL.neumatica,
      [B, -1460, r2(TEN.z - 13.3 - 23)],
      [box(`AS2201FS 26.3×43.6×22.9`, [r2(B - 8), -1460, r2(TEN.z - 13.3 - 23)], 26.3, 43.6, 22.9),
        box(`AN101 11×22.8×15.2`, [r2(B + 14), -1460, r2(TEN.z - 13.3 - 23)], 11, 22.8, 15.2)],
      { contexto: true, capaInfo: 'step/web PNEU-004/005', nota: 'reubicados bajo el cuerpo del cilindro' });
    cuenta(M.reuso, 'cilindro C85 + KJ10D + AS2201 + AN101 reubicados', 1);

    // 9. contexto de calle reubicado (cajas step relativas al eje de banda viejo)
    const rel = (nom, x0, x1, ya, yb, z0, z1, nota) =>
      E.addPart(`CTX · ${nom} (${c})`, COL.chapaOsc,
        [r2(B + (x0 + x1) / 2), r2((ya + yb) / 2), r2(z0)],
        [box(`Caja ${r2(x1 - x0)}×${r2(yb - ya)}×${r2(z1 - z0)}`, [r2(B + (x0 + x1) / 2), r2((ya + yb) / 2), r2(z0)], x1 - x0, yb - ya, z1 - z0)],
        { contexto: true, capaInfo: 'step', nota });
    rel('Soporte motriz 2T', -45.61, -25.25, -57.28, 57.28, -57.28, 57.28, 'reubicado al eje nuevo; caja step (la pieza real lleva escote para el ramal)');
    rel('Soporte motriz 2T_MIR', 23.25, 43.61, -57.28, 57.28, -57.28, 57.28, 'ídem');
    rel('IDLER-ENS (tensor de punta conducida)', -46.79, 24.79, STEP.idlerEnsY[0], STEP.idlerEnsY[1], -46.62, 46.62, 'subconjunto completo reubicado; envuelve la conducida como hoy');
    rel('Drive kit UA (soportes P1, poleas UA sin banda)', -29, 27, -117.1, 53.43, -53.43, 53.43, 'reubicado; transmisión común AT10 del cliente INCOMPLETA (step §2.5), pendiente del cliente');
    rel('POL-COND-TEN2 (reenvío alto)', -36.79, 34.79, -1536.23, -1493.15, -159.79, -88.21, 'reubicada');
    rel('POL-COND-TEN2 (reenvío bajo)', -68.62, 2.96, -1536.23, -1493.15, -313.88, -242.3, 'reubicada');
    cuenta(M.reuso, 'conjunto motriz/idler/drive-kit por calle reubicado', 1);

    M.porCalle.push({ calle: k + 1, eje: B });
  });

  // --- métricas del lazo (iguales en las 5 calles) -------------------------
  M.banda = {
    largoDesarrollado: largo,
    envolventes_deg: { motriz: env[0], conducida: env[1], V1: env[2], V2: env[3], V3: env[4], V4: env[5] },
    dorsoPortanteZ: r2(zTop), fondoPozoZ: r2(zFondo),
    flechaFacetaMotriz: r2(flecha[0] * 100) / 100,
    dorsoTeoricoZ: r2(STEP.planoBanda),
    carasupBajoModuloZ: r2(POZO.v3.z - STEP.polTensora.dia / 2),   // −358.95
    holguraBandaCilindroTensor: isFinite(holguraBandaCil) ? r2(holguraBandaCil) : 999,
    // toma del carro: por mm hacia −Y el lazo crece ≈ 1 + cos(θ bajada) ≈ 1.3
    tomaDeTensadoMm: r2(2 * POZO.v2rango * 1.3),
  };
  M.piezas = E.parts.length - M.piezas0;
  return M;
}
