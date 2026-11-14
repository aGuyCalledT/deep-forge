// Icons for clothes in the store (16 x 16), drawn from code in the colour of the dye.
// Taken from the old character generator (art-src/figure.js, removed): the same flat colours, soft gradients and
// soft outline, so the icons look as before.
const K = [29, 27, 44];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rgb(hex) { const n = parseInt(hex.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex([r, g, b]) { return "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join(""); }
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
function towards(h, target, by) { const d = ((target - h + 540) % 360) - 180; return h + clamp(d, -by, by); }
const RAMP_CACHE = new Map();
/** Dark to light; the base colour sits at index n - 2. Shadows lean violet, lights lean warm. */
function ramp(base, n, soft) {
  const key = base + n + (soft ? "s" : "");
  if (RAMP_CACHE.has(key)) return RAMP_CACHE.get(key);
  const [h, s, l] = toHsl(rgb(base));
  const offs = n >= 5 ? [-0.3, -0.18, -0.08, 0, 0.1] : n === 4 ? [-0.24, -0.11, 0, 0.1] : [-0.16, 0, 0.1];
  const out = offs.map((o) => {
    if (!o) return base;
    const k = soft ? 0.25 : 1;
    const hh = o < 0 ? towards(h, 255, -o * 40 * k) : towards(h, 50, o * 40 * k);
    const ss = clamp(s + (o < 0 ? (soft ? -0.12 : 0.06) : -0.04), 0, 1);
    return hex(fromHsl([hh, ss, clamp(l + o, 0.03, 0.97)]));
  });
  RAMP_CACHE.set(key, out);
  return out;
}
function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); }

// ------------------------------------------------------------------ a figure being drawn

// how many tones each material has, and whether it gets a gentle top-to-bottom gradient (2 = also lighter at the top)
const TONES = { skin: 5, hair: 5, shirt: 5, dress: 5, pants: 4, boot: 4, belt: 3, vest: 4, metal: 4, wood: 4, quilt: 4, fur: 5, shell: 5, crystal: 4, stone: 5, apron: 4, cloth: 4, hat: 5, bone: 3, scale: 5, glow: 3 };
const GRAD = { hair: 2, shirt: 1, dress: 1, pants: 1, vest: 2, fur: 2, shell: 1, stone: 1, hat: 2, scale: 1, apron: 1, cloth: 1 };
const NO_LINE = { gold: 1, belt: 1 };

function fig(w, h) {
  const N = w * h;
  const mat = new Array(N).fill(null), pid = new Int16Array(N).fill(-1), raw = new Array(N).fill(null), tex = new Int8Array(N);
  const F = { w, h, part: 0 };
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x);
  F.at = at;
  F.set = (x, y, m, r) => { x = Math.round(x); y = Math.round(y); const k = at(x, y); if (k < 0) return; mat[k] = m; pid[k] = F.part; raw[k] = r || null; tex[k] = 0; };
  F.next = () => { F.part++; };
  F.mat = (x, y) => { const k = at(Math.round(x), Math.round(y)); return k < 0 ? null : mat[k]; };
  F.is = (x, y, p) => { const k = at(x, y); return k >= 0 && pid[k] === p; };
  F.tex = (x, y, v) => { const k = at(Math.round(x), Math.round(y)); if (k >= 0 && mat[k]) tex[k] = v; };
  F.each = (p, fn) => { for (let k = 0; k < N; k++) if (pid[k] === p && mat[k]) fn(k % w, (k / w) | 0, k); };
  F.texK = (k, v) => { tex[k] = v; };
  F.ellipse = (ex, ey, rx, ry, m, clip) => {
    for (let y = Math.floor(ey - ry - 1); y <= Math.ceil(ey + ry + 1); y++) for (let x = Math.floor(ex - rx - 1); x <= Math.ceil(ex + rx + 1); x++) {
      const u = (x - ex) / (rx + 0.45), v = (y - ey) / (ry + 0.45);
      if (u * u + v * v > 1 || (clip && !clip(x, y))) continue;
      F.set(x, y, m);
    }
  };
  /** Rows y0..y1; span(y) gives [x0, x1] (inclusive, may be fractional) or null. */
  F.rows = (y0, y1, span, m) => {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) { const s = span(y); if (!s) continue; for (let x = Math.round(s[0]); x <= Math.round(s[1]); x++) F.set(x, y, m); }
  };
  F.rect = (x0, y0, ww, hh, m, r) => { for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + ww; x++) F.set(x, y, m, r); };
  /** A thick line with round ends (limbs, handles, tails, legs). */
  F.line = (x0, y0, x1, y1, wid, m) => {
    const r = wid / 2 + 0.05, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++) for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
      const t = clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1);
      const ex = x0 + dx * t - x, ey = y0 + dy * t - y;
      if (ex * ex + ey * ey <= r * r) F.set(x, y, m);
    }
  };
  F.grid = (x0, y0, rows, keys) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== "." && keys[ch]) F.set(x0 + i, y0 + j, keys[ch][0], keys[ch][1]); }));
  /** Resolve to colours with soft outlines. colors: material -> base hex. */
  F.render = (colors) => {
    const grad = [];
    for (let k = 0; k < N; k++) if (mat[k] && !raw[k]) { const y = (k / w) | 0, g = grad[pid[k]] || (grad[pid[k]] = [y, y]); g[0] = Math.min(g[0], y); g[1] = Math.max(g[1], y); }
    const out = new Array(N).fill(null);
    for (let k = 0; k < N; k++) {
      const m = mat[k];
      if (!m) continue;
      const r = raw[k];
      if (r) {
        if (r[0] === "#") { out[k] = r; continue; }
        const [rm, ri] = r.split(":"); const rr = ramp(colors[rm] || "#888888", TONES[rm] || 4, rm === "skin");
        out[k] = rr[clamp(+ri, 0, rr.length - 1)];
        continue;
      }
      const base = colors[m];
      if (!base) continue;
      const n = TONES[m] || 4, rr = ramp(base, n, m === "skin"), x = k % w, y = (k / w) | 0, p = pid[k];
      let idx = n - 2;
      const g = grad[p], gs = GRAD[m] || 0;
      if (gs && g && g[1] - g[0] >= 3) {
        const t = (y - g[0]) / (g[1] - g[0]) + (((x + y) & 1) ? 0.07 : -0.07);
        if (t > 0.68) idx -= 1;
        if (gs > 1 && t < 0.2) idx += 1;
      }
      idx += tex[k];
      // coloured inner line where a part in front begins
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = at(x + dx, y + dy);
        if (q >= 0 && mat[q] && pid[q] > p && !raw[q] && mat[q] !== m && !NO_LINE[mat[q]] && !NO_LINE[m]) { idx = m === "skin" ? Math.min(idx, 1) : 0; break; }
      }
      out[k] = rr[clamp(idx, 0, n - 1)];
    }
    return softOutline(out, w, h);
  };
  return F;
}

function softOutline(px, w, h) {
  const out = px.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    if (px[k]) continue;
    let r = 0, g = 0, b = 0, n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h || !px[Y * w + X]) continue;
      const c = rgb(px[Y * w + X]); r += c[0]; g += c[1]; b += c[2]; n++;
    }
    if (!n) continue;
    out[k] = hex([K[0] + (r / n - K[0]) * 0.34, K[1] + (g / n - K[1]) * 0.34, K[2] + (b / n - K[2]) * 0.34]);
  }
  return out;
}


const C = {
  E: "#2a1e2e", W: "#fbf6ec", blush: "#ec8d86", L: "#c25a6a", M: "#8f3a4f", gold: "#e0b04a", goldL: "#fbe08a", goldD: "#a8762a",
  red: "#b8483e", cream: "#f2e2c0", leaf: "#5f9a5a", pink: "#e88aa8", white: "#fbf6ec", bone: "#efe2c4", lamp: "#ffe9a0",
};


function icon(look, color, slot) {
  const F = fig(16, 16);
  const col = { shirt: color, dress: color, pants: color, boot: color, hat: color, belt: "#5a3a22", vest: "#8c5c40", apron: color };
  if (slot === "top" && look !== "dress") {
    F.rows(3, 13, (y) => y < 7 ? [1 + (y - 3) * 0.2, 14 - (y - 3) * 0.2] : [4, 11], "shirt");
    F.each(F.part, (x, y, k) => { if (y === 3 && x > 5 && x < 10) F.set(x, y, null); if (y === 4 && x > 6 && x < 9) F.set(x, y, null); if (look === "knit" && (x === 7 || x === 8) && y > 5) F.texK(k, (y & 1) ? 1 : -1); if (look === "patched" && x > 4 && x < 8 && y > 8 && y < 12) F.texK(k, -1); if (look === "linen" && y === 6 && x > 4 && x < 7) F.texK(k, 1); if (y === 13) F.texK(k, look === "embroid" ? 2 : -1); });
    if (look === "vest") { F.next(); F.rows(4, 13, () => [4, 6], "vest"); F.next(); F.rows(4, 13, () => [9, 11], "vest"); }
    F.next();
  } else if (look === "dress") {
    F.rows(2, 14, (y) => y < 8 ? [5, 10] : [5 - (y - 8) * 0.6, 10 + (y - 8) * 0.6], "dress");
    F.each(F.part, (x, y, k) => { if (y === 14) F.texK(k, 1); if (y > 9 && (x - 7) % 3 === 0) F.texK(k, -1); });
    F.next(); F.rect(5, 7, 6, 1, "belt"); F.next();
  } else if (slot === "legs") {
    F.rows(2, 14, (y) => y < 6 ? [3, 12] : null, "pants"); F.rect(3, 6, 4, 9, "pants"); F.rect(9, 6, 4, 9, "pants");
    F.each(F.part, (x, y, k) => { if (look === "cuff" && y === 14) F.texK(k, 1); if (look === "patch" && x > 9 && y > 9 && y < 12) F.texK(k, 1); if (look === "seam" && (x === 3 || x === 12) && (y & 1)) F.texK(k, 1); });
    F.next(); F.rect(3, 2, 10, 1, "belt"); F.next();
  } else if (slot === "feet") {
    F.rect(2, 4, 4, 9, "boot"); F.rect(2, 11, 6, 2, "boot"); F.next(); F.rect(9, 4, 4, 9, "boot"); F.rect(9, 11, 6, 2, "boot");
    F.each(F.part, (x, y, k) => { if (y === 12) F.texK(k, -2); if (y === 4) F.texK(k, 1); }); F.next();
  } else if (slot === "hat") {
    if (look === "pointy") F.rows(2, 12, (y) => [8 - (y - 2) * 0.6, 8 + (y - 2) * 0.45], "hat");
    else if (look === "hood") { F.ellipse(7.5, 8, 6, 6, "hat", (x, y) => !(Math.abs(x - 7.5) < 3.5 && y > 6)); }
    else if (look === "flower") { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; F.set(7.5 + Math.cos(a) * 5, 8 + Math.sin(a) * 4, "raw", [C.pink, C.white, "#f2c94a"][i % 3]); F.set(7.5 + Math.cos(a + 0.4) * 5, 8 + Math.sin(a + 0.4) * 4, "raw", C.leaf); } }
    else { F.ellipse(7.5, 10, 6, 6, "hat", (x, y) => y <= 11); if (look === "miner") { F.next(); F.rect(6, 6, 3, 2, "raw", C.lamp); } }
    F.next();
  } else if (slot === "face") {
    for (const x0 of [2, 9]) { F.rect(x0, 6, 5, 1, "raw", color); F.rect(x0, 10, 5, 1, "raw", color); F.rect(x0, 7, 1, 3, "raw", color); F.rect(x0 + 4, 7, 1, 3, "raw", color); F.rect(x0 + 1, 7, 3, 3, "raw", "#cfe4f0"); }
    F.rect(7, 7, 2, 1, "raw", color); F.next();
  } else if (slot === "ears") {
    for (const x0 of [4, 10]) { F.rect(x0, 4, 1, 3, "raw", "#a8762a"); F.ellipse(x0, 9, 1.5, 2, "raw"); F.each(F.part, (x, y) => F.set(x, y, "raw", color)); F.next(); }
  } else if (slot === "apron") {
    F.rows(3, 14, (y) => y < 6 ? [5, 10] : [3, 12], "apron"); F.each(F.part, (x, y, k) => { if (y === 14) F.texK(k, -1); if (y > 8 && y < 11 && x > 5 && x < 10) F.texK(k, -1); }); F.next();
  }
  return { w: 16, h: 16, data: F.render(col) };
}

// ------------------------------------------------------------------ enemies

const cache = new Map();
/** The icon as a canvas: look of the cloth, dye colour, slot (top, legs, feet, hat, face, ears, apron). */
export function wearIcon(look, color, slot) {
const key = look + '|' + color + '|' + slot;
if (cache.has(key)) return cache.get(key);
const img = icon(look, color, slot);
const c = document.createElement('canvas'); c.width = img.w; c.height = img.h;
const g = c.getContext('2d'), id = g.createImageData(img.w, img.h);
img.data.forEach((col, k) => {
  if (!col) return;
  const n = parseInt(col.slice(1), 16);
  id.data[k * 4] = n >> 16; id.data[k * 4 + 1] = (n >> 8) & 255; id.data[k * 4 + 2] = n & 255; id.data[k * 4 + 3] = 255;
});
g.putImageData(id, 0, 0);
cache.set(key, c);
return c;
}
