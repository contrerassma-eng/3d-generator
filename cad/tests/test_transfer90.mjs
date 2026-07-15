// Prueba del ensamble "Transferencia 90°" (cad/ensambles/transfer_rodillos_90.json):
// construye CADA pieza con el motor CSG real (model.js) y verifica volúmenes,
// mallas sin NaN, unicidad de ids y los invariantes de la especificación del
// usuario: solo el módulo de desvío, 2 cilindros estándar EN DIAGONAL con
// carrera 6, rodillos completos vulcanizados menos el extremo desnudo donde
// las bandas de transmisión los usan como poleas de la primera línea, y
// gap tangente >= 50 para las bandas de 40 del transportador anfitrión.
//
// Correr (ver tests/README.md):
//   npx esbuild tests/test_transfer90.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_transfer90.bundle.mjs
//   node /tmp/test_transfer90.bundle.mjs        # desde cad/

import { readFileSync } from 'node:fs';
import { buildPartGeometry } from '../js/model.js';

// tras el bundle import.meta.url apunta al bundle: ruta por argv o desde cad/
const jsonPath = process.argv[2] || 'ensambles/transfer_rodillos_90.json';
const doc = JSON.parse(readFileSync(jsonPath, 'utf8'));

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${detail}`); }
};

function volume(geom) {
  const p = geom.attributes.position;
  if (!p) return 0;
  let v = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = [p.getX(i), p.getY(i), p.getZ(i)];
    const b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
    const c = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)];
    v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return v;
}
const hasNaN = (geom) => {
  for (const x of geom.attributes.position?.array || []) if (!Number.isFinite(x)) return true;
  return false;
};
const world = (part, at) => [at[0] + part.pos[0], at[1] + part.pos[1], at[2] + part.pos[2]];

console.log('— Documento —');
check('formato foto3d-cad v1', doc.format === 'foto3d-cad' && doc.version === 1);
check('25 piezas (solo el módulo de desvío)', doc.parts.length === 25, `hay ${doc.parts.length}`);
const pids = doc.parts.map(p => p.id);
check('ids de pieza únicos', new Set(pids).size === pids.length);
const fids = doc.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(fids).size === fids.length);
check('exactamente una pieza fija (placa base)', doc.parts.filter(p => p.fixed).length === 1 && doc.parts[0].fixed);
check('sin módulo principal de bandas (no hay poleas de carril ni deslizaderas)',
  !doc.parts.some(p => /Deslizadera|carril/.test(p.name)));

console.log('— Construcción CSG de cada pieza —');
let built = 0, conVolumen = 0, sinNaN = 0;
const vols = {};
for (const part of doc.parts) {
  const g = buildPartGeometry(part);
  built++;
  const v = volume(g);
  vols[part.id] = v;
  if (v > 1) conVolumen++;
  if (!hasNaN(g)) sinNaN++;
  else console.log(`    NaN en ${part.name}`);
  if (v <= 1) console.log(`    sin volumen: ${part.name} (v=${v.toFixed(1)})`);
}
check('las 25 piezas construyen', built === doc.parts.length);
check('todas con volumen > 0', conVolumen === doc.parts.length);
check('ninguna malla con NaN', sinNaN === doc.parts.length);

console.log('— Volúmenes de referencia —');
const eje = doc.parts.find(p => p.name.startsWith('Eje rodillo'));
const vEje = Math.PI * 36 * 330;
check('eje Ø12×330 ≈ π·r²·L (±3%)', Math.abs(vols[eje.id] - vEje) / vEje < 0.03,
  `${vols[eje.id].toFixed(0)} vs ${vEje.toFixed(0)}`);
const rodillo = doc.parts.find(p => p.componente === 'rodillo_vulcanizado_50x290');
const vRod = Math.PI * (484 * 290 + (625 - 484) * 238 - 37.21 * 290); // núcleo + corona vulcanizada - barreno
check('rodillo vulcanizado ≈ volumen nominal (±3%)', Math.abs(vols[rodillo.id] - vRod) / vRod < 0.03,
  `${vols[rodillo.id].toFixed(0)} vs ${vRod.toFixed(0)}`);

console.log('— Invariantes de la especificación (coordenadas de mundo) —');
const M = doc.meta.verificaciones;
check('gap tangente >= 50 (espec. usuario)', M.tangentGap >= 50);
check('carrera de 6 mm (espec. usuario)', M.carrera === 6);
// rodillos completos: 3, de una sola pieza, vulcanizados menos un extremo
const rodillos = doc.parts.filter(p => p.componente === 'rodillo_vulcanizado_50x290');
check('3 rodillos completos (una pieza por línea)', rodillos.length === 3);
check('vulcanizado más corto que el núcleo (extremo desnudo)', rodillos.every(p => {
  const nucleo = p.features.find(f => f.name.startsWith('Núcleo'));
  const vulc = p.features.find(f => f.name.startsWith('Vulcanizado'));
  return vulc.params.h < nucleo.params.h && vulc.params.dia > nucleo.params.dia;
}));
// elevado +4 sobre el plano anfitrión; retraído -2 (carrera 6)
check('elevado: tangente = plano anfitrión + 4', rodillos.every(p => {
  const n = p.features.find(f => f.name.startsWith('Núcleo'));
  return world(p, n.at)[2] + 25 === 174;
}));
check('retraído queda bajo el plano (bajada 2 mm)', M.drop >= 1);
// 2 cilindros estándar EN DIAGONAL + 2 pines guía en la diagonal contraria
const cils = doc.parts.filter(p => p.name.startsWith('Cilindro neumático'));
check('2 cilindros estándar', cils.length === 2);
check('cilindros en esquinas diagonales opuestas', cils.length === 2 &&
  cils[0].pos[0] === -cils[1].pos[0] && cils[0].pos[1] === -cils[1].pos[1]);
const pines = doc.parts.filter(p => p.name.startsWith('Pin guía'));
check('2 pines guía en la diagonal contraria', pines.length === 2 &&
  pines[0].pos[0] === -pines[1].pos[0] && pines[0].pos[1] === -pines[1].pos[1] &&
  Math.sign(pines[0].pos[0] * pines[0].pos[1]) !== Math.sign(cils[0].pos[0] * cils[0].pos[1]));
// bandas de transmisión: envuelven los núcleos desnudos (rodillo = polea) y
// quedan al ras del vulcanizado (22 + 3 = 25)
const bandas = doc.parts.filter(p => p.name.startsWith('Banda'));
check('3 bandas (R1↔R2, R2↔R3 y motriz)', bandas.length === 3);
check('bandas dentro del extremo desnudo (x 93..145)', bandas.every(p => {
  const w = p.features[0].params.h;
  return p.pos[0] - w / 2 >= 93 - 1e-9 && p.pos[0] + w / 2 <= 145 + 1e-9;
}));
// concentricidad: agujeros Ø12.2 de los peines sobre el eje de cada línea
const peines = doc.parts.filter(p => p.name.startsWith('Placa portarodillos'));
const ejes = doc.parts.filter(p => p.name.startsWith('Eje rodillo'));
let conc = 0, tot = 0;
for (const peine of peines) {
  for (const f of peine.features.filter(f => f.shape === 'hole' && f.params.dia === 12.2)) {
    tot++;
    const w = world(peine, f.at);
    if (ejes.some(e => {
      const a = world(e, e.features[0].at);
      return Math.abs(a[1] - w[1]) < 1e-6 && Math.abs(a[2] - w[2]) < 1e-6;
    })) conc++;
  }
}
check('6 agujeros de eje en peines, todos concéntricos con su eje', tot === 6 && conc === 6, `${conc}/${tot}`);
// patrones de taladrado coincidentes base ↔ cilindros y base ↔ pines
const base = doc.parts[0];
const enBase = (dia) => base.features.filter(f => f.shape === 'hole' && f.params.dia === dia)
  .map(f => world(base, f.at).slice(0, 2).join(','));
const patCil = cils.flatMap(p => p.features.filter(f => f.shape === 'hole' && f.params.dia === 5.5)
  .map(f => world(p, f.at).slice(0, 2).join(',')));
check('patrón Ø5.5 brida coincide base ↔ cilindros', patCil.length === 8 && patCil.every(k => enBase(5.5).includes(k)));
const patPin = pines.flatMap(p => p.features.filter(f => f.shape === 'hole' && f.params.dia === 4.5)
  .map(f => world(p, f.at).slice(0, 2).join(',')));
check('patrón Ø4.5 brida coincide base ↔ pines guía', patPin.length === 4 && patPin.every(k => enBase(4.5).includes(k)));
// pies de los peines dentro de las ranuras de los largueros
const largueros = doc.parts.filter(p => p.name.startsWith('Larguero'));
check('ranuras de larguero alineadas con los peines', largueros.every(l =>
  l.features.filter(f => f.name.startsWith('Ranura')).every(f => {
    const w = world(l, f.at);
    return Math.abs(Math.abs(w[0]) - 150) < 1e-6;
  })));

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
