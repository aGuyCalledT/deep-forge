// The delve: one level of the mine as a grid of 48-px tiles, made from a seed (the same seed gives the same level).
// Like a classic cave roguelike it is 4 x 4 rooms of 10 x 8 tiles; a path of open rooms leads from the entrance in
// the top row to the exit in the bottom row (left, right or a hole down). Rooms off the path are caves, one may be a
// shop. On the last level of a layer the exit is closed by the layer wall, and a lift goes back up to the hold.
//   const L = makeLevel({seed, layer, depth, data})   L.tiles, L.at(x, y), L.set(x, y, t), L.ore, L.spawns ...

import { chestLoot } from './loot.js';

export const T = 48, RW = 10, RH = 8, ROOMS_X = 4, ROOMS_Y = 4;
export const W = ROOMS_X * RW + 2, H = ROOMS_Y * RH + 2;          // plus a frame of bedrock
export const AIR = 0, ROCK = 1, BEDROCK = 2, ORE = 3, WALL = 4, LADDER = 5, SPIKES = 6, TRAP = 7;
export const SOLID = new Set([ROCK, BEDROCK, ORE, WALL, TRAP]);

/** A small fast random number generator: the level only depends on the seed. */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (n) => Math.floor(r() * n);
  r.pick = (a) => a[Math.floor(r() * a.length)];
  return r;
}

/**
 * opts: {seed, layer, depth (0-3 inside the layer), last (the layer's last level), deepest (no layer below),
 *        shop (force a shop), data: {weights, noOre, orePerLevel, monsters}}
 */
export function makeLevel(opts) {
  const r = rng(opts.seed);
  const tiles = new Uint8Array(W * H).fill(ROCK);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? BEDROCK : tiles[y * W + x]);
  const set = (x, y, t) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) tiles[y * W + x] = t; };
  for (let x = 0; x < W; x++) { tiles[x] = BEDROCK; tiles[(H - 1) * W + x] = BEDROCK; }
  for (let y = 0; y < H; y++) { tiles[y * W] = BEDROCK; tiles[y * W + W - 1] = BEDROCK; }

  // ---------------------------------------------------------------- the path from the top row to the bottom row
  const room = [];
  for (let ry = 0; ry < ROOMS_Y; ry++) { room.push([]); for (let rx = 0; rx < ROOMS_X; rx++) room[ry].push({ path: false, L: false, R: false, U: false, D: false }); }
  let rx = r.int(ROOMS_X), ry = 0, dir = r() < 0.5 ? -1 : 1;
  const start = { rx, ry };
  room[ry][rx].path = true;
  let exit = null;
  for (let guard = 0; guard < 64 && !exit; guard++) {
    const down = r() < 0.28;
    const nx = rx + dir;
    if (!down && nx >= 0 && nx < ROOMS_X && !room[ry][nx].path) {
      room[ry][rx][dir < 0 ? 'L' : 'R'] = true;
      room[ry][nx][dir < 0 ? 'R' : 'L'] = true;
      rx = nx;
      room[ry][rx].path = true;
      continue;
    }
    if (ry === ROOMS_Y - 1) {
      if (nx >= 0 && nx < ROOMS_X && !room[ry][nx].path && r() < 0.5) continue;
      exit = { rx, ry };
      break;
    }
    room[ry][rx].D = true;
    ry++;
    room[ry][rx].U = true;
    room[ry][rx].path = true;
    dir = r() < 0.5 ? -1 : 1;
  }
  if (!exit) exit = { rx, ry };

  // side rooms: open towards a neighbour now and then, one of them may become the shop
  let shop = null;
  const wantShop = opts.shop || r() < 0.4;
  const sides = [];
  for (let y = 0; y < ROOMS_Y; y++) for (let x = 0; x < ROOMS_X; x++) if (!room[y][x].path) sides.push({ x, y });
  if (wantShop) {
    const cand = sides.filter(({ x, y }) => [x - 1, x + 1].some((n) => n >= 0 && n < ROOMS_X && room[y][n].path) && !(x === exit.rx && y === exit.ry));
    if (cand.length) {
      const c = r.pick(cand);
      const toLeft = c.x > 0 && room[c.y][c.x - 1].path && (c.x + 1 >= ROOMS_X || !room[c.y][c.x + 1].path || r() < 0.5);
      shop = { rx: c.x, ry: c.y, door: toLeft ? -1 : 1 };
      room[c.y][c.x].shop = true;
      room[c.y][c.x][toLeft ? 'L' : 'R'] = true;
      room[c.y][c.x + (toLeft ? -1 : 1)][toLeft ? 'R' : 'L'] = true;
    }
  }
  for (const { x, y } of sides) {
    const q = room[y][x];
    if (q.shop) continue;
    if (x > 0 && r() < 0.45 && !room[y][x - 1].shop) { q.L = true; room[y][x - 1].R = true; }
    if (x < ROOMS_X - 1 && r() < 0.45 && !room[y][x + 1].shop) { q.R = true; room[y][x + 1].L = true; }
  }

  // ---------------------------------------------------------------- carve each room
  const ox = (rx) => 1 + rx * RW, oy = (ry) => 1 + ry * RH;
  const ledges = [];                 // {x0, x1, y}: floating rock shelves, for ladders and monsters
  for (let y = 0; y < ROOMS_Y; y++) for (let x = 0; x < ROOMS_X; x++) {
    const q = room[y][x], X = ox(x), Y = oy(y);
    if (q.shop) { carveShop(X, Y, shop.door); continue; }
    const cave = !q.path && r() < 0.5;
    for (let j = 1; j <= 6; j++) for (let i = 1; i <= 8; i++) {
      if (cave) {                    // a rounder cave: the corners stay rock
        const dx = (i - 4.5) / 4.2, dy = (j - 3.5) / 3.1;
        if (dx * dx + dy * dy > 1 + (r() - 0.5) * 0.4) continue;
      }
      set(X + i, Y + j, AIR);
    }
    if (q.L) for (let j = 4; j <= 6; j++) { set(X, Y + j, AIR); set(X + 1, Y + j, AIR); }
    if (q.R) for (let j = 4; j <= 6; j++) { set(X + 9, Y + j, AIR); set(X + 8, Y + j, AIR); }
    let holeU = null, holeD = null;
    if (q.U) { holeU = 2 + r.int(5); for (let i = holeU; i < holeU + 3; i++) set(X + i, Y, AIR); }
    if (q.D) {
      holeD = 1 + r.int(6);
      if (holeU != null) holeD = holeU <= 3 ? 5 + r.int(3) : 1 + r.int(2);       // away from the hole above
      for (let i = holeD; i < holeD + 3; i++) set(X + i, Y + 7, AIR);
    }
    // a shelf under the hole above breaks the fall from the room above
    if (holeU != null) {
      const x0 = Math.max(2, holeU - 1), x1 = Math.min(7, holeU + 3);
      for (let i = x0; i <= x1; i++) set(X + i, Y + 3, ROCK);
      ledges.push({ x0: X + x0, x1: X + x1, y: Y + 3 });
    }
    // one or two more shelves, never touching the walls (so nothing is sealed off)
    const n = 1 + r.int(2);
    for (let k = 0; k < n; k++) {
      const len = 2 + r.int(3), x0 = 2 + r.int(7 - len), yy = 3 + r.int(2);
      if (holeU != null && yy <= 4) continue;
      let ok = true;
      for (let i = x0 - 1; i <= x0 + len; i++) if (at(X + i, Y + yy - 1) !== AIR || at(X + i, Y + yy + 1) !== AIR) ok = false;
      if (!ok) continue;
      for (let i = x0; i < x0 + len; i++) set(X + i, Y + yy, ROCK);
      ledges.push({ x0: X + x0, x1: X + x0 + len - 1, y: Y + yy });
    }
    // steps on the floor, one block high
    const bumps = r.int(3);
    for (let k = 0; k < bumps; k++) {
      const i = 2 + r.int(6);
      if (holeD != null && i >= holeD - 1 && i <= holeD + 3) continue;
      if (at(X + i, Y + 7) === ROCK) set(X + i, Y + 6, ROCK);
    }
    q.holeU = holeU; q.holeD = holeD; q.cave = cave;
  }

  // ladders up to some shelves
  const ladders = [];
  for (const l of ledges) {
    if (r() > 0.45) continue;
    const side = r() < 0.5 ? l.x0 - 1 : l.x1 + 1;
    if (at(side, l.y) !== AIR) continue;
    let y = l.y - 1, ok = true;
    const col = [];
    for (; y < H - 1 && at(side, y) !== ROCK && at(side, y) !== BEDROCK; y++) { if (at(side, y) !== AIR) ok = false; col.push(y); }
    if (!ok || col.length < 3 || col.length > 8) continue;
    for (const yy of col) set(side, yy, LADDER);
    ladders.push({ x: side, y0: col[0], y1: col[col.length - 1] });
  }

  // ---------------------------------------------------------------- entrance and exit
  const floorIn = (rxx, ryy, avoid = []) => {
    const X = ox(rxx), Y = oy(ryy), out = [];
    for (let i = 1; i <= 8; i++) for (let j = 6; j >= 1; j--) {
      const x = X + i, y = Y + j;
      if (at(x, y) === AIR && at(x, y - 1) === AIR && SOLID.has(at(x, y + 1)) && at(x, y + 1) !== TRAP && !avoid.some((a) => Math.abs(a - x) < 3)) { out.push({ x, y }); break; }
    }
    return out;
  };
  const sp = floorIn(start.rx, start.ry);
  const entrance = sp.length ? r.pick(sp) : { x: ox(start.rx) + 4, y: oy(start.ry) + 6 };
  for (let j = 1; j <= 2; j++) set(entrance.x, entrance.y - j, AIR);
  // the first level of a run: the dwarf starts in a small cell of soft rock and digs out (learning the pick).
  // The side with open floor beyond gets the chalk marks.
  const soft = new Set();
  let intro = null;
  if (opts.intro) {
    const ex0 = entrance.x, ey0 = entrance.y;
    const open = (d) => at(ex0 + 2 * d, ey0) === AIR && SOLID.has(at(ex0 + 2 * d, ey0 + 1));
    const dir = open(1) ? 1 : open(-1) ? -1 : 1;
    for (const [dx, dy] of [[-1, 0], [1, 0], [-1, -1], [1, -1], [-1, -2], [0, -2], [1, -2]]) {
      const x = ex0 + dx, y = ey0 + dy;
      if (at(x, y) === BEDROCK) continue;
      set(x, y, ROCK); soft.add(y * W + x);
    }
    if (!SOLID.has(at(ex0 + dir, ey0 + 1))) set(ex0 + dir, ey0 + 1, ROCK);
    intro = { x: ex0, y: ey0, dir };
  }
  const room0 = room[exit.ry][exit.rx], X0 = ox(exit.rx), Y0 = oy(exit.ry);
  // the exit room gets a flat floor on its bottom row so exit, wall and lift have room
  for (let i = 1; i <= 8; i++) { set(X0 + i, Y0 + 6, AIR); set(X0 + i, Y0 + 5, AIR); if (at(X0 + i, Y0 + 7) === AIR) set(X0 + i, Y0 + 7, ROCK); }
  for (let i = 1; i <= 8; i++) set(X0 + i, Y0 + 7, ROCK);
  const ex = { x: X0 + (exit.rx < ROOMS_X / 2 ? 6 : 3), y: Y0 + 6 };
  const out = { exit: ex, lift: null, wall: null };
  if (opts.last) {
    out.lift = { x: ex.x + (ex.x - X0 > 4 ? -3 : 3), y: ex.y };
    if (!opts.deepest) {
      out.wall = { x: ex.x, y0: ex.y - 1, y1: ex.y };
      set(ex.x, ex.y, WALL); set(ex.x, ex.y - 1, WALL);
    } else out.exit = null;
  }

  // ---------------------------------------------------------------- traps, ore, monsters, lights
  const busy = new Set();
  const key = (x, y) => y * W + x;
  const near = (x, y, p, d) => p && Math.abs(p.x - x) <= d && Math.abs(p.y - y) <= d;
  const blocked = (x, y) => near(x, y, entrance, 3) || near(x, y, ex, 2) || near(x, y, out.lift, 2) || (shop && x >= ox(shop.rx) && x < ox(shop.rx) + RW && y >= oy(shop.ry) && y < oy(shop.ry) + RH);
  const floors = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++)
    if (at(x, y) === AIR && at(x, y + 1) === ROCK && !blocked(x, y)) floors.push({ x, y });
  // spikes
  const nSpikes = 2 + opts.layer + r.int(3);
  for (let k = 0; k < nSpikes && floors.length; k++) {
    const f = r.pick(floors);
    if (busy.has(key(f.x, f.y)) || at(f.x, f.y - 1) !== AIR) continue;
    set(f.x, f.y, SPIKES); busy.add(key(f.x, f.y));
  }
  // arrow traps: a rock face in a wall, looking along a corridor
  const traps = [];
  const nTraps = 1 + Math.min(3, opts.layer + r.int(2));
  for (let k = 0, guard = 0; k < nTraps && guard < 200; guard++) {
    const x = 1 + r.int(W - 2), y = 1 + r.int(H - 2);
    if (at(x, y) !== ROCK || blocked(x, y)) continue;
    const dir = at(x + 1, y) === AIR && at(x + 2, y) === AIR && at(x + 3, y) === AIR ? 1 : at(x - 1, y) === AIR && at(x - 2, y) === AIR && at(x - 3, y) === AIR ? -1 : 0;
    if (!dir || !SOLID.has(at(x + dir, y + 1)) && !SOLID.has(at(x + dir, y + 2))) continue;
    set(x, y, TRAP); traps.push({ x, y, dir, fired: false });
    k++;
  }
  // loose stalactites over open drops
  const stals = [];
  const nStal = 1 + Math.min(4, opts.layer + r.int(3));
  for (let k = 0, guard = 0; k < nStal && guard < 300; guard++) {
    const x = 1 + r.int(W - 2), y = 1 + r.int(H - 2);
    if (at(x, y) !== ROCK || blocked(x, y + 3) || busy.has(key(x, y))) continue;
    let d = 0;
    while (at(x, y + 1 + d) === AIR && d < 9) d++;
    if (d < 4) continue;
    stals.push({ x, y }); busy.add(key(x, y));
    k++;
  }
  // ore veins: rock next to open space, so they can be seen
  const ores = Object.entries(opts.data.weights).filter(([k]) => !opts.data.noOre.includes(k));
  const total = ores.reduce((s, [, w]) => s + w, 0);
  const pickOre = () => { let v = r() * total; for (const [k, w] of ores) { v -= w; if (v <= 0) return k; } return ores[0][0]; };
  const veins = new Map();
  const nVeins = Math.max(1, Math.floor(opts.data.orePerLevel + r()));
  const faces = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++)
    if (at(x, y) === ROCK && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) === AIR) && !busy.has(key(x, y)) && !near(x, y, entrance, 2)) faces.push({ x, y });
  for (let k = 0; k < nVeins && faces.length; k++) {
    const f = faces.splice(r.int(faces.length), 1)[0];
    set(f.x, f.y, ORE); veins.set(key(f.x, f.y), { ore: pickOre(), n: r() < 0.15 ? 2 : 1 });
  }
  // monsters: on floors away from the entrance, bats under ceilings
  const spawns = [];
  const kinds = opts.data.monsters || [];
  const nMon = 2 + opts.layer + Math.floor(opts.depth / 2) + r.int(2);
  for (let k = 0, guard = 0; k < nMon && guard < 100 && floors.length; guard++) {
    const f = r.pick(floors);
    if (near(f.x, f.y, entrance, 6) || busy.has(key(f.x, f.y)) || at(f.x, f.y) !== AIR) continue;
    const kind = kinds.length ? r.pick(kinds) : 'giant_rat';
    spawns.push({ kind, x: f.x, y: f.y }); busy.add(key(f.x, f.y));
    k++;
  }
  const nBats = 1 + r.int(2 + opts.layer);
  for (let k = 0, guard = 0; k < nBats && guard < 100; guard++) {
    const x = 1 + r.int(W - 2), y = 1 + r.int(H - 2);
    if (at(x, y) !== AIR || !SOLID.has(at(x, y - 1)) || at(x, y + 1) !== AIR || near(x, y, entrance, 5)) continue;
    spawns.push({ kind: 'bat', x, y });
    k++;
  }
  // cave coins on floors, chests with a find or a scroll
  const coins = [], chests = [];
  const nChest = 1 + (r() < 0.45 ? 1 : 0);
  for (let k = 0, guard = 0; k < nChest && guard < 200 && floors.length; guard++) {
    const f = r.pick(floors);
    if (busy.has(key(f.x, f.y)) || at(f.x, f.y) !== AIR || near(f.x, f.y, entrance, 4)) continue;
    chests.push({ x: f.x, y: f.y, loot: chestLoot(r) }); busy.add(key(f.x, f.y));
    k++;
  }
  const nCoins = 6 + r.int(5) + opts.layer;
  for (let k = 0, guard = 0; k < nCoins && guard < 300 && floors.length; guard++) {
    const f = r.pick(floors);
    if (busy.has(key(f.x, f.y)) || at(f.x, f.y) !== AIR) continue;
    coins.push({ x: f.x, y: f.y, n: 1 + (r() < 0.3 ? 1 : 0), dx: r.int(24) - 12 }); busy.add(key(f.x, f.y));
    k++;
  }
  // the chalk marks of the first level: a free stretch of back wall near the start, 5 x 2 tiles
  let chalk = null;
  if (intro) {
    let best = null;
    for (let by = intro.y - 4; by <= intro.y - 1; by++) for (let bx = intro.x - 9; bx <= intro.x + 5; bx++) {
      let ok = true;
      for (let j = 0; j < 2 && ok; j++) for (let i = 0; i < 5 && ok; i++) if (at(bx + i, by + j) !== AIR) ok = false;
      if (!ok) continue;
      const d = Math.abs(bx + 2 - intro.x - 3 * intro.dir) + Math.abs(by - intro.y + 2) * 2;
      if (!best || d < best.d) best = { x: bx, y: by, d };
    }
    if (best) chalk = { x: best.x, y: best.y };
  }

  // torches on the back wall of each path room
  const torches = [];
  for (let y = 0; y < ROOMS_Y; y++) for (let x = 0; x < ROOMS_X; x++) {
    if (!room[y][x].path && r() < 0.6) continue;
    for (let guard = 0; guard < 20; guard++) {
      const tx = ox(x) + 1 + r.int(8), ty = oy(y) + 2 + r.int(4);
      if (at(tx, ty) === AIR && at(tx, ty + 1) === AIR) { torches.push({ x: tx, y: ty }); break; }
    }
  }
  // still things for the look. Ceiling: stalactites, cobwebs, vines, roots, glow-worms, dripping water.
  // Floor: stalagmites, mushrooms, ferns, crystals, bones, puddles; on top of blocks: grass and moss (drawn in front).
  const decor = [], drips = [], used = new Set();
  const L = opts.layer, green = L <= 1 ? 1 : L === 2 ? 0.5 : 0.15;   // plants thin out with depth
  const ceil = [
    ['stalactites', 3], ['cobweb', 1], ['delve_vine_0', 3 * green], ['delve_vine_1', 2 * green], ['delve_vine_2', 3 * green],
    ['roots', 2 * green], ['delve_glowworms_0', L >= 1 ? 1.5 : 0.4], ['delve_glowworms_1', L >= 1 ? 1.5 : 0.4],
  ];
  const floor = [
    ['stalagmites', 3], ['delve_shrooms_0', 2 * green + 0.5], ['delve_shrooms_1', green + 0.3], ['delve_fern_0', 3 * green], ['delve_fern_1', 2 * green],
    ['glowshrooms', L <= 1 ? 1.5 : 0.6], ['crystals', L >= 3 ? 3 : L === 2 ? 0.8 : 0], ['delve_bones', 0.7], ['boulder', 0.6],
  ];
  const weigh = (list) => { const sum = list.reduce((s, x) => s + x[1], 0); let v = r() * sum; for (const [k, w] of list) if ((v -= w) < 0) return k; return list[0][0]; };
  for (let k = 0; k < 280; k++) {
    const x = 1 + r.int(W - 2), y = 1 + r.int(H - 2), id = y * W + x;
    if (at(x, y) !== AIR || used.has(id) || busy.has(id)) continue;
    if (SOLID.has(at(x, y - 1)) && at(x, y - 1) !== TRAP && !stals.some((s) => s.x === x && s.y === y - 1)) {
      used.add(id); decor.push({ x, y, kind: weigh(ceil), top: true, flip: r() < 0.5 });
    } else if (at(x, y + 1) === ROCK) {
      used.add(id); decor.push({ x, y, kind: weigh(floor), flip: r() < 0.5 });
    }
  }
  // water drips from a few ceilings; a puddle where it lands
  for (let k = 0, guard = 0; k < 5 + r.int(5) && guard < 200; guard++) {
    const x = 1 + r.int(W - 2), y = 1 + r.int(H - 2);
    if (at(x, y) !== AIR || !SOLID.has(at(x, y - 1)) || at(x, y - 1) === TRAP) continue;
    let fy = y; while (fy < H - 1 && !SOLID.has(at(x, fy + 1)) && at(x, fy) !== SPIKES) fy++;
    if (fy - y > 14) continue;
    drips.push({ x, y, floor: fy, off: 4 + r.int(40), every: 1.6 + r() * 2.4 });
    if (at(x, fy + 1) === ROCK && at(x, fy) === AIR) decor.push({ x, y: fy, kind: 'delve_puddle', front: true });
    k++;
  }
  // grass and moss on top of blocks
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (at(x, y) !== ROCK || at(x, y - 1) !== AIR) continue;
    const v = r();
    if (v < 0.22 * green) decor.push({ x, y: y - 1, kind: 'delve_mosstop', front: true, cover: true });
    else if (v < 0.6 * green) decor.push({ x, y: y - 1, kind: r() < 0.5 ? 'delve_tuft_0' : 'delve_tuft_1', front: true, dx: r.int(24) - 12, flip: r() < 0.5 });
  }

  return { seed: opts.seed, layer: opts.layer, depth: opts.depth, last: !!opts.last, tiles, at, set, veins, entrance, ...out,
    shop: shop && { ...shop, x: ox(shop.rx), y: oy(shop.ry) }, traps, stals, spawns, torches, decor, drips, ladders, room, soft, intro, chalk, coins, chests };

  function carveShop(X, Y, door) {
    for (let j = 3; j <= 6; j++) for (let i = 1; i <= 8; i++) set(X + i, Y + j, AIR);
    if (door < 0) for (let j = 4; j <= 6; j++) { set(X, Y + j, AIR); }
    else for (let j = 4; j <= 6; j++) { set(X + 9, Y + j, AIR); }
  }
}

/** Ore lying in a vein at x, y: {ore, n}, or null. */
export function veinAt(L, x, y) { return L.veins.get(y * W + x) || null; }
