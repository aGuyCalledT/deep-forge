// The hold: surface, rock, mine shaft, hallways, stairwells and rooms where the player placed them,
// and the dwarves walking between them. Drawn in the 48-px art: rooms from their templates (rooms48.js, made with
// tools/room-editor), dwarves from the dwarf48 kit, valley and rock from the props48 sheet (art48.js).
import { G, F, D, byId, now, stock, fullName, moneyText } from './data.js';
import * as S from './sprites.js';
import * as Art from './art48.js';
import * as BD from './backdrop.js';
import * as R from './rooms48.js';
import * as DW from './dwarf48.js';
import { sun, daylight, skyColors, berlinHour } from './sun.js';
import { text, sign } from './pixfont.js';

// The hold is cut into a mountain from its left side. Left of the grid (x < 0) lies the valley with the
// market and the gate; the mountain face rises at x = -FACE, a short tunnel leads from the gate to the shaft.
// SURF is the top of the first floor; floors above ENTRY are above the valley floor, the rest below it.
// One cell is 48 px wide, a floor 144 px high with its floor line 135 px below its top (rooms48: CELL, RH, FLOOR).
export const CELL = R.CELL, RH = R.RH, SURF = 440;
const WALK = R.FLOOR;
export const ENTRY = 2;                          // the floor whose floor line is the valley's ground
const GROUND = SURF + ENTRY * RH + WALK;
const GRASS = GROUND;
export const VW = 1440;                          // width of the valley
const VC = VW / CELL;
const FACE = 288;                                // the gate tunnel: from x = -FACE to the shaft
// the valley: where things stand (the middle of their foot, on the grass). Clicks, lights and dwarves use the same
// numbers. wall: where the village begins (raiders gather beyond it); the stall is the market.
// The gate is a wall with statues cut into the mountain's face, left of the tunnel: from FACADE to -FACE, the arch in
// its middle. Its right part is drawn over the dwarves, so they walk into the arch and come out in the entrance hall.
const FACADE_W = 320, FACADE = -FACE - FACADE_W;
const SURFACE = { wall: -1250, stall: -1010, well: -870, sign: -680, gate: -FACE - FACADE_W / 2 };
const STALL_W = 70, CARAVAN_HOME = -720;
const TREES = [['oak', -1390], ['fir', -1330], ['fir', -1150], ['oak', -780], ['fir', -715]];

let plan = null;   // { cols, floors, shaft, rooms: {type: cells} }
const particles = [];

export function W() { return G.data.plan.cols * CELL; }
export function H() { return SURF + G.data.plan.floors * RH; }
const fy = (f) => (f < 0 ? GROUND : SURF + f * RH + WALK);      // feet line of a floor (-1: the valley)
const ftop = (f) => SURF + f * RH;

// ------------------------------------------------------------------ art and room templates

const tpls = new Map();   // "type/part/look" -> template; built-in looks load at start, players' looks when first used
const asked = new Set();

/** Load the 48-px art, the dwarf kit and the built-in room templates. Called once before the first frame. */
export async function loadArt() {
  await Promise.all([Art.load(), DW.load(), R.load(), BD.load()]);
  await preload();
}
function preload() {
  const jobs = [];
  for (const [type, parts] of Object.entries(R.index())) for (const [part, names] of Object.entries(parts)) {
    for (const n of names) if (!R.lookInfo(type, part, n)) jobs.push(fetchTpl(type, part, n));
  }
  return Promise.all(jobs);
}
function fetchTpl(type, part, n) {
  const k = `${type}/${part}/${n}`;
  asked.add(k);
  return R.get(type, part, n).then((t) => { if (t) tpls.set(k, t); }).catch(() => {});
}
/**
 * Read the list of looks again (players may have made new ones). `changed` = {type, part, name} of a look that was
 * saved or deleted just now: it is fetched again.
 */
export async function refreshLooks(changed) {
  if (changed) {
    const k = `${changed.type}/${changed.part || 'room'}/${changed.name}`;
    R.forget(changed.type, changed.part || 'room', changed.name); tpls.delete(k); asked.delete(k);
  }
  await R.load();
  await preload();
}
/** A look's template if it is loaded (asks the server for it once otherwise). */
export function lookTpl(type, part, name) {
  const k = `${type}/${part}/${name}`;
  if (!tpls.has(k) && !asked.has(k) && R.looks(type, part).includes(name)) fetchTpl(type, part, name);
  return tpls.get(k) || null;
}
export const lookInfo = R.lookInfo;
export const artReady = () => Art.ready() && DW.ready();

/** The looks a room type can pick (template names), the first is the default. */
export function roomLooks(type) {
  const list = R.looks(type, 'room');
  return type === 'entrance_hall' ? [...list].sort((a, b) => WAY_STYLES.indexOf(a) - WAY_STYLES.indexOf(b)) : list;
}

/** The template of a room (part 'room') or of its machine bays ('bay'), in its chosen look; a bare shell if none. */
function tplOf(type, part, look, cells) {
  const list = R.looks(type, part), name = list.includes(look) ? look : list[0];
  // a player's look still on its way from the server: show the default look meanwhile
  return (name && lookTpl(type, part, name)) || (list[0] && tpls.get(`${type}/${part}/${list[0]}`))
    || { ...R.blank(type, part, cells), vault: part === 'room' };
}

/**
 * A room's parts: the room itself and one bay per extra machine, side by side, each with its template and its
 * spots in world pixels ({kind, x, y, spot, machine}).
 */
function roomParts(r) {
  const b = r.b, look = b.look || '';
  const room = tplOf(b.type, 'room', look, r.w);
  const machines = Math.max(1, b.machines || 1);
  const parts = [{ tpl: room, x: r.x, w: Math.min(r.w, room.cells || r.w) * CELL, i: 0 }];
  let x = r.x + parts[0].w;
  for (let i = 1; i < machines; i++) {
    const bay = tplOf(b.type, 'bay', look, 2), w = (bay.cells || 2) * CELL;
    parts.push({ tpl: bay, x, w, i });
    x += w;
  }
  const spots = [];
  for (const p of parts) for (const s of p.tpl.spots || []) spots.push({ kind: s.kind, x: p.x + s.x, y: r.y + s.y, spot: s, machine: p.i });
  return { parts, spots };
}
/** The spots of one kind (of one machine, if given). */
const spotsOf = (r, kind, machine) => r.spots.filter((s) => s.kind === kind && (machine === undefined || s.machine === machine));

// ------------------------------------------------------------------ the plan as a grid

function grid() {
  plan = G.data.plan;
  const f = F(), L = f.layout || { rooms: {}, halls: [], wells: [], caves: {}, marks: [], digs: {} };
  const cells = new Map();    // "c,f" -> {kind, id?}
  const style = wayStyle();   // entrance hall, hallways and stairwells share one look
  const rooms = [];
  for (const [id, [c, fl]] of Object.entries(L.rooms)) {
    const b = f.buildings.find((x) => x.id === id);
    if (!b) continue;
    const w = (D().buildings[id] || {}).cells || (plan.rooms || {})[b.type] || 5;
    const r = { b, c, f: fl, w, x: c * CELL, y: ftop(fl), pw: w * CELL };
    Object.assign(r, roomParts(r));
    rooms.push(r);
    for (let x = c; x < c + w; x++) cells.set(x + ',' + fl, { kind: 'room', id });
  }
  for (const k of L.halls) cells.set(k, { kind: 'hall', tpl: hallTpl(style, hallVariant(k)) });
  for (const [k, since] of Object.entries(L.caves || {})) cells.set(k, { kind: 'cave', since });
  const marks = new Map((L.marks || []).map((k) => [k, (L.digs || {})[k] || 0]));   // rock to dig: cell -> work done
  const critters = (f.threats || []).filter((th) => th.cell).map((th) => { const [c, fl] = th.cell.split(',').map(Number); return { th, c, f: fl }; });
  // stairwells: two cells wide, the way in is an arch in the middle of the back wall
  const wellTpl = tplOf('stairwell', 'room', wayLook('stairwell', style), 2);
  const doorX = ((wellTpl.spots || []).find((s) => s.kind === 'door') || { x: CELL }).x;
  const wells = (L.wells || []).map((k) => { const [c, fl] = k.split(',').map(Number); return { c, f: fl, x: c * CELL + doorX, tpl: wellTpl }; });
  for (const w of wells) for (let dx = 0; dx < 2; dx++) cells.set((w.c + dx) + ',' + w.f, { kind: 'well', well: w });
  // the mine shaft: a stairwell on every floor (same look, a door in the back wall), and the way down to the mines
  const shafts = [];
  for (let fl = 0; fl < plan.floors; fl++) {
    const s = { c: 0, f: fl, x: doorX, tpl: wellTpl, shaft: true };
    shafts.push(s);
    for (let c = 0; c < plan.shaft; c++) cells.set(c + ',' + fl, { kind: 'shaft', well: s });
  }
  const hall = levelOf('entrance_hall') ? tplOf('entrance_hall', 'room', style, FACE / CELL) : null;
  const g = { cells, rooms, wells, shafts, marks, critters, hall };
  g.walls = wallsOf(g);
  return g;
}

/**
 * The style of the ways (entrance hall, hallways, stairwells): the look the player picked for the entrance hall, else
 * one by its level (timber, stone, grand). Hallways and stairwells take the same style, so the hold looks of a piece.
 */
const WAY_STYLES = ['timber', 'stone', 'grand'];
function wayStyle() {
  const b = F().buildings.find((x) => x.type === 'entrance_hall');
  if (b && b.look && R.looks('entrance_hall').includes(b.look)) return b.look;
  return tierStyle();
}
function tierStyle() {
  const b = F().buildings.find((x) => x.type === 'entrance_hall');
  return WAY_STYLES[b && b.level ? hallTier(b.level) : 0];
}
/** The way look of a type in a style; a player's hall look without a matching hallway or stairwell keeps the level's. */
const wayLook = (type, style) => (R.looks(type).includes(style) ? style : tierStyle());
/** A hallway template: the style's variant if there is one, else the plain style. */
function hallTpl(style, variant) {
  const looks = R.looks('hallway'), base = wayLook('hallway', style);
  return tplOf('hallway', 'room', looks.includes(base + variant) ? base + variant : base, 1);
}
/** Lights of a way's template at x0, y0. */
function tplLights(tpl, x0, y0) {
  return (tpl.spots || []).filter((s) => s.kind === 'light')
    .map((s) => ({ x: x0 + s.x, y: y0 + s.y, r: s.r || 90, color: s.c || '#ffb060', flicker: 1, power: 0.6 * (0.5 + (s.p ?? 0.8) / 2) }));
}
/** How far a stairwell door is open (frame 0 shut .. 3 open): it swings open when someone steps in or out. */
function doorFrame(w) {
  const until = wellLit.get(wellKey(w)) || 0, dt = performance.now() - (until - 900);
  if (dt < 0 || dt > 1000) return 0;
  return dt < 70 ? 1 : dt < 140 ? 2 : dt < 760 ? 3 : dt < 880 ? 2 : 1;
}


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
const WELL_SPEED = 120; // px per second on the hidden way behind the stairwell arches (walking is 68)

/** Seconds from one stairwell to another: the way behind the wall is as long as the distance between them. */
function wellTime(a, b) {
  return 0.6 + (Math.abs(a.x - b.x) + Math.abs(fy(a.f) - fy(b.f))) / WELL_SPEED;
}

/** Cheapest path over cells: walking, and the stairwells (the shaft is one on every floor) to every other floor. */
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
    // the gate tunnel joins the valley to the shaft on the entry floor
    if (n.f === -1 && n.c === -1) next.push([0, ENTRY, 'walk', 1]);
    if (n.f === ENTRY && n.c === 0) next.push([-1, -1, 'walk', 1]);
    // into a stairwell, out of any stairwell on another floor; the cost is the time behind the wall, in walking cells
    const here = n.f >= 0 && g.cells.get(nk);
    if (here && here.well) for (const e of [...g.wells, ...g.shafts])
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

/** The way to the shaft on a floor, ending with a step into its arch (down to the mines). */
function mineWay(g, from, fl) {
  const s = g.shafts[fl];
  const p = path(g, from, { c: 0, f: fl });
  if (!p) return null;
  p.push({ x: s.x, y: fy(fl), f: fl, mode: 'walk' }, { x: s.x, y: fy(fl), f: fl, mode: 'enter', from: s });
  return p;
}

const wellLit = new Map();   // stairwell -> time until its arch glows (someone just went in or came out)
const wellKey = (w) => w.c + ',' + w.f;
const FADE = 350;            // ms to step into (or out of) the dark of an arch

// ------------------------------------------------------------------ dwarves on the move


// ------------------------------------------------------------------ dwarves on the move

export const agents = new Map();   // dwarf id -> agent (exported for tests)
const CYCLE = 12, WORK = 9; // minutes: 9 at work, 3 off
const SPEED = 68;           // walking, px per second

function schedule(d) {
  const t = Date.now() / 60000 + (S.hash('cyc' + d.id) % CYCLE);
  return { k: Math.floor(t / CYCLE), off: (t % CYCLE) >= WORK };
}

/** The standing (or sitting) pose that looks the same way as a spot, for when there is nothing to do there. */
function restPose(spot) { return R.spotPose({ ...spot, kind: 'stand' }); }

/**
 * Where a dwarf wants to be right now: {f, x, feet?, pose, flip?, face?, hidden, prop, sleep}.
 * pose is a dwarf48 pose; side poses look right unless flip (or face < 0).
 */
function want(g, d, ctx) {
  if (d.busy) return { hidden: true, f: -1, x: -VW + 8 };
  const sch = schedule(d);
  const night = ctx.hour >= 22 || ctx.hour < 6;
  const free = () => {
    if (night) {
      const bed = ctx.beds.shift();
      if (bed) return { f: bed.f, x: bed.x, feet: bed.y, pose: 'sleep', flip: bed.flip, sleep: true, quilt: false };
    }
    const r = S.hash('free' + d.id + ':' + sch.k) % 10;
    if (r < 6 && ctx.seats.length) { const s = ctx.seats.shift(); return { f: s.f, x: s.x, feet: s.y, pose: s.pose, flip: s.flip }; }
    const chat = S.hash('chat' + d.id + sch.k) % 2 ? 'talk' : 'idle';     // half of them stand and chat
    if (r < 8) {
      const cells = [...g.cells.entries()].filter(([, v]) => (v.kind === 'hall' || v.kind === 'well' || v.kind === 'room') && !(v.kind === 'room' && !roomActive(v.id)));
      if (cells.length) { const [k] = cells[S.hash('wander' + d.id + sch.k) % cells.length]; const [c, fl] = k.split(',').map(Number); return { f: fl, x: c * CELL + CELL / 2, pose: chat }; }
    }
    return { f: -1, x: SURFACE.wall + 160 + (S.hash('stroll' + d.id) % (FACADE - 40 - SURFACE.wall - 160)), pose: chat };
  };
  if (d.job === 'worker') {
    const r = g.rooms.find((x) => x.b.id === d.building);
    if (r && !sch.off) {
      const info = D().buildings[r.b.id] || {};
      const i = (info.seats || info.workers || [info.worker]).indexOf(d.id);
      if (i >= 0) {
        const sp = spotsOf(r, 'worker', i)[0];
        const busy = (jobOf(r.b, i) || byId.buildings[r.b.type].kind === 'continuous') && !F().siege;
        if (sp) { const p = busy ? R.spotPose(sp.spot) : restPose(sp.spot); return { f: r.f, x: sp.x, feet: sp.y, pose: p.pose, flip: p.flip, working: busy }; }
        return { f: r.f, x: r.x + r.pw / 2, pose: busy ? 'hands' : 'idle', working: busy };
      }
      // waiting for a free machine: stands by the door
      return { f: r.f, x: r.x + 20 + (S.hash('wait' + d.id) % 40), pose: 'idle' };
    }
    return free();
  }
  if (d.job === 'miner' && d.dig && !sch.off) {
    // digging out marked rock: stand beside it in the open cell and swing the pick
    const [c, fl] = d.dig.split(',').map(Number);
    const left = walkable(g, c - 1, fl);
    return { f: fl, x: left ? c * CELL - 14 : (c + 1) * CELL + 14, pose: 'work', face: left ? 1 : -1, digging: d.dig };
  }
  if (d.job === 'miner') return sch.off ? free() : { mines: true, f: plan.floors - 1, x: 16, hidden: true };
  if (d.job === 'warrior') {
    if (d.post === 'mine') return sch.off ? free() : { mines: true, f: plan.floors - 1, x: 16, hidden: true };
    // on the way to a critter in the hold, or back from it
    const th = (F().threats || []).find((x) => x.cell && x.fightAt > now() - 60 && (x.guards || []).includes(d.id));
    if (th) { const [c, fl] = th.cell.split(',').map(Number); return { f: fl, x: c * CELL + 24, pose: 'work', face: 1 }; }
    if (sch.off && !F().raid && !F().siege) return free();
    return guardSpot(d, ctx.gate++);
  }
  if (d.job === 'merchant') { const i = ctx.stall++; return { f: -1, x: SURFACE.stall + STALL_W / 2 + 24 + i * 40, pose: 'idle', prop: 'sack' }; }
  return free();
}

/**
 * Guards in the entrance hall (the gate tunnel, x -FACE..0 on the valley's floor line): they stand watch facing the
 * gate, and every pair spars with wooden sticks a few minutes in every twelve (that is how they learn).
 */
function guardSpot(d, i) {
  const f = F();
  if (f.raid || f.siege) return { f: -1, x: -FACE + 28 + i * 24, pose: 'idleSide', face: -1, prop: 'axe' };
  const pair = Math.floor(i / 2), x0 = -FACE + 150 + pair * 40;
  const partner = f.dwarves.filter((x) => x.job === 'warrior' && x.post === 'hall' && !x.busy).length > (i ^ 1);
  const spar = partner && pair < 2 && S.hash('spar' + pair + ':' + Math.floor(now() / 240)) % 3 === 0;
  if (spar) return { f: -1, x: x0 + (i % 2 ? 26 : 0), pose: 'work', face: i % 2 ? -1 : 1 };
  return { f: -1, x: -FACE + 140 + i * 18, pose: 'idle', prop: 'axe' };
}

/** Level of a building type (0 when the hold has none). */
function levelOf(type) { const b = F().buildings.find((x) => x.type === type); return b ? b.level : 0; }

/** The job running on machine i (machine 0 uses b.job). */
export function jobOf(b, i) { return i === 0 ? b.job : (b.more || [])[i - 1] || null; }

/** What each workshop's worker holds while working (kept for the panels; the 48-px dwarves work bare-handed). */
export const TOOL_OF = { forge: 'hammer', smelter: 'shovel', brewery: 'paddle', farm: 'hoe', engraver: 'chisel', jeweler: 'chisel', grindstone: 'hammer', tailor: 'chisel' };

/** Free places for this round of planning: seats, bar places and idle spots of every room, and the beds. */
function placeCtx(g) {
  const seats = [], beds = [];
  const TAVERN = ['sitTalk', 'eat', 'drink', 'sitTalk'];
  for (const r of g.rooms) {
    if (!roomActive(r.b.id)) continue;
    let n = 0;
    for (const s of r.spots) {
      if (s.kind === 'bed') { beds.push({ f: r.f, x: s.x, y: s.y, flip: R.facing(s.spot) === 'left' }); continue; }
      if (s.kind !== 'seat' && s.kind !== 'bar' && s.kind !== 'stand') continue;
      const p = R.spotPose(s.spot);
      let pose = p.pose;
      if (pose === 'sit' && r.b.type === 'tavern') pose = TAVERN[n++ % 4];
      else if (pose === 'sit') pose = n++ % 2 ? 'sitTalk' : 'sit';
      seats.push({ f: r.f, x: s.x, y: s.y, pose, flip: p.flip });
    }
  }
  // the same dwarves get the same places as long as nothing changes
  const shuffle = (a, salt) => a.sort((p, q) => S.hash(salt + p.x + ',' + p.f) - S.hash(salt + q.x + ',' + q.f));
  return { seats: shuffle(seats, 'seat'), beds, gate: 0, stall: 0, hour: berlinHour() };
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
      } else if (!a.want || a.want.f !== w.f || Math.abs(a.want.x - w.x) > 2 || a.want.pose !== w.pose || a.want.hidden !== w.hidden || a.want.feet !== w.feet) {
        const before = a.want;
        a.want = w;
        const from = nodeOf(g, a.f, a.x), to = nodeOf(g, w.f, w.x);
        // down to the mines: walk to the shaft on this floor and step into its arch
        const shaftFloor = a.f >= 0 ? a.f : ENTRY;
        const p = w.mines && !a.hidden ? mineWay(g, from, shaftFloor) : a.hidden && !w.hidden && !w.mines ? null : path(g, from, to);
        if (a.hidden && !w.hidden) {
          // coming back from the mines (bottom of the shaft) or from a trip (down the valley from the left)
          if (d.busy) { /* stays hidden */ } else {
            if (before && before.mines) {
              // up from the mines: out of the shaft's arch on the floor they are going to
              a.f = w.f >= 0 ? w.f : ENTRY; a.x = g.shafts[a.f].x;
              a.emerge = performance.now(); wellLit.set(wellKey(g.shafts[a.f]), a.emerge + 900);
            } else { a.x = -VW + 8; a.f = -1; }
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
      if (p.mode === 'enter') {
        // into the shaft's arch and down to the mines
        const now_ = performance.now();
        if (!a.inWell) { a.inWell = now_ + FADE; a.wellAt = now_; wellLit.set(wellKey(p.from), now_ + 900); }
        a.mode = 'well';
        if (now_ < a.inWell) { step = 0; break; }
        a.inWell = 0; a.hidden = true; a.mode = null; a.path.length = 0;
        break;
      }
      const dx = p.x - a.x, dy = p.y - a.y, dist = Math.hypot(dx, dy);
      const can = SPEED * step;
      a.mode = p.mode;
      if (Math.abs(dx) > 0.5) a.face = dx > 0 ? 1 : -1;
      if (dist <= can) { a.x = p.x; a.y = p.y; a.f = p.f; a.path.shift(); step -= dist / SPEED; }
      else { a.x += dx / dist * can; a.y += dy / dist * can; step = 0; }
    }
    if (!a.path.length && a.want) {
      // last few pixels inside the cell to the exact spot
      const tx = a.want.x, ty = a.want.feet || fy(a.want.f);
      const dx = tx - a.x;
      if (Math.abs(dx) > 0.5) { a.x += Math.sign(dx) * Math.min(Math.abs(dx), SPEED * dt); a.face = Math.sign(dx); a.mode = 'walk'; a.y = fy(a.want.f); }
      else { a.x = tx; a.mode = null; a.y = ty; if (a.want.face) a.face = a.want.face; }
      if (a.leave && !a.mode) a.hidden = true;
    }
    a.frameT += dt;
  }
  for (const id of [...agents.keys()]) if (!alive.has(id)) agents.delete(id);
}

// ------------------------------------------------------------------ how a dwarf looks in the 48-px kit

// look48 and ramp live in dwarf48.js (the portraits in panels use them too); re-exported for mine48.js
export { look48, ramp } from './dwarf48.js';
const { look48, ramp } = DW;

const FPS = { walk: 8, walkFront: 6, walkBack: 6, work: 6, hands: 5, workSit: 5, workBack: 5, workSitBack: 5, workSitFront: 5, talk: 3, sitTalk: 3, eat: 2, drink: 0.5, sleep: 0.7, idle: 0.6, sit: 0.6 };
/** The frame to draw for an agent: {canvas, ax, ay} (canvas mirrored when it looks left). */
function agentFrame(d, a) {
  const moving = a.mode === 'walk' || a.mode === 'well';
  const w = a.want || {};
  const pose = moving ? 'walk' : w.pose || 'idle';
  const fr = Math.floor(a.frameT * (FPS[pose] || 1));
  const flip = moving ? a.face < 0 : w.flip !== undefined ? w.flip : a.face < 0;
  return dwarfFrame(look48(d, { prop: moving ? null : w.prop, quilt: w.quilt }), pose, fr, flip);
}
const flipCache = new WeakMap();
function dwarfFrame(look, pose, f, flip) {
  const c = DW.frame(look, pose, f), [ax, ay] = pose === 'sleep' ? [37, 36] : [24, 62];
  if (!flip) return { canvas: c, ax, ay };
  let m = flipCache.get(c);
  if (!m) { m = S.mk(c.width, c.height); const g = m.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); flipCache.set(c, m); }
  return { canvas: m, ax: c.width - ax, ay };
}

// ------------------------------------------------------------------ drawing helpers

/** Old 16-px interface sprites (status signs, arrows, zzz) and the pixel font at twice their size. */
function big(ctx, x, y, fn) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(2, 2); fn(); ctx.restore(); }
const ui = (ctx, name, x, y) => big(ctx, x, y, () => S.draw(ctx, name, 0, 0));
const say = (ctx, str, x, y, color, align) => big(ctx, x, y, () => text(ctx, str, 0, 0, color, align));

/** Is a world rectangle on screen? */
let view = { x: -1e9, y: -1e9, w: 2e9, h: 2e9 };
const seen = (x, y, w, h, m = 0) => x + w > view.x - m && x < view.x + view.w + m && y + h > view.y - m && y < view.y + view.h + m;

// ------------------------------------------------------------------ the sky and the far mountains

function drawSky(ctx, t) {
  const s = sun();
  const sky = skyColors(s.elev);
  const X0 = -VW, w = W() + VW;              // the sky spans the valley and the mountain
  const g = ctx.createLinearGradient(0, -100, 0, GRASS);
  g.addColorStop(0, sky.top); g.addColorStop(1, sky.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(X0, -400, w, GRASS + 400);
  const day = daylight(s.elev);
  if (day < 0.6) {
    const r = S.rand(42);
    ctx.globalAlpha = 1 - day / 0.6;
    for (let i = 0; i < 220; i++) {
      const x = X0 + Math.floor(r() * w), y = Math.floor(r() * (GRASS - 80)) - 80;
      if ((Math.floor(t * 1.5) + i) % 11) { ctx.fillStyle = i % 7 ? '#d8d6f0' : '#fff6d6'; ctx.fillRect(x, y, i % 5 ? 1 : 2, i % 5 ? 1 : 2); }
    }
    ctx.globalAlpha = 1;
  }
  // sun and moon on an arc across the sky, following the real sun over Essen; the arc runs over the valley
  const arcX = (ha) => (X0 - FACE) / 2 + (ha / 110) * (VW * 0.7);
  if (s.elev > -4) Art.draw(ctx, 'sun', 0, arcX(s.hourAngle), GRASS - 60 - Math.max(-30, s.elev) * 12);
  else {
    const ha = s.hourAngle > 0 ? s.hourAngle - 180 : s.hourAngle + 180;
    Art.draw(ctx, 'moon', 0, arcX(ha), 140 + Math.abs(ha) * 4);
  }
  // soft clouds in daylight
  ctx.globalAlpha = 0.25 + day * 0.6;
  for (let i = 0; i < 7; i++) {
    const x = X0 + ((t * (4 + i * 1.2)) + i * 560) % (w + 160) - 80, y = 40 + i * 36;
    ctx.fillStyle = day > 0.4 ? '#ffffff' : '#a8a6c8';
    ctx.beginPath(); ctx.ellipse(x, y, 32, 8, 0, 0, Math.PI * 2); ctx.ellipse(x + 16, y - 6, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // the backdrop: peaks, range, hills, forest and the massif behind the hold, each sliding slower than the world
  const dusk = Math.max(0, 1 - Math.abs(s.elev - 2) / 9);
  BD.draw(ctx, view, { day, dusk, ground: GRASS, ref: { x: SURFACE.gate, y: GROUND - 220 }, place: { massif: -40 } });
}

// ------------------------------------------------------------------ the mountain and the rock inside it


/** Height of the mountain's surface at x (y of its top edge); Infinity where there is no mountain (the valley). */
export function mtop(x) {
  if (x < FACADE) return Infinity;
  if (x < 0) {
    // the rock over the gate wall, then a rough slope up to the shoulder over the first floor
    const k = Math.max(0, (x - FACADE) / -FACADE), top = GROUND - 304;
    return Math.round(top - (top - (SURF - 80)) * Math.pow(k, 0.75) + Math.sin(x / 12) * 4 + (x < FACADE + 8 ? 0 : Math.sin(x / 34) * 8));
  }
  const h = 80 + 200 * (1 - Math.exp(-x / 360)) + 84 * Math.max(0, Math.sin(x / 340 - 0.6)) + 12 * Math.sin(x / 46) + 6 * Math.sin(x / 18);
  return Math.round(SURF - h);
}

let shape = { key: '', path: null };
/** The rock: the mountain, and everything under the valley's soil. */
function rockShape() {
  const key = W() + 'x' + H();
  if (shape.key === key) return shape.path;
  const p = new Path2D();
  p.moveTo(-VW - 40, GROUND + 1); p.lineTo(FACADE, GROUND + 1);
  for (let x = FACADE; x <= W() + 4; x += 4) p.lineTo(x, mtop(x));
  p.lineTo(W() + 40, mtop(W())); p.lineTo(W() + 40, H() + 80); p.lineTo(-VW - 40, H() + 80); p.closePath();
  shape = { key, path: p };
  return p;
}
/** The stone of a depth: every two floors it gets harder (Rules.rockBand), rock_0 near the surface. */
const band = (fl) => Math.max(0, Math.min(3, Math.floor(fl / 2)));
const rockAt = (y) => 'rock_' + (y < SURF ? 0 : Math.min(4, band(Math.floor((y - SURF) / RH)) + (y >= H() ? 1 : 0)));

const patterns = new Map();
/** A repeating pattern of a rock tile, lined up with the world grid (x from 0, y from the surface line). */
function rockPattern(ctx, name) {
  if (patterns.has(name)) return patterns.get(name);
  const p = ctx.createPattern(Art.frame(name, 0).canvas, 'repeat');
  p.setTransform(new DOMMatrix().translate(0, SURF));
  patterns.set(name, p);
  return p;
}

function drawRock(ctx) {
  ctx.save();
  ctx.clip(rockShape());
  // one pattern fill per band of stone instead of single tiles: drawn tile by tile, a zoom between whole pixels
  // left thin light seams where the tiles met
  const th = RH, y0 = SURF + Math.floor((view.y - SURF) / th) * th;
  for (let y = y0; y < view.y + view.h; y += th) {
    ctx.fillStyle = rockPattern(ctx, rockAt(y));
    ctx.fillRect(view.x - 2, y, view.w + 4, th + 1);   // 1 px over the next band: no seam between them
  }
  // deeper is darker and cooler
  const fade = ctx.createLinearGradient(0, GROUND, 0, H());
  fade.addColorStop(0, 'rgba(20,12,30,0)'); fade.addColorStop(1, 'rgba(14,10,30,0.4)');
  ctx.fillStyle = fade; ctx.fillRect(view.x, GROUND, view.w, H() + 80 - GROUND);
  ctx.restore();
  // the mountain's skin: a lit rim, grass on the gentle parts, snow on the peaks, a few firs
  const xa = Math.max(FACADE, Math.floor(view.x / 2) * 2), xb = Math.min(W(), view.x + view.w);
  for (let x = xa; x < xb; x += 2) {
    const y = mtop(x);
    if (!isFinite(y) || y > view.y + view.h || y < view.y - 40) continue;
    const slope = Math.abs(mtop(x + 4) - mtop(x - 4)) / 8;
    ctx.fillStyle = '#a6abbe'; ctx.fillRect(x, y, 2, 3);
    ctx.fillStyle = 'rgba(29,20,32,0.3)'; ctx.fillRect(x, y + 3, 2, 5);
    if (y < SURF - 300) { ctx.fillStyle = '#f4f6fb'; ctx.fillRect(x, y, 2, 5 + Math.round((SURF - 300 - y) / 3)); }
    else if (slope < 1.2) { ctx.fillStyle = '#5b8350'; ctx.fillRect(x, y - 2, 2, 6); ctx.fillStyle = '#86b06a'; ctx.fillRect(x, y - 2, 2, 2); }
  }
  for (let x = Math.ceil(xa / 30) * 30; x < xb + 40; x += 30) {
    const y = mtop(x);
    if (!isFinite(y) || y < SURF - 290 || x < 0) continue;
    if (Math.abs(mtop(x + 8) - mtop(x - 8)) / 16 > 0.7 || S.hash('fir' + x) % 4) continue;
    Art.draw(ctx, 'fir', Math.floor(t0() * 2 + x) % 4, x, y + 6);
  }
  // the edge of the cut over the tunnel (the mountain's face left of it is seen from the front), and the cliff over
  // the gate wall's left tower
  const ct = mtop(-FACE);
  ctx.fillStyle = 'rgba(29,20,32,0.45)'; ctx.fillRect(-FACE, ct, 4, ftop(ENTRY) - ct);
  ctx.fillStyle = '#a6abbe'; ctx.fillRect(FACADE, mtop(FACADE), 2, GROUND - mtop(FACADE));
}
const t0 = () => performance.now() / 1000;

// ------------------------------------------------------------------ the valley

/** The valley: meadow, trees, the market stall, the well, the road, caravans and raiders. */
function drawSurface(ctx, t) {
  const f = F(), x0 = -VW, x1 = -FACE;
  Art.tile(ctx, 'meadow', x0, GRASS, x1 - x0 + 16);
  Art.draw(ctx, 'fence', 0, SURFACE.wall - 52, GRASS); Art.draw(ctx, 'fence', 0, SURFACE.wall, GRASS);
  for (const [name, x] of TREES) Art.draw(ctx, name, Math.floor(t * 2 + x) % 4, x, GRASS);
  for (const x of [-1200, -740]) Art.draw(ctx, 'bush', 0, x, GRASS);
  for (const x of [-1210, -760, -650]) Art.draw(ctx, 'flowers', 0, x, GRASS);
  Art.draw(ctx, 'well', 0, SURFACE.well, GRASS);
  Art.draw(ctx, 'stall', Math.floor(t * 3) % 4, SURFACE.stall, GRASS);
  drawStrangers(ctx, t, 'stall');
  Art.draw(ctx, 'signpost', 0, SURFACE.sign, GRASS);
  // caravans on the road, out to the left
  const tn = now();
  for (const c of f.caravans) {
    const out = c.state === 'outbound';
    const p = out ? (tn - c.departAt) / (c.arriveAt - c.departAt) : 1 - (tn - c.arriveAt) / (c.returnAt - c.arriveAt);
    const x = CARAVAN_HOME - Math.max(0, Math.min(1, p)) * (CARAVAN_HOME - SURFACE.wall + 80);
    Art.draw(ctx, 'wagon', 0, x, GRASS + (Math.floor(t * 4) % 2), { flip: out });
  }
  if (f.raid) {
    const p = Math.max(0, Math.min(1, (tn - f.raid.announcedAt) / (f.raid.arrivesAt - f.raid.announcedAt)));
    if (p > 0.5) for (let i = 0; i < 3; i++) Art.draw(ctx, 'goblin_scouts', Math.floor(t * 6 + i), -VW + 20 + (p - 0.5) * 120 + i * 30, GRASS);
  }
  if (f.siege) {
    for (let i = 0; i < 4; i++) Art.draw(ctx, 'goblin_scouts', Math.floor(t * 6 + i), -VW + 30 + i * 40, GRASS);
    Art.draw(ctx, 'brazier', Math.floor(t * 6) % 4, SURFACE.wall - 70, GRASS);
  }
}

// The merchant at the stall and travellers on the road. Not dwarves of the hold: their looks are fixed here.
const NPCS = [
  { id: 'merchant', look: { sex: 'f', hair: 'bun', ramps: { skin: ramp('#e2b08a'), hair: ramp('#c4622d'), tunic: ramp('#7d5a8a'), vest: ramp('#e7dbc5') } } },
  { id: 'pilgrim', look: { sex: 'm', hair: 'short', beard: 'long', hat: 'hood', prop: 'sack', ramps: { skin: ramp('#f0c8a0'), hair: ramp('#9a9a9a'), tunic: ramp('#8a7a5a'), metal: ramp('#5e6e4a'), cloth: ramp('#5e6e4a') } } },
  { id: 'bard', look: { sex: 'f', hair: 'long', ramps: { skin: ramp('#d9a77c'), hair: ramp('#e0b04a'), tunic: ramp('#466e98'), pants: ramp('#653f27') } } },
  { id: 'peddler', look: { sex: 'm', hair: 'short', beard: 'wide', hat: 'cap', prop: 'sack', ramps: { skin: ramp('#d9a77c'), hair: ramp('#7a3b1e'), tunic: ramp('#5e8f73'), pants: ramp('#6e5246') } } },
];

/** Where the strangers are now: the merchant beside the stall by day, travellers walking the road and resting. */
function drawStrangers(ctx, t, which) {
  const day = daylight(sun().elev) > 0.3;
  const placed = [];
  if (which === 'stall') {
    if (day) placed.push({ n: NPCS[0], x: SURFACE.stall - STALL_W / 2 - 16, pose: Math.floor(t / 3) % 4 === 0 ? 'talk' : 'idle', face: 1 });
  } else {
    // travellers: a slow walk along the road, a rest by the signpost, then back; each on its own clock
    const road0 = -VW + 20, road1 = SURFACE.sign + 40;
    NPCS.slice(1).forEach((n, i) => {
      const period = 140 + i * 37, k = ((t + i * 61) % period) / period;
      if (!day && i > 0) return;               // at night only the pilgrim is out
      let x, pose = 'walk', face = 1;
      if (k < 0.4) x = road0 + (road1 - road0) * (k / 0.4);
      else if (k < 0.55) { x = road1; pose = 'idle'; face = -1; }
      else if (k < 0.95) { x = road1 - (road1 - road0) * ((k - 0.55) / 0.4); face = -1; }
      else { x = road0; pose = 'idle'; }
      placed.push({ n, x: Math.round(x + i * 28), pose, face });
    });
  }
  for (const p of placed) {
    const L = p.pose === 'walk' ? { ...p.n.look, prop: null } : p.n.look;
    const fr = dwarfFrame(L, p.pose, Math.floor(t * (p.pose === 'walk' ? 8 : 2)), p.face < 0);
    S.groundShadow(ctx, p.x, GRASS, 10);
    ctx.drawImage(fr.canvas, Math.round(p.x - fr.ax), Math.round(GRASS - fr.ay));
  }
}

// ------------------------------------------------------------------ inside the mountain

/** A dug-out cell nobody built anything in yet: rough rock, and over time moss, mushrooms, roots, a wild cave. */
function drawCave(ctx, k, c, fl, since) {
  const x = c * CELL, y = ftop(fl), dark = band(fl);
  Art.tile(ctx, 'wall_rock', x, y, CELL); Art.tile(ctx, 'floor_earth', x, y + WALK, CELL);
  ctx.fillStyle = `rgba(16,10,20,${0.3 + dark * 0.06})`; ctx.fillRect(x, y, CELL, RH);
  const st = overgrowth(since), h = S.hash('g' + k);
  if (st >= 1) Art.draw(ctx, 'moss_' + Math.min(2, st - 1), 0, x + 24, y + 2, { flip: !!(h & 1) });
  if (st >= 2) { Art.draw(ctx, h & 2 ? 'glowshrooms' : 'roots', 0, x + 24, h & 2 ? y + WALK : y + 1); }
  if (st >= 3) { Art.draw(ctx, 'stalactites', 0, x + 24, y, { flip: !!(h & 4) }); if (h & 8) Art.draw(ctx, 'cobweb', 0, x, y); }
}

/** How overgrown an empty cave is: 0 fresh, 1 moss, 2 mushrooms and roots, 3 a wild cave. */
function overgrowth(since) {
  const hrs = (now() - since) / 3600, steps = (D().dig || {}).overgrowHours || [2, 8, 24];
  let s = 0;
  for (const h of steps) if (hrs >= h) s++;
  return s;
}

/** A room that stands still because no hallway, stairwell or shaft is beside it. */
export function roomActive(id) { const i = D().buildings[id]; return !i || i.active !== false; }

/** The entrance hall's look: 0 timber, 1 with torches, 2 grand (banners, braziers). */
const hallTier = (lvl) => Math.max(0, Math.min(2, lvl - 1));
/** The gate's level (1..4); from level 3 on braziers burn beside it. */
const gateLevel = () => Math.max(1, Math.min(4, levelOf('gate') || 1));
/** Which hallway template a cell uses: every fourth cell has a torch ('_lit'), the one two further on a banner or the
 * like ('_deco', where the style has one), the rest are plain. */
const hallVariant = (k) => { const c = +k.split(',')[0]; return c % 4 === 1 ? '_lit' : c % 4 === 3 ? '_deco' : ''; };

function drawUnderground(ctx, t, g, inRoom) {
  // the gate tunnel from the valley to the shaft; once built, the entrance hall in its look
  if (g.hall) { R.drawShell(ctx, g.hall, -FACE, ftop(ENTRY), FACE); R.drawProps(ctx, g.hall, -FACE, ftop(ENTRY), t); }
  else Art.tile(ctx, 'tunnel', -FACE, ftop(ENTRY), FACE);
  // hallways and caves
  for (const [k, v] of g.cells) {
    if (v.kind !== 'hall' && v.kind !== 'cave') continue;
    const [c, fl] = k.split(',').map(Number);
    if (!seen(c * CELL, ftop(fl), CELL, RH, 40)) continue;
    if (v.kind === 'cave') drawCave(ctx, k, c, fl, v.since);
    else { R.drawShell(ctx, v.tpl, c * CELL, ftop(fl), CELL, c * CELL); R.drawProps(ctx, v.tpl, c * CELL, ftop(fl), t + c * 0.37); }
  }
  for (const s of [...g.shafts, ...g.wells]) {
    const x0 = s.c * CELL, y0 = ftop(s.f), door = doorFrame(s);
    R.drawShell(ctx, s.tpl, x0, y0, 2 * CELL, x0);
    R.drawProps(ctx, s.tpl, x0, y0, t, { frameOf: (p) => (p.s.startsWith('stairdoor') ? door : null) });
  }
  for (const r of g.rooms) if (seen(r.x, r.y, r.pw, RH, 40)) drawRoom(ctx, t, r, inRoom.get(r.b.id) || []);
  drawEdges(ctx, g);
  drawMarks(ctx, t, g);
  drawCritters(ctx, t, g);
  Art.draw(ctx, 'gate', 0, SURFACE.gate, GROUND);
}

/** The right part of the gate wall, over the dwarves walking between the arch and the tunnel; braziers by the steps. */
function drawGateFront(ctx, t) {
  Art.draw(ctx, 'gate_front', 0, SURFACE.gate, GROUND);
  if (gateLevel() >= 3) for (const d of [-78, 78]) Art.draw(ctx, 'brazier', Math.floor(t * 6 + d) % 4, SURFACE.gate + d, GROUND);
}

/** Which space a cell belongs to: a room, or the open ways (hallways, stairwells, the shaft, the gate tunnel). */
function spaceOf(g, c, fl) {
  if (fl === ENTRY && c < 0 && c >= -FACE / CELL) return 'open';
  const v = fl >= 0 && g.cells.get(c + ',' + fl);
  return !v ? null : v.kind === 'room' ? 'room:' + v.id : v.kind === 'cave' ? 'cave' : 'open';
}
/** Walls between two spaces where one of them is a room: a pillar stands in front, with a door at its foot. */
function wallsOf(g) {
  const out = [];
  for (let fl = 0; fl < plan.floors; fl++) for (let c = 0; c < plan.cols - 1; c++) {
    const a = spaceOf(g, c, fl), b = spaceOf(g, c + 1, fl);
    if (a && b && a !== b && (a.startsWith('room:') || b.startsWith('room:'))) out.push({ c: c + 1, f: fl, x: (c + 1) * CELL });
  }
  return out;
}

const SHADE = 'rgba(16,10,24,';
/**
 * Depth: every room (and every run of hallways and stairwells) is a hollow in the rock, so all four of its inner
 * edges lie in shadow, in steps like pixel art light. Light comes from the top left: the ceiling throws the deepest
 * shadow, and the rock just right of an opening catches a little light.
 */
function drawEdges(ctx, g) {
  const walls = new Set(g.walls.map((w) => w.c + ',' + w.f));
  const top = [0.42, 0.3, 0.2, 0.12, 0.06], side = [0.34, 0.24, 0.15, 0.08, 0.04], bottom = [0.3, 0.18, 0.08];
  for (let fl = 0; fl < plan.floors; fl++) {
    const y = ftop(fl);
    if (!seen(view.x, y, view.w, RH, 10)) continue;
    let c = fl === ENTRY ? -FACE / CELL : 0;
    while (c < plan.cols) {
      const sp = spaceOf(g, c, fl);
      if (!sp) { c++; continue; }
      let e = c;
      while (e + 1 < plan.cols && spaceOf(g, e + 1, fl) === sp) e++;
      const x0 = c * CELL, x1 = (e + 1) * CELL, w = x1 - x0;
      if (seen(x0, y, w, RH, 10)) {
        for (let i = 0; i < top.length; i++) { ctx.fillStyle = SHADE + top[i] + ')'; ctx.fillRect(x0, y + i * 2, w, 2); }
        for (let i = 0; i < bottom.length; i++) { ctx.fillStyle = SHADE + bottom[i] + ')'; ctx.fillRect(x0, y + RH - 2 - i * 2, w, 2); }
        // the sides: from the rock edge, or from just behind the pillar where a wall parts two spaces
        const tunnelEnd = fl === ENTRY && c === -FACE / CELL;
        const li = walls.has(c + ',' + fl) ? 8 : 0, ri = walls.has((e + 1) + ',' + fl) ? 8 : 0;   // half a pillar
        if (!tunnelEnd) for (let i = 0; i < side.length; i++) { ctx.fillStyle = SHADE + side[i] + ')'; ctx.fillRect(x0 + li + i * 2, y, 2, RH); }
        for (let i = 0; i < side.length; i++) { ctx.fillStyle = SHADE + (side[i] * 0.8).toFixed(3) + ')'; ctx.fillRect(x1 - ri - (i + 1) * 2, y, 2, RH); }
      }
      c = e + 1;
    }
  }
}

/**
 * The wall between two spaces, seen end-on: a slim pillar (16 px) in the material of the room's back wall, so it
 * fits any wall. Its door cannot be seen while shut; it swings out towards you while a dwarf goes through.
 * Some pillars wear an iron band, a rune plate or a pennant (fixed per pillar).
 */
const PILLAR = { wall_rock: 'rock', wall_hewn: 'rock', wall_brick: 'brick', wall_ashlar: 'sand', wall_panel: 'oak',
  wall_plaster: 'oak', wall_slate: 'slate', wall_tile: 'stone' };
const PILLAR_DECO = [null, 'pillar_band', 'pillar_runes', 'pillar_banner'];
/** The back wall (tile name) of the space in a cell: a room's part, a hallway or a stairwell. */
function wallTileAt(g, c, fl) {
  const v = g.cells.get(c + ',' + fl);
  if (!v) return null;
  if (v.kind === 'room') {
    const r = g.rooms.find((q) => q.b.id === v.id), x = c * CELL;
    const p = r && (r.parts.find((q) => x >= q.x && x < q.x + q.w) || r.parts[r.parts.length - 1]);
    return p ? p.tpl.wall : null;
  }
  if (v.kind === 'hall') return v.tpl.wall;
  return v.well ? v.well.tpl.wall : null;
}
const wallDoors = new Map();   // "c,f" -> how far open (0 shut .. 3 open)
function drawWalls(ctx, dt) {
  const near = [...agents.values()].filter((a) => !a.hidden && a.f >= 0 && a.path.length);   // only dwarves on their way
  for (const w of G_.walls) {
    const k = w.c + ',' + w.f;
    const want = near.some((a) => a.f === w.f && Math.abs(a.x - w.x) < 30) ? 3 : 0;
    let v = wallDoors.get(k) || 0;
    v = want > v ? Math.min(want, v + dt * 16) : Math.max(want, v - dt * 9);
    if (v) wallDoors.set(k, v); else wallDoors.delete(k);
    if (!seen(w.x - 8, ftop(w.f), 40, RH, 10)) continue;
    // the room's side decides (left first); a pillar between two ways takes the left one
    const isRoom = (c) => (G_.cells.get(c + ',' + w.f) || {}).kind === 'room';
    const side = isRoom(w.c - 1) || !isRoom(w.c) ? w.c - 1 : w.c;
    const mat = PILLAR[wallTileAt(G_, side, w.f)] || 'sand';
    const y = ftop(w.f);
    Art.draw(ctx, 'divider_' + mat, Math.round(v), w.x, y + RH);
    const deco = PILLAR_DECO[S.hash('pillar' + k) % PILLAR_DECO.length];
    if (deco === 'pillar_banner') Art.draw(ctx, deco, 0, w.x, y + 12);
    else if (deco) Art.draw(ctx, deco, 0, w.x, y + 34);
  }
}

/** A room: wall, floor and back furniture, the dwarves in it, then the furniture in front of them; fire and smoke. */
function drawRoom(ctx, t, r, dwarves) {
  const b = r.b;
  for (const p of r.parts) { R.drawShell(ctx, p.tpl, p.x, r.y, p.w, p.x); R.drawProps(ctx, p.tpl, p.x, r.y, t, { layer: 'back' }); }
  for (const dw of dwarves) dw();
  for (const p of r.parts) R.drawProps(ctx, p.tpl, p.x, r.y, t, { layer: 'front' });
  // smoke, steam, sparks
  const f = F(), info = D().buildings[b.id] || {};
  const continuous = byId.buildings[b.type].kind === 'continuous';
  const workers = info.seats || info.workers || (info.worker ? [info.worker] : []);
  const rnd = Math.random;
  for (const p of r.parts) {
    const i = p.i, job = jobOf(b, i);
    const working = !f.siege && (job && !job.quenching || (continuous && workers[i] != null));
    for (const s of spotsOf(r, 'chimney', i)) if ((working || b.type === 'tavern') && rnd() < 0.25) particles.push({ x: s.x - 6 + rnd() * 12, y: s.y, vx: (rnd() - 0.5) * 6, vy: -12, life: 1.8, c: '#9a92a8', s: 2 });
    if (working) for (const s of spotsOf(r, 'anvil', i)) if (rnd() < 0.3) for (let k = 0; k < 3; k++) particles.push({ x: s.x, y: s.y, vx: (rnd() - 0.5) * 60, vy: -20 - rnd() * 28, life: 0.45, c: rnd() < 0.5 ? '#ffd98e' : '#fff6d6', g: 60 });
    if (job && job.quenching) for (const s of spotsOf(r, 'quench', i)) if (rnd() < 0.7) particles.push({ x: s.x - 6 + rnd() * 12, y: s.y, vx: (rnd() - 0.5) * 6, vy: -14, life: 1.2, c: '#e8eef4', s: 2 });
    if (working) for (const s of spotsOf(r, 'steam', i)) if (rnd() < 0.4) particles.push({ x: s.x - 6 + rnd() * 12, y: s.y, vx: (rnd() - 0.5) * 4, vy: -10, life: 1.4, c: '#e8eef4', s: 2 });
    if (working) for (const s of spotsOf(r, 'wheel', i)) if (rnd() < 0.5) particles.push({ x: s.x + (s.spot.flip ? -16 : 16), y: s.y + 6, vx: 20 + rnd() * 28, vy: -12, life: 0.4, c: '#fff6d6', g: 60 });
    if (working && (b.type === 'jeweler' || b.type === 'farm')) for (const s of spotsOf(r, 'work', i)) if (rnd() < 0.06) particles.push({ x: s.x - 8 + rnd() * 16, y: s.y - rnd() * 10, vx: 0, vy: b.type === 'farm' ? -6 : 0, life: 0.6, c: b.type === 'farm' ? '#c6e3b8' : '#ffffff' });
  }
}

/** Rock marked for digging: a chalk outline, cracks that spread as the miner works, and how far along it is. */
function drawMarks(ctx, t, g) {
  const secs = (D().dig || {}).seconds || [];
  const order = [...g.marks.keys()];
  for (const [k, work] of g.marks) {
    const [c, fl] = k.split(',').map(Number);
    const x = c * CELL, y = ftop(fl), p = Math.min(1, work / (secs[fl] || 300));
    if (!seen(x, y, CELL, RH, 20)) continue;
    // a dashed chalk outline around the marked stretch (no lines between marked neighbours), marching slowly
    ctx.fillStyle = 'rgba(251,244,230,0.75)';
    const off = Math.floor(t * 8) % 10;
    const dash = (x0, y0, len, horiz) => { for (let i = -off; i < len; i += 10) { const a = Math.max(0, i), b = Math.min(len, i + 5); if (b > a) horiz ? ctx.fillRect(x0 + a, y0, b - a, 2) : ctx.fillRect(x0, y0 + a, 2, b - a); } };
    dash(x, y + 6, CELL, true); dash(x, y + RH - 8, CELL, true);
    if (!g.marks.has((c - 1) + ',' + fl)) dash(x + 2, y + 6, RH - 12, false);
    if (!g.marks.has((c + 1) + ',' + fl)) dash(x + CELL - 4, y + 6, RH - 12, false);
    if (p > 0) {
      Art.draw(ctx, 'cracks_' + (1 + Math.min(2, Math.floor(p * 3))), 0, x + 24, y + 116);
      ctx.fillStyle = 'rgba(20,14,30,0.7)'; ctx.fillRect(x + 5, y + 18, CELL - 10, 5);
      ctx.fillStyle = '#e3c06e'; ctx.fillRect(x + 6, y + 19, Math.round((CELL - 12) * p), 3);
    } else say(ctx, String(order.indexOf(k) + 1), x + CELL / 2, y + 66, 'rgba(251,244,230,0.8)', 'center');
  }
}

/** Critters living in overgrown caves: they scuttle back and forth in their cave. */
const critterHits = [];
function drawCritters(ctx, t, g) {
  critterHits.length = 0;
  for (const cr of g.critters) {
    if (!Art.frames(cr.th.monster)) continue;
    // the stretch of cave it lives in
    let a = cr.c, b = cr.c;
    while (g.cells.get((a - 1) + ',' + cr.f)?.kind === 'cave') a--;
    while (g.cells.get((b + 1) + ',' + cr.f)?.kind === 'cave') b++;
    const span = Math.max(0, (b - a + 1) * CELL - 48), ph = t * 0.35 + cr.th.id;
    const k = (Math.sin(ph) + 1) / 2, face = Math.cos(ph) > 0 ? 1 : -1;
    const fr = Art.draw(ctx, cr.th.monster, Math.floor(t * 6), a * CELL + 24 + k * span, fy(cr.f), { flip: face < 0 });
    critterHits.push({ x: Math.round(a * CELL + 24 + k * span - fr.ax), y: Math.round(fy(cr.f) - fr.ay), w: fr.canvas.width, h: fr.canvas.height });
  }
}

/** Lights of a room: its template's light spots; fires burn low while their machine stands still. */
export function roomLights(r) {
  const b = r.b, out = [];
  const info = D().buildings[b.id] || {};
  const continuous = byId.buildings[b.type].kind === 'continuous';
  const workers = info.seats || info.workers || (info.worker ? [info.worker] : []);
  const heat = b.type === 'smelter' && G.heat ? G.heat(b.id) / 100 : 0;
  for (const s of r.spots) {
    if (s.kind !== 'light') continue;
    const fire = spotsOf(r, 'fire', s.machine).some((q) => Math.abs(q.x - s.x) < 40 && Math.abs(q.y - s.y) < 40);
    const working = jobOf(b, s.machine) || (continuous && workers[s.machine] != null) || b.type === 'tavern';
    const rr = s.spot.r || 90, col = s.spot.c || '#ffd98e', pw = s.spot.p ?? 0.8;
    if (fire && !working) { out.push({ x: s.x, y: s.y, r: rr * 0.45, color: col, power: 0.4 }); continue; }
    out.push({ x: s.x, y: s.y, r: rr * (1 + (fire ? heat : 0) * 0.35), color: col, flicker: fire ? 3 : 1, power: (fire ? 1.3 + heat : 0.6) * (0.5 + pw / 2) });
  }
  return out;
}

function drawParticles(ctx, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 6) * dt;
    ctx.globalAlpha = Math.min(1, p.life * 1.4);
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s || 1, p.s || 1);
  }
  ctx.globalAlpha = 1;
  if (particles.length > 500) particles.splice(0, particles.length - 500);
}

// ------------------------------------------------------------------ the screen object

let prevT = 0, G_ = null;
const drawn = [];   // dwarves drawn this frame, for hit tests: {id, sx, sy, spr, a}

/** Which room a point on a floor lies in. */
function roomOf(g, f, x) { return g.rooms.find((r) => r.f === f && x >= r.x && x < r.x + r.pw); }

// ------------------------------------------------------------------ the dark of the untouched mountain
// Rock nobody uses is black. From every dug space (rooms, hallways, stairwells, the shaft, the gate tunnel, caves)
// and from the open air one floor height (RH) can be seen, getting darker outwards. The valley is never dark.
// A coarse grid (FOG px) holds how far each spot is from the nearest seen space; one pixel per spot, scaled up smoothly.
const FOG = 24, FOG_REACH = RH;
let fog = { key: '', canvas: null, x0: 0, y0: 0 };
function fogMap(g) {
  const key = W() + 'x' + H() + '|' + [...g.cells.keys()].join(';');
  if (fog.key === key) return fog;
  const x0 = -VW - 2 * FOG, y0 = Math.floor((SURF - 420) / FOG) * FOG, x1 = W() + 2 * FOG, y1 = H() + 80;
  const nx = Math.ceil((x1 - x0) / FOG), ny = Math.ceil((y1 - y0) / FOG);
  const d = new Float32Array(nx * ny).fill(1e9);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + (i + 0.5) * FOG, y = y0 + (j + 0.5) * FOG;
    let open = x < -FACE ? y < GROUND : y < mtop(x);   // the sky and the valley; under the valley's soil it gets dark too
    if (!open && y >= SURF && y < H()) {
      const c = Math.floor(x / CELL), fl = Math.floor((y - SURF) / RH);
      open = g.cells.has(c + ',' + fl) || (fl === ENTRY && x >= -FACE && x < 0);
    }
    if (open) d[j * nx + i] = 0;
  }
  // two passes of a chamfer distance (1 and the diagonal), in grid steps
  const D2 = Math.SQRT2;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let v = d[j * nx + i];
    if (i > 0) v = Math.min(v, d[j * nx + i - 1] + 1);
    if (j > 0) { v = Math.min(v, d[(j - 1) * nx + i] + 1); if (i > 0) v = Math.min(v, d[(j - 1) * nx + i - 1] + D2); if (i < nx - 1) v = Math.min(v, d[(j - 1) * nx + i + 1] + D2); }
    d[j * nx + i] = v;
  }
  for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) {
    let v = d[j * nx + i];
    if (i < nx - 1) v = Math.min(v, d[j * nx + i + 1] + 1);
    if (j < ny - 1) { v = Math.min(v, d[(j + 1) * nx + i] + 1); if (i < nx - 1) v = Math.min(v, d[(j + 1) * nx + i + 1] + D2); if (i > 0) v = Math.min(v, d[(j + 1) * nx + i - 1] + D2); }
    d[j * nx + i] = v;
  }
  const c = document.createElement('canvas'); c.width = nx; c.height = ny;
  const cx = c.getContext('2d'), im = cx.createImageData(nx, ny);
  for (let k = 0; k < nx * ny; k++) {
    // the spot's centre is half a step inside the rock already: measure from the edge of the space
    const t = Math.max(0, Math.min(1, (d[k] * FOG - FOG / 2) / FOG_REACH));
    im.data[k * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t));
  }
  cx.putImageData(im, 0, 0);
  fog = { key, canvas: c, x0, y0, w: nx * FOG, h: ny * FOG };
  return fog;
}
function drawFog(ctx, g) {
  const m = fogMap(g);
  ctx.save();
  ctx.clip(rockShape());
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = G.build ? 0.55 : 1;   // while building, the rock to dig into shows through
  ctx.drawImage(m.canvas, m.x0, m.y0, m.w, m.h);
  ctx.restore();
}

export const holdScreen = {
  camera: true,
  size: () => ({ w: W(), h: H() }),
  bounds: () => ({ x0: -VW, y0: -80, x1: W(), y1: H() + 20 }),
  home(r) {
    // start at the gate: the valley on the left, the mountain with the first floors on the right
    const zoom = 1, vw = r.width / zoom, vh = r.height / zoom;
    if (vw < 720) return { zoom, x: -32, y: ftop(0) - 80 };   // narrow screens: the rooms first, the valley is a drag away
    return { zoom, x: Math.max(-VW, FACADE - Math.min(160, vw * 0.12)), y: Math.max(ftop(0) - 80, GROUND + 60 - vh) };
  },
  draw(ctx, t, v) {
    view = v;
    G_ = grid();
    const dt = Math.min(0.2, t - prevT); prevT = t;
    updateAgents(G_, dt);
    drawn.length = 0;
    // every dwarf: drawn inside its room between the back and front furniture, the others after the rock
    const f = F(), nowMs = performance.now();
    const inRoom = new Map(), outside = [];
    const list = [...agents.values()].filter((a) => !a.hidden && !(a.mode === 'well' && nowMs - a.wellAt > FADE)).sort((a, b) => a.y - b.y);
    for (const a of list) {
      const d = f.dwarves.find((x) => x.id === a.id);
      if (!d || !seen(a.x - 40, a.y - 70, 80, 80)) continue;
      const paint = () => {
        const fr = agentFrame(d, a);
        // stepping into the dark of an arch, or out of it
        const k = a.mode === 'well' ? 1 - (nowMs - a.wellAt) / FADE : a.emerge && nowMs - a.emerge < FADE ? (nowMs - a.emerge) / FADE : 1;
        ctx.globalAlpha = Math.max(0, Math.min(1, k));
        const sleeping = a.want && a.want.sleep && !a.mode;
        if (!sleeping) S.groundShadow(ctx, a.x, a.y, 10);
        const sx = Math.round(a.x - fr.ax), sy = Math.round(a.y - fr.ay);
        ctx.drawImage(fr.canvas, sx, sy);
        ctx.globalAlpha = 1;
        if (a.mode !== 'well') drawn.push({ id: a.id, sx, sy, spr: fr.canvas, a });
      };
      const r = a.f >= 0 && roomOf(G_, a.f, a.x);
      if (r) { if (!inRoom.has(r.b.id)) inRoom.set(r.b.id, []); inRoom.get(r.b.id).push(paint); } else outside.push(paint);
    }
    drawSky(ctx, t);
    drawRock(ctx);
    drawSurface(ctx, t);
    drawUnderground(ctx, t, G_, inRoom);
    drawStrangers(ctx, t, 'road');
    for (const p of outside) p();
    drawGateFront(ctx, t);
    drawWalls(ctx, dt);
    drawParticles(ctx, dt);
  },
  ambient(t) {
    const day = daylight(sun().elev);
    // the sky goes dark at night; inside the mountain it is always dim. The mountain's outline is stepped.
    const sky = { color: '#0e1236', a: 0.62 * (1 - day) }, rock = { color: '#140f20', a: 0.38 + 0.14 * (1 - day) };
    const out = [
      { ...sky, x0: -VW - 50, x1: -FACE, y0: -600, y1: GROUND + 1 },
      { ...rock, x0: -VW - 50, x1: -FACE, y0: GROUND + 1, y1: H() + 80 },
    ];
    for (let x = -FACE; x < W(); x += 6) {
      const top = Math.max(mtop(x), mtop(x + 3), mtop(x + 5));
      out.push({ ...sky, x0: x, x1: x + 6, y0: -600, y1: top });
      out.push({ ...rock, x0: x, x1: x + 6, y0: top, y1: H() + 80 });
    }
    return out;
  },
  lights() {
    if (!G_) return [];
    const out = [];
    const f = F();
    for (const r of G_.rooms) out.push(...roomLights(r));
    for (const [k, v] of G_.cells) {
      if (v.kind !== 'hall') continue;
      const [c, fl] = k.split(',').map(Number);
      out.push(...tplLights(v.tpl, c * CELL, ftop(fl)));
    }
    for (const w of [...G_.wells, ...G_.shafts]) out.push(...tplLights(w.tpl, w.c * CELL, ftop(w.f)));
    for (const w of [...G_.wells, ...G_.shafts]) {
      if ((wellLit.get(wellKey(w)) || 0) > performance.now()) out.push({ x: w.x, y: ftop(w.f) + 100, r: 50, color: '#ffb070', power: 0.8 });
    }
    if (G_.hall) out.push(...tplLights(G_.hall, -FACE, ftop(ENTRY)));
    if (gateLevel() >= 3) for (const d of [-78, 78]) out.push({ x: SURFACE.gate + d, y: GROUND - 30, r: 90, color: '#ffb070', flicker: 2 });
    const day = daylight(sun().elev);
    if (day < 0.8) {
      out.push({ x: SURFACE.stall, y: GRASS - 40, r: 80, color: '#ffd98e', flicker: 1, power: 0.8 });
      if (f.siege) out.push({ x: SURFACE.wall - 70, y: GRASS - 24, r: 110, color: '#ff8a4a', flicker: 3, power: 1.4 });
      out.push({ x: SURFACE.gate, y: GROUND - 50, r: 70, color: '#ffd98e', flicker: 1, power: 0.8 });
    }
    // little lamps on miner helmets
    for (const dw of drawn) { const d = f.dwarves.find((x) => x.id === dw.id); if (d && d.job === 'miner' && d.helm) out.push({ x: dw.a.x + (dw.a.face > 0 ? 4 : -4), y: dw.sy + 14, r: 22, color: '#fff0c0' }); }
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
    for (const type of ['gate', 'entrance_hall']) {
      const b = F().buildings.find((q) => q.type === type), r = b && fixedRect(type);
      if (r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return { kind: 'room', id: b.id, rect: [r.x, r.y, r.w, r.h], round: true };
    }
    const st = stallRect();
    if (x >= st.x && x < st.x + st.w && y >= st.y && y < st.y + st.h) return { kind: 'tab', id: 'trade', rect: [st.x, st.y, st.w, st.h], round: true };
    if (x >= 0 && x < plan.shaft * CELL && y >= SURF) return { kind: 'tab', id: 'mines', rect: [0, SURF, plan.shaft * CELL, H() - SURF] };
    return null;
  },
  overlay(ctx, t, hover, mouse) {
    if (!G_) return;
    const f = F();
    const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy).length;
    drawFog(ctx, G_);
    if (G_.hall) R.drawProps(ctx, G_.hall, -FACE, ftop(ENTRY), t, { glow: true });
    for (const [k, v] of G_.cells) {
      if (v.kind !== 'hall') continue;
      const [c, fl] = k.split(',').map(Number);
      if (seen(c * CELL, ftop(fl), CELL, RH, 40)) R.drawProps(ctx, v.tpl, c * CELL, ftop(fl), t + c * 0.37, { glow: true });
    }
    for (const w of [...G_.wells, ...G_.shafts]) R.drawProps(ctx, w.tpl, w.c * CELL, ftop(w.f), t, { glow: true, frameOf: (p) => (p.s.startsWith('stairdoor') ? doorFrame(w) : null) });
    for (const r of G_.rooms) {
      if (!seen(r.x, r.y, r.pw, RH, 40)) continue;
      // what glows in the dark (fire, embers, mushrooms) is not dimmed by the lighting
      for (const p of r.parts) R.drawProps(ctx, p.tpl, p.x, r.y, t, { glow: true });
      if (!roomActive(r.b.id)) { ctx.fillStyle = 'rgba(20,14,30,0.35)'; ctx.fillRect(r.x, r.y + 16, r.pw, RH - 16); }
      const st = roomStatus(r.b, idle);
      if (st === 'run') ui(ctx, 'arrow_' + (Math.floor(t * 3) % 2), r.x + r.pw / 2 - 10, r.y + 22);
      else if (st) statusIcon(ctx, t, st, r.x + r.pw / 2, r.y + 20);
      if (!roomActive(r.b.id)) continue;
      machineOverlay(ctx, t, r);
      if (f.siege && byId.buildings[r.b.type].kind !== 'passive') { ctx.fillStyle = 'rgba(169,71,60,0.25)'; ctx.fillRect(r.x, r.y, r.pw, RH); }
    }
    for (const type of ['entrance_hall', 'gate']) {
      const b = f.buildings.find((q) => q.type === type), st = b && roomStatus(b, idle), rr = b && fixedRect(type);
      if (st && st !== 'run' && rr) statusIcon(ctx, t, st, rr.x + rr.w / 2, rr.y + 20);
    }
    // idle dwarves: grey dots over the head; sleepers: zzz
    for (const dw of drawn) {
      const x = f.dwarves.find((q) => q.id === dw.id);
      if (x && x.job === 'idle' && !(dw.a.want && dw.a.want.sleep)) ui(ctx, 'ui_idle', dw.a.x - 16, dw.sy + 2 + Math.round(Math.sin(t * 2 + dw.id) * 2));
    }
    for (const dw of drawn) if (dw.a.want && dw.a.want.sleep && !dw.a.mode) {
      const k = (t * 0.7 + dw.id * 0.3) % 1;
      ctx.globalAlpha = 1 - k; ui(ctx, 'zzz', dw.sx + 20 + k * 8, dw.sy - 10 - k * 20); ctx.globalAlpha = 1;
    }
    if (G.build) buildOverlay(ctx, t, mouse);
  },
  click(x, y, hit) { return G.build ? buildClick(x, y, hit) : false; },
  dragging(p) { return !!(G.build && ['dig', 'hall', 'fill'].includes(G.build.tool) && p && cellAt(p.x, p.y)); },
  paint(p, phase) { buildPaint(p, phase); },
  cancel() { if (G.build) { G.build.held = null; if (G.onBuildChange) G.onBuildChange(); } },
};

/** The market stall in world pixels (clicking it opens the Trade tab). */
function stallRect() { return { x: SURFACE.stall - STALL_W / 2 - 4, y: GRASS - 70, w: STALL_W + 8, h: 72 }; }

/** The bellows of a smelter and the quench barrel of a forge waiting for it: things you use by clicking. */
function machineHit(r, x, y) {
  const b = r.b;
  if (F().siege) return null;
  const inside = (rx, ry, rw, rh) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
  if (b.type === 'smelter') {
    // the bellows, and the fire of every furnace (machine bays have no bellows of their own)
    const boxes = [...spotsOf(r, 'bellows').map((s) => [s.x - 22, s.y - 30, 44, 50]),
      ...spotsOf(r, 'fire').map((s) => [s.x - (s.spot.w || 30) / 2 - 8, s.y - 40, (s.spot.w || 30) + 16, 70])];
    for (const bx of boxes) if (inside(...bx)) return { kind: 'bellows', id: b.id, rect: bx.map(Math.round), round: true };
  }
  if (b.type === 'forge') for (let i = 0; i < Math.max(1, b.machines || 1); i++) {
    const job = jobOf(b, i), q = spotsOf(r, 'quench', i)[0];
    if (!job || !job.quenching || !q) continue;
    const bx = [q.x - 20, q.y - 26, 40, 50];
    if (inside(...bx)) return { kind: 'quench', id: b.id, machine: i, rect: bx.map(Math.round), round: true };
  }
  return null;
}

/** Heat gauge beside the furnace, and a blinking QUENCH over a forge with hot metal. */
function machineOverlay(ctx, t, r) {
  const b = r.b;
  if (b.type === 'smelter') {
    const heat = G.heat ? G.heat(b.id) : 0;
    const tx = r.x + r.parts[0].w - 22, ty = r.y + 36, hh = 70;
    ctx.fillStyle = '#1d1b2c'; ctx.fillRect(tx - 2, ty - 2, 10, hh + 10);
    ctx.fillStyle = '#33364a'; ctx.fillRect(tx, ty, 6, hh);
    const fill = Math.round((heat / 100) * (hh - 2));
    for (let i = 0; i < fill; i++) { ctx.fillStyle = S.mix('#a9473c', '#ffd98e', i / hh); ctx.fillRect(tx + 1, ty + hh - 1 - i, 4, 1); }
    ctx.fillStyle = heat > 5 ? '#d9704a' : '#623e45'; ctx.fillRect(tx - 2, ty + hh, 10, 6);
  }
  if (b.type === 'forge' && Math.floor(t * 3) % 2) for (let i = 0; i < Math.max(1, b.machines || 1); i++) {
    const job = jobOf(b, i), q = spotsOf(r, 'quench', i)[0];
    if (job && job.quenching && q) big(ctx, q.x, q.y - 50, () => sign(ctx, 'QUENCH!', 0, 0, '#e3c06e'));
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
  return best && bd < 320 ? best.b : null;
}

const alphaCache = new WeakMap();
function opaque(spr, x, y) {
  let d = alphaCache.get(spr);
  if (!d) { d = spr.getContext('2d').getImageData(0, 0, spr.width, spr.height).data; alphaCache.set(spr, d); }
  x = Math.floor(x); y = Math.floor(y);
  return x >= 0 && y >= 0 && x < spr.width && y < spr.height && d[(y * spr.width + x) * 4 + 3] > 0;
}


/**
 * What a room shows over its door:
 *   'stop'  red octagon: it stopped (cut off from the hallways, orders it cannot work on, the warehouse is full);
 *   'warn'  yellow triangle: something wants you (a decision, a rule that broke, a critter and nobody on guard);
 *   'good'  green circle with !: something is done and waits for you (loot to collect, hot metal to quench);
 *   'run'   green arrow: it stands still, but could run right now;
 *   'idle'  grey dots: nothing to do, and nothing it needs to do;
 *   null    working, or nothing to say.
 */
export function roomStatus(b, idle) {
  const f = F(), t = byId.buildings[b.type], info = D().buildings[b.id] || {};
  if (!roomActive(b.id)) return 'stop';
  if (b.type === 'warehouse' && f.storageFull) return 'stop';
  const reports = f.reports || [];
  if (b.type === 'trade_depot' && (f.rules || []).some((x) => x.on && /deleted|don't know/.test(x.status || ''))) return 'warn';
  if (b.type === 'trade_depot' && reports.some((x) => x.kind === 'caravan')) return 'good';
  if (b.type === 'expedition_hall' && f.expeditions.some((e) => e.state === 'active' && e.stages[e.next] && e.stages[e.next].kind === 'choice' && !e.stages[e.next].chosen)) return 'warn';
  if (b.type === 'expedition_hall' && reports.some((x) => x.kind === 'expedition')) return 'good';
  if (b.job && b.job.quenching) return 'good';
  if (b.type === 'entrance_hall' && (f.threats || []).some((x) => x.cell) && !f.dwarves.some((x) => x.job === 'warrior' && x.post === 'hall')) return 'warn';
  if (t.kind === 'passive' || f.siege) return null;
  if (canRun(b, idle)) return 'run';
  if (t.kind === 'continuous') return info.worker ? null : 'idle';
  if (b.job || (b.more || []).some(Boolean)) return null;
  return b.queue.length ? 'stop' : 'idle';     // orders waiting for materials or a worker: stopped; no orders: resting
}

/** A status sign (ui_stop, ui_warn, ui_good, ui_idle) centred on x, bobbing a little. */
function statusIcon(ctx, t, st, x, y) {
  const w = S.sprite('ui_' + st).width;   // drawn at twice its size
  ui(ctx, 'ui_' + st, x - w, y + (st === 'idle' ? 0 : Math.round(Math.sin(t * 3) * 2)));
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
    if (g.room) {
      ctx.save(); ctx.globalAlpha = 0.55;
      for (const p of g.room.parts) { const px = x + p.x - g.room.x; R.drawShell(ctx, p.tpl, px, y, p.w, px); R.drawProps(ctx, p.tpl, px, y, t); }
      ctx.restore();
    }
    const col = g.ok ? [144, 224, 140] : g.warn ? [240, 168, 90] : [217, 112, 74];
    ctx.fillStyle = `rgba(${col},0.28)`;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = `rgb(${col})`;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    if (g.why) say(ctx, g.why, x, y - 14, `rgb(${col})`);
  }
  const st = G.build.stroke;
  if (st) {
    const n = st.cells.size, tool = G.build.tool;
    ctx.fillStyle = tool === 'fill' || st.unmark ? 'rgba(217,112,74,0.35)' : 'rgba(144,224,140,0.35)';
    for (const c of st.cells.keys()) ctx.fillRect(c * CELL + 1, ftop(st.f) + 1, CELL - 2, RH - 2);
    const at = (st.last ?? st.from) * CELL, ty = ftop(st.f) - 14;
    if (tool === 'hall' && n) {
      const cost = (D().layoutCosts || {}).hall, can = cost ? Math.floor(F().coins / cost.coins) : n;
      say(ctx, n + ' CELLS ' + moneyText(n * (cost ? cost.coins : 0)) + (can < n ? ' - ONLY ' + can : ''), at, ty, can < n ? '#ff9a7a' : '#fbf4e6');
    }
    if (tool === 'dig' && n && !st.unmark) {
      const dig = D().dig || {}, secs = (dig.seconds || [])[st.f] || 300, m = Math.max(1, dig.miners || 0);
      say(ctx, n + ' CELLS ABOUT ' + Math.ceil(n * secs / Math.min(m, n) / 60) + ' MIN' + (dig.miners ? '' : ' - NO MINERS'), at, ty, dig.miners ? '#fbf4e6' : '#ff9a7a');
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
  if (r) return { x: r.x, y: r.y, w: r.pw, h: RH };
  const b = F().buildings.find((q) => q.id === id);
  return b ? fixedRect(b.type) : null;
}

/** Buildings that are not on the grid: the entrance hall (the gate tunnel) and the gate in the mountain face. */
function fixedRect(type) {
  if (type === 'entrance_hall') return { x: -FACE, y: ftop(ENTRY), w: FACE, h: RH };
  if (type === 'gate') { const s = Art.frame('gate', 0); return { x: SURFACE.gate - s.ax, y: GROUND - s.ay + 1, w: s.canvas.width, h: s.canvas.height }; }
  return null;
}

/** World position of a room (for focusing the camera). */
export function roomCenter(id) {
  const g = G_ || grid();
  const r = g.rooms.find((q) => q.b.id === id);
  if (r) return { x: r.x + r.pw / 2, y: r.y + RH / 2 };
  const q = roomRect(id);
  return q ? { x: q.x + q.w / 2, y: q.y + q.h / 2 } : null;
}

export { fullName, text };
