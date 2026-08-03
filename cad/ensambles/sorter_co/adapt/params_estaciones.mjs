// params_estaciones.mjs — TABLA DE COTAS del DETALLE FABRICABLE DE ESTACIONES
// del sorter CO adaptado (encargo §8 de ADAPTACION.md / SORTER_CO.md).
//
// Procedencia (regla de oro del repo):
//   step = MEDIDO sobre ref/sorter_CO.stp — se cita analisis/estaciones.json
//          (reproducible: python3 adapt/medir_estaciones.py), analisis/medidas.json
//          o inventario.json.
//   cat  = designación normalizada (norma ISO/DIN/ASME) sin cota de catálogo nueva.
//   web  = dato externo con URL/fecha/cita en ../web_facts.json (se cita id).
//   calc = derivado aritméticamente (fórmula al lado).
//   dis  = decisión de diseño de este detalle. Lleva justificación.
//
// Ejes: los del STEP del cliente (X ancho / Y flujo / Z arriba).

import { STEP, NBT, EJES, Xc, T, y0, y1, PERCHA, POZO, TENSOR, CALLE, bordeExtDescarga } from './params_adapt.mjs';

const r3 = (v) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------------------
// 1. ANCLAJE SUPERIOR DEL CILINDRO C85 + RACORDAJE (punto 1 del encargo)
// ---------------------------------------------------------------------------
// El STEP trae UNA bisagra trasera C85C25 (solo la calle 1) y NINGUNA
// contraparte al bastidor: el anclaje está sin resolver en el modelo del
// cliente. Se adopta su pieza (web PNEU-007) en su pose medida, replicada a
// las 5 calles, y se diseña la ménsula hembra que falta.
export const CLEVIS = {
  // pose medida (step estaciones.json, matriz de C85C25_25: t = (1.05, 56.18, −90);
  // 1.05 ≈ eje de banda de la calle 1 → la pieza va CENTRADA en el eje de banda):
  caja: { dx: [-14.75, 14.75], y: [46.18, 86.18], z: [-100, -68] },  // step (rel. eje banda)
  pivote: { y: 56.18, z: -90 },  // step — eje de articulación (Ø8 ×3 caras según X global)
  bulonDia: 8.0,                 // step — taladro de bulón del C85C25 (Ø8.000)
  luzOrejas: 16.1,               // step — caras interiores a ±8.05 del eje de banda
  orejaT: 4.0,                   // step — espesor de cada oreja (planos ±8.05/±12.05)
  // el kit C85C25 ancla por su TALADRO VERTICAL Ø12 (step: eje según Z global
  // en (X eje_banda − 5.0, Y 80.18), pasando por la bisagra) — el bulón Ø8 de
  // la articulación es interno del kit. La ménsula nueva (dis) es una REPISA:
  // escuadra 3/16" con ala vertical a la cara norte de la cabecera FRONT TOP2
  // (Y = 90.18 step medidas.json, 2 M8 roscados — taladros nuevos declarados)
  // y ala horizontal sobre la bisagra con taladro Ø13 para el perno M12
  // vertical. La repisa queda a Z −66: 2 sobre la bisagra (−68) y 10.8 sobre
  // la tapa trasera del cilindro (−76.76 step) — no toca la camisa.
  taladroVert: { d: 12.0, dx: -5.0, y: 80.18 },      // step — el Ø12 medido del kit
  repisa: { t: 4.763, z: -66.0, w: 70, vueloY: 68.0, taladro: 13.0 },  // dis
  placaBase: { t: 4.763, w: 70, h: 60 },             // dis — 3/16" (P.placaT del repo)
  caraNorteCabecera: 90.18,      // step medidas.json — FRONT TOP2 y máx
  // racordaje del C85 Ø25 (puertos G1/8 — ISO 6432): el puerto de trabajo lleva
  // el regulador AS2201FS-01-06S del cliente (web PNEU-004, meter-out, pose
  // medida); el puerto contrario queda SIN racor en el STEP → racor nuevo:
  racor: {                       // web PNEU-008 — SMC KQ2L06-01AS codo R1/8→tubo Ø6
    caja: [26.3, 16, 25],        // dis — envolvente de modelado (codo compacto)
    puertoZ: -95,                // dis — puerto trasero (culata superior), bajo el clevis
    dy: -16,                     // dis — sale del cuerpo hacia −Y (lado libre)
  },
};

// ---------------------------------------------------------------------------
// 2. RETENCIÓN AXIAL DE V1…V4 DEL POZO (punto 2 del encargo)
// ---------------------------------------------------------------------------
// Patrón del PROPIO cliente, medido en el carro tensor (step medidas.json,
// SCMRT906VCT-150-111 + POL-CON-TEN, y SORTER_CO.md §4.4): eje Ø20 con roscas
// hembra M10×1.5 en las testas y ranuras Ø18 para anillos 3AM1-20; la polea
// gira sobre 2 rodamientos W 6004-2Z. Se replica en las 4 poleas del pozo.
export const RETEN = {
  eje: {                          // FIJO fabricado, por posición (4 × 5 calles)
    d: 20.0,                      // step — como SCMRT906VCT-150-111 (Ø20.000)
    largo: 50.0,                  // step — testas a ±25 (Ø20 × 46 + rebajes 2×2)
    roscaTesta: 'M10×1.5 × 16',   // step — Ø menor medido 8.376 = M10×1.5 exacta
    ranura: { d: 18.0, ancho: 1.3, pos: 18.25 },  // Ø18 step (SCMRT906VCT); la
    //   POSICIÓN cambia respecto al eje del cliente (±20.5 medido): allí el
    //   anillo retiene el eje contra la horquilla; aquí retiene el PAQUETE de
    //   rodamientos y va pegado al aro interior (±17.5) — desviación declarada.
    //   Ancho 1.3 dis (el cliente modela 1.0 y el 3AM1-20 medido tiene e=1.10)
    ajuste: 'Ø20 g6 bajo los aros interiores',   // cat ISO 286-2 — criterio del
    //   repositorio (nbt90/tolerancias.mjs AJ-02/AJ-05, fuente NTN BRG-FIT-001):
    //   carga ESTACIONARIA sobre el aro interior (el eje no gira) ⇒ juego
  },
  rodamiento: { ref: 'SKF W 6004-2Z', b: 20, D: 42, w: 12 },   // web BRG-005
  // A2 (revisión de COMPRAS 2026-08-03): designación completa y de UNA sola
  // serie. La métrica es B27.7M; «ASME B27.7» a secas es la de PULGADAS.
  anillo: { ref: 'ANSI/ASME B27.7M — 3AM1-20', paraEje: 20,    // web RING-001
    norma: 'ANSI/ASME B27.7M — anillo de retención exterior 3AM1-20 (eje 20 mm) · web RING-001' },
  // alojamiento del aro exterior en la polea (V1/V4 volantes Ø100 reutilizados
  // → se MECANIZAN los extremos del bore Ø38 a Ø42; V2/V3 poleas nuevas):
  alojamiento: {
    d: 42.0, prof: 14.4,          // calc — W6004 w=12 + 2.4: el aro queda a
    //   ±17.5 y deja sitio a la ranura DIN 472 (centro ±18.55) tras él
    ajuste: 'Ø42 N7',             // cat ISO 286-2 — criterio del repositorio
    //   (tolerancias.mjs AJ-01/AJ-04, NTN 7.4 tabla 7.2(1) web BRG-FIT-001):
    //   carga ROTANTE sobre el aro exterior (gira la polea, el eje está quieto)
    hombroCentral: 38.0,          // step — el propio bore Ø38 del volante hace de
    //   hombro (resalte radial de 2.0 por lado para el aro exterior)
    din472: { d: 42, ranuraD: 44.5, ranuraW: 1.85, e: 1.75 },  // web RING-003
  },
  espaciador: { dExt: 25.0, dInt: 20.4, largo: 11.0 },  // dis — tubo entre aros
  //   interiores (a ±5.5); cadena axial: anillo(±18.25)→aro int(±17.5)→
  //   espaciador→aro int→anillo
  tornTesta: { d: 10, largo: 25, af: 17, cab: 6.4 },    // cat ISO 4762 M10×1.5×25
  //   a la rosca de testa del eje, con golilla, por fuera de cada pletina —
  //   el patrón de fijación del propio eje del cliente (roscas M10×1.5 medidas)
};

// ---------------------------------------------------------------------------
// 3. POLEA LOCA INTERIOR DEL IDLER-ENS (punto 3 del encargo) — MEDIDA
// ---------------------------------------------------------------------------
// Todo step (analisis/estaciones.json, reproducible con adapt/medir_estaciones.py):
export const IDLER = {
  dxEjeBanda: -3.013,             // step — centro_eje X = eje del perfil − 2.013
  //   = eje de banda − 3.013 (las 4 ocurrencias, idéntico)
  y: -1607.5, z: 0.0,             // step — centro del eje
  inclinacionDeg: 2.0,            // step — el eje real está girado 2.000° en XZ
  //   (columna 3 de la matriz = (0.999, 0, −0.035)); se modela recto y se declara
  cara: { dMax: 92.4, ancho: 40.0, bombeoConoDeg: 0.62 },  // step — disco bombeado
  alojamiento: 40.024,            // step — ×2 para los 6203-2RS (Ø ext 40)
  ranuraDin472: { d: 42.5, pos: 15.55 },   // step — DIN 472-40 a ±15.55
  pasoCentral: 25.12,             // step
  rodamiento: { ref: '6203-2RS', b: 17, D: 40, w: 12 },    // web BRG-004
  espaciadorE: { dExt: 23.5, largo: 6.63 },                // step caja IDLER-E
  horquillaY: [-1650.925, -1564.075],      // step — placas UR-P01
  ejeAExtremoSur: 43.425,         // calc — −1607.5 − (−1650.925)
  m8x65: { y: [-1614.0, -1601.0], z: [-6.6, 6.6] },  // step inventario — 2 pasantes
  //   según X con tuercas DIN EN ISO 8673 M8 y golillas ANSI B18.21.1-0.375
  // EL HALLAZGO (defecto nuevo del modelo del cliente, se declara — no se arrastra
  // al B-rep porque la pieza va en capa contexto):
  solapeConducidaX: 38.528,       // step — IDLER-P01 y conducida_63T COAXIALES
  //   (dY = dZ = 0.000) con 38.5 mm de solape en X: dos discos Ø92.4 y Ø112
  //   interpenetrados. La banda medida respalda a la 63T (radio de vuelta del
  //   lazo 52.33 = 51.7 + dorso 0.633; con la IDLER-P01 el dorso quedaría a
  //   46.2 + 2.2 = 48.4 ≠ 52.33). El bore de los 6203 (Ø17) no tiene eje en el
  //   STEP. 63T o polea loca: decide el cliente; hasta entonces la loca se
  //   modela fiel en su posición interior medida, capa step.
};

// ---------------------------------------------------------------------------
// 4. ACCIONAMIENTO COMÚN (punto 4 del encargo)
// ---------------------------------------------------------------------------
// La aritmética que OBLIGA al eje motriz común (todo step):
//   · árbol SH-04: 93.22 de largo > paso 76.2 → los árboles vecinos solapan 17.0
//   · soportes 2T: envergadura 89.22 > 76.2 → solapan 13.0
//   · 63T (40) + AT10 (42) = 82 lado a lado > 76.2 → no cabe AT10 por calle
//   · el motor principal acopla COAXIAL a la línea del árbol (LK30-R centrado
//     en Y 0.0 / Z −0.2, step) → no existe pareja AT10 motor↔eje no coaxial
// ⇒ un eje motriz común para las 5 calles, acoplado al motor como hoy.
export const EJEC = {
  // eje motriz común (FIJO fabricado): barra Ø30 con extremo +X torneado a Ø25
  d: 30.0,                        // dis — cuerpo (rigidez: flecha calc abajo);
  //   el asiento del acople del cliente pide Ø30 (LK30-R agarra Ø30.063 step)
  x0: -43.0,                      // calc — entra 30 mm en el asiento Ø30.063 del
  //   LK30-R conservado en pose step (caja X −112.42…−12.92, lado árbol)
  x1: 492.0,                      // calc — muere dentro del inserto UC 205 (+X)
  munonUcfl: { d: 25.0, ajuste: 'Ø25 k6', x: [458.0, 492.0] },  // cat ISO 286-2 —
  //   k6 es el asiento clásico bajo aro interior prolongado con prisioneros (el
  //   UC aprieta con sus prisioneros, web BRG-003); tramo torneado del extremo
  chaveteros: 'DIN 6885 A 8×7×32, uno bajo cada buje',           // cat
  // los 5 bujes de las 63T (FIJO fabricados):
  buje: {
    dExt: 38.0, ajuste: 'Ø38 g6 en el bore liso Ø38.000 de la 63T (step §4.5)',
    dInt: 30.0, ajusteInt: 'Ø30 H7 sobre el eje',                // cat ISO 286-2
    largo: 40.0, valona: { d: 48, t: 4 },                        // dis
    chaveta: 'paralela DIN 6885 A 8×7×32',                       // cat — el par
    prisionero: 'ISO 4029 M8×10 radial sobre la chaveta',        // cat — retención
    //   axial buje↔eje; la 63T se fija al buje con 2 prisioneros ISO 4029 M6×8
    //   radiales (taladros M6 nuevos en el cubo de la polea reutilizada —
    //   operación declarada). Par por calle ~8 N·m ≪ capacidad (calc en verify).
  },
  ucfl: {                         // web BRG-003 — SKF UCFL 205 (eje 25)
    housingW: 27.0,               // step — FL 205 medida (X 504.09…531.09)
    taladros: { d: 16.0, entreCentros: 99.0 },   // step FL medida (Ø16 a ±49.5) + web
    perno: 'M12×45 ISO 4017 + tuerca ISO 4032 + golillas',       // cat — PASANTES
    //   al chapón de 28 (taladros Ø14 nuevos — modificación declarada)
    posX: 499.418,                // step — brida contra cara interior del chapón
    //   de descarga; el housing crece hacia −X (X 472.4…499.4)
  },
  // apoyo −X: el propio acople rígido al motorreductor (LK30-R + rodamientos del
  // reductor) — el MISMO esquema del cliente (motor + LK30 + árbol sobre
  // autoalineantes; el UC 205 es de rótula, absorbe el desalineo — web BRG-003).
  // La UCFL −X no tiene sitio: el manguito Ø65 del acople cruza el chapón −X
  // (X −112.4…−12.9, step). Se declara y se verifica la flecha:
  flecha: {                       // calc en verify(): 5 cargas de 294 N (2 ramales
    cargaPorCalleN: 294.5,        //   × 147 N, PNEU-003 a 6 bar — hipótesis dis)
    limite: 0.5,                  // dis — ≤ 0.5 mm al centro del vano (~1/1000 L)
  },
  parPorCalleNm: 8.0,             // calc — 147 N × r primitivo 0.0501 × 2 ramales
  //   ≈ 14.7 N·m de vuelco máx; en régimen ~T_tensión·r ≈ 8 N·m (cota de trabajo,
  //   hipótesis 6 bar); τ del eje y capacidad de prisioneros en verify()
  tauAdmMPa: 40.0,                // dis — acero C45 con seguridad amplia
  // la pareja AT10+LK30-RD RECOLOCADA (sin superposición — piezas del cliente):
  at10: {
    x: [32.0, 74.0],              // dis — tramo libre X −13…107 entre acople y
    //   63T de la calle 1 (127.06 − 20); la polea (42 de ancho) centrada en 53
    ancho: 42.0, pest: 112.0, bore: 65.0,        // step §4.5
    lk30rd: { largo: 66.0, dExt: 65.0, asiento: 30.063 },   // step inventario —
    //   cierra sobre el cuerpo Ø30 h7 del eje común (asiento medido Ø30.063)
    papel: 'toma de accionamiento auxiliar / giro de mantenimiento — material del cliente conservado montado y funcional',
  },
  // la banda AT10 DIMENSIONADA (desarrollo, dientes) para el kit del cliente:
  bandaAT10: {
    // el «drive kit w timming» del cliente sostiene su polea (UA-DRIVE PULLEY,
    // sin geometría en el STEP — §2.5/§5.7) entre los perfiles UA-T02:
    centroUAy: -136.9,            // step — (−123.91 + −149.91)/2 de los UA-T02
    entreCentros: 136.9,          // calc — árbol (Y 0) → UA (Y −136.9)
    zPerfil: 40.0,                // step — el perfil llega a Z ±40: una UA-DRIVE
    //   de más de Ø80 chocaría con él ⇒ la UA-DRIVE debe ser AT10-24T:
    uaDientes: 24,                // dis — primitivo 24×10/π = 76.394 (holgura 1.8
    //   al perfil); el propio kit del cliente era irrealizable con Ø112 (calc)
    dp32: 101.859, dp24: 76.394,  // web BELT-003 (fórmula normalizada z·p/π)
    // L = 2C + π/2·(Dp+dp) + (Dp−dp)²/(4C) = 273.8 + 279.98 + 1.18 = 554.96
    desarrollo: 554.96,           // calc — fórmula de correas (aprox. estándar)
    dientes: 56, Lnominal: 560,   // calc — AT10 es paso 10: banda de 56 dientes
    designacion: 'Optibelt ALPHA 25 AT10/560 (o corte de rollo 25AT10, PU + cordón de acero)',  // web BELT-004 (familia 25AT10 citada en /600; el
    //   tamaño 560 es múltiplo de paso estándar — confirmar disponibilidad)
    cRealNominal: 139.4,          // calc — C = (560 − 279.98 − 1.2)/2 con L=560
    nota: 'condicionada: la UA-DRIVE PULLEY no existe en el STEP (§2.5); si el cliente restaura su kit, éstas son las cifras. No se monta banda en el modelo.',
  },
  // lo que se RETIRA (step: no cabe a paso 76.2 — excedentes declarados):
  retirados: {
    'SH-04 (árbol individual 93.22)': 4,
    'SOPORTE MOTRIZ 2T/_MIR (env. 89.22)': 8,
    'SKF 1206 ETN9 (de los soportes 2T)': 8,
    'Polea AT10 32T (no cabe junto a la 63T: 82 > 76.2)': 3,
    'LK30-C65-20H7-D30-RD': 7,
  },
};

// ---------------------------------------------------------------------------
// 4-bis. EL EJE PIVOTE COMÚN Ø25 CON SUS UCFL 205 (cierre del defecto §5.3)
// ---------------------------------------------------------------------------
export const PIVOTE = {
  // el cliente modela 4 copias colineales de EJE-25mm-PASADOR (Ø25×603) y UNA
  // sola chumacera (X 504.1…539.8). Aquí va el eje físico ÚNICO y su apoyo −X:
  d: 25.0, largoNuevo: 615.4,     // dis — de X −78 a 537.4: entra 27 en el UC
  x0: -78.0, x1: 537.4,           //   de la chumacera −X nueva y LIBRA la caja
  //   del motorreductor principal (X hasta −82.4 step) por 4.4
  ucflNegX: { posX: -81.423, y: TENSOR.pivote.y, z: TENSOR.pivote.z },  // step —
  //   brida contra cara interior del chapón −X (ahí no cruza ningún manguito);
  //   ÓVALO HORIZONTAL (según Y) como la chumacera MEDIDA del cliente
  //   (Y −166.7…−36.7, step): así el housing libra el ala del canal TER1_MIR
  //   (Z −120, step); pernos M12×45 pasantes (taladros Ø14 nuevos, declarados)
  ucflPosXCaja: [504.09, 539.79], // step — la chumacera medida se conserva (CTX)
};

// ---------------------------------------------------------------------------
// 5. TORNILLERÍA FINA DE EXTREMOS + GUARDAS DEL POZO (punto 5)
// ---------------------------------------------------------------------------
export const EXTREMOS = {
  // por calle: el carro tensor CT-ENS del IDLER-ENS se fija al perfil con 4
  // M8×16 y 4 tuercas T (POSES MEDIDAS, inventario: tornillos en Y −1415.4…
  // −1428.4 a Z ±20, tuercas T en Y −1410.9…−1432.9 / −1448.1…−1470.1):
  ctens: { m8y: [-1421.89, -1421.89], m8z: [-20, 20], tY: [-1421.89, -1459.1] },
  // el drive kit (P1-1/P1-2) se fija al perfil norte con 4 M8×16 + tuercas T
  // (dis: mismas ranuras laterales, en las Y de los soportes medidos):
  driveKit: { m8y: [-60, -100], m8z: [-20, 20] },
};

export const GUARDAS = {
  // el pozo nuevo baja a Z −433.1 (fondo del lazo −433.06 calc del integrador)
  // y es un ATRAPAMIENTO ACCESIBLE (nip points banda↔polea en V1…V4). Cierre
  // perimetral de chapa plegada 14 GA (1.897, web CHAPA-TOL-001 del NBT90),
  // estilo del repo (extra.chapa con fibra y radio → desarrollo).
  t: 1.897, calibre: '14GA',
  //  · testa SUR: cuelga de la ranura inferior de los 5 perfiles sur (tuercas T
  //    M8 — el sistema del sorter). Plano y holguras (calc):
  sur: {
    y: -1385.0,                   // dis — bajada S de banda hasta −1377.5 (V1
    //   −1325 + R 50 + T + faceta ≈ −1377.5) → 7.5 de holgura; IDLER-ENS
    //   arranca en −1391.98 (step) → 6.98 al otro lado
    z: [-423.0, -40.0],           // dis — del fondo (10 sobre el suelo −433.1,
    //   drenaje/limpieza) al fondo del perfil (Z −40, step)
    x: [-73.0, 479.0],            // dis — cubre las 5 bajadas y muere a 2 de
    //   las guardas laterales (esquinas cerradas)
    alaSup: 30.0,                 // dis — ala horizontal contra el fondo del
    //   perfil, hacia +Y: muere en −1355, 7 antes de las pletinas de V1 (−1348)
  },
  //  · testa NORTE: el lazo cruza CUALQUIER plano YZ entre V3 y la motriz (la
  //    bajada V3↔V4 y el retorno llano a Z −52 lo atraviesan), así que el
  //    cierre norte va donde la bancada LAT TOP ya cierra de −433 a −113
  //    (step): una FRANJA de Z −118 a −60 pegada a su cara sur (Y −513.12),
  //    con pestañas atornilladas a la bancada (M8 roscados, declarados).
  //    El retorno llano pasa a Z −52.05: 7.95 de holgura sobre la guarda.
  norte: {
    y: -515.1,                    // dis — chapa PLANA pegada a la cara sur del
    //   LAT TOP (−513.12 step, 0.08 de holgura): se atornilla de frente
    z: [-118.0, -66.6],           // calc — el techo lo fija el RAMAL DE RETORNO, y
    //   con el accionamiento por tambor motriz ese ramal BAJÓ: su cara pasa de
    //   Z −52.05 (poleas 63T) a −57.833 (params_tambores RETORNO.zCara). Techo =
    //   ramal − 5 → −62.83, redondeado a −63; sigue solapando 5 la bancada LAT
    //   TOP por abajo (−113 step).
    //   SEGUNDA BAJADA (SC-10, 2026-08-03): al trazar el lazo con el espesor
    //   REAL de la banda plana (0.633 → 2.5) la cara exterior del ramal baja de
    //   −57.833 a −61.567, y este techo, que estaba clavado a mano, dejaba sólo
    //   1.43 mm a la banda en vez de los 5 que declara. Techo = −61.567 − 5 =
    //   −66.567 → −66.6. Es el mismo defecto que el travesaño de puente: una
    //   cota derivada escrita como número y que no bajó con su cadena.
    x: [-73.0, 479.0],            // dis — hasta 2 de las guardas laterales
  },
  //  · laterales: cierran los costados del pozo entre las dos testas, del canto
  //    inferior de los chapones (Z −114, step) para abajo; se atornillan a las
  //    PESTAÑAS plegadas de las testas (M8) — marco autoportante que no taladra
  //    el NBT90; el lado +X remete a X 481 para librar el side channel (alma
  //    exterior a 508.03 y ala interior ~487.5, calc de params_adapt):
  latNegX: { x: -75.0, z: [-423.0, -118.0] },   // dis — bajo el chapón −X (−81.4);
  //   lleva 3 ESCOTADURAS donde las ménsulas de la percha (PERCHA.mensulasY,
  //   Z −204.3…−164.3) atraviesan su plano — verificadas en compuerta
  latPosX: { x: 481.0, z: [-423.0, -340.3] },   // dis — SOLO bajo el fondo del
  //   NBT90 (Z −338.27, calc — 2 de holgura): el tramo −338…−253 lo cierra el
  //   propio módulo (canal base + side channel) y el −253…−114 es la rendija
  //   de 8.6 al chapón (declarada: da a la muesca, con el side de chapa detrás)
  escoteMensula: { w: 76.0, z: [-208.3, -160.3] },  // calc — ménsula 40×40 con sus
  //   4 M8 de placa frontal a ±29 (cabezas af13): ±38 cubre todo con margen
  pestana: 25.0,                  // dis — pestaña de esquina para el marco (M8)
};

// ---------------------------------------------------------------------------
// 6. GUÍAS LATERALES DEL CORREDOR DE DESCARGA (punto 6)
// ---------------------------------------------------------------------------
export const GUIAS = {
  // el bulto sale a +X sobre el campo de rodillos (Y −1161…−786, calc de
  // params_adapt §4). Las guías van FUERA de ese camino y dentro del corredor:
  ySur: -1180.0,                  // dis — 19 mm al sur del campo de rodillos
  yNorte: -767.0,                 // dis — 19 mm al norte
  x: [455.0, 525.4],              // dis — del fin de la ventana de la calle 5
  //   (EJES[4]+16 = 447.9 → +7 de margen) al alma sobre el canto (sin asomar
  //   del borde exterior 527.418)
  alturaSobrePlano: 60.0,         // dis — cara útil hasta Z 112.3; por debajo del
  //   CG de un bulto de ≥150 de alto — el STEP no declara el bulto: VALIDA CLIENTE
  t: 2.657, calibre: '12GA',      // cat/web — chapa 12 GA (CHAPA-TOL-001 NBT90)
  labioDeg: 30,                   // dis — labio superior abierto 30° (entrada suave)
  labio: 15.0,
  // anclaje: base de 3/16" SOLO sobre el CANTO superior del chapón de descarga
  // (Z 46.0, 28 de espesor — step §1.3/§5.1; más adentro invadiría la línea del
  // rodillo, que llega a X 487.4): 2 M8 ROSCADOS AL CANTO por guía
  // (modificación declarada); alma vertical soldada a la base porta la guía:
  base: { w: 28, d: 60, t: 4.763, zCanto: 46.0 },
  // EXCEPCIÓN DECLARADA del chequeo de pasillo (compuerta §L): las guías viven
  // sobre el plano de transporte en el corredor, FUERA del camino del bulto
  // (se verifica en §O que no invaden Y −1161…−786 ni asoman del borde).
  caminoBultoY: [-1161.0, -786.0],  // calc — campo de rodillos del NBT90 transformado
};

export default { CLEVIS, RETEN, IDLER, EJEC, PIVOTE, EXTREMOS, GUARDAS, GUIAS };
export { STEP, NBT, EJES, Xc, T, y0, y1, PERCHA, POZO, TENSOR, CALLE, bordeExtDescarga };
