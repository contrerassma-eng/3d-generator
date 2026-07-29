// elevacion.mjs — SISTEMA DE ELEVACIÓN (pop-up) Y NEUMÁTICA de la transferencia
// 90° de bandas angostas (Hytrol ProSort MRT 90° Transfer).
//
// Contenido (reparto del CONTRATO.md §6):
//   · cilindro compacto con guías SMC MGPM80-10Z (componente `mgpm80_10z` del
//     catálogo del repositorio): Ø80, carrera 10 = P.carrera, casquillo de
//     deslizamiento, con imán. Pieza REAL y comprable (ver MESA_GUIA.md)
//   · CYLINDER MOUNTING CHANNEL (WA-025833) de chapa 12 GA conformada, con sus
//     placas colgantes y las COLISAS de ajuste de 3/8"
//   · 4 jack bolts 3/8-16 con dos tuercas y golilla cada uno
//   · válvula 4 vías monosolenoide 24 VDC, su soporte, 2 silenciadores 1/8" NPT,
//     racores codo giratorios 360° y tubería de 1/4"
//   · interfaz con el módulo móvil: horquilla de empuje + 4 pasadores guía en colisa
//
// Ejes (CONTRATO.md §1):  X = eje de los rodillos · Y = expulsión a 90° ·
// Z = arriba, Z = 0 en la cara inferior del bastidor.  Unidades: mm.
// Estado modelado: **ELEVADO** — el cilindro está dibujado con los 10 mm de
// P.carrera aplicados (placa móvil arriba), coherente con los rodillos en P.rodZ.
//
// CÓMO FUNCIONA (texto del manual, pág. 8):
//   El cilindro empuja hacia arriba el ROLLER FRAME WELDMENT a través de la
//   horquilla de empuje. No es un cilindro suelto: el MGPM lleva émbolo central
//   Ø80 y DOS VARILLAS GUÍA Ø25 a 156 mm entre ejes, y es lo que garantiza el
//   paralelismo del plano de rodillos. Su carrera de catálogo es EXACTAMENTE la
//   cota «0.394—MOVEMENT» = 10 mm, así que no hay topes postizos que la recorten:
//   el propio cilindro da la carrera y sus topes de goma de serie (ambos extremos)
//   absorben el impacto.
//   La altura del conjunto se ajusta como dice el manual: «Loosen 3/8 in. bolts
//   holding the cylinder-mounting channel. Adjust using jack bolts, tighten
//   3/8 in. bolts» ⇒ se aflojan los 4 tornillos de 3/8" que van en COLISAS
//   VERTICALES de las placas colgantes (recorrido real 25.4 mm), se sube o baja
//   el canal con los 4 jack bolts (tuerca por encima y por debajo de la ménsula
//   inferior: se afloja una y se aprieta la otra) y se vuelven a apretar.

import {
  Ensamble, box, cyl, hole, sketchXZ, sketchXY, colisa, rectR, arcoPts, hexPts,
  seccionChapa, desarrollo, pernoHex, tuercaHex, golilla, COL, r2, IN,
} from './lib.mjs';
import { P } from './params.mjs';
import { juntaATope } from './tolerancias.mjs';

// ---------------------------------------------------------------------------
// Cotas locales del módulo.  src: med = medido sobre ref/fig8a_vistas.png con
// k = 0.6320 mm/px (ESCALA.md) · cat = catálogo · txt = texto del manual ·
// dis = decisión de diseño de este repositorio.
// ---------------------------------------------------------------------------
const t12 = P.cal12;                              // 2.657 — chapa 12 GA del canal
const L = {
  // --- CYLINDER MOUNTING CHANNEL -------------------------------------------
  // med: contorno x 1497→1867 px, y 759.5→922.5 px de la vista derecha.
  // El rectángulo redondeado de la vista derecha es la SECCIÓN del canal: la
  // vista mira según Y, luego 234 mm van en X y 103 mm en Z, y el canal es una
  // traviesa que cruza la máquina de lado a lado.
  canalX0: 114.5,          // med (1497 px − 1315.5 px origen) · el canal queda centrado en X
  labio: 16,               // dis: labio de rigidez hacia dentro en el borde de cada ala
  // Z de la cara inferior del canal: se despeja abajo para que el plato de
  // empuje toque el riel inferior del bastidor móvil (P.rielInfZ) con la
  // carrera aplicada.  med da 10.1 mm (Δ 2.7 mm, dentro de ±1.5 px de lectura).
  // canalZ0 se calcula en `elevacion()` — ver cadena de alturas.

  // --- placas colgantes (parte del weldment del canal) ----------------------
  // Se atornillan al alma del SIDE CHANNEL (PT-087017), que bastidor.mjs sitúa
  // en Y = ±227.24 con alas hacia dentro a Z ≈ 84.9 y 250.  Las placas quedan
  // ENTRE esas dos alas y a tope contra la cara interior del alma.
  ladoY: 227.24,           // dis (= bastidor.mjs L.ladoY): alma del SIDE CHANNEL
  placaX: [130, 333],      // dis: no alcanza X=115.75 ni 347.25, donde bastidor.mjs atornilla
                           // las ménsulas inferiores de jack bolt al alma del SIDE CHANNEL
  placaZ0: 88,             // dis: por encima del ala inferior del SIDE CHANNEL (83.6…86.2)
  placaZ1: 246,            // dis: por debajo del ala superior del SIDE CHANNEL (248.7…251.3)
  placaZfull: 195,         // dis: cota hasta la que la placa es de ancho completo
  montanteAncho: 36,       // dis: ancho en X de los dos montantes que suben a las colisas
  ajusteX: [141.5, 321.5], // dis: P.largo/2 ∓ 90 — libres de la unión SIDE CHANNEL↔anfitrión (X 60/231.5/403)
  ajusteZ: 180,            // dis: centro de la colisa. Por debajo de Z=218 sólo hay el alma
                           // del SIDE CHANNEL: por encima se le suma el alma del canal
                           // anfitrión (218…383.1) y el perno no tendría por dónde salir.
  colisaAncho: 12.7,       // dis: 1/2" = 3/8" + P.holgura.colisa → colisa para perno de 3/8"
  colisaLargo: 38.1,       // med 16.1×32.2 @0.5277 → 19.3×38.6 @0.6320 · 1-1/2" ⇒ recorrido 25.4 mm (1")

  // --- guiado del movimiento vertical --------------------------------------
  guiaX: [190, 273],       // dis: pasadores guía, entre las dos colisas de ajuste
  guiaZ: 174,              // dis: centro de la colisa de guía
  guiaPasador: 12.7,       // dis: pasador Ø1/2"
  guiaRecorrido: 12,       // dis: 12 mm > P.carrera → la colisa es tope de seguridad, no el tope de servicio
  guiaMontY: 195,          // dis: cara del bastidor móvil donde va empotrado el pasador

  // --- jack bolts ----------------------------------------------------------
  jackX: [115.75, 347.25], // dis (= bastidor.mjs L.jackX): sobre el alma de cada ala del canal
  jackLargo: 152.4,        // dis: 3/8-16 × 6" — cubre jackSupZ (215.9) → bajo la tuerca inferior

  // --- CILINDRO COMPACTO CON GUÍAS SMC MGPM80-10Z --------------------------
  // Pieza REAL y comprable; sustituye a la «mesa guía 923.01022 · tipo MGF100»
  // que este módulo inventaba (Ø100 × 20 con dos tirantes de tope caseros).
  // Registrada como componente `mgpm80_10z` en componentes/catalogo.json.
  //   cat = SMC, hoja Ø80/Ø100 de la serie MGP (`ref/mesa/smc_mgp80_100_cotas.png`,
  //         MGPM_2139.pdf pág. 15 para las cotas y pág. 6-7 para prestaciones;
  //         MGP-old-e.pdf pág. 7 para áreas de émbolo y Ø de vástago).
  //   web = ficha de venta comprobada el 28-07-2026: AliExpress, listado YIYUN
  //         «MGPM40 … MGPM80 … -10-20-25…», productId 3256808952498802, desde
  //         US$153.07 — https://www.aliexpress.com/item/3256808952498802.html
  //   Fotos del producto y dibujo acotado en `ref/mesa/`; método y validación
  //   del escalado por píxeles del dibujo en `MESA_GUIA.md`.
  //
  // ORIENTACIÓN (dis): la dirección LARGA del cilindro (H, T, U, patrón 180) va
  // según Y —la de expulsión, donde hay 460 mm libres entre canales— y la CORTA
  // (G, S, patrón 52) según X. El eje del émbolo es Z. Así la huella en planta
  // es 91.5 (X) × 202 (Y): 78 mm más estrecha en X que la pieza inventada.
  cilFA: 22,               // cat: espesor de la placa móvil
  cilFB: 18,               // cat: hueco placa↔cuerpo RETRAÍDO (con la carrera: 28)
  cilC: 56.5,              // cat: largo del cuerpo según el eje
  cilE: 18.5,              // cat: salida de las varillas guía por la cara opuesta a
                           //      la placa, RETRAÍDO (es el máximo: las varillas van
                           //      solidarias a la placa, así que al EXTENDER entran
                           //      10 mm y sólo asoman 8.5. Ver `salidaVarillasMm`).
  cilA: 115,               // cat: largo total retraído = FA + FB + C + E
  cilH: 202,               // cat: sección del cuerpo, dirección larga  → Y
  cilG: 91.5,              // cat: sección del cuerpo, dirección corta  → X
  cilJ: 45.5,              // cat: reparto de G a un lado del eje (el de los puertos)
  cilK: 46,                // cat: al otro lado (J + K = G, NO es simétrico)
  cilT: 198,               // cat: largo de la placa móvil → Y
  cilS: 75,                // cat: ancho de la placa móvil → X
  cilU: 156,               // cat: paso entre ejes de varillas guía → ±78 en Y
  cilDA: 25,               // cat: Ø de las varillas guía
  cilVastagoDia: 25,       // cat (MGP-old-e.pdf pág. 7, «Rod size»): Ø del vástago
  cilMM: [180, 54],        // cat VA × L: patrón de las 4 roscas M12×1.75 prof. 25 de
                           //      la cara INFERIOR del cuerpo (Y, X) → ±90 en Y, ±27 en X.
                           //
                           //      El paso corto es L = 54, NO la Q = 52 de la placa:
                           //      son patrones distintos y confundirlos deja los 4
                           //      pernos 1 mm adentro, fuera de los Ø13.5 de paso.
                           //      Medido por los bordes de las dos circunferencias
                           //      concéntricas de cada rosca en la vista de extremo
                           //      (p15.png fila y = 1220: 1366/1368…1387/1389 y
                           //      1470/1472…1491/1493 → centros 1377.5 y 1481.5 px,
                           //      paso 104.0 px × 0.5200 = 54.08 mm, +0.15 % sobre
                           //      L = 54; si fuera 52 el error sería +4.0 %).
                           //      El paso largo cuadra igual de bien: |Y| = 173 px
                           //      = 89.96 mm = VA/2 = 90 (0.0 %).
  cilML: 25,               // cat: profundidad útil de esas roscas
  cilNN: [174, 52],        // cat R × Q: patrón de las 4 roscas M12×1.75 PASANTES de
                           //      la placa móvil (Y, X) → ±87 en Y, ±26 en X
  cilPernoDia: 12,         // cat: MM y NN son M12 × 1.75
  cilGA: 19, cilGB: 15.5,  // cat: posición axial de los dos puertos Rc 3/8 medida
                           //      desde la cara de la placa (GA) y la opuesta (GB)
  cilPuertoDia: 17,        // cat: Rc 3/8 (Ø del taladro roscado ≈ 16.7)

  // =========================================================================
  // PERFIL EXTRUIDO REAL DEL CUERPO — medido por píxeles sobre
  // `ref/mesa/smc_mgp80_100_cotas.png` (tools/med_px.py), escala anclada como
  // en MESA_GUIA.md §2: **k = 0.5200 mm/px**, ancla Q = 52 mm sobre los centros
  // de las 4 roscas NN de la vista de la placa, que `circulos` sitúa en
  // (240, 928) (340, 928) (240, 1262) (340, 1262) px → paso corto 100.0 px.
  // Contraste del ancla en la propia vista de extremo (cuerpo x 1192…1368,
  // y 900…1290 px, eje del émbolo en x = 1279.5 px):
  //     J   87.5 px → 45.50 mm  (cat 45.5,  0.0 %)
  //     K   88.5 px → 46.02 mm  (cat 46,    0.0 %)
  //     G  176.0 px → 91.52 mm  (cat 91.5,  0.0 %)
  //     H  390.0 px → 202.80 mm (cat 202,  +0.4 %)
  //     VA 348.0 px → 180.96 mm (cat 180,  +0.5 %)   paso de las 4 roscas MM
  //     VB 270.25 px → 140.53 mm (cat 140, +0.4 %)   paso de las dos ranuras
  //   (la primera versión de este bloque ponía la cara K en x = 1368.5 y sacaba
  //    K 46.28 y G 91.78; la columna x = 1368 tiene tinta y la 1369 no, así que
  //    la cara está en 1368 y el error se va a cero. Media línea de diferencia.)
  //
  // El cuerpo NO es el prisma 91.5 × 202 que decía el modelo. Es la arquitectura
  // clásica de un MGP: un TUBO CILÍNDRICO central de radio J = 45.5 (el camisa
  // del émbolo Ø80) unido a DOS OREJAS prismáticas —las que alojan las varillas
  // guía y las 4 roscas MM— que van de X = −K a X = +JA respecto del eje. G no
  // se mide en ninguna sección: es la envolvente (tubo por el lado J, oreja por
  // el lado K), y por eso el catálogo publica J ≠ K con J + K = G.
  //   · lado J (el de los puertos): cara plana de la oreja a JA = 38 del eje;
  //     sobre ella asoma el tubo, de radio J = 45.5, que completa los JB = 7.5
  //     restantes. med: la cara plana está en x = 1206.5 px (73.0 px del eje →
  //     37.96 mm, cat JA 38, −0.1 %) y el punto más saliente del arco en
  //     x = 1192 px (JB = 14.5 px → 7.54 mm, cat 7.5, +0.5 %). El arco muerde la
  //     cara plana entre y = 1034 y 1156 px, que son los ±48.2 px = ±25.06 mm
  //     que predice √(J² − JA²) = 25.02: el arco es el del tubo, no otro.
  //   · lado K: cara plana de la oreja a K = 46 (x = 1368 px = 88.5 px del eje →
  //     46.02 mm, cat 46, 0.0 %). Esa cara NO llega ni al centro ni a los
  //     extremos, y las dos interrupciones se leen directamente en la columna
  //     x = 1368, que sólo tiene tinta en y 927…1015 y 1175…1290:
  //       – CINTURA CENTRAL (rasgo que faltaba): entre y 1015 y 1175 la cara K
  //         desaparece y el contorno lo hace el ARCO DEL TUBO. Transición por
  //         chaflán recto medido punto a punto (1368,1015) (1363,1018)
  //         (1357.5,1021) (1352,1024) → pendiente 1.72 px/px, que corta el arco
  //         de R 87.5 px en (1338.6, 1031.5). En mm: la cara K acaba a
  //         |Y| = 41.6 y el arco arranca a |Y| = 33.0, x = 31.3 del eje
  //         (√(45.5² − 33²) = 31.32: el punto está sobre el arco al 0.5 %).
  //       – EXTREMOS: por encima de |Y| ≈ 87.4 la cara K se retira otra vez a
  //         ≈ 38 (columna x = 1353 con tinta en y 904…919, o sea |Y| 91.5…99.3).
  //     Dos lecturas independientes de esa retirada: la de este bloque
  //     (87.4 → 91.5) y la de la vista «Back side» (87.36 → 91.78). Difieren
  //     0.4 %; se conserva el promedio [87.1, 91.9] que ya estaba escrito.
  //   · Lo que se ve en el dibujo y NO se modela (declarado, no inventado): las
  //     cuatro RANURAS DE CAPTADOR en el encuentro tubo↔oreja (pequeños
  //     cuadrados girados 45° de ~18 px = 9.4 mm de lado, en x 1200…1225 y
  //     1345…1358 a y ≈ 1033 y 1157), y el segundo par «2-Rc3/8 (Plug)» que el
  //     catálogo secciona en la cara de extremo. Las fotos los enseñan; el
  //     dibujo no los acota, así que no entran al sólido (ver informe).
  cilJA: 38,               // cat (tabla, JA): cara plana de la oreja, lado J
  cilJB: 7.5,              // cat (tabla, JB): lo que el tubo asoma sobre esa cara
                           //      plana  (JA + JB = J = 45.5)
  cilKcintura: [33.0, 41.6], // med: |Y| donde arranca el arco del tubo y donde
                           //      acaba la cara K = 46, en la CINTURA central del
                           //      lado K. Entre los dos, chaflán recto. Ver arriba
                           //      el punto a punto de la transición (1368,1015) …
                           //      (1352,1024) y su corte con el arco.
  cilKbanda: [87.1, 91.9], // med: |Y| donde el resalte de la cara K (46) se
                           //      retira a 38. Dos lecturas independientes:
                           //      vista de extremo, transición y 918→928 px →
                           //      |H| 92.04 → 86.84 mm; vista «Back side»,
                           //      líneas continuas y 162 y 170.5 px sobre el
                           //      borde 143.5 → |H| 91.78 → 87.36 mm.  Promedio.
  cilChaflan: 1.5,         // med: la esquina longitudinal de la oreja (84 × 202)
                           //      se cierra en 3 px (1.56 mm) — vista de extremo,
                           //      esquina J/+H: la cara superior arranca en
                           //      x = 1210 px y la cara J en y = 903 px. Es el
                           //      LÍMITE DE RESOLUCIÓN del dibujo (la línea mide
                           //      2 px), así que el valor vale ±0.5 mm; las fotos
                           //      (`aliexpress_mgpm_foto.jpg`, `vpc_mgp_foto.jpg`)
                           //      confirman que el chaflán existe, no su tamaño.

  // --- RANURAS EN T de los costados (figura «Dimension of T slot» + tabla) ---
  // La tabla da la SECCIÓN para Ø80 (capa cat); lo que NO dice —en qué cara van,
  // a qué altura, y cómo se reparte la profundidad— se midió por píxeles sobre la
  // ranura superior de la vista de extremo (cara K, x 1325.5…1368.5 px, y
  // 940.5…979.5 px). Contraste de las CINCO cotas impresas:
  //     a  boca            947.5→972.5 y  = 25.0 px → 13.00 mm  (cat 13.3, −2.3 %)
  //     b  fondo ancho     940.5→979.5 y  = 39.0 px → 20.28 mm  (cat 20.3, −0.1 %)
  //     c  prof. ancho    1330.5→1353.5 x = 23.0 px → 11.96 mm  (cat 12,   −0.3 %)
  //     d  prof. boca     1353.5→1368.5 x = 15.0 px →  7.80 mm  (cat 8,    −2.5 %)
  //     e  prof. total    1325.5→1368.5 x = 43.0 px → 22.36 mm  (cat 22.5, −0.6 %)
  //   error medio 1.1 %, máximo 2.5 % (sobre distancias de 15…43 px: ±0.5 px de
  //   lectura ya son ±2 % en las cortas). Relectura independiente tomando el
  //   CENTRO de cada racha en vez de su borde exterior: a 25.0 px, b 38.5 px,
  //   c 22.0 px (−4.7 %), d 16.0 px (+4.0 %), e 43.5 px (+0.5 %). O sea que el
  //   reparto c/d baila un píxel según dónde se ponga la frontera —son los dos
  //   tramos más cortos y comparten una sola línea— mientras que la SUMA `e`
  //   sale igual por los dos caminos. Otra razón para meter al modelo la tabla y
  //   no los píxeles. La figura del catálogo es esquemática y
  //   NO está a escala (a/b dibujado 0.600 contra 0.655 real, −8 %): sirve para
  //   la topología, no para medir. Las cotas que entran al modelo son las de la
  //   tabla; los píxeles sólo las verifican y resuelven lo que la tabla calla:
  //   · **e ≠ c + d**: entre el fondo ancho y el fondo real hay un RELIEVE
  //     central de e − c − d = 2.5 mm de profundidad y del ancho de la boca
  //     (med: 947.5→972.5 px, los mismos 25 px que `a`). Se lee igual en la
  //     figura de detalle y en la vista de extremo.
  //   · van en la cara **K** (la de 46), no en la J: en la cara J el mismo barrido
  //     da la arista continua sin interrupción, y la vista «Back side» —que mira
  //     esa cara K— enseña las dos bocas como líneas continuas de extremo a
  //     extremo del cuerpo (x 643…848.5 px, cobertura 205/205).
  //   · son **DOS**, centradas en y = 960 y 1230 px = ±135.0 px = ±70.2 mm del
  //     plano medio (y = 1095 px): paso 270 px = 140.40 mm = la cota tabulada
  //     **VB = 140** (+0.3 %). Se modelan por tanto a ±VB/2 = ±70 exactos.
  //   · corren toda la altura del cuerpo (C), que es la dirección de extrusión.
  cilT_a: 13.3, cilT_b: 20.3, cilT_c: 12, cilT_d: 8, cilT_e: 22.5,   // cat (tabla)
  cilVB: 140,              // cat (tabla VB): paso entre ejes de las dos ranuras
  cilHA: 'M12',            // cat (tabla HA): tornillo de cabeza cilíndrica que admite

  // --- puertos Rc 3/8: dónde caen de verdad --------------------------------
  // No están en el plano medio: el catálogo los sitúa a **PW = 74** del eje del
  // émbolo en la dirección larga (H), los dos del mismo lado. Confirmado por
  // píxeles dos veces sobre la vista lateral: los dos roscados salen centrados
  // en y = 1237.5 px (143 px del eje y = 1095 → 74.36 mm, +0.5 %) y la propia
  // línea de cota de PW ocupa x = 940 px, y 1095…1238 px = 143 px. Axialmente
  // caen donde ya los ponía el módulo: x = 680 px (37 px de la cara de la placa
  // → 19.24 mm, cat GA 19, +1.3 %) y x = 819.5 px (29 px de la cara de fijación
  // → 15.08 mm, cat GB 15.5, −2.7 %).
  cilPW: 74,               // cat (tabla PW): eje del émbolo → eje de los puertos
  cilPuertoLadoY: -1,      // dis: los dos puertos miran a −Y, que es donde está
                           //      la válvula (Y −172…−100): acorta la tubería
  cilPuertoProf: 12,       // dis: profundidad del roscado Rc 3/8. med sobre el
                           //      puerto TAPADO de la vista de extremo (cara H,
                           //      y 1289.5→1271 px) = 18.5 px = 9.62 mm; se deja
                           //      en 12 porque un Rc 3/8 necesita ~11 mm de rosca
                           //      útil y es lo que aloja el niple del racor.

  // --- placa móvil: alojamientos que enseñan la vista de la placa y las fotos --
  // med sobre la vista de la placa (centro en x = 290, y = 1095 px):
  //   · en cada varilla guía (y = 944.5 y 1245.5 px = ±150.5 px = ±78.3 mm, cat
  //     U/2 = 78) hay una circunferencia de 56.5 px → 29.38 mm ≈ cat DB = 30.
  //     En las dos fotos es un ALOJAMIENTO circular en la cara superior con el
  //     tornillo de fijación de la varilla en el fondo.
  //   · en el centro NO hay dos circunferencias y un hexágono dentro, como se
  //     había escrito: hay UNA circunferencia y UN hexágono, y el «segundo
  //     círculo» era el propio hexágono. La fila y = 1095 px cruza exactamente
  //     cinco líneas —259.5 · 270 · 290 (eje) · 310.5 · 321— o sea dos rasgos
  //     concéntricos y nada más:
  //       caja Ø 61.5 px → 31.98 mm   (se conserva 32.2, +0.7 %, ver abajo)
  //       hexágono, dos caras VERTICALES en x = 270 y 310.5 → 40.5 px
  //                                    → **20.80 mm entre caras**
  //     El recorte ampliado enseña las dos caras rectas y los vértices arriba y
  //     abajo (y ≈ 1073 y 1118 px, entrecaras × 2/√3 = 46.8 px, medido 45): es un
  //     hexágono con e/c 20.8, no 17.7. Y cuadra con la pieza: su diagonal
  //     20.8 × 2/√3 = 24.02 cabe en el vástago de Ø25 (cat), que es justo lo que
  //     tiene que pasar si el hexágono es el rebaje de llave del extremo del
  //     vástago. Con 17.7 la diagonal habría sido 20.4 y sobraría material.
  // Los DIÁMETROS y el entrecaras son medidos; las PROFUNDIDADES no las acota el
  // catálogo y son decisión de este repositorio (`dis`), tomadas para que quede
  // alma sana en una placa de FA = 22.
  cilPlacaCajaDia: 29.4,   // med 56.5 px (cat DB 30, −2.1 %). Relectura propia:
                           //      bordes en 262 y 318 px = 56.0 px → 29.12 mm,
                           //      1.0 % por debajo del valor escrito: se conserva.
  cilPlacaCajaProf: 8,     // dis
  cilPlacaAsientoDia: 25.6,// dis: DA 25 + P.holgura.deslizante — asiento de la varilla
  cilPlacaAsientoProf: 10, // dis
  cilPlacaVastagoDia: 32.2,// med 62 px — caja del extremo del vástago, cara superior
                           //      (relectura 61.5 px → 31.98; se conserva 32.2)
  cilPlacaHexAF: 20.8,     // med 40.5 px entre caras — alojamiento hexagonal del
                           //      extremo del vástago, en el FONDO de esa caja
  cilPlacaHexProf: 14,     // dis: total desde la cara superior (6 mm por debajo
                           //      del fondo de la caja Ø32.2); deja 8 mm de alma
  // Prestaciones (cat; las usa el bloque de verificaciones del final):
  cilArea: [5027, 4536],   // cat: área de empuje / de retorno, mm²
  cilPresion: [0.1, 1.0],  // cat: presión de trabajo mín. / máx., MPa
  cilVelAdm: [50, 400],    // cat: velocidad de émbolo admisible, mm/s
  cilEkAdm: 2.71,          // cat: energía cinética admisible, J (topes de goma)
  cilMasa: 6.49,           // cat: masa del MGPM80 con carrera 25 (la menor tabulada;
  cilMasaMovil: 4.27,      // cat:  de ella, partes móviles). Valor conservador para
                           //      la carrera 10, que el catálogo no tabula.
  cilLateralAdm: 352,      // cat: carga lateral admisible sobre la placa, N
  cilParAdm: 21.9,         // cat: par de giro admisible sobre la placa, N·m
  cilNoGiro: 0.04,         // cat: precisión de no-giro de la placa, ±grados

  // --- implantación del cilindro -------------------------------------------
  // CENTRADO EN X (dis). La mesa inventada iba descentrada a X=245 porque su
  // huella de 170 mm en X chocaba con la placa soporte de transmisión
  // (X 106.7…119.4, con su doblador desde 106.7). El cuerpo real sólo mide 91.5
  // en X: centrado en P.largo/2 = 231.5 ocupa X 185.5…277.0 y deja 66 mm a esa
  // placa y 68 mm al ala +X del canal. Se centra, por tanto, y con eso la
  // excentricidad respecto del centro de gravedad del conjunto móvil —que es
  // simétrico salvo el motorreductor— baja de 13.5 mm a los 2.3 mm residuales
  // que se calculan abajo. Comprobado además contra el motorreductor: su macizo
  // arranca en Z=123.9 y la placa móvil queda en 121.5 (ver `holguraPlacaMotor`).
  mesaX: 231.5,            // dis (= P.largo / 2 = centro del canal de montaje)
  cilPuertoLadoJ: +1,      // dis: el lado J (puertos Rc3/8) mira a +X, que es donde
                           //      queda el pasillo libre del canal (X 277…345.8) y
                           //      donde se aloja la válvula: tubería mínima.
  // Espesor de los brazos de la horquilla. NO es libre: es lo que cierra la
  // cadena de alturas (ver §0). Con 22 mm la cara superior de la placa móvil
  // queda en Z=121.5, 2.4 mm por debajo del punto más bajo del motorreductor
  // (Z=123.9) — que es la razón por la que la placa YA NO se puede rebajar como
  // se hacía con la mesa inventada: rebajar la placa de un MGPM sería cortar
  // justo por donde se atornillan el vástago y las dos varillas guía.
  platoT: 22,              // dis (era 12; +10 recuperados de la cadena de alturas)
  platoHolguraMotor: 2.0,  // dis: holgura mínima exigida placa móvil ↔ motorreductor

  // --- horquilla de empuje: esquiva el motorreductor -----------------------
  // Medido sobre el sólido del motor (X 41.3…433.4, eje Y=0 Z=P.motrizZ): el
  // cárter del reductor es un prisma de 110 (Y) × 150 (Z) con esquinas R22, así
  // que su cara inferior plana (Z=123.9) llega a |Y| ≤ 33 y su punta a |Y| = 55.
  motorZ0: 123.9,          // med sobre el sólido de transmision.mjs
  motorY131: 48, motorY143: 54,
  brazoY0: 58,             // dis: arranque de los brazos de la horquilla (54 + 4)
  brazoY1: 100,            // dis: borde exterior ≈ borde de la placa móvil (99)
  // Los pernos de la horquilla YA NO son libres: caen en las 4 roscas NN reales
  // de la placa, o sea a Y = ±87 y X = ±26 del eje (patrón 174 × 52).
  brazoPernoY: 87,         // cat (= cilNN[0] / 2)
  // La cara de empuje se apoya en la cara inferior de los NOTCHED BRACE CHANNEL
  // del bastidor móvil, que están en Y = ±(80…120) con la cara inferior en
  // Z = P.rielInfZ: contacto real de 20 mm de ancho por brazo.
  contactoY: [80, 120],    // dis (= bastidor.mjs: notched brace channel)

  // --- neumática -----------------------------------------------------------
  // med (vista izquierda): el bloque de válvulas ocupa Y −185…−248, Z 25…117.
  // No cabe ahí: el SIDE CHANNEL baja hasta Z=84.9 con el ala hasta Y=−189.1 y
  // la TAPA DEL CANAL BASE ocupa X 22…105, Y −225.9…−200, Z 18…84.9.  Se lleva
  // al hueco libre DENTRO de la artesa del canal.  Con el cuerpo real (X
  // 185.5…277.0) ese hueco ya no está en −X sino en el pasillo +X, que es
  // además el lado J por el que salen los puertos Rc 3/8: la tubería se reduce
  // a dos tramos rectos (dis).
  valvY: [-172, -100],     // dis: dentro del canal (|Y| ≤ 221) y fuera del cuerpo (±101)
  valvX: [296, 342],       // dis: entre el cuerpo (X ≤ 277) y el ala +X del canal (≥ 345.8)
  sopY: [-190, -92],       // dis: envolvente del soporte
  sopX: [288, 340],
  sopPernos: [[296, -182], [332, -182]],   // dis: anclaje del soporte al alma del canal,
                                           // fuera de la válvula (Y −172…−100) y de las
                                           // muescas de la ménsula de jack (|Y| ≥ 206)
  silenDia: 18,            // cat 923.0059 MUFFLER - 1/8 in. NPT
  silenX: [307, 331],      // dis: escapes en la cara SUPERIOR de la válvula — las dos
                           //      caras en X están ocupadas (racores A/B en −X, ala del
                           //      canal en +X) y las de Y, por solenoide y accionamiento
  tuboX: 287,              // dis: plano de la tubería, en el pasillo libre entre el
                           //      cuerpo del cilindro (X ≤ 277) y la válvula (X ≥ 296)
  radioTubo: 25,           // dis: radio de curvatura del tubo de 1/4" (≥ 3 × OD)

  // --- masas y cargas para el dimensionado ---------------------------------
  masaMovilKg: 55,         // dis: ROLLER FRAME WELDMENT + 6 rodillos + serpentín y
                           // poleas + motorreductor SEW RF07 (7.9 kg cat) ≈ 45–60 kg
  masaMotorKg: 7.9,        // cat 300.0322 (SEW RF07DRS71S4) — la única masa del
                           // conjunto móvil que NO es simétrica respecto de X=231.5
  cgMotorX: 247,           // dis: centro de gravedad del motorreductor en X, estimado
                           // repartiendo su masa 60/40 entre cárter del reductor
                           // (X 133.4…253.4, centroide 193.4) y motor + ventilador
                           // (X 253.4…433.4, centroide 328): 0.6·193.4 + 0.4·328 = 247.2
  muApoyo: 0.20,           // dis: rozamiento estático acero laminado/acero laminado sin
                           // lubricar (rango 0.15…0.30). Es la COTA SUPERIOR de lo que
                           // los apoyos de la horquilla —que empujan, NO están
                           // atornillados al cassette— pueden transmitir a la placa en
                           // horizontal y en giro; por encima deslizan y la reacción se
                           // la llevan los 4 pasadores guía, que es su función.
  presionBar: 6.0,         // dis: presión de red del cálculo pedido
  presionTrabajoBar: 4.14, // cat: «Working pressure 60 PSI» del ProSort MRT
  presionAtmBar: 1.013,    // cat: atmósfera normal ANR (0.1013 MPa, 20 °C, 65 % HR)
  rendimiento: 0.85,       // dis: pérdidas por juntas y rozamiento de las guías
};

// --------------------------------------------------------------------------
// Utilidades locales de tubería (polilínea 3D redondeada → cilindros)
// --------------------------------------------------------------------------
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
const unit3 = (a) => { const l = len3(a) || 1; return mul3(a, 1 / l); };

/** Redondea los vértices de una polilínea 3D con radio r (Bézier cuadrática). */
function suavizar3(pts, r, n = 5) {
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const d = Math.min(r, len3(sub3(a, p)) / 2, len3(sub3(b, p)) / 2);
    const pa = add3(p, mul3(unit3(sub3(a, p)), d));
    const pb = add3(p, mul3(unit3(sub3(b, p)), d));
    for (let k = 0; k <= n; k++) {
      const s = k / n, w0 = (1 - s) * (1 - s), w1 = 2 * (1 - s) * s, w2 = s * s;
      out.push([pa[0] * w0 + p[0] * w1 + pb[0] * w2,
        pa[1] * w0 + p[1] * w1 + pb[1] * w2,
        pa[2] * w0 + p[2] * w1 + pb[2] * w2]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

/** Boceto en planta (XY) extruido en Z, pero expresado en la MISMA base que usa
 *  `bboxPieza` de lib.mjs. Para un boceto de normal +Z, `bboxPieza` no lee
 *  `params.u` y supone la base que le da `baseOrtogonal`, que es u = [0,−1,0] ·
 *  v = [1,0,0]; `sketchXY` declara u = [1,0,0]. Si no se reexpresa el contorno,
 *  la caja del gate sale girada 90° y un cuerpo de 91.5 (X) × 202 (Y) pasa a
 *  medir 202 × 91.5. Aquí se gira el contorno a esa base y se declara la `u`
 *  correspondiente: model.js y a_step.py sí leen `params.u`, así que el SÓLIDO
 *  es exactamente el mismo y la caja del gate deja de mentir.
 *  (Mismo recurso que `barraZ` más abajo y que el `disco()` de transmision.mjs.) */
/** Quita de un contorno CERRADO los puntos repetidos consecutivos (incluido el
 *  par último↔primero). Un contorno que mezcla puntos escritos a mano con puntos
 *  calculados los repite a menudo —el redondeo a 2 decimales hace que el primer
 *  punto de un `arcoPts` caiga EXACTAMENTE sobre el vértice que ya estaba en la
 *  lista— y cada repetición es una arista de longitud cero.
 *  Medido antes de escribir esto, para no exagerar el problema: con los dos
 *  repetidos que tenía el arco del lado J, `ExtrudeGeometry` daba los MISMOS 128
 *  triángulos y CERO degenerados —three.js ya los descarta al construir el
 *  `Shape`— y `a_step.py` cerraba el sólido igual. O sea que no era la causa de
 *  ningún artefacto visible. Se limpia igualmente porque un contorno con aristas
 *  nulas es una bomba de relojería para cualquier otro traductor (OCC se queja
 *  al construir el `Wire`), y porque cuesta una función de seis líneas. */
function sinRepes(pts, eps = 1e-6) {
  const out = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || Math.abs(q[0] - p[0]) > eps || Math.abs(q[1] - p[1]) > eps) out.push(p);
  }
  while (out.length > 1) {
    const a = out[0], b = out[out.length - 1];
    if (Math.abs(a[0] - b[0]) > eps || Math.abs(a[1] - b[1]) > eps) break;
    out.pop();
  }
  return out;
}

function perfilXY(nombre, zFace, ptsXY, h, op = 'union') {
  const f = sketchXY(nombre, zFace, ptsXY.map(([x, y]) => [-y, x]), h, op);
  f.params.u = [0, -1, 0];
  return f;
}

/** Features de un tubo que sigue una polilínea; devuelve {features, largo}. */
function tubo(pts, dia, r = L.radioTubo, n = 5) {
  const c = suavizar3(pts, r, n), features = [];
  let largo = 0;
  for (let i = 0; i < c.length - 1; i++) {
    const d = sub3(c[i + 1], c[i]), l = len3(d);
    if (l < 1e-6) continue;
    const u = mul3(d, 1 / l), ov = dia / 2;
    features.push(cyl(`Tramo ${features.length + 1}`, add3(c[i], mul3(u, -ov)), u, dia, l + 2 * ov));
    largo += l;
  }
  return { features, largo: r2(largo) };
}

// ---------------------------------------------------------------------------
/** @param {Ensamble} E  ensamble compartido
 *  @returns {object} métricas del módulo (las lee el gate) */
export function elevacion(E) {
  // =========================================================================
  // 0. CADENA DE ALTURAS (estado ELEVADO)
  //
  // El cilindro se atornilla POR ABAJO, con sus 4 roscas MM, sobre el alma del
  // canal de montaje; sus dos varillas guía atraviesan el cuerpo y bajan por dos
  // taladros de paso del alma.  De arriba abajo, con la carrera aplicada:
  //
  //   P.rielInfZ 143.5 ┬ cara inferior del NOTCHED BRACE CHANNEL (bastidor móvil)
  //     platoT   22    │ brazos de la horquilla de empuje
  //          121.5 ────┤ cara superior de la placa móvil   (motorreductor en 123.9)
  //     FA       22    │ placa móvil del MGPM80            (cat)
  //           99.5 ────┤
  //     FB+carrera 28  │ hueco placa↔cuerpo con los 10 mm aplicados (cat 18 + 10)
  //           71.5 ────┤ cara superior del cuerpo
  //     C        56.5  │ cuerpo del MGPM80                 (cat)
  //           15.0 ────┤ cara superior del alma del canal = cara de fijación
  //     t12      2.657 │ alma del canal de montaje, 12 GA
  //           12.34 ───┴ canalZ0
  //
  // El conjunto real mide 106.5 mm por ENCIMA de su cara de fijación (frente a
  // los 116 de la mesa inventada), así que el canal podría subir 9.5 mm; pero la
  // placa móvil ya no se puede rebajar para dejar pasar el motorreductor, de modo
  // que esos 9.5 mm (y 0.5 más) se gastan engordando la horquilla de 12 a 22 mm
  // para bajar la placa hasta 121.5 y librar el cárter del reductor (123.9) por
  // 2.4 mm.  Resultado: el canal se queda prácticamente donde estaba —12.34
  // frente a 12.84— y no hay que tocar ni el canal base, ni las ménsulas de jack
  // bolt, ni el rebaje de paso del ala del SIDE CHANNEL, que son cotas absolutas.
  // Ver `holguraPlacaMotorMm` y `libreBajoAlmaMm` en las verificaciones.
  const cuerpoH = L.cilC;                             // 56.5 — cuerpo del MGPM80 (cat)
  const huecoFB = r2(L.cilFB + P.carrera);            // 28 — hueco placa↔cuerpo ELEVADO
  const canalZ0 = r2(P.rielInfZ - L.platoT - L.cilFA - huecoFB - cuerpoH - t12);  // 12.34
  const canalX1 = L.canalX0 + P.canalCilY;            // 348.5
  const canalZ1 = r2(canalZ0 + P.canalCilZ);          // 115.34
  const ladoInt = r2(L.ladoY - t12 / 2);              // 225.91 — cara interior del alma del SIDE CHANNEL
  const ladoOut = r2(L.ladoY + t12 / 2);              // 228.57 — cara exterior del alma del SIDE CHANNEL
  const placaY = r2(ladoInt - P.placaT);              // 221.15 — cara interior de la placa colgante
  const webZ = r2(canalZ0 + t12);                     // 15.0 — cara superior del alma = cara de fijación
  const cuerpoZ1 = r2(webZ + cuerpoH);                // 71.5 — cara superior del cuerpo
  const placaZ0 = r2(cuerpoZ1 + huecoFB);             // 99.5 — cara inferior de la placa móvil (ELEVADA)
  const placaZ1 = r2(placaZ0 + L.cilFA);              // 121.5
  const platoZ1 = r2(placaZ1 + L.platoT);             // 143.5 = P.rielInfZ
  const mX = L.mesaX;                                 // 231.5 — eje del cilindro en X
  const canalXc = r2(L.canalX0 + P.canalCilY / 2);    // 231.5 — centro del canal en X
  // Huella del CUERPO en planta: G (X) × H (Y), con el reparto J/K asimétrico.
  const [mw, md] = P.mesaCuerpo;                      // 91.5 × 202 (cat G × H)
  const cilX0 = r2(mX - (L.cilPuertoLadoJ > 0 ? L.cilK : L.cilJ));   // 185.5 — cara −X
  const cilX1 = r2(mX + (L.cilPuertoLadoJ > 0 ? L.cilJ : L.cilK));   // 277.0 — cara +X (lado J)
  const cilXc = r2((cilX0 + cilX1) / 2);              // 231.25 — centro geométrico del cuerpo
  const varillaY = r2(L.cilU / 2);                    // 78 — varillas guía, ±78 en Y
  const pernoMMY = r2(L.cilMM[0] / 2), pernoMMX = r2(L.cilMM[1] / 2);   // ±90, ±26
  const pernoNNY = r2(L.cilNN[0] / 2), pernoNNX = r2(L.cilNN[1] / 2);   // ±87, ±26
  // Salida de las varillas guía por debajo de la cara de fijación. Las varillas
  // van solidarias a la PLACA (cat: la placa lleva sus dos avellanados), luego
  // suben con ella: al EXTENDER entran 10 mm y sólo asoman 8.5; el máximo es el
  // estado RETRAÍDO, E = 18.5 (cat).  El DESPEJE que hay que reservar bajo la
  // cara de fijación es por tanto **E = 18.5**, la posición más baja que alcanza
  // la punta de la varilla, no `carrera + E`.
  //   Cuidado con la cota A+carrera del catálogo: son 125 mm de ENVOLVENTE
  //   BARRIDA de toda la unidad —de la cara superior de la placa extendida a la
  //   punta de varilla retraída—, no un alargamiento por debajo. Que A − E = B
  //   = 96.5 en las tres gamas de carrera lo confirma.
  const salidaElev = r2(L.cilE - P.carrera);          // 8.5 — asoman con el equipo arriba
  const salidaRetr = L.cilE;                          // 18.5 — asoman con el equipo abajo
  const salidaDespeje = L.cilE;                       // 18.5 — despeje a reservar
  const varillaZ0 = r2(webZ - salidaElev);            // 6.5 — punta de varilla, ELEVADO
  const varillaLargo = r2(placaZ0 - varillaZ0);       // 93 = FB + carrera + C + salida
  const puertoZ = [r2(webZ + L.cilGB), r2(cuerpoZ1 - L.cilGA)];   // 30.5 / 52.5 (cat GB / GA)
  // Los dos puertos NO están en el plano medio: van a PW = 74 del eje, los dos
  // al mismo lado (ver bloque L). Y no salen por la envolvente J = 45.5 sino por
  // la CARA PLANA del extruido, a JA = 38 del eje: ese escalón de JB = 7.5 es el
  // rebaje real del puerto.
  const puertoY = r2(L.cilPuertoLadoY * L.cilPW);     // −74
  const cilJfl = r2(mX + L.cilJA);                    // 269.5 — cara plana del lado J
  const cilKfl = r2(mX - L.cilK);                     // 185.5 — cara K (banda central)
  const cilKend = r2(mX - L.cilJA);                   // 193.5 — cara K en los extremos
  const cilYend = r2(md / 2);                         // 101 — semilargo H

  const b38 = P.M.b38, b14 = P.M.b14;

  // =========================================================================
  // 1. CYLINDER MOUNTING CHANNEL (WA-025833) — chapa 12 GA conformada
  // =========================================================================
  const xa = r2(L.canalX0 + t12 / 2), xb = r2(canalX1 - t12 / 2);
  const zb = r2(canalZ0 + t12 / 2), zt = r2(canalZ1 - t12 / 2);
  const fibra = [                        // fibra media de la sección, en (x, z)
    [xa + L.labio, zt], [xa, zt], [xa, zb], [xb, zb], [xb, zt], [xb - L.labio, zt],
  ];
  const secc = seccionChapa(fibra, t12, P.radioPliegue);
  const desa = desarrollo(fibra, t12, P.radioPliegue, P.factorK);
  const canalLargoY = r2(2 * placaY);                 // 447.6 — de placa a placa

  E.addPart(
    `FIJO · Canal de montaje del cilindro 12 GA ${P.canalCilY}×${P.canalCilZ}×${canalLargoY} (WA-025833)`,
    COL.chapa, [L.canalX0, 0, canalZ0],
    [
      sketchXZ(`Perfil conformado ${P.canalCilY}×${P.canalCilZ} e=${r2(t12)}`, placaY, secc, canalLargoY),
      // fijación del cilindro: 4 pasantes de Ø13.5 en el alma, patrón MM 180 × 52
      ...[-1, 1].flatMap(sx => [-1, 1].map(sy =>
        hole(`Ø13.5 fijación del cilindro (${sx > 0 ? '+' : '−'}X,${sy > 0 ? '+' : '−'}Y)`,
          [mX + sx * pernoMMX, sy * pernoMMY, canalZ0 - 1], [0, 0, 1], 13.5))),
      // PASO DE LAS VARILLAS GUÍA: atraviesan el cuerpo y bajan bajo el alma.
      // Ø30 sobre Ø25 = 2.5 mm de holgura radial; el eje del taladro no manda el
      // guiado (lo dan los casquillos del propio cilindro), sólo deja pasar.
      // Los pasantes M12 de al lado están a √(26² + 12²) = 28.64 mm: entre el
      // borde del Ø30 y el del Ø13.5 quedan 6.9 mm de alma.
      ...[-1, 1].map(sy => hole(`Ø30 paso de varilla guía Ø${L.cilDA} (${sy > 0 ? '+' : '−'}Y)`,
        [mX, sy * varillaY, canalZ0 - 1], [0, 0, 1], 30)),
      // fijación del soporte de la válvula (2 × 1/4-20 en el alma)
      ...L.sopPernos.map(([x, y]) => hole(`Ø7.9 soporte de válvula (X=${x}, Y=${y})`,
        [x, y, canalZ0 - 1], [0, 0, 1], 7.9)),
      // rebaje de las alas para que pase el ala inferior del SIDE CHANNEL
      // (bastidor.mjs: ala hacia dentro hasta Y=189.1 en Z 83.6…86.2)
      ...[1, -1].map(s => box(`Rebaje paso ala SIDE CHANNEL (${s > 0 ? '+' : '−'}Y)`,
        [canalXc, s * 204.5, 82], P.canalCilY + 10, 35, 6.5, 'cut')),
      // muescas de paso de la tornillería con que bastidor.mjs cuelga las
      // ménsulas inferiores de jack bolt del alma del SIDE CHANNEL (X=115.75 y
      // 347.25, Z=100, con el vástago entrando hasta Y≈±212)
      ...L.jackX.flatMap(x => [1, -1].map(s => box(`Muesca paso perno ménsula jack (X=${x}, ${s > 0 ? '+' : '−'}Y)`,
        [x, s * 216, 92], 20, 20, 34, 'cut'))),
    ],
    {
      chapa: { t: r2(t12), material: 'acero al carbono 12 GA', fibra, radio: P.radioPliegue },
      desarrollo: desa, plano: true, parte: 'WA-025833',
      union: 'soldada a las 2 placas colgantes (WA-025833)',
      encajes: [1, -1].map((s) => juntaATope({
        id: `U5-${s > 0 ? '+Y' : '-Y'}`, union: 'Canal de montaje del cilindro ↔ Placa colgante',
        motivo: 'SIN ENCAJE, y hay que decir por qué: la sección del canal (X 114.5…348.5, '
          + 'Z 12.34…115.34) y la placa colgante (X 130…333, Z 88…246) sólo COINCIDEN en los dos '
          + 'labios de rigidez, o sea en 3.16 mm de X por el lado −X y 1.83 por el +X. En esa franja '
          + 'no cabe ni una lengüeta ni un taladro de pasador. Alargar los labios hacia dentro (que '
          + 'sería la solución) mete el labio bajo el cárter del motorreductor RETRAÍDO (Z 113.9 '
          + 'contra el techo del labio 115.34, en X 133.4…149.8), así que tampoco. '
          + 'HALLAZGO PARA REVISIÓN ESTRUCTURAL: la unión de este weldment tiene muy poco solape.',
        posicionamiento: 'utillaje: el canal se apoya sobre dos calzos a Z = canalZ0 y las placas se '
          + 'aprietan contra sus caras de extremo (|Y| = 221.15) con la propia cota de 447.6 mm '
          + 'entre caras exteriores como referencia',
        referencia: 'cara de extremo del canal (|Y| = 221.15) y canto inferior de la placa (Z = 88)',
      })),
    });

  // ---- placas colgantes (mismo weldment) con las COLISAS DE AJUSTE ---------
  // Perfil: ancho completo hasta placaZfull y dos montantes hasta placaZ1, que
  // solapan el alma del canal lateral fijo (P.canalBotZ … P.canalTopZ).
  const ma = L.montanteAncho / 2;
  const [pX0, pX1] = L.placaX;
  const perfilPlaca = [
    [pX0, L.placaZ0], [pX1, L.placaZ0], [pX1, L.placaZfull],
    [L.ajusteX[1] + ma, L.placaZfull], [L.ajusteX[1] + ma, L.placaZ1], [L.ajusteX[1] - ma, L.placaZ1],
    [L.ajusteX[1] - ma, L.placaZfull],
    [L.ajusteX[0] + ma, L.placaZfull], [L.ajusteX[0] + ma, L.placaZ1], [L.ajusteX[0] - ma, L.placaZ1],
    [L.ajusteX[0] - ma, L.placaZfull], [pX0, L.placaZfull],
  ];
  for (const s of [1, -1]) {
    const yUnion = s > 0 ? ladoInt : -placaY;   // sketchXZ extruye h hacia −Y desde yFace
    const yCorte = s > 0 ? placaY - 0.5 : -ladoInt - 0.5;
    E.addPart(
      `FIJO · Placa colgante del canal 3/16" con colisas ${L.colisaAncho}×${L.colisaLargo} (Y=${s > 0 ? '+' : '−'}${r2(placaY + P.placaT / 2)})`,
      COL.chapaOsc, [pX0, s * placaY, L.placaZ0],
      [
        sketchXZ('Placa 3/16" recortada', yUnion, perfilPlaca, P.placaT),
        // 2 colisas verticales de ajuste (tornillos de 3/8" del procedimiento del manual)
        ...L.ajusteX.map(x => sketchXZ(`Colisa de ajuste ${L.colisaAncho}×${L.colisaLargo} (X=${x})`,
          yCorte, colisa(x, L.ajusteZ, L.colisaLargo, L.colisaAncho, true), P.placaT + 1, 'cut')),
        // 2 colisas de guía del movimiento vertical (tope de seguridad de la carrera)
        ...L.guiaX.map(x => sketchXZ(`Colisa de guía ${r2(L.guiaPasador + 0.2)}×${r2(L.guiaPasador + 0.2 + L.guiaRecorrido)} (X=${x})`,
          yCorte, colisa(x, L.guiaZ, L.guiaPasador + 0.2 + L.guiaRecorrido, L.guiaPasador + 0.2, true), P.placaT + 1, 'cut')),
      ],
      { plano: true, parte: 'WA-025833 (placa colgante)',
        union: 'soldada al canal de montaje del cilindro',
        encajes: [juntaATope({
          id: `U5-${s > 0 ? '+Y' : '-Y'}`, union: 'Canal de montaje del cilindro ↔ Placa colgante',
          motivo: 'ver el mismo registro en el canal: el solape con la sección del canal se reduce '
            + 'a los dos labios de rigidez y no admite encaje',
          posicionamiento: 'utillaje con calzos y apriete contra las caras de extremo del canal',
          referencia: 'cara interior de la placa (|Y| = 221.15)',
        })] });
  }

  // =========================================================================
  // 2. JACK BOLTS 3/8-16 × 6" — 4, en Y = ±P.jackY
  //    Cabeza + golilla apoyadas sobre la ménsula superior (fija, bajo el ala
  //    del canal lateral, Z = P.jackSupZ); dos tuercas — una por encima y otra
  //    por debajo — sobre la ménsula inferior del canal (Z = P.jackInfZ):
  //    se afloja una y se aprieta la otra para subir o bajar ese punto.
  // =========================================================================
  const mT = t12 / 2;                     // ménsula inferior de 12 GA centrada en P.jackInfZ
  // La ménsula superior de bastidor.mjs es una pletina 12 GA pegada BAJO el ala
  // inferior del canal anfitrión: la cabeza y la golilla del jack bolt apoyan
  // encima de esa ala (P.canalBotZ), que va taladrada Ø10.3 para el paso.
  const zApoyo = P.canalBotZ;             // 220.6 — cara superior del ala inferior
  for (const x of L.jackX) {
    for (const sy of [1, -1]) {
      const y = sy * P.jackY, pos = `X=${x}, Y=${sy > 0 ? '+' : '−'}${P.jackY}`;
      golilla(E, { nombre: `3/8" jack bolt (${pos})`, at: [x, y, zApoyo], dir: [0, 0, 1], dia: b38.d, ext: 25, esp: 2, capa: 'FIJO · ' });
      pernoHex(E, {
        nombre: `3/8-16 × 6" jack bolt (${pos})`, at: [x, y, r2(zApoyo + 2)], dir: [0, 0, -1],
        dia: b38.d, largo: L.jackLargo, af: b38.af, altoCab: b38.hh, capa: 'FIJO · ',
      });
      tuercaHex(E, { nombre: `3/8-16 superior de jack bolt (${pos})`, at: [x, y, r2(P.jackInfZ + mT)], dir: [0, 0, 1], dia: b38.d, af: b38.af, alto: b38.tuerca, capa: 'FIJO · ' });
      tuercaHex(E, { nombre: `3/8-16 inferior de jack bolt (${pos})`, at: [x, y, r2(P.jackInfZ - mT - b38.tuerca)], dir: [0, 0, 1], dia: b38.d, af: b38.af, alto: b38.tuerca, capa: 'FIJO · ' });
    }
  }

  // =========================================================================
  // 3. TORNILLOS DE 3/8" EN LAS COLISAS DE AJUSTE — 4, entran por fuera
  //    («Loosen 3/8 in. bolts holding the cylinder-mounting channel»)
  // =========================================================================
  for (const x of L.ajusteX) {
    for (const sy of [1, -1]) {
      const yOut = sy * r2(ladoOut + 1.67), d = [0, -sy, 0];
      const pos = `X=${x}, Y=${sy > 0 ? '+' : '−'}${ladoOut}`;
      golilla(E, { nombre: `3/8" de colisa (${pos})`, at: [x, yOut, L.ajusteZ], dir: d, dia: b38.d, ext: 25, esp: 1.67, capa: 'FIJO · ' });
      pernoHex(E, { nombre: `3/8-16 × 1" de colisa (${pos})`, at: [x, yOut, L.ajusteZ], dir: d, dia: b38.d, largo: IN, af: b38.af, altoCab: b38.hh, capa: 'FIJO · ' });
      tuercaHex(E, { nombre: `3/8-16 de colisa (${pos})`, at: [x, sy * placaY, L.ajusteZ], dir: d, dia: b38.d, af: b38.af, alto: b38.tuerca, capa: 'FIJO · ' });
    }
  }

  // =========================================================================
  // 4. CILINDRO COMPACTO CON GUÍAS SMC MGPM80-10Z (componente `mgpm80_10z`)
  //    Dibujado CON LA CARRERA APLICADA: placa móvil, vástago y varillas guía
  //    10 mm arriba de su posición retraída.
  //    Reparto de piezas: cuerpo = FIJO (atornillado al alma del canal);
  //    placa móvil, vástago y las 2 varillas guía = MÓVIL (suben con el pop-up).
  // =========================================================================
  // --- SECCIÓN DEL EXTRUIDO (plano XY; la extrusión va según Z = eje del émbolo)
  // Dos OREJAS prismáticas de X = −K … +JA (84 mm) × H = 202 (Y), con las cuatro
  // aristas longitudinales achaflanadas, y entre ellas el TUBO del émbolo, de
  // radio J = 45.5 centrado en el eje:
  //   +X (lado J): el tubo ASOMA sobre la cara plana JA = 38 y corta esa cara a
  //                |Y| = √(J² − JA²) = 25.02 → ahí la envolvente vale J = 45.5
  //   −X (lado K): la cara plana está más afuera (K = 46) que el tubo, así que
  //                entre ellos queda una CINTURA: la cara K muere a |Y| = 41.6
  //                (med) y baja por un chaflán recto hasta el arco, que arranca
  //                a |Y| = 33.0 (med). Es el rasgo que faltaba en la primera
  //                versión de este perfil, que dejaba la cara K recta de punta a
  //                punta y regalaba material entre el tubo y la oreja.
  //   extremos:    por encima de |Y| ≈ 87…92 la cara K se retira otra vez a 38
  // La envolvente NO cambia: sigue midiendo 91.5 (X 185.5…277.0) × 202 × 56.5.
  // Lo que cambia es que ahora hay material sólo donde el catálogo dice que lo hay.
  const ch = L.cilChaflan;
  const yArc = r2(Math.sqrt(L.cilJ ** 2 - L.cilJA ** 2));   // 25.02
  const aArc = Math.atan2(yArc, L.cilJA);                   // ±33.4°
  const [yK1, yK0] = L.cilKbanda;                           // 87.1 (resalte) … 91.9 (extremo)
  const [yW0, yW1] = L.cilKcintura;                         // 33.0 (arco) … 41.6 (cara K)
  const xW = r2(Math.sqrt(L.cilJ ** 2 - yW0 ** 2));         // 31.32 — el arco en |Y| = 33
  const aW = Math.atan2(yW0, -xW);                          // ≈ 133.5°, segundo cuadrante
  const cilKw = r2(mX - xW);                                // 200.18
  // el arco de la cintura se recorre por −π (el punto más saliente del lado K),
  // no por 0: de −aW a −(2π − aW). Se le quitan los DOS EXTREMOS porque coinciden
  // exactamente con los puntos del chaflán que ya están en la lista: `arcoPts`
  // devuelve n+1 puntos incluyendo ambos bordes y, al redondear a 2 decimales,
  // el primero cae en (cilKw, −yW0) y el último en (cilKw, +yW0). Lo mismo le
  // pasaba al arco del lado J con (cilJfl, ±yArc). Ver `sinRepes` para qué
  // consecuencias tiene eso realmente (menos de las que parece) y por qué se
  // limpia de todos modos.
  const arcoK = arcoPts(mX, 0, L.cilJ, -aW, aW - 2 * Math.PI, 20)
    .map(([x, y]) => [r2(x), r2(y)]).slice(1, -1);
  const perfilCuerpo = sinRepes([
    [r2(cilJfl - ch), -cilYend],                            // cara H (−Y), desde el lado J
    [r2(cilKend + ch), -cilYend],
    [cilKend, r2(-cilYend + ch)],                           // chaflán arista K/−Y
    [cilKend, -yK0],                                        // banda de extremo del lado K
    [cilKfl, -yK1],                                         // sale a la cara K = 46
    [cilKfl, -yW1],                                         // …que muere en la cintura
    [cilKw, r2(-yW0)],                                      // chaflán de la cintura
    ...arcoK,                                               // tubo, lado K
    [cilKw, r2(yW0)],
    [cilKfl, yW1],
    [cilKfl, yK1],                                          // cara K, mitad +Y
    [cilKend, yK0],
    [cilKend, r2(cilYend - ch)],
    [r2(cilKend + ch), cilYend],                            // chaflán arista K/+Y
    [r2(cilJfl - ch), cilYend],
    [cilJfl, r2(cilYend - ch)],                             // chaflán arista J/+Y
    [cilJfl, yArc],                                         // cara plana del lado J (JA = 38)
    ...arcoPts(mX, 0, L.cilJ, aArc, -aArc, 20)
      .map(([x, y]) => [r2(x), r2(y)]).slice(1, -1),        // tubo, lado J
    [cilJfl, r2(-yArc)],
    [cilJfl, r2(-cilYend + ch)],                            // chaflán arista J/−Y
  ]);
  // Sección de la ranura en T, cortada desde la cara K hacia +X: boca (a × d),
  // fondo ancho (b × c) y relieve central (a × [e − c − d]).
  const ranuraT = (y0) => {
    const a2 = r2(L.cilT_a / 2), b2 = r2(L.cilT_b / 2);
    const x0 = r2(cilKfl - 0.5), x1 = r2(cilKfl + L.cilT_d);
    const x2 = r2(cilKfl + L.cilT_d + L.cilT_c), x3 = r2(cilKfl + L.cilT_e);
    return [
      [x0, r2(y0 - a2)], [x1, r2(y0 - a2)], [x1, r2(y0 - b2)], [x2, r2(y0 - b2)],
      [x2, r2(y0 - a2)], [x3, r2(y0 - a2)], [x3, r2(y0 + a2)], [x2, r2(y0 + a2)],
      [x2, r2(y0 + b2)], [x1, r2(y0 + b2)], [x1, r2(y0 + a2)], [x0, r2(y0 + a2)],
    ];
  };
  const ranuraY = [r2(-L.cilVB / 2), r2(L.cilVB / 2)];      // ±70 (cat VB = 140)

  E.addPart(
    `FIJO · NEUMÁTICA · Cilindro compacto con guías SMC MGPM80-10Z Ø${P.mesaBore} × ${P.mesaCarrera} `
    + `— cuerpo ${md}×${mw}×${cuerpoH} (MGPM80-10Z)`,
    COL.neumatica, [cilXc, 0, webZ],
    [
      // perfil extruido real (cat J/K/JA/JB + med de los resaltes y el chaflán)
      perfilXY(`Perfil extruido ${md}×${mw} (orejas −${L.cilK}…+${L.cilJA}, tubo R${L.cilJ} con cintura)`,
        webZ, perfilCuerpo, cuerpoH),
      // 2 RANURAS EN T (cat a/b/c/d/e para tornillo ${L.cilHA}) en la cara K, a
      // ±VB/2 del plano medio y de extremo a extremo del cuerpo
      ...ranuraY.map(y => perfilXY(
        `Ranura en T ${L.cilT_a}/${L.cilT_b}/${L.cilT_c}/${L.cilT_d}/${L.cilT_e} para ${L.cilHA} `
        + `(cara K, Y=${y > 0 ? '+' : '−'}${Math.abs(y)})`,
        r2(cuerpoZ1 + 0.5), ranuraT(y), r2(cuerpoH + 2), 'cut')),
      // casquillos de deslizamiento de las varillas guía: pasantes (las varillas
      // atraviesan el cuerpo y asoman por la cara inferior)
      ...[-1, 1].map(s => hole(`Ø${r2(L.cilDA + 0.6)} casquillo de varilla guía (${s > 0 ? '+' : '−'}Y)`,
        [mX, s * varillaY, cuerpoZ1 + 1], [0, 0, -1], r2(L.cilDA + 0.6))),
      // alojamiento del vástago del émbolo: ciego, no sale por la cara inferior
      hole(`Ø${r2(L.cilVastagoDia + 0.6)} paso del vástago`, [mX, 0, cuerpoZ1], [0, 0, -1],
        r2(L.cilVastagoDia + 0.6), r2(cuerpoH - 6), false),
      // 4 × MM: M12 × 1.75 profundidad ML = 25 en la CARA INFERIOR (cat).
      // El taladro arranca 1 mm por debajo de la cara de fijación y mide ML + 1,
      // así que la cavidad en el material va de webZ a webZ + ML = **Z = 40.00
      // exacto**. Aviso para quien mire cortes: `ver_corte.html` recorta con un
      // plano, no con una booleana, y un corte pedido justo en Z = 40 cae sobre
      // el techo plano de estos cuatro agujeros. La tapa del cilindro de corte
      // está triangulada en abanico de 48 gajos y, con el plano encima, unos
      // gajos pasan la prueba de recorte y otros no: salen cuatro ESTRELLAS
      // negras. No es malla degenerada —a 39 y a 41 no hay nada— y no se
      // arregla en la geometría, que es la correcta: se pide el corte en otra
      // cota (35 y 30 son buenas: enseñan los puertos y las ranuras).
      ...[-1, 1].flatMap(sx => [-1, 1].map(sy =>
        hole(`4-MM M12×1.75 prof. ${L.cilML} (${sx > 0 ? '+' : '−'}X,${sy > 0 ? '+' : '−'}Y)`,
          [mX + sx * pernoMMX, sy * pernoMMY, webZ - 1], [0, 0, 1],
          r2(L.cilPernoDia + P.holgura.deslizante), r2(L.cilML + 1), false))),
      // 2 × Rc 3/8 en la CARA PLANA del lado J (a JA = 38 del eje, o sea 7.5 mm
      // rebajada respecto de la envolvente J), a PW = 74 del eje en Y y a GB / GA
      // de cada cara: el de abajo alimenta la cámara de EMPUJE
      ...puertoZ.map((z, i) => hole(
        `Puerto Rc3/8 ${i ? 'B (retorno)' : 'A (empuje)'} (Y=${puertoY}, Z=${z})`,
        [cilJfl, puertoY, z], [-1, 0, 0], L.cilPuertoDia, L.cilPuertoProf, false)),
    ],
    { componente: 'mgpm80_10z', hardware: true, parte: 'MGPM80-10Z',
      catalogo: 'SMC serie MGP · MGPM80-10Z (Ø80, carrera 10, casquillo de deslizamiento, con imán)' });

  E.addPart(
    `MÓVIL · NEUMÁTICA · Cilindro MGPM80-10Z — placa móvil ${L.cilT}×${L.cilS}×${L.cilFA} `
    + `(carrera aplicada ${P.carrera})`,
    COL.neumatica, [mX, 0, placaZ0],
    [
      box(`Placa móvil ${L.cilT}×${L.cilS}×${L.cilFA}`, [mX, 0, placaZ0], L.cilS, L.cilT, L.cilFA),
      // 4 × NN: M12 × 1.75 PASANTES, patrón R × Q = 174 × 52 (cat). Por aquí se
      // atornilla la horquilla de empuje; NO se rebaja la placa, que es por donde
      // van roscados el vástago y las dos varillas guía.
      ...[-1, 1].flatMap(sx => [-1, 1].map(sy =>
        hole(`4-NN M12×1.75 pasante (${sx > 0 ? '+' : '−'}X,${sy > 0 ? '+' : '−'}Y)`,
          [mX + sx * pernoNNX, sy * pernoNNY, placaZ0 - 1], [0, 0, 1],
          r2(L.cilPernoDia + P.holgura.deslizante)))),
      // Alojamientos de las DOS VARILLAS GUÍA (cat U/2 = ±78): caja Ø29.4 en la
      // cara superior —la que se ve en las dos fotos, con el tornillo de fijación
      // en el fondo— y asiento de la varilla por la cara inferior. Ø med, prof dis.
      ...[-1, 1].flatMap(sy => [
        hole(`Caja Ø${L.cilPlacaCajaDia}×${L.cilPlacaCajaProf} de varilla guía (${sy > 0 ? '+' : '−'}Y)`,
          [mX, sy * varillaY, placaZ1], [0, 0, -1], L.cilPlacaCajaDia, L.cilPlacaCajaProf, false),
        hole(`Asiento Ø${L.cilPlacaAsientoDia}×${L.cilPlacaAsientoProf} de varilla guía (${sy > 0 ? '+' : '−'}Y)`,
          [mX, sy * varillaY, placaZ0], [0, 0, 1], L.cilPlacaAsientoDia, L.cilPlacaAsientoProf, false),
      ]),
      // Extremo del vástago: caja Ø32.2 en la cara SUPERIOR y, en su fondo, el
      // ALOJAMIENTO HEXAGONAL de 20.8 e/c. Los dos se ven en la vista de planta
      // de la placa, dibujados con línea gruesa continua y concéntricos: el
      // hexágono está dentro de la caja y se ve desde arriba, luego se mecaniza
      // desde la misma cara. (La versión anterior lo cortaba desde la cara
      // INFERIOR y con 17.7 e/c; ni una cosa ni la otra: ver el bloque L.)
      hole(`Caja Ø${L.cilPlacaVastagoDia}×${L.cilPlacaCajaProf} del extremo del vástago`,
        [mX, 0, placaZ1], [0, 0, -1], L.cilPlacaVastagoDia, L.cilPlacaCajaProf, false),
      // (un boceto `cut` con side «pos» ocupa de zFace−h a zFace+0.5: poniendo
      //  zFace en la cara superior y h = la profundidad, la caja sale justo)
      perfilXY(`Alojamiento hexagonal ${L.cilPlacaHexAF} e/c × ${L.cilPlacaHexProf} del extremo del vástago`,
        placaZ1, hexPts(mX, 0, L.cilPlacaHexAF).map(([x, y]) => [r2(x), r2(y)]),
        L.cilPlacaHexProf, 'cut'),
    ],
    { componente: 'mgpm80_10z' });

  // Vástago del émbolo y varillas guía, a la vista en los 10 mm de carrera.
  // Se construyen por BOCETO circular extruido y no con `cyl` porque `bboxPieza`
  // infla la caja de un cilindro en ±r en los TRES ejes: las varillas, de 93 mm
  // en Z, saldrían de la envolvente del gate por abajo sin estar fuera de ella.
  // (Mismo recurso que el `disco()` de transmision.mjs.)
  const barraZ = (nombre, cx, cy, dia, z0, alto, n = 12) => {
    const f = sketchXY(nombre, z0, rectR(cx - dia / 2, cy - dia / 2, cx + dia / 2, cy + dia / 2, dia / 2, n), alto);
    // `bboxPieza` no lee params.u: para un boceto de normal +Z toma la base que
    // le da `baseOrtogonal`, que es u = [0,−1,0] · v = [1,0,0]. Se reexpresa el
    // contorno en ESA base (giro de +90°) y se declara u en consecuencia, de modo
    // que la caja del gate y el sólido —model.js y a_step.py sí leen params.u—
    // coincidan. El sólido resultante es exactamente el mismo.
    f.params.u = [0, -1, 0];
    f.params.pts = f.params.pts.map(([x, y]) => [r2(-y), r2(x)]);
    return f;
  };
  const vastagoL = r2(huecoFB + 20);                  // 48 — sale 28 y entra 20 en el cuerpo
  E.addPart(`MÓVIL · NEUMÁTICA · Cilindro MGPM80-10Z — vástago del émbolo Ø${L.cilVastagoDia} (émbolo Ø${P.mesaBore})`,
    COL.acero, [mX, 0, r2(placaZ0 - vastagoL)],
    [barraZ(`Vástago Ø${L.cilVastagoDia}×${vastagoL}`, mX, 0, L.cilVastagoDia, r2(placaZ0 - vastagoL), vastagoL)],
    { componente: 'mgpm80_10z' });
  for (const sy of [-1, 1]) {
    const y = sy * varillaY;
    E.addPart(
      `MÓVIL · NEUMÁTICA · Cilindro MGPM80-10Z — varilla guía Ø${L.cilDA} × ${varillaLargo} `
      + `(Y=${sy > 0 ? '+' : '−'}${varillaY}, asoma ${salidaElev} bajo el alma)`,
      COL.acero, [mX, y, varillaZ0],
      [barraZ(`Varilla guía Ø${L.cilDA}×${varillaLargo}`, mX, y, L.cilDA, varillaZ0, varillaLargo)],
      { componente: 'mgpm80_10z' });
  }

  // ---- 4 pernos M12 × 25 de fijación del cilindro al canal (por debajo) ----
  // El encargo los pedía SHCS; se dejan de CABEZA HEXAGONAL porque bajo el alma
  // sólo hay 12.34 mm hasta el plano inferior del bastidor: una cabeza cilíndrica
  // M12 (Ø18 × 12) más la golilla llegaría a Z = −1.7, y la hexagonal (7.5 de
  // alto) se queda en 2.84. Se aprietan con llave de vaso desde abajo igual.
  // Agarre: golilla 2 + alma 2.657 = 4.66 → 20.3 mm dentro de la rosca MM de
  // 25 de profundidad = 1.7 · d.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = r2(mX + sx * pernoMMX), y = sy * pernoMMY;
      const pos = `X=${x}, Y=${sy > 0 ? '+' : '−'}${pernoMMY}`;
      // golilla de serie estrecha (DIN 433, Ø20): con la ancha DIN 125 (Ø24) el
      // borde se acercaría a 1.6 mm del taladro Ø30 de paso de la varilla guía
      golilla(E, { nombre: `M12 cilindro (${pos})`, at: [x, y, canalZ0], dir: [0, 0, -1], dia: L.cilPernoDia, ext: 20, esp: 2, capa: 'FIJO · ' });
      pernoHex(E, { nombre: `M12 × 25 fijación del cilindro (${pos})`, at: [x, y, r2(canalZ0 - 2)], dir: [0, 0, 1], dia: L.cilPernoDia, largo: 25, af: 18, altoCab: 7.5, capa: 'FIJO · ' });
    }
  }

  // =========================================================================
  // 5. INTERFAZ CON EL MÓDULO MÓVIL
  //    Plato de empuje (la mesa empuja aquí el ROLLER FRAME WELDMENT) y
  //    4 pasadores guía en las colisas de las placas colgantes: el conjunto
  //    sube los 10 mm en paralelo y no bascula.
  // =========================================================================
  // La cara de empuje NO puede ser una placa maciza: el motorreductor cuelga
  // sobre el cilindro (Z ≥ 123.9, |Y| ≤ 54.9 a la cota de empuje).  Se resuelve
  // con una HORQUILLA de dos brazos a |Y| = 58…100, que pasan por fuera del
  // motor y apoyan en la cara inferior de los notched brace channel (Y ±80…120).
  //
  // Cambia respecto de la mesa inventada: los pernos ya no se ponen donde
  // convenga, sino en las 4 roscas NN REALES de la placa (M12, patrón 174 × 52),
  // o sea a X = ±26 e Y = ±87 del eje. Cada brazo lleva por tanto DOS pernos
  // alineados en X, y su línea de pernos (Y = 87) queda a 3 mm del centroide de
  // la zona de contacto (Y = 90): el brazo trabaja casi sin voladizo.
  // Los brazos miden en X lo mismo que la placa (S = 75) y se atornillan DESDE
  // ARRIBA con SHCS M12 × 30 alojados en cajas Ø19 × 13, de modo que la cabeza
  // queda 1 mm por debajo de la cara de empuje y no toca el larguero móvil.
  const brazoAncho = r2(L.brazoY1 - L.brazoY0);
  const cajaProf = 13, cajaDia = 19;                  // dis: caja del SHCS M12 (Ø18 × 12)
  const shcsL = r2(L.platoT - cajaProf + L.cilFA - 1);   // 30 — agarre 21 mm en la placa
  for (const sy of [1, -1]) {
    const yc = sy * r2((L.brazoY0 + L.brazoY1) / 2);
    E.addPart(
      `MÓVIL · Brazo de empuje de la horquilla ${L.cilS}×${brazoAncho}×${L.platoT} (Y=${sy > 0 ? '+' : '−'}${L.brazoY0}…${L.brazoY1}, cara de empuje Z=${platoZ1})`,
      COL.movil, [mX, yc, placaZ1],
      [
        box(`Brazo ${L.cilS}×${brazoAncho}×${L.platoT}`, [mX, yc, placaZ1], L.cilS, brazoAncho, L.platoT),
        ...[-1, 1].map(sx => hole(`Ø13.5 paso M12 (${sx > 0 ? '+' : '−'}X)`,
          [mX + sx * pernoNNX, sy * pernoNNY, platoZ1 + 1], [0, 0, -1], 13.5)),
        ...[-1, 1].map(sx => hole(`Caja Ø${cajaDia}×${cajaProf} para la cabeza SHCS (${sx > 0 ? '+' : '−'}X)`,
          [mX + sx * pernoNNX, sy * pernoNNY, platoZ1], [0, 0, -1], cajaDia, cajaProf, false)),
      ], { plano: true });
    for (const sx of [-1, 1]) {
      const x = r2(mX + sx * pernoNNX), zCab = r2(platoZ1 - cajaProf);
      E.addPart(
        `MÓVIL · Tornillo SHCS M12 × ${shcsL} de la horquilla (X=${x}, Y=${sy > 0 ? '+' : '−'}${pernoNNY})`,
        COL.tornillo, [x, sy * pernoNNY, zCab],
        [
          cyl('Cabeza cilíndrica Ø18×12', [x, sy * pernoNNY, zCab], [0, 0, 1], 18, 12),
          cyl(`Vástago M12×${shcsL}`, [x, sy * pernoNNY, zCab], [0, 0, -1], L.cilPernoDia, shcsL),
        ], { hardware: true, norma: 'ISO 4762 / DIN 912 M12 × 1.75' });
    }
  }

  // Pasadores guía: van empotrados en el bastidor MÓVIL y ruedan por las colisas
  // de las placas colgantes; entran desde dentro y no llegan al alma del SIDE
  // CHANNEL, así que no hay que retenerlos por fuera.
  for (const x of L.guiaX) {
    for (const sy of [1, -1]) {
      const d = [0, sy, 0], y0 = sy * (L.guiaMontY - 10);
      const largo = r2(placaY + P.placaT - 1 - (L.guiaMontY - 10));  // hasta 1 mm antes de la cara exterior
      const zPin = r2(L.guiaZ + L.guiaRecorrido / 2 - 1);        // elevado: 1 mm del tope superior
      const pos = `X=${x}, Y=${sy > 0 ? '+' : '−'}${r2(placaY + P.placaT / 2)}`;
      E.addPart(
        `MÓVIL · Pasador guía Ø${L.guiaPasador} × ${largo} en colisa (${pos}, Z=${zPin})`,
        COL.tornillo, [x, y0, zPin],
        [
          cyl(`Collar Ø25.4×10`, [x, y0, zPin], d, 25.4, 10),
          cyl(`Vástago Ø${L.guiaPasador}×${largo}`, [x, y0, zPin], d, L.guiaPasador, largo),
        ], { hardware: true, norma: 'perno de hombro 1/2" (042.512)' });
    }
  }

  // =========================================================================
  // 6. NEUMÁTICA: soporte, válvula, silenciadores, racores y tubería
  //    Toda la instalación se muda al PASILLO +X del canal (X 277…345.8), que es
  //    el lado J por el que el MGPM saca sus dos puertos Rc 3/8: la tubería se
  //    reduce a dos tramos rectos en el plano X = L.tuboX.
  // =========================================================================
  const [vY0, vY1] = L.valvY, [vX0, vX1] = L.valvX, vAlto = P.valvula[2];
  const [sX0, sX1] = L.sopX, [sY0, sY1] = L.sopY;
  const valvZ0 = webZ;                                           // el soporte apoya en el alma
  const sopZ1 = r2(valvZ0 + P.placaT);                           // 19.76 — cara superior del soporte
  const vZ0 = sopZ1, vZ1 = r2(vZ0 + vAlto);                      // 19.76 … 79.76
  const vYc = r2((vY0 + vY1) / 2), vXc = r2((vX0 + vX1) / 2);    // −136, 319
  const vTornY = r2(vYc + 24);                        // −112 — lejos de los racores A/B (Y=−136)

  E.addPart(
    `FIJO · Soporte de válvula 3/16" ${r2(sX1 - sX0)}×${r2(sY1 - sY0)}`,
    COL.chapaOsc, [sX0, sY0, valvZ0],
    [
      box(`Placa de soporte ${r2(sX1 - sX0)}×${r2(sY1 - sY0)}×${P.placaT}`,
        [r2((sX0 + sX1) / 2), r2((sY0 + sY1) / 2), valvZ0], r2(sX1 - sX0), r2(sY1 - sY0), P.placaT),
      ...L.sopPernos.map(([x, y]) => hole(`Ø7.9 anclaje al canal (X=${x}, Y=${y})`, [x, y, valvZ0 - 1], [0, 0, 1], 7.9)),
      ...[-1, 1].map(s => hole(`Rosca 1/4-20 de la válvula (${s > 0 ? '+' : '−'}X)`,
        [r2(vXc + s * 16), vTornY, sopZ1 + 1], [0, 0, -1], b14.d, P.placaT + 1, false)),
    ], { plano: true });

  for (const [x, y] of L.sopPernos) {
    golilla(E, { nombre: `1/4" soporte de válvula (X=${x}, Y=${y})`, at: [x, y, canalZ0], dir: [0, 0, -1], dia: b14.d, ext: 16, esp: 2, capa: 'FIJO · ' });
    pernoHex(E, { nombre: `1/4-20 × 1-1/4" soporte de válvula (X=${x}, Y=${y})`, at: [x, y, r2(canalZ0 - 2)], dir: [0, 0, 1], dia: b14.d, largo: r2(1.25 * IN), af: b14.af, altoCab: b14.hh, capa: 'FIJO · ' });
    tuercaHex(E, { nombre: `1/4-20 soporte de válvula (X=${x}, Y=${y})`, at: [x, y, sopZ1], dir: [0, 0, 1], dia: b14.d, af: b14.af, alto: b14.tuerca, capa: 'FIJO · ' });
  }

  // Orientación de la válvula: el solenoide sale por −Y (queda dentro del canal,
  // |Y| ≤ 221, y por debajo de la placa colgante, que arranca en Z=88) y el
  // accionamiento manual por +Y. Las dos caras en X están ocupadas: en −X los
  // racores A/B que miran al cilindro y en +X el ala del canal (X ≥ 345.8).
  E.addPart(
    `FIJO · NEUMÁTICA · Válvula 4 vías monosolenoide 24 VDC ${P.valvula.join('×')} (094.10795)`,
    COL.neumatica, [vX0, vY0, vZ0],
    [
      box(`Cuerpo ${P.valvula.join('×')}`, [vXc, vYc, vZ0], r2(vX1 - vX0), r2(vY1 - vY0), vAlto),
      cyl('Solenoide 24 VDC Ø30×42', [vXc, vY0, r2(vZ0 + vAlto * 0.55)], [0, -1, 0], 30, 42),
      cyl('Accionamiento manual Ø10', [vXc, vY1, r2(vZ0 + vAlto * 0.55)], [0, 1, 0], 10, 8),
      // escapes en la cara SUPERIOR y puertos de trabajo A/B en la cara −X
      ...L.silenX.map(x => hole(`Escape 1/8 NPT (X=${x})`, [x, vYc, vZ1], [0, 0, -1], 9.5, 10, false)),
      ...puertoZ.map((z, i) => hole(`Puerto de trabajo 1/4 ${i ? 'B' : 'A'} (Z=${z})`, [vX0, vYc, z], [1, 0, 0], 16.4, 12, false)),
      ...[-1, 1].map(s => hole(`Ø7.9 fijación al soporte (${s > 0 ? '+' : '−'}X)`, [r2(vXc + s * 16), vTornY, vZ1 + 1], [0, 0, -1], 7.9)),
    ], { hardware: true, componente: 'valvula_4v_24vdc', parte: '094.10795' });

  for (const s of [-1, 1]) {
    const x = r2(vXc + s * 16);
    golilla(E, { nombre: `1/4" válvula↔soporte (X=${x})`, at: [x, vTornY, vZ1], dir: [0, 0, 1], dia: b14.d, ext: 16, esp: 2, capa: 'FIJO · NEUMÁTICA · ' });
    pernoHex(E, { nombre: `1/4-20 × 2-1/2" válvula↔soporte (X=${x})`, at: [x, vTornY, r2(vZ1 + 2)], dir: [0, 0, -1], dia: b14.d, largo: r2(2.5 * IN), af: b14.af, altoCab: b14.hh, capa: 'FIJO · NEUMÁTICA · ' });
  }

  for (const x of L.silenX) {
    E.addPart(`FIJO · NEUMÁTICA · Silenciador 1/8" NPT Ø${L.silenDia} (X=${x}) (923.0059)`, COL.inox,
      [x, vYc, vZ1], [
        cyl('Niple 1/8 NPT Ø9.5×7', [x, vYc, vZ1], [0, 0, 1], 9.5, 7),
        cyl(`Cuerpo sinterizado Ø${L.silenDia}×20`, [x, vYc, r2(vZ1 + 7)], [0, 0, 1], L.silenDia, 20),
      ], { hardware: true, parte: '923.0059' });
  }

  // ---- racores codo giratorios 360° sobre la válvula (cara −X) ------------
  // El brazo del codo sale hacia +Y y el tubo sube por el plano X = L.tuboX,
  // libre entre el cuerpo del cilindro (X ≤ 277) y la válvula (X ≥ 296).
  const codoY = r2(vY1 - 16);                        // −116 — donde acaba el brazo del codo
  puertoZ.forEach((z, i) => {
    E.addPart(`FIJO · NEUMÁTICA · Racor codo giratorio 360° 1/4" (válvula, puerto ${i ? 'B' : 'A'}, Z=${z})`,
      COL.neumatica, [vX0, vYc, z], [
        cyl('Cuerpo Ø16', [r2(vX0 + 6), vYc, z], [-1, 0, 0], 16, r2(vX0 - L.tuboX + 6)),
        cyl('Salida giratoria Ø13', [L.tuboX, vYc, z], [0, 1, 0], 13, r2(codoY - vYc)),
        hole('Ø8.2 paso de tubo', [L.tuboX, r2(codoY + 2), z], [0, -1, 0], r2(P.tuboOD + 0.3), 26, false),
      ], { hardware: true, parte: '094.1406 (codo macho giratorio 360°)' });
  });

  // ---- racores codo giratorios 360° en los puertos Rc3/8 del cilindro -----
  // Niple Rc 3/8 dentro del puerto + cuerpo por fuera + salida giratoria hacia −Y.
  // Los puertos están donde los pone el catálogo —PW = 74 del eje en Y y sobre la
  // cara plana del lado J, a JA = 38 del eje—, no en el plano medio: el racor sale
  // por tanto de X = 269.5, Y = −74, y la tubería hasta la válvula (Y −172…−100)
  // baja de los 96 mm que medía a un tramo corto.
  const niple = r2(L.cilPuertoProf - 1);             // 11 — cabe en el puerto de 12
  const codoCilY = r2(puertoY - 12);                 // −86 — final del brazo del codo
  puertoZ.forEach((z, i) => {
    E.addPart(`FIJO · NEUMÁTICA · Racor codo giratorio 360° Rc3/8–1/4" (cilindro, puerto ${i ? 'B' : 'A'}, Y=${puertoY}, Z=${z})`,
      COL.neumatica, [cilJfl, puertoY, z], [
        cyl(`Niple Rc3/8 Ø16.4×${niple}`, [r2(cilJfl - niple), puertoY, z], [1, 0, 0], 16.4, niple),
        cyl('Cuerpo Ø22', [cilJfl, puertoY, z], [1, 0, 0], 22, r2(L.tuboX - cilJfl + 8)),
        cyl('Salida giratoria Ø13', [L.tuboX, puertoY, z], [0, -1, 0], 13, r2(puertoY - codoCilY)),
        hole('Ø8.2 paso de tubo', [L.tuboX, r2(puertoY + 2), z], [0, -1, 0], r2(P.tuboOD + 0.3), 26, false),
      ], { hardware: true, parte: '094.1406 (codo macho giratorio 360°)' });
  });

  // ---- tubería de 1/4" (P.tuboOD): dos tramos rectos en X = L.tuboX -------
  const rutas = puertoZ.map(z => [[L.tuboX, r2(codoY + 4), z], [L.tuboX, r2(codoCilY - 4), z]]);
  const tubos = rutas.map(r => tubo(r, P.tuboOD));
  tubos.forEach((t, i) => {
    E.addPart(`FIJO · NEUMÁTICA · Tubería 1/4" OD Ø${r2(P.tuboOD)} — línea ${i ? 'B' : 'A'} (válvula → cilindro, ${t.largo} mm)`,
      COL.neumatica, rutas[i][0], t.features, { hardware: true, parte: '094.1148 (tubo PU 1/4 in. OD)' });
  });
  const tuberiaMm = r2(tubos.reduce((a, t) => a + t.largo, 0));

  // =========================================================================
  // 7. DIMENSIONADO — todo sale de las cotas de catálogo del MGPM80-10Z
  // =========================================================================
  // --- fuerza ---------------------------------------------------------------
  // Áreas REALES de catálogo (5027 / 4536 mm²), no π·D²/4: el émbolo del MGP
  // lleva el vástago Ø25 restado en el retorno y SMC publica las dos.
  const area = L.cilArea[0], areaRet = L.cilArea[1];              // cat, mm²
  const empuje = area * L.presionBar / 10;                        // N a 6 bar  (1 bar = 0.1 N/mm²)
  const empuje60 = area * L.presionTrabajoBar / 10;               // N a 4.14 bar = 60 psi (cat del equipo)
  const retorno60 = areaRet * L.presionTrabajoBar / 10;           // N de retorno a 4.14 bar
  const carga = (L.masaMovilKg + P.cargaMaxKg) * 9.80665;         // N — masa móvil + bulto máximo
  // Convención del repositorio: el empuje de catálogo es teórico y el factor de
  // seguridad se calcula sobre el empuje ÚTIL (rendimiento 0.85 por juntas y
  // rozamiento de las guías), igual que en el primer dimensionado del módulo.
  const util = empuje * L.rendimiento, util60 = empuje60 * L.rendimiento;

  // --- velocidad: la limita la ENERGÍA CINÉTICA admisible, no el caudal -----
  // El cilindro admite 50…400 mm/s, pero sus topes de goma sólo absorben 2.71 J.
  // Con M = masa elevada y m = masa móvil del propio cilindro (4.27 kg cat):
  //     u = √( 2·Ek_adm / (M + m) )
  const masaElevada = L.masaMovilKg + P.cargaMaxKg;               // 89 kg
  const masaTotalMovil = r2(masaElevada + L.cilMasaMovil);        // 93.27 kg
  const uMax = Math.sqrt(2 * L.cilEkAdm / masaTotalMovil);        // m/s — velocidad de impacto máxima
  const ekDiseno = 0.5 * masaTotalMovil * uMax * uMax;            // J — por construcción = cilEkAdm
  // Nota del catálogo: la velocidad de impacto es u = 1.4 · velocidad media.
  const uMedia = uMax / 1.4;                                      // m/s
  const tSubida = P.carrera / (uMedia * 1000);                    // s

  // --- consumo de aire por ciclo (ida + vuelta) a la presión de trabajo -----
  // Volumen geométrico × relación de compresión (presión absoluta / atmósfera).
  const compresion = (L.presionTrabajoBar + L.presionAtmBar) / L.presionAtmBar;
  const aireCiclo = (area + areaRet) * P.carrera / 1e6 * compresion;   // litros ANR

  // --- par y carga lateral sobre la placa móvil -----------------------------
  // Los dos brazos de la horquilla EMPUJAN contra la cara inferior de los
  // notched brace channel: no van atornillados a ellos. Por tanto no pueden
  // transmitir a la placa más fuerza horizontal ni más par que el rozamiento de
  // sus dos apoyos; todo lo que exceda de eso desliza y lo reaccionan los 4
  // pasadores guía en colisa, que es exactamente su función. Esa es la cota
  // superior que se compara con los límites de catálogo.
  const anchoContacto = r2(L.brazoY1 - L.contactoY[0]);           // 20 — ancho útil de cada apoyo
  const yContacto = r2((L.contactoY[0] + L.brazoY1) / 2);         // 90 — centroide de cada apoyo
  const areaContacto = r2(2 * anchoContacto * L.cilS);            // mm² — los dos apoyos
  // radio polar medio de las dos huellas de contacto respecto del eje del émbolo
  const rApoyo = Math.sqrt(L.cilS ** 2 / 12 + yContacto ** 2 + anchoContacto ** 2 / 12);
  const cargaLateral = L.muApoyo * carga;                         // N
  const parPlaca = L.muApoyo * carga * rApoyo / 1000;             // N·m
  // Excentricidad residual del CG del conjunto móvil respecto del eje del
  // cilindro: el cassette es simétrico respecto de X = P.largo/2 = 231.5 (placas
  // peine en 40.1 y 422.9, travesaños centrados), así que sólo descentra el
  // motorreductor. Con la mesa ya centrada en 231.5:
  const excCG = r2(L.masaMotorKg * (L.cgMotorX - mX) / (L.masaMovilKg + P.cargaMaxKg));
  const parExcentricidad = r2(carga * Math.abs(excCG) / 1000);    // N·m

  // --- geometría crítica ----------------------------------------------------
  const r3 = (v) => Math.round(v * 1000) / 1000;                  // 3 decimales, sin ruido de coma flotante
  const holguraPlacaMotor = r2(L.motorZ0 - placaZ1);              // placa móvil ↔ cárter del reductor
  const libreBajoAlma = webZ;                                     // hueco libre bajo la cara de fijación

  return {
    actuador: 'SMC MGPM80-10Z — cilindro compacto con guías, casquillo de deslizamiento, con imán',
    componente: 'mgpm80_10z',
    carrera: P.carrera,
    carreraActuador: P.mesaCarrera,
    topeCarrera: 'ninguno: la carrera de catálogo (10 mm) ES la del equipo; amortiguación por '
      + 'tope de goma de serie en ambos extremos (cat). Desaparecen los 2 tirantes M12 postizos.',
    ajusteAltura: `4 jack bolts 3/8-16 (2 tuercas c/u) + 4 tornillos 3/8-16 en colisas ${L.colisaAncho}×${L.colisaLargo} (recorrido ${r2(L.colisaLargo - L.colisaAncho)} mm)`,

    // ---- fuerza (cat: área de empuje 5027 mm², de retorno 4536 mm²) --------
    areaEmboloMm2: area,
    areaRetornoMm2: areaRet,
    empujeN: r2(empuje),                    // teórico a L.presionBar = 6.0 bar
    empujeUtilN: r2(util),                  // ×0.85 de rendimiento
    empujeN60psi: r2(empuje60),             // teórico a 4.14 bar (presión de trabajo del ProSort)
    empujeUtil60psiN: r2(util60),
    retornoN60psi: r2(retorno60),           // el descenso además va a favor de la gravedad
    cargaN: r2(carga),
    masaElevadaKg: masaElevada,
    factorSeguridad: r2(util / carga),          // a 6 bar, sobre el empuje útil
    factorSeguridad60psi: r2(util60 / carga),   // a 4.14 bar, sobre el empuje útil
    presionMinimaBar: r2(carga / L.rendimiento / area * 10),   // presión a la que FS = 1.0

    // ---- velocidad, tiempo y aire (cat: 50…400 mm/s, Ek adm 2.71 J) -------
    masaMovilCilindroKg: L.cilMasaMovil,
    masaTotalMovilKg: masaTotalMovil,
    velocidadMaxMs: r3(uMax),       // impacto máximo que admiten los topes
    velocidadMaxMmS: r2(uMax * 1000),
    velocidadAdmisibleMmS: L.cilVelAdm,         // cat
    energiaCineticaJ: r3(ekDiseno),
    energiaAdmisibleJ: L.cilEkAdm,              // cat
    velocidadMediaMmS: r2(uMedia * 1000),       // u = 1.4 · media (nota del catálogo)
    tiempoSubidaMs: r2(tSubida * 1000),
    aireLitrosANRciclo: r3(aireCiclo),
    aireLitrosANRmin20cpm: r2(aireCiclo * 20),

    // ---- estabilidad de la placa (cat: 352 N y 21.9 N·m) ------------------
    cargaLateralN: r2(cargaLateral),
    cargaLateralAdmisibleN: L.cilLateralAdm,
    parPlacaNm: r2(parPlaca),
    parAdmisibleNm: L.cilParAdm,
    parPlacaCriterio: `cota superior por rozamiento en los dos apoyos de la horquilla `
      + `(μ = ${L.muApoyo}, radio polar medio ${r2(rApoyo)} mm): por encima deslizan y el par lo `
      + `toman los 4 pasadores guía. El par por excentricidad del CG es ${parExcentricidad} N·m.`,
    excentricidadCGmm: excCG,
    parExcentricidadNm: parExcentricidad,
    noGiroGrados: L.cilNoGiro,                  // cat ±0.04°

    // ---- geometría --------------------------------------------------------
    huellaCuerpoMm: [mw, md],                   // 91.5 (X) × 202 (Y)
    alturaTotalRetraidaMm: L.cilA,              // cat A = 115
    zCaraEmpuje: platoZ1,
    zCaraFijacion: webZ,
    zCuerpo: [webZ, cuerpoZ1],
    zPlacaMovil: [placaZ0, placaZ1],
    holguraPlacaMotorMm: holguraPlacaMotor,     // ≥ L.platoHolguraMotor
    // Despeje que hay que reservar bajo la cara de fijación para las varillas
    // guía: la posición más baja que alcanza su punta, que es la del estado
    // RETRAÍDO, cat E = 18.5 mm. Van solidarias a la PLACA, así que al elevar
    // ENTRAN y sólo asoman 8.5 (estado modelado).
    salidaVarillasMm: salidaDespeje,            // 18.5 — despeje reservado
    salidaVarillasElevadoMm: salidaElev,        // 8.5  — estado modelado
    salidaVarillasRetraidoMm: salidaRetr,       // 18.5 — cat E, el caso envolvente
    libreBajoAlmaMm: libreBajoAlma,             // hueco real bajo la cara de fijación
    pasoVarillasCanal: `2 taladros Ø30 en el alma del canal, a X=${mX} e Y=±${varillaY}; `
      + `bajo ellos no hay ninguna pieza (el canal base ocupa X 26…102.2)`,

    empujeInterfaz: `horquilla de 2 brazos en Y=±${L.brazoY0}…${L.brazoY1}, atornillados a las 4 roscas `
      + `NN reales de la placa (M12, X=±${pernoNNX}, Y=±${pernoNNY}); contacto de ${anchoContacto} × ${L.cilS} mm `
      + `por brazo contra la cara inferior de los notched brace channel (Y=±${L.contactoY[0]}…${L.contactoY[1]})`,
    huecoMotorMm: r2(L.brazoY0 - L.motorY143),   // holgura de la horquilla al motorreductor
    presionContactoMPa: r3(carga / areaContacto),
    canalZ: [canalZ0, canalZ1],
    desarrolloCanalMm: desa.largo,
    plegadosCanal: desa.plegados.length,
    tuberiaMm,
    piezas: E.parts.length,
  };
}

export default elevacion;
