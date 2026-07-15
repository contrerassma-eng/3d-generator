// Prueba del ensamble "Transferencia 90°" (cad/ensambles/transfer_rodillos_90.json):
// construye CADA pieza con el motor CSG real (model.js) y verifica volúmenes,
// mallas sin NaN, unicidad de ids y los invariantes de la especificación del
// usuario (iterada contra las fotos SID y su esquema IMG_3102): solo el módulo
// de desvío, 6 rodillos completos Ø40 (corazón Ø30) vulcanizados menos el
// extremo de polea, serpentín único desde abajo (tambor M + tensores Ø50 +
// 2 retornos), TODO POR DENTRO (motor embridado y 2 cilindros diagonales con
// pivote y palanca), canal fijo no más ancho que las placas, módulos
// FIJO/MÓVIL identificados y placas con dedos delgados hacia los rodillos.
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
check('40 piezas (solo el módulo de desvío)', doc.parts.length === 40, `hay ${doc.parts.length}`);
const pids = doc.parts.map(p => p.id);
check('ids de pieza únicos', new Set(pids).size === pids.length);
const fids = doc.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(fids).size === fids.length);
check('exactamente una pieza fija (canal)', doc.parts.filter(p => p.fixed).length === 1 && doc.parts[0].fixed);

console.log('— Módulos identificados (FIJO / MÓVIL) —');
const fijos = doc.parts.filter(p => p.name.startsWith('FIJO ·'));
const moviles = doc.parts.filter(p => p.name.startsWith('MÓVIL ·'));
check('toda pieza es FIJO · o MÓVIL ·', fijos.length + moviles.length === doc.parts.length,
  `${fijos.length}+${moviles.length}`);
check('canal lateral es la pieza fija a tierra', doc.parts[0].name.includes('Canal lateral'));
check('rodillos, transmisión, placas y motor son MÓVIL (suben juntos)',
  moviles.some(p => p.name.includes('Motorreductor')) &&
  moviles.some(p => p.name.includes('Banda serpentín')) &&
  moviles.filter(p => p.name.includes('Placa porta-poleas')).length === 2);

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
check('las 40 piezas construyen', built === doc.parts.length);
check('todas con volumen > 0', conVolumen === doc.parts.length);
check('ninguna malla con NaN', sinNaN === doc.parts.length);

console.log('— Volúmenes de referencia —');
const eje = doc.parts.find(p => p.name.includes('Eje rodillo'));
const vEje = Math.PI * 36 * 330;
check('eje Ø12×330 ≈ π·r²·L (±3%)', Math.abs(vols[eje.id] - vEje) / vEje < 0.03,
  `${vols[eje.id].toFixed(0)} vs ${vEje.toFixed(0)}`);
const rodillo = doc.parts.find(p => p.componente === 'rodillo_vulcanizado_40x290');
const vRod = Math.PI * (225 * 290 + (400 - 225) * 238 - 37.21 * 290);
check('rodillo vulcanizado ≈ volumen nominal (±3%)', Math.abs(vols[rodillo.id] - vRod) / vRod < 0.03,
  `${vols[rodillo.id].toFixed(0)} vs ${vRod.toFixed(0)}`);

console.log('— Invariantes de la especificación (coordenadas de mundo) —');
const M = doc.meta.verificaciones;
check('gap tangente >= 50 (espec. usuario)', M.tangentGap >= 50);
check('carrera vertical de 6 mm (espec. usuario)', M.carrera === 6);
const rodillos = doc.parts.filter(p => p.componente === 'rodillo_vulcanizado_40x290');
check('6 rodillos completos (misma cantidad que la foto de 90°)', rodillos.length === 6);
check('Ø40 vulcanizado sobre corazón Ø30, más corto (extremo de polea)', rodillos.every(p => {
  const nucleo = p.features.find(f => f.name.startsWith('Corazón'));
  const vulc = p.features.find(f => f.name.startsWith('Vulcanizado'));
  return nucleo.params.dia === 30 && vulc.params.dia === 40 && vulc.params.h < nucleo.params.h;
}));
check('elevado: tangente = plano anfitrión + 4', rodillos.every(p => {
  const n = p.features.find(f => f.name.startsWith('Corazón'));
  return world(p, n.at)[2] + 20 === 174;
}));
// elevación: SOLO 2 cilindros, diagonales, con pivote y palanca
const cils = doc.parts.filter(p => p.name.includes('Cilindro diagonal'));
check('SOLO 2 cilindros (sin pines verticales que parezcan cuatro)', cils.length === 2 &&
  !doc.parts.some(p => p.name.includes('Pin guía Ø16')));
check('cilindros inclinados en diagonal (25°..60°)', M.anguloCilindro >= 25 && M.anguloCilindro <= 60,
  `${M.anguloCilindro}°`);
check('cilindros por dentro (|x| ≤ 153)', cils.every(p =>
  p.features.every(f => Math.abs(world(p, f.at)[0]) <= 153 + 1e-6)));
const palancas = doc.parts.filter(p => p.name.includes('Palanca elevadora'));
const puentes = doc.parts.filter(p => p.name.includes('Puente elevador'));
check('2 palancas con rodillo de leva tocando el fondo del puente (subida vertical)',
  palancas.length === 2 && palancas.every(p => {
    const cam = p.features.find(f => f.name.startsWith('Rodillo de leva'));
    return world(p, cam.at)[2] + cam.params.dia / 2 === 105;
  }) && puentes.every(p => world(p, p.features[0].at)[2] === 105));
// motor por dentro, embridado a la placa -X, coaxial al tambor
const motor = doc.parts.find(p => p.name.includes('Motorreductor'));
const cuerpoM = motor.features.find(f => f.name.startsWith('Cuerpo'));
check('motor por dentro (cuerpo dentro de |x| < 147)', (() => {
  const w = world(motor, cuerpoM.at);
  return w[0] - cuerpoM.params.w / 2 >= -147 - 1e-6 && w[0] + cuerpoM.params.w / 2 <= 147 + 1e-6;
})());
const ejeTambor = doc.parts.find(p => p.name.includes('Eje tambor'));
const tambor = doc.parts.find(p => p.name.includes('Tambor motriz'));
check('motor coaxial al eje del tambor', (() => {
  const a = world(ejeTambor, ejeTambor.features[0].at);
  const b = world(motor, motor.features.find(f => f.name.startsWith('Eje salida')).at);
  return Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[2] - b[2]) < 1e-6;
})());
check('tambor M concéntrico con su eje', (() => {
  const t = world(tambor, tambor.features[0].at);
  const a = world(ejeTambor, ejeTambor.features[0].at);
  return Math.abs(t[1] - a[1]) < 1e-6 && Math.abs(t[2] - a[2]) < 1e-6;
})());
// canal fijo no más ancho que la cara que sostiene las poleas
const canal = doc.parts[0];
const baseF = canal.features.find(f => f.name.startsWith('Base'));
check('canal fijo (306) no más ancho que las placas (306)', baseF.params.w === 306 && M.anchoModulo === 306);
// pasadores guía del módulo móvil en colisas del canal (en diagonal)
const pasadores = doc.parts.filter(p => p.name.includes('Pasador guía'));
const colisas = canal.features.filter(f => f.name.startsWith('Colisa'));
check('2 pasadores guía en colisas verticales del canal', pasadores.length === 2 && colisas.length === 2 &&
  pasadores.every(p => colisas.some(f => {
    const wC = world(canal, f.at), wP = world(p, p.features[0].at);
    return Math.abs(wC[1] - wP[1]) < 1e-6 && Math.abs(Math.abs(wC[0]) - 141) < 1e-6;
  })));
// transmisión: serpentín único, tensores Ø50, retornos, dentro del tramo desnudo
const bandas = doc.parts.filter(p => p.name.includes('Banda'));
check('UNA sola banda (serpentín, no rodillo a rodillo)', bandas.length === 1 &&
  bandas[0].name.includes('serpentín'));
const tensores = doc.parts.filter(p => p.name.includes('Tensor'));
const retornos = doc.parts.filter(p => p.name.includes('Polea de retorno'));
check('4 tensores Ø50 (2ª línea, mayores que los rodillos Ø40)', tensores.length === 4 &&
  tensores.every(p => p.features.some(f => f.shape === 'cylinder' && f.params.dia === 50)));
check('2 poleas de retorno en las esquinas inferiores', retornos.length === 2 &&
  retornos.every(p => p.pos[2] < 60));
const banda = bandas[0];
check('serpentín dentro del tramo desnudo (x 93..145)',
  banda.pos[0] - banda.features[0].params.h / 2 >= 93 - 1e-9 &&
  banda.pos[0] + banda.features[0].params.h / 2 <= 145 + 1e-9);
check('lomo del serpentín embutido bajo el plano de rodillos (≤174)', (() => {
  const outer = banda.features.find(f => f.name.startsWith('Cara'));
  const z0 = outer.at[2] + banda.pos[2];
  const zs = outer.params.pts.map(([, v]) => v + z0);
  return Math.max(...zs) <= 174 + 0.01 && Math.max(...zs) > 171;
})());
// placas con dedos delgados hacia los rodillos (las bandas de 40 pasan entre ellos)
const placas = doc.parts.filter(p => p.name.includes('Placa porta-poleas'));
check('placas con 6 dedos delgados (puntas a z=168, valles a 136)', placas.every(p => {
  const c = p.features.find(f => f.shape === 'sketch');
  const z0 = c.at[2] + p.pos[2];
  const zs = c.params.pts.map(([, v]) => v + z0);
  const puntas = c.params.pts.filter(([, v]) => Math.abs(v + z0 - 168) < 0.01).length;
  return Math.max(...zs) === 168 && puntas >= 6;
}));
// concentricidad: agujeros Ø12.2 de las placas sobre el eje de cada línea
const ejes = doc.parts.filter(p => p.name.includes('Eje rodillo'));
let conc = 0, tot = 0;
for (const placa of placas) {
  for (const f of placa.features.filter(f => f.shape === 'hole' && f.params.dia === 12.2 && f.name.includes('eje línea'))) {
    tot++;
    const w = world(placa, f.at);
    if (ejes.some(e => {
      const a = world(e, e.features[0].at);
      return Math.abs(a[1] - w[1]) < 1e-6 && Math.abs(a[2] - w[2]) < 1e-6;
    })) conc++;
  }
}
check('12 agujeros de eje en placas, todos concéntricos con su eje', tot === 12 && conc === 12, `${conc}/${tot}`);
// tensores/retornos alineados con la placa de transmisión
const placaTrans = placas.find(p => p.name.includes('transmisión'));
const stubHoles = placaTrans.features.filter(f => f.shape === 'hole' && f.name.includes('tensor/retorno'))
  .map(f => world(placaTrans, f.at).slice(1).join(','));
check('6 ejes tensores/retorno alineados con la placa de transmisión',
  stubHoles.length === 6 && [...tensores, ...retornos].every(p =>
    stubHoles.includes(world(p, p.features[0].at).slice(1).join(','))));

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
