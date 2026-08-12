#!/usr/bin/env node
// dxf_flat.mjs — DXF 1:1 de corte láser por pieza de chapa del ensamble.
//
// El generador paramétrico (gen_lbp530.mjs) emite en cada pieza fabricada de
// chapa un bloque `flat` ANALÍTICO — contorno desarrollado, barrenos, líneas
// de plegado — calculado desde los mismos parámetros que producen el 3D. Este
// script NO hace ingeniería inversa de la malla: convierte ese bloque en
//   <OUTDIR>/dxf/<PN>_<pieza>.dxf     lámina DXF R12 con el desarrollo a 1:1
//   <OUTDIR>/dxf/_agujeros.csv        tabla de coordenadas de TODOS los barrenos
//   <OUTDIR>/dxf/_corte.csv           resumen por pieza para cotizar el láser
// La lámina reusa exportFlatDXF (drawing2d.js): capa VISIBLE = corte,
// PLIEGUE = eje de plegado, cajetín ISO 7200.
//
// Uso:  DOC=ensambles/lbp530_5m.json OUTDIR=ensambles/planos_lbp530 [PREFIJO=LB] \
//         node ensambles/dxf_flat.mjs

import { exportFlatDXF } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const docPath = process.env.DOC;
if (!docPath) throw new Error('falta DOC=<ensamble.json>');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
const docBaseDir = (process.env.DOC || 'doc').split('/').pop().replace(/\.json$/, '');
const outDir = join(process.env.OUTDIR || 'ensambles/planos_lbp530', 'dxf_' + docBaseDir);
rmSync(outDir, { recursive: true, force: true });   // panel: 3 corridas mezcladas con numeración en conflicto
mkdirSync(outDir, { recursive: true });
const pref = (process.env.PREFIJO || 'LB').toUpperCase();
const titulo = doc.meta?.nombre || docPath;

// Agrupar piezas idénticas por su firma de desarrollo (mismo flat = misma pieza).
const grupos = new Map();
for (const p of doc.parts) {
  if (!p.flat) continue;
  const sig = JSON.stringify(p.flat);
  const g = grupos.get(sig);
  if (g) { g.cant++; g.nombres.add(p.name); continue; }
  grupos.set(sig, { part: p, flat: p.flat, cant: 1, nombres: new Set([p.name]) });
}

const safe = (s) => s.replace(/^FAB\s*[·.-]\s*/, '').replace(/[^\wÁÉÍÓÚÑáéíóúñ]+/g, '_')
  .replace(/^_+|_+$/g, '').slice(0, 60);

let n = 0;
// nombre de CADA pieza del grupo → su plano de corte (los pares espejo y las
// idénticas comparten desarrollo: el BOM cruza por aquí, no recalcula nada)
const planosPorNombre = {};
const corte = [['plano', 'pieza', 'cant', 'material', 'espesor_mm', 'desarrollo_x_mm',
  'desarrollo_y_mm', 'barrenos', 'pliegues', 'k_factor', 'radio_mm', 'tolerancia'].join(',')];
const agujeros = [['plano', 'pieza', 'x_mm', 'y_mm', 'diametro_mm', 'rosca'].join(',')];

for (const g of [...grupos.values()].sort((a, b) => a.part.name.localeCompare(b.part.name))) {
  n++;
  const pn = `${pref}D-${String(n).padStart(2, '0')}`;
  const f = g.flat;
  const xs = f.contorno.map(q => q[0]), ys = f.contorno.map(q => q[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  // pares espejo: placas ±Y comparten flat — se corta igual, se pliega opuesto
  const espejo = /Placa lateral/.test(g.part.name) && g.cant === 2;
  const dxf = exportFlatDXF(f, {
    designacion: `${pn} · ${g.part.name.replace(/^FAB\s*[·.-]\s*/, '')} (x${g.cant}${espejo ? ' — 1 SEGÚN VISTA + 1 SIMÉTRICA: plegar por cara opuesta' : ''})`,
    proyecto: titulo, piezas: g.cant, numPlano: pn,
    nota: `${f.material} · e${f.t} · tol. gral. ISO 2768-mK · K=${f.k}`,
  });
  const fname = `${pn}_${safe(g.part.name)}.dxf`;
  writeFileSync(join(outDir, fname), Buffer.from(dxf.data));
  for (const nm of g.nombres) planosPorNombre[nm] = pn;
  corte.push([pn, `"${g.part.name}"`, g.cant, `"${f.material}"`, f.t,
    w.toFixed(1), h.toFixed(1), (f.cortes?.circles?.length || 0),
    (f.pliegueInfo?.length || 0), f.k, f.radio, 'ISO 2768-mK'].join(','));
  for (const c of (f.cortes?.circles || [])) {
    agujeros.push([pn, `"${g.part.name}"`, c.c[0].toFixed(2), c.c[1].toFixed(2),
      (c.r * 2).toFixed(2), c.rosca || ''].join(','));
  }
  console.log(`${pn}  x${g.cant}  ${g.part.name}  →  ${fname}  (${w.toFixed(0)}×${h.toFixed(0)}, ${(f.cortes?.circles?.length || 0)} barrenos)`);
}

writeFileSync(join(outDir, '_corte.csv'), corte.join('\n') + '\n');
writeFileSync(join(outDir, '_agujeros.csv'), agujeros.join('\n') + '\n');
writeFileSync(join(outDir, '_planos.json'), JSON.stringify(planosPorNombre, null, 1));

// LEEME para quien COTIZA Y CORTA (experiencia del receptor: el taller láser
// recibe la carpeta y debe poder cotizar sin llamar a preguntar)
const porMat = new Map();
for (const g of grupos.values()) {
  const k = `${g.flat.material} · e${g.flat.t}`;
  const cur = porMat.get(k) || { n: 0, pz: 0 };
  cur.n++; cur.pz += g.cant;
  porMat.set(k, cur);
}
writeFileSync(join(outDir, '_LEEME.txt'), [
  `PAQUETE DE CORTE LÁSER — ${titulo}`,
  `Generado: ${new Date().toISOString().slice(0, 10)} · ${n} desarrollos DXF (R12, unidades mm, escala 1:1)`,
  '',
  'CONTENIDO',
  '  *.dxf          un archivo por pieza distinta; capa VISIBLE = corte,',
  '                 capa PLIEGUE = ejes de plegado (línea segmentada, NO cortar)',
  '  _corte.csv     resumen por pieza para cotizar: cantidades, material,',
  '                 espesor, tamaño de desarrollo, nº de barrenos y pliegues',
  '  _agujeros.csv  coordenadas de TODOS los barrenos por pieza (verificación)',
  '',
  'MATERIALES DEL PAQUETE',
  ...[...porMat.entries()].map(([k, v]) => `  ${k} — ${v.n} piezas distintas, ${v.pz} unidades`),
  '',
  'NOTAS',
  '  · Los pares espejo comparten desarrollo: cortar la cantidad indicada y',
  '    plegar la mitad por la cara opuesta (indicado en el cajetín del DXF).',
  '  · Tolerancia general ISO 2768-mK. K-factor de plegado indicado por pieza.',
  '  · ROSCAS: la columna rosca de _agujeros.csv marca los barrenos que van',
  '    ROSCADOS tras el corte (el Ø listado es la broca). También rotulado en el DXF.',
  ...(([...grupos.values()].some(g => {
    const xs = g.flat.contorno.map(q => q[0]);
    return Math.max(...xs) - Math.min(...xs) > 3000;
  })) ? [
    '  · ATENCIÓN: hay desarrollos de más de 3 m — verificar formato de cama',
    '    (1500×6000) antes de cotizar; NO se autoriza empalme sin consultar.',
  ] : []),
  '  · Cotización y dudas: Conveyone SpA — indicar nº de plano (cajetín).',
].join('\n') + '\n');
console.log(`OK: ${n} desarrollos DXF + _corte.csv + _agujeros.csv en ${outDir}`);
if (!n) console.warn('AVISO: ninguna pieza trae bloque `flat` — generar el ensamble con un gen que lo emita.');
