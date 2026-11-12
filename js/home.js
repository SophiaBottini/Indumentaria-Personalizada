import { CONFIG, applyConfig } from './config.js';
import { GarmentViewer, PRODUCTS, renderThumbnail } from './garment.js';
import { TEMPLATES, PALETTES, stateFromTemplate, mergeState } from './templates.js';

applyConfig();

/* Header con fondo al hacer scroll */
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* Animaciones de aparición */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------------- Hero 3D ---------------- */
const HERO_ITEMS = [
  { key: 'camiseta', label: 'Camiseta', tpl: 'clasica' },
  { key: 'buzo', label: 'Buzo', tpl: 'egresados' },
  { key: 'short', label: 'Short', tpl: 'clasica' },
  { key: 'chomba', label: 'Chomba', tpl: 'corporativa' },
  { key: 'musculosa', label: 'Musculosa', tpl: 'basquet' },
];
const HERO_COMBOS = [
  ['#0b3d91', '#f5f5f5', '#f2c230'],
  ['#c1121f', '#141414', '#ffffff'],
  ['#0a1a3a', '#1fb6ff', '#c6ff3d'],
  ['#1b5e20', '#ffffff', '#f2c230'],
  ['#5a189a', '#ff9e00', '#ffffff'],
];

const stageEl = document.getElementById('heroStage');
let viewer, heroState, heroItem = 0, heroCombo = 0, userTouched = false;

function heroStateFor(i, combo) {
  const it = HERO_ITEMS[i];
  const s = stateFromTemplate(it.tpl);
  s.product = it.key;
  if (it.key === 'short') s.pattern = 'laterales';
  if (combo != null) {
    const [p, sec, acc] = HERO_COMBOS[combo];
    s.colors = { ...s.colors, primary: p, secondary: sec, accent: acc, sleeves: p, text: it.key === 'buzo' || it.key === 'chomba' ? sec === p ? acc : sec : acc, trim: it.key === 'chomba' || it.key === 'buzo' ? acc : sec };
    if (it.key === 'buzo') s.colors.text = '#ffffff';
  }
  return s;
}

const chips = document.getElementById('heroChips');
HERO_ITEMS.forEach((it, i) => {
  const b = document.createElement('button');
  b.className = 'chip' + (i === 0 ? ' active' : '');
  b.textContent = it.label; b.setAttribute('role', 'tab');
  b.onclick = () => { userTouched = true; selectHero(i, heroCombo); };
  chips.appendChild(b);
});
const sw = document.getElementById('heroSwatches');
HERO_COMBOS.forEach((c, i) => {
  const b = document.createElement('button');
  b.style.setProperty('--c1', c[0]); b.style.setProperty('--c2', c[1]);
  b.setAttribute('aria-label', 'Combinación de colores ' + (i + 1));
  if (i === 0) b.classList.add('active');
  b.onclick = () => { userTouched = true; selectHero(heroItem, i); };
  sw.appendChild(b);
});

async function selectHero(i, combo) {
  heroItem = i; heroCombo = combo;
  [...chips.children].forEach((c, k) => c.classList.toggle('active', k === i));
  [...sw.children].forEach((c, k) => c.classList.toggle('active', k === combo));
  heroState = heroStateFor(i, combo);
  await viewer.setState(heroState);
}

try {
  viewer = new GarmentViewer(stageEl, { autoRotate: true, zoom: false });
  viewer.camera.position.set(2.2, 0.4, 7.6);
  selectHero(0, 0);
  // Cambia de combinación sola hasta que el usuario interactúe
  setInterval(() => {
    if (userTouched || document.hidden) return;
    selectHero(heroItem, (heroCombo + 1) % HERO_COMBOS.length);
  }, 4200);
  stageEl.addEventListener('pointerdown', () => { userTouched = true; });
} catch (e) {
  console.warn('WebGL no disponible', e);
  stageEl.innerHTML = '<p style="display:grid;place-items:center;height:100%;color:#9aa3b2">Tu navegador no soporta 3D.</p>';
}

/* ---------------- Miniaturas renderizadas en 3D ---------------- */
const productGrid = document.getElementById('productGrid');
const PRODUCT_LOOKS = {
  camiseta: 'clasica', mangalarga: 'degrade', musculosa: 'basquet', chomba: 'corporativa', buzo: 'egresados', short: 'clasica',
};
for (const [key, p] of Object.entries(PRODUCTS)) {
  const card = document.createElement('article');
  card.className = 'product reveal';
  card.innerHTML = `
    <div class="product-media"><div class="skeleton"></div><span class="badge3d">3D</span></div>
    <div class="product-body">
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div class="product-tags">${p.tags.map((t) => `<span>${t}</span>`).join('')}</div>
      <a class="btn btn-ghost btn-sm" href="personalizar.html?producto=${key}&plantilla=${PRODUCT_LOOKS[key]}">Personalizar →</a>
    </div>`;
  productGrid.appendChild(card);
  io.observe(card);
}

const templateGrid = document.getElementById('templateGrid');
for (const t of TEMPLATES) {
  const a = document.createElement('a');
  a.className = 'tpl reveal';
  a.href = `personalizar.html?plantilla=${t.id}`;
  a.innerHTML = `<div class="tpl-img"><div class="skeleton"></div></div><div class="tpl-info"><strong>${t.name}</strong><span>${t.sector}</span></div>`;
  templateGrid.appendChild(a);
  io.observe(a);
}

function setImg(container, url, cls = '') {
  const sk = container.querySelector('.skeleton'); if (sk) sk.remove();
  const img = new Image(); img.src = url; img.alt = ''; if (cls) img.className = cls;
  container.prepend(img);
}

async function renderAllThumbs() {
  // Sectores
  for (const el of document.querySelectorAll('[data-thumb]')) {
    const s = stateFromTemplate(el.dataset.thumb);
    setImg(el, await renderThumbnail(s, { w: 420, h: 460, angle: 0.4 }));
  }
  // Productos (frente + espalda)
  const cards = productGrid.querySelectorAll('.product-media');
  let i = 0;
  for (const key of Object.keys(PRODUCTS)) {
    const s = mergeState(stateFromTemplate(PRODUCT_LOOKS[key]), { product: key });
    if (key === 'short') s.pattern = 'laterales';
    if (key === 'mangalarga') s.text.front = 'RUNNING CLUB';
    const media = cards[i++];
    const back = await renderThumbnail(s, { w: 440, h: 460, angle: Math.PI - 0.35 });
    const front = await renderThumbnail(s, { w: 440, h: 460, angle: 0.35 });
    setImg(media, back, 'back'); setImg(media, front, 'front');
  }
  // Plantillas
  const tiles = templateGrid.querySelectorAll('.tpl-img');
  for (let k = 0; k < TEMPLATES.length; k++) {
    setImg(tiles[k], await renderThumbnail(stateFromTemplate(TEMPLATES[k].id), { w: 320, h: 320, angle: 0.3 }));
  }
}
// Esperar al primer render del hero para no competir
setTimeout(() => renderAllThumbs().catch((e) => console.warn(e)), 400);
