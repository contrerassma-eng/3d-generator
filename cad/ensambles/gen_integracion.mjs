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

// la transferencia se monta en el hueco (origen); mismo marco → sin transformar.
const doc = {
  format: 'foto3d-cad', version: 1,
  meta: {
    nombre: 'Conjunto completo — transportador base twin-belt + transferencia 90° en el hueco',
    capa: 'user',
    origen: 'gen_integracion.mjs: base_sorter.json (equipo base paramétrico completo) + transfer_rodillos_90.json montado en el hueco (X=0), mismo marco (flujo X, plano de banda Z=170). Los rodillos emergen +4 entre las 4 bandas del base; el canal fijo del módulo se ancla a los 2 travesaños pesados del hueco (X=±430).',
    piezas_base: base.parts.length,
    piezas_transferencia: mod.parts.length,
  },
  parts: [...base.parts, ...mod.parts],
  constraints: [],
};
const out = join(here, 'integracion_modulo_base.json');
writeFileSync(out, JSON.stringify(doc, null, 1));
console.log(`OK: ${base.parts.length} (base) + ${mod.parts.length} (transfer) = ${doc.parts.length} piezas → ${out}`);
