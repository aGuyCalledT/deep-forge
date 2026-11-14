// Symbols, buttons, goods and gems come from one sprite sheet (static/art/icons/atlas.png, drawn with pxl from art-src/icons/).
// Metal and gem colours are placeholders swapped at runtime. Rooms, dwarves, monsters and the valley are the 48-px
// art (scene.js, dwarves.js, rooms.js). See docs/SPRITES.md.
import { byId, G, parseGem, gemKind, schoolOf } from '../core/data.js';
import * as DW from './dwarves.js';
import * as Art from './scene.js';
import { wearIcon as clothIcon } from './wearicons.js';

let sheet = null;          // HTMLImageElement
let frames = {};           // name -> {x, y, w, h}
export let META = null;    // shared.js data (palette, colour placeholders)
const cache = new Map();

export async function loadArt() {
  const [json, meta] = await Promise.all([
    fetch('/art/icons/atlas.json').then((r) => r.json()),
    fetch('/art/icons/meta.json').then((r) => r.json()),
  ]);
  META = meta;
  for (const [k, v] of Object.entries(json.frames)) frames[k.replace(/\.png$/, '')] = v.frame;
  sheet = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/art/icons/atlas.png'; });
}

export function has(name) { return !!frames[name]; }

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
  const f = frames[name];
  const c = f ? mk(f.w, f.h) : mk(1, 1);
  if (f) c.getContext('2d').drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  cache.set('s:' + name, c);
  return c;
}

/** Draw a sprite straight from the sheet. */
export function draw(ctx, name, x, y, flip = false) {
  const f = frames[name];
  if (!f) return;
  if (flip) {
    ctx.save(); ctx.translate(Math.round(x) + f.w, Math.round(y)); ctx.scale(-1, 1);
    ctx.drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    ctx.restore();
  } else ctx.drawImage(sheet, f.x, f.y, f.w, f.h, Math.round(x), Math.round(y), f.w, f.h);
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
/** The coin for a denomination: 'mark' (gold), 'talent' (silver) or 'jot' (copper). */
export function coinOf(d) { return sprite('coin_' + d); }
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
export function item(type, metal, q = 1, mods = '', gems = 0) {
  const key = `item:${type}:${metal}:${q}:${mods}:${gems}`;
  if (cache.has(key)) return cache.get(key);
  const c = recolor(copy('item_' + type), swapMap('metal', byId.metals[metal] ? byId.metals[metal].color : '#999999'));
  const ctx = c.getContext('2d');
  if (mods.includes('e')) draw(ctx, 'mod_e', 1, c.height - 5);
  if (mods.includes('s')) draw(ctx, 'mod_s', c.width - 6, 0);
  if (mods.includes('g') || gems > 0) draw(ctx, 'mod_g', c.width - 6, c.height - 6);
  if (mods.includes('i')) draw(ctx, 'mod_i', 1, 0);
  if (q >= 4) draw(ctx, 'mod_star', 0, 0);
  cache.set(key, c);
  return c;
}

/** A gem in its cut and the colour of its kind (Gems.java); an enchanted one gets an outline in its school's colour. */
export function gem(key) {
  if (cache.has(key)) return cache.get(key);
  // "rough_gem" and "cut_gem" stand for any gem: drawn in the colour of their raw good
  const any = key === 'rough_gem' || key === 'cut_gem';
  const rough = key.startsWith('rough:') || key === 'rough_gem';
  const g = rough || any ? null : parseGem(key);
  const color = any ? byId.raws[key].color : gemKind(key).color;
  const name = rough ? 'gem_rough' : 'gemcut_' + (g && byId.gemShapes[g.shape] ? g.shape : 'round_brilliant');
  const c = recolor(copy(name), swapMap('gem', color));
  if (g && g.effect) {
    const sc = G.data.magic.schools.find((x) => x.id === schoolOf(g.effect));
    if (sc) recolor(c, { [META.PAL ? META.PAL.k : '#1d1b2c']: sc.color });
  }
  cache.set(key, c);
  return c;
}

export function good(key) {
  if (key.startsWith('wear:')) { const w = parseWear(key); return w ? clothIcon(w.cloth.look, w.color, w.cloth.slot) : mk(16, 16); }
  if (key.startsWith('item:')) {
    const p = key.split(':');
    return item(p[1], p[2], +p[3], p[4] || '', p[5] ? p[5].split(',').length : 0);
  }
  if (key.startsWith('gem:') || key.startsWith('rough:') || key === 'rough_gem' || key === 'cut_gem') return gem(key);
  if (key.startsWith('bar:')) return bar(key.slice(4));
  if (byId.ores[key]) return ore(key);
  return raw(key);
}

// ------------------------------------------------------------------ dwarves (looks; drawn by dwarves.js)

const pickI = (v, n, h, salt) => (v != null && v >= 0 ? v : (h >>> salt) % n) % n;

/** Look of a dwarf; anything missing (old saves) is derived from the id. */
export function look(d) {
  const h = hash('dwarf' + d.id);
  return {
    sex: d.sex === 'f' ? 'f' : 'm',
    body: pickI(d.body, 5, h, 1), hairStyle: pickI(d.hairStyle, 10, h, 3), beard: pickI(d.beardStyle, 8, h, 5),
    nose: pickI(d.nose, 9, h, 7), brows: pickI(d.brows, 7, h, 9), eye: pickI(d.eyeColor, 7, h, 11), mouth: pickI(d.mouth, 5, h, 13),
    freckles: !!d.freckles, skin: d.skin || '#e8b090', hair: d.hair || d.beard || '#8a5a2b',
  };
}

/** "wear:shirt_knit:blue" -> {cloth, color, dye}, or null. */
export function parseWear(key) {
  if (!key || !key.startsWith('wear:')) return null;
  const p = key.split(':');
  const cloth = byId.clothes && byId.clothes[p[1]], color = G.data.dyes && G.data.dyes[p[2]];
  return cloth && color ? { cloth, color, dye: p[2] } : null;
}

export const mood = (d) => (d.happiness >= 65 ? 'happy' : d.happiness < 35 ? 'angry' : 'neutral');

/** Just the dwarf, trimmed: for portraits in panels. Drawn from the same 48-px kit as in the hold. */
const PORTRAIT48 = { idle: 'idle', walk: 'walkFront', talk: 'talk' };
export function portrait(d, pose = 'idle') {
  if (!DW.ready()) return mk(1, 1);
  const L = DW.look48(d), key = 'pt|' + d.id + '|' + pose + '|' + JSON.stringify(L);
  if (cache.has(key)) return cache.get(key);
  const s = DW.frame(L, PORTRAIT48[pose] || 'idle', 0);
  const g = s.getContext('2d'), id = g.getImageData(0, 0, s.width, s.height).data;
  let x0 = s.width, y0 = s.height, x1 = 0, y1 = 0;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (id[(y * s.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  const c = mk(side, side);
  c.getContext('2d').drawImage(s, x0, y0, x1 - x0 + 1, y1 - y0 + 1, Math.floor((side - (x1 - x0 + 1)) / 2), side - (y1 - y0 + 1), x1 - x0 + 1, y1 - y0 + 1);
  cache.set(key, c);
  return c;
}

// ------------------------------------------------------------------ other

/** A monster or the caravan wagon as a still picture for panels (first frame of its 48-px sprite). */
function still(name) {
  const k = 'still:' + name;
  if (cache.has(k)) return cache.get(k);
  const c = Art.ready() && Art.info(name) ? Art.frame(name, 0).canvas : mk(1, 1);
  cache.set(k, c);
  return c;
}
export function monster(id) { return still(id); }
export function wagon() { return still('wagon'); }

/** A soft pixel shadow on the ground under feet at (x, y): two rows, darker in the middle. */
export function groundShadow(ctx, x, y, half = 6) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(16,10,22,0.22)';
  ctx.fillRect(x - half, y - 1, half * 2, 2);
  ctx.fillRect(x - half + 2, y - 2, half * 2 - 4, 1);
  ctx.fillStyle = 'rgba(16,10,22,0.2)';
  ctx.fillRect(x - half + 2, y - 1, half * 2 - 4, 2);
}
