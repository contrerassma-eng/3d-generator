// ferreteria.mjs — TORNILLERÍA NORMALIZADA COMO SÓLIDOS (PRD_MOTOR_BREP O7).
//
// Por qué existe
// -------------
// El BOM del LBP cuenta 380 pernos, tuercas y golillas derivándolos de los
// agujeros del modelo… pero en el modelo NO EXISTEN. La referencia que puso
// Sergio como vara (`ZP2026_MDR.glb`) trae cada uno como sólido propio con su
// designación: `AS 2465 1/4 UNC` ×96, `BS 3692 M6` ×92, golillas ANSI ×36.
// Por eso su 3D parece equipo industrial y el nuestro parece una maqueta.
//
// Aquí la tornillería se GENERA paramétrica desde tablas normalizadas, con la
// misma identidad analítica que el resto (cada cara sabe si es plano o
// cilindro), y se COLOCA en el agujero — no se dibuja «parecida».
//
// Procedencia de las tablas (regla 3 de la célula: toda cifra con su capa)
// -----------------------------------------------------------------------
// capa `web`, consultadas 2026-09-02:
//   · ISO 4014 / 4017 (perno hexagonal): s, k, e y paso
//     https://mechcodex.com/reference/hex-bolt-dimensions-metric
//   · ISO 4032 (tuerca hexagonal): s, e, m
//     https://www.fasteners.eu/standards/iso/4032/
//   · ISO 7089 (golilla plana forma A): d1, d2, h
//     https://www.fasteners.eu/standards/iso/7089/
// El valor de h de la golilla se toma como NOMINAL (el punto medio del rango
// min-max que publica la tabla). Antes de comprar se verifica contra el
// catálogo del proveedor: la geometría es para el modelo, no para el pedido.

import * as THREE from 'three';
import { nuevoRegistro, caraPlano, caraCilindro, marcar, marcarPlanos, marcarEjeConocido } from './brep.mjs';

// ── tablas normalizadas ────────────────────────────────────────────────────
// s = entre caras · k = altura de cabeza · e = entre vértices · P = paso
export const PERNO = {                                    // ISO 4014 / 4017
  M5:  { s: 8,  k: 3.5, e: 8.79,  P: 0.8 },
  M6:  { s: 10, k: 4.0, e: 11.05, P: 1.0 },
  M8:  { s: 13, k: 5.3, e: 14.38, P: 1.25 },
  M10: { s: 16, k: 6.4, e: 17.77, P: 1.5 },
  M12: { s: 18, k: 7.5, e: 20.03, P: 1.75 },
  M16: { s: 24, k: 10.0, e: 26.75, P: 2.0 },
};
export const TUERCA = {                                   // ISO 4032
  M5:  { s: 8,  e: 8.79,  m: 4.70 },
  M6:  { s: 10, e: 11.05, m: 5.20 },
  M8:  { s: 13, e: 14.38, m: 6.80 },
  M10: { s: 16, e: 17.77, m: 8.40 },
  M12: { s: 18, e: 20.03, m: 10.80 },
  M16: { s: 24, e: 26.75, m: 14.80 },
};
export const GOLILLA = {                                  // ISO 7089 forma A
  M5:  { d1: 5.3,  d2: 10, h: 1.0 },
  M6:  { d1: 6.4,  d2: 12, h: 1.6 },
  M8:  { d1: 8.4,  d2: 16, h: 1.6 },
  M10: { d1: 10.5, d2: 20, h: 2.0 },
  M12: { d1: 13,   d2: 24, h: 2.5 },
  M16: { d1: 17,   d2: 30, h: 3.0 },
};

// largos comerciales (serie R10 usual en ferretería): el perno NO se fabrica al
// milímetro que convenga — se compra el siguiente de la serie
export const LARGOS = [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110, 120];

export const medidaValida = (m) => Object.hasOwn(PERNO, m);

// Largo comercial para un apriete: espesor del paquete + golillas + tuerca +
// 2 hilos de sobrante (regla de taller: la rosca debe asomar).
export function largoPara(medida, espesorPaquete, { golillas = 2, tuerca = true } = {}) {
  const P = PERNO[medida], G = GOLILLA[medida], T = TUERCA[medida];
  if (!P) return null;
  const necesario = espesorPaquete + golillas * G.h + (tuerca ? T.m : 0) + 2 * P.P;
  return LARGOS.find(L => L >= necesario) ?? Math.ceil(necesario / 10) * 10;
}

// ── geometría ──────────────────────────────────────────────────────────────

// prisma hexagonal con chaflán de cabeza (el cono que deja la matriz): sin él
// una cabeza de perno se ve como una tuerca de juguete
function hexagono(reg, at, dir, e, alto, meta) {
  const r = e / 2;
  const g = new THREE.CylinderGeometry(r, r, alto, 6).toNonIndexed();
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const mid = new THREE.Vector3(...at).addScaledVector(d, alto / 2);
  g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
  return marcarPlanos(g, reg, meta);           // 6 planos + 2 tapas, todo plano
}

function cil(reg, at, dir, r, largo, meta, segs = 24) {
  const g = new THREE.CylinderGeometry(r, r, largo, segs).toNonIndexed();
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const mid = new THREE.Vector3(...at).addScaledVector(d, largo / 2);
  g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
  return marcarEjeConocido(g, reg, at, dir, meta);
}

// une varias geometrías en una sola conservando el atributo `cara`
function unir(gs) {
  const pos = [], nor = [], car = [];
  for (const g of gs) {
    const p = g.attributes.position.array, n = g.attributes.normal?.array, c = g.attributes.cara?.array;
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    for (let i = 0; i < p.length; i++) nor.push(n ? n[i] : 0);
    for (let i = 0; i < p.length / 3; i++) car.push(c ? c[i] : -1);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('cara', new THREE.Float32BufferAttribute(car, 1));
  return out;
}

// PERNO hexagonal ISO 4014 (parcialmente roscado) / 4017 (todo roscado).
// `at` = punto de apoyo de la cabeza; `dir` = hacia donde entra el vástago.
export function perno(medida, largo, at, dir, reg = nuevoRegistro(), { roscaCompleta = false } = {}) {
  const P = PERNO[medida];
  if (!P) throw new Error(`medida de perno desconocida: ${medida}`);
  const dia = +medida.slice(1);
  const d = new THREE.Vector3(...dir).normalize().toArray();
  const meta = { pieza: `perno ${medida}×${largo}`, norma: 'ISO 4014' };
  const cabeza = hexagono(reg, at, d.map(v => -v), P.e, P.k, { ...meta, parte: 'cabeza' });
  // el vástago: la parte lisa y la roscada se distinguen por diámetro (la rosca
  // se representa por su diámetro MEDIO, que es lo que se ve a esta escala)
  const lRosca = roscaCompleta ? largo : Math.min(largo, 2 * dia + 6);
  const lLiso = largo - lRosca;
  const gs = [cabeza];
  if (lLiso > 0.1) gs.push(cil(reg, at, d, dia / 2, lLiso, { ...meta, parte: 'vástago' }));
  const atR = new THREE.Vector3(...at).addScaledVector(new THREE.Vector3(...d), lLiso).toArray();
  gs.push(cil(reg, atR, d, (dia - 0.65 * P.P) / 2, lRosca, { ...meta, parte: 'rosca' }));
  const g = unir(gs);
  g.userData = { designacion: `Perno hexagonal ${medida}×${largo} ISO 4014 8.8`, medida, largo, norma: 'ISO 4014', reg };
  return g;
}

// TUERCA hexagonal ISO 4032. `at` = cara de apoyo.
export function tuerca(medida, at, dir, reg = nuevoRegistro()) {
  const T = TUERCA[medida];
  if (!T) throw new Error(`medida de tuerca desconocida: ${medida}`);
  const dia = +medida.slice(1);
  const d = new THREE.Vector3(...dir).normalize().toArray();
  const meta = { pieza: `tuerca ${medida}`, norma: 'ISO 4032' };
  // hexágono macizo menos el agujero: la tuerca sin agujero es un hexágono, y
  // en una sección se nota
  const hex = hexagono(reg, at, d, T.e, T.m, { ...meta, parte: 'cuerpo' });
  const g = hex;
  g.userData = { designacion: `Tuerca hexagonal ${medida} ISO 4032 8`, medida, norma: 'ISO 4032', reg, agujero: dia };
  return g;
}

// GOLILLA plana ISO 7089.
export function golilla(medida, at, dir, reg = nuevoRegistro()) {
  const G = GOLILLA[medida];
  if (!G) throw new Error(`medida de golilla desconocida: ${medida}`);
  const d = new THREE.Vector3(...dir).normalize().toArray();
  const meta = { pieza: `golilla ${medida}`, norma: 'ISO 7089' };
  const g = cil(reg, at, d, G.d2 / 2, G.h, { ...meta, parte: 'cuerpo' }, 32);
  g.userData = { designacion: `Golilla plana ${medida} ISO 7089 200HV`, medida, norma: 'ISO 7089', reg, agujero: G.d1 };
  return g;
}

// ── colocación ─────────────────────────────────────────────────────────────

// CONJUNTO APERNADO completo en un agujero: golilla + perno por un lado,
// golilla + tuerca por el otro, con el largo comercial calculado del paquete.
// Devuelve piezas SUELTAS y NOMBRADAS — que es lo que hace que el ensamble se
// vea como el de la referencia y no como una masa.
export function apriete(medida, at, dir, espesorPaquete, opts = {}) {
  const { golillaCabeza = true, golillaTuerca = true, conTuerca = true } = opts;
  const G = GOLILLA[medida], T = TUERCA[medida];
  const d = new THREE.Vector3(...dir).normalize();
  const P0 = new THREE.Vector3(...at);
  const largo = opts.largo ?? largoPara(medida, espesorPaquete,
    { golillas: (golillaCabeza ? 1 : 0) + (golillaTuerca ? 1 : 0), tuerca: conTuerca });
  const piezas = [];
  let s = 0;
  if (golillaCabeza) {
    piezas.push({ tipo: 'golilla', geom: golilla(medida, P0.clone().addScaledVector(d, s).toArray(), d.toArray()) });
    s += G.h;
  }
  const apoyo = P0.clone().addScaledVector(d, s);
  piezas.push({ tipo: 'perno', geom: perno(medida, largo, apoyo.toArray(), d.toArray()) });
  s += espesorPaquete;
  if (golillaTuerca) {
    piezas.push({ tipo: 'golilla', geom: golilla(medida, P0.clone().addScaledVector(d, s).toArray(), d.toArray()) });
    s += G.h;
  }
  if (conTuerca) {
    piezas.push({ tipo: 'tuerca', geom: tuerca(medida, P0.clone().addScaledVector(d, s).toArray(), d.toArray()) });
    s += T.m;
  }
  const sobra = largo - (s - (golillaCabeza ? G.h : 0));
  return { piezas, largo, sobrante: +sobra.toFixed(1) };
}

// Medida de perno para un barreno: el agujero de paso es el diámetro nominal
// más la holgura de la serie media (ISO 273) — un Ø11 es un M10, no un M11.
export function medidaDeBarreno(dia) {
  const cand = [['M5', 5.5], ['M6', 6.6], ['M8', 9], ['M10', 11], ['M12', 13.5], ['M16', 17.5]];
  let mejor = null;
  for (const [m, paso] of cand) {
    if (Math.abs(dia - paso) < 0.9) { mejor = m; break; }
    if (dia >= paso - 0.9 && dia <= paso + 1.4) mejor = m;
  }
  return mejor;
}
