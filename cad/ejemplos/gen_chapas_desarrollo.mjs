// Chapas plegadas del transportador como CHAPA REAL (base + pliegues), para
// generar el DESARROLLO plano con cotas generales (largo × ancho del despliegue,
// líneas de plegado y BA). Emite un proyecto foto3d-cad + los PDF de desarrollo.
import * as THREE from 'three';
import { newDoc, newPart, makeCylFeature, makeSketchEntitiesFeature, makePatternFeature, buildPartGeometry } from '../js/model.js';
import { regularPolygon } from '../js/sketch2d.js';
import { makeChapaBase, makePestana, flatPattern, esChapa } from '../js/sheetmetal.js';
import { exportFlatPDF, exportFlatDXF } from '../js/drawing2d.js';
import { writeFileSync } from 'fs';

const IN = 25.4;
const Lc = 3 * 3 * IN + 120;    // largo de una sección (~3 pasos + margen)
const Hc = 6.5 * IN, Wf = 1.5 * IN, TCH = 2.66; // canal Hytrol 190-E24
const HEX_AF = 11, HEX_R = HEX_AF / Math.sqrt(3), PITCH = 3 * IN;
const hex = () => regularPolygon([0, 0], [0, HEX_R], 6);

let pass = 0, fail = 0;
function volume(g) { const p = g.attributes.position; if (!p) return 0; let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6; } return v; }
const hasNaN = (g) => (g.attributes.position?.array || []).some(x => !Number.isFinite(x));

const doc = newDoc();
function report(part) {
  const g = buildPartGeometry(part);
  const ok = volume(g) > 1 && !hasNaN(g) && esChapa(part);
  (ok ? pass++ : fail++);
  const flat = flatPattern(part);
  const xs = flat.contorno.map(p => p[0]), ys = flat.contorno.map(p => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  console.log(`  ${ok ? '✔' : '✘'} ${part.name}: vol=${(volume(g) / 1000).toFixed(1)} cm³ · DESARROLLO ${bw.toFixed(1)} × ${bh.toFixed(1)} mm · ${flat.pliegueInfo.length} pliegues`);
  // PDF + DXF del desarrollo con cotas generales
  const meta = { designacion: part.name.toUpperCase(), proyecto: 'Transportador 190-E24' };
  const pdf = exportFlatPDF(flat, meta), dxf = exportFlatDXF(flat, meta);
  const base = part.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  writeFileSync(`ejemplos/desarrollo_${base}.pdf`, Buffer.from(pdf.data));
  writeFileSync(`ejemplos/desarrollo_${base}.dxf`, Buffer.from(dxf.data));
  return { part, bw, bh };
}

// 1) Canal (alma 6-1/2" + 2 alas de 1-1/2") con perforación hex patronada
function canal() {
  const part = newPart(doc, 'Canal'); part.color = '#5b6472';
  const b = makeChapaBase(Lc, Hc, 'galvanizado', TCH, TCH, 0); part.features.push(b);
  part.features.push(makePestana(b.id, 1, Wf, 90, TCH, 'arriba'));
  part.features.push(makePestana(b.id, 3, Wf, 90, TCH, 'arriba'));
  // perforación hexagonal en el alma (a 64.8 mm del centro = altura del eje set-high)
  const yhole = Hc / 2 - 0.25 * IN - (1.9 * IN / 2 - 0.25 * IN); // ≈ eje del rodillo sobre el alma
  const hexcut = makeSketchEntitiesFeature(hex(), [], TCH + 4, 'cut', [-PITCH, yhole, -2], [0, 0, 1], [1, 0, 0]);
  part.features.push(hexcut);
  part.features.push(makePatternFeature(hexcut.id, 'rect', { nx: 3, ny: 1, dx: PITCH, dy: 0, u: [1, 0, 0], v: [0, 1, 0] }));
  return report(part);
}

// 2) Bracket costanera (alma + 2 alas hacia el mismo lado) con patrón del motor
function bracket() {
  const part = newPart(doc, 'Bracket costanera'); part.color = '#3f6fb0';
  const W = 6.01 * IN + 50, H = 150;
  const b = makeChapaBase(W, H, 'acero', 4, 4, 0); part.features.push(b);
  part.features.push(makePestana(b.id, 0, 40, 90, 4, 'arriba')); // ala E
  part.features.push(makePestana(b.id, 2, 40, 90, 4, 'arriba')); // ala W (Cee)
  // patrón de pernos del motor Unidrive (Ø5/16" = 8, 6.01" x 5.50")
  const bolt = makeCylFeature(5 / 16 * IN, 8, [-6.01 * IN / 2, -5.50 * IN / 2, -2], [0, 0, 1], 'cut');
  part.features.push(bolt);
  part.features.push(makePatternFeature(bolt.id, 'rect', { nx: 2, ny: 2, dx: 6.01 * IN, dy: 5.50 * IN, u: [1, 0, 0], v: [0, 1, 0] }));
  return report(part);
}

// 3) Travesaño: ángulo 40×40 (alma + 1 ala) con pestañas de extremo
function travesano() {
  const part = newPart(doc, 'Travesano angulo'); part.color = '#6b7280';
  const b = makeChapaBase(500, 40, 'acero', 4, 4, 0); part.features.push(b);
  part.features.push(makePestana(b.id, 3, 40, 90, 4, 'arriba')); // ala a lo largo
  return report(part);
}

console.log('— Chapas del transportador: sólido + desarrollo con cotas —');
canal(); bracket(); travesano();
console.log(`\nRESULTADO: ${pass} ok, ${fail} fallan`);

writeFileSync('ejemplos/chapas_desarrollo.json', JSON.stringify(doc, null, 2));
console.log('JSON:', doc.parts.length, 'chapas · PDF/DXF de desarrollo escritos en ejemplos/');
process.exit(fail ? 1 : 0);
