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
// topología SOLDADA view-independent, cacheada POR GEOMETRÍA: el GA proyecta
// la misma escena en 5 vistas (planta/elevación/iso/A-A/B-B) — sin caché, la
// soldadura + partición en T + lazos de parche se pagaban 5 veces
const TOPO = new WeakMap();
function topoDe(geom, creaseDeg) {
  const hit = TOPO.get(geom);
  if (hit && hit.creaseDeg === creaseDeg) return hit;
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

  // triángulos con ids soldados + datos de cara (sin nada de vista)
  const tris = [];
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
      const face = { nx: tr.nx, ny: tr.ny, nz: tr.nz, area2: tr.area2, opp: o };
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

  // clasificación ESTÁTICA por arista (lo único que depende de la vista es
  // el lado frontal): aristas abiertas, pliegues genuinos y — para la silueta
  // — la coplanaridad del par de caras precomputada cuando son exactamente 2
  const cosCrease = Math.cos(creaseDeg * Math.PI / 180);
  const AREA_OK = 0.02;                              // 2×área mínima «sana» (mm²)
  const eList = [];
  for (const e of edges.values()) {
    const strong = e.faces.filter(f => f.area2 > AREA_OK);
    const rec = { a: e.a, b: e.b, nFaces: e.faces.length, strong, crease: false, cop2: null };
    if (strong.length >= 2) {
      for (let i = 0; i < strong.length && !rec.crease; i++) {
        for (let j = i + 1; j < strong.length; j++) {
          const fi = strong[i], fj = strong[j];
          const dot = fi.nx * fj.nx + fi.ny * fj.ny + fi.nz * fj.nz;
          if (dot < cosCrease && !cop(e.a, e.b, fi.opp, fj.opp)) { rec.crease = true; break; }
        }
      }
      if (strong.length === 2) rec.cop2 = cop(e.a, e.b, strong[0].opp, strong[1].opp);
    }
    eList.push(rec);
  }

  // parches coplanares para pintado, SIN filtro de vista: el lazo del parche
  // es geometría pura — al proyectar sólo se decide si el plano mira al frente
  const patchesAll = [];
  {
    const porPlano = new Map();
    tris.forEach((tr, ti) => {
      if (tr.area2 < AREA_OK) return;
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
      const loopsIdx = [];
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
        if (loop.length >= 3) loopsIdx.push(Uint32Array.from(loop));
      }
      if (!loopsIdx.length) continue;
      const t0 = tris[g[0]];
      const areaW = g.reduce((a, ti) => a + tris[ti].area2, 0) / 2;   // mm² reales
      patchesAll.push({
        // SOLO ÍNDICES soldados (las coordenadas se materializan POR VISTA):
        // guardar los triángulos como tripletas de arrays duplicaba toda la
        // geometría en el caché y el GA de 96 piezas moría por OOM
        loopsIdx, nx: t0.nx, ny: t0.ny, nz: t0.nz, areaW,
        trisIdx: Uint32Array.from(g.flatMap(ti => tris[ti].v)),
      });
    }
  }
  // arrays compactos + cop re-ligado a ellos (los arrays JS de construcción
  // quedan libres al salir — nada del caché los retiene)
  const cvx = Float64Array.from(vx), cvy = Float64Array.from(vy), cvz = Float64Array.from(vz);
  const copC = (ea, eb, o1, o2) => {
    const ax = cvx[ea], ay = cvy[ea], az = cvz[ea];
    const b1x = cvx[eb] - ax, b1y = cvy[eb] - ay, b1z = cvz[eb] - az;
    const c1x = cvx[o1] - ax, c1y = cvy[o1] - ay, c1z = cvz[o1] - az;
    const c2x = cvx[o2] - ax, c2y = cvy[o2] - ay, c2z = cvz[o2] - az;
    const vol = b1x * (c1y * c2z - c1z * c2y) - b1y * (c1x * c2z - c1z * c2x) + b1z * (c1x * c2y - c1y * c2x);
    const l1 = Math.hypot(b1x, b1y, b1z), l2 = Math.hypot(c1x, c1y, c1z), l3 = Math.hypot(c2x, c2y, c2z);
    return Math.abs(vol) <= 3e-4 * l1 * l2 * l3 + 1e-9;
  };
  const topo = { creaseDeg, vx: cvx, vy: cvy, vz: cvz, eList, patchesAll, cop: copC };
  TOPO.set(geom, topo);
  return topo;
}

// clasificación POR VISTA sobre la topología cacheada: sólo productos punto
export function extractEdges(geom, viewDir, creaseDeg = 28, wantPatches = true) {
  const { vx, vy, vz, eList, patchesAll, cop } = topoDe(geom, creaseDeg);
  const d = new THREE.Vector3(...viewDir).normalize();
  const frontDe = (f) => (f.nx * d.x + f.ny * d.y + f.nz * d.z) < 0;
  const out = [];
  for (const e of eList) {
    const { strong } = e;
    let kind = -1;
    if (e.nFaces === 1) kind = 0;                                    // borde abierto
    else if (strong.length) {
      let anyF = false, anyB = false, iF = -1, iB = -1;
      for (let i = 0; i < strong.length; i++) {
        if (frontDe(strong[i])) { anyF = true; if (iF < 0) iF = i; }
        else { anyB = true; if (iB < 0) iB = i; }
      }
      // silueta sólo si además el par frontal/trasero NO es coplanar
      if (anyF && anyB) {
        const copFB = strong.length === 2 ? e.cop2 : cop(e.a, e.b, strong[iF].opp, strong[iB].opp);
        if (!copFB) kind = 1;
      }
      if (kind < 0 && e.crease) kind = 0;                            // pliegue genuino
      if (kind >= 0 && !anyF) kind = -1;                             // nada visible
    }
    if (kind >= 0) out.push({ a: [vx[e.a], vy[e.a], vz[e.a]], b: [vx[e.b], vy[e.b], vz[e.b]], kind });
  }
  // materializar coordenadas de parche SOLO para esta vista (transitorio)
  out.patches = wantPatches ? patchesAll.filter(frontDe).map(p => {
    const tris = [];
    const a = p.trisIdx;
    for (let k = 0; k < a.length; k += 3) {
      tris.push([[vx[a[k]], vy[a[k]], vz[a[k]]], [vx[a[k + 1]], vy[a[k + 1]], vz[a[k + 1]]], [vx[a[k + 2]], vy[a[k + 2]], vz[a[k + 2]]]]);
    }
    return {
      nx: p.nx, ny: p.ny, nz: p.nz, areaW: p.areaW, tris,
      loops: p.loopsIdx.map(lp => Array.from(lp, i => [vx[i], vy[i], vz[i]])),
    };
  }) : [];
  return out;
}

// ── escena isométrica ────────────────────────────────────────────────────────

// caché del CSG por pieza (espacio LOCAL): el manual arma una escena por
// figura con las MISMAS piezas — sin caché, la chumacera UCF se re-CSG-eaba
// en cada figura (35 % del perfil). El clon es barato; la transformación se
// aplica sobre el clon.
const GEO_CACHE = new WeakMap();
export class IsoScene {
  constructor() { this.items = []; }
  // part: pieza del doc · opts: {explode:[x,y,z], simplify, anchor:[x,y,z],
  //   trail:{to:[x,y,z]}, tag} — explode se aplica ANTES de proyectar.
  add(part, opts = {}) {
    // opts.geometry: malla YA construida (BufferGeometry) — p. ej. GLB de
    // vendor (MB800 M-HASTE): entra tal cual al mismo proyector que todo lo
    // paramétrico (siluetas, pliegues por diedro, oclusión, pintura, sombra)
    let g0 = opts.geometry;
    if (!g0) {
      let porSimp = GEO_CACHE.get(part);
      if (!porSimp) GEO_CACHE.set(part, porSimp = new Map());
      const kSimp = opts.simplify || 'full';
      g0 = porSimp.get(kSimp);
      if (!g0) { g0 = partGeometry(part, opts); porSimp.set(kSimp, g0); }
    }
    const geom = g0.clone();
    // ORIGINALES: una malla pasada en opts.geometry viene en coordenadas del
    // ENSAMBLE (lib_glb ya la colocó) — aplicarle part.pos otra vez la
    // desplazaba el doble. Sólo el explode del despiece sigue valiendo.
    const off = opts.geometry
      ? new THREE.Vector3(...(opts.explode || [0, 0, 0]))
      : new THREE.Vector3(...(opts.explode || [0, 0, 0])).add(new THREE.Vector3(...(part.pos || [0, 0, 0])));
    const q = opts.geometry ? new THREE.Quaternion() : new THREE.Quaternion(...(part.quat || [0, 0, 0, 1]));
    const m = new THREE.Matrix4().compose(off, q, new THREE.Vector3(1, 1, 1));
    geom.applyMatrix4(m);
    this.items.push({ part, geom, opts, off });
    return this;
  }

  // dir: dirección de VISTA (desde el ojo hacia la escena), up: cénit.
  // section: {n:[x,y,z], d} — plano de corte MUNDO n·p = d; se elimina lo que
  //   queda del lado del ojo (n·p < d) y las caras de material se devuelven en
  //   `cuts` (lazos par-impar) para rayarlas. Usar con dir ∥ n (vista normal).
  // shadow: true — sombra proyectada al piso (z = mínimo del modelo) según la
  //   luz de estudio; se devuelve en `shadow` y se dibuja al fondo.
  // Devuelve {segments, fills, cuts, shadow, parts:[{name,tag,bbox,anchor}]}
  project({ dir = [-1, 1, -0.62], up = [0, 0, 1], widthMM = 240, res = 1650,
            creaseDeg = 28, hidden = false, section = null, shadow = false } = {}) {
    const d = new THREE.Vector3(...dir).normalize();
    const u0 = new THREE.Vector3(...up);
    // base de pantalla: +X derecha, +Y ARRIBA (upv·up > 0 — un signo invertido
    // aquí dibuja el equipo patas arriba, defecto visto en la primera corrida)
    const right = new THREE.Vector3().crossVectors(d, u0).normalize();
    const upv = new THREE.Vector3().crossVectors(right, d).normalize();
    if (upv.dot(u0) < 0) { right.negate(); upv.negate(); }
    // ejes de pantalla: X=right, Y=upv, prof=d (mayor = más lejos)
    const P = (v) => [v.dot(right), v.dot(upv), v.dot(d)];
    // luz de estudio: arriba-izquierda-frente (coordenadas de MUNDO)
    const luz = new THREE.Vector3(-0.35, 0.4, 0.85).normalize();

    // 0) sección: recortar cada malla contra el semiespacio y juntar los
    // lazos de corte por pieza (la malla original NO se muta)
    let workItems = this.items.map(it => ({ it, geom: it.geom }));
    const cutsRaw = [];
    if (section) {
      const nS = new THREE.Vector3(...section.n).normalize().toArray();
      workItems = [];
      for (const it of this.items) {
        const { tris, cut } = clipGeomHalf(it.geom, nS, section.d);
        if (!tris.length) continue;
        const g2 = new THREE.BufferGeometry();
        g2.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
        workItems.push({ it, geom: g2 });
        const loops = chainLoops(cut);
        if (loops.length) cutsRaw.push({ it, loops });
      }
    }

    // 1) proyectar todos los vértices y calcular el encuadre
    let minX = 1e30, maxX = -1e30, minY = 1e30, maxY = -1e30, minD = 1e30, maxD = -1e30;
    let zMin = 1e30;
    const projItems = workItems.map(({ it, geom }) => {
      const pos = geom.attributes.position.array;
      const n = geom.attributes.position.count;
      const pr = new Float32Array(n * 3);
      const V = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        V.fromArray(pos, i * 3);
        if (V.z < zMin) zMin = V.z;
        const [x, y, dd] = P(V);
        pr[i * 3] = x; pr[i * 3 + 1] = y; pr[i * 3 + 2] = dd;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (dd < minD) minD = dd; if (dd > maxD) maxD = dd;
      }
      return { it, geom, pr };
    });
    // la sombra cae al piso desplazada por la luz: su extensión entra al encuadre
    const sombraDe = (x, y, z) => {
      const t = (z - zMin) / luz.z;
      return [x - luz.x * t, y - luz.y * t, zMin];
    };
    if (shadow) {
      const V = new THREE.Vector3();
      for (const { geom } of projItems) {
        const pos = geom.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          const [sx, sy, sz] = sombraDe(pos[i], pos[i + 1], pos[i + 2]);
          const [x, y] = P(V.set(sx, sy, sz));
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const w = maxX - minX, h = maxY - minY, dR = Math.max(1e-6, maxD - minD);
    const pxPerMM = (res - 4) / w;
    const H = Math.max(8, Math.ceil(h * pxPerMM) + 4);
    const toPx = (x, y) => [(x - minX) * pxPerMM + 2, (y - minY) * pxPerMM + 2];
    const sMM = widthMM / w;                          // mm de lámina por mm proyectado

    // 2) buffer de profundidad por scanline
    const depth = new Float32Array(res * H).fill(Infinity);
    for (const { geom, pr } of projItems) {
      const index = geom.index ? geom.index.array : null;
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
    const biasBase = dR * 6e-4;

    // 2b) caras de corte: al buffer (ocluyen lo de atrás del material) y a la
    // salida como lazos par-impar con el color de la pieza aclarado
    const cutFaces = [];
    for (const { it, loops } of cutsRaw) {
      const base = hexRGB(it.part.color || '#d3d5cf');
      const rgb = base.map(v => Math.min(1, v * 0.5 + 0.52));
      const V = new THREE.Vector3();
      const l2 = [], lpx = []; let dMin = 1e30;
      for (const lp of loops) {
        const a2 = [], apx = [];
        for (const q of lp) {
          const [x, y, dd] = P(V.set(q[0], q[1], q[2]));
          a2.push([(x - minX) * sMM, (y - minY) * sMM]);
          apx.push(toPx(x, y));
          if (dd < dMin) dMin = dd;
        }
        // lazos-astilla del CSG fuera (área en mm² de lámina)
        let a = 0;
        for (let i = 0, m = a2.length; i < m; i++) {
          const p0 = a2[i], p1 = a2[(i + 1) % m];
          a += p0[0] * p1[1] - p1[0] * p0[1];
        }
        if (Math.abs(a) / 2 < 0.6) continue;
        l2.push(a2); lpx.push(apx);
      }
      if (!l2.length) continue;
      rasterLoopsEO(depth, res, H, lpx, dMin - biasBase * 2);
      cutFaces.push({ loops: l2, rgb, name: it.part.name });
    }

    // 2c) sombra de piso: máscara de los triángulos proyectados por la luz
    // sobre z = zMin → contornos 4-vecinos → RDP (queda al FONDO del dibujo).
    // Relleno DIRECTO por función de arista sobre máscara Uint8 — pasar cada
    // triángulo por el scanline par-impar genérico tardaba 36 s en 7 piezas.
    let shadowOut = null;
    if (shadow) {
      const cell = 3;
      const mw = Math.ceil(res / cell), mh = Math.ceil(H / cell);
      const mask = new Uint8Array(mw * mh);
      const V = new THREE.Vector3();
      const fillTri = (ax, ay, bx, by, cx, cy) => {
        const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
        const y1 = Math.min(mh - 1, Math.ceil(Math.max(ay, by, cy)));
        const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
        const x1 = Math.min(mw - 1, Math.ceil(Math.max(ax, bx, cx)));
        if (x1 < x0 || y1 < y0) return;
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const w0 = (bx - x) * (cy - y) - (cx - x) * (by - y);
            const w1 = (cx - x) * (ay - y) - (ax - x) * (cy - y);
            const w2 = (ax - x) * (by - y) - (bx - x) * (ay - y);
            if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) mask[y * mw + x] = 1;
          }
        }
      };
      const tp = [0, 0, 0, 0, 0, 0];
      for (const { geom } of projItems) {
        const pos = geom.attributes.position.array;
        const index = geom.index ? geom.index.array : null;
        const vid = (i) => index ? index[i] : i;
        const nT = (index ? index.length : pos.length / 3) / 3;
        for (let t = 0; t < nT; t++) {
          for (let k = 0; k < 3; k++) {
            const o = vid(t * 3 + k) * 3;
            const [sx, sy, sz] = sombraDe(pos[o], pos[o + 1], pos[o + 2]);
            const [x, y] = P(V.set(sx, sy, sz));
            const [px, py] = toPx(x, y);
            tp[k * 2] = px / cell; tp[k * 2 + 1] = py / cell;
          }
          fillTri(tp[0], tp[1], tp[2], tp[3], tp[4], tp[5]);
        }
      }
      // aristas frontera entre celda llena y vacía → lazos
      const segs = [];
      const lleno = (x, y) => x >= 0 && y >= 0 && x < mw && y < mh && mask[y * mw + x] === 1;
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        if (!lleno(x, y)) continue;
        if (!lleno(x - 1, y)) segs.push([[x, y, 0], [x, y + 1, 0]]);
        if (!lleno(x + 1, y)) segs.push([[x + 1, y, 0], [x + 1, y + 1, 0]]);
        if (!lleno(x, y - 1)) segs.push([[x, y, 0], [x + 1, y, 0]]);
        if (!lleno(x, y + 1)) segs.push([[x, y + 1, 0], [x + 1, y + 1, 0]]);
      }
      const f = sMM / pxPerMM;
      const loops = chainLoops(segs, 0.25).map(lp => {
        const p2 = lp.map(([cx, cy]) => [(cx * cell - 2) * f, (cy * cell - 2) * f]);
        p2.push(p2[0]);
        const s2 = rdp(p2, 0.45); s2.pop();
        return s2;
      }).filter(lp => lp.length >= 3);
      if (loops.length) shadowOut = { loops, rgb: [0.907, 0.907, 0.905] };
    }

    // 3) aristas → tramos visibles por muestreo contra el buffer
    const segsOut = [];
    const partsMeta = [];
    const fills = [];
    for (const { it, geom, pr } of projItems) {
      // sin pintado no se necesitan los lazos de parche (línea pura — GA)
      const eds = extractEdges(geom, dir, creaseDeg, it.opts.paint !== false);

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
            const visTris = [];
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
              // sólo se descarta POLVO real: las astillas largas y delgadas
              // del CSG tapizan la cara — filtrarlas por área pintaba vetas
              // blancas «salpicadura» (visto en las mechas del manual GT)
              const a2 = Math.abs((l2[1][0] - l2[0][0]) * (l2[2][1] - l2[0][1]) - (l2[2][0] - l2[0][0]) * (l2[1][1] - l2[0][1]));
              if (a2 < 0.05) return;
              visTris.push({ l2, cd });
            };
            for (const t of projTris) emit(t.p3[0], t.p3[1], t.p3[2], 0);
            // FUSIÓN DEL PARCHE (23-08): los sub-triángulos visibles de un
            // parche son COPLANARES, del MISMO tono y todos pasaron la prueba
            // de visibilidad (nada los tapa). Emitirlos uno a uno escribía sus
            // aristas interiores DOS veces — 54.515 polígonos y 3,7 MB de
            // dígitos en una sola lámina del manual. Se fusionan por CONTORNO:
            // las aristas que aparecen una sola vez son el borde de la unión;
            // el interior desaparece. La mancha pintada es la misma.
            // …pero fusionar el parche ENTERO lo pintaría a la profundidad de su
            // punto MÁS LEJANO: en una placa de 5 m que se aleja, el orden del
            // pintor se pierde y lo que va detrás (la guía azul) queda encima.
            // Se fusiona DENTRO de bandas finas de profundidad: se gana el
            // archivo sin perder el orden.
            if (visTris.length) {
              let dLo = Infinity, dHi = -Infinity;
              for (const v of visTris) { if (v.cd < dLo) dLo = v.cd; if (v.cd > dHi) dHi = v.cd; }
              const paso = (dR || 1) / 128;
              const nBan = Math.max(1, Math.min(128, Math.ceil((dHi - dLo) / paso)));
              const bandas = new Map();
              for (const v of visTris) {
                const i = nBan === 1 ? 0
                  : Math.min(nBan - 1, Math.floor((v.cd - dLo) / (dHi - dLo) * nBan));
                let b = bandas.get(i);
                if (!b) bandas.set(i, b = { tris: [], d: -Infinity });
                b.tris.push(v.l2); if (v.cd > b.d) b.d = v.cd;
              }
              for (const b of bandas.values()) {
                const fus = fusionaTris(b.tris);
                if (fus) fills.push({ loops: fus, rgb, depth: b.d });
                else for (const l2 of b.tris) fills.push({ loops: [l2], rgb, depth: b.d });
              }
            }
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
    return { segments: segsOut, fills, cuts: cutFaces, shadow: shadowOut,
             widthMM, heightMM: h * sMM, parts: partsMeta, spanU: w, spanV: h,
             // origen proyectado (para ubicar marcas de plano de corte en mm de lámina):
             // lámina_x = (P(p)·right − minU) · widthMM/spanU
             minU: minX, minV: minY, toSheet: (p) => {
               const v = new THREE.Vector3(p[0], p[1], p[2]);
               return [(v.dot(right) - minX) * sMM, (v.dot(upv) - minY) * sMM];
             } };
  }
}

// ── SECCIÓN: recorte de la malla contra el semiespacio n·p ≥ d ───────────────
// Fusiona triángulos COPLANARES del mismo tono en el polígono de su unión.
// Las aristas interiores se cancelan (aparecen dos veces); las que aparecen
// UNA sola vez son el contorno. Devuelve los lazos, o null si el contorno no
// cierra (los T-junction de la subdivisión pueden dejarlo abierto) — el
// llamador entonces emite los triángulos sueltos y no se dibuja de menos.
function fusionaTris(tris) {
  if (tris.length < 2) return tris.length ? [tris[0]] : null;
  const Q = 1e3;                                   // rejilla de 1 µm
  const pos = new Map();                           // clave → punto canónico
  const cnt = new Map();                           // arista NO dirigida → veces
  const vistas = new Set();                        // arista dirigida vista
  const kDe = (p) => {
    const k = `${Math.round(p[0] * Q)},${Math.round(p[1] * Q)}`;
    if (!pos.has(k)) pos.set(k, p);
    return k;
  };
  for (const t of tris) {
    const k = [kDe(t[0]), kDe(t[1]), kDe(t[2])];
    if (k[0] === k[1] || k[1] === k[2] || k[2] === k[0]) continue;   // degenerado
    for (let i = 0; i < 3; i++) {
      const a = k[i], b = k[(i + 1) % 3];
      const nd = a < b ? `${a}|${b}` : `${b}|${a}`;
      cnt.set(nd, (cnt.get(nd) || 0) + 1);
      vistas.add(`${a}>${b}`);
    }
  }
  // contorno: aristas de multiplicidad 1, en el sentido en que se recorrieron
  const sig = new Map();
  let nB = 0;
  for (const [nd, c] of cnt) {
    if (c !== 1) continue;
    const [a, b] = nd.split('|');
    const ok = vistas.has(`${a}>${b}`);
    const o = ok ? a : b, d = ok ? b : a;
    if (!sig.has(o)) sig.set(o, []);
    sig.get(o).push(d); nB++;
  }
  if (!nB) return null;
  // En un vértice donde el contorno se PELLIZCA (la región visible se toca a
  // sí misma) salen varias aristas: tomar «la primera libre» arma un lazo que
  // corta por dentro de la región y pinta donde no debe (se vio la guía azul
  // encima de la placa). Se elige por ÁNGULO: la primera arista en sentido
  // horario a partir de la de entrada invertida — el recorrido estándar de
  // caras de un grafo plano, que nunca cruza el interior.
  const ang = (a, b) => {
    const pa = pos.get(a), pb = pos.get(b);
    return Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
  };
  const usada = new Set(), lazos = [];
  for (const [o, dests] of sig) {
    for (const d0 of dests) {
      if (usada.has(`${o}>${d0}`)) continue;
      usada.add(`${o}>${d0}`);
      const lazo = [o]; let prev = o, cur = d0, guard = 0;
      while (cur !== o) {
        lazo.push(cur);
        const salidas = (sig.get(cur) || []).filter(x => !usada.has(`${cur}>${x}`));
        if (!salidas.length || ++guard > nB + 4) return null;    // no cierra
        let nx = salidas[0];
        if (salidas.length > 1) {
          const ref = ang(cur, prev);                            // de vuelta
          let mejor = Infinity;
          for (const c of salidas) {
            let d = ref - ang(cur, c);
            while (d <= 0) d += 2 * Math.PI;
            while (d > 2 * Math.PI) d -= 2 * Math.PI;
            if (d < mejor) { mejor = d; nx = c; }
          }
        }
        usada.add(`${cur}>${nx}`);
        prev = cur; cur = nx;
      }
      if (lazo.length >= 3) lazos.push(lazo.map(k => pos.get(k)));
    }
  }
  return lazos.length ? lazos : null;
}

// Devuelve los triángulos del lado que QUEDA y los tramos de corte (los que
// cruzan el plano) para encadenarlos en lazos y rayarlos como material.
function clipGeomHalf(geom, n, d) {
  const pos = geom.attributes.position.array;
  const idx = geom.index ? geom.index.array : null;
  const nTri = (idx ? idx.length : pos.length / 3) / 3;
  const vid = (i) => idx ? idx[i] : i;
  const out = []; const cut = [];
  const S = (o) => n[0] * pos[o] + n[1] * pos[o + 1] + n[2] * pos[o + 2] - d;
  const V = (o) => [pos[o], pos[o + 1], pos[o + 2]];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (let t = 0; t < nTri; t++) {
    const o = [vid(t * 3) * 3, vid(t * 3 + 1) * 3, vid(t * 3 + 2) * 3];
    const s = o.map(S), v = o.map(V);
    if (s[0] >= 0 && s[1] >= 0 && s[2] >= 0) { out.push(v[0], v[1], v[2]); continue; }
    if (s[0] < 0 && s[1] < 0 && s[2] < 0) continue;
    const poly = []; const onCut = [];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3], sa = s[e], sb = s[(e + 1) % 3];
      if (sa >= 0) poly.push(a);
      if ((sa < 0) !== (sb < 0)) {
        const p = lerp(a, b, sa / (sa - sb));
        poly.push(p); onCut.push(p);
      }
    }
    if (onCut.length === 2) cut.push([onCut[0], onCut[1]]);
    for (let k = 2; k < poly.length; k++) out.push(poly[0], poly[k - 1], poly[k]);
  }
  return { tris: out, cut };
}

// encadena tramos [a,b] (puntos 3D) en lazos cerrados, soldando extremos en
// una grilla de tolerancia — en las bifurcaciones (astillas CSG) toma el
// primer candidato libre; los lazos espurios se filtran después por área
function chainLoops(segs, tol = 0.05) {
  const key = (p) => `${Math.round(p[0] / tol)},${Math.round(p[1] / tol)},${Math.round(p[2] / tol)}`;
  const adj = new Map();
  const put = (k, e) => { const a = adj.get(k); if (a) a.push(e); else adj.set(k, [e]); };
  segs = segs.filter(([a, b]) => key(a) !== key(b));
  segs.forEach(([a, b], i) => { put(key(a), [i, 0]); put(key(b), [i, 1]); });
  const used = new Uint8Array(segs.length);
  const loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const lp = [segs[i][0], segs[i][1]];
    for (let guard = 0; guard < segs.length; guard++) {
      const kEnd = key(lp[lp.length - 1]);
      if (lp.length > 2 && kEnd === key(lp[0])) break;
      const cands = (adj.get(kEnd) || []).filter(([j]) => !used[j]);
      if (!cands.length) break;
      const [j, end] = cands[0];
      used[j] = 1;
      lp.push(segs[j][end === 0 ? 1 : 0]);
    }
    if (lp.length >= 4 && key(lp[0]) === key(lp[lp.length - 1])) { lp.pop(); loops.push(lp); }
  }
  return loops;
}

// relleno par-impar de lazos EN PIXELES sobre el buffer de profundidad — la
// cara de corte debe OCLUIR lo que queda detrás del material seccionado
function rasterLoopsEO(depth, W, H, loops, dz) {
  let y0 = 1e30, y1 = -1e30;
  for (const lp of loops) for (const p of lp) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const yA = Math.max(0, Math.ceil(y0)), yB = Math.min(H - 1, Math.floor(y1));
  for (let y = yA; y <= yB; y++) {
    const xs = [];
    for (const lp of loops) {
      for (let i = 0, m = lp.length; i < m; i++) {
        const a = lp[i], b = lp[(i + 1) % m];
        if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xA = Math.max(0, Math.ceil(xs[k])), xB = Math.min(W - 1, Math.floor(xs[k + 1]));
      for (let x = xA; x <= xB; x++) { const o = y * W + x; if (dz < depth[o]) depth[o] = dz; }
    }
  }
}

// simplificación Ramer–Douglas–Peucker (para el contorno de la sombra)
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    const [ax, ay] = pts[i0], [bx, by] = pts[i1];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    let dm = -1, im = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const t = Math.max(0, Math.min(1, ((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / L2));
      const ex = ax + dx * t - pts[i][0], ey = ay + dy * t - pts[i][1];
      const e = ex * ex + ey * ey;
      if (e > dm) { dm = e; im = i; }
    }
    if (dm > eps * eps) { keep[im] = 1; stack.push([i0, im], [im, i1]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// rayado 45° recortado par-impar dentro de lazos (coordenadas de lámina, mm)
export function hatchLoops(loops, step = 3.2, ang = Math.PI / 4) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  // u a lo largo de la línea de rayado, v perpendicular (v = const por línea)
  const uv = ([x, y]) => [x * ca + y * sa, -x * sa + y * ca];
  const xy = (u, v) => [u * ca - v * sa, u * sa + v * ca];
  let v0 = 1e30, v1 = -1e30;
  const L = loops.map(lp => lp.map(p => { const q = uv(p); if (q[1] < v0) v0 = q[1]; if (q[1] > v1) v1 = q[1]; return q; }));
  const out = [];
  for (let v = v0 + step * 0.6; v < v1; v += step) {
    const us = [];
    for (const lp of L) {
      for (let i = 0, m = lp.length; i < m; i++) {
        const a = lp[i], b = lp[(i + 1) % m];
        if ((a[1] <= v) !== (b[1] <= v)) us.push(a[0] + (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]));
      }
    }
    us.sort((p, q) => p - q);
    for (let k = 0; k + 1 < us.length; k += 2) {
      if (us[k + 1] - us[k] < 0.3) continue;
      out.push([xy(us[k], v), xy(us[k + 1], v)]);
    }
  }
  return out;
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
  // sombra de piso al FONDO de todo
  if (fig.shadow) {
    sh.solidPoly(fig.shadow.loops.map(lp => lp.map(([x, y]) => [ox + x, oy + y])), fig.shadow.rgb);
  }
  for (const f of (fig.fills || [])) {
    sh.solidPoly(f.loops.map(lp => lp.map(([x, y]) => [ox + x, oy + y])), f.rgb);
  }
  // caras de corte: tono de material + rayado 45° (alternando por pieza) +
  // contorno grueso — el estándar de sección de dibujo técnico. Sección
  // DELGADA (chapa de canto, banda): ennegrecida en vez de rayada (ISO 128 —
  // en <2,2 mm de lámina no cabe ni una línea de rayado y el pastel se pierde)
  (fig.cuts || []).forEach((c, i) => {
    const loops = c.loops.map(lp => lp.map(([x, y]) => [ox + x, oy + y]));
    let delgada = true;
    for (const lp of loops) {
      let x0 = 1e30, y0 = 1e30, x1 = -1e30, y1 = -1e30;
      for (const [x, y] of lp) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      if (Math.min(x1 - x0, y1 - y0) > 2.2) { delgada = false; break; }
    }
    if (delgada) {
      sh.solidPoly(loops, c.rgb.map(v => v * 0.32));
      return;
    }
    sh.solidPoly(loops, c.rgb);
    for (const [a, b] of hatchLoops(loops, 3.1, (i % 2 ? 3 : 1) * Math.PI / 4)) {
      sh.line(a, b, 'FINA');
    }
    for (const lp of loops) {
      for (let k = 0, m = lp.length; k < m; k++) sh.line(lp[k], lp[(k + 1) % m], 'VISIBLE');
    }
  });
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
