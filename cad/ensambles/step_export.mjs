#!/usr/bin/env node
// step_export.mjs — STEP AP203 por pieza y del conjunto (orden de Sergio
// 19-08: «importante plano STEP y nomenclatura por familias y jerarquizada»).
//
// Por qué STEP: el DXF es el contrato del láser (2D) y el GLB es para ver;
// el proveedor externo —maestranza, tornería, cotizador— abre STEP en
// cualquier CAD sin pedirnos nada. Sin STEP, cada cotización empieza con un
// correo pidiendo el 3D.
//
// Geometría: FACETED_BREP (malla del modelo → caras planas). Es geometría
// EXACTA de nuestro modelo teselado, no una aproximación nueva; para las
// piezas VENDOR se exporta el original tal cual (misma regla 22).
//
// Nombre de archivo = nomenclatura de los tres niveles:
//   <TIPO>-<FAMILIA>-<ÍTEM>.step   p. ej. CV-LBP18-F30-059.step
//
// Uso: DOC=ensambles/lbp530_5m.json TIPO=CV-LBP18 OUTDIR=… [SOLO=item] \
//      node ensambles/step_export.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { partGeometry } from '../js/iso3d.mjs';
import { geometriasDelDoc } from './lib_glb.mjs';
import { exigirSello } from './lib_compuertas.mjs';

const docPath = process.env.DOC; if (!docPath) throw new Error('falta DOC=');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
exigirSello(doc, 'step_export');
const TIPO = process.env.TIPO || 'CV-XXX';
const outDir = process.env.OUTDIR || 'ensambles/step';
mkdirSync(outDir, { recursive: true });
const base = docPath.split('/').pop().replace(/\.json$/, '');

// familias: MISMA tabla que tools/avance_equipos.py (si divergen, el código
// del STEP mentiría respecto del tablero)
const FAMILIAS = [
  ['F10', /EJE MOTRIZ|Sprocket|Motorreductor|TAMBOR MOTRIZ|Cabezal MOTRIZ|Chumacera|UCF|Mecha porta|Collarín/],
  ['F20', /EJE TENSOR|TAMBOR TENSOR|Cabezal de COLA|tensor|Tensor/],
  ['F30', /Placa lateral|Travesaño|Portacarril|Perfil|Cuerpo M-HASTE|LARGUERO|Cabezal porta/],
  ['F40', /Banda|Guía|Pletina|BAR CAP|Cama|nosebar|Nosebar|Rodillo|Grip Top/],
  ['F50', /Guarda|guarda|Ojal ciego/],
  ['F60', /Columna|Tira telescópica|Pata |Bracket|Soporte|pie |Pie /],
  ['F70', /Perno|Tuerca|Golilla|Chaveta|Clip|Oreja|Espárrago|Separador|Seeger|Rodamiento/],
];
const famDe = (n) => (FAMILIAS.find(([, rx]) => rx.test(n)) || ['F90'])[0];

// ítems del registro persistente (numeración única vigente)
const regDir = process.env.REGISTRO_DIR || '';
const itemDe = new Map();
if (regDir) for (const f of ['items_' + base + '.json']) {
  const p = join(regDir, f);
  if (existsSync(p)) for (const [d, n] of Object.entries(JSON.parse(readFileSync(p, 'utf8')).items)) itemDe.set(d, n);
}
const limpio = (n) => n.replace(/^(FAB|NORM|VIS|VENDOR)\s*·\s*/, '');
// el registro guarda la descripción tal como la escribe bom_equipo (que sólo
// quita FAB/NORM): se busca por las dos formas antes de rendirse
const itemBuscar = (n) => itemDe.get(limpio(n)) ?? itemDe.get(n.replace(/^(FAB|NORM)\s*·\s*/, ''));

// ── escritor STEP AP203 (faceted_brep) ──────────────────────────────────────
// ── escritor STEP AP203 con FUSIÓN DE CARAS COPLANARES ──────────────────────
// Un ADVANCED_FACE por TRIÁNGULO daba archivos de decenas de MB (846 MB el
// LBP entero): ilegible para el proveedor e inútil para cotizar. Nuestras
// piezas son prismáticas — los miles de triángulos de una cara son UNA cara.
// Se agrupan por plano, se extraen los lazos de borde (aristas que aparecen
// una sola vez) y cada lazo sale como polígono; el lazo mayor es el contorno
// y los demás son agujeros (FACE_BOUND). La geometría no cambia: se deja de
// trocear lo que ya era plano.
function stepDe(geom, nombre, autor = 'ConveyOne SpA') {
  const pos = geom.attributes.position;
  const idx = geom.index ? geom.index.array : null;
  const nT = (idx ? idx.length : pos.count) / 3;
  const vId = (i, k) => (idx ? idx[i * 3 + k] : i * 3 + k);
  const V = (j) => [pos.getX(j), pos.getY(j), pos.getZ(j)];
  const kv = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)},${p[2].toFixed(3)}`;

  // 1) agrupar triángulos por PLANO (normal cuantizada + distancia al origen)
  const planos = new Map();
  for (let t = 0; t < nT; t++) {
    const a = V(vId(t, 0)), b = V(vId(t, 1)), c = V(vId(t, 2));
    const u = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], w = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
    let n = [u[1]*w[2]-u[2]*w[1], u[2]*w[0]-u[0]*w[2], u[0]*w[1]-u[1]*w[0]];
    const m = Math.hypot(...n);
    if (m < 1e-9) continue;
    n = n.map(q => q / m);
    const d = n[0]*a[0] + n[1]*a[1] + n[2]*a[2];
    const k = `${n.map(q => q.toFixed(3)).join(',')}|${d.toFixed(2)}`;
    let g = planos.get(k);
    if (!g) planos.set(k, g = { n, d, tris: [] });
    g.tris.push([a, b, c]);
  }

  // 2) por plano: aristas de borde (las que aparecen UNA vez) → lazos
  const caras = [];
  for (const g of planos.values()) {
    const cuenta = new Map();
    for (const [a, b, c] of g.tris) {
      for (const [x, y] of [[a, b], [b, c], [c, a]]) {
        const ka = kv(x), kb2 = kv(y);
        const k = ka < kb2 ? ka + '>' + kb2 : kb2 + '>' + ka;
        const e = cuenta.get(k);
        if (e) e.n++; else cuenta.set(k, { n: 1, a: x, b: y });
      }
    }
    const bordes = [...cuenta.values()].filter(e => e.n === 1);
    if (!bordes.length) continue;
    const desde = new Map();
    for (const e of bordes) {
      const k = kv(e.a);
      (desde.get(k) || desde.set(k, []).get(k)).push(e);
    }
    const usada = new Set();
    const lazos = [];
    for (const e0 of bordes) {
      if (usada.has(e0)) continue;
      const lazo = [e0.a]; let cur = e0; usada.add(e0);
      for (let paso = 0; paso < 100000; paso++) {
        const sig = (desde.get(kv(cur.b)) || []).find(e => !usada.has(e));
        if (!sig) break;
        usada.add(sig); lazo.push(sig.a); cur = sig;
        if (kv(cur.b) === kv(e0.a)) break;
      }
      if (lazo.length >= 3) lazos.push(lazo);
    }
    if (!lazos.length) continue;
    // área proyectada para distinguir contorno de agujeros
    const ejeMax = g.n.map(Math.abs).indexOf(Math.max(...g.n.map(Math.abs)));
    const uv = (p) => ejeMax === 0 ? [p[1], p[2]] : ejeMax === 1 ? [p[0], p[2]] : [p[0], p[1]];
    const area = (lz) => { let s2 = 0; for (let i = 0; i < lz.length; i++) {
      const [x1, y1] = uv(lz[i]), [x2, y2] = uv(lz[(i + 1) % lz.length]); s2 += x1 * y2 - x2 * y1; } return Math.abs(s2) / 2; };
    lazos.sort((x, y) => area(y) - area(x));
    caras.push({ n: g.n, lazos, ref: lazos[0][0] });
  }

  // 3) emitir
  const L = []; let id = 0;
  const N = () => '#' + (++id);
  const P = new Map();
  const punto = (p) => { const k = kv(p); let r = P.get(k);
    if (!r) { r = N(); L.push(`${r}=CARTESIAN_POINT('',(${p.map(q => q.toFixed(4)).join(',')}));`); P.set(k, r); } return r; };
  const VX = new Map();
  const vert = (p) => { const q = punto(p); let v = VX.get(q); if (!v) { v = N(); L.push(`${v}=VERTEX_POINT('',${q});`); VX.set(q, v); } return v; };
  const EG = new Map();
  const arista = (a, b) => { const ka = kv(a), kb2 = kv(b); const k = ka < kb2 ? ka + '>' + kb2 : kb2 + '>' + ka;
    let e = EG.get(k); if (!e) { e = N(); L.push(`${e}=EDGE_CURVE('',${vert(a)},${vert(b)},*,.T.);`); EG.set(k, e); } return e; };
  const superficies = [];
  for (const c of caras) {
    const lims = c.lazos.map((lz, i) => {
      const or = lz.map((p, k) => { const e = arista(p, lz[(k + 1) % lz.length]); const o = N();
        L.push(`${o}=ORIENTED_EDGE('',*,*,${e},.T.);`); return o; });
      const lazo = N(); L.push(`${lazo}=EDGE_LOOP('',(${or.join(',')}));`);
      const lim = N(); L.push(`${lim}=${i === 0 ? 'FACE_OUTER_BOUND' : 'FACE_BOUND'}('',${lazo},.T.);`);
      return lim;
    });
    const a0 = c.lazos[0][0], a1 = c.lazos[0][1];
    let u = [a1[0]-a0[0], a1[1]-a0[1], a1[2]-a0[2]];
    const lu = Math.hypot(...u) || 1; u = u.map(q => q / lu);
    const dn = N(); L.push(`${dn}=DIRECTION('',(${c.n.map(q => q.toFixed(6)).join(',')}));`);
    const du = N(); L.push(`${du}=DIRECTION('',(${u.map(q => q.toFixed(6)).join(',')}));`);
    const ax = N(); L.push(`${ax}=AXIS2_PLACEMENT_3D('',${punto(c.ref)},${dn},${du});`);
    const pl = N(); L.push(`${pl}=PLANE('',${ax});`);
    const fa = N(); L.push(`${fa}=ADVANCED_FACE('',(${lims.join(',')}),${pl},.T.);`);
    superficies.push(fa);
  }
  const shell = N(); L.push(`${shell}=CLOSED_SHELL('',(${superficies.join(',')}));`);
  const brep = N(); L.push(`${brep}=MANIFOLD_SOLID_BREP('${nombre}',${shell});`);
  const dz = N(); L.push(`${dz}=DIRECTION('',(0.,0.,1.));`);
  const dx = N(); L.push(`${dx}=DIRECTION('',(1.,0.,0.));`);
  const ax0 = N(); L.push(`${ax0}=AXIS2_PLACEMENT_3D('',${punto([0, 0, 0])},${dz},${dx});`);
  const uMM = N(); L.push(`${uMM}=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );`);
  const uRAD = N(); L.push(`${uRAD}=( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.) );`);
  const uSR = N(); L.push(`${uSR}=( NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT() );`);
  const inc = N(); L.push(`${inc}=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.01),${uMM},'distance_accuracy_value','');`);
  const ctx = N(); L.push(`${ctx}=( GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${inc})) GLOBAL_UNIT_ASSIGNED_CONTEXT((${uMM},${uRAD},${uSR})) REPRESENTATION_CONTEXT('','3D') );`);
  const rep = N(); L.push(`${rep}=ADVANCED_BREP_SHAPE_REPRESENTATION('${nombre}',(${ax0},${brep}),${ctx});`);
  return ['ISO-10303-21;', 'HEADER;', `FILE_DESCRIPTION(('${nombre}'),'2;1');`,
    `FILE_NAME('${nombre}','2026-08-19T00:00:00',('${autor}'),('${autor}'),'ConveyOne CAD','step_export.mjs','');`,
    "FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));", 'ENDSEC;', 'DATA;'].concat(L, 'ENDSEC;', 'END-ISO-10303-21;', '').join('\n');
}

const GEOM = await geometriasDelDoc(doc);
let n = 0, saltadas = 0;
const vendor = [], comprados = [], sinItem = [];
const indice = [];
for (const p of doc.parts) {
  // PIEZAS VENDOR: su STEP lo entrega el fabricante (regla 22 — no
  // redistribuimos su original teselado; 13 MB por pieza y no es nuestro)
  if (p.glb) { vendor.push(limpio(p.name)); continue; }
  // COMPRADOS (NORM ·): el STEP lo entrega el proveedor con su artículo —
  // ni lo dibujamos ni lo redistribuimos (los rodillos de la banda Movex
  // pesaban 19 MB de facetas que no son nuestras)
  if (/^NORM\s*·/.test(p.name)) { comprados.push(limpio(p.name)); continue; }
  const nom = limpio(p.name);
  const fam = famDe(p.name);
  const item = itemBuscar(p.name);
  // SIN ÍTEM = SIN STEP (23-08). El código del STEP es TIPO·FAMILIA·ÍTEM y el
  // ítem sale del registro persistente; una pieza que no está en el registro no
  // es un artículo — emitir `XXX` fabricaba un código que no identifica nada y
  // que viaja SOLO al proveedor (el STEP es el único artefacto que sale sin el
  // resto del paquete). Se reporta como anomalía, igual que F90 vacío.
  // Lo destapó `CV-LBP18-F40-XXX` = «Goma Grip Top», que ni siquiera es pieza:
  // viene vulcanizada en la banda Movex — el mismo fantasma que ya había cazado
  // el refutador de COMPRAS y que seguía teniendo archivo propio de 3D.
  if (!item) { sinItem.push(limpio(p.name)); continue; }
  const cod = `${TIPO}-${fam}-${String(item).padStart(3, '0')}`;
  if (indice.some(i => i.codigo === cod)) continue;             // un artículo, un STEP
  try {
    let g = GEOM.get(p.id);
    if (!g) {
      const off = p.pos || [0, 0, 0];
      g = partGeometry(p, {}).clone().translate(off[0], off[1], off[2]);
    }
    const txt = stepDe(g, cod + ' — ' + nom.slice(0, 60));
    // COMPUERTA step-integro: un STEP con referencias colgando no abre en el
    // CAD del proveedor — y el defecto sólo se descubre al otro lado
    const ids = new Set((txt.match(/^#\d+=/gm) || []).map(x => x.slice(0, -1)));
    const colgando = [...new Set(txt.match(/#\d+/g) || [])].filter(r => !ids.has(r));
    if (colgando.length) throw new Error(`STEP con ${colgando.length} referencias colgando`);
    writeFileSync(join(outDir, cod + '.step'), txt);
    indice.push({ codigo: cod, familia: fam, item: item ?? null, pieza: nom, kb: Math.round(txt.length / 1024) });
    n++;
  } catch (e) { saltadas++; }
}
writeFileSync(join(outDir, `_indice_step_${base}.json`), JSON.stringify({ tipo: TIPO, doc: base, piezas: indice,
  sin_step_propio: {
    nota: 'STEP a cargo de quien fabrica la pieza: originales M-HASTE y artículos comprados (Movex, chumaceras, sprockets) los entrega su proveedor con el artículo',
    vendor, comprados, sin_item: sinItem } }, null, 1));
console.log(`OK ${n} STEP AP203 en ${outDir}${saltadas ? ` · ${saltadas} sin geometría` : ''}${vendor.length ? ` · ${vendor.length} vendor` : ''}${comprados.length ? ` · ${comprados.length} comprados (STEP del proveedor)` : ''} — nomenclatura ${TIPO}-Fnn-ítem`);
if (sinItem.length) console.log(`  AVISO — ${sinItem.length} pieza(s) SIN ítem en el registro, no se emitió STEP: ${sinItem.join(' · ')}`);
