// app.js — foto3d CAD: mini diseño paramétrico símil Inventor.
// Unidades: milímetros. Eje Z hacia arriba.

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { loadCatalogo, componentToPart, envolvente } from './componentes.js';
import {
  newDoc, newPart, getPart, getFeature, partMatrix, uid,
  makeBoxFeature, makeCylFeature, makeHoleFeature, makeSketchFeature,
  makeSketchEntitiesFeature, planeBasis, referenceEdges, referencePoints,
  buildPartGeometry, planarFaceFromHit, faceHighlightGeometry, findAxialFeature,
  makeMate, makeConcentric, solveConstraints,
} from './model.js';
import * as SK from './sketch2d.js';

// ---------- Escena ----------

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

const viewport = document.getElementById('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
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

scene.add(new THREE.HemisphereLight(0xe8eaf2, 0x2a2d33, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(180, -120, 300);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8899bb, 0.5);
fill.position.set(-150, 180, 80);
scene.add(fill);

const grid = new THREE.GridHelper(500, 50, 0x3a4250, 0x232833);
grid.rotation.x = Math.PI / 2;
scene.add(grid);
const axes = new THREE.AxesHelper(60);
scene.add(axes);

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
});
const edgeMat = new THREE.LineBasicMaterial({ color: 0x11141a });
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
        <button id="pp_del" class="danger">Eliminar pieza</button>
      </div>`;
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
    $('pp_del').onclick = () => {
      pushUndo();
      doc.parts = doc.parts.filter(x => x.id !== p.id);
      doc.constraints = doc.constraints.filter(c => c.a.part !== p.id && c.b.part !== p.id);
      disposePartMesh(p.id);
      selection = null;
      refreshUI();
      commit('Pieza eliminada.');
    };
    return;
  }

  if (selection.kind === 'feature') {
    const p = getPart(doc, selection.partId);
    const f = p && getFeature(p, selection.id);
    if (!f) { selection = null; return refreshProps(); }
    let dims = '';
    if (f.shape === 'box') dims = frow('Ancho/Fondo/Alto', num3('fp_dims', [f.params.w, f.params.d, f.params.h]));
    if (f.shape === 'cylinder') dims = frow('Diámetro', `<input type="number" id="fp_dia" value="${f.params.dia}" step="0.5">`) + frow('Altura', `<input type="number" id="fp_h" value="${f.params.h}" step="0.5">`);
    if (f.shape === 'hole') dims = frow('Diámetro', `<input type="number" id="fp_dia" value="${f.params.dia}" step="0.5">`) + frow('Profundidad', `<input type="number" id="fp_depth" value="${f.params.depth}" step="0.5">`) + frow('Pasante', `<input type="checkbox" id="fp_through" ${f.params.through ? 'checked' : ''}>`);
    if (f.shape === 'sketch') {
      dims = frow('Altura', `<input type="number" id="fp_h" value="${f.params.h}" step="0.5">`);
      if (f.params.entities) {
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
      ${frow('Posición X/Y/Z', num3('fp_at', f.at))}
      ${f.shape !== 'box' ? frow('Eje X/Y/Z', num3('fp_dir', f.dir)) : ''}
      <div class="btnrow">
        <button id="fp_apply">Regenerar</button>
        <button id="fp_del" class="danger">Eliminar</button>
      </div>`;
    $('fp_apply').onclick = () => {
      pushUndo();
      f.name = $('fp_name').value || f.name;
      if (f.shape === 'box') { const [w, d, h] = readNum3('fp_dims'); Object.assign(f.params, { w, d, h }); }
      if (f.shape === 'sketch') {
        f.params.h = +$('fp_h').value;
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
      f.at = readNum3('fp_at');
      if (f.shape !== 'box') f.dir = readNum3('fp_dir');
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
  mate: 'Coincidir: clic en la cara de la 1.ª pieza, luego en la cara de la 2.ª (la 2.ª se mueve).',
  flush: 'Alinear: clic en la cara de la 1.ª pieza, luego en la cara de la 2.ª (la 2.ª se mueve).',
  concentric: 'Concéntrico: clic cerca de un orificio/cilindro de la 1.ª pieza, luego de la 2.ª.',
  move: 'Mover: arrastra una pieza (Shift o un 2.º dedo = mover en Z). Al soltar se re-aplican las restricciones.',
  measure: 'Medir: clic en dos puntos (se ajusta al vértice más cercano). Esc para salir.',
};

const modeButtons = { sketch: 'btnSketch', hole: 'btnHole', mate: 'btnMate', flush: 'btnFlush', concentric: 'btnConcentric', move: 'btnMove', measure: 'btnMeasure' };

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
  }
  if (dragging) { switchDragVertical(); return; } // 2.º dedo durante el arrastre → mover en Z
  downPos = { x: ev.clientX, y: ev.clientY };
  if (mode === 'move' && ev.button === 0) startMoveDrag(ev);
});

renderer.domElement.addEventListener('pointermove', (ev) => {
  if (dialogOpen()) return;
  if (sketch?.stroke) { moveStroke(ev); return; }
  if (sketch?.entDrag) { moveEntDrag(ev); return; }
  if (dragging) { if (ev.pointerId === dragging.pointerId) updateMoveDrag(ev); return; }
  if (mode === 'sketch' && sketch) { updateSketchPreview(ev); return; }
  if (ev.pointerType === 'mouse' && (['hole', 'mate', 'flush'].includes(mode) || (mode === 'sketch' && !sketch))) {
    const hit = castAtEvent(ev);
    if (hit) showHover(hit, hoverMat);
    else clearHover();
  }
});

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (dialogOpen()) return;
  if (sketch?.stroke) { if (ev.pointerId === sketch.stroke.pointerId) endStroke(); return; }
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
  if (mode === 'mate' || mode === 'flush') return clickMate(hit, mode);
  if (mode === 'concentric') return clickConcentric(hit);
  if (mode === 'measure') return clickMeasure(hit);
}

// ---------- Boceto 2D sobre cara: entidades, cotas, lápiz, recorte ----------

let sketch = null; // estado del boceto activo

const sketchbar = $('sketchbar');
const refMat = new THREE.LineBasicMaterial({ color: 0x5f7fa8 });          // aristas proyectadas
const gridMat = new THREE.LineBasicMaterial({ color: 0x2a3040 });          // grilla del plano
const drawMat = new THREE.LineBasicMaterial({ color: 0xf0a437 });          // entidades del boceto
const selEntMat = new THREE.LineBasicMaterial({ color: 0x4d90fe });        // entidad elegida para cota
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
      if (n.d < tol * 0.8 && (!best || n.d < best.d)) best = { ent: e, d: n.d, isRef: true };
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
  const t = sketch.tool;
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
  const mesh = hit.object;
  const q = mesh.quaternion.clone();
  const basisL = planeBasis(face.normal.toArray());
  const originW = face.centroid.clone().applyMatrix4(mesh.matrixWorld);
  const nW = face.normal.clone().applyQuaternion(q).normalize();
  const uW = basisL.u.clone().applyQuaternion(q).normalize();
  const vW = basisL.v.clone().applyQuaternion(q).normalize();

  sketch = {
    part,
    originL: face.centroid.toArray(), nL: face.normal.toArray(), uL: basisL.u.toArray(),
    originW, nW, uW, vW,
    plane: new THREE.Plane().setFromNormalAndCoplanarPoint(nW, originW),
    entities: [], dims: [], dimEls: new Map(),
    chainStart: null, chainLast: null, temp: null, dimPick: null, stroke: null,
    entDrag: null, profileMode: false, excluded: new Set(),
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

  orthoViewSize = Math.max(80, sketch.extent * 2.6);
  orthoCam.zoom = 1;
  orthoCam.up.copy(vW);
  orthoCam.position.copy(originW).addScaledVector(nW, 500);
  orthoCam.lookAt(originW);
  sketchControls.target.copy(originW);
  activeCamera = orthoCam;
  controls.enabled = false;
  sketchControls.enabled = true;
  resize();

  for (const b of sketchbar.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === 'line');
  sketchbar.classList.add('open');
  setHint('Dibuja con snap a la geometría proyectada (verde) o grilla de 1 mm. Cota: toca 1 o 2 entidades (también referencias). ✔ extruye.');
  setStatus(`Boceto en cara de ${part.name}.`);
}

// proyecta las aristas analíticas de TODAS las piezas visibles al plano
// (vista ortogonal completa del modelo, sin ruido de triangulación CSG)
function buildSketchReferences() {
  const segs = [];
  let maxR = 20;
  for (const part of doc.parts) {
    if (!part.visible) continue;
    const m = partMatrix(part);
    for (const [pa, pb] of referenceEdges(part)) {
      const a = pa.clone().applyMatrix4(m);
      const b = pb.clone().applyMatrix4(m);
      const da = a.sub(sketch.originW), db = b.sub(sketch.originW);
      const s = [da.dot(sketch.uW), da.dot(sketch.vW)];
      const e = [db.dot(sketch.uW), db.dot(sketch.vW)];
      const len = Math.hypot(s[0] - e[0], s[1] - e[1]);
      if (len < 1e-4) continue; // arista normal al plano
      segs.push([s, e]);
      sketch.snapPts.push({ p: s, kind: 'extremo' }, { p: e, kind: 'extremo' });
      if (len > 4) sketch.snapPts.push({ p: [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2], kind: 'medio' });
      maxR = Math.max(maxR, Math.hypot(...s), Math.hypot(...e));
    }
    // centros de círculos (agujeros, cilindros, bocetos) como imanes de snap
    for (const cp of referencePoints(part)) {
      const w = cp.clone().applyMatrix4(m).sub(sketch.originW);
      sketch.snapPts.push({ p: [w.dot(sketch.uW), w.dot(sketch.vW)], kind: 'centro' });
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
  const rpts = [];
  for (const [s, e] of segs) rpts.push(to3D(s[0], s[1], 0.06), to3D(e[0], e[1], 0.06));
  sketch.group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rpts), refMat));
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
    const mat = sketch.dimPick && sketch.dimPick.ent.id === e.id ? selEntMat : drawMat;
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
  const loops = { outer: true }; // hay regiones válidas
  const part = sketch.part;
  const originL = sketch.originL, nL = sketch.nL, uL = sketch.uL;
  const entities = sketch.entities, dims = sketch.dims;
  const excluded = [...sketch.excluded];
  const nReg = info.regions.length;
  const nHoles = info.regions.reduce((s, r) => s + r.holes.length, 0);
  showForm(`Extruir boceto (${nReg} región(es)${nHoles ? `, ${nHoles} agujero(s)` : ''})`, [
    { key: 'h', label: 'Altura (mm)', value: 10, step: 0.5 },
    { key: 'op', label: 'Operación', type: 'select', value: 'union', options: [['union', 'Unión (agrega hacia afuera)'], ['cut', 'Corte (quita hacia adentro)']] },
  ], (v) => {
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
  controls.enabled = true;
  if (!silent) setStatus('Boceto cancelado.');
  if (mode === 'sketch') { mode = 'select'; $('btnSketch').classList.remove('on'); setHint(''); }
}

// barra de herramientas del boceto
sketchbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !sketch) return;
  if (btn.dataset.tool) {
    sketch.tool = btn.dataset.tool;
    sketch.temp = null;
    sketch.chainStart = sketch.chainLast = null;
    sketch.dimPick = null;
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
      arc: 'Arco: toca CENTRO, luego INICIO y FINAL (antihorario).',
      polyg: 'Polígono regular: toca el centro y un vértice; luego eliges los lados.',
      offset: 'Equidistancia: toca una entidad o referencia del lado hacia donde quieres la copia.',
      fillet: 'Empalme: toca dos líneas que se cruzan y define el radio.',
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

// ---------- Mover (arrastre) ----------

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
  const planeNormal = ev.shiftKey ? verticalPlaneNormal() : new THREE.Vector3(0, 0, 1);
  dragging = {
    part,
    pointerId: ev.pointerId,
    vertical: ev.shiftKey,
    plane: new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, hit.point),
    start: hit.point.clone(),
    lastPoint: hit.point.clone(),
    origPos: [...part.pos],
  };
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
  raycaster.setFromCamera(pointer, camera);
  const p = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragging.plane, p)) return;
  dragging.lastPoint.copy(p);
  const delta = p.sub(dragging.start);
  if (dragging.vertical) { delta.x = 0; delta.y = 0; } else { delta.z = 0; }
  dragging.part.pos = [
    dragging.origPos[0] + delta.x,
    dragging.origPos[1] + delta.y,
    dragging.origPos[2] + delta.z,
  ];
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

// ---------- Medición ----------

let measurePts = [];
let measureObjs = [];
const measureLabel = $('measureLabel');
let measureAnchor = null;

function clickMeasure(hit) {
  if (!hit) return;
  // ajustar al vértice más cercano del triángulo tocado
  const g = hit.object.geometry;
  const pos = g.attributes.position;
  let best = null;
  for (let k = 0; k < 3; k++) {
    const i = hit.faceIndex * 3 + k;
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(hit.object.matrixWorld);
    const d = v.distanceTo(hit.point);
    if (!best || d < best.d) best = { v, d };
  }
  const pt = best.d < 4 ? best.v : hit.point.clone();

  measurePts.push(pt);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0x34a853 }));
  marker.position.copy(pt);
  overlay.add(marker);
  measureObjs.push(marker);

  if (measurePts.length === 2) {
    const [a, b] = measurePts;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a, b]),
      new THREE.LineBasicMaterial({ color: 0x34a853 })
    );
    overlay.add(line);
    measureObjs.push(line);
    const d = a.distanceTo(b);
    measureAnchor = a.clone().add(b).multiplyScalar(0.5);
    measureLabel.textContent =
      `${d.toFixed(2)} mm\nΔX ${(b.x - a.x).toFixed(2)}  ΔY ${(b.y - a.y).toFixed(2)}  ΔZ ${(b.z - a.z).toFixed(2)}`;
    measureLabel.style.display = 'block';
    setStatus(`Distancia: ${d.toFixed(2)} mm`);
    measurePts = [];
  } else {
    setStatus('Primer punto fijado. Clic en el segundo punto.');
  }
}

function clearMeasure() {
  for (const o of measureObjs) { overlay.remove(o); o.geometry?.dispose(); }
  measureObjs = [];
  measurePts = [];
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
