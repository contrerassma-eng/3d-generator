#!/usr/bin/env node
// test_nolabel.mjs — verifica el ensamble emitido por ensambles/nolabel/gen_nolabel.mjs:
// (1) el documento y sus verificaciones de compuerta; (2) invariantes de la línea
// (orden, huecos, planos, salida a 90°); (3) construcción CSG real de una muestra
// de piezas de cada equipo (volumen finito > 0, sin NaN).
//
//   node cad/ensambles/nolabel/gen_nolabel.mjs && cd cad && node tests/test_nolabel.mjs
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import { P } from '../ensambles/nolabel/params.mjs';

const doc = JSON.parse(readFileSync('ensambles/nolabel/nolabel_linea.json', 'utf8'));
const dims = JSON.parse(readFileSync('ensambles/nolabel/nolabel_dims.json', 'utf8'));
const V = doc.meta.verificaciones, Q = Object.fromEntries(doc.meta.equipos.map(q => [q.tag, q]));
let pass = 0, fail = 0;
const ok = (c, msg) => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${msg}`); };
const r2 = (v) => Math.round(v * 100) / 100;

console.log('— Documento —');
ok(doc.format === 'foto3d-cad' && doc.version === 1, 'formato foto3d-cad v1');
ok(doc.meta.capa === 'user', 'capa `user` (diseño, no medición)');
ok(/POR CONFIRMAR/.test(doc.meta.origen), 'el origen declara qué está POR CONFIRMAR');
ok(doc.parts.length >= 400, `${doc.parts.length} piezas`);
ok(new Set(doc.parts.map(p => p.id)).size === doc.parts.length, 'ids únicos');
ok(doc.parts.every(p => p.equipo), 'toda pieza pertenece a un equipo');

console.log('— Orden y huecos de la línea —');
const orden = ['OMW-1', 'TWB', 'MB4000', 'OMW-2'];
ok(orden.every((t, i) => i === 0 || Q[t].x0 > Q[orden[i - 1]].x0), 'orden omni → twin → MB400 4000 → omni');
ok(r2(Q['TWB'].x0 - (Q['OMW-1'].x0 + Q['OMW-1'].L)) === P.gapEq, `hueco omni 1 → twin = ${P.gapEq}`);
ok(r2(Q['MB4000'].x0 - (Q['TWB'].x0 + Q['TWB'].L)) === P.gapEq, `hueco twin → MB400 = ${P.gapEq}`);
ok(r2(Q['OMW-2'].x0 - (Q['MB4000'].x0 + Q['MB4000'].L)) === P.gapMotor, `hueco MB400 → omni 2 = ${P.gapMotor} (libra el motorreductor lateral)`);
ok(Math.abs(Q['BLT'].xc - (Q['OMW-2'].x0 + Q['OMW-2'].L / 2)) < 0.01, 'la cinta de salida está centrada en el omni 2');
ok(Math.sign(Q['BLT'].yNariz) === Math.sign(P.lado) && Math.sign(Q['BLT'].yFin) === Math.sign(P.lado), 'la cinta corre hacia el lado de salida');
ok(Math.abs(Math.abs(Q['BLT'].yFin - Q['BLT'].yNariz) - P.cinta.L) < 0.01, `cinta de ${P.cinta.L} mm`);

console.log('— Compuertas registradas —');
ok(V.omni_columnas_bajo_caja_chica >= 2 && V.omni_filas_bajo_caja_chica >= 3, `caja chica sobre ${V.omni_columnas_bajo_caja_chica} columnas × ${V.omni_filas_bajo_caja_chica} filas de ruedas`);
ok(V.twin_ventana < P.caja.chica.W - 80, `ventana ${V.twin_ventana} < W caja chica − 80`);
ok(V.twin_apoyo_caja_chica_mm.every(a => a >= 50) && V.twin_apoyo_caja_grande_mm.every(a => a >= 50), 'ambas cajas apoyan ≥50 mm en cada carril del twin');
ok(V.twin_fov.semiCobertura >= V.twin_fov.requiereL, `la óptica cubre ±${V.twin_fov.semiCobertura} ≥ ±${V.twin_fov.requiereL} (tapa de la caja grande)`);
ok(V.twin_capota.L > 863.9 && V.twin_capota.margenCajaGrande >= 100, `capota alargada a ${V.twin_capota.L} (STEP 863.9), margen ${V.twin_capota.margenCajaGrande}`);
ok(V.twin_disparo.desdeNariz >= P.caja.chica.L, 'la fotocélula dispara con la caja chica completa dentro del twin');
ok(V.twin_embudo.flareDeg <= P.mb400.twin.teflon.flareMaxDeg, `embudo de teflón a ${V.twin_embudo.flareDeg}°`);
ok(Object.values(V.planos).every(z => z <= 0 && z >= -25), 'planos de producto en 0 (cinta hasta −25)');
ok(V.salida.anchoCinta >= V.salida.requiere && V.salida.huecoBordeOmniPlaca <= 60, 'salida a 90°: ancho de cinta y hueco de transferencia');
ok(V.piso.zMin === -P.Hprod && V.piso.pies >= 20, `${V.piso.pies} pies niveladores apoyan en el piso (${-P.Hprod})`);
ok(V.interferencias_entre_equipos === 0, 'sin interferencias AABB entre equipos');

console.log('— Despiece —');
const bom = dims.despiece;
const cnt = (eq, re) => bom.filter(l => l.equipo === eq && re.test(l.descripcion + ' ' + (l.componente || ''))).reduce((a, l) => a + l.qty, 0);
ok(cnt('OMW-1', /Rueda omni/) === P.omni.filas * P.omni.porFila, `${P.omni.filas * P.omni.porFila} ruedas omni por bloque`);
ok(cnt('OMW-1', /Motorreductor 24 V/) === P.omni.filas && cnt('OMW-1', /Carcasa motor/) === P.omni.filas, `${P.omni.filas} motorreductores (uno por fila) con carcasa ventilada por bloque omni`);
ok(cnt('OMW-2', /Fotocélula/) === 1 && cnt('OMW-1', /Fotocélula/) === 0, 'fotocélula sólo en el omni de clasificación');
ok(cnt('OMW-1', /Guía de referencia/) === 1 && cnt('OMW-2', /Guía de referencia/) === 0, 'guía de referencia sólo en el omni de justificación');
ok(cnt('TWB', /Banda modular/) === 2 && cnt('MB4000', /Banda modular/) === 1, 'twin con 2 carriles, MB400 4000 con 1');
ok(cnt('TWB', /Capota de cámara/) === 1 && cnt('TWB', /^Cámara/) === 1 && cnt('TWB', /Barra LED/) === 2 && cnt('TWB', /Pata capota/) === 4, 'capota (STEP alargado) + cámara + 2 LED + 4 patas');
ok(cnt('BLT', /Tambor/) === 2 && cnt('BLT', /Motorreductor de eje hueco/) === 1 && cnt('BLT', /^Placa de transferencia/) === 1, 'cinta: 2 tambores, motorreductor de eje hueco, placa de transferencia');

console.log('— Construcción CSG (muestra por equipo) —');
const muestra = [];
for (const eq of ['OMW-1', 'TWB', 'MB4000', 'OMW-2', 'BLT']) {
  const ps = doc.parts.filter(p => p.equipo === eq);
  const pick = (re) => ps.find(p => re.test(p.name));
  for (const re of [/Rueda omni/, /Rodillo omni/, /Carcasa motor/, /Motorreductor 24 V/, /Tapa superior/, /Carcasa inferior/, /Banda modular/, /Capota de cámara/, /Guarda de teflón/, /Piñón/, /Banda plana/, /Tambor/, /Canal lateral/, /Placa de transferencia/, /Perno hex/]) {
    const p = pick(re); if (p && !muestra.includes(p)) muestra.push(p);
  }
}
const vol = (g) => {
  const a = g.getAttribute('position'), idx = g.getIndex(); let v = 0;
  const tri = (i0, i1, i2) => { const ax = a.getX(i0), ay = a.getY(i0), az = a.getZ(i0), bx = a.getX(i1), by = a.getY(i1), bz = a.getZ(i1), cx = a.getX(i2), cy = a.getY(i2), cz = a.getZ(i2);
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; };
  if (idx) for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)); else for (let i = 0; i < a.count; i += 3) tri(i, i + 1, i + 2);
  return Math.abs(v);
};
for (const p of muestra) {
  let g; try { g = buildPartGeometry(p); } catch (err) { ok(false, `${p.name}: ${err.message}`); continue; }
  const pos = g.getAttribute('position'); let nan = false; for (let i = 0; i < pos.count; i++) if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) nan = true;
  const vv = vol(g);
  ok(!nan && vv > 1, `${p.name}: ${pos.count / 3 | 0} tri, ${Math.round(vv)} mm³`);
}

console.log(`\n${pass} ok · ${fail} fallos`);
process.exit(fail ? 1 : 0);
