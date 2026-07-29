// rodillos.mjs — RODILLOS EMERGENTES de la transferencia 90° de bandas angostas
// (NBT90, Hytrol ProSort MRT 90° Transfer), el RODILLO DE RETORNO que limita las
// bandas del clasificador, y las bandas del anfitrión modeladas como CONTEXTO.
//
// Contenido (contrato §6):
//   MÓVIL    6 × SA-036881 «VULCANIZED 138 ROLLER ASSEMBLY»: tubo de acero con
//            UNA cubierta vulcanizada NEGRA (sólo el tramo de carga), eje redondo
//            escalonado con HILO INTERIOR en las dos puntas, 2 rodamientos por
//            rodillo con su tapa-soporte, y el perno 1/4-20 que entra desde FUERA
//            de cada placa peine y rosca en el eje.
//   FIJO     1 × B-20760 «1.9 in. OD Galv Return Roller – ABEC-1»: el rodillo
//            transversal (eje según Y) sobre el que apoyan y quedan LIMITADOS los
//            ramales de retorno de las 5 bandas angostas del clasificador.
//   CONTEXTO 5 bandas angostas de 1" del anfitrión (ramal portante + retorno) y
//            sus regletas de desgaste UHMW de 1-1/4". No son parte del equipo:
//            están para comprobar que los rodillos emergen y se retraen limpios.
//
// Ejes (contrato §1): X = eje de los rodillos de transferencia · Y = expulsión a
// 90° (y dirección en que se reparten los 6 rodillos y las 5 bandas) · Z = arriba.
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

import {
  Ensamble, revolve, box, rodamiento, pernoHex, golilla, COL, r2, pulg,
} from './lib.mjs';
import { P } from './params.mjs';
// Interfaz con el bastidor: él es dueño de las placas peine y de los canales del
// anfitrión, así que él fija los planos de chapa y los taladros. Se IMPORTAN, no
// se copian: si el bastidor mueve una placa, esto lo sigue solo.
import { rodMontaje, rodRetorno } from './bastidor.mjs';

// ---------------------------------------------------------------------------
// Cotas locales de este módulo (justificación: med / cat / txt / dis)
// ---------------------------------------------------------------------------
const L = {
  // -- cuerpo del rodillo de transferencia -----------------------------------
  tuboOD: P.rodDia - 2 * P.rodVulcE,                     // 28.93 · dis (ver nota)
  tuboID: P.rodDia - 2 * P.rodVulcE - 2 * P.rodPared,    // 25.93 · dis (pared 16 GA)
  tuboChaflan: 0.5,          // dis: entrada de la tapa a presión
  vulcChaflan: 1.5,          // dis: canto de la goma matado a 45°, no despega
  vulcRetiro: 3.0,           // dis: la goma se rebaja 3 mm de la testa de carga para
                             //      que no roce la placa peine libre
  desnudaHolgura: 2.0,       // dis: sobreancho del tramo desnudo por lado, para la
                             //      deriva de la banda plana (tracking)

  // -- tapa-soporte de extremo (aloja el rodamiento) -------------------------
  // Se alarga de 11 a 24 mm respecto de la versión con eje hexagonal: el
  // rodamiento tiene que retroceder para dejar sitio a la PUNTA Ø1/2" del eje,
  // que es la que lleva el hilo interior (un Ø8 no admite una rosca 1/4-20:
  // dejaría 0.8 mm de pared). Ver «montaje atornillado» más abajo.
  tapaL: 24.0,               // dis
  tapaHombro: 14.0,          // dis: h del hombro = arranque del asiento del rodamiento
  tapaBoreD: 13.5,           // dis: paso de la punta Ø12.70 del eje (0.4 mm radial)
  tapaChaflan: 0.8,          // dis: chaflán de introducción a presión en el tubo

  // -- eje con HILO INTERIOR + perno por fuera (montaje que describe el cliente)
  // «sujeciones con perforación y rodillo con su eje con hilo interior, entonces
  //  perno por fuera chapa». Es la opción de catálogo *end drilled & tapped*:
  //  Interroll ofrece ED&T sólo a partir de eje Ø12 mm / 7/16" hex, nunca en
  //  5/16" (ficha en analisis/web_facts.json, ROD-ED&T-001/002). Como el
  //  rodamiento de `P.rodRodam` (bore 8) está congelado en params.mjs, el eje se
  //  hace ESCALONADO: cuerpo Ø7.94 (5/16", = P.rodHex) donde giran los
  //  rodamientos y PUNTAS Ø12.70 (1/2") donde va la rosca y el tope contra chapa.
  ejeCuerpoD: P.rodHex,      // 7.94 — 5/16" redondo (mismo tamaño de catálogo que
                             //        el hexágono que sustituye; ya no gira en ranura)
  ejePuntaD: pulg(0.5),      // 12.70 · cat: Ø de eje mínimo que admite ED&T
  ejeRodamGap: 2.0,          // dis: el escalón Ø12.70→Ø7.94 no toca el rodamiento
                             //      (el bolt tira del eje hacia FUERA y el tope es
                             //      la corona de la punta contra la placa, no el aro)
  roscaProf: 13.0,           // dis: 2.05·d de rosca 1/4-20 en la punta (13.52 de
                             //      punta disponible). Pared alrededor de la rosca:
                             //      (12.70 − 6.35)/2 = 3.18 mm.
  pernoLargo: pulg(0.75),    // 19.05 = 3/4" · dis (ver `agarre` en las métricas)
  golillaE: 1.6,             // cat: golilla plana 1/4" ASME B18.22.1
  golillaD: 14.0,            // cat: Ø exterior de la golilla plana 1/4"

  // -- rodillo de retorno B-20760 (todo lo dimensional viene de `rodRetorno`) --
  retTapaL: 14.0,            // dis: tapa-soporte del tubo Ø1.9"
  retTapaHombro: 2.5,        // dis
  retTapaLabioD: 20.0,       // dis: tope del aro exterior
  retRodam: { bore: pulg(0.5), od: pulg(1.125), w: pulg(0.3125), desig: 'R8-2RS' },
                             // cat: serie R pulgada 1/2"×1-1/8"×5/16"; el manual
                             // especifica clase ABEC-1 para este rodillo (pág. 12)
  retSepD: pulg(0.6875),     // 17.46 = 11/16" · med: el «resalte» que se ve entre la
                             //         testa del tubo y la punta de eje mide 27 px =
                             //         17.06 mm (error 2.3 % contra 11/16")
  retSepBore: 13.0,          // dis: ajuste deslizante sobre el eje Ø12.70
  retPernoLargo: pulg(0.75), // 19.05 = 3/4"
};

// Radios de trabajo (todo lo demás se deriva de P).
const RO = L.tuboOD / 2;               // 14.465 — acero desnudo (arrastre)
const RI = L.tuboID / 2;               // 12.965 — interior del tubo
const RV = P.rodDia / 2;               // 17.4625 — cara vulcanizada
const RB = P.rodRodam.od / 2;          // 11.0 — asiento del rodamiento
const DIR = [1, 0, 0];                 // los 6 rodillos de transferencia van según +X
const DIRY = [0, 1, 0];                // el rodillo de retorno, según +Y
const c2 = (v) => Math.round(v * 100 + 1e-9) / 100;   // rótulos: 34.925 → 34.93

// ---------------------------------------------------------------------------
// CONTACTO REAL DE LA BANDA DEL SERPENTÍN SOBRE EL RODILLO
// ---------------------------------------------------------------------------
// Estas dos cotas son la ÚNICA fuente de verdad del contacto banda↔rodillo en el
// ensamble: transmision.mjs construye el serpentín centrado en `P.planoSerp` con
// ancho `P.serpAncho`, o sea que la banda toca el tubo entre
//   P.planoSerp − P.serpAncho/2 = 72.3   y   P.planoSerp + P.serpAncho/2 = 97.7,
// y aquí se le añade `L.desnudaHolgura` por lado por deriva de banda (tracking).
// No hay número escrito a mano: SERP0/SERP1 salen de P y se exportan para que
// nadie los redefina.
const SERP0 = r2(P.planoSerp - P.serpAncho / 2 - L.desnudaHolgura);   // 70.3
const SERP1 = r2(P.planoSerp + P.serpAncho / 2 + L.desnudaHolgura);   // 99.7

// Caras de las placas peine (las fija bastidor.mjs, aquí sólo se leen).
const PEINE_INT = rodMontaje.caraInt;      // [42.48, 420.52] — cara interior
const PEINE_EXT = rodMontaje.caraExt;      // [37.72, 425.28] — cara exterior

// Eje: va de cara interior a cara interior de las placas peine. Las dos coronas
// Ø12.70 de sus puntas TOPAN contra esas caras y los dos pernos las aprietan
// contra ellas; el eje queda en tracción entre los dos pernos y no gira.
const EJE_X = [PEINE_INT[0], PEINE_INT[1]];
const EJE_LARGO = r2(EJE_X[1] - EJE_X[0]);                            // 378.04
// Los rodamientos retroceden hasta el hombro de la tapa; la punta Ø12.70 llega
// hasta `ejeRodamGap` antes del rodamiento.
const RODAM_X = [r2(P.rodX0 + L.tapaHombro), r2(P.rodX1 - L.tapaHombro - P.rodRodam.w)];
const PUNTA_L = r2(RODAM_X[0] - L.ejeRodamGap - EJE_X[0]);             // 13.52

/** Cotas que necesita el resto del ensamble: el serpentín se apoya en el ACERO
 *  desnudo (no en la goma), y ese es el radio que abraza. */
export const bandaDesnudaX = [SERP0, SERP1];
export const radioArrastre = r2(RO);
/** Tramo de tubo SIN vulcanizar: del borde motriz del rodillo al final del
 *  contacto de la banda. Es lo que corrigió el cliente. */
export const tramoDesnudoX = [P.rodX0, SERP1];

// ---------------------------------------------------------------------------
// Perfiles de revolución  ([h a lo largo del eje, r radial])
// ---------------------------------------------------------------------------
const espejo = (perfil, len) => perfil.map(([h, r]) => [r2(len - h), r]);

/** Tubo de acero, con chaflán de entrada en las dos bocas. */
const perfilTubo = (len, rInt, rExt, c) =>
  [[0, rInt + c], [c, rInt], [len - c, rInt], [len, rInt + c], [len, rExt], [0, rExt]];

/** Cubierta vulcanizada de espesor constante, cantos a 45°. Su diámetro interior
 *  es EXACTAMENTE el exterior del tubo: es una cubierta pegada, no un postizo con
 *  holgura (y así el sólido exacto no se solapa con el del tubo). */
const perfilVulc = (len) => {
  const c = L.vulcChaflan;
  return [[0, RO], [0, RV - c], [c, RV], [len - c, RV], [len, RV - c], [len, RO]];
};

/** Tapa-soporte de extremo genérica. h = 0 en la testa del tubo y crece hacia
 *  DENTRO. Se prensa en el tubo (rExt = radio interior del tubo), y aloja el
 *  rodamiento (radio rSeat) contra un HOMBRO en h = hombro que le hace de tope
 *  axial. El taladro central (rBore) deja pasar el eje. */
const perfilTapa = (len, rExt, rSeat, hombro, rBore, c) => [
  [0, rBore],                     // taladro de paso del eje
  [0, rExt],                      // testa de la tapa (a ras del tubo)
  [len - c, rExt],                // Ø exterior = ID del tubo (ajuste prensado)
  [len, rExt - c],                // chaflán de introducción
  [len, rSeat + 0.5],
  [len - 0.5, rSeat],             // entrada del alojamiento del rodamiento
  [hombro, rSeat],                // asiento del rodamiento
  [hombro, rBore],                // HOMBRO: tope axial del aro exterior
];

/** Eje escalonado con las dos puntas Ø12.70 y el cuerpo Ø7.94. */
const perfilEje = (largo, puntaL, rP, rC) =>
  [[0, 0], [0, rP], [puntaL, rP], [puntaL, rC],
    [largo - puntaL, rC], [largo - puntaL, rP], [largo, rP], [largo, 0]];

/** Taladro roscado (se dibuja al Ø nominal, así el vástago del perno encaja
 *  exactamente y el sólido exacto no acusa solape). */
const perfilRosca = (prof, d) => [[0, 0], [0, d / 2], [prof, d / 2], [prof, 0]];

// ---------------------------------------------------------------------------
// Montaje atornillado: golilla + perno hexagonal que entran desde FUERA de una
// chapa y roscan en el hilo interior del eje. `at` = cara EXTERIOR de la chapa.
// ---------------------------------------------------------------------------
function pernoDeEje(E, { nombre, at, dir, torn, desig, largo, golE, golD, capa }) {
  const p = (s) => [at[0] + dir[0] * s, at[1] + dir[1] * s, at[2] + dir[2] * s];
  golilla(E, { nombre, at: p(-golE), dir, dia: torn.d, ext: golD, esp: golE, capa });
  pernoHex(E, {
    nombre: `${desig} × ${r2(largo)} · ${nombre}`, at: p(-golE), dir, dia: torn.d,
    largo, af: torn.af, altoCab: torn.hh, capa,
  });
}

// ---------------------------------------------------------------------------
// Módulo
// ---------------------------------------------------------------------------
/** @param {Ensamble} E  ensamble compartido
 *  @returns {object} métricas del módulo (las lee el gate de gen_nbt90.mjs) */
export function rodillos(E) {
  const n = {
    rodillos: 0, vulcanizados: 0, ejes: 0, tapas: 0, rodamientos: 0, pernos: 0,
    separadores: 0, retorno: 0, bandas: 0, regletas: 0,
  };
  const Z = P.rodZ;                                    // 379.49 — estado ELEVADO
  // ZONA VULCANIZADA — de dónde sale cada límite (corrección del cliente:
  // «lo que está del contacto de banda en rodillo al borde no va vulcanizado»):
  //   · arranca en SERP1 = P.planoSerp + P.serpAncho/2 + L.desnudaHolgura, o sea
  //     justo donde ACABA el contacto real de la banda del serpentín (más la
  //     holgura de deriva). Del contacto hacia el borde motriz — X 44…99.7 — el
  //     tubo queda de ACERO DESNUDO;
  //   · termina en P.rodX1 − L.vulcRetiro: la goma se rebaja 3 mm de la testa
  //     libre para que no roce la placa peine.
  const vulcX = [SERP1, r2(P.rodX1 - L.vulcRetiro)];                  // [99.7, 416]
  const vulcLargo = r2(vulcX[1] - vulcX[0]);                          // 316.3

  // =========================================================================
  // 1. Los seis rodillos vulcanizados (MÓVIL: suben P.carrera con el pop-up)
  // =========================================================================
  P.rodY.forEach((Y, i) => {
    const ln = `línea ${i + 1}, Y=${Y}`;
    const conj = { componente: 'SA-036881', conjunto: 'SA-036881 VULCANIZED 138 ROLLER ASSEMBLY' };

    // --- 1.1 tubo de acero -------------------------------------------------
    // Va entero de testa a testa; lo que cambia es qué parte lleva goma encima.
    E.addPart(`MÓVIL · Tubo de rodillo Ø${c2(L.tuboOD)} × ${P.rodCara} (${ln})`, COL.rodillo,
      [P.rodX0, Y, Z], [
        revolve(`Tubo de acero Ø${c2(L.tuboOD)} × ${P.rodCara} (pared ${P.rodPared})`,
          [P.rodX0, Y, Z], 'x', perfilTubo(P.rodCara, RI, RO, L.tuboChaflan)),
      ], {
        ...conj, capa: 'web+user', material: 'tubo de acero 16 GA',
        nota: `acero desnudo X ${P.rodX0}…${SERP1}: por ahí lo arrastra el serpentín `
          + `(contacto real X ${r2(P.planoSerp - P.serpAncho / 2)}…${r2(P.planoSerp + P.serpAncho / 2)})`,
      });
    n.rodillos++;

    // --- 1.2 cubierta vulcanizada NEGRA -----------------------------------
    // Pieza aparte y NEGRA porque es GOMA, no acero: el cliente corrigió que
    // «el vulcanizado será negro». Color COL.banda, que es el negro de goma de
    // la paleta del contrato (§4); COL.rodillo se queda para el tubo.
    E.addPart(`MÓVIL · Vulcanizado negro e=${P.rodVulcE} → Ø${c2(P.rodDia)} × ${vulcLargo} (${ln})`,
      COL.banda, [vulcX[0], Y, Z], [
        revolve(`Cubierta de goma Ø${c2(L.tuboOD)}→Ø${c2(P.rodDia)} × ${vulcLargo}`,
          [vulcX[0], Y, Z], 'x', perfilVulc(vulcLargo)),
      ], {
        ...conj, capa: 'web+user', material: 'goma vulcanizada sobre el tubo (negra)',
        nota: `sólo el tramo de carga X ${vulcX[0]}…${vulcX[1]}: del contacto de la banda `
          + `al borde motriz no va vulcanizado`,
      });
    n.vulcanizados++;

    // --- 1.3 eje redondo con HILO INTERIOR en las dos puntas ---------------
    // NO GIRA: cada punta Ø12.70 topa contra la cara INTERIOR de su placa peine
    // y el perno de 1/4-20 que entra desde fuera la aprieta contra la chapa. El
    // eje queda en tracción entre los dos pernos; el par de arrastre (≈0.01 N·m
    // de fricción de los dos rodamientos) lo aguanta de sobra el rozamiento de
    // la corona apretada (Ø12.70 → ≈1 N·m con el par normal de un 1/4-20).
    E.addPart(`MÓVIL · Eje de rodillo Ø${c2(L.ejePuntaD)}/Ø${c2(L.ejeCuerpoD)} × ${EJE_LARGO} (${ln})`,
      COL.acero, [EJE_X[0], Y, Z], [
        revolve(`Barra escalonada: puntas Ø${c2(L.ejePuntaD)} × ${PUNTA_L}, cuerpo Ø${c2(L.ejeCuerpoD)}`,
          [EJE_X[0], Y, Z], 'x',
          perfilEje(EJE_LARGO, PUNTA_L, L.ejePuntaD / 2, L.ejeCuerpoD / 2)),
        revolve(`Hilo interior 1/4-20 UNC × ${L.roscaProf} (−X)`, [EJE_X[0], Y, Z], 'x',
          perfilRosca(L.roscaProf, P.M.b14.d), 'cut'),
        revolve(`Hilo interior 1/4-20 UNC × ${L.roscaProf} (+X)`,
          [r2(EJE_X[1] - L.roscaProf), Y, Z], 'x',
          espejo(perfilRosca(L.roscaProf, P.M.b14.d), L.roscaProf), 'cut'),
      ], {
        ...conj, material: 'acero estirado en frío',
        gira: false, rosca: '1/4-20 UNC-2B end drilled & tapped en las dos puntas',
      });
    n.ejes++;

    // --- 1.4 tapas-soporte, rodamientos y el perno de sujeción -------------
    for (const s of [0, 1]) {
      const lado = s === 0 ? 'motriz' : 'libre';
      const xTapa = s === 0 ? P.rodX0 : r2(P.rodX1 - L.tapaL);
      const perfil = perfilTapa(L.tapaL, RI, RB, L.tapaHombro, L.tapaBoreD / 2, L.tapaChaflan);
      E.addPart(`MÓVIL · Tapa-soporte de extremo Ø${c2(L.tuboID)}/Ø${P.rodRodam.od} × ${L.tapaL} (${ln}, ${lado})`,
        COL.rodillo, [xTapa, Y, Z], [
          revolve(`Alojamiento Ø${P.rodRodam.od} con hombro y paso Ø${L.tapaBoreD}`, [xTapa, Y, Z], 'x',
            s === 0 ? perfil : espejo(perfil, L.tapaL)),
        ], { ...conj, ajuste: `prensado H7/r6 en el tubo Ø${c2(L.tuboID)}` });
      n.tapas++;

      // rodamiento asentado contra el hombro; su bore Ø8 gira sobre el cuerpo
      // Ø7.94 del eje (ajuste deslizante: el que no gira es el eje)
      rodamiento(E, {
        nombre: `608-2RS (${ln}, ${lado})`, at: [RODAM_X[s], Y, Z], dir: DIR,
        ...P.rodRodam, capa: 'MÓVIL · ',
      });
      n.rodamientos++;

      // PERNO POR FUERA: golilla + perno 1/4-20 × 3/4" que atraviesa el taladro
      // Ø7.0 de la placa peine y rosca 12.69 mm (2.0·d) en la punta del eje.
      pernoDeEje(E, {
        nombre: `rodillo (${ln}, ${lado})`,
        at: [PEINE_EXT[s], Y, Z], dir: s === 0 ? DIR : [-1, 0, 0],
        torn: P.M.b14, desig: '1/4-20 UNC', largo: L.pernoLargo,
        golE: L.golillaE, golD: L.golillaD,
        capa: 'MÓVIL · ',
      });
      n.pernos++;
    }
  });

  // =========================================================================
  // 2. FIJO — RODILLO DE RETORNO B-20760, el que limita las bandas del sorter
  // =========================================================================
  // Es el elemento transversal que se ve cruzando de lado a lado la vista
  // izquierda de FIGURE 8A, con una punta de eje asomando por cada extremo. En
  // esa vista se mira según X, así que su eje va según **Y**: es transversal a
  // los seis rodillos de transferencia. El despiece de la pág. 13 del manual lo
  // lista como item 22, `B-20760 GALVANIZED ROLLER ASSEMBLY - 1.9 in. OD`, y el
  // de la pág. 12 lo describe: «1.9 in. OD Galv Return Roller - ABEC-1 (Specify
  // BR -1-1/4)». O sea: es un RODILLO DE RETORNO, y su función es exactamente la
  // que dice el cliente — sobre él apoyan y quedan limitados los ramales de
  // retorno de las 5 bandas angostas del clasificador.
  //
  // Todas sus cotas de posición vienen de `rodRetorno` (bastidor.mjs), que es
  // quien pone los taladros en el alma de los canales del anfitrión.
  {
    const R = rodRetorno;
    const rExt = r2(R.dia / 2);                          // 24.13
    const rInt = r2(R.dia / 2 - R.pared);                // 22.48
    const y0 = r2(-R.largo / 2), y1 = r2(R.largo / 2);   // ±212.72
    const ejeY0 = r2(-R.ejeLargo / 2);                   // −228.57 (cara interior del alma)
    const almaExt = r2(R.y + R.t / 2);                   // 231.23 — cara exterior del alma

    E.addPart(`FIJO · Rodillo de retorno B-20760 Ø1.9" × ${R.largo} (límite de las bandas del clasificador)`,
      COL.rodillo, [R.x, y0, R.z], [
        revolve(`Tubo galvanizado Ø${R.dia} × ${R.largo} (pared ${R.pared})`,
          [R.x, y0, R.z], 'y', perfilTubo(R.largo, rInt, rExt, L.tuboChaflan)),
      ], {
        componente: 'B-20760', conjunto: 'B-20760 · 1.9 in. OD Galv Return Roller — ABEC-1',
        capa: 'web', material: 'tubo de acero galvanizado 0.065"',
        nota: `sobre él corren los ${P.nBandas} ramales de retorno del anfitrión `
          + `(tangente en Z = ${r2(R.z + rExt)})`,
      });
    n.retorno++;

    for (const s of [0, 1]) {
      const lado = s === 0 ? '−Y' : '+Y';
      const yTapa = s === 0 ? y0 : r2(y1 - L.retTapaL);
      const perfil = perfilTapa(L.retTapaL, rInt, r2(L.retRodam.od / 2),
        L.retTapaHombro, L.retTapaLabioD / 2, L.tuboChaflan);
      E.addPart(`FIJO · Tapa-soporte de rodillo de retorno Ø${c2(2 * rInt)}/Ø${c2(L.retRodam.od)} × ${L.retTapaL} (${lado})`,
        COL.rodillo, [R.x, yTapa, R.z], [
          revolve(`Alojamiento Ø${c2(L.retRodam.od)} con hombro`, [R.x, yTapa, R.z], 'y',
            s === 0 ? perfil : espejo(perfil, L.retTapaL)),
        ], { componente: 'B-20760', ajuste: `prensado en el tubo Ø${c2(2 * rInt)}` });
      n.tapas++;

      const yRodam = s === 0 ? r2(y0 + L.retTapaHombro) : r2(y1 - L.retTapaHombro - L.retRodam.w);
      rodamiento(E, {
        nombre: `${L.retRodam.desig} ABEC-1 rodillo de retorno (${lado})`,
        at: [R.x, yRodam, R.z], dir: DIRY,
        bore: L.retRodam.bore, od: L.retRodam.od, w: L.retRodam.w, capa: 'FIJO · ',
      });
      n.rodamientos++;

      // CASQUILLO SEPARADOR — retención axial del tubo (contrato §5.3). La regla
      // de catálogo deja el tubo 1-1/4" más corto que el vano, o sea 5/8" de hueco
      // por lado: sin casquillo el rodillo caminaría 15.9 mm de un lado a otro.
      // El casquillo va sobre el eje FIJO y topa contra el ARO INTERIOR del
      // rodamiento (que tampoco gira) y contra el alma del canal: no roza nada.
      // Es el «resalte» que se ve en FIGURE 8A entre la testa del tubo y la punta.
      const sepY = s === 0 ? r2(-almaExt + R.t) : r2(yRodam + L.retRodam.w);
      const sepL = s === 0 ? r2(yRodam - (-almaExt + R.t)) : r2(almaExt - R.t - (yRodam + L.retRodam.w));
      E.addPart(`FIJO · Casquillo separador Ø${c2(L.retSepD)} × ${sepL} (rodillo de retorno, ${lado})`,
        COL.acero, [R.x, sepY, R.z], [
          revolve(`Casquillo Ø${c2(L.retSepD)}/Ø${L.retSepBore} × ${sepL}`, [R.x, sepY, R.z], 'y',
            [[0, L.retSepBore / 2], [0, L.retSepD / 2], [sepL, L.retSepD / 2], [sepL, L.retSepBore / 2]]),
        ], {
          componente: 'B-20760', material: 'tubo de acero 11/16"',
          funcion: 'retención axial del tubo entre el aro interior del rodamiento y el alma del canal',
        });
      n.separadores++;

      // perno 5/16-18 × 3/4" desde FUERA del canal del anfitrión
      pernoDeEje(E, {
        nombre: `rodillo de retorno (${lado})`,
        at: [R.x, s === 0 ? -almaExt : almaExt, R.z], dir: s === 0 ? DIRY : [0, -1, 0],
        torn: R.torn, desig: '1/4-20 UNC', largo: L.retPernoLargo,
        golE: L.golillaE, golD: r2(2.2 * R.torn.d),
        capa: 'FIJO · ',
      });
      n.pernos++;
    }

    E.addPart(`FIJO · Eje de rodillo de retorno Ø${R.eje} × ${R.ejeLargo} (hilo interior 1/4-20)`,
      COL.acero, [R.x, ejeY0, R.z], [
        revolve(`Barra Ø${R.eje} × ${R.ejeLargo}`, [R.x, ejeY0, R.z], 'y',
          [[0, 0], [0, R.eje / 2], [R.ejeLargo, R.eje / 2], [R.ejeLargo, 0]]),
        revolve(`Hilo interior 1/4-20 UNC × ${R.roscaProf} (−Y)`, [R.x, ejeY0, R.z], 'y',
          perfilRosca(R.roscaProf, R.torn.d), 'cut'),
        revolve(`Hilo interior 1/4-20 UNC × ${R.roscaProf} (+Y)`,
          [R.x, r2(ejeY0 + R.ejeLargo - R.roscaProf), R.z], 'y',
          espejo(perfilRosca(R.roscaProf, R.torn.d), R.roscaProf), 'cut'),
      ], {
        componente: 'B-20760', material: 'acero estirado en frío 1/2"',
        gira: false, rosca: `5/16-18 UNC-2B ED&T × ${R.roscaProf} (5/8") en las dos puntas`,
      });
    n.ejes++;
  }

  // =========================================================================
  // 3. CONTEXTO — el clasificador anfitrión (no es parte de la transferencia)
  // =========================================================================
  // Sirve para una sola cosa: comprobar que el rodillo emerge y se retrae entre
  // las bandas sin tocarlas, y que el rodillo de retorno queda tangente al ramal
  // de retorno. Van con extra.contexto = true, así el gate de gen_nbt90.mjs las
  // excluye del recuento y de la envolvente del módulo.
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
  // 4. Verificaciones del módulo (se reportan, no se ajustan)
  // =========================================================================
  // 4.1 lateral: el rodillo Ø34.93 pasa entre las dos regletas vecinas de 1-1/4"
  const holguraLado = c2(P.paso / 2 - P.rodDia / 2 - P.regletaAncho / 2);          // 4.76
  const holguraTotal = c2(P.paso - P.rodDia - P.regletaAncho);                     // 9.53
  // 4.2 vertical: emergencia con el módulo arriba y retracción con el módulo abajo.
  // La emergencia la fija el Ø VULCANIZADO, que no ha cambiado: cambia dónde
  // empieza la goma, no su diámetro, así que la cota de 1/4" queda intacta. En el
  // tramo desnudo (X 44…99.7, bajo la guarda y el serpentín) el tubo emerge 3 mm
  // menos, que es justo lo que se quiere: ahí no pasa producto.
  const topeAlto = c2(P.rodZ + P.rodDia / 2);
  const topeBajo = c2(P.rodZbajo + P.rodDia / 2);
  const emerge = c2(topeAlto - P.planoBanda);                                      // 6.35 = 1/4"
  const emergeDesnudo = c2(P.rodZ + RO - P.planoBanda);                            // 3.35
  const retrae = c2(P.planoBanda - topeBajo);                                      // 3.65
  const bajoBanda = c2(zPortante - topeBajo);            // por debajo del cuerpo de la banda
  // 4.3 el serpentín queda rehundido respecto de la cara de transporte
  const rebaje = c2(RV - (RO + P.serpEsp));                                        // 0.50
  // 4.4 juego axial: el bastidor separó las placas peine a 42.48 / 420.52, así
  // que el tubo (375 entre testas) flota 3.04 mm — 1.52 por lado, el que pide el
  // taller y el que da la regla de catálogo BF = RL + 0.12" (3.05 mm).
  const juegoTubo = r2((PEINE_INT[1] - PEINE_INT[0]) - P.rodCara);                 // 3.04
  // 4.5 el montaje atornillado: agarre, rosca engranada y tope contra chapa
  const agarre = r2(L.golillaE + rodMontaje.t);                                    // 6.36
  const engrane = r2(L.pernoLargo - agarre);                                       // 12.69
  const roscaOK = engrane <= L.roscaProf && engrane >= P.M.b14.d;                  // 1·d ≤ e ≤ prof
  // 4.6 el rodillo de retorno queda tangente al ramal de retorno del anfitrión
  const retTope = r2(rodRetorno.z + rodRetorno.dia / 2);
  const retTangencia = r2(retTope - zRetorno);                                     // 0.00
  const retAgarre = r2(L.golillaE + rodRetorno.t);                                 // 4.26
  const retEngrane = r2(L.retPernoLargo - retAgarre);                              // 14.79

  return {
    piezas: n.rodillos + n.vulcanizados + n.ejes + n.tapas + n.rodamientos + n.pernos
      + n.separadores + n.retorno,
    rodillos: n.rodillos, vulcanizados: n.vulcanizados, ejes: n.ejes, tapas: n.tapas,
    rodamientos: n.rodamientos, pernos: n.pernos, separadores: n.separadores,
    rodilloRetorno: n.retorno,
    bandas: n.bandas, regletas: n.regletas, contexto: n.bandas + n.regletas,

    // cotas del rodillo de transferencia
    rodDia: c2(P.rodDia), tuboOD: c2(L.tuboOD), tuboPared: P.rodPared, vulcE: P.rodVulcE,
    vulcanizadoX: vulcX, vulcanizadoLargo: vulcLargo, vulcanizadoColor: COL.banda,
    tramoDesnudoX, contactoBandaX: [r2(P.planoSerp - P.serpAncho / 2), r2(P.planoSerp + P.serpAncho / 2)],
    bandaDesnuda: [SERP0, SERP1], rebajeSerpentin: rebaje,

    // montaje atornillado (sustituye al eje hexagonal con anillos DIN 471)
    montaje: 'placa peine con taladro pasante Ø7.0 · eje con hilo interior 1/4-20 · perno por fuera',
    ejeCuerpoD: c2(L.ejeCuerpoD), ejePuntaD: c2(L.ejePuntaD), ejeLargo: EJE_LARGO,
    puntaLargo: PUNTA_L, roscaProf: L.roscaProf, perno: `1/4-20 UNC × ${L.pernoLargo}`,
    agarreMm: agarre, roscaEngranadaMm: engrane, roscaEngranadaEnD: r2(engrane / P.M.b14.d),
    roscaOK, topeEjeContraChapa: `corona Ø${c2(L.ejePuntaD)} contra la cara interior de la placa`,
    desmontaje: 'quitar los 2 pernos y sacar el rodillo VERTICALMENTE (la placa ya no tiene ranura)',

    // holguras verificadas
    holguraRodilloBanda: holguraLado,          // por lado (rodillo ↔ regleta+banda vecina)
    holguraLateralTotal: holguraTotal,         // paso − Ø rodillo − ancho de regleta
    emergeArriba: emerge, emergeTramoDesnudo: emergeDesnudo,
    retraeAbajo: retrae, bajoCuerpoBanda: bajoBanda,
    topeAlto, topeBajo, planoBanda: P.planoBanda,
    juegoTuboPlaca: juegoTubo, placaPeineX: rodMontaje.placaX,
    rodamientosX: RODAM_X,

    // rodillo de retorno B-20760
    retorno: {
      componente: 'B-20760', descripcion: '1.9 in. OD Galv Return Roller — ABEC-1 (Specify BR −1-1/4)',
      dia: rodRetorno.dia, largo: rodRetorno.largo, eje: rodRetorno.eje,
      ejeLargo: rodRetorno.ejeLargo, x: rodRetorno.x, z: rodRetorno.z,
      generatrizSuperiorZ: retTope, ramalRetornoZ: zRetorno, tangenciaMm: retTangencia,
      rodamiento: L.retRodam.desig, montaje: 'perno 1/4-20 × 3/4" desde fuera del alma del canal anfitrión',
      separadorD: c2(L.retSepD), juegoAxialTubo: 0,
      agarreMm: retAgarre, roscaEngranadaMm: retEngrane,
      roscaEngranadaEnD: r2(retEngrane / rodRetorno.torn.d),
    },
  };
}

export default rodillos;
