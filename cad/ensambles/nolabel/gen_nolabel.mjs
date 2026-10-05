#!/usr/bin/env node
// gen_nolabel.mjs — INTEGRADOR de la LÍNEA NO-LABEL (lectura QR + clasificación
// de cajas de cereza). Encadena, en el orden pedido por el usuario:
//
//   OMW-1  bloque omni de JUSTIFICACIÓN (guía de referencia al lado `lado`)
//   TWB    twin belt M-haste MB400 (2 carriles W200, ventana 100) con BOX DE
//          CÁMARA alargado, guarda de teflón con embudo y fotocélula de disparo
//   MB4000 MB400 de 4000 mm (separa y transporta)
//   OMW-2  bloque omni de CLASIFICACIÓN (fotocélula a 0.82·L, eyección a 90°)
//   BLT    cinta plana PERPENDICULAR de salida (cajas grandes)
//
// Corre la COMPUERTA DE DISEÑO: si algo no cumple, NO emite el JSON.
// Emite (formato foto3d-cad, capa `user`):
//   nolabel_linea.json   la línea completa
//   nolabel_omni.json    un bloque omni solo (para biblioteca / revisión)
//   nolabel_dims.json    cotas derivadas, verificaciones y despiece por equipo
//
//   node cad/ensambles/nolabel/gen_nolabel.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ensamble, solapan, r2, normal3 } from '../nbt90/lib.mjs';

/** AABB EXACTA para box, cilindros alineados a un eje y bocetos con `u` declarado (la de lib.mjs
 *  infla los cilindros con su radio en los tres ejes y no usa params.u). Revoluciones: envolvente. */
function bboxPieza(part) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const acc = (p) => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  for (const f of part.features) {
    if (f.op === 'cut' || f.shape === 'hole') continue;
    const at = [f.at[0] + part.pos[0], f.at[1] + part.pos[1], f.at[2] + part.pos[2]];
    if (f.shape === 'box') { const { w, d, h } = f.params; acc([at[0] - w / 2, at[1] - d / 2, at[2]]); acc([at[0] + w / 2, at[1] + d / 2, at[2] + h]); }
    else if (f.shape === 'cylinder') {
      const r = f.params.dia / 2, d3 = normal3(f.dir), h = f.params.h, ax = d3.findIndex(c => Math.abs(Math.abs(c) - 1) < 1e-6);
      for (const s of [0, h]) { const c = [at[0] + d3[0] * s, at[1] + d3[1] * s, at[2] + d3[2] * s];
        acc(c.map((v, i) => (ax >= 0 && i === ax) ? v : v - r)); acc(c.map((v, i) => (ax >= 0 && i === ax) ? v : v + r)); }
    } else if (f.shape === 'sketch' && f.params.pts) {
      const n = normal3(f.dir), u = normal3(f.params.u), v = cross(n, u);
      for (const p of f.params.pts) for (const s of [0, f.params.h]) acc([0, 1, 2].map(i => at[i] + u[i] * p[0] + v[i] * p[1] + n[i] * s));
    } else if (f.shape === 'revolve') {
      const R = Math.max(...f.params.entities.flatMap(e2 => [Math.abs(e2.a[1]), Math.abs(e2.b[1])]));
      const hs = f.params.entities.flatMap(e2 => [e2.a[0], e2.b[0]]), d3 = normal3(f.params.u);
      for (const s of [Math.min(...hs), Math.max(...hs)]) { const c = [at[0] + d3[0] * s, at[1] + d3[1] * s, at[2] + d3[2] * s];
        acc(c.map((q, i) => Math.abs(d3[i]) > 0.5 ? q : q - R)); acc(c.map((q, i) => Math.abs(d3[i]) > 0.5 ? q : q + R)); }
    }
  }
  return { lo, hi };
}
import { P } from './params.mjs';
import { omni } from './omni.mjs';
import { mb400 } from './mb400.mjs';
import { cinta } from './cinta.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const lado = P.lado, g = P.gapEq;

// ---------------------------------------------------------------- posiciones
const X = {};
X.omni1 = 0;
X.twin = r2(X.omni1 + P.omni.L + g);
X.mb = r2(X.twin + P.mb400.twin.L + g);
X.omni2 = r2(X.mb + P.mb400.largo.L + P.gapMotor);
const xFinLinea = r2(X.omni2 + P.omni.L);
const yNarizCinta = r2(lado * (P.omni.W / 2 + 30));                  // 30 fuera de la placa del omni 2 (sin guarda de correa en el lado de salida)

// ------------------------------------------------------------------ ensamble
const E = new Ensamble();
const T = P.mb400.twin, Wc = T.Wcarril, yc = T.ventana / 2 + Wc / 2;
const m = {};
m.omni1 = omni(E, { x0: X.omni1, tag: 'OMW-1', guiaRef: true, fotocelula: false });
m.twin = mb400(E, { x0: X.twin, L: T.L, tag: 'TWB', twin: true, guiaRefY: m.omni1.guiaY,
  carriles: [{ yc: -yc, W: Wc }, { yc: +yc, W: Wc }], patasX: [X.twin + 100, X.twin + T.L - 100],
  brazosX: [X.twin + T.teflon.flare + 20, X.twin + T.L - 60] });   // brazos del teflón fuera de la capota
{
  const Lg = P.mb400.largo.L, n = Math.ceil(Lg / P.mb400.largo.pasoPatas);
  const patas = Array.from({ length: n + 1 }, (_, i) => r2(X.mb + 150 + (Lg - 300) * i / n));
  m.mb = mb400(E, { x0: X.mb, L: Lg, tag: 'MB4000', carriles: [{ yc: 0, W: P.mb400.largo.W }], patasX: patas });
}
m.omni2 = omni(E, { x0: X.omni2, tag: 'OMW-2', guiaRef: false, fotocelula: true });
m.cinta = cinta(E, { xc: r2(X.omni2 + P.omni.L / 2), yNariz: yNarizCinta, tag: 'BLT' });

// ------------------------------------------------------------------ compuerta
function verificar() {
  const e = [], V = {};
  const cj = P.caja, Q = P.omni;
  // G1 · omni: la caja chica justificada apoya en ≥2 columnas de ruedas y ≥3 filas
  const yFace = m.omni1.guiaY, yLejos = yFace - lado * cj.chica.W;
  const cols = m.omni1.yRueda.filter(y => y >= Math.min(yFace, yLejos) && y <= Math.max(yFace, yLejos)).length;
  V.omni_columnas_bajo_caja_chica = cols;
  V.omni_filas_bajo_caja_chica = Math.floor(cj.chica.L / Q.paso);
  if (cols < 2) e.push(`G1 omni: la caja chica (W${cj.chica.W}) justificada en Y=${yFace} apoya en ${cols} columna(s) de ruedas (<2)`);
  if (V.omni_filas_bajo_caja_chica < 3) e.push(`G1 omni: la caja chica (L${cj.chica.L}) cubre ${V.omni_filas_bajo_caja_chica} filas (<3)`);
  if (Math.abs(m.omni1.ejeZ + Q.rueda.D / 2) > 0.01) e.push('G1 omni: la corona de la rueda no está en Z=0');
  // G2 · twin: ventana, apoyo a caballo, FOV, disparo, embudo
  V.twin_ventana = m.twin.ventana;
  if (m.twin.ventana >= cj.chica.W - 2 * 40) e.push(`G2 twin: ventana ${m.twin.ventana} ≥ W caja chica − 80 (${cj.chica.W - 80})`);
  const yCara = m.twin.teflon.yCara, yOtro = yCara - lado * cj.chica.W;
  const apoyoRef = Math.abs(yCara) - m.twin.ventana / 2, apoyoOtro = Math.abs(yOtro) - m.twin.ventana / 2;
  V.twin_apoyo_caja_chica_mm = [r2(apoyoRef), r2(apoyoOtro)];
  if (Math.sign(yCara) === Math.sign(yOtro) || apoyoRef < 50 || apoyoOtro < 50) e.push(`G2 twin: la caja chica no queda a caballo de la ventana con ≥50 mm por carril (${apoyoRef}/${apoyoOtro})`);
  if (Math.abs(yCara) + 0 > Math.abs(m.twin.yMin) || Math.abs(yOtro) > Math.abs(m.twin.yMax)) e.push('G2 twin: la caja chica se sale de los carriles');
  const yOtroG = yCara - lado * cj.grande.W, apoyoG = [Math.abs(yCara) - m.twin.ventana / 2, Math.abs(yOtroG) - m.twin.ventana / 2];
  V.twin_apoyo_caja_grande_mm = apoyoG.map(r2);
  if (Math.sign(yCara) === Math.sign(yOtroG) || apoyoG[0] < 50 || apoyoG[1] < 50 || Math.abs(yOtroG) > Math.abs(m.twin.yMax)) e.push(`G2 twin: la caja grande (W${cj.grande.W}) no queda a caballo de la ventana dentro de los carriles (${apoyoG})`);
  V.twin_fov = m.twin.fov;
  if (m.twin.fov.semiCobertura < m.twin.fov.requiereL || m.twin.fov.semiCobertura < m.twin.fov.requiereW) e.push(`G2 twin: la óptica de ${T.capota.camara.fovDeg}° cubre ±${m.twin.fov.semiCobertura} a ${m.twin.fov.distanciaATapaGrande} de la tapa y la caja grande pide ±${m.twin.fov.requiereL}`);
  const cap = m.twin.capota;
  V.twin_capota = { ...cap, margenCajaGrande: r2(cap.L / 2 - cj.grande.L / 2 - cj.chica.L / 2) };
  if (cap.L / 2 < cj.grande.L / 2 + cj.chica.L / 2 + 100) e.push(`G2 twin: capota de ${cap.L} demasiado corta: la caja grande disparada por la chica no queda entera adentro con 100 de margen`);
  if (cap.x0 < X.twin + 50 || cap.x1 > X.twin + T.L - 50) e.push('G2 twin: la capota se sale del twin belt');
  if (T.capota.abertura.W < cj.grande.W + 2 * 60 || T.capota.abertura.H < cj.grande.H + 60) e.push('G2 twin: la abertura de los cabeceros no deja pasar la caja grande con luz');
  if (T.capota.zBase < T.teflon.h) e.push('G2 twin: la capota corta la guarda de teflón');
  V.twin_disparo = { sensorX: m.twin.sensorX, desdeNariz: r2(m.twin.sensorX - X.twin), camaraX: m.twin.xVentana };
  if (m.twin.sensorX - X.twin < cj.chica.L) e.push('G2 twin: la fotocélula dispara antes de que la caja chica entre completa');
  if (m.twin.sensorX - cj.chica.L / 2 < cap.x0 + T.capota.cabecero || m.twin.sensorX > cap.x1 - T.capota.cabecero) e.push('G2 twin: al disparar, la caja chica no está entera bajo la capota');
  if (Math.abs(m.twin.sensorX - cj.chica.L / 2 - m.twin.xVentana) > 1) e.push('G2 twin: al disparar, la caja chica no queda centrada bajo la cámara');
  V.twin_embudo = m.twin.teflon;
  if (m.twin.teflon.flareDeg > T.teflon.flareMaxDeg) e.push(`G2 twin: embudo de ${m.twin.teflon.flareDeg}° > 30°`);
  // G3 · planos de producto
  V.planos = { omni1: 0, twin: m.twin.bandaTop, mb4000: m.mb.bandaTop, omni2: 0, cinta: m.cinta.zTop };
  if (m.twin.bandaTop !== 0 || m.mb.bandaTop !== 0) e.push('G3: las bandas MB400 no están en Z=0');
  if (m.cinta.zTop > 0 || m.cinta.zTop < -25) e.push(`G3: la cinta recibe a ${m.cinta.zTop} (fuera de 0..−25)`);
  // G4 · salida a 90°
  const huecoTransf = r2(Math.abs(m.cinta.placaTransf.yIni) - P.omni.W / 2);
  V.salida = { anchoCinta: m.cinta.W, requiere: cj.grande.L + 50, huecoBordeOmniPlaca: huecoTransf, placaTop: m.cinta.placaTransf.zTop };
  if (m.cinta.W < cj.grande.L + 50) e.push(`G4: cinta de ${m.cinta.W} < L caja grande + 50`);
  if (huecoTransf > 60) e.push(`G4: hueco de ${huecoTransf} entre el omni y la placa de transferencia (>60)`);
  if (m.cinta.placaTransf.zTop > 0 || m.cinta.placaTransf.zTop < m.cinta.zTop) e.push('G4: la placa de transferencia no queda entre el plano del omni y la banda');
  if (m.omni2.fotocelulaX === undefined) e.push('G4: el omni 2 no tiene fotocélula de detención');
  // G5 · apoyo al piso
  let zMin = 1e9, nPies = 0;
  for (const p of E.parts) { const b = bboxPieza(p); zMin = Math.min(zMin, b.lo[2]); if (/Pie nivelador/.test(p.name)) nPies++; }
  V.piso = { zMin: r2(zMin), pies: nPies, Hprod: P.Hprod };
  if (Math.abs(zMin + P.Hprod) > 0.01) e.push(`G5: la pieza más baja llega a ${r2(zMin)} y el piso está en ${-P.Hprod}`);
  // G6 · interferencias AABB entre equipos distintos
  const porEq = {}; for (const p of E.parts) (porEq[p.equipo] ??= []).push(p);
  const eqs = Object.keys(porEq), inter = [];
  for (let i = 0; i < eqs.length; i++) for (let j = i + 1; j < eqs.length; j++) {
    for (const a of porEq[eqs[i]]) { const ba = bboxPieza(a); for (const b of porEq[eqs[j]]) if (solapan(ba, bboxPieza(b), 0.01)) inter.push(`${a.name} ↔ ${b.name}`); }
  }
  V.interferencias_entre_equipos = inter.length;
  if (inter.length) e.push(`G6: ${inter.length} interferencia(s) entre equipos:\n      ${inter.slice(0, 12).join('\n      ')}`);
  // G7 · envolvente e ids
  const ids = new Set(); for (const p of E.parts) { if (ids.has(p.id)) e.push(`G7: id repetido ${p.id}`); ids.add(p.id); }
  for (const p of E.parts) { const b = bboxPieza(p); if (b.lo[0] < -50 || b.hi[0] > xFinLinea + 350 || b.hi[2] > T.capota.zBase + T.capota.H + 40) e.push(`G7: fuera de envolvente ${p.name}`); }
  return { e, V };
}

const { e, V } = verificar();
if (e.length) { console.error('Diseño inconsistente — NO se emite:\n  - ' + e.join('\n  - ')); process.exit(1); }

// -------------------------------------------------------------------- despiece
function despiece(parts) {
  const lineas = {};
  for (const p of parts) {
    const desc = p.name.replace(/^[A-Z0-9-]+ · /, '').replace(/ (f|c)\d+(\.\d+)?( y-?\d+(\.\d+)?)?$/, '').replace(/ [XY]-?\d+$/, '').replace(/ (fila|fam\.) .*$/, '')
      .replace(/ (\+|−)[XY]$/, '').replace(/ (\+|−)[XY] [XY]-?\d+$/, '');
    const k = `${p.equipo}|${p.componente || desc}`;
    (lineas[k] ??= { equipo: p.equipo, componente: p.componente || null, descripcion: desc, qty: 0, hardware: !!p.hardware }).qty++;
  }
  return Object.values(lineas).sort((a, b) => a.equipo.localeCompare(b.equipo) || a.descripcion.localeCompare(b.descripcion));
}

const equipos = [
  { tag: 'OMW-1', tipo: 'CV-OMW · bloque omni de justificación', x0: X.omni1, L: P.omni.L, W: P.omni.W, referencia_Y: m.omni1.guiaY, motores: m.omni1.motores },
  { tag: 'TWB', tipo: 'CV-TWB-MB400 · twin belt con box de cámara', x0: X.twin, L: T.L, W: r2(m.twin.yMax - m.twin.yMin), ventana: m.twin.ventana, capota: m.twin.capota, fov: m.twin.fov, disparo: V.twin_disparo, teflon: m.twin.teflon, motorY: m.twin.motorY, codigo_mhaste: `MB400-Pro-FL-A-L${T.L}-W${Wc}×2-S2-LA1-UGN2-DM1` },
  { tag: 'MB4000', tipo: 'CV-MB400-4000 · módulo banda MB400 (gapper/transporte)', x0: X.mb, L: P.mb400.largo.L, W: P.mb400.largo.W, codigo_mhaste: `MB400-Pro-FL-A-L${P.mb400.largo.L}-W${P.mb400.largo.W}-S2-LA2-UGN2-DM1` },
  { tag: 'OMW-2', tipo: 'CV-OMW · bloque omni de clasificación (stop 90°)', x0: X.omni2, L: P.omni.L, W: P.omni.W, fotocelula_X: m.omni2.fotocelulaX, motores: m.omni2.motores },
  { tag: 'BLT', tipo: 'CV-BLT-500 · cinta plana perpendicular de salida', xc: r2(X.omni2 + P.omni.L / 2), yNariz: m.cinta.yNariz, yFin: m.cinta.yFin, L: P.cinta.L, W: P.cinta.W, zTop: m.cinta.zTop, placaTransferencia: m.cinta.placaTransf },
];

const origen = `gen_nolabel.mjs (paramétrico, capa user). Línea NO-Label: OMW-1 (omni 24"×24", 8 filas × 7 ruedas Ø60 a ±45°, un motorreductor 24 V por fila en carcasa ventilada lateral) → TWB (2 carriles MB400 W200, ventana 100, capota de cámara del STEP del usuario alargada a ${T.capota.L} (${T.capota.W}×${Math.round(T.capota.H)}, abierta por abajo, cámara mirando hacia abajo), teflón con embudo, fotocélula de disparo) → MB400 L${P.mb400.largo.L} W${P.mb400.largo.W} → OMW-2 (fotocélula 0.82·L, eyección 90° al lado ${lado > 0 ? '+Y izquierda' : '−Y derecha'}) → BLT cinta plana ${P.cinta.W}×${P.cinta.L} perpendicular. Cotas MB400 del generador M-haste (Conveyone-/backend/mhaste/src/mb400.py); grilla omni del simulador (omniwheel.md: 24", paso 3"); motor UniDrive del catálogo (bbox real). POR CONFIRMAR: dimensiones de caja, altura 800, rueda omni Ø60, óptica 75°. Plano de producto Z=0; piso Z=${-P.Hprod}.`;

const doc = {
  format: 'foto3d-cad', version: 1,
  meta: { nombre: 'Línea NO-Label — omni · twin belt MB400 con cámara · MB400 4000 · omni · cinta perpendicular', capa: 'user', origen, equipos, verificaciones: V, piezas: E.parts.length },
  parts: E.parts, constraints: [],
};
writeFileSync(join(here, 'nolabel_linea.json'), JSON.stringify(doc, null, 1));

// bloque omni solo (misma geometría, en el origen)
const E2 = new Ensamble();
const r1 = omni(E2, { x0: 0, tag: 'OMW', guiaRef: true, fotocelula: true });
writeFileSync(join(here, 'nolabel_omni.json'), JSON.stringify({ format: 'foto3d-cad', version: 1,
  meta: { nombre: 'Bloque omni CV-OMW 24"×24" (justificación + detención)', capa: 'user', origen: 'gen_nolabel.mjs → omni.mjs; ver nolabel_linea.json', resumen: r1, piezas: E2.parts.length },
  parts: E2.parts, constraints: [] }, null, 1));

writeFileSync(join(here, 'nolabel_dims.json'), JSON.stringify({
  proyecto: 'NOLABEL', capa: 'user', generado_por: 'gen_nolabel.mjs', ejes: 'X flujo · Y ancho (+Y izquierda) · Z arriba, 0 = plano de producto',
  parametros: P, posiciones: { ...X, xFinLinea, yNarizCinta }, equipos, verificaciones: V,
  despiece: despiece(E.parts),
}, null, 1));

console.log(`OK: ${E.parts.length} piezas · ${equipos.length} equipos · línea ${xFinLinea} mm + cinta ${P.cinta.L} mm`);
for (const q of equipos) console.log(`  ${q.tag.padEnd(7)} x0=${q.x0 ?? q.xc}  L=${q.L}  W=${q.W}`);
console.log('  verificaciones:', JSON.stringify(V));
