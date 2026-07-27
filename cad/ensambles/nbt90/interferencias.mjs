#!/usr/bin/env node
// interferencias.mjs — comprobación de interferencia REAL entre el módulo que
// sube y el que queda fijo. El chequeo por cajas envolventes (AABB) del gate
// delata candidatos, pero un perfil en U es hueco: su caja incluye el vacío
// interior. Aquí se intersecan los SÓLIDOS con el motor CSG y se reporta el
// volumen de solape efectivo.
//
//   cd cad && node ensambles/nbt90/interferencias.mjs [tolerancia_cm3]
//
// Además comprueba el CONTACTO del pop-up: la mesa guía tiene que empujar
// realmente al conjunto móvil (si no lo toca, el mecanismo no sube nada).
//
// LÍMITE CONOCIDO — esto marca CANDIDATOS, no dicta veredictos. El motor CSG
// devuelve volumen fantasma en dos situaciones, ambas vistas en este ensamble:
//   · dos cortes COAXIALES sobre la misma pieza (un pasante y su avellanado)
//     dejan caras cilíndricas coincidentes;
//   · un sólido fino y muy no convexo (la banda en serpentín) se clasifica mal
//     en ~5 % de sus triángulos.
// Antes de tocar geometría por un aviso de aquí, biseca: quita funciones de una
// pieza hasta ver cuál dispara el fantasma, o prueba con un punto-en-sólido. En
// este ensamble, 4 de los 16 avisos iniciales eran artefactos de este tipo.
import * as THREE from 'three';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPartGeometry, partMatrix } from '../../js/model.js';
import { geomToCSG, csgToGeom } from '../../js/csg.js';
import { bboxPieza, solapan } from './lib.mjs';

const aquí = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(aquí, 'narrow_belt_transfer_90.json'), 'utf8'));
const TOL = Number(process.argv[2] ?? 0.5);            // cm³ que se consideran ruido de faceteado

const volumen = (g) => {
  const p = g.attributes.position; if (!p) return 0;
  let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return Math.abs(v);
};

const propias = doc.parts.filter(p => !p.contexto);
const movil = propias.filter(p => /^MÓVIL/.test(p.name));
const fijo = propias.filter(p => /^FIJO/.test(p.name));

// La BANDA es un lazo fino y muy no convexo: el motor CSG clasifica mal parte de
// sus triángulos y da un volumen de intersección espurio (se comprobó alejándola
// 100 mm: el "solape" no cambiaba). Su holgura se mide analíticamente en
// transmision.mjs (métrica `bandaACanal`), no aquí.
const NO_FIABLE = /Banda plana/;
const fiable = (p) => !NO_FIABLE.test(p.name);

// Por defecto se comparan TODOS los pares (también MÓVIL⨯MÓVIL: un motor que no
// cabe en su placa es tan grave como uno que choca con el bastidor).
const soloCruce = process.argv.includes('--solo-cruce');
console.log(soloCruce
  ? `${movil.length} piezas MÓVIL × ${fijo.length} FIJO — buscando candidatos por caja…`
  : `${propias.length} piezas, todos los pares — buscando candidatos por caja…`);

const pares = [];
const bbTodas = propias.map(p => [p, bboxPieza(p)]);
const bbM = movil.map(p => [p, bboxPieza(p)]);
const bbF = fijo.map(p => [p, bboxPieza(p)]);
const izq = soloCruce ? bbM : bbTodas;
for (let i = 0; i < izq.length; i++) {
  const der = soloCruce ? bbF : bbTodas.slice(i + 1);
  for (const [pf, bf] of der) {
    const [pm, bm] = izq[i];
    if (pm === pf || !fiable(pm) || !fiable(pf)) continue;
    if (!solapan(bm, bf, 0.2)) continue;
    const d = [0, 1, 2].map(k => Math.min(bm.hi[k], bf.hi[k]) - Math.max(bm.lo[k], bf.lo[k]));
    pares.push([d[0] * d[1] * d[2], pm, pf]);
  }
}
pares.sort((a, b) => b[0] - a[0]);
console.log(`${pares.length} pares con cajas solapadas; intersecando sólidos…\n`);

const cache = new Map();
const sólido = (p) => {
  if (!cache.has(p.id)) {
    const g = buildPartGeometry(p).clone().applyMatrix4(partMatrix(p));
    cache.set(p.id, { csg: geomToCSG(g), vol: volumen(g) });
  }
  return cache.get(p.id);
};

let reales = 0;
const detalle = [];
for (const [, pm, pf] of pares) {
  let v = 0;
  try {
    const a = sólido(pm), b = sólido(pf);
    const inter = a.csg.intersect(b.csg);
    if (!inter.polygons.length) continue;
    v = volumen(csgToGeom(inter)) / 1000;                   // cm³
  } catch (err) { console.log(`  ? no se pudo intersecar ${pm.name} × ${pf.name}: ${err.message}`); continue; }
  if (v > TOL) {
    reales++;
    detalle.push({ cm3: +v.toFixed(3), a: pm.name, b: pf.name,
      cruce: /^MÓVIL/.test(pm.name) !== /^MÓVIL/.test(pf.name) });
    console.log(`  ✘ ${v.toFixed(2)} cm³  ${pm.name}\n            ⨯ ${pf.name}`);
  }
}

// --- contacto del pop-up: ¿la mesa guía toca lo que tiene que subir? ---------
let contacto = null;
const empuje = propias.find(p => /plato de empuje|placa móvil/i.test(p.name));
if (empuje) {
  const be = bboxPieza(empuje);
  let mejor = null;
  for (const [pm, bm] of bbM) {
    if (pm.id === empuje.id) continue;
    const solapaXY = bm.hi[0] > be.lo[0] && bm.lo[0] < be.hi[0] && bm.hi[1] > be.lo[1] && bm.lo[1] < be.hi[1];
    if (!solapaXY) continue;
    const hueco = bm.lo[2] - be.hi[2];                      // separación vertical
    if (hueco >= -2 && (mejor === null || hueco < mejor.hueco)) mejor = { hueco, p: pm };
  }
  console.log(`\ncontacto del pop-up: cara de empuje "${empuje.name}" en Z = ${be.hi[2].toFixed(2)}`);
  contacto = mejor
    ? { caraEmpuje: empuje.name, z: +be.hi[2].toFixed(2), separacion_mm: +mejor.hueco.toFixed(2), apoya: mejor.p.name, ok: mejor.hueco <= 0.6 }
    : { caraEmpuje: empuje.name, z: +be.hi[2].toFixed(2), ok: false, apoya: null };
  console.log(mejor
    ? `  ${mejor.hueco <= 0.6 ? '✔' : '✘'} separación ${mejor.hueco.toFixed(2)} mm hasta «${mejor.p.name}»`
    : '  ✘ ninguna pieza MÓVIL apoya sobre la cara de empuje: el actuador no levantaría nada');
}

const informe = {
  tolerancia_cm3: TOL, pares_candidatos_aabb: pares.length, interferencias_reales: reales,
  detalle, contacto_popup: contacto,
};
writeFileSync(join(aquí, 'interferencias.json'), JSON.stringify(informe, null, 1));
console.log(`\n${reales} interferencia(s) real(es) por encima de ${TOL} cm³ sobre ${pares.length} pares candidatos`);
console.log(`informe → ${join(aquí, 'interferencias.json')}`);
process.exit(reales ? 1 : 0);
