// Prueba del ensamble "Transferencia 90°" (cad/ensambles/transfer_rodillos_90.json):
// construye CADA pieza con el motor CSG real (model.js) y verifica volúmenes,
// mallas sin NaN, unicidad de ids y los invariantes de la especificación del
// usuario (iterada contra las fotos SID y su esquema IMG_3102): solo el módulo
// de desvío, 6 rodillos completos vulcanizados menos el extremo de polea,
// transmisión de UNA banda en serpentín desde abajo (tambor M + tensores +
// 2 poleas de retorno — NO rodillo a rodillo), 2 cilindros estándar EN
// DIAGONAL con carrera 6, y gap tangente >= 50 para las bandas de 40 del
// transportador anfitrión.
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
check('37 piezas (solo el módulo de desvío)', doc.parts.length === 37, `hay ${doc.parts.length}`);
const pids = doc.parts.map(p => p.id);
check('ids de pieza únicos', new Set(pids).size === pids.length);
const fids = doc.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(fids).size === fids.length);
check('exactamente una pieza fija (placa base)', doc.parts.filter(p => p.fixed).length === 1 && doc.parts[0].fixed);

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
check('las 37 piezas construyen', built === doc.parts.length);
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
const rodillos = doc.parts.filter(p => p.componente === 'rodillo_vulcanizado_50x290');
check('6 rodillos completos (misma cantidad que la foto de 90°)', rodillos.length === 6);
check('vulcanizado más corto que el núcleo (extremo de polea desnudo)', rodillos.every(p => {
  const nucleo = p.features.find(f => f.name.startsWith('Núcleo'));
  const vulc = p.features.find(f => f.name.startsWith('Vulcanizado'));
  return vulc.params.h < nucleo.params.h && vulc.params.dia > nucleo.params.dia;
}));
check('elevado: tangente = plano anfitrión + 4', rodillos.every(p => {
  const n = p.features.find(f => f.name.startsWith('Núcleo'));
  return world(p, n.at)[2] + 25 === 174;
}));
check('retraído queda bajo el plano (bajada 2 mm)', M.drop >= 1);
// transmisión: UNA banda en serpentín (no rodillo a rodillo)
const bandas = doc.parts.filter(p => p.name.startsWith('Banda'));
check('UNA sola banda (serpentín, no rodillo a rodillo)', bandas.length === 1 &&
  bandas[0].name.includes('serpentín'));
const tensores = doc.parts.filter(p => p.name.startsWith('Tensor'));
const retornos = doc.parts.filter(p => p.name.startsWith('Polea de retorno'));
check('4 tensores entre pares de rodillos', tensores.length === 4);
check('2 poleas de retorno en las esquinas inferiores', retornos.length === 2 &&
  retornos.every(p => p.pos[2] < 60));
const tambor = doc.parts.find(p => p.name.startsWith('Tambor motriz'));
const ejeTambor = doc.parts.find(p => p.name.startsWith('Eje tambor'));
check('tambor M concéntrico con su eje', (() => {
  const t = world(tambor, tambor.features[0].at);
  const a = world(ejeTambor, ejeTambor.features[0].at);
  return Math.abs(t[1] - a[1]) < 1e-6 && Math.abs(t[2] - a[2]) < 1e-6;
})());
// el serpentín queda dentro del tramo desnudo y su lomo al ras del vulcanizado
const banda = bandas[0];
check('serpentín dentro del tramo desnudo (x 93..145)',
  banda.pos[0] - banda.features[0].params.h / 2 >= 93 - 1e-9 &&
  banda.pos[0] + banda.features[0].params.h / 2 <= 145 + 1e-9);
check('lomo del serpentín al ras del plano de rodillos (174)', (() => {
  const outer = banda.features.find(f => f.name.startsWith('Cara'));
  // v del boceto es +Z mundial desde el origen del plano (at local + pos)
  const z0 = outer.at[2] + banda.pos[2];
  const zs = outer.params.pts.map(([, v]) => v + z0);
  return Math.max(...zs) <= 174 + 0.01 && Math.max(...zs) > 173;
})());
// 2 cilindros estándar EN DIAGONAL + 2 pines guía en la diagonal contraria
const cils = doc.parts.filter(p => p.name.startsWith('Cilindro neumático'));
check('2 cilindros estándar', cils.length === 2);
check('cilindros en esquinas diagonales opuestas', cils.length === 2 &&
  cils[0].pos[0] === -cils[1].pos[0] && cils[0].pos[1] === -cils[1].pos[1]);
const pines = doc.parts.filter(p => p.name.startsWith('Pin guía'));
check('2 pines guía en la diagonal contraria', pines.length === 2 &&
  pines[0].pos[0] === -pines[1].pos[0] && pines[0].pos[1] === -pines[1].pos[1] &&
  Math.sign(pines[0].pos[0] * pines[0].pos[1]) !== Math.sign(cils[0].pos[0] * cils[0].pos[1]));
// concentricidad: agujeros Ø12.2 de los peines sobre el eje de cada línea
const peines = doc.parts.filter(p => p.name.startsWith('Placa portarodillos'));
const ejes = doc.parts.filter(p => p.name.startsWith('Eje rodillo'));
let conc = 0, tot = 0;
for (const peine of peines) {
  for (const f of peine.features.filter(f => f.shape === 'hole' && f.params.dia === 12.2 && f.name.includes('eje línea'))) {
    tot++;
    const w = world(peine, f.at);
    if (ejes.some(e => {
      const a = world(e, e.features[0].at);
      return Math.abs(a[1] - w[1]) < 1e-6 && Math.abs(a[2] - w[2]) < 1e-6;
    })) conc++;
  }
}
check('12 agujeros de eje en peines, todos concéntricos con su eje', tot === 12 && conc === 12, `${conc}/${tot}`);
// tensores/retornos alineados con sus agujeros en la placa de transmisión
const placaTrans = peines.find(p => p.name.includes('transmisión'));
const stubHoles = placaTrans.features.filter(f => f.shape === 'hole' && f.name.includes('tensor/retorno'))
  .map(f => world(placaTrans, f.at).slice(1).join(','));
check('6 ejes tensores/retorno alineados con la placa de transmisión',
  stubHoles.length === 6 && [...tensores, ...retornos].every(p =>
    stubHoles.includes(world(p, p.features[0].at).slice(1).join(','))));
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

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
