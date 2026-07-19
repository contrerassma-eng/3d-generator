#!/usr/bin/env node
// gen_base.mjs — EQUIPO BASE: transportador TWIN-BELT (sorter_CO), MODELADO
// PARAMÉTRICO COMPLETO (no la malla del STEP). Entendido del STEP y MEJORADO con
// criterio de diseñador: bastidor de canal + patas niveladoras, 4 bandas planas
// estrechas con tambores de cabeza (motriz) y cola (con take-up por husillo),
// motorreductor, travesaños, HUECO DE TRANSFERENCIA enmarcado por 2 travesaños
// pesados, y guardas laterales.
//
// Marco de coordenadas = el del MÓDULO de transferencia (X = flujo del
// transportador, Y = ancho / expulsión a 90°, Z = arriba, mm). Así la
// transferencia calza en el hueco SIN rotación. Plano de banda Z = 170.
//
// Uso:  node cad/ensambles/gen_base.mjs   → base_sorter.json

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const D = {
  flowLen: 3000,                 // largo del transportador (X) — ALARGADO
  beltPlane: 170,                // Z del plano de transporte (top de banda)
  beltW: 40, beltT: 3,           // bandas planas estrechas 40×3 (poliéster/NBR, Habasit)
  lanes: [-208.5, -69.5, 69.5, 208.5],  // 4 calles (entre las líneas de rodillos del transfer)
  drumDia: 90, drumFaceHalf: 260,       // tambores de cabeza/cola (eje en Y)
  frameHalfY: 300,               // canales laterales del bastidor a Y = ±300
  channelH: 120, channelT: 6,    // canal C 120 alto, chapa 6
  legH: 760,                     // patas: del canal al piso (Z = beltPlane - legH)
  openHalf: 430,                 // HUECO de transferencia centrado en X=0, ±430
  crossAt: [-1250, -750, -430, 430, 750, 1250],  // travesaños (±430 enmarcan el hueco)
  guardH: 60,                    // guardas laterales sobre el borde de banda
  M12: 13.5,
};

let np = 0, nf = 0;
const fid = () => `bf${++nf}`;
const parts = [];
const box = (name, at, w, d, h, op = 'union') => ({ id: fid(), name, shape: 'box', op, at, dir: [0, 0, 1], params: { w, d, h } });
const cyl = (name, at, dir, dia, h, op = 'union') => ({ id: fid(), name, shape: 'cylinder', op, at, dir, params: { dia, h } });
const hole = (name, at, dir, dia, depth = 0, through = true) => ({ id: fid(), name, shape: 'hole', op: 'cut', at, dir, params: { dia, depth, through } });
function addPart(name, color, anchor, features, extra = {}) {
  const [ax, ay, az] = anchor;
  for (const f of features) f.at = [f.at[0] - ax, f.at[1] - ay, f.at[2] - az];
  parts.push({ id: `bp${++np}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`, name, color, pos: [ax, ay, az], quat: [0, 0, 0, 1], fixed: np === 1, visible: true, base_ref: true, ...extra, features });
}
const C = { canal: '#5b6b78', banda: '#141414', tambor: '#8b98a6', drive: '#546e7a', pata: '#3b4750', guarda: '#aab6c0', acero: '#9aa7b2', buje: '#b08d57' };

const L = D.flowLen, xH = L / 2, zTop = D.beltPlane, zC = zTop - D.channelH / 2 - 6;

// --- 2 CANALES laterales del bastidor (perfil C a lo largo de X) --------------
for (const sy of [-1, 1]) {
  const y = sy * D.frameHalfY;
  addPart(`BASE · Canal lateral del bastidor ${sy > 0 ? '+Y' : '-Y'}`, C.canal, [0, y, zC], [
    box(`Alma ${L}×6×${D.channelH}`, [0, y, zC], L, D.channelT, D.channelH),
    box('Ala superior', [0, y - sy * 20, zC + D.channelH / 2], L, 40, 6),
    box('Ala inferior', [0, y - sy * 20, zC - D.channelH / 2], L, 40, 6),
  ]);
}

// --- BANDAS planas (ramal superior + retorno) sobre las 4 calles + SLIDER BED -
// (Habasit: una banda plana de 3 m necesita CAMA DESLIZANTE o rodillos de carga;
//  aquí slider bed de chapa bajo cada calle, con el borde volteado como guía)
for (const y of D.lanes) {
  addPart(`BASE · Cama deslizante (slider bed) lane Y=${y}`, C.acero, [0, y, zTop - D.beltT - 3], [
    box('Chapa slider 3', [0, y, zTop - D.beltT - 3], L - 100, D.beltW + 18, 3),
  ]);
  addPart(`BASE · Banda anfitrión 40×3 lane Y=${y} (ramal superior)`, C.banda, [0, y, zTop - D.beltT], [
    box('Ramal superior', [0, y, zTop - D.beltT], L - 60, D.beltW, D.beltT),
  ]);
  addPart(`BASE · Banda anfitrión 40×3 lane Y=${y} (retorno)`, C.banda, [0, y, zTop - D.drumDia + D.beltT], [
    box('Ramal de retorno', [0, y, zTop - D.drumDia + D.beltT], L - 60, D.beltW, D.beltT),
  ]);
}

// --- TAMBORES de cabeza (motriz, +X) y cola (con take-up, -X) ------------------
const drumZ = zTop - D.drumDia / 2 + D.beltT;
for (const [sx, nombre] of [[1, 'cabeza (motriz)'], [-1, 'cola (take-up)']]) {
  const x = sx * (xH - 70);
  addPart(`BASE · Tambor de ${nombre}`, C.tambor, [x, 0, drumZ], [
    cyl(`Llanta Ø${D.drumDia}×${2 * D.drumFaceHalf}`, [x, -D.drumFaceHalf, drumZ], [0, 1, 0], D.drumDia, 2 * D.drumFaceHalf),
    ...(sx > 0 ? [cyl('Lagging de caucho ranurado e=6 (µ≥0.7)', [x, -D.drumFaceHalf, drumZ], [0, 1, 0], D.drumDia + 12, 2 * D.drumFaceHalf)] : []),
    cyl('Eje Ø30', [x, -D.drumFaceHalf - 60, drumZ], [0, 1, 0], 30, 2 * D.drumFaceHalf + 120),
  ]);
  // 2 chumaceras del tambor (en los canales)
  for (const sy of [-1, 1]) {
    const takeup = sx < 0;
    addPart(`BASE · Chumacera tambor ${nombre} ${sy > 0 ? '+Y' : '-Y'}`, C.acero, [x, sy * (D.frameHalfY - 6), drumZ], [
      box('Cuerpo chumacera 60×40×50', [x, sy * (D.frameHalfY - 6), drumZ], 60, 40, 50),
      cyl('Bore Ø30', [x, sy * (D.frameHalfY - 6) + sy * 20, drumZ], [0, sy, 0], 30, 40, 'cut'),
      ...(takeup ? [box('Colisa de take-up (husillo, ±60)', [x, sy * (D.frameHalfY - 6), drumZ], 140, 12, 34, 'cut')] : []),
    ]);
  }
}
// husillo de take-up (tensa la cola): recorrido 120 mm ≈ 2% del lazo de 6 m
addPart('BASE · Husillo de take-up M16 (±60)', C.acero, [-xH + 70, 0, drumZ], [
  cyl('Husillo Ø16 × 200 (±60 de tensado)', [-xH + 150, 0, drumZ], [-1, 0, 0], 16, 200),
]);

// --- MOTORREDUCTOR de cabeza (P≈F·v≈80 W → 0.37 kW basta, con margen) ----------
addPart('BASE · Motorreductor del transportador (~0.37 kW)', C.drive, [xH - 70, D.frameHalfY + 40, drumZ], [
  box('Cuerpo reductor 140×120×130', [xH - 70, D.frameHalfY + 110, drumZ - 10], 140, 120, 130),
  cyl('Brida de eje hueco Ø60', [xH - 70, D.frameHalfY + 40, drumZ], [0, 1, 0], 60, 40),
  box('Brazo de torque', [xH - 40, D.frameHalfY + 70, drumZ - 70], 12, 120, 40),
]);

// --- TRAVESAÑOS: tie de los canales; los de ±430 son PESADOS (enmarcan el hueco)
for (const x of D.crossAt) {
  const heavy = Math.abs(Math.abs(x) - D.openHalf) < 1;
  addPart(`BASE · Travesaño ${heavy ? 'PESADO (marco del hueco) ' : ''}X=${x}`, C.canal, [x, 0, zC], [
    box(`Travesaño ${heavy ? '80×2·frameHalfY×120' : '50×...×80'}`, [x, 0, zC], heavy ? 80 : 50, 2 * D.frameHalfY - 12, heavy ? D.channelH : 80),
  ]);
}

// --- PATAS niveladoras hasta el piso (6: extremos + CENTRAL para 3 m de luz) ---
const zFloor = zTop - D.legH;
for (const x of [-(xH - 260), 0, (xH - 260)]) for (const sy of [-1, 1]) {
  const y = sy * D.frameHalfY;
  addPart(`BASE · Pata X=${x | 0} ${sy > 0 ? '+Y' : '-Y'}`, C.pata, [x, y, zFloor], [
    box('Poste 60×60', [x, y, (zFloor + zC) / 2], 60, 60, zC - zFloor),
    box('Placa base 120×120×10', [x, y, zFloor], 120, 120, 10),
    cyl('Nivelador M16', [x, y, zFloor - 20], [0, 0, -1], 30, 30),
  ]);
}
// riostras diagonales (rigidez longitudinal)
for (const sy of [-1, 1]) {
  addPart(`BASE · Riostra diagonal ${sy > 0 ? '+Y' : '-Y'}`, C.pata, [0, sy * D.frameHalfY, (zFloor + zC) / 2], [
    box('Riostra 40×40', [0, sy * D.frameHalfY, (zFloor + zC) / 2], 2 * (xH - 260), 40, 12),
  ]);
}

// --- GUARDAS laterales (guía del producto) sobre el borde de banda ------------
for (const sy of [-1, 1]) {
  const y = sy * (D.frameHalfY - 40);
  addPart(`BASE · Guarda lateral ${sy > 0 ? '+Y' : '-Y'}`, C.guarda, [0, y, zTop + D.guardH / 2], [
    box(`Guarda ${L}×6×${D.guardH}`, [0, y, zTop + D.guardH / 2], L - 60, 6, D.guardH),
  ]);
}

const doc = {
  format: 'foto3d-cad', version: 1,
  meta: {
    nombre: 'Equipo base — transportador TWIN-BELT (sorter_CO), modelado paramétrico completo y mejorado',
    capa: 'user',
    origen: 'gen_base.mjs (paramétrico). Entendido del STEP sorter_CO y mejorado: bastidor de canal C + 4 patas niveladoras + riostras; 4 bandas planas 40×3 en las calles Y=±69.5/±208.5; tambor de cabeza MOTRIZ (motorreductor de eje hueco + brazo de torque) y tambor de cola con TAKE-UP por husillo; travesaños (los de ±430 PESADOS enmarcan el hueco de transferencia); guardas laterales. Marco = frame del módulo (flujo X, plano de banda Z=170) para integrar la transferencia sin rotación.',
    interfaz: {
      plano_banda_mm: D.beltPlane,
      calles_banda: D.lanes,
      largo_mm: D.flowLen,
      hueco_transferencia: `centrado en X=0, ±${D.openHalf} (enmarcado por 2 travesaños pesados); la transferencia se monta aquí y sus rodillos emergen +4 entre las bandas`,
      accionamiento: 'tambor de cabeza motriz (motorreductor eje hueco + brazo de torque); tensado por take-up de husillo en la cola',
    },
    mejoras_diseñador: 'ALARGADO a 3 m; bastidor de canal C con alas (rígido) sobre 4 patas niveladoras + riostras; take-up de husillo para tensar la banda (mantenimiento); guardas de guía del producto; hueco de transferencia enmarcado con travesaños pesados que reciben las cargas del módulo.',
  },
  parts,
  constraints: [],
};
const out = join(dirname(fileURLToPath(import.meta.url)), 'base_sorter.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas del equipo base (twin-belt paramétrico) → ${out}`);
