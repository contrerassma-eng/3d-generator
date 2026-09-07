#!/usr/bin/env node
// gen_blt800.mjs — CV-BLT-800 · banda plana M-HASTE ARMADA CON LOS ORIGINALES
//
// Orden de Sergio (19-08): «Faltan detalles, no están bien representados los
// elementos M-HASTE, tampoco banda ni perfiles de aluminio, soportes a piso,
// nada. NO DEBES REPRESENTAR, DEBES USAR LOS ORIGINALES».
//
// Rev.B: se retiran TODAS las cajas y cilindros que imitaban al vendor. Cada
// pieza de este ensamble es geometría REAL:
//   · cabeza motriz, cola tensora y cuerpo (rieles de aluminio + banda +
//     rodillos de apoyo) = CORTES del original completo
//     MC400-FL-A-L6000-W400-25TU1-S2-LA2-UBK1.2HFLM-KM1 (723.374 triángulos).
//     Cortar a largo es lo que hace la fábrica: los vértices del original NO
//     se mueven, sólo nacen vértices en el plano de corte (lib_glb.corta).
//   · patas y pies a piso = estaciones cortadas del mismo original.
//   · el ANCHO lo fija el original (W400): no se estira nada para llegar a un
//     número inventado. El LARGO 800 sale de cortar el perfil, que es
//     legítimo (el perfil se compra por metro y se corta).
//
// Referencias de biblioteca (piezas sueltas, mismo origen CADENAS
// PARTsolutions AP203): MC400-W300.222 (tambor motriz), MC400-W300.222.S
// (tambor de cola), MC400-223/225 (cabezales), MHD15/MJD15 (ejes),
// MTB800-301/302/304/317/331 + MT800-05-301-W100/217 (patas y pies) — sus
// láminas viven en el paquete MB800 REV A.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compuertasUniversales, sellarCompuertas } from './lib_compuertas.mjs';
import { cargarGLB } from './lib_glb.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const r2 = (v) => Math.round(v * 100) / 100;
const ORIGINAL = 'MC400-FL-A-L6000-W400-25TU1-S2-LA2-UBK1.2HFLM-KM1-0Knob-control-panelM1LMM2.glb';

// medidas del ORIGINAL (auto-medidas, no transcritas)
const [src] = await cargarGLB(ORIGINAL);
const Zmin = src.min[2], Zmax = src.max[2];
const codigoOriginal = src.nombre;                       // MC400-FL-A-L6000-W400-25T1-S0-LA2-PVC400M10SSM

// ventanas del original (medidas con histograma de vértices, 19-08):
//   cola 0..360 · estación de pata 375..440 · cuerpo limpio 800..1230 · cabeza últimos 170
const L_COLA = 360, L_CABEZA = 170, L_PATA = 65;
const L = 800;                                            // largo del ejemplo
const L_CUERPO = r2(L - L_COLA - L_CABEZA);               // 270 de perfil cortado

const parts = [];
let np = 0;
const pieza = (nombre, color, glb, pos, extra = {}) => {
  parts.push({
    id: `p${++np}_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    nombre, name: nombre, color, pos, quat: [0, 0, 0, 1],
    fixed: parts.length === 0, visible: true, features: [], glb, ...extra,
  });
};
const C = { cuerpo: '#c8c8c6', motriz: '#8f979e', banda: '#3667a6', pata: '#b7bdc2' };

// MARCO COMÚN (los cortes de un original deben seguir alineados entre sí):
// el original tiene X=ancho, Y=alto (negativo abajo), Z=largo. El ensamble usa
// X=largo, Y=ancho, Z=alto ⇒ permutación [2,0,1] + offset que lleva la COLA a
// x=0, el centro de banda a y=0 y el PISO a z=0. Cada corte se desliza sólo
// en X (dx) — nada se re-centra por su cuenta.
const Yfloor = src.min[1], Xcen = (src.min[0] + src.max[0]) / 2;
const MAPA = [2, 0, 1];
const marco = (dx) => ({ mapa: MAPA, offset: [-Zmin + dx, -Xcen, -Yfloor] });

// COLA (tambor de cola + tensor + cabezales, todo original)
pieza('VENDOR · Cabezal de COLA M-HASTE (tambor, tensor y cabezales — original)', C.motriz,
  { archivo: ORIGINAL, corte: [{ eje: 'z', min: Zmin, max: Zmin + L_COLA }], ...marco(0) },
  [r2(L_COLA / 2), 0, 0]);

// CUERPO: rieles de aluminio + banda + rodillos de apoyo, CORTADO a largo
pieza(`VENDOR · Cuerpo M-HASTE cortado a ${L_CUERPO} (rieles de aluminio + banda + rodillos de apoyo — original)`, C.cuerpo,
  { archivo: ORIGINAL, corte: [{ eje: 'z', min: Zmin + 800, max: Zmin + 800 + L_CUERPO }], ...marco(L_COLA - 800) },
  [r2(L_COLA + L_CUERPO / 2), 0, 0]);

// CABEZA motriz (tambor motriz + motorreductor + cabezales, original)
pieza('VENDOR · Cabezal MOTRIZ M-HASTE (tambor, motorreductor y cabezales — original)', C.motriz,
  { archivo: ORIGINAL, corte: [{ eje: 'z', min: Zmax - L_CABEZA, max: Zmax }], ...marco(L - L_CABEZA - (Zmax - L_CABEZA - Zmin)) },
  [r2(L - L_CABEZA / 2), 0, 0]);

// SOPORTES A PISO: la estación de pata del original, en dos posiciones
for (const [i, xDest] of [150, 590].entries()) {
  pieza(`VENDOR · Soporte a piso M-HASTE — estación ${i + 1} (patas, pies y placas — original)`, C.pata,
    { archivo: ORIGINAL, corte: [{ eje: 'z', min: Zmin + 375, max: Zmin + 375 + L_PATA }], ...marco(xDest - 375) },
    [r2(xDest + L_PATA / 2), 0, 0]);
}

// ── compuertas: piezas VENDOR sin desarrollo de chapa (cobertura declarada) ──
const uni = compuertasUniversales({ blt800: { parts } }, {});
const e = uni.errs.slice();
for (const [nm, i] of Object.entries(uni.info)) {
  console.log(`  ${nm}: piezas ${i.cobertura?.piezas} · con desarrollo ${i.cobertura?.con_desarrollo} (${i.cobertura?.pct}%)${i.aviso ? ' — ' + i.aviso : ''}`);
}
if (e.length) throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - '));

const doc = {
  meta: {
    nombre: `CV-BLT-800 · banda plana M-HASTE ${codigoOriginal} — ARMADA CON ORIGINALES (L800 × W400)`,
    revision: 'B', revision_reemplaza: 'Rev. A (retirada: imitaba al vendor con cajas)',
    revision_causa: 'orden de Sergio 19-08: no representar — usar los originales. Cabeza, cola, cuerpo (rieles de aluminio + banda + rodillos) y soportes a piso son CORTES del GLB original de fábrica; el ancho lo fija el original (W400)',
    capa: 'user-vendor — geometría REAL M-HASTE (CADENAS PARTsolutions AP203), cortada a largo, sin deformar',
    origen: `gen_blt800.mjs sobre ${ORIGINAL}`,
    original: { archivo: ORIGINAL, codigo: codigoOriginal, dims_mm: src.dims, triangulos: src.tris },
    largo_nose_a_nose: L,
    ga: {
      codigo: 'CV-BLT-800', proyecto: 'CV-BLT · Conveyone', boletin: '03',
      fuente: `original M-HASTE ${codigoOriginal} — cortes sin deformar`,
      numPlano: 'BLT800-GA-01', notaBanda: 'banda, rieles de aluminio y rodillos de apoyo: geometría ORIGINAL del fabricante',
      notaLargo: '', notaTerminacion: 'Acabado y altura: los del fabricante (perfil anodizado, pies niveladores M-HASTE).',
      notas: [
        'SUMINISTRO DE CATÁLOGO (no se fabrica): el equipo se compra armado o por conjuntos M-HASTE.',
        '· Geometría de estas vistas = GLB ORIGINAL del fabricante, cortado a largo y SIN deformar (lib_glb.corta).',
        '· El ANCHO es el del original (W400): no se estira para llegar a una cifra inventada.',
        '· El LARGO 800 sale de cortar el perfil a medida — el rango de catálogo es L650…12000.',
        '· Material, masa y precios: POR CONFIRMAR contra lista M-HASTE (el GLB no los declara).',
      ],
      rotula: [
        ['Cabezal MOTRIZ', 'cabeza motriz ORIGINAL: tambor, motorreductor y cabezales de fábrica'],
        ['Cuerpo M-HASTE', 'cuerpo ORIGINAL cortado a largo: rieles de aluminio, banda y rodillos de apoyo'],
        ['Cabezal de COLA', 'cola ORIGINAL: tambor de cola y tensado por tornillo'],
        ['Soporte a piso', 'soporte a piso ORIGINAL (patas, pies niveladores y placas)'],
      ],
      grupos: [['Cabezal MOTRIZ', 'cabeza'], ['Cuerpo M-HASTE', 'cuerpo'], ['Cabezal de COLA', 'cola'], ['Soporte a piso', 'soportes']],
    },
    manual: { boletin: '03', codigo: 'CV-BLT-800',
      accionamiento: 'motorreductor M-HASTE del original (acople directo DL)',
      seguridad: [
        'Bloqueo y consignación (LOTO): corte y candadeo de la alimentación del motorreductor.',
        'Verificar detención TOTAL de la banda antes de intervenir cabeza o cola.',
        'Manual del FABRICANTE M-HASTE: prevalece sobre este boletín en operación y garantía.',
      ],
      atrapamiento: [
        'Entrada de banda al tambor MOTRIZ (cabeza) y al tambor de COLA — nip points sin guarda en el suministro estándar.',
        'Rodillos de apoyo bajo la banda: no operar con las manos en el canal.',
        'Tornillo tensor de la cola: alejar las manos al tensar.',
      ],
      operacion: [
        'Velocidad: 0-80 m/min según catálogo M-HASTE (variador del equipo) — POR CONFIRMAR la de esta unidad.',
        'Carga: 80-500 kg según catálogo M-HASTE, función del largo y del apoyo — POR CONFIRMAR.',
        'Banda PVC del original: no usar productos abrasivos ni disolventes en la limpieza.',
      ],
      mantencion: [
        'Semanal: tensado y centrado de banda (tornillo de cola); limpieza del canal.',
        'Mensual: apriete de uniones del perfil serie 80 y de los pies niveladores.',
        'Según fabricante: rodamientos de tambores y reductor — ver manual M-HASTE.',
      ],
    },
    compuertas: sellarCompuertas(uni, { exenciones: [], deuda: [], especificas: 0 }),
  },
  parts, constraints: [],
};
writeFileSync(join(here, 'blt800.json'), JSON.stringify(doc, null, 1));
console.log(`OK blt800.json (Rev.B — ORIGINALES): ${parts.length} conjuntos · L${L} × W400 · original ${codigoOriginal} (${src.tris} tris)`);
