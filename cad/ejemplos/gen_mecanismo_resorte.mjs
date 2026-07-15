// Mecanismo de resorte de la tapa (símil "shuttle hexagonal con resorte",
// Interroll 1700 / Mason-FEI): el resorte empuja el buje hexagonal hacia
// afuera para que su punta encaje en la perforación hexagonal del marco;
// se comprime para montar el rodillo entre las canales fijas.
import * as THREE from 'three';
import {
  newDoc, newPart, makeCylFeature, makeSketchEntitiesFeature, makeRevolveFeature, buildPartGeometry,
} from '../js/model.js';
import { makeLine, regularPolygon } from '../js/sketch2d.js';

const IN = 25.4;
const OD = 1.9 * IN, Rf = OD / 2, Rid = (OD - 2 * 0.145 * IN) / 2;
const HEX_AF = 11, HEX_R = HEX_AF / Math.sqrt(3);
const Rj = 12, Radj = 11.8, Rsh = 7, FL = 3, DEEP = 22, BOT = 25;
const Rmouth = Rid + 0.10, Rdeep = Rid - 0.30;
// resorte (a comprar): muelle helicoidal — radio medio, alambre, nº de espiras
const SPR_RMEAN = 9, SPR_WIRE = 1.2, SPR_COILS = 6, SPR_Z0 = 13, SPR_Z1 = 21;

let pass = 0, fail = 0;
function volume(g) { const p = g.attributes.position; if (!p) return 0; let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6; } return v; }
const hasNaN = (g) => (g.attributes.position?.array || []).some(x => !Number.isFinite(x));
function verify(part) { const g = buildPartGeometry(part); const v = volume(g), nan = hasNaN(g); const ok = v > 1 && !nan; (ok ? pass++ : fail++); console.log(`  ${ok ? '✔' : '✘'} ${part.name}: vol=${(v / 1000).toFixed(2)} cm³${nan ? ' NaN!' : ''}`); return part; }

const loop = (pts) => pts.map((p, i) => makeLine(p, pts[(i + 1) % pts.length]));
const revZ = (entities, op = 'union') => makeRevolveFeature(entities, [], { a: [0, 0], b: [1, 0] }, op, [0, 0, 0], [1, 0, 0], [0, 0, 1]);

const doc = newDoc();

// 1) Alojamiento: copa con asiento de resorte al fondo (pista exterior)
function makeHousing() {
  const part = newPart(doc, 'Alojamiento (asiento resorte)'); part.color = '#3f6fb0';
  const prof = [
    [0, Rsh], [0, Rf], [FL, Rf], [FL, Rmouth], [BOT, Rdeep], // exterior: flange + cuerpo cónico
    [BOT, 0], [DEEP, 0], [DEEP, Rj],                          // disco de fondo (asiento del muelle)
    [FL, Rj], [FL, Rsh],                                      // bore de la pista + agujero del eje
  ];
  part.features.push(revZ(loop(prof)));
  return verify(part);
}

// 2) Buje hexagonal retráctil (shuttle): la punta hex sale por el flange y
//    el collar (Ø23.6) queda retenido dentro del bore; el resorte lo empuja
function makeShuttle() {
  const part = newPart(doc, 'Buje hex retráctil (shuttle)'); part.color = '#c9752e';
  // prisma hexagonal: tip protruye 15 mm por fuera (z<0) y entra hasta z=12
  part.features.push(makeSketchEntitiesFeature(
    regularPolygon([0, 0], [0, HEX_R], 6), [], 27, 'union', [0, 0, -15], [0, 0, 1], [1, 0, 0]));
  // collar/pista que gira dentro del bore (retención: no pasa el agujero del flange)
  part.features.push(makeCylFeature(Radj * 2, 10, [0, 0, 2], [0, 0, 1], 'union'));
  return verify(part);
}

// 3) Resorte (esquemático): espiras como anillos (washers) revolucionados
function makeSpring() {
  const part = newPart(doc, 'Resorte de compresión'); part.color = '#9aa4b2';
  const Rin = SPR_RMEAN - SPR_WIRE, Rout = SPR_RMEAN + SPR_WIRE, t = 2 * SPR_WIRE;
  for (let i = 0; i < SPR_COILS; i++) {
    const z0 = SPR_Z0 + (SPR_Z1 - SPR_Z0 - t) * i / (SPR_COILS - 1);
    part.features.push(revZ(loop([[z0, Rin], [z0, Rout], [z0 + t, Rout], [z0 + t, Rin]]), 'union'));
  }
  return verify(part);
}

console.log('— Mecanismo de resorte de la tapa —');
makeHousing(); makeShuttle(); makeSpring();

console.log(`\nRESULTADO: ${pass} ok, ${fail} fallan`);
console.log('RESORTE_A_COMPRAR', JSON.stringify({
  tipo: 'muelle de compresión', Dexterior_mm: +(2 * (SPR_RMEAN + SPR_WIRE)).toFixed(1),
  Dinterior_mm: +(2 * (SPR_RMEAN - SPR_WIRE)).toFixed(1), alambre_mm: SPR_WIRE * 2,
  espiras_aprox: SPR_COILS, carrera_mm: SPR_Z1 - SPR_Z0, nota: 'ID libra el hex (Ø12.7); OD entra al bore Ø24',
}));

import { writeFileSync } from 'fs';
writeFileSync('ejemplos/mecanismo_resorte.json', JSON.stringify(doc, null, 2));
console.log('JSON escrito: cad/ejemplos/mecanismo_resorte.json,', doc.parts.length, 'piezas');
process.exit(fail ? 1 : 0);
