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
  arcoPts, rodamiento, pernoHex, tuercaHex, golilla, anilloRet, PASO,
  COL, pulg, r2,
} from './lib.mjs';
import { P } from './params.mjs';
import { canalFijoY as CANAL_Y, canalFijoZ as CANAL_Z } from './bastidor.mjs';
import { ranuraPara, largoRanura, encaje, juntaATope, ajustesDe } from './tolerancias.mjs';

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
  // Borde inferior 128.0 (dis) y no la cota generosa de antes (124.0). Esta placa
  // es MÓVIL: **retraída** su borde baja a 118.0, y el techo del CYLINDER
  // MOUNTING CHANNEL —pieza FIJA— está en Z = 115.34 (`canalZ1` de elevacion.mjs),
  // con el labio ocupando X 114.5…131.8, que se cruza con la franja X 114.5…119.35
  // de la placa. Con 124.0 la placa se metía 1.34 mm en ese labio (1.00 cm³ en
  // B-rep) y la máquina no podía bajar; con 128.0 quedan 2.66 mm de holgura
  // retraída. Los 4 mm recortados no le hacen falta a nada de lo que cuelga: por
  // debajo de Z = 138.9 —borde de la brida Ø120 del motorreductor, que apoya
  // contra esta placa— no hay ni un taladro ni un asiento. El más bajo es el M8
  // de la brida (borde inferior 159.04) y el paso del eje de la polea de retorno
  // (borde inferior 171.04, eje en 176.6). La escotadura del notched brace
  // channel se sigue calculando a `zPlaca[0] − 8` = 120, o sea sigue abierta por
  // abajo (el larguero arranca en 143.5).
  zPlaca: [128.0, 278.0], // dis: cubre las 6 poleas, la colisa del tensor y la brida
  yPlaca: 187.0,          // dis: LÍMITE DE INTERFAZ. Por debajo de Z≈252 el `Side channel`
                          // FIJO ocupa Y 189.1…228.6 a los dos lados, así que ninguna pieza
                          // MÓVIL puede pasar de ±187 (integración, informe de interferencias).

  // --- poleas locas / retorno: eje y rodamientos --------------------------
  // CAMBIO DE EJE. P.idlerEje = 9/16" (14.29) NO tiene rodamiento de catálogo
  // (la serie R salta de R8 = 1/2" a R10 = 5/8"), así que el eje sube a 5/8".
  // Se elige la vía IMPERIAL y no la métrica (Ø15 + 6002-2RS) porque todo el
  // equipo Hytrol lo es —paso 3", banda 1", poleas 2-1/2", hex 5/16"— y el
  // propio despiece ya lista tornillo de hombro de 5/8" (042.512); la única
  // interfaz métrica del módulo es el motorreductor SEW (eje Ø20, buje 20/45).
  ejeRod: P.idlerEje,     // 15.88 — ya subido a params.mjs como `idlerEje` 5/8" g6
                          // (el 9/16" medido queda ahí como `idlerEjeMedido`)
  rodam: {                // cat: rodamiento rígido de bolas 2RS, serie R en pulgadas
    desig: 'R10-2RS', bore: P.idlerEje, od: pulg(1.375), w: pulg(0.3125),   // 15.88×34.93×7.94
    C0: 2400, C: 4400,    // N — capacidad estática / dinámica de catálogo
  },
  // Ajustes (en una polea loca el eje está QUIETO y la llanta gira):
  //   aro EXTERIOR = carga rotante  → apretado en el bore de la polea .... N7
  //   aro INTERIOR = carga estacionaria → deslizante sobre el eje ........ g6
  ajusteExt: 'N7', ajusteInt: 'g6',
  hombro: 22.0,           // dis: Ø del hombro del eje que apoya en la placa
  ribDia: 30.0,           // dis: resalte central del bore contra el que topan los dos aros ext.
  circInt: { ranura: 37.0, t: 1.5, ancho: 1.6, ri: 16.1 },  // cat DIN 472 para alojamiento Ø35
  ejeRan: 7.35,           // dis: fondo de la ranura DIN 471 del eje 5/8" (Ø14.7)
  ranAncho: 1.3,          // dis: ancho de esa ranura

  // --- pestañas laterales de guía de la banda ------------------------------
  // La banda plana se CENTRA por abombado; las pestañas son sólo TOPE de
  // seguridad, por eso llevan luz y no rozan en marcha.
  pestanaAlto: 5.0,       // dis: 2 × P.serpEsp sobre la superficie de rodadura
  pestanaEsp: 3.5,        // dis: espesor axial. Ancho total = 31.4 + 2×3.5 = 38.4, o sea
                          //      2.84 más que la polea de catálogo de 1.4" (35.56). Cabe:
                          //      centrada en P.planoSerp ocupa X 65.8…104.2, con 23.3 mm a la
                          //      placa peine (X 42.5) y 5.8 mm al alma de la guarda (X 110).
  pestanaR: 1.5,          // dis: radio del canto interior (una pestaña viva corta la banda)
  // La luz se mide entre CARAS de pestaña, pero el redondeo R1.5 se come 1.5 mm
  // de cada lado: la superficie PLANA de rodadura sólo mide luz − 2R. Con
  // luz = 28.4 la parte plana quedaba en 25.4 = el ancho exacto de la banda, o
  // sea holgura efectiva CERO y el canto de la banda apoyado justo en el
  // arranque del redondeo (eso es lo que veía el B-rep). La luz correcta es
  //   P.serpAncho + 2·holguraLateral + 2·pestanaR = 25.4 + 3 + 3 = 31.4
  luzPestanas: 31.4,      // dis
  holguraLateral: 1.5,    // dis: holgura efectiva banda ↔ arranque del redondeo, por lado

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
  // El patrón de brida SÍ es el real: Ø120 exterior + círculo de taladros Ø100 +
  // 4 × M8 es exactamente la brida normalizada IEC B14 «C120», que es la que
  // monta un RF07 con brida de 120. Lo único `dis` era suponer que la de este
  // equipo es la C120 y no la C140/C160 (§7 del catálogo: SEW no publica cuál).
  bridaCirculo: 100,      // cat IEC 60072 B14 C120
  bridaPerno: { d: 8, af: 13, hh: 5.3, largo: 20 },  // cat: M8 (la brida es métrica, como el SEW)
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
  pestanaX: [113.0, 178.0],  // dis: largo para separar los 2 pernos 28 mm y que la
                             //      golilla del primero libre la cara +X de la placa
  pestanaY: [79.0, 102.0],   // dis: dentro de la cartela, libre del espárrago del tensor
  // dis: (X, |Y|) de los 2 pernos de cada lado. Separados 28 mm: una golilla de
  // 3/8" mide Ø25.4, así que a los 14 mm de antes se solapaban entre sí y el
  // conjunto no se podía armar. 28 > 25.4 + 2 de holgura de montaje.
  // Además el primero arranca en X=134 y no en 128: con Ø25.4 de golilla, a 128
  // el borde de la golilla (115.3) se metía dentro de la propia placa (…119.35).
  pestanaPerno: [[134.0, 90.5], [162.0, 90.5]],

  // --- envolventes FIJAS con las que se verifica la banda ------------------
  // Interfaz con bastidor.mjs (informe de interferencias del ensamble integrado).
  // se importan de bastidor.mjs (abajo): la punta del ala es suya y se mueve
  canalFijoY: CANAL_Y,
  canalFijoZ: CANAL_Z,
  holguraMin: 3.0,        // txt del coordinador: ≥3 mm entre la banda y cualquier pieza FIJA
};

// posiciones derivadas en X (todas cuelgan de P.planoSerp)
const X = {
  banda0: r2(P.planoSerp - P.serpAncho / 2),      // 72.3
  banda1: r2(P.planoSerp + P.serpAncho / 2),      // 97.7
  // el ancho de la polea loca ya NO es P.idlerAncho: lo fija la luz que necesita
  // la banda entre pestañas (luz + 2 espesores). Ver L.pestanaEsp.
  pol0: r2(P.planoSerp - (L.luzPestanas + 2 * L.pestanaEsp) / 2),   // 65.8
  pol1: r2(P.planoSerp + (L.luzPestanas + 2 * L.pestanaEsp) / 2),   // 104.2
  rueda0: r2(P.planoSerp - P.ruedaAncho / 2),     // 62.5
  rueda1: r2(P.planoSerp + P.ruedaAncho / 2),     // 107.5
  placa1: r2(L.xPlaca + L.espPlaca),              // 119.35 (cara +X de la placa)
};
// reparto axial dentro del cubo de la polea loca (h medido desde X.pol0):
//   0.5 ranura DIN 472 · rodamiento A · resalte central · rodamiento B · ranura DIN 472
X.ranIntA = r2(X.pol0 + 0.5);
X.rodA0 = r2(X.ranIntA + L.circInt.ancho);
X.rodB1 = r2(X.pol1 - 0.5 - L.circInt.ancho);     // aquí topa el hombro del eje
X.rodB0 = r2(X.rodB1 - L.rodam.w);
X.ranIntB = X.rodB1;
X.eje0 = r2(X.rodA0 - 5.3);                       // punta del eje de polea loca
X.ran0 = r2(X.rodA0 - L.ranAncho);                // ranura DIN 471 que topa el aro interior A
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
/** Anillo de retención INTERIOR (DIN 472): se aloja en una ranura del bore y
 *  sobresale hacia dentro para topar el aro exterior del rodamiento. */
function anilloInt(E, { nombre, at, capa }) {
  const c = L.circInt;
  return E.addPart(`${capa}Anillo retención interior DIN 472 Ø35 ${nombre}`, COL.inox, at, [
    revolve(`Anillo DIN 472 Ø35 (t=${c.t})`, at, 'x',
      [[0, c.ri], [0, c.ranura / 2], [c.t, c.ranura / 2], [c.t, c.ri]]),
  ], { hardware: true, norma: 'DIN 472' });
}

/** Sección revolucionada de una polea loca CON PESTAÑAS de guía: llanta a
 *  Ø P.idlerDia (la que usa `bandaFaces`), dos pestañas de `pestanaAlto` con el
 *  canto interior redondeado R`pestanaR`, y el bore escalonado con resalte
 *  central y ranuras para los dos anillos DIN 472. */
function perfilPoleaLoca(w) {
  const rB = L.rodam.od / 2;                    // 17.47 — asiento del rodamiento
  const rRib = L.ribDia / 2;                    // 15    — resalte central
  const rRod = P.idlerDia / 2;                  // 31.75 — superficie de rodadura
  const rPes = r2(rRod + L.pestanaAlto);        // 36.75 — Ø exterior de la pestaña
  const t = L.pestanaEsp, R = L.pestanaR;
  const asiento = r2(L.rodam.w + L.circInt.ancho + 0.5);
  const p = [[0, rB], [0, rPes], [t, rPes], [t, r2(rRod + R)]];
  p.push(...arcoPts(t + R, rRod + R, R, Math.PI, 1.5 * Math.PI, 6));
  p.push([r2(w - t - R), rRod]);
  p.push(...arcoPts(w - t - R, rRod + R, R, 1.5 * Math.PI, 2 * Math.PI, 6));
  p.push([r2(w - t), rPes], [w, rPes], [w, rB],
    [r2(w - asiento), rB], [r2(w - asiento), rRib], [asiento, rRib], [asiento, rB]);
  return p.map((q) => [r2(q[0]), r2(q[1])]);
}

/** Eje-espárrago de una polea loca: vástago Ø9/16" en voladizo, ranura para el
 *  anillo de retención, hombro que apoya en la placa y rosca 3/8-16 con tuerca. */
function ejePolea(E, { nombre, y, z, xApoyo, xRosca, capa }) {
  const at = [X.eje0, y, z];
  return E.addPart(`${capa}Eje polea Ø5/8" g6 × ${r2(xRosca - X.eje0)} ${nombre}`, COL.acero, at, [
    cyl(`Vástago Ø${L.ejeRod} g6`, [X.eje0, y, z], [1, 0, 0], L.ejeRod, r2(X.rodB1 - X.eje0)),
    cyl(`Hombro Ø${L.hombro}`, [X.rodB1, y, z], [1, 0, 0], L.hombro, r2(xApoyo - X.rodB1)),
    cyl(`Rosca 3/8-16 × ${r2(xRosca - xApoyo)}`, [xApoyo, y, z], [1, 0, 0], B38.d, r2(xRosca - xApoyo)),
    revolve('Ranura anillo DIN 471', [X.ran0, y, z], 'x',
      [[0, L.ejeRan], [0, 10], [L.ranAncho, 10], [L.ranAncho, L.ejeRan]], 'cut'),
  ], { componente: 'eje_polea_5_8', fabricada: true,
    // DESIGNACIÓN CORREGIDA: se listaba como COMPRADA. No hay espárrago de
    // catálogo con vástago Ø5/8" g6, hombro Ø22, ranura DIN 471 y rosca 3/8-16
    // en el otro extremo: es una pieza de torno SEGÚN PLANO. El campo
    // `componente` se conserva porque es la clave de material del visor.
    ajuste: `vástago Ø${L.ejeRod} ${L.ajusteInt} (aro interior con carga estacionaria)` });
}

/** Conjunto completo de una polea loca / de retorno: llanta con pestañas +
 *  2 rodamientos R10-2RS + 2 anillos DIN 472 en el bore + eje 5/8" + anillo
 *  DIN 471 + tuerca. Devuelve el nº de piezas creadas. */
/** Registro de los sólidos de polea creados, para cotejarlos uno a uno con la
 *  secuencia de la banda (la banda se calcula de una lista y las poleas se
 *  dibujan en otra: sin este cotejo un `addPart` que falte pasa desapercibido). */
const poleasPuestas = [];

function conjuntoLoca(E, { nombre, pos, y, z, capa, tensor = false }) {
  const n0 = E.parts.length;
  poleasPuestas.push({ y, z, nombre: `${nombre} (${pos})` });
  const at = [X.pol0, y, z];
  E.addPart(`${capa}${nombre} (${pos})`, COL.polea, at, [
    revolve(`Llanta Ø${P.idlerDia}×${r2(X.pol1 - X.pol0)} c/pestañas Ø${r2(P.idlerDia + 2 * L.pestanaAlto)}, luz ${L.luzPestanas}`,
      at, 'x', perfilPoleaLoca(r2(X.pol1 - X.pol0))),
    revolve(`Ranura DIN 472 exterior (${L.circInt.ranura}×${L.circInt.ancho})`, [X.ranIntA, y, z], 'x',
      [[0, r2(L.rodam.od / 2)], [0, r2(L.circInt.ranura / 2)],
        [L.circInt.ancho, r2(L.circInt.ranura / 2)], [L.circInt.ancho, r2(L.rodam.od / 2)]], 'cut'),
    revolve(`Ranura DIN 472 interior (${L.circInt.ranura}×${L.circInt.ancho})`, [X.ranIntB, y, z], 'x',
      [[0, r2(L.rodam.od / 2)], [0, r2(L.circInt.ranura / 2)],
        [L.circInt.ancho, r2(L.circInt.ranura / 2)], [L.circInt.ancho, r2(L.rodam.od / 2)]], 'cut'),
  ], { componente: 'polea_loca_flanged_2_5', extra_ajuste: L.ajusteExt,
    // DESIGNACIÓN CORREGIDA. Se listaba como COMPRADA y no lo es: la de catálogo
    // (Hytrol 923.00975 «FLAT BELT IDLER - 2-3/4 in. DIA. X 1.4 in. WIDE») es lisa
    // y de Ø2-3/4"; ésta es Ø2-1/2" con pestañas Ø73.5, alojamientos N7 para dos
    // R10-2RS y ranuras DIN 472. Es una pieza SEGÚN PLANO. El campo `componente`
    // se conserva porque es la clave con la que el visor le asigna material.
    fabricada: true,
    catalogo: 'derivada de Hytrol 923.00975; ya NO es de catálogo (Ø2-1/2" c/pestañas)',
    ajuste: `alojamiento Ø${pulg(1.375)} ${L.ajusteExt} (aro exterior con carga rotante)` });
  for (const [i, x] of [X.rodA0, X.rodB0].entries()) {
    rodamiento(E, {
      nombre: `${L.rodam.desig} (${pos}, ${i ? 'interior' : 'exterior'})`,
      at: [x, y, z], dir: [1, 0, 0], bore: L.rodam.bore, od: L.rodam.od, w: L.rodam.w, capa,
    });
  }
  for (const [i, x] of [X.ranIntA, X.ranIntB].entries()) {
    anilloInt(E, { nombre: `(${pos}, ${i ? 'interior' : 'exterior'})`, at: [x, y, z], capa });
  }
  ejePolea(E, {
    nombre: `(${pos})`, y, z, capa,
    xApoyo: tensor ? X.pad0 : L.xPlaca, xRosca: tensor ? X.roscaT : X.rosca1,
  });
  anilloRet(E, { nombre: `eje polea (${pos})`, at: [r2(X.ran0 + 0.05), y, z], dir: [1, 0, 0], eje: L.ejeRod, capa });
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
  const anchoPest = r2(L.pestanaY[1] - L.pestanaY[0]);      // 23 — ancho en Y de la pestaña
  const yPest = r2((L.pestanaY[0] + L.pestanaY[1]) / 2);    // 90.5 — su centro en Y
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
    // AJ-08: el centraje de una brida IEC es un ajuste, no un agujero de paso.
    // Estaba a Ø60.4 (0.4 mm de juego diametral): con eso la brida entra pero no
    // centra, y el eje del motor puede irse 0.2 mm respecto del barreno de la
    // rueda motriz. Pasa a Ø60 H8 sobre el resalte h8 del SEW (juego 0…0.092 mm);
    // el sólido se dibuja con 0.1 de juego para que las dos piezas no compartan
    // superficie y el B-rep no lo lea como contacto.
    hole(`Centraje brida motorreductor Ø${L.bridaCentraje} H8`,
      [r2(L.xPlaca - 0.5), 0, P.motrizZ], [1, 0, 0], r2(L.bridaCentraje + 0.1)),
    sketchYZ(`Colisa tensor ${L.colisaAncho}×${r2(P.tomaCarrera + L.colisaAncho)} (recorrido ${P.tomaCarrera})`,
      r2(X.placa1 + 0.65), colisa(P.bandaY[P.tomaIdlerIdx], zToma, r2(P.tomaCarrera + L.colisaAncho), L.colisaAncho, true),
      14, 'cut'));
  for (const s of [-1, 1]) for (const s2 of [-1, 1]) {
    fPlaca.push(hole(`Taladro brida motorreductor M8 Ø${PASO.M8}`,
      [r2(L.xPlaca - 0.5), r2(s * L.bridaCirculo / Math.SQRT2 / 2), r2(P.motrizZ + s2 * L.bridaCirculo / Math.SQRT2 / 2)],
      [1, 0, 0], PASO.M8));
  }
  // ENCAJE U6 — las pestañas de apoyo no se posan sobre la placa: la ATRAVIESAN
  // por una ranura, y se sueldan por las dos caras. Es una lengüeta pasante de
  // libro, y además es la única forma de que la pestaña quede a cota sin trazar:
  // la ranura la sitúa en Y y en Z. La escotadura del notched brace channel ya
  // abre la placa hasta Z = braceZ, así que la ranura es una MUESCA abierta por
  // abajo: la pestaña entra desde abajo y topa contra el canto superior.
  const ranPest = ranuraPara('1/4');                       // 6.9 · holgura 0.10…0.43 por lado
  const largoPest = largoRanura(anchoPest, 'posicion');    // 23.8 · holgura 0.20…0.60
  for (const sg of [-1, 1]) {
    fPlaca.push(sketchYZ(`Ranura pasante de la pestaña ${largoPest.largo}×${ranPest.ancho} (${sg > 0 ? '+Y' : '−Y'})`,
      r2(X.placa1 + 0.65),
      rectR(r2(sg * yPest - largoPest.largo / 2), r2(L.asientoZ - (ranPest.ancho - L.espPlaca) / 2),
        r2(sg * yPest + largoPest.largo / 2), r2(L.asientoZ + L.espPlaca + (ranPest.ancho - L.espPlaca) / 2), 0),
      14, 'cut'));
  }
  // pestañas de apoyo: se añaden DESPUÉS de las escotaduras y de su propia ranura
  // (si no, los cortes se las llevarían por delante).
  for (const sg of [-1, 1]) {
    fPlaca.push(box(`Pestaña de apoyo sobre cartela ${sg > 0 ? '+Y' : '−Y'} 1/4"×${r2(L.pestanaX[1] - L.pestanaX[0])}×${anchoPest}`,
      [r2((L.pestanaX[0] + L.pestanaX[1]) / 2), r2(sg * yPest), L.asientoZ],
      r2(L.pestanaX[1] - L.pestanaX[0]), anchoPest, L.espPlaca));
  }
  for (const sg of [-1, 1]) for (const [px, py] of L.pestanaPerno) {
    fPlaca.push(hole(`Taladro pestaña Ø${r2(B38.d + P.holgura.pasante)} (${sg > 0 ? '+Y' : '−Y'}, X=${px})`,
      [px, r2(sg * py), r2(L.asientoZ + L.espPlaca + 0.5)], [0, 0, -1], r2(B38.d + P.holgura.pasante), 9, false));
  }
  E.addPart(`${cap}Placa soporte de transmisión 1/4"×${r2(2 * L.yPlaca)}×${r2(L.zPlaca[1] - L.zPlaca[0])} c/colisa tensor (weldment)`,
    COL.movil, [L.xPlaca, 0, L.zPlaca[0]], fPlaca, {
      weldment: true,
      encajes: [-1, 1].flatMap((sg) => [
        encaje({ id: `U6-pestana-${sg > 0 ? '+Y' : '-Y'}`, union: 'Pestaña de apoyo ↔ Placa soporte de transmisión',
          tipo: 'lengueta', rol: 'posicion', lado: 'ambos', gdl: ['Y', 'Z'],
          lengueta: { calibre: '1/4', t: L.espPlaca, ancho: anchoPest, sale: L.espPlaca },
          ranura: { ancho: ranPest.ancho, largo: largoPest.largo },
          nota: `lengüeta PASANTE soldada por las dos caras. ${ranPest.cadena}. La ranura queda `
            + 'abierta por abajo (se junta con la escotadura del notched brace channel), así que la '
            + 'pestaña entra desde abajo y topa contra el canto superior.' }),
      ]).concat([
        juntaATope({ id: 'U6-doblador', union: 'Doblador de la colisa ↔ Placa soporte de transmisión',
          motivo: 'solape de dos chapas de 1/4" PARALELAS de 32.4 × 87 mm atravesadas por la colisa '
            + 'del tensor (12.7 × 61.3): no queda sitio para un taladro de pasador con la distancia '
            + 'al canto que pide un 1/4" (≥ 9.5 mm desde el borde del agujero). Se declara a tope.',
          posicionamiento: 'las dos colisas se cortan en la misma pieza plegada y se alinean con un '
            + 'CALIBRE PASA Ø12.7 h9 metido en las dos antes de puntear; coaxialidad exigida ≤ 0.2 mm',
          referencia: 'cara −X de la placa soporte y flanco de la colisa' }),
      ]),
    });

  // =============================================== 2. BANDA PLANA DEL SERPENTÍN
  // `bandaFaces` falla si algún tramo no tiene tangente: que cierre es la
  // comprobación de que las 13 envolturas son compatibles entre sí.
  // n = 26 puntos por arco: la flecha de la poligonal queda en 0.06 mm, de modo
  // que la banda apoya sobre la llanta sin morderla por efecto de la faceta.
  const largo = largoBanda(seq, P.serpEsp);
  const env = envolventes(seq, P.serpEsp);
  // La poligonal de `bandaFaces` va INSCRITA en cada circunferencia: sus puntos
  // caen sobre el círculo y el lado se mete hacia dentro la flecha
  //     f = r·(1 − cos(paso/2)),   paso = envolvente / nArco
  // Con nArco = 26 eso son 0.064 mm que se comen la llanta de TODAS las poleas
  // envueltas (por eso el B-rep acusaba contacto incluso en la rueda motriz, que
  // no tiene pestañas). Se compensa levantando cada radio esa misma flecha, con
  // lo que la poligonal pasa a estar CIRCUNSCRITA: toca el círculo en el punto
  // medio de cada lado y no lo penetra en ningún sitio. El desvío es de 0.06 mm
  // y no altera ni el largo ni las envolventes, que se calculan con `seq` real.
  const nArco = 26;
  const flecha = seq.map((s, i) => r2(s.r * (1 - Math.cos(env[i] * Math.PI / 180 / nArco / 2))));
  const seqFacetas = seq.map((s, i) => ({ c: s.c, r: s.r + flecha[i], s: s.s }));
  const caras = bandaFaces(seqFacetas, P.serpEsp, nArco);
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
        ? 'Polea loca banda plana Ø2-1/2"×1.4" c/pestañas Ø73.5 TAKE-UP IDLER'
        : 'Polea loca banda plana Ø2-1/2"×1.4" c/pestañas Ø73.5',
      pos: `Y=${y}`, y, z: tensor ? zToma : P.idlerZ, capa: cap, tensor,
    });
  }

  const yT = P.bandaY[P.tomaIdlerIdx];

  // =========================================== 4. POLEAS DE RETORNO (2 ud)
  for (const sg of [-1, 1]) {
    conjuntoLoca(E, {
      nombre: 'Polea de retorno banda plana Ø2-1/2"×1.4" c/pestañas Ø73.5',
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
      // M8 y no 3/8": la brida del SEW es IEC B14 C120, o sea métrica.
      // El vástago entra en el cuerpo del motorreductor, que se modela MACIZO
      // (sin sus taladros roscados), igual que el resto de piezas compradas:
      // ese solape de 4 × ~0.4 cm³ es convención declarada, no interferencia.
      nombre: `M8 × ${L.bridaPerno.largo} brida motorreductor IEC B14 C120 (${s > 0 ? '+Y' : '−Y'}${s2 > 0 ? '+Z' : '−Z'})`,
      at: [L.xPlaca, r2(s * L.bridaCirculo / Math.SQRT2 / 2), r2(P.motrizZ + s2 * L.bridaCirculo / Math.SQRT2 / 2)],
      dir: [1, 0, 0], dia: L.bridaPerno.d, largo: L.bridaPerno.largo,
      af: L.bridaPerno.af, altoCab: L.bridaPerno.hh, capa: cap,
    });
  }

  // ================================ 7. FIJACIÓN DE LA PLACA AL BASTIDOR MÓVIL
  // La pestaña apoya sobre el ala de la cartela del larguero (MÓVIL) y el perno
  // entra desde ARRIBA, que es por donde hay acceso de llave.
  //
  // Sin tuerca suelta: el ala es de 12 GA (2.66) y por debajo queda el hueco
  // ciego del canal, donde no entra una llave para sujetar la tuerca. La rosca
  // la pone una TUERCA REMACHABLE (self-clinching) montada en la cartela, que
  // es pieza de `bastidor.mjs`; por eso aquí sólo van perno y golilla.
  // Lo que le falta a la cartela para cerrar la unión son 4 taladros Ø11.13 en
  // (X=134, Y=±90.5) y (X=162, Y=±90.5) con su tuerca remachable.
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

  // --- las pestañas Ø73.5 crecen 5 mm sobre la llanta: hay que rehacer la
  //     holgura de CADA polea con pestañas a la misma envolvente FIJA.
  const rPes = P.idlerDia / 2 + L.pestanaAlto;
  let gapPes = Infinity, gapPesEn = null;
  for (const s of seq) {
    if (s.n.startsWith('rodillo') || s.n === 'rueda motriz') continue;   // sin pestañas
    for (let k = 0; k <= 720; k++) {
      const a = k * Math.PI / 360;
      const y = Math.abs(s.c[0] + rPes * Math.cos(a)), z = s.c[1] + rPes * Math.sin(a);
      const dy = Math.max(L.canalFijoY[0] - y, y - L.canalFijoY[1]);
      const dz = Math.max(L.canalFijoZ[0] - z, z - L.canalFijoZ[1]);
      const d = (dy > 0 || dz > 0) ? Math.hypot(Math.max(dy, 0), Math.max(dz, 0)) : Math.max(dy, dz);
      if (d < gapPes) { gapPes = d; gapPesEn = [s.n, r2(y), r2(z)]; }
      if (z <= L.canalFijoZ[1] && z >= L.canalFijoZ[0]) recorte = Math.max(recorte, y + L.holguraMin - L.canalFijoY[0]);
    }
  }
  gapPes = r2(gapPes); recorte = r2(Math.max(0, recorte));

  return {
    verificacion: {
      elementosBanda: seq.length, poleasSolidas: poleasPuestas.length,
      poleasSinSolido: sinSolido.length, poleasSinBanda: sinBanda.length,
      bandaACanal: gapCanal, bandaACanalEn: gapEn,
      holguraMinExigida: L.holguraMin, bandaACanalOK: gapCanal >= L.holguraMin,
      // si no llega: el ala interior del `Side channel` FIJO tiene que acortarse
      // esto (la trayectoria de la banda la fijan cotas medidas y no se puede mover)
      recorteAlaCanalNecesario: recorte,
      pestanaACanal: gapPes, pestanaACanalEn: gapPesEn,
      pestanaACanalOK: gapPes >= L.holguraMin,
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
    // --- rodamientos de las 6 poleas locas (la rueda motriz va sobre el buje) ---
    rodamientos: (() => {
      const rP = L.pestanaAlto, T2 = 150;            // dis: tensión de montaje del ramal flojo
      const T1 = r2(par / (P.ruedaDia / 2000) + T2);  // ramal tenso
      const carga = r2((T1 + T2) / 2);                // N por rodamiento (envolvente ≈ 190°)
      return {
        designacion: L.rodam.desig, cantidadPorPolea: 2, total: 12,
        medidas: `${L.rodam.bore}×${L.rodam.od}×${L.rodam.w}`,
        ejeMedidoEnPlano: P.idlerEjeMedido, ejeAdoptado: L.ejeRod,   // 14.29 (9/16") → 15.88 (5/8")
        ajusteAroExterior: `${L.ajusteExt} — carga ROTANTE (gira la llanta)`,
        ajusteAroInterior: `${L.ajusteInt} — carga ESTACIONARIA (el eje está quieto)`,
        retencionAxial: 'aros ext.: resalte Ø30 del bore + 2 anillos DIN 472 Ø35 · '
          + 'aros int.: hombro Ø22 del eje + anillo DIN 471 Ø5/8"',
        paredLlantaBajoRodamiento: r2(P.idlerDia / 2 - L.rodam.od / 2),   // ≥4 exigido
        paredBajoPestana: r2(P.idlerDia / 2 + rP - L.rodam.od / 2),
        cargaPorRodamiento_N: carga, C0_N: L.rodam.C0,
        coefSeguridadEstatico: r2(L.rodam.C0 / carga),
      };
    })(),
    pestanas: {
      alto: L.pestanaAlto, espesor: L.pestanaEsp, radioCanto: L.pestanaR,
      luz: L.luzPestanas,
      // La holgura que importa NO es a la cara de la pestaña sino al ARRANQUE
      // del redondeo R1.5, donde la llanta deja de ser cilíndrica: ahí es donde
      // el B-rep detectaba el contacto. Ambas se calculan del propio perfil.
      anchoPlanoRodadura: r2(L.luzPestanas - 2 * L.pestanaR),
      holguraBandaACara: r2((L.luzPestanas - P.serpAncho) / 2),
      holguraBandaAPlano: r2((L.luzPestanas - 2 * L.pestanaR - P.serpAncho) / 2),
      planoRodaduraX: [r2(X.pol0 + L.pestanaEsp + L.pestanaR), r2(X.pol1 - L.pestanaEsp - L.pestanaR)],
      odConPestanas: r2(P.idlerDia + 2 * L.pestanaAlto),
      anchoPoleaAntes: P.idlerAncho, anchoPoleaDespues: r2(L.luzPestanas + 2 * L.pestanaEsp),
      // las pestañas ocupan X 67.2…70.78 y 99.22…102.8 y la banda X 72.3…97.7:
      // no comparten X en ningún punto, así que ninguna banda puede tocar la
      // pestaña de una polea vecina; el único contacto posible es el tope lateral.
      pestanaX: [[X.pol0, r2(X.pol0 + L.pestanaEsp)], [r2(X.pol1 - L.pestanaEsp), X.pol1]],
      bandaX: [X.banda0, X.banda1],
      pestanaSobreDorsoBanda: r2(L.pestanaAlto - P.serpEsp),
      abombado: 'las locas son CILÍNDRICAS (nunca tuvieron abombado); el centrado lo da el '
        + `abombado de ${L.ruedaCorona} mm de la rueda motriz, que se mantiene. Las pestañas sólo topan.`,
    },
    holguras_mm: {
      locaContiguas: holgura(q('loca Y=-152.4'), q('loca Y=-76.2')),
      // con pestañas Ø73.5 la holgura crítica ya no es entre llantas sino entre pestañas
      pestanasContiguas: r2(P.paso - 2 * (P.idlerDia / 2 + L.pestanaAlto)),
      pestanaARetorno: r2(Math.hypot(P.bandaY[4] - P.retornoY, P.idlerZ - P.retornoZ) - 2 * (P.idlerDia / 2 + L.pestanaAlto)),
      pestanaARueda: r2(Math.hypot(P.bandaY[P.tomaIdlerIdx], zToma - P.motrizZ) - (P.idlerDia / 2 + L.pestanaAlto) - P.ruedaDia / 2),
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
