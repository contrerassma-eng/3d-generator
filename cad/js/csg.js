// csg.js — booleanas de sólidos por BSP (unión, corte, intersección).
// Adaptación ES-module del algoritmo clásico de csg.js (Evan Wallace, MIT),
// con conversión desde/hacia THREE.BufferGeometry.

import * as THREE from 'three';

const EPSILON = 1e-5;

class V3 {
  constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
  clone() { return new V3(this.x, this.y, this.z); }
  negated() { return new V3(-this.x, -this.y, -this.z); }
  plus(a) { return new V3(this.x + a.x, this.y + a.y, this.z + a.z); }
  minus(a) { return new V3(this.x - a.x, this.y - a.y, this.z - a.z); }
  times(k) { return new V3(this.x * k, this.y * k, this.z * k); }
  dividedBy(k) { return new V3(this.x / k, this.y / k, this.z / k); }
  dot(a) { return this.x * a.x + this.y * a.y + this.z * a.z; }
  lerp(a, t) { return this.plus(a.minus(this).times(t)); }
  length() { return Math.sqrt(this.dot(this)); }
  unit() { return this.dividedBy(this.length()); }
  cross(a) {
    return new V3(
      this.y * a.z - this.z * a.y,
      this.z * a.x - this.x * a.z,
      this.x * a.y - this.y * a.x
    );
  }
}

class Vertex {
  constructor(pos, normal) { this.pos = pos; this.normal = normal; }
  clone() { return new Vertex(this.pos.clone(), this.normal.clone()); }
  flip() { this.normal = this.normal.negated(); }
  interpolate(other, t) {
    return new Vertex(this.pos.lerp(other.pos, t), this.normal.lerp(other.normal, t));
  }
}

const COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;

class Plane {
  constructor(normal, w) { this.normal = normal; this.w = w; }
  static fromPoints(a, b, c) {
    const n = b.minus(a).cross(c.minus(a));
    const len = n.length();
    if (len < 1e-12) return null; // triángulo degenerado
    const u = n.dividedBy(len);
    return new Plane(u, u.dot(a));
  }
  clone() { return new Plane(this.normal.clone(), this.w); }
  flip() { this.normal = this.normal.negated(); this.w = -this.w; }

  splitPolygon(polygon, coplanarFront, coplanarBack, front, back) {
    let polygonType = 0;
    const types = [];
    for (const v of polygon.vertices) {
      const t = this.normal.dot(v.pos) - this.w;
      const type = t < -EPSILON ? BACK : t > EPSILON ? FRONT : COPLANAR;
      polygonType |= type;
      types.push(type);
    }
    switch (polygonType) {
      case COPLANAR:
        (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
        break;
      case FRONT: front.push(polygon); break;
      case BACK: back.push(polygon); break;
      case SPANNING: {
        const f = [], b = [];
        const n = polygon.vertices.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const ti = types[i], tj = types[j];
          const vi = polygon.vertices[i], vj = polygon.vertices[j];
          if (ti !== BACK) f.push(vi);
          if (ti !== FRONT) b.push(ti !== BACK ? vi.clone() : vi);
          if ((ti | tj) === SPANNING) {
            const t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.minus(vi.pos));
            const v = vi.interpolate(vj, t);
            f.push(v);
            b.push(v.clone());
          }
        }
        if (f.length >= 3) { const p = Polygon.tryCreate(f, polygon.shared); if (p) front.push(p); }
        if (b.length >= 3) { const p = Polygon.tryCreate(b, polygon.shared); if (p) back.push(p); }
        break;
      }
    }
  }
}

class Polygon {
  constructor(vertices, shared, plane) {
    this.vertices = vertices;
    this.shared = shared;
    this.plane = plane;
  }
  static tryCreate(vertices, shared) {
    const plane = Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
    if (!plane) return null;
    return new Polygon(vertices, shared, plane);
  }
  clone() {
    return new Polygon(this.vertices.map(v => v.clone()), this.shared, this.plane.clone());
  }
  flip() {
    this.vertices.reverse().forEach(v => v.flip());
    this.plane.flip();
  }
}

class Node {
  constructor(polygons) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygons = [];
    if (polygons) this.build(polygons);
  }
  clone() {
    const node = new Node();
    node.plane = this.plane && this.plane.clone();
    node.front = this.front && this.front.clone();
    node.back = this.back && this.back.clone();
    node.polygons = this.polygons.map(p => p.clone());
    return node;
  }
  invert() {
    for (const p of this.polygons) p.flip();
    if (this.plane) this.plane.flip();
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const tmp = this.front; this.front = this.back; this.back = tmp;
  }
  clipPolygons(polygons) {
    if (!this.plane) return polygons.slice();
    let front = [], back = [];
    for (const p of polygons) this.plane.splitPolygon(p, front, back, front, back);
    if (this.front) front = this.front.clipPolygons(front);
    back = this.back ? this.back.clipPolygons(back) : [];
    return front.concat(back);
  }
  clipTo(bsp) {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  }
  allPolygons() {
    let polygons = this.polygons.slice();
    if (this.front) polygons = polygons.concat(this.front.allPolygons());
    if (this.back) polygons = polygons.concat(this.back.allPolygons());
    return polygons;
  }
  build(polygons) {
    if (!polygons.length) return;
    if (!this.plane) this.plane = polygons[0].plane.clone();
    const front = [], back = [];
    for (const p of polygons) this.plane.splitPolygon(p, this.polygons, this.polygons, front, back);
    if (front.length) { if (!this.front) this.front = new Node(); this.front.build(front); }
    if (back.length) { if (!this.back) this.back = new Node(); this.back.build(back); }
  }
}

export class CSG {
  constructor() { this.polygons = []; }
  static fromPolygons(polygons) {
    const csg = new CSG();
    csg.polygons = polygons;
    return csg;
  }
  clone() {
    const csg = new CSG();
    csg.polygons = this.polygons.map(p => p.clone());
    return csg;
  }
  union(csg) {
    const a = new Node(this.clone().polygons);
    const b = new Node(csg.clone().polygons);
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    return CSG.fromPolygons(a.allPolygons());
  }
  subtract(csg) {
    const a = new Node(this.clone().polygons);
    const b = new Node(csg.clone().polygons);
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    a.invert();
    return CSG.fromPolygons(a.allPolygons());
  }
  intersect(csg) {
    const a = new Node(this.clone().polygons);
    const b = new Node(csg.clone().polygons);
    a.invert();
    b.clipTo(a);
    b.invert();
    a.clipTo(b);
    b.clipTo(a);
    a.build(b.allPolygons());
    a.invert();
    return CSG.fromPolygons(a.allPolygons());
  }
}

// ---- Conversión THREE.BufferGeometry <-> CSG ----

export function geomToCSG(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position.array;
  const nor = g.attributes.normal ? g.attributes.normal.array : null;
  const polygons = [];
  for (let i = 0; i < pos.length; i += 9) {
    const verts = [];
    for (let k = 0; k < 3; k++) {
      const o = i + k * 3;
      const p = new V3(pos[o], pos[o + 1], pos[o + 2]);
      const n = nor ? new V3(nor[o], nor[o + 1], nor[o + 2]) : new V3(0, 0, 1);
      verts.push(new Vertex(p, n));
    }
    const poly = Polygon.tryCreate(verts, null);
    if (poly) polygons.push(poly);
  }
  return CSG.fromPolygons(polygons);
}

export function csgToGeom(csg) {
  const positions = [], normals = [];
  for (const poly of csg.polygons) {
    const vs = poly.vertices;
    for (let i = 2; i < vs.length; i++) {
      for (const v of [vs[0], vs[i - 1], vs[i]]) {
        positions.push(v.pos.x, v.pos.y, v.pos.z);
        normals.push(v.normal.x, v.normal.y, v.normal.z);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}
