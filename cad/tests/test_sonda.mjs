// Prueba del ensamble "Sonda de humedad de suelo industrial"
// (cad/ensambles/sonda_suelo.json): construye CADA pieza con el motor CSG real
// (model.js), verifica volúmenes > 0 y sin NaN, y los invariantes del diseño:
// profundidades 200/400/600 desfasadas 120°, garganta tórica según regla
// Parker (prof ≈ 80 % CS, ancho ≈ 1.33×CS, apriete 15–25 % contra ID 42.6),
// espigas Ø42.4 con juego H8/f7 en el tubo ID 42.6, patrón M4 56×56 idéntico
// entre brida del acople y piso del gabinete, electrónica dentro de la cavidad
// útil del gabinete, y hoja del sensor íntegramente fuera del tubo.
//
// Correr (desde cad/, ver tests/README.md):
//   npx esbuild tests/test_sonda.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_sonda.bundle.mjs
//   node /tmp/test_sonda.bundle.mjs

import { readFileSync } from 'node:fs';
import { buildPartGeometry, partMatrix } from '../js/model.js';
import * as THREE from 'three';

const doc = JSON.parse(readFileSync(process.argv[2] || 'ensambles/sonda_suelo.json', 'utf8'));
const dims = JSON.parse(readFileSync('ensambles/sonda_suelo_dims.json', 'utf8'));
const D = dims.D;

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
const hasNaN = (g) => { for (const x of g.attributes.position?.array || []) if (!Number.isFinite(x)) return true; return false; };
const byId = (id) => doc.parts.find(p => p.id === id);

console.log('— Documento —');
check('formato foto3d-cad v1', doc.format === 'foto3d-cad' && doc.version === 1);
check('35 piezas', doc.parts.length === 35, `hay ${doc.parts.length}`);
check('ids de pieza únicos', new Set(doc.parts.map(p => p.id)).size === doc.parts.length);
const fids = doc.parts.flatMap(p => p.features.map(f => f.id));
check('ids de función únicos', new Set(fids).size === fids.length);
check('tubo fijo (referencia)', byId('tubo').fixed === true);
check('BOM, pasos y features en meta', doc.meta.bom.length >= 25 && doc.meta.pasos.length === 12 && doc.meta.features.length >= 8);
check('vector de despiece por pieza', doc.parts.every(p => p.id === 'tubo' || doc.meta.explode[p.id]));

console.log('— Regla Parker de la garganta tórica (informe §5.4) —');
const g = D.torica;
check('profundidad ≈ 80 % CS', Math.abs(g.gargantaProf - 0.8 * g.cs) < 0.01, `${g.gargantaProf}`);
check('ancho ≈ 1.33 × CS', Math.abs(g.gargantaW - 4) < 0.01);
const odLibre = g.gargantaFondoD + 2 * g.cs;                    // 43.6
const apriete = (odLibre - D.tubo.ID) / 2 / g.cs;               // por flanco
check('apriete 15–25 % contra ID 42.6', apriete > 0.15 && apriete < 0.25, `${(apriete * 100).toFixed(1)} %`);
check('espiga Ø42.4 desliza en ID 42.6 (juego 0.2)', Math.abs(D.tubo.ID - D.punta.espigaD - 0.2) < 0.01);

console.log('— Sensores y pasamuros —');
D.sensor.profundidades.forEach((zp, i) => {
  const s = byId(`sensor${i + 1}`), m = byId(`pasamuro${i + 1}`);
  check(`sensor ${i + 1} y pasamuro en z=${zp}`, s.pos[2] === zp && m.pos[2] === zp);
  check(`sensor ${i + 1} y pasamuro co-orientados`, JSON.stringify(s.quat) === JSON.stringify(m.quat));
});
check('azimuts desfasados 120°', JSON.stringify(D.sensor.azimuts) === '[0,120,240]');
check('ranura pasamuro > hoja (31×13 vs 30×12)',
  D.pasamuro.ranuraW > D.sensor.W && D.pasamuro.ranuraT > D.sensor.T);
// la hoja sensora arranca fuera del ánima y termina en suelo no perturbado
const hoja = byId('sensor1').features.find(f => f.name.includes('Hoja'));
check('hoja íntegramente fuera del eje de cables (r≥10)', hoja.at[2] >= 10);
check('punta sensora ≥ 100 mm fuera del tubo', hoja.at[2] + D.sensor.L - D.tubo.OD / 2 >= 100,
  `${hoja.at[2] + D.sensor.L - D.tubo.OD / 2}`);

console.log('— Patrones de taladrado coincidentes —');
const acM4 = byId('acople').features.find(f => f.shape === 'hole' && f.name.includes('M4'));
const gabM4 = byId('gabinete').features.find(f => f.name === 'Paso M4 piso');
check('patrón 56×56 brida = piso', acM4.at[0] === 28 && acM4.at[1] === 28 && gabM4.at[0] === 28 && gabM4.at[1] === 28);
const gabTapa = byId('gabinete').features.find(f => f.name === 'Rosca tapa M4');
const tapaH = byId('tapa').features.find(f => f.shape === 'hole');
check('patrón tapa 162×112 = torretas', gabTapa.at[0] === tapaH.at[0] && gabTapa.at[1] === tapaH.at[1]);

console.log('— Cadena vertical: tubo -> transición -> pilar SCH40 -> cabezal —');
check('espiga de transición engrana 18 en el tubo', D.trans.zBase + D.trans.espigaL === D.tubo.zTop && D.trans.espigaL === 18);
check('tórica de transición dentro de la garganta', byId('torica_cabezal').pos[2] === D.trans.zBase + 6.5);
check('prensaestopas transición remata en el piso de la cavidad', byId('prensa_trans').pos[2] + 27 === D.trans.zBase + 48);
check('pilar SCH40 1 1/2": OD 48.3, pared 3.68, ID 40.9', D.pilar.OD === 48.3 && Math.abs(D.pilar.OD - 2 * D.pilar.pared - D.pilar.ID) < 0.05);
check('pilar engrana 20 en la transición', D.pilar.z0 === D.trans.zBase + 74 - D.pilar.engage);
check('pilar remata dentro de la rosca del cabezal', D.pilar.z1 > D.acople.zBase && D.pilar.z1 <= D.acople.zBase + D.acople.roscaProf);
check('brida del acople al ras del piso del gabinete', D.acople.zBase + D.acople.cuboH + D.acople.bridaH === D.gab.zPiso);
check('prensaestopas: rosca M16 remata 4 sobre el piso', byId('prensa').pos[2] + 27 === D.gab.zPiso + 7);
check('contratuerca sobre el piso interior', byId('contratuerca').pos[2] === D.gab.zPiso + 3);
check('cabezal elevado ~0.9 m sobre NPT (estado del arte)', D.gab.zPiso === 924 && D.pilar.L === 810);

console.log('— CSG de las 35 piezas (volumen > 0, sin NaN) —');
const boxAll = new THREE.Box3();
const boxes = {};
for (const part of doc.parts) {
  const geom = buildPartGeometry(part);
  const v = volume(geom);
  check(`${part.name} — malla válida`, v > 0 && !hasNaN(geom), `vol=${v.toFixed(0)}`);
  geom.computeBoundingBox();
  const wb = geom.boundingBox.clone().applyMatrix4(partMatrix(part));
  boxes[part.id] = wb;
  boxAll.union(wb);
}

console.log('— Envolventes de sanidad —');
check('sonda alcanza −728 (ápice punta)', Math.abs(boxAll.min.z - -728) < 1, `${boxAll.min.z}`);
check('electrónica bajo el borde de la base',
  ['pcb', 'baterias', 'bms', 'borne_bus', 'desecante'].every(id => boxes[id].max.z < dims.Z_TAPA + 1e-6));
check('electrónica dentro de la cavidad 174×124',
  ['pcb', 'baterias', 'bms', 'borne_bus', 'desecante', 'portapilas'].every(id =>
    boxes[id].min.x > -87 + 2.9 && boxes[id].max.x < 87 - 2.9 &&
    boxes[id].min.y > -65 + 2.9 && boxes[id].max.y < 65 - 2.9)); // paredes 3
check('panel solar sobre la tapa e inclinado',
  boxes.panel.min.z > dims.Z_LID_TOP - 1 && (boxes.panel.max.z - boxes.panel.min.z) > 40);
check('hoja sensor 1 llega a r≈192 en +X', Math.abs(boxes.sensor1.max.x - 192) < 1.5, `${boxes.sensor1.max.x}`);
check('hoja sensor 2 girada 120° (x<0, y>0)', boxes.sensor2.min.x < -80 && boxes.sensor2.max.y > 140);
check('collar apoyado en NPT (z 0–13)', Math.abs(boxes.collar.min.z) < 0.5 && Math.abs(boxes.collar.max.z - 13) < 0.5);
check('antena remata sobre el panel (>1150)', boxes.antena.max.z > 1150 && boxes.antena.max.z > boxes.panel.max.z + 100,
  `${boxes.antena.max.z.toFixed(0)} vs panel ${boxes.panel.max.z.toFixed(0)}`);
check('antena no invade el vano del panel (x>92)', boxes.antena.min.x > 90 - 1e-6);
// pasacable del panel bajo la sombra del propio panel (protegido de lluvia)
{
  const th = D.panel.angulo * Math.PI / 180;
  const zPanelSobrePrensa = 1010.2 - (-60) * Math.sin(th);   // plano del panel en x=-60
  check('prensaestopas de panel bajo el panel', boxes.prensa_panel.max.z < zPanelSobrePrensa - 5,
    `${boxes.prensa_panel.max.z.toFixed(0)} vs panel ${zPanelSobrePrensa.toFixed(0)}`);
}
check('pilar de 86 a 896 (hilo en ambas puntas embebido)', Math.abs(boxes.pilar.min.z - 86) < 0.5 && Math.abs(boxes.pilar.max.z - 896) < 0.5);

console.log(`\n${pass} ✔ · ${fail} ✘`);
process.exit(fail ? 1 : 0);
