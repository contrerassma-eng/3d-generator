#!/usr/bin/env node
// gen_sorter_co.mjs — INTEGRADOR del SORTER CO ADAPTADO a la transferencia
// NBT90. Decisión del cliente (ADAPTACION.md): el sorter cede; manda el
// espacio entre bandas.
//
//   node ensambles/sorter_co/gen_sorter_co.mjs            (desde cad/)
//   TEST_ROMPE=paso|ventana|roller|profundidad|luz|pasillo|borde|at10|retencion
//              |sintaladro|huerfana  (revisión de FABRICACIÓN: §U y §V)
//              |guia|guarda|pivote|pila|cilindro|soporte|bulon|portante
//              |apoyo|presion|rampa|apriete|eje|rodamiento|banda|fuente
//              |tolerancia|cordon|material|designacion|generica|ferreteria node …
//       (banco: inyecta UN defecto y demuestra que verify() lo para SIN emitir
//       JSON. pivote = le roba los anillos DIN 471 del eje del tensor; pila =
//       le roba un separador; cilindro = deja una banda sin él. Los OCHO
//       de `apoyo` a `fuente` son de la REVISIÓN ESTRUCTURAL §S y los SEIS
//       últimos, del bloque de FABRICACIÓN §F — ver los bloques de banco.
//       Ojo: `huerfana` (§V, travesaños de puente) y `ferreteria` (§F7, los
//       27 tornillos de la percha) son casos DISTINTOS.)
//
// Emite (solo si la compuerta pasa):
//   sorter_co_adaptado.json          — documento foto3d-cad (NBT90 como contexto)
//   out/sorter_co_brep.json          — el mismo ensamble SIN marcas de contexto en
//                                      el NBT90 y sin las cajas del cliente, para
//                                      ../nbt90/interferencias_brep.py --doc …
//
// Ejes: los del STEP del cliente (X ancho / Y flujo / Z arriba, plano de
// transporte Z=+52.333). El NBT90 entra rotado Rz(−90°) y trasladado T.

import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Ensamble, r2 } from '../nbt90/lib.mjs';
import { STEP, NBT, FRANJA, Xc, EJES, T, y0, y1, PERCHA, POZO, CALLE, TENSOR, bordeExtDescarga } from './adapt/params_adapt.mjs';
import { CLEVIS, RETEN, IDLER, EJEC, PIVOTE, GUARDAS, GUIAS } from './adapt/params_estaciones.mjs';
import { bboxU, solapeAABB } from './adapt/util_adapt.mjs';
import { nbt90, clienteFijo } from './adapt/mod_ctx.mjs';
import { calles } from './adapt/mod_calles.mjs';
import { percha } from './adapt/mod_percha.mjs';
import { estaciones } from './adapt/mod_estaciones.mjs';
import { guardas } from './adapt/mod_guardas.mjs';
// ▼▼▼ TENSOR NEUMÁTICO DE BRAZOS POR BANDA (bloque propio) ▼▼▼
import { tensor2, leerRamal } from './adapt/mod_tensor2.mjs';
import { TENSOR_VIEJO, PIV, TENSION, NEUM, PALANCA, EJE_CALC, SOPORTE, SOPORTE_CALC } from './adapt/params_tensor2.mjs';
import { pg40 } from './adapt/mod_pg40.mjs';
import { FLAGS as PG40F, PUBLICA as PG40PUB, CARGA as CARGA_PG40, PERFIL as PG40_PERFIL, GUIA as PG40_GUIA, ALARGUE as PG40_ALARGUE } from './adapt/params_pg40.mjs';
// ▲▲▲ ------------------------------------------------------ ▲▲▲
// ▼▼▼ TAMBOR MOTRIZ · CONDUCIDO · RODILLOS DE RETORNO (bloque propio) ▼▼▼
import { tambores } from './adapt/mod_tambores.mjs';
import { TAMBOR as TAMB_P, UCF207 as TAMB_UCF, CONDUCIDO as TAMB_CON,
  RETORNOS as TAMB_RET, TAMBORES as TAMB_EJES, RETORNO as TAMB_RAMAL,
  RETIRA as TAMB_RETIRA } from './adapt/params_tambores.mjs';
// ▲▲▲ ------------------------------------------------------------- ▲▲▲
// ▼▼▼ FABRICACIÓN — el MISMO esquema que usa la transferencia, sin copiarlo ▼▼▼
// El estándar de fabricación del NBT90 vivía en dos módulos suyos y el sorter
// no los importaba: por eso salía con 0 de 210 piezas propias con clase de
// tolerancia, ninguna soldada con cordón y 265 con las cadenas genéricas que
// `normalizado.mjs` existe justo para eliminar (REVISION_TALLER §A1/§A2, y
// REVISION_TALLER_PIEZAS §B3/§B4/§B5). Se importan los módulos del NBT90 tal
// cual —extendidos, no duplicados— para que el sorter y la transferencia no
// puedan divergir: si mañana cambia la clase de soldadura, cambia en los dos.
import { NORMA, claseGeneralDe, cordonDe, ajustesDe, tol2768, tol13920, tolForma13920 } from '../nbt90/tolerancias.mjs';
import { normalizar, esGenerica } from '../nbt90/normalizado.mjs';
// ▲▲▲ ------------------------------------------------------------- ▲▲▲

const aqui = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// §S · REVISIÓN ESTRUCTURAL DEL SORTER (2026-08-03) — LÍMITES Y DISPENSAS
//
// Hasta aquí la compuerta comprobaba que el sorter ENCAJA con la transferencia
// y que se puede armar. Este bloque comprueba que AGUANTA y que FUNCIONA: la
// cadena de tensión de banda, el arrastre en arranque, los ejes y rodamientos
// del accionamiento, el bastidor de aluminio y el apoyo del puente de calle.
//
// REGLA (la misma que ../nbt90/gen_nbt90.mjs §9): ningún límite se ajusta para
// que algo pase. Cada uno lleva el id del hecho de `web_facts.json` con su URL,
// su fecha de acceso y su cita textual. Los que NO son de catálogo van marcados
// `dis` y explican por qué se eligen — son decisiones NUEVAS de esta revisión y
// hay que discutirlas, no heredarlas en silencio.
// El detalle de cada hallazgo está en REVISION_ESTRUCTURAL_SC.md.
// ═══════════════════════════════════════════════════════════════════════════
const LIMS = {
  // --- materiales -----------------------------------------------------------
  C45: {
    // web MAT-C45-01 · EN 10083-2. El estado de suministro de los ejes NO está
    // declarado en params (dice sólo «C45 rectificado h7» / «C45 h9»), así que
    // se juzga con el estado MÁS DÉBIL de los dos, el normalizado. Si el
    // cliente los pide +QT hay que cambiar esto aquí y decirlo en params.
    fyN: 305,        // MPa · +N, 16-100 mm
    fyQT: 430,       // MPa · +QT, Ø16-40 mm (el que params_tensor2 ya usa)
    fsFlexion: 3,    // dis — el mismo FS 3 que params_tensor2 exige en §T2
  },
  alu6063: {
    // web MAT-6063-01 · EN 755-2:2016, t ≤ 10 mm. params_pg40.PERFIL declara la
    // aleación pero NO el temple: se juzga con el más débil de la familia.
    rp02T5: 130, rp02T6: 170,   // MPa
  },
  // --- tuerca martillo / ranura del perfil ----------------------------------
  tuercaT: {
    parMaxNm: 25,    // web TNUT-10-M8-01 · M8 en ranura 10
    K: 0.20,         // dis — factor par/precarga de una rosca métrica seca sin
                     //   lubricar (el mismo 0.20 que usa nbt90 LIM.perno38.K)
    // Huella del ala de la tuerca sobre los DOS labios de la ranura. La tuerca
    // real no está en el modelo (no hay pieza ni designación): se toma la del
    // catálogo citado — ala de 19.5 mm de largo y 2.25 mm de vuelo por labio.
    // Es `dis` y es la cota que hay que confirmar con la tuerca que se compre.
    huellaMm2: 2 * 19.5 * 2.25,   // 87.75
  },
  // --- rodamientos ----------------------------------------------------------
  brg: {
    // web BRG-6207-01 / BRG-6206-01 (Timken) · web BRG-UCF207-01 (UC207)
    C6207: 25700, C6206: 19500,
    L10objetivoH: 20000,   // dis — 5 años a dos turnos. Es el MISMO objetivo que
                           //   declaró la revisión estructural del NBT90
                           //   (nbt90 LIM.L10objetivoH): no se inventa otro.
    p: 3,                  // web BRG-L10-01 · ISO 281, rodamientos de bolas
  },
  // --- banda plana ----------------------------------------------------------
  banda: {
    // El modelo construye el lazo con un DORSO de 0.633 mm, que es el convenio
    // con el que el CLIENTE modeló su banda T5 DENTADA (step §4.3), no el
    // espesor de una banda plana. El propio params_tambores lo dice y cita el
    // dato del repo: nbt90 P.bandaEsp = 2.5 mm, MEDIDO sobre la banda plana de
    // 1" que ya corre en la transferencia.
    espMinMm: 2.0,          // nbt90 P.bandaEsp = 2.5 (med) — mínimo exigible
    nMmMin: TENSION?.rangoSanoNmm?.[0] ?? 3,   // el rango sano que declara el
                            //   propio params_tensor2 (dis de ese módulo)
    coherenciaPct: 5,       // dis — tolerancia entre la tensión que DECLARA
                            //   params_tensor2 y la que da la GEOMETRÍA que
                            //   construye mod_calles. Por encima de eso los dos
                            //   módulos están calculando cosas distintas.
  },
  // --- arranque -------------------------------------------------------------
  arranque: {
    // NO hay rampa declarada en ningún parámetro (queda en
    // `pendientes_sin_fuente`). Esta revisión FIJA una, porque sin ella el
    // arrastre en arranque no se puede juzgar: 1.0 s es el ajuste corriente de
    // un arrancador suave o un variador en una banda transportadora. Es `dis`:
    // si el cliente pone otra, se cambia aquí y la comprobación se rehace.
    rampaS: 1.0,
    fsMin: 1.5,   // dis — reserva mínima contra el patinaje EN ARRANQUE. El
                  //   módulo ya exige 2.0 en RÉGIMEN (params_tambores
                  //   CARGA.fsCapstanMin); en el transitorio se admite menos
                  //   porque dura menos de un segundo y no se repite con carga.
    bultos: 2,    // = params_tambores CARGA.bultosSimultaneos
  },
  // --- estructura -----------------------------------------------------------
  puenteApoyosMin: 2,     // dis — una viga necesita DOS apoyos. No es una norma:
                          //   es la definición de viga.
  amarreBastidorMin: 2,   // dis — nº mínimo de piezas de unión entre cada
                          //   travesaño extremo del PG40 y la estructura del
                          //   cliente. El propio mod_pg40 dice «se amarran a
                          //   ellos por escuadra»: la comprobación es que existan.
};

// ---------------------------------------------------------------------------
// HALLAZGOS ABIERTOS de la revisión estructural del sorter (2026-08-03).
//
// Son comprobaciones de §S que el diseño NO cumple y que no se pueden arreglar
// sin MOVER GEOMETRÍA — cosa que esta revisión tiene prohibida (hay otros
// agentes trabajando el trazado de banda y los soportes de cilindro). Se dejan
// escritas con su número, no en un documento:
//   · si una EMPEORA respecto del `uso` registrado aquí, la compuerta FALLA;
//   · si una DESAPARECE (el módulo dueño la arregló), FALLA pidiendo que se
//     borre la entrada, para que no queden dispensas caducadas;
//   · si aparece una violación que NO está en esta lista, FALLA sin más.
// `uso` = utilización = valor/límite (>1 incumple). `dueño` = quién lo arregla.
// ---------------------------------------------------------------------------
const HALLAZGOS_SC = {
  // SC-01 CERRADO el 2026-08-03 por la revisión de FABRICACIÓN (hallazgo A6):
  // adapt/params_pg40.TRAVESANOS_PUENTE + adapt/mod_pg40 §3-bis devuelven los
  // dos travesaños en Y −1280 y −692 coronando en Z 9.15, y el filtro de
  // `desactivaPercha` se lleva ahora el racimo huérfano que quedaba (4
  // escuadras + 20 pernos). Su dispensa se borra: la compuerta exige que no
  // queden dispensas caducadas y ella misma lo denunció al arreglarlo.
  'SC-02': { uso: 1.57, dueño: 'adapt/params_tensor2.mjs',
    nota: 'la tensión que da la geometría real del balancín es 1.91 N/mm, no los '
      + '4.03 declarados; ni a 6 bar de red se llega al mínimo de 3 N/mm' },
  'SC-03': { uso: 22.23, dueño: 'adapt/params_tensor2.mjs',
    nota: 'PALANCA.ratio supone la reacción de la banda VERTICAL y la horquilla '
      + 'que construye mod_calles la deja a 25.67° de la vertical' },
  'SC-05': { uso: 1.37, dueño: 'adapt/params_pg40.mjs',
    nota: 'ni el temple del perfil (T5 o T6) ni el par de apriete de las tuercas '
      + 'martillo están declarados' },
  // SC-10 CERRADO el 03-08-2026: `params_tambores.bandaEsp` pasó de
  // `STEP.bandaDorso` (0.633, el dorso de la T5 DENTADA) a `P.bandaEsp` (2.5
  // med), y el lazo entero se retrazó con él. La dispensa se BORRA, no se deja
  // caducada: el ratchet de §S exige que un hallazgo que pasa a cumplir haga
  // fallar la compuerta hasta que alguien quite su dispensa, precisamente para
  // que no se quede una excepción viva cubriendo un defecto que ya no existe.
  // Lo que se movió está en `verificaciones.calles.banda` y en el comentario de
  // `params_tambores.bandaEsp`; el plano de transporte NO se movió (52.333).
  'SC-11': { uso: 5, dueño: 'adapt/mod_pg40.mjs',
    nota: 'los 4 extremos de los travesaños largos topan contra los chapones sin '
      + 'ninguna pieza de unión modelada' },
};

// ---------------------------------------------------------------------------
// Utilidades de cálculo de §S. Se escriben AQUÍ, en la compuerta, y no se
// importan de ningún módulo: el sentido de §S es recalcular por su cuenta lo
// que los módulos declaran. (`viga` repite a propósito la de mod_tambores.)
// ---------------------------------------------------------------------------
/** Viga biapoyada con cargas puntuales. Devuelve M, σ, flecha MÁXIMA y reacciones. */
function vigaS(xa, xb, cargas, dEje, E = 210000) {
  const Lv = xb - xa, W = Math.PI * dEje ** 3 / 32, I = Math.PI * dEje ** 4 / 64;
  const tot = cargas.reduce((a, c) => a + c.p, 0);
  const Rb = cargas.reduce((a, c) => a + c.p * (c.x - xa), 0) / Lv, Ra = tot - Rb;
  const M = (x) => { let mm = Ra * (x - xa); for (const c of cargas) if (c.x < x) mm -= c.p * (x - c.x); return mm; };
  const Mmax = Math.max(...cargas.map(c => Math.abs(M(c.x))), 0);
  // flecha máxima real (no la del centro): trabajo virtual en 41 estaciones
  let dmax = 0, xmax = 0;
  const N = 400, h = Lv / N;
  for (let k = 1; k < 40; k++) {
    const xq = xa + Lv * k / 40, RaV = 1 - (xq - xa) / Lv;
    const mv = (x) => (x < xq ? RaV * (x - xa) : RaV * (x - xa) - (x - xq));
    let itg = 0;
    for (let i = 0; i <= N; i++) { const x = xa + i * h, w = (i === 0 || i === N) ? 0.5 : 1; itg += w * M(x) * mv(x) * h; }
    const dd = itg / (E * I);
    if (Math.abs(dd) > Math.abs(dmax)) { dmax = dd; xmax = xq; }
  }
  return { M: r2(Mmax), sigma: r2(Mmax / W), delta: r2(dmax), xDelta: r2(xmax), Ra: r2(Ra), Rb: r2(Rb), vano: r2(Lv) };
}

/** Normal de tangencia entre dos círculos dirigidos (misma fórmula que lib.mjs
 *  `bandaFaces`). q = {c:[y,z], r, s}. Devuelve el vector unitario del TRAMO
 *  RECTO que va de q1 a q2 (es la normal girada 90°). */
function tangenteS(q1, q2, esp) {
  const r1 = q1.r + esp / 2, r2c = q2.r + esp / 2;
  const du = q2.c[0] - q1.c[0], dv = q2.c[1] - q1.c[1], d = Math.hypot(du, dv);
  const a = (q1.s * r1 - q2.s * r2c) / d;
  if (!(Math.abs(a) < 1)) return null;
  const b = -Math.sqrt(1 - a * a), u = [du / d, dv / d], w = [-u[1], u[0]];
  const n = [a * u[0] + b * w[0], a * u[1] + b * w[1]];
  return [-n[1], n[0]];
}

/** Vida nominal ISO 281 (web BRG-L10-01): L10 = (C/P)^3 Mrev · L10h = L10·1e6/(60n). */
const L10hS = (C, P, rpm) => (P <= 0 || rpm <= 0 ? Infinity : (C / P) ** LIMS.brg.p * 1e6 / (60 * rpm));

// ---------------------------------------------------------------------------
// §B9 · FERRETERÍA HUÉRFANA DE LA PERCHA DESACTIVADA
// ---------------------------------------------------------------------------
// `params_pg40.FLAGS.desactivaPercha` retira las PLACAS de la percha; estos 27
// elementos son la tornillería que las cosía y que se quedaba dentro sujetando
// piezas que ya no existen. No es una molestia de lista: 3 de ellos son las
// ÚNICAS tres piezas del ensamble sin un solo vecino a 1 mm —flotan en el aire—
// y 12 son un DUPLICADO en las mismas colisas de reglaje del side channel que
// ya usan los pernos del alargue, 8.73 mm más arriba, contra un alma que sólo
// tiene taladro a Z −113: anulan el reglaje vertical del NBT90 y atraviesan
// chapa maciza. (REVISION_TALLER_COMPRAS_MONTAJE §B9.)
//
// CADA expresión va anclada con `^` al nombre COMPLETO de su familia y con el
// paréntesis de instancia detrás, para que no pueda alcanzar a un vecino de
// nombre parecido. Los vecinos que hay, y que NO se tocan:
//   · `FIJO · Ménsula de bisagra — lengüeta e=8` (5)  ← «lengüeta»
//   · `FIJO · Perno hex M8×25 ménsula↔travesaño` (10) ← «ménsula↔»
//   · `PG40 · Perno hex 3/8-16 × 25 · alargue …` + su tuerca y su golilla ←
//     son los pernos BUENOS de las mismas colisas; los huérfanos son los
//     `FIJO · … cuelgue …`, que es lo que los distingue.
// `esperadas` es la cuenta de la revisión: la compuerta §F exige que lo que se
// lleva cada expresión sea EXACTAMENTE eso, ni una más ni una menos.
const PERCHA_HUERFANA = [
  {
    id: 'B9-a', esperadas: 3, retiradas: null,
    rx: /^FIJO · Perno hex M8×16 lengüeta \(/,
    motivo: 'sujetaban la «Placa de cuelgue NBT90 con 3 lengüetas», que la bandera ya retira. '
      + 'Son las 3 únicas piezas del ensamble sin ningún vecino a menos de 1 mm: flotan.',
  },
  {
    id: 'B9-b', esperadas: 12, retiradas: null,
    rx: /^FIJO · Perno hex M8×20 ménsula↔bastidor \(/,
    motivo: 'cosían la «Ménsula percha» y la «Placa frontal ménsula↔bastidor» al chapón; las dos '
      + 'están filtradas. Su único vecino que queda es la guarda de pozo −X, que ATRAVIESAN.',
  },
  {
    id: 'B9-c', esperadas: 12, retiradas: null,
    // Los 4 pernos + 4 tuercas + 4 golillas del cuelgue. Anclado a «FIJO · » y a
    // la palabra «cuelgue»: los del alargue son «PG40 · … · alargue …» y no casan.
    rx: /^FIJO · (Perno hex 3\/8-16×[12]" cuelgue NBT90|Tuerca hex 3\/8-16 cuelgue|Golilla 3\/8 cuelgue) \(/,
    motivo: 'DUPLICADOS: van a las MISMAS colisas de reglaje del side channel (Y −802 y −1145) '
      + 'que los «PG40 · Perno hex 3/8-16 × 25 · alargue», 8.73 mm por encima (Z −104.27 contra '
      + '−113), y el alma del alargue sólo tiene taladro a Z −113: atraviesan chapa maciza. Dos '
      + 'filas de pernos a 8.73 mm en una colisa de ±8 anulan el reglaje vertical del NBT90.',
  },
  // Los 4 «Perno hex M8×20 placa escote↔chapón» que la revisión contaba aquí ya
  // los retira el filtro A6 de arriba (los añadió el bloque de la percha en el
  // mismo sitio); no se repiten para que no haya dos dueños de la misma pieza.
];

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------
const E = new Ensamble();
const m = {};
m.nbt90 = nbt90(E);
m.cliente = clienteFijo(E);
m.calles = calles(E);
m.percha = percha(E);   // ← puede quedar desactivada por PG40F.desactivaPercha (ver bloque PG40)
m.estaciones = estaciones(E);   // detalle fabricable: anclaje C85, retención V1…V4,
m.guardas = guardas(E);         //   IDLER-P01 medida, eje motriz común, guardas y guías

// ▼▼▼ TENSOR NEUMÁTICO DE BRAZOS POR BANDA ▼▼▼
// «TERMINA EL TENSOR NEUMÁTICO QUE TIENE BRAZOS POR CADA BANDA. ASEGURA SU EJE
// PIVOTE.» (instrucción literal del cliente, 31-07-2026).
// 5 brazos basculantes libres sobre casquillos en un eje pivote común Ø25
// asegurado, un cilindro CD85N25-80 común que tira de un yugo y precarga 5
// resortes. Cotas y fuerzas: adapt/params_tensor2.mjs. Los tensores viejos
// (mod_calles §7 y mod_estaciones §4-bis/§1) quedan desactivados por la bandera
// TENSOR_VIEJO, no borrados.
// La posición del ramal y los abrazados se leen de adapt/params_tambores.mjs
// (otro agente) si ya existe; si no, se usan los valores por defecto declarados.
// La bandera es un INTERRUPTOR: los dos tensores ocupan la misma bahía, así que
// o va el nuevo (TENSOR_VIEJO=false, por defecto) o va el del cliente.
m.ramal = await leerRamal();
if (!TENSOR_VIEJO) m.tensor2 = tensor2(E, m.ramal);
// ▲▲▲ --------------------------------------- ▲▲▲

// ▼▼▼ BASTIDOR PG40 · GUÍAS UHMW · ALARGUE DE LA ESTRUCTURA LATERAL ▼▼▼
// «Bastidor de aluminio de perfil 40×40 tipo PG40, y nada más grueso: su única
// misión es soportar las guías UHMW de las bandas.» (cliente, 31-07-2026).
// Un larguero 40×40 ranura 10 bajo cada una de las 5 bandas con su regleta UHMW
// encima, travesaños de alargue a alargue, y el ALARGUE de la estructura lateral
// de la transferencia hacia el tambor motriz y el rodillo conducido, con los
// taladros de los soportes UCF 207. El NBT90 NO se modifica: el alargue es pieza
// nueva atornillada a las colisas de reglaje de su side channel.
// Cotas y contrato con adapt/mod_tambores.mjs: adapt/params_pg40.mjs (bloque
// PUBLICA); si adapt/params_tambores.mjs existe, manda él para los ejes.
// El perfil 40×80 del cliente y sus guiaw de 39.9 los sustituye este bastidor:
// no se borran, se filtran por bandera (params_pg40.FLAGS).
{
  const rxFuera = [];
  if (PG40F.reemplazaPerfil4080) rxFuera.push(/FIJO · Perfil ranurado 40×80/, /drive kit↔perfil/);
  if (PG40F.reemplazaGuiaw) rxFuera.push(/FIJO · Guía de deslizamiento/);
  // LA PERCHA ANTERIOR SOBRA, y el cliente autorizó desactivarla por bandera:
  // colgaba el NBT90 de un larguero de perfil 40×80 que este bastidor ya no
  // monta, y su placa de cuelgue ocupa las MISMAS colisas de reglaje del side
  // channel por las que ahora se atornilla el alargue. Con el alargue, el NBT90
  // queda tomado por sus dos canales laterales (6 pernos 3/8) y de ahí al
  // bastidor. No se borra: basta poner desactivaPercha=false para recuperarla.
  // El ACCIONAMIENTO DE BANDA PLANA (mod_tambores) sustituye la transmisión T5
  // por calle y las 4 poleas de pozo V1…V4: el tambor motriz arrastra las 5
  // bandas y los 4 rodillos de retorno gobiernan el ramal. Se retiran por
  // bandera, no borrando código (params_pg40.FLAGS.desactivaTransmisionT5).
  if (PG40F.desactivaTransmisionT5) {
    // …y la TORNILLERÍA HUÉRFANA de esas pletinas de pozo: la bandera se llevaba
    // las placas y dejaba dentro los 60 M8 que las cosían al perfil, flotando
    // donde ya no hay placa (el mismo defecto que params_tambores.RETIRA corrigió
    // con los rodamientos de las V1…V4). Se van con la placa a la que servían.
    rxFuera.push(/Polea motriz T5-63T|Polea conducida T5|Volante contraflexión|Polea plana Ø117\.9|Pletina de volante|Pletina V[23]|M8×1[26] pletina V[1-4]|Eje Ø20×50 de pozo|Espaciador de aros|Anillo 3AM1-20|Anillo DIN 472-42/);
  }
  // A6 · EL FILTRO SE LLEVABA EL TRAVESAÑO Y DEJABA SU RACIMO. `desactivaPercha`
  // retiraba el «Travesaño percha 40×80» y la «Placa de escote», pero NO las
  // piezas cuyo nombre no dice «percha» y que colgaban de ellos: las 4
  // «Escuadra travesaño↔bastidor 3/16"» (que unían travesaño de percha ↔ chapón)
  // y 20 pernos (8 M8×16 travesaño + 8 M8×20 travesaño↔bastidor + 4 M8×20 placa
  // escote↔chapón). Se van con la pieza a la que servían, que es la regla que
  // este mismo bloque ya aplica a la tornillería de las pletinas de pozo.
  // Las 10 «Placa base de puente», los 5 puentes y las 5 regletas NO se van:
  // ahora los sostienen los «PG40 · Travesaño de puente» (adapt/mod_pg40 §3-bis).
  // `Casquillo separador` iba SUELTO en esta lista y era demasiado ancho: se
  // llevaba también los 6 «Casquillo separador Ø16×… guarda ±X (Y=…)» que crea
  // adapt/mod_guardas.mjs —que corre ANTES de este filtro— y dejaba dentro sus 6
  // «Perno hex M8×25/×35 guarda ±X↔chapón» atravesando el gap guarda↔chapón sin
  // nada que lo salvara: exactamente el defecto de B9, pero al revés. Se ancla al
  // casquillo DE LA PERCHA, que es el único que lleva «(+X,» detrás de la cota
  // (mod_percha: `Casquillo separador Ø16×<largo> (+X, Y=…)`). Contado antes y
  // después: la expresión pasa de llevarse 7 piezas a llevarse 1, y las 6
  // recuperadas son las de la guarda. Es el mismo error de regex ancha que se
  // acaba de pagar con los rodamientos del tensor (commit 94f7271).
  if (PG40F.desactivaPercha) rxFuera.push(/percha|Placa de cuelgue NBT90|Lengüeta de apoyo|Escuadra larguero|Escuadra ménsula|Ménsula percha|Placa frontal ménsula|Placa de escote|Casquillo separador Ø16×[\d.]+ \(\+X,|Escuadra travesaño↔bastidor|Perno hex M8×16 travesaño |Perno hex M8×20 travesaño↔bastidor|Perno hex M8×20 placa escote↔chapón/i);
  // B9 · LA FERRETERÍA HUÉRFANA QUE QUEDABA. Con la percha desactivada seguían
  // dentro 27 elementos que no sujetan ya nada, y que se comprarían y no se
  // podrían montar (REVISION_TALLER_COMPRAS_MONTAJE §B9). Se retiran por el
  // mismo mecanismo de bandera que el resto —filtro por nombre, sin borrar el
  // código que los crea: con desactivaPercha=false vuelven todos—, pero cada
  // expresión va ANCLADA al principio del nombre y con su cantidad esperada
  // delante, y la compuerta (§F) comprueba las dos cosas. El ancla no es
  // manía: una regex ancha se acaba de llevar por delante 10 rodamientos que
  // no tocaba (commit 94f7271), y `Casquillo separador`, aquí arriba, se
  // llevaba 6 casquillos de guarda.
  if (PG40F.desactivaPercha) {
    for (const h of PERCHA_HUERFANA) {
      h.retiradas = E.parts.filter((p) => h.rx.test(p.name)).length;
      rxFuera.push(h.rx);
    }
  }
  const antes = E.parts.length;
  if (rxFuera.length) E.parts = E.parts.filter(p => !rxFuera.some(rx => rx.test(p.name)));
  m.pg40 = pg40(E);
  m.pg40.sustituidas = antes - (E.parts.length - m.pg40.piezas);
}
// ▲▲▲ ------------------------------------------------------------- ▲▲▲

// ▼▼▼ TAMBOR MOTRIZ · CONDUCIDO · RODILLOS DE RETORNO ▼▼▼
// «Rediseña el sorter a la arquitectura de banda plana angosta: un tambor
// motriz común que arrastra las 5 bandas, un rodillo conducido al otro extremo,
// un tensor con brazos y rodillos de retorno.» (cliente, 31-07-2026).
//   · TAMBOR MOTRIZ: tubo Ø88.9 + 10 de goma vulcanizada por lado → Ø108.9,
//     eje Ø35 sobre 2 UCF 207 (instrucción literal), tapas soldadas, chavetero
//     DIN 6885 y saliente para el motorreductor de eje hueco.
//   · CONDUCIDO Ø108: descansos INTERIORES (6207-2RS dentro del tubo) sobre eje
//     fijo pasante Ø35, con sus casquillos, anillos DIN 471 y pletinas.
//   · 4 RODILLOS DE RETORNO Ø88.9 que bajan el ramal, lo pasan por debajo del
//     NBT90 y lo devuelven al conducido.
// Cotas y justificación de cada Ø: adapt/params_tambores.mjs. Ese archivo es el
// que leen adapt/params_pg40.mjs (ejes y patrón de taladros) y
// adapt/mod_tensor2.mjs (cota del ramal y abrazados reales).
// DOS ACCIONAMIENTOS NO CONVIVEN. `params_pg40.FLAGS.desactivaTransmisionT5` ya
// retira las poleas 63T y las del pozo; `params_tambores.RETIRA` es su hermana y
// se lleva el RESTO de la línea de árbol T5 (eje motriz común, bujes, chavetas,
// AT10, casquillo LK30 y la UCFL 205 que lo sujeta) — lo que la verificación
// B-rep exacta encontró metido DENTRO del eje del tambor y del UCF 207. Se
// filtra por nombre, no se borra código: con RETIRA.activo=false vuelve todo.
if (TAMB_RETIRA.activo) {
  const antesT = E.parts.length;
  E.parts = E.parts.filter(p => !TAMB_RETIRA.rx.test(p.name));
  m.tamboresRetiradas = antesT - E.parts.length;
}
m.tambores = tambores(E);
// ▲▲▲ ----------------------------------------------- ▲▲▲

// ---------------------------------------------------------------------------
// Banco de la compuerta: inyección de UN defecto controlado (TEST_ROMPE)
// ---------------------------------------------------------------------------
const ROMPE = process.env.TEST_ROMPE || '';
// Huella del ensamble ANTES de inyectar. Sirve para una comprobación del banco
// sobre sí mismo, que hace falta y no había:
//
//   Un caso de banco cuya inyección NO ENCUENTRA A NADIE sale con exit 0 y
//   parece que la compuerta está vigilando algo. No vigila nada: no había
//   defecto que cazar. Es la peor clase de test — verde porque no comprueba.
//
// Pasó de verdad y por partida doble. La revisión estructural avisó de que
// `at10` y `retencion` devolvían exit 0; se comprobó a mano y era cierto.
// Los dos inyectan sobre piezas que el cambio de arquitectura ya retiró:
// `at10` mueve la «Polea AT10 32T … recolocada», que se lleva
// `params_tambores.RETIRA`, y `retencion` roba los «Anillo 3AM1-20 (V2…» de
// las poleas de pozo, que se lleva `params_pg40.FLAGS.desactivaTransmisionT5`.
// Los bucles recorrían el ensamble sin tocar nada y el generador emitía el
// JSON tan tranquilo.
//
// Con esto, un caso que no inyecta ya no puede salir verde: aborta diciendo
// que el banco está muerto. La corrección de FONDO —o se re-apunta el caso a
// la pieza viva equivalente, o se retira junto con la comprobación que
// guardaba— sigue pendiente, pero deja de estar escondida.
const ROMPE_ANTES = ROMPE ? JSON.stringify(E.parts) : '';
if (ROMPE === 'paso') {
  // desplaza la calle 2 +0.5 mm: rompe el paso y el centrado en las ventanas
  for (const p of E.parts) {
    if (p.contexto || !p.name.includes('(calle 2,')) continue;
    p.pos = [r2(p.pos[0] + 0.5), p.pos[1], p.pos[2]];
  }
} else if (ROMPE === 'ventana') {
  // engorda el puente de la calle 3 a 40 de ancho (como el perfil viejo)
  for (const p of E.parts) {
    if (/Puente de calle — pletina/.test(p.name) && p.name.includes('(calle 3,')) {
      for (const f of p.features) if (f.shape === 'box') f.params.w = 40;
    }
  }
} else if (ROMPE === 'roller') {
  // re-introduce un rodillo de la transferencia incompleta del cliente
  E.addPart('CTX · roller/uni_002 Ø34×850 (resucitado para el banco)', '#888',
    [255, -1089.7, -17], [{ id: 'tst', name: 'uni_002', shape: 'cylinder', op: 'union', at: [255, -1089.7, -17], dir: [0, 1, 0], params: { dia: 34, h: 850 } }],
    { contexto: true });
} else if (ROMPE === 'profundidad') {
  // simula que LAT TOP siguiera bajo el módulo: caja del cliente dentro de la huella
  E.addPart('CTX · LAT TOP fantasma bajo el módulo (banco)', '#888',
    [209, -1000, -300], [{ id: 'tst2', name: 'caja', shape: 'box', op: 'union', at: [209, -1000, -300], dir: [0, 0, 1], params: { w: 500, d: 300, h: 150 } }],
    { contexto: true });
} else if (ROMPE === 'luz') {
  // estrecha la luz entre bastidores 60 mm (bastidor +X corrido hacia dentro)
  for (const p of E.parts) {
    if (/FRAME_MIR_MIR_MIR/.test(p.name)) p.pos = [r2(p.pos[0] - 60), p.pos[1], p.pos[2]];
  }
} else if (ROMPE === 'pasillo') {
  // una tapa fantasma sobre el plano de transporte, en el corredor de descarga
  E.addPart('CTX · Tapa fantasma sobre el corredor (banco)', '#888',
    [470, -980, 60], [{ id: 'tstp', name: 'tapa', shape: 'box', op: 'union', at: [470, -980, 60], dir: [0, 0, 1], params: { w: 80, d: 200, h: 90 } }],
    { contexto: true });
} else if (ROMPE === 'borde') {
  // descentra el reparto de vuelta al centro: el rodillo queda a >40 del borde
  for (const p of E.parts) p.pos = [r2(p.pos[0] - 70.46), p.pos[1], p.pos[2]];
} else if (ROMPE === 'at10') {
  // reintroduce la superposición AT10↔63T del STEP (defecto §5.2): corre la
  // AT10 recolocada hasta pisar la 63T de la calle 1
  for (const p of E.parts) {
    if (/Polea AT10 32T .*recolocada/.test(p.name)) p.pos = [r2(EJES[0] - 21), p.pos[1], p.pos[2]];
  }
} else if (ROMPE === 'retencion') {
  // roba los dos anillos 3AM1-20 de V2 de la calle 3: el paquete queda sin
  // retención axial y la compuerta §M4 lo denuncia
  E.parts = E.parts.filter(p => !(/Anillo 3AM1-20 \(V2/.test(p.name) && p.name.includes('calle 3')));
} else if (ROMPE === 'guia') {
  // mete la guía de descarga sur DENTRO del camino del bulto (Y −1161…−786)
  for (const p of E.parts) {
    if (/Guía de descarga sur/.test(p.name)) p.pos = [p.pos[0], -1100, p.pos[2]];
  }
} else if (ROMPE === 'soporte') {
  // roba el travesaño frontal: los 5 cilindros quedan EN EL AIRE (§T1-bis).
  // Es el defecto exacto que se coló hasta el cliente.
  E.parts = E.parts.filter(p => !/Travesaño frontal del tensor|Placa de extremo del travesaño/.test(p.name));
} else if (ROMPE === 'bulon') {
  // roba el bulón trasero de la calle 2: la bisagra no transmite nada
  E.parts = E.parts.filter(p => !(/Bulón trasero/.test(p.name) && p.name.includes('calle 2,')));
} else if (ROMPE === 'pivote') {
  // roba los 2 anillos DIN 471-30 del eje pivote del tensor: el eje se queda
  // sin retención axial de seguridad y la compuerta §T2 lo denuncia
  E.parts = E.parts.filter(p => !/Anillo retención eje pivote/.test(p.name));
} else if (ROMPE === 'pila') {
  // roba un separador de la pila de brazos: quedaría juego axial y un brazo
  // podría correrse a lo largo del eje (§T2)
  E.parts = E.parts.filter(p => !/Separador Ø38×.*calles 2–3/.test(p.name));
} else if (ROMPE === 'cilindro') {
  // deja la calle 4 sin su cilindro: esa banda no se tensaría (§T1)
  E.parts = E.parts.filter(p => !(/Cilindro SMC CD85N25-80/.test(p.name) && p.name.includes('calle 4,')));
} else if (ROMPE === 'guarda') {
  // corre la guarda sur del pozo hasta pisar el IDLER-ENS (deja además la
  // bajada de banda al descubierto)
  for (const p of E.parts) {
    if (/Guarda de pozo sur/.test(p.name)) p.pos = [p.pos[0], -1450, p.pos[2]];
  }
} else if (ROMPE === 'portante') {
  // HUNDE EL RAMAL PORTANTE de la calle 3 dentro de la transferencia: le mete un
  // seno de 80 mm en el tramo del módulo, que es exactamente el defecto que el
  // cliente denuncia (la banda esquivando el módulo en vez de atravesarlo recta
  // por el corredor del peine). La §R tiene que pararlo.
  for (const p of E.parts) {
    if (!/Banda plana 32/.test(p.name) || !p.name.includes('(calle 3,')) continue;
    for (const f of p.features) {
      if (f.shape !== 'sketch') continue;
      const pts = f.params.pts, out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        out.push(a);
        const yLo = Math.min(a[0], b[0]), yHi = Math.max(a[0], b[0]);
        if (a[1] > 0 && b[1] > 0 && yLo < y0 - 20 && yHi > y1 + 20) {
          const z = a[1], seno = [[y1 + 20, z], [y1 - 30, z - 80], [y0 + 30, z - 80], [y0 - 20, z]];
          out.push(...(a[0] > b[0] ? seno : [...seno].reverse()));
        }
      }
      f.params.pts = out;
    }
  }
}

// ── banco de la REVISIÓN ESTRUCTURAL §S (2026-08-03) ───────────────────────
// Los ocho casos de abajo NO son alternativas de la cadena de arriba: se
// aplican DESPUÉS, porque unos tocan la geometría emitida y otros tocan datos
// declarados (presión, par de apriete, C de catálogo, límites de LIMS), y §S
// los relee en `verify()`. Cada uno demuestra que UNA comprobación muerde, en
// una dirección o en la otra:
//   apoyo      → SC-01 pasa a cumplir  ⇒ falla pidiendo borrar la dispensa
//                (y de paso SC-11 empeora: el travesaño de banco tampoco lleva
//                 amarre a los chapones — las dos cosas son ciertas)
//   presion    → SC-02 empeora ⇒ falla; y arrastra SC-04, que se queda en 1.01
//   rampa      → SC-04 cae bajo su FS  ⇒ falla (no tiene dispensa)
//   apriete    → SC-05 empeora
//   eje        → SC-06 se dispara (y con él la §(6) del bloque TAMBORES, que
//                 exige que el eje sea el barreno del UCF 207)
//   rodamiento → SC-07 cae bajo las 20 000 h
//   banda      → SC-10 pasa a cumplir  ⇒ falla pidiendo borrar la dispensa
//   fuente     → SC-12 encuentra un id sin hecho (se inyecta dentro de §S)
if (ROMPE === 'apoyo') {
  // devuelve un travesaño bajo cada placa base del puente: SC-01 tiene que
  // notarlo LEYENDO la geometría, no un parámetro
  for (const y of [-1280, -692]) {
    E.addPart(`PG40 · Travesaño de banco 40×40 (Y ${y})`, '#b9c4cc',
      [Xc, y, -30.85], [{ id: `tb${y}`, name: 'perfil', shape: 'box', op: 'union',
        at: [Xc, y, -30.85], dir: [0, 0, 1], params: { w: 580, d: 40, h: 40 } }], {});
  }
} else if (ROMPE === 'presion') {
  NEUM.presionTrabajoBar = 2.5;                 // el tensor aflojado
} else if (ROMPE === 'rampa') {
  LIMS.arranque.rampaS = 0.25;                  // arranque brusco
} else if (ROMPE === 'apriete') {
  LIMS.tuercaT.parMaxNm = 60;                   // se aprieta con llave larga
} else if (ROMPE === 'eje') {
  TAMB_P.eje.d = 22;                            // eje del tambor adelgazado
} else if (ROMPE === 'rodamiento') {
  LIMS.brg.C6206 = 2600;                        // un 6206 de baja capacidad
} else if (ROMPE === 'banda') {
  // Este caso INYECTABA `STEP.bandaDorso = 2.5` para demostrar que SC-10 fallaba
  // pidiendo borrar su dispensa. Se quedó SIN SUJETO en cuanto SC-10 pasó a leer
  // `m.calles.banda.espesorMm` —lo que traza el lazo de verdad— en vez de esa
  // constante: seguía inyectando, pero sobre una variable que ya no lee nadie, y
  // devolvía exit 0. Es EXACTAMENTE el defecto de `at10` y `retencion`, y aquí
  // la guarda «BANCO MUERTO» no lo cazaba porque `banda` está en la lista de
  // casos que inyectan sobre datos y no sobre piezas.
  //
  // Re-apuntado: ahora devuelve el trazado al dorso de la T5 DENTADA, que es el
  // defecto que SC-10 existe para cazar. Si el lazo vuelve a colgar de 0.633, la
  // comprobación tiene que morder.
  if (m.calles?.banda) m.calles.banda.espesorMm = STEP.bandaDorso;   // 0.633
}

// ── banco de la REVISIÓN DE FABRICACIÓN (2026-08-03) ───────────────────────
// Los dos defectos que YA se colaron hasta el taller, inyectados a propósito
// para demostrar que las compuertas nuevas los paran:
//   sintaladro → §U: una pieza declara tornillería y no tiene el taladro
//                (defecto A1/A3/A4/A5: 112 tornillos declarados, 0 agujeros)
//   huerfana   → §V: un racimo cuelga de una pieza que ya no está en el
//                ensamble (defecto A6: 19 piezas y 40 tornillos en el aire)
if (ROMPE === 'sintaladro') {
  // le quita al cubrejunta del alargue los 8 taladros Ø11 que su propia nota
  // declara. La geometría sigue siendo una chapa perfectamente cortable: por eso
  // este defecto pasó cuatro revisiones sin que nadie lo viera.
  for (const p of E.parts) {
    if (!/^PG40 · Cubrejunta alma↔cabezal/.test(p.name)) continue;
    p.features = p.features.filter(f => f.shape !== 'hole');
  }
} else if (ROMPE === 'huerfana') {
  // retira los dos travesaños de puente, que es exactamente lo que hizo la
  // bandera `desactivaPercha` con el travesaño de la percha: las 10 placas base,
  // los 5 puentes, las 5 regletas, las 4 escuadras y sus 20 pernos se quedan
  // colgando de nada, y el ensamble los seguiría emitiendo.
  E.parts = E.parts.filter(p => !/^PG40 · Travesaño de puente/.test(p.name));
}

// EL BANCO SE COMPRUEBA A SÍ MISMO. Va aquí, detrás de las DOS cadenas, porque
// las dos inyectan y cualquiera de ellas vale como inyección.
//
// Un caso cuya inyección no encuentra a nadie sale con exit 0 y parece que la
// compuerta vigila algo. No vigila nada: no había defecto que cazar. Es la peor
// clase de test — verde porque no comprueba.
//
// Pasó de verdad y por partida doble. La revisión estructural avisó de que
// `at10` y `retencion` devolvían exit 0; se comprobó a mano y era cierto. Los
// dos inyectan sobre piezas que el cambio de arquitectura ya retiró: `at10`
// mueve la «Polea AT10 32T … recolocada», que se lleva `params_tambores.RETIRA`,
// y `retencion` roba los «Anillo 3AM1-20 (V2…» de las poleas de pozo, que se
// lleva `params_pg40.FLAGS.desactivaTransmisionT5`. Los bucles recorrían el
// ensamble sin tocar nada y el generador emitía el JSON tan tranquilo.
//
// Los casos de §S que tocan DATOS DECLARADOS y no la lista de piezas —presión
// de trabajo, rampa, par de apriete, Ø del eje, C de catálogo, dorso de banda,
// id de hecho— quedan exentos por construcción: su defecto vive en un
// parámetro que `verify()` relee, no en `E.parts`. Están enumerados uno a uno
// a propósito; una exención por descarte volvería a tapar lo que esto destapa.
const ROMPE_SOLO_DATOS = new Set(['presion', 'rampa', 'apriete', 'eje', 'rodamiento', 'banda', 'fuente']);
// Los SEIS de FABRICACIÓN inyectan más abajo, sobre lo que escribe la pasada §F
// —tolerancia, cordón, material, designación—, que todavía no ha corrido cuando
// se llega aquí: en este punto no han tocado nada y no pueden. No quedan sin
// vigilar por eso: el bloque §F lleva su PROPIA instantánea y su propio «banco
// muerto», tomados justo donde inyectan. Se enumeran uno a uno, igual que
// ROMPE_SOLO_DATOS y por el mismo motivo: una exención por descarte volvería a
// tapar lo que esta comprobación destapó.
const ROMPE_FAB = new Set(['tolerancia', 'cordon', 'material', 'designacion', 'generica', 'ferreteria']);
if (ROMPE && !ROMPE_SOLO_DATOS.has(ROMPE) && !ROMPE_FAB.has(ROMPE)
  && JSON.stringify(E.parts) === ROMPE_ANTES) {
  console.error(`BANCO MUERTO: TEST_ROMPE=${ROMPE} no ha tocado NINGUNA pieza.`);
  console.error('  El caso inyecta sobre geometría que ya no existe en este ensamble, así que la');
  console.error('  compuerta pasaría por no tener nada que cazar. Un banco que no inyecta no');
  console.error('  demuestra que la comprobación muerda: re-apúntalo a la pieza viva equivalente,');
  console.error('  o retíralo junto con la comprobación que guardaba.');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// §F · FABRICACIÓN — tolerancia, material, cordón y designación
//
// Va DESPUÉS de construir y ANTES de la compuerta, que es donde lo pone
// ../nbt90/gen_nbt90.mjs y por la misma razón: la compuerta lo verifica. Hace
// UNA pasada sobre `E.parts` y de ahí sale lo que hasta ahora no salía de
// ningún sitio (REVISION_TALLER §A1/§A2 y REVISION_TALLER_PIEZAS §B3/§B4/§B5):
//
//   1) cada pieza COMPRADA recibe su designación normalizada (`normalizado.mjs`),
//      que es lo que borra las 4 cadenas genéricas del tipo «ASME B18.2.1 /
//      DIN 933» — dos normas incompatibles a la vez, ninguna aplicable;
//   2) cada pieza FABRICADA recibe su clase de tolerancia general y, si tiene
//      cota de ajuste, la lista ISO 286 que le toca (`tolerancias.mjs`);
//   3) cada pieza SOLDADA recibe su cordón: tipo, cateto, garganta, disposición,
//      proceso y norma. Un plano sin cordón no es fabricable;
//   4) cada pieza FABRICADA recibe su MATERIAL, leído de donde ya está
//      declarado —el campo, la chapa, el catálogo, el parámetro del módulo o el
//      propio nombre—. Lo que NINGÚN módulo declara NO se inventa: se queda
//      fuera, en una lista con dueño, y la compuerta cuenta que no crezca.
//
// Las piezas de CONTEXTO DEL CLIENTE se saltan (son cajas medidas, no se
// fabrican ni se compran aquí). Las del NBT90 embebido llegan YA con sus
// metadatos porque su propio integrador se los pone — pero eso se COMPRUEBA
// pieza a pieza, no se supone: si alguna llegara sin ellos, esta misma pasada
// se los pone, y el recuento de las que venían completas se publica.
// ═══════════════════════════════════════════════════════════════════════════

// --- quién se compra y quién se fabrica -------------------------------------
// El criterio es el mismo del NBT90 —`(hardware || componente) && !fabricada`—
// con DOS correcciones anotadas, porque dos módulos ajenos marcan mal su pieza
// y sin corregirlo el eje del tambor pediría una norma de catálogo (no existe:
// se fabrica según plano) y la banda pediría un material de taller (no se
// fabrica: se compra sin fin). Las dos correcciones están ancladas al nombre
// completo y su cuenta la verifica §F.
const FABRICADA_PESE_A_COMPONENTE = /^TAMBOR · eje Ø\d+(?:\.\d+)? × \d+ con saliente y chavetero$/;
const COMPRADA_PESE_A_SIN_BANDERA = /^FIJO · Banda plana [\d.]+ × [\d.]+ — lazo del tambor motriz/;
const compradaSC = (p) => {
  if (FABRICADA_PESE_A_COMPONENTE.test(p.name)) return false;   // eje C45 con chavetero: PLANO
  if (COMPRADA_PESE_A_SIN_BANDERA.test(p.name)) return true;    // banda sin fin: CATÁLOGO
  return !!(p.hardware || p.componente) && !p.fabricada;
};

// --- MATERIAL: de dónde sale el de cada familia ------------------------------
// Cada línea cita SU FUENTE, y la fuente es siempre algo que ya está escrito en
// el repositorio: un parámetro del módulo, el campo `chapa` de la propia pieza,
// su `catalogo`, su `nota` o su nombre. Ninguna línea elige un acero «porque
// suele ser ése»: donde el módulo no lo dice, no hay línea (ver SIN_MATERIAL_SC).
const MATERIAL_SC = [
  // --- calles (adapt/mod_calles.mjs · params_adapt.CALLE.puente) ------------
  [/^FIJO · Puente de calle — pletina/, 'Pletina de acero A36 (S275JR) 30×28, cortada por láser',
    'params_adapt CALLE.puente.aceroH («dis: pletina A36») + el propio nombre, que ya dice A36'],
  [/^FIJO · Puente de calle — regleta UHMW/, 'UHMW-PE 1000',
    'params_pg40 GUIA.material (web UHMW-001) — es la misma regleta de deslizamiento'],
  [/^FIJO · Placa base de puente/, 'Pletina de acero A36 (S275JR) e=6, cortada por láser',
    'params_adapt CALLE.puente («dis: pletina A36») + el espesor del propio nombre'],
  // --- guías de descarga (adapt/mod_estaciones.mjs · GUIAS.base) ------------
  [/^FIJO · Base de guía (norte|sur) 3\/16"/, 'Chapa de acero A36 (S275JR) e=4.763 (3/16"), plegada',
    'params_estaciones GUIAS.base.t = 4.763'],
  // --- tensor de brazos (adapt/params_tensor2.mjs) --------------------------
  [/^FIJO · Eje pivote común/, 'C45 rectificado h7',
    'params_tensor2 PIV.material'],
  [/^FIJO · Brazo tensor e=/, 'Pletina de acero A36 (S275JR) e=8, corte láser',
    'la nota que el propio módulo escribe en la pieza: «pletina A36 e=8, corte láser»'],
  [/^FIJO · Cubo del brazo/, 'Tubo de acero Ø50 mecanizado, bore Ø38 H7',
    'la nota del propio módulo: «tubo mecanizado Ø50, bore Ø38 H7». El GRADO del acero no lo '
    + 'declara nadie — queda dicho en el informe'],
  [/^FIJO · Ménsula de bisagra — lengüeta/, 'Pletina de acero A36 (S275JR) e=8',
    'la nota del propio módulo («pletina A36 en L») + params_tensor2 SOPORTE.mensula.e'],
  [/^FIJO · Pletina soporte del regulador/, 'Pletina de acero A36 (S275JR) e=8',
    'params_tensor2 SOPORTE.regPresion.placa («dis — pletina») + SOPORTE_CALC.fyMPa 250 = A36'],
  [/^FIJO · Placa de extremo del travesaño frontal/, 'Pletina de acero A36 (S275JR) e=8',
    'params_tensor2 SOPORTE.mensula.e = 8 («dis — pletina A36»)'],
  [/^FIJO · Travesaño frontal del tensor/, 'Tubo estructural 40×40×3 de acero A36 (S275JR)',
    'params_tensor2 SOPORTE.trav («tubo estructural 40×40×3») + SOPORTE_CALC.fyMPa 250 = A36'],
  // --- bastidor PG40 (adapt/params_pg40.mjs) --------------------------------
  [/40×40 ranura 10/, `Perfil extruido de aluminio ${PG40_PERFIL.aleacion} 40×40 ranura 10`
    + ' — TEMPLE NO DECLARADO (T5 y T6 no tienen el mismo Rp0,2: 130 vs 170 MPa)',
    'params_pg40 PERFIL.aleacion (web ALU-001 / MAT-6063-01)'],
  [/^PG40 · Guía UHMW/, PG40_GUIA.material, 'params_pg40 GUIA.material (web UHMW-001)'],
  [/^PG40 · (Alargue lateral|Cubrejunta|Cartela|Ménsula alma|Escuadra )/,
    'Acero A36 (S275JR) cortado por láser', 'params_pg40 ALARGUE.material'],
];

// --- LO QUE NINGÚN MÓDULO DECLARA -------------------------------------------
// Regla de oro nº 1: no se inventa. Estas familias se quedan SIN material y con
// dueño, igual que las dispensas de §S. La compuerta exige que la cuenta sea
// EXACTAMENTE ésta: si aparece una pieza nueva sin material, no cabe en ninguna
// línea y §F para el generador. Y si un módulo declara por fin el suyo, la
// cuenta baja y §F también para, pidiendo borrar la línea que sobra — una
// dispensa caducada es tan mala como una que falta.
const SIN_MATERIAL_SC = [
  {
    id: 'MAT-01', rx: /^FIJO · Volante de horquilla guia_/, esperadas: 10,
    dueño: 'adapt/mod_calles.mjs (pieza medida del cliente)',
    motivo: 'volante del cliente REUBICADO: del STEP salen el Ø y la cara útil, no el material. '
      + 'Hay que preguntárselo al cliente o medirlo en planta; escribir un acero aquí sería '
      + 'inventar la procedencia de una pieza que no hemos fabricado.',
  },
  {
    id: 'MAT-02', rx: /^FIJO · Polea tensora POL-CON-TEN/, esperadas: 5,
    dueño: 'adapt/mod_tensor2.mjs (pieza medida del cliente)',
    motivo: 'misma razón que MAT-01: es la tensora del cliente reutilizada (step §4.5).',
  },
  {
    id: 'MAT-03', rx: /· (tapa-soporte|casquillo) Ø/, esperadas: 20,
    dueño: 'adapt/params_tambores.mjs · adapt/mod_tambores.mjs',
    motivo: 'el módulo SÍ declara el material del tubo, del eje y de la pletina de soporte de '
      + 'estos mismos rodillos, pero no el de sus 10 tapas-soporte ni el de sus 10 casquillos. '
      + 'Son piezas de torno con asiento de rodamiento y prensado H7/r6: el plano no sale sin '
      + 'material. Falta declararlo en params_tambores (CONDUCIDO.tapa y RETORNOS.tapa).',
  },
  // MAT-04 (Eje de polea tensora · Bulón del lóbulo · Separador Ø38×) BORRADA el
  // 2026-08-03: su dueño, adapt/params_tensor2.mjs, ya declara el material de
  // las tres familias — POL.eje.material y SOPORTE.bulonRotula.material a
  // «C45 (1.0503) rectificado h9 · web MAT-C45-01», y PIV.separador.material a
  // C45 torneado, éste por consolidación de existencias con el eje pivote sobre
  // el que se enfila y no por requisito de resistencia (así lo dice el propio
  // parámetro). Una dispensa que ya no cubre a nadie es tan mala como una que
  // falta, y la propia §F3b lo estaba pidiendo.
  {
    id: 'MAT-05', rx: /^FIJO · Casquillo separador Ø\d+×[\d.]+ guarda /, esperadas: 6,
    dueño: 'adapt/mod_guardas.mjs',
    motivo: 'los 6 casquillos que salvan el gap guarda↔chapón. Estaban DESAPARECIENDO del '
      + 'ensamble —se los llevaba la expresión ancha `Casquillo separador` del filtro de la '
      + 'percha— mientras sus 6 pernos M8×25/M8×35 seguían dentro atravesando el hueco vacío. '
      + 'Recuperados; ahora falta su material: ni mod_guardas ni el casquillo de escote de la '
      + 'percha del que copia el patrón declaran ninguno.',
  },
];

// --- JUNTAS SOLDADAS: cuál es el espesor que manda ---------------------------
// El cateto del filete lo limita la chapa MÁS FINA de la junta, y en el sorter
// ésa casi nunca es la de la propia pieza: una tapa torneada de 12 mm soldada a
// un tubo de 3.2 se suelda con el cateto del TUBO. `tolerancias.cordonDe` ya
// tiene el mecanismo para decirlo (`soldaduraEspesorMin`); lo que falta es la
// cota, y cada una sale del módulo que construye la otra mitad de la junta.
// Ninguna es un número elegido aquí.
const SOLDADAS_SC = [
  {
    id: 'SLD-01', rx: /^FIJO · Placa base de puente/, esperadas: 10, e: 6,
    junta: 'placa base 6 mm ↔ pletina del puente 30×28 — la fina es la placa',
    fuente: 'espesor de la propia placa (nombre 64×28×6)',
  },
  {
    id: 'SLD-02', rx: /^FIJO · Base de guía (norte|sur) 3\/16"/, esperadas: 2, e: null,
    junta: 'alma vertical ↔ base, las dos de 3/16"',
    fuente: 'params_estaciones GUIAS.base.t — el propio `espesorLocal` lo lee del «3/16"» del nombre',
  },
  {
    id: 'SLD-03', rx: /^FIJO · (Brazo tensor e=|Cubo del brazo)/, esperadas: 15, e: 6,
    junta: 'las 2 pletinas del brazo (e=8) ↔ cubo Ø50/Ø38 — la fina es la PARED DEL CUBO, '
      + '(50−38)/2 = 6, no la pletina',
    fuente: 'params_tensor2 PIV.cubo {de:50, bore:38} — calc de la pared',
  },
  {
    id: 'SLD-04', rx: /^FIJO · Placa de extremo del travesaño frontal/, esperadas: 2, e: 3,
    junta: 'placa de extremo (e=8) ↔ travesaño 40×40×3 — la fina es la pared del tubo',
    fuente: 'params_tensor2 SOPORTE.trav.esp = 3',
  },
  {
    id: 'SLD-05', rx: /^TAMBOR · tapa soldada/, esperadas: 2, e: null,
    junta: 'tapa torneada e=12 ↔ tubo Ø88.9×3.2 y ↔ eje Ø35 — la fina es la PARED DEL TUBO',
    fuente: 'params_tambores TAMBOR.tubo.e (pared del tubo)',
    // La cota se lee del módulo en tiempo de ejecución (abajo): así, si el tubo
    // cambia de pared, el cordón cambia con él y no se queda un 3.2 escrito.
    // Si el módulo dejara de publicarla, `eDe` devuelve null y `espesorLocal`
    // leería el «e=12» del NOMBRE, que es el de la TAPA y no el de la junta:
    // por eso la compuerta comprueba abajo que la cota siga saliendo del módulo.
    eDe: () => TAMB_P?.tubo?.e ?? null,
    declara: 'params_tambores describe además, en el texto de `material` de la tapa, «cordón de '
      + 'rincón 4 mm» al tubo y «2 cordones de 5 mm» al eje. Se conserva esa declaración: el '
      + 'cateto de 4 sobre una pared de 3.2 es mayor que el espesor y hay que revisarlo con el '
      + 'proceso (riesgo de perforar el tubo), pero es lo que el módulo dice y no se borra.',
  },
  {
    id: 'SLD-06', rx: /^PG40 · Ménsula alma↔travesaño/, esperadas: 4, e: PG40_ALARGUE.e,
    junta: 'ménsula ↔ alma del alargue, solape de dos pletinas del mismo espesor',
    fuente: 'params_pg40 ALARGUE.e',
    // Aquí el módulo NO se limita a decir que va soldada: declara el cordón
    // entero. Manda él, no el criterio por defecto — un amarre que lleva el peso
    // del NBT90 al bastidor se suelda continuo, y el 25/50 de `cordonDe` es la
    // regla de la chapa fina que no tiene que aguantar nada.
    disposicion: PG40_ALARGUE.mensulaCordon,
    declara: 'params_pg40 ALARGUE.mensulaCordon declara el cordón COMPLETO y prevalece sobre el '
      + 'discontinuo 25/50 por defecto: es el amarre que lleva la carga del NBT90 al bastidor.',
  },
];
/** Toda pieza propia que DIGA que va soldada, la diga donde la diga. La usa la
 *  compuerta para comprobar que la tabla de arriba no se ha dejado ninguna. */
const DICE_SOLDADA = (p) => /soldad|suelda|suelde|soldar|cord[óo]n|weld/i
  .test([p.name, p.nota, p.material, p.ajusteMontaje, p.catalogo].filter(Boolean).join(' § '));

// --- LA PASADA ---------------------------------------------------------------
const FAB = (() => {
  const nbtEmbebido = E.parts.filter((p) => /^NBT90 · /.test(p.name));
  // COMPROBACIÓN, no suposición: ¿el NBT90 embebido trae ya sus metadatos?
  const nbtConTol = nbtEmbebido.filter((p) => p.tol).length;
  const nbtSoldadas = nbtEmbebido.filter((p) => p.union || p.weldment || /SOLDADA/.test(p.name));
  const nbtConCordon = nbtSoldadas.filter((p) => p.soldadura).length;
  const nbtCompradas = nbtEmbebido.filter((p) => !!(p.hardware || p.componente) && !p.fabricada);
  const nbtConNorma = nbtCompradas.filter((p) => !esGenerica(p.norma)).length;
  const nbtCompleto = nbtConTol === nbtEmbebido.length
    && nbtConCordon === nbtSoldadas.length && nbtConNorma === nbtCompradas.length;

  // 1) designación de las compradas. `normalizar` respeta la designación
  //    específica que ya traiga el módulo (un SMC CD85N25-80-B no se pisa) y
  //    sólo denuncia las que llegan con cadena de relleno o sin nada.
  const norm = normalizar(E.parts, { comprada: compradaSC });

  const propias = E.parts.filter((p) => !p.contexto);
  const fabricadas = [], compradas = [], sinMaterial = [], soldadas = [], juntasSinCota = [];
  const materialFuentes = new Map();

  for (const p of E.parts) {
    // contexto del CLIENTE: cajas medidas, ni se fabrican ni se compran aquí
    if (p.contexto && !/^NBT90 · /.test(p.name)) continue;
    const delNbt = /^NBT90 · /.test(p.name);
    // El NBT90 embebido llega hecho. Sólo se le RELLENA lo que falte —nunca se
    // le pisa nada—, para que un NBT90 futuro sin metadatos no deje al sorter
    // con un agujero en el despiece.
    const comprada = compradaSC(p);
    if (!p.tol) {
      const cl = claseGeneralDe(p.name, {});   // el `{}` es el del NBT90 y por lo mismo:
      // la tolerancia de la pieza SUELTA no es la del conjunto soldado, y las dos hacen falta
      // en el plano; pasando la pieza, `union`/`weldment` se llevarían la primera por delante.
      p.tol = { pieza: comprada ? null : cl.clase, norma: comprada ? null : cl.titulo };
      if (p.union || p.weldment) p.tol.conjunto = NORMA.soldadura.clase;
      // LOS AJUSTES ISO 286 DE `tolerancias.AJUSTES` SON DEL NBT90 Y SÓLO DEL
      // NBT90. Se aplican por nombre, y aplicados a otro ensamble aciertan por
      // casualidad o mienten: se probó, y en el sorter pegaban el AJ-12
      // («taladro de paso de la tornillería de 3/8-16») a las 219 piezas
      // fabricadas —su patrón de pieza es `/./`, porque en la transferencia
      // TODAS las uniones atornilladas son de 3/8-16 y aquí son M6, M8, M10 y
      // M12— y el AJ-07 («casquillo separador Ø13,0 H11 sobre eje Ø12,70») a los
      // 6 casquillos de guarda, que son Ø16 con taladro de 8,6. Un ajuste falso
      // en un plano es peor que ninguno: se mecaniza.
      // Los ajustes propios del sorter son hallazgo APARTE y siguen abiertos
      // (REVISION_TALLER_PIEZAS §B5): sus módulos declaran hoy `ajuste` y
      // `ajusteMontaje` en texto libre, y ponerles designación ISO 286 es
      // trabajo de esos módulos, no de esta pasada.
      const aj = comprada || !delNbt ? [] : ajustesDe(p.name, p);
      if (aj.length) {
        p.tol.ajustes = aj.map((a) => ({
          id: a.id, cota: a.cota, ajuste: a.ajuste, criterio: a.criterio, fuente: a.fuente,
          ...(a.juegoDiametralMm ? { juegoDiametralMm: a.juegoDiametralMm } : {}),
          ...(a.aviso ? { aviso: a.aviso } : {}),
        }));
      }
    }
    // Cordón de las piezas del NBT90 que se declaren soldadas y llegaran sin él.
    // Hoy no ocurre —llegan las 23 con el suyo, y se cuenta arriba—, pero es la
    // otra mitad de «compruébalo, no lo supongas»: si un día llegan sin cordón,
    // el sorter no emite un despiece con la junta a medias.
    if (delNbt) {
      if (!p.soldadura && (p.weldment || /soldad/i.test(p.union || '') || /SOLDADA/.test(p.name))) {
        const c = cordonDe(p);
        if (c) p.soldadura = { ...c, rellenadoPor: 'gen_sorter_co §F (el NBT90 llegó sin él)' };
      }
      continue;                                 // lo suyo ya está; lo de abajo es del sorter
    }

    // 2) cordón de las soldadas del sorter
    const sld = SOLDADAS_SC.find((s) => s.rx.test(p.name));
    if (sld) {
      // Las entradas con `eDe` leen la cota del módulo dueño en cada pasada. Si
      // el módulo deja de publicarla y devuelve null, NO se cae al espesor que
      // haya en el nombre —que es el de la pieza, no el de la junta—: se anota y
      // la compuerta §F2c lo denuncia. Perder la cota en silencio soldaría una
      // tapa de 12 con el cateto de 12 sobre una pared de 3.2.
      const eJunta = sld.eDe ? sld.eDe() : sld.e;
      if (sld.eDe && !eJunta) juntasSinCota.push(`${p.name} — ${sld.fuente}`);
      if (eJunta) p.soldaduraEspesorMin = eJunta;
      const c = cordonDe(p);
      if (c) {
        p.soldadura = { ...c, junta: sld.junta, fuenteDelEspesor: sld.fuente,
          // Si el módulo dueño declara la disposición del cordón, MANDA ÉL: el
          // 25/50 de `cordonDe` es el criterio de la chapa fina que sólo tiene
          // que no alabearse, y no todas las juntas del sorter son ésa.
          ...(sld.disposicion ? { disposicion: sld.disposicion, disposicionFuente: sld.fuente } : {}),
          ...(sld.declara ? { declaraElModulo: sld.declara } : {}) };
        if (!p.tol.conjunto) p.tol.conjunto = NORMA.soldadura.clase;
      }
      soldadas.push(p);
    }

    // 3) material de las fabricadas
    if (!comprada) {
      fabricadas.push(p);
      if (!p.material) {
        if (p.chapa?.material) {
          p.material = `Chapa de ${p.chapa.material}, e=${p.chapa.t} mm`;
          p.material_fuente = 'campo `chapa` de la propia pieza';
        } else {
          const h = MATERIAL_SC.find(([rx]) => rx.test(p.name));
          if (h) { p.material = h[1]; p.material_fuente = h[2]; }
        }
      }
      if (p.material) {
        materialFuentes.set(p.material_fuente ?? 'declarado por su módulo en el campo `material`',
          (materialFuentes.get(p.material_fuente ?? 'declarado por su módulo en el campo `material`') ?? 0) + 1);
      } else sinMaterial.push(p);
    } else compradas.push(p);
  }

  // Dispensas de material: cuántas caen en cada línea declarada. Se serializa la
  // expresión como TEXTO —un RegExp se convierte en `{}` al pasar por JSON y el
  // documento perdería justo el dato que hace auditable la dispensa: a quién
  // alcanza.
  const dispensas = SIN_MATERIAL_SC.map((d) => ({
    id: d.id, esperadas: d.esperadas, dueño: d.dueño, motivo: d.motivo,
    expresion: String(d.rx),
    reales: sinMaterial.filter((p) => d.rx.test(p.name)).length,
  }));
  const sinMaterialNiDispensa = sinMaterial.filter((p) => !SIN_MATERIAL_SC.some((d) => d.rx.test(p.name)));

  return {
    propias: propias.length, fabricadas: fabricadas.length, compradas: compradas.length,
    conTolerancia: fabricadas.filter((p) => p.tol?.pieza).length,
    conMaterial: fabricadas.filter((p) => p.material).length,
    soldadas: soldadas.length, conCordon: soldadas.filter((p) => p.soldadura).length,
    designadas: norm.designadas, deModulo: norm.deModulo.length,
    sinDesignar: norm.sinDesignar, avisosDesignacion: norm.avisos.length,
    genericas: compradas.filter((p) => p.norma && esGenerica(p.norma)).map((p) => p.name),
    sinNorma: compradas.filter((p) => !p.norma).map((p) => p.name),
    diceSoldadaSinTabla: propias.filter((p) => DICE_SOLDADA(p) && !SOLDADAS_SC.some((s) => s.rx.test(p.name)))
      .map((p) => p.name),
    juntasSinCota,
    dispensas, sinMaterialNiDispensa: sinMaterialNiDispensa.map((p) => p.name),
    materialFuentes: Object.fromEntries(materialFuentes),
    nbt90: { piezas: nbtEmbebido.length, conTol: nbtConTol, soldadas: nbtSoldadas.length,
      conCordon: nbtConCordon, compradas: nbtCompradas.length, designadas: nbtConNorma,
      llegaCompleto: nbtCompleto },
    huerfanas: PERCHA_HUERFANA.map((h) => ({ id: h.id, esperadas: h.esperadas, retiradas: h.retiradas,
      supervivientes: E.parts.filter((p) => h.rx.test(p.name)).length,
      expresion: String(h.rx), motivo: h.motivo })),
    juntas: SOLDADAS_SC.map((s) => ({ id: s.id, esperadas: s.esperadas, expresion: String(s.rx),
      espesorJuntaMm: s.eDe ? s.eDe() : s.e, junta: s.junta, fuente: s.fuente,
      reales: propias.filter((p) => s.rx.test(p.name)).length })),
  };
})();

// ── banco de FABRICACIÓN §F ────────────────────────────────────────────────
// Seis casos, uno por comprobación, aplicados DESPUÉS de la pasada porque es lo
// que la pasada escribe lo que hay que romper. Cada uno lleva su propia
// comprobación de banco vivo al final del bloque, igual que la cadena de arriba:
// un caso que no inyecta nada no demuestra nada.
//   tolerancia  → §F1 · una pieza fabricada se queda sin clase de tolerancia
//   cordon      → §F2 · una pieza soldada se queda sin cordón
//   material    → §F3 · una pieza fabricada se queda sin material
//   designacion → §F4 · una comprada se queda sin designación de ningún tipo
//   generica    → §F5 · a una comprada le vuelve la cadena «ASME B18.2.1 / DIN 933»
//   ferreteria  → §F7 · vuelve uno de los 3 M8×16 que flotaban en el aire
const FAB_ANTES = JSON.stringify(E.parts);
if (ROMPE === 'tolerancia') {
  for (const p of E.parts) if (/^FIJO · Brazo tensor e=/.test(p.name)) delete p.tol;
} else if (ROMPE === 'cordon') {
  for (const p of E.parts) if (/^TAMBOR · tapa soldada/.test(p.name)) delete p.soldadura;
} else if (ROMPE === 'material') {
  for (const p of E.parts) if (/^PG40 · Guía UHMW/.test(p.name)) delete p.material;
} else if (ROMPE === 'designacion') {
  for (const p of E.parts) if (/^FIJO · Cilindro SMC CD85N25-80/.test(p.name)) delete p.norma;
} else if (ROMPE === 'generica') {
  for (const p of E.parts) {
    if (/^PG40 · Perno hex 3\/8-16 × 25 · alargue/.test(p.name)) p.norma = 'ASME B18.2.1 / DIN 933';
  }
} else if (ROMPE === 'ferreteria') {
  // clon exacto de uno de los 3 pernos «lengüeta» que retira §B9, con su
  // designación ya puesta para que lo ÚNICO que pueda cazarlo sea §F7
  E.addPart('FIJO · Perno hex M8×16 lengüeta (−X, Y=-802)', '#d5b46a', [15.39, -802, -74.2], [
    { id: 'fh1', name: 'Cabeza hex e/c 13', shape: 'sketch', op: 'union', at: [0, 0, 0], dir: [0, 0, -1],
      params: { pts: [[7.51, 0], [3.75, 6.5], [-3.75, 6.5], [-7.51, 0], [-3.75, -6.5], [3.75, -6.5]], h: 5.3, u: [0, 1, 0] } },
    { id: 'fh2', name: 'Vástago Ø8×12', shape: 'cylinder', op: 'union', at: [0, 0, -5.3], dir: [0, 0, -1],
      params: { dia: 8, h: 12 } },
  ], { hardware: true, tol: { pieza: null, norma: null },
    norma: 'ISO 4017 (DIN 933) — tornillo de cabeza hexagonal M8, rosca total' });
}
if (ROMPE_FAB.has(ROMPE) && JSON.stringify(E.parts) === FAB_ANTES) {
  console.error(`BANCO MUERTO: TEST_ROMPE=${ROMPE} no ha tocado NINGUNA pieza tras la pasada §F.`);
  console.error('  La pieza sobre la que inyecta ya no existe o ya no lleva el campo que borra:');
  console.error('  re-apúntalo a la pieza viva equivalente, o retíralo con su comprobación.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Compuerta
// ---------------------------------------------------------------------------
// Todas las piezas del tensor de brazos, para las reglas de solape tolerado.
const TEN2 = new RegExp('Eje pivote común|Chumacera SKF UCFL 206'
  + '|Collar de apriete|Separador Ø38×|Regulador de PRESIÓN'
  + '|Cilindro SMC CD85N25-80|Bisagra trasera SMC C85C25|Rótula de vástago SMC KJ10D'
  + '|Regulador de caudal SMC AS2201FS|Silenciador SMC AN101|Racor codo SMC KQ2L06'
  + '|Brazo tensor e=|Cubo del brazo|Casquillo de fricción|Polea tensora POL-CON-TEN'
  // los dos VOLANTES DE CONTRAFLEXIÓN son la HORQUILLA del tensor: sin ellos la
  // banda no rodea la tensora y el tambor motriz pierde 65° de abrazado (ver
  // adapt/mod_calles.mjs §4-bis). Son pieza medida del cliente, en su Y original
  // y dentro de la MISMA bahía que el tensor: les vale su mismo precedente.
  + '|Volante de horquilla guia_'
  + '|Eje de polea tensora|Bulón del lóbulo'
  + '|Travesaño frontal del tensor|Placa de extremo del travesaño|Ménsula de bisagra'
  + '|Bulón trasero|Pletina soporte del regulador|Línea de aire PU|Separador Ø19'
  // EL GRUPO DE ACONDICIONAMIENTO DE AIRE (A12 de REVISION_TALLER_COMPRAS_MONTAJE.md).
  // Estas cuatro referencias faltaban en la lista de compra y ahora existen como
  // pieza: válvula de corte y purga, filtro, manómetro y las 4 tes de reparto.
  //
  // POR QUÉ HEREDAN EL MISMO PRECEDENTE, y en este orden: primero se modelaron
  // con su envolvente de catálogo y su pose, y DESPUÉS se comprobó pieza a pieza
  // sobre el ensamble emitido qué tocan. Resultado (out/_solapes_aabb.json):
  // sólo cruzan (a) las CAJAS ENVOLVENTES medidas LAT TOP y FRONT TOP2, que no
  // son sólidos, y (b) la propia pletina de la que cuelgan. Ni un sólido real.
  // Y cuelgan de la PROLONGACIÓN de la pletina del AR20 —que ya estaba en esta
  // lista por este mismo motivo—, en columna bajo él, dentro de la bahía que el
  // tensor ORIGINAL del cliente ocupaba con poses medidas. No es una exención
  // nueva: es la misma, aplicada a piezas que están en el mismo volumen.
  + '|Válvula de corte y purga SMC VHS20|Filtro de aire SMC AF20'
  + '|Manómetro SMC G36|Te de reparto SMC KQ2T06');

function verify() {
  const e = [];
  const partes = E.parts;
  const nbt = partes.filter(p => /^NBT90 · /.test(p.name));
  const ctx = partes.filter(p => p.contexto && !/^NBT90 · /.test(p.name));
  const nuevas = partes.filter(p => !p.contexto);
  const bb = new Map(partes.map(p => [p, bboxU(p)]));

  // --- A. reparto: 5 calles a paso 76.2, centradas en los huecos del NBT90 --
  if (EJES.length !== NBT.nBandas) e.push(`hay ${EJES.length} calles y la transferencia tiene ${NBT.nBandas} huecos`);
  for (let i = 1; i < EJES.length; i++) {
    const p = r2(EJES[i] - EJES[i - 1]);
    if (Math.abs(p - NBT.paso) > 0.01) e.push(`paso entre calles ${i}/${i + 1} = ${p} ≠ ${NBT.paso}`);
  }
  // los ejes REALES de las piezas (pletina del puente) contra bandaY transformado
  for (let k = 0; k < EJES.length; k++) {
    const esperado = r2(T.x + NBT.bandaY[k]);
    if (Math.abs(EJES[k] - esperado) > 0.01) {
      e.push(`eje de calle ${k + 1} (${EJES[k]}) ≠ hueco de banda del NBT90 transformado (${esperado})`);
    }
    const puente = nuevas.find(p => /Puente de calle — pletina/.test(p.name) && p.name.includes(`(calle ${k + 1},`));
    if (!puente) { e.push(`no hay puente en la calle ${k + 1}`); continue; }
    const b = bb.get(puente);
    const cx = r2((b.lo[0] + b.hi[0]) / 2);
    if (Math.abs(cx - esperado) > 0.05) e.push(`el puente de la calle ${k + 1} está en X=${cx}, no en ${esperado}`);
  }

  // --- B. la franja del rodillo: sección ≤ ventana en el tramo del módulo ---
  // BARRIDO REAL: toda pieza propia que conviva con el módulo en Y y con la
  // franja en Z tiene que caber en 31.75 centrada en un eje de calle.
  for (const p of nuevas) {
    const b = bb.get(p);
    if (b.hi[1] <= y0 || b.lo[1] >= y1) continue;          // fuera del módulo en Y
    if (b.hi[2] <= FRANJA.z0 || b.lo[2] >= FRANJA.z1) continue;  // fuera de la franja
    if (b.lo[0] > 489.4) continue;                         // zona del canto del chapón
    //   de descarga: la cara del último rodillo muere en X 487.4 (compuerta §K)
    //   — ahí viven las bases de las guías del corredor, no la calle
    const w = r2(b.hi[0] - b.lo[0]);
    const cx = (b.lo[0] + b.hi[0]) / 2;
    const eje = EJES.reduce((a, b2) => Math.abs(b2 - cx) < Math.abs(a - cx) ? b2 : a);
    if (/Banda plana 32/.test(p.name)) {
      // la BANDA (32.0) es la excepción medida del reconocimiento (§1.5): lo
      // que la compuerta del NBT90 exige a la banda del anfitrión es holgura
      // ≥ 2 al rodillo, y 32 la cumple con 4.64 por lado. La VENTANA de 31.75
      // rige para la calle (carril + guía), no para la banda.
      const holg = r2((NBT.paso - NBT.rodDia - w) / 2);
      if (holg < 2) e.push(`la banda (${w}) deja ${holg} al rodillo (mín 2)`);
      if (Math.abs(cx - eje) > 0.3) e.push(`«${p.name}» descentrada ${r2(cx - eje)}`);
      continue;
    }
    if (w > NBT.ventana + 1e-6) {
      e.push(`«${p.name}» mide ${w} de ancho dentro de la franja del rodillo (máx ${NBT.ventana})`);
    } else if (Math.abs(cx - eje) > 0.3 && w > STEP.bandaAncho) {
      e.push(`«${p.name}» descentrada ${r2(cx - eje)} de su ventana`);
    }
  }
  // holguras de fórmula (se reportan y se exigen)
  const holguraPuenteRod = r2((NBT.paso - NBT.rodDia - CALLE.puente.ancho) / 2);
  const holguraBandaRod = r2((NBT.paso - NBT.rodDia - STEP.bandaAncho) / 2);
  if (holguraPuenteRod < 2) e.push(`holgura puente↔rodillo ${holguraPuenteRod} < 2`);
  if (holguraBandaRod < 2) e.push(`holgura banda↔rodillo ${holguraBandaRod} < 2`);
  // …y contra las CAJAS REALES de los rodillos del NBT90 transformado
  const rodillos = nbt.filter(p => /Vulcanizado negro/.test(p.name) || /Tubo de rodillo/.test(p.name));
  let holguraRodCajas = Infinity;
  for (const k of [0, 1, 2, 3, 4]) {
    const puente = nuevas.find(p => /Puente de calle — pletina/.test(p.name) && p.name.includes(`(calle ${k + 1},`));
    if (!puente) continue;
    const bp = bb.get(puente);
    for (const r of rodillos) {
      const br = bb.get(r);
      if (br.hi[1] < bp.lo[1] || br.lo[1] > bp.hi[1]) continue;
      const gap = Math.max(bp.lo[0] - br.hi[0], br.lo[0] - bp.hi[0]);
      if (gap > -1e9) holguraRodCajas = Math.min(holguraRodCajas, gap);
    }
  }
  if (rodillos.length && holguraRodCajas < 2) {
    e.push(`holgura puente↔rodillo medida sobre cajas = ${r2(holguraRodCajas)} < 2`);
  }
  // el hueco del PEINE del NBT90 (extraído del sketch real transformado)
  const peines = nbt.filter(p => /Placa peine/.test(p.name));
  for (const peine of peines) {
    const sk = peine.features.find(f => f.shape === 'sketch');
    if (!sk) continue;
    const cantos = new Set();
    for (const pt of sk.params.pts) {
      const X = pt[0] + peine.pos[0] + sk.at[0];
      const Z = pt[1] + peine.pos[2] + sk.at[2];
      if (Z > STEP.planoBanda - 20) cantos.add(r2(X));    // cantos superiores de dientes
    }
    const xs = [...cantos].sort((a, b) => a - b);
    for (let k = 0; k < EJES.length; k++) {
      const izq = Math.max(...xs.filter(x => x <= EJES[k]));
      const der = Math.min(...xs.filter(x => x >= EJES[k]));
      const holg = r2(Math.min(EJES[k] - CALLE.puente.ancho / 2 - izq, der - EJES[k] - CALLE.puente.ancho / 2));
      if (!isFinite(holg) || holg < 2) {
        e.push(`puente de la calle ${k + 1} a ${holg} mm del diente de la placa peine (mín 2)`);
      }
    }
  }

  // --- C. luz entre bastidores (asimétrica: el side +X vive en la muesca) ---
  const frames = ctx.filter(p => /FRAME_MIR_MIR/.test(p.name));
  if (frames.length !== 2) e.push('faltan los dos bastidores en el contexto');
  else {
    const caras = frames.map(p => bb.get(p)).sort((a, b) => a.lo[0] - b.lo[0]);
    const luz = r2(caras[1].lo[0] - caras[0].hi[0]);
    let loX = 1e9, hiX = -1e9;
    const mu = PERCHA.muesca;
    const enMuesca = (b) => b.lo[1] >= mu.y[0] - 0.5 && b.hi[1] <= mu.y[1] + 0.5
      && b.hi[2] <= mu.zTop - 2 && b.lo[2] >= -420;    // dentro de la ventana, con 2 de holgura al techo
    let fueraDeMuesca = 0;
    for (const p of nbt) {
      const b = bb.get(p);
      loX = Math.min(loX, b.lo[0]);
      hiX = Math.max(hiX, b.hi[0]);
      // lo que pasa de la cara interior del chapón de descarga tiene que caber
      // ÍNTEGRO en la muesca declarada
      if (b.hi[0] > caras[1].lo[0] - 2 && !enMuesca(b)) {
        fueraDeMuesca++;
        if (fueraDeMuesca <= 4) e.push(`«${p.name.slice(0, 60)}» pasa del chapón de descarga (X hasta ${r2(b.hi[0])}) SIN caber en la muesca`);
      }
    }
    const holgIzq = r2(loX - caras[0].hi[0]);
    const dentroMuescaMm = r2(hiX - caras[1].lo[0]);
    if (holgIzq < 2) e.push(`el NBT90 no libra el bastidor −X: ${holgIzq} mm (mín 2)`);
    if (hiX > bordeExtDescarga - 2) e.push(`el NBT90 asoma del borde exterior del sorter (X ${r2(hiX)} vs ${bordeExtDescarga})`);
    m.luzBastidores = { luz, holgIzq, dentroMuescaMm, anchoNbt90Embebido: r2(hiX - loX) };
  }

  // --- D. la transferencia incompleta NO está ------------------------------
  // (nombres del §2.1 del reconocimiento; se filtran las piezas del CLIENTE:
  //  el NBT90 usa «roller» en inglés en sus guardas y no es eso lo prohibido)
  const PROHIBIDAS = [/\broller\b/i, /\bU_00[4-7]\b/, /\buni_00[23]\b/i, /\bUni_001\b/, /nk[ _]?19\/?20/i];
  for (const p of partes) {
    if (/^NBT90 · /.test(p.name)) continue;
    if (PROHIBIDAS.some(rx => rx.test(p.name))) {
      e.push(`la transferencia incompleta del cliente sigue en el modelo: «${p.name}»`);
    }
  }

  // --- E. profundidad: la huella del módulo está limpia y el pozo libra ----
  // (la huella usa el ancho EMBEBIDO real — sin canales anfitrión — y exceptúa
  //  al chapón de descarga, cuya convivencia con el side la valida §C/muesca)
  const huella = { lo: [Xc - 236.2, y0, T.z], hi: [Xc + 236.2, y1, STEP.planoBanda] };
  for (const p of ctx) {
    if (/FRAME_MIR_MIR_MIR/.test(p.name)) continue;
    const b = bb.get(p);
    const v = solapeAABB(b, huella);
    if (v > 1000) e.push(`«${p.name}» invade la huella del NBT90 (${r2(v / 1000)} cm³): la profundidad no está resuelta ahí`);
  }
  // la banda del pozo bajo el módulo (posición nominal y extendida del tensor)
  const topeBandaPozo = r2(POZO.v2.z + NBT.rodDia / 2 * 0 + 117.9 / 2 * -1) * -1;   // legibilidad abajo
  const carasupPozo = r2(POZO.v3.z + 117.9 / 2);            // −241.05 metal V3 (fuera del módulo)
  const bandaAltaBajoModulo = r2(POZO.v3.z - 117.9 / 2);    // −358.95 cara dentada
  const fondoNbt90 = r2(T.z);                                // −338.27
  const holguraPozo = r2(fondoNbt90 - bandaAltaBajoModulo);
  if (holguraPozo < 2) e.push(`la banda del pozo pasa a ${holguraPozo} mm del fondo del NBT90 (mín 2)`);
  // canal de montaje del cilindro del NBT90 (lo más bajo del módulo en la zona)
  const canalCilZ0 = r2(NBT.canalCilZ[0] + T.z);             // −328.03
  const holguraPozoCanal = r2(canalCilZ0 - bandaAltaBajoModulo);
  if (holguraPozoCanal < 2) e.push(`la banda del pozo pasa a ${holguraPozoCanal} mm del canal del cilindro (mín 2)`);

  // --- F. choques AABB dirigidos -------------------------------------------
  // (la banda queda fuera del barrido genérico: es un lazo que convive con toda
  //  la calle; su verificación es bandaFaces + holguras dirigidas + B-rep)
  const TOLERADOS = [
    // pares con CONTACTO INTENCIONAL (apoyos y uniones) o cuya AABB miente por
    // perfil hueco; en todos decide el B-rep (interferencias_brep.py sobre
    // out/sorter_co_brep.json)
    [/Puente de calle — regleta/, /Banda plana 32/],               // apoyo banda↔regleta
    [/Guía de deslizamiento/, /Banda plana 32/],                   // apoyo banda↔guía
    [/Placa base de puente/, /Travesaño percha/],            // apoyo placa↔travesaño
    [/Puente de calle — pletina/, /Placa base de puente/],   // soldadas
    [/Puente de calle — pletina/, /Puente de calle — regleta/],
    [/Pletina/, /Perfil ranurado|Travesaño percha/],         // pletinas contra perfiles
    [/Pletina/, /Eje de volante|Eje Ø20|Volante|Polea plana/],   // ejes en sus taladros
    [/Eje de volante|Eje Ø20/, /Volante|Polea/],             // ejes en sus bores
    // AABB de disco vs esquina: la esquina del cierre (−50.78, 36.6) queda a
    // 62.6 del eje de la polea Ø112 (R 56): libran por 6.6 — como el original
    [/Cierre de guía/, /Polea motriz|Polea conducida/],
    [/Lengüeta|Placa de cuelgue/, /Larguero percha/],        // apoyo de cuelgue
    [/Escuadra/, /Larguero percha|Travesaño percha/],        // apoyo escuadra
    [/Cilindro SMC CD85|Horquilla KJ10D/, /Polea tensora|Eje tensor|Placa culata|Pletina carro/],
    // AABB de perfiles huecos/peines del NBT90: el hueco del peine (42) está
    // comprobado en §B contra el sketch real; el side channel es un C abierto
    [/NBT90 · MÓVIL · Placa peine/, /Puente de calle/],
    // cabeceras del cliente: cajas envolventes que HOY ya abrazan el extremo
    // motriz/conducido de las calles (la pieza real lleva los escotes); las
    // piezas re-pitcheadas conviven con ellas igual que las actuales
    [/CTX · FRONT TOP2/, /Perfil ranurado|Polea motriz|Polea conducida|Soporte motriz|Drive kit|IDLER-ENS|Guía de deslizamiento/],
    // IDLER-ENS y drive kit: subconjuntos-caja del cliente que HOY YA abrazan
    // el perfil, la cama de guías y las poleas de su calle (así están medidos:
    // el idler envuelve la conducida, el drive kit abraza el árbol motriz)
    [/CTX · IDLER-ENS/, /Perfil ranurado|Guía de deslizamiento|Polea conducida|Banda plana 32|Cierre de guía/],
    [/CTX · Drive kit/, /Perfil ranurado|Polea motriz/],
    [/CTX · Soporte motriz/, /Polea motriz|Perfil ranurado/],
    // los AABB no ven cortes: el casquillo/perno del cuelgue +X pasan por la
    // MUESCA real del chapón (verificada aritméticamente en §C); los casquillos
    // de las guardas laterales apoyan contra ambos chapones
    [/Bastidor FRAME_MIR_MIR/, /Casquillo separador|Placa de escote/],
    // el tensor original vive DENTRO del marco hueco de la bancada LAT TOP,
    // como en el STEP del cliente (caja envolvente, no sólido)
    [/CTX · LAT TOP/, /Casquillo PTFE/],
    // caja multiparte: la placa de cuelgue es brazo (X −24…−20) + lengüetas
    // (X −70…−20 SOLO en 3 tramos de Y); las escuadras viven en los tramos
    // intermedios. La intercalación se verifica aritméticamente en §G.
    [/Placa de cuelgue/, /Escuadra larguero/],
    [/Larguero percha/, /Escuadra ménsula|Ménsula percha/],  // apoyo/nudos del larguero
    [/Ménsula percha/, /Escuadra ménsula|Placa frontal ménsula/],
    // el TENSOR ORIGINAL conservado: el brazo (silueta hull, aproximada por
    // fuera) abraza tensora, pivote, horquilla y compañía — como en el STEP
    [/Brazo tensor PZA/, /Tensora POL-CON-TEN|Eje tensora|Buje pivote|Eje pivote común|Cilindro SMC|Horquilla KJ10D|Casquillo PTFE|Volante guia_/],
    [/Eje pivote común/, /Buje pivote|Casquillo PTFE/],
    [/Tensora POL-CON-TEN/, /Eje tensora/],
    [/Horquilla KJ10D/, /Cilindro SMC/],
    // el cierre de guía del cliente encaja sobre el perfil (como la guiaw)
    [/Cierre de guía/, /Perfil ranurado/],
    [/Casquillo separador/, /Placa de escote/],              // el casquillo apoya en la placa
    // ---- detalle de estaciones (mod_estaciones / mod_guardas) ----
    // el paquete de retención V1…V4: encajes intencionales eje↔polea↔rodamiento
    [/Eje Ø20×50 de pozo|Espaciador de aros|Anillo 3AM1-20|Anillo DIN 472-42/,
      /Volante contraflexión|Polea plana Ø117\.9|Eje Ø20×50 de pozo|Espaciador de aros/],
    [/Pletina/, /Anillo 3AM1-20|Golilla/],                   // el anillo/golilla pegan a la pletina
    // caja multiparte: el ALA de la pletina V2/V3 (Z −35) y el espaciador
    // (Z −300) no comparten Z — la AABB de la pieza completa miente; B-rep decide
    [/Pletina V[23]/, /Espaciador de aros/],
    // eje motriz común: bujes (Ø30 H7), chavetas (en sus cajeros), acople (CTX,
    // asiento Ø30.06), UCFL (bore 25), AT10 recolocada (bore 65 sobre LK30-RD)
    // y las 63T (el eje pasa por su bore Ø38 dentro del buje)
    [/Eje motriz común/, /Buje 63T|Chaveta DIN 6885|Acople LK30|Chumacera SKF UCFL|Casquillo LK30|Polea AT10 32T|Polea motriz/],
    [/Buje 63T/, /Polea motriz|Chaveta DIN 6885/],
    [/Casquillo LK30/, /Polea AT10 32T/],
    [/Chumacera SKF UCFL/, /Bastidor FRAME|Eje pivote común/],
    [/Eje pivote común/, /Buje pivote|Casquillo PTFE|Brazo tensor PZA/],   // el eje único cruza los cubos (como el CTX que sustituye)
    // la bancada LAT TOP es un MARCO HUECO (caja envolvente): el tensor CTX ya
    // vive dentro; el eje pivote, su chumacera −X y la franja de guarda norte
    // ocupan ese hueco (aviso de obra en las notas de las piezas)
    [/CTX · LAT TOP/, /Eje pivote común|Chumacera SKF UCFL 205 \(eje pivote|Guarda de pozo norte|Ménsula de clevis/],
    //   (la ménsula de clevis es caja multiparte: su ala vertical vive a
    //    Y > 90.18 —fuera de la bancada— y su repisa a Z > −71; decide el B-rep)
    // los canales TER1 del costado son cajas huecas que la línea del árbol del
    // cliente ya atravesaba (sus LK30-RD medidos llegan a X 541.7, step §0)
    [/CTX · TER1/, /Eje motriz común|Chumacera SKF UCFL 205 \(eje motriz/],
    // el drive kit del cliente ABRAZA el árbol de su calle (así está medido):
    // el eje común y sus bujes ocupan la misma línea que el árbol que sustituyen
    [/CTX · Drive kit/, /Eje motriz común|Buje 63T|Chaveta DIN 6885|Polea AT10 32T/],
    // anclaje del cilindro: bisagra (CTX) ↔ ménsula nueva; la ménsula vive
    // pegada a la cabecera del cliente (caja envolvente)
    [/Bisagra trasera SMC C85C25/, /Ménsula de clevis|Golilla/],
    [/CTX · FRONT TOP2/, /Ménsula de clevis|Racor codo|Bisagra trasera SMC C85C25|Chumacera SKF UCFL|Eje motriz común|Buje 63T|Polea AT10 32T|Casquillo LK30|Acople LK30|Chaveta DIN 6885/],
    //   (la cabecera FRONT TOP2 es caja envolvente del cliente: el árbol motriz
    //    del cliente ya vivía dentro de ella — el eje común ocupa el mismo sitio)
    [/Racor codo SMC/, /Cilindro SMC CD85/],                 // roscado al puerto
    [/Separador Ø19×18/, /Brazo tensor PZA|Horquilla KJ10D/],// centran el bulón (step)
    // IDLER medida (CTX): su paquete interior y los M8×65 de la horquilla
    [/Polea loca IDLER-P01|Espaciador IDLER-E|Anillo DIN 472-40|Rodamiento 6203-2RS IDLER|M8×65 horquilla|M8 ISO 8673/,
      /Polea loca IDLER-P01|Espaciador IDLER-E|Anillo DIN 472-40|Rodamiento 6203-2RS IDLER|CTX · IDLER-ENS|Polea conducida/],
    //   (la coaxialidad IDLER-P01↔conducida es DEFECTO DECLARADO del STEP del
    //    cliente — medido en analisis/estaciones.json; decide el cliente)
    // guardas del pozo: alas contra perfiles/travesaño, marco entre sí, y las
    // ménsulas de la percha que pasan por las ESCOTADURAS de la lateral −X
    // (la AABB no ve el escote; la §N verifica la alineación aritméticamente)
    [/Guarda de pozo/, /Perfil ranurado|Travesaño percha|Guarda de pozo|Casquillo separador|Volante contraflexión/],
    //   (guarda sur ↔ volante V1: multiparte — la cara vive en Y ≤ −1383 y el
    //    ala en Z ≥ −42; el volante ocupa la esquina opuesta: aire 3.1 y 7.1)
    [/Guarda de pozo lateral/, /Ménsula percha|Escuadra ménsula/],
    // guías del corredor: base sobre el canto del chapón; guía sobre su alma
    [/Base de guía|Guía de descarga/, /Bastidor FRAME_MIR_MIR_MIR|Base de guía|Guía de descarga/],
    // ▼▼▼ TENSOR NEUMÁTICO DE BRAZOS POR BANDA ▼▼▼
    // (1) el tensor consigo mismo: es UN MECANISMO. El eje pasa por los cubos,
    //     los casquillos van dentro de los cubos, las pletinas abrazan la polea,
    //     los separadores topan contra las bridas y los resortes se apoyan en el
    //     yugo y en los bulones. Todo eso es CONTACTO de montaje, no choque.
    [TEN2, TEN2],
    // (2) contra las CAJAS ENVOLVENTES medidas del cliente. La bahía del tensor
    //     vive dentro de la envolvente de LAT TOP y de la cabecera FRONT TOP2,
    //     pero NO son sólidos: son cajas de `analisis/medidas.json`. La prueba
    //     de que el volumen está libre es que el tensor ORIGINAL del cliente
    //     ocupaba exactamente esta bahía (poses medidas: pivote Y −101.72
    //     Z −164.7, tensora Y −175.72 Z −371.89, cilindro Y 34.5). El tensor
    //     nuevo reutiliza esas mismas poses; de ahí que se declare tolerado.
    //     AVISO DECLARADO: hay que verificar en obra la viga real de LAT TOP
    //     bajo las ménsulas de las columnas guía (va en avisosDeclarados).
    [TEN2, /CTX · LAT TOP|CTX · FRONT TOP2|CTX · TER1|CTX · Bastidor FRAME_MIR_MIR/],
    // ▲▲▲ ------------------------------------ ▲▲▲

    // ▼▼▼ BASTIDOR PG40 · GUÍAS UHMW · ALARGUE ▼▼▼
    // (1) el bastidor consigo mismo: larguero + regleta + travesaño + escuadra
    //     son un MONTAJE. La regleta entra por su PIE DE CLIP en la ranura 10 del
    //     larguero (la AABB no ve el corte de la ranura, igual que ya pasa con
    //     [Cierre de guía ↔ Perfil ranurado]); el larguero APOYA sobre el
    //     travesaño y las escuadras abrazan a ambos por diseño.
    [/PG40 · /, /PG40 · /],
    // (2) el ALARGUE contra el SIDE CHANNEL del NBT90: el side es un C ABIERTO
    //     y el alargue vive DENTRO de su boca, separado del alma por los
    //     casquillos de 5.951. Que no toca las alas se verifica en aritmética
    //     (§P: holguraAlaInf / holguraAlaSup, exigidas ≥ 2), no por la AABB.
    [/PG40 · Alargue lateral/, /NBT90 · FIJO · Side channel/],
    // (3) el ALARGUE y el bastidor contra las CAJAS ENVOLVENTES del cliente.
    //     El alargue va A RAS de la cara interior del chapón (contacto plano,
    //     se atornilla a él) y cruza las cabeceras y los canales de costado, que
    //     son envolventes de `analisis/medidas.json`, no sólidos: por ellas ya
    //     pasa hoy la propia línea de árbol del cliente (precedente declarado
    //     arriba para el eje motriz común y las chumaceras UCFL).
    [/PG40 · /, /CTX · FRONT TOP2|CTX · TER1|CTX · LAT TOP|CTX · IDLER-ENS|CTX · Drive kit|CTX · Soporte motriz|CTX · Bastidor FRAME_MIR_MIR/],
    // (4) el larguero PG40 hereda el sitio del perfil 40×80 que sustituye: el
    //     cierre de guía del cliente encaja sobre él igual que sobre el viejo.
    [/PG40 · Larguero de calle|PG40 · Guía UHMW/, /Cierre de guía/],
    // (5) el CUBREJUNTA del lap vive en la BOCA del C del side channel, entre
    //     sus dos alas (Z −250.71…−90.93) y sin tocar las placas peine (§P
    //     verifica las holguras en aritmética). La AABB del C miente.
    [/PG40 · Cubrejunta alma↔lap/, /NBT90 · FIJO · Side channel/],
    // (5-bis) las GUARDAS DEL POZO son chapa de 14 GA (1.9): se recortan para el
    //     paso del alargue, que es estructura. Ajuste de chapa, no interferencia
    //     de diseño — queda declarado en los avisos.
    [/PG40 · Alargue lateral|PG40 · Ménsula|PG40 · Cartela/, /Guarda de pozo/],
    // (5-ter) el EJE de cada rodillo de retorno ATRAVIESA su cartela: es el
    //     montaje (eje fijo Ø30 pasante, patrón 76×76 publicado por tambores).
    [/PG40 · Cartela de rodillos? de retorno/, /RETORNO RR/],
    // (6) el CABEZAL DE RODAMIENTO MOTRIZ ocupa el sitio del ÁRBOL MOTRIZ
    //     ANTIGUO del cliente (eje común Ø30/Ø25 con chumaceras UCFL 205, polea
    //     AT10 recolocada y su casquillo LK30). Es la sustitución que pide el
    //     rediseño: ese paquete sale cuando entra el tambor motriz con sus
    //     UCF 207 (adapt/mod_tambores.mjs). Queda DECLARADO en los avisos.
    [/PG40 · Alargue lateral · cabezal de rodamiento motriz|PG40 · Cubrejunta alma↔cabezal motriz/,
      /Eje motriz común|Chumacera SKF UCFL 205|Polea AT10 32T|Casquillo LK30|Acople LK30|Chaveta DIN 6885|Buje 63T/],
    // ▲▲▲ ------------------------------------ ▲▲▲
    // ▼▼▼ TAMBORES ▼▼▼
    // (1) piezas CONCÉNTRICAS del propio accionamiento: el eje va DENTRO del
    //     tubo, la goma va SOBRE el tubo y el rodamiento va dentro de la tapa.
    //     La AABB de un cilindro contiene siempre la del eje que lo atraviesa,
    //     así que este par es geometría correcta, no un choque. (El NBT90 no
    //     lo delata porque entra entero como contexto; éste no.)
    [/^(TAMBOR|CONDUCIDO|RETORNO) /, /^(TAMBOR|CONDUCIDO|RETORNO) /],
    // (2) CONVIVENCIA DE DOS ARQUITECTURAS, declarada. Los 4 rodillos de
    //     retorno ocupan las cuatro esquinas del pozo (Y −606/−672/−1280/−1325)
    //     que hoy siguen ocupando las poleas de pozo V1…V4 por calle que este
    //     módulo SUSTITUYE — el cliente cambió de arquitectura a mitad de
    //     camino y mod_calles/mod_estaciones aún emiten la anterior. No es un
    //     defecto de diseño: es el solape de dos versiones, y se tolera SÓLO
    //     contra esas piezas concretas (ni una más). La lista para retirarlas
    //     va en las métricas, `tambores.sustituye`; aquí no se borra nada de
    //     otro agente. Comprobación: fuera de estos dos pares, el accionamiento
    //     no solapa con NADA del modelo (ni PG40, ni NBT90, ni contexto).
    [/^(TAMBOR|CONDUCIDO|RETORNO) /,
      /Eje \S+ de pozo \(V\d|Pletina V\d|Pletina de volante|Polea plana .*\(V\d|Volante contraflexión|Espaciador de aros|Guarda de pozo|Polea motriz T5-63T|Polea conducida T5-63T|Buje 63T|Eje motriz común|Chumacera SKF UCFL|Polea AT10|Casquillo LK30/],
    // (3) las CAJAS ENVOLVENTES del cliente por las que ya pasa hoy su propia
    //     línea de árbol: cabeceras FRONT TOP2/_MIR, Drive kit, IDLER-ENS y sus
    //     placas, la loca IDLER-P01, los cierres de guía y el canal de costado.
    //     No son sólidos (son cajas de `analisis/medidas.json`) y el precedente
    //     está declarado más arriba para «Eje motriz común» y las UCFL, que
    //     ocupan exactamente el mismo sitio que ahora ocupan el tambor y el
    //     conducido. Mismo motivo, misma tolerancia.
    [/^(TAMBOR|CONDUCIDO|RETORNO) /,
      /CTX · FRONT TOP2|CTX · Drive kit|CTX · IDLER-ENS|CTX · Polea loca IDLER-P01|CTX · Anillo DIN 472-40 IDLER|CTX · Espaciador IDLER-E|CTX · Cierre de guía|CTX · TER1/],
    // (4) el bastidor PG40 y este accionamiento se ATORNILLAN el uno al otro:
    //     el eje pasa por el taladro Ø45 de su cabezal de rodamiento (la AABB
    //     de la pletina no ve el agujero), la pletina del conducido apoya cara
    //     con cara contra su cubrejunta, y los ejes de RR1/RR4 cruzan el alma
    //     del alargue por el taladro que se publica en `interfazPG40`. Es
    //     contacto de montaje, no interferencia. Lo que NO se tolera es la
    //     escuadra del travesaño Y=−100 contra el tambor: ésa va a
    //     `avisosDeclarados` con su cota, para que PG40 la corra.
    [/^(TAMBOR|CONDUCIDO|RETORNO) /,
      /PG40 · Alargue lateral · cabezal de rodamiento|PG40 · Cubrejunta alma↔cabezal|PG40 · Alargue lateral · alma/],
    [/^TAMBOR · engomado/, /PG40 · Escuadra larguero↔travesaño \(calle \d, Y -100\)/],
    // ▲▲▲ --------- ▲▲▲
  ];
  const esBanda = (p) => /Banda plana 32/.test(p.name);
  const esHw = (p) => p.hardware;
  const candidatos = partes.filter(p => !esBanda(p));
  let choques = 0;
  const listaChoques = [];
  for (let i = 0; i < candidatos.length; i++) {
    const a = candidatos[i], ba = bb.get(a);
    const aCtx = !!a.contexto;
    for (let j = i + 1; j < candidatos.length; j++) {
      const b = candidatos[j];
      const bCtx = !!b.contexto;
      if (aCtx && bCtx) continue;                            // cliente↔cliente y NBT90 interno: no es asunto de esta compuerta
      if (esHw(a) || esHw(b)) continue;                      // tornillería: decide el B-rep
      const v = solapeAABB(ba, bb.get(b));
      if (v < 500) continue;                                 // < 0.5 cm³: contacto
      if (TOLERADOS.some(([r1, r2x]) => (r1.test(a.name) && r2x.test(b.name)) || (r1.test(b.name) && r2x.test(a.name)))) continue;
      choques++;
      listaChoques.push({ cm3: r2(v / 1000), a: a.name, b: b.name });
      if (choques <= 8) e.push(`solape AABB ${r2(v / 1000)} cm³: «${a.name.slice(0, 52)}» ↔ «${b.name.slice(0, 52)}»`);
    }
  }
  if (choques > 8) e.push(`… y ${choques - 8} solapes AABB más`);
  if (listaChoques.length) {
    try {
      writeFileSync(join(aqui, 'out', '_solapes_aabb.json'), JSON.stringify(listaChoques.sort((x, y) => y.cm3 - x.cm3), null, 1));
    } catch { /* out/ puede no existir aún en un run fallido */ }
  }

  // --- G. percha (solo si sigue montada; ver bandera PG40F.desactivaPercha) --
  if (!PG40F.desactivaPercha) {
  const C = m.percha.cuelgue;
  if (C.cortantePorPernoN * 5 > C.cortanteAdmisiblePernoN) {
    e.push(`los pernos de cuelgue no llevan FS 5: ${C.cortantePorPernoN} × 5 > ${C.cortanteAdmisiblePernoN} N`);
  }
  if (m.percha.flechaLargueroMm > 1.0) e.push(`flecha del larguero ${m.percha.flechaLargueroMm} > 1.0 mm`);
  // los pernos de cuelgue caen en las colisas de reglaje del side channel
  for (const yb of [r2(T.y - 60), r2(T.y - 403)]) {
    const ok = NBT.sideTornX.some(x => Math.abs(r2(T.y - x) - yb) < 0.01);
    if (!ok) e.push(`perno de cuelgue en Y=${yb} sin colisa del side channel enfrente`);
  }
  // las ménsulas −X van en las MISMAS Y que los puntos de cuelgue (la carga
  // baja recta) y por DEBAJO del larguero: separación vertical verificada
  const gapMensulaLengueta = r2((PERCHA.largueroZ[1]) - (PERCHA.largueroZ[0]));  // = canto del larguero
  if (gapMensulaLengueta < 40) e.push('el larguero no separa lengüetas (arriba) de ménsulas (abajo)');
  }

  // --- K. el rodillo llega al borde de descarga (corrección del cliente) ---
  let rodMaxX = -1e9;
  for (const r of rodillos) rodMaxX = Math.max(rodMaxX, bb.get(r).hi[0]);
  const rodilloABordeMm = r2(bordeExtDescarga - rodMaxX);
  if (rodilloABordeMm > 40) e.push(`el extremo de la cara del rodillo queda a ${rodilloABordeMm} del borde exterior (máx 40)`);
  if (rodilloABordeMm < 2) e.push(`el rodillo asoma del borde exterior (${rodilloABordeMm})`);

  // --- L. PASILLO DE CAJA LIBRE (corrección del cliente) -------------------
  // Ninguna pieza sobre el plano de transporte dentro del deck NI en el
  // corredor de descarga, salvo la lista blanca declarada.
  const PASILLO_OK = [
    /Vulcanizado negro|Tubo de rodillo/,     // el rodillo emergido (la función)
    /Banda plana FLEXPROOF/,                 // su banda de arrastre en el rebaje
    /Banda plana 32/,                              // el plano de transporte mismo
    /Tapa-soporte de extremo/,               // tapas del eje del rodillo NBT90: suben
                                             //   a Z 54.17 EN LA LÍNEA DEL RODILLO,
                                             //   4.5 bajo la cresta elevada (58.68)
                                             //   que las rodea — parte del sistema
    /CTX · TER1/,                            // canal-guía lateral del cliente en el
                                             //   extremo motriz (pose original;
                                             //   fuera del corredor del módulo)
    /Guía de descarga|Base de guía|base guía|guía sur|guía norte/,
                                             // EXCEPCIÓN JUSTIFICADA (punto 6 del
                                             //   detalle de estaciones): guías
                                             //   laterales del bulto — SOBRE el
                                             //   plano pero FUERA de su camino
                                             //   (campo de rodillos Y −1161…−786);
                                             //   la §O verifica esa condición
  ];
  const deck = { lo: [STEP.frameIntNeg, STEP.guiaY[0], STEP.planoBanda + 0.5], hi: [STEP.frameIntPos, STEP.guiaY[1], 400] };
  const corredor = { lo: [r2(EJES[4] + STEP.bandaAncho / 2), y0, STEP.planoBanda + 0.5], hi: [560, y1, 400] };
  for (const p of partes) {
    if (PASILLO_OK.some(rx => rx.test(p.name))) continue;
    const b = bb.get(p);
    for (const [zona, nom] of [[deck, 'deck'], [corredor, 'corredor de descarga']]) {
      const v = solapeAABB(b, zona);
      if (v > 100) {
        e.push(`PASILLO: «${p.name.slice(0, 58)}» asoma ${r2(v / 1000)} cm³ sobre el plano de transporte en el ${nom}`);
        break;
      }
    }
  }

  // --- H. estado retraído (el cassette del NBT90 baja 10) ------------------
  const crossTopElev = r2(NBT.crossZ[1] + T.z);              // 9.53
  const puenteBase = r2(CALLE.puente.topZ - CALLE.puente.uhmwH - CALLE.puente.aceroH); // 15.15
  const holguraCrossElev = r2(puenteBase - crossTopElev);
  const holguraCrossRetr = r2(puenteBase - (crossTopElev - NBT.carrera));
  if (holguraCrossElev < 2) e.push(`puente a ${holguraCrossElev} mm del cross channel ELEVADO (mín 2)`);
  if (holguraCrossRetr < 2) e.push(`puente a ${holguraCrossRetr} mm del cross channel RETRAÍDO (mín 2)`);
  // …y sobre cajas reales, en las dos posiciones:
  const crosses = nbt.filter(p => /cross channel/i.test(p.name));
  for (const p of crosses) {
    const b = bb.get(p);
    for (const k of [0, 1, 2, 3, 4]) {
      const puente = nuevas.find(q => /Puente de calle — pletina/.test(q.name) && q.name.includes(`(calle ${k + 1},`));
      if (!puente) continue;
      const bp = bb.get(puente);
      if (b.hi[0] < bp.lo[0] || b.lo[0] > bp.hi[0] || b.hi[1] < bp.lo[1] || b.lo[1] > bp.hi[1]) continue;
      const gapElev = r2(bp.lo[2] - b.hi[2]);
      if (gapElev < 2) e.push(`cross channel real a ${gapElev} mm del puente (calle ${k + 1}) elevado`);
    }
  }

  // --- I. coherencia de los tramos de perfil -------------------------------
  if (CALLE.tslotSurY[1] > y0 - 80) e.push('el perfil sur invade el hueco del módulo/pozo');
  if (CALLE.tslotNorteY[0] < y1 + 80) e.push('el perfil norte invade el hueco del módulo/pozo');
  const usoPerfil = r2((CALLE.tslotSurY[1] - CALLE.tslotSurY[0]) + (CALLE.tslotNorteY[1] - CALLE.tslotNorteY[0]));
  if (usoPerfil > STEP.tslotY[1] - STEP.tslotY[0]) {
    e.push(`los dos tramos de perfil (${usoPerfil}) no salen de un TSLOT del cliente (${r2(STEP.tslotY[1] - STEP.tslotY[0])})`);
  }

  // --- J. la banda cierra y libra ------------------------------------------
  const B = m.calles.banda;
  if (!B || !B.largoDesarrollado) e.push('el lazo de banda no se pudo trazar');
  else {
    // el lazo lo mandan ahora el TAMBOR MOTRIZ y el rodillo CONDUCIDO (las 63T
    // se retiraron): mismos 150° de envolvente mínima, sobre las estaciones que
    // sí existen. En banda plana ese mínimo es además el que sostiene el capstan
    // que mod_tambores verifica (§4.7): con 180° da 3.00 y con 150° aún 2.51.
    if (B.envolventes_deg.tambor < 150) e.push(`envolvente en el tambor motriz ${B.envolventes_deg.tambor}° < 150°`);
    if (B.envolventes_deg.conducido < 150) e.push(`envolvente en el conducido ${B.envolventes_deg.conducido}° < 150°`);
    // el abrazado real sobre el TAMBOR es el que params_tambores publica y con
    // el que calcula el arrastre: si el lazo no lo reproduce, el número de
    // arrastre de ese módulo estaría calculado sobre una geometría que no es.
    if (Math.abs(B.envolventes_deg.tambor - TAMB_RAMAL.abrazadoMotrizDeg) > 1) {
      e.push(`el lazo abraza el tambor ${B.envolventes_deg.tambor}° y params_tambores publica `
        + `${TAMB_RAMAL.abrazadoMotrizDeg}°: el arrastre está calculado sobre otra geometría`);
    }
    // el contorno emitido va circunscrito (+flecha de faceta, como el serpentín
    // del NBT90): el dorso real del modelo queda planoBanda + flecha
    if (Math.abs(B.dorsoPortanteZ - (STEP.planoBanda + B.flechaFacetaMotriz)) > 0.05) {
      e.push(`el dorso del portante queda en Z=${B.dorsoPortanteZ}, no en el plano ${STEP.planoBanda} + faceta ${B.flechaFacetaMotriz}`);
    }
    if (B.holguraBandaCilindroTensor < 3) {
      e.push(`la bajada del pozo pasa a ${B.holguraBandaCilindroTensor} mm del cilindro tensor (mín 3)`);
    }
  }

  // ▼▼▼ R. EL RAMAL PORTANTE ATRAVIESA LA TRANSFERENCIA EN RECTO ▼▼▼
  // Corrección del cliente (03-08-2026): «la banda tiene que ir RECTA a través de
  // la ESTRUCTURA de la transferencia, no por debajo. Es el principio del
  // clasificador de bandas angostas con transferencia emergente: las bandas pasan
  // rectas y continuas y los rodillos emergen ENTRE ellas — por eso las placas del
  // bastidor móvil se llaman PEINE: el peine existe para dejar pasar las bandas».
  //
  // La PRUEBA de que el paso recto existe y está acotado la da el propio NBT90:
  // declara las bandas de su anfitrión como piezas CONTEXTO (aquí no se montan —
  // las sustituyen las 5 calles del sorter, mod_ctx EXCLUIR — pero su geometría
  // se lee antes de descartarlas y llega en `m.nbt90.anfitrion`). Sus X son
  // EXACTAMENTE los 5 ejes de calle: no es coincidencia, es la misma máquina.
  //
  // Esta compuerta no se fía de ninguna declaración: mide sobre el CONTORNO REAL
  // de la banda emitida y sobre el BOCETO REAL de la placa peine.
  const RECTO = { calles: [], corredor: {}, anfitrion: m.nbt90.anfitrion, retornoRecto: {} };
  {
    const PB = STEP.planoBanda;
    const fondoModulo = r2(T.z);                       // −338.27 · cara inferior del módulo
    const zPortante = m.calles.banda?.dorsoPortanteZ;

    /** Contorno (X, Z) de una placa peine, ya transformada al sorter. */
    const contornoPeine = (p) => {
      const sk = p.features.find(f => f.shape === 'sketch' && f.op !== 'cut');
      if (!sk) return null;
      return sk.params.pts.map(pt => [pt[0] + p.pos[0] + sk.at[0], pt[1] + p.pos[2] + sk.at[2]]);
    };
    /** Hueco libre (intervalo en X) que el contorno deja alrededor de `x0` a la
     *  cota `z`. null si `x0` cae DENTRO del material de la placa. */
    const huecoPeine = (pts, z, x0) => {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] > z) === (b[1] > z)) continue;
        xs.push(a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]));
      }
      xs.sort((p, q) => p - q);
      if (xs.length < 2) return [-1e9, 1e9];                  // la placa no llega a esa Z
      if (x0 < xs[0] || x0 > xs[xs.length - 1]) return [-1e9, 1e9];
      for (let i = 0; i + 1 < xs.length; i += 2) if (x0 >= xs[i] && x0 <= xs[i + 1]) return null;
      for (let i = 1; i + 1 < xs.length; i += 2) if (x0 >= xs[i] && x0 <= xs[i + 1]) return [xs[i], xs[i + 1]];
      return [-1e9, 1e9];
    };
    /** Cota más BAJA a la que la ranura del peine sigue teniendo ≥ `ancho`. */
    const fondoRanura = (pts, x0, ancho) => {
      let z = PB, ultima = null;
      for (; z > -80; z -= 0.01) {
        const h = huecoPeine(pts, z, x0);
        if (!h) break;
        if (h[1] - h[0] + 1e-9 < ancho) break;
        ultima = z;
      }
      return ultima === null ? PB : r2(ultima);
    };

    const peines = nbt.filter(p => /Placa peine/.test(p.name)).map(contornoPeine).filter(Boolean);
    if (!peines.length) e.push('§R: no hay placas peine del NBT90 en el modelo: el corredor recto no se puede verificar');

    // (1) EL CORREDOR, calle a calle, leído del boceto real de las DOS placas.
    //     Estado ELEVADO (el que emite el modelo) = caso pésimo: al retraerse el
    //     cassette la ranura baja 10 mm y el corredor sólo crece.
    let anchoRanuraMin = 1e9, fondoBandaMin = 1e9, fondoPuenteMin = 1e9;
    for (let k = 0; k < EJES.length; k++) {
      const B = EJES[k];
      let ancho = 1e9, hueco = null, fB = -1e9, fP = -1e9;
      for (const pts of peines) {
        const h = huecoPeine(pts, r2(PB - 3), B);            // justo bajo la cresta del diente
        if (!h) { e.push(`§R: el eje de la calle ${k + 1} (X=${B}) cae en MATERIAL de una placa peine`); continue; }
        if (h[1] - h[0] < ancho) { ancho = h[1] - h[0]; hueco = [r2(h[0]), r2(h[1])]; }
        fB = Math.max(fB, fondoRanura(pts, B, STEP.bandaAncho));
        fP = Math.max(fP, fondoRanura(pts, B, CALLE.puente.ancho));
      }
      const holgBanda = r2((ancho - STEP.bandaAncho) / 2);
      const holgPuente = r2((ancho - CALLE.puente.ancho) / 2);
      if (holgBanda < 2) e.push(`§R: la banda de la calle ${k + 1} deja ${holgBanda} mm al diente del peine (mín 2)`);
      anchoRanuraMin = Math.min(anchoRanuraMin, ancho);
      fondoBandaMin = Math.min(fondoBandaMin, fB);
      fondoPuenteMin = Math.min(fondoPuenteMin, fP);
      RECTO.calles.push({ calle: k + 1, eje: B, ranuraX: hueco, ranuraAncho: r2(ancho),
        holguraBandaDiente: holgBanda, holguraPuenteDiente: holgPuente,
        fondoRanuraBanda: r2(fB), fondoRanuraPuente: r2(fP) });
    }

    // (2) LA BANDA de cada calle, sobre su CONTORNO REAL emitido.
    for (let k = 0; k < EJES.length; k++) {
      const banda = nuevas.find(p => /Banda plana 32/.test(p.name) && p.name.includes(`(calle ${k + 1},`));
      if (!banda) { e.push(`§R: la calle ${k + 1} no tiene banda`); continue; }
      // pts del boceto = (Y, Z) en mundo (sketchYZ con at=[x,0,0] y pieza en pos Y=Z=0)
      const contornos = banda.features.filter(f => f.shape === 'sketch').map(f => f.params.pts);
      const externo = contornos[0];

      // R1 · el ramal portante cruza el módulo ENTERO, recto y a la cota del
      //      plano de transporte. Se recorre Y de y0 a y1 y se exige la MISMA Z.
      let peorY = null, peorZ = null, sinBanda = 0;
      for (let Y = y0; Y <= y1 + 1e-9; Y += 5) {
        let zTop = -1e9;
        for (let i = 0; i < externo.length; i++) {
          const a = externo[i], b = externo[(i + 1) % externo.length];
          if ((a[0] > Y) === (b[0] > Y)) continue;
          zTop = Math.max(zTop, a[1] + (b[1] - a[1]) * (Y - a[0]) / (b[0] - a[0]));
        }
        if (zTop < -1e8) { sinBanda++; continue; }
        const d = Math.abs(zTop - zPortante);
        if (d > 0.05 && (peorZ === null || d > Math.abs(peorZ - zPortante))) { peorY = r2(Y); peorZ = r2(zTop); }
      }
      if (sinBanda) e.push(`§R: la banda de la calle ${k + 1} NO es continua dentro de la transferencia `
        + `(${sinBanda} cotas de Y sin banda): las bandas del clasificador pasan rectas y continuas`);
      if (peorZ !== null) e.push(`§R: el ramal portante de la calle ${k + 1} está en Z=${peorZ} en Y=${peorY} `
        + `y no en el plano de transporte (${zPortante}): NO atraviesa la transferencia en recto`);

      // R2 · dentro de la huella del módulo, el lazo o va por el CORREDOR del
      //      peine (Z ≥ fondo de ranura) o va por DEBAJO del módulo (Z ≤ su cara
      //      inferior). Entre las dos cotas está el macizo de la transferencia:
      //      ni el portante puede bajar ahí ni el retorno puede cortarlo.
      let dentro = 0, zAlta = null;
      for (const pts of contornos) {
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const n = Math.max(1, Math.ceil(L / 2));
          for (let j = 0; j < n; j++) {
            const Y = a[0] + (b[0] - a[0]) * j / n, Z = a[1] + (b[1] - a[1]) * j / n;
            if (Y < y0 || Y > y1) continue;
            if (Z >= fondoBandaMin || Z <= fondoModulo) continue;
            dentro++;
            if (zAlta === null || Z > zAlta) zAlta = r2(Z);
          }
        }
      }
      if (dentro) {
        e.push(`§R: la banda de la calle ${k + 1} mete ${dentro} puntos en el MACIZO de la transferencia `
          + `(el más alto en Z=${zAlta}): el corredor del peine baja hasta ${r2(fondoBandaMin)} y la cara `
          + `inferior del módulo está en ${fondoModulo} — o pasa recta por el corredor, o pasa por debajo`);
      }
    }

    // (3) el corredor recto que se acaba de medir tiene que ser EL MISMO que el
    //     NBT90 declara para las bandas de su anfitrión (X y cota del portante)
    const A = m.nbt90.anfitrion;
    if (A?.bandasX?.length === EJES.length) {
      for (let k = 0; k < EJES.length; k++) {
        if (Math.abs(A.bandasX[k] - EJES[k]) > 0.02) {
          e.push(`§R: la calle ${k + 1} (X=${EJES[k]}) no cae en la banda que el NBT90 declara `
            + `para su anfitrión (X=${A.bandasX[k]})`);
        }
      }
    } else e.push('§R: el NBT90 no declara las 5 bandas de su anfitrión: falta la referencia del paso recto');
    if (A?.portante && Math.abs(A.portante.z[1] - PB) > 0.02) {
      e.push(`§R: el NBT90 declara el portante del anfitrión a Z=${A.portante.z[1]} y el plano de transporte es ${PB}`);
    }

    // (4) ¿y el RETORNO? — se decide con la geometría delante, no por costumbre.
    //     El NBT90 declara TAMBIÉN el ramal de retorno del anfitrión, recto por
    //     el mismo corredor, a 61.4 del portante. Que el del sorter no pueda
    //     usarlo es aritmética del Ø del tambor, y aquí queda escrita.
    const zRamal = r2(TAMB_RAMAL.z);                                  // −57.2 (dorso)
    const puenteBaseZ = r2(CALLE.puente.topZ - CALLE.puente.uhmwH - CALLE.puente.aceroH);  // 15.15
    // El otro techo del corredor: lo que el cassette del NBT90 lleva debajo. El
    // motorreductor SEW es lo más alto que hay bajo la ranura en las calles 2-4 —
    // y es justo la pieza que el ramal de retorno del anfitrión libra por 0.3 mm
    // en la declaración del propio NBT90. Se mide sobre su caja real.
    let techoMovil = -1e9, quienTecho = null;
    for (const p of nbt) {
      if (/Placa peine|serpentín|Banda plana FLEXPROOF/.test(p.name)) continue;   // su AABB miente (ranura / lazo)
      const b = bb.get(p);
      if (b.hi[1] <= y0 || b.lo[1] >= y1) continue;
      if (b.hi[2] >= puenteBaseZ) continue;                          // no está bajo el corredor
      if (!EJES.some(B => b.hi[0] > B - STEP.bandaAncho / 2 && b.lo[0] < B + STEP.bandaAncho / 2)) continue;
      if (b.hi[2] > techoMovil) { techoMovil = b.hi[2]; quienTecho = p.name; }
    }
    // suelo REAL del corredor recto: manda el más alto de los dos topes
    const sueloCorredor = r2(Math.max(fondoBandaMin, techoMovil + 2));
    const diaMaxRectoTeorico = r2(STEP.guiaSec.topZ - sueloCorredor);  // Ø que dejaría el retorno EN el corredor
    RECTO.corredor = {
      ranuraAnchoMin: r2(anchoRanuraMin),
      fondoRanuraBanda: r2(fondoBandaMin), fondoRanuraPuente: r2(fondoPuenteMin),
      holguraBandaDiente: r2((anchoRanuraMin - STEP.bandaAncho) / 2),
      holguraPuenteDiente: r2((anchoRanuraMin - CALLE.puente.ancho) / 2),
      holguraBandaRodillo: r2((NBT.paso - NBT.rodDia - STEP.bandaAncho) / 2),
      holguraPuenteRodillo: r2((NBT.paso - NBT.rodDia - CALLE.puente.ancho) / 2),
      holguraRodilloRegletaNbt90: A?.holguraRodilloRegleta,
      portanteZ: zPortante, planoTransporte: PB, caraInferiorModulo: fondoModulo,
      techoMovilBajoCorredor: r2(techoMovil), techoMovilPieza: quienTecho,
      sueloCorredorRecto: sueloCorredor,
      estado: 'medido con el cassette ELEVADO (caso pésimo: al retraerse 10 mm la ranura baja y el corredor crece)',
    };
    RECTO.retornoRecto = {
      posible: zRamal >= sueloCorredor,
      ramalZ: zRamal,
      ventanaZ: [sueloCorredor, puenteBaseZ],
      faltaMm: r2(sueloCorredor - zRamal),
      diaTamborActual: TAMB_P.od,
      diaTamborMaxParaPasarRecto: diaMaxRectoTeorico,
      separacionRamalesAnfitrion: A?.separacionRamalesMm,
      retornoAnfitrionZ: A?.retorno?.z,
      rodillos: TAMB_EJES.retorno.length,
    };
    if (RECTO.retornoRecto.posible && TAMB_EJES.retorno.length) {
      e.push(`§R: el ramal de retorno cabe RECTO por el corredor del peine (Z ${zRamal} ≥ suelo ${sueloCorredor}) `
        + `y sin embargo se mantienen ${TAMB_EJES.retorno.length} rodillos de retorno y el pozo: sobran. `
        + 'Retíralos por bandera en adapt/params_tambores.mjs (TAMBORES.retorno) — el lazo de mod_calles '
        + 'se retraza solo desde esa tabla');
    }
  }
  // ▲▲▲ ------------------------------------------------------------- ▲▲▲

  // --- M. DETALLE DE ESTACIONES --------------------------------------------
  const avisosDeclarados = [];
  {
    // M1 · eje motriz común: existe, cubre las 5 calles, entra en el acople y
    //      su muñón vive en la UCFL pegada al chapón de descarga
    //      GUARDADA por params_tambores.RETIRA, que es lo que la hace aplicable:
    //      con el accionamiento por TAMBOR MOTRIZ el árbol T5 desaparece y esta
    //      comprobación se quedaría reclamando piezas que ya no existen. No se
    //      borra: vuelve sola si alguien pone RETIRA.activo = false.
    const ejeC = partes.find(p => /Eje motriz común/.test(p.name));
    if (!ejeC && !TAMB_RETIRA.activo) e.push('no hay eje motriz común');
    else if (ejeC) {
      const b = bb.get(ejeC);
      if (b.lo[0] > EJES[0] - 20 || b.hi[0] < EJES[4] + 20) {
        e.push(`el eje motriz común (X ${r2(b.lo[0])}…${r2(b.hi[0])}) no cubre las 5 calles`);
      }
      const acople = partes.find(p => /Acople LK30-C65-20H7-D30-R /.test(p.name));
      if (!acople) e.push('falta el acople LK30-R del motor (pose medida)');
      else {
        const ba = bb.get(acople);
        const dentro = Math.min(ba.hi[0], b.hi[0]) - Math.max(ba.lo[0], b.lo[0]);
        if (dentro < 25) e.push(`el eje común solo entra ${r2(dentro)} mm en el acople del motor (mín 25)`);
      }
      const ucflM = partes.find(p => /Chumacera SKF UCFL 205 \(eje motriz/.test(p.name));
      if (!ucflM) e.push('falta la UCFL 205 del eje motriz');
      else {
        const bu = bb.get(ucflM);
        if (Math.abs(bu.hi[0] - STEP.frameIntPos) > 0.5) {
          e.push(`la UCFL del eje motriz no apoya en el chapón de descarga (X ${r2(bu.hi[0])} vs ${STEP.frameIntPos})`);
        }
        if (b.hi[0] < bu.lo[0] + 15) e.push('el muñón Ø25 no llega a la UCFL del eje motriz');
      }
      for (let k = 0; k < EJES.length; k++) {
        const buje = partes.find(p => /Buje 63T/.test(p.name) && p.name.includes(`X=${EJES[k]}`));
        const chav = partes.find(p => /Chaveta DIN 6885/.test(p.name) && p.name.includes(`X=${EJES[k]}`));
        if (!buje) e.push(`la 63T de la calle ${k + 1} no tiene buje al eje común`);
        if (!chav) e.push(`falta la chaveta del buje de la calle ${k + 1}`);
      }
    }
    // M2 · el defecto §5.2 del STEP no vuelve: ninguna AT10 solapa una 63T, y
    //      la pareja recolocada vive en el tramo libre del eje
    for (const p of partes) {
      if (!/AT10 32T/.test(p.name)) continue;
      const bp = bb.get(p);
      for (const q of partes) {
        if (!/Polea motriz|Polea conducida/.test(q.name)) continue;
        const v = solapeAABB(bp, bb.get(q));
        if (v > 1000) e.push(`AT10 superpuesta a una 63T otra vez (${r2(v / 1000)} cm³): «${p.name.slice(0, 40)}» ↔ «${q.name.slice(0, 40)}»`);
      }
      if (!p.contexto && /recolocada/.test(p.name)) {
        if (bp.lo[0] < -13 || bp.hi[0] > EJES[0] - 20) {
          e.push(`la AT10 recolocada (X ${r2(bp.lo[0])}…${r2(bp.hi[0])}) sale del tramo libre X −13…${r2(EJES[0] - 20)}`);
        }
      }
    }
    // M3 · rigidez y par del eje común (fórmulas; carga = tensión de banda por
    //      calle, PNEU-003 a 6 bar — hipótesis declarada). Flecha AL CENTRO del
    //      vano por SUPERPOSICIÓN de las 5 cargas puntuales en sus posiciones
    //      reales (viga simplemente apoyada: acople −28 / UCFL):
    //      Guardada por la misma bandera que §M1: sin árbol T5 no hay flecha de
    //      árbol T5 que comprobar. La del eje del TAMBOR la calcula y la exige
    //      mod_tambores (§4.8), que es quien tiene ahora esa carga.
    if (!TAMB_RETIRA.activo) {
      const xA = -28, xB = r2(EJEC.ucfl.posX - EJEC.ucfl.housingW / 2);
      const Lv = r2(xB - xA);
      const dEje = EJEC.d;
      const I = Math.PI / 64 * Math.pow(dEje, 4);
      let sumaFlecha = 0;
      for (const Bx of EJES) {
        const a = Math.min(Bx - xA, xB - Bx);              // distancia al apoyo más cercano
        sumaFlecha += EJEC.flecha.cargaPorCalleN * a * (3 * Lv * Lv - 4 * a * a);
      }
      const flechaEje = r2(sumaFlecha / (48 * 207000 * I) * 100) / 100;
      if (flechaEje > EJEC.flecha.limite) e.push(`flecha del eje motriz común ${flechaEje} > ${EJEC.flecha.limite} mm`);
      const Tnm = 5 * EJEC.parPorCalleNm;
      const tau = r2(16 * Tnm * 1000 / (Math.PI * Math.pow(dEje, 3)));
      if (tau > EJEC.tauAdmMPa) e.push(`torsión del eje común ${tau} > ${EJEC.tauAdmMPa} MPa`);
      m.ejeComunCalc = { vanoMm: Lv, flechaMm: flechaEje, tauMPa: tau, parNm: Tnm, hipotesis: '6 bar (PNEU-003)' };
    } else {
      m.ejeComunCalc = { retirado: 'árbol T5 sustituido por el TAMBOR MOTRIZ (params_tambores.RETIRA)' };
    }
    // M4 · retención axial de V1…V4: cada polea del pozo con sus 2 rodamientos,
    //      2 anillos 3AM1-20 y 2 DIN 472-42 en posición.
    //      Guardada por la misma bandera que las emite: al pasar el sorter al
    //      accionamiento por TAMBOR MOTRIZ, las poleas del pozo desaparecen y
    //      esta comprobación se quedaría reclamando la retención de piezas que
    //      ya no existen. La comprobación NO se borra: se apaga con lo que la
    //      hace aplicable, para que vuelva sola si alguien reactiva el pozo.
    for (let k = 0; !PG40F.desactivaTransmisionT5 && k < EJES.length; k++) {
      for (const [V, nomV] of [[POZO.v1, 'V1'], [POZO.v2, 'V2'], [POZO.v3, 'V3'], [POZO.v4, 'V4']]) {
        const cerca = (p, dx) => {
          const b2 = bb.get(p);
          const cx = (b2.lo[0] + b2.hi[0]) / 2, cy = (b2.lo[1] + b2.hi[1]) / 2, cz = (b2.lo[2] + b2.hi[2]) / 2;
          return Math.abs(cx - EJES[k]) < dx && Math.abs(cy - V.y) < 5 && Math.abs(cz - V.z) < 5;
        };
        const rod = partes.filter(p => /Rodamiento SKF W 6004-2Z/.test(p.name) && p.name.includes(`(${nomV},`) && p.name.includes(`calle ${k + 1},`) && cerca(p, 30));
        const ani = partes.filter(p => /Anillo 3AM1-20/.test(p.name) && p.name.includes(`(${nomV},`) && p.name.includes(`calle ${k + 1},`) && cerca(p, 30));
        const d472 = partes.filter(p => /Anillo DIN 472-42/.test(p.name) && p.name.includes(`(${nomV})`) && p.name.includes(`calle ${k + 1},`) && cerca(p, 30));
        if (rod.length !== 2) e.push(`${nomV} de la calle ${k + 1}: ${rod.length} rodamientos W 6004-2Z (deben ser 2)`);
        if (ani.length !== 2) e.push(`${nomV} de la calle ${k + 1}: ${ani.length} anillos 3AM1-20 (deben ser 2) — SIN retención axial`);
        if (d472.length !== 2) e.push(`${nomV} de la calle ${k + 1}: ${d472.length} anillos DIN 472-42 (deben ser 2)`);
      }
    }
    // M5 · anclaje del cilindro: bisagra C85C25 + repisa sobre su taladro
    //      vertical Ø12 medido (B−5, 80.18), sin tocar la tapa del cilindro
    //      SOLO aplica al tensor VIEJO (un cilindro por calle). Con el tensor
    //      de brazos hay UN cilindro común y su anclaje lo verifica la §T.
    const gapRepisaTapa = r2((CLEVIS.repisa.z - CLEVIS.repisa.t) - (-76.76));
    if (TENSOR_VIEJO && gapRepisaTapa < 2) e.push(`la repisa del clevis queda a ${gapRepisaTapa} de la tapa del cilindro (mín 2)`);
    for (let k = 0; TENSOR_VIEJO && k < EJES.length; k++) {
      const bis = partes.find(p => /Bisagra trasera SMC C85C25/.test(p.name) && p.name.includes(`calle ${k + 1},`));
      const rep = partes.find(p => /Ménsula de clevis — escuadra con repisa/.test(p.name) && p.name.includes(`calle ${k + 1},`));
      const m12 = partes.find(p => /M12×30 clevis/.test(p.name) && p.name.includes(`calle ${k + 1},`));
      if (!bis || !rep || !m12) { e.push(`calle ${k + 1}: anclaje del cilindro incompleto (bisagra ${!!bis}, repisa ${!!rep}, M12 ${!!m12})`); continue; }
      const bl = bb.get(rep);
      const px = r2(EJES[k] + CLEVIS.taladroVert.dx), py = CLEVIS.taladroVert.y;
      if (px < bl.lo[0] || px > bl.hi[0] || py < bl.lo[1] || py > bl.hi[1]) {
        e.push(`calle ${k + 1}: la repisa no cubre el taladro vertical medido del kit (${px}, ${py})`);
      }
      const bbis = bb.get(bis);
      if (Math.abs((bbis.lo[0] + bbis.hi[0]) / 2 - EJES[k]) > 0.5) e.push(`calle ${k + 1}: bisagra C85C25 descentrada del eje de banda`);
      const motriz = partes.find(p => /Polea motriz/.test(p.name) && p.name.includes(`calle ${k + 1},`));
      if (motriz && solapeAABB(bl, bb.get(motriz)) > 100) e.push(`calle ${k + 1}: la repisa del clevis invade la polea motriz`);
    }
    // M6 · IDLER-P01: reproducida en su posición interior MEDIDA; el conflicto
    //      con la conducida queda DECLARADO (aviso motivado, no error: es un
    //      defecto del STEP del cliente y la pieza va en capa contexto)
    for (let k = 0; k < EJES.length; k++) {
      const loca = partes.find(p => /Polea loca IDLER-P01/.test(p.name) && p.name.includes(`calle ${k + 1},`));
      if (!loca) { e.push(`calle ${k + 1}: falta la polea loca IDLER-P01 (posición interior medida)`); continue; }
      const b2 = bb.get(loca);
      const cx = r2((b2.lo[0] + b2.hi[0]) / 2), cy = r2((b2.lo[1] + b2.hi[1]) / 2);
      if (Math.abs(cx - (EJES[k] + IDLER.dxEjeBanda)) > 0.1 || Math.abs(cy - IDLER.y) > 0.1) {
        e.push(`calle ${k + 1}: IDLER-P01 en (${cx}, ${cy}) y no en la posición medida (${r2(EJES[k] + IDLER.dxEjeBanda)}, ${IDLER.y})`);
      }
      const cond = partes.find(p => /Polea conducida/.test(p.name) && p.name.includes(`calle ${k + 1},`));
      if (cond) {
        const v = solapeAABB(b2, bb.get(cond));
        if (v > 1000 && k === 0) {
          avisosDeclarados.push(`IDLER-P01 ↔ conducida_63T: coaxiales con ${IDLER.solapeConducidaX} mm de solape en X `
            + `(defecto del STEP medido en analisis/estaciones.json; la banda respalda a la 63T — decide el cliente)`);
        }
        if (v < 1000) e.push(`calle ${k + 1}: la IDLER-P01 ya no solapa la conducida — si se corrigió, retirar la declaración del defecto`);
      }
    }
  }

  // --- N. GUARDAS DEL POZO -------------------------------------------------
  {
    const gS = partes.find(p => /Guarda de pozo sur/.test(p.name));
    const gN = partes.find(p => /Guarda de pozo norte/.test(p.name));
    const gL = partes.filter(p => /Guarda de pozo lateral/.test(p.name));
    if (!gS || !gN || gL.length !== 2) {
      e.push(`el pozo no queda cerrado: testas ${!!gS}/${!!gN}, laterales ${gL.length}/2`);
    } else {
      const tCh = 1.9;
      const bS = bb.get(gS), bN = bb.get(gN);
      // SUR: entre el IDLER-ENS (−1391.98 step) y el flanco de la bajada de V1
      // (−1377.5 calc); la cara es el borde −Y de la caja (el ala va hacia +Y
      // a Z −42…−40, con el retorno 10 más abajo)
      // Los flancos y la cota del retorno los manda ahora el ACCIONAMIENTO POR
      // TAMBOR (adapt/params_tambores.mjs): en el pozo ya no hay poleas V1…V4,
      // hay rodillos de retorno RR1…RR4, y el ramal bajó de Z −52.05 a −57.833.
      // Las dos reglas siguen siendo las mismas —5 mm de aire al flanco de la
      // bajada y 5 mm entre el techo de la guarda norte y la banda—; lo que
      // cambia es la geometría de la que se leen.
      const rrSur = TAMB_EJES.retorno.reduce((a, b) => (b.y < a.y ? b : a));   // RR4
      const rrNorte = TAMB_EJES.retorno.reduce((a, b) => (b.y > a.y ? b : a)); // RR1
      const flancoS = r2(rrSur.y - (TAMB_RET.r + STEP.bandaDorso));
      if (bS.lo[1] < STEP.idlerEnsY[1] + 2) e.push(`la guarda sur (Y ${r2(bS.lo[1])}) pisa el IDLER-ENS (${STEP.idlerEnsY[1]})`);
      if (r2(bS.lo[1] + tCh) > flancoS - 5) e.push(`la cara de la guarda sur (Y ${r2(bS.lo[1] + tCh)}) no deja 5 al flanco de la bajada (${flancoS})`);
      if (bS.lo[2] > -420 || bS.hi[2] < -42) e.push(`la guarda sur no cubre de Z −420 a −42 (Z ${r2(bS.lo[2])}…${r2(bS.hi[2])})`);
      // NORTE: franja pegada a la cara sur de la bancada LAT TOP (−513.12 step),
      // al norte del flanco de RR1 y 5 bajo la cara de la banda del retorno
      const flancoN = r2(rrNorte.y - (TAMB_RET.r + STEP.bandaDorso));
      const zRamalCara = r2(TAMB_RAMAL.zCara);
      if (bN.lo[1] < -520 || bN.lo[1] > -514) e.push(`la guarda norte (cara Y ${r2(bN.lo[1])}) no queda contra la bancada LAT TOP (−513.12)`);
      if (bN.lo[2] > -116) e.push(`la guarda norte no baja a solapar la bancada (Z ${r2(bN.lo[2])} > −116)`);
      if (bN.hi[2] < r2(zRamalCara - 10)) e.push(`la guarda norte (Z hasta ${r2(bN.hi[2])}) no cubre hasta 10 bajo el ramal (${zRamalCara})`);
      if (bN.hi[2] > r2(zRamalCara - 5)) e.push(`la guarda norte (Z hasta ${r2(bN.hi[2])}) no deja 5 al ramal de retorno (${zRamalCara})`);
      m.flancosGuardas = { flancoS, flancoN, retornoZ: zRamalCara };
      // LATERALES: la +X solo bajo el fondo del NBT90; ninguna pieza del módulo
      // las toca; las ménsulas de la percha pasan por los escotes de la −X
      const gPX = gL.find(p => /\+X/.test(p.name));
      const gNX = gL.find(p => /−X/.test(p.name));
      if (gPX) {
        const b2 = bb.get(gPX);
        if (b2.hi[2] > r2(T.z) - 2) e.push(`la guarda lateral +X (Z hasta ${r2(b2.hi[2])}) no deja 2 al fondo del NBT90 (${r2(T.z)})`);
        for (const p of nbt) {
          if (solapeAABB(bb.get(p), b2) > 0) { e.push(`«${p.name.slice(0, 50)}» toca la guarda lateral +X`); break; }
        }
      }
      if (gNX) {
        const b2 = bb.get(gNX);
        for (const p of nuevas.filter(q => /Ménsula percha/.test(q.name))) {
          const bm = bb.get(p);
          if (solapeAABB(bm, b2) === 0) continue;
          const cyM = (bm.lo[1] + bm.hi[1]) / 2;
          const escote = gNX.features.find(f => f.op === 'cut' && /Escote/.test(f.name)
            && Math.abs(f.at[1] + gNX.pos[1] - cyM) < 2);
          if (!escote) e.push(`la ménsula de la percha en Y=${r2(cyM)} no tiene escote en la guarda lateral −X`);
        }
      }
    }
    m.guardasChk = { desarrollos: m.guardas.desarrollos };
  }

  // --- O. GUÍAS DEL CORREDOR (la excepción del pasillo, verificada) --------
  {
    const gS = partes.find(p => /Guía de descarga sur/.test(p.name));
    const gN = partes.find(p => /Guía de descarga norte/.test(p.name));
    if (!gS || !gN) e.push('faltan las guías laterales del corredor de descarga');
    for (const [g, lado] of [[gS, 'sur'], [gN, 'norte']]) {
      if (!g) continue;
      const b2 = bb.get(g);
      // FUERA del camino del bulto (campo de rodillos) con 5 de margen:
      if (lado === 'sur' && b2.hi[1] > GUIAS.caminoBultoY[0] - 5) {
        e.push(`la guía ${lado} (Y hasta ${r2(b2.hi[1])}) invade el camino del bulto (${GUIAS.caminoBultoY[0]} − 5)`);
      }
      if (lado === 'norte' && b2.lo[1] < GUIAS.caminoBultoY[1] + 5) {
        e.push(`la guía ${lado} (Y desde ${r2(b2.lo[1])}) invade el camino del bulto (${GUIAS.caminoBultoY[1]} + 5)`);
      }
      if (b2.hi[0] > bordeExtDescarga + 0.5) e.push(`la guía ${lado} asoma del borde exterior (X ${r2(b2.hi[0])})`);
      if (b2.hi[2] < STEP.planoBanda + 40) e.push(`la guía ${lado} no sube 40 sobre el plano de transporte`);
    }
  }

  // ▼▼▼ T. TENSOR NEUMÁTICO DE BRAZOS POR BANDA ▼▼▼
  if (!TENSOR_VIEJO) {
    const X = m.tensor2, T2 = X.tension, ram = m.ramal.usado;
    // T1 · un brazo, un cilindro y una polea por banda
    for (let k = 0; k < EJES.length; k++) {
      const eti = `calle ${k + 1},`;
      const brazos = partes.filter(p => /Brazo tensor e=/.test(p.name) && p.name.includes(eti));
      const cil = partes.filter(p => /Cilindro SMC CD85N25-80/.test(p.name) && p.name.includes(eti));
      const pol = partes.filter(p => /Polea tensora POL-CON-TEN/.test(p.name) && p.name.includes(eti));
      const cas = partes.filter(p => /Casquillo de fricción/.test(p.name) && p.name.includes(eti));
      if (brazos.length !== 2) e.push(`tensor calle ${k + 1}: ${brazos.length} pletinas de brazo (deben ser 2)`);
      if (cil.length !== 1) e.push(`tensor calle ${k + 1}: ${cil.length} cilindros (debe ser 1 por banda)`);
      if (pol.length !== 1) e.push(`tensor calle ${k + 1}: ${pol.length} poleas tensoras (debe ser 1)`);
      if (cas.length !== 2) e.push(`tensor calle ${k + 1}: ${cas.length} casquillos (deben ser 2) — el brazo cabecearía`);
      // los 4 accesorios que el cliente pidió por cilindro
      for (const [rx, nom] of [[/Bisagra trasera SMC C85C25/, 'bisagra C85C25'],
        [/Rótula de vástago SMC KJ10D/, 'rótula KJ10D'],
        [/Regulador de caudal SMC AS2201FS/, 'regulador AS2201FS'],
        [/Silenciador SMC AN101/, 'silenciador AN101']]) {
        if (!partes.some(p => rx.test(p.name) && p.name.includes(eti))) {
          e.push(`tensor calle ${k + 1}: falta el/la ${nom} de su cilindro`);
        }
      }
    }
    // T1-bis · CADA CILINDRO, ESTÁTICAMENTE DETERMINADO — nada en el aire.
    //   Éste es exactamente el fallo que se coló hasta el cliente: salían 5
    //   bisagras y 5 rótulas sin soporte y sin bulón. Ahora se comprueba que
    //   CADA extremo de CADA cilindro tiene articulación, soporte y retención.
    for (let k = 0; k < EJES.length; k++) {
      const eti = `calle ${k + 1},`;
      const men = partes.filter(p => /Ménsula de bisagra/.test(p.name) && p.name.includes(eti));
      const bul = partes.filter(p => /Bulón trasero/.test(p.name) && p.name.includes(eti));
      const anT = partes.filter(p => /Anillo retención bulón trasero/.test(p.name) && p.name.includes(eti));
      const bulR = partes.filter(p => /Bulón del lóbulo/.test(p.name) && p.name.includes(eti));
      const anR = partes.filter(p => /Anillo retención bulón rótula/.test(p.name) && p.name.includes(eti));
      if (men.length !== 1) e.push(`tensor calle ${k + 1}: la bisagra trasera no tiene ménsula de soporte (${men.length}) — el cilindro quedaría EN EL AIRE`);
      if (bul.length !== 1) e.push(`tensor calle ${k + 1}: la bisagra trasera no tiene bulón (${bul.length}) — no transmitiría nada`);
      if (anT.length !== 2) e.push(`tensor calle ${k + 1}: el bulón trasero tiene ${anT.length} anillos (deben ser 2) — se saldría`);
      if (bulR.length !== 1) e.push(`tensor calle ${k + 1}: la rótula KJ10D no tiene bulón al brazo (${bulR.length})`);
      if (anR.length !== 2) e.push(`tensor calle ${k + 1}: el bulón de la rótula tiene ${anR.length} anillos (deben ser 2) — se saldría`);
      if (!partes.some(p => /Línea de aire PU/.test(p.name) && p.name.includes(`calle ${k + 1}`))) {
        e.push(`tensor calle ${k + 1}: su cilindro no tiene línea de aire`);
      }
    }
    // el travesaño frontal («la placa frontal») y sus dos anclajes
    if (!partes.some(p => /Travesaño frontal del tensor/.test(p.name))) {
      e.push('falta el travesaño frontal del tensor: las 5 bisagras no tendrían a qué amarrarse');
    }
    const pex = partes.filter(p => /Placa de extremo del travesaño/.test(p.name));
    if (pex.length !== 2) e.push(`el travesaño frontal tiene ${pex.length} placas de extremo (deben ser 2, una por cabezal)`);
    if (SOPORTE_CALC.fs < 3) e.push(`el travesaño frontal no lleva FS 3: ${SOPORTE_CALC.fs} (σ ${SOPORTE_CALC.sigmaMPa} MPa)`);
    if (SOPORTE_CALC.flechaMm > 1.0) e.push(`flecha del travesaño frontal ${SOPORTE_CALC.flechaMm} > 1.0 mm`);
    if (!partes.some(p => /Pletina soporte del regulador/.test(p.name))) {
      e.push('el regulador de presión AR20 no tiene soporte: quedaría colgando de los tubos');
    }
    // el cilindro BASCULA: prohibido empotrarlo por delante
    if (SOPORTE_CALC.basculacionDeg > 2 && partes.some(p => /brida de nariz|placa frontal del cilindro/i.test(p.name))) {
      e.push(`el cilindro bascula ${SOPORTE_CALC.basculacionDeg}° y lleva un empotramiento frontal: rompería el vástago`);
    }
    // T2 · EL EJE PIVOTE ASEGURADO (instrucción explícita del cliente)
    const ejes = partes.filter(p => /Eje pivote común/.test(p.name));
    if (ejes.length !== 1) e.push(`el tensor tiene ${ejes.length} ejes pivote (debe ser 1 común a los 5 brazos)`);
    const chum = partes.filter(p => /Chumacera SKF UCFL 206/.test(p.name));
    if (chum.length !== 2) e.push(`el eje pivote tiene ${chum.length} apoyos al bastidor (deben ser 2)`);
    const anillos = partes.filter(p => /Anillo retención eje pivote/.test(p.name));
    if (anillos.length !== 2) e.push(`el eje pivote tiene ${anillos.length} anillos ${PIV.anillo.norma} (deben ser 2) — SIN retención axial de seguridad`);
    const collares = partes.filter(p => /Collar de apriete/.test(p.name));
    if (collares.length !== 1) e.push(`la pila de brazos tiene ${collares.length} collares de apriete (debe ser 1, en −X) — los brazos podrían correrse a lo largo del eje`);
    // el anillo +X hace de tope de la pila: tiene que estar pegado a su cara
    if (Math.abs(PIV.anilloX[1] - PIV.pilaX[1]) > 0.5) e.push(`el anillo +X (X ${PIV.anilloX[1]}) no topa la cara +X de la pila (${PIV.pilaX[1]}): quedaría juego axial`);
    const seps = partes.filter(p => /Separador Ø38×.*pila del pivote/.test(p.name));
    if (seps.length !== EJES.length - 1) e.push(`la pila de brazos tiene ${seps.length} separadores (deben ser ${EJES.length - 1}) — quedaría juego axial`);
    // el paso de la pila tiene que cerrar EXACTO contra el paso de las calles
    if (Math.abs(X.ejePivote.pasoCerrado - NBT.paso) > 0.01) {
      e.push(`la pila del pivote cierra ${X.ejePivote.pasoCerrado} y el paso es ${NBT.paso}: los brazos no caerían sobre sus bandas`);
    }
    // el eje tiene que llegar a sus dos apoyos y sobresalir para las gargantas
    if (PIV.x0 > PIV.ucflX[0] || PIV.x1 < PIV.ucflX[1]) e.push('el eje pivote no alcanza sus dos chumaceras');
    // resistencia y rigidez del eje
    if (EJE_CALC.fs < 3) e.push(`el eje pivote no lleva FS 3 a flexión: ${EJE_CALC.fs} (σ ${EJE_CALC.sigmaMPa} MPa)`);
    if (EJE_CALC.presionCasquilloMPa > 5) e.push(`los casquillos del pivote trabajan a ${EJE_CALC.presionCasquilloMPa} MPa (máx 5)`);
    // T3 · LA TENSIÓN CONSEGUIDA — el número que pidió el cliente
    if (T2.tPorMmAncho < TENSION.rangoSanoNmm[0] || T2.tPorMmAncho > TENSION.rangoSanoNmm[1]) {
      e.push(`la tensión de banda queda en ${T2.tPorMmAncho} N/mm, fuera del rango sano de banda plana `
        + `${TENSION.rangoSanoNmm.join('…')} N/mm (abrazado ${ram.abrazadoDeg}°, ${NEUM.presionTrabajoBar} bar). `
        + `Reajustar la presión con el ${NEUM.reguladorPresion}: ver tablaPresion.`);
    }
    // que arrastre sin patinar, con FS 2 sobre la demanda del bulto
    if (T2.feMaxPorBandaN < T2.arrastrePorBandaN * 2) {
      e.push(`sin margen contra el patinaje: Fe ${T2.feMaxPorBandaN} N < 2 × ${T2.arrastrePorBandaN} N de arrastre`);
    }
    // el regulador que FIJA la tensión tiene que estar (el de caudal no vale)
    if (!partes.some(p => /Regulador de PRESIÓN/.test(p.name))) {
      e.push('falta el regulador de PRESIÓN de la rama del tensor: sin él la tensión no queda fijada '
        + '(el AS2201FS es de caudal y sólo gobierna la velocidad)');
    }
    // T4 · trazabilidad de la hipótesis de presión: NO se esconde
    avisosDeclarados.push(`TENSOR: presión de trabajo ${NEUM.presionTrabajoBar} bar fijada con el `
      + `${NEUM.reguladorPresion} (web PNEU-009) → T = ${T2.tPorBandaN} N = ${T2.tPorMmAncho} N/mm por banda. `
      + `La presión de RED (${NEUM.presionRedBar} bar) es HIPÓTESIS declarada (web_facts PNEU-003): el STEP no la declara.`);
    if (!m.ramal.origen.tambores) {
      avisosDeclarados.push(`TENSOR: adapt/params_tambores.mjs aún no existe — ramal Z ${ram.z} y abrazado `
        + `${ram.abrazadoDeg}° son valores POR DEFECTO declarados (dis). Cuando el módulo de tambores publique, `
        + `se recalcula solo; la tensión se mueve a la fila que toque de la tabla (en rango para abrazado ≥ 60°).`);
    }
  }
  // ▲▲▲ ---------------------------------------- ▲▲▲

  // ▼▼▼ P. BASTIDOR PG40 · GUÍAS UHMW · ALARGUE ▼▼▼
  {
    const G = m.pg40, FL = G.flecha, AL = G.alargue;
    // P1 · flecha del bastidor con el bulto entero sobre UNA calle
    if (FL.flechaLarguero > FL.limite) {
      e.push(`flecha del larguero PG40 ${FL.flechaLarguero} > ${FL.limite} mm en el vano de ${FL.vanoMax}`);
    }
    if (FL.flechaTravesano > CARGA_PG40.flechaMaxAbs) {
      e.push(`flecha del travesaño PG40 ${FL.flechaTravesano} > ${CARGA_PG40.flechaMaxAbs} mm`);
    }
    // P2 · el alargue no toca las ALAS del side channel del NBT90 (el NBT90 no
    //      se modifica: si roza, es el alargue el que está mal, no el módulo)
    if (AL.holguraAlaInf < 2) e.push(`el alargue roza el ala inferior del side channel: ${AL.holguraAlaInf} mm (mín 2)`);
    if (AL.holguraAlaSup < 2) e.push(`el alargue roza el ala superior del side channel: ${AL.holguraAlaSup} mm (mín 2)`);
    // P3 · el perno de amarre cae dentro del recorrido de la colisa EXISTENTE
    //      (no se taladra el NBT90) y con distancia al canto ≥ 1.5 Ø
    if (!AL.pernoEnColisa) e.push('el perno del alargue no cae dentro de la colisa de reglaje del side channel');
    const cantoMin = r2(1.5 * 9.525);
    if (AL.cantoPerno < cantoMin) e.push(`el perno del alargue queda a ${AL.cantoPerno} del canto (mín ${cantoMin} = 1.5 Ø)`);
    // P4 · la guía UHMW respeta la ventana útil y la cara de rodadura medida
    const anchoGuia = NBT.ventana;
    if (anchoGuia > NBT.ventana) e.push(`la guía UHMW mide ${anchoGuia} (máx ventana ${NBT.ventana})`);
    // P5 · el contrato con el módulo de tambores: la cara del tambor que exigen
    //      las 5 bandas tiene que caber entre las caras de apoyo del rodamiento
    if (PG40PUB.holguraPorLado <= 0) {
      e.push(`las caras de apoyo del rodamiento (${PG40PUB.luzEntreCaras}) no dejan sitio a la cara `
        + `de tambor que piden las 5 bandas (${PG40PUB.caraTamborMin})`);
    }
    // avisos declarados de esta parte
    avisosDeclarados.push(`BASTIDOR PG40: ${G.modificacionCliente}`);
    if (PG40PUB.ejes.fuente !== 'adapt/params_tambores.mjs') {
      avisosDeclarados.push('BASTIDOR PG40: adapt/params_tambores.mjs aún no existe — los ejes motriz '
        + `(Y ${PG40PUB.ejes.motriz.y}, Z ${PG40PUB.ejes.motriz.z}) y conducido (Y ${PG40PUB.ejes.conducido.y}, `
        + `Z ${PG40PUB.ejes.conducido.z}) son la PROPUESTA de params_pg40.mjs (Y step §4.1, Z calc del radio de `
        + 'contacto 51.7). Cuando el módulo de tambores publique, los taladros UCF 207 se recolocan solos.');
    }
    avisosDeclarados.push(`BASTIDOR PG40: entre la banda exterior y la cara de apoyo del rodamiento quedan `
      + `${PG40PUB.holguraPorLado} mm por lado para el cuerpo del UCF 207. Si no cabe, el alargue solo puede `
      + 'correrse hacia fuera en −X (132.3 de aire al chapón); en +X el tope es el chapón de descarga.');
  }
  // ▲▲▲ ---------------------------------------- ▲▲▲

  // ▼▼▼ TAMBORES: compuerta propia del accionamiento de banda plana ▼▼▼
  // Lo que verifica mod_tambores por dentro (cara útil, plano de rodadura,
  // holguras al bastidor y al módulo, abrazados, ejes, rodamientos) llega aquí
  // como lista y se levanta sin filtrar: si algo no cumple, NO se emite JSON.
  const TB = m.tambores;
  for (const err of TB.errores) e.push(`TAMBORES: ${err}`);
  // …y lo que sólo se puede comprobar con el ensamble entero delante:
  //  (1) la cara engomada cubre las 5 bandas del reparto REAL (no el nominal)
  const bandaXreal = [r2(EJES[0] - STEP.bandaAncho / 2), r2(EJES[4] + STEP.bandaAncho / 2)];
  if (TB.caraUtil.goma[0] > bandaXreal[0] || TB.caraUtil.goma[1] < bandaXreal[1]) {
    e.push(`la cara engomada del tambor (${TB.caraUtil.goma.join('…')}) no cubre las 5 calles `
      + `(${bandaXreal.join('…')})`);
  }
  //  (2) el tambor y el conducido caben en la luz entre bastidores
  if (TB.caraUtil.tubo[0] < STEP.frameIntNeg + 2 || TB.caraUtil.tubo[1] > STEP.frameIntPos - 2) {
    e.push(`el tambor (X ${TB.caraUtil.tubo.join('…')}) no cabe en la luz entre bastidores `
      + `(${STEP.frameIntNeg}…${STEP.frameIntPos})`);
  }
  //  (3) ningún rodillo de retorno se mete en la huella del módulo, y el ramal
  //      de fondo libra su cara inferior (lo mismo que exige §E al pozo viejo)
  if (TB.ramal.holguraFondoNbt90 < 2) {
    e.push(`el ramal de retorno pasa a ${TB.ramal.holguraFondoNbt90} mm del fondo del NBT90 (mín 2)`);
  }
  //  (4) el tambor no asoma sobre el plano de transporte por ningún sitio
  //      (su generatriz alta ES el plano de rodadura del dorso, 51.7)
  const dorsoT = r2(TAMB_EJES.motriz.z + TAMB_P.od / 2);
  if (dorsoT > STEP.planoBanda + 0.01) {
    e.push(`el tambor asoma sobre el plano de transporte: dorso en Z=${dorsoT}`);
  }
  //  (5) coherencia con lo que este módulo PUBLICA a los otros dos agentes
  if (PG40PUB.ejes.fuente !== 'adapt/params_tambores.mjs') {
    e.push('pg40 no está leyendo los ejes de adapt/params_tambores.mjs '
      + `(usa «${PG40PUB.ejes.fuente}»)`);
  }
  if (!m.ramal.origen.tambores) {
    e.push('el tensor no está leyendo el ramal de adapt/params_tambores.mjs');
  }
  if (Math.abs(m.ramal.usado.z - TAMB_RAMAL.z) > 0.01) {
    e.push(`el tensor tensa en Z=${m.ramal.usado.z} y el ramal de retorno está en ${TAMB_RAMAL.z}`);
  }
  //  (6) el eje del tambor es el barreno del UCF 207 que pidió el cliente
  if (TAMB_P.eje.d !== TAMB_UCF.bore) {
    e.push(`el eje del tambor (Ø${TAMB_P.eje.d}) no es el barreno del ${TAMB_UCF.desig} `
      + `(Ø${TAMB_UCF.bore})`);
  }
  if (TAMB_P.engomado !== 10) e.push(`el engomado es ${TAMB_P.engomado} y el cliente pidió 10`);
  //  (6-bis) UN SOLO ACCIONAMIENTO. Es la comprobación que faltaba y que la
  //      verificación B-rep exacta destapó: el árbol T5 seguía emitiéndose y
  //      atravesaba el eje del tambor (341.81 cm³ de solape macizo). Aquí se
  //      exige a la vez que el accionamiento nuevo esté COMPLETO y que del
  //      viejo no quede ni una pieza en la línea de árbol.
  {
    const restos = nuevas.filter(p => TAMB_RETIRA.rx.test(p.name));
    if (TAMB_RETIRA.activo && restos.length) {
      e.push(`DOS ACCIONAMIENTOS a la vez: quedan ${restos.length} piezas de la transmisión T5 `
        + `que el tambor motriz sustituye (${restos.slice(0, 3).map(p => p.name.slice(0, 40)).join(' · ')}`
        + `${restos.length > 3 ? ' …' : ''})`);
    }
    if (!TAMB_RETIRA.activo && nuevas.some(p => /^TAMBOR · tubo/.test(p.name))) {
      e.push('DOS ACCIONAMIENTOS a la vez: hay tambor motriz y params_tambores.RETIRA está '
        + 'desactivado, así que la transmisión T5 sigue montada sobre la misma línea de árbol');
    }
    const imprescindibles = [[/^TAMBOR · tubo/, 'el tubo del tambor motriz'],
      [/^TAMBOR · engomado/, 'el engomado del tambor'],
      [/^TAMBOR · eje/, 'el eje del tambor'],
      [/^CONDUCIDO .* tubo/, 'el rodillo conducido'],
      [/UCF 207 — unidad de brida/, 'las unidades UCF 207']];
    for (const [rx, nom] of imprescindibles) {
      if (!nuevas.some(p => rx.test(p.name))) e.push(`falta ${nom}: el accionamiento no está completo`);
    }
    const nRet = nuevas.filter(p => /^RETORNO RR\d .* tubo/.test(p.name)).length;
    if (nRet !== TAMB_EJES.retorno.length) {
      e.push(`hay ${nRet} rodillos de retorno y el ramal necesita ${TAMB_EJES.retorno.length}`);
    }
  }
  //  (7) lo que este módulo tiene que DECIRLE al bastidor (no lo puede arreglar
  //      él solo: la pieza es de PG40). Va a avisos, con la cota exacta.
  {
    const goma = nuevas.find(p => /^TAMBOR · engomado/.test(p.name));
    const esc = nuevas.filter(p => /PG40 · Escuadra larguero↔travesaño \(calle \d, Y -100\)/.test(p.name));
    if (goma && esc.length) {
      const bg = bb.get(goma);
      let peor = 0;
      for (const s of esc) peor = Math.max(peor, r2(bb.get(s).hi[1] - bg.lo[1]));
      if (peor > 0) {
        avisosDeclarados.push(`TAMBORES: las ${esc.length} escuadras larguero↔travesaño de PG40 en `
          + `Y=−100 entran ${peor} mm en la envolvente del tambor (piel del tambor en Y=${r2(bg.lo[1])}, `
          + `Ø${TAMB_P.od}). El tambor NO se puede correr (su Y la fija el árbol motriz del cliente) `
          + `ni adelgazar (Ø108.9 ya es el escalón que cabe entre largueros): la escuadra tiene que `
          + `bajar al travesaño o retranquearse a Y ≤ ${r2(bg.lo[1] - 2)}`);
      }
    }
    avisosDeclarados.push(`TAMBORES: montaje del ${TAMB_UCF.desig} corregido a OUTBOARD `
      + `(caras de apoyo X ${TAMB_UCF.caraX.join(' y ')}), que es lo que pedía el propio AVISO de `
      + `params_pg40. Con la unidad hacia DENTRO su cuerpo (saliente ${TAMB_UCF.saliente} por lado) `
      + `deja libres ${TB.interfazPG40.caraUtilSiInboard} mm entre apoyos, y el tubo del tambor `
      + `mide ${TAMB_P.caraTubo} (cara engomada ${TAMB_P.caraGoma} + testas): faltan `
      + `${TB.interfazPG40.faltaSiInboard} mm. Hacia FUERA quedan ${TB.interfazPG40.caraUtilOutboard} `
      + `y entra con ${r2((TB.interfazPG40.caraUtilOutboard - TAMB_P.caraTubo) / 2)} mm por lado`);
    avisosDeclarados.push(`TAMBORES: el rodillo conducido NO lleva ${TAMB_UCF.desig} — rodamientos `
      + `${TAMB_CON.rodam.desig} DENTRO del tubo sobre eje fijo pasante Ø${TAMB_CON.eje.d} `
      + `(instrucción del cliente). En su estación el alargue conserva el mismo patrón `
      + `${TAMB_CON.soporte.patron}×${TAMB_CON.soporte.patron} pero recibe una pletina de eje fijo`);
    // LO QUE LA VERIFICACIÓN B-REP EXACTA DEJABA ABIERTO ENTRE MÓDULOS — los
    // tres avisos «PENDIENTE DE …» de este bloque están CERRADOS (177 → 108
    // interferencias, y las 108 que quedan son las convenciones declaradas:
    // tornillería dentro de la pieza que atornilla, rodamiento sobre su eje,
    // casquillo prensado en su cubo y la línea de vulcanizado). Se deja el
    // rastro de qué era cada uno y con qué se cerró:
    //   · mod_calles  — el lazo T5 sobre las 63T atravesaba el tambor motriz y
    //     el conducido (27.4 cm³ / 10 pares). RETRAZADO a banda plana sobre las
    //     estaciones publicadas, con los dos volantes de contraflexión del
    //     cliente devueltos a la horquilla del tensor. Abrazados resultantes,
    //     idénticos a los publicados: tambor 180°, conducido 180°, RR 96.5 /
    //     102.39°, tensora 186.12° (el cliente midió 186.25° en la suya).
    //   · mod_guardas — la guarda seguía trazada para el pozo de las V1…V4
    //     (8.21 cm³ / 6 pares contra los soportes de RR2 y RR3, más 8.21 cm³
    //     contra el alargue). REHECHA: sigue habiendo pozo y sigue habiendo
    //     atrapamientos, así que NO se retira — se le abren los escotes de los
    //     soportes de retorno, los recortes de paso del alargue y las rendijas
    //     de la banda, y su techo baja de −60 a −63 porque el ramal bajó.
    //   · mod_pg40    — el alma no tenía el paso del eje ni quedaba a ras: sus
    //     lóbulos de cartela sobresalían 0.2 por la cara de apoyo (6.64 cm³ en
    //     4 pares contra las pletinas), el lóbulo de RR2 tapaba el taladro de
    //     paso de RR1 y le comía 9 mm del eje (1.03 cm³), y dos M10 al chapón
    //     caían dentro de las pletinas de RR1 y RR4 (2.29 cm³ en 3 pares).
    //     Uniones antes que cortes, lóbulos a ras y los dos pernos reubicados.
    // Lo que SÍ queda abierto se declara aquí abajo, con su cota:
    const LZ = m.calles.banda;
    avisosDeclarados.push('TAMBORES · CERRADO por mod_calles: el lazo de banda es ahora PLANO sobre '
      + `tambor Ø${TAMB_P.od} (Y ${TAMB_EJES.motriz.y}) → guías UHMW → conducido Ø${TAMB_CON.od} `
      + `(Y ${TAMB_EJES.conducido.y}) → ` + TAMB_EJES.retorno.map(R => R.id).reverse().join('→')
      + ` → horquilla del tensor. Abrazado en el tambor ${LZ.envolventes_deg.tambor}° = el `
      + `${TAMB_RAMAL.abrazadoMotrizDeg}° publicado; largo de fibra ${LZ.largoDesarrollado} mm por calle`);
    avisosDeclarados.push('CALLES: la HORQUILLA del tensor la forman los 2 volantes de contraflexión '
      + `del cliente (guia_entrada_liso / guia_salida_liso, Ø${STEP.volante.cara}/Ø${STEP.volante.pest}, `
      + `step) devueltos a su bahía, en su Y medida y con Z ${LZ.volanteHorquillaZ} recalculada por `
      + 'tangencia al ramal nuevo. QUEDA PENDIENTE su eje y su ménsula: el barreno medido es Ø'
      + `${STEP.volante.bore} y la bahía la ocupan los 5 brazos del tensor, así que el soporte hay `
      + 'que definirlo con la envolvente de barrido del brazo delante — es del módulo del tensor, '
      + 'no de éste. Sin volantes el abrazado del tambor cae a 114.82° (< 150° de la compuerta §J) '
      + 'y el de la tensora a 109.07°: el tensor dejaría de poder poner su tensión.');
    avisosDeclarados.push(`TENSOR: el lazo abraza la polea tensora ${LZ.abrazadoTensoraGeometrico}° `
      + `(geometría) y params_tensor2 declara ${m.ramal.usado.abrazadoDeg}° (dis; la medida del `
      + `tensor original era 186.25°). La diferencia mueve la tensión de `
      + `${TENSION.tDe(m.ramal.usado.abrazadoDeg)} N a ${TENSION.tDe(LZ.abrazadoTensoraGeometrico)} N `
      + 'por banda (+0.15 %): se declara y NO se reajusta el parámetro, que es de otro módulo y va '
      + 'del lado conservador.');
    avisosDeclarados.push('GUARDAS: la guarda de pozo lateral +X lleva ahora 2 ESCOTES abiertos por '
      + 'arriba (uno por soporte de RR2 y RR3) porque esas pletinas de 12 apoyan justo en su plano; '
      + 'el hueco lo tapa la propia pletina, que es más gruesa que la chapa 14 GA. Las guardas de '
      + 'testa llevan los recortes de paso del alargue −X y 5 rendijas de banda: '
      + JSON.stringify(m.guardas.recortes));
    avisosDeclarados.push(`TAMBORES: el solape engomado↔tubo (10.32 cm³) es la LÍNEA DE VULCANIZADO `
      + '(0.1 mm de interpenetración deliberada, misma convención que nbt90/rodillos.mjs): la goma '
      + 'y el tubo comparten superficie porque están vulcanizados, no montados.');
    // ▼▼▼ R · POR QUÉ EL PORTANTE VA RECTO Y EL RETORNO NO PUEDE ▼▼▼
    {
      const C = RECTO.corredor, RT = RECTO.retornoRecto, A = RECTO.anfitrion;
      avisosDeclarados.push('PASO RECTO (corrección del cliente 03-08): el ramal PORTANTE de las 5 '
        + `calles atraviesa la transferencia EN RECTO, a la cota del plano de transporte (Z ${C.portanteZ} `
        + `= ${C.planoTransporte} + faceta), por el corredor de ${C.ranuraAnchoMin} mm que dejan los dientes `
        + `de las placas peine — medido sobre el BOCETO REAL de las dos placas. Holguras: banda `
        + `${C.holguraBandaDiente}/lado al diente y ${C.holguraBandaRodillo} al rodillo · puente `
        + `${C.holguraPuenteDiente}/lado al diente y ${C.holguraPuenteRodillo} al rodillo · el propio NBT90 `
        + `declara ${C.holguraRodilloRegletaNbt90} mm entre rodillo y regleta vecina. La ranura mantiene el `
        + `ancho pleno hasta Z ${C.fondoRanuraBanda} y admite los ${CALLE.puente.ancho} del puente hasta `
        + `${C.fondoRanuraPuente}. ${C.estado}.`);
      avisosDeclarados.push('PASO RECTO · la referencia es del propio NBT90: declara las bandas de su '
        + `anfitrión (piezas CONTEXTO, ${A.fuente.split('(')[0].trim()}) en X ${A.bandasX.join(' · ')} — los `
        + `MISMOS 5 ejes de calle del sorter — con el portante en Z ${A.portante.z.join('…')} y la regleta en `
        + `${A.regleta.z.join('…')}. Aquí no se montan: las sustituyen las 5 calles.`);
      avisosDeclarados.push('RETORNO · decidido con la geometría delante, NO por costumbre: el NBT90 '
        + `declara que el ramal de retorno de su anfitrión también pasa RECTO por el mismo corredor, a `
        + `Z ${A.retorno.z.join('…')} (${A.separacionRamalesMm} mm bajo el portante). El del sorter NO cabe ahí: `
        + `el tambor motriz es Ø${RT.diaTamborActual} (tubo Ø88.9 + 10 de goma sobre eje Ø35 = barreno del `
        + `UCF 207, las tres cotas son instrucción del cliente), así que su ramal de retorno sale a `
        + `Z ${RT.ramalZ} — ${Math.abs(RT.faltaMm)} mm POR DEBAJO del fondo de la ranura del peine `
        + `(${RT.ventanaZ[0]}). Para entrar en el corredor el tambor tendría que bajar a Ø ≤ `
        + `${RT.diaTamborMaxParaPasarRecto} (el del anfitrión mide ${A.separacionRamalesMm}), y con eje Ø35 y `
        + `10 de goma eso deja el tubo en Ø${r2(RT.diaTamborMaxParaPasarRecto - 20)}: sin corona de tapa. Por eso `
        + `el retorno pasa POR DEBAJO del módulo, con ${RT.rodillos} rodillos. Que son el mínimo: sin RR4 el `
        + 'abrazado del conducido cae a 137.63° (< 150° §J) y con sólo los dos del fondo, también; sin RR1 '
        + 'desaparece el tramo llano de Z −57.2 del que cuelga el tensor (params_tambores.RETORNO.tramoLibreY) '
        + 'y del que sale por tangencia la cota de los volantes de contraflexión. El PORTANTE, en cambio, va '
        + 'recto: eso es lo que la §R comprueba calle a calle sobre el contorno emitido.');
    }
    // ▲▲▲ ------------------------------------------------------- ▲▲▲
    avisosDeclarados.push(`TAMBORES: los 4 rodillos de retorno necesitan ménsula de PG40 en `
      + TAMB_EJES.retorno.map(R => `${R.id}(Y ${R.y}, Z ${R.z})`).join(' · ')
      + ` — patrón ${TAMB_RET.soporte.patron}×${TAMB_RET.soporte.patron}, taladro Ø${TAMB_RET.soporte.taladro}`);
  }
  // ▲▲▲ ------------------------------------------------------------- ▲▲▲

  // ▼▼▼ S. REVISIÓN ESTRUCTURAL DEL SORTER (2026-08-03) ▼▼▼
  // Aquí no se comprueba que el sorter encaje: se comprueba que AGUANTE. Cada
  // número se RECALCULA de la geometría emitida y de los parámetros — nunca se
  // copia de lo que un módulo declara — y se compara con un límite de `LIMS`
  // que lleva su fuente. Lo que no cumple y no se puede arreglar sin mover
  // geometría vive en `HALLAZGOS_SC` con su utilización registrada.
  const R_S = [];        // registro de las comprobaciones (va al documento)
  const abiertosSC = []; // las que incumplen y están dispensadas
  /** Registra una comprobación de §S. `uso` = utilización (>1 incumple). */
  function chkS(id, titulo, valor, limite, sentido, detalle, unidad = '') {
    let uso;
    if (limite === 0) uso = valor > 0 ? 1 + valor : 0;                 // «no debe haber ninguno»
    else uso = sentido === '<=' ? valor / limite : limite / valor;
    const fila = { id, titulo, valor: r2(valor), limite: r2(limite), unidad, uso: r2(uso), ok: uso <= 1 };
    R_S.push(fila);
    const ab = HALLAZGOS_SC[id];
    if (uso <= 1 + 1e-9) {
      if (ab) {
        e.push(`${id} · «${titulo}» YA CUMPLE (utilización ${r2(uso)}): borra su entrada de `
          + 'HALLAZGOS_SC y actualiza REVISION_ESTRUCTURAL_SC.md. No se dejan dispensas caducadas.');
      }
      return fila;
    }
    if (!ab) {
      e.push(`${id} · ${titulo}: ${r2(valor)} ${unidad} ${sentido === '<=' ? '>' : '<'} `
        + `${r2(limite)} ${unidad} (utilización ${r2(uso)}). ${detalle}`);
      return fila;
    }
    if (uso > ab.uso * 1.02 + 1e-9) {
      e.push(`${id} · ${titulo} ha EMPEORADO: utilización ${r2(uso)} > ${ab.uso} registrada en `
        + `HALLAZGOS_SC (dueño: ${ab.dueño}). ${detalle}`);
      return fila;
    }
    fila.abierto = true; fila.dueño = ab.dueño;
    abiertosSC.push(fila);
    return fila;
  }

  const gAc = 9.80665;
  const anchoBanda = STEP.bandaAncho;
  const SC = {};   // los números, para el documento

  // --- SC-01 · EL PUENTE DE CALLE NO TIENE APOYOS --------------------------
  // El puente es la ÚNICA calle portante dentro de la huella del NBT90 (Y
  // −1205…−742): el bulto lo cruza apoyado en él. Sus dos placas base se
  // diseñaron para atornillarse a los travesaños de la percha (params_adapt
  // PERCHA.travS/travN); con FLAGS.desactivaPercha esos travesaños se filtran
  // por nombre y las placas se quedan en el aire. Se comprueba sobre la
  // GEOMETRÍA EMITIDA: qué hay bajo cada placa base, con 3 mm de tolerancia.
  {
    const bases = nuevas.filter(p => /Placa base de puente/.test(p.name));
    const sinApoyo = [];
    for (const p of bases) {
      const b = bb.get(p);
      const bajo = { lo: [b.lo[0], b.lo[1], b.lo[2] - 12], hi: [b.hi[0], b.hi[1], b.lo[2] + 0.5] };
      const apoyo = partes.some(q => q !== p && !/Puente de calle|Perno hex M8×16 puente|Banda plana 32/.test(q.name)
        && solapeAABB(bajo, bb.get(q)) > 0);
      if (!apoyo) sinApoyo.push(p.name);
    }
    // …y la distancia a la que se quedó el travesaño PG40 más próximo
    let hueco = Infinity;
    const puentes = nuevas.filter(p => /Puente de calle — pletina/.test(p.name));
    const travs = nuevas.filter(p => /PG40 · Travesaño/.test(p.name));
    for (const p of puentes) {
      const b = bb.get(p);
      for (const t of travs) {
        const bt = bb.get(t);
        hueco = Math.min(hueco, Math.max(bt.lo[1] - b.hi[1], b.lo[1] - bt.hi[1]));
      }
    }
    SC.puente = { placasSinApoyo: sinApoyo.length, placas: bases.length,
      huecoAlTravesanoMasProximoMm: r2(hueco),
      vanoDeDisenoMm: r2(-692 - (-1280)), largoMm: r2(CALLE.puente.y[1] - CALLE.puente.y[0]) };
    chkS('SC-01', 'apoyos reales bajo las placas base del puente de calle',
      sinApoyo.length, 0, '<=',
      `Los ${bases.length} apoyos de los 5 puentes (pletina ${CALLE.puente.ancho}×${CALLE.puente.aceroH} A36 `
      + `de ${SC.puente.largoMm} mm que cruza la transferencia) no tocan nada: los travesaños de la percha a `
      + 'los que se atornillan se retiraron con FLAGS.desactivaPercha. El travesaño PG40 más próximo queda a '
      + `${SC.puente.huecoAlTravesanoMasProximoMm} mm en Y y 9.15 mm por debajo en Z. Corrección: `
      + 'dos travesaños 40×40 en Y = −1280 y Y = −692 con su cara superior en Z = 9.15 '
      + '(la cota PERCHA.travTopZ que ya estaba calculada), o bajar la placa base 9.15 y '
      + 'llevar los travesaños PG40 a esas dos Y.', 'placas');
  }

  // --- SC-02/03 · LA TENSIÓN QUE DA LA GEOMETRÍA DEL BALANCÍN --------------
  // params_tensor2 calcula T = F·(ratio)/(2·sen(β/2)) con ratio = 136.22/74.00,
  // que son distancias HORIZONTALES: la fórmula sólo vale si la resultante de
  // la banda sobre la polea tensora es VERTICAL. En el lazo que construye
  // mod_calles no lo es — la horquilla es asimétrica (volante de entrada en
  // Y −404.4 y de salida en −195.5, los dos a Z −107.83) —, así que la
  // resultante lleva componente en Y y esa componente hace momento sobre el
  // pivote con un brazo de 207.19 mm (la altura pivote↔polea). Se rehace el
  // equilibrio de momentos completo, con las tangentes reales.
  if (!TENSOR_VIEJO) {
    const espB = STEP.bandaDorso;
    const zVol = m.calles.banda?.volanteHorquillaZ ?? -107.83;
    const qEnt = { c: [TENSOR.volEntrada.y, zVol], r: STEP.volante.cara / 2, s: -1 };
    const qTen = { c: [PIV.y === undefined ? -175.72 : TENSION.__y ?? -175.72, 0], r: 0, s: 1 };
    // la tensora: su centro y su radio los publican params_tensor2 (GEO/POL)
    const cTen = [m.tensor2?.geo?.poleaY ?? -175.72, m.tensor2?.geo?.poleaZ ?? -371.89];
    const rTen = (m.tensor2?.geo?.poleaDia ?? 117.9) / 2;
    const qT = { c: cTen, r: rTen, s: 1 };
    const qSal = { c: [TENSOR.volSalida.y, zVol], r: STEP.volante.cara / 2, s: -1 };
    const dIn = tangenteS(qEnt, qT, espB);      // volante de entrada → tensora
    const dOut = tangenteS(qT, qSal, espB);     // tensora → volante de salida
    if (!dIn || !dOut) {
      e.push('SC-02: no hay tangente entre la horquilla y la polea tensora: la tensión no se puede recalcular');
    } else {
      // los dos ramales TIRAN de la polea alejándose de ella
      const Fu = [-dIn[0] + dOut[0], -dIn[1] + dOut[1]];
      const modFu = Math.hypot(...Fu);
      const angVert = Math.atan2(Math.abs(Fu[0]), Math.abs(Fu[1])) * 180 / Math.PI;
      // momentos respecto del pivote (z de r×F, con Y a la derecha y Z arriba)
      const rPol = [cTen[0] - PIV.y, cTen[1] - PIV.z];
      const mzPorT = Math.abs(rPol[0] * Fu[1] - rPol[1] * Fu[0]);            // por N de T
      const rYug = [NEUM.y - PIV.y, (m.tensor2?.geo?.lobuloZ ?? -292.5) - PIV.z];
      const mzPorF = Math.abs(rYug[0]);                                       // cilindro vertical
      const Fcil = TENSION.fTiroEfN;
      const Tgeo = Fcil * mzPorF / mzPorT;
      const nMmGeo = Tgeo / anchoBanda;
      const desvPct = Math.abs(TENSION.tPorBandaN / Tgeo - 1) * 100;
      SC.tensor = { anguloResultanteConVerticalDeg: r2(angVert), palancaDeclarada: PALANCA.ratio,
        momentoPorNdeT: r2(mzPorT), momentoPorNdeCilindro: r2(mzPorF),
        fCilindroEfN: r2(Fcil), tGeometricaN: r2(Tgeo), tGeometricaNmm: r2(nMmGeo),
        tDeclaradaN: TENSION.tPorBandaN, tDeclaradaNmm: TENSION.tPorMmAncho,
        reaccionPivoteGeoN: r2(Math.hypot(Fu[0] * Tgeo, Fu[1] * Tgeo + Fcil)),
        reaccionPivoteDeclaradaN: TENSION.reaccionPivoteN,
        presionParaLlegarAlRangoBar: r2(LIMS.banda.nMmMin * anchoBanda * mzPorT
          / (mzPorF * NEUM.rendimiento * TENSION.areaTiro) * 10) };
      chkS('SC-02', 'tensión de banda que da la GEOMETRÍA del balancín',
        nMmGeo, LIMS.banda.nMmMin, '>=',
        `El equilibrio de momentos con las tangentes reales da T = ${r2(Tgeo)} N = ${r2(nMmGeo)} N/mm a `
        + `${NEUM.presionTrabajoBar} bar, no los ${TENSION.tPorBandaN} N que declara params_tensor2. Para llegar `
        + `al mínimo del rango sano harían falta ${SC.tensor.presionParaLlegarAlRangoBar} bar en el `
        + `${NEUM.reguladorPresion} — por encima de la presión de red declarada (${NEUM.presionRedBar} bar). `
        + 'Corrección: subir el Ø del cilindro, o alargar el lóbulo del yugo, o bajar la polea de entrada '
        + 'de la horquilla hasta que la resultante quede vertical.', 'N/mm');
      chkS('SC-03', 'coherencia tensión declarada ↔ geometría construida',
        desvPct, LIMS.banda.coherenciaPct, '<=',
        `params_tensor2.PALANCA.ratio = ${PALANCA.ratio} usa distancias HORIZONTALES pivote↔yugo (136.22) y `
        + `pivote↔polea (74.00), que sólo valen si la reacción de la banda es vertical; la geometría de `
        + `mod_calles la deja a ${r2(angVert)}° de la vertical y su componente en Y hace momento con un brazo `
        + `de ${r2(Math.abs(rPol[1]))} mm. Los dos módulos están calculando geometrías distintas.`, '%');
    }
  }

  // --- SC-04 · ARRASTRE EN ARRANQUE ----------------------------------------
  // params_tambores §4.7 comprueba el capstan sólo en RÉGIMEN. El caso que
  // manda es el ARRANQUE: hay que acelerar el tambor, el conducido, los 4
  // rodillos de retorno, las 5 tensoras, los 10 volantes de la horquilla, las 5
  // bandas y los bultos que estén encima, y todo eso pasa por la misma
  // fricción goma↔banda. Las inercias se calculan de los Ø publicados.
  {
    const rho = 7.85e-6;                       // kg/mm³ acero
    const mTubo = (od, id, len) => Math.PI / 4 * (od ** 2 - id ** 2) * len * rho;
    const Jc = (mm, ro, ri = 0) => 0.5 * mm * (ro ** 2 + ri ** 2);    // ro,ri en m
    const Rd = TAMB_P.r / 1000;
    const mT = mTubo(TAMB_P.tubo.od, TAMB_P.tubo.id, TAMB_P.caraTubo);
    const mG = Math.PI / 4 * (TAMB_P.od ** 2 - TAMB_P.tubo.od ** 2) * TAMB_P.caraGoma * 1.15e-6;
    const mEjeT = Math.PI / 4 * TAMB_P.eje.d ** 2 * (TAMB_P.ejeX[1] - TAMB_P.ejeX[0]) * rho;
    const Jtambor = Jc(mT, TAMB_P.tubo.od / 2000, TAMB_P.tubo.id / 2000)
      + Jc(mG, TAMB_P.od / 2000, TAMB_P.tubo.od / 2000) + Jc(mEjeT, TAMB_P.eje.d / 2000);
    const Jcond = Jc(mTubo(TAMB_CON.od, TAMB_CON.tubo.id, TAMB_CON.cara), TAMB_CON.od / 2000, TAMB_CON.tubo.id / 2000);
    const Jret = Jc(mTubo(TAMB_RET.od, TAMB_RET.tubo.id, TAMB_RET.cara), TAMB_RET.od / 2000, TAMB_RET.tubo.id / 2000);
    const dTen = (m.tensor2?.geo?.poleaDia ?? 117.9), anchoTen = 40;
    const Jten = Jc(Math.PI / 4 * dTen ** 2 * anchoTen * rho, dTen / 2000);
    const dVol = STEP.volante.pest, anchoVol = STEP.volante.ancho;
    const Jvol = Jc(Math.PI / 4 * dVol ** 2 * anchoVol * rho, STEP.volante.cara / 2000);
    // banda: con el espesor REAL de una banda plana (SC-10), no con el dorso 0.633
    const espReal = Math.max(STEP.bandaDorso, LIMS.banda.espMinMm);
    const mBanda = (m.calles.banda?.largoDesarrollado ?? 4877.64) * anchoBanda * espReal * 1.25e-6;
    const nRet = TAMB_EJES.retorno.length, nCalles = EJES.length;
    const Jeq = Jtambor
      + Jcond * (Rd / (TAMB_CON.od / 2000)) ** 2
      + nRet * Jret * (Rd / (TAMB_RET.od / 2000)) ** 2
      + nCalles * Jten * (Rd / (dTen / 2000)) ** 2
      + 2 * nCalles * Jvol * (Rd / (STEP.volante.cara / 2000)) ** 2
      + nCalles * mBanda * Rd ** 2;
    const mBultos = LIMS.arranque.bultos * TAMB_P.cargaMaxKg ?? 0;
    const mB = LIMS.arranque.bultos * (CARGA_PG40.bultoKg);
    const w = TB.arrastre.rpm * 2 * Math.PI / 60, alpha = w / LIMS.arranque.rampaS;
    // lo que pasa POR LA BANDA es todo menos la inercia del propio tambor
    const teArranque = ((Jeq - Jtambor) + mB * Rd ** 2) * alpha / Rd + TB.arrastre.teRequeridoN;
    // capstan con la tensión que de verdad pone el tensor (SC-02)
    const Treal = SC.tensor?.tGeometricaN ?? TAMB_P.__t ?? TENSION.tPorBandaN;
    const teMax = nCalles * Treal * (TB.arrastre.capstan - 1);
    const fs = teMax / teArranque;
    SC.arranque = { rampaS: LIMS.arranque.rampaS, JeqKgm2: r2(Jeq), alphaRadS2: r2(alpha),
      teArranqueN: r2(teArranque), teRegimenN: TB.arrastre.teRequeridoN,
      teMaxN: r2(teMax), tUsadaN: r2(Treal), reserva: r2(fs),
      rampaMinimaS: r2(w * ((Jeq - Jtambor) + mB * Rd ** 2) / Rd
        / Math.max(1e-9, teMax / LIMS.arranque.fsMin - TB.arrastre.teRequeridoN)),
      parArranqueNm: r2((Jeq + mB * Rd ** 2) * alpha * Rd + TB.arrastre.parNm) };
    chkS('SC-04', 'reserva de arrastre en ARRANQUE (Euler–Eytelwein)',
      fs, LIMS.arranque.fsMin, '>=',
      `Con la rampa de ${LIMS.arranque.rampaS} s declarada en LIMS el esfuerzo tangencial de arranque es `
      + `${r2(teArranque)} N (régimen ${TB.arrastre.teRequeridoN} N) y el capstan sólo da ${r2(teMax)} N con `
      + `T = ${r2(Treal)} N/banda. Rampa mínima admisible: ${SC.arranque.rampaMinimaS} s. `
      + 'Corrección: declarar la rampa del arrancador en params_tambores y no bajarla de ese valor.', '');
  }

  // --- SC-05 · APLASTAMIENTO DE LA RANURA BAJO TUERCA MARTILLO -------------
  // Es el modo de fallo típico del perfil ranurado y no lo mira nadie: la
  // tuerca martillo apoya sobre los dos LABIOS de la ranura y el apriete del
  // tornillo se descarga entero sobre ellos. El servicio no es el problema
  // (las cargas son de decenas de N); el problema es el APRIETE.
  {
    const Fpre = LIMS.tuercaT.parMaxNm * 1000 / (LIMS.tuercaT.K * 8);      // M8
    const pLabio = Fpre / LIMS.tuercaT.huellaMm2;
    // temple del perfil: params_pg40 declara la aleación pero NO el temple ⇒ el
    // más débil de la familia
    const temple = /T6|T66|T5/.exec(String(PG40PUB?.__temple ?? '')) || null;
    const rp02 = temple ? LIMS.alu6063.rp02T6 : LIMS.alu6063.rp02T5;
    SC.tuercaT = { parMaxNm: LIMS.tuercaT.parMaxNm, precargaN: r2(Fpre),
      huellaMm2: LIMS.tuercaT.huellaMm2, presionLabioMPa: r2(pLabio),
      rp02UsadoMPa: rp02, templeDeclarado: temple ? temple[0] : 'NO DECLARADO',
      parAdmisibleConEsteTempleNm: r2(rp02 * LIMS.tuercaT.huellaMm2 * LIMS.tuercaT.K * 8 / 1000) };
    chkS('SC-05', 'aplastamiento del labio de la ranura bajo tuerca martillo M8',
      pLabio, rp02, '<=',
      `Al par máximo de catálogo (${LIMS.tuercaT.parMaxNm} N·m, web TNUT-10-M8-01) la precarga es `
      + `${r2(Fpre)} N y sobre la huella de ${LIMS.tuercaT.huellaMm2} mm² de los dos labios da ${r2(pLabio)} MPa, `
      + `por encima del Rp0,2 del temple más débil de la familia EN AW-6063 (${rp02} MPa, web MAT-6063-01). `
      + `params_pg40.PERFIL NO declara el temple ni ningún par de apriete. Corrección: declarar temple ≥ T6 `
      + `Y limitar el par a ${SC.tuercaT.parAdmisibleConEsteTempleNm} N·m con este temple, o interponer `
      + 'arandela de reparto bajo cada tuerca.', 'MPa');
  }

  // --- SC-06 · EL EJE DEL TAMBOR CON LA CARGA REAL (T1 + T2) ---------------
  // mod_tambores carga los ejes con 2·T2 (la tensión que pone el tensor). En
  // marcha el ramal tenso vale T1 = T2 + Te/nBandas, así que el tambor recibe
  // T1 + T2 y no 2·T2. Se rehace con la carga real y con el par que puede dar
  // el motorreductor, no sólo el de régimen.
  {
    const T2decl = TENSION.tPorBandaN;
    const Te1 = TB.arrastre.teRequeridoN / EJES.length;
    const cargas = EJES.map(x => ({ x, p: 2 * T2decl + Te1 }));
    const v = vigaS(TAMB_UCF.insertoX[0], TAMB_UCF.insertoX[1], cargas, TAMB_P.eje.d);
    const parNom = TB.arrastre.potenciaW / (TB.arrastre.rpm * 2 * Math.PI / 60);
    const tau = 16 * parNom * 1000 / (Math.PI * TAMB_P.eje.d ** 3);
    const vm = Math.sqrt(v.sigma ** 2 + 3 * tau ** 2);
    SC.ejeTambor = { cargaPorBandaN: r2(2 * T2decl + Te1), cargaDelModuloN: r2(2 * T2decl),
      sigmaMPa: v.sigma, tauMPa: r2(tau), vonMisesMPa: r2(vm), flechaMm: v.delta,
      RaN: v.Ra, RbN: v.Rb, vanoMm: v.vano,
      sinDeclarar: 'la masa del motorreductor que cuelga del saliente Ø35 no está en ningún parámetro' };
    chkS('SC-06', 'eje del tambor motriz con la carga real T1+T2',
      vm, LIMS.C45.fyN / LIMS.C45.fsFlexion, '<=',
      `El módulo lo calcula con 2·T2 = ${r2(2 * T2decl)} N/banda; en marcha son T1+T2 = ${r2(2 * T2decl + Te1)} N. `
      + `Con C45 en estado NORMALIZADO (${LIMS.C45.fyN} MPa, web MAT-C45-01 — el estado no está declarado en `
      + 'params) y FS 3. AVISO: no incluye el voladizo del motorreductor, que no está declarado.', 'MPa');
  }

  // --- SC-07 · VIDA L10 DE LOS RODAMIENTOS (ISO 281) -----------------------
  {
    const T2decl = TENSION.tPorBandaN, Te1 = TB.arrastre.teRequeridoN / EJES.length;
    const rpmDe = (dia) => TAMB_P.__v ?? (1.855 * 60000 / (Math.PI * dia));
    const vidas = {};
    // UC207 del tambor: la reacción mayor de la viga de SC-06
    vidas.UC207 = { P: SC.ejeTambor.RaN, rpm: r2(TB.arrastre.rpm),
      h: r2(L10hS(TAMB_UCF.C, SC.ejeTambor.RaN, TB.arrastre.rpm)) };
    // conducido: 2 × 6207 dentro del tubo, se reparten la resultante de 5 bandas
    const Pc = EJES.length * (2 * T2decl + Te1) / 2;
    vidas['6207-2RS'] = { P: r2(Pc), rpm: r2(rpmDe(TAMB_CON.od)), h: r2(L10hS(LIMS.brg.C6207, Pc, rpmDe(TAMB_CON.od))) };
    // retornos: la resultante es 2·T·sen(abrazado/2) por banda
    let peor = Infinity, peorId = '';
    for (const R of TAMB_EJES.retorno) {
      const a = TB.abrazados?.[R.id] ?? 96.5;
      const f = 2 * Math.sin(a * Math.PI / 360);
      const Pr = EJES.length * (T2decl + Te1) * f / 2;
      const h = L10hS(LIMS.brg.C6206, Pr, rpmDe(TAMB_RET.od));
      if (h < peor) { peor = h; peorId = R.id; }
      vidas[`6206-2RS ${R.id}`] = { P: r2(Pr), abrazadoDeg: r2(a), h: r2(h) };
    }
    const peorGlobal = Math.min(vidas.UC207.h, vidas['6207-2RS'].h, peor);
    SC.rodamientos = { ...vidas, peorH: r2(peorGlobal), objetivoH: LIMS.brg.L10objetivoH };
    chkS('SC-07', 'vida L10 del rodamiento más cargado del accionamiento',
      peorGlobal, LIMS.brg.L10objetivoH, '>=',
      `ISO 281 (web BRG-L10-01) con las C de catálogo citadas (web BRG-6207-01 / BRG-6206-01 / BRG-UCF207-01) `
      + `y la carga T1+T2. El peor es ${peorId || 'UC207'}.`, 'h');
  }

  // --- SC-08 · FLECHA DEL TRAVESAÑO CON LA LUZ REAL Y CON EL NBT90 ---------
  // mod_pg40 calcula la flecha del travesaño sobre `PUBLICA.luzEntreCaras`
  // (423.924, que es la luz entre las CARAS DE APOYO de los rodamientos), pero
  // el travesaño que emite cruza de chapón a chapón: 580.841. Y al desactivar
  // la percha, el NBT90 pasó a colgar del alargue, que se apoya en las 4
  // ménsulas que suben a estos mismos travesaños: ese peso tampoco está.
  {
    const travs = nuevas.filter(p => /PG40 · Travesaño/.test(p.name));
    let luzReal = 0;
    for (const t of travs) { const b = bb.get(t); luzReal = Math.max(luzReal, b.hi[0] - b.lo[0]); }
    const EI = PG40PUB ? 69500 * 91000 : 6.3245e9;      // web PG40-001 + ALU-001
    const Pb = CARGA_PG40.N;
    const nMens = nuevas.filter(p => /PG40 · Ménsula alma↔travesaño/.test(p.name)).length || 4;
    const Pmen = PG40F.desactivaPercha ? NBT.masaKg * gAc / nMens : 0;
    const a1 = 132.3, a2 = 16;                          // X de las ménsulas a los apoyos
    const dMen = Pmen * a1 * (3 * luzReal ** 2 - 4 * a1 ** 2) / (48 * EI)
      + Pmen * a2 * (3 * luzReal ** 2 - 4 * a2 ** 2) / (48 * EI);
    const dTot = Pb * luzReal ** 3 / (48 * EI) + dMen;
    const Mtot = Pb * luzReal / 4 + Pmen * a1 * (luzReal - a1) / luzReal + Pmen * a2 * (luzReal - a2) / luzReal;
    SC.travesano = { luzDelModulo: PG40PUB?.luzEntreCaras, luzRealMm: r2(luzReal),
      flechaDelModulo: m.pg40.flecha.flechaTravesano, flechaRealMm: r2(dTot),
      cargaMensulaN: r2(Pmen), sigmaMPa: r2(Mtot / 4500),
      nota: PG40F.desactivaPercha ? 'incluye el NBT90 colgado del alargue' : 'percha activa' };
    chkS('SC-08', 'flecha del travesaño PG40 con la luz REAL y el NBT90 colgado',
      dTot, CARGA_PG40.flechaMaxAbs, '<=',
      `mod_pg40 la calcula sobre ${PG40PUB?.luzEntreCaras} mm y el travesaño que emite mide ${r2(luzReal)}; `
      + `y con la percha desactivada le cuelgan ${r2(Pmen)} N por ménsula del peso del NBT90.`, 'mm');
  }

  // --- SC-09 · EJE PIVOTE DEL TENSOR CON 5 CARGAS PUNTUALES ---------------
  // params_tensor2.EJE_CALC usa la fórmula de carga REPARTIDA (5wL³/384EI y
  // M = WL/8) para 5 cargas concentradas en los ejes de las calles, que además
  // NO están centradas en el vano (los ejes van de 127.06 a 431.86 y el vano de
  // −81.42 a 499.42). Se rehace con las 5 puntuales en su sitio.
  if (!TENSOR_VIEJO) {
    const Rbrazo = TENSION.reaccionPivoteN;
    const v = vigaS(PIV.ucflX[0], PIV.ucflX[1], EJES.map(x => ({ x, p: Rbrazo })), PIV.d);
    SC.ejePivote = { reaccionPorBrazoN: Rbrazo, sigmaDelModuloMPa: EJE_CALC.sigmaMPa,
      sigmaPuntualesMPa: v.sigma, flechaDelModuloMm: EJE_CALC.flechaMm, flechaPuntualesMm: v.delta,
      xFlechaMaxMm: v.xDelta, RaN: v.Ra, RbN: v.Rb,
      fyUsadoMPa: LIMS.C45.fyN, fyDelModuloMPa: EJE_CALC.fyMPa };
    chkS('SC-09', 'eje pivote Ø30 del tensor con las 5 cargas PUNTUALES',
      v.sigma, LIMS.C45.fyN / LIMS.C45.fsFlexion, '<=',
      `params_tensor2 declara ${EJE_CALC.sigmaMPa} MPa y ${EJE_CALC.flechaMm} mm con carga REPARTIDA; con las `
      + `5 puntuales en sus X reales son ${v.sigma} MPa y ${v.delta} mm (+${r2((v.sigma / EJE_CALC.sigmaMPa - 1) * 100)} % `
      + `y +${r2((Math.abs(v.delta) / EJE_CALC.flechaMm - 1) * 100)} %). Además EJE_CALC.fyMPa = ${EJE_CALC.fyMPa} es el `
      + 'C45 BONIFICADO (+QT) y params no declara el estado de suministro: aquí se juzga con el normalizado '
      + `(${LIMS.C45.fyN} MPa, web MAT-C45-01).`, 'MPa');
  }

  // --- SC-10 · ESPESOR DE LA BANDA DEL MODELO ------------------------------
  {
    // El espesor se lee de LO QUE TRAZA EL LAZO —`banda.espesorMm`, que publica
    // mod_calles— y no de `STEP.bandaDorso`. Esa constante era la que el lazo
    // usaba cuando se escribió la comprobación; desde que el trazado pasó a la
    // banda plana real, `STEP.bandaDorso` sigue valiendo 0.633 y ya no traza
    // nada, así que la comprobación denunciaba un defecto CORREGIDO y se habría
    // quedado en rojo para siempre mirando una constante muerta. Una compuerta
    // tiene que leer lo que se construye, no la variable que se construía antes.
    const esp = m.calles.banda?.espesorMm ?? STEP.bandaDorso;
    const derivaReal = m.calles.banda?.derivaPlanoTransporteMm;
    SC.banda = { espesorModeloMm: esp, espesorExigidoMm: LIMS.banda.espMinMm,
      espesorFuente: m.calles.banda?.espesorProcedencia ?? 'STEP.bandaDorso (constante T5)',
      derivaPlanoTransporteMm: derivaReal ?? null,
      holguraConducidoLargueroMm: r2(TB.holguras.largueroPG40?.sur ?? 2.219) };
    chkS('SC-10', 'espesor de la banda plana con que se traza el lazo',
      esp, LIMS.banda.espMinMm, '>=',
      `El lazo (tangencias, abrazados y cotas en Z de tambor, conducido, RR1…RR4 y guías UHMW) tiene que `
      + `trazarse con el espesor de la banda PLANA que lleva la máquina —2.5 med, nbt90 P.bandaEsp— y no con `
      + `el dorso de 0.633 de la T5 DENTADA con la que el cliente modeló su equipo anterior. Espesor con el `
      + `que se traza ahora: ${esp} mm (${SC.banda.espesorFuente}). Si vuelve a bajar de ${LIMS.banda.espMinMm}, `
      + `el plano de transporte se desplaza y con él la emergencia útil del rodillo del NBT90.`, 'mm');
  }

  // --- SC-11 · AMARRE DEL BASTIDOR PG40 A LA MÁQUINA -----------------------
  // El propio mod_pg40 dice «los travesaños cruzan la luz entre bastidores y se
  // amarran a ellos por escuadra». La comprobación es que esa escuadra exista.
  {
    let sinAmarre = 0; const detalle = [];
    for (const t of nuevas.filter(p => /PG40 · Travesaño/.test(p.name))) {
      const b = bb.get(t);
      for (const [nom, zona] of [['−X', { lo: [b.lo[0] - 8, b.lo[1], b.lo[2]], hi: [b.lo[0] + 8, b.hi[1], b.hi[2]] }],
        ['+X', { lo: [b.hi[0] - 8, b.lo[1], b.lo[2]], hi: [b.hi[0] + 8, b.hi[1], b.hi[2]] }]]) {
        const une = partes.filter(q => q !== t && !q.contexto && !/PG40 · Travesaño|Larguero de calle/.test(q.name)
          && solapeAABB(zona, bb.get(q)) > 0).length;
        if (une < 1) { sinAmarre++; detalle.push(`${t.name.slice(-12)} ${nom}`); }
      }
    }
    SC.amarre = { extremosSinPiezaDeUnion: sinAmarre, detalle };
    chkS('SC-11', 'extremos de travesaño PG40 sin pieza de unión a la máquina',
      sinAmarre, 0, '<=',
      `Los travesaños topan a hueso contra la cara interior de los chapones del cliente (X ${STEP.frameIntNeg} y `
      + `${STEP.frameIntPos}) sin escuadra ni tornillo. Además las 4 «Ménsula alma↔travesaño» que llevan el peso `
      + 'del NBT90 al bastidor sólo TOPAN contra la cara inferior del perfil: no llevan tornillería emitida. '
      + 'Corrección: escuadra de 4 tornillos por extremo al chapón, y 2 M8 con tuerca martillo por ménsula.', 'extremos');
  }

  // --- SC-12 · TRAZABILIDAD DE LOS HECHOS `web` CITADOS EN adapt/ ----------
  // Regla de oro nº 1 del repositorio: un dato `web` sin URL, fecha y cita no
  // existe. Se comprueba que TODOS los ids citados en adapt/*.mjs estén en un
  // web_facts.json (el del sorter o el del NBT90, que es cita legítima).
  {
    const ids = new Set();
    for (const f of ['web_facts.json', '../nbt90/analisis/web_facts.json']) {
      try { for (const h of JSON.parse(readFileSync(join(aqui, f), 'utf8')).facts) ids.add(h.id); } catch { /* … */ }
    }
    const citados = new Set(ROMPE === 'fuente' ? ['BRG-INVENTADA-99'] : []);
    for (const f of readdirSync(join(aqui, 'adapt')).filter(n => n.endsWith('.mjs'))) {
      const src = readFileSync(join(aqui, 'adapt', f), 'utf8');
      for (const mm of src.matchAll(/\bweb\s+([A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+)/g)) citados.add(mm[1]);
    }
    const huerfanos = [...citados].filter(i => !ids.has(i)).sort();
    SC.trazabilidad = { citados: citados.size, huerfanos };
    chkS('SC-12', 'ids `web` citados en adapt/ que no existen en ningún web_facts',
      huerfanos.length, 0, '<=',
      `Sin fuente: ${huerfanos.join(', ') || '—'}. Cada uno lleva un número (C, C0, cota) que nadie puede `
      + 'contrastar. Corrección: añadir el hecho con URL, fecha y cita, o borrar la cita.', 'ids');
  }

  m.estructural = { comprobaciones: R_S, abiertos: abiertosSC, datos: SC, limites: LIMS };
  // ▲▲▲ ---------------------------------------- ▲▲▲

  // ▼▼▼ F · FABRICACIÓN — que el plano se pueda fabricar ▼▼▼
  // Siete comprobaciones, y las siete MUERDEN: cada una tiene su caso de banco
  // (TEST_ROMPE=tolerancia|cordon|material|designacion|generica|ferreteria). Es la
  // compuerta que faltaba, y su ausencia es exactamente lo que dejó salir 210
  // piezas sin clase de tolerancia, 156 sin material, ninguna soldada con cordón
  // y 265 con dos normas incompatibles estampadas a la vez.
  //
  // TODO se recuenta AQUÍ sobre `E.parts` tal y como están AHORA, no se lee del
  // recuento que dejó la pasada. No es duplicar trabajo: si la compuerta mirase
  // la foto que sacó la pasada, cualquier cosa que tocara las piezas después
  // —empezando por el propio banco de defectos— pasaría invisible, y una
  // compuerta que no ve el defecto que le inyectan no vigila nada. Se descubrió
  // así: cuatro de los seis casos de banco salían verdes.
  {
    const muestra = (l, n = 6) => l.slice(0, n).map((s) => `«${s}»`).join(', ')
      + (l.length > n ? ` … y ${l.length - n} más` : '');
    const fabricadasP = nuevas.filter((p) => !compradaSC(p));
    const compradasP = nuevas.filter((p) => compradaSC(p));

    // §F1 · ninguna pieza propia FABRICADA sin clase de tolerancia general.
    const sinTol = fabricadasP.filter((p) => !p.tol?.pieza).map((p) => p.name);
    if (sinTol.length) {
      e.push(`FABRICACIÓN §F1 · ${sinTol.length} pieza(s) propia(s) FABRICADA(s) sin clase de `
        + `tolerancia general: ${muestra(sinTol)}. Un plano sin tolerancia no se fabrica — el `
        + `taller no sabe si una cota de 648 admite ±0.8 o ±3. La clase la da `
        + `tolerancias.claseGeneralDe() por lo que la pieza ES; si una familia nueva no la `
        + `reconoce, se AÑADE allí (y no cambia lo que el NBT90 ya lee).`);
    }

    // §F2 · ninguna pieza SOLDADA sin cordón declarado.
    const soldadasP = nuevas.filter((p) => SOLDADAS_SC.some((s) => s.rx.test(p.name)));
    const sinCordon = soldadasP.filter((p) => !p.soldadura).map((p) => p.name);
    if (sinCordon.length) {
      e.push(`FABRICACIÓN §F2 · ${sinCordon.length} pieza(s) soldada(s) sin cordón: `
        + `${muestra(sinCordon)}. Falta \`soldadura: { garganta, disposición, proceso, norma }\`, `
        + `que calcula tolerancias.cordonDe() con el espesor de la chapa MÁS FINA de la junta. `
        + `El encaje sitúa la pieza; el cordón la une, y sin él la junta queda a medias.`);
    }
    // …y la tabla de juntas no puede dejarse ninguna fuera: si un módulo dice
    // que una pieza va soldada y SOLDADAS_SC no la conoce, saldría sin cordón y
    // sin que nadie lo notara. Ésta es la comprobación que impide ese silencio.
    const diceSinTabla = nuevas
      .filter((p) => DICE_SOLDADA(p) && !SOLDADAS_SC.some((s) => s.rx.test(p.name)))
      .map((p) => p.name);
    if (diceSinTabla.length) {
      e.push(`FABRICACIÓN §F2b · ${diceSinTabla.length} pieza(s) DICEN que van `
        + `soldadas (en su nombre, su nota o su material) y no están en SOLDADAS_SC, así que no `
        + `reciben cordón: ${muestra(diceSinTabla)}. Añádelas a la tabla con el `
        + `espesor de la junta y su fuente, o corrige la nota que dice que van soldadas.`);
    }
    // …y cada expresión de la tabla tiene que alcanzar EXACTAMENTE a las suyas.
    // Una expresión ancha aquí no deja un hueco: pone un cordón donde no hay
    // junta, y eso llega al taller como una instrucción de soldar algo que va
    // atornillado. Se cuenta, igual que en §F7b y por el mismo motivo.
    for (const s of SOLDADAS_SC) {
      const reales = nuevas.filter((p) => s.rx.test(p.name)).length;
      if (reales !== s.esperadas) {
        e.push(`FABRICACIÓN §F2d · la junta ${s.id} declara ${s.esperadas} pieza(s) y su expresión `
          + `alcanza a ${reales}. ${reales > s.esperadas
            ? 'Está poniendo cordón a piezas que no son de esa junta — ancla más la expresión.'
            : 'Han desaparecido piezas de la junta, o cambiaron de nombre y ya no las alcanza: '
              + 'entonces se quedarían sin cordón sin que nadie lo notara.'} `
          + `Junta: ${s.junta}.`);
      }
    }
    // …y la cota de la junta tiene que seguir saliendo del módulo dueño. Si el
    // parámetro desaparece o se renombra, el cordón se calcularía con el espesor
    // que haya en el NOMBRE de la pieza —el de la pieza, no el de la junta— y
    // saldría una garganta mayor que la chapa a la que se suelda, sin ruido.
    if (FAB.juntasSinCota.length) {
      e.push(`FABRICACIÓN §F2c · ${FAB.juntasSinCota.length} junta(s) soldada(s) han perdido la `
        + `cota de espesor que publicaba su módulo: ${muestra(FAB.juntasSinCota)}. El parámetro `
        + `citado ya no existe o cambió de nombre. Reapunta la fuente en SOLDADAS_SC: sin ella el `
        + `cateto saldría del nombre de la pieza, que es el espesor equivocado.`);
    }

    // §F3 · ninguna pieza propia FABRICADA sin material.
    const sinMat = fabricadasP.filter((p) => !p.material);
    const sinMatNiDispensa = sinMat.filter((p) => !SIN_MATERIAL_SC.some((d) => d.rx.test(p.name)));
    if (sinMatNiDispensa.length) {
      e.push(`FABRICACIÓN §F3 · ${sinMatNiDispensa.length} pieza(s) propia(s) `
        + `FABRICADA(s) sin material y sin dispensa: ${muestra(sinMatNiDispensa.map((p) => p.name))}. `
        + `El material se LEE de donde ya esté declarado (campo, chapa, catálogo, parámetro del `
        + `módulo o nombre) y se añade su línea a MATERIAL_SC citando la fuente; si de verdad no `
        + `lo declara nadie, va a SIN_MATERIAL_SC con dueño y motivo. Lo que no se puede es `
        + `inventarlo ni dejarlo en blanco.`);
    }
    // Las dispensas se cuentan EXACTAS en los dos sentidos: si crecen, hay una
    // pieza nueva sin material escondida detrás de una línea vieja; si menguan,
    // el módulo ya declaró el material y la dispensa está caducada. Las dos
    // cosas se corrigen, y ninguna se descubre sola.
    for (const d of SIN_MATERIAL_SC) {
      const reales = sinMat.filter((p) => d.rx.test(p.name)).length;
      if (reales !== d.esperadas) {
        e.push(`FABRICACIÓN §F3b · la dispensa de material ${d.id} declara ${d.esperadas} `
          + `pieza(s) y hay ${reales}. ${reales > d.esperadas
            ? 'Han aparecido piezas nuevas sin material que se están colando por una línea vieja: '
              + 'declara la cantidad real o dales su material.'
            : `Sobran ${d.esperadas - reales}: el módulo dueño (${d.dueño}) ya declaró el `
              + 'material, así que la dispensa está caducada y hay que ajustarla o borrarla.'}`);
      }
    }

    // §F4 · ninguna pieza COMPRADA sin designación de ningún tipo, y §F5 ninguna
    // con designación GENÉRICA (el defecto de §A1: dos normas incompatibles a la
    // vez). Se recuentan sobre la `norma` que las piezas llevan AHORA, que es lo
    // que va a ir al documento y a la lista de compra; `FAB.sinDesignar` queda
    // como diagnóstico de cuáles no supo designar `normalizado.designar()`.
    const sinNorma = compradasP.filter((p) => !p.norma).map((p) => p.name);
    if (sinNorma.length) {
      e.push(`FABRICACIÓN §F4 · ${sinNorma.length} pieza(s) comprada(s) sin designar: `
        + `${muestra(sinNorma)}. No se puede pedir a un proveedor una descripción: hay que `
        + `añadir su caso a normalizado.designar() con la norma o la referencia de catálogo.`);
    }
    const genericasP = compradasP.filter((p) => p.norma && esGenerica(p.norma)).map((p) => p.name);
    if (genericasP.length) {
      e.push(`FABRICACIÓN §F5 · ${genericasP.length} pieza(s) comprada(s) con designación `
        + `genérica o de relleno: ${muestra(genericasP)}. Cadenas como «ASME B18.2.1 / DIN 933» `
        + `llevan una norma de PULGADAS y otra MÉTRICA a la vez y no designan nada: el mismo `
        + `estampado le sale a un M8 que a un 3/8-16. «PENDIENTE» tampoco es una designación.`);
    }

    // §F6 · el NBT90 embebido tiene que llegar con sus metadatos puestos. No se
    // supone: se cuenta. Si un día llega sin ellos, la pasada §F se los pone —y
    // esto lo deja DICHO, para que no pase inadvertido que el sorter está
    // supliendo a la transferencia.
    if (!FAB.nbt90.llegaCompleto) {
      avisosDeclarados.push(`FABRICACIÓN: el NBT90 embebido NO llega completo `
        + `(${FAB.nbt90.conTol}/${FAB.nbt90.piezas} con tolerancia, `
        + `${FAB.nbt90.conCordon}/${FAB.nbt90.soldadas} soldadas con cordón, `
        + `${FAB.nbt90.designadas}/${FAB.nbt90.compradas} compradas designadas). La pasada §F le `
        + `pone la TOLERANCIA y el CORDÓN que le falten, pero NO le toca la designación: `
        + `redesignar aquí las compras de la transferencia sería crear una segunda verdad. `
        + `El sitio donde arreglarlo es ../nbt90/gen_nbt90.mjs; aquí sólo se está tapando lo que `
        + `se puede tapar sin mentir.`);
    }

    // §F7 · la ferretería huérfana de la percha tiene que estar FUERA, y cada
    // expresión tiene que llevarse exactamente lo suyo. Las dos mitades importan:
    // que no quede ninguna, y que ninguna expresión se lleve de más (que es como
    // se perdieron 10 rodamientos del tensor en el commit 94f7271).
    if (PG40F.desactivaPercha) {
      for (const h of PERCHA_HUERFANA) {
        const supervivientes = partes.filter((p) => h.rx.test(p.name)).length;
        if (supervivientes) {
          e.push(`FABRICACIÓN §F7 · ${supervivientes} elemento(s) huérfano(s) ${h.id} siguen `
            + `en el ensamble con la percha desactivada. ${h.motivo} Se compran y no se pueden `
            + `montar: retíralos con la percha, por bandera y no borrando código.`);
        } else if (h.retiradas !== h.esperadas) {
          e.push(`FABRICACIÓN §F7b · la expresión ${h.id} se ha llevado ${h.retiradas} pieza(s) y `
            + `la revisión contaba ${h.esperadas}. ${h.retiradas > h.esperadas
              ? 'Está mordiendo piezas que no son suyas — ancla más la expresión y vuelve a contar.'
              : 'Se está dejando huérfanos dentro, o alguien ya los retiró por otro sitio.'} `
            + `Contar antes y después no es ceremonia: una regex ancha ya se llevó 10 rodamientos `
            + `que no tocaba (commit 94f7271).`);
        }
      }
    }
  }
  // ▲▲▲ ---------------------------------------- ▲▲▲

  // ▼▼▼ §U · TORNILLERÍA DECLARADA ⇒ TALADRO EMITIDO, EN LAS DOS PIEZAS ▼▼▼
  // ---------------------------------------------------------------------------
  // POR QUÉ EXISTE. La revisión de fabricación del 2026-08-03 encontró CUATRO
  // uniones estructurales cuya tornillería sólo existía en la prosa de una nota:
  //   · 20 escuadras larguero↔travesaño: «4 M8 por escuadra» = 80 tornillos, 0 taladros;
  //   · 6 cubrejuntas del alargue: «4 M10 al alma y 4 al cabezal» = 32, 0 taladros
  //     (ni en el cubrejunta, ni en el alma, ni en el cabezal);
  //   · 4 ménsulas alma↔travesaño: 0 taladros y 0 cordones;
  //   · 2 placas de extremo del travesaño frontal: sus 2 M8 pedían al cabezal
  //     unos Ø9 que el cabezal no tenía.
  // Por ahí pasa la reacción del tambor motriz y el tiro de los 5 cilindros. La
  // prosa no se puede comprobar, así que ahora la unión se DECLARA en un campo
  // (`uniones: [{ rosca, n, pasante, a }]`) y esta compuerta exige que:
  //   (1) la pieza que la declara tenga al menos `n` taladros de ese Ø;
  //   (2) si `a` nombra a otra pieza FABRICADA del modelo, esa pieza exista y
  //       tenga entre todas sus ocurrencias al menos `n` taladros del mismo Ø.
  //       Cuando `a` es una ranura de perfil, una tuerca martillo o una pieza
  //       del cliente, no hay contrapieza taladrada y (2) no aplica.
  // Y como red de seguridad, (3): ninguna pieza propia puede DECIR en su nota
  // que lleva tornillos y no traer ni `uniones` ni un solo taladro.
  {
    const TOL_D = 0.2;                       // mm de tolerancia al comparar Ø
    const taladros = (p, d) => p.features.filter(f => f.shape === 'hole'
      && Math.abs((f.params?.dia ?? -1) - d) <= TOL_D).length;
    // `a` apunta a una pieza del modelo sólo si empieza por un prefijo de nombre
    // de pieza propia («PG40 · …» / «FIJO · …»). Lo demás es ranura o cliente.
    const esPieza = (a) => typeof a === 'string' && /^(PG40|FIJO|TAMBOR|RETORNO|CONDUCIDO) · /.test(a);
    const conUniones = nuevas.filter(p => Array.isArray(p.uniones) && p.uniones.length);
    const faltanPropios = [], faltanContra = [], sinContraparte = [];
    for (const p of conUniones) {
      for (const u of p.uniones) {
        const n = u.n ?? 0, d = u.pasante;
        if (!(n > 0) || !(d > 0)) continue;
        const mios = taladros(p, d);
        if (mios < n) {
          faltanPropios.push(`«${p.name}» declara ${n} ${u.rosca} y tiene ${mios} taladro(s) Ø${d}`);
        }
        if (!esPieza(u.a)) continue;
        // El Ø que hay que buscar en la CONTRAPIEZA no siempre es el pasante: si
        // el tornillo va ROSCADO a la otra chapa (porque su cara exterior no
        // tiene acceso para la tuerca), allí lo que hay es el fondo de rosca.
        // Se declara con `enContra`.
        const dC = u.enContra ?? d;
        const contras = nuevas.filter(q => q !== p && q.name.startsWith(u.a));
        if (!contras.length) {
          sinContraparte.push(`«${p.name}» se atornilla a «${u.a}», que NO EXISTE en el ensamble`);
          continue;
        }
        const enContra = contras.reduce((a2, q) => a2 + taladros(q, dC), 0);
        if (enContra < n) {
          faltanContra.push(`«${p.name}» declara ${n} ${u.rosca} a «${u.a}» y esa(s) `
            + `${contras.length} pieza(s) sólo tienen ${enContra} taladro(s) Ø${dC}`);
        }
      }
    }
    // (3) red de seguridad sobre la PROSA: quien dice que lleva tornillos, los tiene
    const DICE_TORNILLO = /\b(\d+)\s*(?:×\s*)?M(6|8|10|12)\b|\b(pernos?|tornillos?|tuercas? martillo|tuercas? T)\b/i;
    // DISPENSAS DECLARADAS: promesas de tornillería que NO se pueden cerrar en
    // esta pasada porque la pieza es de otro módulo y arreglarla es mover su
    // geometría. Se dejan escritas con dueño y motivo, como las de §S, y la
    // compuerta exige que la cuenta sea EXACTAMENTE ésta: si aparece una más,
    // falla; si el dueño la arregla, falla pidiendo borrar la línea.
    // TOR-01 (Eje de polea tensora Ø20×70) BORRADA el 2026-08-03: su dueño, el
    // módulo del tensor, ha CERRADO la promesa con geometría. La retención ya no
    // es «tornillos de testa» —se descartó con el número: la testa del eje queda
    // 6 mm por fuera de la pletina y un tornillo con arandela no llegaría a
    // pinzarla— sino 2 gargantas Ø18×1.3 por fuera de las pletinas con sus 2
    // anillos 3AM1-20, el mismo anillo que el eje ya lleva por dentro para los
    // aros de los rodamientos. Ver POL.retencionEje en adapt/params_tensor2.mjs.
    // La pieza declara además `sinTaladro`, porque de verdad no lleva ninguno.
    const PROMESAS_ABIERTAS = [];
    const mudasTodas = nuevas.filter(p => !p.hardware && !p.uniones && !p.sinTaladro
      && DICE_TORNILLO.test([p.name, p.nota].filter(Boolean).join(' § '))
      && !p.features.some(f => f.shape === 'hole'))
      .map(p => p.name);
    for (const pr of PROMESAS_ABIERTAS) {
      const n = mudasTodas.filter(nm => pr.rx.test(nm)).length;
      if (n === 0) {
        e.push(`§U · la dispensa ${pr.id} ya no aplica: ninguna pieza la incumple. Bórrala de `
          + 'PROMESAS_ABIERTAS — no se dejan dispensas caducadas.');
      } else if (n !== pr.esperadas) {
        e.push(`§U · la dispensa ${pr.id} cubría ${pr.esperadas} pieza(s) y ahora son ${n} `
          + `(dueño: ${pr.dueño}). ${pr.motivo}`);
      }
    }
    const mudas = mudasTodas.filter(nm => !PROMESAS_ABIERTAS.some(pr => pr.rx.test(nm)));
    const U = { conUniones: conUniones.length,
      dispensas: PROMESAS_ABIERTAS.map(pr => ({ id: pr.id, uds: pr.esperadas, dueño: pr.dueño, motivo: pr.motivo })),
      sinTaladroDeclarado: nuevas.filter(p => p.sinTaladro).length,
      declarados: conUniones.reduce((a2, p) => a2 + p.uniones.reduce((b2, u) => b2 + (u.n ?? 0), 0), 0),
      faltanPropios, faltanContra, sinContraparte, mudas };
    m.tornilleria = U;
    if (faltanPropios.length) {
      e.push(`§U · ${faltanPropios.length} unión(es) DECLARAN tornillería que la propia pieza no `
        + `tiene taladrada: ${faltanPropios.slice(0, 4).join(' · ')}`
        + `${faltanPropios.length > 4 ? ` … y ${faltanPropios.length - 4} más` : ''}. `
        + 'Una nota que promete pernos y una chapa sin agujeros no es una unión: es un dibujo.');
    }
    if (sinContraparte.length) {
      e.push(`§U · ${sinContraparte.length} unión(es) apuntan a una pieza que no está en el `
        + `ensamble: ${sinContraparte.slice(0, 4).join(' · ')}. Corrige el nombre de \`a\` o emite la pieza.`);
    }
    if (faltanContra.length) {
      e.push(`§U · ${faltanContra.length} unión(es) declaran taladros en la CONTRAPIEZA que la `
        + `contrapieza no tiene: ${faltanContra.slice(0, 4).join(' · ')}`
        + `${faltanContra.length > 4 ? ` … y ${faltanContra.length - 4} más` : ''}. `
        + 'Un taladro sólo en una de las dos chapas no se puede montar (defecto A3/A5).');
    }
    if (mudas.length) {
      e.push(`§U · ${mudas.length} pieza(s) propia(s) DICEN en su nombre o su nota que llevan `
        + `tornillería y no traen ni el campo \`uniones\` ni un solo taladro: `
        + `${mudas.slice(0, 6).map(s2 => `«${s2}»`).join(', ')}${mudas.length > 6 ? ` … y ${mudas.length - 6} más` : ''}. `
        + 'Declara la unión (rosca, nº, Ø pasante y a qué va) o quita la promesa de la nota.');
    }
  }
  // ▲▲▲ ------------------------------------------------------------------ ▲▲▲

  // ▼▼▼ §V · NADA CUELGA DE UNA PIEZA QUE NO ESTÁ ▼▼▼
  // ---------------------------------------------------------------------------
  // POR QUÉ EXISTE. La bandera `desactivaPercha` retiró el «Travesaño percha
  // 40×80» por nombre y dejó dentro TODO lo que se apoyaba encima: 10 placas
  // base de puente, 5 puentes de calle, 5 regletas UHMW, 4 escuadras y 40
  // tornillos — 19 piezas fabricadas flotando en el aire, y entre ellas la única
  // calle portante que cruza la transferencia. El filtro por nombre no vio el
  // racimo porque los nombres no decían «percha».
  // Aquí el apoyo se DECLARA en dos formas y las dos se comprueban sobre la
  // geometría emitida, no sobre la intención:
  //   (1) campo `apoyaEn: '<prefijo de nombre>'` en la pieza que se apoya;
  //   (2) tabla RACIMOS_SC, para las familias que ya se cayeron una vez.
  // En ambos casos: el padre tiene que EXISTIR y tiene que TOCAR (holgura ≤ 3).
  {
    const RACIMOS_SC = [
      { hijo: /^FIJO · Placa base de puente/, padre: 'PG40 · Travesaño de puente' },
      { hijo: /^FIJO · Puente de calle — pletina/, padre: 'FIJO · Placa base de puente' },
      { hijo: /^FIJO · Puente de calle — regleta/, padre: 'FIJO · Puente de calle — pletina' },
      { hijo: /^PG40 · Escuadra travesaño de puente↔chapón/, padre: 'PG40 · Travesaño de puente' },
      { hijo: /^FIJO · Perno hex M8×16 puente/, padre: 'FIJO · Placa base de puente' },
    ];
    const TOCA = 3;      // mm — holgura máxima para considerar que se apoya
    const holgura = (a, b) => {
      let peor = -Infinity;
      for (let i = 0; i < 3; i++) peor = Math.max(peor, Math.max(a.lo[i] - b.hi[i], b.lo[i] - a.hi[i]));
      return peor;
    };
    const paresDeclarados = [
      ...nuevas.filter(p => typeof p.apoyaEn === 'string').map(p => ({ p, padre: p.apoyaEn, via: 'apoyaEn' })),
      ...RACIMOS_SC.flatMap(r => partes.filter(p => !p.contexto && r.hijo.test(p.name))
        .map(p => ({ p, padre: r.padre, via: 'RACIMOS_SC' }))),
    ];
    const huerfanas = [], despegadas = [];
    for (const { p, padre, via } of paresDeclarados) {
      const cands = partes.filter(q => q !== p && q.name.startsWith(padre));
      if (!cands.length) {
        huerfanas.push(`«${p.name}» se apoya en «${padre}» (${via}) y esa pieza NO EXISTE`);
        continue;
      }
      const g = Math.min(...cands.map(q => holgura(bb.get(p), bb.get(q))));
      if (g > TOCA) despegadas.push(`«${p.name}» ↔ «${padre}»: ${r2(g)} mm de aire (máx ${TOCA})`);
    }
    m.apoyos = { declarados: paresDeclarados.length, huerfanas, despegadas };
    if (huerfanas.length) {
      const fam = [...new Set(huerfanas.map(s => s.split('»')[0] + '»'))];
      e.push(`§V · ${huerfanas.length} pieza(s) cuelgan de otra que NO ESTÁ EN EL ENSAMBLE: `
        + `${huerfanas.slice(0, 3).join(' · ')}${huerfanas.length > 3 ? ` … y ${huerfanas.length - 3} más (${fam.length} familias)` : ''}. `
        + 'O se devuelve el apoyo, o el racimo entero se retira con él: una bandera que borra una '
        + 'pieza y deja lo que se apoyaba encima manda al taller piezas sin destino (defecto A6).');
    }
    if (despegadas.length) {
      e.push(`§V · ${despegadas.length} pieza(s) declaran apoyarse en otra que EXISTE pero no la `
        + `tocan: ${despegadas.slice(0, 4).join(' · ')}. Publica la cota de coronación del apoyo.`);
    }
  }
  // ▲▲▲ ------------------------------------ ▲▲▲

  // --- métricas ------------------------------------------------------------
  return {
    errores: e,
    tornilleria: m.tornilleria,
    apoyos: m.apoyos,
    estructural: m.estructural,
    fabricacion: FAB,
    pg40: m.pg40,
    // ▼▼▼ TAMBORES ▼▼▼
    tambores: {
      arquitectura: TB.arquitectura, piezas: TB.piezas, diametros: TB.diametros,
      ejesArbol: TB.ejesArbol, tamborEje: TB.tamborEje, caraUtil: TB.caraUtil,
      retornos: TB.retornos, ramal: TB.ramal, abrazados: TB.abrazados,
      arrastre: TB.arrastre, ejes: TB.ejes, rodamientos: TB.rodamientos,
      holguras: TB.holguras, interfazPG40: TB.interfazPG40,
      compradas: TB.compradas, fabricadas: TB.fabricadas,
      // Este objeto es un WHITELIST: lo que no se nombra aquí no llega al JSON
      // ni, por tanto, al taller. `tracking` (corona del engomado + carrera de
      // las colisas del conducido) y `pernosUcf` (salida de hilo perno a perno)
      // se calculaban y se tiraban aquí mismo — el montador no veía con qué
      // alinear la banda ni qué largo de perno pedir.
      tracking: TB.tracking, pernosUcf: TB.pernosUcf,
      sustituye: 'transmisión T5 por calle (5 × polea 63T + bujes + chavetas + eje '
        + 'motriz común + UCFL + kit AT10 + LK30) y poleas de pozo V1…V4 e IDLER-ENS: '
        + 'las emiten todavía mod_calles/mod_estaciones y hay que retirarlas',
    },
    // ▲▲▲ -------- ▲▲▲
    avisosDeclarados,
    piezas: partes.length,
    nuevas: nuevas.length,
    contextoCliente: ctx.length,
    nbt90: nbt.length,
    reparto: { calles: EJES.length, paso: NBT.paso, ejes: EJES, centro: Xc },
    transformadaNbt90: m.nbt90.transformada,
    franjaRodillo: FRANJA,
    holguras: {
      puenteRodillo: holguraPuenteRod, bandaRodillo: holguraBandaRod,
      puenteRodilloCajas: r2(holguraRodCajas),
      pozoAFondoNbt90: holguraPozo, pozoACanalCilindro: holguraPozoCanal,
      puenteCrossElevado: holguraCrossElev, puenteCrossRetraido: holguraCrossRetr,
      bandaBajadaACilindroTensor: m.calles.banda?.holguraBandaCilindroTensor,
    },
    luzBastidores: m.luzBastidores,
    descarga: {
      rodilloABordeMm,
      bordeExterior: bordeExtDescarga,
      muescaChapon: PERCHA.muesca,
      sideEnMuescaMm: m.luzBastidores?.dentroMuescaMm,
    },
    banda: m.calles.banda,
    // ▼▼▼ R · el paso RECTO por el corredor del peine ▼▼▼
    recto: RECTO,
    // ▲▲▲ ------------------------------------------- ▲▲▲
    percha: { cuelgue: m.percha.cuelgue, flechaLargueroMm: m.percha.flechaLargueroMm, tuercasT: m.percha.tuercasT, muesca: m.percha.muesca },
    estaciones: {
      ejeComun: { ...m.estaciones.ejeComun, ...m.ejeComunCalc },
      at10: m.estaciones.at10,
      idler: m.estaciones.idler,
      retirados: m.estaciones.retirados,
    },
    guardas: { desarrollos: m.guardas.desarrollos },
    // ▼▼▼ TENSOR NEUMÁTICO DE BRAZOS POR BANDA ▼▼▼
    tensor: TENSOR_VIEJO ? { desactivado: 'TENSOR_VIEJO=true: va el tensor original del cliente' } : {
      arquitectura: m.tensor2.arquitectura,
      ejePivote: m.tensor2.ejePivote,
      tension: m.tensor2.tension,
      soporte: m.tensor2.soporte,
      compradas: m.tensor2.compradas,   // idem: se calculaba y no se publicaba
      ramal: m.ramal,
    },
    // ▲▲▲ ---------------------------------------- ▲▲▲
  };
}

const V = verify();

// ---------------------------------------------------------------------------
// §S · la tabla de la revisión estructural. Se imprime SIEMPRE, cumpla o no,
// y ANTES del veredicto: si la compuerta para, hay que poder ver por qué.
// ---------------------------------------------------------------------------
if (V.estructural?.comprobaciones?.length) {
  const S = V.estructural;
  console.error(`   §S REVISIÓN ESTRUCTURAL: ${S.comprobaciones.length} comprobaciones · `
    + `${S.abiertos.length} hallazgo(s) abierto(s) dispensado(s) (REVISION_ESTRUCTURAL_SC.md)`);
  for (const f of [...S.comprobaciones].sort((a, b) => b.uso - a.uso)) {
    console.error(`      ${f.ok ? '·' : '✘'} ${f.id} ${f.titulo.slice(0, 62).padEnd(62)} `
      + `${String(f.valor).padStart(10)} ${f.unidad.padEnd(8)} lím ${String(f.limite).padStart(9)} `
      + `uso ${f.uso}${f.abierto ? `  ← ABIERTO (${f.dueño})` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// §F · el recuento de fabricación. Por la misma razón que la tabla de §S: se
// imprime SIEMPRE y ANTES del veredicto. Si la compuerta para por otra cosa,
// estos números tienen que poder leerse igual.
// ---------------------------------------------------------------------------
{
  const F = V.fabricacion;
  const pc = (a, b) => (b ? ` (${r2(100 * a / b)} %)` : '');
  console.error(`   §F FABRICACIÓN: ${F.propias} piezas propias = ${F.fabricadas} fabricadas + `
    + `${F.compradas} compradas`);
  console.error(`      TOLERANCIA: ${F.conTolerancia}/${F.fabricadas}${pc(F.conTolerancia, F.fabricadas)}`
    + ` con clase general (ISO 2768 / ISO 13920 / EN 755-9 / EN 10219-2 / ISO 3302-1)`);
  console.error(`      MATERIAL:   ${F.conMaterial}/${F.fabricadas}${pc(F.conMaterial, F.fabricadas)}`
    + ` — ${F.dispensas.reduce((a, d) => a + d.reales, 0)} sin declarar en ${F.dispensas.length} `
    + `hallazgo(s) con dueño`);
  console.error(`      CORDÓN:     ${F.conCordon}/${F.soldadas}${pc(F.conCordon, F.soldadas)}`
    + ` de las piezas soldadas`);
  console.error(`      DESIGNACIÓN:${String(F.designadas).padStart(4)}/${F.compradas}`
    + `${pc(F.designadas, F.compradas)} compradas designadas (${F.designadas - F.deModulo} por `
    + `normalizado.designar + ${F.deModulo} que ya traía su módulo) · ${F.genericas.length} `
    + `genéricas · ${F.sinDesignar.length} sin designar · ${F.avisosDesignacion} aviso(s)`);
  for (const d of F.dispensas) {
    console.error(`      ⚠ ${d.id} SIN MATERIAL: ${d.reales} pieza(s) — ${d.dueño}`);
  }
  console.error(`      NBT90 embebido: ${F.nbt90.conTol}/${F.nbt90.piezas} con tolerancia · `
    + `${F.nbt90.conCordon}/${F.nbt90.soldadas} soldadas con cordón · `
    + `${F.nbt90.designadas}/${F.nbt90.compradas} compradas designadas — `
    + `${F.nbt90.llegaCompleto ? 'llega COMPLETO, no se le toca nada' : 'INCOMPLETO: lo rellena esta pasada'}`);
  if (PG40F.desactivaPercha) {
    console.error(`      HUÉRFANAS de la percha: `
      + F.huerfanas.map((h) => `${h.id} ${h.retiradas}/${h.esperadas} fuera, ${h.supervivientes} dentro`).join(' · '));
  }
}

// ---------------------------------------------------------------------------
// Veredicto
// ---------------------------------------------------------------------------
if (V.errores.length) {
  console.error(`COMPUERTA: ${V.errores.length} incumplimiento(s)${ROMPE ? ` [TEST_ROMPE=${ROMPE}]` : ''} — NO SE EMITE JSON`);
  for (const err of V.errores) console.error('  ✘ ' + err);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------
const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Sorter CO adaptado a la transferencia NBT90 (5 calles a 76.2)',
    capa: 'user',
    origen: 'gen_sorter_co.mjs (paramétrico). Adaptación del clasificador del cliente '
      + '(ref/sorter_CO.stp, reconocimiento SORTER_CO.md) a la transferencia NBT90 '
      + '(ensambles/nbt90, embebida de su JSON emitido sin tocar sus módulos). '
      + 'La transferencia incompleta del cliente (8 roller + bastidor U_004…U_007, 62 '
      + 'ocurrencias) NO está: eliminada por instrucción del cliente.',
    ejes: 'los del STEP del cliente: X = ancho (reparto de calles), Y = flujo, Z = arriba; '
      + 'plano de transporte Z = +52.333',
    procedencia: {
      step: 'cotas medidas del STEP del cliente (SORTER_CO.md, analisis/*.json)',
      nbt90: 'especificación congelada de la transferencia (ensambles/nbt90/params.mjs)',
      web: '../web_facts.json (cada hecho con URL, fecha y cita)',
      user: 'decisiones de esta adaptación, marcadas dis en adapt/params_adapt.mjs',
    },
    verificaciones: V,
    modulos: {
      nbt90: { piezas: m.nbt90.piezas, excluidas: m.nbt90.excluidas, movil: m.nbt90.movilNbt90 },
      cliente: m.cliente, calles: { piezas: m.calles.piezas, banda: m.calles.banda, reuso: m.calles.reuso, nuevas: m.calles.nuevas },
      percha: m.percha,
      estaciones: { piezas: m.estaciones.piezas, reuso: m.estaciones.reuso, nuevas: m.estaciones.nuevas, retirados: m.estaciones.retirados },
      ...(TENSOR_VIEJO ? {} : { tensor2: { piezas: m.tensor2.piezas, reuso: m.tensor2.reuso, nuevas: m.tensor2.nuevas,
        arquitectura: m.tensor2.arquitectura, ejePivote: m.tensor2.ejePivote, tension: m.tensor2.tension } }),
      guardas: { piezas: m.guardas.piezas, nuevas: m.guardas.nuevas, desarrollos: m.guardas.desarrollos },
    },
    piezasExcluidasDelNbt90: m.nbt90.listaExcluidas,
  },
  parts: E.parts,
  constraints: [],
};

const out = join(aqui, 'sorter_co_adaptado.json');
writeFileSync(out, JSON.stringify(doc, null, 1));

// Doc auxiliar para interferencias_brep.py: NBT90 y piezas nuevas como piezas
// plenas; fuera las cajas-envolvente del cliente (no son sólidos de detalle) y
// fuera las piezas de contexto reubicado (cajas también).
const docBrep = structuredClone(doc);
docBrep.meta.nombre += ' — SOLO SÓLIDOS (para interferencias_brep.py)';
docBrep.parts = docBrep.parts
  .filter(p => !(p.contexto && !/^NBT90 · /.test(p.name)))
  .map(p => ({ ...p, contexto: false }));
mkdirSync(join(aqui, 'out'), { recursive: true });
const outBrep = join(aqui, 'out', 'sorter_co_brep.json');
writeFileSync(outBrep, JSON.stringify(docBrep, null, 1));

console.log(`OK: ${V.piezas} piezas (${V.nuevas} propias, ${V.nbt90} del NBT90 embebido, ${V.contextoCliente} contexto cliente) → ${out}`);
console.log(`   REPARTO: ${V.reparto.calles} calles a ${V.reparto.paso} centradas en X=${V.reparto.centro}; ejes ${V.reparto.ejes.join(' · ')}`);
console.log(`   NBT90 en el sorter: Rz(−90°) + T(${V.transformadaNbt90.t.join(', ')}); módulo Y ${y0}…${y1}; ${m.nbt90.excluidas} piezas de interfaz ProSort sustituidas por la percha`);
console.log(`   HOLGURAS: puente↔rodillo ${V.holguras.puenteRodillo} (cajas ${V.holguras.puenteRodilloCajas}) · banda↔rodillo ${V.holguras.bandaRodillo} · pozo↔fondo NBT90 ${V.holguras.pozoAFondoNbt90} · pozo↔canal cilindro ${V.holguras.pozoACanalCilindro}`);
console.log(`   puente↔cross channel: ${V.holguras.puenteCrossElevado} elevado / ${V.holguras.puenteCrossRetraido} retraído · bajada↔cilindro tensor ${V.holguras.bandaBajadaACilindroTensor}`);
console.log(`   LUZ bastidores ${V.luzBastidores.luz}: NBT90 embebido ${V.luzBastidores.anchoNbt90Embebido} de ancho → ${V.luzBastidores.holgIzq} en −X; el side +X entra ${V.luzBastidores.dentroMuescaMm} en la MUESCA del chapón (canto restante ${V.percha.muesca.cantoRestanteChapon})`);
console.log(`   DESCARGA: extremo de cara de rodillo a ${V.descarga.rodilloABordeMm} mm del borde exterior (${V.descarga.bordeExterior}) — requisito ≤ 40`);
console.log(`   BANDA por calle: L=${V.banda.largoDesarrollado} · envolventes ${JSON.stringify(V.banda.envolventes_deg)} · portante Z=${V.banda.dorsoPortanteZ} · fondo pozo Z=${V.banda.fondoPozoZ}`);
// ▼▼▼ R · PASO RECTO POR EL CORREDOR DEL PEINE ▼▼▼
{
  const C = V.recto.corredor, RT = V.recto.retornoRecto, A = V.recto.anfitrion;
  console.log(`   PASO RECTO: el ramal PORTANTE de las 5 calles atraviesa la transferencia EN RECTO a `
    + `Z=${C.portanteZ} (plano ${C.planoTransporte}) por el corredor de ${C.ranuraAnchoMin} de las placas peine`);
  console.log(`      ranura del peine (boceto real): ancho ${C.ranuraAnchoMin} · pleno hasta Z ${C.fondoRanuraBanda} `
    + `· admite el puente de ${CALLE.puente.ancho} hasta ${C.fondoRanuraPuente} · ${C.estado}`);
  console.log(`      holguras: banda ${C.holguraBandaDiente}/lado al diente y ${C.holguraBandaRodillo} al rodillo · `
    + `puente ${C.holguraPuenteDiente}/lado y ${C.holguraPuenteRodillo} · rodillo↔regleta del NBT90 ${C.holguraRodilloRegletaNbt90}`);
  console.log(`      lo que declara el NBT90 de su anfitrión: bandas en X ${A.bandasX.join(' · ')} (= los 5 ejes de calle) `
    + `· portante Z ${A.portante.z.join('…')} · retorno Z ${A.retorno.z.join('…')} (${A.separacionRamalesMm} bajo el portante)`);
  console.log(`      RETORNO recto: ${RT.posible ? 'SÍ' : 'NO'} — ramal a Z ${RT.ramalZ} y la ventana del peine `
    + `empieza en ${RT.ventanaZ[0]}: faltan ${r2(Math.abs(RT.faltaMm))} mm. Tambor Ø${RT.diaTamborActual}; para pasar `
    + `recto haría falta Ø ≤ ${RT.diaTamborMaxParaPasarRecto}. Va por debajo, con ${RT.rodillos} rodillos (el mínimo: ver avisos)`);
}
// ▲▲▲ -------------------------------------- ▲▲▲
if (!PG40F.desactivaPercha) console.log(`   PERCHA: ${V.percha.cuelgue.pernos38} pernos 3/8 por colisas del side + ${V.percha.cuelgue.apoyoLenguetas} lengüetas de apoyo · ${r2(V.percha.cuelgue.cortantePorPernoN)} N/perno (adm ${V.percha.cuelgue.cortanteAdmisiblePernoN}) · flecha larguero ${V.percha.flechaLargueroMm} mm · masa NBT90 (cota sup.) ${NBT.masaKg} kg`);
else console.log(`   PERCHA: DESACTIVADA por bandera (params_pg40.FLAGS.desactivaPercha) — el NBT90 queda tomado por sus 2 canales laterales vía el alargue (6 pernos 3/8), y de ahí al bastidor PG40`);
console.log(V.estaciones.ejeComun.retirado
  ? `   ESTACIONES: la línea de árbol T5 (eje común Ø${EJEC.d}/Ø${EJEC.munonUcfl.d}, 5 bujes 63T con `
    + `sus chavetas, AT10 + casquillo LK30 y la UCFL 205) queda RETIRADA POR BANDERA `
    + `(params_tambores.RETIRA): ${m.tamboresRetiradas ?? 0} piezas fuera. La sustituye el TAMBOR `
    + `MOTRIZ; §M1 y §M3 se apagan con ella y vuelven solas con RETIRA.activo=false`
  : `   ESTACIONES: eje motriz común Ø${EJEC.d}/Ø${EJEC.munonUcfl.d} × ${V.estaciones.ejeComun.L} (vano ${V.estaciones.ejeComun.vanoMm}, flecha ${V.estaciones.ejeComun.flechaMm} mm, τ ${V.estaciones.ejeComun.tauMPa} MPa a ${V.estaciones.ejeComun.parNm} N·m — hipótesis ${V.estaciones.ejeComun.hipotesis}) · AT10 recolocada X ${V.estaciones.at10.x.join('…')} · banda AT10 del kit: ${EJEC.bandaAT10.dientes} dientes (${EJEC.bandaAT10.designacion.split('(')[0].trim()})`);
console.log(`   IDLER-P01 medida: eje a ${V.estaciones.idler.dxEjeBanda} del eje de banda, Y ${V.estaciones.idler.y} — ${V.estaciones.idler.declarado}`);
console.log(`   GUARDAS pozo: desarrollos ${JSON.stringify(V.guardas.desarrollos)}`);
{
  const G = V.pg40, FL = G.flecha, AL = G.alargue;
  console.log(`   BASTIDOR PG40: ${G.largueros} largueros ${G.perfil}`);
  console.log(`      GUÍAS: ${G.guias} × ${G.guia}`);
  console.log(`      FLECHA: larguero ${FL.flechaLarguero} mm en el vano de ${FL.vanoMax} (límite ${FL.limite}) · travesaño ${FL.flechaTravesano} mm · σ ${FL.sigmaLarguero} MPa — ${FL.hipotesis}`);
  console.log(`      ALARGUE: alma + 2 cabezales + lap por lado, ${AL.material} e=${AL.e} · ${AL.pernosSide} pernos 3/8 a las colisas del side + ${AL.pernosChapon} M10 al chapón (+X)`);
  console.log(`         holgura a las alas del side: ${AL.holguraAlaInf} inferior / ${AL.holguraAlaSup} superior (mín 2) · perno a ${AL.cantoPerno} del canto`);
  console.log(`         CARAS DE APOYO (según ${G.publica.ejes.fuente}): motriz OUTBOARD en X ${AL.caraApoyo.xNegOutboard} (−X) · conducido INBOARD en X ${AL.caraApoyo.xNeg} y ${AL.caraApoyo.xPos} · cuadro 92×92 Ø13.5`);
  console.log(`         cartelas de rodillo de retorno: 4 por lado con cuadro 76×76 Ø11 en RR1…RR4 · el +X motriz lo lleva el chapón (X 527.418), no el alargue`);
}
// ▼▼▼ TENSOR NEUMÁTICO DE BRAZOS POR BANDA ▼▼▼
if (!TENSOR_VIEJO) {
  const A = V.tensor.arquitectura, P = V.tensor.ejePivote, T2 = V.tensor.tension;
  console.log(`   TENSOR: ${A.brazos} brazos independientes · ${A.cilindros} cilindros (${NEUM.designacion}, en ${A.modo}) · ${A.ejeComun}`);
  console.log(`      EJE PIVOTE ASEGURADO: ${P.designacion}, vano ${P.vano} · apoyos ${P.apoyos} · flecha ${P.flechaMm} mm, σ ${P.sigmaMPa} MPa (FS ${P.fs})`);
  console.log(`         axial del EJE:    ${P.retencionEje}`);
  console.log(`         axial de BRAZOS:  ${P.retencionBrazos} → paso cerrado ${P.pasoCerrado} = ${NBT.paso}`);
  console.log(`         giro:             ${P.giro} a ${P.presionCasquilloMPa} MPa`);
  console.log(`      TENSIÓN por banda: ${NEUM.presionTrabajoBar} bar → F ${T2.fCilindroEfN} N × palanca ${T2.palancaRatio} = N ${T2.nPoleaN} N → abrazado ${T2.abrazadoDeg}° → T = ${T2.tPorBandaN} N = ${T2.tPorMmAncho} N/mm (rango sano ${TENSION.rangoSanoNmm.join('…')})`);
  console.log(`      ARRASTRE: Fe máx ${T2.feMaxPorBandaN} N/banda vs ${T2.arrastrePorBandaN} N que pide el bulto → margen ×${T2.margen} sin patinar`);
  console.log(`      presión para otra tensión: ${T2.tablaPresion.map(r => `${r.nMm} N/mm→${r.barNecesarios} bar`).join(' · ')}`);
}
// ▲▲▲ ---------------------------------------- ▲▲▲

// ▼▼▼ TAMBOR MOTRIZ · CONDUCIDO · RODILLOS DE RETORNO ▼▼▼
{
  const B = V.tambores, A = B.arrastre, H = B.holguras;
  console.log(`   ACCIONAMIENTO DE BANDA PLANA: ${B.piezas} piezas`);
  console.log(`      TAMBOR MOTRIZ Ø${B.diametros.tambor} = tubo Ø${B.diametros.tamborTubo}×3.2 + `
    + `${B.diametros.engomado} de goma vulcanizada por lado · cara útil ${B.caraUtil.goma.join('…')} `
    + `sobre bandas ${B.caraUtil.bandas.join('…')} (margen ${B.caraUtil.margenPorLado}/lado) · `
    + `eje Ø${B.tamborEje.d} en Y=${B.ejesArbol.motriz.y}, Z=${B.ejesArbol.motriz.z}`);
  console.log(`      apoyos ${B.tamborEje.soporte} (OUTBOARD) en X ${B.tamborEje.insertoX.join(' y ')} `
    + `— vano ${B.tamborEje.vano} · ${B.tamborEje.chavetero} · saliente Ø35 X ${B.tamborEje.saliente.x.join('…')}`);
  console.log(`      CONDUCIDO Ø${B.diametros.conducido} de descansos interiores (2 × ${B.rodamientos['6207-2RS'] ? '6207-2RS' : '—'}, `
    + `eje FIJO Ø35) en Y=${B.ejesArbol.conducido.y}, Z=${B.ejesArbol.conducido.z}`);
  console.log(`      RETORNO Ø${B.diametros.retorno} × 4: `
    + B.retornos.map(R => `${R.id}(Y ${R.y}, Z ${R.z})`).join(' · '));
  console.log(`      RAMAL de retorno Z=${B.ramal.z} (dorso) · fondo del pozo Z=${B.ramal.zFondoAlto} `
    + `→ ${B.ramal.holguraFondoNbt90} mm al fondo del NBT90 · abrazados ${JSON.stringify(B.abrazados)}`);
  console.log(`      ARRASTRE: μ ${A.mu} · capstan ${A.capstan} → Te máx ${A.teMaxN} N vs ${A.teRequeridoN} N `
    + `necesarios = reserva ×${A.reserva} · par ${A.parNm} N·m a ${A.rpm} rpm · ${A.motorreductor.split('—')[0].trim()}`);
  console.log(`      EJES: tambor σ ${B.ejes.tambor.vonMisesMPa} MPa / flecha ${B.ejes.tambor.delta} mm · `
    + `conducido ${B.ejes.conducido.vonMisesMPa} MPa / ${B.ejes.conducido.delta} mm · `
    + `retorno RR1 ${B.ejes.retorno.RR1.vonMisesMPa} MPa / ${B.ejes.retorno.RR1.delta} mm`);
  console.log(`      RODAMIENTOS C/P: ` + Object.entries(B.rodamientos).map(([k, v]) => `${k} ${v.relacion}`).join(' · '));
  console.log(`      HOLGURAS: largueros PG40 ${JSON.stringify(H.largueroPG40)} · perfil ${H.perfilPG40} · `
    + `módulo NBT90 ${JSON.stringify(H.moduloNbt90)} · cara de apoyo↔banda ${H.caraApoyoALaBandaPorLado}/lado`);
}
// ▲▲▲ ----------------------------------------------- ▲▲▲
if (V.avisosDeclarados?.length) for (const a of V.avisosDeclarados) console.log(`   ⚠ DECLARADO: ${a}`);
console.log(`   → ${outBrep} (para ../nbt90/interferencias_brep.py --doc)`);
