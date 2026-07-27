#!/usr/bin/env node
// gen_nbt90.mjs — INTEGRADOR de la transferencia 90° de rodillos emergentes
// para clasificador de bandas angostas (Hytrol ProSort MRT 90° Transfer).
//
// Llama a los cuatro módulos de diseño, corre la compuerta de verificación y
// emite `narrow_belt_transfer_90.json` (formato foto3d-cad, capa `user`).
//
//   node cad/ensambles/nbt90/gen_nbt90.mjs
//
// Ejes: X = eje de los rodillos (flujo del anfitrión) · Y = expulsión a 90°
// (los rodillos se reparten en Y a paso 3") · Z = arriba. mm. Estado: ELEVADO.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Ensamble, bboxPieza, solapan, r2 } from './lib.mjs';
import { P, enPulg } from './params.mjs';
import { bastidor } from './bastidor.mjs';
import { rodillos } from './rodillos.mjs';
import { transmision } from './transmision.mjs';
import { elevacion } from './elevacion.mjs';

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
  const fs = m.elevacion.factorSeguridad;
  if (fs !== undefined && fs < 1.5) e.push(`factor de seguridad del actuador ${fs} < 1.5`);
  if (m.elevacion.carrera !== undefined && Math.abs(m.elevacion.carrera - P.carrera) > 0.01) {
    e.push(`la carrera del actuador (${m.elevacion.carrera}) no es la del equipo (${P.carrera})`);
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

  return e.length
    ? (() => { throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - ')); })()
    : {
        piezas: propias.length, contexto: contexto.length,
        movil: movil.length, fijo: fijo.length, tornilleria: hw.length,
        emergencia: r2(emerge), retraccion: r2(retrae), carrera: P.carrera,
        holguraRodilloRegleta: r2(holgura),
        solapesAABB: choques,
        rodillos: P.nRodillos, bandas: P.nBandas, paso: P.paso, BR: P.BR,
        largoBanda, envolventeRodillo: env,
        empujeN: m.elevacion.empujeN, factorSeguridad: fs,
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
      + `elevación neumática Ø${P.mesaBore} de ${P.carrera} mm`,
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

const out = join(dirname(fileURLToPath(import.meta.url)), 'narrow_belt_transfer_90.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${E.parts.length} piezas (${metricas.movil} móviles, ${metricas.fijo} fijas, `
  + `${metricas.tornilleria} de tornillería, ${metricas.contexto} de contexto), ${E.nf} funciones → ${out}`);
console.log(`   emergencia ${metricas.emergencia} mm · carrera ${metricas.carrera} mm · `
  + `holgura rodillo↔regleta ${metricas.holguraRodilloRegleta} mm · banda ${metricas.largoBanda ?? '—'} mm`);
