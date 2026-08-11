#!/usr/bin/env node
// abastecimiento.mjs — CANTIDADES, TIEMPOS, RUTAS y COSTO para producir un lote
// de rodillos RC-SCH40-48 contra una fecha límite.
//
//   node ensambles/rodillos_sch40/abastecimiento.mjs [nPlanos] [nConicos] [semanas]
//   node ensambles/rodillos_sch40/abastecimiento.mjs 80 0 8
//
// Las CANTIDADES y los VOLÚMENES salen del modelo. Los PRECIOS y PLAZOS llevan
// etiqueta de procedencia:  [F] con fuente (ver ABASTECIMIENTO.md y
// projects/RC-SCH40-48/input/web_facts.json)  ·  [E] estimado, hay que cotizar.
import { P } from './params.mjs';

const nPlanos = +(process.argv[2] ?? 80);
const nConicos = +(process.argv[3] ?? 0);
const semanas = +(process.argv[4] ?? 8);
const N = nPlanos + nConicos;
const DIAS = semanas * 7;
const CLP_USD = 950;            // [E] verificar el tipo de cambio del día

// ── volúmenes reales del modelo (cm³) — `node _check.mjs plano --v` ────────
const VOL = { tubo: 261.19, eje: 62.27, tapa: 8.54, camisa: [127.63, 169.64, 215.23] };
const DENS = { acero: 7.85, pacf: 1.09 };   // g/cm³

// ── proceso ────────────────────────────────────────────────────────────────
const PROC = {
  minTubo: 5.0,          // [E] refrentar + contrataladrar las 2 testas (4-6 min)
  minEje: 6.5,           // [E] cortar, 2 gargantas, 4 caras planas, rectificar puntas (5-8 min)
  minTapaTorneada: 6.0,  // [E] tapa torneada de barra Ø50
  setupH: 2.0,           // [E] 0.5-2 h por operación
  hTallerDia: 8,
  // [F] PA6-CF: velocidad volumétrica máxima 8 mm³/s = 28.8 cm³/h; lo realista
  //     es 60-75 % de ese máximo por viajes, aceleraciones y cambios de perímetro
  cm3PorHora: 20,
  mermaImpresion: 1.20,  // [E] soportes, purgas y fallos
  horasImpresoraDia: 19, // [E] 18-20 h productivas por día
  fallosImpresion: 1.30, // [E] margen por reimpresión
};

// ── plazos (días corridos) ─────────────────────────────────────────────────
const PLAZO = {
  chinaRFQ: 5,           // [F] 3-7 d de cotización
  chinaProduccion: 20,   // [F] 15-25 d estándar (hasta 45 si es a medida)
  chinaBooking: 3,       // [F] 2-4 d
  aire: 8,               // [F] 7-10 d de tránsito
  marFCL: 31,            // [F] 28-34 d puerto a puerto
  aduanaAire: 4,         // [F] 1-3 d canal verde, hasta 7 en canal rojo
  aduanaMar: 10,         // [F] 7-15 d con manejo portuario
  localStock: 3,         // [F] cañería y barra: ítem de bodega
  localResortes: 12,     // [F] 3-5 días hábiles de fabricación + cotización y muestra
  localAnillos: 7,       // [E] Gerwuth: importa y fabrica
  localRodam: 3,
  tallerCola: 7,         // [E] cola del taller antes de empezar
};
const rutaAire = PLAZO.chinaRFQ + PLAZO.chinaProduccion + PLAZO.chinaBooking + PLAZO.aire + PLAZO.aduanaAire;
const rutaMar = PLAZO.chinaRFQ + PLAZO.chinaProduccion + PLAZO.chinaBooking + PLAZO.marFCL + PLAZO.aduanaMar;

// ── costos unitarios (USD salvo indicación) ────────────────────────────────
const C = {
  caneriaBarra6m: 49000 / CLP_USD,   // [F] ~$49.000 CLP la barra de 6 m (Küpfer)
  ejeBarra6m: 13000 / CLP_USD,       // [E] $11.000-15.000 CLP la barra de 6 m de 1045 trefilado
  barraTapasKg: 2.2,                 // [E] barra Ø50 de acero
  tapaChina: [1.00, 2.25],           // [F] rango del tramo de 100 u en Made-in-China (pieza análoga)
  rodamChina: [0.20, 0.50],          // [F] 6201ZZ a 200 u
  rodamChile: 2.57,                  // [F] ~$2.440 CLP/u en retail
  anilloChile: [150, 400].map((v) => v / CLP_USD),   // [E] CLP/u
  resorteChile: [300, 800].map((v) => v / CLP_USD),  // [E] CLP/u
  horaTaller: [18000, 35000].map((v) => v / CLP_USD),// [E] CLP/h de torno CNC en Santiago
  filamentoKg: 42.67,                // [F] 3DJake, bobina de 1 kg
  aireUSDkg: 7,                      // [F] 5-8 USD/kg
  agenteAduana: 350,                 // [F] 200-500 por embarque
  rodilloConicoCompleto: [5, 20],    // [F] rodillo cónico completo de catálogo chino
};

// ── cantidades ─────────────────────────────────────────────────────────────
const Q = { tubos: N, ejes: N, tapas: 2 * N, rodamientos: 2 * N, anillos: 2 * N, resortes: 2 * N, camisas: 3 * nConicos };
const barras = (largoPieza) => ({ porBarra: Math.floor(6000 / largoPieza), barras: Math.ceil(N / Math.floor(6000 / largoPieza)) });
const MP = {
  caneria: barras(P.tuboLargo + 3),
  eje: barras(P.sobreEjes + 3),
  kgBarraTapas: +(Q.tapas * (Math.PI / 4 * 50 ** 2 * 18) / 1000 * DENS.acero / 1000).toFixed(1),
  kgFilTapas: +(Q.tapas * VOL.tapa * DENS.pacf / 1000 * PROC.mermaImpresion).toFixed(2),
  kgFilCamisas: +(nConicos * VOL.camisa.reduce((a, b) => a + b) * DENS.pacf / 1000 * PROC.mermaImpresion).toFixed(1),
  kgAereo: +((Q.tapas * VOL.tapa * DENS.acero + Q.rodamientos * 39 + Q.anillos * 1) / 1000).toFixed(1),
};

// ── tiempos ────────────────────────────────────────────────────────────────
const hTubos = Q.tubos * PROC.minTubo / 60 + PROC.setupH;
const hEjes = Q.ejes * PROC.minEje / 60 + PROC.setupH;
const hTapasTorno = Q.tapas * PROC.minTapaTorneada / 60 + PROC.setupH;
const hImp = (cm3) => cm3 * PROC.mermaImpresion * PROC.fallosImpresion / PROC.cm3PorHora;
const hImpTapas = hImp(Q.tapas * VOL.tapa);
const hImpCamisas = hImp(nConicos * VOL.camisa.reduce((a, b) => a + b, 0));
const dias = (h) => Math.ceil(h / PROC.hTallerDia);
const impresoras = (h, d) => Math.ceil(h / (PROC.horasImpresoraDia * Math.max(1, d)));

// ── escenarios de costo ────────────────────────────────────────────────────
const rango = (a, b) => [a, b];
const suma = (...xs) => xs.reduce((a, x) => [a[0] + x[0], a[1] + x[1]], [0, 0]);
const esc = (v) => Array.isArray(v) ? v : [v, v];

const base = suma(
  esc(MP.caneria.barras * C.caneriaBarra6m),
  esc(MP.eje.barras * C.ejeBarra6m),
  rango(Q.anillos * C.anilloChile[0], Q.anillos * C.anilloChile[1]),
  rango(Q.resortes * C.resorteChile[0], Q.resortes * C.resorteChile[1]),
  rango((hTubos + hEjes) * C.horaTaller[0], (hTubos + hEjes) * C.horaTaller[1]),
);

const tapaChinaAire = suma(
  rango(Q.tapas * C.tapaChina[0], Q.tapas * C.tapaChina[1]),
  rango(Q.rodamientos * C.rodamChina[0], Q.rodamientos * C.rodamChina[1]),
  esc(MP.kgAereo * C.aireUSDkg + C.agenteAduana),
);
const tapaTorneada = suma(
  esc(MP.kgBarraTapas * C.barraTapasKg),
  rango(hTapasTorno * C.horaTaller[0], hTapasTorno * C.horaTaller[1]),
  esc(Q.rodamientos * C.rodamChile),
);
const tapaImpresa = suma(
  esc(MP.kgFilTapas * C.filamentoKg),
  esc(Q.rodamientos * C.rodamChile),
);
const camisaImpresa = nConicos ? esc(MP.kgFilCamisas * C.filamentoKg) : [0, 0];
const camisaChina = nConicos
  ? suma(rango(nConicos * 3 * 2, nConicos * 3 * 6), esc(nConicos * 3 * 0.35 * C.aireUSDkg))
  : [0, 0];

// ── salida ─────────────────────────────────────────────────────────────────
const l = (s = '') => console.log(s);
const usd = (r) => r[0] === r[1] ? `US$ ${r[0].toFixed(0)}` : `US$ ${r[0].toFixed(0)}–${r[1].toFixed(0)}`;
const ok = (d) => d <= DIAS ? '✔' : '✘';

l(`RC-SCH40-48 · ${N} rodillos (${nPlanos} planos + ${nConicos} cónicos) en ${semanas} semanas (${DIAS} días)`);
l('='.repeat(96));
l('\nCANTIDADES');
for (const [k, v] of Object.entries(Q)) if (v) l(`  ${k.padEnd(13)} ${String(v).padStart(5)}`);

l('\nMATERIA PRIMA');
l(`  cañería SCH40     ${MP.caneria.barras} barras de 6 m (${MP.caneria.porBarra}/barra)`);
l(`  barra Ø12 1045    ${MP.eje.barras} barras de 6 m (${MP.eje.porBarra}/barra)   ← NO acero plata: viene en 1 m`);
l(`  barra Ø50 tapas   ${MP.kgBarraTapas} kg        (sólo si se tornean)`);
l(`  filamento PA6-CF  ${MP.kgFilTapas} kg tapas${nConicos ? ` · ${MP.kgFilCamisas} kg camisas` : ''}`);
l(`  carga aérea       ${MP.kgAereo} kg  (tapas + rodamientos + anillos desde China)`);

l('\nCARGA DE TALLER');
l(`  tubos             ${hTubos.toFixed(0)} h → ${dias(hTubos)} d`);
l(`  ejes              ${hEjes.toFixed(0)} h → ${dias(hEjes)} d`);
l(`  tapas torneadas   ${hTapasTorno.toFixed(0)} h → ${dias(hTapasTorno)} d   (alternativa a importar)`);
l(`  IMPRESIÓN a ${PROC.cm3PorHora} cm³/h (máx. de ficha 28.8, con margen de fallo ${PROC.fallosImpresion})`);
l(`    ${Q.tapas} tapas    ${hImpTapas.toFixed(0)} h → ${impresoras(hImpTapas, DIAS - 14)} impresora(s)`);
if (nConicos) l(`    ${Q.camisas} camisas  ${hImpCamisas.toFixed(0)} h → ${impresoras(hImpCamisas, DIAS - 14)} impresoras en paralelo`);

l(`\nPLAZOS DE IMPORTACIÓN`);
l(`  ${ok(rutaAire)} AÉREO     ${PLAZO.chinaRFQ}+${PLAZO.chinaProduccion}+${PLAZO.chinaBooking} pre + ${PLAZO.aire} vuelo + ${PLAZO.aduanaAire} aduana = ${rutaAire} d`);
l(`  ${ok(rutaMar)} MARÍTIMO  ${PLAZO.chinaRFQ}+${PLAZO.chinaProduccion}+${PLAZO.chinaBooking} pre + ${PLAZO.marFCL} barco + ${PLAZO.aduanaMar} aduana = ${rutaMar} d`);
l(`  arancel 6 % → 0 % con Certificado de Origen Form F (TLC Chile–China); IVA 19 % recuperable`);

l('\nCOSTO (sin IVA; [E] = estimado, hay que cotizar)');
l(`  BASE común (cañería, eje, anillos, resortes, torno)          ${usd(base)}`);
l();
l(`  TAPAS — opción 1: China por aéreo + rodamientos chinos        ${usd(tapaChinaAire)}   ${ok(rutaAire)} ${rutaAire} d`);
l(`  TAPAS — opción 2: tornear en Chile + rodamientos locales      ${usd(tapaTorneada)}   ✔ ${dias(hTapasTorno) + PLAZO.tallerCola} d`);
l(`  TAPAS — opción 3: imprimir PA6-CF + rodamientos locales       ${usd(tapaImpresa)}   ✔ ${Math.ceil(hImpTapas / PROC.horasImpresoraDia) + 3} d`);
if (nConicos) {
  l();
  l(`  CAMISAS — imprimir PA6-CF (${MP.kgFilCamisas} kg)                      ${usd(camisaImpresa)}`);
  l(`  CAMISAS — comprar en China por aéreo                          ${usd(camisaChina)}   ${ok(rutaAire)} ${rutaAire} d`);
}
l();
for (const [nom, t] of [['1 China aéreo', tapaChinaAire], ['2 tornear', tapaTorneada], ['3 imprimir', tapaImpresa]]) {
  const tot = suma(base, t, nConicos ? camisaImpresa : [0, 0]);
  l(`  TOTAL con tapa ${nom.padEnd(14)} ${usd(tot).padStart(16)}   →  ${usd([tot[0] / N, tot[1] / N])} por rodillo`);
}
l('\nDetalle, fuentes y plan de compra: ABASTECIMIENTO.md');
