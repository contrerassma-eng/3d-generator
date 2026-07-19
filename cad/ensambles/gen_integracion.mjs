#!/usr/bin/env node
// gen_integracion.mjs — CONJUNTO COMPLETO: equipo base paramétrico
// (base_sorter.json, transportador twin-belt) + la TRANSFERENCIA 90°
// (transfer_rodillos_90.json) montada en el hueco.
//
// Ambos están en el MISMO marco (flujo X, ancho Y, plano de banda Z=170), así
// que la transferencia calza en el ORIGEN del hueco SIN rotación ni offset: sus
// rodillos emergen +4 (Z=174) entre las 4 bandas del base (Z=170). Emite
// `integracion_modulo_base.json`.
//
// Regenerar todo:
//   node cad/ensambles/gen_base.mjs
//   node cad/ensambles/gen_transfer90.mjs
//   node cad/ensambles/gen_integracion.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(readFileSync(join(here, 'base_sorter.json'), 'utf8'));
const mod = JSON.parse(readFileSync(join(here, 'transfer_rodillos_90.json'), 'utf8'));

// RESTRICCIONES de ensamble: el equipo base queda de TIERRA (fixed) y el canal
// FIJO de la transferencia se ancla a él con 3 restricciones "flush" ortogonales
// (X, Y, Z) que bloquean su POSICIÓN en el hueco. Se anclan al MISMO punto del
// mundo (el origen del hueco) con offset 0 → ya están satisfechas: documentan la
// relación sin mover nada (el resto de la transferencia va rígido con su canal).
const A = base.parts[0];                 // tierra del base (perfil del bastidor)
const B = { ...mod.parts[0] };           // canal fijo de la transferencia
B.fixed = false;                          // deja que las restricciones lo ubiquen
const modParts = mod.parts.map((p, i) => (i === 0 ? B : p));
const W = [0, 0, 0];                       // origen del hueco (punto de anclaje común)
const anc = (part, normal) => ({ part: part.id, point: [W[0] - part.pos[0], W[1] - part.pos[1], W[2] - part.pos[2]], normal });
const constraints = [
  { id: 'ci_pos_x', type: 'flush', a: anc(A, [1, 0, 0]), b: anc(B, [1, 0, 0]), offset: 0 },
  { id: 'ci_pos_y', type: 'flush', a: anc(A, [0, 1, 0]), b: anc(B, [0, 1, 0]), offset: 0 },
  { id: 'ci_pos_z', type: 'flush', a: anc(A, [0, 0, 1]), b: anc(B, [0, 0, 1]), offset: 0 },
];

// la transferencia se monta en el hueco (origen); mismo marco → sin transformar.
const doc = {
  format: 'foto3d-cad', version: 1,
  meta: {
    nombre: 'Conjunto completo — transportador base twin-belt + transferencia 90° en el hueco',
    capa: 'user',
    origen: 'gen_integracion.mjs: base_sorter.json (equipo base paramétrico completo) + transfer_rodillos_90.json montado en el hueco (X=0), mismo marco (flujo X, plano de banda Z=170). Los rodillos emergen +4 entre las 4 bandas del base; el canal fijo del módulo se ancla a los 2 travesaños pesados del hueco (X=±430). El base es la TIERRA; el canal de la transferencia se fija con 3 restricciones flush (X/Y/Z).',
    piezas_base: base.parts.length,
    piezas_transferencia: mod.parts.length,
    restricciones: constraints.length,
  },
  parts: [...base.parts, ...modParts],
  constraints,
};
const out = join(here, 'integracion_modulo_base.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${base.parts.length} (base) + ${mod.parts.length} (transfer) = ${doc.parts.length} piezas → ${out}`);
