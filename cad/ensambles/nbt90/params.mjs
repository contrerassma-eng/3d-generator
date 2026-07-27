// params.mjs — TABLA ÚNICA de cotas de la transferencia 90° de bandas angostas
// (Hytrol ProSort MRT 90° Transfer). Todo el ensamble sale de aquí; ningún
// módulo redefine una cota.
//
// Procedencia de cada valor (columna `src` en los comentarios):
//   med  = MEDIDO sobre las vistas del usuario con tools/med_px.py, escala
//          k = 0.6320 mm/px (ver ESCALA.md; anclada al paso de 3" sobre 5 pasos
//          consecutivos y confirmada por 8 piezas de catálogo).
//   cat  = dato de CATÁLOGO del fabricante (lista de partes pág. 13 del manual
//          Hytrol bulletin 656, o ficha del componente) — capa `web`,
//          procedencia en analisis/web_facts.json.
//   txt  = TEXTO del manual (procedimiento de ajuste, pág. 8).
//   dis  = DECISIÓN DE DISEÑO de este repositorio (capa `user`), tomada cuando
//          el dibujo no alcanza a definir la pieza. Lleva justificación.
//
// Ejes:  X = eje de los rodillos (= flujo del transportador anfitrión)
//        Y = expulsión a 90° (los rodillos se reparten a lo largo de Y; las
//            bandas angostas del clasificador corren en X, entre rodillo y rodillo)
//        Z = arriba, Z = 0 en la cara inferior del bastidor.
// Unidades: mm. Estado modelado: ELEVADO (carrera aplicada).

const IN = 25.4;
const p = (f) => Math.round(f * IN * 1000) / 1000;   // pulgadas → mm exactos

export const P = {
  // ---------------------------------------------------------------- escala
  escala: { mm_px: 0.6320, ancla: 'paso 3" = 76.2 mm sobre 120.56 px (5 pasos)', ver: 'ESCALA.md' },

  // ------------------------------------------------------- configuración BR
  BR: p(18),                       // med 459.7 → 18" entre almas de los canales laterales
  paso: p(3),                      // med 76.2 (120.56 px) · cat: regletas del ProSort a 3"
  nRodillos: 6,                    // med (6 círculos a paso 3" = BR − 1)
  nBandas: 5,                      // med (5 secciones a media distancia entre rodillos)

  // ------------------------------------------------------- rodillos (item 3)
  // cat SA-036881 "VULCANIZED 138 ROLLER ASSEMBLY": Ø1-3/8" vulcanizado.
  rodDia: p(1.375),                // 34.93 · med 34.92 (coincidencia 0.03 %)
  rodTubo: p(1.19),                // dis: tubo de acero bajo el vulcanizado (e≈3 mm de goma)
  rodCara: 375,                    // med 594 px de la vista derecha
  rodHex: p(0.3125),               // 7.94 — eje hexagonal 5/16" · med 8.53 · cat (Hytrol usa
                                   // 7/16" en Ø1.9" y 5/16" en Ø1-3/8")
  rodPared: 1.5,                   // dis: tubo 16 GA
  rodRodam: { bore: 8, od: 22, w: 7 },  // dis: rodamiento de rodillo de transporte (608-2RS)
  rodVulcE: 3.0,                   // dis: espesor del vulcanizado (Ø tubo → Ø1-3/8")

  // -------------------------------------------- bandas angostas del anfitrión
  // No son parte de la transferencia: se modelan como CONTEXTO para verificar
  // que los rodillos emergen limpios entre ellas.
  bandaAncho: p(1),                // cat FLEXPROOF 1 in. WIDE · med 26.6 en el ramal de retorno
  bandaEsp: 2.5,                   // med 2.53
  regletaAncho: p(1.25),           // med 32.9 en el ramal portante (banda + regleta UHMW)
  regletaEsp: p(0.375),            // dis: regleta de desgaste UHMW 3/8"
  bandaRetornoDZ: 61.4,            // med 48.5/0.5277·0.632 — separación portante ↔ retorno

  // --------------------------------------------------------- alturas (Z, mm)
  planoBanda: 390.6,               // med y=347 px — cara superior de las bandas del anfitrión
  carrera: 10.0,                   // txt "0.394—MOVEMENT" = 10 mm exactos
  emerge: p(0.25),                 // txt cota 1/4" — cuánto sobresale el rodillo al elevar
  // eje del rodillo elevado: la generatriz superior queda `emerge` sobre el plano
  get rodZ() { return this.planoBanda + this.emerge - this.rodDia / 2; },      // 379.5
  get rodZbajo() { return this.rodZ - this.carrera; },                          // 369.5

  idlerZ: 252.9,                   // med y=564.8 px — eje de las poleas locas del serpentín
  motrizZ: 198.9,                  // med y=650.25 px — eje del motorreductor y la rueda motriz
  retornoZ: 176.6,                 // med y=685.5 px — ejes de las 2 poleas de retorno
  rielInfZ: 143.5,                 // med y≈738 px — riel inferior (pasa el ramal de retorno)
  canalTopZ: 383.1,                // med y=359 px — ala superior del canal lateral
  canalBotZ: 220.6,                // med y=616 px — ala inferior del canal lateral
  jackSupZ: 215.9,                 // med y=623.5 px — ménsula superior del jack bolt
  jackInfZ: 83.4,                  // med y=833 px — ménsula inferior del jack bolt
  baseZ: 18.0,                     // med y≈936 px — traviesa de base
  altoTotal: 390.6,                // med 618 px

  // ------------------------------------------------- posiciones en Y (across)
  get rodY() {                     // 6 rodillos a paso 3", centrados
    const n = this.nRodillos, s = this.paso;
    return Array.from({ length: n }, (_, i) => +((i - (n - 1) / 2) * s).toFixed(2));
  },
  get bandaY() {                   // 5 bandas, a media distancia entre rodillos
    const n = this.nBandas, s = this.paso;
    return Array.from({ length: n }, (_, i) => +((i - (n - 1) / 2) * s).toFixed(2));
  },
  almaY: 229.9,                    // med x=159/886 px — alma de los canales laterales (±)
  jackY: 247.4,                    // med x=131/914 px — jack bolts (±)
  anchoExt: 534.7,                 // med 846 px — punta a punta de las alas

  // -------------------------------------------------- posiciones en X (largo)
  largo: 463,                      // med 386.5/0.5277·0.632 — largo del módulo (SIDE CHANNEL 18")
  rodX0: 44,                       // med 67.4 px→mm — arranque de la cara del rodillo
  get rodX1() { return this.rodX0 + this.rodCara; },
  planoSerp: 85,                   // dis: plano del serpentín, dentro de la cara del rodillo
                                   // y junto a la placa lateral motriz (med: la banda se ve
                                   // en el extremo izquierdo de la vista derecha)
  placaT: p(0.1875),               // med 4.6–4.9 — placas laterales de 3/16"

  // ------------------------------------------------ transmisión (items 9,17,20)
  ruedaDia: p(2.5),                // cat 024.15502 FLAT BELT DRIVE WHEEL 2-1/2" · med 63.33
  ruedaAncho: p(1.772),            // cat 45.0
  idlerDia: p(2.5),                // med 64.5 · cat 923.00975 lista 2-3/4"; manda lo medido
                                   // (a paso 76.2 el Ø2-3/4" dejaría solo 6 mm entre locas)
  idlerAncho: p(1.4),              // cat 35.6
  // Eje de las poleas locas. La vista da 14.2 (9/16"), pero **9/16" no tiene
  // rodamiento de catálogo**: la serie R salta de R8 (1/2") a R10 (5/8"). Al
  // pasar las locas de buje de bronce a rodamiento (petición del usuario), el
  // eje sube al tamaño comercial más cercano, 5/8", que además es coherente con
  // que todo el equipo es imperial (el propio despiece lista tornillo de hombro
  // de 5/8", 042.512). Med → dis, y la desviación queda declarada: +1.6 mm.
  idlerEje: p(0.625),              // 15.88 — 5/8" g6, para 2 × R10-2RS por polea
  idlerEjeMedido: p(0.5625),       // med 14.2 (9/16") — lo que se lee en el dibujo
  idlerRodam: { bore: p(0.625), od: p(1.375), w: p(0.3125), desig: 'R10-2RS' },
  retornoDia: p(2.5),              // med 64.5 — poleas de retorno inferiores
  retornoY: 144.5,                 // med x=294/751 px (±)
  serpAncho: p(1),                 // cat 069.722xx FLEXPROOF ENDLESS BELT 1 in. WIDE
  serpEsp: 2.5,                    // med 2.53 (2 telas + cubierta)
  tomaCarrera: 48.6,               // med 40.6/0.5277·0.632 — recorrido de la colisa del tensor
  tomaIdlerIdx: 3,                 // med: la polea loca tensora es la 4.ª de 5 (x=643 px)

  // motorreductor SEW RF07DRS71S4 — cat 300.0322: 1/2 hp, 230/460/3, 462 rpm
  motorDia: 145,                   // med 145.0 (carcasa DRS71)
  motorLargo: 314,                 // med 262.3/0.5277·0.632
  motorEjeDia: 20,                 // cat: eje Ø20 (buje sin chaveta 20 mm ID)
  bujeDia: 45,                     // cat 099.128420 KEYLESS BUSHING 20 mm ID × 45 mm OD
  bujeLargo: 42,                   // dis (tipo Trantorque 20 mm)
  bujePar: 169,                    // txt "tighten trantorque bushing 1500 in lbs" → N·m
  reductorL: 120,                  // med bloques del reductor
  reductorH: 150,                  // med
  motorRpm: 462,                   // cat
  motorHP: 0.5,                    // cat

  // ------------------------------------------------ elevación y neumática (18,12,16,19)
  mesaBore: 100,                   // cat 923.01022 GUIDE TABLE - 100 mm BORE, 20 mm STROKE
  mesaCarrera: 20,                 // cat (la carrera útil del transfer es `carrera` = 10)
  mesaPlaca: [170, 200],           // cat: envolvente de la mesa guía (SMC MGF100)
  mesaAlto: 106,                   // cat (cuerpo + placa, retraída)
  tuboOD: p(0.3125),               // med 8.5 — tubo neumático de 5/16" (1/4" nominal)
  valvula: [72, 46, 60],           // cat 094.10795 válvula 4 vías monosolenoide 24 VDC
  canalCilY: 234,                  // med 195.2/0.5277·0.632 — canal de montaje del cilindro
  canalCilZ: 103,                  // med 86/0.5277·0.632

  // ------------------------------------------------------ chapa y tornillería
  cal12: p(0.1046),                // 12 GA = 2.657 — canales y chapa del bastidor (med 2.53)
  cal14: p(0.0747),                // 14 GA = 1.897 — guardas
  canalAlto: p(6.5),               // med 166.8 — canal lateral 6-1/2" × 1-1/2" 12 GA
  canalAla: p(1.5),                // med 37.3
  radioPliegue: p(0.1046),         // dis: radio interior = espesor (regla de taller)
  factorK: 0.44,                   // dis: acero al carbono conformado en prensa

  // tornillería del manual (txt pág. 8: "3/8 in. bolts", "3/8 locknut")
  M: {
    b38: { d: p(0.375), af: p(0.5625), hh: p(0.234), tuerca: p(0.328) },   // 3/8-16 UNC
    b516: { d: p(0.3125), af: p(0.5), hh: p(0.196), tuerca: p(0.273) },    // 5/16-18
    b14: { d: p(0.25), af: p(0.4375), hh: p(0.163), tuerca: p(0.226) },    // 1/4-20
  },
  holgura: { pasante: 1.6, deslizante: 0.2, colisa: 3.2 },                 // dis

  // --------------------------------------------------------------- cargas
  cargaMaxKg: 34,                  // dis: bulto máximo típico de un MRT (75 lb)
  velocidad: 0.9,                  // dis: v = π·Ø·rpm/60 con Ø34.93 y 462 rpm ≈ 0.845 m/s
};

/** Cota nominal en pulgadas de un valor en mm (para rótulos de plano). */
export const enPulg = (mm) => `${(mm / IN).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}"`;

export default P;
