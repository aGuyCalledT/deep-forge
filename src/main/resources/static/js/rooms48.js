// Room templates for the 48-px art: what a room looks like (wall, floor, furniture) and where dwarves work, sit,
// sleep and where light comes from. Made with the room editor (tools/room-editor), stored in
// art/props48/rooms/<type>/<part>_<name>.json, listed in art/props48/rooms/index.json. Shared by the editor and the game.
//
// A template: {version, type, part: 'room'|'bay', name, cells, wall, floor, vault,
//              props: [{s: sprite, x, y, flip, z, frame: null = animate | n}],
//              spots: [{kind, x, y, ...}]}       x, y in room pixels; the floor line is y 135
import * as Art from './art48.js';

export const FLOOR = 135, RH = 144, CELL = 48;
export const WALLS = ['wall_rock', 'wall_brick', 'wall_ashlar', 'wall_panel'];
export const FLOORS = ['floor_planks', 'floor_flags', 'floor_earth'];

/** Spot kinds: what the game reads from a template. Colour and letter are for the editor's markers. */
export const SPOTS = {
  worker:  { c: '#6fd06f', t: 'W', face: true, help: 'where a worker stands (one per machine)' },
  seat:    { c: '#6fb0f0', t: 'S', help: 'a place to sit (tavern, barracks, guild)' },
  bar:     { c: '#f0c060', t: 'B', help: 'a place to stand and drink at the bar' },
  bed:     { c: '#d080f0', t: 'Z', help: 'a sleeping place, y = the mattress' },
  light:   { c: '#ffd98e', t: 'L', light: true, help: 'a light: radius, colour, strength' },
  fire:    { c: '#ff8040', t: 'F', size: true, help: 'the fire area (smoke, sparks, heat glow)' },
  chimney: { c: '#a09090', t: 'C', help: 'where smoke leaves the room' },
  bellows: { c: '#ff6060', t: 'b', help: 'click target: bellows' },
  anvil:   { c: '#c0c0d0', t: 'A', help: 'hammer point: sparks fly here' },
  quench:  { c: '#60c0e0', t: 'Q', help: 'click target: quench barrel' },
  wheel:   { c: '#e0e080', t: 'G', help: 'grindstone wheel centre' },
  work:    { c: '#80e0c0', t: 'w', help: 'the piece being worked on' },
  kettle:  { c: '#f0a060', t: 'K', help: 'brew kettle' },
  steam:   { c: '#f0f0f0', t: 's', help: 'where steam rises' },
  stand:   { c: '#b0b0b0', t: 'I', help: 'an idle spot to stand around' },
};

/** What each room needs at least (the game's old anchors), as {kind: count}. Bays need one worker. */
export const NEEDS = {
  tavern: { worker: 1, seat: 4, bar: 1, light: 1 },
  quarters: { bed: 4, light: 1 },
  warehouse: { seat: 1, light: 1 },
  vault: { light: 1 },
  smelter: { worker: 1, fire: 1, chimney: 1, bellows: 1, light: 1 },
  forge: { worker: 1, fire: 1, chimney: 1, anvil: 1, quench: 1, light: 1 },
  grindstone: { worker: 1, wheel: 1, light: 1 },
  engraver: { worker: 1, work: 1, light: 1 },
  jeweler: { worker: 1, work: 1, light: 1 },
  tailor: { worker: 1, work: 1, light: 1 },
  farm: { worker: 1, light: 1 },
  brewery: { worker: 1, kettle: 1, steam: 1, light: 1 },
  barracks: { worker: 1, seat: 3, light: 1 },
  trade_depot: { light: 1 },
  expedition_hall: { seat: 2, light: 1 },
};
export const BAY_NEEDS = { worker: 1 };

/** Spots a prop brings along, relative to its anchor (the editor's "Auto spots"). */
export const PROP_SPOTS = {
  torch: [{ kind: 'light', dx: 0, dy: -18, r: 110, c: '#ffb060', p: 0.9 }],
  lantern: [{ kind: 'light', dx: 0, dy: 28, r: 100, c: '#ffd98e', p: 0.75 }],
  candle: [{ kind: 'light', dx: 0, dy: -10, r: 44, c: '#ffd98e', p: 0.4 }],
  chandelier: [{ kind: 'light', dx: 0, dy: 26, r: 130, c: '#ffd98e', p: 0.75 }],
  fireplace: [{ kind: 'light', dx: 0, dy: -24, r: 110, c: '#ff9450', p: 0.95 }, { kind: 'fire', dx: 0, dy: -12, w: 30, h: 16 }, { kind: 'chimney', dx: 0, dy: -60 }],
  forge: [{ kind: 'light', dx: 0, dy: -36, r: 100, c: '#ff9450', p: 0.95 }, { kind: 'fire', dx: 0, dy: -33, w: 40, h: 8 }, { kind: 'chimney', dx: 0, dy: -94 }],
  smelter: [{ kind: 'light', dx: -1, dy: -16, r: 90, c: '#ff8a4a', p: 0.95 }, { kind: 'fire', dx: -1, dy: -10, w: 18, h: 14 }, { kind: 'chimney', dx: -1, dy: -88 }],
  brewkettle: [{ kind: 'light', dx: 0, dy: -8, r: 60, c: '#ffb070', p: 0.6 }, { kind: 'kettle', dx: 0, dy: -30 }, { kind: 'steam', dx: 0, dy: -56 }],
  kettle: [{ kind: 'light', dx: 0, dy: -6, r: 44, c: '#ffb070', p: 0.5 }],
  brazier: [{ kind: 'light', dx: 0, dy: -24, r: 90, c: '#ff9450', p: 0.8 }],
  glowshrooms: [{ kind: 'light', dx: 0, dy: -8, r: 46, c: '#90e0c8', p: 0.55 }],
  crystals: [{ kind: 'light', dx: 0, dy: -14, r: 70, c: '#aacde4', p: 0.6 }],
  bed: [{ kind: 'bed', dx: 0, dy: -10 }],
  bunk: [{ kind: 'bed', dx: 0, dy: -10 }, { kind: 'bed', dx: 0, dy: -36 }],
  bench: [{ kind: 'seat', dx: -9, dy: 0 }, { kind: 'seat', dx: 9, dy: 0 }],
  chair: [{ kind: 'seat', dx: 0, dy: 0 }],
  stool: [{ kind: 'seat', dx: 0, dy: 0 }],
  bar: [{ kind: 'bar', dx: -18, dy: 0 }, { kind: 'bar', dx: 18, dy: 0 }],
  anvil: [{ kind: 'anvil', dx: -4, dy: -23 }, { kind: 'worker', dx: -22, dy: 0, face: 1 }],
  bellows: [{ kind: 'bellows', dx: 0, dy: -10 }],
  quench: [{ kind: 'quench', dx: 0, dy: -14 }],
  grindstone: [{ kind: 'wheel', dx: 0, dy: -22 }, { kind: 'worker', dx: 24, dy: 0, face: -1 }],
  engraver: [{ kind: 'work', dx: -10, dy: -24 }, { kind: 'worker', dx: 0, dy: 0, face: 0 }],
  jeweler: [{ kind: 'work', dx: -6, dy: -22 }, { kind: 'worker', dx: 0, dy: 0, face: 0 }],
  sewing: [{ kind: 'work', dx: 0, dy: -22 }, { kind: 'worker', dx: 0, dy: 0, face: 0 }],
  loom: [{ kind: 'work', dx: 0, dy: -40 }, { kind: 'worker', dx: 0, dy: 0, face: 0 }],
  mushbed_2: [{ kind: 'work', dx: 0, dy: -10 }],
  desk: [{ kind: 'worker', dx: 0, dy: 0, face: 0 }],
  maptable: [{ kind: 'seat', dx: -18, dy: 0 }, { kind: 'seat', dx: 18, dy: 0 }],
  dummy: [{ kind: 'worker', dx: -22, dy: 0, face: 1 }],
};

/** Suggested spots for the props of a template (kinds the template already has are left out). */
export function autoSpots(tpl) {
  const have = new Set(tpl.spots.map(s => s.kind));
  const out = [];
  for (const p of tpl.props) {
    for (const s of PROP_SPOTS[p.s] || []) {
      if (have.has(s.kind) && s.kind !== 'light') continue;
      const { dx, dy, ...rest } = s;
      out.push({ ...rest, x: Math.round(p.x + (p.flip ? -dx : dx)), y: Math.round(p.y + dy), ...(s.face !== undefined ? { face: p.flip ? -s.face : s.face } : {}) });
    }
  }
  return out;
}
/** What is missing: [{kind, have, need}] */
export function missing(tpl) {
  const need = tpl.part === 'bay' ? BAY_NEEDS : (NEEDS[tpl.type] || {});
  const count = {};
  for (const s of tpl.spots) count[s.kind] = (count[s.kind] || 0) + 1;
  return Object.entries(need).filter(([k, n]) => (count[k] || 0) < n).map(([k, n]) => ({ kind: k, have: count[k] || 0, need: n }));
}
export function blank(type, part, cells) {
  return { version: 1, type, part, name: '', cells, wall: 'wall_brick', floor: 'floor_planks', vault: part === 'room', props: [], spots: [] };
}

// ------------------------------------------------------------------ loading
let idx = null;
const cache = new Map();
export async function load(base = 'art/props48/rooms/') {
  idx = await fetch(base + 'index.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
  load.base = base;
  return idx;
}
export const index = () => idx || {};
export const looks = (type, part = 'room') => ((idx || {})[type] || {})[part] || [];
/** The template for a room: the chosen look, else the first one there is (null if the type has none). */
export async function get(type, part = 'room', name = '') {
  const list = looks(type, part);
  const pick = list.includes(name) ? name : list[0];
  if (!pick) return null;
  const k = `${type}/${part}_${pick}`;
  if (!cache.has(k)) cache.set(k, fetch(`${load.base}${type}/${part}_${pick}.json`).then(r => r.json()));
  return cache.get(k);
}

// ------------------------------------------------------------------ drawing
/** Wall, floor and vault corners of a room (or bay) `w` px wide at x0, y0. `worldX` lines the tiles up. */
export function drawShell(ctx, tpl, x0, y0, w, worldX = x0) {
  const save = () => { ctx.save(); ctx.translate(x0 - worldX, 0); };
  save(); Art.tile(ctx, tpl.wall, worldX, y0, w); Art.tile(ctx, tpl.floor, worldX, y0 + FLOOR, w); ctx.restore();
  ctx.fillStyle = 'rgba(20,10,16,0.35)'; ctx.fillRect(x0, y0 + FLOOR - 1, w, 1);     // shadow where wall meets floor
  if (tpl.vault) { Art.draw(ctx, 'vault', 0, x0, y0); Art.draw(ctx, 'vault', 0, x0 + w - 1, y0, { flip: true }); }
}
/** Props in z order; t = time in seconds for animated ones (4 frames at ~6 per second). */
export function drawProps(ctx, tpl, x0, y0, t = 0, opts = {}) {
  const list = [...tpl.props].map((p, i) => ({ p, i })).sort((a, b) => (a.p.z || 0) - (b.p.z || 0) || a.i - b.i);
  for (const { p, i } of list) {
    const n = Art.frames(p.s);
    if (!n) continue;
    const f = p.frame != null ? p.frame : Math.floor(t * 6 + i * 1.7) % n;
    Art.draw(ctx, p.s, f, x0 + p.x, y0 + p.y, { flip: !!p.flip, glow: !!opts.glow });
  }
}
/** Warm light: multiply a light map over what is drawn, then lay the self-lit pixels on top. */
export function drawLight(ctx, tpl, x0, y0, w, t = 0, opts = {}) {
  const ambient = opts.ambient ?? 0.45;
  const lm = document.createElement('canvas'); lm.width = w; lm.height = RH;
  const g = lm.getContext('2d');
  const a = Math.round(255 * ambient);
  g.fillStyle = `rgb(${a},${Math.round(a * 0.94)},${Math.round(a * 1.08)})`;           // shadows lean plum
  g.fillRect(0, 0, w, RH);
  g.globalCompositeOperation = 'lighter';
  const flick = k => k * (1 + 0.04 * Math.sin(t * 9 + k * 7));
  for (const s of tpl.spots) {
    if (s.kind !== 'light') continue;
    const r = s.r || 90, p = flick(s.p ?? 0.8);
    const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    const [cr, cg, cb] = [1, 3, 5].map(i => parseInt((s.c || '#ffd98e').slice(i, i + 2), 16));
    for (let i = 0; i <= 4; i++) {
      const k = Math.pow(1 - i / 4, 1.4) * p;
      gr.addColorStop(i / 4, `rgba(${cr},${cg},${cb},${Math.min(1, k)})`);
    }
    g.fillStyle = gr; g.fillRect(s.x - r, s.y - r, 2 * r, 2 * r);
  }
  // hard steps like pixel art light
  const d = g.getImageData(0, 0, w, RH), px = d.data, step = 24;
  for (let i = 0; i < px.length; i += 4) for (let j = 0; j < 3; j++) px[i + j] = Math.min(255, Math.round(px[i + j] / step) * step);
  g.putImageData(d, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(lm, x0, y0);
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.35; ctx.drawImage(lm, x0, y0);
  ctx.restore();
  drawProps(ctx, tpl, x0, y0, t, { glow: true });
}
/** Everything: shell, props, light. */
export function drawRoom(ctx, tpl, x0, y0, t = 0, opts = {}) {
  const w = (tpl.cells || 1) * CELL;
  drawShell(ctx, tpl, x0, y0, w, opts.worldX ?? x0);
  drawProps(ctx, tpl, x0, y0, t);
  if (opts.light !== false) drawLight(ctx, tpl, x0, y0, w, t, opts);
}
