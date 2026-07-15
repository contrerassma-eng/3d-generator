// app.js — foto3d CAD: mini diseño paramétrico símil Inventor.
// Unidades: milímetros. Eje Z hacia arriba.

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { loadCatalogo, componentToPart, envolvente } from './componentes.js';
import {
  newDoc, newPart, getPart, getFeature, partMatrix, uid,
  makeBoxFeature, makeCylFeature, makeHoleFeature, makeSketchFeature,
  makeSketchEntitiesFeature, makeRevolveFeature, planeBasis, referenceEdges, referencePoints, referencePrimitives, magnetCorrections,
  buildPartGeometry, planarFaceFromHit, faceHighlightGeometry, findAxialFeature, identifyFace,
  makeMate, makeConcentric, solveConstraints,
} from './model.js';
import * as SK from './sketch2d.js';
import { exportDrawingDXF, exportDrawingPDF, exportFlatDXF, exportFlatPDF } from './drawing2d.js';
import { MATERIALES, materialPorId, makeChapaBase, makePestana, chapaOf, esChapa,
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

// cámara ortogonal para el modo boceto (vista normal a la cara)
const orthoCam = new THREE.OrthographicCamera(-150, 150, 150, -150, -5000, 5000);
let orthoViewSize = 300;
const sketchControls = new OrbitControls(orthoCam, renderer.domElement);
sketchControls.enableRotate = false; // en boceto solo paneo y zoom
sketchControls.enabled = false;
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
const VIEW_NAMES = { persp: 'Perspectiva', top: 'Planta', front: 'Frente', side: 'Lateral', iso: 'Isométrica' };

function setMainView(v) {
  mainView = v;
  if (v === 'persp') {
    activeCamera = camera;
    controls.enabled = true;
    sketchControls.enabled = false;
    viewBtn?.classList.remove('on');
    setStatus('Vista en perspectiva libre.');
    return;
  }
  const box = new THREE.Box3();
  for (const rec of meshes.values()) if (rec.mesh.visible) box.expandByObject(rec.mesh);
  if (box.isEmpty()) box.set(new THREE.Vector3(-100, -100, 0), new THREE.Vector3(100, 100, 100));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const DIRS = { top: [0, 0, 1], front: [0, -1, 0], side: [1, 0, 0], iso: [1, -1, 1] };
  const UPS = { top: [0, 1, 0], front: [0, 0, 1], side: [0, 0, 1], iso: [0, 0, 1] };
  const dir = new THREE.Vector3(...DIRS[v]).normalize();
  orthoViewSize = Math.max(120, size * 1.3);
  orthoCam.zoom = 1;
  orthoCam.up.set(...UPS[v]);
  orthoCam.position.copy(center).addScaledVector(dir, 600);
  orthoCam.lookAt(center);
  sketchControls.target.copy(center);
  sketchControls.enableRotate = false;
  sketchControls.enabled = true;
  controls.enabled = false;
  activeCamera = orthoCam;
  resize();
  viewBtn?.classList.add('on');
  setStatus(`Vista ${VIEW_NAMES[v]} bloqueada (ortogonal, sin giro): paneo/zoom libres; Mover arrastra en el plano de la vista.`);
}

if (viewBtn) viewBtn.onclick = () => {
  if (sketch) { setStatus('Sal del boceto para cambiar la vista del ensamble.'); return; }
  showForm('Vista del ensamble', [
    { key: 'v', label: 'Vista', type: 'select', value: mainView, options: [
      ['persp', 'Perspectiva (libre)'], ['top', 'Planta (orto)'], ['front', 'Frente (orto)'],
      ['side', 'Lateral (orto)'], ['iso', 'Isométrica (orto)']] },
  ], (val) => setMainView(val.v));
};

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

renderer.setAnimationLoop(() => {
  if (controls.enabled) controls.update();
  if (sketchControls.enabled) sketchControls.update();
  updateMeasureLabel();
  if (sketch) updateSketchLabels();
  renderer.render(scene, activeCamera);
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
function setHint(msg) {
  hintEl.textContent = msg || '';
  hintEl.style.display = msg ? 'block' : 'none';
}

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

// ---------- Reconstrucción ----------

function rebuildPart(part) {
  disposePartMesh(part.id);
  if (!part.features.length) { refreshUI(); return; }
  const geom = buildPartGeometry(part);
  if (!geom.attributes.position || geom.attributes.position.count === 0) {
    // sin material (p. ej. solo cortes): no hay nada que mostrar
    setStatus(`${part.name}: sin material — agrega una función de unión.`);
    refreshUI();
    return;
  }
  const mesh = new THREE.Mesh(geom, matFor(part));
  mesh.userData.partId = part.id;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 20), edgeMat);
  mesh.add(edges);
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
  rec.edges.geometry.dispose();
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

const OP_ICON = { union: '⊕', cut: '⊖' };

function refreshUI() {
  const tree = $('tree');
  let html = '<h3>Piezas</h3>';
  for (const part of doc.parts) {
    const sel = selection?.kind === 'part' && selection.id === part.id ? ' sel' : '';
    html += `<div class="node${sel}" data-kind="part" data-id="${part.id}">
      <span class="swatch" style="background:${part.color}"></span>
      <span class="nm">${esc(part.name)}${part.fixed ? ' 📌' : ''}</span>
      <button data-act="vis" title="Mostrar/ocultar">${part.visible ? '👁' : '—'}</button>
      <button data-act="iso" title="Aislar: mostrar solo esta pieza (toca de nuevo para restaurar)">⛶</button>
      <button data-act="del" class="danger" title="Eliminar la pieza y sus restricciones">🗑</button>
    </div><div class="children">`;
    part.features.forEach((f, fi) => {
      const fsel = selection?.kind === 'feature' && selection.id === f.id ? ' sel' : '';
      html += `<div class="node${fsel}${f.suppressed ? ' supr' : ''}" data-kind="feature" data-part="${part.id}" data-id="${f.id}">
        <span class="ic">${f.suppressed ? '⏸' : (OP_ICON[f.op] || '')}</span><span class="nm">${esc(f.name)}</span>
        <span class="meta">${featureMeta(f)}</span>
        <button data-act="sup" title="Suprimir/reactivar la función">${f.suppressed ? '▶' : '⏸'}</button>
        <button data-act="up" title="Subir (regenera antes)" ${fi === 0 ? 'disabled' : ''}>↑</button>
        <button data-act="down" title="Bajar (regenera después)" ${fi === part.features.length - 1 ? 'disabled' : ''}>↓</button>
      </div>`;
    });
    html += '</div>';
  }
  html += '<h3>Restricciones</h3>';
  if (!doc.constraints.length) html += '<div class="node"><span class="meta">— ninguna —</span></div>';
  for (const c of doc.constraints) {
    const csel = selection?.kind === 'constraint' && selection.id === c.id ? ' sel' : '';
    const label = { mate: 'Coincidir caras', flush: 'Alinear caras', concentric: 'Concéntrico' }[c.type] || c.type;
    const pa = getPart(doc, c.a.part)?.name || '?', pb = getPart(doc, c.b.part)?.name || '?';
    html += `<div class="node${csel}" data-kind="constraint" data-id="${c.id}">
      <span class="ic">🔗</span><span class="nm">${label}</span>
      <span class="meta">${esc(pa)} ↔ ${esc(pb)}</span>
    </div>`;
  }
  tree.innerHTML = html;
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
function deletePart(p) {
  if (!p) return;
  const nc = doc.constraints.filter(c => c.a.part === p.id || c.b.part === p.id).length;
  if (!confirm(`¿Eliminar la pieza "${p.name}"${nc ? ` y sus ${nc} restricción(es)` : ''}?`)) return;
  pushUndo();
  doc.parts = doc.parts.filter(x => x.id !== p.id);
  doc.constraints = doc.constraints.filter(c => c.a.part !== p.id && c.b.part !== p.id);
  disposePartMesh(p.id);
  if (selection && (selection.id === p.id || selection.partId === p.id)) selection = null;
  refreshUI();
  commit(`${p.name} eliminada${nc ? ' (con sus restricciones)' : ''}. Ctrl+Z deshace.`);
}

// aislar: mostrar solo esta pieza; si ya está aislada, restaurar todas
function isolatePart(p) {
  if (!p) return false;
  const otras = doc.parts.filter(x => x.id !== p.id);
  const yaAislada = p.visible && otras.length > 0 && otras.every(x => !x.visible);
  for (const x of doc.parts) { x.visible = yaAislada ? true : x.id === p.id; syncTransform(x); }
  document.getElementById('btnIsolate').classList.toggle('on', !yaAislada);
  refreshUI();
  setStatus(yaAislada ? 'Aislamiento terminado: todas las piezas visibles.'
                      : `⛶ ${p.name} aislada. Toca Aislar de nuevo para mostrar todas.`);
  return !yaAislada;
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
    body.innerHTML = `
      ${frow('Nombre', `<input type="text" id="pp_name" value="${esc(p.name)}">`)}
      ${frow('Color', `<input type="color" id="pp_color" value="${p.color}">`)}
      ${frow('Fija (a tierra)', `<input type="checkbox" id="pp_fixed" ${p.fixed ? 'checked' : ''}>`)}
      ${frow('Posición X/Y/Z', num3('pp_pos', p.pos))}
      ${frow('Rotación °X/Y/Z', num3('pp_rot', [deg(e.x), deg(e.y), deg(e.z)]))}
      <div class="btnrow">
        <button id="pp_apply">Aplicar</button>
        <button id="pp_iso" title="Mostrar solo esta pieza (toca de nuevo para restaurar)">⛶ Aislar</button>
        <button id="pp_del" class="danger">Eliminar pieza</button>
      </div>
      ${esChapa(p) ? `<div class="btnrow">
        <button id="pp_flatdxf" title="Desarrollo real (BA con factor K) con líneas de plegado y desahogos">⭳ Desarrollo DXF</button>
        <button id="pp_flatpdf" title="Lámina del desarrollo lista para imprimir">⭳ Desarrollo PDF</button>
      </div>` : ''}`;
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
    if (f.shape === 'box') dims = frow('Ancho/Fondo/Alto', num3('fp_dims', [f.params.w, f.params.d, f.params.h]));
    if (f.shape === 'cylinder') dims = frow('Diámetro', `<input type="number" id="fp_dia" value="${f.params.dia}" step="0.5">`) + frow('Altura', `<input type="number" id="fp_h" value="${f.params.h}" step="0.5">`);
    if (f.shape === 'hole') dims = frow('Diámetro', `<input type="number" id="fp_dia" value="${f.params.dia}" step="0.5">`) + frow('Profundidad', `<input type="number" id="fp_depth" value="${f.params.depth}" step="0.5">`) + frow('Pasante', `<input type="checkbox" id="fp_through" ${f.params.through ? 'checked' : ''}>`);
    if (f.shape === 'sketch' || f.shape === 'revolve') {
      dims = f.shape === 'sketch' ? frow('Altura', `<input type="number" id="fp_h" value="${f.params.h}" step="0.5">`) : frow('Giro', '<b>360°</b>');
      if (f.params.entities) {
        dims += `<div class="btnrow"><button id="fp_editsk">✏ Editar boceto</button></div>`;
        dims += frow('Entidades', `<b>${f.params.entities.length}</b>`);
        dims += frow('Mostrar boceto', `<input type="checkbox" id="fp_showsk" ${f.showSketch ? 'checked' : ''}>`);
        (f.params.dims || []).forEach((d, i) => {
          const val = SK.measureDim(f.params.entities, d);
          dims += frow(`Cota ${d.locked ? '🔒' : ''}${DIM_PREFIX[d.kind]}`, `<input type="number" id="fp_dim${i}" value="${val === null ? '' : +val.toFixed(2)}" step="0.5">`);
        });
      } else {
        dims += frow('Puntos', `<b>${f.params.pts.length}</b>`);
      }
    }
    body.innerHTML = `
      ${frow('Nombre', `<input type="text" id="fp_name" value="${esc(f.name)}">`)}
      ${frow('Tipo', `${f.op === 'cut' ? 'corte' : 'unión'}${f.suppressed ? ' · ⏸ suprimida' : ''}`)}
      ${dims}
      ${f.shape === 'pestana' ? '' : frow('Posición X/Y/Z', num3('fp_at', f.at))}
      ${['box', 'chapaBase', 'pestana'].includes(f.shape) ? '' : frow('Eje X/Y/Z', num3('fp_dir', f.dir))}
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
      if (f.shape === 'box') { const [w, d, h] = readNum3('fp_dims'); Object.assign(f.params, { w, d, h }); }
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
      if (f.shape === 'cylinder') { f.params.dia = +$('fp_dia').value; f.params.h = +$('fp_h').value; }
      if (f.shape === 'hole') {
        f.params.dia = +$('fp_dia').value;
        f.params.depth = +$('fp_depth').value;
        f.params.through = $('fp_through').checked;
        f.name = `Agujero Ø${f.params.dia}`;
      }
      if (f.shape !== 'pestana') f.at = readNum3('fp_at');
      if (!['box', 'chapaBase', 'pestana'].includes(f.shape)) f.dir = readNum3('fp_dir');
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
const num3 = (id, v) => `<span style="display:flex;gap:4px;flex:1">
  <input type="number" id="${id}x" value="${+(+v[0]).toFixed(3)}" step="0.5" style="width:33%">
  <input type="number" id="${id}y" value="${+(+v[1]).toFixed(3)}" step="0.5" style="width:33%">
  <input type="number" id="${id}z" value="${+(+v[2]).toFixed(3)}" step="0.5" style="width:33%"></span>`;
const readNum3 = (id) => [+$(id + 'x').value, +$(id + 'y').value, +$(id + 'z').value];

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
function hideDialog() { dialog.style.display = 'none'; dialog.innerHTML = ''; }
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
  direct: 'Edición directa: toca una cara del sólido para cambiar su medida (diámetro, altura/profundidad o tamaño de caja).',
};

const modeButtons = { sketch: 'btnSketch', hole: 'btnHole', pestana: 'btnPestana', mate: 'btnMate', flush: 'btnFlush', concentric: 'btnConcentric', move: 'btnMove', direct: 'btnDirect', measure: 'btnMeasure' };

function setMode(m) {
  mode = mode === m ? 'select' : m;
  pickStage = null;
  if (mode !== 'sketch' && sketch) cancelSketch(false);
  clearHover();
  clearPickedHighlight();
  if (mode !== 'measure') clearMeasure();
  for (const [k, id] of Object.entries(modeButtons)) $(id).classList.toggle('on', mode === k);
  setHint(MODE_HINTS[mode]);
  setStatus(mode === 'select' ? 'Listo.' : 'Modo activo: ' + mode);
  if (mode !== 'select' && isNarrow()) setSidebar(false); // que el panel no tape el modelo
}
for (const [m, id] of Object.entries(modeButtons)) $(id).onclick = () => setMode(m);

// ---------- Entornos Pieza / Ensamble ----------
// Conmutador tipo Inventor: la barra muestra solo las herramientas del
// entorno activo (Sección/Vista/Medir son comunes a ambos).

const ENV_OF_MODE = { sketch: 'pieza', hole: 'pieza', pestana: 'pieza', direct: 'pieza',
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

$('btnIsolate').onclick = () => {
  const p = selection?.kind === 'part' ? getPart(doc, selection.id)
          : selection?.partId ? getPart(doc, selection.partId) : null;
  if (!p) { setStatus('Toca primero una pieza para aislarla.'); return; }
  isolatePart(p);
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
  if (ev.pointerType === 'mouse' && (['hole', 'mate', 'flush', 'direct'].includes(mode) || (mode === 'sketch' && !sketch))) {
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
  if (ev.key === 'Escape') { hideDialog(); setModeSelect(); }
  if (ev.key === 'z' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); undo(); }
  if (ev.key === 'Delete' && selection && !dialogOpen()) {
    const btn = $('pp_del') || $('fp_del') || $('cp_del');
    if (btn) btn.click();
  }
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
  if (mode === 'direct') return clickDirect(hit);
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
const projMat = new THREE.LineBasicMaterial({ color: 0x8bd0a0 });          // entidades proyectadas del modelo
const previewMat = new THREE.LineBasicMaterial({ color: 0xf0a437, transparent: true, opacity: 0.5 });
const ptMat = new THREE.MeshBasicMaterial({ color: 0xf0a437 });
const snapMat = new THREE.MeshBasicMaterial({ color: 0x34a853 });

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
  const pick = pickEntityAt(raw, false);
  if (!pick) { setStatus('Borrar: toca una entidad del boceto.'); return; }
  sketch.entities = sketch.entities.filter(e => e.id !== pick.ent.id);
  pruneDims();
  redrawSketch();
  setStatus('Entidad eliminada.');
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
    entities: [], dims: [], dimEls: new Map(),
    chainStart: null, chainLast: null, temp: null, dimPick: null, stroke: null,
    entDrag: null, profileMode: false, excluded: new Set(),
    selIds: new Set(), marquee: null, copyOp: null,
    faceSegs: [], refPrims: [], orbit: false,
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
  document.getElementById('skOrbit')?.classList.remove('on');
  activeCamera = orthoCam;
  controls.enabled = false;
  sketchControls.enabled = true;
  resize();

  for (const b of sketchbar.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === 'line');
  sketchbar.classList.add('open');
  setHint('Dibuja con snap a la geometría proyectada (verde) o grilla de 1 mm. Cota: toca 1 o 2 entidades (también referencias). ✔ extruye.');
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

function clickLine(raw) {
  const { uv } = snap2D(raw);
  if (!sketch.chainLast) {
    sketch.chainStart = uv;
    sketch.chainLast = uv;
    setStatus(`Inicio en (${uv[0].toFixed(1)}, ${uv[1].toFixed(1)}). Toca el siguiente punto; el 1.º cierra.`);
    redrawSketch();
    return;
  }
  const closing = sketch.entities.length && Math.hypot(uv[0] - sketch.chainStart[0], uv[1] - sketch.chainStart[1]) < 16 * worldPerPixel();
  const end = closing ? sketch.chainStart : uv;
  if (Math.hypot(end[0] - sketch.chainLast[0], end[1] - sketch.chainLast[1]) > 1e-3) {
    sketch.entities.push(SK.makeLine(sketch.chainLast, end));
  }
  if (closing) {
    sketch.chainStart = sketch.chainLast = null;
    setStatus('Contorno cerrado. ✔ para extruir o sigue dibujando.');
  } else {
    sketch.chainLast = end;
    setStatus(`Punto (${end[0].toFixed(1)}, ${end[1].toFixed(1)}) mm`);
  }
  redrawSketch();
}

function clickRect(raw) {
  const { uv } = snap2D(raw);
  if (!sketch.temp) { sketch.temp = uv; setStatus('Toca la esquina opuesta.'); redrawSketch(); return; }
  const [x1, y1] = sketch.temp, [x2, y2] = uv;
  sketch.temp = null;
  if (Math.abs(x2 - x1) < 0.5 || Math.abs(y2 - y1) < 0.5) { setStatus('Rectángulo demasiado angosto.'); return; }
  sketch.entities.push(
    SK.makeLine([x1, y1], [x2, y1]), SK.makeLine([x2, y1], [x2, y2]),
    SK.makeLine([x2, y2], [x1, y2]), SK.makeLine([x1, y2], [x1, y1])
  );
  setStatus(`Rectángulo ${Math.abs(x2 - x1).toFixed(1)}×${Math.abs(y2 - y1).toFixed(1)} mm.`);
  redrawSketch();
}

function clickCircle(raw) {
  const { uv } = snap2D(raw);
  if (!sketch.temp) { sketch.temp = uv; setStatus('Toca un punto del radio.'); redrawSketch(); return; }
  const [cx, cy] = sketch.temp;
  sketch.temp = null;
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
    { key: 'locked', label: '🔒 Fija (restringe al mover)', type: 'checkbox', value: !!dim.locked },
  ], (v) => {
    dim.locked = v.locked;
    if (!(v.v > 0)) { setStatus('Valor inválido.'); return; }
    if (SK.applyDim(sketch.entities, dim, v.v)) {
      SK.applyLockedDims(sketch.entities, sketch.dims, dim.id); // las 🔒 se mantienen
      redrawSketch();
      setStatus(`Cota aplicada: ${DIM_PREFIX[dim.kind]}${v.v}${dim.locked ? ' 🔒' : ''}.`);
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
    el.textContent = val === null ? '—' : `${dim.locked ? '🔒' : ''}${DIM_PREFIX[dim.kind]}${val.toFixed(1)}${dim.kind === 'ang' ? '°' : ''}`;
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
  sketch.entDrag = { ent: pick.ent, pointerId: ev.pointerId, lastUV: raw };
  sketchControls.enabled = false;
  try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* ya liberado */ }
}

function moveEntDrag(ev) {
  const d = sketch?.entDrag;
  if (!d || ev.pointerId !== d.pointerId) return;
  const raw = eventTo2D(ev);
  if (!raw) return;
  SK.moveEntity(sketch.entities, d.ent, [raw[0] - d.lastUV[0], raw[1] - d.lastUV[1]]);
  d.lastUV = raw;
  redrawSketch();
}

function endEntDrag() {
  if (!sketch?.entDrag) return;
  sketch.entDrag = null;
  sketchControls.enabled = true;
  // las cotas con candado restringen: se re-aplican tras el movimiento
  SK.applyLockedDims(sketch.entities, sketch.dims);
  redrawSketch();
  setStatus('Entidad movida (las cotas 🔒 se re-aplicaron; las libres se actualizan solas).');
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
  redrawSketch();
  setStatus(added
    ? `Contorno de la cara proyectado: ${added} entidad(es). Tócalas con ⤓ para quitarlas.`
    : 'Esa cara no aportó geometría nueva (quizá ya estaba proyectada).');
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
  // 2) ¿tocó una arista o círculo de referencia? → proyectar solo esa
  let bestP = null;
  for (const p of sketch.refPrims) {
    const n = SK.nearestOnEntity(p, raw);
    if (n.d < tol && (!bestP || n.d < bestP.d)) bestP = { p, d: n.d };
  }
  if (bestP) {
    const n = addProjEntity(bestP.p);
    redrawSketch();
    setStatus(n
      ? (bestP.p.type === 'circle' ? `Círculo Ø${(bestP.p.r * 2).toFixed(1)} proyectado como entidad.` : 'Arista proyectada como entidad.')
      : 'Esa referencia ya estaba proyectada.');
    return;
  }
  // 3) ¿tocó una cara del modelo? → proyectar todo su contorno
  if (hit) { projectFaceContour(hit); return; }
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

function redrawSketch() {
  clearGroup(sketch.draw);
  for (const e of sketch.entities) {
    const mat = (sketch.dimPick && sketch.dimPick.ent.id === e.id) || sketch.selIds.has(e.id) ? selEntMat : (e.proj ? projMat : drawMat);
    const pts = SK.entityPoints(e, 64).map(p => to3D(p[0], p[1]));
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
    const m = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.8, 3.5 * worldPerPixel()), 10, 8), ptMat);
    m.position.copy(to3D(p[0], p[1]));
    sketch.draw.add(m);
  }
}

function updateSketchPreview(ev) {
  if (ev.pointerType !== 'mouse' || sketch.stroke) return;
  const raw = eventTo2D(ev);
  if (!raw) return;
  const { uv, snapped, kind } = snap2D(raw);
  clearGroup(sketch.preview);
  const cursor = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.9, 4 * worldPerPixel()), 10, 8),
    snapped ? snapMat : ptMat
  );
  cursor.position.copy(to3D(uv[0], uv[1]));
  sketch.preview.add(cursor);
  const t = sketch.tool;
  if (t === 'line' && sketch.chainLast) {
    sketch.preview.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [to3D(sketch.chainLast[0], sketch.chainLast[1]), to3D(uv[0], uv[1])]), previewMat));
  } else if (t === 'rect' && sketch.temp) {
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
    part.features.push(f);
    cancelSketch(true);
    faceCache.clear();
    rebuildPart(part);
    commit(`Boceto extruido en ${part.name}.`);
  });
}

function clickRevolveAxis(raw) {
  const pick = pickEntityAt(raw, false);
  if (!pick || pick.ent.type !== 'line') { setStatus('Toca una LÍNEA del boceto para usarla como eje.'); return; }
  const op = sketch.revolveWait.op;
  sketch.revolveWait = null;
  pushUndo();
  const f = makeRevolveFeature(sketch.entities, sketch.dims, { a: [...pick.ent.a], b: [...pick.ent.b] }, op, sketch.originL, sketch.nL, sketch.uL);
  f.params.excluded = [...sketch.excluded];
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
  if (!silent) setStatus('Boceto cancelado.');
  if (mode === 'sketch') { mode = 'select'; $('btnSketch').classList.remove('on'); setHint(''); }
}

// barra de herramientas del boceto
sketchbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !sketch) return;
  if (btn.id === 'skCopy') { startCopyOp(); return; }
  if (btn.id === 'skMirror') { startMirrorOp(); return; }
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
    if (!sketch.orbit) {
      // volver a la vista normal a la cara
      orthoCam.up.copy(sketch.vW);
      orthoCam.position.copy(sketchControls.target).addScaledVector(sketch.nW, 500);
      orthoCam.lookAt(sketchControls.target);
    }
    setStatus(sketch.orbit
      ? '🔄 Giro activo: rota para ver referencias ocultas; los toques siguen dibujando sobre el plano.'
      : 'Giro desactivado: vista normal a la cara restaurada.');
    return;
  }
  if (btn.dataset.tool) {
    const keepSel = btn.dataset.tool === 'select';
    sketch.tool = btn.dataset.tool;
    sketch.temp = null;
    sketch.chainStart = sketch.chainLast = null;
    sketch.dimPick = null;
    sketch.copyOp = null;
    sketch.mirrorOp = null;
    sketch.revolveWait = null;
    if (!keepSel) { sketch.selIds.clear(); }
    sketch.profileMode = false;
    clearGroup(sketch.fills);
    clearGroup(sketch.preview);
    redrawSketch();
    for (const b of sketchbar.querySelectorAll('[data-tool]')) b.classList.toggle('on', b === btn);
    setStatus({
      line: 'Línea: toca los puntos (snap a extremos, medios, centros, cuadrantes y tangentes); el 1.º cierra.',
      rect: 'Rectángulo: toca dos esquinas.',
      circle: 'Círculo: toca el centro y luego el radio.',
      pen: 'Lápiz: dibuja a mano alzada — interpreto círculos, líneas y polilíneas.',
      dim: 'Cota: toca 1 entidad (largo/Ø) o 2 (distancia/ángulo), incluidas referencias. 🔒 la fija.',
      trim: 'Recortar: toca el tramo excedente a eliminar (corta contra todo, incluidas referencias).',
      extend: 'Alargar: toca una línea cerca del extremo; se alarga hasta la siguiente entidad o referencia.',
      moveEnt: 'Mover: arrastra una entidad; las cotas 🔒 restringen, las libres se actualizan.',
      erase: 'Borrar: toca la entidad a eliminar.',
      select: 'Selección: arrastra →derecha = ventana (solo lo contenido); ←izquierda = captura (lo tocado). Tap = alternar una.',
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
    { key: 'center', label: 'Centrar en la cara', type: 'checkbox', value: false },
  ], (v) => {
    pushUndo();
    const at = (v.center ? localCentroid : localPoint).toArray();
    const dir = localNormal.clone().negate().toArray(); // hacia adentro del material
    part.features.push(makeHoleFeature(v.dia, v.depth, v.through, at, dir));
    faceCache.clear();
    rebuildPart(part);
    commit(`Agujero Ø${v.dia} agregado a ${part.name}.`);
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

// ---------- Edición directa de sólidos ----------
// Toca una cara y edita el parámetro de la función que la genera,
// sin pasar por el árbol (símil "Edit face" de Inventor).

function clickDirect(hit) {
  const part = getPart(doc, hit.object.userData.partId);
  const face = faceAtHit(hit);
  const lp = hit.object.worldToLocal(hit.point.clone());
  const info = identifyFace(part, lp, face.normal);
  if (!info) {
    setStatus('No se reconoce esa cara para edición directa. Edita la función en el navegador de modelo.');
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
    showForm(`${f.name} · pared cilíndrica`, [
      { key: 'dia', label: 'Nuevo diámetro (mm)', value: f.params.dia, step: 0.5 },
    ], (v) => {
      if (!(v.dia > 0)) return;
      pushUndo();
      f.params.dia = v.dia;
      if (f.shape === 'hole') f.name = f.name.replace(/Ø[\d.]+/, `Ø${v.dia}`);
      done(`${f.name}: Ø${v.dia} mm.`);
    });
  } else if (info.kind === 'cyl-cap' || info.kind === 'sketch-cap') {
    const lbl = f.op === 'cut' ? 'Nueva profundidad (mm)' : 'Nueva altura (mm)';
    showForm(`${f.name} · cara superior`, [
      { key: 'h', label: lbl, value: f.params.h, step: 0.5 },
    ], (v) => {
      if (!(v.h > 0)) return;
      pushUndo();
      f.params.h = v.h;
      done(`${f.name}: ${f.op === 'cut' ? 'profundidad' : 'altura'} ${v.h} mm.`);
    });
  } else if (info.kind === 'box-face') {
    const dim = ['w', 'd', 'h'][info.axis];
    const labels = { w: 'Ancho X', d: 'Fondo Y', h: 'Alto Z' };
    showForm(`${f.name} · cara ${labels[dim].split(' ')[1]}${info.sign > 0 ? '+' : '−'}`, [
      { key: 'v', label: `${labels[dim]} (mm) — la cara opuesta queda fija`, value: f.params[dim], step: 0.5 },
    ], (vals) => {
      if (!(vals.v > 0)) return;
      pushUndo();
      const old = f.params[dim];
      if (info.axis === 2) {
        if (info.sign < 0) f.at[2] += old - vals.v; // se movió la base: la tapa queda fija
        f.params.h = vals.v;
      } else {
        f.at[info.axis] += info.sign * (vals.v - old) / 2; // crece hacia la cara tocada
        f.params[dim] = vals.v;
      }
      done(`${f.name}: ${labels[dim]} ${vals.v} mm.`);
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

$('btnComp').onclick = async () => {
  let cat;
  try {
    cat = await loadCatalogo();
  } catch (err) {
    setStatus(`Catálogo de componentes no disponible: ${err.message}`);
    return;
  }
  let html = '<h3>Insertar componente</h3>' +
    '<div style="max-height:50vh;overflow-y:auto;display:flex;flex-direction:column;gap:4px">';
  cat.componentes.forEach((c, i) => {
    const [lo, hi] = envolvente(c);
    const dims = [0, 1, 2].map(k => (hi[k] - lo[k]).toFixed(1)).join(' × ');
    html += `<button id="dlg_comp${i}" title="${c.descripcion}" style="text-align:left;padding:6px 8px">` +
      `${c.nombre}<br><small style="opacity:.7">${c.categoria} · ${dims} mm</small></button>`;
  });
  html += '</div><p style="font-size:11px;opacity:.7;margin:8px 0 0">Dimensiones nominales ' +
    '(capa user): verificar con calibre antes de cortar. docs/COMPONENTES.md</p>' +
    '<div class="btnrow"><button id="dlg_cancel">Cancelar</button></div>';
  dialog.innerHTML = html;
  dialog.style.display = 'block';
  $('dlg_cancel').onclick = hideDialog;
  cat.componentes.forEach((c, i) => {
    $(`dlg_comp${i}`).onclick = () => {
      hideDialog();
      pushUndo();
      const part = componentToPart(c);
      const [lo] = envolvente(c);
      part.pos = [nextSpawnX() - lo[0], 0, lo[2] < 0 ? -lo[2] : 0]; // apoyado en Z=0
      part.fixed = doc.parts.length === 0; // como newPart: la primera queda a tierra
      doc.parts.push(part);
      selection = { kind: 'part', id: part.id };
      rebuildPart(part);
      commit(`${c.nombre} insertado.${c.notas ? ' ' + c.notas : ''}`);
    };
  });
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

// ---------- Exportar STL ----------

$('btnSTL').onclick = () => {
  const geoms = [];
  for (const part of doc.parts) {
    const rec = meshes.get(part.id);
    if (!rec || !part.visible) continue;
    const g = rec.mesh.geometry.clone().applyMatrix4(rec.mesh.matrixWorld);
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
      a.fromBufferAttribute(pos, t);
      b.fromBufferAttribute(pos, t + 1);
      c.fromBufferAttribute(pos, t + 2);
      n.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
      for (const v of [n, a, b, c]) {
        dv.setFloat32(off, v.x, true); dv.setFloat32(off + 4, v.y, true); dv.setFloat32(off + 8, v.z, true);
        off += 12;
      }
      off += 2; // attribute byte count
    }
    g.dispose();
  }
  download(new Blob([buffer], { type: 'model/stl' }), 'ensamble.stl');
  setStatus(`STL exportado (${triCount} triángulos).`);
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
    if (data.format !== 'foto3d-cad') throw new Error('formato desconocido');
    pushUndo();
    doc = data;
    selection = null;
    rebuildAll();
    solveAndSync();
    commit(`Proyecto "${file.name}" abierto.`);
  } catch (err) {
    setStatus(`No se pudo abrir: ${err.message}`);
  }
});

$('btnClear').onclick = () => {
  pushUndo();
  doc = newDoc();
  selection = null;
  clearMeasure();
  rebuildAll();
  commit('Proyecto nuevo.');
};

$('btnDemo').onclick = () => { pushUndo(); loadDemo(); commit('Ejemplo cargado.'); };

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
  refreshUI();
})();

// API expuesta para pruebas automatizadas
window.__cad = {
  get doc() { return doc; },
  set doc(d) { doc = d; },
  get sketch() { return sketch; },
  get activeCamera() { return activeCamera; },
  rebuildAll, solveAndSync, loadDemo, setMode,
  meshes, scene, camera,
  THREE,
};
