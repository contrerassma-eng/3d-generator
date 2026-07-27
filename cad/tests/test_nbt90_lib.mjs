#!/usr/bin/env node
// test_nbt90_lib.mjs — verifica las primitivas de cad/ensambles/nbt90/lib.mjs:
// cada una debe generar geometría cerrada, con volumen > 0 y sin NaN.
//   node cad/tests/test_nbt90_lib.mjs
import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import {
  Ensamble, box, cyl, hole, sketchXZ, sketchYZ, sketchXY, revolve, rectR, colisa, hexPts,
  seccionChapa, desarrollo, bandaFaces, largoBanda, envolventes, pernoHex, tuercaHex, golilla,
  anilloRet, rodamiento, polea, rodillo, bboxPieza, solapan, COL,
} from '../ensambles/nbt90/lib.mjs';

let pass = 0, fail = 0;
const volumen = (g) => {
  const p = g.attributes.position; if (!p) return 0;
  let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return v;
};
const hasNaN = (g) => (g.attributes.position?.array || []).some(x => !Number.isFinite(x));
const ok = (cond, msg) => { cond ? pass++ : fail++; console.log(`  ${cond ? '✔' : '✘'} ${msg}`); };
function vol(part, min = 1) {
  const g = buildPartGeometry(part);
  const v = volumen(g), nan = hasNaN(g);
  ok(v > min && !nan, `${part.name}: vol=${(v / 1000).toFixed(2)} cm³${nan ? ' ¡NaN!' : ''}`);
  return v;
}

console.log('— Primitivas básicas —');
{
  const E = new Ensamble();
  vol(E.addPart('Caja', COL.chapa, [0, 0, 0], [box('caja', [0, 0, 0], 40, 30, 10)]));
  vol(E.addPart('Cilindro con agujero', COL.acero, [0, 0, 0], [
    cyl('cil', [0, 0, 0], [0, 0, 1], 30, 20), hole('bore', [0, 0, -1], [0, 0, 1], 10)]));
  vol(E.addPart('Boceto XZ', COL.chapa, [0, 0, 0], [sketchXZ('perfil', -10, rectR(-20, 0, 20, 30, 4), 6)]));
  vol(E.addPart('Boceto YZ', COL.chapa, [0, 0, 0], [sketchYZ('perfil', 10, rectR(-20, 0, 20, 30, 4), 6)]));
  vol(E.addPart('Boceto XY', COL.chapa, [0, 0, 0], [sketchXY('placa', 0, rectR(-30, -20, 30, 20, 5), 3)]));
  vol(E.addPart('Colisa en placa', COL.chapa, [0, 0, 0], [
    sketchXY('placa', 0, rectR(-40, -20, 40, 20, 5), 4),
    sketchXY('colisa', -1, colisa(0, 0, 30, 9), 6, 'cut')]));
  vol(E.addPart('Hexágono', COL.tornillo, [0, 0, 0], [sketchXY('hex', 0, hexPts(0, 0, 17), 6)]));
}

console.log('— Revolución (poleas, rodamientos, anillos) —');
{
  const E = new Ensamble();
  vol(E.addPart('Revolución simple', COL.acero, [0, 0, 0], [
    revolve('disco', [0, 0, 0], 'z', [[0, 10], [0, 40], [8, 40], [8, 10]])]));
  vol(polea(E, { nombre: 'Polea plana Ø60', at: [0, 0, 0], dir: [0, 1, 0], od: 60, ancho: 20, bore: 16, prof: 2 }));
  vol(polea(E, { nombre: 'Polea V Ø80', at: [0, 0, 0], dir: [1, 0, 0], od: 80, ancho: 16, bore: 16, garganta: 'V', prof: 5 }));
  vol(polea(E, { nombre: 'Polea redonda Ø50', at: [0, 0, 0], dir: [0, 0, 1], od: 50, ancho: 14, bore: 12, garganta: 'redonda', prof: 3, cuboLargo: 10 }));
  vol(rodamiento(E, { nombre: '6203', at: [0, 0, 0], dir: [0, 1, 0], bore: 17, od: 40, w: 12 }));
  vol(anilloRet(E, { nombre: 'eje motriz', at: [0, 0, 0], dir: [1, 0, 0], eje: 16 }), 10);
}

console.log('— Tornillería —');
{
  const E = new Ensamble();
  vol(pernoHex(E, { nombre: '3/8-16 × 25', at: [0, 0, 0], dir: [0, 0, -1], dia: 9.5, largo: 25 }));
  vol(tuercaHex(E, { nombre: '3/8-16', at: [0, 0, 0], dir: [0, 0, 1], dia: 9.5 }));
  vol(golilla(E, { nombre: '3/8', at: [0, 0, 0], dir: [0, 0, 1], dia: 9.5 }), 100);
}

console.log('— Chapa plegada (sección + desarrollo) —');
{
  const E = new Ensamble();
  const fibra = [[0, 0], [0, 60], [40, 60], [40, 10]];          // canal en C
  const sec = seccionChapa(fibra, 2.7, 2.7);
  vol(E.addPart('Canal formado', COL.chapa, [0, 0, 0], [sketchXZ('sección', -100, sec, 200)]));
  const dev = desarrollo(fibra, 2.7);
  ok(Math.abs(dev.largo - 146.0) < 0.6, `desarrollo del canal = ${dev.largo} mm (esperado 146.0 por fibra media)`);
  ok(dev.plegados.length === 2 && Math.abs(dev.plegados[0].ang - 90) < 1e-6, `2 pliegues a 90° detectados`);
}

console.log('— Bandas (tangentes y arcos) —');
{
  const seq = [{ c: [0, 0], r: 30, s: 1 }, { c: [200, 0], r: 30, s: 1 }];
  const { outer, inner } = bandaFaces(seq, 3);
  ok(outer.length > 20 && inner.length > 20, `banda de 2 poleas: ${outer.length}/${inner.length} puntos`);
  const L = largoBanda(seq, 3);
  const Lteo = 2 * 200 + Math.PI * (60 + 3);
  ok(Math.abs(L - Lteo) < 1.5, `largo desarrollado ${L} ≈ teórico ${Lteo.toFixed(1)} mm`);
  const env = envolventes(seq, 3);
  ok(Math.abs(env[0] - 180) < 0.5 && Math.abs(env[1] - 180) < 0.5, `envolvente 180°/180° en poleas iguales`);
  const seq3 = [{ c: [0, 0], r: 30, s: 1 }, { c: [300, 0], r: 30, s: 1 }, { c: [150, -60], r: 20, s: -1 }];
  const b3 = bandaFaces(seq3, 3);
  ok(b3.outer.length > 30, `banda con tensor exterior (3 elementos): ${b3.outer.length} puntos`);
  const E = new Ensamble();
  vol(E.addPart('Banda plana 25×3', COL.banda, [0, 0, 0], [
    sketchYZ('cara ext', 12.5, b3.outer, 25), sketchYZ('vaciado', -12.5, b3.inner, 25, 'cut')]));
  let lanzo = false;
  try { bandaFaces([{ c: [0, 0], r: 30, s: 1 }, { c: [20, 0], r: 30, s: -1 }], 3); } catch { lanzo = true; }
  ok(lanzo, 'una configuración sin tangente lanza error (no se emite geometría imposible)');
}

console.log('— Rodillo completo —');
{
  const E = new Ensamble();
  const ps = rodillo(E, { nombre: 'Rodillo 1.9"', at: [0, 0, 0], dir: [1, 0, 0], od: 48.3, cara: 400,
    ejeD: 11.1, rodam: { bore: 11.1, od: 28, w: 8 } });
  ok(ps.length === 4, `rodillo = ${ps.length} piezas (tubo + eje + 2 rodamientos)`);
  for (const p of ps) vol(p);
}

console.log('— AABB e interferencias —');
{
  const E = new Ensamble();
  const a = E.addPart('A', COL.chapa, [0, 0, 0], [box('a', [0, 0, 0], 20, 20, 20)]);
  const b = E.addPart('B', COL.chapa, [100, 0, 0], [box('b', [100, 0, 0], 20, 20, 20)]);
  const c = E.addPart('C', COL.chapa, [5, 0, 0], [box('c', [5, 0, 0], 20, 20, 20)]);
  ok(!solapan(bboxPieza(a), bboxPieza(b)), 'piezas separadas no solapan');
  ok(solapan(bboxPieza(a), bboxPieza(c)), 'piezas encimadas sí solapan');
}

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
