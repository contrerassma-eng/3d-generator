// Verifica que las piezas exportadas por la biblioteca de componentes
// (pipeline/componentes_cli.py cad-json) regeneran en el motor del CAD:
// geometría sin NaN, con volumen, y agujeros que sí quitan material.
// Requiere haber generado antes componentes/out/componentes_cad.json.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';

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

// Ruta por argumento, o búsqueda hacia arriba desde el cwd (el bundle pierde
// la ruta del fuente): node test_componentes.bundle.mjs [ruta/al/doc.json]
let path = process.argv[2];
if (!path) {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const p = resolve(dir, 'componentes/out/componentes_cad.json');
    if (existsSync(p)) { path = p; break; }
    if (dirname(dir) === dir) throw new Error('componentes_cad.json no encontrado: genera con `python pipeline/componentes_cli.py cad-json <ids>` o pásalo como argumento');
  }
}
const doc = JSON.parse(readFileSync(path, 'utf8'));
check('formato foto3d-cad v1', doc.format === 'foto3d-cad' && doc.version === 1);
check('tiene piezas', doc.parts?.length > 0);

for (const part of doc.parts) {
  console.log(`- ${part.name}`);
  const geom = buildPartGeometry(part);
  check('regenera', !!geom, '(geometría nula)');
  if (!geom) continue;
  check('sin NaN', !hasNaN(geom));
  const vol = volume(geom);
  check(`volumen > 0 (${vol.toFixed(0)} mm³)`, vol > 1);
  const holes = part.features.filter(f => f.shape === 'hole');
  if (holes.length) {
    const sinAgujeros = { ...part, features: part.features.filter(f => f.shape !== 'hole') };
    const vol0 = volume(buildPartGeometry(sinAgujeros));
    check(`agujeros quitan material (${(vol0 - vol).toFixed(1)} mm³, ${holes.length} agujeros)`,
      vol0 - vol > 0.1);
  }
}

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
