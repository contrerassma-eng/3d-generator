#!/usr/bin/env node
// glb_view.mjs — renderiza una pieza extraída (JSON de glb_extract) con el
// motor iso3d en 4 vistas (iso + 3 ortográficas) a SVG, para MEDIR mirando.
import * as THREE from 'three';
import { IsoScene } from '../js/iso3d.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const [inJson, outSvg] = process.argv.slice(2);
const d = JSON.parse(readFileSync(inJson, 'utf8'));
const pos = new Float32Array(d.positions);
const geom = new THREE.BufferGeometry();
geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

const vistas = [
  ['ISO', [-1, 1, -0.62]],
  ['FRENTE (−Y)', [0, 1, -0.0001]],
  ['LADO (−X)', [1, 0.0001, -0.0001]],
  ['ARRIBA', [0, 0.0001, -1]],
];
let y = 8, gs = [];
for (const [nm, dir] of vistas) {
  const sc = new IsoScene();
  sc.items.push({ part: { name: d.nodo, color: '#cfd2ce' }, geom: geom.clone(), opts: {}, off: new THREE.Vector3() });
  const fig = sc.project({ dir, widthMM: 170, res: 1300 });
  const H = fig.heightMM;
  const fills = fig.fills.map(f => `<path d="${f.loops.map(lp => 'M' + lp.map(([x, yy]) => `${x.toFixed(2)},${(H - yy).toFixed(2)}`).join('L') + 'Z').join('')}" fill="rgb(${f.rgb.map(v => Math.round(v * 255)).join(',')})" fill-rule="evenodd" stroke="rgb(${f.rgb.map(v => Math.round(v * 255)).join(',')})" stroke-width="0.15"/>`).join('');
  const lines = fig.segments.map(s => `<line x1="${s.a[0].toFixed(2)}" y1="${(H - s.a[1]).toFixed(2)}" x2="${s.b[0].toFixed(2)}" y2="${(H - s.b[1]).toFixed(2)}" stroke="black" stroke-width="${s.kind === 3 ? 0.45 : 0.22}"/>`).join('');
  gs.push(`<g transform="translate(12,${y})"><text y="-2" font-size="5" font-family="sans-serif">${nm} — bbox ${[d.bbox.x, d.bbox.y, d.bbox.z].map(([a, b]) => (b - a).toFixed(1)).join(' × ')} mm</text>${fills}${lines}</g>`);
  y += H + 16;
}
writeFileSync(outSvg, `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="${y * 4.3}" viewBox="0 0 195 ${y}"><rect width="100%" height="100%" fill="white"/>${gs.join('')}</svg>`);
console.log('OK', outSvg, `(${d.positions.length / 9} tris)`);
