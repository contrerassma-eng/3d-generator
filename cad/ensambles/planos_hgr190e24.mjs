#!/usr/bin/env node
// planos_hgr190e24.mjs — Láminas de DESARROLLO (PDF) y sólidos (STL) de las
// piezas del kit colgante CV-HGR-190E24 (solo piezas, sin ensamble).
//
// Desde ensambles/hgr190e24.json (gen_hgr190e24.mjs):
//   HGD-02_RC-48V_desarrollo.pdf — lámina COMPUESTA A3 1:1: arriba la SECCIÓN
//       DE PLEGADO (perfil formado con la cañería de referencia y el sentido
//       de cada pliegue P1..P5, pedido del usuario: verlo visualmente, no solo
//       en notas) y abajo el DESARROLLO con líneas de plegado y colisos.
//   HGD-01_PD-48_desarrollo.pdf  — lámina de desarrollo de la placa plana.
//   stl/rc48v.stl · stl/pd48.stl — sólidos para las vistas normalizadas de S6.
//
// Uso:  node ensambles/planos_hgr190e24.mjs   (desde cad/)

import { buildPartGeometry } from '../js/model.js';
import { exportFlatPDF, exportSheetsPDF, Sheet } from '../js/drawing2d.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';

const outDir = 'ensambles/planos_hgr190e24';
const stlDir = join(outDir, 'stl');
mkdirSync(stlDir, { recursive: true });

const doc = JSON.parse(readFileSync('ensambles/hgr190e24.json', 'utf8'));
const calc = doc.meta.calc;
const fecha = new Date().toISOString().slice(0, 10);
const rc = doc.parts.find(p => /RC-48V/.test(p.name));
const pd = doc.parts.find(p => /PD-48/.test(p.name));
const cant = doc.meta.cantidad_por_pieza;

// --- HGD-01 · PD-48: lámina de desarrollo estándar ---------------------------
{
  const f = pd.flat;
  const out = exportFlatPDF(f, {
    designacion: `HGD-01 · PD-48 placa distribuidora (x${cant})`,
    proyecto: doc.meta.proyecto,
    marca: doc.meta.marca, marcaSub: doc.meta.marcaSub,
    numPlano: 'HGD-01',
    nota: `${f.material} · e${f.t} · ISO 2768-mK · COLISOS 11×16 @96 · CANT. ${cant}`,
    fecha,
  });
  writeFileSync(join(outDir, 'HGD-01_PD-48_desarrollo.pdf'), out.data);
  console.log(`HGD-01 desarrollo → ${out.info}`);
}

// --- HGD-02 · RC-48V: lámina compuesta (sección de plegado + desarrollo) -----
{
  const sh = new Sheet('A3', 420, 297, 1, 1, 1);
  sh.hairline = true;
  const f = rc.flat;
  const S = calc.seccion;

  // ===== mitad superior: SECCIÓN DE PLEGADO (perfil formado, 1:1) ===========
  // perfil en (x, yAbajo) → papel (CX + x, TOP − yAbajo)
  const CX = 205, TOP = 268;
  const T = ([x, y]) => [CX + x, TOP - y];
  sh.poly(S.perfil.map(T), 'VISIBLE');
  // cañería de referencia asentada en la V (trazo-punto) + cruz de centro
  const pc = T(S.pipe.c), pr = S.pipe.d / 2;
  sh.circle(pc, pr, 'PLIEGUE');
  sh.line([pc[0] - 6, pc[1]], [pc[0] + 6, pc[1]], 'FINA');
  sh.line([pc[0], pc[1] - 6], [pc[0], pc[1] + 6], 'FINA');
  sh.text(`CAÑERÍA Ø${S.pipe.d} (REF)`, pc[0], pc[1] - pr - 4.5, 2.5, 'C');

  // rótulo de cada pliegue con línea de referencia hasta el perfil
  const lbl = {
    1: { off: [-26, 8] }, 2: { off: [-36, 6] },
    3: { off: [0, -16] }, 4: { off: [36, 6] },
    5: { off: [26, 8] },
  };
  const binfo = Object.fromEntries(calc.bends.map(b => [b.n, b]));
  for (const a of S.anclas) {
    const p = T(a.at), o = lbl[a.n];
    const q = [p[0] + o.off[0], p[1] + o.off[1]];
    sh.line(p, [q[0], q[1] - (o.off[1] > 0 ? 1.2 : -3.2)], 'FINA');
    const b = binfo[a.n];
    sh.text(`P${a.n} ${b.ang}° ${b.dir}`, q[0], q[1], 2.8, 'C');
  }
  sh.text('SECCIÓN DE PLEGADO — PERFIL FORMADO 1:1 (sección por el plano medio de la platina)',
    CX, TOP + 17, 3.5, 'C');
  sh.text('V 90° INCLUIDOS · 52 INT. ENTRE ALAS · OREJAS CONTRA EL ALA INFERIOR DEL CANAL',
    CX, TOP + 12.2, 2.6, 'C');

  // cotas de la sección: ancho total, profundidad interior, alto exterior
  const xL = CX - S.ancho / 2, xR = CX + S.ancho / 2;
  sh.dimH(xL, xR, TOP - S.altoExt, 9, S.ancho);
  sh.dimV(xR, TOP - S.depth, TOP, 16, S.depth);
  sh.dimV(xL, TOP - S.altoExt, TOP, -18, S.altoExt);

  // ===== mitad inferior: DESARROLLO (1:1) ====================================
  const W = calc.devTotal, H = calc.strip;
  const ox = 20 + (390 - W) / 2, oy = 106;
  const TD = ([x, y]) => [ox + x, oy + y];
  sh.poly(f.contorno.map(TD), 'VISIBLE');
  for (const c of f.cortes.circles) sh.circle(TD(c.c), c.r, 'VISIBLE');
  for (const p of f.cortes.polys) sh.poly(p.map(TD), 'VISIBLE');
  for (const l of f.pliegues) sh.line(TD(l.a), TD(l.b), l.tipo === 'eje' ? 'PLIEGUE' : 'FINA');
  for (const b of calc.bends) {
    sh.text(`P${b.n} ${b.ang}° ${b.dir}`, ox + b.eje, oy + H + 1.8, 2.5, 'C');
  }
  sh.dimH(ox, ox + W, oy, 9, W);
  sh.dimV(ox + W, oy, oy + H, 9, H);
  sh.text('DESARROLLO DE CHAPA 1:1 — BA = ang·(R + K·t), fibra neutra por factor K',
    ox, oy + H + 8.5, 3.5, 'L');
  sh.text(`K=${calc.K} · Ri=${calc.Ri} · BA90=${calc.BA90} · BA45=${calc.BA45} · ` +
    `BD90=${calc.BD90} · BD45=${calc.BD45} · EJES EN ${calc.bends.map(b => b.eje).join(' / ')}`,
    ox, oy - 14, 2.6, 'L');
  sh.text('CORTE: 2 COLISOS 11×16 (AJUSTE ±2.5) + 1 BARRENO Ø8.5 — ROSCAR M10 EN ARMADO, PERPENDICULAR AL FLANCO',
    ox, oy - 19, 2.6, 'L');
  sh.text('SECUENCIA: P3 (ápice) > P2·P4 (45°) > P1·P5 (orejas) · CARA DEL ASIENTO HACIA ARRIBA · EXTREMOS R15',
    ox, oy - 24, 2.6, 'L');

  sh.frame();
  sh.titleBlock({
    marca: doc.meta.marca, marcaSub: doc.meta.marcaSub,
    designacion: `HGD-02 · RC-48V retenedor asiento en V (x${cant})`,
    proyecto: doc.meta.proyecto,
    fuente: 'chapa plegada — capa user',
    verificacion: 'CAD EN MM (CAPA USER)',
    piezasLabel: 'CANTIDAD',
    piezas: String(cant),
    nota: `${f.material} · e${f.t} · ISO 2768-mK · K=${f.k} · Rev. B-1 (colisos + extremos R15)`,
    escala: '1:1',
    fecha,
    numPlano: 'HGD-02',
  });
  const out = exportSheetsPDF([sh], 'HGD-02_RC-48V_desarrollo.pdf');
  writeFileSync(join(outDir, 'HGD-02_RC-48V_desarrollo.pdf'), out.data);
  console.log('HGD-02 desarrollo (sección + desarrollo) → A3 1:1');
}

// --- STL binario (mm) desde la geometría CSG de model.js ---------------------
function writeSTL(parts, path) {
  const tris = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const part of parts) {
    const geom = buildPartGeometry(part);
    const pos = geom.attributes.position;
    for (let i = 0; i + 2 < pos.count; i += 3) {
      A.fromBufferAttribute(pos, i); B.fromBufferAttribute(pos, i + 1); C.fromBufferAttribute(pos, i + 2);
      const n = new THREE.Vector3().subVectors(B, A)
        .cross(new THREE.Vector3().subVectors(C, A)).normalize();
      tris.push([n.toArray(), A.toArray(), B.toArray(), C.toArray()]);
    }
  }
  const buf = Buffer.alloc(84 + tris.length * 50);
  buf.write('foto3d CV-HGR-190E24', 0, 'ascii');
  buf.writeUInt32LE(tris.length, 80);
  let off = 84;
  for (const [nn, a, b, c] of tris) {
    for (const v of [nn, a, b, c]) {
      for (const x of v) { buf.writeFloatLE(x, off); off += 4; }
    }
    off += 2;
  }
  writeFileSync(path, buf);
  console.log(`STL → ${path} (${tris.length} triángulos)`);
}

writeSTL([rc], join(stlDir, 'rc48v.stl'));
writeSTL([pd], join(stlDir, 'pd48.stl'));
console.log('OK planos_hgr190e24');
