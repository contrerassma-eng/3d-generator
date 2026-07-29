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

for (const g of lista) {
  itemN++;
  const comprada = !!(g.part.hardware || g.part.componente);
  const contexto = !!g.part.contexto;
  const fabricada = !comprada && !contexto;
  const material = comprada ? (g.part.norma || g.part.componente || 'componente de catálogo')
      : materialDe(g.desig, g.part.chapa);
  let plano = '';
  if (fabricada) {
    planoN++;
    plano = `NBT90-${String(planoN).padStart(2, '0')}`;
    const meta = {
      designacion: g.desig, piezas: String(g.cant), proyecto: PROY, fuente: FUENTE,
      numPlano: plano, fecha, nota: `${g.capa} · Material: ${material} · tol. gral. ISO 2768-mK`,
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

const todas = [portada(), ...despieceSheets(), ...hojas];
const pdf = exportSheetsPDF(todas, 'planos_fabricacion_nbt90.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));

writeFileSync(join(outDir, 'despiece.json'), JSON.stringify({
  proyecto: PROY, archivo: 'narrow_belt_transfer_90.json', fecha,
  piezas_totales: doc.parts.length, items: despiece.length,
  fabricadas: despiece.filter(d => d.tipo === 'FABRICADA').length,
  compradas: despiece.filter(d => d.tipo === 'COMPRADA').length,
  despiece,
}, null, 1));

writeFileSync(join(outDir, 'despiece.csv'),
  'item,designacion,cantidad,modulo,tipo,material_o_norma,plano\n'
  + despiece.map(d => [d.item, `"${d.designacion}"`, d.cant, d.capa, d.tipo,
    `"${d.material_norma}"`, d.plano].join(',')).join('\n') + '\n');

// --- DXF del conjunto a escala real -----------------------------------------
try {
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
