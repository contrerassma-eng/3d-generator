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

// todos los contornos cerrados (círculos + cadenas de líneas/arcos)
export function allLoops(entities, tol = 0.7) {
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
  return { loops, openCount: open.length };
}

// clave estable de un contorno (centroide redondeado) para selección de perfiles
export const loopKey = (pts) => {
  const c = centroidOf(pts);
  // centroide + área: distingue contornos concéntricos
  return `${Math.round(c[0] * 10)},${Math.round(c[1] * 10)}:${Math.round(Math.abs(polyArea(pts)))}`;
};

// Regiones por paridad tipo Inventor: profundidad de anidado par = sólido,
// impar = agujero de su padre. excludedKeys quita contornos de la extrusión.
export function regions(entities, excludedKeys = [], tol = 0.7) {
  const { loops, openCount } = allLoops(entities, tol);
  const excl = new Set(excludedKeys);
  const use = loops.filter(l => !excl.has(loopKey(l)));
  const info = use.map(l => ({ pts: l, area: Math.abs(polyArea(l)), parent: -1 }));
  for (let i = 0; i < info.length; i++) {
    let best = -1;
    for (let j = 0; j < info.length; j++) {
      if (i === j || info[j].area <= info[i].area) continue;
      if (pointInPoly(centroidOf(info[i].pts), info[j].pts)) {
        if (best === -1 || info[j].area < info[best].area) best = j;
      }
    }
    info[i].parent = best;
  }
  const depthOf = (i) => { let d = 0, p = info[i].parent; while (p !== -1) { d++; p = info[p].parent; } return d; };
  const regs = [];
  info.forEach((l, i) => {
    if (depthOf(i) % 2 !== 0) return;
    const holes = info.filter((h) => h.parent === i).map(h => h.pts);
    regs.push({ outer: l.pts, holes, key: loopKey(l.pts) });
  });
  return { regions: regs, loops, openCount };
}

// compatibilidad: contorno principal (región más grande) + sus agujeros
export function chainLoops(entities, tol = 0.7) {
  const { regions: regs, openCount } = regions(entities, [], tol);
  if (!regs.length) return { outer: null, holes: [], openCount };
  let best = regs[0];
  for (const r of regs) if (Math.abs(polyArea(r.outer)) > Math.abs(polyArea(best.outer))) best = r;
  return { outer: best.outer, holes: best.holes, openCount, ignored: regs.length - 1 };
}

export { pointInPoly, centroidOf };

// ---------- puntos notables (snap/acotado) ----------

export function snapPoints(e) {
  if (e.type === 'line') return [
    { p: [...e.a], kind: 'extremo' }, { p: [...e.b], kind: 'extremo' },
    { p: lerp(e.a, e.b, 0.5), kind: 'medio' },
  ];
  if (e.type === 'circle') {
    const { c, r } = e;
    return [
      { p: [...c], kind: 'centro' },
      { p: [c[0] + r, c[1]], kind: 'cuadrante' }, { p: [c[0] - r, c[1]], kind: 'cuadrante' },
      { p: [c[0], c[1] + r], kind: 'cuadrante' }, { p: [c[0], c[1] - r], kind: 'cuadrante' },
    ];
  }
  if (e.type === 'arc') {
    const [pa, pb] = arcEndpoints(e);
    const [a0, a1] = arcSpan(e);
    const am = (a0 + a1) / 2;
    return [
      { p: pa, kind: 'extremo' }, { p: pb, kind: 'extremo' },
      { p: [...e.c], kind: 'centro' },
      { p: [e.c[0] + e.r * Math.cos(am), e.c[1] + e.r * Math.sin(am)], kind: 'medio' },
    ];
  }
  return [];
}

// puntos de tangencia desde un punto externo p a un círculo (c, r)
export function tangentPoints(c, r, p) {
  const d = dist(p, c);
  if (d <= r + 1e-9) return [];
  const a = Math.atan2(p[1] - c[1], p[0] - c[0]);
  const t = Math.acos(r / d);
  return [
    [c[0] + r * Math.cos(a + t), c[1] + r * Math.sin(a + t)],
    [c[0] + r * Math.cos(a - t), c[1] + r * Math.sin(a - t)],
  ];
}

// mueve una entidad completa arrastrando extremos coincidentes de las vecinas
export function moveEntity(entities, e, delta) { translateEntity(entities, e, delta); }

// re-aplica las cotas con candado (dirigen la geometría tras un movimiento)
export function applyLockedDims(entities, dims, exceptId) {
  for (const d of dims) {
    if (d.locked && d.id !== exceptId) applyDim(entities, d, d.value);
  }
}

// ---------- restricciones geométricas persistentes + solver (§2.3, §5.1) ----------
// constraint = { id, type, a?, b? }  (a/b = id de entidad)
//   'horizontal' | 'vertical' {a}          — línea a horizontal / vertical
//   'parallel' | 'perpendicular' {a,b}     — línea a ∥ / ⟂ a línea b
//   'equal' {a,b}                          — misma longitud (líneas) o radio (círc/arco)
// Solver por relajación: cada restricción "proyecta" la geometría hacia su
// cumplimiento; se itera hasta converger. Usa setEndpoint para arrastrar los
// extremos coincidentes de las vecinas, así las cadenas siguen unidas sin
// necesidad de una restricción de coincidencia explícita.
let _cid = 0;
export const cid = () => `c${(++_cid).toString(36)}${Date.now().toString(36).slice(-3)}`;
export function makeConstraint(type, a, b) { return { id: cid(), type, a: a || null, b: b || null }; }

const rotPtAbout = (p, o, ang) => rotatePt(p, o, ang);

// gira la línea e alrededor de su punto medio hasta el ángulo objetivo (rad),
// eligiendo el sentido más cercano; arrastra extremos coincidentes. Devuelve el
// desplazamiento máximo aplicado (para medir convergencia).
function rotateLineTo(entities, e, targetAng) {
  const cur = Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]);
  let diff = ((targetAng - cur + Math.PI) % TAU + TAU) % TAU - Math.PI; // a [-π,π]
  // una línea no tiene sentido: acepta también el opuesto (más cercano)
  if (diff > Math.PI / 2) diff -= Math.PI; else if (diff < -Math.PI / 2) diff += Math.PI;
  if (Math.abs(diff) < 1e-7) return 0;
  const o = midOf(e);
  const oa = [...e.a], ob = [...e.b];
  const na = rotPtAbout(e.a, o, diff), nb = rotPtAbout(e.b, o, diff);
  e.a = na; e.b = nb;
  setEndpoint(entities, e.id, oa, na);
  setEndpoint(entities, e.id, ob, nb);
  return Math.max(dist(oa, na), dist(ob, nb));
}

const ptOf = (e, w) => w === 'c' ? e.c : e[w];         // 'a'|'b'|'c'
function setPtOf(entities, e, w, p) {
  if (w === 'c') { e.c = [...p]; return; }
  const old = [...e[w]]; e[w] = [...p]; setEndpoint(entities, e.id, old, p);
}

function applyConstraintOnce(entities, c) {
  const A = entities.find(e => e.id === c.a);
  const B = c.b ? entities.find(e => e.id === c.b) : null;
  if (!A || (c.b && !B)) return 0;
  if (c.type === 'coincident') {
    const wa = c.pa || 'a', wb = c.pb || 'a';
    const pa = ptOf(A, wa), pb = ptOf(B, wb);
    if (!pa || !pb) return 0;
    const mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    setPtOf(entities, A, wa, mid); setPtOf(entities, B, wb, mid);
    return dist(pa, mid);
  }
  if (c.type === 'concentric') {
    if (!A.c || !B.c) return 0;
    const mid = [(A.c[0] + B.c[0]) / 2, (A.c[1] + B.c[1]) / 2];
    const mv = Math.max(dist(A.c, mid), dist(B.c, mid));
    A.c = [...mid]; B.c = [...mid]; return mv;
  }
  if (c.type === 'collinear') {
    if (A.type !== 'line' || B.type !== 'line') return 0;
    let mv = rotateLineTo(entities, B, Math.atan2(A.b[1] - A.a[1], A.b[0] - A.a[0]));
    const dv = sub(A.b, A.a), L = Math.hypot(dv[0], dv[1]) || 1, nn = [-dv[1] / L, dv[0] / L];
    const mb = midOf(B), ds = (mb[0] - A.a[0]) * nn[0] + (mb[1] - A.a[1]) * nn[1];
    if (Math.abs(ds) > 1e-9) { translateEntity(entities, B, [-nn[0] * ds, -nn[1] * ds]); mv = Math.max(mv, Math.abs(ds)); }
    return mv;
  }
  if (c.type === 'tangent') {
    const line = A.type === 'line' ? A : (B.type === 'line' ? B : null);
    const circ = (A.type === 'circle' || A.type === 'arc') ? A : ((B.type === 'circle' || B.type === 'arc') ? B : null);
    if (line && circ) {
      const dv = sub(line.b, line.a), L = Math.hypot(dv[0], dv[1]) || 1, nn = [-dv[1] / L, dv[0] / L];
      const ds = (circ.c[0] - line.a[0]) * nn[0] + (circ.c[1] - line.a[1]) * nn[1];
      const delta = (Math.sign(ds) || 1) * circ.r - ds;
      circ.c = [circ.c[0] + nn[0] * delta, circ.c[1] + nn[1] * delta];
      return Math.abs(delta);
    }
    if (circ && ((A.type === 'circle' || A.type === 'arc') && (B.type === 'circle' || B.type === 'arc'))) {
      const d = dist(A.c, B.c) || 1e-6, diff = (A.r + B.r) - d, u = [(B.c[0] - A.c[0]) / d, (B.c[1] - A.c[1]) / d];
      A.c = [A.c[0] - u[0] * diff / 2, A.c[1] - u[1] * diff / 2];
      B.c = [B.c[0] + u[0] * diff / 2, B.c[1] + u[1] * diff / 2];
      return Math.abs(diff) / 2;
    }
    return 0;
  }
  if (c.type === 'horizontal' || c.type === 'vertical') {
    if (A.type !== 'line') return 0;
    const axis = c.type === 'horizontal' ? 1 : 0; // y o x a igualar
    const avg = (A.a[axis] + A.b[axis]) / 2;
    let mv = 0;
    for (const end of ['a', 'b']) {
      const old = [...A[end]]; if (Math.abs(A[end][axis] - avg) < 1e-9) continue;
      const np = [...A[end]]; np[axis] = avg; A[end] = np; setEndpoint(entities, A.id, old, np);
      mv = Math.max(mv, Math.abs(old[axis] - avg));
    }
    return mv;
  }
  if (c.type === 'parallel' || c.type === 'perpendicular') {
    if (A.type !== 'line' || B.type !== 'line') return 0;
    const angB = Math.atan2(B.b[1] - B.a[1], B.b[0] - B.a[0]);
    return rotateLineTo(entities, A, angB + (c.type === 'perpendicular' ? Math.PI / 2 : 0));
  }
  if (c.type === 'equal') {
    if (A.type === 'line' && B.type === 'line') {
      const la = dist(A.a, A.b), lb = dist(B.a, B.b), avg = (la + lb) / 2;
      let mv = 0;
      for (const e of [A, B]) {
        const L = dist(e.a, e.b); if (L < 1e-9 || Math.abs(L - avg) < 1e-9) continue;
        const d = norm(sub(e.b, e.a)); const ob = [...e.b];
        e.b = add(e.a, scale(d, avg)); setEndpoint(entities, e.id, ob, e.b);
        mv = Math.max(mv, dist(ob, e.b));
      }
      return mv;
    }
    if ((A.type === 'circle' || A.type === 'arc') && (B.type === 'circle' || B.type === 'arc')) {
      const avg = (A.r + B.r) / 2, mv = Math.max(Math.abs(A.r - avg), Math.abs(B.r - avg));
      A.r = avg; B.r = avg; return mv;
    }
  }
  if (c.type === 'symmetric') {
    const L = entities.find(e => e.id === c.axis);
    if (!L || L.type !== 'line') return 0;
    const reflect = (p) => {
      const d = norm(sub(L.b, L.a)); const t = dot(sub(p, L.a), d);
      const proj = add(L.a, scale(d, t)); return [2 * proj[0] - p[0], 2 * proj[1] - p[1]];
    };
    let mv = 0;
    const pull = (e, w, target) => { // mueve el punto 'w' de 'e' la mitad hacia target
      const p = ptOf(e, w); const np = [(p[0] + target[0]) / 2, (p[1] + target[1]) / 2];
      mv = Math.max(mv, dist(p, np)); setPtOf(entities, e, w, np);
    };
    if (A.type === 'line' && B.type === 'line') {
      pull(B, 'a', reflect(A.a)); pull(B, 'b', reflect(A.b));
      pull(A, 'a', reflect(B.a)); pull(A, 'b', reflect(B.b));
    } else if (A.c && B.c) {
      pull(B, 'c', reflect(A.c)); pull(A, 'c', reflect(B.c));
      const avg = (A.r + B.r) / 2; mv = Math.max(mv, Math.abs(A.r - avg)); A.r = avg; B.r = avg;
    }
    return mv;
  }
  return 0;
}

const cloneGeom = (e) => ({ a: e.a ? [...e.a] : null, b: e.b ? [...e.b] : null, c: e.c ? [...e.c] : null, r: e.r });
function restoreGeom(e, s) {
  if (s.a) e.a = [...s.a]; if (s.b) e.b = [...s.b]; if (s.c) e.c = [...s.c];
  if (s.r != null) e.r = s.r;
}

// solver principal: itera todas las restricciones + cotas con candado. Las
// entidades con restricción 'fix' (ancladas) se restauran tras cada iteración,
// así nunca se mueven y las demás se relajan contra ellas.
export function solveSketch(entities, constraints = [], dims = [], iters = 80) {
  if (!constraints.length && !(dims || []).some(d => d.locked)) return;
  const fixedIds = new Set(constraints.filter(c => c.type === 'fix').map(c => c.a));
  const snap = new Map();
  if (fixedIds.size) for (const e of entities) if (fixedIds.has(e.id)) snap.set(e.id, cloneGeom(e));
  for (let it = 0; it < iters; it++) {
    let maxMove = 0;
    for (const c of constraints) { if (c.type === 'fix') continue; maxMove = Math.max(maxMove, applyConstraintOnce(entities, c)); }
    for (const d of dims) if (d.locked) applyDim(entities, d, d.value);
    if (snap.size) for (const e of entities) if (snap.has(e.id)) restoreGeom(e, snap.get(e.id));
    if (maxMove < 1e-7) break;
  }
}

// residual: cuánto incumple cada restricción (0 = satisfecha). Sirve para avisar
// (nunca fallar en silencio) cuando el sistema queda sobre-restringido.
export function constraintResidual(entities, c) {
  const A = entities.find(e => e.id === c.a);
  const B = c.b ? entities.find(e => e.id === c.b) : null;
  if (!A || (c.b && !B)) return 0;
  const dirAng = (e) => Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]);
  const angDiff = (x, y) => { let d = Math.abs(((x - y) % Math.PI + Math.PI) % Math.PI); return Math.min(d, Math.PI - d); };
  if (c.type === 'fix') return 0; // anclada: sin residual (se restaura en el solver)
  if (c.type === 'horizontal') return A.type === 'line' ? Math.abs(A.a[1] - A.b[1]) : 0;
  if (c.type === 'vertical') return A.type === 'line' ? Math.abs(A.a[0] - A.b[0]) : 0;
  if (c.type === 'parallel') return angDiff(dirAng(A), dirAng(B));
  if (c.type === 'perpendicular') return Math.abs(angDiff(dirAng(A), dirAng(B)) - Math.PI / 2);
  if (c.type === 'collinear') {
    const dv = sub(A.b, A.a), L = Math.hypot(dv[0], dv[1]) || 1, nn = [-dv[1] / L, dv[0] / L];
    const d1 = Math.abs((B.a[0] - A.a[0]) * nn[0] + (B.a[1] - A.a[1]) * nn[1]);
    const d2 = Math.abs((B.b[0] - A.a[0]) * nn[0] + (B.b[1] - A.a[1]) * nn[1]);
    return Math.max(d1, d2);
  }
  if (c.type === 'coincident') return dist(ptOf(A, c.pa || 'a'), ptOf(B, c.pb || 'a'));
  if (c.type === 'concentric') return A.c && B.c ? dist(A.c, B.c) : 0;
  if (c.type === 'symmetric') {
    const L = entities.find(e => e.id === c.axis);
    if (!L || L.type !== 'line') return 0;
    const reflect = (p) => { const d = norm(sub(L.b, L.a)); const t = dot(sub(p, L.a), d); const pr = add(L.a, scale(d, t)); return [2 * pr[0] - p[0], 2 * pr[1] - p[1]]; };
    if (A.type === 'line' && B.type === 'line') return Math.max(dist(B.a, reflect(A.a)), dist(B.b, reflect(A.b)));
    if (A.c && B.c) return dist(B.c, reflect(A.c));
    return 0;
  }
  if (c.type === 'tangent') {
    const line = A.type === 'line' ? A : (B.type === 'line' ? B : null);
    const circ = (A.c != null) ? A : (B.c != null ? B : null);
    if (line && circ) {
      const dv = sub(line.b, line.a), L = Math.hypot(dv[0], dv[1]) || 1, nn = [-dv[1] / L, dv[0] / L];
      return Math.abs(Math.abs((circ.c[0] - line.a[0]) * nn[0] + (circ.c[1] - line.a[1]) * nn[1]) - circ.r);
    }
    if (A.c && B.c) return Math.abs(dist(A.c, B.c) - (A.r + B.r));
    return 0;
  }
  if (c.type === 'equal') {
    if (A.type === 'line' && B.type === 'line') return Math.abs(dist(A.a, A.b) - dist(B.a, B.b));
    if (A.r != null && B.r != null) return Math.abs(A.r - B.r);
  }
  return 0;
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

// ---------- herramientas de construcción (arco, polígono, offset, empalme) ----------

// arco por centro-inicio-fin (CCW desde inicio hacia fin)
export function makeArcCSE(c, start, end) {
  const r = dist(c, start);
  const a0 = Math.atan2(start[1] - c[1], start[0] - c[0]);
  const a1 = Math.atan2(end[1] - c[1], end[0] - c[0]);
  return makeArc(c, r, a0, a1);
}

// polígono regular por centro y un vértice
export function regularPolygon(c, vertex, n) {
  const r = dist(c, vertex);
  if (r < 0.1 || n < 3) return [];
  const a0 = Math.atan2(vertex[1] - c[1], vertex[0] - c[0]);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + i * TAU / n;
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  const lines = [];
  for (let i = 0; i < n; i++) lines.push(makeLine(pts[i], pts[(i + 1) % n]));
  return lines;
}

// equidistancia: copia paralela a distancia d, hacia el lado de sidePt
export function offsetEntity(e, d, sidePt) {
  if (!(d > 0)) return null;
  if (e.type === 'line') {
    const dir = norm(sub(e.b, e.a));
    let n = [-dir[1], dir[0]];
    if (dot(sub(sidePt, e.a), n) < 0) n = [-n[0], -n[1]];
    return makeLine(add(e.a, scale(n, d)), add(e.b, scale(n, d)));
  }
  if (e.type === 'circle' || e.type === 'arc') {
    const outside = dist(sidePt, e.c) > e.r;
    const nr = outside ? e.r + d : e.r - d;
    if (nr <= 0.1) return null;
    return e.type === 'circle' ? makeCircle(e.c, nr) : makeArc(e.c, nr, e.a0, e.a1);
  }
  return null;
}

// empalme (fillet 2D): redondea la esquina entre dos líneas con radio r,
// recortando ambas a los puntos de tangencia y agregando el arco.
export function filletLines(entities, l1, l2, r) {
  if (l1.type !== 'line' || l2.type !== 'line' || !(r > 0)) return false;
  const P = lineLineInf(l1, l2);
  if (!P) return false;
  const dirFrom = (l) => {
    const far = dist(l.a, P) > dist(l.b, P) ? l.a : l.b;
    return norm(sub(far, P));
  };
  const d1 = dirFrom(l1), d2 = dirFrom(l2);
  const theta = Math.acos(Math.max(-1, Math.min(1, dot(d1, d2))));
  if (theta < 0.03 || theta > Math.PI - 0.03) return false; // casi paralelas
  const t = r / Math.tan(theta / 2);
  const T1 = add(P, scale(d1, t)), T2 = add(P, scale(d2, t));
  if (t > Math.max(dist(l1.a, P), dist(l1.b, P)) || t > Math.max(dist(l2.a, P), dist(l2.b, P))) return false; // radio no cabe
  const C = add(P, scale(norm(add(d1, d2)), r / Math.sin(theta / 2)));
  const snapEnd = (l, T) => { if (dist(l.a, P) < dist(l.b, P)) l.a = [...T]; else l.b = [...T]; };
  snapEnd(l1, T1);
  snapEnd(l2, T2);
  const s0 = normAng(Math.atan2(T1[1] - C[1], T1[0] - C[0]));
  const s1 = normAng(Math.atan2(T2[1] - C[1], T2[0] - C[0]));
  let span = s1 - s0;
  if (span < 0) span += TAU;
  entities.push(span <= Math.PI ? makeArc(C, r, s0, s0 + span) : makeArc(C, r, s1, s1 + (TAU - span)));
  return true;
}

// ---------- selección por ventana (AutoCAD) y copia ----------

// 'window' = totalmente contenida; 'crossing' = tocada por el rectángulo
export function entityInRect(e, p1, p2, mode) {
  const minX = Math.min(p1[0], p2[0]), maxX = Math.max(p1[0], p2[0]);
  const minY = Math.min(p1[1], p2[1]), maxY = Math.max(p1[1], p2[1]);
  const pts = entityPoints(e, 32);
  const inside = (p) => p[0] >= minX - 1e-9 && p[0] <= maxX + 1e-9 && p[1] >= minY - 1e-9 && p[1] <= maxY + 1e-9;
  if (mode === 'window') return pts.length > 0 && pts.every(inside);
  if (pts.some(inside)) return true;
  const corners = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, minY]];
  const edges = [
    { id: '_r1', type: 'line', a: [minX, minY], b: [maxX, minY] },
    { id: '_r2', type: 'line', a: [maxX, minY], b: [maxX, maxY] },
    { id: '_r3', type: 'line', a: [maxX, maxY], b: [minX, maxY] },
    { id: '_r4', type: 'line', a: [minX, maxY], b: [minX, minY] },
  ];
  for (const edge of edges) if (intersectEntities(edge, e).length) return true;
  return false;
}

// copia desplazada de entidades (con ids nuevos)
export function copyEntities(entities, delta) {
  const out = [];
  for (const e of entities) {
    if (e.type === 'line') out.push(makeLine(add(e.a, delta), add(e.b, delta)));
    else if (e.type === 'circle') out.push(makeCircle(add(e.c, delta), e.r));
    else if (e.type === 'arc') out.push(makeArc(add(e.c, delta), e.r, e.a0, e.a1));
  }
  return out;
}

// espejo de entidades respecto a la línea a-b (copias con ids nuevos)
export function mirrorEntities(entities, a, b) {
  const d = norm(sub(b, a));
  const lineAng = Math.atan2(d[1], d[0]);
  const refl = (p) => {
    const q = sub(p, a);
    const t = dot(q, d);
    const proj = add(a, scale(d, t));
    return [2 * proj[0] - p[0], 2 * proj[1] - p[1]];
  };
  const reflAng = (th) => 2 * lineAng - th;
  const out = [];
  for (const e of entities) {
    if (e.type === 'line') out.push(makeLine(refl(e.a), refl(e.b)));
    else if (e.type === 'circle') out.push(makeCircle(refl(e.c), e.r));
    else if (e.type === 'arc') out.push(makeArc(refl(e.c), e.r, reflAng(e.a1), reflAng(e.a0)));
  }
  return out;
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

// Simplifica un lazo CERRADO: parte en el punto más lejano al inicio (para que
// Douglas-Peucker no colapse sobre extremos coincidentes) y une las dos mitades.
function simplifyClosed(pts, eps) {
  if (pts.length < 4) return pts.slice();
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const d = dist(pts[0], pts[i]); if (d > fd) { fd = d; far = i; } }
  const a = douglasPeucker(pts.slice(0, far + 1), eps);
  const b = douglasPeucker(pts.slice(far), eps);
  const merged = a.concat(b.slice(1));
  if (merged.length > 1 && dist(merged[0], merged[merged.length - 1]) < 1e-6) merged.pop();
  return merged;
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

  // rectángulo: contorno cerrado que se simplifica a 4 esquinas ~rectas
  if (closed) {
    const corners = simplifyClosed(pts, Math.max(2.5, 0.03 * len));
    if (corners.length === 4) {
      let right = true;
      for (let i = 0; i < 4; i++) {
        const a = corners[(i + 3) % 4], b = corners[i], c = corners[(i + 1) % 4];
        const v1 = norm(sub(a, b)), v2 = norm(sub(c, b));
        if (Math.abs(v1[0] * v2[0] + v1[1] * v2[1]) > 0.33) { right = false; break; } // ~71°–109°
      }
      const xs = corners.map(p => p[0]), ys = corners.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const dx = x1 - x0, dy = y1 - y0;
      const aligned = corners.every(p =>
        (Math.abs(p[0] - x0) < 0.18 * dx || Math.abs(p[0] - x1) < 0.18 * dx) &&
        (Math.abs(p[1] - y0) < 0.18 * dy || Math.abs(p[1] - y1) < 0.18 * dy));
      if (right && aligned && dx > 2 && dy > 2) {
        const R = (v) => Math.round(v * 2) / 2;
        return { type: 'rect', a: [R(x0), R(y0)], b: [R(x1), R(y1)] };
      }
    }
  }

  const simp = closed ? simplifyClosed(pts, 2.2) : douglasPeucker(pts, 2.2);
  return { type: 'poly', pts: simp, closed };
}
