#!/usr/bin/env node
// abastecimiento.mjs — modelo de CANTIDADES, TIEMPOS y RUTAS DE COMPRA para
// producir un lote de rodillos RC-SCH40-48 con una fecha límite.
//
//   node ensambles/rodillos_sch40/abastecimiento.mjs [nPlanos] [nConicos] [semanas]
//   node ensambles/rodillos_sch40/abastecimiento.mjs 80 0 8
//   node ensambles/rodillos_sch40/abastecimiento.mjs 60 20 8
//
// Las CANTIDADES y los TIEMPOS DE MÁQUINA salen del modelo (volúmenes reales de
// rodillos_sch40.json). Los PRECIOS y PLAZOS DE FLETE son parámetros: están en
// el bloque COSTO con su fuente, y hay que reemplazarlos por cotizaciones
// reales antes de decidir. El script marca con «?» todo lo que sea estimación.
import { readFileSync } from 'node:fs';
import { P } from './params.mjs';

const nPlanos = +(process.argv[2] ?? 80);
const nConicos = +(process.argv[3] ?? 0);
const semanas = +(process.argv[4] ?? 8);
const N = nPlanos + nConicos;
const DIAS = semanas * 7;

const doc = JSON.parse(readFileSync(new URL('./rodillos_sch40.json', import.meta.url), 'utf8'));
const volDe = (re) => {
  const p = doc.parts.find((q) => re.test(q.name));
  return p ? p.__vol ?? null : null;
};

// ── volúmenes reales medidos con el motor CSG (cm³) ────────────────────────
// (se dejan explícitos para que el script corra sin three; se verifican con
//  `node _check.mjs plano --v`)
const VOL = {
  tubo: 261.19, eje: 62.27, tapa: 8.54,
  camisa: [127.63, 169.64, 215.23],       // cm³ por camisa
};
const DENS = { acero: 7.85e-3, pacf: 1.09e-3 };   // g/mm³ → g/cm³ ×1000

// ── parámetros de proceso (estimaciones: verificar) ────────────────────────
const PROC = {
  // torneado
  minTubo: 6.0,        // ? cortar + refrentar y contrataladrar las 2 testas
  minEje: 8.0,         // ? cortar + 2 gargantas al torno + 4 caras planas fresadas
  minTapaTorneada: 6.0,// ? tapa torneada de barra Ø50 (alternativa a importarla)
  setupH: 4.0,         // ? puesta a punto por operación
  hTallerDia: 8,       // turno
  // impresión PA-CF
  cm3PorHora: 35,      // ? boquilla 0.6, capa 0.25, PA-CF; verificar con la máquina real
  mermaImpresion: 1.20,// ? soportes + purgas + fallos
  horasImpresoraDia: 20,
};

// ── plazos por ruta (días corridos) ────────────────────────────────────────
const PLAZO = {
  chinaProduccion: 15,   // ? fabricación del proveedor
  chinaMar: 45,          // ? puerto a puerto + consolidación LCL
  chinaAire: 8,          // ? aéreo
  aduanaChile: 7,        // ? desaduanaje + transporte a Santiago
  localStock: 3,         // material de bodega en Chile
  localResortes: 20,     // ? resorte a pedido en Chile
  compraLocalRodam: 3,
};

const rutaChinaMar = PLAZO.chinaProduccion + PLAZO.chinaMar + PLAZO.aduanaChile;
const rutaChinaAire = PLAZO.chinaProduccion + PLAZO.chinaAire + PLAZO.aduanaChile;

// ── cantidades ─────────────────────────────────────────────────────────────
const Q = {
  tubos: N, ejes: N, tapas: 2 * N, rodamientos: 2 * N, anillos: 2 * N, resortes: 2 * N,
  camisas: 3 * nConicos,
};

// ── materia prima ──────────────────────────────────────────────────────────
const barra = (largoPieza, largoBarra = 6000) => {
  const porBarra = Math.floor(largoBarra / largoPieza);
  return { porBarra, barras: Math.ceil(N / porBarra) };
};
const MP = {
  caneria: barra(P.tuboLargo + 3),          // +3 de corte
  eje: barra(P.sobreEjes + 3),
  kgCaneria: +(Q.tubos * VOL.tubo * DENS.acero * 1000 / 1000).toFixed(1),
  kgEje: +(Q.ejes * VOL.eje * DENS.acero * 1000 / 1000).toFixed(1),
  // PA-CF
  kgTapasImpresas: +(Q.tapas * VOL.tapa * DENS.pacf * PROC.mermaImpresion).toFixed(2),
  kgCamisasImpresas: +(nConicos * VOL.camisa.reduce((a, b) => a + b, 0) * DENS.pacf * PROC.mermaImpresion).toFixed(1),
  // barra Ø50 si se tornean las tapas
  kgBarraTapas: +(Q.tapas * (Math.PI / 4 * 50 ** 2 * 18) / 1000 * DENS.acero).toFixed(1),
};

// ── tiempos ────────────────────────────────────────────────────────────────
const hTubos = (Q.tubos * PROC.minTubo) / 60 + PROC.setupH;
const hEjes = (Q.ejes * PROC.minEje) / 60 + PROC.setupH;
const hTapasTorneadas = (Q.tapas * PROC.minTapaTorneada) / 60 + PROC.setupH;
const hImpTapas = (Q.tapas * VOL.tapa * PROC.mermaImpresion) / PROC.cm3PorHora;
const hImpCamisas = (Q.camisas ? nConicos * VOL.camisa.reduce((a, b) => a + b, 0) * PROC.mermaImpresion / PROC.cm3PorHora : 0);

const diasTaller = (h) => Math.ceil(h / PROC.hTallerDia);
const impresorasPara = (h, dias) => Math.ceil(h / (PROC.horasImpresoraDia * dias));

// ── rutas para cada ítem ───────────────────────────────────────────────────
const R = (nombre, opciones) => ({ nombre, opciones });
const rutas = [
  R('Cañería SCH40', [
    { via: 'Chile, stock (Küpfer / Cintac)', dias: PLAZO.localStock, nota: `${MP.caneria.barras} barras de 6 m · ${MP.kgCaneria} kg`, ok: true },
  ]),
  R('Eje Ø12', [
    { via: 'Chile, stock (ISESA acero plata / Küpfer 1045)', dias: PLAZO.localStock, nota: `${MP.eje.barras} barras de 6 m · ${MP.kgEje} kg`, ok: true },
  ]),
  R('Rodamiento 6201-2Z', [
    { via: 'Chile, distribuidor', dias: PLAZO.compraLocalRodam, nota: `${Q.rodamientos} u`, ok: true },
    { via: 'China, marítimo', dias: rutaChinaMar, nota: `${Q.rodamientos} u — más barato por unidad`, ok: rutaChinaMar <= DIAS },
  ]),
  R('Anillo DIN 471 Ø12', [
    { via: 'Chile (Anillos Gerwuth: importa y fabrica)', dias: PLAZO.localStock, nota: `${Q.anillos} u`, ok: true },
  ]),
  R('Resorte Ø18×1.4 L0=32', [
    { via: 'Chile, a pedido (resortera)', dias: PLAZO.localResortes, nota: `${Q.resortes} u`, ok: PLAZO.localResortes <= DIAS },
    { via: 'China, marítimo', dias: rutaChinaMar, nota: `${Q.resortes} u`, ok: rutaChinaMar <= DIAS },
  ]),
  R('TAPA portarodamiento ×' + Q.tapas, [
    { via: 'China SKPB4812-2.0, marítimo', dias: rutaChinaMar, nota: 'el más barato por unidad', ok: rutaChinaMar <= DIAS },
    { via: 'China SKPB4812-2.0, aéreo', dias: rutaChinaAire, nota: 'flete caro, pieza liviana (~67 g c/u)', ok: rutaChinaAire <= DIAS },
    { via: 'Tornear en Chile de barra Ø50', dias: diasTaller(hTapasTorneadas) + PLAZO.localStock, nota: `${hTapasTorneadas.toFixed(0)} h de torno · ${MP.kgBarraTapas} kg de barra`, ok: true },
    { via: 'Imprimir en PA6-CF', dias: Math.ceil(hImpTapas / PROC.horasImpresoraDia) + 2, nota: `${hImpTapas.toFixed(0)} h de impresión · ${MP.kgTapasImpresas} kg de filamento`, ok: true },
  ]),
];
if (nConicos > 0) {
  rutas.push(R('CAMISA cónica ×' + Q.camisas, [
    { via: 'China, catálogo (Damon 2.640), marítimo', dias: rutaChinaMar, nota: 'pieza moldeada de serie', ok: rutaChinaMar <= DIAS },
    { via: 'China, aéreo', dias: rutaChinaAire, nota: 'voluminosa: el aéreo se paga por volumen', ok: rutaChinaAire <= DIAS },
    { via: 'Imprimir en PA6-CF', dias: '—', nota: `${hImpCamisas.toFixed(0)} h · ${MP.kgCamisasImpresas} kg de filamento · ${impresorasPara(hImpCamisas, DIAS - 14)} impresoras en paralelo`, ok: true },
    { via: 'Molde de inyección', dias: '> 60', nota: 'el utillaje solo ya no cabe en el plazo', ok: false },
  ]));
}

// ── salida ─────────────────────────────────────────────────────────────────
const l = (s = '') => console.log(s);
l(`RC-SCH40-48 · abastecimiento de ${N} rodillos (${nPlanos} planos + ${nConicos} cónicos) en ${semanas} semanas (${DIAS} días)`);
l('='.repeat(100));
l();
l('CANTIDADES');
for (const [k, v] of Object.entries(Q)) if (v) l(`  ${k.padEnd(14)} ${String(v).padStart(5)}`);
l();
l('MATERIA PRIMA');
l(`  cañería SCH40      ${MP.caneria.barras} barras de 6 m (${MP.caneria.porBarra} piezas por barra) · ${MP.kgCaneria} kg`);
l(`  barra Ø12          ${MP.eje.barras} barras de 6 m (${MP.eje.porBarra} piezas por barra) · ${MP.kgEje} kg`);
l(`  barra Ø50 (tapas)  ${MP.kgBarraTapas} kg   — solo si se tornean las tapas`);
l(`  filamento PA6-CF   ${MP.kgTapasImpresas} kg para las tapas${nConicos ? ` · ${MP.kgCamisasImpresas} kg para las camisas` : ''}`);
l();
l('CARGA DE TALLER (estimada)');
l(`  tubos              ${hTubos.toFixed(0)} h  → ${diasTaller(hTubos)} días de torno`);
l(`  ejes               ${hEjes.toFixed(0)} h  → ${diasTaller(hEjes)} días (torno + fresa)`);
l(`  tapas torneadas    ${hTapasTorneadas.toFixed(0)} h  → ${diasTaller(hTapasTorneadas)} días   (alternativa a importarlas)`);
l(`  TOTAL sin tapas    ${(hTubos + hEjes).toFixed(0)} h → ${diasTaller(hTubos + hEjes)} días de un torno`);
l();
l('IMPRESIÓN PA-CF (a ' + PROC.cm3PorHora + ' cm³/h)');
l(`  ${Q.tapas} tapas     ${hImpTapas.toFixed(0)} h → ${Math.ceil(hImpTapas / PROC.horasImpresoraDia)} días con UNA impresora`);
if (nConicos) l(`  ${Q.camisas} camisas   ${hImpCamisas.toFixed(0)} h → ${impresorasPara(hImpCamisas, DIAS - 14)} impresoras en paralelo para cerrar en ${DIAS - 14} días`);
l();
l(`RUTAS  (límite: ${DIAS} días)`);
for (const r of rutas) {
  l(`\n  ${r.nombre}`);
  for (const o of r.opciones) {
    const d = typeof o.dias === 'number' ? `${o.dias} d` : `${o.dias}`;
    l(`    ${o.ok ? '✔' : '✘'} ${d.padStart(6)}  ${o.via.padEnd(42)} ${o.nota}`);
  }
}
l();
l('PLAZOS DE IMPORTACIÓN USADOS (parámetros — verificar con el forwarder)');
l(`  China marítimo : ${PLAZO.chinaProduccion} producción + ${PLAZO.chinaMar} tránsito + ${PLAZO.aduanaChile} aduana = ${rutaChinaMar} días  ${rutaChinaMar <= DIAS ? '' : '← NO CABE'}`);
l(`  China aéreo    : ${PLAZO.chinaProduccion} producción + ${PLAZO.chinaAire} tránsito + ${PLAZO.aduanaChile} aduana = ${rutaChinaAire} días  ${rutaChinaAire <= DIAS ? '' : '← NO CABE'}`);
l();
l('Los precios NO están en este script: dependen de cotización. Ver ABASTECIMIENTO.md.');
