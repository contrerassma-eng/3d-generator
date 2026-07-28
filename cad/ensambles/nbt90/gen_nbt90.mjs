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

const E = new Ensamble();
const m = {
  bastidor: bastidor(E) || {},
  rodillos: rodillos(E) || {},
  transmision: transmision(E) || {},
  elevacion: elevacion(E) || {},
};

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
