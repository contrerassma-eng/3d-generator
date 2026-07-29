#!/usr/bin/env node
// gen_nbt90.mjs — INTEGRADOR de la transferencia 90° de rodillos emergentes
// para clasificador de bandas angostas (Hytrol ProSort MRT 90° Transfer).
//
// Llama a los cuatro módulos de diseño, corre la compuerta de verificación y
// emite `narrow_belt_transfer_90.json` (formato foto3d-cad, capa `user`) y,
// derivado de él, `out/nbt90_retraido.json` — el MISMO ensamble con las piezas
// MÓVIL bajadas la carrera, para poder verificar el estado bajo con la misma
// herramienta exacta que el alto (`interferencias_brep.py`).
//
//   node cad/ensambles/nbt90/gen_nbt90.mjs
//
// Ejes: X = eje de los rodillos (flujo del anfitrión) · Y = expulsión a 90°
// (los rodillos se reparten en Y a paso 3") · Z = arriba. mm. Estado: ELEVADO.

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Ensamble, bboxPieza, solapan, r2 } from './lib.mjs';
import { P, enPulg } from './params.mjs';
import { bastidor } from './bastidor.mjs';
import { rodillos } from './rodillos.mjs';
import { transmision } from './transmision.mjs';
import { elevacion } from './elevacion.mjs';
// Fabricación: esquema de tolerancias/encajes y designación de comprados.
import {
  NORMA, AJUSTES, ajustesDe, claseGeneralDe, ranuraPara, largoRanura, tol13920, tolForma13920,
  cordonDe,
} from './tolerancias.mjs';
import { normalizar } from './normalizado.mjs';

// ---------------------------------------------------------------------------
// Pares MÓVIL ↔ FIJO cuyo solape de CAJAS crece al retraer SIN que haya choque.
//
// La comprobación del estado retraído (§8 de `verify`) trabaja con envolventes
// AABB, y una AABB no sabe que un perfil en U o en C está HUECO: la caja del
// `Canal de montaje del cilindro` incluye toda la artesa, que es justamente por
// donde bajan el cilindro, su horquilla y el cárter del motorreductor. Por eso
// aquí hay LISTA DE PARES y no umbral en cm³: un umbral capaz de tapar estos
// falsos positivos —decenas de cm³— escondería a la vez choques de verdad (el
// que destapó esta comprobación medía 1.00 cm³).
//
// LO QUE ESTA COMPROBACIÓN **NO** VE, y conviene decirlo sin adornos:
//   · los pares de esta lista: no se miran, se dan por buenos;
//   · una pieza que YA estaba dentro de la caja de otra y al bajar choca contra
//     el fondo sin que el solape de cajas crezca — el pasador guía dentro de su
//     colisa es exactamente ese caso.
// La verificación que DECIDE sigue siendo la de sólidos B-rep exactos, que
// ahora se corre también sobre el estado bajo: este integrador emite
// `out/nbt90_retraido.json` y `regenerar.sh` le pasa `interferencias_brep.py`
// con la misma tolerancia que al estado elevado. Lo de aquí es sólo la red que
// impide EMITIR un ensamble con un choque franco al bajar.
const RETRAIDO_CAJA_ABIERTA = [
  [/^MÓVIL · (NEUMÁTICA · Cilindro MGPM80-10Z — placa móvil|Brazo de empuje de la horquilla|Tornillo SHCS M12|Motorreductor SEW)/,
    /^FIJO · Canal de montaje del cilindro/,
    'el canal es una artesa en U abierta hacia arriba (boca X 131.8…331.2): el cilindro, '
    + 'su horquilla y el cárter del motorreductor trabajan DENTRO de ella'],
  [/^MÓVIL · NEUMÁTICA · Cilindro MGPM80-10Z — (vástago|varilla guía)/,
    /^FIJO · NEUMÁTICA · Cilindro compacto con guías/,
    'vástago y varillas guía deslizan dentro del cuerpo del propio cilindro; sus '
    + 'alojamientos son cortes y una AABB no resta cortes'],
  [/^MÓVIL · (Banda plana FLEXPROOF|Placa peine)/, /^FIJO · Side channel/,
    'el side channel es un perfil en C abierto hacia dentro: la caja se traga el hueco '
    + 'en el que corren la banda y la placa peine (que bajo Z=285 sólo llega a |Y|=185)'],
  [/^MÓVIL · Placa peine/, /^FIJO · (Golilla|Perno hex|Tuerca hex) .*Canal base/,
    'la caja de un cilindro se infla ±r también en su propio eje: la tornillería vertical '
    + 'del canal base parece 21 mm más alta de lo que es (acaba en Z=97.5 frente a los '
    + '86 del borde bajo de la placa peine retraída, y a |Y|=210 frente a los 185 de la placa)'],
];

// ---------------------------------------------------------------------------
// LÍMITES DE CATÁLOGO Y DE NORMA con los que se juzga el diseño (§9 de `verify`).
//
// Ninguno es negociable ni se ajusta para que algo pase: cada uno lleva el id del
// hecho de `analisis/web_facts.json` donde está su URL, su fecha de acceso y su
// cita textual. Los que NO son de catálogo van marcados `dis` y explican por qué
// se eligen; son decisiones de diseño nuevas de la revisión estructural
// (2026-07-29) y hay que discutirlas, no heredarlas en silencio.
// ---------------------------------------------------------------------------
const LIM = {
  // --- materiales y norma ---------------------------------------------------
  A36: { Fy: 250, Fu: 400, E: 200000 },   // web STR-005 (Fu mínimo, lado seguro)
  bordeMinEnD: 1.5,                       // web STR-001 · AISI S100-16 J3.2: e ≥ 1.5·d.
                                          //   AISC tabla J3.4 NO tabula tornillos < 1/2",
                                          //   así que para chapa de 3/16" manda AISI.
  desgarroK: 1.2,                         // web STR-004 · AISC J3.10: Rn = 1.2·Lc·t·Fu
  desgarroOmega: 2.0,                     // web STR-004 · Ω del método ASD

  // --- rodamiento de los rodillos de transferencia --------------------------
  rod608: { C: 3207, C0: 1334 },          // web BRG-006 · 608-2RS: 327/136 kgf
  s0min: 1.5,                             // dis: coeficiente estático mínimo para carga
                                          //   con choque (el pop-up golpea cada ciclo)
  L10objetivoH: 20000,                    // dis: 5 años a dos turnos. NO es un dato del
                                          //   cliente: es la exigencia que introduce esta
                                          //   revisión. Si el cliente pide otra, cámbiala aquí.
  dutyBulto: 0.10,                        // dis: fracción de tiempo con bulto encima. Un
                                          //   divert de un MRT que hace 100 sorts/min entre
                                          //   todos sus destinos ve ≈10-12 bultos/min y cada
                                          //   uno ocupa el módulo ≈0.5 s.

  // --- banda plana del serpentín --------------------------------------------
  banda: {
    kadmN: 533.8,   // web BELT-005 · TC-20EF: k_adm = 120 lbs/in × 1" de ancho
    dMinMm: 25.4,   // web BELT-005 · TC-20EF: diámetro mínimo de polea 1.0"
    mu: 0.40,       // web BELT-005 · µ del DORSO de la banda sobre polea de acero
    T2N: 150,       // dis: duplica el `T2 = 150` local de transmision.mjs (que no lo
                    //   exporta). §9 comprueba que sigue siendo el mismo y falla si no.
  },
  FSdeslizBanda: 1.3,                     // dis: margen sobre el capstan e^(µθ) de la
                                          //   rueda motriz (práctica habitual 1.2-1.5)

  // --- rodillo transportador ------------------------------------------------
  rodilloVmaxMs: 2.0,                     // web ROD-007 · Interroll, plataforma 1700
                                          //   (rodamientos rígidos de precisión, la familia
                                          //   del 608): 2.0 m/s de velocidad de transporte

  // --- motorreductor --------------------------------------------------------
  sewFRaN: 695,                           // web MOT-009 · R07/RF07 DT71D4 a 430 rpm,
                                          //   aplicada en el PUNTO MEDIO del eje macizo

  // --- tornillería ----------------------------------------------------------
  // El manual sólo dice «3/8 in. bolts» (txt pág. 8): no hay grado en ninguna parte.
  // §9 (EST-01) demuestra que la unión del eje de rodillo NO cumple con grado 2, así
  // que la revisión FIJA aquí el grado y el par. Es una decisión de diseño nueva, no
  // un umbral ajustado: con Gr2 la comprobación sigue existiendo y sigue fallando.
  perno14: { grado: 'SAE J429 Gr5', parNm: 10.85, K: 0.20, As: 20.5, Sp: 586 },  // web HW-007/008/011
  perno38: { grado: 'SAE J429 Gr2', parNm: 27.1, K: 0.20, As: 50.0, Sp: 379 },   // web HW-007/008/011
  muChapa: 0.33,                          // dis: coef. de deslizamiento de una unión
                                          //   atornillada de acero con calamina (AISC clase A)
  muCorona: 0.15,                         // dis: rozamiento bajo la corona apretada del eje

  // --- bulto ----------------------------------------------------------------
  muBulto: 0.50,                          // dis: cartón corrugado sobre vulcanizado. NO se
                                          //   encontró valor publicado con cita (queda en
                                          //   `pendientes_sin_fuente`); rango razonable
                                          //   0.35-0.70. Se reporta el µ al que satura el
                                          //   motorreductor para que se vea el margen real.

  // --- final de carrera del pop-up ------------------------------------------
  topeAplastamientoMm: 2.0,               // dis: aplastamiento supuesto del tope de goma del
                                          //   MGPM. SMC publica la energía admisible (2.71 J)
                                          //   pero NO la carrera del tope (web PNEU-019);
                                          //   queda en `pendientes_sin_fuente`.
};

// ---------------------------------------------------------------------------
// HALLAZGOS ABIERTOS de la revisión estructural (2026-07-29).
//
// Son comprobaciones de §9 que el diseño NO cumple y que no se pueden arreglar sin
// mover geometría —cosa que esta revisión tiene prohibida—. Se dejan escritas con
// su número, no en un documento: la compuerta las recalcula en cada pasada y
//   · si una empeora respecto del `uso` registrado aquí, FALLA;
//   · si una desaparece (el módulo dueño la arregló), FALLA pidiendo que se borre
//     la entrada, para que no queden dispensas caducadas;
//   · si aparece una violación que NO está en esta lista, FALLA sin más.
// `uso` = utilización = valor/límite (>1 = incumple). `dueño` = quién lo arregla.
// El detalle y la corrección propuesta están en REVISION_ESTRUCTURAL.md.
// ---------------------------------------------------------------------------
const HALLAZGOS_ABIERTOS = {
  'DIN-01': { uso: 1.963, dueño: 'params.mjs',
    nota: 'P.velocidad = 0.9 m/s se dedujo con Ø34.93 y las 462 rpm del MOTOR, ignorando la '
      + 'multiplicación Ø63.5/Ø28.93 = 2.195 de la banda plana. La velocidad real de la cara '
      + 'del rodillo es 1.855 m/s (365 fpm). Nada del modelo usa P.velocidad, pero es el dato '
      + 'con el que se dimensiona el resto del sistema.' },
  'DIN-12': { uso: 1.481, dueño: 'elevacion.mjs',
    nota: 'Al frenar el pop-up contra el tope de goma la deceleración supera 1 g y el bulto se '
      + 'despega de los rodillos (salto ≈3 mm, reasienta a 241 mm/s con 0.99 J). Se corrige '
      + 'estrangulando el cilindro a ≤198 mm/s, dentro de la banda de catálogo (50-400 mm/s).' },
  'EST-03': { uso: 1.212, dueño: 'elevacion.mjs',
    nota: 'El cassette es una mesa apoyada en UN solo punto: los dos apoyos de la horquilla, '
      + 'separados 180 mm en Y. Un bulto de 34 kg sobre el rodillo extremo (Y = ±190.5) da '
      + '63.5 N·m de vuelco frente a los 78.6 N·m que despegan el apoyo: FS 1.24, y sólo 1.04 '
      + 'con la masa móvil que sale de los sólidos. Los 4 pasadores guía NO pueden ayudar: sus '
      + 'colisas son verticales.' },
  'EST-05': { uso: 1.057, dueño: 'bastidor.mjs',
    nota: 'Del taladro del perno de rodillo al canto del diente hay 9.01 mm = 1.42·d, frente a '
      + 'los 9.525 = 1.5·d de AISI S100-16 J3.2. Subir L.peineZt de 388.5 a 389.02 lo resuelve '
      + 'y deja 1.58 mm al plano de bandas (hoy 2.10).' },
  'EST-10': { uso: 1.219, dueño: 'elevacion.mjs',
    nota: 'El alma del canal de montaje es chapa de 12 GA con 231.3 mm de vano libre entre alas y '
      + 'lleva encima toda la reacción del cilindro (937 N estáticos) repartida en la huella de '
      + '91.5 × 202 mm, justo en el centro del vano — donde además están los dos taladros Ø30 de '
      + 'paso de las varillas guía. Salen 182.9 MPa frente a los 150 de 0.6·Fy(A36), y con la '
      + 'aceleración de la carrera sube a ≈233. Se resuelve con una placa de refuerzo bajo la '
      + 'huella del cilindro o un nervio transversal; no hace falta cambiar el canal.' },
  // EST-08 CERRADO el 2026-07-29 por el bloque de FABRICACIÓN (§10) de este mismo
  // integrador: toda pieza con `union: soldada…` o `weldment` recibe ahora su
  // `soldadura: { tipo, lado, garganta, disposicion, proceso, norma }`, que calcula
  // `cordonDe()` de tolerancias.mjs. Criterio con el que se cierra, para que no haya
  // que reconstruirlo: cateto = espesor de la chapa MÁS FINA de la junta, garganta =
  // 0.7·cateto, cordón DISCONTINUO 25/50 —la propia revisión daba 0.02 mm de garganta
  // necesaria frente a 2.66 disponibles, así que lo que manda es el alabeo, no la
  // resistencia—, AWS D1.3 en chapa ≤ 4.8 mm y AWS D1.1 por encima; las 4 tuercas,
  // soldadura por proyección según AWS C1.1M/C1.1. La entrada se borra siguiendo el
  // protocolo de arriba: no se dejan dispensas caducadas.
};

const E = new Ensamble();
const m = {
  bastidor: bastidor(E) || {},
  rodillos: rodillos(E) || {},
  transmision: transmision(E) || {},
  elevacion: elevacion(E) || {},
};

// ---------------------------------------------------------------------------
// FABRICACIÓN — se hace ANTES de la compuerta porque la compuerta lo verifica.
//
//   1) cada pieza comprada recibe su designación normalizada (`normalizado.mjs`);
//   2) cada pieza fabricada recibe su clase de tolerancia general y, si tiene
//      alguna cota de ajuste, la lista de ajustes ISO 286 que le tocan.
//
// Los dos datos viajan en el documento, así que los planos y el despiece los
// leen del JSON en vez de reinventarlos.
// ---------------------------------------------------------------------------
const normalizacion = normalizar(E.parts);

for (const p of E.parts) {
  if (p.contexto) continue;
  const comprada = !!(p.hardware || p.componente) && !p.fabricada;
  // La clase de la PIEZA suelta se decide por lo que es (chapa o mecanizado);
  // el `{}` es a propósito: si se le pasara la pieza, `union`/`weldment` la
  // mandarían a la clase de soldadura y se perdería la tolerancia con la que se
  // corta y se mecaniza antes de soldar. Son dos tolerancias distintas y las dos
  // hacen falta en el plano.
  const cl = claseGeneralDe(p.name, {});
  p.tol = { pieza: comprada ? null : cl.clase, norma: comprada ? null : cl.titulo };
  if (p.union || p.weldment) p.tol.conjunto = NORMA.soldadura.clase;
  // Cordón de soldadura de toda pieza soldada: cierra EST-08 de la revisión
  // estructural («un plano sin cordón no es fabricable»). El encaje sitúa, el
  // cordón une; declarar uno sin el otro deja la junta a medias.
  if (p.weldment || /soldad/i.test(p.union || '') || /SOLDADA/.test(p.name)) {
    const c = cordonDe(p);
    if (c) p.soldadura = c;
  }
  const aj = comprada ? [] : ajustesDe(p.name);
  if (aj.length) {
    p.tol.ajustes = aj.map((a) => ({
      id: a.id, cota: a.cota, ajuste: a.ajuste, criterio: a.criterio, fuente: a.fuente,
      ...(a.juegoDiametralMm ? { juegoDiametralMm: a.juegoDiametralMm } : {}),
      ...(a.aviso ? { aviso: a.aviso } : {}),
    }));
  }
}

// ---------------------------------------------------------------------------
// Compuerta: si algo no cumple, NO se emite el JSON.
// ---------------------------------------------------------------------------
function verify() {
  const e = [];
  const partes = E.parts;
  const contexto = partes.filter(p => p.contexto);
  const propias = partes.filter(p => !p.contexto);
  const movil = propias.filter(p => /^MÓVIL/.test(p.name));
  const fijo = propias.filter(p => /^FIJO/.test(p.name));
  const hw = propias.filter(p => p.hardware);

  // --- 1. función: emergencia y retracción de los rodillos -------------------
  const topeAlto = P.rodZ + P.rodDia / 2;
  const topeBajo = P.rodZbajo + P.rodDia / 2;
  const emerge = topeAlto - P.planoBanda;
  const retrae = P.planoBanda - topeBajo;
  if (Math.abs(emerge - P.emerge) > 0.05) e.push(`emergencia ${r2(emerge)} ≠ 1/4" (${r2(P.emerge)})`);
  if (retrae < 2) e.push(`retraído, el rodillo solo baja ${r2(retrae)} mm bajo el plano de bandas`);

  // --- 2. geometría: los rodillos pasan entre las bandas --------------------
  const holgura = P.paso / 2 - P.rodDia / 2 - P.regletaAncho / 2;
  if (holgura < 2) e.push(`holgura rodillo↔regleta ${r2(holgura)} < 2 mm`);
  if (P.rodY.length !== P.nRodillos) e.push('nº de rodillos incoherente con el paso');
  if (P.bandaY.length !== P.nBandas) e.push('nº de bandas incoherente con el paso');
  const span = (P.nRodillos - 1) * P.paso;
  if (Math.abs((P.BR - span) / 2 - P.paso / 2) > 1) e.push('los rodillos no quedan centrados en el BR');

  // --- 3. cada módulo entregó sus piezas ------------------------------------
  const minimos = { bastidor: 12, rodillos: 6, transmision: 8, elevacion: 8 };
  for (const [k, n] of Object.entries(minimos)) {
    const c = m[k].piezas ?? null;
    if (c !== null && c < n) e.push(`el módulo ${k} solo aportó ${c} piezas`);
  }
  if (!movil.length) e.push('no hay piezas MÓVIL (nada sube con el pop-up)');
  if (!fijo.length) e.push('no hay piezas FIJO');
  if (!hw.length) e.push('no hay tornillería normalizada');

  // --- 4. envolvente --------------------------------------------------------
  const lim = { x: [-30, P.largo + 30], y: [-P.anchoExt / 2 - 30, P.anchoExt / 2 + 30], z: [-2, P.altoTotal + 45] };
  for (const p of propias) {
    const b = bboxPieza(p);
    if (b.lo[0] < lim.x[0] || b.hi[0] > lim.x[1] || b.lo[1] < lim.y[0] || b.hi[1] > lim.y[1]
        || b.lo[2] < lim.z[0] || b.hi[2] > lim.z[1]) {
      e.push(`fuera de envolvente: ${p.name} (X ${r2(b.lo[0])}..${r2(b.hi[0])}, Y ${r2(b.lo[1])}..${r2(b.hi[1])}, Z ${r2(b.lo[2])}..${r2(b.hi[2])})`);
    }
  }

  // --- 5. la banda del serpentín cierra y agarra ----------------------------
  const env = m.transmision.envolvente_grados?.rodilloMin ?? m.transmision.envolventeRodillo;
  const largoBanda = m.transmision.banda?.largoDesarrollado ?? m.transmision.largoBanda;
  if (env === undefined) e.push('la transmisión no reportó la envolvente de la banda sobre el rodillo');
  else if (env < 60) e.push(`envolvente de la banda sobre el rodillo ${env}° < 60° (no arrastra)`);
  if (largoBanda === undefined) e.push('la transmisión no reportó el largo desarrollado de la banda');

  // Holguras que NO se pueden medir por intersección de sólidos (la banda es un
  // lazo fino y el motor CSG da falsos positivos): la transmisión las calcula
  // analíticamente sobre la trayectoria y aquí se exigen.
  const vt = m.transmision.verificacion || {};
  if (vt.bandaACanalOK === false) {
    e.push(`la banda roza el ala del canal: holgura ${vt.bandaACanal} mm en (Y=${vt.bandaACanalEn?.[0]}, `
      + `Z=${vt.bandaACanalEn?.[1]}); recorte necesario del ala ${vt.recorteAlaCanalNecesario} mm`);
  }
  if (vt.pestanaACanalOK === false) {
    e.push(`una pestaña de polea roza el ala del canal: holgura ${vt.pestanaACanal} mm `
      + `(${vt.pestanaACanalEn?.[0]})`);
  }
  if (vt.poleasSinSolido) e.push(`${vt.poleasSinSolido} elementos de la banda sin sólido de polea`);

  // --- 6. el actuador puede con la carga -----------------------------------
  const el = m.elevacion;
  const fs = el.factorSeguridad;
  if (fs !== undefined && fs < 1.5) e.push(`factor de seguridad del actuador ${fs} < 1.5`);
  if (el.carrera !== undefined && Math.abs(el.carrera - P.carrera) > 0.01) {
    e.push(`la carrera del actuador (${el.carrera}) no es la del equipo (${P.carrera})`);
  }
  // El actuador es una pieza de catálogo: sus límites publicados no se negocian.
  // Un cilindro con guías falla por energía de impacto, por par sobre la placa o
  // por carga lateral mucho antes que por fuerza, así que se comprueban los cuatro.
  if (el.velocidadMaxMmS !== undefined) {
    const [vMin, vMax] = el.velocidadAdmisibleMmS ?? [0, Infinity];
    // La velocidad que impone la energía cinética admisible tiene que caer DENTRO
    // de la banda de velocidad de émbolo del catálogo: si quedara por debajo del
    // mínimo, no habría forma de estrangular el cilindro hasta esa velocidad.
    if (el.velocidadMaxMmS < vMin) {
      e.push(`la masa elevada obliga a ${el.velocidadMaxMmS} mm/s para no pasarse de energía `
        + `cinética, por debajo del mínimo de émbolo del catálogo (${vMin} mm/s)`);
    }
    if (el.velocidadMaxMmS > vMax) {
      e.push(`velocidad de diseño ${el.velocidadMaxMmS} mm/s > máxima de catálogo (${vMax} mm/s)`);
    }
  }
  if (el.energiaCineticaJ !== undefined && el.energiaAdmisibleJ !== undefined
      && el.energiaCineticaJ > el.energiaAdmisibleJ + 1e-6) {
    e.push(`energía cinética de impacto ${el.energiaCineticaJ} J > admisible del actuador `
      + `(${el.energiaAdmisibleJ} J): los topes de goma no la absorben`);
  }
  if (el.parPlacaNm !== undefined && el.parAdmisibleNm !== undefined && el.parPlacaNm > el.parAdmisibleNm) {
    e.push(`par sobre la placa del actuador ${el.parPlacaNm} N·m > admisible (${el.parAdmisibleNm} N·m)`);
  }
  if (el.cargaLateralN !== undefined && el.cargaLateralAdmisibleN !== undefined
      && el.cargaLateralN > el.cargaLateralAdmisibleN) {
    e.push(`carga lateral sobre la placa ${el.cargaLateralN} N > admisible (${el.cargaLateralAdmisibleN} N)`);
  }
  // Holgura de la placa móvil al motorreductor: es la cota que cierra la cadena
  // de alturas y la que ya no se puede resolver rebajando la placa (es comprada).
  if (el.holguraPlacaMotorMm !== undefined && el.holguraPlacaMotorMm < 2) {
    e.push(`la placa móvil del actuador queda a ${el.holguraPlacaMotorMm} mm del motorreductor (< 2 mm)`);
  }

  // --- 7. interferencia gruesa MÓVIL ↔ FIJO en estado elevado --------------
  // (AABB: solo delata solapes francos; las holguras finas se comprueban arriba)
  let choques = 0;
  const bbM = movil.map(p => [p, bboxPieza(p)]);
  const bbF = fijo.map(p => [p, bboxPieza(p)]);
  for (const [pm, bm] of bbM) {
    for (const [pf, bf] of bbF) {
      if (solapan(bm, bf, 0.5)) {
        const vol = (Math.min(bm.hi[0], bf.hi[0]) - Math.max(bm.lo[0], bf.lo[0]))
          * (Math.min(bm.hi[1], bf.hi[1]) - Math.max(bm.lo[1], bf.lo[1]))
          * (Math.min(bm.hi[2], bf.hi[2]) - Math.max(bm.lo[2], bf.lo[2]));
        if (vol > 8000) choques++;   // > 8 cm³ de solape de cajas: sospechoso
      }
    }
  }

  // --- 8. interferencia MÓVIL ↔ FIJO en estado RETRAÍDO --------------------
  // El modelo se dibuja ELEVADO, así que hasta ahora NINGUNA compuerta miraba el
  // estado bajo — y ahí había un choque real (la placa soporte de transmisión
  // dentro del labio del canal de montaje, 1.00 cm³, que impedía que la máquina
  // bajase). Aquí se baja cada pieza MÓVIL `P.carrera` en Z y se exige que su
  // caja NO GANE solape con ninguna pieza FIJA: si el solape crece al bajar, la
  // pieza se está metiendo donde arriba no estaba. Se compara CONTRA EL ESTADO
  // ELEVADO —y no contra cero— porque el estado elevado ya está certificado con
  // sólidos exactos: un solape de cajas que no crece al bajar no es información
  // nueva. Ver `RETRAIDO_CAJA_ABIERTA` arriba: qué se tolera, por qué, y qué es
  // lo que este chequeo NO puede ver.
  const solapeVol = (a, b) => {
    let v = 1;
    for (let i = 0; i < 3; i++) {
      const d = Math.min(a.hi[i], b.hi[i]) - Math.max(a.lo[i], b.lo[i]);
      if (d <= 0) return 0;
      v *= d;
    }
    return v;
  };
  const bajar = (b) => ({ lo: [b.lo[0], b.lo[1], b.lo[2] - P.carrera], hi: [b.hi[0], b.hi[1], b.hi[2] - P.carrera] });
  const choquesBajo = [];
  let toleradosBajo = 0;
  for (const [pm, bm] of bbM) {
    const bb = bajar(bm);
    for (const [pf, bf] of bbF) {
      const crece = solapeVol(bb, bf) - solapeVol(bm, bf);
      if (crece <= 1e-6) continue;
      if (RETRAIDO_CAJA_ABIERTA.some(([rm, rf]) => rm.test(pm.name) && rf.test(pf.name))) { toleradosBajo++; continue; }
      choquesBajo.push({ movil: pm.name, fijo: pf.name, cm3: r2(crece / 1000) });
    }
  }
  choquesBajo.sort((a, b) => b.cm3 - a.cm3);
  for (const c of choquesBajo.slice(0, 6)) {
    e.push(`RETRAÍDO (bajando ${P.carrera} mm): «${c.movil}» invade «${c.fijo}» — la caja gana ${c.cm3} cm³`);
  }
  if (choquesBajo.length > 6) e.push(`… y ${choquesBajo.length - 6} pares más chocan en estado retraído`);

  // Cota dirigida sobre el choque que este bloque destapó: retraída, la placa
  // soporte de transmisión (MÓVIL) contra el techo del canal de montaje (FIJO).
  // El mínimo exigido es el mismo que usa la elevación para la placa del
  // cilindro contra el motorreductor (`platoHolguraMotor` = 2 mm).
  const placaTrans = movil.find((p) => /Placa soporte de transmisión/.test(p.name));
  const canalTechoZ = m.elevacion.canalZ?.[1];
  let holguraPlacaCanal;
  if (placaTrans && canalTechoZ !== undefined) {
    holguraPlacaCanal = r2(bboxPieza(placaTrans).lo[2] - P.carrera - canalTechoZ);
    if (holguraPlacaCanal < 2) {
      e.push(`retraída, la placa soporte de transmisión queda a ${holguraPlacaCanal} mm del techo `
        + `del canal de montaje del cilindro (Z=${canalTechoZ}); mínimo 2 mm`);
    }
  }

  // =========================================================================
  // --- 10. FABRICACIÓN: encajes, tolerancias y designación de comprados ----
  //
  //   BLOQUE DE FABRICACIÓN (2026-07-29). Independiente del §9 de la revisión
  //   estructural: aquí no se juzga si una pieza aguanta, sino si el taller la
  //   puede cortar, situar y comprar sin interpretar el plano a ojo.
  //
  //   Lo que comprueba, y por qué cada cosa está aquí y no en un comentario:
  //     10.1 cada lengüeta tiene su ranura, en OTRA pieza, y las dos declaran la
  //          misma cota (una lengüeta sin ranura es un conjunto que no entra);
  //     10.2 la holgura declarada COINCIDE con la que sale de la cadena de cotas
  //          (espesor + laminación + corte + montaje). Si alguien retoca una
  //          holgura a mano, esto lo caza;
  //     10.3 la ranura de posición es más precisa que la tolerancia general del
  //          conjunto soldado — si no lo fuera, el encaje no serviría de nada;
  //     10.4 NINGÚN grado de libertad queda fijado dos veces en la misma junta
  //          (la regla que el encargo pide explícitamente: una lengüeta ajustada
  //          en las dos direcciones y además redundante no entra);
  //     10.5 toda pieza con unión soldada declara encajes o, si va a tope, CÓMO
  //          se posiciona;
  //     10.6 toda pieza fabricada lleva clase de tolerancia general y toda pieza
  //          comprada, norma o referencia de catálogo;
  //     10.7 todo alojamiento de rodamiento con carga rotante en el aro exterior
  //          lleva el ajuste N7 que ya usaba el repositorio.
  // =========================================================================
  const encajes = [];
  for (const p of propias) for (const en of (p.encajes || [])) encajes.push({ ...en, pieza: p.name });

  // 10.1 — emparejamiento lengüeta ↔ ranura
  const porId = new Map();
  for (const en of encajes) {
    if (!porId.has(en.id)) porId.set(en.id, []);
    porId.get(en.id).push(en);
  }
  for (const [id, lista] of porId) {
    if (lista[0].tipo === 'tope') continue;                     // junta a tope: §10.5
    const lados = new Set(lista.map((q) => q.lado));
    const piezas = new Set(lista.map((q) => q.pieza));
    // `lado: 'ambos'` = lengüeta y ranura viven en la MISMA pieza soldada (la
    // pestaña que atraviesa la placa soporte): ahí no hay dos piezas que casar.
    if (!lados.has('ambos') && (lista.length < 2 || piezas.size < 2)) {
      e.push(`ENCAJE ${id}: declarado en ${piezas.size} pieza(s); un encaje vive en DOS`);
      continue;
    }
    // Los dos lados tienen que ser COMPLEMENTARIOS. Se comprueba sobre el
    // conjunto de lados y no sobre `lista[0].tipo`, porque el orden en que
    // aparecen las piezas depende del orden de los módulos: mirando sólo el
    // primero, un encaje al que le falte justo el lado que salía primero pasaba
    // desapercibido.
    const PARES = [['lengueta', 'ranura'], ['pasador', 'agujero'], ['ambos']];
    const esperado = PARES.find((par) => par.every((l) => lados.has(l)) && lados.size === par.length);
    if (!esperado) {
      e.push(`ENCAJE ${id}: lados declarados {${[...lados].join(', ')}}; tienen que ser `
        + 'complementarios: lengueta+ranura, pasador+agujero, o ambos');
    }
    // 10.1b — las dos piezas tienen que declarar la MISMA ranura
    const ref = JSON.stringify(lista[0].ranura ?? {});
    for (const q of lista.slice(1)) {
      if (JSON.stringify(q.ranura ?? {}) !== ref) {
        e.push(`ENCAJE ${id}: «${q.pieza}» declara ranura ${JSON.stringify(q.ranura)} y `
          + `«${lista[0].pieza}» declara ${ref}`);
      }
    }
  }

  // 10.2 — la holgura sale de la cadena de cotas, no de una elección
  for (const en of encajes) {
    if (en.tipo !== 'lengueta' || !en.lengueta?.calibre) continue;
    const esperado = ranuraPara(en.lengueta.calibre);
    const largo = largoRanura(en.lengueta.ancho, en.rol === 'posicion' ? 'posicion' : 'paso');
    const anchoOK = en.rol === 'posicion'
      ? Math.abs(en.ranura.ancho - esperado.ancho) < 1e-6
      : Math.abs(en.ranura.ancho - (esperado.ancho + 2)) < 1e-6;
    if (!anchoOK) {
      e.push(`ENCAJE ${en.id}: ancho de ranura ${en.ranura.ancho} ≠ el de la cadena de cotas `
        + `(${en.rol === 'posicion' ? esperado.ancho : r2(esperado.ancho + 2)}) para chapa `
        + `${en.lengueta.calibre}`);
    }
    if (Math.abs(en.ranura.largo - largo.largo) > 1e-6) {
      e.push(`ENCAJE ${en.id}: largo de ranura ${en.ranura.largo} ≠ ${largo.largo} (cadena de cotas, `
        + `rol «${en.rol}»)`);
    }
  }

  // 10.3 — la ranura de posición tiene que ser MÁS precisa que la tolerancia
  // general del conjunto soldado; si no, el encaje no aporta nada.
  const cotaSoldada = P.largo;                                  // la mayor del weldment
  const tolSold = tol13920(cotaSoldada, 'B');
  let peorEncaje = 0;
  for (const en of encajes) {
    if (en.rol !== 'posicion' || !en.lengueta?.calibre) continue;
    const h = Math.max(ranuraPara(en.lengueta.calibre).holguraPorLado[1],
      largoRanura(en.lengueta.ancho, 'posicion').holguraPorLado[1]);
    peorEncaje = Math.max(peorEncaje, h);
    if (h >= tolSold) {
      e.push(`ENCAJE ${en.id}: la holgura máxima de la ranura de posición (${h} mm) no mejora la `
        + `tolerancia general del soldado ISO 13920-B (±${tolSold} mm): el encaje no sitúa nada`);
    }
  }

  // 10.4 — ningún grado de libertad fijado dos veces en la misma junta
  const estacion = (id) => id.replace(/-(pos|paso|a|b)$/, '');
  const gdlPorEstacion = new Map();
  for (const en of encajes) {
    if (en.rol !== 'posicion' || !en.gdl?.length) continue;
    const k = estacion(en.id);
    if (!gdlPorEstacion.has(k)) gdlPorEstacion.set(k, new Map());
    const acc = gdlPorEstacion.get(k);
    for (const g of en.gdl) {
      // los dos lados del MISMO rasgo declaran el mismo gdl: eso no es redundancia
      const yaEste = acc.get(g);
      if (yaEste && yaEste !== en.id) {
        e.push(`ENCAJE: en la junta «${k}» el grado de libertad ${g} lo fijan DOS rasgos de `
          + `posición (${yaEste} y ${en.id}): sobre-restringido, el conjunto no entra`);
      }
      acc.set(g, en.id);
    }
  }

  // 10.5 — toda pieza soldada declara encaje o cómo se posiciona
  const soldadasFab = propias.filter((p) => p.union || p.weldment);
  for (const p of soldadasFab) {
    if (!(p.encajes || []).length) {
      e.push(`la pieza soldada «${p.name}» no declara ni encaje ni forma de posicionarla`);
      continue;
    }
    for (const en of p.encajes) {
      if (en.tipo === 'tope' && !(en.posicionamiento && en.referencia)) {
        e.push(`la junta a tope «${en.id}» de «${p.name}» no dice cómo se posiciona `
          + '(hace falta utillaje/trazado y contra qué cara se referencia)');
      }
    }
  }

  // 10.6 — designación y tolerancia general de TODAS las piezas
  if (normalizacion.sinDesignar.length) {
    for (const nm of normalizacion.sinDesignar.slice(0, 6)) {
      e.push(`pieza comprada sin norma ni referencia de catálogo: «${nm}»`);
    }
    if (normalizacion.sinDesignar.length > 6) {
      e.push(`… y ${normalizacion.sinDesignar.length - 6} piezas compradas más sin designar`);
    }
  }
  const sinTol = propias.filter((p) => {
    const comprada = !!(p.hardware || p.componente) && !p.fabricada;
    return !comprada && !p.tol?.pieza;
  });
  if (sinTol.length) e.push(`${sinTol.length} piezas fabricadas sin clase de tolerancia general (p. ej. «${sinTol[0].name}»)`);
  const malNorma = propias.filter((p) => {
    const comprada = !!(p.hardware || p.componente) && !p.fabricada;
    return comprada && !/\b(ISO|ASME|ASTM|DIN|ANSI|ABMA|SAE|IEC|SMC|SEW|Hytrol|B-20760|Fenner)\b/.test(p.norma || '');
  });
  if (malNorma.length) {
    e.push(`${malNorma.length} piezas compradas cuya designación no cita norma ni catálogo `
      + `(p. ej. «${malNorma[0].name}» → «${malNorma[0].norma}»)`);
  }

  // 10.7 — el criterio de ajuste de rodamientos del repositorio, en la compuerta
  for (const a of AJUSTES) {
    if (!/carga ROTANTE sobre el aro exterior/.test(a.criterio)) continue;
    if (a.ajuste !== 'N7') {
      e.push(`AJUSTE ${a.id}: alojamiento con carga rotante en el aro exterior declarado «${a.ajuste}»; `
        + 'el criterio del repositorio (y NTN 7.4 tabla 7.2(1)) exige N7');
    }
  }
  const conAjuste = propias.filter((p) => p.tol?.ajustes?.length).length;

  // =========================================================================
  // --- 9. RESISTENCIA Y DINÁMICA (revisión estructural, 2026-07-29) --------
  // =========================================================================
  // Hasta aquí la compuerta comprobaba que el equipo ENCAJA y que se puede armar.
  // Este bloque comprueba que AGUANTA y que FUNCIONA: reparto de carga, tensiones
  // del serpentín, vida de los rodamientos, deslizamiento del bulto, vuelco del
  // cassette sobre el actuador y distancias de norma de la tornillería.
  //
  // Regla de la casa: cada número se recalcula AQUÍ a partir de `P` y de las
  // métricas que publican los módulos —nunca se copia—, y se compara con un
  // límite de `LIM` que lleva su fuente. Lo que no cumple y no se puede arreglar
  // sin mover geometría vive en `HALLAZGOS_ABIERTOS` con su utilización
  // registrada: si empeora, la compuerta para.
  const g = 9.80665;
  const R9 = [];        // registro de todas las comprobaciones (va al documento)
  const abiertos = [];  // las que incumplen y están dispensadas

  /** Registra una comprobación. `uso` = utilización (>1 incumple). */
  function chk(id, titulo, valor, limite, sentido, detalle, unidad = '') {
    let uso;
    if (limite === 0) uso = valor > 0 ? 1 + valor : 0;                   // "no debe haber ninguno"
    else uso = sentido === '<=' ? valor / limite : limite / valor;
    const fila = { id, titulo, valor: r2(valor), limite: r2(limite), unidad, uso: r2(uso), ok: uso <= 1 };
    R9.push(fila);
    const ab = HALLAZGOS_ABIERTOS[id];
    if (uso <= 1 + 1e-9) {
      if (ab) {
        e.push(`${id} · «${titulo}» YA CUMPLE (utilización ${r2(uso)}): borra su entrada de `
          + `HALLAZGOS_ABIERTOS y actualiza REVISION_ESTRUCTURAL.md. No se dejan dispensas caducadas.`);
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
        + `HALLAZGOS_ABIERTOS (dueño: ${ab.dueño}). ${detalle}`);
      return fila;
    }
    fila.abierto = true; fila.dueño = ab.dueño;
    abiertos.push(fila);
    return fila;
  }

  const cin = m.transmision.cinematica || {};
  const envG = m.transmision.envolvente_grados || {};
  const rodM = m.bastidor.montajeRodillo || {};

  // -- 9.0 cinemática: se recalcula de P y se coteja con lo que reporta el módulo
  const rRueda = P.ruedaDia / 2 / 1000;                 // m
  const wMotor = 2 * Math.PI * P.motorRpm / 60;         // rad/s
  const vBanda = wMotor * rRueda;                       // m/s en el paso de la rueda
  const dArrastre = P.rodDia - 2 * P.rodVulcE;          // Ø del tubo desnudo, 28.93
  const nRodillo = vBanda / (Math.PI * dArrastre / 1000) * 60;         // rpm del rodillo
  const vRodillo = nRodillo / 60 * Math.PI * P.rodDia / 1000;          // m/s en el vulcanizado
  const parSalida = P.motorHP * 745.7 / wMotor;         // N·m
  const tiroBanda = parSalida / rRueda;                 // N — tiro máximo del motorreductor
  const empujeSup = tiroBanda * dArrastre / P.rodDia;   // N en la cara del bulto
  if (cin.vTransferencia_m_s !== undefined && Math.abs(cin.vTransferencia_m_s - vRodillo) > 0.02) {
    e.push(`la transmisión reporta ${cin.vTransferencia_m_s} m/s de velocidad de transferencia y `
      + `el gate calcula ${r2(vRodillo)} m/s a partir de P`);
  }
  // La transmisión NO exporta su tensión de montaje del ramal flojo (T2 local).
  // Se recupera de sus propias métricas y se exige que siga siendo la de LIM.
  const T2rep = (m.transmision.rodamientos?.cargaPorRodamiento_N ?? 0) - (cin.tiroBanda_N ?? 0) / 2;
  if (Math.abs(T2rep - LIM.banda.T2N) > 1) {
    e.push(`la tensión del ramal flojo de transmision.mjs (${r2(T2rep)} N) ya no es la de `
      + `LIM.banda.T2N (${LIM.banda.T2N} N): todo el §9 de tensiones y vida cuelga de ese número`);
  }

  // -- 9.1 la velocidad declarada en params.mjs tiene que ser la real ---------
  // La banda plana MULTIPLICA: Ø63.5 en la rueda motriz contra Ø28.93 en el tubo
  // desnudo del rodillo = 2.195. P.velocidad la ignora.
  chk('DIN-01', 'velocidad de transferencia declarada vs. real',
    vRodillo / P.velocidad, 1.05, '<=',
    `P.velocidad = ${P.velocidad} m/s pero la cara del rodillo va a ${r2(vRodillo)} m/s `
    + `(${r2(vRodillo * 196.85)} fpm): el rodillo gira a ${r2(nRodillo)} rpm, no a ${P.motorRpm}.`, '×');

  // -- 9.2 velocidad periférica dentro de lo que admite un rodillo transportador
  chk('DIN-02', 'velocidad periférica del rodillo', vRodillo, LIM.rodilloVmaxMs, '<=',
    'ningún catálogo de rodillo transportador publica más (web ROD-007).', 'm/s');

  // -- 9.3 el motorreductor puede empujar el bulto ---------------------------
  const fricBulto = LIM.muBulto * P.cargaMaxKg * g;
  const muSaturacion = empujeSup / (P.cargaMaxKg * g);
  chk('DIN-03', 'empuje disponible en la cara del rodillo', empujeSup, fricBulto, '>=',
    `hace falta µ·m·g = ${r2(fricBulto)} N para arrastrar ${P.cargaMaxKg} kg con µ = ${LIM.muBulto}; `
    + `el accionamiento satura en µ = ${r2(muSaturacion)}.`, 'N');

  // -- 9.4 el bulto sincroniza dentro del campo de rodillos ------------------
  // Al emerger, el bulto está parado en Y y la cara del rodillo va a vRodillo:
  // patina hasta igualar velocidades. a = µ·g (limitada por el empuje disponible).
  const aBulto = Math.min(fricBulto, empujeSup) / P.cargaMaxKg;
  const deslizamiento = vRodillo ** 2 / (2 * aBulto) * 1000;            // mm de patinaje relativo
  const campoRodillos = (P.nRodillos - 1) * P.paso;                     // 381 mm
  chk('DIN-04', 'patinaje del bulto hasta sincronizar', deslizamiento, campoRodillos, '<=',
    `con a = ${r2(aBulto)} m/s² tarda ${r2(vRodillo / aBulto * 1000)} ms; el vulcanizado restriega `
    + `esa distancia bajo ${P.cargaMaxKg} kg en cada transferencia.`, 'mm');

  // -- 9.5/9.6/9.7 la banda ---------------------------------------------------
  // Reparto de tensiones del serpentín. El caso envolvente NO es el par repartido
  // entre los 6 rodillos: es el bulto sobre UN rodillo, que concentra todo el salto
  // de tensión ahí y deja TODO el ramal anterior a T1. Un rodillo que no transmite
  // par sigue cargando 2·T de fuerza radial.
  const T1 = LIM.banda.T2N + tiroBanda;
  chk('DIN-05', 'tensión del ramal tenso', T1, LIM.banda.kadmN, '<=',
    `k_adm de una banda plana de 1" (web BELT-005). Con ${r2(T1)} N va al `
    + `${r2(T1 / LIM.banda.kadmN * 100)} % de su admisible.`, 'N');
  chk('DIN-06', 'Ø mínimo de envoltura de la banda', dArrastre, LIM.banda.dMinMm, '>=',
    'el tubo desnudo del rodillo es la polea más pequeña del serpentín (web BELT-005). '
    + 'FALTA la penalización de Habasit por contraflexión: la banda dobla en los DOS sentidos.', 'mm');
  const capstan = Math.exp(LIM.banda.mu * (envG.ruedaMotriz ?? 0) * Math.PI / 180);
  chk('DIN-07', 'deslizamiento de la banda en la rueda motriz',
    T1 / LIM.banda.T2N, capstan / LIM.FSdeslizBanda, '<=',
    `Eytelwein: T1/T2 ≤ e^(µ·θ) = ${r2(capstan)} con µ = ${LIM.banda.mu} y θ = ${envG.ruedaMotriz}°. `
    + 'Exige además que el DORSO de la banda sea la cara que toca los rodillos (web BELT-005).', '');

  // -- 9.8/9.9 rodamientos del rodillo ---------------------------------------
  // Fuerza radial sobre un rodillo envuelto θ° con tensiones Ta y Tb.
  const resul = (Ta, Tb, th) => Math.sqrt(Ta * Ta + Tb * Tb + 2 * Ta * Tb * Math.cos(Math.PI - th * Math.PI / 180));
  const thRod = envG.rodilloMin ?? 180;
  const Rbanda = resul(T1, T1, thRod);                      // rodillo del ramal tenso que no da par
  const Rbulto = Rbanda + P.cargaMaxKg * g;                 // + bulto entero en UN rodillo
  const Prodam = Rbulto / 2;                                // 2 rodamientos por rodillo
  chk('DIN-08', 'coeficiente estático del rodamiento del rodillo',
    LIM.rod608.C0 / Prodam, LIM.s0min, '>=',
    `608-2RS con C0 = ${LIM.rod608.C0} N (web BRG-006) y ${r2(Prodam)} N por rodamiento `
    + `(banda ${r2(Rbanda)} N + bulto ${r2(P.cargaMaxKg * g)} N).`, '');
  const Pvacio = 2 * LIM.banda.T2N / 2;                     // marcha sin par: sólo la pretensión
  const Peq = Math.cbrt(LIM.dutyBulto * Prodam ** 3 + (1 - LIM.dutyBulto) * Pvacio ** 3);
  const L10h = (LIM.rod608.C / Peq) ** 3 * 1e6 / (60 * nRodillo);
  chk('DIN-09', 'vida L10 del rodamiento del rodillo', L10h, LIM.L10objetivoH, '>=',
    `ISO 281 con C = ${LIM.rod608.C} N a ${r2(nRodillo)} rpm y duty ${LIM.dutyBulto * 100} % `
    + `(P_eq = ${r2(Peq)} N). Con bulto permanente serían ${r2((LIM.rod608.C / Prodam) ** 3 * 1e6 / (60 * nRodillo))} h.`, 'h');
  // Las locas giran a la velocidad de la banda y ven 2·T en el ramal tenso.
  const nLoca = vBanda / (Math.PI * P.idlerDia / 1000) * 60;
  const Ploca = resul(T1, T1, envG.locas?.[0] ?? 180) / 2;
  const L10loca = (m.transmision.rodamientos?.C_N ?? 4400) ** 3 / Ploca ** 3 * 1e6 / (60 * nLoca);
  chk('DIN-13', 'vida L10 del rodamiento de las poleas locas', L10loca, LIM.L10objetivoH, '>=',
    `R10-2RS a ${r2(nLoca)} rpm con ${r2(Ploca)} N por rodamiento.`, 'h');

  // -- 9.10/9.11 el eje del rodillo ------------------------------------------
  // El eje NO gira y no está simplemente apoyado: sus dos coronas Ø12.70 van
  // APRETADAS contra la cara interior de la placa peine por los pernos 1/4-20, o
  // sea que la unión es un empotramiento elástico. La rigidez que lo empotra es la
  // del DIENTE de la placa peine trabajando fuera de su plano (un voladizo de
  // chapa de 3/16"), y eso es lo que decide si el eje trabaja a 70 MPa o a 250.
  const A0 = rodM.ejeZ !== undefined ? (P.rodX0 - 2) : 42.48;   // no se usa: ver abajo
  const xA = m.rodillos.placaPeineX ? r2(m.rodillos.placaPeineX[0] + P.placaT / 2) : 42.48;
  const xB = m.rodillos.placaPeineX ? r2(m.rodillos.placaPeineX[1] - P.placaT / 2) : 420.52;
  const Lv = xB - xA;
  const [xr1, xr2] = m.rodillos.rodamientosX ?? [58, 398];
  const a1 = xr1 - xA, a2 = xr2 - xA;
  const dEje = P.rodHex, dPunta = 25.4 / 2;                  // Ø7.94 cuerpo / Ø12.70 punta
  const Zeje = Math.PI * dEje ** 3 / 32, Zpunta = Math.PI * dPunta ** 3 / 32;
  const Ieje = Math.PI * dEje ** 4 / 64;
  const Pcarga = Rbulto / 2;                                  // por rodamiento
  // rigidez rotacional del diente (voladizo de chapa, fuera de plano) vs. la de la viga
  const bDiente = 2 * 17.1, hDiente = (rodM.dienteSobreEje !== undefined ? P.rodZ : P.rodZ) - 320;
  const kDiente = LIM.A36.E * (bDiente * P.placaT ** 3 / 12) / hDiente;
  const empotramiento = 1 / (1 + (3 * LIM.A36.E * Ieje / Lv) / kDiente);
  const fem = (a) => { const b = Lv - a; return { MA: Pcarga * a * b * b / (Lv * Lv), MB: Pcarga * a * a * b / (Lv * Lv) }; };
  const f1 = fem(a1), f2 = fem(a2);
  const Mempot = empotramiento * Math.max(f1.MA + f2.MA, f1.MB + f2.MB);
  const RA = Pcarga * (Lv - a1) / Lv + Pcarga * (Lv - a2) / Lv;
  const Mrodam = Math.max(Math.abs(RA * a1 - Mempot), Math.abs((2 * Pcarga - RA) * (Lv - a2) - Mempot));
  const sigmaEje = Mrodam / Zeje;
  const sigmaEjeArticulado = Math.max(RA * a1, (2 * Pcarga - RA) * (Lv - a2)) / Zeje;
  // El empotramiento sólo existe mientras la corona NO despegue. Precarga del perno
  // 1/4-20 -> presión media en la corona -> momento al que se abre la junta.
  const Fi14 = LIM.perno14.parNm / (LIM.perno14.K * P.M.b14.d / 1000);
  const ri = P.M.b14.d / 2, ro = dPunta / 2;
  const Acorona = Math.PI * (ro * ro - ri * ri), Icorona = Math.PI * (ro ** 4 - ri ** 4) / 4;
  const Mdespegue = (Fi14 / Acorona) * Icorona / ro;
  chk('EST-01', 'la corona del eje de rodillo no despega de la placa peine',
    Mempot, Mdespegue / 1.5, '<=',
    `perno ${LIM.perno14.grado} a ${LIM.perno14.parNm} N·m (K=${LIM.perno14.K}) → precarga ${r2(Fi14)} N `
    + `= ${r2(Fi14 / (LIM.perno14.Sp * LIM.perno14.As) * 100)} % de la carga de prueba. Si la junta se abre, `
    + `el eje pasa de ${r2(sigmaEje)} a ${r2(sigmaEjeArticulado)} MPa.`, 'N·mm');
  chk('EST-02', 'tensión de flexión del eje de rodillo (Ø7.94, junta cerrada)',
    sigmaEje, 0.6 * LIM.A36.Fy, '<=',
    `el modelo no declara grado de acero para el eje; se juzga contra A36 (Fy = ${LIM.A36.Fy} MPa), `
    + `que es el mínimo defendible. Grado de empotramiento del diente: ${r2(empotramiento)}.`, 'MPa');

  // -- 9.12 vuelco del cassette sobre el actuador ----------------------------
  // El conjunto móvil se apoya en DOS zonas de la horquilla, a Y = ±90, y en nada
  // más: las colisas de los 4 pasadores guía son VERTICALES y no pueden dar
  // reacción en Z. Un bulto excéntrico descarga un apoyo hasta despegarlo.
  const masaMovil = (m.elevacion.masaElevadaKg ?? 89) - P.cargaMaxKg;
  const yApoyo = 90;                                    // dis: centroide de cada apoyo (Y ±80…100)
  const Mvuelco = P.cargaMaxKg * g * ((P.nRodillos - 1) / 2 * P.paso) / 1000;
  const Mdespega = (masaMovil + P.cargaMaxKg) * g * yApoyo / 1000;
  chk('EST-03', 'vuelco del cassette: no despegar el apoyo de la horquilla',
    Mvuelco, Mdespega / 1.5, '<=',
    `bulto de ${P.cargaMaxKg} kg sobre el rodillo extremo (Y = ±${r2((P.nRodillos - 1) / 2 * P.paso)}). `
    + `SMC NO publica momento de vuelco admisible para la serie MGP (web PNEU-019): sólo carga lateral `
    + `y par alrededor del eje del vástago.`, 'N·m');
  chk('EST-04', 'carga lateral en Y sobre la placa del actuador',
    Math.min(fricBulto, empujeSup), m.elevacion.cargaLateralAdmisibleN ?? 352, '<=',
    'es la reacción de empujar el bulto, no el rozamiento de los apoyos: los 4 pasadores guía '
    + 'no restringen Y (su collar queda a 26 mm de la placa colgante).', 'N');

  // -- 9.13/9.14 tornillería del rodillo: borde y desgarro -------------------
  const eBorde = rodM.dienteSobreEje ?? 0;
  chk('EST-05', 'distancia del taladro del perno de rodillo al canto del diente',
    eBorde, LIM.bordeMinEnD * P.M.b14.d, '>=',
    `AISI S100-16 J3.2 (web STR-001): e ≥ 1.5·d = ${r2(LIM.bordeMinEnD * P.M.b14.d)} mm. `
    + `Hoy ${r2(eBorde / P.M.b14.d)}·d.`, 'mm');
  const Lc = eBorde - (rodM.pasanteD ?? 7) / 2;
  const Rdesgarro = LIM.desgarroK * Lc * P.placaT * LIM.A36.Fu;
  chk('EST-06', 'desgarro de la placa peine detrás del perno de rodillo',
    Pcarga * LIM.desgarroOmega, Rdesgarro, '<=',
    `AISC J3.10 (web STR-004) con Lc = ${r2(Lc)} mm y t = ${r2(P.placaT)} mm. La carga del rodillo `
    + 'empuja hacia ABAJO, o sea alejándose del canto corto: la resistencia no es el problema.', 'N');

  // -- 9.15 voladizo del motorreductor ---------------------------------------
  const Rrueda = resul(T1, LIM.banda.T2N, envG.ruedaMotriz ?? 180);
  chk('EST-07', 'carga radial en el eje de salida del motorreductor',
    Rrueda, LIM.sewFRaN, '<=',
    `FRa del R07/RF07 DT71D4 (web MOT-009), definida en el PUNTO MEDIO del eje; la rueda motriz `
    + `queda a 34.4 mm de la cara de la brida y SEW no publica las constantes a y b para corregirla.`, 'N');

  // -- 9.16 impacto del pop-up ------------------------------------------------
  // La comprobación §6 de energía cinética NO puede fallar: elevacion.mjs deriva la
  // velocidad de la propia energía admisible, así que Ek ≡ Ek_adm por construcción.
  // Se denuncia aquí y se sustituye por dos comprobaciones que sí muerden.
  const ekTautologico = m.elevacion.energiaCineticaJ !== undefined
    && Math.abs(m.elevacion.energiaCineticaJ - m.elevacion.energiaAdmisibleJ) < 1e-3;
  const uImp = (m.elevacion.velocidadMaxMmS ?? 0) / 1000;               // m/s de impacto
  const decel = uImp ** 2 / (2 * LIM.topeAplastamientoMm / 1000);       // m/s² al frenar
  chk('DIN-12', 'el bulto no despega de los rodillos al frenar el pop-up',
    decel, g, '<=',
    `con ${LIM.topeAplastamientoMm} mm de aplastamiento del tope; el bulto salta `
    + `${r2(uImp ** 2 / (2 * g) * 1000)} mm y reasienta con ${r2(0.5 * P.cargaMaxKg * uImp ** 2)} J. `
    + `Se corrige estrangulando a ≤ ${r2(Math.sqrt(2 * g * LIM.topeAplastamientoMm / 1000) * 1000)} mm/s.`, 'm/s²');
  const Fimpacto = 2 * (m.elevacion.energiaCineticaJ ?? 0) / (LIM.topeAplastamientoMm / 1000);
  const Fi38 = LIM.perno38.parNm / (LIM.perno38.K * P.M.b38.d / 1000);
  chk('EST-09', 'impacto del pop-up contra los 8 pernos 3/8" de las spacer plate',
    Fimpacto, 8 * LIM.muChapa * Fi38, '<=',
    `unión por rozamiento: ${LIM.perno38.grado} a ${LIM.perno38.parNm} N·m → ${r2(Fi38)} N de precarga `
    + `por perno y µ = ${LIM.muChapa}.`, 'N');

  // -- 9.17 el alma del canal de montaje sostiene el cilindro ----------------
  // El MGPM80 se atornilla ENCIMA del alma del canal y toda la reacción del pop-up
  // baja por ahí. El alma es chapa de 12 GA con un vano libre de P.canalCilY entre
  // las dos alas, y la huella del cilindro (G = 91.5 en X) cae justo en el centro.
  // Se calcula como banda de 1 mm de ancho APOYADA en las dos alas —no empotrada—:
  // un ala de 103 mm de alto en 12 GA es una sección abierta, su rigidez torsional
  // es GJ/L ≈ 1.1e5 N·mm/rad y no puede empotrar nada.
  const cargaAlma = (m.elevacion.cargaN ?? 873) + 6.49 * g;             // móvil + bulto + cilindro
  const vanoAlma = P.canalCilY - P.cal12;                               // entre fibras medias de las alas
  const huellaX = m.elevacion.huellaCuerpoMm?.[0] ?? 91.5;
  const huellaY = m.elevacion.huellaCuerpoMm?.[1] ?? 202;
  const wAlma = cargaAlma / huellaY;                                    // N por mm de ancho en Y
  const Malma = wAlma / 8 * (2 * vanoAlma - huellaX);                   // N·mm por mm de ancho
  const sigmaAlma = Malma / (P.cal12 ** 2 / 6);
  chk('EST-10', 'flexión del alma del canal de montaje bajo el cilindro',
    sigmaAlma, 0.6 * LIM.A36.Fy, '<=',
    `${r2(cargaAlma)} N repartidos en la huella de ${huellaX}×${huellaY} mm sobre un vano de `
    + `${r2(vanoAlma)} mm de chapa de ${r2(P.cal12)} mm. Y en el centro del vano hay además los dos `
    + `taladros Ø30 de paso de las varillas guía. Con la aceleración de la carrera la carga sube a `
    + `${r2((m.elevacion.masaElevadaKg ?? 89) * (g + (uImp * 1000 / 1000) ** 2 / (2 * P.carrera / 1000)) + 6.49 * g)} N.`, 'MPa');

  // -- 9.18 los conjuntos soldados declaran su cordón -------------------------
  const soldadas = propias.filter((p) => p.weldment || /soldad/i.test(p.union || '') || /SOLDADA/.test(p.name));
  const sinCordon = soldadas.filter((p) => !p.soldadura);
  chk('EST-08', 'conjuntos soldados sin cordón declarado', sinCordon.length, 0, '<=',
    `AISC J2.4 / AWS D1.3 (web STR-002/STR-003): en chapa de 12 GA el cordón mínimo queda limitado `
    + `al espesor, ${r2(P.cal12)} mm. Falta \`soldadura: { garganta, proceso, norma }\` en: `
    + sinCordon.slice(0, 4).map((p) => p.name.replace(/^(FIJO|MÓVIL) · /, '')).join(' · ')
    + (sinCordon.length > 4 ? ` … y ${sinCordon.length - 4} más` : ''), 'piezas');

  const fallos9 = R9.filter((f) => !f.ok);

  return e.length
    ? (() => { throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - ')); })()
    : {
        piezas: propias.length, contexto: contexto.length,
        movil: movil.length, fijo: fijo.length, tornilleria: hw.length,
        emergencia: r2(emerge), retraccion: r2(retrae), carrera: P.carrera,
        holguraRodilloRegleta: r2(holgura),
        solapesAABB: choques,
        retraidoParesQueCrecen: choquesBajo.length,
        retraidoParesTolerados: toleradosBajo,
        holguraPlacaTransmisionCanalRetraidoMm: holguraPlacaCanal,
        rodillos: P.nRodillos, bandas: P.nBandas, paso: P.paso, BR: P.BR,
        largoBanda, envolventeRodillo: env,
        actuador: el.actuador, componenteActuador: el.componente,
        empujeN: el.empujeN, empujeN60psi: el.empujeN60psi, factorSeguridad: fs,
        factorSeguridad60psi: el.factorSeguridad60psi,
        velocidadMaxMmS: el.velocidadMaxMmS, tiempoSubidaMs: el.tiempoSubidaMs,
        energiaCineticaJ: el.energiaCineticaJ, aireLitrosANRciclo: el.aireLitrosANRciclo,
        parPlacaNm: el.parPlacaNm, cargaLateralN: el.cargaLateralN,
        salidaVarillasMm: el.salidaVarillasMm, holguraPlacaMotorMm: el.holguraPlacaMotorMm,

        // ---- §9 resistencia y dinámica (revisión estructural 2026-07-29) ----
        estructural: {
          comprobaciones: R9,
          incumplen: fallos9.length,
          abiertos: abiertos.map((f) => ({ id: f.id, titulo: f.titulo, uso: f.uso, dueño: f.dueño })),
          cinematica: {
            rpmRodillo: r2(nRodillo), vRodilloMs: r2(vRodillo), vRodilloFpm: r2(vRodillo * 196.85),
            multiplicacion: r2(nRodillo / P.motorRpm), vDeclaradaMs: P.velocidad,
            parSalidaNm: r2(parSalida), tiroBandaN: r2(tiroBanda), empujeSuperficieN: r2(empujeSup),
          },
          bulto: {
            masaKg: P.cargaMaxKg, muSupuesto: LIM.muBulto, muSaturacionAccionamiento: r2(muSaturacion),
            aceleracionMs2: r2(aBulto), patinajeMm: r2(deslizamiento), campoRodillosMm: r2(campoRodillos),
            tiempoSincronizacionMs: r2(vRodillo / aBulto * 1000),
          },
          banda: {
            T1N: r2(T1), T2N: LIM.banda.T2N, kadmN: LIM.banda.kadmN,
            capstanRueda: r2(capstan), relacionTensiones: r2(T1 / LIM.banda.T2N),
            diaEnvolturaMinMm: r2(dArrastre), diaMinCatalogoMm: LIM.banda.dMinMm,
          },
          rodillo: {
            fuerzaRadialBandaN: r2(Rbanda), fuerzaRadialConBultoN: r2(Rbulto),
            cargaPorRodamientoN: r2(Prodam), s0: r2(LIM.rod608.C0 / Prodam),
            L10h: r2(L10h), L10hConBultoPermanente: r2((LIM.rod608.C / Prodam) ** 3 * 1e6 / (60 * nRodillo)),
            gradoEmpotramiento: r2(empotramiento),
            sigmaEjeMPa: r2(sigmaEje), sigmaEjeSiDespegaMPa: r2(sigmaEjeArticulado),
            momentoCoronaNmm: r2(Mempot), momentoDespegueCoronaNmm: r2(Mdespegue),
            precargaPerno14N: r2(Fi14), pernoDeclarado: LIM.perno14.grado,
            juegoRodamientoSobreEjeMm: [r2(7.992 - 7.9375), r2(8.000 - 7.9285)],   // web BRG-007
          },
          cassette: {
            masaMovilDeclaradaKg: r2(masaMovil),
            momentoVuelcoNm: r2(Mvuelco), momentoDespegueApoyoNm: r2(Mdespega),
            FSdespegue: r2(Mdespega / Mvuelco),
            cargaLateralYN: r2(Math.min(fricBulto, empujeSup)),
            excentricidadAdmisibleFS15mm: r2(Mdespega / 1.5 / (P.cargaMaxKg * g) * 1000),
          },
          impacto: {
            velocidadImpactoMmS: r2(uImp * 1000), aplastamientoSupuestoMm: LIM.topeAplastamientoMm,
            deceleracionMs2: r2(decel), enG: r2(decel / g),
            saltoBultoMm: r2(uImp ** 2 / (2 * g) * 1000),
            energiaReasienteJ: r2(0.5 * P.cargaMaxKg * uImp ** 2),
            fuerzaEnEstructuraN: r2(Fimpacto),
            velocidadSinDespegueMmS: r2(Math.sqrt(2 * g * LIM.topeAplastamientoMm / 1000) * 1000),
            chequeoEkTautologico: ekTautologico,
          },
          soldadura: { conjuntosSoldados: soldadas.length, sinCordonDeclarado: sinCordon.length },
        },

        // ---- fabricación (§10) --------------------------------------------
        tolerancias: {
          chapa: NORMA.chapa.clase, mecanizado: NORMA.mecanizado.clase,
          soldadura: NORMA.soldadura.clase,
          soldaduraSobreElLargo: `±${tolSold} mm sobre ${cotaSoldada} mm; forma `
            + `${tolForma13920(cotaSoldada, 'F')} mm`,
          piezasConAjusteISO286: conAjuste, ajustesDeclarados: AJUSTES.length,
        },
        encajes: {
          total: encajes.length,
          juntas: porId.size,
          deposicion: encajes.filter((q) => q.rol === 'posicion').length,
          depaso: encajes.filter((q) => q.rol === 'paso').length,
          aTope: encajes.filter((q) => q.tipo === 'tope').length,
          holguraMaxDePosicionMm: r2(peorEncaje),
          ranura12GA: ranuraPara('12GA').ancho,
          margenSobreISO13920B: r2(tolSold - peorEncaje),
        },
        componentes: {
          designados: normalizacion.designadas,
          sinDesignar: normalizacion.sinDesignar.length,
          avisosDeDesignacion: normalizacion.avisos.length,
        },
      };
}

const metricas = verify();

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------
const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Transferencia 90° de rodillos emergentes para clasificador de bandas angostas (NBT90)',
    capa: 'user',
    origen: 'gen_nbt90.mjs (paramétrico). Levantado de las dos vistas aportadas por el usuario '
      + '(FIGURE 8A y despiece del tensor neumático del manual Hytrol ProSort MRT, bulletin 656) '
      + 'escalando por píxeles con tools/med_px.py: k = 0.6320 mm/px, anclada al paso de bandas de 3" '
      + 'y confirmada por ocho piezas de catálogo (ver ESCALA.md). La geometría es un diseño '
      + 'paramétrico propio; del manual se toman cotas de referencia y nomenclatura de componentes '
      + 'comprables, no sus planos.',
    equipo: `BR ${enPulg(P.BR)} · ${P.nRodillos} rodillos vulcanizados Ø${enPulg(P.rodDia)} a paso `
      + `${enPulg(P.paso)} · ${P.nBandas} bandas angostas de ${enPulg(P.bandaAncho)} del anfitrión · `
      + `serpentín de banda plana de ${enPulg(P.serpAncho)} · motorreductor ${P.motorHP} HP a ${P.motorRpm} rpm · `
      + `elevación neumática con cilindro compacto de guías SMC MGPM80-10Z (Ø${P.mesaBore}, carrera ${P.mesaCarrera} mm)`,
    estado_modelado: `ELEVADO: la generatriz superior del rodillo queda ${r2(metricas.emergencia)} mm `
      + `(= ${enPulg(P.emerge)}) sobre el plano de las bandas; retraído baja ${r2(metricas.retraccion)} mm por debajo`,
    ejes: 'X = eje de los rodillos (flujo del anfitrión, y sentido de marcha de las bandas angostas); '
      + 'Y = expulsión a 90° (los rodillos se reparten en Y); Z = arriba, Z=0 en la cara inferior del bastidor',
    procedencia: {
      medido: 'cotas de cad/ensambles/nbt90/analisis/vista_izquierda.json y vista_derecha.json '
        + '(perfil de píxeles con tools/med_px.py; cada valor cita su fila/columna)',
      web: 'cad/ensambles/nbt90/analisis/web_facts.json — lista de partes y fichas de componente, '
        + 'cada hecho con URL, fecha de acceso y cita textual',
      user: 'las decisiones de diseño (marcadas `dis` en params.mjs y en el bloque L de cada módulo)',
    },
    verificaciones: metricas,
    modulos: m,
  },
  parts: E.parts,
  constraints: [],
};

const aqui = dirname(fileURLToPath(import.meta.url));
const out = join(aqui, 'narrow_belt_transfer_90.json');
writeFileSync(out, JSON.stringify(doc, null, 1));

// ---------------------------------------------------------------------------
// El MISMO ensamble en estado RETRAÍDO, para poder verificarlo con la misma
// herramienta exacta que el elevado.
//
// No es un modelo distinto ni una segunda fuente de verdad: es este documento
// con las piezas MÓVIL trasladadas −P.carrera en Z. Vale porque las features de
// cada pieza son relativas a su ancla (`Ensamble.addPart` las relativiza), así
// que mover `pos` mueve la pieza entera y nada más. Se emite aparte —y no se
// deja sólo en la comprobación de cajas de `verify`— porque el estado bajo tiene
// que pasar por `interferencias_brep.py`, que es la verificación que decide:
//
//   python3 ensambles/nbt90/interferencias_brep.py --doc ensambles/nbt90/out/nbt90_retraido.json \
//           --informe interferencias_brep_retraido.json --tol 0.05
//
// (`regenerar.sh`, paso 3/8, lo hace y se detiene si aparece algo nuevo.)
const docBajo = structuredClone(doc);
let nBajadas = 0;
for (const p of docBajo.parts) {
  if (!/^MÓVIL/.test(p.name)) continue;
  p.pos = [p.pos[0], p.pos[1], r2(p.pos[2] - P.carrera)];
  nBajadas++;
}
docBajo.meta.nombre += ' — ESTADO RETRAÍDO';
docBajo.meta.estado_modelado = `RETRAÍDO: derivado de narrow_belt_transfer_90.json bajando las `
  + `${nBajadas} piezas MÓVIL ${P.carrera} mm en Z. La generatriz superior del rodillo queda `
  + `${r2(metricas.retraccion)} mm por DEBAJO del plano de las bandas del anfitrión. No se edita a `
  + `mano: lo emite gen_nbt90.mjs en la misma pasada que el estado elevado.`;
mkdirSync(join(aqui, 'out'), { recursive: true });
const outBajo = join(aqui, 'out', 'nbt90_retraido.json');
writeFileSync(outBajo, JSON.stringify(docBajo, null, 1));

console.log(`OK: ${E.parts.length} piezas (${metricas.movil} móviles, ${metricas.fijo} fijas, `
  + `${metricas.tornilleria} de tornillería, ${metricas.contexto} de contexto), ${E.nf} funciones → ${out}`);
console.log(`   emergencia ${metricas.emergencia} mm · carrera ${metricas.carrera} mm · `
  + `holgura rodillo↔regleta ${metricas.holguraRodilloRegleta} mm · banda ${metricas.largoBanda ?? '—'} mm`);
console.log(`   RETRAÍDO: ${metricas.retraidoParesQueCrecen} pares MÓVIL↔FIJO ganan solape de caja al bajar `
  + `(${metricas.retraidoParesTolerados} tolerados por perfil hueco, ver RETRAIDO_CAJA_ABIERTA); `
  + `placa de transmisión ↔ techo del canal ${metricas.holguraPlacaTransmisionCanalRetraidoMm} mm`);
console.log(`   ${nBajadas} piezas MÓVIL bajadas ${P.carrera} mm → ${outBajo} (para interferencias_brep.py)`);

// --- §9: resistencia y dinámica. Se imprime SIEMPRE, cumpla o no --------------
// Un hallazgo abierto no puede pasar desapercibido por estar dentro de un JSON de
// 800 kB: sale por consola en cada generación, con su utilización y su dueño.
{
  const S = metricas.estructural;
  const peor = [...S.comprobaciones].filter((c) => c.ok).sort((a, b) => b.uso - a.uso)[0];
  console.log(`   ESTRUCTURAL: ${S.comprobaciones.length - S.incumplen}/${S.comprobaciones.length} comprobaciones cumplen · `
    + `rodillo ${S.cinematica.rpmRodillo} rpm = ${S.cinematica.vRodilloMs} m/s (${S.cinematica.vRodilloFpm} fpm) · `
    + `T1 ${S.banda.T1N} N · L10 rodillo ${S.rodillo.L10h} h · σ eje ${S.rodillo.sigmaEjeMPa} MPa`);
  if (peor) console.log(`   la que menos margen tiene de las que cumplen: ${peor.id} «${peor.titulo}» al ${r2(peor.uso * 100)} %`);
  for (const a of S.abiertos) {
    const c = S.comprobaciones.find((x) => x.id === a.id);
    console.log(`   ✗ ABIERTO ${a.id} · ${a.titulo}: ${c.valor} ${c.unidad} frente a ${c.limite} `
      + `(utilización ${a.uso}) → ${a.dueño}`);
  }
  if (S.impacto.chequeoEkTautologico) {
    console.log('   ⚠ la comprobación de energía cinética de §6 es TAUTOLÓGICA: elevacion.mjs deriva la '
      + 'velocidad del propio límite, así que Ek ≡ Ek_adm y nunca puede fallar (ver REVISION_ESTRUCTURAL.md).');
  }
}
