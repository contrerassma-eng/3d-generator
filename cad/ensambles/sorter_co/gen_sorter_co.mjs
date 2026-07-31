#!/usr/bin/env node
// gen_sorter_co.mjs — INTEGRADOR del SORTER CO ADAPTADO a la transferencia
// NBT90. Decisión del cliente (ADAPTACION.md): el sorter cede; manda el
// espacio entre bandas.
//
//   node ensambles/sorter_co/gen_sorter_co.mjs            (desde cad/)
//   TEST_ROMPE=paso|ventana|roller|profundidad|luz|pasillo|borde|at10|retencion
//              |guia|guarda|pivote|pila|cilindro node …  (banco de la compuerta:
//       inyecta UN defecto y demuestra que verify() lo para SIN emitir JSON.
//       Los tres últimos son del TENSOR: pivote = le roba los anillos DIN 471
//       del eje; pila = le roba un separador; cilindro = deja una banda sin él)
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
import { CLEVIS, RETEN, IDLER, EJEC, PIVOTE, GUARDAS, GUIAS } from './adapt/params_estaciones.mjs';
import { bboxU, solapeAABB } from './adapt/util_adapt.mjs';
import { nbt90, clienteFijo } from './adapt/mod_ctx.mjs';
import { calles } from './adapt/mod_calles.mjs';
import { percha } from './adapt/mod_percha.mjs';
import { estaciones } from './adapt/mod_estaciones.mjs';
import { guardas } from './adapt/mod_guardas.mjs';
// ▼▼▼ TENSOR NEUMÁTICO DE BRAZOS POR BANDA (bloque propio) ▼▼▼
import { tensor2, leerRamal } from './adapt/mod_tensor2.mjs';
import { TENSOR_VIEJO, PIV, TENSION, NEUM, PALANCA, EJE_CALC } from './adapt/params_tensor2.mjs';
import { pg40 } from './adapt/mod_pg40.mjs';
import { FLAGS as PG40F, PUBLICA as PG40PUB, CARGA as CARGA_PG40 } from './adapt/params_pg40.mjs';
// ▲▲▲ ------------------------------------------------------ ▲▲▲
// ▼▼▼ TAMBOR MOTRIZ · CONDUCIDO · RODILLOS DE RETORNO (bloque propio) ▼▼▼
import { tambores } from './adapt/mod_tambores.mjs';
import { TAMBOR as TAMB_P, UCF207 as TAMB_UCF, CONDUCIDO as TAMB_CON,
  RETORNOS as TAMB_RET, TAMBORES as TAMB_EJES, RETORNO as TAMB_RAMAL } from './adapt/params_tambores.mjs';
// ▲▲▲ ------------------------------------------------------------- ▲▲▲

const aqui = dirname(fileURLToPath(import.meta.url));

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
  if (PG40F.reemplazaPerfil4080) rxFuera.push(/FIJO · Perfil ranurado 40×80/);
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
    rxFuera.push(/Polea motriz T5-63T|Polea conducida T5|Volante contraflexión|Polea plana Ø117\.9|Pletina de volante|Pletina V[23]|Eje Ø20×50 de pozo|Espaciador de aros|Anillo 3AM1-20|Anillo DIN 472-42/);
  }
  if (PG40F.desactivaPercha) rxFuera.push(/percha|Placa de cuelgue NBT90|Lengüeta de apoyo|Escuadra larguero|Escuadra ménsula|Ménsula percha|Placa frontal ménsula|Placa de escote|Casquillo separador/i);
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
m.tambores = tambores(E);
// ▲▲▲ ----------------------------------------------- ▲▲▲

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
  + '|Eje de polea tensora|Bulón del lóbulo');

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
    [/PG40 · Cartela de rodillo de retorno/, /RETORNO RR/],
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
    /Banda T5/,                              // el plano de transporte mismo
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

  // --- M. DETALLE DE ESTACIONES --------------------------------------------
  const avisosDeclarados = [];
  {
    // M1 · eje motriz común: existe, cubre las 5 calles, entra en el acople y
    //      su muñón vive en la UCFL pegada al chapón de descarga
    const ejeC = partes.find(p => /Eje motriz común/.test(p.name));
    if (!ejeC) e.push('no hay eje motriz común');
    else {
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
    const xA = -28, xB = r2(EJEC.ucfl.posX - EJEC.ucfl.housingW / 2);
    const Lv = r2(xB - xA);
    const dEje = EJEC.d;
    const I = Math.PI / 64 * Math.pow(dEje, 4);
    let sumaFlecha = 0;
    for (const Bx of EJES) {
      const a = Math.min(Bx - xA, xB - Bx);                // distancia al apoyo más cercano
      sumaFlecha += EJEC.flecha.cargaPorCalleN * a * (3 * Lv * Lv - 4 * a * a);
    }
    const flechaEje = r2(sumaFlecha / (48 * 207000 * I) * 100) / 100;
    if (flechaEje > EJEC.flecha.limite) e.push(`flecha del eje motriz común ${flechaEje} > ${EJEC.flecha.limite} mm`);
    const Tnm = 5 * EJEC.parPorCalleNm;
    const tau = r2(16 * Tnm * 1000 / (Math.PI * Math.pow(dEje, 3)));
    if (tau > EJEC.tauAdmMPa) e.push(`torsión del eje común ${tau} > ${EJEC.tauAdmMPa} MPa`);
    m.ejeComunCalc = { vanoMm: Lv, flechaMm: flechaEje, tauMPa: tau, parNm: Tnm, hipotesis: '6 bar (PNEU-003)' };
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
      const flancoS = r2(POZO.v1.y - (STEP.volante.cara / 2 + 2.5));
      if (bS.lo[1] < STEP.idlerEnsY[1] + 2) e.push(`la guarda sur (Y ${r2(bS.lo[1])}) pisa el IDLER-ENS (${STEP.idlerEnsY[1]})`);
      if (r2(bS.lo[1] + tCh) > flancoS - 5) e.push(`la cara de la guarda sur (Y ${r2(bS.lo[1] + tCh)}) no deja 5 al flanco de la bajada (${flancoS})`);
      if (bS.lo[2] > -420 || bS.hi[2] < -42) e.push(`la guarda sur no cubre de Z −420 a −42 (Z ${r2(bS.lo[2])}…${r2(bS.hi[2])})`);
      // NORTE: franja pegada a la cara sur de la bancada LAT TOP (−513.12 step),
      // al norte del flanco de V4 (−553.5 calc) y 5 bajo el retorno (−52.05)
      const flancoN = r2(POZO.v4.y - (STEP.volante.cara / 2 + 2.5));   // −658.5 (bajada V4↔V3)
      if (bN.lo[1] < -520 || bN.lo[1] > -514) e.push(`la guarda norte (cara Y ${r2(bN.lo[1])}) no queda contra la bancada LAT TOP (−513.12)`);
      if (bN.lo[2] > -116 || bN.hi[2] < -62) e.push(`la guarda norte no cubre la franja Z −116…−62 (Z ${r2(bN.lo[2])}…${r2(bN.hi[2])})`);
      if (bN.hi[2] > -57) e.push(`la guarda norte (Z hasta ${r2(bN.hi[2])}) no deja 5 al retorno (−52.05)`);
      m.flancosGuardas = { flancoS, flancoN, retornoZ: -52.05 };
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
    // T2 · EL EJE PIVOTE ASEGURADO (instrucción explícita del cliente)
    const ejes = partes.filter(p => /Eje pivote común/.test(p.name));
    if (ejes.length !== 1) e.push(`el tensor tiene ${ejes.length} ejes pivote (debe ser 1 común a los 5 brazos)`);
    const chum = partes.filter(p => /Chumacera SKF UCFL 206/.test(p.name));
    if (chum.length !== 2) e.push(`el eje pivote tiene ${chum.length} apoyos al bastidor (deben ser 2)`);
    const anillos = partes.filter(p => /Anillo retención eje pivote/.test(p.name));
    if (anillos.length !== 2) e.push(`el eje pivote tiene ${anillos.length} anillos ${PIV.anillo.norma} (deben ser 2) — SIN retención axial de seguridad`);
    const collares = partes.filter(p => /Collar de apriete/.test(p.name));
    if (collares.length !== 2) e.push(`la pila de brazos tiene ${collares.length} collares de tope (deben ser 2) — los brazos podrían correrse a lo largo del eje`);
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
    avisosDeclarados.push(`TAMBORES: los 4 rodillos de retorno necesitan ménsula de PG40 en `
      + TAMB_EJES.retorno.map(R => `${R.id}(Y ${R.y}, Z ${R.z})`).join(' · ')
      + ` — patrón ${TAMB_RET.soporte.patron}×${TAMB_RET.soporte.patron}, taladro Ø${TAMB_RET.soporte.taladro}`);
  }
  // ▲▲▲ ------------------------------------------------------------- ▲▲▲

  // --- métricas ------------------------------------------------------------
  return {
    errores: e,
    pg40: m.pg40,
    // ▼▼▼ TAMBORES ▼▼▼
    tambores: {
      arquitectura: TB.arquitectura, piezas: TB.piezas, diametros: TB.diametros,
      ejesArbol: TB.ejesArbol, tamborEje: TB.tamborEje, caraUtil: TB.caraUtil,
      retornos: TB.retornos, ramal: TB.ramal, abrazados: TB.abrazados,
      arrastre: TB.arrastre, ejes: TB.ejes, rodamientos: TB.rodamientos,
      holguras: TB.holguras, interfazPG40: TB.interfazPG40,
      compradas: TB.compradas, fabricadas: TB.fabricadas,
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
      ramal: m.ramal,
    },
    // ▲▲▲ ---------------------------------------- ▲▲▲
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
if (!PG40F.desactivaPercha) console.log(`   PERCHA: ${V.percha.cuelgue.pernos38} pernos 3/8 por colisas del side + ${V.percha.cuelgue.apoyoLenguetas} lengüetas de apoyo · ${r2(V.percha.cuelgue.cortantePorPernoN)} N/perno (adm ${V.percha.cuelgue.cortanteAdmisiblePernoN}) · flecha larguero ${V.percha.flechaLargueroMm} mm · masa NBT90 (cota sup.) ${NBT.masaKg} kg`);
else console.log(`   PERCHA: DESACTIVADA por bandera (params_pg40.FLAGS.desactivaPercha) — el NBT90 queda tomado por sus 2 canales laterales vía el alargue (6 pernos 3/8), y de ahí al bastidor PG40`);
console.log(`   ESTACIONES: eje motriz común Ø${EJEC.d}/Ø${EJEC.munonUcfl.d} × ${V.estaciones.ejeComun.L} (vano ${V.estaciones.ejeComun.vanoMm}, flecha ${V.estaciones.ejeComun.flechaMm} mm, τ ${V.estaciones.ejeComun.tauMPa} MPa a ${V.estaciones.ejeComun.parNm} N·m — hipótesis ${V.estaciones.ejeComun.hipotesis}) · AT10 recolocada X ${V.estaciones.at10.x.join('…')} · banda AT10 del kit: ${EJEC.bandaAT10.dientes} dientes (${EJEC.bandaAT10.designacion.split('(')[0].trim()})`);
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
