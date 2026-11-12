/* Plantillas de diseño ("tipos de diseño") listas para aplicar */
export const TEMPLATES = [
  { id: 'clasica', name: 'Clásica a bastones', sector: 'Clubes', state: { product: 'camiseta', pattern: 'bastones', collar: 'redondo', colors: { primary: '#0b3d91', secondary: '#f5f5f5', accent: '#f2c230', trim: '#0b3d91', text: '#f2c230' } } },
  { id: 'banda', name: 'Banda diagonal', sector: 'Clubes', state: { product: 'camiseta', pattern: 'diagonal', collar: 'v', colors: { primary: '#f7f7f7', secondary: '#d62828', accent: '#141414', trim: '#d62828', text: '#141414' } } },
  { id: 'franja', name: 'Franja pecho', sector: 'Clubes', state: { product: 'camiseta', pattern: 'franja', collar: 'redondo', colors: { primary: '#141414', secondary: '#f2c230', accent: '#ffffff', trim: '#f2c230', text: '#ffffff' } } },
  { id: 'degrade', name: 'Degradé Pro', sector: 'Running / Training', state: { product: 'camiseta', pattern: 'degrade', collar: 'v', colors: { primary: '#0a1a3a', secondary: '#1fb6ff', accent: '#c6ff3d', trim: '#0a1a3a', text: '#c6ff3d' } } },
  { id: 'mitades', name: 'Mitades', sector: 'Clubes', state: { product: 'camiseta', pattern: 'mitades', collar: 'redondo', colors: { primary: '#c1121f', secondary: '#1d3557', accent: '#f1faee', trim: '#f1faee', text: '#f1faee' } } },
  { id: 'training', name: 'Training laterales', sector: 'Entrenamiento', state: { product: 'camiseta', pattern: 'laterales', collar: 'v', colors: { primary: '#1b1b1b', secondary: '#ff6b00', accent: '#ffffff', trim: '#ff6b00', text: '#ff6b00' } } },
  { id: 'hockey', name: 'Hombros contraste', sector: 'Hockey / Vóley', state: { product: 'camiseta', pattern: 'hombros', collar: 'v', colors: { primary: '#2a9d8f', secondary: '#264653', accent: '#e9c46a', trim: '#264653', text: '#ffffff' } } },
  { id: 'basquet', name: 'Básquet Chevron', sector: 'Básquet', state: { product: 'musculosa', pattern: 'chevron', collar: 'v', colors: { primary: '#5a189a', secondary: '#ff9e00', accent: '#ffffff', trim: '#ff9e00', text: '#ffffff' } } },
  { id: 'geo', name: 'Geométrica', sector: 'Sublimación total', state: { product: 'camiseta', pattern: 'geometrico', collar: 'redondo', colors: { primary: '#0d1b2a', secondary: '#00b4d8', accent: '#ff006e', trim: '#00b4d8', text: '#ffffff' } } },
  { id: 'pinceladas', name: 'Pinceladas', sector: 'Sublimación total', state: { product: 'camiseta', pattern: 'sublimado', collar: 'v', colors: { primary: '#f8f9fa', secondary: '#06d6a0', accent: '#118ab2', trim: '#118ab2', text: '#073b4c' } } },
  { id: 'corporativa', name: 'Corporativa', sector: 'Empresas', state: { product: 'chomba', pattern: 'lisa', collar: 'polo', fabric: 'pique', colors: { primary: '#1d3557', secondary: '#1d3557', accent: '#a8dadc', trim: '#f1faee', text: '#f1faee' }, text: { front: '', name: '', number: '', frontNumber: false, font: 'moderna', outline: false } } },
  { id: 'egresados', name: 'Egresados', sector: 'Colegios', state: { product: 'buzo', pattern: 'lisa', fabric: 'frisa', colors: { primary: '#2b2d42', secondary: '#2b2d42', accent: '#ef233c', trim: '#ef233c', text: '#edf2f4' }, text: { front: 'PROMO 2027', name: 'SOFI', number: '27', frontNumber: false, font: 'college', outline: false } } },
];

/* Presets por sector (desde la portada) */
export const SECTOR_PRESETS = {
  club: 'clasica',
  colegio: 'egresados',
  empresa: 'corporativa',
};

/* Paletas sugeridas */
export const PALETTES = [
  ['#0b3d91', '#f5f5f5', '#f2c230'],
  ['#c1121f', '#ffffff', '#141414'],
  ['#141414', '#f2c230', '#ffffff'],
  ['#1b5e20', '#ffffff', '#f2c230'],
  ['#5a189a', '#ff9e00', '#ffffff'],
  ['#0a1a3a', '#1fb6ff', '#c6ff3d'],
  ['#ffffff', '#87ceeb', '#0b2545'],
  ['#7b1e3a', '#f2e8cf', '#c9a227'],
  ['#ff6b00', '#1b1b1b', '#ffffff'],
  ['#2a9d8f', '#264653', '#e9c46a'],
];

export const SWATCHES = ['#ffffff', '#f5f5f5', '#141414', '#2b2d42', '#0b3d91', '#1fb6ff', '#87ceeb', '#0a1a3a', '#c1121f', '#d62828', '#7b1e3a', '#ff6b00', '#f2c230', '#ffd60a', '#c6ff3d', '#1b5e20', '#2a9d8f', '#06d6a0', '#5a189a', '#ff006e', '#a8dadc', '#8d99ae', '#c9a227', '#f2e8cf'];

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
