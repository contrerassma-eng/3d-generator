#!/usr/bin/env node
// test_curva.mjs — Compuertas de la CURVA DE POLINES CÓNICOS 24".
//
// La regla del encargo es dura: la curva de 90° tiene que ser la de 60° con
// más arco. Nada más. Por eso la prueba no mira la de 90° en el vacío: pone al
// generador a reproducir la curva de 60° REAL —la de los planos Kofmelk— y
// sólo si la clava acepta la de 90°.
//
//   1. CALIBRACIÓN — el C60 generado contra `curva_patron_c60.json`, el patrón
//      de perforación medido en los PDF de fabricación (54 y 62 barrenos).
//   2. INVARIANTES DEL ESTÁNDAR — lo que NO puede cambiar entre 60° y 90°:
//      radios, sección, paso de polín, filas de barrenos, ancho envolvente.
//   3. EXTENSIÓN — lo que sí cambia, y que sólo cambie hacia donde debe:
//      cuenta de polines exacta, ningún vano mayor que el del C60.
//
// Uso:  cd cad && node tests/test_curva.mjs
//       (correr antes `node ensambles/gen_curva.mjs` si se tocó el generador)

import { readFileSync } from 'node:fs';
import { curva, STD, REGLAS } from '../ensambles/gen_curva.mjs';

const D2R = Math.PI / 180;
let fallos = 0, pruebas = 0;

function ok(cond, msg, detalle = '') {
  pruebas++;
  if (cond) { console.log(`  ok   ${msg}`); return true; }
  fallos++;
  console.log(`  FALLA ${msg}${detalle ? '\n         ' + detalle : ''}`);
  return false;
}
const cerca = (a, b, tol) => Math.abs(a - b) <= tol;

function okCerca(a, b, tol, msg) {
  return ok(cerca(a, b, tol), `${msg}  (${round(a)} vs ${round(b)}, tol ±${tol})`,
    cerca(a, b, tol) ? '' : `diferencia ${round(Math.abs(a - b))}`);
}
const round = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------
const patron = JSON.parse(readFileSync(new URL('../ensambles/curva_patron_c60.json', import.meta.url)));
const C60 = curva(60);
const C90 = curva(90);

// Barrenos del desarrollo de un lateral, agrupados por fila (y desde arriba).
function filas(doc, id) {
  const p = doc.parts.find((q) => q.id === id);
  const alto = STD.alma;
  const m = new Map();
  for (const c of p.flat.cortes.circles) {
    const yTop = round(alto - c.c[1]);
    let key = [...m.keys()].find((k) => Math.abs(k - yTop) < 1.5);
    if (key === undefined) { key = yTop; m.set(key, []); }
    m.get(key).push({ x: c.c[0], d: round(c.r * 2) });
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0])
    .map(([y, hs]) => ({ y, n: hs.length, d: hs[0].d, x: hs.map((h) => h.x).sort((a, b) => a - b) }));
}

console.log('\n1. CALIBRACIÓN — C60 generado vs. patrón medido en los planos Kofmelk');
for (const [id, key] of [['cuerpo_lat_ext', 'cuerpo_lat_externo'],
                         ['cuerpo_lat_int', 'cuerpo_lat_interno']]) {
  const ref = patron[key];
  const gen = filas(C60.doc, id);
  const p = C60.doc.parts.find((q) => q.id === id);
  const xs = p.flat.contorno.map((q) => q[0]), ys = p.flat.contorno.map((q) => q[1]);
  console.log(`  -- ${id}`);
  // el desarrollo acotado en la lámina (1464 / 903) es el que produce K=0,5
  okCerca(Math.max(...xs), ref.desarrollo[0], 1.0, `${id}: largo del desarrollo`);
  okCerca(Math.max(...ys), ref.desarrollo[1], 1.0, `${id}: alto del desarrollo`);

  // cada fila medida tiene que existir en el generado, a la misma altura,
  // con el mismo diámetro nominal y —donde el C60 manda— la misma cuenta
  for (const [yRef, f] of Object.entries(ref.filas)) {
    const y = parseFloat(yRef);
    const g = gen.find((q) => Math.abs(q.y - y) < 2.0);
    if (!ok(!!g, `${id}: existe la fila a ${y} mm del borde superior`,
      `filas generadas: ${gen.map((q) => q.y).join(', ')}`)) continue;
    okCerca(g.d, f.d, 1.0, `${id}: Ø de la fila ${y}`);
    // la fila de polines es la que fija el paso: cuenta y espaciamiento exactos
    if (Math.abs(y - STD.polinYExt) < 2 || Math.abs(y - STD.polinYInt) < 2) {
      ok(g.n === 14, `${id}: 14 polines en 60° (nota del ensamblaje C60)`,
        `generados ${g.n}`);
      const paso = (g.x[g.x.length - 1] - g.x[0]) / (g.n - 1);
      const pasoRef = (f.x[f.x.length - 1] - f.x[0]) / (f.n - 1);
      okCerca(paso, pasoRef, 1.0, `${id}: paso de polín`);
      okCerca(g.x[0], f.x[0], 1.5, `${id}: primer polín a medio paso del extremo`);
    }
  }
}

console.log('\n2. INVARIANTES — lo que 90° hereda de 60° sin tocar');
const d60 = C60.dims, d90 = C90.dims;
ok(d60.radios.int === 861 && d90.radios.int === 861, 'radio interno R861 en ambas');
ok(d60.radios.ext === 1397 && d90.radios.ext === 1397, 'radio externo R1397 en ambas');
okCerca(d60.claroPolines, 21 * 25.4, 0.5, 'claro entre almas = cara del polín 21"');
ok(d90.claroPolines === d60.claroPolines, 'claro entre almas idéntico en 90°');
okCerca(d60.envolvente, 24 * 25.4, 1.0, 'ancho envolvente = 24"');
ok(d90.envolvente === d60.envolvente, 'ancho envolvente idéntico en 90°');
okCerca(d90.pasoAngular, d60.pasoAngular, 0.001, 'paso angular de polín idéntico');
okCerca(STD.alma, 7.5 * 25.4, 0.1, 'alma = 7,5"');
okCerca(STD.ala, 1.5 * 25.4, 0.1, 'ala = 1,5"');
ok(STD.t === 3, 'espesor de chapa 3 mm');
// las filas de barrenos son las mismas alturas en las dos curvas
{
  const f60 = filas(C60.doc, 'cuerpo_lat_ext').map((q) => q.y);
  const f90 = filas(C90.doc, 'cuerpo_lat_ext').map((q) => q.y);
  ok(JSON.stringify(f60) === JSON.stringify(f90),
    'mismas filas de barrenos (alturas) en 60° y 90°',
    `60: ${f60.join(', ')}\n         90: ${f90.join(', ')}`);
}
// las piezas fabricadas son las mismas familias
{
  const fam = (d) => d.parts.filter((p) => p.flat)
    .map((p) => p.name.replace(/C\d+°/, 'C·')).sort().join('|');
  ok(fam(C60.doc) === fam(C90.doc), 'mismas piezas fabricadas (misma familia)');
}

console.log('\n3. EXTENSIÓN a 90° — sólo crece el arco');
ok(d90.polines === 21, '21 polines en 90° (90 / (60/14) = 21 exacto)', `${d90.polines}`);
okCerca(d90.desarrollo.externo / d60.desarrollo.externo, 1.5, 0.001,
  'desarrollo externo × 1,5');
okCerca(d90.desarrollo.interno / d60.desarrollo.interno, 1.5, 0.001,
  'desarrollo interno × 1,5');
// ningún vano de travesaño crece respecto del C60
{
  const vano = (dims, A) => {
    const t = REGLAS.travesanos(A).patrones;
    return Math.max(...t.slice(1).map((v, i) => v - t[i]));
  };
  const v60 = vano(d60, 60), v90 = vano(d90, 90);
  ok(v90 <= v60 + 1e-6, `vano de travesaño no crece (60°: ${round(v60)}° · 90°: ${round(v90)}°)`);
  ok(d90.travesanos >= d60.travesanos, `travesaños ${d60.travesanos} → ${d90.travesanos}`);
}
// ningún vano entre posiciones de soporte crece respecto del C60
{
  const arco = (A) => {
    const f = [0, ...REGLAS.soportes(A), 1];
    const dev = STD.RnExt * A * D2R;
    return Math.max(...f.slice(1).map((v, i) => (v - f[i]) * dev));
  };
  const a60 = arco(60), a90 = arco(90);
  ok(a90 <= a60 + 1e-6, `vano entre soportes no crece (60°: ${round(a60)} mm · 90°: ${round(a90)} mm)`);
}
// motorización: 1 motor por zona, 7 polines por zona (regla del C60 cruzada
// con el catálogo Hytrol E24 — ver ensambles/curva_web_facts.json)
// DOS conjuntos de motor, como el diseño nativo (corrección de Sergio). La
// aritmética de zonas daba 3 a 90°; manda el equipo real.
ok(d60.motores === 2, 'C60: 2 motores, como los 2 soportes de motor de la lámina', `${d60.motores}`);
ok(d90.motores === 2, 'C90: 2 motores (diseño nativo, no 3 por aritmética de zonas)', `${d90.motores}`);

// el DXF de corte tiene que salir cerrado y con barrenos en todas las piezas
for (const doc of [C60.doc, C90.doc]) {
  const A = doc.meta.dims.angulo;
  for (const p of doc.parts.filter((q) => q.flat)) {
    const c = p.flat.contorno;
    const cerrado = c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1];
    if (!ok(cerrado, `C${A} ${p.id}: contorno de corte cerrado`)) break;
    if (!ok(c.every((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])),
      `C${A} ${p.id}: contorno sin NaN`)) break;
  }
}
// los barrenos caen DENTRO del contorno de su pieza
for (const doc of [C60.doc, C90.doc]) {
  const A = doc.meta.dims.angulo;
  let malos = 0;
  for (const p of doc.parts.filter((q) => q.flat)) {
    const xs = p.flat.contorno.map((q) => q[0]), ys = p.flat.contorno.map((q) => q[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    for (const c of p.flat.cortes.circles) {
      if (c.c[0] - c.r < x0 - 0.01 || c.c[0] + c.r > x1 + 0.01 ||
          c.c[1] - c.r < y0 - 0.01 || c.c[1] + c.r > y1 + 0.01) malos++;
    }
  }
  ok(malos === 0, `C${A}: todos los barrenos dentro de su pieza`, `${malos} fuera`);
}

console.log(`\n${fallos ? 'FALLARON' : 'PASARON'} — ${pruebas - fallos}/${pruebas} compuertas`);
process.exit(fallos ? 1 : 0);
