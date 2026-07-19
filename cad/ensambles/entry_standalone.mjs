// Entry para empaquetar un HTML AUTOCONTENIDO (sin servidor) de la animación.
// esbuild embebe three, OrbitControls, model.js, animate.js y los JSON.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { buildPartGeometry, partMatrix } from '../js/model.js';
import { animMatrix, fase, props } from '../js/animate.js';
import doc from './integracion_modulo_base.json';
import spec from './transfer_anim.json';

function stripeTex() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8;
  const g = cv.getContext('2d');
  g.fillStyle = '#141414'; g.fillRect(0, 0, 64, 8);
  g.fillStyle = '#3a3a3a'; for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 8, 8);
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(24, 1);
  return tx;
}

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x12151b);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x2a2f37, 1.05));
const s1 = new THREE.DirectionalLight(0xffffff, 1.7); s1.position.set(500, -700, 900); scene.add(s1);
const s2 = new THREE.DirectionalLight(0x93a6c8, 0.55); s2.position.set(-600, 500, 300); scene.add(s2);

const meshes = [], box = new THREE.Box3();
for (const part of doc.parts) {
  if (part.visible === false) continue;
  const g = buildPartGeometry(part);
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: part.color || '#8899aa', metalness: 0.25, roughness: 0.62 }));
  mesh.matrixAutoUpdate = false; mesh.userData.base = partMatrix(part); mesh.userData.part = part;
  mesh.matrix.copy(mesh.userData.base);
  for (const bs of spec.beltScroll || []) if (new RegExp(bs.match).test(part.name)) { const tx = stripeTex(); mesh.material.map = tx; mesh.material.color.set('#ffffff'); mesh.userData.scroll = { tx, speed: bs.speed }; break; }
  scene.add(mesh); meshes.push(mesh);
  g.computeBoundingBox(); box.union(g.boundingBox.clone().applyMatrix4(mesh.userData.base));
}
const propMeshes = (spec.props || []).map(pr => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(pr.box[0], pr.box[1], pr.box[2]), new THREE.MeshStandardMaterial({ color: pr.color || '#c8a86a', metalness: 0.05, roughness: 0.85 }));
  m.matrixAutoUpdate = false; scene.add(m); return m;
});
const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()).length();
const cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, size / 500, size * 50); cam.up.set(0, 0, 1);
cam.position.set(c.x + size * 0.5, c.y - size * 0.55, c.z + size * 0.42); cam.lookAt(c);
const ctr = new OrbitControls(cam, renderer.domElement); ctr.target.copy(c); ctr.update();

document.getElementById('tit').textContent = spec.nombre || 'animación';
const tmp = new THREE.Matrix4();
function apply(t) {
  for (const m of meshes) { tmp.multiplyMatrices(animMatrix(m.userData.part, t, spec, THREE), m.userData.base); m.matrix.copy(tmp); if (m.userData.scroll) m.userData.scroll.tx.offset.x = -t * m.userData.scroll.speed; }
  const pr = props(spec, t);
  propMeshes.forEach((m, i) => { m.visible = pr[i].visible; m.matrix.makeTranslation(pr[i].pos[0], pr[i].pos[1], pr[i].pos[2]); });
  document.getElementById('fase').textContent = fase(t, spec);
  document.getElementById('t').textContent = (t % (spec.loop || 6)).toFixed(1) + ' s';
  document.getElementById('sl').value = String(Math.round((t % (spec.loop || 6)) / (spec.loop || 6) * 1000));
}
let playing = true, t0 = performance.now() / 1000, t = 0;
document.getElementById('pp').onclick = (e) => { playing = !playing; e.target.textContent = playing ? '⏸ Pausa' : '▶ Reproducir'; if (playing) t0 = performance.now() / 1000 - t; };
document.getElementById('sl').oninput = (e) => { playing = false; document.getElementById('pp').textContent = '▶ Reproducir'; t = e.target.value / 1000 * (spec.loop || 6); apply(t); };
renderer.setAnimationLoop(() => { if (playing) { t = performance.now() / 1000 - t0; apply(t); } renderer.render(scene, cam); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
