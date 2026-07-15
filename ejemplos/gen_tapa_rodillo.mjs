// Tapa de rodillo imprimible en 3D (símil Mason Plastics MP1540SLR716HSS):
// rodamiento liso de DOS piezas + bolsillo para resorte, para tubo 1-1/2" SCH40
// y eje hexagonal 11 mm (7/16"). Emite un proyecto foto3d-cad verificado.
import * as THREE from 'three';
import {
  newDoc, newPart, makeCylFeature, makeSketchEntitiesFeature, makeRevolveFeature, buildPartGeometry,
} from '../js/model.js';
import { makeLine, regularPolygon } from '../js/sketch2d.js';

const IN = 25.4;
const OD = 1.9 * IN;      // 48.26 (Ø tubo)
const Rf = OD / 2;        // 24.13 flange = OD tubo (tapa el extremo)
const Di = OD - 2 * 0.145 * IN; // 40.89 (ID tubo SCH40)
const Rid = Di / 2;       // 20.447 radio interior tubo
const HEX_AF = 11;        // 7/16" ≈ 11 mm entre caras
const HEX_R = HEX_AF / Math.sqrt(3);
// Ajustes de la unión a presión (conicidad) y del rodamiento liso:
const RpressMouth = Rid + 0.10;  // 20.55 en la boca (interferencia 0.2 mm Ø)
const RpressDeep = Rid - 0.30;   // 20.15 al fondo (entrada guía) → conicidad ~1.4°
const Rj = 12.0;                 // radio de la pista (bore del alojamiento)
const Radj = Rj - 0.2;           // 11.8 pista del adaptador (0.4 mm Ø de juego → gira)
const Rsh = 7.0;                 // agujero de paso del eje en el flange (el hex libra)
const FL = 3;                    // espesor del flange
const DEEP = 19;                 // profundidad del cuerpo dentro del tubo
const ADJ_L = 15;                // largo del adaptador
const SPR_R = 7.5, SPR_D = 8;    // bolsillo del resorte (Ø15 × 8)

let pass = 0, fail = 0;
function volume(g) { const p = g.attributes.position; if (!p) return 0; let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6; } return v; }
const hasNaN = (g) => (g.attributes.position?.array || []).some(x => !Number.isFinite(x));
function verify(part) { const g = buildPartGeometry(part); const v = volume(g), nan = hasNaN(g); const ok = v > 1 && !nan; (ok ? pass++ : fail++); console.log(`  ${ok ? '✔' : '✘'} ${part.name}: vol=${(v / 1000).toFixed(2)} cm³${nan ? ' NaN!' : ''}`); return part; }

// perfil cerrado [z, r] → entidades 2D para revolución alrededor de Z (eje 2D X)
const loop = (pts) => pts.map((p, i) => makeLine(p, pts[(i + 1) % pts.length]));
const revZ = (entities, op = 'union') =>
  makeRevolveFeature(entities, [], { a: [0, 0], b: [1, 0] }, op, [0, 0, 0], [1, 0, 0], [0, 0, 1]);

const doc = newDoc();

// ---- Pieza 1: Alojamiento (pista exterior, entra a presión en el tubo) ----
function makeHousing() {
  const part = newPart(doc, 'Tapa: alojamiento'); part.color = '#3f6fb0';
  // perfil de copa: flange + cuerpo cónico + bore de pista + agujero del eje
  const prof = [
    [0, Rsh],            // cara exterior, borde del agujero del eje
    [0, Rf],             // cara exterior hasta el borde del flange (OD tubo)
    [FL, Rf],            // canto del flange
    [FL, RpressMouth],   // hombro: apoya en la cara del tubo, baja al OD del cuerpo
    [DEEP, RpressDeep],  // cuerpo CÓNICO (boca 20.55 → fondo 20.15) = apriete
    [DEEP, Rj],          // reborde de fondo hacia el bore de la pista
    [FL, Rj],            // pared del bore de la pista (sube al flange)
    [FL, Rsh],           // cara interior del flange, hasta el agujero del eje
  ];
  part.features.push(revZ(loop(prof)));
  return verify(part);
}

// ---- Pieza 2: Cubo hexagonal (pista interior, fija al eje hexagonal) ----
function makeHexHub() {
  const part = newPart(doc, 'Tapa: cubo hexagonal'); part.color = '#c9752e';
  // cilindro de la pista
  part.features.push(makeCylFeature(Radj * 2, ADJ_L, [0, 0, 0], [0, 0, 1], 'union'));
  // barreno hexagonal pasante (11 mm entre caras) para el eje
  part.features.push(makeSketchEntitiesFeature(
    regularPolygon([0, 0], [0, HEX_R], 6), [], ADJ_L + 4, 'cut', [0, 0, -2], [0, 0, 1], [1, 0, 0]));
  // bolsillo del resorte en la cara interior (rodea el hex, aloja el muelle de compresión)
  part.features.push(makeCylFeature(SPR_R * 2, SPR_D + 1, [0, 0, ADJ_L - SPR_D], [0, 0, 1], 'cut'));
  return verify(part);
}

console.log('— Verificación de la tapa de rodillo imprimible —');
const h = makeHousing(); h.pos = [0, 0, 0];
const a = makeHexHub(); a.pos = [60, 0, 0];

console.log(`\nRESULTADO: ${pass} ok, ${fail} fallan`);
console.log('DIMS', JSON.stringify({
  OD: +OD.toFixed(2), ID: +Di.toFixed(2), conicidad_boca: RpressMouth, conicidad_fondo: RpressDeep,
  interferencia_dia: +((RpressMouth - Rid) * 2).toFixed(2), pista_juego_dia: +((Rj - Radj) * 2).toFixed(2),
  hex_AF: HEX_AF, bolsillo_resorte: `Ø${SPR_R * 2}×${SPR_D}`,
}));

import { writeFileSync } from 'fs';
writeFileSync('ejemplos/tapa_rodillo_impresion.json', JSON.stringify(doc, null, 2));
console.log('JSON escrito: cad/ejemplos/tapa_rodillo_impresion.json,', doc.parts.length, 'piezas');
process.exit(fail ? 1 : 0);
