// Pruebas del croquizador 2D: recorte, alargado, encadenado, cotas y lápiz.
import {
  makeLine, makeCircle, makeArc, entityPoints, intersectEntities,
  trimEntity, extendLine, chainLoops, makeDim, measureDim, applyDim,
  fitStroke, dist, snapPoints, tangentPoints, regions, loopKey,
  moveEntity, applyLockedDims, makeArcCSE, regularPolygon, offsetEntity, filletLines,
  entityInRect, copyEntities, mirrorEntities,
  makeConstraint, solveSketch, constraintResidual, slotEntities,
} from '../js/sketch2d.js';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${detail}`); }
};
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

console.log('— Intersecciones —');
{
  const l1 = makeLine([0, 0], [10, 0]), l2 = makeLine([5, -5], [5, 5]);
  const p = intersectEntities(l1, l2);
  check('línea-línea', p.length === 1 && near(p[0][0], 5) && near(p[0][1], 0));
  const c = makeCircle([0, 0], 5);
  const p2 = intersectEntities(makeLine([-10, 0], [10, 0]), c);
  check('línea-círculo 2 puntos', p2.length === 2);
  const p3 = intersectEntities(c, makeCircle([8, 0], 5));
  check('círculo-círculo 2 puntos', p3.length === 2);
}

console.log('— Recortar —');
{
  // línea horizontal cruzada por vertical: clic a la izquierda del cruce
  const target = makeLine([0, 0], [20, 0]);
  const cutter = makeLine([12, -5], [12, 5]);
  const out = trimEntity(target, [3, 0], [cutter]);
  check('trim línea: queda el tramo derecho', out.length === 1 && near(out[0].a[0], 12) && near(out[0].b[0], 20), JSON.stringify(out));
}
{
  // clic en el centro de una línea cortada por dos verticales: quedan las puntas
  const target = makeLine([0, 0], [30, 0]);
  const cut1 = makeLine([10, -5], [10, 5]), cut2 = makeLine([20, -5], [20, 5]);
  const out = trimEntity(target, [15, 0], [cut1, cut2]);
  check('trim tramo central: quedan 2 puntas', out.length === 2);
}
{
  // recortar la mitad superior de un círculo cortado por una línea horizontal
  const c = makeCircle([0, 0], 10);
  const cutter = makeLine([-20, 0], [20, 0]);
  const out = trimEntity(c, [0, 10], [cutter]);
  check('trim círculo → 1 arco inferior', out.length === 1 && out[0].type === 'arc');
  const pts = entityPoints(out[0], 48);
  check('el arco restante está abajo', pts.every(p => p[1] < 1e-6), JSON.stringify(pts.slice(0, 2)));
}
{
  // trim sin intersecciones = borrar
  const out = trimEntity(makeLine([0, 0], [5, 5]), [2, 2], []);
  check('trim sin cortes elimina la entidad', out.length === 0);
}

console.log('— Alargar —');
{
  const e = makeLine([0, 0], [5, 0]);
  const wall = makeLine([12, -10], [12, 10]);
  const ok = extendLine(e, [5, 0], [wall]);
  check('alargar hasta la pared', ok && near(e.b[0], 12), JSON.stringify(e.b));
  const e2 = makeLine([0, 0], [5, 0]);
  check('alargar sin objetivo devuelve false', !extendLine(e2, [5, 0], []));
}

console.log('— Encadenado de contornos —');
{
  // cuadrado con líneas desordenadas y volteadas + círculo interior = agujero
  const ents = [
    makeLine([40, 0], [40, 30]),
    makeLine([0, 0], [40, 0]),
    makeLine([0, 30], [0, 0]),
    makeLine([40, 30], [0, 30]),
    makeCircle([20, 15], 5),
  ];
  const { outer, holes, openCount } = chainLoops(ents);
  check('contorno exterior detectado', !!outer && outer.length >= 4);
  check('círculo interior como agujero', holes.length === 1);
  check('sin cadenas abiertas', openCount === 0);
}
{
  // cadena abierta no forma contorno
  const { outer, openCount } = chainLoops([makeLine([0, 0], [10, 0]), makeLine([10, 0], [10, 10])]);
  check('cadena abierta: sin contorno', outer === null && openCount === 1);
}
{
  // semicírculo: línea + arco
  const arc = makeArc([0, 0], 10, 0, Math.PI);
  const base = makeLine([-10, 0], [10, 0]);
  const { outer } = chainLoops([arc, base]);
  check('línea+arco cierran contorno', !!outer && outer.length > 10);
}

console.log('— Cotas —');
{
  const ents = [
    makeLine([0, 0], [30, 0]),
    makeLine([30, 0], [30, 20]),
    makeLine([30, 20], [0, 20]),
    makeLine([0, 20], [0, 0]),
  ];
  const dLen = makeDim('len', { id: ents[0].id }, null, 30, [15, -3]);
  check('medir largo', near(measureDim(ents, dLen), 30));
  applyDim(ents, dLen, 42);
  check('cota de largo mueve el extremo', near(ents[0].b[0], 42), JSON.stringify(ents[0].b));
  check('el vecino sigue conectado (contorno cerrado)', near(ents[1].a[0], 42), JSON.stringify(ents[1].a));

  const dDist = makeDim('dist', { id: ents[0].id }, { id: ents[2].id }, 20, [15, 10]);
  check('medir distancia entre paralelas', near(measureDim(ents, dDist), 20));
  applyDim(ents, dDist, 26);
  check('cota de distancia traslada la línea', near(ents[2].a[1], 26) && near(ents[2].b[1], 26));

  const c = makeCircle([10, 10], 4);
  ents.push(c);
  const dDia = makeDim('dia', { id: c.id }, null, 8, [10, 10]);
  applyDim(ents, dDia, 12);
  check('cota de diámetro', near(c.r, 6));
}
{
  // ángulo entre dos líneas que comparten vértice
  const l1 = makeLine([0, 0], [20, 0]);
  const l2 = makeLine([0, 0], [20, 20]); // 45°
  const ents = [l1, l2];
  const dAng = makeDim('ang', { id: l1.id }, { id: l2.id }, 45, [10, 5]);
  check('medir ángulo 45°', near(measureDim(ents, dAng), 45, 1e-3));
  applyDim(ents, dAng, 30);
  check('cota de ángulo rota la línea', near(measureDim(ents, dAng), 30, 1e-3), `=${measureDim(ents, dAng)}`);
}
{
  // cota contra línea de REFERENCIA proyectada (congelada): se mueve la del boceto
  const l = makeLine([0, 5], [30, 5]);
  const ents = [l];
  const dim = makeDim('dist', { ref: [[0, 0], [30, 0]] }, { id: l.id }, 5, [15, 2]);
  check('medir distancia a referencia', near(measureDim(ents, dim), 5));
  applyDim(ents, dim, 12);
  check('cota a referencia mueve la línea del boceto', near(l.a[1], 12) && near(l.b[1], 12), JSON.stringify(l));
}

console.log('— Modo lápiz (reconocimiento de trazos) —');
{
  // círculo a mano alzada con ruido
  const raw = [];
  for (let i = 0; i <= 60; i++) {
    const a = i * Math.PI * 2 / 60;
    raw.push([20 + 10 * Math.cos(a) + (Math.sin(i * 7) * 0.7), 15 + 10 * Math.sin(a) + (Math.cos(i * 5) * 0.7)]);
  }
  const fit = fitStroke(raw);
  check('trazo circular → círculo', fit?.type === 'circle' && Math.abs(fit.r - 10) < 1, JSON.stringify(fit));
}
{
  // trazo casi recto y casi horizontal → línea ajustada a horizontal
  const raw = [];
  for (let i = 0; i <= 30; i++) raw.push([i * 2, 0.5 * Math.sin(i / 4) + i * 0.02]);
  const fit = fitStroke(raw);
  check('trazo recto → línea', fit?.type === 'line', JSON.stringify(fit));
  check('ajuste a horizontal', fit && near(fit.a[1], fit.b[1]), JSON.stringify(fit));
}
{
  // trazo en L → polilínea de 3 puntos
  const raw = [];
  for (let i = 0; i <= 20; i++) raw.push([i, 0.2 * Math.sin(i)]);
  for (let i = 0; i <= 20; i++) raw.push([20, i]);
  const fit = fitStroke(raw);
  check('trazo en L → polilínea de 3 vértices', fit?.type === 'poly' && fit.pts.length === 3, JSON.stringify(fit?.pts));
}
{
  // trazo rectangular cerrado (40×24 con ruido) → rectángulo alineado a ejes
  const raw = [];
  const jit = (i) => 0.6 * Math.sin(i * 1.3);
  for (let i = 0; i <= 40; i++) raw.push([i, jit(i)]);            // borde inferior
  for (let i = 0; i <= 24; i++) raw.push([40 + jit(i), i]);       // derecho
  for (let i = 40; i >= 0; i--) raw.push([i, 24 + jit(i)]);       // superior
  for (let i = 24; i >= 0; i--) raw.push([jit(i), i]);            // izquierdo
  const fit = fitStroke(raw);
  check('trazo rectangular → rectángulo', fit?.type === 'rect', JSON.stringify(fit));
  check('rectángulo ~40×24', fit?.type === 'rect' && Math.abs((fit.b[0] - fit.a[0]) - 40) < 2 && Math.abs((fit.b[1] - fit.a[1]) - 24) < 2, JSON.stringify(fit));
}

console.log('— Puntos notables y tangencias —');
{
  const l = makeLine([0, 0], [10, 0]);
  const sp = snapPoints(l);
  check('línea: extremos + punto medio', sp.length === 3 && sp.some(p => p.kind === 'medio' && near(p.p[0], 5)));
  const c = makeCircle([10, 10], 5);
  const sc = snapPoints(c);
  check('círculo: centro + 4 cuadrantes', sc.length === 5 && sc.filter(p => p.kind === 'cuadrante').length === 4
    && sc.some(p => p.kind === 'centro' && near(p.p[0], 10) && near(p.p[1], 10)));
  const tps = tangentPoints([0, 0], 10, [20, 0]);
  check('tangencias desde punto externo', tps.length === 2 && tps.every(p => near(p[0], 5, 1e-6) && near(Math.abs(p[1]), Math.sqrt(75), 1e-6)));
  check('sin tangencia desde adentro', tangentPoints([0, 0], 10, [3, 3]).length === 0);
}

console.log('— Regiones por paridad y selección de perfiles —');
{
  // placa con agujero y una ISLA dentro del agujero (paridad: isla = sólido)
  const sq = (x0, y0, x1, y1) => [
    makeLine([x0, y0], [x1, y0]), makeLine([x1, y0], [x1, y1]),
    makeLine([x1, y1], [x0, y1]), makeLine([x0, y1], [x0, y0]),
  ];
  const ents = [...sq(0, 0, 60, 60), makeCircle([30, 30], 20), makeCircle([30, 30], 6)];
  const { regions: regs, loops } = regions(ents, []);
  check('3 contornos detectados', loops.length === 3);
  check('2 regiones: placa-con-agujero + isla', regs.length === 2, `regs=${regs.length}`);
  const island = regs.find(r => r.holes.length === 0 && Math.abs(r.outer[0][0] - 30) < 40 && r.outer.length > 10);
  check('la isla no tiene agujeros', !!island);

  // excluir la isla por su clave
  const islandKey = loopKey(entityPoints(makeCircle([30, 30], 6), 48).slice(0, -1));
  const r2 = regions(ents, [islandKey]);
  check('isla excluida → 1 región', r2.regions.length === 1 && r2.regions[0].holes.length === 1, `regs=${r2.regions.length}`);
}

console.log('— Geometría de construcción (no forma perfiles) —');
{
  const sq = [
    makeLine([0, 0], [40, 0]), makeLine([40, 0], [40, 40]),
    makeLine([40, 40], [0, 40]), makeLine([0, 40], [0, 0]),
  ];
  // una línea de centro que cruza el cuadrado y un círculo de construcción interior
  const axis = makeLine([-10, 20], [50, 20]); axis.construction = true;
  const cc = makeCircle([20, 20], 8); cc.construction = true;
  const r = regions([...sq, axis, cc], []);
  check('construcción ignorada → 1 región sin agujeros', r.regions.length === 1 && r.regions[0].holes.length === 0, `regs=${r.regions.length} holes=${r.regions[0]?.holes.length}`);
  check('construcción no cuenta como contorno', r.loops.length === 1, `loops=${r.loops.length}`);
  // sin la marca, el círculo SÍ sería un agujero
  const cc2 = makeCircle([20, 20], 8);
  const r3 = regions([...sq, cc2], []);
  check('mismo círculo sin marca → agujero', r3.regions.length === 1 && r3.regions[0].holes.length === 1);
}

console.log('— Mover con cotas fijas (candado) —');
{
  const ents = [
    makeLine([0, 0], [30, 0]), makeLine([30, 0], [30, 20]),
    makeLine([30, 20], [0, 20]), makeLine([0, 20], [0, 0]),
  ];
  const dLen = makeDim('len', { id: ents[0].id }, null, 30, [15, -3]);
  dLen.locked = true;
  const dims = [dLen];
  // mover la línea derecha estira la base (queda de 40)
  moveEntity(ents, ents[1], [10, 0]);
  check('mover estira la vecina', near(dist(ents[0].a, ents[0].b), 40), `=${dist(ents[0].a, ents[0].b)}`);
  // la cota con candado la devuelve a 30
  applyLockedDims(ents, dims);
  check('cota 🔒 restringe tras mover', near(dist(ents[0].a, ents[0].b), 30), `=${dist(ents[0].a, ents[0].b)}`);
}

console.log('— Arco, polígono, offset y empalme —');
{
  const arc = makeArcCSE([0, 0], [10, 0], [0, 10]);
  check('arco centro-inicio-fin', arc.type === 'arc' && near(arc.r, 10));
  const hexa = regularPolygon([0, 0], [10, 0], 6);
  check('hexágono: 6 lados de largo igual', hexa.length === 6 && near(dist(hexa[0].a, hexa[0].b), 10, 1e-6));
  const { outer } = chainLoops(hexa);
  check('el polígono cierra contorno', !!outer);

  const off = offsetEntity(makeLine([0, 0], [10, 0]), 3, [5, 5]);
  check('offset de línea hacia el lado tocado', near(off.a[1], 3) && near(off.b[1], 3));
  const offC = offsetEntity(makeCircle([0, 0], 10), 2, [20, 0]);
  check('offset de círculo hacia afuera', near(offC.r, 12));
  const offC2 = offsetEntity(makeCircle([0, 0], 10), 2, [0, 0]);
  check('offset de círculo hacia adentro', near(offC2.r, 8));
}
{
  // empalme r=5 en esquina a 90°: tangencias a 5 mm del vértice
  const l1 = makeLine([0, 0], [20, 0]);
  const l2 = makeLine([0, 0], [0, 20]);
  const ents = [l1, l2];
  const ok = filletLines(ents, l1, l2, 5);
  check('empalme aplicado', ok && ents.length === 3 && ents[2].type === 'arc');
  check('líneas recortadas a la tangencia', near(l1.a[0], 5) && near(l2.a[1], 5), JSON.stringify([l1.a, l2.a]));
  check('radio del arco = 5 y centro en (5,5)', near(ents[2].r, 5) && near(ents[2].c[0], 5) && near(ents[2].c[1], 5));
  // el contorno line+arc+line cierra con el resto de un cuadrado
  const rest = [makeLine([20, 0], [20, 20]), makeLine([20, 20], [0, 20])];
  const { outer } = chainLoops([...ents, ...rest]);
  check('cuadrado con esquina redondeada cierra', !!outer && outer.length > 6);
}

console.log('— Selección por ventana (AutoCAD) y copia —');
{
  const inside = makeLine([2, 2], [8, 8]);       // dentro del rect (0,0)-(10,10)
  const crossing = makeLine([5, 5], [15, 5]);     // lo cruza
  const outside = makeCircle([30, 30], 3);        // fuera
  check('window: contenida sí', entityInRect(inside, [0, 0], [10, 10], 'window'));
  check('window: la que cruza NO', !entityInRect(crossing, [0, 0], [10, 10], 'window'));
  check('crossing: contenida sí', entityInRect(inside, [0, 0], [10, 10], 'crossing'));
  check('crossing: la que cruza SÍ', entityInRect(crossing, [0, 0], [10, 10], 'crossing'));
  check('fuera: ninguna modalidad', !entityInRect(outside, [0, 0], [10, 10], 'crossing'));
  // círculo que rodea al rect (sin puntos dentro): crossing por intersección de bordes... no corta → fuera
  const ring = makeCircle([5, 5], 40);
  check('círculo que envuelve sin tocar: crossing no', !entityInRect(ring, [0, 0], [10, 10], 'crossing'));

  const copies = copyEntities([inside, outside], [100, 50]);
  check('copia: ids nuevos y delta exacto', copies.length === 2 && copies[0].id !== inside.id
    && near(copies[0].a[0], 102) && near(copies[0].a[1], 52) && near(copies[1].c[0], 130));
}

console.log('— Espejo —');
{
  const src = [makeLine([5, 0], [15, 0]), makeCircle([10, 5], 2)];
  const out = mirrorEntities(src, [0, 10], [20, 10]); // espejo sobre y=10
  check('espejo de línea', near(out[0].a[1], 20) && near(out[0].b[1], 20), JSON.stringify(out[0]));
  check('espejo de círculo', near(out[1].c[1], 15) && near(out[1].c[0], 10));
  const arc = makeArc([0, 0], 10, 0, Math.PI / 2); // primer cuadrante
  const [marc] = mirrorEntities([arc], [-5, 0], [5, 0]); // espejo sobre y=0
  const pts = entityPoints(marc, 24);
  check('espejo de arco queda bajo el eje', pts.every(p => p[1] < 1e-6), JSON.stringify(pts.slice(0, 2)));
}

console.log('— Restricciones geométricas (solver) —');
{
  // cuadrilátero tosco → H abajo, V izquierda, ∥ arriba/abajo, ∥ der/izq
  const l1 = makeLine([0, 0], [100, 4]), l2 = makeLine([100, 4], [96, 60]);
  const l3 = makeLine([96, 60], [3, 58]), l4 = makeLine([3, 58], [0, 0]);
  const ents = [l1, l2, l3, l4];
  const cons = [makeConstraint('horizontal', l1.id), makeConstraint('vertical', l4.id),
    makeConstraint('parallel', l3.id, l1.id), makeConstraint('parallel', l2.id, l4.id)];
  solveSketch(ents, cons, [], 200);
  check('solver: todas las restricciones satisfechas',
    cons.every(c => constraintResidual(ents, c) < 0.01));
  check('solver: cadena sigue cerrada',
    near(dist(l1.b, l2.a), 0) && near(dist(l2.b, l3.a), 0) && near(dist(l3.b, l4.a), 0) && near(dist(l4.b, l1.a), 0));
  check('solver: sin NaN', ents.every(e => [...e.a, ...e.b].every(Number.isFinite)));
  check('horizontal: extremos con misma y', near(l1.a[1], l1.b[1]));
  check('vertical: extremos con misma x', near(l4.a[0], l4.b[0]));
}
{
  const p1 = makeLine([0, 0], [50, 3]), p2 = makeLine([0, 0], [4, 50]);
  solveSketch([p1, p2], [makeConstraint('perpendicular', p2.id, p1.id)], [], 200);
  check('perpendicular satisfecha', constraintResidual([p1, p2], { type: 'perpendicular', a: p2.id, b: p1.id }) < 0.01);
  const e1 = makeLine([0, 0], [40, 0]), e2 = makeLine([0, 10], [70, 10]);
  solveSketch([e1, e2], [makeConstraint('equal', e1.id, e2.id)], [], 200);
  check('igual longitud', near(dist(e1.a, e1.b), dist(e2.a, e2.b)) && near(dist(e1.a, e1.b), 55));
  const c1 = makeCircle([0, 0], 5), c2 = makeCircle([20, 0], 11);
  solveSketch([c1, c2], [makeConstraint('equal', c1.id, c2.id)], [], 50);
  check('igual radio', near(c1.r, 8) && near(c2.r, 8));
  // inerte sin restricciones: geometría intacta
  const q = makeLine([1, 2], [3, 7]); solveSketch([q], [], [], 50);
  check('solver inerte sin restricciones', q.a[0] === 1 && q.b[1] === 7);
}
{
  // coincidente: extremo b de A con extremo a de B
  const a = makeLine([0, 0], [10, 0]), b = makeLine([12, 3], [20, 3]);
  solveSketch([a, b], [{ id: 'x', type: 'coincident', a: a.id, b: b.id, pa: 'b', pb: 'a' }], [], 100);
  check('coincidente une los extremos', near(dist(a.b, b.a), 0));
  // concéntrica: dos círculos comparten centro
  const c1 = makeCircle([0, 0], 5), c2 = makeCircle([8, 2], 3);
  solveSketch([c1, c2], [makeConstraint('concentric', c1.id, c2.id)], [], 100);
  check('concéntrica: mismo centro', near(dist(c1.c, c2.c), 0));
  // tangente línea-círculo: distancia centro-recta = radio
  const ln = makeLine([-10, 0], [10, 0]), ci = makeCircle([0, 8], 5);
  solveSketch([ln, ci], [makeConstraint('tangent', ln.id, ci.id)], [], 100);
  check('tangente línea-círculo', near(Math.abs(ci.c[1]), 5));
  // tangente círculo-círculo externa: dist(centros) = r1+r2
  const t1 = makeCircle([0, 0], 4), t2 = makeCircle([20, 0], 6);
  solveSketch([t1, t2], [makeConstraint('tangent', t1.id, t2.id)], [], 200);
  check('tangente círculo-círculo (externa)', near(dist(t1.c, t2.c), 10));
  // colineal: dos segmentos sobre la misma recta
  const k1 = makeLine([0, 0], [10, 0]), k2 = makeLine([12, 4], [22, 6]);
  solveSketch([k1, k2], [makeConstraint('collinear', k1.id, k2.id)], [], 200);
  check('colineal: B sobre la recta de A', constraintResidual([k1, k2], { type: 'collinear', a: k1.id, b: k2.id }) < 0.01);
}
{
  // fijar/anclar: la entidad fija NO se mueve; la coincidente se acerca a ella
  const fx = makeLine([0, 0], [10, 0]), mv = makeLine([30, 20], [40, 25]);
  const before = [...fx.a, ...fx.b];
  solveSketch([fx, mv], [
    { id: 'f', type: 'fix', a: fx.id },
    { id: 'co', type: 'coincident', a: fx.id, b: mv.id, pa: 'b', pb: 'a' },
  ], [], 200);
  check('fijar: la entidad anclada no se movió', near(fx.a[0], before[0]) && near(fx.b[0], before[2]) && near(fx.b[1], before[3]));
  check('fijar: la coincidente llegó al punto fijo', near(dist(mv.a, fx.b), 0));
}
{
  // simétrica respecto a un eje vertical (x=0): dos líneas se vuelven espejo
  const axis = makeLine([0, -20], [0, 20]);
  const A = makeLine([5, 0], [9, 4]), B = makeLine([-2, 1], [-11, -3]);
  solveSketch([axis, A, B], [{ id: 's', type: 'symmetric', a: A.id, b: B.id, axis: axis.id }], [], 200);
  const res = constraintResidual([axis, A, B], { type: 'symmetric', a: A.id, b: B.id, axis: axis.id });
  check('simétrica: espejo respecto al eje', res < 0.01, `res=${res}`);
  check('simétrica: B es reflejo de A en x', near(B.a[0], -A.a[0]) && near(B.b[0], -A.b[0]));
  check('simétrica: misma altura', near(B.a[1], A.a[1]) && near(B.b[1], A.b[1]));
}

console.log('— Ranura (slot) —');
{
  const ents = slotEntities([0, 0], [40, 0], 8);
  check('slot: 2 líneas + 2 arcos', ents.filter(e=>e.type==='line').length===2 && ents.filter(e=>e.type==='arc').length===2);
  const { outer, openCount } = chainLoops(ents);
  check('slot: contorno cerrado sin cadenas abiertas', !!outer && openCount===0, `open=${openCount}`);
}

console.log(`\nRESULTADO: ${pass} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
