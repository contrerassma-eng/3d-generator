// piezas.mjs — GEOMETRÍA REAL de cada pieza de la celda, no envolventes.
//
// Las piezas COMPRADAS se modelan con su forma real porque de ahí salen las
// interferencias y las cotas de montaje; las IMPRESAS y FABRICADAS se modelan
// con la geometría que de verdad se manda a la impresora o al láser: si un
// bloque no tiene su alojamiento, su reborde y sus taladros, no es una pieza,
// es una caja.
//
// Todo se escribe en el marco LOCAL de la unidad motriz:
//   X = radial hacia afuera (eje de la rueda) · Y = tangencial · Z = arriba.

import { box, cyl, hole, r2, normal3, baseOrtogonal, arcoPts, seccionChapa, desarrollo, COL }
  from '../nbt90/lib.mjs';
import { P } from './params.mjs';

let _n = 0;
const nid = () => `pz${++_n}`;

/** Revolución alrededor de un eje CUALQUIERA (el helper del NBT90 solo admite
 *  ejes X/Y/Z). `perfil` son pares (h, r) medidos desde `at` a lo largo de `eje`. */
export function revolverEje(name, at, eje, perfil, op = 'union', angulo = 360) {
  const u = normal3(eje);
  const [d1] = baseOrtogonal(u);          // cualquier normal de plano ⟂ al eje
  const pts = perfil.map(p => [r2(p[0]), r2(p[1])]);
  const ents = pts.map((p, i) => ({ id: `${nid()}_${i}`, type: 'line', a: p, b: pts[(i + 1) % pts.length] }));
  return {
    id: nid(), name, shape: 'revolve', op, at: [...at], dir: d1.map(r2),
    params: { entities: ents, axis: { a: [0, 0], b: [1, 0] }, u: u.map(r2), angle: angulo },
  };
}

// ---------------------------------------------------------------------------
// RUEDA OMNI Ø48 — comprada. Cubo, dos platos y 16 rodillos abarrilados.
// ---------------------------------------------------------------------------
// El rodillo NO es un cilindro: su superficie tiene que apoyar sobre el círculo
// de Ø48, así que su radio decrece según  r(h) = 24 − √(Rc² + h²)  con Rc el
// radio al que está su eje. En h = 0 da exactamente los R5.00 del dibujo, lo que
// confirma la lectura de la cota.
export function ruedaOmni(nombre, centro, ejeRueda) {
  const Rw = P.ruedaDia / 2;                         // 24
  const Rc = Rw - P.ruedaRodilloR;                   // 19 — radio del eje del rodillo
  const u = normal3(ejeRueda);
  const [e1, e2] = baseOrtogonal(u);                 // base del plano de la rueda
  const pos = (a, b, c) => [                         // a lo largo del eje / plano
    r2(centro[0] + u[0] * a + e1[0] * b + e2[0] * c),
    r2(centro[1] + u[1] * a + e1[1] * b + e2[1] * c),
    r2(centro[2] + u[2] * a + e1[2] * b + e2[2] * c)];

  const f = [];
  // cubo central
  f.push(revolverEje('Cubo', pos(-P.ruedaCubo / 2, 0, 0), u, [
    [0, P.ruedaBore / 2], [0, P.ruedaCuboDia / 2],
    [P.ruedaCubo, P.ruedaCuboDia / 2], [P.ruedaCubo, P.ruedaBore / 2]]));

  const L = P.rodilloLargo, medio = L / 2;
  const perfil = () => {
    const p = [[-medio, 0]];
    for (let i = 0; i <= 8; i++) {
      const h = -medio + (L * i) / 8;
      p.push([h, r2(Rw - Math.hypot(Rc, h))]);
    }
    p.push([medio, 0]);
    return p;
  };

  for (const s of [-1, 1]) {
    const xFila = s * P.ruedaFilaSep;                // ±6.20 del dibujo
    // plato portarodillos
    f.push(revolverEje(`Plato ${s < 0 ? 'A' : 'B'}`, pos(xFila - P.ruedaPlatoEsp / 2, 0, 0), u, [
      [0, P.ruedaBore / 2], [0, P.ruedaPlatoDia / 2],
      [P.ruedaPlatoEsp, P.ruedaPlatoDia / 2], [P.ruedaPlatoEsp, P.ruedaBore / 2]]));
    // 8 rodillos por fila, desfasados media división entre filas
    for (let j = 0; j < P.ruedaNRodillos; j++) {
      const fase = (s > 0 ? Math.PI / P.ruedaNRodillos : 0);
      const a = fase + (2 * Math.PI * j) / P.ruedaNRodillos;
      const c = Math.cos(a), sn = Math.sin(a);
      const at = pos(xFila, Rc * c, Rc * sn);
      const tang = [                                 // tangente al círculo de rodillos
        r2(-e1[0] * sn + e2[0] * c), r2(-e1[1] * sn + e2[1] * c), r2(-e1[2] * sn + e2[2] * c)];
      f.push(revolverEje(`Rodillo ${s < 0 ? 'A' : 'B'}${j + 1}`, at, tang, perfil()));
    }
  }
  // taladros de fijación del dibujo (4 × Ø2.20) y el agujero del eje
  for (let j = 0; j < 4; j++) {
    const a = (Math.PI / 4) + (Math.PI / 2) * j, rr = P.ruedaTaladroR;
    f.push(hole(`Ø${P.ruedaTaladroD} (${j + 1})`,
      pos(-P.ruedaCubo / 2, rr * Math.cos(a), rr * Math.sin(a)), u, P.ruedaTaladroD));
  }
  f.push(hole(`Eje Ø${P.ruedaBore}`, pos(-P.ruedaAncho / 2, 0, 0), u, P.ruedaBore));
  return { nombre, color: COL.uretano, features: f };
}

// ---------------------------------------------------------------------------
// De aquí en adelante las piezas se construyen en COORDENADAS LOCALES EXPLÍCITAS
// de la unidad (x radial, y tangencial, z vertical) en vez de con un marco
// genérico (u, w, t). Con el marco genérico los signos se invierten cuando el
// motor va hacia el centro y las piezas terminan colocadas del revés; aquí el
// que llama pasa las x que ya calculó y `s` (+1/−1) dice hacia dónde va el motor.
// ---------------------------------------------------------------------------

// MOTOR TT 1:48 — comprado. Reductora + campana + los DOS ejes planos.
// El eje de salida es perpendicular al eje largo del cuerpo: por eso el cuerpo
// cuelga y la huella radial del motor son 22 mm, no 70.
export function motorTT(nombre, xCara, s, zEje) {
  const f = [];
  const zTope = zEje + P.ttEjeDesdeExtremo;              // extremo alto del cuerpo
  const xMed = xCara + s * P.ttAncho / 2;                // centro de la reductora
  const xLejos = xCara + s * P.ttAncho;                  // cara opuesta al eje de salida
  const zRed = zTope - P.ttRedLargo;                     // donde acaba la reductora
  f.push(box(`Reductora ${P.ttRedLargo}×${P.ttAncho}×${P.ttAlto}`,
    [xMed, 0, zRed], P.ttAncho, P.ttAlto, P.ttRedLargo));
  f.push(cyl(`Campana del motor Ø${P.ttCampanaDia}`, [xMed, 0, zRed], [0, 0, -1],
    P.ttCampanaDia, P.ttLargo - P.ttRedLargo));
  // los dos ejes planos (doble D): cilindro menos dos rebanadas
  for (const [etiq, xBase, dir] of [['salida', xCara, -s], ['libre', xLejos, s]]) {
    f.push(cyl(`Eje ${etiq} Ø${P.ttEjeD}`, [xBase, 0, zEje], [dir, 0, 0], P.ttEjeD, P.ttEjeSale));
    for (const c of [-1, 1]) {
      f.push(box(`Plano del eje ${etiq} ${c > 0 ? '+' : '−'}`,
        [xBase + dir * P.ttEjeSale / 2, c * (P.ttEjeAF / 2 + P.ttEjeD / 4), zEje - P.ttEjeD / 2],
        P.ttEjeSale + 1, P.ttEjeD / 2, P.ttEjeD, 'cut'));
    }
  }
  // taladros de fijación M3, pasantes a lo largo del eje
  for (const c of [-1, 1]) {
    f.push(hole(`Fijación M3 (${c > 0 ? '+' : '−'})`,
      [xCara - s, c * P.ttFijacionC, zTope - P.ttFijacionB], [s, 0, 0], 3.2));
  }
  return { nombre, color: COL.motor, features: f };
}

// ---------------------------------------------------------------------------
// BLOQUE PORTA-RODAMIENTO — IMPRESO. Alma vertical con el asiento del 624ZZ y
// su reborde de tope; se atornilla contra la cara inferior de la placa con dos
// M3 verticales, sin pie en voladizo: un pie chocaba con el motor y con el disco.
// ---------------------------------------------------------------------------
export function bloqueRodamiento(nombre, xCentro, xRod0, zEje, zPlaca) {
  const zPie = zEje - P.bloqueBajoEje;
  const f = [];
  f.push(box('Alma', [xCentro, 0, zPie], P.bloqueEsp, P.bloqueAncho, zPlaca - zPie));
  // asiento del rodamiento: cilindro EXACTAMENTE donde está el rodamiento, no un
  // agujero desde una cara (que se invierte según hacia dónde mire la unidad)
  f.push(cyl(`Asiento Ø${P.rodOD} × ${P.rodW}`, [xRod0, 0, zEje], [1, 0, 0],
    P.rodOD, P.rodW, 'cut'));
  f.push(hole(`Reborde Ø${P.rodOD - 3}`, [xCentro - P.bloqueEsp, 0, zEje], [1, 0, 0], P.rodOD - 3));
  for (const c of [-1, 1]) {
    f.push(hole(`M3 (${c > 0 ? '+' : '−'})`,
      [xCentro, c * P.bloqueTaladroSep / 2, zPlaca + 1], [0, 0, -1], 3.4, P.bloqueTaladroProf, false));
  }
  return { nombre, color: COL.chapa, features: f };
}

// ---------------------------------------------------------------------------
// ACOPLE TT → EJE Ø4 — IMPRESO. Alojamiento doble D de un lado, agujero del eje
// del otro y prisionero M3. Es la pieza que salva que la rueda sea de Ø4 y el
// motor de 5.5 plano.
// ---------------------------------------------------------------------------
export function acopleTT(nombre, xRuedaLado, s, zEje) {
  const xMotorLado = xRuedaLado + s * P.acopleLargo;
  const f = [];
  f.push(cyl(`Cuerpo Ø${P.acopleDia} × ${P.acopleLargo}`, [xRuedaLado, 0, zEje], [s, 0, 0],
    P.acopleDia, P.acopleLargo));
  f.push(hole(`Alojamiento eje Ø${P.ejeDia}`, [xRuedaLado, 0, zEje], [s, 0, 0],
    P.ejeDia + 0.2, P.acopleEncaje, false));
  f.push(hole(`Alojamiento eje TT Ø${P.ttEjeD}`, [xMotorLado, 0, zEje], [-s, 0, 0],
    P.ttEjeD + 0.2, P.acopleLargo - P.acopleEncaje - 1, false));
  f.push(hole('Prisionero M3', [xRuedaLado + s * P.acopleEncaje / 2, 0, zEje + P.acopleDia / 2],
    [0, 0, -1], 2.5, P.acopleDia / 2, false));
  return { nombre, color: COL.polea, features: f };
}

// ---------------------------------------------------------------------------
// SOPORTE DEL MOTOR — IMPRESO. Escuadra contra la cara opuesta de la reductora,
// tomada por sus dos M3, que sube a atornillarse bajo la placa. Sin esto el
// motor no se sujeta a nada.
// ---------------------------------------------------------------------------
export function soporteMotor(nombre, xCara, s, zEje, zPlaca) {
  const xAlma = xCara + s * (P.ttAncho + P.soporteEsp / 2);
  const zTope = zEje + P.ttEjeDesdeExtremo;
  const f = [];
  f.push(box('Alma', [xAlma, 0, zTope - P.ttRedLargo], P.soporteEsp, P.soporteAncho,
    zPlaca - (zTope - P.ttRedLargo)));
  // Ala superior, atornillada bajo la placa. Vuela hacia la RUEDA (−s), por
  // encima del motor: si volara hacia el centro sumaría al extremo interno del
  // tren, que es justo lo que obliga a agrandar la celda.
  f.push(box('Ala', [xAlma - s * P.soporteAla / 2, 0, zPlaca - P.soportePieEsp],
    P.soporteAla, P.soporteAncho, P.soportePieEsp));
  // paso del eje libre del TT, que asoma por esta cara
  f.push(hole(`Paso del eje libre Ø${P.ttEjeD + 3}`,
    [xAlma - s * P.soporteEsp, 0, zEje], [s, 0, 0], P.ttEjeD + 3));
  for (const c of [-1, 1]) {
    f.push(hole(`M3 reductora (${c > 0 ? '+' : '−'})`,
      [xAlma + s * P.soporteEsp, c * P.ttFijacionC, zTope - P.ttFijacionB], [-s, 0, 0], 3.4));
    f.push(hole(`M3 placa (${c > 0 ? '+' : '−'})`,
      [xAlma - s * P.soporteAla / 2, c * P.soporteAncho / 3, zPlaca + 1], [0, 0, -1], 3.4));
  }
  return { nombre, color: COL.chapaOsc, features: f };
}

// ---------------------------------------------------------------------------
// DISCO DE ENCODER — IMPRESO, con sus ranuras de verdad: son las que cuenta el
// sensor, así que un disco liso no es el disco.
// ---------------------------------------------------------------------------
export function discoEncoder(nombre, xDisco, s, zEje) {
  const f = [];
  f.push(cyl(`Disco Ø${P.discoDia} × ${P.discoEsp}`, [xDisco, 0, zEje], [s, 0, 0],
    P.discoDia, P.discoEsp));
  f.push(hole(`Eje Ø${P.ejeDia}`, [xDisco, 0, zEje], [s, 0, 0], P.ejeDia));
  const rInt = P.discoRanuraR - P.discoRanuraAlto / 2;
  const rExt = P.discoRanuraR + P.discoRanuraAlto / 2;
  for (let j = 0; j < P.discoNRanuras; j++) {
    const a = (2 * Math.PI * j) / P.discoNRanuras;
    const semi = Math.PI / (2 * P.discoNRanuras);        // media ranura = medio paso
    const pts = [
      ...arcoPts(0, 0, rInt, a - semi, a + semi, 4),
      ...arcoPts(0, 0, rExt, a + semi, a - semi, 4),
    ].map(([y, z]) => [r2(y), r2(z + zEje)]);
    f.push({
      id: nid(), name: `Ranura ${j + 1}`, shape: 'sketch', op: 'cut',
      at: [xDisco + s * (P.discoEsp + 1), 0, 0], dir: [-s, 0, 0],
      params: { pts, h: P.discoEsp + 2, u: [0, 1, 0] },
    });
  }
  return { nombre, color: COL.chapaOsc, features: f };
}

// ---------------------------------------------------------------------------
// SENSOR RANURADO LM393 — comprado. PCB con la horquilla que abraza el disco.
// ---------------------------------------------------------------------------
export function sensorLM393(nombre, xDisco, sFuera, zEje) {
  const zRanura = zEje - P.discoDia / 2;               // borde inferior del disco
  // El PCB no va centrado en el disco sino desplazado HACIA AFUERA: la horquilla
  // abraza el disco por un lado y el resto de la placa queda libre. Centrarlo
  // metía el PCB dentro del alma del soporte en C.
  const xPCB = xDisco + sFuera * (P.lmEsp / 2 - P.lmRanura / 2);
  const f = [];
  f.push(box(`PCB ${P.lmLargo}×${P.lmAlto}×${P.lmEsp}`, [xPCB, 0, zRanura - P.lmBajoDisco],
    P.lmEsp, P.lmLargo, P.lmAlto));
  f.push(box('Ranura de la horquilla', [xDisco, 0, zRanura - P.lmRanuraProf],
    P.lmRanura, P.lmLargo + 2, P.lmRanuraProf + P.lmAlto, 'cut'));
  for (const c of [-1, 1]) {
    f.push(box(`Brazo ${c > 0 ? '+' : '−'}`,
      [xDisco + c * (P.lmRanura / 2 + P.lmBrazo / 2), P.lmLargo / 2 - P.lmBrazo, zRanura - P.lmRanuraProf],
      P.lmBrazo, P.lmBrazo * 2, P.lmRanuraProf + 3));
  }
  return { nombre, color: COL.rodamiento, features: f };
}

// ---------------------------------------------------------------------------
// SOPORTE EN C — CHAPA PLEGADA. Es la pieza que la patente describe en [0054]:
//   «ein im wesentlichen C-förmiger, nach oben offener Träger 32 mit oben
//    beiderseits nach außen gewandten Abkantungen 34 mit Bohrungen, der an der
//    Unterseite des Trägerbleches mittels Schrauben befestigt ist»
// Una C de chapa abierta hacia arriba, con pestañas dobladas hacia fuera arriba
// y taladradas, atornillada bajo la chapa portante. Sus dos almas verticales son
// las que alojan los rodamientos de la rueda: sustituye a los dos bloques
// impresos y al soporte del motor en una sola pieza plegada.
//
// Perfil de la FIBRA MEDIA en el plano radial-vertical (x, z):
//
//     pestaña ┐                                     ┌ pestaña
//             └──┐                               ┌──┘
//                │  alma            alma         │
//                │   ●  rodamiento   ●           │
//                └───────── fondo ───────────────┘
//
export function soporteC(nombre, xAlmaInt, xAlmaExt, zEje, zPlaca, xRodInt, xRodExt) {
  const t = P.chapaEsp, r = P.chapaRadio;
  const zFondo = zEje - P.soporteCBajoEje;
  // fibra media: pestaña interior → alma → fondo → alma → pestaña exterior
  const fibra = [
    [xAlmaInt - P.soporteCPestana, zPlaca - t / 2],
    [xAlmaInt, zPlaca - t / 2],
    [xAlmaInt, zFondo],
    [xAlmaExt, zFondo],
    [xAlmaExt, zPlaca - t / 2],
    [xAlmaExt + P.soporteCPestana, zPlaca - t / 2],
  ];
  const seccion = seccionChapa(fibra, t, r);
  const dev = desarrollo(fibra, t, r, P.chapaK);
  const ancho = P.soporteCAncho;
  const f = [{
    id: nid(), name: `Perfil en C ${P.chapaEsp} mm (desarrollo ${dev.largo} mm)`,
    shape: 'sketch', op: 'union', at: [0, -ancho / 2, 0], dir: [0, 1, 0],
    // la base del boceto es (u, dir×u) = (+X, −Z): por eso la z va cambiada de signo
    params: { pts: seccion.map(([x, z]) => [r2(x), r2(-z)]), h: ancho, u: [1, 0, 0] },
  }];
  // Alojamientos de los rodamientos: UN solo pasante arrancado por fuera del
  // perfil, que atraviesa las DOS almas. Un agujero anclado en el plano medio de
  // cada alma solo taladraba su mitad delantera y el rodamiento mordía la otra.
  // 0.2 mm de holgura de modelo: en la pieza real es un ajuste con apriete.
  f.push(hole(`Alojamiento de los rodamientos Ø${P.rodOD}`,
    [xRodInt - 10, 0, zEje], [1, 0, 0], P.rodOD + 0.2));
  // taladros de las pestañas, a la placa
  for (const [xp, lado] of [[xAlmaInt - P.soporteCPestana / 2, 'int'], [xAlmaExt + P.soporteCPestana / 2, 'ext']]) {
    for (const c of [-1, 1]) {
      f.push(hole(`M3 pestaña ${lado} (${c > 0 ? '+' : '−'})`,
        [xp, c * P.soporteCTaladroSep / 2, zPlaca + 1], [0, 0, -1], 3.4));
    }
  }
  // taladros del motor en el alma interior
  for (const c of [-1, 1]) {
    f.push(hole(`M3 motor (${c > 0 ? '+' : '−'})`,
      [xAlmaInt - t, c * P.ttFijacionC, zEje + P.ttFijacionB], [1, 0, 0], 3.4));
  }
  return {
    nombre, color: COL.chapa, features: f,
    chapa: { t, r, desarrollo: dev.largo, plegados: dev.plegados.length, tramos: dev.tramos },
  };
}

// ---------------------------------------------------------------------------
// RUEDA DE BOLA — comprada. Es el elemento 26 de la patente [0050]: pasiva, a la
// MISMA altura que las ruedas motrices, en los huecos, para que el bulto no se
// enganche en los cantos al cruzar de celda a celda.
// ---------------------------------------------------------------------------
export function ruedaBola(nombre, x, y, zPlaca) {
  const f = [];
  const rB = P.bolaDia / 2;
  // la bola asoma hasta Z = 0, el plano de transporte
  f.push(revolverEje('Bola', [x, y, -rB], [0, 0, 1], [
    ...arcoPts(0, 0, rB, -Math.PI / 2, Math.PI / 2, 12).map(([h, rr]) => [r2(h), r2(Math.abs(rr))]),
  ]));
  // cazoleta que la aloja, embutida en la chapa
  f.push(revolverEje('Cazoleta', [x, y, zPlaca - P.bolaCazoletaAlto], [0, 0, 1], [
    [0, P.bolaCazoletaDia / 2], [P.bolaCazoletaAlto, P.bolaCazoletaDia / 2],
    [P.bolaCazoletaAlto, P.bolaAlojDia / 2], [0, P.bolaAlojDia / 2]]));
  return { nombre, color: COL.inox, features: f };
}
