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

import { Ensamble, box, cyl, hole, rodamiento, hexPts, sketchXY, COL, r2, normal3,
  pernoHex, tuercaHex, golilla } from '../nbt90/lib.mjs';
import { P } from './params.mjs';
import { ruedaOmni, motorTT, acopleTT, discoEncoder, sensorLM393, soporteC, ruedaBola }
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

  // El eje y el encoder se sitúan contra el ALMA EXTERIOR del soporte en C, que es
  // la pieza que de verdad está ahí. Antes se referían a un bloque impreso que ya
  // no existe, y eso empujaba el encoder 7 mm más afuera de lo necesario: como el
  // encoder es el extremo del tren, esos 7 mm los pagaba el hexágono entero.
  const tAlmaExt = tRodL + P.rodW / 2 - P.chapaEsp / 2;   // cara exterior del alma
  const tEje0 = tAlmaExt - 2;
  const tDisco = tEje0 - 1;
  const tSensorFin = tDisco - (P.lmEsp - P.lmRanura / 2);   // el PCB va desplazado hacia afuera

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

  // Los helpers de tornillería anclan la pieza en `at` y relativizan sus features;
  // aquí las queremos en el marco LOCAL de la unidad y girando con ella, así que
  // se deshace el anclaje y se les pone el cuaternión de la unidad.
  const local = (fn, args) => {
    fn(E, { ...args, capa: cap });
    const p = E.parts[E.parts.length - 1];
    const at = args.at;
    for (const f of p.features) f.at = [f.at[0] + at[0], f.at[1] + at[1], f.at[2] + at[2]];
    p.pos = [0, 0, 0]; p.quat = q;
    return p;
  };

  /** Unión atornillada vertical a través de la placa: perno + golilla + (tuerca). */
  const unionM3 = (nombre, xTal, yTal, largo, conTuerca = false) => {
    const zCab = -P.ruedaSobresale;                       // cara superior de la placa
    local(golilla, { nombre, at: [xTal, yTal, zCab], dir: [0, 0, -1], dia: 3, ext: 7, esp: 0.5 });
    local(pernoHex, { nombre: `M3 × ${largo} ${nombre}`, at: [xTal, yTal, zCab - 0.5], dir: [0, 0, -1],
      dia: 3, largo, af: 5.5, altoCab: 2.1 });
    if (conTuerca) {
      local(tuercaHex, { nombre, at: [xTal, yTal, zCab - 0.5 - largo], dir: [0, 0, -1],
        dia: 3, af: 5.5, alto: 2.4 });
    }
  };

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

  // --- soporte en C de CHAPA PLEGADA (patente [0054], elemento 32) -----------
  // Una sola pieza plegada sustituye a los dos bloques impresos y al soporte del
  // motor: sus dos almas alojan los rodamientos, sus pestañas se atornillan bajo
  // la placa y el alma interior recibe los dos M3 del motor.
  const xAlmaA = Math.min(x(T.tRodM + P.rodW / 2), x(T.tRodL + P.rodW / 2));
  const xAlmaB = Math.max(x(T.tRodM + P.rodW / 2), x(T.tRodL + P.rodW / 2));
  const sc = soporteC('Soporte en C 2 mm (Träger 32)', xAlmaA, xAlmaB, zEje, zPlaca, xAlmaA, xAlmaB);
  put(sc.nombre, sc.color, sc.features, {
    fabricada: true, chapa: sc.chapa,
    material: `Chapa de acero ${P.chapaEsp} mm · desarrollo ${sc.chapa.desarrollo} mm · ${sc.chapa.plegados} pliegues`,
  });

  // --- acople TT → eje (IMPRESO) --------------------------------------------
  const ac = acopleTT(`Acople TT ${P.ttEjeD} plano → Ø${P.ejeDia}`, x(T.tAcople0), s, zEje);
  put(ac.nombre, ac.color, ac.features, { impresa: true, material: 'PETG' });

  // --- motor TT (COMPRADO) --------------------------------------------------
  // El eje de salida es PERPENDICULAR al eje largo del cuerpo, así que el cuerpo
  // cuelga hacia abajo: su huella radial son 22 mm, no 70.
  const mt = motorTT(`Motor TT 1:48 ${P.ttLargo}×${P.ttAncho}×${P.ttAlto} — 200 rpm @6 V`,
    x(T.tCaraRed), s, zEje);
  put(mt.nombre, mt.color, mt.features,
    { comprada: true, componente: 'motor_tt_48', masaG: P.ttMasaG });

  // --- encoder sobre el eje de la RUEDA (IMPRESO + COMPRADO) ----------------
  const dz = discoEncoder(`Disco encoder ${P.discoNRanuras} ranuras Ø${P.discoDia}`,
    x(T.tDisco), -s, zEje);
  put(dz.nombre, dz.color, dz.features, { impresa: true, material: 'PETG' });

  const lm = sensorLM393('Sensor ranurado IR LM393', x(T.tDisco), -s, zEje);
  put(lm.nombre, lm.color, lm.features, { comprada: true, componente: 'lm393_ranurado' });

  // --- PERNERÍA (M3, DIN 933 / DIN 934 / DIN 125) ---------------------------
  // Las dos pestañas del soporte en C se atornillan a la placa desde ARRIBA:
  // cuatro tornillos por unidad y la unidad entera sale sin tocar las vecinas.
  for (const [xp, lado] of [[xAlmaA - P.soporteCPestana / 2, 'int'], [xAlmaB + P.soporteCPestana / 2, 'ext']]) {
    for (const c of [-1, 1]) {
      unionM3(`pestaña ${lado} (${c > 0 ? '+' : '−'})`, xp, c * P.soporteCTaladroSep / 2,
        P.placaEsp + P.chapaEsp + 4, true);
    }
  }
  // los dos M3 que sujetan el motor al alma interior del soporte
  for (const c of [-1, 1]) {
    local(pernoHex, {
      nombre: `M3 × 10 motor (${c > 0 ? '+' : '−'})`,
      at: [xAlmaA - s * P.chapaEsp, c * P.ttFijacionC, zEje + P.ttFijacionB],
      dir: [s, 0, 0], dia: 3, largo: 10, af: 5.5, altoCab: 2.1,
    });
  }

  return { angulo: th, radioRueda: R };
}

/** Placa hexagonal superior con las tres ranuras por donde asoman las ruedas. */
/** Ruedas de bola en el punto medio de cada cara del hexágono: quedan en la
 *  JUNTA entre dos celdas vecinas, que es donde el bulto se engancharía. Cada
 *  chapa aporta media cazoleta (patente [0057]: «1/2, 1/3 o 1/4 de círculo»). */
export function bolasDe(R = P.R, dentro = P.motorDentro) {
  const af = r2(radioVertice(R, dentro) * Math.sqrt(3));
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60) * Math.PI / 180;
    out.push({ x: r2((af / 2) * Math.cos(a)), y: r2((af / 2) * Math.sin(a)),
      que: `cara ${i + 1}` });
  }
  return out;
}

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
  // Taladros M3: los de unión entre celdas vecinas (2 por cara del hexágono) y
  // los que sujetan los bloques y el soporte del motor de cada unidad. Se calculan
  // AQUÍ y de aquí los toman tanto el modelo 3D como el DXF de corte: si vivieran
  // en dos sitios, la placa cortada y la placa modelada acabarían distintas.
  const T = tren(), sM = dentro ? -1 : 1, xr = (t) => R + sM * t;
  const taladros = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60) * Math.PI / 180, dCara = af / 2 - P.placaTaladroBorde;
    for (const c of [-1, 1]) {
      const t = c * af * P.placaTaladroSep;
      taladros.push({ x: r2(dCara * Math.cos(a) - t * Math.sin(a)),
        y: r2(dCara * Math.sin(a) + t * Math.cos(a)), d: 3.4, que: `unión celda cara ${i + 1}` });
    }
  }
  // Taladros de las pestañas del soporte en C: DOS por pestaña, DOS pestañas por
  // unidad. Salen del mismo cálculo que usa `unidadMotriz`, no de una copia.
  const xAlmaA0 = Math.min(xr(T.tRodM + P.rodW / 2), xr(T.tRodL + P.rodW / 2));
  const xAlmaB0 = Math.max(xr(T.tRodM + P.rodW / 2), xr(T.tRodL + P.rodW / 2));
  for (let i = 0; i < 3; i++) {
    const th = anguloUnidad(i), c = Math.cos(th), sn = Math.sin(th);
    for (const [rad, lado] of [[xAlmaA0 - P.soporteCPestana / 2, 'pestaña int'],
      [xAlmaB0 + P.soporteCPestana / 2, 'pestaña ext']]) {
      for (const cc of [-1, 1]) {
        const t = cc * P.soporteCTaladroSep / 2;
        taladros.push({ x: r2(rad * c - t * sn), y: r2(rad * sn + t * c), d: 3.4,
          que: `U${i + 1} ${lado}` });
      }
    }
  }
  const bolas = bolasDe(R, dentro);
  return { af, Rv, hexagono, ranuras, largoRanura, anchoRanura, zTop, zBot, taladros, bolas };
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
  for (const t of G.taladros) {
    features.push(hole(`M3 ${t.que}`, [t.x, t.y, zTop + 1], [0, 0, -1], t.d));
  }
  // vaciados `38` para las ruedas de bola: en el borde, así que cada chapa aporta
  // media cazoleta y la bola queda compartida con la celda vecina
  for (const b of G.bolas) {
    features.push(hole(`Vaciado rueda de bola ${b.que}`, [b.x, b.y, zTop + 1], [0, 0, -1], P.bolaAlojDia));
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

  // --- RUEDAS DE BOLA (patente [0050], elemento 26) --------------------------
  // Pasivas, a la MISMA altura que las ruedas motrices, en los huecos: impiden
  // que el bulto se enganche en los cantos al cruzar de una celda a la vecina.
  const zPl = -P.ruedaSobresale - P.placaEsp;
  for (const b of bolasDe(R, dentro)) {
    const rb = ruedaBola(`Rueda de bola Ø${P.bolaDia} (${b.que})`, b.x, b.y, zPl);
    E.addPart(rb.nombre, rb.color, [0, 0, 0], rb.features,
      { pos: [0, 0, 0], comprada: true, componente: 'rueda_bola_media_pulgada' });
  }
  return { unidades, placa, R, dentro, piezas: E.parts.length };
}
