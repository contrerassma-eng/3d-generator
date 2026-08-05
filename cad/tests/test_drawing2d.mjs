// Pruebas del exportador de planos (DXF/PDF en navegador) con geometría
// sintética conocida. Verifica escala real del DXF, estructura del PDF y
// contenido del cajetín. Se ejecuta en Node (bundleado con esbuild):
//   npx esbuild tests/test_drawing2d.mjs --bundle --format=esm --platform=node \
//     --alias:three=./vendor/three.module.min.js --outfile=/tmp/test_drawing2d.bundle.mjs
//   node /tmp/test_drawing2d.bundle.mjs
import { newDoc, newPart, makeBoxFeature, buildPartGeometry } from '../js/model.js';
import { exportDrawingDXF, exportDrawingPDF, collectEdgeSegments,
         exportFlatDXF, exportFlatPDF } from '../js/drawing2d.js';
import { makeChapaBase, makePestana, flatPattern } from '../js/sheetmetal.js';

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

console.log('— desarrollo de chapa: hairline, ejes segmentados, cota de espesor —');
const doc2 = newDoc(); const ch = newPart(doc2, 'Chapa test');
const cb = makeChapaBase(100, 60, 'acero', 2, 2, 0.44);
ch.features.push(cb);
ch.features.push(makePestana(cb.id, 0, 25, 90, 2, 'arriba'));
const flat = flatPattern(ch);
const fpdf = latin1(exportFlatPDF(flat, { designacion: ch.name }).data);
check('PDF: geometría sin espesor de línea (0 w)', /\n0 w 1 J 1 j/.test(fpdf));
check('PDF: eje de plegado con línea segmentada', fpdf.includes('] 0 d'));
check('PDF: cota de espesor siempre', fpdf.includes('ESPESOR DE CHAPA e = 2 mm'));
const fdxf = latin1(exportFlatDXF(flat, { designacion: ch.name }).data);
check('DXF: capa PLIEGUE con tipo DASHED', fdxf.includes('DASHED') && !fdxf.includes('DASHDOT'));
check('DXF: nota de espesor', fdxf.includes('ESPESOR DE CHAPA e = 2 mm'));
// plano plegado de pieza de chapa: nota de espesor vía meta.espesor
const gch = buildPartGeometry(ch);
const dch = latin1(exportDrawingPDF([{ geometry: gch, name: ch.name }],
  { designacion: ch.name, piezas: 1, espesor: 2 }).data);
check('plano plegado: cota de espesor', dch.includes('ESPESOR DE CHAPA e = 2 mm'));

// El sondeo de grietas consulta un índice espacial (rejilla de 25 mm sobre las
// cajas de los triángulos) en vez de barrer todos los triángulos del plano. Si
// la rejilla perdiera candidatos cerca del borde de una celda, el resultado
// dependería de DÓNDE está la pieza. Así que debe ser invariante a traslación,
// incluso justo sobre los límites de celda.
console.log('— aristas: invariantes del índice espacial —');
const trasladar = (dx, dy, dz) => {
  const g2 = geometry.clone();
  g2.translate(dx, dy, dz);
  return collectEdgeSegments([{ geometry: g2, name: part.name }]);
};
const base = collectEdgeSegments([{ geometry, name: part.name }]);
const clave = (arr, dx = 0, dy = 0, dz = 0) => {
  const s = new Set();
  for (let i = 0; i < arr.length; i += 2) {
    const k = (p, ...d) => p.map((v, j) => (v - d[j]).toFixed(3)).join(',');
    const a = k(arr[i], dx, dy, dz), b = k(arr[i + 1], dx, dy, dz);
    s.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  }
  return s;
};
const mismos = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));
const kBase = clave(base);
for (const [dx, dy, dz] of [[12.5, -37.3, 8.1], [25, 50, 75], [-25, 0, 0], [0.001, 0.001, 0.001]]) {
  const t = trasladar(dx, dy, dz);
  check(`mismas aristas trasladando (${dx}, ${dy}, ${dz})`,
    t.length === base.length && mismos(kBase, clave(t, dx, dy, dz)),
    `base=${base.length / 2} trasladada=${t.length / 2}`);
}

// El sombreado de la isométrica cuesta una entidad rellena por triángulo: por
// encima de MAX_TRIS_SOMBRA la lámina sale sin relleno y se avisa. Una pieza
// suelta está muy por debajo del tope, así que debe seguir sombreada.
console.log('— tope de sombreado de la isométrica —');
const conSombra = latin1(exportDrawingDXF(parts, meta).data);
const sinSombra = latin1(exportDrawingDXF(parts, { ...meta, sombra: false }).data);
// Ojo: la capa SOMBRA se DECLARA siempre en la tabla LAYER; lo que hay que
// contar son las entidades que la usan (código 8).
const enSombra = (t) => t.split('\r\n8\r\nSOMBRA').length - 1;
check('por defecto una pieza suelta va sombreada', enSombra(conSombra) > 0,
  `entidades=${enSombra(conSombra)}`);
check('sombra:false quita el relleno', enSombra(sinSombra) === 0,
  `entidades=${enSombra(sinSombra)}`);
check('sin sombra siguen estando las aristas', sinSombra.includes('VISIBLE')
  && sinSombra.trimEnd().endsWith('EOF'));
check('sin sombra el archivo es menor', sinSombra.length < conSombra.length,
  `con=${conSombra.length} sin=${sinSombra.length}`);

console.log('— sin geometría —');
let threw = false;
try { exportDrawingDXF([{ geometry, matrixWorld: null }].slice(0, 0), meta); } catch { threw = true; }
check('lanza error claro sin piezas', threw);

console.log(`\n${pass}/${pass + fail} pruebas OK`);
if (fail) process.exit(1);
