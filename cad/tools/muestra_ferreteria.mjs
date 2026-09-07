#!/usr/bin/env node
// muestra_ferreteria.mjs — un apriete REAL a través de un paquete de chapas,
// isométrico, para MIRARLO (regla 12). Es la prueba de que la tornillería
// existe como sólido y calza donde dice el BOM.
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { IsoScene, drawFigure } from '../js/iso3d.mjs';
import { apriete, largoPara, medidaDeBarreno, PERNO, TUERCA, GOLILLA } from '../js/ferreteria.mjs';
import { nuevoRegistro, caja, cilindro, cobertura } from '../js/brep.mjs';
import { geomToCSG, csgToGeom } from '../js/csg.js';

const reg = nuevoRegistro();
const T1 = 6, T2 = 8, PAQ = T1 + T2;                 // dos chapas: 6 + 8 = 14 mm
const medida = medidaDeBarreno(11);                   // un Ø11 es un M10
const L = largoPara(medida, PAQ);
console.log(`barreno Ø11 → ${medida} · paquete ${PAQ} mm → perno ${medida}×${L} (largo comercial)`);
console.log(`  cabeza s=${PERNO[medida].s} k=${PERNO[medida].k} · tuerca m=${TUERCA[medida].m} · golilla Ø${GOLILLA[medida].d2}×${GOLILLA[medida].h}`);

// las dos chapas, con su barreno pasante
const placa = (z, t, w, d) => {
  const c = caja(reg, w, d, t, [0, 0, z + t / 2]);
  const br = cilindro(reg, [0, 0, z - 5], [0, 0, 1], 5.5, t + 10, 32);
  return csgToGeom(geomToCSG(c).subtract(geomToCSG(br)));
};
const p1 = placa(0, T1, 70, 50);
const p2 = placa(T1, T2, 70, 50);

// el apriete completo: golilla + perno + golilla + tuerca
const A = apriete(medida, [0, 0, -GOLILLA[medida].h], [0, 0, 1], PAQ);
console.log(`  conjunto: ${A.piezas.map(p => p.tipo).join(' + ')} · sobrante de rosca ${A.sobrante} mm`);

const sc = new IsoScene();
const mk = (nombre, geom, color) => ({ id: nombre, name: nombre, nombre, color, pos: [0,0,0], quat: [0,0,0,1], features: [], visible: true });
sc.add(mk('Chapa inferior e6', p1, '#9aa3a8'), { geometry: p1 });
sc.add(mk('Chapa superior e8', p2, '#b6bcc0'), { geometry: p2 });
for (const [i, pz] of A.piezas.entries()) {
  sc.add(mk(`${pz.tipo} ${i}`, pz.geom, pz.tipo === 'perno' ? '#5b6167' : '#7d848a'), { geometry: pz.geom });
}

const sh = new Sheet('A4', 297, 210, 1, 1, 1);
sh.frame();
sh.text(`APRIETE NORMALIZADO — barreno Ø11 · paquete ${PAQ} mm · ${medida}×${L}`, 18, 190, 4.5, 'L');
sh.text(`Perno ISO 4014 · Tuerca ISO 4032 · Golillas ISO 7089 — sobrante de rosca ${A.sobrante} mm`, 18, 183, 3.0, 'L');
let fig = sc.project({ dir: [-1, 1, -0.62], widthMM: 150, res: 1400 });
drawFigure(sh, fig, 30, 40, {});
writeFileSync('/tmp/qa/ferreteria.pdf', exportSheetsPDF([sh], 'f.pdf').data);
console.log('OK /tmp/qa/ferreteria.pdf');
