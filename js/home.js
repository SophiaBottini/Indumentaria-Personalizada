import { applyConfig } from './config.js';
import { GarmentViewer, PRODUCTS, PATTERNS, FABRICS, DEFAULT_STATE, renderThumbnail } from './garment.js';
import { PALETTES, stateFromTemplate, mergeState } from './templates.js';

applyConfig();

const $ = (s, r = document) => r.querySelector(s);

/* Header con sombra al hacer scroll */
const header = $('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* Animaciones de aparición */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

const K = '#1c1e1b', O = '#4b4e36', B = '#e6dfd3', W = '#f4f1ea';
const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

/* ---------------- Hero 3D por deporte ---------------- */
const SPORTS = [
  { key: 'futbol', label: 'Fútbol', tpl: 'futbol', num: '10' },
  { key: 'hockey', label: 'Hockey', tpl: 'hockey', num: '7' },
  { key: 'rugby', label: 'Rugby', tpl: 'rugby', num: '15' },
  { key: 'basquet', label: 'Básquet', tpl: 'basquet', num: '23' },
];
const tabs = $('#sportTabs');
let hero, heroIdx = 0, touched = false;
SPORTS.forEach((s, i) => {
  const b = document.createElement('button');
  b.textContent = s.label; b.setAttribute('role', 'tab');
  b.onclick = () => { touched = true; showSport(i); };
  tabs.appendChild(b);
});
function heroState(i) {
  const s = stateFromTemplate(SPORTS[i].tpl);
  s.text.front = 'PACINO'; s.text.number = SPORTS[i].num;
  return s;
}
async function showSport(i) {
  heroIdx = i;
  [...tabs.children].forEach((b, k) => { b.classList.toggle('active', k === i); b.setAttribute('aria-selected', k === i); });
  $('#heroNum').textContent = SPORTS[i].num;
  await hero.setState(heroState(i));
}
try {
  hero = new GarmentViewer($('#heroStage'), { autoRotate: true, zoom: false });
  hero.camera.position.set(2.4, 0.45, 8.2);
  showSport(0);
  setInterval(() => { if (!touched && !document.hidden) showSport((heroIdx + 1) % SPORTS.length); }, 5000);
  $('#heroStage').addEventListener('pointerdown', () => { touched = true; });
} catch (e) {
  console.warn('WebGL no disponible', e);
}

/* ---------------- Deportes ---------------- */
const SPORT_CARDS = [
  { key: 'futbol', title: 'Fútbol', tpl: 'futbol', text: 'Camisetas de juego y arquero, shorts y conjuntos de entrenamiento.', tags: ['Camiseta', 'Short', 'Arquero'] },
  { key: 'hockey', title: 'Hockey', tpl: 'hockey', text: 'Camisetas livianas con sublimación total y numeración por jugadora.', tags: ['Camiseta', 'Pollera', 'Buzo'] },
  { key: 'rugby', title: 'Rugby', tpl: 'rugby', text: 'Camisetas de alta resistencia con costuras reforzadas y cuello polo.', tags: ['Camiseta', 'Short', 'Viaje'] },
  { key: 'basquet', title: 'Básquet', tpl: 'basquet', text: 'Musculosas y shorts de micropanal con máxima ventilación.', tags: ['Musculosa', 'Short', 'Calentamiento'] },
];
const sportsGrid = $('#sportsGrid');
for (const c of SPORT_CARDS) {
  const a = document.createElement('a');
  a.className = 'sport-card reveal'; a.href = `personalizar.html?sector=${c.key}`;
  a.innerHTML = `<div class="sport-media"><div class="skeleton"></div></div>
    <div class="sport-body"><h3>${c.title}</h3><p>${c.text}</p>
    <div class="tags">${c.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
    <span class="more">Diseñar</span></div>`;
  sportsGrid.appendChild(a); io.observe(a);
}

/* ---------------- Personalizador demo ---------------- */
const DEMO_PRODUCTS = ['camiseta', 'musculosa', 'chomba', 'mangalarga'];
const DEMO_PATTERNS = ['topo', 'halftone', 'fade', 'camo', 'pinstripe', 'shards', 'franja', 'bastones'];
let demoState = mergeState(DEFAULT_STATE, { pattern: 'topo', collar: 'v' });
let demo;
const chip = (label, active, on) => { const b = document.createElement('button'); b.className = 'chip' + (active ? ' active' : ''); b.textContent = label; b.onclick = on; return b; };
function renderDemoUI() {
  const pEl = $('#demoProducts'); pEl.innerHTML = '';
  DEMO_PRODUCTS.forEach((k) => pEl.appendChild(chip(PRODUCTS[k].short, demoState.product === k, () => setDemo((s) => {
    s.product = k; s.collar = k === 'chomba' ? 'polo' : 'v'; s.fabric = k === 'chomba' ? 'pique' : k === 'musculosa' ? 'micropanal' : 'dryfit';
  }))));
  const tEl = $('#demoPatterns'); tEl.innerHTML = '';
  DEMO_PATTERNS.forEach((k) => tEl.appendChild(chip(PATTERNS[k], demoState.pattern === k, () => setDemo((s) => { s.pattern = k; }))));
  const cEl = $('#demoPalettes'); cEl.innerHTML = '';
  PALETTES.forEach(([a, b, c]) => {
    const btn = document.createElement('button');
    btn.style.setProperty('--a', a); btn.style.setProperty('--b', b); btn.style.setProperty('--c', c);
    btn.setAttribute('aria-label', `Colores ${a}, ${b} y ${c}`);
    if (demoState.colors.primary === a && demoState.colors.secondary === b) btn.classList.add('active');
    btn.onclick = () => setDemo((s) => {
      const text = lum(a) > 0.6 ? (lum(c) < 0.5 ? c : K) : (lum(c) > 0.5 ? c : W);
      s.colors = { ...s.colors, primary: a, secondary: b, accent: c, sleeves: a, trim: c, text };
    });
    cEl.appendChild(btn);
  });
  const s = demoState, dots = `<span class="dots">${[s.colors.primary, s.colors.secondary, s.colors.accent].map((c) => `<i style="background:${c}"></i>`).join('')}</span>`;
  $('#demoSpec').innerHTML = [['Prenda', PRODUCTS[s.product].name], ['Diseño', PATTERNS[s.pattern]], ['Tela', FABRICS[s.fabric].label], ['Colores', dots], ['Nombre / Nº', `${s.text.name} · ${s.text.number}`]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const share = { ...s }; delete share.logo;
  $('#demoGo').href = `personalizar.html#d=${btoa(unescape(encodeURIComponent(JSON.stringify(share))))}`;
}
function setDemo(fn) { fn(demoState); renderDemoUI(); if (demo) demo.setState(demoState, { pop: false }); }
renderDemoUI();

let demoStarted = false;
const demoIO = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting || demoStarted) return;
  demoStarted = true;
  try {
    demo = new GarmentViewer($('#demoStage'), { autoRotate: false });
    demo.setState(demoState);
  } catch (err) { console.warn(err); }
}, { rootMargin: '200px' });
demoIO.observe($('#demoStage'));
document.querySelectorAll('#demoViews button').forEach((b) => b.onclick = () => {
  if (!demo) return;
  const v = b.dataset.view;
  document.querySelectorAll('#demoViews button').forEach((x) => x.classList.toggle('active', x === b));
  if (v === 'rotar') demo.setAutoRotate(true); else demo.setView(v);
});

/* ---------------- Catálogo ---------------- */
const CATALOG = [
  { key: 'camiseta', title: 'Camiseta de juego', text: 'Sublimación total, liviana y respirable.', tag: 'Dry-fit', tpl: 'pinstripe' },
  { key: 'mangalarga', title: 'Manga larga', text: 'Arqueros, invierno y primera piel térmica.', tag: 'Dry-fit', tpl: 'training' },
  { key: 'musculosa', title: 'Musculosa', text: 'Básquet y vóley, con máxima ventilación.', tag: 'Micropanal', tpl: 'basquet2' },
  { key: 'chomba', title: 'Chomba', text: 'Cuerpo técnico, dirigentes y staff.', tag: 'Piqué', tpl: 'staff' },
  { key: 'buzo', title: 'Buzo de viaje', text: 'Abrigo para viajes y concentración.', tag: 'Frisa', tpl: 'viaje' },
  { key: 'short', title: 'Short', text: 'Fútbol, rugby, hockey y entrenamiento.', tag: 'Dry-fit', tpl: 'franja' },
];
const productGrid = $('#productGrid');
for (const p of CATALOG) {
  const a = document.createElement('a');
  a.className = 'product reveal'; a.href = `personalizar.html?producto=${p.key}&plantilla=${p.tpl}`;
  a.innerHTML = `<div class="product-media"><div class="skeleton"></div><span class="b3d">3D</span></div>
    <div class="product-body"><h3>${p.title}</h3><p>${p.text}</p>
    <div class="product-foot"><span class="tag">${p.tag}</span><span class="more">Personalizar</span></div></div>`;
  productGrid.appendChild(a); io.observe(a);
}

function setImg(container, url, cls = '') {
  const sk = container.querySelector('.skeleton'); if (sk) sk.remove();
  const img = new Image(); img.src = url; img.alt = ''; if (cls) img.className = cls;
  container.prepend(img);
}

async function renderThumbs() {
  const media = sportsGrid.querySelectorAll('.sport-media');
  for (let i = 0; i < SPORT_CARDS.length; i++) {
    setImg(media[i], await renderThumbnail(stateFromTemplate(SPORT_CARDS[i].tpl), { w: 520, h: 560, angle: 0.4 }));
  }
  const pm = productGrid.querySelectorAll('.product-media');
  for (let i = 0; i < CATALOG.length; i++) {
    const p = CATALOG[i];
    const s = mergeState(stateFromTemplate(p.tpl), { product: p.key });
    if (p.key === 'short') s.pattern = 'laterales';
    if (p.key === 'chomba') s.collar = 'polo';
    const back = await renderThumbnail(s, { w: 520, h: 460, angle: Math.PI - 0.35 });
    const front = await renderThumbnail(s, { w: 520, h: 460, angle: 0.35 });
    setImg(pm[i], back, 'back'); setImg(pm[i], front, 'front');
  }
}
setTimeout(() => renderThumbs().catch((e) => console.warn(e)), 500);
