// mod_ctx.mjs — CONTEXTO del ensamble adaptado:
//   (a) el NBT90 completo, cargado de su JSON emitido (NO se regenera ni se
//       tocan sus módulos), transformado Rz(−90°)+T al sistema del sorter,
//       menos el PAQUETE DE INTERFAZ con su anfitrión ProSort (ver EXCLUIR);
//   (b) las piezas del cliente que NO se mueven, como cajas medidas (step).
// Todo lo de este módulo lleva `contexto: true`: el visor lo muestra, la
// compuerta lo usa para holguras, e interferencias_brep.py lo salta en el doc
// principal (el doc auxiliar *_brep.json lo incluye sin la marca).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { box, COL } from '../../nbt90/lib.mjs';
import { rotarPieza, r2, bboxU } from './util_adapt.mjs';
import { STEP, T, PERCHA } from './params_adapt.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Interfaz ProSort del NBT90 que NO viaja al sorter (la sustituye la percha):
//   · los 2 canales laterales del ANFITRIÓN Hytrol y los 6 juegos de tornillería
//     side↔anfitrión («· Side channel ±Y X60/231.5/403»);
//   · los 4 jack bolts con sus ménsulas y tornillería (reglaje contra un canal
//     que ya no existe; el reglaje pasa a las colisas del side + tuercas T);
//   · el grupo del rodillo de retorno B-20760 (12 piezas): SORTER_CO.md §7.1
//     lo midió y concluyó que aquí no limita ningún ramal (el retorno del
//     sorter pasa a −358.95, no a −61.4 del plano);
//   · las 10 piezas CONTEXTO del ProSort (bandas angostas de 1" + regletas):
//     las sustituyen las bandas T5 reales del sorter (mod_calles).
// ---------------------------------------------------------------------------
export const EXCLUIR_NBT90 = [
  /Canal lateral anfitrión/,
  /Side channel [+-]Y X(60|231\.5|403)/,   // pernos, golillas y tuercas de la unión
  /jack/i,
  /rodillo de retorno/i,
];

/** Carga, filtra y transforma el NBT90. Devuelve métricas para la compuerta. */
export function nbt90(E) {
  const doc = JSON.parse(readFileSync(join(aqui, '..', '..', 'nbt90', 'narrow_belt_transfer_90.json'), 'utf8'));
  let dentro = 0, fuera = 0, movil = 0;
  const excluidas = [];
  // Las 10 piezas CONTEXTO del anfitrión no se montan (las sustituyen las 5
  // calles del sorter), pero ANTES de descartarlas se LEE su geometría: son la
  // declaración del propio NBT90 de POR DÓNDE PASAN LAS BANDAS que lo atraviesan
  // —los dos ramales y la regleta— y en qué X. Es la prueba, en el documento
  // emitido de la transferencia, de que el paso recto existe y está acotado.
  const anfitrion = { portante: null, retorno: null, regleta: null, bandasX: [] };
  const acota = (dest, b) => {
    if (!dest) return { x: [r2(b.lo[0]), r2(b.hi[0])], z: [r2(b.lo[2]), r2(b.hi[2])] };
    return { x: [r2(Math.min(dest.x[0], b.lo[0])), r2(Math.max(dest.x[1], b.hi[0]))],
      z: [r2(Math.min(dest.z[0], b.lo[2])), r2(Math.max(dest.z[1], b.hi[2]))] };
  };
  for (const p of doc.parts) {
    if (p.contexto || EXCLUIR_NBT90.some(rx => rx.test(p.name))) {
      fuera++;
      excluidas.push(p.name);
      if (/CONTEXTO · Banda angosta|CONTEXTO · Regleta de desgaste/.test(p.name)) {
        const q = rotarPieza(p, [T.x, T.y, T.z]);
        for (const f of q.features) {
          const b = bboxU({ pos: q.pos, features: [f] });
          if (/Ramal portante/.test(f.name)) {
            anfitrion.portante = acota(anfitrion.portante, b);
            anfitrion.bandasX.push(r2((b.lo[0] + b.hi[0]) / 2));
          } else if (/Ramal de retorno/.test(f.name)) {
            anfitrion.retorno = acota(anfitrion.retorno, b);
          } else if (/Regleta/.test(f.name)) {
            anfitrion.regleta = acota(anfitrion.regleta, b);
          }
        }
      }
      continue;
    }
    const q = rotarPieza(p, [T.x, T.y, T.z]);
    if (/^MÓVIL/.test(p.name)) movil++;
    q.name = `NBT90 · ${p.name}`;
    q.id = `nbt90_${p.id}`;        // sin colisiones con los ids de las piezas nuevas
    q.contexto = true;
    q.fixed = false;
    E.parts.push(q);
    dentro++;
  }
  anfitrion.bandasX = [...new Set(anfitrion.bandasX)].sort((a, b) => a - b);
  anfitrion.separacionRamalesMm = anfitrion.portante && anfitrion.retorno
    ? r2(anfitrion.portante.z[0] - anfitrion.retorno.z[0]) : null;
  anfitrion.holguraRodilloRegleta = doc.meta?.verificaciones?.holguraRodilloRegleta ?? null;
  anfitrion.fuente = 'ensambles/nbt90/narrow_belt_transfer_90.json (piezas CONTEXTO del '
    + 'anfitrión, transformadas Rz(−90°)+T; no se montan)';
  return {
    piezas: dentro, movilNbt90: movil, excluidas: fuera,
    listaExcluidas: excluidas,
    anfitrion,
    transformada: { rotacionZdeg: -90, t: [T.x, T.y, T.z] },
  };
}

// ---------------------------------------------------------------------------
// Cliente fijo — cajas exactas de analisis/medidas.json (step). Cada entrada:
// [nombre, xlo, xhi, ylo, yhi, zlo, zhi]. Son ENVOLVENTES: sirven para holguras
// y para ver el conjunto, no reproducen el detalle interior.
// ---------------------------------------------------------------------------
const CAJAS_CLIENTE = [
  ['Bastidor FRAME_MIR_MIR (chapón 28)', -109.423, -81.423, -1662.023, -79.741, -114.0, 46.0],
  // El chapón de descarga lleva la MUESCA declarada en su canto inferior (el
  // side +X del NBT90 entra 8.61 en su plano tras el corrimiento del reparto):
  ['Bastidor FRAME_MIR_MIR_MIR (chapón 28, CON MUESCA)', 499.418, 527.418, -1662.023, -79.741, -114.0, 46.0],
  ['LAT TOP (bancada inferior, intacta)', -109.422, 527.418, -513.116, 90.183, -433.103, -113.049],
  ['FRONT TOP2 (cabecera motriz)', -115.423, 531.418, -70.881, 90.183, -154.641, 50.708],
  ['FRONT TOP2_MIR (cabecera conducida)', -109.423, 537.418, -1666.023, -1560.21, -148.641, 56.708],
  ['TER1/CAN0 (canal costado +X)', 491.418, 531.418, -173.537, 84.183, -120.0, 84.138],
  ['TER1_MIR/CAN0_MIR (canal costado −X)', -115.423, -75.423, -173.537, 84.183, -120.0, 84.138],
  ['Motorreductor principal 314759014', -262.423, -82.423, -202.5, 86.0, -394.0, 86.0],
  ['Ensamble motor UniDrive (extremo conducido)', 63.098, 352.898, -1551.261, -1432.211, -273.023, -155.172],
];

export function clienteFijo(E) {
  for (const [nom, x0, x1, yA, yB, z0, z1] of CAJAS_CLIENTE) {
    const f = [box(`Caja medida ${r2(x1 - x0)}×${r2(yB - yA)}×${r2(z1 - z0)}`,
      [r2((x0 + x1) / 2), r2((yA + yB) / 2), r2(z0)], x1 - x0, yB - yA, z1 - z0)];
    let nota = 'envolvente exacta de analisis/medidas.json; la pieza del cliente no se mueve';
    if (/CON MUESCA/.test(nom)) {
      const m = PERCHA.muesca;
      f.push({ id: 'muesca_chapon', name: `Muesca ${r2(m.y[1] - m.y[0])}×${r2(m.zTop - z0)} (canto inferior)`,
        shape: 'box', op: 'cut', at: [r2((x0 + x1) / 2), r2((m.y[0] + m.y[1]) / 2), r2(z0 - 2)],
        dir: [0, 0, 1], params: { w: r2(x1 - x0 + 4), d: r2(m.y[1] - m.y[0]), h: r2(m.zTop - z0 + 2) } });
      nota = `MODIFICACIÓN AL CLIENTE (declarada): muesca de ${r2(m.y[1] - m.y[0])}×${r2(m.zTop - z0)} en el canto inferior `
        + `para el paso del side channel +X del NBT90 (entra 8.61 en el plano del chapón); quedan ${r2(46 - m.zTop)} de canto. `
        + 'Revisión estructural del bastidor: pendiente de validación del cliente.';
    }
    E.addPart(`CTX · ${nom}`, COL.chapaOsc,
      [r2((x0 + x1) / 2), r2((yA + yB) / 2), r2(z0)], f,
      { contexto: true, capaInfo: 'step', nota });
  }
  return { piezas: CAJAS_CLIENTE.length };
}

export { STEP };
