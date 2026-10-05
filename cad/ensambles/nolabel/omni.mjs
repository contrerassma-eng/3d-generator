// omni.mjs — BLOQUE OMNI (CV-OMW): placa de ruedas omnidireccionales de 24"×24"
// con 8 filas a paso 3" y 7 ruedas por fila. Filas ALTERNADAS por el sentido
// de los rodillos (±45°): la familia A (filas pares) y la familia B (filas
// impares) tienen cada una su correa síncrona lateral y su motor UniDrive
// 24 V bajo el deck. Mismo sentido en ambas = avance; sentidos opuestos =
// empuje lateral (justificación en el omni 1, eyección a 90° en el omni 2).
//
// Capa `user` (diseño Conveyone). Cotas en params.mjs. Ejes del proyecto:
// X flujo · Y ancho (+Y izquierda) · Z arriba, 0 = corona de las ruedas.

import { box, cyl, hole, sketchXZ, revolve, polea, rodamiento, pernoHex, COL, r2 } from '../nbt90/lib.mjs';
import { P } from './params.mjs';

const C = {
  negro: '#15181d', tapa: '#101318', azul: '#2456c8', acero: COL.acero, inox: COL.inox,
  correa: '#2b2b2b', motor: '#37474f', oreja: '#6b7f94', uhmw: '#e8e4d8', perfil: '#b0bec5', pie: '#455a64',
  sensor: '#2a3138', ojo: '#d64545',
};

/**
 * Agrega un bloque omni al ensamble E.
 * @param {object} o  { x0, tag, fotocelula:boolean, guiaRef:boolean }
 * @returns resumen con cotas derivadas (para las compuertas y el BOM)
 */
export function omni(E, o) {
  const Q = P.omni, { x0, tag } = o, lado = P.lado;
  const L = Q.L, W = Q.W, t = Q.placa.t;
  const Dr = Q.rueda.D, B = Q.rueda.B, ejeZ = -Dr / 2;             // la corona de la rueda define Z = 0
  const xFila = (i) => r2(x0 + Q.paso * (i + 0.5));                 // 8 filas centradas en L
  const yRueda = Array.from({ length: Q.porFila }, (_, j) => r2(Q.pasoY * (j - (Q.porFila - 1) / 2)));
  const eq = { equipo: tag };
  const plTop = Q.placa.topZ, plBot = plTop - Q.placa.alto;        // −6 .. −116
  const carBot = plBot - Q.carcasa.h;                                // −236
  const yPl = W / 2 - t / 2;                                         // centro de la placa lateral
  const yCor = W / 2 + 10;                                           // plano de poleas/correas (fuera de la placa)
  const Rp = Q.polea.od / 2, tc = Q.correa.t;
  const Zm = ejeZ - 110;                                             // eje del motor (bajo el deck)
  const resumen = { filas: Q.filas, porFila: Q.porFila, ruedas: Q.filas * Q.porFila, ejeZ, Zm, yCor, L, W };

  // --- placas laterales PL6 con alojamientos de rodamiento ----------------
  for (const s of [-1, 1]) {
    const feats = [box(`Placa lateral PL${t} ${L}×${Q.placa.alto}`, [x0 + L / 2, s * yPl, plBot], L, t, Q.placa.alto)];
    for (let i = 0; i < Q.filas; i++) feats.push(hole(`Alojamiento Ø${Q.rodamiento.od} fila ${i + 1}`, [xFila(i), s * W / 2, ejeZ], [0, -s, 0], Q.rodamiento.od));
    E.addPart(`${tag} · Placa lateral ${s > 0 ? '+Y' : '−Y'}`, C.negro, [x0, s * yPl, plBot], feats, eq);
  }
  // --- tapa superior negro mate con ventanas para las coronas --------------
  {
    const feats = [box(`Tapa ${Q.tapa.t} mm`, [x0 + L / 2, 0, Q.tapa.z], L, W - 2 * t, Q.tapa.t)];
    for (let i = 0; i < Q.filas; i++) for (const y of yRueda) {
      feats.push(box(`Ventana rueda`, [xFila(i), y, Q.tapa.z - 1], Dr + 2 * Q.tapa.holg, B + 2 * Q.tapa.holg, Q.tapa.t + 2, 'cut'));
    }
    E.addPart(`${tag} · Tapa superior`, C.tapa, [x0, 0, Q.tapa.z], feats, eq);
  }
  // --- carcasa inferior (cubeta abierta arriba) ----------------------------
  E.addPart(`${tag} · Carcasa inferior`, C.negro, [x0, 0, carBot], [
    box(`Cubeta ${L}×${r2(W - 2 * t)}×${Q.carcasa.h}`, [x0 + L / 2, 0, carBot], L, W - 2 * t, Q.carcasa.h),
    box('Vaciado', [x0 + L / 2, 0, carBot + 2], L - 4, W - 2 * t - 4, Q.carcasa.h + 2, 'cut'),
    ...[-1, 1].map(s => hole(`Paso eje motor ${s > 0 ? '+Y' : '−Y'} Ø14`, [x0 + L / 2 + (s > 0 ? Q.paso / 2 : -Q.paso / 2), s * (W / 2 - t), Zm], [0, -s, 0], 14)),
  ], eq);

  // --- filas: eje Ø15 + 7 ruedas omni + 2 rodamientos 6002 + polea ----------
  for (let i = 0; i < Q.filas; i++) {
    const x = xFila(i), fam = i % 2 === 0 ? 'A' : 'B', s = fam === 'A' ? -1 : 1, hand = fam === 'A' ? 1 : -1;
    const yIni = s > 0 ? -(W / 2 + 8) : -(yCor + Q.polea.b / 2 + 2), Le = r2((W / 2 + 8) + (yCor + Q.polea.b / 2 + 2));
    E.addPart(`${tag} · Eje fila ${i + 1} Ø${Q.ejeD} (fam. ${fam})`, C.acero, [x, yIni, ejeZ], [
      cyl(`Eje Ø${Q.ejeD}×${Le}`, [x, yIni, ejeZ], [0, 1, 0], Q.ejeD, Le),
    ], { ...eq, componente: `eje_${Q.ejeD}x${Le}` });
    for (const y of yRueda) ruedaOmni(E, { at: [x, y, ejeZ], hand, nombre: `${tag} · Rueda omni f${i + 1} y${y}`, eq });
    for (const sb of [-1, 1]) {
      rodamiento(E, { nombre: `${tag} f${i + 1} ${sb > 0 ? '+Y' : '−Y'}`, at: [x, sb * (W / 2 - t), ejeZ], dir: [0, sb, 0], ...Q.rodamiento, capa: '' });
      E.parts[E.parts.length - 1].equipo = tag;
    }
    polea(E, { nombre: `${tag} · Polea AT5 fila ${i + 1} (fam. ${fam})`, at: [x, s * (yCor - Q.polea.b / 2), ejeZ], dir: [0, s, 0],
      od: Q.polea.od, ancho: Q.polea.b, bore: Q.polea.bore, prof: 1.5, color: COL.polea, extra: eq });
  }

  // --- transmisión por familia: motor UniDrive + polea motriz + correa + 2 tensores + guarda
  const correas = {};
  for (const fam of ['A', 'B']) {
    const s = fam === 'A' ? -1 : 1;
    const filas = [...Array(Q.filas).keys()].filter(i => (i % 2 === 0) === (fam === 'A'));
    const xs = filas.map(xFila), xf = Math.min(...xs), xl = Math.max(...xs), xm = r2((xf + xl) / 2);
    const [mL, mD] = [Q.motor.bbox[0], Q.motor.bbox[1]];
    const yIn = s * (W / 2 - t - 2);                                  // cara interior de la carcasa
    // motor: cilindro Ø118 × 152.7 (bbox real del UniDrive del catálogo) + eje Ø12 hasta la polea
    E.addPart(`${tag} · Motor UniDrive 24 V 60 W fam. ${fam}`, C.motor, [xm, yIn, Zm], [
      cyl(`Carcasa motor Ø${r2(mD)}×${r2(mL)}`, [xm, yIn, Zm], [0, -s, 0], mD, mL),
      cyl(`Eje motor Ø12`, [xm, yIn, Zm], [0, s, 0], 12, (s * (yCor + Q.polea.b / 2) - yIn) * s + 4),
    ], { ...eq, componente: 'cv_ZP2026__300986_std_unidrive_motor_d_shaft' });
    polea(E, { nombre: `${tag} · Polea motriz AT5 fam. ${fam}`, at: [xm, s * (yCor - Q.polea.b / 2), Zm], dir: [0, s, 0],
      od: Q.polea.od, ancho: Q.polea.b, bore: 12, prof: 1.5, color: COL.polea, extra: eq });
    // correa: ramal superior sobre las poleas de fila + 2 ramales inclinados al motor (polígonos en XZ)
    const yA = s * yCor + Q.correa.b / 2;          // sketchXZ extruye hacia −Y (dir [0,−1,0]): se parte de la cara +Y
    const quad = (A, Bp) => {
      const dx = Bp[0] - A[0], dz = Bp[1] - A[1], l = Math.hypot(dx, dz), n = [dz / l, -dx / l];
      return [[A[0] + n[0] * tc / 2, A[1] + n[1] * tc / 2], [Bp[0] + n[0] * tc / 2, Bp[1] + n[1] * tc / 2],
              [Bp[0] - n[0] * tc / 2, Bp[1] - n[1] * tc / 2], [A[0] - n[0] * tc / 2, A[1] - n[1] * tc / 2]];
    };
    const top = [[xf - Rp, ejeZ + Rp + tc / 2], [xl + Rp, ejeZ + Rp + tc / 2]];
    const izq = [[xf - Rp - tc / 2, ejeZ], [xm - Rp - tc / 2, Zm]];
    const der = [[xl + Rp + tc / 2, ejeZ], [xm + Rp + tc / 2, Zm]];
    const largo = r2((top[1][0] - top[0][0]) + 2 * Math.hypot(izq[1][0] - izq[0][0], izq[1][1] - izq[0][1]) + Math.PI * Rp * 2);
    E.addPart(`${tag} · Correa síncrona AT5 fam. ${fam} (${largo} mm)`, C.correa, [xm, yA, Zm], [
      sketchXZ('Ramal superior', yA, quad(top[0], top[1]), Q.correa.b),
      sketchXZ('Ramal descendente −X', yA, quad(izq[0], izq[1]), Q.correa.b),
      sketchXZ('Ramal descendente +X', yA, quad(der[0], der[1]), Q.correa.b),
    ], { ...eq, componente: `correa_at5_${Math.round(largo / 5) * 5}` });
    // tensores: polea loca Ø34 contra cada ramal inclinado, por dentro del lazo
    for (const [seg, k] of [[izq, 'A'], [der, 'B']]) {
      const M = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2];
      const dx = seg[1][0] - seg[0][0], dz = seg[1][1] - seg[0][1], l = Math.hypot(dx, dz);
      let n = [dz / l, -dx / l];                                               // perpendicular al ramal
      if (n[0] * (xm - M[0]) < 0) n = [-n[0], -n[1]];                          // hacia el interior del lazo (eje x = xm)
      const c = [r2(M[0] + n[0] * (Rp + tc)), r2(M[1] + n[1] * (Rp + tc))];
      polea(E, { nombre: `${tag} · Tensor fam. ${fam} ${k}`, at: [c[0], s * (yCor - Q.polea.b / 2), c[1]], dir: [0, s, 0],
        od: Q.polea.od, ancho: Q.polea.b, bore: 10, prof: 1.5, color: COL.rodillo, extra: eq });
      const yP = s * (W / 2 - t - 4);
      E.addPart(`${tag} · Pasador tensor fam. ${fam} ${k} Ø10`, C.acero, [c[0], yP, c[1]], [
        cyl('Pasador Ø10', [c[0], yP, c[1]], [0, s, 0], 10, (yCor + Q.polea.b / 2 + 2) - (W / 2 - t - 4)),
      ], { ...eq, hardware: true });
    }
    // guarda de correa: chapa 1.5 mm por fuera de poleas y correa
    const yG = s * (W / 2 + 20);
    E.addPart(`${tag} · Guarda de correa fam. ${fam}`, C.tapa, [x0, yG, Zm - Rp - 20], [
      box('Chapa 1.5', [x0 + L / 2, yG, Zm - Rp - 20], L, 1.5, (plTop) - (Zm - Rp - 20)),
    ], eq);
    correas[fam] = { filas: filas.map(i => i + 1), largo, xm };
  }

  // --- orejas de anclaje (3 por lado) al nivel del fondo de la carcasa --------
  const xOrejas = [0.125, 0.5, 0.875].map(f => r2(x0 + L * f));
  const zOre = carBot;                                                            // tabs al ras del fondo (bajo correas y motores)
  for (const s of [-1, 1]) for (const x of xOrejas) {
    const yo = s * (W / 2 + Q.oreja.d / 2 - t);
    E.addPart(`${tag} · Oreja de anclaje ${s > 0 ? '+Y' : '−Y'} X${Math.round(x - x0)}`, C.oreja, [x, yo, zOre], [
      box(`Oreja ${Q.oreja.w}×${Q.oreja.d}×${Q.oreja.t}`, [x, yo, zOre], Q.oreja.w, Q.oreja.d, Q.oreja.t),
      ...[-20, 20].map(dx => hole(`Ø${Q.oreja.agujero} (M10)`, [x + dx, s * (W / 2 + Q.oreja.d - t - 20), zOre + Q.oreja.t], [0, 0, -1], Q.oreja.agujero)),
    ], eq);
    for (const dx of [-20, 20]) pernoHex(E, { nombre: `M10 oreja ${tag} ${s > 0 ? '+' : '−'}${Math.round(x - x0)}${dx > 0 ? 'b' : 'a'}`, at: [x + dx, s * (W / 2 + Q.oreja.d - t - 20), zOre + Q.oreja.t], dir: [0, 0, -1], dia: 10, largo: 50, capa: '' }).equipo = tag;
  }
  // --- bastidor propio: 2 largueros PG40 bajo las orejas + 4 patas 40×80 + pies
  const yLg = W / 2 + Q.oreja.d - t - 20, zLg = zOre - 40;
  for (const s of [-1, 1]) {
    E.addPart(`${tag} · Larguero PG40 ${s > 0 ? '+Y' : '−Y'}`, C.perfil, [x0, s * yLg, zLg], [box('PG40', [x0 + L / 2, s * yLg, zLg], L, 40, 40)], { ...eq, componente: 'perfil_pg40' });
    for (const x of [x0 + 60, x0 + L - 60]) {
      const zPie = -P.Hprod, hP = zLg - (zPie + P.mb400.pie.h);
      E.addPart(`${tag} · Pata MA4080 ${s > 0 ? '+Y' : '−Y'} X${Math.round(x - x0)}`, C.perfil, [x, s * yLg, zPie + P.mb400.pie.h], [
        box('MA4080', [x, s * yLg, zPie + P.mb400.pie.h], 40, 80, hP)], { ...eq, componente: 'MA4080' });
      E.addPart(`${tag} · Pie nivelador M12 ${s > 0 ? '+Y' : '−Y'} X${Math.round(x - x0)}`, C.pie, [x, s * yLg, zPie], [
        cyl('Pie Ø56', [x, s * yLg, zPie], [0, 0, 1], P.mb400.pie.D, P.mb400.pie.h)], { ...eq, componente: 'MB400-FT-M12' });
    }
  }
  for (const x of [x0 + 60, x0 + L - 60]) {
    E.addPart(`${tag} · Travesaño 40×40 X${Math.round(x - x0)}`, C.perfil, [x, 0, -P.Hprod + 150], [box('PG40', [x, 0, -P.Hprod + 150], 40, 2 * yLg + 40, 40)], { ...eq, componente: 'perfil_pg40' });
  }

  // --- opcionales: guía de referencia (omni 1) · fotocélula (omni 2) ----------
  if (o.guiaRef) {
    const yg = lado * (W / 2 - t - 4 - Q.guia.t / 2);
    E.addPart(`${tag} · Guía de referencia UHMW ${Q.guia.t}×${Q.guia.h}`, C.uhmw, [x0, yg, Q.guia.z], [
      box('UHMW', [x0 + L / 2, yg, Q.guia.z], L, Q.guia.t, Q.guia.h)], { ...eq, componente: `uhmw_${Q.guia.t}x${Q.guia.h}` });
    for (const x of xOrejas) E.addPart(`${tag} · Escuadra guía X${Math.round(x - x0)}`, C.oreja, [x, lado * (W / 2 - t / 2), plTop], [
      box('Escuadra 40×4', [x, lado * (W / 2 - t / 2 - 2), plTop], 40, 4 + t, 2),
      box('Ala vertical', [x, yg + lado * Q.guia.t / 2 + lado * 2, plTop], 40, 4, Q.guia.z + Q.guia.h - plTop)], eq);
    resumen.guiaY = r2(yg - lado * Q.guia.t / 2);                       // cara de referencia de la guía
  }
  if (o.fotocelula) {
    const xf = r2(x0 + Q.fotocelula.xFrac * L), yf = -lado * (W / 2 - t - 14);
    const [cw, cd, ch] = Q.fotocelula.cuerpo, [ow, od, oh] = Q.fotocelula.ojo;
    E.addPart(`${tag} · Fotocélula de detención (0.82·L)`, C.sensor, [xf, yf, plTop], [
      box('Columna', [xf, yf, plTop], cw, cd, ch),
      box('Cabezal', [xf, yf, plTop + ch], ow, od, oh)], { ...eq, componente: 'fotocelula_reflex' });
    E.addPart(`${tag} · Ojo de fotocélula`, C.ojo, [xf, yf + lado * od / 2, plTop + ch + oh / 2 - 5], [
      box('Lente', [xf, yf + lado * (od / 2 + 1), plTop + ch + oh / 2 - 5], 12, 2, 10)], eq);
    resumen.fotocelulaX = xf;
  }
  resumen.correas = correas;
  resumen.yRueda = yRueda;
  resumen.xFila = [...Array(Q.filas).keys()].map(xFila);
  resumen.zTopPlaca = plTop;
  resumen.yGuardaCorrea = W / 2 + 20 + 1.5;
  resumen.zFondo = zLg;
  return resumen;
}

/** Rueda omni Ø60×38: CUBO (revolución + bore) y 6 RODILLOS a ±45° como piezas
 *  independientes de una sola primitiva: sin booleanas pesadas, el visor las
 *  construye al instante. Los pasadores quedan dentro del rodillo (no se dibujan). */
function ruedaOmni(E, { at, hand, nombre, eq }) {
  const R = P.omni.rueda, Rr = R.D / 2 - R.rodD / 2, [x, y, z] = at, a = R.rodAng * Math.PI / 180;
  const cubo = E.addPart(nombre, '#1b2a3a', [x, y, z], [
    revolve(`Cubo Ø${R.cuboD}×${R.B}`, [x, y - R.B / 2, z], 'y', [[0, R.cuboD / 2], [0, Rr - R.rodD / 2 + 2], [3, Rr - R.rodD / 2 + 2], [3, R.cuboD / 2 + 4],
      [R.B - 3, R.cuboD / 2 + 4], [R.B - 3, Rr - R.rodD / 2 + 2], [R.B, Rr - R.rodD / 2 + 2], [R.B, R.cuboD / 2]]),
    hole(`Bore Ø${P.omni.ejeD}`, [x, y - R.B / 2 - 1, z], [0, 1, 0], P.omni.ejeD),
  ], { ...eq, componente: `rueda_omni_${R.D}x${R.B}_${hand > 0 ? 'izq' : 'der'}` });
  for (let k = 0; k < R.nRod; k++) {
    const th = (2 * Math.PI * k) / R.nRod + (hand > 0 ? 0 : Math.PI / R.nRod);
    const p = [x + Rr * Math.cos(th), y, z + Rr * Math.sin(th)];
    const tg = [-Math.sin(th), 0, Math.cos(th)];
    const d = [tg[0] * Math.cos(a), hand * Math.sin(a), tg[2] * Math.cos(a)].map(r2);
    const a0 = [p[0] - d[0] * R.rodL / 2, p[1] - d[1] * R.rodL / 2, p[2] - d[2] * R.rodL / 2].map(r2);
    E.addPart(`${nombre.replace('Rueda omni', 'Rodillo omni')} #${k + 1}`, '#2456c8', a0, [
      cyl(`Rodillo Ø${R.rodD}×${R.rodL} a ${hand > 0 ? '+' : '−'}${R.rodAng}°`, a0, d, R.rodD, R.rodL),
    ], { ...eq, componente: `rodillo_omni_${R.rodD}x${R.rodL}`, subparte: cubo.id });
  }
  return cubo;
}
