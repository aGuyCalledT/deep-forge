// The canvas screens: the hold (surface and carved halls), the mines, and one workshop up close.
// G.screen picks the screen: 'hold' | 'mines' | 'workshop' (G.ws = building id).
import { G, F, D, byId, now, contextResources, stock, fmt } from './data.js';
import * as S from './sprites.js';
import { hall, anchors } from './halls.js';

const SKY = 64;          // surface line on the hold screen
const ROOM_H = 38;       // room height incl. floor
const SLAB = 4;          // rock between floors
const STAIR_W = 12;      // stairwell on the left
const LAYER_H = 62;
const SHAFT_X = 4, SHAFT_W = 12;
const MINE_TOP = 34;
export const HALL_ORDER = ['tavern', 'quarters', 'warehouse', 'vault', 'smelter', 'forge', 'grindstone', 'engraver', 'jeweler', 'farm', 'brewery', 'barracks'];
const ROOM_W = { tavern: 70, quarters: 58, warehouse: 52, vault: 34, smelter: 52, forge: 52, grindstone: 40, engraver: 42, jeweler: 46, farm: 56, brewery: 50, barracks: 50 };

let canvas, ctx, wrap, onPick;
let LW = 200, LH = 400, scale = 2;
let rects = [];
let last = 0;
let mode = null;
const particles = [];

export function initScene(c, w, pick) {
  canvas = c; wrap = w; onPick = pick;
  ctx = canvas.getContext('2d');
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    for (let i = rects.length - 1; i >= 0; i--) {
      const q = rects[i];
      if (x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h) { onPick(q); return; }
    }
  });
  window.addEventListener('resize', () => { last = 0; });
  requestAnimationFrame(loop);
}

function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - last < 66 || !G.state || document.hidden) return; // ~15 fps is plenty for pixel art
  last = ts;
  draw(ts / 1000);
}

function size(targetScale, h) {
  const cw = Math.max(200, wrap.clientWidth);
  scale = targetScale(cw);
  LW = Math.floor(cw / scale);
  LH = h;
  if (canvas.width !== LW || canvas.height !== LH) {
    canvas.width = LW; canvas.height = LH;
    canvas.style.width = LW * scale + 'px';
    canvas.style.height = LH * scale + 'px';
  }
}

// ------------------------------------------------------------------ 3x5 pixel font

const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', '/': '001001010100100', ':': '000010000010000', '.': '000000000000010', '-': '000000111000000',
  '+': '000010111010000', '!': '010010010000010', '?': '110001010000010', '%': '101001010100101', "'": '010010000000000',
  ' ': '000000000000000',
};

export function textWidth(t) { return String(t).length * 4 - 1; }

function text(t, x, y, color = '#f3e9d2', align = 'left', shadow = true) {
  t = String(t).toUpperCase();
  const w = textWidth(t);
  const x0 = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  for (const pass of shadow ? [0, 1] : [1]) {
    ctx.fillStyle = pass ? color : '#0c090e';
    let cx = x0 + (pass ? 0 : 1);
    for (const ch of t) {
      const g = GLYPHS[ch] || GLYPHS['?'];
      for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3), y + Math.floor(i / 3) + (pass ? 0 : 1), 1, 1);
      cx += 4;
    }
  }
}

/** A small hanging wooden sign with a label. */
function sign(t, cx, y, color = '#f3e9d2') {
  const w = textWidth(t) + 6;
  const x = Math.round(cx - w / 2);
  ctx.fillStyle = '#5a5862'; ctx.fillRect(x + 2, y - 3, 1, 3); ctx.fillRect(x + w - 3, y - 3, 1, 3);
  ctx.fillStyle = '#0c090e'; ctx.fillRect(x - 1, y - 1, w + 2, 9);
  ctx.fillStyle = '#6a4424'; ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(x, y, w, 1);
  text(t, x + 3, y + 1, color, 'left', false);
}

// ------------------------------------------------------------------ sky & surface

function skyColors() {
  const d = new Date();
  const h = d.getHours() + d.getMinutes() / 60;
  const keys = [
    [0, '#0a0c1c', '#1a1a34'], [5, '#141a3a', '#3a3050'], [6.5, '#d88a6a', '#f0c890'], [8, '#6aa8e0', '#bfe0f0'],
    [17, '#6aa8e0', '#cfe6f0'], [19, '#d0704a', '#f0b070'], [20.5, '#22204a', '#4a3050'], [24, '#0a0c1c', '#1a1a34']];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, t1, b1] = keys[i], [b, t2, b2] = keys[i + 1];
    if (h >= a && h <= b) {
      const k = (h - a) / (b - a);
      return { top: S.mix(t1, t2, k), bottom: S.mix(b1, b2, k), night: h < 6 || h > 20 };
    }
  }
  return { top: '#0a0c1c', bottom: '#1a1a34', night: true };
}

function drawSky(t, bottom) {
  const sky = skyColors();
  for (let y = 0; y < bottom; y++) {
    ctx.fillStyle = S.mix(sky.top, sky.bottom, y / bottom);
    ctx.fillRect(0, y, LW, 1);
  }
  if (sky.night) {
    const r = S.rand(42);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * LW), y = Math.floor(r() * (bottom - 20));
      if ((Math.floor(t * 2) + i) % 9 !== 0) { ctx.fillStyle = i % 5 ? '#c8c8e0' : '#ffffff'; ctx.fillRect(x, y, 1, 1); }
    }
    const mx = LW - 30, my = 8;
    ctx.fillStyle = '#f0ecd8';
    ['01110', '11111', '11111', '11111', '01110'].forEach((r2, y) => [...r2].forEach((c, x) => { if (c === '1') ctx.fillRect(mx + x, my + y, 1, 1); }));
    ctx.fillStyle = S.mix(sky.top, sky.bottom, 0.15);
    ['0111', '1111', '1111', '0111'].forEach((r2, y) => [...r2].forEach((c, x) => { if (c === '1') ctx.fillRect(mx + 2 + x, my - 1 + y, 1, 1); }));
  } else {
    ctx.fillStyle = '#fff4c0'; ctx.fillRect(LW - 34, 8, 8, 8); ctx.fillStyle = '#ffe080'; ctx.fillRect(LW - 33, 9, 6, 6);
    for (let i = 0; i < 3; i++) {
      const x = ((t * (2 + i)) + i * 90) % (LW + 40) - 30, y = 6 + i * 9;
      ctx.fillStyle = '#ffffffcc';
      ctx.fillRect(x, y, 18, 3); ctx.fillRect(x + 4, y - 2, 9, 2); ctx.fillRect(x + 2, y + 3, 14, 1);
    }
  }
  ridge(sky.night ? '#1c1a2c' : '#5a6a88', bottom - 28, 13, 0.9, bottom);
  ridge(sky.night ? '#14121e' : '#3e4258', bottom - 16, 29, 1.6, bottom);
  ctx.fillStyle = '#4a3e3a'; ctx.fillRect(0, bottom - 4, LW, 4);
  ctx.fillStyle = sky.night ? '#2a4a2a' : '#4a8a3a'; ctx.fillRect(0, bottom - 5, LW, 2);
}

function ridge(color, base, seed, amp, bottom) {
  const r = S.rand(seed);
  ctx.fillStyle = color;
  let h = 8;
  for (let x = 0; x < LW; x++) {
    h += (r() - 0.5) * 3 * amp;
    h = Math.max(2, Math.min(22, h));
    ctx.fillRect(x, base - Math.floor(h), 1, bottom - base + Math.floor(h));
  }
}

function levelOf(type) {
  let l = 0;
  for (const b of F().buildings) if (b.type === type) l = Math.max(l, b.level);
  return l;
}

function drawSurface(t) {
  const f = F();
  const frame = Math.floor(t * 3) % 2;
  const doorX = 2;
  ctx.fillStyle = '#2a201c'; ctx.fillRect(doorX + 2, SKY - 18, 12, 14);
  ctx.fillStyle = '#5a4a40'; ctx.fillRect(doorX, SKY - 20, 16, 2); ctx.fillRect(doorX, SKY - 20, 2, 16); ctx.fillRect(doorX + 14, SKY - 20, 2, 16);
  ctx.fillStyle = '#ffb040'; ctx.fillRect(doorX + 6, SKY - 12, 4, 4);
  ctx.drawImage(S.torch(Math.floor(t * 6) + 1), doorX + 17, SKY - 22);

  const tpX = 30;
  ctx.drawImage(S.room('trading_post', 22, 16, true), tpX, SKY - 20);
  rects.push({ x: tpX, y: SKY - 20, w: 22, h: 16, kind: 'tab', id: 'trade' });
  f.dwarves.filter((d) => d.job === 'merchant' && !d.busy).slice(0, 2).forEach((d, i) =>
    ctx.drawImage(S.dwarfSprite(d, 'stand', 0), tpX + 22 + i * 9, SKY - 21));
  const t0 = now();
  for (const c of f.caravans) {
    const out = c.state === 'outbound';
    const p = out ? (t0 - c.departAt) / (c.arriveAt - c.departAt) : 1 - (t0 - c.arriveAt) / (c.returnAt - c.arriveAt);
    const x = tpX + 24 + Math.max(0, Math.min(1, p)) * (LW - tpX - 70);
    ctx.save();
    if (!out) { ctx.translate(Math.round(x) + 20, 0); ctx.scale(-1, 1); ctx.drawImage(S.wagon(frame), 0, SKY - 17); } else ctx.drawImage(S.wagon(frame), Math.round(x), SKY - 17);
    ctx.restore();
  }

  const exX = Math.min(LW - 80, Math.max(80, Math.floor(LW * 0.45)));
  ctx.drawImage(S.room('expedition_hall', 22, 16, true), exX, SKY - 20);
  rects.push({ x: exX, y: SKY - 20, w: 22, h: 16, kind: 'tab', id: 'explore' });

  const wl = levelOf('walls');
  const gx = LW - 26;
  if (wl > 0) {
    ctx.fillStyle = '#6a625e'; ctx.fillRect(gx, SKY - 24, 22, 20);
    for (let x = gx; x < gx + 22; x += 4) { ctx.fillStyle = '#7a726e'; ctx.fillRect(x, SKY - 27, 3, 3); }
    ctx.fillStyle = '#4a4240'; for (let y = SKY - 20; y < SKY - 4; y += 4) ctx.fillRect(gx, y, 22, 1);
    ctx.fillStyle = f.siege ? '#2a1a14' : '#5a3a1a'; ctx.fillRect(gx + 7, SKY - 14, 8, 10);
  } else {
    ctx.fillStyle = '#6a4a2a'; for (let x = gx; x < gx + 22; x += 5) ctx.fillRect(x, SKY - 12, 2, 8);
    ctx.fillRect(gx, SKY - 10, 22, 1);
  }
  rects.push({ x: gx - 20, y: SKY - 30, w: 46, h: 28, kind: 'tab', id: 'war' });
  const gate = f.dwarves.filter((d) => d.job === 'warrior' && d.post === 'fortress' && !d.busy);
  gate.slice(0, 5).forEach((d, i) => ctx.drawImage(S.dwarfSprite(d, 'stand', 0), gx - 14 - i * 9, SKY - 21));
  if (f.raid) {
    const p = Math.max(0, Math.min(1, (t0 - f.raid.announcedAt) / (f.raid.arrivesAt - f.raid.announcedAt)));
    if (p > 0.6) for (let i = 0; i < 3; i++) ctx.drawImage(S.monster('goblin_scouts', frame), LW - 6 - (p - 0.6) * 30 + i * 6, SKY - 17);
    text('RAID ' + Math.ceil((f.raid.arrivesAt - t0) / 60) + 'M', gx - 30, 2, '#e05a4f');
  }
  if (f.siege) {
    for (let i = 0; i < 4; i++) ctx.drawImage(S.monster('goblin_scouts', (frame + i) % 2), gx - 50 + i * 9, SKY - 17);
    ctx.fillStyle = '#e2622b'; ctx.fillRect(gx - 58, SKY - 8 - frame, 3, 3 + frame);
    text('SIEGE', gx - 50, 2, '#e05a4f');
  }
}

// ------------------------------------------------------------------ hold: carved halls

function hallBuildings() {
  return F().buildings.filter((b) => b.level > 0 && HALL_ORDER.includes(b.type))
    .sort((a, b) => HALL_ORDER.indexOf(a.type) - HALL_ORDER.indexOf(b.type) || a.id.localeCompare(b.id));
}

/** Rooms fill each floor from wall to wall; the last room on a floor stretches to the end. */
function hallLayout() {
  const list = hallBuildings();
  const avail = LW - STAIR_W - 2;
  const floors = [];
  let row = [], used = 0;
  for (const b of list) {
    const w = ROOM_W[b.type] || 48;
    if (row.length && used + w > avail) { floors.push(row); row = []; used = 0; }
    row.push({ b, w }); used += w;
  }
  if (row.length) floors.push(row);
  const out = [];
  floors.forEach((fl, i) => {
    const sum = fl.reduce((s, r) => s + r.w, 0);
    const extra = avail - sum;
    let x = STAIR_W;
    fl.forEach((r, k) => {
      const w = r.w + Math.floor(extra / fl.length) + (k === fl.length - 1 ? extra % fl.length : 0);
      out.push({ b: r.b, x, y: SKY + 2 + i * (ROOM_H + SLAB), w, h: ROOM_H });
      x += w;
    });
  });
  return { rooms: out, floors: floors.length };
}

function drawHold(t) {
  const sc = (cw) => (cw < 560 ? 2 : 3);
  size(sc, LH);
  const { rooms: rs, floors } = hallLayout();
  const hallEnd = SKY + 2 + floors * (ROOM_H + SLAB);
  size(sc, Math.max(hallEnd + 26, Math.floor(wrap.clientHeight / scale)));
  drawSky(t, SKY);
  rockFill(SKY, LH - SKY, '#3a302e');
  // stairwell
  ctx.fillStyle = '#241c1e'; ctx.fillRect(0, SKY, STAIR_W, hallEnd - SKY);
  for (let fl = 0; fl < floors; fl++) {
    const y0 = SKY + 2 + fl * (ROOM_H + SLAB);
    for (let s = 0; s < 10; s++) { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(1 + (s % 2 ? 0 : 5), y0 + 4 + s * 4, 6, 1); }
    ctx.fillStyle = '#4a3a2a'; ctx.fillRect(STAIR_W - 1, y0, 1, ROOM_H);
  }
  const f = F(), d = D();
  const frame = Math.floor(t * 3) % 2;
  const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy);
  for (const r of rs) {
    drawRoom(t, r.b, r.x, r.y, r.w, r.h, idle, frame);
    rects.push({ x: r.x, y: r.y, w: r.w, h: r.h, kind: 'building', id: r.b.id });
  }
  // floor slabs and pillars between rooms
  for (let fl = 0; fl < floors; fl++) {
    const y = SKY + 2 + fl * (ROOM_H + SLAB) + ROOM_H;
    ctx.fillStyle = '#2e2624'; ctx.fillRect(0, y, LW, SLAB);
    ctx.fillStyle = '#463a36'; ctx.fillRect(0, y, LW, 1);
  }
  for (const r of rs) {
    if (r.x <= STAIR_W) continue;
    ctx.fillStyle = '#5a524e'; ctx.fillRect(r.x - 1, r.y, 3, r.h - 3);
    ctx.fillStyle = '#7a726e'; ctx.fillRect(r.x - 2, r.y, 5, 2); ctx.fillRect(r.x - 2, r.y + r.h - 5, 5, 2);
    ctx.fillStyle = '#3a3432'; ctx.fillRect(r.x + 1, r.y + 2, 1, r.h - 7);
  }
  // signs on top so they are never covered
  for (const r of rs) {
    const name = byId.buildings[r.b.type].name.split(' ')[0].replace("'s", '');
    sign(name + (r.b.level > 1 ? ' ' + r.b.level : ''), r.x + r.w / 2, r.y + 3, G.focus === r.b.id || G.ws === r.b.id ? '#f2b33d' : '#f3e9d2');
    const kind = byId.buildings[r.b.type].kind;
    const info = d.buildings[r.b.id] || {};
    const stuck = kind !== 'passive' && (!info.worker || (kind === 'queue' && !r.b.job));
    if (stuck && frame) badge(r.x + r.w - 9, r.y + 3);
    if (f.siege && kind !== 'passive') { ctx.fillStyle = '#e05a4f44'; ctx.fillRect(r.x, r.y, r.w, r.h); }
  }
  // way down to the mines
  const my = hallEnd + 6;
  ctx.fillStyle = '#120e14'; ctx.fillRect(2, hallEnd, 8, LH - hallEnd);
  ctx.fillStyle = '#5a4030'; ctx.fillRect(2, hallEnd, 1, LH - hallEnd); ctx.fillRect(9, hallEnd, 1, LH - hallEnd);
  sign('TO THE MINES', 20 + textWidth('TO THE MINES') / 2 + 3, my + 4, '#f2b33d');
  rects.push({ x: 0, y: hallEnd, w: LW, h: LH - hallEnd, kind: 'tab', id: 'mines' });
  drawSurface(t);
}

function badge(x, y) {
  ctx.fillStyle = '#0c090e'; ctx.fillRect(x, y, 7, 8);
  ctx.fillStyle = '#f0b847'; ctx.fillRect(x + 1, y + 1, 5, 6);
  ctx.fillStyle = '#0c090e'; ctx.fillRect(x + 3, y + 2, 1, 3); ctx.fillRect(x + 3, y + 6, 1, 1);
}

/** One room: picture, then fire, smoke, steam, sparks and dwarves. Used by the hold and the workshop screen. */
function drawRoom(t, b, x, y, w, h, idle, frame, big = false) {
  ctx.drawImage(hall(b.type, w, h), x, y);
  const a = anchors(b.type, w, h);
  const f = F(), d = D();
  const info = d.buildings[b.id] || {};
  const worker = info.worker ? f.dwarves.find((q) => q.id === info.worker) : null;
  const working = b.job && !b.job.quenching || (byId.buildings[b.type].kind === 'continuous' && worker && !f.siege);
  for (const [tx, ty] of a.torches) ctx.drawImage(S.torch(Math.floor(t * 6) + tx), x + tx - 1, y + ty - 5);
  if (a.fire) {
    const heat = b.type === 'smelter' ? (G.heat ? G.heat(b.id) : info.heat || 0) : 0;
    const lit = b.type === 'tavern' || working;
    const k = lit ? 0.45 + heat / 140 + (frame ? 0.08 : 0) : 0.08;
    ctx.fillStyle = `rgba(255,${Math.round(120 + heat)},40,${Math.min(0.95, k)})`;
    ctx.fillRect(x + a.fire.x, y + a.fire.y, a.fire.w, a.fire.h);
    if (lit) {
      ctx.fillStyle = `rgba(255,220,120,${Math.min(0.9, k)})`;
      ctx.fillRect(x + a.fire.x + 2, y + a.fire.y + a.fire.h - 2, a.fire.w - 4, 1);
      ctx.fillStyle = `rgba(255,140,40,${0.08 + heat / 600})`;
      ctx.fillRect(x + a.fire.x - 6, y + a.fire.y - 6, a.fire.w + 12, a.fire.h + 10);
    }
    if (lit && Math.random() < 0.25 + heat / 200) particles.push({ x: x + a.fire.x + Math.random() * a.fire.w, y: y + a.fire.y, vx: (Math.random() - 0.5) * 8, vy: -8 - Math.random() * 8 - heat / 10, life: 0.5, c: '#ffd36b' });
  }
  if (a.chimney && working && Math.random() < 0.35) particles.push({ x: x + a.chimney.x + 3, y: y + 1, vx: (Math.random() - 0.5) * 3, vy: -4, life: 1.2, c: '#8a8088' });
  if (b.type === 'forge' && working && frame && a.sparks && Math.random() < 0.7)
    for (let k = 0; k < (big ? 6 : 3); k++) particles.push({ x: x + a.sparks.x, y: y + a.sparks.y, vx: (Math.random() - 0.5) * 24, vy: -8 - Math.random() * 12, life: 0.45, c: Math.random() < 0.5 ? '#ffd36b' : '#fff6c0' });
  if (b.type === 'grindstone' && working && a.sparks && Math.random() < 0.6)
    for (let k = 0; k < 2; k++) particles.push({ x: x + a.sparks.x, y: y + a.sparks.y, vx: 8 + Math.random() * 14, vy: -4 - Math.random() * 6, life: 0.4, c: '#fff6c0' });
  if ((b.type === 'jeweler' || b.type === 'engraver') && working && a.sparks && frame && Math.random() < 0.4)
    particles.push({ x: x + a.sparks.x + Math.random() * 4, y: y + a.sparks.y, vx: 0, vy: -3, life: 0.5, c: b.type === 'jeweler' ? '#b8fff0' : '#ffffff' });
  if (a.steam && ((b.type === 'forge' && b.job && b.job.quenching) || (b.type === 'brewery' && working)) && Math.random() < 0.8)
    particles.push({ x: x + a.steam.x + Math.random() * 4, y: y + a.steam.y, vx: (Math.random() - 0.5) * 3, vy: -6, life: 1.2, c: '#e8eef4' });
  if (b.type === 'farm' && Math.random() < 0.08) particles.push({ x: x + 4 + Math.random() * (w - 16), y: y + h - 8, vx: 0, vy: -2, life: 1.5, c: '#6ad0d8' });
  if (worker && a.worker) {
    const pose = ['forge', 'grindstone', 'engraver', 'jeweler'].includes(b.type) ? 'hammer' : 'stand';
    ctx.drawImage(S.dwarfSprite(worker, working ? pose : 'stand', working ? frame : 0), x + a.worker[0] - 7, y + a.worker[1] - 16);
  }
  if (b.type === 'tavern') idle.slice(0, a.idle.length).forEach((q, k) => ctx.drawImage(S.dwarfSprite(q, 'stand', 0), x + a.idle[k][0], y + a.idle[k][1] - 16));
  if (b.type === 'barracks') f.dwarves.filter((q) => q.job === 'warrior' && !q.busy && q.post === 'fortress').slice(5, 5 + a.idle.length)
    .forEach((q, k) => ctx.drawImage(S.dwarfSprite(q, 'stand', frame), x + a.idle[k][0], y + a.idle[k][1] - 16));
  return a;
}

function rockFill(y0, h, base) {
  const r = S.rand(y0 * 7 + 3);
  ctx.fillStyle = base;
  ctx.fillRect(0, y0, LW, h);
  for (let i = 0; i < (LW * h) / 18; i++) {
    ctx.fillStyle = r() < 0.5 ? S.shade(base, -0.15) : S.shade(base, 0.08);
    ctx.fillRect(Math.floor(r() * LW), y0 + Math.floor(r() * h), 1 + Math.floor(r() * 2), 1);
  }
}

// ------------------------------------------------------------------ mines

function drawMines(t) {
  const f = F(), d = D();
  size((cw) => (cw < 560 ? 2 : 3), MINE_TOP + G.data.layers.length * LAYER_H + 4);
  const frame = Math.floor(t * 2.5) % 2;
  // mine head: rock ceiling, winch, rails
  rockFill(0, MINE_TOP, '#3a302e');
  ctx.fillStyle = '#5a4030'; ctx.fillRect(SHAFT_X - 2, 4, SHAFT_W + 4, 2); ctx.fillRect(SHAFT_X - 2, 4, 2, MINE_TOP - 4); ctx.fillRect(SHAFT_X + SHAFT_W, 4, 2, MINE_TOP - 4);
  const wheelA = t * 2;
  ctx.fillStyle = '#7a7a84';
  for (let i = 0; i < 6; i++) { const an = wheelA + (i / 6) * Math.PI * 2; ctx.fillRect(Math.round(SHAFT_X + 6 + Math.cos(an) * 4), Math.round(13 + Math.sin(an) * 4), 1, 1); }
  ctx.fillRect(SHAFT_X + 6, 13, 1, 1);
  text('MINE LIFT ' + Math.round(d.liftCap) + '/H', SHAFT_X + SHAFT_W + 6, 6, '#f2b33d');
  const total = d.layers.reduce((s, l) => s + l.rate, 0);
  text('DIGGING ' + Math.round(Math.min(total, d.liftCap)) + ' ORE/H', SHAFT_X + SHAFT_W + 6, 14, f.liftLimited ? '#f0b847' : '#f3e9d2');
  text('STORAGE ' + d.used + '/' + Math.round(d.capacity), SHAFT_X + SHAFT_W + 6, 22, f.storageFull ? '#e05a4f' : '#b5a68e');
  rects.push({ x: SHAFT_X + SHAFT_W, y: 0, w: LW, h: MINE_TOP, kind: 'building', id: 'lift' });

  G.data.layers.forEach((layer, i) => {
    const ls = f.layers[i];
    const y = MINE_TOP + i * LAYER_H;
    const tile = S.rockTile(layer);
    for (let ty = 0; ty < LAYER_H; ty += 48) for (let tx = 0; tx < LW; tx += 48)
      ctx.drawImage(tile, 0, 0, 48, Math.min(48, LAYER_H - ty), tx, y + ty, 48, Math.min(48, LAYER_H - ty));
    ctx.fillStyle = '#0c090e'; ctx.fillRect(0, y, LW, 1);
    const tunY = y + LAYER_H - 24;
    const x0 = SHAFT_X + SHAFT_W;
    if (ls.unlocked) {
      // ore veins in the rock above the tunnel
      const r = S.rand(i * 31 + 7);
      const ores = Object.keys(layer.weights).filter((k) => byId.ores[k] || k === 'rough_gem');
      for (let v = 0; v < Math.floor(LW / 40); v++) {
        const k = ores[Math.floor(r() * ores.length)];
        const col = byId.ores[k] ? byId.ores[k].color : '#6fe0c8';
        const vx = x0 + 10 + Math.floor(r() * (LW - x0 - 20)), vy = y + 18 + Math.floor(r() * 12);
        for (let p = 0; p < 7; p++) { ctx.fillStyle = p % 3 ? col : S.shade(col, 0.45); ctx.fillRect(vx + Math.floor(r() * 6), vy + Math.floor(r() * 4), 1 + (p % 2), 1); }
      }
      ctx.fillStyle = '#1e1820'; ctx.fillRect(x0, tunY, LW - x0 - 3, 21);
      ctx.fillStyle = '#2a222c'; ctx.fillRect(x0, tunY + 19, LW - x0 - 3, 2);
      ctx.fillStyle = '#6a625e'; ctx.fillRect(x0, tunY + 17, LW - x0 - 3, 1);
      ctx.fillStyle = '#4a3a2a'; for (let rx = x0; rx < LW - 3; rx += 4) ctx.fillRect(rx, tunY + 18, 2, 1);
      ctx.fillStyle = '#5a4030';
      for (let x = x0 + 20; x < LW - 8; x += 44) { ctx.fillRect(x, tunY, 2, 17); ctx.fillRect(x - 3, tunY, 8, 2); }
      for (let x = x0 + 40; x < LW - 8; x += 60) ctx.drawImage(S.torch(Math.floor(t * 6) + x), x, tunY + 2);
      const miners = f.dwarves.filter((x) => x.job === 'miner' && x.layer === i && !x.busy);
      const threat = ls.threat ? f.threats.find((th) => String(th.id) === ls.threat) : null;
      const span = LW - x0 - 30;
      if (threat) {
        ctx.fillStyle = 'rgba(200,40,30,0.18)'; ctx.fillRect(0, y + 1, LW, LAYER_H - 1);
        const mx = x0 + span * 0.55 + Math.sin(t * 1.3) * span * 0.25;
        ctx.drawImage(S.monster(threat.monster, frame), Math.round(mx), tunY + 1);
        miners.slice(0, 6).forEach((m, k) => ctx.drawImage(S.dwarfSprite(m, 'stand', 0), x0 + 2 + k * 5, tunY));
        text(threat.name, LW - 4, y + 4, '#e05a4f', 'right');
      } else {
        if (miners.length) {
          // ore cart rolling to the lift and back
          const p = (Math.sin(t * 0.25 + i) + 1) / 2;
          const cx = x0 + 2 + Math.round(p * (span - 10));
          ctx.fillStyle = '#5a4020'; ctx.fillRect(cx, tunY + 11, 11, 5); ctx.fillStyle = '#3a2a14'; ctx.fillRect(cx, tunY + 11, 11, 1);
          const oc = byId.ores[ores[0]] ? byId.ores[ores[0]].color : '#888';
          ctx.fillStyle = oc; ctx.fillRect(cx + 2, tunY + 10, 3, 1); ctx.fillStyle = '#6e6672'; ctx.fillRect(cx + 5, tunY + 10, 4, 1);
          ctx.fillStyle = '#2a2a30'; ctx.fillRect(cx + 1, tunY + 16, 2, 1); ctx.fillRect(cx + 8, tunY + 16, 2, 1);
        }
        miners.forEach((m, k) => {
          const base = x0 + 16 + ((k * 37 + m.id * 13) % Math.max(1, span - 10));
          const walk = Math.sin(t * 0.35 + m.id) * 10;
          const swinging = Math.sin(t * 0.35 + m.id) > 0.3;
          ctx.drawImage(S.dwarfSprite(m, swinging ? 'swing' : 'walk', swinging ? Math.floor(t * 3 + m.id) % 2 : frame), Math.round(base + (swinging ? 0 : walk)), tunY);
          if (swinging && Math.random() < 0.1) particles.push({ x: base + 12, y: tunY + 7, vx: 6, vy: -4, life: 0.4, c: '#c8b8a0' });
        });
      }
      const guards = f.dwarves.filter((x) => x.job === 'warrior' && x.post === 'mine' && !x.busy);
      if (i === 0) guards.slice(0, 3).forEach((w, k) => ctx.drawImage(S.dwarfSprite(w, 'stand', frame), LW - 18 - k * 9, tunY));
      const dl = d.layers[i];
      text(layer.name, x0 + 4, y + 4, '#f3e9d2');
      text((ls.level > 1 ? 'SHAFT ' + ls.level + '  ' : '') + Math.round(dl.rate) + ' ORE/H  ' + dl.miners + ' MINERS', x0 + 4, y + 11, '#f2b33d');
    } else {
      ctx.fillStyle = 'rgba(8,6,10,0.72)'; ctx.fillRect(0, y + 1, LW, LAYER_H - 1);
      const known = d.layers[i].discovered;
      ctx.drawImage(S.icon('lock'), Math.round(LW / 2 - 7), y + LAYER_H / 2 - 18);
      text(known ? layer.name : '? ? ?', LW / 2, y + LAYER_H / 2 - 3, known ? '#b5a68e' : '#7d7268', 'center');
      text(known ? 'LOCKED' : 'UNEXPLORED', LW / 2, y + LAYER_H / 2 + 5, '#7d7268', 'center');
    }
    if (G.focus === 'layer:' + i) { ctx.strokeStyle = '#f2b33d'; ctx.lineWidth = 1; ctx.strokeRect(0.5, y + 0.5, LW - 1, LAYER_H - 1); }
    rects.push({ x: 0, y, w: LW, h: LAYER_H, kind: 'layer', id: i });
  });

  // shaft and lift cage
  const top = 6, bottom = MINE_TOP + f.layers.filter((l) => l.unlocked).length * LAYER_H;
  ctx.fillStyle = '#120e14'; ctx.fillRect(SHAFT_X, top, SHAFT_W, bottom - top);
  ctx.fillStyle = '#5a4030'; ctx.fillRect(SHAFT_X, top, 1, bottom - top); ctx.fillRect(SHAFT_X + SHAFT_W - 1, top, 1, bottom - top);
  for (let y = top; y < bottom; y += 6) { ctx.fillStyle = '#3a2a20'; ctx.fillRect(SHAFT_X + 1, y, SHAFT_W - 2, 1); }
  const p = (Math.sin(t * 0.6) + 1) / 2;
  const ly = top + 14 + Math.round(p * (bottom - top - 28));
  ctx.fillStyle = '#c8c0b0'; ctx.fillRect(SHAFT_X + SHAFT_W / 2, top + 10, 1, ly - top - 10);
  ctx.fillStyle = '#8a6a3a'; ctx.fillRect(SHAFT_X + 1, ly, SHAFT_W - 2, 10);
  ctx.fillStyle = '#5a4020'; ctx.fillRect(SHAFT_X + 2, ly + 1, SHAFT_W - 4, 3);
  ctx.fillStyle = '#b5653b'; ctx.fillRect(SHAFT_X + 3, ly + 1, 2, 2); ctx.fillStyle = '#9fb7b3'; ctx.fillRect(SHAFT_X + 6, ly + 1, 2, 2);
}

// ------------------------------------------------------------------ workshop

const WS_H = 64;

function drawWorkshop(t) {
  const b = F().buildings.find((x) => x.id === G.ws);
  if (!b) return drawHold(t);
  const sc = (cw) => (cw < 560 ? 3 : Math.max(4, Math.floor(cw / 170)));
  size(sc, LH);
  const keys = [];
  for (const g of contextResources()) for (const k of g.keys) if (!keys.includes(k) && k !== 'coins') keys.push(k);
  const per = Math.max(1, Math.floor((LW - 8) / 24));
  const storeH = keys.length ? 14 + Math.ceil(keys.length / per) * 24 : 0;
  size(sc, Math.max(WS_H + 6 + storeH, Math.floor(wrap.clientHeight / scale)));
  rockFill(0, LH, '#2e2624');
  if (keys.length) storeroom(keys, WS_H + 6, per);
  const frame = Math.floor(t * 3) % 2;
  const idle = F().dwarves.filter((x) => x.job === 'idle' && !x.busy);
  const a = drawRoom(t, b, 0, 0, LW, WS_H, idle, frame, true);
  ctx.fillStyle = '#2e2624'; ctx.fillRect(0, WS_H, LW, 6); ctx.fillStyle = '#463a36'; ctx.fillRect(0, WS_H, LW, 1);
  const info = D().buildings[b.id] || {};
  // big stock piles for what this workshop uses
  if (b.type === 'smelter') {
    const heat = G.heat ? G.heat(b.id) : info.heat || 0;
    thermometer(LW - 9, 6, heat);
    rects.push({ x: a.extra.furnace.x, y: a.extra.furnace.y, w: a.extra.furnace.w + 10, h: a.extra.furnace.h, kind: 'bellows', id: b.id });
  }
  if (b.type === 'forge' && b.job && b.job.quenching) {
    const q = a.extra.quench;
    if (frame) { ctx.fillStyle = '#f2b33d'; ctx.fillRect(q.x - 1, q.y - 13, 10, 1); }
    sign('QUENCH!', q.x + 4, q.y - 22, '#f2b33d');
    rects.push({ x: q.x - 8, y: q.y - 24, w: 26, h: 26, kind: 'quench', id: b.id });
  }
  const kind = byId.buildings[b.type].kind;
  const label = info.jobName ? info.jobName.toUpperCase() : kind === 'continuous' ? (info.worker ? 'WORKING' : 'NO WORKER') : (info.worker ? 'IDLE' : 'NO WORKER');
  const name = byId.buildings[b.type].name + (b.level > 1 ? '  LEVEL ' + b.level : '');
  sign(name, LW / 2, 4, '#f2b33d');
  text(label.slice(0, Math.floor((LW - 8) / 4)), 4, WS_H + 1, info.worker ? '#b5a68e' : '#e05a4f');
}

/** Shelves under the workshop with what it works with: sprite and amount for each good. */
function storeroom(keys, y0, per) {
  ctx.fillStyle = '#3a302c'; ctx.fillRect(0, y0, LW, LH - y0);
  text('STOREROOM', 4, y0 + 3, '#b5a68e');
  keys.forEach((k, i) => {
    const x = 4 + (i % per) * 24, y = y0 + 12 + Math.floor(i / per) * 24;
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 1, y + 16, 24, 2); ctx.fillStyle = '#7a5030'; ctx.fillRect(x - 1, y + 16, 24, 1);
    const n = stock(k);
    ctx.globalAlpha = n ? 1 : 0.35;
    const sp = S.good(k);
    ctx.drawImage(sp, x + Math.floor((16 - sp.width) / 2) + 2, y + 16 - sp.height);
    ctx.globalAlpha = 1;
    text(fmt(n), x + 11, y + 19, n ? '#f2b33d' : '#e05a4f', 'center');
    rects.push({ x, y, w: 22, h: 24, kind: 'good', id: k });
  });
}

function thermometer(x, y, heat) {
  const h = 30;
  ctx.fillStyle = '#0c090e'; ctx.fillRect(x - 1, y - 1, 6, h + 6);
  ctx.fillStyle = '#2a2026'; ctx.fillRect(x, y, 4, h);
  const fill = Math.round((heat / 100) * (h - 2));
  for (let i = 0; i < fill; i++) { ctx.fillStyle = S.mix('#7a2a12', '#ffd36b', i / h); ctx.fillRect(x + 1, y + h - 1 - i, 2, 1); }
  ctx.fillStyle = heat > 5 ? '#e2622b' : '#5a2a1a'; ctx.fillRect(x - 1, y + h, 6, 4);
}

// ------------------------------------------------------------------ particles & main

function drawParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0 || p.y < 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 4 * dt;
    ctx.fillStyle = p.c;
    ctx.globalAlpha = Math.min(1, p.life * 1.5);
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  ctx.globalAlpha = 1;
  if (particles.length > 300) particles.splice(0, particles.length - 300);
}

let prevT = 0;
function draw(t) {
  const m = G.screen + ':' + (G.ws || '');
  if (m !== mode) { particles.length = 0; mode = m; wrap.scrollTop = 0; }
  rects = [];
  ctx.imageSmoothingEnabled = false;
  if (G.screen === 'mines') drawMines(t);
  else if (G.screen === 'workshop') drawWorkshop(t);
  else drawHold(t);
  drawParticles(Math.min(0.2, t - prevT));
  prevT = t;
}

/** Scroll the scene so a building or layer is visible. */
export function reveal(kind, id) {
  const r = rects.find((q) => q.kind === kind && q.id === id);
  if (r) wrap.scrollTo({ top: Math.max(0, r.y * scale - 40), behavior: 'smooth' });
}

/** A still picture for the login screen. */
export function drawLoginArt(c) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  for (let y = 0; y < 40; y++) { g.fillStyle = S.mix('#1a1a34', '#4a3050', y / 40); g.fillRect(0, y, w, 1); }
  const r = S.rand(9);
  for (let i = 0; i < 30; i++) { g.fillStyle = '#c8c8e0'; g.fillRect(Math.floor(r() * w), Math.floor(r() * 30), 1, 1); }
  g.fillStyle = '#14121e';
  let hh = 10;
  for (let x = 0; x < w; x++) { hh += (r() - 0.5) * 4; hh = Math.max(4, Math.min(24, hh)); g.fillRect(x, 40 - hh, 1, hh); }
  g.drawImage(hall('forge', 80, 50), 0, 40);
  g.drawImage(hall('smelter', 80, 50), 80, 40);
  const names = ['#c4622d', '#e0b04a', '#3b2a20', '#9a9a9a'];
  names.forEach((beard, i) => {
    const dw = { id: i, beard, hair: beard, skin: '#f0c8a0', beardStyle: i % 4, job: i % 2 ? 'miner' : 'warrior', traits: [] };
    g.drawImage(S.dwarfSprite(dw, i % 2 ? 'swing' : 'stand', i % 2), 22 + i * 36, 70);
  });
  g.fillStyle = 'rgba(255,140,40,0.7)'; g.fillRect(17, 80, 12, 3); g.fillRect(85, 80, 8, 6);
}
