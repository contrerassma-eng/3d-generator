// cinta.mjs — CINTA PLANA PERPENDICULAR DE SALIDA (CV-BLT-500): transportador
// de banda plana de 500 × 2000 que recibe, a 90°, las cajas grandes eyectadas
// por el omni 2. Bastidor de canal C 120×40×4 (alas hacia afuera), cama
// deslizante PL3, tambores Ø89 con eje Ø25 en chumaceras UCF, motorreductor de
// eje hueco (componente del catálogo) en el tambor de descarga, placa de
// transferencia (nosebar) hacia el omni. Capa `user`.
//
// Ejes del proyecto: X flujo de la línea · Y ancho; la CINTA corre en Y hacia
// `lado` · Z arriba, 0 = plano de producto de la línea (la cinta queda `drop` abajo).

import { box, cyl, hole, pernoHex, COL, r2 } from '../nbt90/lib.mjs';
import { P } from './params.mjs';

const C = { banda: '#2b2b2b', canal: '#2f3e4f', cama: '#9aa4b2', tambor: '#b0bec5', acero: COL.acero, bloque: '#7e8a96',
  motor: '#546e7a', perfil: '#b0bec5', pie: '#455a64', placa: '#c3ccd6' };

/** @param {object} o { xc, yNariz, tag } — yNariz: cara exterior de la vuelta de entrada */
export function cinta(E, o) {
  const K = P.cinta, { xc, yNariz, tag } = o, lado = P.lado, eq = { equipo: tag };
  const W = K.W, L = K.L, Rd = K.tamborD / 2, bt = K.bandaT, Ro = Rd + bt;
  const zTop = -K.drop, zEje = zTop - Ro;                                    // banda arriba en zTop
  const y1 = r2(yNariz + lado * Ro), y2 = r2(yNariz + lado * (L - Ro)), ym = r2((y1 + y2) / 2), span = r2(Math.abs(y2 - y1));
  const xWeb = { lo: xc - (W / 2 + 20), hi: xc + (W / 2 + 20) };               // centros de las almas del canal
  const zCanal = { bot: zTop - 3 - 2 - K.canal.h, top: zTop - 3 - 2 };          // canal bajo la cama
  const res = { zTop, zEje, y1, y2, W, L, xWeb, yNariz, yFin: r2(yNariz + lado * L) };

  // --- banda plana (lazo) ------------------------------------------------------
  E.addPart(`${tag} · Banda plana PVC ${W}×${r2(2 * span + Math.PI * (K.tamborD + bt))}`, C.banda, [xc, ym, zEje], [
    box('Ramal superior', [xc, ym, zTop - bt], W, span, bt),
    box('Ramal de retorno', [xc, ym, zEje - Rd - bt], W, span, bt),
    cyl('Vuelta entrada', [xc - W / 2, y1, zEje], [1, 0, 0], 2 * Ro, W),
    cyl('Vuelta descarga', [xc - W / 2, y2, zEje], [1, 0, 0], 2 * Ro, W),
    cyl('Interior entrada', [xc - W / 2 - 1, y1, zEje], [1, 0, 0], 2 * Rd, W + 2, 'cut'),
    cyl('Interior descarga', [xc - W / 2 - 1, y2, zEje], [1, 0, 0], 2 * Rd, W + 2, 'cut'),
  ], { ...eq, componente: `banda_pvc_${W}` });
  // --- tambores Ø89 (tubo 4) + ejes Ø25 ----------------------------------------
  const Wt = W + 20;                                                                // cara del tambor 10 mm más ancha que la banda por lado
  for (const [y, rol] of [[y1, 'tensor'], [y2, 'motriz']]) {
    E.addPart(`${tag} · Tambor ${rol} Ø${K.tamborD}×${Wt}`, C.tambor, [xc - Wt / 2, y, zEje], [
      cyl('Tubo', [xc - Wt / 2, y, zEje], [1, 0, 0], K.tamborD, Wt),
      cyl('Interior tubo', [xc - Wt / 2 + 6, y, zEje], [1, 0, 0], K.tamborD - 2 * K.tamborT, Wt - 12, 'cut'),
    ], { ...eq, componente: `tambor_${K.tamborD}x${Wt}` });
    const ext = rol === 'motriz' ? K.motor.cubo[1] + 10 : 0;
    const xA = xWeb.lo - 70, xB = xWeb.hi + 70 + ext;
    E.addPart(`${tag} · Eje ${rol} Ø25×${r2(xB - xA)}`, C.acero, [xA, y, zEje], [cyl('Eje Ø25', [xA, y, zEje], [1, 0, 0], 25, xB - xA)], { ...eq, componente: 'eje_25' });
    for (const [x, s] of [[xWeb.lo - 2 - 20, -1], [xWeb.hi + 2 + 20, 1]]) {
      E.addPart(`${tag} · Chumacera UCF205 ${rol} ${s > 0 ? '+X' : '−X'}`, C.bloque, [x, y, zEje - 20], [
        box('Bloque 40×60×40', [x, y, zEje - 20], 40, 60, 40), hole('Bore Ø25', [x - s * 20, y, zEje], [s, 0, 0], 25)], { ...eq, componente: 'chumacera_ucfl205' });
    }
  }
  // --- motorreductor de eje hueco (catálogo: cubo Ø56×84 + cuerpo 96×86×92) ------
  {
    const [cd, cl] = K.motor.cubo, [bw, bd, bh] = K.motor.cuerpo, x0m = xWeb.hi + 2 + 40 + 6;
    E.addPart(`${tag} · Motorreductor de eje hueco`, C.motor, [x0m, y2, zEje], [
      cyl(`Cubo eje hueco Ø${cd}×${cl}`, [x0m, y2, zEje], [1, 0, 0], cd, cl),
      box(`Cuerpo ${bw}×${bd}×${bh}`, [x0m + 42, y2, zEje - 78], bw, bd, bh),
      box('Brazo de torque', [x0m + 10, y2 + lado * 60, zEje - 78], 20, 8, 70),
    ], { ...eq, componente: 'motorreductor_eje_hueco' });
  }
  // --- cama deslizante + bastidor de canal C --------------------------------------
  E.addPart(`${tag} · Cama deslizante PL${K.cama}`, C.cama, [xc, ym, zTop - bt - K.cama], [box('PL3', [xc, ym, zTop - bt - K.cama], W, span - 2 * Rd, K.cama)], { ...eq, componente: `pl${K.cama}_cama` });
  for (const [x, s] of [[xWeb.lo, -1], [xWeb.hi, 1]]) {
    E.addPart(`${tag} · Canal lateral C${K.canal.h}×${K.canal.ala}×${K.canal.t} ${s > 0 ? '+X' : '−X'}`, C.canal, [x, ym, zCanal.bot], [
      box('Alma', [x, ym, zCanal.bot], K.canal.t, L - 10, K.canal.h),
      box('Ala superior', [x + s * K.canal.ala / 2, ym, zCanal.top - K.canal.t], K.canal.ala, L - 10, K.canal.t),
      box('Ala inferior', [x + s * K.canal.ala / 2, ym, zCanal.bot], K.canal.ala, L - 10, K.canal.t),
    ], { ...eq, componente: `canal_c${K.canal.h}` });
  }
  // travesaños: 3 bajo la cama (entre ramales) y 2 bajo el ramal de retorno
  for (const f of [0.25, 0.5, 0.75]) {
    const y = r2(y1 + (y2 - y1) * f);
    E.addPart(`${tag} · Travesaño soporte cama Y${Math.round(y)}`, C.perfil, [xc, y, zTop - bt - K.cama - 40], [box('Tubo 40×40', [xc, y, zTop - bt - K.cama - 40], W + 36, 40, 40)], { ...eq, componente: 'tubo_40x40' });
  }
  for (const f of [0.15, 0.85]) {
    const y = r2(y1 + (y2 - y1) * f);
    E.addPart(`${tag} · Travesaño inferior Y${Math.round(y)}`, C.perfil, [xc, y, zCanal.bot], [box('Tubo 40×40', [xc, y, zCanal.bot], W + 36, 40, 40)], { ...eq, componente: 'tubo_40x40' });
  }
  // --- patas 40×80 bajo los canales + pies + travesaño inferior ---------------------
  const patasY = [r2(yNariz + lado * 120), r2(yNariz + lado * (L - 120))];
  for (const y of patasY) {
    for (const [x, s] of [[xWeb.lo, -1], [xWeb.hi, 1]]) {
      const zPie = -P.Hprod, z0 = zPie + K.pie.h;
      E.addPart(`${tag} · Pata MA4080 ${s > 0 ? '+X' : '−X'} Y${Math.round(y)}`, C.perfil, [x, y, z0], [box('MA4080', [x, y, z0], K.pata.d, K.pata.w, zCanal.bot - z0)], { ...eq, componente: 'MA4080' });
      E.addPart(`${tag} · Pie nivelador M12 ${s > 0 ? '+X' : '−X'} Y${Math.round(y)}`, C.pie, [x, y, zPie], [cyl('Pie Ø56', [x, y, zPie], [0, 0, 1], K.pie.D, K.pie.h)], { ...eq, componente: 'MB400-FT-M12' });
      for (const dx of [-15, 15]) pernoHex(E, { nombre: `M8 pata ${tag} ${s > 0 ? '+' : '−'}${Math.round(y)}${dx > 0 ? 'b' : 'a'}`, at: [x + dx, y - 10, zCanal.bot + K.canal.t], dir: [0, 0, -1], dia: 8, largo: 60, capa: '' }).equipo = tag;
    }
    E.addPart(`${tag} · Travesaño de patas Y${Math.round(y)}`, C.perfil, [xc, y, -P.Hprod + 150], [box('Tubo 40×40', [xc, y, -P.Hprod + 150], W + 40, 40, 40)], { ...eq, componente: 'tubo_40x40' });
  }
  // --- placa de transferencia (nosebar) hacia el omni --------------------------------
  const yIni = r2(lado * (P.omni.W / 2 + 4)), yFinP = r2(yNariz + lado * 20);           // arranca 4 mm fuera de la placa del omni (sólo asoma el rodamiento, bajo Z −14)
  const yc = r2((yIni + yFinP) / 2), dP = r2(Math.abs(yFinP - yIni));
  E.addPart(`${tag} · Placa de transferencia PL3 (${dP} mm)`, C.placa, [xc, yc, zTop + 2], [
    box('PL3 inox', [xc, yc, zTop + 2], W, dP, 3)], { ...eq, componente: 'placa_transferencia' });
  for (const s of [-1, 1]) E.addPart(`${tag} · Pestaña de placa ${s > 0 ? '+X' : '−X'}`, C.placa, [xc + s * (W / 2 - 2), yc + lado * 12, zTop + 2 - 30], [
    box('Pestaña PL4', [xc + s * (W / 2 - 2), yc + lado * 12, zTop + 2 - 30], 4, dP - 24, 30)], { ...eq, componente: 'pestana_placa_transferencia' });
  res.placaTransf = { yIni, yFin: yFinP, zTop: zTop + 5 };
  return res;
}
