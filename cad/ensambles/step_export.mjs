#!/usr/bin/env node
// step_export.mjs — STEP AP203 por pieza y del conjunto (orden de Sergio
// 19-08: «importante plano STEP y nomenclatura por familias y jerarquizada»).
//
// Por qué STEP: el DXF es el contrato del láser (2D) y el GLB es para ver;
// el proveedor externo —maestranza, tornería, cotizador— abre STEP en
// cualquier CAD sin pedirnos nada. Sin STEP, cada cotización empieza con un
// correo pidiendo el 3D.
//
// Geometría: FACETED_BREP (malla del modelo → caras planas). Es geometría
// EXACTA de nuestro modelo teselado, no una aproximación nueva; para las
// piezas VENDOR se exporta el original tal cual (misma regla 22).
//
// Nombre de archivo = nomenclatura de los tres niveles:
//   <TIPO>-<FAMILIA>-<ÍTEM>.step   p. ej. CV-LBP18-F30-059.step
//
// Uso: DOC=ensambles/lbp530_5m.json TIPO=CV-LBP18 OUTDIR=… [SOLO=item] \
//      node ensambles/step_export.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { partGeometry } from '../js/iso3d.mjs';
import { geometriasDelDoc } from './lib_glb.mjs';
import { idsDe, fichaDe } from '../js/brep.mjs';
import { exigirSello } from './lib_compuertas.mjs';

const docPath = process.env.DOC; if (!docPath) throw new Error('falta DOC=');
const doc = JSON.parse(readFileSync(docPath, 'utf8'));
exigirSello(doc, 'step_export');
const TIPO = process.env.TIPO || 'CV-XXX';
const outDir = process.env.OUTDIR || 'ensambles/step';
mkdirSync(outDir, { recursive: true });
const base = docPath.split('/').pop().replace(/\.json$/, '');

// familias: MISMA tabla que tools/avance_equipos.py (si divergen, el código
// del STEP mentiría respecto del tablero)
const FAMILIAS = [
  ['F10', /EJE MOTRIZ|Sprocket|Motorreductor|TAMBOR MOTRIZ|Cabezal MOTRIZ|Chumacera|UCF|Mecha porta|Collarín/],
  ['F20', /EJE TENSOR|TAMBOR TENSOR|Cabezal de COLA|tensor|Tensor/],
  ['F30', /Placa lateral|Travesaño|Portacarril|Perfil|Cuerpo M-HASTE|LARGUERO|Cabezal porta/],
  ['F40', /Banda|Guía|Pletina|BAR CAP|Cama|nosebar|Nosebar|Rodillo|Grip Top/],
  ['F50', /Guarda|guarda|Ojal ciego/],
  ['F60', /Columna|Tira telescópica|Pata |Bracket|Soporte|pie |Pie /],
  ['F70', /Perno|Tuerca|Golilla|Chaveta|Clip|Oreja|Espárrago|Separador|Seeger|Rodamiento/],
];
const famDe = (n) => (FAMILIAS.find(([, rx]) => rx.test(n)) || ['F90'])[0];

// ítems del registro persistente (numeración única vigente)
const regDir = process.env.REGISTRO_DIR || '';
const itemDe = new Map();
if (regDir) for (const f of ['items_' + base + '.json']) {
  const p = join(regDir, f);
  if (existsSync(p)) for (const [d, n] of Object.entries(JSON.parse(readFileSync(p, 'utf8')).items)) itemDe.set(d, n);
}
const limpio = (n) => n.replace(/^(FAB|NORM|VIS|VENDOR)\s*·\s*/, '');
// el registro guarda la descripción tal como la escribe bom_equipo (que sólo
// quita FAB/NORM): se busca por las dos formas antes de rendirse
const itemBuscar = (n) => itemDe.get(limpio(n)) ?? itemDe.get(n.replace(/^(FAB|NORM)\s*·\s*/, ''));

// ── escritor STEP AP203 CON IDENTIDAD ANALÍTICA (PRD_MOTOR_BREP, O4) ───────
//
// Antes: se agrupaban triángulos por plano cuantizado. Una pieza con 195
// barrenos salía con 9.484 PLANE —48 planitos por agujero— y CERO curvas: el
// 100 % de las EDGE_CURVE llevaba `*` en vez de su geometría. Eso no es un
// agujero para el que abre el archivo: es un prisma de 48 lados, y el
// proveedor no puede tomarlo como referencia de taladro.
//
// Ahora se pregunta al REGISTRO (js/brep.mjs) qué es cada cara: el atributo
// `cara` viaja por triángulo desde el feature que la creó y sobrevive a las
// booleanas. Un cilindro sale CYLINDRICAL_SURFACE con su eje y su radio
// exactos, sus bordes salen CIRCLE, y las rectas salen LINE.
//
// DEGRADACIÓN SEGURA — regla de este archivo: toda cara analítica se emite
// sólo si se PRUEBA contra la malla (todos los vértices del lazo a distancia r
// del eje, misma cota axial, vuelta completa). Si la prueba falla, esa cara
// sale facetada como antes. El peor caso es el resultado de ayer, nunca peor.
function stepDe(geom, nombre, autor = 'ConveyOne SpA', reg = null, off = [0, 0, 0]) {
  // La malla llega TRASLADADA a su sitio en el ensamble; el registro guarda el
  // eje en coordenadas LOCALES de la pieza. Sin correr la ficha, la prueba del
  // cilindro falla siempre y todo cae a facetado (así salió la primera corrida).
  const fichaEn = (f) => !f ? null
    : f.tipo === 'cilindro' ? { ...f, at: [f.at[0] + off[0], f.at[1] + off[1], f.at[2] + off[2]] }
    : f;
  const g = geom.index ? geom.toNonIndexed() : geom;
  const pos = g.attributes.position;
  const nT = pos.count / 3;
  const V = (j) => [pos.getX(j), pos.getY(j), pos.getZ(j)];
  const kv = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)},${p[2].toFixed(3)}`;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cruz = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const norm = (a) => { const m = Math.hypot(...a) || 1; return [a[0]/m, a[1]/m, a[2]/m]; };
  const caraId = idsDe(g);                       // ficha por triángulo, o null

  // 1) agrupar triángulos: por FICHA del registro si la hay; si no, por plano
  //    cuantizado (vendor y astillas sin ficha siguen el camino de antes)
  const grupos = new Map();
  for (let t = 0; t < nT; t++) {
    const a = V(t * 3), b = V(t * 3 + 1), c = V(t * 3 + 2);
    const nn = cruz(sub(b, a), sub(c, a));
    const m = Math.hypot(...nn);
    if (m < 1e-9) continue;                      // astilla degenerada
    const n = [nn[0]/m, nn[1]/m, nn[2]/m];
    const fid = caraId ? caraId[t] : -1;
    const ficha = fid >= 0 ? fichaEn(fichaDe(reg, fid)) : null;
    const k = ficha ? 'F' + fid
      : `P${n.map(q => q.toFixed(3)).join(',')}|${dot(n, a).toFixed(2)}`;
    let gr = grupos.get(k);
    if (!gr) grupos.set(k, gr = { ficha, n, d: dot(n, a), tris: [] });
    gr.tris.push([a, b, c]);
  }

  // 2) lazos de borde de un grupo: aristas que aparecen UNA sola vez.
  //
  // El encadenado NO puede elegir «la primera libre» en un vértice donde
  // concurren varias aristas de borde (dos barrenos que se tocan, una ranura
  // que muerde el contorno). Elegir mal corta el lazo, y un lazo cortado deja
  // sus aristas usadas UNA vez: por eso el sólido no cerraba (41 % de aristas
  // compartidas por dos caras) y por eso los bordes de barreno salían en
  // trozos de menos de 8 puntos y no se reconocían como circunferencia.
  //
  // Regla correcta: en el vértice de llegada se toma la arista con el GIRO MÁS
  // CERRADO en el sentido del interior de la cara — la de siempre para recorrer
  // el borde de un grafo plano sin saltar de un contorno a otro.
  const lazosDe = (tris, nCara) => {
    const cuenta = new Map();
    for (const [a, b, c] of tris) {
      for (const [x, y] of [[a, b], [b, c], [c, a]]) {
        const ka = kv(x), kb = kv(y);
        const k = ka < kb ? ka + '>' + kb : kb + '>' + ka;
        const e = cuenta.get(k);
        if (e) e.n++; else cuenta.set(k, { n: 1, a: x, b: y });
      }
    }
    const bordes = [...cuenta.values()].filter(e => e.n === 1);
    if (!bordes.length) return [];
    const desde = new Map();
    for (const e of bordes) {
      const k = kv(e.a);
      if (!desde.has(k)) desde.set(k, []);
      desde.get(k).push(e);
    }
    // base del plano de la cara para medir ángulos
    const n = nCara && Math.hypot(...nCara) > 0.5 ? norm(nCara) : [0, 0, 1];
    const u = norm(Math.abs(n[0]) < 0.9 ? cruz(n, [1, 0, 0]) : cruz(n, [0, 1, 0]));
    const w = cruz(n, u);
    const ang2 = (d) => Math.atan2(dot(d, w), dot(d, u));
    const usada = new Set(), lazos = [];
    for (const e0 of bordes) {
      if (usada.has(e0)) continue;
      const lazo = [e0.a]; let cur = e0; usada.add(e0);
      for (let paso = 0; paso < 100000; paso++) {
        const cand = (desde.get(kv(cur.b)) || []).filter(e => !usada.has(e));
        if (!cand.length) break;
        let sig = cand[0];
        if (cand.length > 1) {
          // giro más cerrado a la derecha respecto de la dirección de llegada
          const aIn = ang2(sub(cur.b, cur.a));
          let mejor = Infinity;
          for (const e of cand) {
            let t = aIn - ang2(sub(e.b, e.a));
            while (t <= -Math.PI) t += 2 * Math.PI;
            while (t > Math.PI) t -= 2 * Math.PI;
            const giro = t <= 0 ? t + 2 * Math.PI : t;   // 0 = seguir recto
            if (giro < mejor) { mejor = giro; sig = e; }
          }
        }
        usada.add(sig); lazo.push(sig.a); cur = sig;
        if (kv(cur.b) === kv(e0.a)) break;
      }
      if (lazo.length >= 3) lazos.push(lazo);
    }
    return lazos;
  };

  // subdivisión por plano cuantizado (camino previo, hoy sólo como respaldo)
  const porPlano = (tris) => {
    const m = new Map();
    for (const [a, b, c] of tris) {
      const nn = cruz(sub(b, a), sub(c, a));
      const mg = Math.hypot(...nn);
      if (mg < 1e-9) continue;
      const n = [nn[0]/mg, nn[1]/mg, nn[2]/mg];
      const k = `${n.map(q => q.toFixed(3)).join(',')}|${dot(n, a).toFixed(2)}`;
      let g2 = m.get(k);
      if (!g2) m.set(k, g2 = { n, tris: [] });
      g2.tris.push([a, b, c]);
    }
    return [...m.values()];
  };

  // 3) ¿este lazo es una CIRCUNFERENCIA completa sobre el cilindro de la ficha?
  //    Se exige: todo vértice a distancia r del eje, misma cota axial, y la
  //    vuelta cerrada sin huecos. Devuelve el centro y el sentido de giro.
  const TOL_R = 0.02, TOL_S = 0.02;              // mm
  const rechazo = { pocos: 0, radio: 0, axial: 0, hueco: 0, lazos: 0 };
  const circuloDe = (lazo, at, dir, r) => {
    if (lazo.length < 8) { rechazo.pocos++; return null; }
    let sMin = Infinity, sMax = -Infinity;
    for (const p of lazo) {
      const v = sub(p, at);
      const s = dot(v, dir);
      const rad = Math.hypot(v[0]-s*dir[0], v[1]-s*dir[1], v[2]-s*dir[2]);
      if (Math.abs(rad - r) > TOL_R) { rechazo.radio++; return null; }
      if (s < sMin) sMin = s; if (s > sMax) sMax = s;
    }
    if (sMax - sMin > TOL_S) { rechazo.axial++; return null; }   // borde no plano
    const s = (sMin + sMax) / 2;
    const centro = [at[0]+dir[0]*s, at[1]+dir[1]*s, at[2]+dir[2]*s];
    // referencia angular y verificación de vuelta COMPLETA
    const u = norm(Math.abs(dir[0]) < 0.9 ? cruz(dir, [1,0,0]) : cruz(dir, [0,1,0]));
    const w = cruz(dir, u);
    const ang = lazo.map(p => { const v = sub(p, centro); return Math.atan2(dot(v, w), dot(v, u)); });
    const ord = [...ang].sort((x, y) => x - y);
    let hueco = ord[0] + 2*Math.PI - ord[ord.length-1];
    for (let i = 1; i < ord.length; i++) hueco = Math.max(hueco, ord[i] - ord[i-1]);
    if (hueco > 4 * Math.PI / lazo.length) { rechazo.hueco++; return null; }  // arco parcial
    // sentido de recorrido del lazo alrededor del eje
    let giro = 0;
    for (let i = 0; i < ang.length; i++) {
      let da = ang[(i+1) % ang.length] - ang[i];
      while (da > Math.PI) da -= 2*Math.PI;
      while (da < -Math.PI) da += 2*Math.PI;
      giro += da;
    }
    return { centro, u, ccw: giro > 0 };
  };

  // 4) emisión
  const L = []; let id = 0;
  const N = () => '#' + (++id);
  const P = new Map();
  const punto = (p) => { const k = kv(p); let r = P.get(k);
    if (!r) { r = N(); L.push(`${r}=CARTESIAN_POINT('',(${p.map(q => q.toFixed(4)).join(',')}));`); P.set(k, r); } return r; };
  const VX = new Map();
  const vert = (p) => { const q = punto(p); let v = VX.get(q); if (!v) { v = N(); L.push(`${v}=VERTEX_POINT('',${q});`); VX.set(q, v); } return v; };
  const dirRef = (d) => { const q = N(); L.push(`${q}=DIRECTION('',(${d.map(x => x.toFixed(6)).join(',')}));`); return q; };
  const ejeRef = (o, d, u) => { const q = N(); L.push(`${q}=AXIS2_PLACEMENT_3D('',${punto(o)},${dirRef(d)},${dirRef(u)});`); return q; };

  // Aristas compartidas: se guarda el SENTIDO con que se creó la curva, para
  // que la segunda cara que la usa la oriente con .F. y no al revés. Con `*`
  // esto daba igual; con LINE y CIRCLE reales, no.
  const EG = new Map();
  const usoAristas = new Map();                  // para la compuerta de manifold
  const marcarUso = (ref) => usoAristas.set(ref, (usoAristas.get(ref) || 0) + 1);
  const aristaRecta = (a, b) => {
    const ka = kv(a), kb = kv(b);
    const k = ka < kb ? ka + '>' + kb : kb + '>' + ka;
    let e = EG.get(k);
    if (!e) {
      const d = sub(b, a); const len = Math.hypot(...d);
      if (len < 1e-9) return null;
      const vec = N(); L.push(`${vec}=VECTOR('',${dirRef(d.map(q => q/len))},${len.toFixed(6)});`);
      const ln = N(); L.push(`${ln}=LINE('',${punto(a)},${vec});`);
      const ref = N(); L.push(`${ref}=EDGE_CURVE('',${vert(a)},${vert(b)},${ln},.T.);`);
      e = { ref, a: ka };                        // `a` = extremo desde el que se creó
      EG.set(k, e);
    }
    marcarUso(e.ref);
    return { ref: e.ref, mismo: e.a === ka };
  };
  // Circunferencia completa como DOS semicircunferencias sobre la MISMA CIRCLE
  // (forma que aceptan todos los lectores; una arista cerrada de un solo tramo
  // la rechazan varios kernels).
  const aristasCirculo = (centro, dir, u, r, ccw) => {
    const k = `C${kv(centro)}|${dir.map(q=>q.toFixed(4))}|${r.toFixed(3)}`;
    let c = EG.get(k);
    if (!c) {
      const cir = N(); L.push(`${cir}=CIRCLE('',${ejeRef(centro, dir, u)},${r.toFixed(6)});`);
      const w = cruz(dir, u);
      const p0 = [centro[0]+u[0]*r, centro[1]+u[1]*r, centro[2]+u[2]*r];
      const p1 = [centro[0]-u[0]*r, centro[1]-u[1]*r, centro[2]-u[2]*r];
      const v0 = vert(p0), v1 = vert(p1);
      const e0 = N(); L.push(`${e0}=EDGE_CURVE('',${v0},${v1},${cir},.T.);`);
      const e1 = N(); L.push(`${e1}=EDGE_CURVE('',${v1},${v0},${cir},.T.);`);
      c = { ref: [e0, e1] };
      EG.set(k, c);
      void w;
    }
    marcarUso(c.ref[0]); marcarUso(c.ref[1]);
    return ccw ? [[c.ref[0], '.T.'], [c.ref[1], '.T.']]
               : [[c.ref[1], '.F.'], [c.ref[0], '.F.']];
  };
  const lazoRef = (orientadas) => {
    const or = orientadas.map(([e, s]) => { const o = N(); L.push(`${o}=ORIENTED_EDGE('',*,*,${e},${s});`); return o; });
    const lz = N(); L.push(`${lz}=EDGE_LOOP('',(${or.join(',')}));`);
    return lz;
  };
  const limite = (lz, externo) => { const q = N();
    L.push(`${q}=${externo ? 'FACE_OUTER_BOUND' : 'FACE_BOUND'}('',${lz},.T.);`); return q; };

  const superficies = [];
  let nCil = 0, nPlano = 0, nFacetada = 0;

  // área proyectada de un lazo (distingue contorno de agujeros)
  const areaLazo = (lz, n) => {
    const e = n.map(Math.abs); const ejeMax = e.indexOf(Math.max(...e));
    const uv = (p) => ejeMax === 0 ? [p[1], p[2]] : ejeMax === 1 ? [p[0], p[2]] : [p[0], p[1]];
    let s2 = 0;
    for (let i = 0; i < lz.length; i++) {
      const [x1, y1] = uv(lz[i]), [x2, y2] = uv(lz[(i + 1) % lz.length]);
      s2 += x1 * y2 - x2 * y1;
    }
    return Math.abs(s2) / 2;
  };

  // Fusión de tramos COLINEALES: el contorno recto de una placa venía partido
  // en cientos de segmentos por los vértices que dejan las booleanas. Se quita
  // un vértice sólo si su desviación respecto de la cuerda es < 1 µm — la
  // geometría no se mueve, se deja de trocear lo que ya era una recta.
  const TOL_COL = 1e-3;                          // mm de flecha admitida
  const fusiona = (lz) => {
    if (lz.length < 4) return lz;
    const out = [];
    for (let i = 0; i < lz.length; i++) {
      const a = out.length ? out[out.length - 1] : lz[(i - 1 + lz.length) % lz.length];
      const b = lz[i], c = lz[(i + 1) % lz.length];
      const ab = sub(b, a), ac = sub(c, a);
      const lac = Math.hypot(...ac);
      if (lac > 1e-9) {
        const cr = cruz(ab, ac);
        if (Math.hypot(...cr) / lac < TOL_COL) continue;   // b está sobre a→c
      }
      out.push(b);
    }
    return out.length >= 3 ? out : lz;
  };

  // cara PLANA facetada/analítica: mismo trazado de siempre, ahora con LINE
  const emitePlano = (lazosCrudos, n, ref) => {
    const lazos = lazosCrudos.map(fusiona);
    const lims = lazos.map((lz, i) => {
      const or = [];
      for (let k = 0; k < lz.length; k++) {
        const e = aristaRecta(lz[k], lz[(k + 1) % lz.length]);
        if (e) or.push([e.ref, e.mismo ? '.T.' : '.F.']);
      }
      if (!or.length) return null;
      return limite(lazoRef(or), i === 0);
    }).filter(Boolean);
    if (!lims.length) return;
    const a0 = lazos[0][0], a1 = lazos[0][1];
    const u = norm(sub(a1, a0));
    const pl = N(); L.push(`${pl}=PLANE('',${ejeRef(ref, n, u)});`);
    const fa = N(); L.push(`${fa}=ADVANCED_FACE('',(${lims.join(',')}),${pl},.T.);`);
    superficies.push(fa);
  };

  for (const gr of grupos.values()) {
    const lazos = lazosDe(gr.tris, gr.ficha && gr.ficha.tipo === 'cilindro' ? gr.ficha.dir : gr.n);
    if (!lazos.length) continue;
    const f = gr.ficha;

    // ── CILINDRO: se intenta la cara analítica; si no se prueba, va facetada
    if (f && f.tipo === 'cilindro') {
      const cs = lazos.map(lz => circuloDe(lz, f.at, f.dir, f.r));
      if (cs.length < 2 || !cs.every(Boolean)) rechazo.lazos++;
      if (cs.length >= 2 && cs.every(Boolean)) {
        // orientación de la cara: ¿la normal de la malla apunta hacia afuera
        // del eje (eje/muñón) o hacia adentro (barreno)?
        const [a, b, c] = gr.tris[0];
        const cen = [(a[0]+b[0]+c[0])/3, (a[1]+b[1]+c[1])/3, (a[2]+b[2]+c[2])/3];
        const v = sub(cen, f.at);
        const s = dot(v, f.dir);
        const radial = norm([v[0]-s*f.dir[0], v[1]-s*f.dir[1], v[2]-s*f.dir[2]]);
        const nm = norm(cruz(sub(b, a), sub(c, a)));
        const haciaAfuera = dot(nm, radial) > 0;
        const lims = lazos.map((lz, i) =>
          limite(lazoRef(aristasCirculo(cs[i].centro, f.dir, cs[i].u, f.r, cs[i].ccw)), i === 0));
        const sup = N(); L.push(`${sup}=CYLINDRICAL_SURFACE('',${ejeRef(cs[0].centro, f.dir, cs[0].u)},${f.r.toFixed(6)});`);
        const fa = N(); L.push(`${fa}=ADVANCED_FACE('',(${lims.join(',')}),${sup},${haciaAfuera ? '.T.' : '.F.'});`);
        superficies.push(fa);
        nCil++;
        continue;
      }
      // No se pudo probar. Se vuelve al camino de antes: subdividir ESTE grupo
      // por plano cuantizado y emitir cada trozo como cara plana. Tratar el
      // cilindro entero como un plano —sus dos bordes como lazos de una cara—
      // es geometría falsa y rompe la variedad del sólido.
      nFacetada++;
      for (const sg of porPlano(gr.tris)) {
        const lz = lazosDe(sg.tris, sg.n);
        if (!lz.length) continue;
        lz.sort((x, y) => areaLazo(y, sg.n) - areaLazo(x, sg.n));
        emitePlano(lz, sg.n, lz[0][0]);
        nPlano++;
      }
      continue;
    }

    lazos.sort((x, y) => areaLazo(y, gr.n) - areaLazo(x, gr.n));
    emitePlano(lazos, f && f.tipo === 'plano' ? f.n : gr.n, lazos[0][0]);
    nPlano++;
  }

  // COMPUERTA de variedad (manifold): en un sólido cerrado cada arista es
  // compartida por EXACTAMENTE dos caras. Si no, el sólido no cierra y el CAD
  // del proveedor lo abre como superficies sueltas — defecto que sólo se
  // descubre al otro lado. Se reporta; no se oculta.
  const malas = [...usoAristas.values()].filter(v => v !== 2).length;

  const shell = N(); L.push(`${shell}=CLOSED_SHELL('',(${superficies.join(',')}));`);
  const brep = N(); L.push(`${brep}=MANIFOLD_SOLID_BREP('${nombre}',${shell});`);
  const ax0 = ejeRef([0, 0, 0], [0, 0, 1], [1, 0, 0]);
  const uMM = N(); L.push(`${uMM}=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );`);
  const uRAD = N(); L.push(`${uRAD}=( NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.) );`);
  const uSR = N(); L.push(`${uSR}=( NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT() );`);
  const inc = N(); L.push(`${inc}=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.01),${uMM},'distance_accuracy_value','');`);
  const ctx = N(); L.push(`${ctx}=( GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${inc})) GLOBAL_UNIT_ASSIGNED_CONTEXT((${uMM},${uRAD},${uSR})) REPRESENTATION_CONTEXT('','3D') );`);
  const rep = N(); L.push(`${rep}=ADVANCED_BREP_SHAPE_REPRESENTATION('${nombre}',(${ax0},${brep}),${ctx});`);
  const txt = ['ISO-10303-21;', 'HEADER;', `FILE_DESCRIPTION(('${nombre}'),'2;1');`,
    `FILE_NAME('${nombre}','2026-08-19T00:00:00',('${autor}'),('${autor}'),'ConveyOne CAD','step_export.mjs','');`,
    "FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));", 'ENDSEC;', 'DATA;'].concat(L, 'ENDSEC;', 'END-ISO-10303-21;', '').join('\n');
  return { txt, cil: nCil, plano: nPlano, facetadas: nFacetada, aristasMalas: malas, rechazo };
}

const GEOM = await geometriasDelDoc(doc);
let n = 0, saltadas = 0, totCil = 0, totPlano = 0;
const anomalias = [], fallos = [];
const vendor = [], comprados = [], sinItem = [];
const indice = [];
for (const p of doc.parts) {
  // PIEZAS VENDOR: su STEP lo entrega el fabricante (regla 22 — no
  // redistribuimos su original teselado; 13 MB por pieza y no es nuestro)
  if (p.glb) { vendor.push(limpio(p.name)); continue; }
  // COMPRADOS (NORM ·): el STEP lo entrega el proveedor con su artículo —
  // ni lo dibujamos ni lo redistribuimos (los rodillos de la banda Movex
  // pesaban 19 MB de facetas que no son nuestras)
  if (/^NORM\s*·/.test(p.name)) { comprados.push(limpio(p.name)); continue; }
  const nom = limpio(p.name);
  const fam = famDe(p.name);
  const item = itemBuscar(p.name);
  // SIN ÍTEM = SIN STEP (23-08). El código del STEP es TIPO·FAMILIA·ÍTEM y el
  // ítem sale del registro persistente; una pieza que no está en el registro no
  // es un artículo — emitir `XXX` fabricaba un código que no identifica nada y
  // que viaja SOLO al proveedor (el STEP es el único artefacto que sale sin el
  // resto del paquete). Se reporta como anomalía, igual que F90 vacío.
  // Lo destapó `CV-LBP18-F40-XXX` = «Goma Grip Top», que ni siquiera es pieza:
  // viene vulcanizada en la banda Movex — el mismo fantasma que ya había cazado
  // el refutador de COMPRAS y que seguía teniendo archivo propio de 3D.
  if (!item) { sinItem.push(limpio(p.name)); continue; }
  const cod = `${TIPO}-${fam}-${String(item).padStart(3, '0')}`;
  if (indice.some(i => i.codigo === cod)) continue;             // un artículo, un STEP
  try {
    let g = GEOM.get(p.id), off = [0, 0, 0];
    if (!g) {
      off = p.pos || [0, 0, 0];
      g = partGeometry(p, {}).clone().translate(off[0], off[1], off[2]);
    }
    const R = stepDe(g, cod + ' — ' + nom.slice(0, 60), 'ConveyOne SpA', p._brep, off);
    const txt = R.txt;
    // COMPUERTA step-integro: un STEP con referencias colgando no abre en el
    // CAD del proveedor — y el defecto sólo se descubre al otro lado
    const ids = new Set((txt.match(/^#\d+=/gm) || []).map(x => x.slice(0, -1)));
    const colgando = [...new Set(txt.match(/#\d+/g) || [])].filter(r => !ids.has(r));
    if (colgando.length) throw new Error(`STEP con ${colgando.length} referencias colgando`);
    // COMPUERTA step-variedad: en un sólido cerrado cada arista pertenece a
    // EXACTAMENTE dos caras. Si no, el sólido no cierra.
    if (R.aristasMalas) anomalias.push(`${cod}: ${R.aristasMalas} arista(s) no compartidas por 2 caras`);
    if (R.facetadas) anomalias.push(`${cod}: ${R.facetadas} cara(s) cilíndricas sin probar → facetadas · motivos ${JSON.stringify(R.rechazo)}`);
    writeFileSync(join(outDir, cod + '.step'), txt);
    indice.push({ codigo: cod, familia: fam, item: item ?? null, pieza: nom,
      kb: Math.round(txt.length / 1024), caras_cilindro: R.cil, caras_plano: R.plano });
    totCil += R.cil; totPlano += R.plano;
    n++;
  } catch (e) { saltadas++; fallos.push(`${cod}: ${e.message}`); }
}
writeFileSync(join(outDir, `_indice_step_${base}.json`), JSON.stringify({ tipo: TIPO, doc: base, piezas: indice,
  sin_step_propio: {
    nota: 'STEP a cargo de quien fabrica la pieza: originales M-HASTE y artículos comprados (Movex, chumaceras, sprockets) los entrega su proveedor con el artículo',
    vendor, comprados, sin_item: sinItem } }, null, 1));
console.log(`OK ${n} STEP AP203 en ${outDir}${saltadas ? ` · ${saltadas} sin geometría` : ''}${vendor.length ? ` · ${vendor.length} vendor` : ''}${comprados.length ? ` · ${comprados.length} comprados (STEP del proveedor)` : ''} — nomenclatura ${TIPO}-Fnn-ítem`);
console.log(`  caras analíticas: ${totCil} CYLINDRICAL_SURFACE · ${totPlano} PLANE`);
if (sinItem.length) console.log(`  AVISO — ${sinItem.length} pieza(s) SIN ítem en el registro, no se emitió STEP: ${sinItem.join(' · ')}`);
for (const a of anomalias) console.log(`  ANOMALÍA — ${a}`);
for (const f of fallos) console.log(`  FALLO — ${f}`);
