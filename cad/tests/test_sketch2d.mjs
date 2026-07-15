// Pruebas del croquizador 2D: recorte, alargado, encadenado, cotas y lápiz.
import {
  makeLine, makeCircle, makeArc, entityPoints, intersectEntities,
  trimEntity, extendLine, chainLoops, makeDim, measureDim, applyDim,
  fitStroke, dist,
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

console.log(`\nRESULTADO: ${pass} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
