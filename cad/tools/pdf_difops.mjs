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
// Uso: node tools/pdf_difops.mjs <a.pdf> <b.pdf>
//   → sale 0 si el dibujo es idéntico, 1 si difiere.
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

const [A, B] = process.argv.slice(2);
if (!A || !B) { console.error('uso: pdf_difops <a.pdf> <b.pdf>'); process.exit(2); }
const ca = contenidos(A), cb = contenidos(B);
if (ca.length !== cb.length) {
  console.log(`DIFIEREN: ${ca.length} páginas de contenido contra ${cb.length}`);
  process.exit(1);
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
