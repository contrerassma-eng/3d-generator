#!/usr/bin/env node
// entregables_lbp530.mjs — Entregables documentales del proyecto LBP530-18 a
// partir de la ÚNICA fuente de dimensiones (lbp530_dims.json) y de los dos
// ensambles paramétricos (lbp530_5m.json, lbp530_gt<L>.json):
//
//   projects/LBP530-18/out/compra_movex_lbp530.csv|.md
//       lista de compra Movex POR EQUIPO y POR FLOTA (4 líneas), contrastada
//       con lo cotizado en 26012937, con la decisión de guías (bar cap sobre
//       pletina vs perfiles cónicos 122/124/125) explicitada.
//   projects/LBP530-18/out/inventor/parametros_inventor_LBP530.csv
//       parámetros del esqueleto de referencia (Ref_*.ipt) para Inventor:
//       nombre, valor, unidad, comentario. Nombres válidos como parámetros
//       de usuario de Inventor (letras, dígitos, guion bajo).
//   projects/LBP530-18/out/inventor/despiece_inventor_LBP530.csv
//       piezas de cada ensamble → nombre de archivo Inventor (.ipt/.iam) con
//       la nomenclatura Conveyone, cantidad por equipo y plano asociado.
//
// Uso (desde la raíz del repo):  node cad/ensambles/entregables_lbp530.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(root, 'projects', 'LBP530-18', 'out');
const invDir = join(outDir, 'inventor');
mkdirSync(invDir, { recursive: true });

const dims = JSON.parse(readFileSync(join(here, 'lbp530_dims.json'), 'utf8'));
const D = dims.D, B = dims.belt;
const GT_L = dims.GT_L || 800;
const gtFile = `lbp530_gt${String(Math.round(GT_L / 100)).padStart(2, '0')}.json`;
const docs = {
  LBP: JSON.parse(readFileSync(join(here, 'lbp530_5m.json'), 'utf8')),
  GT: JSON.parse(readFileSync(join(here, gtFile), 'utf8')),
};
const L = { LBP: 5000, GT: GT_L };
const lineas = dims.lineas || 4;
const r2 = (v) => Math.round(v * 100) / 100;
const r1 = (v) => Math.round(v * 10) / 10;
const cnt = (doc, re) => doc.parts.filter(p => re.test(p.name)).length;

// ---------------------------------------------------------------------------
// 1. Cantidades Movex por equipo (derivadas del ensamble, no tipeadas)
// ---------------------------------------------------------------------------
const wearL = (l) => l - 2 * (B.noseR + B.esp + 30);          // misma fórmula del generador
const porEquipo = {};
for (const tipo of ['LBP', 'GT']) {
  const doc = docs[tipo];
  const nWear = cnt(doc, /Guía de apoyo/);
  porEquipo[tipo] = {
    banda_m: r2(doc.meta.largo_banda_lazo_mm / 1000),
    banda_pedir_m: r2(Math.ceil(doc.meta.largo_banda_lazo_mm / 1500) * 1.5),   // rollos de 1,5 m (>12 in)
    sprockets: cnt(doc, /Sprocket/),                 // motriz + locos del tensor
    collarines: cnt(doc, /Collarín/),
    nosebar_seg: cnt(doc, /^NORM · Nosebar/) * 3,   // 3 × K6 in por punta (18 in)
    barcap_m: r2(nWear * wearL(L[tipo]) / 1000),
    pletina_m: r2(nWear * wearL(L[tipo]) / 1000),
    rail_lat_m: r2(2 * L[tipo] / 1000),
    n_guias_apoyo: nWear,
    ucf206: cnt(doc, /Chumacera UCF206/),
    motorreductor: cnt(doc, /Motorreductor/),
    rodillos_ret: cnt(doc, /Rodillo (retorno|de COLA)/),
    escuadras: cnt(doc, /Escuadra de pata B_005A_1/),
    columnas: cnt(doc, /Columna de pata SOLID_06/),
    bases: cnt(doc, /Placa base de pata B_004A_1/),
    trav_patas: cnt(doc, /Travesaño de patas/),
    travesanos: cnt(doc, /Travesaño tipo ZP2026|Travesaño BAJO/),
    frentes: cnt(doc, /Frente porta-nosebar/),
    acoples: cnt(doc, /Acople de laterales/),
    laterales: cnt(doc, /Placa lateral/),
    mechas: cnt(doc, /Mecha porta-chumacera/),
    suples: cnt(doc, /Suple de descanso/),
    guardas: cnt(doc, /Guarda inferior/),
    pernos_coche: dims.estructura[tipo].nPernosCoche,
    postes_guia: cnt(doc, /Poste guía de cajas/),
    portas_guia: cnt(doc, /Porta guía Movex/),
    guias_desgaste: cnt(doc, /Guía lateral de desgaste/),
    wrap: doc.meta.verificaciones[tipo === 'LBP' ? 'wrapMotrizLBP' : 'wrapMotrizGT'],
  };
}
const flota = (k) => lineas * (porEquipo.LBP[k] + porEquipo.GT[k]);
const cm = dims.compraMovex;

// Filas de la compra Movex: [pos, art, descripción, unidad, LBP, GT, flota, cotizado, precio EUR, nota]
const rows = [
  ['M1', cm.banda_530LBP_18in.art, 'Banda Movex 530 LBP LFA 18 in (rollos 1,5 m)', 'm',
    porEquipo.LBP.banda_pedir_m, 0, r2(lineas * porEquipo.LBP.banda_pedir_m), cm.banda_530LBP_18in.cotizado_m, cm.banda_530LBP_18in.precioEUR_m,
    `lazo real ${porEquipo.LBP.banda_m} m/equipo; lo cotizado (${cm.banda_530LBP_18in.cotizado_m} m) cubre ~2× — repuesto o futuras líneas`],
  ['M2', cm.banda_530GT_18in.art, `Banda Movex 530 GT (grip top) LFA 18 in (rollos 1,5 m)`, 'm',
    0, porEquipo.GT.banda_pedir_m, r2(lineas * porEquipo.GT.banda_pedir_m), cm.banda_530GT_18in.cotizado_m, cm.banda_530GT_18in.precioEUR_m,
    `lazo real ${porEquipo.GT.banda_m} m/equipo con L=${GT_L}; cotizado ${cm.banda_530GT_18in.cotizado_m} m`],
  ['M3', cm.sprockets_Z32_cuadrado15.art, 'Sprocket moldeado Z-32 PD 153,4 bore cuadrado 1,5 in c/grano M8', 'u',
    porEquipo.LBP.sprockets, porEquipo.GT.sprockets, flota('sprockets'), cm.sprockets_Z32_cuadrado15.cotizado, cm.sprockets_Z32_cuadrado15.precioEUR,
    'solo en el eje motriz (un eje por equipo, decisión Movex 2026-09-08): LBP 5 (grid A·B·C·B·C·A) · GT 6; solo el central fijo, resto flotante'],
  ['M4', cm.collarines.art, 'Collarín de referencia 1,5 × 1,5 in', 'u',
    porEquipo.LBP.collarines, porEquipo.GT.collarines, flota('collarines'), cm.collarines.cotizado, cm.collarines.precioEUR,
    '2 por eje motriz (flanquean el sprocket central fijo)'],
  ['M5', cm.nosebar_LBP.art, 'Nosebar 530 LBP h19 c/rodamientos K=6 in, 6 agujeros, BluLub', 'u',
    porEquipo.LBP.nosebar_seg, 0, lineas * porEquipo.LBP.nosebar_seg, cm.nosebar_LBP.cotizado, cm.nosebar_LBP.precioEUR,
    '3 × K6 in por punta × 2 puntas; catálogo 2025 p.313: "NoseBar with Bearings for 530 LBP — 22868"'],
  ['M6', cm.nosebar_GT.art, 'Nosebar 530 Series (LBP excluida) h19 c/rodamientos K=6 in', 'u',
    0, porEquipo.GT.nosebar_seg, lineas * porEquipo.GT.nosebar_seg, cm.nosebar_GT.cotizado, cm.nosebar_GT.precioEUR,
    'catálogo 2025 p.312: "NoseBars with Bearings for 530 Series — 22862 K 152,4"'],
  ['M7', cm.bar_cap.art, 'BAR CAP UHMW 17,53×19,05 p/pletina 12 mm — guía de APOYO (rollo 30 m)', 'm',
    porEquipo.LBP.barcap_m, porEquipo.GT.barcap_m, r2(flota('barcap_m')), cm.bar_cap.cotizado_m, cm.bar_cap.precioEUR_m,
    `LBP ${porEquipo.LBP.n_guias_apoyo} pistas · GT ${porEquipo.GT.n_guias_apoyo} pistas × largo útil; pistas ENTRE carriles de rodillos, luz ≤50 (cat. p.237); comprar ${Math.ceil(flota('barcap_m') / 30)} rollos`],
  ['M8', cm.conical_rail_L114.art, 'Conical rail L 1¼ in AISI304 + Ti-White — guía LATERAL de producto', 'm',
    porEquipo.LBP.rail_lat_m, porEquipo.GT.rail_lat_m, r2(flota('rail_lat_m')), cm.conical_rail_L114.cotizado_m, cm.conical_rail_L114.precioEUR_m,
    'ambos costados × largo nose a nose; barras de 3 m → ' + Math.ceil(flota('rail_lat_m') / 3) + ' barras'],
  ['M9', cm.conical_rail_T1.art, 'Conical rail T 1 in AISI304 (PART 122) — apoyo alternativo', 'm',
    0, 0, 0, cm.conical_rail_T1.cotizado_m, cm.conical_rail_T1.precioEUR_m,
    'SOLO si se elige la opción B de guías (apoyo por perfiles Movex 122/124/125); con la opción A (bar cap) no se necesita'],
  ['M10', cm.conical_rail_T40.art, 'Conical rail T 40 mm AISI304 (PART 124) — apoyo alternativo', 'm',
    0, 0, 0, cm.conical_rail_T40.cotizado_m, cm.conical_rail_T40.precioEUR_m,
    'ídem M9'],
];

// ---------------------------------------------------------------------------
// 2. CSV + MD de compra
// ---------------------------------------------------------------------------
const csvEsc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv = ['pos,articulo,descripcion,unidad,por_LBP_5000,por_GT_' + GT_L + ',flota_' + lineas + '_lineas,cotizado_26012937,precio_EUR,nota']
  .concat(rows.map(r => r.map(csvEsc).join(','))).join('\n');
writeFileSync(join(outDir, 'compra_movex_lbp530.csv'), csv + '\n');

const eur = (r) => (typeof r[8] === 'number' ? r[8] : 0);
const totalNec = rows.reduce((a, r) => a + r[6] * eur(r), 0);
const totalCot = rows.reduce((a, r) => a + r[7] * eur(r), 0);
const md = `# Compra Movex — proyecto LBP530-18 (CV-LBP-5000 + CV-GT-${GT_L})

Generado por \`cad/ensambles/entregables_lbp530.mjs\` desde \`lbp530_dims.json\`, \`lbp530_5m.json\` y \`${gtFile}\`.
Fecha de datos: ${new Date().toISOString().slice(0, 10)} · Flota: ${lineas} líneas × (1 LBP 5,0 m + 1 GT ${(GT_L / 1000).toFixed(1)} m).
Cotización de referencia: Movex 26012937 (09-07-2026, EUR EXW Castelli Calepio, validez vencida 06-08-2026 → pedir revalidación).

| Pos | Artículo | Descripción | Un. | por LBP | por GT | Flota ${lineas} líneas | Cotizado | EUR unit. | Nota |
|---|---|---|---|---:|---:|---:|---:|---:|---|
${rows.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} | ${r[5]} | ${r[6]} | ${r[7]} | ${r[8]} | ${r[9]} |`).join('\n')}

Valor de lo NECESARIO (opción A de guías): **EUR ${r2(totalNec).toLocaleString('es-CL')}** · valor de lo COTIZADO: EUR ${r2(totalCot).toLocaleString('es-CL')}.

## Decisión de guías (lo que "considerar guía" obliga a cerrar)

- **Opción A — apoyo por BAR CAP sobre pletina 12 (la modelada):** M7 + pletina local 12×30. Guía lateral M8. No se compran M9/M10.
  Cumple la regla Movex del 530 LBP en acumulación: pistas entre carriles de rodillos, luz ≤ 50 mm (catálogo 2025 p.237).
- **Opción B — apoyo por perfiles cónicos Movex 122/124/125 (brochure p.6, luces 28/30/56/30/28):** se compran M9 + M10 + M8 en las cantidades cotizadas (156 + 105 + 105 m) y se descarta M7. Más caro por metro (17–23 vs 7 EUR) y obliga a rehacer las aletas del bastidor para el clip del perfil.
- Recomendación: **A**. Reducir M9/M10 a cero (o dejar 1 barra de cada como muestra) y M8 a ${Math.ceil(flota('rail_lat_m') / 3)} barras de 3 m.

## Cantidades cotizadas que NO cuadran con la flota (confirmar con Movex antes de la OC)

- Sprockets: cotizados 152 vs necesarios ${flota('sprockets')} (LBP ${porEquipo.LBP.sprockets} + GT ${porEquipo.GT.sprockets} por línea). Sobran ${152 - flota('sprockets')}: repuesto o cuenta distinta de ejes.
- Nosebar P22868: cotizados 51 vs ${lineas * porEquipo.LBP.nosebar_seg}; P22862: 51 vs ${lineas * porEquipo.GT.nosebar_seg}.
- Collarines: cotizados 60 vs ${flota('collarines')}.
- Banda LBP: cotizada 90,3 m vs ${r2(lineas * porEquipo.LBP.banda_pedir_m)} m (2×); banda GT: 18 m vs ${r2(lineas * porEquipo.GT.banda_pedir_m)} m.

## Lo que Movex NO vende para este diseño (compra local)

| Ítem | LBP | GT | Flota | Nota |
|---|---:|---:|---:|---|
| Chumacera UCF206 (Ø30) | ${porEquipo.LBP.ucf206} | ${porEquipo.GT.ucf206} | ${flota('ucf206')} | LBP: sobre la mecha PL8 apernada; GT: sobre suple de descanso PL5 en el alma (línea BRP) |
| Motorreductor: el MISMO del BRP (caja sinfín eje hueco Ø30 + motor 1 HP, STEP 314508014) con brazo de reacción 50154 y pasador EspBrazoReac | ${porEquipo.LBP.motorreductor} | ${porEquipo.GT.motorreductor} | ${flota('motorreductor')} | pedido Sergio 2026-09-08; el NMRV-P 075 0,55 kW de criterios/accionamiento.md queda como mínimo calculado |
| Rodillo Ø63,5 eje muerto (tubo A513 + 2×6202-2RS): retorno, snub y cola | ${porEquipo.LBP.rodillos_ret} | ${porEquipo.GT.rodillos_ret} | ${flota('rodillos_ret')} | LBP: snub + apoyos de retorno a 500±50 (manual p.72); GT ${GT_L}: snub + rodillo de cola en COLISA como tensor (manual p.73); el manual p.74 sugiere zapata para el retorno del LBP 15 mm — desviación registrada |
| Pletina acero 12×30 de canto (núcleo de la guía de apoyo) | ${porEquipo.LBP.pletina_m} m | ${porEquipo.GT.pletina_m} m | ${r2(flota('pletina_m'))} m | recibe el bar cap M7 |
| Escuadra de pata B_005A_1 (pieza REAL ZP2026) | ${porEquipo.LBP.escuadras} | ${porEquipo.GT.escuadras} | ${flota('escuadras')} | misma pieza del ZP2026 (ZP2026\\Piezas), apernada bajo la pestaña con 2× perno coche 3/8 |
| Columna de pata SOLID_06 C 77×38×3 L=588 (pieza REAL ZP2026) | ${porEquipo.LBP.columnas} | ${porEquipo.GT.columnas} | ${flota('columnas')} | misma columna del ZP2026 → NPT de banda ${dims.estructura.NPT_mm} |
| Placa base de pata B_004A_1 (pieza REAL ZP2026) | ${porEquipo.LBP.bases} | ${porEquipo.GT.bases} | ${flota('bases')} | |
| Travesaño de patas C 71×38×3 (sección B_002A_1) L=550 | ${porEquipo.LBP.trav_patas} | ${porEquipo.GT.trav_patas} | ${flota('trav_patas')} | entra en el C de las columnas, 4× perno coche 3/8 |
| Travesaño de bastidor C 71×38×3 con orejas (sección B_002A_1) | ${porEquipo.LBP.travesanos} | ${porEquipo.GT.travesanos} | ${flota('travesanos')} | bajo las guías de apoyo, colgado de las almas con 4× perno coche 3/8 |
| Lateral chapa 3 plegada (alma 300, pestaña 38 + labio 20 afuera) | ${porEquipo.LBP.laterales} | ${porEquipo.GT.laterales} | ${flota('laterales')} | LBP: 2 tramos de 2500 por lado + ${porEquipo.LBP.acoples} acoples PL3 |
| Frente porta-nosebar chapa 3 plegada 470×240 | ${porEquipo.LBP.frentes} | ${porEquipo.GT.frentes} | ${flota('frentes')} | pestañas 40 apernadas a las almas |
| Mecha PL8 apernada (LBP) / Suple de descanso PL5 (GT) | ${porEquipo.LBP.mechas} / ${porEquipo.LBP.suples} | ${porEquipo.GT.mechas} / ${porEquipo.GT.suples} | ${flota('mechas')} / ${flota('suples')} | |
| Guarda del cabezal motriz chapa 1,5 (sólo LBP) | ${porEquipo.LBP.guardas} | ${porEquipo.GT.guardas} | ${flota('guardas')} | el GT viaja completo dentro del bastidor de 300 |
| Perno coche 3/8 in UNC (ANSI B18.5) + golilla plana F436 + golilla de presión B18.21.1 + tuerca AS 2465 | ${porEquipo.LBP.pernos_coche} | ${porEquipo.GT.pernos_coche} | ${flota('pernos_coche')} | largos LBP ${JSON.stringify(dims.estructura.pernoCoche.porLargoLBP)} · GT ${JSON.stringify(dims.estructura.pernoCoche.porLargoGT)} (in); todo apernado, nada soldado (Merge/BRP) |
| Poste de guía de cajas Sop_GuarLat_BRP + porta guía Movex BM (piezas reales BRP/Merge) | ${porEquipo.LBP.postes_guia} + ${porEquipo.LBP.portas_guia} | ${porEquipo.GT.postes_guia} + ${porEquipo.GT.portas_guia} | ${flota('postes_guia')} + ${flota('portas_guia')} | llevan el conical rail L 1¼ in P12501C; 2 pernos coche 3/8 al alma por poste |
| Guía lateral de desgaste UHMW 12×15 (como Guias_desgaste_BRP), por tramos | ${porEquipo.LBP.guias_desgaste} | ${porEquipo.GT.guias_desgaste} | ${flota('guias_desgaste')} | contacto lateral de la banda sobre el borde superior del lateral |
| Barra cuadrada 1,5 in SAE 1045 calibrada × 6 m | — | — | ${dims.ejes.barras.comprar} (+1) | ${dims.ejes.barras.motriz.porBarra} ejes motrices por barra; sin ejes tensores (un solo eje por equipo) |

Envolturas verificadas: LBP ${porEquipo.LBP.wrap}° · GT ${porEquipo.GT.wrap}° (objetivo Movex 140±10°, manual p.108).
`;
writeFileSync(join(outDir, 'compra_movex_lbp530.md'), md);

// ---------------------------------------------------------------------------
// 3. Parámetros del esqueleto de referencia para Inventor
// ---------------------------------------------------------------------------
const P = [];
const add = (n, v, u, c) => P.push([n, v, u, c]);
add('L_nose_LBP', 5000, 'mm', 'largo nose a nose CV-LBP-5000');
add('L_nose_GT', GT_L, 'mm', `largo nose a nose CV-GT-${GT_L}`);
add('W_banda', B.ancho, 'mm', 'ancho de banda Movex 530 18 in');
add('paso_banda', B.paso, 'mm', 'paso 530');
add('esp_banda', B.esp, 'mm', 'espesor base de la banda');
add('h_rodillo_LBP', B.lbp.protru, 'mm', 'saliente del rodillo LBP sobre la base');
add('h_goma_GT', B.gt.goma, 'mm', 'goma grip top sobre la base');
add('claro_lat', D.claroLat, 'mm', 'holgura banda–placa por lado (Δtérmica + 5)');
add('W_int', D.innerW, 'mm', 'ancho interior entre placas');
add('W_ext', D.outerW, 'mm', 'ancho exterior placas');
add('t_placa', D.plT, 'mm', 'lateral de chapa 3 plegada (línea BRP)');
add('z_top_placa', D.plTop, 'mm', 'borde superior de la placa respecto del plano de producto (z=0)');
add('h_placa', D.plAlto, 'mm', 'alto de la placa lateral');
add('w_ala', D.alaAncho, 'mm', 'pestaña inferior hacia afuera (asiento escuadra ZP2026)');
add('w_labio', D.lipTop, 'mm', 'labio superior hacia afuera');
add('y_pestana_ext', D.yFlangeOut, 'mm', 'borde libre de la pestaña inferior');
add('z_motriz_LBP', D.zMotriz, 'mm', 'eje motriz LBP bajo el plano de producto');
add('x_motriz_punta', D.xMotrizDesdePunta, 'mm', 'eje motriz desde la punta de descarga');
add('z_tensor_LBP', D.zTensor, 'mm', 'eje tensor LBP');
add('x_tensor_LBP', D.xTensorDesdePunta, 'mm', 'eje tensor LBP desde la punta de entrada');
add('z_motriz_GT', D.gtMotZ ?? D.zMotriz, 'mm', 'eje motriz GT');
add('x_tensor_GT', D.gtTen?.x ?? D.xTensorDesdePunta, 'mm', 'eje tensor GT desde la punta de entrada');
add('z_tensor_GT', D.gtTen?.z ?? D.zTensor, 'mm', 'eje tensor GT');
add('z_ret_LBP', D.retTop, 'mm', 'plano superior de los rodillos de retorno LBP');
add('paso_ret_LBP', D.retCada, 'mm', 'paso de rodillos de retorno (manual p.108: 500)');
add('d_rodillo_ret', D.gtRetDia, 'mm', 'rodillo de retorno (manual p.74: D>50)');
add('d_eje_ret', D.retEjeDia, 'mm', 'eje muerto del rodillo de retorno');
add('z_catenaria', D.sagBot, 'mm', 'fondo de la catenaria LBP (flecha 50–150, manual p.72)');
add('L_catenaria', D.catenLen, 'mm', 'largo de catenaria (manual p.108: 500–900)');
add('z_piso', D.pisoZ, 'mm', `piso: NPT de banda ${-D.pisoZ} (columna REAL SOLID_06 del ZP2026)`);
add('sq_eje', D.sq, 'mm', 'eje cuadrado 1,5 in SAE 1045');
add('d_munon', D.jrnDia, 'mm', 'muñón torneado h6');
add('L_munon_libre', D.jrnLibre, 'mm', '');
add('L_munon_motriz', D.jrnMotriz, 'mm', 'rodamiento 50 + cubo motorreductor 110');
add('L_cuadrado', D.sqLen, 'mm', 'tramo cuadrado del eje');
add('L_eje_motriz', D.ejeMotrizL, 'mm', 'plano LBP530-EJ-01');
add('L_eje_tensor', D.ejeTensorL, 'mm', 'plano LBP530-EJ-02');
add('PD_sprocket', B.sprocket.pd, 'mm', 'Z-32 P158808YF');
add('OD_sprocket', B.sprocket.od, 'mm', '');
add('B_sprocket', B.sprocket.ancho, 'mm', 'ancho de cubo');
add('S_sprocket', B.sprocket.S, 'mm', 'S: centro de eje a tope de guía de apoyo (catálogo p.353)');
D.ySprkLBP.forEach((y, i) => add(`y_sprk_LBP_${i + 1}`, y, 'mm', 'grid A·B·C·B·C·A manual p.30'));
D.ySprkGT.forEach((y, i) => add(`y_sprk_GT_${i + 1}`, y, 'mm', 'indent 38,1 paso 76,2 manual p.30'));
add('R_nose', B.noseR, 'mm', 'nosebar h19 Ø19');
add('w_barcap', D.barCap.w, 'mm', 'BAR CAP P101203-30');
add('h_barcap', D.barCap.h, 'mm', '');
add('t_pletina', D.pletina.t, 'mm', 'pletina de canto bajo el bar cap');
add('h_pletina', D.pletina.h, 'mm', '');
add('n_guias_apoyo_LBP', D.wearLBP.n, 'ul', 'pistas entre carriles de rodillos, luz ≤50');
add('n_guias_apoyo_GT', D.wearGT.n, 'ul', '');
add('L_guia_apoyo_LBP', r1(wearL(5000)), 'mm', 'L − 2·(R_nose + esp_banda + 30)');
add('L_guia_apoyo_GT', r1(wearL(GT_L)), 'mm', '');
add('h_guia_lat', D.guiaAlto, 'mm', 'conical rail L 1¼ in sobre escuadras');
add('paso_trav_LBP', D.pasoTravLBP, 'mm', 'travesaños TR_S');
add('paso_trav_GT', D.pasoTravFT, 'mm', '');
add('trav_w', D.travC.w, 'mm', 'perfil C 88×40×3');
add('trav_h', D.travC.h, 'mm', '');
add('trav_t', D.travC.t, 'mm', '');
add('escuadra_L', D.zp.escuadra.l, 'mm', 'escuadra B_005A_1 ZP2026 (pieza real)');
add('escuadra_h', D.zp.escuadra.h, 'mm', '');
add('trav_w', D.travC.w, 'mm', 'travesaño C (sección B_002A_1 ZP2026)');
add('trav_h', D.travC.h, 'mm', '');
add('frente_h', D.frente.h, 'mm', 'frente porta-nosebar');
add('columna_L', D.zp.columna.L, 'mm', 'columna SOLID_06 ZP2026 (pieza real)');
add('ucf_bore', D.ucf.bore, 'mm', 'UCF206');
add('ucf_flange', D.ucf.flange, 'mm', '');
add('ucf_boltGap', D.ucf.boltGap, 'mm', '');
const pcsv = ['parametro,valor,unidad,comentario'].concat(P.map(r => r.map(csvEsc).join(','))).join('\n');
writeFileSync(join(invDir, 'parametros_inventor_LBP530.csv'), pcsv + '\n');

// ---------------------------------------------------------------------------
// 4. Despiece → archivos Inventor (nomenclatura Conveyone)
// ---------------------------------------------------------------------------
// [regex sobre el nombre de pieza, archivo Inventor (función de tipo/L), carpeta, plano]
const MAPA = [
  [/Placa lateral libre/, (t, l, n) => `PL_LatLib_LBP530_L${(n.match(/L=(\d+)/) || [])[1]}${(n.match(/tramo (\w)/) || ['', ''])[1] && '_' + n.match(/tramo (\w)/)[1]}.ipt`, 'Estructura/Planchas', 'LBP530-CH'],
  [/Placa lateral motriz/, (t, l, n) => `PL_LatMot_LBP530_L${(n.match(/L=(\d+)/) || [])[1]}${(n.match(/tramo (\w)/) || ['', ''])[1] && '_' + n.match(/tramo (\w)/)[1]}.ipt`, 'Estructura/Planchas', 'LBP530-CH'],
  [/Frente porta-nosebar entrada/, () => 'PL_Frente_Nose_ENT_LBP530.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Frente porta-nosebar descarga/, () => 'PL_Frente_Nose_DES_LBP530.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Acople de laterales/, () => 'PL_Acople_LBP530.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Suple de descanso/, () => 'PL_SupleDescanso_LBP530.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Guía lateral de desgaste/, (t, l, n) => `PL_GuiaDesgaste_LBP530_L${(n.match(/L=(\d+)/) || [])[1]}.ipt`, 'Guias', 'LBP530-CH'],
  [/Poste guía de cajas/, () => 'Guias/Guia de cajas/Sop_GuarLat_BRP.ipt (real BRP)', 'Guias/Guia de cajas', '—'],
  [/Porta guía Movex/, () => 'Guias/Guia de cajas/PortaGuardaMovex_BM.ipt (real Merge)', 'Guias/Guia de cajas', '—'],
  [/Brazo de reacción 50154/, () => 'Componentes Estandar/Motor y caja/50154.ipt (real BRP)', 'Componentes Estandar/Motor y caja', '—'],
  [/Pasador brazo de reacción/, () => 'Estructura/Torno/EspBrazoReac_d25_L50.ipt (real BRP)', 'Estructura/Torno', '—'],
  [/Chaveta DIN 6885/, () => 'DIN6885A_8x7x90.ipt', 'Componentes Estandar', '—'],
  [/Arandela de retención/, () => 'Retencion_D40x6_M10.ipt', 'Componentes Estandar', '—'],
  [/Perno coche 3\/8 in × ([\d.]+) in/, (t, l, n) => `CC/ANSI B18.5 - 3_8-16 UNC - ${n.match(/× ([\d.]+) in/)[1]}(8).ipt (Content Center BRP/Gapper, real)`, 'CC', '—'],
  [/Golilla plana 3\/8/, () => 'CC/ASTM F436 - 3_8(1).ipt (real)', 'CC', '—'],
  [/Golilla de presión 3\/8/, () => 'CC/ANSI B18.21.1 - 0.375.ipt (real)', 'CC', '—'],
  [/Tuerca hexagonal 3\/8/, () => 'CC/AS 2465 - 3_8  UNC(1).ipt (real)', 'CC', '—'],
  [/Travesaño de patas/, () => 'PE_TravPatas_B002A_LBP530.ipt', 'Estructura/Soportes', 'LBP530-CH'],
  [/Travesaño BAJO/, () => 'PE_TravBajo_B002A_LBP530.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Escuadra de pata B_005A_1/, () => 'Estructura/Soportes/ZP2026/B_005A_1.ipt (pieza REAL copiada de ZP2026)', 'Estructura/Soportes/ZP2026', 'ZP2026'],
  [/Columna de pata SOLID_06/, () => 'Estructura/Soportes/ZP2026/SOLID_06.ipt (pieza REAL copiada de ZP2026)', 'Estructura/Soportes/ZP2026', 'ZP2026'],
  [/Placa base de pata B_004A_1/, () => 'Estructura/Soportes/ZP2026/B_004A_1.ipt (pieza REAL copiada de ZP2026)', 'Estructura/Soportes/ZP2026', 'ZP2026'],
  [/Guarda inferior motriz/, () => 'PL_GuardaU_MOT_LBP530.ipt', 'Estructura/Guardas', 'LBP530-GU'],
  [/Guarda inferior tensor/, () => 'PL_GuardaU_TEN_LBP530.ipt', 'Estructura/Guardas', 'LBP530-GU'],
  [/Guarda inferior unica/, (t, l) => `PL_GuardaU_GT_LBP530_L${l}.ipt`, 'Estructura/Guardas', 'LBP530-GU'],
  [/Mecha porta-chumacera PL8 motriz/, () => 'PL_Mecha_MOT_LBP530.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Mecha porta-chumacera PL8 tensor/, () => 'PL_Mecha_TEN_LBP530.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Mecha porta-chumacera PL8 combinada/, () => 'PL_Mecha_COMB_LBP530_GT.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Travesaño tipo ZP2026/, () => 'PE_Trav_B002A_LBP530.ipt', 'Estructura/Planchas', 'LBP530-CH'],
  [/Rodillo de COLA/, () => 'RET-D63_COLA_LBP530.iam', 'Estructura/Torno', 'LBP530-RR-02'],
  [/Rodillo retorno/, () => 'RET-D63_LBP530.iam', 'Estructura/Torno', 'LBP530-RR-01'],
  [/EJE MOTRIZ/, () => 'TO_EjeMotriz_LBP530_18.ipt', 'Estructura/Torno', 'LBP530-EJ-01'],
  [/EJE TENSOR/, () => 'TO_EjeTensor_LBP530_18.ipt', 'Estructura/Torno', 'LBP530-EJ-02'],
  [/Guía de apoyo/, (t, l) => `GUI-APO_LBP530_L${l}.iam`, 'Guias', 'LBP530-GA'],
  [/Guía lateral|Guía de cajas conical rail/, (t, l) => `GUI-LAT_LBP530_L${l}.iam`, 'Guias', 'LBP530-GA'],
  [/Nosebar .*P22868/, () => 'P22868_com.iam', 'Elementos Movex/Nosebar', '—'],
  [/Nosebar .*P22862/, () => 'P22862_com.iam', 'Elementos Movex/Nosebar', '—'],
  [/Sprocket P158808YF|Sprocket Z32 loco/, () => 'P158808YF_com.ipt', 'Elementos Movex/Sprocket', '—'],
  [/Collarín/, () => 'P21703Y_com.ipt', 'Elementos Movex/Collarin', '—'],
  [/Chumacera UCF206/, () => 'Componentes Estandar/Descansos/1485N3_Mounted Ball Bearing with Four-Bolt Flan.ipt (real, BRP/Merge)', 'Componentes Estandar/Descansos', '—'],
  [/Motorreductor/, () => 'Componentes Estandar/Motor y caja/caja_314508014.ipt (real BRP, motor 1 HP)', 'Componentes Estandar/Motor y caja', '—'],
  [/Banda Movex 530 LBP/, () => 'P5324010018A_com.iam', 'Elementos Movex/Bandas', '—'],
  [/Banda Movex 530 GT/, () => 'P5323010018A_com.iam', 'Elementos Movex/Bandas', '—'],
  [/Rodillos LBP|Goma Grip Top/, () => '(incluido en la banda _com)', 'Elementos Movex/Bandas', '—'],
];
const desp = [];
for (const tipo of ['LBP', 'GT']) {
  const eq = tipo === 'LBP' ? 'CV-LBP-5000' : `CV-GT-${GT_L}`;
  const counts = new Map();
  for (const p of docs[tipo].parts) counts.set(p.name, (counts.get(p.name) || 0) + 1);
  for (const [name, n] of counts) {
    const m = MAPA.find(([re]) => re.test(name));
    const clase = name.startsWith('FAB') ? 'FAB' : 'NORM';
    const claseF = name.startsWith('ZP2026') ? 'ZP2026 (real)' : clase;
    desp.push([eq, claseF, name, n, m ? m[1](tipo, L[tipo], name) : 'POR ASIGNAR', m ? m[2] : '', m ? m[3] : '']);
  }
}
const dcsv = ['equipo,clase,pieza_generador,cantidad,archivo_inventor,carpeta,plano']
  .concat(desp.map(r => r.map(csvEsc).join(','))).join('\n');
writeFileSync(join(invDir, 'despiece_inventor_LBP530.csv'), dcsv + '\n');

console.log(`OK compra_movex_lbp530.csv/.md · ${rows.length} posiciones Movex · flota ${lineas} líneas`);
console.log(`OK inventor/parametros_inventor_LBP530.csv · ${P.length} parámetros`);
console.log(`OK inventor/despiece_inventor_LBP530.csv · ${desp.length} filas (${desp.filter(r => r[4] === 'POR ASIGNAR').length} sin mapa)`);
console.log(`   LBP: ${JSON.stringify(porEquipo.LBP)}`);
console.log(`   GT : ${JSON.stringify(porEquipo.GT)}`);
