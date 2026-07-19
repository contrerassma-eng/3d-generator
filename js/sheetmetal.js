// sheetmetal.js — Diseño de chapa plegada (símil Inventor) para el CAD web.
//
// Una pieza de chapa nace de una `chapaBase` (placa rectangular con material,
// espesor, radio de pliegue por defecto = espesor y factor K) y crece con
// `pestana`s creadas sobre aristas: de la base o de la punta de otra pestaña
// (cadenas). El plegado 3D muestra el radio real (sector cilíndrico) y, si la
// pestaña no ocupa toda la arista, se descuentan desahogos de plegado en el
// material padre (mismo recorte en plegado y en desarrollo).
//
// El DESARROLLO es real: cada pliegue consume BA = θ·(R + K·t) (tolerancia de
// plegado con factor K del material — el estiramiento de la fibra neutra), con
// eje de pliegue (trazo-punto), tangentes de la zona plegada y etiqueta
// dirección/ángulo/radio. Todo es capa `user`: diseño nominal, no medición.
import * as THREE from 'three';

// --- materiales (dims/K nominales, editables en el diálogo) -----------------
export const MATERIALES = [
  { id: 'acero',       nombre: 'Acero dulce',       k: 0.44, espesor: 2 },
  { id: 'galvanizado', nombre: 'Acero galvanizado', k: 0.44, espesor: 1.5 },
  { id: 'inox',        nombre: 'Acero inoxidable',  k: 0.45, espesor: 1.5 },
  { id: 'aluminio',    nombre: 'Aluminio',          k: 0.42, espesor: 2 },
];
export const materialPorId = (id) => MATERIALES.find(m => m.id === id) || MATERIALES[0];

const uid = (p) => `${p}${Math.random().toString(36).slice(2, 8)}`;

// --- features ----------------------------------------------------------------

export function makeChapaBase(w, d, material, t, radio, k, at = [0, 0, 0]) {
  const m = materialPorId(material);
  t = t > 0 ? t : m.espesor;
  return {
    id: uid('f'), name: `Chapa ${w}×${d}×${t}`, shape: 'chapaBase', op: 'union',
    at, dir: [0, 0, 1],
    params: { w, d, t, material: m.id, radio: radio > 0 ? radio : t, k: k > 0 ? k : m.k },
  };
}

// Chapa a partir de un CONTORNO real (placa reconocida): contorno/agujeros en el
// plano local XY, extruida por t desde z=zbase. w,d = bbox del contorno (respaldo).
export function makeChapaBaseContorno(contorno, agujeros, material, t, radio, k, zbase = 0) {
  const m = materialPorId(material);
  t = t > 0 ? t : m.espesor;
  const xs = contorno.map(p => p[0]), ys = contorno.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...ys) - Math.min(...ys);
  return {
    id: uid('f'), name: `Chapa contorno ${w.toFixed(0)}×${d.toFixed(0)}×${t}`, shape: 'chapaBase', op: 'union',
    at: [0, 0, zbase], dir: [0, 0, 1],
    params: { contorno, agujeros: agujeros || [], w, d, t, material: m.id, radio: radio > 0 ? radio : t, k: k > 0 ? k : m.k },
  };
}

export function makePestana(padreId, borde, altura, angulo, radio, dirBend = 'arriba', e1 = 0, e2 = 0) {
  return {
    id: uid('f'), name: `Pestaña ${angulo}° R${radio}`, shape: 'pestana', op: 'union',
    at: [0, 0, 0], dir: [0, 0, 1],
    params: { padre: padreId, borde, altura, angulo, radio, dirBend, e1, e2 },
  };
}

export const chapaOf = (part) =>
  part.features.find(f => f.shape === 'chapaBase' && !f.suppressed) || null;

export const esChapa = (part) => !!chapaOf(part);

// tolerancia de plegado (longitud desarrollada de la zona curva)
export const bendAllowance = (anguloDeg, radio, t, k) =>
  (anguloDeg * Math.PI / 180) * (radio + k * t);

// --- marcos de aristas (3D, coordenadas locales de la pieza) -----------------
// Cada arista vive en la SUPERFICIE MEDIA: { P (esquina inicial), e (dirección),
// u (hacia afuera del material), n (normal de la chapa), len }.

function baseEdges(f) {
  const { w, d, t } = f.params;
  const [cx, cy, z0] = f.at;
  const zm = z0 + t / 2;
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const mk = (P, e, u, len) => ({ P: new THREE.Vector3(...P), e, u, n: Z.clone(), len });
  return [
    mk([cx + w / 2, cy - d / 2, zm], Y.clone(), X.clone(), d),           // 0 E
    mk([cx + w / 2, cy + d / 2, zm], X.clone().negate(), Y.clone(), w),  // 1 N
    mk([cx - w / 2, cy + d / 2, zm], Y.clone().negate(), X.clone().negate(), d), // 2 W
    mk([cx - w / 2, cy - d / 2, zm], X.clone(), Y.clone().negate(), w),  // 3 S
  ];
}

// marco de la arista de PUNTA de una pestaña, a partir del marco padre
function tipFrame(parent, prm, t) {
  const s = prm.dirBend === 'abajo' ? -1 : 1;
  const A = prm.angulo * Math.PI / 180;
  const Rm = prm.radio + t / 2;
  const { P, e, u, n } = parent;
  const L = parent.len - prm.e1 - prm.e2;
  const tHat = u.clone().multiplyScalar(Math.cos(A)).addScaledVector(n, s * Math.sin(A));
  const nHat = n.clone().multiplyScalar(Math.cos(A)).addScaledVector(u, -s * Math.sin(A));
  const disp = u.clone().multiplyScalar(Rm * Math.sin(A))
    .addScaledVector(n, s * Rm * (1 - Math.cos(A)))
    .addScaledVector(tHat, prm.altura);
  const Q1 = P.clone().addScaledVector(e, prm.e1).add(disp);
  const ePrime = new THREE.Vector3().crossVectors(nHat, tHat); // = ±e
  const P0 = ePrime.dot(e) > 0 ? Q1 : Q1.clone().addScaledVector(e, L);
  return { P: P0, e: ePrime, u: tHat, n: nHat, len: L };
}

// Marcos de todas las aristas citables: Map(featureId -> { edges: {borde: marco} })
export function chapaFrames(part) {
  const frames = new Map();
  for (const f of part.features) {
    if (f.suppressed) continue;
    if (f.shape === 'chapaBase') {
      const edges = baseEdges(f);
      frames.set(f.id, { f, edges: { 0: edges[0], 1: edges[1], 2: edges[2], 3: edges[3] } });
    } else if (f.shape === 'pestana') {
      const parent = frames.get(f.params.padre);
      const base = chapaOf(part);
      const edge = parent && parent.edges[f.params.borde];
      if (!edge || !base) continue; // padre inexistente o suprimido: se omite
      frames.set(f.id, { f, edges: { punta: tipFrame(edge, f.params, base.params.t) } });
    }
  }
  return frames;
}

// aristas citables para la interfaz (con ocupación)
export function chapaEdges(part) {
  const frames = chapaFrames(part);
  const ocupada = (fid, borde) => part.features.some(
    (f) => f.shape === 'pestana' && !f.suppressed &&
      f.params.padre === fid && String(f.params.borde) === String(borde));
  const out = [];
  for (const [fid, node] of frames) {
    for (const [borde, m] of Object.entries(node.edges)) {
      out.push({
        featureId: fid, borde: node.f.shape === 'chapaBase' ? +borde : borde,
        a: m.P.toArray(), b: m.P.clone().addScaledVector(m.e, m.len).toArray(),
        libre: !ocupada(fid, borde),
      });
    }
  }
  return out;
}

// --- geometría plegada ---------------------------------------------------------

const FUSE = 0.2;   // solape con el material padre para que la unión CSG suelde

function extrudeSection(pts2, basis, origin, depth) {
  // orienta CCW para que ExtrudeGeometry genere normales hacia afuera
  let area = 0;
  for (let i = 0; i < pts2.length; i++) {
    const [x1, y1] = pts2[i], [x2, y2] = pts2[(i + 1) % pts2.length];
    area += x1 * y2 - x2 * y1;
  }
  if (area < 0) pts2 = [...pts2].reverse();
  const shape = new THREE.Shape(pts2.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  const m = new THREE.Matrix4().makeBasis(basis[0], basis[1], basis[2]).setPosition(origin);
  g.applyMatrix4(m);
  return g;
}

// Geometría de una feature de chapa → { add, cuts[] } (o null si no aplica)
export function chapaFeatureGeometry(part, f) {
  const base = chapaOf(part);
  if (!base) return null;
  const t = base.params.t;

  if (f.shape === 'chapaBase') {
    // Base con CONTORNO real (placa convertida a chapa): extruye el contorno 2D
    // (con sus agujeros) por el espesor; la base crece +Z desde f.at[2].
    if (f.params.contorno) {
      const shape = new THREE.Shape(f.params.contorno.map(p => new THREE.Vector2(p[0], p[1])));
      for (const h of (f.params.agujeros || [])) {
        const path = new THREE.Path();
        if (h.r) path.absarc(h.c[0], h.c[1], h.r, 0, Math.PI * 2, true);
        else path.setFromPoints(h.map(p => new THREE.Vector2(p[0], p[1])));
        shape.holes.push(path);
      }
      const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 24 });
      g.translate(0, 0, f.at[2]);
      return { add: g, cuts: [] };
    }
    const { w, d } = f.params;
    const g = new THREE.BoxGeometry(w, d, t);
    g.translate(f.at[0], f.at[1], f.at[2] + t / 2);
    return { add: g, cuts: [] };
  }

  // pestaña
  const frames = chapaFrames(part);
  const parent = frames.get(f.params.padre);
  const edge = parent && parent.edges[f.params.borde];
  if (!edge) return null;
  const prm = f.params;
  const s = prm.dirBend === 'abajo' ? -1 : 1;
  const A = prm.angulo * Math.PI / 180;
  const R = prm.radio, Rm = R + t / 2, H = prm.altura;
  const L = edge.len - prm.e1 - prm.e2;
  if (L <= 0 || A <= 0 || H < 0) return null;

  // sección en el plano (u, n): tapa trasera (con solape), arco interior,
  // plano interior, punta, plano exterior, arco exterior
  const segs = Math.max(6, Math.ceil(A / (Math.PI / 18)));
  const pts = [[-FUSE, -s * t / 2], [-FUSE, s * t / 2]];
  const inner = (a) => [Rm * Math.sin(a) - (t / 2) * Math.sin(a),
                        s * Rm * (1 - Math.cos(a)) + s * (t / 2) * Math.cos(a)];
  const outer = (a) => [Rm * Math.sin(a) + (t / 2) * Math.sin(a),
                        s * Rm * (1 - Math.cos(a)) - s * (t / 2) * Math.cos(a)];
  const tip = [Math.cos(A), s * Math.sin(A)];
  for (let i = 0; i <= segs; i++) pts.push(inner((A * i) / segs));
  const iA = inner(A), oA = outer(A);
  pts.push([iA[0] + H * tip[0], iA[1] + H * tip[1]]);
  pts.push([oA[0] + H * tip[0], oA[1] + H * tip[1]]);
  for (let i = segs; i >= 0; i--) pts.push(outer((A * i) / segs));

  // base (u, n, −e) es dextrógira; extruye desde el extremo s1 hacia −e
  const origin = edge.P.clone().addScaledVector(edge.e, edge.len - prm.e2);
  const add = extrudeSection(pts, [edge.u, edge.n, edge.e.clone().negate()], origin, L);

  // desahogos de plegado: muesca en el padre junto a cada extremo parcial
  const cuts = [];
  const wr = Math.max(t, 1.5);          // ancho de la muesca
  const dr = R + t;                     // profundidad hacia adentro del padre
  const notch = (sPos) => {
    const g = new THREE.BoxGeometry(dr + 0.3, wr, t + 1);
    const m = new THREE.Matrix4().makeBasis(edge.u, edge.e, edge.n).setPosition(
      edge.P.clone().addScaledVector(edge.e, sPos)
        .addScaledVector(edge.u, (-dr + 0.3) / 2));
    g.applyMatrix4(m);
    return g;
  };
  if (prm.e1 > 0) cuts.push(notch(prm.e1 - wr / 2));
  if (prm.e2 > 0) cuts.push(notch(edge.len - prm.e2 + wr / 2));
  return { add, cuts };
}

// --- desarrollo (plano, real con factor K) --------------------------------------

// hijos de una arista concreta
const pestanaEn = (part, fid, borde) => part.features.find(
  (f) => f.shape === 'pestana' && !f.suppressed &&
    f.params.padre === fid && String(f.params.borde) === String(borde)) || null;

/**
 * Desarrollo de la chapa de una pieza.
 * Devuelve { contorno: [[x,y]...] (CCW), pliegues: [{a,b,tipo:'eje'|'tangente'}],
 *            etiquetas: [{s,x,y}], pliegueInfo: [...], avisos: [...] }.
 * Coordenadas locales = vista superior de la base sin plegar (mm reales).
 */
// Cortes (barrenos) que caen en el PLANO de la base y se despliegan tal cual
// (lo que corta el láser). Devuelve {circles:[{c,r}], polys:[[[x,y]...]]}.
// Los cortes sobre pliegues/alas o no perpendiculares a la base NO se incluyen.
function patternOffsetsXY(p) { // offsets rectangulares EXCLUYENDO el origen (0,0)
  if (p.kind !== 'rect') return [];
  const u = p.u || [1, 0, 0], v = p.v || [0, 1, 0], out = [];
  for (let i = 0; i < Math.max(1, Math.round(p.nx)); i++)
    for (let j = 0; j < Math.max(1, Math.round(p.ny)); j++) {
      if (i === 0 && j === 0) continue;
      out.push([i * p.dx * u[0] + j * p.dy * v[0], i * p.dx * u[1] + j * p.dy * v[1]]);
    }
  return out;
}
function cutToBase(f) { // proyecta un corte al plano de la base (z⟂), coords 2D
  const n = new THREE.Vector3(...f.dir).normalize();
  if (Math.abs(n.z) < 0.99) return null; // no perpendicular a la base
  if (f.shape === 'hole' || f.shape === 'cylinder') {
    return { circles: [{ c: [f.at[0], f.at[1]], r: f.params.dia / 2 }], polys: [] };
  }
  if (f.shape === 'sketch' && f.params.entities) {
    const U = new THREE.Vector3(...(f.params.u || [1, 0, 0])); U.z = 0; U.normalize();
    const V = new THREE.Vector3().crossVectors(n, U);
    const map = (e) => [f.at[0] + U.x * e[0] + V.x * e[1], f.at[1] + U.y * e[0] + V.y * e[1]];
    const circles = [], polys = [];
    for (const e of f.params.entities) {
      if (e.type === 'line') polys.push([map(e.a), map(e.b)]);
      else if (e.type === 'circle') circles.push({ c: map(e.c), r: e.r });
      else if (e.type === 'arc') {
        const pts = []; const a0 = e.a0, a1 = e.a1 > e.a0 ? e.a1 : e.a1 + 2 * Math.PI;
        for (let k = 0; k <= 24; k++) { const a = a0 + (a1 - a0) * k / 24; pts.push(map([e.c[0] + e.r * Math.cos(a), e.c[1] + e.r * Math.sin(a)])); }
        polys.push(pts);
      }
    }
    return { circles, polys };
  }
  return null;
}
export function flatCuts(part) {
  const circles = [], polys = [];
  const add = (r) => { if (r) { circles.push(...r.circles); polys.push(...r.polys); } };
  for (const f of part.features) {
    if (f.suppressed) continue;
    if (f.op === 'cut') add(cutToBase(f));
    else if (f.shape === 'pattern') {
      const src = part.features.find(x => x.id === f.params.sourceId && !x.suppressed);
      if (!src || src.op !== 'cut') continue;
      const base = cutToBase(src);
      if (!base) continue;
      for (const [ox, oy] of patternOffsetsXY(f.params)) {
        for (const c of base.circles) circles.push({ c: [c.c[0] + ox, c.c[1] + oy], r: c.r });
        for (const p of base.polys) polys.push(p.map(q => [q[0] + ox, q[1] + oy]));
      }
    }
  }
  return { circles, polys };
}

export function flatPattern(part) {
  const base = chapaOf(part);
  if (!base) return null;
  const { w, d, t, k } = base.params;
  // Base con CONTORNO real y sin pestañas: el desarrollo ES ese contorno con sus
  // agujeros (exactamente lo que corta el láser).
  if (base.params.contorno && !part.features.some(f => f.shape === 'pestana' && !f.suppressed)) {
    const circles = [], polys = [];
    for (const h of (base.params.agujeros || [])) {
      if (h.r) circles.push({ c: [h.c[0], h.c[1]], r: h.r });
      else polys.push(h.map(p => [p[0], p[1]]));
    }
    return {
      contorno: base.params.contorno.map(p => [p[0], p[1]]),
      pliegues: [], etiquetas: [], pliegueInfo: [], avisos: [],
      cortes: { circles, polys }, material: base.params.material, t, k, radio: base.params.radio,
    };
  }
  const [cx, cy] = base.at;
  const contorno = [];
  const pliegues = [], etiquetas = [], pliegueInfo = [], avisos = [];
  const wr = Math.max(t, 1.5), dr = base.params.radio + t;

  // camina una arista 2D {Q:[x,y], e:[ex,ey], u:[ux,uy], len} agregando puntos
  // (sin el punto inicial, que ya lo puso el llamador)
  const walk = (fid, borde, Q, e, u, len) => {
    const P = (sL, uL) => [Q[0] + e[0] * sL + u[0] * uL, Q[1] + e[1] * sL + u[1] * uL];
    const child = pestanaEn(part, fid, borde);
    if (!child) { contorno.push(P(len, 0)); return; }
    const prm = child.params;
    const BA = bendAllowance(prm.angulo, prm.radio, t, k);
    const prof = BA + prm.altura;
    const s0 = prm.e1, s1 = len - prm.e2;
    if (prm.e1 > 0) {           // desahogo al inicio (muesca hacia el padre)
      contorno.push(P(s0 - wr, 0), P(s0 - wr, -dr), P(s0, -dr));
    }
    contorno.push(P(s0, 0), P(s0, prof));
    // arista de punta: puede continuar la cadena
    walk(child.id, 'punta', P(s0, prof), e, u, s1 - s0);
    contorno.push(P(s1, 0));
    if (prm.e2 > 0) {           // desahogo al final
      contorno.push(P(s1, -dr), P(s1 + wr, -dr), P(s1 + wr, 0));
    }
    contorno.push(P(len, 0));
    // líneas de plegado + etiqueta
    pliegues.push({ a: P(s0, 0), b: P(s1, 0), tipo: 'tangente' });
    pliegues.push({ a: P(s0, BA), b: P(s1, BA), tipo: 'tangente' });
    pliegues.push({ a: P(s0, BA / 2), b: P(s1, BA / 2), tipo: 'eje' });
    const c = P((s0 + s1) / 2, BA + 2.5);
    const sentido = prm.dirBend === 'abajo' ? 'ABAJO' : 'ARRIBA';
    etiquetas.push({ s: `PLEGAR ${sentido} ${prm.angulo}° R${prm.radio}`, x: c[0], y: c[1] });
    pliegueInfo.push({ id: child.id, angulo: prm.angulo, radio: prm.radio,
                       dir: prm.dirBend, ba: BA });
  };

  // contorno de la base (CCW: S, E, N, W) con pestañas intercaladas
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2;
  contorno.push([x0, y0]);
  walk(base.id, 3, [x0, y0], [1, 0], [0, -1], w);    // S
  walk(base.id, 0, [x1, y0], [0, 1], [1, 0], d);     // E
  walk(base.id, 1, [x1, y1], [-1, 0], [0, 1], w);    // N
  walk(base.id, 2, [x0, y1], [0, -1], [-1, 0], d);   // W
  contorno.pop(); // el último punto repite el inicial

  const cortes = flatCuts(part);
  // avisar solo si hay cortes que NO se pudieron desplegar (sobre alas o inclinados)
  const nCut = part.features.filter(f => !f.suppressed && (f.op === 'cut' || f.shape === 'pattern')).length;
  const nPlano = cortes.circles.length + cortes.polys.length;
  if (nCut > 0 && nPlano === 0) {
    avisos.push('Hay cortes sobre pliegues/alas: NO se reflejan en el desarrollo (solo los del plano de la base).');
  }
  return { contorno, pliegues, etiquetas, pliegueInfo, avisos, cortes,
           material: base.params.material, t, k, radio: base.params.radio };
}
