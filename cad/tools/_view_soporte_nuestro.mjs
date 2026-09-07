// render 4 vistas del soporte NUESTRO (estación central) para comparar con el 24V
import { IsoScene, drawFigure } from '../js/iso3d.mjs';
import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { readFileSync, writeFileSync } from 'node:fs';
const doc = JSON.parse(readFileSync('ensambles/lbp530_5m.json', 'utf8'));
const sel = /Bracket soporte|Columna soporte|Tira telescópica|Travesaño de patas/;
const cerca = (p) => Math.abs(p.pos[0] - 2500) < 400;
const sc = new IsoScene();
let n = 0;
for (const p of doc.parts) if (sel.test(p.name) && cerca(p)) { sc.add(p, {}); n++; }
console.log('piezas soporte:', n);
const sh = new Sheet('A3', 420, 297, 1, 1, 1);
const vistas = [
  [[-1, 1, -0.62], [0, 0, 1], 'ISO', 20, 160],
  [[1, 0, 0], [0, 0, 1], 'FRENTE (mirando +X)', 150, 160],
  [[0, 1, 0], [0, 0, 1], 'LADO (mirando +Y)', 280, 160],
  [[0, 0, -1], [0, 1, 0], 'PLANTA', 20, 20],
];
for (const [dir, up, nombre, ox, oy] of vistas) {
  const fig = sc.project({ dir, up, widthMM: 110, res: 900 });
  const k = Math.min(1, 120 / fig.heightMM, 110 / fig.widthMM);
  for (const s2 of fig.segments) { s2.a = s2.a.map(v => v * k); s2.b = s2.b.map(v => v * k); }
  for (const f of fig.fills || []) f.loops = f.loops.map(lp => lp.map(([x, y]) => [x * k, y * k]));
  fig.widthMM *= k; fig.heightMM *= k;
  drawFigure(sh, fig, ox, oy, {});
  sh.text(nombre, ox + fig.widthMM / 2, oy - 6, 3, 'C');
}
sh.frame();
const pdf = exportSheetsPDF([sh], 'sop.pdf');
writeFileSync(process.argv[2], Buffer.from(pdf.data));
console.log('OK', process.argv[2]);
