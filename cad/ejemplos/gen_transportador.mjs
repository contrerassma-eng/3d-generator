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

// ---- Canal C (Hytrol 190-E24: 6-1/2" x 12 ga, ala 1-1/2", montaje set-high) ----
const Hc = 6.5 * IN;           // 165.1 alto del canal (dato manual 190-E24)
const Wf = 1.5 * IN;           // 38.1 ancho de ala (dato manual: OW = BR + 3")
const TCH = 2.66;              // 12 ga ≈ 2.66 mm
const zTop = Ro - 0.25 * IN;   // rodillo 1/4" sobre el ala superior (set-high) → 17.78
const zBot = zTop - Hc;
const CLR = 0.25 * IN;         // 6.35 holgura rodillo/marco (1/4" por lado, dato manual)
const Yw = L / 2 + CLR;        // cara interior del alma (BR/2)
const x0 = -0.5 * PITCH, x1 = (NROLL - 0.5) * PITCH, Lc = x1 - x0;
const XC = (x0 + x1) / 2;
// Patrón de perforación del costado ("6 pulgadas"): PROVISIONAL — confirmar
// coordenadas exactas con el manual/plano de Hytrol y de Unidrive.
const SIDE_DIA = 5 / 16 * IN;  // 7.94 tornillo 5/16" (provisional)
const SIDE_Z = -40;            // altura del patrón bajo el eje ("más abajo")
const SIDE_PITCH = 6 * IN;     // 152.4 patrón de 6"
const box = (name, at, w, d, h, op = 'union') => ({ id: 'b' + name + Math.round(at[0] + at[2]), name, shape: 'box', op, at, dir: [0, 0, 1], params: { w, d, h } });

function makeChannel(name, side) { // side = +1 derecha, −1 izquierda
  const part = newPart(doc, name);
  part.color = '#5b6472';
  const sgn = side;
  const yInner = sgn * Yw;                 // cara interior del alma
  const yWebC = yInner + sgn * TCH / 2;    // centro del alma
  part.features.push(box('Alma', [XC, yWebC, zBot], Lc, TCH, Hc));
  const yFlangeC = yInner + sgn * (TCH + Wf / 2);
  part.features.push(box('Pestaña sup', [XC, yFlangeC, zTop - TCH], Lc, Wf, TCH));
  part.features.push(box('Pestaña inf', [XC, yFlangeC, zBot], Lc, Wf, TCH));
  // barreno hexagonal del eje (z=0), pasante en Y, patrón a paso 3" (4 rodillos)
  const hole = makeSketchEntitiesFeature(hexEntities(), [], TCH + 4, 'cut',
    [0, yInner + sgn * (TCH + 2), 0], [0, -sgn, 0], [1, 0, 0]);
  part.features.push(hole);
  part.features.push(makePatternFeature(hole.id, 'rect', { nx: NROLL, ny: 1, dx: PITCH, dy: 0, u: [1, 0, 0], v: [0, 1, 0] }));
  // patrón lateral de 6" (bracket del motor + travesaños), z bajo, entre rodillos
  const sh = makeCylFeature(SIDE_DIA, TCH + 4, [0.5 * PITCH, yInner + sgn * (TCH + 2), SIDE_Z], [0, -sgn, 0], 'cut');
  part.features.push(sh);
  part.features.push(makePatternFeature(sh.id, 'rect', { nx: NROLL - 1, ny: 1, dx: SIDE_PITCH, dy: 0, u: [1, 0, 0], v: [0, 1, 0] }));
  return verify(part);
}

// ---- Travesaño: ángulo 40x40 entre canales, con pestañas en los extremos ----
// PROVISIONAL: perfil 40x40 y patrón de montaje a confirmar con el manual.
const ANG = 40, TANG = 4;
function makeCrossmember(name, x) {
  const part = newPart(doc, name); part.color = '#6b7280';
  const spanY = 2 * (Yw - TCH);           // entre caras interiores de las almas
  const z = zBot + 25;                    // más abajo, cerca del fondo del canal
  // ángulo: ala vertical (Z) + ala horizontal (X), corridas en Y
  part.features.push(box('Ala vert', [x, 0, z], TANG, spanY, ANG));
  part.features.push(box('Ala horiz', [x, 0, z], ANG, spanY, TANG));
  // pestañas en los extremos (apernadas al alma del canal)
  for (const s of [+1, -1]) {
    part.features.push(box('Pestaña', [x, s * (spanY / 2 + TCH / 2), z], ANG, TCH, ANG));
  }
  return verify(part);
}

// ---- Motor Unidrive + bracket costanera (pestañas hacia adentro) + polea 2 ranuras ----
// La polea baja hasta que su TANGENTE INFERIOR queda 3 mm sobre la pestaña
// inferior del canal (calculado). PROVISIONAL: patrón de pernos del motor
// Unidrive, módulo Dayton y tarjeta "Sony Logic Plus" (del STEP/manual Unidrive).
const PULLEY_D = 44, PULLEY_R = PULLEY_D / 2;
const PULLEY_Z = (zBot + TCH) + 3 + PULLEY_R;   // −119.66: tangente 3 mm sobre la pestaña inferior
function makeBracket(name, x, side) {
  const part = newPart(doc, name); part.color = '#3f6fb0';
  const sgn = side, yWeb = sgn * (Yw + TCH + 3); // costanera pegada a la cara exterior del alma
  const H = SIDE_Z + 30 - (PULLEY_Z - 10);       // desde el patrón de 6" hasta bajo la polea
  const zc = PULLEY_Z - 10;
  // alma de la costanera (placa X-Z) con doble fondo para módulo Dayton + tarjeta
  part.features.push(box('Alma bracket', [x, yWeb, zc], 120, 6, H));
  // pestañas de la costanera HACIA ADENTRO (−Y en la der.): arriba y abajo
  const yFl = yWeb - sgn * (3 + ANG / 2);
  part.features.push(box('Pestaña sup', [x, yFl, zc + H - TANG], ANG + 6, ANG, TANG));
  part.features.push(box('Pestaña inf', [x, yFl, zc], ANG + 6, ANG, TANG));
  return verify(part);
}
function makeMotorPulley(name, x, side) {
  const part = newPart(doc, name); part.color = '#c9752e';
  const sgn = side;
  // motor Unidrive (cilindro), de adentro hacia afuera, eje pequeño hacia el centro
  part.features.push(makeCylFeature(52, 70, [x, sgn * (Yw + 30), PULLEY_Z], [0, -sgn, 0], 'union'));
  part.features.push(makeCylFeature(10, 55, [x, sgn * (Yw + 30), PULLEY_Z], [0, -sgn, 0], 'union'));
  // polea de 2 ranuras (eje ∥ rodillos, Y), entre dos rodillos y abajo
  const pyC = sgn * (Yw - 55), w = 30;
  part.features.push(makeCylFeature(PULLEY_D, w, [x, pyC - sgn * w / 2, PULLEY_Z], [0, sgn, 0], 'union'));
  for (const t of [0.30, 0.70]) { // dos gargantas
    const gy = pyC - sgn * w * t;
    part.features.push(makeCylFeature(PULLEY_D - 10, 3.2, [x, gy - sgn * 1.6, PULLEY_Z], [0, sgn, 0], 'cut'));
  }
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
makeCrossmember('Travesaño 1', 0.5 * PITCH);
makeCrossmember('Travesaño 2', 2.5 * PITCH);
makeBracket('Bracket motor', 1.5 * PITCH, +1);
makeMotorPulley('Motor + polea', 1.5 * PITCH, +1);

console.log(`\nRESULTADO: ${pass} ok, ${fail} fallan`);
console.log('DIMS', JSON.stringify({ modelo: 'Hytrol 190-E24', OD: +OD.toFixed(2), canal_alto: +Hc.toFixed(1), ala: +Wf.toFixed(1), ga12: TCH, pitch: +PITCH.toFixed(1), zTop: +zTop.toFixed(2), BR: +(2 * Yw).toFixed(1), OW: +(2 * (Yw + TCH + Wf)).toFixed(1), oring: '3/16" (4.76) real vs 5 usuario', patron_lateral: '6" PROVISIONAL',
  polea_centro_z: +PULLEY_Z.toFixed(1), polea_tangente_inf_z: +(PULLEY_Z - PULLEY_R).toFixed(1), pestana_inf_top_z: +(zBot + TCH).toFixed(1) }));

// escribir el JSON del proyecto
import { writeFileSync } from 'fs';
writeFileSync('ejemplos/transportador_rodillos.json', JSON.stringify(doc, null, 2));
console.log('JSON escrito: cad/ejemplos/transportador_rodillos.json,', doc.parts.length, 'piezas');
process.exit(fail ? 1 : 0);
