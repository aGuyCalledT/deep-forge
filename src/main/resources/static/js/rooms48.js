// Room templates for the 48-px art: what a room looks like (wall, floor, furniture) and where dwarves work, sit,
// sleep and where light comes from. Made with the room editor (tools/room-editor), stored in
// art/props48/rooms/<type>/<part>_<name>.json, listed in art/props48/rooms/index.json. Shared by the editor and the game.
//
// A template: {version, type, part: 'room'|'bay', name, cells, wall, floor, vault,
//              props: [{s: sprite, x, y, flip, z, frame: null = animate | n, layer: 'back' | 'front'}],
//              spots: [{kind, x, y, face: front|left|right|back, sit, ...}]}   x, y in room pixels; floor line y 135
// spotPose(spot) gives the dwarf48 pose for a spot (e.g. a worker facing 'back' with sit: workSitBack).
import * as Art from './art48.js';

export const FLOOR = 135, RH = 144, CELL = 48;
export const WALLS = ['wall_rock', 'wall_brick', 'wall_ashlar', 'wall_panel'];
export const FLOORS = ['floor_planks', 'floor_flags', 'floor_earth'];

/** Spot kinds: what the game reads from a template. Colour and letter are for the editor's markers; help is the short
 * tooltip, about the longer explanation behind the editor's info button. */
export const SPOTS = {
  worker:  { c: '#6fd06f', t: 'W', face: 'right', sit: true, help: 'where a worker stands or sits (one per machine)',
    about: "Where a dwarf works in this room. The room's own machine uses the first worker spot; every machine bay has its own template with one. Pick where the dwarf faces and whether it sits: back + sits is a dwarf at a bench with its back to you." },
  seat:    { c: '#6fb0f0', t: 'S', face: 'front', help: 'a place to sit (tavern, barracks, guild)',
    about: 'A place where a dwarf sits down: to eat and drink in the tavern, to rest in the barracks, to plan in the guild. Each seat holds one dwarf, so more seats mean more guests at once. Put it on the bench or chair, at floor height.' },
  bar:     { c: '#f0c060', t: 'B', face: 'front', help: 'a place to stand and drink at the bar',
    about: 'A place to stand at the counter and drink (tavern). Dwarves queue here when the seats are full.' },
  bed:     { c: '#d080f0', t: 'Z', face: 'right', sides: true, help: 'a sleeping place, y = the mattress',
    about: 'One sleeping place. Each bed spot holds one sleeping dwarf, so a bunk bed needs two. Put it on the mattress; facing right puts the head on the left end, facing left on the right end.' },
  light:   { c: '#ffd98e', t: 'L', light: true, help: 'a light: radius, colour, strength',
    about: 'A light source. Everything within the radius is lit in its colour, strength sets how bright; outside every light the room stays dim. Put it on the flame of a torch, candle or fire.' },
  fire:    { c: '#ff8040', t: 'F', size: true, help: 'the fire area (smoke, sparks, heat glow)',
    about: 'The burning area of a forge, smelter or fireplace. Smoke, sparks and the heat glow come from here, and it burns brighter while the bellows are worked.' },
  chimney: { c: '#a09090', t: 'C', help: 'where smoke leaves the room',
    about: 'Where smoke leaves the room, usually the top of the flue or hood.' },
  bellows: { c: '#ff6060', t: 'b', help: 'click target: bellows',
    about: 'Click target: players click here to work the bellows, which makes the forge or smelter hotter.' },
  anvil:   { c: '#c0c0d0', t: 'A', help: 'hammer point: sparks fly here',
    about: 'Where the hammer lands: sparks fly from this point while the smith works.' },
  quench:  { c: '#60c0e0', t: 'Q', help: 'click target: quench barrel',
    about: 'Click target: players click here to quench a hot piece in the barrel.' },
  wheel:   { c: '#e0e080', t: 'G', help: 'grindstone wheel centre',
    about: 'Centre of the grinding wheel: it turns and throws sparks while someone grinds.' },
  work:    { c: '#80e0c0', t: 'w', help: 'the piece being worked on',
    about: 'The piece being worked on: the game shows the item and its progress here.' },
  kettle:  { c: '#f0a060', t: 'K', help: 'brew kettle',
    about: 'The brew kettle: it bubbles while a brew is on.' },
  steam:   { c: '#f0f0f0', t: 's', help: 'where steam rises',
    about: 'Where steam rises while brewing.' },
  stand:   { c: '#b0b0b0', t: 'I', face: 'front', sit: true, help: 'an idle spot to stand (or sit) around',
    about: 'A place to hang around when there is nothing to do: waiting, chatting, watching. Can be standing or sitting.' },
};

/** Where a dwarf on a spot looks: 'front', 'left', 'right' or 'back' (back = back to the viewer). */
export const FACINGS = ['front', 'left', 'right', 'back'];
export function facing(s) {
  if (typeof s.face === 'number') return s.face < 0 ? 'left' : s.face > 0 ? 'right' : 'front';   // old templates
  return FACINGS.includes(s.face) ? s.face : ((SPOTS[s.kind] || {}).face || 'front');
}
/** Seated? Seats always, workers and idle spots when `sit` is set. */
export const sits = s => s.kind === 'seat' || (!!s.sit && !!(SPOTS[s.kind] || {}).sit);
// pose of the dwarf48 kit per spot kind and view, [standing, seated]
const POSE = {
  worker: { front: ['hands', 'workSitFront'], side: ['work', 'workSit'], back: ['workBack', 'workSitBack'] },
  seat: { front: ['sit', 'sit'], side: ['sitSide', 'sitSide'], back: ['sitBack', 'sitBack'] },
  bar: { front: ['drink', 'drink'], side: ['idleSide', 'sitSide'], back: ['idleBack', 'sitBack'] },
  stand: { front: ['idle', 'sit'], side: ['idleSide', 'sitSide'], back: ['idleBack', 'sitBack'] },
  bed: { front: ['sleep', 'sleep'], side: ['sleep', 'sleep'], back: ['sleep', 'sleep'] },
};
/** The pose a dwarf takes on a spot: {pose, flip} (side poses face right, flip = left), or null for spots without dwarves. */
export function spotPose(s) {
  const t = POSE[s.kind];
  if (!t) return null;
  const f = facing(s), view = f === 'left' || f === 'right' ? 'side' : f;
  return { pose: t[view][sits(s) ? 1 : 0], flip: f === 'left' };
}

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
  anvil: [{ kind: 'anvil', dx: -4, dy: -23 }, { kind: 'worker', dx: -22, dy: 0, face: 'right' }],
  bellows: [{ kind: 'bellows', dx: 0, dy: -10 }],
  quench: [{ kind: 'quench', dx: 0, dy: -14 }],
  grindstone: [{ kind: 'wheel', dx: 0, dy: -22 }, { kind: 'worker', dx: 24, dy: 0, face: 'left' }],
  engraver: [{ kind: 'work', dx: -10, dy: -24 }, { kind: 'worker', dx: 0, dy: 0, face: 'back', sit: true }],
  jeweler: [{ kind: 'work', dx: -6, dy: -22 }, { kind: 'worker', dx: 0, dy: 0, face: 'back', sit: true }],
  sewing: [{ kind: 'work', dx: 0, dy: -22 }, { kind: 'worker', dx: 0, dy: 0, face: 'back', sit: true }],
  loom: [{ kind: 'work', dx: 0, dy: -40 }, { kind: 'worker', dx: 0, dy: 0, face: 'back', sit: true }],
  mushbed_2: [{ kind: 'work', dx: 0, dy: -10 }],
  desk: [{ kind: 'worker', dx: 0, dy: 0, face: 'back', sit: true }],
  maptable: [{ kind: 'seat', dx: -18, dy: 0 }, { kind: 'seat', dx: 18, dy: 0 }],
  dummy: [{ kind: 'worker', dx: -22, dy: 0, face: 'right' }],
};

/** Suggested spots for the props of a template (kinds the template already has are left out). */
export function autoSpots(tpl) {
  const have = new Set(tpl.spots.map(s => s.kind));
  const out = [];
  for (const p of tpl.props) {
    for (const s of PROP_SPOTS[p.s] || []) {
      if (have.has(s.kind) && s.kind !== 'light') continue;
      const { dx, dy, ...rest } = s;
      out.push({ ...rest, x: Math.round(p.x + (p.flip ? -dx : dx)), y: Math.round(p.y + dy), ...(s.face !== undefined ? { face: p.flip ? ({ left: 'right', right: 'left' }[s.face] || s.face) : s.face } : {}) });
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
// Two layers: props with layer 'front' stand in front of the dwarves (a table they sit behind, a cupboard in the
// foreground), all others (layer 'back' or none) behind them. Order: shell, back props, dwarves, front props.
export const LAYERS = ['back', 'front'];
export const layerOf = p => p.layer === 'front' ? 'front' : 'back';

/** Wall, floor and vault corners of a room (or bay) `w` px wide at x0, y0. `worldX` lines the tiles up. */
export function drawShell(ctx, tpl, x0, y0, w, worldX = x0) {
  ctx.save(); ctx.translate(x0 - worldX, 0);
  Art.tile(ctx, tpl.wall, worldX, y0, w); Art.tile(ctx, tpl.floor, worldX, y0 + FLOOR, w);
  ctx.restore();
  ctx.fillStyle = 'rgba(20,10,16,0.35)'; ctx.fillRect(x0, y0 + FLOOR - 1, w, 1);     // shadow where wall meets floor
  if (tpl.vault) { Art.draw(ctx, 'vault', 0, x0, y0); Art.draw(ctx, 'vault', 0, x0 + w - 1, y0, { flip: true }); }
}
/** Props of one layer ('back', 'front', or null for both) in z order; t = seconds, animated ones run ~6 frames/s. */
export function drawProps(ctx, tpl, x0, y0, t = 0, opts = {}) {
  const list = tpl.props.map((p, i) => ({ p, i }))
    .filter(({ p }) => !opts.layer || layerOf(p) === opts.layer)
    .sort((a, b) => (a.p.z || 0) - (b.p.z || 0) || a.i - b.i);
  for (const { p, i } of list) {
    const n = Art.frames(p.s);
    if (!n) continue;
    const f = p.frame != null ? p.frame : Math.floor(t * 6 + i * 1.7) % n;
    Art.draw(ctx, p.s, f, x0 + p.x, y0 + p.y, { flip: !!p.flip, glow: !!opts.glow });
  }
}
/** The light map of a room: dim plum ambient plus a warm, stepped cone per light spot. */
export function lightMap(tpl, w, t = 0, opts = {}) {
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
    for (let i = 0; i <= 4; i++) gr.addColorStop(i / 4, `rgba(${cr},${cg},${cb},${Math.min(1, Math.pow(1 - i / 4, 1.4) * p)})`);
    g.fillStyle = gr; g.fillRect(s.x - r, s.y - r, 2 * r, 2 * r);
  }
  const d = g.getImageData(0, 0, w, RH), px = d.data, step = 24;                       // hard steps like pixel art light
  for (let i = 0; i < px.length; i += 4) for (let j = 0; j < 3; j++) px[i + j] = Math.min(255, Math.round(px[i + j] / step) * step);
  g.putImageData(d, 0, 0);
  return lm;
}
/** Draw `paint(g, 0, 0)` lit by the light map onto ctx at x0, y0 (only where paint drew), then `glow(g)` unlit on top. */
function litLayer(ctx, lm, x0, y0, paint, glow) {
  const c = document.createElement('canvas'); c.width = lm.width; c.height = lm.height;
  const g = c.getContext('2d');
  paint(g);
  const mask = document.createElement('canvas'); mask.width = c.width; mask.height = c.height;
  mask.getContext('2d').drawImage(c, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.drawImage(lm, 0, 0);
  g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.35; g.drawImage(lm, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'source-over';
  if (glow) glow(g);
  ctx.drawImage(c, x0, y0);
}
/**
 * A whole room: shell and back props, then `opts.between(ctx, x0, y0)` (the dwarves), then front props.
 * opts: {light: true, ambient, worldX, between, front: 1 (alpha of the front layer, e.g. 0.4 to see behind it)}
 */
export function drawRoom(ctx, tpl, x0, y0, t = 0, opts = {}) {
  const w = (tpl.cells || 1) * CELL, worldX = opts.worldX ?? x0, between = opts.between, fa = opts.front ?? 1;
  const back = g => { drawShell(g, tpl, 0, 0, w, worldX); drawProps(g, tpl, 0, 0, t, { layer: 'back' }); };
  const front = g => drawProps(g, tpl, 0, 0, t, { layer: 'front' });
  const glow = layer => g => drawProps(g, tpl, 0, 0, t, { layer, glow: true });
  const withAlpha = (a, f) => { ctx.save(); ctx.globalAlpha = a; f(); ctx.restore(); };
  if (opts.light === false) {
    ctx.save(); ctx.translate(x0, y0); back(ctx); between && between(ctx, 0, 0); ctx.restore();
    withAlpha(fa, () => { ctx.save(); ctx.translate(x0, y0); front(ctx); ctx.restore(); });
    return;
  }
  const lm = lightMap(tpl, w, t, opts);
  litLayer(ctx, lm, x0, y0, back, glow('back'));
  if (between) litLayer(ctx, lm, x0, y0, g => between(g, 0, 0));
  withAlpha(fa, () => litLayer(ctx, lm, x0, y0, front, glow('front')));
}
