// model.js — documento paramétrico: piezas, funciones (features), regeneración
// por CSG, detección de caras planas y ejes, y solver de restricciones de ensamble.

import * as THREE from 'three';
import { CSG, geomToCSG, csgToGeom } from './csg.js';
import { chainLoops, regions, entityPoints } from './sketch2d.js';
import { chapaFeatureGeometry } from './sheetmetal.js';

let _id = 0;
export const uid = (p) => `${p}${(++_id).toString(36)}${Date.now().toString(36).slice(-4)}`;

export const PALETTE = ['#6d9ee8', '#e8a56d', '#7fc98a', '#c98ad0', '#d9c96b', '#6bc9c2', '#e07f7f', '#9a9fe0'];

// ---------- Documento ----------

export function newDoc() {
  return { format: 'foto3d-cad', version: 1, parts: [], constraints: [] };
}

export function newPart(doc, name) {
  const part = {
    id: uid('p'),
    name: name || `Pieza ${doc.parts.length + 1}`,
    color: PALETTE[doc.parts.length % PALETTE.length],
    pos: [0, 0, 0],
    quat: [0, 0, 0, 1],
    fixed: doc.parts.length === 0, // la primera pieza queda fija (a tierra)
    visible: true,
    features: [],
  };
  doc.parts.push(part);
  return part;
}

export const getPart = (doc, id) => doc.parts.find(p => p.id === id);
export const getFeature = (part, id) => part.features.find(f => f.id === id);

export function partMatrix(part) {
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(...part.pos),
    new THREE.Quaternion(...part.quat),
    new THREE.Vector3(1, 1, 1)
  );
  return m;
}

// ---------- Funciones (features) ----------
// f = { id, name, shape:'box'|'cylinder'|'hole', op:'union'|'cut',
//       at:[x,y,z] (local), dir:[x,y,z] (eje unitario, cilindro/agujero),
//       params:{...} }
// box:      params {w,d,h}    'at' = centro de la base, crece en +Z local del feature
// cylinder: params {dia,h}    'at' = centro de la base, eje 'dir'
// hole:     params {dia, depth, through} 'at' = punto en la cara, 'dir' = hacia adentro

export function makeBoxFeature(w, d, h, at = [0, 0, 0], op = 'union') {
  return { id: uid('f'), name: op === 'cut' ? 'Corte caja' : 'Caja', shape: 'box', op, at, dir: [0, 0, 1], params: { w, d, h } };
}
export function makeCylFeature(dia, h, at = [0, 0, 0], dir = [0, 0, 1], op = 'union') {
  return { id: uid('f'), name: op === 'cut' ? 'Corte cilindro' : 'Cilindro', shape: 'cylinder', op, at, dir, params: { dia, h } };
}
export function makeHoleFeature(dia, depth, through, at, dir) {
  return { id: uid('f'), name: `Agujero Ø${dia}`, shape: 'hole', op: 'cut', at, dir, params: { dia, depth, through: !!through } };
}
// Boceto extruido: 'at' = origen del plano (local), 'dir' = normal de la cara
// (hacia afuera), params.u = eje U del plano, params.pts = [[u,v],...] del
// contorno, params.h = altura. Unión extruye hacia afuera; corte hacia adentro.
export function makeSketchFeature(pts, h, op, at, dir, u) {
  return { id: uid('f'), name: op === 'cut' ? 'Corte de boceto' : 'Extrusión de boceto', shape: 'sketch', op, at, dir, params: { pts, h, u } };
}
// Variante con entidades 2D (líneas/círculos/arcos) + cotas editables: el
// contorno (y sus agujeros) se encadena en cada regeneración.
export function makeSketchEntitiesFeature(entities, dims, h, op, at, dir, u) {
  return { id: uid('f'), name: op === 'cut' ? 'Corte de boceto' : 'Extrusión de boceto', shape: 'sketch', op, at, dir, params: { entities, dims, h, u } };
}
// Revolución 360° del contorno alrededor de una línea del boceto (axis en 2D).
export function makeRevolveFeature(entities, dims, axis, op, at, dir, u) {
  return { id: uid('f'), name: op === 'cut' ? 'Corte de revolución' : 'Revolución de boceto', shape: 'revolve', op, at, dir, params: { entities, dims, axis, u } };
}
// Patrón de una función existente (símil "Patrón" de Inventor). Replica la
// geometría de la función origen en varias ocurrencias, aplicando su misma
// operación (unión/corte). El origen queda como la ocurrencia (0,0).
//   kind:'rect' → params {sourceId, nx, ny, dx, dy, u:[..], v:[..]}
//   kind:'circ' → params {sourceId, n, angle, axisAt:[..], axisDir:[..]}
export function makePatternFeature(sourceId, kind, params) {
  const name = kind === 'circ' ? 'Patrón circular' : 'Patrón rectangular';
  return { id: uid('f'), name, shape: 'pattern', op: 'pattern', at: [0, 0, 0], dir: [0, 0, 1], params: { sourceId, kind, ...params } };
}

// Matrices (excluida la identidad, que es la ocurrencia origen) de un patrón.
export function patternMatrices(f) {
  const mats = [];
  const p = f.params;
  if (p.kind === 'circ') {
    const n = Math.max(1, Math.round(p.n));
    const total = p.angle ?? 360;
    const full = Math.abs(total) >= 359.999;
    const step = (full ? total / n : total / Math.max(1, n - 1)) * Math.PI / 180;
    const at = new THREE.Vector3(...(p.axisAt || [0, 0, 0]));
    const axis = new THREE.Vector3(...(p.axisDir || [0, 0, 1])).normalize();
    for (let k = 1; k < n; k++) {
      const m = new THREE.Matrix4()
        .makeTranslation(at.x, at.y, at.z)
        .multiply(new THREE.Matrix4().makeRotationAxis(axis, step * k))
        .multiply(new THREE.Matrix4().makeTranslation(-at.x, -at.y, -at.z));
      mats.push(m);
    }
    return mats;
  }
  // rectangular
  const nx = Math.max(1, Math.round(p.nx)), ny = Math.max(1, Math.round(p.ny));
  const u = new THREE.Vector3(...(p.u || [1, 0, 0]));
  const v = new THREE.Vector3(...(p.v || [0, 1, 0]));
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      if (i === 0 && j === 0) continue; // ocurrencia origen
      const off = u.clone().multiplyScalar(i * p.dx).addScaledVector(v, j * p.dy);
      mats.push(new THREE.Matrix4().makeTranslation(off.x, off.y, off.z));
    }
  }
  return mats;
}

const SEGMENTS = 48;

function cylinderAlong(at, dir, radius, len) {
  const g = new THREE.CylinderGeometry(radius, radius, len, SEGMENTS);
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const mid = new THREE.Vector3(...at).addScaledVector(d, len / 2);
  const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(m);
  return g;
}

function featureGeometry(f, extent, first) {
  if (f.shape === 'box') {
    const { w, d, h } = f.params;
    const g = new THREE.BoxGeometry(w, d, h);
    g.translate(f.at[0], f.at[1], f.at[2] + h / 2);
    return g;
  }
  if (f.shape === 'cylinder') {
    return cylinderAlong(f.at, f.dir, f.params.dia / 2, f.params.h);
  }
  if (f.shape === 'hole') {
    const back = 0.5; // arranca 0.5 mm por fuera de la cara para evitar caras coplanares
    const len = (f.params.through ? extent + 1 : f.params.depth) + back;
    const d = new THREE.Vector3(...f.dir).normalize();
    const start = new THREE.Vector3(...f.at).addScaledVector(d, -back);
    return cylinderAlong(start.toArray(), d.toArray(), f.params.dia / 2, len);
  }
  if (f.shape === 'sketch') {
    const ccw = (arr) => { // orientar para que ExtrudeGeometry genere un sólido válido
      let area = 0;
      for (let i = 0; i < arr.length; i++) {
        const [x1, y1] = arr[i], [x2, y2] = arr[(i + 1) % arr.length];
        area += x1 * y2 - x2 * y1;
      }
      return area < 0 ? [...arr].reverse() : arr;
    };
    let regs;
    if (f.params.entities) {
      regs = regions(f.params.entities, f.params.excluded || []).regions;
    } else {
      regs = (f.params.pts && f.params.pts.length >= 3) ? [{ outer: f.params.pts, holes: [] }] : [];
    }
    if (!regs.length) return null; // sin contorno cerrado: se omite
    const shapes = regs.map(reg => {
      const shape = new THREE.Shape(ccw(reg.outer).map(p => new THREE.Vector2(p[0], p[1])));
      for (const hole of reg.holes) {
        const hp = ccw(hole).reverse(); // agujeros con orientación opuesta
        shape.holes.push(new THREE.Path(hp.map(p => new THREE.Vector2(p[0], p[1]))));
      }
      return shape;
    });
    const shape = shapes; // ExtrudeGeometry acepta Shape[]
    const isCut = f.op === 'cut';
    const over = 0.5;
    const fuse = first ? 0 : 0.2; // solape para fusionar con material previo (si lo hay)
    const depth = f.params.h + (isCut ? over : fuse);
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
    // unión: de -fuse a +h (hacia afuera); corte: de -h a +over (hacia adentro)
    g.translate(0, 0, isCut ? -f.params.h : -fuse);
    const n = new THREE.Vector3(...f.dir).normalize();
    const U = new THREE.Vector3(...f.params.u);
    U.addScaledVector(n, -U.dot(n)).normalize();
    const V = new THREE.Vector3().crossVectors(n, U);
    const m = new THREE.Matrix4().makeBasis(U, V, n).setPosition(new THREE.Vector3(...f.at));
    g.applyMatrix4(m);
    return g;
  }
  if (f.shape === 'revolve') {
    const regs = regions(f.params.entities, f.params.excluded || []).regions;
    if (!regs.length) return null;
    const a2 = f.params.axis.a, b2 = f.params.axis.b;
    const dv = [b2[0] - a2[0], b2[1] - a2[1]];
    const dl = Math.hypot(...dv) || 1;
    const ad = [dv[0] / dl, dv[1] / dl];
    const rd = [-ad[1], ad[0]];
    const n = new THREE.Vector3(...f.dir).normalize();
    const U = new THREE.Vector3(...f.params.u);
    U.addScaledVector(n, -U.dot(n)).normalize();
    const V = new THREE.Vector3().crossVectors(n, U);
    const A3 = new THREE.Vector3(...f.at).addScaledVector(U, a2[0]).addScaledVector(V, a2[1]);
    const axis3 = U.clone().multiplyScalar(ad[0]).addScaledVector(V, ad[1]);
    const rad3 = U.clone().multiplyScalar(rd[0]).addScaledVector(V, rd[1]);
    const SEG2 = 48;
    const positions = [];
    const pt3 = (h, r, th) => A3.clone().addScaledVector(axis3, h)
      .addScaledVector(rad3, r * Math.cos(th)).addScaledVector(n, r * Math.sin(th));
    for (const reg of regs) {
      for (const ring of [reg.outer, ...reg.holes]) {
        const hr = ring.map(p => {
          const q = [p[0] - a2[0], p[1] - a2[1]];
          return [q[0] * ad[0] + q[1] * ad[1], q[0] * rd[0] + q[1] * rd[1]];
        });
        const rs = hr.map(x => x[1]);
        if (Math.min(...rs) < -0.05 && Math.max(...rs) > 0.05) return null; // el contorno cruza el eje
        const flip = Math.max(...rs) <= 0.05; // contorno al otro lado: reflejar
        const HR = hr.map(([h, r]) => [h, Math.max(0, flip ? -r : r)]);
        for (let k = 0; k < HR.length; k++) {
          const [h1, r1] = HR[k], [h2, r2] = HR[(k + 1) % HR.length];
          for (let j = 0; j < SEG2; j++) {
            const t1 = j * Math.PI * 2 / SEG2, t2 = (j + 1) * Math.PI * 2 / SEG2;
            const pA = pt3(h1, r1, t1), pB = pt3(h2, r2, t1);
            const pC = pt3(h2, r2, t2), pD = pt3(h1, r1, t2);
            positions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z, pC.x, pC.y, pC.z);
            positions.push(pA.x, pA.y, pA.z, pC.x, pC.y, pC.z, pD.x, pD.y, pD.z);
          }
        }
      }
    }
    // orientación consistente hacia afuera: si el volumen firmado es negativo, invertir
    let vol = 0;
    for (let i = 0; i < positions.length; i += 9) {
      const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
      const bx = positions[i + 3], by = positions[i + 4], bz = positions[i + 5];
      const cx = positions[i + 6], cy = positions[i + 7], cz = positions[i + 8];
      vol += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
    }
    if (vol < 0) {
      for (let i = 0; i < positions.length; i += 9) {
        for (let k = 0; k < 3; k++) {
          const t = positions[i + 3 + k];
          positions[i + 3 + k] = positions[i + 6 + k];
          positions[i + 6 + k] = t;
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }
  throw new Error(`shape desconocido: ${f.shape}`);
}

// Base ortonormal U,V para un plano de normal n (elige el eje menos alineado)
export function planeBasis(n) {
  const normal = new THREE.Vector3(...n).normalize();
  const ax = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
    .reduce((a, b) => Math.abs(a.dot(normal)) < Math.abs(b.dot(normal)) ? a : b);
  const u = new THREE.Vector3().crossVectors(ax, normal).normalize();
  const v = new THREE.Vector3().crossVectors(normal, u);
  return { u, v, n: normal };
}

// Aristas analíticas de referencia de una pieza (coordenadas locales), para
// proyectar en bocetos: aristas reales de las funciones, sin el ruido de
// triangulación de la malla CSG. Devuelve pares [Vector3, Vector3].
export function referenceEdges(part, circleSegs = 36, skipId) {
  const segs = [];
  const pushSeg = (a, b) => segs.push([a, b]);
  const pushCircle = (center, dirV, r) => {
    const n = new THREE.Vector3(...dirV).normalize();
    const { u, v } = planeBasis(n.toArray());
    let prev = null;
    for (let i = 0; i <= circleSegs; i++) {
      const a = i * Math.PI * 2 / circleSegs;
      const p = new THREE.Vector3(center[0], center[1], center[2])
        .addScaledVector(u, r * Math.cos(a)).addScaledVector(v, r * Math.sin(a));
      if (prev) pushSeg(prev, p);
      prev = p;
    }
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  for (const f of part.features) {
    if (f.suppressed || f.id === skipId) continue;
    if (f.shape === 'box') {
      const [cx, cy, cz] = f.at, { w, d, h } = f.params;
      const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2, z0 = cz, z1 = cz + h;
      for (const z of [z0, z1]) {
        pushSeg(V(x0, y0, z), V(x1, y0, z)); pushSeg(V(x1, y0, z), V(x1, y1, z));
        pushSeg(V(x1, y1, z), V(x0, y1, z)); pushSeg(V(x0, y1, z), V(x0, y0, z));
      }
      for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) pushSeg(V(x, y, z0), V(x, y, z1));
    } else if (f.shape === 'cylinder') {
      const dn = new THREE.Vector3(...f.dir).normalize();
      const top = new THREE.Vector3(...f.at).addScaledVector(dn, f.params.h);
      pushCircle(f.at, f.dir, f.params.dia / 2);
      pushCircle(top.toArray(), f.dir, f.params.dia / 2);
    } else if (f.shape === 'hole') {
      pushCircle(f.at, f.dir, f.params.dia / 2);
      if (!f.params.through) {
        const dn = new THREE.Vector3(...f.dir).normalize();
        pushCircle(new THREE.Vector3(...f.at).addScaledVector(dn, f.params.depth).toArray(), f.dir, f.params.dia / 2);
      }
    } else if (f.shape === 'sketch') {
      const n = new THREE.Vector3(...f.dir).normalize();
      const U = new THREE.Vector3(...f.params.u);
      U.addScaledVector(n, -U.dot(n)).normalize();
      const Vv = new THREE.Vector3().crossVectors(n, U);
      const toV3 = (pu, pv, off) => new THREE.Vector3(...f.at)
        .addScaledVector(U, pu).addScaledVector(Vv, pv).addScaledVector(n, off);
      const lift = (f.op === 'cut' ? -1 : 1) * f.params.h;
      if (f.params.entities) {
        // todas las entidades del boceto en su plano (referencia completa)
        for (const e of f.params.entities) {
          const pts = entityPoints(e, circleSegs);
          for (let i = 1; i < pts.length; i++) pushSeg(toV3(...pts[i - 1], 0), toV3(...pts[i], 0));
        }
        // contornos extruidos en la cara resultante
        for (const reg of regions(f.params.entities, f.params.excluded || []).regions) {
          for (const ring of [reg.outer, ...reg.holes]) {
            let prev = null;
            for (let i = 0; i <= ring.length; i++) {
              const p = toV3(...ring[i % ring.length], lift);
              if (prev) pushSeg(prev, p);
              prev = p;
            }
          }
        }
      } else if (f.params.pts) {
        for (const off of [0, lift]) {
          let prev = null;
          for (let i = 0; i <= f.params.pts.length; i++) {
            const p = toV3(...f.params.pts[i % f.params.pts.length], off);
            if (prev) pushSeg(prev, p);
            prev = p;
          }
        }
      }
    }
  }
  return segs;
}

// Primitivas analíticas tipadas (líneas y círculos exactos) de una pieza,
// en coordenadas locales, para PROYECTAR geometría al boceto como entidades.
export function referencePrimitives(part) {
  const lines = [], circles = [];
  const V = (a) => new THREE.Vector3(...a);
  const pushBoxEdges = (at, w, d, h) => {
    const [cx, cy, cz] = at;
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2, z0 = cz, z1 = cz + h;
    for (const z of [z0, z1]) {
      lines.push({ a: new THREE.Vector3(x0, y0, z), b: new THREE.Vector3(x1, y0, z) });
      lines.push({ a: new THREE.Vector3(x1, y0, z), b: new THREE.Vector3(x1, y1, z) });
      lines.push({ a: new THREE.Vector3(x1, y1, z), b: new THREE.Vector3(x0, y1, z) });
      lines.push({ a: new THREE.Vector3(x0, y1, z), b: new THREE.Vector3(x0, y0, z) });
    }
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
      lines.push({ a: new THREE.Vector3(x, y, z0), b: new THREE.Vector3(x, y, z1) });
    }
  };
  for (const f of part.features) {
    if (f.suppressed) continue;
    if (f.shape === 'box') pushBoxEdges(f.at, f.params.w, f.params.d, f.params.h);
    else if (f.shape === 'cylinder') {
      const dn = V(f.dir).normalize();
      circles.push({ c: V(f.at), dir: dn, r: f.params.dia / 2 });
      circles.push({ c: V(f.at).addScaledVector(dn, f.params.h), dir: dn, r: f.params.dia / 2 });
    } else if (f.shape === 'hole') {
      const dn = V(f.dir).normalize();
      circles.push({ c: V(f.at), dir: dn, r: f.params.dia / 2 });
      if (!f.params.through) circles.push({ c: V(f.at).addScaledVector(dn, f.params.depth), dir: dn, r: f.params.dia / 2 });
    } else if (f.shape === 'sketch' && f.params.entities) {
      const n = V(f.dir).normalize();
      const U = V(f.params.u);
      U.addScaledVector(n, -U.dot(n)).normalize();
      const Vv = new THREE.Vector3().crossVectors(n, U);
      const toV3 = (pu, pv, off) => V(f.at).addScaledVector(U, pu).addScaledVector(Vv, pv).addScaledVector(n, off);
      const lift = (f.op === 'cut' ? -1 : 1) * f.params.h;
      for (const off of [0, lift]) {
        for (const e of f.params.entities) {
          if (e.type === 'line') lines.push({ a: toV3(e.a[0], e.a[1], off), b: toV3(e.b[0], e.b[1], off) });
          else if (e.type === 'circle') circles.push({ c: toV3(e.c[0], e.c[1], off), dir: n.clone(), r: e.r });
        }
      }
    }
  }
  return { lines, circles };
}

// Puntos notables 3D de referencia (centros de círculos de agujeros,
// cilindros y bocetos) para imantar el snap en los bocetos.
export function referencePoints(part, skipId) {
  const pts = [];
  const V = (a) => new THREE.Vector3(...a);
  for (const f of part.features) {
    if (f.suppressed || f.id === skipId) continue;
    if (f.shape === 'cylinder') {
      const dn = V(f.dir).normalize();
      pts.push(V(f.at), V(f.at).addScaledVector(dn, f.params.h));
    } else if (f.shape === 'hole') {
      pts.push(V(f.at));
      if (!f.params.through) pts.push(V(f.at).addScaledVector(V(f.dir).normalize(), f.params.depth));
    } else if (f.shape === 'sketch' && f.params.entities) {
      const n = V(f.dir).normalize();
      const U = V(f.params.u);
      U.addScaledVector(n, -U.dot(n)).normalize();
      const Vv = new THREE.Vector3().crossVectors(n, U);
      for (const e of f.params.entities) {
        if (e.type === 'circle' || e.type === 'arc') {
          pts.push(V(f.at).addScaledVector(U, e.c[0]).addScaledVector(Vv, e.c[1]));
        }
      }
    }
  }
  return pts;
}

// Regenera la geometría local de una pieza aplicando sus features en orden.
export function buildPartGeometry(part) {
  let csg = null;
  const bbox = new THREE.Box3();
  for (const f of part.features) {
    if (f.suppressed) continue; // función suprimida (⏸)
    if (f.shape === 'chapaBase' || f.shape === 'pestana') {
      // chapa: unión del sólido plegado + cortes de desahogo propios
      const res = chapaFeatureGeometry(part, f);
      if (!res) continue;
      res.add.computeBoundingBox();
      bbox.union(res.add.boundingBox);
      let c = geomToCSG(res.add);
      csg = csg === null ? c : csg.union(c);
      for (const cut of res.cuts) csg = csg.subtract(geomToCSG(cut));
      continue;
    }
    if (f.shape === 'pattern') {
      // replica la geometría de la función origen en cada ocurrencia
      if (csg === null) continue; // sin material base que replicar/cortar
      const src = part.features.find(x => x.id === f.params.sourceId);
      if (!src || src.suppressed) continue;
      const extent = bbox.isEmpty() ? 100 : bbox.getSize(new THREE.Vector3()).length();
      const base = featureGeometry(src, extent, false);
      if (!base) continue;
      for (const M of patternMatrices(f)) {
        const g = base.clone().applyMatrix4(M);
        if (src.op === 'union') { g.computeBoundingBox(); bbox.union(g.boundingBox); }
        const c = geomToCSG(g);
        csg = src.op === 'cut' ? csg.subtract(c) : csg.union(c);
      }
      continue;
    }
    if (f.op === 'union' || csg !== null) {
      const extent = bbox.isEmpty() ? 100 : bbox.getSize(new THREE.Vector3()).length();
      const g = featureGeometry(f, extent, csg === null);
      if (!g) continue; // función sin geometría (p. ej. boceto sin contorno cerrado)
      if (f.op === 'union') {
        g.computeBoundingBox();
        bbox.union(g.boundingBox);
      }
      const c = geomToCSG(g);
      if (csg === null) csg = c;
      else csg = f.op === 'cut' ? csg.subtract(c) : csg.union(c);
    }
    // un 'cut' como primer feature no tiene material que cortar: se ignora
  }
  if (!csg) return csgToGeom(CSG.fromPolygons([])); // vacía pero con atributos válidos
  return csgToGeom(csg);
}

// ---------- Detección de cara plana (flood fill de triángulos coplanares) ----------

const keyOf = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;

export function planarFaceFromHit(geometry, faceIndex) {
  const pos = geometry.attributes.position;
  const triCount = pos.count / 3;
  const triNormal = (t) => {
    const a = new THREE.Vector3().fromBufferAttribute(pos, t * 3);
    const b = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + 2);
    return new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  };
  // mapa vértice → triángulos que lo comparten
  const vmap = new Map();
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const key = keyOf(pos.getX(i), pos.getY(i), pos.getZ(i));
      let arr = vmap.get(key);
      if (!arr) vmap.set(key, arr = []);
      arr.push(t);
    }
  }
  const n0 = triNormal(faceIndex);
  const p0 = new THREE.Vector3().fromBufferAttribute(pos, faceIndex * 3);
  const w0 = n0.dot(p0);
  const inPlane = (t) => {
    if (triNormal(t).dot(n0) < 0.999) return false;
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (Math.abs(n0.dot(p) - w0) > 1e-3) return false;
    }
    return true;
  };
  const seen = new Set([faceIndex]);
  const queue = [faceIndex];
  const tris = [];
  while (queue.length) {
    const t = queue.pop();
    tris.push(t);
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const key = keyOf(pos.getX(i), pos.getY(i), pos.getZ(i));
      for (const nt of vmap.get(key)) {
        if (!seen.has(nt) && inPlane(nt)) { seen.add(nt); queue.push(nt); }
      }
    }
  }
  // centroide ponderado por área
  const centroid = new THREE.Vector3();
  let areaSum = 0;
  for (const t of tris) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, t * 3);
    const b = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + 2);
    const area = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() / 2;
    centroid.addScaledVector(new THREE.Vector3().add(a).add(b).add(c).divideScalar(3), area);
    areaSum += area;
  }
  if (areaSum > 0) centroid.divideScalar(areaSum);
  return { tris, normal: n0, centroid, area: areaSum };
}

// Geometría de resaltado para una cara detectada (coordenadas locales de la pieza)
export function faceHighlightGeometry(geometry, tris) {
  const pos = geometry.attributes.position;
  const positions = [];
  for (const t of tris) {
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

// ---------- Búsqueda de eje (agujero/cilindro) cercano a un punto local ----------

export function findAxialFeature(part, localPoint) {
  let best = null;
  for (const f of part.features) {
    if (f.suppressed) continue;
    if (f.shape !== 'cylinder' && f.shape !== 'hole') continue;
    const at = new THREE.Vector3(...f.at);
    const dir = new THREE.Vector3(...f.dir).normalize();
    const rel = new THREE.Vector3().subVectors(localPoint, at);
    const t = rel.dot(dir);
    const radial = rel.clone().addScaledVector(dir, -t).length();
    const r = f.params.dia / 2;
    const len = f.shape === 'hole' ? (f.params.through ? 1e4 : f.params.depth) : f.params.h;
    if (t < -2 || t > len + 2) continue;           // fuera del tramo axial
    const score = Math.abs(radial - r);
    if (score > Math.max(2, r * 0.6)) continue;    // demasiado lejos de la pared
    if (!best || score < best.score) best = { feature: f, score, at: f.at, dir: f.dir };
  }
  return best;
}

// ---------- Edición directa: identificar la cara tocada ----------
// Dado un punto local y la normal local de la cara, encuentra qué función
// la genera y qué parámetro controla (recorre de la última a la primera).
export function identifyFace(part, lp, ln) {
  const feats = [...part.features].reverse();
  for (const f of feats) {
    if (f.suppressed) continue;
    if (f.shape === 'hole' || f.shape === 'cylinder') {
      const at = new THREE.Vector3(...f.at);
      const dir = new THREE.Vector3(...f.dir).normalize();
      const rel = lp.clone().sub(at);
      const t = rel.dot(dir);
      const radial = rel.clone().addScaledVector(dir, -t).length();
      const len = f.shape === 'hole' ? (f.params.through ? 1e4 : f.params.depth) : f.params.h;
      const r = f.params.dia / 2;
      if (t > -0.5 && t < len + 0.5 && Math.abs(radial - r) < 0.3 && Math.abs(ln.dot(dir)) < 0.3) {
        return { feature: f, kind: f.shape === 'hole' ? 'hole-wall' : 'cyl-wall' };
      }
      if (f.shape === 'cylinder' && Math.abs(ln.dot(dir)) > 0.95 && radial < r + 0.3 && Math.abs(t - f.params.h) < 0.1) {
        return { feature: f, kind: 'cyl-cap' };
      }
    } else if (f.shape === 'box') {
      const { w, d, h } = f.params;
      const center = [f.at[0], f.at[1], f.at[2] + h / 2];
      const half = [w / 2, d / 2, h / 2];
      const L = [lp.x, lp.y, lp.z], N = [ln.x, ln.y, ln.z];
      for (let a = 0; a < 3; a++) {
        if (Math.abs(N[a]) < 0.95) continue;
        const sign = Math.sign(N[a]);
        if (Math.abs(L[a] - (center[a] + sign * half[a])) > 0.1) continue;
        const others = [0, 1, 2].filter(x => x !== a);
        if (others.every(o => Math.abs(L[o] - center[o]) <= half[o] + 0.1)) {
          return { feature: f, kind: 'box-face', axis: a, sign };
        }
      }
    } else if (f.shape === 'sketch' && f.params.h) {
      const n = new THREE.Vector3(...f.dir).normalize();
      if (Math.abs(ln.dot(n)) > 0.95) {
        const dist = lp.clone().sub(new THREE.Vector3(...f.at)).dot(n);
        const capAt = (f.op === 'cut' ? -1 : 1) * f.params.h;
        if (Math.abs(dist - capAt) < 0.1) return { feature: f, kind: 'sketch-cap' };
      }
    }
  }
  return null;
}

// ---------- Imán de ensamble ----------
// Correcciones por eje para ajustar la pieza en movimiento a las demás:
// caras en contacto, al ras, centros de caja y centros de ejes (orificios).
// my/others: { min:{x,y,z}, max:{x,y,z}, axes:[{x,y,z},...] }
export function magnetCorrections(my, others, axes = ['x', 'y'], threshold = 4) {
  const out = {};
  for (const a of axes) {
    let best = null;
    const myC = (my.min[a] + my.max[a]) / 2;
    for (const o of others) {
      const oC = (o.min[a] + o.max[a]) / 2;
      const cands = [
        [o.max[a] - my.min[a], 'contacto'],
        [o.min[a] - my.max[a], 'contacto'],
        [o.min[a] - my.min[a], 'ras'],
        [o.max[a] - my.max[a], 'ras'],
        [oC - myC, 'centro'],
      ];
      for (const p of my.axes) for (const q of o.axes) cands.push([q[a] - p[a], 'eje']);
      for (const [d, kind] of cands) {
        if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, kind };
      }
    }
    if (best) out[a] = best;
  }
  return out;
}

// ---------- Restricciones de ensamble ----------
// mate/flush: { id, type, a:{part, point:[..], normal:[..]}, b:{...}, offset }
//   (point/normal en coordenadas locales de cada pieza)
// concentric: { id, type:'concentric', a:{part, point, dir}, b:{part, point, dir} }

export function makeMate(type, a, b, offset = 0) {
  return { id: uid('c'), type, a, b, offset };
}
export function makeConcentric(a, b) {
  return { id: uid('c'), type: 'concentric', a, b };
}

function worldAnchor(part, anchor) {
  const m = partMatrix(part);
  const q = new THREE.Quaternion(...part.quat);
  return {
    point: new THREE.Vector3(...anchor.point).applyMatrix4(m),
    vec: new THREE.Vector3(...(anchor.normal || anchor.dir)).applyQuaternion(q).normalize(),
  };
}

function applyDeltaRotation(part, qDelta, pivot) {
  const q = new THREE.Quaternion(...part.quat).premultiply(qDelta).normalize();
  part.quat = [q.x, q.y, q.z, q.w];
  const p = new THREE.Vector3(...part.pos).sub(pivot).applyQuaternion(qDelta).add(pivot);
  part.pos = p.toArray();
}

function solveOne(doc, c) {
  let A = getPart(doc, c.a.part), B = getPart(doc, c.b.part);
  let ra = c.a, rb = c.b;
  if (!A || !B) return;
  if (B.fixed && !A.fixed) { [A, B] = [B, A]; [ra, rb] = [rb, ra]; }
  if (B.fixed) return; // ambas fijas: no se puede resolver

  const wa = worldAnchor(A, ra);
  const wb = worldAnchor(B, rb);

  if (c.type === 'mate' || c.type === 'flush') {
    const target = c.type === 'mate' ? wa.vec.clone().negate() : wa.vec.clone();
    const qDelta = new THREE.Quaternion().setFromUnitVectors(wb.vec, target);
    applyDeltaRotation(B, qDelta, wb.point.clone());
    const wb2 = worldAnchor(B, rb);
    const d = new THREE.Vector3().subVectors(wb2.point, wa.point).dot(wa.vec);
    const move = wa.vec.clone().multiplyScalar((c.offset || 0) - d);
    B.pos = new THREE.Vector3(...B.pos).add(move).toArray();
  } else if (c.type === 'concentric') {
    let target = wa.vec.clone();
    if (wb.vec.dot(target) < 0) target.negate(); // elegir el sentido más cercano
    const qDelta = new THREE.Quaternion().setFromUnitVectors(wb.vec, target);
    applyDeltaRotation(B, qDelta, wb.point.clone());
    const wb2 = worldAnchor(B, rb);
    const delta = new THREE.Vector3().subVectors(wa.point, wb2.point);
    delta.addScaledVector(target, -delta.dot(target)); // solo componente radial
    B.pos = new THREE.Vector3(...B.pos).add(delta).toArray();
  }
}

export function solveConstraints(doc, passes = 3) {
  for (let i = 0; i < passes; i++) {
    for (const c of doc.constraints) solveOne(doc, c);
  }
}
