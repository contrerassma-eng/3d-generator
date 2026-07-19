// app.js — foto3d CAD: mini diseño paramétrico símil Inventor.
// Unidades: milímetros. Eje Z hacia arriba.

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';
import { svgIcon, setIcons } from './icons.js';
import { loadCatalogo, componentToPart, envolvente } from './componentes.js';
import {
  newDoc, newPart, getPart, getFeature, partMatrix, uid, PALETTE,
  makeBoxFeature, makeCylFeature, makeHoleFeature, makeSketchFeature,
  makeSketchEntitiesFeature, makeRevolveFeature, makePatternFeature, makeFilletFeature, makeChamferFeature, planeBasis, referenceEdges, referencePoints, referencePrimitives, magnetCorrections,
  buildPartGeometry, planarFaceFromHit, faceHighlightGeometry, findAxialFeature, identifyFace, holeToolGeometry,
  makeMate, makeConcentric, solveConstraints,
  evalExpr, resolveParams, applyExpressions,
} from './model.js';
import * as SK from './sketch2d.js';
import { exportDrawingDXF, exportDrawingPDF, exportFlatDXF, exportFlatPDF } from './drawing2d.js';
import { MATERIALES, materialPorId, makeChapaBase, makeChapaBaseContorno, makePestana, chapaOf, esChapa,
         chapaEdges, flatPattern } from './sheetmetal.js';

// ---------- Escena ----------

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

const viewport = document.getElementById('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.localClippingEnabled = true;
const SECTION = []; // planos de corte activos (sección global o corte del boceto)
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1216);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10000);
camera.position.set(220, -220, 160);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;

// Órbita solo con clic IZQUIERDO en modo 'select'. En cualquier herramienta
// (mover/editar/medir/hueco…) el izquierdo acciona la herramienta y la órbita
// pasa a botón central/derecho (o 2 dedos), para no girar la cámara sin querer.
function applyOrbitButtons() {
  const tool = mode !== 'select';
  controls.mouseButtons.LEFT = tool ? -1 : THREE.MOUSE.ROTATE;
  controls.touches.ONE = tool ? -1 : THREE.TOUCH.ROTATE;
}

// cámara ortogonal para el modo boceto (vista normal a la cara)
const orthoCam = new THREE.OrthographicCamera(-150, 150, 150, -150, -5000, 5000);
let orthoViewSize = 300;
const sketchControls = new OrbitControls(orthoCam, renderer.domElement);
sketchControls.enableRotate = false; // en boceto solo paneo y zoom
sketchControls.enabled = false;
// En boceto el clic izquierdo / 1 dedo SIEMPRE dibuja (nunca orbita): la órbita
// (botón 🔄 Giro) pasa al botón CENTRAL; el paneo queda en el derecho.
sketchControls.mouseButtons.LEFT = -1;
sketchControls.touches.ONE = -1;
let activeCamera = camera;

scene.add(new THREE.HemisphereLight(0xe8eaf2, 0x596070, 1.15)); // suelo claro: caras inferiores legibles
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(180, -120, 300);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8899bb, 0.5);
fill.position.set(-150, 180, 80);
scene.add(fill);
const under = new THREE.DirectionalLight(0xc2cad8, 0.75); // luz desde abajo para mirar por debajo
under.position.set(80, 60, -260);
scene.add(under);

const grid = new THREE.GridHelper(500, 50, 0x3a4250, 0x232833);
grid.rotation.x = Math.PI / 2;
scene.add(grid);
const axes = new THREE.AxesHelper(60);
scene.add(axes);
// vistas ortogonales bloqueadas (sin perspectiva) para trabajar el ensamble
let mainView = 'persp';
const viewBtn = document.getElementById('btnView');
const VIEW_NAMES = { persp: 'Perspectiva', ortho: 'Ortográfica libre', top: 'Planta', front: 'Frente', side: 'Lateral', iso: 'Isométrica' };

// caja envolvente + centro + tamaño de las piezas visibles (para encuadrar/orbitar)
function visibleBox() {
  const box = new THREE.Box3();
  for (const rec of meshes.values()) if (rec.mesh.visible) box.expandByObject(rec.mesh);
  if (box.isEmpty()) box.set(new THREE.Vector3(-100, -100, 0), new THREE.Vector3(100, 100, 100));
  return { box, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()).length() };
}

function setMainView(v) {
  mainView = v;
  if (v === 'persp') {
    activeCamera = camera;
    controls.enabled = true;
    sketchControls.enabled = false;
    viewBtn?.classList.remove('on');
    frameModel(); // recentra el pivote de órbita en el modelo
    window.__updateLockIcon?.();
    setStatus('Vista en perspectiva libre.');
    return;
  }
  const { center, size } = visibleBox();
  const libre = v === 'ortho';
  // ortográfica libre: arranca desde la dirección actual de la cámara en perspectiva
  const DIRS = { top: [0, 0, 1], front: [0, -1, 0], side: [1, 0, 0], iso: [1, -1, 1] };
  const UPS = { top: [0, 1, 0], front: [0, 0, 1], side: [0, 0, 1], iso: [0, 0, 1] };
  const dir = libre
    ? (camera.position.clone().sub(controls.target).normalize())
    : new THREE.Vector3(...DIRS[v]).normalize();
  orthoViewSize = Math.max(120, size * 1.3);
  orthoCam.zoom = 1;
  orthoCam.up.set(...(libre ? [0, 0, 1] : UPS[v]));
  orthoCam.position.copy(center).addScaledVector(dir, 600);
  orthoCam.lookAt(center);
  sketchControls.target.copy(center);
  sketchControls.enableRotate = libre;  // libre → órbita; vistas fijas → sin giro
  // en el ENSAMBLE ortográfico el clic izquierdo (y 1 dedo) orbita; en el boceto
  // se reasigna a -1 (el izquierdo dibuja). Sin esto la ortográfica no giraba.
  sketchControls.mouseButtons.LEFT = libre ? THREE.MOUSE.ROTATE : -1;
  sketchControls.touches.ONE = libre ? THREE.TOUCH.ROTATE : -1;
  sketchControls.enabled = true;
  controls.enabled = false;
  activeCamera = orthoCam;
  resize();
  viewBtn?.classList.add('on');
  window.__updateLockIcon?.();
  setStatus(libre
    ? 'Vista ORTOGRÁFICA LIBRE (sin perspectiva): orbita, panea y zoom. Ideal para ensambles.'
    : `Vista ${VIEW_NAMES[v]} bloqueada (ortogonal, sin giro): paneo/zoom libres; Mover arrastra en el plano de la vista.`);
}

if (viewBtn) viewBtn.onclick = () => {
  if (sketch) { setStatus('Sal del boceto para cambiar la vista del ensamble.'); return; }
  showForm('Vista del ensamble', [
    { key: 'v', label: 'Vista', type: 'select', value: mainView, options: [
      ['persp', 'Perspectiva (libre)'], ['ortho', 'Ortográfica (libre, sin perspectiva)'],
      ['top', 'Planta (orto fija)'], ['front', 'Frente (orto fija)'],
      ['side', 'Lateral (orto fija)'], ['iso', 'Isométrica (orto fija)']] },
  ], (val) => setMainView(val.v));
};

// Encuadra el modelo: pone el pivote de órbita en el centro del modelo y aleja la
// cámara lo justo. Corrige el "orbitar difícil" (antes giraba en torno al origen).
function frameModel(target) {
  const { center, size } = target || visibleBox();
  const cam = activeCamera === orthoCam ? orthoCam : camera;
  const ctrl = activeCamera === orthoCam ? sketchControls : controls;
  const dir = cam.position.clone().sub(ctrl.target);
  if (dir.lengthSq() < 1) dir.set(220, -220, 160);
  dir.normalize();
  ctrl.target.copy(center);
  if (cam === orthoCam) {
    orthoViewSize = Math.max(120, size * 1.4);
    cam.position.copy(center).addScaledVector(dir, 600);
    resize();
  } else {
    cam.position.copy(center).addScaledVector(dir, Math.max(180, size * 1.6));
  }
  cam.lookAt(center);
  ctrl.update();
}

// Doble clic: encuadra en la pieza tocada (o en todo el modelo si es al vacío),
// símil "Zoom to fit / Focus" de Inventor. Facilita orbitar alrededor de la pieza.
renderer.domElement.addEventListener('dblclick', (ev) => {
  if (sketch) return;
  const hit = castAtEvent(ev);
  if (hit) {
    const rec = meshes.get(hit.object.userData.partId);
    if (rec) {
      const box = new THREE.Box3().expandByObject(rec.mesh);
      frameModel({ center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()).length() });
      setStatus(`Enfocado en ${getPart(doc, hit.object.userData.partId)?.name || 'la pieza'}.`);
      return;
    }
  }
  frameModel();
  setStatus('Encuadrado en todo el modelo.');
});

// orienta la cámara activa a mirar el modelo desde `dir`, con `up` dado
function snapView(dir, up) {
  const cam = activeCamera === orthoCam ? orthoCam : camera;
  const ctrl = activeCamera === orthoCam ? sketchControls : controls;
  const { center, size } = visibleBox();
  ctrl.target.copy(center);
  cam.up.set(...up);
  cam.position.copy(center).addScaledVector(new THREE.Vector3(...dir).normalize(), Math.max(220, size * 1.7));
  if (cam === orthoCam) { orthoViewSize = Math.max(120, size * 1.4); resize(); }
  cam.lookAt(center); ctrl.update();
}

// ---------- ViewCube (esquina superior derecha, símil Inventor) ----------
const vcCanvas = document.getElementById('vcCanvas');
let viewLocked = false;
if (vcCanvas) {
  const cubeRenderer = new THREE.WebGLRenderer({ canvas: vcCanvas, alpha: true, antialias: true });
  cubeRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  cubeRenderer.setSize(vcCanvas.clientWidth || 78, vcCanvas.clientHeight || 78, false);
  const cubeScene = new THREE.Scene();
  cubeScene.add(new THREE.HemisphereLight(0xffffff, 0x667088, 1.4));
  const cubeCam = new THREE.OrthographicCamera(-1.45, 1.45, 1.45, -1.45, 0.1, 100);
  const faceTex = (label) => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#e8ebf1'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#98a3b5'; g.lineWidth = 7; g.strokeRect(4, 4, 120, 120);
    g.fillStyle = '#2b3140'; g.font = 'bold 21px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, 64, 66);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  };
  // orden BoxGeometry: +X,-X,+Y,-Y,+Z,-Z  (foto3d Z arriba)
  const LABELS = ['DER', 'IZQ', 'ATRÁS', 'FRENTE', 'SUP', 'INF'];
  const cubeMats = LABELS.map(l => new THREE.MeshBasicMaterial({ map: faceTex(l) }));
  const cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), cubeMats);
  cubeScene.add(cubeMesh);
  cubeScene.add(new THREE.LineSegments(new THREE.EdgesGeometry(cubeMesh.geometry), new THREE.LineBasicMaterial({ color: 0x4d90fe })));
  const cubeRay = new THREE.Raycaster(), cubePtr = new THREE.Vector2();
  const fwd = new THREE.Vector3();
  window.__updateViewCube = () => {
    cubeCam.quaternion.copy(activeCamera.quaternion);
    fwd.set(0, 0, -1).applyQuaternion(cubeCam.quaternion);
    cubeCam.position.copy(fwd).multiplyScalar(-4);
    cubeCam.up.set(0, 1, 0).applyQuaternion(cubeCam.quaternion);
    cubeRenderer.render(cubeScene, cubeCam);
  };
  vcCanvas.addEventListener('pointerdown', (ev) => {
    const r = vcCanvas.getBoundingClientRect();
    cubePtr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    cubeRay.setFromCamera(cubePtr, cubeCam);
    const hit = cubeRay.intersectObject(cubeMesh, false)[0];
    if (!hit) return;
    // según DÓNDE se tocó el cubo: centro de cara → vista orto; cerca de una
    // ARISTA → vista a 45° de dos ejes; ESQUINA → vista isométrica de tres ejes.
    const half = 0.85, thr = 0.42, dir = [0, 0, 0];
    for (let i = 0; i < 3; i++) { const c = hit.point.getComponent(i) / half; if (Math.abs(c) > thr) dir[i] = Math.sign(c); }
    if (!dir[0] && !dir[1] && !dir[2]) { const n = hit.face.normal; dir[0] = Math.round(n.x); dir[1] = Math.round(n.y); dir[2] = Math.round(n.z); }
    const up = (dir[0] === 0 && dir[1] === 0) ? [0, 1, 0] : [0, 0, 1]; // solo cara sup/inf usa Y arriba
    snapView(dir, up);
    const NAME = { '1,0,0': 'Derecha', '-1,0,0': 'Izquierda', '0,1,0': 'Atrás', '0,-1,0': 'Frente', '0,0,1': 'Superior', '0,0,-1': 'Inferior' };
    const na = dir.filter(Boolean).length;
    setStatus(na === 1 ? `Vista ${NAME[dir.join(',')] || ''}.` : na === 2 ? 'Vista de arista (45°).' : 'Vista isométrica (esquina).');
  });
  document.getElementById('vcHome').onclick = () => { snapView([1, -1, 1], [0, 0, 1]); setStatus('Vista isométrica.'); };
  // toggle de proyección ortográfica ↔ perspectiva (por defecto ortográfica)
  const vcProj = document.getElementById('vcProj');
  vcProj.onclick = () => {
    if (sketch) { setStatus('Sal del boceto para cambiar la proyección del ensamble.'); return; }
    const toOrtho = mainView !== 'ortho';
    setMainView(toOrtho ? 'ortho' : 'persp');
    vcProj.innerHTML = svgIcon(toOrtho ? 'ortho' : 'persp');
    vcProj.classList.toggle('on', toOrtho);
  };
  const vcLock = document.getElementById('vcLock');
  // ¿está permitido el giro en el contexto actual? (boceto usa sketch.orbit)
  window.__rotateEnabled = () => sketch ? !!sketch.orbit
    : (activeCamera === orthoCam ? sketchControls.enableRotate : controls.enableRotate);
  window.__updateLockIcon = () => {
    const on = window.__rotateEnabled();
    vcLock.classList.toggle('on', !on);
    vcLock.innerHTML = svgIcon(on ? 'lockopen' : 'lock');
  };
  vcLock.onclick = () => {
    const on = !window.__rotateEnabled();
    if (sketch) { // en boceto: botón central rota, izquierdo sigue dibujando (= Giro)
      sketch.orbit = on; sketchControls.enableRotate = on;
      sketchControls.mouseButtons.MIDDLE = on ? THREE.MOUSE.ROTATE : THREE.MOUSE.DOLLY;
      document.getElementById('skOrbit')?.classList.toggle('on', on);
      if (!on) { orthoCam.up.copy(sketch.vW); orthoCam.position.copy(sketchControls.target).addScaledVector(sketch.nW, 500); orthoCam.lookAt(sketchControls.target); }
    } else {
      viewLocked = !on;
      controls.enableRotate = on;
      if (mainView === 'ortho') sketchControls.enableRotate = on;
    }
    window.__updateLockIcon();
    setStatus(on ? (sketch ? '🔓 Giro habilitado en el boceto: arrastra para rotar, toca para dibujar.' : '🔓 Giro de la vista habilitado.')
                 : '🔒 Giro bloqueado (paneo y zoom siguen).');
  };
}

// sección global: corta el modelo por un plano X/Y/Z para ver interiores
const sectionBtn = document.getElementById('btnSection');
if (sectionBtn) sectionBtn.onclick = () => {
  showForm('Vista de sección', [
    { key: 'axis', label: 'Plano normal a', type: 'select', value: 'x', options: [['x', 'X'], ['y', 'Y'], ['z', 'Z']] },
    { key: 'pos', label: 'Posición (mm)', value: 0, step: 1 },
    { key: 'inv', label: 'Invertir lado', type: 'checkbox', value: false },
  ], (v) => {
    const n = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[v.axis];
    const normal = new THREE.Vector3(...n).multiplyScalar(v.inv ? 1 : -1);
    SECTION.length = 0;
    SECTION.push(new THREE.Plane(normal, v.inv ? -v.pos : v.pos));
    sectionBtn.classList.add('on');
    setStatus(`Sección activa: plano ${v.axis.toUpperCase()} en ${v.pos} mm (edítala con el mismo botón).`);
  }, {
    label: '✕ Quitar sección',
    onClick() {
      SECTION.length = 0;
      sectionBtn.classList.remove('on');
      setStatus('Sección desactivada.');
    },
  });
};

// plano base ocultable (para mirar el modelo por abajo sin estorbo)
const gridBtn = document.getElementById('btnGrid');
gridBtn?.classList.add('on');
if (gridBtn) gridBtn.onclick = () => {
  grid.visible = !grid.visible;
  axes.visible = grid.visible;
  gridBtn.classList.toggle('on', grid.visible);
  setStatus(grid.visible ? 'Plano base visible.' : 'Plano base oculto: orbita por debajo del modelo.');
};

const overlay = new THREE.Group(); // marcas de medición, resaltados persistentes
scene.add(overlay);

function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const a = w / Math.max(1, h);
  orthoCam.left = -orthoViewSize * a / 2;
  orthoCam.right = orthoViewSize * a / 2;
  orthoCam.top = orthoViewSize / 2;
  orthoCam.bottom = -orthoViewSize / 2;
  orthoCam.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

let _lastSketchZoom = 0;
renderer.setAnimationLoop(() => {
  if (controls.enabled) controls.update();
  if (sketchControls.enabled) sketchControls.update();
  updateMeasureLabel();
  if (sketch) {
    updateSketchLabels(); positionDynBox();
    // al hacer zoom en el boceto, redibuja para que los marcadores de punto
    // mantengan un tamaño constante en pantalla (no crecen al acercar)
    if (orthoCam.zoom !== _lastSketchZoom) { _lastSketchZoom = orthoCam.zoom; redrawSketch(); }
  }
  renderer.render(scene, activeCamera);
  if (window.__updateViewCube) window.__updateViewCube();
});

// ---------- Estado ----------

let doc = newDoc();
const meshes = new Map();       // partId -> { mesh, edges }
let selection = null;           // { kind:'part'|'feature'|'constraint', partId?, id }
let mode = 'select';            // select | hole | mate | flush | concentric | move | measure
let pickStage = null;           // datos temporales de operaciones de 2 pasos
const undoStack = [];

const $ = (id) => document.getElementById(id);
const statusEl = $('status'), hintEl = $('hintTag'), statsEl = $('stats');

function setStatus(msg) { statusEl.textContent = msg; }
const hintText = $('hintText');
function setHint(msg) {
  hintText.textContent = msg || '';
  hintEl.style.display = msg ? 'flex' : 'none';
}
$('hintClose').onclick = () => { hintEl.style.display = 'none'; }; // cerrar el aviso amarillo

// ---------- Panel lateral ocultable + propiedades plegables ----------

const sidebar = $('sidebar');
const isNarrow = () => window.innerWidth < 900;

function setSidebar(open) {
  sidebar.classList.toggle('open', open);
  $('btnPanel').classList.toggle('on', open);
}
$('btnPanel').onclick = () => setSidebar(!sidebar.classList.contains('open'));
$('btnCloseSidebar').onclick = () => setSidebar(false);
setSidebar(!isNarrow());

$('propsHead').onclick = () => $('props').classList.toggle('closed');
function openProps() { $('props').classList.remove('closed'); }
// breadcrumb del Property Panel: saltar a un nivel superior (p. ej. de la operación a su pieza)
$('propsBody').addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-crumb]');
  if (!el) return;
  selection = { kind: 'part', id: el.dataset.crumb };
  refreshUI();
});

// ---------- Materiales ----------

const matFor = (part) => new THREE.MeshPhongMaterial({
  color: new THREE.Color(part.color), shininess: 28, specular: 0x333333,
  polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  clippingPlanes: SECTION, side: THREE.DoubleSide, // sección: se ve el interior
});
const edgeMat = new THREE.LineBasicMaterial({ color: 0x11141a, clippingPlanes: SECTION });
const sketchShowMat = new THREE.LineBasicMaterial({ color: 0xf0a437, transparent: true, opacity: 0.8 });
const hoverMat = new THREE.MeshBasicMaterial({ color: 0xf0a437, transparent: true, opacity: 0.45, depthTest: true, polygonOffset: true, polygonOffsetFactor: -2 });
const pickedMat = new THREE.MeshBasicMaterial({ color: 0x4d90fe, transparent: true, opacity: 0.55, depthTest: true, polygonOffset: true, polygonOffsetFactor: -2 });

// ---------- Piezas de malla real (GLB) ----------
// Componentes mecánicos importados (conveyone-simulator): geometría fija. Se
// cargan de forma perezosa una sola vez, se fusionan en una sola BufferGeometry
// (coordenadas en mm, Z arriba) y se recentran en XY con la base en Z=0.

const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder); // los GLB usan compresión EXT_meshopt_compression
const meshGeomCache = new Map();  // src → Promise<BufferGeometry>

// Nombre base del nodo del subcomponente al que pertenece una malla: el primer
// ancestro con nombre, sin sus dígitos finales de instancia. three sanea los
// nombres del glTF (espacios→_, quita ':'/'.') y numera las instancias, así que
// «300986+Std+UniDrive+motor+D-Shaft» = la 1.ª instancia (una pieza) y
// «…Shaft1_» = las demás; el catálogo guarda esa clave saneada como `nodo`.
function subcompBase(o) {
  for (let p = o.parent; p; p = p.parent) if (p.name) return p.name.replace(/\d+$/, '');
  return '';
}

// Carga la geometría de un GLB. Si se da `nodo`, solo fusiona las mallas de ESE
// subcomponente (una instancia) → pieza reusable, recentrada como las demás.
function loadMeshGeometry(src, nodo = null) {
  const key = nodo ? `${src}#${nodo}` : src;
  if (meshGeomCache.has(key)) return meshGeomCache.get(key);
  const promise = MeshoptDecoder.ready.then(() => new Promise((resolve, reject) => {
    gltfLoader.load(src, (gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const verts = []; // se transforma vértice a vértice: fromBufferAttribute respeta
      const v = new THREE.Vector3(); // el flag 'normalized' (dequantiza KHR_mesh_quantization)
      const inNodo = (o) => subcompBase(o) === nodo;
      gltf.scene.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        if (nodo && !inNodo(o)) return;
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        const pa = g.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
          verts.push(v.x, v.y, v.z);
        }
      });
      if (!verts.length) { reject(new Error('GLB sin mallas')); return; }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geom.scale(1000, 1000, 1000);   // glTF viene en metros; foto3d trabaja en mm
      geom.computeBoundingBox();
      const bb = geom.boundingBox;
      geom.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -bb.min.z); // XY centrado, base Z=0
      geom.computeVertexNormals();
      resolve(geom);
    }, undefined, (err) => reject(err instanceof Error ? err : new Error(String(err))));
  }));
  meshGeomCache.set(key, promise);
  return promise;
}

// ---------- Ensambles de malla (GLB con muchas piezas: ZP2026, etc.) ----------
// Se decompone el GLB en GRUPOS por subcomponente (todas las instancias de un
// tipo juntas: motores, poleas, guardas, largueros, rodillos, pernos…). Cada
// grupo entra como una PIEZA separada, no como un sólido único. Todos comparten
// el mismo recentrado (offset del ensamble completo) para quedar alineados.
const assemblyCache = new Map(); // src → Promise<{ groups: Map<key,{name,geom}>, order:[] }>
const groupKey = (name) => (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/\d+$/, '');
// etiquetas legibles por clave de grupo para el ZP2026 (las que no estén → nombre limpio)
const ASM_LABELS = {
  '300986STDUNIDRIVEMOTORDSHAFT': 'Motor UniDrive', SPEEDUPSPOOL: 'Polea (speed-up)',
  POWERSUPPLY: 'Fuente de poder', ESCALERILLA: 'Escalerilla portacables',
  LTG: 'Larguero lateral', TRS: 'Travesaño', GUARDA: 'Guarda', GUARDAMIR: 'Guarda (espejo)',
  PALEBLUE: 'Rodillos', ORINGGREEN: 'O-rings', POS: 'Rodillos (soporte)',
  B005A: 'Bracket B_005A', B004A: 'Bracket B_004A', B002A: 'Bracket B_002A', BR: 'Bracket BR_3002',
  SENSORBTR2025PL5A25A: 'Sensor BTR20', SOPORTESENSOR: 'Soporte de sensor', C: 'Placa c0031144',
};
function friendlyName(key, raw) {
  if (ASM_LABELS[key]) return ASM_LABELS[key];
  const s = (raw || '').replace(/=>.*/, '').replace(/[_+]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s || 'Estructura';
}

function loadAssembly(src) {
  if (assemblyCache.has(src)) return assemblyCache.get(src);
  const p = MeshoptDecoder.ready.then(() => new Promise((resolve, reject) => {
    gltfLoader.load(src, (gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      const gv = new Map(), gname = new Map();
      const bb = new THREE.Box3();
      gltf.scene.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        let anc = ''; for (let q = o.parent; q; q = q.parent) if (q.name) { anc = q.name; break; }
        const key = groupKey(anc) || 'MALLA';
        let arr = gv.get(key); if (!arr) { arr = []; gv.set(key, arr); }
        const clean = anc.replace(/[_\s\d]+$/, '') || anc || 'Pieza';
        if (!gname.has(key) || clean.length < gname.get(key).length) gname.set(key, clean);
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        const pa = g.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).multiplyScalar(1000); // m→mm
          arr.push(v.x, v.y, v.z); bb.expandByPoint(v);
        }
      });
      if (!gv.size) { reject(new Error('GLB sin mallas')); return; }
      const ox = (bb.min.x + bb.max.x) / 2, oy = (bb.min.y + bb.max.y) / 2, oz = bb.min.z;
      const groups = new Map(), order = [];
      for (const [key, arr] of gv) {
        const f = new Float32Array(arr.length);
        for (let i = 0; i < arr.length; i += 3) { f[i] = arr[i] - ox; f[i + 1] = arr[i + 1] - oy; f[i + 2] = arr[i + 2] - oz; }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(f, 3));
        geom.computeVertexNormals(); geom.computeBoundingBox();
        groups.set(key, { name: friendlyName(key, gname.get(key)), geom, tris: arr.length / 9 });
        order.push(key);
      }
      order.sort((a, b) => groups.get(b).tris - groups.get(a).tris); // piezas grandes primero
      resolve({ groups, order });
    }, undefined, (e) => reject(e instanceof Error ? e : new Error(String(e))));
  }));
  assemblyCache.set(src, p);
  return p;
}
function loadAssemblyGroupGeometry(src, key) {
  return loadAssembly(src).then((a) => {
    const g = a.groups.get(key);
    if (!g) throw new Error(`grupo '${key}' no está en el ensamble`);
    return g.geom.clone();
  });
}

// Inserta un GLB multi-pieza como ENSAMBLE: una pieza por grupo/subcomponente.
// Inserta un ENSAMBLE foto3d-cad (comp.doc → JSON con parts + constraints):
// clona todas las piezas con ids nuevos, desplaza el conjunto al cursor y añade
// sus RESTRICCIONES remapeadas. Editables (no una malla fija).
function insertDocAssembly(comp) {
  setStatus(`Cargando ensamble ${comp.nombre}…`);
  fetch(comp.doc).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }).then((sub) => {
    if (sub.format !== 'foto3d-cad' || !Array.isArray(sub.parts)) throw new Error('documento foto3d-cad inválido');
    pushUndo();
    const spawn = nextSpawnX() + (comp.bbox_mm ? comp.bbox_mm[0] / 2 : 0);
    const idMap = new Map();
    let first = null;
    for (const sp of sub.parts) {
      const nid = uid('p'); idMap.set(sp.id, nid);
      const part = {
        ...structuredClone(sp), id: nid,
        pos: [sp.pos[0] + spawn, sp.pos[1], sp.pos[2]],
        fixed: sp.fixed && doc.parts.length === 0 ? true : (sp.fixed || false),
      };
      for (const f of part.features) f.id = uid('f'); // ids de función únicos
      doc.parts.push(part); rebuildPart(part);
      if (!first) first = nid;
    }
    // restricciones remapeadas (referencian ids de pieza + anclas locales)
    let nc = 0;
    for (const c of (sub.constraints || [])) {
      const a = idMap.get(c.a?.part), b = idMap.get(c.b?.part);
      if (!a || !b) continue;
      doc.constraints.push({ ...structuredClone(c), id: uid('c'), a: { ...c.a, part: a }, b: { ...c.b, part: b } });
      nc++;
    }
    if (first) selection = { kind: 'part', id: first };
    solveAndSync(); frameModel();
    commit(`${comp.nombre} insertado como ENSAMBLE: ${sub.parts.length} piezas${nc ? ` + ${nc} restricciones` : ''}.`);
  }).catch((err) => setStatus(`No se pudo cargar el ensamble (${comp.doc}): ${err.message}`));
}

function insertAssembly(comp) {
  const src = comp.ensamble.glb;
  setStatus(`Cargando ensamble ${comp.nombre}…`);
  loadAssembly(src).then((a) => {
    pushUndo();
    const spawn = nextSpawnX() + (comp.bbox_mm ? comp.bbox_mm[0] / 2 : 0);
    let first = null, n = 0;
    const nameCount = new Map();
    for (const key of a.order) {
      const g = a.groups.get(key);
      let nm = g.name;
      const c = (nameCount.get(nm) || 0) + 1; nameCount.set(nm, c);
      if (c > 1) nm = `${nm} ${c}`;
      const part = {
        id: uid('p'), name: nm, color: PALETTE[n % PALETTE.length],
        pos: [spawn, 0, 0], quat: [0, 0, 0, 1], fixed: n === 0, visible: true,
        componente: comp.id,
        features: [{ id: uid('f'), name: `Malla · ${nm}`, shape: 'mesh', op: 'mesh', at: [0, 0, 0], dir: [0, 0, 1], params: { src, group: key } }],
      };
      doc.parts.push(part); rebuildPart(part);
      if (!first) first = part.id; n++;
    }
    if (first) selection = { kind: 'part', id: first };
    frameModel();
    commit(`${comp.nombre} insertado como ENSAMBLE: ${n} piezas (motores, poleas, guardas, estructura…).`);
  }).catch((err) => setStatus(`No se pudo cargar el ensamble (${src}): ${err.message}`));
}

const isMeshPart = (part) => part.features.length === 1 && part.features[0].shape === 'mesh';

function rebuildMeshPart(part) {
  const { src, nodo, group } = part.features[0].params;
  const loader = group ? loadAssemblyGroupGeometry(src, group) : loadMeshGeometry(src, nodo || null);
  loader.then((geom) => {
    if (!getPart(doc, part.id)) return;           // la pieza se borró mientras cargaba
    disposePartMesh(part.id);
    const g = geom.clone();
    const mesh = new THREE.Mesh(g, matFor(part));
    mesh.userData.partId = part.id;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 32), edgeMat);
    mesh.add(edges);
    meshes.set(part.id, { mesh, edges });
    scene.add(mesh);
    syncTransform(part);
    refreshUI();
  }).catch((err) => {
    setStatus(`No se pudo cargar la malla (${src}): ${err.message}`);
  });
}

// ---------- Reconstrucción ----------

function rebuildPart(part) {
  disposePartMesh(part.id);
  applyExpressions(part, resolveParams(doc)); // resuelve cotas vinculadas a parámetros (fx)
  if (!part.features.length) { refreshUI(); return; }
  if (isMeshPart(part)) { rebuildMeshPart(part); refreshUI(); return; }
  const geom = buildPartGeometry(part);
  if (!geom.attributes.position || geom.attributes.position.count === 0) {
    // sin material (p. ej. solo cortes): no hay nada que mostrar
    setStatus(`${part.name}: sin material — agrega una función de unión.`);
    refreshUI();
    return;
  }
  const mesh = new THREE.Mesh(geom, matFor(part));
  mesh.userData.partId = part.id;
  // El contorno de aristas (EdgesGeometry) es CARÍSIMO en mallas densas (piezas
  // reales del STEP de ~1M triángulos). Se omite sobre un umbral → carga mucho
  // más ágil en ensambles de 100+ piezas de malla.
  const ntri = geom.attributes.position ? geom.attributes.position.count / 3 : 0;
  const edges = ntri > 40000 ? null : new THREE.LineSegments(new THREE.EdgesGeometry(geom, 20), edgeMat);
  if (edges) mesh.add(edges);
  // bocetos consumidos con visibilidad activada (para reutilizarlos de guía)
  for (const f of part.features) {
    if (f.shape === 'sketch' && f.showSketch && f.params.entities) mesh.add(buildSketchOverlay(f));
  }
  meshes.set(part.id, { mesh, edges });
  scene.add(mesh);
  syncTransform(part);
  refreshUI();
}

function disposePartMesh(partId) {
  const rec = meshes.get(partId);
  if (!rec) return;
  scene.remove(rec.mesh);
  rec.mesh.geometry.dispose();
  rec.mesh.material.dispose();
  if (rec.edges) rec.edges.geometry.dispose();
  meshes.delete(partId);
}

function rebuildAll() {
  for (const id of [...meshes.keys()]) disposePartMesh(id);
  for (const part of doc.parts) rebuildPart(part);
}

function syncTransform(part) {
  const rec = meshes.get(part.id);
  if (!rec) return;
  rec.mesh.position.set(...part.pos);
  rec.mesh.quaternion.set(...part.quat);
  rec.mesh.visible = part.visible;
}
function syncAllTransforms() { for (const p of doc.parts) syncTransform(p); }

function solveAndSync() {
  solveConstraints(doc);
  syncAllTransforms();
  refreshUI();
}

function buildSketchOverlay(f) {
  const group = new THREE.Group();
  const n = new THREE.Vector3(...f.dir).normalize();
  const U = new THREE.Vector3(...f.params.u);
  U.addScaledVector(n, -U.dot(n)).normalize();
  const Vv = new THREE.Vector3().crossVectors(n, U);
  const toV3 = (pu, pv) => new THREE.Vector3(...f.at)
    .addScaledVector(U, pu).addScaledVector(Vv, pv).addScaledVector(n, 0.15);
  for (const e of f.params.entities) {
    const pts = SK.entityPoints(e, 64).map(pt => toV3(pt[0], pt[1]));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), sketchShowMat));
  }
  return group;
}

// ---------- Persistencia / deshacer ----------

function pushUndo() {
  undoStack.push(JSON.stringify(doc));
  if (undoStack.length > 40) undoStack.shift();
}
function undo() {
  if (!undoStack.length) return;
  doc = JSON.parse(undoStack.pop());
  selection = null;
  rebuildAll();
  autosave();
  setStatus('Deshecho.');
}
function autosave() {
  try { localStorage.setItem('foto3d-cad-doc', JSON.stringify(doc)); } catch (e) { /* sin almacenamiento */ }
}
function commit(msg) { autosave(); if (msg) setStatus(msg); }

// ---------- Interfaz: árbol ----------

const OP_ICON = { union: '⊕', cut: '⊖', blend: '◜', pattern: '▦', mesh: '◈' };
// nombre de icono SVG para cada operación de función del árbol
const OP_ICON_NAME = { union: 'union', cut: 'cut', blend: 'blend', pattern: 'patrect', mesh: 'mesh' };
const featureIconName = (f) => f.suppressed ? 'pause' : (OP_ICON_NAME[f.op] || 'feature');

let treeFilter = '';
// Filtra el árbol por nombre (oculta filas de pieza que no calzan y sus
// funciones) SIN reconstruir el DOM → no pierde el foco al escribir.
function applyTreeFilter() {
  const q = treeFilter;
  const hidden = new Set();
  for (const p of doc.parts) if (q && !p.name.toLowerCase().includes(q)) hidden.add(p.id);
  for (const n of document.querySelectorAll('#tree [data-kind="part"]')) n.style.display = hidden.has(n.dataset.id) ? 'none' : '';
  for (const n of document.querySelectorAll('#tree [data-kind="feature"]')) n.style.display = hidden.has(n.dataset.part) ? 'none' : '';
}
// Visibilidad CONSCIENTE DEL FILTRO: 👁/🚫 afectan solo a las piezas que calzan
// el filtro (si hay); ◉ aísla (muestra solo esas y oculta el resto).
function setVisibleFiltered(v) {
  pushUndo();
  const q = treeFilter;
  const match = (p) => !q || p.name.toLowerCase().includes(q);
  let nn = 0;
  for (const p of doc.parts) if (match(p)) { p.visible = v; syncTransform(p); nn++; }
  refreshUI();
  commit(`${v ? 'Mostradas' : 'Ocultas'} ${nn} pieza(s)${q ? ` («${q}»)` : ''}.`);
}
function isolateFiltered() {
  if (!treeFilter) return setVisibleFiltered(true);
  pushUndo();
  let nn = 0;
  for (const p of doc.parts) { const m = p.name.toLowerCase().includes(treeFilter); p.visible = m; syncTransform(p); if (m) nn++; }
  refreshUI();
  commit(`Aisladas ${nn} pieza(s) («${treeFilter}»).`);
}

function refreshUI() {
  const tree = $('tree');
  const envIco = env === 'ens' ? 'ensamble' : 'pieza';
  let html = `<h3><span class="h3ic">${svgIcon(envIco)}</span>Piezas<span class="cnt">${doc.parts.length}</span></h3>`;
  if (doc.parts.length > 8) html += `<div class="treebar">
    <input id="treeFilter" type="search" placeholder="Filtrar piezas…" value="${esc(treeFilter)}" autocomplete="off">
    <button id="treeShowAll" title="Mostrar (las del filtro, o todas)">👁</button>
    <button id="treeHideAll" title="Ocultar (las del filtro, o todas)">🚫</button>
    <button id="treeIsoAll" title="Aislar: mostrar solo las del filtro">◉</button></div>`;
  for (const part of doc.parts) {
    const sel = selection?.kind === 'part' && selection.id === part.id ? ' sel' : '';
    html += `<div class="node node-part${sel}" data-kind="part" data-id="${part.id}">
      <span class="swatch" style="background:${part.color}"></span>
      <span class="nm">${esc(part.name)}${part.fixed ? ` <span class="ic pinIc" title="Pieza fija (a tierra)">${svgIcon('pin')}</span>` : ''}</span>
      <button data-act="vis" title="Mostrar/ocultar">${svgIcon(part.visible ? 'eye' : 'eyeoff')}</button>
      <button data-act="iso" title="Aislar: mostrar solo esta pieza (toca de nuevo para restaurar)">${svgIcon('isolate')}</button>
      <button data-act="del" class="danger" title="Eliminar la pieza y sus restricciones">${svgIcon('trash')}</button>
    </div><div class="children">`;
    part.features.forEach((f, fi) => {
      const fsel = selection?.kind === 'feature' && selection.id === f.id ? ' sel' : '';
      html += `<div class="node${fsel}${f.suppressed ? ' supr' : ''}" data-kind="feature" data-part="${part.id}" data-id="${f.id}">
        <span class="ic">${svgIcon(featureIconName(f))}</span><span class="nm">${esc(f.name)}</span>
        <span class="meta">${featureMeta(f)}</span>
        <button data-act="sup" title="Suprimir/reactivar la función">${svgIcon(f.suppressed ? 'play' : 'pause')}</button>
        <button data-act="up" title="Subir (regenera antes)" ${fi === 0 ? 'disabled' : ''}>${svgIcon('up')}</button>
        <button data-act="down" title="Bajar (regenera después)" ${fi === part.features.length - 1 ? 'disabled' : ''}>${svgIcon('down')}</button>
      </div>`;
    });
    html += '</div>';
  }
  html += `<h3><span class="h3ic">${svgIcon('link')}</span>Restricciones<span class="cnt">${doc.constraints.length}</span></h3>`;
  if (!doc.constraints.length) html += '<div class="node"><span class="meta">— ninguna —</span></div>';
  for (const c of doc.constraints) {
    const csel = selection?.kind === 'constraint' && selection.id === c.id ? ' sel' : '';
    const label = { mate: 'Coincidir caras', flush: 'Alinear caras', concentric: 'Concéntrico' }[c.type] || c.type;
    const cico = { mate: 'mate', flush: 'flush', concentric: 'concentric' }[c.type] || 'link';
    const pa = getPart(doc, c.a.part)?.name || '?', pb = getPart(doc, c.b.part)?.name || '?';
    html += `<div class="node${csel}" data-kind="constraint" data-id="${c.id}">
      <span class="ic">${svgIcon(cico)}</span><span class="nm">${label}</span>
      <span class="meta">${esc(pa)} ↔ ${esc(pb)}</span>
    </div>`;
  }
  tree.innerHTML = html;
  const tf = $('treeFilter');
  if (tf) {
    tf.oninput = () => { treeFilter = tf.value.trim().toLowerCase(); applyTreeFilter(); };
    $('treeShowAll').onclick = () => setVisibleFiltered(true);
    $('treeHideAll').onclick = () => setVisibleFiltered(false);
    $('treeIsoAll').onclick = () => isolateFiltered();
    applyTreeFilter();
  }
  refreshProps();
  let tris = 0;
  for (const rec of meshes.values()) tris += rec.mesh.geometry.attributes.position ? rec.mesh.geometry.attributes.position.count / 3 : 0;
  statsEl.textContent = `${doc.parts.length} piezas · ${doc.constraints.length} restricciones · ${Math.round(tris)} triángulos · mm`;
}

function featureMeta(f) {
  if (f.shape === 'box') return `${f.params.w}×${f.params.d}×${f.params.h}`;
  if (f.shape === 'cylinder') return `Ø${f.params.dia}×${f.params.h}`;
  if (f.shape === 'hole') return f.params.through ? `Ø${f.params.dia} pasante` : `Ø${f.params.dia}×${f.params.depth}`;
  if (f.shape === 'sketch') return `${(f.params.entities || f.params.pts || []).length} ent ×${f.params.h}`;
  if (f.shape === 'revolve') return `rev 360° ${(f.params.entities || []).length} ent`;
  if (f.shape === 'mesh') return f.params.bbox ? `malla · ${f.params.bbox.map(n => +n.toFixed(0)).join('×')} mm` : 'malla real (GLB)';
  if (f.shape === 'fillet') return `R${f.params.r} · ${(f.params.edges || []).length} arista(s)`;
  if (f.shape === 'chamfer') return `${f.params.d} mm · ${(f.params.edges || []).length} arista(s)`;
  if (f.shape === 'pattern') {
    const srcName = doc.parts.flatMap(p => p.features).find(x => x.id === f.params.sourceId)?.name || '?';
    return f.params.kind === 'circ'
      ? `○ ${f.params.n}× de «${srcName}»`
      : `▦ ${f.params.nx}×${f.params.ny} de «${srcName}»`;
  }
  return '';
}

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

$('tree').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  const node = e.target.closest('.node');
  if (!node) return;
  const { kind, id, part } = node.dataset;
  if (btn?.dataset.act === 'vis' && kind === 'part') {
    const p = getPart(doc, id);
    p.visible = !p.visible;
    syncTransform(p);
    refreshUI();
    return;
  }
  if (btn?.dataset.act === 'iso' && kind === 'part') { isolatePart(getPart(doc, id)); return; }
  if (btn?.dataset.act === 'del' && kind === 'part') { deletePart(getPart(doc, id)); return; }
  if (btn?.dataset.act && kind === 'feature') {
    const p = getPart(doc, part);
    const f = getFeature(p, id);
    const idx = p.features.indexOf(f);
    pushUndo();
    if (btn.dataset.act === 'sup') f.suppressed = !f.suppressed;
    if (btn.dataset.act === 'up' && idx > 0) [p.features[idx - 1], p.features[idx]] = [p.features[idx], p.features[idx - 1]];
    if (btn.dataset.act === 'down' && idx < p.features.length - 1) [p.features[idx + 1], p.features[idx]] = [p.features[idx], p.features[idx + 1]];
    faceCache.clear();
    rebuildPart(p);
    commit(btn.dataset.act === 'sup' ? (f.suppressed ? 'Función suprimida.' : 'Función reactivada.') : 'Orden de funciones cambiado.');
    return;
  }
  if (!kind || !id) return;
  selection = { kind, id, partId: part || (kind === 'part' ? id : undefined) };
  openProps();
  refreshUI();
});

// eliminar una pieza del ensamble junto con las restricciones que la usan
// Duplicar pieza (símil Copiar de Inventor): clon con id/funciones nuevos,
// desplazado en X para verlo; conserva su malla o sus features. NO copia
// restricciones (la copia entra libre, la ubicas/relacionas tú).
function duplicatePart(p) {
  if (!p) return;
  pushUndo();
  const copy = structuredClone(p);
  copy.id = uid('p');
  copy.name = `${p.name} (copia)`;
  copy.fixed = false;
  for (const f of copy.features) f.id = uid('f');
  const w = (meshes.get(p.id)?.mesh?.geometry?.boundingBox
    && (meshes.get(p.id).mesh.geometry.boundingBox.max.x - meshes.get(p.id).mesh.geometry.boundingBox.min.x)) || 100;
  copy.pos = [p.pos[0] + Math.max(w, 60) + 40, p.pos[1], p.pos[2]];
  doc.parts.push(copy);
  selection = { kind: 'part', id: copy.id };
  rebuildPart(copy);
  commit(`${p.name} duplicada → "${copy.name}".`);
}

function deletePart(p) {
  if (!p) return;
  const nc = doc.constraints.filter(c => c.a.part === p.id || c.b.part === p.id).length;
  if (!confirm(`¿Eliminar la pieza "${p.name}"${nc ? ` y sus ${nc} restricción(es)` : ''}?`)) return;
  pushUndo();
  doc.parts = doc.parts.filter(x => x.id !== p.id);
  doc.constraints = doc.constraints.filter(c => c.a.part !== p.id && c.b.part !== p.id);
  disposePartMesh(p.id);
  if (isolatedId === p.id) restoreVisibility(); // no dejar el resto oculto tras borrar la aislada
  if (selection && (selection.id === p.id || selection.partId === p.id)) selection = null;
  refreshUI();
  commit(`${p.name} eliminada${nc ? ' (con sus restricciones)' : ''}. Ctrl+Z deshace.`);
}

// aislar / des-aislar: mostrar solo una pieza. El estado vive en isolatedId,
// así que se puede des-aislar sin depender de la selección actual.
let isolatedId = null;
function restoreVisibility() {
  for (const x of doc.parts) { x.visible = true; syncTransform(x); }
  isolatedId = null;
  document.getElementById('btnIsolate').classList.remove('on');
  refreshUI();
}
function isolatePart(p) {
  if (!p) return false;
  if (isolatedId === p.id) { restoreVisibility(); setStatus('Aislamiento terminado: todas las piezas visibles.'); return false; }
  for (const x of doc.parts) { x.visible = x.id === p.id; syncTransform(x); }
  isolatedId = p.id;
  document.getElementById('btnIsolate').classList.add('on');
  refreshUI();
  setStatus(`Pieza aislada: ${p.name}. Toca Aislar de nuevo para mostrar todas.`);
  return true;
}

// ---------- Interfaz: propiedades ----------

function refreshProps() {
  const body = $('propsBody');
  if (!selection) { body.innerHTML = '<span style="color:var(--dim)">Nada seleccionado.</span>'; return; }

  if (selection.kind === 'part') {
    const p = getPart(doc, selection.id);
    if (!p) { selection = null; return refreshProps(); }
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...p.quat), 'XYZ');
    const deg = (r) => +(r * 180 / Math.PI).toFixed(2);
    // estado en el ensamble (honesto: anclada = referencia 0 GL; libre = 6 GL
    // menos lo que quiten las relaciones; el nº exacto residual no se afirma).
    const ncc = doc.constraints.filter(c => c.a.part === p.id || c.b.part === p.id).length;
    const asmState = p.fixed
      ? '<b style="color:var(--accent2)">Anclada</b> · referencia (0 GL)'
      : `<b>Libre</b> · ${ncc} relación${ncc === 1 ? '' : 'es'} de ensamble`;
    body.innerHTML = `
      ${crumb([{ t: env === 'ens' ? 'Ensamble' : 'Modelo' }, { t: p.name }])}
      ${sec('Identidad',
        frow('Nombre', `<input type="text" id="pp_name" value="${esc(p.name)}">`)
        + frow('Color', `<input type="color" id="pp_color" value="${p.color}">`)
        + frow('Fija (a tierra)', `<input type="checkbox" id="pp_fixed" ${p.fixed ? 'checked' : ''}>`)
        + frow('Estado', `<span class="meta">${asmState}</span>`))}
      ${sec('Posición y orientación',
        frow('Posición X/Y/Z', num3('pp_pos', p.pos))
        + frow('Rotación °X/Y/Z', num3('pp_rot', [deg(e.x), deg(e.y), deg(e.z)])))}
      ${sec('Acciones', `<div class="btnrow">
        <button id="pp_apply">Aplicar</button>
        <button id="pp_scale" title="Escalar la pieza por un factor (símil Escala de edición directa de Inventor)">⤢ Escala…</button>
        <button id="pp_rot" title="Girar la pieza un ángulo alrededor de un eje (símil Rotar de edición directa)">⟳ Girar…</button>
        <button id="pp_dup" title="Duplicar la pieza (símil Copiar de Inventor): la copia entra libre para ubicarla">⧉ Duplicar</button>
        <button id="pp_iso" title="Mostrar solo esta pieza (toca de nuevo para restaurar)">⛶ Aislar</button>
        <button id="pp_del" class="danger">Eliminar pieza</button>
      </div>`)}
      ${sec('Fabricación', `<div class="btnrow">
        <button id="pp_stl" title="Exportar SOLO esta pieza a STL (en su propio origen, para imprimir/fabricar)">⭳ STL pieza</button>
        <button id="pp_save" title="Guardar SOLO esta pieza como JSON (ábrela en otro proyecto con 📂 Abrir → Agregar)">💾 Guardar pieza</button>
      </div>${esChapa(p) ? `<div class="btnrow">
        <button id="pp_flatdxf" title="Desarrollo real (BA con factor K) con líneas de plegado y desahogos">⭳ Desarrollo DXF</button>
        <button id="pp_flatpdf" title="Lámina del desarrollo lista para imprimir">⭳ Desarrollo PDF</button>
      </div>` : ''}`, false)}`;
    $('pp_stl').onclick = () => exportSTL([p], `${p.name.replace(/[^\w.-]+/g, '_')}.stl`, false);
    $('pp_save').onclick = () => savePartJSON(p);
    if (esChapa(p)) {
      $('pp_flatdxf').onclick = () => exportDesarrollo(p, exportFlatDXF, 'DXF');
      $('pp_flatpdf').onclick = () => exportDesarrollo(p, exportFlatPDF, 'PDF');
    }
    $('pp_apply').onclick = () => {
      pushUndo();
      p.name = $('pp_name').value || p.name;
      p.color = $('pp_color').value;
      p.fixed = $('pp_fixed').checked;
      p.pos = readNum3('pp_pos');
      const [rx, ry, rz] = readNum3('pp_rot').map(d => d * Math.PI / 180);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
      p.quat = [q.x, q.y, q.z, q.w];
      const rec = meshes.get(p.id);
      if (rec) rec.mesh.material.color.set(p.color);
      solveAndSync();
      commit('Pieza actualizada.');
    };
    $('pp_iso').onclick = () => isolatePart(p);
    $('pp_del').onclick = () => deletePart(p);
    $('pp_dup').onclick = () => duplicatePart(p);
    $('pp_scale').onclick = () => showForm(`${p.name} · Escala`, [
      { key: 's', label: 'Factor de escala (1 = igual; 2 = doble)', value: 1, step: 0.1 },
    ], (v) => {
      if (!(v.s > 0) || v.s === 1) return;
      pushUndo();
      scalePart(p, v.s);
      rebuildPart(p);
      solveAndSync();
      commit(`${p.name}: escala ×${v.s}.`);
    });
    $('pp_rot').onclick = () => showForm(`${p.name} · Girar`, [
      { key: 'axis', label: 'Eje de giro', type: 'select', value: 'z', options: [['x', 'X'], ['y', 'Y'], ['z', 'Z']] },
      { key: 'ang', label: 'Ángulo (°): + antihorario', value: 90, step: 5 },
    ], (v) => {
      if (!v.ang) return;
      pushUndo();
      const ax = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[v.axis];
      const dq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...ax), v.ang * Math.PI / 180);
      const q = new THREE.Quaternion(...p.quat).premultiply(dq);
      p.quat = [q.x, q.y, q.z, q.w];
      solveAndSync();
      commit(`${p.name}: giro ${v.ang}° en ${v.axis.toUpperCase()}.`);
    });
    return;
  }

  if (selection.kind === 'feature') {
    const p = getPart(doc, selection.partId);
    const f = p && getFeature(p, selection.id);
    if (!f) { selection = null; return refreshProps(); }
    let dims = '';
    if (f.shape === 'chapaBase') {
      dims = frow('Material', `<b>${esc(materialPorId(f.params.material).nombre)}</b>`)
        + frow('Ancho/Fondo (mm)', `<span style="display:flex;gap:4px;flex:1">
            <input type="number" id="fp_w" value="${f.params.w}" step="1" style="width:50%">
            <input type="number" id="fp_d" value="${f.params.d}" step="1" style="width:50%"></span>`)
        + frow('Espesor (mm)', `<input type="number" id="fp_t" value="${f.params.t}" step="0.5">`)
        + frow('Radio pliegue def', `<input type="number" id="fp_radio" value="${f.params.radio}" step="0.5">`)
        + frow('Factor K', `<input type="number" id="fp_k" value="${f.params.k}" step="0.01">`);
    }
    if (f.shape === 'pestana') {
      dims = frow('Longitud plana', `<input type="number" id="fp_altura" value="${f.params.altura}" step="1">`)
        + frow('Ángulo (°)', `<input type="number" id="fp_angulo" value="${f.params.angulo}" step="5">`)
        + frow('Radio interior', `<input type="number" id="fp_radio" value="${f.params.radio}" step="0.5">`)
        + frow('Dirección', `<select id="fp_dirb">
            <option value="arriba" ${f.params.dirBend !== 'abajo' ? 'selected' : ''}>Arriba</option>
            <option value="abajo" ${f.params.dirBend === 'abajo' ? 'selected' : ''}>Abajo</option></select>`)
        + frow('Retranqueos', `<span style="display:flex;gap:4px;flex:1">
            <input type="number" id="fp_e1" value="${f.params.e1}" step="1" style="width:50%">
            <input type="number" id="fp_e2" value="${f.params.e2}" step="1" style="width:50%"></span>`);
    }
    if (f.shape === 'box') dims = frow('Ancho X', dimInput('fp_w', f, 'w')) + frow('Fondo Y', dimInput('fp_d', f, 'd')) + frow('Alto Z', dimInput('fp_hh', f, 'h'));
    if (f.shape === 'cylinder') dims = frow('Diámetro', dimInput('fp_dia', f, 'dia')) + frow('Altura', dimInput('fp_h', f, 'h'));
    if (f.shape === 'hole') {
      const seat = f.params.seat || 'none';
      const seatOpt = (v, t) => `<option value="${v}" ${seat === v ? 'selected' : ''}>${t}</option>`;
      dims = frow('Diámetro', dimInput('fp_dia', f, 'dia')) + frow('Profundidad', dimInput('fp_depth', f, 'depth'))
        + frow('Pasante', `<input type="checkbox" id="fp_through" ${f.params.through ? 'checked' : ''}>`)
        + frow('Asiento', `<select id="fp_seat">${seatOpt('none', 'Ninguno')}${seatOpt('cbore', 'Caja (counterbore)')}${seatOpt('csink', 'Avellanado (countersink)')}</select>`)
        + frow('Ø asiento', `<input type="number" id="fp_seatdia" value="${f.params.seatDia ?? f.params.dia * 2}" step="0.5">`)
        + frow('Prof. asiento', `<input type="number" id="fp_seatdepth" value="${f.params.seatDepth ?? f.params.dia}" step="0.5">`);
    }
    if (f.shape === 'pattern') {
      const srcName = doc.parts.flatMap(pp => pp.features).find(x => x.id === f.params.sourceId)?.name || '?';
      dims = frow('Repite', `<b>${esc(srcName)}</b>`);
      if (f.params.kind === 'circ') {
        dims += frow('Ocurrencias', `<input type="number" id="fp_n" value="${f.params.n}" step="1">`)
          + frow('Ángulo total (°)', `<input type="number" id="fp_angle" value="${f.params.angle}" step="15">`)
          + frow('Centro X/Y/Z', num3('fp_cen', f.params.axisAt || [0, 0, 0]))
          + frow('Eje X/Y/Z', num3('fp_axis', f.params.axisDir || [0, 0, 1]));
      } else {
        dims += frow('Nº X / Sep X', `<span style="display:flex;gap:4px;flex:1">
            <input type="number" id="fp_nx" value="${f.params.nx}" step="1" style="width:50%">
            <input type="number" id="fp_dx" value="${f.params.dx}" step="1" style="width:50%"></span>`)
          + frow('Nº Y / Sep Y', `<span style="display:flex;gap:4px;flex:1">
            <input type="number" id="fp_ny" value="${f.params.ny}" step="1" style="width:50%">
            <input type="number" id="fp_dy" value="${f.params.dy}" step="1" style="width:50%"></span>`);
      }
    }
    if (f.shape === 'sketch' || f.shape === 'revolve') {
      dims = f.shape === 'sketch' ? frow('Altura', `<input type="number" id="fp_h" value="${f.params.h}" step="0.5">`) : frow('Giro', '<b>360°</b>');
      if (f.params.entities) {
        dims += `<div class="btnrow"><button id="fp_editsk">✏ Editar boceto</button></div>`;
        dims += frow('Entidades', `<b>${f.params.entities.length}</b>`);
        dims += frow('Mostrar boceto', `<input type="checkbox" id="fp_showsk" ${f.showSketch ? 'checked' : ''}>`);
        (f.params.dims || []).forEach((d, i) => {
          const val = SK.measureDim(f.params.entities, d);
          dims += frow(`Cota ${d.locked ? '🔒' : '( )'}${DIM_PREFIX[d.kind]}`, `<input type="number" id="fp_dim${i}" value="${val === null ? '' : +val.toFixed(2)}" step="0.5" ${d.locked ? '' : 'title="referencia (no dirige)"'}>`);
        });
      } else {
        dims += frow('Puntos', `<b>${f.params.pts.length}</b>`);
      }
    }
    const ubic = (['pestana', 'pattern'].includes(f.shape) ? '' : frow('Posición X/Y/Z', num3('fp_at', f.at)))
      + (['box', 'chapaBase', 'pestana', 'pattern'].includes(f.shape) ? '' : frow('Eje X/Y/Z', num3('fp_dir', f.dir)));
    body.innerHTML = `
      ${crumb([{ t: p.name, id: p.id }, { t: f.name }])}
      ${sec('Operación',
        frow('Nombre', `<input type="text" id="fp_name" value="${esc(f.name)}">`)
        + frow('Tipo', `${f.op === 'cut' ? 'corte' : 'unión'}${f.suppressed ? ' · ⏸ suprimida' : ''}`))}
      ${sec('Geometría', dims)}
      ${sec('Ubicación', ubic)}
      <div class="btnrow">
        <button id="fp_apply">Regenerar</button>
        <button id="fp_del" class="danger">Eliminar</button>
      </div>`;
    const editSk = $('fp_editsk');
    if (editSk) editSk.onclick = () => enterSketchForFeature(p, f);
    $('fp_apply').onclick = () => {
      pushUndo();
      f.name = $('fp_name').value || f.name;
      if (f.shape === 'chapaBase') {
        Object.assign(f.params, {
          w: +$('fp_w').value, d: +$('fp_d').value, t: Math.max(0.1, +$('fp_t').value),
          radio: Math.max(0.1, +$('fp_radio').value), k: Math.min(1, Math.max(0, +$('fp_k').value)),
        });
        f.name = `Chapa ${f.params.w}×${f.params.d}×${f.params.t}`;
      }
      if (f.shape === 'pestana') {
        Object.assign(f.params, {
          altura: Math.max(0, +$('fp_altura').value),
          angulo: Math.min(170, Math.max(1, +$('fp_angulo').value)),
          radio: Math.max(0.1, +$('fp_radio').value),
          dirBend: $('fp_dirb').value,
          e1: Math.max(0, +$('fp_e1').value), e2: Math.max(0, +$('fp_e2').value),
        });
        f.name = `Pestaña ${f.params.angulo}° R${f.params.radio}`;
      }
      if (f.shape === 'box') { readDimField(f, 'fp_w', 'w'); readDimField(f, 'fp_d', 'd'); readDimField(f, 'fp_hh', 'h'); }
      if (f.shape === 'sketch' || f.shape === 'revolve') {
        if (f.shape === 'sketch') f.params.h = +$('fp_h').value;
        const sk = $('fp_showsk');
        if (sk) f.showSketch = sk.checked;
        (f.params.dims || []).forEach((d, i) => {
          const el = $(`fp_dim${i}`);
          if (!el) return;
          const nv = +el.value;
          const cur = SK.measureDim(f.params.entities, d);
          if (nv > 0 && cur !== null && Math.abs(nv - cur) > 1e-6) {
            SK.applyDim(f.params.entities, d, nv);
          }
        });
      }
      if (f.shape === 'cylinder') { readDimField(f, 'fp_dia', 'dia'); readDimField(f, 'fp_h', 'h'); }
      if (f.shape === 'hole') {
        readDimField(f, 'fp_dia', 'dia');
        readDimField(f, 'fp_depth', 'depth');
        f.params.through = $('fp_through').checked;
        if ($('fp_seat')) f.params.seat = $('fp_seat').value;
        if ($('fp_seatdia')) f.params.seatDia = +$('fp_seatdia').value;
        if ($('fp_seatdepth')) f.params.seatDepth = +$('fp_seatdepth').value;
        f.name = `Agujero Ø${f.params.dia}`;
      }
      if (f.shape === 'pattern') {
        if (f.params.kind === 'circ') {
          f.params.n = Math.max(2, Math.round(+$('fp_n').value));
          f.params.angle = +$('fp_angle').value;
          f.params.axisAt = readNum3('fp_cen');
          f.params.axisDir = readNum3('fp_axis');
        } else {
          f.params.nx = Math.max(1, Math.round(+$('fp_nx').value));
          f.params.ny = Math.max(1, Math.round(+$('fp_ny').value));
          f.params.dx = +$('fp_dx').value;
          f.params.dy = +$('fp_dy').value;
        }
      }
      if (!['pestana', 'pattern'].includes(f.shape)) f.at = readNum3('fp_at');
      if (!['box', 'chapaBase', 'pestana', 'pattern'].includes(f.shape)) f.dir = readNum3('fp_dir');
      faceCache.clear();
      rebuildPart(p);
      commit('Función regenerada.');
    };
    $('fp_del').onclick = () => {
      pushUndo();
      p.features = p.features.filter(x => x.id !== f.id);
      selection = { kind: 'part', id: p.id };
      rebuildPart(p);
      commit('Función eliminada.');
    };
    return;
  }

  if (selection.kind === 'constraint') {
    const c = doc.constraints.find(x => x.id === selection.id);
    if (!c) { selection = null; return refreshProps(); }
    const label = { mate: 'Coincidir caras', flush: 'Alinear caras', concentric: 'Concéntrico' }[c.type];
    body.innerHTML = `
      ${frow('Tipo', `<b>${label}</b>`)}
      ${'offset' in c ? frow('Separación (mm)', `<input type="number" id="cp_off" value="${c.offset || 0}" step="0.5">`) : ''}
      <div class="btnrow">
        ${'offset' in c ? '<button id="cp_apply">Aplicar</button>' : ''}
        <button id="cp_del" class="danger">Eliminar</button>
      </div>`;
    const ap = $('cp_apply');
    if (ap) ap.onclick = () => { pushUndo(); c.offset = +$('cp_off').value; solveAndSync(); commit('Restricción actualizada.'); };
    $('cp_del').onclick = () => {
      pushUndo();
      doc.constraints = doc.constraints.filter(x => x.id !== c.id);
      selection = null;
      refreshUI();
      commit('Restricción eliminada.');
    };
  }
}

const frow = (label, control) => `<div class="frow"><label>${label}</label>${control}</div>`;
// Property Panel estilo Inventor 2026: breadcrumb + secciones de acordeón.
// Migas de pan: array de {t, id?} — el nivel con id es clicable (salta a él).
const crumb = (levels) => `<div class="pp-crumb">${levels.map((l, i) =>
  `${i ? '<span class="sep">▸</span>' : ''}<span class="lvl${i === levels.length - 1 ? ' cur' : ''}${l.id ? ' link' : ''}"${l.id ? ` data-crumb="${l.id}"` : ''}>${esc(l.t)}</span>`).join('')}</div>`;
// Sección colapsable (revelación progresiva): <details> nativo, sin JS de estado.
const sec = (title, inner, open = true) => inner
  ? `<details class="pp-sec"${open ? ' open' : ''}><summary>${esc(title)}</summary><div class="pp-secbody">${inner}</div></details>` : '';
const num3 = (id, v) => `<span style="display:flex;gap:4px;flex:1">
  <input type="number" id="${id}x" value="${+(+v[0]).toFixed(3)}" step="0.5" style="width:33%">
  <input type="number" id="${id}y" value="${+(+v[1]).toFixed(3)}" step="0.5" style="width:33%">
  <input type="number" id="${id}z" value="${+(+v[2]).toFixed(3)}" step="0.5" style="width:33%"></span>`;
const readNum3 = (id) => [+$(id + 'x').value, +$(id + 'y').value, +$(id + 'z').value];

// campo de cota que acepta un número o una EXPRESIÓN (parámetro fx)
const NUM_RE = /^[-+]?(\d+\.?\d*|\.\d+)$/;
const dimVal = (f, key) => (f.expr && key in f.expr) ? f.expr[key] : f.params[key];
const dimInput = (id, f, key) => `<input type="text" inputmode="decimal" id="${id}" value="${esc(String(dimVal(f, key)))}" title="número o fórmula (p. ej. ancho/2)">`;
function readDimField(f, id, key) {
  const raw = String($(id).value).trim();
  f.expr = f.expr || {};
  if (NUM_RE.test(raw)) { f.params[key] = parseFloat(raw); delete f.expr[key]; }
  else { f.expr[key] = raw; const v = evalExpr(raw, resolveParams(doc)); if (Number.isFinite(v)) f.params[key] = v; }
  if (!Object.keys(f.expr).length) delete f.expr;
}

// ---------- Diálogo genérico ----------

const dialog = $('dialog');

function showForm(title, fields, onSubmit, extra) {
  let html = `<h3>${title}</h3>`;
  for (const f of fields) {
    if (f.type === 'checkbox') html += frow(f.label, `<input type="checkbox" id="dlg_${f.key}" ${f.value ? 'checked' : ''}>`);
    else if (f.type === 'select') html += frow(f.label, `<select id="dlg_${f.key}">${f.options.map(o => `<option value="${o[0]}" ${o[0] === f.value ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`);
    else html += frow(f.label, `<input type="number" id="dlg_${f.key}" value="${f.value}" step="${f.step || 1}">`);
  }
  html += `<div class="btnrow"><button id="dlg_ok" class="on">Aceptar</button>${extra ? `<button id="dlg_extra" class="danger">${extra.label}</button>` : ''}<button id="dlg_cancel">Cancelar</button></div>`;
  dialog.innerHTML = html;
  dialog.style.display = 'block';
  $('dlg_ok').onclick = () => {
    const values = {};
    for (const f of fields) {
      const el = $(`dlg_${f.key}`);
      values[f.key] = f.type === 'checkbox' ? el.checked : f.type === 'select' ? el.value : +el.value;
    }
    hideDialog();
    onSubmit(values);
  };
  $('dlg_cancel').onclick = hideDialog;
  if (extra) $('dlg_extra').onclick = () => { hideDialog(); extra.onClick(); };
  const first = dialog.querySelector('input,select');
  if (first) first.focus();
}
function hideDialog() {
  dialog.style.display = 'none'; dialog.innerHTML = '';
  if (typeof clearOpPreview === 'function') clearOpPreview();
  if (typeof clearHolePreview === 'function') clearHolePreview();
}
const dialogOpen = () => dialog.style.display === 'block';

// ---------- Modos ----------

const MODE_HINTS = {
  select: '',
  sketch: 'Boceto: toca una cara plana. Las aristas del modelo se proyectan como referencias con snap.',
  hole: 'Agujero: haz clic sobre una cara plana de una pieza.',
  pestana: 'Pestaña: toca cerca de una arista de una pieza de chapa (borde de la base o punta de otra pestaña).',
  mate: 'Coincidir: clic en la cara de la 1.ª pieza, luego en la cara de la 2.ª (la 2.ª se mueve).',
  flush: 'Alinear: clic en la cara de la 1.ª pieza, luego en la cara de la 2.ª (la 2.ª se mueve).',
  concentric: 'Concéntrico: clic cerca de un orificio/cilindro de la 1.ª pieza, luego de la 2.ª.',
  move: 'Mover: arrastra una pieza (Shift o un 2.º dedo = mover en Z). Al soltar se re-aplican las restricciones.',
  measure: 'Medir: toca aristas, caras, circunferencias o paredes cilíndricas (ejes). Con 2 referencias calcula distancia o ángulo.',
  direct: 'Edición directa (símil Inventor): toca una cara y muévela por DISTANCIA (+ alarga / − reduce, la opuesta queda fija) o fija la medida absoluta. Shift+clic acumula VARIAS caras y las mueve todas con una distancia. Escala/gira la pieza en Propiedades.',
  fillet: 'Empalme: toca una arista del sólido para redondearla con un radio (símil Empalme de Inventor).',
  chamfer: 'Chaflán: toca una arista del sólido para achaflanarla (corte a 45°) con una distancia.',
  tochapa: 'A chapa: toca la CARA GRANDE de una placa; reconoce su espesor y contorno real y la convierte en chapa (acepta pestañas y desarrollo DXF/PDF).',
};

const modeButtons = { sketch: 'btnSketch', hole: 'btnHole', pestana: 'btnPestana', mate: 'btnMate', flush: 'btnFlush', concentric: 'btnConcentric', move: 'btnMove', direct: 'btnDirect', fillet: 'btnFillet', chamfer: 'btnChamfer', tochapa: 'btnToChapa', measure: 'btnMeasure' };

function setMode(m) {
  mode = mode === m ? 'select' : m;
  pickStage = null;
  if (mode !== 'sketch' && sketch) cancelSketch(false);
  if (mode !== 'direct') clearDirectSel();
  clearHover();
  clearPickedHighlight();
  if (mode !== 'measure') clearMeasure();
  for (const [k, id] of Object.entries(modeButtons)) $(id).classList.toggle('on', mode === k);
  // En una herramienta activa (mover/editar/medir…) el CLIC IZQUIERDO acciona la
  // herramienta, NO orbita: la órbita queda en botón central/derecho (y 2 dedos).
  // Así no se gira la cámara sin querer mientras se mueve o dibuja una pieza.
  applyOrbitButtons();
  setHint(MODE_HINTS[mode]);
  setStatus(mode === 'select' ? 'Listo.' : 'Modo activo: ' + mode);
  if (mode !== 'select' && isNarrow()) setSidebar(false); // que el panel no tape el modelo
}
for (const [m, id] of Object.entries(modeButtons)) $(id).onclick = () => setMode(m);

// ---------- Entornos Pieza / Ensamble ----------
// Conmutador tipo Inventor: la barra muestra solo las herramientas del
// entorno activo (Sección/Vista/Medir son comunes a ambos).

const ENV_OF_MODE = { sketch: 'pieza', hole: 'pieza', pestana: 'pieza', direct: 'pieza', fillet: 'pieza', chamfer: 'pieza', tochapa: 'pieza',
                      mate: 'ens', flush: 'ens', concentric: 'ens', move: 'ens' };
let env = 'pieza';
function setEnv(e) {
  env = e;
  document.getElementById('rail').classList.toggle('ens', env === 'ens');
  $('envPieza').classList.toggle('on', env !== 'ens');
  $('envEns').classList.toggle('on', env === 'ens');
  if (ENV_OF_MODE[mode] && ENV_OF_MODE[mode] !== env) setMode(mode); // apaga el modo del otro entorno
  setStatus(env === 'ens' ? 'Entorno ENSAMBLE: restricciones, mover, imán y aislar.'
                          : 'Entorno PIEZA: crear piezas y modelar sólidos.');
}
$('envPieza').onclick = () => setEnv('pieza');
$('envEns').onclick = () => setEnv('ens');

// pieza actualmente seleccionada (por el árbol o por clic en el visor)
function selectedPart() {
  return selection?.kind === 'part' ? getPart(doc, selection.id)
       : selection?.partId ? getPart(doc, selection.partId) : null;
}

$('btnIsolate').onclick = () => {
  if (isolatedId) { restoreVisibility(); setStatus('Todas las piezas visibles (des-aislado).'); return; }
  const p = selectedPart();
  if (!p) { setStatus('Toca primero una pieza para aislarla.'); return; }
  isolatePart(p);
};

$('btnDelete').onclick = () => {
  const p = selectedPart();
  if (!p) { setStatus('Toca primero una pieza (en el visor o el árbol) para eliminarla.'); return; }
  deletePart(p);
};

// ---------- Picking ----------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function castAtEvent(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, activeCamera);
  const objs = [...meshes.values()].map(x => x.mesh).filter(m => m.visible);
  const hits = raycaster.intersectObjects(objs, false);
  return hits[0] || null;
}

// resaltado hover de cara
let hoverMesh = null;
const faceCache = new Map(); // `${partId}:${faceIndex}` -> face info

function faceAtHit(hit) {
  const partId = hit.object.userData.partId;
  const key = `${partId}:${hit.faceIndex}`;
  let face = faceCache.get(key);
  if (!face) {
    face = planarFaceFromHit(hit.object.geometry, hit.faceIndex);
    faceCache.set(key, face);
    if (faceCache.size > 300) faceCache.clear();
  }
  return face;
}

function showHover(hit, material) {
  clearHover();
  const face = faceAtHit(hit);
  const g = faceHighlightGeometry(hit.object.geometry, face.tris);
  hoverMesh = new THREE.Mesh(g, material);
  hit.object.add(hoverMesh);
  return face;
}
function clearHover() {
  if (hoverMesh) { hoverMesh.parent?.remove(hoverMesh); hoverMesh.geometry.dispose(); hoverMesh = null; }
}

let pickedMesh = null; // resaltado azul de la 1.ª cara elegida
function keepPickedHighlight(hit, face) {
  clearPickedHighlight();
  const g = faceHighlightGeometry(hit.object.geometry, face.tris);
  pickedMesh = new THREE.Mesh(g, pickedMat);
  hit.object.add(pickedMesh);
}
function clearPickedHighlight() {
  if (pickedMesh) { pickedMesh.parent?.remove(pickedMesh); pickedMesh.geometry.dispose(); pickedMesh = null; }
}

// ---------- Eventos de puntero ----------

let downPos = null, dragging = null;

// Rechazo de palma (tableta + lápiz): mientras se usa el lápiz, los toques
// de la mano apoyada sobre la pantalla se ignoran.
let penUntil = 0;
renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'pen') penUntil = performance.now() + 900;
  else if (ev.pointerType === 'touch' && performance.now() < penUntil) {
    ev.stopImmediatePropagation();
    ev.preventDefault();
  }
}, true);
renderer.domElement.addEventListener('pointermove', (ev) => {
  if (ev.pointerType === 'pen') penUntil = performance.now() + 900;
}, true);

renderer.domElement.addEventListener('pointerdown', (ev) => {
  if (dialogOpen()) return;
  if (isNarrow() && sidebar.classList.contains('open')) setSidebar(false); // tocar fuera cierra el panel
  if (mode === 'sketch' && sketch && ev.button === 0 && !sketch.profileMode) {
    if (sketch.tool === 'pen' && !sketch.stroke) { startStroke(ev); return; }
    if (sketch.tool === 'moveEnt' && !sketch.entDrag) { startEntDrag(ev); return; }
    if (sketch.tool === 'select' && !sketch.marquee && !sketch.copyOp && !sketch.mirrorOp && !sketch.revolveWait) { startMarquee(ev); return; }
  }
  if (dragging) { switchDragVertical(); return; } // 2.º dedo durante el arrastre → mover en Z
  downPos = { x: ev.clientX, y: ev.clientY };
  if (mode === 'move' && ev.button === 0) startMoveDrag(ev);
});

renderer.domElement.addEventListener('pointermove', (ev) => {
  if (dialogOpen()) return;
  if (sketch?.stroke) { moveStroke(ev); return; }
  if (sketch?.marquee) { moveMarquee(ev); return; }
  if (sketch?.entDrag) { moveEntDrag(ev); return; }
  if (dragging) { if (ev.pointerId === dragging.pointerId) updateMoveDrag(ev); return; }
  if (mode === 'sketch' && sketch) { updateSketchPreview(ev); return; }
  if ((ev.pointerType === 'mouse' || ev.pointerType === 'pen') && (['hole', 'mate', 'flush', 'direct'].includes(mode) || (mode === 'sketch' && !sketch))) {
    const hit = castAtEvent(ev);
    if (hit) showHover(hit, hoverMat);
    else clearHover();
  }
});

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (dialogOpen()) return;
  if (sketch?.stroke) { if (ev.pointerId === sketch.stroke.pointerId) endStroke(); return; }
  if (sketch?.marquee) { if (ev.pointerId === sketch.marquee.pointerId) endMarquee(ev); return; }
  if (sketch?.entDrag) { if (ev.pointerId === sketch.entDrag.pointerId) endEntDrag(); return; }
  if (dragging) { if (ev.pointerId === dragging.pointerId) endMoveDrag(); return; }
  if (!downPos) return;
  const moved = Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y);
  downPos = null;
  if (moved > 5 || ev.button !== 0) return; // fue órbita/paneo, no clic
  handleClick(ev);
});

renderer.domElement.addEventListener('pointercancel', () => {
  if (sketch?.stroke) endStroke();
  if (sketch?.marquee) { clearGroup(sketch.preview); sketch.marquee = null; sketchControls.enabled = true; }
  if (sketch?.entDrag) endEntDrag();
  if (dragging) endMoveDrag(); // gesto interrumpido por el sistema (táctil)
  downPos = null;
});

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { hideDialog(); clearDirectSel(); setModeSelect(); }
  if (ev.key === 'z' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); undo(); }
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  // en boceto: Supr/Backspace borra TODA la selección múltiple de entidades
  if ((ev.key === 'Delete' || ev.key === 'Backspace') && sketch && sketch.selIds.size && !dialogOpen() && !typing) {
    ev.preventDefault(); deleteSelectedSketch(); return;
  }
  if (ev.key === 'Delete' && selection && !dialogOpen() && !typing) {
    const btn = $('pp_del') || $('fp_del') || $('cp_del');
    if (btn) { btn.click(); ev.preventDefault(); }
    else if (selection.kind === 'part' || selection.partId) { // pieza elegida en el visor
      const p = selectedPart(); if (p) { deletePart(p); ev.preventDefault(); }
    }
  }
  // atajos de UNA tecla, estilo Inventor (no aplican al escribir en campos)
  if (ev.ctrlKey || ev.metaKey || ev.altKey || dialogOpen() || typing) return;
  const k = ev.key.toLowerCase();
  if (sketch) {
    const TOOL_KEYS = { l: 'line', c: 'circle', r: 'rect', a: 'arc', g: 'polyg', d: 'dim',
                        t: 'trim', e: 'extend', o: 'offset', f: 'fillet', x: 'erase',
                        s: 'select', v: 'moveEnt', p: 'project', z: 'pen' };
    if (TOOL_KEYS[k]) { sketchbar.querySelector(`[data-tool="${TOOL_KEYS[k]}"]`)?.click(); return; }
    if (ev.key === 'Enter') { document.getElementById('skClose')?.click(); return; }
    return;
  }
  const MODE_KEYS = { b: 'sketch', h: 'hole', m: 'move', d: 'direct', x: 'measure' };
  if (MODE_KEYS[k]) setMode(MODE_KEYS[k]);
});
function setModeSelect() { if (mode !== 'select') setMode(mode); }

function handleClick(ev) {
  const hit = castAtEvent(ev);

  if (mode === 'select' || mode === 'move') {
    if (hit) {
      selection = { kind: 'part', id: hit.object.userData.partId };
      refreshUI();
      setStatus(`Seleccionada: ${getPart(doc, selection.id).name}`);
    }
    return;
  }
  if (mode === 'sketch') return clickSketch(hit, ev);
  if (!hit && mode !== 'measure') { setStatus('Nada bajo el cursor.'); return; }

  if (mode === 'hole') return clickHole(hit);
  if (mode === 'pestana') return clickPestana(hit);
  if (mode === 'mate' || mode === 'flush') return clickMate(hit, mode);
  if (mode === 'concentric') return clickConcentric(hit);
  if (mode === 'direct') return clickDirect(hit, ev);
  if (mode === 'fillet' || mode === 'chamfer') return clickBlend(hit, mode);
  if (mode === 'tochapa') return clickToChapa(hit);
  if (mode === 'measure') return clickMeasure(hit);
}

// ---------- Chapa: pestaña sobre arista ----------

function clickPestana(hit) {
  const part = getPart(doc, hit.object.userData.partId);
  const chapa = part && chapaOf(part);
  if (!chapa) { setStatus('Esa pieza no es de chapa: crea una con ▱ Chapa.'); return; }
  // arista citable más cercana al punto tocado (en coordenadas de mundo)
  const mw = hit.object.matrixWorld;
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  let best = null;
  for (const e of chapaEdges(part)) {
    a.set(...e.a).applyMatrix4(mw);
    b.set(...e.b).applyMatrix4(mw);
    const dist = new THREE.Line3(a, b).closestPointToPoint(hit.point, true, new THREE.Vector3())
      .distanceTo(hit.point);
    if (!best || dist < best.dist) best = { ...e, dist, wa: a.clone(), wb: b.clone() };
  }
  if (!best || best.dist > 25) { setStatus('Toca más cerca de una arista de la chapa.'); return; }
  if (!best.libre) { setStatus('Esa arista ya tiene una pestaña (edítala en el árbol).'); return; }
  // resaltado breve de la arista elegida
  const lg = new THREE.BufferGeometry().setFromPoints([best.wa, best.wb]);
  const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf0a437, linewidth: 3 }));
  scene.add(line);
  setTimeout(() => { scene.remove(line); lg.dispose(); }, 1600);
  const t = chapa.params.t;
  showForm('Pestaña de chapa (desarrollo real con factor K)', [
    { key: 'altura', label: 'Longitud plana (mm)', value: 25 },
    { key: 'angulo', label: 'Ángulo de pliegue (°)', value: 90 },
    { key: 'radio', label: `Radio interior (mm, def=${chapa.params.radio})`, value: chapa.params.radio, step: 0.5 },
    { key: 'dir', label: 'Dirección', type: 'select', value: 'arriba', options: [['arriba', 'Arriba (+n)'], ['abajo', 'Abajo (−n)']] },
    { key: 'e1', label: 'Retranqueo inicio (mm)', value: 0 },
    { key: 'e2', label: 'Retranqueo fin (mm)', value: 0 },
  ], (v) => {
    if (v.altura < 0 || v.angulo <= 0 || v.angulo > 170 || v.radio <= 0) {
      setStatus('Pestaña: ángulo 1–170° y radio > 0.'); return;
    }
    pushUndo();
    part.features.push(makePestana(best.featureId, best.borde, v.altura, v.angulo,
      v.radio, v.dir, Math.max(0, v.e1), Math.max(0, v.e2)));
    faceCache.clear();
    rebuildPart(part);
    commit(`Pestaña ${v.angulo}° R${v.radio} agregada (BA real con K=${chapa.params.k}).`);
  });
}

// ---------- Boceto 2D sobre cara: entidades, cotas, lápiz, recorte ----------

let sketch = null; // estado del boceto activo

const sketchbar = $('sketchbar');
const refMat = new THREE.LineBasicMaterial({ color: 0x5f7fa8 });          // aristas proyectadas
const faceRefMat = new THREE.LineBasicMaterial({ color: 0xffd54a });       // contornos de la cara elegida (amarillo)
const gridMat = new THREE.LineBasicMaterial({ color: 0x2a3040 });          // grilla del plano
const drawMat = new THREE.LineBasicMaterial({ color: 0xf0a437 });          // entidades del boceto
const selEntMat = new THREE.LineBasicMaterial({ color: 0x4d90fe });        // entidad elegida para cota
const projMat = new THREE.LineBasicMaterial({ color: 0x2ee659 });          // entidades proyectadas: verde vivo, destacan sobre las referencias
const previewMat = new THREE.LineBasicMaterial({ color: 0xf0a437, transparent: true, opacity: 0.5 });
const ptMat = new THREE.MeshBasicMaterial({ color: 0xf0a437 });
const snapMat = new THREE.MeshBasicMaterial({ color: 0x34a853 });
const constraintMat = new THREE.MeshBasicMaterial({ color: 0x4d90fe }); // marcador de restricción persistente
// línea guía de inferencia (paralela/perpendicular/horizontal/vertical) estilo Inventor
const guideMat = new THREE.LineDashedMaterial({ color: 0x4d90fe, transparent: true, opacity: 0.65, dashSize: 3, gapSize: 2.5 });

const DIM_PREFIX = { len: 'L ', dia: 'Ø', dist: '↔ ', ang: '∠' };
const DIM_LABEL = { len: 'Largo (mm)', dia: 'Diámetro (mm)', dist: 'Distancia (mm)', ang: 'Ángulo (°)' };

function clearGroup(g) {
  for (const o of [...g.children]) { o.geometry?.dispose?.(); g.remove(o); }
}

function worldPerPixel() {
  return (orthoCam.right - orthoCam.left) / (orthoCam.zoom * renderer.domElement.clientWidth);
}

const to3D = (u, v, lift = 0.1) => sketch.originW.clone()
  .addScaledVector(sketch.uW, u).addScaledVector(sketch.vW, v).addScaledVector(sketch.nW, lift);

// mundo → coordenadas 2D del plano del boceto (proyección ortogonal)
const w2s = (w) => {
  const d = w.clone().sub(sketch.originW);
  return [d.dot(sketch.uW), d.dot(sketch.vW)];
};

function eventTo2D(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, activeCamera);
  const p = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(sketch.plane, p)) return null;
  const d = p.sub(sketch.originW);
  return [d.dot(sketch.uW), d.dot(sketch.vW)];
}

// snap con tipo: extremos, puntos medios, centros y cuadrantes (entidades y
// referencias proyectadas), tangencias al dibujar líneas, o grilla de 1 mm
function snap2D(uv) {
  const tol = 14 * worldPerPixel();
  let best = null, bestD = tol;
  const consider = (p, kind) => {
    const d = Math.hypot(uv[0] - p[0], uv[1] - p[1]);
    if (d < bestD) { best = { p, kind }; bestD = d; }
  };
  for (const s of sketch.snapPts) consider(s.p, s.kind);
  for (const e of sketch.entities) {
    for (const sp of SK.snapPoints(e)) consider(sp.p, sp.kind);
  }
  if (sketch.chainStart) consider(sketch.chainStart, 'inicio');
  // tangencia: dibujando una línea hacia un círculo/arco
  if (sketch.tool === 'line' && sketch.chainLast) {
    for (const e of sketch.entities) {
      if (e.type !== 'circle' && e.type !== 'arc') continue;
      for (const tp of SK.tangentPoints(e.c, e.r, sketch.chainLast)) consider(tp, 'tangente');
    }
  }
  if (best) return { uv: [best.p[0], best.p[1]], snapped: true, kind: best.kind };
  return { uv: [Math.round(uv[0]), Math.round(uv[1])], snapped: false, kind: null };
}

// entidades "línea" ficticias para las referencias proyectadas (nunca se mueven)
function refEntities() {
  return sketch.refSegs.map((s, i) => ({ id: `R${i}`, type: 'line', a: s[0], b: s[1], isRef: true }));
}

function pickEntityAt(uv, includeRefs) {
  const tol = 16 * worldPerPixel();
  let best = null;
  for (const e of sketch.entities) {
    const n = SK.nearestOnEntity(e, uv);
    if (n.d < tol && (!best || n.d < best.d)) best = { ent: e, d: n.d, isRef: false };
  }
  if (includeRefs) {
    for (const e of refEntities()) {
      const n = SK.nearestOnEntity(e, uv);
      if (n.d < tol * 0.8 && (!best || n.d < best.d - 0.05)) best = { ent: e, d: n.d, isRef: true };
    }
  }
  return best;
}

function clickSketch(hit, ev) {
  if (!sketch) {
    if (!hit) { setStatus('Toca una cara plana para bocetar sobre ella.'); return; }
    enterSketch(hit);
    return;
  }
  const raw = eventTo2D(ev);
  if (!raw) return;
  if (sketch.profileMode) return clickProfile(raw);
  if (sketch.revolveWait) return clickRevolveAxis(raw);
  if (sketch.mirrorOp) return clickMirror(raw);
  if (sketch.copyOp) return clickCopy(raw);
  const t = sketch.tool;
  if (t === 'select') { // tap suelto: alterna la entidad tocada
    const pick = pickEntityAt(raw, false);
    if (pick) {
      if (sketch.selIds.has(pick.ent.id)) sketch.selIds.delete(pick.ent.id);
      else sketch.selIds.add(pick.ent.id);
      redrawSketch();
      setStatus(`${sketch.selIds.size} entidad(es) seleccionadas. ⧉ Copiar para duplicar con punto base.`);
    }
    return;
  }
  if (t === 'line') return clickLine(raw);
  if (t === 'rect') return clickRect(raw);
  if (t === 'circle') return clickCircle(raw);
  if (t === 'dim') return clickDim(raw);
  if (t === 'trim') return clickTrim(raw);
  if (t === 'extend') return clickExtend(raw);
  if (t === 'erase') return clickErase(raw);
  if (t === 'arc') return clickArc(raw);
  if (t === 'polyg') return clickPolygon(raw);
  if (t === 'offset') return clickOffset(raw);
  if (t === 'fillet') return clickFillet(raw);
  if (t === 'project') return clickProject(raw, hit);
}

function clickArc(raw) {
  const { uv } = snap2D(raw);
  if (!sketch.temp) { sketch.temp = { c: uv }; setStatus('Arco: toca el punto de INICIO.'); redrawSketch(); return; }
  if (!sketch.temp.start) { sketch.temp.start = uv; setStatus('Arco: toca el punto FINAL (sentido antihorario).'); return; }
  const { c, start } = sketch.temp;
  sketch.temp = null;
  const arc = SK.makeArcCSE(c, start, uv);
  if (arc.r < 0.3) { setStatus('Radio demasiado pequeño.'); return; }
  sketch.entities.push(arc);
  setStatus(`Arco R${arc.r.toFixed(1)} creado.`);
  redrawSketch();
}

function clickPolygon(raw) {
  const { uv } = snap2D(raw);
  if (!sketch.temp) { sketch.temp = uv; setStatus('Polígono: toca un vértice.'); redrawSketch(); return; }
  const c = sketch.temp;
  sketch.temp = null;
  const vtx = uv;
  showForm('Polígono regular', [
    { key: 'n', label: 'Nº de lados', value: 6, step: 1 },
  ], (v) => {
    const lines = SK.regularPolygon(c, vtx, Math.max(3, Math.min(24, Math.round(v.n))));
    if (!lines.length) { setStatus('Polígono inválido.'); return; }
    sketch.entities.push(...lines);
    setStatus(`Polígono de ${lines.length} lados creado.`);
    redrawSketch();
  });
}

function clickOffset(raw) {
  const pick = pickEntityAt(raw, true);
  if (!pick) { setStatus('Equidistancia: toca una entidad o referencia.'); return; }
  const src = pick.ent;
  showForm('Equidistancia (offset)', [
    { key: 'd', label: 'Distancia (mm)', value: 5, step: 0.5 },
  ], (v) => {
    const ne = SK.offsetEntity(src, v.d, raw);
    if (!ne) { setStatus('No se pudo hacer el offset con esa distancia.'); return; }
    sketch.entities.push(ne);
    setStatus(`Offset de ${v.d} mm creado hacia el lado tocado.`);
    redrawSketch();
  });
}

function clickFillet(raw) {
  const pick = pickEntityAt(raw, false);
  if (!pick || pick.ent.type !== 'line') { setStatus('Empalme: toca la 1.ª línea.'); return; }
  if (!sketch.dimPick) {
    sketch.dimPick = pick;
    redrawSketch();
    setStatus('Empalme: toca la 2.ª línea.');
    return;
  }
  const l1 = sketch.dimPick.ent;
  sketch.dimPick = null;
  if (pick.ent.id === l1.id) { redrawSketch(); setStatus('Elige dos líneas distintas.'); return; }
  const l2 = pick.ent;
  showForm('Empalme (redondeo de esquina)', [
    { key: 'r', label: 'Radio (mm)', value: 5, step: 0.5 },
  ], (v) => {
    if (SK.filletLines(sketch.entities, l1, l2, v.r)) {
      pruneDims();
      redrawSketch();
      setStatus(`Empalme R${v.r} aplicado.`);
    } else {
      setStatus('No se pudo empalmar (¿paralelas o radio muy grande?).');
    }
  });
}

function clickErase(raw) {
  // si hay selección múltiple, borrarla toda de una
  if (sketch.selIds.size) { deleteSelectedSketch(); return; }
  const pick = pickEntityAt(raw, false);
  if (!pick) { setStatus('Borrar: toca una entidad del boceto.'); return; }
  sketch.entities = sketch.entities.filter(e => e.id !== pick.ent.id);
  sketch.constraints = sketch.constraints.filter(c => c.a !== pick.ent.id && c.b !== pick.ent.id);
  pruneDims();
  redrawSketch();
  setStatus('Entidad eliminada.');
}

// borra todas las entidades de la selección múltiple (y sus cotas huérfanas)
function deleteSelectedSketch() {
  if (!sketch || !sketch.selIds.size) return;
  const n = sketch.selIds.size;
  sketch.entities = sketch.entities.filter(e => !sketch.selIds.has(e.id));
  sketch.constraints = sketch.constraints.filter(c => !sketch.selIds.has(c.a) && !sketch.selIds.has(c.b));
  sketch.selIds.clear();
  pruneDims();
  redrawSketch();
  setStatus(`${n} entidad(es) borrada(s).`);
}

function enterSketch(hit) {
  const part = getPart(doc, hit.object.userData.partId);
  const face = faceAtHit(hit);
  clearHover();
  beginSketch(part, face.centroid.toArray(), face.normal.toArray(), null);
  setStatus(`Boceto en cara de ${part.name}.`);
}

// reabrir el boceto de una función existente para editarlo en su plano
function enterSketchForFeature(part, f) {
  if (sketch) cancelSketch(true);
  mode = 'sketch';
  $('btnSketch').classList.add('on');
  const nL = new THREE.Vector3(...f.dir).normalize().toArray();
  beginSketch(part, [...f.at], nL, [...f.params.u]);
  sketch.editFeature = f;
  sketch.entities = JSON.parse(JSON.stringify(f.params.entities || []));
  sketch.dims = JSON.parse(JSON.stringify(f.params.dims || []));
  sketch.constraints = JSON.parse(JSON.stringify(f.params.constraints || []));
  sketch.excluded = new Set(f.params.excluded || []);
  syncDimEls();
  redrawSketch();
  setStatus(`Editando el boceto de "${f.name}" — ✔ guarda los cambios en la función.`);
}

function beginSketch(part, originL, nL, uL) {
  const m = partMatrix(part);
  const q = new THREE.Quaternion(...part.quat);
  const nLv = new THREE.Vector3(...nL).normalize();
  let uLv;
  if (uL) {
    uLv = new THREE.Vector3(...uL);
    uLv.addScaledVector(nLv, -uLv.dot(nLv)).normalize();
  } else {
    uLv = planeBasis(nL).u;
  }
  const vLv = new THREE.Vector3().crossVectors(nLv, uLv);
  const originW = new THREE.Vector3(...originL).applyMatrix4(m);
  const nW = nLv.clone().applyQuaternion(q).normalize();
  const uW = uLv.clone().applyQuaternion(q).normalize();
  const vW = vLv.clone().applyQuaternion(q).normalize();
  const uLb = uLv.toArray();

  sketch = {
    part,
    originL, nL, uL: uLb,
    originW, nW, uW, vW,
    editFeature: null,
    plane: new THREE.Plane().setFromNormalAndCoplanarPoint(nW, originW),
    entities: [], dims: [], constraints: [], dimEls: new Map(),
    chainStart: null, chainLast: null, temp: null, dimPick: null, stroke: null,
    entDrag: null, profileMode: false, excluded: new Set(),
    selIds: new Set(), marquee: null, copyOp: null,
    faceSegs: [], refPrims: [], orbit: false,
    angleSnap: 15, angLock: null, dynAnchor: null,
    tool: 'line',
    snapPts: [], refSegs: [],
    group: new THREE.Group(),
    draw: new THREE.Group(),
    preview: new THREE.Group(),
    fills: new THREE.Group(),
  };
  sketch.group.add(sketch.draw, sketch.preview, sketch.fills);
  overlay.add(sketch.group);

  buildSketchReferences();

  mainView = 'persp';
  viewBtn?.classList.remove('on');
  orthoViewSize = Math.max(80, sketch.extent * 2.6);
  orthoCam.zoom = 1;
  orthoCam.up.copy(vW);
  orthoCam.position.copy(originW).addScaledVector(nW, 500);
  orthoCam.lookAt(originW);
  sketchControls.target.copy(originW);
  sketchControls.enableRotate = false;
  sketchControls.mouseButtons.LEFT = -1;  // en el boceto el izquierdo dibuja
  sketchControls.touches.ONE = -1;
  document.getElementById('skOrbit')?.classList.remove('on');
  window.__updateLockIcon?.();
  activeCamera = orthoCam;
  controls.enabled = false;
  sketchControls.enabled = true;
  resize();

  for (const b of sketchbar.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === 'line');
  sketchbar.classList.add('open');
  dynSnap.textContent = sketch.angleSnap ? `⊾ ${sketch.angleSnap}°` : '⊾ off';
  dynLock.textContent = '🔓'; dynLock.classList.remove('on');
  hideDynBox();
  setHint('Línea/círculo: escribe longitud/diámetro y Enter (o toca el punto). Snap de ángulo con ⊾. Cota: toca 1 o 2 entidades. ✔ extruye.');
}

// proyecta las aristas analíticas de TODAS las piezas visibles al plano
// (vista ortogonal completa del modelo, sin ruido de triangulación CSG)
function buildSketchReferences() {
  const segs = [];
  let maxR = 20;
  for (const part of doc.parts) {
    if (!part.visible) continue;
    const m = partMatrix(part);
    const skipId = (sketch.editFeature && part.id === sketch.part.id) ? sketch.editFeature.id : undefined;
    for (const [pa, pb] of referenceEdges(part, 36, skipId)) {
      const a = pa.clone().applyMatrix4(m);
      const b = pb.clone().applyMatrix4(m);
      const da = a.sub(sketch.originW), db = b.sub(sketch.originW);
      const ha = da.dot(sketch.nW), hb = db.dot(sketch.nW); // altura sobre el plano
      const s = [da.dot(sketch.uW), da.dot(sketch.vW)];
      const e = [db.dot(sketch.uW), db.dot(sketch.vW)];
      const len = Math.hypot(s[0] - e[0], s[1] - e[1]);
      if (len < 1e-4) continue; // arista normal al plano
      segs.push([s, e]);
      // contornos EN el plano de la cara (exteriores e interiores) → amarillos
      if (Math.abs(ha) < 0.05 && Math.abs(hb) < 0.05) sketch.faceSegs.push([s, e]);
      sketch.snapPts.push({ p: s, kind: 'extremo' }, { p: e, kind: 'extremo' });
      if (len > 4) sketch.snapPts.push({ p: [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2], kind: 'medio' });
      maxR = Math.max(maxR, Math.hypot(...s), Math.hypot(...e));
    }
    // centros de círculos (agujeros, cilindros, bocetos) como imanes de snap
    for (const cp of referencePoints(part, skipId)) {
      const w = cp.clone().applyMatrix4(m).sub(sketch.originW);
      sketch.snapPts.push({ p: [w.dot(sketch.uW), w.dot(sketch.vW)], kind: 'centro' });
    }
    // primitivas tipadas (línea/círculo exactos) para la herramienta Proyectar
    const q = new THREE.Quaternion(...part.quat);
    const prims = referencePrimitives(part);
    for (const ln of prims.lines) {
      const a = w2s(ln.a.clone().applyMatrix4(m)), b = w2s(ln.b.clone().applyMatrix4(m));
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.05) sketch.refPrims.push({ type: 'line', a, b });
    }
    for (const ci of prims.circles) {
      const dirW = ci.dir.clone().applyQuaternion(q).normalize();
      if (Math.abs(dirW.dot(sketch.nW)) < 0.999) continue; // inclinado → elipse: no proyectable
      sketch.refPrims.push({ type: 'circle', c: w2s(ci.c.clone().applyMatrix4(m)), r: ci.r });
    }
  }
  sketch.extent = maxR;
  sketch.refSegs = segs;

  const S = Math.ceil(maxR * 1.3 / 10) * 10;
  const gpts = [];
  for (let k = -S; k <= S; k += 5) {
    gpts.push(to3D(-S, k, 0.02), to3D(S, k, 0.02), to3D(k, -S, 0.02), to3D(k, S, 0.02));
  }
  sketch.group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gpts), gridMat));
  const faceSet = new Set(sketch.faceSegs);
  const rpts = [], ypts = [];
  for (const seg of segs) {
    const [s, e] = seg;
    const arr = faceSet.has(seg) ? ypts : rpts;
    arr.push(to3D(s[0], s[1], faceSet.has(seg) ? 0.09 : 0.06), to3D(e[0], e[1], faceSet.has(seg) ? 0.09 : 0.06));
  }
  sketch.group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rpts), refMat));
  sketch.group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ypts), faceRefMat));
}

// --- herramientas de dibujo ---

// --- Entrada dinámica (longitud / ángulo) estilo Inventor ---

const dynBox = $('dynBox');
const dynLen = $('dyn_len'), dynAng = $('dyn_ang'), dynLock = $('dyn_lock'), dynSnap = $('dyn_snap');
const dynEditing = () => document.activeElement === dynLen || document.activeElement === dynAng;

// ángulo (grados) desde 'from' a 'to', normalizado a [-180,180)
function angleFromTo(from, to) {
  return Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
}
// aplica el snap de ángulo (múltiplos) salvo que esté bloqueado o ajustado a un punto notable
function snapAngle(deg) {
  const s = sketch.angleSnap;
  if (!s) return deg;
  return Math.round(deg / s) * s;
}
// punto a longitud/ángulo desde un origen
function polarPoint(from, len, deg) {
  const r = deg * Math.PI / 180;
  return [from[0] + len * Math.cos(r), from[1] + len * Math.sin(r)];
}

// distancia angular mínima (grados) entre dos ángulos, en [0,180]
function angDelta(a, b) { return Math.abs(((a - b) % 360 + 540) % 360 - 180); }

// glyph + rótulo de cada restricción inferida (estilo Inventor)
const INFER_GLYPH = { horizontal: '—', vertical: '│', parallel: '∥', perpendicular: '⟂', tangente: '◠', coincidente: '⌖' };
const INFER_ES = { horizontal: 'Horizontal', vertical: 'Vertical', parallel: 'Paralela', perpendicular: 'Perpendicular', tangente: 'Tangente', coincidente: 'Coincidente' };
const inferBadgeEl = document.getElementById('inferBadge');
function showInferBadge(kind, pt2d) {
  if (!inferBadgeEl) return;
  if (!kind) { inferBadgeEl.style.display = 'none'; return; }
  const v = to3D(pt2d[0], pt2d[1]).project(activeCamera);
  const r = renderer.domElement.getBoundingClientRect();
  inferBadgeEl.textContent = INFER_GLYPH[kind] || '';
  inferBadgeEl.title = INFER_ES[kind] || '';
  inferBadgeEl.style.left = `${(v.x * 0.5 + 0.5) * r.width}px`;
  inferBadgeEl.style.top = `${(-v.y * 0.5 + 0.5) * r.height}px`;
  inferBadgeEl.style.display = 'block';
}
function hideInferBadge() { if (inferBadgeEl) inferBadgeEl.style.display = 'none'; }

// Inferencia de restricciones estilo Inventor: mientras se traza una línea,
// deduce si es horizontal, vertical, paralela o perpendicular a la geometría
// existente y ajusta el ángulo (dentro de una tolerancia). No crea relaciones
// persistentes: solo guía el trazo y comunica la relación (glyph + guía).
function inferAngle(from, rawAng) {
  const TOL = 6; // grados de captura
  const cands = [{ base: 0, kind: 'horizontal' }, { base: 90, kind: 'vertical' }];
  for (const e of sketch.entities) {
    if (e.type !== 'line') continue;
    const a = Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]) * 180 / Math.PI;
    cands.push({ base: a, kind: 'parallel' });
    cands.push({ base: a + 90, kind: 'perpendicular' });
  }
  let best = null;
  for (const c of cands) {
    for (const t of [c.base, c.base + 180]) {
      const d = angDelta(rawAng, t);
      // H/V ganan empates frente a paralela/perpendicular (más significativas)
      const rank = (c.kind === 'horizontal' || c.kind === 'vertical') ? d - 0.5 : d;
      if (d < TOL && (!best || rank < best.rank)) best = { rank, ang: ((t % 360) + 360) % 360, kind: c.kind };
    }
  }
  return best;
}

// resuelve el extremo de la línea en curso desde el cursor: respeta snap a
// punto notable; si no, infiere restricción (H/V/∥/⊥); si no, snap/lock de
// ángulo. Devuelve {end, len, ang, onPoint, infer, guide}
function resolveLineEnd(raw) {
  const from = sketch.chainLast;
  const sn = snap2D(raw);
  if (sn.snapped) {
    // relación H/V implícita si el punto notable queda alineado con el origen
    const dx = Math.abs(sn.uv[0] - from[0]), dy = Math.abs(sn.uv[1] - from[1]);
    let infer = sn.kind === 'tangente' ? 'tangente' : null;
    if (!infer && (dx > 1e-6 || dy > 1e-6)) { if (dy < dx * 0.02) infer = 'horizontal'; else if (dx < dy * 0.02) infer = 'vertical'; }
    if (!infer) infer = 'coincidente'; // pegado a un punto notable → glyph de coincidencia (estilo Inventor)
    return { end: sn.uv, len: Math.hypot(dx, dy), ang: angleFromTo(from, sn.uv), onPoint: true, infer, guide: null };
  }
  const rawLen = Math.hypot(raw[0] - from[0], raw[1] - from[1]);
  if (sketch.angLock != null) {
    return { end: polarPoint(from, rawLen, sketch.angLock), len: rawLen, ang: sketch.angLock, onPoint: false, infer: null, guide: null };
  }
  const inf = rawLen > 1e-3 ? inferAngle(from, angleFromTo(from, raw)) : null;
  if (inf) {
    const r = inf.ang * Math.PI / 180, dir = [Math.cos(r), Math.sin(r)];
    const len = Math.max(0, (raw[0] - from[0]) * dir[0] + (raw[1] - from[1]) * dir[1]);
    const end = [from[0] + dir[0] * len, from[1] + dir[1] * len];
    const G = 1000; // guía larga a ambos lados del origen
    const guide = [[from[0] - dir[0] * G, from[1] - dir[1] * G], [from[0] + dir[0] * G, from[1] + dir[1] * G]];
    return { end, len, ang: inf.ang, onPoint: false, infer: inf.kind, guide };
  }
  const ang = snapAngle(angleFromTo(from, raw));
  return { end: polarPoint(from, rawLen, ang), len: rawLen, ang, onPoint: false, infer: null, guide: null };
}

// modo del cuadro dinámico: círculo → pide solo Ø; línea → L + ∠ + snap
function setDynMode(isCircle) {
  document.getElementById('dyn_len_lbl').textContent = isCircle ? 'Ø' : 'L';
  document.getElementById('dyn_angwrap').style.display = isCircle ? 'none' : '';
  dynSnap.style.display = isCircle ? 'none' : '';
  dynLen.placeholder = isCircle ? 'Ø mm' : 'mm';
}

function showDynBox(anchor2d) {
  sketch.dynAnchor = anchor2d;
  setDynMode(sketch.tool === 'circle');
  dynBox.classList.add('on');
  positionDynBox();
}
function hideDynBox() {
  dynBox.classList.remove('on');
  sketch.dynAnchor = null;
}
function positionDynBox() {
  if (!sketch?.dynAnchor) return;
  const v = to3D(sketch.dynAnchor[0], sketch.dynAnchor[1]).project(activeCamera);
  const r = renderer.domElement.getBoundingClientRect();
  dynBox.style.left = `${(v.x * 0.5 + 0.5) * r.width}px`;
  dynBox.style.top = `${(-v.y * 0.5 + 0.5) * r.height}px`;
}
// refresca los campos con valores en vivo (sin pisar lo que el usuario teclea)
function updateDynFields(len, ang) {
  if (document.activeElement !== dynLen) dynLen.value = len != null ? +len.toFixed(2) : '';
  if (document.activeElement !== dynAng && sketch.angLock == null) dynAng.value = ang != null ? +ang.toFixed(1) : '';
}

dynSnap.onclick = () => {
  const steps = [0, 5, 15, 45];
  const i = steps.indexOf(sketch.angleSnap);
  sketch.angleSnap = steps[(i + 1) % steps.length];
  dynSnap.textContent = sketch.angleSnap ? `⊾ ${sketch.angleSnap}°` : '⊾ off';
};
dynLock.onclick = () => {
  if (sketch.angLock != null) { sketch.angLock = null; dynLock.textContent = '🔓'; dynLock.classList.remove('on'); }
  else { sketch.angLock = +dynAng.value || 0; dynLock.textContent = '🔒'; dynLock.classList.add('on'); }
};
// Enter en longitud/ángulo confirma el segmento (o crea el círculo)
function dynCommit() {
  if (sketch.tool === 'circle' && sketch.temp) {
    const dia = +dynLen.value;
    if (!(dia > 0)) { setStatus('Escribe un diámetro mayor que 0.'); return; }
    sketch.entities.push(SK.makeCircle(sketch.temp, dia / 2));
    sketch.temp = null;
    hideDynBox();
    setStatus(`Círculo Ø${dia} mm.`);
    redrawSketch();
    return;
  }
  if (sketch.tool === 'line' && sketch.chainLast) {
    const len = +dynLen.value;
    if (!(len > 0)) { setStatus('Escribe una longitud mayor que 0.'); return; }
    const ang = sketch.angLock != null ? sketch.angLock : (dynAng.value !== '' ? +dynAng.value : snapAngle(angleFromTo(sketch.chainLast, lastPreviewRaw || sketch.chainLast)));
    const end = polarPoint(sketch.chainLast, len, ang);
    sketch.entities.push(SK.makeLine(sketch.chainLast, end));
    sketch.chainLast = end;
    sketch.angLock = null; dynLock.textContent = '🔓'; dynLock.classList.remove('on');
    dynLen.value = ''; dynAng.value = '';
    showDynBox(end);
    setStatus(`Segmento ${len} mm a ${ang.toFixed(1)}°. Sigue o Esc para terminar.`);
    redrawSketch();
    dynLen.focus();
  }
}
for (const el of [dynLen, dynAng]) {
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); dynCommit(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); dynLen.blur(); cancelCurrentDraw(); }
  });
  // al empezar a teclear la longitud, congela el ángulo en el valor en vivo
  el.addEventListener('focus', () => {
    if (el === dynLen && sketch?.tool === 'line' && sketch.angLock == null && dynAng.value !== '') {
      sketch.angLock = +dynAng.value; dynLock.textContent = '🔒'; dynLock.classList.add('on');
    }
  });
}
let lastPreviewRaw = null;
function cancelCurrentDraw() {
  sketch.chainStart = sketch.chainLast = null;
  sketch.temp = null;
  hideDynBox();
  hideInferBadge();
  clearGroup(sketch.preview);
  redrawSketch();
  setStatus('Trazo cancelado. Elige una herramienta o toca para empezar.');
}

function clickLine(raw) {
  const res = sketch.chainLast ? resolveLineEnd(raw) : null;
  const { uv } = snap2D(raw);
  if (!sketch.chainLast) {
    sketch.chainStart = uv;
    sketch.chainLast = uv;
    showDynBox(uv);
    setStatus(`Inicio en (${uv[0].toFixed(1)}, ${uv[1].toFixed(1)}). Mueve para la dirección y escribe la longitud, o toca el siguiente punto (el 1.º cierra).`);
    redrawSketch();
    dynLen.focus();
    return;
  }
  const end = res.end;
  const closing = sketch.entities.length && Math.hypot(end[0] - sketch.chainStart[0], end[1] - sketch.chainStart[1]) < 16 * worldPerPixel();
  const tgt = closing ? sketch.chainStart : end;
  if (Math.hypot(tgt[0] - sketch.chainLast[0], tgt[1] - sketch.chainLast[1]) > 1e-3) {
    const ln = SK.makeLine(sketch.chainLast, tgt);
    sketch.entities.push(ln);
    // persistencia estilo Inventor: la relación H/V que se mostró al trazar se
    // guarda (el segmento ya la cumple, no hace falta resolver ahora). Al cerrar
    // el contorno el destino es chainStart (no el extremo inferido) → no se persiste.
    if (!closing && res && (res.infer === 'horizontal' || res.infer === 'vertical')) {
      sketch.constraints.push(SK.makeConstraint(res.infer, ln.id));
    }
  }
  if (closing) {
    sketch.chainStart = sketch.chainLast = null;
    hideDynBox();
    setStatus('Contorno cerrado. ✔ para extruir o sigue dibujando.');
  } else {
    sketch.chainLast = tgt;
    sketch.angLock = null; dynLock.textContent = '🔓'; dynLock.classList.remove('on');
    dynLen.value = ''; dynAng.value = '';
    showDynBox(tgt);
    setStatus(`Punto (${tgt[0].toFixed(1)}, ${tgt[1].toFixed(1)}) mm`);
  }
  redrawSketch();
}

function clickRect(raw) {
  const { uv } = snap2D(raw);
  if (!sketch.temp) { sketch.temp = uv; setStatus('Toca la esquina opuesta.'); redrawSketch(); return; }
  const [x1, y1] = sketch.temp, [x2, y2] = uv;
  sketch.temp = null;
  if (Math.abs(x2 - x1) < 0.5 || Math.abs(y2 - y1) < 0.5) { setStatus('Rectángulo demasiado angosto.'); return; }
  const bottom = SK.makeLine([x1, y1], [x2, y1]), right = SK.makeLine([x2, y1], [x2, y2]);
  const top = SK.makeLine([x2, y2], [x1, y2]), left = SK.makeLine([x1, y2], [x1, y1]);
  sketch.entities.push(bottom, right, top, left);
  // el rectángulo nace restringido (como Inventor): lados H/V
  sketch.constraints.push(
    SK.makeConstraint('horizontal', bottom.id), SK.makeConstraint('horizontal', top.id),
    SK.makeConstraint('vertical', right.id), SK.makeConstraint('vertical', left.id));
  setStatus(`Rectángulo ${Math.abs(x2 - x1).toFixed(1)}×${Math.abs(y2 - y1).toFixed(1)} mm (lados H/V restringidos).`);
  redrawSketch();
}

function clickCircle(raw) {
  const { uv } = snap2D(raw);
  if (!sketch.temp) {
    sketch.temp = uv;
    showDynBox(uv);
    dynLen.value = '';
    setStatus('Centro fijado. Escribe el diámetro y Enter, o toca un punto del contorno.');
    redrawSketch();
    dynLen.focus();
    return;
  }
  const [cx, cy] = sketch.temp;
  sketch.temp = null;
  hideDynBox();
  const r = Math.hypot(uv[0] - cx, uv[1] - cy);
  if (r < 0.5) { setStatus('Radio demasiado pequeño.'); return; }
  sketch.entities.push(SK.makeCircle([cx, cy], r));
  setStatus(`Círculo Ø${(2 * r).toFixed(1)} mm.`);
  redrawSketch();
}

// --- cotas ---

function clickDim(raw) {
  const pick = pickEntityAt(raw, true);
  if (!sketch.dimPick) {
    if (!pick) { setStatus('Cota: toca una entidad del boceto o una línea de referencia.'); return; }
    sketch.dimPick = pick;
    redrawSketch();
    setStatus(`${pick.isRef ? 'Referencia' : 'Entidad'} elegida. Toca otra entidad para distancia/ángulo, o un espacio vacío para cota simple.`);
    return;
  }
  const first = sketch.dimPick;
  sketch.dimPick = null;

  if (pick && pick.ent.id !== first.ent.id) {
    // cota de dos entidades: distancia o ángulo
    if (first.isRef && pick.isRef) { redrawSketch(); setStatus('Ambas son referencias fijas: elige al menos una entidad del boceto.'); return; }
    const refOf = (p) => p.isRef ? { ref: [p.ent.a, p.ent.b] } : { id: p.ent.id };
    let kind = 'dist';
    if (first.ent.type === 'line' && pick.ent.type === 'line') {
      const d1 = [first.ent.b[0] - first.ent.a[0], first.ent.b[1] - first.ent.a[1]];
      const d2 = [pick.ent.b[0] - pick.ent.a[0], pick.ent.b[1] - pick.ent.a[1]];
      const cr = Math.abs(d1[0] * d2[1] - d1[1] * d2[0]) / ((Math.hypot(...d1) * Math.hypot(...d2)) || 1);
      kind = cr < Math.sin(3 * Math.PI / 180) ? 'dist' : 'ang';
    }
    const dim = SK.makeDim(kind, refOf(first), refOf(pick), 0, raw);
    dim.value = SK.measureDim(sketch.entities, dim) ?? 0;
    sketch.dims.push(dim);
    syncDimEls();
    redrawSketch();
    openDimDialog(dim);
    return;
  }

  // cota simple de la primera entidad
  if (first.isRef) { redrawSketch(); setStatus('Una referencia sola no se acota: combínala con una entidad del boceto.'); return; }
  const kind = first.ent.type === 'line' ? 'len' : 'dia';
  const dim = SK.makeDim(kind, { id: first.ent.id }, null, 0, raw);
  dim.value = SK.measureDim(sketch.entities, dim) ?? 0;
  sketch.dims.push(dim);
  syncDimEls();
  redrawSketch();
  openDimDialog(dim);
}

function openDimDialog(dim) {
  const cur = SK.measureDim(sketch.entities, dim);
  showForm(`Cota ${DIM_PREFIX[dim.kind].trim()}`, [
    { key: 'v', label: DIM_LABEL[dim.kind], value: +(cur ?? dim.value).toFixed(2), step: 0.5 },
    { key: 'locked', label: '🔒 Directriz (dirige; si no, referencia)', type: 'checkbox', value: !!dim.locked },
  ], (v) => {
    dim.locked = v.locked;
    if (!(v.v > 0)) { setStatus('Valor inválido.'); return; }
    // referencia (driven): solo mide, no dirige la geometría (no se aplica valor)
    if (!dim.locked) {
      SK.applyLockedDims(sketch.entities, sketch.dims);
      updateSketchLabels(); redrawSketch();
      setStatus(`Cota de referencia: (${DIM_PREFIX[dim.kind]}${cur != null ? cur.toFixed(1) : v.v}). Mide, no dirige.`);
      return;
    }
    if (SK.applyDim(sketch.entities, dim, v.v)) {
      SK.applyLockedDims(sketch.entities, sketch.dims, dim.id); // las 🔒 se mantienen
      redrawSketch();
      setStatus(`Cota directriz aplicada: 🔒${DIM_PREFIX[dim.kind]}${v.v}.`);
    } else {
      setStatus('No se pudo aplicar esa cota (¿referencia fija o entidades no compatibles?).');
    }
  }, {
    label: '🗑 Eliminar',
    onClick() {
      sketch.dims = sketch.dims.filter(d => d.id !== dim.id);
      syncDimEls();
      setStatus('Cota eliminada.');
    },
  });
}

// etiquetas HTML de cotas sobre el viewport
function syncDimEls() {
  if (!sketch) return;
  for (const [id, el] of sketch.dimEls) {
    if (!sketch.dims.find(d => d.id === id)) { el.remove(); sketch.dimEls.delete(id); }
  }
  for (const dim of sketch.dims) {
    if (sketch.dimEls.has(dim.id)) continue;
    const el = document.createElement('div');
    el.className = 'dimlabel';
    el.title = 'Tocar para editar, fijar con candado o eliminar';
    el.addEventListener('click', () => openDimDialog(dim));
    viewport.appendChild(el);
    sketch.dimEls.set(dim.id, el);
  }
}

function updateSketchLabels() {
  if (!sketch) return;
  const r = renderer.domElement.getBoundingClientRect();
  for (const dim of sketch.dims) {
    const el = sketch.dimEls.get(dim.id);
    if (!el) continue;
    const val = SK.measureDim(sketch.entities, dim);
    // convención Inventor (§2.4): directriz (🔒 dirige la geometría) vs
    // referencia/driven (entre paréntesis, solo mide, no dirige).
    const body = val === null ? '—' : `${DIM_PREFIX[dim.kind]}${val.toFixed(1)}${dim.kind === 'ang' ? '°' : ''}`;
    el.textContent = val === null ? '—' : (dim.locked ? `🔒${body}` : `(${body})`);
    el.classList.toggle('ref', !dim.locked);
    const w = to3D(dim.at[0], dim.at[1], 0.3).project(activeCamera);
    el.style.left = `${(w.x * 0.5 + 0.5) * r.width}px`;
    el.style.top = `${(-w.y * 0.5 + 0.5) * r.height}px`;
  }
}

// --- recortar / alargar ---

function pruneDims() {
  sketch.dims = sketch.dims.filter(d =>
    SK.measureDim(sketch.entities, d) !== null
  );
  syncDimEls();
}

function clickTrim(raw) {
  const pick = pickEntityAt(raw, false);
  if (!pick) { setStatus('Recortar: toca el tramo que quieres eliminar.'); return; }
  const cutters = sketch.entities.filter(e => e.id !== pick.ent.id).concat(refEntities());
  const repl = SK.trimEntity(pick.ent, raw, cutters);
  const idx = sketch.entities.indexOf(pick.ent);
  sketch.entities.splice(idx, 1, ...repl);
  pruneDims();
  redrawSketch();
  setStatus(repl.length ? 'Tramo recortado.' : 'Entidad eliminada (no tenía cortes).');
}

function clickExtend(raw) {
  const pick = pickEntityAt(raw, false);
  if (!pick || pick.ent.type !== 'line') { setStatus('Alargar: toca una línea cerca del extremo a alargar.'); return; }
  const others = sketch.entities.filter(e => e.id !== pick.ent.id).concat(refEntities());
  if (SK.extendLine(pick.ent, raw, others)) {
    redrawSketch();
    setStatus('Línea alargada hasta la intersección más próxima.');
  } else {
    setStatus('No hay ninguna entidad o referencia en esa dirección.');
  }
}

// --- mover entidad (edición directa por arrastre) ---

function startEntDrag(ev) {
  const raw = eventTo2D(ev);
  if (!raw) return;
  const pick = pickEntityAt(raw, false);
  if (!pick) { setStatus('Mover: toca una entidad del boceto y arrastra.'); return; }
  // si la entidad tocada está dentro de la selección múltiple, se mueve TODA
  const ents = (sketch.selIds.has(pick.ent.id) && sketch.selIds.size > 1)
    ? sketch.entities.filter(e => sketch.selIds.has(e.id))
    : [pick.ent];
  sketch.entDrag = { ents, pointerId: ev.pointerId, lastUV: raw };
  sketchControls.enabled = false;
  try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* ya liberado */ }
}

function moveEntDrag(ev) {
  const d = sketch?.entDrag;
  if (!d || ev.pointerId !== d.pointerId) return;
  const raw = eventTo2D(ev);
  if (!raw) return;
  const delta = [raw[0] - d.lastUV[0], raw[1] - d.lastUV[1]];
  for (const e of d.ents) SK.moveEntity(sketch.entities, e, delta);
  d.lastUV = raw;
  redrawSketch();
}

function endEntDrag() {
  if (!sketch?.entDrag) return;
  const n = sketch.entDrag.ents.length;
  sketch.entDrag = null;
  sketchControls.enabled = true;
  // restricciones geométricas + cotas con candado se re-aplican tras el movimiento
  SK.solveSketch(sketch.entities, sketch.constraints, sketch.dims);
  redrawSketch();
  const warn = reportOverconstrained();
  setStatus(warn || `${n > 1 ? n + ' entidades movidas' : 'Entidad movida'} (restricciones y cotas 🔒 re-aplicadas).`);
}

// --- ⤓ Proyectar geometría (como Inventor): herramienta selectiva ---
// Toca una CARA → proyecta todo su contorno (exterior e interior);
// toca una ARISTA o CÍRCULO → proyecta solo esa; toca algo ya
// proyectado → lo desproyecta. Lo proyectado son entidades reales
// (verdes) que se cotan, recortan y copian como cualquier otra.

function projKeyOf(p) {
  if (p.type === 'line') return [p.a, p.b].map(pt => `${Math.round(pt[0] * 10)},${Math.round(pt[1] * 10)}`).sort().join('|');
  return `c${Math.round(p.c[0] * 10)},${Math.round(p.c[1] * 10)},${Math.round(p.r * 10)}`;
}

function addProjEntity(p) {
  const key = projKeyOf(p);
  if (sketch.entities.some(e => e.proj && projKeyOf(e) === key)) return 0; // ya proyectada
  const e = p.type === 'line' ? SK.makeLine([...p.a], [...p.b]) : SK.makeCircle([...p.c], p.r);
  e.proj = true;
  sketch.entities.push(e);
  return 1;
}

// contorno completo (exterior + interiores) de la cara tocada: las
// primitivas analíticas de la pieza que están SOBRE el plano de esa cara
// distancia de un punto 2D a la recta AB
function perpDist2D(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (L < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L;
}
// Douglas–Peucker en una polilínea abierta (tolerancia en mm)
function dpOpen(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = 0, dmax = 0;
  const A = pts[0], B = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) { const d = perpDist2D(pts[i], A, B); if (d > dmax) { dmax = d; idx = i; } }
  if (dmax > eps) return dpOpen(pts.slice(0, idx + 1), eps).slice(0, -1).concat(dpOpen(pts.slice(idx), eps));
  return [A, B];
}
// simplifica un anillo 2D cerrado (robusto al ruido de cuantización meshopt):
// lo parte por el punto más lejano y aplica Douglas–Peucker a cada mitad
function simplifyRing2D(pts, eps = 0.4) {
  if (pts.length < 4) return pts;
  const p0 = pts[0]; let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - p0[0], pts[i][1] - p0[1]); if (d > fd) { fd = d; far = i; } }
  const a = dpOpen(pts.slice(0, far + 1), eps);
  const b = dpOpen(pts.slice(far).concat([pts[0]]), eps);
  return a.slice(0, -1).concat(b.slice(0, -1)); // une las dos mitades sin duplicar juntas
}

// Entidades 2D del contorno de una cara plana tomadas de la MALLA (pieza GLB sin
// primitivas analíticas). Las aristas de borde (de un solo triángulo del grupo
// coplanar) se encadenan en bucles; cada bucle se proyecta al plano del boceto y
// se clasifica: bucle redondo → CÍRCULO; bucle recto → líneas de sus esquinas.
// Encadena segmentos 2D [[a,b],...] en un único bucle cerrado de puntos (para el
// contorno analítico de una cara: rectángulo de una caja, perfil de un boceto).
function chainLoop2D(segs) {
  if (!segs.length) return null;
  const K = (p) => `${Math.round(p[0] * 100)}_${Math.round(p[1] * 100)}`;
  const adj = new Map(), pos = new Map();
  for (const [a, b] of segs) {
    const ka = K(a), kb = K(b); if (ka === kb) continue;
    pos.set(ka, a); pos.set(kb, b);
    (adj.get(ka) || adj.set(ka, []).get(ka)).push(kb);
    (adj.get(kb) || adj.set(kb, []).get(kb)).push(ka);
  }
  const start = adj.keys().next().value;
  const loop = [start]; let prev = null, cur = start, guard = 0;
  while (guard++ < 10000) {
    const nbrs = adj.get(cur) || [];
    const next = nbrs.find(n => n !== prev) ?? nbrs[0];
    if (!next || next === start) break;
    loop.push(next); prev = cur; cur = next;
  }
  return loop.length >= 3 ? loop.map(k => pos.get(k)) : null;
}

// Bucles de borde de una cara plana, proyectados a 2D por `project(localV3)→[x,y]`
// y clasificados (círculo o polígono simplificado), con su área. Núcleo común de
// la proyección al boceto y de la conversión a chapa (contorno + agujeros).
function meshFaceLoops(geom, tris, project) {
  const pos = geom.attributes.position;
  const key = (i) => `${Math.round(pos.getX(i) * 1e3)}_${Math.round(pos.getY(i) * 1e3)}_${Math.round(pos.getZ(i) * 1e3)}`;
  const s2 = new Map(), ecount = new Map(), einfo = new Map();
  for (const t of tris) {
    const ks = [key(t * 3), key(t * 3 + 1), key(t * 3 + 2)];
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      if (!s2.has(ks[k])) s2.set(ks[k], project(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))));
    }
    for (let k = 0; k < 3; k++) {
      const a = ks[k], b = ks[(k + 1) % 3];
      const ek = a < b ? `${a}|${b}` : `${b}|${a}`;
      ecount.set(ek, (ecount.get(ek) || 0) + 1);
      if (!einfo.has(ek)) einfo.set(ek, [a, b]);
    }
  }
  const adj = new Map();
  for (const [ek, cnt] of ecount) {
    if (cnt !== 1) continue; // solo aristas de borde
    const [a, b] = einfo.get(ek);
    (adj.get(a) || adj.set(a, []).get(a)).push(b);
    (adj.get(b) || adj.set(b, []).get(b)).push(a);
  }
  // Recorre CONSUMIENDO cada arista de borde una sola vez → termina siempre,
  // incluso con bordes no-manifold (uniones en T de la malla CSG con agujeros).
  const usedE = new Set(), loops = [];
  const ekey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
  for (const startK of adj.keys()) {
    for (const first of adj.get(startK)) {
      if (usedE.has(ekey(startK, first))) continue;
      usedE.add(ekey(startK, first));
      const loop = [startK]; let cur = first, guard = 0;
      while (cur !== startK && guard++ < 200000) {
        loop.push(cur);
        let nxt = null;
        for (const c of (adj.get(cur) || [])) { const k = ekey(cur, c); if (!usedE.has(k)) { usedE.add(k); nxt = c; break; } }
        if (nxt === null) break;
        cur = nxt;
      }
      if (loop.length < 3) continue;
      const pts = loop.map(k => s2.get(k));
    let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; }
    cx /= pts.length; cy /= pts.length;
    let rmin = Infinity, rmax = 0, rsum = 0;
    for (const p of pts) { const r = Math.hypot(p[0] - cx, p[1] - cy); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); rsum += r; }
    const rmean = rsum / pts.length;
    const isCircle = rmean > 0.5 && pts.length >= 8 && (rmax - rmin) < 0.12 * rmean;
    let ring = pts;
    if (!isCircle) { const s = simplifyRing2D(pts); if (s.length >= 3) ring = s; }
    let area = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area += a[0] * b[1] - b[0] * a[1]; }
    loops.push({ pts: ring, circle: isCircle ? { c: [cx, cy], r: rmean } : null, area: Math.abs(area / 2) });
    }
  }
  return loops;
}

function meshFaceEntities(geom, tris, mw) {
  const ents = [];
  for (const lp of meshFaceLoops(geom, tris, (v) => w2s(v.applyMatrix4(mw)))) {
    if (lp.circle) { ents.push({ type: 'circle', c: lp.circle.c, r: lp.circle.r }); continue; }
    for (let i = 0; i < lp.pts.length; i++) {
      const a = lp.pts[i], b = lp.pts[(i + 1) % lp.pts.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.1) ents.push({ type: 'line', a, b });
    }
  }
  return ents;
}

function projectFaceContour(hit) {
  const part = getPart(doc, hit.object.userData.partId);
  const face = faceAtHit(hit);
  const mw = hit.object.matrixWorld;
  const pw = face.centroid.clone().applyMatrix4(mw);
  const nw = face.normal.clone().transformDirection(mw);
  const m = partMatrix(part);
  const q = new THREE.Quaternion(...part.quat);
  const prims = referencePrimitives(part);
  const onFace = (w) => Math.abs(w.clone().sub(pw).dot(nw)) < 0.05;
  let added = 0;
  for (const ln of prims.lines) {
    const a = ln.a.clone().applyMatrix4(m), b = ln.b.clone().applyMatrix4(m);
    if (!onFace(a) || !onFace(b)) continue;
    const a2 = w2s(a), b2 = w2s(b);
    if (Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) < 0.05) continue; // arista normal al plano del boceto
    added += addProjEntity({ type: 'line', a: a2, b: b2 });
  }
  for (const ci of prims.circles) {
    const c = ci.c.clone().applyMatrix4(m);
    const dirW = ci.dir.clone().applyQuaternion(q).normalize();
    if (!onFace(c) || Math.abs(dirW.dot(nw)) < 0.999) continue;
    if (Math.abs(nw.dot(sketch.nW)) < 0.999) continue; // cara inclinada → el círculo sería elipse
    added += addProjEntity({ type: 'circle', c: w2s(c), r: ci.r });
  }
  // sin primitivas analíticas (p. ej. pieza de MALLA real): tomar el contorno
  // de la cara directamente de la malla (líneas + círculos) y proyectarlo.
  if (added === 0) {
    for (const ent of meshFaceEntities(hit.object.geometry, face.tris, mw)) added += addProjEntity(ent);
  }
  redrawSketch();
  setStatus(added
    ? `Contorno proyectado: ${added} línea(s) del boceto en VERDE (se extruyen, cotan y copian como cualquiera). ⤓ sobre una la quita.`
    : 'Esa cara no aportó geometría nueva (quizá ya estaba proyectada).');
}

// Arista/círculo analítico de una pieza más cercano a un punto del mundo (3D),
// ya proyectado a 2D del boceto. Sirve para piezas FUERA del plano del boceto
// (otras piezas del ensamble), donde el cruce del rayo con el plano no coincide
// con la posición 2D de la arista.
function nearestPartPrim(part, worldPt, tol) {
  const m = partMatrix(part);
  const q = new THREE.Quaternion(...part.quat);
  const prims = referencePrimitives(part);
  const tmp = new THREE.Vector3();
  let best = null;
  for (const ln of prims.lines) {
    const a = ln.a.clone().applyMatrix4(m), b = ln.b.clone().applyMatrix4(m);
    const a2 = w2s(a), b2 = w2s(b);
    if (Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) < 0.05) continue; // arista normal al plano
    const d = new THREE.Line3(a, b).closestPointToPoint(worldPt, true, tmp).distanceTo(worldPt);
    if (d < tol && (!best || d < best.d)) best = { d, ent: { type: 'line', a: a2, b: b2 } };
  }
  for (const ci of prims.circles) {
    const c = ci.c.clone().applyMatrix4(m);
    const dirW = ci.dir.clone().applyQuaternion(q).normalize();
    if (Math.abs(dirW.dot(sketch.nW)) < 0.999) continue; // círculo inclinado → elipse: no proyectable
    const rel = worldPt.clone().sub(c);
    const ax = rel.dot(dirW);
    const radial = rel.addScaledVector(dirW, -ax).length() - ci.r;
    const d = Math.hypot(ax, radial);
    if (d < tol && (!best || d < best.d)) best = { d, ent: { type: 'circle', c: w2s(c), r: ci.r } };
  }
  return best ? best.ent : null;
}

function clickProject(raw, hit) {
  // tolerancia acotada en mm: si el toque no está claramente sobre una
  // arista/círculo, se interpreta como toque de CARA (contorno completo)
  const tol = Math.min(16 * worldPerPixel(), 4);
  // 1) ¿tocó una entidad ya proyectada? → desproyectar solo esa
  let bestE = null;
  for (const e of sketch.entities) {
    if (!e.proj) continue;
    const n = SK.nearestOnEntity(e, raw);
    if (n.d < tol && (!bestE || n.d < bestE.d)) bestE = { e, d: n.d };
  }
  if (bestE) {
    sketch.entities = sketch.entities.filter(x => x !== bestE.e);
    sketch.selIds.delete(bestE.e.id);
    pruneDims();
    redrawSketch();
    setStatus('Proyección desactivada: entidad quitada del boceto.');
    return;
  }
  // 2) tocó una pieza (la actual u OTRA): por proximidad 3D real al punto tocado,
  //    ¿hay una arista/círculo cerca? → proyectar solo esa; si no, todo el contorno.
  if (hit) {
    const part = getPart(doc, hit.object.userData.partId);
    const tol3d = Math.max(3, 14 * worldPerPixel());
    const prim = nearestPartPrim(part, hit.point, tol3d);
    if (prim) {
      const n = addProjEntity(prim);
      redrawSketch();
      setStatus(n
        ? (prim.type === 'circle'
            ? `Círculo Ø${(prim.r * 2).toFixed(1)} proyectado: ya es línea del boceto (verde).`
            : `Arista de ${part.name} proyectada: ya es línea del boceto (verde).`)
        : 'Esa referencia ya estaba proyectada.');
      return;
    }
    projectFaceContour(hit); // sin arista cerca → contorno completo de la cara tocada
    return;
  }
  // 3) sin pieza bajo el cursor: intenta con las referencias sobre el plano (raw)
  let bestP = null;
  for (const p of sketch.refPrims) {
    const n = SK.nearestOnEntity(p, raw);
    if (n.d < tol && (!bestP || n.d < bestP.d)) bestP = { p, d: n.d };
  }
  if (bestP) {
    const n = addProjEntity(bestP.p);
    redrawSketch();
    setStatus(n ? 'Referencia proyectada: ya es línea del boceto (verde).' : 'Esa referencia ya estaba proyectada.');
    return;
  }
  setStatus('Proyectar: toca una cara (todo su contorno), una arista o un círculo; tocar algo proyectado lo quita.');
}

// --- selección por ventana (AutoCAD) y copiar con punto base ---

const marqueeWinMat = new THREE.MeshBasicMaterial({ color: 0x4d90fe, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthTest: false });
const marqueeCrossMat = new THREE.MeshBasicMaterial({ color: 0x34a853, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthTest: false });

function startMarquee(ev) {
  const raw = eventTo2D(ev);
  if (!raw) return;
  sketch.marquee = { pointerId: ev.pointerId, start: raw, cur: raw };
  sketchControls.enabled = false;
  try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* ya liberado */ }
}

function moveMarquee(ev) {
  const m = sketch?.marquee;
  if (!m || ev.pointerId !== m.pointerId) return;
  const raw = eventTo2D(ev);
  if (!raw) return;
  m.cur = raw;
  clearGroup(sketch.preview);
  const [x1, y1] = m.start, [x2, y2] = m.cur;
  const isWindow = x2 >= x1; // izquierda→derecha = ventana; al revés = captura
  const shape = new THREE.Shape([
    new THREE.Vector2(Math.min(x1, x2), Math.min(y1, y2)),
    new THREE.Vector2(Math.max(x1, x2), Math.min(y1, y2)),
    new THREE.Vector2(Math.max(x1, x2), Math.max(y1, y2)),
    new THREE.Vector2(Math.min(x1, x2), Math.max(y1, y2)),
  ]);
  const g = new THREE.ShapeGeometry(shape);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(sketch.uW, sketch.vW, sketch.nW)
    .setPosition(sketch.originW.clone().addScaledVector(sketch.nW, 0.05)));
  sketch.preview.add(new THREE.Mesh(g, isWindow ? marqueeWinMat : marqueeCrossMat));
  setStatus(isWindow ? 'Ventana (azul): selecciona solo lo CONTENIDO por completo.' : 'Captura (verde): selecciona todo lo TOCADO.');
}

function endMarquee() {
  const m = sketch.marquee;
  sketch.marquee = null;
  sketchControls.enabled = true;
  clearGroup(sketch.preview);
  if (!m) return;
  const dragDist = Math.hypot(m.cur[0] - m.start[0], m.cur[1] - m.start[1]);
  if (dragDist < 2 * worldPerPixel()) { // fue un tap: alternar la entidad tocada
    const pick = pickEntityAt(m.cur, false);
    if (pick) {
      if (sketch.selIds.has(pick.ent.id)) sketch.selIds.delete(pick.ent.id);
      else sketch.selIds.add(pick.ent.id);
      redrawSketch();
      setStatus(`${sketch.selIds.size} entidad(es) seleccionadas. ⧉ Copiar o ⇄ Espejo para duplicar.`);
    }
    return;
  }
  const mode = m.cur[0] >= m.start[0] ? 'window' : 'crossing';
  for (const e of sketch.entities) {
    if (SK.entityInRect(e, m.start, m.cur, mode)) sketch.selIds.add(e.id);
  }
  redrawSketch();
  setStatus(`${sketch.selIds.size} entidad(es) seleccionadas (${mode === 'window' ? 'ventana' : 'captura'}). ⧉ Copiar para duplicar.`);
}

function startMirrorOp() {
  if (!sketch.selIds.size) { setStatus('Primero selecciona entidades con ⬚ Selec (o toques).'); return; }
  sketch.mirrorOp = { a: null };
  setStatus('Espejo: toca el PRIMER punto de la línea de simetría (con snap).');
}

function clickMirror(raw) {
  const { uv } = snap2D(raw);
  if (!sketch.mirrorOp.a) {
    sketch.mirrorOp.a = uv;
    setStatus('Espejo: toca el SEGUNDO punto de la línea de simetría.');
    return;
  }
  const a = sketch.mirrorOp.a;
  sketch.mirrorOp = null;
  if (Math.hypot(uv[0] - a[0], uv[1] - a[1]) < 0.5) { setStatus('Los dos puntos del eje coinciden.'); return; }
  const src = sketch.entities.filter(e => sketch.selIds.has(e.id));
  const copies = SK.mirrorEntities(src, a, uv);
  sketch.entities.push(...copies);
  redrawSketch();
  setStatus(`${copies.length} entidad(es) reflejadas respecto a la línea declarada.`);
}

function startCopyOp() {
  if (!sketch.selIds.size) { setStatus('Primero selecciona entidades con ⬚ Selec (o toques).'); return; }
  sketch.copyOp = { stage: 'base', base: null };
  setStatus('Copiar: toca el PUNTO BASE de referencia (con snap).');
}

function clickCopy(raw) {
  const { uv, kind, snapped } = snap2D(raw);
  if (sketch.copyOp.stage === 'base') {
    sketch.copyOp = { stage: 'dest', base: uv };
    setStatus(`Base fijada${snapped ? ` (⌖ ${kind})` : ''}. Toca el/los DESTINO(s); cambia de herramienta para terminar.`);
    return;
  }
  const delta = [uv[0] - sketch.copyOp.base[0], uv[1] - sketch.copyOp.base[1]];
  const src = sketch.entities.filter(e => sketch.selIds.has(e.id));
  const copies = SK.copyEntities(src, delta);
  sketch.entities.push(...copies);
  redrawSketch();
  setStatus(`${copies.length} entidad(es) copiadas (Δ ${delta[0].toFixed(1)}, ${delta[1].toFixed(1)}). Toca otro destino o cambia de herramienta.`);
}

// --- modo lápiz (trazo a mano alzada) ---

function startStroke(ev) {
  const raw = eventTo2D(ev);
  if (!raw) return;
  sketch.stroke = { pointerId: ev.pointerId, pts: [raw] };
  sketchControls.enabled = false;
  try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* ya liberado */ }
}

function moveStroke(ev) {
  if (!sketch?.stroke || ev.pointerId !== sketch.stroke.pointerId) return;
  const raw = eventTo2D(ev);
  if (!raw) return;
  sketch.stroke.pts.push(raw);
  if (sketch.stroke.pts.length % 3 === 0) {
    clearGroup(sketch.preview);
    const pts = sketch.stroke.pts.map(p => to3D(p[0], p[1]));
    sketch.preview.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), previewMat));
  }
}

function endStroke() {
  const stroke = sketch?.stroke;
  if (!stroke) return;
  sketch.stroke = null;
  sketchControls.enabled = true;
  clearGroup(sketch.preview);
  const fit = SK.fitStroke(stroke.pts);
  if (!fit) { setStatus('Trazo demasiado corto.'); return; }
  if (fit.type === 'circle') {
    sketch.entities.push(SK.makeCircle(fit.c, fit.r));
    setStatus(`Interpretado: círculo Ø${(fit.r * 2).toFixed(1)} mm.`);
  } else if (fit.type === 'rect') {
    const [x0, y0] = fit.a, [x1, y1] = fit.b;
    sketch.entities.push(
      SK.makeLine([x0, y0], [x1, y0]), SK.makeLine([x1, y0], [x1, y1]),
      SK.makeLine([x1, y1], [x0, y1]), SK.makeLine([x0, y1], [x0, y0]));
    setStatus(`Interpretado: rectángulo ${Math.abs(x1 - x0).toFixed(1)}×${Math.abs(y1 - y0).toFixed(1)} mm.`);
  } else if (fit.type === 'line') {
    const a = snap2D(fit.a).uv, b = snap2D(fit.b).uv;
    sketch.entities.push(SK.makeLine(a, b));
    setStatus(`Interpretado: línea de ${Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(1)} mm.`);
  } else {
    const pts = fit.pts.map(p => snap2D(p).uv);
    for (let i = 1; i < pts.length; i++) sketch.entities.push(SK.makeLine(pts[i - 1], pts[i]));
    if (fit.closed && pts.length > 2) sketch.entities.push(SK.makeLine(pts[pts.length - 1], pts[0]));
    setStatus(`Interpretado: polilínea de ${pts.length} vértices${fit.closed ? ' (cerrada)' : ''}.`);
  }
  redrawSketch();
}

// --- dibujo del boceto ---

// Estado del boceto estilo barra de estado de Inventor (§2.5), pero HONESTO:
// no inventa grados de libertad (no hay solver aún); reporta lo que sí se puede
// medir — contornos cerrados listos para extruir, cadenas abiertas y cotas.
const skStateEl = document.getElementById('skState');
function updateSketchState() {
  if (!skStateEl) return;
  if (!sketch) { skStateEl.style.display = 'none'; return; }
  const E = sketch.entities.length;
  const D = sketch.dims.length;
  const { regions: regs, openCount } = SK.regions(sketch.entities, [...sketch.excluded]);
  const L = regs.length;
  let cls, txt;
  if (E === 0) { cls = 'st-empty'; txt = 'Boceto vacío'; }
  else if (L > 0) { cls = 'st-ok'; txt = `✓ ${L} contorno${L > 1 ? 's' : ''} listo${openCount ? ` · ${openCount} abierta${openCount > 1 ? 's' : ''}` : ''}`; }
  else if (openCount > 0) { cls = 'st-open'; txt = `⚠ contorno abierto (${openCount} cadena${openCount > 1 ? 's' : ''})`; }
  else { cls = 'st-open'; txt = 'sin contorno cerrado'; }
  const R = sketch.constraints?.length || 0;
  const extra = (D ? ` · ${D} cota${D > 1 ? 's' : ''}` : '') + (R ? ` · ${R} restric.` : '');
  skStateEl.className = cls;
  skStateEl.textContent = `${txt} · ${E} entidad${E !== 1 ? 'es' : ''}${extra}`;
  skStateEl.style.display = 'block';
}

function redrawSketch() {
  updateSketchState();
  clearGroup(sketch.draw);
  for (const e of sketch.entities) {
    const mat = (sketch.dimPick && sketch.dimPick.ent.id === e.id) || sketch.selIds.has(e.id) ? selEntMat : (e.proj ? projMat : drawMat);
    // las proyectadas se dibujan un pelo más arriba para que el verde tape la referencia amarilla
    const pts = SK.entityPoints(e, 64).map(p => to3D(p[0], p[1], e.proj ? 0.16 : 0.1));
    sketch.draw.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  if (sketch.dimPick?.isRef) {
    const e = sketch.dimPick.ent;
    sketch.draw.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [to3D(e.a[0], e.a[1], 0.12), to3D(e.b[0], e.b[1], 0.12)]), selEntMat));
  }
  const tempPts = [];
  if (sketch.temp) {
    if (Array.isArray(sketch.temp)) tempPts.push(sketch.temp);
    else { if (sketch.temp.c) tempPts.push(sketch.temp.c); if (sketch.temp.start) tempPts.push(sketch.temp.start); }
  }
  for (const p of [sketch.chainLast, ...tempPts]) {
    if (!p) continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.05, 3.5 * worldPerPixel()), 10, 8), ptMat);
    m.position.copy(to3D(p[0], p[1]));
    sketch.draw.add(m);
  }
  // marcadores de restricciones persistentes (puntos azules junto a la entidad)
  if (sketch.constraints?.length) {
    const anchor = (e) => e.type === 'line' ? [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2] : e.c;
    const s = Math.max(0.1, 4.5 * worldPerPixel());
    for (const c of sketch.constraints) {
      for (const eid of [c.a, c.b]) {
        const e = eid && sketch.entities.find(x => x.id === eid);
        if (!e) continue;
        const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), constraintMat);
        const ap = anchor(e);
        m.position.copy(to3D(ap[0], ap[1], 0.2));
        sketch.draw.add(m);
      }
    }
  }
}

function updateSketchPreview(ev) {
  if ((ev.pointerType !== 'mouse' && ev.pointerType !== 'pen') || sketch.stroke) return;
  const raw = eventTo2D(ev);
  if (!raw) return;
  lastPreviewRaw = raw;
  const t = sketch.tool;
  // línea con extremo resuelto por snap de ángulo/lock (entrada dinámica)
  if (t === 'line' && sketch.chainLast) {
    const res = resolveLineEnd(raw);
    clearGroup(sketch.preview);
    if (res.guide) { // guía discontinua de inferencia (paralela/perp/H/V)
      const gl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [to3D(res.guide[0][0], res.guide[0][1]), to3D(res.guide[1][0], res.guide[1][1])]), guideMat);
      gl.computeLineDistances();
      sketch.preview.add(gl);
    }
    const cur = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.06, 4 * worldPerPixel()), 10, 8), res.onPoint ? snapMat : ptMat);
    cur.position.copy(to3D(res.end[0], res.end[1]));
    sketch.preview.add(cur);
    sketch.preview.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [to3D(sketch.chainLast[0], sketch.chainLast[1]), to3D(res.end[0], res.end[1])]), previewMat));
    showInferBadge(res.infer, res.end);
    updateDynFields(res.len, res.ang);
    positionDynBox();
    setStatus(`L ${res.len.toFixed(1)} mm · ∠ ${res.ang.toFixed(1)}°${res.infer ? ' · ' + INFER_ES[res.infer] : ''}${sketch.angLock != null ? ' 🔒' : ''}`);
    return;
  }
  const { uv, snapped, kind } = snap2D(raw);
  clearGroup(sketch.preview);
  hideInferBadge();
  const cursor = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.06, 4 * worldPerPixel()), 10, 8),
    snapped ? snapMat : ptMat
  );
  cursor.position.copy(to3D(uv[0], uv[1]));
  sketch.preview.add(cursor);
  if (t === 'rect' && sketch.temp) {
    const [x1, y1] = sketch.temp, [x2, y2] = uv;
    sketch.preview.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [to3D(x1, y1), to3D(x2, y1), to3D(x2, y2), to3D(x1, y2), to3D(x1, y1)]), previewMat));
  } else if (t === 'circle' && sketch.temp) {
    const [cx, cy] = sketch.temp;
    const r = Math.hypot(uv[0] - cx, uv[1] - cy);
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const a = i * Math.PI * 2 / 48;
      pts.push(to3D(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    sketch.preview.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), previewMat));
    updateDynFields(2 * r, null);
    positionDynBox();
  } else if (t === 'arc' && sketch.temp?.start) {
    const arc = SK.makeArcCSE(sketch.temp.c, sketch.temp.start, uv);
    const pts = SK.entityPoints(arc, 48).map(p => to3D(p[0], p[1]));
    sketch.preview.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), previewMat));
  } else if (t === 'polyg' && sketch.temp) {
    const lines = SK.regularPolygon(sketch.temp, uv, 6);
    for (const l of lines) {
      sketch.preview.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [to3D(l.a[0], l.a[1]), to3D(l.b[0], l.b[1])]), previewMat));
    }
  }
  setStatus(`(${uv[0].toFixed(1)}, ${uv[1].toFixed(1)}) mm${snapped ? ` ⌖ ${kind}` : ''}`);
}

// --- extruir / deshacer / cancelar ---

const fillOnMat = new THREE.MeshBasicMaterial({ color: 0x34a853, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthTest: false });
const fillOffMat = new THREE.MeshBasicMaterial({ color: 0x666e7a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthTest: false });
// vista previa translúcida de la operación antes de confirmar (§6.1)
const opPrevMatU = new THREE.MeshBasicMaterial({ color: 0x4d90fe, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false });
const opPrevMatC = new THREE.MeshBasicMaterial({ color: 0xe05a4e, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false });
let opPreviewGroup = null;
function showExtrudePreview(h, op) {
  if (!sketch) return;
  if (!opPreviewGroup) { opPreviewGroup = new THREE.Group(); sketch.group.add(opPreviewGroup); }
  clearGroup(opPreviewGroup);
  if (!(h > 0)) return;
  const { regions: regs } = SK.regions(sketch.entities, [...sketch.excluded]);
  // corte: se previsualiza hacia dentro (−normal); unión hacia fuera (+normal)
  const dir = op === 'cut' ? -1 : 1;
  const mBasis = new THREE.Matrix4().makeBasis(sketch.uW.clone().multiplyScalar(1), sketch.vW, sketch.nW.clone().multiplyScalar(dir))
    .setPosition(sketch.originW);
  const mat = op === 'cut' ? opPrevMatC : opPrevMatU;
  for (const reg of regs) {
    const shape = new THREE.Shape(reg.outer.map(p => new THREE.Vector2(p[0], p[1])));
    for (const hole of reg.holes) shape.holes.push(new THREE.Path(hole.map(p => new THREE.Vector2(p[0], p[1]))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    g.applyMatrix4(mBasis);
    opPreviewGroup.add(new THREE.Mesh(g, mat));
  }
}
function clearOpPreview() { if (opPreviewGroup) clearGroup(opPreviewGroup); }

function drawProfileFills() {
  clearGroup(sketch.fills);
  const { loops } = SK.regions(sketch.entities, []);
  const mBasis = new THREE.Matrix4().makeBasis(sketch.uW, sketch.vW, sketch.nW)
    .setPosition(sketch.originW.clone().addScaledVector(sketch.nW, 0.04));
  for (const loop of loops) {
    const key = SK.loopKey(loop);
    const shape = new THREE.Shape(loop.map(pt => new THREE.Vector2(pt[0], pt[1])));
    const g = new THREE.ShapeGeometry(shape);
    g.applyMatrix4(mBasis);
    const mesh = new THREE.Mesh(g, sketch.excluded.has(key) ? fillOffMat : fillOnMat);
    sketch.fills.add(mesh);
  }
}

function clickProfile(raw) {
  const { loops } = SK.regions(sketch.entities, []);
  // contorno más pequeño que contiene el punto tocado
  let best = null, bestArea = Infinity;
  for (const loop of loops) {
    if (!SK.pointInPoly(raw, loop)) continue;
    let area = 0;
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    area = Math.abs(area / 2);
    if (area < bestArea) { bestArea = area; best = loop; }
  }
  if (!best) { setStatus('Toca dentro de un contorno para incluir/excluir.'); return; }
  const key = SK.loopKey(best);
  if (sketch.excluded.has(key)) sketch.excluded.delete(key); else sketch.excluded.add(key);
  drawProfileFills();
  setStatus(`Contorno ${sketch.excluded.has(key) ? 'excluido' : 'incluido'}. ✔ para extruir.`);
}

function finishSketch() {
  sketch.chainStart = sketch.chainLast = null;
  sketch.temp = null;
  const info = SK.regions(sketch.entities, [...sketch.excluded]);
  if (!info.loops.length) {
    setStatus(`No hay contorno cerrado${info.openCount ? ` (${info.openCount} cadena(s) abiertas — únelas o usa Alargar)` : ''}.`);
    return;
  }
  // con varios contornos, primero se eligen los perfiles (como Inventor)
  if (info.loops.length > 1 && !sketch.profileMode) {
    sketch.profileMode = true;
    drawProfileFills();
    setStatus('Selección de perfiles: toca los contornos para incluir (verde) o excluir (gris). ✔ de nuevo para extruir.');
    return;
  }
  if (!info.regions.length) { setStatus('Todos los contornos están excluidos.'); return; }
  const part = sketch.part;

  // edición de una función existente: guardar cambios en la misma función
  if (sketch.editFeature) {
    const f = sketch.editFeature;
    showForm(`Guardar boceto de "${f.name}"`, [
      ...(f.shape === 'sketch' ? [{ key: 'h', label: 'Altura (mm)', value: f.params.h, step: 0.5 }] : []),
      { key: 'op', label: 'Operación', type: 'select', value: f.op, options: [['union', 'Unión'], ['cut', 'Corte']] },
    ], (v) => {
      pushUndo();
      f.params.entities = sketch.entities;
      f.params.dims = sketch.dims;
      f.params.constraints = sketch.constraints;
      f.params.excluded = [...sketch.excluded];
      if (f.shape === 'sketch') f.params.h = v.h;
      f.op = v.op;
      const p = sketch.part;
      cancelSketch(true);
      faceCache.clear();
      rebuildPart(p);
      commit(`Boceto de "${f.name}" actualizado.`);
    });
    return;
  }
  const originL = sketch.originL, nL = sketch.nL, uL = sketch.uL;
  const entities = sketch.entities, dims = sketch.dims;
  const excluded = [...sketch.excluded];
  const nReg = info.regions.length;
  const nHoles = info.regions.reduce((s, r) => s + r.holes.length, 0);
  showForm(`Crear sólido (${nReg} región(es)${nHoles ? `, ${nHoles} agujero(s)` : ''})`, [
    { key: 'tipo', label: 'Tipo', type: 'select', value: 'ext', options: [['ext', 'Extrusión'], ['rev', 'Revolución 360°']] },
    { key: 'h', label: 'Altura (mm, extrusión)', value: 10, step: 0.5 },
    { key: 'op', label: 'Operación', type: 'select', value: 'union', options: [['union', 'Unión (agrega material)'], ['cut', 'Corte (quita material)']] },
  ], (v) => {
    if (v.tipo === 'rev') {
      sketch.revolveWait = { op: v.op };
      setStatus('Revolución: toca la LÍNEA del boceto que será el eje de giro.');
      return;
    }
    if (!(v.h > 0)) { setStatus('La altura debe ser mayor que 0.'); return; }
    pushUndo();
    const f = makeSketchEntitiesFeature(entities, dims, v.h, v.op, originL, nL, uL);
    f.params.excluded = excluded;
    f.params.constraints = sketch.constraints;
    part.features.push(f);
    cancelSketch(true);
    faceCache.clear();
    rebuildPart(part);
    commit(`Boceto extruido en ${part.name}.`);
  });
  // vista previa en vivo del sólido mientras se ajustan altura/tipo/operación (§6.1)
  const hEl = $('dlg_h'), tEl = $('dlg_tipo'), oEl = $('dlg_op');
  const upd = () => { if (tEl?.value === 'rev') { clearOpPreview(); return; } showExtrudePreview(+hEl.value, oEl?.value || 'union'); };
  if (hEl) {
    hEl.addEventListener('input', upd);
    tEl?.addEventListener('change', upd);
    oEl?.addEventListener('change', upd);
    upd();
  }
}

function clickRevolveAxis(raw) {
  const pick = pickEntityAt(raw, false);
  if (!pick || pick.ent.type !== 'line') { setStatus('Toca una LÍNEA del boceto para usarla como eje.'); return; }
  const op = sketch.revolveWait.op;
  sketch.revolveWait = null;
  pushUndo();
  const f = makeRevolveFeature(sketch.entities, sketch.dims, { a: [...pick.ent.a], b: [...pick.ent.b] }, op, sketch.originL, sketch.nL, sketch.uL);
  f.params.excluded = [...sketch.excluded];
  f.params.constraints = sketch.constraints;
  const part = sketch.part;
  part.features.push(f);
  cancelSketch(true);
  faceCache.clear();
  rebuildPart(part);
  const rec = meshes.get(part.id);
  if (rec && (!rec.mesh.geometry.attributes.position || rec.mesh.geometry.attributes.position.count === 0)) {
    setStatus('La revolución no generó sólido (¿el contorno cruza el eje?). Deshaz con Ctrl+Z.');
  } else {
    commit(`Revolución creada en ${part.name}.`);
  }
}

function sketchUndo() {
  if (sketch.temp) { sketch.temp = null; redrawSketch(); return; }
  if (sketch.dimPick) { sketch.dimPick = null; redrawSketch(); return; }
  const last = sketch.entities[sketch.entities.length - 1];
  if (!last) return;
  sketch.entities.pop();
  if (sketch.chainLast && last.type === 'line') {
    sketch.chainLast = [...last.a];
  }
  pruneDims();
  redrawSketch();
}

function cancelSketch(silent) {
  if (!sketch) return;
  sketch.profileMode = false;
  hideDynBox();
  hideInferBadge();
  if (skStateEl) skStateEl.style.display = 'none';
  overlay.remove(sketch.group);
  sketch.group.traverse(o => o.geometry?.dispose?.());
  for (const el of sketch.dimEls.values()) el.remove();
  sketch = null;
  sketchbar.classList.remove('open');
  activeCamera = camera;
  sketchControls.enabled = false;
  sketchControls.enableRotate = false;
  SECTION.length = 0; // el corte del boceto no persiste fuera
  document.getElementById('skSlice')?.classList.remove('on');
  document.getElementById('btnSection')?.classList.remove('on');
  controls.enabled = true;
  window.__updateLockIcon?.();
  if (!silent) setStatus('Boceto cancelado.');
  if (mode === 'sketch') { mode = 'select'; $('btnSketch').classList.remove('on'); setHint(''); }
}

// ⊾ Restringir: aplica una restricción geométrica persistente a la selección.
function applyConstraintUI() {
  const sel = [...sketch.selIds].map(id => sketch.entities.find(e => e.id === id)).filter(Boolean);
  const lines = sel.filter(e => e.type === 'line');
  const circs = sel.filter(e => e.type === 'circle' || e.type === 'arc');
  if (!sel.length) { setStatus('Restringir: primero selecciona entidades con ⬚ Selec.'); return; }
  const opts = [];
  if (lines.length) opts.push(['horizontal', `Horizontal${lines.length > 1 ? ' (cada línea)' : ''}`], ['vertical', `Vertical${lines.length > 1 ? ' (cada línea)' : ''}`]);
  if (lines.length >= 2) opts.push(['parallel', 'Paralela'], ['perpendicular', 'Perpendicular'], ['collinear', 'Colineal'], ['equalL', 'Igual longitud']);
  if (circs.length >= 2) opts.push(['equalR', 'Igual radio'], ['concentric', 'Concéntrica'], ['tangentCC', 'Tangente (círculos)']);
  if (lines.length >= 1 && circs.length >= 1) opts.push(['tangentLC', 'Tangente (línea·círculo)']);
  if (!opts.length) { setStatus('Selecciona líneas (H/V/∥/⟂/colineal/=), círculos (=/concéntrica/tangente) o línea+círculo (tangente).'); return; }
  showForm('Restricción geométrica', [
    { key: 'type', label: 'Relación', type: 'select', value: opts[0][0], options: opts },
  ], (v) => addConstraints(v.type, lines, circs));
}
function addConstraints(type, lines, circs) {
  pushUndo();
  const add = (t, a, b) => sketch.constraints.push(SK.makeConstraint(t, a, b));
  if (type === 'horizontal' || type === 'vertical') for (const l of lines) add(type, l.id);
  else if (type === 'parallel' || type === 'perpendicular' || type === 'collinear') for (let i = 1; i < lines.length; i++) add(type, lines[i].id, lines[0].id);
  else if (type === 'equalL') for (let i = 1; i < lines.length; i++) add('equal', lines[i].id, lines[0].id);
  else if (type === 'equalR') for (let i = 1; i < circs.length; i++) add('equal', circs[i].id, circs[0].id);
  else if (type === 'concentric') for (let i = 1; i < circs.length; i++) add('concentric', circs[i].id, circs[0].id);
  else if (type === 'tangentCC') for (let i = 1; i < circs.length; i++) add('tangent', circs[i].id, circs[0].id);
  else if (type === 'tangentLC') add('tangent', lines[0].id, circs[0].id);
  SK.solveSketch(sketch.entities, sketch.constraints, sketch.dims);
  sketch.selIds.clear();
  syncDimEls();
  redrawSketch();
  const warn = reportOverconstrained();
  setStatus(warn || `Restricción aplicada. Total: ${sketch.constraints.length} restricción(es).`);
}
// Nunca fallar en silencio (§2.5/§6.2): si tras resolver alguna restricción
// queda incumplida, el sistema está en conflicto → avisar con acción correctiva.
function reportOverconstrained() {
  if (!sketch?.constraints?.length) return null;
  const bad = sketch.constraints.filter(c => SK.constraintResidual(sketch.entities, c) > 0.15);
  if (!bad.length) return null;
  return `⚠ ${bad.length} restricción(es) en conflicto (sobre-restringido). Deshaz (↩) la última o borra una entidad para liberar.`;
}

// barra de herramientas del boceto
sketchbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !sketch) return;
  if (btn.id === 'skCopy') { startCopyOp(); return; }
  if (btn.id === 'skMirror') { startMirrorOp(); return; }
  if (btn.id === 'skConstrain') { applyConstraintUI(); return; }
  if (btn.id === 'skSlice') {
    sketch.slice = !sketch.slice;
    btn.classList.toggle('on', sketch.slice);
    SECTION.length = 0;
    if (sketch.slice) {
      // oculta el material por delante del plano del boceto (slice graphics)
      SECTION.push(new THREE.Plane(sketch.nW.clone().negate(), sketch.nW.dot(sketch.originW)));
    }
    setStatus(sketch.slice ? '▤ Corte en el plano del boceto: se ve la sección del modelo.' : 'Corte desactivado.');
    return;
  }
  if (btn.id === 'skOrbit') {
    sketch.orbit = !sketch.orbit;
    btn.classList.toggle('on', sketch.orbit);
    sketchControls.enableRotate = sketch.orbit;
    sketchControls.mouseButtons.MIDDLE = sketch.orbit ? THREE.MOUSE.ROTATE : THREE.MOUSE.DOLLY;
    window.__updateLockIcon?.();
    if (!sketch.orbit) {
      // volver a la vista normal a la cara
      orthoCam.up.copy(sketch.vW);
      orthoCam.position.copy(sketchControls.target).addScaledVector(sketch.nW, 500);
      orthoCam.lookAt(sketchControls.target);
    }
    setStatus(sketch.orbit
      ? '🔄 Giro activo: orbita con el botón CENTRAL para ver referencias ocultas; el clic izquierdo sigue dibujando sobre el plano.'
      : 'Giro desactivado: vista normal a la cara restaurada.');
    return;
  }
  if (btn.dataset.tool) {
    // re-tocar la herramienta activa la APAGA (vuelve a Selección, neutral)
    const clicked = btn.dataset.tool;
    const target = (sketch.tool === clicked && clicked !== 'select') ? 'select' : clicked;
    const keepSel = target === 'select';
    sketch.tool = target;
    sketch.temp = null;
    sketch.chainStart = sketch.chainLast = null;
    sketch.dimPick = null;
    sketch.copyOp = null;
    sketch.mirrorOp = null;
    sketch.revolveWait = null;
    sketch.angLock = null;
    dynLock.textContent = '🔓'; dynLock.classList.remove('on');
    dynLen.value = ''; dynAng.value = '';
    hideDynBox();
    if (!keepSel) { sketch.selIds.clear(); }
    sketch.profileMode = false;
    clearGroup(sketch.fills);
    clearGroup(sketch.preview);
    redrawSketch();
    for (const b of sketchbar.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === target);
    setStatus({
      line: 'Línea: toca los puntos (snap a extremos, medios, centros, cuadrantes y tangentes); el 1.º cierra.',
      rect: 'Rectángulo: toca dos esquinas.',
      circle: 'Círculo: toca el centro y luego el radio.',
      pen: 'Lápiz: dibuja a mano alzada — interpreto círculos, líneas y polilíneas.',
      dim: 'Cota: toca 1 entidad (largo/Ø) o 2 (distancia/ángulo), incluidas referencias. 🔒 la fija.',
      trim: 'Recortar: toca el tramo excedente a eliminar (corta contra todo, incluidas referencias).',
      extend: 'Alargar: toca una línea cerca del extremo; se alarga hasta la siguiente entidad o referencia.',
      moveEnt: 'Mover: arrastra una entidad; si tocas una de la selección, se mueve TODA. Las cotas 🔒 restringen.',
      erase: 'Borrar: toca la entidad a eliminar; con varias seleccionadas, borra toda la selección (o tecla Supr).',
      select: 'Selección: arrastra →derecha = ventana; ←izquierda = captura; tap = alternar una. Luego Supr borra o ▶ Mover arrastra toda la selección.',
      arc: 'Arco: toca CENTRO, luego INICIO y FINAL (antihorario).',
      polyg: 'Polígono regular: toca el centro y un vértice; luego eliges los lados.',
      offset: 'Equidistancia: toca una entidad o referencia del lado hacia donde quieres la copia.',
      fillet: 'Empalme: toca dos líneas que se cruzan y define el radio.',
      project: 'Proyectar: toca una CARA (todo su contorno interior+exterior), una ARISTA o un CÍRCULO. Tocar algo proyectado lo quita.',
    }[sketch.tool]);
    return;
  }
  if (btn.id === 'skClose') finishSketch();
  if (btn.id === 'skUndo') sketchUndo();
  if (btn.id === 'skCancel') cancelSketch(false);
});

// ---------- Agujero sobre cara ----------

function clickHole(hit) {
  const part = getPart(doc, hit.object.userData.partId);
  const face = faceAtHit(hit);
  const localPoint = hit.object.worldToLocal(hit.point.clone());
  const localCentroid = face.centroid.clone();
  const localNormal = face.normal.clone();
  showForm(`Agujero en ${part.name}`, [
    { key: 'dia', label: 'Diámetro (mm)', value: 6, step: 0.5 },
    { key: 'through', label: 'Pasante', type: 'checkbox', value: true },
    { key: 'depth', label: 'Profundidad (mm)', value: 10, step: 0.5 },
    { key: 'seat', label: 'Asiento', type: 'select', value: 'none',
      options: [['none', 'Ninguno'], ['cbore', 'Caja (counterbore)'], ['csink', 'Avellanado (countersink)']] },
    { key: 'seatDia', label: 'Ø asiento (mm)', value: 12, step: 0.5 },
    { key: 'seatDepth', label: 'Prof. asiento (mm)', value: 6, step: 0.5 },
    { key: 'center', label: 'Centrar en la cara', type: 'checkbox', value: false },
  ], (v) => {
    pushUndo();
    const at = (v.center ? localCentroid : localPoint).toArray();
    const dir = localNormal.clone().negate().toArray(); // hacia adentro del material
    part.features.push(makeHoleFeature(v.dia, v.depth, v.through, at, dir,
      { seat: v.seat, seatDia: v.seatDia, seatDepth: v.seatDepth }));
    faceCache.clear();
    rebuildPart(part);
    const asiento = v.seat === 'cbore' ? ' con caja' : v.seat === 'csink' ? ' avellanado' : '';
    commit(`Agujero Ø${v.dia}${asiento} agregado a ${part.name}.`);
  });
  // vista previa translúcida del agujero (§6.1): la herramienta de corte real
  // (con asiento) en rojo, actualizada al cambiar los parámetros.
  const pm = meshes.get(part.id)?.mesh;
  if (pm) {
    pm.updateMatrixWorld();
    pm.geometry.computeBoundingBox();
    const extent = pm.geometry.boundingBox.getSize(new THREE.Vector3()).length();
    const upd = () => {
      clearHolePreview();
      const dia = +$('dlg_dia').value;
      if (!(dia > 0)) return;
      const at = ($('dlg_center').checked ? localCentroid : localPoint).toArray();
      const dir = localNormal.clone().negate().toArray();
      const f = { shape: 'hole', at, dir, params: {
        dia, depth: +$('dlg_depth').value, through: $('dlg_through').checked,
        seat: $('dlg_seat').value, seatDia: +$('dlg_seatDia').value, seatDepth: +$('dlg_seatDepth').value } };
      let g; try { g = holeToolGeometry(f, extent); } catch { return; }
      g.applyMatrix4(pm.matrixWorld);
      holePrevGroup = new THREE.Group();
      holePrevGroup.add(new THREE.Mesh(g, opPrevMatC));
      scene.add(holePrevGroup);
    };
    for (const id of ['dlg_dia', 'dlg_depth', 'dlg_seatDia', 'dlg_seatDepth']) $(id)?.addEventListener('input', upd);
    for (const id of ['dlg_through', 'dlg_seat', 'dlg_center']) $(id)?.addEventListener('change', upd);
    upd();
  }
}
let holePrevGroup = null;
function clearHolePreview() {
  if (!holePrevGroup) return;
  scene.remove(holePrevGroup);
  holePrevGroup.traverse(o => o.geometry?.dispose?.());
  holePrevGroup = null;
}

// ---------- Empalme (fillet) / chaflán (chamfer) sobre aristas ----------
// Reutiliza el picker de referencias (aristas/ejes) de la medición; guarda la
// arista en coordenadas locales de la pieza y agrega la función correspondiente.
function clickBlend(hit, kind) {
  const part = getPart(doc, hit.object.userData.partId);
  const ref = pickMeasureRef(hit);
  let a, b;
  if (ref.kind === 'arista') { a = ref.a; b = ref.b; }
  else if (ref.kind === 'eje') { setStatus('Toca una ARISTA (borde recto), no un eje/orificio.'); return; }
  else { setStatus(`${kind === 'fillet' ? 'Empalme' : 'Chaflán'}: toca una arista recta del sólido.`); return; }
  const mesh = meshes.get(part.id).mesh;
  const la = mesh.worldToLocal(a.clone()).toArray();
  const lb = mesh.worldToLocal(b.clone()).toArray();
  const len = a.distanceTo(b);
  const label = kind === 'fillet' ? 'Empalme (redondeo)' : 'Chaflán';
  const fld = kind === 'fillet'
    ? { key: 'r', label: 'Radio (mm)', value: Math.max(1, Math.round(len / 10)), step: 0.5 }
    : { key: 'd', label: 'Distancia (mm)', value: Math.max(1, Math.round(len / 10)), step: 0.5 };
  showForm(`${label} en ${part.name} — arista ${len.toFixed(1)} mm`, [fld], (v) => {
    const size = kind === 'fillet' ? v.r : v.d;
    if (!(size > 0)) { setStatus('El valor debe ser mayor que 0.'); return; }
    pushUndo();
    const edges = [{ a: la, b: lb }];
    part.features.push(kind === 'fillet' ? makeFilletFeature(edges, size) : makeChamferFeature(edges, size));
    faceCache.clear();
    rebuildPart(part);
    const rec = meshes.get(part.id);
    if (!rec || !rec.mesh.geometry.attributes.position?.count) {
      // el modificador no encontró las dos caras (o degeneró): revierte
      part.features.pop();
      rebuildPart(part);
      setStatus('No se pudo aplicar en esa arista (¿aristas paralelas o no rectas?). Prueba otra.');
      return;
    }
    commit(`${label} ${kind === 'fillet' ? 'R' : ''}${size} aplicado a ${part.name}.`);
  });
}

// ---------- Convertir sólido en chapa (reconocer espesor + contorno) ----------
// Toca la CARA GRANDE de una placa: reconoce su espesor (distancia a la cara
// paralela) y su contorno real (exterior + agujeros), y reemplaza la pieza por
// una chapa con ese contorno → acepta pestañas y desarrollo plano (DXF/PDF).
function clickToChapa(hit) {
  const part = getPart(doc, hit.object.userData.partId);
  const rec = meshes.get(part.id);
  if (!part || !rec) return;
  const geom = rec.mesh.geometry, mw = rec.mesh.matrixWorld;
  const face = faceAtHit(hit);
  if (!face.tris?.length) { setStatus('Toca una CARA PLANA grande de la placa.'); return; }
  const nW = face.normal.clone().transformDirection(mw).normalize();
  const cW = face.centroid.clone().applyMatrix4(mw);
  // espesor = extensión de la geometría a lo largo de la normal de la cara
  const pos = geom.attributes.position, p = new THREE.Vector3();
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < pos.count; i++) { const d = p.fromBufferAttribute(pos, i).applyMatrix4(mw).dot(nW); if (d < mn) mn = d; if (d > mx) mx = d; }
  const t = mx - mn;
  if (!(t > 0.05)) { setStatus('No se pudo reconocer el espesor en esa cara.'); return; }
  const { u: uAx, v: vAx } = planeBasis(nW.toArray());
  const toUV = (w) => { const rel = w.clone().sub(cW); return [rel.dot(uAx), rel.dot(vAx)]; };
  const onFaceW = (w) => Math.abs(w.clone().sub(cW).dot(nW)) < 0.15;

  let contorno = null, agujeros = [];
  // 1) contorno ANALÍTICO (pieza CSG: aristas de la cara + círculos exactos)
  const m = partMatrix(part), q = new THREE.Quaternion(...part.quat);
  const prims = referencePrimitives(part);
  const segs = [], circles = [];
  for (const ln of prims.lines) {
    const aw = ln.a.clone().applyMatrix4(m), bw = ln.b.clone().applyMatrix4(m);
    if (onFaceW(aw) && onFaceW(bw)) segs.push([toUV(aw), toUV(bw)]);
  }
  for (const ci of prims.circles) {
    const cw = ci.c.clone().applyMatrix4(m), dw = ci.dir.clone().applyQuaternion(q).normalize();
    if (onFaceW(cw) && Math.abs(dw.dot(nW)) > 0.99) circles.push({ c: toUV(cw), r: ci.r });
  }
  const loopA = chainLoop2D(segs);
  if (loopA && loopA.length >= 3) { contorno = loopA; agujeros = circles; }
  // 2) si no hay analítica (pieza de MALLA real): contorno desde la malla
  if (!contorno) {
    const loops = meshFaceLoops(geom, face.tris, (vv) => toUV(vv.applyMatrix4(mw)));
    if (!loops.length) { setStatus('No se pudo reconocer el contorno de esa cara.'); return; }
    loops.sort((a, b) => b.area - a.area);
    contorno = loops[0].pts;
    agujeros = loops.slice(1).filter(lp => lp.area > 1.5).map(lp => lp.circle ? { c: lp.circle.c, r: lp.circle.r } : lp.pts);
  }
  showForm(`Convertir ${part.name} en chapa — espesor ${t.toFixed(2)} mm, ${agujeros.length} agujero(s)`, [
    { key: 'material', label: 'Material', type: 'select', value: MATERIALES[0].id, options: MATERIALES.map(m => [m.id, `${m.nombre} (K=${m.k})`]) },
    { key: 't', label: 'Espesor (mm)', value: +t.toFixed(2), step: 0.1 },
    { key: 'radio', label: 'Radio de pliegue (mm)', value: +t.toFixed(2), step: 0.1 },
  ], (v) => {
    pushUndo();
    part.features = [makeChapaBaseContorno(contorno, agujeros, v.material, v.t, v.radio, 0, 0)];
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(uAx, vAx, nW));
    part.quat = [q.x, q.y, q.z, q.w];
    part.pos = cW.clone().addScaledVector(nW, -v.t).toArray(); // origen local = cara interior
    faceCache.clear();
    rebuildPart(part);
    commit(`${part.name} convertida en chapa (contorno real, espesor ${v.t}). Agrega ⎣ Pestañas y saca el desarrollo con ⭳ DXF/PDF.`);
  });
}

// ---------- Coincidir / alinear caras ----------

function clickMate(hit, type) {
  const partId = hit.object.userData.partId;
  const face = faceAtHit(hit);
  const anchor = {
    part: partId,
    point: face.centroid.toArray(),
    normal: face.normal.toArray(),
  };
  if (!pickStage) {
    pickStage = { a: anchor };
    keepPickedHighlight(hit, face);
    setStatus('Primera cara elegida. Ahora haz clic en la cara de la otra pieza.');
    return;
  }
  if (pickStage.a.part === partId) { setStatus('Elige una cara de OTRA pieza.'); return; }
  pushUndo();
  doc.constraints.push(makeMate(type, pickStage.a, anchor, 0));
  pickStage = null;
  clearPickedHighlight();
  clearHover();
  solveAndSync();
  setMode(type); // sale del modo (toggle)
  commit(type === 'mate' ? 'Caras coincididas.' : 'Caras alineadas.');
}

// ---------- Concéntrico ----------

function clickConcentric(hit) {
  const part = getPart(doc, hit.object.userData.partId);
  const localPoint = hit.object.worldToLocal(hit.point.clone());
  const found = findAxialFeature(part, localPoint);
  if (!found) { setStatus(`No hay orificio/cilindro cerca del clic en ${part.name}.`); return; }
  const anchor = { part: part.id, point: [...found.at], dir: [...found.dir] };
  if (!pickStage) {
    pickStage = { a: anchor, name: found.feature.name };
    setStatus(`Eje elegido: ${found.feature.name} de ${part.name}. Ahora el orificio de la otra pieza.`);
    return;
  }
  if (pickStage.a.part === part.id) { setStatus('Elige un orificio de OTRA pieza.'); return; }
  pushUndo();
  doc.constraints.push(makeConcentric(pickStage.a, anchor));
  pickStage = null;
  solveAndSync();
  setMode('concentric');
  commit('Restricción concéntrica creada.');
}

// ---------- Escala de pieza (símil "Escala" de edición directa) ----------
// Escala uniforme respecto al origen de la pieza: multiplica posiciones y
// dimensiones de TODAS las funciones por el factor. Uniforme para no deformar
// cilindros (una escala por eje los volvería elipses).
function scalePart(part, s) {
  const SDIM = ['w', 'd', 'h', 'dia', 'depth', 't', 'radio', 'altura', 'e1', 'e2'];
  for (const f of part.features) {
    if (Array.isArray(f.at)) f.at = f.at.map(v => v * s);
    const pr = f.params || {};
    for (const k of SDIM) if (typeof pr[k] === 'number') pr[k] *= s;
    if (Array.isArray(pr.pts)) pr.pts = pr.pts.map(([x, y]) => [x * s, y * s]);
    if (Array.isArray(pr.dims)) for (const d of pr.dims) if (typeof d.value === 'number') d.value *= s;
    if (Array.isArray(pr.entities)) for (const e of pr.entities)
      for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r']) if (typeof e[k] === 'number') e[k] *= s;
  }
}

// ---------- Edición directa de sólidos ----------
// Toca una cara y edita el parámetro de la función que la genera, sin pasar por
// el árbol (símil "Move face" de Inventor): el input primario es la DISTANCIA a
// mover la cara (la opuesta queda fija). Con Shift se acumulan VARIAS caras y se
// mueven todas con una sola distancia.

// Aplica un desplazamiento (mm) a la cara identificada, creciendo hacia ella.
function applyFaceDistance(info, dist) {
  const f = info.feature;
  if (info.kind === 'hole-wall' || info.kind === 'cyl-wall') {
    f.params.dia = Math.max(0.1, f.params.dia + 2 * dist);
    if (f.shape === 'hole') f.name = f.name.replace(/Ø[\d.]+/, `Ø${f.params.dia}`);
  } else if (info.kind === 'cyl-cap' || info.kind === 'sketch-cap') {
    f.params.h = Math.max(0.1, f.params.h + dist);
  } else if (info.kind === 'box-face') {
    const dim = ['w', 'd', 'h'][info.axis];
    const old = f.params[dim], nv = Math.max(0.1, old + dist);
    if (info.axis === 2) { if (info.sign < 0) f.at[2] += old - nv; f.params.h = nv; }
    else { f.at[info.axis] += info.sign * (nv - old) / 2; f.params[dim] = nv; }
  }
}

// Multi-selección de caras (Shift+clic las acumula, resaltadas).
const directSel = [];
let directMeshes = [];
function clearDirectSel() {
  for (const m of directMeshes) { m.parent?.remove(m); m.geometry.dispose(); }
  directMeshes = []; directSel.length = 0;
}
function addDirectFace(hit, face, part, info) {
  const g = faceHighlightGeometry(hit.object.geometry, face.tris);
  const m = new THREE.Mesh(g, pickedMat);
  hit.object.add(m); directMeshes.push(m);
  directSel.push({ part, info });
}

function clickDirect(hit, ev) {
  const part = getPart(doc, hit.object.userData.partId);
  const face = faceAtHit(hit);
  const lp = hit.object.worldToLocal(hit.point.clone());
  const info = identifyFace(part, lp, face.normal);
  if (!info) {
    setStatus('No se reconoce esa cara para edición directa. Edita la función en el navegador de modelo.');
    return;
  }
  // Shift+clic: acumular la cara a la multi-selección (no abre diálogo aún)
  if (ev && ev.shiftKey) {
    addDirectFace(hit, face, part, info);
    setStatus(`${directSel.length} cara(s) seleccionada(s) — clic normal para moverlas por distancia (Esc cancela).`);
    return;
  }
  // Clic normal con caras acumuladas: mover TODAS (incluida esta) por 1 distancia
  if (directSel.length) {
    addDirectFace(hit, face, part, info);
    const faces = directSel.slice();
    const parts = new Set(faces.map(x => x.part));
    showForm(`Mover ${faces.length} caras — símil Move Face`, [
      { key: 'dist', label: 'Distancia (mm): + crece / − reduce (cada cara hacia su normal)', value: 0, step: 0.5 },
    ], (v) => {
      clearDirectSel();
      if (!v.dist) return;
      pushUndo();
      for (const { info: ii } of faces) applyFaceDistance(ii, v.dist);
      faceCache.clear(); clearHover();
      for (const pp of parts) rebuildPart(pp);
      solveAndSync();
      commit(`Movidas ${faces.length} caras ${v.dist} mm.`);
    });
    return;
  }
  const f = info.feature;
  const done = (msg) => {
    faceCache.clear();
    clearHover();
    rebuildPart(part);
    solveAndSync();
    commit(msg);
  };
  if (info.kind === 'hole-wall' || info.kind === 'cyl-wall') {
    // Move face de una pared cilíndrica = desfase radial (Inventor pide distancia).
    showForm(`${f.name} · pared cilíndrica (Ø${f.params.dia})`, [
      { key: 'dist', label: 'Distancia radial (mm): + agranda, − reduce', value: 0, step: 0.5 },
      { key: 'dia', label: 'o fijar diámetro absoluto (mm)', value: f.params.dia, step: 0.5 },
    ], (v) => {
      const nd = v.dist ? f.params.dia + 2 * v.dist : v.dia;
      if (!(nd > 0)) return;
      pushUndo();
      f.params.dia = nd;
      if (f.shape === 'hole') f.name = f.name.replace(/Ø[\d.]+/, `Ø${nd}`);
      done(`${f.name}: Ø${nd} mm.`);
    });
  } else if (info.kind === 'cyl-cap' || info.kind === 'sketch-cap') {
    const q = f.op === 'cut' ? 'profundidad' : 'altura';
    showForm(`${f.name} · cara superior (${q} ${f.params.h})`, [
      { key: 'dist', label: 'Distancia a mover la cara (mm): + alarga, − acorta', value: 0, step: 0.5 },
      { key: 'h', label: `o fijar ${q} absoluta (mm)`, value: f.params.h, step: 0.5 },
    ], (v) => {
      const nh = v.dist ? f.params.h + v.dist : v.h;
      if (!(nh > 0)) return;
      pushUndo();
      f.params.h = nh;
      done(`${f.name}: ${q} ${nh} mm.`);
    });
  } else if (info.kind === 'box-face') {
    const dim = ['w', 'd', 'h'][info.axis];
    const labels = { w: 'Ancho X', d: 'Fondo Y', h: 'Alto Z' };
    const apply = (nv) => {
      const old = f.params[dim];
      if (info.axis === 2) {
        if (info.sign < 0) f.at[2] += old - nv;        // se movió la base: la tapa queda fija
        f.params.h = nv;
      } else {
        f.at[info.axis] += info.sign * (nv - old) / 2; // crece hacia la cara tocada
        f.params[dim] = nv;
      }
    };
    showForm(`${f.name} · cara ${labels[dim].split(' ')[1]}${info.sign > 0 ? '+' : '−'} (${labels[dim]} ${f.params[dim]})`, [
      { key: 'dist', label: 'Distancia a mover la cara (mm): + crece, − reduce — la cara opuesta queda fija', value: 0, step: 0.5 },
      { key: 'v', label: `o fijar ${labels[dim]} absoluto (mm)`, value: f.params[dim], step: 0.5 },
    ], (vals) => {
      const nv = vals.dist ? f.params[dim] + vals.dist : vals.v;
      if (!(nv > 0)) return;
      pushUndo();
      apply(nv);
      done(`${f.name}: ${labels[dim]} ${nv} mm.`);
    });
  }
}

// ---------- Mover (arrastre) ----------

let magnetOn = true; // 🧲 imán de ensamble (activable/desactivable)
$('btnMagnet').classList.add('on');
$('btnMagnet').onclick = () => {
  magnetOn = !magnetOn;
  $('btnMagnet').classList.toggle('on', magnetOn);
  setStatus(magnetOn ? '🧲 Imán activado: al mover, ajusta a caras, alturas, centros y ejes.' : 'Imán desactivado.');
};

function magnetEntry(p) {
  const r = meshes.get(p.id);
  if (!r) return null;
  r.mesh.updateMatrixWorld();
  if (!r.mesh.geometry.boundingBox) r.mesh.geometry.computeBoundingBox();
  const box = r.mesh.geometry.boundingBox.clone().applyMatrix4(r.mesh.matrixWorld);
  const m = partMatrix(p);
  return { min: box.min, max: box.max, axes: referencePoints(p).map(v => v.applyMatrix4(m)) };
}

function verticalPlaneNormal() {
  const n = camera.getWorldDirection(new THREE.Vector3());
  n.z = 0;
  if (n.lengthSq() < 1e-4) n.set(0, 1, 0);
  else n.normalize();
  return n.negate();
}

function startMoveDrag(ev) {
  const hit = castAtEvent(ev);
  if (!hit) return;
  const part = getPart(doc, hit.object.userData.partId);
  if (part.fixed) { setStatus(`${part.name} está fija (📌): desmárcala para moverla.`); return; }
  const free = mainView !== 'persp'; // vista orto bloqueada: mover en el plano de la vista
  const planeNormal = free
    ? activeCamera.getWorldDirection(new THREE.Vector3())
    : (ev.shiftKey ? verticalPlaneNormal() : new THREE.Vector3(0, 0, 1));
  dragging = {
    part,
    free,
    magAxes: free ? ({ top: ['x', 'y'], front: ['x', 'z'], side: ['y', 'z'], iso: ['x', 'y', 'z'] }[mainView]) : null,
    pointerId: ev.pointerId,
    vertical: ev.shiftKey,
    plane: new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, hit.point),
    start: hit.point.clone(),
    lastPoint: hit.point.clone(),
    origPos: [...part.pos],
  };
  if (magnetOn) {
    const mine = magnetEntry(part);
    if (mine) {
      const rel = (v) => ({ x: v.x - part.pos[0], y: v.y - part.pos[1], z: v.z - part.pos[2] });
      dragging.mag = {
        relMin: rel(mine.min), relMax: rel(mine.max),
        relAxes: mine.axes.map(rel),
        others: doc.parts.filter(p => p.id !== part.id && p.visible).map(magnetEntry).filter(Boolean),
      };
    }
  }
  try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* puntero ya liberado */ }
  controls.enabled = false;
  selection = { kind: 'part', id: part.id };
  refreshUI();
}

function switchDragVertical() {
  if (!dragging || dragging.vertical) return;
  dragging.vertical = true;
  dragging.origPos = [...dragging.part.pos];
  dragging.start = dragging.lastPoint.clone();
  dragging.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(verticalPlaneNormal(), dragging.lastPoint);
  setStatus('Movimiento vertical (Z).');
}

function updateMoveDrag(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, activeCamera);
  const p = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragging.plane, p)) return;
  dragging.lastPoint.copy(p);
  const delta = p.sub(dragging.start);
  if (dragging.free) { /* vista orto: movimiento libre en el plano de la vista */ }
  else if (dragging.vertical) { delta.x = 0; delta.y = 0; }
  else { delta.z = 0; }
  dragging.part.pos = [
    dragging.origPos[0] + delta.x,
    dragging.origPos[1] + delta.y,
    dragging.origPos[2] + delta.z,
  ];
  if (magnetOn && dragging.mag && dragging.mag.others.length) {
    const pos = dragging.part.pos;
    const at = (rel) => ({ x: rel.x + pos[0], y: rel.y + pos[1], z: rel.z + pos[2] });
    const my = {
      min: at(dragging.mag.relMin),
      max: at(dragging.mag.relMax),
      axes: dragging.mag.relAxes.map(at),
    };
    const corr = magnetCorrections(my, dragging.mag.others, dragging.magAxes || (dragging.vertical ? ['z'] : ['x', 'y']));
    const labels = [];
    const IDX = { x: 0, y: 1, z: 2 };
    for (const [a, c] of Object.entries(corr)) {
      pos[IDX[a]] += c.d;
      labels.push(`${a.toUpperCase()} ${c.kind}`);
    }
    if (labels.length) setStatus(`🧲 ${labels.join(' · ')}`);
  }
  syncTransform(dragging.part);
}

function endMoveDrag() {
  const moved = dragging.part;
  dragging = null;
  controls.enabled = true;
  pushUndo();
  solveAndSync();
  commit(`${moved.name} movida.`);
}

// ---------- Medición con referencias ----------
// Cada clic elige una referencia: punto (vértice/extremo), arista, cara plana,
// circunferencia (borde de agujero/cilindro) o eje (pared cilíndrica).
// Con dos referencias se calcula distancia perpendicular, entre ejes o ángulo.

let measureRefs = [];
let measureObjs = [];
const measureLabel = $('measureLabel');
let measureAnchor = null;
const measureMat = new THREE.LineBasicMaterial({ color: 0x34a853 });
const measureMat2 = new THREE.LineBasicMaterial({ color: 0xf29900 });

// clasifica el clic en la referencia más específica cercana (coords de MUNDO)
function pickMeasureRef(hit) {
  const part = getPart(doc, hit.object.userData.partId);
  const mw = hit.object.matrixWorld;
  const lp = hit.object.worldToLocal(hit.point.clone());
  const W = (v) => v.clone().applyMatrix4(mw);
  const WD = (v) => v.clone().transformDirection(mw); // dirección (sin traslación)
  const prims = referencePrimitives(part);

  // 1) circunferencia: cerca del borde de un círculo analítico
  let bc = null;
  for (const c of prims.circles) {
    const rel = lp.clone().sub(c.c);
    const t = rel.dot(c.dir);
    const radial = rel.clone().addScaledVector(c.dir, -t).length();
    const d = Math.hypot(t, radial - c.r);
    if (d < 2.5 && (!bc || d < bc.d)) bc = { d, c };
  }
  if (bc) return { kind: 'circulo', part, p: W(bc.c.c), dir: WD(bc.c.dir), r: bc.c.r };

  // 2) arista (o su extremo → punto)
  let bl = null;
  const tmp = new THREE.Vector3();
  for (const l of prims.lines) {
    const cp = new THREE.Line3(l.a, l.b).closestPointToPoint(lp, true, tmp).clone();
    const d = cp.distanceTo(lp);
    if (d < 2.5 && (!bl || d < bl.d)) bl = { d, l, cp };
  }
  if (bl) {
    for (const end of [bl.l.a, bl.l.b]) {
      if (end.distanceTo(lp) < 3) return { kind: 'punto', part, p: W(end) };
    }
    return { kind: 'arista', part, p: W(bl.cp), a: W(bl.l.a), b: W(bl.l.b) };
  }

  // 3) pared cilíndrica → eje
  const face = faceAtHit(hit);
  const axial = identifyFace(part, lp, face.normal);
  if (axial && (axial.kind === 'hole-wall' || axial.kind === 'cyl-wall')) {
    const f = axial.feature;
    return {
      kind: 'eje', part, name: f.name, dia: f.params.dia,
      p: W(new THREE.Vector3(...f.at)),
      dir: WD(new THREE.Vector3(...f.dir).normalize()),
    };
  }

  // 4) cara plana / punto tocado
  if (face.tris.length) {
    return { kind: 'cara', part, p: W(face.centroid), n: WD(face.normal) };
  }
  return { kind: 'punto', part, p: hit.point.clone() };
}

function measureMarker(p) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0x34a853 }));
  m.position.copy(p);
  overlay.add(m);
  measureObjs.push(m);
}
function measureLine(a, b, mat = measureMat) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat);
  overlay.add(l);
  measureObjs.push(l);
}
function drawMeasureRef(r) {
  measureMarker(r.p);
  if (r.kind === 'arista') measureLine(r.a, r.b, measureMat2);
  if (r.kind === 'eje') {
    const L = Math.max(20, r.dia * 2);
    measureLine(r.p.clone().addScaledVector(r.dir, -L), r.p.clone().addScaledVector(r.dir, L), measureMat2);
  }
  if (r.kind === 'circulo') {
    const u = Math.abs(r.dir.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const U = new THREE.Vector3().crossVectors(r.dir, u).normalize();
    const V2 = new THREE.Vector3().crossVectors(r.dir, U);
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push(r.p.clone().addScaledVector(U, Math.cos(a) * r.r).addScaledVector(V2, Math.sin(a) * r.r));
    }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), measureMat2);
    overlay.add(l);
    measureObjs.push(l);
  }
}

const REF_NAME = { punto: 'Punto', arista: 'Arista', cara: 'Cara', circulo: 'Circunferencia', eje: 'Eje' };
function describeRef(r) {
  if (r.kind === 'circulo') return `Circunferencia Ø${(r.r * 2).toFixed(2)} mm`;
  if (r.kind === 'eje') return `Eje de ${r.name} (Ø${r.dia})`;
  if (r.kind === 'arista') return `Arista de ${r.a.distanceTo(r.b).toFixed(2)} mm`;
  if (r.kind === 'cara') return 'Cara plana';
  return `Punto (${r.p.x.toFixed(1)}, ${r.p.y.toFixed(1)}, ${r.p.z.toFixed(1)})`;
}

// línea infinita equivalente de una referencia (arista, eje o eje del círculo)
function refAxis(r) {
  if (r.kind === 'arista') return { p: r.a, dir: r.b.clone().sub(r.a).normalize() };
  if (r.kind === 'eje') return { p: r.p, dir: r.dir.clone() };
  return null;
}
const DEG = (rad) => rad * 180 / Math.PI;
const angBetween = (d1, d2) => DEG(Math.acos(THREE.MathUtils.clamp(Math.abs(d1.dot(d2)), 0, 1)));

function measurePair(A, B) {
  const fmt = (d) => `${d.toFixed(2)} mm`;
  // cara-cara: paralelas → separación; si no → ángulo
  if (A.kind === 'cara' && B.kind === 'cara') {
    if (Math.abs(A.n.dot(B.n)) > 0.999) {
      const d = B.p.clone().sub(A.p).dot(A.n);
      return { text: `Caras paralelas: ${fmt(Math.abs(d))}`, a: A.p, b: A.p.clone().addScaledVector(A.n, d) };
    }
    return { text: `Ángulo entre caras: ${angBetween(A.n, B.n).toFixed(1)}°`, a: A.p, b: B.p };
  }
  // cara + otra referencia
  const face = A.kind === 'cara' ? A : (B.kind === 'cara' ? B : null);
  if (face) {
    const o = face === A ? B : A;
    const ax = refAxis(o);
    if (ax && Math.abs(ax.dir.dot(face.n)) > 0.05) {
      return { text: `Ángulo ${REF_NAME[o.kind].toLowerCase()}–cara: ${(90 - angBetween(ax.dir, face.n)).toFixed(1)}°`, a: face.p, b: o.p };
    }
    const d = o.p.clone().sub(face.p).dot(face.n);
    return { text: `${REF_NAME[o.kind]} a cara (⊥): ${fmt(Math.abs(d))}`, a: o.p, b: o.p.clone().addScaledVector(face.n, -d) };
  }
  // dos con eje (arista/eje): paralelos → distancia entre ejes; si no → ángulo
  const axA = refAxis(A), axB = refAxis(B);
  if (axA && axB) {
    const cross = new THREE.Vector3().crossVectors(axA.dir, axB.dir);
    if (cross.length() < 0.02) {
      const rel = axB.p.clone().sub(axA.p);
      const perp = rel.clone().addScaledVector(axA.dir, -rel.dot(axA.dir));
      return { text: `Distancia entre ${REF_NAME[A.kind].toLowerCase()}s (⊥): ${fmt(perp.length())}`, a: axB.p.clone().sub(perp), b: axB.p };
    }
    return { text: `Ángulo: ${angBetween(axA.dir, axB.dir).toFixed(1)}°`, a: A.p, b: B.p };
  }
  // eje/arista + punto o círculo: distancia radial al eje
  const ax = axA || axB;
  if (ax) {
    const o = axA ? B : A;
    const rel = o.p.clone().sub(ax.p);
    const perp = rel.clone().addScaledVector(ax.dir, -rel.dot(ax.dir));
    return { text: `${REF_NAME[o.kind]} a ${REF_NAME[(axA ? A : B).kind].toLowerCase()} (⊥): ${fmt(perp.length())}`, a: o.p.clone().sub(perp), b: o.p };
  }
  // punto/centro de círculo entre sí: distancia directa + deltas
  const d = A.p.distanceTo(B.p);
  const dl = B.p.clone().sub(A.p);
  const kinds = (A.kind === 'circulo' || B.kind === 'circulo') ? 'entre centros ' : '';
  return { text: `Distancia ${kinds}${fmt(d)}\nΔX ${dl.x.toFixed(2)}  ΔY ${dl.y.toFixed(2)}  ΔZ ${dl.z.toFixed(2)}`, a: A.p, b: B.p };
}

function clickMeasure(hit) {
  if (!hit) return;
  if (measureRefs.length === 0 && measureObjs.length) clearMeasure(); // nueva medición
  const ref = pickMeasureRef(hit);
  drawMeasureRef(ref);
  measureRefs.push(ref);

  if (measureRefs.length === 2) {
    const res = measurePair(measureRefs[0], measureRefs[1]);
    measureLine(res.a, res.b);
    measureAnchor = res.a.clone().add(res.b).multiplyScalar(0.5);
    measureLabel.textContent = res.text;
    measureLabel.style.display = 'block';
    setStatus(res.text.split('\n')[0]);
    measureRefs = [];
  } else {
    setStatus(`${describeRef(ref)} — elige la segunda referencia.`);
  }
}

function clearMeasure() {
  for (const o of measureObjs) { overlay.remove(o); o.geometry?.dispose(); }
  measureObjs = [];
  measureRefs = [];
  measureAnchor = null;
  measureLabel.style.display = 'none';
}

function updateMeasureLabel() {
  if (!measureAnchor) return;
  const v = measureAnchor.clone().project(activeCamera);
  const r = renderer.domElement.getBoundingClientRect();
  measureLabel.style.left = `${(v.x * 0.5 + 0.5) * r.width}px`;
  measureLabel.style.top = `${(-v.y * 0.5 + 0.5) * r.height}px`;
}

// ---------- Toolbar: crear piezas y funciones ----------

$('btnNewBox').onclick = () => showForm('Nueva pieza: caja / placa', [
  { key: 'w', label: 'Ancho X (mm)', value: 80 },
  { key: 'd', label: 'Fondo Y (mm)', value: 60 },
  { key: 'h', label: 'Alto Z (mm)', value: 10 },
], (v) => {
  pushUndo();
  const part = newPart(doc, null);
  part.pos = [nextSpawnX(), 0, 0];
  part.features.push(makeBoxFeature(v.w, v.d, v.h));
  selection = { kind: 'part', id: part.id };
  rebuildPart(part);
  commit(`${part.name} creada.`);
});

$('btnChapa').onclick = () => showForm('Nueva pieza: chapa plegada', [
  { key: 'material', label: 'Material', type: 'select', value: 'acero',
    options: MATERIALES.map(m => [m.id, `${m.nombre} (K=${m.k})`]) },
  { key: 't', label: 'Espesor (mm, 0 = del material)', value: 2, step: 0.5 },
  { key: 'radio', label: 'Radio pliegue (mm, 0 = espesor)', value: 0, step: 0.5 },
  { key: 'k', label: 'Factor K (0 = del material)', value: 0, step: 0.01 },
  { key: 'w', label: 'Ancho X (mm)', value: 100 },
  { key: 'd', label: 'Fondo Y (mm)', value: 60 },
], (v) => {
  pushUndo();
  const part = newPart(doc, null);
  part.pos = [nextSpawnX(), 0, 0];
  const f = makeChapaBase(v.w, v.d, v.material, v.t, v.radio, v.k);
  part.features.push(f);
  part.name = `Chapa ${materialPorId(f.params.material).nombre} ${f.params.t} mm`;
  selection = { kind: 'part', id: part.id };
  rebuildPart(part);
  commit(`${part.name} creada — agrega pestañas con ⎣ (radio def=${f.params.radio}, K=${f.params.k}).`);
});

function exportDesarrollo(part, exporter, kind) {
  const flat = flatPattern(part);
  if (!flat) { setStatus('La pieza no es de chapa.'); return; }
  try {
    const r = exporter(flat, { designacion: part.name });
    download(new Blob([r.data], { type: r.mime }), r.name);
    setStatus(`Desarrollo ${kind} exportado (${r.info}).` +
      (flat.avisos.length ? ' AVISO: ' + flat.avisos[0] : ''));
  } catch (e) {
    setStatus(`Desarrollo ${kind}: ${e.message}`);
  }
}

$('btnNewCyl').onclick = () => showForm('Nueva pieza: cilindro', [
  { key: 'dia', label: 'Diámetro (mm)', value: 30 },
  { key: 'h', label: 'Altura (mm)', value: 40 },
], (v) => {
  pushUndo();
  const part = newPart(doc, null);
  part.pos = [nextSpawnX(), 0, 0];
  part.features.push(makeCylFeature(v.dia, v.h));
  selection = { kind: 'part', id: part.id };
  rebuildPart(part);
  commit(`${part.name} creada.`);
});

function nextSpawnX() {
  return doc.parts.length ? Math.max(...doc.parts.map(p => p.pos[0])) + 100 : 0;
}

// ---------- Biblioteca de componentes electrónicos ----------

// grupo de un componente para el filtro de la biblioteca
const compGroup = (c) => (c.ensamble || c.doc) ? 'transportador'
  : c.malla ? (c.malla.nodo ? 'subcomp' : 'transportador')
  : (c.categoria === 'mecanico' ? 'mecanico' : 'electronico');

$('btnComp').onclick = async () => {
  let cat;
  try {
    cat = await loadCatalogo();
  } catch (err) {
    setStatus(`Catálogo de componentes no disponible: ${err.message}`);
    return;
  }
  const CHIPS = [['todos', 'Todos'], ['electronico', 'Electrónicos'], ['transportador', 'Transportador'], ['subcomp', 'Subcomp.']];
  let filtro = 'todos', q = '';
  const matches = (c) => (filtro === 'todos' || compGroup(c) === filtro)
    && (!q || `${c.nombre} ${c.id} ${c.familia || ''} ${c.descripcion || ''}`.toLowerCase().includes(q));
  const insert = (c) => {
    hideDialog();
    if (c.doc) { insertDocAssembly(c); return; }    // ensamble foto3d-cad (piezas + restricciones)
    if (c.ensamble) { insertAssembly(c); return; }  // GLB multi-pieza → ensamble, no un sólido
    pushUndo();
    const part = componentToPart(c);
    const [lo] = envolvente(c);
    part.pos = [nextSpawnX() - lo[0], 0, lo[2] < 0 ? -lo[2] : 0]; // apoyado en Z=0
    part.fixed = doc.parts.length === 0;
    doc.parts.push(part);
    selection = { kind: 'part', id: part.id };
    rebuildPart(part);
    commit(`${c.nombre} insertado.${c.notas ? ' ' + c.notas : ''}`);
  };
  const BADGE = { electronico: '', transportador: 'malla', subcomp: 'subcomp' };
  function renderList() {
    const items = cat.componentes.map((c, i) => ({ c, i })).filter(({ c }) => matches(c));
    $('comp_list').innerHTML = items.length ? items.map(({ c, i }) => {
      const [lo, hi] = envolvente(c);
      const dims = [0, 1, 2].map(k => (hi[k] - lo[k]).toFixed(1)).join(' × ');
      const badge = c.ensamble ? 'ensamble' : c.malla ? BADGE[compGroup(c)] : c.categoria;
      return `<button class="comp-item" data-idx="${i}" title="${esc(c.descripcion || '')}">` +
        `${esc(c.nombre)}<br><small>${esc(badge)}${badge ? ' · ' : ''}${dims} mm</small></button>`;
    }).join('') : '<div class="meta" style="padding:12px 4px">Sin resultados.</div>';
    $('comp_count').textContent = items.length;
  }
  dialog.innerHTML = '<h3>Insertar componente</h3>' +
    '<input id="comp_q" type="search" placeholder="Buscar por nombre, familia, id…" autocomplete="off">' +
    '<div id="comp_chips" class="chiprow">' +
      CHIPS.map(([k, l]) => `<button class="chip${k === 'todos' ? ' on' : ''}" data-f="${k}">${l}</button>`).join('') + '</div>' +
    '<div id="comp_list" class="complist"></div>' +
    '<p style="font-size:11px;opacity:.7;margin:8px 0 0"><span id="comp_count"></span> ítem(s) · dimensiones nominales (capa user): verificar. docs/COMPONENTES.md</p>' +
    '<div class="btnrow"><button id="dlg_cancel">Cerrar</button></div>';
  dialog.style.display = 'block';
  $('dlg_cancel').onclick = hideDialog;
  $('comp_q').oninput = (e) => { q = e.target.value.trim().toLowerCase(); renderList(); };
  $('comp_chips').onclick = (e) => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    filtro = b.dataset.f;
    [...$('comp_chips').children].forEach(x => x.classList.toggle('on', x === b));
    renderList();
  };
  $('comp_list').onclick = (e) => {
    const b = e.target.closest('button[data-idx]'); if (!b) return;
    insert(cat.componentes[+b.dataset.idx]);
  };
  renderList();
  if (!isNarrow()) $('comp_q').focus(); // en móvil no forzar el teclado
};

$('btnFeature').onclick = () => {
  const part = selection?.kind === 'part' ? getPart(doc, selection.id)
    : selection?.kind === 'feature' ? getPart(doc, selection.partId) : null;
  if (!part) { setStatus('Primero selecciona una pieza (en el árbol o con clic).'); return; }
  showForm(`Agregar función a ${part.name}`, [
    { key: 'shape', label: 'Forma', type: 'select', value: 'box', options: [['box', 'Caja'], ['cylinder', 'Cilindro']] },
    { key: 'op', label: 'Operación', type: 'select', value: 'union', options: [['union', 'Unión (agregar material)'], ['cut', 'Corte (quitar material)']] },
    { key: 'w', label: 'Ancho X / Diámetro', value: 20 },
    { key: 'd', label: 'Fondo Y', value: 20 },
    { key: 'h', label: 'Alto / Largo', value: 20 },
    { key: 'x', label: 'Posición X', value: 0 },
    { key: 'y', label: 'Posición Y', value: 0 },
    { key: 'z', label: 'Posición Z', value: 0 },
    { key: 'axis', label: 'Eje (cilindro)', type: 'select', value: 'z', options: [['z', 'Z'], ['x', 'X'], ['y', 'Y']] },
  ], (v) => {
    pushUndo();
    const at = [v.x, v.y, v.z];
    let f;
    if (v.shape === 'box') f = makeBoxFeature(v.w, v.d, v.h, at, v.op);
    else {
      const dir = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[v.axis];
      f = makeCylFeature(v.w, v.h, at, dir, v.op);
    }
    part.features.push(f);
    faceCache.clear();
    rebuildPart(part);
    commit(`Función agregada a ${part.name}.`);
  });
};

// ---------- Patrones de funciones (rectangular / circular) ----------

function selectedFeatureForPattern() {
  if (selection?.kind !== 'feature') return null;
  const part = getPart(doc, selection.partId);
  const f = part && getFeature(part, selection.id);
  if (!f || f.shape === 'pattern') return null;
  return { part, f };
}

function patternRect() {
  const sel = selectedFeatureForPattern();
  if (!sel) { setStatus('Patrón rectangular: primero selecciona en el árbol la función a repetir (agujero, cilindro, boceto…).'); return; }
  const { part, f } = sel;
  showForm(`Patrón rectangular de "${f.name}"`, [
    { key: 'nx', label: 'Nº en dirección X', value: 3, step: 1 },
    { key: 'dx', label: 'Separación X (mm)', value: 20, step: 1 },
    { key: 'ny', label: 'Nº en dirección Y', value: 2, step: 1 },
    { key: 'dy', label: 'Separación Y (mm)', value: 20, step: 1 },
  ], (v) => {
    const nx = Math.max(1, Math.round(v.nx)), ny = Math.max(1, Math.round(v.ny));
    if (nx * ny < 2) { setStatus('Un patrón necesita al menos 2 ocurrencias.'); return; }
    pushUndo();
    const pat = makePatternFeature(f.id, 'rect', { nx, ny, dx: v.dx, dy: v.dy, u: [1, 0, 0], v: [0, 1, 0] });
    part.features.push(pat);
    faceCache.clear();
    rebuildPart(part);
    commit(`Patrón rectangular ${nx}×${ny} de "${f.name}".`);
  });
}

function patternCirc() {
  const sel = selectedFeatureForPattern();
  if (!sel) { setStatus('Patrón circular: primero selecciona en el árbol la función a repetir.'); return; }
  const { part, f } = sel;
  showForm(`Patrón circular de "${f.name}"`, [
    { key: 'n', label: 'Nº de ocurrencias', value: 6, step: 1 },
    { key: 'angle', label: 'Ángulo total (°)', value: 360, step: 15 },
    { key: 'axis', label: 'Eje de giro', type: 'select', value: 'z', options: [['z', 'Z (vertical)'], ['x', 'X'], ['y', 'Y']] },
    { key: 'cx', label: 'Centro X (mm)', value: 0 },
    { key: 'cy', label: 'Centro Y (mm)', value: 0 },
    { key: 'cz', label: 'Centro Z (mm)', value: 0 },
  ], (v) => {
    const n = Math.max(2, Math.round(v.n));
    const axisDir = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[v.axis];
    pushUndo();
    const pat = makePatternFeature(f.id, 'circ', { n, angle: v.angle, axisAt: [v.cx, v.cy, v.cz], axisDir });
    part.features.push(pat);
    faceCache.clear();
    rebuildPart(part);
    commit(`Patrón circular de ${n} de "${f.name}".`);
  });
}

$('btnPatRect').onclick = patternRect;
$('btnPatCirc').onclick = patternCirc;

// ---------- Exportar STL ----------

// STL binario de una lista de piezas (world = false → pieza sola en su origen)
function exportSTL(parts, filename, world = true) {
  const geoms = [];
  for (const part of parts) {
    const rec = meshes.get(part.id);
    if (!rec) continue;
    rec.mesh.updateWorldMatrix(true, false);
    const g = rec.mesh.geometry.clone();
    if (world) g.applyMatrix4(rec.mesh.matrixWorld);
    geoms.push(g);
  }
  let triCount = 0;
  for (const g of geoms) triCount += g.attributes.position.count / 3;
  if (!triCount) { setStatus('No hay geometría para exportar.'); return; }
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const dv = new DataView(buffer);
  dv.setUint32(80, triCount, true);
  let off = 84;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (const g of geoms) {
    const pos = g.attributes.position;
    for (let t = 0; t < pos.count; t += 3) {
      a.fromBufferAttribute(pos, t); b.fromBufferAttribute(pos, t + 1); c.fromBufferAttribute(pos, t + 2);
      n.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
      for (const v of [n, a, b, c]) {
        dv.setFloat32(off, v.x, true); dv.setFloat32(off + 4, v.y, true); dv.setFloat32(off + 8, v.z, true);
        off += 12;
      }
      off += 2;
    }
    g.dispose();
  }
  download(new Blob([buffer], { type: 'model/stl' }), filename);
  setStatus(`STL exportado: ${filename} (${triCount} triángulos).`);
}
$('btnSTL').onclick = () => exportSTL(doc.parts.filter(p => p.visible), 'ensamble.stl');

// guardar UNA pieza como proyecto JSON de 1 pieza (mantiene los parámetros fx)
function savePartJSON(part) {
  const one = { format: 'foto3d-cad', version: 1, params: doc.params || [],
    parts: [JSON.parse(JSON.stringify(part))], constraints: [] };
  one.parts[0].pos = [0, 0, 0]; one.parts[0].fixed = true;
  download(new Blob([JSON.stringify(one, null, 2)], { type: 'application/json' }),
    `${part.name.replace(/[^\w.-]+/g, '_')}.json`);
  setStatus(`Pieza "${part.name}" guardada como JSON (ábrela con 📂 Abrir → Agregar).`);
}

// ---------- Lista de materiales (BOM) ----------

function partVolumeCm3(part) {
  const rec = meshes.get(part.id);
  const pos = rec?.mesh.geometry.attributes.position;
  if (!pos) return 0;
  let v = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    v += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return Math.abs(v) / 1000;
}
// enumera y agrupa piezas idénticas (por nombre) → filas del BOM
function buildBOM() {
  const groups = new Map();
  for (const p of doc.parts) {
    const g = groups.get(p.name) || { name: p.name, qty: 0,
      material: esChapa(p) ? materialPorId(chapaOf(p).params.material).nombre : '—',
      vol: partVolumeCm3(p) };
    g.qty++; groups.set(p.name, g);
  }
  return [...groups.values()].map((g, i) => ({ item: i + 1, ...g }));
}
function bomCSV(rows) {
  const head = 'ITEM,CANT,PIEZA,MATERIAL,VOL_C/U_CM3,VOL_TOTAL_CM3';
  const body = rows.map(r => `${r.item},${r.qty},"${r.name}",${r.material},${r.vol.toFixed(1)},${(r.vol * r.qty).toFixed(1)}`);
  return [head, ...body].join('\r\n') + '\r\n';
}
$('btnBom').onclick = () => {
  const rows = buildBOM();
  if (!rows.length) { setStatus('No hay piezas para el BOM.'); return; }
  const totPz = rows.reduce((s, r) => s + r.qty, 0), totVol = rows.reduce((s, r) => s + r.vol * r.qty, 0);
  dialog.innerHTML = `<h3>🧾 Lista de materiales (BOM)</h3>
    <div style="max-height:210px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="color:var(--dim);text-align:left"><th>#</th><th>Cant</th><th>Pieza</th><th>Material</th><th style="text-align:right">cm³ c/u</th></tr>
      ${rows.map(r => `<tr style="border-top:1px solid var(--border)"><td>${r.item}</td><td>${r.qty}</td><td>${esc(r.name)}</td><td>${esc(r.material)}</td><td style="text-align:right">${r.vol.toFixed(1)}</td></tr>`).join('')}
    </table></div>
    <p style="font-size:12px;color:var(--dim);margin-top:6px">${rows.length} referencia(s) · ${totPz} pieza(s) · volumen total ${totVol.toFixed(1)} cm³</p>
    <div class="btnrow"><button id="bomCsv" class="on">⭳ CSV</button><button id="bomClose">Cerrar</button></div>`;
  dialog.style.display = 'block';
  $('bomClose').onclick = hideDialog;
  $('bomCsv').onclick = () => {
    download(new Blob([bomCSV(rows)], { type: 'text/csv' }), 'lista_materiales_BOM.csv');
    setStatus(`BOM exportado: ${rows.length} referencia(s), ${totPz} pieza(s).`);
  };
};

// ---------- Exportar plano técnico (DXF / PDF con marco y cajetín ISO) ----------

function drawingParts() {
  const out = [];
  for (const part of doc.parts) {
    const rec = meshes.get(part.id);
    if (!rec || !part.visible) continue;
    rec.mesh.updateWorldMatrix(true, false);
    out.push({ geometry: rec.mesh.geometry, matrixWorld: rec.mesh.matrixWorld, name: part.name });
  }
  return out;
}

function exportDrawing(exporter, kind) {
  const parts = drawingParts();
  if (!parts.length) { setStatus('No hay geometría para exportar.'); return; }
  // piezas de chapa presentes: la cota de espesor se indica siempre en la lámina
  const espesores = [...new Set(doc.parts.filter(p => p.visible && esChapa(p))
    .map(p => chapaOf(p).params.t))];
  const meta = {
    designacion: parts.length === 1 ? parts[0].name : `Ensamble — ${parts.length} piezas`,
    piezas: parts.length,
    espesor: espesores.length ? espesores.join(' / ') : null,
  };
  try {
    const r = exporter(parts, meta);
    download(new Blob([r.data], { type: r.mime }), r.name);
    setStatus(`Plano ${kind} exportado (${r.info}).`);
  } catch (e) {
    setStatus(`Plano ${kind}: ${e.message}`);
  }
}

$('btnDXF').onclick = () => exportDrawing(exportDrawingDXF, 'DXF');
$('btnPDF').onclick = () => exportDrawing(exportDrawingPDF, 'PDF');

// ---------- Guardar / abrir / nuevo / demo ----------

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

$('btnSave').onclick = () => {
  download(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), 'proyecto-cad.json');
  setStatus('Proyecto descargado.');
};

$('btnOpen').onclick = () => $('fileInput').click();
$('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    // con proyecto abierto, permite AGREGAR las piezas (abrir piezas sueltas)
    const mode = doc.parts.length
      ? (confirm(`Abrir "${file.name}":\nAceptar = AGREGAR sus piezas al proyecto\nCancelar = REEMPLAZAR todo`) ? 'merge' : 'replace')
      : 'replace';
    importData(data, mode);
  } catch (err) {
    setStatus(`No se pudo abrir: ${err.message}`);
  }
});

// 📋 Pegar: importar piezas/proyectos JSON generados por IA (PROMPT_PIEZAS.md)
// sin pasar por archivos — clave para trabajar desde el celular/tableta.
function importData(data, modo) {
  if (data.format !== 'foto3d-cad' || !Array.isArray(data.parts)) {
    throw new Error('formato desconocido: se espera {"format":"foto3d-cad","parts":[...]}');
  }
  pushUndo();
  if (modo === 'replace') {
    doc = data;
    doc.constraints = doc.constraints || [];
    selection = null;
    clearMeasure();
    rebuildAll();
    solveAndSync();
    frameModel();
    commit(`Proyecto importado: ${doc.parts.length} pieza(s).`);
    return;
  }
  // agregar al proyecto actual: remapear ids que chocan y sumar restricciones
  const hadParts = doc.parts.length > 0;
  const remap = new Map();
  for (const p of data.parts) {
    if (getPart(doc, p.id)) { const nid = uid('p'); remap.set(p.id, nid); p.id = nid; }
    if (hadParts) p.fixed = false; // la pieza fija ya existe en el proyecto
    p.visible = p.visible !== false;
    doc.parts.push(p);
    rebuildPart(p);
  }
  for (const c of (data.constraints || [])) {
    c.id = uid('c');
    if (remap.has(c.a?.part)) c.a.part = remap.get(c.a.part);
    if (remap.has(c.b?.part)) c.b.part = remap.get(c.b.part);
    doc.constraints.push(c);
  }
  solveAndSync();
  commit(`${data.parts.length} pieza(s) agregadas al proyecto${(data.constraints || []).length ? ' con sus restricciones' : ''}.`);
}

$('btnPaste').onclick = () => {
  dialog.innerHTML = `<h3>📋 Pegar piezas (JSON de IA)</h3>
    <p style="font-size:12px;color:var(--dim);margin-bottom:8px">
      Pega el JSON generado con el prompt de <b>PROMPT_PIEZAS.md</b>
      (formato <code>foto3d-cad</code>).</p>
    <textarea id="pasteArea" spellcheck="false" placeholder='{"format":"foto3d-cad","parts":[...]}'
      style="width:100%;height:160px;background:var(--bg);color:var(--text);border:1px solid var(--border);
             border-radius:7px;padding:8px;font-size:12px;font-family:ui-monospace,monospace"></textarea>
    <div class="frow" style="margin-top:8px"><label>Modo</label>
      <select id="pasteMode">
        <option value="merge">Agregar al proyecto actual</option>
        <option value="replace">Reemplazar todo el proyecto</option>
      </select></div>
    <div class="btnrow"><button id="pasteOk" class="on">Importar</button><button id="pasteCancel">Cancelar</button></div>`;
  dialog.style.display = 'block';
  $('pasteCancel').onclick = hideDialog;
  $('pasteOk').onclick = () => {
    let data;
    try { data = JSON.parse($('pasteArea').value); }
    catch (err) { setStatus(`JSON inválido: ${err.message}`); return; }
    try {
      importData(data, $('pasteMode').value);
      hideDialog();
    } catch (err) { setStatus(`No se pudo importar: ${err.message}`); }
  };
  $('pasteArea').focus();
};

// ---------- Parámetros globales (fx) ----------

function renderParamRows() {
  const scope = resolveParams(doc);
  const rows = (doc.params || []).map((p, i) => {
    const v = evalExpr(p.expr, resolveParams({ params: (doc.params || []).slice(0, i) }));
    return `<div class="frow" data-i="${i}" style="gap:4px">
      <input type="text" class="pnm" value="${esc(p.name)}" placeholder="nombre" style="flex:0 0 90px">
      <input type="text" class="pex" value="${esc(String(p.expr))}" placeholder="valor o fórmula" style="flex:1">
      <span class="meta" style="flex:0 0 54px;text-align:right">${Number.isFinite(v) ? +v.toFixed(3) : '—'}</span>
      <button class="prm danger" title="Quitar">✕</button>
    </div>`;
  }).join('');
  return rows || '<div class="meta" style="color:var(--dim)">Sin parámetros. Agrega uno (p. ej. ancho = 120).</div>';
}
function openParams() {
  doc.params = doc.params || [];
  dialog.innerHTML = `<h3>ƒx Parámetros globales</h3>
    <p style="font-size:12px;color:var(--dim);margin-bottom:6px">Nombre = valor o fórmula (cita parámetros anteriores: <code>paso = ancho/4</code>). En las cotas de una función escribe el nombre para vincularla.</p>
    <div id="paramList" style="max-height:180px;overflow:auto">${renderParamRows()}</div>
    <div class="btnrow"><button id="paramAdd">+ Parámetro</button></div>
    <div class="btnrow"><button id="paramOk" class="on">Aplicar</button><button id="paramCancel">Cancelar</button></div>`;
  dialog.style.display = 'block';
  const readRows = () => [...dialog.querySelectorAll('#paramList .frow')].map(r => ({
    name: r.querySelector('.pnm')?.value.trim(), expr: r.querySelector('.pex')?.value.trim(),
  })).filter(p => p.name);
  dialog.querySelector('#paramAdd').onclick = () => {
    doc.params = readRows(); doc.params.push({ name: '', expr: '0' });
    dialog.querySelector('#paramList').innerHTML = renderParamRows();
  };
  dialog.querySelector('#paramList').addEventListener('click', (e) => {
    const btn = e.target.closest('.prm'); if (!btn) return;
    const i = +btn.closest('.frow').dataset.i;
    doc.params = readRows().filter((_, k) => k !== i);
    dialog.querySelector('#paramList').innerHTML = renderParamRows();
  });
  $('paramCancel').onclick = hideDialog;
  $('paramOk').onclick = () => {
    pushUndo();
    doc.params = readRows();
    for (const part of doc.parts) rebuildPart(part);
    solveAndSync();
    hideDialog();
    commit(`${doc.params.length} parámetro(s) aplicados.`);
  };
}
$('btnParams').onclick = openParams;

$('btnClear').onclick = () => {
  pushUndo();
  doc = newDoc();
  selection = null;
  clearMeasure();
  rebuildAll();
  commit('Proyecto nuevo.');
};

$('btnDemo').onclick = () => { pushUndo(); loadDemo(); frameModel(); commit('Ejemplo cargado.'); };

function loadDemo() {
  doc = newDoc();
  selection = null;

  // Base: placa 120×80×10 con 4 agujeros pasantes Ø6
  const base = newPart(doc, 'Base');
  base.features.push(makeBoxFeature(120, 80, 10));
  for (const [x, y] of [[-45, -25], [45, -25], [-45, 25], [45, 25]]) {
    base.features.push(makeHoleFeature(6, 10, true, [x, y, 10], [0, 0, -1]));
  }

  // Puente: placa 110×40×8 + torreta cilíndrica Ø30 con agujero pasante Ø14
  const puente = newPart(doc, 'Puente');
  puente.pos = [40, 150, 30];
  puente.features.push(makeBoxFeature(110, 40, 8));
  puente.features.push(makeCylFeature(30, 22, [0, 0, 8]));
  puente.features.push(makeHoleFeature(14, 30, true, [0, 0, 30], [0, 0, -1]));
  const h1 = makeHoleFeature(6, 8, true, [-45, 0, 8], [0, 0, -1]);
  const h2 = makeHoleFeature(6, 8, true, [45, 0, 8], [0, 0, -1]);
  puente.features.push(h1, h2);

  // Restricciones: apoyar el puente sobre la base y alinear dos orificios
  doc.constraints.push(makeMate('mate',
    { part: base.id, point: [0, 0, 10], normal: [0, 0, 1] },
    { part: puente.id, point: [0, 0, 0], normal: [0, 0, -1] }, 0));
  doc.constraints.push(makeConcentric(
    { part: base.id, point: [-45, 25, 10], dir: [0, 0, -1] },
    { part: puente.id, point: [-45, 0, 8], dir: [0, 0, -1] }));
  doc.constraints.push(makeConcentric(
    { part: base.id, point: [45, 25, 10], dir: [0, 0, -1] },
    { part: puente.id, point: [45, 0, 8], dir: [0, 0, -1] }));

  rebuildAll();
  solveAndSync();
}

// ---------- Arranque ----------

(function start() {
  setIcons(document); // inyecta los iconos SVG en la barra superior, el riel y el panel
  let restored = false;
  try {
    const saved = localStorage.getItem('foto3d-cad-doc');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.format === 'foto3d-cad' && data.parts?.length) {
        doc = data;
        rebuildAll();
        solveAndSync();
        setStatus('Proyecto anterior restaurado (usa 🗑 Nuevo para empezar de cero).');
        restored = true;
      }
    }
  } catch (e) { /* almacenamiento no disponible o corrupto */ }
  if (!restored) { loadDemo(); setStatus('Ensamble de ejemplo cargado. Prueba ◎ Agujero, ▬ Coincidir o 📏 Medir.'); }
  frameModel(); // el pivote de órbita arranca en el centro del modelo
  setMainView('ortho'); // por defecto ortográfica libre (sin perspectiva), símil Inventor
  const vcProj0 = document.getElementById('vcProj');
  if (vcProj0) { vcProj0.innerHTML = svgIcon('ortho'); vcProj0.classList.add('on'); }
  refreshUI();
})();

// API expuesta para pruebas automatizadas
window.__cad = {
  get doc() { return doc; },
  set doc(d) { doc = d; },
  get sketch() { return sketch; },
  get activeCamera() { return activeCamera; },
  rebuildAll, solveAndSync, loadDemo, setMode,
  get selection() { return selection; },
  set selection(s) { selection = s; },
  refreshUI, refreshProps, redrawSketch, syncDimEls, updateSketchLabels,
  meshes, scene, camera,
  THREE,
};
