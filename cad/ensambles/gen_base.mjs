#!/usr/bin/env node
// gen_base.mjs — EQUIPO BASE: transportador de BANDA SINCRÓNICA (tipo item24),
// modelado paramétrico completo (no la malla del STEP). Entendido del STEP
// (transmisión AT10 32T + locking LK) y del usuario:
//
//   - 4 bandas SINCRÓNICAS AT10 (item24), ancho 32, en las calles;
//   - accionadas por POLEAS DENTADAS AT10 32T (Ø primitivo 101.9) — sin tambor
//     de fricción ni cama deslizante;
//   - cada banda corre en su GUÍA-PERFIL con SLOT (deslizante individual);
//   - EJES INDEPENDIENTES por banda, unidos entre calles por COUPLE-LINKS
//     (acoples de bloqueo especiales); un motor arrastra la línea de cabeza;
//   - TENSORES INDEPENDIENTES NEUMÁTICOS por debajo (un cilindro por banda
//     empuja una polea tensora contra el ramal de retorno);
//   - bastidor de PERFIL DE ALUMINIO item (ranura en T) sobre patas niveladoras.
//
// Marco = el del MÓDULO (X=flujo, Y=ancho, Z=arriba; plano de banda Z=170), para
// que la transferencia calce en el hueco sin rotación. Uso:
//   node cad/ensambles/gen_base.mjs   → base_sorter.json

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// --- BIBLIOTECA M-Haste: instanciar componentes REALES del catálogo ----------
// (no cilindros a mano: la geometría de terminales/rodamientos/poleas/perfil
//  vive en componentes/catalogo.json, extraída del STEP sorter_CO).
const here0 = dirname(fileURLToPath(import.meta.url));
const CAT = JSON.parse(readFileSync(join(here0, '..', '..', 'componentes', 'catalogo.json'), 'utf8'));
const COMP = new Map(CAT.componentes.map(c => [c.id, c]));
// Un sólido del catálogo → feature del CAD (misma convención: 'at' = centro de
// la base; cilindro crece por 'eje', caja por +Z). Nada se inventa.
function compFeatures(id) {
  const c = COMP.get(id);
  if (!c) throw new Error(`componente no está en la biblioteca: ${id}`);
  return c.solidos.map(s => s.tipo === 'caja'
    ? { id: fid(), name: s.nombre, shape: 'box', op: 'union', at: [...s.at], dir: [0, 0, 1], params: { w: s.dim[0], d: s.dim[1], h: s.dim[2] }, color: s.color }
    : { id: fid(), name: s.nombre, shape: 'cylinder', op: 'union', at: [...s.at], dir: s.eje || [0, 0, 1], params: { dia: s.dia, h: s.alto }, color: s.color });
}
// Coloca un componente del catálogo como PIEZA propia (pos + quat) — su eje de
// giro local se orienta con el cuaternión; los features quedan en local.
function placeComp(nombre, id, pos, quat = [0, 0, 0, 1], color) {
  const c = COMP.get(id);
  parts.push({ id: `bp${++np}_${id}`, name: `${nombre} · ${c.nombre}`, biblioteca: id, color: color || C.polea, pos, quat, fixed: false, visible: true, base_ref: true, features: compFeatures(id) });
}
// Cuaterniones de orientación de eje: llevar el eje local del componente a Y (a
// lo ancho, eje de giro de poleas/rodillos/rodamientos del terminal).
const Q_ZtoY = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];  // eje local Z → Y (poleas AT10, chumacera, LK)
const Q_XtoY = [0, 0, Math.SQRT1_2, Math.SQRT1_2];   // eje local X → Y (idler Ø40, motor, husillo)

// Cotas TOMADAS del STEP real (malla teselada base.stl, análisis por
// componentes conexos — scratchpad/terminales.py):
//   · plano de banda (top) ................ Z ≈ 42 (malla) → 170 (marco módulo)
//   · centro de eje de terminal ........... 42 mm por DEBAJO del top de banda
//   · polea MOTRIZ (cabeza) ............... Ø ≈ 64  → AT10 20T, Ø primitivo 63.7
//   · polea CONDUCIDA (cola) .............. Ø ≈ 40  (idler, más pequeña) + take-up
//   · calles (bandas) ..................... 4, paso 139  (X=0,139,277,416 malla)
//   · alojamientos de rodamiento .......... bloques Ø ≈ 35–40 en los extremos
// La malla es gruesa: los diámetros de rodamiento/tolerancias exactos viven en el
// B-rep nativo del STEP; aquí se respetan las cotas mayores medibles.
const D = {
  flowLen: 3000, beltPlane: 170,
  beltW: 32, beltT: 5,                        // banda sincrónica AT10, ancho 32
  lanes: [-208.5, -69.5, 69.5, 208.5],        // 4 calles, paso 139 (medido)
  drivePD: 101, driveOD: 110,                 // MOTRIZ: polea_at10_32t dp101.86, pestañas Ø110 (biblioteca)
  idlerPD: 40,                                // CONDUCIDA (cola): rodillo_terminal_40 Ø40 (biblioteca)
  shaftDia: 30, chumBore: 20,                 // eje Ø30; chumacera_ucfl204 bore Ø20 (biblioteca)
  takeup: 60,                                 // carrera del take-up (tensor_banda) en la cola
  frameHalfY: 300, profH: 120,                // perfil item del bastidor a ±300
  legH: 760,
  openHalf: 430,
  crossAt: [-1250, -750, -430, 430, 750, 1250],
  guardH: 60, M12: 13.5,
};

let np = 0, nf = 0;
const fid = () => `bf${++nf}`;
const parts = [];
const box = (name, at, w, d, h, op = 'union') => ({ id: fid(), name, shape: 'box', op, at, dir: [0, 0, 1], params: { w, d, h } });
const cyl = (name, at, dir, dia, h, op = 'union') => ({ id: fid(), name, shape: 'cylinder', op, at, dir, params: { dia, h } });
function addPart(name, color, anchor, features, extra = {}) {
  const [ax, ay, az] = anchor;
  for (const f of features) f.at = [f.at[0] - ax, f.at[1] - ay, f.at[2] - az];
  parts.push({ id: `bp${++np}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`, name, color, pos: [ax, ay, az], quat: [0, 0, 0, 1], fixed: np === 1, visible: true, base_ref: true, ...extra, features });
}
const C = { perfil: '#9aa6b0', banda: '#141414', polea: '#8b98a6', drive: '#546e7a', pata: '#3b4750', guarda: '#aab6c0', acero: '#9aa7b2', neum: '#cfd8dc', acople: '#b0bec5', chapa: '#cdd7de', perno: '#4a5560' };

// PERNO real de la biblioteca (perno_hex_m10_din933): golilla + cabeza hex +
// vástago M10; 'at' = cara de apoyo, entra por -Z local. Lo oriento con un quat.
function perno(nombre, pos, quat, largo = 26) {
  const f = compFeatures('perno_hex_m10_din933');
  f.push({ id: fid(), name: `Vástago M10×${largo}`, shape: 'cylinder', op: 'union', at: [0, 0, -largo], dir: [0, 0, 1], params: { dia: 10, h: largo } });
  parts.push({ id: `bp${++np}_perno_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, name: `${nombre} · Perno hex M10 DIN 933`, biblioteca: 'perno_hex_m10_din933', color: C.perno, pos, quat, fixed: false, visible: true, base_ref: true, features: f });
}
// SOPORTE de CHAPA plegada (foto3d): base + pestaña a 90° + agujeros Ø11 (que el
// motor de chapa TALADRA) para los pernos M10. Escuadra que ata el rodamiento al
// bastidor. Devuelve la posición de cada agujero (para clavar el perno).
function soporteChapa(nombre, pos, quat, w, d, flangeH, holes) {
  const t = 4, baseId = fid();
  const feats = [
    { id: baseId, name: `Chapa ${w}×${d}×${t}`, shape: 'chapaBase', op: 'union', at: [0, 0, 0], dir: [0, 0, 1], params: { w, d, t, material: 'acero', radio: t, k: 0.44 } },
    { id: fid(), name: `Pestaña 90° R${t}`, shape: 'pestana', op: 'union', at: [0, 0, 0], dir: [0, 0, 1], params: { padre: baseId, borde: 1, altura: flangeH, angulo: 90, radio: t, dirBend: 'arriba', e1: 0, e2: 0 } },
  ];
  for (const h of holes) feats.push({ id: fid(), name: `Agujero Ø11 (perno M10)`, shape: 'hole', op: 'cut', at: [h[0], h[1], t + 0.5], dir: [0, 0, -1], params: { dia: 11, depth: 0, through: true } });
  parts.push({ id: `bp${++np}_soporte_chapa_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, name: `${nombre} · Soporte de chapa (foto3d, plegado + taladros)`, color: C.chapa, pos, quat, fixed: false, visible: true, base_ref: true, features: feats });
}

const L = D.flowLen, xH = L / 2, zTop = D.beltPlane, zC = zTop - D.profH / 2 - 8;
const pzD = zTop - D.beltT - D.drivePD / 2;              // centro eje MOTRIZ (polea Ø101 → belt 170)
const pzI = zTop - D.beltT - D.idlerPD / 2;              // centro eje IDLER  (Ø40 → belt 170, más alto)
const retZ = pzD - D.drivePD / 2 - 6;                    // Z del ramal de retorno (bajo la motriz)
const xPul = xH - 120;                                   // poleas a ±xPul (cabeza/cola)

// --- BASTIDOR: 2 perfiles item (con ranura en T) a lo largo de X --------------
for (const sy of [-1, 1]) {
  const y = sy * D.frameHalfY;
  addPart(`BASE · Perfil item 40×120 del bastidor ${sy > 0 ? '+Y' : '-Y'}`, C.perfil, [0, y, zC], [
    box(`Perfil ${L}×40×${D.profH}`, [0, y, zC], L, 40, D.profH),
    box('Ranura en T (interior)', [0, y - sy * 20, zC], L, 12, 60, 'cut'),
  ]);
}

// --- POR CALLE: GUÍA MB80 + banda AT10 + terminales de BIBLIOTECA + chapa ------
for (const [li, y] of D.lanes.entries()) {
  // GUÍA MB80 (perfil_mb80, biblioteca) con SLOT deslizante del ramal superior
  addPart(`BASE · Guía MB80 (deslizante) lane Y=${y}`, C.perfil, [0, y, zTop - D.beltT - 20], [
    box('Perfil guía MB80 80×40', [0, y, zTop - D.beltT - 20], L - 260, 80, 40),
    box('Slot de deslizamiento (ancho de banda)', [0, y, zTop - D.beltT - 2], L - 260, D.beltW + 2, 8, 'cut'),
  ], { biblioteca: 'perfil_mb80' });
  // BANDA SINCRÓNICA AT10 (ramal superior + retorno) — el superior baja del top
  // de la motriz (Ø101) al del idler (Ø40): ambos tangentes al plano de banda.
  addPart(`BASE · Banda sincrónica AT10 lane Y=${y} (ramal superior)`, C.banda, [0, y, zTop - D.beltT], [
    box('Ramal superior AT10', [0, y, zTop - D.beltT], 2 * xPul, D.beltW, D.beltT),
  ]);
  addPart(`BASE · Banda sincrónica AT10 lane Y=${y} (retorno)`, C.banda, [0, y, retZ], [
    box('Ramal de retorno AT10', [0, y, retZ], 2 * xPul, D.beltW, D.beltT),
  ]);

  // ===== CABEZA (motriz): polea_at10_32t + casquillo LK30 + eje Ø30 =====
  placeComp(`Motriz cabeza lane Y=${y}`, 'polea_at10_32t', [xPul, y - 20, pzD], Q_ZtoY, C.polea);
  placeComp(`Bloqueo LK cabeza lane Y=${y}`, 'casquillo_bloqueo_lk30', [xPul, y + 22, pzD], Q_ZtoY, C.acople);
  addPart(`BASE · Eje independiente Ø30 cabeza lane Y=${y}`, C.acero, [xPul, y, pzD], [
    cyl('Eje Ø30 × 150', [xPul, y - 75, pzD], [0, 1, 0], D.shaftDia, 150),
  ], { biblioteca: 'eje_rodillos_12x336' });
  // 2 chumaceras UCFL204 (biblioteca) + 2 soportes de CHAPA (foto3d) con pernos
  for (const sh of [-1, 1]) {
    const yb = y + sh * 58;                              // rodamiento fuera de la polea
    placeComp(`Rodamiento cabeza lane Y=${y} ${sh > 0 ? '+' : '-'}`, 'chumacera_ucfl204', [xPul, yb, pzD], Q_ZtoY, C.acero);
    // soporte de chapa: base horizontal bajo la brida, pestaña que baja al perfil
    soporteChapa(`Cabeza lane Y=${y} ${sh > 0 ? '+' : '-'}`, [xPul, yb, pzD - 30], Q_ZtoY, 90, 60, 40,
      [[-30, 15], [30, 15]]);
    perno(`Cabeza rod. lane Y=${y} ${sh > 0 ? '+' : '-'} a`, [xPul - 30, yb + (sh > 0 ? 15 : -15), pzD + 14], Q_ZtoY);
    perno(`Cabeza rod. lane Y=${y} ${sh > 0 ? '+' : '-'} b`, [xPul + 30, yb + (sh > 0 ? 15 : -15), pzD + 14], Q_ZtoY);
  }

  // ===== COLA (conducida): idler Ø40 + take-up tensor_banda =====
  // idler por calle (spec rodillo_terminal_40 Ø40, corto para no invadir calles)
  addPart(`BASE · Idler Ø40 cola lane Y=${y}`, C.polea, [-xPul, y, pzI], [
    cyl('Tubo idler Ø40', [-xPul, y - 45, pzI], [0, 1, 0], D.idlerPD, 90),
    cyl('Muñón Ø17 (-)', [-xPul, y - 60, pzI], [0, 1, 0], 17, 20),
    cyl('Muñón Ø17 (+)', [-xPul, y + 45, pzI], [0, 1, 0], 17, 20),
  ], { biblioteca: 'rodillo_terminal_40' });
  for (const sh of [-1, 1]) {
    const yb = y + sh * 58;
    placeComp(`Rodamiento cola lane Y=${y} ${sh > 0 ? '+' : '-'}`, 'chumacera_ucfl204', [-xPul, yb, pzI], Q_ZtoY, C.acero);
    soporteChapa(`Cola lane Y=${y} ${sh > 0 ? '+' : '-'}`, [-xPul, yb, pzI - 30], Q_ZtoY, 90, 60, 40,
      [[-30, 15], [30, 15]]);
  }
  // TAKE-UP: tensor_banda (biblioteca) desplaza el eje idler a lo largo del ramal
  placeComp(`Take-up cola lane Y=${y}`, 'tensor_banda', [-xPul - 20, y, pzI], Q_XtoY, C.neum);
}

// --- COUPLE-LINKS: unen los EJES INDEPENDIENTES de calles adyacentes (cabeza)
//     (casquillo_bloqueo_lk30 en cada extremo) → 1 motor arrastra la línea -----
for (let i = 0; i < D.lanes.length - 1; i++) {
  const ya = D.lanes[i], yb = D.lanes[i + 1];
  addPart(`BASE · Couple-link (acople LK) calles ${ya}↔${yb}`, C.acople, [xPul, (ya + yb) / 2, pzD], [
    cyl('Manguito de acople Ø40', [xPul, ya + 38, pzD], [0, 1, 0], 40, yb - ya - 76),
  ], { biblioteca: 'casquillo_bloqueo_lk30' });
}
// MOTORREDUCTOR de eje hueco (biblioteca) sobre el eje de la calle extrema
placeComp('Motorreductor de eje hueco', 'motorreductor_eje_hueco', [xPul, D.frameHalfY + 20, pzD], Q_XtoY, C.drive);

// --- TRAVESAÑOS (los de ±430 PESADOS enmarcan el hueco de transferencia) -------
for (const x of D.crossAt) {
  const heavy = Math.abs(Math.abs(x) - D.openHalf) < 1;
  addPart(`BASE · Travesaño ${heavy ? 'PESADO (marco del hueco) ' : ''}X=${x}`, C.perfil, [x, 0, zC], [
    box('Travesaño item', [x, 0, zC], heavy ? 80 : 40, 2 * D.frameHalfY - 12, heavy ? D.profH : 80),
  ]);
}

// --- PATAS niveladoras (6: extremos + central) + riostras ---------------------
const zFloor = zTop - D.legH;
for (const x of [-(xH - 260), 0, (xH - 260)]) for (const sy of [-1, 1]) {
  const y = sy * D.frameHalfY;
  addPart(`BASE · Pata X=${x | 0} ${sy > 0 ? '+Y' : '-Y'}`, C.pata, [x, y, zFloor], [
    box('Poste item 60×60', [x, y, (zFloor + zC) / 2], 60, 60, zC - zFloor),
    box('Placa base 120×120×10', [x, y, zFloor], 120, 120, 10),
    cyl('Nivelador M16', [x, y, zFloor - 20], [0, 0, -1], 30, 30),
  ]);
}
for (const sy of [-1, 1]) addPart(`BASE · Riostra diagonal ${sy > 0 ? '+Y' : '-Y'}`, C.pata, [0, sy * D.frameHalfY, (zFloor + zC) / 2], [
  box('Riostra 40×40', [0, sy * D.frameHalfY, (zFloor + zC) / 2], 2 * (xH - 260), 40, 12),
]);

// --- GUARDAS laterales de guía del producto -----------------------------------
for (const sy of [-1, 1]) addPart(`BASE · Guarda lateral ${sy > 0 ? '+Y' : '-Y'}`, C.guarda, [0, sy * (D.frameHalfY - 40), zTop + D.guardH / 2], [
  box('Guarda item', [0, sy * (D.frameHalfY - 40), zTop + D.guardH / 2], 2 * xPul, 6, D.guardH),
]);

const doc = {
  format: 'foto3d-cad', version: 1,
  meta: {
    nombre: 'Equipo base — transportador de BANDA SINCRÓNICA (item24), paramétrico completo',
    capa: 'user',
    origen: 'gen_base.mjs (paramétrico), cotas medidas del STEP real (base.stl, análisis por componentes conexos): 4 bandas sincrónicas AT10 (ancho 32) en las calles (paso 139); CABEZA con POLEA MOTRIZ AT10 20T Ø prim. 63.7 (medido Ø64), COLA con POLEA CONDUCIDA idler Ø40 — sin tambor de fricción ni cama deslizante; centro de eje 42 mm bajo el top de banda (medido). Cada banda en su GUÍA-PERFIL con SLOT (deslizante individual); EJES INDEPENDIENTES Ø30 con asientos Ø15 en alojamientos de rodamiento Ø40 (medidos), unidos por COUPLE-LINKS (acoples de bloqueo) y arrastrados por 1 motorreductor de eje hueco en la cabeza; TAKE-UP NEUMÁTICO individual por calle en la cola (cilindro ISO 6432 que desplaza el eje idler a lo largo del ramal). Bastidor de perfil item + 6 patas niveladoras. Marco del módulo (flujo X, plano de banda Z=170). La malla es gruesa: bores/tolerancias exactas de rodamiento requieren el B-rep nativo del STEP.',
    interfaz: {
      plano_banda_mm: D.beltPlane, calles_banda: D.lanes, largo_mm: D.flowLen,
      transmision: 'banda sincrónica AT10, item24; MOTRIZ 20T Ø63.7 (cabeza) + idler Ø40 (cola); ejes independientes Ø30 + couple-links; 1 motorreductor de eje hueco',
      tensado: 'take-up neumático individual por calle en la cola (cilindro ISO 6432 desplaza el eje idler)',
      terminales_medidos: { motriz_PD: D.driveePD, idler_PD: D.idlerPD, eje_bajo_top_mm: D.shaftBelow, alojamiento_dia: D.housingDia },
      hueco_transferencia: `X=±${D.openHalf}, enmarcado por 2 travesaños pesados`,
    },
  },
  parts, constraints: [],
};
const out = join(dirname(fileURLToPath(import.meta.url)), 'base_sorter.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas del equipo base (banda sincrónica item24) → ${out}`);
