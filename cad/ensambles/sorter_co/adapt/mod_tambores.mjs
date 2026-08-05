// mod_tambores.mjs — ACCIONAMIENTO DE BANDA PLANA del sorter CO:
//   · TAMBOR MOTRIZ común engomado, sobre 2 unidades UCF 207 (eje Ø35),
//   · RODILLO CONDUCIDO de descansos interiores (eje fijo pasante),
//   · 4 RODILLOS DE RETORNO que encaminan los 5 ramales por debajo del NBT90.
//
// Estilo y primitivas: los de ensambles/nbt90/rodillos.mjs (tubo + tapas-soporte
// + rodamientos + eje, todo por revoluciones de perfil real, sin trucos de
// color). Cotas: adapt/params_tambores.mjs — aquí NO se define ninguna cota
// nueva salvo las locales del bloque `L`, que llevan su justificación.
//
// Ejes del STEP del cliente: X = ancho · Y = flujo · Z = arriba.

import {
  revolve, cyl, box, hole, sketchYZ, rectR, rodamiento, anilloRet, pernoHex,
  tuercaHex, COL, r2, envolventes,
} from '../../nbt90/lib.mjs';
import {
  FIJO, TAMBOR, UCF207, CONDUCIDO, RETORNOS, ELEVADORES, CORREDOR, RETIRA_POZO,
  TAMBORES, RETORNO, CARGA, Xc, EJES,
  MANDRINADO, BANDA, ACCIONAMIENTO,
} from './params_tambores.mjs';
// A2 (revisión de fabricación 2026-08-03): la garganta de anillo elástico ya no
// sale de una fórmula, sale de la TABLA DIN 471 con su cita (web RING-471-01 /
// RING-471-02). Ver adapt/util_adapt.mjs.
import { gargantaDIN471 } from './util_adapt.mjs';

// Se relee el bastidor del otro agente SÓLO para verificar holguras (no define
// nada aquí). No hay ciclo: params_pg40 lee params_tambores, no este módulo.
let PG = null;
try { PG = await import('./params_pg40.mjs'); } catch { /* aún no publicado */ }

const r3 = (v) => Math.round(v * 1000) / 1000;
const DIR = [1, 0, 0];                       // todos los ejes son paralelos a +X
const COLGOMA = '#26262b';                   // caucho vulcanizado

// ---------------------------------------------------------------------------
// Cotas LOCALES de este módulo (dis salvo donde se indique)
// ---------------------------------------------------------------------------
const L = {
  gomaChaflan: 1.5,        // dis — canto de la goma a 45°: el vulcanizado no
                           //   despega por el borde (mismo criterio que nbt90)
  bond: 0.1,               // dis — solape goma↔tubo (línea de vulcanizado)
  tuboChaflan: 0.5,        // dis — entrada de la tapa
  tapaLabio: 2.0,          // dis — labio de tope axial del aro exterior
  tapaChaflan: 0.8,        // dis — introducción a presión
  casquillo: 8.0,          // dis — casquillo entre el anillo DIN 471 y el aro
                           //   interior (separa el anillo de la pista)
  collarL: 15.0,           // cat COLL-SPLIT-01 — ancho b del collar PARTIDO (Mädler 62343000/500)
  bridaR: 12.0,            // dis — radio de esquina de la brida UCF (fundición)
  pernoUcf: { d: 12, af: 19, hh: 7.5 },              // cat M12 ISO 4017
  tuercaH: 10.0,                                     // cat M12 ISO 4032/7040
  apoyoUcf: { neg: 8.0, pos: 36.0 },   // calc — lo que hay DETRÁS de la brida:
                           //   −X sólo el alma del alargue (pg40 ALARGUE.e = 8);
                           //   +X el alargue (8) más el chapón de descarga (28,
                           //   step frameEsp), que es mejor apoyo que los 8 solos
  pernoSop: { d: 12, af: 19, hh: 7.5 },              // cat M12 del soporte de eje fijo
  pernoRet: { d: 10, af: 16, hh: 6.3 },              // cat M10 del soporte de retorno
};

// ---------------------------------------------------------------------------
// B3 (revisión de COMPRAS 2026-08-03) — SALIDA DE HILO.
// Los 8 M12 de las UCF 207 salían con la tuerca acabando EXACTAMENTE en el
// extremo del vástago (0.00 mm de salida). Un tornillo así no se aprieta al
// par: el último hilo está incompleto por el biselado. Regla: ≥ 2 pasos
// sobresaliendo, y después al escalón normalizado de la serie ISO 888, que es
// lo único que se puede pedir (no existe un M12×65.5).
// ---------------------------------------------------------------------------
const PASO_ISO = { 6: 1.0, 8: 1.25, 10: 1.5, 12: 1.75 };          // cat — rosca gruesa ISO 261
const LARGOS_ISO888 = [10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120];

function pernoConSalida(dia, apriete, tuercaH, pasosMin = 2) {
  const paso = PASO_ISO[dia];
  if (!paso) throw new Error(`pernoConSalida: falta el paso tabulado de M${dia}`);
  const min = apriete + tuercaH + pasosMin * paso;
  const largo = LARGOS_ISO888.find(v => v >= min);
  if (!largo) throw new Error(`pernoConSalida: ningún largo normalizado ≥ ${r3(min)} para M${dia}`);
  const salida = r3(largo - apriete - tuercaH);
  return { largo, paso, apriete: r3(apriete), tuercaH, minTeorico: r3(min),
    salidaMm: salida, salidaPasos: r3(salida / paso) };
}

// A2 (revisión de COMPRAS) — UNA norma por anillo. `lib.mjs anilloRet()` estampa
// «DIN 471 / ASME B27.7»: dos normas incompatibles a la vez (DIN 471 es métrica,
// «ASME B27.7» a secas es la serie de PULGADAS). Se pisa con la designación real
// de la tabla ya citada (web RING-471-01/02), igual que hace normalizado.mjs en
// el NBT90. `lib.mjs` es contrato y no se toca.
const anilloDIN471 = (p, eje) => {
  const g = gargantaDIN471(eje);
  p.norma = `${g.desig} — anillo de retención exterior para eje Ø${eje}, s = ${g.s} `
    + `(garganta ${g.cota}) · web RING-471-01/02`;
  return p;
};

// ---------------------------------------------------------------------------
// Perfiles de revolución ([h a lo largo del eje, r radial])
// ---------------------------------------------------------------------------
const espejo = (perfil, len) => perfil.map(([h, r]) => [r3(len - h), r]);

/** Tubo con chaflán de entrada en las dos bocas. */
const perfilTubo = (len, ro, ri) => {
  const c = L.tuboChaflan;
  return [[0, ri + c], [c, ri], [len - c, ri], [len, ri + c], [len, ro], [0, ro]];
};

/** Cubierta engomada CON 5 CORONAS, una por calle (hallazgo B5: no había ningún
 *  medio de centrado de banda). Torneada sobre el vulcanizado:
 *    · cima Ø108.9 EXACTO en el eje de cada calle → el lazo no se mueve;
 *    · cada corona es trapezoidal: `cilindrica` recta + 2 conos de `cono` que
 *      bajan `h` (web CROWN-HAB-01);
 *    · entre coronas, valle plano al Ø de rebaje (108.9 − 2h).
 *  `x0` es la X global del origen del perfil (para situar los ejes de calle). */
const perfilGoma = (len, ro, rv, x0) => {
  const c = L.gomaChaflan, K = TAMBOR.corona;
  const rValle = r3(rv - K.h);
  const pts = [[0, ro - L.bond], [0, rValle - c], [c, rValle]];
  for (const ex of EJES) {
    const h0 = r3(ex - x0);                      // eje de calle en coordenada de perfil
    pts.push([r3(h0 - K.ancho / 2), rValle]);            // pie del cono de entrada
    pts.push([r3(h0 - K.cilindrica / 2), rv]);           // cima (inicio del cilindro)
    pts.push([r3(h0 + K.cilindrica / 2), rv]);           // cima (fin del cilindro)
    pts.push([r3(h0 + K.ancho / 2), rValle]);            // pie del cono de salida
  }
  pts.push([len - c, rValle], [len, rValle - c], [len, ro - L.bond]);
  return pts;
};

/** Disco-tapa SOLDADO del tambor: entra en el tubo y abraza el eje por un cubo.
 *  h = 0 en la cara interior del disco; crece hacia la testa del tubo. */
const perfilTapaSoldada = (e, ri, bore, cuboOd, cuboL) => ([
  [0, bore / 2], [0, cuboOd / 2], [cuboL - e, cuboOd / 2], [cuboL - e, ri],
  [cuboL, ri], [cuboL, bore / 2],
]).map(([h, r]) => [r3(h - (cuboL - e)), r]);

/** Tapa-soporte PRENSADA (rodillo de descansos interiores). Igual que la de
 *  nbt90/rodillos.mjs: se prensa en el ID del tubo y aloja el rodamiento contra
 *  un HOMBRO que hace de tope axial. h = 0 en la testa del tubo. */
const perfilTapaSoporte = (Lt, ri, rb, labioD) => {
  const c = L.tapaChaflan;
  return [
    [0, labioD / 2], [0, ri], [Lt - c, ri], [Lt, ri - c], [Lt, rb + 0.5],
    [Lt - 0.5, rb], [L.tapaLabio, rb], [L.tapaLabio, labioD / 2],
  ];
};

// ---------------------------------------------------------------------------
// Mecánica: viga simplemente apoyada con cargas puntuales
// ---------------------------------------------------------------------------
/** @returns {{M:number, sigma:number, delta:number, Ra:number, Rb:number}} */
function viga(xa, xb, cargas, d, E = 210000) {
  const Lv = xb - xa, W = Math.PI * d ** 3 / 32, I = Math.PI * d ** 4 / 64;
  const tot = cargas.reduce((a, c) => a + c.p, 0);
  const Rb = cargas.reduce((a, c) => a + c.p * (c.x - xa), 0) / Lv;
  const Ra = tot - Rb;
  const M = (x) => {
    let m = Ra * (x - xa);
    for (const c of cargas) if (c.x < x) m -= c.p * (x - c.x);
    return m;
  };
  // momento máximo (siempre cae en un punto de carga)
  const Mmax = Math.max(...cargas.map(c => Math.abs(M(c.x))), 0);
  // flecha en el centro por carga unitaria virtual (integración numérica)
  const xm = (xa + xb) / 2, N = 600, h = Lv / N;
  const mv = (x) => (x < xm ? 0.5 * (x - xa) : 0.5 * (xb - x));
  let int = 0;
  for (let i = 0; i <= N; i++) {
    const x = xa + i * h, w = (i === 0 || i === N) ? 0.5 : 1;
    int += w * M(x) * mv(x) * h;
  }
  return { M: r3(Mmax), sigma: r3(Mmax / W), delta: r3(int / (E * I)), Ra: r3(Ra), Rb: r3(Rb), vano: r3(Lv) };
}

// ---------------------------------------------------------------------------
// Constructor común: RODILLO DE DESCANSOS INTERIORES (eje fijo pasante)
// ---------------------------------------------------------------------------
/** Tubo + 2 tapas-soporte prensadas + 2 rodamientos + eje fijo + casquillos +
 *  anillos DIN 471 + 2 pletinas de soporte con su collar y su tornillería. */
function rodilloEjeFijo(E, S, { nombre, y, z, spec, sop, marca }) {
  const n = { piezas: 0 };
  const add = (...a) => { E.addPart(...a); n.piezas++; };
  const ro = spec.od / 2, ri = spec.tubo.id / 2, rb = spec.rodam.od / 2;
  const [x0, x1] = spec.tuboX, len = r3(x1 - x0);
  const conj = { conjunto: `${marca} · rodillo de descansos interiores`, capa: 'user' };
  const gargantas = [];          // X de las gargantas de los anillos DIN 471

  // 1. tubo
  const MD = MANDRINADO[marca === 'CONDUCIDO' ? 'conducido' : 'retorno'] ?? MANDRINADO.retorno;
  add(`${nombre} · tubo Ø${spec.od} × ${len} (e=${spec.tubo.e})`, COL.rodillo, [x0, y, z], [
    revolve(`Tubo Ø${spec.od} e=${spec.tubo.e}`, [x0, y, z], 'x', perfilTubo(len, ro, ri)),
  ], { ...conj, material: spec.tuboDesig ?? `Tubo Ø${spec.od} × ${spec.tubo.e}`, gira: true,
    // A7 · EL INTERIOR DEL TUBO ES UNA COTA DE PLANO, NO UN DATO DE CATÁLOGO
    mandrinado: { cota: MD.cota, largo: MD.largo, donde: 'las dos testas',
      idNominal: MD.nominal, idComercial: [MD.idMin, MD.idMax], fuente: MD.fuente },
    nota: `MANDRINAR ${MD.cota} en las dos testas, en ${MD.largo} mm de longitud (asiento de la `
      + `tapa-soporte + 2 de sobrerrecorrido). NO es opcional: el interior de este tubo tal como se `
      + `compra cae entre ${MD.idMin} y ${MD.idMax} mm (banda ${MD.banda}) según las tolerancias de `
      + `${MD.fuente}, y el campo de un H7 en ese diámetro es ${MD.campoH7} mm — la incertidumbre del `
      + `tubo es ${MD.veces} veces el ajuste. Sin mandrinar, unas tapas entran sueltas y otras no entran.` });

  // 2. tapas-soporte prensadas + 3. rodamientos + 4. casquillos y anillos
  const Lt = spec.tapa.e + L.tapaLabio + spec.rodam.w;   // largo útil de la tapa
  for (const s of [0, 1]) {
    const lado = s === 0 ? '−X' : '+X';
    const xT = s === 0 ? x0 : r3(x1 - Lt);
    add(`${nombre} · tapa-soporte Ø${spec.tubo.id}/Ø${spec.rodam.od} × ${r3(Lt)} (${lado})`,
      COL.rodillo, [xT, y, z], [
        revolve(`Alojamiento Ø${spec.rodam.od} con hombro`, [xT, y, z], 'x',
          s === 0 ? perfilTapaSoporte(Lt, ri, rb, spec.rodam.bore + 12)
            : espejo(perfilTapaSoporte(Lt, ri, rb, spec.rodam.bore + 12), Lt)),
      ], { ...conj, gira: true,
        ajuste: `prensado H7/r6 contra el tubo MANDRINADO a ${MD.cota} (A7: el H7 es del `
          + `mandrinado, no del interior de catálogo del tubo — ver el campo \`mandrinado\` de `
          + `«${nombre} · tubo»). Interferencia máxima 0.073 mm → tensión de aro `
          + `≈ ${MANDRINADO.tensionAroMPa} MPa en la pared de ${spec.tubo.e}. Alternativa declarada y `
          + `NO tomada: ${MANDRINADO.alternativaDeclarada}` });

    const xR = s === 0 ? r3(x0 + L.tapaLabio) : r3(x1 - L.tapaLabio - spec.rodam.w);
    rodamiento(E, { nombre: `${spec.rodam.desig} (${nombre}, ${lado})`, at: [xR, y, z], dir: DIR,
      bore: spec.rodam.bore, od: spec.rodam.od, w: spec.rodam.w, capa: `${marca} · ` });
    n.piezas++;

    // casquillo de apoyo del aro interior + anillo DIN 471 que lo retiene
    // casquillo y anillo van SIEMPRE hacia el centro del tubo (el lado de fuera
    // lo ocupa la tapa-soporte): puestos al revés asomaban por la testa y se
    // comían el collar de apriete.
    const xC = s === 0 ? r3(xR + spec.rodam.w) : r3(xR - L.casquillo);
    add(`${nombre} · casquillo Ø${spec.eje.d + 12}/Ø${spec.eje.d} × ${L.casquillo} (${lado})`,
      COL.acero, [xC, y, z], [
        revolve('Casquillo', [xC, y, z], 'x', [[0, spec.eje.d / 2], [0, spec.eje.d / 2 + 6],
          [L.casquillo, spec.eje.d / 2 + 6], [L.casquillo, spec.eje.d / 2]]),
      ], { ...conj, hardware: false });
    const xA = s === 0 ? r3(xC + L.casquillo) : r3(xC - 1.75);
    anilloDIN471(anilloRet(E, { nombre: `${nombre} (${lado})`, at: [xA, y, z], dir: DIR, eje: spec.eje.d,
      capa: `${marca} · ` }), spec.eje.d);
    gargantas.push(xA);
    n.piezas++;
  }

  // 5. EJE FIJO pasante, CON la garganta torneada de cada anillo DIN 471
  //    (el anillo se mete 0.6 mm en el eje: si no se tornea la garganta, la
  //    verificación B-rep lo canta como interferencia — y con razón)
  //
  //    A2 · LA GARGANTA SALE DE LA TABLA, NO DE UNA FÓRMULA. Hasta 2026-08-03
  //    aquí ponía `Ø = d − 1.4` con ancho fijo 1.4. El ancho es el defecto que
  //    llega al taller: un DIN 471-30 mide s = 1.50 de espesor y NO ENTRA en
  //    una garganta de 1.40. Y en el Ø35 el fondo se quedaba en Ø33.6 cuando la
  //    norma pide Ø33.0 (t = 1.0 por lado, no 0.7). Ahora se leen d2, m y t de
  //    `gargantaDIN471` (web RING-471-01/02) y la garganta se CENTRA sobre el
  //    anillo, dejando (m − s)/2 de juego de montaje por cara.
  const G = gargantaDIN471(spec.eje.d);
  const [ex0, ex1] = spec.ejeX;
  add(`${nombre} · eje FIJO Ø${spec.eje.d} × ${r3(ex1 - ex0)}`, COL.acero, [ex0, y, z], [
    cyl(`Eje Ø${spec.eje.d} × ${r3(ex1 - ex0)}`, [ex0, y, z], DIR, spec.eje.d, r3(ex1 - ex0)),
    ...gargantas.map((xg) => revolve(`Garganta ${G.desig} ${G.cota}`,
      [r3(xg - G.juegoAxial / 2), y, z], 'x',
      [[0, r3(spec.eje.d / 2 - G.t)], [0, spec.eje.d / 2 + 2], [G.m, spec.eje.d / 2 + 2],
        [G.m, r3(spec.eje.d / 2 - G.t)]], 'cut')),
  ], { ...conj, material: spec.eje.material, gira: false,
    gargantas: { norma: G.desig, cota: G.cota, t: G.t, anilloS: G.s, juegoAxial: G.juegoAxial,
      fuente: 'web RING-471-01 (Aspen Fasteners, tabla DIN 471) + RING-471-02 (Ametric)' },
    nota: 'no gira: es el asiento de los aros interiores y el que transmite la '
      + `carga de la banda a las pletinas de soporte. Gargantas ${G.cota} de tabla `
      + `${G.desig} (fondo ${G.t} por lado); el anillo mide ${G.s} y queda `
      + `${G.juegoAxial} mm de juego axial de montaje.` });

  // 6. pletinas de soporte del eje fijo + collar de apriete + tornillería
  for (const s of [0, 1]) {
    const lado = s === 0 ? '−X' : '+X';
    const xCara = sop.caraX[s], nrm = sop.normal[s];
    const xF = nrm > 0 ? xCara : r3(xCara - sop.e);       // cara desde la que crece
    // B5 · COLISAS DE REGLAJE (sólo el CONDUCIDO, que es el rodillo de cola).
    // El taladro redondo pasa a colisa en Y: la banda se corrige oblicuando el
    // rodillo. El patrón 92×92 del alargue NO cambia — la colisa está en ESTA
    // pletina, así que pg40 no toca un solo taladro. Los rodillos de retorno
    // siguen con taladro redondo: Ammeraal prohíbe expresamente encadenar
    // dispositivos de centrado en rodillos vecinos (web CROWN-AMM-01).
    const CS = sop.colisa;
    const taladroPletina = ([sy, sz]) => {
      const yc = r3(y + sy * sop.patron / 2), zc = r3(z + sz * sop.patron / 2);
      if (!CS) return [hole(`Ø${sop.taladro}`, [r3(xF - 1), yc, zc], DIR, sop.taladro)];
      return [
        hole(`Colisa Ø${sop.taladro} (extremo −Y)`, [r3(xF - 1), r3(yc - CS.carrera), zc], DIR, sop.taladro),
        hole(`Colisa Ø${sop.taladro} (extremo +Y)`, [r3(xF - 1), r3(yc + CS.carrera), zc], DIR, sop.taladro),
        box(`Colisa ${CS.largo}×${sop.taladro} (alma)`, [r3(xF + sop.e / 2), yc, r3(zc - sop.taladro / 2)],
          r3(sop.e + 2), r3(2 * CS.carrera), sop.taladro, 'cut'),
      ];
    };
    add(`${nombre} · pletina de soporte ${sop.lado}×${sop.lado}×${sop.e} (${lado})`,
      COL.chapa, [xF, y, z], [
        sketchYZ(`Pletina ${sop.lado}×${sop.lado}`, xF,
          rectR(y - sop.lado / 2, z - sop.lado / 2, y + sop.lado / 2, z + sop.lado / 2, 10), sop.e),
        hole(`Barreno Ø${sop.bore} H8`, [r3(xF - 1), y, z], DIR, sop.bore),
        ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(taladroPletina),
      ], { ...conj, material: 'Acero S275JR cortado por láser',
        ...(CS ? { reglaje: { tipo: 'colisa en Y (dirección de la banda)', carreraMm: CS.carrera,
          largoColisa: CS.largo, oblicuidadMaxDeg: CS.oblicuidadMaxDeg, vanoEntrePletinas: CS.vano } } : {}),
        nota: `se atornilla al patrón ${sop.patron}×${sop.patron} del alargue PG40`
          + (CS ? `. LOS 4 TALADROS SON COLISAS de ${CS.largo}×${sop.taladro} en Y: ±${CS.carrera} mm `
            + `de carrera por pletina. Moviendo las dos a la vez se hace take-up; moviéndolas en `
            + `sentidos opuestos se oblicua el rodillo hasta ${CS.oblicuidadMaxDeg}° sobre el vano de `
            + `${CS.vano} mm entre pletinas, que es EL REGLAJE DE ALINEACIÓN DE BANDA que no existía `
            + `(hallazgo B5). El centrado grueso lo da la corona del tambor motriz; esto es el retoque `
            + `y sale de fábrica a cero. ${CS.nota}` : '') });

    // El collar va pegado a la cara INTERIOR de su pletina, en el hueco de 20
    // que deja la testa del tubo (por eso la cara es 360 y no 380). Los dos
    // collares capturan el eje: si corre hacia −X topa el de −X contra su
    // pletina, y si corre hacia +X topa el de +X contra la suya. Por fuera no
    // caben — ahí está el alma del alargue y, en +X, el chapón de descarga.
    const xCol = nrm > 0 ? r3(xF + sop.e) : r3(xF - L.collarL);
    const rCol = spec.collarDe / 2;      // cat COLL-SPLIT-01 (antes: eje/2 + 10, sin fuente)
    add(`${nombre} · collar de apriete PARTIDO Ø${spec.eje.d} int × Ø${spec.collarDe} × ${L.collarL} (${lado})`,
      COL.inox, [xCol, y, z], [
        revolve('Collar partido (2 mitades)', [xCol, y, z], 'x',
          [[0, spec.eje.d / 2], [0, rCol], [L.collarL, rCol], [L.collarL, spec.eje.d / 2]]),
      ], { ...conj, hardware: true, norma: spec.collar, componente: spec.collar,
        ajusteMontaje: 'las 2 mitades se colocan a caballo del eje y se cierran con sus 2 tornillos '
          + 'M6×18 DIN 912 12.9; unión por fricción, no marca el eje',
        nota: `retiene axialmente el eje fijo contra la cara interior de su pletina. TIENE QUE SER `
          + `PARTIDO: el hueco donde vive son los 20 mm entre la testa `
          + `del tubo y la pletina, con el eje ya pasado por los dos soportes — un collar macizo `
          + `habría que enfilarlo desde una testa del eje y ahí topan el alma del alargue y, en +X, `
          + `el chapón de descarga. Se designaba «DIN 705 A», que es justo el anillo MACIZO con `
          + `prisionero, y por eso la línea no se podía pedir (hallazgo A3). Envolvente real sobre la `
          + `cabeza del tornillo: Ø${spec.collarR} (declarado; el modelo lleva el cuerpo Ø${spec.collarDe}).` });

    // TORNILLERÍA: el vástago tiene que ATRAVESAR lo que aprieta —la pletina de
    // `sop.e` más el alma de 8 del alargue PG40— y la cabeza queda hacia el
    // interior de la máquina. Estaba al revés: la cabeza dentro de la pletina y
    // los 40 mm de vástago saliendo AL AIRE hacia dentro, sin coser nada. En el
    // lado +X esos 40 mm llegaban a X 439.418 y le entraban a la banda plana de
    // la calle 5 (X 415.856…447.856) — 0.053 cm³ en el informe B-rep, con el
    // lazo ya retrazado. Largo = pletina + alma + 5 de rosca sobrante.
    const pd = sop.taladro > 12 ? L.pernoSop : L.pernoRet;
    const eAlma = 8;                      // pg40 ALARGUE.e (alma/cabezal de 8)
    const largoP = r3(sop.e + eAlma + 5);
    const xCab = nrm > 0 ? r3(xF + sop.e) : xF;     // cara de la pletina que da
    //   al INTERIOR de la máquina: de ahí arranca el vástago hacia la chapa
    for (const [sy, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      pernoHex(E, { nombre: `${pd.d === 12 ? 'M12' : 'M10'} soporte ${nombre} (${lado})`,
        at: [xCab, r3(y + sy * sop.patron / 2), r3(z + sz * sop.patron / 2)],
        dir: [-nrm, 0, 0], dia: pd.d, largo: largoP, af: pd.af, altoCab: pd.hh, capa: `${marca} · ` });
      n.piezas++;
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// RODILLO ELEVADOR DEL RAMAL DE RETORNO — conjunto Hytrol B-20760
// ---------------------------------------------------------------------------
// NO se reutiliza `rodilloEjeFijo`: ése fabrica el rodillo (tubo mandrinado H7,
// tapas prensadas r6, eje C45 con gargantas DIN 471 torneadas) y esto NO se
// fabrica — se COMPRA. Es la misma referencia que la transferencia ya lleva
// montada (nbt90/rodillos.mjs §2), la que el cliente señala en su croquis, y su
// función declarada en el propio despiece de Hytrol es exactamente ésta:
// «limita los ramales de retorno de las bandas del anfitrión».
//
// Lo ÚNICO propio del sorter es cómo se cuelga: las dos pletinas 100×100×12 del
// patrón 76×76 / Ø11 que el alargue PG40 ya taladra para los rodillos de retorno
// —el mismo amarre, cambiando el barreno de Ø30 a Ø12.7—, más su collar partido.
function rodilloElevador(E, { id, y, z }) {
  const n = { piezas: 0 };
  const add = (...a) => { E.addPart(...a); n.piezas++; };
  const S = ELEVADORES;
  const ro = S.r, ri = r3(S.r - S.pared);        // 24.13 / 22.48
  const [x0, x1] = S.tuboX, len = r3(x1 - x0);   // 99.456…459.456 · 360
  const conj = { conjunto: `${id} · rodillo elevador ${S.ref}`, capa: 'web' };
  const marca = `${id} · `;

  // 1. tubo galvanizado (COMPRADO — componente del conjunto B-20760)
  add(`ELEVADOR ${id} · Rodillo de retorno B-20760 Ø1.9" × ${len} (eleva el ramal al corredor)`,
    COL.rodillo, [x0, y, z], [
      revolve(`Tubo galvanizado Ø${S.dia} × ${len} (pared ${S.pared})`, [x0, y, z], 'x',
        perfilTubo(len, ro, ri)),
    ], { ...conj, componente: 'B-20760', gira: true,
      material: 'tubo de acero galvanizado 0.065"',
      nota: `TANGENTE POR ARRIBA al ramal de retorno en Z ${r3(z + ro)} = suelo del corredor del `
        + `peine. Es la MISMA referencia que el NBT90 monta contra los ramales de retorno de su `
        + `anfitrión y la que el cliente señala («tenías uno en el modelo anterior, esa era `
        + `función»). Rueda sobre la CARA PORTANTE de la banda y le hace flexión INVERSA: `
        + `Ø ${S.dia} contra el mínimo de polea ${BANDA.poleaMinimaMm} de la banda `
        + `(web BELT-SAB8E-01), margen ×${S.flexionInversa.margen}. La fuente NO publica mínimo de `
        + `CONTRAFLEXIÓN: queda declarado, no supuesto` });

  // 2. tapas-soporte + 3. rodamientos ABEC-1 + 4. casquillos separadores
  const Lt = r3(S.tapa.e + L.tapaLabio + S.rodam.w);
  for (const s of [0, 1]) {
    const lado = s === 0 ? '−X' : '+X';
    const xT = s === 0 ? x0 : r3(x1 - Lt);
    add(`ELEVADOR ${id} · Tapa-soporte Ø${r3(2 * ri)}/Ø${S.rodam.od} × ${Lt} (${lado})`,
      COL.rodillo, [xT, y, z], [
        revolve(`Alojamiento Ø${S.rodam.od} con hombro`, [xT, y, z], 'x',
          s === 0 ? perfilTapaSoporte(Lt, ri, r3(S.rodam.od / 2), r3(S.rodam.bore + 6))
            : espejo(perfilTapaSoporte(Lt, ri, r3(S.rodam.od / 2), r3(S.rodam.bore + 6)), Lt)),
      ], { ...conj, componente: 'B-20760', gira: true,
        ajuste: `prensado en el tubo Ø${r3(2 * ri)} (conjunto de catálogo: el ajuste lo da el `
          + 'fabricante del rodillo, aquí no se especifica un H7/r6 de plano)' });

    const xR = s === 0 ? r3(x0 + L.tapaLabio) : r3(x1 - L.tapaLabio - S.rodam.w);
    rodamiento(E, { nombre: `${S.rodam.desig} ABEC-1 (ELEVADOR ${id}, ${lado})`, at: [xR, y, z],
      dir: DIR, bore: S.rodam.bore, od: S.rodam.od, w: S.rodam.w, capa: marca });
    n.piezas++;

    // casquillo separador sobre el eje FIJO: topa contra el aro interior (que
    // tampoco gira) y contra la pletina. Es el que impide que el tubo camine.
    const xC = s === 0 ? r3(xR + S.rodam.w) : r3(xR - L.casquillo);
    add(`ELEVADOR ${id} · Casquillo separador Ø${r3(S.eje.d + 5)}/Ø${S.eje.d} × ${L.casquillo} (${lado})`,
      COL.acero, [xC, y, z], [
        revolve('Casquillo', [xC, y, z], 'x', [[0, S.eje.d / 2], [0, r3(S.eje.d / 2 + 2.5)],
          [L.casquillo, r3(S.eje.d / 2 + 2.5)], [L.casquillo, S.eje.d / 2]]),
      ], { ...conj, componente: 'B-20760', hardware: false,
        funcion: 'retención axial del tubo entre el aro interior del rodamiento y la pletina' });
  }

  // 5. EJE FIJO Ø12.7 con hilo interior 1/4-20 en las dos puntas (catálogo)
  const [ex0, ex1] = S.ejeX;
  add(`ELEVADOR ${id} · Eje de rodillo de retorno Ø${S.eje.d} × ${r3(ex1 - ex0)} (hilo interior 1/4-20)`,
    COL.acero, [ex0, y, z], [
      cyl(`Barra Ø${S.eje.d} × ${r3(ex1 - ex0)}`, [ex0, y, z], DIR, S.eje.d, r3(ex1 - ex0)),
    ], { ...conj, componente: 'B-20760', material: S.eje.material, gira: false, rosca: S.rosca,
      nota: 'no gira: es el asiento de los aros interiores y el que pasa la carga del ramal a las '
        + 'pletinas. Las dos puntas llevan el hilo interior del catálogo ED&T' });

  // 6. pletinas de soporte + collar partido + tornillería (PIEZA PROPIA)
  const sop = S.soporte;
  for (const s of [0, 1]) {
    const lado = s === 0 ? '−X' : '+X';
    const xCara = sop.caraX[s], nrm = sop.normal[s];
    const xF = nrm > 0 ? xCara : r3(xCara - sop.e);
    add(`ELEVADOR ${id} · pletina de soporte ${sop.lado}×${sop.lado}×${sop.e} (${lado})`,
      COL.chapa, [xF, y, z], [
        sketchYZ(`Pletina ${sop.lado}×${sop.lado}`, xF,
          rectR(y - sop.lado / 2, z - sop.lado / 2, y + sop.lado / 2, z + sop.lado / 2, 10), sop.e),
        hole(`Barreno Ø${sop.bore} H8`, [r3(xF - 1), y, z], DIR, sop.bore),
        ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sy, sz]) =>
          hole(`Ø${sop.taladro}`, [r3(xF - 1), r3(y + sy * sop.patron / 2), r3(z + sz * sop.patron / 2)],
            DIR, sop.taladro)),
      ], { conjunto: `${id} · rodillo elevador`, capa: 'user', fabricada: true,
        material: 'Acero S275JR cortado por láser',
        nota: `se atornilla al patrón ${sop.patron}×${sop.patron} del alargue PG40 — EL MISMO que el `
          + `bastidor ya taladra para los rodillos de retorno, sólo que en la Y del elevador. Barreno `
          + `Ø${sop.bore} H8 (antes Ø30: el conjunto B-20760 lleva eje de 1/2")` });

    const xCol = nrm > 0 ? r3(xF + sop.e) : r3(xF - 11);
    add(`ELEVADOR ${id} · collar de apriete PARTIDO Ø${S.eje.d} int × Ø${S.collarDe} × 11 (${lado})`,
      COL.inox, [xCol, y, z], [
        revolve('Collar partido (2 mitades)', [xCol, y, z], 'x',
          [[0, S.eje.d / 2], [0, S.collarDe / 2], [11, S.collarDe / 2], [11, S.eje.d / 2]]),
      ], { conjunto: `${id} · rodillo elevador`, capa: 'user', hardware: true,
        norma: S.collar, componente: S.collar,
        nota: `retención axial del eje fijo contra la cara interior de su pletina. PARTIDO por la `
          + `misma razón que los del conducido y los retornos: entra con el eje ya pasado. `
          + `Envolvente sobre la cabeza del tornillo Ø${S.collarR}` });

    const eAlma = 8;                                   // pg40 ALARGUE.e
    const largoP = r3(sop.e + eAlma + 5);
    const xCab = nrm > 0 ? r3(xF + sop.e) : xF;
    for (const [sy, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      pernoHex(E, { nombre: `M10 soporte ELEVADOR ${id} (${lado})`,
        at: [xCab, r3(y + sy * sop.patron / 2), r3(z + sz * sop.patron / 2)],
        dir: [-nrm, 0, 0], dia: L.pernoRet.d, largo: largoP, af: L.pernoRet.af,
        altoCab: L.pernoRet.hh, capa: marca });
      n.piezas++;
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Módulo
// ---------------------------------------------------------------------------
export function tambores(E) {
  const n = { tambor: 0, conducido: 0, retorno: 0, hardware: 0 };
  const add = (...a) => { E.addPart(...a); };
  const zT = TAMBORES.motriz.z, zC = TAMBORES.conducido.z;
  const pernosUcf = [];                // B3 — cuenta de salida de hilo, se publica

  // =========================================================================
  // 1. EL TAMBOR MOTRIZ
  // =========================================================================
  const [tx0, tx1] = TAMBOR.tuboX, tLen = r3(tx1 - tx0);
  const [gx0, gx1] = TAMBOR.gomaX, gLen = r3(gx1 - gx0);
  const RO = TAMBOR.tubo.od / 2, RI = TAMBOR.tubo.id / 2, RV = TAMBOR.r;
  const conjT = { conjunto: 'TAMBOR MOTRIZ Ø108.9 engomado', capa: 'user' };

  add(`TAMBOR · tubo Ø${TAMBOR.tubo.od} × ${tLen} (e=${TAMBOR.tubo.e})`, COL.rodillo,
    [tx0, 0, zT], [
      revolve(`Tubo Ø${TAMBOR.tubo.od} e=${TAMBOR.tubo.e}`, [tx0, 0, zT], 'x',
        perfilTubo(tLen, RO, RI)),
    ], { ...conjT, material: TAMBOR.tuboDesig, gira: true,
      // A7 · igual que en los rodillos de eje fijo: el asiento de las dos tapas
      // soldadas se MANDRINA. Aquí la tapa va soldada, no prensada, pero la
      // cota sigue mandando: es la que centra el disco antes de soldar y de la
      // que sale la excentricidad del tambor con la banda encima.
      mandrinado: { cota: MANDRINADO.tambor.cota, largo: MANDRINADO.tambor.largo,
        donde: 'las dos testas', idNominal: MANDRINADO.tambor.nominal,
        idComercial: [MANDRINADO.tambor.idMin, MANDRINADO.tambor.idMax],
        fuente: MANDRINADO.tambor.fuente },
      nota: `MANDRINAR ${MANDRINADO.tambor.cota} en las dos testas, ${MANDRINADO.tambor.largo} mm de `
        + `longitud, y ANTES de que entren las dos tapas (la secuencia va en la tapa). El interior de `
        + `catálogo de este tubo cae entre `
        + `${MANDRINADO.tambor.idMin} y ${MANDRINADO.tambor.idMax} (banda ${MANDRINADO.tambor.banda} mm, `
        + `${MANDRINADO.tambor.fuente}) y el campo de un H7 en ese Ø es ${MANDRINADO.tambor.campoH7}: `
        + `${MANDRINADO.tambor.veces} veces mayor. Sin esa cota el disco de tapa no se centra.` });
  n.tambor++;

  const K = TAMBOR.corona;
  add(`TAMBOR · engomado ${TAMBOR.engomado} → Ø${TAMBOR.od} × ${gLen} (cara útil, ${EJES.length} coronas de ${K.h})`, COLGOMA,
    [gx0, 0, zT], [
      revolve(`Vulcanizado e=${TAMBOR.engomado} → Ø${TAMBOR.od} con ${EJES.length} coronas`, [gx0, 0, zT], 'x',
        perfilGoma(gLen, RO, RV, gx0)),
    ], { ...conjT, material: TAMBOR.gomaDesig, gira: true,
      mecanizado: `torneado del vulcanizado a ${EJES.length} CORONAS TRAPEZOIDALES, una por eje de calle `
        + `(X ${EJES.join(' · ')}): cima Ø${TAMBOR.od} en ${K.cilindrica} mm de cilindro, dos conos de `
        + `${K.cono} que bajan ${K.h} (pendiente 1:${Math.round(1 / K.pendiente)}), ancho total de corona `
        + `${K.ancho} y valle plano de ${K.separacionEntreCoronas} a Ø${K.rebajeOd}. Radio equivalente si `
        + `se prefiere tornear radial: R = ${K.radioEquivalente}.`,
      corona: { hMm: K.h, anchoMm: K.ancho, cilindricaMm: K.cilindrica, conoMm: K.cono,
        rebajeOd: K.rebajeOd, radioEquivalente: K.radioEquivalente,
        fuente: 'web CROWN-HAB-01 (Habasit) + CROWN-AMM-01 (Ammeraal)' },
      nota: `cubre las 5 bandas (X ${FIJO.bandasX[0]}…${FIJO.bandasX[1]}) con `
        + `${TAMBOR.margenBanda} mm de margen de deriva por lado. ES EL MEDIO DE CENTRADO de la máquina: `
        + `hasta ahora el tambor era CILÍNDRICO y una polea cilíndrica no ejerce ningún efecto de `
        + `centrado (web CROWN-HAB-01), así que las 5 bandas derivaban sin nada con que corregirlas `
        + `(hallazgo B5). La corona va POR CALLE y no una sola sobre los ${TAMBOR.caraGoma}: con una `
        + `corona única las 5 bandas migrarían hacia el centro del tambor —las de fuera están a ±152.4— `
        + `y se montarían unas sobre otras. La cima queda en Ø${TAMBOR.od} exacto, así que el lazo, los `
        + `abrazados y el plano de transporte no se mueven ni una décima.` });
  n.tambor++;

  // tapas soldadas: entran en el tubo y abrazan el eje por su cubo
  for (const s of [0, 1]) {
    const lado = s === 0 ? '−X' : '+X';
    const xT = s === 0 ? r3(tx0 + TAMBOR.tapa.inset) : r3(tx1 - TAMBOR.tapa.inset);
    const perf = perfilTapaSoldada(TAMBOR.tapa.e, RI, TAMBOR.tapa.bore,
      TAMBOR.tapa.cuboOd, TAMBOR.tapa.cuboL);
    add(`TAMBOR · tapa soldada Ø${TAMBOR.tubo.id}/Ø${TAMBOR.tapa.bore} e=${TAMBOR.tapa.e} (${lado})`,
      COL.chapa, [xT, 0, zT], [
        revolve('Disco de tapa con cubo', [xT, 0, zT], 'x', s === 0 ? perf : perf.map(([h, r]) => [-h, r])),
      ], { ...conjT, material: TAMBOR.tapaDesig, gira: true,
        ajuste: `torneado Ø${TAMBOR.tubo.id} h8 contra el tubo MANDRINADO a ${MANDRINADO.tambor.cota} `
          + `(A7). El h8 se acota contra la cota del mandrinado, no contra el interior de catálogo del `
          + `tubo, que tiene ${MANDRINADO.tambor.banda} mm de banda (${MANDRINADO.tambor.fuente}).`,
        nota: 'soldada al tubo y al eje: el tambor y su eje son un solo cuerpo, '
          + 'que es lo que permite meter el par por el saliente. El asiento del disco en el tubo va '
          + `MANDRINADO ${MANDRINADO.tambor.cota} (ver el campo \`mandrinado\` del tubo).` });
    n.tambor++;
  }

  // eje Ø35 pasante con el chavetero del accionamiento
  const [ex0, ex1] = TAMBOR.ejeX;
  const [kx0, kx1] = TAMBOR.chaveteroX;
  add(`TAMBOR · eje Ø${TAMBOR.eje.d} × ${r3(ex1 - ex0)} con saliente y chavetero`, COL.acero,
    [ex0, 0, zT], [
      cyl(`Eje Ø${TAMBOR.eje.d}`, [ex0, 0, zT], DIR, TAMBOR.eje.d, r3(ex1 - ex0)),
      box(`Chavetero ${TAMBOR.chavetero}`, [r3((kx0 + kx1) / 2), 0, r3(zT + TAMBOR.eje.d / 2 - 5)],
        r3(kx1 - kx0), 10, 6, 'cut'),
    ], { ...conjT, material: TAMBOR.eje.material, gira: true,
      componente: `eje_tambor_${TAMBOR.eje.d}`,
      nota: `saliente Ø35 ${TAMBOR.saliente.ajuste} en X ${TAMBOR.saliente.x[0]}…${TAMBOR.saliente.x[1]} `
        + `para ${TAMBOR.motorreductor}` });
  n.tambor++;

  add(`TAMBOR · chaveta ${TAMBOR.chavetero}`, COL.tornillo,
    [kx0, 0, r3(zT + TAMBOR.eje.d / 2 - 5)], [
      box('Chaveta 10×8', [r3((kx0 + kx1) / 2), 0, r3(zT + TAMBOR.eje.d / 2 - 5)],
        r3(kx1 - kx0), 10, 8),
    ], { hardware: true, norma: 'DIN 6885 A', capa: 'user' });
  n.hardware++;

  // --- las dos unidades UCF 207 -------------------------------------------
  for (const s of [0, 1]) {
    const lado = s === 0 ? '−X' : '+X';
    const xCara = UCF207.caraX[s], nrm = UCF207.normal[s];
    // la brida crece DESDE la cara de apoyo hacia fuera
    const xF = nrm > 0 ? xCara : r3(xCara - UCF207.bridaE);
    const xBoss = nrm > 0 ? r3(xCara + UCF207.bridaE) : r3(xCara - UCF207.bridaE);
    const semi = UCF207.semi, half = UCF207.brida / 2;
    add(`TAMBOR · ${UCF207.desig} — unidad de brida cuadrada (${lado})`, COL.fijo, [xF, 0, zT], [
      sketchYZ(`Brida ${UCF207.brida}×${UCF207.brida}×${UCF207.bridaE}`, xF,
        rectR(-half, r3(zT - half), half, r3(zT + half), L.bridaR), UCF207.bridaE),
      cyl(`Cuerpo Ø90 × ${r3(UCF207.saliente - UCF207.bridaE)}`, [xBoss, 0, zT], [nrm, 0, 0],
        90, r3(UCF207.saliente - UCF207.bridaE)),
      hole(`Alojamiento Ø${UCF207.insertoOd}`, [r3(xCara - nrm * 1), 0, zT], [nrm, 0, 0], UCF207.insertoOd),
      ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sy, sz]) =>
        hole(`Taladro Ø${UCF207.N}`, [r3(xF - 1), r3(sy * semi), r3(zT + sz * semi)], DIR, UCF207.N)),
    ], { capa: 'web', hardware: true, componente: 'ucf207',
      norma: UCF207.norma, designacion: UCF207.desig,
      nota: `cara de apoyo X=${xCara}, cuerpo hacia ${lado} (montaje OUTBOARD: `
        + 'hacia dentro el cuerpo se comería 1.68 mm de la cara útil del tambor)' });
    n.hardware++;

    // el inserto UC207 (rodamiento de aro exterior esférico con prisioneros)
    const xIns = r3(UCF207.insertoX[s] - UCF207.Bi / 2);
    rodamiento(E, { nombre: `UC207 del ${UCF207.desig} (${lado})`, at: [xIns, 0, zT], dir: DIR,
      bore: UCF207.bore, od: UCF207.insertoOd, w: UCF207.Bi, capa: 'TAMBOR · ' });
    n.hardware++;

    // 4 pernos M12 pasantes: la cabeza apoya en la cara EXTERIOR de la brida y
    // el vástago atraviesa brida + lo que haya detrás (−X: 8 de alargue; +X: 8
    // de alargue + 28 de chapón de descarga), con la tuerca por dentro.
    const xExt = nrm > 0 ? r3(xF + UCF207.bridaE) : xF;    // cara exterior de la brida
    const espApoyo = s === 0 ? L.apoyoUcf.neg : L.apoyoUcf.pos;
    // B3 (revisión de compras): el largo era EXACTAMENTE brida + apoyo + tuerca,
    // así que la tuerca acababa a 0.00 mm del último hilo y el perno no se podía
    // apretar al par (el último hilo va incompleto por el biselado). Ahora sale
    // de la cuenta, con 2 pasos de salida, y sube al escalón normalizado.
    const PU = pernoConSalida(L.pernoUcf.d, UCF207.bridaE + espApoyo, L.tuercaH);
    const largo = PU.largo;
    pernosUcf.push({ lado, ...PU });
    for (const [sy, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const yz = [r3(sy * semi), r3(zT + sz * semi)];
      pernoHex(E, { nombre: `M12×${largo} ${UCF207.desig} (${lado})`, at: [xExt, ...yz],
        dir: [-nrm, 0, 0], dia: L.pernoUcf.d, largo, af: L.pernoUcf.af, altoCab: L.pernoUcf.hh,
        capa: 'TAMBOR · ' })
        .nota = `apriete real ${PU.apriete} = brida UCF ${UCF207.bridaE} + ${espApoyo} de apoyo `
          + `(${s === 0 ? 'alma del alargue' : 'alma del alargue 8 + chapón de descarga 28'}). Con la `
          + `tuerca de ${L.tuercaH} y 2 pasos de salida el mínimo es ${PU.minTeorico} → escalón `
          + `normalizado M12×${largo} (ISO 888), que sobresale ${PU.salidaMm} mm = ${PU.salidaPasos} `
          + `pasos. ANTES era M12×${r3(UCF207.bridaE + espApoyo + L.tuercaH)}: la tuerca acababa a `
          + `0.00 mm del último hilo (hallazgo B3 de la revisión de compras).`;
      tuercaHex(E, { nombre: `M12 ${UCF207.desig} (${lado})`,
        at: [r3(xExt - nrm * (UCF207.bridaE + espApoyo)), ...yz],
        dir: [-nrm, 0, 0], dia: 12, af: L.pernoUcf.af, alto: L.tuercaH, capa: 'TAMBOR · ' })
        .nota = `el perno la rebasa ${PU.salidaMm} mm (${PU.salidaPasos} pasos de rosca). SALIDA DE `
          + 'HILO mínima 2 pasos: es lo que exige el apriete al par y lo que mira la inspección.';
      n.hardware += 2;
    }
  }

  // =========================================================================
  // 2. EL RODILLO CONDUCIDO (descansos interiores, eje fijo pasante)
  // =========================================================================
  const nc = rodilloEjeFijo(E, null, {
    nombre: `CONDUCIDO Ø${CONDUCIDO.od}`, y: FIJO.conducidaY, z: zC,
    spec: CONDUCIDO, sop: CONDUCIDO.soporte, marca: 'CONDUCIDO',
  });
  n.conducido += nc.piezas;

  // =========================================================================
  // 3. LOS RODILLOS DEL RAMAL DE RETORNO
  //    · con RETIRA_POZO.activo  → los DOS ELEVADORES B-20760 del corredor;
  //    · con la bandera a false  → los CUATRO rodillos de pozo Ø88.9.
  //    La lista y su geometría las publica params_tambores; aquí sólo se emite.
  // =========================================================================
  for (const R of TAMBORES.retorno) {
    const nr = RETIRA_POZO.activo
      ? rodilloElevador(E, { id: R.id, y: R.y, z: R.z })
      : rodilloEjeFijo(E, null, {
        nombre: `RETORNO ${R.id} Ø${RETORNOS.od}`, y: R.y, z: R.z,
        spec: RETORNOS, sop: RETORNOS.soporte, marca: `RETORNO ${R.id}`,
      });
    n.retorno += nr.piezas;
  }

  // =========================================================================
  // 4. VERIFICACIÓN (se reporta; los incumplimientos los levanta el integrador)
  // =========================================================================
  const err = [];

  // 4.1 la cara engomada cubre las 5 bandas con margen
  if (TAMBOR.gomaX[0] > FIJO.bandasX[0] || TAMBOR.gomaX[1] < FIJO.bandasX[1]) {
    err.push(`la cara engomada (${TAMBOR.gomaX.join('…')}) no cubre las 5 bandas `
      + `(${FIJO.bandasX.join('…')})`);
  }
  if (TAMBOR.margenBanda < FIJO.bandaAncho / 2) {
    err.push(`margen de deriva ${TAMBOR.margenBanda} < media banda (${FIJO.bandaAncho / 2})`);
  }

  // 4.2 el tambor y el conducido ponen el DORSO en el plano de rodadura
  for (const [nom, z, r] of [['tambor', zT, TAMBOR.r], ['conducido', zC, CONDUCIDO.r]]) {
    const dorso = r3(z + r);
    if (Math.abs(dorso - FIJO.planoDorso) > 0.01) {
      err.push(`el ${nom} pone el dorso de la banda en Z=${dorso}, no en ${FIJO.planoDorso}`);
    }
  }

  // 4.3 caben entre los largueros del bastidor PG40 (si ya publicó)
  const holgLarguero = {};
  if (PG?.TRAMOS) {
    holgLarguero.norte = r3(Math.abs(PG.TRAMOS.norte[1]) - TAMBOR.r);          // 58 − 54.45
    holgLarguero.sur = r3(Math.abs(FIJO.conducidaY - PG.TRAMOS.sur[0]) - CONDUCIDO.r);
    if (holgLarguero.norte < 2) err.push(`el tambor roza el larguero norte: ${holgLarguero.norte} mm`);
    if (holgLarguero.sur < 2) err.push(`el conducido roza el larguero sur: ${holgLarguero.sur} mm`);
  }

  // 4.4 el TRAMO LLANO del ramal de retorno (el que sale del tambor y del que
  //     cuelga el tensor) pasa por DEBAJO de los perfiles del bastidor. Con el
  //     retorno recto sigue existiendo y sigue siendo el que se juega esta
  //     holgura: la RAMPA que sube al corredor arranca pasado el volante de
  //     salida de la horquilla, y su holgura al bastidor la mide la §R sobre el
  //     contorno emitido, que es la única forma honesta de comprobar una rampa.
  const holgPerfil = PG?.Z ? r3(PG.Z.travBot - RETORNO.z) : null;
  if (holgPerfil !== null && holgPerfil < 2) {
    err.push(`el tramo llano del ramal de retorno (Z ${RETORNO.z}) no libra el fondo del perfil `
      + `(${PG.Z.travBot}): ${holgPerfil} mm`);
  }

  // 4.5 SEGÚN LA ARQUITECTURA DEL RETORNO:
  const rRet = RETIRA_POZO.activo ? ELEVADORES.r : RETORNOS.r;
  const holgModulo = {};
  let holgFondo = null;
  if (RETIRA_POZO.activo) {
    // (a) RETORNO RECTO — los dos elevadores dejan la banda TANGENTE al suelo
    //     del corredor, y ese suelo lo fija el techo del motorreductor SEW.
    for (const R of TAMBORES.retorno) {
      const tang = r3(R.z + rRet);
      if (Math.abs(tang - CORREDOR.zCara) > 0.01) {
        err.push(`${R.id} pone la cara portante del ramal en Z=${tang} y el suelo del corredor `
          + `es ${CORREDOR.zCara}`);
      }
      // el elevador NO puede subir por encima del suelo del corredor (chocaría
      // con el propio ramal recto) ni bajar tanto que deje de tocarlo
      holgModulo[R.id] = r3(Math.min(
        Math.abs(r3(R.y - rRet) - FIJO.moduloY[0]), Math.abs(r3(R.y + rRet) - FIJO.moduloY[1])));
    }
    // (b) el ramal recto cabe entre el techo del SEW y la pletina del puente
    if (CORREDOR.holguraRanura < 2) {
      err.push(`el ramal recto deja ${CORREDOR.holguraRanura} mm al fondo de la ranura del peine (mín 2)`);
    }
    if (CORREDOR.holguraPuente < 2) {
      err.push(`el ramal recto deja ${CORREDOR.holguraPuente} mm a la pletina del puente (mín 2)`);
    }
    // (c) FLEXIÓN INVERSA: el Ø del elevador contra el mínimo de polea de la banda
    if (!ELEVADORES.flexionInversa.cumple) {
      err.push(`el rodillo elevador Ø${ELEVADORES.dia} baja del Ø mínimo de polea de la banda `
        + `(${BANDA.poleaMinimaMm}, web BELT-SAB8E-01) — y encima en flexión INVERSA`);
    }
  } else {
    // pozo: el ramal de fondo libra la cara inferior del NBT90 y los rodillos
    // quedan FUERA de la huella del módulo
    const zFondoAlto = r3(TAMBORES.retorno[1].z - RETORNOS.r);
    holgFondo = r3(FIJO.fondoNbt90 - zFondoAlto);
    if (holgFondo < 2) err.push(`el ramal de fondo pasa a ${holgFondo} mm del fondo del NBT90 (mín 2)`);
    for (const R of TAMBORES.retorno) {
      const yLo = r3(R.y - rRet), yHi = r3(R.y + rRet);
      if (yHi > FIJO.moduloY[0] && yLo < FIJO.moduloY[1]) {
        err.push(`${R.id} (Y ${yLo}…${yHi}) invade la huella del NBT90 (${FIJO.moduloY.join('…')})`);
      }
      holgModulo[R.id] = r3(Math.min(Math.abs(yLo - FIJO.moduloY[1]), Math.abs(yHi - FIJO.moduloY[0])));
    }
  }

  // 4.6 ABRAZADOS reales del lazo (calc por tangencia, con la misma matemática
  //     que usa lib.mjs para las bandas de la transferencia). El SENTIDO de
  //     envolvente ya no se deduce del índice (era `i === 0 || i === 3`, o sea
  //     «RR1 y RR4»): se LEE de la tabla, que es quien lo publica. Así el día
  //     que la tabla cambie —como acaba de cambiar— esto no miente.
  const seq = [
    { c: [FIJO.motrizY, zT], r: TAMBOR.r, s: -1 },
    ...TAMBORES.retorno.map(R => ({ c: [R.y, R.z], r: rRet, s: -R.s })),
    { c: [FIJO.conducidaY, zC], r: CONDUCIDO.r, s: -1 },
  ];
  let env = null;
  try { env = envolventes(seq, FIJO.bandaEsp); } catch (e2) { err.push(`lazo sin tangente: ${e2.message}`); }
  const abrazados = env ? Object.fromEntries([
    ['tambor', env[0]],
    ...TAMBORES.retorno.map((R, i) => [R.id, env[i + 1]]),
    ['conducido', env[env.length - 1]],
  ]) : null;
  // ⚠ ESTE LAZO NO LLEVA LA HORQUILLA DEL TENSOR, y desde el 05-08-2026 eso
  // importa. Mientras el retorno bajaba al pozo, el ramal salía HORIZONTAL del
  // tambor hacia RR1 y este lazo simplificado daba el mismo 180° que el real.
  // Con el retorno recto, quien mantiene horizontal el ramal a la salida del
  // tambor son los DOS VOLANTES DE LA HORQUILLA (mod_calles), que aquí no están:
  // sin ellos el ramal subiría directo del tambor al elevador y este cálculo
  // daría un abrazado que NO es el de la máquina. Así que la comprobación del
  // abrazado del tambor se hace donde se puede hacer de verdad —la §J del
  // integrador, sobre `mod_calles.banda.envolventes_deg`, que es el lazo COMPLETO
  // y emitido— y aquí queda el valor como DIAGNÓSTICO, marcado como tal.
  const abrazadosNota = 'lazo SIN la horquilla del tensor (diagnóstico). El abrazado que manda es el '
    + 'del lazo completo que publica mod_calles y verifica la §J del integrador';
  if (!RETIRA_POZO.activo && abrazados
      && Math.abs(abrazados.tambor - RETORNO.abrazadoMotrizDeg) > 1) {
    err.push(`el abrazado publicado sobre el tambor (${RETORNO.abrazadoMotrizDeg}°) no es el `
      + `de la geometría (${abrazados.tambor}°)`);
  }

  // 4.7 ¿arrastra sin patinar? Euler–Eytelwein sobre el tambor engomado.
  //     El abrazado que entra aquí es el PUBLICADO (180°), no el del lazo
  //     simplificado de 4.6 — ver la nota de arriba. Que el publicado sea el real
  //     lo comprueba la §J contra el contorno emitido, y si no lo fuera, PARA.
  const T2 = CARGA.tRamalN * CARGA.nBandas;                       // tensión del ramal flojo
  const abrazadoArrastre = RETORNO.abrazadoMotrizDeg;
  const capstan = Math.exp(CARGA.mu * abrazadoArrastre * Math.PI / 180);
  const teMax = r3(T2 * (capstan - 1));
  // esfuerzo tangencial de régimen: rozamiento del bulto sobre la guía UHMW
  // + 5 N de arrastre por cada rodillo del ramal de retorno (2 con retorno
  //   recto, 4 con pozo: se cuenta la lista, no un literal)
  const teReq = r3(CARGA.cargaMaxKg * CARGA.bultosSimultaneos * 9.81 * CARGA.muGuia
    + TAMBORES.retorno.length * 5);
  const fsArrastre = r3(teMax / teReq);
  if (fsArrastre < CARGA.fsCapstanMin) {
    err.push(`reserva de arrastre ${fsArrastre} < ${CARGA.fsCapstanMin} (Te máx ${teMax} N, `
      + `necesario ${teReq} N)`);
  }
  const parNm = r3(teReq * TAMBOR.r / 1000);
  const rpm = r3(CARGA.vBanda * 60000 / (Math.PI * TAMBOR.od));
  const potW = r3(teReq * CARGA.vBanda / 0.85);

  // 4.8 ejes: flexión y flecha (viga simplemente apoyada con 5 cargas)
  const cargasBanda = (fac) => EJES.map(x => ({ x, p: CARGA.tRamalN * 2 * fac }));
  const vT = viga(UCF207.insertoX[0], UCF207.insertoX[1], cargasBanda(1), TAMBOR.eje.d);
  const supC = [r3(CONDUCIDO.soporte.caraX[0] + CONDUCIDO.soporte.e / 2),
    r3(CONDUCIDO.soporte.caraX[1] - CONDUCIDO.soporte.e / 2)];
  const vC = viga(supC[0], supC[1], cargasBanda(1), CONDUCIDO.eje.d);
  const SOPR = TAMBORES.retornoSoporte, EJER = TAMBORES.retornoEje;
  const supR = [r3(SOPR.caraX[0] + SOPR.e / 2), r3(SOPR.caraX[1] - SOPR.e / 2)];
  // en cada rodillo del ramal de retorno la resultante es 2·T·sen(abrazado/2)
  // por banda. Con el retorno RECTO los abrazados son pequeños (7.5° y 8.7°: el
  // elevador sólo dobla la rampa) y la carga baja mucho — que es la razón de que
  // un Ø48.26 sobre eje de 1/2" aguante donde el pozo pedía Ø88.9 sobre Ø30.
  const vR = {};
  for (const R of TAMBORES.retorno) {
    const a = abrazados?.[R.id] ?? 90;
    const f = 2 * Math.sin(a * Math.PI / 360);
    vR[R.id] = { ...viga(supR[0], supR[1], EJES.map(x => ({ x, p: CARGA.tRamalN * f })), EJER),
      abrazadoDeg: r3(a), cargaPorBandaN: r3(CARGA.tRamalN * f) };
  }
  const revisa = (nom, v, d) => {
    // torsión sólo en el eje del tambor
    const tau = nom === 'tambor' ? r3(16 * parNm * 1000 / (Math.PI * d ** 3)) : 0;
    const eq = r3(Math.sqrt(v.sigma ** 2 + 3 * tau ** 2));
    if (eq > CARGA.sigmaAdmMPa) err.push(`el eje del ${nom} va a ${eq} MPa > ${CARGA.sigmaAdmMPa}`);
    if (v.delta > CARGA.flechaLimite) err.push(`flecha del eje del ${nom} ${v.delta} > ${CARGA.flechaLimite} mm`);
    return { ...v, tauMPa: tau, vonMisesMPa: eq };
  };
  const ejeT = revisa('tambor', vT, TAMBOR.eje.d);
  const ejeC = revisa('conducido', vC, CONDUCIDO.eje.d);
  for (const [k, v] of Object.entries(vR)) vR[k] = revisa(`retorno ${k}`, v, EJER);

  // 4.9 los rodamientos, con su carga real
  const cargaRodam = {
    UCF207: { N: r3(Math.max(vT.Ra, vT.Rb)), C: UCF207.C,
      relacion: r3(UCF207.C / Math.max(vT.Ra, vT.Rb)) },
    '6207-2RS': { N: r3(Math.max(vC.Ra, vC.Rb)), C: CONDUCIDO.rodam.C,
      relacion: r3(CONDUCIDO.rodam.C / Math.max(vC.Ra, vC.Rb)) },
  };
  // el rodamiento del ramal de retorno depende de la arquitectura: 6206-2RS en
  // los rodillos de pozo, R8-2RS (ABEC-1) en los elevadores B-20760.
  const nRet = r3(Math.max(...Object.values(vR).map(v => Math.max(v.Ra, v.Rb))));
  if (RETIRA_POZO.activo) {
    // ⚠ SIN C DE CATÁLOGO CITABLE. El R8-2RS del conjunto B-20760 lo especifica
    // Hytrol por su clase ABEC-1, y ni el manual ni el repositorio publican su
    // capacidad dinámica. NO se inventa un C: se publica la carga real y se deja
    // la relación C/P como PENDIENTE con dueño, igual que se hace en §S con
    // cualquier dato sin fuente. Lo que sí se puede afirmar es el orden: la carga
    // por rodamiento cae de 466 N (pozo) a 61 N (elevador), ×7.6 menos.
    cargaRodam['R8-2RS'] = { N: nRet, C: null, relacion: null,
      pendiente: 'capacidad dinámica del R8-2RS ABEC-1 del conjunto B-20760: sin fuente citable. '
        + 'Se publica la carga (N) y no se calcula la vida — el número que falta es del proveedor' };
  } else {
    cargaRodam['6206-2RS'] = { N: nRet, C: RETORNOS.rodam.C,
      relacion: r3(RETORNOS.rodam.C / nRet) };
  }
  for (const [k, v] of Object.entries(cargaRodam)) {
    if (v.relacion !== null && v.relacion < 8) {
      err.push(`el rodamiento ${k} va a C/P = ${v.relacion} (< 8: vida corta)`);
    }
  }

  // 4.10 la cuenta que obligó a montar el UCF 207 por FUERA (se deja escrita
  //      porque es la corrección de interfaz que pg40 pidió explícitamente):
  //      con la unidad INBOARD sobre las caras interiores del alargue, el cuerpo
  //      (44.4 de saliente) llegaría a X = 111.894 y a 447.018, y las bandas
  //      extremas viven en 111.056 y 447.856 → la cara útil se quedaría corta.
  const capInboard = PG?.PUBLICA?.caraApoyo
    ? r3((PG.PUBLICA.caraApoyo.xPos - UCF207.saliente) - (PG.PUBLICA.caraApoyo.xNeg + UCF207.saliente))
    : r3((491.418 - UCF207.saliente) - (67.494 + UCF207.saliente));
  // lo que tiene que caber entre apoyos NO es el ancho de las bandas: es el
  // TUBO del tambor (que sobresale de la goma) más 2 mm de aire por lado.
  const necesita = r3(TAMBOR.caraTubo + 4);
  const faltaInboard = r3(necesita - capInboard);
  if (faltaInboard <= 0 && capInboard >= FIJO.caraMin) {
    // si pg40 ensancha el alargue hasta que el montaje interior quepa, este
    // módulo NO se entera solo: lo dice, para que se revise la decisión.
    err.push(`AVISO-INTERFAZ: con la luz actual entre caras de apoyo (${capInboard} en montaje `
      + `interior) el UCF 207 ya cabría INBOARD; la decisión OUTBOARD de params_tambores §2 `
      + `debería revisarse con pg40`);
  }
  // …y la que hay de verdad con la unidad OUTBOARD:
  const capOutboard = PG?.PUBLICA?.caraApoyo
    ? r3(PG.PUBLICA.caraApoyo.xPos - PG.PUBLICA.caraApoyo.xNeg)
    : r3(491.418 - 67.494);
  const holguraUcfBanda = r3((capOutboard - FIJO.caraMin) / 2);    // 43.562 por lado
  if (capOutboard < TAMBOR.caraTubo) {
    err.push(`la luz entre caras de apoyo (${capOutboard}) no admite el tubo del tambor `
      + `(${TAMBOR.caraTubo})`);
  }

  return {
    piezas: n.tambor + n.conducido + n.retorno + n.hardware,
    tambor: n.tambor, conducido: n.conducido, retorno: n.retorno, hardware: n.hardware,
    errores: err,

    arquitectura: 'banda plana angosta: tambor motriz común engomado + rodillo conducido de '
      + `descansos interiores + ${TAMBORES.retorno.length} rodillo(s) en el ramal de retorno `
      + (RETIRA_POZO.activo
        ? '(ELEVADORES B-20760: el retorno cruza la transferencia RECTO por el corredor del peine)'
        : '(rodillos de POZO: el retorno cruza por debajo del módulo)'),
    retornoRecto: RETIRA_POZO.activo,
    corredor: RETIRA_POZO.activo ? {
      caraPortanteZ: CORREDOR.zCara, dorsoZ: CORREDOR.zDorso,
      techoMovilZ: CORREDOR.techoMovilZ, holguraAlMotorreductor: CORREDOR.holguraAlTecho,
      holguraAlFondoDeRanura: CORREDOR.holguraRanura,
      holguraALaPletinaDelPuente: CORREDOR.holguraPuente,
      precedenteAnfitrionZ: CORREDOR.anfitrionZ, nota: CORREDOR.nota,
    } : null,
    flexionInversa: RETIRA_POZO.activo ? ELEVADORES.flexionInversa : null,
    diametros: {
      tambor: TAMBOR.od, tamborTubo: TAMBOR.tubo.od, engomado: TAMBOR.engomado,
      conducido: CONDUCIDO.od, retorno: TAMBORES.retornoD,
    },
    tamborEje: { d: TAMBOR.eje.d, soporte: UCF207.desig, vano: UCF207.vano,
      insertoX: UCF207.insertoX, saliente: TAMBOR.saliente, chavetero: TAMBOR.chavetero },
    caraUtil: { goma: TAMBOR.gomaX, tubo: TAMBOR.tuboX, bandas: FIJO.bandasX,
      margenPorLado: TAMBOR.margenBanda },
    ejesArbol: { motriz: { y: FIJO.motrizY, z: zT }, conducido: { y: FIJO.conducidaY, z: zC } },
    retornos: TAMBORES.retorno.map(R => ({ ...R, d: TAMBORES.retornoD })),
    ramal: { z: RETORNO.z, zCara: RETORNO.zCara,
      zFondoAlto: RETIRA_POZO.activo ? null : zFondoAlto,
      tramoLibreY: RETORNO.tramoLibreY, holguraFondoNbt90: holgFondo },
    abrazados, abrazadosNota,
    arrastre: { mu: CARGA.mu, capstan: r3(capstan), teMaxN: teMax, teRequeridoN: teReq,
      reserva: fsArrastre, parNm, rpm, potenciaW: potW,
      motorreductor: `≥ ${Math.ceil(potW / 50) * 50} W a ${rpm} rpm de salida — ${TAMBOR.motorreductor}` },
    ejes: { tambor: ejeT, conducido: ejeC, retorno: vR },
    rodamientos: cargaRodam,
    holguras: { largueroPG40: holgLarguero, perfilPG40: holgPerfil, moduloNbt90: holgModulo,
      caraApoyoALaBandaPorLado: holguraUcfBanda },
    // la cuenta de la corrección de interfaz que pg40 pidió (§2 de params):
    interfazPG40: {
      montajeUCF207: 'OUTBOARD',
      caraApoyoX: UCF207.caraX,
      caraUtilSiInboard: capInboard, caraUtilNecesaria: FIJO.caraMin,
      faltaSiInboard: faltaInboard,
      caraUtilOutboard: capOutboard,
      conducidoSinUCF: 'el conducido NO lleva UCF 207: rodamientos 6207 DENTRO del '
        + 'tubo y eje fijo pasante; en su estación el alargue lleva el mismo patrón '
        + '92×92 pero recibe una pletina de eje fijo Ø35 (instrucción del cliente)',
      retornosNecesitanMensula: TAMBORES.retorno.map(R => ({ id: R.id, y: R.y, z: R.z,
        patron: SOPR.patron, taladro: SOPR.taladro, caraX: SOPR.caraX })),
    },
    // B3 · cuenta publicada de la salida de hilo de los 8 M12 de las UCF 207
    pernosUcf,
    // B5 · el reglaje de alineación de banda, con sus números
    tracking: {
      centrado: `corona TRAPEZOIDAL de ${TAMBOR.corona.h} mm en el engomado del tambor motriz, UNA POR `
        + `CALLE (${EJES.length} coronas de ${TAMBOR.corona.ancho} mm con ${TAMBOR.corona.cilindrica} de `
        + `cilindro y conos de ${TAMBOR.corona.cono}); cima en Ø${TAMBOR.od} exacto, valle Ø${TAMBOR.corona.rebajeOd}`,
      coronaFuente: 'web CROWN-HAB-01 (Habasit: h = 2…3×(0.001·d+0.075), ×50 % por polea engomada) '
        + '+ CROWN-AMM-01 (Ammeraal: reglas de uso)',
      coronaRadioEquivalente: TAMBOR.corona.radioEquivalente,
      reglaje: `colisas en Y en las 2 pletinas del conducido: ±${CONDUCIDO.soporte.colisa.carrera} mm `
        + `por pletina (colisa de ${CONDUCIDO.soporte.colisa.largo}×${CONDUCIDO.soporte.taladro}); `
        + `oblicuidad máxima ${CONDUCIDO.soporte.colisa.oblicuidadMaxDeg}° sobre el vano de `
        + `${CONDUCIDO.soporte.colisa.vano} mm entre pletinas`,
      carreraDeAjusteMm: { porPletina: CONDUCIDO.soporte.colisa.carrera,
        diferencialTotal: r3(2 * CONDUCIDO.soporte.colisa.carrera),
        oblicuidadMaxDeg: CONDUCIDO.soporte.colisa.oblicuidadMaxDeg },
      cilindricosAProposito: TAMBOR.corona.porQueSoloElMotriz,
      tramoLibreQuePideLaFuente: [TAMBOR.corona.tramoLibreMin, TAMBOR.corona.tramoLibreMax],
      tramoLibreReal: `del tambor a RR1 hay ${Math.abs(TAMBORES.retorno[0].y)} mm de ramal libre, muy por `
        + 'encima de los 64…160 que pide Ammeraal (web CROWN-AMM-01) para que la corona tenga efecto',
    },
    compradas: [
      { desig: UCF207.desig, cant: 2, norma: UCF207.norma, ref: 'web BRG-UCF207-01/02' },
      { desig: CONDUCIDO.rodam.desig, cant: 2, norma: 'ISO 15 · rodamiento rígido de bolas 35×72×17', ref: 'cat' },
      { desig: RETORNOS.rodam.desig, cant: 8, norma: 'ISO 15 · rodamiento rígido de bolas 30×62×16', ref: 'cat' },
      { desig: 'Chaveta DIN 6885 A 10×8×100', cant: 1, norma: 'DIN 6885-1', ref: 'cat' },
      { desig: `Anillo elástico ${gargantaDIN471(35).desig} (eje Ø35, s = ${gargantaDIN471(35).s})`,
        cant: 2, norma: gargantaDIN471(35).desig, ref: 'web RING-471-01/02' },
      { desig: `Anillo elástico ${gargantaDIN471(30).desig} (eje Ø30, s = ${gargantaDIN471(30).s})`,
        cant: 8, norma: gargantaDIN471(30).desig, ref: 'web RING-471-01/02' },
      // A3 · collar PARTIDO con referencia real: DIN 705 A es el MACIZO
      { desig: CONDUCIDO.collar, cant: 2, norma: 'referencia de fabricante (el collar partido no tiene norma DIN/ISO)', ref: 'web COLL-SPLIT-01' },
      { desig: RETORNOS.collar, cant: 8, norma: 'referencia de fabricante (el collar partido no tiene norma DIN/ISO)', ref: 'web COLL-SPLIT-01' },
      // B3 · los largos salen de la cuenta de salida de hilo, no escritos a mano
      ...pernosUcf.map(P => ({ desig: `Perno M12×${P.largo} ISO 4017 8.8 + tuerca ISO 4032 + arandela `
        + `ISO 7089 (UCF 207 ${P.lado}; apriete ${P.apriete}, salida ${P.salidaMm} mm = ${P.salidaPasos} pasos)`,
      cant: 4, norma: 'ISO 4017 / ISO 4032 / ISO 7089', ref: 'cat + calc (2 pasos de salida, ISO 888)' })),
      { desig: 'Perno M12×40 ISO 4017 8.8 (soportes del conducido)', cant: 8, norma: 'ISO 4017', ref: 'cat' },
      { desig: 'Perno M10×40 ISO 4017 8.8 (soportes de retorno)', cant: 32, norma: 'ISO 4017', ref: 'cat' },
      { desig: 'Tornillo M6×18 DIN 912 12.9 (cierre de los 10 collares partidos; suele venir con el collar)',
        cant: 20, norma: 'DIN 912 / ISO 4762 clase 12.9', ref: 'web COLL-SPLIT-01' },
      // ================== A8 · LA BANDA (no estaba en la lista) ==============
      { desig: `${BANDA.desig}; L = ${BANDA.largoPedidoMm} mm ± ${BANDA.toleranciaMm} (±${BANDA.toleranciaPct} %) `
        + `de fibra neutra; unión ${BANDA.empalme}`,
      cant: BANDA.cant, norma: `banda plana de ${BANDA.telas} telas, e = ${BANDA.espesorMm} mm, `
        + `k_adm = ${BANDA.kAdmNmm} N/mm, Ø mínimo de polea ${BANDA.poleaMinimaMm} mm`,
      ref: BANDA.fuente },
      // ============ A11 · EL ACCIONAMIENTO (tampoco estaba) =================
      { desig: `Motorreductor de ${ACCIONAMIENTO.interfaz}; ≥ ${Math.ceil(potW / 50) * 50} W a ${rpm} rpm `
        + `de salida, par ≥ ${ACCIONAMIENTO.parMinNm} N·m. Candidato de catálogo: ${ACCIONAMIENTO.candidato}`,
      cant: 1, norma: `interfaz Ø35 H7 + chavetero DIN 6885; ${ACCIONAMIENTO.relacionAbierta}`,
      ref: 'web MOT-003 (candidato) + calc (potencia, par y rpm de este módulo)' },
      { desig: 'Anclaje del brazo de reacción del motorreductor (pletina + 2 tornillos al bastidor del cliente) '
        + '— PENDIENTE de la ficha del reductor elegido: la posición del brazo depende del modelo',
      cant: 1, norma: 'PENDIENTE', ref: 'se cierra con el reductor' },
    ],
    fabricadas: [
      { pieza: 'Tubo de tambor', desig: TAMBOR.tuboDesig, cant: 1, largo: tLen },
      { pieza: 'Engomado del tambor', desig: TAMBOR.gomaDesig, cant: 1, largo: gLen },
      { pieza: 'Disco-tapa del tambor', desig: TAMBOR.tapaDesig, cant: 2 },
      { pieza: 'Eje del tambor', desig: `Ø35 C45 × ${r3(ex1 - ex0)} con chavetero ${TAMBOR.chavetero}`, cant: 1 },
      { pieza: 'Tubo del conducido', desig: CONDUCIDO.tuboDesig, cant: 1, largo: r3(CONDUCIDO.tuboX[1] - CONDUCIDO.tuboX[0]) },
      { pieza: 'Tubo de rodillo de retorno', desig: `Tubo Ø88.9 × 3.2 EN 10220`, cant: 4, largo: RETORNOS.cara },
      { pieza: 'Tapa-soporte prensada', desig: 'Torneada de barra, asiento H7 del rodamiento con hombro', cant: 10 },
      { pieza: 'Eje fijo', desig: 'Ø35 C45 (conducido) · Ø30 C45 (retornos)', cant: 5 },
      { pieza: 'Pletina de soporte de eje fijo', desig: 'S275JR e=12 cortada por láser', cant: 10 },
    ],
  };
}

export default tambores;
