// params.mjs — TABLA ÚNICA de cotas de la LÍNEA NO-LABEL (módulo de lectura y
// clasificación de cajas de cereza). Todo el ensamble sale de aquí; ningún
// módulo redefine una cota.
//
// Procedencia de cada valor (regla de oro del repo, tres capas):
//   web  = dato de catálogo/fabricante con cita en
//          projects/NOLABEL/input/web_facts.json (clave entre paréntesis).
//   cad  = dimensión tomada de un modelo CAD ya presente en los repos
//          (catálogo de componentes, M-haste mb400.py, omniwheel.md del
//          simulador). Se cita el archivo.
//   dis  = DECISIÓN DE DISEÑO de Conveyone (capa `user`), con justificación.
//   pc   = POR CONFIRMAR: valor de trabajo SIN fuente. Permite cerrar la
//          geometría pero NO se compra ni fabrica hasta que Sergio lo fije.
//
// Ejes: X = flujo (0 = nariz de entrada del primer omni) · Y = ancho (+Y =
// IZQUIERDA mirando aguas abajo; la derecha es −Y) · Z = arriba, Z = 0 en el
// PLANO DEL PRODUCTO (cara superior de ruedas/bandas). Unidades mm.

const IN = 25.4;
const r2 = (v) => Math.round(v * 100) / 100;

export const P = {
  // ------------------------------------------------------------ generales
  Hprod: 800,                 // pc: altura del plano de producto sobre el piso (mesa inox de planta ≈ 800 en foto)
  gapEq: 10,                  // dis: hueco nariz a nariz entre equipos
  gapMotor: 40,               // dis: hueco MB400→omni 2 (el motorreductor lateral del MB400 sobresale 29 de su nariz; 40 lo libra de la guarda del omni)
  lado: -1,                   // dis: lado de REFERENCIA (omni 1) y de SALIDA a 90° (omni 2) = derecha (−Y), según croquis
  anchoLinea: 24 * IN,        // cad: 609.6 — ancho estándar 24" del simulador (CFG.width) y del omni (omniwheel.md)

  // cajas de trabajo — pc: no hay ficha de NO-Label; placeholders del simulador
  caja: {
    chica:  { L: 300, W: 200, H: 150 },   // pc (boxTypes 'Caja chica' del simulador)
    grande: { L: 400, W: 300, H: 200 },   // pc: la caja "grande" sale a 90°
  },

  // -------------------------------------------------- bloque OMNI (CV-OMW)
  omni: {
    L: 24 * IN, W: 24 * IN,   // cad: largo FIJO 24" y ancho 24" (omniwheel.md · OMNI_LEN)
    filas: 8, paso: 3 * IN,   // cad: paso de grilla 3" (OMNI_SP=76.2) → 8 filas en 609.6 · render del usuario: 8 filas
    porFila: 7, pasoY: 3 * IN, // cad: 7 ruedas por fila a paso 3" (omniwheel.md: nz = ancho útil/76.2). NOTA: el render del usuario muestra 4 por fila; con 4 a paso 139 la caja chica W200 apoya en 1 sola columna (G1 falla) → se adopta la grilla del simulador y se deja como ABIERTA
    rueda: { D: 60, B: 38, cuboD: 26, nRod: 6, rodD: 16, rodL: 22, rodAng: 45 },   // pc: rueda omni Ø60×38, 6 rodillos a 45° (a confirmar con proveedor)
    ejeD: 15,                 // dis: eje Ø15 por fila, rodamiento 6002 (15×32×9) en cada placa
    rodamiento: { bore: 15, od: 32, w: 9 },   // web (din625_6002): rodamiento rígido 6002
    placa: { t: 6, alto: 90, topZ: -6 },      // dis: PL6 laterales; su canto queda 6 bajo el plano (la corona asoma); 90 de alto según proporción del render
    tapa: { t: 3, z: -9, holg: 3 },           // dis: tapa negro mate 3 mm con ventanas rueda + 3 mm por lado
    oreja: { w: 80, d: 60, t: 8, n: 3, z: -60, agujero: 11 },   // dis: 3 orejas de anclaje por lado (render) con 2 × Ø11 (M10)
    carcasa: { h: 70, margenY: 40 },          // dis: cubeta inferior de drivers (negro mate); altura total del bloque ≈ 166 (render: bloque bajo)
    motorFila: { D: 48, L: 60, carcasa: [70, 62, 92], pot_W: 60, V: 24 },   // render del usuario: un motorreductor por fila en carcasa ventilada lateral; 60 W / 24 VDC (omniwheel.md: 1 UniDrive por fila); Ø48×60 pc
    fotocelula: { xFrac: 0.82, cuerpo: [24, 24, 86], ojo: [22, 16, 22] },   // cad: fotocélula a 0.82·L (omniwheel.md); cuerpo del simulador
    guia: { t: 20, h: 60, z: 2 },             // dis: guía de referencia UHMW 20×60 sobre el lado de referencia (omni 1)
  },

  // ------------------------------------------- M-haste MB400 (módulo banda)
  mb400: {
    sprocketD: 90, sprocketW: 28,   // cad: mb400.py MB400Params.sprocket_d / sprocket_w
    ejeD: 25,                       // cad: shaft_d
    modulo: 50, bandaT: 6,          // cad: module_pitch / belt_thk
    tira: { w: 18, h: 8, cada: 80 },// cad: tiras de desgaste UHMW 18×8, 1 cada ≈80 mm
    placaExt: 10,                   // cad: placa de extremo 10 mm
    rodamientoBloque: [60, 40, 40], // cad: rodamiento con soporte (UCF) 60×40×40
    riel: 40,                       // cad: bastidor T-slot 40×40 (MB400-PF-40)
    pata: { w: 40, d: 80 },         // cad: MA4080 (pata UGN)
    pie: { D: 56, h: 50 },          // cad: pie nivelador M12 Ø56
    motor: { cuerpo: [160, 96, 72], placa: [95, 95, 8] },   // cad: MT-GM-160x72 + placa 95×95×8
    guiaLA: { t: 6, h: 30 },        // cad: guía lateral LA 6×30
    // twin belt (CV-TWB-MB400) — "mientras": 2 carriles MB400 con ventana de lectura central
    twin: {
      L: 1500,                 // dis: largo nariz a nariz (incluye zona de disparo + ventana alargada)
      Wcarril: 200,            // cad: ancho mínimo MB400 (validate: W ≥ 200)
      ventana: 100,            // dis: hueco entre carriles = ventana de cámara (< W caja chica − 2·40)
      xVentana: 750,           // dis: centro de la capota / zona de lectura desde la nariz de entrada
      Lventana: 500,           // dis: tramo de ventana central (sin función óptica con cámara superior; reservado para una 2ª cámara inferior)
      // CAPOTA DE CÁMARA — cotas MEDIDAS del STEP del usuario (projects/NOLABEL/input/referencias/box_camara_step_medidas.json):
      // túnel 864 × 856 × 716 abierto por abajo, cabeceros de 80.5, paneles 30/45, cubrejunta 700×60×30, 4 pads 100×100×30
      capota: {
        L: 1200,               // dis: ALARGADA desde 863.9 (pedido del usuario "hay que alargar"): la caja grande queda entera adentro con ≥300 de margen por lado
        W: 856, H: 716.3,      // cad (STEP): ancho y alto exteriores
        cabecero: 80.5, panel: 30, frontal: 45, cubrejunta: [700, 60, 30], pad: [100, 100, 30],   // cad (STEP)
        zBase: 60,             // dis: borde inferior 60 sobre el plano del producto (libra guías LA 30 + teflón 60 → el teflón pasa por la abertura)
        abertura: { W: 520, H: 320 },   // dis: paso de cajas en cada cabecero (caja grande 300 ancha / 200 alta + luz)
        camara: { cuerpo: [60, 60, 90], lenteD: 30, fovDeg: 75 },   // pc: cámara industrial mirando ABAJO desde el techo (óptica a confirmar con Yolotech)
        led: { L: 600, s: 25 },         // dis: 2 barras LED bajo el techo, a los lados del eje de la cámara
        pata: { w: 40, d: 40 },         // dis: 4 patas 40×40 al piso, fuera del bastidor del twin
      },
      teflon: { t: 15, h: 60, flare: 350, flareMaxDeg: 30 },   // dis: guarda UHMW 15×60 con embudo de entrada de 350 mm (≤30°): lleva la caja desde la guía del omni 1 al centro de la ventana
      sensor: { cuerpo: [20, 30, 50] },          // dis: fotocélula de disparo réflex + espejo
    },
    // transportador MB400 de 4000 (CV-MB400-4000) — "después": separa (gapper) y transporta hasta el omni 2
    largo: { L: 4000, W: 400, pasoPatas: 1333.3 },   // dis: L 4000 (pedido), W 400 (cad: default MB400), patas cada ≤1400
  },

  // ----------------------------------- cinta plana perpendicular de salida
  cinta: {
    L: 2000, W: 500,            // dis: 2.0 m de salida; 500 ≥ L caja grande (400) + 2×50 porque la caja sale con su largo atravesado
    tamborD: 89, tamborT: 4,    // dis: tambor Ø89 tubo 4 mm (3½")
    bandaT: 3,                  // dis: banda PVC 2 capas 3 mm
    cama: 3,                    // dis: cama deslizante PL3
    canal: { h: 120, ala: 40, t: 4 },   // dis: canal C 120×40×4 por lado
    drop: 15,                   // dis: la cinta recibe 15 mm bajo el plano de producto
    motor: { cubo: [56, 84], cuerpo: [96, 86, 92] },   // cad: motorreductor_eje_hueco (catálogo, nominal)
    pata: { w: 40, d: 80 }, pie: { D: 56, h: 50 },
  },
};

export { IN, r2 };
