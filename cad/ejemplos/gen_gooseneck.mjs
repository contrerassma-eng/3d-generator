// Generador de un transportador de banda con CUELLO DE CISNE (gooseneck) →
// documento foto3d-cad. Banda azul con tacos azul oscuro, bastidor de perfil
// de aluminio 80x40, rodillos y poleas, y banda de retorno con catenaria.
// Modela cada tramo como un rectángulo extruido a lo largo de la tangente del
// recorrido, así la curva del cuello sale suave. Verifica que cada pieza
// construya (volumen > 0, sin NaN) y emite el JSON.
import * as THREE from 'three';
import {
  newDoc, newPart, makeCylFeature, makeSketchEntitiesFeature, buildPartGeometry,
} from '../js/model.js';
import { makeLine } from '../js/sketch2d.js';
import { writeFileSync } from 'node:fs';

// ---------- parámetros ----------
const W = 400;     // ancho de banda (mm)
const T = 8;       // espesor de banda
const Lh = 1500;   // tramo horizontal
const Rb = 380;    // radio del cuello de cisne
const THETA = 58 * Math.PI / 180; // ángulo de subida
const Li = 950;    // tramo inclinado
const H = 750;     // altura de la banda en el tramo horizontal
const MARGIN = 35; // separación banda↔riel
const PROF = 80, PROF2 = 40; // perfil 80x40
const Rroll = 25;  // radio de rodillo
const Rpul = 45;   // radio de polea (motriz/tensora)

const COL = {
  banda: '#2f6fd6',   // azul
  tacos: '#16357a',   // azul más oscuro
  bastidor: '#9aa6b2',// aluminio
  rodillos: '#c2cad2',// acero
  poleas: '#5b6572',  // acero oscuro
  patas: '#828d9b',
};

// ---------- utilidades ----------
// rectángulo cerrado centrado en (0, cy) en el plano del boceto (u=ancho, v=espesor)
function rectAt(w, h, cy = 0) {
  const x0 = -w / 2, x1 = w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  return [makeLine([x0, y0], [x1, y0]), makeLine([x1, y0], [x1, y1]),
          makeLine([x1, y1], [x0, y1]), makeLine([x0, y1], [x0, y0])];
}
const V = (p) => new THREE.Vector3(p[0], p[1], p[2]);
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// recorrido central de la banda superior en el plano X-Z (Z arriba)
function topPath() {
  const pts = [];
  pts.push([0, H]);                    // inicio horizontal
  const cx = Lh, cz = H + Rb;          // centro del arco (encima del fin horizontal)
  const N = 8;
  for (let i = 0; i <= N; i++) {       // arco del cuello de cisne
    const phi = -Math.PI / 2 + THETA * i / N;
    pts.push([cx + Rb * Math.cos(phi), cz + Rb * Math.sin(phi)]);
  }
  const end = pts[pts.length - 1];
  const tang = [Math.cos(-Math.PI / 2 + THETA + Math.PI / 2), Math.sin(-Math.PI / 2 + THETA + Math.PI / 2)];
  pts.push([end[0] + tang[0] * Li, end[1] + tang[1] * Li]); // tramo inclinado
  return pts;
}
// recorrido de retorno con catenaria (cuelga bajo el bastidor)
function returnPath(A, Bp) {
  const pts = [];
  const N = 10, sag = 120;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = A[0] + (Bp[0] - A[0]) * s;
    const z = A[1] + (Bp[1] - A[1]) * s - sag * Math.sin(Math.PI * s); // hundimiento
    pts.push([x, z]);
  }
  return pts;
}

// agrega a 'part' un slab (rectángulo w×h) extruido a lo largo del recorrido
function addSlabs(part, path, w, h, cy = 0, u = [0, 1, 0]) {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const L = len2(a, b); if (L < 1e-3) continue;
    const d3 = [(b[0] - a[0]) / L, 0, (b[1] - a[1]) / L]; // tangente 3D en X-Z
    const at = [a[0], 0, a[1]];
    part.features.push(makeSketchEntitiesFeature(rectAt(w, h, cy), [], L, 'union', at, d3, u));
  }
}

// ---------- construcción ----------
const doc = newDoc();
const top = topPath();
const inclEnd = top[top.length - 1];
const A = [0, H];            // eje de la polea tensora (inicio)
const retA = [0, H - PROF - 40];
const retB = [inclEnd[0], inclEnd[1] - PROF - 40];
const ret = returnPath(retB, retA);

// Banda (azul): tramo superior + retorno con catenaria
const banda = newPart(doc, 'Banda (azul)'); banda.color = COL.banda;
addSlabs(banda, top, W, T, 0);
addSlabs(banda, ret, W, T, 0);

// Tacos (azul oscuro): perfiles transversales cada ~180 mm sobre la banda superior
const tacos = newPart(doc, 'Tacos'); tacos.color = COL.tacos;
{
  const TH = 22, TW = 14; // alto y espesor del taco
  // recorre el path superior acumulando distancia y coloca tacos
  let acc = 0, next = 120;
  for (let i = 0; i < top.length - 1; i++) {
    const a = top[i], b = top[i + 1], L = len2(a, b);
    const d3 = [(b[0] - a[0]) / L, 0, (b[1] - a[1]) / L];
    while (next <= acc + L) {
      const s = (next - acc) / L;
      const p = [a[0] + (b[0] - a[0]) * s, 0, a[1] + (b[1] - a[1]) * s];
      // taco: ancho 0.92W, alto TH, sobre la cara superior de la banda (+v = T/2)
      tacos.features.push(makeSketchEntitiesFeature(rectAt(W * 0.92, TH, T / 2 + TH / 2), [], TW, 'union', p, d3, [0, 1, 0]));
      next += 180;
    }
    acc += L;
  }
}

// Bastidor 80x40 (aluminio): dos rieles laterales siguiendo el recorrido superior + patas
const bastidor = newPart(doc, 'Bastidor 8040'); bastidor.color = COL.bastidor;
for (const side of [-1, 1]) {
  const yOff = side * (W / 2 + MARGIN + PROF2 / 2);
  // riel: perfil 40(ancho)x80(alto) bajo la banda, desplazado en Y
  for (let i = 0; i < top.length - 1; i++) {
    const a = top[i], b = top[i + 1], L = len2(a, b);
    const d3 = [(b[0] - a[0]) / L, 0, (b[1] - a[1]) / L];
    const at = [a[0], yOff, a[1] - T / 2 - PROF / 2 - 6]; // bajo la banda
    bastidor.features.push(makeSketchEntitiesFeature(rectAt(PROF2, PROF, 0), [], L, 'union', at, d3, [0, 1, 0]));
  }
}
// travesaños y patas (perfil 40x40) — aspecto modular
{
  const legX = [180, Lh - 120];
  for (const lx of legX) {
    for (const side of [-1, 1]) {
      const yOff = side * (W / 2 + MARGIN + PROF2 / 2);
      const top_z = H - T / 2 - PROF - 6;
      // pata vertical 40x40 desde el piso hasta el riel
      bastidor.features.push(makeSketchEntitiesFeature(rectAt(PROF2, PROF2, 0), [], top_z, 'union', [lx, yOff, 0], [0, 0, 1], [1, 0, 0]));
    }
    // travesaño entre patas
    bastidor.features.push(makeSketchEntitiesFeature(rectAt(PROF2, PROF2, 0), [], W + 2 * (MARGIN + PROF2 / 2), 'union', [lx, -(W / 2 + MARGIN + PROF2 / 2), 120], [0, 1, 0], [1, 0, 0]));
  }
}

// Rodillos (acero): cilindros a lo ancho bajo la banda superior
const rodillos = newPart(doc, 'Rodillos'); rodillos.color = COL.rodillos;
{
  let acc = 0, next = 250;
  for (let i = 0; i < top.length - 1; i++) {
    const a = top[i], b = top[i + 1], L = len2(a, b);
    while (next <= acc + L) {
      const s = (next - acc) / L;
      const p = [a[0] + (b[0] - a[0]) * s, 0, a[1] + (b[1] - a[1]) * s - T / 2 - Rroll];
      rodillos.features.push(makeCylFeature(Rroll * 2, W + 40, [p[0], -(W / 2 + 20), p[2]], [0, 1, 0], 'union'));
      next += 300;
    }
    acc += L;
  }
}

// Poleas (acero oscuro): tensora (inicio) y motriz (fin del cuello)
const poleas = newPart(doc, 'Poleas'); poleas.color = COL.poleas;
poleas.features.push(makeCylFeature(Rpul * 2, W + 60, [A[0], -(W / 2 + 30), A[1] - T / 2 - Rpul], [0, 1, 0], 'union'));
poleas.features.push(makeCylFeature(Rpul * 2, W + 60, [inclEnd[0], -(W / 2 + 30), inclEnd[1] - T / 2 - Rpul], [0, 1, 0], 'union'));

// Rodillos de retención (desde ARRIBA): presionan la banda contra el cuello de
// cisne para que NO se levante en la curva. Van sobre la cara superior, a lo
// largo del arco, con soportes al bastidor.
const reten = newPart(doc, 'Rodillos de retención'); reten.color = COL.poleas;
{
  const Rhold = 16, SUP = 22; // radio del rodillo y sección del soporte
  for (let i = 2; i <= 8; i += 2) {           // a lo largo del arco del cuello
    const p = top[i], a = top[i - 1], b = top[i + 1];
    const L = len2(a, b); if (L < 1e-6) continue;
    const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const vv = [-d[1], d[0]];                  // normal hacia afuera (arriba de la banda)
    const cx = p[0] + vv[0] * (T / 2 + Rhold), cz = p[1] + vv[1] * (T / 2 + Rhold);
    // rodillo transversal que retiene
    reten.features.push(makeCylFeature(Rhold * 2, W - 10, [cx, -(W / 2 - 5), cz], [0, 1, 0], 'union'));
    // soportes en U desde el rodillo hacia el bastidor (dos lados)
    for (const side of [-1, 1]) {
      const yOff = side * (W / 2 + MARGIN + PROF2 / 2);
      const armLen = Math.hypot(cx - p[0], cz - p[1]) + PROF;
      reten.features.push(makeSketchEntitiesFeature(rectAt(20, 20, 0), [], armLen + 20,
        'union', [cx, yOff, cz], [-vv[0], 0, -vv[1]], [1, 0, 0]));
    }
  }
}

// ---------- verificación ----------
let pass = 0, fail = 0;
function vol(g) { const p = g.attributes.position; if (!p) return 0; let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6; } return Math.abs(v); }
const hasNaN = (g) => (g.attributes.position?.array || []).some(x => !Number.isFinite(x));
for (const part of doc.parts) {
  const g = buildPartGeometry(part);
  const v = vol(g), nan = hasNaN(g), ok = v > 1 && !nan;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✔' : '✘'} ${part.name}: ${part.features.length} func · ${(v / 1000).toFixed(0)} cm³${nan ? ' NaN!' : ''}`);
}
console.log(`\n${pass} OK, ${fail} fallas`);
if (fail) process.exit(1);

const out = process.argv[2] || new URL('./gooseneck.json', import.meta.url).pathname;
writeFileSync(out, JSON.stringify(doc));
console.log('escrito', out);
