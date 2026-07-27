// elevacion.mjs — SISTEMA DE ELEVACIÓN (pop-up) Y NEUMÁTICA de la transferencia
// 90° de bandas angostas (Hytrol ProSort MRT 90° Transfer).
//
// Contenido (reparto del CONTRATO.md §6):
//   · mesa guía neumática Ø100 × 20 mm de carrera (923.01022, tipo SMC MGF100)
//   · CYLINDER MOUNTING CHANNEL (WA-025833) de chapa 12 GA conformada, con sus
//     placas colgantes y las COLISAS de ajuste de 3/8"
//   · 4 jack bolts 3/8-16 con dos tuercas y golilla cada uno
//   · válvula 4 vías monosolenoide 24 VDC, su soporte, 2 silenciadores 1/8" NPT,
//     racores codo giratorios 360°, unión Unifit 1/4" y tubería de 1/4"
//   · interfaz con el módulo móvil: plato de empuje + 4 pasadores guía en colisa
//
// Ejes (CONTRATO.md §1):  X = eje de los rodillos · Y = expulsión a 90° ·
// Z = arriba, Z = 0 en la cara inferior del bastidor.  Unidades: mm.
// Estado modelado: **ELEVADO** — la mesa guía está dibujada con los 10 mm de
// P.carrera aplicados (placa móvil arriba), coherente con los rodillos en P.rodZ.
//
// CÓMO FUNCIONA (texto del manual, pág. 8):
//   La mesa guía neumática empuja hacia arriba el ROLLER FRAME WELDMENT a través
//   del plato de empuje. La mesa NO es un cilindro suelto: lleva émbolo central
//   Ø100 y dos columnas guía, y es lo que garantiza el paralelismo del plano de
//   rodillos. Su carrera de catálogo es de 20 mm y se limita a los 10 mm de la
//   cota «0.394—MOVEMENT» con dos TIRANTES DE TOPE regulables (M12) que atraviesan
//   el cuerpo y van roscados a la placa móvil: su cabeza topa contra la cara
//   inferior del cuerpo. Se ajustan girando la cabeza (accesible por debajo del
//   canal) y se bloquean con la contratuerca que apoya bajo la placa móvil.
//   La altura del conjunto se ajusta como dice el manual: «Loosen 3/8 in. bolts
//   holding the cylinder-mounting channel. Adjust using jack bolts, tighten
//   3/8 in. bolts» ⇒ se aflojan los 4 tornillos de 3/8" que van en COLISAS
//   VERTICALES de las placas colgantes (recorrido real 25.4 mm), se sube o baja
//   el canal con los 4 jack bolts (tuerca por encima y por debajo de la ménsula
//   inferior: se afloja una y se aprieta la otra) y se vuelven a apretar.

import {
  Ensamble, box, cyl, hole, sketchXZ, colisa,
  seccionChapa, desarrollo, pernoHex, tuercaHex, golilla, COL, r2, IN,
} from './lib.mjs';
import { P } from './params.mjs';

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
  placaZ0: 88,             // dis: por encima del ala inferior del SIDE CHANNEL (83.6…86.2)
  placaZ1: 246,            // dis: por debajo del ala superior del SIDE CHANNEL (248.7…251.3)
  placaZfull: 195,         // dis: cota hasta la que la placa es de ancho completo
  montanteAncho: 36,       // dis: ancho en X de los dos montantes que suben a las colisas
  ajusteX: [141.5, 321.5], // dis: P.largo/2 ∓ 90 — libres de la unión SIDE CHANNEL↔anfitrión (X 60/231.5/403)
  ajusteZ: 225,            // dis: centro de la colisa, dentro del alma del SIDE CHANNEL
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

  // --- mesa guía neumática (cat 923.01022 · SMC MGF100-30 con espaciador) ---
  mesaPlacaT: 25,          // dis: espesor de la mesa móvil (P.mesaAlto − cuerpo)
  mesaColDia: 30,          // dis: columnas guía (par que da el paralelismo)
  mesaColSep: 55,          // dis: semidistancia entre columnas guía, en X
  mesaVastago: 36,         // cat: Ø vástago del MGF100 = 36 mm
  mesaPernoDia: 12,        // cat: 4 × M12 × 1.75 de fijación
  mesaPernoX: 62,          // dis: reparto de los 4 pernos dentro de la huella 170 × 200
  mesaPernoY: 85,          // dis
  topeY: 70,               // dis: tirantes de tope de carrera, a ±70 en Y
  topeDia: 12,             // dis: M12
  platoT: 12,              // dis: plato de empuje contra el ROLLER FRAME WELDMENT

  // --- neumática -----------------------------------------------------------
  // med (vista izquierda): el bloque de válvulas ocupa Y −185…−248, Z 25…117.
  // Se monta sobre la cara exterior del ala −X del canal, dentro de la
  // envolvente (en la vista derecha el fabricante lo dibuja saliendo por la
  // izquierda del bastidor, en X < 0; aquí se lleva dentro — dis).
  valvY: [-227, -155],     // med Y del bloque neumático
  valvZ0: 40,              // med: repisa del soporte (Z 25…117 del bloque)
  silenDia: 18,            // cat 923.0059 MUFFLER - 1/8 in. NPT
  puertoZ: [75, 45],       // dis: puertos A/B en la cara −X del cuerpo de la mesa
  puertoY: [-70, -45],     // dis
  radioTubo: 25,           // dis: radio de curvatura del tubo de 1/4" (≥ 3 × OD)

  // --- masas para el dimensionado ------------------------------------------
  masaMovilKg: 55,         // dis: ROLLER FRAME WELDMENT + 6 rodillos + serpentín y
                           // poleas + motorreductor SEW RF07 (7.9 kg cat) ≈ 45–60 kg
  presionBar: 6.0,         // dis: presión de red del cálculo pedido
  presionTrabajoBar: 4.14, // cat: «Working pressure 60 PSI» del ProSort MRT
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
  // =========================================================================
  const cuerpoH = P.mesaAlto - L.mesaPlacaT;          // 81 — cuerpo de la mesa guía
  // Se despeja canalZ0 para que la cara superior del plato de empuje quede en
  // P.rielInfZ con la carrera aplicada:
  //   rielInfZ = canalZ0 + t12 + cuerpoH + carrera + placaT + platoT
  const canalZ0 = r2(P.rielInfZ - L.platoT - L.mesaPlacaT - P.carrera - cuerpoH - t12);  // 12.84
  const canalX1 = L.canalX0 + P.canalCilY;            // 348.5
  const canalZ1 = r2(canalZ0 + P.canalCilZ);          // 115.84
  const ladoInt = r2(L.ladoY - t12 / 2);              // 225.91 — cara interior del alma del SIDE CHANNEL
  const ladoExt = r2(P.almaY + t12 / 2);              // 231.23 — cara exterior del alma anfitriona
  const placaY = r2(ladoInt - P.placaT);              // 221.15 — cara interior de la placa colgante
  const webZ = r2(canalZ0 + t12);                     // 15.5 — cara superior del alma del canal
  const cuerpoZ1 = r2(webZ + cuerpoH);                // 96.5 — cara superior del cuerpo de la mesa
  const placaZ0 = r2(cuerpoZ1 + P.carrera);           // 106.5 — cara inferior de la mesa móvil (ELEVADA)
  const placaZ1 = r2(placaZ0 + L.mesaPlacaT);         // 131.5
  const platoZ1 = r2(placaZ1 + L.platoT);             // 143.5 = P.rielInfZ
  const mX = P.largo / 2;                             // 231.5 — centro del módulo en X
  const [mw, md] = P.mesaPlaca;                       // 170 × 200 — huella de la mesa
  const mX0 = r2(mX - mw / 2);                        // 146.5 — cara −X del cuerpo (puertos)

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
      // fijación de la mesa guía: 4 pasantes de M12 en el alma
      ...[-1, 1].flatMap(sx => [-1, 1].map(sy =>
        hole(`Ø13.5 fijación mesa (${sx > 0 ? '+' : '−'}X,${sy > 0 ? '+' : '−'}Y)`,
          [mX + sx * L.mesaPernoX, sy * L.mesaPernoY, canalZ0 - 1], [0, 0, 1], 13.5))),
      // paso de la cabeza de los tirantes de tope de carrera
      ...[-1, 1].map(sy => hole(`Ø30 paso cabeza tirante de tope (${sy > 0 ? '+' : '−'}Y)`,
        [mX, sy * L.topeY, canalZ0 - 1], [0, 0, 1], 30)),
      // fijación del soporte de la válvula (2 × 1/4-20 en el ala −X)
      ...[-219, -163].map(y => hole(`Ø7.9 soporte de válvula (Y=${y})`,
        [L.canalX0 - 1, y, 100], [1, 0, 0], 7.9)),
      // rebaje de las alas para que pase el ala inferior del SIDE CHANNEL
      // (bastidor.mjs: ala hacia dentro hasta Y=189.1 en Z 83.6…86.2)
      ...[1, -1].map(s => box(`Rebaje paso ala SIDE CHANNEL (${s > 0 ? '+' : '−'}Y)`,
        [mX, s * 204.5, 82], P.canalCilY + 10, 35, 6.5, 'cut')),
    ],
    {
      chapa: { t: r2(t12), material: 'acero al carbono 12 GA', fibra, radio: P.radioPliegue },
      desarrollo: desa, plano: true, parte: 'WA-025833',
    });

  // ---- placas colgantes (mismo weldment) con las COLISAS DE AJUSTE ---------
  // Perfil: ancho completo hasta placaZfull y dos montantes hasta placaZ1, que
  // solapan el alma del canal lateral fijo (P.canalBotZ … P.canalTopZ).
  const ma = L.montanteAncho / 2;
  const perfilPlaca = [
    [L.canalX0, L.placaZ0], [canalX1, L.placaZ0], [canalX1, L.placaZfull],
    [L.ajusteX[1] + ma, L.placaZfull], [L.ajusteX[1] + ma, L.placaZ1], [L.ajusteX[1] - ma, L.placaZ1],
    [L.ajusteX[1] - ma, L.placaZfull],
    [L.ajusteX[0] + ma, L.placaZfull], [L.ajusteX[0] + ma, L.placaZ1], [L.ajusteX[0] - ma, L.placaZ1],
    [L.ajusteX[0] - ma, L.placaZfull], [L.canalX0, L.placaZfull],
  ];
  for (const s of [1, -1]) {
    const yUnion = s > 0 ? ladoInt : -placaY;   // sketchXZ extruye h hacia −Y desde yFace
    const yCorte = s > 0 ? placaY - 0.5 : -ladoInt - 0.5;
    E.addPart(
      `FIJO · Placa colgante del canal 3/16" con colisas ${L.colisaAncho}×${L.colisaLargo} (Y=${s > 0 ? '+' : '−'}${r2(placaY + P.placaT / 2)})`,
      COL.chapaOsc, [L.canalX0, s * placaY, L.placaZ0],
      [
        sketchXZ('Placa 3/16" recortada', yUnion, perfilPlaca, P.placaT),
        // 2 colisas verticales de ajuste (tornillos de 3/8" del procedimiento del manual)
        ...L.ajusteX.map(x => sketchXZ(`Colisa de ajuste ${L.colisaAncho}×${L.colisaLargo} (X=${x})`,
          yCorte, colisa(x, L.ajusteZ, L.colisaLargo, L.colisaAncho, true), P.placaT + 1, 'cut')),
        // 2 colisas de guía del movimiento vertical (tope de seguridad de la carrera)
        ...L.guiaX.map(x => sketchXZ(`Colisa de guía ${r2(L.guiaPasador + 0.2)}×${r2(L.guiaPasador + 0.2 + L.guiaRecorrido)} (X=${x})`,
          yCorte, colisa(x, L.guiaZ, L.guiaPasador + 0.2 + L.guiaRecorrido, L.guiaPasador + 0.2, true), P.placaT + 1, 'cut')),
      ],
      { plano: true, parte: 'WA-025833 (placa colgante)' });
  }

  // =========================================================================
  // 2. JACK BOLTS 3/8-16 × 6" — 4, en Y = ±P.jackY
  //    Cabeza + golilla apoyadas sobre la ménsula superior (fija, bajo el ala
  //    del canal lateral, Z = P.jackSupZ); dos tuercas — una por encima y otra
  //    por debajo — sobre la ménsula inferior del canal (Z = P.jackInfZ):
  //    se afloja una y se aprieta la otra para subir o bajar ese punto.
  // =========================================================================
  const mT = t12 / 2;                     // ménsula inferior de 12 GA centrada en P.jackInfZ
  const zApoyo = r2(P.jackSupZ + t12);    // cara superior de la ménsula superior (12 GA)
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
      const yOut = sy * r2(ladoExt + 1.67), d = [0, -sy, 0];
      const pos = `X=${x}, Y=${sy > 0 ? '+' : '−'}${ladoExt}`;
      golilla(E, { nombre: `3/8" de colisa (${pos})`, at: [x, yOut, L.ajusteZ], dir: d, dia: b38.d, ext: 25, esp: 1.67, capa: 'FIJO · ' });
      pernoHex(E, { nombre: `3/8-16 × 1" de colisa (${pos})`, at: [x, yOut, L.ajusteZ], dir: d, dia: b38.d, largo: IN, af: b38.af, altoCab: b38.hh, capa: 'FIJO · ' });
      tuercaHex(E, { nombre: `3/8-16 de colisa (${pos})`, at: [x, sy * placaY, L.ajusteZ], dir: d, dia: b38.d, af: b38.af, alto: b38.tuerca, capa: 'FIJO · ' });
    }
  }

  // =========================================================================
  // 4. MESA GUÍA NEUMÁTICA Ø100 × 20 (cat 923.01022 — SMC MGF100)
  //    Dibujada CON LA CARRERA APLICADA: placa móvil 10 mm arriba del cuerpo.
  // =========================================================================
  E.addPart(
    `FIJO · NEUMÁTICA · Mesa guía Ø${P.mesaBore} × ${P.mesaCarrera} mm — cuerpo ${mw}×${md}×${cuerpoH} (923.01022)`,
    COL.neumatica, [mX, 0, webZ],
    [
      box(`Cuerpo ${mw}×${md}×${cuerpoH}`, [mX, 0, webZ], mw, md, cuerpoH),
      // alojamientos: émbolo central y las dos columnas guía
      hole(`Ø${L.mesaVastago + 1} vástago`, [mX, 0, cuerpoZ1 + 1], [0, 0, -1], L.mesaVastago + 1, cuerpoH, false),
      ...[-1, 1].map(s => hole(`Ø${L.mesaColDia + 1} columna guía (${s > 0 ? '+' : '−'}X)`,
        [mX + s * L.mesaColSep, 0, cuerpoZ1 + 1], [0, 0, -1], L.mesaColDia + 1, cuerpoH, false)),
      // Taladro pasante Ø14 de cada tirante de tope, con caja Ø25 × 9 en la cara
      // superior para que la contratuerca se aloje al retraerse.  Es UNA sola
      // función escalonada (pasante + cbore): dos cortes coaxiales separados
      // dejan caras cilíndricas coincidentes que el motor CSG no resuelve bien.
      ...[-1, 1].map(s => {
        const f = hole(`Ø14 tirante de tope, caja Ø25×9 para contratuerca (${s > 0 ? '+' : '−'}Y)`,
          [mX, s * L.topeY, cuerpoZ1], [0, 0, -1], 14);
        Object.assign(f.params, { seat: 'cbore', seatDia: 25, seatDepth: 9 });
        return f;
      }),
      // roscas M12 de fijación al canal
      ...[-1, 1].flatMap(sx => [-1, 1].map(sy =>
        hole(`M12 fijación (${sx > 0 ? '+' : '−'}X,${sy > 0 ? '+' : '−'}Y)`,
          [mX + sx * L.mesaPernoX, sy * L.mesaPernoY, webZ - 1], [0, 0, 1], L.mesaPernoDia, 35, false))),
      // puertos Rc 1/4 en la cara −X
      ...L.puertoZ.map((z, i) => hole(`Puerto Rc1/4 ${i ? 'B' : 'A'} (Z=${z})`,
        [mX0, L.puertoY[i], z], [1, 0, 0], 15.5, 14, false)),
    ],
    { componente: 'mesa_guia_MGF100_20', hardware: true, parte: '923.01022' });

  E.addPart(
    `MÓVIL · Mesa guía — placa móvil ${mw}×${md}×${L.mesaPlacaT} (carrera aplicada ${P.carrera})`,
    COL.neumatica, [mX, 0, placaZ0],
    [
      box(`Placa móvil ${mw}×${md}×${L.mesaPlacaT}`, [mX, 0, placaZ0], mw, md, L.mesaPlacaT),
      // roscas de los tirantes de tope y de los pernos del plato de empuje
      ...[-1, 1].map(s => hole(`M12 tirante de tope (${s > 0 ? '+' : '−'}Y)`, [mX, s * L.topeY, placaZ0 - 1], [0, 0, 1], L.topeDia, 26, false)),
      ...[-1, 1].flatMap(sx => [-1, 1].map(sy =>
        hole(`M10 plato de empuje (${sx > 0 ? '+' : '−'}X,${sy > 0 ? '+' : '−'}Y)`,
          [mX + sx * 60, sy * 60, placaZ0 - 1], [0, 0, 1], 10, L.mesaPlacaT + 2, false))),
    ],
    { componente: 'mesa_guia_MGF100_20' });

  // émbolo y columnas guía a la vista en los 10 mm de carrera
  E.addPart(`MÓVIL · Mesa guía — vástago Ø${L.mesaVastago} (émbolo Ø${P.mesaBore})`, COL.acero,
    [mX, 0, placaZ0], [cyl(`Vástago Ø${L.mesaVastago}×46`, [mX, 0, placaZ0], [0, 0, -1], L.mesaVastago, 46)],
    { componente: 'mesa_guia_MGF100_20' });
  for (const s of [-1, 1]) {
    const x = r2(mX + s * L.mesaColSep);
    E.addPart(`MÓVIL · Mesa guía — columna guía Ø${L.mesaColDia} × 75 (X=${x})`, COL.acero,
      [x, 0, placaZ0], [cyl(`Columna Ø${L.mesaColDia}×75`, [x, 0, placaZ0], [0, 0, -1], L.mesaColDia, 75)],
      { componente: 'mesa_guia_MGF100_20' });
  }

  // ---- 4 pernos M12 de fijación de la mesa al canal (entran por debajo) ----
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = r2(mX + sx * L.mesaPernoX), y = sy * L.mesaPernoY;
      const pos = `X=${x}, Y=${sy > 0 ? '+' : '−'}${L.mesaPernoY}`;
      golilla(E, { nombre: `M12 mesa (${pos})`, at: [x, y, canalZ0], dir: [0, 0, -1], dia: L.mesaPernoDia, ext: 20, esp: 2, capa: 'FIJO · ' });
      pernoHex(E, { nombre: `M12 × 45 fijación de la mesa (${pos})`, at: [x, y, r2(canalZ0 - 2)], dir: [0, 0, 1], dia: L.mesaPernoDia, largo: 45, af: 18, altoCab: 7.5, capa: 'FIJO · ' });
    }
  }

  // ---- 2 tirantes de TOPE REGULABLE de carrera: 20 mm → P.carrera ----------
  for (const sy of [-1, 1]) {
    const y = sy * L.topeY, pos = `Y=${sy > 0 ? '+' : '−'}${L.topeY}`;
    pernoHex(E, {
      nombre: `M12 × 115 tope regulable de carrera (${pos}, limita ${P.mesaCarrera}→${P.carrera} mm)`,
      at: [mX, y, webZ], dir: [0, 0, 1], dia: L.topeDia, largo: 115, af: 18, altoCab: 8, capa: 'MÓVIL · NEUMÁTICA · ',
    });
    tuercaHex(E, { nombre: `M12 contratuerca del tope de carrera (${pos})`, at: [mX, y, r2(placaZ0 - 6.5)], dir: [0, 0, 1], dia: L.topeDia, af: 18, alto: 6.5, capa: 'MÓVIL · NEUMÁTICA · ' });
  }

  // =========================================================================
  // 5. INTERFAZ CON EL MÓDULO MÓVIL
  //    Plato de empuje (la mesa empuja aquí el ROLLER FRAME WELDMENT) y
  //    4 pasadores guía en las colisas de las placas colgantes: el conjunto
  //    sube los 10 mm en paralelo y no bascula.
  // =========================================================================
  E.addPart(
    `MÓVIL · Plato de empuje ${mw}×${md}×${L.platoT} (cara superior Z=${platoZ1} = riel del bastidor móvil)`,
    COL.movil, [mX, 0, placaZ1],
    [
      box(`Plato ${mw}×${md}×${L.platoT}`, [mX, 0, placaZ1], mw, md, L.platoT),
      ...[-1, 1].flatMap(sx => [-1, 1].map(sy =>
        hole(`Ø10.5 perno M10 (${sx > 0 ? '+' : '−'}X,${sy > 0 ? '+' : '−'}Y)`,
          [mX + sx * 60, sy * 60, placaZ1 - 1], [0, 0, 1], 10.5, 6, false))),
    ], { plano: true });

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = r2(mX + sx * 60), y = sy * 60;
      pernoHex(E, {
        nombre: `M10 × 32 plato de empuje (X=${x}, Y=${sy > 0 ? '+' : '−'}60)`,
        at: [x, y, placaZ0], dir: [0, 0, 1], dia: 10, largo: 32, af: 16, altoCab: 6.5, capa: 'MÓVIL · ',
      });
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
  // 6. NEUMÁTICA: soporte, válvula, silenciadores, racores, unión y tubería
  // =========================================================================
  const vY0 = L.valvY[0], vY1 = L.valvY[1], vAlto = P.valvula[2];
  const brZ1 = r2(L.valvZ0 + vAlto + 10);                        // 110 — alto del soporte
  const brX1 = L.canalX0, brX0 = r2(brX1 - P.placaT);            // ala vertical del soporte
  const vX1 = brX0, vX0 = r2(vX1 - P.valvula[1]);                // cuerpo de la válvula (46 en X)
  const repisaZ1 = r2(L.valvZ0 + P.placaT);

  E.addPart(
    `FIJO · Soporte de válvula 3/16" ${r2(brX1 - vX0 + 3)}×${r2(vY1 - vY0)}×${r2(brZ1 - L.valvZ0)}`,
    COL.chapaOsc, [vX0, vY1, L.valvZ0],
    [sketchXZ('Escuadra de soporte', vY1, [
      [brX1, brZ1], [brX0, brZ1], [brX0, repisaZ1], [vX0 - 3, repisaZ1], [vX0 - 3, L.valvZ0], [brX1, L.valvZ0],
    ], r2(vY1 - vY0))], { plano: true });

  for (const y of [-219, -163]) {
    golilla(E, { nombre: `1/4" soporte de válvula (Y=${y})`, at: [r2(brX0 - 2), y, 100], dir: [1, 0, 0], dia: b14.d, ext: 16, esp: 2, capa: 'FIJO · ' });
    pernoHex(E, { nombre: `1/4-20 × 1" soporte de válvula (Y=${y})`, at: [r2(brX0 - 2), y, 100], dir: [1, 0, 0], dia: b14.d, largo: IN, af: b14.af, altoCab: b14.hh, capa: 'FIJO · ' });
    tuercaHex(E, { nombre: `1/4-20 soporte de válvula (Y=${y})`, at: [r2(L.canalX0 + t12), y, 100], dir: [1, 0, 0], dia: b14.d, af: b14.af, alto: b14.tuerca, capa: 'FIJO · ' });
  }

  const vZ0 = repisaZ1, vZ1 = r2(vZ0 + vAlto);
  E.addPart(
    `FIJO · NEUMÁTICA · Válvula 4 vías monosolenoide 24 VDC ${P.valvula.join('×')} (094.10795)`,
    COL.neumatica, [vX0, vY0, vZ0],
    [
      box(`Cuerpo ${P.valvula.join('×')}`, [r2((vX0 + vX1) / 2), r2((vY0 + vY1) / 2), vZ0], r2(vX1 - vX0), r2(vY1 - vY0), vAlto),
      cyl('Solenoide 24 VDC Ø30×42', [r2((vX0 + vX1) / 2), vY1, r2(vZ0 + vAlto * 0.55)], [0, 1, 0], 30, 42),
      cyl('Accionamiento manual Ø10', [r2((vX0 + vX1) / 2), vY0, r2(vZ0 + vAlto * 0.55)], [0, -1, 0], 10, 8),
      // puertos de escape (silenciadores) y de trabajo A/B
      ...[-213, -169].map(y => hole(`Escape 1/8 NPT (Y=${y})`, [vX0, y, 62], [1, 0, 0], 9.5, 10, false)),
      ...[-205, -177].map(y => hole(`Puerto de trabajo 1/4 (Y=${y})`, [85, y, vZ1], [0, 0, -1], 14, 12, false)),
    ], { hardware: true, componente: 'valvula_4v_24vdc', parte: '094.10795' });

  for (const y of [-213, -169]) {
    E.addPart(`FIJO · NEUMÁTICA · Silenciador 1/8" NPT Ø${L.silenDia} (Y=${y}) (923.0059)`, COL.inox,
      [vX0, y, 62], [
        cyl('Niple 1/8 NPT Ø9.5×7', [vX0, y, 62], [-1, 0, 0], 9.5, 7),
        cyl(`Cuerpo sinterizado Ø${L.silenDia}×20`, [r2(vX0 - 7), y, 62], [-1, 0, 0], L.silenDia, 20),
      ], { hardware: true, parte: '923.0059' });
  }

  // ---- racores codo giratorios 360° sobre la válvula ----------------------
  const codoZ = [125, 137];                          // altura del brazo de cada codo
  const codoXsal = 100;
  [-205, -177].forEach((y, i) => {
    E.addPart(`FIJO · NEUMÁTICA · Racor codo giratorio 360° 1/4" (válvula, Y=${y})`, COL.neumatica,
      [85, y, vZ1], [
        cyl('Cuerpo Ø16', [85, y, r2(vZ1 - 6)], [0, 0, 1], 16, r2(codoZ[i] - vZ1 + 12)),
        cyl('Salida giratoria Ø13', [85, y, codoZ[i]], [1, 0, 0], 13, r2(codoXsal - 85 + 2)),
        hole('Ø8.2 paso de tubo', [r2(codoXsal + 2), y, codoZ[i]], [-1, 0, 0], r2(P.tuboOD + 0.3), 22, false),
      ], { hardware: true, parte: '094.1406 (codo macho giratorio 360°)' });
  });

  // ---- racores codo giratorios 360° en los puertos de la mesa -------------
  const codoMesaX = [140.5, 139];
  L.puertoZ.forEach((z, i) => {
    const y = L.puertoY[i], x = codoMesaX[i];
    E.addPart(`FIJO · NEUMÁTICA · Racor codo giratorio 360° 1/4" (mesa, puerto ${i ? 'B' : 'A'}, Z=${z})`, COL.neumatica,
      [x, y, z], [
        cyl('Cuerpo Ø16', [x, y, r2(z + 13)], [0, 0, -1], 16, 20),
        cyl('Salida giratoria Ø15', [x, y, z], [1, 0, 0], 15, r2(mX0 - x + 6)),
        hole('Ø8.2 paso de tubo', [x, y, r2(z + 15)], [0, 0, -1], r2(P.tuboOD + 0.3), 16, false),
      ], { hardware: true, parte: '094.1406 (codo macho giratorio 360°)' });
  });

  // ---- unión Unifit de 1/4" en la línea A --------------------------------
  E.addPart(`FIJO · NEUMÁTICA · Unión Unifit 1/4" Ø15 × 26 (X=130, Y=−140)`, COL.neumatica,
    [130, -140, codoZ[0]], [
      cyl('Cuerpo de unión Ø15×26', [130, -127, codoZ[0]], [0, -1, 0], 15, 26),
      hole('Ø8.2 paso de tubo', [130, -125, codoZ[0]], [0, -1, 0], r2(P.tuboOD + 0.3), 30, false),
    ], { hardware: true, parte: '094.1465 (unión Unifit 1/4 in.)' });

  // ---- tubería de 1/4" (P.tuboOD): vertical + codo + horizontal ----------
  const rutaA = [
    [codoXsal, -205, codoZ[0]], [130, -205, codoZ[0]], [130, L.puertoY[0], codoZ[0]],
    [codoMesaX[0], L.puertoY[0], codoZ[0]], [codoMesaX[0], L.puertoY[0], r2(L.puertoZ[0] + 9)],
  ];
  const rutaB = [
    [codoXsal, -177, codoZ[1]], [139, -177, codoZ[1]], [139, L.puertoY[1], codoZ[1]],
    [139, L.puertoY[1], r2(L.puertoZ[1] + 9)],
  ];
  const tA = tubo(rutaA, P.tuboOD), tB = tubo(rutaB, P.tuboOD);
  E.addPart(`FIJO · NEUMÁTICA · Tubería 1/4" OD Ø${r2(P.tuboOD)} — línea A (válvula → mesa, ${tA.largo} mm)`,
    COL.neumatica, rutaA[0], tA.features, { hardware: true, parte: '094.1148 (tubo PU 1/4 in. OD)' });
  E.addPart(`FIJO · NEUMÁTICA · Tubería 1/4" OD Ø${r2(P.tuboOD)} — línea B (válvula → mesa, ${tB.largo} mm)`,
    COL.neumatica, rutaB[0], tB.features, { hardware: true, parte: '094.1148 (tubo PU 1/4 in. OD)' });

  // =========================================================================
  // 7. DIMENSIONADO — empuje disponible vs. masa que sube
  // =========================================================================
  const area = Math.PI * P.mesaBore * P.mesaBore / 4;            // 7853.98 mm²
  const empuje = area * L.presionBar / 10;                        // N a 6 bar
  const empuje60 = area * L.presionTrabajoBar / 10;               // N a 60 psi (dato del fabricante)
  const carga = (L.masaMovilKg + P.cargaMaxKg) * 9.80665;         // N
  const util = empuje * L.rendimiento, util60 = empuje60 * L.rendimiento;

  return {
    carrera: P.carrera,
    carreraActuador: P.mesaCarrera,
    topeCarrera: `2 tirantes M12 roscados a la placa móvil; su cabeza topa bajo el cuerpo y limita ${P.mesaCarrera}→${P.carrera} mm`,
    ajusteAltura: `4 jack bolts 3/8-16 (2 tuercas c/u) + 4 tornillos 3/8-16 en colisas ${L.colisaAncho}×${L.colisaLargo} (recorrido ${r2(L.colisaLargo - L.colisaAncho)} mm)`,
    areaEmboloMm2: r2(area),
    empujeN: r2(empuje),                    // Ø100 a 6 bar
    empujeUtilN: r2(util),                  // con rendimiento 0.85
    empujeN60psi: r2(empuje60),             // a la presión de trabajo del manual
    cargaN: r2(carga),
    masaElevadaKg: L.masaMovilKg + P.cargaMaxKg,
    factorSeguridad: r2(util / carga),
    factorSeguridad60psi: r2(util60 / carga),
    zPlatoEmpuje: platoZ1,
    // AVISO DE INTEGRACIÓN: la altura de la mesa no es negociable — P.mesaAlto
    // (106, catálogo) + P.carrera (10) + el alma del canal obligan a que la cara
    // de empuje quede en Z=143.5 (= P.rielInfZ) con el canal en su Z medido.
    // bastidor.mjs exporta `padMovilZ = 100`: ese valor NO cabe (haría arrancar
    // la mesa en Z = −16). Hay que subir el apoyo del bastidor móvil a 143.5.
    avisoIntegracion: `cara de empuje en Z=${platoZ1} (bastidor.mjs supone 100: incompatible con P.mesaAlto=${P.mesaAlto})`,
    canalZ: [canalZ0, canalZ1],
    desarrolloCanalMm: desa.largo,
    plegadosCanal: desa.plegados.length,
    tuberiaMm: r2(tA.largo + tB.largo),
    piezas: E.parts.length,
  };
}

export default elevacion;
