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
//     El RAMAL PORTANTE ATRAVIESA LA TRANSFERENCIA EN RECTO, a la cota del plano
//     de transporte, por el corredor de 42 mm que dejan los dientes de las placas
//     PEINE — que para eso se llaman peine (corrección del cliente, 03-08-2026).
//     Ni baja al pozo ni la esquiva: sólo el ramal de RETORNO pasa por debajo del
//     módulo, y por qué no puede pasar recto él también está medido y escrito en
//     params_tambores §4. La compuerta §R de gen_sorter_co.mjs lo comprueba calle
//     a calle sobre el contorno emitido y sobre el boceto real del peine;
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
import { TAMBORES, TAMBOR, CONDUCIDO, RETORNOS, ELEVADORES, CORREDOR, RETIRA_POZO,
  RETORNO as RAMAL } from './params_tambores.mjs';
//   ↑ las ESTACIONES del accionamiento de banda plana: tambor motriz, rodillo
//   conducido y los rodillos del ramal de retorno, con su geometría de ramal.
//   Desde el 05-08-2026 esos rodillos son los DOS ELEVADORES del corredor y no
//   los cuatro del pozo (bandera RETIRA_POZO); este módulo lee la tabla y traza.
import { P as NBT90 } from '../../nbt90/params.mjs';
// A10-bis · la cota de coronación del travesaño de puente y la geometría del
// CABALLETE viven en el módulo del bastidor, que es su dueño. Aquí sólo se leen.
import { PUENTE_APOYO as PG40_APOYO } from './params_pg40.mjs';
//   ↑ especificación CONGELADA de la transferencia. De aquí sale el ESPESOR REAL
//   de la banda plana (ver T_BANDA): no se copia el número, se cita el dato.

// ---------------------------------------------------------------------------
// EL ESPESOR DE LA BANDA — de este número cuelga TODO el lazo
// ---------------------------------------------------------------------------
// La máquina de hoy lleva BANDA PLANA (rediseño del cliente 31-07: tambor motriz
// engomado que arrastra por fricción). Su espesor es un dato MEDIDO del propio
// repositorio: `nbt90 P.bandaEsp = 2.5` («med 2.53», ensambles/nbt90/params.mjs
// §«bandas angostas del anfitrión»). Y no es la banda de otra máquina: el
// ANFITRIÓN del NBT90 es este mismo sorter, así que esa es la banda angosta de
// 1" que ya corre por estas cinco calles.
//
// El documento emitido de la transferencia lo declara además en GEOMETRÍA, y
// mod_ctx lo lee y lo publica (`anfitrion.espesorPortanteMm`): el ramal portante
// del anfitrión ocupa Z 49.83…52.33 en los MISMOS cinco ejes de calle (127.06 ·
// 203.26 · 279.46 · 355.66 · 431.86) — 2.5 de canto, con el DORSO exactamente en
// el plano de transporte congelado (52.333) y la cara de rodadura 2.5 por debajo.
//
// Lo que había aquí era `STEP.bandaDorso = 0.633`. Ese número es correcto pero es
// de OTRA banda: es la cota del STEP del cliente para su banda **T5 DENTADA**
// (step §4.3 — plano de transporte 52.333 menos cara de guía 51.7; los 1.567 que
// faltan hasta los 2.2 del catálogo T5 eran el DIENTE, que corría dentro de la
// ranura de la guía y no se modelaba). Sobrevivió al cambio de arquitectura.
// Hallazgo SC-10 de REVISION_ESTRUCTURAL_SC.md.
const T_BANDA = NBT90.bandaEsp;           // 2.5 med — banda PLANA real (nbt90 P.bandaEsp)
const T_BANDA_T5 = STEP.bandaDorso;       // 0.633 step — dorso de la T5 del cliente; se
//   conserva SÓLO para publicar la deriva que introduce el cambio (no traza nada).

// --- MUNDO T5 · RETIRADO POR BANDERA (no borrado) --------------------------
// `BANDA_T5 = false` desde que el sorter pasa a banda plana con tambor motriz
// (misma bandera de fondo que `params_pg40.FLAGS.desactivaTransmisionT5` y que
// `TENSOR_VIEJO`: se desactiva, no se borra). Las tres constantes de abajo sólo
// tienen sentido con banda DENTADA y eran resto del mismo cambio de arquitectura
// que dejó el dorso de 0.633:
//   · `dienteExtra` = 2.2 − 0.633 = 1.567, el resalto del diente T5 sobre el
//     dorso. Una banda PLANA no tiene diente: su canto entero (2.5) es dorso, así
//     que el resalto no existe y el número no significa nada.
//   · `r63T` = radio de contacto de las poleas dentadas 63T (51.7). Esas poleas
//     ya NO son estación del lazo — las sustituyó el tambor motriz Ø108.9; se
//     siguen emitiendo como pieza del cliente re-pitcheada (punto 5), pero la
//     banda no las toca. El radio de contacto de cada estación lo publica hoy su
//     dueño (params_tambores / params_tensor2) y el lazo lo lee de ahí.
//   · `rTensoraDentada` = radio de la tensora MÁS el diente, o sea la tensora
//     rodando sobre la cara DENTADA (así estaba montada la del cliente, step
//     §4.4). Con banda plana rueda sobre la cara lisa y el radio de contacto es
//     el suyo pelado: `TEN_POL.dia / 2` = 58.95 (R_TENSORA, más abajo).
// Comprobado antes de retirarlas: NINGUNA se usaba ya en el trazado — el lazo
// sólo usa T_BANDA, R_VOL_H y R_TENSORA (`grep -n "R_63T\|DIENTE_EXTRA\|R_TEN\b"`
// no daba ningún uso fuera de estas líneas). Quedan escritas para que quien
// restituya la T5 sepa de dónde salían y con qué convenio.
export const BANDA_T5 = false;
export const T5_RETIRADO = BANDA_T5 ? {
  dienteExtra: r2(2.2 - T_BANDA_T5),                      // 1.567 (T5 cat)
  r63T: STEP.polea63.rContacto,                           // 51.7
  rTensoraDentada: r2(STEP.polTensora.dia / 2 + 2.2 - T_BANDA_T5),   // 60.517
} : null;   // ← null mientras la bandera esté abajo: se ve desde fuera que el
//   mundo T5 está retirado, y con qué convenio volvería si alguien la sube.

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
  // Recorrido (en el sentido de avance de la banda) — RETORNO RECTO, corrección
  // del cliente del 03-08-2026 («la banda debe seguir linea roja asi fue
  // concebido»):
  //   TAMBOR (180°) → PORTANTE llano sobre las guías UHMW del PG40 →
  //   CONDUCIDO (187.5°) → RAMPA de subida → RE-S eleva el ramal al corredor →
  //   [RECTO POR EL CORREDOR DEL PEINE, la misma ranura de 42 por la que pasa el
  //    portante, a Z −9.87 de cara portante] → RE-N → RAMPA de bajada →
  //   HORQUILLA DEL TENSOR: volante de entrada → POLEA TENSORA (fondo) →
  //   volante de salida → TAMBOR.
  // El POZO (RR1…RR4 y las 4 guardas) lo retira params_tambores.RETIRA_POZO; con
  // esa bandera a false vuelve el recorrido anterior por debajo del módulo y este
  // mismo código lo traza sin tocar una línea, porque el lazo se LEE de la tabla.
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
  //   Es el único radio de contacto del bloque T5 de arriba que SIGUE VIVO: con banda
  //   plana el volante sigue rodando sobre el dorso, sobre su cara Ø100 medida, y no
  //   le afecta el diente. El módulo lo tenía además duplicado a nivel de fichero
  //   (`R_VOL`, mismo valor, sin usar): esa copia se retira y queda ésta, la que
  //   entra en el lazo. Los otros dos radios de aquel bloque (63T y tensora dentada)
  //   sí eran del mundo T5 y están retirados por bandera (T5_RETIRADO).
  // CARA EXTERIOR DEL RAMAL DE RETORNO y, por tangencia a ella, la cota de los dos
  // volantes de contraflexión. `RAMAL.z` (−57.2) es la generatriz inferior del
  // tambor, o sea la cara de la banda que APOYA en él; la cara de FUERA del ramal
  // queda UN ESPESOR por debajo. params_tambores publica esa cota
  // (`RETORNO.zCara` = −57.833) calculada con el dorso T5 de 0.633, y con ella
  // coloca RR1 y RR4; aquí se rehace con el espesor REAL, y la diferencia —los
  // mismos 1.867 mm de todo este hallazgo— es exactamente lo que ese módulo tiene
  // que bajar `RETORNO.zCara`, RR1 y RR4. Mientras no lo haga, el ramal llano
  // tambor→RR1 deja de ser llano (ver `desalineoRodillosHombroMm` en las métricas).
  const zCaraRamal = r2(RAMAL.z - T_BANDA);           // −59.7 calc (params_tambores: −57.833)
  const zVol = r2(zCaraRamal - R_VOL_H);              // −109.7 calc (tangencia al ramal)
  const RR = TAMBORES.retorno;                        // RR1…RR4, publicados
  const R_TENSORA = TEN_POL.dia / 2;                  // 58.95 step — cara LISA (sin dientes)
  // Los rodillos del ramal de retorno se recorren EN EL ORDEN DEL RAMAL (del
  // conducido hacia el tambor, o sea de Y más negativa a Y menos negativa) y con
  // el sentido de envolvente que publica su propia tabla. Ni el número ni el
  // orden están cableados aquí: el 05-08-2026 esa tabla pasó de CUATRO rodillos
  // de pozo a DOS elevadores y este bloque no cambió ni una línea — el lazo se
  // retrazó solo. Ver params_tambores §4 y la compuerta §R, que EXIGE el paso
  // recto de los DOS ramales y que no quede ni un rodillo de pozo.
  const RAMAL_RETORNO = [...RR].sort((a, b) => a.y - b.y)
    // ⚠ EL RADIO SE LEE DE LA TABLA, NO DE `RETORNOS`. Aquí ponía `RETORNOS.r`
    // (44.45, el rodillo de pozo Ø88.9) cableado. Al pasar el ramal de retorno a
    // los elevadores Ø48.26 la tabla cambió de Ø y esta línea no: el lazo se
    // trazaba con rodillos de 44.45 de radio en la Z de unos de 24.13 y el ramal
    // «recto» salía a Z +10.45 en vez de −9.87 — 20.32 mm dentro del puente. Lo
    // cazó la §R nueva sobre el contorno emitido, que es exactamente para lo que
    // está. El Ø lo publica `TAMBORES.retornoD`, igual que el eje y el soporte.
    .map(R => ({ c: [R.y, R.z], r: r2(TAMBORES.retornoD / 2), s: R.s, id: R.id }));
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

    // 3. el PUENTE — PERFIL DE ALUMINIO bajo la regleta, no pletina de acero.
    //    Corrección del cliente 06-08 («the aluminum profile … should be always
    //    in a stretch part that support the belts … you are not putting the
    //    aluminum profile at the bottom of the guide. That's a mistake»): la
    //    guía UHMW lleva SIEMPRE perfil de aluminio al fondo, también dentro de
    //    la transferencia. Aquí iba una pletina A36 30×28 porque el 40×40 no
    //    cabe en la ventana de 31.75; la respuesta era cambiar de TAMAÑO, no de
    //    material: item Profile 6 30×30 (web PERFIL-3030-01), mismo ancho 30
    //    que la pletina a la que sustituye — las holguras al rodillo y al peine
    //    no se mueven. La §R6 verifica continuidad, contacto y flecha con el Ix
    //    CITADO del catálogo, no con este comentario.
    const P0 = CALLE.puente;
    const zBase = r2(P0.topZ - P0.uhmwH - P0.perfilH);           // 11.283
    const yc = r2((P0.y[0] + P0.y[1]) / 2), Lp = r2(P0.y[1] - P0.y[0]);
    E.addPart(`FIJO · Puente de calle — perfil de aluminio 30×30 Línea 6 L=${Lp} (${c})`,
      COL.chapaOsc, [B, yc, zBase],       // el color de los perfiles PG40 (no hay COL.aluminio)
      [box(`Perfil 30×30×${Lp}`, [B, yc, zBase], P0.ancho, Lp, P0.perfilH)],
      { fabricada: true,
        material: `Perfil extruido de aluminio anodizado 30×30 Línea 6 — ${P0.perfil.ref} `
          + `(web ${P0.perfil.factId}), corte a medida L=${Lp}`,
        norma: P0.perfil.ref,
        nota: `${P0.perfil.ref} · Ix ${P0.perfil.IxCm4} cm⁴ · ${P0.perfil.kgm} kg/m (web `
          + `${P0.perfil.factId}). Sección ≤ ${NBT.ventana} en la franja del rodillo Z [${FRANJA.z0}, `
          + `${FRANJA.z1}]; pasa por los huecos de 42 de las placas peine del NBT90 con las MISMAS `
          + 'holguras que la pletina a la que sustituye (5.64/lado al rodillo, 6/lado al diente). '
          + 'Apoya en los dos caballetes por su cara inferior; la ranura 6 inferior recibe las '
          + 'tuercas correderas del ala del caballete y la superior el pie de clip de la regleta.' });
    E.addPart(`FIJO · Puente de calle — regleta UHMW ${P0.ancho}×${P0.uhmwH}×${Lp} (${c})`,
      COL.uretano, [B, yc, r2(zBase + P0.perfilH)],
      [box(`Regleta ${P0.ancho}×${Lp}×${P0.uhmwH}`, [B, yc, r2(zBase + P0.perfilH)], P0.ancho, Lp, P0.uhmwH)],
      { fabricada: true,
        apoyaEn: `FIJO · Puente de calle — perfil de aluminio 30×30 Línea 6 L=${Lp} (${c})`,
        nota: `cara de apoyo a Z=${P0.topZ}, la misma interfaz medida que la guía del cliente. `
          + 'Monta sobre el perfil por PIE DE CLIP a su ranura 6 superior — el mismo montaje sin '
          + 'herramienta que la regleta de los largueros en la ranura 10 (el pie no se modela, '
          + 'igual que allí).' });
    cuenta(M.nuevas, 'perfil de puente item 30×30 Línea 6 (web PERFIL-3030-01)', 1);
    cuenta(M.nuevas, 'regleta UHMW de puente 30×8.55 c/pie de clip ranura 6', 1);
    // A10-bis · LA PLACA BASE DEL PUENTE ES AHORA UN CABALLETE.
    // Con el retorno recto el ramal de las 5 bandas cruza la transferencia POR
    // ENCIMA de los dos travesaños de puente, así que esos travesaños bajan
    // (params_pg40 PUENTE_APOYO.topZ) y entre su coronación y la cara inferior
    // del puente queda un hueco por el que pasa la banda. La placa plana de 6 se
    // convierte en un caballete de dos patas que SALVA el ramal: las patas van a
    // X = eje ± 23, o sea a 3 mm de la banda de 32, y el ala superior se queda
    // exactamente en la cota de siempre para que el puente no se entere.
    const CAB = r2(PG40_APOYO.caballeteH);            // 21.28 — 0 si no hay que salvar nada
    const casq = PG40_APOYO.caballeteCasquillo, casqX = PG40_APOYO.caballeteCasquilloX;
    const anchoCab = CAB > 0.01 ? PG40_APOYO.caballeteAncho : 64;
    const tornCab = PG40_APOYO.caballeteTornillo;
    for (const [yr, lado] of [[-1280, 'S'], [-692, 'N']]) {
      const zAla = r2(zBase - P0.baseT);              // cara inferior del ala (no se mueve)
      const feats = [box(`Ala superior ${anchoCab}×${P0.baseLargo}×${P0.baseT}`, [B, yr, zAla],
        anchoCab, P0.baseLargo, P0.baseT)];
      const bx = CAB > 0.01 ? casqX : 23;
      if (CAB > 0.01) {
        for (const sx of [-1, 1]) {
          feats.push(box(`Casquillo ${casq}×${casq}×${CAB}`, [r2(B + sx * casqX), yr, r2(zAla - CAB)],
            casq, casq, CAB));
        }
      }
      for (const sx of [-1, 1]) {
        feats.push(hole(`Ø${tornCab.pasante} ${tornCab.rosca}`,
          [r2(B + sx * bx), yr, r2(zBase + 1)], [0, 0, -1], tornCab.pasante));
      }
      E.addPart(`FIJO · Placa base de puente ${anchoCab}×${P0.baseLargo}×${P0.baseT}${CAB > 0.01 ? ` c/caballete ${CAB}` : ''} (${c}, travesaño ${lado})`,
        COL.chapa, [B, yr, zAla], feats,
        { fabricada: true, apoyaEn: 'PG40 · Travesaño de puente',
          nota: CAB > 0.01
            ? `CABALLETE: ala superior soldada bajo la pletina del puente (cara inferior Z ${zAla}, la `
              + `de siempre) sobre 2 casquillos ${casq}×${casq} a X = eje ± ${casqX} que bajan ${CAB} mm `
              + `hasta la coronación del travesaño (Z ${PG40_APOYO.topZ}). Entre los casquillos pasa el `
              + `RAMAL DE RETORNO RECTO: la banda mide ${STEP.bandaAncho} (eje ± ${STEP.bandaAncho / 2}) y `
              + `la cara interior de cada casquillo queda a ${r2(casqX - casq / 2 - STEP.bandaAncho / 2)} mm `
              + `de ella. 2 ${tornCab.rosca}×${tornCab.largo} desde arriba a tuercas martillo de la ranura `
              + `superior del travesaño; el caballete mide ${anchoCab} de ancho contra los 76.2 de paso `
              + `de calle (${r2(76.2 - anchoCab)} mm entre caballetes contiguos)`
            : 'soldada bajo la pletina del puente; 2 M8×16 a tuercas T de la ranura superior del travesaño' });
      for (const sx of [-1, 1]) {
        pernoHex(E, { nombre: `M8×${CAB > 0.01 ? tornCab.largo : 16} puente (${c}, ${lado}${sx > 0 ? '+' : '-'})`,
          at: [r2(B + sx * bx), yr, zBase], dir: [0, 0, -1], dia: 8,
          largo: CAB > 0.01 ? tornCab.largo : 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
        cuenta(M.nuevas, 'tuerca T M8 (ranura 8)', 1);
      }
      cuenta(M.nuevas, CAB > 0.01 ? 'caballete de apoyo de puente' : 'placa base de puente', 1);
    }

    // 4. BANDA PLANA (lazo del tambor motriz; el cut sigue el convenio del motor)
    E.addPart(`FIJO · Banda plana 32 × ${T_BANDA} — lazo del tambor motriz L=${largo} (${c})`,
      COL.banda, [r2(B - STEP.bandaAncho / 2), 0, 0],
      [sketchYZ(`Lazo (dorso ${T_BANDA})`, r2(B - STEP.bandaAncho / 2), caras.outer, STEP.bandaAncho),
        sketchYZ(`Hueco del lazo`, r2(B + STEP.bandaAncho / 2 + 0.5), caras.inner, r2(STEP.bandaAncho + 1), 'cut')],
      { nota: `banda PLANA (ya no es la T5 dentada: el tambor motriz arrastra por fricción), de canto `
          + `ENTERO ${T_BANDA} mm — dato MEDIDO del repositorio (nbt90 P.bandaEsp, «med 2.53»): es la misma `
          + `banda angosta de 1" que ya corre por estas 5 calles, la que el NBT90 declara como banda de su `
          + `anfitrión ocupando Z 49.83…52.33. Hasta el 03-08-2026 el lazo se trazaba con 0.633, que es el `
          + `DORSO de la T5 DENTADA del cliente (step §4.3: 52.333 − 51.7; el 1.567 que falta hasta los 2.2 `
          + `del catálogo T5 era el diente, que corría en la ranura de la guía) — hallazgo SC-10. Con el `
          + `espesor real el dorso queda ${r2(zTop)} y NO en el plano congelado ${STEP.planoBanda}: la cara de `
          + `rodadura (tambor, conducido, RR1…RR4 y las 20 regletas UHMW, todas colgadas de `
          + `params_tambores.planoDorso = 51.7) tiene que BAJAR ${r2(T_BANDA - T_BANDA_T5)} mm hasta `
          + `${r2(STEP.planoBanda - T_BANDA)}, que es justo la cota a la que el NBT90 declara la regleta de su `
          + `anfitrión (49.84). Largo de fibra ${largo}; recorre ${NOMBRE_EST.join('→')}. `
          + `El RAMAL DE RETORNO atraviesa la transferencia RECTO por el corredor del peine, `
          + `no por debajo (corrección del cliente 03-08-2026). Banda NUEVA: la T5 del cliente no sirve` });
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
            + `Z ${zVol} sale de la tangencia al ramal de retorno nuevo (cara de la banda ${zCaraRamal} = `
            + `generatriz baja del tambor ${RAMAL.z} − espesor real ${T_BANDA}) − radio ${R_VOL_H}. `
            + `params_tambores publica esa cara en ${RAMAL.zCara} porque la calcula con el dorso T5 de `
            + `${T_BANDA_T5}: los ${r2(T_BANDA - T_BANDA_T5)} mm de diferencia son los que ese módulo tiene `
            + `que bajar RR1 y RR4. La pose vieja (Z −97) era la del ramal a −52.33. `
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
  // El plano de RODADURA (la cara sobre la que apoya la banda) no se escribe: se
  // MIDE sobre la estación que lo define, el tambor motriz. Así, el día que
  // params_tambores lo baje, el plano de transporte de aquí lo sigue solo.
  const planoRodadura = r2(TAMBORES.motriz.z + TAMBOR.r);          // 51.7 hoy
  const planoTransporte = r2(planoRodadura + T_BANDA);             // 54.2 con la banda real
  // COTA DE TANGENCIA de cada rodillo del ramal de retorno: la generatriz por la
  // que toca la banda. Con s < 0 el rodillo va POR DEBAJO y toca la CARA
  // PORTANTE, así que la tangencia es `z + r`; con s > 0 va por arriba y toca el
  // dorso, y la tangencia es `z − r`. Se publica la cota y contra qué se mide:
  //   · con retorno RECTO (elevadores) la referencia es el suelo del corredor;
  //   · con pozo (RR1/RR4) era la cara del ramal llano que sale del tambor.
  const rTorn = RETIRA_POZO.activo ? ELEVADORES.r : RETORNOS.r;
  const rrTangencia = RR.map(R => [R.id, r2(R.s < 0 ? R.z + rTorn : R.z - rTorn)]);
  const rrHombro = RR.filter(R => R.s < 0).map(R => {
    const caraRef = RETIRA_POZO.activo ? CORREDOR.zCara
      : r2((Math.abs(R.y - TAMBORES.motriz.y) < Math.abs(R.y - TAMBORES.conducido.y)
        ? RAMAL.z : RAMAL.zConducido) - T_BANDA);
    return [R.id, r2(R.z + rTorn - caraRef)];
  });
  M.banda = {
    largoDesarrollado: largo,
    envolventes_deg: Object.fromEntries(NOMBRE_EST.map((n, i) => [n, env[i]])),
    dorsoPortanteZ: r2(zTop), fondoPozoZ: r2(zFondo),
    flechaFacetaMotriz: r2(flecha[0] * 100) / 100,
    dorsoTeoricoZ: r2(STEP.planoBanda),
    // ---- ESPESOR DE LA BANDA y lo que arrastra (hallazgo SC-10) ------------
    espesorMm: T_BANDA,
    espesorProcedencia: 'med — nbt90 P.bandaEsp = 2.5 («med 2.53»), la banda plana '
      + 'angosta de 1" del anfitrión; el documento emitido del NBT90 la declara además '
      + 'en geometría (portante del anfitrión Z 49.83…52.33, los mismos 5 ejes de calle)',
    espesorDorsoT5Anterior: T_BANDA_T5,     // 0.633 step — dorso de la T5 DENTADA
    espesorDerivaMm: r2(T_BANDA - T_BANDA_T5),                     // 1.867
    largoConDorsoT5_soloComparacion: largoBanda(seq, T_BANDA_T5),  // 4877.64
    // la holgura que la banda COME sobre cualquier cota medida al tubo de una
    // estación (largueros, guardas, ménsulas): es el espesor entero.
    holguraQueComeLaBandaMm: T_BANDA,
    // ---- planos ------------------------------------------------------------
    planoRodaduraZ: planoRodadura,          // medido sobre el tambor (motriz.z + r)
    planoTransporteZ: planoTransporte,      // = rodadura + espesor real
    planoTransporteCongeladoZ: r2(STEP.planoBanda),                // 52.333 step §0
    derivaPlanoTransporteMm: r2(planoTransporte - STEP.planoBanda),
    planoRodaduraQueExigeLaBandaZ: r2(STEP.planoBanda - T_BANDA),  // 49.833 → lo que
    //   params_tambores.planoDorso (hoy 51.7 = STEP.guiaSec.topZ, cara de guía de la
    //   T5) tiene que valer para que el dorso vuelva al plano congelado. Es la misma
    //   cota a la que el NBT90 declara la regleta de su anfitrión (49.84).
    ramalRetornoZ: r2(RAMAL.z),                                    // −57.2 (dorso)
    caraRamalRetornoZ: zCaraRamal,                                 // −59.7 calc
    caraRamalRetornoPublicadaZ: r2(RAMAL.zCara),                   // −57.833 (con dorso T5)
    // desviación de cada rodillo que muerde por debajo respecto de la cota de
    // referencia de SU ramal (0.0 = tangente exacta, que es lo que debe salir).
    desalineoRodillosHombroMm: Object.fromEntries(rrHombro),
    tangenciaRodillosRetornoZ: Object.fromEntries(rrTangencia),
    // ---- RAMAL DE RETORNO RECTO (corrección del cliente 03-08-2026) ---------
    retornoRecto: RETIRA_POZO.activo,
    retornoCorredorCaraZ: RETIRA_POZO.activo ? CORREDOR.zCara : null,
    retornoCorredorDorsoZ: RETIRA_POZO.activo ? CORREDOR.zDorso : null,
    retornoCorredorY: RETIRA_POZO.activo
      ? [r2(TAMBORES.retorno[1].y), r2(TAMBORES.retorno[0].y)] : null,
    // holguras del ramal recto, medidas sobre el contorno EMITIDO (no declaradas)
    holguraRetornoTechoMovil: RETIRA_POZO.activo
      ? r2(CORREDOR.zCara - CORREDOR.techoMovilZ) : null,          // 2.00 al SEW
    holguraRetornoFondoRanura: RETIRA_POZO.activo ? CORREDOR.holguraRanura : null,   // 8.27
    holguraRetornoPuente: RETIRA_POZO.activo ? CORREDOR.holguraPuente : null,        // 20.65
    carasupBajoModuloZ: RETIRA_POZO.activo ? null : r2(RR[1].z - RETORNOS.r),   // −358.27 → CARA
    //   ALTA del ramal de fondo cuando había pozo. Sin pozo no existe.
    holguraBandaCilindroTensor: isFinite(holguraBandaCil) ? r2(holguraBandaCil) : 999,
    fondoHorquillaTensorZ: r2(TEN_GEO.poleaZ - R_TENSORA - T_BANDA),
    volanteHorquillaZ: zVol,
    // el abrazado que la geometría da a la TENSORA, frente al que declara
    // params_tensor2 (RAMAL.abrazadoDeg = 180 dis, medida original 186.25°):
    // ⚠ POR NOMBRE, NO POR ÍNDICE. Aquí ponía `env[7]`, que era la tensora
    // mientras el lazo tuvo 9 estaciones (tambor, conducido, 4 rodillos de pozo y
    // los 3 de la horquilla). Al pasar el retorno a RECTO el lazo se quedó en 7 y
    // ese 7 se salió de la lista: la tensión salía `NaN` en el aviso declarado.
    abrazadoTensoraGeometrico: env[NOMBRE_EST.indexOf('tensora')],
  };
  M.piezas = E.parts.length - M.piezas0;
  return M;
}
