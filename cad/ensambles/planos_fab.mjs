#!/usr/bin/env node
// planos_fab.mjs — Genera los PLANOS DE FABRICACIÓN (PDF) de todas las piezas
// del ensamble transfer_rodillos_90.json.
//
// Reutiliza el motor CAD (model.js) para construir la malla de cada pieza y el
// exportador de planos del navegador (drawing2d.js: vistas del primer diedro,
// isométrica, cotas envolventes y cajetín ISO 7200/5457/129/5456-2, con
// escritor PDF propio). Agrupa piezas idénticas por firma geométrica y emite:
//   - out/planos/PN-NN_<pieza>.pdf   (un plano por pieza FABRICADA, con cantidad)
//   - out/planos/_despiece.json      (lista de materiales: fabricadas + normalizadas)
// Un paso Python (pipeline/planos_pdf.py) arma la portada + despiece y funde
// todo en out/planos/planos_fabricacion_transfer90.pdf.
//
// Uso:  node cad/ensambles/planos_fab.mjs   (desde la raíz del repo)

import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import { buildSheet, buildFlatSheet, Sheet, chooseSheet, scaleLabel, exportSheetsPDF } from '../js/drawing2d.js';
import { IsoScene, drawFigure } from '../js/iso3d.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// masa por pieza desde la librería de compuertas: la lámina y el BOM leen la
// MISMA función (si divergen, el taller compra kilos que no existen)
import { masaFlat, exigirSello } from './lib_compuertas.mjs';
const masaDe = (part) => masaFlat(part?.flat) || '';

// Lámina SIMPLIFICADA (3 vistas envolventes) para piezas con malla muy grande,
// donde la extracción de aristas del exportador no escala (p. ej. el canal con
// decenas de miles de triángulos por sus muchos agujeros). Toma la caja
// envolvente de la malla y dibuja rectángulos acotados + cajetín ISO.
const MARGIN = 10, MARGIN_L = 20, TITLE_H = 42, GAP = 26;
// Lámina ANALÍTICA para piezas dominadas por un boceto extruido (placas peine):
// dibuja el contorno del boceto (perfil real) + los agujeros como círculos, sin
// malla. Da un plano útil de la cara de la placa, instantáneo y con las cotas
// envolventes. El boceto está en plano YZ (u=Y, v=Z); los agujeros en (y,z).
function plateSheet(part, meta) {
  const sk = part.features.find(f => f.shape === 'sketch' && f.params.pts);
  if (!sk) return null;
  const pts = sk.params.pts;                       // [[u=Y, v=Z], ...]
  const dz = -sk.at[2];                             // los agujeros vienen en z-dz
  const holes = part.features.filter(f => f.shape === 'hole')
    .map(f => ({ y: f.at[1], z: f.at[2] + dz, d: f.params.dia }));
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const [u, v] of pts) { lo = [Math.min(lo[0], u), Math.min(lo[1], v)]; hi = [Math.max(hi[0], u), Math.max(hi[1], v)]; }
  const W = hi[0] - lo[0], H = hi[1] - lo[1];
  const [name, PW, PH, num, den] = chooseSheet(W, H + 20);
  const sh = new Sheet(name, PW, PH, num, den, 1);
  const s = num / den;
  const uw = PW - MARGIN_L - MARGIN, uh = PH - 2 * MARGIN - TITLE_H - 5;
  const ox = MARGIN_L + (uw - W * s) / 2 - lo[0] * s;
  const oy = MARGIN + TITLE_H + 5 + (uh - H * s) / 2 - lo[1] * s;
  const T = (u, v) => [ox + u * s, oy + v * s];
  sh.poly(pts.map(([u, v]) => T(u, v)), 'VISIBLE');
  for (const h of holes) sh.circle(T(h.y, h.z), (h.d / 2) * s, 'VISIBLE');
  sh.text('VISTA DE CARA (perfil del boceto + perforaciones)', ox + lo[0] * s + W * s / 2, oy + hi[1] * s + 5, 3.5, 'C');
  sh.dimH(ox + lo[0] * s, ox + hi[0] * s, oy + lo[1] * s, 9, W);
  sh.dimV(ox + hi[0] * s, oy + lo[1] * s, oy + hi[1] * s, 9, H);
  sh.frame();
  sh.titleBlock({
    rev: meta.rev, revCausa: meta.revCausa,
    designacion: meta.designacion, proyecto: meta.proyecto ?? 'ConveyOne CAD',
    fuente: meta.fuente ?? 'diseño paramétrico — capa user',
    verificacion: 'PERFIL DE BOCETO (CAPA USER)', piezas: String(meta.piezas),
    nota: (meta.nota ? meta.nota + ' · ' : '') + 'cara con perforaciones; espesor y cortes en el JSON',
    escala: scaleLabel(num, den), fecha: meta.fecha ?? '—', numPlano: meta.numPlano ?? 'CAD-01',
  });
  return sh;
}

function simpleSheet(geom, meta) {
  const p = geom.attributes.position;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.count; i++) {
    const v = [p.getX(i), p.getY(i), p.getZ(i)];
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
  view(0, D + GAP, W, H, 'ALZADO');
  view(0, 0, W, D, 'PLANTA');
  view(W + GAP, D + GAP, D, H, 'PERFIL');
  sh.dimH(ox, ox + W * s, oy + (D + GAP) * s, 9, W);
  sh.dimV(ox + W * s, oy + (D + GAP) * s, oy + (D + GAP + H) * s, 9, H);
  sh.dimV(ox + W * s, oy, oy + D * s, 9, D);
  sh.frame();
  sh.titleBlock({
    rev: meta.rev, revCausa: meta.revCausa,
    designacion: meta.designacion, proyecto: meta.proyecto ?? 'ConveyOne CAD',
    fuente: meta.fuente ?? 'diseño paramétrico — capa user',
    verificacion: 'ENVOLVENTE (MALLA COMPLEJA)', piezas: String(meta.piezas),
    nota: (meta.nota ? meta.nota + ' · ' : '') + 'vistas envolventes — ver features en el JSON',
    escala: scaleLabel(num, den), fecha: meta.fecha ?? '—', numPlano: meta.numPlano ?? 'CAD-01',
  });
  return sh;
}

// tras el bundle, import.meta.url apunta al bundle: usar rutas desde el cwd
// (el script se corre desde cad/, como las pruebas).
const jsonPath = process.env.DOC || 'ensambles/transfer_rodillos_90.json';
const doc = JSON.parse(readFileSync(jsonPath, 'utf8'));
// sin SELLO de compuertas no se emite nada (CELULA_DISENO regla 11)
exigirSello(doc, 'planos_fab');
const outDir = process.env.OUTDIR || 'ensambles/planos_transfer90';
// Identidad del ensamble: permite apuntar el generador a cualquier documento
// sin dejar rotulado el transfer90 en el cajetin, el PDF y el despiece.
const docFile = jsonPath.split('/').pop();
const docBase = docFile.replace(/\.json$/, '');
const docTitulo = doc.meta?.nombre || doc.title || doc.titulo || docBase;
const docPref = (process.env.PREFIJO || docBase.slice(0, 2)).toUpperCase();
mkdirSync(outDir, { recursive: true });

// Planos externos: piezas cuyo plano autoritativo vive en OTRA familia (los
// ejes y el rodillo de retorno → planos_ejes, LBP530-EJ-nn, declarados en
// dims.ejes). A esas piezas NO se les emite lámina propia: dos números de
// plano para una misma pieza rompen la numeración única del proyecto.
const dimsPathFab = process.env.DIMS || 'ensambles/lbp530_dims.json';
const dimsFab = existsSync(dimsPathFab) ? JSON.parse(readFileSync(dimsPathFab, 'utf8')) : {};
const EXTERNOS = [];
{
  const je = dimsFab.ejes || {};
  if (je.motriz?.plano) EXTERNOS.push({ re: /EJE MOTRIZ/, plano: je.motriz.plano });
  if (je.tensor?.plano) EXTERNOS.push({ re: /EJE TENSOR/, plano: je.tensor.plano });
  if (je.retorno?.plano) EXTERNOS.push({ re: /Rodillo retorno/, plano: je.retorno.plano });
}
const planoExterno = (n) => EXTERNOS.find(x => x.re.test(n))?.plano || null;

// --- Clasificación: piezas NORMALIZADAS (compradas, solo van al despiece) ----
const NORMA = [
  { re: /Rodamiento 6004/, norma: 'DIN 625 · 6004-2RS (20×42×12)' },
  { re: /Rodamiento 6901/, norma: 'DIN 625 · 6901-2RS (12×24×6)' },
  { re: /Rodamiento 6205/, norma: 'DIN 625 · 6205-2RS (25×52×15)' },
  { re: /Chumacera UCFL204/, norma: 'Unidad de brida UCFL204 · bore Ø20' },
  { re: /Perno hexagonal M10/, norma: 'DIN 933 · M10 + golilla DIN 125' },
  { re: /Seeger DIN 471-12/, norma: 'DIN 471 · Ø12' },
  { re: /Seeger DIN 471-25/, norma: 'DIN 471 · Ø25' },
  { re: /Seeger DIN 471-8/, norma: 'DIN 471 · Ø8' },
  { re: /Seeger DIN 472-52/, norma: 'DIN 472 · Ø52' },
  { re: /Buje bronce/, norma: 'Buje sinterizado SAE 841' },
  { re: /Buje SIT-LOCK|SIT-LOCK/, norma: 'SIT-LOCK CAL 1 · 25×34' },
  { re: /Golilla plana DIN 125|Golilla plana Ø/, norma: 'DIN 125' },
  { re: /Golilla de presión DIN 127/, norma: 'DIN 127' },
  { re: /Tuerca .*M10|Tuerca hex M10/, norma: 'DIN 934 · M10' },
  { re: /Tuerca tensora M12|Tuerca M12/, norma: 'DIN 934 · M12' },
  { re: /Chaveta/, norma: 'DIN 6885 A 8×7' },
  { re: /Rótula/, norma: 'DIN ISO 12240-4 · M10' },
  { re: /Grasera/, norma: 'DIN 71412 · M6' },
  { re: /Electroválvula/, norma: 'Válvula 5/2 24VDC · racor Ø8' },
  { re: /Motorreductor/, norma: 'Motorreductor ~0.18 kW i≈6.3' },
  { re: /Cilindro ISO 6432/, norma: 'ISO 6432 · Ø32 c.10' },
  { re: /Pasador guía/, norma: 'Pasador rectificado Ø8 m6' },
  { re: /Golilla de empuje/, norma: 'Arandela de empuje nylon Ø22×1.5' },
];
// piezas que son AGRUPACIONES de normalizadas (no llevan plano propio):
const SOLO_DESPIECE = [/^MÓVIL · Fijación eje/];

// Material sugerido por tipo de pieza fabricada
function materialDe(name, part) {
  // PRIMERO lo que declara el propio generador en el desarrollo (flat.material
  // es capa user con procedencia); el mapa por nombre queda de respaldo.
  // Ante la duda se rotula POR DEFINIR en vez de inventar un material.
  if (part?.flat?.material) return part.flat.material.replace(/ — .*$/, '');
  if (/vulcaniz/i.test(name)) return 'Vulcanizado NBR sobre tubo (dureza 75 ShA)';
  // rodillo de retorno: la espec vive en el nombre/EJ-04 — repetirla, no negarla
  // (el panel cazó un «POR DEFINIR» contradiciendo la designación A513 Ø63,5×3,0)
  if (/Rodillo retorno/i.test(name)) return 'Tubo A513 Ø63,5×3,0 (espesor POR CONFIRMAR vs stock) + cabezales y eje SAE 1045';
  if (/Canal|Placa|Puente|Palanca|Soporte|Horquilla|Ménsula|Portarodamiento|Riostra|Travesaño/.test(name)) return 'Acero S275JR';
  if (/Eje|EJE|Pasador|Cubo/.test(name)) return 'Acero SAE 1045 (calibrado — ver lámina EJ)';
  if (/Vulcanizado/.test(name)) return 'Vulcanizado NBR sobre tubo (dureza 75 ShA)';
  if (/Tubo de acero/.test(name)) return 'Tubo St37 Ø51 (bore Ø42 H7)';
  if (/Rodillo/.test(name)) return 'Tubo St37 + vulcanizado NBR';
  if (/Tambor/.test(name)) return 'Acero St37 (rolado + soldado)';
  if (/Tensor|Polea de retorno/.test(name)) return 'Aluminio 6061-T6';
  if (/Banda/.test(name)) return 'Banda plana nitrilo/poliéster 3 mm';
  if (/Separador|Descanso|Nivelador|Acople/.test(name)) return 'Bronce / acero';
  return 'Acero (grado en la lámina de la pieza)';
}

// Designación legible: quita sufijos de posición/lado para agrupar idénticas.
// Un grupo entre paréntesis se considera POSICIÓN (se borra) si no contiene
// ninguna palabra real de 3+ letras tras quitar los marcadores de eje X/Y
// (así "(+X)", "(0,78)", "(, y=-250)" se van, pero "(llanta + tapas + cubo)",
// "(chaveteros 8 DIN 6885)", "(serpentín)" se conservan).
function designacion(name) {
  let s = name.replace(/^(MÓVIL|FIJO) · /, '');
  s = s.replace(/\s*\([^)]*\)/g, (m) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(m.replace(/[XY]/g, '')) ? m : '');
  s = s.replace(/\s*línea y=-?\d+/g, '')
       .replace(/\s*y=-?\d+/g, '').replace(/\s*x=-?\d+/g, '')
       .replace(/\s*[+-][XY]\b/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

// Firma geométrica local (agrupa piezas idénticas, incluidas las espejo L/R:
// usa la designación normalizada — sin sufijos de posición — + las funciones,
// ignorando la traslación absoluta `at`).
function firma(part) {
  const fs = part.features.map(f => {
    const p = Object.entries(f.params || {}).map(([k, v]) =>
      `${k}:${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`).sort().join(',');
    return `${f.shape}|${f.op}|${p}`;
  });
  return `${designacion(part.name)}||${fs.join(';')}`;
}

// --- Agrupar ----------------------------------------------------------------
const grupos = new Map();
for (const part of doc.parts) {
  const key = firma(part);
  let g = grupos.get(key);
  if (!g) grupos.set(key, g = { part, cant: 0, name: part.name, nombres: new Set() });
  g.cant++;
  g.nombres.add(part.name);
}

// Los generadores del repo rotulan cada pieza con su naturaleza: "FAB · ..."
// para lo que se fabrica y "NORM · ..." para lo comprado. Ese prefijo manda
// sobre las regex de NORMA, que estaban afinadas a los nombres del transfer90
// y no reconocian los de otros equipos: una pieza comprada mal clasificada se
// lleva un plano y, peor, obliga a construir su malla (los rodillos de la
// banda LBP son 1164 features).
const prefFAB  = (n) => /^FAB\s*[·.-]/.test(n);
const prefNORM = (n) => /^NORM\s*[·.-]/.test(n);
// Para piezas con prefijo NORM la designación de la PIEZA es la norma: el
// mapa NORMA quedó afinado al transfer90 y le inventaba un motorreductor
// '~0.18 kW' al NMRV-P075 de 0,55 kW (hallazgo del panel).
const esNorma = (n) => prefNORM(n) ? { norma: n.replace(/^NORM\s*[·.-]\s*/, '').slice(0, 60) } : (prefFAB(n) ? null : NORMA.find(x => x.re.test(n)));
const esSoloDespiece = (n) => prefFAB(n) ? false : SOLO_DESPIECE.some(re => re.test(n));

// Orden de despiece: canal/estructura, elevación, placas, rodillos, transmisión
const grupoOrden = (n) => {
  if (/Canal|Ala|Nivelador/.test(n)) return 0;
  if (/Cilindro|Palanca|Soporte|Horquilla|Puente|Rótula|Perno|Electro|Pasador/.test(n)) return 1;
  if (/Placa|Fijación/.test(n)) return 2;
  if (/Rodillo|Eje rodillo|Golilla|Tuerca hex|Rodamiento 6901|Seeger DIN 471-12/.test(n)) return 3;
  return 4; // transmisión (tambor, poleas, banda, motor, acople, descansos)
};
const lista = [...grupos.values()].sort((a, b) =>
  grupoOrden(a.name) - grupoOrden(b.name) || a.name.localeCompare(b.name));

// --- Emitir láminas de las FABRICADAS + construir despiece --------------------
// numeración única: el ÍTEM lo asigna el BOM; aquí solo se LEE (la cadena
// corre planos_fab -> bom_equipo -> planos_fab de nuevo — ver cadena_lbp530.sh)
const bomPathFab = join(outDir, `bom_${docBase}.json`);
const itemBom = new Map();
if (existsSync(bomPathFab)) {
  const stripP = (n) => n.replace(/^(FAB|NORM)\s*[·.-]\s*/, '');
  const filasBom = JSON.parse(readFileSync(bomPathFab, 'utf8')).filas;
  for (const part of doc.parts) {
    const f = filasBom.find(q => q.item_desc === stripP(part.name));
    if (f) itemBom.set(part.name, f.item);
  }
} else console.warn('  AVISO: sin bom_' + docBase + '.json — el despiece sale sin ÍTEM (correr la cadena completa)');
const despiece = [];
const fabSheets = [];
let itemN = 0, planoN = 0;
const M4 = new THREE.Matrix4();
const fecha = process.argv[2] || '—';   // fecha inyectada (por reproducibilidad)

// TIPS DE FABRICACIÓN por tipo de pieza (directriz Sergio 12-08): el plano
// le habla al maestro — qué hacer PRIMERO, qué no tocar y qué arruina la pieza
const tipsDe = (n) => {
  if (/Placa lateral/.test(n)) return [
    'Verificar barrenos contra _agujeros.csv ANTES de plegar — un barreno corrido no se recupera.',
    'Pliegue único del ala a 90° en plegadora ≥ largo de pieza (ver _LEEME: cama ≥ 3 m).',
    'Las MUESCAS del ala son ventanas del lazo de banda: no limar ni suavizar sus bordes.',
    'Despuntar escoria de láser antes de plegar; proteger la cara exterior (queda a la vista).',
  ];
  if (/Mecha porta-chumacera/.test(n)) return [
    'ESCARIAR el paso de muñón Ø40 DESPUÉS de pintura (la capa cambia el ajuste).',
    'Presentar APERNADA 6×M10 sobre el alma y verificar coaxialidad de los 4 Ø12 de brida.',
    'Roscar M6 de montaje de guarda con la broca Ø5 del plano (no taladrar a Ø6).',
  ];
  if (/Guarda .* costado/.test(n)) return [
    'Perfil en C: plegar pestaña de fondo y tira superior a 90° (chapa 2,0 — R2).',
    'Presentar sobre los espárragos de la mecha CON separadores antes de pintar.',
    'Puerto Ø25: montar OJAL CIEGO — no queda abierto (punta de eje gira a 10 mm).',
  ];
  if (/Guarda .* fondo/.test(n)) return [
    'Un pliegue: la tapa de extremo sube 90° (chapa 2,0 — R2).',
    'Monta M6×12 bajo las pestañas de ambos costados; drenaje Ø8 queda al eje.',
  ];
  if (/Cabezal porta-nosebar/.test(n)) return [
    'La grilla 18×Ø9 es del nosebar Movex (cols 15,9/75,9/135,9): verificar contra _agujeros.csv.',
    'Tuercas M8 van por la cara INTERIOR — dejar acceso antes de apernar los clips.',
  ];
  if (/Portacarril/.test(n)) return [
    'Soldar los clips en PLANTILLA a 90°±0,5° ANTES de pintar; tapar roscas al pintar.',
    'La cara superior apoya la pletina del carril: sin salpicadura ni sobre-espesor de pintura.',
  ];
  if (/Travesaño TR_S/.test(n)) return [
    'Perfil C en 2 pliegues; soldar orejas en plantilla con luz interior EXACTA entre almas (482).',
    'Orejas: pieza pequeña soldada en taller (permitido Rev.C) — el conjunto va APERNADO 2×M6.',
  ];
  if (/Bracket soporte/.test(n)) return [
    'Ranuras CRUCIFORMES, ARCO R52 y bloqueos ±60° salen del láser: NO retaladrar — son la regulación.',
    'UN pliegue de 90° (placa↔ala). Comprobar cruciformes (±21,6/±73,7) contra los Ø9 del ala del canal.',
  ];
  if (/Columna soporte/.test(n)) return [
    'Plegar el canal C 77×38 en 2 pliegues; Ø11, ranura 11×110 y ranura de pestaña salen del láser.',
    'No pintar con sobre-espesor el alma exterior: la tira BR_3002 desliza sobre ella.',
  ];
  if (/Tira telescópica/.test(n)) return [
    'Rebabar TODAS las ranuras 11×20: el ajuste de altura desliza por ellas bajo carga.',
    'Soldar la pata B_004A a escuadra (90°±0,5°) ANTES de pintar (soporte a piso: permitido).',
  ];
  if (/Travesaño de patas/.test(n)) return [
    'Canal C 71×38 en 2 pliegues, alma ARRIBA; pestañas 11×3 del alma entran en la ranura de cada columna.',
    'Presentar ENCAJADO dentro de ambas columnas, aplomar el marco y soldar filete 3 perimetral (taller).',
  ];
  return [];
};
// tips ARRIBA-IZQUIERDA dentro del marco (a la derecha se salían de la hoja —
// hallazgo del panel) — zona libre en los desarrollos (la pieza va centrada)
const ponTips = (sh, lineas) => {
  if (!lineas.length) return;
  let y = sh.H - 15;
  sh.text('TIPS DE FABRICACIÓN', 24, y, 2.6, 'L'); y -= 4.2;
  for (const l of lineas) { sh.text('· ' + l, 24, y, 2.15, 'L'); y -= 3.6; }
};

// PROYECTO corto para el cajetín (el título completo se truncaba con «…»)
const proyectoCorto = String(docTitulo).split('·')[0].trim().toUpperCase();

// mapa pieza → plano DXF de corte (LBD/GTD-nn), emitido por dxf_flat en
// _planos.json — la lámina de desarrollo REMITE ahí para las posiciones 1:1
const planoDXF = (() => {
  const p = join(outDir, `dxf_${docBase}`, '_planos.json');
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; }
})();

// desarrollos IDÉNTICOS entre piezas del MISMO equipo (placa libre vs motriz):
// UN solo plano con la cantidad total y nota de espejo — dos láminas iguales
// con nombre distinto mandan al taller a adivinar (grave del panel)
const firmaFlat = (f) => JSON.stringify([f.t, f.contorno, f.cortes?.circles, f.pliegueInfo]);
const vistosFlat = new Map();   // firma → {plano, sheet, cant, desig}

for (const g of lista) {
  itemN++;
  const norma = esNorma(g.name);
  const fabricada = !norma && !esSoloDespiece(g.name);
  let desig = designacion(g.name);
  // desambiguar los dos ejes cantiléver (tensor lleva rosca M12; retorno no)
  if (/Eje cantiléver/.test(desig)) {
    desig += g.part.features.some(f => /Rosca M12/.test(f.name)) ? ' (tensor)' : ' (retorno)';
  }
  let material = norma ? norma.norma : materialDe(g.name, g.part);
  if (/Rodillos LBP/.test(g.name)) material += ' — JUEGO completo de la banda (viene armado, no se compra aparte)';
  const externo = fabricada ? planoExterno(g.name) : null;
  let plano = externo || '';
  let notaEspejo = '';
  if (fabricada && !externo) {
    const firma = g.part.flat ? firmaFlat(g.part.flat) : null;
    const previo = firma && vistosFlat.get(firma);
    if (previo) {
      // mismo desarrollo ya emitido: reusar el plano y anotar la lámina única
      plano = previo.plano;
      notaEspejo = ` — mismo desarrollo que ${previo.desig} (${previo.plano}); 1 EN ESPEJO`;
      previo.sheet.text(
        `CANT TOTAL ${previo.cant + g.cant}: ${previo.cant} según dibujo (${previo.desig}) + ${g.cant} EN ESPEJO (${desig}) — espejos en _LEEME de los DXF`,
        24, 12, 2.6, 'L');
    } else {
      planoN++;
      plano = `${docPref}-${String(planoN).padStart(2, '0')}`;
      const geom = buildPartGeometry(g.part);
      const tris = geom.attributes.position.count / 3;
      const meta = {
        rev: doc.meta?.revision, revCausa: (doc.meta?.revision_causa || '').slice(0, 52),
        designacion: desig, piezas: g.cant, proyecto: proyectoCorto,
        fuente: 'diseño paramétrico — capa user', numPlano: plano, fecha,
        nota: `Material: ${material} · tol. gral. ISO 2768-mK${masaDe(g.part) ? ` · MASA ${masaDe(g.part)} kg/u` : ''}`,
        dxfRef: planoDXF[g.part.name] || planoDXF[g.name] || '',
      };
      try {
        // malla grande: la extracción de aristas no escala. Placas peine (boceto
        // dominante) → perfil analítico con perforaciones; otras mallas grandes
        // (canal, chumaceras) → envolvente; el resto → plano completo con vistas.
        let sheet = null;
        if (g.part.flat) {
          sheet = buildFlatSheet(g.part.flat, meta);
          // DISTRIBUCIÓN (Sergio 18-08): el sobrante de lámina deja de ir en
          // blanco — miniatura isométrica de la pieza PLEGADA junto a su
          // desarrollo, para que el taller vea la forma final sin ir al GA
          const ly = sheet._flatLayout;
          const spare = ly ? ly.W - 10 - (ly.ox + ly.w) : 0;
          // sólo piezas CON pliegues: en una placa plana la miniatura es el
          // mismo rectángulo del desarrollo, no agrega lectura
          if (ly && spare >= 110 && g.part.flat.pliegueInfo?.length) {
            try {
              const mini = new IsoScene();
              mini.add(g.part, { paint: true });
              const fig = mini.project({ dir: [-1, 1, -0.62], widthMM: Math.min(spare - 26, 170), res: 900, shadow: true });
              const mx = ly.ox + ly.w + 16;
              const my = ly.oy + ly.h - fig.heightMM;   // banda derecha: mini ARRIBA, detalle abajo
              drawFigure(sheet, fig, mx, my);
              sheet.text('PIEZA PLEGADA (referencia visual — cotas en el desarrollo)', mx, my - 5, 2.8, 'L');
            } catch (e) { console.warn(`  ! sin miniatura plegada: ${desig} (${e.message})`); }
          }
        }
        else if (tris > 12000) sheet = plateSheet(g.part, meta) || simpleSheet(geom, meta);
        else sheet = buildSheet([{ geometry: geom, matrixWorld: M4 }], 'paper', meta);
        ponTips(sheet, tipsDe(g.name));
        fabSheets.push(sheet);
        if (firma) vistosFlat.set(firma, { plano, sheet, cant: g.cant, desig });
      } catch (e) {
        console.warn(`  ! sin geometría para plano: ${desig} (${e.message})`);
        planoN--; plano = '';
      }
    }
  }
  despiece.push({
    item: itemBom.get(g.name) ?? '—', designacion: desig, nombres: [...g.nombres], cant: g.cant,
    tipo: fabricada ? 'FABRICADA' : (norma ? 'NORMALIZADA' : 'CONJUNTO'),
    material_norma: material + notaEspejo, plano: plano || '—',
  });
}
// orden de lectura del BOM: por ÍTEM numérico, sin número al final (panel)
despiece.sort((a, b) => (a.item === '—' ? 1e9 : a.item) - (b.item === '—' ? 1e9 : b.item));

// --- Portada + despiece (láminas A3 propias) ---------------------------------
const A3 = () => new Sheet('A3', 420, 297, 1, 1, 1);

function portada() {
  const sh = A3();
  sh.frame();
  const cx = 210;
  sh.text('PLANOS DE FABRICACIÓN', cx, 235, 9, 'C');
  sh.text(String(docTitulo).toUpperCase(), cx, 222, 4.2, 'C');
  sh.line([70, 215], [350, 215], 'NORMA');
  const filas = [
    ['Ensamble', docFile + ' (formato foto3d-cad, capa user)'],
    ['Piezas totales', String(doc.parts.length)],
    ['Ítems distintos', String(despiece.length)],
    ['Planos de fabricación', String(planoN) + '  (' + docPref + '-01 … ' + docPref + '-' + String(planoN).padStart(2, '0') + ')'],
    ['Normalizadas / conjuntos', String(despiece.filter(d => d.tipo !== 'FABRICADA').length)],
    ['Norma de láminas', 'ISO 5457 (marco) · 7200 (cajetín) · 129 (cotas) · 5456-2 (1er diedro)'],
    ['Tolerancia general', 'ISO 2768-mK salvo indicación; ajustes por asiento en cada plano'],
    ['Unidades', 'mm · proyección primer diedro'],
    ['Fecha', fecha],
  ];
  let y = 195;
  for (const [k, v] of filas) {
    sh.text(k.toUpperCase(), 70, y, 3.0, 'L');
    sh.text(v, 165, y, 3.2, 'L');
    y -= 9;
  }
  sh.text('ConveyOne — Célula de Diseño · modelo paramétrico (capa user), no medición.',
    cx, 70, 2.6, 'C');
  sh.text('Verificar dimensiones nominales con la unidad real antes de cortar/mecanizar.',
    cx, 64, 2.6, 'C');
  sh.text(`${proyectoCorto} · PLANOS DE FABRICACIÓN — portada ${docPref}-00 · ${fecha} · ConveyOne`, cx, 14, 2.5, 'C');
  return sh;
}

// Tabla de despiece paginada (una lámina A3 por bloque de filas)
function despieceSheets() {
  const sheets = [];
  const cols = [
    ['ÍTEM', 18, 'C'], ['DESIGNACIÓN', 150, 'L'], ['CANT', 16, 'C'],
    ['TIPO', 30, 'C'], ['MATERIAL / NORMA', 120, 'L'], ['PLANO', 26, 'C'],
  ];
  const x0 = 20, rowH = 7.2, headY = 250;
  const totalW = cols.reduce((a, c) => a + c[1], 0);
  const perPage = 26;
  // el texto se RECORTA al ancho de su columna (el panel encontró designaciones
  // pisando CANT/TIPO y cantidades ilegibles debajo) — 2 renglones si no cabe
  const quepa = (s, w, h) => {
    const maxC = Math.max(4, Math.floor((w - 3) / (h * 0.52)));
    s = String(s);
    if (s.length <= maxC) return [s];
    const l1 = s.slice(0, maxC);
    const l2 = s.slice(maxC, maxC * 2 - 1);
    return [l1, l2.length ? l2 + (s.length > maxC * 2 - 1 ? '…' : '') : ''].filter(Boolean);
  };
  for (let p = 0; p * perPage < despiece.length; p++) {
    const sh = A3();
    sh.frame();
    const np = Math.ceil(despiece.length / perPage);
    sh.text(`DESPIECE / LISTA DE MATERIALES  (${p + 1}/${np})`, 210, 265, 5, 'C');
    const drawRow = (y, vals, h = 2.6) => {
      let cx = x0;
      for (let i = 0; i < cols.length; i++) {
        const [, w, al] = cols[i];
        const tx = al === 'C' ? cx + w / 2 : cx + 2;
        const lineas = quepa(vals[i], w, h);
        lineas.forEach((l, k) => sh.text(l, tx, y + 1.4 + (lineas.length > 1 ? 1.6 : 0) - k * 3.0, h, al === 'C' ? 'C' : 'L'));
        cx += w;
      }
    };
    sh.rect(x0, headY - rowH, totalW, rowH, 'NORMA');
    drawRow(headY - rowH + 1.4, cols.map(c => c[0]), 2.4);
    let y = headY - rowH;
    for (const r of despiece.slice(p * perPage, (p + 1) * perPage)) {
      y -= rowH;
      sh.rect(x0, y, totalW, rowH, 'FINA');
      drawRow(y + 1.4, [r.item, r.designacion, r.cant, r.tipo, r.material_norma, r.plano], 2.4);
    }
    // líneas verticales de columna
    let cx = x0;
    for (const [, w] of cols) { sh.line([cx, y], [cx, headY], 'FINA'); cx += w; }
    sh.line([cx, y], [cx, headY], 'FINA');
    // pie de lámina (el panel: portada y BOM iban sin identificación)
    sh.text(`${proyectoCorto} · PLANOS DE FABRICACIÓN — lámina ${docPref}-DP${p + 1} · ${fecha} · ConveyOne`, 210, 14, 2.5, 'C');
    sheets.push(sh);
  }
  return sheets;
}

// Filas del BOM que NO tienen pieza en el ensamble (piezas menores SOLDADAS:
// clips, orejas — viven como feature dentro de la madre). Sin esto salían en
// el BOM pero NO en la lámina de despiece, que es la que lee el taller.
if (existsSync(bomPathFab)) {
  const yaEnDespiece = new Set(despiece.map(d => d.designacion.replace(/^(FAB|NORM)\s*[·.-]\s*/, '')));
  for (const f of JSON.parse(readFileSync(bomPathFab, 'utf8')).filas) {
    if (f.tipo !== 'FABRICADA' || yaEnDespiece.has(f.item_desc)) continue;
    if (!/pieza menor SOLDADA/i.test(f.item_desc)) continue;
    despiece.push({
      item: f.item, designacion: 'FAB · ' + f.item_desc, nombres: [f.item_desc],
      cant: f.cant_equipo, tipo: 'FABRICADA',
      material_norma: f.material, plano: 'ficha soldadura GA',
    });
  }
  despiece.sort((a, b) => (Number(a.item) || 999) - (Number(b.item) || 999));
}

const todas = [portada(), ...despieceSheets(), ...fabSheets];
const pdf = exportSheetsPDF(todas, 'planos_fabricacion_' + docBase + '.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));

writeFileSync(join(outDir, `_despiece_${docBase}.json`), JSON.stringify({
  proyecto: docTitulo,
  archivo: docFile,
  fecha,
  total_piezas: doc.parts.length,
  items_distintos: despiece.length,
  planos_fabricacion: planoN,
  despiece,
}, null, 2));

console.log(`OK: PDF de ${todas.length} páginas (portada + ${despieceSheets().length} despiece + ${planoN} planos) → ${join(outDir, pdf.name)}`);
console.log(`    ${despiece.length} ítems, ${doc.parts.length} piezas`);
