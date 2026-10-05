// omni.mjs — BLOQUE OMNI (CV-OMW): placa de ruedas omnidireccionales de 24"×24"
// con 8 filas a paso 3" y 7 ruedas por fila (render del usuario 2026-10-05:
// 8 filas × 7 ventanas, UN MOTOR POR FILA en carcasas ventiladas al costado,
// 3 orejas por lado). Filas ALTERNADAS por el sentido de los rodillos (±45°):
// filas pares (familia A) e impares (familia B) se comandan por separado.
// Mismo sentido en ambas = avance; sentidos opuestos = empuje lateral
// (justificación en el omni 1, eyección a 90° en el omni 2).
//
// Capa `user` (diseño Conveyone). Cotas en params.mjs. Ejes del proyecto:
// X flujo · Y ancho (+Y izquierda) · Z arriba, 0 = corona de las ruedas.

import { box, cyl, hole, revolve, rodamiento, pernoHex, COL, r2 } from '../nbt90/lib.mjs';
import { P } from './params.mjs';

const C = {
  negro: '#15181d', tapa: '#d9dde2', claro: '#d9dde2', azul: '#2456c8', rueda: '#3a3f46', rodillo: '#555b63', acero: COL.acero, inox: COL.inox,
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
  const resumen = { filas: Q.filas, porFila: Q.porFila, ruedas: Q.filas * Q.porFila, ejeZ, L, W };

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
    E.addPart(`${tag} · Tapa superior`, C.claro, [x0, 0, Q.tapa.z], feats, eq);
  }
  // --- carcasa inferior (cubeta abierta arriba) ----------------------------
  E.addPart(`${tag} · Carcasa inferior`, C.negro, [x0, 0, carBot], [
    box(`Cubeta ${L}×${r2(W - 2 * t)}×${Q.carcasa.h}`, [x0 + L / 2, 0, carBot], L, W - 2 * t, Q.carcasa.h),
    box('Vaciado', [x0 + L / 2, 0, carBot + 2], L - 4, W - 2 * t - 4, Q.carcasa.h + 2, 'cut'),
  ], eq);

  // --- filas: eje Ø15 + 7 ruedas omni + 2 rodamientos 6002 + polea ----------
  for (let i = 0; i < Q.filas; i++) {
    const x = xFila(i), fam = i % 2 === 0 ? 'A' : 'B', hand = fam === 'A' ? 1 : -1, sMot = -lado;
    const yIni = sMot > 0 ? -(W / 2 + 6) : -(W / 2 + 4 + 14), Le = r2((W / 2 + 6) + (W / 2 + 4 + 14));   // hasta el acople del motor
    E.addPart(`${tag} · Eje fila ${i + 1} Ø${Q.ejeD} (fam. ${fam})`, C.acero, [x, yIni, ejeZ], [
      cyl(`Eje Ø${Q.ejeD}×${Le}`, [x, yIni, ejeZ], [0, 1, 0], Q.ejeD, Le),
    ], { ...eq, componente: `eje_${Q.ejeD}x${Le}` });
    for (const y of yRueda) ruedaOmni(E, { at: [x, y, ejeZ], hand, nombre: `${tag} · Rueda omni f${i + 1} y${y}`, eq });
    for (const sb of [-1, 1]) {
      rodamiento(E, { nombre: `${tag} f${i + 1} ${sb > 0 ? '+Y' : '−Y'}`, at: [x, sb * (W / 2 - t), ejeZ], dir: [0, sb, 0], ...Q.rodamiento, capa: '' });
      E.parts[E.parts.length - 1].equipo = tag;
    }
  }

  // --- accionamiento: UN MOTORREDUCTOR 24 V POR FILA (render del usuario): los 8 motores asoman
  //     de una banda negra bajo el canto del deck y van cubiertos por UNA carcasa ventilada
  //     continua (gris claro) colgada de la placa, al lado opuesto a la referencia
  const sM = -lado, motores = [], Mo = Q.motorFila;
  const yPlExt = sM * (W / 2), yC0 = yPlExt + sM * 4;                 // la carcasa arranca 4 mm fuera de la placa
  const zCarc = plTop - Mo.carcasa[2];                                // su canto superior al ras del deck
  {
    const feats = [box(`Carcasa ventilada ${L}×${Mo.carcasa[1]}×${Mo.carcasa[2]}`, [x0 + L / 2, yC0 + sM * Mo.carcasa[1] / 2, zCarc], L, Mo.carcasa[1], Mo.carcasa[2]),
      box('Vaciado', [x0 + L / 2, yC0 + sM * Mo.carcasa[1] / 2, zCarc + 1.5], L - 3, Mo.carcasa[1] - 3, Mo.carcasa[2] - 3, 'cut')];
    for (let i = 0; i < Q.filas; i++) {
      for (let k = 0; k < 5; k++) feats.push(box(`Ranura f${i + 1}.${k + 1}`, [xFila(i), yC0 + sM * (Mo.carcasa[1] + 1), zCarc + 10 + k * 11], Q.paso - 22, 4, 5, 'cut'));
      feats.push(hole(`Paso motor f${i + 1} Ø${Mo.D + 4}`, [xFila(i), yC0 - sM * 1, ejeZ], [0, sM, 0], Mo.D + 4));
    }
    E.addPart(`${tag} · Carcasa ventilada de motores`, C.claro, [x0, yC0 + sM * Mo.carcasa[1] / 2, zCarc], feats, { ...eq, componente: `carcasa_motores_${L}x${Mo.carcasa[1]}x${Mo.carcasa[2]}` });
  }
  for (let i = 0; i < Q.filas; i++) {
    const x = xFila(i), fam = i % 2 === 0 ? 'A' : 'B';
    E.addPart(`${tag} · Motorreductor 24 V fila ${i + 1} (fam. ${fam})`, C.motor, [x, yC0 + sM * 6, ejeZ], [
      cyl(`Motor Ø${Mo.D}×${Mo.L}`, [x, yC0 + sM * 6, ejeZ], [0, sM, 0], Mo.D, Mo.L),
      cyl('Acople al eje Ø30', [x, yC0 - sM * 6, ejeZ], [0, sM, 0], 30, 12),
      cyl('Tapa encoder Ø36', [x, yC0 + sM * (6 + Mo.L), ejeZ], [0, sM, 0], 36, 4),
      box('Escuadra de motor', [x, yC0 + sM * 3, ejeZ - 36], 40, 3, 72),
    ], { ...eq, componente: `motorreductor_24v_${Mo.D}x${Mo.L}` });
    motores.push({ fila: i + 1, fam, x });
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
  resumen.motores = motores;
  resumen.yRueda = yRueda;
  resumen.xFila = [...Array(Q.filas).keys()].map(xFila);
  resumen.zTopPlaca = plTop;
  resumen.yExtMotores = W / 2 + 4 + Q.motorFila.carcasa[1];   // lado −lado
  resumen.yExtLibre = W / 2 + 3;                              // lado de salida: sólo asoma el rodamiento
  resumen.zFondo = zLg;
  return resumen;
}

/** Rueda omni Ø60×38: CUBO (revolución + bore) y 6 RODILLOS a ±45° como piezas
 *  independientes de una sola primitiva: sin booleanas pesadas, el visor las
 *  construye al instante. Los pasadores quedan dentro del rodillo (no se dibujan). */
function ruedaOmni(E, { at, hand, nombre, eq }) {
  const R = P.omni.rueda, Rr = R.D / 2 - R.rodD / 2, [x, y, z] = at, a = R.rodAng * Math.PI / 180;
  const cubo = E.addPart(nombre, '#2a2f36', [x, y, z], [
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
    E.addPart(`${nombre.replace('Rueda omni', 'Rodillo omni')} #${k + 1}`, '#555b63', a0, [
      cyl(`Rodillo Ø${R.rodD}×${R.rodL} a ${hand > 0 ? '+' : '−'}${R.rodAng}°`, a0, d, R.rodD, R.rodL),
    ], { ...eq, componente: `rodillo_omni_${R.rodD}x${R.rodL}`, subparte: cubo.id });
  }
  return cubo;
}
