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

  // ------------------------------------------------------------ motor TT
  // Comprado. 30 unidades (usuario). Cotas de catálogo Adafruit 3777.
  ttLargo: 70,           // cat "Body Dimensions: 70 x 22 x 18mm"
  ttAncho: 22,           // cat — ESTA es la dimensión a lo largo del eje de salida
  ttAlto: 18,            // cat
  ttEjeD: 5.5,           // cat — eje plano doble D, sale por las DOS caras
  ttEjeSale: 9,          // dis: voladizo del eje fuera de la caja reductora
  ttEjeDesdeExtremo: 10, // dis: el eje está a ~10 mm del extremo de la reductora
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

  // ------------------------------------------------------- geometría de celda
  // 3 ruedas a 120°. El EJE de cada rueda es RADIAL, de modo que su dirección de
  // rodadura es TANGENCIAL: es la disposición «kiwi», la única de las simples
  // que deja controlar (vx, vy, ω) — con ejes tangenciales la columna de ω se
  // anula y la celda no puede girar el bulto. Ver README.
  nRuedas: 3,            // dis (celda triple pedida por el usuario)
  // R = 71 y motor hacia el centro es el MÍNIMO que pasa la verificación exacta
  // de interferencias (barrido.sh): da hexágono de 207.4 mm entre caras. Con el
  // motor hacia afuera el mínimo es R = 49 y el hexágono sale mayor, 210.9 mm.
  R: 71,                 // dis (barrido B-rep)
  motorDentro: true,     // dis (barrido B-rep)
  motorTilt: 0,          // dis: giro del cuerpo del motor sobre su propio eje (°)

  // --------------------------------------------------------- placa hexagonal
  placaEsp: 5.0,         // dis: acrílico 5 mm o aluminio 3 mm (corte láser)
  placaHolgura: 8.0,     // dis: margen del hexágono sobre la pieza más externa
  ruedaSobresale: 5.0,   // dis: cuánto asoma la rueda sobre la placa
  ranuraHolgura: 3.0,    // dis: aire de la ranura de la placa alrededor de la rueda

  // ------------------------------------------------------------- módulo 3×3
  nCeldas: 9,            // usr: módulo de 9 celdas (3×3)
};

/** Par de bloqueo del TT en N·m (el catálogo lo da en kg·cm). */
export const ttParNm = () => P.ttParBloqueoKgcm * 0.0980665;

/** Velocidad de transporte a 6 V, m/s, con la rueda montada directa al motor. */
export const velocidad = () => (P.ttRpm6V * 2 * Math.PI / 60) * (P.ruedaDia / 2000);
