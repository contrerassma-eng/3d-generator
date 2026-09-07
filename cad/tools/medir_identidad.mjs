#!/usr/bin/env node
// medir_identidad.mjs <doc.json> — compuerta G3 del PRD_MOTOR_BREP: qué fracción
// de los triángulos de cada pieza PROPIA lleva ficha de cara analítica, y en
// cuántas caras quedó resuelta. Una pieza que baje del umbral está construyéndose
// por una vía que no declara identidad.
import { readFileSync } from 'node:fs';
import { buildPartGeometry } from '../js/model.js';
import { cobertura, idsDe, fichaDe, SUP } from '../js/brep.mjs';

const doc = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
let tTot = 0, tCon = 0, peor = null, nProp = 0;
for (const part of doc.parts) {
  if (part.glb || !part.features || !part.features.length) continue;   // vendor: sin registro
  nProp++;
  const g = buildPartGeometry(part);
  const c = cobertura(g);
  const ids = idsDe(g);
  const cil = new Set(), pla = new Set(), con = new Set();
  if (ids) for (const id of ids) {
    const f = fichaDe(part._brep, id);
    if (!f) continue;
    (f.tipo === SUP.CILINDRO ? cil : f.tipo === SUP.CONO ? con : pla).add(id);
  }
  tTot += c.total; tCon += c.con;
  if (!peor || c.pct < peor.pct) peor = { n: part.name || part.id, ...c };
  if (process.env.DETALLE) console.log(`  ${(part.name || part.id).slice(0, 52).padEnd(52)} ${String(c.total).padStart(6)} tri · ${String(c.pct).padStart(5)} % · ${pla.size} planos ${cil.size} cilindros ${con.size} conos`);
}
const pct = tTot ? Math.round(1000 * tCon / tTot) / 10 : 0;
console.log(`\n${nProp} piezas propias · ${tTot} triángulos · con ficha ${tCon} (${pct} %)`);
console.log(`peor pieza: ${peor ? peor.n + ' — ' + peor.pct + ' %' : '—'}`);
process.exit(pct >= 99 ? 0 : 1);
