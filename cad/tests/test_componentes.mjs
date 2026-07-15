// Verifica la biblioteca de componentes en el motor del CAD del navegador:
//  1. componentToPart (la ruta del botón 🔌 Comp.) sobre TODO el catálogo
//     servido a la web (cad/componentes.json): regenera sin NaN, con volumen,
//     y los agujeros de montaje quitan material.
//  2. Si existe componentes/out/componentes_cad.json (CLI cad-json), también
//     regenera esas piezas.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import { componentToPart, envolvente, COLOR_CATEGORIA } from '../js/componentes.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${detail}`); }
};

function volume(geom) {
  const p = geom.attributes.position;
  if (!p) return 0;
  let v = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return v;
}
const hasNaN = (geom) => {
  for (const x of geom.attributes.position?.array || []) if (!Number.isFinite(x)) return true;
  return false;
};

// raíz del repo: búsqueda hacia arriba desde el cwd (el bundle pierde la ruta)
let root = process.cwd();
while (!existsSync(resolve(root, 'componentes/catalogo.json'))) {
  const up = dirname(root);
  if (up === root) throw new Error('no se encontró la raíz del repo (componentes/catalogo.json)');
  root = up;
}

// --- 1. catálogo web + componentToPart (lo que hace el botón Comp.) --------
const webCat = resolve(root, 'cad/componentes.json');
check('cad/componentes.json existe (sync-web)', existsSync(webCat));
const cat = JSON.parse(readFileSync(webCat, 'utf8'));
check('formato foto3d-componentes', cat.formato === 'foto3d-componentes');
check('catálogo web == catálogo canónico',
  readFileSync(webCat, 'utf8') === readFileSync(resolve(root, 'componentes/catalogo.json'), 'utf8'));

for (const comp of cat.componentes) {
  console.log(`- ${comp.id}`);
  const part = componentToPart(comp);
  check('pieza válida', part.features.length >= comp.solidos.length
    && part.color === COLOR_CATEGORIA[comp.categoria] && part.componente === comp.id);
  const geom = buildPartGeometry(part);
  check('regenera', !!geom, '(geometría nula)');
  if (!geom) continue;
  check('sin NaN', !hasNaN(geom));
  const vol = volume(geom);
  check(`volumen > 0 (${vol.toFixed(0)} mm³)`, vol > 1);
  const [lo, hi] = envolvente(comp);
  const bb = new THREE.Box3().setFromBufferAttribute(geom.attributes.position);
  check('límites = envolvente',
    bb.min.distanceTo(new THREE.Vector3(...lo)) < 0.5 &&
    bb.max.distanceTo(new THREE.Vector3(...hi)) < 0.5);
  const holes = part.features.filter(f => f.shape === 'hole');
  if (holes.length) {
    const sinAgujeros = { ...part, features: part.features.filter(f => f.shape !== 'hole') };
    const vol0 = volume(buildPartGeometry(sinAgujeros));
    check(`agujeros quitan material (${(vol0 - vol).toFixed(1)} mm³, ${holes.length} agujeros)`,
      vol0 - vol > 0.1);
  }
}

// --- 2. documento del CLI cad-json (si fue generado) ------------------------
const docPath = process.argv[2] || resolve(root, 'componentes/out/componentes_cad.json');
if (existsSync(docPath)) {
  const doc = JSON.parse(readFileSync(docPath, 'utf8'));
  check('cad-json: formato foto3d-cad v1', doc.format === 'foto3d-cad' && doc.version === 1);
  for (const part of doc.parts) {
    const geom = buildPartGeometry(part);
    check(`cad-json: ${part.name} regenera con volumen`,
      geom && !hasNaN(geom) && volume(geom) > 1);
  }
} else {
  console.log('(componentes_cad.json no generado: se omite la parte 2)');
}

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
