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
const LAYERS = { NORMA: 7, FINA: 7, VISIBLE: 7, COTAS: 7, TEXTO: 7 };      // color ACI
const LW = { NORMA: 0.7, FINA: 0.18, VISIBLE: 0.5, COTAS: 0.25, TEXTO: 0.25 }; // mm (PDF)

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
  line(a, b, ly) { this.prims.push({ k: 'l', a: this._p(...a), b: this._p(...b), ly }); }
  rect(x, y, w, h, ly) {
    this.prims.push({ k: 'p', pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(p => this._p(...p)), ly });
  }
  poly(pts, ly) { this.prims.push({ k: 'p', pts: pts.map(p => this._p(...p)), ly }); }
  circle(c, r, ly = 'TEXTO') { this.prims.push({ k: 'c', c: this._p(...c), r: r * this.K, ly }); }
  solid(pts, ly) { this.prims.push({ k: 's', pts: pts.map(p => this._p(...p)), ly }); }
  text(s, x, y, h = 3.5, al = 'L', ly = 'TEXTO') {
    const [px, py] = this._p(x, y);
    this.prims.push({ k: 't', s, x: px, y: py, h: h * this.K, al, ly });
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

    // zona A — marca + símbolo de proyección
    const cxa = x0 + 20;
    this.line([x0, ys[2]], [xa, ys[2]], 'FINA');
    this.text('foto3d', cxa, ys[0] - 8.2, 6.0, 'C');
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
    this.cell(xa + 56, ys[3], 38, 10, 'PIEZAS', tb.piezas, 2.6);
    this.cell(xa, y0, 94, 9, 'NOTA', tb.nota, 2.2);

    // zona C — clasificación
    for (const y of [ys[1], ys[2], ys[3]]) this.line([xb, y], [x0 + TITLE_W, y], 'FINA');
    this.line([xb + 23, ys[2]], [xb + 23, ys[1]], 'FINA');
    this.line([xb + 26, ys[3]], [xb + 26, ys[2]], 'FINA');
    this.cell(xb, ys[1], 46, 13, 'ESCALA', tb.escala, 5.0, 'C');
    this.cell(xb, ys[2], 23, 10, 'FORMATO', this.name, 3.0, 'C');
    this.cell(xb + 23, ys[2], 23, 10, 'LÁMINA', '1 / 1', 3.0, 'C');
    this.cell(xb, ys[3], 26, 10, 'FECHA', tb.fecha, 2.6, 'C');
    this.cell(xb + 26, ys[3], 20, 10, 'UNIDADES', 'mm', 3.0, 'C');
    this.cell(xb, y0, 46, 9, 'Nº DE PLANO', tb.numPlano, 2.6, 'C');
  }
}

function drawViews(sheet, views, layout) {
  const s = sheet.num / sheet.den;
  const uw = sheet.W - MARGIN_L - MARGIN, uh = sheet.H - 2 * MARGIN - TITLE_H - 5;
  const ox = MARGIN_L + (uw - layout.tw * s) / 2;
  const oy = MARGIN + TITLE_H + 5 + (uh - layout.th * s) / 2;
  for (const name of ORDER) {
    const v = views[name];
    const vx = ox + layout.pos[name][0] * s - v.lo[0] * s;
    const vy = oy + layout.pos[name][1] * s - v.lo[1] * s;
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
  drawViews(sheet, views, layout);
  sheet.frame();
  sheet.titleBlock({
    designacion: meta.designacion,
    proyecto: meta.proyecto ?? 'foto3d CAD',
    fuente: 'diseño en navegador — capa user',
    verificacion: 'CAD EN MM (CAPA USER)',
    piezas: String(meta.piezas),
    nota: 'Aristas características sin líneas ocultas — diseño CAD, no medición',
    escala: scaleLabel(num, den),
    fecha: new Date().toISOString().slice(0, 10),
    numPlano: 'CAD-01',
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
  g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1);
  g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0);
  g(0, 'ENDTAB');
  g(0, 'TABLE'); g(2, 'LAYER'); g(70, Object.keys(LAYERS).length);
  for (const [name, color] of Object.entries(LAYERS)) {
    g(0, 'LAYER'); g(2, name); g(70, 0); g(62, color); g(6, 'CONTINUOUS');
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
        g(0, 'LINE'); g(8, p.ly);
        g(10, f(a[0])); g(20, f(a[1])); g(30, 0);
        g(11, f(b[0])); g(21, f(b[1])); g(31, 0);
      }
    } else if (p.k === 'c') {
      g(0, 'CIRCLE'); g(8, p.ly); g(10, f(p.c[0])); g(20, f(p.c[1])); g(30, 0); g(40, f(p.r));
    } else if (p.k === 's') {
      const [a, b, c] = p.pts;
      g(0, 'SOLID'); g(8, p.ly);
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
  let out = '';
  for (const ch of s) {
    let code = WINANSI[ch] ?? ch.codePointAt(0);
    if (code > 255) code = 63; // '?' — fuera de WinAnsi
    const c = String.fromCharCode(code);
    out += c === '(' || c === ')' || c === '\\' ? '\\' + c : c;
  }
  return out;
}

function writePDF(sheet) {
  const k = 72 / 25.4;
  const W = sheet.W * k, H = sheet.H * k;
  const f = (v) => v.toFixed(2);
  const ops = [];
  const byLayer = {};
  for (const p of sheet.prims) (byLayer[p.ly] ??= []).push(p);
  for (const [ly, prims] of Object.entries(byLayer)) {
    ops.push(`${f((LW[ly] ?? 0.25) * k)} w 1 J 1 j`);
    for (const p of prims) {
      if (p.k === 'l') {
        ops.push(`${f(p.a[0] * k)} ${f(p.a[1] * k)} m ${f(p.b[0] * k)} ${f(p.b[1] * k)} l S`);
      } else if (p.k === 'p' || p.k === 's') {
        const cmd = p.pts.map((q, i) => `${f(q[0] * k)} ${f(q[1] * k)} ${i ? 'l' : 'm'}`).join(' ');
        ops.push(`${cmd} h ${p.k === 's' ? 'f' : 'S'}`);
      } else if (p.k === 'c') {
        const [cx, cy] = [p.c[0] * k, p.c[1] * k], r = p.r * k, m = r * 0.55228;
        ops.push(`${f(cx + r)} ${f(cy)} m ` +
          `${f(cx + r)} ${f(cy + m)} ${f(cx + m)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c ` +
          `${f(cx - m)} ${f(cy + r)} ${f(cx - r)} ${f(cy + m)} ${f(cx - r)} ${f(cy)} c ` +
          `${f(cx - r)} ${f(cy - m)} ${f(cx - m)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c ` +
          `${f(cx + m)} ${f(cy - r)} ${f(cx + r)} ${f(cy - m)} ${f(cx + r)} ${f(cy)} c S`);
      } else if (p.k === 't') {
        let x = p.x, y = p.y;
        if (p.al === 'C') { x -= textWidth(p.s, p.h) / 2; y -= 0.36 * p.h; }
        else if (p.al === 'ML') { y -= 0.36 * p.h; }
        ops.push(`BT /F1 ${f(p.h * k)} Tf ${f(x * k)} ${f(y * k)} Td (${pdfEscape(p.s)}) Tj ET`);
      }
    }
  }
  const content = ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] ` +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
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

const toBytes = (s) => {
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

export function exportDrawingPDF(parts, meta) {
  const sheet = buildSheet(parts, 'paper', meta);
  return {
    name: 'plano-cad.pdf',
    data: toBytes(writePDF(sheet)),
    mime: 'application/pdf',
    info: `${sheet.name} escala ${scaleLabel(sheet.num, sheet.den)}`,
  };
}
