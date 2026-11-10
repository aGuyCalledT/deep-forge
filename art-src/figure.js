// Figure: the character art of Deep Forge (dwarves, NPCs, enemies, clothing icons), drawn from code.
// Style: flat colours per part, soft gradients top to bottom, texture with a cause (strands, seams,
// stitches, patches, scales), coloured inner lines where parts overlap and a soft outline that takes a
// dark tone of the colour beside it. No rounded 3D shading.
//
// Used in two places: pxl includes this file to bake the enemies into the sprite sheet, and the game
// imports the copy in static/js/figure.js (written by scripts/build-art.mjs) to draw every dwarf with its
// own body, face, clothes, pose and mood.
var Figure = (function () {
  // ------------------------------------------------------------------ colour

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

  /** Turn a picture a quarter to the left (the top goes to the left). */
  function rotLeft(img) {
    const { w, h, data } = img, out = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[(w - 1 - x) * h + y] = data[y * w + x];
    return { w: h, h: w, data: out };
  }
  function crop(img) {
    const { w, h, data } = img;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[y * w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < 0) return { w: 1, h: 1, data: [null], ox: 0, oy: 0 };
    const W = x1 - x0 + 1, H = y1 - y0 + 1, out = new Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = data[(y + y0) * w + x + x0];
    return { w: W, h: H, data: out, ox: x0, oy: y0 };
  }

  // ------------------------------------------------------------------ the look catalogue

  const smooth = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  function profile(keys, t) {
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, w0] = keys[i], [t1, w1] = keys[i + 1];
      if (t <= t1) return smooth(w0, w1, clamp((t - t0) / (t1 - t0 || 1), 0, 1));
    }
    return keys[keys.length - 1][1];
  }

  // five men's and five women's bodies (the study the player picked)
  const BODIES = [
    { name: "Classic", rx: 8.5, ry: 7.5, torsoH: 11, torso: [[0, 6], [0.15, 7.5], [0.6, 7], [1, 7.5]], belly: 0.8, legLen: 3, legW: 4, legGap: 2, bootH: 4, armW: 3, armLen: 9 },
    { name: "Barrel", rx: 8.5, ry: 7, torsoH: 12, torso: [[0, 7], [0.15, 9], [0.6, 9.5], [1, 9]], belly: 1.8, legLen: 2, legW: 4, legGap: 2, bootH: 4, armW: 4, armLen: 9 },
    { name: "Tall", rx: 7.5, ry: 7, torsoH: 13, torso: [[0, 5], [0.15, 6.5], [0.6, 6], [1, 6.5]], legLen: 6, legW: 3, legGap: 2, bootH: 4, armW: 3, armLen: 10 },
    { name: "Brawler", rx: 7.5, ry: 7, torsoH: 13, torso: [[0, 8], [0.18, 10], [0.65, 7], [1, 7]], legLen: 4, legW: 4, legGap: 2, bootH: 5, armW: 4, armLen: 10 },
    { name: "Little", rx: 9.5, ry: 8.5, torsoH: 9, torso: [[0, 5], [0.15, 6.5], [0.6, 6.5], [1, 7]], belly: 1, legLen: 2, legW: 3, legGap: 2, bootH: 4, armW: 3, armLen: 7 },
    { name: "Classic", female: 1, rx: 8, ry: 7.5, torsoH: 13, torso: [[0, 5], [0.15, 6], [0.3, 6.3], [0.55, 4.6], [0.85, 7.2], [1, 7]], bust: 2.6, bustX: 2.6, bustT: 0.3, waistT: 0.55, legLen: 3, legW: 4, legGap: 1, bootH: 4, armW: 2, armLen: 9, armOut: 1 },
    { name: "Hourglass", female: 1, rx: 7.5, ry: 7, torsoH: 15, torso: [[0, 5], [0.13, 6], [0.3, 7], [0.55, 4.3], [0.85, 8], [1, 7.6]], bust: 3, bustX: 2.8, bustT: 0.3, waistT: 0.52, beltH: 2, legLen: 5, legW: 4, legGap: 1, bootH: 4, armW: 2, armLen: 11, armOut: 1 },
    { name: "Slender", female: 1, rx: 7, ry: 7, torsoH: 14, torso: [[0, 4.5], [0.15, 5.5], [0.3, 6], [0.55, 3.8], [0.85, 6.5], [1, 6.2]], bust: 2.4, bustX: 2.3, waistT: 0.53, legLen: 8, legW: 3, legGap: 1, bootH: 4, armW: 2, armLen: 11, armOut: 1 },
    { name: "Sturdy", female: 1, rx: 8.5, ry: 7.5, torsoH: 14, torso: [[0, 6], [0.15, 7.8], [0.3, 8.4], [0.55, 6.5], [0.85, 9.3], [1, 9]], bust: 3.3, bustX: 3.3, waistT: 0.55, beltH: 2, legLen: 3, legW: 5, legGap: 1, bootH: 4, armW: 3, armLen: 10, armOut: 1 },
    { name: "Little", female: 1, rx: 9.5, ry: 8.5, torsoH: 11, torso: [[0, 4.5], [0.15, 5.5], [0.3, 6], [0.55, 4.6], [0.85, 6.8], [1, 6.6]], bust: 2.3, bustX: 2.4, waistT: 0.55, legLen: 3, legW: 3, legGap: 1, bootH: 4, armW: 2, armLen: 8, armOut: 1 },
  ];
  const HAIR_STYLES = ["short", "fringe", "bald", "topknot", "long", "wavy", "braids", "bun", "pigtails", "mohawk"];
  const BEARDS = ["full", "wide", "braid", "fork", "long", "goatee", "chops", "moustache"];
  const NOSES = {
    bulb:   [".cc.", "cdec", "cddc", ".bb."],
    potato: [".cc.", "cdec", "cddec", "cdddc", ".bbb."],
    long:   [".cd.", ".cd.", ".ce.", "cddc", ".bb."],
    broad:  ["....", "cdec", "cdddc", "b..b"],
    button: ["....", ".ce.", ".bb."],
    pointy: ["..d.", ".cd.", ".ce.", "cdd.", ".b.."],
    hooked: [".cd.", ".cde", "cddc", "..b."],
    snub:   ["....", "....", ".ce.", "b..b"],
    tiny:   ["....", ".c..", ".b.."],
  };
  // the same noses from the side (facing right), placed at the edge of the face
  const NOSES_SIDE = {
    bulb:   ["cd.", "dde", "cdd", ".b."],
    potato: ["cdd.", "ddde", "dddd", "cbb."],
    long:   ["c...", "dd..", "dde.", "cddd", ".bb."],
    broad:  ["....", "dde", "dddd", "b.b."],
    button: ["....", "de", "b."],
    pointy: ["c...", "dd..", "dde.", "cddd", "b..."],
    hooked: ["cd..", "ddd.", "ddde", "c.dd", "...b"],
    snub:   ["....", "....", "de.", "dd", "b."],
    tiny:   ["....", "d", "b"],
  };
  const NOSE_NAMES = Object.keys(NOSES);
  const BROWS = {
    bushy:   [["xxxx", 0], [".xxx", -1]],
    thick:   [["xxx", 0]],
    thin:    [[".xx", 0]],
    arched:  [[".x.", -1], ["x.x", 0]],
    stern:   [["xx..", -1], ["..xx", 0]],
    worried: [["..xx", -1], ["xx..", 0]],
    long:    [["xxxxx", 0]],
  };
  const BROW_NAMES = Object.keys(BROWS);
  const MOUTHS = ["smile", "full", "small", "grin", "pout"];
  const EYES = ["#7a4a2a", "#7d8ba0", "#5b7fc0", "#3f8a56", "#c88a2a", "#7a58b0", "#3a3038"];
  const SKINS = ["#f4d3b8", "#f0c8a0", "#e2b08a", "#d9a77c", "#b97f57", "#8d5a3b", "#6e4430"];
  const HAIRS = ["#c4622d", "#7a3b1e", "#e0b04a", "#f2d27a", "#3b2a20", "#1e1a18", "#9a9a9a", "#e8e2d4", "#8a5a2b", "#a8442a"];
  const SHIRT_LOOKS = ["linen", "knit", "embroid", "patched", "vest", "plain", "dress"];
  const PANTS_LOOKS = ["seam", "patch", "cuff"];
  const HATS = ["hood", "miner", "beanie", "pointy", "horned", "flower", "bandana", "helm"];

  // fixed colours
  const C = {
    E: "#2a1e2e", W: "#fbf6ec", blush: "#ec8d86", L: "#c25a6a", M: "#8f3a4f", gold: "#e0b04a", goldL: "#fbe08a", goldD: "#a8762a",
    red: "#b8483e", cream: "#f2e2c0", leaf: "#5f9a5a", pink: "#e88aa8", white: "#fbf6ec", bone: "#efe2c4", lamp: "#ffe9a0",
  };

  // ------------------------------------------------------------------ dwarves (and other people)

  const CW = 44, CH = 52, CX = CW / 2 - 0.5, SOLE = CH - 3;   // one pixel left for the outline

  const VIEW = { idle: "front", talk: "front", sit: "front", sitTalk: "front", eat: "front", drink: "front", walk: "side", work: "side", climb: "back", sleep: "side" };
  const FRAMES = { idle: 2, talk: 4, sit: 2, sitTalk: 4, eat: 4, drink: 2, walk: 4, work: 4, climb: 2, sleep: 2 };
  const SEATED = { sit: 1, sitTalk: 1, eat: 1, drink: 1 };

  /**
   * One frame of a person. s: {body, skin, hair, eye, hairStyle, beard, nose, brows, mouth, freckles,
   * wear: {top: {look, color}, legs: {look, color}, feet: {color}, hat: {look, color}, face: {color}, ears: {color}, apron: {color}},
   * armor, helm (metal colours), pose, frame, mood, tool: {kind, metal}, creature: {ears, tusks, eyes, skinTex}, size}
   * Returns {w, h, ax, ay, data}: data is a list of "#rrggbb" or null, (ax, ay) the point between the feet on the ground.
   */
  function person(s) {
    const pose = s.pose || "idle";
    const frame = (s.frame || 0) % (FRAMES[pose] || 1);
    const view = VIEW[pose] || "front";
    const B = Object.assign({}, BODIES[s.body || 0], s.bodyOverride || {});
    const fem = !!B.female;
    const cw = s.size ? s.size[0] : CW, ch = s.size ? s.size[1] : CH;
    const F = fig(cw, ch);
    const cx = cw / 2 - 0.5, sole = ch - 3;
    const mood = pose === "sleep" ? "sleep" : s.mood || "neutral";
    const wear = s.wear || {};
    const top = wear.top || { look: "plain", color: "#7a8a9a" };
    const dress = top.look === "dress";
    const seated = !!SEATED[pose];
    const L0 = Math.floor(cx), R0 = Math.ceil(cx);

    // ---- vertical layout
    const bob = (pose === "idle" || pose === "sit" || pose === "sleep") && frame === 1 ? 1 : pose === "walk" && frame % 2 === 1 ? -1 : 0;
    const bootTop = sole - B.bootH + 1;
    const legTop = seated ? bootTop - 2 : bootTop - B.legLen;
    const torsoBot = legTop + bob;
    const torsoTop = torsoBot - B.torsoH;
    const hy = torsoTop + 2 - B.ry;
    const waistT = B.waistT ?? 0.62;
    const beltY = torsoTop + Math.round(B.torsoH * waistT);
    const hw = (t) => profile(B.torso, t);
    const belly = (t) => (B.belly ? B.belly * Math.max(0, Math.sin(Math.PI * clamp((t - 0.3) / 0.7, 0, 1))) : 0);
    const half = (y) => hw((y - torsoTop) / B.torsoH) + belly((y - torsoTop) / B.torsoH);
    const colors = {
      skin: s.skin || SKINS[1], hair: s.hair || HAIRS[0], shirt: top.color, dress: top.color,
      pants: (wear.legs && wear.legs.color) || "#6a5047", boot: (wear.feet && wear.feet.color) || "#5c3c30", belt: "#5a3a22",
      vest: "#8c5c40", metal: s.toolMetal || "#9a9aa6", armor: s.armor, helm: s.helm, wood: "#8a5e3a", quilt: s.quilt || "#b8607e",
      hat: (wear.hat && wear.hat.color) || "#6a8fd0", apron: (wear.apron && wear.apron.color) || "#c9a27a", bone: C.bone, cloth: "#8a7a6a",
    };
    // metal parts use their own material keys so each gets its own ramp
    const TONE_ALIAS = { armor: "metal", helm: "metal" };
    for (const k in TONE_ALIAS) if (!TONES[k]) TONES[k] = 4;

    // ======== side view helpers (facing right) ========
    const hxs = cx + 1;                    // head centre in side view
    const depth = (t) => hw(t) * 0.62;

    // ---------- long hair behind everything
    const hs = s.hairStyle || "short";
    if (hs === "long" || hs === "wavy") {
      const bot = torsoTop + Math.round(B.torsoH * (hs === "wavy" ? 0.7 : 0.45));
      const ox = view === "side" ? hxs - 2.5 : cx;
      F.rows(hy - 2, bot, (y) => {
        const h2 = (view === "side" ? B.rx * 0.8 : B.rx + 1.3) - ((y - hy) / (bot - hy)) * 1.5 + (hs === "wavy" ? Math.round(Math.sin(y * 0.8)) * 0.6 : 0);
        return [ox - h2, ox + h2];
      }, "hair");
      F.each(F.part, (x, y, k) => { if ((((x + (hs === "wavy" ? Math.round(Math.sin(y * 0.8)) : 0)) % 3) + 3) % 3 === 0) F.texK(k, -1); });
      F.next();
    }

    // ---------- legs and boots
    if (view === "front" || view === "back") {
      const gap = B.legGap ?? 2;
      const lx = [Math.round(cx - gap / 2 + 0.5) - B.legW, Math.round(cx + gap / 2 + 0.5)];
      lx.forEach((x0, i) => {
        const lift = view === "back" && frame === i ? 2 : 0;
        if (seated) {
          // thighs come towards us, so they read as short rounded blocks
          F.rect(x0 - (i ? 0 : 1), torsoBot - 1, B.legW + 1, bootTop - torsoBot + 1, dress ? "pants" : "pants");
        } else F.rect(x0, legTop - 1, B.legW, bootTop - legTop + 1 - lift, "pants");
        pantsTexture(F, wear.legs, x0, legTop, bootTop - lift, B.legW, i, view);
        F.next();
      });
      lx.forEach((x0, i) => {
        const lift = view === "back" && frame === i ? 2 : 0;
        const bx = x0 - (i ? 0 : 1), bw = B.legW + 1;
        F.rect(bx, bootTop - lift, bw, B.bootH, "boot");
        if (view === "front") { F.set(i ? bx + bw : bx - 1, sole - lift, "boot"); F.set(i ? bx + bw : bx - 1, sole - 1 - lift, "boot"); }
        bootTexture(F, bx, bootTop - lift, bw, sole - lift, view);
        F.next();
      });
    } else {
      // side: back leg first (a little darker), then the front leg
      const hipX = cx, hipY = torsoBot - 1;
      const strides = pose === "walk" ? [[4, 0, -4, 0], [-4, 0, 4, 0]] : pose === "work" ? [[3, 3, 3, 3], [-2, -2, -2, -2]] : [[1, 1], [-1, -1]];
      const lifts = pose === "walk" ? [[0, 1, 0, 0], [0, 0, 0, 1]] : [[0, 0, 0, 0], [0, 0, 0, 0]];
      for (const i of [1, 0]) {
        const fx = hipX + strides[i][frame % strides[i].length], lift = lifts[i][frame % 4];
        const footY = bootTop - lift;
        F.line(hipX, hipY, fx, footY, Math.max(3, B.legW - 1), "pants");
        if (i === 1) F.each(F.part, (x, y, k) => F.texK(k, -1));
        else pantsTexture(F, wear.legs, Math.round(fx) - 1, legTop, footY, 3, 0, "side");
        F.next();
        const bx = Math.round(fx - 2);
        F.rect(bx, footY, 5, B.bootH, "boot");
        F.rect(bx + 5, footY + B.bootH - 2, 1, 2, "boot");                  // the toe points forward
        bootTexture(F, bx, footY, 6, footY + B.bootH - 1, "side");
        if (i === 1) F.each(F.part, (x, y, k) => F.texK(k, -1));
        F.next();
      }
    }

    // ---------- arms behind the body (side view: the far arm)
    const arms = armPlan();
    if (view === "side") { drawArm(arms.far, true); }

    // ---------- torso
    const shirtMat = dress ? "dress" : "shirt";
    const torsoPart = F.part;
    if (view === "side") {
      F.rows(torsoTop, torsoBot, (y) => {
        const t = (y - torsoTop) / B.torsoH, d = depth(t);
        let front = cx + d + belly(t) * 1.4;
        if (B.bust) { const bt = (t - (B.bustT ?? 0.32)) / 0.16; if (Math.abs(bt) < 1) front += Math.sqrt(1 - bt * bt) * B.bust * 0.75; }
        return [cx - d * 0.95, front];
      }, shirtMat);
    } else {
      const lower = fem && !dress;
      F.rows(torsoTop, lower ? beltY : torsoBot, (y) => [cx - half(y), cx + half(y)], shirtMat);
      F.next();
      if (lower) { F.rows(beltY + 1, torsoBot, (y) => [cx - half(y), cx + half(y)], "pants"); F.next(); }
    }
    if (view === "side") F.next();
    // a dress flares into a skirt over the legs
    if (dress) {
      const hem = seated ? bootTop - 1 : Math.min(bootTop - 1, torsoBot + Math.round(B.legLen * 0.6) + 2);
      if (view === "side") F.rows(beltY, hem, (y) => [cx - depth(1) - (y - beltY) * 0.25, cx + depth(1) + 1 + (y - beltY) * 0.35], "dress");
      else F.rows(beltY, hem, (y) => { const hh = half(Math.min(y, torsoBot)) + (y > torsoBot ? (y - torsoBot) * 0.45 : 0) + 0.5; return [cx - hh, cx + hh]; }, "dress");
      F.each(F.part, (x, y, k) => { if (y >= hem - 1) F.texK(k, ((x + y) & 1) ? 1 : 0); else if (y > beltY + 2 && (x - L0) % 4 === 0) F.texK(k, -1); });   // folds and a hem
      F.next();
    }
    // bust (front)
    let bustParts = [];
    if (B.bust && view === "front") {
      const by = torsoTop + Math.round(B.torsoH * (B.bustT ?? 0.32));
      for (const sgn of [-1, 1]) {
        F.ellipse(cx + sgn * B.bustX + (sgn > 0 ? 0.5 : -0.5), by, B.bust, B.bust * 0.85, shirtMat, (x, y) => F.is(x, y, torsoPart) && (sgn < 0 ? x <= L0 : x >= R0));
        const p = F.part;
        F.each(p, (x, y, k) => { if (!F.is(x, y + 1, p) && y > by) F.texK(k, -2); });
        bustParts.push(p);
        F.next();
      }
    }
    const inTorso = (x, y) => F.is(x, y, torsoPart) || bustParts.some((p) => F.is(x, y, p));
    shirtTexture(top.look, inTorso);
    // armour plate
    if (s.armor) {
      if (view === "side") F.rows(torsoTop + 1, beltY - 1, (y) => { const t = (y - torsoTop) / B.torsoH; return [cx - depth(t) * 0.8, cx + depth(t) + belly(t) * 1.3 + (B.bust ? 1 : 0)]; }, "armor");
      else F.rows(torsoTop + 1, beltY - 1, (y) => [cx - half(y) + 0.6, cx + half(y) - 0.6], "armor");
      F.each(F.part, (x, y, k) => { if (Math.abs(x - cx) < 0.6 && view !== "side") F.texK(k, 1); if (y === torsoTop + 2 && (x & 1)) F.texK(k, 1); });
      F.next();
    }
    // apron
    if (wear.apron && view !== "back") {
      const ax0 = view === "side" ? cx : cx - half(torsoTop + 3) + 1.5, ax1 = view === "side" ? cx + depth(0.5) + 1.5 : cx + half(torsoTop + 3) - 1.5;
      F.rows(torsoTop + 3, Math.min(bootTop - 1, torsoBot + 3), (y) => [ax0 - (y > beltY ? 1 : 0), ax1 + (y > beltY ? 1 : 0)], "apron");
      F.each(F.part, (x, y, k) => { if (y === torsoBot + 3 || y === Math.min(bootTop - 1, torsoBot + 3)) F.texK(k, (x & 1) ? -1 : 0); });
      F.next();
    }
    // belt and buckle
    if (!dress || true) {
      const bh = B.beltH || 1;
      for (let j = 0; j < bh; j++) for (let x = 0; x < cw; x++) { const m = F.mat(x, beltY + j); if (m && m !== "skin" && m !== "hair" && m !== "boot") F.set(x, beltY + j, "belt"); }
      F.each(F.part, (x, y, k) => { if (x % 3 === 0) F.texK(k, -1); });
      F.next();
      const bx = view === "side" ? Math.round(cx + depth(waistT) + belly(waistT)) : L0;
      for (let j = 0; j < bh; j++) { F.set(bx, beltY + j, "gold", j ? C.goldD : C.goldL); F.set(bx + (view === "side" ? 0 : 1), beltY + j, "gold", C.gold); }
      F.next();
    }
    // lacing on a bodice, buttons on a shirt (front)
    if (view === "front") {
      if (fem && top.look !== "vest") for (let y = torsoTop + 3; y < beltY - 1; y += 2) { F.set(L0, y, "gold", C.gold); F.set(R0, y, "gold", C.gold); }
      else if (top.look !== "vest" && top.look !== "dress" && !s.armor) for (let y = torsoTop + 3; y < beltY - 1; y += 3) F.set(R0, y, "gold", C.goldL);
      F.next();
    }

    // ---------- arms in front
    if (view === "side") drawArm(arms.near, false);
    else { drawArm(arms.left, false); drawArm(arms.right, false); }

    // ---------- head
    const hx = view === "side" ? hxs : cx;
    const rx = view === "side" ? B.rx * 0.88 : B.rx;
    const ry = B.ry;
    const eyeY = Math.round(hy + ry * 0.15);
    const cr = s.creature || {};
    // ears
    if (view === "side") { earAt(hx - rx * 0.15, hy + 1.5, 1); }
    else for (const sg of [-1, 1]) earAt(hx + sg * (rx + 0.3), hy + 1.5, sg);
    F.ellipse(hx, hy, rx, ry, "skin");
    const headPart = F.part;
    if (cr.skinTex === "cracks") F.each(headPart, (x, y, k) => { if ((x * 3 + y * 5) % 11 === 0) F.texK(k, -1); });
    if (cr.skinTex === "warts") F.each(headPart, (x, y, k) => { if ((x * 7 + y * 3) % 17 === 0) F.texK(k, 1); });
    F.next();
    const faceEdge = (y) => { let m = -1; for (let x = 0; x < cw; x++) if (F.is(x, y, headPart)) m = x; return m; };

    let noseBot = eyeY + 2;
    if (view !== "back") {
      // nose
      const noseName = s.nose || (fem ? "tiny" : "bulb");
      if (view === "front") {
        const nose = NOSES[noseName] || NOSES.bulb, nw = Math.max(...nose.map((r) => r.length)), long = nose.length > 4 ? 1 : 0;
        nose.forEach((row, j) => [...row].forEach((chh, i) => { if (chh !== ".") F.set(L0 - Math.floor((nw - 1) / 2) + i, eyeY + 1 + j - long, "skin", "skin:" + ("abcde".indexOf(chh))); }));
        noseBot = eyeY + nose.length - long;
      } else {
        const nose = NOSES_SIDE[noseName] || NOSES_SIDE.bulb, long = nose.length > 4 ? 1 : 0;
        nose.forEach((row, j) => {
          const y = eyeY + 1 + j - long, ex = faceEdge(y);
          [...row].forEach((chh, i) => { if (chh !== ".") F.set(ex + i, y, "skin", "skin:" + ("abcde".indexOf(chh))); });
        });
        noseBot = eyeY + nose.length - long;
      }
      F.next();
      // tusks (trolls, ogres)
      if (cr.tusks) {
        if (view === "front") for (const sg of [-1, 1]) { F.set(sg < 0 ? L0 - 2 : R0 + 2, noseBot + 2, "bone", "bone:2"); F.set(sg < 0 ? L0 - 2 : R0 + 2, noseBot + 1, "bone", "bone:1"); }
        else { const ex = faceEdge(noseBot + 2); F.set(ex, noseBot + 1, "bone", "bone:1"); F.set(ex, noseBot + 2, "bone", "bone:2"); }
        F.next();
      }
    }

    // ---------- beard and moustache (always the hair colour)
    const beard = fem ? null : s.beard;
    if (beard && view !== "back") drawBeard(beard);
    else if (beard && view === "back") { for (const sg of [-1, 1]) F.ellipse(hx + sg * (rx - 1.2), hy + ry * 0.55, 1.6, 2.2, "hair"); F.next(); }
    // ---------- mouth
    if (view !== "back") drawMouth();
    // ---------- eyes, cheeks, freckles
    if (view !== "back") drawEyes();
    // ---------- hair on top
    drawHair();
    // ---------- brows
    if (view !== "back") drawBrows();
    // ---------- hats, helmets, glasses, earrings
    if (s.helm) drawHat({ look: "helm", color: s.helm });
    else if (wear.hat) drawHat(wear.hat);
    if (wear.face && view !== "back") drawGlasses(wear.face.color);
    if (wear.ears) drawEarrings(wear.ears.color);
    // ---------- things in hand
    drawHeld();

    // ---------- sleep: a quilt over the body, then lie down
    if (pose === "sleep") {
      const top0 = torsoTop + 3 + (frame ? 0 : 0);
      F.rows(top0, sole, (y) => [cx - depth(0.6) - 1.5, cx + depth(0.4) + 2.5 + (frame && y < top0 + 4 ? 1 : 0) + (B.belly || B.bust ? 1 : 0)], "quilt");
      F.each(F.part, (x, y, k) => { const a = Math.floor((x - 2) / 4) + Math.floor((y - top0) / 4); if (a & 1) F.texK(k, -1); if ((y - top0) % 4 === 0 && (x & 1)) F.texK(k, 1); if (y === top0) F.texK(k, 1); });
      F.next();
    }

    let img = { w: cw, h: ch, data: F.render(colors) };
    if (pose === "sleep") {
      img = crop(rotLeft(img));
      return { w: img.w, h: img.h, ax: Math.round(img.w / 2), ay: img.h - 1, data: img.data };
    }
    return { w: cw, h: ch, ax: Math.round(cx + 0.5), ay: sole + 1, data: img.data };

    // ======================================================== helpers (hoisted)

    function earAt(x, y, sg) {
      if (cr.ears === "pointy") { F.line(x, y, x + sg * 3.5, y - 2.5, 2, "skin"); }
      else if (cr.ears === "none") return;
      else F.ellipse(x, y, 1.2, 1.7, "skin");
      F.next();
    }

    function armPlan() {
      const sh = hw(0.12);
      const out = B.armOut || 0;
      const sy = torsoTop + 1.5;
      if (view === "front" || view === "back") {
        const sxL = cx - sh - B.armW / 2 + 1.5, sxR = cx + sh + B.armW / 2 - 1.5;
        const down = (sx, sg) => ({ s: [sx, sy], h: [sx + sg * out, sy + B.armLen] });
        let left = down(sxL, -1), right = down(sxR, 1);
        const chest = torsoTop + 4, mouthY = noseY() + 3;
        if (pose === "talk" || pose === "sitTalk") {
          if (frame === 1) right = { s: [sxR, sy], h: [cx + 4, chest] };
          if (frame === 2) right = { s: [sxR, sy], h: [sxR + 3, torsoTop - 2] };
          if (frame === 3) left = { s: [sxL, sy], h: [cx - 4, chest + 1] };
        }
        if (seated && pose === "sit") { left = { s: [sxL, sy], h: [cx - 3.5, torsoBot + 1] }; right = { s: [sxR, sy], h: [cx + 3.5, torsoBot + 1] }; }
        if (pose === "eat") {
          left = { s: [sxL, sy], h: [cx - 2.5, torsoBot - 1] };
          right = { s: [sxR, sy], h: [[cx + 2.5, torsoBot - 1], [cx + 3, torsoTop + 3], [cx + 1, mouthY], [cx + 3, torsoTop + 3]][frame] };
        }
        if (pose === "drink") right = { s: [sxR, sy], h: frame ? [cx + 2, mouthY] : [cx + 4, chest] };
        if (view === "back") {
          const up = (sx, sg) => ({ s: [sx, sy], h: [sx + sg * 1, torsoTop - 7] });
          if (frame === 0) left = up(sxL, -1); else right = up(sxR, 1);
        }
        return { left, right };
      }
      // side
      const sx = cx + 0.5;
      const swing = pose === "walk" ? [-3, 0, 3, 0][frame] : 0;
      let near = { s: [sx, sy], h: [sx + swing, sy + B.armLen] }, far = { s: [sx - 1, sy], h: [sx - 1 - swing, sy + B.armLen] };
      if (pose === "work") {
        const hands = [[cx - 3, torsoTop - 7], [cx + 2, torsoTop - 8], [cx + 8, torsoTop + 6], [cx + 6, torsoTop + 2]][frame];
        near = { s: [sx, sy], h: hands };
        far = { s: [sx - 1, sy], h: [hands[0] - 1.5, hands[1] + 1.5] };
      }
      if (pose === "sleep") { near = { s: [sx, sy], h: [cx + 3, torsoTop + 5] }; far = { s: [sx - 1, sy], h: [cx + 2, torsoTop + 6] }; }
      return { near, far };
    }

    function noseY() { return Math.round(hy + B.ry * 0.15) + 3; }

    function drawArm(a, behind) {
      if (!a) return;
      const [sx, sy] = a.s, [hx2, hy2] = a.h;
      const outward = sx < cx ? -1 : 1;
      const ex = (sx + hx2) / 2 + (view === "side" ? -1 : outward * 1.2), ey = Math.max(sy + 3, (sy + hy2) / 2 + 1.5);
      const sleeve = dress ? "dress" : "shirt";
      F.line(sx, sy, ex, ey, B.armW, sleeve);
      F.line(ex, ey, hx2, hy2, B.armW - (B.armW > 2 ? 0.5 : 0), sleeve);
      const p = F.part;
      // the cuff catches a little light
      F.each(p, (x, y, k) => { if (Math.hypot(x - hx2, y - hy2) < 1.6) F.texK(k, 1); if (behind) F.texK(k, -1); });
      if (s.armor) F.each(p, (x, y, k) => { if (Math.hypot(x - sx, y - sy) < 2.2) { F.set(x, y, "armor"); } });
      F.next();
      F.ellipse(hx2, hy2 + 0.6, B.armW / 2 + 0.15, 1.3, "skin");
      if (behind) F.each(F.part, (x, y, k) => F.texK(k, -1));
      F.next();
    }

    function drawBeard(style) {
      const bTop = eyeY + 2, len = { full: 9, wide: 12, braid: 13, fork: 11, long: 15, goatee: 5, chops: 6, moustache: 0 }[style] ?? 9;
      const wid = rx * ({ wide: 1, braid: 0.85, goatee: 0.45, chops: 1 }[style] || 0.9);
      if (style !== "moustache") {
        for (let y = bTop; y <= bTop + len; y++) {
          const t = (y - bTop) / len;
          if (view === "side") {
            // from the cheek under the ear, forward to the chin and down
            const ex = faceEdge(Math.min(y, Math.round(hy + ry * 0.6)));
            let x0 = hx - rx * 0.25 + t * 2.5, x1 = (ex > 0 ? ex : hx + rx) + 1 - t * (style === "wide" ? 1 : 3);
            if (style === "goatee") x0 = x1 - 3;
            if (style === "chops") { if (t > 0.6) continue; x1 = hx + rx * 0.3; }
            if (style === "braid" && t > 0.45) { x0 = x1 - 3; x1 = x1 - 1; }
            if (style === "fork" && t > 0.55) { x0 = x1 - 4; }
            for (let x = Math.round(x0); x <= Math.round(x1); x++) {
              if (y <= noseBot && x > hx + rx * 0.3) continue;
              F.set(x, y, "hair");
            }
            continue;
          }
          const hh = wid * (style === "wide" ? 1.05 - t * 0.3 : 1 - t * t * 0.75);
          if (style === "fork" && t > 0.55) { for (const sg of [-1, 1]) for (let x = Math.round(hx + sg * 2.5 - 1.2); x <= Math.round(hx + sg * 2.5 + 1.2); x++) F.set(x, y, "hair"); continue; }
          if (style === "braid" && t > 0.45) { for (let x = L0 - 1; x <= R0 + 1; x++) { F.set(x, y, "hair"); if ((x + y) % 3 === 0) F.tex(x, y, -1); } continue; }
          if (style === "chops") { if (t > 0.7) continue; for (const sg of [-1, 1]) for (let x = Math.round(hx + sg * (rx - 2.5) - 1.5); x <= Math.round(hx + sg * (rx - 2.5) + 1.5); x++) F.set(x, y, "hair"); continue; }
          for (let x = Math.round(hx - hh); x <= Math.round(hx + hh); x++) {
            if (y <= noseBot && Math.abs(x - hx) < 2.6) continue;
            if (y === bTop && Math.abs(x - hx) < hh - 2) continue;
            F.set(x, y, "hair");
          }
        }
        // strands fan out from under the nose, like the hair
        const p = F.part;
        F.each(p, (x, y, k) => {
          const ang = Math.atan2(y - (bTop - 7), x - hx) * 8, f = ang - Math.floor(ang);
          if (f < 0.22) F.texK(k, -1); else if (f > 0.55 && f < 0.7 && y < bTop + len * 0.6) F.texK(k, 1);
        });
        if (style === "braid") for (let y = bTop + Math.ceil(len * 0.5) + 2; y <= bTop + len; y += 4) {
          const bx = view === "side" ? faceEdge(Math.round(hy + ry * 0.6)) - 1 : L0;
          F.set(bx, y, "gold", C.goldL); F.set(bx + 1, y, "gold", C.gold);
        }
        F.next();
      }
      // moustache
      const my = noseBot + 1;
      if (view === "side") {
        const ex = faceEdge(my);
        for (let i = -3; i <= 1; i++) F.set(ex + i, my, "hair");
        for (let i = -2; i <= 0; i++) F.set(ex + i, my + 1, "hair");
        F.tex(ex - 1, my, 1);
      } else for (const sg of [-1, 1]) {
        const xs = sg < 0 ? [L0 - 1, L0 - 2, L0 - 3, L0 - 4] : [R0 + 1, R0 + 2, R0 + 3, R0 + 4];
        xs.forEach((x, k) => { F.set(x, my + (k === 3 ? 1 : 0), "hair"); if (k < 3) F.set(x, my + 1, "hair"); if (k === 1) F.tex(x, my, 1); });
        F.set(sg < 0 ? L0 : R0, my + 1, "hair");
      }
      F.next();
    }

    function drawMouth() {
      const open = (pose === "talk" || pose === "sitTalk") && frame % 2 === 1 || pose === "eat" && frame === 2;
      const chew = pose === "eat" && frame === 3;
      if (pose === "drink" && frame === 1) return;               // the mug hides it
      const coverY = noseBot + (beard ? 3 : 2);
      if (view === "side") {
        const y = coverY, ex = faceEdge(y);
        if (beard && !open && mood === "neutral") return;
        F.set(ex - 1, y, "raw", open ? C.M : mood === "angry" ? C.M : C.L);
        if (open || mood === "happy") F.set(ex - 2, y + (mood === "happy" && !open ? -1 : 0), "raw", C.M);
        F.next();
        return;
      }
      let shape;
      if (open) shape = [".MM.", ".LL."];
      else if (chew) shape = [".LL."];
      else if (mood === "sleep") shape = [".M."];
      else if (mood === "angry") shape = beard ? ["MMMM"] : [".MM.", "M..M"];
      else if (mood === "happy") shape = beard ? [".LL."] : { smile: ["M..M", ".LL."], full: ["M..M", ".LL."], small: ["M..M", ".L."], grin: ["MWWM", ".MM."], pout: ["M..M", ".LL."] }[s.mouth || "smile"];
      else shape = beard ? null : { smile: [".LL."], full: [".LL.", "MLLM"], small: [".LM."], grin: [".LL.", ".MM."], pout: [".L.", ".M."] }[s.mouth || "smile"];
      if (!shape) return;
      shape.forEach((row, j) => [...row].forEach((chh, i) => { if (chh !== ".") F.set(L0 - 1 + i, coverY + j, "raw", chh === "M" ? C.M : chh === "L" ? C.L : C.W); }));
      F.next();
    }

    function drawEyes() {
      const iris = s.eye || EYES[0];
      const eyeDX = Math.round(B.rx * 0.42);
      const eyes = view === "side" ? [Math.round(hx + rx * 0.45)] : [L0 - eyeDX - 1, R0 + eyeDX];
      const blink = mood === "sleep" || (pose === "idle" && frame === 1 && (s.blink || 0) % 3 === 0);
      for (const [i, ex] of eyes.entries()) {
        const right = view === "side" || i === 1;
        const inner = right ? ex : ex + 1, outer = right ? ex + 1 : ex;
        if (blink) {
          if (view === "side") { F.set(ex, eyeY + 1, "raw", C.E); }
          else { F.set(ex, eyeY + 1, "raw", C.E); F.set(ex + 1, eyeY + 1, "raw", C.E); F.set(outer, eyeY, "raw", C.E); }
        } else if (cr.eyes === "blind") {
          for (const dx of view === "side" ? [0] : [0, 1]) { F.set(ex + dx, eyeY, "raw", "#d8dce6"); F.set(ex + dx, eyeY + 1, "raw", "#b8bcc8"); }
        } else if (cr.eyes === "glow") {
          for (const dx of view === "side" ? [0] : [0, 1]) { F.set(ex + dx, eyeY, "raw", "#fff2a0"); F.set(ex + dx, eyeY + 1, "raw", "#f0a030"); }
        } else if (view === "side") {
          if (fem) F.set(ex + 1, eyeY - 1, "raw", C.E);
          F.set(ex, eyeY, "raw", mood === "angry" ? C.E : C.W);
          F.set(ex, eyeY + 1, "raw", iris);
          F.set(ex - 1, eyeY, "raw", C.E); F.set(ex - 1, eyeY + 1, "raw", C.E);
        } else {
          if (fem) { F.set(ex, eyeY - 1, "raw", C.E); F.set(ex + 1, eyeY - 1, "raw", C.E); F.set(right ? ex + 2 : ex - 1, eyeY - 2, "raw", C.E); }
          F.set(outer, eyeY, "raw", C.E); F.set(inner, eyeY, "raw", mood === "angry" ? C.E : C.W);
          F.set(ex, eyeY + 1, "raw", iris); F.set(ex + 1, eyeY + 1, "raw", iris);
          if (B.ry >= 8.5 && mood !== "angry") { F.set(outer, eyeY + 2, "raw", C.E); F.set(inner, eyeY + 2, "raw", iris); }
        }
        if (view !== "side" && !cr.eyes) {
          const cy = eyeY + 2 + (fem ? 1 : 0) + (B.ry >= 8.5 ? 1 : 0);
          const blush = mood === "angry" ? "#e0605a" : C.blush;
          F.set(outer + (right ? 1 : -1), cy, "raw", blush); F.set(outer, cy, "raw", blush);
          if (s.freckles) for (const [fx, fy] of [[-1, 0], [1, 1], [3, 0]]) F.set(right ? ex + fx : ex + 1 - fx, cy + fy, "skin", "skin:1");
        }
      }
      F.next();
    }

    function drawHair() {
      const forehead = Math.round(hy - ry * 0.42);
      const crownY = hy - ry - 4;
      const strands = (p) => F.each(p, (x, y, k) => {
        const a = Math.atan2(y - crownY, x - hx) * 7, f = a - Math.floor(a);
        if (f < 0.22) F.texK(k, -1); else if (f > 0.55 && f < 0.7 && y < forehead) F.texK(k, 1);
      });
      if (hs === "bald") {
        if (view === "back") { for (const sg of [-1, 1]) F.ellipse(hx + sg * (rx - 1.5), hy + 1, 2, 2.6, "hair"); F.next(); return; }
        F.set(Math.round(hx - rx * 0.35), Math.round(hy - ry * 0.7), "skin", "skin:4"); F.set(Math.round(hx - rx * 0.35) + 1, Math.round(hy - ry * 0.7), "skin", "skin:4");
        if (view === "side") { F.ellipse(hx - rx * 0.45, hy + 0.5, 1.6, 2.4, "hair"); F.next(); }
        else for (const sg of [-1, 1]) { F.ellipse(hx + sg * (rx - 0.3), hy + 0.5, 1.3, 2.4, "hair"); F.next(); }
        return;
      }
      if (hs === "mohawk") {
        const y0 = hy - ry - 3;
        if (view === "side") F.rows(y0, hy - ry * 0.3, (y) => [hx - rx * 0.6, hx + rx * 0.3 - (y - y0) * 0.1], "hair");
        else F.rows(y0, hy - ry * 0.4, () => [L0 - 1, R0 + 1], "hair");
        strands(F.part); F.next();
        if (view !== "back") { for (const sg of view === "side" ? [-1] : [-1, 1]) F.ellipse(hx + sg * (rx - 0.6), hy, 1, 2, "hair"); F.next(); }
        return;
      }
      F.ellipse(hx, hy - 0.6, rx + 0.7, ry + 0.5, "hair", (x, y) => {
        if (view === "back") return y <= hy + ry * 0.45;
        if (view === "side") { if (x < hx + rx * 0.2) return y <= hy + 1.5 + (fem ? 2 : 0); return y <= forehead + (hs === "fringe" && (x & 1) ? 1 : 0); }
        const ax = Math.abs(x - hx) / rx;
        if (ax > 0.82) return y <= hy + (fem ? 3 : 1);
        if (ax > 0.6) return y <= forehead + 2;
        return y <= forehead + (hs === "fringe" && (x & 1) ? 1 : 0);
      });
      strands(F.part);
      F.next();
      if (hs === "topknot" || hs === "bun") {
        const kx = view === "side" ? hx - rx * 0.3 : hx;
        F.ellipse(kx, hy - ry - (hs === "bun" ? 0.5 : 1), hs === "bun" ? 2.6 : 1.8, hs === "bun" ? 2.1 : 1.6, "hair"); strands(F.part); F.next();
        F.set(Math.floor(kx), Math.round(hy - ry + 1), "gold", C.goldL); F.set(Math.ceil(kx), Math.round(hy - ry + 1), "gold", C.gold); F.next();
      }
      if (hs === "braids" || hs === "pigtails") {
        const sides = view === "side" ? [-1] : [-1, 1];
        for (const sg of sides) {
          const bx = view === "side" ? hx - rx * 0.55 : hx + sg * (rx + (hs === "pigtails" ? 1.3 : -0.6));
          const len = hs === "pigtails" ? 7 : B.torsoH + 1;
          for (let y = Math.round(hy); y < hy + len; y++) {
            const wob = hs === "braids" ? (y % 3 === 0 ? sg : 0) * 0.5 : 0;
            for (let x = Math.round(bx - 1 + wob); x <= Math.round(bx + 1 + wob); x++) { F.set(x, y, "hair"); if (y % 3 === 2) F.tex(x, y, -1); }
          }
          F.next();
          F.set(Math.round(bx), Math.round(hy + len), "gold", C.goldL); F.set(Math.round(bx) - 1, Math.round(hy + len), "gold", C.gold); F.next();
        }
      }
      if ((hs === "long" || hs === "wavy") && view === "front") {
        for (const sg of [-1, 1]) { for (let y = Math.round(hy - 1); y < hy + 5; y++) for (let x = 0; x < 2; x++) { F.set(Math.round(hx + sg * (rx - x + 0.4)), y, "hair"); if (x) F.tex(Math.round(hx + sg * (rx - x + 0.4)), y, -1); } F.next(); }
      }
    }

    function drawBrows() {
      let shape = BROWS[s.brows || (fem ? "arched" : "bushy")] || BROWS.bushy;
      if (mood === "angry") shape = BROWS.stern;
      const lift = mood === "happy" ? -1 : 0;
      const eyeDX = Math.round(B.rx * 0.42);
      const by = eyeY - 2 - (fem ? 1 : 0) + lift;
      if (view === "side") {
        const ex = Math.round(hx + rx * 0.45);
        const row = shape[0][0];
        for (let j = 0; j < Math.min(3, row.replace(/\./g, "").length + 1); j++) F.set(ex + 1 - j, by + (mood === "angry" && j === 0 ? 1 : 0), "hair");
        F.next();
        return;
      }
      const eyes = [L0 - eyeDX - 1, R0 + eyeDX];
      for (const [i, ex] of eyes.entries()) {
        for (const [row, dy] of shape) [...row].forEach((chh, j) => {
          if (chh === ".") return;
          F.set(i ? ex + (row.length - 1) - j : ex + 1 - (row.length - 1) + j, by + dy, "hair");
        });
        F.next();
      }
    }

    function drawHat(hat) {
      const look = hat.look, mat = look === "helm" || look === "horned" ? "helm" : "hat";
      if (mat === "helm") colors.helm = hat.color;
      else colors.hat = hat.color;
      const forehead = Math.round(hy - ry * 0.42);
      const band = forehead + 1;
      const side = view === "side";
      const domeClip = (x, y) => y <= band;
      if (look === "hood") {
        F.ellipse(hx - (side ? 1 : 0), hy + 0.3, rx + 1.4, ry + 1.3, "hat", (x, y) => {
          if (side) return !(x > hx + rx * 0.05 && y > forehead - 1) || y > hy + ry * 0.7;
          return !(Math.abs(x - hx) < rx * 0.72 && y > forehead - 1);
        });
        F.each(F.part, (x, y, k) => { if (y === forehead - 1 || (side ? x === Math.round(hx + rx * 0.05) : Math.abs(Math.abs(x - hx) - rx * 0.72) < 0.6)) F.texK(k, 1); });
        F.next();
        return;
      }
      if (look === "pointy") {
        const tip = hy - ry - 8;
        F.rows(tip, band, (y) => { const t = (y - tip) / (band - tip); const hh = 0.5 + t * (rx + 0.6); return [hx - hh + (side ? -t * 2 : 0) + (1 - t) * 2, hx + hh + (side ? -t * 2 : 0) + (1 - t) * 2]; }, "hat");
        F.rows(band, band + 1, () => [hx - rx - 2.5, hx + rx + 1.5], "hat");
        F.each(F.part, (x, y, k) => { if (y >= band) F.texK(k, -1); });
        F.next();
        return;
      }
      F.ellipse(hx, hy - 0.8, rx + 1, ry + 0.8, mat, domeClip);
      const dome = F.part;
      if (look === "beanie") F.each(dome, (x, y, k) => { if (y >= band - 1) F.texK(k, (x & 1) ? 1 : -1); else if ((x + y) % 4 === 0) F.texK(k, -1); });
      if (look === "miner") F.each(dome, (x, y, k) => { if (y === band) F.texK(k, -1); });
      if (look === "helm" || look === "horned") F.each(dome, (x, y, k) => { if (y === band || y === band - 1) F.texK(k, 1); if (y === band - 1 && (x % 3 === 0)) F.texK(k, 2); if (!side && Math.abs(x - hx) < 0.6) F.texK(k, 1); });
      if (look === "bandana") F.each(dome, (x, y, k) => { if ((x + y * 2) % 5 === 0) F.set(x, y, "hat", C.cream); });
      F.next();
      if (look === "miner") {
        F.rows(band, band, () => [hx - rx - 2, hx + rx + 1 + (side ? 2 : 0)], "hat"); F.next();
        const lx = side ? Math.round(hx + rx * 0.6) : L0;
        F.rect(lx, band - 3, 2, 2, "raw", C.lamp); F.set(lx, band - 3, "raw", C.white); F.next();
      }
      if (look === "beanie") { F.ellipse(hx - (side ? 1 : 0), hy - ry - 1.6, 1.8, 1.6, "hat"); F.each(F.part, (x, y, k) => F.texK(k, 1)); F.next(); }
      if (look === "horned") {
        for (const sg of side ? [1] : [-1, 1]) {
          const bx = side ? hx : hx + sg * (rx - 0.5);
          F.line(bx, band - 2, bx + sg * 2.5, band - 6, 2, "bone"); F.line(bx + sg * 2.5, band - 6, bx + sg * 2, band - 9, 1, "bone");
          F.next();
        }
      }
      if (look === "bandana") { const kx = side ? hx - rx - 1 : hx + rx; F.line(kx, band, kx + (side ? -2 : 2), band + 3, 1.5, "hat"); F.next(); }
      if (look === "flower") {
        // no dome: a ring of flowers on the hair (undo the dome)
        F.each(dome, (x, y) => F.set(x, y, null));
        const cols = [C.pink, C.white, "#f2c94a", C.pink, C.white];
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (1.15 + i * 0.175), fx = hx + Math.cos(a) * (rx + 0.3) * (side ? 0.8 : 1), fy = hy - 0.8 + Math.sin(a) * (ry + 0.3);
          F.set(fx, fy, "raw", cols[i]); F.set(fx + 1, fy, "raw", C.leaf);
        }
        F.next();
      }
    }

    function drawGlasses(color) {
      const frame2 = color || "#3a3038";
      const eyeDX = Math.round(B.rx * 0.42);
      const eyes = view === "side" ? [Math.round(hx + rx * 0.45)] : [L0 - eyeDX - 1, R0 + eyeDX];
      for (const ex of eyes) {
        for (let x = ex - 1; x <= ex + 2; x++) { F.set(x, eyeY - 1, "raw", frame2); F.set(x, eyeY + 2, "raw", frame2); }
        F.set(ex - 1, eyeY, "raw", frame2); F.set(ex - 1, eyeY + 1, "raw", frame2); F.set(ex + 2, eyeY, "raw", frame2); F.set(ex + 2, eyeY + 1, "raw", frame2);
        if (view === "side") for (let x = Math.round(hx - rx * 0.1); x < ex - 1; x++) F.set(x, eyeY, "raw", frame2);
      }
      if (view !== "side") { F.set(L0, eyeY, "raw", frame2); F.set(R0, eyeY, "raw", frame2); }
      F.next();
    }

    function drawEarrings(color) {
      const c2 = color || C.gold;
      const pts = view === "side" ? [[hx - rx * 0.15, hy + 3.5]] : view === "back" ? [[hx - rx - 0.3, hy + 3.5], [hx + rx + 0.3, hy + 3.5]] : [[hx - rx - 0.3, hy + 3.5], [hx + rx + 0.3, hy + 3.5]];
      for (const [x, y] of pts) { F.set(x, y, "raw", c2); F.set(x, y + 1, "raw", mix(c2, "#000000", 0.3)); }
      F.next();
    }

    function drawHeld() {
      const mouthY = noseY() + 3;
      if (pose === "eat") {
        // a bowl in the left hand, a spoon in the right
        const bx = cx - 3, by = torsoBot - 1;
        F.rows(by, by + 2, (y) => [bx - 2 + (y - by) * 0.5, bx + 3 - (y - by) * 0.5], "wood"); F.next();
        F.rect(Math.round(bx - 1), by, 4, 1, "raw", "#c98a4a"); F.next();
        const hand = [[cx + 2.5, torsoBot - 1], [cx + 3, torsoTop + 3], [cx + 1, mouthY], [cx + 3, torsoTop + 3]][frame];
        F.line(hand[0], hand[1] + 1, hand[0] - 1, hand[1] - 2, 1, "metal"); F.next();
      }
      if (pose === "drink") {
        const [mx, my] = frame ? [cx + 1, mouthY - 1] : [cx + 3, torsoTop + 2];
        F.rect(Math.round(mx), Math.round(my), 3, 4, "wood"); F.rect(Math.round(mx) + 3, Math.round(my) + 1, 1, 2, "wood");
        F.each(F.part, (x, y, k) => { if (y === Math.round(my)) F.set(x, y, "raw", C.cream); });
        F.next();
      }
      if (view === "side" && s.tool && (pose === "work" || pose === "walk" && s.tool.carry)) drawTool(s.tool);
      if (view === "front" && s.tool && s.tool.kind === "sack") {
        F.ellipse(cx + 6, torsoTop + 6, 3, 3.5, "cloth"); F.set(cx + 6, torsoTop + 3, "gold", C.goldD); F.next();
      }
      if ((view === "front") && s.tool && s.tool.kind === "axe") {
        const hx2 = cx + hw(0.12) + 2, hy2 = torsoTop + 1.5 + B.armLen;
        F.line(hx2, hy2 - 9, hx2, hy2 + 3, 1, "wood"); F.next();
        F.rows(hy2 - 10, hy2 - 6, (y) => [hx2 + 1, hx2 + 3 + (y === Math.round(hy2 - 8) ? 1 : 0)], "metal"); F.next();
      }
    }

    function drawTool(tool) {
      const work = pose === "work";
      const hands = work ? [[cx - 3, torsoTop - 7], [cx + 2, torsoTop - 8], [cx + 8, torsoTop + 6], [cx + 6, torsoTop + 2]][frame] : arms.near.h;
      const ang = work ? [-2.6, -1.2, 0.9, 0.2][frame] : -1.9;          // direction the handle points from the hands
      const len = { pick: 11, hammer: 8, shovel: 11, paddle: 11, hoe: 11, axe: 10, chisel: 6, saw: 9 }[tool.kind] || 9;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const ex = hands[0] + dx * len, ey = hands[1] + dy * len;
      F.line(hands[0] - dx * 2, hands[1] - dy * 2, ex, ey, 1, "wood"); F.next();
      const px = -dy, py = dx;     // across the handle
      const head = (a, b, w2) => F.line(ex + px * a, ey + py * a, ex + px * b, ey + py * b, w2, "metal");
      if (tool.kind === "pick") { head(-4, 4, 1.6); F.set(ex + px * 4 + dx, ey + py * 4 + dy, "metal"); }
      else if (tool.kind === "hammer" || tool.kind === "chisel") head(-2, 2, 2.6);
      else if (tool.kind === "axe") { head(0, 3, 3); }
      else if (tool.kind === "shovel" || tool.kind === "paddle") F.line(ex, ey, ex + dx * 4, ey + dy * 4, 3, tool.kind === "paddle" ? "wood" : "metal");
      else if (tool.kind === "hoe") head(0, 3, 1.4);
      else head(-1.5, 1.5, 2);
      F.next();
    }

    function shirtTexture(look, inT) {
      const dash = (x, y, v = 1) => { if (inT(x, y)) F.tex(x, y, v); };
      for (let x = 0; x < cw; x++) if (inT(x, beltY - 1)) F.tex(x, beltY - 1, x % 3 === 1 ? 1 : -1);      // fabric bunches over the belt
      const side = view === "side";
      if (look === "linen") {
        for (let x = 0; x < cw; x++) if (x % 2 && Math.abs(x - cx) > 2) dash(x, torsoTop + 1);                         // shoulder seams
        if (view === "front") {
          const px0 = L0 - 4, py0 = torsoTop + 3;                                                                     // stitched pocket
          for (let x = px0; x < px0 + 3; x++) { dash(x, py0); dash(x, py0 + 3, -1); }
          for (let y = py0; y <= py0 + 3; y++) { dash(px0, y, (y & 1) ? 1 : 0); dash(px0 + 2, y, (y & 1) ? 1 : 0); }
        }
      } else if (look === "knit") {
        const cxx = side ? Math.round(cx + 2) : L0;
        for (let y = torsoTop + 2; y < beltY - 1; y++) {
          const ph = (y - torsoTop) % 4;
          const xs = side ? [cxx + (ph === 1 || ph === 3 ? 1 : 0)] : ph === 0 || ph === 2 ? [L0 - 1, R0 + 1] : [L0, R0];
          for (const x of xs) dash(x, y, ph === 2 ? -1 : 1);
        }
        for (let y = torsoBot - 1; y <= torsoBot; y++) for (let x = 0; x < cw; x++) if (x % 2) dash(x, y, -1);
      } else if (look === "embroid") {
        for (let y = torsoBot - 1; y <= torsoBot; y++) for (let x = 0; x < cw; x++) if (inT(x, y)) F.set(x, y, "shirt", ((x - L0) % 4 === 0) === (y === torsoBot - 1) ? C.red : C.cream);
        for (let x = 0; x < cw; x++) if (inT(x, torsoTop) && Math.abs(x - cx) < 3) F.set(x, torsoTop, "shirt", Math.abs(x - cx) < 1 ? C.red : C.cream);
        if (fem) for (let x = 0; x < cw; x++) if (inT(x, beltY - 1)) F.set(x, beltY - 1, "shirt", x % 2 ? C.cream : C.red);
      } else if (look === "patched") {
        const patch = (x0, y0, w2, h2) => {
          for (let y = y0; y < y0 + h2; y++) for (let x = x0; x < x0 + w2; x++) if (inT(x, y)) F.tex(x, y, (x === x0 || x === x0 + w2 - 1 || y === y0 || y === y0 + h2 - 1) ? ((x + y) % 2 ? 1 : -1) : -1);
        };
        if (side) patch(Math.round(cx), torsoTop + 2, 3, 3); else { patch(L0 - 5, torsoTop + 2, 4, 3); patch(R0 + 2, beltY - 5, 3, 3); }
      } else if (look === "vest") {
        for (let y = torsoTop; y < beltY; y++) for (let x = 0; x < cw; x++) {
          if (!inT(x, y)) continue;
          if (side ? x < cx + 1.5 : Math.abs(x - cx) >= 1.6) { F.set(x, y, "vest"); if ((side ? x === Math.round(cx + 1) : Math.abs(x - cx) < 2.6) && y % 2 === 0) F.tex(x, y, 1); }
        }
      }
      F.next();
    }

    function pantsTexture(Fx, legs, x0, yTop, yBot, w2, i, v) {
      const look = legs && legs.look || "seam";
      if (look === "patch" && i === 1 && yBot - yTop >= 3 && w2 >= 3) for (let y = yBot - 3; y < yBot - 1; y++) for (let x = x0 + 1; x < x0 + w2; x++) Fx.tex(x, y, (x + y) % 2 ? 1 : 0);
      if (look === "seam") for (let y = yTop; y < yBot + 1; y += 2) Fx.tex(i ? x0 + w2 - 1 : x0, y, 1);
      if (look === "cuff") for (let x = x0; x < x0 + w2; x++) Fx.tex(x, yBot - 1, 1);
    }

    function bootTexture(Fx, bx, by, bw, sy, v) {
      for (let x = bx; x < bx + bw + 1; x++) Fx.tex(x, sy, -2);                                          // dark sole
      for (let x = bx; x < bx + bw; x++) Fx.tex(x, by, 1);                                             // turned-down cuff
      if (v === "front") for (let y = by + 1; y < sy; y++) Fx.set(bx + Math.floor(bw / 2) + ((y & 1) ? 0 : -1), y, "boot", "belt:1");   // laces
      for (let x = bx; x < bx + bw; x++) if (x & 1) Fx.tex(x, sy - 1, 1);                              // stitched welt
    }
  }

  // ------------------------------------------------------------------ icons for clothes in the store

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

  function monster(id, frame) {
    const f = frame % 2;
    const people = {
      goblin_scouts: () => person({ body: 4, bodyOverride: { rx: 7.5, ry: 6.5, torsoH: 9, torso: [[0, 4], [0.2, 5], [1, 5]], legLen: 3, legW: 3, armW: 2, armLen: 8, bootH: 3, belly: 0 },
        skin: "#7fae5a", hair: "#4a5a3a", eye: "#e04030", hairStyle: "bald", nose: "hooked", brows: "stern", mood: "angry", creature: { ears: "pointy", skinTex: "warts" },
        wear: { top: { look: "patched", color: "#7a6a4a" }, legs: { look: "patch", color: "#5a4a3a" }, feet: { color: "#4a3a2a" } }, pose: "walk", frame: f * 2, tool: { kind: "axe", carry: 1 }, toolMetal: "#8a8a92", size: [36, 42] }),
      rock_troll: () => person({ body: 1, bodyOverride: { rx: 9, ry: 8, torsoH: 17, torso: [[0, 9], [0.2, 12], [0.7, 11], [1, 10]], belly: 2, legLen: 5, legW: 6, legGap: 2, bootH: 4, armW: 6, armLen: 14 },
        skin: "#8a8d96", hair: "#4f7a46", eye: "#f0c040", hairStyle: "bald", nose: "potato", brows: "stern", mood: "angry", creature: { ears: "small", tusks: 1, skinTex: "cracks", eyes: "glow" },
        wear: { top: { look: "patched", color: "#6a5a48" }, legs: { look: "patch", color: "#5a4a3a" }, feet: { color: "#6a6d76" } }, pose: "idle", frame: f, size: [52, 60] }),
      blind_ogre: () => person({ body: 1, bodyOverride: { rx: 9.5, ry: 8.5, torsoH: 18, torso: [[0, 9], [0.2, 11], [0.7, 13], [1, 11]], belly: 3, legLen: 5, legW: 6, legGap: 2, bootH: 4, armW: 6, armLen: 15 },
        skin: "#d8b8a0", hair: "#5a4a3a", hairStyle: "bald", beard: null, nose: "broad", brows: "worried", mood: "angry", creature: { eyes: "blind", tusks: 1, skinTex: "warts" },
        wear: { top: { look: "vest", color: "#8a6a4a" }, legs: { look: "patch", color: "#6a5040" }, feet: { color: "#8a6a5a" } }, pose: "idle", frame: f, size: [54, 62] }),
    };
    let img;
    if (people[id]) img = people[id]();
    else img = beast(id, f);
    return trim(img);
  }

  function trim(img) { const c = crop(img); return { w: c.w, h: c.h, data: c.data }; }

  function beast(id, f) {
    let F, col;
    if (id === "giant_rat") {
      F = fig(28, 18); col = { fur: "#8a7a72", skin: "#e8a0a8", bone: C.bone };
      F.line(4, 13, 0 + (f ? 1 : 0), 9, 1.4, "skin"); F.next();                                       // tail
      for (const [x, d] of [[9, f ? 1 : -1], [17, f ? -1 : 1]]) { F.line(x, 13, x + d, 16, 1.6, "skin"); F.next(); }
      F.ellipse(12, 11, 7.5, 4.5, "fur"); F.each(F.part, (x, y, k) => { if ((x + Math.floor(y / 2)) % 3 === 0) F.texK(k, -1); if (y < 8 && (x % 4 === 1)) F.texK(k, 1); }); F.next();
      F.ellipse(20.5, 9.5, 4, 3.2, "fur"); F.next();
      F.ellipse(18.5, 6, 1.6, 2, "skin"); F.next();                                                     // ear
      F.set(25, 10, "raw", "#e8a0a8"); F.set(22, 8, "raw", "#e04030"); F.set(22, 9, "raw", C.E); F.set(24, 11, "raw", C.cream); F.next();
    } else if (id === "cave_crawler") {
      F = fig(40, 16); col = { shell: "#9a6a4a", bone: "#c8a080" };
      for (let i = 0; i < 7; i++) {
        const x = 4 + i * 5, y = 9 + Math.round(Math.sin(i * 0.9 + f * 1.6));
        for (const d of [-1, 1]) { F.line(x, y + 1, x + d * 2 + (f ? d : 0), y + 5, 1, "bone"); }
        F.next();
      }
      for (let i = 0; i < 7; i++) {
        const x = 4 + i * 5, y = 9 + Math.round(Math.sin(i * 0.9 + f * 1.6));
        F.ellipse(x, y, 3.2, 3, "shell"); F.each(F.part, (xx, yy, k) => { if (yy < y - 1) F.texK(k, 1); if (xx === x + 2) F.texK(k, -1); }); F.next();
      }
      F.ellipse(38, 8, 2.8, 2.6, "shell"); F.next();
      F.set(39, 7, "raw", "#f0d040"); F.line(39, 10, 41, 13, 1, "bone"); F.next();
    } else if (id === "cave_spider") {
      F = fig(40, 26); col = { shell: "#6a5480", bone: "#8a76a0" };
      for (let i = 0; i < 4; i++) for (const d of [-1, 1]) {
        const bx = 22, by = 14, kx = bx + d * (4 + i * 3), ky = 4 + i * 2 + ((f + i) % 2 ? 1 : 0), fx = bx + d * (7 + i * 3.6), fy = 24;
        F.line(bx, by, kx, ky, 1, "bone"); F.line(kx, ky, fx, fy, 1, "bone");
      }
      F.next();
      F.ellipse(13, 14, 7, 6, "shell"); F.each(F.part, (x, y, k) => { if (Math.abs(x - 12) < 1 && y > 10 && y < 18) F.set(x, y, "raw", "#d85a5a"); if (y === 11 && x > 9 && x < 16) F.set(x, y, "raw", "#d85a5a"); if (y < 11) F.texK(k, 1); }); F.next();
      F.ellipse(23, 14, 4, 3.6, "shell"); F.next();
      for (const [x, y] of [[25, 13], [26, 14], [24, 12], [26, 12]]) F.set(x, y, "raw", "#ff5050"); F.next();
    } else if (id === "magma_crab") {
      F = fig(36, 22); col = { shell: "#7a4a40", glow: "#ff8a30", bone: "#9a5a44" };
      for (const d of [-1, 1]) for (let i = 0; i < 3; i++) { F.line(18 + d * 4, 15, 18 + d * (9 + i * 2), 20 - (f && i === 1 ? 1 : 0), 1.4, "bone"); }
      F.next();
      for (const d of [-1, 1]) { F.line(18 + d * 7, 11, 18 + d * 12, 6 - f, 2, "shell"); F.ellipse(18 + d * 13.5, 5 - f, 2.6, 2, "shell"); F.next(); }
      F.ellipse(18, 13, 9, 5.5, "shell");
      F.each(F.part, (x, y, k) => { if ((x * 3 + y * 7) % 13 === 0 || (x * 5 - y * 3) % 17 === 0) F.set(x, y, "glow", f ? "#ffd070" : "#ff8a30"); if (y < 10) F.texK(k, 1); });
      F.next();
      F.set(16, 8, "raw", "#ffe08a"); F.set(20, 8, "raw", "#ffe08a"); F.next();
    } else if (id === "crystal_golem") {
      F = fig(40, 46); col = { stone: "#6a6a7a", crystal: "#8ad0e0", bone: "#5a5a68" };
      F.rect(12, 34, 6, 10, "stone"); F.next(); F.rect(22, 34, 6, 10, "stone"); F.next();
      F.rows(14, 35, (y) => [8 + (y - 14) * 0.15, 31 - (y - 14) * 0.15], "stone");
      F.each(F.part, (x, y, k) => { if ((x * 2 + y) % 9 === 0 || (y === 24 && x % 2)) F.texK(k, -1); }); F.next();
      for (const d of [-1, 1]) { F.line(20 + d * 11, 17, 20 + d * 13, 32 + f, 6, "stone"); F.next(); }
      F.rows(5, 14, () => [14, 25], "stone"); F.next();
      F.set(17, 9, "raw", "#9af0ff"); F.set(22, 9, "raw", "#9af0ff"); F.next();
      // crystals growing out of the shoulders and back
      for (const [x, y, h2] of [[10, 13, 7], [13, 11, 9], [27, 12, 8], [30, 14, 6], [20, 4, 5]]) {
        F.rows(y - h2, y, (yy) => { const t = (yy - (y - h2)) / h2; return [x - t * 1.6, x + t * 1.6]; }, "crystal");
        F.each(F.part, (xx, yy, k) => { if (xx === x) F.texK(k, 1); if (xx > x) F.texK(k, -1); }); F.next();
      }
    } else if (id === "deep_wyrm") {
      F = fig(64, 34); col = { scale: "#5a4a8a", bone: C.bone, glow: "#ffd040", skin: "#c8a0d8" };
      const pts = [];
      for (let i = 0; i <= 24; i++) { const x = 4 + i * 2.1, y = 22 + Math.sin(i * 0.45 + f * 0.8) * 5 - (i > 18 ? (i - 18) * 1.6 : 0); pts.push([x, y, 2.5 + Math.min(i, 18) * 0.22]); }
      for (let i = 0; i < pts.length - 1; i++) F.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i][2] * 2, "scale");
      F.each(F.part, (x, y, k) => { const a = (x + (y & 1) * 2) % 4; if (a === 0) F.texK(k, -1); if (a === 2 && (y & 1)) F.texK(k, 1); }); F.next();
      // belly plates
      for (let i = 2; i < pts.length - 2; i += 2) F.set(pts[i][0], pts[i][1] + pts[i][2] - 1, "skin"); F.next();
      const [hx2, hy2] = pts[pts.length - 1];
      F.ellipse(hx2 + 2, hy2 - 1, 5, 4, "scale"); F.next();
      F.line(hx2, hy2 - 4, hx2 - 3, hy2 - 9, 1.4, "bone"); F.line(hx2 + 3, hy2 - 4, hx2 + 2, hy2 - 9, 1.4, "bone"); F.next();
      F.set(hx2 + 3, hy2 - 2, "raw", "#ffe060"); F.set(hx2 + 4, hy2 - 2, "raw", "#ffb020"); F.next();
      F.line(hx2 + 4, hy2 + 2, hx2 + 7, hy2 + 2 + f, 1, "raw"); F.next();
    } else {
      F = fig(16, 16); col = { stone: "#888888" }; F.ellipse(8, 8, 6, 6, "stone"); F.next();
    }
    return { w: F.w, h: F.h, data: F.render(col) };
  }

  return {
    person, icon, monster, ramp, mix, crop,
    BODIES, HAIR_STYLES, BEARDS, NOSES: NOSE_NAMES, BROWS: BROW_NAMES, MOUTHS, EYES, SKINS, HAIRS, HATS, SHIRT_LOOKS, PANTS_LOOKS,
    FRAMES, VIEW, CW, CH,
  };
})();
