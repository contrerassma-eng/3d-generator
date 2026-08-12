// iso3d.mjs — ilustración técnica vectorial desde el modelo paramétrico.
//
// Produce el lenguaje gráfico de los catálogos de fabricantes (Hytrol, Pacline):
// proyección ISOMÉTRICA (u ortográfica arbitraria) en LÍNEA, con eliminación
// de líneas ocultas, para vistas de conjunto y DESPIECES con globos.
//
// Método:
//   1. Cada pieza del ensamble se convierte a malla (unión rápida de cajas y
//      cilindros; CSG del motor model.js cuando hay perforaciones; la banda
//      por extrusión de su boceto con vaciado).
//   2. Las ARISTAS se extraen de la malla con soldadura posicional:
//      borde (1 cara) · pliegue (ángulo > umbral) · SILUETA (cara frontal
//      contra cara trasera, dependiente de la vista — imprescindible para
//      cilindros, que three.EdgesGeometry no resuelve).
//   3. La OCLUSIÓN se decide contra un buffer de profundidad rasterizado en
//      memoria (scanline, Float32Array): cada arista se muestrea a sub-píxel
//      y sobrevive sólo el tramo que gana el test de profundidad, con sesgo
//      adaptado a la pendiente local (evita el auto-ocultamiento del canto).
//   4. La figura entrega SEGMENTOS en mm de lámina, listos para Sheet
//      (drawing2d): capa VISIBLE para el contorno, FINA para aristas suaves.
//
// La explosión es por pieza (vector en coordenadas de MODELO antes de
// proyectar) con línea de montaje punteada opcional hacia el asiento.

import * as THREE from 'three';
import { buildPartGeometry } from './model.js';

// ── construcción de mallas ───────────────────────────────────────────────────

const fastOK = (p) => p.features.every(f =>
  (f.shape === 'box' || f.shape === 'cylinder') && f.op === 'union');

function fastGeometry(part, segs = 24) {
  const geoms = [];
  for (const f of part.features) {
    if (f.shape === 'box') {
      const g = new THREE.BoxGeometry(f.params.w, f.params.d, f.params.h);
      g.translate(f.at[0], f.at[1], f.at[2] + f.params.h / 2);
      geoms.push(g);
    } else {
      // cilindros grandes con más facetas: el tono por cara los lee como
      // metal torneado; con pocas facetas se ve poligonal, no «render»
      const nSeg = f.params.dia > 36 ? 48 : segs;
      const g = new THREE.CylinderGeometry(f.params.dia / 2, f.params.dia / 2, f.params.h, nSeg);
      const dir = new THREE.Vector3(...(f.dir || [0, 0, 1])).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.applyQuaternion(q);
      const c = new THREE.Vector3(...f.at).addScaledVector(dir, f.params.h / 2);
      g.translate(c.x, c.y, c.z);
      geoms.push(g);
    }
  }
  return mergeGeoms(geoms);
}

// banda: contorno exterior + vaciado interior extruidos (boceto en plano XZ,
// extrusión hacia −Y desde f.at — mismo convenio que export_lbp530)
function bandGeometry(part) {
  const [outerF, innerF] = part.features;
  const toV2 = (pts) => pts.map(([u, v]) => new THREE.Vector2(u, v));
  const shape = new THREE.Shape(toV2(outerF.params.pts));
  if (innerF?.params?.pts) shape.holes.push(new THREE.Path(toV2(innerF.params.pts)));
  const w = outerF.params.h;
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 8 });
  const m = new THREE.Matrix4().set(
    1, 0, 0, outerF.at[0],
    0, 0, -1, outerF.at[1],
    0, 1, 0, outerF.at[2],
    0, 0, 0, 1);
  g.applyMatrix4(m);
  return g;
}

function mergeGeoms(geoms) {
  let nV = 0, nI = 0;
  const idx = [];
  for (const g of geoms) {
    const p = g.attributes.position.count;
    nV += p; nI += g.index ? g.index.count : p;
  }
  const pos = new Float32Array(nV * 3);
  const ind = new Uint32Array(nI);
  let ov = 0, oi = 0;
  for (const g of geoms) {
    pos.set(g.attributes.position.array, ov * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) ind[oi++] = g.index.array[i] + ov;
    else for (let i = 0; i < g.attributes.position.count; i++) ind[oi++] = ov + i;
    ov += g.attributes.position.count;
    g.dispose?.();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setIndex(new THREE.BufferAttribute(ind, 1));
  return out;
}

// simplify: 'band' = extrusión del boceto (banda modular) ·
//           'first-sketch' = ídem · 'fast' = fuerza unión sin CSG (ignora holes)
export function partGeometry(part, { simplify } = {}) {
  if (simplify === 'band') return bandGeometry(part);
  if (simplify === 'fast' || fastOK(part)) {
    const keep = simplify === 'fast'
      ? { ...part, features: part.features.filter(f => f.op === 'union' && f.shape !== 'hole') }
      : part;
    return fastGeometry(keep);
  }
  return buildPartGeometry(part);          // CSG completo (perforaciones reales)
}

// ── extracción de aristas con soldadura posicional ───────────────────────────
// Devuelve segmentos etiquetados:
//   kind 0 = borde/pliegue (fuerte) · 1 = silueta según vista (fuerte)
//
// Robustez CSG: los booleanos emiten triángulos ASTILLA cuya normal es ruido
// numérico — clasificar con ella pinta ráfagas de falsos pliegues. Por eso:
//   · el test de pliegue se confirma con COPLANARIDAD DE 4 PUNTOS por volumen
//     de tetraedro (sin normalizar: inmune a astillas), y
//   · en el voto frontal/trasero de la silueta sólo opinan caras con área sana.
export function extractEdges(geom, viewDir, creaseDeg = 28) {
  const pos = geom.attributes.position.array;
  const index = geom.index ? geom.index.array : null;
  const nTri = (index ? index.length : pos.length / 3) / 3;
  const vid = (i) => index ? index[i] : i;

  // soldar vértices a 0.01 mm (los booleanos no comparten vértices)
  const key = (x, y, z) => `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`;
  const weld = new Map();
  const vx = [], vy = [], vz = [];
  const wOf = (i) => {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const k = key(x, y, z);
    let w = weld.get(k);
    if (w === undefined) { w = vx.length; weld.set(k, w); vx.push(x); vy.push(y); vz.push(z); }
    return w;
  };

  // triángulos con ids soldados + datos de cara
  const tris = [];
  const dirV = new THREE.Vector3(...viewDir).normalize();
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const AB = new THREE.Vector3(), ACv = new THREE.Vector3(), N = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    const i0 = vid(t * 3), i1 = vid(t * 3 + 1), i2 = vid(t * 3 + 2);
    A.fromArray(pos, i0 * 3); B.fromArray(pos, i1 * 3); C.fromArray(pos, i2 * 3);
    AB.subVectors(B, A); ACv.subVectors(C, A); N.crossVectors(AB, ACv);
    const area2 = N.length();                       // 2×área, en mm²
    if (area2 < 1e-9) continue;
    const w0 = wOf(i0), w1 = wOf(i1), w2 = wOf(i2);
    if (w0 === w1 || w1 === w2 || w2 === w0) continue;
    tris.push({
      v: [w0, w1, w2],
      nx: N.x / area2, ny: N.y / area2, nz: N.z / area2, area2,
      front: (N.x * dirV.x + N.y * dirV.y + N.z * dirV.z) < 0,
    });
  }

  // ── vértices en T: partir cada arista en los vértices que caen SOBRE ella ──
  // (las teselaciones CSG de dos caras coplanares no comparten vértices: cada
  // media-arista quedaría como «borde abierto» y pintaría costuras falsas)
  const CELL = 4;                                    // mm
  const grid = new Map();
  const ck = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  for (let i = 0; i < vx.length; i++) {
    const k = ck(vx[i], vy[i], vz[i]);
    let l = grid.get(k); if (!l) grid.set(k, l = []);
    l.push(i);
  }
  const TOL = 0.06, TOL2 = TOL * TOL;
  const onSeg = (a, b) => {          // vértices estrictamente interiores al segmento a-b
    const ax = vx[a], ay = vy[a], az = vz[a];
    const dx = vx[b] - ax, dy = vy[b] - ay, dz = vz[b] - az;
    const L2 = dx * dx + dy * dy + dz * dz;
    if (L2 < 1e-12) return [];
    const L = Math.sqrt(L2);
    const hits = [];
    const seen = new Set();
    // DDA por celdas de la línea + vecindario 3×3×3
    const steps = Math.max(1, Math.ceil(L / CELL));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.floor((ax + dx * t) / CELL), cy = Math.floor((ay + dy * t) / CELL), cz = Math.floor((az + dz * t) / CELL);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
        const l = grid.get(`${cx + ox},${cy + oy},${cz + oz}`);
        if (!l) continue;
        for (const i of l) {
          if (i === a || i === b || seen.has(i)) continue;
          seen.add(i);
          const px = vx[i] - ax, py = vy[i] - ay, pz = vz[i] - az;
          const tt = (px * dx + py * dy + pz * dz) / L2;
          if (tt <= 1e-4 || tt >= 1 - 1e-4) continue;
          const qx = px - dx * tt, qy = py - dy * tt, qz = pz - dz * tt;
          if (qx * qx + qy * qy + qz * qz <= TOL2) hits.push([tt, i]);
        }
      }
    }
    hits.sort((p, q) => p[0] - q[0]);
    return hits.map(h => h[1]);
  };

  const edges = new Map();  // "a_b" (sub-arista) → {a,b, faces:[...]}
  const addSub = (a, b, face) => {
    const k = a < b ? `${a}_${b}` : `${b}_${a}`;
    let e = edges.get(k);
    if (!e) edges.set(k, e = { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
    e.faces.push(face);
  };
  const splitCache = new Map();
  for (const tr of tris) {
    const [w0, w1, w2] = tr.v;
    for (const [a, b, o] of [[w0, w1, w2], [w1, w2, w0], [w2, w0, w1]]) {
      const ek = a < b ? `${a}_${b}` : `${b}_${a}`;
      let chain = splitCache.get(ek);
      if (!chain) {
        chain = [a < b ? a : b, ...onSeg(a < b ? a : b, a < b ? b : a), a < b ? b : a];
        splitCache.set(ek, chain);
      }
      const face = { nx: tr.nx, ny: tr.ny, nz: tr.nz, area2: tr.area2, front: tr.front, opp: o };
      for (let i = 0; i + 1 < chain.length; i++) addSub(chain[i], chain[i + 1], face);
    }
  }

  // coplanaridad robusta de la arista (a,b) con los vértices opuestos o1,o2:
  // volumen del tetraedro relativo al tamaño — NO usa normales
  const cop = (ea, eb, o1, o2) => {
    const ax = vx[ea], ay = vy[ea], az = vz[ea];
    const b1x = vx[eb] - ax, b1y = vy[eb] - ay, b1z = vz[eb] - az;
    const c1x = vx[o1] - ax, c1y = vy[o1] - ay, c1z = vz[o1] - az;
    const c2x = vx[o2] - ax, c2y = vy[o2] - ay, c2z = vz[o2] - az;
    const vol = b1x * (c1y * c2z - c1z * c2y) - b1y * (c1x * c2z - c1z * c2x) + b1z * (c1x * c2y - c1y * c2x);
    const l1 = Math.hypot(b1x, b1y, b1z), l2 = Math.hypot(c1x, c1y, c1z), l3 = Math.hypot(c2x, c2y, c2z);
    return Math.abs(vol) <= 3e-4 * l1 * l2 * l3 + 1e-9;
  };

  const cosCrease = Math.cos(creaseDeg * Math.PI / 180);
  const AREA_OK = 0.02;                              // 2×área mínima «sana» (mm²)
  const out = [];
  for (const e of edges.values()) {
    const strong = e.faces.filter(f => f.area2 > AREA_OK);
    let kind = -1;
    if (e.faces.length === 1) kind = 0;                              // borde abierto
    else if (strong.length) {
      const anyF = strong.some(f => f.front), anyB = strong.some(f => !f.front);
      // silueta sólo si además el par frontal/trasero NO es coplanar
      if (anyF && anyB) {
        const f1 = strong.find(f => f.front), f2 = strong.find(f => !f.front);
        if (!cop(e.a, e.b, f1.opp, f2.opp)) kind = 1;
      }
      if (kind < 0) {
        // pliegue: algún par de caras sanas genuinamente doblado
        for (let i = 0; i < strong.length && kind < 0; i++) {
          for (let j = i + 1; j < strong.length; j++) {
            const fi = strong[i], fj = strong[j];
            const dot = fi.nx * fj.nx + fi.ny * fj.ny + fi.nz * fj.nz;
            if (dot < cosCrease && !cop(e.a, e.b, fi.opp, fj.opp)) { kind = 0; break; }
          }
        }
      }
      if (kind >= 0 && !strong.some(f => f.front)) kind = -1;        // nada visible
    }
    if (kind >= 0) out.push({ a: [vx[e.a], vy[e.a], vz[e.a]], b: [vx[e.b], vy[e.b], vz[e.b]], kind });
  }

  // ── parches coplanares FRONTALES para pintado (caras con luz) ──────────────
  // Agrupa triángulos frontales por plano; el contorno del parche son las
  // sub-aristas usadas un número IMPAR de veces, encadenadas en lazos
  // (contorno + agujeros → relleno par-impar). Devuelve además la normal.
  const patches = [];
  {
    const porPlano = new Map();
    tris.forEach((tr, ti) => {
      if (!tr.front || tr.area2 < AREA_OK) return;
      const a = tr.v[0];
      const dPl = tr.nx * vx[a] + tr.ny * vy[a] + tr.nz * vz[a];
      const k = `${Math.round(tr.nx * 500)},${Math.round(tr.ny * 500)},${Math.round(tr.nz * 500)},${Math.round(dPl * 5)}`;
      let g = porPlano.get(k); if (!g) porPlano.set(k, g = []);
      g.push(ti);
    });
    for (const g of porPlano.values()) {
      const cnt = new Map();      // sub-arista → usos dentro del parche
      for (const ti of g) {
        const [w0, w1, w2] = tris[ti].v;
        for (const [a, b] of [[w0, w1], [w1, w2], [w2, w0]]) {
          const ek = a < b ? `${a}_${b}` : `${b}_${a}`;
          const chain = splitCache.get(ek) || [a < b ? a : b, a < b ? b : a];
          for (let i = 0; i + 1 < chain.length; i++) {
            const s = chain[i] < chain[i + 1] ? `${chain[i]}_${chain[i + 1]}` : `${chain[i + 1]}_${chain[i]}`;
            cnt.set(s, (cnt.get(s) || 0) + 1);
          }
        }
      }
      // adyacencia de borde y encadenado en lazos
      const ady = new Map();
      for (const [s, n] of cnt) {
        if (n % 2 === 0) continue;
        const [a, b] = s.split('_').map(Number);
        (ady.get(a) ?? ady.set(a, []).get(a)).push(b);
        (ady.get(b) ?? ady.set(b, []).get(b)).push(a);
      }
      const usado = new Set();
      const loops = [];
      for (const [start] of ady) {
        if (usado.has(start)) continue;
        const loop = [start];
        usado.add(start);
        let cur = start, prev = -1, guard = 0;
        while (guard++ < 20000) {
          const nx2 = (ady.get(cur) || []).find(v => v !== prev && !usado.has(v));
          if (nx2 === undefined) break;
          loop.push(nx2); usado.add(nx2);
          prev = cur; cur = nx2;
        }
        if (loop.length >= 3) loops.push(loop.map(i => [vx[i], vy[i], vz[i]]));
      }
      if (!loops.length) continue;
      const t0 = tris[g[0]];
      const areaW = g.reduce((a, ti) => a + tris[ti].area2, 0) / 2;   // mm² reales
      patches.push({
        loops, nx: t0.nx, ny: t0.ny, nz: t0.nz, areaW,
        // triángulos del parche (coordenadas soldadas) para el pintor por
        // triángulo: el orden por parche falla con parches GRANDES (la cara
        // de 5 m de la banda se ordena por su punto más lejano y todo lo de
        // en medio le pinta encima — defecto visto en la vista general)
        tris: g.map(ti => tris[ti].v.map(i => [vx[i], vy[i], vz[i]])),
      });
    }
  }
  out.patches = patches;
  return out;
}

// ── escena isométrica ────────────────────────────────────────────────────────

export class IsoScene {
  constructor() { this.items = []; }
  // part: pieza del doc · opts: {explode:[x,y,z], simplify, anchor:[x,y,z],
  //   trail:{to:[x,y,z]}, tag} — explode se aplica ANTES de proyectar.
  add(part, opts = {}) {
    const geom = partGeometry(part, opts);
    const off = new THREE.Vector3(...(opts.explode || [0, 0, 0]))
      .add(new THREE.Vector3(...(part.pos || [0, 0, 0])));
    const q = new THREE.Quaternion(...(part.quat || [0, 0, 0, 1]));
    const m = new THREE.Matrix4().compose(off, q, new THREE.Vector3(1, 1, 1));
    geom.applyMatrix4(m);
    this.items.push({ part, geom, opts, off });
    return this;
  }

  // dir: dirección de VISTA (desde el ojo hacia la escena), up: cénit.
  // Devuelve {segments, project, bboxScreen, parts:[{name,tag,bbox,anchor}]}
  project({ dir = [-1, 1, -0.62], up = [0, 0, 1], widthMM = 240, res = 1650,
            creaseDeg = 28, hidden = false } = {}) {
    const d = new THREE.Vector3(...dir).normalize();
    const u0 = new THREE.Vector3(...up);
    // base de pantalla: +X derecha, +Y ARRIBA (upv·up > 0 — un signo invertido
    // aquí dibuja el equipo patas arriba, defecto visto en la primera corrida)
    const right = new THREE.Vector3().crossVectors(d, u0).normalize();
    const upv = new THREE.Vector3().crossVectors(right, d).normalize();
    if (upv.dot(u0) < 0) { right.negate(); upv.negate(); }
    // ejes de pantalla: X=right, Y=upv, prof=d (mayor = más lejos)
    const P = (v) => [v.dot(right), v.dot(upv), v.dot(d)];

    // 1) proyectar todos los vértices y calcular el encuadre
    let minX = 1e30, maxX = -1e30, minY = 1e30, maxY = -1e30, minD = 1e30, maxD = -1e30;
    const projItems = this.items.map(it => {
      const pos = it.geom.attributes.position.array;
      const n = it.geom.attributes.position.count;
      const pr = new Float32Array(n * 3);
      const V = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        V.fromArray(pos, i * 3);
        const [x, y, dd] = P(V);
        pr[i * 3] = x; pr[i * 3 + 1] = y; pr[i * 3 + 2] = dd;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (dd < minD) minD = dd; if (dd > maxD) maxD = dd;
      }
      return { it, pr };
    });
    const w = maxX - minX, h = maxY - minY, dR = Math.max(1e-6, maxD - minD);
    const pxPerMM = (res - 4) / w;
    const H = Math.max(8, Math.ceil(h * pxPerMM) + 4);
    const toPx = (x, y) => [(x - minX) * pxPerMM + 2, (y - minY) * pxPerMM + 2];

    // 2) buffer de profundidad por scanline
    const depth = new Float32Array(res * H).fill(Infinity);
    for (const { it, pr } of projItems) {
      const index = it.geom.index ? it.geom.index.array : null;
      const nTri = (index ? index.length : pr.length / 3) / 3;
      const vid = (i) => index ? index[i] : i;
      for (let t = 0; t < nTri; t++) {
        const i0 = vid(t * 3) * 3, i1 = vid(t * 3 + 1) * 3, i2 = vid(t * 3 + 2) * 3;
        rasterTri(depth, res, H,
          toPx(pr[i0], pr[i0 + 1]), pr[i0 + 2],
          toPx(pr[i1], pr[i1 + 1]), pr[i1 + 2],
          toPx(pr[i2], pr[i2 + 1]), pr[i2 + 2]);
      }
    }

    // 3) aristas → tramos visibles por muestreo contra el buffer
    const sMM = widthMM / w;                          // mm de lámina por mm proyectado
    const segsOut = [];
    const partsMeta = [];
    const fills = [];
    const biasBase = dR * 6e-4;
    // luz de estudio: arriba-izquierda-frente (coordenadas de MUNDO)
    const luz = new THREE.Vector3(-0.35, 0.4, 0.85).normalize();
    for (const { it, pr } of projItems) {
      const eds = extractEdges(it.geom, dir, creaseDeg);

      // caras pintadas: PINTOR POR TRIÁNGULO con descarte de ocultos contra
      // el buffer — el orden queda correcto a granularidad de triángulo y lo
      // no visible no se emite (archivo chico). El tono es POR PARCHE (plano):
      // una cara = un tono, sin costuras internas.
      if (it.opts.paint !== false) {
        const base = hexRGB(it.part.color || '#d3d5cf');
        const V1 = new THREE.Vector3();
        for (const pa of eds.patches || []) {
          // paredes de barreno: facetas curvas chicas SIN pintar — la
          // perforación se lee con FONDO BLANCO (convención de ilustración
          // técnica; feedback de Sergio 12-08)
          if (pa.areaW < 45) continue;
          const sh = 0.42 + 0.58 * Math.max(0, pa.nx * luz.x + pa.ny * luz.y + pa.nz * luz.z);
          const A = 0.68;                             // «transparencia» del tono
          const rgb = base.map(v => Math.min(1, v * sh * A + (1 - A)));
          // híbrido compacto: parche COMPLETAMENTE visible → un solo polígono
          // (lazos con agujeros); visible parcial → sólo sus triángulos
          // visibles (36 MB de PDF con triángulo puro; ~2 MB así)
          const projTris = [];
          let nVis = 0, dMaxP = -1e30;
          const b2 = biasBase + dR * 4e-4;
          const visDe = (x, y, dd) => {
            const [px, py] = toPx(x, y);
            return sampleVisible(depth, res, H, px, py, dd, b2) !== 0;
          };
          for (const tv of pa.tris) {
            const p3 = tv.map(q => P(V1.set(q[0], q[1], q[2])));
            const cd = (p3[0][2] + p3[1][2] + p3[2][2]) / 3;
            const vis = visDe((p3[0][0] + p3[1][0] + p3[2][0]) / 3, (p3[0][1] + p3[1][1] + p3[2][1]) / 3, cd);
            if (vis) nVis++;
            if (cd > dMaxP) dMaxP = cd;
            projTris.push({ p3, cd, vis });
          }
          if (nVis === projTris.length) {
            // parche completamente visible → un solo polígono con agujeros
            fills.push({
              loops: pa.loops.map(lp => lp.map(q => {
                const [x, y] = P(V1.set(q[0], q[1], q[2]));
                return [(x - minX) * sMM, (y - minY) * sMM];
              })),
              rgb, depth: dMaxP,
            });
          } else {
            // visibilidad parcial → SUBDIVIDIR (arista ≤ 25 mm proyectados) y
            // decidir por centroide de cada sub-triángulo: visibilidad y orden
            // pintor se vuelven LOCALES (las astillas que cruzan medio equipo
            // pintaban sobre la banda o dejaban rasguños blancos)
            const MAXE = 25 / sMM;                    // en mm proyectados
            const emit = (t0, t1, t2, prof) => {
              const e01 = Math.hypot(t1[0] - t0[0], t1[1] - t0[1]);
              const e12 = Math.hypot(t2[0] - t1[0], t2[1] - t1[1]);
              const e20 = Math.hypot(t0[0] - t2[0], t0[1] - t2[1]);
              const mx = Math.max(e01, e12, e20);
              if (mx > MAXE && prof < 6) {
                const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
                if (mx === e01) { const m = mid(t0, t1); emit(t0, m, t2, prof + 1); emit(m, t1, t2, prof + 1); }
                else if (mx === e12) { const m = mid(t1, t2); emit(t0, t1, m, prof + 1); emit(t0, m, t2, prof + 1); }
                else { const m = mid(t2, t0); emit(t0, t1, m, prof + 1); emit(m, t1, t2, prof + 1); }
                return;
              }
              const cd = (t0[2] + t1[2] + t2[2]) / 3;
              if (!visDe((t0[0] + t1[0] + t2[0]) / 3, (t0[1] + t1[1] + t2[1]) / 3, cd)) return;
              const l2 = [t0, t1, t2].map(([x, y]) => [(x - minX) * sMM, (y - minY) * sMM]);
              const a2 = Math.abs((l2[1][0] - l2[0][0]) * (l2[2][1] - l2[0][1]) - (l2[2][0] - l2[0][0]) * (l2[1][1] - l2[0][1]));
              if (a2 < 0.35) return;
              fills.push({ loops: [l2], rgb, depth: cd });
            };
            for (const t of projTris) emit(t.p3[0], t.p3[1], t.p3[2], 0);
          }
        }
      }

      let bb = [1e30, 1e30, -1e30, -1e30];
      for (const e of eds) {
        const a = P(new THREE.Vector3(...e.a)), b = P(new THREE.Vector3(...e.b));
        bb[0] = Math.min(bb[0], a[0], b[0]); bb[1] = Math.min(bb[1], a[1], b[1]);
        bb[2] = Math.max(bb[2], a[0], b[0]); bb[3] = Math.max(bb[3], a[1], b[1]);
        const [ax, ay] = toPx(a[0], a[1]), [bx, by] = toPx(b[0], b[1]);
        const lenPx = Math.hypot(bx - ax, by - ay);
        if (lenPx < 0.7) continue;
        const nSm = Math.max(2, Math.ceil(lenPx / 0.6));
        let run = null; const runs = []; let bgN = 0;
        for (let s = 0; s <= nSm; s++) {
          const tt = s / nSm;
          const px = ax + (bx - ax) * tt, py = ay + (by - ay) * tt;
          const dz = a[2] + (b[2] - a[2]) * tt;
          const vis = sampleVisible(depth, res, H, px, py, dz, biasBase, true);
          if (vis) {
            if (vis === 2) bgN++;
            if (!run) run = [tt, tt, 0]; else run[1] = tt;
            if (vis === 2) run[2]++;
          }
          else if (run) { runs.push(run); run = null; }
        }
        if (run) runs.push(run);
        for (const [t0, t1, bgs] of runs) {
          if ((t1 - t0) * lenPx < 1.1) continue;
          // contorno EXTERIOR (contra fondo) más grueso que arista interna
          const outline = e.kind === 1 && bgs > 0.25 * ((t1 - t0) * nSm + 1);
          segsOut.push({
            a: [(a[0] + (b[0] - a[0]) * t0 - minX) * sMM, (a[1] + (b[1] - a[1]) * t0 - minY) * sMM],
            b: [(a[0] + (b[0] - a[0]) * t1 - minX) * sMM, (a[1] + (b[1] - a[1]) * t1 - minY) * sMM],
            kind: outline ? 3 : e.kind,
          });
        }
        if (hidden) {
          // tramos NO visibles como OCULTA (opcional)
          let prev = 0;
          for (const [t0, t1] of [...runs, [1, 1]]) {
            if (t0 - prev > 0.02) segsOut.push({
              a: [(a[0] + (b[0] - a[0]) * prev - minX) * sMM, (a[1] + (b[1] - a[1]) * prev - minY) * sMM],
              b: [(a[0] + (b[0] - a[0]) * t0 - minX) * sMM, (a[1] + (b[1] - a[1]) * t0 - minY) * sMM],
              kind: 9,
            });
            prev = t1;
          }
        }
      }
      const anchor3 = it.opts.anchor
        ? P(new THREE.Vector3(...it.opts.anchor).add(it.off))
        : [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2, 0];
      partsMeta.push({
        name: it.part.name, tag: it.opts.tag,
        bbox: [(bb[0] - minX) * sMM, (bb[1] - minY) * sMM, (bb[2] - minX) * sMM, (bb[3] - minY) * sMM],
        anchor: [(anchor3[0] - minX) * sMM, (anchor3[1] - minY) * sMM],
      });
      if (it.opts.trail) {
        const t0 = P(new THREE.Vector3(...it.opts.trail.to));
        const t1 = P(new THREE.Vector3().copy(it.off).add(new THREE.Vector3(...(it.opts.trail.from || [0, 0, 0]))));
        segsOut.push({
          a: [(t0[0] - minX) * sMM, (t0[1] - minY) * sMM],
          b: [(t1[0] - minX) * sMM, (t1[1] - minY) * sMM], kind: 8,
        });
      }
    }
    fills.sort((p, q) => q.depth - p.depth);          // pintor: lejos primero
    // spanU/spanV: extensión REAL proyectada del modelo (mm de modelo) — las
    // cotas del GA se auto-miden de aquí, no se transcriben
    return { segments: segsOut, fills, widthMM, heightMM: h * sMM, parts: partsMeta, spanU: w, spanV: h };
  }
}

function hexRGB(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return [0.83, 0.84, 0.81];
  const v = parseInt(m[1], 16);
  return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
}

function rasterTri(depth, W, H, [x0, y0], d0, [x1, y1], d1, [x2, y2], d2) {
  const minx = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
  const miny = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  if (minx > maxx || miny > maxy) return;
  const den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (Math.abs(den) < 1e-9) return;
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const l0 = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / den;
      const l1 = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / den;
      const l2 = 1 - l0 - l1;
      if (l0 < -0.001 || l1 < -0.001 || l2 < -0.001) continue;
      const d = l0 * d0 + l1 * d1 + l2 * d2;
      const i = y * W + x;
      if (d < depth[i]) depth[i] = d;
    }
  }
}

// devuelve 0 = oculto · 1 = visible · 2 = visible JUNTO AL FONDO (borde de
// silueta exterior — sirve para engrosar el contorno de la pieza)
function sampleVisible(depth, W, H, px, py, dz, biasBase, wantBg = false) {
  const x = Math.round(px), y = Math.round(py);
  if (x < 0 || y < 0 || x >= W || y >= H) return wantBg ? 2 : 1;
  // sesgo adaptado: profundidad mínima del vecindario 3×3 + término de
  // pendiente local (caras rasantes) — el canto pertenece a su propia cara
  let dmin = Infinity, dmax = -Infinity, bg = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) { bg = true; continue; }
    const v = depth[yy * W + xx];
    if (v === Infinity) { bg = true; continue; }          // fondo junto al canto
    if (v < dmin) dmin = v; if (v > dmax) dmax = v;
  }
  if (dmin === Infinity) return wantBg ? 2 : 1;
  const slope = isFinite(dmax) && dmax > dmin ? dmax - dmin : 0;
  const vis = bg || dz <= dmin + biasBase + slope * 1.2;
  return vis ? (bg && wantBg ? 2 : 1) : 0;
}

// ── globos ───────────────────────────────────────────────────────────────────
// items: [{n, anchor:[x,y]}] en mm de figura. Devuelve [{n, at, leaderTo}].
// Cada ítem va a la BANDA más cercana a su ancla (izquierda/derecha/arriba/
// abajo) y dentro de la banda se apila en el orden de la otra coordenada:
// líderes cortos y sin cruces — el patrón de los parts manuals.
export function layoutBalloons(items, figW, figH, { r = 4.6, margin = 11 } = {}) {
  const bandas = { L: [], R: [], T: [], B: [] };
  for (const it of items) {
    const [x, y] = it.anchor;
    const d = [['L', x], ['R', figW - x], ['B', y], ['T', figH - y]];
    d.sort((p, q) => p[1] - q[1]);
    bandas[d[0][0]].push(it);
  }
  const out = [];
  const put = (list, vert, fixed) => {
    // vert=true → banda vertical (x fijo), orden por y del ancla
    list.sort((p, q) => vert ? p.anchor[1] - q.anchor[1] : p.anchor[0] - q.anchor[0]);
    const span = vert ? figH : figW;
    const n = list.length;
    list.forEach((it, i) => {
      // reparto proporcional a la posición del ancla, con separación mínima
      const t = n === 1 ? (vert ? it.anchor[1] : it.anchor[0]) / span
        : 0.06 + 0.88 * i / (n - 1);
      const c = Math.max(0.04, Math.min(0.96, t)) * span;
      out.push({ n: it.n, at: vert ? [fixed, c] : [c, fixed], leaderTo: it.anchor, r });
    });
  };
  put(bandas.L, true, -margin);
  put(bandas.R, true, figW + margin);
  put(bandas.T, false, figH + margin);
  put(bandas.B, false, -margin);
  return out;
}

// dibuja una figura proyectada en un Sheet de drawing2d, con offset [ox,oy]
// — primero las CARAS PINTADAS (capa SOMBRA, queda al fondo del PDF), luego
// el alambre con jerarquía: contorno exterior NORMA > aristas VISIBLE > FINA
export function drawFigure(sh, fig, ox, oy, { balloons = [], scaleTxt } = {}) {
  for (const f of (fig.fills || [])) {
    sh.solidPoly(f.loops.map(lp => lp.map(([x, y]) => [ox + x, oy + y])), f.rgb);
  }
  const L = { 0: 'VISIBLE', 1: 'VISIBLE', 2: 'FINA', 3: 'NORMA', 8: 'COTAS', 9: 'OCULTA' };
  for (const s of fig.segments) {
    sh.line([ox + s.a[0], oy + s.a[1]], [ox + s.b[0], oy + s.b[1]], L[s.kind] || 'VISIBLE');
  }
  for (const b of balloons) {
    const at = [ox + b.at[0], oy + b.at[1]], to = [ox + b.leaderTo[0], oy + b.leaderTo[1]];
    // líder desde el borde del globo
    const dx = to[0] - at[0], dy = to[1] - at[1], dd = Math.hypot(dx, dy) || 1;
    const a0 = [at[0] + dx / dd * b.r, at[1] + dy / dd * b.r];
    sh.line(a0, to, 'COTAS');
    sh.circle(to, 0.55, 'COTAS'); sh.solid([[to[0] - 0.5, to[1] - 0.5], [to[0] + 0.5, to[1] - 0.5], [to[0], to[1] + 0.6]], 'COTAS');
    sh.circle(at, b.r, 'VISIBLE');
    sh.text(String(b.n), at[0], at[1] - 1.25, 3.4, 'C');
  }
  if (scaleTxt) sh.text(scaleTxt, ox + fig.widthMM / 2, oy - 6, 2.6, 'C');
}
