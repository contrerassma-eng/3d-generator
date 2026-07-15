#!/usr/bin/env node
// gen_integracion.mjs — Ensamble de INTEGRACIÓN módulo ↔ equipo base de bandas.
//
// Toma el módulo de transferencia (transfer_rodillos_90.json) YA posicionado y
// le añade una REFERENCIA SIMPLIFICADA del equipo base (transportador de bandas
// estrechas), en su sitio real, para ver cómo calza:
//   - plano de transporte del base a Z=170 con las BANDAS de 40 mm corriendo en
//     X (flujo), en las calles entre las líneas de rodillos;
//   - los RIELES T-slot del base a los que se anclan los pies del módulo;
//   - largueros de bastidor del base y 2 rodillos de banda (tambores) al final.
//
// La referencia del base es SOLO VISUAL (prefijo "BASE ·", capa base_ref): el
// módulo NO la modifica; muestra el interfaz de montaje y de transporte. Emite
// `integracion_modulo_base.json` (formato foto3d-cad), abrible en el visor
// (ver.html?doc=integracion_modulo_base.json) o en el CAD (📂 Abrir).
//
// Uso:  node cad/ensambles/gen_integracion.mjs   (desde la raíz del repo)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const mod = JSON.parse(readFileSync(join(here, 'transfer_rodillos_90.json'), 'utf8'));

// --- Parámetros del interfaz (del diseño del módulo y de la lectura del STEP) --
const I = {
  hostPlane: 170,        // plano de transporte del base (top de banda)
  beltT: 3, beltW: 40,   // bandas del base 40×3 (nitrilo)
  beltLanes: [0, -100, 100, -200, 200],   // calles ENTRE las líneas de rodillos
  beltRunX: 640,         // largo visible de banda en X (flujo)
  railY: 330,            // rieles T-slot bajo los pies del módulo (y=±330)
  railTop: -14,          // top del riel = base de los pies del módulo
  frameY: 360,           // largueros del bastidor del base (más afuera)
  hostRollerX: 300,      // 2 rodillos de banda del base cerca de los extremos
};

let n = 0;
const P = (name, color, features) => ({
  id: `base_${++n}`, name: `BASE · ${name}`, color,
  pos: [0, 0, 0], quat: [0, 0, 0, 1], fixed: false, visible: true, base_ref: true, features,
});
const box = (name, color, at, w, d, h) =>
  P(name, color, [{ id: `bf_${n + 1}`, name, shape: 'box', op: 'union', at, dir: [0, 0, 1], params: { w, d, h } }]);
const cylY = (name, color, at, dia, h) =>
  P(name, color, [{ id: `bf_${n + 1}`, name, shape: 'cylinder', op: 'union', at, dir: [0, 1, 0], params: { dia, h } }]);

const base = [];
// 1) bandas del base a Z=170 (top), corriendo en X, en las calles entre rodillos
for (const y of I.beltLanes) {
  base.push(box(`Banda anfitrión 40 (plano ${I.hostPlane}) y=${y}`, '#262626',
    [0, y, I.hostPlane - I.beltT], I.beltRunX, I.beltW, I.beltT));
}
// 2) 2 rodillos de banda del base (eje en Y), la banda envuelve — extremos
for (const sx of [-1, 1]) {
  base.push(cylY(`Rodillo de banda del base x=${sx * I.hostRollerX}`, '#4a5560',
    [sx * I.hostRollerX, -250, I.hostPlane - 20], 40, 500));
}
// 3) rieles T-slot del base bajo los pies del módulo (interfaz de montaje)
for (const sy of [-1, 1]) {
  base.push(box(`Riel T-slot del base y=${sy * I.railY}`, '#8a97a3',
    [0, sy * I.railY, I.railTop - 40], I.beltRunX, 40, 40));
}
// 4) largueros de bastidor del base (referencia estructural, más afuera)
for (const sy of [-1, 1]) {
  base.push(box(`Larguero de bastidor del base y=${sy * I.frameY}`, '#5f6b75',
    [0, sy * I.frameY, -60], I.beltRunX + 40, 10, 240));
}

const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Integración — módulo de desviación 90° sobre el transportador de bandas base',
    capa: 'user',
    origen: 'gen_integracion.mjs: módulo transfer_rodillos_90.json (sin cambios) + referencia SIMPLIFICADA del equipo base (bandas 40 a Z=170, rieles T-slot, largueros). La referencia base es solo visual (prefijo BASE ·).',
    interfaz: {
      plano_transporte_base_mm: I.hostPlane,
      rodillos_elevados_tangente_mm: mod.meta?.verificaciones ? I.hostPlane + mod.meta.verificaciones.pop : 174,
      bandas_base: `${I.beltW}×${I.beltT} en calles y=${I.beltLanes.join(', ')} (entre las líneas de rodillos)`,
      montaje: 'pies del módulo a los rieles T-slot del base (y=±' + I.railY + ') con tuercas en T M6; ajuste de altura por colisos M8 + shims (±7).',
      calce: 'los rodillos emergen +' + (I.hostPlane + 4 - I.hostPlane) + ' mm sobre el plano de banda entre las calles; al retraer bajan 2 mm bajo el plano.',
    },
    advertencia: 'La geometría BASE es una REPRESENTACIÓN SIMPLIFICADA para verificar el interfaz — el equipo base real es el STEP sorter_CO (no se modela ni se modifica).',
  },
  parts: [...mod.parts, ...base],
  constraints: [],
};

const out = join(here, 'integracion_modulo_base.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${mod.parts.length} piezas del módulo + ${base.length} de referencia del base = ${doc.parts.length} → ${out}`);
