// Generador del transportador de rodillos → proyecto foto3d-cad.
// Verifica que cada pieza construya (volumen > 0, sin NaN) y emite el JSON.
import * as THREE from 'three';
import {
  newDoc, newPart, makeCylFeature, makeSketchEntitiesFeature, makePatternFeature,
  buildPartGeometry,
} from '../js/model.js';
import { regularPolygon } from '../js/sketch2d.js';

const IN = 25.4;
// --- Rodillo (tubo SCH40 nominal 1-1/2", OD 1.9") ---
const OD = 1.9 * IN;                 // 48.26
const Ro = OD / 2;                   // 24.13
const WALL = 0.145 * IN;             // 3.683 (SCH40 1-1/2")
const Ri = Ro - WALL;                // 20.447 (radio interior)
const L = 21 * IN - 4.0;             // 529.4 (21" − 4 mm: mayor holgura extremo + carrera del resorte)
const HEX_AF = 11;                   // barra hexagonal 11 mm entre caras
const HEX_R = HEX_AF / Math.sqrt(3); // circunradio 6.351
const GW = 5;                        // ancho de ranura (aloja O-ring de 5 mm)
const GD = 2.0;                      // profundidad radial de ranura (limitada por la pared)
const CAP = 20;                      // largo de tapa maciza en cada extremo
const PITCH = 3 * IN;                // 76.2 (pitch entre rodillos)
const NROLL = 4;
// ranuras: 35 y 65 mm desde cada borde (2.ª a 30 mm del centro de la 1.ª)
const grooveCenters = [35, 65, L - 65, L - 35];

let pass = 0, fail = 0;
function volume(g) {
  const p = g.attributes.position; if (!p) return 0;
  let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6; }
  return v;
}
const hasNaN = (g) => (g.attributes.position?.array || []).some(x => !Number.isFinite(x));
function verify(part) {
  const g = buildPartGeometry(part);
  const v = volume(g), nan = hasNaN(g);
  const ok = v > 1 && !nan;
  (ok ? pass++ : fail++);
  console.log(`  ${ok ? '✔' : '✘'} ${part.name}: vol=${(v / 1000).toFixed(1)} cm³${nan ? ' NaN!' : ''}`);
  return part;
}

// hexágono como entidades 2D centradas en (0,0), vértice hacia +v
const hexEntities = () => regularPolygon([0, 0], [0, HEX_R], 6);

const doc = newDoc();

// ---- Rodillo: tubo hueco con ranuras; extremos abiertos para las tapas impresas
// (con avellanado de entrada para recibir la conicidad de la tapa) ----
const LEAD = 2.0;   // avellanado de entrada del barreno (mm)
function makeRoller(name) {
  const part = newPart(doc, name);
  const cuts = [];
  for (const gc of grooveCenters) { cuts.push([gc - GW / 2, gc + GW / 2]); }
  const marks = [0, ...cuts.flat(), L].sort((a, b) => a - b);
  const segs = [];
  for (let i = 0; i < marks.length - 1; i++) {
    const y0 = marks[i], y1 = marks[i + 1];
    if (y1 - y0 < 1e-3) continue;
    const inGroove = cuts.some(([a, b]) => y0 >= a - 1e-6 && y1 <= b + 1e-6);
    segs.push({ y0, y1, r: inGroove ? Ro - GD : Ro });
  }
  for (const s of segs) {
    part.features.push(makeCylFeature(s.r * 2, s.y1 - s.y0, [0, s.y0 - L / 2, 0], [0, 1, 0], 'union'));
  }
  // barreno interior pasante (tubo hueco) — las tapas impresas entran a presión
  part.features.push(makeCylFeature(Ri * 2, L + 2, [0, -L / 2 - 1, 0], [0, 1, 0], 'cut'));
  // avellanado de entrada en cada extremo (Ø ligeramente mayor, guía la conicidad)
  part.features.push(makeCylFeature(Ri * 2 + 1.2, LEAD, [0, -L / 2, 0], [0, 1, 0], 'cut'));
  part.features.push(makeCylFeature(Ri * 2 + 1.2, LEAD, [0, L / 2 - LEAD, 0], [0, 1, 0], 'cut'));
  return verify(part);
}

// ---- Eje hexagonal 11 mm ----
function makeShaft(name, len) {
  const part = newPart(doc, name);
  part.color = '#8a8f98';
  part.features.push(makeSketchEntitiesFeature(
    hexEntities(), [], len, 'union', [0, -len / 2, 0], [0, 1, 0], [1, 0, 0]));
  return verify(part);
}

// ---- Canal C (3 chapas: alma + 2 pestañas hacia afuera) con barreno hex patronado ----
const Hc = 3 * IN;              // 76.2 alto del alma
const Wf = 1 * IN;             // 25.4 ancho de pestaña
const TCH = 3;                 // espesor de chapa
const zTop = Ro - 0.25 * IN;   // tangente del rodillo 1/4" sobre la pestaña superior → tope del canal
const zBot = zTop - Hc;
const CLR = 0.5;               // holgura rodillo/alma
const Yw = L / 2 + CLR;        // cara interior del alma (derecha)
const x0 = -60, x1 = (NROLL - 1) * PITCH + 60, Lc = x1 - x0;

function makeChannel(name, side) { // side = +1 derecha, −1 izquierda
  const part = newPart(doc, name);
  part.color = '#5b6472';
  const sgn = side;
  const yInner = sgn * Yw;                 // cara interior del alma
  const yWebC = yInner + sgn * TCH / 2;    // centro del alma
  // alma (placa vertical en X-Z)
  part.features.push({ id: 'w' + name, name: 'Alma', shape: 'box', op: 'union',
    at: [(x0 + x1) / 2, yWebC, zBot], dir: [0, 0, 1], params: { w: Lc, d: TCH, h: Hc } });
  // pestañas superior e inferior hacia afuera (+Y si derecha)
  const yFlangeC = yInner + sgn * (TCH + Wf / 2);
  part.features.push({ id: 'ft' + name, name: 'Pestaña sup', shape: 'box', op: 'union',
    at: [(x0 + x1) / 2, yFlangeC, zTop - TCH], dir: [0, 0, 1], params: { w: Lc, d: Wf, h: TCH } });
  part.features.push({ id: 'fb' + name, name: 'Pestaña inf', shape: 'box', op: 'union',
    at: [(x0 + x1) / 2, yFlangeC, zBot], dir: [0, 0, 1], params: { w: Lc, d: Wf, h: TCH } });
  // barreno hexagonal en el alma (a la altura del eje, z=0), pasante en Y
  const hole = makeSketchEntitiesFeature(
    hexEntities(), [], TCH + 4, 'cut',
    [0, yInner + sgn * (TCH + 2), 0], [0, -sgn, 0], [1, 0, 0]);
  part.features.push(hole);
  // patrón del barreno a lo largo de X (pitch 3", 4 rodillos)
  part.features.push(makePatternFeature(hole.id, 'rect',
    { nx: NROLL, ny: 1, dx: PITCH, dy: 0, u: [1, 0, 0], v: [0, 1, 0] }));
  return verify(part);
}

console.log('— Verificación de piezas del transportador —');
const shaftLen = L + 2 * (CLR + TCH + 12);
for (let i = 0; i < NROLL; i++) {
  const r = makeRoller(`Rodillo ${i + 1}`); r.pos = [i * PITCH, 0, 0]; r.color = '#c9752e';
  const s = makeShaft(`Eje hex ${i + 1}`, shaftLen); s.pos = [i * PITCH, 0, 0]; s.fixed = i === 0;
}
makeChannel('Canal der', +1);
makeChannel('Canal izq', -1);

console.log(`\nRESULTADO: ${pass} ok, ${fail} fallan`);
console.log('DIMS', JSON.stringify({ OD: +OD.toFixed(2), Ri: +Ri.toFixed(2), WALL: +WALL.toFixed(2), L: +L.toFixed(1), pitch: +PITCH.toFixed(1), zTop: +zTop.toFixed(2), Yw: +Yw.toFixed(1), shaftLen: +shaftLen.toFixed(1), grooveWallMM: +((Ro - GD) - Ri).toFixed(2) }));

// escribir el JSON del proyecto
import { writeFileSync } from 'fs';
writeFileSync('ejemplos/transportador_rodillos.json', JSON.stringify(doc, null, 2));
console.log('JSON escrito: cad/ejemplos/transportador_rodillos.json,', doc.parts.length, 'piezas');
process.exit(fail ? 1 : 0);
