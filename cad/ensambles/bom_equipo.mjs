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

import { masaFlat, superficiesFlat, exigirSello, subpiezasSoldadas } from './lib_compuertas.mjs';

const docPath = process.env.DOC;
if (!docPath) throw new Error('falta DOC=<ensamble.json>');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
// sin SELLO de compuertas no se emite nada (CELULA_DISENO regla 11)
exigirSello(doc, 'bom_equipo');
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

// M6 de pestaña: el perno es UNO por unión — se cuenta SOLO la cara de la
// placa («Paso M6 guarda inferior»); contar también la cara de la guarda
// («Paso M6») duplicaba la compra ×2 (hallazgo del panel). La compuerta
// exige que ambas caras calcen 1:1.
const nAlaPlaca = nHoles(/Paso M6 guarda inferior/);
const nAlaGuarda = nHoles(/^Paso M6$/);
gate(nAlaPlaca === nAlaGuarda,
  `pasos M6 de pestaña desalineados: placa ${nAlaPlaca} ≠ guarda ${nAlaGuarda}`);
// el faldón→mecha también es un perno por par (cara guarda «Paso M6 a mecha»
// contra roscado «M6 roscado (montaje guarda)» de la mecha)
const nFaldon = nHoles(/Paso M6 a mecha/);
const nRoscMecha = nHoles(/M6 roscado \(montaje guarda\)/);
gate(nFaldon === nRoscMecha,
  `faldón→mecha desalineado: pasos ${nFaldon} ≠ roscados ${nRoscMecha}`);

// un perno por unión: cada paso del alma calza 1:1 con el de la oreja TR_S
const nTrOreja = nHoles(/Paso M6 oreja travesaño TR/);
const nTrLado = nHoles(/Paso M6 oreja a alma/);
gate(nTrOreja === nTrLado, `orejas TR: placa ${nTrOreja} ≠ travesaño ${nTrLado}`);
const nClipPC = nHoles(/Paso M6 clip portacarril/);
const nClipPCside = nHoles(/Paso M6 clip a alma/);
gate(nClipPC === nClipPCside, `clips portacarril: placa ${nClipPC} ≠ clip ${nClipPCside}`);
const nPletCarril = nHoles(/Paso M6 a pletina carril/);
const nBrk = nHoles(/Paso M8 bracket soporte/);
const nBrkParts = cantDe(/Bracket soporte B_005A/);
gate(nBrk === 4 * nBrkParts, `bracket 24V: pasos de ala ${nBrk} ≠ 4×brackets (${nBrkParts})`);
const nMechaB = nHoles(/Paso M10 mecha$/);
const nMechaB2 = nHoles(/Paso M10 mecha a placa/);
gate(nMechaB === nMechaB2, `pernos mecha: placa ${nMechaB} ≠ mecha ${nMechaB2}`);
const nCabClip = nHoles(/Paso M6 cabezal$/);
const nCabClip2 = nHoles(/Paso M6 clip cabezal/);
gate(nCabClip === nCabClip2, `clips cabezal: placa ${nCabClip} ≠ clip ${nCabClip2}`);
// soportes 24V Rev.D (copia fiel del ZP2026): tira BR_3002 + columna canal +
// travesaño B_002A — todos los pernos DERIVADOS de los agujeros con calce 1:1
const nTira = cantDe(/Tira telescópica BR_3002/);
const nPiso = cantDe(/Columna soporte 24V/);
gate(nTira === nPiso, `soportes: tiras BR_3002 (${nTira}) ≠ columnas (${nPiso})`);
const nApriete = nHoles(/Apriete telescópico Ø11/);
gate(nApriete === 3 * nPiso, `apriete telescópico ${nApriete} ≠ 3×columnas (${nPiso})`);
// el lado COLUMNA es el autoritativo (la ranura en ARCO del bracket no es un
// agujero contable por nombre): pivote 1:1 y el perno de arco viaja por la ranura
const nPivBrk = nHoles(/Pivote de columna Ø11/);
const nPivCol = nHoles(/Pivote Ø11 \(a bracket\)/);
gate(nPivBrk === nPivCol, `pivote: bracket ${nPivBrk} ≠ columna ${nPivCol}`);
const nPivote = nPivCol + nHoles(/Aplome Ø11 \(perno del arco\)/);
const nAncla = 2 * nTira;   // 2 ranuras de anclaje 11×22 por pata B_004A (cortes de boceto, no agujeros contables)
// travesaño B_002A Rev.D: unión PESTAÑA-EN-RANURA + soldadura (sin pernos) —
// compuerta: 1 travesaño por estación = columnas/2
const nB002parts = cantDe(/Travesaño de patas B_002A/);
gate(nB002parts * 2 === nPiso, `travesaños B_002A (${nB002parts}) ≠ estaciones (columnas ${nPiso} / 2)`);

const herrajes = [
  { n: 'Perno hex M8×25 8.8 + golilla plana y presión', cant: nEjeMuerto, uso: 'fija el eje muerto de cada rodillo de retorno, por fuera de la placa (2 por rodillo; rosca interior M8×16 del eje — un perno más largo topa fondo)' },
  { n: 'Perno hex M6×16 8.8 + tuerca + golillas (orejas TR_S)', cant: nTrOreja, uso: 'orejas del travesaño TR_S → alma (2 por extremo)' },
  { n: 'Perno hex M6×16 8.8 + tuerca + golillas (clips portacarril)', cant: nClipPC, uso: 'clips del portacarril → alma (2 por lado)' },
  { n: 'Perno M6×20 avellanado (carril de apoyo)', cant: nPletCarril, uso: 'portacarril → pletina del carril ROSCADA M6 (desde abajo, 1 por carril por portacarril)' },
  { n: 'Perno hex M8×20 8.8 + tuerca + golillas (bracket soporte)', cant: nBrk, uso: 'ala del bracket B_005A → ala inferior del canal, por ranuras cruciformes (4 por bracket — regulación en 2 ejes)' },
  { n: 'Perno hex M10×30 8.8 + tuerca + golillas (mechas)', cant: nMechaB, uso: 'mecha PL8 → alma (6 por mecha — Rev.C apernada, sin soldadura)' },
  { n: 'Perno hex M6×16 8.8 + tuerca + golillas (clips cabezal)', cant: nCabClip, uso: 'clips del cabezal porta-nosebar → alma (2 por extremo)' },
  { n: 'Perno hex M10×30 8.8 + tuerca + golilla ancha (apriete telescópico)', cant: nApriete, uso: 'aprieta la tira BR_3002 contra la columna en las ranuras 11×20 que calcen (3 por pata — ajuste de ALTURA; vernier con la ranura 11×110 de la columna)' },
  { n: 'Perno de anclaje M10×90 (piso)', cant: nAncla, uso: 'pata B_004A de la tira → losa (2 por pata)' },
  { n: 'Perno pivote M10×25 + tuerca (pivote y arco de aplome)', cant: nPivote, uso: 'columna → bracket B_005A: 1 pivote + 1 perno viajando por la RANURA EN ARCO (aplome angular)' },
  { n: 'Perno hex M6×16 8.8 + golilla', cant: nAlaPlaca, uso: 'guarda inferior → ala de placas (1 por unión pestaña-ala)' },
  { n: 'Perno hex M6×12 8.8', cant: nFaldon, uso: 'faldón de guarda → roscados M6 de la mecha' },
  { n: 'Perno hex M8×30 8.8 + tuerca + golilla', cant: nNose, uso: 'nosebar → cabezal (tuerca por cara interior)' },
  { n: 'Perno hex M10×35 8.8 + tuerca + golilla plana y presión', cant: nM12, uso: 'brida UCF206 → mecha, pasante con tuerca (4 por chumacera; agujero brida y mecha Ø12 → perno M10 holgura estándar)' },
].filter(h => h.cant > 0);


// ── compras derivadas que NO son piezas del ensamble (ferretería de montaje
// y componentes insertos) — el panel encontró que se PERDIERON al pasar del
// CSV predecesor a esta cadena: chaveta, retención axial y rodamientos
const nEjeM = cantDe(/EJE MOTRIZ/);
const nMotor = cantDe(/Motorreductor/);
const nRodam = cantDe(/Rodamiento 6202-2RS/);
gate(nRodam === 2 * nRetorno, `rodamientos 6202 (${nRodam}) ≠ 2×rodillos retorno (${nRetorno})`);
const derivadas = [
  { n: 'Chaveta DIN 6885 A 8×7×90, acero C45', cant: nEjeM, origen: 'local',
    uso: 'muñón motriz → cubo del motorreductor (1 por eje motriz)' },
  { n: 'Arandela de retención Ø40×6 + tornillo M10×25 8.8 + Loctite 243', cant: nMotor, origen: 'local',
    uso: 'retención axial del motorreductor en la rosca M10×22 de punta de eje (EJ-01 nota 6)' },
  { n: 'Anillo seeger DIN 472 Ø35 (interior)', cant: 2 * nRetorno, origen: 'local',
    uso: 'retiene el 6202 en el asiento del cabezal del rodillo (LBP530-EJ-04)' },
].filter(d => d.cant > 0);
gate(derivadas.every(d => Number.isInteger(d.cant) && d.cant >= 0), 'compras derivadas inválidas');

// ── filas con número de ítem (= globo del manual) ────────────────────────────
const filas = [];
let item = 0;
const orden = (a, b) => a.part.name.localeCompare(b.part.name);
const fabricadas = [...grupos.values()].filter(g => g.part.name.startsWith('FAB')).sort(orden);
const compradas = [...grupos.values()].filter(g => !g.part.name.startsWith('FAB')).sort(orden);

// pletina del carryway: FABRICADA de corte a largo (no láser) — sin esta fila
// la superficie de deslizamiento no era fabricable desde el BOM (panel)
const guias = [...grupos.values()].filter(g => /Guía de apoyo/.test(g.part.name));
const pletinaL = guias.length
  ? Math.round(guias[0].part.features.find(f => /Pletina/.test(f.name))?.params.w || 0) : 0;
const nPletinas = guias.reduce((a, g) => a + g.cant, 0);


for (const { part: p, cant } of [...fabricadas, ...compradas]) {
  const fab = p.name.startsWith('FAB');
  const nombre = p.name.replace(/^(FAB|NORM)\s*[·.-]\s*/, '');
  // repuesto recomendado en bodega: partes de desgaste/rotación (práctica de
  // los parts manuals: fila destacada + protocolo de pedido en portada)
  const repuesto = /Sprocket|Chumacera|Nosebar|Motorreductor|Banda|Rodillo retorno/.test(p.name);
  // unidad de compra del nosebar: SEGMENTO K6 in (la pieza modelada es un set
  // de 3 por punta — comprar '1' era ambiguo: la cotización cuenta segmentos)
  const nbSet = /Nosebar .*3× K6/.test(p.name) ? 3 : 1;
  const fila = {
    item: ++item,
    repuesto,
    tipo: fab ? 'FABRICADA' : 'COMPRADA',
    item_desc: nombre + (nbSet > 1 ? ' — CANT en segmentos K6 in (unidad de compra)' : ''),
    cant_equipo: cant * nbSet,
    cant_proyecto: cant * nbSet * LINEAS,
    origen: fab ? 'maestranza / taller' : origenDe(p.name),
    referencia: fab ? '' : refDe(p.name),
    plano_corte: planoDXF[p.name] || '',
    // piezas de la familia de ejes declaran su plano en el nombre (EJ-nn)
    plano_vistas: planoFab.get(p.name) || (p.name.match(/plano (LBP530-EJ-\d+)/)?.[1] ?? ''),
    material: p.flat ? p.flat.material : '',
    desarrollo: '',
    masa_kg: fab ? masaEspecial(p.name) : '',
  };
  if (p.flat) {
    const xs = p.flat.contorno.map(q => q[0]), ys = p.flat.contorno.map(q => q[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    fila.desarrollo = `${r1(w)}×${r1(h)}`;
    // masa EXACTA del área desarrollada (no del bbox) y superficie a pintar
    // (2 caras) — la maestranza cotiza por kg y la pintura RAL 7035 por m²
    // derivaciones COMPARTIDAS (lib_compuertas): la lámina, el BOM y el GA
    // no pueden divergir porque leen la misma función
    const sup = superficiesFlat(p.flat);
    fila.masa_kg = masaFlat(p.flat);
    fila.area_m2_pintar = sup.pintar_m2;
    fila.bbox_m2_plancha = sup.plancha_m2;
  }
  filas.push(fila);
  // tras la última FABRICADA del grupo alfabético, insertar la pletina
  if (p === fabricadas[fabricadas.length - 1]?.part && nPletinas) {
    filas.push({
      item: ++item, repuesto: false, tipo: 'FABRICADA',
      item_desc: `Pletina 12×30 × ${pletinaL} — guía de apoyo de canto (corte a largo, sin láser)`,
      cant_equipo: nPletinas, cant_proyecto: nPletinas * LINEAS,
      origen: 'maestranza / taller', referencia: '',
      plano_corte: '', plano_vistas: '',
      material: 'Barra laminada S235/A36 12×30 — SOLDAR a travesaños según especificación de soldadura del GA',
      desarrollo: `12×30×${pletinaL}`,
      masa_kg: r1(12 * 30 * pletinaL * 7.85e-6),
    });
  }

}


for (const d of derivadas) {
  filas.push({
    item: ++item, repuesto: /Rodamiento/.test(d.n), tipo: 'COMPRADA', item_desc: d.n,
    cant_equipo: d.cant, cant_proyecto: d.cant * LINEAS, origen: d.origen, referencia: '',
    plano_corte: '', plano_vistas: '', material: d.uso, desarrollo: '', masa_kg: '',
  });
}
for (const h of herrajes) {
  filas.push({
    item: ++item, tipo: 'TORNILLERÍA', item_desc: h.n, cant_equipo: h.cant,
    cant_proyecto: h.cant * LINEAS, origen: 'local', referencia: '',
    plano_corte: '', plano_vistas: '', material: h.uso, desarrollo: '', masa_kg: '',
  });
}

// Se numeran AL FINAL a propósito: insertarlas antes correría los ítems de
// compras y tornillería, y un ítem ya entregado no puede cambiar de
// significado entre revisiones (regla «nada se sobrescribe»).
// ── PIEZAS MENORES SOLDADAS (clips, orejas): viven como feature dentro de otra
// pieza, no aparecen en su desarrollo y no tenían plano propio — el taller no
// sabía que existían (compuerta flat-vs-solido, 13-08). Se listan como filas
// propias con su cuerpo y sus barrenos; la designación del perfil sale de la
// especificación de soldadura del equipo.
{
  const sold = (dims.soldadura?.uniones || []).join(' · ');
  for (const sp of subpiezasSoldadas(doc.parts)) {
    // el perfil se busca en la LÍNEA de soldadura que nombra el destino real
    // (cabezal / portacarril / travesaño), no en la primera que calce: un
    // regex flojo le puso al clip del cabezal el perfil del portacarril
    const destino = (sp.madre.match(/Portacarril|Cabezal|Travesaño|Placa lateral/i) || [''])[0].toLowerCase();
    const linea = (dims.soldadura?.uniones || []).find(u => destino && u.toLowerCase().includes(destino)) || '';
    const m = linea.match(/(\d+×\d+×\d+)/);
    const bar = Object.entries(sp.barrenos_por_unidad).map(([d, n]) => n + '×' + d).join(' ') || 'sin barrenos';
    filas.push({
      item: ++item, tipo: 'FABRICADA',
      item_desc: sp.nombre + ' — pieza menor SOLDADA (' + sp.dims.join('×') + ') · ' + bar,
      cant_equipo: sp.n, cant_proyecto: sp.n * LINEAS,
      origen: 'maestranza / taller', referencia: '',
      plano_corte: '', plano_vistas: 'ficha de soldadura (GA)',
      material: m ? 'Perfil ' + m[1] + ' — corte a largo + barrenos' : 'perfil según ficha de soldadura del GA — corte a largo + barrenos',
      desarrollo: sp.dims.join('×'), masa_kg: '', area_m2_pintar: '', bbox_m2_plancha: '',
    });
  }
}
// ── salida por equipo ────────────────────────────────────────────────────────
const COLS = ['item', 'tipo', 'item_desc', 'cant_equipo', 'cant_proyecto', 'origen',
  'referencia', 'plano_corte', 'plano_vistas', 'material', 'desarrollo', 'masa_kg',
  'area_m2_pintar', 'bbox_m2_plancha'];
const esc = (v) => /,|"/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
writeFileSync(join(outDir, `bom_${base}.csv`),
  [COLS.join(','), ...filas.map(f => COLS.map(c => esc(f[c])).join(','))].join('\n') + '\n');
// ── totales DERIVADOS del equipo: masa de transporte y superficie a pintar
// (la maestranza cotiza el acero por kg y la pintura RAL 7035 por m²)
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const totales = filas.reduce((a, f) => {
  const n = f.cant_equipo || 0;
  a.masa_fabricada_kg += num(f.masa_kg) * n;
  a.area_pintar_m2 += num(f.area_m2_pintar) * n;
  a.plancha_m2 += num(f.bbox_m2_plancha) * n;
  return a;
}, { masa_fabricada_kg: 0, area_pintar_m2: 0, plancha_m2: 0 });
for (const k of Object.keys(totales)) totales[k] = Math.round(totales[k] * 100) / 100;
totales.nota = 'masa y área EXACTAS del desarrollo (contorno − barrenos); plancha_m2 = bbox consumido del formato, para pedir material';

writeFileSync(join(outDir, `bom_${base}.json`), JSON.stringify({
  equipo: titulo, lineas: LINEAS, generado_de: docPath, totales, filas,
}, null, 1));

const nF = filas.filter(f => f.tipo === 'FABRICADA').length;
const nC = filas.filter(f => f.tipo === 'COMPRADA').length;
const sinPlano = filas.filter(f => f.tipo === 'FABRICADA' && !f.plano_corte && !f.plano_vistas)
  .map(f => f.item_desc);
console.log(`OK bom_${base}: ${filas.length} ítems (${nF} fabricadas · ${nC} compradas · ${herrajes.length} tornillería) ×${LINEAS} líneas · ${totales.masa_fabricada_kg} kg fabricados · ${totales.area_pintar_m2} m² a pintar`);
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
  // materia prima de proyecto declarada en dims (las barras de los ejes no
  // llegaban a ningún CSV de compras — hallazgo del panel)
  const barras = dims.ejes?.barras;
  if (barras) {
    cons.push(['COMPRADA', esc(`${barras.espec} — corte según LBP530-EJ-03`),
      `${barras.comprar} (+1 respaldo)`, esc('acero · local'), '', '', esc('materia prima proyecto — ' + (barras.nota || ''))].join(','));
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
