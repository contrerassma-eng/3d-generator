// brep.mjs — IDENTIDAD ANALÍTICA de las piezas propias (PRD_MOTOR_BREP).
//
// El problema que resuelve
// -----------------------
// Cuando `makeHoleFeature` corta un Ø10, en ese instante el sistema SABE que es
// un círculo de radio 5 con eje `dir` en el punto `at`. Un milisegundo después
// eso ya no existe: hay 48 triangulitos y nadie sabe de dónde vinieron. Todo lo
// que viene después —aristas, siluetas, oclusión, secciones, STEP— es
// arqueología sobre triángulos, y de ahí salen el moteado (D-13), el punteado
// de teselación (D-15) y el peso de los libros.
//
// Aquí la pieza lleva su CARTA DE IDENTIDAD junto a la malla: esta cara es un
// PLANO, esta otra es un CILINDRO Ø10 con eje aquí. El id de cada cara viaja en
// el atributo `cara` de la geometría y sobrevive a las booleanas por el
// `shared` del BSP (ver csg.js). El dibujo deja de adivinar: pregunta.
//
// Qué NO es: no es un kernel B-Rep. No hay NURBS, ni intersección general de
// superficies, ni topología completa. Sólo las superficies que nuestros equipos
// usan de verdad, declaradas por quien las construye — nunca detectadas a
// posteriori, que es justo el error que venimos a corregir.
//
// Convivencia (NO2 del PRD): los originales del fabricante NO tienen registro y
// se siguen dibujando como hoy. Una malla sin `cara` no paga nada.

import * as THREE from 'three';

export const SUP = { PLANO: 'plano', CILINDRO: 'cilindro', CONO: 'cono' };
export const CUR = { RECTA: 'recta', CIRCULO: 'circulo' };

const EPS_N = 1e-4;        // tolerancia de normal (coseno)
const EPS_D = 1e-3;        // tolerancia de offset, en mm

export function nuevoRegistro() {
  return { caras: [], _idx: new Map() };
}

// ── alta de caras ──────────────────────────────────────────────────────────
// Las altas son IDEMPOTENTES por geometría: pedir dos veces el mismo plano
// devuelve el mismo id. Así las caras coplanares de features distintos quedan
// como UNA cara, que es lo que hace que el contorno salga entero y no en trozos.

const kPlano = (n, d) =>
  `P${Math.round(n[0] / EPS_N)},${Math.round(n[1] / EPS_N)},${Math.round(n[2] / EPS_N)},${Math.round(d / EPS_D)}`;

export function caraPlano(reg, n, d, meta = {}) {
  const L = Math.hypot(n[0], n[1], n[2]) || 1;
  const nn = [n[0] / L, n[1] / L, n[2] / L];
  const k = kPlano(nn, d);
  if (reg._idx.has(k)) return reg._idx.get(k);
  const id = reg.caras.length;
  reg.caras.push({ id, tipo: SUP.PLANO, n: nn, d, ...meta });
  reg._idx.set(k, id);
  return id;
}

export function caraCilindro(reg, at, dir, r, meta = {}) {
  const L = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const dd = [dir[0] / L, dir[1] / L, dir[2] / L];
  // eje canónico: el punto del eje más cercano al origen + signo estable, para
  // que el MISMO cilindro pedido desde dos features caiga en un solo id
  const t = -(at[0] * dd[0] + at[1] * dd[1] + at[2] * dd[2]);
  const p0 = [at[0] + dd[0] * t, at[1] + dd[1] * t, at[2] + dd[2] * t];
  const sg = (dd[0] || dd[1] || dd[2]) < 0 ? -1 : 1;
  const de = [dd[0] * sg, dd[1] * sg, dd[2] * sg];
  const k = `C${Math.round(p0[0] / EPS_D)},${Math.round(p0[1] / EPS_D)},${Math.round(p0[2] / EPS_D)},` +
    `${Math.round(de[0] / EPS_N)},${Math.round(de[1] / EPS_N)},${Math.round(de[2] / EPS_N)},${Math.round(r / EPS_D)}`;
  if (reg._idx.has(k)) return reg._idx.get(k);
  const id = reg.caras.length;
  reg.caras.push({ id, tipo: SUP.CILINDRO, at: p0, dir: de, r, ...meta });
  reg._idx.set(k, id);
  return id;
}

export function caraCono(reg, at, dir, r0, r1, len, meta = {}) {
  const L = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const dd = [dir[0] / L, dir[1] / L, dir[2] / L];
  const id = reg.caras.length;
  reg.caras.push({ id, tipo: SUP.CONO, at: [...at], dir: dd, r0, r1, len, ...meta });
  return id;                                        // los conos no se unifican
}

export const fichaDe = (reg, id) =>
  (reg && id != null && id >= 0 && id < reg.caras.length) ? reg.caras[id] : null;

// ── etiquetado de geometría ────────────────────────────────────────────────

// Escribe el atributo `cara` (uno por VÉRTICE, igual en los tres del triángulo,
// que es como csg.js lo lee y lo devuelve).
export function marcar(geom, ids) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const nTri = g.attributes.position.count / 3;
  const arr = new Float32Array(g.attributes.position.count);
  for (let t = 0; t < nTri; t++) {
    const v = ids[t] == null ? -1 : ids[t];
    arr[t * 3] = v; arr[t * 3 + 1] = v; arr[t * 3 + 2] = v;
  }
  g.setAttribute('cara', new THREE.BufferAttribute(arr, 1));
  return g;
}

// Devuelve el id de cara de cada TRIÁNGULO (o -1). Es la lectura recíproca de
// `marcar`, y la que usa el dibujo para preguntar qué es cada triángulo.
export function idsDe(geom) {
  const a = geom.attributes.cara;
  if (!a) return null;
  const n = a.count / 3, out = new Int32Array(n);
  for (let t = 0; t < n; t++) out[t] = a.array[t * 3];
  return out;
}

// Etiqueta por PLANO REAL de cada triángulo: sirve para toda geometría de caras
// planas (caja, prisma de croquis, chapa) sin suponer el orden en que el
// constructor emitió los triángulos — se mide, no se asume.
export function marcarPlanos(geom, reg, meta = {}) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const p = g.attributes.position.array;
  const nTri = g.attributes.position.count / 3;
  const ids = new Array(nTri);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const u = new THREE.Vector3(), v = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    const o = t * 9;
    A.set(p[o], p[o + 1], p[o + 2]);
    B.set(p[o + 3], p[o + 4], p[o + 5]);
    C.set(p[o + 6], p[o + 7], p[o + 8]);
    u.subVectors(B, A); v.subVectors(C, A); nrm.crossVectors(u, v);
    if (nrm.lengthSq() < 1e-18) { ids[t] = -1; continue; }   // astilla: sin ficha
    nrm.normalize();
    ids[t] = caraPlano(reg, [nrm.x, nrm.y, nrm.z], nrm.dot(A), meta);
  }
  return marcar(g, ids);
}

// ── constructores CON identidad ────────────────────────────────────────────
// Son los que declaran. Cualquier otra vía de construcción queda sin ficha, y
// la compuerta `identidad-analitica` la delata en vez de dejarla pasar callada.

export function caja(reg, w, d, h, at = [0, 0, 0], meta = {}) {
  const g = new THREE.BoxGeometry(w, d, h);
  g.translate(at[0], at[1], at[2]);
  return marcarPlanos(g, reg, meta);
}

// Cilindro con eje arbitrario: la PARED lleva un solo id (es UNA cara
// cilíndrica, no 48 caritas) y cada tapa el suyo, plano.
export function cilindro(reg, at, dir, r, len, segs = 48, meta = {}) {
  const g = new THREE.CylinderGeometry(r, r, len, segs).toNonIndexed();
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const mid = new THREE.Vector3(...at).addScaledVector(d, len / 2);
  g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));

  const idPared = caraCilindro(reg, at, dir, r, { ...meta, parte: 'pared' });
  const base = new THREE.Vector3(...at);
  const tapa1 = caraPlano(reg, [-d.x, -d.y, -d.z], -base.dot(d), { ...meta, parte: 'tapa' });
  const fin = base.clone().addScaledVector(d, len);
  const tapa2 = caraPlano(reg, [d.x, d.y, d.z], fin.dot(d), { ...meta, parte: 'tapa' });

  // clasificación por la normal del triángulo: si es ⟂ al eje es tapa, si no,
  // pared. No se supone el orden de emisión de THREE.
  const p = g.attributes.position.array;
  const nTri = g.attributes.position.count / 3;
  const ids = new Array(nTri);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const uu = new THREE.Vector3(), vv = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    const o = t * 9;
    A.set(p[o], p[o + 1], p[o + 2]);
    B.set(p[o + 3], p[o + 4], p[o + 5]);
    C.set(p[o + 6], p[o + 7], p[o + 8]);
    uu.subVectors(B, A); vv.subVectors(C, A); nn.crossVectors(uu, vv);
    if (nn.lengthSq() < 1e-18) { ids[t] = -1; continue; }
    nn.normalize();
    const cd = nn.dot(d);
    ids[t] = Math.abs(cd) > 0.999 ? (cd > 0 ? tapa2 : tapa1) : idPared;
  }
  return marcar(g, ids);
}

// Marcado GUIADO POR EJE: para una geometría de revolución (barreno, muñón,
// caja de asiento, avellanado) el eje lo declara el feature — no se detecta. Con
// el eje dado, el radio y la inclinación de cada triángulo se MIDEN, que es
// exacto sobre una superficie teselada. Así una pared cilíndrica de 48 facetas
// queda como UNA cara, y un avellanado de 48 facetas como UN cono.
export function marcarEjeConocido(geom, reg, at, dir, meta = {}) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const p = g.attributes.position.array;
  const nTri = g.attributes.position.count / 3;
  const ids = new Array(nTri);
  const d = new THREE.Vector3(...dir).normalize();
  const O = new THREE.Vector3(...at);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const u = new THREE.Vector3(), v = new THREE.Vector3(), nn = new THREE.Vector3();
  const w = new THREE.Vector3();
  const radio = (P) => { w.subVectors(P, O); return w.addScaledVector(d, -w.dot(d)).length(); };
  const axial = (P) => { w.subVectors(P, O); return w.dot(d); };
  const conos = new Map();
  for (let t = 0; t < nTri; t++) {
    const o = t * 9;
    A.set(p[o], p[o + 1], p[o + 2]);
    B.set(p[o + 3], p[o + 4], p[o + 5]);
    C.set(p[o + 6], p[o + 7], p[o + 8]);
    u.subVectors(B, A); v.subVectors(C, A); nn.crossVectors(u, v);
    if (nn.lengthSq() < 1e-18) { ids[t] = -1; continue; }
    nn.normalize();
    const cd = nn.dot(d);
    if (Math.abs(cd) > 0.999) {                       // ⟂ al eje → tapa plana
      ids[t] = caraPlano(reg, [nn.x, nn.y, nn.z], nn.dot(A), { ...meta, parte: 'tapa' });
      continue;
    }
    const rA = radio(A), rB = radio(B), rC = radio(C);
    const rMax = Math.max(rA, rB, rC), rMin = Math.min(rA, rB, rC);
    if (Math.abs(cd) < 0.02 && rMax - rMin < 0.02) {  // radial y radio constante → CILINDRO
      ids[t] = caraCilindro(reg, at, dir, (rA + rB + rC) / 3, { ...meta, parte: 'pared' });
      continue;
    }
    if (rMax - rMin > 0.02) {                          // el radio varía → CONO
      // ápice sobre el eje: donde el radio llegaría a cero siguiendo la pendiente
      const sA = axial(A), sB = axial(B), sC = axial(C);
      const ds = Math.max(sA, sB, sC) - Math.min(sA, sB, sC);
      const m = ds > 1e-9 ? (rMax - rMin) / ds : 0;    // |dr/ds|
      if (m > 1e-6) {
        const sgn = ((rA - rB) * (sA - sB)) >= 0 ? 1 : -1;
        const pend = m * sgn;
        const s0 = sA - rA / pend;                     // s del ápice
        const k = `K${Math.round(s0 / EPS_D)},${Math.round(pend / EPS_N)},` +
          `${Math.round(d.x / EPS_N)},${Math.round(d.y / EPS_N)},${Math.round(d.z / EPS_N)}`;
        if (!conos.has(k)) {
          const ap = O.clone().addScaledVector(d, s0);
          conos.set(k, caraCono(reg, ap.toArray(), dir, 0, 1, 1 / Math.abs(pend), { ...meta, parte: 'cono', pend }));
        }
        ids[t] = conos.get(k);
        continue;
      }
    }
    ids[t] = caraPlano(reg, [nn.x, nn.y, nn.z], nn.dot(A), meta);   // resto: plano real
  }
  return marcar(g, ids);
}

// ── consultas que usa el dibujo ────────────────────────────────────────────

// Silueta EXACTA de una cara cilíndrica vista según `vista`: las dos
// generatrices donde el radio es perpendicular a la vista. Devuelve null si el
// eje mira de frente (ahí la silueta es el círculo de la tapa, que ya es
// analítico por su lado).
export function siluetaCilindro(ficha, vista, sMin, sMax) {
  const d = new THREE.Vector3(...ficha.dir);
  const v = new THREE.Vector3(...vista).normalize();
  const perp = new THREE.Vector3().crossVectors(d, v);
  if (perp.lengthSq() < 1e-8) return null;                 // eje ∥ vista
  perp.normalize();
  const at = new THREE.Vector3(...ficha.at);
  const a0 = at.clone().addScaledVector(d, sMin);
  const a1 = at.clone().addScaledVector(d, sMax);
  return [
    [a0.clone().addScaledVector(perp, ficha.r).toArray(), a1.clone().addScaledVector(perp, ficha.r).toArray()],
    [a0.clone().addScaledVector(perp, -ficha.r).toArray(), a1.clone().addScaledVector(perp, -ficha.r).toArray()],
  ];
}

// Rango axial ocupado por los triángulos de una cara cilíndrica — el largo real
// del barreno o del muñón después de las booleanas, no el del cilindro con que
// se cortó.
export function rangoAxial(geom, ids, idCara, ficha) {
  const p = geom.attributes.position.array;
  const at = ficha.at, dr = ficha.dir;
  let lo = Infinity, hi = -Infinity;
  for (let t = 0; t < ids.length; t++) {
    if (ids[t] !== idCara) continue;
    for (let k = 0; k < 3; k++) {
      const o = t * 9 + k * 3;
      const s = (p[o] - at[0]) * dr[0] + (p[o + 1] - at[1]) * dr[1] + (p[o + 2] - at[2]) * dr[2];
      if (s < lo) lo = s; if (s > hi) hi = s;
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

// Cobertura: qué fracción de los triángulos tiene ficha. Es la métrica de la
// compuerta G3 del PRD — una pieza propia que baje del umbral está perdiendo
// identidad en alguna vía de construcción sin declarar.
export function cobertura(geom) {
  const ids = idsDe(geom);
  if (!ids) return { total: geom.attributes.position.count / 3, con: 0, pct: 0 };
  let con = 0;
  for (const v of ids) if (v >= 0) con++;
  return { total: ids.length, con, pct: Math.round(1000 * con / ids.length) / 10 };
}
