// The hold: surface, rock, mine shaft, hallways, stairwells and rooms where the player placed them,
// and the dwarves walking between them.
import { G, F, D, byId, now, stock, fullName } from './data.js';
import * as S from './sprites.js';
import { sun, daylight, skyColors, berlinHour } from './sun.js';
import { text, sign } from './pixfont.js';

// The hold is cut into a mountain from its left side. Left of the grid (x < 0) lies the valley with the
// market and the gate; the mountain face rises at x = -FACE, a short tunnel leads from the gate to the shaft.
// SURF is the top of the first floor; floors above ENTRY are above the valley floor, the rest below it.
export const CELL = 24, RH = 96, SURF = 220;
const WALK = 90;
export const ENTRY = 2;                          // the floor whose floor line is the valley's ground
const GROUND = SURF + ENTRY * RH + WALK;
const GRASS = GROUND;
export const VW = 720;                           // width of the valley
const VC = VW / CELL;
const FACE = 144;                                // the gate tunnel: from x = -FACE to the shaft
// the valley: where things stand (left x; they stand on the grass). Clicks, lights and dwarves use the same numbers.
const SURFACE = { wall: -620, tent: -510, stall: -430, sign: -330, winch: -290, gate: -FACE - 30, wallW: 86 };
const STALL_W = 72, TENT_W = 62;
/** Draw a sprite so its bottom row stands on the grass. */
function onGrass(ctx, name, x, flip) { const s = S.sprite(name); if (s) S.draw(ctx, name, x, GRASS - s.height + 1, flip); }

let plan = null;   // { cols, floors, shaft, rooms: {type: cells} }
const particles = [];

export function W() { return G.data.plan.cols * CELL; }
export function H() { return SURF + G.data.plan.floors * RH; }
const fy = (f) => (f < 0 ? GROUND : SURF + f * RH + WALK);      // feet line of a floor (-1: the valley)
const ftop = (f) => SURF + f * RH;

// ------------------------------------------------------------------ the plan as a grid

function grid() {
  plan = G.data.plan;
  const f = F(), L = f.layout || { rooms: {}, halls: [], wells: [], caves: {}, marks: [], digs: {} };
  const cells = new Map();    // "c,f" -> {kind, id?}
  const rooms = [];
  for (const [id, [c, fl]] of Object.entries(L.rooms)) {
    const b = f.buildings.find((x) => x.id === id);
    if (!b) continue;
    const w = (D().buildings[id] || {}).cells || S.roomWidth(b) / CELL;
    rooms.push({ b, c, f: fl, w, x: c * CELL, y: ftop(fl), pw: w * CELL });
    for (let x = c; x < c + w; x++) cells.set(x + ',' + fl, { kind: 'room', id });
  }
  for (const k of L.halls) cells.set(k, { kind: 'hall' });
  for (const [k, since] of Object.entries(L.caves || {})) cells.set(k, { kind: 'cave', since });
  const marks = new Map((L.marks || []).map((k) => [k, (L.digs || {})[k] || 0]));   // rock to dig: cell -> work done
  const critters = (f.threats || []).filter((th) => th.cell).map((th) => { const [c, fl] = th.cell.split(',').map(Number); return { th, c, f: fl }; });
  // stairwells: two cells wide, the way in is an arch in the middle of the back wall
  const wells = (L.wells || []).map((k) => { const [c, fl] = k.split(',').map(Number); return { c, f: fl, x: c * CELL + CELL }; });
  for (const w of wells) for (let dx = 0; dx < 2; dx++) cells.set((w.c + dx) + ',' + w.f, { kind: 'well', well: w });
  for (let fl = 0; fl < plan.floors; fl++) for (let c = 0; c < plan.shaft; c++) cells.set(c + ',' + fl, { kind: 'shaft' });
  return { cells, rooms, wells, marks, critters };
}

/** The rock band of a floor: every two floors the stone gets harder (Rules.rockBand). */
const band = (fl) => Math.max(0, Math.min(3, Math.floor(fl / 2)));

function walkable(g, c, fl) {
  if (fl === -1) return c >= -VC && c < 0;
  return g.cells.has(c + ',' + fl);
}

/** What a cell belongs to: walking from one to another through a side wall costs extra. */
function zone(g, c, fl) {
  if (fl < 0) return 'out';
  const v = g.cells.get(c + ',' + fl);
  return !v ? null : v.kind === 'room' ? 'room:' + v.id : 'open';
}

const SIDE_WALL = 10;   // dwarves would rather take a hallway than squeeze through the side of a room
const WELL_SPEED = 60;  // px per second on the hidden way behind the stairwell arches (walking is 34)

/** Seconds from one stairwell to another: the way behind the wall is as long as the distance between them. */
function wellTime(a, b) {
  return 0.6 + (Math.abs(a.x - b.x) + Math.abs(fy(a.f) - fy(b.f))) / WELL_SPEED;
}

/** Cheapest path over cells: walking, the shaft ladder, and the stairwells to every other floor. */
function path(g, from, to) {
  const key = (c, f) => c + ',' + f;
  const dist = new Map([[key(from.c, from.f), 0]]), prev = new Map();
  const open = [{ c: from.c, f: from.f, d: 0 }];
  const goal = key(to.c, to.f);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].d < open[bi].d) bi = i;
    const n = open.splice(bi, 1)[0], nk = key(n.c, n.f);
    if (n.d > (dist.get(nk) ?? Infinity)) continue;
    if (nk === goal) break;
    const next = [];
    for (const dc of [-1, 1]) if (walkable(g, n.c + dc, n.f)) {
      const za = zone(g, n.c, n.f), zb = zone(g, n.c + dc, n.f);
      next.push([n.c + dc, n.f, 'walk', 1 + (za !== zb && za !== 'out' ? SIDE_WALL : 0)]);
    }
    if (n.c < plan.shaft && n.f >= 0) {
      if (n.f + 1 < plan.floors) next.push([n.c, n.f + 1, 'ladder', 3]);
      if (n.f > 0) next.push([n.c, n.f - 1, 'ladder', 3]);
    }
    // the gate tunnel joins the valley to the shaft on the entry floor
    if (n.f === -1 && n.c === -1) next.push([0, ENTRY, 'walk', 1]);
    if (n.f === ENTRY && n.c === 0) next.push([-1, -1, 'walk', 1]);
    // into a stairwell, out of any stairwell on another floor; the cost is the time behind the wall, in walking cells
    const here = n.f >= 0 && g.cells.get(nk);
    if (here && here.kind === 'well') for (const e of g.wells)
      if (e.f !== here.well.f) next.push([e.c, e.f, 'well', (wellTime(here.well, e) + 0.5) / 0.7, here.well, e]);
    for (const [c, f, m, cost, d0, d1] of next) {
      const k = key(c, f), nd = n.d + cost;
      if (nd < (dist.get(k) ?? Infinity)) { dist.set(k, nd); prev.set(k, { c: n.c, f: n.f, m, d0, d1 }); open.push({ c, f, d: nd }); }
    }
  }
  if (!dist.has(goal)) return null;
  const steps = [];
  let cur = { c: to.c, f: to.f };
  while (prev.has(key(cur.c, cur.f))) { const p = prev.get(key(cur.c, cur.f)); steps.unshift({ ...p, to: cur }); cur = { c: p.c, f: p.f }; }
  const out = [];
  for (const s of steps) {
    const a = s, b = s.to;
    if (s.m === 'well') {
      // walk to the arch, go in, and come out of the other stairwell's arch after a while
      out.push({ x: s.d0.x, y: fy(a.f), f: a.f, mode: 'walk' });
      out.push({ x: s.d1.x, y: fy(b.f), f: b.f, mode: 'well', from: s.d0, to: s.d1, ms: wellTime(s.d0, s.d1) * 1000 });
      continue;
    }
    out.push({ x: b.c * CELL + CELL / 2, y: fy(b.f), f: b.f, mode: s.m });
  }
  return out;
}

const wellLit = new Map();   // stairwell -> time until its arch glows (someone just went in or came out)
const wellKey = (w) => w.c + ',' + w.f;
const FADE = 350;            // ms to step into (or out of) the dark of an arch

// ------------------------------------------------------------------ dwarves on the move

export const agents = new Map();   // dwarf id -> agent (exported for tests)
const CYCLE = 12, WORK = 9; // minutes: 9 at work, 3 off

function schedule(d) {
  const t = Date.now() / 60000 + (S.hash('cyc' + d.id) % CYCLE);
  return { k: Math.floor(t / CYCLE), off: (t % CYCLE) >= WORK };
}

/** Where a dwarf wants to be right now: {f, x, pose, hidden, tool, sleep}. */
function want(g, d, ctx) {
  if (d.busy) return { hidden: true, f: -1, x: -VW + 4 };
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
      const cells = [...g.cells.entries()].filter(([, v]) => (v.kind === 'hall' || v.kind === 'well' || v.kind === 'room') && !(v.kind === 'room' && !roomActive(v.id)));
      if (cells.length) { const [k] = cells[S.hash('wander' + d.id + sch.k) % cells.length]; const [c, fl] = k.split(',').map(Number); return { f: fl, x: c * CELL + CELL / 2, pose: chat }; }
    }
    return { f: -1, x: SURFACE.wall + 110 + (S.hash('stroll' + d.id) % (-FACE - 40 - SURFACE.wall - 110)), pose: chat };
  };
  if (d.job === 'worker') {
    const r = g.rooms.find((x) => x.b.id === d.building);
    if (r && !sch.off) {
      const info = D().buildings[r.b.id] || {};
      const i = (info.seats || info.workers || [info.worker]).indexOf(d.id);
      if (i >= 0) {
        const m = S.machineAt(r.b, i), a = m.a || {};
        const wx = a.worker ? r.x + m.x + a.worker[0] : r.x + r.pw / 2;
        const busy = jobOf(r.b, i) || byId.buildings[r.b.type].kind === 'continuous';
        return { f: r.f, x: wx, pose: busy && !F().siege ? 'work' : 'idle', tool: TOOL_OF[r.b.type], face: a.face || 1 };
      }
      // waiting for a free machine: stands by the door
      return { f: r.f, x: r.x + 10 + (S.hash('wait' + d.id) % 20), pose: 'idle', face: 1 };
    }
    return free();
  }
  if (d.job === 'miner' && d.dig && !sch.off) {
    // digging out marked rock: stand beside it in the open cell and swing the pick
    const [c, fl] = d.dig.split(',').map(Number);
    const left = walkable(g, c - 1, fl);
    return { f: fl, x: left ? c * CELL - 7 : (c + 1) * CELL + 7, pose: 'work', tool: 'pick', face: left ? 1 : -1, digging: d.dig };
  }
  if (d.job === 'miner') return sch.off ? free() : { mines: true, f: plan.floors - 1, x: 8, hidden: true };
  if (d.job === 'warrior') {
    if (d.post === 'mine') return sch.off ? free() : { mines: true, f: plan.floors - 1, x: 8, hidden: true };
    if (sch.off && !F().raid && !F().siege) return free();
    const i = ctx.gate++;
    return { f: -1, x: SURFACE.wall + SURFACE.wallW + 16 + i * 18, pose: 'idle', tool: 'axe', face: -1 };
  }
  if (d.job === 'merchant') { const i = ctx.stall++; return { f: -1, x: SURFACE.stall + STALL_W + 12 + i * 20, pose: 'idle', tool: 'sack', face: -1 }; }
  void room;
  return free();
}

/** The job running on machine i (machine 0 uses b.job). */
export function jobOf(b, i) { return i === 0 ? b.job : (b.more || [])[i - 1] || null; }

/** What each workshop's worker holds while working (the same work animation for all). */
export const TOOL_OF = { forge: 'hammer', smelter: 'shovel', brewery: 'paddle', farm: 'hoe', engraver: 'chisel', jeweler: 'chisel', grindstone: 'hammer', tailor: 'chisel' };

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
  if (f < 0) return { c: Math.max(-VC, Math.min(-1, Math.floor(x / CELL))), f };
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
    if ((replan || !a) && !(a && a.inWell)) {
      const w = want(g, d, plan_());
      if (!a) {
        a = { id: d.id, x: w.x, y: w.feet || fy(w.f), f: w.f, path: [], want: w, face: w.face || 1, hidden: !!w.hidden, frameT: Math.random() * 10 };
        agents.set(d.id, a);
      } else if (!a.want || a.want.f !== w.f || Math.abs(a.want.x - w.x) > 2 || a.want.pose !== w.pose || a.want.hidden !== w.hidden) {
        const before = a.want;
        a.want = w;
        const from = nodeOf(g, a.f, a.x), to = nodeOf(g, w.f, w.x);
        const p = a.hidden && !w.hidden && !w.mines ? null : path(g, from, to);
        if (a.hidden && !w.hidden) {
          // coming back from the mines (bottom of the shaft) or from a trip (down the valley from the left)
          if (d.busy) { /* stays hidden */ } else {
            if (before && before.mines) { a.x = CELL / 2; a.f = plan.floors - 1; } else { a.x = -VW + 4; a.f = -1; }
            a.y = fy(a.f); a.hidden = false; a.path = path(g, nodeOf(g, a.f, a.x), to) || [];
          }
        } else a.path = p || [];
        if (!p && !a.hidden) { a.x = w.x; a.f = w.f; a.y = w.feet || fy(w.f); a.path = []; }
        if (w.mines || w.hidden) a.leave = true; else a.leave = false;
      }
    }
    // move along the path
    let step = dt;
    while (a.path.length && step > 0) {
      const p = a.path[0];
      if (p.mode === 'well') {
        // behind the wall: gone for as long as the way to the other stairwell takes, then out of its arch
        const now_ = performance.now();
        if (!a.inWell) { a.inWell = now_ + p.ms; a.wellAt = now_; wellLit.set(wellKey(p.from), now_ + 900); }
        a.mode = 'well';
        if (now_ < a.inWell) { step = 0; break; }
        a.inWell = 0; a.emerge = now_; wellLit.set(wellKey(p.to), now_ + 900);
        a.x = p.x; a.y = p.y; a.f = p.f; a.path.shift(); a.mode = 'walk';
        continue;
      }
      const sp = p.mode === 'ladder' ? 22 : 34;
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
      if (Math.abs(dx) > 0.5) { a.x += Math.sign(dx) * Math.min(Math.abs(dx), 34 * dt); a.face = Math.sign(dx); a.mode = 'walk'; }
      else { a.x = tx; a.mode = null; if (a.want.face) a.face = a.want.face; }
      a.y = ty;
      if (a.leave && !a.mode) a.hidden = true;
    }
    a.frameT += dt;
  }
  for (const id of [...agents.keys()]) if (!alive.has(id)) agents.delete(id);
}

function agentSprite(d, a) {
  const moving = a.mode === 'walk' || a.mode === 'well';
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
  const X0 = -VW, w = W() + VW;              // the sky spans the valley and the mountain
  const g = ctx.createLinearGradient(0, 0, 0, GRASS);
  g.addColorStop(0, sky.top); g.addColorStop(1, sky.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(X0, -200, w, GRASS + 200);
  const day = daylight(s.elev);
  if (day < 0.6) {
    const r = S.rand(42);
    ctx.globalAlpha = 1 - day / 0.6;
    for (let i = 0; i < 90; i++) {
      const x = X0 + Math.floor(r() * w), y = Math.floor(r() * (GRASS - 30)) - 10;
      if ((Math.floor(t * 1.5) + i) % 11) { ctx.fillStyle = i % 7 ? '#d8d6f0' : '#fff6d6'; ctx.fillRect(x, y, 1, 1); }
    }
    ctx.globalAlpha = 1;
  }
  // sun and moon on an arc across the sky, following the real sun over Essen
  // the arc runs over the valley, where the mountain does not hide it
  const arcX = (ha) => (X0 - FACE) / 2 + (ha / 110) * (VW * 0.7);
  const sy = GRASS - 14 - Math.max(-30, s.elev) * 7;
  if (s.elev > -4) {
    const x = arcX(s.hourAngle);
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(x, sy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd98e'; ctx.beginPath(); ctx.arc(x, sy, 6, 0, Math.PI * 2); ctx.fill();
  } else {
    const ha = s.hourAngle > 0 ? s.hourAngle - 180 : s.hourAngle + 180;
    const x = arcX(ha), y = 90 + Math.abs(ha) * 2.4;
    ctx.fillStyle = '#f4f0dc'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sky.top; ctx.beginPath(); ctx.arc(x + 3, y - 2, 5, 0, Math.PI * 2); ctx.fill();
  }
  // soft clouds in daylight
  ctx.globalAlpha = 0.25 + day * 0.6;
  for (let i = 0; i < 5; i++) {
    const x = X0 + ((t * (2 + i * 0.6)) + i * 330) % (w + 80) - 40, y = 30 + i * 22;
    ctx.fillStyle = day > 0.4 ? '#ffffff' : '#a8a6c8';
    ctx.beginPath(); ctx.ellipse(x, y, 16, 4, 0, 0, Math.PI * 2); ctx.ellipse(x + 8, y - 3, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // rolling hills: two soft layers
  const hill = (col, base, amp, seed) => {
    const r = S.rand(seed);
    ctx.fillStyle = col;
    let hgt = 10;
    for (let x = X0; x < X0 + w; x += 2) { hgt += (r() - 0.5) * 2.2 * amp; hgt = Math.max(4, Math.min(26, hgt)); ctx.fillRect(x, base - hgt, 2, GRASS - base + hgt); }
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

// ------------------------------------------------------------------ strangers in the valley

// The merchant at the stall and travellers on the road. Not dwarves of the hold: their looks are fixed here.
const NPCS = [
  { id: 'merchant', body: 6, skin: '#e2b08a', hair: '#c4622d', eye: '#3f8a56', hairStyle: 'bun', nose: 2, tall: true,
    wear: { top: { look: 'dress', color: '#7d5a8a' }, apron: { color: '#e7dbc5' }, hat: { look: 'bandana', color: '#d9704a' }, feet: { color: '#4f3a37' } } },
  { id: 'pilgrim', body: 2, skin: '#f0c8a0', hair: '#9a9a9a', eye: '#7d8ba0', hairStyle: 'short', beard: 'long', tall: true, tool: 'sack',
    wear: { top: { look: 'linen', color: '#8a7a5a' }, legs: { look: 'plain', color: '#4b3f4f' }, hat: { look: 'hood', color: '#5e6e4a' }, feet: { color: '#3a2a26' } } },
  { id: 'bard', body: 7, skin: '#d9a77c', hair: '#e0b04a', eye: '#7a4a2a', hairStyle: 'long', nose: 1, tall: true,
    wear: { top: { look: 'embroid', color: '#466e98' }, legs: { look: 'plain', color: '#653f27' }, hat: { look: 'pointy', color: '#a9473c' }, feet: { color: '#4f3a37' } } },
  { id: 'peddler', body: 1, skin: '#d9a77c', hair: '#7a3b1e', eye: '#5b7fc0', hairStyle: 'short', beard: 'chops', tool: 'sack',
    wear: { top: { look: 'vest', color: '#5e8f73' }, legs: { look: 'patched', color: '#6e5246' }, hat: { look: 'bandana', color: '#3f6659' }, feet: { color: '#3a2a26' } } },
];

/** Where the strangers are now: the merchant behind the stall by day, travellers walking the road and resting. */
function drawStrangers(ctx, t, which) {
  const day = daylight(sun().elev) > 0.3;
  const placed = [];
  if (which === 'stall') {   // by day the merchant stands at the side of her stall
    if (day) placed.push({ n: NPCS[0], x: SURFACE.stall - 4, pose: Math.floor(t / 3) % 4 === 0 ? 'talk' : 'idle', face: 1 });
  }
  // travellers: a slow walk along the road, a rest by the signpost, then back; each on its own clock
  const road0 = -VW + 10, road1 = SURFACE.gate - 20;
  NPCS.slice(1).forEach((n, i) => {
    if (which === 'stall') return;
    const period = 140 + i * 37, k = ((t + i * 61) % period) / period;
    if (!day && i > 0) return;               // at night only the pilgrim is out
    let x, pose = 'walk', face = 1;
    if (k < 0.4) x = road0 + (road1 - road0) * (k / 0.4);
    else if (k < 0.55) { x = road1; pose = 'idle'; face = -1; }
    else if (k < 0.95) { x = road1 - (road1 - road0) * ((k - 0.55) / 0.4); face = -1; }
    else { x = road0; pose = 'idle'; }
    placed.push({ n, x: Math.round(x + i * 14), pose, face });
  });
  for (const p of placed) {
    const spr = S.npcSprite(p.n, p.pose, Math.floor(t * (p.pose === 'walk' ? 6 : 2)));
    S.placeDwarf(ctx, spr, p.x, GRASS, p.face < 0);
  }
}

// ------------------------------------------------------------------ the mountain

const FACE_TOP = GROUND - 116;   // the cliff over the gate

/** Height of the mountain's surface at x (y of its top edge); Infinity where there is no mountain (the valley). */
export function mtop(x) {
  if (x < -FACE - 6) return Infinity;
  if (x < 0) {
    // a cliff with the gate, then a rough slope up to the shoulder over the first floor
    const k = Math.max(0, (x + FACE) / FACE);
    return Math.round(FACE_TOP - (FACE_TOP - (SURF - 40)) * Math.pow(k, 0.75) + Math.sin(x / 6) * 2 + (x < -FACE + 4 ? 0 : Math.sin(x / 17) * 4));
  }
  const h = 40 + 100 * (1 - Math.exp(-x / 180)) + 42 * Math.max(0, Math.sin(x / 170 - 0.6)) + 6 * Math.sin(x / 23) + 3 * Math.sin(x / 9);
  return Math.round(SURF - h);
}

/** The valley: grass, the path, the market, the gate wall, caravans and raiders. */
function drawSurface(ctx, t) {
  const f = F(), x0 = -VW, x1 = -FACE;
  ctx.fillStyle = '#5b8350'; ctx.fillRect(x0, GRASS - 2, x1 - x0, 3);
  ctx.fillStyle = '#86b06a'; ctx.fillRect(x0, GRASS - 3, x1 - x0, 1);
  const r = S.rand(5);
  for (let x = x0 + 4; x < x1; x += 9 + Math.floor(r() * 8)) { ctx.fillStyle = r() < 0.5 ? '#86b06a' : '#b5d48c'; ctx.fillRect(x, GRASS - 4, 1, 2); }
  ctx.fillStyle = '#b07a4e'; ctx.fillRect(x0, GRASS - 1, x1 - x0 + 10, 2);       // the road into the mountain
  onGrass(ctx, 'tree_1', -700);
  onGrass(ctx, 'tent', SURFACE.tent);
  onGrass(ctx, 'stall', SURFACE.stall);
  drawStrangers(ctx, t, 'stall');
  onGrass(ctx, 'tree_0', -350);
  onGrass(ctx, 'signpost', SURFACE.sign);
  onGrass(ctx, 'winch', SURFACE.winch);
  for (const x of [-560, -456, -310, -236, -196]) onGrass(ctx, 'flowers', x);
  for (const x of [-660, -250]) onGrass(ctx, 'bush', x);
  onGrass(ctx, 'tree_0', -228, true);
  const walls = (f.buildings.find((b) => b.type === 'walls') || { level: 0 }).level;
  onGrass(ctx, walls ? 'stonewall' : 'palisade', SURFACE.wall);
  // caravans on the road, out to the left
  const t0 = now();
  for (const c of f.caravans) {
    const out = c.state === 'outbound';
    const p = out ? (t0 - c.departAt) / (c.arriveAt - c.departAt) : 1 - (t0 - c.arriveAt) / (c.returnAt - c.arriveAt);
    const x = SURFACE.winch - 60 - Math.max(0, Math.min(1, p)) * (SURFACE.winch - 60 - SURFACE.wall + 40);
    onGrass(ctx, 'wagon_' + (Math.floor(t * 4) % 2), x, out);
  }
  if (f.raid) {
    const p = Math.max(0, Math.min(1, (t0 - f.raid.announcedAt) / (f.raid.arrivesAt - f.raid.announcedAt)));
    if (p > 0.5) for (let i = 0; i < 3; i++) onGrass(ctx, 'mon_goblin_scouts_' + (Math.floor(t * 3 + i) % 2), -VW - 6 + (p - 0.5) * 60 + i * 14);
  }
  if (f.siege) {
    for (let i = 0; i < 4; i++) onGrass(ctx, 'mon_goblin_scouts_' + (Math.floor(t * 3 + i) % 2), -VW + 4 + i * 18);
    onGrass(ctx, 'fire_place_' + (Math.floor(t * 6) % 4), SURFACE.wall - 30);
  }
}

// ------------------------------------------------------------------ depth: the rock face and the shadows it casts
// The mountain is the front plane; rooms, halls, the shaft and the gate tunnel are cut into it. Light comes from the
// top left, so the rock throws a soft shadow down and right into every opening, and the lower and right lips of each
// opening catch light. The layers only change with the plan, so they are drawn once into canvases and cached.
// They start at x = -VW (the canvases are VW wider than the grid).

let depth = { key: '', rock: null, shadow: null, lips: null };

function depthLayers(g) {
  const w = W() + VW, h = H();
  const key = [w, h, [...g.cells.keys()].sort().join(';'), g.wells.map(wellKey).join(';')].join('|');
  if (depth.key === key) return depth;
  // where there is rock: the mountain, and everything under the valley's soil
  const shape = S.mk(w, h), shp = shape.getContext('2d');
  shp.fillStyle = '#000';
  for (let x = 0; x < w; x++) { const y = mtop(x - VW); if (y < h) shp.fillRect(x, y, 1, h - y); }
  shp.fillRect(0, GROUND + 1, w, h - GROUND - 1);

  // rock: tiles in a few variants, gentle strata, darker and cooler with depth
  const rock = S.mk(w, h), rc = rock.getContext('2d');
  // each band of stone fills its own two floors (the top band also everything above the hold)
  for (let bd = 0; bd < 4; bd++) {
    const y0 = bd === 0 ? 0 : ftop(bd * 2), y1 = bd === 3 ? h : ftop(bd * 2 + 2);
    rc.save(); rc.beginPath(); rc.rect(0, y0, w, y1 - y0); rc.clip();
    for (let y = y0 - ((y0 - SURF) % 64 + 64) % 64; y < y1; y += 64) for (let x = 0; x < w; x += 64) S.draw(rc, 'stone_' + bd + '_' + (S.hash('rock' + x + ',' + y) % 3), x, y);
    rc.restore();
  }
  const r = S.rand(77);
  const fade = rc.createLinearGradient(0, GROUND, 0, h);
  fade.addColorStop(0, 'rgba(20,12,30,0)'); fade.addColorStop(1, 'rgba(14,10,30,0.45)');
  rc.fillStyle = fade; rc.fillRect(0, GROUND, w, h - GROUND);
  // the valley's soil and roots under the grass
  rc.fillStyle = '#65514c'; rc.fillRect(0, GROUND + 1, VW - FACE, 11); rc.fillStyle = '#7e6860'; rc.fillRect(0, GROUND + 1, VW - FACE, 1);
  for (let i = 0; i < (VW - FACE) / 30; i++) {
    let x = 6 + r() * (VW - FACE - 12), y = GROUND + 2;
    rc.fillStyle = '#4a3530';
    for (let k = 0; k < 8 + r() * 18; k++) { rc.fillRect(Math.round(x), y, 1, 1); y++; x += (r() - 0.5) * 1.4; }
  }
  // the mountain's skin: a lit rim, grass on the gentle parts, snow on the peaks, a few pines
  const rim = (x, y, col, n = 1) => { rc.fillStyle = col; rc.fillRect(x, y, 1, n); };
  for (let x = 0; x < w; x++) {
    const wx = x - VW, y = mtop(wx);
    if (!isFinite(y)) continue;
    const slope = Math.abs(mtop(wx + 2) - mtop(wx - 2)) / 4;
    rim(x, y, '#a6abbe', 2); rim(x, y + 2, 'rgba(29,20,32,0.25)', 3);
    if (y < SURF - 160) rim(x, y, '#f4f6fb', 3 + Math.round((SURF - 160 - y) / 3));
    else if (slope < 1.2) { rim(x, y - 1, '#5b8350', 3); rim(x, y - 1, '#86b06a', 1); }
    if (slope < 0.8 && y > SURF - 150 && S.hash('pine' + Math.floor(wx / 9)) % 5 === 0 && ((wx % 9) + 9) % 9 === 0) {
      const th = 9 + S.hash('ph' + wx) % 7;
      for (let j = 0; j < th; j++) { const hw = Math.floor(j / 2.4); rc.fillStyle = j % 3 ? '#3c5a3a' : '#5b8350'; rc.fillRect(x - hw, y - th + j, hw * 2 + 1, 1); }
      rc.fillStyle = '#6e5246'; rc.fillRect(x, y - 1, 1, 2);
    }
  }
  rc.globalCompositeOperation = 'destination-in'; rc.drawImage(shape, 0, 0); rc.globalCompositeOperation = 'source-over';

  // where the rock is cut away
  const hole = S.mk(w, h), hc = hole.getContext('2d');
  hc.fillStyle = '#000';
  for (let fl = 0; fl < plan.floors; fl++) hc.fillRect(VW + (fl === ENTRY ? 0 : 3), ftop(fl), plan.shaft * CELL - (fl === ENTRY ? 3 : 6), RH);
  for (let x = -FACE; x < 0; x += CELL) S.draw(hc, 'hall_a', VW + x, ftop(ENTRY));
  for (const [k, v] of g.cells) {
    if (v.kind !== 'hall' && v.kind !== 'cave') continue;
    const [c, fl] = k.split(',').map(Number);
    S.draw(hc, v.kind === 'hall' ? 'hall_a' : caveSprite(k, fl), VW + c * CELL, ftop(fl));
  }
  for (const s of g.wells) S.draw(hc, 'well', VW + s.c * CELL, ftop(s.f));
  for (const rm of g.rooms) hc.drawImage(S.roomImage(rm.b), VW + rm.x, rm.y);
  hc.globalCompositeOperation = 'destination-out';
  for (const [k, v] of g.cells) {
    if (v.kind !== 'hall' && v.kind !== 'cave') continue;
    const [c, fl] = k.split(',').map(Number);
    if (!walkable(g, c - 1, fl)) S.draw(hc, 'cap_l_0', VW + c * CELL, ftop(fl));
    if (!walkable(g, c + 1, fl)) S.draw(hc, 'cap_r_0', VW + c * CELL + CELL - 8, ftop(fl));
  }
  for (const s of g.wells) {
    if (!walkable(g, s.c - 1, s.f)) S.draw(hc, 'cap_l_0', VW + s.c * CELL, ftop(s.f));
    if (!walkable(g, s.c + 2, s.f)) S.draw(hc, 'cap_r_0', VW + s.c * CELL + 2 * CELL - 8, ftop(s.f));
  }
  const solid = S.mk(w, h), sc = solid.getContext('2d');
  sc.drawImage(shape, 0, 0); sc.globalCompositeOperation = 'destination-out'; sc.drawImage(hole, 0, 0);

  // shadow: the rock shifted down-right in steps, kept only inside the openings
  const shadow = S.mk(w, h), shc = shadow.getContext('2d');
  [[1, 1, 0.5], [1, 2, 0.4], [2, 3, 0.3], [2, 4, 0.25], [3, 6, 0.2], [4, 8, 0.14]].forEach(([dx, dy, a]) => { shc.globalAlpha = a; shc.drawImage(solid, dx, dy); });
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

/** A dug-out cell: rough walls in the stone of its depth. */
function caveSprite(k, fl) { return 'cave_' + band(fl) + '_' + (S.hash(k) % 2); }

/** How overgrown an empty cave is: 0 fresh, 1 moss, 2 mushrooms and roots, 3 a wild cave. */
function overgrowth(since) {
  const hrs = (now() - since) / 3600, steps = (D().dig || {}).overgrowHours || [2, 8, 24];
  let s = 0;
  for (const h of steps) if (hrs >= h) s++;
  return s;
}

/** A room that stands still because no hallway, stairwell or shaft is beside it. */
export function roomActive(id) { const i = D().buildings[id]; return !i || i.active !== false; }

function drawUnderground(ctx, t, view, g) {
  const dl = depthLayers(g);
  ctx.drawImage(dl.rock, -VW, 0);
  ctx.drawImage(dl.lips, -VW, 0);
  for (let fl = 0; fl < plan.floors; fl++) S.draw(ctx, 'shaft', 0, ftop(fl));
  // the gate tunnel from the valley to the shaft
  for (let x = -FACE, i = 0; x < 0; x += CELL, i++) S.draw(ctx, ['hall_e', 'hall_a', 'hall_b', 'hall_a', 'hall_d', 'hall_a'][i % 6], x, ftop(ENTRY));
  // hallways with rounded ends where they meet rock
  for (const [k, v] of g.cells) {
    if (v.kind !== 'hall' && v.kind !== 'cave') continue;
    const [c, fl] = k.split(',').map(Number);
    if (v.kind === 'cave') {
      S.draw(ctx, caveSprite(k, fl), c * CELL, ftop(fl));
      const st = overgrowth(v.since);
      if (st) S.draw(ctx, 'grow_' + st + '_' + (S.hash('g' + k) % 2), c * CELL, ftop(fl));
    } else S.draw(ctx, ['hall_a', 'hall_e', 'hall_a', 'hall_b', 'hall_a', 'hall_c', 'hall_e', 'hall_d'][S.hash(k) % 8], c * CELL, ftop(fl));
    if (!walkable(g, c - 1, fl)) S.draw(ctx, 'cap_l_' + band(fl), c * CELL, ftop(fl));
    if (!walkable(g, c + 1, fl)) S.draw(ctx, 'cap_r_' + band(fl), c * CELL + CELL - 8, ftop(fl));
  }
  const nowMs = performance.now();
  for (const s of g.wells) {
    S.draw(ctx, (wellLit.get(wellKey(s)) || 0) > nowMs ? 'well_lit' : 'well', s.c * CELL, ftop(s.f));
    if (!walkable(g, s.c - 1, s.f)) S.draw(ctx, 'cap_l_' + band(s.f), s.c * CELL, ftop(s.f));
    if (!walkable(g, s.c + 2, s.f)) S.draw(ctx, 'cap_r_' + band(s.f), s.c * CELL + 2 * CELL - 8, ftop(s.f));
  }
  for (const r of g.rooms) drawRoom(ctx, t, r);
  ctx.drawImage(dl.shadow, -VW, 0);
  drawMarks(ctx, t, g);
  drawCritters(ctx, t, g);
  S.draw(ctx, 'gate', SURFACE.gate + 6, GROUND - 71);
}

/** Rock marked for digging: a chalk outline, cracks that spread as the miner works, and how far along it is. */
function drawMarks(ctx, t, g) {
  const secs = (D().dig || {}).seconds || [];
  const order = [...g.marks.keys()];
  for (const [k, work] of g.marks) {
    const [c, fl] = k.split(',').map(Number);
    const x = c * CELL, y = ftop(fl), p = Math.min(1, work / (secs[fl] || 300));
    // a dashed chalk outline around the marked stretch (no lines between marked neighbours), marching slowly
    ctx.fillStyle = 'rgba(251,244,230,0.75)';
    const off = Math.floor(t * 6) % 6;
    const dash = (x0, y0, len, horiz) => { for (let i = -off; i < len; i += 6) { const a = Math.max(0, i), b = Math.min(len, i + 3); if (b > a) horiz ? ctx.fillRect(x0 + a, y0, b - a, 1) : ctx.fillRect(x0, y0 + a, 1, b - a); } };
    dash(x, y + 4, CELL, true); dash(x, y + RH - 5, CELL, true);
    if (!g.marks.has((c - 1) + ',' + fl)) dash(x + 1, y + 4, RH - 8, false);
    if (!g.marks.has((c + 1) + ',' + fl)) dash(x + CELL - 2, y + 4, RH - 8, false);
    if (p > 0) {
      S.draw(ctx, 'dig_crack_' + Math.min(2, Math.floor(p * 3)), x, y);
      ctx.fillStyle = 'rgba(20,14,30,0.7)'; ctx.fillRect(x + 3, y + 10, CELL - 6, 3);
      ctx.fillStyle = '#e3c06e'; ctx.fillRect(x + 4, y + 11, Math.round((CELL - 8) * p), 1);
    } else text(ctx, String(order.indexOf(k) + 1), x + CELL / 2 - 2, y + 44, 'rgba(251,244,230,0.8)');
  }
}

/** Critters living in overgrown caves: they scuttle back and forth in their cave. */
const critterHits = [];
function drawCritters(ctx, t, g) {
  critterHits.length = 0;
  for (const cr of g.critters) {
    // the stretch of cave it lives in
    let a = cr.c, b = cr.c;
    while (g.cells.get((a - 1) + ',' + cr.f)?.kind === 'cave') a--;
    while (g.cells.get((b + 1) + ',' + cr.f)?.kind === 'cave') b++;
    const span = (b - a + 1) * CELL - 24, ph = t * 0.35 + cr.th.id;
    const k = (Math.sin(ph) + 1) / 2, face = Math.cos(ph) > 0 ? 1 : -1;
    const spr = S.monster(cr.th.monster, Math.floor(t * 5));
    if (!spr) continue;
    const sx = Math.round(a * CELL + 12 + k * span - spr.width / 2), sy = fy(cr.f) - spr.height + 1;
    S.draw(ctx, `mon_${cr.th.monster}_${Math.floor(t * 5) % 2}`, sx, sy, face < 0);
    critterHits.push({ x: sx, y: sy, w: spr.width, h: spr.height });
  }
}

/** A room and everything that moves in it (fire, wheels, smoke). Also used by the workshop screen. */
export function drawRoom(ctx, t, r) {
  const b = r.b;
  ctx.drawImage(S.roomImage(b), r.x, r.y);
  const f = F(), info = D().buildings[b.id] || {};
  const continuous = byId.buildings[b.type].kind === 'continuous';
  const workers = info.seats || info.workers || (info.worker ? [info.worker] : []);
  const fr = Math.floor(t * 8) % 4;
  const n = S.META.BAYS[b.type] ? Math.max(1, b.machines || 1) : 1;
  for (let i = 0; i < n; i++) {
    const m = S.machineAt(b, i), a = m.a || {}, x = r.x + m.x, job = jobOf(b, i);
    const working = !f.siege && (job && !job.quenching || (continuous && workers[i] != null));
    if (b.type === 'smelter' && (working || (G.heat && G.heat(b.id) > 2 && (i === 0 || job)))) S.draw(ctx, 'fire_furnace_' + ((fr + i) % 4), x + a.fire[0], r.y + a.fire[1]);
    if (b.type === 'forge' && (working || (job && job.quenching))) S.draw(ctx, 'fire_hearth_' + ((fr + i) % 4), x + a.fire[0], r.y + a.fire[1] - 2);
    if (b.type === 'grindstone' && working) S.draw(ctx, 'wheel_spin_' + fr, x + a.wheel[0] - 15, r.y + a.wheel[1] - 15);
    // smoke, steam, sparks
    if (a.chimney && working && Math.random() < 0.25) particles.push({ x: x + a.chimney[0] - 3 + Math.random() * 6, y: r.y + 22, vx: (Math.random() - 0.5) * 3, vy: -6, life: 1.6, c: '#9a92a8' });
    if (b.type === 'forge' && working && Math.random() < 0.3) for (let k = 0; k < 3; k++) particles.push({ x: x + a.anvil[0], y: r.y + a.anvil[1] - 5, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 14, life: 0.45, c: Math.random() < 0.5 ? '#ffd98e' : '#fff6d6', g: 30 });
    const q = a.quench || a.anvil;
    if (job && job.quenching && q && Math.random() < 0.7) particles.push({ x: x + q[0] - 3 + Math.random() * 6, y: r.y + 72, vx: (Math.random() - 0.5) * 3, vy: -7, life: 1.2, c: '#e8eef4' });
    if (b.type === 'brewery' && working && Math.random() < 0.4) particles.push({ x: x + a.steam[0] + Math.random() * 6, y: r.y + a.steam[1], vx: (Math.random() - 0.5) * 2, vy: -5, life: 1.4, c: '#e8eef4' });
    if (b.type === 'grindstone' && working && Math.random() < 0.5) particles.push({ x: x + a.wheel[0] + 13, y: r.y + a.wheel[1] - 2, vx: 10 + Math.random() * 14, vy: -6, life: 0.4, c: '#fff6d6', g: 30 });
  }
  const a = S.META.ROOMS[b.type] || {};
  if (b.type === 'tavern') S.draw(ctx, 'fire_place_' + (Math.floor(t * 6) % 4), r.x + a.fire[0], r.y + a.fire[1] + 4);
  if (b.type === 'farm' && Math.random() < 0.05) particles.push({ x: r.x + 10 + Math.random() * (r.pw - 20), y: r.y + 80, vx: 0, vy: -3, life: 2, c: '#c6e3b8' });
  if (b.type === 'jeweler' && Math.random() < 0.06) particles.push({ x: r.x + 76 + Math.random() * 32, y: r.y + 32 + Math.random() * 50, vx: 0, vy: 0, life: 0.5, c: '#ffffff' });
}

/** Lights of a room: every machine's own, plus the extra lamps of its tier. */
export function roomLights(r) {
  const b = r.b, out = [];
  const info = D().buildings[b.id] || {};
  const continuous = byId.buildings[b.type].kind === 'continuous';
  const workers = info.seats || info.workers || (info.worker ? [info.worker] : []);
  const heat = b.type === 'smelter' && G.heat ? G.heat(b.id) / 100 : 0;
  const n = S.META.BAYS[b.type] ? Math.max(1, b.machines || 1) : 1;
  for (let i = 0; i < n; i++) {
    const m = S.machineAt(b, i), a = m.a || {};
    const working = jobOf(b, i) || (continuous && workers[i] != null);
    for (const [x, y, rr, col] of a.lights || []) {
      const isFire = a.fire && Math.abs(x - a.fire[0] - a.fire[2] / 2) < 14 && Math.abs(y - a.fire[1]) < 14;
      if (isFire && !working && b.type !== 'tavern') { out.push({ x: r.x + m.x + x, y: r.y + y, r: rr * 0.45, color: col, power: 0.4 }); continue; }
      out.push({ x: r.x + m.x + x, y: r.y + y, r: rr * (1 + (isFire ? heat : 0) * 0.35), color: col, flicker: isFire ? 3 : 1, power: isFire ? 1.3 + heat : 0.8 });
    }
  }
  const tier = (S.META.TIER_LIGHTS || {})[b.type] || {};
  const T = S.roomTier(b);
  for (const [x, y, rr, col] of tier[T] || (T === 3 ? tier[2] : null) || []) out.push({ x: r.x + x, y: r.y + y, r: rr, color: col, flicker: 1, power: 0.7 });
  if (T === 3) {   // the crystal lamps of the king's hall (positions as in rooms.px.js, royalTouches and bay)
    const v = S.roomVariant(b), base = (S.META.ROOMS[b.type].w - 1) * CELL;
    for (let x = 30 + (v ? 12 : 0); x < base - 10; x += 72) out.push({ x: r.x + x, y: r.y + 30, r: 30, color: '#aacde4', power: 0.8 });
    for (let i = 1; i < n; i++) { const m = S.machineAt(b, i), bw = S.META.BAYS[b.type].w * CELL; out.push({ x: r.x + m.x + Math.floor(bw / 2) + (S.roomVariant(b, i) ? 8 : -8), y: r.y + 30, r: 26, color: '#aacde4', power: 0.7 }); }
  }
  return out;
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
  bounds: () => ({ x0: -VW, y0: -40, x1: W(), y1: H() + 10 }),
  home(r) {
    // start at the gate: the valley on the left, the mountain with the first floors on the right
    const zoom = 2, vw = r.width / zoom, vh = r.height / zoom;
    if (vw < 360) return { zoom, x: -16, y: ftop(0) - 40 };   // narrow screens: the rooms first, the valley is a drag away
    return { zoom, x: Math.max(-VW, -FACE - Math.min(160, vw * 0.3)), y: Math.max(ftop(0) - 40, GROUND + 30 - vh) };
  },
  draw(ctx, t, view) {
    G_ = grid();
    const dt = Math.min(0.2, t - prevT); prevT = t;
    updateAgents(G_, dt);
    drawSky(ctx, t, view);
    drawSurface(ctx, t);
    drawUnderground(ctx, t, view, G_);
    drawStrangers(ctx, t, 'road');
    drawn.length = 0;
    const f = F();
    const nowMs = performance.now();
    const list = [...agents.values()].filter((a) => !a.hidden && !(a.mode === 'well' && nowMs - a.wellAt > FADE)).sort((a, b) => a.y - b.y);
    for (const a of list) {
      const d = f.dwarves.find((x) => x.id === a.id);
      if (!d) continue;
      const spr = agentSprite(d, a);
      // stepping into the dark of an arch, or out of it
      const k = a.mode === 'well' ? 1 - (nowMs - a.wellAt) / FADE : a.emerge && nowMs - a.emerge < FADE ? (nowMs - a.emerge) / FADE : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, k));
      const p = S.placeDwarf(ctx, spr, a.x, a.y, a.face < 0);
      ctx.globalAlpha = 1;
      if (a.mode !== 'well') drawn.push({ id: a.id, sx: p.sx, sy: p.sy, spr: a.face < 0 ? flipped(spr) : spr, a });
    }
    drawParticles(ctx, dt);
  },
  ambient(t) {
    const day = daylight(sun().elev);
    // the sky goes dark at night; inside the mountain it is always dim. The mountain's outline is stepped.
    const sky = { color: '#0e1236', a: 0.62 * (1 - day) }, rock = { color: '#140f20', a: 0.38 + 0.14 * (1 - day) };
    const out = [
      { ...sky, x0: -VW - 50, x1: -FACE, y0: -400, y1: GROUND + 1 },
      { ...rock, x0: -VW - 50, x1: -FACE, y0: GROUND + 1, y1: H() + 50 },
    ];
    for (let x = -FACE; x < W(); x += 24) {
      const top = Math.min(mtop(x), mtop(x + 12), mtop(x + 23));
      const tunnel = x < 0 ? ftop(ENTRY) + 8 : null;
      out.push({ ...sky, x0: x, x1: x + 24, y0: -400, y1: tunnel !== null ? Math.max(top, tunnel) : top });
      out.push({ ...rock, x0: x, x1: x + 24, y0: tunnel !== null ? tunnel : top, y1: H() + 50 });
    }
    return out;
  },
  lights(t) {
    if (!G_) return [];
    const out = [];
    const f = F();
    for (const r of G_.rooms) out.push(...roomLights(r));
    for (const [k, v] of G_.cells) {
      if (v.kind !== 'hall') continue;
      const [c, fl] = k.split(',').map(Number);
      if (['hall_a', 'hall_e', 'hall_a', 'hall_b', 'hall_a', 'hall_c', 'hall_e', 'hall_d'][S.hash(k) % 8] === 'hall_b') out.push({ x: c * CELL + CELL / 2, y: ftop(fl) + 19, r: 32, color: '#ffd98e', flicker: 1 });
    }
    for (let fl = 0; fl < plan.floors; fl++) out.push({ x: plan.shaft * CELL / 2, y: ftop(fl) + 40, r: 24, color: '#ffd98e' });
    for (const w of G_.wells) {
      out.push({ x: w.c * CELL + 44, y: ftop(w.f) + 34, r: 30, color: '#ffd98e', flicker: 1 });
      if ((wellLit.get(wellKey(w)) || 0) > performance.now()) out.push({ x: w.c * CELL + 29, y: ftop(w.f) + 68, r: 22, color: '#ffb070', power: 0.8 });
    }
    const day = daylight(sun().elev);
    if (day < 0.8) {
      out.push({ x: SURFACE.stall + 36, y: GRASS - 38, r: 44, color: '#ffd98e', power: 0.8 });
      out.push({ x: SURFACE.tent + 31, y: GRASS - 14, r: 38, color: '#ffb070', power: 0.7 });
      out.push({ x: SURFACE.winch + 22, y: GRASS - 30, r: 36, color: '#ffd98e', power: 0.8 });
      if (f.siege) out.push({ x: SURFACE.wall - 22, y: GRASS - 8, r: 56, color: '#ff8a4a', flicker: 3, power: 1.4 });
      out.push({ x: SURFACE.gate + 30, y: GROUND - 40, r: 30, color: '#ffd98e', flicker: 1, power: 0.8 });
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
    for (const c of critterHits) if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) return { kind: 'tab', id: 'war', rect: [c.x, c.y, c.w, c.h], round: true };
    for (const r of G_.rooms) if (x >= r.x && x < r.x + r.pw && y >= r.y && y < r.y + RH) return machineHit(r, x, y) || { kind: 'room', id: r.b.id, rect: [r.x, r.y, r.pw, RH], round: true };
    if (x < -FACE && y < GRASS + 2 && y > GRASS - 62) {
      const X = SURFACE;
      if (x >= X.stall && x < X.stall + STALL_W && y > GRASS - 54) return { kind: 'tab', id: 'trade', rect: [X.stall, GRASS - 53, STALL_W, 54], round: true };
      if (x >= X.tent && x < X.tent + TENT_W && y > GRASS - 50) return { kind: 'tab', id: 'explore', rect: [X.tent, GRASS - 48, TENT_W, 49], round: true };
      if (x >= X.wall && x < X.wall + X.wallW) return { kind: 'tab', id: 'war', rect: [X.wall, GRASS - 61, X.wallW, 62], round: true };
      if (x >= X.winch && x < X.winch + 46 && y > GRASS - 46) return { kind: 'tab', id: 'mines', rect: [X.winch, GRASS - 45, 46, 46], round: true };
    }
    if (x < plan.shaft * CELL && y >= SURF) return { kind: 'tab', id: 'mines', rect: [0, SURF, plan.shaft * CELL, H() - SURF] };
    return null;
  },
  overlay(ctx, t, hover, mouse) {
    if (!G_) return;
    const f = F(), d = D();
    const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy).length;
    for (const r of G_.rooms) {
      const name = byId.buildings[r.b.type].name.split(' ')[0].replace("'s", '');
      sign(ctx, name + (r.b.level > 1 ? ' ' + r.b.level : ''), r.x + r.pw / 2, r.y + 9, G.ws === r.b.id ? '#e3c06e' : '#fbf4e6');
      if (!roomActive(r.b.id)) {
        ctx.fillStyle = 'rgba(20,14,30,0.35)'; ctx.fillRect(r.x, r.y + 12, r.pw, RH - 12);
        S.draw(ctx, 'ui_warn', r.x + r.pw / 2 - 8, r.y + 17 + Math.round(Math.sin(t * 3)));
        continue;
      }
      if (canRun(r.b, idle)) S.draw(ctx, 'arrow_' + (Math.floor(t * 3) % 2), r.x + r.pw / 2 - 5, r.y + 18);
      machineOverlay(ctx, t, r);
      if (f.siege && byId.buildings[r.b.type].kind !== 'passive') { ctx.fillStyle = 'rgba(169,71,60,0.25)'; ctx.fillRect(r.x, r.y, r.pw, RH); }
    }
    for (const dw of drawn) if (dw.a.want && dw.a.want.sleep && !dw.a.mode) {
      const k = (t * 0.7 + dw.id * 0.3) % 1;
      ctx.globalAlpha = 1 - k; S.draw(ctx, 'zzz', dw.sx + 12 + k * 4, dw.sy - k * 10); ctx.globalAlpha = 1;
    }
    if (G.build) buildOverlay(ctx, t, mouse);
  },
  click(x, y, hit) { return G.build ? buildClick(x, y, hit) : false; },
  dragging(p) { return !!(G.build && ['dig', 'hall', 'fill'].includes(G.build.tool) && p && cellAt(p.x, p.y)); },
  paint(p, phase) { buildPaint(p, phase); },
  cancel() { if (G.build) { G.build.held = null; if (G.onBuildChange) G.onBuildChange(); } },
};

/** The bellows of a smelter and the quench barrel of a forge waiting for it: things you use by clicking. */
function machineHit(r, x, y) {
  const b = r.b;
  if (F().siege) return null;
  if (b.type === 'smelter') for (let i = 0; i < Math.max(1, b.machines || 1); i++) {
    const m = S.machineAt(b, i), [fx, , fw] = m.a.fire, x0 = r.x + m.x + fx - 13, ww = fw + (i ? 26 : 43);
    if (x >= x0 && x < x0 + ww && y >= r.y + 24 && y < r.y + 90) return { kind: 'bellows', id: b.id, rect: [x0, r.y + 24, ww, 66], round: true };
  }
  if (b.type === 'forge') for (let i = 0; i < Math.max(1, b.machines || 1); i++) {
    const job = jobOf(b, i), m = S.machineAt(b, i), q = m.a.quench || m.a.anvil;
    if (!job || !job.quenching || !q) continue;
    const qx = r.x + m.x + q[0];
    if (x >= qx - 10 && x < qx + 10 && y >= r.y + 62 && y < r.y + 92) return { kind: 'quench', id: b.id, machine: i, rect: [qx - 9, r.y + 66, 18, 24], round: true };
  }
  return null;
}

/** Heat gauge beside the furnace, and a blinking QUENCH over a forge with hot metal. */
function machineOverlay(ctx, t, r) {
  const b = r.b;
  if (b.type === 'smelter') {
    const heat = G.heat ? G.heat(b.id) : 0;
    const tx = r.x + (S.META.ROOMS.smelter.w - 1) * CELL - 16, ty = r.y + 26, hh = 44;
    ctx.fillStyle = '#1d1b2c'; ctx.fillRect(tx - 1, ty - 1, 6, hh + 6);
    ctx.fillStyle = '#33364a'; ctx.fillRect(tx, ty, 4, hh);
    const fill = Math.round((heat / 100) * (hh - 2));
    for (let i = 0; i < fill; i++) { ctx.fillStyle = S.mix('#a9473c', '#ffd98e', i / hh); ctx.fillRect(tx + 1, ty + hh - 1 - i, 2, 1); }
    ctx.fillStyle = heat > 5 ? '#d9704a' : '#623e45'; ctx.fillRect(tx - 1, ty + hh, 6, 4);
  }
  if (b.type === 'forge' && Math.floor(t * 3) % 2) for (let i = 0; i < Math.max(1, b.machines || 1); i++) {
    const job = jobOf(b, i), m = S.machineAt(b, i), q = m.a.quench || m.a.anvil;
    if (job && job.quenching && q) sign(ctx, 'QUENCH!', r.x + m.x + q[0], r.y + 54, '#e3c06e');
  }
}

/** The workshop or room closest to a world point (for sounds). */
export function roomAt(p) {
  const g = G_ || grid();
  let best = null, bd = 1e9;
  for (const r of g.rooms) {
    const d = Math.hypot(r.x + r.pw / 2 - p.x, (r.y + RH / 2 - p.y) * 2);
    if (d < bd) { bd = d; best = r; }
  }
  return best && bd < 160 ? best.b : null;
}

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
    case 'tailor': return stock('food') >= 3 || stock('cloth') > 0;
    case 'jeweler': return stock('rough_gem') > 0 || (stock('cut_gem') > 0 && keys.some((k) => /^item:(ring|crown|goblet):/.test(k)));
    default: return false;
  }
}

// ------------------------------------------------------------------ build mode

function cellAt(x, y) {
  if (y < SURF || x < 0) return null;
  return { c: Math.floor(x / CELL), f: Math.floor((y - SURF) / RH) };
}

function buildHit(x, y) {
  const cell = cellAt(x, y);
  if (!cell || cell.f >= plan.floors || cell.c < 0 || cell.c >= plan.cols) return null;
  const tool = G.build.tool;
  if (tool === 'move' && !G.build.held) {
    const r = G_ && G_.rooms.find((q) => q.f === cell.f && cell.c >= q.c && cell.c < q.c + q.w);
    if (r) return { kind: 'room', id: r.b.id, rect: [r.x, r.y, r.pw, RH], round: true };
    const v = G_ && G_.cells.get(cell.c + ',' + cell.f);
    if (v && v.kind === 'well') return { kind: 'cell', c: v.well.c, f: cell.f, rect: [v.well.c * CELL, ftop(cell.f), 2 * CELL, RH] };
    if (v && v.kind === 'hall') return { kind: 'cell', c: cell.c, f: cell.f, rect: [cell.c * CELL, ftop(cell.f), CELL, RH] };
    return null;
  }
  return { kind: 'cell', c: cell.c, f: cell.f };
}

/** What a cell holds: 'rock', 'cave', 'hall', 'well', 'room', 'shaft' or null (outside the plan). */
function kindAt(c, f) {
  if (f < 0 || f >= plan.floors || c < 0 || c >= plan.cols) return null;
  const v = G_.cells.get(c + ',' + f);
  return v ? v.kind : 'rock';
}

/**
 * Can something w cells wide stand at c, f? 'ok', 'rock' (not dug out yet) or 'taken'.
 * `own` cells (the thing being moved) count as free.
 */
function ground(c, f, w, own) {
  if (c < plan.shaft || c + w > plan.cols || f < 0 || f >= plan.floors) return 'taken';
  let rock = false;
  for (let x = c; x < c + w; x++) {
    const v = G_.cells.get(x + ',' + f);
    if (own && own(x, f, v)) continue;
    if (!v) { rock = true; continue; }
    if (v.kind !== 'hall' && v.kind !== 'cave') return 'taken';
  }
  return rock ? 'rock' : 'ok';
}

/** A room there would touch a hallway, a stairwell or the shaft on its left or right (the server checks too). */
function besideHall(c, f, w) {
  const leads = (x) => { const v = G_.cells.get(x + ',' + f); return !!v && (v.kind === 'hall' || v.kind === 'well' || v.kind === 'shaft'); };
  return leads(c - 1) || leads(c + w);
}

/** What the player has picked up with the move tool: a room, a hallway cell or a stairwell. */
function held() {
  const h = G.build && G.build.held;
  if (!h) return null;
  if (h.startsWith('hall:') || h.startsWith('well:')) { const [c, f] = h.slice(5).split(',').map(Number); return { kind: h.slice(0, 4), c, f, w: h[0] === 'w' ? 2 : 1 }; }
  const r = G_.rooms.find((q) => q.b.id === h);
  return r ? { kind: 'room', c: r.c, f: r.f, w: r.w, room: r } : null;
}

/** The outline under the pointer. ok: green, warn: yellow (allowed, but the room will stand still), else red. */
function ghostFor(mouse) {
  if (!mouse || !G_) return null;
  const cell = cellAt(mouse.x, mouse.y);
  if (!cell || cell.f >= plan.floors) return null;
  const tool = G.build.tool;
  const k = kindAt(cell.c, cell.f);
  if (tool === 'move' && G.build.held) {
    const hd = held();
    if (!hd) return null;
    const c = hd.kind === 'room' ? Math.round(mouse.x / CELL - hd.w / 2) : hd.kind === 'well' ? Math.round(mouse.x / CELL - 1) : cell.c;
    const own = (x, f) => f === hd.f && x >= hd.c && x < hd.c + hd.w;
    const gr = ground(c, cell.f, hd.w, own);
    const okHall = hd.kind === 'hall' ? gr === 'ok' && kindAt(c, cell.f) === 'cave' : gr === 'ok';
    const warn = hd.kind === 'room' && gr === 'ok' && !besideHall(c, cell.f, hd.w);
    return { c, f: cell.f, w: hd.w, h: 1, ok: okHall && !warn, warn, room: hd.room, why: gr === 'rock' ? 'DIG IT OUT FIRST' : !okHall ? 'IN THE WAY' : warn ? 'NO HALLWAY: IT WILL STAND STILL' : null };
  }
  if (tool === 'dig') {
    const marked = G_.marks.has(cell.c + ',' + cell.f);
    return { c: cell.c, f: cell.f, w: 1, h: 1, ok: k === 'rock' && cell.c >= plan.shaft && !marked, warn: marked, why: marked ? 'CLICK TO TAKE THE MARK OFF' : k === 'rock' ? null : 'ALREADY OPEN' };
  }
  if (tool === 'hall') return { c: cell.c, f: cell.f, w: 1, h: 1, ok: k === 'cave', why: k === 'rock' ? 'DIG IT OUT FIRST' : k === 'cave' ? null : 'NOT EMPTY' };
  if (tool === 'stairwell') {
    const gr = ground(cell.c, cell.f, 2);
    return { c: cell.c, f: cell.f, w: 2, h: 1, ok: gr === 'ok', why: gr === 'rock' ? 'DIG IT OUT FIRST' : gr === 'ok' ? null : 'IN THE WAY' };
  }
  if (tool === 'fill') {
    const v = G_.cells.get(cell.c + ',' + cell.f);
    if (v && v.kind === 'well') return { c: v.well.c, f: cell.f, w: 2, h: 1, ok: true };
    return { c: cell.c, f: cell.f, w: 1, h: 1, ok: k === 'hall' || k === 'cave' || G_.marks.has(cell.c + ',' + cell.f) };
  }
  return null;
}

function buildOverlay(ctx, t, mouse) {
  // faint grid
  ctx.fillStyle = 'rgba(251,244,230,0.08)';
  for (let c = 0; c <= plan.cols; c++) ctx.fillRect(c * CELL, SURF, 1, plan.floors * RH);
  for (let f = 0; f <= plan.floors; f++) ctx.fillRect(0, SURF + f * RH, W(), 1);
  const g = ghostFor(mouse);
  if (g && !G.build.stroke) {
    const x = g.c * CELL, y = ftop(g.f), w = g.w * CELL, h = g.h * RH;
    if (g.room) { ctx.globalAlpha = 0.55; ctx.drawImage(S.roomImage(g.room.b), x, y); ctx.globalAlpha = 1; }
    const col = g.ok ? [144, 224, 140] : g.warn ? [240, 168, 90] : [217, 112, 74];
    ctx.fillStyle = `rgba(${col},0.28)`;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = `rgb(${col})`;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    if (g.why) text(ctx, g.why, x, y - 8, `rgb(${col})`);
  }
  const st = G.build.stroke;
  if (st) {
    const n = st.cells.size, tool = G.build.tool;
    ctx.fillStyle = tool === 'fill' || st.unmark ? 'rgba(217,112,74,0.35)' : 'rgba(144,224,140,0.35)';
    for (const c of st.cells.keys()) ctx.fillRect(c * CELL + 1, ftop(st.f) + 1, CELL - 2, RH - 2);
    const at = (st.last ?? st.from) * CELL, ty = ftop(st.f) - 8;
    if (tool === 'hall' && n) {
      const cost = (D().layoutCosts || {}).hall, can = cost ? Math.floor(F().coins / cost.coins) : n;
      text(ctx, n + ' CELLS ' + Math.round(n * (cost ? cost.coins : 0)) + ' COINS' + (can < n ? ' - ONLY ' + can : ''), at, ty, can < n ? '#ff9a7a' : '#fbf4e6');
    }
    if (tool === 'dig' && n && !st.unmark) {
      const dig = D().dig || {}, secs = (dig.seconds || [])[st.f] || 300, m = Math.max(1, dig.miners || 0);
      text(ctx, n + ' CELLS ABOUT ' + Math.ceil(n * secs / Math.min(m, n) / 60) + ' MIN' + (dig.miners ? '' : ' - NO MINERS'), at, ty, dig.miners ? '#fbf4e6' : '#ff9a7a');
    }
  }
  const hd = G_ && held();
  if (hd) { ctx.fillStyle = 'rgba(227,192,110,0.25)'; ctx.fillRect(hd.c * CELL, ftop(hd.f), hd.w * CELL, RH); }
}

/**
 * Dragging with the dig, hallway or fill tool: every cell the pointer crosses joins the stroke, on the floor where
 * the stroke started, and goes to the server in one action when the pointer lets go. A dig stroke that starts on a
 * marked cell takes marks off instead.
 */
function buildPaint(p, phase) {
  const b = G.build;
  if (!b) return;
  if (phase === 'cancel') { b.stroke = null; return; }
  const cell = p && cellAt(p.x, p.y);
  if (phase === 'start') b.stroke = cell ? { f: cell.f, from: cell.c, cells: new Map(), unmark: b.tool === 'dig' && G_.marks.has(cell.c + ',' + cell.f) } : null;
  const st = b.stroke;
  if (!st) return;
  if (cell) {
    // fill the gap since the last cell, so fast drags leave no holes
    const last = st.last === undefined ? cell.c : st.last;
    for (let c = Math.min(last, cell.c); c <= Math.max(last, cell.c); c++) {
      if (c < plan.shaft || c >= plan.cols) continue;
      const k = kindAt(c, st.f), marked = G_.marks.has(c + ',' + st.f);
      const ok = b.tool === 'dig' ? (st.unmark ? marked : k === 'rock' && !marked)
        : b.tool === 'hall' ? k === 'cave'
        : k === 'hall' || k === 'cave' || marked;
      if (ok) st.cells.set(c, true);
    }
    st.last = cell.c;
  }
  if (phase !== 'end') return;
  b.stroke = null;
  let cells = [...st.cells.keys()].sort((x, y) => (st.from <= (st.last ?? st.from) ? x - y : y - x)).map((c) => [c, st.f]);
  // nothing fitted: send the first cell anyway, so the server can say what is wrong there
  if (!cells.length) cells = [[st.from, st.f]];
  const type = b.tool === 'dig' ? (st.unmark ? 'unmark' : 'mark') : b.tool === 'hall' ? 'hallMany' : 'fillMany';
  G.act({ type, cells });
}

function buildClick(x, y, hit) {
  const b = G.build;
  const cell = cellAt(x, y);
  if (!cell || cell.f >= plan.floors) return true;
  if (b.tool === 'move') {
    if (!b.held) {
      if (hit && hit.kind === 'room') b.held = hit.id;
      else if (hit && hit.kind === 'cell') b.held = (kindAt(hit.c, hit.f) === 'well' ? 'well:' : 'hall:') + hit.c + ',' + hit.f;
      if (G.onBuildChange) G.onBuildChange();
      return true;
    }
    const hd = held(), g = ghostFor({ x, y });
    // a wrong spot is sent as well: the server explains what is wrong (rock to dig out, something in the way)
    if (hd && g && (g.c !== hd.c || g.f !== hd.f)) {
      if (hd.kind === 'room') G.act({ type: 'moveRoom', building: b.held, col: g.c, floor: g.f });
      else G.act({ type: hd.kind === 'well' ? 'moveWell' : 'moveHall', col: hd.c, floor: hd.f, col2: g.c, floor2: g.f });
    }
    b.held = null;
    if (G.onBuildChange) G.onBuildChange();
    return true;
  }
  if (b.tool === 'dig') G.act({ type: G_.marks.has(cell.c + ',' + cell.f) ? 'unmark' : 'mark', cells: [[cell.c, cell.f]] });   // only reached when dragging is off
  if (b.tool === 'hall') G.act({ type: 'hallMany', cells: [[cell.c, cell.f]] });
  if (b.tool === 'stairwell') G.act({ type: 'stairwell', col: cell.c, floor: cell.f });
  if (b.tool === 'fill') G.act({ type: 'fill', col: cell.c, floor: cell.f });
  return true;
}

/** World rectangle of a room. */
export function roomRect(id) {
  const g = G_ || grid();
  const r = g.rooms.find((q) => q.b.id === id);
  return r ? { x: r.x, y: r.y, w: r.pw, h: RH } : null;
}

/** World position of a room (for focusing the camera). */
export function roomCenter(id) {
  const g = G_ || grid();
  const r = g.rooms.find((q) => q.b.id === id);
  return r ? { x: r.x + r.pw / 2, y: r.y + RH / 2 } : null;
}

export { fullName, text };
