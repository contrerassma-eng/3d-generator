// celda.mjs — CELDA TRIPLE OMNIDIRECCIONAL: 3 unidades motrices a 120° sobre una
// placa hexagonal. Cada unidad es rueda omni Ø48 + eje Ø4 sobre dos rodamientos
// 624ZZ + acople + motor TT, y el motor NO carga el peso del bulto: el eje va
// apoyado y el motor solo entrega par.
//
// Sistema de coordenadas (CONTRATO.md): Z = 0 en el plano de transporte,
// X/Y horizontales con origen en el centro de la celda.
//
// El eje de cada rueda es RADIAL ⇒ su dirección de rodadura es TANGENCIAL. Es la
// disposición «kiwi», y no es una preferencia estética: con los ejes tangenciales
// (rodadura radial) la columna de ω del sistema se anula y la celda pierde la
// capacidad de girar el bulto. Demostración en el gate (`gen_celda.mjs`).

import { Ensamble, box, cyl, hole, rodamiento, hexPts, sketchXY, COL, r2, normal3 } from '../nbt90/lib.mjs';
import { P } from './params.mjs';
import { ruedaOmni, motorTT, bloqueRodamiento, acopleTT, soporteMotor, discoEncoder, sensorLM393 }
  from './piezas.mjs';

/** Cuaternión de giro `a` radianes sobre Z. */
const qz = (a) => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];

/** Ángulo de la unidad i: la rueda 0 apunta a +Y y las otras a 120° y 240°. */
export const anguloUnidad = (i) => Math.PI / 2 + (2 * Math.PI / 3) * i;

/**
 * Posiciones a lo largo del eje de la rueda, en la coordenada `t`:
 *   t = 0 en el centro de la rueda; t creciente hacia el MOTOR.
 * Devuelve además los extremos, que son los que fijan el tamaño de la celda.
 */
export function tren() {
  const hw = P.ruedaAncho / 2;
  const g = P.holguraRuedaRod;
  const semiBloque = (P.bloqueEsp - P.rodW) / 2;

  // rodamiento del lado del motor y del lado libre (simétricos respecto a la rueda)
  const tRodM = hw + g;                      // inicio del rodamiento lado motor
  const tRodL = -(hw + g + P.rodW);          // inicio del rodamiento lado libre
  const tBloqueM1 = tRodM + P.rodW + semiBloque;   // cara externa del bloque lado motor
  const tBloqueL0 = tRodL - semiBloque;            // cara externa del bloque lado libre

  // acople impreso TT(5.5 plano) → eje Ø4
  const tAcople0 = tBloqueM1 + 1;
  const tAcople1 = tAcople0 + P.acopleLargo;

  // Dentro del acople se encuentran los DOS ejes, sin tocarse: el Ø4 de la rueda
  // entra por el lado de la rueda y el 5.5 plano del TT por el otro.
  const tEje1 = tAcople0 + P.acopleEncaje;              // hasta dónde llega el eje Ø4
  const tEjeTTpunta = tEje1 + P.holguraEntreEjes;       // donde empieza el eje del TT
  const tCaraRed = tEjeTTpunta + P.ttEjeSale;           // cara de la reductora
  const tRedFin = tCaraRed + P.ttAncho;

  // eje Ø4 de la rueda: desde pasado el rodamiento libre hasta dentro del acople
  const tEje0 = tBloqueL0 - 3;

  // encoder sobre el eje de la RUEDA, en el extremo libre: mide la salida real,
  // no la del motor, así que es inmune a que el acople patine.
  const tDisco = tEje0 - 2;
  const tSensorFin = tDisco - 5;             // el PCB del sensor abraza el disco

  return {
    hw, tRodM, tRodL, tBloqueM1, tBloqueL0, tAcople0, tAcople1,
    tEjeTTpunta, tCaraRed, tRedFin, tEje0, tEje1, tDisco, tSensorFin,
    // extremos del tren (los que definen el hexágono)
    tMax: tRedFin + P.soporteEsp,   // hacia el motor, incluido su soporte
    tMin: tSensorFin,       // hacia el lado libre
  };
}

/** Radios extremos del tren. Todo punto del tren está en x(t) = R + s·t. */
function extremos(R, dentro) {
  const T = tren();
  const s = dentro ? -1 : 1;                 // el motor va hacia el centro o hacia afuera
  const a = R + s * T.tMax, b = R + s * T.tMin;
  return { externo: Math.max(a, b), interno: Math.min(a, b) };
}

/** Radio del vértice del hexágono necesario para contener el tren. */
export function radioVertice(R = P.R, dentro = P.motorDentro) {
  return extremos(R, dentro).externo + P.placaHolgura;
}

/** Radio al que queda el extremo más interno del tren (el que limita el paso). */
export function radioInterno(R = P.R, dentro = P.motorDentro) {
  return extremos(R, dentro).interno;
}

/**
 * Una unidad motriz. Las features se escriben en el marco LOCAL de la unidad
 * (X = radial hacia afuera, Y = tangencial = rodadura, Z = arriba) y la pieza se
 * coloca con el cuaternión de su ángulo: así toda la unidad gira de una pieza.
 */
function unidadMotriz(E, i, R, dentro) {
  const th = anguloUnidad(i);
  const q = qz(th);
  const T = tren();
  const s = dentro ? -1 : 1;
  const zEje = -P.ruedaDia / 2;              // el tope de la rueda toca Z = 0
  const x = (t) => R + s * t;                // coordenada radial local de un `t`
  const pos = (t, y = 0, z = zEje) => [x(t), y, z];
  const ejeX = [s, 0, 0];                    // dirección del eje, hacia el motor
  const cap = `U${i + 1} · `;
  const put = (nombre, color, features, extra = {}) =>
    E.addPart(cap + nombre, color, [0, 0, 0], features, { pos: [0, 0, 0], quat: q, ...extra });

  const zPlaca = -P.ruedaSobresale - P.placaEsp;   // cara inferior de la placa

  // --- rueda omni Ø48 (COMPRADA) --------------------------------------------
  // Geometría real: cubo, dos platos y 16 rodillos abarrilados. El perfil del
  // rodillo apoya sobre el círculo de Ø48, no es un cilindro.
  const rue = ruedaOmni(`Rueda omni Ø${P.ruedaDia} × ${P.ruedaAncho}`, pos(0), ejeX);
  put(rue.nombre, rue.color, rue.features,
    { comprada: true, componente: 'rueda_omni_48', masaG: P.ruedaMasaG });

  // --- eje Ø4 (FABRICADO: corte de barra) -----------------------------------
  put(`Eje Ø${P.ejeDia} × ${r2(T.tEje1 - T.tEje0)}`, COL.inox, [
    cyl(`Barra Ø${P.ejeDia}`, pos(T.tEje0), ejeX, P.ejeDia, T.tEje1 - T.tEje0),
  ], { fabricada: true, material: 'Acero plata Ø4 h6' });

  // --- rodamientos 624ZZ (COMPRADOS) ----------------------------------------
  for (const [lado, t] of [['libre', T.tRodL], ['motor', T.tRodM]]) {
    // `rodamiento` construye con `revolve`, que toma el EJE (x|y|z) y no su
    // signo: siempre crece hacia +x. Por eso hay que anclarlo en el extremo de
    // menor x de su tramo, no en el que corresponde a la coordenada `t`.
    const at = [Math.min(x(t), x(t + P.rodW)), 0, zEje];
    rodamiento(E, {
      nombre: `624ZZ (${lado})`, at, dir: [1, 0, 0],
      bore: P.rodBore, od: P.rodOD, w: P.rodW, capa: cap,
    });
    const p = E.parts[E.parts.length - 1];
    for (const f of p.features) f.at = [f.at[0] + at[0], f.at[1] + at[1], f.at[2] + at[2]];
    p.pos = [0, 0, 0]; p.quat = q;
  }

  // --- bloques porta-rodamiento (IMPRESOS) ----------------------------------
  for (const [lado, t0] of [['libre', T.tBloqueL0], ['motor', T.tBloqueM1 - P.bloqueEsp]]) {
    const tRod = lado === 'libre' ? T.tRodL : T.tRodM;
    const b = bloqueRodamiento(
      `Bloque porta-rodamiento ${P.bloqueAncho}×${P.bloqueEsp} (${lado})`,
      x(t0 + P.bloqueEsp / 2), Math.min(x(tRod), x(tRod + P.rodW)), zEje, zPlaca);
    put(b.nombre, b.color, b.features, { impresa: true, material: 'PETG' });
  }

  // --- acople TT → eje (IMPRESO) --------------------------------------------
  const ac = acopleTT(`Acople TT ${P.ttEjeD} plano → Ø${P.ejeDia}`, x(T.tAcople0), s, zEje);
  put(ac.nombre, ac.color, ac.features, { impresa: true, material: 'PETG' });

  // --- motor TT (COMPRADO) --------------------------------------------------
  // El eje de salida es PERPENDICULAR al eje largo del cuerpo, así que el cuerpo
  // cuelga hacia abajo: su huella radial son 22 mm, no 70. Es lo que permite que
  // la celda no crezca con el largo del motor.
  const mt = motorTT(`Motor TT 1:48 ${P.ttLargo}×${P.ttAncho}×${P.ttAlto} — 200 rpm @6 V`,
    x(T.tCaraRed), s, zEje);
  put(mt.nombre, mt.color, mt.features,
    { comprada: true, componente: 'motor_tt_48', masaG: P.ttMasaG });

  // --- soporte del motor (IMPRESO) ------------------------------------------
  const sm = soporteMotor('Soporte motor TT', x(T.tCaraRed), s, zEje, zPlaca);
  put(sm.nombre, sm.color, sm.features, { impresa: true, material: 'PETG' });

  // --- encoder sobre el eje de la RUEDA (IMPRESO + COMPRADO) ----------------
  const dz = discoEncoder(`Disco encoder ${P.discoNRanuras} ranuras Ø${P.discoDia}`,
    x(T.tDisco), -s, zEje);
  put(dz.nombre, dz.color, dz.features, { impresa: true, material: 'PETG' });

  const lm = sensorLM393('Sensor ranurado IR LM393', x(T.tDisco), zEje);
  put(lm.nombre, lm.color, lm.features, { comprada: true, componente: 'lm393_ranurado' });

  return { angulo: th, radioRueda: R };
}

/** Placa hexagonal superior con las tres ranuras por donde asoman las ruedas. */
export function geometriaPlaca(R = P.R, dentro = P.motorDentro) {
  const Rv = radioVertice(R, dentro);
  const af = r2(Rv * Math.sqrt(3));           // entre caras del hexágono
  const zTop = -P.ruedaSobresale;
  const zBot = zTop - P.placaEsp;

  // Ranura: la rueda es un disco de Ø48 con el eje horizontal; a la altura de la
  // cara inferior de la placa su semicuerda vale √(r² − (z+r)²).
  const rr = P.ruedaDia / 2;
  const semi = Math.sqrt(Math.max(0, rr * rr - Math.pow(zBot + rr, 2)));
  const largoRanura = r2(2 * semi + 2 * P.ranuraHolgura);   // tangencial
  const anchoRanura = r2(P.ruedaAncho + 2 * P.ranuraHolgura); // radial

  // Vértices a 90°/150°/…: así las tres ruedas apuntan a VÉRTICES del hexágono,
  // que es donde hay más radio, y no a las caras, que están √3/2 más cerca.
  const hexagono = hexPts(0, 0, af, Math.PI / 2).map(([x, y]) => [r2(x), r2(y)]);
  const ranuras = [];
  for (let i = 0; i < 3; i++) {
    const th = anguloUnidad(i), c = Math.cos(th), sn = Math.sin(th);
    // rectángulo de la ranura, girado al ángulo de la unidad
    ranuras.push([[-anchoRanura / 2, -largoRanura / 2], [anchoRanura / 2, -largoRanura / 2],
      [anchoRanura / 2, largoRanura / 2], [-anchoRanura / 2, largoRanura / 2]]
      .map(([a, b]) => [r2(R * c + a * c - b * sn), r2(R * sn + a * sn + b * c)]));
  }
  return { af, Rv, hexagono, ranuras, largoRanura, anchoRanura, zTop, zBot };
}

function placaHex(E, R, dentro) {
  const G = geometriaPlaca(R, dentro);
  const { af, Rv, largoRanura, anchoRanura, zTop, zBot } = G;
  const features = [sketchXY(`Hexágono e/c ${af}`, zBot, G.hexagono, P.placaEsp)];
  for (let i = 0; i < 3; i++) {
    const pts = G.ranuras[i];
    // El corte de boceto se extruye desde su plano hacia −n (ver buildPartGeometry),
    // así que el plano va ARRIBA de lo que se quiere quitar, no debajo.
    features.push({
      id: `rn${i}`, name: `Ranura rueda ${i + 1}`, shape: 'sketch', op: 'cut',
      at: [0, 0, zTop + 1], dir: [0, 0, 1], params: { pts, h: P.placaEsp + 2, u: [1, 0, 0] },
    });
  }
  E.addPart(`Placa hexagonal e/c ${af} × ${P.placaEsp}`, COL.chapa, [0, 0, 0], features,
    { pos: [0, 0, 0], fabricada: true, material: `Acrílico ${P.placaEsp} mm (corte láser)` });
  return { af, Rv, largoRanura, anchoRanura };
}

/** Construye una celda completa. */
export function celda(E, { R = P.R, dentro = P.motorDentro } = {}) {
  const unidades = [];
  for (let i = 0; i < P.nRuedas; i++) unidades.push(unidadMotriz(E, i, R, dentro));
  const placa = placaHex(E, R, dentro);
  return { unidades, placa, R, dentro, piezas: E.parts.length };
}
