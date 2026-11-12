/* =========================================================================
   Personalizador 3D — dashboard del cliente
   ========================================================================= */
import { CONFIG, applyConfig } from './config.js';
import {
  GarmentViewer, PRODUCTS, PATTERNS, FONTS, FABRICS, DEFAULT_STATE,
  cloneState, renderThumbnail, paintPattern,
} from './garment.js';
import { TEMPLATES, PALETTES, SWATCHES, SECTOR_PRESETS, stateFromTemplate, mergeState } from './templates.js';

applyConfig();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------------------- Persistencia ---------------------------- */
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('No hay espacio para guardar más. Eliminá algún diseño.'); return false; }
  },
};
const K_CURRENT = 'ip_actual', K_SAVED = 'ip_disenos', K_CART = 'ip_solicitud', K_FORM = 'ip_datos';

/* ------------------------------- Estado ------------------------------- */
const ADULT = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const KIDS = ['4', '6', '8', '10', '12', '14', '16'];
const COLOR_ZONES = [
  { key: 'primary', label: 'Color principal' },
  { key: 'secondary', label: 'Color secundario' },
  { key: 'accent', label: 'Detalles / vivos' },
  { key: 'sleeves', label: 'Mangas', sleeves: true },
  { key: 'trim', label: 'Cuello y puños' },
  { key: 'text', label: 'Textos y números' },
];
const LOGO_POS = { izq: 'Pecho izq.', centro: 'Centro', der: 'Pecho der.' };
const COLLARS = { redondo: 'Redondo', v: 'En V', polo: 'Polo' };

let state = initialState();
let meta = { name: 'Mi diseño', sizes: {}, notes: '', technique: 'Asesórenme' };
let undoStack = [], future = [];
let activeZone = 'primary';
let sizeTab = 'adulto';

function initialState() {
  const q = new URLSearchParams(location.search);
  if (location.hash.startsWith('#d=')) {
    try {
      const json = decodeURIComponent(escape(atob(location.hash.slice(3))));
      return mergeState(DEFAULT_STATE, JSON.parse(json));
    } catch (e) { console.warn('Link de diseño inválido'); }
  }
  if (q.get('sector') && SECTOR_PRESETS[q.get('sector')]) return stateFromTemplate(SECTOR_PRESETS[q.get('sector')]);
  if (q.get('plantilla') || q.get('producto')) {
    let s = q.get('plantilla') ? stateFromTemplate(q.get('plantilla')) : cloneState(DEFAULT_STATE);
    const p = q.get('producto');
    if (p && PRODUCTS[p]) {
      s.product = p;
      if (p === 'chomba') s.collar = 'polo';
      else if (s.collar === 'polo') s.collar = 'redondo';
      if (p === 'short' && !['mitades', 'degrade', 'lisa'].includes(s.pattern)) s.pattern = 'laterales';
    }
    return s;
  }
  const saved = store.get(K_CURRENT, null);
  if (saved && saved.state) { meta = { ...meta, ...saved.meta }; return mergeState(DEFAULT_STATE, saved.state); }
  return cloneState(DEFAULT_STATE);
}

/* ------------------------------- Visor -------------------------------- */
const viewer = new GarmentViewer($('#viewerCanvas'), { autoRotate: false });
let renderTimer = null, lastProduct = null;

function commit(mutator, { record = true, debounce = 0 } = {}) {
  if (record) { undoStack.push(JSON.stringify(state)); if (undoStack.length > 60) undoStack.shift(); future = []; }
  mutator(state);
  scheduleRender(debounce);
  syncUI();
  persist();
}

function scheduleRender(delay = 0) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(async () => {
    const pop = lastProduct !== state.product;
    lastProduct = state.product;
    await viewer.setState(state, { pop });
    $('#loading').classList.add('hide');
  }, delay);
}

function persist() {
  const st = cloneState(state);
  store.set(K_CURRENT, { state: st, meta });
}

/* ------------------------------- Rail --------------------------------- */
const SECTIONS = [
  { key: 'prenda', label: 'Prenda', icon: '<path d="M20.4 6.6L16 4l-1.5 1.3a4 4 0 0 1-5 0L8 4 3.6 6.6a1 1 0 0 0-.4 1.3l1.6 3.2a1 1 0 0 0 1.3.5L7 11v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-9l.9.6a1 1 0 0 0 1.3-.5l1.6-3.2a1 1 0 0 0-.4-1.3z"/>' },
  { key: 'diseno', label: 'Diseño', icon: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/>' },
  { key: 'colores', label: 'Colores', icon: '<circle cx="13.5" cy="6.5" r="2"/><circle cx="17.5" cy="10.5" r="2"/><circle cx="8.5" cy="7.5" r="2"/><circle cx="6.5" cy="12.5" r="2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z"/>' },
  { key: 'textos', label: 'Textos', icon: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>' },
  { key: 'logo', label: 'Logo', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
];
const rail = $('#rail');
SECTIONS.forEach((s, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg>${s.label}`;
  b.dataset.sec = s.key;
  b.onclick = () => showSection(s.key);
  rail.appendChild(b);
});
function showSection(k, scroll = true) {
  $$('#rail button').forEach((b) => b.classList.toggle('active', b.dataset.sec === k));
  $$('.panel-section').forEach((s) => s.classList.toggle('active', s.dataset.sec === k));
  if (scroll && window.innerWidth <= 1100) $('#panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* --------------------------- Panel: Prenda ---------------------------- */
const productOpts = $('#productOpts');
for (const [k, p] of Object.entries(PRODUCTS)) {
  const b = document.createElement('button');
  b.className = 'opt'; b.dataset.k = k;
  b.innerHTML = `<img alt="" data-prod-thumb="${k}"><span>${p.short}</span>`;
  b.onclick = () => commit((s) => {
    s.product = k;
    if (k === 'chomba') { s.collar = 'polo'; if (s.fabric === 'dryfit') s.fabric = 'pique'; }
    else if (s.collar === 'polo') s.collar = 'redondo';
    if (k === 'buzo' && s.fabric !== 'frisa') s.fabric = 'frisa';
  });
  productOpts.appendChild(b);
}
const collarSeg = $('#collarSeg');
for (const [k, l] of Object.entries(COLLARS)) {
  const b = document.createElement('button'); b.textContent = l; b.dataset.k = k;
  b.onclick = () => commit((s) => { s.collar = k; });
  collarSeg.appendChild(b);
}
const fabricOpts = $('#fabricOpts');
const FAB_DESC = { dryfit: 'Liviana y respirable', micropanal: 'Máxima ventilación', algodon: 'Suave, uso diario', frisa: 'Abrigo para buzos', pique: 'Chombas prolijas' };
for (const [k, f] of Object.entries(FABRICS)) {
  const b = document.createElement('button'); b.className = 'opt'; b.dataset.k = k;
  b.style.alignItems = 'flex-start'; b.style.textAlign = 'left';
  b.innerHTML = `<span style="color:var(--text)">${f.label}</span><small style="font-weight:500">${FAB_DESC[k]}</small>`;
  b.onclick = () => commit((s) => { s.fabric = k; });
  fabricOpts.appendChild(b);
}

/* --------------------------- Panel: Diseño ---------------------------- */
const patternOpts = $('#patternOpts');
for (const [k, l] of Object.entries(PATTERNS)) {
  const b = document.createElement('button'); b.className = 'opt'; b.dataset.k = k;
  const c = document.createElement('canvas'); c.width = 300; c.height = 230; c.className = 'pat';
  b.appendChild(c);
  b.insertAdjacentHTML('beforeend', `<span>${l}</span>`);
  b.onclick = () => commit((s) => { s.pattern = k; });
  patternOpts.appendChild(b);
}
function drawPatternPreviews() {
  $$('#patternOpts .opt').forEach((b) => {
    const c = b.querySelector('canvas'); const ctx = c.getContext('2d');
    // pintar el frente del patrón: un recorte centrado en el frente
    const W = 1200, H = 700;
    const off = drawPatternPreviews.buf || (drawPatternPreviews.buf = document.createElement('canvas'));
    off.width = W; off.height = H;
    paintPattern(off.getContext('2d'), W, H, { ...state, pattern: b.dataset.k });
    ctx.drawImage(off, W * 0.32, H * 0.08, W * 0.36, H * 0.84, 0, 0, c.width, c.height);
  });
}
const templateOpts = $('#templateOpts');
for (const t of TEMPLATES) {
  const b = document.createElement('button'); b.className = 'opt'; b.dataset.k = t.id;
  b.innerHTML = `<img alt="" data-tpl-thumb="${t.id}"><span>${t.name}</span>`;
  b.onclick = () => commit((s) => {
    const n = stateFromTemplate(t.id);
    // conservar textos y logo del usuario salvo en plantillas que traen los suyos
    const keepText = !t.state.text;
    Object.assign(s, n, { logo: s.logo, logoPos: s.logoPos, logoSize: s.logoSize });
    if (keepText) s.text = { ...n.text, ...currentTextBackup };
  });
  templateOpts.appendChild(b);
}
let currentTextBackup = {};

/* --------------------------- Panel: Colores --------------------------- */
const colorRows = $('#colorRows');
for (const z of COLOR_ZONES) {
  const row = document.createElement('div'); row.className = 'color-row'; row.dataset.k = z.key;
  row.innerHTML = `
    <label for="c_${z.key}">${z.label}</label>
    <div class="cr-right">
      ${z.sleeves ? '<label class="switch" title="Igual al principal"><input type="checkbox" id="sleevesMatch"><span></span></label>' : ''}
      <code></code>
      <input type="color" class="color-input" id="c_${z.key}">
    </div>`;
  row.addEventListener('click', (e) => { if (e.target.closest('.switch')) return; activeZone = z.key; syncUI(); });
  const inp = row.querySelector('input[type=color]');
  inp.addEventListener('focus', () => { activeZone = z.key; syncUI(); });
  let first = true;
  inp.addEventListener('input', () => commit((s) => { s.colors[z.key] = inp.value; if (z.key === 'sleeves') s.sleevesMatch = false; }, { record: first, debounce: 40 }) || (first = false));
  inp.addEventListener('change', () => { first = true; });
  colorRows.appendChild(row);
}
$('#sleevesMatch').addEventListener('change', (e) => commit((s) => { s.sleevesMatch = e.target.checked; if (!e.target.checked) s.colors.sleeves = s.colors.secondary; }));
const swatchesEl = $('#swatches');
for (const c of SWATCHES) {
  const b = document.createElement('button'); b.style.background = c; b.title = c; b.setAttribute('aria-label', 'Color ' + c);
  b.onclick = () => commit((s) => { s.colors[activeZone] = c; if (activeZone === 'sleeves') s.sleevesMatch = false; });
  swatchesEl.appendChild(b);
}
const palettesEl = $('#palettes');
for (const [a, b2, c] of PALETTES) {
  const b = document.createElement('button');
  b.style.setProperty('--a', a); b.style.setProperty('--b', b2); b.style.setProperty('--c', c);
  b.setAttribute('aria-label', `Paleta ${a} ${b2} ${c}`);
  b.onclick = () => commit((s) => {
    s.colors.primary = a; s.colors.secondary = b2; s.colors.accent = c;
    s.colors.sleeves = a; s.colors.trim = b2;
    s.colors.text = s.pattern === 'lisa' ? b2 : c;
  });
  palettesEl.appendChild(b);
}

/* --------------------------- Panel: Textos ---------------------------- */
const tFront = $('#tFront'), tName = $('#tName'), tNumber = $('#tNumber');
const bindText = (el, key, transform = (v) => v) => {
  let first = true;
  el.addEventListener('input', () => { commit((s) => { s.text[key] = transform(el.value); }, { record: first, debounce: 120 }); first = false; });
  el.addEventListener('change', () => { first = true; });
};
bindText(tFront, 'front'); bindText(tName, 'name');
bindText(tNumber, 'number', (v) => v.replace(/\D/g, '').slice(0, 3));
$('#tFrontNumber').addEventListener('change', (e) => commit((s) => { s.text.frontNumber = e.target.checked; }));
$('#tOutline').addEventListener('change', (e) => commit((s) => { s.text.outline = e.target.checked; }));
const fontOpts = $('#fontOpts');
for (const [k, f] of Object.entries(FONTS)) {
  const b = document.createElement('button'); b.className = 'opt'; b.dataset.k = k;
  b.innerHTML = `<span style="font-family:'${f.family}';font-weight:${f.weight};font-size:22px;color:var(--text);line-height:1">10 ABC</span><small>${f.label}</small>`;
  b.onclick = () => commit((s) => { s.text.font = k; });
  fontOpts.appendChild(b);
}

/* ---------------------------- Panel: Logo ----------------------------- */
const logoFile = $('#logoFile'), logoDrop = $('#logoDrop');
logoDrop.onclick = () => logoFile.click();
logoDrop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); logoFile.click(); } };
logoDrop.addEventListener('dragover', (e) => { e.preventDefault(); logoDrop.classList.add('over'); });
logoDrop.addEventListener('dragleave', () => logoDrop.classList.remove('over'));
logoDrop.addEventListener('drop', (e) => { e.preventDefault(); logoDrop.classList.remove('over'); if (e.dataTransfer.files[0]) loadLogo(e.dataTransfer.files[0]); });
logoFile.onchange = () => { if (logoFile.files[0]) loadLogo(logoFile.files[0]); logoFile.value = ''; };

function loadLogo(file) {
  if (!/^image\//.test(file.type)) return toast('El archivo debe ser una imagen.');
  if (file.size > 8 * 1024 * 1024) return toast('La imagen supera los 8 MB.');
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Reducir a máx. 600px para que entre en el almacenamiento local
      const max = 600, r = Math.min(1, max / Math.max(img.width || max, img.height || max));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((img.width || max) * r)); c.height = Math.max(1, Math.round((img.height || max) * r));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/png');
      commit((s) => { s.logo = url; });
      toast('Logo aplicado ✓');
    };
    img.onerror = () => toast('No pudimos leer la imagen.');
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
$('#logoRemove').onclick = () => commit((s) => { s.logo = null; });
const logoPosSeg = $('#logoPosSeg');
for (const [k, l] of Object.entries(LOGO_POS)) {
  const b = document.createElement('button'); b.textContent = l; b.dataset.k = k;
  b.onclick = () => commit((s) => { s.logoPos = k; });
  logoPosSeg.appendChild(b);
}
let logoFirst = true;
$('#logoSize').addEventListener('input', (e) => { commit((s) => { s.logoSize = +e.target.value; }, { record: logoFirst, debounce: 60 }); logoFirst = false; });
$('#logoSize').addEventListener('change', () => { logoFirst = true; });

/* --------------------------- Talles / resumen ------------------------- */
const sizesEl = $('#sizes');
function renderSizes() {
  const list = sizeTab === 'adulto' ? ADULT : KIDS;
  sizesEl.innerHTML = list.map((t) => `
    <div class="size"><label for="sz_${t}">${t}</label>
    <input id="sz_${t}" type="number" min="0" max="9999" inputmode="numeric" value="${meta.sizes[t] || ''}" placeholder="0" data-size="${t}"></div>`).join('');
  $$('input', sizesEl).forEach((inp) => inp.addEventListener('input', () => {
    const v = Math.max(0, Math.min(9999, parseInt(inp.value, 10) || 0));
    if (v) meta.sizes[inp.dataset.size] = v; else delete meta.sizes[inp.dataset.size];
    updateTotal(); persist();
  }));
}
$$('#sizeSeg button').forEach((b) => b.onclick = () => {
  sizeTab = b.dataset.k; $$('#sizeSeg button').forEach((x) => x.classList.toggle('active', x === b)); renderSizes();
});
const totalOf = (sizes) => Object.values(sizes || {}).reduce((a, b) => a + (+b || 0), 0);
function updateTotal() { $('#totalUnits').textContent = totalOf(meta.sizes); }
$('#itemNotes').addEventListener('input', (e) => { meta.notes = e.target.value; persist(); });
$('#technique').addEventListener('change', (e) => { meta.technique = e.target.value; persist(); });
$('#designName').addEventListener('input', (e) => { meta.name = e.target.value || 'Mi diseño'; persist(); });

function specRows(s, m = meta) {
  const P = PRODUCTS[s.product];
  const dots = (arr) => `<span class="dots">${arr.map((c) => `<i style="background:${c}"></i>`).join('')}</span>`;
  const rows = [
    ['Prenda', P.name],
    ['Diseño', PATTERNS[s.pattern]],
    ['Colores', dots([s.colors.primary, s.colors.secondary, s.colors.accent])],
    ['Tela', FABRICS[s.fabric]?.label || '-'],
  ];
  if (P.type !== 'short' && !P.hood) rows.push(['Cuello', COLLARS[s.collar]]);
  rows.push(['Texto frente', s.text.front || '—']);
  rows.push(['Nombre / Nº', `${s.text.name || '—'} · ${s.text.number || '—'}`]);
  rows.push(['Logo', s.logo ? LOGO_POS[s.logoPos] : 'Sin logo']);
  return rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v.startsWith && v.startsWith('<span') ? v : esc(v)}</dd></div>`).join('');
}

/* ----------------------------- Sync UI -------------------------------- */
function syncUI() {
  const s = state, P = PRODUCTS[s.product];
  $$('#productOpts .opt').forEach((b) => b.classList.toggle('active', b.dataset.k === s.product));
  $$('#collarSeg button').forEach((b) => b.classList.toggle('active', b.dataset.k === s.collar));
  $('#collarGroup').hidden = P.type === 'short' || !!P.hood;
  $$('#fabricOpts .opt').forEach((b) => b.classList.toggle('active', b.dataset.k === s.fabric));
  $$('#patternOpts .opt').forEach((b) => b.classList.toggle('active', b.dataset.k === s.pattern));
  $$('#fontOpts .opt').forEach((b) => b.classList.toggle('active', b.dataset.k === s.text.font));
  $$('#logoPosSeg button').forEach((b) => b.classList.toggle('active', b.dataset.k === s.logoPos));
  for (const z of COLOR_ZONES) {
    const row = colorRows.querySelector(`[data-k="${z.key}"]`);
    const val = z.key === 'sleeves' && s.sleevesMatch ? s.colors.primary : s.colors[z.key];
    row.querySelector('input[type=color]').value = val;
    row.querySelector('code').textContent = z.key === 'sleeves' && s.sleevesMatch ? 'igual' : val;
    row.classList.toggle('active', activeZone === z.key);
    if (z.sleeves) row.hidden = P.sleeves === 'none' || P.type === 'short';
  }
  $('#sleevesMatch').checked = !!s.sleevesMatch;
  if (document.activeElement !== tFront) tFront.value = s.text.front || '';
  if (document.activeElement !== tName) tName.value = s.text.name || '';
  if (document.activeElement !== tNumber) tNumber.value = s.text.number || '';
  currentTextBackup = { front: s.text.front, name: s.text.name, number: s.text.number };
  $('#tFrontNumber').checked = !!s.text.frontNumber;
  $('#tOutline').checked = !!s.text.outline;
  $('#logoControls').hidden = !s.logo;
  if (s.logo) $('#logoImg').src = s.logo;
  $('#logoSize').value = s.logoSize || 1;
  $('#logoSizeVal').textContent = Math.round((s.logoSize || 1) * 100) + '%';
  $('#vtProduct').textContent = P.name;
  $('#vtPattern').textContent = `${PATTERNS[s.pattern]} · ${FABRICS[s.fabric]?.label || ''}`;
  $('#spec').innerHTML = specRows(s);
  $('#undoBtn').disabled = !undoStack.length; $('#redoBtn').disabled = !future.length;
  $('#undoBtn').style.opacity = undoStack.length ? 1 : 0.4; $('#redoBtn').style.opacity = future.length ? 1 : 0.4;
  drawPatternPreviews();
}

function syncMeta() {
  $('#designName').value = meta.name;
  $('#itemNotes').value = meta.notes || '';
  $('#technique').value = meta.technique || 'Asesórenme';
  renderSizes(); updateTotal();
}

/* -------------------------- Herramientas visor ------------------------ */
$$('#viewBtns button').forEach((b) => b.onclick = () => {
  const v = b.dataset.view;
  if (v === 'rotar') {
    const on = !b.classList.contains('active');
    $$('#viewBtns button').forEach((x) => x.classList.remove('active'));
    b.classList.toggle('active', on);
    viewer.setAutoRotate(on);
    return;
  }
  $$('#viewBtns button').forEach((x) => x.classList.toggle('active', x === b));
  viewer.setView(v);
});
$('#zoomIn').onclick = () => viewer.zoom(0.85);
$('#zoomOut').onclick = () => viewer.zoom(1.18);
$('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
function undo() { if (!undoStack.length) return; future.push(JSON.stringify(state)); state = JSON.parse(undoStack.pop()); scheduleRender(); syncUI(); persist(); }
function redo() { if (!future.length) return; undoStack.push(JSON.stringify(state)); state = JSON.parse(future.pop()); scheduleRender(); syncUI(); persist(); }
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.target.matches('input, textarea')) return;
  if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
});
let resetArmed = false;
$('#resetBtn').onclick = () => {
  if (!resetArmed) { resetArmed = true; toast('Tocá de nuevo para empezar de cero'); setTimeout(() => (resetArmed = false), 2500); return; }
  resetArmed = false;
  commit((s) => Object.assign(s, cloneState(DEFAULT_STATE)));
  meta = { name: 'Mi diseño', sizes: {}, notes: '', technique: 'Asesórenme' }; syncMeta(); persist();
};
$('#shareBtn').onclick = async () => {
  const url = shareLink(state);
  try { await navigator.clipboard.writeText(url); toast(state.logo ? 'Link copiado (el logo no viaja en el link)' : 'Link del diseño copiado ✓'); }
  catch { prompt('Copiá este link:', url); }
};
function shareLink(s) {
  const st = cloneState(s); delete st.logo;
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(st))));
  return `${location.origin}${location.pathname}#d=${b64}`;
}
$('#snapBtn').onclick = async () => {
  toast('Generando ficha…');
  const url = await makeSheet(state, meta);
  download(url, `${slug(meta.name)}-ficha.png`);
};

function slug(t) { return (t || 'diseno').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, ''); }
function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

/* Ficha técnica (PNG) con frente, espalda y especificaciones */
async function makeSheet(s, m) {
  const [front, back] = await Promise.all([
    renderThumbnail(s, { w: 700, h: 760, angle: 0.25 }),
    renderThumbnail(s, { w: 700, h: 760, angle: Math.PI - 0.25 }),
  ].map((p) => p));
  const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  const [fi, bi] = await Promise.all([load(front), load(back)]);
  const c = document.createElement('canvas'); c.width = 2000; c.height = 1200;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(700, 600, 100, 700, 600, 900); g.addColorStop(0, '#f1ece3'); g.addColorStop(1, '#d7cebe');
  x.fillStyle = g; x.fillRect(0, 0, 2000, 1200);
  x.drawImage(fi, 40, 160, 640, 695); x.drawImage(bi, 700, 160, 640, 695);
  x.fillStyle = '#4b4e36'; x.font = '600 26px Montserrat, sans-serif'; x.fillText((CONFIG.marca + '  ·  SPORT').toUpperCase().split('').join(String.fromCharCode(8202)), 60, 80);
  x.fillStyle = '#1c1e1b'; x.font = '800 64px Montserrat, sans-serif'; x.fillText((m.name || 'Mi diseño').toUpperCase(), 60, 150);
  x.fillStyle = '#5e5a50'; x.font = '600 22px Montserrat'; x.fillText('FRENTE', 320, 900); x.fillText('ESPALDA', 975, 900);
  // panel de specs
  x.fillStyle = '#f4f1ea'; x.fillRect(1400, 0, 600, 1200);
  let y = 110;
  const line = (k, v) => { x.fillStyle = '#5e5a50'; x.font = '600 20px Montserrat'; x.fillText(k, 1450, y); x.fillStyle = '#1c1e1b'; x.font = '700 27px Montserrat'; x.fillText(String(v).slice(0, 30), 1450, y + 36); y += 92; };
  const P = PRODUCTS[s.product];
  line('PRENDA', P.name); line('DISEÑO', PATTERNS[s.pattern]); line('TELA / TÉCNICA', `${FABRICS[s.fabric]?.label} · ${m.technique}`);
  if (P.type !== 'short' && !P.hood) line('CUELLO', COLLARS[s.collar]);
  line('TEXTOS', `${s.text.front || '—'} / ${s.text.name || '—'} ${s.text.number || ''}`);
  line('TIPOGRAFÍA', FONTS[s.text.font]?.label);
  // colores
  x.fillStyle = '#5e5a50'; x.font = '600 20px Montserrat'; x.fillText('COLORES', 1450, y);
  const cols = [s.colors.primary, s.colors.secondary, s.colors.accent, s.colors.trim, s.colors.text];
  cols.forEach((col, i) => { x.fillStyle = col; x.fillRect(1450 + i * 100, y + 18, 80, 56); x.strokeStyle = '#cbc2b2'; x.strokeRect(1450 + i * 100, y + 18, 80, 56); x.fillStyle = '#5e5a50'; x.font = '500 15px Montserrat'; x.fillText(col.toUpperCase(), 1450 + i * 100, y + 96); });
  y += 140;
  const tot = totalOf(m.sizes);
  if (tot) { line('CANTIDADES', `${tot} prendas`); x.fillStyle = '#5e5a50'; x.font = '500 20px Montserrat'; x.fillText(Object.entries(m.sizes).map(([k, v]) => `${k}×${v}`).join('  ').slice(0, 44), 1450, y - 20); }
  x.fillStyle = '#5e5a50'; x.font = '500 18px Montserrat';
  x.fillText('Vista de referencia. El diseño final se confirma antes de producir.', 60, 1150);
  return c.toDataURL('image/png');
}

/* --------------------------- Mis diseños ------------------------------ */
$('#saveDesign').onclick = async () => {
  const saved = store.get(K_SAVED, []);
  const thumb = await smallThumb(state);
  const item = { id: Date.now().toString(36), name: meta.name, state: cloneState(state), meta: cloneState(meta), thumb, date: new Date().toISOString() };
  saved.unshift(item);
  if (store.set(K_SAVED, saved.slice(0, 24))) toast('Diseño guardado en "Mis diseños" ✓');
};

async function smallThumb(s, angle = 0.3) {
  const url = await renderThumbnail(s, { w: 300, h: 320, angle });
  // Convertir a JPEG con fondo para que pese menos
  return new Promise((res) => {
    const i = new Image(); i.onload = () => {
      const c = document.createElement('canvas'); c.width = 300; c.height = 320;
      const x = c.getContext('2d'); const g = x.createRadialGradient(150, 150, 20, 150, 160, 220);
      g.addColorStop(0, '#f1ece3'); g.addColorStop(1, '#d7cebe'); x.fillStyle = g; x.fillRect(0, 0, 300, 320);
      x.drawImage(i, 0, 0, 300, 320); res(c.toDataURL('image/jpeg', 0.82));
    }; i.src = url;
  });
}

function renderSaved() {
  const saved = store.get(K_SAVED, []);
  const body = $('#savedBody');
  if (!saved.length) {
    body.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><p>Todavía no guardaste diseños.<br>Usá "Guardar en Mis diseños" para comparar opciones.</p></div>`;
    return;
  }
  body.innerHTML = `<p class="sub" style="margin-top:0">Se guardan en este navegador. Tocá uno para abrirlo.</p><div class="saved-grid">${saved.map((d) => `
    <div class="saved"><button class="open" data-id="${d.id}"><img src="${d.thumb}" alt=""><div class="si"><strong>${esc(d.name)}</strong>${esc(PRODUCTS[d.state.product]?.short || '')} · ${new Date(d.date).toLocaleDateString('es-AR')}</div></button>
    <button class="del" data-del="${d.id}" aria-label="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>`).join('')}</div>`;
  $$('[data-id]', body).forEach((b) => b.onclick = () => {
    const d = saved.find((x) => x.id === b.dataset.id); if (!d) return;
    commit((s) => Object.assign(s, mergeState(DEFAULT_STATE, d.state)));
    meta = { ...meta, ...d.meta }; syncMeta(); persist(); closeDrawers(); toast(`Abriste "${d.name}"`);
  });
  $$('[data-del]', body).forEach((b) => b.onclick = () => {
    store.set(K_SAVED, saved.filter((x) => x.id !== b.dataset.del)); renderSaved();
  });
}

/* ------------------------- Solicitud (carrito) ------------------------ */
$('#addToCart').onclick = async () => {
  const tot = totalOf(meta.sizes);
  if (!tot) {
    toast('Cargá al menos una cantidad por talle');
    $('#sizes input')?.focus();
    return;
  }
  const btn = $('#addToCart'); btn.disabled = true;
  const [front, back] = [await smallThumb(state, 0.3), await smallThumb(state, Math.PI - 0.3)];
  const cart = store.get(K_CART, []);
  cart.push({ id: Date.now().toString(36), name: meta.name, state: cloneState(state), sizes: { ...meta.sizes }, notes: meta.notes, technique: meta.technique, thumbs: { front, back } });
  btn.disabled = false;
  if (store.set(K_CART, cart)) {
    updateCartCount();
    toast('Agregado a tu solicitud ✓');
    // dejar listo para otra prenda
    meta.sizes = {}; meta.notes = ''; syncMeta(); persist();
    openDrawer('cartDrawer');
  }
};

function updateCartCount() {
  const n = store.get(K_CART, []).length;
  const el = $('#cartCount'); el.textContent = n; el.dataset.n = n;
}

function renderCart(view = 'list') {
  const cart = store.get(K_CART, []);
  const body = $('#cartBody');
  if (view === 'sent') return;
  if (!cart.length) {
    body.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
      <p>Tu solicitud está vacía.<br>Diseñá una prenda, cargá las cantidades por talle y tocá <strong>"Agregar a mi solicitud"</strong>.</p></div>`;
    return;
  }
  const total = cart.reduce((a, i) => a + totalOf(i.sizes), 0);
  const f = store.get(K_FORM, {});
  body.innerHTML = `
    ${cart.map((i, k) => `
      <div class="cart-item">
        <img src="${i.thumbs.front}" alt="">
        <div><h4>${esc(i.name)}</h4>
          <p>${esc(PRODUCTS[i.state.product].name)} · ${esc(PATTERNS[i.state.pattern])} · ${esc(i.technique)}</p>
          <p style="margin-top:4px;color:var(--text)">${Object.entries(i.sizes).map(([t, n]) => `${t}×${n}`).join(' · ')} — <strong>${totalOf(i.sizes)} u.</strong></p></div>
        <div class="ci-actions">
          <button class="icon-btn" data-edit="${k}" title="Editar diseño" aria-label="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="icon-btn" data-rm="${k}" title="Quitar" aria-label="Quitar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>
        </div>
      </div>`).join('')}
    <div class="total-units" style="margin: 14px 0 6px"><span>Total de prendas</span><strong>${total}</strong></div>
    <button class="btn btn-outline btn-sm" id="addAnother" style="margin-bottom: 8px">+ Diseñar otra prenda</button>

    <form id="quoteForm" novalidate>
      <h3 class="form-title">¿Qué deporte?</h3>
      <div class="sector-pick">
        ${['Fútbol', 'Hockey', 'Rugby', 'Básquet', 'Otro'].map((s) => `<label><input type="radio" name="sector" value="${s}" ${f.sector === s ? 'checked' : ''} required><span>${s}</span></label>`).join('')}
      </div>
      <div class="field"><label for="fInst">Nombre del club o institución *</label><input class="input" id="fInst" name="institucion" required value="${esc(f.institucion)}"></div>
      <div class="row2">
        <div class="field"><label for="fName">Tu nombre *</label><input class="input" id="fName" name="nombre" required value="${esc(f.nombre)}" autocomplete="name"></div>
        <div class="field"><label for="fPhone">WhatsApp / Teléfono *</label><input class="input" id="fPhone" name="telefono" type="tel" required value="${esc(f.telefono)}" autocomplete="tel"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="fEmail">Email</label><input class="input" id="fEmail" name="email" type="email" value="${esc(f.email)}" autocomplete="email"></div>
        <div class="field"><label for="fCity">Localidad</label><input class="input" id="fCity" name="localidad" value="${esc(f.localidad)}"></div>
      </div>
      <div class="field"><label for="fDate">¿Para cuándo lo necesitás?</label><input class="input" id="fDate" name="fecha" type="date" value="${esc(f.fecha)}"></div>
      <div class="field"><label for="fMsg">Comentarios</label><textarea class="textarea" id="fMsg" name="comentarios" placeholder="Contanos todo lo que nos ayude a cotizar: categorías, si hay sponsors, listas de nombres, presupuesto estimado…">${esc(f.comentarios)}</textarea></div>
      <p class="note" id="formError" style="color:#ff8a8a" hidden></p>
      <div style="display:grid;gap:10px;margin-top:8px">
        <button class="btn btn-dark btn-block" type="submit" data-via="whatsapp">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.6 0 12-5.4 12-12S18.6 0 12 0zm5.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1l-.9 1.2c-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>
          Enviar solicitud por WhatsApp
        </button>
        <button class="btn btn-outline btn-block" type="submit" data-via="email">Enviar por email</button>
      </div>
      <p class="note" style="margin-top:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>Te vamos a pedir que nos adjuntes las fichas de diseño (se descargan al enviar) y tu logo en buena calidad.</p>
    </form>`;

  $$('[data-rm]', body).forEach((b) => b.onclick = () => { cart.splice(+b.dataset.rm, 1); store.set(K_CART, cart); updateCartCount(); renderCart(); });
  $$('[data-edit]', body).forEach((b) => b.onclick = () => {
    const it = cart[+b.dataset.edit];
    commit((s) => Object.assign(s, mergeState(DEFAULT_STATE, it.state)));
    meta = { ...meta, name: it.name, sizes: { ...it.sizes }, notes: it.notes, technique: it.technique };
    cart.splice(+b.dataset.edit, 1); store.set(K_CART, cart); updateCartCount();
    syncMeta(); persist(); closeDrawers(); toast('Editá el diseño y volvé a agregarlo');
  });
  $('#addAnother').onclick = () => { closeDrawers(); showSection('prenda'); };

  const form = $('#quoteForm');
  form.addEventListener('input', () => store.set(K_FORM, Object.fromEntries(new FormData(form))));
  let via = 'whatsapp';
  $$('button[type=submit]', form).forEach((b) => b.addEventListener('click', () => { via = b.dataset.via; }));
  form.addEventListener('submit', (e) => { e.preventDefault(); submitQuote(form, via); });
}

function buildMessage(data, cart) {
  const L = [];
  L.push(`*Solicitud de presupuesto — ${CONFIG.marca} Sport*`);
  L.push('');
  L.push(`Deporte: ${data.sector}`);
  L.push(`Institución: ${data.institucion}`);
  L.push(`Contacto: ${data.nombre} · ${data.telefono}${data.email ? ' · ' + data.email : ''}`);
  if (data.localidad) L.push(`Localidad: ${data.localidad}`);
  if (data.fecha) L.push(`Fecha estimada: ${new Date(data.fecha + 'T12:00').toLocaleDateString('es-AR')}`);
  cart.forEach((it, i) => {
    const s = it.state, P = PRODUCTS[s.product];
    L.push('');
    L.push(`*${i + 1}. ${P.name} — "${it.name}"*`);
    L.push(`• Diseño: ${PATTERNS[s.pattern]}${P.type !== 'short' && !P.hood ? ' · Cuello ' + COLLARS[s.collar].toLowerCase() : ''} · Tela ${FABRICS[s.fabric]?.label}`);
    L.push(`• Técnica: ${it.technique}`);
    L.push(`• Colores: principal ${s.colors.primary}, secundario ${s.colors.secondary}, detalles ${s.colors.accent}, cuello ${s.colors.trim}, textos ${s.colors.text}`);
    L.push(`• Textos: frente "${s.text.front || '-'}", espalda "${s.text.name || '-'}", número ${s.text.number || '-'} (tipografía ${FONTS[s.text.font]?.label})`);
    L.push(`• Logo: ${s.logo ? 'sí, ' + LOGO_POS[s.logoPos].toLowerCase() : 'no'}`);
    L.push(`• Talles: ${Object.entries(it.sizes).map(([t, n]) => `${t}×${n}`).join(', ')} — Total ${totalOf(it.sizes)}`);
    if (it.notes) L.push(`• Notas: ${it.notes}`);
    L.push(`• Ver diseño: ${shareLink(s)}`);
  });
  L.push('');
  L.push(`*Total de prendas: ${cart.reduce((a, i) => a + totalOf(i.sizes), 0)}*`);
  if (data.comentarios) { L.push(''); L.push(`Comentarios: ${data.comentarios}`); }
  return L.join('\n');
}

async function submitQuote(form, via) {
  const data = Object.fromEntries(new FormData(form));
  const err = $('#formError');
  const missing = [];
  if (!data.sector) missing.push('el deporte');
  if (!data.institucion?.trim()) missing.push('el nombre de la institución');
  if (!data.nombre?.trim()) missing.push('tu nombre');
  if (!data.telefono?.trim()) missing.push('un teléfono');
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) missing.push('un email válido');
  if (missing.length) { err.hidden = false; err.textContent = 'Falta completar: ' + missing.join(', ') + '.'; return; }
  err.hidden = true;
  const cart = store.get(K_CART, []);
  const msg = buildMessage(data, cart);

  // Envío opcional a un endpoint (Formspree u otro) si está configurado
  if (CONFIG.formEndpoint) {
    try {
      await fetch(CONFIG.formEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, _subject: `Solicitud de presupuesto — ${data.institucion}`, mensaje: msg }),
      });
    } catch (e) { console.warn('No se pudo enviar al endpoint', e); }
  }

  // Descargar fichas para adjuntar
  for (const it of cart) {
    const url = await makeSheet(it.state, { name: it.name, sizes: it.sizes, technique: it.technique });
    download(url, `${slug(data.institucion)}-${slug(it.name)}.png`);
  }

  if (via === 'whatsapp') window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  else location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Solicitud de presupuesto — ' + data.institucion)}&body=${encodeURIComponent(msg)}`;

  const historial = store.get('ip_enviadas', []);
  historial.unshift({ date: new Date().toISOString(), data, items: cart.map((i) => ({ name: i.name, product: i.state.product, sizes: i.sizes })) });
  store.set('ip_enviadas', historial.slice(0, 20));

  $('#cartBody').innerHTML = `
    <div class="success">
      <div class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></div>
      <h3>¡Gracias, ${esc(data.nombre.split(' ')[0])}!</h3>
      <p>Abrimos ${via === 'whatsapp' ? 'WhatsApp' : 'tu correo'} con el detalle de tu solicitud. Si no se abrió, escribinos a <strong>${esc(CONFIG.email)}</strong>.</p>
      <p>Se descargaron las fichas de diseño: <strong>adjuntalas</strong> al mensaje junto con tu logo en buena calidad.</p>
      <div style="display:grid;gap:10px;margin-top:20px">
        <button class="btn btn-outline" id="resend">Volver a abrir el mensaje</button>
        <button class="btn btn-dark" id="newReq">Empezar una nueva solicitud</button>
      </div>
    </div>`;
  $('#resend').onclick = () => (via === 'whatsapp'
    ? window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
    : (location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Solicitud de presupuesto')}&body=${encodeURIComponent(msg)}`));
  $('#newReq').onclick = () => { store.set(K_CART, []); updateCartCount(); closeDrawers(); };
}

/* ------------------------------ Drawers ------------------------------- */
function openDrawer(id) {
  if (id === 'cartDrawer') renderCart();
  if (id === 'savedDrawer') renderSaved();
  $('#overlay').classList.add('open');
  const d = $('#' + id); d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
  setTimeout(() => d.querySelector('[data-close]')?.focus(), 50);
}
function closeDrawers() {
  $('#overlay').classList.remove('open');
  $$('.drawer').forEach((d) => { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); });
}
$('#openCart').onclick = () => openDrawer('cartDrawer');
$('#openSaved').onclick = () => openDrawer('savedDrawer');
$('#overlay').onclick = closeDrawers;
$$('[data-close]').forEach((b) => b.onclick = closeDrawers);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawers(); });

/* ------------------------------- Toast -------------------------------- */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ------------------------------ Inicio -------------------------------- */
showSection(new URLSearchParams(location.search).get('plantilla') ? 'colores' : 'prenda', false);
syncUI(); syncMeta(); updateCartCount();
scheduleRender();
if (location.hash.startsWith("#d=")) window.history.replaceState(null, "", location.pathname + location.search);

// Miniaturas 3D en las opciones (se generan en segundo plano)
(async () => {
  await new Promise((r) => setTimeout(r, 600));
  for (const k of Object.keys(PRODUCTS)) {
    const s = mergeState(DEFAULT_STATE, { product: k, pattern: 'lisa', collar: k === 'chomba' ? 'polo' : 'redondo', colors: { primary: '#f4f1ea', secondary: '#f4f1ea', accent: '#4b4e36', trim: '#4b4e36', text: '#4b4e36' }, text: { front: '', name: '', number: '' } });
    const img = $(`[data-prod-thumb="${k}"]`); if (img) img.src = await renderThumbnail(s, { w: 200, h: 200, angle: 0.4 });
  }
  for (const t of TEMPLATES) {
    const img = $(`[data-tpl-thumb="${t.id}"]`); if (img) img.src = await renderThumbnail(stateFromTemplate(t.id), { w: 200, h: 200, angle: 0.3 });
  }
})();
