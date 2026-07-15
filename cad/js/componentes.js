// componentes.js — biblioteca de componentes electrónicos insertables.
// Lee el catálogo (componentes/catalogo.json, servido como componentes.json
// junto a la app; regenerar con `python pipeline/componentes_cli.py sync-web`)
// y convierte cada registro en una pieza foto3d-cad: los sólidos caja/cilindro
// como funciones de unión y los agujeros de montaje como agujeros pasantes.
// Mismo mapeo que pipeline/lib_componentes.cad_part (Python).

import { uid } from './model.js';

export const COLOR_CATEGORIA = {
  mcu: '#6d9ee8', alimentacion: '#e8a56d', sensor: '#7fc98a',
  boton: '#c98ad0', conector: '#9a9fe0', adaptador: '#6bc9c2',
};

let _catalogo = null;

export async function loadCatalogo(url = 'componentes.json') {
  if (_catalogo) return _catalogo;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`no se pudo cargar ${url} (HTTP ${res.status})`);
  const cat = await res.json();
  if (cat.formato !== 'foto3d-componentes') throw new Error('catálogo de componentes inválido');
  _catalogo = cat;
  return cat;
}

// Caja envolvente [min, max] de los sólidos de un componente (mm).
export function envolvente(comp) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const s of comp.solidos) {
    const [x, y, z] = s.at;
    let a, b;
    if (s.tipo === 'caja') {
      const [w, d, h] = s.dim;
      a = [x - w / 2, y - d / 2, z];
      b = [x + w / 2, y + d / 2, z + h];
    } else {
      const eje = s.eje || [0, 0, 1];
      const n = Math.hypot(...eje) || 1;
      const e = eje.map(v => v / n);
      const tip = [x + e[0] * s.alto, y + e[1] * s.alto, z + e[2] * s.alto];
      const r = s.dia / 2;
      a = e.map((v, i) => Math.min(s.at[i], tip[i]) - r * Math.sqrt(Math.max(0, 1 - v * v)));
      b = e.map((v, i) => Math.max(s.at[i], tip[i]) + r * Math.sqrt(Math.max(0, 1 - v * v)));
    }
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], a[i]); hi[i] = Math.max(hi[i], b[i]); }
  }
  return [lo, hi];
}

// Registro del catálogo → pieza foto3d-cad (sin pos: la asigna quien inserta).
export function componentToPart(comp) {
  const features = [];
  for (const s of comp.solidos) {
    const at = s.at.map(Number);
    if (s.tipo === 'caja') {
      const [w, d, h] = s.dim.map(Number);
      features.push({ id: uid('f'), name: s.nombre || 'Caja', shape: 'box', op: 'union', at, dir: [0, 0, 1], params: { w, d, h } });
    } else {
      features.push({ id: uid('f'), name: s.nombre || 'Cilindro', shape: 'cylinder', op: 'union', at, dir: (s.eje || [0, 0, 1]).map(Number), params: { dia: +s.dia, h: +s.alto } });
    }
  }
  const pcb = comp.solidos.find(s => s.pcb);
  if (pcb) {
    const zTop = pcb.at[2] + pcb.dim[2];
    for (const a of comp.agujeros_montaje || []) {
      features.push({ id: uid('f'), name: `Agujero Ø${a.dia}`, shape: 'hole', op: 'cut', at: [+a.pos[0], +a.pos[1], zTop], dir: [0, 0, -1], params: { dia: +a.dia, depth: 0, through: true } });
    }
  }
  return {
    id: uid('p'),
    name: comp.nombre,
    color: COLOR_CATEGORIA[comp.categoria] || '#9a9fe0',
    pos: [0, 0, 0],
    quat: [0, 0, 0, 1],
    fixed: false,
    visible: true,
    componente: comp.id, // trazabilidad: de qué registro del catálogo salió
    features,
  };
}
