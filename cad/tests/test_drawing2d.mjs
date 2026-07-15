// Pruebas del exportador de planos (DXF/PDF en navegador) con geometría
// sintética conocida. Verifica escala real del DXF, estructura del PDF y
// contenido del cajetín. Se ejecuta en Node (bundleado con esbuild):
//   npx esbuild tests/test_drawing2d.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_drawing2d.bundle.mjs
//   node /tmp/test_drawing2d.bundle.mjs
import { newDoc, newPart, makeBoxFeature, buildPartGeometry } from '../js/model.js';
import { exportDrawingDXF, exportDrawingPDF, collectEdgeSegments } from '../js/drawing2d.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${detail}`); }
};

const latin1 = (bytes) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');

// pieza en L: caja 120×60×20 + caja 20×60×70 encima (bbox 120×60×90).
// makeBoxFeature ancla por el centro de la BASE (at[2] = z inferior).
const doc = newDoc();
const part = newPart(doc, 'Soporte L-120');
part.features.push(makeBoxFeature(120, 60, 20, [60, 30, 0]));
part.features.push(makeBoxFeature(20, 60, 70, [10, 30, 20]));
const geometry = buildPartGeometry(part);
const parts = [{ geometry, name: part.name }];
const meta = { designacion: part.name, piezas: 1 };

console.log('— aristas y vistas —');
const pts = collectEdgeSegments(parts);
check('hay aristas características', pts.length >= 2 && pts.length % 2 === 0, `pts=${pts.length}`);

console.log('— DXF —');
const dxf = exportDrawingDXF(parts, meta);
const dtxt = latin1(dxf.data);
check('nombre y mime', dxf.name === 'plano-cad.dxf' && dxf.mime === 'application/dxf');
check('R12 con codepage', dtxt.includes('AC1009') && dtxt.includes('ANSI_1252'));
check('termina en EOF', dtxt.trimEnd().endsWith('EOF'));
for (const ly of ['NORMA', 'FINA', 'VISIBLE', 'COTAS', 'TEXTO']) {
  check(`capa ${ly}`, dtxt.includes(`\r\n2\r\n${ly}`) || dtxt.includes(`\r\n8\r\n${ly}`));
}
// el guion largo (—) va codificado a cp1252 (0x97) dentro del DXF
check('cajetín con marca y campos', ['foto3d', 'DESIGNACIÓN', 'ESCALA', 'PROYECCIÓN \x97 PRIMER DIEDRO',
  'CAD EN MM (CAPA USER)', 'Nº DE PLANO'].every((s) => dtxt.includes(s)));
check('designación en el cajetín', dtxt.includes('Soporte L-120'));
check('cotas reales 120/90/60', ['120', '90', '60'].every((v) => dtxt.includes(`\r\n1\r\n${v}\r\n`)));

// escala real: extremos de las LINEs de la capa VISIBLE = bbox real por vista
const lines = [];
const rows = dtxt.split('\r\n');
for (let i = 0; i < rows.length; i++) {
  if (rows[i] === 'LINE' && rows[i + 2] === 'VISIBLE') {
    const v = {};
    for (let j = i + 3; j < i + 15 && j < rows.length; j += 2) {
      if (rows[j] === '0') break;
      v[rows[j]] = parseFloat(rows[j + 1]);
    }
    lines.push(v);
  }
}
const xs = lines.flatMap((v) => [v['10'], v['11']]);
const spanX = Math.max(...xs) - Math.min(...xs);
check('DXF a escala real (alzado+perfil+iso en mm reales)', lines.length > 10 && spanX > 120,
  `spanX=${spanX.toFixed(1)}`);

console.log('— PDF —');
const pdf = exportDrawingPDF(parts, meta);
const ptxt = latin1(pdf.data);
check('nombre y mime', pdf.name === 'plano-cad.pdf' && pdf.mime === 'application/pdf');
check('cabecera y cierre', ptxt.startsWith('%PDF-1.4') && ptxt.trimEnd().endsWith('%%EOF'));
check('página con MediaBox y Helvetica', ptxt.includes('/MediaBox') && ptxt.includes('/Helvetica')
  && ptxt.includes('/WinAnsiEncoding'));
check('contenido con trazos y textos', ptxt.includes(' m ') && ptxt.includes(' Tj ET'));
check('xref válido', /startxref\n\d+\n%%EOF/.test(ptxt));
const media = ptxt.match(/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
check('lámina ISO apaisada', media && +media[1] > +media[2]);

console.log('— sin geometría —');
let threw = false;
try { exportDrawingDXF([{ geometry, matrixWorld: null }].slice(0, 0), meta); } catch { threw = true; }
check('lanza error claro sin piezas', threw);

console.log(`\n${pass}/${pass + fail} pruebas OK`);
if (fail) process.exit(1);
