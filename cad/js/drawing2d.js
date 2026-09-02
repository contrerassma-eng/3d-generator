// drawing2d.js — Lámina técnica normalizada generada en el navegador.
//
// Réplica del estilo de S6 (pipeline/s6_drawings.py): marco ISO 5457 con
// marcas de centrado y retícula de referencia, cajetín ISO 7200 en tres
// zonas con el símbolo del primer diedro, vistas alzado/planta/perfil/
// isométrica (ISO 5456-2) y cotas envolventes (ISO 129).
//
// Sin dependencias externas: los escritores DXF (R12) y PDF (1.4) son
// propios. El DXF sale A ESCALA REAL (1 unidad = 1 mm; marco y textos ×K,
// como en S6); el PDF sale al tamaño de papel listo para imprimir.
// El diseño CAD es capa `user`: mm exactos, no medición.
import * as THREE from 'three';

// --- norma (mismos valores que pipeline/s6_drawings.py) ---------------------
const SHEETS = { A4: [297, 210], A3: [420, 297], A2: [594, 420], A1: [841, 594], A0: [1189, 841] };
const MARGIN = 10, MARGIN_L = 20, TITLE_W = 180, TITLE_H = 42, GAP = 26;
const REDUCTIONS = [1, 2, 2.5, 5, 10, 20, 50, 100, 200, 500, 1000];
const ENLARGEMENTS = [2, 5, 10, 20, 50];
const GRIDREF = { A4: [6, 4], A3: [8, 6], A2: [12, 8], A1: [16, 12], A0: [24, 16] };
const GRID_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LAYERS = { SOMBRA: 8, NORMA: 7, FINA: 7, VISIBLE: 7, COTAS: 7, TEXTO: 7, PLIEGUE: 1, OCULTA: 7, EJE: 4 }; // color ACI
const LW = { NORMA: 0.7, FINA: 0.18, VISIBLE: 0.5, COTAS: 0.25, TEXTO: 0.25, PLIEGUE: 0.35, OCULTA: 0.25, EJE: 0.25 }; // mm (PDF)
const DASH = { PLIEGUE: [4, 2], OCULTA: [2.5, 1.5], EJE: [7, 1.2, 1.2, 1.2] };  // segmentada · EJE = cadena punto-raya (ISO 128)
// Color de trazo por capa en el PDF (sobrio, convención CAD): la geometría de
// pieza queda negra; lo AUXILIAR se distingue por color además del trazo.
// Sergio 18-08: «dentro del mismo plano de detalle usa colores».
const RGB = {
  EJE: [0.72, 0.10, 0.10],       // línea de centro: rojo oscuro
  PLIEGUE: [0.10, 0.25, 0.70],   // pliegues: azul
  OCULTA: [0.35, 0.35, 0.35],    // ocultas: gris
  COTAS: [0.15, 0.15, 0.15],
};
// paleta para GRUPOS de barrenos (A, B, C, …): círculo y letra al color del
// grupo — la lámina se lee de un vistazo qué barreno es de qué familia
const GRUPO_RGB = [
  [0.75, 0.00, 0.00], [0.00, 0.35, 0.80], [0.00, 0.55, 0.20],
  [0.75, 0.45, 0.00], [0.55, 0.00, 0.65], [0.00, 0.55, 0.55],
];
// capas de GEOMETRÍA de la pieza: en láminas de fabricación (desarrollo) el
// PDF las traza como línea fina sin espesor (hairline, aptas para corte)
const GEOM_LAYERS = new Set(['VISIBLE', 'FINA', 'PLIEGUE', 'COTAS']);

// vistas del primer diedro con Z arriba: [derecha, arriba] de cada proyección.
// planta con correspondencia de proyección con el alzado (X compartida).
const VIEWS = {
  alzado: [[1, 0, 0], [0, 0, 1]],
  perfil: [[0, -1, 0], [0, 0, 1]],
  planta: [[1, 0, 0], [0, 1, 0]],
  isometrica: [[-Math.SQRT1_2, Math.SQRT1_2, 0], [-0.40824829, -0.40824829, 0.81649658]],
};
const ORDER = ['alzado', 'planta', 'perfil', 'isometrica'];
const LABELS = { alzado: 'ALZADO', planta: 'PLANTA', perfil: 'PERFIL', isometrica: 'ISOMÉTRICA' };

// --- anchos Helvetica aproximados (por 1000) para centrar/truncar textos ----
const WID = {
  ' ': 278, '!': 278, "'": 191, '(': 333, ')': 333, ',': 278, '-': 333, '.': 278,
  '/': 278, ':': 278, ';': 278, 'I': 278, 'J': 500, 'M': 833, 'W': 944, 'f': 278,
  'i': 222, 'j': 222, 'l': 222, 'm': 833, 'r': 333, 't': 278, 'w': 722, '·': 333,
  'º': 333, '—': 1000, '–': 556, '…': 1000,
};
function textWidth(s, h) {
  let w = 0;
  for (const c of s) w += WID[c] ?? (c >= 'A' && c <= 'Z' ? 677 : 556);
  return (w / 1000) * h;
}

const fmtNum = (v) => Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1);
const scaleLabel = (num, den) => `${num}:${den}`;

function chooseSheet(w, h) {
  const small = Math.max(w, h) < 50;
  const prefs = (small ? [...ENLARGEMENTS].sort((a, b) => b - a).map(m => [m, 1]) : [])
    .concat([[1, 1]], REDUCTIONS.slice(1).map(d => [1, d]));
  let best = null;
  for (const name of Object.keys(SHEETS)) {
    const [W, H] = SHEETS[name];
    const uw = W - MARGIN_L - MARGIN, uh = H - 2 * MARGIN - TITLE_H - 5;
    for (const [num, den] of prefs) {
      const s = num / den;
      if (w * s <= uw && h * s <= uh) {
        if (!best || s > best[3] / best[4]) best = [name, W, H, num, den];
        break;
      }
    }
  }
  if (!best) {
    const [W, H] = SHEETS.A0;
    best = ['A0', W, H, 1, REDUCTIONS[REDUCTIONS.length - 1]];
  }
  return best;
}

// --- geometría: aristas características del ensamble → vistas 2D ------------

// Aristas características del ensamble. No usa THREE.EdgesGeometry porque la
// triangulación del CSG deja grietas (T-vértices) que aparecerían como abanicos
// de líneas falsas. Las aristas compartidas se filtran por ángulo diedro; las
// huérfanas se sondean contra los triángulos de su MISMO plano: si al otro
// lado de la arista hay material coplanario, es una grieta y se descarta.
export function collectEdgeSegments(parts, angleDeg = 25) {
  const cosT = Math.cos((angleDeg * Math.PI) / 180);
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const q4 = (x) => Math.round(x * 1e4);
  const pkey = (p) => `${q4(p.x)},${q4(p.y)},${q4(p.z)}`;
  const nkey = (n) => `${Math.round(n.x * 1e2)},${Math.round(n.y * 1e2)},${Math.round(n.z * 1e2)}`;
  const edges = new Map();
  const planes = new Map();   // normal cuantizada -> [{p0,p1,p2,n}]
  for (const part of parts) {
    const pos = part.geometry.attributes.position;
    if (!pos) continue;
    for (let t = 0; t + 2 < pos.count; t += 3) {
      for (let i = 0; i < 3; i++) {
        v[i].fromBufferAttribute(pos, t + i);
        if (part.matrixWorld) v[i].applyMatrix4(part.matrixWorld);
      }
      const n = new THREE.Vector3().subVectors(v[1], v[0])
        .cross(new THREE.Vector3().subVectors(v[2], v[0]));
      if (n.lengthSq() < 1e-12) continue;
      n.normalize();
      const tri = { p0: v[0].clone(), p1: v[1].clone(), p2: v[2].clone(), n: n.clone() };
      let pg = planes.get(nkey(n));
      if (!pg) planes.set(nkey(n), pg = []);
      pg.push(tri);
      for (let i = 0; i < 3; i++) {
        const a = v[i], b = v[(i + 1) % 3], c = v[(i + 2) % 3];
        const ka = pkey(a), kb = pkey(b);
        if (ka === kb) continue;
        const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        let e = edges.get(key);
        if (!e) edges.set(key, e = { a: a.toArray(), b: b.toArray(), ns: [], third: c.toArray() });
        e.ns.push(n.clone());
      }
    }
  }

  // punto dentro de un triángulo del mismo plano (proyectado en 2D)
  const inTriangle = (tri, p) => {
    if (Math.abs(tri.n.dot(p) - tri.n.dot(tri.p0)) > 0.02) return false;
    const ax = Math.abs(tri.n.x), ay = Math.abs(tri.n.y), az = Math.abs(tri.n.z);
    const [i, j] = az >= ax && az >= ay ? [0, 1] : (ax >= ay ? [1, 2] : [0, 2]);
    const g = (q) => [q.getComponent(i), q.getComponent(j)];
    const [p0, p1, p2, pp] = [g(tri.p0), g(tri.p1), g(tri.p2), g(p)];
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const d0 = cr(p0, p1, pp), d1 = cr(p1, p2, pp), d2 = cr(p2, p0, pp);
    return (d0 >= -1e-9 && d1 >= -1e-9 && d2 >= -1e-9) ||
           (d0 <= 1e-9 && d1 <= 1e-9 && d2 <= 1e-9);
  };

  // ¿hay material coplanario al OTRO lado de una arista huérfana?
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const d = new THREE.Vector3(), s = new THREE.Vector3(), probe = new THREE.Vector3();
  const isCrack = (e) => {
    const pg = planes.get(nkey(e.ns[0]));
    if (!pg) return false;
    A.set(...e.a); B.set(...e.b); C.set(...e.third);
    d.subVectors(B, A).normalize();
    s.crossVectors(e.ns[0], d);
    const side = Math.sign(s.dot(C.clone().sub(A))) || 1;
    let hits = 0;
    for (const f of [0.3, 0.5, 0.7]) {
      probe.lerpVectors(A, B, f).addScaledVector(s, -side * 0.05);
      if (pg.some((tri) => inTriangle(tri, probe))) hits++;
    }
    return hits >= 2;
  };

  const feature = [];
  for (const e of edges.values()) {
    if (e.ns.length >= 2) {
      let keep = false;
      for (let i = 0; i < e.ns.length && !keep; i++) {
        for (let j = i + 1; j < e.ns.length; j++) {
          if (e.ns[i].dot(e.ns[j]) < cosT) { keep = true; break; }
        }
      }
      if (keep) feature.push(e);
    } else if (!isCrack(e)) {
      feature.push(e);   // borde abierto o silueta genuina
    }
  }
  const pts = [];
  for (const e of feature) pts.push(e.a, e.b);
  return pts; // puntos de a pares (cada par = un segmento)
}

// Triángulos sombreados para la isométrica (ilustración técnica): proyecta la
// malla real con la base isométrica, sombrea por normal·luz (así se ven TODAS
// las caras aunque falte alguna arista), y ordena de atrás hacia adelante.
function isoShadedTris(parts) {
  const [r, u] = VIEWS.isometrica;
  const w = [r[1] * u[2] - r[2] * u[1], r[2] * u[0] - r[0] * u[2], r[0] * u[1] - r[1] * u[0]]; // eje de la vista
  const L = (() => { const l = [-0.3, -0.45, 0.84], n = Math.hypot(...l); return l.map(v => v / n); })();
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tris = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const part of parts) {
    const g = part.geometry, m = part.matrixWorld || new THREE.Matrix4();
    const pos = g.attributes.position; if (!pos) continue;
    for (let i = 0; i < pos.count; i += 3) {
      A.fromBufferAttribute(pos, i).applyMatrix4(m);
      B.fromBufferAttribute(pos, i + 1).applyMatrix4(m);
      C.fromBufferAttribute(pos, i + 2).applyMatrix4(m);
      const ux = B.x - A.x, uy = B.y - A.y, uz = B.z - A.z;
      const vx = C.x - A.x, vy = C.y - A.y, vz = C.z - A.z;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const face = [A, B, C];
      const p2 = face.map(P => [dot([P.x, P.y, P.z], r), dot([P.x, P.y, P.z], u)]);
      const depth = (dot([A.x, A.y, A.z], w) + dot([B.x, B.y, B.z], w) + dot([C.x, C.y, C.z], w)) / 3;
      const lit = Math.max(0, dot([nx, ny, nz], L));
      const gray = Math.min(0.94, 0.42 + 0.5 * lit); // ambiente + difusa
      tris.push({ p2, depth, gray });
    }
  }
  tris.sort((a, b) => a.depth - b.depth); // atrás → adelante (pintor)
  return tris;
}

function projectViews(pts) {
  const dot = (p, a) => p[0] * a[0] + p[1] * a[1] + p[2] * a[2];
  const views = {};
  for (const name of ORDER) {
    const [r, u] = VIEWS[name];
    const segs = [];
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const a = [dot(pts[i], r), dot(pts[i], u)];
      const b = [dot(pts[i + 1], r), dot(pts[i + 1], u)];
      segs.push([a, b]);
      for (const q of [a, b]) {
        lo = [Math.min(lo[0], q[0]), Math.min(lo[1], q[1])];
        hi = [Math.max(hi[0], q[0]), Math.max(hi[1], q[1])];
      }
    }
    views[name] = { segs, lo, hi, size: [hi[0] - lo[0], hi[1] - lo[1]] };
  }
  return views;
}

function layoutViews(views) {
  const sz = Object.fromEntries(ORDER.map(k => [k, views[k].size]));
  const pos = {};
  const yRow = sz.planta[1] + GAP;
  pos.alzado = [0, yRow];
  pos.planta = [(sz.alzado[0] - sz.planta[0]) / 2, 0];
  let x = Math.max(sz.alzado[0], pos.planta[0] + sz.planta[0]);
  for (const name of ['perfil', 'isometrica']) {
    x += GAP;
    pos[name] = [x, yRow];
    x += sz[name][0];
  }
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const k of Object.keys(pos)) {
    lo = [Math.min(lo[0], pos[k][0]), Math.min(lo[1], pos[k][1])];
    hi = [Math.max(hi[0], pos[k][0] + sz[k][0]), Math.max(hi[1], pos[k][1] + sz[k][1])];
  }
  for (const k of Object.keys(pos)) pos[k] = [pos[k][0] - lo[0], pos[k][1] - lo[1]];
  return { pos, tw: hi[0] - lo[0], th: hi[1] - lo[1] };
}

// --- lámina: lista de primitivas en coordenadas finales ----------------------
// prim: {k:'l',a,b,ly} línea · {k:'p',pts,ly} polilínea cerrada ·
//       {k:'c',c,r,ly} círculo · {k:'s',pts,ly} triángulo relleno (flechas) ·
//       {k:'t',s,x,y,h,ly,al:'L'|'C'|'ML'} texto

class Sheet {
  constructor(name, W, H, num, den, K) {
    this.name = name; this.W = W; this.H = H;
    this.num = num; this.den = den; this.K = K;
    this.prims = [];
  }
  _p(x, y) { return [x * this.K, y * this.K]; }
  line(a, b, ly, rgb) { this.prims.push({ k: 'l', a: this._p(...a), b: this._p(...b), ly, rgb }); }
  rect(x, y, w, h, ly) {
    this.prims.push({ k: 'p', pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(p => this._p(...p)), ly });
  }
  poly(pts, ly) { this.prims.push({ k: 'p', pts: pts.map(p => this._p(...p)), ly }); }
  circle(c, r, ly = 'TEXTO', rgb) { this.prims.push({ k: 'c', c: this._p(...c), r: r * this.K, ly, rgb }); }
  solid(pts, ly) { this.prims.push({ k: 's', pts: pts.map(p => this._p(...p)), ly }); }
  // polígono relleno con color (loops = [contorno, agujero, ...], regla par-impar)
  // — capa SOMBRA: queda DETRÁS de todo el alambre en el PDF; el DXF lo omite
  solidPoly(loops, rgb, ly = 'SOMBRA') {
    this.prims.push({ k: 'sp', loops: loops.map(lp => lp.map(p => this._p(...p))), rgb, ly });
  }
  shade(pts, g) { this.prims.push({ k: 'sh', pts: pts.map(p => this._p(...p)), g, ly: 'SOMBRA' }); }
  text(s, x, y, h = 3.5, al = 'L', ly = 'TEXTO', rgb) {
    const [px, py] = this._p(x, y);
    this.prims.push({ k: 't', s, x: px, y: py, h: h * this.K, al, ly, rgb });
  }
  segments(segs, ly, ox, oy, s) {
    for (const [a, b] of segs) {
      this.line([ox + a[0] * s, oy + a[1] * s], [ox + b[0] * s, oy + b[1] * s], ly);
    }
  }

  // cota lineal con flechas y valor en mm reales (ISO 129)
  dimH(x1, x2, y, d, value) {
    const yl = y - d, e = Math.sign(d) || 1;
    for (const x of [x1, x2]) this.line([x, y - e], [x, yl - e * 1.5], 'COTAS');
    this.line([x1, yl], [x2, yl], 'COTAS');
    this.solid([[x1, yl], [x1 + 2.5, yl + 0.45], [x1 + 2.5, yl - 0.45]], 'COTAS');
    this.solid([[x2, yl], [x2 - 2.5, yl + 0.45], [x2 - 2.5, yl - 0.45]], 'COTAS');
    this.text(fmtNum(value), (x1 + x2) / 2, yl + 2.2, 3.5, 'C', 'COTAS');
  }
  dimV(x, y1, y2, d, value) {
    const xl = x + d, e = Math.sign(d) || 1;
    for (const y of [y1, y2]) this.line([x + e, y], [xl + e * 1.5, y], 'COTAS');
    this.line([xl, y1], [xl, y2], 'COTAS');
    this.solid([[xl, y1], [xl + 0.45, y1 + 2.5], [xl - 0.45, y1 + 2.5]], 'COTAS');
    this.solid([[xl, y2], [xl + 0.45, y2 - 2.5], [xl - 0.45, y2 - 2.5]], 'COTAS');
    this.text(fmtNum(value), xl + 2.2, (y1 + y2) / 2, 3.5, 'C', 'COTAS');
  }

  // ── ACOTADO COMPLETO ─────────────────────────────────────────────────────
  // Hasta el 23-08 la lámina sólo sabía hacer cota horizontal y vertical, y por
  // eso un plano de chapa salía con tres cotas y mandaba al calderero a un CSV
  // («no quiero tener que diseñar yo en Inventor» — Sergio, 23-08). Aquí viven
  // las que faltaban: diámetro, radio, ordenada, angular, directriz, marca de
  // centro, marco de tolerancia geométrica (ISO 1101) y rugosidad (ISO 1302).

  // flecha llena apuntando A `pt` desde la dirección `ang` (rad)
  flecha(pt, ang, L = 2.5) {
    const w = 0.45;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    this.solid([pt,
      [pt[0] + ux * L - uy * w, pt[1] + uy * L + ux * w],
      [pt[0] + ux * L + uy * w, pt[1] + uy * L - ux * w]], 'COTAS');
  }

  // Directriz (leader): línea quebrada desde el elemento hasta un texto
  // horizontal. `lado` +1 el texto va a la derecha, -1 a la izquierda.
  directriz(pt, codo, texto, lado = 1, h = 3.5) {
    const fin = [codo[0] + lado * 7, codo[1]];
    this.line(pt, codo, 'COTAS');
    this.line(codo, fin, 'COTAS');
    this.flecha(pt, Math.atan2(codo[1] - pt[1], codo[0] - pt[0]));
    this.text(texto, fin[0] + lado * 1.2, fin[1] + 1.2, h, lado > 0 ? 'L' : 'R', 'COTAS');
  }

  // Cota de DIÁMETRO sobre un círculo: flecha al borde y texto «Ø…» afuera.
  // Es la cota que un taller espera ver en un barreno — no una nota al pie.
  dimDia(c, r, texto, angDeg = 45, fuera = 8) {
    const a = angDeg * Math.PI / 180;
    const pt = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    const codo = [c[0] + (r + fuera) * Math.cos(a), c[1] + (r + fuera) * Math.sin(a)];
    this.directriz(pt, codo, texto, Math.cos(a) >= 0 ? 1 : -1);
  }

  // Cota de RADIO: flecha desde el centro al arco, texto «R…».
  dimRad(c, r, texto, angDeg = 45, fuera = 6) {
    const a = angDeg * Math.PI / 180;
    const pt = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    const codo = [c[0] + (r + fuera) * Math.cos(a), c[1] + (r + fuera) * Math.sin(a)];
    this.line(c, pt, 'COTAS');
    this.flecha(pt, a + Math.PI);
    const lado = Math.cos(a) >= 0 ? 1 : -1;
    const fin = [codo[0] + lado * 6, codo[1]];
    this.line(pt, codo, 'COTAS');
    this.line(codo, fin, 'COTAS');
    this.text(texto, fin[0] + lado * 1.2, fin[1] + 1.2, 3.5, lado > 0 ? 'L' : 'R', 'COTAS');
  }

  // Marca de centro + ejes (ISO 128): la cruz corta y, si se pide, los ejes
  // largos que salen del contorno. Un barreno sin marca de centro no está
  // acotado, está dibujado.
  marcaCentro(c, r, largo = 0) {
    const m = Math.max(1.6, r * 0.35);
    this.line([c[0] - r - m, c[1]], [c[0] + r + m, c[1]], 'EJE');
    this.line([c[0], c[1] - r - m], [c[0], c[1] + r + m], 'EJE');
    if (largo > 0) {
      this.line([c[0] - largo, c[1]], [c[0] + largo, c[1]], 'EJE');
      this.line([c[0], c[1] - largo], [c[0], c[1] + largo], 'EJE');
    }
  }

  // ACOTADO POR ORDENADAS desde un origen declarado (ISO 129-1 §12): es LA
  // forma de acotar una chapa de corte láser con muchos barrenos — cada cota
  // sale del mismo cero, así no se acumula error ni se tapan las cotas entre sí.
  //   xs: [{v: valor real, x: coordenada de lámina}]  ·  y0: línea base
  ordenadasH(x0, items, yBase, alto = 10) {
    this.line([x0, yBase], [x0, yBase - alto * 0.55], 'COTAS');
    this.text('0', x0, yBase - alto * 0.55 - 3.4, 2.6, 'C', 'COTAS');
    // un valor repetido se escribe UNA vez: cuatro barrenos en la misma
    // coordenada son UNA cota, no cuatro (defecto visto en la muestra 23-08)
    const vistos = new Map();
    for (const o of items) {
      const k = Math.round(o.v * 100);
      if (!vistos.has(k)) vistos.set(k, o);
    }
    const filas = [];
    for (const o of [...vistos.values()].sort((a, b) => a.x - b.x)) {
      let n = 0;
      while (filas.some(f => Math.abs(f.x - o.x) < 7 && f.n === n)) n++;
      filas.push({ x: o.x, n });
      const yl = yBase - alto - n * 4.2;
      this.line([o.x, o.yFeat ?? yBase], [o.x, yl + 1.2], 'COTAS');
      this.text(fmtNum(o.v), o.x, yl - 2.4, 2.6, 'C', 'COTAS');
    }
  }
  ordenadasV(y0, items, xBase, ancho = 10) {
    this.line([xBase, y0], [xBase - ancho * 0.55, y0], 'COTAS');
    this.text('0', xBase - ancho * 0.55 - 1.2, y0 - 0.9, 2.6, 'R', 'COTAS');
    const vistos = new Map();
    for (const o of items) {
      const k = Math.round(o.v * 100);
      if (!vistos.has(k)) vistos.set(k, o);
    }
    const filas = [];
    for (const o of [...vistos.values()].sort((a, b) => a.y - b.y)) {
      let n = 0;
      while (filas.some(f => Math.abs(f.y - o.y) < 4.5 && f.n === n)) n++;
      filas.push({ y: o.y, n });
      const xl = xBase - ancho - n * 9;
      this.line([o.xFeat ?? xBase, o.y], [xl + 1.2, o.y], 'COTAS');
      this.text(fmtNum(o.v), xl - 1.2, o.y - 0.9, 2.6, 'R', 'COTAS');
    }
  }

  // Cota ANGULAR entre dos radios (para el vano de un arco de regulación).
  dimAng(c, r, a0Deg, a1Deg, texto) {
    const a0 = a0Deg * Math.PI / 180, a1 = a1Deg * Math.PI / 180;
    const N = Math.max(6, Math.ceil(Math.abs(a1 - a0) * 12));
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const a = a0 + (a1 - a0) * i / N;
      pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
    }
    for (let i = 1; i < pts.length; i++) this.line(pts[i - 1], pts[i], 'COTAS');
    this.flecha(pts[0], a0 + (a1 > a0 ? Math.PI / 2 : -Math.PI / 2));
    this.flecha(pts[N], a1 + (a1 > a0 ? -Math.PI / 2 : Math.PI / 2));
    const am = (a0 + a1) / 2;
    this.text(texto, c[0] + (r + 3) * Math.cos(am), c[1] + (r + 3) * Math.sin(am) - 1.2, 3.0, 'C', 'COTAS');
  }

  // Símbolo de tolerancia geométrica dibujado como VECTOR, no como carácter:
  // la fuente del PDF no tiene esos glifos y un cuadrito vacío en un plano es
  // peor que no ponerlo.
  simGDT(x, y, h, tipo) {
    const c = [x + h / 2, y + h / 2], r = h * 0.36;
    const L = (a, b) => this.line(a, b, 'COTAS');
    if (tipo === 'concentricidad') { this.circle(c, r, 'COTAS'); this.circle(c, r * 0.5, 'COTAS'); }
    else if (tipo === 'posicion') { this.circle(c, r, 'COTAS'); L([c[0] - r * 1.5, c[1]], [c[0] + r * 1.5, c[1]]); L([c[0], c[1] - r * 1.5], [c[0], c[1] + r * 1.5]); }
    else if (tipo === 'perpendicularidad') { L([c[0] - r, c[1] - r], [c[0] + r, c[1] - r]); L([c[0], c[1] - r], [c[0], c[1] + r]); }
    else if (tipo === 'paralelismo') { L([c[0] - r, c[1] - r], [c[0], c[1] + r]); L([c[0] + r * 0.2, c[1] - r], [c[0] + r * 1.2, c[1] + r]); }
    else if (tipo === 'planitud') { this.poly([[c[0] - r, c[1] - r * 0.6], [c[0] + r * 0.4, c[1] - r * 0.6], [c[0] + r, c[1] + r * 0.6], [c[0] - r * 0.4, c[1] + r * 0.6]], 'COTAS'); }
    else if (tipo === 'cilindricidad') { this.circle(c, r * 0.7, 'COTAS'); L([c[0] - r * 1.25, c[1] - r], [c[0] - r * 0.55, c[1] + r]); L([c[0] + r * 0.55, c[1] - r], [c[0] + r * 1.25, c[1] + r]); }
    else if (tipo === 'salto') { L([c[0] - r * 0.8, c[1] - r], [c[0] + r * 0.6, c[1] + r]); this.flecha([c[0] + r * 0.6, c[1] + r], Math.atan2(r * 2, r * 1.4) + Math.PI, 1.6); }
    else this.circle(c, r, 'COTAS');
  }

  // Marco de control (ISO 1101): [símbolo | tolerancia | datum…]
  marcoGDT(x, y, tipo, tol, datums = [], h = 6) {
    const anchos = [h, Math.max(12, textWidth(tol, 3.0) + 4), ...datums.map(() => h)];
    let cx = x;
    this.rect(x, y, anchos.reduce((a, b) => a + b, 0), h, 'COTAS');
    this.simGDT(cx, y, h, tipo); cx += anchos[0];
    this.line([cx, y], [cx, y + h], 'COTAS');
    this.text(tol, cx + anchos[1] / 2, y + h / 2 - 1.1, 3.0, 'C', 'COTAS');
    cx += anchos[1];
    for (let i = 0; i < datums.length; i++) {
      this.line([cx, y], [cx, y + h], 'COTAS');
      this.text(datums[i], cx + h / 2, y + h / 2 - 1.1, 3.0, 'C', 'COTAS');
      cx += h;
    }
    return anchos.reduce((a, b) => a + b, 0);
  }

  // Referencia de datum: triángulo lleno + cuadro con la letra.
  datum(pt, letra, dx = 0, dy = -10) {
    const sg = dy >= 0 ? 1 : -1;
    const ap = [pt[0], pt[1] + sg * 3.2];                 // base del triángulo
    this.solid([pt, [pt[0] - 1.7, ap[1]], [pt[0] + 1.7, ap[1]]], 'COTAS');
    const cen = [pt[0] + dx, pt[1] + dy];                  // centro del cuadro
    this.line(ap, [cen[0], cen[1] - sg * 3], 'COTAS');
    this.rect(cen[0] - 3, cen[1] - 3, 6, 6, 'COTAS');
    this.text(letra, cen[0], cen[1] - 1.1, 3.0, 'C', 'COTAS');
  }

  // Rugosidad ISO 1302: el «visto» con la barra superior y el valor.
  rugosidad(pt, valor, lado = 1) {
    const h = 4.5, x = pt[0], y = pt[1];
    this.line([x, y], [x + lado * h * 0.5, y + h], 'COTAS');
    this.line([x, y], [x - lado * h * 0.28, y + h * 0.55], 'COTAS');
    this.line([x + lado * h * 0.5, y + h], [x + lado * h * 1.6, y + h], 'COTAS');
    this.text(valor, x + lado * h * 0.62, y + h + 1.0, 2.6, lado > 0 ? 'L' : 'R', 'COTAS');
  }

  // TABLA DE BARRENOS: la forma normalizada de acotar una chapa con muchos
  // agujeros iguales. Cada fila es una MARCA (A, B, C…) que se repite en el
  // dibujo, con su Ø, su cantidad y sus coordenadas desde el cero declarado.
  tablaBarrenos(x, y, filas, cols = ['MARCA', 'Ø', 'CANT', 'X', 'Y'], anchos = [14, 14, 14, 18, 18]) {
    const h = 5.2, W = anchos.reduce((a, b) => a + b, 0);
    let cy = y;
    this.rect(x, cy, W, h, 'COTAS');
    let cx = x;
    for (let i = 0; i < cols.length; i++) {
      if (i) this.line([cx, cy], [cx, cy + h], 'COTAS');
      this.text(cols[i], cx + anchos[i] / 2, cy + h / 2 - 1.0, 2.4, 'C');
      cx += anchos[i];
    }
    for (const f of filas) {
      cy -= h;
      this.rect(x, cy, W, h, 'COTAS');
      cx = x;
      for (let i = 0; i < cols.length; i++) {
        if (i) this.line([cx, cy], [cx, cy + h], 'COTAS');
        this.text(String(f[i] ?? ''), cx + anchos[i] / 2, cy + h / 2 - 1.0, 2.4, 'C');
        cx += anchos[i];
      }
    }
    return { w: W, h: (filas.length + 1) * h };
  }

  // casilla ISO 7200: rótulo pequeño + valor; encoge la letra antes de truncar
  cell(x, y, w, h, label, value, vh = 2.6, al = 'ML') {
    this.text(label, x + 1.3, y + h - 2.4, 1.4, 'L');
    let s = String(value ?? '—');
    const avail = w - 3.2;
    if (textWidth(s, vh) > avail) vh = Math.max(2.0, vh * avail / textWidth(s, vh));
    while (s.length > 3 && textWidth(s, vh) > avail) s = s.slice(0, -2) + '…';
    const yc = y + (h - 2.8) / 2;
    if (al === 'C') this.text(s, x + w / 2, yc, vh, 'C');
    else this.text(s, x + 1.6, yc, vh, 'ML');
  }

  // símbolo del primer diedro (ISO 5456-2): círculos a la izquierda, tronco
  // de cono con el lado estrecho alejado de ellos
  projectionSymbol(cx, cy, s = 1.0) {
    const r1 = 2.6 * s, r2 = 1.4 * s, L = 6.2 * s, gap = 1.8 * s;
    const cxc = cx - (2 * r1 + gap + L) / 2 + r1;
    const tx = cxc + r1 + gap;
    this.circle([cxc, cy], r1);
    this.circle([cxc, cy], r2);
    this.poly([[tx, cy - r1], [tx + L, cy - r2], [tx + L, cy + r2], [tx, cy + r1]], 'TEXTO');
    this.line([cxc - r1 - 1.2 * s, cy], [tx + L + 1.2 * s, cy], 'FINA');
  }

  frame() {
    const { W, H } = this;
    this.rect(0, 0, W, H, 'FINA');
    this.rect(MARGIN_L, MARGIN, W - MARGIN_L - MARGIN, H - 2 * MARGIN, 'NORMA');
    for (const [a, b] of [[[0, H / 2], [MARGIN_L + 5, H / 2]], [[W, H / 2], [W - MARGIN - 5, H / 2]],
                          [[W / 2, 0], [W / 2, MARGIN + 5]], [[W / 2, H], [W / 2, H - MARGIN - 5]]]) {
      this.line(a, b, 'NORMA');
    }
    const [nx, ny] = GRIDREF[this.name];
    for (let i = 1; i < nx; i++) {
      const x = W / nx * i;
      this.line([x, 0], [x, MARGIN], 'FINA');
      this.line([x, H - MARGIN], [x, H], 'FINA');
    }
    for (let j = 1; j < ny; j++) {
      const y = H / ny * j;
      this.line([0, y], [MARGIN, y], 'FINA');
      this.line([W - MARGIN, y], [W, y], 'FINA');
    }
    for (let i = 0; i < nx; i++) {
      const x = W / nx * (i + 0.5);
      for (const y of [MARGIN / 2, H - MARGIN / 2]) this.text(String(i + 1), x, y, 2.5, 'C');
    }
    for (let j = 0; j < ny; j++) {
      const y = H - H / ny * (j + 0.5);
      for (const x of [MARGIN / 2, W - MARGIN / 2]) this.text(GRID_LETTERS[j], x, y, 2.5, 'C');
    }
  }

  titleBlock(tb) {
    const x0 = this.W - MARGIN - TITLE_W, y0 = MARGIN;
    this.rect(x0, y0, TITLE_W, TITLE_H, 'NORMA');
    const ys = [y0 + TITLE_H];
    for (const rh of [13, 10, 10, 9]) ys.push(ys[ys.length - 1] - rh);
    const xa = x0 + 40, xb = x0 + 134;
    this.line([xa, y0], [xa, y0 + TITLE_H], 'NORMA');
    this.line([xb, y0], [xb, y0 + TITLE_H], 'NORMA');

    // zona A — marca + símbolo de proyección. MARCA = ConveyOne en todo lo
    // tabulado (instrucción permanente de Sergio 12-08 — foto3d es el método,
    // no la marca del entregable)
    const cxa = x0 + 20;
    this.line([x0, ys[2]], [xa, ys[2]], 'FINA');
    this.text('ConveyOne', cxa, ys[0] - 8.6, 4.9, 'C');
    this.line([cxa - 13.5, ys[0] - 13.4], [cxa + 13.5, ys[0] - 13.4], 'FINA');
    this.text('CAD · DISEÑO CAPA USER', cxa, ys[0] - 16.2, 1.3, 'C');
    this.text('ISO 5457 · 7200 · 129 · 5456-2', cxa, ys[0] - 19.4, 1.3, 'C');
    this.text('PROYECCIÓN — PRIMER DIEDRO', cxa, ys[2] - 2.4, 1.4, 'C');
    this.projectionSymbol(cxa, y0 + (ys[2] - y0 - 4.0) / 2, 1.15);

    // zona B — identificación
    for (const y of [ys[1], ys[2], ys[3]]) this.line([xa, y], [xb, y], 'FINA');
    this.line([xa + 47, ys[2]], [xa + 47, ys[1]], 'FINA');
    this.line([xa + 56, ys[3]], [xa + 56, ys[2]], 'FINA');
    this.cell(xa, ys[1], 94, 13, 'DESIGNACIÓN', tb.designacion, 4.2);
    this.cell(xa, ys[2], 47, 10, 'PROYECTO', tb.proyecto, 2.8);
    this.cell(xa + 47, ys[2], 47, 10, 'FUENTE', tb.fuente, 2.4);
    this.cell(xa, ys[3], 56, 10, 'VERIFICACIÓN DE ESCALA', tb.verificacion, 2.4);
    this.cell(xa + 56, ys[3], 38, 10, tb.piezasLabel ?? 'PIEZAS', tb.piezas, 2.6);
    this.cell(xa, y0, 94, 9, 'NOTA', tb.nota, 2.2);

    // zona C — clasificación
    for (const y of [ys[1], ys[2], ys[3]]) this.line([xb, y], [x0 + TITLE_W, y], 'FINA');
    this.line([xb + 23, ys[2]], [xb + 23, ys[1]], 'FINA');
    this.line([xb + 26, ys[3]], [xb + 26, ys[2]], 'FINA');
    this.cell(xb, ys[1], 46, 13, 'ESCALA', tb.escala, 5.0, 'C');
    this.cell(xb, ys[2], 15, 10, 'FORMATO', this.name, 2.6, 'C');
    this.cell(xb + 15, ys[2], 15, 10, 'LÁMINA', tb.lamina ?? '1 / 1', 2.4, 'C');
    // REV en ROJO — la revisión vigente se ve de un vistazo (pendiente del
    // quinto ciclo, cerrado en la ronda «subir la vara» 18-08)
    this.line([xb + 30, ys[2]], [xb + 30, ys[1]], 'FINA');
    this.cell(xb + 30, ys[2], 16, 10, 'REV', tb.rev ?? '—', 4.6, 'C');
    if (tb.rev) this.prims[this.prims.length - 1].rgb = [0.72, 0.10, 0.10];
    this.cell(xb, ys[3], 26, 10, 'FECHA', tb.fecha, 2.6, 'C');
    this.cell(xb + 26, ys[3], 20, 10, 'UNIDADES', 'mm', 3.0, 'C');
    this.cell(xb, y0, 46, 9, 'Nº DE PLANO', tb.numPlano, 2.6, 'C');
    // responsables (ISO 7200): dibujó la célula, revisó el panel, aprueba
    // SERGIO — la firma es suya y el campo queda pendiente hasta que firme
    const yr = y0 + TITLE_H + 4.5;
    this.text(`DIBUJÓ: Célula de Diseño ConveyOne · REVISÓ: panel adversarial · APROBÓ: S. Contreras — PENDIENTE DE FIRMA${tb.rev ? ` · REV ${tb.rev}: ${tb.revCausa ?? 'ver panel'}` : ''}`,
      x0, yr, 2.0, 'L');
  }
}

function drawViews(sheet, views, layout, shadeTris) {
  const s = sheet.num / sheet.den;
  const uw = sheet.W - MARGIN_L - MARGIN, uh = sheet.H - 2 * MARGIN - TITLE_H - 5;
  const ox = MARGIN_L + (uw - layout.tw * s) / 2;
  const oy = MARGIN + TITLE_H + 5 + (uh - layout.th * s) / 2;
  for (const name of ORDER) {
    const v = views[name];
    const vx = ox + layout.pos[name][0] * s - v.lo[0] * s;
    const vy = oy + layout.pos[name][1] * s - v.lo[1] * s;
    // ilustración técnica: la isométrica se pinta sombreada (además del alambre)
    if (name === 'isometrica' && shadeTris) {
      for (const t of shadeTris) sheet.shade(t.p2.map(p => [vx + p[0] * s, vy + p[1] * s]), t.gray);
    }
    sheet.segments(v.segs, 'VISIBLE', vx, vy, s);
    const cx = vx + (v.lo[0] + v.size[0] / 2) * s;
    sheet.text(LABELS[name], cx, vy + v.hi[1] * s + 4, 3.5, 'C');
    const x1 = vx + v.lo[0] * s, y1 = vy + v.lo[1] * s;
    const x2 = vx + v.hi[0] * s, y2 = vy + v.hi[1] * s;
    if (name === 'alzado') {
      sheet.dimH(x1, x2, y1, 9, v.size[0]);
      sheet.dimV(x2, y1, y2, 9, v.size[1]);
    } else if (name === 'planta') {
      sheet.dimV(x2, y1, y2, 9, v.size[1]);
    }
  }
}

function buildSheet(parts, K, meta) {
  const pts = collectEdgeSegments(parts, meta.angleDeg ?? 25);
  if (!pts.length) throw new Error('no hay geometría para exportar');
  const views = projectViews(pts);
  const layout = layoutViews(views);
  const [name, W, H, num, den] = chooseSheet(layout.tw, layout.th);
  const sheet = new Sheet(name, W, H, num, den, K === 'real' ? den / num : 1);
  const shadeTris = isoShadedTris(parts);
  drawViews(sheet, views, layout, shadeTris);
  if (meta.espesor) {   // pieza de chapa: la cota de espesor se indica SIEMPRE
    sheet.text(`ESPESOR DE CHAPA e = ${meta.espesor} mm`,
      MARGIN_L + 5, MARGIN + TITLE_H + 9, 4.0, 'L');
  }
  sheet.frame();
  sheet.titleBlock({
    designacion: meta.designacion,
    proyecto: meta.proyecto ?? 'ConveyOne CAD',
    fuente: meta.fuente ?? 'diseño en navegador — capa user',
    verificacion: meta.verificacion ?? 'CAD EN MM (CAPA USER)',
    piezas: String(meta.piezas),
    nota: meta.nota ?? 'Aristas características sin líneas ocultas — diseño CAD, no medición',
    escala: scaleLabel(num, den),
    fecha: meta.fecha ?? new Date().toISOString().slice(0, 10),
    numPlano: meta.numPlano ?? 'CAD-01',
  });
  return sheet;
}

// --- escritor DXF (R12, cp1252) ----------------------------------------------

function writeDXF(sheet) {
  const L = [];
  const g = (c, v) => L.push(String(c), String(v));
  g(0, 'SECTION'); g(2, 'HEADER');
  g(9, '$ACADVER'); g(1, 'AC1009');
  g(9, '$DWGCODEPAGE'); g(3, 'ANSI_1252');
  g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES');
  g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 3);
  g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0);
  g(0, 'LTYPE'); g(2, 'DASHED'); g(70, 0); g(3, 'Segmentada __ __ __'); g(72, 65);
  g(73, 2); g(40, 6); g(49, 4); g(49, -2);
  g(0, 'LTYPE'); g(2, 'CENTER'); g(70, 0); g(3, 'Centro ____ _ ____'); g(72, 65);
  g(73, 4); g(40, 11); g(49, 7); g(49, -1.2); g(49, 1.2); g(49, -1.2);
  g(0, 'ENDTAB');
  g(0, 'TABLE'); g(2, 'LAYER'); g(70, Object.keys(LAYERS).length);
  for (const [name, color] of Object.entries(LAYERS)) {
    g(0, 'LAYER'); g(2, name); g(70, 0); g(62, color);
    g(6, name === 'EJE' ? 'CENTER' : (name === 'PLIEGUE' || name === 'OCULTA') ? 'DASHED' : 'CONTINUOUS');
  }
  g(0, 'ENDTAB'); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  const f = (v) => v.toFixed(4);
  for (const p of sheet.prims) {
    if (p.k === 'l') {
      g(0, 'LINE'); g(8, p.ly);
      g(10, f(p.a[0])); g(20, f(p.a[1])); g(30, 0);
      g(11, f(p.b[0])); g(21, f(p.b[1])); g(31, 0);
    } else if (p.k === 'p') {
      for (let i = 0; i < p.pts.length; i++) {
        const a = p.pts[i], b = p.pts[(i + 1) % p.pts.length];
        // un contorno que ya viene cerrado repetiría el cierre como LINE de
        // largo cero (hallazgo del panel: una por lámina en la capa de corte)
        if (a[0] === b[0] && a[1] === b[1]) continue;
        g(0, 'LINE'); g(8, p.ly);
        g(10, f(a[0])); g(20, f(a[1])); g(30, 0);
        g(11, f(b[0])); g(21, f(b[1])); g(31, 0);
      }
    } else if (p.k === 'c') {
      g(0, 'CIRCLE'); g(8, p.ly); g(10, f(p.c[0])); g(20, f(p.c[1])); g(30, 0); g(40, f(p.r));
    } else if (p.k === 's' || p.k === 'sh') {
      const [a, b, c] = p.pts;
      g(0, 'SOLID'); g(8, p.ly);
      if (p.k === 'sh') g(62, 250 + Math.max(0, Math.min(5, Math.round(p.g * 5)))); // gris ACI 250–255
      g(10, f(a[0])); g(20, f(a[1])); g(30, 0);
      g(11, f(b[0])); g(21, f(b[1])); g(31, 0);
      g(12, f(c[0])); g(22, f(c[1])); g(32, 0);
      g(13, f(c[0])); g(23, f(c[1])); g(33, 0);
    } else if (p.k === 't') {
      g(0, 'TEXT'); g(8, p.ly);
      g(10, f(p.x)); g(20, f(p.y)); g(30, 0);
      g(40, f(p.h)); g(1, p.s);
      if (p.al === 'C') { g(72, 1); g(73, 2); g(11, f(p.x)); g(21, f(p.y)); g(31, 0); }
      else if (p.al === 'ML') { g(72, 0); g(73, 2); g(11, f(p.x)); g(21, f(p.y)); g(31, 0); }
    }
  }
  g(0, 'ENDSEC'); g(0, 'EOF');
  return L.join('\r\n') + '\r\n';
}

// --- escritor PDF (1.4, Helvetica WinAnsi) -----------------------------------

const WINANSI = { '—': 0x97, '–': 0x96, '…': 0x85, '“': 0x93, '”': 0x94, '‘': 0x91, '’': 0x92 };

function pdfEscape(s) {
  // glifos fuera de WinAnsi que aparecían como '?' en los PDF (panel):
  s = String(s).replace(/−/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=')
    .replace(/→/g, '->').replace(/←/g, '<-').replace(/↔/g, '<->')
    .replace(/✓/g, 'OK').replace(/✗/g, 'X');
  let out = '';
  for (const ch of s) {
    let code = WINANSI[ch] ?? ch.codePointAt(0);
    if (code > 255) code = 63; // '?' — fuera de WinAnsi
    const c = String.fromCharCode(code);
    out += c === '(' || c === ')' || c === '\\' ? '\\' + c : c;
  }
  return out;
}

// ── alambre: de segmentos sueltos a POLILÍNEAS ──────────────────────────────
// El isométrico de una geometría de fábrica (723 mil triángulos en el CV-BLT)
// deja decenas de miles de tramos visibles: 74 % miden menos de 1 pt, el 20 %
// son el MISMO borde emitido dos veces (lo comparten dos parches) y el 80 % de
// los extremos los comparte otro tramo. Emitirlos uno a uno cuesta ` m ` y ` S`
// por tramo y no comprime (las coordenadas son entropía pura).
//
// Aquí se hacen tres cosas, todas SIN cambiar un píxel:
//   1. se descarta el duplicado exacto (pintar dos veces la misma línea del
//      mismo color se ve igual que pintarla una),
//   2. se encadenan los tramos que comparten extremo en una sola polilínea
//      (con tapa y unión REDONDAS —`1 J 1 j`— el empalme es indistinguible),
//   3. se funden los tramos COLINEALES (desviación < 0,02 pt = 7 µm).
//
// Sólo en capas SIN guion: en una capa punteada la polilínea arrastraría la
// fase del guion de tramo en tramo y el dibujo cambiaría de verdad.
function polilineas(segs, f) {
  const q = (v) => Math.round(v * 100);                 // rejilla = precisión de salida
  const kp = (x, y) => `${q(x)},${q(y)}`;
  const pt = new Map();                                 // clave → [x,y]
  const ady = new Map();                                // clave → [{a,b,i}]
  const vistos = new Set();
  const E = [];
  for (const s of segs) {
    const ka = kp(s.a[0], s.a[1]), kb = kp(s.b[0], s.b[1]);
    if (ka === kb) continue;                            // tramo nulo
    const ke = ka < kb ? ka + '|' + kb : kb + '|' + ka;
    if (vistos.has(ke)) continue;                       // (1) duplicado exacto
    vistos.add(ke);
    pt.set(ka, s.a); pt.set(kb, s.b);
    const i = E.length; E.push({ ka, kb, usado: false });
    if (!ady.has(ka)) ady.set(ka, []); ady.get(ka).push(i);
    if (!ady.has(kb)) ady.set(kb, []); ady.get(kb).push(i);
  }
  const otro = (i, k) => (E[i].ka === k ? E[i].kb : E[i].ka);
  const sigue = (k, desde) => {                         // vecino no usado
    for (const i of (ady.get(k) || [])) if (!E[i].usado && i !== desde) return i;
    return -1;
  };
  const cadenas = [];
  for (let i0 = 0; i0 < E.length; i0++) {
    if (E[i0].usado) continue;
    E[i0].usado = true;
    const cad = [E[i0].ka, E[i0].kb];
    for (let k = cad[cad.length - 1], j; (j = sigue(k, -1)) >= 0; ) {   // hacia adelante
      E[j].usado = true; k = otro(j, k); cad.push(k);
    }
    for (let k = cad[0], j; (j = sigue(k, -1)) >= 0; ) {                // hacia atrás
      E[j].usado = true; k = otro(j, k); cad.unshift(k);
    }
    cadenas.push(cad.map(k => pt.get(k)));
  }
  const ops = [];
  for (const cad of cadenas) {
    const v = [cad[0]];
    for (let i = 1; i < cad.length - 1; i++) {          // (3) fusión de colineales
      const a = v[v.length - 1], b = cad[i], c = cad[i + 1];
      const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - a[0], vy = c[1] - a[1];
      const cruz = Math.abs(ux * vy - uy * vx), len = Math.hypot(vx, vy);
      if (!(len > 0 && cruz / len < 0.02)) v.push(b);   // desviación < 0,02 pt
    }
    v.push(cad[cad.length - 1]);
    ops.push(v.map((p, i) => `${f(p[0])} ${f(p[1])} ${i ? 'l' : 'm'}`).join(' ') + ' S');
  }
  return ops;
}

// stream de contenido (operadores PDF) de una sola lámina, en puntos
//
// ESTADO GRÁFICO PERSISTENTE (23-08): antes cada primitiva re-emitía su color,
// su ancho de línea y el reset `0 g 0 G`. En un isométrico pintado eso son ~45
// bytes de estado por TRIÁNGULO, repetidos miles de veces con el mismo valor.
// Ahora cada rama DECLARA el estado que usa (setFill/setStroke/setW/setDash) y
// el operador sólo se escribe cuando CAMBIA. La imagen impresa es la misma —
// se emite el mismo path con el mismo color; lo que desaparece es la
// repetición. Los números salen sin ceros de cola (0.01 pt = 3.5 µm: dos
// órdenes bajo la resolución de cualquier filmadora).
function sheetContent(sheet, k) {
  const f = (v) => {
    const s = v.toFixed(2);
    if (s.endsWith('.00')) return s.slice(0, -3);
    return s.endsWith('0') ? s.slice(0, -1) : s;
  };
  const ops = ['1 J 1 j'];
  let sFill = null, sStroke = null, sW = null, sDash = null;
  const setFill = (c) => { if (c !== sFill) { ops.push(`${c} rg`); sFill = c; } };
  const setStroke = (c) => { if (c !== sStroke) { ops.push(`${c} RG`); sStroke = c; } };
  const setW = (x) => { if (x !== sW) { ops.push(`${x} w`); sW = x; } };
  const setDash = (d) => { if (d !== sDash) { ops.push(d); sDash = d; } };
  const byLayer = {};
  for (const p of sheet.prims) (byLayer[p.ly] ??= []).push(p);
  // SOMBRA primero (queda por detrás del alambre); el resto en su orden natural
  const layerOrder = ['SOMBRA', ...Object.keys(byLayer).filter(l => l !== 'SOMBRA')];
  for (const ly of layerOrder) {
    const prims = byLayer[ly]; if (!prims) continue;
    const dash = DASH[ly] ? `[${DASH[ly].map(v => f(v * k)).join(' ')}] 0 d` : '[] 0 d';
    // lámina de fabricación: geometría a línea fina SIN espesor (hairline)
    const w = sheet.hairline && GEOM_LAYERS.has(ly) ? '0' : f((LW[ly] ?? 0.25) * k);
    const lyRGB = RGB[ly];
    const lyCol = lyRGB ? lyRGB.map(f).join(' ') : '0 0 0';
    setDash(dash);
    for (let ip = 0; ip < prims.length; ip++) {
      const p = prims[ip];
      // ALAMBRE: tirada contigua de tramos del MISMO color → polilíneas. Se
      // respeta el orden (sólo se funde lo que ya iba seguido) y se excluyen
      // las capas con guion, donde la fase del punteado sí cambiaría.
      if (p.k === 'l' && !DASH[ly]) {
        const col = p.rgb ? p.rgb.map(f).join(' ') : lyCol;
        const run = [];
        let j = ip;
        while (j < prims.length && prims[j].k === 'l' &&
               (prims[j].rgb ? prims[j].rgb.map(f).join(' ') : lyCol) === col) {
          const q = prims[j];
          run.push({ a: [q.a[0] * k, q.a[1] * k], b: [q.b[0] * k, q.b[1] * k] });
          j++;
        }
        setW(w); setStroke(col);
        for (const op of polilineas(run, f)) ops.push(op);
        ip = j - 1;
        continue;
      }
      if (p.k === 'sh') { // triángulo sombreado (relleno gris, sin borde)
        setFill(`${f(p.g)} ${f(p.g)} ${f(p.g)}`);
        ops.push(p.pts.map((q, i) => `${f(q[0] * k)} ${f(q[1] * k)} ${i ? 'l' : 'm'}`).join(' ') + ' h f');
      } else if (p.k === 'sp') { // polígono con color y agujeros (par-impar)
        const sub = p.loops.map(lp =>
          lp.map((q, i) => `${f(q[0] * k)} ${f(q[1] * k)} ${i ? 'l' : 'm'}`).join(' ') + ' h').join(' ');
        const col = p.rgb.map(v => f(v)).join(' ');
        // borde del MISMO color: sella las costuras blancas entre triángulos
        // adyacentes del pintor (el rasterizador deja huecos de sub-píxel)
        setFill(col); setStroke(col); setW(f(0.28 * k));
        ops.push(`${sub} B*`);
      } else if (p.k === 'l') {                  // capa con guion: tramo a tramo
        setW(w); setStroke(p.rgb ? p.rgb.map(f).join(' ') : lyCol);
        ops.push(`${f(p.a[0] * k)} ${f(p.a[1] * k)} m ${f(p.b[0] * k)} ${f(p.b[1] * k)} l S`);
      } else if (p.k === 'p' || p.k === 's') {
        setW(w); setStroke(lyCol); setFill(lyCol);
        ops.push(p.pts.map((q, i) => `${f(q[0] * k)} ${f(q[1] * k)} ${i ? 'l' : 'm'}`).join(' ') +
          ` h ${p.k === 's' ? 'f' : 'S'}`);
      } else if (p.k === 'c') {
        const [cx, cy] = [p.c[0] * k, p.c[1] * k], r = p.r * k, m = r * 0.55228;
        setW(w); setStroke(p.rgb ? p.rgb.map(f).join(' ') : lyCol);
        ops.push(`${f(cx + r)} ${f(cy)} m ` +
          `${f(cx + r)} ${f(cy + m)} ${f(cx + m)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c ` +
          `${f(cx - m)} ${f(cy + r)} ${f(cx - r)} ${f(cy + m)} ${f(cx - r)} ${f(cy)} c ` +
          `${f(cx - r)} ${f(cy - m)} ${f(cx - m)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c ` +
          `${f(cx + m)} ${f(cy - r)} ${f(cx + r)} ${f(cy - m)} ${f(cx + r)} ${f(cy)} c S`);
      } else if (p.k === 't') {
        let x = p.x, y = p.y;
        if (p.al === 'C') { x -= textWidth(p.s, p.h) / 2; y -= 0.36 * p.h; }
        else if (p.al === 'ML') { y -= 0.36 * p.h; }
        setFill(p.rgb ? p.rgb.map(f).join(' ') : lyCol);
        ops.push(`BT /F1 ${f(p.h * k)} Tf ${f(x * k)} ${f(y * k)} Td (${pdfEscape(p.s)}) Tj ET`);
      }
    }
  }
  return ops.join('\n');
}

// compresión de streams (sólo Node; en navegador queda sin comprimir)
let _deflate = null;
try {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const z = await import('node:zlib');
    _deflate = z.deflateSync;
  }
} catch { /* navegador */ }

// stream de contenido como objeto PDF (comprimido si hay zlib)
function streamObj(content) {
  if (_deflate && typeof Buffer !== 'undefined') {
    const raw = _deflate(Buffer.from(content, 'latin1'));
    return Buffer.concat([
      Buffer.from(`<< /Length ${raw.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'),
      raw, Buffer.from('\nendstream', 'latin1'),
    ]);
  }
  return `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
}

// serializa objetos PDF con tabla xref (helper común mono/multipágina).
// En Node arma BUFFERS con offsets en BYTES — medir el xref en caracteres
// con WinAnsi >127 producía offsets corridos que los visores reparaban en
// silencio (PDF malformado). En navegador conserva el camino string.
function assemblePDF(objs) {
  if (typeof Buffer !== 'undefined') {
    const toB = (o) => Buffer.isBuffer(o) ? o : Buffer.from(o, 'latin1');
    const parts = [Buffer.from('%PDF-1.4\n', 'latin1')];
    let pos = parts[0].length;
    const offsets = [];
    objs.forEach((body, i) => {
      const head = Buffer.from(`${i + 1} 0 obj\n`, 'latin1');
      const b = toB(body), tail = Buffer.from('\nendobj\n', 'latin1');
      offsets.push(pos);
      parts.push(head, b, tail);
      pos += head.length + b.length + tail.length;
    });
    const xref = pos;
    parts.push(Buffer.from(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
      offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
      `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`, 'latin1'));
    return Buffer.concat(parts);
  }
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
    offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

function writePDF(sheet) {
  const k = 72 / 25.4;
  const f = (v) => v.toFixed(2);
  const content = sheetContent(sheet, k);
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(sheet.W * k)} ${f(sheet.H * k)}] ` +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    streamObj(content),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  return assemblePDF(objs);
}

// PDF de VARIAS láminas (una página por Sheet): fuente compartida al final.
function writePDFMulti(sheets) {
  const k = 72 / 25.4;
  const f = (v) => v.toFixed(2);
  const n = sheets.length;
  const fontObj = 3 + 2 * n;                 // 1=Catalog, 2=Pages, luego 2 objs/página
  const kids = sheets.map((_, i) => `${3 + 2 * i} 0 R`).join(' ');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`,
  ];
  sheets.forEach((sheet, i) => {
    const content = sheetContent(sheet, k);
    const contentObj = 4 + 2 * i;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(sheet.W * k)} ${f(sheet.H * k)}] ` +
      `/Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    objs.push(streamObj(content));
  });
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  return assemblePDF(objs);
}

const toBytes = (s) => {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(s)) return s;  // ya binario
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
};

// codifica textos a cp1252 antes de volcar el DXF a bytes
function dxfToBytes(s) {
  let out = '';
  for (const ch of s) {
    const code = WINANSI[ch] ?? ch.codePointAt(0);
    out += String.fromCharCode(code > 255 ? 63 : code);
  }
  return toBytes(out);
}

// --- lámina de DESARROLLO DE CHAPA ---------------------------------------------
// flat: salida de sheetmetal.flatPattern(); meta: { designacion, piezas }

export { GRUPO_RGB };

// ¿Es este contorno una ranura en ARCO? Una banda en arco son DOS arcos
// concéntricos y DOS tapas. Ajustar un círculo a TODOS los vértices está mal
// planteado y da un centro falso (probado 23-08: daba R31 donde el arco real es
// R52). Se parte el lazo por sus ESQUINAS —los vértices con giro brusco— y se
// ajusta sobre la cadena más larga, que es un arco de verdad; el otro radio sale
// midiendo la segunda cadena contra ese mismo centro.
function ajustaArco(pol) {
  const P = pol[0][0] === pol[pol.length - 1][0] && pol[0][1] === pol[pol.length - 1][1]
    ? pol.slice(0, -1) : pol.slice();
  const n = P.length;
  if (n < 12) return null;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const esquinas = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    let d = ang(b, c) - ang(a, b);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) > 40 * Math.PI / 180) esquinas.push(i);
  }
  if (esquinas.length < 2) return null;
  // cadenas entre esquinas consecutivas
  const cadenas = [];
  for (let k = 0; k < esquinas.length; k++) {
    const i0 = esquinas[k], i1 = esquinas[(k + 1) % esquinas.length];
    const ch = [];
    for (let i = i0; ; i = (i + 1) % n) { ch.push(P[i]); if (i === i1) break; }
    if (ch.length >= 4) cadenas.push(ch);
  }
  if (!cadenas.length) return null;
  cadenas.sort((a, b) => b.length - a.length);
  const ch = cadenas[0];
  // circuncentro por tres puntos bien separados de la cadena
  const [A, Bp, C] = [ch[0], ch[Math.floor(ch.length / 2)], ch[ch.length - 1]];
  const d = 2 * (A[0] * (Bp[1] - C[1]) + Bp[0] * (C[1] - A[1]) + C[0] * (A[1] - Bp[1]));
  if (Math.abs(d) < 1e-9) return null;                       // colineales: recta
  const ax = A[0] * A[0] + A[1] * A[1], bx = Bp[0] * Bp[0] + Bp[1] * Bp[1], cx2 = C[0] * C[0] + C[1] * C[1];
  const cx = (ax * (Bp[1] - C[1]) + bx * (C[1] - A[1]) + cx2 * (A[1] - Bp[1])) / d;
  const cy = (ax * (C[0] - Bp[0]) + bx * (A[0] - C[0]) + cx2 * (Bp[0] - A[0])) / d;
  const rs = ch.map(([x, y]) => Math.hypot(x - cx, y - cy));
  const R = rs.reduce((a, b) => a + b, 0) / rs.length;
  // la cadena tiene que SER un arco: dispersión bajo el 2 % del radio
  if (R < 5 || (Math.max(...rs) - Math.min(...rs)) > R * 0.02) return null;
  const angs = ch.map(([x, y]) => Math.atan2(y - cy, x - cx)).sort((a, b) => a - b);
  const vano = (angs[angs.length - 1] - angs[0]) * 180 / Math.PI;
  // el ancho: la otra cadena larga, medida contra ESTE centro
  let ancho = 0;
  if (cadenas[1]) {
    const r2 = cadenas[1].map(([x, y]) => Math.hypot(x - cx, y - cy));
    ancho = Math.abs(R - r2.reduce((a, b) => a + b, 0) / r2.length);
  }
  return { cx, cy, r: R, ancho, vano };
}

export function buildFlatSheet(flat, meta, K) {
  const xs = flat.contorno.map(p => p[0]), ys = flat.contorno.map(p => p[1]);
  const lo = [Math.min(...xs), Math.min(...ys)], hi = [Math.max(...xs), Math.max(...ys)];
  const w = hi[0] - lo[0], h = hi[1] - lo[1];
  let [name, W, H, num, den] = chooseSheet(w, h);
  // distribución armónica (Sergio 18-08): la lámina reserva una BANDA DERECHA
  // (pieza plegada, detalle, leyendas). Si a la escala elegida la banda queda
  // bajo 115 mm, se sube UN formato manteniendo la escala — «puedes aumentar
  // tamaño de hoja para más espacio».
  {
    const ordenF = ['A4', 'A3', 'A2', 'A1', 'A0'];
    const i = ordenF.indexOf(name);
    const spare = (W - MARGIN_L - MARGIN) - w * (num / den);
    if (spare < 115 && i >= 0 && i < ordenF.length - 1) {
      name = ordenF[i + 1];
      [W, H] = SHEETS[name];
    }
  }
  const sheet = new Sheet(name, W, H, num, den, K === 'real' ? den / num : 1);
  // hairline SÓLO en la salida para el LÁSER (K='real'): en el libro la lámina
  // lleva jerarquía ISO de grosores — con hairline incondicional las láminas
  // de fabricación salían pálidas y sin peso (hallazgo Sergio 18-08)
  const soloCorte = K === 'real';
  sheet.hairline = soloCorte;
  const s = num / den;
  const uw = W - MARGIN_L - MARGIN, uh = H - 2 * MARGIN - TITLE_H - 5;
  const ox = MARGIN_L + (uw - w * s) / 2 - lo[0] * s;
  const oy = MARGIN + TITLE_H + 5 + (uh - h * s) / 2 - lo[1] * s;
  const T = (p) => [ox + p[0] * s, oy + p[1] * s];
  sheet.poly(flat.contorno.map(T), 'VISIBLE');
  let gruposRef = null;   // familias de barrenos, visibles para el DETALLE ×2
  // cortes/barrenos del plano de la base = lo que corta el láser (capa de corte)
  if (flat.cortes) {
    // GRUPOS por diámetro con LETRA en cada barreno (el panel: «63 barrenos de
    // 3 diámetros sin identificación» — así la lámina se verifica sola) y
    // remisión explícita al DXF 1:1 + _agujeros.csv para las posiciones
    const grupos = new Map();   // "dia|rosca" → {letra, dia, rosca, n}
    for (const c of flat.cortes.circles) {
      const k = `${+(c.r * 2).toFixed(2)}|${c.rosca || ''}`;
      let g = grupos.get(k);
      if (!g) grupos.set(k, g = { dia: +(c.r * 2).toFixed(2), rosca: c.rosca || '', n: 0 });
      g.n++;
    }
    const orden = [...grupos.values()].sort((a, b) => a.dia - b.dia || a.rosca.localeCompare(b.rosca));
    // con 2+ familias, cada grupo lleva LETRA y COLOR (círculo, letra, rosca y
    // leyenda al mismo tono): la lámina se lee de un vistazo (Sergio 18-08)
    orden.forEach((g, i) => { g.letra = String.fromCharCode(65 + i); g.rgb = orden.length > 1 ? GRUPO_RGB[i % GRUPO_RGB.length] : null; });
    gruposRef = grupos;
    const grupoDe = (c) => grupos.get(`${+(c.r * 2).toFixed(2)}|${c.rosca || ''}`);
    const letraDe = (c) => grupoDe(c).letra;
    // Sergio 18-08: NO se dibujan líneas entre barrenos ni se acota la
    // colinealidad — es corte láser: las posiciones mandan en el DXF 1:1 y
    // _agujeros.csv. Cada barreno lleva su cruz de centro individual.
    for (const c of flat.cortes.circles) {
      const gc = grupoDe(c).rgb || undefined;
      sheet.circle(T(c.c), c.r * s, 'VISIBLE', gc);
      const [cx, cy] = T(c.c);
      if (!soloCorte) {
        // cruz de centro (cadena fina): el brazo sale 2,2 del borde del barreno
        const arm = c.r * s + 2.2;
        sheet.line([cx - arm, cy], [cx + arm, cy], 'EJE');
        sheet.line([cx, cy - arm], [cx, cy + arm], 'EJE');
        // rosca interior ISO 6410: el diámetro MAYOR del hilo como arco FINO a
        // ~3/4 de vuelta alrededor de la broca dibujada
        const M = c.rosca && /M(\d+(?:[.,]\d+)?)/.exec(c.rosca);
        if (M) {
          const rM = (parseFloat(M[1].replace(',', '.')) / 2) * s;
          const a0 = Math.PI * 0.12, a1 = Math.PI * 1.62, n = 20;
          let prev = null;
          for (let i = 0; i <= n; i++) {
            const t = a0 + (a1 - a0) * i / n;
            const q = [cx + rM * Math.cos(t), cy + rM * Math.sin(t)];
            if (prev) sheet.line(prev, q, 'FINA', gc);
            prev = q;
          }
        }
      }
      if (orden.length > 1) {
        sheet.text(letraDe(c), cx + c.r * s + 0.7, cy - 0.8, 2.2, 'L', 'TEXTO', gc);
      }
    }
    for (const p of flat.cortes.polys) {
      for (let i = 0; i < p.length - 1; i++) sheet.line(T(p[i]), T(p[i + 1]), 'VISIBLE');
    }
    // CONTORNOS INTERIORES (ranuras, arcos, ventanas): hasta hoy se dibujaban y
    // no se acotaban — el plano no decía ni cuánto miden ni dónde van. Se
    // agrupan los IGUALES (misma envolvente) y cada familia va a la LEYENDA al
    // pie con una directriz desde su primera instancia: metido en el campo de
    // dibujo el rótulo chocaba con el texto de plegado o se salía de la hoja.
    if (flat.cortes.polys?.length) {
      const cero2 = [lo[0], lo[1]];
      const fam = new Map();
      for (const p of flat.cortes.polys) {
        const xs2 = p.map(q => q[0]), ys2 = p.map(q => q[1]);
        const a = [Math.min(...xs2), Math.min(...ys2)], b = [Math.max(...xs2), Math.max(...ys2)];
        const dw = +(b[0] - a[0]).toFixed(1), dh = +(b[1] - a[1]).toFixed(1);
        const k = `${dw}x${dh}`;
        if (!fam.has(k)) fam.set(k, { dw, dh, cent: [], pol: p });
        fam.get(k).cent.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      }
      let iF = 0;
      const yLeg0 = T([lo[0], lo[1]])[1] - 21;
      for (const [, f] of fam) {
        const arc = ajustaArco(f.pol);
        let txt;
        if (arc) {
          // radio de LÍNEA MEDIA (el de diseño) y centro: es con lo que se traza
          const rMed = arc.r - arc.ancho / 2;
          txt = `${f.cent.length}× ranura en ARCO R${rMed.toFixed(1)} (línea media) · ancho ${arc.ancho.toFixed(1)}` +
            ` · vano ${arc.vano.toFixed(0)}° · centro ${(arc.cx - cero2[0]).toFixed(1)},${(arc.cy - cero2[1]).toFixed(1)}`;
        } else {
          txt = `${f.cent.length}× contorno ${f.dw}×${f.dh}`;
        }
        // MARCA por familia (R1, R2…) junto a cada instancia y al frente del
        // renglón: una directriz desde la leyenda hasta el contorno cruzaba la
        // pieza entera, que es mala práctica de dibujo.
        const marca = `R${iF + 1}`;
        const yl = yLeg0 - iF * 4;
        sheet.text(`${marca} — ${txt}`, T([lo[0], lo[1]])[0] + 4, yl, 2.8, 'L');
        for (const c of f.cent) {
          const Q = T(c);
          sheet.marcaCentro(Q, 1.4);
          // la marca va al COSTADO: debajo chocaba con el texto de plegado
          sheet.text(marca, Q[0] + (f.dw * s) / 2 + 1.4, Q[1] - 0.9, 2.4, 'L', 'COTAS');
          sheet.text(`${(+(c[0] - cero2[0])).toFixed(1)},${(+(c[1] - cero2[1])).toFixed(1)}`,
            Q[0], Q[1] + (f.dh * s) / 2 + 1.6, 2.2, 'C', 'COTAS');
        }
        iF++;
      }
    }
    if (orden.length) {
      // leyenda con cada familia en SU color, en segmentos consecutivos
      let lx = T([lo[0], lo[1]])[0];
      const lyy = T([lo[0], lo[1]])[1] - 13;
      const cab = 'BARRENOS (corte láser): ';
      sheet.text(cab, lx, lyy, 3.2, 'L');
      lx += textWidth(cab, 3.2);
      orden.forEach((g, i) => {
        const seg = `${orden.length > 1 ? g.letra + ' = ' : ''}${g.n}× Ø${g.dia}${g.rosca ? ` (broca — ROSCAR ${g.rosca})` : ''}${i < orden.length - 1 ? '  ·  ' : ''}`;
        sheet.text(seg, lx, lyy, 3.2, 'L', 'TEXTO', g.rgb || undefined);
        lx += textWidth(seg, 3.2);
      });
      // POSICIONES ACOTADAS EN LA LÁMINA (23-08). Antes esta línea decía «ver el
      // DXF y el _agujeros.csv»: un plano que manda al calderero a un CSV no es
      // un plano, y es lo que obliga a abrir Inventor. Ahora la lámina lleva el
      // CERO declarado, las ordenadas y la tabla de coordenadas — el CSV queda
      // como comodidad para el láser, no como requisito para leer el plano.
      const cero = [lo[0], lo[1]];
      const P0 = T(cero);
      sheet.text(`CERO DE COTAS: esquina inferior izquierda del desarrollo · perfil exacto de cada contorno en el DXF ${meta?.dxfRef || 'de corte'} 1:1`,
        P0[0], P0[1] - 21 - 4 * 4 - 5, 2.8, 'L');
      sheet.circle(P0, 1.6, 'COTAS');
      sheet.text('0,0', P0[0] - 2.6, P0[1] - 4.6, 2.6, 'R', 'COTAS');

      const cs = flat.cortes.circles;
      const uniq = (a) => [...new Set(a.map(v => Math.round(v * 10)))].length;
      const xr = cs.map(c => c.c[0] - cero[0]), yr = cs.map(c => c.c[1] - cero[1]);
      // con demasiadas coordenadas distintas las ordenadas se pisan entre sí:
      // ahí manda la tabla, que es la otra forma normalizada de decir lo mismo
      if (uniq(xr) <= 16) {
        sheet.ordenadasH(P0[0], cs.map(c => ({
          v: +(c.c[0] - cero[0]).toFixed(1), x: T(c.c)[0], yFeat: T(c.c)[1] - c.r * s,
        })), P0[1] - 3, 9);
      }
      if (uniq(yr) <= 12) {
        sheet.ordenadasV(P0[1], cs.map(c => ({
          v: +(c.c[1] - cero[1]).toFixed(1), y: T(c.c)[1], xFeat: T(c.c)[0] - c.r * s,
        })), P0[0] - 3, 9);
      }

      // TABLA DE COORDENADAS en la banda derecha: una fila por barreno, con su
      // marca. Se reparte en columnas para caber; si aun así no cabe, se dice
      // CUÁNTAS quedaron fuera — nunca se calla.
      const filas = cs.map(c => {
        const g = grupoDe(c);
        const base = ['Ø' + (+(c.r * 2).toFixed(1)),
          (+(c.c[0] - cero[0])).toFixed(1), (+(c.c[1] - cero[1])).toFixed(1)];
        return orden.length > 1 ? [g?.letra ?? '', ...base] : base;
      }).sort((a, b) => String(a[0]).localeCompare(String(b[0])) || (+a[a.length - 2]) - (+b[b.length - 2]));
      const bandX = ox + w * s + 18;
      const libreW = W - MARGIN - bandX;
      const unaFam = orden.length <= 1;
      const anchosT = unaFam ? [14, 16, 16] : [10, 14, 16, 16];
      const anchoT = anchosT.reduce((a, b) => a + b, 0);
      if (libreW > anchoT + 2) {
        const topeY = oy + h * s;
        const baseY = MARGIN + TITLE_H + 12;
        const porCol = Math.max(1, Math.floor((topeY - baseY) / 5.2) - 1);
        const nCols = Math.max(1, Math.floor(libreW / (anchoT + 4)));
        let puestas = 0;
        for (let ci = 0; ci < nCols && puestas < filas.length; ci++) {
          const trozo = filas.slice(puestas, puestas + porCol);
          sheet.tablaBarrenos(bandX + ci * (anchoT + 4), topeY - 5.2, trozo,
            unaFam ? ['Ø', 'X', 'Y'] : ['MARCA', 'Ø', 'X', 'Y'], anchosT);
          puestas += trozo.length;
        }
        sheet.text(`COORDENADAS DESDE EL CERO (${puestas}/${filas.length})` +
          (puestas < filas.length ? ` · resto en _agujeros.csv` : ''),
          bandX, topeY + 2.5, 2.6, 'L');
      }
    }
    // llamado de ROSCAS junto a cada barreno roscado
    for (const c of flat.cortes.circles.filter(q => q.rosca)) {
      const [cx, cy] = T(c.c);
      sheet.text(c.rosca, cx + c.r * s + 1.2, cy + 1.4, 2.2, 'L', 'TEXTO', grupoDe(c).rgb || undefined);
    }
  }
  const esPlana = !flat.pliegueInfo?.length;
  for (const l of flat.pliegues) {
    sheet.line(T(l.a), T(l.b), l.tipo === 'eje' ? 'PLIEGUE' : 'FINA');
  }
  for (const e of flat.etiquetas) {
    const [x, y] = T([e.x, e.y]);
    // etiqueta SOBRE la línea que anota, no atravesada por ella (panel)
    sheet.text(e.s, x, y + 2.0, 2.8, 'C');
  }
  const [x1, y1] = T(lo), [x2, y2] = T(hi);
  sheet.dimH(x1, x2, y1, 9, w);
  sheet.dimV(x2, y1, y2, 9, h);
  // COTA de cada línea de pliegue horizontal (posición del tope de plegadora —
  // el panel: «la línea de pliegue no tiene cota que la ubique»)
  if (!esPlana) {
    const ysPl = [...new Set(flat.pliegues.filter(l => l.tipo === 'eje' && Math.abs(l.a[1] - l.b[1]) < 0.01)
      .map(l => +l.a[1].toFixed(2)))];
    ysPl.forEach((yp, i) => {
      const dist = +(yp - lo[1]).toFixed(1);
      if (dist > 0.5 && dist < h - 0.5) sheet.dimV(x1, y1, T([lo[0], yp])[1], -(7 + i * 7), dist);
    });
  }
  if (esPlana) {
    sheet.text('PIEZA PLANA DE CORTE — sin pliegues (láser directo)', x1, y2 + 10.5, 3.5, 'L');
  } else {
    const ba90 = (Math.PI / 2) * (flat.radio + flat.k * flat.t);
    sheet.text(`DESARROLLO DE CHAPA — BA = ang·(R + K·t) · K=${flat.k} · R=${flat.radio} · t=${flat.t} → BA(90°)=${ba90.toFixed(2)} mm`,
      x1, y2 + 10.5, 3.5, 'L');
  }
  sheet.text(`ESPESOR DE CHAPA e = ${flat.t} mm (constante en toda la pieza)`,
    x1, y2 + 5, 4.0, 'L');
  // DETALLE ×2 (Sergio 18-08: «agrega detalles»): la zona del barreno más
  // fino — roscado si existe — ampliada al doble en la banda derecha, con su
  // marcador en la vista principal. Contenido re-emitido (no clip PDF):
  // círculos, arcos de rosca, cruz de centro y tramos de contorno/pliegue que
  // crucen la ventana (recorte Liang-Barsky).
  if (!soloCorte && flat.cortes?.circles?.length) {
    const objetivo = flat.cortes.circles.find(c => c.rosca)
      ?? [...flat.cortes.circles].sort((a, b) => a.r - b.r)[0];
    if (objetivo && gruposRef) {
      const cx0 = objetivo.c[0], cy0 = objetivo.c[1];
      const half = Math.max(objetivo.r * 4, 14);          // semiancho en mm de pieza
      const k2 = s * 2;                                    // escala del detalle
      const bandX = ox + w * s + 18;
      const dW = 2 * half * k2;
      const dx0 = bandX, dy0 = oy + 6;                     // esquina inferior del inset
      const TD = (px, py) => [dx0 + (px - (cx0 - half)) * k2, dy0 + (py - (cy0 - half)) * k2];
      if (dx0 + dW < W - MARGIN - 4) {
        // marcador en la vista principal
        sheet.circle(T([cx0, cy0]), half * s, 'COTAS');
        sheet.text('A', T([cx0 + half, cy0 + half])[0] + 1, T([cx0 + half, cy0 + half])[1] + 1, 3.2, 'L', 'COTAS');
        // marco del detalle
        sheet.rect(dx0 - 3, dy0 - 3, dW + 6, dW + 6, 'FINA');
        sheet.text(`DETALLE A — escala ×2 (barreno ${objetivo.rosca || 'Ø' + +(objetivo.r * 2).toFixed(1)})`, dx0 - 3, dy0 + dW + 5.5, 3.0, 'L');
        const dentro = (px, py) => Math.abs(px - cx0) <= half && Math.abs(py - cy0) <= half;
        // círculos del detalle (completos si el centro cae en ventana)
        for (const c of flat.cortes.circles) {
          if (!dentro(c.c[0], c.c[1])) continue;
          const g = gruposRef.get(`${+(c.r * 2).toFixed(2)}|${c.rosca || ''}`);
          sheet.circle(TD(c.c[0], c.c[1]), c.r * k2, 'VISIBLE', g?.rgb || undefined);
          const [qx, qy] = TD(c.c[0], c.c[1]);
          const arm = c.r * k2 + 3;
          sheet.line([qx - arm, qy], [qx + arm, qy], 'EJE');
          sheet.line([qx, qy - arm], [qx, qy + arm], 'EJE');
          const M = c.rosca && /M(\d+(?:[.,]\d+)?)/.exec(c.rosca);
          if (M) {
            const rM = (parseFloat(M[1].replace(',', '.')) / 2) * k2;
            let prev = null;
            for (let i = 0; i <= 24; i++) {
              const t = Math.PI * 0.12 + (Math.PI * 1.5) * i / 24;
              const q = [qx + rM * Math.cos(t), qy + rM * Math.sin(t)];
              if (prev) sheet.line(prev, q, 'FINA', g?.rgb || undefined);
              prev = q;
            }
            sheet.text(c.rosca, qx + rM + 1.5, qy + 1.5, 3.0, 'L', 'TEXTO', g?.rgb || undefined);
          }
        }
        // tramos de contorno y pliegues recortados a la ventana (Liang-Barsky)
        const clipSeg = (x1, y1, x2, y2) => {
          let t0 = 0, t1 = 1;
          const dx = x2 - x1, dy = y2 - y1;
          for (const [pC, qC] of [[-dx, x1 - (cx0 - half)], [dx, (cx0 + half) - x1], [-dy, y1 - (cy0 - half)], [dy, (cy0 + half) - y1]]) {
            if (pC === 0) { if (qC < 0) return null; continue; }
            const r = qC / pC;
            if (pC < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
            else { if (r < t0) return null; if (r < t1) t1 = r; }
          }
          return [[x1 + dx * t0, y1 + dy * t0], [x1 + dx * t1, y1 + dy * t1]];
        };
        const cont = flat.contorno;
        for (let i = 0; i < cont.length; i++) {
          const a2 = cont[i], b2 = cont[(i + 1) % cont.length];
          const cl = clipSeg(a2[0], a2[1], b2[0], b2[1]);
          if (cl) sheet.line(TD(...cl[0]), TD(...cl[1]), 'VISIBLE');
        }
        for (const l of flat.pliegues) {
          const cl = clipSeg(l.a[0], l.a[1], l.b[0], l.b[1]);
          if (cl) sheet.line(TD(...cl[0]), TD(...cl[1]), l.tipo === 'eje' ? 'PLIEGUE' : 'FINA');
        }
        sheet._detalleTopY = dy0 + dW + 10;   // para que la miniatura no lo pise
      }
    }
  }

  // layout usado, para que el compositor (planos_fab) aproveche el sobrante
  // de lámina con la miniatura de la pieza PLEGADA u otra vista auxiliar
  sheet._flatLayout = { ox, oy, w: w * s, h: h * s, W, H };
  sheet.frame();
  const aviso = flat.avisos.length ? flat.avisos[0] : '';
  sheet.titleBlock({
    designacion: `${meta.designacion} — DESARROLLO`,
    proyecto: meta.proyecto ?? 'ConveyOne CAD',
    fuente: 'chapa plegada — capa user',
    verificacion: 'CAD EN MM (CAPA USER)',
    piezasLabel: 'PLIEGUES',
    piezas: String(flat.pliegueInfo.length),
    nota: meta.nota || aviso || `${flat.material} e=${flat.t} mm · K=${flat.k} · R def=${flat.radio} mm — diseño, no medición`,
    escala: scaleLabel(num, den),
    fecha: meta.fecha ?? new Date().toISOString().slice(0, 10),
    numPlano: meta.numPlano || 'CHAPA-01',
    rev: meta.rev, revCausa: meta.revCausa,
  });
  return sheet;
}

export function exportFlatDXF(flat, meta) {
  const sheet = buildFlatSheet(flat, meta, 'real');
  return {
    name: 'desarrollo-chapa.dxf', data: dxfToBytes(writeDXF(sheet)), mime: 'application/dxf',
    info: `${sheet.name} escala ${scaleLabel(sheet.num, sheet.den)}, desarrollo a escala real`,
  };
}

export function exportFlatPDF(flat, meta) {
  const sheet = buildFlatSheet(flat, meta, 'paper');
  return {
    name: 'desarrollo-chapa.pdf', data: toBytes(writePDF(sheet)), mime: 'application/pdf',
    info: `${sheet.name} escala ${scaleLabel(sheet.num, sheet.den)}`,
  };
}

// --- API ----------------------------------------------------------------------
// parts: [{ geometry, matrixWorld?, name? }] · meta: { designacion, piezas, ... }

export function exportDrawingDXF(parts, meta) {
  const sheet = buildSheet(parts, 'real', meta);
  return {
    name: 'plano-cad.dxf',
    data: dxfToBytes(writeDXF(sheet)),
    mime: 'application/dxf',
    info: `${sheet.name} escala ${scaleLabel(sheet.num, sheet.den)}, geometría a escala real`,
  };
}

// Piezas exportadas para el generador de planos de fabricación (planos_fab.mjs):
// permiten construir láminas propias (portada/despiece) y unir varias en un
// único PDF multipágina.
export { buildSheet, Sheet, chooseSheet, scaleLabel, toBytes };
export function exportSheetsPDF(sheets, name = 'planos.pdf') {
  return { name, data: toBytes(writePDFMulti(sheets)), mime: 'application/pdf' };
}

export function exportDrawingPDF(parts, meta) {
  const sheet = buildSheet(parts, 'paper', meta);
  return {
    name: 'plano-cad.pdf',
    data: toBytes(writePDF(sheet)),
    mime: 'application/pdf',
    info: `${sheet.name} escala ${scaleLabel(sheet.num, sheet.den)}`,
  };
}
