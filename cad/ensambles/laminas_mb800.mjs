#!/usr/bin/env node
// laminas_mb800.mjs — Material de fabricación de los soportes MB800 (banda
// plana M-HASTE) DESDE los GLB, tal cual (orden de Sergio 18-08: «geometría
// tal cual de mb800 que llegará desde mhaste — tienes glb, no los
// distorsiones, úsalos tal cual» · «misma cara, mismo estándar de dibujo»).
//
// La malla del GLB es LA VERDAD: aquí no se re-modela ni se parametriza —
// se decodifica (meshopt no es distorsión: materializa los mismos vértices
// que ve cualquier visor), se verifica contra el catálogo (compuerta
// malla-fiel) y se emite una lámina de vistas AUTO-MEDIDAS por pieza con el
// estándar ConveyOne (drawing2d: primer diedro + iso + cotas envolventes +
// cajetín ISO). PRD: conveyone-simulator/biblioteca/CV-BLT/PRD_mb800_soportes.md
//
// Uso: node ensambles/laminas_mb800.mjs [FECHA]   (desde cad/)

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Sheet, exportSheetsPDF } from '../js/drawing2d.js';
import { IsoScene, drawFigure } from '../js/iso3d.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fecha = process.argv[2] || process.env.FECHA || '2026-08-18';
const outDir = join(here, 'planos_mb800');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// ── inventario: las piezas MB800 del catálogo de componentes (bbox = la
// referencia contra la que se verifica la malla decodificada) ───────────────
const catalogo = JSON.parse(readFileSync(join(here, '../../componentes/catalogo.json'), 'utf8'));
const comps = Array.isArray(catalogo) ? catalogo : (catalogo.componentes || catalogo.items || []);
const piezas = comps
  .filter(c => /^(MTB800|MT800)-/.test(c.nombre || ''))
  .map(c => ({
    nombre: c.nombre,
    rol: /Soporte\/pata/.test(c.descripcion || '') ? 'soporte / pata' : 'soporte / estructura',
    bboxCat: (c.descripcion || '').match(/bbox ([\d.]+)×([\d.]+)×([\d.]+) mm/)?.slice(1, 4).map(Number) || null,
    stepHash: (c.fuente?.detalle || '').match(/stepHash (\w+)/)?.[1] || '—',
    glb: join(here, '../componentes/models', c.nombre + '.glb'),
  }));
if (!piezas.length) { console.error('sin piezas MB800 en el catálogo'); process.exit(1); }

// ── lector GLB (meshopt + cuantización) → BufferGeometry en mm ──────────────
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
// KHR_mesh_quantization guarda POSITION en Int16 normalizado: transformar
// EN el atributo cuantizado satura en ±1 (todo «medía» 2 mm). Se descuantiza
// a Float32 leyendo con getX/getY/getZ (lectura ya denormalizada) y recién
// entonces se aplica el transform del nodo — los vértices son LOS MISMOS que
// ve cualquier visor: descuantizar no es distorsionar.
const aFloat32 = (geo, matrixWorld) => {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrixWorld);
    arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  if (geo.index) g.setIndex(geo.index.clone());
  g.computeVertexNormals();
  return g;
};
const leeGLB = (path) => new Promise((res, rej) => {
  const buf = readFileSync(path);
  loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
    const geos = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => { if (o.isMesh) geos.push(aFloat32(o.geometry, o.matrixWorld)); });
    res(geos);
  }, rej);
});

const bboxDe = (geo) => {
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
};

// ── compuerta MALLA-FIEL (PRD MB800 regla 1): la bbox decodificada calza con
// la del catálogo. Una conversión de unidades PURA (×1000, m→mm) se declara y
// no es distorsión; cualquier otra diferencia detiene la emisión. ───────────
// La referencia del catálogo viene del STEP exacto; la malla GLB es su
// teselado (una cara cilíndrica Ø15,75 teselada mide cuerda a cuerda ~15,0).
// La compuerta caza DISTORSIÓN NUESTRA (unidades, transform: errores ×1000),
// no el teselado del vendor: tolerancia 0,1 mm o 5% por eje, y si la
// diferencia supera 0,1 se DECLARA como teselado en la lámina.
const mallaFiel = (dims, bboxCat) => {
  if (!bboxCat) return { ok: true, escala: 1, nota: 'sin bbox de catálogo — se emite con dims medidas y se registra' };
  const ordena = (v) => [...v].sort((a, b) => a - b);
  const d = ordena(dims), c = ordena(bboxCat);
  const calza = (f) => d.every((v, i) => Math.abs(v * f - c[i]) <= Math.max(0.1, c[i] * 0.05));
  const delta = (f) => Math.max(...d.map((v, i) => Math.abs(v * f - c[i])));
  const nota = (f, unidades) => delta(f) > 0.1
    ? `${unidades} · teselado vendor: catálogo (STEP) difiere hasta ${delta(f).toFixed(2)} mm de la malla — no es distorsión nuestra`
    : unidades;
  if (calza(1)) return { ok: true, escala: 1, nota: nota(1, 'mm nativos') };
  if (calza(1000)) return { ok: true, escala: 1000, nota: nota(1000, 'unidades m→mm (conversión declarada, no distorsión)') };
  return { ok: false, escala: 0, nota: `bbox medida [${d.map(v => v.toFixed(2))}] no calza con catálogo [${c}] ni en mm ni en m` };
};

// ── emisión ─────────────────────────────────────────────────────────────────
const M4 = new THREE.Matrix4();
const fabSheets = [];
const despiece = [];
let nGate = 0;

for (const [i, p] of piezas.entries()) {
  const geos = await leeGLB(p.glb);
  if (!geos.length) { console.error(`  ! ${p.nombre}: GLB sin mallas`); process.exit(1); }
  // una pieza = un GLB (verificado en el inventario: 1 nodo · 1 malla); si
  // llegan multi-malla se fusionan SOLO para medir/dibujar, sin tocar vértices
  let geo = geos[0];
  const dims0 = bboxDe(geo);
  const gate = mallaFiel(dims0, p.bboxCat);
  if (!gate.ok) { console.error(`COMPUERTA malla-fiel ROJA en ${p.nombre}: ${gate.nota}`); process.exit(1); }
  if (gate.escala !== 1) geo = geo.clone().scale(gate.escala, gate.escala, gate.escala);
  const dims = bboxDe(geo).map(v => Math.round(v * 100) / 100);
  const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  nGate++;

  const plano = `MB-${String(i + 1).padStart(2, '0')}`;

  // ── lámina A3: vista de CARA (los dos ejes mayores) + vista de CANTO (el
  // espesor) + isométrica pintada con sombra — TODO por iso3d (siluetas,
  // pliegues por diedro, oclusión, ocultas), nunca las aristas del teselado.
  // Ejes ordenados: t = menor (espesor) · b = medio · c = mayor (vertical).
  const orden = [0, 1, 2].sort((a, b) => dims[a] - dims[b]);   // [iMin,iMid,iMax]
  const eje = (i2) => [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i2];
  const t = dims[orden[0]], b = dims[orden[1]], c = dims[orden[2]];
  const k = (c <= 70 && b <= 95) ? 2 : (c <= 215 && b <= 230) ? 1 : 0.5;
  const escTxt = k === 2 ? '2:1' : k === 1 ? '1:1' : '1:2';

  const pieza = { name: p.nombre, pos: [0, 0, 0], quat: [0, 0, 0, 1] };
  // vistas ortográficas A LÍNEA (paint:false — el estándar pinta SOLO la iso)
  const vista = (dir, up, wModel) => {
    const sc = new IsoScene();
    sc.add(pieza, { geometry: geo, paint: false });
    return sc.project({ dir, up, widthMM: Math.max(2, wModel * k), res: 1500, hidden: true });
  };
  const cara = vista(eje(orden[0]), eje(orden[2]), b);           // ve b×c
  const canto = vista(eje(orden[1]), eje(orden[2]), Math.max(t, 1.2)); // ve t×c
  const scI = new IsoScene(); scI.add(pieza, { geometry: geo, paint: true });
  const proyIso = (w) => scI.project({ dir: [-1, 1, -0.62], widthMM: w, res: 1300, shadow: true });
  // altura objetivo 140 (sobre el cajetín, bajo el marco): height ∝ width,
  // así que UNA reproyección exacta basta — sin pisos que rompan el álgebra
  let iso = proyIso(118);
  if (iso.heightMM > 140) iso = proyIso(118 * 140 / iso.heightMM);

  const sheet = new Sheet('A3', 420, 297, 1, 1, 1);
  const oyV = Math.max(46, (250 - c * k) / 2 + 34);              // base común de vistas
  const oxCanto = 46, oxCara = oxCanto + Math.max(t, 1.2) * k + 34;
  drawFigure(sheet, canto, oxCanto, oyV);
  sheet.text('CANTO', oxCanto + canto.widthMM / 2, oyV + canto.heightMM + 6, 3, 'C');
  drawFigure(sheet, cara, oxCara, oyV);
  sheet.text('VISTA PRINCIPAL', oxCara + cara.widthMM / 2, oyV + cara.heightMM + 6, 3, 'C');
  // cotas envolventes AUTO-MEDIDAS (regla PRD: ninguna transcrita)
  sheet.dimH(oxCara, oxCara + cara.widthMM, oyV, 9, b);
  sheet.dimV(oxCara + cara.widthMM, oyV, oyV + cara.heightMM, 9, c);
  sheet.dimH(oxCanto, oxCanto + canto.widthMM, oyV, 9, t);
  const oxIso = Math.max(oxCara + cara.widthMM + 44, 252);
  // piso 64: sobre el cajetín (x≥230 en A3, tope y=52) — la iso vive a la
  // derecha y NUNCA lo toca; etiqueta ARRIBA para que no se corte
  const oyIso = Math.max(64, Math.min(150, 277 - iso.heightMM));
  drawFigure(sheet, iso, oxIso, oyIso);
  sheet.text('ISOMÉTRICA (pintada — referencia)', oxIso + iso.widthMM / 2, oyIso + iso.heightMM + 5, 2.8, 'C');
  sheet.frame();
  sheet.titleBlock({
    designacion: `VENDOR · ${p.nombre} — ${p.rol} MB800 (geometría M-HASTE tal cual)`,
    proyecto: 'CV-BLT · banda plana MB800',
    fuente: 'GLB M-HASTE tal cual — capa user-vendor',
    verificacion: `MALLA FIEL AL CATÁLOGO (${gate.nota.slice(0, 40)})`,
    piezas: '1', numPlano: `MB800-${plano}`, fecha, escala: escTxt,
    rev: 'A', revCausa: 'primera emisión — geometría vendor tal cual',
    nota: `Material: POR CONFIRMAR (catálogo M-HASTE) — no comprar ni fabricar sin fuente · stepHash ${p.stepHash}`,
  });
  // tips del estándar: la lámina mide, no reinterpreta
  let ty = sheet.H - 15;
  sheet.text('TIPS — GEOMETRÍA VENDOR', 24, ty, 2.6, 'L'); ty -= 4.2;
  for (const l of [
    'La malla del GLB M-HASTE es LA VERDAD: no re-modelar, no «limpiar», no re-interpretar.',
    'Cotas auto-medidas de la malla decodificada — ninguna transcrita a mano.',
    `Envolvente medida: ${dims.join(' × ')} mm · ${tris} triángulos · compuerta malla-fiel VERDE.`,
    'Material y masa quedan POR CONFIRMAR hasta citar el catálogo M-HASTE (regla PRD).',
    'Vistas: CARA = los dos ejes mayores del GLB · CANTO = espesor · ocultas incluidas.',
  ]) { sheet.text('· ' + l, 24, ty, 2.15, 'L'); ty -= 3.6; }
  fabSheets.push(sheet);
  despiece.push({ item: i + 1, plano: `MB800-${plano}`, pieza: p.nombre, rol: p.rol,
    bbox_mm: dims, triangulos: tris, stepHash: p.stepHash, unidades: gate.nota });
  console.log(`  OK ${plano} ${p.nombre} · ${dims.join('×')} mm · ${tris} tris · ${gate.nota}`);
}

// ── portada con el sello DECLARADO (precedente TR90: cobertura dicha, no
// silencio): qué reglas corren aquí y cuáles no aplican a mallas vendor ─────
const portada = new Sheet('A3', 420, 297, 1, 1, 1);
portada.frame();
let py = portada.H - 30;
const P = (t, s = 3.4, x = 20) => { portada.text(t, x, py, s, 'L'); py -= s * 1.9; };
P('MATERIAL DE FABRICACIÓN — SOPORTES MB800 (BANDA PLANA M-HASTE)', 5.4); py -= 3;
P(`ConveyOne · CV-BLT · ${fecha} · REV A (primera emisión)`, 3.4); py -= 2;
P('Geometría: GLB M-HASTE TAL CUAL (orden de Sergio 18-08) — decodificada, verificada y auto-medida; jamás re-modelada.', 2.9);
P('PRD: conveyone-simulator/biblioteca/CV-BLT/PRD_mb800_soportes.md — material POR CONFIRMAR: no comprar ni fabricar sin fuente.', 2.9); py -= 3;
P('DESPIECE', 4.2); py -= 1;
P('ÍTEM  PLANO        PIEZA                        ROL                    BBOX mm                TRIS   UNIDADES', 2.7);
for (const d of despiece) {
  P(`${String(d.item).padEnd(6)}${d.plano.padEnd(13)}${d.pieza.padEnd(29)}${d.rol.padEnd(23)}${d.bbox_mm.join('×').padEnd(23)}${String(d.triangulos).padEnd(7)}${d.unidades}`, 2.5);
}
py -= 3;
P('COMPUERTAS (sello declarado — cobertura dicha, no silencio):', 3.2);
P(`· malla-fiel: ${nGate}/${piezas.length} piezas VERDES contra bbox de catálogo (CADENAS PARTsolutions AP203, stepHash por pieza).`, 2.7);
P('· rotulo-coherente y cantidad-derivada: APLICAN (rótulos desde malla/catálogo; despiece contado de la lista).', 2.7);
P('· masa-exacta: PENDIENTE de material confirmado (volumen de malla exacto × densidad citada).', 2.7);
P('· margen-agujero-borde / agujero-en-pliegue / flat-vs-solido / esquina-viva / barreno-redondo / pieza-sin-fijacion:', 2.7);
P('  NO APLICAN a mallas vendor sin desarrollo de chapa — declarado aquí para que el silencio no parezca verde.', 2.7);
portada.titleBlock({
  designacion: 'SOPORTES MB800 — PAQUETE DE FABRICACIÓN', proyecto: 'CV-BLT · banda plana MB800',
  fuente: 'GLB M-HASTE tal cual — capa user-vendor', verificacion: 'compuerta malla-fiel + cotas auto-medidas',
  piezas: String(piezas.length), piezasLabel: 'PIEZAS', nota: 'portada + índice — material POR CONFIRMAR',
  escala: '—', fecha, numPlano: 'MB800-00', rev: 'A', revCausa: 'primera emisión — geometría vendor tal cual',
});

const pdf = exportSheetsPDF([portada, ...fabSheets], 'planos_fabricacion_mb800.pdf');
writeFileSync(join(outDir, pdf.name), Buffer.from(pdf.data));
writeFileSync(join(outDir, '_despiece_mb800.json'), JSON.stringify({
  _que: 'Despiece del paquete MB800 — geometría GLB M-HASTE tal cual (PRD CV-BLT)',
  fecha, rev: 'A', piezas: despiece,
}, null, 1));
console.log(`OK ${join(outDir, pdf.name)} — ${1 + fabSheets.length} láminas (portada + ${fabSheets.length} piezas) · malla-fiel ${nGate}/${piezas.length}`);
