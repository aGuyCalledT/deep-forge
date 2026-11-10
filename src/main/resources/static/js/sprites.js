// All game art comes from one sprite sheet (static/art/atlas.png), drawn with pxl from art-src/.
// Some colours in the art are placeholders that are swapped at runtime: metal (per metal), skin, beard,
// hair and tunic (per dwarf). A PNG in the sprites folder with a sheet name (e.g. sprites/room_forge.png)
// replaces that sprite. See docs/SPRITES.md.
import { byId } from './data.js';

let sheet = null;          // HTMLImageElement
let frames = {};           // name -> {x, y, w, h}
export let META = null;    // shared.js data (rooms, dwarf poses, palette)
const overrides = new Map();
const cache = new Map();

export async function loadArt() {
  const [json, meta] = await Promise.all([
    fetch('/art/atlas.json').then((r) => r.json()),
    fetch('/art/meta.json').then((r) => r.json()),
  ]);
  META = meta;
  for (const [k, v] of Object.entries(json.frames)) frames[k.replace(/\.png$/, '')] = v.frame;
  sheet = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/art/atlas.png'; });
}

export async function loadOverrides(ids) {
  await Promise.all(ids.map((id) => new Promise((res) => {
    const img = new Image();
    img.onload = () => { overrides.set(id, img); cache.clear(); res(); };
    img.onerror = () => res();
    img.src = '/sprites/' + id + '.png';
  })));
}

export function hasOverride(id) { return overrides.has(id); }
export function has(name) { return overrides.has(name) || !!frames[name]; }

// ------------------------------------------------------------------ helpers

export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function rgb(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** f > 0 lightens towards white, f < 0 darkens towards black. */
export function shade(hex, f) {
  const [r, g, b] = rgb(hex);
  const t = f > 0 ? 255 : 0, a = Math.abs(f);
  const h = (v) => Math.round(v + (t - v) * a).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

export function mix(a, b, t) {
  const x = rgb(a), y = rgb(b);
  const h = (i) => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
  return '#' + h(0) + h(1) + h(2);
}

export function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function hash(s) {
  let h = 2166136261;
  s = String(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** One sprite as its own canvas (cached). */
export function sprite(name) {
  if (cache.has('s:' + name)) return cache.get('s:' + name);
  let c;
  if (overrides.has(name)) {
    const img = overrides.get(name);
    c = mk(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0);
  } else {
    const f = frames[name];
    if (!f) { c = mk(1, 1); }
    else { c = mk(f.w, f.h); c.getContext('2d').drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h); }
  }
  cache.set('s:' + name, c);
  return c;
}

/** Draw a sprite straight from the sheet. */
export function draw(ctx, name, x, y, flip = false) {
  const src = overrides.get(name);
  const f = frames[name];
  if (!src && !f) return;
  const w = src ? src.width : f.w, h = src ? src.height : f.h;
  if (flip) {
    ctx.save(); ctx.translate(Math.round(x) + w, Math.round(y)); ctx.scale(-1, 1);
    src ? ctx.drawImage(src, 0, 0) : ctx.drawImage(sheet, f.x, f.y, w, h, 0, 0, w, h);
    ctx.restore();
  } else {
    src ? ctx.drawImage(src, Math.round(x), Math.round(y)) : ctx.drawImage(sheet, f.x, f.y, w, h, Math.round(x), Math.round(y), w, h);
  }
}

export function size(name) {
  const o = overrides.get(name);
  if (o) return { w: o.width, h: o.height };
  const f = frames[name];
  return f ? { w: f.w, h: f.h } : { w: 0, h: 0 };
}

/** Recolour exact placeholder colours: map {"#rrggbb": "#rrggbb"}. */
function recolor(canvas, map) {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const lut = new Map();
  for (const [a, b] of Object.entries(map)) {
    const [r, g, bl] = rgb(a), to = rgb(b);
    lut.set((r << 16) | (g << 8) | bl, to);
  }
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const to = lut.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** A ramp of n shades from a base colour, dark to light. */
function ramp(base, n) {
  if (n === 3) return [shade(base, -0.32), base, shade(base, 0.3)];
  return [shade(base, -0.45), shade(base, -0.15), shade(base, 0.2), shade(base, 0.55)];
}

function swapMap(kind, base) {
  const from = META.SWAP[kind], to = ramp(base, from.length);
  const m = {};
  from.forEach((c, i) => { m[c] = to[i]; });
  return m;
}

function copy(name) {
  const s = sprite(name);
  const c = mk(s.width, s.height);
  c.getContext('2d').drawImage(s, 0, 0);
  return c;
}

// ------------------------------------------------------------------ goods

export function ore(id) { return sprite('ore_' + id); }
export function raw(id) { return sprite('raw_' + id); }
export function coin() { return sprite('coin'); }
export function artifact() { return sprite('artifact'); }
export function icon(name) { return sprite('ui_' + name); }

export function bar(metal) {
  const key = 'bar:' + metal;
  if (cache.has(key)) return cache.get(key);
  const c = recolor(copy('bar'), swapMap('metal', byId.metals[metal] ? byId.metals[metal].color : '#999999'));
  cache.set(key, c);
  return c;
}

/** A finished good: item shape in its metal, with marks for sharpened, engraved, gem-set, masterwork. */
export function item(type, metal, q = 1, mods = '') {
  const key = `item:${type}:${metal}:${q}:${mods}`;
  if (cache.has(key)) return cache.get(key);
  const c = recolor(copy('item_' + type), swapMap('metal', byId.metals[metal] ? byId.metals[metal].color : '#999999'));
  const ctx = c.getContext('2d');
  if (mods.includes('e')) draw(ctx, 'mod_e', 1, c.height - 5);
  if (mods.includes('s')) draw(ctx, 'mod_s', c.width - 6, 0);
  if (mods.includes('g')) draw(ctx, 'mod_g', c.width - 6, c.height - 6);
  if (q >= 4) draw(ctx, 'mod_star', 0, 0);
  cache.set(key, c);
  return c;
}

export function good(key) {
  if (key.startsWith('item:')) {
    const p = key.split(':');
    return item(p[1], p[2], +p[3], p[4] || '');
  }
  if (key.startsWith('bar:')) return bar(key.slice(4));
  if (byId.ores[key]) return ore(key);
  return raw(key);
}

// ------------------------------------------------------------------ dwarves

const OUTFITS = ['#6f8fb8', '#7aa08a', '#b87a6a', '#9a86b8', '#c2a46a', '#6aa0a8', '#b8869a', '#8a9a6a'];
const JOB_OUTFIT = { warrior: '#8a8fa0' };

/** Look of a dwarf, with old saves (no style fields) derived from the id. */
export function look(d) {
  const h = hash('dwarf' + d.id);
  const pick = (v, n, salt) => (v != null && v >= 0 ? v : (h >>> salt) % n);
  return {
    body: pick(d.body, 3, 1), beard: (d.beardStyle ?? 0) % 8, hair: pick(d.hairStyle, 6, 4), hat: pick(d.hat, 6, 7) * ((h >>> 11) % 2),
    acc: pick(d.accessory, 5, 13), outfit: d.outfit || OUTFITS[(h >>> 17) % OUTFITS.length],
    skin: d.skin || '#e8b090', beardC: d.beard || '#8a5a2b', hairC: d.hair || d.beard || '#6a4a2a',
  };
}

/**
 * A finished dwarf frame: body, beard, hair or hat, accessory, tool, all recoloured.
 * Returns a canvas 18 x 29 with the feet on the bottom row.
 */
export function dwarfSprite(d, pose = 'idle', frame = 0, tool = null) {
  if (pose === 'stand') pose = 'idle';
  if (pose === 'swing') pose = 'mine';
  if (pose === 'hammer') pose = 'work';
  const n = META.DWARF.poses[pose] || 1;
  frame = frame % n;
  const L = look(d);
  const hatMetal = d.helm ? d.helm.split(':')[2] : '';
  const toolMetal = tool === 'axe' ? (d.weapon ? d.weapon.split(':')[2] : 'iron') : (d.tool ? d.tool.split(':')[2] : 'iron');
  const outfit = d.armor ? byId.metals[d.armor.split(':')[2]].color : (JOB_OUTFIT[d.job] && !d.outfit ? JOB_OUTFIT[d.job] : L.outfit);
  const key = ['dw', d.id, pose, frame, tool, L.body, L.beard, L.hair, L.hat, L.acc, outfit, L.skin, L.beardC, L.hairC, hatMetal, toolMetal].join('|');
  if (cache.has(key)) return cache.get(key);
  const c = mk(18, 29);
  const ctx = c.getContext('2d');
  if (overrides.has('dwarf')) { ctx.drawImage(overrides.get('dwarf'), 0, 0); cache.set(key, c); return c; }
  const bob = META.DWARF.bob[pose][frame];
  const lift = L.body === 1 ? 1 : 0;
  draw(ctx, `dw_body${L.body}_${pose}_${frame}`, 0, 3);
  draw(ctx, `dw_beard_${L.beard}`, 0, 3 + bob - lift + (pose === 'sit' || pose === 'drink' || pose === 'sleep' ? 0 : 0));
  const hat = hatMetal ? 5 : L.hat;
  if (!hat) draw(ctx, `dw_hair_${L.hair}`, 0, 3 + bob - lift);
  else if (L.hair === 3 || L.hair === 5) draw(ctx, `dw_hair_${L.hair}`, 0, 3 + bob - lift);   // long hair shows under hats
  if (hat) draw(ctx, `dw_hat_${hat}`, 0, bob - lift);
  if (L.acc) draw(ctx, `dw_acc_${L.acc}`, 0, 3 + bob - lift);
  const t = tool || (pose === 'mine' ? 'mine' : pose === 'work' ? 'work' : pose === 'drink' ? 'drink' : null);
  if (t === 'mine' || t === 'work' || t === 'drink') draw(ctx, `dw_tool_${t}_${frame}`, 0, 3);
  else if (t === 'axe') draw(ctx, 'dw_tool_axe', 0, 3);
  else if (t === 'sack') draw(ctx, 'dw_tool_sack', 0, 3);
  const map = { ...swapMap('skin', L.skin), ...swapMap('beard', L.beardC), ...swapMap('hair', L.hairC), ...swapMap('tunic', outfit) };
  Object.assign(map, swapMap('metal', byId.metals[toolMetal] ? byId.metals[toolMetal].color : '#8c8c8c'));
  recolor(c, map);
  cache.set(key, c);
  return c;
}

// ------------------------------------------------------------------ other

export function monster(id, frame = 0) { return sprite(`mon_${id}_${frame % 2}`); }
export function wagon(frame = 0) { return sprite(`wagon_${frame % 2}`); }
export function torch(frame) { return sprite(`torch_${((frame % 3) + 3) % 3}`); }
export function room(type) { return sprite('room_' + type); }
