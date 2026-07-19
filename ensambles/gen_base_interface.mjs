#!/usr/bin/env node
// gen_base_interface.mjs — BASTIDOR DE INTEGRACIÓN EN LA BASE.
//
// El usuario autorizó MODIFICAR la base twin-belt (STEP sorter_CO) para alojar
// el transfer de rodillos. Esta es la estructura que se AÑADE a la base: un
// marco soldado que abre y refuerza el hueco de la transferencia, se ancla al
// bastidor de la máquina y recibe el módulo (canal FIJO) con sus fijaciones,
// dejando LIBRE el recorrido de pop-up (6 mm) del cassette móvil.
//
// Se modela en el MISMO sistema de coordenadas locales del módulo
// (X = largo de rodillo / flujo del anfitrión, Y = expulsión 90°, Z = arriba),
// para que el visor de integración lo posicione con la MISMA transformación que
// el módulo (rotar 90° + trasladar al hueco real). Capa `user`.
//
// Uso:  node cad/ensambles/gen_base_interface.mjs   → base_interface.json

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Cotas tomadas del módulo (transfer_rodillos_90.json) y de la base teselada:
const D = {
  combX: 415,          // semiancho del módulo en X (placas a ±415)
  plateHalfY: 345,     // semilargo del módulo en Y
  footX: 375, footY: 330,   // posición de los 4 pies del módulo (±footX, ±footY)
  // travesaños reales del base (Y=-654/-1525 con py=-1090 → module-X ±435):
  // los travesaños de anclaje del marco caen sobre ellos.
  crossX: 435,
  topZ: -14,           // cara superior del bastidor = donde apoyan los pies del módulo
  beamW: 60, beamH: 74,     // sección de largueros/travesaños (RHS 60×74)
  railGapZ: 8,         // holgura bajo el canal para la carrera de pop-up (6) + juego
  machineHalf: 480,    // semiancho de la máquina base (para las cartelas de anclaje)
  M10: 11, M12: 13.5,
};

let nf = 0, np = 0;
const fid = () => `f${++nf}`;
const parts = [];
const box = (name, at, w, d, h, op = 'union') =>
  ({ id: fid(), name, shape: 'box', op, at, dir: [0, 0, 1], params: { w, d, h } });
const hole = (name, at, dir, dia, depth = 0, through = true) =>
  ({ id: fid(), name, shape: 'hole', op: 'cut', at, dir, params: { dia, depth, through } });
function addPart(name, color, anchor, features, extra = {}) {
  const [ax, ay, az] = anchor;
  for (const f of features) f.at = [f.at[0] - ax, f.at[1] - ay, f.at[2] - az];
  parts.push({
    id: `p${++np}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    name, color, pos: [ax, ay, az], quat: [0, 0, 0, 1],
    fixed: parts.length === 0, visible: true, ...extra, features,
  });
}
const C = { viga: '#37474f', pad: '#546e7a', cartela: '#455a64', riel: '#8d9aa8', tuerca: '#b0bec5' };

const zTop = D.topZ, zC = zTop - D.beamH / 2;   // centro de las vigas (cuelgan bajo topZ)
const xEnd = D.crossX + 25;                      // largueros llegan a los travesaños reales del base

// --- 2 LARGUEROS longitudinales (a lo largo de X = flujo), bajo los pies -------
for (const sy of [-1, 1]) {
  const y = sy * D.footY;
  const f = [box(`Larguero RHS ${D.beamW}×${D.beamH} (Y=${y})`, [0, y, zC], 2 * xEnd, D.beamW, D.beamH)];
  // perforaciones de los pies del módulo (M12) + rebaje de riel de ajuste X
  for (const sx of [-1, 1]) {
    f.push(box('Ranura riel ajuste X (T-slot)', [sx * D.footX, y, zTop - 3], 120, 20, 8, 'cut'));
    for (const dx of [-30, 30]) f.push(hole('Ø13 anclaje pie módulo M12', [sx * D.footX + dx, y, zTop], [0, 0, -1], D.M12, 30, false));
  }
  addPart(`BASE-MOD · Larguero de integración ${sy > 0 ? '+Y' : '-Y'}`, C.viga, [0, y, zC], f);
}

// --- 3 TRAVESAÑOS (a lo largo de Y = expulsión) que traban los largueros;
//     los 2 extremos caen sobre los travesaños reales del base (Y=-654/-1525) --
for (const [i, x] of [-D.crossX, 0, D.crossX].entries()) {
  const f = [box(`Travesaño RHS ${D.beamW}×${D.beamH} (X=${x})`, [x, 0, zC], D.beamW, 2 * D.footY + D.beamW, D.beamH)];
  for (const sy of [-1, 1]) f.push(hole('Ø6 tapón de soldadura', [x, sy * D.footY, zC], [0, 0, 1], 6, 6, false));
  const et = i === 0 ? '-X (sobre travesaño base Y=-1525)' : i === 2 ? '+X (sobre travesaño base Y=-654)' : 'centro';
  addPart(`BASE-MOD · Travesaño de trabazón ${et}`, C.viga, [x, 0, zC], f);
}

// --- RIELES T-slot de montaje sobre cada pie (ajuste fino + tuercas en T) ------
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * D.footX, y = sy * D.footY;
  addPart(`BASE-MOD · Riel T-slot + tuercas M12 pie (${sx > 0 ? '+X' : '-X'},${sy > 0 ? '+Y' : '-Y'})`, C.riel, [x, y, zTop - 2], [
    box('Riel 120×46×10', [x, y, zTop - 5], 120, 46, 10),
    box('Ranura en T 14', [x, y, zTop - 2], 120, 14, 6, 'cut'),
    box('Tuerca en T M12 (a)', [x - 30, y, zTop - 6], 22, 20, 8),
    box('Tuerca en T M12 (b)', [x + 30, y, zTop - 6], 22, 20, 8),
  ]);
}

// --- 4 CARTELAS de anclaje del marco al bastidor de la máquina base ------------
// (en X, las cartelas llegan al larguero de la máquina; perforaciones M12)
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * xEnd, y = sy * D.footY;
  const reach = sx * (D.machineHalf - xEnd);
  addPart(`BASE-MOD · Cartela de anclaje al bastidor (${sx > 0 ? '+X' : '-X'},${sy > 0 ? '+Y' : '-Y'})`, C.cartela, [x, y, zC], [
    box('Placa cartela 8', [x + reach / 2, y, zC], Math.abs(reach) + 20, 90, 8),
    box('Nervio triangular', [x, y, zC], 40, 10, D.beamH),
    hole('Ø13 M12 a la máquina (a)', [x + reach - sx * 30, y - 28, zC], [0, 0, -1], D.M12, 8, false),
    hole('Ø13 M12 a la máquina (b)', [x + reach - sx * 30, y + 28, zC], [0, 0, -1], D.M12, 8, false),
  ]);
}

// --- TOPES/GUÍAS del pop-up: postes que enmarcan el hueco y dejan subir 6 mm ---
// (el cassette móvil sube 6 mm; estos topes fijan la altura elevada y guían)
for (const sx of [-1, 1]) {
  const x = sx * (D.combX + 12);
  addPart(`BASE-MOD · Tope de altura elevada ${sx > 0 ? '+X' : '-X'}`, C.pad, [x, 0, zTop], [
    box('Poste tope 24×40×24', [x, 0, zTop + 12], 24, 40, 24),
    hole('Ø11 reglaje M10 (tuerca+contratuerca)', [x, 0, zTop + 12], [0, 0, 1], D.M10, 24, false),
  ]);
}

const doc = {
  format: 'foto3d-cad', version: 1,
  meta: {
    nombre: 'Bastidor de integración en la base — hueco de transferencia (modificación autorizada del sorter_CO)',
    capa: 'user',
    origen: 'gen_base_interface.mjs (paramétrico). Estructura AÑADIDA a la base twin-belt para alojar el transfer de rodillos: 2 largueros + 3 travesaños de trabazón, 4 cartelas de anclaje al bastidor de la máquina, rieles T-slot + tuercas M12 para los 4 pies del módulo, y topes de altura elevada. Coordenadas locales del módulo (se posiciona con la misma transformación en el hueco real X=208, Y=-1121).',
    interfaz: 'El módulo (canal FIJO) se atornilla a los rieles T-slot (ajuste X) sobre los largueros; la altura de banda se reglará con shims + los topes M10. El cassette MÓVIL sube 6 mm LIBRE dentro del marco (holgura railGapZ=8 bajo el canal). Las bandas pasantes del base corren en las calles entre los rodillos; el marco va por debajo del plano de banda.',
    fijaciones: 'pies del módulo M12 a riel T-slot (ajuste X) + cartelas M12 al bastidor de la máquina; costura de soldadura tapón entre largueros y travesaños.',
    libertad_mecanismo: 'carrera de pop-up 6 mm garantizada por la holgura de 8 mm entre la cara superior del marco (Z=-14 local) y el canal FIJO del módulo; topes de altura elevada regulables M10.',
    nota: 'La base real es un STEP teselado (malla de visualización): este marco es la modificación de diseño propuesta; sus tie-ins exactos al bastidor se cierran contra el modelo nativo.',
  },
  parts,
  constraints: [],
};
const out = join(dirname(fileURLToPath(import.meta.url)), 'base_interface.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas del bastidor de integración → ${out}`);
