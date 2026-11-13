// The mines: one screen per layer (G.mineLayer), drawn in the 48-px art like the hold but darker and lit only by
// torches. A tunnel cut into the layer's rock with a jagged ceiling, support pillars hewn from the stone (at the back
// and, dark, in front), ore seams of the layer in the walls, rocks and stalactites in front that hide the dwarves.
// Miners wear their miner's hat and swing picks at ore boulders, now and then they carry ore to the cart. The cart
// fills up (Sim.mining: LayerState.cart); a full cart rolls into the dark tunnel mouth to the lift and an empty one
// comes back. Only then is the ore in the warehouse.
import { G, F, D, byId } from './data.js';
import * as S from './sprites.js';
import * as Art from './art48.js';
import * as DW from './dwarf48.js';
import { sign, text } from './pixfont.js';
import { look48, ramp } from './hold.js';

export const MW = 1632;                 // width of a mine level
const FLOOR = 352, MH = 480, TOP = 110; // floor line, bottom of the world, mean height of the ceiling
const FEET = FLOOR + 7;                 // dwarves walk in front of the rails
const RAIL = FLOOR - 3;                 // top of the rail, the cart's wheels stand on it
const HOLE = 100, CART = 236;           // tunnel mouth (middle) and where the cart waits
const FACE = MW - 70;                   // the working face at the end of the tunnel
const ROLL = 4, GONE = 4, BACK = 4;     // seconds: a full cart rolls into the dark, stays away, an empty one comes back

/** Which layer the mines screen shows: the one picked, else the busiest open one. */
export function mineLayer() {
  const f = F();
  if (G.mineLayer != null && f.layers[G.mineLayer]) return G.mineLayer;
  let best = 0, most = -1;
  f.layers.forEach((l, i) => {
    if (!l.unlocked) return;
    const n = f.dwarves.filter((d) => d.job === 'miner' && d.layer === i).length;
    if (n > most) { most = n; best = i; }
  });
  return best;
}

// ------------------------------------------------------------------ the shape of a level (fixed per layer)
const plans = new Map();
function planOf(i) {
  if (plans.has(i)) return plans.get(i);
  const r = S.rand(1000 + i * 77);
  const pillars = [], fgPillars = [];
  for (let x = 330 + Math.floor(r() * 40); x < FACE - 150; x += 210 + Math.floor(r() * 50)) pillars.push(x);
  for (let x = 470 + Math.floor(r() * 60); x < FACE - 60; x += 380 + Math.floor(r() * 90)) fgPillars.push(x);
  // the ceiling: rough, lower where a pillar holds it up (the capital is cut into it)
  const ceil = [];
  for (let x = 0; x <= MW; x += 8) {
    let y = TOP + 16 * Math.sin(x / 97 + i) + 9 * Math.sin(x / 37 + i * 2) + Math.floor(r() * 9) - 4;
    for (const px of pillars) { const d = Math.abs(x - px); if (d < 60) y = y + (FLOOR - 206 - y) * Math.max(0, 1 - Math.max(0, d - 22) / 38); }
    ceil.push(Math.round(y));
  }
  // the working face at the far end and the wall at the near end, both jagged
  const face = [], near = [];
  for (let y = 0; y <= FLOOR; y += 8) { face.push(FACE + Math.floor(r() * 14) - 7 + Math.round(10 * Math.sin(y / 31))); near.push(30 + Math.floor(r() * 10)); }
  const cavity = new Path2D();
  cavity.moveTo(near[near.length - 1], FLOOR + 1);
  for (let k = near.length - 1; k >= 0; k--) { const y = k * 8; if (y >= ceilAt(ceil, near[k])) cavity.lineTo(near[k], y); }
  for (let x = 32; x <= FACE; x += 8) cavity.lineTo(x, ceil[x / 8 | 0]);
  for (let k = 0; k < face.length; k++) { const y = k * 8; if (y >= ceilAt(ceil, face[k])) cavity.lineTo(face[k], y); }
  cavity.lineTo(face[face.length - 1], FLOOR + 1);
  cavity.closePath();
  // things at the back: ore seams, spires, boulders; in front: rocks and big stalactites
  const ores = Object.entries(G.data.layers[i].weights).filter(([k]) => k !== 'stone' && k !== 'limestone');
  const total = ores.reduce((s, [, w]) => s + w, 0);
  const pickOre = () => { let v = r() * total; for (const [k, w] of ores) { v -= w; if (v <= 0) return k; } return ores[0][0]; };
  const seams = [];
  for (let x = 170; x < FACE - 20; x += 70 + Math.floor(r() * 90)) {
    const top = ceilAt(ceil, x) + 26;
    seams.push({ x, y: top + Math.floor(r() * Math.max(10, FLOOR - 90 - top)), ore: pickOre(), v: Math.floor(r() * 3) });
  }
  for (let k = 0; k < 4; k++) seams.push({ x: FACE - 14 + Math.floor(r() * 10), y: 170 + k * 44 + Math.floor(r() * 16), ore: pickOre(), v: k % 3 });
  const back = [];
  for (let x = 160; x < FACE - 40; x += 120 + Math.floor(r() * 140)) back.push({ x, kind: r() < 0.5 ? 'mine_spire_' + (r() < 0.5 ? 0 : 1) : r() < 0.5 ? 'stalagmites' : 'boulder', flip: r() < 0.5 });
  const hang = [];
  for (let x = 60; x < FACE; x += 90 + Math.floor(r() * 120)) hang.push({ x, kind: r() < 0.25 && i === 0 ? 'roots' : r() < 0.2 ? 'cobweb' : 'stalactites', flip: r() < 0.5 });
  const fgRocks = [], fgStals = [];
  for (let x = 330 + Math.floor(r() * 80); x < MW; x += 230 + Math.floor(r() * 200)) fgRocks.push({ x, kind: 'mine_fg_rock_' + Math.floor(r() * 3), flip: r() < 0.5, dy: Math.floor(r() * 14) });
  for (let x = 140 + Math.floor(r() * 80); x < MW; x += 260 + Math.floor(r() * 200)) fgStals.push({ x, kind: 'mine_fg_stal_' + (r() < 0.5 ? 0 : 1), flip: r() < 0.5 });
  const p = { ceil, face, cavity, pillars, fgPillars, seams, back, hang, fgRocks, fgStals };
  plans.set(i, p);
  return p;
}
function ceilAt(ceil, x) { return ceil[Math.max(0, Math.min(ceil.length - 1, Math.round(x / 8)))]; }

// ------------------------------------------------------------------ drawing helpers
const rd = (i) => Art.depthRamp(i);
const colourOf = (k) => ((byId.ores && byId.ores[k]) || (byId.raws && byId.raws[k]) || {}).color || '#90bf98';
const oreRamp = (k) => ramp(colourOf(k));
const patterns = new Map();
function rockFill(ctx, i) {
  const name = 'rock_' + Math.min(4, i);
  if (!patterns.has(name)) patterns.set(name, ctx.createPattern(Art.frame(name, 0).canvas, 'repeat'));
  return patterns.get(name);
}
/** A sprite darkened for the foreground (it is drawn after the lighting, so it must carry its own darkness). */
const darkCache = new Map();
function dark(name, i, k = 0.72, flip = false) {
  const key = name + i + k + flip;
  if (darkCache.has(key)) return darkCache.get(key);
  const fr = Art.frame(name, 0, { recolour: { rockd: rd(i) }, flip });
  const c = S.mk(fr.canvas.width, fr.canvas.height), g = c.getContext('2d');
  g.drawImage(fr.canvas, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(6,4,10,${k})`; g.fillRect(0, 0, c.width, c.height);
  const out = { canvas: c, ax: fr.ax, ay: fr.ay };
  darkCache.set(key, out);
  return out;
}
/** The front pillar, as tall as it needs to be: capital, the shaft repeated, foot. */
function tallPillar(i, height) {
  const key = 'tall' + i + height;
  if (darkCache.has(key)) return darkCache.get(key);
  const src = dark('mine_pillar_fg', i, 0.62).canvas, w = src.width, sh = src.height;
  const c = S.mk(w, height), g = c.getContext('2d');
  g.drawImage(src, 0, 0, w, 40, 0, 0, w, 40);
  for (let y = 40; y < height - 40; y += 144) g.drawImage(src, 0, 48, w, Math.min(144, height - 40 - y), 0, y, w, Math.min(144, height - 40 - y));
  g.drawImage(src, 0, sh - 40, w, 40, 0, height - 40, w, 40);
  const out = { canvas: c, ax: 20, ay: height - 1 };
  darkCache.set(key, out);
  return out;
}
const put = (ctx, fr, x, y) => ctx.drawImage(fr.canvas, Math.round(x - fr.ax), Math.round(y - fr.ay));

// ------------------------------------------------------------------ the cart
const carts = new Map();   // layer -> {sent, ore, anim: start (performance seconds) or null}
function cartState(i, ls, size, tNow) {
  let c = carts.get(i);
  const ore = topOre(ls.cart);
  if (!c) { c = { sent: ls.cartSent, ore: ore || 'native_copper', anim: null }; carts.set(i, c); }
  if (ls.cartSent && ls.cartSent !== c.sent) { c.sent = ls.cartSent; c.anim = tNow; }   // a full cart just left
  const total = Object.values(ls.cart || {}).reduce((s, v) => s + v, 0);
  const fill = total >= size ? 4 : total <= 0 ? 0 : Math.min(3, 1 + Math.floor(total / size * 3));
  let x = CART, frame = fill, alpha = 1, heap = ore || c.ore;
  if (c.anim != null) {
    const a = tNow - c.anim;
    if (a < ROLL) { x = CART + (HOLE - CART) * ease(a / ROLL); frame = 4; heap = c.ore; }
    else if (a < ROLL + GONE) alpha = 0;
    else if (a < ROLL + GONE + BACK) x = HOLE + (CART - HOLE) * ease((a - ROLL - GONE) / BACK);
    else c.anim = null;
    if (alpha) alpha = Math.max(0, Math.min(1, (x - HOLE + 6) / 60));   // into (and out of) the dark
  }
  if (ore) c.ore = ore;
  return { x, frame, alpha, heap, total, size, moving: c.anim != null };
}
const ease = (u) => u * u * (3 - 2 * u);
function topOre(cart) {
  let best = null, n = 0;
  for (const [k, v] of Object.entries(cart || {})) if (k !== 'stone' && k !== 'limestone' && v > n) { best = k; n = v; }
  return best;
}

// ------------------------------------------------------------------ the miners
const SPEED = 46;
function minerAt(d, k, n, t) {
  const span = FACE - 120 - 330;
  const spot = Math.round(330 + (k + 0.5) * span / Math.max(1, n) + ((d.id * 37) % 40) - 20);
  const walk = (spot - (CART + 40)) / SPEED;
  const period = 16 + (d.id % 5) + 2 * walk + 1.5;
  const ph = (t + d.id * 3.7) % period;
  if (ph < 16 + (d.id % 5)) return { x: spot, pose: 'mine', flip: false, spot };
  const u = ph - 16 - (d.id % 5);
  if (u < walk) return { x: spot - u * SPEED, pose: 'walk', flip: true, spot };
  if (u < walk + 1.5) return { x: CART + 40, pose: 'idleSide', flip: true, spot };
  return { x: CART + 40 + (u - walk - 1.5) * SPEED, pose: 'walk', flip: false, spot };
}
const FPS = { mine: 4, walk: 8, idleSide: 1, idle: 0.6 };
const flipped = new WeakMap();
function dwarfCanvas(look, pose, f, flip) {
  const c = DW.frame(look, pose, f);
  if (!flip) return c;
  let m = flipped.get(c);
  if (!m) { m = S.mk(c.width, c.height); const g = m.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); flipped.set(c, m); }
  return m;
}

// ------------------------------------------------------------------ the screen
let view = { x: 0, y: 0, w: MW, h: MH };
const drawn = [];
const chips = [];
let lamps = [], torches = [];

export const mineScreen = {
  camera: true,
  size: () => ({ w: MW, h: MH }),
  bounds: () => ({ x0: 0, y0: TOP - 70, x1: MW, y1: MH }),
  home(r) {
    const zoom = r.height / (FLOOR + 70 - (TOP - 40)) >= 1.95 ? 2 : 1, vh = r.height / zoom;
    return { zoom, x: r.width / zoom < 700 ? 40 : 0, y: Math.max(TOP - 70, Math.min(MH - vh, FLOOR + 60 - vh)) };
  },
  draw(ctx, t, v) {
    view = v;
    drawn.length = 0; lamps = []; torches = [];
    const i = mineLayer(), f = F(), ls = f.layers[i], P = planOf(i), R = { rockd: rd(i) };
    // solid rock everywhere, the tunnel's back wall a little deeper and darker
    ctx.fillStyle = rockFill(ctx, i); ctx.fillRect(view.x - 2, view.y - 2, view.w + 4, view.h + 4);
    if (!ls.unlocked) return drawLocked(ctx, t, i);
    ctx.save(); ctx.clip(P.cavity);
    ctx.fillStyle = 'rgba(8,5,12,0.22)'; ctx.fillRect(0, 0, MW, FLOOR + 2);
    for (const s of P.seams) Art.draw(ctx, 'ore_seam_' + s.v, 0, s.x, s.y, { recolour: { ...R, ingot: oreRamp(s.ore) } });
    if (i >= 3) for (let x = 400; x < FACE; x += 520) Art.draw(ctx, 'crystals', 0, x, FLOOR + 1, { recolour: R });
    for (const h of P.hang) {
      const y = ceilAt(P.ceil, h.x) - 2;
      if (h.kind === 'cobweb') Art.draw(ctx, 'cobweb', 0, h.x, y, { flip: h.flip });
      else Art.draw(ctx, h.kind, 0, h.x, y, { recolour: R, flip: h.flip });
    }
    // shade under the ceiling and along both ends
    const sh = ctx.createLinearGradient(0, TOP - 40, 0, TOP + 70);
    sh.addColorStop(0, 'rgba(10,6,14,0.75)'); sh.addColorStop(1, 'rgba(10,6,14,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, MW, TOP + 70);
    ctx.restore();
    // pillars at the back, the ceiling cut round their capitals
    for (const x of P.pillars) {
      Art.draw(ctx, 'mine_pillar', 0, x, FLOOR + 1, { recolour: R });
      torches.push({ x: x, y: FLOOR - 80 });
    }
    ctx.save();
    const outside = new Path2D(); outside.rect(view.x - 4, view.y - 4, view.w + 8, view.h + 8); outside.addPath(P.cavity);
    ctx.clip(outside, 'evenodd');
    ctx.fillStyle = rockFill(ctx, i); ctx.fillRect(view.x - 2, view.y - 2, view.w + 4, view.h + 4);
    ctx.fillStyle = 'rgba(6,4,10,0.6)'; ctx.fillRect(view.x - 2, view.y - 2, view.w + 4, view.h + 4);
    const below = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 90);
    below.addColorStop(0, 'rgba(6,4,10,0)'); below.addColorStop(1, 'rgba(6,4,10,0.35)');
    ctx.fillStyle = below; ctx.fillRect(view.x - 2, FLOOR, view.w + 4, MH - FLOOR);
    ctx.restore();
    // the lit lip of the ceiling and a little moss or glow where it is damp
    for (let x = 32; x < FACE; x += 2) {
      const y = ceilAt(P.ceil, x);
      ctx.fillStyle = 'rgba(12,8,16,0.9)'; ctx.fillRect(x, y - 2, 2, 2);
      ctx.fillStyle = 'rgba(210,190,165,0.3)'; ctx.fillRect(x, y, 2, 1);
      ctx.fillStyle = 'rgba(10,6,14,0.4)'; ctx.fillRect(x, y + 1, 2, 5);
    }
    for (const b of P.back) Art.draw(ctx, b.kind, 0, b.x, FLOOR + 1, { recolour: R, flip: b.flip });
    if (i === 0) for (let x = 520; x < FACE; x += 610) Art.draw(ctx, 'glowshrooms', 0, x, FLOOR + 1);
    // the floor, the tunnel mouth and the rails
    ctx.fillStyle = 'rgba(214,190,160,0.3)'; ctx.fillRect(30, FLOOR + 1, FACE - 30, 1);
    ctx.fillStyle = 'rgba(70,56,52,0.5)'; ctx.fillRect(30, FLOOR + 2, FACE - 30, 3);
    Art.draw(ctx, 'mine_hole', 0, HOLE, FLOOR + 1, { recolour: R });
    torches.push({ x: HOLE + 56, y: FLOOR - 70 });
    for (const tc of torches) Art.draw(ctx, 'torch', Math.floor(t * 8 + tc.x) % 4, tc.x, tc.y);
    Art.tile(ctx, 'rail', HOLE - 24, RAIL, FACE - 30 - HOLE, { recolour: R });
    // miners, their ore boulders, the cart
    const miners = f.dwarves.filter((d) => d.job === 'miner' && d.layer === i && !d.busy && !d.dig).sort((a, b) => a.id - b.id);
    const threat = ls.threat ? f.threats.find((th) => String(th.id) === ls.threat) : null;
    const size = (D().layers[i] || {}).cartSize || 10;
    const cart = cartState(i, ls, size, performance.now() / 1000);
    if (!threat) miners.forEach((d, k) => { const m = minerAt(d, k, miners.length, t); Art.draw(ctx, 'boulder_ore', 0, m.spot + 34, FEET - 2, { recolour: { ...R, ingot: oreRamp(P.seams[(d.id + k) % P.seams.length].ore) } }); });
    if (cart.alpha > 0) {
      ctx.globalAlpha = cart.alpha;
      Art.draw(ctx, 'minecart', cart.frame, cart.x, RAIL, { recolour: { ...R, ingot: oreRamp(cart.heap) } });
      ctx.globalAlpha = 1;
    }
    this._cart = cart;
    const people = [];
    if (threat) {
      const mx = 760 + Math.sin(t * 0.5) * 220;
      Art.draw(ctx, threat.monster, Math.floor(t * 4) % 4, mx, FEET, { flip: Math.cos(t * 0.5) < 0 });
      miners.forEach((d, k) => people.push({ d, x: 160 + k * 22, pose: 'idle', flip: false, mood: 'angry' }));
    } else {
      miners.forEach((d, k) => { const m = minerAt(d, k, miners.length, t); people.push({ d, x: m.x, pose: m.pose, flip: m.flip }); });
    }
    if (i === 0) f.dwarves.filter((x) => x.job === 'warrior' && x.post === 'mine' && !x.busy).slice(0, 3)
      .forEach((d, k) => people.push({ d, x: 300 + k * 26, pose: 'idleSide', flip: false, guard: true }));
    for (const p of people) {
      const look = look48(p.d, { hat: p.guard ? null : 'miner', prop: p.guard ? 'axe' : null });
      const fr = Math.floor((t + p.d.id * 0.37) * (FPS[p.pose] || 1));
      const c = dwarfCanvas(p.mood ? { ...look, mood: p.mood } : look, p.pose, fr, p.flip);
      const sx = Math.round(p.x - (p.flip ? c.width - 24 : 24)), sy = FEET - 62;
      S.groundShadow(ctx, p.x, FEET, 10);
      ctx.drawImage(c, sx, sy);
      drawn.push({ id: p.d.id, sx, sy, spr: c });
      if (!p.guard) lamps.push({ x: p.x + (p.flip ? -8 : 8), y: sy + 16 });
      if (p.pose === 'mine' && fr % 4 === 2 && Math.random() < 0.3) for (let n = 0; n < 3; n++) chips.push({ x: p.x + 30, y: FEET - 10, vx: 10 + Math.random() * 30, vy: -20 - Math.random() * 30, life: 0.5 });
    }
    for (let n = chips.length - 1; n >= 0; n--) {
      const q = chips[n]; q.life -= 0.05; q.x += q.vx * 0.05; q.y += q.vy * 0.05; q.vy += 120 * 0.05;
      if (q.life <= 0) { chips.splice(n, 1); continue; }
      ctx.fillStyle = '#cfc4b6'; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    }
  },
  ambient() { return [{ y0: -1000, y1: 5000, color: '#07050c', a: 0.86 }]; },
  lights() {
    const out = [];
    for (const tc of torches) out.push({ x: tc.x, y: tc.y - 22, r: 130, color: '#ffb060', flicker: 3, power: 0.9 });
    for (const l of lamps) out.push({ x: l.x, y: l.y, r: 34, color: '#fff0c0', power: 0.5 });
    return out;
  },
  hit(x, y) {
    for (let n = drawn.length - 1; n >= 0; n--) {
      const d = drawn[n];
      if (x >= d.sx + 10 && x < d.sx + d.spr.width - 10 && y >= d.sy + 12 && y < d.sy + d.spr.height) return { kind: 'dwarf', id: d.id, sprite: d.spr, sx: d.sx, sy: d.sy };
    }
    const c = this._cart;
    if (c && c.alpha > 0 && x >= c.x - 24 && x < c.x + 24 && y >= RAIL - 40 && y < RAIL + 2) return { kind: 'layer', id: mineLayer(), rect: [c.x - 24, RAIL - 40, 48, 42] };
    return null;
  },
  overlay(ctx, t) {
    const i = mineLayer(), f = F(), ls = f.layers[i], P = planOf(i);
    // what glows: torch flames, crystals, mushrooms
    for (const tc of torches) Art.draw(ctx, 'torch', Math.floor(t * 8 + tc.x) % 4, tc.x, tc.y, { glow: true });
    if (!ls.unlocked) return lockedSign(ctx, i);
    if (i >= 3) for (let x = 400; x < FACE; x += 520) Art.draw(ctx, 'crystals', 0, x, FLOOR + 1, { glow: true, recolour: { rockd: rd(i) } });
    if (i === 0) for (let x = 520; x < FACE; x += 610) Art.draw(ctx, 'glowshrooms', 0, x, FLOOR + 1, { glow: true });
    // the foreground: dark, close, unlit
    for (const x of P.fgPillars) put(ctx, tallPillar(i, FLOOR + 66 - (TOP - 90)), x, FLOOR + 66);
    for (const s of P.fgStals) put(ctx, dark(s.kind, i, 0.7, s.flip), s.x, ceilAt(P.ceil, s.x) - 24);
    const fg = ctx.createLinearGradient(0, FLOOR + 24, 0, FLOOR + 80);
    fg.addColorStop(0, 'rgba(6,4,10,0)'); fg.addColorStop(1, 'rgba(6,4,10,0.85)');
    ctx.fillStyle = fg; ctx.fillRect(view.x - 2, FLOOR + 24, view.w + 4, MH - FLOOR);
    for (const r of P.fgRocks) put(ctx, dark(r.kind, i, 0.66, r.flip), r.x, FLOOR + 46 + r.dy);
    // the cart's load as a little sign over it
    const c = this._cart;
    if (c && c.alpha > 0.5 && !c.moving) text(ctx, `${Math.min(c.total, c.size)}/${c.size}`, Math.round(c.x), RAIL - 46, c.total >= c.size ? '#9ee08e' : '#e3c06e', 'center');
    if (f.storageFull && c && c.total >= c.size) text(ctx, 'WAREHOUSE FULL', Math.round(c.x), RAIL - 54, '#d9704a', 'center');
  },
};

function drawLocked(ctx, t, i) {
  // a short blocked passage: the tunnel mouth, rubble, a lock
  const R = { rockd: rd(i) };
  ctx.fillStyle = 'rgba(8,5,12,0.55)'; ctx.fillRect(30, FLOOR - 150, 260, 151);
  Art.draw(ctx, 'mine_hole', 0, HOLE, FLOOR + 1, { recolour: R });
  Art.draw(ctx, 'boulder', 0, HOLE + 70, FLOOR + 2, { recolour: R });
  Art.draw(ctx, 'boulder', 0, HOLE + 120, FLOOR + 3, { recolour: R, flip: true });
  Art.draw(ctx, 'stalagmites', 0, HOLE + 180, FLOOR + 2, { recolour: R });
  torches.push({ x: HOLE + 56, y: FLOOR - 70 });
  Art.draw(ctx, 'torch', Math.floor(t * 8) % 4, HOLE + 56, FLOOR - 70);
}
function lockedSign(ctx, i) {
  const known = D().layers[i].discovered, name = G.data.layers[i].name;
  sign(ctx, known ? name : '? ? ?', HOLE + 110, FLOOR - 140, '#fbf4e6');
  text(ctx, known ? 'LOCKED - OPEN IT IN THE MINES TAB' : 'UNEXPLORED - SEND AN EXPEDITION', HOLE + 110, FLOOR - 126, '#a6abbe', 'center');
}
