// lib_compuertas.mjs — COMPUERTAS UNIVERSALES de la Célula de Diseño
//
// Por qué existe: hasta 2026-08-13 cada compuerta vivía DENTRO del generador
// del equipo (`gen_lbp530.mjs verify()`). Un equipo nuevo no heredaba ninguna:
// había que reescribirlas a mano — y lo que se reescribe a mano se olvida.
// Aquí viven las que NO dependen del equipo, con su ORIGEN registrado (quién
// pagó el error que las hizo nacer). Todo generador nuevo debe llamar
// `compuertasUniversales()`; declarar una exención es legítimo, olvidarla no.
//
// Contrato mínimo que consume: un ensamble `{ parts: [...] }` donde cada pieza
// de chapa trae `flat = { contorno:[[u,v]…], cortes:{circles:[{c,r,rosca?}],
// polys:[{pts}]}, pliegues:[{p0,p1}|[[u,v],[u,v]]], t, material }`.
//
// Uso típico al final de un generador:
//   import { compuertasUniversales, masaFlat, zonasParaMirar } from './lib_compuertas.mjs';
//   const errs = compuertasUniversales(equipos, { exentosMargen: [/Cabezal/] });
//   if (errs.length) { errs.forEach(e => console.error('  - ' + e)); process.exit(1); }

const r2 = (v) => Math.round(v * 100) / 100;

// ── REGISTRO: cada compuerta con la historia que la hizo nacer ───────────────
// Se mantiene junto al código A PROPÓSITO: la regla y su razón no pueden
// separarse (si se separan, alguien "optimiza" la regla sin conocer el costo).
export const REGISTRO = [
  { id: 'margen-agujero-borde', regla: 'margen borde-a-borde ≥ 1×Ø en corte LÁSER (junta apernada) · ≥ max(1×Ø, 2×t) si es PUNZONADO',
    origen: 'Sergio 12-08 («distancia de agujeros a bordes, cada pieza debe verse funcional por sí sola») + Sergio 13-08: el 2×t es regla de punzonado y aplicarla a láser dejaba ventanas vacías' },
  { id: 'agujero-en-pliegue', regla: 'ningún barreno dentro de la zona de plegado (R + 2×t de la línea)',
    origen: 'auditoría de planos: el eje muerto caía en la zona de plegado del ala — el láser lo corta y la plegadora lo deforma' },
  { id: 'pieza-sin-fijacion', regla: 'toda pieza de chapa tiene barrenos o se declara soldada',
    origen: 'panel 12-08 (G-guardas): las guardas del tensor quedaron con CERO pernos al filtrar muescas' },
  { id: 'zona-prohibida', regla: 'un elemento móvil (banda, cadena, cable) mantiene holgura declarada contra toda pieza fija, salvo exclusión DECLARADA',
    origen: 'Sergio 13-08: «the road is going in a wrong way» — el retorno atravesaba la placa del cabezal (en el LBP desde Rev.B, sin que nadie seccionara ahí)' },
  { id: 'rango-fisico', regla: 'toda magnitud derivada fuera de su rango físico es ARTEFACTO del solver, no geometría',
    origen: 'Sergio 13-08: el rodillo al lado equivocado de la línea del lazo producía una envoltura de 336° que se dibujaba y se sumaba al largo de banda' },
  { id: 'cantidad-derivada', regla: 'ninguna cantidad se escribe literal si puede contarse del modelo; el calce se verifica 1:1',
    origen: 'panel 12-08 (G1/G2): 16 vs 32 collarines y «16 sop.» literales dejaron media flota sin patas' },
  { id: 'rotulo-coherente', regla: 'una cifra citada en un rótulo debe existir en la pieza que rotula',
    origen: '13-08: el GA seguía diciendo «columna telescópica 71×38» después de que la pieza pasó a canal C 77×38' },
  { id: 'flat-vs-solido', regla: 'el desarrollo y el sólido 3D deben tener los MISMOS barrenos; una subpieza soldada con barrenos necesita su propio plano o su fila de corte',
    origen: 'panel adversarial 13-08: «el flat y el sólido se escriben desde variables distintas y nunca se comparan» + la lección de la mecha («toda pieza física es pieza propia con plano»)' },
  { id: 'masa-exacta', regla: 'masa y superficie salen del área REAL del desarrollo, nunca del bbox',
    origen: '13-08: la maestranza cotiza por kg y la pintura por m²; el bbox sobrestimaba ~20%' },
  { id: 'corte-de-barras', regla: 'el despiece de barras cabe en el largo comercial, con kerf incluido',
    origen: 'célula: 8 ejes de 690 no salen de una barra de 6 m si no se cuenta el kerf' },
  { id: 'peligro-expuesto', regla: 'toda parte móvil (eje, sprocket, acople, motorreductor) queda DENTRO de un cerramiento — pieza de guarda o caja de estructura DECLARADA — o lleva exención con razón; lo que sobresale se mide en mm y se reporta con la coordenada donde mirar',
    origen: 'D.S. 594 Art. 38 (Chile, obligación legal: «Deberán estar debidamente protegidas todas las partes móviles, transmisiones y puntos de operación de maquinarias y equipos») + medición 17-08: el estado decía «guardas 0%» y la artesa inferior ya existía, pero nadie había medido QUÉ quedaba fuera — el muñón motriz sale 144,5 mm del cierre y el motorreductor entero está fuera' },
  { id: 'chapa-vs-componente', regla: 'una pieza de chapa no puede ocupar el mismo espacio que un componente comprado (chumacera, motorreductor, rodamiento): el componente llega con su forma y no se recorta en obra',
    origen: '17-08: el faldón de la artesa (Y −253,5) atravesaba la brida de la UCF206 (Y −251…−266, 127 mm de diagonal) con un paso de sólo Ø48 — las seis chumaceras de LBP y GT, en un paquete ya emitido como Rev.E.1. Nadie lo vio porque ninguna compuerta comparaba sólidos entre sí y la sección nunca se cortó ahí' },
  { id: 'abertura-vs-alcance', regla: 'ISO 13857, alcance a través de aberturas: una perforación, ranura o mirilla de ancho e exige distancia mínima s al peligro (e≤4→2 · 6<e≤8→ranura 20/cuadrado 15/círculo 5 · 12<e≤20→120 · e>120 no es abertura, es hueco)',
    origen: 'guardas.md (12-08) fijó holguras «ISO 13857 como criterio general, SIN respaldo en la fuente» y así quedó en el drenaje Ø8 de la artesa: el 17-08 se citó la tabla real (BG ETEM S 044 E, págs. 5-6) y dejó de ser criterio para ser cifra' },
];

// ── derivaciones compartidas (UNA sola verdad para BOM, láminas y GA) ────────
export const areaPoly = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
};

/** Área NETA del desarrollo (contorno − barrenos − recortes), en mm². */
export function areaFlat(flat) {
  if (!flat?.contorno) return 0;
  let a = areaPoly(flat.contorno);
  for (const c of flat.cortes?.circles || []) a -= Math.PI * c.r * c.r;
  for (const q of flat.cortes?.polys || []) a -= areaPoly(q.pts || q);
  return Math.max(0, a);
}

/** Masa exacta de una pieza de chapa [kg]. ρ acero = 7,85e-6 kg/mm³. */
export const masaFlat = (flat, rho = 7.85e-6) =>
  flat?.t ? Math.round(areaFlat(flat) * flat.t * rho * 100) / 100 : 0;

/** Superficie a pintar (2 caras) [m²] y plancha consumida (bbox) [m²]. */
export function superficiesFlat(flat) {
  if (!flat?.contorno) return { pintar_m2: 0, plancha_m2: 0 };
  const xs = flat.contorno.map(q => q[0]), ys = flat.contorno.map(q => q[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  return {
    pintar_m2: Math.round(2 * areaFlat(flat) / 1000) / 1000,
    plancha_m2: Math.round(w * h / 1000) / 1000,
  };
}

// ── geometría auxiliar ───────────────────────────────────────────────────────
const distSeg = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
};
const paresPliegue = (pl) => {
  // acepta {p0,p1} o [[u,v],[u,v]]
  if (!pl) return null;
  if (Array.isArray(pl) && pl.length === 2 && Array.isArray(pl[0])) return [pl[0], pl[1]];
  if (pl.p0 && pl.p1) return [pl.p0, pl.p1];
  if (pl.a && pl.b) return [pl.a, pl.b];
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPUERTAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * margen agujero→borde en TODOS los desarrollos.
 * Exenciones: patrones DICTADOS por el fabricante (grillas de catálogo) o
 * cotas MEASURED que se copian tal cual — se pasan como regex y quedan
 * DECLARADAS en el informe (nunca silenciosas).
 */
export function margenAgujeroBorde(parts, { exentos = [], pisoPaso = 12, proceso = 'laser' } = {}) {
  const errs = [];
  let peor = null;
  for (const p of parts) {
    if (!p.flat?.contorno) continue;
    // La exención se concede POR AGUJERO, no por pieza entera: exentar la
    // pieza tapa barrenos NUESTROS que conviven con la grilla del fabricante
    // (hallazgo del panel adversarial 13-08). Un barreno puede vetar su
    // propia exención con `exento:false` en el flat.
    const exPieza = exentos.some(re => re.test(p.name));
    for (const c of p.flat.cortes?.circles || []) {
      const exento = exPieza && c.exento !== false;
      let dMin = Infinity;
      const ctr = p.flat.contorno;
      for (let i = 0; i + 1 < ctr.length; i++) dMin = Math.min(dMin, distSeg(c.c, ctr[i], ctr[i + 1]));
      const margen = r2(dMin - c.r);
      // La distancia mínima al borde DEPENDE DEL PROCESO DE CORTE:
      //  · PUNZONADO: ≥ 2×t — el punzón deforma y desgarra la piel del borde.
      //  · LÁSER: el borde no se deforma; manda la regla ESTRUCTURAL de la
      //    junta apernada, ≥ 1×Ø (y Eurocode e2 ≥ 1,2·d0 queda cubierto).
      // Corrección de Sergio 13-08: aplicar 2×t a piezas LASER-cortadas dejaba
      // ventanas vacías y empujaba a ensanchar perfiles de 1½ in que NO se
      // pueden ensanchar (el 38,1 es el idioma del sistema 24 V completo).
      const esPaso = 2 * c.r >= 24;
      const req = esPaso
        ? Math.max(pisoPaso, proceso === 'punzonado' ? 2 * p.flat.t : p.flat.t)
        : (proceso === 'punzonado' ? Math.max(2 * c.r, 2 * p.flat.t) : 2 * c.r);
      const rel = margen / req;
      if (!peor || rel < peor.rel) peor = { rel, margen, pieza: p.name, req: r2(req), exento };
      if (margen < req && !exento) {
        errs.push(`margen agujero→borde ${margen} < ${r2(req)} en «${p.name}» (Ø${r2(2 * c.r)})`);
      }
    }
  }
  return { errs, peor };
}

/**
 * Ningún barreno dentro de la zona de plegado: el láser lo corta plano y la
 * plegadora lo deforma. Zona = R + 2×t a cada lado de la línea de pliegue.
 */
export function agujeroEnPliegue(parts, { margen = null } = {}) {
  const errs = [];
  for (const p of parts) {
    const f = p.flat;
    if (!f?.pliegues?.length) continue;
    const m = margen ?? f.t;              // práctica de plegadora: ≥1×t fuera de la banda
    // agrupar las líneas de un mismo pliegue en su BANDA física [tang..tang]:
    // la chapa se deforma ENTRE tangentes, no alrededor de cada línea
    const bandas = [];
    for (const pl of f.pliegues) {
      const seg = paresPliegue(pl);
      if (!seg) continue;
      const horiz = Math.abs(seg[0][1] - seg[1][1]) < 1e-6;
      const pos = horiz ? seg[0][1] : seg[0][0];
      const ext = horiz ? [Math.min(seg[0][0], seg[1][0]), Math.max(seg[0][0], seg[1][0])]
                        : [Math.min(seg[0][1], seg[1][1]), Math.max(seg[0][1], seg[1][1])];
      const b = bandas.find(q => q.horiz === horiz && q.ext[0] === ext[0] && q.ext[1] === ext[1] &&
        Math.abs(q.pos0 - pos) < (f.radio ?? f.t) * 4 + 4);
      if (b) { b.pos0 = Math.min(b.pos0, pos); b.pos1 = Math.max(b.pos1, pos); }
      else bandas.push({ horiz, ext, pos0: pos, pos1: pos });
    }
    for (const c of f.cortes?.circles || []) {
      for (const b of bandas) {
        const [cu, cv] = c.c;
        const along = b.horiz ? cu : cv;                 // a lo largo de la línea
        const across = b.horiz ? cv : cu;                // atravesando el pliegue
        if (along < b.ext[0] - c.r || along > b.ext[1] + c.r) continue;   // fuera del tramo plegado
        const lo = b.pos0 - m - c.r, hi = b.pos1 + m + c.r;
        if (across > lo && across < hi) {
          errs.push(`barreno Ø${r2(2 * c.r)} en «${p.name}» invade la ZONA DE PLEGADO ${r2(b.pos0)}..${r2(b.pos1)} (centro a ${r2(across)}; debe quedar fuera de ${r2(lo)}..${r2(hi)} con margen ${r2(m)}) — la plegadora lo deforma`);
        }
      }
    }
  }
  return errs;
}

/**
 * Toda pieza de chapa tiene con qué fijarse: barrenos, o se declara soldada
 * (nombre o material la mencionan). Una pieza sin fijación es una pieza que
 * se cae.
 */
export function piezaSinFijacion(parts, { soldadas = [/soldad/i], uniones = [] } = {}) {
  const errs = [];
  // «declarada soldada» se lee de la ESPECIFICACIÓN de soldadura del equipo
  // (fuente única que ya imprimen el GA y el manual): si una unión nombra la
  // pieza, está declarada. Así no hay una segunda lista que mantener.
  const declaradaEnUniones = (name) => {
    const tokens = (name.match(/[A-Z][A-Za-z_0-9]{3,}/g) || []).filter(t => !/^FAB|NORM$/.test(t));
    return tokens.some(t => uniones.some(u => String(u).includes(t)));
  };
  for (const p of parts) {
    if (!p.flat?.contorno) continue;
    const n = (p.flat.cortes?.circles || []).length + (p.flat.cortes?.polys || []).length;
    const esSoldada = soldadas.some(re => re.test(p.name)) ||
      (p.features || []).some(f => /soldad/i.test(f.name || '')) ||
      declaradaEnUniones(p.name);
    if (n === 0 && !esSoldada) errs.push(`«${p.name}» no tiene barrenos ni se declara soldada (ni en la especificación de soldadura) — pieza sin fijación`);
  }
  return errs;
}

/**
 * FLAT ↔ SÓLIDO. El desarrollo y el sólido 3D se escriben desde variables
 * DISTINTAS del generador: un plano puede mentir respecto del modelo y nada
 * lo detecta (hallazgo del panel adversarial 13-08). Compara el multiconjunto
 * de diámetros: lo que está en el 3D debe estar en el desarrollo.
 *
 * Separa el caso legítimo: barrenos que pertenecen a una SUBPIEZA SOLDADA
 * (clip, oreja, cartela) que vive como feature dentro de la pieza madre. Esos
 * no van en el desarrollo de la madre — pero entonces la subpieza necesita su
 * PROPIO plano o su fila de corte, o el taller no sabe que existe (lección de
 * la mecha: «toda pieza física es pieza propia con plano»).
 */
export function flatVsSolido(parts, { subpiezas = [/clip/i, /oreja/i, /cartela/i] } = {}) {
  const errs = [], huerfanas = [];
  const key = (v) => Number(v).toFixed(1);
  for (const p of parts) {
    if (!p.flat?.contorno) continue;
    const esSub = (n) => subpiezas.some(re => re.test(n || ''));
    // Un barreno pertenece a la subpieza por GEOMETRÍA, no por nombre: el
    // «Paso M6 clip» de la placa es un barreno DE LA PLACA (el perno la
    // atraviesa para entrar al clip). Sólo cuenta como de la subpieza si su
    // centro cae DENTRO del cuerpo de la subpieza. (El nombre engañaba: era
    // un falso positivo de la primera versión de esta compuerta.)
    const cajasSub = (p.features || []).filter(f => f.shape === 'box' && esSub(f.name))
      .map(f => ({ n: f.name,
        x0: f.at[0] - f.params.w / 2, x1: f.at[0] + f.params.w / 2,
        y0: f.at[1] - f.params.d / 2, y1: f.at[1] + f.params.d / 2,
        z0: f.at[2], z1: f.at[2] + f.params.h }));
    const dentroDeSub = (at, tol = 0.6) => cajasSub.some(b =>
      at[0] > b.x0 - tol && at[0] < b.x1 + tol &&
      at[1] > b.y0 - tol && at[1] < b.y1 + tol &&
      at[2] > b.z0 - tol && at[2] < b.z1 + tol);
    const h3d = {}, hSub = {}, hFlat = {};
    for (const f of p.features || []) {
      if (f.shape !== 'hole') continue;
      const d = key(f.params?.dia);
      if (cajasSub.length && dentroDeSub(f.at)) hSub[d] = (hSub[d] || 0) + 1;
      else h3d[d] = (h3d[d] || 0) + 1;
    }
    for (const c of p.flat.cortes?.circles || []) {
      const d = key(2 * c.r); hFlat[d] = (hFlat[d] || 0) + 1;
    }
    for (const d of new Set([...Object.keys(h3d), ...Object.keys(hFlat)])) {
      const a = h3d[d] || 0, b = hFlat[d] || 0;
      if (a !== b) errs.push(`«${p.name}»: Ø${d} — el SÓLIDO tiene ${a} y el DESARROLLO ${b}. El plano miente respecto del modelo`);
    }
    // subpiezas soldadas con barrenos: ¿tienen plano propio?
    const cuerpos = (p.features || []).filter(f => f.shape === 'box' && esSub(f.name));
    if (cuerpos.length && Object.keys(hSub).length) {
      // ¿existe la subpieza como PIEZA propia? Se busca por su nombre real
      // (sin el paréntesis), no por el patrón: el nombre de la madre puede
      // mencionar «clips» y dar un falso «sí tiene plano».
      const nomSub = cuerpos[0].name.split('(')[0].trim();
      const propia = parts.some(q => q !== p && q.name.includes(nomSub) && q.flat);
      if (!propia) huerfanas.push({ madre: p.name, subpieza: cuerpos[0].name, n: cuerpos.length,
        barrenos: Object.entries(hSub).map(([d, n]) => `${n}×Ø${d}`).join(' ') });
    }
  }
  return { errs, huerfanas };
}

/**
 * Lista de corte de las PIEZAS MENORES SOLDADAS que viven como feature dentro
 * de otra pieza (clips, orejas, cartelas). Sin esto el taller no sabe que
 * existen: el desarrollo de la madre no las contiene y no tienen plano propio.
 * Devuelve lo DERIVABLE del modelo (cantidad, cuerpo, barrenos); la
 * designación del perfil sale de la especificación de soldadura del equipo.
 */
export function subpiezasSoldadas(parts, { subpiezas = [/clip/i, /oreja/i, /cartela/i] } = {}) {
  const esSub = (n) => subpiezas.some(re => re.test(n || ''));
  const acc = new Map();
  for (const p of parts) {
    const cajas = (p.features || []).filter(f => f.shape === 'box' && esSub(f.name));
    if (!cajas.length) continue;
    for (const b of cajas) {
      // Una pieza física puede modelarse con VARIAS cajas (un clip en L son
      // dos: ala vertical + ala horizontal). Se agrupan por el nombre sin el
      // sufijo de ala y por la pieza madre, y la cantidad es el número de
      // POSICIONES, no de cajas — si no, cada clip se cuenta dos veces.
      const nom = b.name.split('(')[0].replace(/\s*ala (vertical|horizontal)\s*/i, ' ').replace(/\s+/g, ' ').trim();
      const dims = [b.params.w, b.params.d, b.params.h].map(v => Math.round(v * 10) / 10);
      const k = nom + '|' + p.name;
      const cur = acc.get(k) || { nombre: nom, madre: p.name, dims, n: 0, alas: new Set(), barrenos: {} };
      cur.alas.add((b.name.match(/ala (vertical|horizontal)/i) || [, 'única'])[1]);
      cur.n++;
      cur.dims = cur.dims.map((v, i) => Math.max(v, dims[i]));
      const dentro = (at, tol = 0.6) =>
        at[0] > b.at[0] - b.params.w / 2 - tol && at[0] < b.at[0] + b.params.w / 2 + tol &&
        at[1] > b.at[1] - b.params.d / 2 - tol && at[1] < b.at[1] + b.params.d / 2 + tol &&
        at[2] > b.at[2] - tol && at[2] < b.at[2] + b.params.h + tol;
      for (const f of p.features || []) {
        if (f.shape !== 'hole' || !dentro(f.at)) continue;
        const d = 'Ø' + Number(f.params.dia).toFixed(1);
        cur.barrenos[d] = (cur.barrenos[d] || 0) + 1;
      }
      acc.set(k, cur);
    }
  }
  // los barrenos se contaron por unidad acumulada: normalizar a por-unidad
  return [...acc.values()].map(x => {
    const piezas = Math.max(1, Math.round(x.n / x.alas.size));   // cajas ÷ alas = piezas físicas
    return {
      nombre: x.nombre, madre: x.madre, dims: x.dims, n: piezas,
      modelada_con: x.alas.size > 1 ? [...x.alas].join('+') : 'una caja',
      barrenos_por_unidad: Object.fromEntries(
        Object.entries(x.barrenos).map(([d, n]) => [d, Math.max(1, Math.round(n / piezas))])),
    };
  });
}

/**
 * ZONA PROHIBIDA (keep-out). Generaliza el defecto que Sergio encontró en el
 * nosebar: un elemento MÓVIL (lazo de banda, cadena, cable, brazo) no puede
 * invadir el volumen de una pieza FIJA.
 *
 * @param trayectoria [[x,z]…] polilínea CERRADA o abierta del móvil
 * @param zonas [{nombre, x0,x1,z0,z1, exclusiones?:[{cx,cz,r}|{x0,x1,z0,z1}]}]
 * @param holgura mm mínimos de aire
 * @returns {errs, peor} — peor = punto de mayor penetración (para ir a mirarlo)
 */
export function zonaProhibida(trayectoria, zonas, { holgura = 8, paso = 2 } = {}) {
  const errs = [];
  let peor = null;
  const dentroExcl = (x, z, ex) => (ex || []).some(e =>
    e.r != null ? Math.hypot(x - e.cx, z - e.cz) <= e.r
                : (x > e.x0 && x < e.x1 && z > e.z0 && z < e.z1));
  for (const Z of zonas) {
    const X0 = Z.x0 - holgura, X1 = Z.x1 + holgura, Z0 = Z.z0 - holgura, Z1 = Z.z1 + holgura;
    for (let i = 0; i < trayectoria.length; i++) {
      const a = trayectoria[i], b = trayectoria[(i + 1) % trayectoria.length];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso));
      for (let j = 0; j <= n; j++) {
        const x = a[0] + (b[0] - a[0]) * j / n, z = a[1] + (b[1] - a[1]) * j / n;
        if (dentroExcl(x, z, Z.exclusiones)) continue;
        if (x > X0 && x < X1 && z > Z0 && z < Z1) {
          const pen = r2(Math.min(x - X0, X1 - x, z - Z0, Z1 - z));
          if (!peor || pen > peor.pen) peor = { zona: Z.nombre, x: r2(x), z: r2(z), pen };
        }
      }
    }
    if (peor && peor.zona === Z.nombre) {
      errs.push(`el elemento móvil INVADE «${Z.nombre}» en (${peor.x}, ${peor.z}) — holgura mínima ${holgura} contra [${Z.x0}..${Z.x1}]×[${Z.z0}..${Z.z1}]`);
    }
  }
  return { errs, peor };
}

/**
 * RANGO FÍSICO. Una magnitud derivada fuera de su rango delata un ARTEFACTO
 * del solver, no una geometría rara: el dibujo y las cifras que salen de ahí
 * son falsos aunque se vean plausibles.
 */
export function rangoFisico(valores, { nombre = 'magnitud' } = {}) {
  const errs = [];
  for (const v of valores) {
    if (v.valor < v.min || v.valor > v.max) {
      errs.push(`${nombre} ${r2(v.valor)}${v.unidad || ''} en ${v.donde} fuera de [${v.min}..${v.max}] — revisar ARTEFACTO del solver antes que la geometría`);
    }
  }
  return errs;
}

/** Calce 1:1 entre lo CONTADO del modelo y lo declarado. Nada literal. */
export function calce(pares) {
  const errs = [];
  for (const p of pares) {
    if (p.contado !== p.esperado) {
      errs.push(`${p.nombre}: contado ${p.contado} ≠ esperado ${p.esperado}${p.razon ? ` (${p.razon})` : ''}`);
    }
  }
  return errs;
}

/**
 * RÓTULO COHERENTE. Si un rótulo cita cifras («canal C 77×38×3»), esas cifras
 * deben aparecer en el nombre de la pieza que rotula. Caza el rótulo que
 * quedó viejo tras cambiar la pieza — que es exactamente lo que pasó con la
 * columna del soporte.
 */
export function rotuloCoherente(rotulos, parts) {
  const errs = [];
  const cifras = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || [])
    .map(n => n.replace(',', '.'))
    .filter(n => Number(n) >= 10);          // ignora índices y cantidades chicas
  for (const [re, texto] of rotulos) {
    const pieza = parts.find(p => re.test(p.name));
    if (!pieza) continue;
    const enPieza = new Set(cifras(pieza.name));
    const huerfanas = cifras(texto).filter(n => !enPieza.has(n));
    // solo alertamos si TODAS las cifras del rótulo son ajenas a la pieza:
    // un rótulo puede citar cotas legítimas que no están en el nombre
    if (huerfanas.length && huerfanas.length === cifras(texto).length && cifras(texto).length >= 2) {
      errs.push(`rótulo «${texto}» cita ${huerfanas.join('/')} y ninguna aparece en «${pieza.name}» — ¿rótulo viejo?`);
    }
  }
  return errs;
}

/** Corte de barras: ¿cabe el despiece en el largo comercial, con kerf? */
export function corteDeBarras(cortes) {
  const errs = [];
  for (const c of cortes) {
    const usado = c.n * (c.largo + (c.kerf ?? 9));
    if (usado > c.barra) errs.push(`${c.n} × ${c.nombre} (${c.largo}) no salen de una barra de ${c.barra} mm (usa ${usado})`);
  }
  return errs;
}

/**
 * ZONAS PARA MIRAR. No es una compuerta: es la lista de sitios donde el
 * elemento móvil pasa CERCA de algo fijo. La verificación visual obligatoria
 * (regla 7 de la célula) deja de ser «mira el paquete» y pasa a ser «mira
 * ESTOS puntos» — que es como se cazó el defecto del nosebar.
 */
export function zonasParaMirar(trayectoria, zonas, { cerca = 40 } = {}) {
  const out = [];
  for (const Z of zonas) {
    let dMin = Infinity, at = null;
    const cx = (Z.x0 + Z.x1) / 2, cz = (Z.z0 + Z.z1) / 2;
    for (const [x, z] of trayectoria) {
      const dx = Math.max(Z.x0 - x, 0, x - Z.x1), dz = Math.max(Z.z0 - z, 0, z - Z.z1);
      const d = Math.hypot(dx, dz);
      if (d < dMin) { dMin = d; at = [r2(x), r2(z)]; }
    }
    if (dMin <= cerca) out.push({ zona: Z.nombre, holgura: r2(dMin), mirar_en: at, centro: [r2(cx), r2(cz)] });
  }
  return out.sort((a, b) => a.holgura - b.holgura);
}

// ── ISO 13857 · alcance a través de aberturas ────────────────────────────────
// Tabla reproducida de BG ETEM S 044 E «Safety of machinery — Safety distances
// protect arms and legs» (edición que reproduce EN ISO 13857), págs. 5 y 6.
// e = ancho de la abertura (lado del cuadrado · diámetro del círculo · MENOR
// dimensión de la ranura). s = distancia mínima de la abertura al peligro.
// Nota 1 de la fuente: en ranura de largo ≤ 65 mm el pulgar limita el acceso y
// s puede bajar a 200. Nota 2: para e > 120 se aplica el alcance POR ENCIMA,
// no esta tabla — o sea, una abertura de más de 120 no es una abertura: es un
// hueco, y el peligro se resuelve de otra manera.
export const ISO13857_SUP = [
  { max: 4, ranura: 2, cuadrado: 2, circulo: 2, parte: 'punta de dedo' },
  { max: 6, ranura: 10, cuadrado: 5, circulo: 5, parte: 'punta de dedo' },
  { max: 8, ranura: 20, cuadrado: 15, circulo: 5, parte: 'dedo hasta nudillo' },
  { max: 10, ranura: 80, cuadrado: 25, circulo: 20, parte: 'dedo hasta nudillo' },
  { max: 12, ranura: 100, cuadrado: 80, circulo: 80, parte: 'dedo hasta nudillo' },
  { max: 20, ranura: 120, cuadrado: 120, circulo: 120, parte: 'dedo hasta nudillo' },
  { max: 30, ranura: 850, cuadrado: 120, circulo: 120, parte: 'brazo hasta hombro', nota: 'ranura ≤65 de largo: 200' },
  { max: 40, ranura: 850, cuadrado: 200, circulo: 120, parte: 'brazo hasta hombro' },
  { max: 120, ranura: 850, cuadrado: 850, circulo: 850, parte: 'brazo hasta hombro' },
];
export const ISO13857_INF = [
  { max: 5, ranura: 0, cuadrado: 0, parte: 'punta del pie' },
  { max: 15, ranura: 10, cuadrado: 0, parte: 'punta del pie' },
  { max: 35, ranura: 80, cuadrado: 25, parte: 'pie', nota: 'ranura ≤75 de largo: 50' },
  { max: 60, ranura: 180, cuadrado: 80, parte: 'pie' },
  { max: 80, ranura: 650, cuadrado: 180, parte: 'pierna hasta rodilla' },
  { max: 95, ranura: 1100, cuadrado: 650, parte: 'pierna hasta rodilla' },
  { max: 180, ranura: 1100, cuadrado: 1100, parte: 'pierna hasta entrepierna' },
];

/**
 * Distancia mínima al peligro para una abertura de ancho `e`.
 * Devuelve `{ s, parte, nota }`, o `s: null` cuando la tabla ya no aplica
 * (e > 120 en miembro superior): eso NO es «sin límite», es «esta tabla no
 * responde» — y el llamador debe verlo, no interpretarlo como permiso.
 */
export function distanciaSeguridad(e, forma = 'ranura', miembro = 'superior') {
  const tabla = miembro === 'inferior' ? ISO13857_INF : ISO13857_SUP;
  const key = forma === 'cuadrado' || forma === 'circulo' ? forma : 'ranura';
  for (const f of tabla) {
    if (e <= f.max) {
      const s = f[key] ?? f.cuadrado;
      return { s, parte: f.parte, nota: f.nota || null, e_max: f.max };
    }
  }
  return { s: null, parte: null, e_max: null,
    nota: `e=${r2(e)} excede la tabla de alcance a través (máx ${tabla[tabla.length - 1].max}): se aplica alcance POR ENCIMA o cerramiento` };
}

/** ¿Una abertura de ancho e a distancia d del peligro es admisible? */
export function aberturaAdmisible(e, d, forma = 'ranura', miembro = 'superior') {
  const { s, parte, nota } = distanciaSeguridad(e, forma, miembro);
  if (s === null) return { ok: false, s, razon: nota };
  return { ok: d >= s, s, parte,
    razon: d >= s ? null : `abertura ${forma} e=${r2(e)} a ${r2(d)} del peligro: ISO 13857 exige ≥ ${s} (${parte})` };
}

/**
 * Caja envolvente en coordenadas de MUNDO de una pieza: features de unión
 * (los `hole` restan material, no lo agregan) + `pos` + `quat`.
 */
export function cajaMundo(part) {
  const q = part.quat || [0, 0, 0, 1];
  const P = part.pos || [0, 0, 0];
  const rot = ([x, y, z]) => {
    const [qx, qy, qz, qw] = q;
    const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
    return [x + qw * tx + qy * tz - qz * ty, y + qw * ty + qz * tx - qx * tz, z + qw * tz + qx * ty - qy * tx];
  };
  const B = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
  for (const f of part.features || []) {
    const d = dimsFeature(f);
    if (!d) continue;
    const [a, b] = d;
    for (const cx of [a[0], b[0]]) for (const cy of [a[1], b[1]]) for (const cz of [a[2], b[2]]) {
      const w = rot([cx, cy, cz]);
      for (let i = 0; i < 3; i++) { B[i][0] = Math.min(B[i][0], w[i] + P[i]); B[i][1] = Math.max(B[i][1], w[i] + P[i]); }
    }
  }
  if (!isFinite(B[0][0])) return null;
  return [B[0][0], B[0][1], B[1][0], B[1][1], B[2][0], B[2][1]].map(r2);
}

// Extensión local de un feature de unión: [min[3], max[3]] o null si no suma.
function dimsFeature(f) {
  if (f.shape === 'hole' || f.op === 'cut' || f.op === 'subtract') return null;
  const a = f.at || [0, 0, 0], pr = f.params || {};
  if (f.shape === 'box') {
    const w = pr.w ?? pr.l ?? 0, d = pr.d ?? 0, h = pr.h ?? 0;
    return [[a[0] - w / 2, a[1] - d / 2, a[2]], [a[0] + w / 2, a[1] + d / 2, a[2] + h]];
  }
  if (/cyl/.test(f.shape || '')) {
    const dia = pr.dia ?? 2 * (pr.r ?? 0), h = pr.h ?? 0, dir = f.dir || [0, 0, 1];
    const ax = dir.findIndex(v => Math.abs(v) > 0.5);
    const lo = [0, 1, 2].map(i => i === ax ? a[i] - (dir[i] < 0 ? h : 0) : a[i] - dia / 2);
    const hi = [0, 1, 2].map(i => i === ax ? lo[i] + h : a[i] + dia / 2);
    return [lo, hi];
  }
  return null;
}

const PELIGROS_POR_DEFECTO = [
  /sprocket/i, /pi[ñn][oó]n/i, /catarina/i, /eje\s+(motriz|tensor|de mando)/i,
  /motorreductor/i, /\bmotor\b/i, /cadena de transmisi/i, /acople/i, /collar[ií]n/i,
];
const CERRAMIENTOS_POR_DEFECTO = [/guarda/i, /cubierta/i, /artesa/i, /carcasa/i, /cerramiento/i];

/**
 * PELIGRO EXPUESTO. DS 594 Art. 38 (Chile): «Deberán estar debidamente
 * protegidas todas las partes móviles, transmisiones y puntos de operación de
 * maquinarias y equipos.» Es obligación legal, no criterio de diseño: no
 * admite «se ve bien».
 *
 * Qué hace: muestrea el VOLUMEN de cada parte móvil (no su caja, que traería
 * esquinas vacías) y cuenta cuánto queda fuera de la unión de los cerramientos
 * declarados. Un cerramiento formado por la ESTRUCTURA y no por una pieza sola
 * (p. ej. «entre placas laterales») se declara como caja explícita en
 * `cajasExtra` — declararla es legítimo, suponerla no.
 *
 * Devuelve `mirar_en`: el punto expuesto más lejano al cerramiento, para que
 * la verificación visual (regla 12) sea «mira ESTA coordenada».
 */
export function peligroExpuesto(parts, {
  peligros = PELIGROS_POR_DEFECTO,
  cerramientos = CERRAMIENTOS_POR_DEFECTO,
  cajasExtra = [], exentos = [], paso = 10, holgura = 0,
} = {}) {
  const cajas = [];
  for (const p of parts) {
    if (!cerramientos.some(rx => rx.test(p.name || ''))) continue;
    const c = cajaMundo(p);
    if (c) cajas.push({ nombre: p.name, caja: c });
  }
  for (const x of cajasExtra) cajas.push({ nombre: x.nombre, caja: x.caja });
  const dentro = ([x, y, z]) => cajas.some(({ caja: c }) =>
    x >= c[0] - holgura && x <= c[1] + holgura && y >= c[2] - holgura &&
    y <= c[3] + holgura && z >= c[4] - holgura && z <= c[5] + holgura);

  const errs = [], expuestos = [];
  for (const p of parts) {
    const nombre = p.name || '';
    if (!peligros.some(rx => rx.test(nombre))) continue;
    const ex = exentos.find(e => (e.patron || e).test?.(nombre));
    let total = 0, fuera = 0, peor = null, dPeor = -1;
    const P = p.pos || [0, 0, 0];
    for (const f of p.features || []) {
      const d = dimsFeature(f);
      if (!d) continue;
      const [a, b] = d;
      const esCil = /cyl/.test(f.shape || '');
      const cen = [0, 1, 2].map(i => (a[i] + b[i]) / 2);
      const rad = esCil ? ((f.params?.dia ?? 2 * (f.params?.r ?? 0)) / 2) : 0;
      const ax = esCil ? (f.dir || [0, 0, 1]).findIndex(v => Math.abs(v) > 0.5) : -1;
      const n = [0, 1, 2].map(i => Math.max(1, Math.ceil((b[i] - a[i]) / paso)));
      for (let i = 0; i <= n[0]; i++) for (let j = 0; j <= n[1]; j++) for (let k = 0; k <= n[2]; k++) {
        const q = [a[0] + (b[0] - a[0]) * i / n[0], a[1] + (b[1] - a[1]) * j / n[1], a[2] + (b[2] - a[2]) * k / n[2]];
        if (esCil && ax >= 0) {   // sólo el material del cilindro, no su caja
          const e1 = (ax + 1) % 3, e2 = (ax + 2) % 3;
          if (Math.hypot(q[e1] - cen[e1], q[e2] - cen[e2]) > rad + 1e-6) continue;
        }
        const w = [q[0] + P[0], q[1] + P[1], q[2] + P[2]];
        total++;
        if (dentro(w)) continue;
        fuera++;
        // distancia al cerramiento más cercano: el punto peor es el que más
        // lejos queda de cualquier cierre — es donde hay que mirar
        let dMin = Infinity;
        for (const { caja: c } of cajas) {
          const dx = Math.max(c[0] - w[0], 0, w[0] - c[1]);
          const dy = Math.max(c[2] - w[1], 0, w[1] - c[3]);
          const dz = Math.max(c[4] - w[2], 0, w[2] - c[5]);
          dMin = Math.min(dMin, Math.hypot(dx, dy, dz));
        }
        if (dMin > dPeor) { dPeor = dMin; peor = w.map(r2); }
      }
    }
    if (!total || !fuera) continue;
    const pct = Math.round(100 * fuera / total);
    // Sin NINGÚN cerramiento en el equipo la distancia al cierre más cercano es
    // infinita. Informarla como 0 sería leer «sobresale 0 mm» = inofensivo,
    // justo al revés de lo que pasa. Se dice que no hay cierre. (Lo cazó la
    // primera corrida en gen_transfer90, que no tiene una sola guarda.)
    const sinCierre = !cajas.length;
    const reg = { pieza: nombre.slice(0, 70), pct_fuera: pct, mirar_en: peor };
    if (sinCierre) reg.sin_cerramientos = true; else reg.sale_mm = r2(dPeor);
    if (ex) { reg.exento = ex.razon || 'exención declarada'; expuestos.push(reg); continue; }
    expuestos.push(reg);
    errs.push(sinCierre
      ? `parte móvil sin cerramiento: «${reg.pieza}» — el equipo NO declara ni una sola guarda ni caja de estructura: ${pct}% de su volumen al aire (mirar en ${JSON.stringify(peor)}). DS 594 Art. 38`
      : `parte móvil sin cerramiento: «${reg.pieza}» — ${pct}% de su volumen fuera de toda guarda, hasta ${reg.sale_mm} mm del cierre más cercano (mirar en ${JSON.stringify(peor)}). DS 594 Art. 38`);
  }
  return { errs, expuestos, cerramientos: cajas.map(c => c.nombre) };
}

/**
 * Corredor universal. Un generador nuevo llama SOLO a esto y hereda todo.
 * @param equipos {nombre: {parts, ...}}
 * @param opts {exentosMargen, soldadas, ...}
 */
export function compuertasUniversales(equipos, opts = {}) {
  const errs = [];
  const info = {};
  const ejecutadas = ['margen-agujero-borde', 'agujero-en-pliegue', 'pieza-sin-fijacion', 'masa-exacta', 'flat-vs-solido'];
  for (const [nm, eq] of Object.entries(equipos)) {
    if (!eq?.parts) continue;
    const m = margenAgujeroBorde(eq.parts, { exentos: opts.exentos || opts.exentosMargen || [], ...opts });
    errs.push(...m.errs.map(e => `${nm}: ${e}`));
    info[nm] = { peorMargen: m.peor };
    errs.push(...agujeroEnPliegue(eq.parts).map(e => `${nm}: ${e}`));
    errs.push(...piezaSinFijacion(eq.parts, opts).map(e => `${nm}: ${e}`));
    const fvs = flatVsSolido(eq.parts, opts);
    errs.push(...fvs.errs.map(e => `${nm}: ${e}`));
    if (fvs.huerfanas.length) info[nm] = { ...(info[nm] || {}), subpiezas_sin_plano: fvs.huerfanas };
    const masa = eq.parts.reduce((a, p) => a + masaFlat(p.flat), 0);
    info[nm].masa_chapa_kg = Math.round(masa * 10) / 10;
    // COBERTURA: un sello sin cobertura declara «verificado» sobre nada.
    // Estas compuertas viven del desarrollo de chapa; si no hay flats, no
    // revisaron nada y hay que verlo (caso real: gen_transfer90, 106 piezas
    // sin un solo flat = ninguna pieza es cotizable a corte láser).
    const conFlat = eq.parts.filter(p => p.flat?.contorno).length;
    info[nm].cobertura = { piezas: eq.parts.length, con_desarrollo: conFlat,
      pct: eq.parts.length ? Math.round(100 * conFlat / eq.parts.length) : 0 };
    if (conFlat === 0) info[nm].aviso = 'NINGUNA pieza trae desarrollo de chapa: las compuertas de chapa no verificaron nada';
    // PARTES MÓVILES (DS 594 Art. 38). El cerramiento hecho de ESTRUCTURA y no
    // de una pieza «guarda» se declara por equipo en opts.cerramientosDe(nm):
    // declararlo es legítimo, suponerlo no.
    const pe = peligroExpuesto(eq.parts, {
      ...opts,
      cajasExtra: (typeof opts.cerramientosDe === 'function' ? opts.cerramientosDe(nm, eq) : opts.cajasExtra) || [],
      exentos: opts.exentosPeligro || [],
    });
    errs.push(...pe.errs.map(e => `${nm}: ${e}`));
    if (pe.expuestos.length) info[nm].partes_moviles_fuera = pe.expuestos;
    // CHAPA CONTRA COMPONENTE COMPRADO
    const cvc = chapaVsComponente(eq.parts, { exentos: opts.exentosChoque || [], componente: opts.componentesChoque });
    errs.push(...cvc.errs.map(e => `${nm}: ${e}`));
    if (cvc.choques.length) info[nm].choques_chapa_componente = cvc.choques;
  }
  ejecutadas.push('peligro-expuesto', 'chapa-vs-componente');
  return { errs, info, ejecutadas };
}

// ═══════════════════════════════════════════════════════════════════════════
// SELLO — que olvidar las compuertas NO sea silencioso
// ═══════════════════════════════════════════════════════════════════════════
// Hallazgo de la auditoría 13-08: nada obligaba a un generador nuevo a llamar
// a las compuertas. Olvidar `compuertasUniversales()` en gen_mdc.mjs no rompía
// nada — y un olvido silencioso es peor que no tener la regla, porque el
// paquete SALE con aire de verificado. Solución: el generador SELLA el
// ensamble emitido y todo artefacto downstream EXIGE el sello. Sin sello no
// hay DXF, ni BOM, ni láminas, ni manual: el paquete no puede existir.

export const LIB_VERSION = '1.0.0';

/**
 * Estampa el resultado de las compuertas en el `meta` del ensamble emitido.
 * @param uni resultado de compuertasUniversales()
 * @param extra {exenciones:[], deuda:[], especificas:number}
 */
export function sellarCompuertas(uni, extra = {}) {
  // NO estampar el REGISTRO completo: eso declara verificado lo que no corrió
  // (la lección del cajetín «CERTIFICADA (G4)», CRITERIO_CALIDAD §e.3 —
  // hallazgo del panel adversarial 13-08 sobre este mismo sello).
  return {
    lib: LIB_VERSION,
    reglas_ejecutadas: uni?.ejecutadas ?? [],
    reglas_disponibles_sin_cablear: REGISTRO.map(r => r.id).filter(id => !(uni?.ejecutadas || []).includes(id)),
    hallazgos: uni?.errs?.length ?? 0,
    info: uni?.info ?? {},
    exenciones: (extra.exenciones || []).map(String),
    deuda: extra.deuda || [],
    compuertas_especificas: extra.especificas ?? null,
    nota: 'sello de lib_compuertas.mjs — sin él, los artefactos se niegan a generarse (CELULA_DISENO regla 11)',
  };
}

/**
 * Todo artefacto (DXF, BOM, láminas, GA, manual) llama esto antes de emitir.
 * @param doc ensamble cargado
 * @param quien nombre del artefacto, para el mensaje
 */
export function exigirSello(doc, quien = 'artefacto') {
  const s = doc?.meta?.compuertas;
  if (!s || !s.lib) {
    throw new Error(
      `COMPUERTA: «${quien}» se niega a emitir — el ensamble «${doc?.meta?.nombre || 'sin nombre'}» ` +
      'NO trae sello de compuertas. El generador debe llamar compuertasUniversales() y sellarCompuertas() ' +
      'antes de escribir el JSON (CELULA_DISENO regla 11). Sin verificación no hay paquete.');
  }
  if (s.hallazgos > 0 && !(s.deuda || []).length) {
    throw new Error(`COMPUERTA: «${quien}» — el sello declara ${s.hallazgos} hallazgos sin deuda declarada`);
  }
  return s;
}

/**
 * §3 de CELULA_DISENO ejecutable: «un paquete al que le falte una fila NO se
 * entrega» y «si un artefacto quedó de una corrida anterior, es defecto».
 * @param dir carpeta del paquete
 * @param esperados [{archivo, receptor}]
 * @param refMtime mtime del ensamble: todo artefacto debe ser POSTERIOR
 */
export function paqueteCompleto(dir, esperados, refMtime, { statSync, existsSync, join }) {
  const errs = [];
  for (const e of esperados) {
    const f = join(dir, e.archivo);
    if (!existsSync(f)) { errs.push(`falta «${e.archivo}» (receptor: ${e.receptor}) — el paquete no se entrega incompleto`); continue; }
    const m = statSync(f).mtimeMs;
    if (refMtime && m < refMtime) errs.push(`«${e.archivo}» es de una corrida ANTERIOR al ensamble (${new Date(m).toISOString()}) — regenerar`);
  }
  return errs;
}

/** ¿El punto de mundo `w` cae en material de la pieza? (union sí, hole no) */
export function puntoEnSolido(part, w) {
  const P = part.pos || [0, 0, 0];
  const q = [w[0] - P[0], w[1] - P[1], w[2] - P[2]];
  let dentro = false;
  for (const f of part.features || []) {
    const cav = f.shape === 'hole' || f.op === 'cut' || f.op === 'subtract';
    const d = cav ? dimsHueco(f) : dimsFeature(f);
    if (!d) continue;
    const [a, b] = d;
    let ok = q[0] >= a[0] && q[0] <= b[0] && q[1] >= a[1] && q[1] <= b[1] && q[2] >= a[2] && q[2] <= b[2];
    if (ok && (/cyl/.test(f.shape || '') || cav)) {   // cilindro real, no su caja
      const dir = f.dir || [0, 0, 1];
      const ax = dir.findIndex(v => Math.abs(v) > 0.5);
      if (ax >= 0) {
        const R = ((f.params?.dia ?? 2 * (f.params?.r ?? 0)) / 2);
        const c = f.at || [0, 0, 0];
        const e1 = (ax + 1) % 3, e2 = (ax + 2) % 3;
        ok = Math.hypot(q[e1] - c[e1], q[e2] - c[e2]) <= R;
      }
    }
    if (!ok) continue;
    if (cav) return false;     // el hueco manda: ahí no hay material
    dentro = true;
  }
  return dentro;
}

// Caja de un hueco pasante: se extiende a ambos lados para que un `through`
// atraviese de verdad la chapa (si se tomara sólo su altura nominal, el
// agujero no restaría nada y toda pieza taladrada parecería maciza).
function dimsHueco(f) {
  const a = f.at || [0, 0, 0], pr = f.params || {};
  const R = (pr.dia ?? 2 * (pr.r ?? 0)) / 2;
  const dir = f.dir || [0, 0, 1];
  const ax = dir.findIndex(v => Math.abs(v) > 0.5);
  const L = (f.through || pr.through || !pr.depth) ? 1e4 : (pr.depth || 0);
  const lo = [0, 1, 2].map(i => i === ax ? a[i] - L : a[i] - R);
  const hi = [0, 1, 2].map(i => i === ax ? a[i] + L : a[i] + R);
  return [lo, hi];
}

/**
 * CHAPA CONTRA COMPONENTE COMPRADO. Una guarda de chapa no puede ocupar el
 * mismo espacio que una chumacera, un motorreductor o un rodamiento: el
 * componente llega de proveedor con su forma y no se recorta en obra.
 *
 * Se limita a ese cruce a propósito. Un «todos contra todos» inunda —en un
 * ensamble apernado las piezas se tocan por diseño— y una compuerta que grita
 * en cada corrida se termina apagando.
 */
export function chapaVsComponente(parts, {
  chapa = [/guarda/i, /cubierta/i, /artesa/i, /tapa/i, /copa/i],
  componente = [/^NORM · /],
  exentos = [], paso = 6, minPuntos = 3,
} = {}) {
  // «chapa» = pieza con DESARROLLO: un separador torneado con «guarda» en el
  // nombre no es chapa (la primera corrida los comparó consigo mismos).
  const hojas = parts.filter(p => p.flat?.contorno && chapa.some(rx => rx.test(p.name || '')));
  const comps = parts.filter(p => componente.some(rx => rx.test(p.name || '')));
  const errs = [], choques = [];
  for (const h of hojas) {
    const cajaH = cajaMundo(h);
    if (!cajaH) continue;
    for (const c of comps) {
      if (c === h) continue;               // una pieza no choca consigo misma
      const cajaC = cajaMundo(c);
      if (!cajaC) continue;
      let solapa = true;                       // descarte rápido por cajas
      for (let i = 0; i < 3; i++) if (cajaH[2 * i] > cajaC[2 * i + 1] || cajaC[2 * i] > cajaH[2 * i + 1]) solapa = false;
      if (!solapa) continue;
      if (exentos.some(e => (e.chapa || /.^/).test(h.name || '') && (e.comp || /.^/).test(c.name || ''))) continue;
      // muestreo SÓLO en la caja común, ENCOGIDA 0,5: el contacto de cara
      // diseñado (separador que remata EN la cara del alma) no es choque —
      // penetrar sí. Una caja común de espesor cero desaparece al encoger.
      const lo = [0, 1, 2].map(i => Math.max(cajaH[2 * i], cajaC[2 * i]) + 0.5);
      const hi = [0, 1, 2].map(i => Math.min(cajaH[2 * i + 1], cajaC[2 * i + 1]) - 0.5);
      if (lo.some((v, i) => v >= hi[i])) continue;
      const n = [0, 1, 2].map(i => Math.max(1, Math.ceil((hi[i] - lo[i]) / paso)));
      let k = 0, peor = null;
      for (let i = 0; i <= n[0]; i++) for (let j = 0; j <= n[1]; j++) for (let m = 0; m <= n[2]; m++) {
        const w = [lo[0] + (hi[0] - lo[0]) * i / n[0], lo[1] + (hi[1] - lo[1]) * j / n[1], lo[2] + (hi[2] - lo[2]) * m / n[2]];
        if (puntoEnSolido(h, w) && puntoEnSolido(c, w)) { k++; if (!peor) peor = w.map(r2); }
      }
      if (k < minPuntos) continue;
      const reg = { chapa: (h.name || '').slice(0, 58), componente: (c.name || '').slice(0, 58),
        puntos: k, mirar_en: peor, caja_comun: lo.map(r2).concat(hi.map(r2)) };
      choques.push(reg);
      errs.push(`la chapa «${reg.chapa}» ocupa el mismo espacio que «${reg.componente}» (mirar en ${JSON.stringify(peor)}): el componente viene de proveedor, no se recorta en obra`);
    }
  }
  return { errs, choques };
}
