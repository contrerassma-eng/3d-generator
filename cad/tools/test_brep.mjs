import * as THREE from 'three';
import { nuevoRegistro, caja, cilindro, idsDe, fichaDe, cobertura, rangoAxial, siluetaCilindro, SUP } from '../js/brep.mjs';
import { geomToCSG, csgToGeom } from '../js/csg.js';

const reg = nuevoRegistro();
// placa 100×60×6 con un barreno Ø10 pasante en el centro
const placa = caja(reg, 100, 60, 6, [0, 0, 0], { de: 'placa' });
const broca = cilindro(reg, [0, 0, -10], [0, 0, 1], 5, 20, 48, { de: 'barreno Ø10' });

console.log('caras declaradas:', reg.caras.length);
for (const c of reg.caras) console.log('   ', c.id, c.tipo, c.tipo === SUP.CILINDRO ? `r=${c.r}` : `d=${c.d.toFixed(1)}`, c.de || '');

const res = csgToGeom(geomToCSG(placa).subtract(geomToCSG(broca)));
const cob = cobertura(res);
console.log(`\nDESPUÉS DE LA BOOLEANA: ${cob.total} triángulos · con ficha ${cob.con} (${cob.pct} %)`);

const ids = idsDe(res);
const cuenta = new Map();
for (const v of ids) cuenta.set(v, (cuenta.get(v) || 0) + 1);
for (const [id, n] of [...cuenta].sort((a, b) => b[1] - a[1])) {
  const f = fichaDe(reg, id);
  console.log(`   cara ${id}: ${n} triángulos — ${f ? f.tipo : 'SIN FICHA'} ${f && f.tipo === SUP.CILINDRO ? 'Ø' + 2 * f.r : ''} ${f?.de || ''}`);
}

// la pared del barreno tiene que ser UNA cara cilíndrica, no 48 caritas
const idCil = reg.caras.find(c => c.tipo === SUP.CILINDRO).id;
const f = fichaDe(reg, idCil);
console.log(`\nel barreno: Ø${2 * f.r} eje [${f.dir}] · rango axial`, rangoAxial(res, ids, idCil, f));
console.log('silueta vista Y:', JSON.stringify(siluetaCilindro(f, [0, 1, 0], -3, 3)));

// masa: el registro NO puede alterar el sólido (G1)
const vol = (g) => { const p = g.attributes.position.array; let V = 0;
  for (let i = 0; i < p.length; i += 9) V += (p[i]*(p[i+4]*p[i+8]-p[i+5]*p[i+7]) - p[i+1]*(p[i+3]*p[i+8]-p[i+5]*p[i+6]) + p[i+2]*(p[i+3]*p[i+7]-p[i+4]*p[i+6]))/6;
  return Math.abs(V); };
const teor = 100*60*6 - Math.PI*25*6;
console.log(`\nvolumen: ${vol(res).toFixed(0)} mm³ · teórico ${teor.toFixed(0)} mm³ · error ${(100*Math.abs(vol(res)-teor)/teor).toFixed(2)} %`);
