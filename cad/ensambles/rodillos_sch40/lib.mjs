// lib.mjs — primitivas de ensamble para la TRANSFERENCIA 90° DE BANDAS ANGOSTAS
// (NBT90). Emite piezas en formato `foto3d-cad` (las mismas que consume
// cad/js/model.js). Unidades: mm, Z arriba. No importa three: solo produce JSON.
//
// Convenciones del proyecto (iguales a gen_transfer90.mjs):
//   - `box`  crece en +Z desde `at` (centro de la base);
//   - `cyl`  crece en `dir` desde `at` (centro de la cara inicial);
//   - `hole` corta en `dir` desde `at`;
//   - `sketch*` extruye un contorno cerrado desde el plano indicado.
//
// Capas de información (regla de oro del repo): todo lo de aquí es geometría
// `user` (decisión de diseño) o `web` (dimensión de catálogo con procedencia);
// nada se presenta como medido salvo lo que venga de analisis/*.json.

// ---------------------------------------------------------------------------
// Acumulador de piezas
// ---------------------------------------------------------------------------
export class Ensamble {
  constructor() { this.parts = []; this.nf = 0; this.np = 0; }

  fid() { return `f${++this.nf}`; }

  /** Agrega una pieza; `anchor` es su origen local (las features se relativizan). */
  addPart(name, color, anchor, features, extra = {}) {
    const [ax, ay, az] = anchor;
    for (const f of features) f.at = [f.at[0] - ax, f.at[1] - ay, f.at[2] - az];
    const p = {
      id: `p${++this.np}_${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)}`,
      name, color, pos: [ax, ay, az], quat: [0, 0, 0, 1],
      fixed: this.parts.length === 0, visible: true, ...extra, features,
    };
    this.parts.push(p);
    return p;
  }

  /** Une las piezas de otro ensamble (para componer módulos). */
  merge(otro) {
    for (const p of otro.parts) { p.fixed = false; this.parts.push(p); }
    this.nf += otro.nf; this.np += otro.np;
    return this;
  }
}

// ---------------------------------------------------------------------------
// Features primitivas
// ---------------------------------------------------------------------------
export const r2 = (v) => Math.round(v * 100) / 100;
export const IN = 25.4;                       // el equipo original es imperial
export const pulg = (frac) => r2(frac * IN);

let _f = 0;
const nid = () => `f${++_f}`;

export const box = (name, at, w, d, h, op = 'union') =>
  ({ id: nid(), name, shape: 'box', op, at: [...at], dir: [0, 0, 1], params: { w: r2(w), d: r2(d), h: r2(h) } });

export const cyl = (name, at, dir, dia, h, op = 'union') =>
  ({ id: nid(), name, shape: 'cylinder', op, at: [...at], dir: [...dir], params: { dia: r2(dia), h: r2(h) } });

export const hole = (name, at, dir, dia, depth = 0, through = true) =>
  ({ id: nid(), name, shape: 'hole', op: 'cut', at: [...at], dir: [...dir], params: { dia: r2(dia), depth: r2(depth), through } });

/** Boceto en plano XZ (normal −Y): pts en (x, z), extruido `h` hacia +Y desde yFace. */
export const sketchXZ = (name, yFace, pts, h, op = 'union') =>
  ({ id: nid(), name, shape: 'sketch', op, at: [0, yFace, 0], dir: [0, -1, 0], params: { pts: pts.map(p => [r2(p[0]), r2(p[1])]), h: r2(h), u: [1, 0, 0] } });

/** Boceto en plano YZ (normal +X): pts en (y, z), extruido `h` hacia −X desde xFace. */
export const sketchYZ = (name, xFace, pts, h, op = 'union') =>
  ({ id: nid(), name, shape: 'sketch', op, at: [xFace, 0, 0], dir: [1, 0, 0], params: { pts: pts.map(p => [r2(p[0]), r2(p[1])]), h: r2(h), u: [0, 1, 0] } });

/** Boceto en plano XY (normal +Z): pts en (x, y), extruido `h` hacia arriba desde zFace. */
export const sketchXY = (name, zFace, pts, h, op = 'union') =>
  ({ id: nid(), name, shape: 'sketch', op, at: [0, 0, zFace], dir: [0, 0, 1], params: { pts: pts.map(p => [r2(p[0]), r2(p[1])]), h: r2(h), u: [1, 0, 0] } });

/** Revolución de un perfil (h = a lo largo del eje, r = radio) alrededor de un eje.
 *  `eje` es 'x' | 'y' | 'z'; el perfil se da como [[h, r], ...] con r ≥ 0. */
export function revolve(name, at, eje, perfil, op = 'union', angulo = 360) {
  const ents = [];
  const pts = perfil.map(p => [r2(p[0]), r2(p[1])]);
  for (let i = 0; i < pts.length; i++) {
    ents.push({ id: `e${_f}_${i}`, type: 'line', a: pts[i], b: pts[(i + 1) % pts.length] });
  }
  const plano = {
    x: { dir: [0, 0, 1], u: [1, 0, 0] },   // perfil en XY: h→X, r→Y, gira en torno a X
    y: { dir: [1, 0, 0], u: [0, 1, 0] },   // perfil en YZ: h→Y, r→Z, gira en torno a Y
    z: { dir: [0, 1, 0], u: [0, 0, 1] },   // perfil en ZX: h→Z, r→X, gira en torno a Z
  }[eje];
  return {
    id: nid(), name, shape: 'revolve', op, at: [...at], dir: plano.dir,
    params: { entities: ents, axis: { a: [0, 0], b: [1, 0] }, u: plano.u, angle: angulo },
  };
}

// ---------------------------------------------------------------------------
// Geometría 2D de apoyo
// ---------------------------------------------------------------------------
export function arcoPts(cx, cy, r, a0, a1, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}

/** Rectángulo con esquinas redondeadas (contorno cerrado CCW). */
export function rectR(x0, y0, x1, y1, r = 0, n = 8) {
  if (r <= 0) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const H = Math.PI / 2;
  return [
    ...arcoPts(x1 - r, y0 + r, r, -H, 0, n), ...arcoPts(x1 - r, y1 - r, r, 0, H, n),
    ...arcoPts(x0 + r, y1 - r, r, H, 2 * H, n), ...arcoPts(x0 + r, y0 + r, r, 2 * H, 3 * H, n),
  ];
}

/** Colisa (ranura de ajuste) horizontal o vertical: contorno cerrado. */
export function colisa(cx, cy, largo, ancho, vertical = false, n = 10) {
  const r = ancho / 2, e = Math.max(0, largo / 2 - r);
  const H = Math.PI / 2;
  return vertical
    ? [...arcoPts(cx, cy + e, r, 0, Math.PI, n), ...arcoPts(cx, cy - e, r, Math.PI, 2 * Math.PI, n)]
    : [...arcoPts(cx + e, cy, r, -H, H, n), ...arcoPts(cx - e, cy, r, H, 3 * H, n)];
}

/** Polígono regular (hexágono de cabeza/tuerca: `af` = entrecaras). */
export function hexPts(cx, cy, af, rot = 0) {
  const R = af / Math.sqrt(3), out = [];
  for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; out.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return out;
}

/** Redondea las esquinas interiores de una polilínea abierta con radio r. */
export function redondear(pts, r, n = 6) {
  if (r <= 0 || pts.length < 3) return pts.map(p => [...p]);
  const out = [[...pts[0]]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const u = norm(sub(a, p)), v = norm(sub(b, p));
    const cosT = Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]));
    const th = Math.acos(cosT);
    if (th < 1e-3 || Math.PI - th < 1e-3) { out.push([...p]); continue; }
    const d = r / Math.tan(th / 2);
    const la = Math.hypot(...sub(a, p)) / 2, lb = Math.hypot(...sub(b, p)) / 2;
    const dd = Math.min(d, la, lb), rr = dd * Math.tan(th / 2);
    const pa = [p[0] + u[0] * dd, p[1] + u[1] * dd], pb = [p[0] + v[0] * dd, p[1] + v[1] * dd];
    const bis = norm([u[0] + v[0], u[1] + v[1]]);
    const c = [p[0] + bis[0] * (rr / Math.sin(th / 2)), p[1] + bis[1] * (rr / Math.sin(th / 2))];
    let a0 = Math.atan2(pa[1] - c[1], pa[0] - c[0]), a1 = Math.atan2(pb[1] - c[1], pb[0] - c[0]);
    let dA = a1 - a0; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI;
    for (let k = 0; k <= n; k++) { const a2 = a0 + dA * k / n; out.push([c[0] + rr * Math.cos(a2), c[1] + rr * Math.sin(a2)]); }
  }
  out.push([...pts[pts.length - 1]]);
  return out;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

/** Sección de CHAPA PLEGADA: dada la fibra media (polilínea abierta) y el
 *  espesor t, devuelve el contorno cerrado de la sección (con radios de
 *  plegado r). Extruyendo esa sección se obtiene el perfil formado real. */
export function seccionChapa(fibra, t, r = t, n = 6) {
  const c = redondear(fibra, r, n);
  const nrm = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    const d = norm(sub(b, a));
    nrm.push([-d[1], d[0]]);
  }
  const off = (s) => c.map((p, i) => [p[0] + nrm[i][0] * s * t / 2, p[1] + nrm[i][1] * s * t / 2]);
  return [...off(1), ...off(-1).reverse()];
}

/** Desarrollo (flat pattern) de la fibra media: largo estirado con BA por
 *  factor K. Devuelve {largo, tramos:[...], plegados:[{ang, r, BA}]}. */
export function desarrollo(fibra, t, r = t, k = 0.44) {
  const tramos = [], plegados = [];
  for (let i = 0; i < fibra.length - 1; i++) tramos.push(Math.hypot(...sub(fibra[i + 1], fibra[i])));
  let largo = 0;
  for (let i = 1; i < fibra.length - 1; i++) {
    const u = norm(sub(fibra[i - 1], fibra[i])), v = norm(sub(fibra[i + 1], fibra[i]));
    const th = Math.PI - Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])));  // ángulo de pliegue
    const BA = th * (r + k * t);
    // retroceso al punto de tangencia medido sobre la FIBRA MEDIA (que es lo
    // que traza `fibra`): el arco de la fibra media tiene radio r + t/2.
    const rec = (r + t / 2) * Math.tan(th / 2);
    plegados.push({ ang: r2(th * 180 / Math.PI), r, BA: r2(BA), setback: r2(rec) });
  }
  largo = tramos.reduce((a, b) => a + b, 0);
  for (const p of plegados) largo += p.BA - 2 * p.setback;
  return { largo: r2(largo), tramos: tramos.map(r2), plegados };
}

// ---------------------------------------------------------------------------
// BANDAS: trayectoria por tangentes entre circunferencias dirigidas
// ---------------------------------------------------------------------------
/** seq: [{c:[u,v], r, s}] con s=+1 (la banda envuelve CCW) o −1 (CW).
 *  Devuelve {outer, inner} — dos contornos cerrados en el plano del boceto:
 *  extruir `outer` y restar `inner` da la banda de espesor T. */
export function bandaFaces(seq, T, n = 20) {
  const N = seq.length, rc = seq.map(q => q.r + T / 2), normals = [];
  for (let i = 0; i < N; i++) {
    const q1 = seq[i], q2 = seq[(i + 1) % N];
    const du = q2.c[0] - q1.c[0], dv = q2.c[1] - q1.c[1], d = Math.hypot(du, dv);
    const a = (q1.s * rc[i] - q2.s * rc[(i + 1) % N]) / d;
    if (!(Math.abs(a) < 1)) throw new Error(`banda: sin tangente entre el tramo ${i} y el ${i + 1} (d=${r2(d)})`);
    const b = -Math.sqrt(1 - a * a);
    const u = [du / d, dv / d], w = [-u[1], u[0]];
    normals.push([a * u[0] + b * w[0], a * u[1] + b * w[1]]);
  }
  const faces = [[], []];
  for (let i = 0; i < N; i++) {
    const q = seq[i], nIn = normals[(i + N - 1) % N], nOut = normals[i];
    const aIn = Math.atan2(q.s * nIn[1], q.s * nIn[0]);
    let aOut = Math.atan2(q.s * nOut[1], q.s * nOut[0]);
    if (q.s > 0) { while (aOut < aIn - 1e-9) aOut += 2 * Math.PI; }
    else { while (aOut > aIn + 1e-9) aOut -= 2 * Math.PI; }
    faces[0].push(...arcoPts(q.c[0], q.c[1], q.s > 0 ? q.r : q.r + T, aIn, aOut, n));
    faces[1].push(...arcoPts(q.c[0], q.c[1], q.s > 0 ? q.r + T : q.r, aIn, aOut, n));
  }
  const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); };
  return area(faces[0]) >= area(faces[1]) ? { outer: faces[0], inner: faces[1] } : { outer: faces[1], inner: faces[0] };
}

/** Largo desarrollado de una banda (perímetro de la fibra media). */
export function largoBanda(seq, T) {
  const N = seq.length; let L = 0;
  const rc = seq.map(q => q.r + T / 2), normals = [];
  for (let i = 0; i < N; i++) {
    const q1 = seq[i], q2 = seq[(i + 1) % N];
    const du = q2.c[0] - q1.c[0], dv = q2.c[1] - q1.c[1], d = Math.hypot(du, dv);
    const a = (q1.s * rc[i] - q2.s * rc[(i + 1) % N]) / d, b = -Math.sqrt(1 - a * a);
    const u = [du / d, dv / d], w = [-u[1], u[0]];
    normals.push([a * u[0] + b * w[0], a * u[1] + b * w[1]]);
    L += d * Math.sqrt(Math.max(0, 1 - a * a));            // tramo recto tangente
  }
  for (let i = 0; i < N; i++) {
    const q = seq[i], nIn = normals[(i + N - 1) % N], nOut = normals[i];
    const aIn = Math.atan2(q.s * nIn[1], q.s * nIn[0]);
    let aOut = Math.atan2(q.s * nOut[1], q.s * nOut[0]);
    if (q.s > 0) { while (aOut < aIn - 1e-9) aOut += 2 * Math.PI; } else { while (aOut > aIn + 1e-9) aOut -= 2 * Math.PI; }
    L += Math.abs(aOut - aIn) * rc[i];                      // arco envuelto
  }
  return r2(L);
}

/** Ángulo de envolvente (grados) de cada elemento de la secuencia. */
export function envolventes(seq, T) {
  const N = seq.length, rc = seq.map(q => q.r + T / 2), normals = [];
  for (let i = 0; i < N; i++) {
    const q1 = seq[i], q2 = seq[(i + 1) % N];
    const du = q2.c[0] - q1.c[0], dv = q2.c[1] - q1.c[1], d = Math.hypot(du, dv);
    const a = (q1.s * rc[i] - q2.s * rc[(i + 1) % N]) / d, b = -Math.sqrt(1 - a * a);
    const u = [du / d, dv / d], w = [-u[1], u[0]];
    normals.push([a * u[0] + b * w[0], a * u[1] + b * w[1]]);
  }
  return seq.map((q, i) => {
    const nIn = normals[(i + N - 1) % N], nOut = normals[i];
    const aIn = Math.atan2(q.s * nIn[1], q.s * nIn[0]);
    let aOut = Math.atan2(q.s * nOut[1], q.s * nOut[0]);
    if (q.s > 0) { while (aOut < aIn - 1e-9) aOut += 2 * Math.PI; } else { while (aOut > aIn + 1e-9) aOut -= 2 * Math.PI; }
    return r2(Math.abs(aOut - aIn) * 180 / Math.PI);
  });
}

// ---------------------------------------------------------------------------
// COMPONENTES NORMALIZADOS (cada uno = una pieza propia del ensamble)
// ---------------------------------------------------------------------------
export const COL = {
  chapa: '#8fa3b8', chapaOsc: '#6b7f94', acero: '#9aa4b2', inox: '#c3ccd6',
  movil: '#2a4fd7', fijo: '#455a64', motor: '#37474f', banda: '#2b2b2b',
  polea: '#c9752e', rodillo: '#b0bec5', neumatica: '#1e88a8', tornillo: '#d5b46a',
  rodamiento: '#7e57c2', uretano: '#e0b040', guarda: '#78909c',
};

/** Rosca métrica/UNC: Ø nominal y paso aproximados para taladros pasantes. */
export const PASO = { M5: 5.5, M6: 6.6, M8: 9.0, M10: 11.0, M12: 13.5, '1/4': 7.0, '5/16': 8.7, '3/8': 10.3, '1/2': 13.5 };

/** Perno hexagonal completo (cabeza + vástago); dir = hacia donde entra. */
export function pernoHex(E, { nombre, at, dir, dia, largo, af, altoCab, color = COL.tornillo, capa = '' }) {
  const AF = af || r2(1.6 * dia), HC = altoCab || r2(0.65 * dia);
  const d = normal3(dir);
  const back = [at[0] - d[0] * HC, at[1] - d[1] * HC, at[2] - d[2] * HC];
  const [u, v] = baseOrtogonal(d);
  const hx = hexPts(0, 0, AF).map(p => [
    r2(u[0] * p[0] + v[0] * p[1]), r2(u[1] * p[0] + v[1] * p[1]), r2(u[2] * p[0] + v[2] * p[1])]);
  return E.addPart(`${capa}Perno hex ${nombre}`, color, back, [
    // cabeza hexagonal: prisma por boceto en el plano perpendicular a `dir`
    { id: nid(), name: `Cabeza hex e/c ${AF}`, shape: 'sketch', op: 'union', at: back, dir: d,
      params: { pts: hexPts(0, 0, AF).map(p => [r2(p[0]), r2(p[1])]), h: HC, u: u.map(r2) } },
    cyl(`Vástago Ø${dia}×${largo}`, at, d, dia, largo),
  ], { hardware: true, norma: 'ASME B18.2.1 / DIN 933' });
}

/** Tuerca hexagonal. */
export function tuercaHex(E, { nombre, at, dir, dia, af, alto, color = COL.tornillo, capa = '' }) {
  const AF = af || r2(1.6 * dia), H = alto || r2(0.85 * dia);
  const d = normal3(dir), [u] = baseOrtogonal(d);
  return E.addPart(`${capa}Tuerca hex ${nombre}`, color, at, [
    { id: nid(), name: `Tuerca e/c ${AF}`, shape: 'sketch', op: 'union', at, dir: d,
      params: { pts: hexPts(0, 0, AF).map(p => [r2(p[0]), r2(p[1])]), h: H, u: u.map(r2) } },
    hole(`Rosca Ø${dia}`, at, d, dia),
  ], { hardware: true, norma: 'ASME B18.2.2 / DIN 934' });
}

/** Golilla/arandela plana. */
export function golilla(E, { nombre, at, dir, dia, ext, esp = 1.6, color = COL.acero, capa = '' }) {
  const d = normal3(dir), DE = ext || r2(2.2 * dia);
  return E.addPart(`${capa}Golilla ${nombre} Ø${dia}`, color, at, [
    cyl(`Arandela Ø${DE}×${esp}`, at, d, DE, esp),
    hole(`Ø${r2(dia + 0.6)}`, at, d, dia + 0.6),
  ], { hardware: true, norma: 'DIN 125 / ASME B18.22.1' });
}

/** Anillo de retención exterior (seguro / circlip DIN 471 – Truarc 5100). */
export function anilloRet(E, { nombre, at, dir, eje, color = COL.inox, capa = '' }) {
  const d = normal3(dir), t = eje <= 12 ? 1.0 : eje <= 20 ? 1.2 : 1.5;
  return E.addPart(`${capa}Anillo retención ${nombre} Ø${eje}`, color, at, [
    revolve(`Anillo DIN 471 Ø${eje}`, at, ejeDe(d), [
      [0, eje / 2 - 0.6], [0, eje / 2 + 2.4], [t, eje / 2 + 2.4], [t, eje / 2 - 0.6]]),
  ], { hardware: true, norma: 'DIN 471 / ASME B27.7' });
}

/** Rodamiento rígido de bolas (anillos + sello) como pieza. */
export function rodamiento(E, { nombre, at, dir, bore, od, w, color = COL.rodamiento, capa = '' }) {
  const d = normal3(dir), e = ejeDe(d), tR = (od - bore) / 2;
  return E.addPart(`${capa}Rodamiento ${nombre} (${bore}×${od}×${w})`, color, at, [
    revolve('Aro exterior', at, e, [[0, od / 2 - tR * 0.28], [0, od / 2], [w, od / 2], [w, od / 2 - tR * 0.28]]),
    revolve('Aro interior', at, e, [[0, bore / 2], [0, bore / 2 + tR * 0.28], [w, bore / 2 + tR * 0.28], [w, bore / 2]]),
    revolve('Sello 2RS', at, e, [[w * 0.12, bore / 2 + tR * 0.28], [w * 0.12, od / 2 - tR * 0.28],
      [w * 0.88, od / 2 - tR * 0.28], [w * 0.88, bore / 2 + tR * 0.28]]),
  ], { hardware: true, componente: `rodamiento_${bore}x${od}x${w}` });
}

/** Polea / carrete de banda angosta: llanta con garganta, cubo y bore.
 *  `garganta`: 'plana' | 'V' | 'redonda'. Perfil revolucionado real. */
export function polea(E, { nombre, at, dir, od, ancho, bore, cubo = 0, cuboLargo = 0,
  garganta = 'plana', prof = 0, color = COL.polea, capa = '', extra = {} }) {
  const d = normal3(dir), e = ejeDe(d), R = od / 2, w = ancho, hub = cubo || bore * 1.9;
  const p = [];
  p.push([0, bore / 2]);
  if (cuboLargo > 0) { p.push([-cuboLargo, bore / 2], [-cuboLargo, hub / 2], [0, hub / 2]); }
  else p.push([0, hub / 2]);
  p.push([0.15 * w, hub / 2], [0.15 * w, R * 0.62], [0, R * 0.62], [0, R]);   // disco/alma
  if (garganta === 'V' && prof > 0) {
    p.push([w * 0.5 - prof * 0.9, R], [w * 0.5, R - prof], [w * 0.5 + prof * 0.9, R], [w, R]);
  } else if (garganta === 'redonda' && prof > 0) {
    p.push(...arcoPts(w / 2, R + prof * 0.05, prof, Math.PI, 2 * Math.PI, 10).map(q => [q[0], Math.min(R, q[1])]));
    p.push([w, R]);
  } else if (prof > 0) {                                    // garganta plana con pestañas
    p.push([w * 0.18, R], [w * 0.18, R - prof], [w * 0.82, R - prof], [w * 0.82, R], [w, R]);
  } else p.push([w, R]);
  p.push([w, R * 0.62], [w - 0.15 * w, R * 0.62], [w - 0.15 * w, hub / 2], [w, hub / 2], [w, bore / 2]);
  return E.addPart(`${capa}${nombre}`, color, at, [
    revolve(`Polea Ø${od}×${w} bore Ø${bore}`, at, e, p),
    hole(`Bore Ø${bore}`, [at[0] - d[0] * (cuboLargo + 1), at[1] - d[1] * (cuboLargo + 1), at[2] - d[2] * (cuboLargo + 1)], d, bore),
  ], { componente: `polea_${od}x${w}`, ...extra });
}

/** Rodillo de transportador: tubo + eje + rodamientos + tapas. Devuelve piezas. */
export function rodillo(E, { nombre, at, dir, od, cara, ejeD, ejeExtra = 12, tubo = 0,
  rodam = null, color = COL.rodillo, capa = '', extra = {} }) {
  const d = normal3(dir), e = ejeDe(d), t = tubo || Math.max(1.5, od * 0.05);
  const partes = [];
  partes.push(E.addPart(`${capa}${nombre} · tubo Ø${od}×${cara}`, color, at, [
    revolve(`Tubo Ø${od} e=${t}`, at, e, [[0, od / 2 - t], [0, od / 2], [cara, od / 2], [cara, od / 2 - t]]),
  ], { componente: `rodillo_${od}x${cara}`, ...extra }));
  const p0 = [at[0] - d[0] * ejeExtra, at[1] - d[1] * ejeExtra, at[2] - d[2] * ejeExtra];
  partes.push(E.addPart(`${capa}${nombre} · eje Ø${ejeD}`, COL.acero, p0, [
    cyl(`Eje Ø${ejeD}×${r2(cara + 2 * ejeExtra)}`, p0, d, ejeD, cara + 2 * ejeExtra),
  ], { componente: `eje_${ejeD}` }));
  if (rodam) {
    for (const s of [0, 1]) {
      const z = s === 0 ? rodam.w * 0.5 : cara - rodam.w * 1.5;
      const pa = [at[0] + d[0] * z, at[1] + d[1] * z, at[2] + d[2] * z];
      partes.push(rodamiento(E, { nombre: `${nombre} ${s ? 'B' : 'A'}`, at: pa, dir: d, ...rodam, capa }));
    }
  }
  return partes;
}

// ---------------------------------------------------------------------------
// Utilidades de vectores / ejes
// ---------------------------------------------------------------------------
export function normal3(v) { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

export function ejeDe(d) {
  const a = d.map(Math.abs);
  return a[0] >= a[1] && a[0] >= a[2] ? 'x' : a[1] >= a[2] ? 'y' : 'z';
}

export function baseOrtogonal(d) {
  const n = normal3(d);
  const t = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = normal3(cross(t, n));
  return [u, cross(n, u)];
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** AABB aproximada de una pieza (para chequeos de interferencia en los tests). */
export function bboxPieza(part) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const acc = (p) => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } };
  for (const f of part.features) {
    if (f.op === 'cut') continue;
    const at = [f.at[0] + part.pos[0], f.at[1] + part.pos[1], f.at[2] + part.pos[2]];
    if (f.shape === 'box') {
      const { w, d, h } = f.params;
      acc([at[0] - w / 2, at[1] - d / 2, at[2]]); acc([at[0] + w / 2, at[1] + d / 2, at[2] + h]);
    } else if (f.shape === 'cylinder') {
      const r = f.params.dia / 2, d3 = normal3(f.dir), h = f.params.h;
      for (const s of [0, h]) {
        const c = [at[0] + d3[0] * s, at[1] + d3[1] * s, at[2] + d3[2] * s];
        acc([c[0] - r, c[1] - r, c[2] - r]); acc([c[0] + r, c[1] + r, c[2] + r]);
      }
    } else if (f.shape === 'sketch' && f.params.pts) {
      const [u, v] = baseOrtogonal(f.dir), n = normal3(f.dir);
      for (const p of f.params.pts) {
        for (const s of [0, f.params.h]) {
          acc([at[0] + u[0] * p[0] + v[0] * p[1] + n[0] * s,
            at[1] + u[1] * p[0] + v[1] * p[1] + n[1] * s,
            at[2] + u[2] * p[0] + v[2] * p[1] + n[2] * s]);
        }
      }
    } else if (f.shape === 'revolve') {
      const rs = f.params.entities.flatMap(e2 => [Math.abs(e2.a[1]), Math.abs(e2.b[1])]);
      const hs = f.params.entities.flatMap(e2 => [e2.a[0], e2.b[0]]);
      const R = Math.max(...rs), h0 = Math.min(...hs), h1 = Math.max(...hs);
      const d3 = normal3(f.dir === undefined ? [0, 0, 1] : ejeVec(f));
      for (const s of [h0, h1]) {
        const c = [at[0] + d3[0] * s, at[1] + d3[1] * s, at[2] + d3[2] * s];
        acc([c[0] - R, c[1] - R, c[2] - R]); acc([c[0] + R, c[1] + R, c[2] + R]);
      }
    }
  }
  return { lo, hi };
}

function ejeVec(f) {
  // el eje de revolución es 'u' del plano del boceto (el perfil usa h a lo largo de u)
  return normal3(f.params.u);
}

/** ¿Se solapan dos AABB con holgura `hol`? */
export function solapan(a, b, hol = 0) {
  for (let i = 0; i < 3; i++) if (a.hi[i] - hol <= b.lo[i] + hol || b.hi[i] - hol <= a.lo[i] + hol) return false;
  return true;
}
