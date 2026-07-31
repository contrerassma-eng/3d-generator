// mod_guardas.mjs — CIERRE DEL POZO NUEVO (punto 5 del encargo) y GUÍAS
// LATERALES DEL CORREDOR DE DESCARGA (punto 6).
//
// El pozo del módulo baja el lazo de banda hasta Z −433.1 con cuatro puntos de
// atrapamiento banda↔polea (V1…V4) accesibles desde fuera: se cierra el
// perímetro con 4 guardas de chapa plegada 14 GA (marco autoportante: las
// testas cuelgan del sistema de perfil/travesaño con tuercas T M8; las
// laterales se atornillan a las pestañas de las testas — no se taladra el
// NBT90). Toda chapa lleva `extra.chapa` (fibra + radio) para el desarrollo,
// estilo del repositorio.
//
// Las guías del corredor son chapa 12 GA plegada sobre base en T al canto del
// chapón de descarga; viven SOBRE el plano de transporte y por eso se declaran
// EXCEPCIÓN JUSTIFICADA del chequeo de pasillo (compuerta §L/§O): quedan fuera
// del camino del bulto (campo de rodillos Y −1161…−786) y no asoman del borde.
//
// Cotas y procedencias: params_estaciones.mjs (GUARDAS, GUIAS).

import { box, cyl, hole, COL, r2, pernoHex, tuercaHex, desarrollo } from '../../nbt90/lib.mjs';
import { STEP, EJES, PERCHA, bordeExtDescarga } from './params_adapt.mjs';
import { GUARDAS, GUIAS } from './params_estaciones.mjs';
// ▼ EL POZO CAMBIÓ DE CONTENIDO (rediseño del cliente 31-07): dentro ya no hay
// las 4 poleas de pozo V1…V4 con sus pletinas, sino los 4 RODILLOS DE RETORNO
// del accionamiento por tambor motriz, con sus pletinas de soporte de 12, y el
// ramal de retorno corre 5.5 mm más abajo. La guarda NO se retira —sigue
// habiendo pozo y sigue habiendo puntos de atrapamiento banda↔rodillo, y ahora
// además el ramal de fondo pasa a Z −358.9 bajo el módulo— pero se REHACE:
// recortes de paso donde la atraviesa la estructura, escotes donde apoyan los
// soportes de los rodillos, y rendijas por donde entra y sale la banda.
import { TAMBORES, RETORNOS, RETORNO as RAMAL } from './params_tambores.mjs';
import { ALARGUE } from './params_pg40.mjs';

/** Los grupos de cartela de rodillo de retorno del lado −X, con la MISMA regla
 *  de agrupación que usa adapt/mod_pg40.mjs (si dos cartelas se pisarían, sale
 *  una sola por grupo). Se replica aquí para saber DÓNDE hay que recortar. */
function cartelasNegX() {
  const grupos = [];
  for (const rr of [...TAMBORES.retorno].sort((a, b) => b.y - a.y)) {
    const g = grupos.find(gr => gr.some(q => Math.abs(q.y - rr.y) < 120));
    if (g) g.push(rr); else grupos.push([rr]);
  }
  return grupos.map((g) => {
    const ys = g.map(q => q.y), zs = g.map(q => q.z);
    return { ids: g.map(q => q.id).join('+'),
      y: [r2(Math.min(...ys) - 60), r2(Math.max(...ys) + 60)],
      z: [r2(Math.min(...zs, -200) - 60), r2(Math.max(...zs, -190) + 60)] };
  });
}

export function guardas(E) {
  const M = { piezas0: E.parts.length, nuevas: {}, desarrollos: {}, recortes: {} };
  const cuenta = (k, n = 1) => { M.nuevas[k] = (M.nuevas[k] || 0) + n; };
  const t = GUARDAS.t;
  const HOLG = 2.0;                     // dis — holgura de recorte de chapa a la
  //   estructura que lo atraviesa (corte láser + plegado de 14 GA)
  const A = ALARGUE;
  const CART = cartelasNegX();
  /** Recorte de paso en una guarda de TESTA (plano YZ constante): caja pasante
   *  en Y que atraviesa la chapa entera. */
  const recorteTesta = (f, yPlano, [x0, x1], [z0, z1], nom, reg) => {
    f.push(box(`Recorte de paso ${nom} ${r2(x1 - x0 + 2 * HOLG)}×${r2(z1 - z0 + 2 * HOLG)}`,
      [r2((x0 + x1) / 2), yPlano, r2(z0 - HOLG)],
      r2(x1 - x0 + 2 * HOLG), 200, r2(z1 - z0 + 2 * HOLG), 'cut'));
    reg[nom] = `X ${r2(x0 - HOLG)}…${r2(x1 + HOLG)} · Z ${r2(z0 - HOLG)}…${r2(z1 + HOLG)}`;
  };

  // =========================================================================
  // GUARDA DE TESTA SUR: cara vertical + ala superior de cuelgue a los perfiles
  // (el ala va hacia +Y: por debajo de ella el ramal de retorno corre a Z −52,
  // 10 más abajo; hacia −Y chocaría el CT-ENS del IDLER, medido)
  // =========================================================================
  {
    const G = GUARDAS.sur;
    const [x0, x1] = G.x;
    const [z0, z1] = G.z;
    const L = r2(x1 - x0);
    const fibra = [[r2(G.y + G.alaSup), z1], [G.y, z1], [G.y, z0]];
    const f = [
      box(`Cara vertical ${t}×${L}×${r2(z1 - z0)}`,
        [r2((x0 + x1) / 2), r2(G.y + t / 2), z0], L, t, r2(z1 - z0)),
      box(`Ala superior ${G.alaSup}×${L}×${t}`,
        [r2((x0 + x1) / 2), r2(G.y + t + (G.alaSup - t) / 2), r2(z1 - t)], L, r2(G.alaSup - t), t),
    ];
    for (const B of EJES) f.push(hole(`Ø9 M8`, [B, r2(G.y + G.alaSup - 14), r2(z1 - t - 1)], [0, 0, 1], 9.0));
    // --- RECORTES DE PASO del ALARGUE −X (bastidor PG40) -------------------
    // El alma del alargue y la cartela de los rodillos de retorno RR3+RR4
    // ATRAVIESAN este plano: son estructura y no se mueven, así que la chapa
    // se recorta a su alrededor. Antes no estaba modelado y el B-rep lo cantaba
    // como 5.17 + 2.31 cm³ de acero macizo compartido.
    recorteTesta(f, G.y, [A.xNegExt, r2(A.xNegExt + A.e)], [A.almaZBot, A.almaZTop],
      'alma del alargue −X', M.recortes);
    for (const ct of CART) {
      // la chapa ocupa Y [G.y, G.y + t]: basta que la cartela la ROCE (la de
      // RR3+RR4 arranca justo en Y −1385, que es el plano de esta guarda)
      if (ct.y[0] >= r2(G.y + t) || ct.y[1] <= G.y) continue;
      recorteTesta(f, G.y, [A.xCabNegExt, A.xCabNegInt], ct.z,
        `cartela de retorno ${ct.ids} −X`, M.recortes);
    }
    // --- RENDIJAS DE PASO DE LA BANDA (5) ---------------------------------
    // el ramal de retorno entra al pozo POR AQUÍ: el tramo llano que va del
    // rodillo conducido (dorso a la cota que publica params_tambores) a RR4.
    // Sin rendija la chapa cortaba la banda — 0.039 cm³ por calle: por debajo
    // de la tolerancia del informe, pero imposible de fabricar.
    const zRend = [r2(RAMAL.zConducido - STEP.bandaDorso - 7), r2(RAMAL.zConducido + 7)];
    for (const B of EJES) {
      f.push(box(`Rendija de banda ${r2(STEP.bandaAncho + 8)}×${r2(zRend[1] - zRend[0])}`,
        [B, G.y, zRend[0]], r2(STEP.bandaAncho + 8), 200, r2(zRend[1] - zRend[0]), 'cut'));
    }
    M.recortes['rendijas de banda (5)'] = `${r2(STEP.bandaAncho + 8)} de ancho · Z ${zRend[0]}…${zRend[1]}`;
    const des = desarrollo(fibra, t, t);
    M.desarrollos['guarda sur'] = des.largo;
    E.addPart(`FIJO · Guarda de pozo sur 14GA ${L}×${r2(z1 - z0)} (Y=${G.y})`, COL.guarda,
      [r2((x0 + x1) / 2), G.y, z0], f, {
        fabricada: true,
        chapa: { t: r2(t), material: 'acero 14 GA (web CHAPA-TOL-001)', fibra, radio: r2(t) },
        nota: `cierra la testa sur del pozo: 5.6 de la cara al flanco de la bajada (V1, −1377.5 calc) y 6.98 al `
          + `IDLER-ENS (step −1391.98); el ala superior va hacia +Y a Z −41.9…−40 — el retorno pasa a Z −52.05, `
          + `10.2 por debajo. Cuelga con 5 M8×16 + tuercas T de la ranura inferior de los 5 perfiles sur (el `
          + `sistema del sorter, step §4.2). Desarrollo ${des.largo} mm.`,
      });
    cuenta('guarda de testa sur 14GA', 1);
    for (const B of EJES) {
      pernoHex(E, { nombre: `M8×12 guarda sur (X=${B})`, at: [B, r2(G.y + G.alaSup - 14), r2(z1 - t)], dir: [0, 0, 1], dia: 8, largo: 12, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      cuenta('tuerca T M8 (ranura 8) — guardas', 1);
    }
  }

  // =========================================================================
  // GUARDA DE TESTA NORTE: el lazo cruza cualquier plano YZ entre V3 y la
  // motriz (bajada V3↔V4 + retorno llano a Z −52), así que el cierre norte es
  // la FRANJA Z −118…−60 pegada a la cara sur de la bancada LAT TOP — la
  // bancada misma cierra de −433 a −113 (step) y el retorno pasa 8 por encima
  // =========================================================================
  {
    const G = GUARDAS.norte;
    const [x0, x1] = G.x;
    const [z0, z1] = G.z;
    const L = r2(x1 - x0);
    const f = [
      box(`Chapa plana ${t}×${L}×${r2(z1 - z0)}`,
        [r2((x0 + x1) / 2), r2(G.y + t / 2), z0], L, t, r2(z1 - z0)),
    ];
    const pestX = [-20, 120, 300, 440];
    for (const px of pestX) f.push(hole(`Ø9 M8`, [px, r2(G.y - 1), r2((z0 + z1) / 2)], [0, 1, 0], 9.0));
    // RECORTE DE PASO del alma del alargue −X (misma razón que en la sur)
    recorteTesta(f, G.y, [A.xNegExt, r2(A.xNegExt + A.e)], [A.almaZBot, A.almaZTop],
      'alma del alargue −X (norte)', M.recortes);
    const fibra = [[G.y, z1], [G.y, z0]];
    const des = desarrollo(fibra, t, t);
    M.desarrollos['guarda norte'] = des.largo;
    E.addPart(`FIJO · Guarda de pozo norte 14GA ${L}×${r2(z1 - z0)} (Y=${G.y})`, COL.guarda,
      [r2((x0 + x1) / 2), G.y, z0], f, {
        fabricada: true,
        chapa: { t: r2(t), material: 'acero 14 GA (web CHAPA-TOL-001)', fibra, radio: r2(t) },
        nota: `franja de cierre norte: la bancada LAT TOP ya cierra de Z −433 a −113 (step) y esta chapa PLANA `
          + `tapa la franja restante −118…−60 (el retorno llano pasa a Z −52.05: 7.95 de holgura). Va PEGADA a la `
          + `cara sur de la bancada (Y −513.12, step; 0.08 de holgura) con 4 M8×16 de frente, ROSCADOS a la `
          + `bancada — taladros nuevos, modificación declarada. La bajada de V4 queda a 36.5 (flanco −553.5, `
          + `calc). Desarrollo ${des.largo} mm.`,
      });
    cuenta('guarda de testa norte 14GA (franja a la bancada)', 1);
    for (const px of pestX) {
      pernoHex(E, { nombre: `M8×16 guarda norte↔bancada (X=${px})`, at: [px, G.y, r2((z0 + z1) / 2)], dir: [0, 1, 0], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
    }
  }

  // =========================================================================
  // GUARDAS LATERALES: cierran los costados del pozo entre las dos testas y se
  // cuelgan de los CHAPONES con pestañas propias (M8 roscados — declarados);
  // la −X lleva 3 ESCOTADURAS donde pasan las ménsulas de la percha
  // =========================================================================
  for (const [G, nom, s, xChapon] of [[GUARDAS.latNegX, '−X', 1, -81.423], [GUARDAS.latPosX, '+X', -1, 499.418]]) {
    const y0 = GUARDAS.sur.y, y1 = GUARDAS.norte.y;
    const [z0, z1] = G.z;
    const f = [
      box(`Chapa ${t}×${r2(y1 - y0)}×${r2(z1 - z0)}`,
        [r2(G.x + s * t / 2), r2((y0 + y1) / 2), z0], t, r2(y1 - y0), r2(z1 - z0)),
      // pliegues de rigidez (dobladillo) arriba y abajo, recortados en Y para
      // no tocar las guardas de testa
      box(`Dobladillo sup 15`, [r2(G.x + s * (t + 7.5)), r2((y0 + y1) / 2 + 1), r2(z1 - t)], 15, r2(y1 - y0 - 10), t),
      box(`Dobladillo inf 15`, [r2(G.x + s * (t + 7.5)), r2((y0 + y1) / 2 + 1), z0], 15, r2(y1 - y0 - 10), t),
    ];
    // 3 puntos de cuelgue al chapón: M8 horizontal ROSCADO al chapón (declarado)
    // con casquillo separador que salva el gap (6.3 en −X, 18.2 en +X) — el
    // patrón del casquillo de escote de la percha
    const gap = r2(Math.abs(xChapon - G.x) - t - 0.1);
    for (const yp of [-1300, -880, -600]) {
      if (yp < y0 || yp > y1) continue;
      f.push(hole(`Ø9 M8 chapón`, [r2(G.x - s * 1), yp, r2(z1 - 60)], [s, 0, 0], 9.0));
    }
    if (nom === '−X') {
      // escotaduras de las ménsulas de la percha (pasan a través del plano)
      for (const ym of PERCHA.mensulasY) {
        f.push(box(`Escote ménsula ${GUARDAS.escoteMensula.w}×${r2(GUARDAS.escoteMensula.z[1] - GUARDAS.escoteMensula.z[0])}`,
          [r2(G.x + s * t / 2), ym, GUARDAS.escoteMensula.z[0]],
          t + 32, GUARDAS.escoteMensula.w, r2(GUARDAS.escoteMensula.z[1] - GUARDAS.escoteMensula.z[0]), 'cut'));
      }
    } else {
      // ESCOTES DE LOS SOPORTES DE RODILLO DE RETORNO (pozo nuevo). En el pozo
      // viejo, a esta cota (Z −423…−340.3) sólo había aire: las poleas V2/V3 se
      // colgaban de pletinas altas. Ahora los rodillos de retorno RR2 y RR3
      // apoyan aquí sobre PLETINAS 100×100×12 atornilladas a la cara interior
      // del alargue (X 479.418…491.418, params_tambores RETORNOS.soporte), y la
      // chapa de la guarda (X 479.1…481.0) les pasa por encima: 8.21 cm³ en 6
      // pares del informe B-rep contra las pletinas y sus M10. No es un solape
      // de modelo — es que la chapa no se puede montar.
      // Se escota alrededor de cada soporte, ABIERTO POR ARRIBA: el hueco lo
      // tapa la propia pletina de 12, que es más gruesa que la guarda y cubre
      // de Z −363.82 a −263.82 (la guarda muere en −340.3). El dobladillo
      // superior (X 464.1…479.1) no se toca: pasa por dentro y hace de puente.
      const RS = RETORNOS.soporte, semi = r2(RS.lado / 2 + HOLG + 3);
      for (const rr of TAMBORES.retorno) {
        if (rr.y < y0 || rr.y > y1) continue;
        const zLo = r2(rr.z - RS.lado / 2 - HOLG - 2);       // bajo la pletina Y bajo
        //   la fila baja de M10 (que va a rr.z − patrón/2, Ø10)
        if (zLo >= z1) continue;                              // no llega a la guarda
        f.push(box(`Escote soporte ${rr.id} ${r2(2 * semi)}×${r2(z1 - zLo + 5)}`,
          [r2(G.x + s * t / 2), rr.y, zLo], t + 40, r2(2 * semi), r2(z1 - zLo + 5), 'cut'));
        M.recortes[`escote soporte ${rr.id} (lateral +X)`] = `Y ${r2(rr.y - semi)}…${r2(rr.y + semi)} · Z ${zLo}…${z1} (abierto por arriba; lo tapa la pletina de ${RS.e})`;
      }
    }
    const fibra = [[r2(G.x + s * (t + 15)), z1], [G.x, z1], [G.x, z0], [r2(G.x + s * (t + 15)), z0]];
    const des = desarrollo(fibra, t, t);
    M.desarrollos[`guarda lateral ${nom}`] = des.largo;
    E.addPart(`FIJO · Guarda de pozo lateral ${nom} 14GA ${r2(y1 - y0)}×${r2(z1 - z0)} (X=${G.x})`, COL.guarda,
      [G.x, r2((y0 + y1) / 2), z0], f, {
        fabricada: true,
        chapa: { t: r2(t), material: 'acero 14 GA (web CHAPA-TOL-001)', fibra, radio: r2(t) },
        nota: nom === '−X'
          ? `cierra el costado −X del pozo bajo el chapón (canto inferior Z −114, step); 3 M8×25 horizontales `
            + `ROSCADOS al chapón (declarados) sobre casquillos separadores Ø16×${gap}; 3 ESCOTADURAS ${GUARDAS.escoteMensula.w}×48 donde pasan las ménsulas 40×40 de la `
            + `percha (holgura 7/2 por lado). Desarrollo ${des.largo} mm.`
          : `cierra el costado +X SOLO bajo el fondo del NBT90 (Z −338.27, 2 de holgura): el tramo −338…−253 lo `
            + `cierra el propio módulo (canal base + side channel) y el −253…−114 es la rendija de 8.6 mm al `
            + `chapón (declarada: da a la muesca, con el side de chapa detrás). No se taladra el NBT90; 3 M8×35 `
            + `roscados al chapón de descarga sobre casquillos Ø16×${gap}. Desarrollo ${des.largo} mm.`,
      });
    cuenta(`guarda lateral ${nom} 14GA`, 1);
    for (const yp of [-1300, -880, -600]) {
      if (yp < y0 || yp > y1) continue;
      E.addPart(`FIJO · Casquillo separador Ø16×${gap} guarda ${nom} (Y=${yp})`, COL.acero,
        [r2(G.x - s * 0.05), yp, r2(z1 - 60)],
        [cyl(`Casquillo Ø16×${gap}`, [r2(G.x - s * 0.05), yp, r2(z1 - 60)], [-s, 0, 0], 16, gap),
          hole('Ø8.6', [r2(G.x + s * 1), yp, r2(z1 - 60)], [-s, 0, 0], 8.6)],
        { fabricada: true, nota: 'salva el gap guarda↔chapón (patrón del casquillo de escote de la percha)' });
      pernoHex(E, { nombre: `M8×${nom === '−X' ? 25 : 35} guarda ${nom}↔chapón (Y=${yp})`, at: [r2(G.x + s * t), yp, r2(z1 - 60)], dir: [-s, 0, 0], dia: 8, largo: nom === '−X' ? 25 : 35, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      cuenta('casquillo separador de guarda', 1);
    }
  }

  // =========================================================================
  // GUÍAS LATERALES DEL CORREDOR DE DESCARGA (punto 6)
  // =========================================================================
  const tg = GUIAS.t;
  for (const [yg, nom, hacia] of [[GUIAS.ySur, 'sur', -1], [GUIAS.yNorte, 'norte', 1]]) {
    const [x0, x1] = GUIAS.x;
    const L = r2(x1 - x0);
    const zTop = r2(STEP.planoBanda + GUIAS.alturaSobrePlano);       // 112.33
    const z0 = r2(STEP.planoBanda + 8);                              // 60.33 — sobre el plano
    // cara de guía vertical + labio superior abierto hacia fuera del camino
    const f = [
      box(`Cara ${tg}×${L}×${r2(zTop - z0)}`, [r2((x0 + x1) / 2), r2(yg + hacia * -1 * 0), z0], L, tg, r2(zTop - z0)),
      box(`Labio 15 a 30°`, [r2((x0 + x1) / 2), r2(yg + hacia * GUIAS.labio / 4), r2(zTop - tg)], L, r2(GUIAS.labio * 0.87), tg),
      hole(`Ø9 M8 alma`, [r2(x1 - 18), r2(yg - 1 * hacia), r2(z0 + 15)], [0, hacia, 0], 9.0),
      hole(`Ø9 M8 alma`, [r2(x1 - 6), r2(yg - 1 * hacia), r2(zTop - 20)], [0, hacia, 0], 9.0),
    ];
    const fibra = [[r2(yg + hacia * GUIAS.labio * 0.5), zTop], [yg, r2(zTop - GUIAS.labio * 0.87)], [yg, z0]];
    const des = desarrollo(fibra, tg, tg);
    M.desarrollos[`guía corredor ${nom}`] = des.largo;
    E.addPart(`FIJO · Guía de descarga ${nom} 12GA ${L}×${r2(zTop - z0)} (Y=${yg})`, COL.guarda,
      [r2((x0 + x1) / 2), yg, z0], f, {
        fabricada: true,
        chapa: { t: r2(tg), material: 'acero 12 GA (web CHAPA-TOL-001)', fibra, radio: r2(tg) },
        nota: `guía lateral del bulto en el corredor de descarga: cara útil de Z ${z0} a ${zTop} (${GUIAS.alturaSobrePlano} `
          + `sobre el plano de transporte — bajo el CG de un bulto ≥150 de alto: VALIDA CLIENTE, el STEP no declara `
          + `el bulto), labio superior abierto. FUERA del camino del bulto (campo de rodillos Y ${GUIAS.caminoBultoY[0]}…`
          + `${GUIAS.caminoBultoY[1]}): EXCEPCIÓN DECLARADA del chequeo de pasillo, verificada en compuerta §O. `
          + `Desarrollo ${des.largo} mm.`,
      });
    cuenta(`guía de descarga ${nom} 12GA`, 1);
    // base sobre el canto superior del chapón de descarga + alma (todo DENTRO
    // del ancho del canto, X 499.4…527.4: más adentro pisaría la línea del
    // rodillo, que llega a X 487.4)
    const xbc = r2(bordeExtDescarga - GUIAS.base.w / 2);                 // 513.42
    E.addPart(`FIJO · Base de guía ${nom} 3/16" (canto del chapón)`, COL.chapaOsc,
      [xbc, yg, GUIAS.base.zCanto],
      [box(`Placa ${GUIAS.base.w}×${GUIAS.base.d}×${GUIAS.base.t}`,
        [xbc, yg, GUIAS.base.zCanto], GUIAS.base.w, GUIAS.base.d, GUIAS.base.t),
        box(`Alma 24×${GUIAS.base.t}×${r2(zTop - GUIAS.base.zCanto - GUIAS.base.t - tg - 3.7)}`,
          [xbc, r2(yg + (nom === 'sur' ? 1 : -1) * (GUIAS.base.t / 2 + tg / 2 + 0.05)), r2(GUIAS.base.zCanto + GUIAS.base.t)],
          24, GUIAS.base.t, r2(zTop - GUIAS.base.zCanto - GUIAS.base.t - tg - 3.7)),
        hole(`Ø9 M8 alma inf`, [r2(x1 - 18), r2(yg - 8), r2(z0 + 15)], [0, 1, 0], 9.0),
        hole(`Ø9 M8 alma sup`, [r2(x1 - 6), r2(yg - 8), r2(zTop - 20)], [0, 1, 0], 9.0),
        hole(`Ø9 M8 canto`, [xbc, r2(yg - 18), r2(GUIAS.base.zCanto + GUIAS.base.t + 1)], [0, 0, -1], 9.0),
        hole(`Ø9 M8 canto`, [xbc, r2(yg + 18), r2(GUIAS.base.zCanto + GUIAS.base.t + 1)], [0, 0, -1], 9.0)],
      { fabricada: true,
        nota: 'base sobre el CANTO superior del chapón de descarga (Z 46.0, 28 de espesor — step): 2 M8×20 ROSCADOS '
          + 'al canto (taladros nuevos, modificación declarada); el alma vertical soldada porta la guía (2 M8×16 '
          + 'con tuercas). La guía vuela hacia −X desde el alma; el pliegue del labio la rigidiza.' });
    cuenta(`base de guía 3/16"`, 1);
    for (const dy of [-18, 18]) {
      pernoHex(E, { nombre: `M8×20 base guía ${nom}↔canto (dy=${dy})`, at: [xbc, r2(yg + dy), r2(GUIAS.base.zCanto + GUIAS.base.t)], dir: [0, 0, -1], dia: 8, largo: 20, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
    }
    for (const [xh, dz] of [[r2(x1 - 18), 15], [r2(x1 - 6), r2(zTop - z0 - 20)]]) {
      const sAl = nom === 'sur' ? 1 : -1;              // el alma vive al lado +Y (sur) / −Y (norte)
      pernoHex(E, { nombre: `M8×16 guía ${nom}↔alma (dz=${dz})`, at: [xh, r2(yg - sAl * tg / 2), r2(z0 + dz)], dir: [0, sAl, 0], dia: 8, largo: 16, af: 13, altoCab: 5.3, capa: 'FIJO · ' });
      tuercaHex(E, { nombre: `M8 guía ${nom} (dz=${dz})`, at: [xh, r2(yg + sAl * (tg / 2 + 0.2 + GUIAS.base.t)), r2(z0 + dz)], dir: [0, sAl, 0], dia: 8, af: 13, alto: 6.5, capa: 'FIJO · ' });
    }
  }

  M.piezas = E.parts.length - M.piezas0;
  return M;
}
