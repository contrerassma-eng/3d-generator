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
  FIJO, TAMBOR, UCF207, CONDUCIDO, RETORNOS, TAMBORES, RETORNO, CARGA, Xc, EJES,
} from './params_tambores.mjs';

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
  collarL: 15.0,           // cat — collar de apriete partido DIN 705 A
  bridaR: 12.0,            // dis — radio de esquina de la brida UCF (fundición)
  pernoUcf: { d: 12, af: 19, hh: 7.5, largo: 60 },   // cat M12 ISO 4017 (−X: 8 de
                           //   alargue + tuerca; +X: 8 + 28 de chapón)
  pernoUcfLargo: { neg: 45, pos: 75 },               // calc por espesor de apoyo
  pernoSop: { d: 12, af: 19, hh: 7.5 },              // cat M12 del soporte de eje fijo
  pernoRet: { d: 10, af: 16, hh: 6.3 },              // cat M10 del soporte de retorno
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

/** Cubierta engomada de espesor constante, cantos a 45°. */
const perfilGoma = (len, ro, rv) => {
  const c = L.gomaChaflan;
  return [[0, ro - L.bond], [0, rv - c], [c, rv], [len - c, rv], [len, rv - c], [len, ro - L.bond]];
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

  // 1. tubo
  add(`${nombre} · tubo Ø${spec.od} × ${len} (e=${spec.tubo.e})`, COL.rodillo, [x0, y, z], [
    revolve(`Tubo Ø${spec.od} e=${spec.tubo.e}`, [x0, y, z], 'x', perfilTubo(len, ro, ri)),
  ], { ...conj, material: spec.tuboDesig ?? `Tubo Ø${spec.od} × ${spec.tubo.e}`, gira: true });

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
      ], { ...conj, ajuste: `prensado H7/r6 en el tubo Ø${spec.tubo.id}`, gira: true });

    const xR = s === 0 ? r3(x0 + L.tapaLabio) : r3(x1 - L.tapaLabio - spec.rodam.w);
    rodamiento(E, { nombre: `${spec.rodam.desig} (${nombre}, ${lado})`, at: [xR, y, z], dir: DIR,
      bore: spec.rodam.bore, od: spec.rodam.od, w: spec.rodam.w, capa: `${marca} · ` });
    n.piezas++;

    // casquillo de apoyo del aro interior + anillo DIN 471 que lo retiene
    const xC = s === 0 ? r3(xR - L.casquillo) : r3(xR + spec.rodam.w);
    add(`${nombre} · casquillo Ø${spec.eje.d + 12}/Ø${spec.eje.d} × ${L.casquillo} (${lado})`,
      COL.acero, [xC, y, z], [
        revolve('Casquillo', [xC, y, z], 'x', [[0, spec.eje.d / 2], [0, spec.eje.d / 2 + 6],
          [L.casquillo, spec.eje.d / 2 + 6], [L.casquillo, spec.eje.d / 2]]),
      ], { ...conj, hardware: false });
    const xA = s === 0 ? r3(xC - 1.75) : r3(xC + L.casquillo);
    anilloRet(E, { nombre: `${nombre} (${lado})`, at: [xA, y, z], dir: DIR, eje: spec.eje.d,
      capa: `${marca} · ` });
    n.piezas++;
  }

  // 5. EJE FIJO pasante
  const [ex0, ex1] = spec.ejeX;
  add(`${nombre} · eje FIJO Ø${spec.eje.d} × ${r3(ex1 - ex0)}`, COL.acero, [ex0, y, z], [
    cyl(`Eje Ø${spec.eje.d} × ${r3(ex1 - ex0)}`, [ex0, y, z], DIR, spec.eje.d, r3(ex1 - ex0)),
  ], { ...conj, material: spec.eje.material, gira: false,
    nota: 'no gira: es el asiento de los aros interiores y el que transmite la '
      + 'carga de la banda a las pletinas de soporte' });

  // 6. pletinas de soporte del eje fijo + collar de apriete + tornillería
  for (const s of [0, 1]) {
    const lado = s === 0 ? '−X' : '+X';
    const xCara = sop.caraX[s], nrm = sop.normal[s];
    const xF = nrm > 0 ? xCara : r3(xCara - sop.e);       // cara desde la que crece
    add(`${nombre} · pletina de soporte ${sop.lado}×${sop.lado}×${sop.e} (${lado})`,
      COL.chapa, [xF, y, z], [
        sketchYZ(`Pletina ${sop.lado}×${sop.lado}`, xF,
          rectR(y - sop.lado / 2, z - sop.lado / 2, y + sop.lado / 2, z + sop.lado / 2, 10), sop.e),
        hole(`Barreno Ø${sop.bore} H8`, [r3(xF - 1), y, z], DIR, sop.bore),
        ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sy, sz]) =>
          hole(`Ø${sop.taladro}`, [r3(xF - 1), r3(y + sy * sop.patron / 2), r3(z + sz * sop.patron / 2)],
            DIR, sop.taladro)),
      ], { ...conj, material: 'Acero S275JR cortado por láser',
        nota: `se atornilla al patrón ${sop.patron}×${sop.patron} del alargue PG40` });

    const xCol = nrm > 0 ? r3(xF + sop.e) : r3(xF - L.collarL);
    add(`${nombre} · collar de apriete partido Ø${spec.eje.d} (${lado})`, COL.inox, [xCol, y, z], [
      revolve('Collar DIN 705 A', [xCol, y, z], 'x', [[0, spec.eje.d / 2], [0, spec.eje.d / 2 + 10],
        [L.collarL, spec.eje.d / 2 + 10], [L.collarL, spec.eje.d / 2]]),
    ], { ...conj, hardware: true, norma: 'DIN 705 A', componente: spec.collar });

    const pd = sop.taladro > 12 ? L.pernoSop : L.pernoRet;
    for (const [sy, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      pernoHex(E, { nombre: `${pd.d === 12 ? 'M12' : 'M10'} soporte ${nombre} (${lado})`,
        at: [r3(xF - (nrm > 0 ? 0 : 0)), r3(y + sy * sop.patron / 2), r3(z + sz * sop.patron / 2)],
        dir: [nrm, 0, 0], dia: pd.d, largo: 40, af: pd.af, altoCab: pd.hh, capa: `${marca} · ` });
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
    ], { ...conjT, material: TAMBOR.tuboDesig, gira: true });
  n.tambor++;

  add(`TAMBOR · engomado ${TAMBOR.engomado} → Ø${TAMBOR.od} × ${gLen} (cara útil)`, COLGOMA,
    [gx0, 0, zT], [
      revolve(`Vulcanizado e=${TAMBOR.engomado} → Ø${TAMBOR.od}`, [gx0, 0, zT], 'x',
        perfilGoma(gLen, RO, RV)),
    ], { ...conjT, material: TAMBOR.gomaDesig, gira: true,
      nota: `cubre las 5 bandas (X ${FIJO.bandasX[0]}…${FIJO.bandasX[1]}) con `
        + `${TAMBOR.margenBanda} mm de margen de deriva por lado` });
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
        nota: 'soldada al tubo y al eje: el tambor y su eje son un solo cuerpo, '
          + 'que es lo que permite meter el par por el saliente' });
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

    // 4 pernos M12 pasantes
    for (const [sy, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const largo = s === 0 ? L.pernoUcfLargo.neg : L.pernoUcfLargo.pos;
      const at = [nrm > 0 ? r3(xF + UCF207.bridaE + largo) : r3(xF - largo),
        r3(sy * semi), r3(zT + sz * semi)];
      pernoHex(E, { nombre: `M12×${largo} ${UCF207.desig} (${lado})`, at,
        dir: [-nrm, 0, 0], dia: L.pernoUcf.d, largo, af: L.pernoUcf.af, altoCab: L.pernoUcf.hh,
        capa: 'TAMBOR · ' });
      tuercaHex(E, { nombre: `M12 ${UCF207.desig} (${lado})`,
        at: [nrm > 0 ? r3(xF - 10) : r3(xF + UCF207.bridaE), r3(sy * semi), r3(zT + sz * semi)],
        dir: [nrm, 0, 0], dia: 12, af: 19, alto: 10, capa: 'TAMBOR · ' });
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
  // 3. LOS CUATRO RODILLOS DE RETORNO
  // =========================================================================
  for (const R of TAMBORES.retorno) {
    const nr = rodilloEjeFijo(E, null, {
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

  // 4.4 el ramal de retorno pasa por DEBAJO de los perfiles del bastidor
  const holgPerfil = PG?.Z ? r3(PG.Z.travBot - RETORNO.z) : null;   // −40 − (−57.2)
  if (holgPerfil !== null && holgPerfil < 2) {
    err.push(`el ramal de retorno (Z ${RETORNO.z}) no libra el fondo del perfil `
      + `(${PG.Z.travBot}): ${holgPerfil} mm`);
  }

  // 4.5 el ramal de fondo libra la cara inferior del NBT90, y los rodillos de
  //     retorno del fondo quedan FUERA de la huella del módulo
  const zFondoAlto = r3(TAMBORES.retorno[1].z - RETORNOS.r);
  const holgFondo = r3(FIJO.fondoNbt90 - zFondoAlto);
  if (holgFondo < 2) err.push(`el ramal de fondo pasa a ${holgFondo} mm del fondo del NBT90 (mín 2)`);
  const holgModulo = {};
  for (const R of TAMBORES.retorno) {
    const yLo = r3(R.y - RETORNOS.r), yHi = r3(R.y + RETORNOS.r);
    if (yHi > FIJO.moduloY[0] && yLo < FIJO.moduloY[1]) {
      err.push(`${R.id} (Y ${yLo}…${yHi}) invade la huella del NBT90 (${FIJO.moduloY.join('…')})`);
    }
    holgModulo[R.id] = r3(Math.min(Math.abs(yLo - FIJO.moduloY[1]), Math.abs(yHi - FIJO.moduloY[0])));
  }

  // 4.6 ABRAZADOS reales del lazo (calc por tangencia, con la misma matemática
  //     que usa lib.mjs para las bandas de la transferencia)
  const seq = [
    { c: [FIJO.motrizY, zT], r: TAMBOR.r, s: -1 },
    ...TAMBORES.retorno.map((R, i) => ({ c: [R.y, R.z], r: RETORNOS.r, s: (i === 0 || i === 3) ? 1 : -1 })),
    { c: [FIJO.conducidaY, zC], r: CONDUCIDO.r, s: -1 },
  ];
  let env = null;
  try { env = envolventes(seq, FIJO.bandaEsp); } catch (e2) { err.push(`lazo sin tangente: ${e2.message}`); }
  const abrazados = env ? {
    tambor: env[0], RR1: env[1], RR2: env[2], RR3: env[3], RR4: env[4], conducido: env[5],
  } : null;
  if (abrazados && Math.abs(abrazados.tambor - RETORNO.abrazadoMotrizDeg) > 1) {
    err.push(`el abrazado publicado sobre el tambor (${RETORNO.abrazadoMotrizDeg}°) no es el `
      + `de la geometría (${abrazados.tambor}°)`);
  }

  // 4.7 ¿arrastra sin patinar? Euler–Eytelwein sobre el tambor engomado
  const T2 = CARGA.tRamalN * CARGA.nBandas;                       // tensión del ramal flojo
  const capstan = Math.exp(CARGA.mu * (abrazados?.tambor ?? 180) * Math.PI / 180);
  const teMax = r3(T2 * (capstan - 1));
  // esfuerzo tangencial de régimen: rozamiento del bulto sobre la guía UHMW
  const teReq = r3(CARGA.cargaMaxKg * CARGA.bultosSimultaneos * 9.81 * CARGA.muGuia
    + 4 * 5);                                                     // + 5 N de arrastre por rodillo
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
  const supR = [r3(RETORNOS.soporte.caraX[0] + RETORNOS.soporte.e / 2),
    r3(RETORNOS.soporte.caraX[1] - RETORNOS.soporte.e / 2)];
  // en cada rodillo de retorno la resultante es 2·T·sen(abrazado/2) por banda
  const vR = {};
  for (const [i, R] of TAMBORES.retorno.entries()) {
    const a = (abrazados ? [abrazados.RR1, abrazados.RR2, abrazados.RR3, abrazados.RR4][i] : 90);
    const f = 2 * Math.sin(a * Math.PI / 360);
    vR[R.id] = { ...viga(supR[0], supR[1], EJES.map(x => ({ x, p: CARGA.tRamalN * f })), RETORNOS.eje.d),
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
  for (const [k, v] of Object.entries(vR)) vR[k] = revisa(`retorno ${k}`, v, RETORNOS.eje.d);

  // 4.9 los rodamientos, con su carga real
  const cargaRodam = {
    UCF207: { N: r3(Math.max(vT.Ra, vT.Rb)), C: UCF207.C,
      relacion: r3(UCF207.C / Math.max(vT.Ra, vT.Rb)) },
    '6207-2RS': { N: r3(Math.max(vC.Ra, vC.Rb)), C: CONDUCIDO.rodam.C,
      relacion: r3(CONDUCIDO.rodam.C / Math.max(vC.Ra, vC.Rb)) },
    '6206-2RS': { N: r3(Math.max(...Object.values(vR).map(v => Math.max(v.Ra, v.Rb)))),
      C: RETORNOS.rodam.C },
  };
  cargaRodam['6206-2RS'].relacion = r3(RETORNOS.rodam.C / cargaRodam['6206-2RS'].N);
  for (const [k, v] of Object.entries(cargaRodam)) {
    if (v.relacion < 8) err.push(`el rodamiento ${k} va a C/P = ${v.relacion} (< 8: vida corta)`);
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

    arquitectura: 'banda plana angosta: tambor motriz común engomado + rodillo '
      + 'conducido de descansos interiores + 4 rodillos de retorno',
    diametros: {
      tambor: TAMBOR.od, tamborTubo: TAMBOR.tubo.od, engomado: TAMBOR.engomado,
      conducido: CONDUCIDO.od, retorno: RETORNOS.od,
    },
    tamborEje: { d: TAMBOR.eje.d, soporte: UCF207.desig, vano: UCF207.vano,
      insertoX: UCF207.insertoX, saliente: TAMBOR.saliente, chavetero: TAMBOR.chavetero },
    caraUtil: { goma: TAMBOR.gomaX, tubo: TAMBOR.tuboX, bandas: FIJO.bandasX,
      margenPorLado: TAMBOR.margenBanda },
    ejesArbol: { motriz: { y: FIJO.motrizY, z: zT }, conducido: { y: FIJO.conducidaY, z: zC } },
    retornos: TAMBORES.retorno.map(R => ({ ...R, d: RETORNOS.od })),
    ramal: { z: RETORNO.z, zCara: RETORNO.zCara, zFondoAlto,
      tramoLibreY: RETORNO.tramoLibreY, holguraFondoNbt90: holgFondo },
    abrazados,
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
        patron: RETORNOS.soporte.patron, taladro: RETORNOS.soporte.taladro,
        caraX: RETORNOS.soporte.caraX })),
    },
    compradas: [
      { desig: UCF207.desig, cant: 2, norma: UCF207.norma, ref: 'web BRG-UCF207-01/02' },
      { desig: CONDUCIDO.rodam.desig, cant: 2, norma: 'ISO 15 · rodamiento rígido de bolas 35×72×17', ref: 'cat' },
      { desig: RETORNOS.rodam.desig, cant: 8, norma: 'ISO 15 · rodamiento rígido de bolas 30×62×16', ref: 'cat' },
      { desig: 'Chaveta DIN 6885 A 10×8×100', cant: 1, norma: 'DIN 6885-1', ref: 'cat' },
      { desig: 'Anillo elástico DIN 471 Ø35', cant: 2, norma: 'DIN 471', ref: 'cat' },
      { desig: 'Anillo elástico DIN 471 Ø30', cant: 8, norma: 'DIN 471', ref: 'cat' },
      { desig: 'Collar de apriete partido DIN 705 A Ø35', cant: 2, norma: 'DIN 705', ref: 'cat' },
      { desig: 'Collar de apriete partido DIN 705 A Ø30', cant: 8, norma: 'DIN 705', ref: 'cat' },
      { desig: 'Perno M12×45 / M12×75 ISO 4017 8.8 + tuerca ISO 7040', cant: 8, norma: 'ISO 4017', ref: 'cat' },
      { desig: 'Perno M12×40 ISO 4017 8.8 (soportes del conducido)', cant: 8, norma: 'ISO 4017', ref: 'cat' },
      { desig: 'Perno M10×40 ISO 4017 8.8 (soportes de retorno)', cant: 32, norma: 'ISO 4017', ref: 'cat' },
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
