#!/usr/bin/env node
// gen_omniwheel.mjs — MÓDULO DESVIADOR OMNIWHEEL (CV-OMW del conveyone-simulator),
// resuelto con EJES PERPENDICULARES CRUZADOS y TANGENTE DE TRANSPORTE COMÚN:
//
//   - Ejes A (AVANCE): transversales (a lo ancho, Y), ruedas omni Ø70 del
//     snapshot del usuario (omniwheel10 · Omni-Wheel.iam) → empujan en +X.
//   - Ejes B (EYECCIÓN): longitudinales (según flujo, X), ruedas omni Ø120
//     DERIVADAS de la Ø70 → empujan en ±Y.
//
//   La condición de diseño pedida: MISMA TANGENTE de transporte (todas las
//   ruedas tocan el plano Z = TANG) con CENTROS Y EJES SIN INTERFERENCIA.
//   Al ser la rueda B de mayor diámetro, su eje queda ΔZ = R_B − R_A más
//   abajo, y los ejes perpendiculares se cruzan en planta con luz vertical:
//
//       luz = ΔZ − r_ejeA − r_ejeB = (60−35) − 7.5 − 7.5 = 10 mm
//
//   El script VERIFICA (y aborta si falla) todas las condiciones de no
//   interferencia; los márgenes quedan en meta.verificaciones.
//
// Marco = módulo CV-OMW 24"×24" (609.6): X = flujo, Y = ancho, Z = arriba,
// plano de transporte Z = 170 (mismo idioma que gen_base.mjs). Uso:
//   node cad/ensambles/gen_omniwheel.mjs   → omni_modulo.json

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CAT = JSON.parse(readFileSync(join(here, '..', '..', 'componentes', 'catalogo.json'), 'utf8'));
const COMP = new Map(CAT.componentes.map(c => [c.id, c]));

// ---------------------------------------------------------------- parámetros
const IN = 25.4;
const D = {
  mod: 24 * IN,                 // 609.6 — largo y ancho del módulo (norma CV-OMW)
  tang: 170,                    // plano de transporte (marco del módulo)
  R1: 35,  W1: 50,              // rueda omni Ø70 (snapshot) — ejes A (avance)
  R2: 60,  W2: 62,              // rueda omni Ø120 (derivada) — ejes B (eyección)
  ejeDia: 15,                   // ejes calibrados Ø15 h6, chaveta 5×5 (ambas familias)
  luzMin: 5,                    // luz mínima admisible en cualquier cruce
  pitch: 6 * IN,                // 152.4 — paso de la retícula de contactos
  ejesA_X: [-1.5, -0.5, 0.5, 1.5].map(k => k * 6 * IN),   // ±76.2, ±228.6
  ejesB_Y: [-1, 0, 1].map(k => k * 6 * IN),               // 0, ±152.4
  ruedasA_Y: [-1.5, -0.5, 0.5, 1.5].map(k => k * 6 * IN), // 4 ruedas Ø70 por eje A
  ruedasB_X: [-1, 0, 1].map(k => k * 6 * IN),             // 3 ruedas Ø120 por eje B
  placa: 6, placaZ0: 40, placaZ1: 168,   // placas perimetrales (top 2 bajo tangente)
  fondo: 5, fondoZ: 35,                  // bandeja de fondo
  chum: [42, 22, 42],                    // chumacera/soporte de eje (caja)
  motorDia: 60, motorL: 150, motorZ: 62, // UniDrive 60 W bajo cama, correa interior
  fotoX: 0.82,                           // fotocélula a 0.82·L (modo 'stop')
};
const zA = D.tang - D.R1;      // 135 — centro de ejes A
const zB = D.tang - D.R2;      // 110 — centro de ejes B

// ------------------------------------------------------------ verificaciones
const chk = {};
function gate(nombre, valor, minimo) {
  chk[nombre] = `${valor.toFixed(1)} mm (mín ${minimo})`;
  if (valor < minimo) throw new Error(`INTERFERENCIA ${nombre}: ${valor.toFixed(2)} < ${minimo}`);
}
// tangente común (por construcción; se comprueba igual)
if (zA + D.R1 !== D.tang || zB + D.R2 !== D.tang) throw new Error('tangente no común');
chk.tangente = `Z=${D.tang} común: zA+R1 = ${zA + D.R1} · zB+R2 = ${zB + D.R2}`;
// 1) cruce eje A sobre eje B: luz vertical entre superficies
gate('luz_cruce_ejes', (zA - zB) - D.ejeDia, D.luzMin);
// 2) eje A (X=±76.2…) junto al disco de la rueda B (ancho W2 en X): luz axial
gate('luz_ejeA_ruedaB', (D.pitch / 2) - D.W2 / 2 - D.ejeDia / 2, D.luzMin);
//    y si algún día el eje A pasara sobre el disco: semicuerda de la Ø120 a la
//    altura del eje A (gobernaría con pasos menores)
chk.semicuerda_B_en_zA = `${Math.sqrt(D.R2 ** 2 - (zA - zB) ** 2).toFixed(1)} mm (< ${(D.pitch / 2 - D.ejeDia / 2).toFixed(1)} disponible)`;
// 3) eje B (z=110) atraviesa la franja vertical de la rueda A (llega a z=100):
//    luz axial en Y entre eje B y cara de la rueda A
gate('luz_ejeB_ruedaA', (D.pitch / 2) - D.W1 / 2 - D.ejeDia / 2, D.luzMin);
// 4) rueda A vs rueda B en planta (gap en X entre el disco Ø120 y el Ø70)
gate('gap_planta_AB_X', (D.pitch / 2) - D.W2 / 2 - D.R1, D.luzMin);
// 5) ruedas B entre ejes vecinos (Ø120 con paso 152.4 en Y)
gate('luz_ruedaB_ruedaB', D.pitch - 2 * D.R2, D.luzMin);
// 6) rueda B sobre el fondo
gate('luz_ruedaB_fondo', (D.tang - 2 * D.R2) - (D.fondoZ + D.fondo), D.luzMin);

// --------------------------------------------------------------- constructor
let np = 0, nf = 0;
const fid = () => `of${++nf}`;
const parts = [];
const box = (name, at, w, d, h, color) => ({ id: fid(), name, shape: 'box', op: 'union', at, dir: [0, 0, 1], params: { w, d, h }, color });
const cyl = (name, at, dir, dia, h, color) => ({ id: fid(), name, shape: 'cylinder', op: 'union', at, dir, params: { dia, h }, color });
const part = (name, color, feats, pos = [0, 0, 0], quat = [0, 0, 0, 1], extra = {}) =>
  parts.push({ id: `op${++np}`, name, color, pos, quat, fixed: false, visible: true, features: feats, ...extra });

function compFeatures(id) {
  const c = COMP.get(id);
  if (!c) throw new Error(`componente no está en la biblioteca: ${id}`);
  return c.solidos.map(s => s.tipo === 'caja'
    ? { id: fid(), name: s.nombre, shape: 'box', op: 'union', at: [...s.at], dir: [0, 0, 1], params: { w: s.dim[0], d: s.dim[1], h: s.dim[2] }, color: s.color }
    : { id: fid(), name: s.nombre, shape: 'cylinder', op: 'union', at: [...s.at], dir: s.eje || [0, 0, 1], params: { dia: s.dia, h: s.alto }, color: s.color });
}
function placeComp(nombre, id, pos, quat = [0, 0, 0, 1]) {
  const c = COMP.get(id);
  parts.push({ id: `op${++np}_${id}`, name: `${nombre} · ${c.nombre}`, biblioteca: id, color: '#1976d2', pos, quat, fixed: false, visible: true, base_ref: true, features: compFeatures(id) });
}
const Q_XtoY = [0, 0, Math.SQRT1_2, Math.SQRT1_2]; // eje local X → Y (ruedas de avance)

const C = { placa: '#212121', fondo: '#263238', eje: '#b0bec5', chum: '#455a64', motor: '#37474f', correa: '#111111', foto: '#c62828' };
const H = D.mod / 2;

// bastidor: bandeja + 4 placas perimetrales (negro mate, CV-OMW)
part('Bandeja de fondo', C.fondo, [box('Fondo 609.6×609.6×5', [0, 0, D.fondoZ], D.mod, D.mod, D.fondo, C.fondo)]);
for (const s of [-1, 1]) {
  part(`Placa lateral Y${s > 0 ? '+' : '-'}`, C.placa,
    [box(`Placa 609.6×${D.placa}×${D.placaZ1 - D.placaZ0}`, [0, s * (H - D.placa / 2), D.placaZ0], D.mod, D.placa, D.placaZ1 - D.placaZ0, C.placa)]);
  part(`Placa frontal X${s > 0 ? '+' : '-'}`, C.placa,
    [box(`Placa ${D.placa}×${D.mod - 2 * D.placa}×${D.placaZ1 - D.placaZ0}`, [s * (H - D.placa / 2), 0, D.placaZ0], D.placa, D.mod - 2 * D.placa, D.placaZ1 - D.placaZ0, C.placa)]);
}

// ejes A (avance): Ø15 a lo ancho (Y), z=135, con chumaceras en las placas Y±
for (const x of D.ejesA_X) {
  const fe = [cyl(`Eje A Ø${D.ejeDia}×${D.mod}`, [x, -H, zA], [0, 1, 0], D.ejeDia, D.mod, C.eje)];
  for (const s of [-1, 1]) fe.push(box('Chumacera eje A', [x, s * (H - D.placa - D.chum[1] / 2), zA - D.chum[2] / 2], D.chum[0], D.chum[1], D.chum[2], C.chum));
  part(`Eje A (avance) x=${x.toFixed(1)}`, C.eje, fe);
  for (const y of D.ruedasA_Y) placeComp(`Rueda avance Ø70 (${x.toFixed(0)},${y.toFixed(0)})`, 'rueda_omni_70_doble', [x, y, D.tang - 2 * D.R1], Q_XtoY);
}

// ejes B (eyección): Ø15 según flujo (X), z=110, chumaceras en placas X±
for (const y of D.ejesB_Y) {
  const fe = [cyl(`Eje B Ø${D.ejeDia}×${D.mod}`, [-H, y, zB], [1, 0, 0], D.ejeDia, D.mod, C.eje)];
  for (const s of [-1, 1]) fe.push(box('Chumacera eje B', [s * (H - D.placa - D.chum[1] / 2), y, zB - D.chum[2] / 2], D.chum[1], D.chum[0], D.chum[2], C.chum));
  part(`Eje B (eyección) y=${y.toFixed(1)}`, C.eje, fe);
  for (const x of D.ruedasB_X) placeComp(`Rueda eyección Ø120 (${x.toFixed(0)},${y.toFixed(0)})`, 'rueda_omni_120_doble', [x, y, D.tang - 2 * D.R2]);
}

// motores UniDrive 60 W (1 por eje; el +1 adicional del BOM no se instala):
// bajo la cama, correa síncrona interior hasta el eje (asoma solo la corona)
for (const [i, x] of D.ejesA_X.entries()) {
  const ym = (i % 2 ? 1 : -1) * (H - 90);
  part(`Motor UniDrive eje A x=${x.toFixed(0)}`, C.motor, [
    cyl(`UniDrive 60W Ø${D.motorDia}`, [x, ym - D.motorL / 2, D.motorZ], [0, 1, 0], D.motorDia, D.motorL, C.motor),
    box('Correa síncrona interior', [x, ym, D.motorZ], 12, 22, zA - D.motorZ, C.correa),
  ]);
}
for (const [i, y] of D.ejesB_Y.entries()) {
  const xm = (i % 2 ? 1 : -1) * (H - 90);
  part(`Motor UniDrive eje B y=${y.toFixed(0)}`, C.motor, [
    cyl(`UniDrive 60W Ø${D.motorDia}`, [xm - D.motorL / 2, y, D.motorZ], [1, 0, 0], D.motorDia, D.motorL, C.motor),
    box('Correa síncrona interior', [xm, y, D.motorZ], 22, 12, zB - D.motorZ, C.correa),
  ]);
}

// fotocélula del modo 'stop' a 0.82·L (doc omniwheel.md del simulador)
const fx = -H + D.fotoX * D.mod;
part('Fotocélula S1 (modo stop)', C.foto, [
  box('Poste', [fx, -(H - D.placa - 8), D.placaZ1], 10, 10, D.tang + 18 - D.placaZ1, C.placa),
  box('Fotocélula', [fx, -(H - D.placa - 8), D.tang + 8], 16, 22, 34, C.foto),
]);

// ------------------------------------------------------------------- salida
const metrics = {
  modulo: `24"×24" (${D.mod}×${D.mod}), tangente Z=${D.tang}`,
  ruedas: `${D.ejesA_X.length * D.ruedasA_Y.length}× Ø70 avance + ${D.ejesB_Y.length * D.ruedasB_X.length}× Ø120 eyección`,
  ejes: `${D.ejesA_X.length} ejes A Ø15 (Y, z=${zA}) + ${D.ejesB_Y.length} ejes B Ø15 (X, z=${zB}) — cruzados con luz ${(zA - zB - D.ejeDia).toFixed(0)} mm`,
  contactos: `retícula 6" (152.4): avance 4×4 intercalada con eyección 3×3 (tresbolillo, contacto más próximo ${(D.pitch / Math.SQRT2).toFixed(1)} mm)`,
  motores: `${D.ejesA_X.length + D.ejesB_Y.length} UniDrive 60W 24VDC instalados + 1 adicional (BOM CV-OMW)`,
  ...chk,
};
const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'Módulo desviador Omniwheel CV-OMW — ejes perpendiculares, tangente común',
    capa: 'user',
    origen: 'gen_omniwheel.mjs (paramétrico). Ruedas: rueda_omni_70_doble (snapshot Inventor del usuario, omniwheel10) y rueda_omni_120_doble (derivada mayor). La familia de EYECCIÓN usa la rueda MAYOR: con tangente común su eje queda ΔZ=25 más abajo y los ejes perpendiculares se cruzan en planta sin tocarse (luz 10 mm entre ejes Ø15).',
    anfitrion: 'CV-OMW del conveyone-simulator (docs/omniwheel.md): módulo 24"×24" inserto EN LÍNEA; lógicas dyn 30° / stop 90° con fotocélula a 0.82·L; 1 motor UniDrive 60 W por fila + 1 adicional, correa síncrona interior; 24 VDC.',
    integracion: 'se acopla en línea como un transportador (entrada connIn / salida en cadena); salidas laterales outL/outR según configuración. El plano de transporte Z=170 es el del marco del módulo (mismo idioma que base_sorter).',
    tolerancias: {
      ejes: 'ejes calibrados Ø15 h6 pasantes, chaveta DIN 6885 5×5 bajo cada rueda, chumaceras de brida en las placas perimetrales; familias a Z distinta (135/110): en los 12 cruces de planta la luz entre superficies de eje es 10 mm.',
      ruedas: 'rodillos reales ABOMBADOS (perfil torneado al radio de rodadura) para envolvente continua; en el modelo primitivo son cilindros y la envolvente de la Ø120 excede 0.8 mm radiales en los extremos de rodillo — desaparece con el abombado.',
      transmision: 'correa síncrona interior por eje (asoma solo la corona de las ruedas, cuerpo cerrado negro mate); motores UniDrive 60 W 24 VDC bajo la cama.',
    },
    verificaciones: metrics,
  },
  parts,
  constraints: [],
};
writeFileSync(join(here, 'omni_modulo.json'), JSON.stringify(doc, null, 1));
console.log(`OK: ${parts.length} piezas, ${nf} funciones → omni_modulo.json`);
for (const [k, v] of Object.entries(metrics)) console.log(`   ${k}: ${v}`);
