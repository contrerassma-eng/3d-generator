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

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const D = {
  flowLen: 3000, beltPlane: 170,
  beltW: 32, beltT: 5,                       // banda sincrónica AT10, ancho 32
  lanes: [-208.5, -69.5, 69.5, 208.5],       // 4 calles
  pulleyPD: 102, pulleyW: 42, pulleyZ: 114,  // AT10 32T: Ø primitivo 101.9; top banda 170
  shaftDia: 30,                              // ejes independientes por calle
  frameHalfY: 300, profH: 120,               // perfil item del bastidor a ±300
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
const C = { perfil: '#9aa6b0', banda: '#141414', polea: '#8b98a6', drive: '#546e7a', pata: '#3b4750', guarda: '#aab6c0', acero: '#9aa7b2', neum: '#cfd8dc', acople: '#b0bec5' };

const L = D.flowLen, xH = L / 2, zTop = D.beltPlane, zC = zTop - D.profH / 2 - 8;
const pz = D.pulleyZ, retZ = pz - D.pulleyPD / 2 - 6;   // Z del ramal de retorno
const xPul = xH - 90;                                    // poleas a ±xPul (cabeza/cola)

// --- BASTIDOR: 2 perfiles item (con ranura en T) a lo largo de X --------------
for (const sy of [-1, 1]) {
  const y = sy * D.frameHalfY;
  addPart(`BASE · Perfil item 40×120 del bastidor ${sy > 0 ? '+Y' : '-Y'}`, C.perfil, [0, y, zC], [
    box(`Perfil ${L}×40×${D.profH}`, [0, y, zC], L, 40, D.profH),
    box('Ranura en T (interior)', [0, y - sy * 20, zC], L, 12, 60, 'cut'),
  ]);
}

// --- POR CALLE: guía-slot + banda AT10 + poleas dentadas + tensor neumático ----
for (const [li, y] of D.lanes.entries()) {
  // GUÍA-PERFIL item 80×40 con SLOT (deslizante individual del ramal superior)
  addPart(`BASE · Guía item 80×40 con slot (deslizante) lane Y=${y}`, C.perfil, [0, y, zTop - D.beltT - 20], [
    box('Perfil guía item 80×40', [0, y, zTop - D.beltT - 20], L - 240, 80, 40),
    box('Slot de deslizamiento (ancho de banda)', [0, y, zTop - D.beltT - 2], L - 240, D.beltW + 2, 8, 'cut'),
  ]);
  // BANDA SINCRÓNICA AT10 (ramal superior + retorno)
  addPart(`BASE · Banda sincrónica AT10 (item24) lane Y=${y} (ramal superior)`, C.banda, [0, y, zTop - D.beltT], [
    box('Ramal superior AT10', [0, y, zTop - D.beltT], 2 * xPul, D.beltW, D.beltT),
  ]);
  addPart(`BASE · Banda sincrónica AT10 lane Y=${y} (retorno)`, C.banda, [0, y, retZ], [
    box('Ramal de retorno AT10', [0, y, retZ], 2 * xPul, D.beltW, D.beltT),
  ]);
  // POLEAS DENTADAS AT10 32T en cabeza (+X, motriz) y cola (-X), cada una en su
  // EJE INDEPENDIENTE Ø30; pestañas de guía
  for (const [sx, nombre] of [[1, 'cabeza'], [-1, 'cola']]) {
    const x = sx * xPul;
    addPart(`BASE · Polea dentada AT10 32T ${nombre} lane Y=${y}`, C.polea, [x, y, pz], [
      cyl(`Cuerpo dentado Ø${D.pulleyPD}×${D.pulleyW}`, [x, y - D.pulleyW / 2, pz], [0, 1, 0], D.pulleyPD, D.pulleyW),
      cyl('Pestaña Ø112 (a)', [x, y - D.pulleyW / 2 - 3, pz], [0, 1, 0], D.pulleyPD + 10, 3),
      cyl('Pestaña Ø112 (b)', [x, y + D.pulleyW / 2, pz], [0, 1, 0], D.pulleyPD + 10, 3),
    ]);
    // eje independiente corto de la polea (bloqueo LK sin chaveta)
    addPart(`BASE · Eje independiente Ø30 + LK ${nombre} lane Y=${y}`, C.acero, [x, y - 40, pz], [
      cyl('Eje Ø30 × 120', [x, y - 40, pz], [0, 1, 0], D.shaftDia, 120),
      cyl('Casquillo LK (bloqueo sin chaveta)', [x, y + 24, pz], [0, 1, 0], 45, 26),
    ]);
  }
  // TENSOR NEUMÁTICO INDEPENDIENTE (abajo): cilindro ISO 6432 Ø20 empuja una
  // polea tensora AT10 contra el ramal de retorno → tensa esta banda sola.
  addPart(`BASE · Polea tensora AT10 (neumática) lane Y=${y}`, C.polea, [0, y, retZ - 34], [
    cyl('Polea tensora Ø60×40', [0, y - 20, retZ - 34], [0, 1, 0], 60, 40),
  ]);
  addPart(`BASE · Cilindro tensor neumático ISO 6432 Ø20 lane Y=${y}`, C.neum, [0, y, retZ - 64], [
    cyl('Cuerpo Ø25×70', [0, y, retZ - 120], [0, 0, 1], 25, 60),
    cyl('Vástago Ø10 (empuja la tensora hacia arriba)', [0, y, retZ - 60], [0, 0, 1], 10, 26),
    cyl('Racor + regulador', [0, y + 16, retZ - 120], [0, 1, 0], 10, 10),
  ]);
}

// --- COUPLE-LINKS: unen los EJES INDEPENDIENTES de calles adyacentes (cabeza)
//     para que un solo motor arrastre toda la línea sincrónica --------------
for (let i = 0; i < D.lanes.length - 1; i++) {
  const ya = D.lanes[i], yb = D.lanes[i + 1];
  addPart(`BASE · Couple-link (acople de eje) calles ${ya}↔${yb}`, C.acople, [xPul, (ya + yb) / 2, pz], [
    cyl('Manguito de acople Ø40', [xPul, ya + 30, pz], [0, 1, 0], 40, yb - ya - 60),
    cyl('Brida LK a', [xPul, ya + 30, pz], [0, 1, 0], 52, 10),
    cyl('Brida LK b', [xPul, yb - 40, pz], [0, 1, 0], 52, 10),
  ]);
}
// MOTORREDUCTOR de eje hueco sobre el eje de la calle extrema (cabeza)
addPart('BASE · Motorreductor de eje hueco (~0.37 kW)', C.drive, [xPul, D.frameHalfY + 30, pz], [
  box('Cuerpo reductor 130×110×120', [xPul, D.frameHalfY + 95, pz - 10], 130, 110, 120),
  cyl('Cubo de eje hueco Ø45', [xPul, D.frameHalfY + 30, pz], [0, 1, 0], 45, 40),
]);

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
    origen: 'gen_base.mjs (paramétrico). Sistema item24 de banda sincrónica: 4 bandas AT10 (ancho 32) en las calles, accionadas por POLEAS DENTADAS AT10 32T (Ø prim. 101.9) — sin tambor de fricción ni cama deslizante; cada banda en su GUÍA-PERFIL con SLOT (deslizante individual); EJES INDEPENDIENTES por calle unidos por COUPLE-LINKS (acoples de bloqueo) y arrastrados por 1 motorreductor de eje hueco en la cabeza; TENSORES INDEPENDIENTES NEUMÁTICOS por debajo (1 cilindro ISO 6432 por banda que empuja una polea tensora). Bastidor de perfil item + 6 patas niveladoras. Marco del módulo (flujo X, plano de banda Z=170).',
    interfaz: {
      plano_banda_mm: D.beltPlane, calles_banda: D.lanes, largo_mm: D.flowLen,
      transmision: 'banda sincrónica AT10 32T, item24; ejes independientes + couple-links; 1 motorreductor de eje hueco',
      tensado: 'tensores independientes neumáticos por debajo (1 cilindro ISO 6432 por banda)',
      hueco_transferencia: `X=±${D.openHalf}, enmarcado por 2 travesaños pesados`,
    },
  },
  parts, constraints: [],
};
const out = join(dirname(fileURLToPath(import.meta.url)), 'base_sorter.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas del equipo base (banda sincrónica item24) → ${out}`);
