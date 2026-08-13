#!/usr/bin/env node
// manual_partes.mjs — MANUAL DE PARTES del equipo, estilo fabricante
// (referencias: parts manuals de Pacline y catálogos Hytrol — ver
// conveyone-simulator/docs/lbp/criterios/manual-partes.md).
//
// Genera un PDF por equipo con:
//   · portada + identificación + cómo pedir repuestos
//   · seguridad (bloqueo/consignación, puntos de atrapamiento)
//   · vista general isométrica con dimensiones principales
//   · FIGURAS DE DESPIECE por subconjunto (isométricas vectoriales con
//     eliminación de líneas ocultas — js/iso3d.mjs) con GLOBOS cuyo número
//     ES el ítem del BOM (bom_<doc>.json: una sola numeración en el proyecto)
//   · tabla de partes por figura + tabla de tornillería
//   · instrucciones de montaje por etapas con torques y verificaciones
//   · índice de planos (corte LBD/GTD · vistas LB/GT · familia EJ)
//
// Uso:  DOC=ensambles/lbp530_5m.json OUTDIR=ensambles/planos_lbp530 \
//         [FECHA=2026-08-12] node ensambles/manual_partes.mjs

import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { IsoScene, layoutBalloons, drawFigure } from '../js/iso3d.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const docPath = process.env.DOC;
if (!docPath) throw new Error('falta DOC=<ensamble.json>');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
const base = docPath.split('/').pop().replace(/\.json$/, '');
const outDir = process.env.OUTDIR || 'ensambles/planos_lbp530';
const fecha = process.env.FECHA || '—';
const dims = JSON.parse(readFileSync(process.env.DIMS || 'ensambles/lbp530_dims.json', 'utf8'));
const bomPath = join(outDir, `bom_${base}.json`);
if (!existsSync(bomPath)) throw new Error(`falta ${bomPath} — correr bom_equipo.mjs primero`);
const bom = JSON.parse(readFileSync(bomPath, 'utf8'));
const esLBP = /5m/.test(base);
const codigo = esLBP ? 'CV-LBP-5000' : 'CV-GT-800';
const titulo = doc.meta?.nombre || base;

// ── BOM: nombre de pieza → ítem (globo) ──────────────────────────────────────
const stripPref = (n) => n.replace(/^(FAB|NORM)\s*[·.-]\s*/, '');
const itemDe = new Map();
for (const f of bom.filas) itemDe.set(f.item_desc, f);
const filaDePieza = (p) => itemDe.get(stripPref(p.name));

// ── definición de FIGURAS (subconjuntos reales de montaje) ───────────────────
// sel: regex sobre p.name · explode(p): vector [x,y,z] por PIEZA · dir: vista
// skipRe: piezas del conjunto que NO se dibujan (con nota "no ilustrado")
const W = dims.D.innerW;                     // 470 — ancho interior entre placas
const FIGURAS = [
  {
    id: 'A', nombre: 'BASTIDOR APERNADO — ESTRUCTURA 24V',
    sel: /Placa lateral|Travesaño TR_S|Portacarril|Cabezal porta-nosebar/,
    // la placa CERCANA se abre hacia el frente: sin eso el bastidor se ve
    // edge-on y las placas parecen rieles, no placas
    explode: (p) => /Placa lateral libre/.test(p.name) ? [0, -420, 0]
      : /Travesaño/.test(p.name) ? [0, 0, -220]
      : /Portacarril/.test(p.name) ? [0, 0, 170]
      : /Cabezal/.test(p.name) ? [p.pos[0] > 100 ? 320 : -320, 0, 0]
      : [0, 0, 0],
    dir: [-1, 1, -0.5],
    orienta: 'EXTREMO MOTRIZ = descarga (derecha)',
    torn: /orejas del travesaño|clips del portacarril|pletina del carril|clips del cabezal/,
    nota: 'Estructura APERNADA (Rev.C): travesaños TR_S por orejas 2×M6 por extremo; portacarriles por clips 2×M6 por lado + M6×20 avellanado a la pletina del carril; cabezales por clips 2×M6. Soldadura SOLO dentro de la pieza pequeña (oreja/clip a su cuerpo, en taller). Soportes a piso: Figura H.',
  },
  {
    id: 'B', nombre: 'RETORNO — RODILLOS DE EJE MUERTO',
    sel: /Placa lateral|Rodillo retorno|Rodamiento 6202/,
    explode: (p) => /Rodillo|Rodamiento/.test(p.name) ? [0, 0, -260] : [0, 0, 0],
    dimStr: true,
    torn: /fija el eje muerto/,
    nota: 'El eje muerto apoya cara a cara contra las placas; perno M8×25 por fuera (ítem según tabla). Sub-despiece del rodillo y sus rodamientos: Figura B1. Fabricación: plano LBP530-EJ-04.',
  },
  {
    id: 'B1', nombre: 'RODILLO DE RETORNO — SUB-DESPIECE',
    sel: /Rodillo retorno|Rodamiento 6202/,
    cerca: /Rodillo retorno/, radio: 240,
    explode: (p) => /Rodamiento/.test(p.name) ? [0, Math.sign(p.pos[1] || 1) * 170, 0] : [0, 0, 0],
    dir: [-1, 0.8, -0.5],
    torn: /fija el eje muerto/,
    nota: 'Asiento del rodamiento en cabezal torneado Ø35 H7 con RANURA SEEGER DIN 472-35 y CHAFLÁN de montaje 2×45° (cotas en LBP530-EJ-04). Rodamiento 6202-2RS SELLADO: no engrasar, sustituir como unidad — extraer seeger, prensar por pista EXTERIOR guiado por el chaflán. Eje muerto Ø15 roscado M8 en ambos extremos.',
  },
  {
    id: 'C', nombre: 'ACCIONAMIENTO — EJE MOTRIZ',
    sel: /EJE MOTRIZ|Sprocket P|Collarín|Mecha porta-chumacera|Chumacera|Motorreductor/,
    // recorte POSICIONAL al extremo motriz: las chumaceras/mechas del tensor
    // comparten nombre — se filtra por cercanía en X al eje motriz real
    cerca: /EJE MOTRIZ/, radio: 620,
    explode: (p) => {
      const s = Math.sign(p.pos[1] || 1);
      if (/Sprocket/.test(p.name)) return [0, p.pos[1] * 0.85, 0];
      if (/Collarín/.test(p.name)) return [0, p.pos[1] * 1.9, 0];
      if (/Mecha/.test(p.name)) return [0, s * 190, 0];
      if (/Chumacera/.test(p.name)) return [0, s * 330, 0];
      if (/Motorreductor/.test(p.name)) return [0, s * 520, 0];
      return [0, 0, 0];
    },
    dir: [-1, 0.55, -0.42],
    torn: /mecha PL8|brida UCF206/,
    nota: 'Sólo el sprocket CENTRAL se fija (grano M8 + collarines); el resto FLOTA (juego axial +0,4/+0,3). El sprocket se ilustra con sus 32 DIENTES reales (PD 153,4). Mecha APERNADA al alma 6×M10 (Rev.C — sin soldadura). Eje: plano LBP530-EJ-01.',
  },
  ...(esLBP ? [{
    id: 'D', nombre: 'TENSOR — EJE LOCO',
    sel: /EJE TENSOR|Sprocket Z32 loco|Mecha porta-chumacera|Chumacera/,
    cerca: /EJE TENSOR/, radio: 620,
    explode: (p) => {
      const s = Math.sign(p.pos[1] || 1);
      if (/Sprocket/.test(p.name)) return [0, p.pos[1] * 0.85, 0];
      if (/Mecha/.test(p.name)) return [0, s * 190, 0];
      if (/Chumacera/.test(p.name)) return [0, s * 330, 0];
      return [0, 0, 0];
    },
    dir: [1, 0.55, -0.42],
    torn: /mecha PL8|brida UCF206/,
    nota: 'El eje tensor es FIJO (chumaceras apernadas a la mecha): la banda modular NO se tensa — el largo lo absorbe la catenaria tras la motriz (flecha ~130 mm, rango Movex 50-150). Para acortar banda por desgaste: retirar pasador y quitar eslabones. Sprockets locos; el de referencia va flanqueado por collarines. Mecha apernada 6×M10 (Rev.C). Eje: plano LBP530-EJ-02.',
  }] : []),
  {
    id: 'E', nombre: 'NOSEBAR Y TRANSFERENCIA',
    sel: /Cabezal porta-nosebar|Nosebar/,
    explode: (p) => /Nosebar/.test(p.name) ? [Math.sign(p.pos[0] - 100) * 200, 0, 120] : [0, 0, 0],
    dir: [-1, 1, -0.55],
    torn: /nosebar → cabezal/,
    nota: esLBP
      ? 'Nosebar P22868 montado por cara IDLER (rodillos libres = acumulación). 3 segmentos K6 in por punta; tuercas M8 por cara interior del cabezal.'
      : 'Transfer plate P22862 c/rodamientos (h19): transferencia de punta estándar — el concepto IDLER/acumulación aplica SOLO al nosebar LBP (catálogo imperial p.227). 3 segmentos K6 in por punta; tuercas M8 por cara interior del cabezal. Rev.E: el rodillo del nosebar de ENTRADA además DEVUELVE la banda (el GT es de un solo eje) — verificar giro libre antes de tender la banda.',
  },
  {
    id: 'F', nombre: 'GUARDAS INFERIORES',
    sel: /Guarda inferior|Placa lateral|Mecha porta-chumacera/,
    explode: (p) => /Guarda/.test(p.name) ? [0, 0, -300] : [0, 0, 0],
    torn: /guarda inferior → ala|faldón de guarda/,
    nota: 'Artesa U desmontable: pestañas → ala de placas (M6×16) y faldón → roscados de la mecha (M6×12). Retirar para tensado y limpieza.',
  },
  {
    id: 'G', nombre: 'CARRYWAY — BANDA Y GUÍAS',
    sel: /Banda Movex|Guía de apoyo|Guía lateral|Placa lateral|Portacarril/,
    explode: (p) => /Guía lateral/.test(p.name) ? [0, Math.sign(p.pos[1]) * 140, 60]
      : /Guía de apoyo/.test(p.name) ? [0, 0, 90]
      : /Portacarril/.test(p.name) ? [0, 0, -130] : [0, 0, 0],
    simplify: (p) => /Banda/.test(p.name) ? 'band' : undefined,
    torn: /pletina del carril/,
    nota: 'Guía de apoyo: pletina 12 de canto + BAR CAP UHMW (luces ≤50 mm — Movex/Intralox) apoyada sobre PORTACARRILES 50×6 apernados (Rev.C). Guía lateral: conical rail L 1¼ in sobre escuadras. Banda: no tensar sobre el nosebar.',
  },
  {
    id: 'H', nombre: 'SOPORTES A PISO — SISTEMA 24V',
    sel: /Placa lateral|Bracket soporte|Columna soporte|Tira telescópica|Travesaño de patas/,
    explode: (p) => /Bracket/.test(p.name) ? [0, Math.sign(p.pos[1] || 1) * 290, 0]
      : /Columna/.test(p.name) ? [0, Math.sign(p.pos[1] || 1) * 290, -210]
      : /Tira telescópica/.test(p.name) ? [0, Math.sign(p.pos[1] || 1) * 290, -430]
      : /Travesaño de patas/.test(p.name) ? [0, 0, -560]
      : [0, 0, 0],
    dir: [-1, 1, -0.42],
    torn: /bracket B_005A|apriete|pivote|travesaño B_002A|pata B_004A/,
    nota: 'COPIA del soporte 24V (medido lazo a lazo de ZP2026_MDR.glb, ancho ajustado): bracket B_005A = ÁNGULO — su ala horizontal con 4 cruciformes M8 aperna POR DEBAJO del ala del canal y su placa vertical (pivote + ranura en ARCO R52 + 2 bloqueos a ±60°) continúa el plano del alma; COLUMNA canal 77×38×3 colgada del pivote POR DENTRO de la placa; TIRA BR_3002 84×38×3 con 10 ranuras 11×20 desliza POR FUERA de la columna (altura: apriete 3×M10, vernier con la ranura 11×110) y lleva SOLDADA la pata B_004A anclada M10×90; TRAVESAÑO B_002A 71×38 se ENCAJA dentro de ambas columnas (pestaña-en-ranura + soldadura de taller).',
  },
];

// ── helpers de composición ───────────────────────────────────────────────────
const A3 = () => new Sheet('A3', 420, 297, 1, 1, 1);
const sheets = [];
// escala TODO el contenido de una figura (segmentos + rellenos + anclas):
// escalar solo los segmentos dejaba los rellenos gigantes (bug visto en el
// manual del GT, equipo corto y alto)
function escala(fig, k) {
  if (k >= 1) return;
  for (const s of fig.segments) { s.a = s.a.map(v => v * k); s.b = s.b.map(v => v * k); }
  for (const f of fig.fills || []) f.loops = f.loops.map(lp => lp.map(([x, y]) => [x * k, y * k]));
  for (const c of fig.cuts || []) c.loops = c.loops.map(lp => lp.map(([x, y]) => [x * k, y * k]));
  if (fig.shadow) fig.shadow.loops = fig.shadow.loops.map(lp => lp.map(([x, y]) => [x * k, y * k]));
  for (const pm of fig.parts || []) { pm.anchor = pm.anchor.map(v => v * k); pm.bbox = pm.bbox.map(v => v * k); }
  fig.widthMM *= k; fig.heightMM *= k;
}
const wrap = (s, n) => {
  const out = []; let line = '';
  for (const w of String(s).split(/\s+/)) {
    if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out;
};
function cabecera(sh, tituloPag, sub) {
  sh.text('CONVEYONE SpA', 22, 285, 4.2, 'L');
  sh.text(`MANUAL DE PARTES — ${codigo}`, 398, 285, 3.4, 'R');
  sh.line([22, 281.5], [398, 281.5], 'NORMA');
  sh.text(tituloPag, 22, 274, 5.2, 'L');
  if (sub) sh.text(sub, 22, 268, 3.0, 'L');
}
function pie(sh, nPag) {
  sh.line([22, 16], [398, 16], 'FINA');
  sh.text(titulo, 22, 11.5, 2.4, 'L');
  sh.text(`Boletín CV-MP-${esLBP ? '01' : '02'} · Rev. A · vigente desde ${fecha}`, 210, 11.5, 2.4, 'C');
  sh.text(`Página ${nPag}`, 398, 11.5, 2.4, 'R');
}
const marco = (sh) => sh.rect(18, 8, 384, 281, 'NORMA');

// ── 1 · PORTADA ──────────────────────────────────────────────────────────────
{
  const sh = A3();
  marco(sh);
  sh.text('CONVEYONE SpA', 210, 252, 7, 'C');
  sh.text('Transportadores para packing de fruta — Chile', 210, 244, 3.2, 'C');
  sh.line([120, 236], [300, 236], 'NORMA');
  sh.text('MANUAL DE PARTES Y MONTAJE', 210, 214, 8.5, 'C');
  sh.text(codigo, 210, 200, 12, 'C');
  sh.text(titulo, 210, 188, 4.2, 'C');
  const filaId = [
    ['Proyecto', dims.proyecto + ' — 4 líneas'],
    ['Banda', `${dims.belt.serie} ${esLBP ? 'LBP' : 'GT (friction top)'} 18 in — paso 15 mm`],
    ['Largo nose a nose', `${doc.meta.largo_nose_a_nose} mm`],
    ['Lazo de banda', `${(doc.meta.largo_banda_lazo_mm / 1000).toFixed(2)} m`],
    ['Accionamiento', 'NMRV-P 075 1/30 · 0,55 kW · 46 rpm · eje hueco Ø30'],
    ['Terminación', 'PINTADO RAL 7035 (partes fabricadas)'],
    ['Documento', `Boletín CV-MP-${esLBP ? '01' : '02'} · Rev. A · vigente desde ${fecha} (reemplaza: —)`],
  ];
  let y = 166;
  for (const [k, v] of filaId) {
    sh.text(k, 120, y, 3.0, 'L'); sh.text(String(v), 190, y, 3.0, 'L');
    sh.line([118, y - 2.2], [302, y - 2.2], 'FINA');
    y -= 7.6;
  }
  y -= 4;
  sh.text('CÓMO PEDIR REPUESTOS', 120, y, 3.4, 'L'); y -= 6;
  for (const t of [
    'Indique: (1) código del equipo y proyecto, (2) número de ÍTEM de este manual y cantidad,',
    '(3) para partes Movex, el artículo P-… de la columna REF. Las partes fabricadas se piden',
    'por su número de plano (LBD/GTD = corte láser · LB/GT = lámina de vistas · LBP530-EJ = ejes).',
    'Los ítems marcados ® son repuesto recomendado en bodega.',
  ]) { sh.text(t, 120, y, 2.6, 'L'); y -= 4.6; }
  sh.text('IMPORTANTE — NO DESTRUIR: este manual es parte del equipo.', 120, y - 2, 2.8, 'L');
  pie(sh, 1);
  sheets.push(sh);
}

// ── 2 · SEGURIDAD ────────────────────────────────────────────────────────────
{
  const sh = A3();
  marco(sh); cabecera(sh, 'SEGURIDAD'); pie(sh, 2);
  let y = 256;
  const blq = (t, lineas) => {
    sh.text(t, 26, y, 3.6, 'L'); y -= 6.5;
    for (const l of lineas) { sh.text('· ' + l, 30, y, 2.9, 'L'); y -= 5.4; }
    y -= 4;
  };
  blq('ANTES DE INTERVENIR EL EQUIPO', [
    'Bloqueo y consignación (LOTO): corte y candadeo de la alimentación del motorreductor.',
    'Verificar detención total de la banda antes de retirar guardas.',
    'Las guardas inferiores (Figura F) protegen el accionamiento: reponerlas SIEMPRE tras intervenir.',
  ]);
  blq('PUNTOS DE ATRAPAMIENTO', [
    'Entrada de banda a sprockets (extremo motriz, bajo el equipo).',
    'Nosebar en ambas puntas: rodillos de transferencia.',
    'Catenaria de retorno: masa de banda colgante tras la motriz.',
  ]);
  blq('OPERACIÓN', [
    'Velocidad de diseño 22,2 m/min (46 rpm × PD 153,4 del sprocket Z-32). No exceder sin revisar la memoria.',
    `Carga admisible de banda: ${esLBP ? '24 000' : '26 000'} N/m según Movex — límite de diseño 50 %.`,
    'Producto: cajas/bandejas de fruta. La acumulación con banda LBP es de BAJA presión.',
  ]);
  blq('MANTENCIÓN PERIÓDICA', [
    'Semanal: inspección visual de banda (rodillos LBP giran libres), flecha de catenaria ~130 mm.',
    'Mensual: reapriete de pernos de chumaceras y soportes; estado del BAR CAP y guías.',
    'Rodamientos UCF206: engrase según fabricante; 6202-2RS del retorno son sellados (sin engrase).',
  ]);
  sheets.push(sh);
}

// ── 3 · VISTA GENERAL ────────────────────────────────────────────────────────
{
  const sh = A3();
  marco(sh); cabecera(sh, 'VISTA GENERAL', titulo);
  const sc = new IsoScene();
  for (const p of doc.parts) {
    if (/Rodillos LBP/.test(p.name)) continue;
    const simplify = /Banda/.test(p.name) ? 'band' : undefined;
    sc.add(p, { simplify });
  }
  const t0 = Date.now();
  // sombra de piso: la vista general es la lámina «render» del boletín
  let fig = sc.project({ dir: [-1, 1, -0.62], widthMM: 330, res: 2200, shadow: true });
  escala(fig, Math.min(1, 205 / fig.heightMM));
  const ox = (420 - fig.widthMM) / 2, oy = 46;
  drawFigure(sh, fig, ox, oy, {});
  console.log(`  vista general: ${fig.segments.length} segs · ${Date.now() - t0} ms`);
  // dimensiones principales
  const L = doc.meta.largo_nose_a_nose;
  // «ancho total» era el del BASTIDOR — el total real (con motorreductor) lo
  // mide el GA de la proyección; aquí se rotula cada número por su nombre
  sh.text(`Largo nose a nose: ${L} mm · Ancho de bastidor ~${Math.round(W + 2 * dims.D.plT + 2 * 8)} mm (total con motorreductor: cota del GA) · Faja superior a nivel de placas`, 210, 36, 3.0, 'C');
  sh.text('Banda y rodillos LBP no ilustrados en detalle (ver Figura G). Escala gráfica — no medir sobre la figura.', 210, 30, 2.6, 'C');
  pie(sh, 3);
  sheets.push(sh);
}

// ── 4+ · FIGURAS DE DESPIECE ─────────────────────────────────────────────────
let nPag = 3;
const indiceFig = [];
for (const F of FIGURAS) {
  let refX = null;
  if (F.cerca) {
    const ref = doc.parts.find(p => F.cerca.test(p.name));
    refX = ref ? ref.pos[0] : null;
  }
  const partes = doc.parts.filter(p => F.sel.test(p.name)
    && (!F.filtro || F.filtro(p))
    && (refX === null || Math.abs(p.pos[0] - refX) <= F.radio));
  if (!partes.length) continue;
  const enFig = partes.filter(p => filaDePieza(p));
  if (!enFig.length) continue;
  nPag++;
  const sh = A3();
  marco(sh); cabecera(sh, `FIGURA ${F.id} — ${F.nombre}`); pie(sh, nPag);
  indiceFig.push([F.id, F.nombre, nPag]);

  const t0 = Date.now();
  const sc = new IsoScene();
  const enEscena = [];
  for (const p of partes) {
    const opts = {
      explode: F.explode ? F.explode(p) : [0, 0, 0],
      simplify: F.simplify ? F.simplify(p) : undefined,
    };
    sc.add(p, opts);
    enEscena.push(p);
  }
  let fig = sc.project({ dir: F.dir || [-1, 1, -0.62], widthMM: 250, res: 1900 });
  escala(fig, Math.min(1, 195 / fig.heightMM));
  const ox = 32, oy = 250 - fig.heightMM - (fig.heightMM < 120 ? 40 : 0);

  // globos: 1 por ÍTEM distinto (la pieza más cercana al borde de la figura)
  const porItem = new Map();
  fig.parts.forEach((pm, i) => {
    const fila = filaDePieza(enEscena[i]);
    if (!fila) return;
    const d = Math.min(pm.anchor[0], fig.widthMM - pm.anchor[0]);
    const cur = porItem.get(fila.item);
    if (!cur || d < cur.d) porItem.set(fila.item, { n: fila.item, anchor: pm.anchor, d });
  });
  const balloons = layoutBalloons([...porItem.values()], fig.widthMM, fig.heightMM, { margin: 12 });
  // los globos jamás invaden la tabla de partes (columna derecha)
  for (const b of balloons) b.at[0] = Math.min(b.at[0], 292 - ox);
  drawFigure(sh, fig, ox, oy, { balloons });
  console.log(`  figura ${F.id}: ${enEscena.length} piezas · ${fig.segments.length} segs · ${Date.now() - t0} ms`);

  // orientación para el armador: qué extremo mira y hacia dónde avanza la faja
  if (F.orienta) {
    sh.text(F.orienta, 34, 42, 2.8, 'L');
    sh.line([34, 38.6], [58, 38.6], 'COTAS');
    sh.solid([[58, 38.6], [54.5, 39.6], [54.5, 37.6]], 'COTAS');
    sh.text('sentido de avance', 61, 37.6, 2.2, 'L');
  }

  // tabla de partes de la figura (columna derecha)
  const filas = [...porItem.keys()].sort((a, b) => a - b).map(n => bom.filas.find(f => f.item === n));
  const tx = 300, tw = 96;
  let y = 258;
  sh.text('ÍTEM', tx, y, 2.6, 'L');
  sh.text('DESCRIPCIÓN', tx + 12, y, 2.6, 'L');
  sh.text('CANT', tx + tw - 18, y, 2.6, 'L');
  sh.line([tx - 2, y - 2], [tx + tw, y - 2], 'NORMA');
  y -= 6;
  for (const f of filas) {
    const desc = wrap((f.repuesto ? '® ' : '') + f.item_desc, 46).slice(0, 3);
    const ref = [f.referencia && `REF ${f.referencia}`, (f.plano_corte || f.plano_vistas) && `plano ${[f.plano_corte, f.plano_vistas].filter(Boolean).join('/')}`]
      .filter(Boolean).join(' · ');
    sh.text(String(f.item), tx + 3, y, 2.8, 'C');
    desc.forEach((l, i) => sh.text(l, tx + 12, y - i * 3.6, 2.4, 'L'));
    sh.text(String(f.cant_equipo), tx + tw - 14, y, 2.8, 'C');
    let dy = desc.length * 3.6;
    if (ref) { sh.text(ref, tx + 12, y - dy, 2.1, 'L'); dy += 3.4; }
    y -= dy + 2.6;
    sh.line([tx - 2, y + 1.4], [tx + tw, y + 1.4], 'FINA');
    if (y < 46) break;
  }
  // la tornillería DE ESTA FIGURA, al pie de la tabla (el armador no hojea)
  const tornFig = bom.filas.filter(f => f.tipo === 'TORNILLERÍA' && F.torn && F.torn.test(f.material + ' ' + f.item_desc));
  if (tornFig.length) {
    y -= 2;
    sh.text('FIJACIÓN:', tx, y, 2.4, 'L'); y -= 4;
    for (const f of tornFig) {
      sh.text(`ítem ${f.item} — ${f.item_desc.replace(/ \+.*$/, '')} ×${f.cant_equipo}`, tx + 2, y, 2.2, 'L');
      y -= 3.8;
    }
  }
  if (F.nota) {
    const nl = wrap('NOTA: ' + F.nota, 150);
    nl.forEach((l, i) => sh.text(l, 32, 30 - i * 4, 2.6, 'L'));
  }
  sheets.push(sh);
}

// ── TORNILLERÍA ──────────────────────────────────────────────────────────────
{
  nPag++;
  const sh = A3();
  marco(sh); cabecera(sh, 'TORNILLERÍA Y PARES DE APRIETE'); pie(sh, nPag);
  indiceFig.push(['T', 'TORNILLERÍA', nPag]);
  const tor = bom.filas.filter(f => f.tipo === 'TORNILLERÍA');
  let y = 252;
  sh.text('ÍTEM', 26, y, 2.8, 'L'); sh.text('DESCRIPCIÓN', 44, y, 2.8, 'L');
  sh.text('CANT/EQUIPO', 210, y, 2.8, 'L'); sh.text('USO', 245, y, 2.8, 'L');
  sh.line([24, y - 2.4], [396, y - 2.4], 'NORMA'); y -= 8;
  for (const f of tor) {
    sh.text(String(f.item), 28, y, 2.9, 'C');
    sh.text(f.item_desc, 44, y, 2.7, 'L');
    sh.text(String(f.cant_equipo), 222, y, 2.9, 'C');
    const uso = wrap(f.material, 62).slice(0, 2);
    uso.forEach((l, i) => sh.text(l, 245, y - i * 3.8, 2.4, 'L'));
    y -= Math.max(7, uso.length * 3.8 + 3);
    sh.line([24, y + 2], [396, y + 2], 'FINA');
  }
  y -= 8;
  sh.text('PARES DE APRIETE (pernos 8.8, rosca seca)', 26, y, 3.2, 'L'); y -= 7;
  for (const [m, t] of [['M6', '10 Nm'], ['M8', '25 Nm'], ['M10', '49 Nm'], ['grano M8 sprocket', '12 Nm + Loctite 243'], ['prisioneros UCF206', 'según fabricante de la chumacera']]) {
    sh.text(`${m}: ${t}`, 30, y, 2.9, 'L'); y -= 5.4;
  }
  sheets.push(sh);
}

// ── MONTAJE ──────────────────────────────────────────────────────────────────
{
  nPag++;
  const sh = A3();
  marco(sh); cabecera(sh, 'INSTRUCCIONES DE MONTAJE', 'Secuencia con referencias a las figuras'); pie(sh, nPag);
  indiceFig.push(['M', 'MONTAJE', nPag]);
  const pasos = [
    ['1 · BASTIDOR APERNADO (Fig. A) — Rev.C: soldadura SOLO en taller, en piezas pequeñas', [
      'Presentar placas laterales sobre mesa plana manteniendo diagonales iguales (tol. ±2 mm).',
      'Apernar travesaños TR_S (orejas 2×M6 por extremo, 10 Nm) y portacarriles (clips 2×M6 +',
      'M6×20 avellanado a la pletina del carril). Apernar cabezales porta-nosebar (clips 2×M6).',
      'Apernar MECHAS porta-chumacera al alma: 6×M10 por mecha (49 Nm) — sin soldadura.',
      `Soldadura de taller (${dims.soldadura?.proceso || 'GMAW'} · ${dims.soldadura?.norma || 'AWS D1.1'}): ` +
        'sólo oreja/clip a su cuerpo y placa piso a columna.',
      'Terminación: granallado/desengrase + PINTADO RAL 7035 antes de continuar.',
    ]],
    ['2 · SOPORTES 24V (Fig. H)', [
      'Apernar el ala de cada bracket B_005A POR DEBAJO del ala inferior del canal (cruciformes M8×20 — dejar a mano para regular en los 2 ejes).',
      'Colgar cada COLUMNA de su pivote M10 (por DENTRO de la placa) y aplomarla; fijar con el perno del ARCO (tramos inclinados: usar el bloqueo discreto de ±60°).',
      'Calzar la TIRA BR_3002 por fuera de la columna, elegir la ranura 11×20 para la',
      'altura de faja y apretar 3×M10; anclar la pata B_004A a losa (2×M10×90).',
      'Encajar el TRAVESAÑO B_002A dentro de ambas columnas (pestañas del alma en sus ranuras) y SOLDAR filete 3 perimetral con el marco aplomado (taller).',
      'Nivel ±2 mm en el largo → apretar cruciformes (25 Nm).',
    ]],
    ['3 · RETORNO (Fig. B · sub-despiece Fig. B1)', [
      'Montar rodillos de retorno: eje muerto contra cara interior de placas, perno M8×25 +',
      'golillas POR FUERA (25 Nm). Girar cada rodillo a mano: debe girar libre, sin roce.',
      'Recambio de rodamientos 6202-2RS: ver Figura B1 (seeger DIN 472-35 + chaflán de guía).',
    ]],
    [esLBP ? '4 · EJES Y SPROCKETS (Fig. C y D)' : '4 · EJE Y SPROCKETS (Fig. C)', [
      'Enfilar sprockets en el eje ANTES de montar chumaceras: el CENTRAL fijo con grano M8',
      '(12 Nm + Loctite) flanqueado por 2 collarines; los demás flotan (los carriles de la banda',
      'los posicionan). Montar UCF206 en mechas (M10×35, 49 Nm) y fijar prisioneros al eje.',
      'Verificar giro libre y concentricidad; el eje motriz lleva el muñón largo hacia el lado motor.',
    ]],
    ['5 · CARRYWAY (Fig. G)', [
      'Montar guías de apoyo (pletina + BAR CAP) y verificar luces ≤ 50 mm entre apoyos',
      'transversales. Montar guía lateral (conical rail) con holgura 3–5 mm al borde de banda.',
    ]],
    ['6 · BANDA', [
      'Tender la banda por el carryway y el retorno, unir con el pasador del fabricante.',
      ...(esLBP ? [
        'Flecha de catenaria tras la motriz: ~130 mm (rango Movex 50–150). NO tensar la banda:',
        'la LBP trabaja con catenaria libre — el tensor sólo posiciona.',
      ] : [
        'El GT es de UN SOLO EJE (Rev.E): el retorno viaja por los 2 rodillos altos y abraza el',
        'rodillo del nosebar de entrada. NO tensar: el largo del lazo lo fija la geometría.',
      ]),
    ]],
    ['7 · NOSEBAR (Fig. E)', [
      esLBP ? 'Montar nosebar por cara IDLER (acumulación) con M8×30 y tuerca interior (25 Nm).'
            : 'Montar transfer plate P22862 con M8×30 y tuerca interior (25 Nm).',
      'Verificar giro libre de los rodillos de transferencia y coplanaridad con la faja.',
    ]],
    ['8 · ACCIONAMIENTO (Fig. C)', [
      'Calzar motorreductor de eje hueco en el muñón motriz (chaveta 8×7×90), fijar retención',
      'axial (arandela + M10 + Loctite) y brazo de torque. NO rigidizar el brazo: debe flotar.',
    ]],
    ['9 · GUARDAS Y PUESTA EN MARCHA (Fig. F)', [
      'Montar guardas inferiores (M6×16 al ala; M6×12 a la mecha). Energizar y verificar:',
      'sentido de giro, marcha 10 min sin carga, temperatura de chumaceras (< 40 °C sobre',
      'ambiente), tracking de banda centrada en sprockets, y wrap de banda en la motriz.',
    ]],
  ];
  let y = 258;
  for (const [t, lineas] of pasos) {
    sh.text(t, 26, y, 3.3, 'L'); y -= 6;
    for (const l of lineas) { sh.text(l, 32, y, 2.7, 'L'); y -= 4.6; }
    y -= 3.4;
    if (y < 26) break;
  }
  sheets.push(sh);
}

// ── ÍNDICE DE PLANOS ─────────────────────────────────────────────────────────
{
  nPag++;
  const sh = A3();
  marco(sh); cabecera(sh, 'ÍNDICE DE PLANOS DEL EQUIPO'); pie(sh, nPag);
  let y = 252;
  sh.text('ÍTEM', 26, y, 2.8, 'L'); sh.text('PIEZA', 44, y, 2.8, 'L');
  sh.text('CORTE LÁSER', 240, y, 2.8, 'L'); sh.text('VISTAS', 300, y, 2.8, 'L'); sh.text('MASA kg', 350, y, 2.8, 'L');
  sh.line([24, y - 2.4], [396, y - 2.4], 'NORMA'); y -= 7;
  for (const f of bom.filas.filter(f => f.tipo === 'FABRICADA')) {
    sh.text(String(f.item), 28, y, 2.8, 'C');
    sh.text(wrap(f.item_desc, 78)[0], 44, y, 2.4, 'L');
    sh.text(f.plano_corte || '—', 244, y, 2.6, 'L');
    sh.text(f.plano_vistas || '—', 300, y, 2.6, 'L');
    sh.text(String(f.masa_aprox_kg || '—'), 354, y, 2.6, 'L');
    y -= 6;
    sh.line([24, y + 1.8], [396, y + 1.8], 'FINA');
  }
  y -= 6;
  sh.text('Documentos del paquete: planos_fabricacion_' + base + '.pdf · dxf_' + base + '/ (corte 1:1 + _corte.csv + _agujeros.csv) ·', 26, y, 2.6, 'L'); y -= 4.6;
  sh.text('planos_ejes_lbp530.pdf (LBP530-EJ-01…04) · planos_conjunto_lbp530.pdf (GA) · bom_' + base + '.csv (este manual usa sus ÍTEM).', 26, y, 2.6, 'L');
  sheets.push(sh);
}

// ── índice de figuras en la portada (lámina 1, se dibuja al final) ───────────
{
  const sh = sheets[0];
  let y = 74;
  sh.text('CONTENIDO', 120, y, 3.4, 'L'); y -= 6;
  const idx = [['—', 'Seguridad', 2], ['—', 'Vista general', 3], ...indiceFig];
  for (const [id, nm, pg] of idx) {
    const label = id === '—' ? nm : (id === 'T' || id === 'M' || id === 'I') ? nm : `Figura ${id} — ${nm}`;
    sh.text(label, 120, y, 2.6, 'L');
    sh.text(String(pg), 296, y, 2.6, 'R');
    y -= 4.4;
  }
}

const pdf = exportSheetsPDF(sheets, `manual_partes_${base}.pdf`);
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
console.log(`OK ${join(outDir, pdf.name)} — ${sheets.length} páginas`);
