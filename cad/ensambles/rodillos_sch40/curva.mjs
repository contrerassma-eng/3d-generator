#!/usr/bin/env node
// curva.mjs — TRAZADO DE LA CURVA a partir del rodillo cónico.
//
//   node ensambles/rodillos_sch40/curva.mjs [gradosCurva] [pasoInterior] [WT] [c]
//   node ensambles/rodillos_sch40/curva.mjs 90 100
//   node ensambles/rodillos_sch40/curva.mjs 45 120 445     (variante Damon WT=445)
//
// LA REGLA: el vértice del cono tiene que caer EN EL CENTRO DE LA CURVA. Sólo
// así cada punto del rodillo tiene velocidad proporcional a su radio y el bulto
// gira sin patinar. Damon lo escribe como R = D/K − c, con K = 2·tan(θ/2).
//
// Consecuencia práctica: el rodillo NO se adapta a cualquier radio. Elegido el
// rodillo (D1 y la conicidad), el radio de la curva queda determinado.
import { P } from './params.mjs';

const grados = +(process.argv[2] ?? 90);
const pasoInt = +(process.argv[3] ?? 100);
const WT = +(process.argv[4] ?? 507);          // largo cónico (diseño 507 · Damon 445)
const c = +(process.argv[5] ?? 5);             // holgura testa menor ↔ larguero interior

const k = P.camisa.k, D1 = P.camisa.D1;
const r2 = (v) => Math.round(v * 100) / 100;

const semiAng = Math.atan(k / 2) * 180 / Math.PI;
const Ri = r2(D1 / k - c);                     // radio interior de la curva
const Ro = r2(Ri + WT);                        // radio exterior
const D2 = r2(D1 + k * WT);
const arcoInt = r2(Ri * grados * Math.PI / 180);
const arcoExt = r2(Ro * grados * Math.PI / 180);
const n = Math.ceil(arcoInt / pasoInt);
const pasoExt = r2(pasoInt * Ro / Ri);
const desnivel = r2(P.EL * Math.tan(semiAng * Math.PI / 180));

const l = (s = '') => console.log(s);
l(`CURVA DE ${grados}° CON RODILLO CÓNICO  ·  D1 = Ø${D1}  ·  conicidad ${r2(2 * semiAng)}° (k = ${k})`);
l('='.repeat(78));
l();
l('GEOMETRÍA — la fija el rodillo, no se elige');
l(`  radio INTERIOR   R = D1/k − c = ${r2(D1 / k)} − ${c} = ${Ri} mm`);
l(`  radio EXTERIOR   R + WT       = ${Ro} mm`);
l(`  largo cónico     WT           = ${WT} mm   → Ø${D1} en el interior, Ø${D2} en el exterior`);
l(`  semiángulo del cono           = ${r2(semiAng)}°`);
l();
l('BASTIDOR');
l(`  el larguero INTERIOR va ${desnivel} mm MÁS ALTO que el exterior`);
l(`  (el eje se inclina ${r2(semiAng)}° para que la generatriz superior del cono quede HORIZONTAL;`);
l(`   sobre la luz entre largueros de ${P.EL} mm eso son ${desnivel} mm de desnivel)`);
l(`  ranura del larguero: ${P.eje.entrecaras + 0.2} H13 para las caras planas del eje Ø${P.eje.d}`);
l();
l('PASO — se abre hacia afuera (Ta = Ti · Ra/Ri)');
l(`  arco interior  ${arcoInt} mm   ·  arco exterior  ${arcoExt} mm`);
l(`  paso interior  ${pasoInt} mm   ·  paso exterior  ${pasoExt} mm`);
l(`  → ${n} rodillos en los ${grados}°`);
l();
l('COMPROBACIÓN (si esto no da, el bulto patina)');
l(`  D1/Ri = ${r2(D1 / Ri * 1000) / 1000}  debe ser igual a  D2/Ro = ${r2(D2 / Ro * 1000) / 1000}`);
l();
l('SI TU CURVA NECESITA OTRO RADIO');
l(`  el semiángulo NO se toca (1.8° es lo que hace intercambiables las camisas).`);
l(`  Se cambia D1:   D1 = 2·(R + c)·tan(${r2(semiAng)}°)`);
for (const R of [600, 700, 800, 880, 1000, 1200]) {
  l(`     R = ${String(R).padStart(4)} mm  →  D1 = Ø${r2(2 * (R + c) * Math.tan(semiAng * Math.PI / 180))}`);
}
