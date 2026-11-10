// Room interiors drawn as real workshops: walls, floors, furnaces, anvils, barrels, beds...
// hall(type, w, h) returns a static picture; anchors(type, w, h) says where the scene adds
// animated things on top (fire glow, steam, the worker, sparks). Both use the same layout,
// so the picture and the animation always line up. A PNG "hall/<type>" replaces the picture.
import { mk, shade, rand, hasOverride, overrideImage } from './sprites.js';

const cache = new Map();
const WOOD = '#7a4a2a', WOOD_D = '#4a2c16', IRON = '#5a5862', IRON_L = '#8a8892', LINE = '#0c090e';

function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function P(c, x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); }

// ------------------------------------------------------------------ surfaces

function bricks(c, x, y, w, h, base, seed) {
  const r = rand(seed);
  R(c, x, y, w, h, shade(base, -0.28));
  for (let row = 0; row * 4 < h; row++) {
    const off = row % 2 ? 4 : 0;
    for (let bx = -off; bx < w; bx += 8) {
      const t = shade(base, (r() - 0.5) * 0.14);
      const x0 = Math.max(x, x + bx), x1 = Math.min(x + w, x + bx + 7);
      if (x1 <= x0) continue;
      R(c, x0, y + row * 4, x1 - x0, 3, t);
      R(c, x0, y + row * 4, x1 - x0, 1, shade(t, 0.1));
    }
  }
}

function planks(c, x, y, w, h, base, seed) {
  const r = rand(seed);
  for (let px = 0; px < w; px += 5) {
    const t = shade(base, (r() - 0.5) * 0.12);
    R(c, x + px, y, Math.min(4, w - px), h, t);
    R(c, x + px + 4, y, 1, h, shade(base, -0.35));
    if (r() < 0.6) { P(c, x + px + 1, y + 2, shade(base, -0.4)); P(c, x + px + 1, y + h - 3, shade(base, -0.4)); }
  }
}

function earth(c, x, y, w, h, base, seed) {
  const r = rand(seed);
  R(c, x, y, w, h, base);
  for (let i = 0; i < (w * h) / 6; i++) P(c, x + r() * w, y + r() * h, r() < 0.5 ? shade(base, -0.18) : shade(base, 0.1));
  for (let i = 0; i < w / 6; i++) {
    const mx = x + r() * w, my = y + r() * (h * 0.6);
    for (let k = 0; k < 4; k++) P(c, mx + k - 1, my + (k % 2), k % 2 ? '#4a7a3a' : '#5e9a48');
  }
}

function floorBoards(c, x, y, w) {
  R(c, x, y, w, 3, '#5a3a20');
  R(c, x, y, w, 1, '#8a6038');
  for (let px = 3; px < w; px += 9) P(c, x + px, y + 1, '#3a2412');
}

function floorStone(c, x, y, w) {
  R(c, x, y, w, 3, '#55504c');
  R(c, x, y, w, 1, '#7a746e');
  for (let px = 0; px < w; px += 6) P(c, x + px, y + 1, '#3a3632');
}

// ------------------------------------------------------------------ props (x = left, b = bottom row)

function barrel(c, x, b, h = 10, top = null) {
  const w = 8;
  R(c, x + 1, b - h + 1, w - 2, h, WOOD);
  R(c, x, b - h + 3, w, h - 4, WOOD);
  R(c, x + 2, b - h + 1, 1, h, shade(WOOD, 0.2));
  R(c, x + 5, b - h + 1, 1, h, shade(WOOD, -0.25));
  R(c, x, b - h + 3, w, 1, IRON); R(c, x, b - 3, w, 1, IRON);
  if (top) { R(c, x + 1, b - h + 1, w - 2, 1, top); }
}

function barrelSide(c, x, b) { // lying barrel, round face to the viewer
  R(c, x + 1, b - 7, 6, 8, WOOD); R(c, x, b - 6, 8, 6, WOOD);
  R(c, x + 2, b - 5, 4, 4, shade(WOOD, -0.2)); P(c, x + 3, b - 3, WOOD_D);
  R(c, x + 1, b - 7, 6, 1, shade(WOOD, 0.25));
}

function crate(c, x, b, s = 7, col = '#8a6038') {
  R(c, x, b - s + 1, s, s, col);
  R(c, x, b - s + 1, s, 1, shade(col, 0.25));
  R(c, x, b, s, 1, shade(col, -0.35));
  for (let i = 1; i < s - 1; i++) P(c, x + i, b - s + 1 + i, shade(col, -0.3));
}

function sack(c, x, b, col = '#c8b088') {
  R(c, x + 1, b - 6, 5, 7, col); R(c, x, b - 4, 7, 5, col);
  R(c, x + 2, b - 7, 3, 1, shade(col, -0.3)); R(c, x + 1, b - 6, 1, 4, shade(col, 0.2));
}

function table(c, x, b, w) {
  R(c, x, b - 6, w, 2, WOOD); R(c, x, b - 6, w, 1, shade(WOOD, 0.25));
  R(c, x + 1, b - 4, 1, 5, WOOD_D); R(c, x + w - 2, b - 4, 1, 5, WOOD_D);
}

function stool(c, x, b) { R(c, x, b - 3, 4, 1, WOOD); P(c, x, b - 2, WOOD_D); P(c, x + 3, b - 2, WOOD_D); P(c, x, b - 1, WOOD_D); P(c, x + 3, b - 1, WOOD_D); }

function mug(c, x, b) { R(c, x, b - 2, 2, 3, '#c8a060'); P(c, x, b - 3, '#fff4dc'); P(c, x + 2, b - 1, '#a07838'); }

function shelf(c, x, y, w) { R(c, x, y, w, 1, WOOD); R(c, x, y + 1, w, 1, WOOD_D); P(c, x + 1, y + 2, WOOD_D); P(c, x + w - 2, y + 2, WOOD_D); }

function lantern(c, x, y) {
  R(c, x + 1, 0, 1, y, IRON);
  R(c, x, y, 3, 1, IRON); R(c, x, y + 1, 3, 3, '#ffd36b'); P(c, x + 1, y + 2, '#fff6c0'); R(c, x, y + 4, 3, 1, IRON);
}

function sconce(c, x, y) { R(c, x, y + 3, 3, 1, IRON); R(c, x + 1, y + 2, 1, 1, IRON); }

function axeOnRack(c, x, y, col = '#9a9aa4') {
  R(c, x + 1, y, 1, 9, WOOD);
  R(c, x - 1, y, 2, 3, col); R(c, x + 2, y, 2, 3, col); P(c, x - 1, y, shade(col, 0.4));
}

function shield(c, x, y, col) {
  R(c, x + 1, y, 5, 7, col); R(c, x, y + 1, 7, 5, col);
  R(c, x + 3, y, 1, 7, shade(col, 0.35)); R(c, x, y + 3, 7, 1, shade(col, 0.35));
  P(c, x + 3, y + 3, '#c8c0a0');
}

function chimney(c, x, top, bottom, w = 6) {
  R(c, x, top, w, bottom - top, '#5a4038');
  for (let y = top; y < bottom; y += 3) R(c, x, y, w, 1, shade('#5a4038', -0.25));
  R(c, x, top, 1, bottom - top, shade('#5a4038', 0.15));
}

function oreHeap(c, x, b, w, colors, seed) {
  const r = rand(seed);
  for (let i = 0; i < w; i++) {
    const hgt = Math.round(Math.sin((i / w) * Math.PI) * (w / 3.2)) + 1;
    for (let k = 0; k < hgt; k++) P(c, x + i, b - k, shade('#6e6672', (r() - 0.5) * 0.25 - k * 0.02));
  }
  for (let i = 0; i < w; i++) if (r() < 0.45) {
    const hgt = Math.round(Math.sin((i / w) * Math.PI) * (w / 3.2));
    P(c, x + i, b - Math.floor(r() * hgt), colors[Math.floor(r() * colors.length)]);
  }
}

function barStack(c, x, b, n, col) {
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3), k = i % 3;
    const bx = x + k * 5 + (row % 2) * 2, by = b - row * 3;
    R(c, bx, by - 2, 5, 3, col); R(c, bx + 1, by - 2, 3, 1, shade(col, 0.35)); R(c, bx, by, 5, 1, shade(col, -0.35));
  }
}

function mushroom(c, x, b, s, cap) {
  R(c, x + Math.floor(s / 2), b - s + 1, 1, s, '#e8dcc0');
  R(c, x, b - s - 1, s + 1, 2, cap);
  R(c, x + 1, b - s - 2, s - 1, 1, cap);
  P(c, x + 1, b - s - 1, shade(cap, 0.5));
}

function bed(c, x, b, blanket) {
  R(c, x, b - 5, 13, 1, WOOD); R(c, x, b - 4, 1, 5, WOOD_D); R(c, x + 12, b - 4, 1, 5, WOOD_D);
  R(c, x + 1, b - 4, 11, 2, blanket); R(c, x + 1, b - 4, 3, 2, '#e8dcc0');
}

function bunk(c, x, b, a, z) {
  bed(c, x, b, a);
  R(c, x, b - 14, 1, 10, WOOD_D); R(c, x + 12, b - 14, 1, 10, WOOD_D);
  R(c, x, b - 11, 13, 1, WOOD); R(c, x + 1, b - 10, 11, 2, z); R(c, x + 1, b - 10, 3, 2, '#e8dcc0');
}

function chest(c, x, b) {
  R(c, x, b - 5, 9, 6, '#6a3a1a'); R(c, x, b - 5, 9, 2, '#8a5028'); R(c, x, b - 3, 9, 1, IRON); P(c, x + 4, b - 2, '#f2b33d');
}

// ------------------------------------------------------------------ layouts

/** Where things are in a room. Each entry: kind + coordinates. Shared by picture and animation. */
export function anchors(type, w, h) {
  const fy = h - 3;          // floor surface row
  const b = fy - 1;          // bottom row for props
  const big = w >= 90;
  const a = { fy, b, torches: [], worker: null, fire: null, chimney: null, steam: null, sparks: null, idle: [], extra: {} };
  a.torches.push([2, Math.max(4, fy - 20)]);
  if (w > 60) a.torches.push([w - 6, Math.max(4, fy - 20)]);
  switch (type) {
    case 'smelter': {
      const fx = big ? 10 : 3, fw = 18, fh = Math.min(h - 6, 26);
      a.extra.furnace = { x: fx, y: b - fh + 1, w: fw, h: fh };
      a.fire = { x: fx + 5, y: b - 9, w: 8, h: 6 };
      a.chimney = { x: fx + 6, top: 0, bottom: b - fh + 1 };
      a.extra.bellows = { x: fx + fw, y: b - 9 };
      a.worker = [fx + fw + 9, b];
      a.extra.heap = { x: Math.min(w - 26, fx + fw + 22), w: big ? 22 : 14 };
      a.extra.bars = { x: w - (big ? 22 : 14), y: b };
      break;
    }
    case 'forge': {
      const hx = big ? 8 : 3;
      a.extra.hearth = { x: hx, y: b - 7 };
      a.fire = { x: hx + 2, y: b - 9, w: 12, h: 3 };
      a.chimney = { x: hx + 5, top: 0, bottom: b - 18 };
      a.extra.anvil = { x: hx + 24, y: b };
      a.extra.quench = { x: Math.min(w - 12, hx + 36), y: b };
      a.steam = { x: Math.min(w - 12, hx + 36) + 3, y: b - 10 };
      a.sparks = { x: hx + 28, y: b - 6 };
      a.worker = [hx + 17, b];
      break;
    }
    case 'grindstone':
      a.extra.wheel = { x: Math.floor(w / 2) - 4, y: b - 9 };
      a.sparks = { x: Math.floor(w / 2) - 4 + 9, y: b - 9 };
      a.worker = [Math.floor(w / 2) + 6, b];
      break;
    case 'engraver':
    case 'jeweler':
      a.extra.bench = { x: 4, w: Math.min(26, w - 16) };
      a.sparks = type === 'jeweler' ? { x: 12, y: b - 8 } : { x: 14, y: b - 7 };
      a.worker = [Math.min(w - 14, 4 + Math.min(26, w - 16) - 2), b];
      break;
    case 'farm':
      a.worker = [w - 15, b];
      break;
    case 'brewery':
      a.extra.kettle = { x: big ? 10 : 3, y: b };
      a.steam = { x: (big ? 10 : 3) + 7, y: b - 18 };
      a.worker = [(big ? 10 : 3) + 19, b];
      break;
    case 'tavern':
      a.fire = { x: w - 15, y: b - 7, w: 8, h: 5 };
      for (let x = 22; x < w - 20 && a.idle.length < 6; x += 11) a.idle.push([x, b]);
      a.worker = [6, b];
      break;
    case 'barracks':
      for (let x = Math.floor(w / 2); x < w - 10 && a.idle.length < 3; x += 10) a.idle.push([x, b]);
      break;
    default:
      break;
  }
  return a;
}

const WALLS = {
  smelter: ['bricks', '#4a3532'], forge: ['bricks', '#4f4038'], grindstone: ['bricks', '#4e4844'],
  engraver: ['planks', '#5a4430'], jeweler: ['bricks', '#3f3a4a'], farm: ['earth', '#4a3a2a'],
  brewery: ['planks', '#5a4026'], tavern: ['planks', '#6a4628'], quarters: ['planks', '#584838'],
  warehouse: ['planks', '#54442e'], vault: ['bricks', '#3a3a44'], barracks: ['bricks', '#4a4848'],
};

export function hall(type, w, h) {
  const oid = 'hall/' + type;
  if (hasOverride(oid)) return overrideImage(oid);
  const key = `${oid}/${w}x${h}`;
  if (cache.has(key)) return cache.get(key);
  const cv = mk(w, h);
  const c = cv.getContext('2d');
  const seed = type.length * 97 + w;
  const [kind, col] = WALLS[type] || ['bricks', '#4a3f3b'];
  if (kind === 'bricks') bricks(c, 0, 0, w, h, col, seed);
  else if (kind === 'planks') planks(c, 0, 0, w, h, col, seed);
  else earth(c, 0, 0, w, h, col, seed);
  // ceiling beam and shadow along the top
  R(c, 0, 0, w, 2, shade(col, -0.45));
  const a = anchors(type, w, h);
  const { b, fy } = a;
  const big = w >= 90;
  (['tavern', 'quarters', 'brewery', 'engraver', 'warehouse', 'farm'].includes(type) ? floorBoards : floorStone)(c, 0, fy, w);
  for (const [tx, ty] of a.torches) sconce(c, tx, ty);
  const r = rand(seed + 1);

  switch (type) {
    case 'smelter': {
      const f = a.extra.furnace;
      chimney(c, a.chimney.x, 0, f.y + 2);
      // stepped brick furnace
      R(c, f.x, f.y + 4, f.w, f.h - 4, '#7a4a3a');
      R(c, f.x + 2, f.y + 1, f.w - 4, 4, '#7a4a3a');
      for (let y = f.y + 2; y < f.y + f.h; y += 3) for (let x = f.x + ((y / 3) % 2 ? 0 : 2); x < f.x + f.w; x += 4) R(c, x, y, 3, 2, shade('#7a4a3a', (r() - 0.5) * 0.2));
      R(c, f.x, f.y + 4, 1, f.h - 4, shade('#7a4a3a', 0.25));
      R(c, f.x + f.w - 1, f.y + 4, 1, f.h - 4, shade('#7a4a3a', -0.35));
      // arched mouth (dark - the glow is animated)
      R(c, a.fire.x, a.fire.y + 1, a.fire.w, a.fire.h - 1, '#2a120a'); R(c, a.fire.x + 1, a.fire.y, a.fire.w - 2, 1, '#2a120a');
      R(c, a.fire.x - 1, a.fire.y + a.fire.h, a.fire.w + 2, 1, '#3a2a22');
      // crucible on a stand
      R(c, f.x + f.w + 2, b - 3, 5, 4, '#3a3036'); R(c, f.x + f.w + 2, b - 3, 5, 1, '#d06a2a');
      // bellows
      const bl = a.extra.bellows;
      R(c, bl.x + 1, bl.y - 1, 1, 6, WOOD_D);
      R(c, bl.x + 2, bl.y, 6, 4, '#7a5030'); R(c, bl.x + 2, bl.y + 1, 6, 1, '#9a6a40'); R(c, bl.x + 8, bl.y - 2, 1, 3, WOOD);
      oreHeap(c, a.extra.heap.x, b, a.extra.heap.w, ['#c4703f', '#9fb7b3', '#8b3a32', '#2b2b2e'], seed);
      barStack(c, a.extra.bars.x, b, big ? 8 : 5, '#b5653b');
      if (big) {
        shelf(c, 34, 8, 18); barStack(c, 35, 7, 3, '#9fb7b3');
        crate(c, a.extra.heap.x - 9, b, 7, '#3a3036'); R(c, a.extra.heap.x - 8, b - 7, 5, 2, '#2b2b2e');
        R(c, w - 30, 10, 2, 12, IRON); R(c, w - 31, 10, 4, 1, IRON); R(c, w - 26, 10, 1, 9, IRON); R(c, w - 27, 18, 3, 2, IRON);
      }
      break;
    }
    case 'forge': {
      const hx = a.extra.hearth.x;
      chimney(c, a.chimney.x, 0, a.chimney.bottom, 6);
      // hood
      for (let i = 0; i < 6; i++) R(c, hx + 3 - i, a.chimney.bottom + i, 12 + i * 2, 1, shade('#5a4038', -i * 0.03));
      // stone hearth
      R(c, hx, b - 6, 18, 7, '#6a625e'); R(c, hx, b - 6, 18, 1, '#8a827e');
      for (let x = hx + 2; x < hx + 18; x += 5) R(c, x, b - 4, 1, 4, '#4a4440');
      R(c, a.fire.x, a.fire.y, a.fire.w, a.fire.h, '#3a1a10');
      // anvil on a stump
      const an = a.extra.anvil;
      R(c, an.x + 1, an.y - 3, 6, 4, WOOD); R(c, an.x + 1, an.y - 3, 6, 1, shade(WOOD, 0.3));
      R(c, an.x + 2, an.y - 5, 4, 2, '#2e2c32');
      R(c, an.x - 1, an.y - 7, 10, 2, '#3e3c44'); R(c, an.x - 2, an.y - 7, 3, 1, '#3e3c44'); R(c, an.x, an.y - 7, 8, 1, '#6a6872');
      // quench barrel with water
      barrel(c, a.extra.quench.x, b, 9, '#3a7ab8');
      // tool rack: hammers and tongs
      const tx = big ? 60 : Math.min(w - 10, hx + 22);
      if (w > 46) {
        R(c, tx, 6, 14, 1, WOOD);
        R(c, tx + 2, 7, 1, 7, WOOD); R(c, tx + 1, 7, 3, 2, IRON);
        R(c, tx + 7, 7, 1, 8, IRON); R(c, tx + 9, 7, 1, 8, IRON); P(c, tx + 8, 14, IRON);
        R(c, tx + 12, 7, 1, 6, WOOD); R(c, tx + 11, 7, 3, 2, IRON_L);
      }
      if (big) { crate(c, w - 24, b, 8); R(c, w - 23, b - 9, 6, 2, '#2b2b2e'); barStack(c, w - 40, b, 6, '#8c8c8c'); }
      break;
    }
    case 'grindstone': {
      const wh = a.extra.wheel;
      R(c, wh.x - 4, b - 1, 26, 2, WOOD_D);
      R(c, wh.x - 2, wh.y - 2, 2, 12, WOOD); R(c, wh.x + 16, wh.y - 2, 2, 12, WOOD);
      for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) {
        const d = Math.sqrt(xx * xx + yy * yy);
        if (d <= 8) P(c, wh.x + 8 + xx, wh.y + yy, d > 7 ? '#5a545a' : d < 2 ? WOOD_D : shade('#8a8288', (xx + yy) * -0.012));
      }
      R(c, wh.x - 2, wh.y, 20, 1, WOOD);
      barrel(c, wh.x - 14, b, 7, '#3a7ab8');
      if (w > 50) { R(c, w - 14, 8, 10, 1, WOOD); axeOnRack(c, w - 12, 9); axeOnRack(c, w - 7, 9, '#b5653b'); }
      break;
    }
    case 'engraver':
    case 'jeweler': {
      const bn = a.extra.bench;
      const top = type === 'jeweler' ? '#5a2a3a' : WOOD;
      R(c, bn.x, b - 7, bn.w, 2, top); R(c, bn.x, b - 7, bn.w, 1, shade(top, 0.3));
      R(c, bn.x + 1, b - 5, 2, 6, WOOD_D); R(c, bn.x + bn.w - 3, b - 5, 2, 6, WOOD_D);
      if (type === 'engraver') {
        R(c, bn.x + 3, b - 10, 4, 3, IRON); R(c, bn.x + 4, b - 11, 2, 1, IRON_L);  // vise
        R(c, bn.x + 10, b - 9, 3, 2, '#c9cbd0');                                    // plate being engraved
        R(c, 4, 6, Math.min(22, w - 10), 8, '#6a5040');                               // pegboard
        for (let i = 0; i < 5; i++) R(c, 6 + i * 4, 7, 1, 5, i % 2 ? IRON_L : WOOD);
      } else {
        R(c, bn.x + 6, b - 13, 1, 6, IRON); R(c, bn.x + 5, b - 14, 4, 2, IRON); R(c, bn.x + 6, b - 12, 3, 1, '#ffd36b');  // lamp
        R(c, bn.x + 12, b - 9, 4, 2, '#d6a43a'); P(c, bn.x + 13, b - 10, '#6fe0c8');
        // display cabinet
        const cx = Math.max(bn.x + bn.w + 2, w - 18);
        if (cx + 14 <= w) {
          R(c, cx, b - 16, 14, 17, WOOD_D); R(c, cx + 1, b - 15, 12, 6, '#2a2236'); R(c, cx + 1, b - 7, 12, 6, '#2a2236');
          const gems = ['#6fe0c8', '#e05a8a', '#f2b33d', '#6aa6d8', '#c97473'];
          for (let i = 0; i < 6; i++) P(c, cx + 2 + i * 2, b - 12 + (i % 2), gems[i % gems.length]);
          for (let i = 0; i < 5; i++) P(c, cx + 3 + i * 2, b - 4, gems[(i + 2) % gems.length]);
        }
      }
      lantern(c, Math.floor(w / 2), 4);
      break;
    }
    case 'farm': {
      const caps = ['#b48a5a', '#c86a4a', '#8a5a32', '#6ad0d8'];
      for (let x = 3; x < w - 12; x += 13) {
        R(c, x, b - 2, 11, 3, '#2a2018'); R(c, x, b - 3, 11, 1, '#3e2e20');
        for (let k = 0; k < 3; k++) mushroom(c, x + 1 + k * 3 + Math.floor(r() * 2), b - 3, 2 + Math.floor(r() * 3), caps[Math.floor(r() * caps.length)]);
      }
      R(c, w - 9, b - 4, 5, 5, IRON); R(c, w - 4, b - 4, 2, 1, IRON); R(c, w - 9, b - 5, 2, 1, IRON);
      break;
    }
    case 'brewery': {
      const k = a.extra.kettle;
      R(c, k.x + 1, b - 14, 14, 14, '#b5653b'); R(c, k.x, b - 12, 16, 10, '#b5653b');
      R(c, k.x + 3, b - 13, 2, 10, '#e09060'); R(c, k.x + 12, b - 13, 2, 12, '#8a4a28');
      R(c, k.x + 4, b - 16, 8, 2, '#8a4a28'); R(c, k.x + 7, b - 22, 2, 6, '#8a4a28'); R(c, k.x + 7, b - 22, 12, 2, '#8a4a28');
      R(c, k.x + 2, b + 1 - 1, 12, 1, '#2a1a12');
      const bx = k.x + 26;
      for (let i = 0; bx + i * 9 + 8 < w - 2 && i < (big ? 6 : 2); i++) barrelSide(c, bx + i * 9, b);
      for (let i = 0; bx + i * 9 + 8 < w - 2 && i < (big ? 5 : 1); i++) barrelSide(c, bx + 4 + i * 9, b - 8);
      break;
    }
    case 'tavern': {
      // bar counter with taps and a shelf of mugs behind it
      R(c, 2, b - 7, 16, 8, '#5a3a1a'); R(c, 2, b - 8, 17, 2, '#8a5a2a'); R(c, 2, b - 8, 17, 1, '#a87038');
      R(c, 6, b - 11, 1, 3, IRON_L); R(c, 11, b - 11, 1, 3, IRON_L);
      shelf(c, 2, b - 17, 16); for (let i = 0; i < 4; i++) mug(c, 4 + i * 4, b - 18);
      barrelSide(c, 4, b - 19 - 0);
      // tables
      for (const [ix] of a.idle.filter((_, i) => i % 2 === 0)) { table(c, ix - 1, b, 11); mug(c, ix + 2, b - 7); stool(c, ix - 4, b); stool(c, ix + 9, b); }
      // fireplace
      const fp = a.fire;
      R(c, fp.x - 3, b - 11, fp.w + 6, 12, '#6a625e'); R(c, fp.x - 4, b - 12, fp.w + 8, 2, '#7a726e');
      R(c, fp.x, fp.y, fp.w, fp.h + 1, '#1a0e0a');
      chimney(c, fp.x + 1, 0, b - 12, 6);
      lantern(c, Math.floor(w / 2), 5);
      if (w > 80) lantern(c, Math.floor(w / 4), 4);
      break;
    }
    case 'quarters': {
      const cols = [['#c84a4a', '#4a6ac8'], ['#4a8a4a', '#c8a84a'], ['#8a4ac8', '#c86a4a']];
      let i = 0;
      for (let x = 3; x + 13 < w - 10; x += 16) { const [p, q] = cols[i++ % 3]; bunk(c, x, b, p, q); }
      chest(c, w - 11, b);
      lantern(c, Math.floor(w / 2), 3);
      break;
    }
    case 'warehouse': {
      for (let y = 8; y < b - 8; y += 10) shelf(c, 3, y, w - 6);
      for (let x = 4; x < w - 8; x += 9) { if (r() < 0.6) crate(c, x, 7, 6); else sack(c, x, 7); }
      for (let x = 5; x < w - 8; x += 8) { if (r() < 0.5) crate(c, x, 17, 6, '#6a4a2a'); else sack(c, x, 17, '#a89070'); }
      for (let x = 3; x < w - 9; x += 9) (r() < 0.5 ? crate(c, x, b, 8) : sack(c, x, b));
      break;
    }
    case 'vault': {
      const cx = Math.floor(w / 2) - 8;
      for (let yy = -9; yy <= 9; yy++) for (let xx = -9; xx <= 9; xx++) {
        const d = Math.sqrt(xx * xx + yy * yy);
        if (d <= 9) P(c, cx + 8 + xx, b - 10 + yy, d > 8 ? '#2a2a30' : d > 6 ? '#8a8a98' : shade('#6a6a78', (xx + yy) * -0.015));
      }
      R(c, cx + 5, b - 11, 7, 1, '#f2b33d'); R(c, cx + 8, b - 14, 1, 7, '#f2b33d');
      for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; P(c, cx + 8 + Math.round(Math.cos(an) * 7), b - 10 + Math.round(Math.sin(an) * 7), '#c8c8d0'); }
      for (let i = 0; i < 9; i++) P(c, w - 12 + (i % 5), b - Math.floor(i / 5), i % 2 ? '#f2b33d' : '#c98a1c');
      break;
    }
    case 'barracks': {
      R(c, 3, 6, 20, 1, WOOD);
      for (let i = 0; i < 4; i++) axeOnRack(c, 5 + i * 5, 7, i % 2 ? '#9a9aa4' : '#8f5a3f');
      shield(c, 26, 6, '#8a2a2a'); shield(c, 35, 6, '#2a4a8a');
      // training dummy
      const dx = w - 12;
      R(c, dx + 3, b - 14, 1, 15, WOOD); R(c, dx, b - 11, 7, 1, WOOD);
      R(c, dx + 1, b - 13, 5, 7, '#c8a868'); R(c, dx + 2, b - 16, 3, 3, '#c8a868'); P(c, dx + 3, b - 10, '#8a2a2a');
      // banner
      R(c, w - 22, 3, 6, 12, '#8a2a2a'); R(c, w - 22, 14, 3, 2, '#8a2a2a'); R(c, w - 22, 3, 6, 1, WOOD); P(c, w - 20, 7, '#f2b33d'); P(c, w - 19, 8, '#f2b33d');
      break;
    }
    default:
      break;
  }
  cache.set(key, cv);
  return cv;
}

export { LINE };
