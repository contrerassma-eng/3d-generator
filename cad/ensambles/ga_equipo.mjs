#!/usr/bin/env node
// ga_equipo.mjs — PLANO DE CONJUNTO (GA) del equipo, generado del ensamble.
//
// Tres vistas con eliminación de líneas ocultas (js/iso3d.mjs): ELEVACIÓN
// lateral, PLANTA e ISOMÉTRICA de referencia, con globos de los conjuntos
// principales (número de ÍTEM = el del BOM/manual: una sola numeración) y
// COTAS AUTO-MEDIDAS: el valor se mide de la proyección real del modelo —
// no se transcribe — así el plano no puede mentir respecto del 3D.
//
// Uso:  DOC=ensambles/lbp530_5m.json OUTDIR=ensambles/planos_lbp530 \
//         [FECHA=…] node ensambles/ga_equipo.mjs

import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { IsoScene, drawFigure } from '../js/iso3d.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { exigirSello } from './lib_compuertas.mjs';
import { join } from 'node:path';

const docPath = process.env.DOC;
if (!docPath) throw new Error('falta DOC=<ensamble.json>');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
// sin SELLO de compuertas no se emite nada (CELULA_DISENO regla 11)
exigirSello(doc, 'ga_equipo');
const base = docPath.split('/').pop().replace(/\.json$/, '');
const outDir = process.env.OUTDIR || 'ensambles/planos_lbp530';
const fecha = process.env.FECHA || '—';
const esLBP = /5m/.test(base);
// Genérico por meta.ga (18-08): un equipo NUEVO declara sus rótulos en el
// modelo; sin meta.ga todos los defaults reproducen el LBP/GT byte a byte.
const G = doc.meta?.ga || {};
const codigo = G.codigo || (doc.meta?.nombre || '').split(' ·')[0] || (esLBP ? 'CV-LBP-5000' : 'CV-GT-800');
const gaNum = G.numPlano || (esLBP ? 'LBP530-GA-01' : 'LBP530-GA-02');
const bomPath = join(outDir, `bom_${base}.json`);
const bom = existsSync(bomPath) ? JSON.parse(readFileSync(bomPath, 'utf8')) : { filas: [] };
const dims = JSON.parse(readFileSync(process.env.DIMS || 'ensambles/lbp530_dims.json', 'utf8'));
const itemDe = (re) => bom.filas.find(f => re.test(f.item_desc))?.item ?? '';
const r0 = (v) => Math.round(v);

// UNA sola escena (la geometría CSG de 96 piezas se computa una vez) — las
// cinco proyecciones (planta, elevación, iso, A-A, B-B) reutilizan las mallas
const SC = (() => {
  const sc = new IsoScene();
  for (const p of doc.parts) {
    if (/Rodillos LBP/.test(p.name)) continue;
    sc.add(p, { simplify: /Banda Movex/.test(p.name) ? 'band' : undefined, paint: false });
  }
  return sc;
})();
const escena = () => SC;

const sh = new Sheet('A2', 594, 420, 1, 1, 1);
sh.text(`PLANO DE CONJUNTO — ${codigo}`, 297, 404, 6, 'C');
sh.text(doc.meta?.nombre || base, 297, 396, 3.2, 'C');

// ── PLANTA arriba, ELEVACIÓN al medio (layout de lámina descendente) ─────────
// hidden:true — las ARISTAS OCULTAS del motor (kind 9, segmentada fina) en
// planta y elevación: ejes y sprockets dentro de las cajas, barrenos tras la
// placa. El motor las calculaba desde siempre y nadie las pedía (Sergio
// 18-08: «líneas que no se están proyectando y ayudarían»). ISO e secciones
// quedan sin ocultas: allí serían ruido sobre el rayado y los globos.
const lat = escena().project({ dir: [0, 1, -0.0001], widthMM: 470, res: 2400, hidden: true });
const top = escena().project({ dir: [0, 0, -1], up: [0, 1, 0], widthMM: 470, res: 2400, hidden: true });
// Un equipo CORTO (GT 800) con ancho de vista fijo 470 quedaba a escala ~1:1.7
// y la elevación sola (941 de alto) desbordaba el A2 pisando iso y notas.
// Presupuesto VERTICAL compartido del par de vistas: si no cabe, ambas se
// reducen con el mismo factor (misma escala elevación↔planta, norma de
// dibujo). El LBP (5000) queda idéntico: k=1.
{
  const hPar = lat.heightMM + top.heightMM + 30;
  const k = Math.min(1, 192 / hPar);
  if (k < 1) for (const v of [lat, top]) {
    // los puntos vienen HORNEADOS en mm de lámina: escalar geometría completa
    // (segmentos, rellenos, cortes, sombra, anclas) y re-ligar toSheet
    for (const s of v.segments) { s.a = s.a.map(q => q * k); s.b = s.b.map(q => q * k); }
    for (const f of v.fills || []) f.loops = f.loops.map(lp => lp.map(([x, y]) => [x * k, y * k]));
    for (const c of v.cuts || []) c.loops = c.loops.map(lp => lp.map(([x, y]) => [x * k, y * k]));
    if (v.shadow) v.shadow.loops = v.shadow.loops.map(lp => lp.map(([x, y]) => [x * k, y * k]));
    for (const pm of v.parts || []) { pm.anchor = pm.anchor.map(q => q * k); if (pm.bbox) pm.bbox = pm.bbox.map(q => q * k); }
    const t0 = v.toSheet;
    if (t0) v.toSheet = (p) => t0(p).map(q => q * k);
    v.widthMM *= k; v.heightMM *= k;
  }
}
const oxT = (594 - top.widthMM) / 2, oyT = 388 - top.heightMM - 10;
drawFigure(sh, top, oxT, oyT, {});
// rótulo de vista FUERA del eje del corte A-A (que cae cerca del centro)
sh.text('PLANTA', oxT + top.widthMM * 0.35, oyT - 7, 3.4, 'C');

const oxL = (594 - lat.widthMM) / 2, oyL = oyT - 30 - lat.heightMM;
drawFigure(sh, lat, oxL, oyL, {});
sh.text('ELEVACIÓN', oxL + lat.widthMM * 0.35, oyL - 8, 3.4, 'C');

// escala real de la vista (mm de lámina por mm de modelo) para las cotas
// AUTO-MEDIDAS: se toma del propio encuadre de la proyección
const escLat = lat.widthMM / lat.spanU;

// cota de largo total (medida del bbox proyectado — extremos de nosebar)
const dim = (x1, x2, y, txt, d = 12) => {
  const yl = y - d;
  for (const x of [x1, x2]) sh.line([x, y - Math.sign(d) * 1], [x, yl - Math.sign(d) * 1.5], 'COTAS');
  sh.line([x1, yl], [x2, yl], 'COTAS');
  sh.solid([[x1, yl], [x1 + 2.4, yl + 0.45], [x1 + 2.4, yl - 0.45]], 'COTAS');
  sh.solid([[x2, yl], [x2 - 2.4, yl + 0.45], [x2 - 2.4, yl - 0.45]], 'COTAS');
  sh.text(txt, (x1 + x2) / 2, yl + 2, 3.2, 'C', 'COTAS');
};
const dimV = (x, y1, y2, txt, d = 12) => {
  const xl = x + d;
  for (const y of [y1, y2]) sh.line([x + Math.sign(d), y], [xl + Math.sign(d) * 1.5, y], 'COTAS');
  sh.line([xl, y1], [xl, y2], 'COTAS');
  sh.solid([[xl, y1], [xl + 0.45, y1 + 2.4], [xl - 0.45, y1 + 2.4]], 'COTAS');
  sh.solid([[xl, y2], [xl + 0.45, y2 - 2.4], [xl - 0.45, y2 - 2.4]], 'COTAS');
  sh.text(txt, xl + 2, (y1 + y2) / 2, 3.2, 'ML', 'COTAS');
};
dim(oxL, oxL + lat.widthMM, oyL - 2, `${r0(lat.spanU)} (extremo a extremo, nosebar incluido)`, 14);
dimV(oxL + lat.widthMM, oyL, oyL + lat.heightMM, `${r0(lat.spanV)} (alto total al piso)`, 10);
dimV(oxT + top.widthMM, oyT, oyT + top.heightMM, `${r0(top.spanV)} (ancho total con motorreductor)`, 10);

// ── ISOMÉTRICA de referencia + globos de conjuntos ──────────────────────────
// ISOMÉTRICA PINTADA (Sergio 18-08: «faltan diagonales de banda en retorno,
// sombras o cambios de tono»): la misma escena, con las caras encendidas y
// sombra de piso — el retorno de banda se LEE porque sus caras toman tono,
// no sólo por sus aristas. Clon barato: reusa las geometrías ya computadas.
const isoScene = (() => {
  const c = Object.create(Object.getPrototypeOf(SC));
  Object.assign(c, SC);
  c.items = SC.items.map(it => ({ ...it, opts: { ...it.opts, paint: true } }));
  return c;
})();
// tamaño acotado: la iso con globos es DUEÑA de x<205 en la banda baja; las
// notas viven a su derecha en una columna que no alcanza el cajetín (18-08:
// a 120 de alto la iso+abanico invadía la columna de ajustes y viceversa)
const iso = isoScene.project({ dir: [-1, 1, -0.62], widthMM: 150, res: 1600, shadow: true });
const kIso = Math.min(1, 95 / iso.heightMM);
for (const s of iso.segments) { s.a = s.a.map(v => v * kIso); s.b = s.b.map(v => v * kIso); }
for (const pm of iso.parts) { pm.anchor = pm.anchor.map(v => v * kIso); }
iso.widthMM *= kIso; iso.heightMM *= kIso;
const oxI = 30, oyI = 55;
drawFigure(sh, iso, oxI, oyI, {});
sh.text('ISOMÉTRICA (referencia)', oxI + iso.widthMM / 2, oyI - 7, 3, 'C');

// globos de conjuntos principales, con el ÍTEM del BOM
const grupos = G.grupos ? G.grupos.map(([re, lb]) => [new RegExp(re), lb]) : [
  [/Placa lateral/, 'bastidor'],
  [/EJE MOTRIZ/, 'accionamiento'],
  [/Banda Movex/, 'banda'],
  [/Nosebar entrada/, 'nosebar'],
  [/Soporte tipo/, 'soportes'],
  [/Guarda motriz — costado/, 'guardas'],
  [/Motorreductor/, 'motorreductor'],
];
// los SLOTS de globo se reparten por la ALTURA del ancla, no por el orden de
// la tabla: con el orden de tabla los líderes se cruzaban entre sí (Sergio
// 18-08: «que no se te crucen líneas de numeración»)
const gEntradas = [];
for (const [re] of grupos) {
  const n = itemDe(re);
  if (n === '') continue;
  const pm = iso.parts.find((q, i) => re.test(doc.parts.filter(p => !/Rodillos LBP/.test(p.name))[i]?.name || ''));
  if (!pm) continue;
  gEntradas.push({ n, anchor: pm.anchor });
}
gEntradas.sort((p, q) => q.anchor[1] - p.anchor[1]);   // ancla más alta → slot más alto
let gy = oyI + iso.heightMM - 4;
for (const e of gEntradas) {
  const at = [oxI + iso.widthMM + 16, gy];
  sh.line(at, [oxI + e.anchor[0], oyI + e.anchor[1]], 'COTAS');
  sh.circle(at, 4.4, 'VISIBLE');
  sh.text(String(e.n), at[0], at[1] - 1.2, 3.2, 'C');
  gy -= 13;
}

// ── marcas de plano de corte en PLANTA y ELEVACIÓN (A-A transversal por un
// portacarril · B-B longitudinal por el plano medio — posiciones elegidas por
// el generador y leídas de meta.secciones: no se transcriben) ────────────────
const sec = doc.meta?.secciones || {};
const marcaCorte = (letra, p1, p2, arrowDir) => {
  // línea de corte fina de trazos + tramos gruesos en las puntas + flechas de
  // sentido de observación + letra en ambos extremos
  sh.line(p1, p2, 'OCULTA');
  const ux = (p2[0] - p1[0]), uy = (p2[1] - p1[1]);
  const L2 = Math.hypot(ux, uy) || 1;
  const [dx, dy] = [ux / L2, uy / L2];
  for (const [px, py, s] of [[...p1, 1], [...p2, -1]]) {
    sh.line([px, py], [px + dx * 6 * s, py + dy * 6 * s], 'NORMA');
    const ax = px + arrowDir[0] * 4.4, ay = py + arrowDir[1] * 4.4;
    sh.line([px, py], [ax, ay], 'COTAS');
    sh.solid([[ax + arrowDir[0] * 2.2, ay + arrowDir[1] * 2.2],
      [ax - arrowDir[1] * 1.1, ay + arrowDir[0] * 1.1],
      [ax + arrowDir[1] * 1.1, ay - arrowDir[0] * 1.1]], 'COTAS');
    // letra MÁS ALLÁ de la punta de flecha (junto al eje chocaba con el
    // rótulo de vista cuando el corte cae al centro)
    sh.text(letra, px + arrowDir[0] * 8.6, py + arrowDir[1] * 8.6 - 1.2, 3.4, 'C');
  }
};
if (sec.aa_x != null) {
  // A-A: vertical en PLANTA y en ELEVACIÓN, mirando aguas abajo (+X)
  const xT = oxT + top.toSheet([sec.aa_x, 0, 0])[0];
  marcaCorte('A', [xT, oyT - 3], [xT, oyT + top.heightMM + 3], [1 * (top.toSheet([sec.aa_x + 100, 0, 0])[0] > top.toSheet([sec.aa_x, 0, 0])[0] ? 1 : -1), 0]);
  const xL = oxL + lat.toSheet([sec.aa_x, 0, 0])[0];
  marcaCorte('A', [xL, oyL - 3], [xL, oyL + lat.heightMM + 3], [1 * (lat.toSheet([sec.aa_x + 100, 0, 0])[0] > lat.toSheet([sec.aa_x, 0, 0])[0] ? 1 : -1), 0]);
}
if (sec.bb_y != null) {
  // B-B: horizontal en PLANTA, mirando hacia el lado motriz (+Y)
  const yT = oyT + top.toSheet([0, sec.bb_y, 0])[1];
  const sgn = top.toSheet([0, sec.bb_y + 100, 0])[1] > top.toSheet([0, sec.bb_y, 0])[1] ? 1 : -1;
  marcaCorte('B', [oxT - 3, yT], [oxT + top.widthMM + 3, yT], [0, sgn]);
}

// ── LÁMINA 2: SECCIONES A-A y B-B (con caras de material rayadas) ────────────
const sh2 = new Sheet('A2', 594, 420, 1, 1, 1);
sh2.text(`SECCIONES — ${codigo}`, 297, 404, 6, 'C');
sh2.text(doc.meta?.nombre || base, 297, 396, 3.2, 'C');
const rotula = (s2, fig, ox, oy, colX, filas) => {
  // rótulos con líder: texto en columna fija → ancla de la pieza en la vista.
  // Los renglones se asignan POR ALTURA DEL ANCLA (ancla más alta → renglón
  // más alto): líderes monótonos que no se cruzan (regla de Sergio, la misma
  // del abanico de globos)
  const vivos = filas.items
    .map(([re, txt]) => ({ txt, pm: fig.parts.find(p => re.test(p.name)) }))
    .filter(e => e.pm)
    .sort((a, b) => b.pm.anchor[1] - a.pm.anchor[1]);
  let ty = filas.y0;
  for (const { txt, pm } of vivos) {
    const to = [ox + pm.anchor[0], oy + pm.anchor[1]];
    s2.text(txt, colX, ty - 1.1, 2.7, filas.al || 'L');
    const x0 = filas.al === 'R' ? colX + 1.5 : colX - 1.5;
    s2.line([x0, ty], [to[0], to[1]], 'COTAS');
    s2.circle([to[0], to[1]], 0.5, 'COTAS');
    ty -= filas.paso;
  }
};

// B-B longitudinal. En equipo CORTO (GT) el lazo es casi cuadrado: a ancho
// completo el corte invadía el A-A y los rótulos — va arriba-derecha, chico
const corto = (doc.meta?.largo_nose_a_nose ?? 5000) < 2000;
const bb = escena().project({ dir: [0, 1, 0], widthMM: corto ? 240 : 470, res: 2400,
  section: { n: [0, 1, 0], d: sec.bb_y ?? 0.5 } });
const oxB = corto ? 594 - bb.widthMM - 24 : (594 - bb.widthMM) / 2;
const oyB = 384 - bb.heightMM - 14;
drawFigure(sh2, bb, oxB, oyB, {});
// rótulo ENCIMA de la figura: debajo chocaba con la columna de rótulos de A-A
sh2.text(`SECCIÓN B-B — longitudinal por el plano medio · ESC 1:${(bb.spanU / bb.widthMM).toFixed(1)}`,
  oxB + bb.widthMM / 2, oyB + bb.heightMM + 5, 3.4, 'C');

// A-A transversal (abajo izquierda) — corta el portacarril: se ve el sándwich
// bar cap → pletina → portacarril → clips y el retorno DENTRO del canal
const aa = escena().project({ dir: [1, 0, 0], widthMM: 205, res: 1900,
  section: { n: [1, 0, 0], d: sec.aa_x ?? 0 } });
const oxA = 46, oyA = 62;
drawFigure(sh2, aa, oxA, oyA, {});
sh2.text(`SECCIÓN A-A — transversal por portacarril (x=${r0(sec.aa_x ?? 0)}) · ESC 1:${(aa.spanU / aa.widthMM).toFixed(1)}`,
  oxA + aa.widthMM / 2, oyA - 8, 3.4, 'C');
rotula(sh2, aa, oxA, oyA, oxA + aa.widthMM + 74, {
  y0: oyA + aa.heightMM - 6, paso: 9.5, al: 'L', items: G.rotula ? G.rotula.map(([re, tx]) => [new RegExp(re), tx]) : [
    [/Banda Movex/, esLBP ? 'banda de carga y RETORNO EN CATENARIA (canal hondo Rev.C)' : 'banda de carga — retorno por rodillos y RODILLO DEL NOSEBAR de entrada (un solo eje, Rev.E)'],
    [/Portacarril/, 'portacarril 50×6 apernado M6 (clips en escuadra)'],
    [/Travesaño TR_S/, 'travesaño TR_S 88×88×3 — orejas apernadas 2×M6'],
    [/Columna soporte/, 'columna canal C 77×38×3 colgada del pivote (sistema 24V)'],
    [/Bracket soporte/, 'bracket B_005A (ángulo): cruciformes bajo el ala + arco de aplome'],
    [/Tira telescópica/, 'tira BR_3002 telescópica (altura por ranuras 11×20, apriete 3×M10)'],
    [/Travesaño de patas/, 'travesaño B_002A 71×38 encajado en las columnas (soldado)'],
    [/Guarda (motriz|tensor) — costado/, 'caja de accionamiento Rev.F — costados por fuera de chumaceras y puntas de eje, en espárragos de la mecha'],
    [/Guarda (motriz|tensor) — fondo/, 'fondo de caja con tapa de extremo plegada (drenaje Ø8)'],
  ],
});
const notasSec = [
  'Rayado de material = superficie CORTADA por el plano (par-impar por pieza).',
  'Lo no rayado queda DETRÁS del plano de corte (proyección completa).',
  'Posiciones A-A/B-B elegidas por el generador sobre el layout real',
  'y marcadas en la lámina 1 — no transcritas.',
];
notasSec.forEach((t, i) => sh2.text(t, 330, 106 - i * 5, 2.8, 'L'));

sh2.frame();
sh2.titleBlock({
    rev: doc.meta?.revision, revCausa: (doc.meta?.revision_causa || "").slice(0, 52),
  designacion: `SECCIONES ${codigo}`,
  proyecto: G.proyecto || 'LBP530-18 · Conveyone', fuente: G.fuente || 'gen_lbp530.mjs — capa user',
  verificacion: 'CORTES DEL MODELO 3D — no dibujados a mano', piezas: '1', piezasLabel: 'CONJUNTO',
  nota: `A-A y B-B por coordenada declarada — ver lámina 1 (${gaNum})`,
  escala: 'según vista', fecha, numPlano: gaNum + ' · 2/2', lamina: '2 / 2',
});

// ── tabla resumen + cajetín ──────────────────────────────────────────────────
const nF = bom.filas.filter(f => f.tipo === 'FABRICADA').length;
const nC = bom.filas.filter(f => f.tipo === 'COMPRADA').length;
const sold = doc.meta?.soldadura || dims.soldadura || {};
// Las notas van en UNA columna fluida a la derecha de la iso, con envoltura
// de línea y PISO explícito (hallazgo visual 18-08: el mapa de ajustes
// empujaba la soldadura DENTRO del cajetín; el arreglo en dos zonas chocó
// con el abanico de globos; el de columna angosta a 78 caracteres perdía el
// final de la soldadura contra el piso). El cajetín REAL es x≥404 · y≤52
// (TITLE_W 180 en A2): envolviendo a 128 caracteres el borde derecho queda
// en ~393 — libre del cajetín A CUALQUIER ALTURA — y los ~25 renglones
// terminan lejos del piso y=18, que queda como guarda dura contra el marco.
const envuelve = (t, max) => {
  if (t.length <= max) return [t];
  const out = []; let cur = '';
  for (const w of t.split(' ')) {
    if ((cur + ' ' + w).trim().length > max) { out.push(cur.trim()); cur = w; }
    else cur = cur + ' ' + w;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map((l, i) => (i ? '   ' + l : l));
};
const notas = [
  ...(doc.meta?.mapa_ajustes ? ['AJUSTES DEL EQUIPO (dónde absorber la obra — lo demás es DATUM):', ...doc.meta.mapa_ajustes.map(x => '· ' + x), ''] : []),
  `Despiece completo: bom_${base}.csv (${nF} fabricadas · ${nC} compradas) — los ÍTEM de los globos son los del BOM y el Manual de Partes (boletín CV-MP-${G.boletin || (esLBP ? '01' : '02')}).`,
  'Cotas medidas de la proyección del modelo paramétrico — no transcritas.',
  'Altura de faja ajustable por niveladores de soporte. Terminación: PINTADO RAL 7035.',
  ...(bom.totales ? [
    `MASA de partes FABRICADAS: ${bom.totales.masa_fabricada_kg} kg (área exacta del desarrollo × espesor; sin comprados) · SUPERFICIE A PINTAR: ${bom.totales.area_pintar_m2} m² (2 caras) · PLANCHA A PEDIR: ${bom.totales.plancha_m2} m².`,
  ] : []),
  '',
  `SOLDADURA (${sold.proceso || 'ver especificación'} · ${sold.norma || ''}):`,
  ...(sold.uniones || []).map(u => '· ' + u),
  sold.nota ? '· ' + sold.nota : '',
].filter(t => t !== null).flatMap(t => (t === '' ? [''] : envuelve(t, 128)));
// en el equipo CORTO (GT) la elevación baja hasta ~y 190 con su cota a −8:
// la columna parte BAJO la vista más baja (panel 18-08: las notas tachaban
// el rótulo ELEVACIÓN y la cota 800 en el GA del GT)
const yNotas0 = Math.min(156, oyL - 16);
notas.forEach((t, i) => { const y = yNotas0 - i * 4.2; if (y > 18) sh.text(t, 210, y, 2.6, 'L'); });

sh.frame();
sh.titleBlock({
    rev: doc.meta?.revision, revCausa: (doc.meta?.revision_causa || "").slice(0, 52),
  designacion: `CONJUNTO GENERAL ${codigo}`,
  proyecto: G.proyecto || 'LBP530-18 · Conveyone', fuente: G.fuente || 'gen_lbp530.mjs — capa user',
  verificacion: 'COTAS AUTO-MEDIDAS DEL MODELO', piezas: '1', piezasLabel: 'CONJUNTO',
  nota: G.notaBanda || `banda Movex 530 ${esLBP ? 'LBP' : 'GT (friction top)'} 18 in · paso 15 — ver bom_${base}.csv`,
  escala: 'según vista', fecha, numPlano: gaNum, lamina: '1 / 2',
});

const pdf = exportSheetsPDF([sh, sh2], `plano_conjunto_${base}.pdf`);
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK ${join(outDir, pdf.name)} — elevación ${r0(lat.spanU)}×${r0(lat.spanV)} · planta ancho ${r0(top.spanV)} · secciones A-A x=${r0(sec.aa_x ?? -1)} / B-B y=${sec.bb_y ?? '—'} (${aa.cuts.length + bb.cuts.length} piezas cortadas)`);
