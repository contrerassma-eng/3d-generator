// entry_sonda.mjs — visor PREMIUM autocontenido de la sonda de humedad de
// suelo industrial: vista de CORTE REAL por CSG (media sección Y=0 con caras
// de corte destacadas), corte libre por plano de recorte, despiece (explode)
// e instrucciones de ensamble paso a paso con resaltado de piezas.
// Se empaqueta con build_sonda_html.mjs (three + model.js + csg.js + JSON).

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { buildPartGeometry, partMatrix } from '../js/model.js';
import { geomToCSG, csgToGeom } from '../js/csg.js';
import doc from '__doc__';

const $ = (id) => document.getElementById(id);

// --- escena ------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141a);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.localClippingEnabled = true;
$('view').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x272c34, 1.1));
const s1 = new THREE.DirectionalLight(0xffffff, 1.7); s1.position.set(500, -700, 900); scene.add(s1);
const s2 = new THREE.DirectionalLight(0x93a6c8, 0.6); s2.position.set(-600, 500, -300); scene.add(s2);
const s3 = new THREE.DirectionalLight(0xffe9c4, 0.35); s3.position.set(200, 300, -800); scene.add(s3);

// --- piezas: geometría completa + (perezosa) geometría cortada -----------------
const CLIP = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
const parts = [];         // {part, full:Group, cut:Group|null, mats:[], ghost, exploded}
const boxAll = new THREE.Box3();

function makeMats(color) {
  const std = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.6, side: THREE.DoubleSide });
  const cutFace = new THREE.MeshStandardMaterial({ color: 0xc9484f, metalness: 0.05, roughness: 0.9, side: THREE.DoubleSide });
  return { std, cutFace };
}

for (const part of doc.parts) {
  const g = buildPartGeometry(part);
  g.applyMatrix4(partMatrix(part));               // horneado a coordenadas de mundo
  const mats = makeMats(part.color || '#8899aa');
  const mesh = new THREE.Mesh(g, mats.std);
  const grp = new THREE.Group(); grp.add(mesh); scene.add(grp);
  g.computeBoundingBox(); boxAll.union(g.boundingBox);
  parts.push({ part, geomFull: g, full: grp, cut: null, mats, explodeV: doc.meta.explode[part.id] || [0, 0, 0] });
}

// --- entorno: nivel de terreno + marcas de profundidad -------------------------
const ground = new THREE.Group();
{
  const disc = new THREE.Mesh(
    new THREE.RingGeometry(85, 420, 64),
    new THREE.MeshBasicMaterial({ color: 0x6b4f2e, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  disc.position.z = -0.5; ground.add(disc);
  const label = (txt, z, r = 66) => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 56;
    const c = cv.getContext('2d'); c.font = '600 30px system-ui'; c.fillStyle = '#cfd6e4';
    c.textAlign = 'left'; c.fillText(txt, 8, 38);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
    sp.scale.set(200, 21.9, 1); sp.position.set(r + 130, 0, z); ground.add(sp);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.6, 6, 64),
      new THREE.MeshBasicMaterial({ color: 0x8aa0c8, transparent: true, opacity: 0.5 }));
    ring.position.z = z; ground.add(ring);
  };
  const SN = doc.meta.etiquetaSensor || 'SMT100';
  label('NPT 0.00', 0, 82);
  label(`−20 cm · ${SN} #1`, -200);
  label(`−40 cm · ${SN} #2`, -400);
  label(`−60 cm · ${SN} #3`, -600);
  scene.add(ground);
}

// --- cámara --------------------------------------------------------------------
const c0 = boxAll.getCenter(new THREE.Vector3());
const size = boxAll.getSize(new THREE.Vector3()).length();
const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, size / 800, size * 40);
cam.up.set(0, 0, 1);
const controls = new OrbitControls(cam, renderer.domElement);
const setView = (which) => {
  const zc = (doc.meta.variante || '').includes('v2') ? 1350 : 980;
  const tgt = which === 'cabezal' ? new THREE.Vector3(0, 0, zc) : c0.clone();
  const d = which === 'cabezal' ? ((doc.meta.variante || '').includes('v2') ? 760 : 520) : size * 0.62;
  const pos = {
    iso: [tgt.x + d, tgt.y - d, tgt.z + d * 0.72],
    frente: [tgt.x, tgt.y - d * 1.6, tgt.z + 6],
    cabezal: [tgt.x + d * 0.9, tgt.y - d * 0.9, tgt.z + d * 0.62],
  }[which] || [tgt.x + d, tgt.y - d, tgt.z + d * 0.72];
  cam.position.set(...pos); controls.target.copy(tgt); controls.update();
};
setView('iso');

// --- corte A-A real por CSG (perezoso, cacheado) --------------------------------
let cutReady = false;
function buildCut() {
  if (cutReady) return; cutReady = true;
  const EPS = 0.02;
  for (const e of parts) {
    const bb = e.geomFull.boundingBox;
    // se remueve el semiespacio y<0 (la sección queda mirando a las cámaras −Y)
    if (bb.max.y <= 1e-6) { e.cut = new THREE.Group(); scene.add(e.cut); continue; }
    let geom = e.geomFull;
    if (bb.min.y < -1e-6) {   // cruza el plano: restar semiespacio y<0
      const H = -bb.min.y + 4;
      const cutBox = new THREE.BoxGeometry(
        bb.max.x - bb.min.x + 4, H, bb.max.z - bb.min.z + 4);
      cutBox.translate((bb.max.x + bb.min.x) / 2, 1e-3 - H / 2, (bb.max.z + bb.min.z) / 2);
      try { geom = csgToGeom(geomToCSG(e.geomFull).subtract(geomToCSG(cutBox))); }
      catch { geom = e.geomFull; }
    }
    // separar triángulos de la cara de corte (sobre y≈0) del resto
    const p = geom.attributes.position, body = [], face = [];
    for (let i = 0; i < p.count; i += 3) {
      let onPlane = true;
      for (let k = 0; k < 3; k++) if (Math.abs(p.getY(i + k)) > EPS) { onPlane = false; break; }
      const dst = onPlane ? face : body;
      for (let k = 0; k < 3; k++) dst.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
    }
    const grp = new THREE.Group();
    const mk = (arr, mat) => {
      if (!arr.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      grp.add(new THREE.Mesh(g, mat));
    };
    mk(body, e.mats.std); mk(face, e.mats.cutFace);
    grp.visible = false; scene.add(grp); e.cut = grp;
  }
}

// --- estado de vista -------------------------------------------------------------
let mode = 'full';        // full | cutA | clip
let explodeT = 0;
let activeStep = -1;      // -1 = sin paso

function apply() {
  const paso = activeStep >= 0 ? doc.meta.pasos[activeStep] : null;
  for (const e of parts) {
    const showCut = mode === 'cutA';
    e.full.visible = !showCut;
    if (e.cut) e.cut.visible = showCut;
    const t = mode === 'full' ? explodeT : 0;
    const off = [e.explodeV[0] * t, e.explodeV[1] * t, e.explodeV[2] * t];
    e.full.position.set(...off);
    // resaltado por paso
    const inStep = !paso || !paso.partes.length || paso.partes.includes(e.part.id);
    for (const m of [e.mats.std, e.mats.cutFace]) {
      m.transparent = !inStep; m.opacity = inStep ? 1 : 0.12;
      m.emissive = new THREE.Color(inStep && paso ? 0x22344a : 0x000000);
      m.depthWrite = inStep;
      m.clippingPlanes = mode === 'clip' ? [CLIP] : null;
    }
  }
  ground.visible = $('chkSuelo').checked && mode !== 'clip';
  $('modeFull').classList.toggle('on', mode === 'full');
  $('modeCut').classList.toggle('on', mode === 'cutA');
  $('modeClip').classList.toggle('on', mode === 'clip');
  $('rowExplode').style.display = mode === 'full' ? 'flex' : 'none';
  $('rowClip').style.display = mode === 'clip' ? 'flex' : 'none';
}

// --- UI: modos -------------------------------------------------------------------
$('modeFull').onclick = () => { mode = 'full'; apply(); };
$('modeCut').onclick = () => {
  $('modeCut').textContent = '⏳ CSG…';
  setTimeout(() => {
    buildCut(); mode = 'cutA';
    $('modeCut').textContent = '▤ Corte A-A';
    apply();
  }, 20);
};
$('modeClip').onclick = () => { mode = 'clip'; apply(); };
$('explode').oninput = (ev) => { explodeT = ev.target.value / 100; apply(); };
$('chkSuelo').onchange = apply;
const updClip = () => {
  const ax = $('clipAxis').value;
  const v = +$('clipPos').value;
  const n = { x: [-1, 0, 0], y: [0, -1, 0], z: [0, 0, -1] }[ax];
  CLIP.normal.set(...n);
  const range = ax === 'z' ? [-740, 1250] : [-100, 100];
  CLIP.constant = range[0] + (range[1] - range[0]) * (v / 100);
  apply();
};
$('clipAxis').onchange = updClip;
$('clipPos').oninput = updClip;
$('vIso').onclick = () => setView('iso');
$('vFrente').onclick = () => setView('frente');
$('vCabezal').onclick = () => setView('cabezal');

// --- UI: panel derecha (pasos / BOM / features) ------------------------------------
const pasos = doc.meta.pasos;
function renderPasos() {
  $('tabBody').innerHTML = `
    <div class="stepNav">
      <button id="pPrev">◀</button>
      <div id="pTit">${activeStep < 0 ? 'Vista general — elige un paso' : `Paso ${pasos[activeStep].n}/12 · ${pasos[activeStep].t}`}</div>
      <button id="pNext">▶</button>
    </div>
    <div id="pTxt" class="stepTxt">${activeStep < 0
      ? 'Instrucciones de ensamble del prototipo. Usa ◀ ▶ o toca un paso: las piezas del paso se destacan y el resto se atenúa. El corte A-A y el despiece siguen disponibles en cualquier paso.'
      : pasos[activeStep].texto}</div>
    <ol class="stepList">${pasos.map((p, i) =>
      `<li class="${i === activeStep ? 'cur' : ''}" data-i="${i}">${p.n}. ${p.t}</li>`).join('')}</ol>`;
  $('pPrev').onclick = () => { activeStep = Math.max(-1, activeStep - 1); renderPasos(); apply(); };
  $('pNext').onclick = () => { activeStep = Math.min(pasos.length - 1, activeStep + 1); renderPasos(); apply(); };
  for (const li of $('tabBody').querySelectorAll('li'))
    li.onclick = () => { activeStep = +li.dataset.i; renderPasos(); apply(); };
}
function renderBOM() {
  $('tabBody').innerHTML = `<table class="bom"><tr><th>#</th><th>Designación</th><th>Material</th><th>Cant</th></tr>` +
    doc.meta.bom.map(b => `<tr title="${b.nota}"><td>${b.item}</td><td>${b.desig}</td><td>${b.mat}</td><td>${b.cant}</td></tr>`).join('') +
    `</table><div class="note">CONSUMIBLES:<ul>${doc.meta.consumibles.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
}
function renderFeatures() {
  $('tabBody').innerHTML = `<ul class="feat">${doc.meta.features.map(x => `<li>${x}</li>`).join('')}</ul>
   <div class="note">DESVIACIONES DE INGENIERÍA vs informe:<ul>${doc.meta.desviaciones.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
}
const tabs = { tPasos: renderPasos, tBom: renderBOM, tFeat: renderFeatures };
for (const id of Object.keys(tabs)) $(id).onclick = () => {
  for (const j of Object.keys(tabs)) $(j).classList.toggle('on', j === id);
  tabs[id]();
};
$('panelToggle').onclick = () => $('panel').classList.toggle('closed');

renderPasos(); apply();

renderer.setAnimationLoop(() => renderer.render(scene, cam));
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
});
window.__listo = true;
