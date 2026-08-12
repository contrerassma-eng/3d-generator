#!/usr/bin/env node
// bom_equipo.mjs — BOM de COMPRA y FABRICACIÓN desde el ensamble.
//
// Recorre el JSON del ensamble (piezas FAB·/NORM· con sus features y bloques
// flat) y emite el BOM del equipo separando lo que se compra de lo que se
// fabrica, con la TORNILLERÍA DERIVADA CONTANDO LOS AGUJEROS REALES del
// modelo — la cantidad no se estima: sale de la misma geometría que produce
// los planos, así que no pueden divergir. Cada relación agujero↔perno tiene
// una COMPUERTA de consistencia que rompe la generación si deja de cumplirse.
//
// El ítem N de este BOM es EL número de globo del manual de partes y del GA:
// una sola numeración para todo el proyecto (BOM ↔ manual ↔ planos).
//
//   <OUTDIR>/bom_<doc>.csv / .json     BOM del equipo (ítem por fila)
//   <OUTDIR>/bom_proyecto.csv          consolidado ×LINEAS (tras el último doc)
//   <OUTDIR>/compra_movex.csv          artículos Movex: necesario vs cotizado
//
// Números de plano: se leen de los ARTEFACTOS ya emitidos, nunca se recalculan
//   dxf_<doc>/_planos.json             nombre de pieza → plano de corte LBD/GTD
//   _despiece_<doc>.json               nombre de pieza → lámina de vistas LB/GT
//                                      (o plano externo LBP530-EJ-nn de ejes)
//
// Uso:  DOC=ensambles/lbp530_5m.json OUTDIR=ensambles/planos_lbp530 \
//         [DIMS=ensambles/lbp530_dims.json] [LINEAS=4] node ensambles/bom_equipo.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const docPath = process.env.DOC;
if (!docPath) throw new Error('falta DOC=<ensamble.json>');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
const base = docPath.split('/').pop().replace(/\.json$/, '');
const outDir = process.env.OUTDIR || 'ensambles/planos_lbp530';
const dimsPath = process.env.DIMS || 'ensambles/lbp530_dims.json';
const dims = existsSync(dimsPath) ? JSON.parse(readFileSync(dimsPath, 'utf8')) : {};
const LINEAS = Number(process.env.LINEAS || dims.lineas || 1);
const titulo = doc.meta?.nombre || base;
const r1 = (v) => Math.round(v * 10) / 10;

// ── planos ya emitidos ───────────────────────────────────────────────────────
const planoDXF = (() => {                       // nombre → LBD/GTD-nn (corte láser)
  const p = join(outDir, `dxf_${base}`, '_planos.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
})();
const planoFab = new Map();                     // nombre → LB/GT-nn o LBP530-EJ-nn
const despPath = join(outDir, `_despiece_${base}.json`);
if (existsSync(despPath)) {
  for (const it of JSON.parse(readFileSync(despPath, 'utf8')).despiece || []) {
    if (it.plano && it.plano !== '—') for (const nm of it.nombres || []) planoFab.set(nm, it.plano);
  }
} else console.warn(`AVISO: falta ${despPath} — correr planos_fab antes del BOM deja plano_vistas vacío`);

// ── clasificación de compradas: origen y referencia ──────────────────────────
function origenDe(name) {
  if (/Rodillos LBP/.test(name)) return 'Movex — integrados en la banda 530 LBP (no se piden aparte)';
  if (/P\d{5,}|Movex|nosebar|BAR CAP|conical|Banda .*530|Sprocket/i.test(name)) return 'Movex · Italia (importado)';
  if (/NMRV|Motovario|motorreductor/i.test(name)) return 'Motovario (distribuidor local)';
  if (/UCF|rodamiento|6202/i.test(name)) return 'rodamientos · local';
  return 'local';
}
function refDe(name) {
  const m = name.match(/P\d{5,}[A-Z]*(?:-\d+)?/);
  if (m) return m[0];
  // el sprocket loco es el MISMO artículo montado suelto: necesario 60 de la
  // cotización = (5 motriz + 2 loco)×4 LBP + (6 + 2)×4 GT — cuadra exacto
  if (/Sprocket Z32 loco/.test(name)) return dims.belt?.sprocket?.art?.match(/P\d+\w*/)?.[0] || '';
  if (/Banda Movex 530 LBP/.test(name)) return dims.compraMovex?.banda_530LBP_18in?.art || '';
  if (/Banda Movex 530 GT/.test(name)) return dims.compraMovex?.banda_530GT_18in?.art || '';
  return '';
}

// ── masa de ejes desde dims.ejes.tramos (acero 7.85e-6 kg/mm³) ───────────────
function masaEje(tr) {
  if (!tr?.tramos) return '';
  const v = tr.tramos.reduce((a, t) => a + (t.dia ? Math.PI * (t.dia / 2) ** 2 : t.lado ** 2) * t.largo, 0);
  return r1(v * 7.85e-6);
}
const masaEspecial = (name) =>
  /EJE MOTRIZ/.test(name) ? masaEje(dims.ejes?.motriz) :
  /EJE TENSOR/.test(name) ? masaEje(dims.ejes?.tensor) : '';

// ── agrupar piezas idénticas ─────────────────────────────────────────────────
const grupos = new Map();
for (const p of doc.parts) {
  const g = grupos.get(p.name);
  if (g) { g.cant++; continue; }
  grupos.set(p.name, { part: p, cant: 1 });
}
const cantDe = (re) => [...grupos.values()].filter(g => re.test(g.part.name))
  .reduce((a, g) => a + g.cant, 0);

// ── tornillería derivada de los agujeros del modelo, con compuertas ──────────
const nHoles = (re) => doc.parts.reduce((a, p) =>
  a + p.features.filter(f => f.shape === 'hole' && re.test(f.name)).length, 0);
const gate = (cond, msg) => { if (!cond) throw new Error(`COMPUERTA BOM: ${msg}`); };

const nM12 = nHoles(/Perno chumacera Ø12/);          // viven SOLO en las mechas
const nUCF = cantDe(/Chumacera UCF206/);
gate(nM12 === 4 * nUCF, `pernos chumacera ${nM12} ≠ 4×UCF206 (${nUCF})`);

const nEjeMuerto = nHoles(/Paso perno M8 eje muerto/);
const nRetorno = cantDe(/Rodillo retorno/);
gate(nEjeMuerto === 2 * nRetorno, `pasos eje muerto ${nEjeMuerto} ≠ 2×rodillos retorno (${nRetorno})`);

const nNose = nHoles(/Paso M8 nosebar/);             // grilla en el cabezal
const nCabezal = cantDe(/Cabezal porta-nosebar/);
gate(nCabezal === 0 || nNose === 18 * nCabezal,
  `pasos nosebar ${nNose} ≠ 18×cabezales (${nCabezal}) — grilla 3 segmentos × 6 (Movex brochure p.8)`);

const herrajes = [
  { n: 'Perno hex M8×25 8.8 + golilla plana y presión', cant: nEjeMuerto, uso: 'fija el eje muerto de cada rodillo de retorno, por fuera de la placa (2 por rodillo; rosca interior M8×16 del eje — un perno más largo topa fondo)' },
  { n: 'Perno hex M6×16 8.8 + golilla', cant: nHoles(/Paso M6$|Paso M6 guarda/), uso: 'guarda inferior → ala de placas (pestañas)' },
  { n: 'Perno hex M6×12 8.8', cant: nHoles(/Paso M6 a mecha/), uso: 'faldón de guarda → roscados M6 de la mecha' },
  { n: 'Perno hex M8×30 8.8 + tuerca + golilla', cant: nNose, uso: 'nosebar → cabezal (tuerca por cara interior)' },
  { n: 'Perno hex M10×35 8.8 + tuerca + golilla plana y presión', cant: nM12, uso: 'brida UCF206 → mecha, pasante con tuerca (4 por chumacera; agujero brida y mecha Ø12 → perno M10 holgura estándar)' },
].filter(h => h.cant > 0);

// ── filas con número de ítem (= globo del manual) ────────────────────────────
const filas = [];
let item = 0;
const orden = (a, b) => a.part.name.localeCompare(b.part.name);
const fabricadas = [...grupos.values()].filter(g => g.part.name.startsWith('FAB')).sort(orden);
const compradas = [...grupos.values()].filter(g => !g.part.name.startsWith('FAB')).sort(orden);

for (const { part: p, cant } of [...fabricadas, ...compradas]) {
  const fab = p.name.startsWith('FAB');
  const nombre = p.name.replace(/^(FAB|NORM)\s*[·.-]\s*/, '');
  // repuesto recomendado en bodega: partes de desgaste/rotación (práctica de
  // los parts manuals: fila destacada + protocolo de pedido en portada)
  const repuesto = /Sprocket|Chumacera|Nosebar|Motorreductor|Banda|Rodillo retorno/.test(p.name);
  const fila = {
    item: ++item,
    repuesto,
    tipo: fab ? 'FABRICADA' : 'COMPRADA',
    item_desc: nombre,
    cant_equipo: cant,
    cant_proyecto: cant * LINEAS,
    origen: fab ? 'maestranza / taller' : origenDe(p.name),
    referencia: fab ? '' : refDe(p.name),
    plano_corte: planoDXF[p.name] || '',
    plano_vistas: planoFab.get(p.name) || '',
    material: p.flat ? p.flat.material : '',
    desarrollo: '',
    masa_aprox_kg: fab ? masaEspecial(p.name) : '',
  };
  if (p.flat) {
    const xs = p.flat.contorno.map(q => q[0]), ys = p.flat.contorno.map(q => q[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    fila.desarrollo = `${r1(w)}×${r1(h)}`;
    fila.masa_aprox_kg = r1(w * h * p.flat.t * 7.85e-6);   // bbox del desarrollo: cota superior
  }
  filas.push(fila);
}
for (const h of herrajes) {
  filas.push({
    item: ++item, tipo: 'TORNILLERÍA', item_desc: h.n, cant_equipo: h.cant,
    cant_proyecto: h.cant * LINEAS, origen: 'local', referencia: '',
    plano_corte: '', plano_vistas: '', material: h.uso, desarrollo: '', masa_aprox_kg: '',
  });
}

// ── salida por equipo ────────────────────────────────────────────────────────
const COLS = ['item', 'tipo', 'item_desc', 'cant_equipo', 'cant_proyecto', 'origen',
  'referencia', 'plano_corte', 'plano_vistas', 'material', 'desarrollo', 'masa_aprox_kg'];
const esc = (v) => /,|"/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
writeFileSync(join(outDir, `bom_${base}.csv`),
  [COLS.join(','), ...filas.map(f => COLS.map(c => esc(f[c])).join(','))].join('\n') + '\n');
writeFileSync(join(outDir, `bom_${base}.json`), JSON.stringify({
  equipo: titulo, lineas: LINEAS, generado_de: docPath, filas,
}, null, 1));

const nF = filas.filter(f => f.tipo === 'FABRICADA').length;
const nC = filas.filter(f => f.tipo === 'COMPRADA').length;
const sinPlano = filas.filter(f => f.tipo === 'FABRICADA' && !f.plano_corte && !f.plano_vistas)
  .map(f => f.item_desc);
console.log(`OK bom_${base}: ${filas.length} ítems (${nF} fabricadas · ${nC} compradas · ${herrajes.length} tornillería) ×${LINEAS} líneas`);
if (sinPlano.length) console.warn(`  AVISO — fabricadas SIN plano: ${sinPlano.join(' · ')}`);

// ── consolidado del proyecto + compra Movex (al correr el último equipo) ─────
const equipos = ['lbp530_5m', 'lbp530_gt08'];
if (base === equipos[equipos.length - 1] &&
    equipos.every(e => existsSync(join(outDir, `bom_${e}.json`)))) {
  const acumulado = new Map();
  for (const e of equipos) {
    const b = JSON.parse(readFileSync(join(outDir, `bom_${e}.json`), 'utf8'));
    for (const f of b.filas) {
      const k = `${f.tipo}|${f.item_desc}`;
      const a = acumulado.get(k);
      if (a) { a.cant_proyecto += f.cant_proyecto; a.equipos.push(e); }
      else acumulado.set(k, { ...f, equipos: [e] });
    }
  }
  const cons = [['tipo', 'item_desc', 'cant_proyecto', 'origen', 'referencia', 'planos', 'equipos'].join(',')];
  for (const f of [...acumulado.values()].sort((a, b) => (a.tipo + a.item_desc).localeCompare(b.tipo + b.item_desc))) {
    cons.push([f.tipo, esc(f.item_desc), f.cant_proyecto, esc(f.origen), f.referencia,
      esc([f.plano_corte, f.plano_vistas].filter(Boolean).join(' / ')), esc(f.equipos.join('+'))].join(','));
  }
  writeFileSync(join(outDir, 'bom_proyecto.csv'), cons.join('\n') + '\n');

  // artículos Movex: lo declarado en dims (necesario) vs la cotización, con
  // qué filas del BOM tocan cada artículo — la vista de COMPRA del proyecto
  const compra = dims.compraMovex || {};
  const enBom = (art) => [...acumulado.values()]
    .filter(f => f.referencia === art)
    .map(f => `${f.item_desc.slice(0, 40)}… ×${f.cant_proyecto}`).join(' | ');
  const cm = [['clave', 'articulo', 'detalle', 'necesario', 'cotizado', 'estado', 'precio_EUR', 'en_bom'].join(',')];
  for (const [k, c] of Object.entries(compra)) {
    const nec = c.necesario ?? c.necesario_m ?? '';
    const cot = c.cotizado ?? c.cotizado_m ?? '';
    const estado = nec === '' ? 'sin necesario declarado'
      : (Number(nec) <= Number(cot) ? 'cubierto por cotización' : `FALTAN ${Number(nec) - Number(cot)}`);
    cm.push([k, c.art, esc(c.detalle || c.nota || ''), nec, cot, esc(estado),
      c.precioEUR ?? c.precioEUR_m ?? '', esc(enBom(c.art))].join(','));
  }
  writeFileSync(join(outDir, 'compra_movex.csv'), cm.join('\n') + '\n');
  console.log(`OK bom_proyecto.csv (${acumulado.size} ítems ×${LINEAS} líneas) + compra_movex.csv (${Object.keys(compra).length} artículos cruzados)`);
}
