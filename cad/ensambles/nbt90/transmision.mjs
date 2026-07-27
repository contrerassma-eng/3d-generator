// transmision.mjs — ACCIONAMIENTO EN SERPENTÍN de la transferencia 90° de
// rodillos emergentes (Hytrol ProSort MRT 90° Transfer).
//
// Una sola banda plana `FLEXPROOF ENDLESS BELT - 1 in. WIDE` arrastra los 6
// rodillos vulcanizados: pasa POR ENCIMA de cada rodillo (sobre el tubo desnudo)
// y POR DEBAJO de las poleas locas Ø2-1/2" intercaladas a medio paso, con la
// rueda motriz en el centro (Y = 0) sobre el eje del motorreductor y dos poleas
// de retorno en las esquinas inferiores. El ramal de retorno cruza la máquina
// por abajo, a Z ≈ P.rielInfZ.
//
// Ejes (CONTRATO.md §1): X = eje de los rodillos · Y = expulsión a 90° · Z = arriba.
// El plano de la banda es X = P.planoSerp, así que la trayectoria vive en YZ y se
// construye con bandaFaces(seq) en coordenadas (u,v) = (Y,Z) + sketchYZ.
//
// Toda la transmisión es capa MÓVIL: sube y baja con el cassette del pop-up.
//
// Procedencia de las cotas locales (`L`): med = medido sobre las vistas ·
// cat = catálogo del fabricante · txt = texto del manual · dis = decisión de
// diseño de este repositorio. Las cotas compartidas salen SIEMPRE de `P`.

import {
  box, cyl, hole, sketchYZ, revolve, rectR, colisa,
  bandaFaces, largoBanda, envolventes,
  polea, pernoHex, tuercaHex, golilla, anilloRet,
  COL, pulg, r2,
} from './lib.mjs';
import { P } from './params.mjs';

// ---------------------------------------------------------------------------
// Cotas propias del módulo
// ---------------------------------------------------------------------------
const B38 = P.M.b38;                       // 3/8-16 UNC: la tornillería del manual (txt pág. 8)

const L = {
  // --- radio de arrastre sobre el rodillo ---------------------------------
  // El tubo desnudo NO mide P.rodTubo (1.19" = 30.23, procedencia `dis`): ese
  // valor es incompatible con el par P.rodDia = 34.93 (med + cat, error 0.03 %)
  // y P.rodVulcE = 3.0, porque 30.23 + 2×3 = 36.23 ≠ 34.93. `rodillos.mjs`
  // resolvió mandando P.rodDia —de él cuelga la emergencia de 1/4" que verifica
  // el gate—, así que el tubo real es Ø28.93 y la banda arrastra sobre r = 14.4625.
  rodArrastre: P.rodDia / 2 - P.rodVulcE,       // 14.4625 (Ø28.925) — dis (interfaz con rodillos.mjs)
  rodDesnudo: [70.3, 99.7],                     // dis: tramo de tubo sin vulcanizar (rodillos.mjs)

  // --- reparto en X -------------------------------------------------------
  // Todo el tren de poleas va EN VOLADIZO hacia −X desde una única placa
  // vertical situada detrás del serpentín: así la banda sale por −X una vez
  // retirados los rodillos, que es lo que exige el manual ("To remove belt the
  // drive rollers must be removed"), y ningún soporte cruza el plano de la banda.
  xPlaca: 113.0,          // dis: cara −X de la placa; deja 5.5 mm tras la rueda motriz
  espPlaca: pulg(0.25),   // 6.35 — dis: chapa 1/4" de catálogo (voladizo del motorreductor)
  zPlaca: [124.0, 278.0], // dis: cubre las 6 poleas, la colisa del tensor y la brida
  yPlaca: 187.0,          // dis: LÍMITE DE INTERFAZ. Por debajo de Z≈252 el `Side channel`
                          // FIJO ocupa Y 189.1…228.6 a los dos lados, así que ninguna pieza
                          // MÓVIL puede pasar de ±187 (integración, informe de interferencias).

  // --- poleas locas / retorno --------------------------------------------
  ejeRan: 6.5,            // dis: fondo de la ranura del anillo de retención (Ø13 en eje 9/16")
  ranAncho: 1.4,          // dis: ancho de ranura DIN 471 para eje 14.29
  hombro: 22.0,           // dis: Ø del hombro del eje que apoya en la placa
  bujeOD: pulg(0.75),     // 19.05 — cat: buje de bronce sinterizado 9/16"×3/4"
  bujeL: pulg(0.5),       // 12.7  — cat: largo del buje (2 por polea)
  cuboPolea: 28.0,        // dis: Ø del cubo de la polea loca (aloja el buje Ø19.05)

  // --- tensor (TAKE-UP IDLER) ---------------------------------------------
  // txt pág. 8: "loosen 3/8 locknut holding take-up idler, tension belt by
  // pushing take-up idler down". La colisa es vertical y el recorrido útil, hacia
  // ABAJO desde la cota de las demás locas, es P.tomaCarrera.
  colisaAncho: pulg(0.5), // 12.7 — med 10.55 @0.5277 → 12.63 (= 3/8" + P.holgura.colisa)
  padY: [60.0, 92.4],     // dis: doblador soldado en la cara −X alrededor de la colisa,
  padZ: [191.0, 278.0],   //      duplica el espesor de apriete (12.7) y guía el espárrago.
                          //      Va SOLDADO y no atornillado porque a Y=76.2 sólo hay 21.8 mm
                          //      de anillo libre entre el espárrago y la brida del motorreductor.
  aprieteY: 24.0,         // dis: placa de apriete bajo la contratuerca (ancho en Y)
  aprieteZ: 40.0,         // dis: (alto en Z; tapa la colisa en cualquier posición del tensor)

  // --- motorreductor SEW RF07DRS71S4 --------------------------------------
  // cat 300.0322 · el Ø145 concéntrico con la rueda motriz medido en la vista
  // izquierda (228.5 px) es la carcasa DRS71: reductor helicoidal de ejes
  // paralelos con entrada y salida COLINEALES (R = coaxial, F = brida).
  ejeLargo: 68.0,         // dis: no publicado (catálogo §7). Se dimensiona para alojar
                          // el buje sin chaveta (42) + 2.5 de salida + paso por la placa
  bridaDia: 120,          // cat: brida RF07 Ø120/140/160 → se elige la MENOR, porque el
                          //      espárrago del tensor pasa a sólo 81.8 mm del eje del motor
  bridaEsp: 14,           // dis
  bridaCentraje: 60,      // dis: resalte de centraje que encaja en la placa
  bridaCirculo: 100,      // dis: círculo de taladros (no publicado, catálogo §7)
  reductorW: 110,         // dis: ancho del cárter (sólo se midió el alto = P.reductorH);
                          //      deja paso de llave a la contratuerca del tensor
  reductorR: 22,          // dis: radio de las esquinas del cárter fundido
  ventiladorDia: 130,     // dis: tapa del ventilador
  ventiladorL: 30,        // dis
  bornes: [100, 95, 55],  // dis: caja de bornes (X, Y, Z)
  bornesX: 320,           // dis

  // --- buje sin chaveta ----------------------------------------------------
  // cat 099.128420 KEYLESS BUSHING 20 mm ID × 45 mm OD, tipo Trantorque:
  // tuerca integral en un extremo (queda FUERA del cubo, hay que poder llavearla)
  // y manguito cónico dentro del cubo. Apriete P.bujePar = 169 N·m.
  bujeTuercaDia: 56,      // dis
  bujeTuercaL: 10,        // dis
  ruedaCorona: 0.4,       // dis: abombado de la rueda motriz (centra la banda plana)

  // --- fijación de la placa al bastidor MÓVIL ------------------------------
  // La placa se apoya y se atornilla sobre los dos `NOTCHED BRACE CHANNEL`
  // (bastidor.mjs, MÓVIL): X 47.2…411, Y 80…120 y −120…−80, cara superior
  // Z = 149.5. La placa lleva una escotadura por cada uno —de ahí el nombre
  // "notched" del larguero— y una pestaña que apoya encima y se atornilla.
  // NO se atornilla al `Side channel`: ése es FIJO y bloquearía el pop-up.
  // INTERFAZ (medida sobre el ensamble integrado; si bastidor.mjs mueve estos
  // largueros hay que revisar estos cuatro valores):
  //   Notched brace channel  Y 80…120      Z 143.5…186.62   X 47.24…411
  //   Cross angle (cartela)  Y 77.34…104.07 Z 150…187.95    X 47.24…263.14
  braceY: [74.8, 122.5],  // hueco de la escotadura (2.5 de holgura a los dos)
  braceZ: 190.5,          // techo de la escotadura (2.5 sobre la cartela)
  asientoZ: 187.95,       // cara superior de la cartela: sobre ella apoya la pestaña
  pestanaX: [113.0, 155.0],  // dis
  pestanaY: [79.0, 102.0],   // dis: dentro de la cartela, libre del espárrago del tensor
  pestanaPerno: [[127.0, 90.5], [141.0, 90.5]],  // dis: (X, |Y|) de los 2 pernos de cada lado

  // --- envolventes FIJAS con las que se verifica la banda ------------------
  // Interfaz con bastidor.mjs (informe de interferencias del ensamble integrado).
  canalFijoY: [189.1, 228.6],
  canalFijoZ: [84.9, 250.0],
  holguraMin: 3.0,        // txt del coordinador: ≥3 mm entre la banda y cualquier pieza FIJA
};

// posiciones derivadas en X (todas cuelgan de P.planoSerp)
const X = {
  banda0: r2(P.planoSerp - P.serpAncho / 2),      // 72.3
  banda1: r2(P.planoSerp + P.serpAncho / 2),      // 97.7
  pol0: r2(P.planoSerp - P.idlerAncho / 2),       // 67.2
  pol1: r2(P.planoSerp + P.idlerAncho / 2),       // 102.8
  rueda0: r2(P.planoSerp - P.ruedaAncho / 2),     // 62.5
  rueda1: r2(P.planoSerp + P.ruedaAncho / 2),     // 107.5
  placa1: r2(L.xPlaca + L.espPlaca),              // 119.35 (cara +X de la placa)
};
X.eje0 = r2(X.pol0 - 3.2);                        // punta del eje de polea loca
X.ran0 = r2(X.eje0 + 1.4);                        // ranura del anillo de retención
X.pad0 = r2(L.xPlaca - L.espPlaca);               // cara −X del doblador de la colisa
X.apriete1 = r2(X.placa1 + L.espPlaca);           // cara +X de la placa de apriete del tensor
X.rosca1 = r2(L.xPlaca + 18);                     // fin de la rosca 3/8 de un eje fijo
X.roscaT = r2(X.apriete1 + 10.4);                 // fin de la rosca 3/8 del eje tensor
X.brida1 = r2(X.placa1 + L.bridaEsp);
X.reduct1 = r2(X.brida1 + P.reductorL);
X.motor1 = r2(X.placa1 + P.motorLargo - L.ventiladorL);
X.eje0Motor = r2(X.placa1 - L.ejeLargo);

// altura del eje del tensor: mitad del recorrido de la colisa (txt: se tensa
// empujando la polea HACIA ABAJO desde la cota de las demás locas)
const zToma = r2(P.idlerZ - P.tomaCarrera / 2);   // 228.6

/** Contorno circular cerrado para `sketchYZ`: se usa en lugar de `cyl` cuando la
 *  pieza es larga, porque `bboxPieza` infla la caja de un cilindro en ±r en los
 *  tres ejes y sacaría al motorreductor de la envolvente del módulo. */
const disco = (dia, zc, n = 10) => rectR(-dia / 2, r2(zc - dia / 2), dia / 2, r2(zc + dia / 2), dia / 2, n);

// ---------------------------------------------------------------------------
// Trayectoria del serpentín (plano YZ, u = Y, v = Z)
// ---------------------------------------------------------------------------
/** seq de bandaFaces: la banda envuelve los rodillos POR ARRIBA (s = −1, giro
 *  horario) y las locas / la rueda motriz POR ABAJO (s = +1). Las dos poleas de
 *  retorno cierran el bucle por debajo (s = −1) y dejan el ramal de retorno
 *  horizontal a Z = P.retornoZ − (P.retornoDia + P.serpEsp)/2 ≈ P.rielInfZ. */
function serpentin(zTensor) {
  const s = [];
  s.push({ c: [-P.retornoY, P.retornoZ], r: P.retornoDia / 2, s: -1, n: 'retorno −Y' });
  for (let i = 0; i < P.nRodillos; i++) {
    s.push({ c: [P.rodY[i], P.rodZ], r: L.rodArrastre, s: -1, n: `rodillo ${i + 1}` });
    if (i >= P.nBandas) continue;
    const y = P.bandaY[i];
    if (y === 0) s.push({ c: [0, P.motrizZ], r: P.ruedaDia / 2, s: 1, n: 'rueda motriz' });
    else s.push({ c: [y, i === P.tomaIdlerIdx ? zTensor : P.idlerZ], r: P.idlerDia / 2, s: 1, n: `loca Y=${y}` });
  }
  s.push({ c: [P.retornoY, P.retornoZ], r: P.retornoDia / 2, s: -1, n: 'retorno +Y' });
  return s;
}

// ---------------------------------------------------------------------------
// Piezas auxiliares del módulo
// ---------------------------------------------------------------------------
/** Buje de bronce sinterizado (SAE 841) — el "rodamiento" de una polea loca plana. */
function bujeBronce(E, { nombre, at, id, od, largo, capa }) {
  return E.addPart(`${capa}Buje bronce SAE 841 ${nombre}`, COL.rodamiento, at, [
    revolve(`Buje Ø${id}/Ø${od}×${largo}`, at, 'x',
      [[0, id / 2], [0, od / 2], [largo, od / 2], [largo, id / 2]]),
  ], { hardware: true, componente: `buje_${id}x${od}x${largo}` });
}

/** Eje-espárrago de una polea loca: vástago Ø9/16" en voladizo, ranura para el
 *  anillo de retención, hombro que apoya en la placa y rosca 3/8-16 con tuerca. */
function ejePolea(E, { nombre, y, z, xApoyo, xRosca, capa }) {
  const at = [X.eje0, y, z];
  return E.addPart(`${capa}Eje polea Ø9/16"×${r2(xRosca - X.eje0)} ${nombre}`, COL.acero, at, [
    cyl(`Vástago Ø${P.idlerEje}`, [X.eje0, y, z], [1, 0, 0], P.idlerEje, r2(X.pol1 - X.eje0)),
    cyl(`Hombro Ø${L.hombro}`, [X.pol1, y, z], [1, 0, 0], L.hombro, r2(xApoyo - X.pol1)),
    cyl(`Rosca 3/8-16 × ${r2(xRosca - xApoyo)}`, [xApoyo, y, z], [1, 0, 0], B38.d, r2(xRosca - xApoyo)),
    revolve('Ranura anillo DIN 471', [X.ran0, y, z], 'x',
      [[0, L.ejeRan], [0, 9], [L.ranAncho, 9], [L.ranAncho, L.ejeRan]], 'cut'),
  ], { componente: 'eje_polea_9_16' });
}

/** Conjunto completo de una polea loca / de retorno: polea + 2 bujes + eje +
 *  anillo de retención + tuerca. Devuelve el nº de piezas creadas. */
/** Registro de los sólidos de polea creados, para cotejarlos uno a uno con la
 *  secuencia de la banda (la banda se calcula de una lista y las poleas se
 *  dibujan en otra: sin este cotejo un `addPart` que falte pasa desapercibido). */
const poleasPuestas = [];

function conjuntoLoca(E, { nombre, pos, y, z, capa, tensor = false }) {
  const n0 = E.parts.length;
  poleasPuestas.push({ y, z, nombre: `${nombre} (${pos})` });
  polea(E, {
    nombre: `${nombre} (${pos})`, at: [X.pol0, y, z], dir: [1, 0, 0],
    od: P.idlerDia, ancho: P.idlerAncho, bore: L.bujeOD, cubo: L.cuboPolea,
    color: COL.polea, capa, extra: { componente: 'polea_923.00975' },
  });
  for (const [i, x] of [X.pol0, r2(X.pol1 - L.bujeL)].entries()) {
    bujeBronce(E, {
      nombre: `9/16"×3/4"×1/2" (${pos}, ${i ? 'interior' : 'exterior'})`,
      at: [x, y, z], id: P.idlerEje, od: L.bujeOD, largo: L.bujeL, capa,
    });
  }
  ejePolea(E, {
    nombre: `(${pos})`, y, z, capa,
    xApoyo: tensor ? X.pad0 : L.xPlaca, xRosca: tensor ? X.roscaT : X.rosca1,
  });
  anilloRet(E, { nombre: `eje polea (${pos})`, at: [r2(X.ran0 + 0.1), y, z], dir: [1, 0, 0], eje: P.idlerEje, capa });
  if (tensor) {
    // placa de apriete: reparte el apriete de la contratuerca sobre la colisa y
    // deja libre el anillo de 21.8 mm que queda entre el espárrago y la brida.
    E.addPart(`${capa}Placa de apriete del tensor 1/4"×${L.aprieteY}×${L.aprieteZ} (${pos})`, COL.movil,
      [X.placa1, y, z], [
        sketchYZ('Placa de apriete', X.placa1,
          rectR(r2(y - L.aprieteY / 2), r2(z - L.aprieteZ / 2), r2(y + L.aprieteY / 2), r2(z + L.aprieteZ / 2), 6),
          L.espPlaca),
        hole(`Paso espárrago Ø${r2(B38.d + P.holgura.pasante)}`, [r2(X.placa1 - 0.5), y, z], [1, 0, 0], r2(B38.d + P.holgura.pasante)),
      ]);
    tuercaHex(E, { nombre: `3/8-16 CONTRATUERCA tensor (${pos})`, at: [X.apriete1, y, z], dir: [1, 0, 0], dia: B38.d, af: B38.af, alto: B38.tuerca, capa });
  } else {
    tuercaHex(E, { nombre: `3/8-16 autoblocante eje polea (${pos})`, at: [X.placa1, y, z], dir: [1, 0, 0], dia: B38.d, af: B38.af, alto: B38.tuerca, capa });
  }
  return E.parts.length - n0;
}

// ---------------------------------------------------------------------------
// Módulo
// ---------------------------------------------------------------------------
/** @param {import('./lib.mjs').Ensamble} E
 *  @returns {object} métricas del serpentín para el gate */
export function transmision(E) {
  const cap = 'MÓVIL · ';
  poleasPuestas.length = 0;
  const seq = serpentin(zToma);
  const idlerY = P.bandaY.filter((y) => y !== 0);          // 4 locas: el centro lo ocupa la rueda

  // =========================================================== 1. PLACA SOPORTE
  // Weldment: placa 1/4" en el plano YZ + 2 orejas que apoyan en el alma de los
  // canales laterales. Lleva los 6 alojamientos de eje, la colisa del tensor y
  // el asiento de la brida del motorreductor.
  const cortes = [];
  for (const y of idlerY) if (y !== P.bandaY[P.tomaIdlerIdx]) cortes.push([y, P.idlerZ]);
  cortes.push([-P.retornoY, P.retornoZ], [P.retornoY, P.retornoZ]);
  const fPlaca = [
    sketchYZ(`Placa 1/4" ${r2(2 * L.yPlaca)}×${r2(L.zPlaca[1] - L.zPlaca[0])}`, L.xPlaca,
      rectR(-L.yPlaca, L.zPlaca[0], L.yPlaca, L.zPlaca[1], 12), L.espPlaca),
  ];
  fPlaca.push(sketchYZ(`Doblador de la colisa 1/4"×${r2(L.padY[1] - L.padY[0])}×${r2(L.padZ[1] - L.padZ[0])} (soldado)`,
    X.pad0, rectR(L.padY[0], L.padZ[0], L.padY[1], L.padZ[1], 8), L.espPlaca));
  // escotaduras por las que pasan los dos notched brace channel y sus cartelas
  for (const sg of [-1, 1]) {
    const y0 = r2(Math.min(sg * L.braceY[0], sg * L.braceY[1])), y1 = r2(Math.max(sg * L.braceY[0], sg * L.braceY[1]));
    fPlaca.push(sketchYZ(`Escotadura notched brace channel ${sg > 0 ? '+Y' : '−Y'} (${r2(y1 - y0)}×${r2(L.braceZ - L.zPlaca[0])})`,
      r2(X.placa1 + 0.65), rectR(y0, r2(L.zPlaca[0] - 8), y1, L.braceZ, 4), 14, 'cut'));
  }
  for (const [y, z] of cortes) {
    fPlaca.push(hole(`Paso eje polea Ø${r2(B38.d + P.holgura.pasante)} (Y=${y})`,
      [r2(L.xPlaca - 0.5), y, z], [1, 0, 0], r2(B38.d + P.holgura.pasante)));
  }
  fPlaca.push(
    hole(`Centraje brida motorreductor Ø${r2(L.bridaCentraje + 0.4)}`,
      [r2(L.xPlaca - 0.5), 0, P.motrizZ], [1, 0, 0], r2(L.bridaCentraje + 0.4)),
    sketchYZ(`Colisa tensor ${L.colisaAncho}×${r2(P.tomaCarrera + L.colisaAncho)} (recorrido ${P.tomaCarrera})`,
      r2(X.placa1 + 0.65), colisa(P.bandaY[P.tomaIdlerIdx], zToma, r2(P.tomaCarrera + L.colisaAncho), L.colisaAncho, true),
      14, 'cut'));
  for (const s of [-1, 1]) for (const s2 of [-1, 1]) {
    fPlaca.push(hole(`Taladro brida motorreductor Ø${r2(B38.d + P.holgura.pasante)}`,
      [r2(L.xPlaca - 0.5), r2(s * L.bridaCirculo / Math.SQRT2 / 2), r2(P.motrizZ + s2 * L.bridaCirculo / Math.SQRT2 / 2)],
      [1, 0, 0], r2(B38.d + P.holgura.pasante)));
  }
  // pestañas de apoyo: se añaden DESPUÉS de las escotaduras (si no, el corte se
  // las llevaría por delante) y se apoyan sobre la cartela del larguero móvil.
  for (const sg of [-1, 1]) {
    fPlaca.push(box(`Pestaña de apoyo sobre cartela ${sg > 0 ? '+Y' : '−Y'} 1/4"×${r2(L.pestanaX[1] - L.pestanaX[0])}×${r2(L.pestanaY[1] - L.pestanaY[0])}`,
      [r2((L.pestanaX[0] + L.pestanaX[1]) / 2), r2(sg * (L.pestanaY[0] + L.pestanaY[1]) / 2), L.asientoZ],
      r2(L.pestanaX[1] - L.pestanaX[0]), r2(L.pestanaY[1] - L.pestanaY[0]), L.espPlaca));
  }
  for (const sg of [-1, 1]) for (const [px, py] of L.pestanaPerno) {
    fPlaca.push(hole(`Taladro pestaña Ø${r2(B38.d + P.holgura.pasante)} (${sg > 0 ? '+Y' : '−Y'}, X=${px})`,
      [px, r2(sg * py), r2(L.asientoZ + L.espPlaca + 0.5)], [0, 0, -1], r2(B38.d + P.holgura.pasante), 9, false));
  }
  E.addPart(`${cap}Placa soporte de transmisión 1/4"×${r2(2 * L.yPlaca)}×${r2(L.zPlaca[1] - L.zPlaca[0])} c/colisa tensor (weldment)`,
    COL.movil, [L.xPlaca, 0, L.zPlaca[0]], fPlaca, { weldment: true });

  // =============================================== 2. BANDA PLANA DEL SERPENTÍN
  // `bandaFaces` falla si algún tramo no tiene tangente: que cierre es la
  // comprobación de que las 13 envolturas son compatibles entre sí.
  // n = 26 puntos por arco: la flecha de la poligonal queda en 0.06 mm, de modo
  // que la banda apoya sobre la llanta sin morderla por efecto de la faceta.
  const caras = bandaFaces(seq, P.serpEsp, 26);
  const largo = largoBanda(seq, P.serpEsp);
  const env = envolventes(seq, P.serpEsp);
  E.addPart(`${cap}Banda plana FLEXPROOF sin fin 1"×${P.serpEsp} — serpentín L=${largo} (069.722xx)`,
    COL.banda, [X.banda0, 0, 0], [
      sketchYZ('Cara exterior del serpentín', X.banda0, caras.outer, P.serpAncho),
      sketchYZ('Cara interior del serpentín', r2(X.banda1 + 0.5), caras.inner, r2(P.serpAncho + 1), 'cut'),
    ], { hardware: true, componente: 'banda_flexproof_1in', capaDato: 'cat' });

  // ============================================ 3. POLEAS LOCAS Y TENSOR (4 ud)
  for (const y of idlerY) {
    const tensor = y === P.bandaY[P.tomaIdlerIdx];
    conjuntoLoca(E, {
      nombre: tensor
        ? 'Polea loca banda plana Ø2-1/2"×1.4" TAKE-UP IDLER'
        : 'Polea loca banda plana Ø2-1/2"×1.4"',
      pos: `Y=${y}`, y, z: tensor ? zToma : P.idlerZ, capa: cap, tensor,
    });
  }

  const yT = P.bandaY[P.tomaIdlerIdx];

  // =========================================== 4. POLEAS DE RETORNO (2 ud)
  for (const sg of [-1, 1]) {
    conjuntoLoca(E, {
      nombre: 'Polea de retorno banda plana Ø2-1/2"×1.4"',
      pos: `Y=${r2(sg * P.retornoY)}`, y: r2(sg * P.retornoY), z: P.retornoZ, capa: cap,
    });
  }

  // ================================ 5. RUEDA MOTRIZ + BUJE SIN CHAVETA
  // cat 024.15502 FLAT BELT DRIVE WHEEL 2-1/2" D × 1.772": llanta abombada
  // (L.ruedaCorona) para que la banda plana se centre sola, barreno Ø45 = OD del
  // buje sin chaveta. No lleva chaveta: el buje es la unión y la retención axial.
  const cr = r2(P.ruedaDia / 2 - L.ruedaCorona);
  poleasPuestas.push({ y: 0, z: P.motrizZ, nombre: 'Rueda motriz banda plana Ø2-1/2"×1.772" (Y=0)' });
  E.addPart(`${cap}Rueda motriz banda plana Ø2-1/2"×1.772" (024.15502, Y=0)`, COL.polea,
    [X.rueda0, 0, P.motrizZ], [
      revolve(`Llanta Ø${P.ruedaDia}×${P.ruedaAncho} abombada ${L.ruedaCorona}, barreno Ø${P.bujeDia}`,
        [X.rueda0, 0, P.motrizZ], 'x', [
          [0, P.bujeDia / 2], [0, cr], [r2(P.ruedaAncho / 4), P.ruedaDia / 2],
          [r2(3 * P.ruedaAncho / 4), P.ruedaDia / 2], [P.ruedaAncho, cr], [P.ruedaAncho, P.bujeDia / 2]]),
    ], { componente: 'rueda_024.15502' });

  const xBuje = r2(X.rueda0 - L.bujeTuercaL);
  E.addPart(`${cap}Buje sin chaveta 20 mm ID × 45 mm OD (099.128420, apriete ${P.bujePar} N·m)`,
    COL.rodamiento, [xBuje, 0, P.motrizZ], [
      revolve(`Tuerca de apriete Ø${L.bujeTuercaDia}×${L.bujeTuercaL}`, [xBuje, 0, P.motrizZ], 'x',
        [[0, P.motorEjeDia / 2], [0, L.bujeTuercaDia / 2], [L.bujeTuercaL, L.bujeTuercaDia / 2], [L.bujeTuercaL, P.motorEjeDia / 2]]),
      revolve(`Manguito cónico Ø${P.bujeDia}×${r2(P.bujeLargo - L.bujeTuercaL)}`, [X.rueda0, 0, P.motrizZ], 'x',
        [[0, P.motorEjeDia / 2], [0, P.bujeDia / 2], [r2(P.bujeLargo - L.bujeTuercaL), P.bujeDia / 2],
          [r2(P.bujeLargo - L.bujeTuercaL), P.motorEjeDia / 2]]),
    ], { hardware: true, componente: 'buje_099.128420' });

  // ============================================== 6. MOTORREDUCTOR SEW RF07DRS71S4
  // cat 300.0322: 1/2 hp, 230/460/3, 462 rpm. Eje de salida Ø20 hacia −X, a Y=0
  // y Z = P.motrizZ; la brida se atornilla a la placa soporte con 4 pernos de
  // 3/8-16 y un resalte de centraje: ésa es toda su fijación (RF = flange mount).
  E.addPart(`${cap}Motorreductor SEW RF07DRS71S4 — 1/2 hp, 230/460/3, ${P.motorRpm} rpm (300.0322)`,
    COL.motor, [X.placa1, 0, P.motrizZ], [
      cyl(`Eje de salida Ø${P.motorEjeDia}×${L.ejeLargo}`, [X.eje0Motor, 0, P.motrizZ], [1, 0, 0], P.motorEjeDia, L.ejeLargo),
      cyl(`Centraje Ø${L.bridaCentraje}×${L.espPlaca}`, [L.xPlaca, 0, P.motrizZ], [1, 0, 0], L.bridaCentraje, r2(L.espPlaca + 0.2)),
      // la brida se hace por revolución (no por boceto) para que su cara de
      // apoyo quede EXACTAMENTE en la cara +X de la placa, sin el solape de
      // fusión de 0.2 mm que el motor CSG añade a las extrusiones de boceto.
      revolve(`Brida Ø${L.bridaDia}×${L.bridaEsp}`, [X.placa1, 0, P.motrizZ], 'x',
        [[0, r2(P.motorEjeDia / 2 - 1)], [0, L.bridaDia / 2], [L.bridaEsp, L.bridaDia / 2], [L.bridaEsp, r2(P.motorEjeDia / 2 - 1)]]),
      sketchYZ(`Cárter reductor ${L.reductorW}×${P.reductorH}×${P.reductorL}`, X.brida1,
        rectR(r2(-L.reductorW / 2), r2(P.motrizZ - P.reductorH / 2), r2(L.reductorW / 2), r2(P.motrizZ + P.reductorH / 2), L.reductorR),
        P.reductorL),
      sketchYZ(`Carcasa motor DRS71 Ø${P.motorDia}×${r2(X.motor1 - X.reduct1)}`, X.reduct1,
        disco(P.motorDia, P.motrizZ), r2(X.motor1 - X.reduct1)),
      sketchYZ(`Tapa de ventilador Ø${L.ventiladorDia}×${L.ventiladorL}`, X.motor1,
        disco(L.ventiladorDia, P.motrizZ), L.ventiladorL),
      box(`Caja de bornes ${L.bornes[0]}×${L.bornes[1]}×${L.bornes[2]}`,
        [L.bornesX, 0, r2(P.motrizZ + P.motorDia / 2)], L.bornes[0], L.bornes[1], L.bornes[2]),
    ], { hardware: true, componente: 'motorreductor_300.0322' });

  for (const s of [-1, 1]) for (const s2 of [-1, 1]) {
    pernoHex(E, {
      nombre: `3/8-16 × 3/4" brida motorreductor (${s > 0 ? '+Y' : '−Y'}${s2 > 0 ? '+Z' : '−Z'})`,
      at: [L.xPlaca, r2(s * L.bridaCirculo / Math.SQRT2 / 2), r2(P.motrizZ + s2 * L.bridaCirculo / Math.SQRT2 / 2)],
      dir: [1, 0, 0], dia: B38.d, largo: pulg(0.75), af: B38.af, altoCab: B38.hh, capa: cap,
    });
  }

  // ================================ 7. FIJACIÓN DE LA PLACA AL BASTIDOR MÓVIL
  // La pestaña apoya sobre el ala superior del notched brace channel (MÓVIL) y
  // el perno entra desde arriba, que es por donde hay acceso de llave.
  const zCab = r2(L.asientoZ + L.espPlaca);
  for (const sg of [-1, 1]) for (const [px, py] of L.pestanaPerno) {
    golilla(E, {
      nombre: `3/8" bajo cabeza (${sg > 0 ? '+Y' : '−Y'}, X=${px})`,
      at: [px, r2(sg * py), zCab], dir: [0, 0, 1], dia: B38.d, ext: pulg(1), esp: 1.6, capa: cap,
    });
    pernoHex(E, {
      nombre: `3/8-16 × 3/4" placa↔cartela del larguero (${sg > 0 ? '+Y' : '−Y'}, X=${px})`,
      at: [px, r2(sg * py), r2(zCab + 1.6)], dir: [0, 0, -1],
      dia: B38.d, largo: pulg(0.75), af: B38.af, altoCab: B38.hh, capa: cap,
    });
    tuercaHex(E, {
      nombre: `3/8-16 placa↔cartela del larguero (${sg > 0 ? '+Y' : '−Y'}, X=${px})`,
      at: [px, r2(sg * py), r2(L.asientoZ - P.cal12)], dir: [0, 0, -1],
      dia: B38.d, af: B38.af, alto: B38.tuerca, capa: cap,
    });
  }

  // ---------------------------------------------------------------- métricas
  const idx = (n) => seq.findIndex((q) => q.n === n);
  const envRod = seq.map((q, i) => (q.n.startsWith('rodillo') ? env[i] : null)).filter((v) => v !== null);
  const holgura = (a, b) => r2(Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]) - a.r - b.r);
  const q = (n) => seq[idx(n)];
  const dArr = r2(2 * L.rodArrastre);                                   // Ø del tubo desnudo = 28.93
  const vBanda = Math.PI * P.ruedaDia / 1000 * P.motorRpm / 60;         // m/s en el paso de la rueda
  const nRod = vBanda / (Math.PI * dArr / 1000) * 60;                   // rpm del rodillo
  const par = P.motorHP * 745.7 / (2 * Math.PI * P.motorRpm / 60);      // N·m a la salida
  const mu = 0.40;                                                      // cat Habasit TF/TC sobre acero

  // --- cotejo poleas ↔ secuencia de la banda: cada elemento de `seq` que no sea
  //     un rodillo tiene que tener un sólido de polea en la MISMA (Y, Z).
  const sinSolido = seq.filter((s) => !s.n.startsWith('rodillo'))
    .filter((s) => !poleasPuestas.some((p) => Math.abs(p.y - s.c[0]) < 0.01 && Math.abs(p.z - s.c[1]) < 0.01))
    .map((s) => `${s.n} (Y=${s.c[0]}, Z=${r2(s.c[1])})`);
  const sinBanda = poleasPuestas
    .filter((p) => !seq.some((s) => Math.abs(p.y - s.c[0]) < 0.01 && Math.abs(p.z - s.c[1]) < 0.01))
    .map((p) => p.nombre);
  if (sinSolido.length || sinBanda.length) {
    throw new Error(`transmision: la banda y las poleas no cuadran — sin sólido: [${sinSolido}] · sin banda: [${sinBanda}]`);
  }

  // --- holgura de la banda a la envolvente del Side channel FIJO (plano YZ; el
  //     canal recorre todo X, así que no hay separación posible en X).
  const dens = [];
  for (let i = 0; i < caras.outer.length; i++) {
    const a = caras.outer[i], b = caras.outer[(i + 1) % caras.outer.length];
    for (let k = 0; k < 8; k++) dens.push([a[0] + (b[0] - a[0]) * k / 8, a[1] + (b[1] - a[1]) * k / 8]);
  }
  let gapCanal = Infinity, gapEn = null, recorte = 0;
  for (const [y, z] of dens) {
    const ay = Math.abs(y);
    const dy = Math.max(L.canalFijoY[0] - ay, ay - L.canalFijoY[1]);
    const dz = Math.max(L.canalFijoZ[0] - z, z - L.canalFijoZ[1]);
    // distancia con signo a la caja del canal: negativa = la banda entra en él
    const d = (dy > 0 || dz > 0) ? Math.hypot(Math.max(dy, 0), Math.max(dz, 0)) : Math.max(dy, dz);
    if (d < gapCanal) { gapCanal = d; gapEn = [r2(y), r2(z)]; }
    // cuánto habría que acortar el ala interior del canal para dejar `holguraMin`
    if (z <= L.canalFijoZ[1] && z >= L.canalFijoZ[0]) {
      recorte = Math.max(recorte, ay + L.holguraMin - L.canalFijoY[0]);
    }
  }
  gapCanal = r2(gapCanal); recorte = r2(Math.max(0, recorte));

  return {
    verificacion: {
      elementosBanda: seq.length, poleasSolidas: poleasPuestas.length,
      poleasSinSolido: sinSolido.length, poleasSinBanda: sinBanda.length,
      bandaACanal: gapCanal, bandaACanalEn: gapEn,
      holguraMinExigida: L.holguraMin, bandaACanalOK: gapCanal >= L.holguraMin,
      // si no llega: el ala interior del `Side channel` FIJO tiene que acortarse
      // esto (la trayectoria de la banda la fijan cotas medidas y no se puede mover)
      recorteAlaCanalNecesario: recorte,
    },
    banda: {
      largoDesarrollado: largo,
      largoNominal: largoBanda(serpentin(P.idlerZ), P.serpEsp),         // tensor arriba del todo
      largoMaxTension: largoBanda(serpentin(r2(P.idlerZ - P.tomaCarrera)), P.serpEsp),
      ancho: P.serpAncho, espesor: P.serpEsp, elementos: seq.length,
    },
    envolvente_grados: {
      rodillos: envRod, rodilloMin: r2(Math.min(...envRod)),
      ruedaMotriz: env[idx('rueda motriz')],
      locas: idlerY.map((y) => env[idx(`loca Y=${y}`)]),
      retorno: env[idx('retorno +Y')],
    },
    friccion: {
      mu, T1_T2_rodillo: r2(Math.exp(mu * Math.min(...envRod) * Math.PI / 180)),
      T1_T2_ruedaMotriz: r2(Math.exp(mu * env[idx('rueda motriz')] * Math.PI / 180)),
    },
    holguras_mm: {
      locaContiguas: holgura(q('loca Y=-152.4'), q('loca Y=-76.2')),
      locaRetorno: holgura(q('loca Y=-152.4'), q('retorno −Y')),
      tensorRueda: holgura(q(`loca Y=${yT}`), q('rueda motriz')),
      tensorLocaVecina: holgura(q(`loca Y=${yT}`), q('loca Y=152.4')),
      ruedaLoca: holgura(q('rueda motriz'), q('loca Y=-76.2')),
      bandaAAlma: r2(P.almaY - (P.rodY[5] + L.rodArrastre + P.serpEsp)),
      poleaAPlaca: r2(L.xPlaca - X.pol1),
      ramalRetornoZ: r2(P.retornoZ - P.retornoDia / 2 - P.serpEsp / 2),  // ≈ P.rielInfZ
      // la cara exterior de la banda sobre el rodillo queda POR DEBAJO de la
      // cara vulcanizada: el bulto nunca pisa la banda motriz
      bandaBajoVulcanizado: r2(P.rodDia / 2 - (L.rodArrastre + P.serpEsp)),
      bandaEnTuboDesnudo: [r2(X.banda0 - L.rodDesnudo[0]), r2(L.rodDesnudo[1] - X.banda1)],
    },
    cinematica: {
      rpmMotor: P.motorRpm, vBanda_m_s: r2(vBanda), vBanda_fpm: r2(vBanda * 196.85),
      diaArrastre: dArr, rpmRodillo: r2(nRod),
      vTransferencia_m_s: r2(nRod / 60 * Math.PI * P.rodDia / 1000),
      parSalida_Nm: r2(par), tiroBanda_N: r2(par / (P.ruedaDia / 2000)),
      parPorRodillo_Nm: r2(par * (dArr / P.ruedaDia) / P.nRodillos),
      empujeEnTransferencia_N: r2(par / (P.ruedaDia / 2000) * (dArr / P.rodDia)),
    },
    tensor: { zNominal: P.idlerZ, zModelado: zToma, carrera: P.tomaCarrera, colisa: `${L.colisaAncho}×${r2(P.tomaCarrera + L.colisaAncho)}` },
  };
}

export default transmision;
