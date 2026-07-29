#!/usr/bin/env node
// test_rodillos_sch40.mjs — invariantes del conjunto RC-SCH40-48.
// Lee el documento emitido por gen_rodillos.mjs y comprueba que lo que promete
// el README sigue siendo cierto. `npm test` lo recoge solo (tests/test_*.mjs).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aquí = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(aquí, '../ensambles/rodillos_sch40/rodillos_sch40.json'), 'utf8'));
const v = doc.meta.verificaciones;
const parts = doc.parts;

let ok = 0, fail = 0;
const t = (cond, msg) => { if (cond) { ok++; } else { fail++; console.log(`  ✘ ${msg}`); } };
const uno = (re) => parts.filter((p) => re.test(p.name));

// ── envolvente idéntico al catálogo Damon ────────────────────────────────────
t(v.EL === 532, 'EL debe ser 532 (luz entre largueros del catálogo)');
t(v.tubo === 522, 'el tubo debe medir 522');
t(v.sobreTapas === 531, 'sobre tapas debe ser 531');
t(v.sobreEjes === 553, 'sobre ejes debe ser 553');
t(v.sobreEjes - v.EL === 21, 'el eje debe sobresalir 10.5 por lado');
t(v.sobreTapas - v.tubo === 9, 'la tapa debe asomar 4.5 por lado');

// ── el contrataladro es lo que hace entrar la tapa ───────────────────────────
t(v.paredRestante >= 1.2, `pared del contrataladro ${v.paredRestante} >= 1.2`);
t(v.paredPeorCaso >= 0.9, `pared en el peor caso ${v.paredPeorCaso} >= 0.9`);
t(/Ø45 H8 × 20/.test(v.contrataladro), 'el contrataladro debe ser Ø45 H8 × 20');

// ── el cono: las 18 filas del catálogo, y el ángulo que publican Damon/Interroll
t(v.cono.k === 0.06289, 'k del cono debe ser 0.06289');
t(v.cono.errorMaxTablaCatalogo <= 0.35,
  `el cono debe reproducir la tabla del catálogo (error ${v.cono.errorMaxTablaCatalogo} <= 0.35)`);
t(Math.abs(v.cono.semianguloDeg - 1.8) < 0.05, 'semiángulo del cono = 1.8°');
t(Math.abs(v.curva.radioInterior - 884.08) < 1, 'radio interior de curva ≈ 884');
t(Math.abs(v.curva.radioExterior - v.curva.radioInterior - v.cono.WT) < 0.01, 'R ext − R int = WT');

// ── resorte: tiene que dar la carrera de montaje sin llegar a bloque ─────────
t(v.resorte.carreraDisponible >= v.resorte.carreraNecesaria,
  `carrera ${v.resorte.carreraDisponible} >= ${v.resorte.carreraNecesaria}`);
t(v.resorte.precarga_N > 5, `precarga ${v.resorte.precarga_N} N debe superar 5 N`);
t(v.resorte.maxima_N < 60, `fuerza máxima ${v.resorte.maxima_N} N debe poder vencerse con el pulgar`);

// ── rodamiento y rigidez ─────────────────────────────────────────────────────
t(v.rodamiento.s0 >= 2, `s0 = ${v.rodamiento.s0} >= 2`);
t(v.rodamiento.L10h >= 20000, 'vida L10h >= 20 000 h');
t(v.flecha_mm < v.luzEntreRodamientos / 1000, `flecha ${v.flecha_mm} < L/1000`);

// ── composición del conjunto ─────────────────────────────────────────────────
t(parts.length === 23, `23 piezas (hay ${parts.length})`);
t(uno(/Tubo SCH40/).length === 2, '2 tubos (uno por rodillo)');
t(uno(/Eje pasante/).length === 2, '2 ejes pasantes');
t(uno(/Tapa portarodamiento/).length === 4, '4 tapas');
t(uno(/Rodamiento 6201-2Z/).length === 4, '4 rodamientos');
t(uno(/Anillo retención/).length === 4, '4 anillos DIN 471');
t(uno(/Resorte de compresión/).length === 4, '4 resortes (2 por rodillo)');
t(uno(/Camisa cónica/).length === 3, '3 camisas cónicas');

// ── el cónico es el plano + camisas: mismo núcleo, sin cotas duplicadas ──────
// (los ids de las entidades del perfil son un contador global: no son forma)
const sinIds = (o) => JSON.stringify(o).replace(/"id":"[^"]*",?/g, '');
const tuboPlano = uno(/^PLANO · Tubo/)[0], tuboConico = uno(/^CÓNICO · Tubo/)[0];
t(sinIds(tuboPlano.features[0].params) === sinIds(tuboConico.features[0].params),
  'el tubo del cónico debe ser idéntico al del plano');
const ejeP = uno(/^PLANO · Eje pasante/)[0], ejeC = uno(/^CÓNICO · Eje pasante/)[0];
t(ejeP.features.length === ejeC.features.length, 'el eje del cónico es el mismo que el del plano');

// ── las camisas crecen con el cono y encajan sobre la cañería ───────────────
const camisas = uno(/Camisa cónica/).sort((a, b) => a.pos[0] - b.pos[0]);
t(camisas.length === 3 && camisas[0].pos[0] < camisas[1].pos[0] && camisas[1].pos[0] < camisas[2].pos[0],
  'las camisas van en orden a lo largo del tubo');
t(/Ø55.6→/.test(camisas[0].name), 'la primera camisa arranca en D1 = 55.6');
t(new RegExp(`→Ø${v.cono.D2}`).test(camisas[2].name), `la última camisa llega a D2 = ${v.cono.D2}`);

// ── el eje NO gira y las tapas son de catálogo ───────────────────────────────
t(uno(/Eje pasante/).every((p) => p.gira === false), 'el eje está marcado como pieza que no gira');
t(uno(/Tapa portarodamiento/).every((p) => p.componente === 'SKPB4812-1.5'),
  'las tapas deben referenciar el portarodamiento de catálogo');

// ── hallazgos que el diseño debe seguir reportando ──────────────────────────
t(v.avisos.some((a) => /CANALES/.test(a)), 'debe seguir avisando que los canales no se pueden mecanizar');
t(v.avisos.some((a) => /HEXAGONAL/.test(a)), 'debe seguir avisando lo del eje hexagonal');

// ── interferencias ───────────────────────────────────────────────────────────
t(v.solapesAABB === 0 || typeof v.solapesAABB === 'number', 'solapes AABB reportados');

console.log(`test_rodillos_sch40: ${ok} ok, ${fail} fallo(s)`);
process.exit(fail ? 1 : 0);
