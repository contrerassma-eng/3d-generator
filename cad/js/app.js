// app.js — foto3d CAD: mini diseño paramétrico símil Inventor.
// Unidades: milímetros. Eje Z hacia arriba.

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import {
  newDoc, newPart, getPart, getFeature, partMatrix, uid,
  makeBoxFeature, makeCylFeature, makeHoleFeature,
  buildPartGeometry, planarFaceFromHit, faceHighlightGeometry, findAxialFeature,
  makeMate, makeConcentric, solveConstraints,
} from './model.js';

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
}
new ResizeObserver(resize).observe(viewport);
resize();

renderer.setAnimationLoop(() => {
  controls.update();
  updateMeasureLabel();
  renderer.render(scene, camera);
});

// ---------- Estado ----------

let doc = newDoc();
const meshes = new Map();       // partId -> { mesh, edges }
let selection = null;           // { kind:'part'|'feature'|'constraint', partId?, id }
let mode = 'select';            // select | hole | mate | flush | concentric | move | measure
let pickStage = null;           // datos temporales de operaciones de 2 pasos
const undoStack = [];

const $ = (id) => document.getElementById(id);
const statusEl = $('status'), hintEl = $('hint'), statsEl = $('stats');

function setStatus(msg) { statusEl.textContent = msg; }
function setHint(msg) { hintEl.textContent = msg || ''; }

// ---------- Materiales ----------

const matFor = (part) => new THREE.MeshPhongMaterial({
  color: new THREE.Color(part.color), shininess: 28, specular: 0x333333,
  polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
});
const edgeMat = new THREE.LineBasicMaterial({ color: 0x11141a });
const hoverMat = new THREE.MeshBasicMaterial({ color: 0xf0a437, transparent: true, opacity: 0.45, depthTest: true, polygonOffset: true, polygonOffsetFactor: -2 });
const pickedMat = new THREE.MeshBasicMaterial({ color: 0x4d90fe, transparent: true, opacity: 0.55, depthTest: true, polygonOffset: true, polygonOffsetFactor: -2 });

// ---------- Reconstrucción ----------

function rebuildPart(part) {
  disposePartMesh(part.id);
  if (!part.features.length) { refreshUI(); return; }
  const geom = buildPartGeometry(part);
  const mesh = new THREE.Mesh(geom, matFor(part));
  mesh.userData.partId = part.id;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 20), edgeMat);
  mesh.add(edges);
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
    for (const f of part.features) {
      const fsel = selection?.kind === 'feature' && selection.id === f.id ? ' sel' : '';
      html += `<div class="node${fsel}" data-kind="feature" data-part="${part.id}" data-id="${f.id}">
        <span class="ic">${OP_ICON[f.op] || ''}</span><span class="nm">${esc(f.name)}</span>
        <span class="meta">${featureMeta(f)}</span>
      </div>`;
    }
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
  if (!kind || !id) return;
  selection = { kind, id, partId: part || (kind === 'part' ? id : undefined) };
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
    body.innerHTML = `
      ${frow('Función', `<b>${esc(f.name)}</b> &nbsp;(${f.op === 'cut' ? 'corte' : 'unión'})`)}
      ${dims}
      ${frow('Posición X/Y/Z', num3('fp_at', f.at))}
      ${f.shape !== 'box' ? frow('Eje X/Y/Z', num3('fp_dir', f.dir)) : ''}
      <div class="btnrow">
        <button id="fp_apply">Regenerar</button>
        <button id="fp_del" class="danger">Eliminar</button>
      </div>`;
    $('fp_apply').onclick = () => {
      pushUndo();
      if (f.shape === 'box') { const [w, d, h] = readNum3('fp_dims'); Object.assign(f.params, { w, d, h }); }
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

function showForm(title, fields, onSubmit) {
  let html = `<h3>${title}</h3>`;
  for (const f of fields) {
    if (f.type === 'checkbox') html += frow(f.label, `<input type="checkbox" id="dlg_${f.key}" ${f.value ? 'checked' : ''}>`);
    else if (f.type === 'select') html += frow(f.label, `<select id="dlg_${f.key}">${f.options.map(o => `<option value="${o[0]}" ${o[0] === f.value ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`);
    else html += frow(f.label, `<input type="number" id="dlg_${f.key}" value="${f.value}" step="${f.step || 1}">`);
  }
  html += `<div class="btnrow"><button id="dlg_ok" class="on">Aceptar</button><button id="dlg_cancel">Cancelar</button></div>`;
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
  const first = dialog.querySelector('input,select');
  if (first) first.focus();
}
function hideDialog() { dialog.style.display = 'none'; dialog.innerHTML = ''; }
const dialogOpen = () => dialog.style.display === 'block';

// ---------- Modos ----------

const MODE_HINTS = {
  select: '',
  hole: 'Agujero: haz clic sobre una cara plana de una pieza.',
  mate: 'Coincidir: clic en la cara de la 1.ª pieza, luego en la cara de la 2.ª (la 2.ª se mueve).',
  flush: 'Alinear: clic en la cara de la 1.ª pieza, luego en la cara de la 2.ª (la 2.ª se mueve).',
  concentric: 'Concéntrico: clic cerca de un orificio/cilindro de la 1.ª pieza, luego de la 2.ª.',
  move: 'Mover: arrastra una pieza (Shift = mover en Z). Al soltar se re-aplican las restricciones.',
  measure: 'Medir: clic en dos puntos (se ajusta al vértice más cercano). Esc para salir.',
};

const modeButtons = { hole: 'btnHole', mate: 'btnMate', flush: 'btnFlush', concentric: 'btnConcentric', move: 'btnMove', measure: 'btnMeasure' };

function setMode(m) {
  mode = mode === m ? 'select' : m;
  pickStage = null;
  clearHover();
  clearPickedHighlight();
  if (mode !== 'measure') clearMeasure();
  for (const [k, id] of Object.entries(modeButtons)) $(id).classList.toggle('on', mode === k);
  setHint(MODE_HINTS[mode]);
  setStatus(mode === 'select' ? 'Listo.' : 'Modo activo: ' + mode);
}
for (const [m, id] of Object.entries(modeButtons)) $(id).onclick = () => setMode(m);

// ---------- Picking ----------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function castAtEvent(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
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
  downPos = { x: ev.clientX, y: ev.clientY };
  if (mode === 'move' && ev.button === 0) startMoveDrag(ev);
});

renderer.domElement.addEventListener('pointermove', (ev) => {
  if (dialogOpen()) return;
  if (dragging) { updateMoveDrag(ev); return; }
  if (['hole', 'mate', 'flush'].includes(mode)) {
    const hit = castAtEvent(ev);
    if (hit) showHover(hit, hoverMat);
    else clearHover();
  }
});

renderer.domElement.addEventListener('pointerup', (ev) => {
  if (dialogOpen()) return;
  if (dragging) { endMoveDrag(); return; }
  if (!downPos) return;
  const moved = Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y);
  downPos = null;
  if (moved > 5 || ev.button !== 0) return; // fue órbita/paneo, no clic
  handleClick(ev);
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
  if (!hit && mode !== 'measure') { setStatus('Nada bajo el cursor.'); return; }

  if (mode === 'hole') return clickHole(hit);
  if (mode === 'mate' || mode === 'flush') return clickMate(hit, mode);
  if (mode === 'concentric') return clickConcentric(hit);
  if (mode === 'measure') return clickMeasure(hit);
}

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

function startMoveDrag(ev) {
  const hit = castAtEvent(ev);
  if (!hit) return;
  const part = getPart(doc, hit.object.userData.partId);
  if (part.fixed) { setStatus(`${part.name} está fija (📌): desmárcala para moverla.`); return; }
  const planeNormal = ev.shiftKey
    ? camera.getWorldDirection(new THREE.Vector3()).setZ(0).normalize().negate()
    : new THREE.Vector3(0, 0, 1);
  if (planeNormal.lengthSq() < 0.5) planeNormal.set(0, 1, 0);
  dragging = {
    part,
    vertical: ev.shiftKey,
    plane: new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, hit.point),
    start: hit.point.clone(),
    origPos: [...part.pos],
  };
  controls.enabled = false;
  selection = { kind: 'part', id: part.id };
  refreshUI();
}

function updateMoveDrag(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const p = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragging.plane, p)) return;
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
  const v = measureAnchor.clone().project(camera);
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
  rebuildAll, solveAndSync, loadDemo, setMode,
  meshes, scene, camera,
  THREE,
};
