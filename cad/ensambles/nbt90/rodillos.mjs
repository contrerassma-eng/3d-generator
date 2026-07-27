// rodillos.mjs — RODILLOS EMERGENTES de la transferencia 90° de bandas angostas
// (NBT90, Hytrol ProSort MRT 90° Transfer) + las bandas del clasificador
// anfitrión entre las que emergen, modeladas como CONTEXTO verificable.
//
// Contenido (contrato §6):
//   MÓVIL    6 × SA-036881 «VULCANIZED 138 ROLLER ASSEMBLY»: tubo de acero con
//            cubierta vulcanizada hasta Ø1-3/8", eje hexagonal 5/16" pasante,
//            2 rodamientos por rodillo con su tapa-soporte de extremo y los
//            anillos de retención del eje en las placas peine.
//   CONTEXTO 5 bandas angostas de 1" del anfitrión (ramal portante + retorno) y
//            sus regletas de desgaste UHMW de 1-1/4". No son parte del equipo:
//            están para comprobar que los rodillos emergen y se retraen limpios.
//
// Ejes (contrato §1): X = eje de los rodillos · Y = expulsión a 90° · Z = arriba.
// Estado modelado: ELEVADO (la carrera de 10 mm ya aplicada en P.rodZ).
//
// ---------------------------------------------------------------------------
// NOTA DE COHERENCIA sobre el diámetro del tubo (se declara, no se maquilla)
// ---------------------------------------------------------------------------
// `P.rodTubo` (1.19" = 30.23, procedencia `dis`) es incompatible con el par
// `P.rodDia` (34.93, procedencia med+cat: SA-036881 «138» = Ø1-3/8", error
// 0.03 %) y `P.rodVulcE` (3.0, `dis`):  30.23 + 2×3 = 36.23 ≠ 34.93.
// Manda `P.rodDia`, porque de él cuelga la cota funcional del equipo (la
// emergencia de 1/4" sobre el plano de bandas, que verifica el gate). Se toma
// por tanto  tubo = P.rodDia − 2·P.rodVulcE = 28.93  y vulcanizado de espesor
// CONSTANTE 3.0 mm. Efecto lateral favorable y buscado: en el tramo desnudo el
// serpentín (2.5 mm) queda 0.50 mm POR DEBAJO de la cara vulcanizada, así que
// el bulto nunca pisa la banda motriz. `params.mjs` NO se toca (contrato §2).

import { Ensamble, revolve, sketchYZ, box, rodamiento, anilloRet, hexPts, COL, r2 } from './lib.mjs';
import { P } from './params.mjs';
// Interfaz con el bastidor: él es dueño de las placas peine, así que él fija
// dónde pueden ir los anillos del eje (fuera del espesor de la placa). Se
// importa el valor, no se copia: si mueve las placas, esto lo sigue solo.
import { anilloRetX } from './bastidor.mjs';

// ---------------------------------------------------------------------------
// Cotas locales de este módulo (justificación: med / cat / txt / dis)
// ---------------------------------------------------------------------------
const L = {
  // -- cuerpo del rodillo ----------------------------------------------------
  tuboOD: P.rodDia - 2 * P.rodVulcE,                     // 28.93 · dis (ver nota)
  tuboID: P.rodDia - 2 * P.rodVulcE - 2 * P.rodPared,    // 25.93 · dis (pared 16 GA)
  tuboChaflan: 0.5,          // dis: entrada de la tapa a presión
  vulcChaflan: 1.5,          // dis: canto de la goma matado a 45°, no despega
  vulcRetiro: 3.0,           // dis: la goma se rebaja 3 mm de cada testa para que
                             //      no roce la placa peine (cara vulcanizada 369)
  desnudaHolgura: 2.0,       // dis: sobreancho del tramo desnudo por lado, para la
                             //      deriva de la banda plana (tracking)

  // -- tapa-soporte de extremo (aloja el rodamiento) -------------------------
  tapaL: 11.0,               // dis
  tapaLabio: 2.0,            // dis: labio exterior = tope axial del aro exterior
  tapaLabioD: 20.0,          // dis: Ø del labio (apoya 1 mm sobre el aro exterior)
  tapaChaflan: 0.8,          // dis: chaflán de introducción a presión en el tubo

  // -- eje hexagonal ---------------------------------------------------------
  ejeRot: Math.PI / 6,       // med: el hexágono se dibuja con VÉRTICES arriba/abajo
                             //      (vista izq.: 13.5 px entre caras en corte por
                             //      fila) → las dos caras verticales guían en la
                             //      ranura en U de la placa peine
  ejeLargo: 410,             // dis: llega a 26.5…436.5, o sea 8.42 mm de barra por
                             //      fuera de cada garganta (6.2 de hexágono entero
                             //      tras el chaflán). Mínimo impuesto por los
                             //      anillos del bastidor: arrancar antes de 34.92
                             //      y terminar después de 428.08.
  ranuraD: 6.8,              // dis: garganta torneada para el anillo DIN 471 de Ø8
                             //      (6.8 < 7.94 entre caras ⇒ es un círculo completo)
  ranuraW: 1.2,              // dis: ancho de garganta = 1.2 × espesor del anillo
  anilloT: 1.0,              // cat: espesor del anillo DIN 471 de Ø8 (el que dibuja lib)
  ejeChaflan: 2.2,           // dis: matado de las puntas del hexágono a 45°

  // -- interfaz con bastidor.mjs (NO define nada: lo lee) --------------------
  placaPeineX: [40.1, 422.9],  // planos medios de las placas peine, tal como las
                               // sitúa bastidor.mjs (L.placaXa / L.placaXb): sus
                               // caras interiores en 42.48 y 420.52 dejan al tubo
                               // (X 44…419) 1.52 mm de juego axial por lado.
                               // Las ranuras en U reciben el hexágono con las
                               // CARAS VERTICALES, que es como se modela aquí.
};

// Radios de trabajo (todo lo demás se deriva de P).
const RO = L.tuboOD / 2;               // 14.465 — acero desnudo (arrastre)
const RI = L.tuboID / 2;               // 12.965 — interior del tubo
const RV = P.rodDia / 2;               // 17.4625 — cara vulcanizada
const RB = P.rodRodam.od / 2;          // 11.0 — asiento del rodamiento
const BOND = 0.1;                      // solape goma↔tubo (línea de vulcanizado)
const DIR = [1, 0, 0];                 // todos los ejes son paralelos a +X
const c2 = (v) => Math.round(v * 100 + 1e-9) / 100;   // rótulos: 34.925 → 34.93

// Tramo DESNUDO de arrastre: donde corre el serpentín de banda plana de 1".
const SERP0 = r2(P.planoSerp - P.serpAncho / 2 - L.desnudaHolgura);   // 70.3
const SERP1 = r2(P.planoSerp + P.serpAncho / 2 + L.desnudaHolgura);   // 99.7

// Caras de las placas peine (interior / exterior) y juego axial resultante.
const PEINE_INT = [r2(L.placaPeineX[0] + P.placaT / 2), r2(L.placaPeineX[1] - P.placaT / 2)];
const PEINE_EXT = [r2(L.placaPeineX[0] - P.placaT / 2), r2(L.placaPeineX[1] + P.placaT / 2)];

// Eje hexagonal: pasante, centrado en la cara del rodillo.
const EJE_X0 = r2((P.rodX0 + P.rodX1 - L.ejeLargo) / 2);              // 31.5
const EJE_X1 = r2(EJE_X0 + L.ejeLargo);                               // 431.5

// Anillos de retención: `anilloRetX` (de bastidor.mjs) es el PLANO DE ASIENTO
// de cada anillo, o sea la cara del anillo que mira a su placa peine. El anillo
// del lado motriz crece hacia +X, así que arranca un espesor antes.
const AN_X = [r2(anilloRetX[0] - L.anilloT), r2(anilloRetX[1])];
const RAN_X = AN_X.map((x) => r2(x - (L.ranuraW - L.anilloT) / 2));   // garganta centrada
// Juego axial del eje = lo que le dejan los dos anillos contra las caras
// exteriores de las placas peine (bastidor: 1.7 mm por lado).
const JUEGO_EJE = r2((anilloRetX[1] - anilloRetX[0]) - (PEINE_EXT[1] - PEINE_EXT[0]));

/** Cotas que necesita transmision.mjs: el serpentín se apoya en el ACERO
 *  desnudo (no en la goma), y ese es el radio que abraza. */
export const bandaDesnudaX = [SERP0, SERP1];
export const radioArrastre = r2(RO);

// ---------------------------------------------------------------------------
// Perfiles de revolución  ([h a lo largo del eje, r radial])
// ---------------------------------------------------------------------------
const espejo = (perfil, len) => perfil.map(([h, r]) => [r2(len - h), r]);

/** Tubo de acero, con chaflán de entrada en las dos bocas. */
const perfilTubo = (len) => {
  const c = L.tuboChaflan;
  return [[0, RI + c], [c, RI], [len - c, RI], [len, RI + c], [len, RO], [0, RO]];
};

/** Cubierta vulcanizada de espesor constante, cantos a 45°. */
const perfilVulc = (len) => {
  const c = L.vulcChaflan;
  return [[0, RO - BOND], [0, RV - c], [c, RV], [len - c, RV], [len, RV - c], [len, RO - BOND]];
};

/** Tapa-soporte de extremo: se prensa en el tubo (Ø25.93) y aloja el
 *  rodamiento contra un HOMBRO (labio Ø20) que hace de tope axial. h = 0 en la
 *  testa del tubo; el rodamiento entra desde dentro y topa en h = tapaLabio. */
const perfilTapa = () => {
  const c = L.tapaChaflan, Lt = L.tapaL;
  return [
    [0, L.tapaLabioD / 2],          // labio: bore Ø20 en la testa
    [0, RI],                        // testa de la tapa (a ras del tubo)
    [Lt - c, RI],                   // Ø exterior = ID del tubo (ajuste prensado)
    [Lt, RI - c],                   // chaflán de introducción
    [Lt, RB + 0.5],
    [Lt - 0.5, RB],                 // entrada del alojamiento del rodamiento
    [L.tapaLabio, RB],              // asiento Ø22 (largo = ancho del rodamiento + 1.5)
    [L.tapaLabio, L.tapaLabioD / 2],  // HOMBRO: tope axial del aro exterior
  ];
};

/** Garganta del anillo de retención (corte de revolución en la barra hexagonal). */
const perfilRanura = () => [[0, L.ranuraD / 2], [0, 6], [L.ranuraW, 6], [L.ranuraW, L.ranuraD / 2]];

/** Chaflán de punta del hexágono (corte de revolución a 45°). */
const perfilPunta = () => [[0, 3.8], [0, 6], [L.ejeChaflan, 6]];

// ---------------------------------------------------------------------------
// Módulo
// ---------------------------------------------------------------------------
/** @param {Ensamble} E  ensamble compartido
 *  @returns {object} métricas del módulo (las lee el gate de gen_nbt90.mjs) */
export function rodillos(E) {
  const n = { rodillos: 0, ejes: 0, tapas: 0, rodamientos: 0, anillos: 0, bandas: 0, regletas: 0 };
  const Z = P.rodZ;                                    // 379.49 — estado ELEVADO
  const larguraVulcA = r2(SERP0 - (P.rodX0 + L.vulcRetiro));    // 23.3
  const larguraVulcB = r2((P.rodX1 - L.vulcRetiro) - SERP1);    // 316.3

  // =========================================================================
  // 1. Los seis rodillos vulcanizados (MÓVIL: suben P.carrera con el pop-up)
  // =========================================================================
  P.rodY.forEach((Y, i) => {
    const ln = `línea ${i + 1}, Y=${Y}`;
    const conj = { componente: 'SA-036881', conjunto: 'SA-036881 VULCANIZED 138 ROLLER ASSEMBLY' };

    // --- 1.1 cuerpo: tubo de acero + DOS bandas vulcanizadas ---------------
    // El tramo central (X 70.3…99.7) va sin goma: es la superficie de arrastre
    // por fricción del serpentín. Son tres revoluciones distintas, no un truco
    // de color: el tubo cambia de Ø34.93 (goma) a Ø28.93 (acero) y por eso la
    // banda motriz queda enrasada bajo la cara de transporte.
    E.addPart(`MÓVIL · Rodillo vulcanizado Ø1-3/8" × ${P.rodCara} (${ln})`, COL.rodillo,
      [P.rodX0, Y, Z], [
        revolve(`Tubo de acero Ø${c2(L.tuboOD)} × ${P.rodCara} (pared ${P.rodPared})`,
          [P.rodX0, Y, Z], 'x', perfilTubo(P.rodCara)),
        revolve(`Vulcanizado e=${P.rodVulcE} → Ø${c2(P.rodDia)} (tramo motriz, ${larguraVulcA})`,
          [r2(P.rodX0 + L.vulcRetiro), Y, Z], 'x', perfilVulc(larguraVulcA)),
        revolve(`Vulcanizado e=${P.rodVulcE} → Ø${c2(P.rodDia)} (tramo de carga, ${larguraVulcB})`,
          [SERP1, Y, Z], 'x', perfilVulc(larguraVulcB)),
      ], { ...conj, capa: 'web+user', nota: `tramo desnudo de arrastre X ${SERP0}…${SERP1}` });
    n.rodillos++;

    // --- 1.2 eje hexagonal 5/16" pasante ----------------------------------
    // NO GIRA: se apoya por sus dos caras verticales en las ranuras en U de las
    // placas peine (planos medios X = 40.1 y 422.9) y sobresale 17.5 mm de cada
    // testa del tubo. JUEGO AXIAL — lo exige el manual (pág. 8): «the drive
    // rollers must be removed … by pushing one side of the hex axle through the
    // transfer support channel». Cotas de ese desmontaje sobre este modelo:
    //   · en marcha el eje flota 3.40 mm entre anillos (1.7 por lado, según el
    //     `anilloRetX` del bastidor); va con el juego del propio tubo entre
    //     placas (3.04 mm) y no deja que el hexágono salte de su ranura;
    //   · quitando UN anillo, el eje corre 15.98 mm (= 42.48 − 26.50) hasta que
    //     su punta libera la ranura en U de la placa peine opuesta;
    //   · la punta contraria llega entonces a X = 452.5, dentro del paso libre
    //     que el bastidor deja a ese lado (425.3…463). Cabe.
    E.addPart(`MÓVIL · Eje hexagonal 5/16" × ${L.ejeLargo} (${ln})`, COL.acero,
      [EJE_X0, Y, Z], [
        sketchYZ(`Barra hexagonal e/c ${r2(P.rodHex)} × ${L.ejeLargo}`, EJE_X0,
          hexPts(Y, Z, P.rodHex, L.ejeRot), L.ejeLargo),
        revolve(`Chaflán de punta ${L.ejeChaflan}×45° (−X)`, [EJE_X0, Y, Z], 'x',
          perfilPunta(), 'cut'),
        revolve(`Chaflán de punta ${L.ejeChaflan}×45° (+X)`, [r2(EJE_X1 - L.ejeChaflan), Y, Z], 'x',
          espejo(perfilPunta(), L.ejeChaflan), 'cut'),
        ...[0, 1].map((s) => revolve(`Garganta anillo Ø${L.ranuraD} × ${L.ranuraW} (${s ? '+X' : '−X'})`,
          [RAN_X[s], Y, Z], 'x', perfilRanura(), 'cut')),
      ], { ...conj, material: 'acero estirado hexagonal 5/16"', gira: false });
    n.ejes++;

    // --- 1.3 tapas-soporte, rodamientos y retención -----------------------
    for (const s of [0, 1]) {
      const lado = s === 0 ? 'motriz' : 'libre';
      const xTapa = s === 0 ? P.rodX0 : r2(P.rodX1 - L.tapaL);
      // tapa prensada en la testa del tubo (a ras), con hombro para el rodamiento
      E.addPart(`MÓVIL · Tapa-soporte de extremo Ø${c2(L.tuboID)}/Ø${P.rodRodam.od} × ${L.tapaL} (${ln}, ${lado})`,
        COL.rodillo, [xTapa, Y, Z], [
          revolve(`Alojamiento Ø${P.rodRodam.od} con hombro Ø${L.tapaLabioD}`, [xTapa, Y, Z], 'x',
            s === 0 ? perfilTapa() : espejo(perfilTapa(), L.tapaL)),
        ], { ...conj, ajuste: `prensado H7/r6 en el tubo Ø${c2(L.tuboID)}` });
      n.tapas++;

      // rodamiento asentado contra el hombro (el aro interior es de bore HEXAGONAL
      // de 5/16" — nominal Ø8 —, por eso el eje no gira y el tubo sí)
      const xRodam = s === 0 ? r2(P.rodX0 + L.tapaLabio)
        : r2(P.rodX1 - L.tapaLabio - P.rodRodam.w);
      rodamiento(E, {
        nombre: `608-2RS bore hex 5/16" (${ln}, ${lado})`, at: [xRodam, Y, Z], dir: DIR,
        ...P.rodRodam, capa: 'MÓVIL · ',
      });
      n.rodamientos++;

      // anillo de retención del EJE contra la cara exterior de la placa peine:
      // su Ø12.8 no pasa por la ranura en U (ancho ≈ e/c 7.94), así que el
      // hexágono no se sale en marcha; y es la pieza que se quita para extraer
      // el eje (procedimiento del manual, pág. 8).
      anilloRet(E, {
        nombre: `eje rodillo (${ln}, ${lado})`, at: [AN_X[s], Y, Z], dir: DIR, eje: 8, capa: 'MÓVIL · ',
      });
      n.anillos++;
    }
  });

  // =========================================================================
  // 2. CONTEXTO — el clasificador anfitrión (no es parte de la transferencia)
  // =========================================================================
  // Sirve para una sola cosa: comprobar que el rodillo emerge y se retrae entre
  // las bandas sin tocarlas. Van con extra.contexto = true, así el gate de
  // gen_nbt90.mjs las excluye del recuento y de la envolvente del módulo.
  const zPortante = r2(P.planoBanda - P.bandaEsp);           // cara inferior del portante
  const zRetorno = r2(P.planoBanda - P.bandaRetornoDZ - P.bandaEsp);
  const zRegleta = r2(zPortante - P.regletaEsp);

  P.bandaY.forEach((Y, i) => {
    const bn = `banda ${i + 1}, Y=${Y}`;
    E.addPart(`CONTEXTO · Banda angosta del clasificador 1"×${P.bandaEsp} (${bn})`, COL.banda,
      [0, Y, zPortante], [
        box(`Ramal portante ${P.largo}×${c2(P.bandaAncho)}×${P.bandaEsp}`,
          [r2(P.largo / 2), Y, zPortante], P.largo, P.bandaAncho, P.bandaEsp),
        box(`Ramal de retorno (−${P.bandaRetornoDZ} del portante)`,
          [r2(P.largo / 2), Y, zRetorno], P.largo, P.bandaAncho, P.bandaEsp),
      ], { contexto: true, componente: '069.722xx FLEXPROOF ENDLESS BELT 1 in. WIDE', anfitrion: true });
    n.bandas++;

    // La regleta es lo que explica el ancho medido de 32.9 mm en el ramal
    // portante (banda de 1" apoyada sobre regleta de 1-1/4").
    E.addPart(`CONTEXTO · Regleta de desgaste UHMW 1-1/4"×3/8" (${bn})`, COL.banda,
      [0, Y, zRegleta], [
        box(`Regleta ${P.largo}×${c2(P.regletaAncho)}×${c2(P.regletaEsp)}`,
          [r2(P.largo / 2), Y, zRegleta], P.largo, P.regletaAncho, P.regletaEsp),
      ], { contexto: true, material: 'UHMW-PE', anfitrion: true });
    n.regletas++;
  });

  // =========================================================================
  // 3. Verificaciones del módulo (se reportan, no se ajustan)
  // =========================================================================
  // 3.1 lateral: el rodillo Ø34.93 pasa entre las dos regletas vecinas de 1-1/4"
  const holguraLado = c2(P.paso / 2 - P.rodDia / 2 - P.regletaAncho / 2);          // 4.76
  const holguraTotal = c2(P.paso - P.rodDia - P.regletaAncho);                     // 9.53
  // 3.2 vertical: emergencia con el módulo arriba y retracción con el módulo abajo
  const topeAlto = c2(P.rodZ + P.rodDia / 2);
  const topeBajo = c2(P.rodZbajo + P.rodDia / 2);
  const emerge = c2(topeAlto - P.planoBanda);                                      // 6.35 = 1/4"
  const retrae = c2(P.planoBanda - topeBajo);                                      // 3.65
  const bajoBanda = c2(zPortante - topeBajo);            // por debajo del cuerpo de la banda
  // 3.3 el serpentín queda rehundido respecto de la cara de transporte
  const rebaje = c2(RV - (RO + P.serpEsp));                                        // 0.50
  // 3.4 juego axial: el bastidor separó las placas peine a 42.48 / 420.52, así
  // que el tubo (375 entre testas) flota 3.04 mm — 1.52 por lado, el que pide el
  // taller. Queda resuelto el aviso de la versión anterior de este módulo.
  // 3.5 los anillos tienen que caer FUERA del espesor de la placa peine; se
  // comprueba contra las caras exteriores reales en vez de darlo por bueno.
  const anillosLibres = AN_X[0] + L.anilloT <= PEINE_EXT[0] && AN_X[1] >= PEINE_EXT[1];

  return {
    piezas: n.rodillos + n.ejes + n.tapas + n.rodamientos + n.anillos,             // 48
    rodillos: n.rodillos, ejes: n.ejes, tapas: n.tapas,
    rodamientos: n.rodamientos, anillos: n.anillos,
    bandas: n.bandas, regletas: n.regletas, contexto: n.bandas + n.regletas,

    // cotas del rodillo
    rodDia: c2(P.rodDia), tuboOD: c2(L.tuboOD), tuboPared: P.rodPared, vulcE: P.rodVulcE,
    caraVulcanizada: r2(P.rodCara - 2 * L.vulcRetiro),
    bandaDesnuda: [SERP0, SERP1], rebajeSerpentin: rebaje,
    ejeHexEC: c2(P.rodHex), ejeLargo: L.ejeLargo,

    // holguras verificadas
    holguraRodilloBanda: holguraLado,          // por lado (rodillo ↔ regleta+banda vecina)
    holguraLateralTotal: holguraTotal,         // paso − Ø rodillo − ancho de regleta
    emergeArriba: emerge, retraeAbajo: retrae, bajoCuerpoBanda: bajoBanda,
    topeAlto, topeBajo, planoBanda: P.planoBanda,

    // montaje / desmontaje del eje
    juegoAxialEje: JUEGO_EJE,                  // entre los dos anillos (1.7 mm por lado)
    juegoTuboPlaca: r2((PEINE_INT[1] - PEINE_INT[0]) - P.rodCara),   // 3.04 = 1.52 por lado
    carreraExtraccionEje: r2(PEINE_INT[0] - EJE_X0),
    ejeExtraidoHasta: r2(EJE_X1 + PEINE_INT[0] - EJE_X0),
    gargantasX: RAN_X, anillosX: AN_X, anillosFueraDePlaca: anillosLibres,
    placaPeineX: L.placaPeineX,
  };
}

export default rodillos;
