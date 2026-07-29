// plano.mjs — RODILLO PLANO (cilíndrico) sobre cañería SCH 40 NPS 1-1/2".
//
// Es el rodillo base: el cónico (conico.mjs) es EXACTAMENTE este conjunto más
// las camisas plásticas encajadas sobre el tubo. El núcleo se construye aquí,
// en `nucleo()`, y conico.mjs lo reutiliza sin duplicar una sola cota.
//
// MECANISMO DE RESORTE — eje PASANTE, no muñones.
// Fuente: US8439573B2, "A compression spring is captured on either or both ends
// of the axle between a swage or other stop and the bushing… The spring urges
// the axle toward its opposite end. Two such springs in each end of the roller
// balance one another and permit the axle to be retracted momentarily from
// either end". Es decir: cada resorte va POR DENTRO de su rodamiento, apoyado
// en la cara interior del aro interior y contra un anillo DIN 471 del eje, y
// empuja el eje HACIA EL OTRO EXTREMO. Los dos se equilibran y el eje queda
// centrado con las dos puntas afuera; al empujar una punta hacia adentro se
// comprime el resorte del extremo contrario.
//
// Esto es lo que permite usar la TAPA DE CATÁLOGO tal cual (saliente 4.5) y
// conservar el tubo de 522: no hace falta cavidad para el resorte en la tapa.
//
// Anatomía por rodillo — 9 piezas:
//   1 tubo · 2 tapas · 2 rodamientos 6201-2Z · 1 eje pasante · 2 anillos · 2 resortes
import { revolve, cyl, box, rodamiento, anilloRet, COL, r2 } from './lib.mjs';
import { P, X } from './params.mjs';

const L = {
  chaflanTubo: 0.5,            // dis: entrada del contrataladro
  ranuraD: P.anillo.ranuraD,   // nor: DIN 471 Ø12 → fondo Ø11.5
  ranuraW: P.anillo.ranuraW,   // nor: 1.1
};

const RO = P.tubo.od / 2;      // 24.13
const RI = P.tubo.id / 2;      // 20.47
const RC = P.contra.d / 2;     // 22.50
const RE = P.eje.d / 2;        //  6.00
const DIR = [1, 0, 0];

/** Perfil del TUBO: cañería con contrataladro Ø45 en las dos testas. */
const perfilTubo = (len) => {
  const c = L.chaflanTubo, pr = P.contra.prof;
  return [
    [0, RC + c], [c, RC],
    [pr, RC], [pr, RI],
    [len - pr, RI], [len - pr, RC],
    [len - c, RC], [len, RC + c],
    [len, RO], [0, RO],
  ];
};

/** Perfil de la TAPA portarodamiento (h desde la cara exterior hacia adentro). */
const perfilTapa = () => {
  const T = P.tapa;
  return [
    ...T.domo,                       // morro embutido, íntegro FUERA del tubo (h 0…4.5)
    [T.saliente, T.prensaD / 2],     // (4.5, 22.5) testa del tubo: arranca el cuerpo de prensa
    [T.largo, T.prensaD / 2],        // (24.5, 22.5)
    [T.largo, T.faldonD / 2],        // (24.5, 19.5) testa interior
    [T.asientoH1, T.faldonD / 2],    // (16, 19.5)   alivio del faldón
    [T.asientoH1, T.asientoD / 2],   // (16, 16)     entrada del alojamiento
    [T.asientoH0, T.asientoD / 2],   // (6, 16)      asiento Ø32 del rodamiento
    [T.asientoH0, T.hombroD / 2],    // (6, 14)      HOMBRO: tope axial del aro exterior
    [T.frenteH, T.hombroD / 2],      // (2, 14)
    [T.frenteH, T.boreFrontal / 2],  // (2, 7)
  ];
};

const perfilRanura = () => [
  [0, L.ranuraD / 2], [0, RE + 1.0], [L.ranuraW, RE + 1.0], [L.ranuraW, L.ranuraD / 2],
];

/** Sección del alambre de UNA espira (cuadrada equivalente al Ø del alambre).
 *  El resorte se modela espira por espira y no como manguito: así la vista de
 *  corte muestra lo que realmente hay adentro. */
const perfilEspira = () => {
  const a = P.resorte.alambre, rm = (P.resorte.de - a) / 2;   // radio medio del resorte
  return [[0, rm - a / 2], [0, rm + a / 2], [a, rm + a / 2], [a, rm - a / 2]];
};

const espejo = (perfil, len) => perfil.map(([h, r]) => [r2(len - h), r]);

/** Posición de la garganta del anillo de cada extremo (asiento del resorte). */
export const ranuraX = (s) => (s === 0
  ? r2(X.rodamIzqX1 + P.resorte.montado)                       // izq: 16.5 + 26 = 42.5
  : r2(X.rodamDerX0 - P.resorte.montado - L.ranuraW));         // der: 515.5 − 26 − 1.1 = 488.4

/**
 * Construye UN rodillo completo (sin camisas).
 * @param {Ensamble} E
 */
export function nucleo(E, { y = 0, z = 0, capa = '', suf = '' } = {}) {
  const n = { tubos: 0, tapas: 0, rodamientos: 0, ejes: 0, anillos: 0, resortes: 0 };
  const T = P.tapa;
  const marca = suf ? `${suf}, ` : '';

  // ── 1. TUBO ───────────────────────────────────────────────────────────────
  E.addPart(
    `${capa}Tubo SCH40 NPS 1-1/2 pulg Ø${P.tubo.od}×${P.tubo.pared} × ${P.tuboLargo}${suf ? ` (${suf})` : ''}`,
    COL.rodillo, [X.tuboX0, y, z],
    [revolve(`Cañería Ø${P.tubo.od} pared ${P.tubo.pared}; contrataladro Ø${P.contra.d} ${P.contra.tol} × ${P.contra.prof} en ambas testas`,
      [X.tuboX0, y, z], 'x', perfilTubo(P.tuboLargo))],
    {
      material: `cañería ${P.tubo.norma}`,
      mecanizado: `refrentar a ${P.tuboLargo} ±0.2 (escuadra 0.1) y contrataladrar Ø${P.contra.d} ${P.contra.tol} × ${P.contra.prof} en ambos extremos, Ra ≤ ${P.contra.Ra}; eliminar el cordón interior de la costura en esa zona`,
      ajuste: `H8/u7 con el cuerpo de prensa de la tapa`,
      capaDato: 'dis',
    });
  n.tubos++;

  // ── 2. EJE PASANTE ────────────────────────────────────────────────────────
  const rIzq = ranuraX(0), rDer = ranuraX(1);
  E.addPart(
    `${capa}Eje pasante Ø${P.eje.d} ${P.eje.tol} × ${X.ejeLargo} con 2 caras planas e/c ${P.eje.entrecaras}${suf ? ` (${suf})` : ''}`,
    COL.acero, [X.ejeX0, y, z],
    [
      cyl(`Barra Ø${P.eje.d} ${P.eje.tol} × ${X.ejeLargo}`, [X.ejeX0, y, z], DIR, P.eje.d, X.ejeLargo),
      ...[0, 1].flatMap((s) => {
        const x0 = s === 0 ? X.ejeX0 : r2(X.ejeX0 + X.ejeLargo - P.eje.largoPlano);
        const lado = s === 0 ? 'izq' : 'der';
        return [
          box(`Cara plana superior e/c ${P.eje.entrecaras} × ${P.eje.largoPlano} (${lado})`,
            [r2(x0 + P.eje.largoPlano / 2), y, r2(z + P.eje.entrecaras / 2)],
            P.eje.largoPlano, P.eje.d + 4, 6, 'cut'),
          box(`Cara plana inferior e/c ${P.eje.entrecaras} × ${P.eje.largoPlano} (${lado})`,
            [r2(x0 + P.eje.largoPlano / 2), y, r2(z - P.eje.entrecaras / 2 - 6)],
            P.eje.largoPlano, P.eje.d + 4, 6, 'cut'),
        ];
      }),
      revolve(`Garganta anillo Ø${L.ranuraD} × ${L.ranuraW} (izq)`, [rIzq, y, z], 'x', perfilRanura(), 'cut'),
      revolve(`Garganta anillo Ø${L.ranuraD} × ${L.ranuraW} (der)`, [rDer, y, z], 'x', perfilRanura(), 'cut'),
    ],
    {
      material: P.eje.material,
      gira: false,
      nota: 'las caras planas son el seguro antigiro en la ranura del larguero; el aro interior va con ajuste g6 porque debe DESLIZAR (carga estacionaria sobre el aro interior, NTN tabla 7.2(1))',
      capaDato: 'req',
    });
  n.ejes++;

  // ── 3. TAPAS · 4. RODAMIENTOS · 5. ANILLOS · 6. RESORTES ──────────────────
  for (const s of [0, 1]) {
    const lado = s === 0 ? 'izq' : 'der';
    const xTapa = s === 0 ? P.holguraTapa : X.tapaDerX0;

    E.addPart(
      `${capa}Tapa portarodamiento Ø${P.contra.d}/Ø${T.asientoD} × ${T.largo} (${marca}${lado})`,
      COL.chapaOsc, [xTapa, y, z],
      [revolve(`Brida Ø${T.bridaD}, cuerpo de prensa Ø${P.contra.d}, alojamiento Ø${T.asientoD} con hombro Ø${T.hombroD}`,
        [xTapa, y, z], 'x', s === 0 ? perfilTapa() : espejo(perfilTapa(), T.largo))],
      {
        componente: 'SKPB4812-2.0',
        material: T.material,
        ajuste: `prensado Ø${P.contra.d} u7 en el contrataladro H8 del tubo; alojamiento Ø${T.asientoD} M7/N7 para el aro exterior (carga rotatoria sobre el aro exterior)`,
        nota: 'portarodamiento de catálogo SKPB4812-2.0 (brida F=48, prensa D=44, alojamiento D2=32). El largo 14.5 sale de medir en píxeles el croquis Type 1 de la lámina (ver ESCALA.md); verificar contra la pieza comprada.',
        capaDato: 'cat',
      });
    n.tapas++;

    rodamiento(E, {
      nombre: P.rodam.desig,
      at: [s === 0 ? X.rodamIzqX0 : X.rodamDerX0, y, z], dir: DIR,
      bore: P.rodam.bore, od: P.rodam.D, w: P.rodam.w, capa,
    });
    n.rodamientos++;

    const xr = ranuraX(s);
    anilloRet(E, {
      nombre: 'asiento de resorte',
      at: [r2(xr + (L.ranuraW - P.anillo.esp) / 2), y, z], dir: DIR, eje: P.eje.d, capa,
      color: COL.neumatica,   // color propio para que se distinga en la vista de corte
    });
    n.anillos++;

    // resorte: entre la cara INTERIOR del aro interior y el anillo; empuja el
    // eje hacia el extremo CONTRARIO (US8439573B2)
    const x0 = s === 0 ? X.rodamIzqX1 : r2(xr + L.ranuraW);
    E.addPart(
      `${capa}Resorte de compresión Ø${P.resorte.de}×${P.resorte.alambre} L0=${P.resorte.libre} (${marca}${lado})`,
      COL.tornillo, [x0, y, z],
      Array.from({ length: Math.round(P.resorte.nTotal) }, (_, i) => {
        const paso = P.resorte.montado / P.resorte.nTotal;
        return revolve(`Espira ${i + 1}/${Math.round(P.resorte.nTotal)} Ø${P.resorte.alambre}`,
          [r2(x0 + i * paso), y, z], 'x', perfilEspira());
      }),
      {
        hardware: true,
        norma: 'alambre de acero para resortes ASTM A228',
        nota: `L0=${P.resorte.libre}, montado ${P.resorte.montado}, bloque ${P.resorte.solido}; empuja el eje hacia el extremo ${s === 0 ? 'derecho' : 'izquierdo'}`,
        capaDato: 'dis',
      });
    n.resortes++;
  }

  return n;
}

export function plano(E) {
  const n = nucleo(E, { y: P.yPlano, z: P.zEje, capa: 'PLANO · ', suf: '' });
  return {
    piezas: n.tubos + n.tapas + n.rodamientos + n.ejes + n.anillos + n.resortes,
    ...n,
    EL: P.EL, tubo: P.tuboLargo, sobreTapas: P.sobreTapas, sobreEjes: P.sobreEjes,
    caraUtil: P.tuboLargo, odRodillo: P.tubo.od,
    contrataladro: `Ø${P.contra.d} ${P.contra.tol} × ${P.contra.prof}`,
    paredRestante: r2((P.tubo.od - P.contra.d) / 2),
  };
}

export default plano;
