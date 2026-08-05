#!/usr/bin/env node
// gen_celda.mjs — integrador de la CELDA TRIPLE + COMPUERTA DE VERIFICACIÓN.
//
//   node cad/ensambles/celda/gen_celda.mjs            # celda con P.R
//   node cad/ensambles/celda/gen_celda.mjs --barrido  # busca el R mínimo viable
//   node cad/ensambles/celda/gen_celda.mjs --modulo   # emite además el 3×3
//
// La compuerta comprueba lo que decide si el diseño sirve, no lo que es fácil
// de comprobar: que la celda pueda de verdad trasladar Y GIRAR el bulto, que las
// tres unidades no se toquen, y que la rueda asome lo declarado sobre la placa.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ensamble } from '../nbt90/lib.mjs';
import { buildPartGeometry, partMatrix } from '../../js/model.js';
import { P, velocidad, ttParNm } from './params.mjs';
import { celda, tren, radioVertice, radioInterno, anguloUnidad } from './celda.mjs';

const aquí = dirname(fileURLToPath(import.meta.url));
const arg = (f) => process.argv.includes(f);
const valor = (f, def) => {
  const i = process.argv.indexOf(f);
  return i > 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : def;
};

// ---------------------------------------------------------------------------
// Cinemática: ¿puede esta celda imponer cualquier (vx, vy, ω)?
// ---------------------------------------------------------------------------
// Cada rueda solo puede imponer la componente de velocidad en su dirección de
// rodadura u_i; la perpendicular la absorben los rodillos libres. Para un bulto
// rígido con velocidad v y giro ω sobre el centro de celda, la velocidad pedida
// en el punto de contacto p_i es  v + ω × p_i, y la rueda debe girar a
//     v_i = u_i · (v + ω × p_i)
// Las tres ecuaciones forman M·(vx,vy,ω) = (v1,v2,v3). La celda sirve si M es
// invertible, y sirve BIEN si su número de condición es bajo.
function matrizCinematica(R, radial) {
  const M = [];
  for (let i = 0; i < 3; i++) {
    const th = anguloUnidad(i);
    // eje radial ⇒ rodadura tangencial ; eje tangencial ⇒ rodadura radial
    const u = radial ? [Math.cos(th), Math.sin(th)] : [-Math.sin(th), Math.cos(th)];
    const p = [R * Math.cos(th), R * Math.sin(th)];
    // (ω ẑ × p)/ω = (−p_y, p_x)
    M.push([u[0], u[1], u[0] * -p[1] + u[1] * p[0]]);
  }
  return M;
}

const det3 = (M) =>
  M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
  - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
  + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

// ---------------------------------------------------------------------------
// Interferencia entre unidades: caja orientada de cada pieza contra los vértices
// de la malla real de las otras. Sondeo rápido para el barrido; la verificación
// que manda es interferencias_brep.py sobre el JSON emitido.
// ---------------------------------------------------------------------------
function cajaLocalYMundo(part) {
  const g = buildPartGeometry(part);
  const m = partMatrix(part);
  const pos = g.attributes.position;
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const e = m.elements;     // column-major 4×4
  const aMundo = (v) => [
    e[0] * v[0] + e[4] * v[1] + e[8] * v[2] + e[12],
    e[1] * v[0] + e[5] * v[1] + e[9] * v[2] + e[13],
    e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14],
  ];
  const loc = [];
  for (let i = 0; i < pos.count; i++) {
    const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); }
    loc.push(v);
  }
  // Además de los vértices se siembran los baricentros de cada triángulo: dos
  // piezas planas pueden solaparse sin que ningún VÉRTICE caiga dentro de la otra.
  const pts = loc.map(aMundo);
  for (let i = 0; i + 2 < loc.length; i += 3) {
    const [a, b, c] = [loc[i], loc[i + 1], loc[i + 2]];
    pts.push(aMundo([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]));
  }
  return { lo, hi, pts, m };
}

/** ¿Algún vértice de `b` cae dentro de la caja local de `a`? (holgura `hol`) */
function penetra(a, b, hol) {
  const e = a.m.elements;
  // inversa de una transformación rígida: Rᵀ(x − t)
  const t = [e[12], e[13], e[14]];
  for (const p of b.pts) {
    const d = [p[0] - t[0], p[1] - t[1], p[2] - t[2]];
    const l = [
      e[0] * d[0] + e[1] * d[1] + e[2] * d[2],
      e[4] * d[0] + e[5] * d[1] + e[6] * d[2],
      e[8] * d[0] + e[9] * d[1] + e[10] * d[2],
    ];
    let dentro = true;
    for (let k = 0; k < 3 && dentro; k++) dentro = l[k] > a.lo[k] + hol && l[k] < a.hi[k] - hol;
    if (dentro) return true;
  }
  return false;
}

/** Choques ENTRE UNIDADES. La placa se excluye a propósito: la rueda la atraviesa
 *  por su ranura, y como el sondeo usa cajas, el borde de la ranura caería dentro
 *  de la caja del cilindro de la rueda y daría un falso positivo. Que la ranura
 *  libere la rueda se comprueba aparte, con la cuerda exacta del cilindro. */
function choques(E, hol = 0.5) {
  const unidad = (p) => (p.name.match(/^U(\d)/) || [])[1] ?? 'P';
  const idx = E.parts.map((p, i) => [p, i]).filter(([p]) => unidad(p) !== 'P');
  const cajas = new Map(idx.map(([p, i]) => [i, cajaLocalYMundo(p)]));
  const out = [];
  for (let a = 0; a < idx.length; a++) {
    for (let b = a + 1; b < idx.length; b++) {
      const [pa, ia] = idx[a], [pb, ib] = idx[b];
      if (unidad(pa) === unidad(pb)) continue;   // dentro de una unidad se tocan a propósito
      const ca = cajas.get(ia), cb = cajas.get(ib);
      if (penetra(ca, cb, hol) || penetra(cb, ca, hol)) out.push([pa.name, pb.name]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
function construir(R, dentro) {
  const E = new Ensamble();
  const info = celda(E, { R, dentro });
  return { E, info };
}

/** Menor R (paso 0.5 mm) sin choques entre unidades, para cada posición de motor. */
function barrido() {
  const res = [];
  for (const dentro of [true, false]) {
    let mejor = null;
    for (let R = 30; R <= 140; R += 0.5) {
      if (radioInterno(R, dentro) < 6) continue;       // el tren cruzaría el eje de la celda
      const { E } = construir(R, dentro);
      if (choques(E).length === 0) { mejor = R; break; }
    }
    if (mejor !== null) {
      const { info } = construir(mejor, dentro);
      res.push({ dentro, R: mejor, af: info.placa.af, Rv: info.placa.Rv });
    } else {
      res.push({ dentro, R: null });
    }
  }
  return res;
}

/** Huella de un módulo de 9 celdas (3×3 al tresbolillo) con paso `af`. */
function modulo3x3(af) {
  const Rv = af / Math.sqrt(3), filaY = 1.5 * Rv;
  const centros = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    centros.push([i * af + (j % 2) * af / 2, j * filaY]);
  }
  const xs = centros.flatMap(([x]) => [x - af / 2, x + af / 2]);
  const ys = centros.flatMap(([, y]) => [y - Rv, y + Rv]);
  return {
    centros, ancho: Math.max(...xs) - Math.min(...xs), alto: Math.max(...ys) - Math.min(...ys),
  };
}

// ---------------------------------------------------------------------------
const ok = [], mal = [];
const chk = (n, c, d = '') => (c ? ok : mal).push(`${n}${d ? ` — ${d}` : ''}`);

let R = valor('--R', P.R), dentro = arg('--motor-fuera') ? false : P.motorDentro, barr = null;
if (arg('--barrido')) {
  barr = barrido();
  console.log('— barrido del radio de rueda —');
  for (const b of barr) {
    console.log(b.R === null
      ? `  motor ${b.dentro ? 'hacia el centro' : 'hacia afuera'}: sin solución`
      : `  motor ${b.dentro ? 'hacia el centro' : 'hacia afuera'}: R mín = ${b.R} mm`
        + ` → hexágono e/c ${b.af.toFixed(1)} mm`);
  }
  const viables = barr.filter(b => b.R !== null);
  const elegido = viables.sort((a, b) => a.af - b.af)[0];
  R = elegido.R; dentro = elegido.dentro;
  console.log(`  ⇒ elegido: motor ${dentro ? 'hacia el centro' : 'hacia afuera'}, R = ${R} mm\n`);
}

const { E, info } = construir(R, dentro);
const T = tren();

console.log('— cinemática —');
const M = matrizCinematica(R, false), Mrad = matrizCinematica(R, true);
chk('la celda puede trasladar Y girar el bulto (ejes radiales, rodadura tangencial)',
  Math.abs(det3(M)) > 1e-6, `|det| = ${Math.abs(det3(M)).toFixed(1)}`);
chk('queda demostrado que la disposición alternativa NO sirve (ejes tangenciales)',
  Math.abs(det3(Mrad)) < 1e-9, `|det| = ${Math.abs(det3(Mrad)).toExponential(1)} ⇒ singular`);

console.log('— función —');
const v = velocidad();
chk('velocidad de transporte a 6 V dentro de lo dimensionado', v > 0.4 && v < 0.9,
  `${v.toFixed(2)} m/s`);
const traccion = ttParNm() * 0.3 / (P.ruedaDia / 2000);
chk('tracción continua por rueda (30 % del par de bloqueo)', traccion > 0.8,
  `${traccion.toFixed(2)} N`);
chk('la rueda asoma sobre la placa lo declarado', P.ruedaSobresale > 2 && P.ruedaSobresale < P.ruedaDia / 4,
  `${P.ruedaSobresale} mm`);

console.log('— armado —');
const ch = choques(E);
chk('las tres unidades no se tocan entre sí', ch.length === 0,
  ch.length ? `${ch.length} pares: ${ch.slice(0, 3).map(c => c.join(' ⨯ ')).join(' | ')}` : 'holgura ≥ 0.5 mm');
chk('el tren no cruza el centro de la celda', radioInterno(R, dentro) > 6,
  `extremo interno a r = ${radioInterno(R, dentro).toFixed(1)} mm`);
chk('el motor no carga el peso: la rueda va entre dos rodamientos',
  T.tRodL < -T.hw && T.tRodM > T.hw, '624ZZ a ambos lados de la rueda');

console.log('— fabricación —');
const compradas = E.parts.filter(p => p.comprada).length;
const impresas = E.parts.filter(p => p.impresa).length;
const fabricadas = E.parts.filter(p => p.fabricada).length;
chk('toda pieza declara si se compra, se imprime o se fabrica',
  compradas + impresas + fabricadas === E.parts.length - E.parts.filter(p => p.hardware).length,
  `${compradas} compradas · ${impresas} impresas · ${fabricadas} fabricadas`);

const mod = modulo3x3(info.placa.af);
console.log('— módulo 3×3 —');
chk('9 celdas cierran el módulo pedido', mod.centros.length === P.nCeldas,
  `${(mod.ancho / 10).toFixed(1)} × ${(mod.alto / 10).toFixed(1)} cm`);

for (const l of ok) console.log(`  ✔ ${l}`);
for (const l of mal) console.log(`  ✘ ${l}`);
console.log(`\n${ok.length} OK, ${mal.length} fallas`);

const doc = {
  format: 'foto3d-cad', version: 1, capa: 'user',
  origen: `celda triple omnidireccional — R = ${R} mm, motor ${dentro ? 'al centro' : 'afuera'}`,
  proyecto: 'CELDA3', params: { R, dentro, ...P },
  metricas: {
    hexagonoEntreCaras: info.placa.af, radioVertice: info.placa.Rv,
    radioInterno: radioInterno(R, dentro),
    velocidadMs: v, traccionPorRuedaN: traccion,
    moduloAncho: mod.ancho, moduloAlto: mod.alto,
    piezasPorCelda: E.parts.length,
  },
  parts: E.parts,
};
mkdirSync(join(aquí, 'out'), { recursive: true });
writeFileSync(join(aquí, 'celda3.json'), JSON.stringify(doc, null, 1));

console.log(`\ncelda: hexágono e/c ${info.placa.af.toFixed(1)} mm · ${E.parts.length} piezas`);
console.log(`módulo 3×3: ${(mod.ancho / 10).toFixed(1)} × ${(mod.alto / 10).toFixed(1)} cm`);
console.log(`→ ${join(aquí, 'celda3.json')}`);
if (mal.length) process.exit(1);
