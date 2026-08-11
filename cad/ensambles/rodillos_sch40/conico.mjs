// conico.mjs — RODILLO CÓNICO para transportador en curva.
//
// Es EXACTAMENTE el rodillo plano (plano.mjs → nucleo()) más un juego de
// camisas cónicas encajadas sobre la misma cañería. No se redefine ni una cota
// del núcleo: si cambia el rodillo plano, el cónico cambia con él.
//
// Geometría del cono — hallazgo del análisis del catálogo 2.640.SHJ.AFA:
// las 18 filas de la tabla WT/D1/D2 son UN SOLO CONO. (D2−D1)/WT = 0.06289
// constante (σ = 0.00008). Verificado además por medición en píxeles sobre el
// plano rasterizado: k medido = 0.0645 (2.6 % del valor de tabla). Ver ESCALA.md.
//
// Cada camisa es una CÁSCARA cónica de pared constante con un cubo en cada
// extremo (barreno Ø48.5 deslizante sobre la cañería). No es un cono macizo:
// en el extremo mayor la pared maciza llegaría a ~19 mm, inaceptable en peso
// y en tiempo de impresión.
import { revolve, COL, r2 } from './lib.mjs';
import { P, X, diaCono } from './params.mjs';
import { nucleo } from './plano.mjs';

const L = {
  pared: P.camisa.pared,   // dis: pared de la cáscara cónica
  cubo: P.camisa.cubo,     // dis: largo axial del cubo en cada testa de la camisa
  juegoEntreCamisas: 0.2,  // dis: para que apoyen sin forzar
};

const RB = P.camisa.idAjuste / 2;      // 24.25 — radio del barreno de los cubos

/** Perfil de UNA camisa cónica: cáscara de pared constante + cubo en cada testa. */
function perfilCamisa(largo, d1) {
  const rOut = (h) => r2(d1 / 2 + (P.camisa.k / 2) * h);
  const rIn = (h) => r2(Math.max(rOut(h) - L.pared, RB));
  const c = L.cubo;
  const pts = [
    [0, RB],                 // testa menor, borde del barreno
    [0, rOut(0)],            // testa menor, borde exterior
    [largo, rOut(largo)],    // superficie cónica exterior
    [largo, RB],             // testa mayor hasta el barreno
    [largo - c, RB],         // barreno del cubo mayor
    [largo - c, rIn(largo - c)],
  ];
  // superficie cónica interior, de vuelta hacia la testa menor
  const n = 6;
  for (let i = n - 1; i >= 0; i--) {
    const h = r2(c + ((largo - c) - c) * (i / n));
    pts.push([h, rIn(h)]);
  }
  pts.push([c, RB]);         // cara interior del cubo menor
  return pts;
}

export function conico(E) {
  const y = P.yConico, z = P.zEje, capa = 'CÓNICO · ';
  const n = nucleo(E, { y, z, capa, suf: 'cónico' });

  // ── camisas ───────────────────────────────────────────────────────────────
  const s0 = r2(X.tuboX0 + P.camisa.inicioDesdeTestaTubo);   // 20.0
  const s1 = X.tuboX1;                                       // 527.0
  const WT = r2(s1 - s0);                                    // 507
  const nSeg = P.camisa.segmentos;
  const Lseg = r2(WT / nSeg);

  let camisas = 0;
  for (let i = 0; i < nSeg; i++) {
    const sIni = r2(i * Lseg);                    // distancia desde la testa menor del CONO
    const d1 = diaCono(sIni);
    const d2 = diaCono(r2(sIni + Lseg));
    const x0 = r2(s0 + sIni);
    E.addPart(
      `CÓNICO · Camisa cónica ${i + 1}/${nSeg} Ø${d1}→Ø${d2} × ${Lseg} (pared ${L.pared}, barreno Ø${P.camisa.idAjuste})`,
      COL.uretano, [x0, y, z],
      [revolve(`Cáscara cónica Ø${d1}→Ø${d2}, cubos Ø${P.camisa.idAjuste} × ${L.cubo}`,
        [x0, y, z], 'x', perfilCamisa(r2(Lseg - L.juegoEntreCamisas), d1))],
      {
        material: P.camisa.material,
        ajuste: `barreno Ø${P.camisa.idAjuste} deslizante sobre la cañería Ø${P.tubo.od}; se fija con adhesivo anaeróbico de retención y 2 prisioneros M5 en la camisa mayor`,
        nota: `cono único k=${P.camisa.k} (Ø crece ${r2(P.camisa.k * 1000)} µm por mm); la pila queda atrapada axialmente entre las bridas de las dos tapas`,
        capaDato: 'cat',
      });
    camisas++;
  }

  const D2fin = diaCono(WT);
  return {
    piezas: n.tubos + n.tapas + n.rodamientos + n.ejes + n.anillos + n.resortes + camisas,
    ...n, camisas,
    WT, segmentos: nSeg, largoSegmento: Lseg,
    D1: P.camisa.D1, D2: D2fin,
    k: P.camisa.k,
    semianguloDeg: r2(Math.atan(P.camisa.k / 2) * 180 / Math.PI),
    radioInteriorCurva: r2(P.camisa.D1 / P.camisa.k),
    radioExteriorCurva: r2(P.camisa.D1 / P.camisa.k + WT),
  };
}

export default conico;
