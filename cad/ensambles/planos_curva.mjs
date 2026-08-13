#!/usr/bin/env node
// planos_curva.mjs — Juego de PLANOS DE FABRICACIÓN de la curva de polines
// cónicos 24", en la misma disposición de lámina que los planos Kofmelk C60.
//
// No dibuja desde la malla: dibuja ANALÍTICAMENTE desde los mismos parámetros
// que generan el 3D (gen_curva.mjs). Por eso cada arco es un arco de verdad,
// cada barreno cae en su ángulo exacto y la lámina sale en segundos aunque la
// pieza tenga 87 perforaciones.
//
// Cada lámina reproduce la del C60:
//   - vista en planta CURVADA, con radio y ángulo acotados;
//   - vista de PIEZA DESPLEGADA (las roladas) con sus barrenos;
//   - TABLA ITEM/MATERIAL/ESPESOR/CANTIDAD arriba a la izquierda;
//   - cajetín ISO 7200.
// Más una lámina de ENSAMBLAJE con el despiece, las cantidades y las notas.
//
// Uso (desde cad/, con el bundle de esbuild como el resto del repo):
//   npx esbuild ensambles/planos_curva.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/pc.mjs
//   ANG=90 node /tmp/pc.mjs 2026-08-13

import { Sheet, chooseSheet, scaleLabel, exportSheetsPDF } from '../js/drawing2d.js';
import { curva, STD } from './gen_curva.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const D2R = Math.PI / 180;
const MARGIN = 10, MARGIN_L = 20, TITLE_H = 42;
// ISO 5457 (formatos) y ISO 5455 (escalas), como en drawing2d.js
const SHEETS = { A4: [297, 210], A3: [420, 297], A2: [594, 420], A1: [841, 594], A0: [1189, 841] };
const REDUCCIONES = [1, 2, 2.5, 5, 10, 20, 50, 100, 200, 500, 1000];

// Elige la lámina MÁS CHICA en que el dibujo entra con un llenado decente.
// chooseSheet() de drawing2d maximiza la escala y por eso siempre salta a A0
// con la hoja medio vacía; un plano de taller quiere lo contrario.
function elegirLamina(w, h, formatos = ['A4', 'A3', 'A2', 'A1', 'A0'], llenado = 0.55) {
  let ultimo = null;
  for (const name of formatos) {
    const [W, H] = SHEETS[name];
    const uw = W - MARGIN_L - MARGIN, uh = H - 2 * MARGIN - TITLE_H - 5;
    for (const den of REDUCCIONES) {
      const s = 1 / den;
      if (w * s <= uw && h * s <= uh) {
        ultimo = [name, W, H, 1, den];
        if ((w * s) / uw >= llenado || (h * s) / uh >= llenado) return ultimo;
        break;
      }
    }
  }
  return ultimo || ['A0', ...SHEETS.A0, 1, 1000];
}
const r1 = (v) => Math.round(v * 10) / 10;
const r0 = (v) => Math.round(v);

const A = Number(process.env.ANG || 90);
const FECHA = process.argv[2] || new Date().toISOString().slice(0, 10);
const OUT = process.env.OUTDIR || 'ensambles/planos_curva';
const PROY = `Curva ${A}° 24" — Conveyone`;

const { doc, dims } = curva(A);
const parts = doc.parts.filter((p) => p.flat);

// ---------------------------------------------------------------------------
// Utilidades de lámina
// ---------------------------------------------------------------------------
// Marco de dibujo útil (dentro del cajetín)
const util = (sh) => ({
  x0: MARGIN_L + 4, y0: MARGIN + TITLE_H + 8,
  w: sh.W - MARGIN_L - MARGIN - 8, h: sh.H - 2 * MARGIN - TITLE_H - 16,
});

// arco poligonizado en coordenadas de lámina
function arco(sh, cx, cy, R, a0, a1, s, capa = 'VISIBLE') {
  const n = Math.max(12, Math.ceil((a1 - a0) / 1.2));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * D2R;
    pts.push([cx + R * Math.cos(a) * s, cy + R * Math.sin(a) * s]);
  }
  sh.poly(pts, capa);
  return pts;
}

// cota de radio: línea desde el centro hasta el arco, rotulada
function cotaRadio(sh, cx, cy, R, aDeg, s, txt) {
  const a = aDeg * D2R;
  const p = [cx + R * Math.cos(a) * s, cy + R * Math.sin(a) * s];
  sh.line([cx, cy], p, 'COTAS');
  const m = [cx + R * 0.62 * Math.cos(a) * s, cy + R * 0.62 * Math.sin(a) * s];
  sh.text(txt, m[0], m[1] + 2, 3.2, 'C');
}

function tablaItem(sh, x, y, cant) {
  const filas = [['MATERIAL', 'Fe'], ['ESPESOR', `${STD.t} mm`], ['CANTIDAD', String(cant)]];
  const w = 46, h = 6;
  sh.rect(x, y, w, h * (filas.length + 1), 'NORMA');
  sh.text('TABLA', x + w / 2, y + h * filas.length + 2, 2.8, 'C');
  sh.line([x, y + h * filas.length], [x + w, y + h * filas.length], 'FINA');
  sh.line([x + 24, y], [x + 24, y + h * filas.length], 'FINA');
  filas.forEach((f, i) => {
    const yy = y + h * (filas.length - 1 - i);
    if (i) sh.line([x, yy + h], [x + w, yy + h], 'FINA');
    sh.text(f[0], x + 2, yy + 2, 2.4, 'L');
    sh.text(f[1], x + 26, yy + 2, 2.4, 'L');
  });
}

function cajetin(sh, designacion, num, escala, nota, cant) {
  sh.frame();
  sh.titleBlock({
    designacion, proyecto: PROY,
    fuente: 'estándar Kofmelk C60 extendido — capa user',
    verificacion: 'PATRÓN CALIBRADO CONTRA C60',
    piezasLabel: 'CANTIDAD', piezas: String(cant),
    nota, escala, fecha: FECHA, numPlano: num,
  });
}

// ---------------------------------------------------------------------------
// Lámina de PIEZA
// ---------------------------------------------------------------------------
function laminaPieza(p, idx) {
  const rolada = p.flat.contorno.length === 5;      // rectángulo = pieza rolada
  const xs = p.flat.contorno.map((q) => q[0]), ys = p.flat.contorno.map((q) => q[1]);
  const devW = Math.max(...xs), devH = Math.max(...ys);

  // radios de la pieza según su familia
  const esExt = /externo|externa/.test(p.name);
  const esCorona = /Refuerzo/.test(p.name);
  const R0 = esCorona ? (esExt ? STD.Rext : STD.RalaInt)
                      : (esExt ? STD.Rext : STD.RintAlmaExt - STD.t);
  const R1 = esCorona ? (esExt ? STD.RalaExt : STD.RintAlmaExt)
                      : (esExt ? STD.Rext + STD.t : STD.RintAlmaExt);

  // BLOQUE DE DIBUJO en mm de pieza: vista en planta arriba, desarrollo abajo.
  // El sector se dibuja con su centro fuera del bloque, así que su envolvente
  // es el rectángulo que ocupa el arco entre 0° y A.
  //
  // El REFUERZO es una pieza PLANA: su vista en planta y su contorno de corte
  // son la misma figura. Dibujar las dos sería repetir la lámina, así que —como
  // en el C60— lleva una sola vista, acotada con radio y ángulo.
  const planW = A >= 90 ? R1 : R1 * Math.sin(A * D2R);
  const planH = R1;
  const HUECO = esCorona ? 0 : Math.max(60, devH * 0.6);   // separación entre vistas
  const bw = esCorona ? planW : Math.max(planW, devW);
  const bh = esCorona ? planH : planH + HUECO + devH;
  const [name, W, H, num, den] = elegirLamina(bw * 1.06, bh * 1.12,
    ['A3', 'A2', 'A1', 'A0']);
  const sh = new Sheet(name, W, H, num, den, 1);
  const s = num / den;                            // UNA escala para todo el dibujo
  const u = util(sh);

  sh.text(`(${idx}) ${p.name.replace(/^FAB · /, '')}`, W / 2, H - MARGIN - 8, 4.5, 'C');

  // origen del bloque, centrado en la zona útil
  const bx = u.x0 + (u.w - bw * s) / 2;
  const by = u.y0 + (u.h - bh * s) / 2;

  const dias = [...new Set(p.flat.cortes.circles.map((c) => r1(c.r * 2)))].sort((a, b) => a - b);
  const rotBarrenos = (x, y) => {
    if (!dias.length) return;
    sh.text(`${p.flat.cortes.circles.length} barrenos · Ø ${dias.join(' / ')}`, x, y, 2.8, 'L');
  };

  // ---- vista en planta curvada -------------------------------------------
  // centro del arco: abajo-izquierda del bloque de planta
  const cx = bx, cy = by + (esCorona ? 0 : devH * s + HUECO * s);
  const P = (R, aDeg) => [cx + R * s * Math.cos(aDeg * D2R), cy + R * s * Math.sin(aDeg * D2R)];
  arco(sh, cx, cy, R0 * s, 0, A, 1);
  arco(sh, cx, cy, R1 * s, 0, A, 1);
  for (const a of [0, A]) sh.line(P(R0, a), P(R1, a), 'VISIBLE');
  cotaRadio(sh, cx, cy, R0 * s, A * 0.38, 1, `R${r0(R0)}`);
  arco(sh, cx, cy, R0 * s * 0.5, 0, A, 1, 'COTAS');
  const mid = P(R0 * 0.5, A / 2);
  sh.text(`${A}°`, mid[0], mid[1] + 3, 3.5, 'C');

  if (esCorona) {
    // pieza plana: la vista en planta ES el contorno de corte. Se acota el
    // ancho del ala y se marcan los barrenos sobre la misma vista.
    // el `flat` de la corona viene trasladado al primer cuadrante desde un
    // sector −A/2..A/2; se deshace esa traslación y se gira a 0..A
    const offX = R0 * Math.cos(A / 2 * D2R), offY = -R1 * Math.sin(A / 2 * D2R);
    for (const c of p.flat.cortes.circles) {
      const tx = c.c[0] + offX, ty = c.c[1] + offY;
      sh.circle(P(Math.hypot(tx, ty), Math.atan2(ty, tx) / D2R + A / 2),
        Math.max(0.3, c.r * s), 'VISIBLE');
    }
    const q0 = P(R0, A * 0.62), q1 = P(R1, A * 0.62);
    sh.line(q0, q1, 'COTAS');
    sh.text(`${r1(STD.ala)} [1.5 pul]`, (q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2 + 3, 3.0, 'C');
    sh.text('CORTE PLANO (sector de corona — no se desarrolla)',
      bx + bw * s / 2, by - 6, 3.2, 'C');
    rotBarrenos(bx, by - 11);
  } else {
    sh.text('VISTA EN PLANTA', bx + bw * s / 2, cy + R1 * s * 0.02, 3.2, 'C');
    // ---- vista de pieza desplegada (abajo) -------------------------------
    const ox = bx + (bw - devW) * s / 2, oy = by;
    sh.rect(ox, oy, devW * s, devH * s, 'VISIBLE');
    sh.text('VISTA DE PIEZA DESPLEGADA', ox + devW * s / 2, oy + devH * s + 7, 3.2, 'C');
    for (const c of p.flat.cortes.circles) {
      sh.circle([ox + c.c[0] * s, oy + c.c[1] * s], Math.max(0.3, c.r * s), 'VISIBLE');
    }
    sh.dimH(ox, ox + devW * s, oy, 10, r1(devW));
    sh.dimV(ox + devW * s, oy, oy + devH * s, 8, r1(devH));
    rotBarrenos(ox, oy - 15);
  }

  tablaItem(sh, MARGIN_L + 2, MARGIN + TITLE_H + 6, esCorona ? 2 : 1);
  cajetin(sh, p.name.replace(/^FAB · /, ''), `CU-${String(idx).padStart(2, '0')}`,
    scaleLabel(num, den), p.flat.avisos[0] || '', esCorona ? 2 : 1);
  return sh;
}

// ---------------------------------------------------------------------------
// Lámina de ENSAMBLAJE
// ---------------------------------------------------------------------------
function laminaEnsamblaje() {
  // el dibujo ocupa la mitad izquierda; la derecha es la columna de notas
  const planW = A >= 90 ? STD.RalaExt : STD.RalaExt * Math.sin(A * D2R);
  const [name, W, H, num, den] = elegirLamina(planW * 2.1, STD.RalaExt * 1.15,
    ['A3', 'A2', 'A1'], 0.5);
  const sh = new Sheet(name, W, H, num, den, 1);
  const sp = num / den;
  const u = util(sh);
  sh.text(`Ensamblaje de curva ${A}° 24"`, W / 2, H - MARGIN - 8, 5.0, 'C');
  sh.text(`Nota: Considerar ${dims.polines} polines cónicos de 21".`,
    W / 2, H - MARGIN - 15, 3.0, 'C');
  sh.text('1. Estructura principal y motorización', MARGIN_L + 4, H - MARGIN - 16, 3.5, 'L');

  const cx = u.x0 + 6, cy = u.y0 + (u.h - STD.RalaExt * sp) / 2;
  for (const R of [STD.RalaInt, STD.RintAlmaExt, STD.Rext, STD.RalaExt]) {
    arco(sh, cx, cy, R * sp, 0, A, 1, R === STD.RintAlmaExt || R === STD.Rext ? 'FINA' : 'VISIBLE');
  }
  for (const a of [0, A]) {
    sh.line([cx + STD.RalaInt * sp * Math.cos(a * D2R), cy + STD.RalaInt * sp * Math.sin(a * D2R)],
            [cx + STD.RalaExt * sp * Math.cos(a * D2R), cy + STD.RalaExt * sp * Math.sin(a * D2R)],
            'VISIBLE');
  }
  // polines
  for (let k = 0; k < dims.polines; k++) {
    const a = ((k + 0.5) * (A / dims.polines)) * D2R;
    sh.line([cx + STD.RintAlmaExt * sp * Math.cos(a), cy + STD.RintAlmaExt * sp * Math.sin(a)],
            [cx + STD.Rext * sp * Math.cos(a), cy + STD.Rext * sp * Math.sin(a)], 'FINA');
  }
  cotaRadio(sh, cx, cy, STD.RalaExt * sp, A * 0.3, 1, `R${r1(STD.RalaExt)}`);
  cotaRadio(sh, cx, cy, STD.RalaInt * sp, A * 0.72, 1, `R${r1(STD.RalaInt)}`);
  sh.text(`${A}°`, cx + STD.RalaInt * sp * 0.45 * Math.cos(A / 2 * D2R),
          cy + STD.RalaInt * sp * 0.45 * Math.sin(A / 2 * D2R), 4.0, 'C');
  sh.text(`${r1(STD.anchoEnvolvente)} [24 pul]`, cx + STD.Rcentro * sp * Math.cos(A * 0.5 * D2R),
          cy + STD.Rcentro * sp * Math.sin(A * 0.5 * D2R) - 5, 3.0, 'C');

  // despiece + cantidades, al estilo de las notas del C60
  const tx = u.x0 + u.w * 0.52;
  let ty = u.y0 + u.h - 6;
  const li = (t, h = 2.8) => { sh.text(t, tx, ty, h, 'L'); ty -= h + 1.8; };
  li('Piezas:', 3.4);
  const cant = (p) => (/Refuerzo/.test(p.name) ? 2 : 1);
  parts.forEach((p, i) => li(`(${i + 1}) ${p.name.replace(/^FAB · /, '')} — cantidad ${cant(p)}`));
  ty -= 3;
  li('Componentes (sin cambio respecto de la curva de 60°):', 3.2);
  li(`Polín cónico 21" — cantidad ${dims.polines}`);
  li(`Travesaño 21" — cantidad ${dims.travesanos}; cada unidad con 4 pernos 3/8 x 1"`);
  li(`Tirante interno — cantidad ${dims.travesanos}; cada unidad con 2 pernos 1/4 x 1/2"`);
  li('Soporte de motor — cantidad 2; cada unidad con 2 pernos 3/8 x 1"');
  li(`Soporte frontal — cantidad ${2 * dims.posicionesSoporte}; cada unidad con 2 pernos 3/8 x 1"`);
  ty -= 3;
  li('Patrones (mismas filas que la curva de 60°):', 3.2);
  li('Patrón de 4 perforaciones para la sujeción de travesaños.');
  li('Patrón de perforaciones de 7 mm destinado a tirantes.');
  li('Patrón de 2 perforaciones para montar soportes de motor.');
  ty -= 3;
  li(`Desarrollo del alma externa ${r1(dims.desarrollo.externo)} · interna ${r1(dims.desarrollo.interno)}`, 3.0);
  li(`Paso angular de polín ${dims.pasoAngular}° — el mismo de la curva de 60°`, 3.0);
  li('Soldar aristas internas. Cordón completo.', 3.0);

  cajetin(sh, `Ensamblaje curva ${A}° 24"`, 'CU-00', scaleLabel(num, den),
    `${dims.polines} polines · ${dims.travesanos} travesaños · estándar Kofmelk C60`, 1);
  return sh;
}

// ---------------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
const sheets = [laminaEnsamblaje(), ...parts.map((p, i) => laminaPieza(p, i + 1))];
const pdf = exportSheetsPDF(sheets, `planos_fabricacion_curva${A}.pdf`);
const file = join(OUT, `planos_fabricacion_curva${A}.pdf`);
writeFileSync(file, Buffer.from(pdf.data));

// despiece en JSON, para compras y para el plan
const despiece = {
  curva: `${A}° 24"`, fecha: FECHA,
  fabricadas: parts.map((p, i) => ({
    plano: `CU-${String(i + 1).padStart(2, '0')}`,
    pieza: p.name.replace(/^FAB · /, ''),
    cantidad: /Refuerzo/.test(p.name) ? 2 : 1,
    material: `Fe e=${STD.t} mm`,
    barrenos: p.flat.cortes.circles.length,
  })),
  componentes: [
    { item: 'Polín cónico 21"', cantidad: dims.polines },
    { item: 'Travesaño 21"', cantidad: dims.travesanos },
    { item: 'Tirante interno', cantidad: dims.travesanos },
    { item: 'Soporte de motor', cantidad: 2 },
    { item: 'Soporte frontal', cantidad: 2 * dims.posicionesSoporte },
  ],
  dims,
};
writeFileSync(join(OUT, `_despiece_curva${A}.json`), JSON.stringify(despiece, null, 1));
console.log(`${file}: ${sheets.length} láminas (1 ensamblaje + ${parts.length} piezas)`);
console.log(`  ${dims.polines} polines · paso ${dims.pasoAngular}° · desarrollo ext `
  + `${dims.desarrollo.externo} / int ${dims.desarrollo.interno}`);
