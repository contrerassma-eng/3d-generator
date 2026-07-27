// bastidor.mjs — ESTRUCTURA DE CHAPA de la transferencia 90° de bandas angostas
// (Hytrol ProSort MRT 90° Transfer). Módulo del ensamble NBT90; ver CONTRATO.md.
//
//   Capa FIJO  : cuelga del transportador anfitrión y no se mueve.
//   Capa MÓVIL : ROLLER FRAME WELDMENT, sube `P.carrera` (10 mm) con el pop-up.
//                El modelo está en estado ELEVADO.
//
// Ejes: X = eje de los rodillos (flujo del anfitrión) · Y = expulsión a 90°
//       Z = arriba, 0 en la cara inferior del bastidor.
//
// Procedencia de las cotas locales:  med = medido sobre las vistas (k = 0.6320)
//   cat = catálogo del fabricante · txt = texto del manual · dis = decisión de
//   diseño de este repositorio (capa `user`). Toda cota compartida sale de `P`.

import {
  Ensamble, box, cyl, hole, sketchXZ, sketchYZ, sketchXY, seccionChapa, desarrollo,
  rectR, colisa, arcoPts, pernoHex, tuercaHex, golilla, COL, r2,
} from './lib.mjs';
import { P } from './params.mjs';

// ---------------------------------------------------------------------------
// Cotas locales de ESTE módulo (nadie más las usa)
// ---------------------------------------------------------------------------
const T12 = P.cal12;                       // 2.657 — chapa 12 GA del bastidor
const T14 = P.cal14;                       // 1.897 — chapa 14 GA de la guarda
const T316 = P.placaT;                     // 4.763 — 3/16" de las placas peine
const RB = P.radioPliegue;                 // radio interior de plegado = espesor
const KF = P.factorK;

const D38 = P.M.b38.d;                     // 9.525 — perno 3/8-16
const PAS38 = r2(D38 + P.holgura.pasante); // 11.13 — taladro pasante de 3/8"
const GOL = 1.6;                           // dis: golilla plana 3/8" ASME B18.22.1
const GOLD = r2(2.2 * D38);                // Ø exterior de la golilla

const L = {
  // ---- placas peine (ROLLER FRAME WELDMENT) -------------------------------
  placaXa: 40.1,        // dis: cara interior en X=42.48 → 1.52 mm de juego axial
  placaXb: 422.9,       // dis: cara interior en X=420.52 (rodillo ocupa X 44…419)
  peineY: 216,          // dis: cubre los 6 rodillos (±207.6) sin tocar el canal anfitrión
  peineYbajo: 185,      // dis: libra las alas del SIDE CHANNEL (punta en Y=189.14)
  peineZ0: 96,          // dis: encierra las poleas de retorno (fondo en Z=144.85)
  peineZ1: 285,         // dis: fin del tramo estrecho
  peineZ2: 294,         // dis: arranque del tramo ancho (bajo el cross channel)
  peineZt: 388.5,       // dis: 2.1 mm bajo el plano de banda (P.planoBanda)
  huecoZ: 320,          // dis: fondo del hueco de cada banda (8 mm bajo el ramal
                        //      de retorno del anfitrión, que pasa a Z 328…330.5)
  dienteSemi: 17.1,     // dis: semiancho del diente (hueco = 42 > regleta 31.75)
  huecoR: 6,            // dis: radio del fondo del hueco (desahogo)
  // ranura en U: el eje hexagonal de 5/16" va con las CARAS VERTICALES
  //   entrecaras 7.94 en Y, entre vértices 9.17 en Z (interfaz de rodillos.mjs)
  ranuraW: r2(P.rodHex + P.holgura.deslizante),          // 8.14
  get ranuraR() { return r2(this.ranuraW / 2); },        // 4.07
  // ASIENTO EN V: el fondo redondo (radio ranuraR) toca el hexágono en sus DOS
  // vértices inferiores (a ±AF/2 en Y y AC/4 = P.rodHex/2√3 bajo el eje), de modo
  // que la ranura posiciona el eje en Y y en Z a la vez. Centro del arco:
  //   h = AC/4 − √(r² − (AF/2)²) = 2.292 − 0.897 = 1.395 mm bajo P.rodZ
  get ranuraZc() {
    const AF2 = P.rodHex / 2, AC4 = P.rodHex / (2 * Math.sqrt(3));
    return r2(P.rodZ - (AC4 - Math.sqrt(this.ranuraR ** 2 - AF2 ** 2)));
  },

  // ---- travesaños del cassette móvil --------------------------------------
  cruzY: 200,           // dis: alma del TRANSFER CROSS CHANNEL (± )
  cruzZ0: 297, cruzZ1: 347.8,   // dis: 2" de canto; el ala superior queda 4.2 mm bajo la
                                //      generatriz inferior del rodillo RETRAÍDO (Z=352.0)
  cruzAla: P.canalAla,          // 38.1 — ala hacia dentro
  braceY: 100,          // dis: alma del NOTCHED BRACE CHANNEL (±). El motorreductor
                        //      ocupa Y ±72.5 y el plato de empuje de la mesa Y ±100:
                        //      80…120 es la única banda libre a esta altura.
  braceSemi: 20,        // dis: semiancho del canal de refuerzo (40 mm de alma)
  braceZ0: P.rielInfZ,  // 143.5 — la CARA INFERIOR del alma es el «riel del bastidor
                        //      móvil» contra el que empuja el plato de la mesa guía.
                        //      Deja 17.7 mm sobre el canal de montaje del cilindro
                        //      (Z ≤ 115.8) aun con los 10 mm de carrera retraídos.
  braceAlto: r2(1.75 * 25.4),   // 44.45 (1-3/4") — el ala no alcanza la banda que
                        //      envuelve por debajo la polea tensora (Z = 194.4)
  get braceZ1() { return r2(this.braceZ0 + this.braceAlto); },
  muescaX0: 57, muescaX1: 113,  // dis: muesca que deja pasar el serpentín (X=85 ± 28)
  muescaZ1: 150,        // dis: hasta aquí se recorta el ALMA (paso del ramal de retorno);
                        //      por encima sólo se recorta el ala exterior
  angX0: 47.24,         // dis: los CROSS ANGLE son las cartelas que puentean la muesca
  angY: [78.67, 104.07],// dis: ala vertical solapada al ala interior + ala de 1" hacia dentro
  angZ0: 150,           // dis: arrancan donde termina la muesca del alma
  espX: [42.48, 415.76],// dis: SPACER PLATE contra la cara interior de cada peine
  espZ0: 96, espZ1: 176,// dis
  espTornZ: 112,        // dis: fila de pernos bajo el motorreductor (Ø145 llega a Z=126.4)
  espTornY: [-170, -55, 55, 170],   // dis: fuera de las alas de los brace channel
  motorPaso: r2(P.motorDia + 5),    // 150 — pasante del motorreductor: el SEW mide 314 mm
                        //      desde la brida y su cola cae en X=433.4, o sea ATRAVIESA la
                        //      placa peine libre (X 420.5…425.3). Es como se monta de veras.
  // ---- guarda del serpentín ----------------------------------------------
  guardaX: 110,         // dis: entre el serpentín (X 72.3…97.7) y la placa soporte
                        //      de la transmisión (X 113…119.35)
  guardaAla: 30,        // dis: pestaña de rigidez / atornillado
  guardaEjeD: 20,       // dis: pasante de los ejes de polea (Ø9/16" + hombro Ø22 → holgura)
  guardaEjes: [[-152.4, 252.9], [152.4, 252.9], [-76.2, 252.9], [76.2, 228.65],
               [-144.5, 176.6], [144.5, 176.6]],   // ejes de locas, tensor y retorno
  guardaEscX: [113, 119.35],   // dis: escotadura del ala inferior — paso de la placa
                        //      soporte de la transmisión (chapa de 1/4" en X 113…119.35)
  guardaZ0: 175, guardaZ1: 297,  // dis: la pestaña superior atornilla al ala
                                 //      inferior del cross channel
  guardaY: 185,         // dis: no toca el ala del SIDE CHANNEL (189.14)

  // ---- estructura fija ----------------------------------------------------
  canalZ1: P.canalTopZ,                       // med 383.1 — cara superior del ala
  get canalZ0() { return r2(this.canalZ1 - P.canalAlto); },  // 218.0 (cat 6-1/2")
                        // comprobación: 218.0 + T12 = 220.66 = P.canalBotZ (med) ✓
  ladoY: 227.24,        // dis: alma del SIDE CHANNEL, a tope con el alma anfitriona
  ladoAla: r2(P.canalAla - 3.2),  // 34.9 (1-3/8") — el ala se acorta 3.2 mm respecto
                        //      del perfil anfitrión: el ramal que sube de la polea de
                        //      retorno al rodillo exterior pasa por (Y ∓189.25, Z 248.81)
                        //      y rozaba la punta. Con la punta en Y ±192.34 quedan 3.09 mm.
  ladoZ1: 250,          // dis: solapa 32 mm con el alma del canal anfitrión
  get ladoZ0() { return r2(this.ladoZ1 - P.canalAlto); },    // 84.9
  ladoLargo: r2(18 * 25.4),                   // cat PT-087017 «SIDE CHANNEL - 18 in.»
  ventanaX: [103, 147],                       // dis: paso de la oreja de transmision.mjs
  ventanaZ: 220,                              // dis: desde aquí hasta el canto superior
  baseX0: 26, baseX1: 102.2,                  // dis: canal base de 3" de ancho, corrido al
                                              //      extremo motriz para dejar libre la
                                              //      huella de la mesa guía (X 146.5…316.5)
  baseTapaX: [22, 105], baseTornX: [32, 95],  // dis: tapas de extremo y su tornillería
  baseZ1: 56.1,                               // dis: P.baseZ + 1-1/2"
  jackX: [115.75, 347.25],                    // dis: 1/4 y 3/4 del largo (4 jack bolts)
  transX: 127, transZ: [232, 264],            // interfaz transmision.mjs: pernos 3/8-16
                                              //   de la oreja de la placa soporte
  jackAncho: 50,                              // dis: ancho de las ménsulas en X
  jackY0: 232, jackY1: 262,                   // dis: la oreja abraza P.jackY = 247.4
};

const n3 = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Interfaces que consumen los otros módulos (nunca duplican un valor de P). */
export const padMovilZ = L.braceZ0;      // = P.rielInfZ (143.5): cara inferior del alma de
                                         // los brace channel, donde empuja el plato de la mesa
export const guardaSerpX = L.guardaX;    // plano de la guarda que parte los dos compartimentos
/** Compartimento del motorreductor: arranca tras la placa soporte de la transmisión y
 *  ATRAVIESA la placa peine libre por el pasante Ø150 (la cola del SEW llega a X≈433). */
export const motorEnvX = [r2(L.guardaEscX[1] + 2), P.largo];
export const motorPasoD = L.motorPaso;
/** Huella libre para la mesa guía neumática (bajo el centro, sin estructura fija). */
export const mesaHuella = { x: [110, 375], y: [-185, 185], z: [P.baseZ + 2, L.braceZ0] };
/** Los anillos DIN 471 del eje hexagonal deben caer FUERA de las placas peine. */
export const anilloRetX = [r2(L.placaXa - T316 / 2 - 1.7), r2(L.placaXb + T316 / 2 + 1.7)];

// ---------------------------------------------------------------------------
// Tornillería: perno hexagonal 3/8-16 + 2 golillas + tuerca. `at` es la cara
// exterior por donde entra el perno; `agarre` la suma de espesores apretados.
// ---------------------------------------------------------------------------
function tornilleria(E, { nombre, at, dir, agarre, capa }) {
  const d = n3(dir), p = (s) => add(at, mul(d, s));
  const largo = r2(agarre + 2 * GOL + P.M.b38.tuerca + 4);
  golilla(E, { nombre: `${nombre} (cabeza)`, at: p(0), dir: d, dia: D38, ext: GOLD, esp: GOL, capa });
  pernoHex(E, {
    nombre: `3/8-16 × ${largo} · ${nombre}`, at: p(GOL), dir: d, dia: D38,
    largo, af: P.M.b38.af, altoCab: P.M.b38.hh, capa,
  });
  golilla(E, { nombre: `${nombre} (tuerca)`, at: p(GOL + agarre), dir: d, dia: D38, ext: GOLD, esp: GOL, capa });
  tuercaHex(E, {
    nombre: `3/8-16 · ${nombre}`, at: p(2 * GOL + agarre), dir: d, dia: D38,
    af: P.M.b38.af, alto: P.M.b38.tuerca, capa,
  });
}

// ---------------------------------------------------------------------------
// Silueta de la placa peine (contorno cerrado en (Y, Z))
// ---------------------------------------------------------------------------
function siluetaPeine() {
  const { peineY: Ye, peineYbajo: Yb, peineZ0: Z0, peineZ1: Z1, peineZ2: Z2,
    peineZt: Zt, huecoZ: Zh, dienteSemi: ds, huecoR: rc, ranuraR: rr, ranuraZc: zc } = L;
  const pts = [[-Yb, Z0], [Yb, Z0], [Yb, Z1], [Ye, Z2], [Ye, Zt]];
  const rod = P.rodY;                                  // [-190.5 … +190.5]
  for (let i = rod.length - 1; i >= 0; i--) {
    const y = rod[i];
    // ranura en U de fondo redondo (recibe el eje hexagonal)
    pts.push([y + rr, Zt], [y + rr, zc]);
    pts.push(...arcoPts(y, zc, rr, 0, -Math.PI, 12));
    pts.push([y - rr, zc], [y - rr, Zt]);
    if (i > 0) {                                       // hueco de paso de la banda
      const a = y - ds, b = rod[i - 1] + ds;
      pts.push([a, Zt], [a, Zh + rc]);
      pts.push(...arcoPts(a - rc, Zh + rc, rc, 0, -Math.PI / 2, 6));
      pts.push(...arcoPts(b + rc, Zh + rc, rc, -Math.PI / 2, -Math.PI, 6));
      pts.push([b, Zh + rc], [b, Zt]);
    }
  }
  pts.push([-Ye, Zt], [-Ye, Z2], [-Yb, Z1]);
  return pts.map((q) => [r2(q[0]), r2(q[1])]);
}

// ---------------------------------------------------------------------------
// MÓDULO
// ---------------------------------------------------------------------------
export function bastidor(E) {
  const M = { chapas: 0, pernos: 0, desarrollos: {} };
  const FIJO = 'FIJO · ', MOVIL = 'MÓVIL · ';
  const chapa = (t, fibra, mat = 'acero A36 laminado en frío') =>
    ({ chapa: { t: r2(t), material: mat, fibra: fibra.map((q) => [r2(q[0]), r2(q[1])]), radio: r2(RB) } });
  const desa = (k, fibra, t) => { M.desarrollos[k] = desarrollo(fibra, t, RB, KF).largo; };

  // =========================================================================
  // 1. FIJO — canales laterales del transportador anfitrión (6-1/2" × 1-1/2" 12 GA)
  //    Sección conformada por su fibra media; alas hacia AFUERA. De ellos cuelga
  //    toda la transferencia. med: alma en Y=±229.9, ala superior en Z=383.1.
  // =========================================================================
  const zAlaSup = r2(L.canalZ1 - T12 / 2), zAlaInf = r2(L.canalZ0 + T12 / 2);
  for (const s of [1, -1]) {
    const fib = [
      [s * (P.almaY + P.canalAla), zAlaSup], [s * P.almaY, zAlaSup],
      [s * P.almaY, zAlaInf], [s * (P.almaY + P.canalAla), zAlaInf],
    ];
    const f = [sketchYZ(`Canal C 6-1/2×1-1/2 12 GA`, 0, seccionChapa(fib, T12, RB), P.largo)];
    // taladros de los 4 jack bolts (ala inferior) y del SIDE CHANNEL (alma)
    for (const x of L.jackX) f.push(hole(`Jack bolt 3/8" Ø${PAS38}`, [x, s * P.jackY, L.canalZ0 + T12 + 2], [0, 0, -1], PAS38, 8, false));
    for (const x of [60, 231.5, 403]) f.push(hole(`Unión SIDE CHANNEL Ø${PAS38}`, [x, s * (P.almaY + 4), 234], [0, -s, 0], PAS38, 10, false));
    // paso de los 2 pernos de la oreja de la placa soporte de transmisión
    for (const z of L.transZ) f.push(hole(`Placa de transmisión Ø${PAS38}`, [L.transX, s * (P.almaY + 4), z], [0, -s, 0], PAS38, 10, false));
    E.addPart(`${FIJO}Canal lateral anfitrión 6-1/2"×1-1/2" 12 GA × ${P.largo} (${s > 0 ? '+Y' : '-Y'})`,
      COL.chapa, [0, s * P.almaY, L.canalZ0], f,
      { ...chapa(T12, fib), catalogo: 'perfil conformado 6-1/2 × 1-1/2 × 12 ga.' });
    M.chapas++;
    if (s > 0) desa('canal_anfitrion', fib, T12);
  }

  // =========================================================================
  // 2. FIJO — SIDE CHANNEL - 18 in. LONG (PT-087017). Cuelga a tope contra el
  //    alma del canal anfitrión; alas hacia DENTRO. Se atornilla con COLISAS
  //    verticales (txt pág. 8: "loosen the 3/8 in. bolts…" = reglaje de altura).
  // =========================================================================
  const ladoX0 = r2((P.largo - L.ladoLargo) / 2);
  const zLadoSup = r2(L.ladoZ1 - T12 / 2), zLadoInf = r2(L.ladoZ0 + T12 / 2);
  for (const s of [1, -1]) {
    const fib = [
      [s * (L.ladoY - L.ladoAla), zLadoSup], [s * L.ladoY, zLadoSup],
      [s * L.ladoY, zLadoInf], [s * (L.ladoY - L.ladoAla), zLadoInf],
    ];
    const f = [sketchYZ('Canal C 6-1/2×1-1/2 12 GA', ladoX0, seccionChapa(fib, T12, RB), L.ladoLargo)];
    // colisas verticales de reglaje (±8 mm) en el alma
    for (const x of [60, 231.5, 403]) {
      f.push(sketchXZ(`Colisa reglaje ${PAS38}×${r2(PAS38 + 16)}`,
        s > 0 ? L.ladoY - 3 : -(L.ladoY + 3), colisa(x, 234, r2(PAS38 + 16), PAS38, true), 6, 'cut'));
    }
    // taladros de las ménsulas de jack bolt inferiores y de las tapas del canal base
    for (const x of L.jackX) for (const z of [100, 118]) {
      f.push(hole(`Ménsula jack Ø${PAS38}`, [x, s * (L.ladoY + 4), z], [0, -s, 0], PAS38, 10, false));
    }
    for (const x of L.baseTornX) {
      f.push(hole(`Tapa canal base Ø${PAS38}`, [x, s * 210, L.ladoZ0 - 2], [0, 0, 1], PAS38, 8, false));
    }
    // Ventana de paso de la OREJA de la placa soporte de transmisión: esa oreja
    // busca el ALMA DEL CANAL ANFITRIÓN (Y = P.almaY) y este canal se le cruza.
    f.push(box('Ventana de paso de la placa de transmisión',
      [r2((L.ventanaX[0] + L.ventanaX[1]) / 2), s * r2(L.ladoY - L.ladoAla / 2), L.ventanaZ],
      r2(L.ventanaX[1] - L.ventanaX[0]), r2(L.ladoAla + 14), r2(L.ladoZ1 - L.ventanaZ + 6), 'cut'));
    E.addPart(`${FIJO}Side channel 6-1/2"×1-3/8" 12 GA × ${L.ladoLargo} (${s > 0 ? '+Y' : '-Y'})`,
      COL.fijo, [ladoX0, s * L.ladoY, L.ladoZ0], f,
      { ...chapa(T12, fib), catalogo: 'PT-087017 · SIDE CHANNEL - 18 in. LONG' });
    M.chapas++;
    if (s > 0) desa('side_channel', fib, T12);
    // tornillería alma-contra-alma (entra desde fuera del transportador)
    for (const x of [60, 231.5, 403]) {
      tornilleria(E, {
        nombre: `Side channel ${s > 0 ? '+Y' : '-Y'} X${x}`, capa: FIJO,
        at: [x, s * (P.almaY + T12 / 2 + GOL), 234], dir: [0, -s, 0], agarre: 2 * T12,
      });
      M.pernos++;
    }
  }

  // =========================================================================
  // 3. FIJO — BASE CHANNEL WELDMENT (WA-025817): canal en U que une los dos
  //    laterales por abajo (Z = P.baseZ) + 2 tapas de extremo soldadas.
  // =========================================================================
  {
    const yTapa = r2(L.ladoY - T12 / 2 - T12);           // cara interior del alma − tapa
    const fib = [
      [L.baseX0 + T12 / 2, L.baseZ1 - T12 / 2], [L.baseX0 + T12 / 2, P.baseZ + T12 / 2],
      [L.baseX1 - T12 / 2, P.baseZ + T12 / 2], [L.baseX1 - T12 / 2, L.baseZ1 - T12 / 2],
    ];
    E.addPart(`${FIJO}Canal base en U 76×38 12 GA × ${r2(2 * yTapa)}`, COL.fijo,
      [0, yTapa, P.baseZ], [sketchXZ('Canal U 3"×1-1/2" 12 GA', yTapa, seccionChapa(fib, T12, RB), r2(2 * yTapa))],
      { ...chapa(T12, fib), catalogo: 'WA-025817 · BASE CHANNEL WELDMENT', union: 'soldada a las tapas' });
    M.chapas++; desa('canal_base', fib, T12);

    for (const s of [1, -1]) {
      const yv = r2(L.ladoY - T12 / 2 - T12 / 2);        // fibra media del alma de la tapa
      const fibT = [[s * yv, P.baseZ], [s * yv, 83.57], [s * 200, 83.57]];
      const largoTapa = r2(L.baseTapaX[1] - L.baseTapaX[0]);
      const f = [sketchYZ('Tapa en L', L.baseTapaX[0], seccionChapa(fibT, T12, RB), largoTapa)];
      for (const x of L.baseTornX) f.push(hole(`Unión side channel Ø${PAS38}`, [x, s * 210, 80], [0, 0, 1], PAS38, 10, false));
      E.addPart(`${FIJO}Tapa extremo canal base 12 GA ${largoTapa}×67 (${s > 0 ? '+Y' : '-Y'})`, COL.fijo,
        [L.baseTapaX[0], s * yv, P.baseZ], f, { ...chapa(T12, fibT), union: 'soldada al canal base' });
      M.chapas++;
      for (const x of L.baseTornX) {
        tornilleria(E, {
          nombre: `Canal base ${s > 0 ? '+Y' : '-Y'} X${x}`, capa: FIJO,
          at: [x, s * 210, r2(83.57 - T12 / 2 - GOL)], dir: [0, 0, 1], agarre: 2 * T12,
        });
        M.pernos++;
      }
    }
  }

  // =========================================================================
  // 4. FIJO — ménsulas de los JACK BOLTS (4 arriba + 4 abajo). Sólo las orejas
  //    con su agujero de paso de 3/8"; los tornillos los pone elevacion.mjs.
  //    med: jack bolts en Y = ±P.jackY, Z = P.jackSupZ / P.jackInfZ.
  // =========================================================================
  for (const s of [1, -1]) for (const x of L.jackX) {
    // superior: doblador bajo el ala inferior del canal anfitrión
    const zSup = r2(L.canalZ0 - T12);
    const fSup = [
      box(`Placa ${L.jackAncho}×${r2(L.jackY1 - L.jackY0)} 12 GA`,
        [x, s * r2((L.jackY0 + L.jackY1) / 2), zSup], L.jackAncho, r2(L.jackY1 - L.jackY0), T12),
      hole(`Paso jack bolt Ø${PAS38}`, [x, s * P.jackY, zSup - 2], [0, 0, 1], PAS38, 8, false),
    ];
    for (const dy of [-11.4, 10.6]) {
      fSup.push(hole(`Fijación Ø${PAS38}`, [x, s * (P.jackY + dy), zSup - 2], [0, 0, 1], PAS38, 8, false));
    }
    E.addPart(`${FIJO}Ménsula jack bolt superior 12 GA ${L.jackAncho}×30 (${s > 0 ? '+Y' : '-Y'} X${x})`,
      COL.fijo, [x, s * P.jackY, zSup], fSup, { chapa: { t: r2(T12), material: 'acero A36', fibra: [], radio: 0 } });
    M.chapas++;
    for (const dy of [-11.4, 10.6]) {
      tornilleria(E, {
        nombre: `Ménsula jack sup ${s > 0 ? '+Y' : '-Y'} X${x}`, capa: FIJO,
        at: [x, s * (P.jackY + dy), r2(zSup - GOL)], dir: [0, 0, 1], agarre: 2 * T12,
      });
      M.pernos++;
    }
    // inferior: angular atornillado al alma exterior del SIDE CHANNEL
    const yAlma = r2(P.almaY - T12 / 2);
    const fibInf = [[s * yAlma, 130], [s * yAlma, P.jackInfZ], [s * L.jackY1, P.jackInfZ]];
    const fInf = [
      sketchYZ('Angular ménsula', x - L.jackAncho / 2, seccionChapa(fibInf, T12, RB), L.jackAncho),
      hole(`Paso jack bolt Ø${PAS38}`, [x, s * P.jackY, P.jackInfZ + T12 / 2 + 2], [0, 0, -1], PAS38, 8, false),
    ];
    for (const z of [100, 118]) fInf.push(hole(`Fijación Ø${PAS38}`, [x, s * (yAlma + 4), z], [0, -s, 0], PAS38, 10, false));
    E.addPart(`${FIJO}Ménsula jack bolt inferior 12 GA ${L.jackAncho}×47 (${s > 0 ? '+Y' : '-Y'} X${x})`,
      COL.fijo, [x, s * yAlma, P.jackInfZ], fInf, { ...chapa(T12, fibInf) });
    M.chapas++;
    for (const z of [100, 118]) {
      tornilleria(E, {
        nombre: `Ménsula jack inf ${s > 0 ? '+Y' : '-Y'} X${x} Z${z}`, capa: FIJO,
        at: [x, s * (P.almaY + T12 / 2 + GOL), z], dir: [0, -s, 0], agarre: 2 * T12,
      });
      M.pernos++;
    }
  }

  // =========================================================================
  // 5. MÓVIL — ROLLER FRAME WELDMENT: 2 placas peine de 3/16"
  //    6 ranuras en U a paso P.paso que reciben los ejes hexagonales, huecos de
  //    paso de las 5 bandas angostas, y (lado motriz) los ejes del serpentín.
  // =========================================================================
  const sil = siluetaPeine();
  const idlerY = P.bandaY.filter((y) => Math.abs(y) > 1);      // 4 poleas locas
  for (const [i, xc] of [L.placaXa, L.placaXb].entries()) {
    const motriz = i === 0;
    const f = [sketchYZ(`Placa peine 3/16" ${2 * L.peineY}×${r2(L.peineZt - L.peineZ0)}`,
      r2(xc - T316 / 2), sil, T316)];
    if (motriz) {
      for (const y of idlerY) f.push(hole(`Eje polea loca 9/16" Ø${r2(P.idlerEje + P.holgura.deslizante)}`,
        [xc - T316, y, P.idlerZ], [1, 0, 0], r2(P.idlerEje + P.holgura.deslizante), T316 + 4, false));
      for (const s of [1, -1]) f.push(hole(`Eje polea retorno Ø${r2(P.idlerEje + P.holgura.deslizante)}`,
        [xc - T316, s * P.retornoY, P.retornoZ], [1, 0, 0], r2(P.idlerEje + P.holgura.deslizante), T316 + 4, false));
      f.push(hole(`Paso eje motriz / buje Ø${r2(P.bujeDia + P.holgura.pasante)}`,
        [xc - T316, 0, P.motrizZ], [1, 0, 0], r2(P.bujeDia + P.holgura.pasante), T316 + 4, false));
    }
    for (const y of L.espTornY) {
      f.push(hole(`Spacer plate Ø${PAS38}`, [xc - T316, y, L.espTornZ], [1, 0, 0], PAS38, T316 + 4, false));
    }
    if (!motriz) {                        // paso de la cola del motorreductor
      f.push(hole(`Paso del motorreductor Ø${L.motorPaso}`, [xc - T316, 0, P.motrizZ],
        [1, 0, 0], L.motorPaso, T316 + 6, false));
    }
    E.addPart(`${MOVIL}Placa peine 3/16" ${2 * L.peineY}×${r2(L.peineZt - L.peineZ0)} (lado ${motriz ? 'motriz' : 'libre'})`,
      COL.movil, [r2(xc - T316 / 2), 0, L.peineZ0], f, {
        chapa: { t: r2(T316), material: 'acero A36 laminado en caliente 3/16"', fibra: [], radio: 0 },
        catalogo: 'WA-025802 · ROLLER FRAME WELDMENT (SPECIFY BR)', corte: 'láser / plasma, contorno único',
      });
    M.chapas++;
  }

  // =========================================================================
  // 6. MÓVIL — TRANSFER CROSS CHANNEL ×2 (PT-086818): canal en U que une las dos
  //    placas peine por arriba. Alas hacia dentro; queda bajo el barrido del
  //    rodillo (Z ≤ 355.8 frente a la generatriz inferior 362 − 10 de carrera).
  // =========================================================================
  const xCruz0 = r2(L.placaXa + T316 / 2), xCruz1 = r2(L.placaXb - T316 / 2);
  for (const s of [1, -1]) {
    const fib = [
      [s * (L.cruzY - L.cruzAla), L.cruzZ0 + T12 / 2], [s * L.cruzY, L.cruzZ0 + T12 / 2],
      [s * L.cruzY, L.cruzZ1 - T12 / 2], [s * (L.cruzY - L.cruzAla), L.cruzZ1 - T12 / 2],
    ];
    const f = [sketchYZ('Canal U 2"×1-1/2" 12 GA', xCruz0, seccionChapa(fib, T12, RB), r2(xCruz1 - xCruz0))];
    for (const x of [118, 133]) f.push(hole(`Guarda serpentín Ø${PAS38}`, [x, s * 175, L.cruzZ0 - 2], [0, 0, 1], PAS38, 8, false));
    E.addPart(`${MOVIL}Transfer cross channel 2"×1-1/2" 12 GA × ${r2(xCruz1 - xCruz0)} (${s > 0 ? '+Y' : '-Y'})`,
      COL.movil, [xCruz0, s * L.cruzY, L.cruzZ0], f,
      { ...chapa(T12, fib), catalogo: 'PT-086818 · TRANSFER CROSS CHANNEL', union: 'soldada a las placas peine' });
    M.chapas++;
    if (s > 0) desa('cross_channel', fib, T12);
  }

  // =========================================================================
  // 7. MÓVIL — NOTCHED BRACE CHANNEL WELDMENT ×2: canal en U con MUESCA que deja
  //    pasar el serpentín (plano X = P.planoSerp). Su cara inferior (Z = P.rielInfZ)
  //    es el riel contra el que empuja el plato de la mesa guía neumática.
  // =========================================================================
  const xBr0 = r2(L.espX[0] + T316), xBr1 = r2(L.espX[1] - T316);
  for (const s of [1, -1]) {
    const yi = s * (L.braceY - L.braceSemi), yo = s * (L.braceY + L.braceSemi);
    const fib = [
      [yi + s * T12 / 2, L.braceZ1 - T12 / 2], [yi + s * T12 / 2, L.braceZ0 + T12 / 2],
      [yo - s * T12 / 2, L.braceZ0 + T12 / 2], [yo - s * T12 / 2, L.braceZ1 - T12 / 2],
    ];
    const f = [
      sketchYZ('Canal U 1-3/4"×40 12 GA', xBr0, seccionChapa(fib, T12, RB), r2(xBr1 - xBr0)),
      // MUESCA A — recorta el ALMA: por aquí cruza a lo ancho el ramal de retorno
      // del serpentín (Z 142.4…144.9) entre las dos poleas de retorno.
      box('Muesca del alma (ramal de retorno)', [r2((L.muescaX0 + L.muescaX1) / 2), s * L.braceY, L.braceZ0 - 3],
        r2(L.muescaX1 - L.muescaX0), 2 * L.braceSemi + 6, r2(L.muescaZ1 - L.braceZ0 + 3), 'cut'),
      // MUESCA B — recorta el ALA EXTERIOR: por aquí pasan las poleas de retorno
      // Ø2-1/2" (Y 112.8…176.3). El ala interior sigue de largo y hace de puente.
      box('Muesca del ala exterior (poleas de retorno)',
        [r2((L.muescaX0 + L.muescaX1) / 2), s * r2(L.braceY + L.braceSemi / 2 + 3), L.muescaZ1],
        r2(L.muescaX1 - L.muescaX0), r2(L.braceSemi + 6), 60, 'cut'),
    ];
    // desahogos de pliegue en las esquinas de la muesca
    for (const x of [L.muescaX0, L.muescaX1]) for (const yy of [yi, yo]) {
      f.push(hole(`Desahogo Ø${r2(2 * T12)}`, [x, yy - s * 8, L.muescaZ1 - 3], [0, s, 0], r2(2 * T12), 16, false));
    }
    E.addPart(`${MOVIL}Notched brace channel 1-3/4"×40 12 GA × ${r2(xBr1 - xBr0)} (${s > 0 ? '+Y' : '-Y'})`,
      COL.movil, [xBr0, s * L.braceY, L.braceZ0], f,
      { ...chapa(T12, fib), catalogo: 'NOTCHED BRACE CHANNEL WELDMENT', union: 'soldada a las spacer plate' });
    M.chapas++;
    if (s > 0) desa('brace_channel', fib, T12);
  }

  // =========================================================================
  // 8. MÓVIL — CROSS ANGLE - 8-1/2 in. LONG ×2 (PT-086833): angular transversal
  //    soldado bajo los dos NOTCHED BRACE CHANNEL; cierra el cassette por abajo.
  // =========================================================================
  const angLargo = r2(8.5 * 25.4);                       // cat 215.9 = 8-1/2"
  for (const s of [1, -1]) {
    const zTop = r2(L.braceZ1 - T12 / 2);
    const fib = [[s * L.angY[0], L.angZ0], [s * L.angY[0], zTop], [s * L.angY[1], zTop]];
    E.addPart(`${MOVIL}Cross angle 1-3/4"×1" 12 GA × ${angLargo} (cartela de la muesca ${s > 0 ? '+Y' : '-Y'})`,
      COL.movil, [L.angX0, s * L.angY[0], L.angZ0],
      [sketchYZ('Angular 1-3/4×1 12 GA', L.angX0, seccionChapa(fib, T12, RB), angLargo)],
      { ...chapa(T12, fib), catalogo: 'PT-086833 · CROSS ANGLE - 8-1/2 in. LONG',
        union: 'soldada al ala interior del brace channel; puentea la muesca' });
    M.chapas++;
    if (s > 0) desa('cross_angle', fib, T12);
  }

  // =========================================================================
  // 9. MÓVIL — SPACER PLATE ×2 (PT-086781): placa de 3/16" atornillada a la cara
  //    interior de cada peine; cuadra el cassette y recibe los brace channel.
  // =========================================================================
  for (const [i, x0] of L.espX.entries()) {
    const f = [
      sketchYZ(`Placa 3/16" ${2 * L.peineYbajo}×${r2(L.espZ1 - L.espZ0)}`, x0,
        rectR(-L.peineYbajo, L.espZ0, L.peineYbajo, L.espZ1, 8), T316),
    ];
    for (const y of L.espTornY) f.push(hole(`Unión peine Ø${PAS38}`, [x0 - 2, y, L.espTornZ], [1, 0, 0], PAS38, T316 + 4, false));
    if (i) f.push(hole(`Paso del motorreductor Ø${L.motorPaso}`, [x0 - 2, 0, P.motrizZ], [1, 0, 0], L.motorPaso, T316 + 6, false));
    E.addPart(`${MOVIL}Spacer plate 3/16" ${2 * L.peineYbajo}×${r2(L.espZ1 - L.espZ0)} (lado ${i ? 'libre' : 'motriz'})`,
      COL.movil, [x0, 0, L.espZ0], f, {
        chapa: { t: r2(T316), material: 'acero A36 3/16"', fibra: [], radio: 0 },
        catalogo: 'PT-086781 · SPACER PLATE (SPECIFY BR), RLR SUPT',
      });
    M.chapas++;
    for (const y of L.espTornY) {
      const dir = i ? [-1, 0, 0] : [1, 0, 0];
      const at = i ? [r2(L.placaXb + T316 / 2 + GOL), y, L.espTornZ] : [r2(L.placaXa - T316 / 2 - GOL), y, L.espTornZ];
      tornilleria(E, { nombre: `Spacer plate ${i ? 'libre' : 'motriz'} Y${y}`, capa: MOVIL, at, dir, agarre: 2 * T316 });
      M.pernos++;
    }
  }

  // =========================================================================
  // 10. MÓVIL — TRANSFER ROLLER GUARD (PT-086812): guarda de chapa 14 GA que tapa
  //     el serpentín por el lado del accionamiento. Sección en sombrero (2
  //     pestañas de 30) atornillada al ala inferior de los cross channel.
  // =========================================================================
  {
    const xm = r2(L.guardaX + T14 / 2);
    const fib = [
      [r2(L.guardaX + L.guardaAla), r2(L.guardaZ1 - T14 / 2)], [xm, r2(L.guardaZ1 - T14 / 2)],
      [xm, r2(L.guardaZ0 + T14 / 2)], [r2(L.guardaX + L.guardaAla), r2(L.guardaZ0 + T14 / 2)],
    ];
    const f = [sketchXZ('Guarda en sombrero 14 GA', L.guardaY, seccionChapa(fib, T14, RB), r2(2 * L.guardaY))];
    f.push(hole(`Paso eje motriz Ø${r2(P.bujeDia + P.holgura.pasante)}`,
      [L.guardaX - 2, 0, P.motrizZ], [1, 0, 0], r2(P.bujeDia + P.holgura.pasante), T14 + 4, false));
    // pasantes de los 6 ejes del serpentín (4 locas + tensor + 2 de retorno)
    for (const [y, z] of L.guardaEjes) {
      f.push(hole(`Paso eje de polea Ø${L.guardaEjeD} (Y=${y}, Z=${z})`,
        [L.guardaX - 2, y, z], [1, 0, 0], L.guardaEjeD, T14 + 4, false));
    }
    // escotadura del ala inferior: por ahí baja la placa soporte de la transmisión
    f.push(box('Escotadura del ala inferior (placa de transmisión)',
      [r2((L.guardaEscX[0] + L.guardaEscX[1]) / 2), 0, L.guardaZ0 - 2],
      r2(L.guardaEscX[1] - L.guardaEscX[0]), r2(2 * L.guardaY + 10), r2(T14 + 6), 'cut'));
    for (const s of [1, -1]) for (const x of [118, 133]) {
      f.push(hole(`Fijación cross channel Ø${PAS38}`, [x, s * 175, L.guardaZ1 - T14 - 2], [0, 0, 1], PAS38, 8, false));
    }
    E.addPart(`${MOVIL}Guarda del serpentín 14 GA ${r2(2 * L.guardaY)}×${r2(L.guardaZ1 - L.guardaZ0)}`,
      COL.guarda, [L.guardaX, L.guardaY, L.guardaZ0], f,
      { ...chapa(T14, fib, 'acero A36 14 GA'), catalogo: 'PT-086812 · TRANSFER ROLLER GUARD - 17 in. LONG' });
    M.chapas++; desa('guarda_serpentin', fib, T14);
    for (const s of [1, -1]) for (const x of [118, 133]) {
      tornilleria(E, {
        nombre: `Guarda ${s > 0 ? '+Y' : '-Y'} X${x}`, capa: MOVIL,
        at: [x, s * 175, r2(L.guardaZ1 - T14 - GOL)], dir: [0, 0, 1], agarre: r2(T14 + T12),
      });
      M.pernos++;
    }
  }

  // ------------------------------------------------------------------ métricas
  M.piezas = E.parts.length;
  M.juegoAxialRodillo = r2(P.rodX0 - (L.placaXa + T316 / 2));      // ≥ 1.5 mm por lado
  M.ranuraU = {
    ancho: L.ranuraW, radioFondo: L.ranuraR, fondoZ: r2(L.ranuraZc - L.ranuraR), ejeZ: r2(P.rodZ),
    asiento: 'V: el arco toca los dos vértices inferiores del hexágono (posiciona en Y y en Z)',
    dienteSobreEje: r2(L.peineZt - (P.rodZ + P.rodHex / Math.sqrt(3))),
  };
  M.pasoExtraccionEje = { motriz: [0, r2(L.placaXa - T316 / 2)], libre: [r2(L.placaXb + T316 / 2), P.largo] };
  M.interfaces = { apoyoMesaGuiaZ: padMovilZ, motorEnvX, anilloRetX, mesaHuella };
  return M;
}

export default bastidor;
