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
  { id: 'margen-agujero-borde', regla: 'margen borde-a-borde ≥ max(1×Ø, 2×t), piso 12 en pernos',
    origen: 'Sergio 12-08: «distancia de agujeros a bordes, cada pieza debe verse funcional por sí sola»' },
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
  { id: 'masa-exacta', regla: 'masa y superficie salen del área REAL del desarrollo, nunca del bbox',
    origen: '13-08: la maestranza cotiza por kg y la pintura por m²; el bbox sobrestimaba ~20%' },
  { id: 'corte-de-barras', regla: 'el despiece de barras cabe en el largo comercial, con kerf incluido',
    origen: 'célula: 8 ejes de 690 no salen de una barra de 6 m si no se cuenta el kerf' },
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
export function margenAgujeroBorde(parts, { exentos = [], pisoPaso = 12 } = {}) {
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
      // PERNO: ≥ max(1×Ø, 2×t) — el apriete carga el borde.
      // PASO de holgura (Ø≥24, sin apriete: muñones, registros): ≥ max(12, 2×t),
      // la piel solo debe sobrevivir el corte y el plegado.
      // (umbral idéntico al vetado en gen_lbp530 Rev.C — no endurecer sin PRD)
      const esPaso = 2 * c.r >= 24;
      const req = esPaso ? Math.max(pisoPaso, 2 * p.flat.t) : Math.max(2 * c.r, 2 * p.flat.t);
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

/**
 * Corredor universal. Un generador nuevo llama SOLO a esto y hereda todo.
 * @param equipos {nombre: {parts, ...}}
 * @param opts {exentosMargen, soldadas, ...}
 */
export function compuertasUniversales(equipos, opts = {}) {
  const errs = [];
  const info = {};
  const ejecutadas = ['margen-agujero-borde', 'agujero-en-pliegue', 'pieza-sin-fijacion', 'masa-exacta'];
  for (const [nm, eq] of Object.entries(equipos)) {
    if (!eq?.parts) continue;
    const m = margenAgujeroBorde(eq.parts, { exentos: opts.exentos || opts.exentosMargen || [], ...opts });
    errs.push(...m.errs.map(e => `${nm}: ${e}`));
    info[nm] = { peorMargen: m.peor };
    errs.push(...agujeroEnPliegue(eq.parts).map(e => `${nm}: ${e}`));
    errs.push(...piezaSinFijacion(eq.parts, opts).map(e => `${nm}: ${e}`));
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
  }
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
