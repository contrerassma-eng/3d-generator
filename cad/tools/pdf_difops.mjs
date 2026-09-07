#!/usr/bin/env node
// pdf_difops.mjs — ¿este cambio en el motor de dibujo alteró el DIBUJO?
//
// Compara dos PDF por sus OPERADORES DE PINTADO, no por píxeles. Rasterizar y
// mirar (tools/pdf2png.mjs, regla 12) responde «¿se ve bien?»; esto responde
// «¿se ve IGUAL que antes?», que es la pregunta de toda refactorización del
// motor. El visor introduce zoom y scroll propios: un diff de píxeles marca
// diferencias donde no las hay. Los operadores no mienten.
//
// Simula la máquina de estado gráfico (color de relleno, de trazo, ancho) y
// emite, por cada operador que PINTA, la tupla (op, relleno, trazo, ancho,
// coordenadas). Ignora el estado que ese operador no usa: un trazo puro (S) no
// rellena, un relleno puro (f) no traza — comparar ahí lo que no se dibuja
// produce falsos positivos.
//
// DOS MODOS, porque hay dos clases de cambio:
//   (por omisión) OPERADORES — para cambios que conservan la descomposición
//     del dibujo (estado gráfico, formato de números). Exige identidad exacta.
//   --tinta      COBERTURA — para optimizaciones que FUNDEN primitivas a
//     propósito (polilíneas, descarte de bordes duplicados, fusión de
//     colineales). Ahí el modo operadores marca diferencia siempre y no sirve:
//     hay que preguntar por la TINTA. Muestrea cada trazo y compara qué celdas
//     de 0,5 pt quedan pintadas — «apareció línea donde no había» es el defecto
//     grave; «desapareció» suele ser el duplicado que se quitó.
//
// Uso: node tools/pdf_difops.mjs [--tinta] <a.pdf> <b.pdf>
//   → sale 0 si el dibujo es equivalente, 1 si no.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const r2 = (v) => Math.round(v * 100) / 100;

// streams de contenido: en los PDF de la célula van todos con /FlateDecode
function contenidos(archivo) {
  const buf = readFileSync(archivo);
  const out = [];
  let i = 0;
  for (;;) {
    const s = buf.indexOf('stream', i); if (s < 0) break;
    let d = s + 6;
    if (buf[d] === 0x0d) d++;
    if (buf[d] === 0x0a) d++;
    const e = buf.indexOf('endstream', d); if (e < 0) break;
    try {
      const txt = inflateSync(buf.subarray(d, e)).toString('latin1');
      // un stream de contenido dibuja: tiene trazos o texto
      if (/\bm\b|\bl\b|\bBT\b/.test(txt)) out.push(txt);
    } catch { /* no era Flate (fuente, imagen): no es contenido */ }
    i = e + 9;
  }
  return out;
}

function ops(texto) {
  const res = [];
  let fill = null, stroke = null, w = null, pts = [], pila = [];
  for (const t of texto.split(/\s+/)) {
    if (!t) continue;
    const n = Number(t);
    if (Number.isFinite(n) && /^-?[\d.]+$/.test(t)) { pila.push(n); continue; }
    const p = pila;
    if (t === 'rg' && p.length >= 3) fill = p.slice(-3).map(r2).join(',');
    else if (t === 'RG' && p.length >= 3) stroke = p.slice(-3).map(r2).join(',');
    else if (t === 'g' && p.length >= 1) fill = Array(3).fill(r2(p.at(-1))).join(',');
    else if (t === 'G' && p.length >= 1) stroke = Array(3).fill(r2(p.at(-1))).join(',');
    else if (t === 'w' && p.length >= 1) w = r2(p.at(-1));
    else if ((t === 'm' || t === 'l') && p.length >= 2) pts.push(r2(p.at(-2)), r2(p.at(-1)));
    else if (t === 'c' && p.length >= 6) for (let k = 0; k < 6; k += 2) pts.push(r2(p.at(-6 + k)), r2(p.at(-5 + k)));
    else if (t === 're' && p.length >= 4) pts.push(...p.slice(-4).map(r2));
    else if (['f', 'S', 'B', 'B*', 'b', 'f*'].includes(t)) {
      // sólo el estado que ESE operador usa
      const rel = t === 'S' ? '' : fill;
      const tra = (t === 'f' || t === 'f*') ? '' : stroke;
      res.push(`${t}|${rel}|${tra}|${w}|${pts.join(' ')}`);
      pts = [];
    } else if (t === 'Tj' || t === 'TJ') { res.push(`T|${fill}||${pts.join(' ')}`); pts = []; }
    pila = [];
  }
  return res;
}

const args = process.argv.slice(2);
const MODO_TINTA = args.includes('--tinta');
const [A, B] = args.filter((a) => a !== '--tinta');
if (!A || !B) { console.error('uso: pdf_difops [--tinta] <a.pdf> <b.pdf>'); process.exit(2); }
const ca = contenidos(A), cb = contenidos(B);
if (ca.length !== cb.length) {
  console.log(`DIFIEREN: ${ca.length} páginas de contenido contra ${cb.length}`);
  process.exit(1);
}
// ── modo TINTA ──────────────────────────────────────────────────────────────
// polilíneas de los operadores de trazo, muestreadas a celdas de 0,5 pt
function trazos(txt) {
  const out = []; let pts = [], pila = [];
  for (const t of txt.split(/\s+/)) {
    if (!t) continue;
    const n = Number(t);
    if (Number.isFinite(n) && /^-?[\d.]+$/.test(t)) { pila.push(n); continue; }
    if ((t === 'm' || t === 'l') && pila.length >= 2) pts.push([r2(pila.at(-2)), r2(pila.at(-1))]);
    else if (t === 'S') { if (pts.length) out.push(pts); pts = []; }
    else if (['f', 'B', 'B*', 'b', 'f*'].includes(t)) pts = [];
    pila = [];
  }
  return out;
}
function celdas(pl) {
  const g = new Set();
  for (const p of pl) for (let i = 0; i + 1 < p.length; i++) {
    const [a, b] = [p[i], p[i + 1]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const N = Math.max(1, Math.ceil(L / 0.25));
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      g.add(`${Math.round((a[0] + (b[0] - a[0]) * t) * 2)},${Math.round((a[1] + (b[1] - a[1]) * t) * 2)}`);
    }
  }
  return g;
}
// grupos 8-conectados: 1-3 celdas = ruido de muestreo; un grupo grande = tramo real
function grupos(set) {
  const vis = new Set(), gs = [];
  for (const c of set) {
    if (vis.has(c)) continue;
    const pila = [c], g = [];
    while (pila.length) {
      const q = pila.pop(); if (vis.has(q)) continue;
      vis.add(q); g.push(q);
      const [x, y] = q.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const k = `${x + dx},${y + dy}`;
        if (set.has(k) && !vis.has(k)) pila.push(k);
      }
    }
    gs.push(g);
  }
  return gs.sort((p, q) => q.length - p.length);
}
// puente tolerado: la fusión de colineales cierra micro-huecos entre tramos
// que ya se veían continuos. Sobre 1 mm de papel ya es una línea que el plano
// no tenía y hay que mirarla.
const UMBRAL_MM = Number(process.env.UMBRAL_MM || 1.0);
if (MODO_TINTA) {
  let grave = 0;
  for (let i = 0; i < ca.length; i++) {
    const ta = celdas(trazos(ca[i])), tb = celdas(trazos(cb[i]));
    const falta = new Set([...ta].filter((c) => !tb.has(c)));
    const sobra = new Set([...tb].filter((c) => !ta.has(c)));
    const comun = ta.size - falta.size;
    const gf = grupos(falta), gs = grupos(sobra);
    // el veredicto va en MILÍMETROS DE PAPEL, no en celdas: una celda es 0,5 pt
    const mm = (g) => g.length * 0.5 * 25.4 / 72;
    const puente = gs.length ? mm(gs[0]) : 0;
    if (puente > UMBRAL_MM) grave++;
    console.log(`  hoja ${i + 1}: ${comun} celdas comunes · falta ${falta.size} (${(100 * falta.size / (comun + falta.size)).toFixed(2)} %) · sobra ${sobra.size}`);
    if (gf.length) console.log(`     desapareció: ${gf.length} grupos, ${gf.filter((g) => g.length <= 3).length} de 1-3 celdas (ruido de muestreo) · mayor ${mm(gf[0]).toFixed(2)} mm`);
    if (gs.length) console.log(`     apareció: ${gs.length} grupos · mayor ${puente.toFixed(2)} mm${puente > UMBRAL_MM ? '  ← SOBRE EL UMBRAL' : ' (bajo umbral)'}`);
  }
  console.log(grave
    ? `TINTA INVENTADA en ${grave} de ${ca.length} hojas — hay línea nueva sobre ${UMBRAL_MM} mm: la fusión une tramos NO contiguos`
    : `TINTA EQUIVALENTE en ${ca.length} hojas — ninguna línea nueva supera ${UMBRAL_MM} mm de papel`);
  process.exit(grave ? 1 : 0);
}

let total = 0, malas = 0;
for (let i = 0; i < ca.length; i++) {
  const a = ops(ca[i]), b = ops(cb[i]);
  total += a.length;
  const igual = a.length === b.length && a.every((x, k) => x === b[k]);
  if (!igual) {
    malas++;
    const d = [];
    for (let k = 0; k < Math.min(a.length, b.length) && d.length < 2; k++) if (a[k] !== b[k]) d.push(k);
    console.log(`  hoja ${i + 1}: DIFIERE (${a.length} contra ${b.length} operadores)`);
    for (const k of d) { console.log(`    antes: ${a[k].slice(0, 180)}`); console.log(`    desp : ${b[k].slice(0, 180)}`); }
  } else console.log(`  hoja ${i + 1}: idéntica (${a.length} operadores)`);
}
console.log(malas
  ? `DIBUJO ALTERADO en ${malas} de ${ca.length} hojas`
  : `DIBUJO IDÉNTICO — ${total} operadores de pintado en ${ca.length} hojas`);
process.exit(malas ? 1 : 0);
