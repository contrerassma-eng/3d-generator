// params.mjs — TABLA ÚNICA de cotas de la celda triple omnidireccional (CELDA3).
// Todo el ensamble sale de aquí; ningún módulo redefine una cota.
//
// Procedencia de cada valor (columna `src` en los comentarios):
//   dib  = DIBUJO TÉCNICO aportado por el usuario (rueda omni Ø48). Cota acotada,
//          no medida por píxeles: el dibujo trae los números.
//   cat  = CATÁLOGO del fabricante del componente comprado — capa `web`,
//          procedencia con URL y cita en analisis/web_facts.json.
//   usr  = AFIRMACIÓN DEL USUARIO (capa `user`). Se registra como afirmación,
//          no como hecho verificado.
//   dis  = DECISIÓN DE DISEÑO de este repositorio (capa `user`), con justificación.
//
// Ejes (ver CONTRATO.md):
//   Z = arriba. Z = 0 en el PLANO DE TRANSPORTE (donde apoya el bulto = tope de
//       las ruedas). Todo el mecanismo vive en Z negativo.
//   X, Y = plano horizontal. Origen en el centro de la celda.
// Unidades: mm.

export const P = {
  // ------------------------------------------------------------ rueda omni
  // Comprada. Cotas del dibujo del usuario; el usuario tiene 28 unidades.
  ruedaDia: 48.0,        // dib "Ø48.00"
  ruedaAncho: 24.50,     // dib "24.50" — ancho total de la rueda doble
  ruedaCubo: 18.70,      // dib "18.70" — ancho del cubo central
  ruedaCuboDia: 22.0,    // dis: cubo estimado del dibujo (no acotado explícito)
  ruedaBore: 4.0,        // usr "creo agujero 4mm" — SIN CONFIRMAR CON CALIBRE
  ruedaRodilloR: 5.0,    // dib "R5.00" — radio del rodillo libre
  ruedaCargaKg: 3.0,     // cat NEXUS 14148: "Load capacity: 3kg"
  ruedaMasaG: 40,        // cat NEXUS 14148: "Net weight: 40g"
  // Geometría interna de la rueda. El radio del eje de los rodillos sale de la
  // propia cota del dibujo: 24 − R5.00 = 19, y con ese radio el perfil abarrilado
  // r(h) = 24 − √(19² + h²) vale exactamente 5.00 en el centro. Que las dos cotas
  // encajen así confirma que la lectura del dibujo es la correcta.
  ruedaFilaSep: 6.20,    // dib "6.20" — media separación entre las dos filas
  ruedaPlatoEsp: 1.70,   // dib "1.70" — espesor del plato portarodillos
  ruedaPlatoDia: 38.0,   // dis: el plato no llega al círculo de rodadura
  ruedaNRodillos: 8,     // dis: 8 por fila, desfasadas media división (cat NEXUS: "Number of roller: 8")
  rodilloLargo: 11.0,    // dis: cabe en la mitad del ancho total (2 × 11 ≈ 24.5 − platos)
  ruedaTaladroD: 2.20,   // dib "Ø2.20" — 4 taladros de fijación
  ruedaTaladroR: 7.16,   // dib "7.16" — radio de esos taladros

  // ------------------------------------------------------------ motor TT
  // Comprado. 30 unidades (usuario). Cotas de catálogo Adafruit 3777.
  ttLargo: 70,           // cat "Body Dimensions: 70 x 22 x 18mm"
  ttAncho: 22,           // cat — ESTA es la dimensión a lo largo del eje de salida
  ttAlto: 18,            // cat
  ttEjeD: 5.5,           // cat — eje plano doble D, sale por las DOS caras
  ttEjeSale: 9,          // dis: voladizo del eje fuera de la caja reductora
  ttEjeDesdeExtremo: 10, // dis: el eje está a ~10 mm del extremo de la reductora
  // Reparto del largo de 70 mm entre reductora y campana del motor, y cotas de
  // los ejes planos. La reductora es la parte amarilla; la campana es el motor
  // «130» que asoma por el extremo.
  ttRedLargo: 37,        // dis: 70 − 33 de campana
  ttCampanaDia: 20.5,    // dis: motor tipo 130
  ttEjeAF: 3.7,          // dis: entrecaras del doble D de 5.5 (medir con calibre)
  ttFijacionB: 9,        // dis: taladro M3 de la reductora, medido desde el eje
  ttFijacionC: 8.5,      // dis: separación tangencial de los dos M3
  ttRelacion: 48,        // cat "Gear Ratio: 1:48"
  ttRpm6V: 200,          // cat "Min. Operating Speed (6V): 200+/- 10% RPM"
  ttParBloqueoKgcm: 0.8, // cat "Stall Torque (6V): 0.8kg.cm"
  ttMasaG: 30.6,         // cat "Weight: 30.6g"

  // ------------------------------------------------- rodamiento y eje rueda
  // 624ZZ: el bore de 4 casa con el agujero declarado de la rueda.
  rodBore: 4,            // cat 624ZZ
  rodOD: 13,             // cat 624ZZ
  rodW: 5,               // cat 624ZZ
  ejeDia: 4.0,           // dis: barra de acero plata Ø4 h6, casa rueda y 624ZZ

  // ------------------------------------------------- holguras del tren motriz
  // El bloque sobresale (bloqueEsp − rodW)/2 = 2.5 mm por detrás del rodamiento,
  // así que esta holgura tiene que ser mayor que eso o el bloque muerde la rueda.
  holguraRuedaRod: 4.0,  // dis: aire entre cara de rueda y rodamiento
  bloqueEsp: 10.0,       // dis: espesor del bloque impreso porta-rodamiento
  bloqueAncho: 26.0,     // dis: ancho del bloque (aloja el OD 13 + pared 6.5)
  bloqueAlto: 26.0,      // dis: alto del bloque
  acopleLargo: 16.0,     // dis: acople impreso TT(5.5 plano) → eje Ø4
  acopleDia: 14.0,       // dis
  acopleEncaje: 7.0,     // dis: cuánto entra el eje Ø4 en el acople
  holguraEntreEjes: 2.0, // dis: aire entre la punta del eje Ø4 y la del eje del TT
  holguraAcople: 2.0,    // dis: aire entre acople y cara de la reductora

  // ---------------------------------------------- bloque porta-rodamiento (impreso)
  bloqueBajoEje: 13.0,   // dis: cuánto baja el alma por debajo del eje
  bloqueTaladroSep: 18.0, // dis: separación de los dos M3 verticales
  bloqueTaladroProf: 12.0, // dis: profundidad roscada de esos M3

  // ------------------------------------------------ soporte del motor (impreso)
  soporteEsp: 4.0,       // dis: espesor del alma contra la reductora
  soporteAncho: 20.0,    // dis: ancho tangencial
  soporteAla: 18.0,      // dis: vuelo del ala que sube a la placa
  soportePieEsp: 4.0,    // dis
  soporteBrida: 6.0,     // dis: brida que abraza la reductora por debajo

  // ------------------------------------------------------- encoder (impreso + comprado)
  discoDia: 30.0,        // dis
  discoEsp: 2.0,         // dis
  discoNRanuras: 36,     // dis: 10° de resolución en el eje de la RUEDA
  discoRanuraR: 12.0,    // dis: radio medio de las ranuras
  discoRanuraAlto: 5.0,  // dis: alto radial de la ranura
  lmLargo: 32.0,         // dis: PCB del módulo LM393
  lmAlto: 14.0,          // dis
  lmEsp: 10.0,           // dis
  lmRanura: 5.0,         // dis: hueco de la horquilla (el disco es de 2)
  lmRanuraProf: 7.0,     // dis: cuánto entra el disco en la horquilla
  lmBrazo: 2.5,          // dis: brazos del optoacoplador
  lmBajoDisco: 9.0,      // dis: cuánto cuelga el PCB bajo el borde del disco

  // ------------------------------------------------------- geometría de celda
  // 3 ruedas a 120°. El EJE de cada rueda es RADIAL, de modo que su dirección de
  // rodadura es TANGENCIAL: es la disposición «kiwi», la única de las simples
  // que deja controlar (vx, vy, ω) — con ejes tangenciales la columna de ω se
  // anula y la celda no puede girar el bulto. Ver README.
  nRuedas: 3,            // dis (celda triple pedida por el usuario)
  // R = 76 y motor hacia el centro es el MÍNIMO que pasa la verificación exacta
  // de interferencias (barrido.sh) CON LA GEOMETRÍA REAL: hexágono de 203.9 mm
  // entre caras. Modelando envolventes en vez de piezas reales salía 71 mm; la
  // campana del motor y su soporte piden 5 mm más de radio. Ésa es la diferencia
  // entre un modelo que sirve para fabricar y uno que solo sirve para mirar.
  R: 76,                 // dis (barrido B-rep sobre geometría real)
  motorDentro: true,     // dis (barrido B-rep)
  motorTilt: 0,          // dis: giro del cuerpo del motor sobre su propio eje (°)

  // --------------------------------------------------------- placa hexagonal
  placaEsp: 5.0,         // dis: acrílico 5 mm o aluminio 3 mm (corte láser)
  placaHolgura: 8.0,     // dis: margen del hexágono sobre la pieza más externa
  ruedaSobresale: 5.0,   // dis: cuánto asoma la rueda sobre la placa
  ranuraHolgura: 3.0,    // dis: aire de la ranura de la placa alrededor de la rueda
  placaTaladroBorde: 6.0, // dis: distancia del taladro de unión al borde del hexágono
  placaTaladroSep: 0.18,  // dis: separación de la pareja de taladros, en fracción de af

  // ------------------------------------------------------------- módulo 3×3
  nCeldas: 9,            // usr: módulo de 9 celdas (3×3)
};

/** Par de bloqueo del TT en N·m (el catálogo lo da en kg·cm). */
export const ttParNm = () => P.ttParBloqueoKgcm * 0.0980665;

/** Velocidad de transporte a 6 V, m/s, con la rueda montada directa al motor. */
export const velocidad = () => (P.ttRpm6V * 2 * Math.PI / 60) * (P.ruedaDia / 2000);
