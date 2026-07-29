#!/usr/bin/env node
// gen_rodillos.mjs — integrador del conjunto RC-SCH40-48.
// Construye el rodillo PLANO y el CÓNICO, corre la compuerta de verificación y
// escribe el documento `foto3d-cad` que abre la app de diseño del repo:
//
//   cad/index.html → 📂 Abrir → cad/ensambles/rodillos_sch40/rodillos_sch40.json
//   cad/ensambles/ver.html?doc=rodillos_sch40/rodillos_sch40.json&view=iso
import { writeFileSync } from 'node:fs';
import { Ensamble, bboxPieza, solapan, r2 } from './lib.mjs';
import { P, X, diaCono, kResorte } from './params.mjs';
import { plano, ranuraX } from './plano.mjs';
import { conico } from './conico.mjs';

const E = new Ensamble();
const m = { plano: plano(E) || {}, conico: conico(E) || {} };

function verify() {
  const e = [], avisos = [];

  // 1 · envolvente exterior idéntica al catálogo (intercambiabilidad en el bastidor)
  if (P.EL !== 532) e.push(`EL = ${P.EL}; el catálogo es 532`);
  if (P.sobreTapas !== 531) e.push(`sobre tapas = ${P.sobreTapas}; el catálogo es 531`);
  if (P.sobreEjes !== 553) e.push(`sobre ejes = ${P.sobreEjes}; el catálogo es 553`);
  if (P.tuboLargo !== 522) e.push(`tubo = ${P.tuboLargo}; el catálogo es 522`);

  // 2 · el contrataladro es OBLIGATORIO y debe dejar pared sana
  if (P.contra.d <= P.tubo.idPeorMax) {
    e.push(`el contrataladro Ø${P.contra.d} no supera el ID en el peor caso (${P.tubo.idPeorMax}): no garantiza limpiar el material`);
  }
  const paredRest = r2((P.tubo.od - P.contra.d) / 2);
  const paredPeor = r2((P.tubo.od - P.tubo.odTolMenos - P.contra.d) / 2);
  if (paredRest < 1.2) e.push(`el contrataladro deja pared ${paredRest} < 1.2 mm`);
  if (paredPeor < 0.9) e.push(`con OD en el mínimo de norma la pared cae a ${paredPeor} mm`);

  // 3 · el alojamiento del rodamiento tiene que caber en el cuerpo de prensa
  if (P.tapa.asientoD + 4 > P.contra.d) e.push(`alojamiento Ø${P.tapa.asientoD} demasiado cerca del Ø${P.contra.d} de prensa`);
  if (P.tapa.hombroD >= P.tapa.asientoD) e.push(`el hombro Ø${P.tapa.hombroD} no retiene el aro exterior Ø${P.tapa.asientoD}`);

  // 4 · el resorte tiene que dar carrera para meter la punta dentro del larguero
  const carreraNecesaria = r2(P.salienteEje + 2);          // 10.5 de saliente + margen
  const carreraDisp = r2(P.resorte.montado - P.resorte.solido);
  if (carreraDisp < carreraNecesaria) {
    e.push(`carrera del resorte ${carreraDisp} < ${carreraNecesaria} necesarios (montado ${P.resorte.montado} − bloque ${P.resorte.solido})`);
  }
  if (P.resorte.libre <= P.resorte.montado) e.push(`el resorte L0=${P.resorte.libre} no queda precargado (montado ${P.resorte.montado})`);
  if (P.resorte.di <= P.eje.d) e.push(`el resorte (Di ${P.resorte.di}) no pasa por el eje Ø${P.eje.d}`);
  if (P.resorte.de >= P.tapa.faldonD) e.push(`el resorte Ø${P.resorte.de} no entra en el faldón Ø${P.tapa.faldonD}`);
  const k = kResorte();
  const Fprecarga = r2(k * (P.resorte.libre - P.resorte.montado));
  const Fmax = r2(k * (P.resorte.libre - P.resorte.solido));

  // 5 · las caras planas no pueden invadir la garganta del anillo
  const finPlanoIzq = r2(X.ejeX0 + P.eje.largoPlano);
  if (finPlanoIzq >= ranuraX(0)) e.push(`las caras planas llegan a ${finPlanoIzq} y la garganta está en ${ranuraX(0)}`);

  // 6 · el eje pasante tiene que cubrir las dos gargantas
  if (ranuraX(0) < X.ejeX0 || ranuraX(1) + P.anillo.ranuraW > X.ejeX0 + X.ejeLargo) {
    e.push('alguna garganta cae fuera del eje');
  }
  // 7 · el anillo debe quedar DENTRO del tubo (no puede chocar con la tapa)
  if (ranuraX(0) < X.tuboX0 + P.contra.prof) {
    avisos.push(`el anillo izquierdo (x=${ranuraX(0)}) queda dentro del tramo contrataladrado: verificar que el faldón de la tapa no lo toque`);
  }

  // 8 · GATE DEL CONO: el modelo debe reproducir la tabla del catálogo
  const tabla = [
    [245, 55.6, 71.0], [295, 52.5, 71.0], [345, 55.6, 77.3], [395, 52.5, 77.3],
    [445, 55.6, 83.6], [495, 52.5, 83.6], [545, 55.6, 89.9], [595, 52.5, 89.9],
    [645, 55.6, 96.2], [695, 52.5, 96.2], [745, 55.6, 102.5], [795, 52.5, 102.5],
    [845, 55.6, 108.8], [895, 52.5, 108.8], [945, 55.6, 115.0], [995, 52.5, 115.0],
    [1045, 55.6, 121.3], [1095, 52.5, 121.3],
  ];
  let peor = 0, peorFila = null;
  for (const [wt, d1, d2] of tabla) {
    const err = Math.abs(d1 + P.camisa.k * wt - d2);
    if (err > peor) { peor = err; peorFila = [wt, d1, d2, r2(d1 + P.camisa.k * wt)]; }
  }
  if (peor > 0.35) e.push(`el cono k=${P.camisa.k} no reproduce la tabla: error máx ${r2(peor)} mm en ${JSON.stringify(peorFila)}`);
  // el semiángulo debe ser el 1.8° que publican Damon (3.6°) e Interroll (1.8°)
  const semi = r2(Math.atan(P.camisa.k / 2) * 180 / Math.PI);
  if (Math.abs(semi - 1.8) > 0.05) e.push(`semiángulo del cono ${semi}° ≠ 1.8° del catálogo`);

  // 9 · camisas
  const paredTestaMenor = r2((P.camisa.D1 - P.camisa.idAjuste) / 2);
  if (paredTestaMenor < 3.0) e.push(`en la testa menor la camisa sólo tiene ${paredTestaMenor} mm de pared`);
  if (P.camisa.idAjuste <= P.tubo.od) e.push(`el barreno de la camisa (${P.camisa.idAjuste}) no desliza sobre Ø${P.tubo.od}`);

  // 10 · rodamiento: estático y vida
  const Pr = P.carga.N / 2;
  const s0 = r2((P.rodam.C0_kN * 1000) / Pr);
  const rpm = r2((P.carga.v / (Math.PI * P.tubo.od / 1000)) * 60);
  const L10 = Math.pow((P.rodam.C_kN * 1000) / Pr, 3);
  const L10h = r2((L10 * 1e6) / (60 * rpm));
  if (s0 < 2) e.push(`factor estático s0 = ${s0} < 2 con ${P.carga.N} N por rodillo`);
  if (L10h < P.carga.horas) e.push(`vida L10h = ${L10h} < ${P.carga.horas} h objetivo`);

  // 11 · flecha del tubo entre rodamientos
  const I = r2((Math.PI * (P.tubo.od ** 4 - P.tubo.id ** 4)) / 64);
  const span = r2((X.rodamDerX0 + X.rodamDerX1) / 2 - (X.rodamIzqX0 + X.rodamIzqX1) / 2);
  const flecha = +((P.carga.N * span ** 3) / (48 * 200000 * I)).toFixed(4);
  if (flecha > span / 1000) avisos.push(`flecha ${flecha} mm > L/1000 (${r2(span / 1000)})`);

  // 12 · AABB entre piezas (el veredicto exacto lo da interferencias_brep.py)
  const propias = E.parts.filter((p) => !p.contexto);
  const bb = propias.map(bboxPieza);
  let solapes = 0;
  for (let i = 0; i < propias.length; i++) {
    for (let j = i + 1; j < propias.length; j++) if (solapan(bb[i], bb[j], -0.3)) solapes++;
  }

  // 13 · HALLAZGO REPORTADO: los canales de correa redonda NO se pueden hacer
  const profCanal = r2((P.tubo.od - P.canal.fondoD) / 2);
  if (profCanal >= P.tubo.pared - 1.0) {
    avisos.push(`CANALES: el canal Ø${P.canal.fondoD} exige rebajar ${profCanal} mm y la pared de la SCH40 es ${P.tubo.pared} mm — NO se puede mecanizar sobre esta cañería (ver README §Canales de correa)`);
  }
  // 14 · el eje hexagonal del catálogo
  avisos.push('EJE HEXAGONAL: el "11 Hex" del plano Damon es 11 mm MÉTRICO (no 7/16"); 9/16" no es una medida estándar de rodillo por gravedad y no se encontró barra hexagonal de 11 mm en Chile → se usa eje redondo Ø12 con caras planas (opción del usuario).');

  if (e.length) throw new Error('Diseño inconsistente:\n  - ' + e.join('\n  - '));

  return {
    piezas: propias.length,
    EL: P.EL, tubo: P.tuboLargo, sobreTapas: P.sobreTapas, sobreEjes: P.sobreEjes,
    contrataladro: `Ø${P.contra.d} ${P.contra.tol} × ${P.contra.prof}`,
    paredRestante: paredRest, paredPeorCaso: paredPeor,
    idCañeriaPeorCaso: `${P.tubo.idPeorMin}…${P.tubo.idPeorMax}`,
    resorte: { k, precarga_N: Fprecarga, maxima_N: Fmax, carreraDisponible: carreraDisp, carreraNecesaria },
    cono: { k: P.camisa.k, semianguloDeg: semi, errorMaxTablaCatalogo: r2(peor), D1: P.camisa.D1, D2: m.conico.D2, WT: m.conico.WT },
    curva: { radioInterior: m.conico.radioInteriorCurva, radioExterior: m.conico.radioExteriorCurva },
    rodamiento: { s0, rpm, L10h, cargaPorRodamiento_N: Pr },
    tubo_I_mm4: I, luzEntreRodamientos: span, flecha_mm: flecha,
    solapesAABB: solapes,
    avisos,
  };
}

const v = verify();

const doc = {
  format: 'foto3d-cad',
  version: 1,
  meta: {
    nombre: 'RC-SCH40-48 · rodillo transportador plano y cónico sobre cañería SCH 40 NPS 1-1/2"',
    capa: 'user',
    origen: 'cad/ensambles/rodillos_sch40/gen_rodillos.mjs (paramétrico). Referencias: planos Damon 2.240.SHC.AFA y 2.640.SHJ.AFA y catálogo de portarodamientos aportados por el usuario; escala del rasterizado verificada por medición en píxeles (ESCALA.md); datos de norma y datasheet en projects/RC-SCH40-48/input/web_facts.json.',
    ejes: 'X = eje del rodillo (0 = cara interior del larguero izquierdo), Y = transversal, Z = arriba. mm.',
    estado_modelado: 'eje CENTRADO (reposo, las dos puntas afuera)',
    procedencia: {
      web: 'ASME B36.10M / ASTM A53 (cañería y tolerancias), SKF 6201-2Z (C y C0), NTN tabla 7.1/7.2 (ajustes), DIN 471 (anillos), US8439573B2 (mecanismo de resorte), Damon e Interroll (cono 3.6°/1.8°)',
      'measured-2D': 'medición en píxeles sobre los planos rasterizados: escala 0.104712 mm/px, cadena 553/531/522, perfil del canal = arco único R5',
      user: 'cañería SCH40 1-1/2", eje redondo Ø12 con caras planas, tapa metálica de catálogo, camisas plásticas',
    },
    verificaciones: v,
    modulos: m,
  },
  parts: E.parts,
  constraints: [],
};

const out = new URL('./rodillos_sch40.json', import.meta.url).pathname;
writeFileSync(out, JSON.stringify(doc, null, 1));

console.log(`OK: ${v.piezas} piezas → ${out}`);
console.log(`   EL ${v.EL} · tubo ${v.tubo} · sobre tapas ${v.sobreTapas} · sobre ejes ${v.sobreEjes}   (idénticos al catálogo)`);
console.log(`   contrataladro ${v.contrataladro} → pared ${v.paredRestante} mm (peor caso ${v.paredPeorCaso}) · ID de la cañería en bruto ${v.idCañeriaPeorCaso}`);
console.log(`   resorte k=${v.resorte.k} N/mm · precarga ${v.resorte.precarga_N} N · máx ${v.resorte.maxima_N} N · carrera ${v.resorte.carreraDisponible}/${v.resorte.carreraNecesaria} mm`);
console.log(`   cono k=${v.cono.k} (semiángulo ${v.cono.semianguloDeg}°) · error máx vs tabla ${v.cono.errorMaxTablaCatalogo} mm · Ø${v.cono.D1}→Ø${v.cono.D2} en ${v.cono.WT}`);
console.log(`   curva: R interior ${v.curva.radioInterior} · R exterior ${v.curva.radioExterior}`);
console.log(`   rodamiento: s0 ${v.rodamiento.s0} · ${v.rodamiento.rpm} rpm · L10h ${v.rodamiento.L10h.toExponential(2)} h · flecha del tubo ${v.flecha_mm} mm`);
for (const a of v.avisos) console.log(`   ⚠ ${a}`);
