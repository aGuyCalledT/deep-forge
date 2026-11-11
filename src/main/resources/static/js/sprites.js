// All game art comes from one sprite sheet (static/art/atlas.png), drawn with pxl from art-src/, except the
// dwarves: they are put together from PNG parts in static/art/dwarf/ (dwarfkit.js).
// Some colours in the art are placeholders that are swapped at runtime: metal (per metal), skin, beard,
// hair and tunic (per dwarf). A PNG in the sprites folder with a sheet name (e.g. sprites/room_forge.png)
// replaces that sprite. See docs/SPRITES.md.
import { byId, G } from './data.js';
import Figure from './figure.js';
import * as Kit from './dwarfkit.js';

let sheet = null;          // HTMLImageElement
let frames = {};           // name -> {x, y, w, h}
export let META = null;    // shared.js data (rooms, dwarf poses, palette)
const overrides = new Map();
const cache = new Map();

export async function loadArt() {
  const [json, meta] = await Promise.all([
    fetch('/art/atlas.json').then((r) => r.json()),
    fetch('/art/meta.json').then((r) => r.json()),
    Kit.load(),
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
  if (key.startsWith('wear:')) return wearIcon(key);
  if (key.startsWith('item:')) {
    const p = key.split(':');
    return item(p[1], p[2], +p[3], p[4] || '');
  }
  if (key.startsWith('bar:')) return bar(key.slice(4));
  if (byId.ores[key]) return ore(key);
  return raw(key);
}

// ------------------------------------------------------------------ dwarves (drawn by Figure from their looks)

export const FRAMES = Figure.FRAMES;

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

function wearSpec(d) {
  const out = {};
  for (const [slot, key] of Object.entries(d.wear || {})) { const w = parseWear(key); if (w) out[slot] = { look: w.cloth.look, color: w.color }; }
  if (!out.top) out.top = { look: 'plain', color: d.outfit || '#7a8a9a' };
  if (!out.legs) out.legs = { look: 'seam', color: '#6a5047' };
  if (!out.feet) out.feet = { color: '#5c3c30' };
  return out;
}

const metalOf = (key) => { if (!key) return null; const m = byId.metals[key.split(':')[2]]; return m ? m.color : null; };
export const mood = (d) => (d.happiness >= 65 ? 'happy' : d.happiness < 35 ? 'angry' : 'neutral');

function toCanvas(img) {
  const c = mk(img.w, img.h), g = c.getContext('2d'), id = g.createImageData(img.w, img.h);
  img.data.forEach((col, k) => {
    if (!col) return;
    const n = parseInt(col.slice(1), 16);
    id.data[k * 4] = n >> 16; id.data[k * 4 + 1] = (n >> 8) & 255; id.data[k * 4 + 2] = n & 255; id.data[k * 4 + 3] = 255;
  });
  g.putImageData(id, 0, 0);
  return c;
}

/**
 * A finished dwarf frame. Poses: idle, talk, walk, work (mining, smithing and every other job: the tool changes),
 * sit, sitTalk, eat, drink, sleep (lying down), climb. The face follows the dwarf's mood.
 * The canvas has .ax/.ay: the point on the ground between the feet. Draw with placeDwarf().
 */
export function dwarfSprite(d, pose = 'idle', frame = 0, tool = null, opts = {}) {
  if (pose === 'stand') pose = 'idle';
  if (pose === 'mine' || pose === 'swing') { pose = 'work'; tool = tool || 'pick'; }
  if (pose === 'hammer') { pose = 'work'; tool = tool || 'hammer'; }
  frame = frame % (FRAMES[pose] || 1);
  const L = look(d), w = wearSpec(d), md = opts.mood || mood(d);
  const toolMetal = tool === 'axe' ? metalOf(d.weapon) : metalOf(d.tool);
  const key = ['dw', d.id, pose, frame, tool, md, JSON.stringify(L), JSON.stringify(w), d.armor, d.helm, toolMetal].join('|');
  if (cache.has(key)) return cache.get(key);
  let c;
  if (overrides.has('dwarf')) { const o = overrides.get('dwarf'); c = mk(o.width, o.height); c.getContext('2d').drawImage(o, 0, 0); c.ax = o.width >> 1; c.ay = o.height - 1; }
  else if (Kit.ready()) {
    c = Kit.dwarf({
      sex: L.sex, hairStyle: Figure.HAIR_STYLES[L.hairStyle], beard: Figure.BEARDS[L.beard], skin: L.skin, hair: L.hair,
      eye: Figure.EYES[L.eye], freckles: L.freckles, wear: w, armor: metalOf(d.armor), helm: metalOf(d.helm),
      pose, frame, mood: md, tool: tool ? { kind: tool } : null, toolMetal: toolMetal || '#9a9aa6', blink: d.id,
    });
  } else {
    const img = Figure.person({
      body: (L.sex === 'f' ? 5 : 0) + L.body, skin: L.skin, hair: L.hair, eye: Figure.EYES[L.eye],
      hairStyle: Figure.HAIR_STYLES[L.hairStyle], beard: L.sex === 'm' ? Figure.BEARDS[L.beard] : null,
      nose: Figure.NOSES[L.nose], brows: Figure.BROWS[L.brows], mouth: Figure.MOUTHS[L.mouth], freckles: L.freckles,
      wear: w, armor: metalOf(d.armor), helm: metalOf(d.helm), pose, frame, mood: md,
      tool: tool ? { kind: tool, carry: true } : null, toolMetal: toolMetal || '#9a9aa6', blink: d.id,
    });
    c = toCanvas(img); c.ax = img.ax; c.ay = img.ay;
  }
  cache.set(key, c);
  return c;
}

/**
 * A stranger who is not one of your dwarves (the merchant at the stall, travellers in the valley): built from a
 * plain spec {id, body, skin, hair, eye, hairStyle, beard, wear, tool, tall}. Same figure kit as the dwarves.
 */
export function npcSprite(n, pose = 'idle', frame = 0) {
  frame = frame % (FRAMES[pose] || 1);
  const key = 'npc|' + n.id + '|' + pose + '|' + frame;
  if (cache.has(key)) return cache.get(key);
  if (Kit.ready() && !n.tall) {     // tall travellers are people of the valley, not dwarves
    const c = Kit.dwarf({
      sex: n.body >= 5 ? 'f' : 'm', hairStyle: n.hairStyle, beard: n.beard, skin: n.skin, hair: n.hair, eye: n.eye,
      wear: n.wear, pose, frame, mood: 'happy', tool: n.tool ? { kind: n.tool } : null, toolMetal: '#9a9aa6', blink: n.id,
    });
    cache.set(key, c);
    return c;
  }
  const img = Figure.person({
    body: n.body, bodyOverride: n.tall ? { legLen: 7, torsoH: 13 } : null, skin: n.skin, hair: n.hair, eye: n.eye,
    hairStyle: n.hairStyle, beard: n.beard || null, nose: Figure.NOSES[n.nose || 0],
    brows: Figure.BROWS[0], mouth: Figure.MOUTHS[0],
    wear: n.wear, pose, frame, mood: 'happy', tool: n.tool ? { kind: n.tool, carry: true } : null, toolMetal: '#9a9aa6', blink: n.id,
  });
  const c = toCanvas(img); c.ax = img.ax; c.ay = img.ay;
  cache.set(key, c);
  return c;
}

/** Draw a dwarf sprite with its feet at (x, y), with a ground shadow; returns where it went (for hit tests). */
export function placeDwarf(ctx, spr, x, y, flip = false, shadow = true) {
  const sx = Math.round(x - (flip ? spr.width - spr.ax : spr.ax)), sy = Math.round(y - spr.ay);
  if (shadow && spr.height > spr.width) groundShadow(ctx, x, y);
  if (flip) { ctx.save(); ctx.translate(sx + spr.width, sy); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
  else ctx.drawImage(spr, sx, sy);
  return { sx, sy };
}

/** Just the dwarf, trimmed: for portraits in panels. */
export function portrait(d, pose = 'idle') {
  const key = 'pt|' + d.id + '|' + pose + '|' + JSON.stringify(look(d)) + JSON.stringify(d.wear || {}) + d.armor + d.helm + mood(d);
  if (cache.has(key)) return cache.get(key);
  const s = dwarfSprite(d, pose, 0);
  const g = s.getContext('2d'), id = g.getImageData(0, 0, s.width, s.height).data;
  let x0 = s.width, y0 = s.height, x1 = 0, y1 = 0;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (id[(y * s.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  const c = mk(side, side);
  c.getContext('2d').drawImage(s, x0, y0, x1 - x0 + 1, y1 - y0 + 1, Math.floor((side - (x1 - x0 + 1)) / 2), side - (y1 - y0 + 1), x1 - x0 + 1, y1 - y0 + 1);
  cache.set(key, c);
  return c;
}

/** Icon for a piece of clothing in the store. */
export function wearIcon(key) {
  if (cache.has('wi:' + key)) return cache.get('wi:' + key);
  const w = parseWear(key);
  const c = w ? toCanvas(Figure.icon(w.cloth.look, w.color, w.cloth.slot)) : mk(16, 16);
  cache.set('wi:' + key, c);
  return c;
}

// ------------------------------------------------------------------ other

export function monster(id, frame = 0) { return sprite(`mon_${id}_${frame % 2}`); }
export function wagon(frame = 0) { return sprite(`wagon_${frame % 2}`); }
export function torch(frame) { return sprite(`torch_${((frame % 3) + 3) % 3}`); }

// ------------------------------------------------------------------ rooms


/** Look tier of a room: 0 dug out, 1 settled, 2 grand, 3 king's hall (ROOM_TIERS gives the level each one starts at). */
export function roomTier(b) {
  const t = META.ROOM_TIERS || [1, 2, 3], lv = b.level || 1;
  let k = 0; for (let i = 0; i < t.length; i++) if (lv >= t[i]) k = i;
  return k;
}
export function roomVariant(b, i = 0) { return hash((b.id || b.type) + ':' + i) % (META.ROOM_VARIANTS || 1); }

/** Width in pixels of a room with all its machines. */
export function roomWidth(b) {
  const R = META.ROOMS[b.type], bay = META.BAYS[b.type];
  return (R.w + (bay ? (Math.max(1, b.machines || 1) - 1) * bay.w : 0)) * META.CELL;
}

/** Pixel x of machine i inside the room, plus that machine's anchors (BAYS for i >= 1, ROOMS for i = 0). */
export function machineAt(b, i) {
  if (i === 0) return { x: 0, a: META.ROOMS[b.type] };
  return { x: (META.ROOMS[b.type].w + (i - 1) * META.BAYS[b.type].w) * META.CELL, a: META.BAYS[b.type] };
}

/** Rooms are carved caves, not boxes: a round vault on top, soft rounded lower corners, a dark rim. */
function carve(c) {
  const g = c.getContext('2d'), w = c.width, H = c.height, R = 24, r2 = 6;
  const id = g.getImageData(0, 0, w, H), d = id.data;
  const set = (x, y, rim) => { const k = (y * w + x) * 4; if (rim) { d[k] = 0x1f; d[k + 1] = 0x1c; d[k + 2] = 0x28; d[k + 3] = 255; } else d[k + 3] = 0; };
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    let edge = false;
    if (y < R && (x < R || x >= w - R)) {
      const cx = x < R ? R : w - R - 1, dd = Math.hypot(x - cx, y - R);
      if (dd > R) { set(x, y, false); continue; }
      edge = dd > R - 1.6;
    }
    if (y >= H - r2 && (x < r2 || x >= w - r2)) {
      const cx = x < r2 ? r2 : w - r2 - 1, dd = Math.hypot(x - cx, y - (H - r2 - 1));
      if (dd > r2) { set(x, y, false); continue; }
    }
    if (edge || (y >= R && (x === 0 || x === w - 1)) || (y === 0 && x >= R && x < w - R)) set(x, y, true);
  }
  g.putImageData(id, 0, 0);
}

/** The finished picture of a room: base room of its tier and variant, one bay per extra machine, a cobweb or two, carved. */
export function roomImage(b) {
  if (overrides.has('room_' + b.type)) return sprite('room_' + b.type);
  const T = roomTier(b), n = META.BAYS[b.type] ? Math.max(1, b.machines || 1) : 1;
  const key = 'r:' + b.type + ':' + T + ':' + n + ':' + (b.id || '');
  if (cache.has(key)) return cache.get(key);
  const c = mk(roomWidth(b), META.ROOM_H), g = c.getContext('2d');
  const base = 'room_' + b.type + '_' + T + '_' + roomVariant(b);
  draw(g, frames[base] ? base : 'room_' + b.type + '_1_0', 0, 0);
  for (let i = 1; i < n; i++) draw(g, 'bay_' + b.type + '_' + T + '_' + roomVariant(b, i), machineAt(b, i).x, 0);
  // a cobweb that only this room has, in a corner the base art leaves free
  const h = hash(b.id || b.type);
  if (n > 1 || h % 3 === 0) draw(g, 'deco_web_' + (h % 3), c.width - 30 - (h % 5) * 2, 8 + (h % 2) * 2, true);
  carve(c);
  cache.set(key, c);
  return c;
}

/** Room picture for cards and sheets: a building, or just a type (shown settled, one machine). */
export function room(b) { return roomImage(typeof b === 'string' ? { type: b, level: 2, id: b } : b); }

/** A soft pixel shadow on the ground under feet at (x, y): two rows, darker in the middle. */
export function groundShadow(ctx, x, y, half = 6) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(16,10,22,0.22)';
  ctx.fillRect(x - half, y - 1, half * 2, 2);
  ctx.fillRect(x - half + 2, y - 2, half * 2 - 4, 1);
  ctx.fillStyle = 'rgba(16,10,22,0.2)';
  ctx.fillRect(x - half + 2, y - 1, half * 2 - 4, 2);
}
