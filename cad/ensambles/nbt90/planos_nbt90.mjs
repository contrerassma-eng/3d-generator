#!/usr/bin/env node
// planos_nbt90.mjs — PLANOS DE FABRICACIÓN de la transferencia 90°.
//
// Emite, en `planos/`:
//   - planos_fabricacion_nbt90.pdf : portada + lista de materiales + una lámina
//     por pieza fabricada (vistas del primer diedro, cotas envolventes y
//     cajetín ISO 7200) + el desarrollo de cada pieza de chapa plegada
//   - despiece.json / despiece.csv : lista de materiales (fabricadas y compradas)
//   - conjunto_nbt90.dxf : vistas del conjunto a escala real
//
//   cd cad && node ensambles/nbt90/planos_nbt90.mjs [fecha]
import * as THREE from 'three';
import { buildPartGeometry, partMatrix } from '../../js/model.js';
import { buildSheet, Sheet, chooseSheet, scaleLabel, exportSheetsPDF, exportDrawingDXF } from '../../js/drawing2d.js';
import { desarrollo } from './lib.mjs';
import { P } from './params.mjs';
// `materialDe` (y con ella `espesorDe` y `desig`) vive en `materiales.mjs`, que
// es de donde también la leen los visores para pintar cada pieza según de qué
// está hecha. Estaba aquí; se mudó allí sin tocar una línea para que el material
// del cajetín y el del render NO PUEDAN divergir: uno solo es el que manda.
import { desig, materialDe } from './materiales.mjs';
// Esquema de tolerancias: las clases y las tablas de norma con las que se
// rellenan el cajetín, la lámina de tolerancias y las columnas del despiece.
// Una tolerancia que no sale en el plano no existe.
import { NORMA, AJUSTES, CHAPA, ranuraPara, largoRanura, tol2768, tol13920, tolForma13920, tolForma2768 } from './tolerancias.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aquí = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(aquí, 'narrow_belt_transfer_90.json'), 'utf8'));
const outDir = join(aquí, 'planos');
mkdirSync(outDir, { recursive: true });
const fecha = process.argv[2] || '—';
const PROY = 'TRANSFERENCIA 90° — RODILLOS EMERGENTES (NBT90)';
const FUENTE = 'diseño paramétrico foto3d — capa user (escala 0.6320 mm/px, ver ESCALA.md)';

const MARGIN = 10, MARGIN_L = 20, TITLE_H = 42, GAP = 26;

// --- agrupar piezas idénticas ------------------------------------------------
const firma = (p) => `${desig(p.name)}|${p.features.length}|${p.features.map(f =>
  `${f.shape}${JSON.stringify(f.params ?? {})}`).join(';')}`;

const grupos = new Map();
for (const p of doc.parts) {
  const k = firma(p);
  if (grupos.has(k)) grupos.get(k).cant++;
  else grupos.set(k, { name: p.name, desig: desig(p.name), part: p, cant: 1, capa: /^FIJO/.test(p.name) ? 'FIJO' : 'MÓVIL' });
}
const orden = (g) => (g.part.contexto ? 4 : g.part.hardware ? 3 : g.part.componente ? 2 : g.capa === 'FIJO' ? 0 : 1);
const lista = [...grupos.values()].sort((a, b) => orden(a) - orden(b) || a.desig.localeCompare(b.desig));

// --- láminas de respaldo cuando la malla no admite extracción de aristas -----
function simpleSheet(geom, meta) {
  const q = geom.attributes.position;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < q.count; i++) {
    const v = [q.getX(i), q.getY(i), q.getZ(i)];
    for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], v[a]); hi[a] = Math.max(hi[a], v[a]); }
  }
  const W = hi[0] - lo[0], D = hi[1] - lo[1], H = hi[2] - lo[2];
  const tw = W + GAP + D, th = H + GAP + D;
  const [name, PW, PH, num, den] = chooseSheet(tw, th);
  const sh = new Sheet(name, PW, PH, num, den, 1);
  const s = num / den;
  const uw = PW - MARGIN_L - MARGIN, uh = PH - 2 * MARGIN - TITLE_H - 5;
  const ox = MARGIN_L + (uw - tw * s) / 2, oy = MARGIN + TITLE_H + 5 + (uh - th * s) / 2;
  const view = (dx, dy, w, h, label) => {
    const x = ox + dx * s, y = oy + dy * s;
    sh.rect(x, y, w * s, h * s, 'VISIBLE');
    sh.text(label, x + w * s / 2, y + h * s + 4, 3.5, 'C');
  };
  view(0, D + GAP, W, H, 'ALZADO'); view(0, 0, W, D, 'PLANTA'); view(W + GAP, D + GAP, D, H, 'PERFIL');
  sh.dimH(ox, ox + W * s, oy + (D + GAP) * s, 9, W);
  sh.dimV(ox + W * s, oy + (D + GAP) * s, oy + (D + GAP + H) * s, 9, H);
  sh.dimV(ox + W * s, oy, oy + D * s, 9, D);
  sh.frame();
  sh.titleBlock({ ...meta, escala: scaleLabel(num, den), verificacion: 'ENVOLVENTE (MALLA COMPLEJA)' });
  return sh;
}

// --- lámina de DESARROLLO de una chapa plegada -------------------------------
// Dibuja la tira estirada con sus líneas de plegado acotadas: es lo que va a la
// plegadora. El largo sale de `desarrollo()`, con la misma fibra media con la
// que se construyó el sólido.
function flatSheet(g, meta) {
  const ch = g.part.chapa;
  const dev = desarrollo(ch.fibra, ch.t, ch.radio ?? ch.t, ch.k ?? P.factorK);
  const ancho = ch.largo ?? 200;                     // largo del perfil (dirección de extrusión)
  const [name, PW, PH, num, den] = chooseSheet(dev.largo + 40, ancho + 60);
  const sh = new Sheet(name, PW, PH, num, den, 1);
  const s = num / den;
  const uw = PW - MARGIN_L - MARGIN, uh = PH - 2 * MARGIN - TITLE_H - 5;
  const ox = MARGIN_L + (uw - dev.largo * s) / 2, oy = MARGIN + TITLE_H + 5 + (uh - ancho * s) / 2;
  sh.rect(ox, oy, dev.largo * s, ancho * s, 'VISIBLE');
  // posición de cada pliegue sobre la tira desarrollada
  let u = 0;
  for (let i = 0; i < dev.plegados.length; i++) {
    const pl = dev.plegados[i];
    u += dev.tramos[i] - pl.setback;
    const x = ox + u * s;
    sh.rect(x, oy, pl.BA * s, ancho * s, 'PLIEGUE');
    sh.text(`PLEGAR ${pl.ang}° R${pl.r}`, x + pl.BA * s / 2, oy + ancho * s + 4, 2.6, 'C');
    sh.dimH(ox, x, oy - 6, 9, +u.toFixed(1));
    u += pl.BA;
  }
  sh.dimH(ox, ox + dev.largo * s, oy - 16, 9, dev.largo);
  sh.dimV(ox + dev.largo * s, oy, oy + ancho * s, 9, ancho);
  sh.text(`DESARROLLO — e=${ch.t} · R=${ch.radio ?? ch.t} · K=${ch.k ?? P.factorK}`,
    ox + dev.largo * s / 2, oy + ancho * s + 12, 3.5, 'C');
  sh.frame();
  sh.titleBlock({ ...meta, escala: scaleLabel(num, den), verificacion: 'DESARROLLO (FIBRA MEDIA, FACTOR K)' });
  return sh;
}

// --- emitir láminas + despiece ----------------------------------------------
const despiece = [];
const hojas = [];
const M4 = new THREE.Matrix4();
let itemN = 0, planoN = 0;

// Tolerancias que van al cajetín de UNA pieza: la general que le toca por lo que
// es, la del conjunto soldado si va soldada, y las de ajuste si tiene alguna
// cota que ajusta. Todo sale del documento (`p.tol`), que lo escribe el
// integrador: aquí no se decide nada, se transcribe.
function notaTolerancia(part) {
  const t = part.tol || {};
  const trozos = [];
  if (t.pieza) trozos.push(`tol. gral. ${t.pieza}`);
  if (t.conjunto) trozos.push(`conjunto soldado ${t.conjunto}`);
  for (const a of t.ajustes || []) trozos.push(`${a.cota} ${a.ajuste}`);
  if (part.soldadura?.garganta) trozos.push(`cordón a${part.soldadura.garganta} ${part.soldadura.norma.split(' —')[0]}`);
  return trozos.join(' · ');
}

for (const g of lista) {
  itemN++;
  const comprada = !!(g.part.hardware || g.part.componente) && !g.part.fabricada;
  const contexto = !!g.part.contexto;
  const fabricada = !comprada && !contexto;
  const material = comprada ? (g.part.norma || g.part.componente || 'componente de catálogo')
      : materialDe(g.desig, g.part.chapa);
  const tolTxt = fabricada ? notaTolerancia(g.part) : (g.part.clase_material || '');
  let plano = '';
  if (fabricada) {
    planoN++;
    plano = `NBT90-${String(planoN).padStart(2, '0')}`;
    const meta = {
      designacion: g.desig, piezas: String(g.cant), proyecto: PROY, fuente: FUENTE,
      numPlano: plano, fecha,
      nota: `${g.capa} · Material: ${material} · ${tolTxt || `tol. gral. ${NORMA.chapa.clase}`}`,
    };
    try {
      const geom = buildPartGeometry(g.part);
      const tris = geom.attributes.position.count / 3;
      hojas.push(tris > 12000 ? simpleSheet(geom, meta)
        : buildSheet([{ geometry: geom, matrixWorld: M4 }], 'paper', meta));
      if (g.part.chapa?.fibra?.length >= 3) {
        hojas.push(flatSheet(g, { ...meta, numPlano: `${plano}-D`, designacion: `${g.desig} — DESARROLLO` }));
      }
    } catch (err) {
      console.warn(`  ! sin lámina: ${g.desig} (${err.message})`);
      planoN--; plano = '';
    }
  }
  despiece.push({
    item: itemN, designacion: g.desig, cant: g.cant, capa: g.capa,
    tipo: contexto ? 'CONTEXTO (no se fabrica)' : comprada ? 'COMPRADA' : 'FABRICADA',
    material_norma: material, plano: plano || '—',
    // Columnas nuevas: sin ellas la tolerancia y el encaje se quedaban en el
    // modelo y no llegaban al taller.
    tolerancia: tolTxt || '—',
    ajustes: (g.part.tol?.ajustes || []).map((a) => `${a.cota} ${a.ajuste} (${a.criterio})`).join(' · ') || '—',
    soldadura: g.part.soldadura
      ? `${g.part.soldadura.tipo}${g.part.soldadura.garganta ? ` a=${g.part.soldadura.garganta}` : ''} · ${g.part.soldadura.norma}`
      : '—',
    encajes: (g.part.encajes || []).map((en) => `${en.id} ${en.tipo}/${en.rol}`).join(' · ') || '—',
    acabado: g.part.acabado || '—',
  });
}

// --- portada y lista de materiales ------------------------------------------
const A3 = () => new Sheet('A3', 420, 297, 1, 1, 1);
function portada() {
  const sh = A3();
  const V = doc.meta.verificaciones;
  let y = 250;
  const li = (t, size = 4, dx = 24) => { sh.text(t, dx, y, size, 'L'); y -= size * 1.9; };
  sh.text(PROY, 210, 268, 7, 'C');
  li('', 4);
  li(`Equipo: ${doc.meta.equipo}`, 3.6);
  li(`Estado modelado: ${doc.meta.estado_modelado}`, 3.6);
  li('', 3);
  li('VERIFICACIONES DEL DISEÑO', 4.6);
  for (const [k, v] of Object.entries(V)) li(`· ${k}: ${JSON.stringify(v)}`, 3.2);
  li('', 3);
  li('PROCEDENCIA DE LAS COTAS', 4.6);
  li('· medido: levantamiento por píxeles de las dos vistas (tools/med_px.py); cada cota cita su fila/columna', 3.2);
  li('· web: fichas y lista de partes de componentes comprables, con URL, fecha y cita textual', 3.2);
  li('· user: decisiones de diseño, marcadas `dis` en params.mjs y en cada módulo', 3.2);
  sh.frame();
  sh.titleBlock({
    designacion: 'PORTADA Y VERIFICACIONES', proyecto: PROY, fuente: FUENTE,
    verificacion: 'GATE SUPERADO', piezas: String(doc.parts.length), nota: doc.meta.origen.slice(0, 180),
    escala: '—', fecha, numPlano: 'NBT90-00',
  });
  return sh;
}

// --- láminas de TOLERANCIAS Y ENCAJES ---------------------------------------
// Una tolerancia que no sale en el plano no existe. Estas dos láminas son las
// que hacen que el resto de láminas puedan llevar sólo la cota nominal.
function toleranciaSheets() {
  const hs = [];
  const sh = A3();
  let y = 252;
  const li = (t, size = 3.2, dx = 16) => { sh.text(t, dx, y, size, 'L'); y -= size * 1.95; };
  sh.text('TOLERANCIAS GENERALES Y CADENA DE COTAS DE LOS ENCAJES', 210, 266, 6, 'C');
  for (const k of ['chapa', 'mecanizado', 'soldadura']) {
    const N = NORMA[k];
    li(`${N.clase}   —   ${N.aplica.toUpperCase()}`, 4.4);
    li(N.titulo, 3.0, 22);
    if (N.nota) li(N.nota, 2.6, 22);
    y -= 1;
  }
  y -= 3;
  li('ISO 2768-1 · desviaciones admisibles para cotas lineales (mm)', 3.8);
  const rangos = ['0,5–3', '>3–6', '>6–30', '>30–120', '>120–400', '>400–1000'];
  const muestra = [2, 5, 20, 60, 200, 600];
  li(`   rango:      ${rangos.map((r) => r.padStart(10)).join('')}`, 2.9, 20);
  li(`   clase f:    ${muestra.map((v) => `±${tol2768(v, 'f')}`.padStart(10)).join('')}   (mecanizado)`, 2.9, 20);
  li(`   clase m:    ${muestra.map((v) => `±${tol2768(v, 'm')}`.padStart(10)).join('')}   (chapa)`, 2.9, 20);
  y -= 2;
  li('ISO 2768-2 · rectitud y planitud (mm)', 3.8);
  li(`   long.:      ${['≤10', '>10–30', '>30–100', '>100–300', '>300–1000'].map((r) => r.padStart(10)).join('')}`, 2.9, 20);
  li(`   clase H:    ${[5, 20, 60, 200, 600].map((v) => String(tolForma2768(v, 'H')).padStart(10)).join('')}`, 2.9, 20);
  li(`   clase K:    ${[5, 20, 60, 200, 600].map((v) => String(tolForma2768(v, 'K')).padStart(10)).join('')}`, 2.9, 20);
  y -= 2;
  li('ISO 13920:2023 · conjuntos SOLDADOS — clase B (longitudes) y clase F (forma)', 3.8);
  li(`   rango:      ${['2–30', '>30–120', '>120–400', '>400–1000'].map((r) => r.padStart(12)).join('')}`, 2.9, 20);
  li(`   clase B:    ${[20, 60, 200, 600].map((v) => `±${tol13920(v, 'B')}`.padStart(12)).join('')}`, 2.9, 20);
  li(`   clase F:    ${[60, 200, 600].map((v) => String(tolForma13920(v, 'F')).padStart(12)).join('')}`
    + '        (rectitud/planitud/paralelismo)', 2.9, 20);
  y -= 4;
  li('CADENA DE COTAS DE LA RANURA DE UN ENCAJE (no se elige la holgura: se calcula)', 4.4);
  for (const cal of ['12GA', '1/4']) {
    const r = ranuraPara(cal);
    li(`chapa ${cal} (e = ${r.espesor}):  ranura ${r.ancho} mm; holgura por lado `
      + `${r.holguraPorLado[0]}…${r.holguraPorLado[1]} mm`, 3.2, 20);
    li(r.cadena, 2.7, 26);
  }
  const lp = largoRanura(20, 'posicion'), lq = largoRanura(20, 'paso');
  li(`largo de ranura DE POSICIÓN (lengüeta de 20): ${lp.largo} — ${lp.cadena}`, 2.7, 20);
  li(`largo de ranura DE PASO   (lengüeta de 20): ${lq.largo} — ${lq.cadena}`, 2.7, 20);
  li('Espesor de chapa: rango de tolerancia ASTM/AISI — '
    + Object.entries(CHAPA).map(([k, c]) => `${k} ±${c.tol} (±${c.tolIn}")`).join(' · '), 2.7, 20);
  sh.frame();
  sh.titleBlock({
    designacion: 'TOLERANCIAS GENERALES Y ENCAJES', proyecto: PROY, fuente: FUENTE,
    verificacion: 'NORMA CITADA, NO INVENTADA', piezas: '—', escala: '—', fecha, numPlano: 'NBT90-TOL1',
    nota: 'La clase que aplica a cada pieza está en su propio cajetín y en la lista de materiales',
  });
  hs.push(sh);

  // --- lámina 2: ajustes ISO 286 y registro de encajes -----------------------
  const sh2 = A3();
  let y2 = 250;
  const li2 = (t, size = 2.9, dx = 14) => { sh2.text(t, dx, y2, size, 'L'); y2 -= size * 2.0; };
  sh2.text('AJUSTES ISO 286 Y REGISTRO DE ENCAJES', 210, 266, 6, 'C');
  li2('AJUSTES — dónde el ajuste manda. El criterio de rodamientos es el del repositorio: el aro que gira', 3.4);
  li2('respecto de la dirección de la carga va apretado; el que está quieto respecto de ella, con juego.', 3.4);
  y2 -= 2;
  for (const a of AJUSTES) {
    li2(`${a.id}  ${a.cota}  ${a.ajuste}   —   ${a.donde}`, 3.1);
    li2(`      criterio: ${a.criterio}`, 2.5);
    li2(`      fuente: ${a.fuente}`, 2.4);
    if (a.aviso) li2(`      AVISO: ${a.aviso}`, 2.4);
    y2 -= 0.5;
  }
  sh2.frame();
  sh2.titleBlock({
    designacion: 'AJUSTES ISO 286', proyecto: PROY, fuente: FUENTE,
    verificacion: 'CRITERIO CITADO EN CADA FILA', piezas: '—', escala: '—', fecha, numPlano: 'NBT90-TOL2',
    nota: 'Cada cota de ajuste sale además rotulada en el cajetín de su propia pieza',
  });
  hs.push(sh2);

  // --- lámina 3: encajes junta a junta --------------------------------------
  const filas = [];
  for (const p of doc.parts) {
    for (const en of (p.encajes || [])) {
      filas.push({
        id: en.id, union: en.union, tipo: en.tipo, rol: en.rol, lado: en.lado,
        gdl: (en.gdl || []).join('') || '—',
        cota: en.ranura?.ancho ? `${en.ranura.ancho}×${en.ranura.largo}`
          : en.ranura?.colisa ? `Ø${en.ranura.dia}→colisa ${en.ranura.dia}×${en.ranura.colisa}`
            : en.ranura?.dia ? `Ø${en.ranura.dia}` : '—',
        pieza: desig(p.name),
      });
    }
  }
  const vistos = new Set();
  const unicas = filas.filter((f) => {
    const k = `${f.id}|${f.lado}`;
    if (vistos.has(k)) return false; vistos.add(k); return true;
  });
  for (let i = 0; i < unicas.length; i += 40) {
    const sh3 = A3(); let y3 = 246;
    const cols = [14, 60, 168, 196, 216, 232, 264, 300];
    sh3.text('ENCAJES DE POSICIONAMIENTO DE LOS CONJUNTOS SOLDADOS', 210, 262, 5.6, 'C');
    const fila = (c, sz = 2.6) => { c.forEach((t, k) => sh3.text(String(t), cols[k], y3, sz, 'L')); y3 -= 5.4; };
    fila(['ID', 'UNIÓN', 'TIPO', 'PAPEL', 'LADO', 'G.D.L.', 'COTA DEL ENCAJE', 'PIEZA'], 3.0);
    sh3.line([12, y3 + 2.6], [408, y3 + 2.6], 'VISIBLE');
    for (const f of unicas.slice(i, i + 40)) {
      // El escritor de PDF/DXF trabaja en cp1252 y «↔» no está en esa página de
      // códigos: saldría como «?». Se sustituye sólo para el rótulo.
      fila([f.id, f.union.replace(/↔/g, '/').slice(0, 52), f.tipo, f.rol, f.lado, f.gdl, f.cota,
        f.pieza.slice(0, 34)]);
    }
    sh3.frame();
    sh3.titleBlock({
      designacion: `ENCAJES (${i + 1}–${Math.min(i + 40, unicas.length)} de ${unicas.length})`,
      proyecto: PROY, fuente: FUENTE,
      verificacion: 'CADA G.D.L. LO FIJA UN SOLO RASGO', piezas: '—', escala: '—', fecha,
      numPlano: `NBT90-ENC${i / 40 + 1}`,
      nota: 'PAPEL: posición = ranura ajustada, sitúa · paso = holgada 1 mm/lado, NO sitúa · tope = cara contra cara',
    });
    hs.push(sh3);
  }
  return hs;
}

function despieceSheets() {
  const filas = 34, hs = [];
  for (let i = 0; i < despiece.length; i += filas) {
    const sh = A3(), trozo = despiece.slice(i, i + filas);
    let y = 245;
    const cols = [16, 34, 128, 148, 196, 320];
    sh.text('LISTA DE MATERIALES', 210, 262, 6, 'C');
    const fila = (c, sz = 3.0) => {
      c.forEach((t, k) => sh.text(String(t), cols[k], y, sz, k === 0 || k === 3 ? 'L' : 'L'));
      y -= 6.4;
    };
    fila(['ITEM', 'DESIGNACIÓN', 'CANT', 'MÓDULO', 'TIPO / MATERIAL O NORMA', 'PLANO'], 3.4);
    sh.line([14, y + 3], [406, y + 3], 'VISIBLE');
    for (const d of trozo) {
      fila([d.item, d.designacion.slice(0, 52), d.cant, d.capa, `${d.tipo} · ${d.material_norma}`.slice(0, 62), d.plano]);
    }
    sh.frame();
    sh.titleBlock({
      designacion: `LISTA DE MATERIALES (${i + 1}–${Math.min(i + filas, despiece.length)} de ${despiece.length})`,
      proyecto: PROY, fuente: FUENTE, verificacion: 'DESPIECE COMPLETO',
      piezas: String(doc.parts.length), nota: 'FABRICADA = lleva plano · COMPRADA = componente de catálogo',
      escala: '—', fecha, numPlano: `NBT90-LM${i / filas + 1}`,
    });
    hs.push(sh);
  }
  return hs;
}

const todas = [portada(), ...toleranciaSheets(), ...despieceSheets(), ...hojas];
const pdf = exportSheetsPDF(todas, 'planos_fabricacion_nbt90.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));

writeFileSync(join(outDir, 'despiece.json'), JSON.stringify({
  proyecto: PROY, archivo: 'narrow_belt_transfer_90.json', fecha,
  piezas_totales: doc.parts.length, items: despiece.length,
  fabricadas: despiece.filter(d => d.tipo === 'FABRICADA').length,
  compradas: despiece.filter(d => d.tipo === 'COMPRADA').length,
  despiece,
}, null, 1));

// CSV: las comillas del texto se DUPLICAN (RFC 4180). Hasta ahora se metían tal
// cual y cualquier designación con pulgadas —«Canal lateral 6-1/2×1-1/2" 12 GA»,
// «Chapa de acero 0.105"»— partía la fila y desplazaba todas las columnas
// siguientes. Con una sola columna de texto casi no se notaba; con seis, sí.
const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
writeFileSync(join(outDir, 'despiece.csv'),
  'item,designacion,cantidad,modulo,tipo,material_o_norma,plano,tolerancia_general,ajustes,soldadura,encajes,acabado\n'
  + despiece.map(d => [d.item, q(d.designacion), d.cant, d.capa, d.tipo,
    q(d.material_norma), d.plano, q(d.tolerancia), q(d.ajustes),
    q(d.soldadura), q(d.encajes), q(d.acabado)].join(',')).join('\n') + '\n');

// --- DXF del conjunto a escala real -----------------------------------------
// PASA A SER OPCIONAL (`--dxf`). No termina nunca con el ensamble completo, y el
// motivo se ve a simple vista en `js/drawing2d.js`:
//   · `collectEdgeSegments` agrupa TODOS los triángulos del documento por normal
//     cuantizada (`planes`) y, para cada arista huérfana, llama a `isCrack`, que
//     recorre ENTERO el grupo de su normal con 3 sondas. Con 400 piezas de chapa
//     casi todas las caras caen en un puñado de normales (±X, ±Y, ±Z), así que un
//     grupo se lleva cientos de miles de triángulos y el coste es O(aristas
//     huérfanas × triángulos del grupo): cuadrático, sin índice espacial.
//   · aunque terminase, `isoShadedTris` ordena todos esos triángulos y emite un
//     polígono relleno por cada uno, o sea un DXF de cientos de MB.
// No se toca aquí: el arreglo es un índice espacial en drawing2d.js y eso es otra
// tarea. Con `--dxf` se sigue pudiendo pedir (p. ej. sobre un subconjunto).
const quiereDXF = process.argv.includes('--dxf');
if (!quiereDXF) {
  console.log('    DXF del conjunto: OMITIDO (usa --dxf). collectEdgeSegments/isCrack de '
    + 'drawing2d.js es cuadrático sobre los triángulos coplanarios y no termina con 400 piezas.');
}
if (quiereDXF) try {
  const partes = doc.parts.filter(p => !p.contexto).map(p => {
    const geometry = buildPartGeometry(p);
    const matrixWorld = partMatrix(p);
    return { geometry, matrixWorld };
  });
  const dxf = exportDrawingDXF(partes, {
    designacion: 'CONJUNTO — TRANSFERENCIA 90°', proyecto: PROY, fuente: FUENTE,
    piezas: String(partes.length), fecha, numPlano: 'NBT90-CJ',
    nota: 'vistas del primer diedro a escala real (mm)',
  });
  writeFileSync(join(outDir, dxf.name || 'conjunto_nbt90.dxf'), dxf.data ?? dxf);
} catch (err) {
  console.warn(`  ! DXF de conjunto no emitido: ${err.message}`);
}

console.log(`OK: ${todas.length} láminas → ${join(outDir, pdf.name)}`);
console.log(`    despiece: ${despiece.length} ítems (${despiece.filter(d => d.tipo === 'FABRICADA').length} fabricados, `
  + `${despiece.filter(d => d.tipo === 'COMPRADA').length} comprados) → despiece.json/.csv`);
