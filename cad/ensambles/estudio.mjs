// estudio.mjs — ILUMINACIÓN DE ESTUDIO PARA LOS VISORES DE ENSAMBLE.
//
// Los visores importan three por importmap desde `vendor/three.module.min.js`,
// que es SOLO el núcleo: no hay `RoomEnvironment` ni ningún addon. Sin un mapa
// de entorno los metales de `materiales.mjs` se ven negros (un conductor no
// tiene difusa: todo lo que muestra es lo que refleja). Así que el entorno se
// construye aquí a mano: una escena pequeña de paneles emisivos que se pasa por
// `PMREMGenerator.fromScene()` y produce el mapa irradiado.
//
// La escena de estudio se construye con el techo en +Z porque los ensambles de
// este repo son Z-arriba y el mapa de entorno se muestrea en coordenadas de
// mundo: si el techo estuviera en +Y (la convención habitual) la luz entraría
// de lado.
//
// Todo el material del estudio es emisivo puro (color negro + `emissive`), así
// que la escena no necesita luces propias y `emissiveIntensity` puede pasar de
// 1: `fromScene` renderiza a un objetivo de coma flotante y conserva el rango
// alto, que es justo lo que da contraste a los reflejos.

/** Panel emisivo: una caja fina, cerrada, visible desde cualquier lado. */
function panel(THREE, escena, [w, d, h], [x, y, z], color, intensidad) {
  const m = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: new THREE.Color(color),
    emissiveIntensity: intensidad, roughness: 1, metalness: 0,
  });
  const malla = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), m);
  malla.position.set(x, y, z);
  escena.add(malla);
  return malla;
}

/**
 * Mapa de entorno de estudio (PMREM). Devuelve { textura, dispose }.
 * `renderer` debe existir ya; la generación es SÍNCRONA, así que quien llame
 * puede marcar `window.__listo` sin esperar nada asíncrono.
 */
export function entornoEstudio(THREE, renderer, { brillo = 1 } = {}) {
  const e = new THREE.Scene();

  // 1) La sala: caja cerrada por dentro. Da el nivel de base — el gris del
  //    taller — y evita que las zonas que no ven ninguna luz caigan a negro.
  const sala = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 12),
    new THREE.MeshStandardMaterial({
      color: 0x000000, emissive: new THREE.Color('#343b45'),
      emissiveIntensity: 0.40 * brillo, roughness: 1, metalness: 0,
      side: THREE.BackSide,
    }));
  e.add(sala);

  // 2) Techo de estudio: el difusor grande y frío que hace de luz principal.
  //    Ojo con pasarse: un metal devuelve el 60-95 % de lo que le llega, así
  //    que un domo demasiado brillante lo empasta a blanco y vuelve a parecer
  //    plástico. El contraste entre techo, tiras y suelo importa más que el
  //    nivel absoluto.
  panel(THREE, e, [11, 11, 0.2], [0, 0, 5.4], '#eef3fb', 1.15 * brillo);
  // 3) Suelo: rebote de hormigón, tibio y flojo. Sin él las caras de abajo se
  //    quedan planas y todo parece flotar.
  panel(THREE, e, [20, 20, 0.2], [0, 0, -5.6], '#4b4b48', 0.40 * brillo);
  // 4) Paredes de relleno en los CUATRO lados, dos frías y dos cálidas: dan al
  //    metal una dirección de color y evitan el reflejo gris uniforme, que es lo
  //    que hace que un metal parezca plástico.
  //    Que estén las cuatro no es decorativo: una cara VERTICAL de chapa refleja
  //    casi en horizontal, así que solo ve las paredes. Con dos de los cuatro
  //    lados a oscuras, el alma de un canal salía notablemente más apagada que
  //    su propia ala —misma pieza, mismo material— y parecía otro acero.
  panel(THREE, e, [0.2, 17, 10], [8.2, 0, 0], '#9fadbf', 0.55 * brillo);
  panel(THREE, e, [17, 0.2, 10], [0, -8.2, 0], '#8e8375', 0.40 * brillo);
  panel(THREE, e, [0.2, 17, 10], [-8.2, 0, 0], '#8d97a6', 0.38 * brillo);
  panel(THREE, e, [17, 0.2, 10], [0, 8.2, 0], '#9aa2ad', 0.34 * brillo);

  // 5) Tiras de luz. Son lo que de verdad "dibuja" un metal: reflejos
  //    alargados y brillantes con bordes duros. Sin ellas el aluminio y el
  //    cromo se leen como pintura gris clara.
  panel(THREE, e, [0.25, 13, 1.4], [7.7, 0, 2.6], '#ffffff', 5.5 * brillo);
  panel(THREE, e, [0.25, 11, 1.0], [-7.7, 1, 3.2], '#ffffff', 2.4 * brillo);
  panel(THREE, e, [13, 0.25, 0.9], [0, -7.7, 1.2], '#ffffff', 3.0 * brillo);
  panel(THREE, e, [9, 0.25, 1.6], [0, 7.7, 3.4], '#eaf1ff', 1.8 * brillo);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const objetivo = pmrem.fromScene(e, 0.035);
  pmrem.dispose();

  // La escena de estudio ya cumplió: se libera.
  e.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });

  return { textura: objetivo.texture, dispose: () => objetivo.dispose() };
}

/** Tono, espacio de color y sombras. Un sitio único para no repetirlo. */
export function configurarRenderer(THREE, renderer, { exposicion = 1.0, sombras = true } = {}) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // ACES: comprime las altas luces de los reflejos metálicos en vez de
  // recortarlas a blanco plano, que es lo que delata un render sin tono.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposicion;
  if (sombras) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
}

/**
 * Direccional principal con el tronco de sombra ajustado a la envolvente del
 * ensamble. `bbox` en las unidades del modelo (mm).
 */
// La dirección por defecto entra desde arriba-izquierda-frente. Importa que NO
// coincida con el eje de la cámara isométrica (+X, −Y, +Z): una luz frontal
// esconde todas sus sombras detrás de las piezas y el render vuelve a verse
// plano por mucho mapa de sombras que se calcule.
export function solPrincipal(THREE, bbox, {
  dir = [-0.62, -0.55, 0.85], intensidad = 1.35, color = 0xfff2e2, mapa = 2048, sombras = true,
  zSuelo = null,    // cota del plano receptor: su sombra también debe caber
} = {}) {
  const centro = bbox.getCenter(new THREE.Vector3());
  const radio = bbox.getSize(new THREE.Vector3()).length() / 2;
  const d = new THREE.Vector3(...dir).normalize();
  const dist = radio * 3;

  const sol = new THREE.DirectionalLight(color, intensidad);
  sol.position.copy(centro).addScaledVector(d, dist);
  sol.target.position.copy(centro);

  if (sombras) {
    sol.castShadow = true;

    // Tronco ORTOGRÁFICO ajustado de verdad: se llevan al espacio de la luz los
    // 8 vértices de la envolvente y, si hay suelo, sus 8 sombras sobre él. Con
    // un radio "a ojo" pasa una de dos: sobra tronco (y se malgastan texels) o
    // falta (y la sombra aparece cortada por una recta que delata el truco).
    const arriba = Math.abs(d.z) > 0.999 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const rot = new THREE.Matrix4().lookAt(sol.position, centro, arriba);
    const vista = new THREE.Matrix4()
      .compose(sol.position, new THREE.Quaternion().setFromRotationMatrix(rot), new THREE.Vector3(1, 1, 1))
      .invert();

    const pts = [];
    const p = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? bbox.max.x : bbox.min.x, i & 2 ? bbox.max.y : bbox.min.y, i & 4 ? bbox.max.z : bbox.min.z);
      pts.push(p.clone());
      if (zSuelo !== null && d.z > 1e-3) {          // sombra del vértice en el suelo
        pts.push(p.clone().addScaledVector(d, -(p.z - zSuelo) / d.z));
      }
    }
    const lo = new THREE.Vector3(Infinity, Infinity, Infinity);
    const hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const q of pts) { q.applyMatrix4(vista); lo.min(q); hi.max(q); }

    const c = sol.shadow.camera;
    c.left = lo.x; c.right = hi.x; c.bottom = lo.y; c.top = hi.y;
    c.near = Math.max(1, -hi.z - 1);                // en vista, la cámara mira a −Z
    c.far = -lo.z + 1;
    c.updateProjectionMatrix();
    sol.shadow.mapSize.set(mapa, mapa);
    sol.shadow.bias = -0.0002;
    // normalBias va en unidades del modelo (mm): despega la sombra de las
    // superficies casi paralelas a la luz sin abrir huecos en los contactos.
    sol.shadow.normalBias = Math.max(0.6, radio * 0.004);
  }
  return sol;
}

/**
 * Plano receptor de sombra bajo el ensamble. Usa `ShadowMaterial`, que no pinta
 * superficie: solo la sombra, sobre el fondo transparente del lienzo. Así el
 * equipo APOYA en algo —que es la mitad de lo que hace que una imagen parezca
 * real— sin meter un suelo gris que compita con las piezas ni encarecer el
 * cuadro (no tiene iluminación que resolver).
 */
export function planoSombra(THREE, bbox, { opacidad = 0.42, holgura = 4 } = {}) {
  const s = bbox.getSize(new THREE.Vector3());
  const c = bbox.getCenter(new THREE.Vector3());
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(s.x, s.y) * 5, Math.max(s.x, s.y) * 5),
    new THREE.ShadowMaterial({ opacity: opacidad, transparent: true }));
  m.position.set(c.x, c.y, bbox.min.z - holgura);   // Z-arriba: el plano ya es XY
  m.receiveShadow = true;
  return m;
}

/** Relleno suave desde el lado opuesto: abre las sombras sin aplanar. */
export function luzRelleno(THREE, bbox, { dir = [-0.7, 0.5, 0.25], intensidad = 0.35, color = 0x9fb4d0 } = {}) {
  const centro = bbox.getCenter(new THREE.Vector3());
  const radio = bbox.getSize(new THREE.Vector3()).length() / 2;
  const l = new THREE.DirectionalLight(color, intensidad);
  l.position.copy(centro).addScaledVector(new THREE.Vector3(...dir).normalize(), radio * 3);
  l.target.position.copy(centro);
  return l;
}

/**
 * Coloca una cámara en perspectiva sobre `dir` (dirección desde el centro hacia
 * la cámara) a la distancia EXACTA a la que la envolvente entra completa.
 * Se proyectan los 8 vértices de la caja y se resuelve la distancia mínima que
 * los mantiene dentro de los dos ángulos de visión; así el encuadre no depende
 * de multiplicadores a ojo y sigue siendo correcto si el modelo crece.
 */
export function encuadrar(THREE, cam, bbox, dir, margen = 1.03) {
  const centro = bbox.getCenter(new THREE.Vector3());
  const e = new THREE.Vector3(...dir).normalize();
  const f = e.clone().negate();                                  // hacia dónde mira
  const der = new THREE.Vector3().crossVectors(f, cam.up).normalize();
  if (!isFinite(der.x) || der.lengthSq() < 1e-9) der.set(1, 0, 0);
  const arr = new THREE.Vector3().crossVectors(der, f).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const tanH = tanV * cam.aspect;

  let d = 0;
  const p = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? bbox.max.x : bbox.min.x, i & 2 ? bbox.max.y : bbox.min.y, i & 4 ? bbox.max.z : bbox.min.z)
      .sub(centro);
    const z = p.dot(f);
    d = Math.max(d, Math.abs(p.dot(der)) / tanH - z, Math.abs(p.dot(arr)) / tanV - z);
  }
  d *= margen;
  cam.position.copy(centro).addScaledVector(e, d);
  cam.near = Math.max(1, d * 0.02);
  cam.far = d * 4 + bbox.getSize(new THREE.Vector3()).length();
  cam.lookAt(centro);
  cam.updateProjectionMatrix();
  return d;
}
// ---------------------------------------------------------------------------
// TEXTURAS PROCEDURALES
// ---------------------------------------------------------------------------
// Ninguna superficie real es ópticamente plana ni tiene la MISMA rugosidad en
// todos sus puntos: la chapa galvanizada tiene spangle (los cristales de zinc)
// y marcas de laminación, el perfil de aluminio sale de la matriz con estrías
// longitudinales, un eje rectificado guarda el paso de la herramienta y el
// esmalte tiene piel de naranja. Sin eso una cara plana devuelve EXACTAMENTE el
// mismo valor en todos sus píxeles, y eso es justo lo que el ojo lee como
// plástico de inyección.
//
// No hay archivos de imagen: los mapas se pintan por código en un `<canvas>` y
// se suben como `CanvasTexture`. De cada familia salen DOS mapas:
//
//   · normal    — el microrrelieve (a qué apunta la superficie).
//   · rugosidad — cuánto se abre el reflejo en cada punto. Es el que más trabaja:
//                 el spangle del galvanizado no se ve porque tenga relieve, sino
//                 porque cada cristal devuelve la luz de forma distinta.
//
// Qué se ve a qué distancia (el equipo mide ~1.1 m y la vista sale a 1600 px:
// ~0.7 mm por píxel), y por qué los pasos están donde están:
//   - estría de extrusión real ≈0.1-0.3 mm → sub-píxel: el mipmap la fundiría a
//     gris y no se vería NADA. Se lleva a ~2 mm, que a esta distancia son 3 px.
//     Es una exageración consciente, del orden de la que hace un plano al
//     engordar una línea fina para que se imprima.
//   - spangle del zinc ≈10-25 mm → se deja a tamaño real, se ve tal cual.
//   - piel de naranja del esmalte ≈1-3 mm → tamaño real, apenas 2-4 px, que es
//     exactamente como se ve una pieza pintada a un metro.
//
// El TAMAÑO físico de la baldosa (mm de pieza por repetición) lo pide cada
// familia y se aplica al generar las UV con `uvPorEjeLargo`, no escalando la
// textura: así el grano mide lo mismo en una ménsula de 50 mm que en un canal
// de 460 mm.
//
// CUIDADO CON EL EMBALDOSADO: un mapa que se repite cada pocos centímetros
// delata la rejilla si tiene estructura de baja frecuencia (fue el primer
// intento: la chapa parecía tela). Por eso los generadores de aquí no meten
// octavas por debajo de ~1/8 de la baldosa; toda la energía está en detalle
// fino, que al repetirse no dibuja ningún patrón reconocible.

/** PRNG determinista: dos ejecuciones tienen que dar la MISMA imagen. */
function prng(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const suav = (t) => t * t * (3 - 2 * t);

/** Ruido de valor 1-D periódico de `f` celdas, muestreado en `tam` puntos. */
function ruido1D(tam, f, semilla) {
  const r = prng(semilla), g = new Float32Array(f);
  for (let i = 0; i < f; i++) g[i] = r();
  const out = new Float32Array(tam);
  for (let x = 0; x < tam; x++) {
    const fx = x * f / tam, x0 = Math.floor(fx), t = suav(fx - x0);
    out[x] = g[x0 % f] * (1 - t) + g[(x0 + 1) % f] * t;
  }
  return out;
}

/** Ruido de valor 2-D periódico (embaldosa sin costura) de `f`×`f` celdas. */
function ruido2D(tam, f, semilla) {
  const r = prng(semilla), g = new Float32Array(f * f);
  for (let i = 0; i < f * f; i++) g[i] = r();
  const out = new Float32Array(tam * tam);
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const fx = x * f / tam, fy = y * f / tam;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = suav(fx - x0), ty = suav(fy - y0);
    const x1 = (x0 + 1) % f, y1 = (y0 + 1) % f, xa = x0 % f, ya = y0 % f;
    const a = g[ya * f + xa], b = g[ya * f + x1], c = g[y1 * f + xa], d = g[y1 * f + x1];
    out[y * tam + x] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
  return out;
}

/** Suma de octavas 2-D, normalizada a [0,1]. `capas` = [[celdas, amplitud], …]. */
function fbm(tam, capas, semilla) {
  const h = new Float32Array(tam * tam);
  let suma = 0;
  capas.forEach(([f, amp], i) => {
    const n = ruido2D(tam, f, semilla + i * 7919);
    for (let k = 0; k < h.length; k++) h[k] += n[k] * amp;
    suma += amp;
  });
  for (let k = 0; k < h.length; k++) h[k] /= suma;
  return h;
}

/**
 * CRISTALES DE ZINC (la «flor» del galvanizado por inmersión en caliente).
 *
 * Un Voronoi normal NO sirve, y este código ya lo intentó: con las semillas
 * repartidas en una retícula regular salen celdas casi del mismo tamaño y
 * alineadas, y la chapa se lee como un tejido de fibra de carbono. La flor real
 * es un mosaico de cristales de tamaños MUY distintos —de 2 mm y de 30 mm en la
 * misma chapa— con bordes rectos y orientaciones al azar.
 *
 * Dos decisiones dan eso:
 *
 *  · **Voronoi con pesos aditivos** (Apollonius): `d − w` en vez de `d`. Los
 *    bordes siguen siendo rectos —eso lo conserva el peso ADITIVO, no el
 *    multiplicativo, que los curva— pero un cristal con peso alto se come a sus
 *    vecinos y otro con peso bajo queda reducido a una esquirla. Con la sacudida
 *    COMPLETA dentro de la celda (no el ±35 % de antes), los tamaños se
 *    dispersan de verdad.
 *  · Cada cristal devuelve su **orientación**, no un valor de gris. El spangle
 *    no es un dibujo de manchas oscuras: es que cada cristal solidificó en un
 *    plano distinto y refleja hacia otro lado. Por eso esto alimenta el mapa de
 *    NORMALES (una inclinación diminuta y constante dentro del cristal, sin
 *    cresta en la frontera) y el de rugosidad, y nunca el color.
 *
 * Devuelve, por píxel, la inclinación (nx, ny) de su cristal y un valor de
 * rugosidad, ya suavizados en una banda estrecha alrededor de la frontera para
 * que el borde no centellee al reducir la imagen.
 */
function cristales(tam, n, semilla) {
  const r = prng(semilla);
  const N = n * n;
  const sx = new Float32Array(N), sy = new Float32Array(N), w = new Float32Array(N);
  const nx = new Float32Array(N), ny = new Float32Array(N), rg = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    sx[i] = ((i % n) + r()) / n;                 // sacudida completa: tamaños dispares
    sy[i] = (Math.floor(i / n) + r()) / n;
    w[i] = r() * 0.62 / n;                       // peso aditivo: quién se come a quién
    const a = r() * Math.PI * 2, m = 0.25 + 0.75 * r();
    nx[i] = Math.cos(a) * m;                     // orientación del cristal
    ny[i] = Math.sin(a) * m;
    rg[i] = r();
  }
  const fnx = new Float32Array(tam * tam), fny = new Float32Array(tam * tam);
  const frg = new Float32Array(tam * tam);
  // 5×5 celdas de búsqueda: con pesos aditivos un cristal grande alcanza más
  // allá de sus vecinas inmediatas, y con 3×3 la frontera saldría cortada.
  const R = 2;
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const px = x / tam, py = y / tam;
    const cx = Math.floor(px * n), cy = Math.floor(py * n);
    let d1 = 9, d2 = 9, k1 = 0;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const k = ((cy + j + n) % n) * n + ((cx + i + n) % n);
      let dx = sx[k] - px, dy = sy[k] - py;              // envolvente toroidal
      if (dx > 0.5) dx -= 1; else if (dx < -0.5) dx += 1;
      if (dy > 0.5) dy -= 1; else if (dy < -0.5) dy += 1;
      const d = Math.sqrt(dx * dx + dy * dy) - w[k];
      if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d;
    }
    // Banda de mezcla de ~3 píxeles: el cristal es plano hasta el borde, pero un
    // salto de un texel al siguiente aliasa al generar los mipmaps. En la
    // frontera la inclinación se va a cero (la superficie se aplana) y la
    // rugosidad al valor medio, que es lo que hace la unión entre dos granos.
    const a = suav(Math.min(1, (d2 - d1) * tam / 3));
    const k = y * tam + x;
    fnx[k] = nx[k1] * a;
    fny[k] = ny[k1] * a;
    frg[k] = rg[k1] * a + 0.5 * (1 - a);
  }
  return { nx: fnx, ny: fny, rug: frg };
}

/** Sube un campo [0,1] a una textura de canal único (gris). */
function aGris(THREE, campo, tam) {
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  for (let k = 0; k < tam * tam; k++) {
    const v = Math.max(0, Math.min(255, campo[k] * 255)) | 0;
    img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = v;
    img.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return ajustar(THREE, new THREE.CanvasTexture(c));
}

/**
 * Mapa de normales a partir de la INCLINACIÓN de cada punto, sin pasar por un
 * campo de alturas. Lo necesita el spangle: sus cristales son planos con
 * orientaciones distintas, y una altura constante por cristal solo produciría
 * gradiente en la frontera — es decir, una cresta donde no la hay.
 */
function aNormalDirecta(THREE, nx, ny, tam, fuerza) {
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  for (let k = 0; k < tam * tam; k++) {
    const dx = nx[k] * fuerza, dy = ny[k] * fuerza;
    const l = Math.hypot(dx, dy, 1), i = k * 4;
    img.data[i] = (dx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return ajustar(THREE, new THREE.CanvasTexture(c));
}

/** Convierte un campo de alturas [0,1] en mapa de normales tangente. */
function aNormal(THREE, h, tam, relieve) {
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  const en = (x, y) => h[((y + tam) % tam) * tam + ((x + tam) % tam)];
  // El factor tam/64 mantiene la PENDIENTE al cambiar la resolución del mapa:
  // el relieve pedido es físico, no en píxeles.
  const g = relieve * tam / 64;
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const dx = (en(x + 1, y) - en(x - 1, y)) * g;
    const dy = (en(x, y + 1) - en(x, y - 1)) * g;
    const l = Math.hypot(-dx, -dy, 1), k = (y * tam + x) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[k + 1] = (-dy / l * 0.5 + 0.5) * 255;
    img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return ajustar(THREE, new THREE.CanvasTexture(c));
}

function ajustar(THREE, t) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// --- los cinco acabados ------------------------------------------------------
// Cada generador devuelve { alt, rug, relieve, amp }:
//   alt     campo de alturas [0,1]
//   rug     campo multiplicador de rugosidad, ya en [1−2·amp, 1]
//   amp     media amplitud RELATIVA de la rugosidad (la usa `crearMateriales`
//           para subir la rugosidad nominal y que la MEDIA siga siendo la del
//           preset). Es propiedad del acabado, no de la pieza: el spangle varía
//           mucho más de un punto a otro que un rectificado.
//
// CONVENIO DE ORIENTACIÓN: `u` (eje X del mapa) corre SIEMPRE a lo largo del eje
// mayor de la pieza — lo garantiza `uvPorEjeLargo`. Por eso «longitudinal»
// significa constante en u, y «transversal» (torneado) constante en v, sea cual
// sea la orientación de la pieza en el ensamble.

const ACABADOS = {
  /** Estrías de matriz del perfil extruido: LARGAS, a lo largo del perfil. */
  estriado(tam, semilla) {
    // Todo el dibujo depende de v (transversal), así que las líneas salen
    // paralelas a u = dirección de extrusión.
    // Los pasos van en fracción de baldosa, no en mm: el tamaño físico lo pone
    // cada familia con su `mm`. Con los 48 mm que pide el extruido salen estrías
    // de ≈2.3 mm agrupadas en vetas de ≈7 y ≈16 mm, que es como se ve un perfil.
    const a = ruido1D(tam, Math.round(tam / 21), semilla);        // 1/21 de baldosa
    const b = ruido1D(tam, Math.round(tam / 7), semilla + 11);    // 1/7
    const c = ruido1D(tam, Math.round(tam / 3), semilla + 23);    // 1/3
    const rizo = fbm(tam, [[24, 1], [64, 0.5]], semilla + 31);    // rompe la rectitud
    const alt = new Float32Array(tam * tam), rug = new Float32Array(tam * tam);
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      const k = y * tam + x;
      const linea = 0.55 * a[y] + 0.30 * b[y] + 0.15 * c[y];
      alt[k] = linea * 0.92 + rizo[k] * 0.08;
      rug[k] = 0.80 + 0.20 * (0.75 * a[y] + 0.25 * rizo[k]);
    }
    return { alt, rug, relieve: 0.5, amp: 0.10 };
  },

  /** Marcas de torneado: anillos PERPENDICULARES al eje de la pieza. */
  torneado(tam, semilla) {
    // La herramienta deja un paso casi regular: una senoidal manda, y el ruido
    // solo la ensucia. Un ruido puro parecería lija, no torno.
    // 24 vueltas por baldosa: con los 18 mm del eje rectificado, paso ≈0.75 mm;
    // con los 30 mm del vástago cromado, ≈1.25 mm. Es el avance de la herramienta.
    const paso = Math.round(tam / 24);
    const j = ruido1D(tam, Math.round(tam / 6), semilla);         // deriva del paso
    const fino = ruido1D(tam, Math.round(tam / 2), semilla + 5);
    const suciedad = fbm(tam, [[48, 1], [128, 0.6]], semilla + 17);
    const alt = new Float32Array(tam * tam), rug = new Float32Array(tam * tam);
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      const k = y * tam + x;
      const onda = 0.5 + 0.5 * Math.sin(2 * Math.PI * (x / paso) + j[x] * 2.5);
      alt[k] = 0.62 * onda + 0.24 * fino[x] + 0.14 * suciedad[k];
      rug[k] = 0.80 + 0.20 * (0.6 * onda + 0.4 * suciedad[k]);
    }
    return { alt, rug, relieve: 0.35, amp: 0.10 };
  },

  /**
   * Spangle del galvanizado: la flor del cincado por inmersión en caliente.
   *
   * Historial, porque el error se repitió dos veces y conviene no repetirlo una
   * tercera: la primera versión metía la variación en el RELIEVE (crestas en la
   * frontera de cada cristal) → chapa acolchada, como muro de piedra. La segunda
   * la metía en el COLOR/rugosidad sobre una retícula regular → damero diagonal,
   * como fibra de carbono. Las dos se leían como un patrón, y un acabado que se
   * lee como patrón está mal: a la distancia de la vista general esto solo debe
   * notarse como un metal que no es liso.
   *
   * Lo que queda: cristales IRREGULARES (Voronoi de pesos aditivos), cada uno
   * plano y con su propia orientación, que van al mapa de NORMALES con una
   * inclinación diminuta; y una variación de rugosidad muy pequeña, porque la
   * flor se ve por cómo cada cristal devuelve la luz —a contraluz— y no porque
   * dibuje manchas oscuras.
   */
  moteado(tam, semilla) {
    // 7² sobre la baldosa de 95 mm ⇒ cristal nominal ≈13 mm, pero los pesos
    // aditivos y la sacudida completa lo reparten entre ~3 y ~35 mm.
    const c = cristales(tam, 7, semilla);
    // Marcas de laminación: rectas, muy tenues, en la dirección de la banda.
    const lam = ruido1D(tam, Math.round(tam / 6), semilla + 3);
    const amp = 0.018;
    const nx = new Float32Array(tam * tam), ny = new Float32Array(tam * tam);
    const rug = new Float32Array(tam * tam);
    for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
      const k = y * tam + x;
      nx[k] = c.nx[k];
      ny[k] = c.ny[k] + (lam[y] - 0.5) * 0.35;
      rug[k] = (1 - 2 * amp) + 2 * amp * c.rug[k];
    }
    return { nx, ny, fuerza: 0.09, rug, amp };
  },

  /** Piel de naranja del esmalte industrial. */
  piel(tam, semilla) {
    const alt = fbm(tam, [[16, 1], [34, 0.45], [80, 0.15]], semilla);
    const rug = new Float32Array(tam * tam);
    for (let k = 0; k < rug.length; k++) rug[k] = 0.86 + 0.14 * alt[k];
    return { alt, rug, relieve: 0.85, amp: 0.07 };
  },

  /** Grano fino isótropo: caucho vulcanizado, fundición, plásticos. */
  grano(tam, semilla) {
    // Sin la octava más fina (que a 512 px son celdas de 2 px): a esa
    // frecuencia el mapa ya no es relieve, es ruido que centellea al moverse.
    const alt = fbm(tam, [[24, 1], [56, 0.6], [120, 0.3]], semilla);
    const rug = new Float32Array(tam * tam);
    for (let k = 0; k < rug.length; k++) rug[k] = 0.88 + 0.12 * alt[k];
    return { alt, rug, relieve: 0.45, amp: 0.06 };
  },
};

/**
 * Fábrica de texturas con caché: `tex('moteado')` → { normal, rugosidad, amp }.
 * Solo se genera lo que se pide, y una sola vez: cada mapa cuesta ~0.1 s de CPU
 * y, más caro todavía, un juego de mipmaps que subir a la GPU.
 *
 *   const tex = crearTexturas(THREE);
 *   material.normalMap = tex('estriado').normal;
 */
export function crearTexturas(THREE, { tam = 512, semilla = 20250729 } = {}) {
  const cache = new Map();
  return function tex(tipo) {
    if (!ACABADOS[tipo]) throw new Error(`acabado desconocido: ${tipo}`);
    if (cache.has(tipo)) return cache.get(tipo);
    const a = ACABADOS[tipo](tam, semilla + tipo.length * 104729);
    // Un acabado describe su relieve de una de dos maneras: por un campo de
    // ALTURAS (`alt`, lo normal) o directamente por la INCLINACIÓN de cada punto
    // (`nx`/`ny`), que es lo que necesita un mosaico de caras planas.
    const normal = a.nx ? aNormalDirecta(THREE, a.nx, a.ny, tam, a.fuerza)
      : aNormal(THREE, a.alt, tam, a.relieve);
    const t = { normal, rugosidad: aGris(THREE, a.rug, tam), amp: a.amp };
    cache.set(tipo, t);
    return t;
  };
}

/**
 * UV por proyección plana, decidida POR TRIÁNGULO sobre el eje dominante de su
 * normal, con `u` SIEMPRE a lo largo del eje mayor de la pieza.
 *
 * Se hace sobre la geometría en coordenadas LOCALES (antes de aplicar la matriz
 * de la pieza), así que el eje mayor de la envolvente local es la dirección de
 * extrusión de un perfil o el eje de un eje, esté montado como esté. De ahí
 * salen gratis dos cosas: las estrías del extruido corren por donde salió de la
 * matriz, y la anisotropía de three —que toma su marco tangente de las UV
 * cuando la malla no trae `tangent`— apunta en esa misma dirección con
 * `anisotropyRotation = 0`.
 *
 * `escala` va en milímetros de pieza por baldosa. Las mallas de este repo son
 * todas no indexadas, así que los tres vértices de una cara pueden compartir
 * criterio sin pisar a nadie.
 */
export function uvPorEjeLargo(THREE, geom, escala = 25, eje = 'largo') {
  const p = geom.attributes.position.array;
  const n = geom.attributes.position.count;
  geom.computeBoundingBox();
  const s = geom.boundingBox.getSize(new THREE.Vector3());
  let largo;
  if (eje === 'revolucion') {
    // Eje de un SÓLIDO DE REVOLUCIÓN: un cuerpo torneado tiene dos medidas
    // iguales (el diámetro) y una distinta (la longitud), así que su eje es la
    // que más se aparta de la mediana. No sirve el eje mayor: una polea Ø73×35
    // es más ancha que larga y las marcas de torno le saldrían giradas 90°
    // —a lo largo de la pieza en vez de dando la vuelta—, que es justo lo que
    // pasaba. Para un eje Ø12.7×378 las dos reglas coinciden.
    const d = [s.x, s.y, s.z];
    const med = [...d].sort((a, b) => a - b)[1];
    largo = d.map((v, i) => [Math.abs(v - med), i]).sort((a, b) => b[0] - a[0])[0][1];
  } else {
    largo = s.x >= s.y && s.x >= s.z ? 0 : s.y >= s.z ? 1 : 2;    // dirección de extrusión
  }
  const uv = new Float32Array(n * 2);
  const inv = 1 / escala;
  for (let i = 0; i < n; i += 3) {
    const o = i * 3;
    const ax = p[o], ay = p[o + 1], az = p[o + 2];
    const ux = p[o + 3] - ax, uy = p[o + 4] - ay, uz = p[o + 5] - az;
    const vx = p[o + 6] - ax, vy = p[o + 7] - ay, vz = p[o + 8] - az;
    const nx = Math.abs(uy * vz - uz * vy), ny = Math.abs(uz * vx - ux * vz), nz = Math.abs(ux * vy - uy * vx);
    const dom = nx >= ny && nx >= nz ? 0 : ny >= nz ? 1 : 2;      // eje de la normal
    let a = dom === 0 ? 1 : 0;                                    // los otros dos,
    let b = dom === 2 ? 1 : 2;                                    // en orden
    if (b === largo) { const t = a; a = b; b = t; }               // u = eje mayor
    for (let k = 0; k < 3; k++) {
      uv[(i + k) * 2] = p[(i + k) * 3 + a] * inv;
      uv[(i + k) * 2 + 1] = p[(i + k) * 3 + b] * inv;
    }
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geom;
}
