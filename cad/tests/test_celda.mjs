// Pruebas de la CELDA TRIPLE omnidireccional. Comprueban lo que decide si el
// diseño sirve —que pueda trasladar Y girar el bulto, que el motor no cargue el
// peso y que el tren quepa— y no solo que el código corra.
//
//   cd cad && node tests/test_celda.mjs

import { Ensamble } from '../ensambles/nbt90/lib.mjs';
import { P, velocidad, ttParNm } from '../ensambles/celda/params.mjs';
import { celda, tren, radioVertice, radioInterno, anguloUnidad, geometriaPlaca }
  from '../ensambles/celda/celda.mjs';

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  ✔ ${n}${d ? ` — ${d}` : ''}`); }
  else { fail++; console.log(`  ✘ ${n} ${d}`); }
};

console.log('— cinemática de la celda —');
// Con los ejes RADIALES la rodadura es tangencial y la matriz es invertible; con
// los ejes tangenciales la columna de ω se anula y la celda no puede girar nada.
const matriz = (R, ejeRadial) => {
  const M = [];
  for (let i = 0; i < 3; i++) {
    const th = anguloUnidad(i);
    const u = ejeRadial ? [-Math.sin(th), Math.cos(th)] : [Math.cos(th), Math.sin(th)];
    const p = [R * Math.cos(th), R * Math.sin(th)];
    M.push([u[0], u[1], u[0] * -p[1] + u[1] * p[0]]);
  }
  return M;
};
const det = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
  - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
  + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

check('con ejes radiales la celda controla (vx, vy, ω)', Math.abs(det(matriz(P.R, true))) > 1,
  `|det| = ${Math.abs(det(matriz(P.R, true))).toFixed(1)}`);
check('con ejes tangenciales NO puede girar el bulto', Math.abs(det(matriz(P.R, false))) < 1e-9,
  'matriz singular');

// Resolver un caso concreto: traslación pura en +X sin giro debe pedir a las tres
// ruedas velocidades que sumen cero (ninguna empuja a girar).
const M = matriz(P.R, true);
const vRuedas = M.map(f => f[0] * 1 + f[1] * 0 + f[2] * 0);
check('traslación pura no induce giro', Math.abs(vRuedas.reduce((a, b) => a + b, 0)) < 1e-9,
  `Σv = ${vRuedas.reduce((a, b) => a + b, 0).toExponential(1)}`);

console.log('— tren motriz —');
const T = tren();
check('la rueda va ENTRE los dos rodamientos (el motor no carga el peso)',
  T.tRodL + P.rodW <= -T.hw && T.tRodM >= T.hw, `rodamientos en t = ${T.tRodL} y ${T.tRodM}`);
check('el bloque no muerde la rueda', T.tRodM - (P.bloqueEsp - P.rodW) / 2 > T.hw,
  `holgura ${(T.tRodM - (P.bloqueEsp - P.rodW) / 2 - T.hw).toFixed(1)} mm`);
check('los dos ejes no se tocan dentro del acople', T.tEjeTTpunta > T.tEje1,
  `${(T.tEjeTTpunta - T.tEje1).toFixed(1)} mm de aire`);
check('el eje del TT no invade el alojamiento del eje Ø4',
  T.tEje1 - T.tAcople0 <= P.acopleLargo && T.tCaraRed > T.tAcople0);

console.log('— geometría de celda —');
check('el tren no cruza el centro de la celda', radioInterno() > 6,
  `extremo interno a r = ${radioInterno().toFixed(1)} mm`);
check('el hexágono contiene todo el tren', radioVertice() >= radioInterno() + 10);
const G = geometriaPlaca();
const rr = P.ruedaDia / 2;
const semi = Math.sqrt(rr * rr - Math.pow(G.zBot + rr, 2));
check('la ranura libera la rueda en la cara inferior de la placa', G.largoRanura > 2 * semi,
  `ranura ${G.largoRanura} > cuerda ${(2 * semi).toFixed(1)} mm`);
check('la ranura libera el ancho de la rueda', G.anchoRanura > P.ruedaAncho,
  `${G.anchoRanura} > ${P.ruedaAncho} mm`);
check('la rueda asoma sobre la placa', P.ruedaSobresale > 0 && P.ruedaSobresale < rr);

console.log('— función —');
const v = velocidad();
check('velocidad de transporte a 6 V', v > 0.45 && v < 0.55, `${v.toFixed(2)} m/s`);
const F = ttParNm() * 0.3 / (P.ruedaDia / 2000);
check('tracción continua por rueda', F > 0.9 && F < 1.1, `${F.toFixed(2)} N`);
// Un bulto apoyado en 6 ruedas contra rodadura (8 % del peso) + 0.5 m/s²
const maxKg = (6 * F) / (0.08 * 9.81 + 0.5);
check('mueve al menos 3 kg apoyados en 6 ruedas', maxKg >= 3, `${maxKg.toFixed(1)} kg`);

console.log('— ensamble —');
const E = new Ensamble();
const info = celda(E);
check('la celda tiene 3 unidades y una placa', info.unidades.length === 3);
check('las tres unidades están a 120°',
  Math.abs(anguloUnidad(1) - anguloUnidad(0) - 2 * Math.PI / 3) < 1e-9);
check('toda pieza declara procedencia de fabricación',
  E.parts.every(p => p.comprada || p.impresa || p.fabricada || p.hardware),
  `${E.parts.length} piezas`);
const compradas = E.parts.filter(p => p.comprada).length;
check('9 componentes comprados por celda ⇒ 27 en el módulo', compradas === 9,
  `${compradas} × ${P.nCeldas} celdas`);

console.log(`\n${pass} OK, ${fail} fallas`);
if (fail) process.exit(1);
