// sketch2d.js — geometría 2D del boceto: entidades (línea/círculo/arco),
// intersecciones, recorte, alargado, encadenado de contornos con agujeros,
// cotas (largo/diámetro/distancia/ángulo) y reconocimiento de trazos a mano.
// Sin dependencias: se prueba en Node directamente.

let _sid = 0;
export const sid = () => `e${(++_sid).toString(36)}${Date.now().toString(36).slice(-3)}`;

const TAU = Math.PI * 2;
export const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const scale = (p, k) => [p[0] * k, p[1] * k];
const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
const cross = (p, q) => p[0] * q[1] - p[1] * q[0];
const norm = (p) => { const l = Math.hypot(p[0], p[1]) || 1; return [p[0] / l, p[1] / l]; };
const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const normAng = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };

export function makeLine(a, b) { return { id: sid(), type: 'line', a: [...a], b: [...b] }; }
export function makeCircle(c, r) { return { id: sid(), type: 'circle', c: [...c], r }; }
export function makeArc(c, r, a0, a1) { return { id: sid(), type: 'arc', c: [...c], r, a0, a1 }; } // CCW a0→a1

function arcSpan(e) { const a0 = normAng(e.a0); let a1 = normAng(e.a1); if (a1 <= a0 + 1e-12) a1 += TAU; return [a0, a1]; }
function angInArc(e, ang) { const [a0, a1] = arcSpan(e); let x = normAng(ang); if (x < a0 - 1e-9) x += TAU; return x <= a1 + 1e-9; }

export function entityPoints(e, n = 48) {
  if (e.type === 'line') return [[...e.a], [...e.b]];
  if (e.type === 'circle') {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = i * TAU / n; pts.push([e.c[0] + e.r * Math.cos(a), e.c[1] + e.r * Math.sin(a)]); }
    return pts;
  }
  if (e.type === 'arc') {
    const [a0, a1] = arcSpan(e);
    const steps = Math.max(2, Math.ceil((a1 - a0) / TAU * n));
    const pts = [];
    for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; pts.push([e.c[0] + e.r * Math.cos(a), e.c[1] + e.r * Math.sin(a)]); }
    return pts;
  }
  return [];
}

export function nearestOnEntity(e, p) {
  if (e.type === 'line') {
    const d = sub(e.b, e.a), l2 = dot(d, d) || 1;
    const t = Math.min(1, Math.max(0, dot(sub(p, e.a), d) / l2));
    const q = lerp(e.a, e.b, t);
    return { d: dist(p, q), point: q, t };
  }
  const ang = Math.atan2(p[1] - e.c[1], p[0] - e.c[0]);
  if (e.type === 'circle') {
    const q = [e.c[0] + e.r * Math.cos(ang), e.c[1] + e.r * Math.sin(ang)];
    return { d: Math.abs(dist(p, e.c) - e.r), point: q, ang };
  }
  if (e.type === 'arc') {
    if (angInArc(e, ang)) {
      const q = [e.c[0] + e.r * Math.cos(ang), e.c[1] + e.r * Math.sin(ang)];
      return { d: Math.abs(dist(p, e.c) - e.r), point: q, ang };
    }
    const [pa, pb] = arcEndpoints(e);
    return dist(p, pa) < dist(p, pb) ? { d: dist(p, pa), point: pa, ang: e.a0 } : { d: dist(p, pb), point: pb, ang: e.a1 };
  }
  return { d: Infinity, point: p };
}

export function arcEndpoints(e) {
  return [
    [e.c[0] + e.r * Math.cos(e.a0), e.c[1] + e.r * Math.sin(e.a0)],
    [e.c[0] + e.r * Math.cos(e.a1), e.c[1] + e.r * Math.sin(e.a1)],
  ];
}

// ---------- intersecciones ----------

function segSeg(a, b, c, d) {
  const r = sub(b, a), s = sub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-12) return [];
  const t = cross(sub(c, a), s) / den, u = cross(sub(c, a), r) / den;
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return [];
  return [[a[0] + t * r[0], a[1] + t * r[1]]];
}

function segCircle(a, b, c, r) {
  const d = sub(b, a), f = sub(a, c);
  const A = dot(d, d), B = 2 * dot(f, d), C = dot(f, f) - r * r;
  let disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  disc = Math.sqrt(disc);
  const out = [];
  for (const t of [(-B - disc) / (2 * A), (-B + disc) / (2 * A)]) {
    if (t > -1e-9 && t < 1 + 1e-9) out.push([a[0] + t * d[0], a[1] + t * d[1]]);
  }
  if (out.length === 2 && dist(out[0], out[1]) < 1e-9) out.pop();
  return out;
}

function circleCircle(c1, r1, c2, r2) {
  const d = dist(c1, c2);
  if (d < 1e-12 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;
  const h = h2 > 0 ? Math.sqrt(h2) : 0;
  const m = lerp(c1, c2, a / d);
  const u = norm(sub(c2, c1));
  const out = [[m[0] - u[1] * h, m[1] + u[0] * h]];
  if (h > 1e-9) out.push([m[0] + u[1] * h, m[1] - u[0] * h]);
  return out;
}

export function intersectEntities(e1, e2) {
  const circ = (e) => e.type === 'circle' || e.type === 'arc';
  let pts = [];
  if (e1.type === 'line' && e2.type === 'line') pts = segSeg(e1.a, e1.b, e2.a, e2.b);
  else if (e1.type === 'line' && circ(e2)) pts = segCircle(e1.a, e1.b, e2.c, e2.r);
  else if (circ(e1) && e2.type === 'line') pts = segCircle(e2.a, e2.b, e1.c, e1.r);
  else if (circ(e1) && circ(e2)) pts = circleCircle(e1.c, e1.r, e2.c, e2.r);
  // filtrar por tramo angular si son arcos
  return pts.filter(p => {
    for (const e of [e1, e2]) {
      if (e.type === 'arc' && !angInArc(e, Math.atan2(p[1] - e.c[1], p[0] - e.c[0]))) return false;
    }
    return true;
  });
}

// ---------- recortar / alargar ----------

// Reemplaza la entidad por sus tramos, quitando el tramo tocado en clickPt.
// cutters incluye entidades del boceto Y referencias proyectadas.
export function trimEntity(e, clickPt, cutters) {
  const cuts = [];
  for (const o of cutters) { if (o.id === e.id) continue; cuts.push(...intersectEntities(e, o)); }

  if (e.type === 'line') {
    const d = sub(e.b, e.a), l2 = dot(d, d) || 1;
    const ts = cuts.map(p => dot(sub(p, e.a), d) / l2).filter(t => t > 1e-6 && t < 1 - 1e-6).sort((x, y) => x - y);
    if (!ts.length) return []; // sin cortes: se elimina entera
    const bounds = [0, ...ts, 1];
    const tc = Math.min(1, Math.max(0, dot(sub(clickPt, e.a), d) / l2));
    let k = 0;
    while (k < bounds.length - 2 && tc > bounds[k + 1]) k++;
    const out = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      if (i === k) continue;
      const p = lerp(e.a, e.b, bounds[i]), q = lerp(e.a, e.b, bounds[i + 1]);
      if (dist(p, q) > 1e-3) out.push(makeLine(p, q));
    }
    return out;
  }

  const angOf = (p) => normAng(Math.atan2(p[1] - e.c[1], p[0] - e.c[0]));
  if (e.type === 'circle') {
    const angs = [...new Set(cuts.map(angOf))].sort((a, b) => a - b);
    if (!angs.length) return [];
    const ac = angOf(clickPt);
    const out = [];
    for (let i = 0; i < angs.length; i++) {
      const a0 = angs[i], a1 = i + 1 < angs.length ? angs[i + 1] : angs[0] + TAU;
      let x = ac; if (x < a0) x += TAU;
      const clicked = x > a0 && x < a1;
      if (!clicked && a1 - a0 > 1e-3) out.push(makeArc(e.c, e.r, a0, a1));
    }
    return out;
  }
  if (e.type === 'arc') {
    const [s0, s1] = arcSpan(e);
    const angs = cuts.map(angOf).map(a => { let x = a; if (x < s0 - 1e-9) x += TAU; return x; })
      .filter(a => a > s0 + 1e-6 && a < s1 - 1e-6).sort((a, b) => a - b);
    if (!angs.length) return [];
    const bounds = [s0, ...angs, s1];
    let ac = angOf(clickPt); if (ac < s0 - 1e-9) ac += TAU;
    let k = 0;
    while (k < bounds.length - 2 && ac > bounds[k + 1]) k++;
    const out = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      if (i === k) continue;
      if (bounds[i + 1] - bounds[i] > 1e-3) out.push(makeArc(e.c, e.r, bounds[i], bounds[i + 1]));
    }
    return out;
  }
  return [e];
}

// Alarga el extremo de la línea más cercano al clic hasta la intersección
// más próxima con otra entidad o referencia. Devuelve true si alargó.
export function extendLine(e, clickPt, others) {
  if (e.type !== 'line') return false;
  const endA = dist(clickPt, e.a) < dist(clickPt, e.b);
  const from = endA ? e.b : e.a, tip = endA ? e.a : e.b;
  const dir = norm(sub(tip, from));
  const far = [tip[0] + dir[0] * 1e5, tip[1] + dir[1] * 1e5];
  const ray = { id: '_ray', type: 'line', a: tip, b: far };
  let best = null;
  for (const o of others) {
    if (o.id === e.id) continue;
    for (const p of intersectEntities(ray, o)) {
      const t = dot(sub(p, tip), dir);
      if (t > 1e-6 && (!best || t < best.t)) best = { t, p };
    }
  }
  if (!best) return false;
  if (endA) e.a = best.p; else e.b = best.p;
  return true;
}

// ---------- encadenado de contornos (con agujeros) ----------

function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
function pointInPoly(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const centroidOf = (pts) => pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);

export function chainLoops(entities, tol = 0.7) {
  const loops = [];
  const open = [];
  const segs = [];
  for (const e of entities) {
    if (e.type === 'circle') loops.push(entityPoints(e, 48).slice(0, -1));
    else segs.push(entityPoints(e, 48));
  }
  const rem = segs.slice();
  while (rem.length) {
    let chain = rem.shift().slice();
    let progress = true;
    while (progress) {
      progress = false;
      const tail = chain[chain.length - 1];
      if (chain.length > 2 && dist(tail, chain[0]) < tol) break;
      for (let i = 0; i < rem.length; i++) {
        const s = rem[i];
        if (dist(s[0], tail) < tol) { chain = chain.concat(s.slice(1)); rem.splice(i, 1); progress = true; break; }
        if (dist(s[s.length - 1], tail) < tol) { chain = chain.concat(s.slice(0, -1).reverse()); rem.splice(i, 1); progress = true; break; }
      }
    }
    if (chain.length > 2 && dist(chain[chain.length - 1], chain[0]) < tol) {
      loops.push(chain.slice(0, -1));
    } else open.push(chain);
  }
  if (!loops.length) return { outer: null, holes: [], openCount: open.length };
  let outerIdx = 0, best = 0;
  loops.forEach((l, i) => { const a = Math.abs(polyArea(l)); if (a > best) { best = a; outerIdx = i; } });
  const outer = loops[outerIdx];
  const holes = [];
  let ignored = 0;
  loops.forEach((l, i) => {
    if (i === outerIdx) return;
    if (pointInPoly(centroidOf(l), outer)) holes.push(l);
    else ignored++;
  });
  return { outer, holes, openCount: open.length, ignored };
}

// ---------- cotas ----------
// dim = { id, kind:'len'|'dia'|'dist'|'ang', a, b?, value, at:[u,v] }
// a/b: {id:'e..'} para entidad del boceto o {ref:[[u,v],[u,v]]} para línea
// de referencia proyectada (congelada). Las referencias nunca se mueven.

export function makeDim(kind, a, b, value, at) {
  return { id: sid(), kind, a, b: b || null, value, at: [...at] };
}

function resolveEnt(entities, ref) {
  if (!ref) return null;
  if (ref.ref) return { id: '_ref', type: 'line', a: ref.ref[0], b: ref.ref[1], isRef: true };
  return entities.find(e => e.id === ref.id) || null;
}
const dirOf = (l) => norm(sub(l.b, l.a));
const midOf = (l) => lerp(l.a, l.b, 0.5);
const anchorOf = (e) => e.type === 'line' ? midOf(e) : e.c;

function lineDistTo(l, p) {
  const n = [-dirOf(l)[1], dirOf(l)[0]];
  return dot(sub(p, l.a), n); // con signo
}
function lineLineInf(l1, l2) {
  const r = sub(l1.b, l1.a), s = sub(l2.b, l2.a);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-12) return null;
  const t = cross(sub(l2.a, l1.a), s) / den;
  return [l1.a[0] + t * r[0], l1.a[1] + t * r[1]];
}

export function measureDim(entities, dim) {
  const A = resolveEnt(entities, dim.a), B = resolveEnt(entities, dim.b);
  if (!A || (dim.b && !B)) return null;
  switch (dim.kind) {
    case 'len': return dist(A.a, A.b);
    case 'dia': return A.r * 2;
    case 'ang': {
      const d1 = dirOf(A), d2 = dirOf(B);
      return Math.abs(Math.atan2(cross(d1, d2), dot(d1, d2))) * 180 / Math.PI;
    }
    case 'dist': {
      if (A.type === 'line' && B.type === 'line') return Math.abs(lineDistTo(A, midOf(B)));
      if (A.type === 'line') return Math.abs(lineDistTo(A, B.c));
      if (B.type === 'line') return Math.abs(lineDistTo(B, A.c));
      return dist(A.c, B.c);
    }
  }
  return null;
}

// mueve extremos coincidentes de otras líneas para que el contorno siga cerrado
function setEndpoint(entities, exceptId, oldPt, newPt, tol = 0.7) {
  for (const e of entities) {
    if (e.id === exceptId || e.type !== 'line') continue;
    if (dist(e.a, oldPt) < tol) e.a = [...newPt];
    if (dist(e.b, oldPt) < tol) e.b = [...newPt];
  }
}
function translateEntity(entities, e, delta) {
  if (e.type === 'line') {
    const oa = [...e.a], ob = [...e.b];
    e.a = add(e.a, delta); e.b = add(e.b, delta);
    setEndpoint(entities, e.id, oa, e.a);
    setEndpoint(entities, e.id, ob, e.b);
  } else {
    e.c = add(e.c, delta);
  }
}
function rotatePt(p, o, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), d = sub(p, o);
  return [o[0] + d[0] * c - d[1] * s, o[1] + d[0] * s + d[1] * c];
}

// Aplica la cota con un valor nuevo mutando las entidades. Devuelve true si pudo.
export function applyDim(entities, dim, value) {
  const A = resolveEnt(entities, dim.a), B = resolveEnt(entities, dim.b);
  if (!A || (dim.b && !B)) return false;
  if (!(value > 0)) return false;

  if (dim.kind === 'len') {
    if (A.isRef) return false;
    const d = dirOf(A), ob = [...A.b];
    A.b = add(A.a, scale(d, value));
    setEndpoint(entities, A.id, ob, A.b);
  } else if (dim.kind === 'dia') {
    if (A.isRef) return false;
    A.r = value / 2;
  } else if (dim.kind === 'dist') {
    let target = B, fixed = A;
    if (B.isRef) { target = A; fixed = B; }
    if (target.isRef) return false;
    if (fixed.type === 'line') {
      const n = [-dirOf(fixed)[1], dirOf(fixed)[0]];
      const cur = lineDistTo(fixed, anchorOf(target));
      const delta = (Math.sign(cur) || 1) * value - cur;
      translateEntity(entities, target, scale(n, delta));
    } else {
      const dir = norm(sub(anchorOf(target), fixed.c));
      const cur = dist(anchorOf(target), fixed.c);
      translateEntity(entities, target, scale(dir, value - cur));
    }
  } else if (dim.kind === 'ang') {
    let target = B, fixed = A;
    if (B.isRef) { target = A; fixed = B; }
    if (target.isRef || target.type !== 'line' || fixed.type !== 'line') return false;
    const P = lineLineInf(fixed, target);
    if (!P) return false;
    const cur = Math.atan2(cross(dirOf(fixed), dirOf(target)), dot(dirOf(fixed), dirOf(target)));
    const want = (Math.sign(cur) || 1) * value * Math.PI / 180;
    const rot = want - cur;
    const oa = [...target.a], ob = [...target.b];
    target.a = rotatePt(target.a, P, rot);
    target.b = rotatePt(target.b, P, rot);
    setEndpoint(entities, target.id, oa, target.a);
    setEndpoint(entities, target.id, ob, target.b);
  } else {
    return false;
  }
  dim.value = value;
  return true;
}

// ---------- reconocimiento de trazos a mano (modo lápiz) ----------

export function douglasPeucker(pts, eps) {
  if (pts.length < 3) return pts.slice();
  let maxD = 0, idx = 0;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const d = sub(b, a), len = Math.hypot(...d) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const dev = Math.abs(cross(d, sub(pts[i], a))) / len;
    if (dev > maxD) { maxD = dev; idx = i; }
  }
  if (maxD <= eps) return [a, b];
  const left = douglasPeucker(pts.slice(0, idx + 1), eps);
  const right = douglasPeucker(pts.slice(idx), eps);
  return left.slice(0, -1).concat(right);
}

// Interpreta un trazo a mano: círculo, línea recta (con ajuste a H/V) o polilínea.
export function fitStroke(raw) {
  const pts = [];
  for (const p of raw) if (!pts.length || dist(p, pts[pts.length - 1]) > 0.4) pts.push(p);
  if (pts.length < 2) return null;
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  const closed = dist(pts[0], pts[pts.length - 1]) < Math.max(4, 0.18 * len);

  if (closed && pts.length >= 8) {
    const c = centroidOf(pts);
    const rs = pts.map(p => dist(p, c));
    const r = rs.reduce((s, x) => s + x, 0) / rs.length;
    const err = Math.sqrt(rs.reduce((s, x) => s + (x - r) ** 2, 0) / rs.length);
    if (r > 1 && err < Math.max(1.2, 0.14 * r)) {
      return { type: 'circle', c: [Math.round(c[0] * 2) / 2, Math.round(c[1] * 2) / 2], r: Math.round(r * 2) / 2 };
    }
  }

  const chord = dist(pts[0], pts[pts.length - 1]);
  if (chord > 1) {
    const d = sub(pts[pts.length - 1], pts[0]);
    let maxDev = 0;
    for (const p of pts) maxDev = Math.max(maxDev, Math.abs(cross(d, sub(p, pts[0]))) / (chord || 1));
    if (!closed && maxDev < Math.max(1.8, 0.06 * chord)) {
      let a = pts[0].slice(), b = pts[pts.length - 1].slice();
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const snap = [0, Math.PI / 2, Math.PI, -Math.PI / 2, -Math.PI].find(s => Math.abs(ang - s) < 6 * Math.PI / 180);
      if (snap !== undefined) { // ajustar a horizontal/vertical
        if (Math.abs(Math.cos(snap)) > 0.5) b[1] = a[1]; else b[0] = a[0];
      }
      return { type: 'line', a, b };
    }
  }

  const simp = douglasPeucker(pts, 2.2);
  return { type: 'poly', pts: simp, closed };
}
