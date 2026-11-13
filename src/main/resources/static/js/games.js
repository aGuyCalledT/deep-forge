// The minigames of the production rooms, each on a screen of its own (frame in minigame.js).
//   smelter     pump the bellows in rhythm: they need about half a second to fill again
//   brewery     shake the barrels; a barrel that rested a moment gives the most
//   grindstone  hold to press the blade, let go to ease off; keep the needle in the green
//   engraver    tap the runes before they fade
//   jeweler     tap when the sparkle on the gem is at the top
//   tailor      tap when the shuttle reaches an edge of the loom
// These six heat the room up (action boost): up to twice as fast while it lasts.
//   farm        drag over the beds to spread fertilizer: more mushrooms for two hours (action fertilize)
//   mine        strike the vein until it is out of the rock; strikes tire you (action vein)
import { G, F, D, byId, buildingName, now, dur, fmt } from './data.js';
import { h, bus, bar, info, ico, toast } from './ui.js';
import * as S from './sprites.js';
import * as P from './art48.js';
import * as DW from './dwarf48.js';
import { text as pxText } from './pixfont.js';
import { currentHeat } from './panels-work.js';
import * as A from './audio.js';
import { openGame, closeGame, panel, boost, wall, light, worker, heatGauge, say, wordFor, colorFor, burst, fx, W, H, FLOOR, reduced } from './minigame.js';

const bld = (g) => F().buildings.find((b) => b.id === g.building);
const look = (g, extra) => { const d = worker(g.building, extra); return d ? DW.look48(d) : null; };
const ready = () => P.ready() && DW.ready();
const frame = (t, fps, n = 4) => Math.floor(t * fps) % n;

/** Panel of every boost game: what to do, the heat, the way back. */
function boostPanel(g, lead, hint) {
  const hb = bar(currentHeat(g.building) / 100, 'heat');
  hb.querySelector('i').dataset.gheat = '';
  return [
    h('p', { class: 'lead' }, lead),
    h('p', { class: 'small dim' }, hint),
    h('div', { class: 'row' }, h('span', { class: 'small' }, 'Heat', info('Every good move heats the room up: it works up to twice as fast. The heat fades again by itself, faster than you would think.')),
      h('div', { class: 'grow' }, hb), h('b', { 'data-gspeed': '' }, '×1.0')),
    h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: () => closeGame() }, 'Back to the hold')),
  ];
}
function boostLive(g, box) {
  const heat = currentHeat(g.building);
  const i = box.querySelector('[data-gheat]'); if (i) i.style.width = heat + '%';
  const s = box.querySelector('[data-gspeed]'); if (s) s.textContent = '×' + (1 + heat / 100).toFixed(2);
}
const boostSub = (g) => { const b = bld(g); return b ? buildingName(b) : ''; };

// ------------------------------------------------------------------ smelter: bellows in rhythm

const REFILL = 0.5;   // seconds until the bellows are full again
export const bellows = {
  title: () => 'The bellows', icon: 'work', material: 'forge',
  init(g) { g.fill = 1; g.pressed = -9; g.fullAt = 0; },
  sub: boostSub,
  panel: (g) => boostPanel(g, 'Pump when the bellows are full!', 'Tap the scene or press Space. Too early only gives a puff.'),
  live: boostLive,
  tick(g, t) {
    const was = g.fill;
    g.fill = Math.min(1, (t - g.pressed) / REFILL);
    if (was < 1 && g.fill >= 1) g.fullAt = t;
  },
  down(g, x, y, t) {
    const full = g.fill >= 1, s = full ? 1 : g.fill >= 0.8 ? 0.6 : 0.15 * g.fill;
    const sharp = full && t - g.fullAt < 0.15;
    g.pressed = t;
    if (currentHeat(g.building) < 5) A.sfx('ignite');
    A.sfx('bellows');
    if (navigator.vibrate) navigator.vibrate(8);
    boost(s);
    burst('spark', 82, FLOOR - 84, full ? 10 : 2, { vx: 50, vy: 70 });
    say(full ? (sharp ? 'PERFECT!' : 'WHOOSH') : g.fill >= 0.8 ? 'EARLY' : 'PUFF', full ? '#ffe38a' : '#c9a27a', 150, FLOOR - 52);
  },
  draw(ctx, g, t) {
    const heat = currentHeat(g.building);
    wall(ctx, t, { lx: 82, ly: FLOOR - 50, power: 0.2 + heat / 300 });
    if (!ready()) return;
    const press = Math.max(0, 1 - (t - g.pressed) / 0.18);
    P.draw(ctx, 'smelter', frame(t, 6 + heat / 10), 82, FLOOR);
    P.draw(ctx, 'ore_pile', 0, 30, FLOOR);
    P.draw(ctx, 'torch', frame(t, 8), 238, FLOOR - 70);
    // the bellows squash when pressed and swell again as they fill
    const fr = P.frame('bellows', 0), bw = fr.canvas.width, bh = fr.canvas.height;
    const k = 0.6 + 0.4 * Math.min(g.fill, 1 - press * 0.6);
    ctx.drawImage(fr.canvas, 0, 0, bw, bh, 150 - fr.ax, FLOOR - bh * k, bw, Math.max(3, Math.round(bh * k)));
    const l = look(g, 'smelting');
    if (l) DW.draw(ctx, l, 'work', press > 0 ? 2 : 0, 186, FLOOR, { flip: true });
    // the air gauge: six pips that fill with the bellows, gold when full
    for (let i = 0; i < 6; i++) {
      const on = g.fill >= (i + 1) / 6;
      ctx.fillStyle = on ? (g.fill >= 1 ? (Math.floor(t * 6) % 2 ? '#ffe38a' : '#e3c06e') : '#a9c3d6') : '#33364a';
      ctx.fillRect(130 + i * 7, FLOOR - 40, 5, 4);
    }
    if (g.fill >= 1) pxText(ctx, 'PUMP!', 150, FLOOR - 48, '#ffe38a', 'center');
    ctx.globalCompositeOperation = 'lighter';
    P.draw(ctx, 'smelter', frame(t, 6 + heat / 10), 82, FLOOR, { glow: true });
    P.draw(ctx, 'torch', frame(t, 8), 238, FLOOR - 70, { glow: true });
    light(ctx, t, 82, FLOOR - 50, [255, 140, 50], heat / 250, 90);
    ctx.globalCompositeOperation = 'source-over';
    heatGauge(ctx, 262, 30, 80, heat);
  },
};

// ------------------------------------------------------------------ brewery: shake the barrels

const BARRELS = [130, 168, 206], REST = 1.2;   // a barrel gives a full shake again after this many seconds
export const brewery = {
  title: () => 'The brew cellar', icon: 'work', material: 'forge',
  init(g) { g.shook = BARRELS.map(() => -9); },
  sub: boostSub,
  panel: (g) => boostPanel(g, 'Shake the barrels!', 'Tap a barrel. One that rested a moment gives the most, so take turns.'),
  live: boostLive,
  down(g, x, y, t) {
    let i = x == null ? g.shook.indexOf(Math.min(...g.shook)) : BARRELS.findIndex((bx) => Math.abs(x - bx) < 18 && y > FLOOR - 40);
    if (i < 0) return;
    const s = Math.min(1, (t - g.shook[i]) / REST);
    g.shook[i] = t;
    boost(s);
    A.sfx('slosh');
    if (navigator.vibrate) navigator.vibrate(10);
    burst('bubble', BARRELS[i], FLOOR - 26, 3 + Math.round(s * 8), { w: 10, vy: 30, life: 0.9, color: '#f2dc9a', size: 2 });
    say(s >= 0.95 ? 'SLOSH!' : s >= 0.5 ? 'GOOD' : 'TOO SOON', s >= 0.95 ? '#ffe38a' : s >= 0.5 ? '#e9d7b0' : '#c9715a', BARRELS[i], FLOOR - 44);
  },
  draw(ctx, g, t) {
    const heat = currentHeat(g.building);
    wall(ctx, t, { lx: 60, power: 0.22, light: [255, 180, 90] });
    if (!ready()) return;
    P.draw(ctx, 'brewkettle', frame(t, 5), 56, FLOOR);
    P.draw(ctx, 'torch', frame(t, 8), 100, FLOOR - 70);
    P.draw(ctx, 'shelf', 0, 246, FLOOR - 22);
    const l = look(g, 'farming');
    if (l) DW.draw(ctx, l, 'hands', frame(t, 3), 96, FLOOR);
    // the rack, and the barrels rocking on it
    ctx.fillStyle = '#4a3428'; ctx.fillRect(112, FLOOR - 4, 112, 4); ctx.fillStyle = '#5e4332'; ctx.fillRect(112, FLOOR - 4, 112, 1);
    BARRELS.forEach((bx, i) => {
      const since = t - g.shook[i], rest = Math.min(1, since / REST);
      const a = since < 1.2 ? Math.sin(since * 22) * 0.22 * Math.exp(-since * 3) : 0;
      const fr = P.frame('barrel', 0);
      ctx.save(); ctx.translate(bx, FLOOR - 4); ctx.rotate(a); ctx.drawImage(fr.canvas, -fr.ax, -fr.ay); ctx.restore();
      // a little froth crown that comes back as the barrel rests
      const pips = Math.round(rest * 4);
      for (let p = 0; p < 4; p++) { ctx.fillStyle = p < pips ? (pips === 4 ? '#f2dc9a' : '#a58a5a') : '#2d2630'; ctx.fillRect(bx - 7 + p * 4, FLOOR - 36, 3, 3); }
    });
    ctx.globalCompositeOperation = 'lighter';
    P.draw(ctx, 'brewkettle', frame(t, 5), 56, FLOOR, { glow: true });
    P.draw(ctx, 'torch', frame(t, 8), 100, FLOOR - 70, { glow: true });
    ctx.globalCompositeOperation = 'source-over';
    heatGauge(ctx, 262, 30, 80, heat);
  },
};

// ------------------------------------------------------------------ grindstone: keep the needle in the green

export const grindstone = {
  title: () => 'The grindstone', icon: 'work', material: 'forge',
  init(g) { g.p = 0.2; g.v = 0; g.zone = 0.5; g.in = 0; },
  sub: boostSub,
  panel: (g) => boostPanel(g, 'Keep the needle in the green!', 'Hold to press the blade harder, let go to ease off.'),
  live: boostLive,
  tick(g, t, dt) {
    // the sweet spot wanders; pressing pushes the needle up, it sinks back by itself
    g.zone = 0.5 + 0.28 * Math.sin(t * 0.9) + 0.1 * Math.sin(t * 2.3 + 1);
    g.v += (g.down ? 2.6 : -2.2) * dt;
    g.v *= Math.pow(0.25, dt);
    g.p += g.v * dt;
    if (g.p < 0) { g.p = 0; g.v = 0; } if (g.p > 1) { g.p = 1; g.v = 0; }
    g.in = Math.abs(g.p - g.zone) < 0.11;
    if (g.in) {
      boost(2.2 * dt);
      if (!reduced() && Math.random() < dt * 30) burst('spark', 146, FLOOR - 24, 1, { vx: 80, dx: 60, vy: 40 });
      g.hum = (g.hum || 0) + dt;
      if (g.hum > 0.9) { g.hum = 0; A.sfx('grind'); }
    }
  },
  draw(ctx, g, t) {
    const heat = currentHeat(g.building);
    wall(ctx, t, { lx: 140, power: 0.18 });
    if (!ready()) return;
    P.draw(ctx, 'grindstone', frame(t, g.in ? 14 : 6), 140, FLOOR);
    P.draw(ctx, 'weaponrack', 0, 226, FLOOR);
    P.draw(ctx, 'torch', frame(t, 8), 60, FLOOR - 70);
    const l = look(g, 'crafting');
    if (l) DW.draw(ctx, l, 'work', g.in ? frame(t, 8) : 0, 112, FLOOR);
    // the gauge: a track with the green zone and the needle
    const x0 = 60, w = 160, y = 26;
    ctx.fillStyle = '#1d1b2c'; ctx.fillRect(x0 - 3, y - 3, w + 6, 14);
    ctx.fillStyle = '#33364a'; ctx.fillRect(x0, y, w, 8);
    const zx = Math.round(x0 + (g.zone - 0.11) * w), zw = Math.round(0.22 * w);
    ctx.fillStyle = g.in ? '#8ccf63' : '#4c8a44'; ctx.fillRect(zx, y, zw, 8);
    const nx = Math.round(x0 + g.p * w);
    ctx.fillStyle = '#fff6e0'; ctx.fillRect(nx - 1, y - 4, 3, 16);
    ctx.fillStyle = '#d9704a'; ctx.fillRect(nx - 1, y - 6, 3, 2);
    pxText(ctx, g.down ? 'PRESS' : 'EASE', x0 + w / 2, y + 14, '#a9a2b4', 'center');
    ctx.globalCompositeOperation = 'lighter';
    P.draw(ctx, 'torch', frame(t, 8), 60, FLOOR - 70, { glow: true });
    ctx.globalCompositeOperation = 'source-over';
    heatGauge(ctx, 262, 30, 80, heat);
  },
};

// ------------------------------------------------------------------ engraver: tap the runes

const PLATE = { x: 70, y: 14, w: 140, h: 62 };
export const engraver = {
  title: () => "The engraver's bench", icon: 'work', material: 'forge',
  init(g) { g.runes = []; g.next = 0; g.cut = []; },
  sub: boostSub,
  panel: (g) => boostPanel(g, 'Tap the runes before they fade!', 'Each rune you catch is cut into the plate.'),
  live: boostLive,
  tick(g, t) {
    g.runes = g.runes.filter((r) => t - r.t < r.life);
    if (t > g.next && g.runes.length < 3) {
      g.runes.push({ x: PLATE.x + 14 + Math.random() * (PLATE.w - 28), y: PLATE.y + 14 + Math.random() * (PLATE.h - 28), t, life: 1.3, k: Math.floor(Math.random() * 6) });
      g.next = t + 0.35 + Math.random() * 0.25;
    }
  },
  down(g, x, y, t) {
    let r = x == null ? g.runes[0] : g.runes.find((q) => Math.hypot(q.x - x, q.y - y) < 12);
    if (!r) { say('MISS', '#c9715a', x ?? W / 2, (y ?? 60) - 6); return; }
    const s = 1 - 0.5 * (t - r.t) / r.life;   // quick taps cut deeper
    g.runes.splice(g.runes.indexOf(r), 1);
    g.cut.push({ x: r.x, y: r.y, k: r.k }); if (g.cut.length > 40) g.cut.shift();
    boost(s);
    A.sfx('rune');
    burst('chip', r.x, r.y, 4, { color: '#e3c06e', vx: 40, vy: 30, floor: PLATE.y + PLATE.h - 2 });
    say(wordFor(s), colorFor(s), r.x, r.y - 10);
  },
  draw(ctx, g, t) {
    const heat = currentHeat(g.building);
    wall(ctx, t, { lx: 140, ly: 50, power: 0.2, light: [255, 200, 120] });
    // the bronze plate, close up, with the runes already cut
    ctx.fillStyle = '#5a3d24'; ctx.fillRect(PLATE.x - 3, PLATE.y - 3, PLATE.w + 6, PLATE.h + 6);
    ctx.fillStyle = '#a8743a'; ctx.fillRect(PLATE.x, PLATE.y, PLATE.w, PLATE.h);
    ctx.fillStyle = '#c99050'; ctx.fillRect(PLATE.x, PLATE.y, PLATE.w, 2);
    ctx.fillStyle = '#7d5530'; ctx.fillRect(PLATE.x, PLATE.y + PLATE.h - 2, PLATE.w, 2);
    for (const c of g.cut) rune(ctx, c.x, c.y, c.k, '#5a3d24');
    for (const r of g.runes) {
      const u = (t - r.t) / r.life, a = Math.max(0, 1 - u);
      ctx.globalAlpha = Math.min(1, a * 1.6);
      rune(ctx, r.x, r.y, r.k, '#fff1b8');
      const rr = Math.round(9 * a) + 3;
      ctx.fillStyle = '#ffe38a';
      for (let q = 0; q < 12; q++) { const an = q / 12 * Math.PI * 2; ctx.fillRect(Math.round(r.x + Math.cos(an) * rr), Math.round(r.y + Math.sin(an) * rr), 1, 1); }
      ctx.globalAlpha = 1;
    }
    if (!ready()) return;
    P.draw(ctx, 'engraver', 0, 140, FLOOR);
    P.draw(ctx, 'torch', frame(t, 8), 40, FLOOR - 70);
    const l = look(g, 'crafting');
    if (l) DW.draw(ctx, l, 'work', frame(t, 6), 104, FLOOR);
    ctx.globalCompositeOperation = 'lighter';
    P.draw(ctx, 'torch', frame(t, 8), 40, FLOOR - 70, { glow: true });
    ctx.globalCompositeOperation = 'source-over';
    heatGauge(ctx, 262, 30, 80, heat);
  },
};
// six simple runes, drawn as pixel strokes (left half mirrored where they are symmetric)
const RUNES = [
  [[0, -4, 0, 4], [0, -4, 3, -1], [0, 0, 3, -3]],
  [[-2, -4, -2, 4], [2, -4, 2, 4], [-2, 0, 2, 0]],
  [[0, -4, 0, 4], [-3, -2, 0, 1], [3, -2, 0, 1]],
  [[-3, 4, 0, -4], [0, -4, 3, 4], [-2, 1, 2, 1]],
  [[-2, -4, -2, 4], [-2, -4, 2, -1], [2, -1, -2, 2]],
  [[0, -4, 0, 4], [-3, -4, 3, -4], [-3, 4, 3, 4]],
];
function rune(ctx, x, y, k, col) {
  ctx.fillStyle = col;
  for (const [ax, ay, bx, by] of RUNES[k]) {
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x + ax + (bx - ax) * i / n), Math.round(y + ay + (by - ay) * i / n), 1, 1);
  }
}

// ------------------------------------------------------------------ jeweler: catch the sparkle at the top

export const jeweler = {
  title: () => "The jeweler's loupe", icon: 'work', material: 'forge',
  init(g) { g.a = 0; g.spin = 1.6; g.lastRev = -1; },
  sub: boostSub,
  panel: (g) => boostPanel(g, 'Tap when the sparkle is at the top!', 'Once a turn. The gem turns faster and slower.'),
  live: boostLive,
  tick(g, t, dt) {
    g.spin = 1.5 + 0.45 * Math.sin(t * 0.7) + 0.2 * Math.sin(t * 1.9);
    g.a += g.spin * dt;     // revolutions
  },
  down(g, x, y, t) {
    const rev = Math.round(g.a), off = Math.abs(g.a - rev);
    if (rev === g.lastRev) { say('ONCE A TURN', '#c9a27a', 140, 22); return; }
    g.lastRev = rev;
    const s = Math.max(0, Math.min(1, 1 - (off - 0.05) / 0.15));
    boost(s);
    if (s > 0) { A.sfx(s >= 0.9 ? 'chime' : 'click'); burst('spark', 140, 22, Math.round(s * 10), { vx: 60, vy: 40 }); }
    say(wordFor(s), colorFor(s), 140, 18);
  },
  draw(ctx, g, t) {
    const heat = currentHeat(g.building);
    wall(ctx, t, { lx: 140, ly: 60, power: 0.22, light: [190, 220, 255] });
    // the gem, close up: an octagon of facets, lit by a sparkle that runs round it
    const cx = 140, cy = 56, R = 30;
    const col = ['#2a5c8a', '#3d7fb8', '#6fb3e0', '#bfe6ff'];
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
      const lit = Math.cos(a0 + Math.PI / 8 - (g.a % 1) * Math.PI * 2 + Math.PI / 2);
      ctx.fillStyle = col[Math.max(0, Math.min(3, Math.round(1.5 + lit * 1.5)))];
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(Math.round(cx + Math.cos(a0) * R), Math.round(cy + Math.sin(a0) * R));
      ctx.lineTo(Math.round(cx + Math.cos(a1) * R), Math.round(cy + Math.sin(a1) * R)); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#bfe6ff'; ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.fillStyle = '#e9f6ff'; ctx.fillRect(cx - 3, cy - 3, 6, 6);
    // the mark at the top, and the sparkle going round
    ctx.fillStyle = '#e3c06e'; ctx.fillRect(cx - 1, cy - R - 8, 3, 4);
    const sa = (g.a % 1) * Math.PI * 2 - Math.PI / 2, sx = Math.round(cx + Math.cos(sa) * (R - 4)), sy = Math.round(cy + Math.sin(sa) * (R - 4));
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 3, sy, 7, 1); ctx.fillRect(sx, sy - 3, 1, 7); ctx.fillRect(sx - 1, sy - 1, 3, 3);
    if (!ready()) return;
    P.draw(ctx, 'jeweler', 0, 140, FLOOR);
    P.draw(ctx, 'candle', frame(t, 6), 196, FLOOR - 24);
    const l = look(g, 'crafting');
    if (l) DW.draw(ctx, l, 'work', frame(t, 4), 108, FLOOR);
    ctx.globalCompositeOperation = 'lighter';
    P.draw(ctx, 'candle', frame(t, 6), 196, FLOOR - 24, { glow: true });
    ctx.globalCompositeOperation = 'source-over';
    heatGauge(ctx, 262, 30, 80, heat);
  },
};

// ------------------------------------------------------------------ tailor: catch the shuttle at the edge

const WARP = { x: 80, y: 20, w: 120, h: 50 };
export const tailor = {
  title: () => 'The loom', icon: 'work', material: 'forge',
  init(g) { g.u = 0; g.dir = 1; g.speed = 2; g.caught = true; g.rows = []; },
  sub: boostSub,
  panel: (g) => boostPanel(g, 'Tap when the shuttle reaches an edge!', 'Each good throw weaves a row of cloth.'),
  live: boostLive,
  tick(g, t, dt) {
    g.speed = 1.9 + 0.35 * Math.sin(t * 0.8);
    g.u += g.dir * g.speed * dt;
    if (g.u >= 1.18 || g.u <= -0.18) {      // went past the edge: nobody caught it, it turns by itself
      g.dir *= -1; g.u = Math.max(-0.18, Math.min(1.18, g.u));
      if (!g.caught) say('MISSED', '#c9715a', g.u > 0.5 ? WARP.x + WARP.w : WARP.x, WARP.y - 4);
      g.caught = false;
    }
  },
  down(g) {
    const edge = g.dir > 0 ? 1 : 0, off = Math.abs(g.u - edge);
    if (off > 0.3) { say('WAIT', '#c9a27a', WARP.x + g.u * WARP.w, WARP.y - 4); return; }
    const s = Math.max(0, Math.min(1, 1 - (off - 0.04) / 0.2));
    boost(s);
    g.dir *= -1; g.caught = true;
    if (s > 0.3) { g.rows.push(S.mix('#b85a4a', '#e3c06e', Math.random() * 0.6)); if (g.rows.length > 12) g.rows.shift(); }
    A.sfx('shuttle');
    say(wordFor(s), colorFor(s), WARP.x + edge * WARP.w, WARP.y - 4);
  },
  draw(ctx, g, t) {
    const heat = currentHeat(g.building);
    wall(ctx, t, { lx: 140, ly: 60, power: 0.18, light: [255, 200, 140] });
    // the warp threads, the cloth woven so far, the shuttle
    ctx.fillStyle = '#4a3428'; ctx.fillRect(WARP.x - 6, WARP.y - 4, WARP.w + 12, 4); ctx.fillRect(WARP.x - 6, WARP.y + WARP.h, WARP.w + 12, 4);
    ctx.fillStyle = '#cfc2a8'; for (let x = WARP.x; x <= WARP.x + WARP.w; x += 4) ctx.fillRect(x, WARP.y, 1, WARP.h);
    g.rows.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(WARP.x, WARP.y + WARP.h - 3 - i * 3, WARP.w + 1, 2); });
    const sx = Math.round(WARP.x + Math.max(0, Math.min(1, g.u)) * WARP.w), sy = WARP.y + WARP.h - 6 - g.rows.length * 3;
    ctx.fillStyle = '#7a4e2e'; ctx.fillRect(sx - 7, sy - 2, 14, 5); ctx.fillStyle = '#a8743a'; ctx.fillRect(sx - 6, sy - 2, 12, 1); ctx.fillStyle = '#e9d7b0'; ctx.fillRect(sx - 2, sy, 4, 1);
    // the edges light up when the shuttle is close
    for (const e of [0, 1]) { const near = Math.abs(g.u - e) < 0.12 && (g.dir > 0 ? e === 1 : e === 0); ctx.fillStyle = near ? '#ffe38a' : '#5e4332'; ctx.fillRect(WARP.x - 6 + e * (WARP.w + 8), WARP.y, 4, WARP.h); }
    if (!ready()) return;
    P.draw(ctx, 'loom', 0, 52, FLOOR);
    P.draw(ctx, 'sewing', 0, 214, FLOOR);
    const l = look(g, 'crafting');
    if (l) DW.draw(ctx, l, 'work', g.caught ? frame(t, 6) : 0, 150, FLOOR);
    heatGauge(ctx, 262, 30, 80, heat);
  },
};

// ------------------------------------------------------------------ farm: spread fertilizer

const BEDS = [58, 140, 222], SPOTS_PER = 7, SACK = 10;   // seconds of pouring in the sack
export const farm = {
  title: () => 'The mushroom beds', icon: 'work', material: 'forge',
  init(g) {
    g.spots = [];
    for (const bx of BEDS) for (let i = 0; i < SPOTS_PER; i++) g.spots.push({ x: bx - 21 + i * 7, dose: 0 });
    g.sack = SACK; g.sent = false; g.started = false;
  },
  sub: () => '',
  leave(g) { if (g.started && !g.sent) fertilize(g); },   // what was spread counts
  panel(g) {
    const b = bld(g), until = b ? b.fertUntil || 0 : 0;
    if (g.sent || until > now()) {
      const bi = D().buildings[g.building] || {};
      return [h('p', { class: 'lead' }, g.sent ? 'Well spread!' : 'The beds are fertilized'),
        h('p', { class: 'small dim', style: { textAlign: 'center' } }, `+${Math.round(100 * (bi.fert || 0))} % mushrooms for another `, h('span', { 'data-until': until }, dur(Math.max(0, until - now()))), '.'),
        h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: () => closeGame() }, 'Back to the hold'))];
    }
    const sb = bar(g.sack / SACK, 'gold'); sb.querySelector('i').dataset.sack = '';
    return [h('p', { class: 'lead' }, 'Spread the fertilizer evenly!'),
      h('p', { class: 'small dim' }, 'Drag over the beds. Every mushroom that gets some grows more for two hours. The sack is small.'),
      h('div', { class: 'row' }, h('span', { class: 'small' }, 'Sack'), h('div', { class: 'grow' }, sb), h('b', { 'data-cover': '' }, '0 %')),
      h('div', { class: 'row' }, h('button', { class: 'btn big primary', 'data-done': '', disabled: !g.started, onclick: () => fertilize(g) }, 'Done'),
        h('button', { class: 'btn big', onclick: () => closeGame() }, 'Leave'))];
  },
  live(g, box) {
    const s = box.querySelector('[data-sack]'); if (s) s.style.width = (100 * g.sack / SACK) + '%';
    const c = box.querySelector('[data-cover]'); if (c) c.textContent = Math.round(100 * cover(g)) + ' %';
    const d = box.querySelector('[data-done]'); if (d) d.disabled = !g.started;
    box.querySelectorAll('[data-until]').forEach((x) => { x.textContent = dur(Math.max(0, +x.dataset.until - now())); });
  },
  tick(g, t, dt) {
    const b = bld(g);
    if (g.sent || !b || (b.fertUntil || 0) > now()) return;
    if (!g.down || g.sack <= 0 || g.px == null) return;
    if (!g.started) { g.started = true; panel(); }
    g.sack = Math.max(0, g.sack - dt);
    for (const s of g.spots) if (Math.abs(s.x - g.px) < 7) s.dose += 1.5 * dt;
    if (!reduced() || Math.random() < 0.3) burst('drop', g.px, Math.min(g.py, FLOOR - 40), 2, { w: 8, vx: 20, vy: 0, life: 0.6, color: '#c9b27a' });
    if (g.sack <= 0) fertilize(g);
  },
  draw(ctx, g, t) {
    wall(ctx, t, { lx: 140, ly: 40, power: 0.16, light: [150, 230, 170], floor: ['#3a2f25', '#4f3e2e', '#2a211c'] });
    if (!ready()) return;
    P.draw(ctx, 'torch', frame(t, 8), 18, FLOOR - 70);
    P.draw(ctx, 'torch', frame(t, 8) + 1, 262, FLOOR - 70);
    for (const bx of BEDS) P.draw(ctx, 'mushbed_1', 0, bx, FLOOR);
    // every spot: a mushroom that swells with its dose (a full dose is enough, more is wasted)
    for (const s of g.spots) {
      const k = Math.min(1, s.dose), hgt = 3 + Math.round(k * 5), cap = 2 + Math.round(k * 2);
      ctx.fillStyle = '#e9dcc0'; ctx.fillRect(Math.round(s.x), FLOOR - 15 - hgt, 1, hgt);
      ctx.fillStyle = k >= 1 ? '#d96b5a' : S.mix('#8a6a5a', '#d96b5a', k);
      ctx.fillRect(Math.round(s.x) - cap, FLOOR - 16 - hgt, cap * 2 + 1, 2);
      ctx.fillStyle = '#f3e6c8'; if (k >= 1) ctx.fillRect(Math.round(s.x) - 1, FLOOR - 16 - hgt, 1, 1);
    }
    // the sack in the hand, where the pointer is
    if (g.px != null && g.down && g.sack > 0 && !g.sent) {
      const x = Math.round(g.px), y = Math.round(Math.min(g.py, FLOOR - 40));
      ctx.fillStyle = '#8a6a43'; ctx.fillRect(x - 5, y - 10, 10, 9); ctx.fillStyle = '#a8865a'; ctx.fillRect(x - 4, y - 10, 8, 2); ctx.fillStyle = '#5a4330'; ctx.fillRect(x - 1, y - 1, 3, 2);
    }
    const l = look(g, 'farming');
    if (l) DW.draw(ctx, l, 'idle', frame(t, 1, 2), 100, FLOOR);
    ctx.globalCompositeOperation = 'lighter';
    P.draw(ctx, 'torch', frame(t, 8), 18, FLOOR - 70, { glow: true });
    P.draw(ctx, 'torch', frame(t, 8) + 1, 262, FLOOR - 70, { glow: true });
    ctx.globalCompositeOperation = 'source-over';
  },
};
const cover = (g) => g.spots.reduce((s, x) => s + Math.min(1, x.dose), 0) / g.spots.length;
async function fertilize(g) {
  if (g.sent || g.sending) return;
  g.sending = true;
  try {
    await bus.act({ type: 'fertilize', building: g.building, cover: Math.round(cover(g) * 1000) / 1000 }, false, true);
    g.sent = true;
    A.sfx('chime');
  } catch { /* shown by act */ }
  g.sending = false;
  panel();
}

// ------------------------------------------------------------------ mine: break the vein out of the rock

const CELL = 4, VX = 150, VY = 70;   // the vein's middle; the rock face fills the scene
const STAMINA = 100, COST = 20, REGEN = 45;   // a strike every 0.7 s or so keeps you fresh
export const vein = {
  title: (o) => (G.data.layers[o.layer] || {}).name || 'The vein', icon: 'mines', material: 'forge',
  init(g) {
    const layer = G.data.layers[g.layer] || { weights: {} };
    const top = Object.entries(layer.weights || {}).sort((a, b) => b[1] - a[1])[0];
    g.ore = top ? top[0] : null;
    g.oreRamp = DW.ramp(((byId.ores || {})[g.ore] || {}).color || '#90bf98') || ['#2a3a2c', '#3f5c44', '#5d8a64', '#90bf98', '#c8e6c8'];
    g.hard = 1 + Math.floor(g.layer / 2);
    g.stamina = STAMINA; g.rest = 0; g.hits = 0; g.freed = false; g.sent = false; g.swing = -9;
    // the vein: an uneven blob of ore cells under a crust of rock cells that must all be broken
    g.cells = [];
    const seed = (F().id || 1) * 31 + g.layer * 7 + Math.floor(now() / 1200);
    let r = seed % 2147483647 || 1; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const bumps = [0, 1, 2, 3, 4, 5].map(() => 0.8 + rnd() * 0.4);
    for (let gy = -7; gy <= 7; gy++) for (let gx = -12; gx <= 12; gx++) {
      const a = Math.atan2(gy, gx * 0.55), k = bumps[Math.floor(((a + Math.PI) / (2 * Math.PI)) * 6) % 6];
      const d = Math.hypot(gx / 11, gy / 6.2) / k;
      if (d > 1.0) continue;
      const ore = d < 0.62;
      g.cells.push({ x: VX + gx * CELL, y: VY + gy * CELL, ore, hp: ore ? 0 : g.hard + (d < 0.8 ? 1 : 0), shade: Math.floor(rnd() * 3) });
    }
    g.crust = g.cells.filter((c) => !c.ore).length;
  },
  sub(g) { return g.sent ? 'Vein broken out' : `${Math.round(100 * (1 - left(g) / g.crust))} % free`; },
  update() {},
  panel(g) {
    const ls = F().layers[g.layer] || {}, dl = (D().layers || [])[g.layer] || {};
    if (g.sent) return [h('p', { class: 'lead' }, `+${dl.veinOre || ''} ore in the cart!`),
      h('p', { class: 'small dim', style: { textAlign: 'center' } }, 'The cart takes it up with the rest.'),
      h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: () => closeGame() }, 'Back to the mine'))];
    if (ls.threat) return [h('p', { class: 'lead' }, 'Something lurks here!'), h('p', { class: 'small dim' }, 'Drive it out with your warriors first.'),
      h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: () => closeGame() }, 'Back'))];
    if ((ls.veinAt || 0) > now()) return [h('p', { class: 'lead' }, 'No vein shows yet'),
      h('p', { class: 'small dim', style: { textAlign: 'center' } }, 'Look again in ', h('span', { 'data-until': ls.veinAt }, dur(ls.veinAt - now())), '.'),
      h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: () => closeGame() }, 'Back to the mine'))];
    const st = bar(1, 'good'); st.querySelector('i').dataset.stamina = '';
    const vb = bar(0, 'gold'); vb.querySelector('i').dataset.free = '';
    return [h('p', { class: 'lead' }, 'Break the vein out of the rock!'),
      h('p', { class: 'small dim' }, 'Strike the rock around the ore until none is left. Each strike tires you: rested strikes break more.'),
      h('div', { class: 'row' }, h('span', { class: 'small', style: { minWidth: '64px' } }, 'Stamina'), h('div', { class: 'grow' }, st)),
      h('div', { class: 'row' }, h('span', { class: 'small', style: { minWidth: '64px' } }, 'Vein free'), h('div', { class: 'grow' }, vb)),
      h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: () => closeGame() }, 'Back to the mine'))];
  },
  live(g, box) {
    const s = box.querySelector('[data-stamina]'); if (s) { s.style.width = (100 * g.stamina / STAMINA) + '%'; s.parentElement.classList.toggle('bad', g.stamina < COST); }
    const v = box.querySelector('[data-free]'); if (v) v.style.width = (100 * (1 - left(g) / g.crust)) + '%';
    box.querySelectorAll('[data-until]').forEach((x) => { x.textContent = dur(Math.max(0, +x.dataset.until - now())); });
  },
  tick(g, t, dt) {
    if (t - g.swing > 0.25) g.stamina = Math.min(STAMINA, g.stamina + REGEN * dt);
  },
  down(g, x, y, t) {
    const ls = F().layers[g.layer] || {};
    if (g.freed || ls.threat || (ls.veinAt || 0) > now()) return;
    if (x == null) {   // keyboard: strike the crust cell nearest the middle
      const c = g.cells.filter((q) => !q.ore && q.hp > 0).sort((a, b) => Math.hypot(a.x - VX, a.y - VY) - Math.hypot(b.x - VX, b.y - VY))[0];
      if (!c) return; x = c.x; y = c.y;
    }
    const power = g.stamina >= COST ? 0.4 + 0.6 * (g.stamina / STAMINA) : 0.15;
    g.stamina = Math.max(0, g.stamina - COST);
    g.swing = t; g.hits++;
    A.sfx('pickaxe');
    if (navigator.vibrate) navigator.vibrate(12);
    const reach = 5 + 9 * power;
    let broke = 0;
    for (const c of g.cells) {
      if (c.ore || c.hp <= 0) continue;
      const d = Math.hypot(c.x + 2 - x, c.y + 2 - y);
      if (d > reach) continue;
      c.hp -= d < reach * 0.5 ? 2 : 1;
      if (c.hp <= 0) { broke++; burst('chip', c.x + 2, c.y + 2, 1, { color: rockCol(g, 1), vx: 60, vy: 40, size: 2, floor: FLOOR }); }
    }
    burst('spark', x, y, 3, { vx: 60, vy: 30 });
    if (!broke) say(g.stamina < COST ? 'TIRED' : 'CLANG', '#c9a27a', x, y - 8);
    else if (power > 0.85) say('CRACK!', '#ffe38a', x, y - 8);
    if (left(g) === 0) free(g);
  },
  draw(ctx, g, t) {
    // the rock face of the layer, lit by a torch and the lamp on the helmet
    ctx.fillStyle = rockCol(g, 0); ctx.fillRect(-200, -400, W + 400, H + 600);
    if (P.ready()) {
      const name = 'rock_' + Math.min(4, g.layer);
      const pat = ctx.createPattern(P.frame(name, 0).canvas, 'repeat');
      ctx.fillStyle = pat; ctx.fillRect(-200, -400, W + 400, FLOOR + 400);
    }
    ctx.fillStyle = '#2a2420'; ctx.fillRect(-200, FLOOR, W + 400, 400); ctx.fillStyle = '#3b3029'; ctx.fillRect(-200, FLOOR, W + 400, 2);
    const ls = F().layers[g.layer] || {}, waiting = (ls.veinAt || 0) > now() && !g.sent;
    if (!waiting) for (const c of g.cells) {
      if (c.ore) {
        if (g.freed && g.sent) continue;
        ctx.fillStyle = g.oreRamp[2 + (c.shade % 2)]; ctx.fillRect(c.x, c.y, CELL, CELL);
        ctx.fillStyle = g.oreRamp[4]; if (c.shade === 0) ctx.fillRect(c.x + 1, c.y + 1, 1, 1);
      } else if (c.hp > 0) {
        ctx.fillStyle = rockCol(g, c.hp > g.hard ? 2 : 3); ctx.fillRect(c.x, c.y, CELL, CELL);
        ctx.fillStyle = rockCol(g, 1); ctx.fillRect(c.x, c.y + CELL - 1, CELL, 1);
        if (c.hp <= g.hard - 1 || (c.hp === 1 && g.hard > 1)) { ctx.fillStyle = rockCol(g, 0); ctx.fillRect(c.x + 1, c.y + 1, 2, 1); }   // cracked
      } else {
        ctx.fillStyle = rockCol(g, 0); ctx.fillRect(c.x, c.y, CELL, CELL);   // broken away: a hollow behind
      }
    }
    if (waiting) pxText(ctx, 'NO VEIN YET', VX, VY, '#a9a2b4', 'center');
    if (P.ready()) {
      P.draw(ctx, 'mine_pillar', 0, 18, FLOOR + 1);
      P.draw(ctx, 'torch', frame(t, 8), 250, FLOOR - 80);
      P.draw(ctx, 'minecart', 0, 248, FLOOR, { recolour: { ingot: g.oreRamp } });
    }
    if (DW.ready()) {
      const d = worker(null, 'miner') || F().dwarves[0];
      const l = d ? DW.look48(d, { hat: 'miner' }) : null;
      const sw = t - g.swing;
      if (l) DW.draw(ctx, l, 'mine', sw < 0.3 ? Math.min(3, Math.floor(sw * 13)) : 0, 62, FLOOR);
    }
    light(ctx, t, VX, VY, [255, 200, 130], 0.16, 120);
    if (P.ready()) { ctx.globalCompositeOperation = 'lighter'; P.draw(ctx, 'torch', frame(t, 8), 250, FLOOR - 80, { glow: true }); ctx.globalCompositeOperation = 'source-over'; }
  },
};
const left = (g) => g.cells.filter((c) => !c.ore && c.hp > 0).length;
function rockCol(g, k) {
  const r = P.ready() ? P.depthRamp(g.layer) : null;
  return r ? r[Math.min(r.length - 1, k)] : ['#1c1922', '#2a2530', '#4a4252', '#5e566a'][k];
}
async function free(g) {
  g.freed = true;
  for (const c of g.cells) if (c.ore) burst('chip', c.x + 2, c.y + 2, 1, { color: g.oreRamp[3], vx: 120, vy: 80, size: 2, dx: 60 });
  say('VEIN FREE!', '#ffe38a', VX, VY - 34);
  A.sfx('collect');
  try {
    await bus.act({ type: 'vein', layer: g.layer }, false, true);
    g.sent = true;
  } catch { g.freed = false; }
  panel();
}

// ------------------------------------------------------------------ open

const BY_TYPE = { smelter: bellows, brewery, grindstone, engraver, jeweler, tailor, farm };
export const hasGame = (type) => !!BY_TYPE[type];
/** Open the minigame of a room (by building id). */
export function openRoomGame(id) {
  const b = F().buildings.find((x) => x.id === id);
  if (!b || !BY_TYPE[b.type]) return;
  if (b.level <= 0) { toast('Build it first.'); return; }
  openGame(BY_TYPE[b.type], { building: id });
}
/** Open the vein of a mine layer. */
export function openVein(layer) { openGame(vein, { layer }); }
