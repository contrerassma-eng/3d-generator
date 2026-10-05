// mb400.mjs — Transportador de BANDA MODULAR M-haste MB400 (cotas del generador
// paramétrico Conveyone-/backend/mhaste/src/mb400.py, capa `cad`), en dos usos:
//   · TWIN BELT (CV-TWB-MB400): dos carriles MB400 W200 con ventana central de
//     100 mm; bajo la ventana va el BOX DE CÁMARA (alargado a 500) que lee el
//     QR por el fondo de la caja; guarda de teflón con embudo de entrada en el
//     lado de referencia y fotocélula de disparo cuando la caja entró completa.
//   · MB400 L4000 (CV-MB400-4000): un carril W400 que separa (gapper) y lleva
//     las cajas hasta el omni de clasificación.
// Ambos comparten ejes Ø25 con piñones Ø90, tiras de desgaste UHMW, bastidor
// T-slot 40, patas MA4080 con pie M12 y motorreductor 160×72 lateral.
//
// Ejes del proyecto: X flujo · Y ancho (+Y izquierda) · Z arriba, 0 = cara
// superior de la banda. Unidades mm. Capa `user` salvo lo citado como `cad`.

import { box, cyl, hole, sketchXY, polea, pernoHex, COL, r2 } from '../nbt90/lib.mjs';
import { P } from './params.mjs';

const C = {
  banda: '#3b4a5a', uhmw: '#e8e4d8', acero: COL.acero, perfil: '#b0bec5', pie: '#455a64', motor: '#546e7a',
  bloque: '#7e8a96', placa: '#8fa3b8', box: '#1f2a36', vidrio: '#a9d7e8', camara: '#263238', led: '#fff3b0',
  sensor: '#2a3138', reflector: '#c9752e', teflon: '#f2efe6',
};

/**
 * @param {object} o { x0, L, carriles:[{yc,W}], tag, patasX:[x…], twin?:true }
 */
export function mb400(E, o) {
  const M = P.mb400, { x0, L, tag } = o, lado = P.lado;
  const R = M.sprocketD / 2, bt = M.bandaT, Ro = R + bt;             // nariz: radio exterior de la banda
  const xs1 = r2(x0 + Ro), xs2 = r2(x0 + L - Ro), zEje = -Ro;        // banda arriba en Z = 0
  const xm = r2((xs1 + xs2) / 2), span = r2(xs2 - xs1);
  const yMin = Math.min(...o.carriles.map(c => c.yc - c.W / 2)), yMax = Math.max(...o.carriles.map(c => c.yc + c.W / 2));
  const sMot = -lado;                                                 // motor en el lado opuesto a la referencia
  const eq = { equipo: tag };
  const res = { xs1, xs2, zEje, yMin, yMax, carriles: o.carriles.length, L, bandaTop: 0 };

  // --- carriles: lazo de banda modular + piñones + tiras de desgaste ----------
  for (const [ci, c] of o.carriles.entries()) {
    const nSp = Math.max(2, Math.round(c.W / 120) + 1), nTira = Math.max(2, Math.round(c.W / 80));
    E.addPart(`${tag} · Banda modular MB400 W${c.W} carril ${ci + 1}`, C.banda, [xm, c.yc, zEje], [
      box('Ramal superior', [xm, c.yc, -bt], span, c.W, bt),
      box('Ramal de retorno', [xm, c.yc, zEje - R - bt], span, c.W, bt),
      cyl('Vuelta nariz entrada', [xs1, c.yc - c.W / 2, zEje], [0, 1, 0], 2 * Ro, c.W),
      cyl('Vuelta nariz salida', [xs2, c.yc - c.W / 2, zEje], [0, 1, 0], 2 * Ro, c.W),
      cyl('Interior vuelta entrada', [xs1, c.yc - c.W / 2 - 1, zEje], [0, 1, 0], 2 * R, c.W + 2, 'cut'),
      cyl('Interior vuelta salida', [xs2, c.yc - c.W / 2 - 1, zEje], [0, 1, 0], 2 * R, c.W + 2, 'cut'),
    ], { ...eq, componente: `MB400-BELT-MOD-W${c.W}`, largoBanda: r2(2 * span + Math.PI * (M.sprocketD + bt)) });
    for (let i = 0; i < nSp; i++) {
      const y = r2(c.yc - c.W / 2 + M.sprocketW / 2 + (c.W - M.sprocketW) * i / (nSp - 1));
      for (const [xs, rol] of [[xs1, 'conducido'], [xs2, 'motriz']]) {
        polea(E, { nombre: `${tag} · Piñón ${rol} Ø${M.sprocketD} c${ci + 1}.${i + 1}`, at: [xs, y - M.sprocketW / 2, zEje], dir: [0, 1, 0],
          od: M.sprocketD, ancho: M.sprocketW, bore: M.ejeD, color: '#c9a227', extra: { ...eq, componente: `MB400-SPR-${rol === 'motriz' ? 'DRV' : 'IDL'}-D${M.sprocketD}` } });
      }
    }
    for (let i = 0; i < nTira; i++) {
      const y = r2(c.yc - c.W / 2 + M.tira.w / 2 + 6 + (c.W - M.tira.w - 12) * i / (nTira - 1));
      E.addPart(`${tag} · Tira de desgaste UHMW c${ci + 1}.${i + 1}`, C.uhmw, [xm, y, -bt - M.tira.h], [
        box(`UHMW ${M.tira.w}×${M.tira.h}`, [xm, y, -bt - M.tira.h], span - 2 * R, M.tira.w, M.tira.h)], { ...eq, componente: `MB400-WS-L${Math.round(span - 2 * R)}` });
    }
  }
  // --- ejes Ø25 (el motriz se prolonga al motorreductor) ----------------------
  const yBlk = { lo: yMin - 20, hi: yMax + 20 };                                   // centros de los bloques UCF
  for (const [xs, rol] of [[xs1, 'conducido'], [xs2, 'motriz']]) {
    const extra = rol === 'motriz' ? 48 + M.motor.cuerpo[1] : 0;
    const yA = yMin - 40 - (sMot < 0 ? extra : 0), yB = yMax + 40 + (sMot > 0 ? extra : 0);
    E.addPart(`${tag} · Eje ${rol} Ø${M.ejeD}×${r2(yB - yA)}`, C.acero, [xs, yA, zEje], [
      cyl(`Eje Ø${M.ejeD}`, [xs, yA, zEje], [0, 1, 0], M.ejeD, yB - yA)], { ...eq, componente: `MB400-SH-${rol === 'motriz' ? 'DRV' : 'IDL'}-${M.ejeD}` });
    for (const [y, s] of [[yBlk.lo, -1], [yBlk.hi, 1]]) {
      const [bw, bd, bh] = M.rodamientoBloque;
      E.addPart(`${tag} · Rodamiento con soporte UCF ${rol} ${s > 0 ? '+Y' : '−Y'}`, C.bloque, [xs, y, zEje - bh / 2], [
        box(`Bloque ${bw}×${bd}×${bh}`, [xs, y, zEje - bh / 2], bw, bd, bh),
        hole(`Bore Ø${M.ejeD}`, [xs, y - s * bd / 2, zEje], [0, s, 0], M.ejeD),
      ], { ...eq, componente: 'MB400-BRG-UCF' });
      // soporte del bloque al larguero (cabezal)
      E.addPart(`${tag} · Soporte de eje ${rol} ${s > 0 ? '+Y' : '−Y'}`, C.placa, [xs, y + s * 10, -125 + M.riel / 2], [
        box('Soporte PL8', [xs, y + s * 10, -125 + M.riel / 2], bw, 60, (zEje - bh / 2) - (-125 + M.riel / 2))], { ...eq, componente: 'MB400-SB' });
    }
  }
  // --- motorreductor lateral 160×72 + placa 95×95×8 --------------------------
  {
    const [mw, md, mh] = M.motor.cuerpo, [pw, pd, pt] = M.motor.placa;
    const yP = yMax + 40 + 4;                                                       // placa pegada al bloque
    const yPl = sMot > 0 ? yP : -(yP) + (yMax + yMin), yc = sMot > 0 ? yPl + pt / 2 + 4 + md / 2 : yPl - pt / 2 - 4 - md / 2;
    E.addPart(`${tag} · Placa de motor ${pw}×${pd}×${pt}`, C.placa, [xs2, yPl, zEje - pd / 2], [box('Placa', [xs2, yPl, zEje - pd / 2], pw, pt, pd)], { ...eq, componente: 'MB400-MP' });
    E.addPart(`${tag} · Motorreductor MT-GM-160x72`, C.motor, [xs2, yc, zEje - mh / 2], [
      box(`Reductor ${mw}×${md}×${mh}`, [xs2, yc, zEje - mh / 2], mw, md, mh),
      cyl('Motor Ø72', [xs2, yc + (sMot > 0 ? md / 2 : -md / 2), zEje], [0, sMot, 0], 72, 110),
    ], { ...eq, componente: 'MT-GM-160x72' });
    res.motorY = yc;
  }
  // --- bastidor: 2 largueros T-slot 40 + travesaños + patas + pies -------------
  const yRl = { lo: yMin - 30, hi: yMax + 30 }, zRl = -125;                      // centro del larguero
  for (const [y, s] of [[yRl.lo, -1], [yRl.hi, 1]]) {
    E.addPart(`${tag} · Larguero T-slot 40 ${s > 0 ? '+Y' : '−Y'} L${L}`, C.perfil, [x0, y, zRl - M.riel / 2], [
      box('T-slot 40×40', [x0 + L / 2, y, zRl - M.riel / 2], L, M.riel, M.riel)], { ...eq, componente: `MB400-PF-40-L${L}` });
  }
  const anchoTr = r2(yRl.hi - yRl.lo + M.riel);
  for (const xp of o.patasX) {
    E.addPart(`${tag} · Travesaño T-slot 40 X${Math.round(xp - x0)}`, C.perfil, [xp, 0, zRl - M.riel / 2 - M.riel], [
      box('T-slot 40×40', [xp, (yRl.lo + yRl.hi) / 2, zRl - M.riel / 2 - M.riel], M.riel, anchoTr, M.riel)], { ...eq, componente: `MB400-PF-40-W${Math.round(anchoTr)}` });
    for (const [y, s] of [[yRl.lo, -1], [yRl.hi, 1]]) {
      const zPie = -P.Hprod, z0 = zPie + M.pie.h, hP = (zRl - M.riel / 2 - M.riel) - z0;
      E.addPart(`${tag} · Pata MA4080 ${s > 0 ? '+Y' : '−Y'} X${Math.round(xp - x0)}`, C.perfil, [xp, y, z0], [
        box('MA4080', [xp, y, z0], M.pata.w, M.pata.d, hP)], { ...eq, componente: 'MA4080' });
      E.addPart(`${tag} · Pie nivelador M12 ${s > 0 ? '+Y' : '−Y'} X${Math.round(xp - x0)}`, C.pie, [xp, y, zPie], [
        cyl('Pie Ø56', [xp, y, zPie], [0, 0, 1], M.pie.D, M.pie.h)], { ...eq, componente: 'MB400-FT-M12' });
      for (const dy of [-12, 12]) pernoHex(E, { nombre: `M6 pata ${tag} ${Math.round(xp - x0)}${s > 0 ? '+' : '−'}${dy > 0 ? 'b' : 'a'}`, at: [xp + (dy > 0 ? 12 : -12), y + dy, zRl + M.riel / 2], dir: [0, 0, -1], dia: 6, largo: 16, capa: '' }).equipo = tag;
    }
  }
  // --- guías laterales LA 6×30 (en el lado de referencia del twin va el teflón)
  for (const [y, s] of [[yMin - 4 - M.guiaLA.t / 2, -1], [yMax + 4 + M.guiaLA.t / 2, 1]]) {
    if (o.twin && s === lado) continue;
    E.addPart(`${tag} · Guía lateral LA ${s > 0 ? '+Y' : '−Y'}`, C.perfil, [x0, y, 2], [box('LA 6×30', [x0 + L / 2, y, 2], L, M.guiaLA.t, M.guiaLA.h)], { ...eq, componente: `MB400-LA-L${L}` });
  }

  if (o.twin) Object.assign(res, twinExtras(E, o, { xs1, xs2, zEje, yMin, yMax, eq, sMot }));
  return res;
}

/** Box de cámara, guarda de teflón con embudo, fotocélula de disparo. */
function twinExtras(E, o, g) {
  const T = P.mb400.twin, M = P.mb400, { x0, tag } = o, lado = P.lado, { yMin, yMax, eq } = g;
  const xV = r2(x0 + T.xVentana), K = T.capota;
  const out = { ventana: T.ventana, xVentana: xV, Lventana: T.Lventana };
  // --- CAPOTA DE CÁMARA (STEP del usuario, alargada): túnel abierto por abajo sobre la cinta
  const z0 = K.zBase, zTopC = z0 + K.H, Lc = K.L, Wc = K.W;
  E.addPart(`${tag} · Capota de cámara ${Lc}×${Wc}×${K.H} (STEP alargado)`, C.box, [xV, 0, z0], [
    box('Carcasa exterior', [xV, 0, z0], Lc, Wc, K.H),
    box('Interior (abierta por abajo)', [xV, 0, z0 - 1], Lc - 2 * K.cabecero, Wc - 2 * K.frontal, K.H - K.panel + 1, 'cut'),
    ...[-1, 1].map(s => box(`Abertura de paso ${s > 0 ? 'salida' : 'entrada'}`, [xV + s * (Lc / 2 - K.cabecero / 2), 0, z0 - 1], K.cabecero + 2, K.abertura.W, K.abertura.H + 1, 'cut')),
  ], { ...eq, componente: `capota_camara_${Lc}x${Wc}x${Math.round(K.H)}` });
  E.addPart(`${tag} · Cubrejunta superior ${K.cubrejunta.join('×')}`, C.placa, [xV, 0, zTopC], [box('Cubrejunta', [xV, 0, zTopC], Math.min(K.cubrejunta[0], Lc - 2 * K.cabecero), K.cubrejunta[1], K.cubrejunta[2])], { ...eq, componente: 'capota_cubrejunta' });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) E.addPart(`${tag} · Pad superior ${sx > 0 ? '+X' : '−X'}${sy > 0 ? '+Y' : '−Y'}`, C.placa, [xV + sx * (Lc / 2 - K.cabecero - K.pad[0] / 2), sy * (Wc / 2 - K.frontal - K.pad[1] / 2 - 10), zTopC], [
    box('Pad 100×100×30', [xV + sx * (Lc / 2 - K.cabecero - K.pad[0] / 2), sy * (Wc / 2 - K.frontal - K.pad[1] / 2 - 10), zTopC], K.pad[0], K.pad[1], K.pad[2])], { ...eq, componente: 'capota_pad' });
  // cámara colgada del techo, mirando hacia ABAJO
  const [cw, cd, ch] = K.camara.cuerpo, zLente = zTopC - K.panel - ch - 12;
  E.addPart(`${tag} · Cámara de lectura QR (mira hacia abajo)`, C.camara, [xV, 0, zTopC - K.panel - ch], [
    box(`Cuerpo ${cw}×${cd}×${ch}`, [xV, 0, zTopC - K.panel - ch], cw, cd, ch),
    cyl(`Óptica Ø${K.camara.lenteD}`, [xV, 0, zTopC - K.panel - ch], [0, 0, -1], K.camara.lenteD, 12),
  ], { ...eq, componente: 'camara_qr' });
  for (const s of [-1, 1]) E.addPart(`${tag} · Barra LED ${s > 0 ? '+Y' : '−Y'}`, C.led, [xV, s * 160, zTopC - K.panel - K.led.s - 40], [
    box(`LED ${K.led.L}×${K.led.s}`, [xV, s * 160, zTopC - K.panel - K.led.s - 40], K.led.L, K.led.s, K.led.s)], { ...eq, componente: `barra_led_${K.led.L}` });
  // 4 patas 40×40 al piso, por fuera del bastidor del twin
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const xp = xV + sx * (Lc / 2 - 40), yp = sy * (Wc / 2 - 40), zPie = -P.Hprod;
    E.addPart(`${tag} · Pata capota ${sx > 0 ? '+X' : '−X'}${sy > 0 ? '+Y' : '−Y'}`, C.perfil, [xp, yp, zPie + M.pie.h], [box('Perfil 40×40', [xp, yp, zPie + M.pie.h], K.pata.w, K.pata.d, z0 - (zPie + M.pie.h))], { ...eq, componente: 'perfil_40x40' });
    E.addPart(`${tag} · Pie nivelador capota ${sx > 0 ? '+X' : '−X'}${sy > 0 ? '+Y' : '−Y'}`, C.pie, [xp, yp, zPie], [cyl('Pie Ø56', [xp, yp, zPie], [0, 0, 1], M.pie.D, M.pie.h)], { ...eq, componente: 'MB400-FT-M12' });
  }
  // FOV desde arriba: la óptica debe cubrir la tapa de la caja grande centrada bajo la cámara
  const dist = zLente - P.caja.grande.H, semi = dist * Math.tan(K.camara.fovDeg / 2 * Math.PI / 180);
  out.capota = { x0: r2(xV - Lc / 2), x1: r2(xV + Lc / 2), L: Lc, W: Wc, H: K.H, zBase: z0, zLente: r2(zLente) };
  out.fov = { distanciaATapaGrande: r2(dist), semiCobertura: r2(semi), requiereL: P.caja.grande.L / 2, requiereW: P.caja.grande.W / 2 };

  // guarda de teflón: cara de referencia en Y = lado·(ventana/2 + Wcaja chica − ventana/2 …) → la caja chica
  // queda a CABALLO de la ventana: cara en lado·T.ventana/2 + lado·(Wchica − ventana)/2 … simplificado a lado·150
  const yCara = lado * (T.ventana / 2 + (P.caja.chica.W - T.ventana) / 2);          // −150: caja chica −150..+50, grande −150..+150
  const F = T.teflon.flare, ySal = (o.guiaRefY ?? (lado * (P.omni.W / 2 - P.omni.placa.t - 4 - P.omni.guia.t))), tt = T.teflon.t;
  const flareDeg = r2(Math.atan(Math.abs(ySal - yCara) / F) * 180 / Math.PI);
  E.addPart(`${tag} · Guarda de teflón (UHMW) con embudo ${flareDeg}°`, C.teflon, [x0, yCara, T.teflon.h / 2], [
    sketchXY('Embudo', 2, [[x0, ySal], [x0 + F, yCara], [x0 + F, yCara + lado * tt], [x0, ySal + lado * tt]], T.teflon.h),
    box('Tramo recto', [x0 + F + (o.L - F) / 2, yCara + lado * tt / 2, 2], o.L - F, tt, T.teflon.h),
  ], { ...eq, componente: `uhmw_${tt}x${T.teflon.h}` });
  // brazos de la guarda desde el larguero del lado de referencia (fuera del paso de la caja)
  const yRef = lado * (Math.max(Math.abs(yMin), Math.abs(yMax)) + 30);
  for (const xa of (o.brazosX || [x0 + F + 50, x0 + o.L * 0.62, x0 + o.L - 60])) {
    E.addPart(`${tag} · Brazo guarda X${Math.round(xa - x0)}`, C.placa, [xa, yRef, -125 + 20], [
      box('Montante PL4', [xa, yRef, -125 + 20], 30, 4, (T.teflon.h + 2 + 4) - (-125 + 20)),
      box('Brazo PL4', [xa, (yRef + yCara + lado * tt / 2) / 2, T.teflon.h + 2], 30, Math.abs(yRef - (yCara + lado * tt / 2)) + 4, 4),
    ], eq);
  }
  out.teflon = { yCara, ySal, flare: F, flareDeg };

  // fotocélula de disparo (réflex) frente a la ventana, en el lado del motor; espejo en el lado de referencia
  const xS = r2(xV + P.caja.chica.L / 2);                                            // la caja chica queda centrada bajo la cámara al disparar
  const yS = g.sMot * (Math.max(Math.abs(yMin), Math.abs(yMax)) + 4 + M.guiaLA.t + 15);
  const [sw, sd, sh] = T.sensor.cuerpo;
  E.addPart(`${tag} · Fotocélula de disparo de cámara`, C.sensor, [xS, yS, 32], [
    box('Poste 20×20', [xS, yS, 32], 20, 20, 40), box(`Sensor ${sw}×${sd}×${sh}`, [xS, yS, 72], sw, sd, sh)], { ...eq, componente: 'fotocelula_reflex' });
  E.addPart(`${tag} · Espejo réflex`, C.reflector, [xS, -yS, 72], [box('Poste 20×20', [xS, -yS, 32], 20, 20, 40), box('Espejo 40×6×60', [xS, -yS, 72], 40, 6, 60)], { ...eq, componente: 'reflector' });
  out.sensorX = xS; out.hazZ = 97;
  return out;
}
