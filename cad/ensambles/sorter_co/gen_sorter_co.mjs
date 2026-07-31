#!/usr/bin/env node
// gen_sorter_co.mjs — INTEGRADOR del SORTER CO ADAPTADO a la transferencia
// NBT90. Decisión del cliente (ADAPTACION.md): el sorter cede; manda el
// espacio entre bandas.
//
//   node ensambles/sorter_co/gen_sorter_co.mjs            (desde cad/)
//   TEST_ROMPE=paso|ventana|roller|profundidad|luz node … (banco de la compuerta:
//       inyecta UN defecto y demuestra que verify() lo para SIN emitir JSON)
//
// Emite (solo si la compuerta pasa):
//   sorter_co_adaptado.json          — documento foto3d-cad (NBT90 como contexto)
//   out/sorter_co_brep.json          — el mismo ensamble SIN marcas de contexto en
//                                      el NBT90 y sin las cajas del cliente, para
//                                      ../nbt90/interferencias_brep.py --doc …
//
// Ejes: los del STEP del cliente (X ancho / Y flujo / Z arriba, plano de
// transporte Z=+52.333). El NBT90 entra rotado Rz(−90°) y trasladado T.

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Ensamble, r2 } from '../nbt90/lib.mjs';
import { STEP, NBT, FRANJA, Xc, EJES, T, y0, y1, PERCHA, POZO, CALLE, TENSOR, bordeExtDescarga } from './adapt/params_adapt.mjs';
import { bboxU, solapeAABB } from './adapt/util_adapt.mjs';
import { nbt90, clienteFijo } from './adapt/mod_ctx.mjs';
import { calles } from './adapt/mod_calles.mjs';
import { percha } from './adapt/mod_percha.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------
const E = new Ensamble();
const m = {};
m.nbt90 = nbt90(E);
m.cliente = clienteFijo(E);
m.calles = calles(E);
m.percha = percha(E);

// ---------------------------------------------------------------------------
// Banco de la compuerta: inyección de UN defecto controlado (TEST_ROMPE)
// ---------------------------------------------------------------------------
const ROMPE = process.env.TEST_ROMPE || '';
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
}

// ---------------------------------------------------------------------------
// Compuerta
// ---------------------------------------------------------------------------
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
    const w = r2(b.hi[0] - b.lo[0]);
    const cx = (b.lo[0] + b.hi[0]) / 2;
    const eje = EJES.reduce((a, b2) => Math.abs(b2 - cx) < Math.abs(a - cx) ? b2 : a);
    if (/Banda T5/.test(p.name)) {
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
    [/Puente de calle — regleta/, /Banda T5/],               // apoyo banda↔regleta
    [/Guía de deslizamiento/, /Banda T5/],                   // apoyo banda↔guía
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
    [/CTX · IDLER-ENS/, /Perfil ranurado|Guía de deslizamiento|Polea conducida|Banda T5|Cierre de guía/],
    [/CTX · Drive kit/, /Perfil ranurado|Polea motriz/],
    [/CTX · Soporte motriz/, /Polea motriz|Perfil ranurado/],
    // los AABB no ven cortes: el casquillo/perno del cuelgue +X pasan por la
    // MUESCA real del chapón (verificada aritméticamente en §C)
    [/Bastidor FRAME_MIR_MIR_MIR/, /Casquillo separador|Placa de escote/],
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
  ];
  const esBanda = (p) => /Banda T5/.test(p.name);
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

  // --- G. percha -----------------------------------------------------------
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
    /Banda T5/,                              // el plano de transporte mismo
    /Tapa-soporte de extremo/,               // tapas del eje del rodillo NBT90: suben
                                             //   a Z 54.17 EN LA LÍNEA DEL RODILLO,
                                             //   4.5 bajo la cresta elevada (58.68)
                                             //   que las rodea — parte del sistema
    /CTX · TER1/,                            // canal-guía lateral del cliente en el
                                             //   extremo motriz (pose original;
                                             //   fuera del corredor del módulo)
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
    if (B.envolventes_deg.motriz < 150) e.push(`envolvente en la motriz ${B.envolventes_deg.motriz}° < 150°`);
    if (B.envolventes_deg.conducida < 150) e.push(`envolvente en la conducida ${B.envolventes_deg.conducida}° < 150°`);
    // el contorno emitido va circunscrito (+flecha de faceta, como el serpentín
    // del NBT90): el dorso real del modelo queda planoBanda + flecha
    if (Math.abs(B.dorsoPortanteZ - (STEP.planoBanda + B.flechaFacetaMotriz)) > 0.05) {
      e.push(`el dorso del portante queda en Z=${B.dorsoPortanteZ}, no en el plano ${STEP.planoBanda} + faceta ${B.flechaFacetaMotriz}`);
    }
    if (B.holguraBandaCilindroTensor < 3) {
      e.push(`la bajada del pozo pasa a ${B.holguraBandaCilindroTensor} mm del cilindro tensor (mín 3)`);
    }
  }

  // --- métricas ------------------------------------------------------------
  return {
    errores: e,
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
    percha: { cuelgue: m.percha.cuelgue, flechaLargueroMm: m.percha.flechaLargueroMm, tuercasT: m.percha.tuercasT, muesca: m.percha.muesca },
  };
}

const V = verify();

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
console.log(`   PERCHA: ${V.percha.cuelgue.pernos38} pernos 3/8 por colisas del side + ${V.percha.cuelgue.apoyoLenguetas} lengüetas de apoyo · ${r2(V.percha.cuelgue.cortantePorPernoN)} N/perno (adm ${V.percha.cuelgue.cortanteAdmisiblePernoN}) · flecha larguero ${V.percha.flechaLargueroMm} mm · masa NBT90 (cota sup.) ${NBT.masaKg} kg`);
console.log(`   → ${outBrep} (para ../nbt90/interferencias_brep.py --doc)`);
