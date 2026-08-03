// mod_calles.mjs — las 5 CALLES del sorter adaptado, a paso 76.2, centradas en
// los 5 huecos de banda del NBT90 (reparto corrido al lado de descarga: ver
// params §3). Por calle:
//   · perfil TSLOT en DOS tramos (el módulo y el pozo quedan sin perfil);
//   · cama de guías UHMW re-repartida (piezas guiaw del cliente reubicadas);
//   · el PUENTE: la calle portante dentro del módulo, 30 mm de ancho en la
//     franja que barre el rodillo, apoyado en los travesaños de la percha;
//   · la BANDA PLANA con el lazo del ACCIONAMIENTO POR TAMBOR MOTRIZ (31-07):
//     tambor motriz → portante sobre las guías UHMW → conducido → retorno por
//     los 4 rodillos de retorno RR4…RR1 → HORQUILLA del tensor (volante de
//     entrada, polea tensora, volante de salida) → tambor motriz;
//   · el TENSOR ORIGINAL COMPLETO en su pose diagonal medida (corrección del
//     cliente 31-07): brazo, tensora, cilindro vertical, eje común Ø25;
//   · extremos de estación FIELES: las piezas del grupo motriz, drive kit e
//     IDLER-ENS reproducidas pieza a pieza de inventario.json (cajas exactas
//     por ocurrencia; poleas y ejes como sólidos de revolución).
// Capas: lo nuevo es FIJO; lo del cliente reubicado va como CTX (contexto).
// Procedencias en params_adapt.mjs.

import {
  box, cyl, hole, sketchYZ, bandaFaces, largoBanda, envolventes, COL, r2, pernoHex,
} from '../../nbt90/lib.mjs';
import { STEP, NBT, FRANJA, EJES, T, y0, y1, PERCHA, POZO, TENSOR, CALLE } from './params_adapt.mjs';
import { TENSOR_VIEJO, GEO as TEN_GEO, POL as TEN_POL } from './params_tensor2.mjs';   // bandera: el
//   tensor original diagonal del cliente queda DESACTIVADO (no borrado) desde que
//   el sorter pasa a banda plana angosta con el tensor de brazos (mod_tensor2);
//   de ahí salen además la POSE PUBLICADA de la polea tensora (GEO/POL).
import { TAMBORES, TAMBOR, CONDUCIDO, RETORNOS, RETORNO as RAMAL } from './params_tambores.mjs';
//   ↑ las ESTACIONES del accionamiento de banda plana: tambor motriz, rodillo
//   conducido y los 4 rodillos de retorno, con su geometría de ramal.

const T_BANDA = STEP.bandaDorso;          // 0.633 — la banda se modela POR SU DORSO
// (cota step: dorso 52.333 − cara de guía 51.7). Los dientes (espesor total T5
// ≈ 2.2) corren entre los rieles de la guía y no se modelan: así el contacto
// banda↔guía queda EXACTO a lo medido y sin interferencias fantasma.
const DIENTE_EXTRA = 2.2 - T_BANDA;       // 1.567 — resalto real del diente (T5 cat)

// Radios de contacto del lazo:
const R_63T = STEP.polea63.rContacto;     // 51.7 → dorso a ±52.333 en motriz/conducida
const R_VOL = STEP.volante.cara / 2;      // 50.0 — volante toca el DORSO
const R_TEN = STEP.polTensora.dia / 2 + DIENTE_EXTRA;  // 60.517 — polea plana sobre
// la cara DENTADA (como la tensora del cliente hoy, step §4.4).

// ---------------------------------------------------------------------------
/** Perfil ranurado 40×80 (o 40×40) como box + ranuras de boca 8.2 (step §4.2)
 *  en las caras que llevan tornillería. dirLargo: 'y'. Caras: '+z','-z','+x','-x'. */
export function perfilRanurado(E, nombre, xCentro, yRange, zRange, caras, extra = {}) {
  const L = r2(yRange[1] - yRange[0]);
  const b = 40, h = r2(zRange[1] - zRange[0]);
  const yc = r2((yRange[0] + yRange[1]) / 2);
  const f = [box(`Perfil ${b}×${h}×${L}`, [xCentro, yc, zRange[0]], b, L, h)];
  const boca = 8.2, prof = 12;
  let nr = 0;
  const ranura = (x, z0, w, hgt) => f.push(
    { id: `${nombre.replace(/\W+/g, '_')}_r${++nr}`, name: `Ranura 8`, shape: 'box', op: 'cut',
      at: [x, yc, z0], dir: [0, 0, 1], params: { w, d: L, h: hgt } });
  const zc = r2((zRange[0] + zRange[1]) / 2);
  for (const c of caras) {
    if (c === '+z') ranura(xCentro, r2(zRange[1] - prof), boca, prof);
    if (c === '-z') ranura(xCentro, zRange[0], boca, prof);
    if (c === '+x' || c === '-x') {
      const x = c === '+x' ? r2(xCentro + b / 2 - prof / 2) : r2(xCentro - b / 2 + prof / 2);
      const zs = h > 40 ? [r2(zc - 20), r2(zc + 20)] : [zc];
      for (const z of zs) ranura(x, r2(z - boca / 2), prof, boca);
    }
  }
  return E.addPart(nombre, COL.acero, [xCentro, yc, zRange[0]], f, {
    catalogo: `perfil ranurado ${b}×${h} ranura 8 serie 40 (familia del TSLOT del cliente, web TSLOT-001)`,
    ...extra,
  });
}

/** Polea de calle (cilindros coaxiales según X). pestE=0 ⇒ sin pestañas. */
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

/** Envolvente convexa (monotone chain) de discos [(y,z,r)] muestreados. */
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
  return [...lo.slice(0, -1), ...hi.slice(0, -1)].map(p => [r2(p[0]), r2(p[1])]);
}

// ---------------------------------------------------------------------------
export function calles(E) {
  const M = { piezas0: E.parts.length, porCalle: [], reuso: {}, nuevas: {} };
  const cuenta = (obj, k, n = 1) => { obj[k] = (obj[k] || 0) + n; };

  // --- el LAZO de banda (idéntico en las 5 calles; plano YZ) ---------------
  // LAZO DEL ACCIONAMIENTO POR TAMBOR MOTRIZ (rediseño del cliente 31-07). Las
  // poleas dentadas 63T y las 4 poleas de pozo V1…V4 ya no existen (bandera
  // params_pg40.FLAGS.desactivaTransmisionT5): la banda es PLANA y rueda por su
  // DORSO sobre el tambor engomado. Ninguna estación se escribe a mano — todas
  // se leen de donde las publica su dueño:
  //   · tambor motriz, conducido y RR1…RR4 → adapt/params_tambores.mjs
  //   · polea tensora                      → adapt/params_tensor2.mjs (GEO/POL)
  //
  // Recorrido (en el sentido de avance de la banda):
  //   TAMBOR (180°) → PORTANTE llano sobre las guías UHMW del PG40 (Z 51.7) →
  //   CONDUCIDO (180°) → retorno llano → RR4 baja el ramal → RR3 fondo del pozo
  //   → [POR DEBAJO del NBT90] → RR2 → RR1 lo devuelve a llano →
  //   HORQUILLA DEL TENSOR: volante de entrada → POLEA TENSORA (fondo) →
  //   volante de salida → TAMBOR.
  //
  // LA HORQUILLA, y por qué los dos volantes (dis, con el número delante):
  // la polea tensora está PUBLICADA en el fondo de la bahía medida del cliente
  // (Y −175.72, Z −371.89, step §4.5) y su cálculo de fuerza exige que la banda
  // la RODEE (N = 2·T·sen(abrazado/2) con abrazado ≈ 180°, params_tensor2). Sin
  // los dos volantes de contraflexión, el ramal bajaría a ella EN DIAGONAL desde
  // RR1 y volvería EN DIAGONAL al tambor: el abrazado en la tensora se queda en
  // 109.07° y —lo grave— el del TAMBOR MOTRIZ cae de 180° a 114.82°, por debajo
  // del mínimo de 150° de la compuerta §J y con el capstan hundido de 3.00 a 2.02.
  // Los volantes son PIEZA DEL CLIENTE, medida y ya montada en esta misma bahía
  // (`guia_entrada_liso` / `guia_salida_liso`, Ø100 cara / Ø110 pestañas × 34,
  // barreno Ø38 — SORTER_CO.md §4.5): son los que formaban la horquilla vertical
  // original. Quedaron libres al sustituir V1/V4 por los rodillos de retorno
  // nuevos, así que VUELVEN A SU SITIO. Sus Y son las MEDIDAS; su Z se recalcula
  // por tangencia al ramal nuevo (calc), que ahora corre a Z −57.833 y no a la
  // cota vieja. Con ellos el lazo reproduce EXACTAMENTE los abrazados publicados:
  // tambor 180°, conducido 180°, RR 96.5/102.39° y tensora 186.12° (el cliente
  // midió 186.25° en la suya).
  const R_VOL_H = STEP.volante.cara / 2;              // 50.0 step — rueda por el dorso
  const zVol = r2(RAMAL.zCara - R_VOL_H);             // −107.83 calc (tangencia al ramal)
  const RR = TAMBORES.retorno;                        // RR1…RR4, publicados
  const R_TENSORA = TEN_POL.dia / 2;                  // 58.95 step — cara LISA (sin dientes)
  // Los rodillos de retorno se recorren EN EL ORDEN DEL RAMAL (del conducido
  // hacia el tambor, o sea de Y más negativa a Y menos negativa) y con el
  // sentido de envolvente que publica su propia tabla. Ni el número ni el orden
  // están cableados aquí: si el accionamiento retira un rodillo de retorno —o
  // los cuatro, el día que el tambor baje de Ø y el retorno pueda pasar RECTO
  // por el corredor del peine— el lazo se retraza solo. Ver params_tambores §4
  // y la compuerta §R, que EXIGE retirarlos en cuanto el paso recto sea posible.
  const RAMAL_RETORNO = [...RR].sort((a, b) => a.y - b.y)
    .map(R => ({ c: [R.y, R.z], r: RETORNOS.r, s: R.s, id: R.id }));
  const seq = [
    { c: [TAMBORES.motriz.y, TAMBORES.motriz.z], r: TAMBOR.r, s: +1 },
    { c: [TAMBORES.conducido.y, TAMBORES.conducido.z], r: CONDUCIDO.r, s: +1 },
    ...RAMAL_RETORNO.map(({ c, r, s }) => ({ c, r, s })),
    { c: [TENSOR.volEntrada.y, zVol], r: R_VOL_H, s: -1 },    // horquilla, entrada
    { c: [TEN_GEO.poleaY, TEN_GEO.poleaZ], r: R_TENSORA, s: +1 },   // POLEA TENSORA
    { c: [TENSOR.volSalida.y, zVol], r: R_VOL_H, s: -1 },     // horquilla, salida
  ];
  const NOMBRE_EST = ['tambor', 'conducido', ...RAMAL_RETORNO.map(R => R.id),
    'volEntrada', 'tensora', 'volSalida'];
  const largo = largoBanda(seq, T_BANDA);
  const env = envolventes(seq, T_BANDA);
  // Poligonal CIRCUNSCRITA (como el serpentín del NBT90): +flecha por elemento.
  const nArco = 26;
  const flecha = seq.map((q, i) => q.r * (1 - Math.cos(env[i] * Math.PI / 180 / nArco / 2)));
  const seqFacetas = seq.map((q, i) => ({ c: q.c, r: q.r + flecha[i], s: q.s }));
  const caras = bandaFaces(seqFacetas, T_BANDA, nArco);
  const zTop = Math.max(...caras.outer.map(p => p[1]));
  const zFondo = Math.min(...caras.outer.map(p => p[1]));

  // Holgura de la banda al CILINDRO VERTICAL del tensor original (numérico,
  // muestreando la polilínea completa cada ≤5 mm).
  const cilR = STEP.cilC85.cuerpoDia / 2;
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
  let holguraBandaCil = Infinity;
  for (const p of [...muestrea(caras.outer), ...muestrea(caras.inner)]) {
    if (p[1] >= TENSOR.cilindro.z0 - 5 && p[1] <= TENSOR.cilindro.z0 + TENSOR.cilindro.largo + 5) {
      holguraBandaCil = Math.min(holguraBandaCil, Math.abs(p[0] - TENSOR.cilindro.y) - cilR);
    }
  }

  // --- piezas por calle ----------------------------------------------------
  EJES.forEach((B, k) => {
    const c = `calle ${k + 1}, X=${B}`;

    // 1. perfil en dos tramos (el sur también con ranuras laterales: las usan
    //    las pletinas de V1 y la tornillería del CT-ENS — el perfil real tiene
    //    6 ranuras, step §4.2)
    perfilRanurado(E, `FIJO · Perfil ranurado 40×80 tramo conducido L=${r2(CALLE.tslotSurY[1] - CALLE.tslotSurY[0])} (${c})`,
      B, CALLE.tslotSurY, [-40, 40], ['+z', '-z', '+x', '-x'],
      { nota: 'reutiliza el TSLOT del cliente cortado (1497.4 da los dos tramos); queda CENTRADO bajo la banda (se corrige el descentrado de 1.0 mm, step §1.1)' });
    perfilRanurado(E, `FIJO · Perfil ranurado 40×80 tramo motriz L=${r2(CALLE.tslotNorteY[1] - CALLE.tslotNorteY[0])} (${c})`,
      B, CALLE.tslotNorteY, [-40, 40], ['+z', '-z', '+x', '-x'], {});
    cuenta(M.reuso, 'TSLOT del cliente cortado en 2 tramos', 1);

    // 2. cama de guías (guiaw reubicadas; sólido de Z 40.0 a 51.7, ver nota)
    for (const [a, b] of [...CALLE.guiasSur, ...CALLE.guiasNorte]) {
      const L = r2(b - a);
      E.addPart(`FIJO · Guía de deslizamiento ${STEP.guiaSec.ancho}×${L} (guiaw reubicada) (${c}, Y ${a}…${b})`,
        COL.uretano, [B, r2((a + b) / 2), 40.0],
        [box(`Guía ${STEP.guiaSec.ancho}×${L}×${r2(STEP.guiaSec.topZ - 40)}`,
          [B, r2((a + b) / 2), 40.0], STEP.guiaSec.ancho, L, r2(STEP.guiaSec.topZ - 40))],
        { contexto: false, nota: 'pieza guiaw del cliente reubicada; cara de apoyo a Z=51.7 (step); el encaje bajo Z=40 no se modela' });
      cuenta(M.reuso, 'guiaw del cliente reubicada', 1);
      if (L < STEP.guiaLargo - 1) cuenta(M.nuevas, 'guiaw cortada a medida', 1);
    }
    // PROTECCIONES de los espacios de poleas (corrección del cliente 31-07):
    // los «cierre guia» del STEP, en su pose original (solo re-pitch en X)
    for (const [a, b, dondeP] of CALLE.cierres) {
      E.addPart(`CTX · Cierre de guía 39.9×80×15.1 (protección, ${dondeP}) (${c})`,
        COL.uretano, [B, r2((a + b) / 2), 36.6],
        [box(`Cierre 39.9×80×15.1`, [B, r2((a + b) / 2), 36.6], 39.9, r2(b - a), 15.1)],
        { contexto: true, capaInfo: 'step (inventario: cierre guia)', nota: 'protección del espacio de polea en su pose medida (Z 36.6…51.7); la guía sur se acorta a 169.2 para respetarla' });
      cuenta(M.reuso, 'cierre guia conservado (protección)', 1);
    }

    // 3. el PUENTE
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
      { fabricada: true, nota: `cara de apoyo a Z=${P0.topZ}, la misma interfaz medida que la guía del cliente` });
    cuenta(M.nuevas, 'pletina de puente 30×28', 1);
    cuenta(M.nuevas, 'regleta UHMW de puente 30×8.55', 1);
    for (const [yr, lado] of [[-1280, 'S'], [-692, 'N']]) {
      E.addPart(`FIJO · Placa base de puente 64×${P0.baseLargo}×${P0.baseT} (${c}, travesaño ${lado})`,
        COL.chapa, [B, yr, r2(zBase - P0.baseT)],
        [box(`Placa 64×${P0.baseLargo}×${P0.baseT}`, [B, yr, r2(zBase - P0.baseT)], 64, P0.baseLargo, P0.baseT),
          hole(`Ø9 M8`, [r2(B - 23), yr, r2(zBase + 1)], [0, 0, -1], 9.0),
          hole(`Ø9 M8`, [r2(B + 23), yr, r2(zBase + 1)], [0, 0, -1], 9.0)],
        { fabricada: true, nota: 'soldada bajo la pletina del puente; 2 M8×16 a tuercas T de la ranura superior del travesaño' });
      for (const dx of [-23, 23]) {
        pernoHex(E, { nombre: `M8×16 puente (${c}, ${lado}${dx > 0 ? '+' : '-'})`, at: [r2(B + dx), yr, zBase], dir: [0, 0, -1], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
        cuenta(M.nuevas, 'tuerca T M8 (ranura 8)', 1);
      }
      cuenta(M.nuevas, 'placa base de puente', 1);
    }

    // 4. BANDA PLANA (lazo del tambor motriz; el cut sigue el convenio del motor)
    E.addPart(`FIJO · Banda plana 32 × ${T_BANDA} — lazo del tambor motriz L=${largo} (${c})`,
      COL.banda, [r2(B - STEP.bandaAncho / 2), 0, 0],
      [sketchYZ(`Lazo (dorso ${T_BANDA})`, r2(B - STEP.bandaAncho / 2), caras.outer, STEP.bandaAncho),
        sketchYZ(`Hueco del lazo`, r2(B + STEP.bandaAncho / 2 + 0.5), caras.inner, r2(STEP.bandaAncho + 1), 'cut')],
      { nota: `banda PLANA (ya no es la T5 dentada: el tambor motriz arrastra por fricción). Modelada `
          + `por su DORSO ${T_BANDA} — convenio del modelo del cliente que params_tambores conserva; una `
          + `banda plana real de 2 telas mide ~2.5 y sólo cambiaría la cara de la guía UHMW. Largo de fibra `
          + `${largo}; recorre el pozo del módulo (RR4→RR3→RR2→RR1) y la horquilla del tensor. Banda NUEVA: `
          + `la T5 del cliente no sirve para este accionamiento` });
    cuenta(M.nuevas, `banda plana 32 (largo ${largo})`, 1);

    // 4-bis. los dos VOLANTES DE CONTRAFLEXIÓN que forman la horquilla del
    //        tensor: pieza medida del cliente, Y original, Z por tangencia.
    // El 34.0 medido es la CARA ÚTIL entre pestañas (SORTER_CO.md §4.5); las dos
    // pestañas de 3 van por fuera, así que el ancho total del volante es 40 —
    // igual que lo modelaba el bloque del tensor original. Con 34 de cara libre
    // la banda de 32 entra con 1 mm por lado, que es la guía lateral para la que
    // están las pestañas; si se toma el 34 como ancho TOTAL la cara libre baja a
    // 28 y la banda monta sobre las pestañas (0.38 cm³ por calle, comprobado).
    const anchoVol = r2(STEP.volante.ancho + 2 * 3);
    for (const [V, nom] of [[TENSOR.volEntrada, 'entrada'], [TENSOR.volSalida, 'salida']]) {
      poleaX(E, `FIJO · Volante de horquilla guia_${nom}_liso Ø${STEP.volante.cara}/Ø${STEP.volante.pest}×${anchoVol} (${c})`,
        B, V.y, zVol, STEP.volante.cara, anchoVol, STEP.volante.pest, 3, STEP.volante.bore,
        COL.polea,
        { capaInfo: 'step (Ø y cara útil medidos; Y medida) + calc (Z por tangencia al ramal)',
          nota: `pieza del cliente REUBICADA: es el volante liso que ya formaba la horquilla vertical `
            + `del tensor (SORTER_CO.md §4.5). Rueda sobre el DORSO de la banda. Y ${V.y} es la MEDIDA; `
            + `Z ${zVol} sale de la tangencia al ramal de retorno nuevo (cara de la banda ${RAMAL.zCara}, `
            + `params_tambores) − radio ${R_VOL_H} — la pose vieja (Z −97) era la del ramal a −52.33. `
            + `Sin estos dos volantes el abrazado del TAMBOR MOTRIZ cae a 114.82° (< 150° de la compuerta) `
            + `y el de la tensora a 109.07°, y el tensor deja de poder poner su tensión.` });
      cuenta(M.reuso, 'volante de contraflexión del cliente devuelto a la horquilla', 1);
    }
    // el eje y el soporte de estos volantes: ver AVISO DECLARADO del integrador.

    // 5. poleas motriz y conducida (63T, cotas step §4.5)
    poleaX(E, `FIJO · Polea motriz T5-63T Ø112/Ø100×40 (${c})`, B, STEP.motrizY, 0,
      100, 40, 112, 2.5, 38, COL.polea, { nota: 'pieza del cliente re-pitcheada (step §4.5)' });
    poleaX(E, `FIJO · Polea conducida T5-63T Ø112/Ø100×40 (${c})`, B, STEP.conducidaY, 0,
      100, 40, 112, 2.5, 38, COL.polea, {});
    cuenta(M.reuso, 'poleas 63T del cliente re-pitcheadas', 2);

    // 6. pozo del módulo: V1…V4 — las POLEAS con su retención axial completa
    //    (ejes Ø20×50, W 6004-2Z, anillos 3AM1-20, DIN 472-42) las pone
    //    mod_estaciones (punto 2 del detalle de estaciones); aquí quedan las
    //    PLETINAS-soporte, ya con el taladro Ø20.2 del eje definitivo.
    //    V1: pletinas laterales al perfil SUR (Y −1325 cae en su tramo);
    //    V4: pletinas laterales al perfil NORTE; V2/V3: a los travesaños.
    for (const [V, nom, tramo] of [[POZO.v1, 'V1', 'sur'], [POZO.v4, 'V4', 'norte']]) {
      for (const s of [-1, 1]) {
        const xp = s > 0 ? r2(B + 20 + 0.1) : r2(B - 20 - 0.1 - CALLE.pletinaT);
        E.addPart(`FIJO · Pletina de volante 3/16"×46×${r2(-10 - (V.z - 36))} (${nom}, ${s > 0 ? '+X' : '−X'}) (${c})`,
          COL.chapaOsc, [xp, V.y, r2(V.z - 36)],
          [box(`Pletina`, [r2(xp + CALLE.pletinaT / 2), V.y, r2(V.z - 36)], CALLE.pletinaT, 46, r2(-10 - (V.z - 36))),
            hole(`Ø20.2 eje`, [r2(xp - 1), V.y, V.z], [1, 0, 0], 20.2),
            hole(`Ø9 M8`, [r2(xp - 1), r2(V.y - 15), -20], [1, 0, 0], 9.0),
            hole(`Ø9 M8`, [r2(xp - 1), r2(V.y + 15), -20], [1, 0, 0], 9.0)],
          { fabricada: true, nota: `2 M8×16 a tuercas T de la ranura lateral baja del perfil ${tramo} (Z=−20); el eje Ø20×50 del paquete de retención (mod_estaciones) se fija con M10×1.5 a la testa` });
        cuenta(M.nuevas, 'pletina de volante', 1);
        cuenta(M.nuevas, 'tuerca T M8 (ranura 8)', 2);
        pernoHex(E, { nombre: `M8×16 pletina ${nom} (${c}, ${s > 0 ? '+X' : '−X'}, S)`, at: [r2(xp + (s > 0 ? CALLE.pletinaT : 0)), r2(V.y - 15), -20], dir: [s > 0 ? -1 : 1, 0, 0], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
        pernoHex(E, { nombre: `M8×16 pletina ${nom} (${c}, ${s > 0 ? '+X' : '−X'}, N)`, at: [r2(xp + (s > 0 ? CALLE.pletinaT : 0)), r2(V.y + 15), -20], dir: [s > 0 ? -1 : 1, 0, 0], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      }
    }
    for (const [V, nom, trav, ranuras] of [[POZO.v2, 'V2', 'sur', [-1280, -1240]], [POZO.v3, 'V3', 'norte', [-692, -652]]]) {
      const zTopP = r2(PERCHA.travTopZ - 40);
      const ycAla = r2((ranuras[0] + ranuras[1]) / 2);   // el ala centrada entre las
      //   DOS ranuras inferiores REALES del travesaño (a yc±20 del travesaño)
      for (const s of [-1, 1]) {
        const xp = r2(B + s * 22.9 - CALLE.pletinaT / 2);
        E.addPart(`FIJO · Pletina ${nom} 3/16"×44×${r2(zTopP - (V.z - 20))} (${s > 0 ? '+X' : '−X'}) (${c})`,
          COL.chapaOsc, [xp, V.y, r2(V.z - 20)],
          [box(`Alma`, [r2(xp + CALLE.pletinaT / 2), V.y, r2(V.z - 20)], CALLE.pletinaT, 44, r2(zTopP - (V.z - 20))),
            box(`Ala 16×64×${CALLE.pletinaT}`, [r2(B + s * 12.52), ycAla, r2(zTopP - CALLE.pletinaT)], 16, 64, CALLE.pletinaT),
            hole(`Ø20.2 eje`, [r2(xp - 1), V.y, V.z], [1, 0, 0], 20.2),
            hole(`Ø9 M8`, [r2(B + s * 12.52), ranuras[0], r2(zTopP - CALLE.pletinaT - 1)], [0, 0, 1], 9.0),
            hole(`Ø9 M8`, [r2(B + s * 12.52), ranuras[1], r2(zTopP - CALLE.pletinaT - 1)], [0, 0, 1], 9.0)],
          { fabricada: true, nota: `chapa plegada en L; 2 M8×12 hacia arriba a tuercas T de las ranuras inferiores REALES del travesaño ${trav} (Y ${ranuras[0]}/${ranuras[1]}); taladro Ø20.2 del eje del paquete de retención (mod_estaciones)` });
        cuenta(M.nuevas, `pletina ${nom} plegada`, 1);
        cuenta(M.nuevas, 'tuerca T M8 (ranura 8)', 2);
        for (const dyr of ranuras) {
          pernoHex(E, { nombre: `M8×12 pletina ${nom} (${c}, ${s > 0 ? '+X' : '−X'}, Y=${dyr})`, at: [r2(B + s * 12.52), dyr, r2(zTopP - CALLE.pletinaT)], dir: [0, 0, 1], dia: 8, largo: 12, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
        }
      }
    }

    // 7. TENSOR ORIGINAL en su pose diagonal (conservado; re-pitcheado en X)
    // DESACTIVADO por bandera (31-07): el cliente rediseña a banda plana
    // angosta y el tensor pasa a adapt/mod_tensor2.mjs (5 brazos sobre eje
    // pivote común asegurado, un cilindro común). Este bloque montaba el brazo
    // diagonal PZA-TEN-1, su tensora, su cilindro por calle y su neumática en
    // la MISMA bahía, así que no pueden convivir. No se borra: poner
    // TENSOR_VIEJO=true en params_tensor2.mjs lo restituye.
    if (TENSOR_VIEJO) {
    const TN = TENSOR;
    poleaX(E, `CTX · Tensora POL-CON-TEN Ø117.9×40 (pose original) (${c})`, B, TN.tensora.y, TN.tensora.z,
      STEP.polTensora.dia, STEP.polTensora.ancho, STEP.polTensora.dia, 0, 20, COL.polea,
      { contexto: true, capaInfo: 'step', nota: 'tensora del cliente en su posición medida; entra al lazo (dientes)' });
    E.addPart(`CTX · Eje tensora SCMRT906VCT-150-111 Ø20×46 (${c})`, COL.acero,
      [r2(B - 23), TN.tensora.y, TN.tensora.z],
      [cyl(`Eje Ø20×46`, [r2(B - 23), TN.tensora.y, TN.tensora.z], [1, 0, 0], 20, 46)],
      { contexto: true, capaInfo: 'step' });
    for (const [V, nom] of [[TN.volEntrada, 'entrada'], [TN.volSalida, 'salida']]) {
      poleaX(E, `CTX · Volante guia_${nom}_liso Ø100/Ø110×40 (pozo tensor) (${c})`, B, V.y, V.z,
        STEP.volante.cara, 40, STEP.volante.pest, 3, STEP.volante.bore, COL.polea,
        { contexto: true, capaInfo: 'step', nota: 'pose original bajada 7 en Z (dis): la pestaña Ø110 del STEP interpenetra el perfil (cima −35 vs fondo −40); a eje −97 libra por 2.0' });
    }
    cuenta(M.reuso, 'pozo del tensor original conservado (volantes+tensora)', 1);
    // brazo PZA-TEN-1 ×2: silueta diagonal (hull pivote–tensora–oreja, step)
    const silueta = hullDiscos([
      [TN.pivote.y, TN.pivote.z, 33],
      [TN.tensora.y, TN.tensora.z, 33],
      [TN.oreja.y, TN.oreja.z, 22],
    ]);
    for (const s of [-1, 1]) {
      const xb = r2(B + s * TN.brazoSemiX - 1.5);
      E.addPart(`CTX · Brazo tensor PZA-TEN-1 e=3 (diagonal, ${s > 0 ? '+X' : '−X'}) (${c})`,
        COL.chapaOsc, [xb, TN.pivote.y, TN.pivote.z],
        [sketchYZ(`Silueta del brazo (hull pivote–tensora–oreja)`, xb, silueta, 3),
          hole(`Ø25.3 pivote`, [r2(xb - 1), TN.pivote.y, TN.pivote.z], [1, 0, 0], 25.3),
          hole(`Ø20 tensora`, [r2(xb - 1), TN.tensora.y, TN.tensora.z], [1, 0, 0], 20)],
        { contexto: true, capaInfo: 'step', nota: 'silueta aproximada (envolvente convexa de las tres zonas medidas); la pieza real es la PZA-TEN-1 del cliente 237.7×283×3, sin cambios' });
    }
    // pivote: buje + PTFE recortado (dis: el paquete de 111 no cabe a paso 76.2)
    E.addPart(`CTX · Buje pivote BUJE-TECH-01 Ø50×56 (${c})`, COL.acero,
      [r2(B - 27), TN.pivote.y, TN.pivote.z],
      [cyl(`Buje Ø50×56`, [r2(B - 27), TN.pivote.y, TN.pivote.z], [1, 0, 0], 50, 56),
        hole(`Ø25.3`, [r2(B - 28), TN.pivote.y, TN.pivote.z], [1, 0, 0], 25.3)],
      { contexto: true, capaInfo: 'step' });
    E.addPart(`FIJO · Casquillo PTFE Ø45×${TN.ptfeLargo} (recorte del TEFLON 45-56.905) (${c})`, COL.uretano,
      [r2(B + 29), TN.pivote.y, TN.pivote.z],
      [cyl(`PTFE Ø45×${TN.ptfeLargo}`, [r2(B + 29), TN.pivote.y, TN.pivote.z], [1, 0, 0], 45, TN.ptfeLargo),
        hole(`Ø25.3`, [r2(B + 28), TN.pivote.y, TN.pivote.z], [1, 0, 0], 25.3)],
      { fabricada: true, nota: 'dis: el casquillo PTFE del cliente (55) se recorta a 15 — el paquete de pivote (buje 56 + PTFE) debe caber en el paso 76.2; presión de apoyo resultante 0.08 MPa (ver params TENSOR)' });
    cuenta(M.nuevas, 'casquillo PTFE recortado a 15', 1);
    // cilindro vertical + horquilla + neumática en pose original
    E.addPart(`CTX · Cilindro SMC CD85N25-80 vertical (pose original) (${c})`, COL.neumatica,
      [B, TN.cilindro.y, TN.cilindro.z0],
      [cyl(`Cuerpo Ø${STEP.cilC85.cuerpoDia}×${TN.cilindro.largo}`, [B, TN.cilindro.y, TN.cilindro.z0], [0, 0, 1], STEP.cilC85.cuerpoDia, TN.cilindro.largo),
        cyl(`Vástago Ø10`, [r2(B), r2(TN.cilindro.y - 17), r2(TN.cilindro.z0 - 21.4)], [0, 0, 1], 10, 21.4)],
      { contexto: true, capaInfo: 'step/web PNEU-001', nota: 'cilindro del cliente, pose medida (Y 34.5, Z −264.5…−76.8); su anclaje superior, al detalle de estaciones' });
    E.addPart(`CTX · Horquilla KJ10D + bulón EJE-PST-01 (${c})`, COL.neumatica,
      [B, TN.oreja.y, TN.oreja.z],
      [box(`KJ10D 17×34×58`, [B, TN.oreja.y, r2(TN.oreja.z - 29)], 17, 34.3, 58),
        cyl(`Bulón Ø10×85`, [r2(B - 42.5), r2(TN.oreja.y - 3.2), r2(TN.oreja.z - 15)], [1, 0, 0], 10, 85)],
      { contexto: true, capaInfo: 'step/web PNEU-006' });
    E.addPart(`CTX · Regulador AS2201FS + silenciador AN101 (${c})`, COL.neumatica,
      [B, -10.6, -235.4],
      [box(`AS2201FS 26.3×43.6×22.9`, [r2(B + 7), -10.6, -235.4], 26.3, 43.6, 22.9),
        box(`AN101 11×22.8×15.2`, [r2(B - 14), -10.6, -232], 11, 22.8, 15.2)],
      { contexto: true, capaInfo: 'step/web PNEU-004/005', nota: 'pose original' });
    cuenta(M.reuso, 'tensor original completo conservado (brazo, cilindro, horquilla, neumática)', 1);
    }   // fin del bloque 7 desactivado por TENSOR_VIEJO

    // 8. EXTREMOS DE ESTACIÓN FIELES (inventario.json, cajas por ocurrencia
    //    RELATIVAS al eje de banda viejo 1.0; solo piezas > 4 cm³ y poleas)
    const rel = (nom, x0, x1, ya, yb, z0, z1, nota) =>
      E.addPart(`CTX · ${nom} (${c})`, COL.chapaOsc,
        [r2(B + (x0 + x1) / 2 - 1), r2((ya + yb) / 2), r2(z0)],
        [box(`Caja ${r2(x1 - x0)}×${r2(yb - ya)}×${r2(z1 - z0)}`, [r2(B + (x0 + x1) / 2 - 1), r2((ya + yb) / 2), r2(z0)], x1 - x0, yb - ya, z1 - z0)],
        { contexto: true, capaInfo: 'step (inventario.json)', ...(nota ? { nota } : {}) });
    // grupo motriz: los soportes 2T y el árbol SH-04 NO se re-pitchean — a paso
    // 76.2 no caben (soportes env. 89.22 y árbol 93.22 > 76.2, step): los
    // sustituye el EJE MOTRIZ COMÚN de mod_estaciones (punto 4 del detalle).
    // drive kit UA (soportes P1 y perfiles UA-T; poleas UA sin geometría en el
    // STEP del cliente — §2.5 del reconocimiento)
    rel('Drive kit — soporte P1-1 (−X)', -28, -22, -117.03, 53.42, -53.31, 53.31);
    rel('Drive kit — soporte P1-1 (+X)', 22, 28, -117.03, 53.42, -53.31, 53.31);
    rel('Drive kit — soporte P1-2 (−X)', -28, -10, -117.1, -40.89, -40, 40);
    rel('Drive kit — soporte P1-2 (+X)', 10, 28, -117.1, -40.89, -40, 40);
    rel('Drive kit — perfil UA-T02 (−X)', -26, -20, -149.91, -123.91, -40, 40);
    rel('Drive kit — perfil UA-T02 (+X)', 20, 26, -149.91, -123.91, -40, 40,
      'la transmisión común AT10 del cliente estaba INCOMPLETA (sin banda, poleas UA vacías, AT10 superpuesta a la 63T — step §2.5/§5.2): RESUELTA en mod_estaciones con el eje motriz común; el kit se conserva como soporte y su banda queda dimensionada (params_estaciones EJEC.bandaAT10) por si el cliente lo restaura');
    // IDLER-ENS (tensor de punta conducida): horquilla y polea loca
    rel('IDLER-ENS — placa UR-P01 (−X)', -37.3, -2.67, -1650.78, -1564.22, -42.42, 44.38);
    rel('IDLER-ENS — placa UR-P01 (+X)', -1.35, 33.27, -1650.78, -1564.22, -44.38, 42.42);
    rel('IDLER-ENS — riel UR-P02 (−X)', -31.51, -22.49, -1650.92, -1441.77, -42.51, 44.23);
    rel('IDLER-ENS — riel UR-P02 (+X)', 18.46, 27.48, -1650.92, -1441.77, -44.23, 42.51);
    rel('IDLER-ENS — placa UR-P03 (−X)', -30.9, -10.65, -1582.44, -1441.7, -39.27, 40.67);
    rel('IDLER-ENS — placa UR-P03 (+X)', 6.62, 26.88, -1582.44, -1441.7, -40.67, 39.27);
    rel('IDLER-ENS — perfil UA-T02 (−X)', -29.39, -20.61, -1434.89, -1408.89, -39.28, 40.88);
    rel('IDLER-ENS — perfil UA-T02 (+X)', 16.58, 25.37, -1434.89, -1408.89, -40.88, 39.28,
      'la polea loca IDLER-P01 está MEDIDA y modelada en su posición interior (mod_estaciones §3, analisis/estaciones.json): disco Ø92.4×40 bombeado 0.62°, eje a −3.013 del eje de banda, Y −1607.5 — COAXIAL con la conducida_63T (defecto del STEP declarado)');
    // reenvíos del extremo del motor común
    rel('POL-COND-TEN2 (reenvío alto)', -36.79, 34.79, -1536.23, -1493.15, -159.79, -88.21);
    rel('POL-COND-TEN2 (reenvío bajo)', -68.62, 2.96, -1536.23, -1493.15, -313.88, -242.3);
    cuenta(M.reuso, 'extremos de estación reproducidos del inventario', 1);

    M.porCalle.push({ calle: k + 1, eje: B });
  });

  // --- piezas comunes del tensor (una, no por calle) -----------------------
  // El eje pivote común Ø25 ÚNICO (defecto §5.3 del STEP) lo pone ahora
  // mod_estaciones (FIJO fabricado, 622 de largo: alcanza su chumacera −X
  // nueva). Aquí queda solo la chumacera +X MEDIDA del cliente:
  E.addPart('CTX · Chumacera SKF UCFL 205 del eje pivote (medida, extremo +X)', COL.rodamiento,
    [504.1, -166.7, -198.7],
    [box('Caja UCFL 205', [r2((504.1 + 539.8) / 2), r2((-166.7 - 36.7) / 2), -198.7], 35.7, 130, 68.2)],
    { contexto: true, capaInfo: 'step/web BRG-003', nota: 'pose original medida (X 504.1…539.8), dentro del hueco del chapón de descarga; el STEP solo trae ÉSTA — la chumacera −X que faltaba la añade mod_estaciones (§5.3 cerrado)' });

  // --- métricas del lazo ---------------------------------------------------
  M.banda = {
    largoDesarrollado: largo,
    envolventes_deg: Object.fromEntries(NOMBRE_EST.map((n, i) => [n, env[i]])),
    dorsoPortanteZ: r2(zTop), fondoPozoZ: r2(zFondo),
    flechaFacetaMotriz: r2(flecha[0] * 100) / 100,
    dorsoTeoricoZ: r2(STEP.planoBanda),
    ramalRetornoZ: r2(RAMAL.z),                                    // −57.2 (dorso)
    carasupBajoModuloZ: r2(RR[1].z - RETORNOS.r),                  // −358.27 → CARA ALTA del
    //   ramal de fondo: RR2/RR3 muerden ese ramal por ARRIBA, así que su dorso
    //   está a centro − radio. Es la cota que se juega la holgura al NBT90.
    holguraBandaCilindroTensor: isFinite(holguraBandaCil) ? r2(holguraBandaCil) : 999,
    fondoHorquillaTensorZ: r2(TEN_GEO.poleaZ - R_TENSORA - T_BANDA),
    volanteHorquillaZ: zVol,
    // el abrazado que la geometría da a la TENSORA, frente al que declara
    // params_tensor2 (RAMAL.abrazadoDeg = 180 dis, medida original 186.25°):
    abrazadoTensoraGeometrico: env[7],
  };
  M.piezas = E.parts.length - M.piezas0;
  return M;
}
