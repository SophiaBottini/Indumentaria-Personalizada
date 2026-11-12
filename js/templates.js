/* Plantillas de diseño ("tipos de diseño") listas para aplicar.
   Colores de marca Taller Pacino: negro #1c1e1b, oliva #4b4e36, beige #e6dfd3, topo #9c9384 */
const K = '#1c1e1b', O = '#4b4e36', B = '#e6dfd3', T = '#9c9384', W = '#f4f1ea';
export const TEMPLATES = [
  { id: 'futbol', name: 'Topográfica', sector: 'Fútbol', state: { product: 'camiseta', pattern: 'topo', collar: 'v', colors: { primary: K, secondary: O, accent: B, trim: B, text: B }, text: { front: 'CLUB ATLÉTICO', name: 'GARCÍA', number: '9', frontNumber: true, font: 'bold', outline: false } } },
  { id: 'franja', name: 'Franja pecho', sector: 'Fútbol', state: { product: 'camiseta', pattern: 'franja', collar: 'v', colors: { primary: K, secondary: O, accent: B, trim: O, text: B } } },
  { id: 'bastones', name: 'Bastones clásicos', sector: 'Fútbol', state: { product: 'camiseta', pattern: 'bastones', collar: 'redondo', colors: { primary: O, secondary: W, accent: K, trim: K, text: K } } },
  { id: 'pinstripe', name: 'Rayas finas', sector: 'Fútbol', state: { product: 'camiseta', pattern: 'pinstripe', collar: 'v', colors: { primary: K, secondary: B, accent: O, trim: O, text: B } } },
  { id: 'banda', name: 'Banda diagonal', sector: 'Fútbol', state: { product: 'camiseta', pattern: 'diagonal', collar: 'v', colors: { primary: W, secondary: O, accent: K, trim: K, text: K } } },
  { id: 'hockey', name: 'Tramado', sector: 'Hockey', state: { product: 'camiseta', pattern: 'halftone', collar: 'v', colors: { primary: W, secondary: O, accent: K, trim: O, text: K }, text: { front: 'HOCKEY CLUB', name: 'LÓPEZ', number: '7', frontNumber: true, font: 'moderna', outline: false } } },
  { id: 'hockey2', name: 'Hockey mitades', sector: 'Hockey', state: { product: 'camiseta', pattern: 'mitades', collar: 'v', colors: { primary: K, secondary: O, accent: B, trim: B, text: B }, text: { front: 'HOCKEY CLUB', name: 'LÓPEZ', number: '7', frontNumber: true, font: 'moderna', outline: false } } },
  { id: 'rugby', name: 'Rugby facetada', sector: 'Rugby', state: { product: 'chomba', collar: 'polo', pattern: 'camo', fabric: 'pique', colors: { primary: K, secondary: B, accent: O, trim: B, text: B }, text: { front: 'RUGBY CLUB', name: 'PÉREZ', number: '15', frontNumber: false, font: 'bold', outline: false } } },
  { id: 'rugby2', name: 'Rugby a rayas', sector: 'Rugby', state: { product: 'chomba', collar: 'polo', pattern: 'rayas', fabric: 'pique', colors: { primary: O, secondary: K, accent: B, trim: K, text: B }, text: { front: 'RUGBY CLUB', name: 'PÉREZ', number: '15', frontNumber: false, font: 'bold', outline: false } } },
  { id: 'basquet', name: 'Fragmentos', sector: 'Básquet', state: { product: 'musculosa', pattern: 'shards', collar: 'v', colors: { primary: W, secondary: O, accent: K, trim: K, text: K }, text: { front: 'BÁSQUET', name: 'DÍAZ', number: '23', frontNumber: true, font: 'bold', outline: false } } },
  { id: 'basquet2', name: 'Básquet chevron', sector: 'Básquet', state: { product: 'musculosa', pattern: 'chevron', collar: 'v', colors: { primary: O, secondary: B, accent: K, trim: B, text: B }, text: { front: 'BÁSQUET', name: 'DÍAZ', number: '23', frontNumber: true, font: 'bold', outline: false } } },
  { id: 'training', name: 'Entrenamiento', sector: 'Training', state: { product: 'mangalarga', pattern: 'fade', colors: { primary: K, secondary: O, accent: B, trim: K, text: B } } },
  { id: 'viaje', name: 'Buzo de viaje', sector: 'Viaje', state: { product: 'buzo', pattern: 'lisa', fabric: 'frisa', colors: { primary: O, secondary: O, accent: B, trim: K, text: B }, text: { front: 'CLUB ATLÉTICO', name: 'GARCÍA', number: '10', frontNumber: false, font: 'bold', outline: false } } },
  { id: 'staff', name: 'Cuerpo técnico', sector: 'Staff', state: { product: 'chomba', collar: 'polo', pattern: 'lisa', fabric: 'pique', colors: { primary: K, secondary: K, accent: O, trim: O, text: B }, text: { front: '', name: '', number: '', frontNumber: false, font: 'moderna', outline: false } } },
];

/* Diseño base por deporte (portada → personalizador) */
export const SECTOR_PRESETS = { futbol: 'futbol', hockey: 'hockey', rugby: 'rugby', basquet: 'basquet' };

/* Paletas sugeridas: marca + colores clásicos de club */
export const PALETTES = [
  [K, O, B], [O, W, K], [W, O, K], [K, T, W],
  ['#0b3d91', '#ffffff', '#f2c230'], ['#c1121f', '#ffffff', '#141414'], ['#1b5e20', '#ffffff', '#f2c230'],
  ['#ffffff', '#87ceeb', '#0b2545'], ['#5a189a', '#ffffff', '#ff9e00'], ['#7b1e3a', '#f2e8cf', '#c9a227'],
];

export const SWATCHES = ['#ffffff', W, B, T, O, '#2c2f24', K, '#000000', '#0b3d91', '#1f7ae0', '#87ceeb', '#0a1a3a', '#c1121f', '#7b1e3a', '#ff6b00', '#f2c230', '#1b5e20', '#2a9d8f', '#5a189a', '#ff006e', '#a8dadc', '#8d99ae', '#c9a227', '#f2e8cf'];

import { DEFAULT_STATE, cloneState } from './garment.js';

export function mergeState(base, patch) {
  const s = cloneState(base);
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && s[k] && typeof s[k] === 'object') s[k] = { ...s[k], ...v };
    else s[k] = v;
  }
  // mangas acompañan al color principal salvo que se indique
  if (patch && patch.colors && !patch.colors.sleeves) s.colors.sleeves = s.colors.primary;
  return s;
}

export function stateFromTemplate(id) {
  const t = TEMPLATES.find((x) => x.id === id) || TEMPLATES[0];
  return mergeState(DEFAULT_STATE, t.state);
}
