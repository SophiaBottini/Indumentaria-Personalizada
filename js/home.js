import { CONFIG, applyConfig } from './config.js';
import { GarmentViewer, PATTERNS, DEFAULT_STATE, renderThumbnail } from './garment.js';
import { PALETTES, stateFromTemplate, mergeState } from './templates.js';

applyConfig();
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const waText = $('#waText'); if (waText) waText.textContent = '+' + CONFIG.whatsapp;
const waLink = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

/* ---------------- Hero: dos líneas ---------------- */
const slides = $$('.hero-slide'), dots = $$('#heroDots button');
let cur = 0, auto = true, heroViewer = null;
function go(i) {
  cur = (i + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle('active', k === cur));
  dots.forEach((d, k) => d.classList.toggle('active', k === cur));
  $('.hero2').classList.toggle('dark-on', cur === 1);
  if (cur === 1 && !heroViewer) startHero3D();
}
dots.forEach((d, k) => d.onclick = () => { auto = false; go(k); });
$('#heroPrev').onclick = () => { auto = false; go(cur - 1); };
$('#heroNext').onclick = () => { auto = false; go(cur + 1); };
setInterval(() => { if (auto && !document.hidden) go(cur + 1); }, 6500);
function startHero3D() {
  try {
    heroViewer = new GarmentViewer($('#heroStage'), { autoRotate: true, zoom: false });
    heroViewer.camera.position.set(2.2, 0.4, 8.2);
    const s = stateFromTemplate('futbol'); s.text.front = 'PACINO';
    heroViewer.setState(s);
    $('#heroStage').addEventListener('pointerdown', () => { auto = false; });
  } catch (e) { console.warn('3D no disponible', e); }
}

/* ---------------- Línea laboral ---------------- */
const LABORAL = [
  { img: 'trabajo-carniceria.jpg', cat: 'Carnicerías · Alimentos', name: 'Chomba con logo', text: 'Chomba de piqué con tu logo bordado en el pecho. Combina con pantalón cargo y gorra.', logo: 'Bordado', uso: 'Atención al público', prenda: 'Chomba', d3: 'personalizar.html?producto=chomba&plantilla=staff' },
  { img: 'prod-pantalon-cargo.jpg', cat: 'Talleres · Industria', name: 'Pantalón cargo', text: 'Pantalón de trabajo con bolsillos laterales y cintura reforzada, pensado para el uso diario.', logo: 'Bordado', uso: 'Trabajo intensivo', prenda: 'Pantalón cargo' },
  { img: 'prod-camisa-trabajo.jpg', cat: 'Talleres · Industria', name: 'Camisa de trabajo', text: 'Camisa de tela resistente con bolsillos frontales y logo bordado en el bolsillo.', logo: 'Bordado', uso: 'Industria y logística', prenda: 'Camisa' },
  { img: 'prod-camisa.jpg', cat: 'Comercios · Empresas', name: 'Camisa manga corta', text: 'Camisa de vestir de corte clásico, con tu logo bordado en el pecho.', logo: 'Bordado', uso: 'Oficina y mostrador', prenda: 'Camisa' },
  { img: 'prod-remera.jpg', cat: 'Comercios · Empresas', name: 'Remera con logo', text: 'Remera de algodón peinado con logo en el frente y diseño completo en la espalda.', logo: 'Estampado o bordado', uso: 'Equipos y eventos', prenda: 'Remera', d3: 'personalizar.html?producto=camiseta&plantilla=staff' },
  { img: 'prod-conjunto.jpg', cat: 'Servicios · Lavaderos', name: 'Remera + bermuda', text: 'Conjunto de remera estampada y bermuda cargo para trabajos al aire libre.', logo: 'Estampado', uso: 'Servicios', prenda: 'Bermuda' },
];
const grid = $('#laboralGrid');
LABORAL.forEach((p) => {
  const el = document.createElement('article');
  el.className = 'pcard';
  const msg = `Hola ${CONFIG.marca}! Quiero cotizar: ${p.name}. ¿Me pasan presupuesto?`;
  el.innerHTML = `
    <div class="pcard-media"><img src="assets/img/${p.img}" alt="${p.name}" loading="lazy"></div>
    <span class="mono">${p.cat}</span>
    <h3>${p.name}</h3>
    <p>${p.text}</p>
    <dl><div><dt>Logo</dt><dd>${p.logo}</dd></div><div><dt>Ideal para</dt><dd>${p.uso}</dd></div></dl>
    <div class="pc-actions">
      <a class="btn btn-wa" href="${waLink(msg)}" target="_blank" rel="noopener">Cotizar por WhatsApp →</a>
      <button class="link-mono" type="button" data-add="${p.prenda}">Sumar al presupuesto</button>
      ${p.d3 ? `<a class="link-mono" href="${p.d3}">Ver en 3D</a>` : ''}
    </div>`;
  grid.appendChild(el);
});
grid.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]'); if (!b) return;
  const cb = $(`#qPrendas input[value="${b.dataset.add}"]`); if (cb) cb.checked = true;
  $('#contacto').scrollIntoView({ behavior: 'smooth' });
});
$$('.rubro[data-rubro]').forEach((a) => a.addEventListener('click', () => {
  const sel = $('#qRubro'); const v = a.dataset.rubro;
  [...sel.options].forEach((o) => { if (o.text === v) sel.value = v; });
}));

/* ---------------- Línea deportiva ---------------- */
const SPORTS = [
  { label: 'Fútbol', tpl: 'futbol', num: '10', items: 'Camiseta · Short · Arquero' },
  { label: 'Hockey', tpl: 'hockey', num: '7', items: 'Camiseta · Pollera · Buzo' },
  { label: 'Rugby', tpl: 'rugby', num: '15', items: 'Camiseta · Short · Viaje' },
  { label: 'Básquet', tpl: 'basquet', num: '23', items: 'Musculosa · Short' },
];
const PATS = ['topo', 'halftone', 'fade', 'camo', 'pinstripe', 'shards', 'franja', 'bastones'];
let sportState = stateFromTemplate('futbol'), sportViewer = null;
const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const list = $('#sportList');
SPORTS.forEach((s, i) => {
  const b = document.createElement('button');
  b.setAttribute('role', 'tab');
  b.innerHTML = `<span>${s.label}</span><span class="mono">${s.items}</span>`;
  b.onclick = () => { sportState = stateFromTemplate(s.tpl); $('#sportNum').textContent = s.num; syncSport(); };
  list.appendChild(b);
});
function syncSport() {
  $$('#sportList button').forEach((b, i) => { const on = stateFromTemplate(SPORTS[i].tpl).product === sportState.product && SPORTS[i].num === $('#sportNum').textContent; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  const pc = $('#patternChips'); pc.innerHTML = '';
  PATS.forEach((k) => { const b = document.createElement('button'); b.className = 'chip' + (sportState.pattern === k ? ' active' : ''); b.textContent = PATTERNS[k]; b.onclick = () => { sportState.pattern = k; syncSport(); }; pc.appendChild(b); });
  const pl = $('#paletteList'); pl.innerHTML = '';
  PALETTES.forEach(([a, b2, c]) => {
    const b = document.createElement('button');
    b.style.setProperty('--a', a); b.style.setProperty('--b', b2); b.style.setProperty('--c', c);
    b.setAttribute('aria-label', `Colores ${a}, ${b2} y ${c}`);
    if (sportState.colors.primary === a && sportState.colors.secondary === b2) b.classList.add('active');
    b.onclick = () => { const text = lum(a) > 0.6 ? (lum(c) < 0.5 ? c : '#1c1e1b') : (lum(c) > 0.5 ? c : '#f4f1ea'); sportState.colors = { ...sportState.colors, primary: a, secondary: b2, accent: c, sleeves: a, trim: c, text }; syncSport(); };
    pl.appendChild(b);
  });
  const share = { ...sportState }; delete share.logo;
  $('#sportGo').href = `personalizar.html#d=${btoa(unescape(encodeURIComponent(JSON.stringify(share))))}`;
  if (sportViewer) sportViewer.setState(sportState, { pop: false });
}
syncSport();
new IntersectionObserver(([e], obs) => {
  if (!e.isIntersecting) return; obs.disconnect();
  try { sportViewer = new GarmentViewer($('#sportStage'), { autoRotate: true, zoom: false }); sportViewer.setState(sportState); }
  catch (err) { console.warn(err); }
}, { rootMargin: '300px' }).observe($('#sportStage'));

/* Miniatura 3D en la tarjeta de clubes */
setTimeout(async () => {
  try {
    const url = await renderThumbnail(stateFromTemplate('futbol'), { w: 420, h: 460, angle: 0.4 });
    const img = new Image(); img.src = url; img.alt = ''; $('#rubroSport').appendChild(img);
  } catch (e) { console.warn(e); }
}, 300);

/* ---------------- Presupuesto rápido ---------------- */
const form = $('#quickQuote');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  const prendas = $$('#qPrendas input:checked').map((i) => i.value);
  const err = $('#qErr'), miss = [];
  if (!d.nombre?.trim()) miss.push('tu nombre');
  if (!d.negocio?.trim()) miss.push('el negocio o club');
  if (miss.length) { err.hidden = false; err.textContent = 'Falta completar ' + miss.join(' y ') + '.'; return; }
  err.hidden = true;
  const msg = [
    `*Pedido de presupuesto — ${CONFIG.marca}*`, '',
    `Nombre: ${d.nombre}`, `Negocio / club: ${d.negocio}`, `Rubro: ${d.rubro}`,
    `Prendas: ${prendas.length ? prendas.join(', ') : 'a definir'}`,
    `Cantidad aproximada: ${d.cantidad || 'a definir'}`, `Personalización: ${d.logo}`,
    d.comentarios ? `Comentarios: ${d.comentarios}` : '',
  ].filter((l) => l !== '').join('\n');
  $('#qText').value = msg; $('#qOut').hidden = false;
  window.open(waLink(msg), '_blank', 'noopener');
});
$('#qCopy').onclick = async () => {
  const t = $('#qText');
  try { await navigator.clipboard.writeText(t.value); $('#qCopy').textContent = 'Copiado ✓'; }
  catch { t.select(); }
};
