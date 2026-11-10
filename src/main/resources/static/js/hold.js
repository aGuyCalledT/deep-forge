// The hold: surface, rock, mine shaft, hallways, stairs and rooms where the player placed them,
// and the dwarves walking between them.
import { G, F, D, byId, now, stock, fullName } from './data.js';
import * as S from './sprites.js';
import { sun, daylight, skyColors, berlinHour } from './sun.js';
import { text, sign } from './pixfont.js';

export const CELL = 16, RH = 64, SURF = 112;
const WALK = 58;
const GRASS = SURF - 10;

let plan = null;   // { cols, floors, shaft, rooms: {type: cells} }
const particles = [];

export function W() { return G.data.plan.cols * CELL; }
export function H() { return SURF + G.data.plan.floors * RH; }
const fy = (f) => (f < 0 ? GRASS : SURF + f * RH + WALK);       // feet line of a floor
const ftop = (f) => SURF + f * RH;

// ------------------------------------------------------------------ the plan as a grid

function grid() {
  plan = G.data.plan;
  const f = F(), L = f.layout || { rooms: {}, halls: [], stairs: [] };
  const cells = new Map();    // "c,f" -> {kind, id?}
  const rooms = [];
  for (const [id, [c, fl]] of Object.entries(L.rooms)) {
    const b = f.buildings.find((x) => x.id === id);
    if (!b) continue;
    const w = plan.rooms[b.type];
    rooms.push({ b, c, f: fl, w, x: c * CELL, y: ftop(fl), pw: w * CELL });
    for (let x = c; x < c + w; x++) cells.set(x + ',' + fl, { kind: 'room', id });
  }
  for (const k of L.halls) cells.set(k, { kind: 'hall' });
  const stairs = L.stairs.map((k) => { const [c, fl] = k.split(',').map(Number); return { c, f: fl }; });
  for (const s of stairs) for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) cells.set((s.c + dx) + ',' + (s.f + dy), { kind: 'stair' });
  for (let fl = 0; fl < plan.floors; fl++) for (let c = 0; c < plan.shaft; c++) cells.set(c + ',' + fl, { kind: 'shaft' });
  return { cells, rooms, stairs };
}

function walkable(g, c, fl) {
  if (fl === -1) return c >= 0 && c < plan.cols;
  return g.cells.has(c + ',' + fl);
}

/** Breadth-first path over cells: walking left/right, the shaft ladder, stairs. */
function path(g, from, to) {
  const key = (n) => n.c + ',' + n.f;
  const prev = new Map([[key(from), null]]);
  const q = [from];
  const stairAt = new Map(g.stairs.map((s) => [s.c + ',' + s.f, s]));
  while (q.length) {
    const n = q.shift();
    if (n.c === to.c && n.f === to.f) break;
    const next = [];
    for (const dc of [-1, 1]) if (walkable(g, n.c + dc, n.f)) next.push({ c: n.c + dc, f: n.f, m: 'walk' });
    if (n.c < plan.shaft) {
      if (n.f + 1 < plan.floors) next.push({ c: n.c, f: n.f + 1, m: 'ladder' });
      if (n.f >= 0) next.push({ c: n.c, f: n.f - 1, m: 'ladder' });
    }
    const s = stairAt.get(n.c + ',' + n.f);
    if (s) next.push({ c: n.c + 1, f: n.f + 1, m: 'stairs' });
    const up = stairAt.get((n.c - 1) + ',' + (n.f - 1));
    if (up) next.push({ c: n.c - 1, f: n.f - 1, m: 'stairs' });
    for (const x of next) if (!prev.has(key(x))) { prev.set(key(x), n); x.from = n; q.push(x); }
  }
  if (!prev.has(key(to))) return null;
  const out = [];
  let n = q.find((x) => x.c === to.c && x.f === to.f) || to;
  // rebuild by walking prev
  const nodes = [];
  let cur = { c: to.c, f: to.f };
  while (cur) { nodes.unshift(cur); const p = prev.get(key(cur)); cur = p ? { c: p.c, f: p.f } : null; }
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1], b = nodes[i];
    const mode = a.f === b.f ? 'walk' : (a.c < plan.shaft && b.c === a.c ? 'ladder' : 'stairs');
    out.push({ x: b.c * CELL + 8, y: fy(b.f), f: b.f, mode });
  }
  void n;
  return out;
}

// ------------------------------------------------------------------ dwarves on the move

const agents = new Map();   // dwarf id -> agent
const CYCLE = 12, WORK = 9; // minutes: 9 at work, 3 off

function schedule(d) {
  const t = Date.now() / 60000 + (S.hash('cyc' + d.id) % CYCLE);
  return { k: Math.floor(t / CYCLE), off: (t % CYCLE) >= WORK };
}

/** Where a dwarf wants to be right now: {f, x, pose, hidden, tool, sleep}. */
function want(g, d, ctx) {
  if (d.busy) return { hidden: true, f: -1, x: W() + 40 };
  const sch = schedule(d);
  const night = ctx.hour >= 22 || ctx.hour < 6;
  const room = (type) => g.rooms.filter((r) => r.b.type === type);
  const free = () => {
    if (night) {
      const bed = ctx.beds.shift();
      if (bed) return { f: bed.f, x: bed.x, feet: bed.y, pose: 'sleep', sleep: true };
    }
    const r = S.hash('free' + d.id + ':' + sch.k) % 10;
    if (r < 6 && ctx.seats.length) { const s = ctx.seats.shift(); return { f: s.f, x: s.x, pose: s.pose }; }
    const chat = S.hash('chat' + d.id + sch.k) % 2 ? 'talk' : 'idle';     // half of them stand and chat
    if (r < 8) {
      const cells = [...g.cells.entries()].filter(([, v]) => v.kind === 'hall' || v.kind === 'room');
      if (cells.length) { const [k] = cells[S.hash('wander' + d.id + sch.k) % cells.length]; const [c, fl] = k.split(',').map(Number); return { f: fl, x: c * CELL + 8, pose: chat }; }
    }
    return { f: -1, x: 120 + (S.hash('stroll' + d.id) % Math.max(40, W() - 260)), pose: chat };
  };
  if (d.job === 'worker') {
    const r = g.rooms.find((x) => x.b.id === d.building);
    if (r && !sch.off) {
      const a = S.META.ROOMS[r.b.type] || {};
      const wx = a.worker ? r.x + a.worker[0] : r.x + r.pw / 2;
      const busy = r.b.job || byId.buildings[r.b.type].kind === 'continuous';
      return { f: r.f, x: wx, pose: busy && !F().siege ? 'work' : 'idle', tool: TOOL_OF[r.b.type], face: r.b.type === 'smelter' || r.b.type === 'forge' ? -1 : 1 };
    }
    return free();
  }
  if (d.job === 'miner') return sch.off ? free() : { mines: true, f: plan.floors - 1, x: 8, hidden: true };
  if (d.job === 'warrior') {
    if (d.post === 'mine') return sch.off ? free() : { mines: true, f: plan.floors - 1, x: 8, hidden: true };
    if (sch.off && !F().raid && !F().siege) return free();
    const i = ctx.gate++;
    return { f: -1, x: W() - 92 - i * 12, pose: 'idle', tool: 'axe', face: 1 };
  }
  if (d.job === 'merchant') { const i = ctx.stall++; return { f: -1, x: 104 + i * 12, pose: 'idle', tool: 'sack', face: -1 }; }
  void room;
  return free();
}

/** What each workshop's worker holds while working (the same work animation for all). */
export const TOOL_OF = { forge: 'hammer', smelter: 'shovel', brewery: 'paddle', farm: 'hoe', engraver: 'chisel', jeweler: 'chisel', grindstone: 'hammer' };

function placeCtx(g) {
  const seats = [], beds = [];
  for (const r of g.rooms) {
    const a = S.META.ROOMS[r.b.type];
    if (!a) continue;
    if (r.b.type === 'tavern') {
      (a.seats || []).forEach(([x], i) => seats.push({ f: r.f, x: r.x + x, pose: ['sitTalk', 'eat', 'drink', 'sitTalk'][i % 4] }));
      (a.bar || []).forEach(([x]) => seats.push({ f: r.f, x: r.x + x, pose: 'drink' }));
    }
    if (r.b.type === 'barracks' || r.b.type === 'warehouse') (a.seats || []).forEach(([x], i) => seats.push({ f: r.f, x: r.x + x, pose: i % 2 ? 'sitTalk' : 'sit' }));
    if (r.b.type === 'quarters') (a.beds || []).forEach(([x, y]) => beds.push({ f: r.f, x: r.x + x, y: r.y + y }));
  }
  return { seats, beds, gate: 0, stall: 0, hour: berlinHour() };
}

function nodeOf(g, f, x) {
  const c = Math.max(0, Math.min(plan.cols - 1, Math.floor(x / CELL)));
  if (f < 0 || walkable(g, c, f)) return { c, f };
  // nearest walkable cell on that floor
  for (let d = 1; d < plan.cols; d++) for (const s of [-1, 1]) if (walkable(g, c + s * d, f)) return { c: c + s * d, f };
  return { c: 0, f };
}

let lastPlan = 0;
function updateAgents(g, dt) {
  const f = F();
  const t = performance.now();
  const replan = t - lastPlan > 1500;
  if (replan) lastPlan = t;
  let ctx = null;
  const plan_ = () => ctx || (ctx = placeCtx(g));
  const alive = new Set();
  for (const d of f.dwarves) {
    alive.add(d.id);
    let a = agents.get(d.id);
    if (replan || !a) {
      const w = want(g, d, plan_());
      if (!a) {
        a = { id: d.id, x: w.x, y: w.feet || fy(w.f), f: w.f, path: [], want: w, face: w.face || 1, hidden: !!w.hidden, frameT: Math.random() * 10 };
        agents.set(d.id, a);
      } else if (!a.want || a.want.f !== w.f || Math.abs(a.want.x - w.x) > 2 || a.want.pose !== w.pose || a.want.hidden !== w.hidden) {
        a.want = w;
        const from = nodeOf(g, a.f, a.x), to = nodeOf(g, w.f, w.x);
        const p = a.hidden && !w.hidden && !w.mines ? null : path(g, from, to);
        if (a.hidden && !w.hidden) {
          // coming back from the mines or a trip: appear at the bottom of the shaft or the right edge
          if (d.busy) { /* stays hidden */ } else { a.x = 8; a.f = plan.floors - 1; a.y = fy(a.f); a.hidden = false; a.path = path(g, nodeOf(g, a.f, a.x), to) || []; }
        } else a.path = p || [];
        if (!p && !a.hidden) { a.x = w.x; a.f = w.f; a.y = w.feet || fy(w.f); a.path = []; }
        if (w.mines || w.hidden) a.leave = true; else a.leave = false;
      }
    }
    // move along the path
    let step = dt;
    while (a.path.length && step > 0) {
      const p = a.path[0];
      const sp = p.mode === 'ladder' ? 16 : p.mode === 'stairs' ? 18 : 24;
      const dx = p.x - a.x, dy = p.y - a.y, dist = Math.hypot(dx, dy);
      const can = sp * step;
      a.mode = p.mode;
      if (Math.abs(dx) > 0.5) a.face = dx > 0 ? 1 : -1;
      if (dist <= can) { a.x = p.x; a.y = p.y; a.f = p.f; a.path.shift(); step -= dist / sp; }
      else { a.x += dx / dist * can; a.y += dy / dist * can; step = 0; }
    }
    if (!a.path.length && a.want) {
      // last few pixels inside the cell to the exact spot
      const tx = a.want.x, ty = a.want.feet || fy(a.want.f);
      const dx = tx - a.x;
      if (Math.abs(dx) > 0.5) { a.x += Math.sign(dx) * Math.min(Math.abs(dx), 24 * dt); a.face = Math.sign(dx); a.mode = 'walk'; }
      else { a.x = tx; a.mode = null; if (a.want.face) a.face = a.want.face; }
      a.y = ty;
      if (a.leave && !a.mode) a.hidden = true;
    }
    a.frameT += dt;
  }
  for (const id of [...agents.keys()]) if (!alive.has(id)) agents.delete(id);
}

function agentSprite(d, a) {
  const moving = a.mode === 'walk' || a.mode === 'stairs';
  const climbing = a.mode === 'ladder';
  let pose = climbing ? 'climb' : moving ? 'walk' : (a.want && a.want.pose) || 'idle';
  const fps = { walk: 8, climb: 5, work: 5, talk: 3, sitTalk: 3, eat: 1.6, drink: 0.5, sleep: 0.7 }[pose] || 1.2;
  const n = S.FRAMES[pose] || 1;
  const fr = Math.floor(a.frameT * fps) % n;
  return S.dwarfSprite(d, pose, fr, a.want && !moving && !climbing ? a.want.tool : null);
}

// ------------------------------------------------------------------ drawing

function drawSky(ctx, t, view) {
  const s = sun();
  const sky = skyColors(s.elev);
  const w = W();
  const g = ctx.createLinearGradient(0, 0, 0, GRASS);
  g.addColorStop(0, sky.top); g.addColorStop(1, sky.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, -200, w, GRASS + 200);
  const day = daylight(s.elev);
  if (day < 0.6) {
    const r = S.rand(42);
    ctx.globalAlpha = 1 - day / 0.6;
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * (GRASS - 30)) - 10;
      if ((Math.floor(t * 1.5) + i) % 11) { ctx.fillStyle = i % 7 ? '#d8d6f0' : '#fff6d6'; ctx.fillRect(x, y, 1, 1); }
    }
    ctx.globalAlpha = 1;
  }
  // sun and moon on an arc across the sky, following the real sun over Essen
  const arcX = (ha) => w / 2 + (ha / 110) * (w / 2);
  const sy = GRASS - 14 - Math.max(-30, s.elev) * 1.6;
  if (s.elev > -4) {
    const x = arcX(s.hourAngle);
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(x, sy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd98e'; ctx.beginPath(); ctx.arc(x, sy, 6, 0, Math.PI * 2); ctx.fill();
  } else {
    const ha = s.hourAngle > 0 ? s.hourAngle - 180 : s.hourAngle + 180;
    const x = arcX(ha), y = 24 + Math.abs(ha) * 0.3;
    ctx.fillStyle = '#f4f0dc'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sky.top; ctx.beginPath(); ctx.arc(x + 3, y - 2, 5, 0, Math.PI * 2); ctx.fill();
  }
  // soft clouds in daylight
  ctx.globalAlpha = 0.25 + day * 0.6;
  for (let i = 0; i < 5; i++) {
    const x = ((t * (2 + i * 0.6)) + i * 150) % (w + 80) - 40, y = 10 + i * 9;
    ctx.fillStyle = day > 0.4 ? '#ffffff' : '#a8a6c8';
    ctx.beginPath(); ctx.ellipse(x, y, 16, 4, 0, 0, Math.PI * 2); ctx.ellipse(x + 8, y - 3, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // rolling hills: two soft layers
  const hill = (col, base, amp, seed) => {
    const r = S.rand(seed);
    ctx.fillStyle = col;
    let hgt = 10;
    for (let x = 0; x < w; x += 2) { hgt += (r() - 0.5) * 2.2 * amp; hgt = Math.max(4, Math.min(26, hgt)); ctx.fillRect(x, base - hgt, 2, GRASS - base + hgt); }
  };
  // parallax: far layers slide slower than the world when the camera pans
  const x0 = Math.floor(view.x) - 2, x1 = Math.ceil(view.x + view.w) + 2;
  const ridge = (u, seed, s) => Math.sin(u / (31 * s) + seed) * 0.5 + Math.sin(u / (13 * s) + seed * 2.3) * 0.3 + Math.sin(u / (5.3 * s) + seed * 4.1) * 0.12;
  const layer = (k, fn) => { const off = view.x * k; for (let x = x0 - (x0 & 1); x < x1; x += 2) fn(x, x - off); };
  // far mountains with snow caps, then a haze band, then wooded hills, then the near meadow
  const far = S.mix('#a8b6d4', '#2a2d58', 1 - day), farLit = S.mix('#c6d0e6', '#3a3e6e', 1 - day), snow = S.mix('#f4f6fb', '#6a6f9e', 1 - day);
  layer(0.8, (x, u) => {
    const hgt = Math.round(30 + ridge(u, 1.7, 1.4) * 22 + Math.abs(Math.sin(u / 9 + 0.6)) * 6);
    const peak = GRASS - 4 - hgt;
    ctx.fillStyle = far; ctx.fillRect(x, peak, 2, hgt + 4);
    const slope = ridge(u + 2, 1.7, 1.4) - ridge(u - 2, 1.7, 1.4);
    if (slope < 0) { ctx.fillStyle = farLit; ctx.fillRect(x, peak, 2, Math.min(10, hgt)); }   // sunny west faces
    if (hgt > 40) { ctx.fillStyle = snow; ctx.fillRect(x, peak, 2, Math.round((hgt - 40) * 0.6) + 1); }
  });
  const haze = ctx.createLinearGradient(0, GRASS - 40, 0, GRASS);
  haze.addColorStop(0, hexA(sky.bottom, 0)); haze.addColorStop(1, hexA(sky.bottom, 0.75));
  ctx.fillStyle = haze; ctx.fillRect(x0, GRASS - 40, x1 - x0, 40);
  const wood = S.mix('#7fa48c', '#26365a', 1 - day), pine = S.mix('#5f8a72', '#1f2c4c', 1 - day);
  layer(0.5, (x, u) => {
    const hgt = Math.round(12 + ridge(u, 4.2, 0.8) * 7);
    ctx.fillStyle = wood; ctx.fillRect(x, GRASS - 2 - hgt, 2, hgt + 2);
    const n = Math.floor(u / 6);
    if (S.hash('pine' + n) % 3 === 0 && ((u % 6) + 6) % 6 < 2) {
      const th = 6 + (S.hash('p' + n) % 5);
      ctx.fillStyle = pine;
      for (let j = 0; j < th; j++) { const hw = Math.floor(j / 2.2); ctx.fillRect(x + 1 - hw, GRASS - 2 - hgt - th + j, hw * 2 + 1, 1); }
    }
  });
  hill(S.mix('#5e8a6a', '#22304a', 1 - day), GRASS - 6, 1.4, 29);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawSurface(ctx, t) {
  const w = W(), f = F();
  // grass and soil
  ctx.fillStyle = '#5b8350'; ctx.fillRect(0, GRASS - 2, w, 3);
  ctx.fillStyle = '#86b06a'; ctx.fillRect(0, GRASS - 3, w, 1);
  ctx.fillStyle = '#65514c'; ctx.fillRect(0, GRASS + 1, w, SURF - GRASS - 1);
  ctx.fillStyle = '#7e6860'; ctx.fillRect(0, GRASS + 1, w, 1);
  const r = S.rand(5);
  for (let x = 4; x < w; x += 9 + Math.floor(r() * 8)) { ctx.fillStyle = r() < 0.5 ? '#86b06a' : '#b5d48c'; ctx.fillRect(x, GRASS - 4, 1, 2); }
  // path to the market
  ctx.fillStyle = '#b07a4e'; ctx.fillRect(40, GRASS - 1, w - 40, 2);
  // props
  S.draw(ctx, 'winch', 1, GRASS - 31);
  S.draw(ctx, 'signpost', 34, GRASS - 18);
  S.draw(ctx, 'tree_0', 52, GRASS - 40);
  S.draw(ctx, 'stall', 92, GRASS - 34);
  S.draw(ctx, 'tree_1', 150, GRASS - 40);
  S.draw(ctx, 'tent', 196, GRASS - 30);
  for (const x of [70, 182, 250, 330, 410]) S.draw(ctx, 'flowers', x, GRASS - 6);
  for (const x of [240, 300, 380]) S.draw(ctx, 'bush', x, GRASS - 10);
  S.draw(ctx, 'tree_0', 350, GRASS - 40);
  const wallX = w - 64;
  const walls = (f.buildings.find((b) => b.type === 'walls') || { level: 0 }).level;
  S.draw(ctx, walls ? 'stonewall' : 'palisade', wallX, GRASS - (walls ? 40 : 28));
  // caravans on the road
  const t0 = now();
  for (const c of f.caravans) {
    const out = c.state === 'outbound';
    const p = out ? (t0 - c.departAt) / (c.arriveAt - c.departAt) : 1 - (t0 - c.arriveAt) / (c.returnAt - c.arriveAt);
    const x = 140 + Math.max(0, Math.min(1, p)) * (wallX - 160);
    const spr = S.wagon(Math.floor(t * 4));
    if (out) S.draw(ctx, 'wagon_' + (Math.floor(t * 4) % 2), x, GRASS - 19); else S.draw(ctx, 'wagon_' + (Math.floor(t * 4) % 2), x, GRASS - 19, true);
    void spr;
  }
  if (f.raid) {
    const p = Math.max(0, Math.min(1, (t0 - f.raid.announcedAt) / (f.raid.arrivesAt - f.raid.announcedAt)));
    if (p > 0.5) for (let i = 0; i < 3; i++) S.draw(ctx, 'mon_goblin_scouts_' + (Math.floor(t * 3 + i) % 2), w - 8 - (p - 0.5) * 30 + i * 9, GRASS - 22, true);
  }
  if (f.siege) {
    for (let i = 0; i < 4; i++) S.draw(ctx, 'mon_goblin_scouts_' + (Math.floor(t * 3 + i) % 2), wallX - 64 + i * 12, GRASS - 22, true);
    S.draw(ctx, 'fire_place_' + (Math.floor(t * 6) % 4), wallX - 82, GRASS - 10);
  }
}

// ------------------------------------------------------------------ depth: the rock face and the shadows it casts
// The rock is the front plane; rooms, halls and the shaft are cut into it. Light comes from the top left, so the rock
// throws a soft shadow down and right into every opening, and the lower and right lips of each opening catch light.
// Both layers only change with the plan, so they are drawn once into canvases and cached.

let depth = { key: '', rock: null, shadow: null, lips: null };

function depthLayers(g) {
  const w = W(), h = H() - SURF;
  const key = [w, h, [...g.cells.keys()].sort().join(';'), g.stairs.map((s) => s.c + ',' + s.f).join(';')].join('|');
  if (depth.key === key) return depth;
  // rock: tiles, gentle strata, roots near the top, darker and cooler with depth
  const rock = S.mk(w, h), rc = rock.getContext('2d');
  for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) S.draw(rc, 'rock', x, y);
  const r = S.rand(77);
  for (let y = 0, i = 0; y < h; i++) {
    const bh = 20 + Math.floor(r() * 30);
    rc.fillStyle = i % 2 ? 'rgba(255,214,170,0.05)' : 'rgba(40,26,52,0.08)';
    rc.fillRect(0, y, w, bh);
    y += bh;
  }
  for (let i = 0; i < w / 34; i++) {           // roots from the soil
    let x = 6 + r() * (w - 12), y = 0;
    const len = 10 + r() * 26;
    rc.fillStyle = '#4a3530';
    for (let k = 0; k < len; k++) { rc.fillRect(Math.round(x), y, 1, 1); y++; x += (r() - 0.5) * 1.4; if (k > 4 && r() < 0.08) rc.fillRect(Math.round(x) + (r() < 0.5 ? -1 : 1), y, 1, 2); }
  }
  const fade = rc.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(20,12,30,0)'); fade.addColorStop(0.35, 'rgba(20,12,30,0.18)'); fade.addColorStop(1, 'rgba(14,10,30,0.5)');
  rc.fillStyle = fade; rc.fillRect(0, 0, w, h);
  const top = rc.createLinearGradient(0, 0, 0, 10);
  top.addColorStop(0, 'rgba(29,20,32,0.55)'); top.addColorStop(1, 'rgba(29,20,32,0)');
  rc.fillStyle = top; rc.fillRect(0, 0, w, 10);

  // where the rock is cut away
  const hole = S.mk(w, h), hc = hole.getContext('2d');
  for (let fl = 0; fl < plan.floors; fl++) { hc.fillStyle = '#000'; hc.fillRect(2, fl * RH, 28, RH); }
  for (const [k, v] of g.cells) {
    if (v.kind !== 'hall') continue;
    const [c, fl] = k.split(',').map(Number);
    S.draw(hc, 'hall_a', c * CELL, fl * RH);
  }
  for (const s of g.stairs) S.draw(hc, 'stairs', s.c * CELL, s.f * RH);
  for (const rm of g.rooms) S.draw(hc, 'room_' + rm.b.type, rm.x, rm.y - SURF);
  hc.globalCompositeOperation = 'destination-out';
  for (const [k, v] of g.cells) {
    if (v.kind !== 'hall') continue;
    const [c, fl] = k.split(',').map(Number);
    if (!walkable(g, c - 1, fl)) S.draw(hc, 'hall_cap_l', c * CELL, fl * RH);
    if (!walkable(g, c + 1, fl)) S.draw(hc, 'hall_cap_r', c * CELL + 10, fl * RH);
  }
  const solid = S.mk(w, h), sc = solid.getContext('2d');
  sc.fillRect(0, 0, w, h); sc.globalCompositeOperation = 'destination-out'; sc.drawImage(hole, 0, 0);

  // shadow: the rock shifted down-right in steps, kept only inside the openings
  const shadow = S.mk(w, h), shc = shadow.getContext('2d');
  [[1, 1, 0.5], [1, 2, 0.4], [2, 3, 0.3], [2, 4, 0.25], [3, 6, 0.2], [4, 8, 0.14]].forEach(([dx, dy, a]) => { shc.globalAlpha = a; shc.drawImage(solid, dx, dy); shc.fillRect(0, 0, w, dy); });
  shc.globalAlpha = 1;
  shc.globalCompositeOperation = 'destination-in'; shc.drawImage(hole, 0, 0);
  shc.globalCompositeOperation = 'source-in'; shc.fillStyle = '#150c1e'; shc.fillRect(0, 0, w, h);

  // lips: the rock just below and right of an opening is lit, just above and left is in shade
  const lips = S.mk(w, h), lc = lips.getContext('2d');
  const edge = (dx, dy, color) => {
    const e = S.mk(w, h), ec = e.getContext('2d');
    ec.drawImage(hole, dx, dy); ec.globalCompositeOperation = 'destination-in'; ec.drawImage(solid, 0, 0);
    ec.globalCompositeOperation = 'source-in'; ec.fillStyle = color; ec.fillRect(0, 0, w, h);
    lc.drawImage(e, 0, 0);
  };
  edge(0, 1, 'rgba(232,190,140,0.55)'); edge(1, 0, 'rgba(232,190,140,0.3)');
  edge(0, -1, 'rgba(18,10,24,0.6)'); edge(-1, 0, 'rgba(18,10,24,0.45)');
  edge(0, -2, 'rgba(18,10,24,0.25)'); edge(-2, 0, 'rgba(18,10,24,0.2)');
  depth = { key, rock, shadow, lips };
  return depth;
}

function drawUnderground(ctx, t, view, g) {
  const dl = depthLayers(g);
  ctx.drawImage(dl.rock, 0, SURF);
  ctx.drawImage(dl.lips, 0, SURF);
  for (let fl = 0; fl < plan.floors; fl++) S.draw(ctx, 'shaft', 0, ftop(fl));
  // hallways with rounded ends where they meet rock
  for (const [k, v] of g.cells) {
    if (v.kind !== 'hall') continue;
    const [c, fl] = k.split(',').map(Number);
    const variant = ['hall_a', 'hall_e', 'hall_a', 'hall_b', 'hall_a', 'hall_c', 'hall_e', 'hall_d'][S.hash(k) % 8];
    S.draw(ctx, variant, c * CELL, ftop(fl));
    if (!walkable(g, c - 1, fl)) S.draw(ctx, 'hall_cap_l', c * CELL, ftop(fl));
    if (!walkable(g, c + 1, fl)) S.draw(ctx, 'hall_cap_r', c * CELL + 10, ftop(fl));
  }
  for (const s of g.stairs) S.draw(ctx, 'stairs', s.c * CELL, ftop(s.f));
  for (const r of g.rooms) drawRoom(ctx, t, r);
  ctx.drawImage(dl.shadow, 0, SURF);
}

/** A room and everything that moves in it (fire, wheels, smoke). Also used by the workshop screen. */
export function drawRoom(ctx, t, r) {
  const b = r.b;
  S.draw(ctx, 'room_' + b.type, r.x, r.y);
  const a = S.META.ROOMS[b.type] || {};
  const f = F(), info = D().buildings[b.id] || {};
  const working = !f.siege && (b.job && !b.job.quenching || (byId.buildings[b.type].kind === 'continuous' && info.worker));
  const fr = Math.floor(t * 8) % 4;
  if (b.type === 'smelter' && (working || (G.heat && G.heat(b.id) > 2))) S.draw(ctx, 'fire_furnace_' + fr, r.x + a.fire[0], r.y + a.fire[1]);
  if (b.type === 'forge' && (working || (b.job && b.job.quenching))) S.draw(ctx, 'fire_hearth_' + fr, r.x + a.fire[0], r.y + a.fire[1] - 2);
  if (b.type === 'tavern') S.draw(ctx, 'fire_place_' + (Math.floor(t * 6) % 4), r.x + a.fire[0], r.y + a.fire[1] + 4);
  if (b.type === 'grindstone' && working) S.draw(ctx, 'wheel_spin_' + fr, r.x + a.wheel[0] - 10, r.y + a.wheel[1] - 10);
  // smoke, steam, sparks
  if (a.chimney && working && Math.random() < 0.25) particles.push({ x: r.x + a.chimney[0] + 2 + Math.random() * 4, y: r.y + 16, vx: (Math.random() - 0.5) * 3, vy: -6, life: 1.6, c: '#9a92a8' });
  if (b.type === 'forge' && working && Math.random() < 0.3) for (let k = 0; k < 3; k++) particles.push({ x: r.x + a.anvil[0], y: r.y + a.anvil[1] - 5, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 14, life: 0.45, c: Math.random() < 0.5 ? '#ffd98e' : '#fff6d6', g: 30 });
  if (b.job && b.job.quenching && Math.random() < 0.7) particles.push({ x: r.x + a.quench[0] - 3 + Math.random() * 6, y: r.y + 46, vx: (Math.random() - 0.5) * 3, vy: -7, life: 1.2, c: '#e8eef4' });
  if (b.type === 'brewery' && working && Math.random() < 0.4) particles.push({ x: r.x + a.steam[0] + Math.random() * 6, y: r.y + a.steam[1], vx: (Math.random() - 0.5) * 2, vy: -5, life: 1.4, c: '#e8eef4' });
  if (b.type === 'grindstone' && working && Math.random() < 0.5) particles.push({ x: r.x + a.wheel[0] + 9, y: r.y + a.wheel[1] - 2, vx: 10 + Math.random() * 14, vy: -6, life: 0.4, c: '#fff6d6', g: 30 });
  if (b.type === 'farm' && Math.random() < 0.05) particles.push({ x: r.x + 10 + Math.random() * (r.pw - 20), y: r.y + 50, vx: 0, vy: -3, life: 2, c: '#c6e3b8' });
  if (b.type === 'jeweler' && Math.random() < 0.06) particles.push({ x: r.x + 52 + Math.random() * 22, y: r.y + 24 + Math.random() * 26, vx: 0, vy: 0, life: 0.5, c: '#ffffff' });
}

function drawParticles(ctx, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 3) * dt;
    ctx.globalAlpha = Math.min(1, p.life * 1.4);
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  ctx.globalAlpha = 1;
  if (particles.length > 400) particles.splice(0, particles.length - 400);
}

// ------------------------------------------------------------------ the screen object

let prevT = 0, G_ = null;
const drawn = [];   // dwarf sprites drawn this frame, for hit tests

export const holdScreen = {
  camera: true,
  size: () => ({ w: W(), h: H() }),
  home(r) {
    // start looking at the top floors, zoomed so rooms read well
    const zoom = r.width < 560 ? 2 : 3;
    return { zoom, x: 0, y: SURF - 70 };
  },
  draw(ctx, t, view) {
    G_ = grid();
    const dt = Math.min(0.2, t - prevT); prevT = t;
    updateAgents(G_, dt);
    drawSky(ctx, t, view);
    drawSurface(ctx, t);
    drawUnderground(ctx, t, view, G_);
    drawn.length = 0;
    const f = F();
    const list = [...agents.values()].filter((a) => !a.hidden).sort((a, b) => a.y - b.y);
    for (const a of list) {
      const d = f.dwarves.find((x) => x.id === a.id);
      if (!d) continue;
      const spr = agentSprite(d, a);
      const p = S.placeDwarf(ctx, spr, a.x, a.y, a.face < 0);
      drawn.push({ id: a.id, sx: p.sx, sy: p.sy, spr: a.face < 0 ? flipped(spr) : spr, a });
    }
    drawParticles(ctx, dt);
  },
  ambient(t) {
    const day = daylight(sun().elev);
    return [
      { y0: -200, y1: SURF, color: '#0e1236', a: 0.62 * (1 - day) },
      { y0: SURF, y1: H(), color: '#140f20', a: 0.38 + 0.14 * (1 - day) },
    ];
  },
  lights(t) {
    if (!G_) return [];
    const out = [];
    const f = F();
    for (const r of G_.rooms) {
      const a = S.META.ROOMS[r.b.type] || {};
      const info = D().buildings[r.b.id] || {};
      const working = r.b.job || (byId.buildings[r.b.type].kind === 'continuous' && info.worker);
      for (const [x, y, rr, col] of a.lights || []) {
        const isFire = a.fire && Math.abs(x - a.fire[0] - a.fire[2] / 2) < 14 && Math.abs(y - a.fire[1]) < 14;
        if (isFire && !working && r.b.type !== 'tavern') { out.push({ x: r.x + x, y: r.y + y, r: rr * 0.45, color: col, power: 0.4 }); continue; }
        const heat = r.b.type === 'smelter' && G.heat ? G.heat(r.b.id) / 100 : 0;
        out.push({ x: r.x + x, y: r.y + y, r: rr * (1 + heat * 0.35), color: col, flicker: isFire ? 3 : 1, power: isFire ? 1.3 + heat : 0.8 });
      }
    }
    for (const [k, v] of G_.cells) {
      if (v.kind !== 'hall') continue;
      const [c, fl] = k.split(',').map(Number);
      if (['hall_a', 'hall_e', 'hall_a', 'hall_b', 'hall_a', 'hall_c', 'hall_e', 'hall_d'][S.hash(k) % 8] === 'hall_b') out.push({ x: c * CELL + 8, y: ftop(fl) + 14, r: 22, color: '#ffd98e', flicker: 1 });
    }
    for (let fl = 0; fl < plan.floors; fl++) out.push({ x: 16, y: ftop(fl) + 30, r: 16, color: '#ffd98e' });
    const day = daylight(sun().elev);
    if (day < 0.8) {
      out.push({ x: 104, y: GRASS - 26, r: 30, color: '#ffd98e', power: 0.8 });
      out.push({ x: 216, y: GRASS - 10, r: 26, color: '#ffb070', power: 0.7 });
      out.push({ x: 16, y: GRASS - 20, r: 26, color: '#ffd98e', power: 0.8 });
      if (f.siege) out.push({ x: W() - 136, y: GRASS - 6, r: 40, color: '#ff8a4a', flicker: 3, power: 1.4 });
    }
    // little lamps on miner helmets
    for (const dw of drawn) { const d = f.dwarves.find((x) => x.id === dw.id); if (d && S.look(d).hat === 2) out.push({ x: dw.sx + (dw.a.face > 0 ? 14 : 4), y: dw.sy + 5, r: 10, color: '#fff0c0' }); }
    return out;
  },
  hit(x, y) {
    if (G.build) return buildHit(x, y);
    for (let i = drawn.length - 1; i >= 0; i--) {
      const d = drawn[i];
      if (x >= d.sx && x < d.sx + d.spr.width && y >= d.sy && y < d.sy + d.spr.height && opaque(d.spr, x - d.sx, y - d.sy)) return { kind: 'dwarf', id: d.id, sprite: d.spr, sx: d.sx, sy: d.sy };
    }
    if (!G_) return null;
    for (const r of G_.rooms) if (x >= r.x && x < r.x + r.pw && y >= r.y && y < r.y + RH) return { kind: 'room', id: r.b.id, rect: [r.x, r.y, r.pw, RH], round: true };
    const w = W();
    if (y < SURF && y > GRASS - 40) {
      if (x >= 92 && x < 138) return { kind: 'tab', id: 'trade', rect: [92, GRASS - 34, 46, 34], round: true };
      if (x >= 196 && x < 236) return { kind: 'tab', id: 'explore', rect: [196, GRASS - 30, 40, 30], round: true };
      if (x >= w - 64) return { kind: 'tab', id: 'war', rect: [w - 64, GRASS - 40, 56, 40], round: true };
      if (x < 32) return { kind: 'tab', id: 'mines', rect: [1, GRASS - 31, 30, 30], round: true };
    }
    if (x < 32 && y >= SURF) return { kind: 'tab', id: 'mines', rect: [0, SURF, 32, H() - SURF] };
    return null;
  },
  overlay(ctx, t, hover, mouse) {
    if (!G_) return;
    const f = F(), d = D();
    const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy).length;
    for (const r of G_.rooms) {
      const name = byId.buildings[r.b.type].name.split(' ')[0].replace("'s", '');
      sign(ctx, name + (r.b.level > 1 ? ' ' + r.b.level : ''), r.x + r.pw / 2, r.y + 9, G.ws === r.b.id ? '#e3c06e' : '#fbf4e6');
      if (canRun(r.b, idle)) S.draw(ctx, 'arrow_' + (Math.floor(t * 3) % 2), r.x + r.pw / 2 - 5, r.y + 18);
      if (f.siege && byId.buildings[r.b.type].kind !== 'passive') { ctx.fillStyle = 'rgba(169,71,60,0.25)'; ctx.fillRect(r.x, r.y, r.pw, RH); }
    }
    for (const dw of drawn) if (dw.a.want && dw.a.want.sleep && !dw.a.mode) {
      const k = (t * 0.7 + dw.id * 0.3) % 1;
      ctx.globalAlpha = 1 - k; S.draw(ctx, 'zzz', dw.sx + 12 + k * 4, dw.sy - k * 10); ctx.globalAlpha = 1;
    }
    if (G.build) buildOverlay(ctx, t, mouse);
  },
  click(x, y, hit) { return G.build ? buildClick(x, y, hit) : false; },
  dragging() { return false; },
  cancel() { if (G.build) { G.build.held = null; if (G.onBuildChange) G.onBuildChange(); } },
};

const flipCache = new WeakMap();
function flipped(spr) {
  let f = flipCache.get(spr);
  if (!f) { f = S.mk(spr.width, spr.height); const c = f.getContext('2d'); c.translate(spr.width, 0); c.scale(-1, 1); c.drawImage(spr, 0, 0); flipCache.set(spr, f); }
  return f;
}

const alphaCache = new WeakMap();
function opaque(spr, x, y) {
  let d = alphaCache.get(spr);
  if (!d) { d = spr.getContext('2d').getImageData(0, 0, spr.width, spr.height).data; alphaCache.set(spr, d); }
  x = Math.floor(x); y = Math.floor(y);
  return x >= 0 && y >= 0 && x < spr.width && y < spr.height && d[(y * spr.width + x) * 4 + 3] > 0;
}

/** Green arrow: the workshop stands still but could run (materials, worker, or an idle dwarf there). */
export function canRun(b, idle) {
  const t = byId.buildings[b.type];
  if (t.kind === 'passive' || F().siege) return false;
  const info = D().buildings[b.id] || {};
  if (t.kind === 'continuous') return !info.worker && idle > 0;
  if (b.job) return false;
  const miss = info.missing || {};
  const ready = b.queue.some((e) => !Object.keys(miss[e.id] || {}).length);
  const inputs = hasInputs(b);
  if (!info.worker) return idle > 0 && (ready || inputs);
  return ready || (!b.queue.length && inputs);
}

function hasInputs(b) {
  const st = F().stock;
  const keys = Object.keys(st).filter((k) => st[k] > 0);
  switch (b.type) {
    case 'smelter': return stock('coal') > 0 && keys.some((k) => byId.ores[k] && st[k] >= 2);
    case 'forge': return stock('coal') > 0 && keys.some((k) => k.startsWith('bar:'));
    case 'grindstone': return keys.some((k) => /^item:(axe|pickaxe):/.test(k) && !k.split(':')[4].includes('s'));
    case 'engraver': return keys.some((k) => k.startsWith('item:') && !k.split(':')[4].includes('e') && !/^item:chain/.test(k));
    case 'jeweler': return stock('rough_gem') > 0 || (stock('cut_gem') > 0 && keys.some((k) => /^item:(ring|crown|goblet):/.test(k)));
    default: return false;
  }
}

// ------------------------------------------------------------------ build mode

function cellAt(x, y) {
  if (y < SURF) return null;
  return { c: Math.floor(x / CELL), f: Math.floor((y - SURF) / RH) };
}

function buildHit(x, y) {
  const cell = cellAt(x, y);
  if (!cell || cell.f >= plan.floors || cell.c < 0 || cell.c >= plan.cols) return null;
  const tool = G.build.tool;
  if (tool === 'move' && !G.build.held) {
    const r = G_ && G_.rooms.find((q) => q.f === cell.f && cell.c >= q.c && cell.c < q.c + q.w);
    return r ? { kind: 'room', id: r.b.id, rect: [r.x, r.y, r.pw, RH], round: true } : null;
  }
  return { kind: 'cell', c: cell.c, f: cell.f };
}

function fits(c, f, w, ignore) {
  if (c < plan.shaft || c + w > plan.cols || f < 0 || f >= plan.floors) return false;
  for (let x = c; x < c + w; x++) {
    const v = G_.cells.get(x + ',' + f);
    if (v && v.kind !== 'hall' && !(v.kind === 'room' && v.id === ignore)) return false;
  }
  return true;
}

function ghostFor(mouse) {
  if (!mouse || !G_) return null;
  const cell = cellAt(mouse.x, mouse.y);
  if (!cell || cell.f >= plan.floors) return null;
  const tool = G.build.tool;
  if (tool === 'move' && G.build.held) {
    const r = G_.rooms.find((q) => q.b.id === G.build.held);
    if (!r) return null;
    const c = Math.round(mouse.x / CELL - r.w / 2);
    return { c, f: cell.f, w: r.w, h: 1, ok: fits(c, cell.f, r.w, r.b.id), room: r };
  }
  if (tool === 'dig') return { c: cell.c, f: cell.f, w: 1, h: 1, ok: cell.c >= plan.shaft && !G_.cells.has(cell.c + ',' + cell.f) };
  if (tool === 'stairs') {
    let ok = cell.c >= plan.shaft && cell.c + 1 < plan.cols && cell.f + 1 < plan.floors;
    for (let dx = 0; dx < 2 && ok; dx++) for (let dy = 0; dy < 2 && ok; dy++) { const v = G_.cells.get((cell.c + dx) + ',' + (cell.f + dy)); if (v && v.kind !== 'hall') ok = false; }
    return { c: cell.c, f: cell.f, w: 2, h: 2, ok };
  }
  if (tool === 'fill') { const v = G_.cells.get(cell.c + ',' + cell.f); return { c: cell.c, f: cell.f, w: 1, h: 1, ok: !!v && (v.kind === 'hall' || v.kind === 'stair') }; }
  return null;
}

function buildOverlay(ctx, t, mouse) {
  // faint grid
  ctx.fillStyle = 'rgba(251,244,230,0.08)';
  for (let c = 0; c <= plan.cols; c++) ctx.fillRect(c * CELL, SURF, 1, plan.floors * RH);
  for (let f = 0; f <= plan.floors; f++) ctx.fillRect(0, SURF + f * RH, W(), 1);
  const g = ghostFor(mouse);
  if (g) {
    const x = g.c * CELL, y = ftop(g.f), w = g.w * CELL, h = g.h * RH;
    if (g.room) { ctx.globalAlpha = 0.55; S.draw(ctx, 'room_' + g.room.b.type, x, y); ctx.globalAlpha = 1; }
    ctx.fillStyle = g.ok ? 'rgba(144,224,140,0.28)' : 'rgba(217,112,74,0.3)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = g.ok ? '#9ee08e' : '#d9704a';
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  }
  if (G.build.held && G_) {
    const r = G_.rooms.find((q) => q.b.id === G.build.held);
    if (r) { ctx.fillStyle = 'rgba(227,192,110,0.25)'; ctx.fillRect(r.x, r.y, r.pw, RH); }
  }
}

function buildClick(x, y, hit) {
  const b = G.build;
  const cell = cellAt(x, y);
  if (!cell || cell.f >= plan.floors) return true;
  if (b.tool === 'move') {
    if (!b.held) { if (hit && hit.kind === 'room') { b.held = hit.id; if (G.onBuildChange) G.onBuildChange(); } return true; }
    const g = ghostFor({ x, y });
    if (g && g.ok) G.act({ type: 'moveRoom', building: b.held, col: g.c, floor: g.f });
    b.held = null;
    if (G.onBuildChange) G.onBuildChange();
    return true;
  }
  if (b.tool === 'dig') G.act({ type: 'dig', col: cell.c, floor: cell.f });
  if (b.tool === 'stairs') G.act({ type: 'stairs', col: cell.c, floor: cell.f });
  if (b.tool === 'fill') G.act({ type: 'fill', col: cell.c, floor: cell.f });
  return true;
}

/** World position of a room (for focusing the camera). */
export function roomCenter(id) {
  const g = G_ || grid();
  const r = g.rooms.find((q) => q.b.id === id);
  return r ? { x: r.x + r.pw / 2, y: r.y + RH / 2 } : null;
}

export { fullName, text };
