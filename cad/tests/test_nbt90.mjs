#!/usr/bin/env node
// test_nbt90.mjs — verifica el ensamble emitido por gen_nbt90.mjs:
// invariantes de función, de fabricación y de armado de la transferencia 90°
// de rodillos emergentes. Corre sobre el JSON ya generado.
//
//   node cad/ensambles/nbt90/gen_nbt90.mjs && node cad/tests/test_nbt90.mjs
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import { bboxPieza, solapan } from '../ensambles/nbt90/lib.mjs';
import { P } from '../ensambles/nbt90/params.mjs';

const doc = JSON.parse(readFileSync('ensambles/nbt90/narrow_belt_transfer_90.json', 'utf8'));
const V = doc.meta.verificaciones;
const partes = doc.parts;
const propias = partes.filter(p => !p.contexto);
const nombre = (re) => partes.filter(p => re.test(p.name));

let pass = 0, fail = 0;
const ok = (c, msg) => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${msg}`); };
const r2 = (v) => Math.round(v * 100) / 100;

console.log('— Documento —');
ok(doc.format === 'foto3d-cad' && doc.version === 1, 'formato foto3d-cad v1');
ok(doc.meta.capa === 'user', 'declarado capa `user` (diseño, no medición)');
ok(/0\.6320 mm\/px/.test(doc.meta.origen), 'la escala usada queda escrita en el origen del documento');
ok(propias.length >= 60, `${propias.length} piezas propias (sin contar el contexto)`);

console.log('— Función: pop-up —');
ok(Math.abs(V.emergencia - P.emerge) < 0.05,
  `el rodillo emerge ${V.emergencia} mm = 1/4" sobre el plano de bandas`);
ok(V.retraccion > 2, `retraído baja ${V.retraccion} mm bajo el plano de bandas (libra el producto)`);
ok(Math.abs(V.carrera - 10) < 0.01, 'carrera de 10 mm = 0.394" (cota del manual)');
ok(Math.abs(V.emergencia + V.retraccion - V.carrera) < 0.05,
  'emergencia + retracción = carrera (el mecanismo cierra)');

console.log('— Geometría: rodillos y bandas —');
ok(V.rodillos === P.nRodillos && V.bandas === P.nBandas,
  `${V.rodillos} rodillos y ${V.bandas} bandas angostas intercaladas`);
ok(Math.abs(V.paso - 76.2) < 0.01, 'paso de 3" (76.2 mm) entre rodillos y entre bandas');
ok(V.holguraRodilloRegleta > 2,
  `holgura de ${V.holguraRodilloRegleta} mm entre el rodillo y la regleta vecina`);
ok(Math.abs(V.BR - 457.2) < 0.5, 'BR de 18" entre almas de los canales laterales');

console.log('— Transmisión —');
ok(V.largoBanda > 500, `banda del serpentín de ${V.largoBanda} mm de desarrollo`);
ok(V.envolventeRodillo >= 60, `envolvente de ${V.envolventeRodillo}° sobre cada rodillo (arrastre por fricción)`);
const vel = Math.PI * P.rodDia * P.motorRpm / 60000;
ok(vel > 0.3 && vel < 1.5, `velocidad periférica ${vel.toFixed(2)} m/s con ${P.motorRpm} rpm`);

console.log('— Elevación —');
ok(V.factorSeguridad >= 1.5, `factor de seguridad del actuador ${V.factorSeguridad}`);
ok(V.empujeN > 0, `empuje disponible ${V.empujeN} N`);

console.log('— Módulos identificados —');
ok(V.movil >= 10 && V.fijo >= 5, `${V.movil} piezas MÓVIL y ${V.fijo} FIJO`);
ok(propias.every(p => /^(FIJO|MÓVIL)/.test(p.name)),
  'toda pieza propia declara si sube o queda fija');
ok(V.tornilleria >= 20, `${V.tornilleria} piezas de tornillería normalizada`);

console.log('— Armado: nada flota, nada choca —');
// El solape de CAJAS no prueba interferencia: un perfil en U es hueco y su caja
// envolvente incluye el vacío interior. Y el chequeo por MALLAS tampoco decide:
// el motor BSP da volumen fantasma con sólidos no convexos. La verificación que
// manda es la de sólidos B-rep exactos (ensambles/nbt90/interferencias_brep.py).
let inf = null;
try { inf = JSON.parse(readFileSync('ensambles/nbt90/interferencias_brep.json', 'utf8')); } catch { /* sin informe */ }
ok(inf !== null, 'existe el informe de interferencia exacta (interferencias_brep.py)');
if (inf) {
  // Convención declarada: las piezas COMPRADAS se modelan macizas, sin sus
  // taladros roscados, así que su propia tornillería las penetra. No es un
  // choque de diseño; cualquier otro par sí lo es.
  const flag = new Map(partes.map(p => [p.name, { hw: !!p.hardware, comp: !!p.componente }]));
  const convencion = (d) => {
    const a = flag.get(d.a) || {}, b = flag.get(d.b) || {};
    return (a.hw && b.comp) || (b.hw && a.comp);
  };
  const reales = (inf.detalle || []).filter(d => !convencion(d));
  ok(reales.length === 0,
    `${reales.length} interferencias de diseño sobre ${inf.pares_candidatos} pares candidatos `
    + `(${(inf.detalle || []).length - reales.length} son tornillería dentro de piezas compradas, convención declarada)`);
  for (const d of reales.slice(0, 8)) console.log(`      ${d.cm3} cm³  ${d.a} ⨯ ${d.b}`);
}
const contacto = JSON.parse(readFileSync('ensambles/nbt90/interferencias.json', 'utf8') || '{}').contacto_popup;
ok(contacto?.ok === true,
  `la mesa guía apoya en el conjunto móvil (separación ${contacto?.separacion_mm} mm)`);
const sueltas = propias.filter(p => {
  const b = bboxPieza(p);
  return b.lo[2] > P.altoTotal + 45 || b.hi[2] < -1;
});
ok(sueltas.length === 0, 'ninguna pieza queda fuera del volumen del equipo');

console.log('— Fabricación —');
const chapas = propias.filter(p => p.chapa);
ok(chapas.length >= 4, `${chapas.length} piezas declaradas como chapa plegada (llevan desarrollo)`);
// una placa PLANA (fibra de 2 puntos = sin pliegue) no necesita radio; la
// exigencia de radio ≥ espesor solo aplica a las que sí se pliegan.
const plegadas = chapas.filter(p => (p.chapa.fibra?.length ?? 0) >= 3);
ok(chapas.every(p => p.chapa.t >= 1.5) && plegadas.every(p => p.chapa.radio >= p.chapa.t * 0.99),
  `las ${chapas.length} chapas tienen espesor de calibre y las ${plegadas.length} plegadas, radio ≥ espesor`);
const compradas = propias.filter(p => p.hardware || p.componente);
ok(compradas.length >= 20, `${compradas.length} piezas compradas identificadas para la lista de materiales`);

console.log('— Malla: todas las piezas construyen —');
const volumen = (g) => {
  const pos = g.attributes.position; if (!pos) return 0;
  let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return v;
};
let malas = 0, volTot = 0;
for (const p of partes) {
  try {
    const g = buildPartGeometry(p);
    const pos = g.attributes.position;
    if (!pos || pos.count < 3) { console.log(`      sin malla: ${p.name}`); malas++; continue; }
    if ([...pos.array].some(x => !Number.isFinite(x))) { console.log(`      NaN: ${p.name}`); malas++; continue; }
    const v = volumen(g);
    if (v <= 0) { console.log(`      volumen ${r2(v)}: ${p.name}`); malas++; continue; }
    volTot += v;
  } catch (e) { console.log(`      error: ${p.name} — ${e.message}`); malas++; }
}
ok(malas === 0, `las ${partes.length} piezas construyen malla cerrada (${(volTot / 1e6).toFixed(1)} dm³ de material)`);

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
