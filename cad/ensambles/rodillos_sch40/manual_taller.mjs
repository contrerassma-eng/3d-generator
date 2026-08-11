#!/usr/bin/env node
// manual_taller.mjs — croquis de OPERACIÓN para el taller (no son los planos de
// pieza: son las hojas que se pegan al lado de la máquina).
//
//   cd cad && node ensambles/rodillos_sch40/manual_taller.mjs [fecha]
//   → manual/croquis_operaciones_rc48.pdf
//
// Cada hoja es una media sección acotada a escala 2:1 con lo que el operario
// necesita para hacer ESA operación y nada más.
import { Sheet, exportSheetsPDF } from '../../js/drawing2d.js';
import { P, X } from './params.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aquí = dirname(fileURLToPath(import.meta.url));
const outDir = join(aquí, 'manual');
mkdirSync(outDir, { recursive: true });
const fecha = process.argv[2] || '—';
const PROY = 'RC-SCH40-48 — RODILLO PLANO Y CÓNICO';
const S = 2;                       // escala 2:1
const A4 = [297, 210];

/** Media sección: perfil [[x, r], …] en mm de modelo → polilínea en la hoja. */
const media = (sh, perfil, ox, oy, ly = 'VISIBLE') =>
  sh.poly(perfil.map(([x, r]) => [ox + x * S, oy + r * S]), ly);

/** Rayado a 45° dentro de una caja (indicativo de material cortado). */
function rayar(sh, x0, x1, r0, r1, ox, oy, paso = 3) {
  for (let d = -(r1 - r0) * S; d < (x1 - x0) * S; d += paso) {
    const pts = [];
    for (let t = 0; t <= 1; t += 0.02) {
      const px = d + t * (r1 - r0) * S, py = t * (r1 - r0) * S;
      if (px >= 0 && px <= (x1 - x0) * S) pts.push([ox + x0 * S + px, oy + r0 * S + py]);
    }
    if (pts.length > 1) sh.line(pts[0], pts[pts.length - 1], 'FINA');
  }
}

const hoja = (num, titulo, nota) => {
  const sh = new Sheet('A4', A4[0], A4[1], S, 1, 1);
  sh.frame();
  sh.titleBlock({
    designacion: titulo, proyecto: PROY, numPlano: num, fecha,
    escala: '2:1', piezas: '—', fuente: 'diseño paramétrico foto3d — capa user',
    verificacion: 'CROQUIS DE OPERACIÓN', nota,
  });
  return sh;
};

const hojas = [];

// ═══════════════════════════════════════════ OP-20 · contrataladro del tubo
{
  const sh = hoja('OP-20', 'CONTRATALADRO DEL TUBO — las 2 testas',
    `O${P.contra.d} ${P.contra.tol} x ${P.contra.prof} · Ra max ${P.contra.Ra} · quitar el cordón de costura en la zona`);
  const ox = 42, oy = 128;
  const RO = P.tubo.od / 2, RI = P.tubo.id / 2, RC = P.contra.d / 2, pr = P.contra.prof, L = 46;

  sh.line([ox - 8, oy], [ox + L * S + 12, oy], 'FINA');                 // eje
  sh.text('EJE', ox - 8, oy + 2, 2.4, 'L', 'FINA');
  media(sh, [[0, RC + 0.5], [0.5, RC], [pr, RC], [pr, RI], [L, RI], [L, RO], [0, RO]], ox, oy);
  rayar(sh, 0, L, RI, RO, ox, oy);

  sh.dimH(ox, ox + pr * S, oy + RO * S + 14, 10, pr);
  sh.dimV(ox + pr * S + 6, oy, oy + RC * S, 20, P.contra.d);
  sh.dimV(ox + L * S, oy, oy + RO * S, 34, P.tubo.od);
  sh.text(`O${P.contra.d} ${P.contra.tol}  (tampon pasa/no-pasa)`, ox + pr * S + 30, oy + RC * S + 6, 3.0, 'L', 'COTAS');
  sh.text(`pared que queda ${((P.tubo.od - P.contra.d) / 2).toFixed(2)}`, ox + 3, oy + (RO + RC) / 2 * S + 3, 2.6, 'L', 'COTAS');
  sh.text('0.5x45 grados', ox - 2, oy + RC * S + 8, 2.6, 'L', 'COTAS');

  sh.text('COMO', 26, 96, 3.5, 'L', 'NORMA');
  [
    '1 - Tope en el husillo: el largo 522 sale del tope, no de medir.',
    '2 - Refrentar y contrataladrar EN UN SOLO AMARRE, misma pasada de',
    '    herramienta. Voltear y repetir contra el mismo tope.',
    '3 - Verificar con TAMPÓN pasa/no-pasa O44 H8. No con pie de metro:',
    '    a 80 piezas el tampón es 5x más rápido y no discute.',
    '4 - El cordón interior de la costura DEBE desaparecer en los 14 mm.',
  ].forEach((t, i) => sh.text(t, 26, 89 - i * 5.5, 2.8, 'L'));
  hojas.push(sh);
}

// ═══════════════════════════════════════════ OP-40 · eje
{
  const sh = hoja('OP-40', 'EJE — caras planas, gargantas y rectificado',
    `barra ${P.eje.material}`);
  const ox = 30, oy = 132;
  const RE = P.eje.d / 2, RP = P.eje.entrecaras / 2, RG = P.anillo.ranuraD / 2;
  const lp = P.eje.largoPlano, rx = +(X.rodamIzqX1 + P.resorte.montado - X.ejeX0).toFixed(1), rw = P.anillo.ranuraW;
  const L = 58;

  sh.line([ox - 8, oy], [ox + L * S + 10, oy], 'FINA');
  media(sh, [[0, RP], [lp, RP], [lp, RE], [rx, RE], [rx, RG], [rx + rw, RG], [rx + rw, RE], [L, RE], [L, 0], [0, 0]], ox, oy);
  rayar(sh, 0, L, 0, RE, ox, oy, 4);

  sh.dimH(ox, ox + lp * S, oy + RE * S + 16, 10, lp);
  sh.dimH(ox, ox + rx * S, oy + RE * S + 34, 10, rx);
  sh.dimV(ox + lp * S / 2, oy, oy + RP * S, 16, P.eje.entrecaras);
  sh.text('e/c, 2 caras a 180 grados', ox + lp * S / 2 + 22, oy + RP * S / 2, 2.6, 'L', 'COTAS');
  sh.text(`garganta O${P.anillo.ranuraD} x ${rw} - anillo DIN 471 O12`, ox + rx * S - 46, oy - 14, 2.8, 'L', 'COTAS');
  sh.line([ox + rx * S, oy - 4], [ox + rx * S + 6, oy - 11], 'COTAS');
  sh.text(`rectificar O${P.eje.d} ${P.eje.tol} en ${P.eje.zonaAjustada} desde la punta`,
    ox, oy + RE * S + 7, 2.8, 'L', 'COTAS');
  sh.line([ox, oy + RE * S + 4], [ox + P.eje.zonaAjustada * S, oy + RE * S + 4], 'NORMA');

  sh.text('COMO', 26, 96, 3.5, 'L', 'NORMA');
  [
    `1 - Cortar a ${X.ejeLargo} de barra de 6 m (10 ejes por barra).`,
    '2 - Al torno, contra tope: garganta + rectificado de la punta en el',
    '    mismo amarre. Voltear y repetir. NO medir: usar tope y calibre fijo.',
    '3 - Caras planas en fresa con divisor o prisma en V a 180°.',
    `4 - Las caras terminan a ${lp} y la garganta empieza a ${rx}: NO se tocan.`,
    '    Si alargas las caras el anillo se queda sin asiento circular.',
  ].forEach((t, i) => sh.text(t, 26, 89 - i * 5.5, 2.8, 'L'));
  hojas.push(sh);
}

// ═══════════════════════════════════════════ OP-50 · tapa + rodamiento
{
  const sh = hoja('OP-50', 'TAPA + RODAMIENTO — prensado en banco',
    `${P.rodam.desig} en alojamiento O${P.tapa.asientoD} · entra por el lado INTERIOR`);
  const ox = 52, oy = 130;
  const T = P.tapa;
  const perfil = [
    ...T.domo, [T.saliente, T.prensaD / 2], [T.largo, T.prensaD / 2], [T.largo, T.faldonD / 2],
    [T.asientoH1, T.faldonD / 2], [T.asientoH1, T.asientoD / 2], [T.asientoH0, T.asientoD / 2],
    [T.asientoH0, T.hombroD / 2], [T.frenteH, T.hombroD / 2], [T.frenteH, T.boreFrontal / 2],
  ];
  sh.line([ox - 8, oy], [ox + T.largo * S + 30, oy], 'FINA');
  media(sh, perfil, ox, oy);

  // rodamiento en su asiento
  const b0 = T.asientoH0, b1 = T.asientoH1, rb = P.rodam.D / 2, ri = P.rodam.bore / 2;
  media(sh, [[b0, ri], [b0, rb], [b1, rb], [b1, ri]], ox, oy, 'NORMA');
  rayar(sh, b0, b1, ri, rb, ox, oy, 4);
  sh.text(P.rodam.desig, ox + b0 * S + 2, oy + rb * S + 5, 2.8, 'L', 'NORMA');

  sh.dimV(ox + T.largo * S + 4, oy, oy + T.asientoD / 2 * S, 14, T.asientoD);
  sh.dimH(ox, ox + T.largo * S, oy - 16, -10, T.largo);
  sh.dimH(ox, ox + T.saliente * S, oy - 4, -8, T.saliente);
  sh.text('asoma del tubo', ox + T.saliente * S + 6, oy - 10, 2.6, 'L', 'COTAS');
  sh.text(`HOMBRO O${T.hombroD} = tope axial del aro exterior`, ox + T.largo * S + 22, oy + T.hombroD / 2 * S, 2.6, 'L', 'COTAS');
  sh.text('el rodamiento ENTRA POR AQUI', ox + T.largo * S + 22, oy + T.faldonD / 2 * S + 8, 2.8, 'L', 'NORMA');

  sh.text('COMO', 26, 96, 3.5, 'L', 'NORMA');
  [
    '1 - SIEMPRE en banco, ANTES de meter la tapa al tubo: dentro del',
    '    tubo de 522 no hay cómo prensar el rodamiento.',
    `2 - Empujar SOLO por el aro exterior hasta el hombro O${T.hombroD}.`,
    '    Si empujas por el aro interior arruinas las pistas.',
    '3 - Prensa de banco con casquillo que apoye en el aro exterior.',
    '4 - Comprobar que gira libre antes de seguir.',
  ].forEach((t, i) => sh.text(t, 26, 89 - i * 5.5, 2.8, 'L'));
  hojas.push(sh);
}

const pdf = exportSheetsPDF(hojas, 'croquis_operaciones_rc48.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK: ${hojas.length} croquis de operación → ${join(outDir, pdf.name)}`);
