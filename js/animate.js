// animate.js — Motor de ANIMACIÓN de foto3d (herramienta reusable).
//
// Dado un documento `foto3d-cad` (piezas) y una spec `foto3d-anim` (canales de
// movimiento como DATOS), entrega la matriz de animación de cada pieza en el
// tiempo t. El visor hace:  mesh.matrix = animMatrix(part, t) · partMatrix(part).
//
// Tipos de canal:
//   - spin  : gira las piezas que matchean, alrededor de un eje por un punto
//             (por defecto el eje de la pieza), a `rpm` constante (movimiento).
//   - pivot : rota las piezas que matchean alrededor de una LÍNEA fija
//             (axis+point) por un ángulo keyframeado en grados (p. ej. el
//             pop-up por bisagra). `exagerar` multiplica el ángulo para que un
//             movimiento chico (0.41°) se VEA.
//   - slide : traslada las piezas que matchean a lo largo de `axis` por una
//             distancia keyframeada en mm (p. ej. carrera de un vástago).
//
// Selector `sel`: { layer:'MÓVIL'|'FIJO', match:'<regex de nombre>',
//                   not:'<regex a excluir>' }. Sin sel → todas.
//
// Es capa `user` / herramienta: no inventa geometría, solo transforma piezas
// existentes en el tiempo. Se usa desde `cad/ensambles/ver_anim.html`.

const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);

function evalKeys(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      const u = clamp01((t - t0) / ((t1 - t0) || 1));
      // suavizado coseno (ease in/out) para un movimiento natural
      const s = 0.5 - 0.5 * Math.cos(Math.PI * u);
      return v0 + (v1 - v0) * s;
    }
  }
  return keys[keys.length - 1][1];
}

export function matches(part, sel) {
  if (!sel) return true;
  if (sel.layer && !part.name.startsWith(sel.layer)) return false;
  if (sel.match && !new RegExp(sel.match).test(part.name)) return false;
  if (sel.not && new RegExp(sel.not).test(part.name)) return false;
  return true;
}

function rotAbout(axis, p, ang, THREE) {
  const R = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(axis[0], axis[1], axis[2]).normalize(), ang);
  const T = new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]);
  const Ti = new THREE.Matrix4().makeTranslation(-p[0], -p[1], -p[2]);
  return T.multiply(R).multiply(Ti);
}

// Matriz de animación (en el frame del ensamble) para una pieza en el tiempo t.
export function animMatrix(part, t, spec, THREE) {
  const loop = spec.loop || 6;
  const tt = ((t % loop) + loop) % loop;
  const M = new THREE.Matrix4();
  // 1) SPINS (continuos, dependen de t absoluto para no saltar en el loop)
  for (const ch of spec.channels || []) {
    if (ch.type !== 'spin' || !matches(part, ch.sel)) continue;
    const ang = t * ((ch.rpm || 30) / 60) * 2 * Math.PI * (ch.dir || 1);
    const p = ch.point || [0, part.pos[1], part.pos[2]];   // eje de la pieza por defecto
    M.premultiply(rotAbout(ch.axis || [1, 0, 0], p, ang, THREE));
  }
  // 2) SLIDES (keyframeados)
  for (const ch of spec.channels || []) {
    if (ch.type !== 'slide' || !matches(part, ch.sel)) continue;
    const d = evalKeys(ch.keys, tt) * (ch.exagerar || 1);
    const a = new THREE.Vector3(...ch.axis).normalize().multiplyScalar(d);
    M.premultiply(new THREE.Matrix4().makeTranslation(a.x, a.y, a.z));
  }
  // 3) PIVOTS (keyframeados) — premultiplicados al final (se aplican en el mundo)
  for (const ch of spec.channels || []) {
    if (ch.type !== 'pivot' || !matches(part, ch.sel)) continue;
    const ang = evalKeys(ch.keys, tt) * Math.PI / 180 * (ch.exagerar || 1);
    M.premultiply(rotAbout(ch.axis, ch.point, ang, THREE));
  }
  return M;
}

// PROPS: objetos ilustrativos con path keyframeado (p. ej. el producto que se
// transfiere). keys = [[t, x, y, z], ...] (posición). `visible` = [t0, t1]
// opcional (ventana de visibilidad dentro del loop). Interpolación LINEAL
// (velocidad constante, como una caja sobre una banda). Devuelve [{...pr, pos,
// visible}].
function pathAt(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i], u = (t - a[0]) / ((b[0] - a[0]) || 1);
      return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * u);
    }
  }
  return keys[keys.length - 1].slice(1);
}
export function props(spec, t) {
  const loop = spec.loop || 6;
  const tt = ((t % loop) + loop) % loop;
  return (spec.props || []).map(pr => {
    const pos = pathAt(pr.keys, tt);
    const vis = !pr.visible || (tt >= pr.visible[0] && tt < pr.visible[1]);
    return { name: pr.name, box: pr.box, color: pr.color || '#c8a86a', pos, visible: vis };
  });
}

// SCROLL de bandas: devuelve el offset de textura (para simular la banda
// corriendo) de cada regla en spec.beltScroll = [{match, speed, axis}].
export function beltScroll(spec, t) {
  return (spec.beltScroll || []).map(b => ({ match: b.match, off: t * (b.speed || 0.5), axis: b.axis || 'x' }));
}

// Estado legible (para un HUD): devuelve la fase actual del loop.
export function fase(t, spec) {
  const loop = spec.loop || 6;
  const tt = ((t % loop) + loop) % loop;
  for (const f of spec.fases || []) if (tt >= f[0] && tt < f[1]) return f[2];
  return '';
}
