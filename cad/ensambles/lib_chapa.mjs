// lib_chapa.mjs — DESARROLLOS DE CHAPA REUTILIZABLES de la Célula de Diseño
//
// Nacen en el CV-LBP (Rev.C→F) y desde 17-08 viven aquí para que banda plana,
// 24V y cualquier equipo nuevo los HEREDE en vez de copiarlos. Convenciones
// (docs/sr/REPRESENTACION.md §3): cotas EXTERIORES; franja plana = exterior −
// (R+t) por esquina; BA = θ·(R+K·t) con K=0,44 acero; pliegues dibujados
// TANGENTE·EJE·TANGENTE; los agujeros del alma entran en coordenadas del
// EQUIPO y la conversión a desarrollo vive en el builder — 3D y láser no
// pueden divergir porque nacen de la misma lista.
//
// Contrato de salida (lo consumen dxf_flat, planos_fab, bom, compuertas):
//   { contorno, cortes:{circles[{c,r,rosca?}],polys}, pliegues, etiquetas,
//     pliegueInfo, t, k, radio, material, avisos }
import { bendAllowance } from '../js/sheetmetal.js';

const r2 = (v) => Math.round(v * 100) / 100;

// ── ESQUINAS SUAVES (Sergio 18-08: «each part need to be with soft corners»)
// Todo vértice CONVEXO del contorno se redondea: sin puntas vivas que corten
// al que manipula, sin esquinas que concentren tensión ni descascaren pintura.
// r por espesor: t≤2 → R4 · t>2 → R6. Las copias MEASURED del sistema 24V
// (bracket, tira, pata) NO se tocan: son el original del fabricante.
export const rEsquina = (t) => (t <= 2 ? 4 : 6);
export function redondear(contorno, r) {
  if (!r || contorno.length < 3) return contorno;
  const pts = contorno[0][0] === contorno[contorno.length - 1][0]
    && contorno[0][1] === contorno[contorno.length - 1][1]
    ? contorno.slice(0, -1) : contorno.slice();
  // orientación (área con signo) para distinguir convexo de cóncavo
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  const ccw = area > 0;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length];
    const v1 = [p1[0] - p0[0], p1[1] - p0[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const cruz = v1[0] * v2[1] - v1[1] * v2[0];
    const ang = Math.atan2(Math.abs(cruz), v1[0] * v2[0] + v1[1] * v2[1]);
    const convexo = ccw ? cruz > 0 : cruz < 0;
    const d = Math.abs(Math.tan(ang / 2)) > 1e-6 ? r / Math.tan((Math.PI - ang) / 2) : 0;
    // sólo esquinas francas (>25°) con lados que aguanten el recorte
    if (!convexo || ang < 0.44 || d > l1 / 2 - 0.5 || d > l2 / 2 - 0.5) { out.push(p1); continue; }
    const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2];
    const a1 = [p1[0] - u1[0] * d, p1[1] - u1[1] * d];
    const b1 = [p1[0] + u2[0] * d, p1[1] + u2[1] * d];
    // arco por Bézier discreta entre tangentes (5 tramos): suficiente al láser
    for (let k = 0; k <= 5; k++) {
      const t = k / 5, mt = 1 - t;
      out.push([
        mt * mt * a1[0] + 2 * mt * t * p1[0] + t * t * b1[0],
        mt * mt * a1[1] + 2 * mt * t * p1[1] + t * t * b1[1],
      ]);
    }
  }
  out.push(out[0]);
  return out.map(q => [r2(q[0]), r2(q[1])]);
}

export const KCH = 0.44;
export const rect = (w, h, x0 = 0, y0 = 0) =>
  [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]];

// Desarrollo de placa con UNA pestaña inferior a 90° (alma + ala):
// dev = alaFlat | BA | almaFlat, con el eje de plegado marcado.
export function flatPlacaConAla(L, almaAlto, alaAncho, t, holesAlma, material, aviso, holesAla = [], muescasAla = []) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const alaFlat = alaAncho - (r + t);
  const almaFlat = almaAlto - (r + t);
  const H = alaFlat + BA + almaFlat;
  // hole dz = distancia desde el BORDE SUPERIOR del alma (3D: plTop − z)
  const circles = holesAlma
    .filter(h => h.dz <= almaFlat)          // nunca en la zona de plegado
    .map(h => ({ c: [h.x, r2(H - h.dz)], r: h.dia / 2 }));
  // agujeros del ALA: yDev medido desde el BORDE LIBRE del ala (0..alaFlat)
  for (const h of holesAla) {
    if (h.yDev <= alaFlat) circles.push({ c: [h.x, r2(h.yDev)], r: h.dia / 2 });
  }
  const yEje = alaFlat + BA / 2;
  // MUESCAS DEL ALA: la banda (±228,6) solapa 17,6 mm con el ala (borde
  // interior 211) — donde el lazo cruza el plano del ala, el ala NO puede
  // existir (interferencia detectada por Sergio 12-08). La muesca corta ala
  // completa + zona de plegado (hasta la tangente del alma): contorno inferior
  // con escotaduras rectangulares.
  const dM = r2(alaFlat + BA);
  const mk = (muescasAla || []).map(m => [Math.max(0, r2(m[0])), Math.min(L, r2(m[1]))])
    .filter(([a, b]) => b > a).sort((u, v) => u[0] - v[0]);
  let contorno;
  if (mk.length) {
    const pts = [[0, 0]];
    for (const [a, b] of mk) pts.push([a, 0], [a, dM], [b, dM], [b, 0]);
    pts.push([L, 0], [L, r2(H)], [0, r2(H)], [0, 0]);
    contorno = pts;
  } else contorno = rect(L, r2(H));
  // pliegues sólo en los TRAMOS con ala
  const tramosAla = [];
  {
    let x0 = 0;
    for (const [a, b] of mk) { if (a > x0) tramosAla.push([x0, a]); x0 = b; }
    if (x0 < L) tramosAla.push([x0, L]);
  }
  const pl = [];
  for (const [a, b] of (mk.length ? tramosAla : [[0, L]])) {
    pl.push({ a: [a, r2(alaFlat)], b: [b, r2(alaFlat)], tipo: 'tangente' });
    pl.push({ a: [a, r2(yEje)], b: [b, r2(yEje)], tipo: 'eje' });
    pl.push({ a: [a, r2(alaFlat + BA)], b: [b, r2(alaFlat + BA)], tipo: 'tangente' });
  }
  return {
    contorno: redondear(contorno, rEsquina(t)),
    cortes: { circles, polys: [] },
    pliegues: pl,
    etiquetas: [{ x: L / 2, y: r2(yEje) + 4, s: `PLEGAR ARRIBA 90° R${r}${mk.length ? ' — ala SEGMENTADA (muescas = paso del lazo de banda)' : ''}` }],
    pliegueInfo: [{ ang: 90, r, ba: r2(BA) }],
    t, k: KCH, radio: r, material,
    avisos: aviso ? [aviso] : [],
  };
}

// Desarrollo de perfil C (dos pestañas a 90°): ala | BA | web | BA | ala.
export function flatPerfilC(largo, webAncho, alaAlto, t, material, holes = []) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const ala = alaAlto - (r + t);
  const web = webAncho - 2 * (r + t);
  const H = 2 * ala + 2 * BA + web;
  const y1 = ala, y2 = ala + BA, y3 = ala + BA + web, y4 = ala + BA + web + BA;
  const pl = [];
  for (const [ya, yb] of [[y1, y2], [y3, y4]]) {
    pl.push({ a: [0, r2(ya)], b: [largo, r2(ya)], tipo: 'tangente' });
    pl.push({ a: [0, r2((ya + yb) / 2)], b: [largo, r2((ya + yb) / 2)], tipo: 'eje' });
    pl.push({ a: [0, r2(yb)], b: [largo, r2(yb)], tipo: 'tangente' });
  }
  return {
    contorno: redondear(rect(largo, r2(H)), rEsquina(t)),
    cortes: { circles: holes.map(h => ({ c: [h.x, h.y], r: h.dia / 2 })), polys: [] },
    pliegues: pl,
    etiquetas: [{ x: largo / 2, y: r2((y1 + y2) / 2) + 4, s: `PLEGAR ARRIBA 90° R${r} (×2)` }],
    pliegueInfo: [{ ang: 90, r, ba: r2(BA) }, { ang: 90, r, ba: r2(BA) }],
    t, k: KCH, radio: r, material,
    avisos: [],
  };
}

// Desarrollo del COSTADO de caja de accionamiento (perfil en C con pestaña):
// dev Y de abajo hacia arriba: pestaña | BA | alma | BA | tira superior.
// Cotas EXTERIORES. Agujeros del alma en coordenadas del EQUIPO (x absoluta,
// z absoluta): la conversión a desarrollo vive AQUÍ, una sola vez — el 3D y
// el láser no pueden divergir porque nacen de la misma lista.
export function flatCostadoCaja(Lg, altura, alaW, pestW, t, x0, zTop, holesAlma, holesPestX, material, avisos) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const pest = pestW - (r + t), alma = altura - 2 * (r + t), ala = alaW - (r + t);
  const H = pest + BA + alma + BA + ala;
  const yl = [0, pest, pest + BA, pest + BA + alma, pest + BA + alma + BA, H];
  const pl = [];
  for (const i of [1, 3]) {
    pl.push({ a: [0, r2(yl[i])], b: [Lg, r2(yl[i])], tipo: 'tangente' });
    pl.push({ a: [0, r2((yl[i] + yl[i + 1]) / 2)], b: [Lg, r2((yl[i] + yl[i + 1]) / 2)], tipo: 'eje' });
    pl.push({ a: [0, r2(yl[i + 1])], b: [Lg, r2(yl[i + 1])], tipo: 'tangente' });
  }
  const zBot = zTop - altura;
  const devY = (z) => r2(pest + BA + (z - (zBot + r + t)));
  // Sergio 18-08: en piezas NUEVAS los pasos son SOLO barrenos redondos (la
  // holgura de ajuste se da con diámetro, no con ranura) — las ranuras
  // rectangulares quedan reservadas a la copia fiel del sistema 24V.
  const circles = [], polys = [];
  for (const h of holesAlma) circles.push({ c: [r2(h.x - x0), devY(h.z)], r: h.dia / 2 });
  for (const x of holesPestX) circles.push({ c: [r2(x - x0), 12.5], r: 3.5 });
  return {
    contorno: redondear(rect(Lg, r2(H)), rEsquina(t)),
    cortes: { circles, polys },
    pliegues: pl,
    // la etiqueta va a 3/4 del alma, no al centro: el paso del cubo suele ir
    // centrado y la cruz de centro atravesaba el texto (Sergio 18-08, lámina)
    etiquetas: [{ x: Lg / 2, y: r2(yl[2] + alma * 0.78), s: `2 PLIEGUES 90° R${r} — COSTADO EN C (pestaña ${pestW} · alma ${altura} · tira ${alaW})` }],
    pliegueInfo: [1, 2].map(() => ({ ang: 90, r, ba: r2(BA) })),
    t, k: KCH, radio: r, material,
    avisos,
  };
}

// Desarrollo del FONDO con tapa de extremo (1 pliegue): dev X = fondo | BA |
// tapa. Para tapa al INICIO el dev se refleja (xDev = xb − x) para que la
// tapa quede siempre al extremo alto del desarrollo.
export function flatFondoTapa(Lf, W, t, tapaAlt, xa, xb, yF0, holes, tapaEn, material, avisos) {
  const r = t;
  const BA = bendAllowance(90, r, t, KCH);
  const fondo = Lf - (r + t), tapa = tapaAlt - (r + t);
  const Ldev = fondo + BA + tapa;
  const xl = [fondo, fondo + BA];
  const pl = [
    { a: [r2(xl[0]), 0], b: [r2(xl[0]), W], tipo: 'tangente' },
    { a: [r2((xl[0] + xl[1]) / 2), 0], b: [r2((xl[0] + xl[1]) / 2), W], tipo: 'eje' },
    { a: [r2(xl[1]), 0], b: [r2(xl[1]), W], tipo: 'tangente' },
  ];
  const xDev = (x) => r2(tapaEn === 'fin' ? x - xa : xb - x);
  const circles = holes.map(h => ({ c: [xDev(h.x), r2(h.y - yF0)], r: h.dia / 2 }));
  return {
    contorno: redondear(rect(r2(Ldev), W), rEsquina(t)),
    cortes: { circles, polys: [] },
    pliegues: pl,
    etiquetas: [{ x: fondo / 2, y: W / 2, s: `1 PLIEGUE 90° R${r} — TAPA DE EXTREMO ${tapaAlt} ARRIBA` }],
    pliegueInfo: [{ ang: 90, r, ba: r2(BA) }],
    t, k: KCH, radio: r, material,
    avisos,
  };
}

// Placa plana sin pliegues (mechas, placas de piso, guardas planas).
export function flatPlaca(w, h, t, holes, material, aviso) {
  return {
    contorno: redondear(rect(w, h), rEsquina(t)),
    // rosca: se propaga al DXF/_agujeros — un Ø5 sin llamado de rosca llega
    // al taller como agujero liso (hallazgo del panel: los M6 de la mecha)
    cortes: { circles: holes.map(q => ({ c: [q.x, q.y], r: q.dia / 2, ...(q.rosca ? { rosca: q.rosca } : {}) })), polys: [] },
    pliegues: [], etiquetas: [], pliegueInfo: [],
    t, k: KCH, radio: t, material,
    avisos: aviso ? [aviso] : [],
  };
}

