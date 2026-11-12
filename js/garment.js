/* =========================================================================
   Motor 3D de prendas
   - Geometría procedural (sin modelos externos): torso, mangas, cuellos,
     capucha y shorts construidos con anillos elípticos.
   - El diseño (patrones, colores, logo, textos, números) se pinta en un
     canvas 2D que se aplica como textura sobre la prenda.
   ========================================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

/* ----------------------------- Catálogo ------------------------------ */
export const PRODUCTS = {
  camiseta:   { name: 'Camiseta deportiva', short: 'Camiseta',   sleeves: 'short', collar: 'redondo', desc: 'Camiseta de juego o entrenamiento. Ideal para sublimación total.', tags: ['Dry-fit', 'Sublimación'] },
  mangalarga: { name: 'Camiseta manga larga', short: 'Manga larga', sleeves: 'long', collar: 'redondo', desc: 'Para arqueros, invierno o primera piel térmica.', tags: ['Dry-fit', 'Sublimación'] },
  musculosa:  { name: 'Musculosa', short: 'Musculosa', sleeves: 'none', collar: 'redondo', desc: 'Básquet, vóley, running y atletismo.', tags: ['Micropanal', 'Sublimación'] },
  chomba:     { name: 'Chomba', short: 'Chomba', sleeves: 'short', collar: 'polo', desc: 'Uniforme corporativo, staff y cuerpo técnico.', tags: ['Piqué', 'Bordado'] },
  buzo:       { name: 'Buzo canguro', short: 'Buzo', sleeves: 'long', collar: 'redondo', hood: true, long: true, desc: 'Egresados, viaje y abrigo de equipo.', tags: ['Frisa', 'Estampa / Bordado'] },
  short:      { name: 'Short deportivo', short: 'Short', type: 'short', desc: 'Fútbol, hockey, rugby, básquet y entrenamiento.', tags: ['Dry-fit', 'Sublimación'] },
};

export const PATTERNS = {
  lisa:       'Lisa',
  bastones:   'Bastones',
  rayas:      'Rayas horizontales',
  franja:     'Franja pecho',
  diagonal:   'Banda diagonal',
  degrade:    'Degradé',
  mitades:    'Mitades',
  laterales:  'Paneles laterales',
  hombros:    'Hombros contraste',
  chevron:    'Chevron',
  geometrico: 'Geométrico',
  sublimado:  'Pinceladas',
  topo:       'Topográfico',
  halftone:   'Tramado',
  fade:       'Degradé rayado',
  camo:       'Facetado',
  pinstripe:  'Rayas finas',
  shards:     'Fragmentos',
};

/* Estampados de sublimación total: también se aplican a las mangas */
const ALLOVER = ['topo', 'halftone', 'fade', 'camo', 'pinstripe', 'shards', 'geometrico', 'sublimado', 'degrade'];

export const FONTS = {
  sport:    { label: 'Deportiva', family: 'Bebas Neue', weight: '400' },
  bold:     { label: 'Bold',      family: 'Archivo Black', weight: '400' },
  college:  { label: 'Colegial',  family: 'Graduate', weight: '400' },
  clasica:  { label: 'Clásica',   family: 'Playfair Display', weight: '800' },
  moderna:  { label: 'Moderna',   family: 'Space Grotesk', weight: '700' },
};

export const FABRICS = {
  dryfit:     { label: 'Dry-fit', rough: 0.62, bump: 0.6, repeat: [70, 22] },
  micropanal: { label: 'Micropanal', rough: 0.7, bump: 1.0, repeat: [46, 14] },
  algodon:    { label: 'Algodón peinado', rough: 0.92, bump: 0.35, repeat: [110, 34] },
  frisa:      { label: 'Frisa', rough: 0.97, bump: 0.25, repeat: [90, 28] },
  pique:      { label: 'Piqué', rough: 0.85, bump: 0.8, repeat: [80, 25] },
};

export const DEFAULT_STATE = {
  product: 'camiseta',
  collar: 'redondo',
  pattern: 'franja',
  fabric: 'dryfit',
  colors: { primary: '#1c1e1b', secondary: '#4b4e36', accent: '#e6dfd3', sleeves: '#1c1e1b', trim: '#4b4e36', text: '#e6dfd3' },
  sleevesMatch: true,
  text: { front: 'CLUB ATLÉTICO', name: 'GARCÍA', number: '10', frontNumber: true, font: 'bold', outline: false },
  logo: null,          // dataURL
  logoPos: 'izq',      // izq | centro | der
  logoSize: 1,
};

export function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

/* --------------------------- Utilidades ------------------------------ */
const smooth = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return '#' + c.getHexString();
}

function luminance(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/* -------------------- Geometría: superficie de anillos ---------------- */
/**
 * Construye una superficie a partir de anillos elípticos.
 * rings: [{ y, a (semi-eje X), b (semi-eje Z), x?, z? }]
 * u = 0 en la espalda, 0.5 en el frente.  v = 0 en el primer anillo.
 */
function ringSurface(rings, seg = 96, p = 0.82, flipV = false) {
  const n = rings.length;
  const pos = [], uv = [], idx = [];
  // v según longitud de arco (medida en el frente)
  const lens = [0];
  for (let j = 1; j < n; j++) {
    const r0 = rings[j - 1], r1 = rings[j];
    lens.push(lens[j - 1] + Math.hypot(r1.y - r0.y, r1.b - r0.b, (r1.x || 0) - (r0.x || 0)));
  }
  const total = lens[n - 1] || 1;
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const phi = Math.PI + u * Math.PI * 2;
    const s = Math.sin(phi), c = Math.cos(phi);
    const ss = Math.sign(s) * Math.pow(Math.abs(s), p);
    const cc = Math.sign(c) * Math.pow(Math.abs(c), p);
    for (let j = 0; j < n; j++) {
      const r = rings[j];
      pos.push((r.x || 0) + r.a * ss, r.y, (r.z || 0) + r.b * cc);
      uv.push(u, flipV ? 1 - lens[j] / total : lens[j] / total);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = (i + 1) * n + j, c2 = (i + 1) * n + j + 1, d = i * n + j + 1;
      idx.push(a, b, d, b, c2, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Unir normales en la costura (u=0 / u=1) para que no se vea un corte
  const nr = g.attributes.normal;
  for (let j = 0; j < n; j++) {
    const a = j, b = seg * n + j;
    const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}

/* Arrugas suaves de tela */
function addWrinkles(g, amp = 0.012, seed = 1) {
  const p = g.attributes.position, nrm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const w = Math.sin(y * 9 + x * 3 + seed) * Math.sin(x * 5 - y * 2) + 0.5 * Math.sin(y * 17 + z * 6);
    p.setXYZ(i, x + nrm.getX(i) * w * amp, y, z + nrm.getZ(i) * w * amp);
  }
  g.computeVertexNormals();
}

/* Perfil del torso */
function torsoRings(long = false, tank = false) {
  const H = long ? 2.3 : 2.2;        // alto hasta axila
  const top = H + 0.36;
  const k = long ? 1.03 : 0.97;
  const prof = [
    [0.00, 0.95 * k, 0.58],
    [H * 0.18, 0.94 * k, 0.58],
    [H * 0.40, 0.92 * k, 0.58],
    [H * 0.60, 0.94 * k, 0.61],
    [H * 0.78, 0.98 * k, 0.64],
    [H * 0.92, 0.99 * k, 0.63],
    [H * 1.00, 0.98 * k, 0.60],
    [H + 0.12, 0.97 * k, 0.54],
    [H + 0.21, 0.92 * k, 0.47],
    [H + 0.27, 0.80, 0.40],
    [H + 0.32, 0.64, 0.34],
    [top - 0.015, 0.50, 0.30],
    [top, 0.42, 0.28],
  ];
  if (tank) {
    // hombros más angostos (breteles)
    prof.splice(6, 7,
      [H * 1.00, 0.9, 0.58], [H + 0.1, 0.76, 0.5], [H + 0.2, 0.66, 0.42], [H + 0.28, 0.58, 0.36],
      [H + 0.33, 0.5, 0.31], [top, 0.42, 0.28]);
  }
  const rings = prof.map(([y, a, b]) => ({ y, a, b, z: y > H ? -0.02 : 0 }));
  return { rings, armpit: H, top };
}

/* ---------------------------- Texturas -------------------------------- */
export const TEX_W = 2048;
export const TEX_H = 896;

let fabricCache = {};
function fabricBump(kind) {
  if (fabricCache[kind]) return fabricCache[kind];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, 64, 64);
  if (kind === 'micropanal' || kind === 'dryfit') {
    x.fillStyle = '#3a3a3a';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      x.beginPath(); x.arc(8 + i * 16 + (j % 2) * 8, 8 + j * 16, kind === 'micropanal' ? 5 : 3.2, 0, Math.PI * 2); x.fill();
    }
  } else if (kind === 'pique') {
    x.fillStyle = '#505050';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) x.fillRect(i * 8 + (j % 2) * 4, j * 8, 4, 4);
  } else {
    x.strokeStyle = '#606060'; x.lineWidth = 3;
    for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 8 + 4, 0); x.lineTo(i * 8 + 4, 64); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  fabricCache[kind] = t;
  return t;
}

function fontStr(font, size) {
  const f = FONTS[font] || FONTS.sport;
  return `${f.weight} ${Math.round(size)}px "${f.family}", Impact, sans-serif`;
}

function fitText(ctx, txt, font, size, maxW) {
  ctx.font = fontStr(font, size);
  const w = ctx.measureText(txt).width;
  if (w > maxW) { size *= maxW / w; ctx.font = fontStr(font, size); }
  return size;
}

function drawText(ctx, txt, x, y, size, st, maxW, opts = {}) {
  if (!txt) return;
  const font = st.text.font;
  size = fitText(ctx, txt, font, size, maxW);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = opts.spacing ? `${Math.round(size * opts.spacing)}px` : '0px';
  if (st.text.outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size * 0.09);
    ctx.strokeStyle = contrastOutline(st);
    ctx.strokeText(txt, x, y);
  }
  ctx.fillStyle = st.colors.text;
  ctx.fillText(txt, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function contrastOutline(st) {
  // Contorno: el color que más contraste haga con el texto
  const opts = [st.colors.primary, st.colors.secondary, st.colors.accent, '#111111', '#ffffff'];
  const lt = luminance(st.colors.text);
  let best = opts[0], bd = -1;
  for (const o of opts) { const d = Math.abs(luminance(o) - lt); if (d > bd) { bd = d; best = o; } }
  return best;
}

/* Dibuja algo en el centro de la espalda (que cae justo en la costura u=0/1) */
function onBack(ctx, W, fn) {
  fn(0); fn(W);
}

export function paintPattern(ctx, W, H, st) {
  const { primary: P, secondary: S, accent: A } = st.colors;
  const F = W / 2; // centro frente
  ctx.fillStyle = P; ctx.fillRect(0, 0, W, H);
  const rnd = seeded(7);
  switch (st.pattern) {
    case 'bastones': {
      const period = W / 14, w = period * 0.5;
      ctx.fillStyle = S;
      for (let k = -8; k <= 8; k++) ctx.fillRect(F + k * period - w / 2, 0, w, H);
      break;
    }
    case 'rayas': {
      const period = H / 6.5, h = period * 0.48;
      ctx.fillStyle = S;
      for (let y = H - period * 0.25; y > H * 0.12; y -= period) ctx.fillRect(0, y - h, W, h);
      break;
    }
    case 'franja': {
      const y0 = H * 0.30, h = H * 0.16;
      ctx.fillStyle = S; ctx.fillRect(0, y0, W, h);
      ctx.fillStyle = A; ctx.fillRect(0, y0 - H * 0.018, W, H * 0.012); ctx.fillRect(0, y0 + h + H * 0.006, W, H * 0.012);
      break;
    }
    case 'diagonal': {
      const band = (cx, dir) => {
        ctx.save();
        ctx.beginPath();
        const w = W * 0.075;
        ctx.moveTo(cx - dir * W * 0.2 - w, H * 0.12);
        ctx.lineTo(cx - dir * W * 0.2 + w, H * 0.12);
        ctx.lineTo(cx + dir * W * 0.2 + w, H * 1.0);
        ctx.lineTo(cx + dir * W * 0.2 - w, H * 1.0);
        ctx.closePath();
        ctx.fillStyle = S; ctx.fill();
        ctx.lineWidth = H * 0.012; ctx.strokeStyle = A; ctx.stroke();
        ctx.restore();
      };
      band(F, 1);
      onBack(ctx, W, (x) => band(x, -1));
      break;
    }
    case 'degrade': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, S); g.addColorStop(0.25, S); g.addColorStop(0.95, P);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // textura de puntos tipo halftone
      ctx.fillStyle = P;
      for (let y = H * 0.2; y < H * 0.75; y += 18) {
        const r = ((y - H * 0.2) / (H * 0.55)) * 6;
        for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      }
      break;
    }
    case 'mitades': {
      ctx.fillStyle = S; ctx.fillRect(F, 0, W / 2, H);
      ctx.fillStyle = A; ctx.fillRect(F - 5, 0, 10, H);
      break;
    }
    case 'laterales': {
      const w = W * 0.07;
      for (const cx of [W * 0.25, W * 0.75]) {
        ctx.fillStyle = S; ctx.fillRect(cx - w, 0, w * 2, H);
        ctx.fillStyle = A; ctx.fillRect(cx - w - 10, 0, 8, H); ctx.fillRect(cx + w + 2, 0, 8, H);
      }
      break;
    }
    case 'hombros': {
      const y = H * 0.24;
      ctx.fillStyle = S; ctx.fillRect(0, 0, W, y);
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin((x / W) * Math.PI * 4) * H * 0.03);
      ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.fill();
      ctx.fillStyle = A; ctx.fillRect(0, y + H * 0.04, W, H * 0.014);
      break;
    }
    case 'chevron': {
      const draw = (cx) => {
        for (let i = 0; i < 3; i++) {
          const y = H * (0.3 + i * 0.1);
          ctx.beginPath();
          ctx.moveTo(cx - W * 0.2, y); ctx.lineTo(cx, y + H * 0.13); ctx.lineTo(cx + W * 0.2, y);
          ctx.lineWidth = H * 0.04; ctx.strokeStyle = i === 1 ? A : S; ctx.stroke();
        }
      };
      draw(F);
      break;
    }
    case 'geometrico': {
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W, y = rnd() * H, s = 40 + rnd() * 160;
        ctx.globalAlpha = 0.25 + rnd() * 0.55;
        ctx.fillStyle = rnd() > 0.7 ? A : S;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s * (rnd() - 0.2)); ctx.lineTo(x + s * (rnd() - 0.5), y + s); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'sublimado': {
      ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const y = rnd() * H, x = rnd() * W;
        ctx.globalAlpha = 0.5 + rnd() * 0.5;
        ctx.strokeStyle = rnd() > 0.65 ? A : S;
        ctx.lineWidth = 8 + rnd() * 34;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 200, y - 120 * rnd(), x + 380, y + 140 * rnd(), x + 600 * rnd() + 200, y - 60);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'topo': {
      // Curvas de nivel continuas (sin corte en la costura)
      const TAU = Math.PI * 2;
      const ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU];
      ctx.lineWidth = Math.max(2, H * 0.0045);
      for (let i = -4; i < 34; i++) {
        const base = (i / 30) * H;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const u = x / W;
          const y = base + H * 0.05 * Math.sin(TAU * 2 * u + ph[0] + i * 0.22) + H * 0.035 * Math.sin(TAU * 5 * u + ph[1] - i * 0.15)
            + H * 0.02 * Math.sin(TAU * 9 * u + ph[2] + i * 0.4) + H * 0.04 * Math.sin(TAU * 3 * u + ph[3]) * (i / 30);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = i % 5 === 0 ? A : S;
        ctx.globalAlpha = i % 5 === 0 ? 0.9 : 0.45;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'halftone': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, P); g.addColorStop(1, shade(P, -0.08));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const step = H / 34;
      ctx.fillStyle = S;
      for (let row = 0, y = step / 2; y < H + step; y += step, row++) {
        const t = Math.max(0, (y / H - 0.25) / 0.75);
        const r = step * 0.52 * Math.pow(t, 1.15);
        if (r < 0.6) continue;
        for (let x = (row % 2) * step / 2; x < W + step; x += step) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = A; ctx.fillRect(0, H * 0.205, W, H * 0.01);
      break;
    }
    case 'fade': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, P); g.addColorStop(0.55, P); g.addColorStop(1, shade(S, -0.05));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.strokeStyle = S; ctx.lineWidth = H * 0.008;
      for (let x = -H; x < W + H; x += H * 0.035) {
        const grd = ctx.createLinearGradient(0, H * 0.15, 0, H);
        grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, S);
        ctx.strokeStyle = grd;
        ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H * 0.85, H * 0.15); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = A; ctx.fillRect(0, H * 0.94, W, H * 0.06);
      break;
    }
    case 'camo': {
      // Malla de triángulos con variaciones de tono (efecto facetado)
      const cols = 28, rows = 11, cw = W / cols, rh = H / rows;
      const pts = [];
      for (let j = 0; j <= rows; j++) { pts[j] = []; for (let i = 0; i <= cols; i++) {
        const jx = i === 0 || i === cols ? 0 : (rnd() - 0.5) * cw * 0.7;
        pts[j][i] = [i * cw + jx, j * rh + (rnd() - 0.5) * rh * 0.6];
      } pts[j][cols][1] = pts[j][0][1]; }
      const tri = (a, b, c) => {
        const k = rnd();
        ctx.fillStyle = k > 0.95 ? S : k > 0.88 ? shade(A, -0.05) : shade(P, (rnd() - 0.5) * 0.16);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.5; ctx.stroke();
      };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i], d = pts[j + 1][i + 1];
        if ((i + j) % 2) { tri(a, b, d); tri(a, d, c); } else { tri(a, b, c); tri(b, d, c); }
      }
      break;
    }
    case 'pinstripe': {
      ctx.fillStyle = S; ctx.globalAlpha = 0.55;
      const per = W / 72;
      for (let k = 0; k < 72; k++) ctx.fillRect(k * per, 0, Math.max(2, per * 0.08), H);
      ctx.globalAlpha = 1;
      // banda en V sobre el pecho
      const vb = (cx) => { ctx.beginPath(); ctx.moveTo(cx - W * 0.25, H * 0.08); ctx.lineTo(cx, H * 0.36); ctx.lineTo(cx + W * 0.25, H * 0.08);
        ctx.lineTo(cx + W * 0.25, H * 0.14); ctx.lineTo(cx, H * 0.42); ctx.lineTo(cx - W * 0.25, H * 0.14); ctx.closePath(); ctx.fillStyle = A; ctx.fill(); };
      vb(F);
      break;
    }
    case 'shards': {
      const shard = (pts, col, alpha) => { ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
      const side = (cx, d) => {
        shard([[cx - d * W * 0.02, H * 0.15], [cx + d * W * 0.2, H * 0.02], [cx + d * W * 0.24, H * 0.2], [cx + d * W * 0.06, H * 0.62]], S, 0.95);
        shard([[cx + d * W * 0.08, H * 0.55], [cx + d * W * 0.24, H * 0.24], [cx + d * W * 0.25, H * 0.9]], shade(S, -0.12), 0.9);
        shard([[cx - d * W * 0.04, H * 0.66], [cx + d * W * 0.07, H * 0.6], [cx + d * W * 0.14, H * 1.0], [cx - d * W * 0.08, H * 1.0]], A, 0.85);
        shard([[cx - d * W * 0.2, H * 0.7], [cx - d * W * 0.06, H * 0.8], [cx - d * W * 0.16, H * 1.0]], shade(P, 0.08), 1);
      };
      side(F, 1); side(0, -1); side(W, -1);
      ctx.globalAlpha = 1;
      break;
    }
    default: break;
  }
}

/** Pinta el cuerpo de la prenda (torso) */
export function paintBody(canvas, st, logoImg) {
  const W = canvas.width, H = canvas.height, F = W / 2;
  const ctx = canvas.getContext('2d');
  const prod = PRODUCTS[st.product];
  paintPattern(ctx, W, H, st);

  // sombreado sutil de costuras laterales
  for (const cx of [W * 0.25, W * 0.75]) {
    const g = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 30, 0, 60, H);
  }

  // Cuellos
  const T = st.colors.trim;
  const collar = prod.hood ? 'redondo' : st.collar;
  if (collar === 'v') {
    ctx.beginPath();
    ctx.moveTo(F - W * 0.045, 0); ctx.lineTo(F, H * 0.2); ctx.lineTo(F + W * 0.045, 0);
    ctx.lineWidth = H * 0.035; ctx.strokeStyle = T; ctx.stroke();
    ctx.lineWidth = H * 0.008; ctx.strokeStyle = shade(T, -0.25); ctx.stroke();
  }
  if (collar === 'polo') {
    // tapeta con botones
    ctx.fillStyle = shade(st.colors.primary, -0.05);
    ctx.fillRect(F - 22, 0, 44, H * 0.24);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3; ctx.strokeRect(F - 22, -5, 44, H * 0.24 + 5);
    ctx.fillStyle = T;
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(F, H * (0.08 + i * 0.08), 8, 0, 7); ctx.fill(); }
  }

  // Buzo: bolsillo canguro + puño inferior
  if (prod.hood) {
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    ctx.moveTo(F - W * 0.12, H * 0.92); ctx.lineTo(F - W * 0.09, H * 0.62); ctx.lineTo(F + W * 0.09, H * 0.62); ctx.lineTo(F + W * 0.12, H * 0.92);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]);
  }
  if (prod.hood || prod.long) {
    ctx.fillStyle = T; ctx.fillRect(0, H * 0.94, W, H * 0.06);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < W; x += 10) ctx.fillRect(x, H * 0.94, 4, H * 0.06);
  }

  // Textos frente
  const hasLogo = !!logoImg;
  const logoCentro = hasLogo && st.logoPos === 'centro';
  let yFront = logoCentro ? H * 0.5 : H * 0.36;
  if (prod.hood) yFront = logoCentro ? H * 0.52 : H * 0.42;
  if (st.text.front) drawText(ctx, st.text.front.toUpperCase(), F, yFront, H * 0.085, st, W * 0.2, { spacing: 0.04 });

  // Logo
  if (hasLogo) {
    const base = H * 0.13 * (st.logoSize || 1) * (logoCentro ? 1.5 : 1);
    const ratio = logoImg.width / logoImg.height || 1;
    let w = base, h = base;
    if (ratio > 1) h = base / ratio; else w = base * ratio;
    let cx = F + W * 0.06, cy = H * 0.24;
    if (st.logoPos === 'der') cx = F - W * 0.06;
    if (logoCentro) { cx = F; cy = H * 0.3; }
    if (prod.hood && !logoCentro) cy = H * 0.27;
    ctx.drawImage(logoImg, cx - w / 2, cy - h / 2, w, h);
  }

  // Número frente
  if (st.text.number && st.text.frontNumber && !prod.hood) {
    const nx = hasLogo && !logoCentro ? (st.logoPos === 'der' ? F + W * 0.06 : F - W * 0.06) : F;
    const ny = hasLogo && !logoCentro ? H * 0.24 : H * 0.55;
    drawText(ctx, st.text.number, nx, ny, H * 0.13, st, W * 0.06);
  }

  // Espalda: nombre + número
  onBack(ctx, W, (x) => {
    if (st.text.name) drawText(ctx, st.text.name.toUpperCase(), x, H * 0.28, H * 0.075, st, W * 0.15, { spacing: 0.06 });
    if (st.text.number && !prod.hood) drawText(ctx, st.text.number, x, H * 0.56, H * 0.36, st, W * 0.14);
    if (prod.hood && st.text.number) drawText(ctx, st.text.number, x, H * 0.55, H * 0.26, st, W * 0.14);
  });
}

export function paintSleeve(canvas, st) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const col = st.sleevesMatch ? st.colors.primary : st.colors.sleeves;
  ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
  if (st.sleevesMatch && ALLOVER.includes(st.pattern)) paintPattern(ctx, W, H, st);
  if (st.sleevesMatch && (st.pattern === 'bastones')) {
    ctx.fillStyle = st.colors.secondary;
    const period = W / 6; for (let k = 0; k < 7; k++) ctx.fillRect(k * period - period * 0.25, 0, period * 0.5, H);
  }
  if (st.sleevesMatch && st.pattern === 'rayas') {
    ctx.fillStyle = st.colors.secondary;
    for (let y = H * 0.3; y < H; y += H / 3) ctx.fillRect(0, y, W, H / 7);
  }
  // puño (cuff) arriba del canvas (v=1)
  const prod = PRODUCTS[st.product];
  const cuff = prod.sleeves === 'long' ? 0.1 : 0.14;
  ctx.fillStyle = st.colors.trim; ctx.fillRect(0, 0, W, H * cuff);
  if (prod.sleeves !== 'long') { ctx.fillStyle = st.colors.accent; ctx.fillRect(0, H * cuff, W, H * 0.035); }
  if (prod.sleeves === 'long') {
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 3, H * cuff);
  }
}

/** part: 'hip' | 'legL' | 'legR'  (legL = pierna izquierda del que la usa, x > 0) */
export function paintShort(canvas, st, logoImg, part = 'hip') {
  const W = canvas.width, H = canvas.height, F = W / 2;
  const ctx = canvas.getContext('2d');
  const { primary: P, secondary: S, accent: A } = st.colors;
  ctx.fillStyle = P; ctx.fillRect(0, 0, W, H);
  if (st.pattern === 'mitades' && part !== 'hip') { ctx.fillStyle = part === 'legR' ? P : S; ctx.fillRect(0, 0, W, H); }
  if (st.pattern === 'mitades' && part === 'hip') { ctx.fillStyle = S; ctx.fillRect(F, 0, W / 2, H); }
  if (st.pattern === 'degrade' && part !== 'hip') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P); g.addColorStop(1, S);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // franja lateral (lado externo)
  const sides = part === 'hip' ? [W * 0.25, W * 0.75] : [part === 'legL' ? W * 0.75 : W * 0.25];
  for (const cx of sides) {
    ctx.fillStyle = S; ctx.fillRect(cx - W * 0.05, 0, W * 0.1, H);
    ctx.fillStyle = A; ctx.fillRect(cx - W * 0.012, 0, W * 0.024, H);
  }
  if (part === 'legL' && st.text.number) drawText(ctx, st.text.number, F + W * 0.06, H * 0.45, H * 0.3, st, W * 0.12);
  if (part === 'legR' && logoImg) {
    const sz = H * 0.28, r = logoImg.width / logoImg.height || 1;
    const w = r > 1 ? sz : sz * r, h = r > 1 ? sz / r : sz;
    ctx.drawImage(logoImg, F - W * 0.06 - w / 2, H * 0.45 - h / 2, w, h);
  }
  // dobladillo
  if (part !== 'hip') { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, H * 0.92, W, 6); }
}

export function paintWaist(canvas, st) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = st.colors.trim; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0; x < canvas.width; x += 8) ctx.fillRect(x, 0, 3, canvas.height);
}

/* ----------------------------- Prenda --------------------------------- */
function makeTex(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  return t;
}

function fabricMaterial(map, st, extra = {}) {
  const fab = FABRICS[st.fabric] || FABRICS.dryfit;
  const bump = fabricBump(st.fabric).clone();
  bump.needsUpdate = true;
  bump.repeat.set(fab.repeat[0] * (extra.rx || 1), fab.repeat[1] * (extra.ry || 1));
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({
    map, roughness: fab.rough, metalness: 0, bumpMap: bump, bumpScale: fab.bump,
    side: THREE.DoubleSide,
  });
}

/**
 * Construye la prenda completa. Devuelve un THREE.Group con
 * userData.dispose() para liberar memoria.
 */
export function buildGarment(st, logoImg, renderer) {
  const prod = PRODUCTS[st.product] || PRODUCTS.camiseta;
  const group = new THREE.Group();
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  if (prod.type === 'short') {
    const part = (name, w, h) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      paintShort(c, st, logoImg, name);
      return track(fabricMaterial(track(makeTex(c, renderer)), st));
    };
    const hip = ringSurface([
      { y: 0, a: 0.98, b: 0.62 }, { y: -0.12, a: 1.0, b: 0.64 }, { y: -0.32, a: 1.03, b: 0.63 }, { y: -0.52, a: 1.0, b: 0.55 },
    ], 96, 0.82, true);
    addWrinkles(hip, 0.008);
    group.add(new THREE.Mesh(track(hip), part('hip', 1536, 320)));
    for (const side of [-1, 1]) {
      const leg = ringSurface([
        { y: -0.3, a: 0.53, b: 0.64, x: side * 0.5 },
        { y: -0.8, a: 0.57, b: 0.6, x: side * 0.57 },
        { y: -1.22, a: 0.61, b: 0.58, x: side * 0.64 },
        { y: -1.28, a: 0.61, b: 0.58, x: side * 0.645 },
      ], 80, 0.82, true);
      addWrinkles(leg, 0.012, side * 3);
      group.add(new THREE.Mesh(track(leg), part(side > 0 ? 'legL' : 'legR', 1024, 380)));
    }
    const wc = document.createElement('canvas'); wc.width = 256; wc.height = 32; paintWaist(wc, st);
    const wtex = track(makeTex(wc, renderer));
    const waist = ringSurface([{ y: 0.1, a: 0.98, b: 0.66 }, { y: 0.11, a: 1.0, b: 0.68 }, { y: -0.01, a: 1.0, b: 0.68 }, { y: 0, a: 0.98, b: 0.66 }], 96);
    group.add(new THREE.Mesh(track(waist), track(fabricMaterial(wtex, st))));
    // cordón
    const cordMat = track(new THREE.MeshStandardMaterial({ color: st.colors.accent, roughness: 0.6 }));
    for (const s of [-1, 1]) {
      const cord = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8)), cordMat);
      cord.position.set(s * 0.06, -0.08, 0.64); cord.rotation.z = s * 0.15;
      group.add(cord);
    }
    group.position.y = 0.6;
    group.userData.height = 1.4;
  } else {
    const { rings, armpit, top } = torsoRings(prod.long, prod.sleeves === 'none');
    const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H;
    paintBody(c, st, logoImg);
    const tex = track(makeTex(c, renderer));
    const bodyMat = track(fabricMaterial(tex, st));
    const body = ringSurface(rings, 128);
    addWrinkles(body, prod.hood ? 0.016 : 0.01);
    const bodyMesh = new THREE.Mesh(track(body), bodyMat);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Mangas
    if (prod.sleeves !== 'none') {
      const sc = document.createElement('canvas'); sc.width = 512; sc.height = 256;
      paintSleeve(sc, st);
      const stex = track(makeTex(sc, renderer));
      const smat = track(fabricMaterial(stex, st, { rx: 0.25, ry: 0.4 }));
      const isLong = prod.sleeves === 'long';
      const L = isLong ? (prod.long ? 1.75 : 1.65) : 0.62;
      const prof = isLong
        ? [[0, 0.40, 0.36], [-0.25, 0.36, 0.33], [-L * 0.5, 0.29, 0.27], [-L * 0.9, 0.23, 0.22], [-L * 0.93, 0.19, 0.18], [-L, 0.19, 0.18]]
        : [[0, 0.42, 0.38], [-0.2, 0.39, 0.35], [-L * 0.85, 0.35, 0.31], [-L, 0.34, 0.30]];
      for (const side of [-1, 1]) {
        const g = ringSurface(prof.map(([y, a, b]) => ({ y, a, b })), 48, 0.9);
        addWrinkles(g, isLong ? 0.014 : 0.008, side);
        const m = new THREE.Mesh(track(g), smat);
        const ang = isLong ? 0.36 : 0.72;
        m.rotation.z = side * ang;
        m.position.set(side * (prod.long ? 0.82 : 0.78), armpit + 0.04, -0.01);
        m.castShadow = true;
        group.add(m);
      }
    }

    // Cuello
    const trimMat = track(new THREE.MeshStandardMaterial({ color: st.colors.trim, roughness: 0.75, side: THREE.DoubleSide }));
    const collar = prod.hood ? 'redondo' : (st.collar || prod.collar);
    if (collar === 'polo') {
      const g = ringSurface([
        { y: top - 0.01, a: 0.43, b: 0.29, z: -0.02 }, { y: top + 0.08, a: 0.45, b: 0.31, z: -0.03 },
        { y: top + 0.1, a: 0.47, b: 0.33, z: -0.03 }, { y: top + 0.02, a: 0.56, b: 0.42, z: -0.02 }, { y: top - 0.04, a: 0.6, b: 0.46, z: -0.01 },
      ], 96);
      // abrir adelante: escalar vértices del frente hacia abajo
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i);
        if (z > 0.2) { const k = smooth(0.2, 0.33, z); p.setY(i, p.getY(i) - k * 0.06); p.setZ(i, z + k * 0.04); }
      }
      g.computeVertexNormals();
      group.add(new THREE.Mesh(track(g), trimMat));
    } else {
      const g = ringSurface([
        { y: top - 0.04, a: 0.44, b: 0.3, z: -0.02 }, { y: top + 0.015, a: 0.425, b: 0.285, z: -0.02 },
        { y: top + 0.02, a: 0.4, b: 0.265, z: -0.02 }, { y: top - 0.03, a: 0.39, b: 0.255, z: -0.02 },
      ], 96);
      group.add(new THREE.Mesh(track(g), trimMat));
    }

    // Capucha (bajada sobre la espalda)
    if (prod.hood) {
      const hoodMat = track(new THREE.MeshStandardMaterial({ color: st.colors.primary, roughness: 0.95, side: THREE.DoubleSide }));
      const hg = new THREE.SphereGeometry(0.62, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const hood = new THREE.Mesh(track(hg), hoodMat);
      hood.scale.set(0.92, 0.62, 0.62);
      hood.rotation.x = -2.0;
      hood.position.set(0, top - 0.32, -0.4);
      hood.castShadow = true;
      group.add(hood);
      // borde de la capucha
      const rim = new THREE.Mesh(track(new THREE.TorusGeometry(0.47, 0.05, 12, 60)), trimMat);
      rim.scale.set(1, 0.7, 1); rim.rotation.x = Math.PI / 2 - 0.3; rim.position.set(0, top - 0.02, -0.06);
      group.add(rim);
      // cordones
      const cordMat = track(new THREE.MeshStandardMaterial({ color: st.colors.accent, roughness: 0.6 }));
      for (const s of [-1, 1]) {
        const cord = new THREE.Mesh(track(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 8)), cordMat);
        cord.position.set(s * 0.13, top - 0.3, 0.355); cord.rotation.x = 0.18;
        group.add(cord);
        const tip = new THREE.Mesh(track(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8)), cordMat);
        tip.position.set(s * 0.13, top - 0.56, 0.4);
        group.add(tip);
      }
    }
    group.position.y = -top / 2;
    group.userData.height = top;
  }
  group.userData.dispose = () => disposables.forEach((d) => d.dispose && d.dispose());
  return group;
}

/* ----------------------------- Visor ---------------------------------- */
export async function ensureFonts() {
  if (!document.fonts) return;
  const loads = Object.values(FONTS).map((f) => document.fonts.load(`${f.weight} 64px "${f.family}"`).catch(() => {}));
  await Promise.all(loads);
}

export function loadImage(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const i = new Image();
    i.onload = () => res(i); i.onerror = () => res(null);
    i.src = src;
  });
}

export class GarmentViewer {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = Object.assign({ autoRotate: true, controls: true, background: null, zoom: true, preserve: false }, opts);
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: this.opts.preserve });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);

    const scene = this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const cam = this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    cam.position.set(0, 0.25, 8.2);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -3; key.shadow.camera.right = key.shadow.camera.top = 3;
    key.shadow.radius = 6;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc4ff, 0.8); rim.position.set(-4, 2, -4); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 0.35));

    // sombra en el piso
    const ground = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -1.55; ground.receiveShadow = true;
    scene.add(ground);
    this.ground = ground;

    this.pivot = new THREE.Group();
    scene.add(this.pivot);

    if (this.opts.controls) {
      const c = this.controls = new OrbitControls(cam, r.domElement);
      c.enableDamping = true; c.dampingFactor = 0.08;
      c.enablePan = false;
      c.enableZoom = this.opts.zoom;
      c.minDistance = 3.2; c.maxDistance = 10;
      c.minPolarAngle = Math.PI * 0.2; c.maxPolarAngle = Math.PI * 0.62;
      c.autoRotate = this.opts.autoRotate; c.autoRotateSpeed = 1.6;
      c.target.set(0, 0, 0);
      c.addEventListener('start', () => { this._interacting = true; });
      c.addEventListener('end', () => { this._interacting = false; });
    }

    this._resize = () => this.resize();
    this._ro = new ResizeObserver(this._resize);
    this._ro.observe(container);
    this.resize();

    this._tween = null;
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      if (!this.visible) return;
      this.update();
      r.render(scene, cam);
    };
    this.visible = true;
    this._io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { threshold: 0 });
    this._io.observe(container);
    loop();
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update() {
    if (this._tween) {
      const t = this._tween; const k = Math.min(1, (performance.now() - t.start) / t.dur);
      const e = 1 - Math.pow(1 - k, 3);
      const ang = lerp(t.from, t.to, e);
      this.camera.position.set(Math.sin(ang) * t.dist, lerp(t.y0, t.y1, e), Math.cos(ang) * t.dist);
      this.camera.lookAt(0, 0, 0);
      if (k >= 1) this._tween = null;
    }
    // pequeña animación de entrada / flotación
    if (this.garment) {
      const t = performance.now() / 1000;
      this.pivot.position.y = Math.sin(t * 1.2) * 0.025;
      if (this._pop < 1) { this._pop = Math.min(1, this._pop + 0.06); const s = 0.92 + 0.08 * (1 - Math.pow(1 - this._pop, 3)); this.pivot.scale.setScalar(s); }
    }
    if (this.controls && !this._tween) this.controls.update();
  }

  async setState(st, { pop = true } = {}) {
    const token = this._tok = (this._tok || 0) + 1;
    await ensureFonts();
    const logo = await loadImage(st.logo);
    if (token !== this._tok) return; // llegó un cambio más nuevo
    const g = buildGarment(st, logo, this.renderer);
    if (this.garment) { this.pivot.remove(this.garment); this.garment.userData.dispose(); }
    this.garment = g;
    this.pivot.add(g);
    const prod = PRODUCTS[st.product];
    this.ground.position.y = prod.type === 'short' ? -0.85 : -(g.userData.height / 2) - 0.12;
    if (pop) this._pop = 0;
  }

  setAutoRotate(on) { if (this.controls) this.controls.autoRotate = on; }

  /** view: 'frente' | 'espalda' | 'izq' | 'der' */
  setView(view) {
    const map = { frente: 0, espalda: Math.PI, izq: -Math.PI / 2, der: Math.PI / 2 };
    const p = this.camera.position;
    const dist = Math.hypot(p.x, p.z) || 8;
    let from = Math.atan2(p.x, p.z), to = map[view] ?? 0;
    while (to - from > Math.PI) to -= Math.PI * 2;
    while (to - from < -Math.PI) to += Math.PI * 2;
    this.setAutoRotate(false);
    this._tween = { from, to, dist, y0: p.y, y1: 0.25, start: performance.now(), dur: 700 };
  }

  zoom(f) {
    const p = this.camera.position; const l = p.length();
    const nl = Math.min(10, Math.max(3.2, l * f));
    p.multiplyScalar(nl / l);
  }

  snapshot(type = 'image/png') {
    this.update();
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL(type);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this._ro.disconnect(); this._io.disconnect();
    if (this.garment) this.garment.userData.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/* Render estático (para miniaturas de catálogo / plantillas) */
let thumbRenderer = null;
let thumbQueue = Promise.resolve();
/* Los renders se encolan: comparten un único renderer y cámara */
export function renderThumbnail(st, opts = {}) {
  const job = thumbQueue.then(() => _renderThumbnail(st, opts));
  thumbQueue = job.catch(() => {});
  return job;
}
async function _renderThumbnail(st, { w = 480, h = 560, angle = 0.35, zoom = 1 } = {}) {
  await ensureFonts();
  const logo = await loadImage(st.logo);
  if (!thumbRenderer) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc4ff, 0.7); rim.position.set(-4, 2, -4); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 0.35));
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    thumbRenderer = { r, scene, cam };
  }
  const { r, scene, cam } = thumbRenderer;
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.setSize(w, h, false);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  const d = (PRODUCTS[st.product].type === 'short' ? 5.6 : 6.9) / zoom;
  cam.position.set(Math.sin(angle) * d, 0.3, Math.cos(angle) * d);
  cam.lookAt(0, 0, 0);
  const g = buildGarment(st, logo, r);
  scene.add(g);
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');
  scene.remove(g); g.userData.dispose();
  return url;
}
