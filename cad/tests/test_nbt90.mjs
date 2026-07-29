#!/usr/bin/env node
// test_nbt90.mjs — verifica el ensamble emitido por gen_nbt90.mjs:
// invariantes de función, de fabricación y de armado de la transferencia 90°
// de rodillos emergentes. Corre sobre el JSON ya generado.
//
//   node cad/ensambles/nbt90/gen_nbt90.mjs && node cad/tests/test_nbt90.mjs
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildPartGeometry } from '../js/model.js';
import { bboxPieza, solapan } from '../ensambles/nbt90/lib.mjs';
import { P } from '../ensambles/nbt90/params.mjs';

const doc = JSON.parse(readFileSync('ensambles/nbt90/narrow_belt_transfer_90.json', 'utf8'));
const V = doc.meta.verificaciones;
const partes = doc.parts;
const propias = partes.filter(p => !p.contexto);
const nombre = (re) => partes.filter(p => re.test(p.name));

let pass = 0, fail = 0;
const ok = (c, msg) => { c ? pass++ : fail++; console.log(`  ${c ? '✔' : '✘'} ${msg}`); };
const r2 = (v) => Math.round(v * 100) / 100;

console.log('— Documento —');
ok(doc.format === 'foto3d-cad' && doc.version === 1, 'formato foto3d-cad v1');
ok(doc.meta.capa === 'user', 'declarado capa `user` (diseño, no medición)');
ok(/0\.6320 mm\/px/.test(doc.meta.origen), 'la escala usada queda escrita en el origen del documento');
ok(propias.length >= 60, `${propias.length} piezas propias (sin contar el contexto)`);

console.log('— Función: pop-up —');
ok(Math.abs(V.emergencia - P.emerge) < 0.05,
  `el rodillo emerge ${V.emergencia} mm = 1/4" sobre el plano de bandas`);
ok(V.retraccion > 2, `retraído baja ${V.retraccion} mm bajo el plano de bandas (libra el producto)`);
ok(Math.abs(V.carrera - 10) < 0.01, 'carrera de 10 mm = 0.394" (cota del manual)');
ok(Math.abs(V.emergencia + V.retraccion - V.carrera) < 0.05,
  'emergencia + retracción = carrera (el mecanismo cierra)');

console.log('— Geometría: rodillos y bandas —');
ok(V.rodillos === P.nRodillos && V.bandas === P.nBandas,
  `${V.rodillos} rodillos y ${V.bandas} bandas angostas intercaladas`);
ok(Math.abs(V.paso - 76.2) < 0.01, 'paso de 3" (76.2 mm) entre rodillos y entre bandas');
ok(V.holguraRodilloRegleta > 2,
  `holgura de ${V.holguraRodilloRegleta} mm entre el rodillo y la regleta vecina`);
ok(Math.abs(V.BR - 457.2) < 0.5, 'BR de 18" entre almas de los canales laterales');

console.log('— Vulcanizado: sólo el tramo de carga, y negro —');
// El vulcanizado dejó de ser «dos bandas sobre el tubo»: del contacto de la banda
// del serpentín al borde motriz el tubo va de acero desnudo (corrección del
// cliente). Los límites tienen que SALIR del contacto real, no de un literal.
const R = doc.meta.modulos.rodillos;
ok(R.tramoDesnudoX[0] === P.rodX0 && R.tramoDesnudoX[1] === R.vulcanizadoX[0],
  `sin vulcanizar de X ${R.tramoDesnudoX[0]} (borde) a X ${R.tramoDesnudoX[1]} (fin del contacto de banda)`);
ok(R.vulcanizadoX[0] > R.contactoBandaX[1] && R.vulcanizadoX[0] - R.contactoBandaX[1] <= 3,
  `el vulcanizado arranca ${r2(R.vulcanizadoX[0] - R.contactoBandaX[1])} mm después del contacto real de la banda`);
ok(R.vulcanizadoX[1] <= P.rodX0 + P.rodCara && R.vulcanizadoX[1] >= P.rodX0 + P.rodCara - 4,
  `y termina en X ${R.vulcanizadoX[1]}, retirado de la testa libre`);
const vulc = nombre(/^MÓVIL · Vulcanizado negro/);
ok(vulc.length === P.nRodillos && vulc.every(p => p.color === '#2b2b2b'),
  `${vulc.length} cubiertas vulcanizadas, todas declaradas NEGRAS (goma, no acero)`);
ok(nombre(/^MÓVIL · Tubo de rodillo/).every(p => p.color !== '#2b2b2b'),
  'el tubo de acero conserva su color: el negro es sólo la goma');
// La emergencia de 1/4" cuelga del Ø vulcanizado, no de su extensión: cambiar
// dónde empieza la goma no puede mover la cota verificada.
ok(Math.abs(R.emergeArriba - P.emerge) < 0.01 && R.emergeTramoDesnudo < R.emergeArriba,
  `emerge ${R.emergeArriba} mm en la zona vulcanizada y ${R.emergeTramoDesnudo} en el tramo desnudo`);

console.log('— Montaje del rodillo: chapa perforada + hilo interior + perno por fuera —');
// Sustituye al eje hexagonal pasante con anillos DIN 471: ya no hay anillos ni
// ranura en U, y lo que hay que comprobar es el atornillado.
ok(nombre(/Anillo retención eje rodillo/).length === 0,
  'no quedan anillos de retención de eje de rodillo (los sustituyó el perno)');
const pernosRod = nombre(/^MÓVIL · Perno hex 1\/4-20 UNC × .* · rodillo \(línea/);
ok(pernosRod.length === 2 * P.nRodillos,
  `${pernosRod.length} pernos de rodillo: uno por extremo de cada uno de los ${P.nRodillos}`);
ok(nombre(/^MÓVIL · Golilla rodillo \(línea/).length === 2 * P.nRodillos,
  'cada perno lleva su golilla contra la cara exterior de la placa peine');
ok(R.roscaOK && R.roscaEngranadaEnD >= 1,
  `rosca engranada ${R.roscaEngranadaMm} mm = ${R.roscaEngranadaEnD}·d (≥1·d) y cabe en los ${R.roscaProf} mm de hilo`);
ok(R.ejePuntaD > P.M.b14.d + 4,
  `la punta del eje Ø${R.ejePuntaD} deja ${r2((R.ejePuntaD - P.M.b14.d) / 2)} mm de pared alrededor de la rosca 1/4-20`);
// Los pernos entran POR FUERA (contrato §5.5): su cabeza queda fuera de la placa.
const caraExt = [P.placaT / 2, P.placaT / 2];
ok(pernosRod.every((p) => {
  const b = bboxPieza(p);
  return b.lo[0] < R.placaPeineX[0] - caraExt[0] || b.hi[0] > R.placaPeineX[1] + caraExt[1];
}), 'todas las cabezas quedan por fuera de las placas peine (hay llave)');
// EST-05: distancia del taladro al canto del diente. El mínimo es de AISI S100-16
// J3.2 (1.5·d), NO de AISC —cuya tabla J3.4 no baja de 1/2"—, y lo que se juega en
// esos 0.5 mm es el punzonado, no la resistencia. Las dos cotas van juntas: subir el
// taladro sube el canto, y el canto tiene por techo el plano de bandas.
const MR = doc.meta.modulos.bastidor.montajeRodillo;
ok(MR.dienteSobreEje >= 1.5 * P.M.b14.d,
  `del taladro al canto del diente hay ${MR.dienteSobreEje} mm = ${MR.dienteSobreEjeEnD}·d `
  + `(AISI S100-16 J3.2 pide 1.5·d = ${r2(1.5 * P.M.b14.d)})`);
ok(MR.dienteBajoPlanoBanda > 0,
  `y el canto (Z=${MR.cantoDienteZ}) sigue ${MR.dienteBajoPlanoBanda} mm POR DEBAJO del plano de `
  + `bandas del anfitrión (Z=${P.planoBanda}): no engancha al producto que viaja sobre las bandas`);

console.log('— Rodillo de retorno B-20760: el que limita las bandas del sorter —');
const ret = nombre(/^FIJO · Rodillo de retorno B-20760/);
ok(ret.length === 1, 'existe el rodillo transversal de la FIGURE 8A (item 22 del despiece)');
ok(Math.abs(R.retorno.dia - 1.9 * 25.4) < 0.01, `Ø1.9" = ${R.retorno.dia} mm (cat B-20760)`);
ok(Math.abs(R.retorno.largo - (P.BR - 1.25 * 25.4)) < 0.01,
  `largo ${R.retorno.largo} = BR − 1-1/4", la regla de catálogo`);
ok(Math.abs(R.retorno.tangenciaMm) < 0.1,
  `su generatriz superior (Z=${R.retorno.generatrizSuperiorZ}) es tangente al ramal de retorno de las bandas`);
ok(nombre(/^FIJO · Rodamiento R8-2RS/).length === 2 && nombre(/^FIJO · Eje de rodillo de retorno/).length === 1,
  'gira sobre 2 rodamientos R8-2RS montados en un eje Ø1/2" con hilo interior 1/4-20');
ok(nombre(/^FIJO · Perno hex 1\/4-20 UNC × .* rodillo de retorno/).length === 2 && R.retorno.roscaEngranadaEnD >= 1,
  `2 pernos 1/4-20 desde fuera del alma (med: vástago 6.32 mm ≈ 1/4"), rosca engranada ${R.retorno.roscaEngranadaEnD}·d`);
// La regla de catálogo deja el tubo 1-1/4" más corto que el vano: sin los dos
// casquillos el rodillo caminaría 15.9 mm por lado (contrato §5.3).
ok(nombre(/^FIJO · Casquillo separador/).length === 2 && R.retorno.juegoAxialTubo === 0,
  `2 casquillos Ø${R.retorno.separadorD} retienen axialmente el tubo (juego 0)`);

console.log('— Transmisión —');
ok(V.largoBanda > 500, `banda del serpentín de ${V.largoBanda} mm de desarrollo`);
ok(V.envolventeRodillo >= 60, `envolvente de ${V.envolventeRodillo}° sobre cada rodillo (arrastre por fricción)`);

console.log('— Cinemática: la cadena entera, no las rpm del motor —');
// LO QUE HABÍA AQUÍ COMPROBABA ALGO FALSO: `Math.PI * P.rodDia * P.motorRpm / 60000`
// es la velocidad que tendría la cara del rodillo SI el rodillo girase a las rpm del
// motor. No gira: entre el motorreductor y el rodillo hay una banda plana que
// MULTIPLICA, porque la rueda motriz (Ø63.5) arrastra el tubo desnudo (Ø28.93). La
// prueba pasaba —0.845 está entre 0.3 y 1.5— confirmando una cadena inexistente, y
// con ella pasaba el `P.velocidad = 0.9` que salía de la misma cuenta (DIN-01).
// Ahora se comprueba la cadena real, eslabón a eslabón, contra las tres fuentes.
const K = V.estructural.cinematica;
const relacion = P.ruedaDia / (P.rodDia - 2 * P.rodVulcE);
const rpmRodillo = P.motorRpm * relacion;
const vel = Math.PI * P.rodDia * rpmRodillo / 60000;                 // m/s en el vulcanizado
const velIngenua = Math.PI * P.rodDia * P.motorRpm / 60000;          // la cuenta equivocada
ok(relacion > 1 && Math.abs(relacion - 2.195) < 0.01,
  `la banda plana MULTIPLICA ×${relacion.toFixed(3)} (rueda Ø${P.ruedaDia} / tubo desnudo Ø${K.diaArrastreMm})`);
ok(Math.abs(rpmRodillo - K.rpmRodillo) < 1,
  `el rodillo gira a ${rpmRodillo.toFixed(0)} rpm, no a las ${P.motorRpm} del motor`);
ok(Math.abs(vel - P.velocidad) < 0.005,
  `P.velocidad (${P.velocidad.toFixed(3)} m/s) SALE de la cadena, no está escrita a mano`);
ok(Math.abs(vel - velIngenua) > 0.5,
  `y no es la cuenta con las rpm del motor, que daría ${velIngenua.toFixed(3)} m/s `
  + `(${(vel / velIngenua).toFixed(2)}× por debajo: el error DIN-01)`);
ok(Math.abs(vel - doc.meta.modulos.transmision.cinematica.vTransferencia_m_s) < 0.02,
  `y coincide con la que reporta transmision.mjs por su cuenta `
  + `(${doc.meta.modulos.transmision.cinematica.vTransferencia_m_s} m/s)`);
// Contraste con el fabricante: Hytrol declara «Capable of 350 FPM» para el ProSort
// MRT (web SORT-016). No es un límite del gate —es la evidencia de que el equipo
// estaba bien concebido y lo que estaba mal era el número escrito—, pero un 20 % de
// desviación querría decir que la cadena que hemos reconstruido no es la del equipo.
ok(Math.abs(vel * 196.85 / 350 - 1) < 0.20,
  `${(vel * 196.85).toFixed(0)} fpm frente a los 350 FPM que declara Hytrol `
  + `(${K.desviacionSobreFabricantePct} %, web SORT-016/SORT-018)`);
// Y sigue por debajo del techo de catálogo de un rodillo transportador (DIN-02).
const din02 = V.estructural.comprobaciones.find((c) => c.id === 'DIN-02');
ok(din02.ok, `velocidad periférica ${din02.valor} m/s ≤ ${din02.limite} m/s de la plataforma `
  + `Interroll 1700 (web ROD-007), al ${r2(din02.uso * 100)} %`);

console.log('— Elevación —');
ok(V.factorSeguridad >= 1.5, `factor de seguridad del actuador ${V.factorSeguridad}`);
ok(V.empujeN > 0, `empuje disponible ${V.empujeN} N`);

console.log('— Módulos identificados —');
ok(V.movil >= 10 && V.fijo >= 5, `${V.movil} piezas MÓVIL y ${V.fijo} FIJO`);
ok(propias.every(p => /^(FIJO|MÓVIL)/.test(p.name)),
  'toda pieza propia declara si sube o queda fija');
ok(V.tornilleria >= 20, `${V.tornilleria} piezas de tornillería normalizada`);

console.log('— Armado: nada flota, nada choca —');
// El solape de CAJAS no prueba interferencia: un perfil en U es hueco y su caja
// envolvente incluye el vacío interior. Y el chequeo por MALLAS tampoco decide:
// el motor BSP da volumen fantasma con sólidos no convexos. La verificación que
// manda es la de sólidos B-rep exactos (ensambles/nbt90/interferencias_brep.py).
// Convención declarada: las piezas COMPRADAS se modelan macizas, sin sus
// taladros roscados, así que su propia tornillería las penetra. No es un
// choque de diseño; cualquier otro par sí lo es.
const flag = new Map(partes.map(p => [p.name, { hw: !!p.hardware, comp: !!p.componente }]));
const convencion = (d) => {
  const a = flag.get(d.a) || {}, b = flag.get(d.b) || {};
  return (a.hw && b.comp) || (b.hw && a.comp);
};
// Los DOS estados se juzgan igual. El elevado es el que dibuja el modelo; el
// retraído sale de `out/nbt90_retraido.json`, que gen_nbt90.mjs emite bajando la
// carrera a las piezas MÓVIL. Hasta que existió ese segundo informe nadie miraba
// el estado bajo, y ahí había un choque real de 1.00 cm³ (placa soporte de
// transmisión ⨯ labio del canal de montaje del cilindro).
for (const [estado, ruta] of [['ELEVADO', 'interferencias_brep.json'],
  ['RETRAÍDO', 'interferencias_brep_retraido.json']]) {
  let inf = null;
  try { inf = JSON.parse(readFileSync(`ensambles/nbt90/${ruta}`, 'utf8')); } catch { /* sin informe */ }
  ok(inf !== null, `existe el informe de interferencia exacta en estado ${estado} (interferencias_brep.py)`);
  if (!inf) continue;
  const reales = (inf.detalle || []).filter(d => !convencion(d));
  ok(reales.length === 0,
    `${estado}: ${reales.length} interferencias de diseño sobre ${inf.pares_candidatos} pares candidatos `
    + `(${(inf.detalle || []).length - reales.length} son tornillería dentro de piezas compradas, convención declarada)`);
  for (const d of reales.slice(0, 8)) console.log(`      ${d.cm3} cm³  ${d.a} ⨯ ${d.b}`);
}
// La compuerta de gen_nbt90.mjs mira el estado retraído por cajas envolventes:
// ningún par MÓVIL↔FIJO puede GANAR solape al bajar (salvo los perfiles huecos
// enumerados en RETRAIDO_CAJA_ABIERTA, que verifica el B-rep de arriba).
ok(V.retraidoParesQueCrecen === 0,
  `retraído: ${V.retraidoParesQueCrecen} pares MÓVIL↔FIJO ganan solape de caja al bajar `
  + `(${V.retraidoParesTolerados} tolerados por perfil hueco)`);
ok(V.holguraPlacaTransmisionCanalRetraidoMm >= 2,
  `retraída, la placa soporte de transmisión libra el techo del canal de montaje por `
  + `${V.holguraPlacaTransmisionCanalRetraidoMm} mm`);
const contacto = JSON.parse(readFileSync('ensambles/nbt90/interferencias.json', 'utf8') || '{}').contacto_popup;
ok(contacto?.ok === true,
  `la mesa guía apoya en el conjunto móvil (separación ${contacto?.separacion_mm} mm)`);
const sueltas = propias.filter(p => {
  const b = bboxPieza(p);
  return b.lo[2] > P.altoTotal + 45 || b.hi[2] < -1;
});
ok(sueltas.length === 0, 'ninguna pieza queda fuera del volumen del equipo');

console.log('— Fabricación —');
const chapas = propias.filter(p => p.chapa);
ok(chapas.length >= 4, `${chapas.length} piezas declaradas como chapa plegada (llevan desarrollo)`);
// una placa PLANA (fibra de 2 puntos = sin pliegue) no necesita radio; la
// exigencia de radio ≥ espesor solo aplica a las que sí se pliegan.
const plegadas = chapas.filter(p => (p.chapa.fibra?.length ?? 0) >= 3);
ok(chapas.every(p => p.chapa.t >= 1.5) && plegadas.every(p => p.chapa.radio >= p.chapa.t * 0.99),
  `las ${chapas.length} chapas tienen espesor de calibre y las ${plegadas.length} plegadas, radio ≥ espesor`);
const compradas = propias.filter(p => p.hardware || p.componente);
ok(compradas.length >= 20, `${compradas.length} piezas compradas identificadas para la lista de materiales`);
// AJ-02: el asiento del rodamiento del rodillo tiene que ser un AJUSTE, no una
// holgura. Con el eje de 5/16" (7.9375) bajo el barreno Ø8 del 608-2RS el juego era
// 0.055…0.072 mm, el de un montaje con casquillo: el aro martillea con la carga
// pulsante de cada bulto. El nominal del asiento manda y es el del barreno.
const AR = R.ejeRodamiento;
ok(AR.asientoNominalMm === AR.barrenoNominalMm,
  `el asiento del rodamiento (Ø${AR.asientoNominalMm} ${AR.ajuste}) comparte nominal con el `
  + `barreno del ${AR.rodamiento} (Ø${AR.barrenoNominalMm})`);
ok(Math.max(...AR.juegoDiametralMm.map(Math.abs)) <= 0.025,
  `juego diametral ${AR.juegoDiametralMm.join('…')} mm de la cadena de desviaciones `
  + `(ISO 492 Normal ${AR.barrenoDesvMm.join('/')} · ISO 286-2 ${AR.ajuste}), frente a los `
  + `0.055…0.072 que había`);

console.log('— Malla: todas las piezas construyen —');
const volumen = (g) => {
  const pos = g.attributes.position; if (!pos) return 0;
  let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return v;
};
// La masa del conjunto MÓVIL se pesa AQUÍ y no en la compuerta porque construir
// los 410 sólidos cuesta ~30 s y `gen_nbt90.mjs` tarda 0.08: meter esto en el gate
// multiplicaría por 350 el ciclo de trabajo de quien edita un módulo. Aquí el coste
// marginal es cero, porque este bucle ya construye todas las mallas.
// Densidades (`dis`, acero al carbono y goma vulcanizada); las piezas de contexto
// (bandas y regletas del anfitrión) no cuentan: no son del equipo.
const RHO = { acero: 7.85e-6, goma: 1.20e-6 };          // kg/mm³
const densidadDe = (p) => (/goma|caucho|Vulcanizado|Banda plana|FLEXPROOF/i
  .test(`${p.material || ''} ${p.name}`) ? RHO.goma : RHO.acero);
let malas = 0, volTot = 0, masaMovil = 0, masaMotorSolido = 0;
for (const p of partes) {
  try {
    const g = buildPartGeometry(p);
    const pos = g.attributes.position;
    if (!pos || pos.count < 3) { console.log(`      sin malla: ${p.name}`); malas++; continue; }
    if ([...pos.array].some(x => !Number.isFinite(x))) { console.log(`      NaN: ${p.name}`); malas++; continue; }
    const v = volumen(g);
    if (v <= 0) { console.log(`      volumen ${r2(v)}: ${p.name}`); malas++; continue; }
    volTot += v;
    if (!p.contexto && /^MÓVIL/.test(p.name)) {
      masaMovil += v * densidadDe(p);
      if (/Motorreductor SEW/.test(p.name)) masaMotorSolido = v * densidadDe(p);
    }
  } catch (e) { console.log(`      error: ${p.name} — ${e.message}`); malas++; }
}
ok(malas === 0, `las ${partes.length} piezas construyen malla cerrada (${(volTot / 1e6).toFixed(1)} dm³ de material)`);

console.log('— Masa del conjunto móvil: la declarada contra la que pesan los sólidos —');
// El motorreductor se modela MACIZO (convención del repositorio para piezas
// compradas): pesarlo así da 43 kg en vez de los 7.9 de catálogo (web MOT-007).
// Se corrige, se le suman las partes móviles del cilindro (4.27 kg, web PNEU-019)
// y se compara con `masaMovilKg` de elevacion.mjs, que hoy es una estimación `dis`.
const MASA_MOTOR_CAT = 7.9, MASA_MOVIL_CILINDRO = 4.27;
const masaPesada = masaMovil - masaMotorSolido + MASA_MOTOR_CAT + MASA_MOVIL_CILINDRO;
const masaDeclarada = doc.meta.verificaciones.estructural?.cassette?.masaMovilDeclaradaKg
  ?? (V.masaElevadaKg !== undefined ? V.masaElevadaKg - P.cargaMaxKg : 55);
ok(masaPesada <= masaDeclarada + 1e-9,
  `la masa móvil declarada (${r2(masaDeclarada)} kg) cubre la que pesan los sólidos `
  + `(${r2(masaPesada)} kg = ${r2(masaMovil - masaMotorSolido)} de estructura + ${MASA_MOTOR_CAT} del SEW `
  + `+ ${MASA_MOVIL_CILINDRO} de las partes móviles del cilindro)`);
// Y no puede ir tan sobrada que deje de ser un dato: la masa TAMBIÉN estabiliza el
// cassette contra el vuelco (EST-03), así que sobrestimarla no es el lado seguro.
ok(masaDeclarada <= masaPesada * 1.6,
  `y no la sobrestima más de un 60 % (${r2(masaDeclarada / masaPesada)}×): la masa móvil es lo único `
  + `que impide que un bulto excéntrico despegue el apoyo de la horquilla, así que pasarse NO es conservador`);
// La cota INFERIOR es la que usa EST-03, y por eso tiene que ser de verdad una cota
// inferior: si el cassette adelgaza por debajo de ella, el vuelco se estaría
// comprobando con más masa estabilizadora de la que hay.
const masaVuelco = doc.meta.verificaciones.estructural?.cassette?.masaMovilVuelcoKg;
ok(masaVuelco !== undefined && masaVuelco <= masaPesada + 1e-9,
  `la masa con la que se comprueba el VUELCO (${masaVuelco} kg, cota inferior de elevacion.mjs) `
  + `no llega a la que pesan los sólidos (${r2(masaPesada)} kg): margen ${r2(masaPesada - masaVuelco)} kg `
  + `= ${r2((masaPesada / masaVuelco - 1) * 100)} %`);

console.log(`\n${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
