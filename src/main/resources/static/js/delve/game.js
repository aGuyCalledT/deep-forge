// The delve engine: an adventurer dwarf runs, jumps, climbs and digs down through the mine, level by level.
// Plays in the browser from a seed the server gave (Delve.java); at the end it reports {result, levels, ore} and
// the server decides what may be kept. Levels come from level.js; everything is drawn in the 48-px art of the hold
// (art/scene.js sprites, art/dwarves.js poses, layer rock recoloured per layer) and lit only by lamps and torches.
//   const g = createGame(canvas, {seed, hearts, pick, damage, look, data, onEnd, onHud});  g.input.left = true ...
import * as Art from '../art/scene.js';
import * as DW from '../art/dwarves.js';
import * as S from '../art/sprites.js';
import * as A from '../core/audio.js';
import { text } from '../art/pixfont.js';
import { makeLevel, veinAt, T, W, H, AIR, ROCK, BEDROCK, ORE, WALL, LADDER, SPIKES, TRAP, SOLID } from './level.js';

// ------------------------------------------------------------------ feel
const GRAV = 1500, MAXFALL = 820, SPEED = 200, ACC = 1900, AIRACC = 1300, JUMP = 575, CLIMB = 160;
const PW = 22, PH = 40;                       // the dwarf's box (feet at y)
const HURT_FALL = 7 * T, BAD_FALL = 11 * T;   // falls longer than this hurt (1 or 2 hearts)
const FUSE = 2.4, BLAST = 1.6 * T, BOMB_DMG = 3, ROPE_LEN = 7;
export const WARES = [
  { id: 'bombs', name: 'Bombs ×3', price: 1, icon: 'delve_bomb' },
  { id: 'ropes', name: 'Ropes ×3', price: 1, icon: 'delve_ropes' },
  { id: 'ale', name: 'Ale: +1 heart', price: 2, icon: 'raw_ale' },
  { id: 'pick', name: 'Better pick', price: 3, icon: 'item_pickaxe' },
];
// monsters of the layers: how they move, how tough they are
const MON = {
  giant_rat: { ai: 'walk', hp: 1, speed: 75 },
  cave_crawler: { ai: 'walk', hp: 2, speed: 45 },
  cave_spider: { ai: 'hop', hp: 2, speed: 150 },
  goblin_scouts: { ai: 'hunt', hp: 2, speed: 95 },
  rock_troll: { ai: 'charge', hp: 4, speed: 40, rush: 170 },
  magma_crab: { ai: 'walk', hp: 3, speed: 55, hot: true, glow: '#ff8a3a' },
  blind_ogre: { ai: 'ear', hp: 5, speed: 35, rush: 160 },
  crystal_golem: { ai: 'charge', hp: 5, speed: 30, rush: 120, glow: '#b8a0ff' },
  deep_wyrm: { ai: 'walk', hp: 6, speed: 60 },
  bat: { ai: 'fly', hp: 1, speed: 120 },
  keeper: { ai: 'keeper', hp: 6, speed: 185 },
};

export function createGame(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const data = opts.data, D = data.delve;
  const layers = data.layers, hardness = data.rockHardness || {};
  const oreName = {};
  for (const o of data.ores || []) oreName[o.id] = o.name;
  const input = { left: false, right: false, up: false, down: false, jump: false, pick: false, bomb: false, rope: false };
  const prev = { ...input };
  const pressed = (k) => input[k] && !prev[k];
  // a tap shorter than one step still counts: a key let go before the game saw it is released after the next step
  const seen = new Set(), late = new Set();
  const press = (k) => { input[k] = true; seen.delete(k); late.delete(k); };
  const release = (k) => { if (input[k] && !seen.has(k)) late.add(k); else input[k] = false; };

  const G = {
    input, paused: false, over: false,
    seed: opts.seed, layer: opts.startLayer || 0, depth: 0, levelsDone: 0, started: performance.now() / 1000,
    hearts: opts.hearts, maxHearts: opts.hearts, pick: opts.pick, damage: opts.damage || 1,
    bombs: opts.bombs ?? 2, ropes: opts.ropes ?? 2, bag: {}, god: !!opts.god, wanted: false, boughtPick: false,
    L: null, shake: 0, flash: 0, banner: null, prompt: null, time: 0,
  };
  let P, mons, bombs, booms, arrows, stals, nuggets, wares, parts, floats, ropes, ropeList, tileHp, noise, look, ramps;
  look = opts.look || { sex: 'm', hair: 'short', beard: 'full', hat: 'miner', vest: true, mood: 'neutral', ramps: {} };
  if (!look.hat) look = { ...look, hat: 'miner' };

  // ---------------------------------------------------------------- levels
  function levelSeed() { return (S.hash(`${G.seed}:${G.layer}:${G.depth}`) % 2000000000) + 1; }
  function enter() {
    const lay = layers[G.layer];
    const last = G.depth === D.levelsPerLayer - 1, deepest = G.layer >= layers.length - 1;
    G.L = makeLevel({ seed: levelSeed(), layer: G.layer, depth: G.depth, last, deepest, shop: G.depth === 1,
      data: { weights: lay.weights, noOre: D.noOre, orePerLevel: D.orePerLevel[G.layer], monsters: lay.monsters } });
    const L = G.L;
    ramps = { rockd: Art.depthRamp(G.layer), wall: Art.depthRamp(Math.min(4, G.layer + 1)) };
    tiles.clear(); oreImg.clear();
    mons = []; bombs = []; booms = []; arrows = []; nuggets = []; parts = []; floats = []; wares = [];
    ropes = new Set(); ropeList = []; tileHp = new Map(); noise = null;
    stals = L.stals.map((s) => ({ tx: s.x, ty: s.y, x: (s.x + 0.5) * T, y: (s.y + 1) * T, state: 'hang', t: 0, vy: 0 }));
    for (const s of L.spawns) mons.push(monster(s.kind, (s.x + 0.5) * T, (s.y + 1) * T - (s.kind === 'bat' ? T - 14 : 0)));
    if (L.shop) {
      const X = L.shop.x, Y = L.shop.y, back = L.shop.door < 0 ? X + 7 : X + 2;
      const k = monster('keeper', (back + 0.5) * T, (Y + 7) * T);
      k.calm = !G.wanted; k.face = L.shop.door < 0 ? -1 : 1;
      mons.push(k);
      const extra = Math.floor(G.layer / 2);
      WARES.forEach((w, i) => {
        if (w.id === 'pick' && G.boughtPick) return;
        const tx = L.shop.door < 0 ? X + 2 + i : X + 4 + i;
        wares.push({ ...w, price: w.price + extra, x: (tx + 0.5) * T, y: (Y + 7) * T, tx, arm: 0 });
      });
      L.shopBox = { x0: X * T, x1: (X + 10) * T, y0: Y * T, y1: (Y + 8) * T };
    }
    P = { x: (L.entrance.x + 0.5) * T, y: (L.entrance.y + 1) * T, vx: 0, vy: 0, w: PW, h: PH, face: 1, ground: false, state: 'walk',
      inv: 1.2, stun: 0, apex: null, swing: 0, swingCD: 0, climbCD: 0, hangCD: 0, coyote: 0, anim: 0, hurtFlash: 0, dead: 0 };
    cam.x = P.x; cam.y = P.y - PH;
    G.banner = { text: `${lay.name} ${G.depth + 1}-${D.levelsPerLayer}`, t: 2.6 };
    A.sfx('doorOpen');
    hud();
  }
  function monster(kind, x, y) {
    const m = MON[kind] || MON.giant_rat;
    let w = 30, h = 26;
    if (kind === 'keeper') { w = PW; h = PH; }
    else if (kind === 'bat') { w = 18; h = 12; }
    else if (Art.info(kind)) {
      const fr = Art.frame(kind, 0);
      w = Math.min(70, Math.round(fr.canvas.width * 0.62)); h = Math.min(44, Math.round(fr.canvas.height * 0.8));
    }
    return { kind, ...m, x, y, w, h, vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1, hpMax: m.hp, ground: false, t: Math.random() * 3,
      state: kind === 'bat' ? 'roost' : 'idle', inv: 0, flash: 0, cd: 0 };
  }

  // ---------------------------------------------------------------- tiles and bodies
  const solid = (tx, ty) => SOLID.has(G.L.at(tx, ty));
  const climbable = (tx, ty) => G.L.at(tx, ty) === LADDER || ropes.has(ty * W + tx);
  function move(b, dt, opts2 = {}) {
    const bounce = opts2.bounce || 0;
    b.hitWall = 0; const wasGround = b.ground; b.ground = false;
    // sideways
    b.x += b.vx * dt;
    const top = b.y - b.h, ty0 = Math.floor(top / T), ty1 = Math.floor((b.y - 0.01) / T);
    if (b.vx > 0) {
      const tx = Math.floor((b.x + b.w / 2) / T);
      for (let ty = ty0; ty <= ty1; ty++) if (solid(tx, ty)) { b.x = tx * T - b.w / 2 - 0.01; b.hitWall = 1; b.vx = bounce ? -b.vx * bounce : 0; break; }
    } else if (b.vx < 0) {
      const tx = Math.floor((b.x - b.w / 2) / T);
      for (let ty = ty0; ty <= ty1; ty++) if (solid(tx, ty)) { b.x = (tx + 1) * T + b.w / 2 + 0.01; b.hitWall = -1; b.vx = bounce ? -b.vx * bounce : 0; break; }
    }
    // up and down
    b.y += b.vy * dt;
    const tx0 = Math.floor((b.x - b.w / 2 + 0.5) / T), tx1 = Math.floor((b.x + b.w / 2 - 0.5) / T);
    if (b.vy >= 0) {
      const ty = Math.floor(b.y / T);
      for (let tx = tx0; tx <= tx1; tx++) if (solid(tx, ty)) {
        b.landV = b.vy; b.y = ty * T; b.vy = bounce && b.vy > 120 ? -b.vy * bounce : 0; b.ground = true;
        if (bounce) b.vx *= 0.7;
        break;
      }
    } else {
      const ty = Math.floor((b.y - b.h) / T);
      for (let tx = tx0; tx <= tx1; tx++) if (solid(tx, ty)) { b.y = (ty + 1) * T + b.h; b.vy = 0; break; }
    }
    b.landed = b.ground && !wasGround;
  }
  const overlap = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && a.y - a.h < b.y && b.y - b.h < a.y;

  // ---------------------------------------------------------------- the dwarf
  function hurt(n, from) {
    if (P.dead || P.inv > 0 || G.over) return;
    if (G.god) { P.inv = 0.6; float(P.x, P.y - PH - 6, 'God mode', '#9fd0ff'); return; }
    G.hearts -= n;
    P.inv = 1.3; P.hurtFlash = 0.25; G.shake = Math.max(G.shake, 0.18);
    const dir = from != null ? Math.sign(P.x - from) || 1 : -P.face;
    P.vx = dir * 210; P.vy = -260; if (P.state !== 'walk') P.state = 'walk';
    A.sfx('hit');
    hud();
    if (G.hearts <= 0) die();
  }
  function die() {
    P.dead = 0.001; P.state = 'walk'; G.hearts = 0;
    A.sfx('defeat');
    setTimeout(() => A.sfx('death'), 500);
  }
  function updatePlayer(dt) {
    const ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    P.inv = Math.max(0, P.inv - dt); P.hurtFlash = Math.max(0, P.hurtFlash - dt);
    P.swing = Math.max(0, P.swing - dt); P.swingCD = Math.max(0, P.swingCD - dt);
    P.climbCD = Math.max(0, P.climbCD - dt); P.hangCD = Math.max(0, P.hangCD - dt); P.stun = Math.max(0, P.stun - dt);
    if (P.dead) {
      P.dead += dt; P.vx *= 0.9; P.vy = Math.min(MAXFALL, P.vy + GRAV * dt); move(P, dt);
      if (P.dead > 1.8 && !G.over) finish('dead');
      return;
    }
    const cx = Math.floor(P.x / T), midY = Math.floor((P.y - PH / 2) / T);
    if (P.state === 'climb') {
      P.vx = 0;
      const dir = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      P.vy = dir * CLIMB; P.anim += dir ? dt * 6 : 0;
      const before = P.y;
      move(P, dt);
      const now = Math.floor((P.y - PH / 2) / T);
      if (!climbable(cx, now)) {
        if (dir < 0) P.y = before;                         // the top of the ladder: stay on it
        else P.state = 'walk';
      }
      if (P.ground && dir > 0) P.state = 'walk';
      if (pressed('jump')) { P.state = 'walk'; P.vy = -JUMP * 0.85; P.vx = ax * SPEED; P.climbCD = 0.3; P.apex = P.y; }
      else if (ax && !input.up && !input.down) { P.state = 'walk'; P.vx = ax * SPEED * 0.6; P.climbCD = 0.3; P.face = ax; }
      P.apex = P.y;
    } else if (P.state === 'hang') {
      P.vx = 0; P.vy = 0; P.apex = P.y;
      if (pressed('jump') || pressed('up')) { P.state = 'walk'; P.vy = -JUMP * 0.92; P.hangCD = 0.2; }
      else if (pressed('down') || (ax && ax === -P.face)) { P.state = 'walk'; P.hangCD = 0.35; }
    } else {
      if (ax && !P.stun) P.face = ax;
      const target = P.stun ? 0 : ax * SPEED, acc = P.ground ? ACC : AIRACC;
      if (P.vx < target) P.vx = Math.min(target, P.vx + acc * dt); else if (P.vx > target) P.vx = Math.max(target, P.vx - acc * dt);
      P.coyote = P.ground ? 0.09 : Math.max(0, P.coyote - dt);
      if (pressed('jump') && P.coyote > 0 && !P.stun) { P.vy = -JUMP; P.coyote = 0; P.ground = false; }
      if (!input.jump && prev.jump && P.vy < 0) P.vy *= 0.45;
      P.vy = Math.min(MAXFALL, P.vy + GRAV * dt);
      if (P.ground || P.apex == null || P.y < P.apex) P.apex = P.y;
      const handBefore = P.y - PH;
      move(P, dt);
      P.anim += P.ground && Math.abs(P.vx) > 20 ? dt * 9 : 0;
      if (P.landed) {
        const fall = P.y - P.apex;
        if (G.L.at(Math.floor(P.x / T), Math.floor((P.y - 1) / T)) === SPIKES && P.landV > 200) { hurt(2); spark(P.x, P.y, '#c8c6d6', 6); }
        else if (fall > BAD_FALL) { hurt(2); P.stun = 0.8; }
        else if (fall > HURT_FALL) { hurt(1); P.stun = 0.5; }
        if (fall > 2 * T) dust(P.x, P.y, 5);
        P.apex = P.y;
      }
      // grab a ledge: falling, pushing into a wall whose top is just at the hands
      if (!P.ground && P.vy > 0 && P.hangCD <= 0 && ax && ax === P.face) {
        const tx = Math.floor((P.x + P.face * (PW / 2 + 3)) / T), hand = P.y - PH;
        const ty = Math.floor((hand + 8) / T), top = ty * T;
        if (solid(tx, ty) && !solid(tx, ty - 1) && !solid(cx, ty - 1) && handBefore <= top + 2 && hand + 8 >= top) {
          P.state = 'hang'; P.vy = 0; P.y = top - 2 + PH; P.x = P.face > 0 ? tx * T - PW / 2 - 0.5 : (tx + 1) * T + PW / 2 + 0.5;
        }
      }
      // onto a ladder or rope
      if (P.climbCD <= 0 && ((input.up && climbable(cx, midY)) || (input.down && climbable(cx, Math.floor((P.y + 6) / T)) && (P.ground || climbable(cx, midY))))) {
        P.state = 'climb'; P.x = (cx + 0.5) * T; P.vx = 0; if (P.ground && input.down) P.y += 6;
      }
    }
    // the pick
    if (pressed('pick') && P.swingCD <= 0 && P.state !== 'climb') swing();
    if (pressed('bomb') && G.bombs > 0) throwBomb();
    if (pressed('rope') && G.ropes > 0) throwRope();
    if (P.y > H * T) hurt(99);
  }

  function swing() {
    P.swing = 0.3; P.swingCD = 0.38;
    // monsters in front of the dwarf first
    const box = { x: P.x + P.face * 26, y: P.y - 4, w: 40, h: PH - 2 };
    for (const m of mons) if (!m.dead && overlap(box, m)) {
      if (m.kind === 'keeper' && m.calm) anger(m);
      damage(m, G.damage, P.x); A.sfx('slash'); return;
    }
    // in front: the first tile within reach of the front of the body (at chest height, else at the feet)
    const front = P.x + P.face * PW / 2, REACH = 30;
    let tx = Math.floor((front + P.face * 2) / T), ty = Math.floor((P.y - PH / 2) / T);
    const edge = (x) => (P.face > 0 ? x * T - front : front - (x + 1) * T);
    const row = (y) => { for (let x = tx, k = 0; k < 2; k++, x += P.face) if (edge(x) <= REACH && solid(x, y)) return x; return null; };
    if (input.down && P.ground) { tx = Math.floor(P.x / T); ty = Math.floor((P.y + 4) / T); }
    else if (input.up) { tx = Math.floor(P.x / T); ty = Math.floor((P.y - PH - 6) / T); }
    else {
      const feet = Math.floor((P.y - 6) / T);
      const a = row(ty), b2 = a == null ? row(feet) : null;
      if (a != null) tx = a; else if (b2 != null) { tx = b2; ty = feet; }
    }
    dig(tx, ty);
  }
  function dig(tx, ty) {
    const t = G.L.at(tx, ty), cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
    noise = { x: cx, y: cy, t: 1.5 };
    if (!SOLID.has(t)) { A.sfx('slash3', { vol: 0.4, rate: 1.4 }); return; }
    let need;
    if (t === BEDROCK) { clink(cx, cy, 'Bedrock. Not even a pick of starsteel.'); return; }
    if (t === ORE) {
      const v = veinAt(G.L, tx, ty), h = hardness[v.ore] || 1;
      if (G.pick < h) { clink(cx, cy, `Too hard for this pick. ${oreName[v.ore] || v.ore} needs a better one.`); return; }
      need = 2;
    } else if (t === WALL) {
      const h = D.walls[G.layer + 1] || 99;
      if (G.pick < h) { clink(cx, cy, 'This wall needs a harder pick. Take the lift home.'); return; }
      need = 4;
    } else need = Math.max(1, Math.min(5, 4 + (G.layer + 1) - G.pick));
    const k = ty * W + tx, hp = (tileHp.get(k) || 0) + 1;
    A.sfx('pickaxe', { rate: 0.9 + Math.random() * 0.25 });
    chips(cx - P.face * 16, cy, t === ORE ? oreColour(veinAt(G.L, tx, ty).ore) : null);
    if (hp < need) { tileHp.set(k, hp); return; }
    breakTile(tx, ty);
  }
  function clink(x, y, msg) {
    A.sfx('parry', { vol: 0.7 });
    spark(x - P.face * 18, y, '#ffe9a8', 4);
    float(P.x, P.y - PH - 8, msg, '#ffcf6a', 2.4);
  }
  function breakTile(tx, ty, byBomb = false) {
    const t = G.L.at(tx, ty), k = ty * W + tx;
    if (t === BEDROCK || (t === WALL && byBomb)) return;
    if (t === ORE) {
      const v = veinAt(G.L, tx, ty);
      for (let i = 0; i < v.n; i++) nuggets.push({ ore: v.ore, x: (tx + 0.5) * T, y: (ty + 0.7) * T, w: 14, h: 12, vx: (Math.random() - 0.5) * 160, vy: -260, t: 0 });
      G.L.veins.delete(k);
      A.sfx('ore');
    }
    if (t === TRAP) G.L.traps = G.L.traps.filter((q) => q.x !== tx || q.y !== ty);
    if (t === WALL) { A.sfx('cart'); G.shake = 0.3; float((tx + 0.5) * T, ty * T, 'The wall breaks!', '#9fe08a', 2); }
    G.L.set(tx, ty, AIR); tileHp.delete(k);
    dust((tx + 0.5) * T, (ty + 0.8) * T, 8, true);
    for (const s of stals) if (s.state === 'hang' && s.tx === tx && s.ty === ty) s.state = 'fall';
  }

  // ---------------------------------------------------------------- bombs and ropes
  function throwBomb() {
    G.bombs--; hud();
    const down = input.down;
    bombs.push({ x: P.x + P.face * 8, y: P.y - PH / 2, w: 14, h: 14, vx: down ? 0 : P.face * 380 + P.vx * 0.4, vy: down ? 0 : (input.up ? -520 : -280), fuse: FUSE });
    A.sfx('click');
  }
  function explode(b) {
    const cx = b.x, cy = b.y - 7;
    const t0x = Math.floor((cx - BLAST) / T), t1x = Math.floor((cx + BLAST) / T), t0y = Math.floor((cy - BLAST) / T), t1y = Math.floor((cy + BLAST) / T);
    for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
      if (Math.hypot((tx + 0.5) * T - cx, (ty + 0.5) * T - cy) > BLAST + 6) continue;
      const t = G.L.at(tx, ty);
      if (t === ROCK || t === ORE || t === TRAP) breakTile(tx, ty, true);
      else if (t === LADDER || t === SPIKES) G.L.set(tx, ty, AIR);
      if (ropes.has(ty * W + tx)) { ropes.delete(ty * W + tx); }
    }
    ropeList = ropeList.filter((r) => { for (let y = r.y0; y <= r.y1; y++) if (ropes.has(y * W + r.x)) return true; return false; });
    const reach = BLAST + 20;
    for (const m of mons) if (!m.dead && Math.hypot(m.x - cx, m.y - m.h / 2 - cy) < reach) { if (m.kind === 'keeper') anger(m); damage(m, BOMB_DMG, cx); }
    if (Math.hypot(P.x - cx, P.y - PH / 2 - cy) < reach) { P.inv = 0; hurt(BOMB_DMG, cx); }
    for (const n of nuggets) if (Math.hypot(n.x - cx, n.y - cy) < reach) { n.vy = -380; n.vx += Math.sign(n.x - cx || 1) * 200; }
    if (G.L.shopBox && inBox(G.L.shopBox, cx, cy)) for (const m of mons) if (m.kind === 'keeper') anger(m);
    booms.push({ x: cx, y: cy, t: 0 });
    G.shake = 0.45; G.flash = 0.35;
    A.sfx('hit2', { rate: 0.55, vol: 1.4 }); A.sfx('slash3', { rate: 0.6 });
    noise = { x: cx, y: cy, t: 3 };
    for (let i = 0; i < 18; i++) parts.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 420, vy: (Math.random() - 0.8) * 380, t: 0, life: 0.5 + Math.random() * 0.6, c: Math.random() < 0.5 ? '#ffc45a' : '#5e5458', s: 2 + (Math.random() * 2 | 0) });
  }
  function throwRope() {
    const cx = Math.floor(P.x / T);
    let ty = Math.floor((P.y - PH / 2) / T);
    if (solid(cx, ty)) return;
    let top = ty;
    while (top > 0 && ty - top < ROPE_LEN && !solid(cx, top - 1)) top--;
    const bottom = Math.floor((P.y - 1) / T);
    for (let y = top; y <= bottom; y++) if (G.L.at(cx, y) === AIR || G.L.at(cx, y) === SPIKES) ropes.add(y * W + cx);
    ropeList.push({ x: cx, y0: top, y1: bottom, t: 0 });
    G.ropes--; hud();
    A.sfx('shuttle', { rate: 0.8 });
  }

  // ---------------------------------------------------------------- monsters
  function damage(m, n, from) {
    if (m.dead || m.inv > 0) return;
    m.hp -= n; m.inv = 0.25; m.flash = 0.15;
    const dir = Math.sign(m.x - from) || 1;
    m.vx = dir * 180; if (m.ground) m.vy = -180;
    if (m.state === 'roost') m.state = 'fly';
    spark(m.x, m.y - m.h / 2, '#e05050', 5);
    if (m.hp <= 0) {
      m.dead = true;
      if (m.kind === 'bat' || m.kind === 'giant_rat' || m.kind === 'cave_crawler') A.critter(); else A.sfx('monster', { vol: 0.6 });
      dust(m.x, m.y, 6);
    }
  }
  function anger(m) {
    if (!m.calm) return;
    m.calm = false; G.wanted = true;
    float(m.x, m.y - m.h - 10, 'Thief! You will pay for that!', '#ff6a5a', 2.6);
    A.sfx('horn');
  }
  function updateMonsters(dt) {
    for (const m of mons) {
      if (m.dead) continue;
      m.t += dt; m.inv = Math.max(0, m.inv - dt); m.flash = Math.max(0, m.flash - dt); m.cd = Math.max(0, m.cd - dt);
      const dx = P.x - m.x, dy = (P.y - PH / 2) - (m.y - m.h / 2), seen = !P.dead && Math.abs(dx) < 6 * T && Math.abs(dy) < 2 * T;
      const ahead = () => {                           // turn at walls and at the edge of a drop
        const tx = Math.floor((m.x + m.face * (m.w / 2 + 2)) / T), ty = Math.floor((m.y - 1) / T);
        return solid(tx, ty) || !solid(tx, ty + 1);
      };
      if (m.ai === 'fly') {
        if (m.state === 'roost') { if (Math.abs(dx) < 4.5 * T && dy > -T && dy < 5 * T && !P.dead) { m.state = 'fly'; A.critter({ vol: 0.5 }); } continue; }
        const tx = P.dead ? m.x : P.x, tyy = P.dead ? m.y - 60 : P.y - PH / 2 + Math.sin(m.t * 5) * 18;
        m.vx += Math.sign(tx - m.x) * 360 * dt; m.vy += Math.sign(tyy - (m.y - m.h / 2)) * 360 * dt;
        const sp = Math.hypot(m.vx, m.vy); if (sp > m.speed) { m.vx *= m.speed / sp; m.vy *= m.speed / sp; }
        move(m, dt); if (m.vx) m.face = Math.sign(m.vx);
      } else {
        let target = 0;
        if (m.ai === 'keeper') {
          if (m.calm) { m.face = Math.sign(dx) || m.face; target = 0; }
          else {
            m.face = Math.sign(dx) || m.face; target = m.face * m.speed;
            if (m.ground && (m.hitWall || Math.abs(dx) < 3 * T && dy < -T) && m.cd <= 0) { m.vy = -JUMP; m.cd = 0.6; }
          }
        } else if (m.ai === 'hop') {
          target = m.ground ? 0 : m.vx;
          if (m.ground && m.cd <= 0 && seen) { m.face = Math.sign(dx) || 1; m.vy = -470; m.vx = m.face * m.speed; m.cd = 1.3; }
        } else if (m.ai === 'hunt' && seen) {
          m.face = Math.sign(dx) || m.face; target = m.face * m.speed;
          if (m.ground && m.hitWall && m.cd <= 0) { m.vy = -480; m.cd = 0.8; }
        } else if ((m.ai === 'charge' && seen) || (m.ai === 'ear' && noise && Math.abs(noise.x - m.x) < 8 * T && Math.abs(noise.y - m.y) < 3 * T)) {
          const goal = m.ai === 'ear' ? noise.x : P.x;
          if (m.state !== 'rush') { m.state = 'rush'; A.sfx('monster', { vol: 0.5, rate: 1.1 }); }
          m.face = Math.sign(goal - m.x) || m.face; target = m.face * m.rush;
        } else {
          if (m.state === 'rush') m.state = 'idle';
          if (m.ground && ahead()) m.face = -m.face;
          target = m.face * m.speed;
        }
        if (m.ai !== 'hop' || m.ground) {
          if (m.inv > 0.1) target = m.vx;
          m.vx += Math.sign(target - m.vx) * Math.min(Math.abs(target - m.vx), 900 * dt);
        }
        m.vy = Math.min(MAXFALL, m.vy + GRAV * dt);
        move(m, dt);
        if (m.ground && m.landV > 300 && G.L.at(Math.floor(m.x / T), Math.floor((m.y - 1) / T)) === SPIKES) damage(m, 3, m.x);
        if (m.hitWall && m.ai !== 'keeper' && m.ai !== 'hunt') m.face = -m.hitWall;
      }
      // touching the dwarf: a stomp from above hurts the monster, anything else hurts the dwarf
      if (!P.dead && overlap(P, m) && !(m.kind === 'keeper' && m.calm)) {
        if (P.vy > 60 && P.y - m.y < -m.h * 0.45 && !m.hot) { damage(m, 1, P.x); P.vy = -380; P.apex = P.y; A.sfx('hit', { rate: 1.4, vol: 0.6 }); }
        else hurt(1, m.x);
      }
      if (m.y > H * T) m.dead = true;
    }
    mons = mons.filter((m) => !m.dead || m.t < 0);
  }

  // ---------------------------------------------------------------- traps, nuggets, shop, exits
  function updateWorld(dt) {
    if (noise) { noise.t -= dt; if (noise.t <= 0) noise = null; }
    // arrow traps watch their corridor
    for (const q of G.L.traps) {
      if (q.fired) continue;
      const row = q.y * T;
      const sees = (b) => b.y > row + 6 && b.y - b.h < row + T - 6 && Math.sign(b.x - (q.x + 0.5) * T) === q.dir && Math.abs(b.x - (q.x + 0.5) * T) < 8 * T && clearRow(q, b.x);
      if (sees(P) || mons.some((m) => !m.dead && m.ai !== 'fly' && sees(m))) {
        q.fired = true;
        arrows.push({ x: (q.x + 0.5) * T + q.dir * 28, y: row + 34, w: 20, h: 6, vx: q.dir * 600, stuck: 0 });
        A.sfx('parry2', { rate: 1.5, vol: 0.6 });
      }
    }
    for (const a of arrows) {
      if (a.stuck) { a.stuck += dt; continue; }
      a.x += a.vx * dt;
      const tip = { x: a.x, y: a.y + 3, w: a.w, h: a.h };
      if (solid(Math.floor((a.x + Math.sign(a.vx) * 10) / T), Math.floor(a.y / T))) { a.stuck = 0.01; A.sfx('pickaxe', { rate: 1.6, vol: 0.5 }); continue; }
      if (!P.dead && overlap(tip, P)) { hurt(1, a.x - a.vx); a.stuck = 9; continue; }
      for (const m of mons) if (!m.dead && overlap(tip, m)) { damage(m, 2, a.x - a.vx); a.stuck = 9; break; }
    }
    arrows = arrows.filter((a) => a.stuck < 2);
    // stalactites drop on whoever walks under them
    for (const s of stals) {
      if (s.state === 'hang') {
        if (!P.dead && Math.abs(P.x - s.x) < 28 && P.y > s.y && P.y - s.y < 7 * T && clearCol(s, P.y)) { s.state = 'shake'; s.t = 0; A.sfx('grind', { rate: 1.6, vol: 0.6 }); }
      } else if (s.state === 'shake') { s.t += dt; if (s.t > 0.4) s.state = 'fall'; }
      else if (s.state === 'fall') {
        s.vy = Math.min(MAXFALL, s.vy + GRAV * dt); s.y += s.vy * dt;
        const box = { x: s.x, y: s.y + 34, w: 14, h: 30 };
        if (!P.dead && overlap(box, P)) { hurt(2, s.x); s.state = 'gone'; dust(s.x, s.y + 30, 6); }
        for (const m of mons) if (!m.dead && overlap(box, m)) { damage(m, 3, s.x); s.state = 'gone'; }
        if (solid(Math.floor(s.x / T), Math.floor((s.y + 36) / T))) { s.state = 'gone'; dust(s.x, s.y + 34, 8); A.sfx('pickaxe', { rate: 0.6 }); }
      }
    }
    stals = stals.filter((s) => s.state !== 'gone');
    // bombs
    for (const b of bombs) {
      b.fuse -= dt;
      b.vy = Math.min(MAXFALL, b.vy + GRAV * dt);
      move(b, dt, { bounce: 0.35 });
      if (b.ground) b.vx *= 0.9;
      if (b.fuse <= 0) { b.gone = true; explode(b); }
    }
    bombs = bombs.filter((b) => !b.gone);
    for (const b of booms) b.t += dt;
    booms = booms.filter((b) => b.t < 0.5);
    for (const r of ropeList) r.t += dt;
    // ore lying about
    for (const n of nuggets) {
      n.t += dt; n.vy = Math.min(MAXFALL, n.vy + GRAV * dt);
      move(n, dt, { bounce: 0.3 });
      if (n.ground) n.vx *= 0.85;
      if (n.t > 0.35 && !P.dead && overlap(n, { x: P.x, y: P.y, w: PW + 10, h: PH })) {
        n.got = true; G.bag[n.ore] = (G.bag[n.ore] || 0) + 1;
        A.sfx('ore', { vol: 1.2 }); A.sfx('coinsLittle', { vol: 0.5 });
        float(n.x, n.y - 20, `+1 ${oreName[n.ore] || n.ore}`, '#9fe08a', 1.6);
        hud();
      }
    }
    nuggets = nuggets.filter((n) => !n.got && n.y < H * T);
    // particles and words
    for (const p of parts) { p.t += dt; p.vy += GRAV * 0.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter((p) => p.t < p.life);
    for (const f of floats) f.t += dt;
    floats = floats.filter((f) => f.t < f.life);
    // what the dwarf can do here: buy, go down, ride home
    G.prompt = null;
    if (P.dead || !P.ground) return;
    const tx = Math.floor(P.x / T), ty = Math.floor((P.y - 1) / T);
    const wa = wares.find((w) => Math.abs(w.x - P.x) < 22 && Math.abs(w.y - P.y) < 10);
    if (wa) {
      const keeper = mons.find((m) => m.kind === 'keeper' && !m.dead);
      const free = !keeper, can = free || bagTotal() >= wa.price;
      wa.arm = Math.max(0, wa.arm - dt);
      G.prompt = free ? `Up: take ${wa.name}` : can ? `Up: buy ${wa.name} for ${wa.price} ore` : wa.arm ? `Up again: steal ${wa.name}` : `${wa.name}: ${wa.price} ore. You have ${bagTotal()}.`;
      if (pressed('up')) {
        if (free) take(wa);
        else if (can) { pay(wa.price); take(wa); A.sfx('coinsLittle'); float(P.x, P.y - PH - 8, 'Thank you, friend.', '#ffe9a8', 1.6); }
        else if (wa.arm) { take(wa); anger(keeper); }
        else { wa.arm = 1.5; A.sfx('error'); }
      }
      return;
    }
    const L0 = G.L;
    if (L0.exit && tx === L0.exit.x && ty === L0.exit.y && L0.at(tx, ty) === AIR) {
      const next = G.depth === D.levelsPerLayer - 1 ? layers[G.layer + 1] : null;
      G.prompt = next ? `Up: break through into ${next.name}` : 'Up: go deeper';
      if (pressed('up')) nextLevel();
    } else if (L0.lift && Math.abs(tx - L0.lift.x) <= 0 && ty === L0.lift.y) {
      G.prompt = `Up: ride the lift home with ${bagTotal()} ore`;
      if (pressed('up')) { A.sfx('cart'); finish('exit'); }
    } else if (L0.wall && Math.abs(tx - L0.wall.x) <= 1 && ty === L0.wall.y1 && L0.at(L0.wall.x, L0.wall.y1) === WALL) {
      const h = D.walls[G.layer + 1];
      G.prompt = G.pick >= h ? 'Break the wall with your pick to go deeper' : 'This wall is too hard for your pick';
    }
  }
  function clearRow(q, x) {
    const a = Math.min(q.x, Math.floor(x / T)) + 1, b = Math.max(q.x, Math.floor(x / T)) - 1;
    for (let tx = a; tx <= b; tx++) if (solid(tx, q.y)) return false;
    return true;
  }
  function clearCol(s, y) {
    for (let ty = s.ty + 1; ty < Math.floor((y - 1) / T); ty++) if (solid(s.tx, ty)) return false;
    return true;
  }
  const inBox = (b, x, y) => x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1;
  const bagTotal = () => Object.values(G.bag).reduce((s, n) => s + n, 0);
  function pay(n) {
    while (n > 0) {
      const [k] = Object.entries(G.bag).sort((a, b) => b[1] - a[1])[0];
      G.bag[k]--; if (!G.bag[k]) delete G.bag[k]; n--;
    }
  }
  function take(w) {
    wares = wares.filter((x) => x !== w);
    if (w.id === 'bombs') G.bombs += 3;
    else if (w.id === 'ropes') G.ropes += 3;
    else if (w.id === 'ale') { G.hearts++; G.maxHearts = Math.max(G.maxHearts, G.hearts); A.sfx('slosh'); }
    else if (w.id === 'pick') { G.pick++; G.boughtPick = true; A.sfx('anvilGood'); float(P.x, P.y - PH - 20, 'A better pick! Harder rock gives way now.', '#9fe08a', 2.4); }
    hud();
  }
  function nextLevel() {
    G.levelsDone++;
    G.depth++;
    if (G.depth >= D.levelsPerLayer) { G.depth = 0; G.layer++; A.sfx('fanfare'); }
    enter();
  }
  function finish(result) {
    if (G.over) return;
    G.over = true;
    const levels = G.levelsDone + (result === 'exit' ? 1 : 0);
    const ore = result === 'exit' ? { ...G.bag } : {};
    if (result === 'exit') A.sfx('fanfare');
    hud();
    opts.onEnd && opts.onEnd({ result, levels, ore, layer: G.layer, seconds: performance.now() / 1000 - G.started, found: { ...G.bag } });
  }

  // ---------------------------------------------------------------- little effects
  function float(x, y, s, c = '#fbf4e6', life = 1.4) { floats.push({ x, y, s, c, t: 0, life }); }
  function dust(x, y, n, rock = false) {
    const ramp = ramps.rockd;
    for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 200, t: 0, life: 0.4 + Math.random() * 0.4, c: rock ? ramp[1 + (i % 3)] : '#8a7e7e', s: rock ? 3 : 2 });
  }
  function chips(x, y, c) { for (let i = 0; i < 4; i++) parts.push({ x, y, vx: -P.face * (60 + Math.random() * 140), vy: -80 - Math.random() * 160, t: 0, life: 0.35, c: c || ramps.rockd[3], s: 2 }); }
  function spark(x, y, c, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.7) * 260, t: 0, life: 0.25, c, s: 1 }); }
  const oreColour = (k) => { const o = (data.ores || []).find((x) => x.id === k); return (o && o.color) || '#c8c6d6'; };

  // ---------------------------------------------------------------- the HUD (drawn by ui.js from this summary)
  let lastHud = '';
  function hud() {
    const h = { hearts: G.hearts, maxHearts: G.maxHearts, bombs: G.bombs, ropes: G.ropes, bag: { ...G.bag }, pick: G.pick,
      layer: G.layer, layerName: layers[G.layer].name, depth: G.depth, levels: D.levelsPerLayer, prompt: G.prompt, over: G.over };
    const s = JSON.stringify(h);
    if (s !== lastHud) { lastHud = s; opts.onHud && opts.onHud(h); }
  }

  // ---------------------------------------------------------------- drawing
  const cam = { x: 0, y: 0, z: 1 };
  const tiles = new Map();          // cache of recoloured tile canvases
  function tileImg(name, f, ramp) {
    const k = name + f + ramp;
    if (!tiles.has(k)) tiles.set(k, Art.frame(name, f, { recolour: { rockd: ramps[ramp] } }).canvas);
    return tiles.get(k);
  }
  const oreImg = new Map();
  function veinImg(ore, v) {
    const k = ore + v;
    if (!oreImg.has(k)) {
      const c = S.mk(T, T), g = c.getContext('2d');
      g.drawImage(tileImg('delve_block', v % 4, 'rockd'), 0, 0);
      const ramp = DW.ramp(oreColour(ore));
      const fr = Art.frame('ore_seam_' + (v % 3), 0, { recolour: { rockd: ramps.rockd, ingot: ramp } });
      g.drawImage(fr.canvas, Math.round(T / 2 - fr.ax), Math.round(T / 2 - fr.ay));
      const fr2 = Art.frame('ore_seam_' + ((v + 1) % 3), 0, { recolour: { rockd: ramps.rockd, ingot: ramp } });
      g.save(); g.beginPath(); g.rect(4, 4, T - 8, T - 8); g.clip();
      g.drawImage(fr2.canvas, Math.round(T / 2 - fr2.ax + 6), Math.round(T / 2 - fr2.ay - 8)); g.restore();
      oreImg.set(k, c);
    }
    return oreImg.get(k);
  }
  let bgPat = null, bgLayer = -1, lightC = null;
  function draw(t) {
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
    const z = Math.max(1, Math.min(3, Math.round(ch / (9.5 * T)))), vw = cw / z, vh = ch / z;
    cam.z = z;
    // camera follows the dwarf, a little ahead of where it looks
    const tx = P.x + P.face * 30, ty = P.y - PH / 2 + (input.down && P.ground && !P.vx ? 90 : input.up && P.ground && !P.vx ? -90 : 0);
    cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12;
    let x0 = Math.max(0, Math.min(W * T - vw, cam.x - vw / 2)), y0 = Math.max(0, Math.min(H * T - vh, cam.y - vh / 2));
    if (G.shake > 0) { x0 += (Math.random() - 0.5) * 10 * G.shake; y0 += (Math.random() - 0.5) * 10 * G.shake; }
    x0 = Math.round(x0); y0 = Math.round(y0);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -x0 * dpr * z, -y0 * dpr * z);
    ctx.imageSmoothingEnabled = false;
    const L0 = G.L;
    // the back wall: the layer's rock, darker
    if (bgLayer !== G.layer) { bgPat = ctx.createPattern(Art.frame('rock_' + Math.min(4, G.layer), 0).canvas, 'repeat'); bgLayer = G.layer; }
    ctx.fillStyle = bgPat; ctx.fillRect(x0, y0, vw + 1, vh + 1);
    ctx.fillStyle = 'rgba(8,5,12,0.8)'; ctx.fillRect(x0, y0, vw + 1, vh + 1);
    const c0 = Math.max(0, Math.floor(x0 / T)), c1 = Math.min(W - 1, Math.floor((x0 + vw) / T)), r0 = Math.max(0, Math.floor(y0 / T)), r1 = Math.min(H - 1, Math.floor((y0 + vh) / T));
    // things on the back wall
    for (const d of L0.decor) if (d.x >= c0 - 1 && d.x <= c1 + 1 && d.y >= r0 - 1 && d.y <= r1 + 1) {
      if (d.top) Art.draw(ctx, d.kind, 0, (d.x + 0.5) * T, d.y * T, d.kind === 'cobweb' ? { flip: d.flip } : { recolour: { rockd: ramps.rockd }, flip: d.flip });
      else Art.draw(ctx, d.kind, 0, (d.x + 0.5) * T, (d.y + 1) * T, { recolour: { rockd: ramps.rockd }, flip: d.flip });
    }
    Art.draw(ctx, 'mine_hole', 0, (L0.entrance.x + 0.5) * T, (L0.entrance.y + 1) * T, { recolour: { rockd: ramps.rockd } });
    if (L0.exit) Art.draw(ctx, 'mine_hole', 0, (L0.exit.x + 0.5) * T, (L0.exit.y + 1) * T, { recolour: { rockd: ramps.wall } });
    if (L0.lift) {
      Art.draw(ctx, 'liftcage', 0, (L0.lift.x + 0.5) * T, (L0.lift.y + 1) * T);
      Art.draw(ctx, 'winch', Math.floor(t * 3) % 4, (L0.lift.x + 0.5) * T, (L0.lift.y - 1) * T + 8);
    }
    if (L0.shop) {
      const X = L0.shop.x * T, Y = L0.shop.y * T, back = L0.shop.door < 0 ? X + 7.5 * T : X + 2.5 * T;
      Art.draw(ctx, 'shelf', 0, back + (L0.shop.door < 0 ? 40 : -40), Y + 7 * T);
      Art.draw(ctx, 'lantern', 0, X + 5 * T, Y + 3 * T);
      Art.draw(ctx, 'scales', 0, back + (L0.shop.door < 0 ? -40 : 40), Y + 7 * T);
    }
    for (const q of L0.torches) if (q.x >= c0 - 1 && q.x <= c1 + 1) Art.draw(ctx, 'torch', Math.floor(t * 8 + q.x) % 4, (q.x + 0.5) * T, (q.y + 1) * T - 8);
    // the rock
    for (let ty = r0; ty <= r1; ty++) for (let tx = c0; tx <= c1; tx++) {
      const tt = L0.at(tx, ty), X = tx * T, Y = ty * T, v = (tx * 7 + ty * 13) & 3;
      if (tt === ROCK || tt === BEDROCK) ctx.drawImage(tileImg('delve_block', v, 'rockd'), X, Y);
      else if (tt === ORE) {
        ctx.drawImage(veinImg(veinAt(L0, tx, ty).ore, v), X, Y);
        const tw = (t * 1.3 + tx * 0.37 + ty * 0.61) % 3;                     // a glint wanders over the ore
        if (tw < 0.5) { const gx = X + 10 + ((tx * 13 + ty * 7) % 28), gy = Y + 12 + ((tx * 5 + ty * 11) % 22), a = 1 - Math.abs(tw - 0.25) * 4;
          ctx.fillStyle = `rgba(255,248,220,${a})`; ctx.fillRect(gx, gy - 2, 1, 5); ctx.fillRect(gx - 2, gy, 5, 1); }
      }
      else if (tt === WALL) ctx.drawImage(tileImg('delve_wall', 0, 'wall'), X, Y);
      else if (tt === TRAP) {
        const q = L0.traps.find((a) => a.x === tx && a.y === ty);
        Art.draw(ctx, 'delve_arrowtrap', 0, q && q.dir < 0 ? X + T - 1 : X, Y, { recolour: { rockd: ramps.rockd }, flip: q && q.dir < 0 });
      } else if (tt === LADDER) ctx.drawImage(Art.frame('delve_ladder', 0).canvas, X, Y);
      else if (tt === SPIKES) Art.draw(ctx, 'delve_spikes', 0, X, Y + T - 1);
      if (tt === BEDROCK) { ctx.fillStyle = 'rgba(4,2,8,0.55)'; ctx.fillRect(X, Y, T, T); }
      if (SOLID.has(tt)) edges(tx, ty, X, Y);
      const hp = tileHp.get(ty * W + tx);
      if (hp) cracks(X, Y, hp, tx * 31 + ty);
    }
    for (const r of ropeList) {
      const grow = Math.min(1, r.t / 0.25), y1 = r.y1, y0 = Math.round(y1 - (y1 - r.y0) * grow);
      for (let y = y0; y <= y1; y++) if (ropes.has(y * W + r.x)) ctx.drawImage(Art.frame(y === y1 ? 'delve_rope_end' : 'delve_rope', 0).canvas, r.x * T, y * T);
      Art.draw(ctx, 'delve_hook', 0, (r.x + 0.5) * T, y0 * T - 2);
    }
    // the shop's wares
    for (const w of wares) {
      const img = w.icon.startsWith('delve_') ? Art.frame(w.icon, 0).canvas : w.id === 'pick' ? S.item('pickaxe', 'iron') : S.sprite(w.icon);
      ctx.drawImage(img, Math.round(w.x - img.width / 2), Math.round(w.y - img.height - 2));
      text(ctx, `${w.price}`, w.x, w.y - img.height - 12, '#ffe9a8', 'center');
    }
    for (const n of nuggets) { const img = S.ore(n.ore); ctx.drawImage(img, Math.round(n.x - img.width / 2), Math.round(n.y - img.height)); }
    // stalactites, monsters, the dwarf
    for (const s of stals) Art.draw(ctx, 'delve_stal', 0, s.x + (s.state === 'shake' ? Math.round(Math.sin(s.t * 70) * 1.5) : 0), s.y, { recolour: { rockd: ramps.rockd } });
    for (const m of mons) drawMonster(m, t);
    drawDwarf(t);
    for (const b of bombs) Art.draw(ctx, 'delve_bomb', Math.min(3, Math.floor((1 - b.fuse / FUSE) * 4)), b.x, b.y);
    for (const a of arrows) Art.draw(ctx, 'delve_arrow', 0, a.x, a.y, { flip: a.vx < 0 });
    for (const b of booms) Art.draw(ctx, 'delve_boom', Math.min(3, Math.floor(b.t / 0.5 * 4)), b.x, b.y);
    for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    // darkness: only lamps, torches, fire and glowing things light the mine
    light(t, x0, y0, vw, vh);
    for (const f of floats) {
      const a = Math.min(1, (f.life - f.t) * 3);
      ctx.globalAlpha = a; text(ctx, f.s, f.x, f.y - f.t * 14, f.c, 'center'); ctx.globalAlpha = 1;
    }
    if (G.prompt && !G.over) {
      text(ctx, G.prompt, P.x, P.y - PH - 24, '#ffe9a8', 'center');
    }
    if (G.banner && G.banner.t > 0) {
      ctx.globalAlpha = Math.min(1, G.banner.t);
      text(ctx, G.banner.text, x0 + vw / 2, y0 + 30, '#ffe9a8', 'center');
      ctx.globalAlpha = 1;
    }
  }
  function edges(tx, ty, X, Y) {
    const L0 = G.L, open = (a, b) => !SOLID.has(L0.at(a, b));
    if (open(tx, ty - 1)) { ctx.fillStyle = 'rgba(232,212,180,0.32)'; ctx.fillRect(X, Y, T, 2); ctx.fillStyle = 'rgba(232,212,180,0.12)'; ctx.fillRect(X, Y + 2, T, 2); }
    if (open(tx, ty + 1)) { ctx.fillStyle = 'rgba(6,3,10,0.55)'; ctx.fillRect(X, Y + T - 5, T, 5); }
    if (open(tx - 1, ty)) { ctx.fillStyle = 'rgba(232,212,180,0.12)'; ctx.fillRect(X, Y, 2, T); }
    if (open(tx + 1, ty)) { ctx.fillStyle = 'rgba(6,3,10,0.4)'; ctx.fillRect(X + T - 3, Y, 3, T); }
  }
  function cracks(X, Y, hp, seed) {
    const r = S.rand(seed * 977 + 1);
    ctx.fillStyle = 'rgba(8,4,10,0.85)';
    for (let k = 0; k < hp * 2; k++) {
      let x = X + 10 + r() * 28, y = Y + 10 + r() * 28;
      for (let i = 0; i < 7; i++) { ctx.fillRect(Math.round(x), Math.round(y), 2, 1); x += (r() - 0.5) * 6; y += 1 + r() * 2; }
    }
  }
  const LIT = ['#fff2c0'];
  function drawDwarf(t) {
    if (P.inv > 0 && !P.dead && Math.floor(t * 14) % 2 && P.inv < 1.2) return;
    let pose = 'idleSide', f = 0;
    if (P.dead) pose = 'sleep';
    else if (P.swing > 0) { pose = 'mine'; f = Math.min(3, Math.floor((1 - P.swing / 0.3) * 4)); }
    else if (P.state === 'climb') { pose = 'climb'; f = Math.floor(P.anim) % 4; }
    else if (P.state === 'hang') pose = 'hang';
    else if (!P.ground) pose = P.vy < 0 ? 'jump' : P.y - (P.apex ?? P.y) > 3 * T ? 'fall' : 'jump';
    else if (Math.abs(P.vx) > 20) { pose = 'walk'; f = Math.floor(P.anim) % 4; }
    if (pose === 'sleep') {                         // fallen: the dwarf on its back
      const c = DW.frame(look, 'idleSide', 0);
      ctx.save(); ctx.translate(Math.round(P.x), Math.round(P.y)); ctx.rotate(-Math.PI / 2 * Math.min(1, P.dead * 4)); ctx.drawImage(c, -24, -62); ctx.restore();
    }
    else DW.draw(ctx, look, pose, f, P.x, P.y + 1, { flip: P.face < 0 && pose !== 'climb' });
    if (P.hurtFlash > 0) { ctx.fillStyle = 'rgba(255,60,40,0.25)'; ctx.fillRect(P.x - 18, P.y - 46, 36, 46); }
  }
  function drawMonster(m, t) {
    if (m.dead) return;
    if (m.kind === 'keeper') {
      const kl = keeperLook();
      const pose = m.calm ? 'idle' : Math.abs(m.vx) > 20 ? 'walk' : 'idleSide';
      DW.draw(ctx, kl, pose, Math.floor(t * 8) % 4, m.x, m.y + 1, { flip: !m.calm && m.face < 0 });
      if (!m.calm) text(ctx, '!', m.x, m.y - 56, '#ff6a5a', 'center');
      return;
    }
    if (m.kind === 'bat') {
      if (m.state === 'roost') Art.draw(ctx, 'bat_hanging', Math.floor(t * 2) % 4, m.x, m.y - m.h);
      else Art.draw(ctx, 'bat', Math.floor(t * 12) % 4, m.x, m.y - m.h / 2, { flip: m.face > 0 });
      return;
    }
    const fr = Art.frame(m.kind, Math.floor(t * (m.state === 'rush' ? 10 : 6)) % 4, { flip: m.face > 0 });
    ctx.drawImage(fr.canvas, Math.round(m.x - fr.ax), Math.round(m.y + 1 - fr.ay));
    if (m.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(m.x - m.w / 2, m.y - m.h, m.w, m.h); }
  }
  let kLook = null;
  function keeperLook() {
    if (!kLook) kLook = { sex: 'm', hair: 'long', beard: 'fork', hat: null, vest: true, mood: 'happy',
      ramps: { tunic: DW.ramp('#7a3a6a'), vest: DW.ramp('#c9a24a'), hair: DW.ramp('#d8d0c4') } };
    const angry = mons.some((m) => m.kind === 'keeper' && !m.calm);
    return angry ? { ...kLook, mood: 'angry' } : kLook;
  }
  function light(t, x0, y0, vw, vh) {
    const k = 2;                                    // the light map at half resolution, smoothed when drawn
    const w = Math.ceil(vw / k), h = Math.ceil(vh / k);
    if (!lightC) lightC = S.mk(w, h);
    if (lightC.width !== w || lightC.height !== h) { lightC.width = w; lightC.height = h; }
    const g = lightC.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.fillStyle = `rgba(3,1,6,${0.94 + Math.min(0.04, G.layer * 0.01)})`; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => {
      const X = (x - x0) / k, Y = (y - y0) / k, R = r / k;
      if (X < -R || Y < -R || X > w + R || Y > h + R) return;
      const gr = g.createRadialGradient(X, Y, 0, X, Y, R);
      gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.75})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(X - R, Y - R, R * 2, R * 2);
    };
    const flick = 1 + Math.sin(t * 9) * 0.02 + Math.sin(t * 23) * 0.015;
    hole(P.x + P.face * 6, P.y - PH + 4, 200 * flick, 1);
    for (const q of G.L.torches) hole((q.x + 0.5) * T, (q.y + 1) * T - 30, 130 * (1 + Math.sin(t * 7 + q.x) * 0.04), 0.95);
    if (G.L.shop) hole((G.L.shop.x + 5) * T, (G.L.shop.y + 4) * T, 230, 1);
    hole((G.L.entrance.x + 0.5) * T, (G.L.entrance.y + 0.5) * T, 110, 0.6);
    if (G.L.lift) hole((G.L.lift.x + 0.5) * T, (G.L.lift.y + 0.5) * T, 140, 0.8);
    for (const b of bombs) hole(b.x, b.y - 18, 40, 0.8);
    for (const b of booms) hole(b.x, b.y, 300 * (1 - b.t / 0.5), 1);
    for (const m of mons) if (!m.dead && m.glow) hole(m.x, m.y - m.h / 2, 80, 0.7);
    for (const [k] of G.L.veins) hole((k % W + 0.5) * T, (Math.floor(k / W) + 0.5) * T, 46, 0.45 + 0.15 * Math.sin(t * 3 + k));
    for (const d of G.L.decor) if (d.kind === 'glowshrooms' || d.kind === 'crystals') hole((d.x + 0.5) * T, (d.y + 0.8) * T, 60, 0.5);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lightC, x0, y0, w * k, h * k);
    // warm torch light on top
    ctx.globalCompositeOperation = 'lighter';
    for (const q of G.L.torches) {
      const x = (q.x + 0.5) * T, y = (q.y + 1) * T - 30;
      if (x < x0 - 120 || x > x0 + vw + 120 || y < y0 - 120 || y > y0 + vh + 120) continue;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 110);
      gr.addColorStop(0, 'rgba(255,150,60,0.16)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 110, y - 110, 220, 220);
    }
    if (G.flash > 0) { ctx.fillStyle = `rgba(255,200,120,${G.flash * 0.5})`; ctx.fillRect(x0, y0, vw, vh); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the loop
  let raf = 0, last = 0, acc = 0;
  function frame(ms) {
    raf = requestAnimationFrame(frame);
    const now = ms / 1000;
    const dt = Math.min(0.1, now - (last || now)); last = now;
    if (!G.paused) {
      acc += dt;
      const step = 1 / 60;
      while (acc >= step) {
        acc -= step; G.time += step;
        if (!G.over || P.dead) {
          updatePlayer(step); updateMonsters(step); updateWorld(step);
        }
        G.shake = Math.max(0, G.shake - step); G.flash = Math.max(0, G.flash - step);
        if (G.banner) G.banner.t -= step;
        Object.assign(prev, input);
        for (const k of Object.keys(input)) if (input[k]) seen.add(k);
        for (const k of late) input[k] = false;
        late.clear();
      }
      hud();
    }
    draw(G.time);
  }
  return {
    G, input, press, release,
    debug: () => ({ P, mons, wares, nuggets, stals, bombs }),
    start() { enter(); last = 0; raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); },
    pause(on) { G.paused = on; },
    giveUp() { finish('quit'); },
    /** Test page: jump to another level of the current run. */
    skip() { if (!G.over) nextLevel(); },
  };
}
