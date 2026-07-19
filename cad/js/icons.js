// icons.js — set de iconos SVG (line-art monocromo, currentColor) para toda la
// interfaz: reemplaza los emojis por iconos vectoriales nítidos, escalables y
// coherentes (símil cinta de Inventor). Un único origen para barra, riel y árbol.

export const ICON = {
  // --- barra superior ---
  panel: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18" opacity=".55"/>',
  stl: '<path d="M12 3v10M8 9l4 4 4-4"/><path d="M5 15v4h14v-4"/>',
  dxf: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 13h5M10 17h5" opacity=".7"/>',
  pdf: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12l4 5M14 12l-4 5" opacity=".8"/>',
  params: '<path d="M7 19c3 0 2.5-14 6-14"/><path d="M5 10h6"/><path d="M13 9.5l7 7M20 9.5l-7 7" opacity=".85"/>',
  bom: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  save: '<path d="M5 5h11l3 3v11H5z"/><path d="M8 5v5h7V5M8 19v-6h8v6"/>',
  open: '<path d="M4 7h5l2 2h9v9a1 1 0 0 1-1 1H4z"/>',
  paste: '<rect x="7" y="4.5" width="10" height="15.5" rx="1.5"/><path d="M9.5 4.5V6h5V4.5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1z"/>',
  demo: '<path d="M12 3.5l2.1 4.9 5.4.5-4 3.6 1.2 5.3L12 15.4 7.3 17.8l1.2-5.3-4-3.6 5.4-.5z"/>',
  trash: '<path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M7 7l1 13h8l1-13"/>',
  // --- riel: crear ---
  box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8" opacity=".65"/>',
  cylinder: '<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/>',
  sketch: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3" opacity=".7"/>',
  comp: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" opacity=".85"/>',
  chapa: '<path d="M3 16h10l5-5"/><path d="M3 16v3M13 16v3M18 11v3" opacity=".7"/>',
  // --- riel: modificar ---
  hole: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.6"/>',
  feature: '<path d="M12 5v14M5 12h14"/>',
  direct: '<path d="M6 3l1 14 3-3.5 2.2 5 2.4-1-2.2-5H17z"/>',
  fillet: '<path d="M6 19V12a6 6 0 0 1 6-6h7"/><path d="M6 19H4M19 6V4" opacity=".55"/>',
  chamfer: '<path d="M6 19V11l5-5h8"/><path d="M6 19H4M19 6V4" opacity=".55"/>',
  pestana: '<path d="M5 4v15h9"/><path d="M14 19l4-4" opacity=".8"/><path d="M5 12h6" opacity=".55"/>',
  patrect: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  patcirc: '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="4.5" r="1.7"/><circle cx="19.5" cy="12" r="1.7"/><circle cx="12" cy="19.5" r="1.7"/><circle cx="4.5" cy="12" r="1.7"/>',
  // --- riel: ensamble ---
  mate: '<rect x="3" y="6" width="7.5" height="12" rx="1"/><rect x="13.5" y="6" width="7.5" height="12" rx="1"/><path d="M12 5v14" opacity=".5"/>',
  flush: '<path d="M3 7h18" opacity=".6"/><rect x="5" y="7" width="6" height="11" rx="1"/><rect x="13" y="7" width="6" height="7.5" rx="1"/>',
  concentric: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  move: '<path d="M12 3v18M3 12h18"/><path d="M12 3l-2.2 2.4M12 3l2.2 2.4M12 21l-2.2-2.4M12 21l2.2-2.4M3 12l2.4-2.2M3 12l2.4 2.2M21 12l-2.4-2.2M21 12l-2.4 2.2"/>',
  magnet: '<path d="M7 3v8a5 5 0 0 0 10 0V3h-3.2v8a1.8 1.8 0 0 1-3.6 0V3z"/><path d="M7 6.5h3.2M13.8 6.5H17" opacity=".6"/>',
  isolate: '<path d="M4 8.5V4.5h4M20 8.5V4.5h-4M4 15.5v4h4M20 15.5v4h-4"/><rect x="9.5" y="9.5" width="5" height="5" rx="1" opacity=".6"/>',
  // --- riel: vista/inspección ---
  section: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 4l16 16" opacity=".45"/><path d="M4 20L20 4" opacity=".2"/>',
  view: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9h16M9 4v16" opacity=".55"/>',
  measure: '<rect x="2.5" y="8.5" width="19" height="7" rx="1.2"/><path d="M7 8.5v3M12 8.5v4M17 8.5v3"/>',
  // --- conmutador entorno ---
  pieza: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4" opacity=".6"/>',
  ensamble: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h5a2 2 0 0 1 2 2v4" opacity=".6"/>',
  // --- árbol: operaciones y acciones ---
  union: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
  cut: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
  blend: '<path d="M6 18V12a6 6 0 0 1 6-6h6"/>',
  mesh: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M12 4v16M4 8l8 4 8-4M4 12l8 4M20 12l-8 4" opacity=".6"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeoff: '<path d="M4 4l16 16"/><path d="M9.6 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.3-1.1M7 7C4 8.7 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M9.5 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2 2.8"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  up: '<path d="M12 6v12M7 11l5-5 5 5"/>',
  down: '<path d="M12 6v12M7 13l5 5 5-5"/>',
  pin: '<path d="M9 3.5h6l-1.2 5.5 3 2.8H7.2l3-2.8z"/><path d="M12 11.8V20.5"/>',
  link: '<path d="M9.5 12h5M8.5 8.5a4 4 0 0 0 0 7h1M15.5 8.5a4 4 0 0 1 0 7h-1"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  lockopen: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  home: '<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  ortho: '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M6 6l3-3h12v12l-3 3M18 6l3-3M9 18l-3 3" opacity=".6"/>',
  persp: '<path d="M7 8l10-2v12l-10-2z"/><path d="M7 8l-3 1v6l3 1M17 6l3 1v10l-3 1" opacity=".6"/>',
};

// Envuelve el contenido en un <svg>. `cls` opcional para variar tamaño/color.
export function svgIcon(name, cls = '') {
  const inner = ICON[name] || '';
  return `<svg class="ic-svg${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
    + `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// Rellena todos los [data-icon] de un contenedor con su SVG (barra y riel del HTML).
export function setIcons(root = document) {
  for (const el of root.querySelectorAll('[data-icon]')) {
    if (!el.dataset.iconDone) { el.innerHTML = svgIcon(el.dataset.icon); el.dataset.iconDone = '1'; }
  }
}
