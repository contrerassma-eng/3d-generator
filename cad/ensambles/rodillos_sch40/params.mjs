// params.mjs — RC-SCH40-48 · rodillo transportador PLANO y CÓNICO sobre
// cañería ASTM A53 SCH 40 NPS 1-1/2".
//
// Procedencia de cada cota:
//   cat  = catálogo Damon del usuario (2.240.SHC.AFA / 2.640.SHJ.AFA rev A 17/3/16
//          y Rod.pdf de portarodamientos) — capa `doc`
//   med  = medido en píxeles sobre el plano rasterizado (ver ESCALA.md) — capa `measured-2D`
//   nor  = norma o datasheet con fuente en input/web_facts.json — capa `web`
//   dis  = decisión de diseño de esta sesión — capa `user`
//   req  = requisito explícito del usuario — capa `user`
//
// Ejes:  X = eje del rodillo (0 = cara INTERIOR del larguero izquierdo)
//        Y = transversal, Z = arriba.  mm.

export const P = {
  // ─────────────────────────────────────────────────────────── tubo (cañería)
  tubo: {
    norma: 'ASTM A53 Gr.B / ASME B36.10M — NPS 1-1/2 pulg, Schedule 40',
    od: 48.26,          // nor: 1.900" exacto (las tablas lo redondean a 48.3)
    pared: 3.68,        // nor: 0.145"
    id: 40.94,          // nor: tabla Cintac
    masaKgM: 4.05,      // nor
    odTolMas: 0.397, odTolMenos: 0.794,   // nor: ±1/64" para NPS ≤ 1-1/2
    paredTolNegPct: 12.5,                 // nor: A53 admite −12.5 %
    idPeorMin: 39.4, idPeorMax: 42.2,     // nor (derivado del apilado de tolerancias)
    densidad: 7.85e-3,  // g/mm³
  },

  // ────────────────────────────────────────────── cadena de cotas del catálogo
  // Confirmada por medición en píxeles: las líneas de referencia de las cotas
  // 553 / 531 / 522 caen en x = 888 / 993.5 / 1037 px → 11.0 y 4.55 mm. Ver ESCALA.md.
  EL: 532,             // cat: luz entre caras interiores de los largueros (BF = W+10)
  tuboLargo: 522,      // cat: W
  holguraTapa: 0.5,    // cat+med: juego tapa ↔ larguero, por lado
  salienteTapa: 4.5,   // cat+med: (531 − 522)/2 — cuánto asoma la tapa del tubo
  salienteEje: 10.5,   // cat+med: (553 − 532)/2 — saliente del eje respecto del larguero
  get sobreTapas() { return this.tuboLargo + 2 * this.salienteTapa; },   // 531
  get sobreEjes()  { return this.EL + 2 * this.salienteEje; },           // 553

  // ───────────────────────────────────────────────────────────────── rodamiento
  rodam: {
    desig: '6201-2Z',
    bore: 12, D: 32, w: 10,      // nor: datasheet SKF
    C_kN: 7.28, C0_kN: 3.1,      // nor: datasheet SKF 6201-2Z
    alternativa: '6002-2Z (15×32×9) — mismo alojamiento D2=32, eje Ø15',
  },

  // ───────────────────────────────────────────────────── tapa portarodamiento
  // Portarodamiento de catálogo **SKPB4812-2.0** — el de tubo de 2 mm de pared:
  // brida F=48, cuerpo de prensa **D=44**, alojamiento D2=32, rodamiento 6201ZZ.
  // Se elige el de 2.0 en vez del de 1.5 (D=45) porque su Ø44 deja 2.13 mm de
  // pared en el contrataladro en lugar de 1.63.
  //
  // LARGO: el catálogo no lo tabula, pero el croquis "Type 1" de la lámina sí
  // está a escala. Medido en píxeles con ancla en el barreno d = 12.1
  // (0.063351 mm/px; con esa escala la brida sale 48.37 contra 48 nominal,
  // 0.8 % de error): **12.42 mm**. Ese croquis está dibujado para la variante
  // de 6001 (D2 = 28, aro de 8 de ancho); nuestro 6201 es de 10 de ancho, así
  // que 12.42 + 2 = **14.5**. Concuerda con los H = 12 que el propio catálogo
  // publica para la serie SKP de este porte. Detalle en ESCALA.md.
  tapa: {
    largo: 14.5,        // med (croquis Type 1) + 2 por el ancho del 6201
    saliente: 4.5,      // cat+med
    boreFrontal: 14,    // dis: paso holgado del eje Ø12
    // El morro embutido va ENTERO fuera del tubo (h 0…4.5); en h = 4.5 está la
    // testa del tubo y desde ahí entra el cuerpo de prensa. Si la brida Ø48
    // invadiera h > 4.5 se metería dentro de la pared del tubo (interferencia).
    domo: [[0, 7.0], [0, 11.0], [1.0, 13.5], [2.4, 18.0], [3.6, 22.4], [4.5, 24.0]],  // dis
    bridaD: 48,         // cat: F de la serie SKPB48xx
    prensaD: 44,        // cat: D de la SKPB4812-2.0
    asientoD: 32,       // cat: D2 → aloja 6201/6002
    asientoH0: 2.5, asientoH1: 12.5,   // el rodamiento va detrás del morro embutido
    frenteH: 1.5,       // dis: espesor de la pared frontal embutida
    hombroD: 28,        // dis: tope axial del aro exterior
    faldonD: 39,        // dis: alivio interior del faldón (h 12.5…14.5)
    material: 'acero al carbono embutido zincado (catálogo) — alt. SAE 1020 torneado',
    materialImpreso: 'PA6-CF / PA12-CF (variante impresa, ver README §Tapa impresa)',
  },

  // ─────────────────────────────────────────── contrataladro (¡crítico!)
  // El ID real de la SCH40 es 40.94 nominal y 39.4…42.2 con tolerancia de
  // laminación: NINGUNA tapa de catálogo entra, y el ID en bruto no es asiento.
  // Ø44 = cuerpo de prensa de la SKPB4812-2.0 → deja 2.13 mm de pared (1.73 en
  // el peor caso de laminación). Profundidad 14 contra los 10 de tapa que
  // entran: la posición axial la fija la BRIDA contra la testa del tubo, no el
  // fondo, así que sobran 4 mm por si la tapa real es más larga que los 14.5.
  contra: { d: 44, tol: 'H8', prof: 14, Ra: 3.2 },   // dis

  // ─────────────────────────────────────────────────────────────────── eje
  // req: "un eje redondo, que puede ser de doce milímetros, y le hago una cara
  // plana en los terminales". Es PASANTE (ver README §Resorte).
  // El material se decidió por COSTO, no sólo por tolerancia: el acero plata se
  // vende en barras de 1 m (ISESA), y con un eje de 553 sale UN eje por barra —
  // 45 % de desperdicio y ~20× el costo. El SAE 1045 trefilado viene en barras
  // de 6 m (10 ejes por barra) pero en h11, que es demasiado holgado para el
  // asiento del rodamiento. Solución: barra h11 y rectificar a g6 SÓLO los 40 mm
  // de cada punta, que es donde el aro interior corre. Ver ABASTECIMIENTO.md.
  eje: {
    d: 12,
    tol: 'g6',          // nor: aro interior estacionario que DEBE deslizar → g6 (NTN tabla 7.2(1))
    tolBarra: 'h11',    // nor: como viene el trefilado de catálogo (Otero, ISO 286-2)
    zonaAjustada: 40,   // dis: largo rectificado a g6 desde cada punta
    entrecaras: 11,     // req
    largoPlano: 12,     // dis: cubre el saliente de 10.5 sin llegar a la garganta
    material: 'SAE 1045 trefilado Ø12 h11 en barra de 6 m, rectificado a g6 en 40 mm de cada punta',
  },

  // ───────────────────────────────────────────────────────── seguros y resorte
  anillo: { norma: 'DIN 471', d: 12, ranuraD: 11.5, ranuraW: 1.1, esp: 1.0, prof: 0.25 },  // nor
  resorte: {
    de: 18, alambre: 1.4, nTotal: 7.5,   // dis
    get di() { return +(this.de - 2 * this.alambre).toFixed(2); },
    get solido() { return +(this.nTotal * this.alambre).toFixed(2); },
    libre: 32,          // dis
    montado: 26,        // dis: longitud con el eje centrado
    G_MPa: 79300,       // nor: acero para resortes
    get nActivas() { return this.nTotal - 2; },
  },

  // ────────────────────────────────────────────── canales para correa redonda
  // cat+med: 2 canales, centro del 1º a 35 de la CARA EXTERIOR DE LA TAPA,
  // paso 30, fondo Ø38.5, perfil de UN SOLO ARCO R5 (verificado en píxeles:
  // ancho medido a Ø45.4 = 9.53 mm; el arco R5 predice 9.51).
  canal: { c1DesdeTapa: 35, paso: 30, fondoD: 38.5, r: 5, correaMax: 5, libreAntesCamisa: 8 },

  // ──────────────────────────────────────────────────────── camisas cónicas
  // cat: la tabla WT/D1/D2 es UN SOLO CONO. k = (D2−D1)/WT = 0.06289 en las 18
  // filas. Confirmado por Damon ("Taper: 3.6°") e Interroll ("shaft ... 1.8°")
  // y por medición en píxeles (k medido 0.0645). Regla: R = D1/k − c.
  camisa: {
    k: 0.06289,        // cat
    D1: 55.6,          // cat
    idAjuste: 48.5,    // dis: deslizante sobre la cañería Ø48.26
    inicioDesdeTestaTubo: 15,  // cat+med (el plano exige "min.8"; medido ≈15)
    segmentos: 3,      // dis
    pared: 4.0,        // dis
    cubo: 10.0,        // dis
    material: 'PA6 negro antiestático (catálogo) — impreso: PA6-CF / PA12-CF',
  },

  // ──────────────────────────────────────────────────────── hipótesis de carga
  carga: { N: 500, v: 0.5, horas: 20000 },   // dis: a confirmar por el usuario

  holgura: { deslizante: 0.2, pasante: 1.6 },

  // ───────────────────────────── envolvente del módulo (la usa _check.mjs)
  zEje: 60, yPlano: 0, yConico: 150,
  largo: 553, anchoExt: 300, altoTotal: 110,
};

// ───────────────────────────────────────────────── posiciones globales derivadas
export const X = {
  get tapaIzqX0() { return P.holguraTapa; },                            // 0.5
  get tuboX0()    { return P.holguraTapa + P.salienteTapa; },           // 5.0
  get tuboX1()    { return this.tuboX0 + P.tuboLargo; },                // 527.0
  get tapaDerX0() { return P.EL - P.holguraTapa - P.tapa.largo; },      // 507.0
  get ejeX0()     { return -P.salienteEje; },                           // −10.5
  get ejeLargo()  { return P.sobreEjes; },                              // 553
  // rodamientos: asiento h 6…16 de cada tapa
  get rodamIzqX0() { return +(P.holguraTapa + P.tapa.asientoH0).toFixed(2); },        // 6.5
  get rodamIzqX1() { return +(this.rodamIzqX0 + P.rodam.w).toFixed(2); },             // 16.5
  get rodamDerX1() { return +(P.EL - P.holguraTapa - P.tapa.asientoH0).toFixed(2); }, // 525.5
  get rodamDerX0() { return +(this.rodamDerX1 - P.rodam.w).toFixed(2); },             // 515.5
};

/** Ø de la camisa cónica a una distancia `s` (mm) del extremo menor DEL CONO. */
export const diaCono = (s) => +(P.camisa.D1 + P.camisa.k * s).toFixed(2);

/** Constante elástica de un resorte helicoidal de compresión (N/mm). */
export const kResorte = () => {
  const { G_MPa: G, alambre: d, de } = P.resorte, Dm = de - d, n = P.resorte.nActivas;
  return +((G * d ** 4) / (8 * Dm ** 3 * n)).toFixed(3);
};

export const enPulg = (mm) => `${(mm / 25.4).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}"`;
export default P;
