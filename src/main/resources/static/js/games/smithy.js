// The anvil: a screen of its own where the player finishes forged pieces in two small games.
//   1. Forging: gold marks run along a track towards a red arrow; strike the anvil when a mark reaches it.
//   2. Quenching: a red pointer swings over a bar, faster and slower; plunge the piece when it is in the golden middle.
// The scores (0..1) go to the server (action smith), which rolls the quality. Artifacts get a name from the player.
import { G, F, D, byId, goodName, baseValue, dur, now } from '../core/data.js';
import { h, img, bus, ico, info, frameDecor, setMaterial, slideIn, money, toast } from '../ui/ui.js';
import * as S from '../art/sprites.js';
import * as P from '../art/scene.js';
import * as DW from '../art/dwarves.js';
import { text as pxText } from '../art/pixfont.js';
import * as A from '../core/audio.js';

const W = 280, H = 156, FLOOR = 142;          // the scene in world pixels
const ANVIL = { x: 142, y: FLOOR }, BARREL = { x: 230, y: FLOOR }, FORGE = { x: 46, y: FLOOR };
const BEATS = 8;                              // strikes per piece
const QUENCH_TIME = 9;                        // seconds before the piece is too cold to quench
const GOLD = 0.04;                            // half the width of the golden mark (share of the bar)
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let el = null, cv = null, ctx = null, raf = 0;
let game = null;          // the piece and what happens to it now
let fx = [];              // sparks, steam, floating words
let named = new Set();
let watch = null;          // resizes the canvas with its box    // artifacts we already asked to name in this session

// ------------------------------------------------------------------ open & close

export const smithyOpen = () => !!el;
/** For tests: the game in progress. */
export const smithyState = () => game;

/** Open the anvil. Starts with the most valuable piece. */
export function openSmithy() {
  if (el) return;
  el = h('div', { class: 'smithy', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'The anvil' });
  setMaterial(el, 'forge');
  cv = h('canvas', { class: 'smithy-scene', 'aria-hidden': 'true' });
  ctx = cv.getContext('2d');
  el.append(
    h('div', { class: 'smithy-top' },
      h('div', { class: 'plate' }, img(S.icon('work'), 'icon s'), h('h2', null, 'The anvil'), h('small', { class: 'sub', 'data-count': '' })),
      h('button', { class: 'icon-btn', 'aria-label': 'Leave the anvil', title: 'Leave', onclick: closeSmithy })),
    h('div', { class: 'smithy-stage' }, cv, h('div', { class: 'smithy-hud' })),
    h('div', { class: 'smithy-bottom win' }, ...frameDecor(false), h('div', { class: 'smithy-panel' })));
  document.body.append(el);
  if (!reduced()) slideIn(el.querySelector('.smithy-bottom'), 'bottom');
  cv.addEventListener('pointerdown', onTap);
  window.addEventListener('keydown', onKey);
  watch = new ResizeObserver(fit); watch.observe(cv.parentElement);
  A.sfx('open');
  fit();
  pick(bestPiece());
  raf = requestAnimationFrame(loop);
}

export function closeSmithy() {
  if (!el) return;
  if (game && (game.phase === 'forge' || game.phase === 'quench') && !confirm('Leave this piece? The dwarves will finish it.')) return;
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', onKey);
  if (watch) watch.disconnect();
  el.remove();
  el = cv = ctx = game = null;
  fx = [];
  A.sfx('close');
  bus.render();
}

/** Called by main.js whenever new state arrives. */
export function smithyUpdate() {
  if (!el) return;
  const c = el.querySelector('[data-count]');
  if (c) c.textContent = `${pieces().length}/${D().anvilMax || 10} waiting`;
  if (game && game.phase === 'ready' && !pieces().some((g) => g.id === game.g.id)) pick(bestPiece());
  else if (game && game.phase === 'ready') panel();
}

const pieces = () => F().anvil || [];
const worth = (g) => ((D().anvil || []).find((x) => x.id === g.id) || {}).value || 0;
const until = (g) => ((D().anvil || []).find((x) => x.id === g.id) || {}).until || 0;
function bestPiece() { return [...pieces()].sort((a, b) => worth(b) - worth(a))[0] || null; }

function fit() {
  if (!cv) return;
  const r = cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
}

// ------------------------------------------------------------------ the games

function pick(g) {
  game = g ? { g, phase: 'ready', hits: [], strikes: 0 } : { g: null, phase: 'empty' };
  smithyUpdate();
  panel();
}

function hardness(g) { return (byId.metals[g.mat] || {}).hardness || 3; }

function startForge() {
  const gap = Math.max(0.46, Math.min(0.78, 0.82 - 0.035 * hardness(game.g)));   // harder metal: a faster beat
  const t0 = performance.now() / 1000 + 1.6;                                      // the first mark needs time to arrive
  game.phase = 'forge';
  game.gap = gap;
  game.beats = Array.from({ length: BEATS }, (_, i) => ({ t: t0 + i * gap, score: null }));
  game.strays = 0;
  game.end = t0 + (BEATS - 1) * gap + 0.45;
  panel();
}

function startQuench() {
  const r = Math.random;
  game.phase = 'quench';
  game.q = { t0: performance.now() / 1000, phase: r() * Math.PI * 2, last: performance.now() / 1000,
    base: (2 * Math.PI) / (1.5 + r() * 0.4), a: 1.1 + r() * 0.9, b: 2.3 + r() * 1.4, pa: r() * 6, pb: r() * 6, pos: 0.5 };
  panel();
}

/** Score of one strike, by how far off the beat it was (seconds): spot on gives 1, a near miss still something. */
function strikeScore(dt) { return Math.max(0, Math.min(1, 1 - (Math.abs(dt) - 0.03) / 0.22)); }
/** Score of a quench, by where the pointer stood (0..1, the gold mark in the middle). */
function quenchScore(pos) { return Math.max(0, Math.min(1, 1 - Math.max(0, Math.abs(pos - 0.5) - 0.01) / 0.42)); }
const word = (s) => s >= 0.9 ? 'PERFECT!' : s >= 0.6 ? 'GOOD' : s >= 0.25 ? 'CLOSE' : 'MISS';

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeSmithy(); return; }
  if ((e.key === ' ' || e.key === 'Enter') && game && (game.phase === 'forge' || game.phase === 'quench')) { e.preventDefault(); tap(e.timeStamp / 1000); }
}
function onTap(e) { e.preventDefault(); tap(e.timeStamp / 1000); }

function tap(t) {
  if (!game) return;
  if (game.phase === 'forge') {
    // the nearest beat nobody struck yet
    let best = null;
    for (const b of game.beats) if (b.score == null && Math.abs(b.t - t) < 0.4 && (!best || Math.abs(b.t - t) < Math.abs(best.t - t))) best = b;
    game.strikes++;
    if (!best) { game.strays++; A.sfx('anvilBad'); say('MISS', '#c9715a'); return; }
    best.score = strikeScore(t - best.t);
    A.sfx(best.score >= 0.6 ? 'anvilGood' : 'anvilBad');
    sparks(ANVIL.x + 4, ANVIL.y - 27, 6 + Math.round(best.score * 10));
    say(word(best.score), best.score >= 0.9 ? '#ffe38a' : best.score >= 0.6 ? '#e9d7b0' : '#c9a27a');
  } else if (game.phase === 'quench') {
    plunge(quenchScore(game.q.pos));
  }
}

function forgeScore() {
  const hit = game.beats.reduce((s, b) => s + (b.score || 0), 0) / BEATS;
  return Math.max(0, hit - 0.04 * game.strays);
}

async function plunge(score) {
  game.phase = 'wait';
  game.quench = score;
  A.sfx('quench');
  for (let i = 0; i < 18; i++) fx.push({ kind: 'steam', x: BARREL.x - 10 + Math.random() * 20, y: BARREL.y - 16, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 12, life: 1.6 + Math.random() });
  say(score > 0 ? word(score) : 'TOO COLD', score >= 0.9 ? '#ffe38a' : '#e9d7b0', BARREL.x);
  panel();
  const forge = forgeScore(), id = game.g.id;
  const s = await bus.act({ type: 'smith', id, forge: +forge.toFixed(3), quench: +score.toFixed(3) });
  if (!el || !game) return;
  const res = s && s.fortress.smithed;
  if (!res || res.forging !== id) { toast('The piece slipped from the tongs. Try the next one.', 'bad'); pick(bestPiece()); return; }
  game.phase = 'done';
  game.forge = forge;
  game.res = res;
  if (res.artifact) { A.sfx('fanfare'); nameArtifact(res.artifact); }
  else if (res.quality >= 4) A.sfx('fanfare'); else if (res.quality >= 2) A.sfx('chime');
  panel();
}

// ------------------------------------------------------------------ the panel under the scene

function panel() {
  if (!el) return;
  const box = el.querySelector('.smithy-panel'), hud = el.querySelector('.smithy-hud');
  const g = game && game.g;
  hud.replaceChildren();
  if (!game || game.phase === 'empty') {
    box.replaceChildren(h('p', null, 'The anvil is cold. Forged pieces wait here until you finish them.'),
      h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: closeSmithy }, 'Back to the hold')));
    return;
  }
  const name = byId.metals[g.mat].name + ' ' + byId.items[g.itype].name.toLowerCase();
  const smith = F().dwarves.find((d) => d.id === g.dwarf);
  if (game.phase === 'ready') {
    box.replaceChildren(
      h('div', { class: 'row piece-head' }, img(S.item(g.itype, g.mat), 'icon'),
        h('div', { class: 'grow' }, h('b', null, name), h('div', { class: 'small dim' },
          smith ? `Forged by ${smith.first}, smithing ${g.skill}` : 'Forged by the hold', ` · worth about `, money(worth(g)), ' as normal')),
        info('First strike the anvil in time: hit when a gold mark reaches the red arrow. Then quench: plunge the piece when the red pointer is in the golden middle. The better you play, the better the piece. Spot on is hard, but close is good too.')),
      queueRow(),
      h('div', { class: 'row' }, h('button', { class: 'btn big primary grow', onclick: startForge }, 'Start forging'),
        h('span', { class: 'small dim' }, 'Dwarves finish it in ', h('span', { 'data-left': until(g) }, dur(Math.max(0, until(g) - now()))))));
  } else if (game.phase === 'forge') {
    box.replaceChildren(h('p', { class: 'lead' }, 'Strike when a gold mark reaches the red arrow!'),
      h('p', { class: 'small dim' }, 'Tap the anvil, or press Space.'));
  } else if (game.phase === 'quench') {
    box.replaceChildren(h('p', { class: 'lead' }, 'Quench it in the golden middle!'),
      h('p', { class: 'small dim' }, 'Tap the barrel, or press Space, before the piece goes cold.'));
  } else if (game.phase === 'wait') {
    box.replaceChildren(h('p', { class: 'lead' }, 'Hisss...'));
  } else if (game.phase === 'done') {
    box.replaceChildren(result());
  }
}

function queueRow() {
  const list = [...pieces()].sort((a, b) => worth(b) - worth(a));
  if (list.length < 2) return null;
  return h('div', { class: 'anvil-queue', role: 'list', 'aria-label': 'Pieces at the anvil' }, list.map((g) =>
    h('button', { class: 'tool' + (game.g && g.id === game.g.id ? ' on' : ''), role: 'listitem', title: byId.metals[g.mat].name + ' ' + byId.items[g.itype].name.toLowerCase(),
      'aria-label': byId.metals[g.mat].name + ' ' + byId.items[g.itype].name.toLowerCase(), onclick: () => pick(g) }, img(S.item(g.itype, g.mat), 'icon s'))));
}

function result() {
  const r = game.res, qs = G.data.qualities;
  const art = r.artifact ? F().artifacts.find((a) => a.id === r.artifact) : null;
  const key = art ? art.item : r.key;
  const next = bestPiece();
  return h('div', { class: 'smith-result' },
    h('div', { class: 'row piece-head' }, img(S.item(...itemArgs(key)), 'icon big'),
      h('div', { class: 'grow' },
        h('b', { class: 'q' + r.quality }, art ? art.name : goodName(key)),
        h('div', { class: 'small' }, 'Worth about ', money(art ? art.value : baseValue(key))))),
    h('div', { class: 'tiers', 'aria-label': 'Quality: ' + qs[r.quality].name }, qs.map((q) =>
      h('span', { class: 'tier' + (q.tier === r.quality ? ' on' : '') + (q.tier === 5 ? ' art' : '') }, q.name))),
    h('div', { class: 'row small scores' }, h('span', null, 'Hammer ', h('b', null, Math.round(game.forge * 100) + '%')),
      h('span', null, 'Quench ', h('b', null, Math.round(game.quench * 100) + '%'))),
    h('div', { class: 'row' },
      next ? h('button', { class: 'btn big primary grow', onclick: () => pick(next) }, 'Next piece') : null,
      h('button', { class: 'btn big' + (next ? '' : ' grow'), onclick: closeSmithy }, 'Leave')));
}

function itemArgs(key) { const p = key.split(':'); return [p[1], p[2], +p[3], p[4] || '']; }

// ------------------------------------------------------------------ naming an artifact

/** Ask the player for the name of a new artifact (also after a reload, for artifacts still unnamed). */
export function nameArtifact(id) {
  const a = F().artifacts.find((x) => x.id === id);
  if (!a || document.querySelector('.name-artifact')) return;
  named.add(id);
  const input = h('input', { type: 'text', maxlength: 40, minlength: 2, placeholder: 'e.g. Emberheart', 'aria-label': 'Name of the artifact', autocomplete: 'off' });
  const back = h('div', { class: 'name-artifact' });
  const close = () => back.remove();
  const save = async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (name.length < 2) { toast('Give it a name with at least 2 letters.', 'bad'); return; }
    const s = await bus.act({ type: 'nameArtifact', id, name });
    if (s) { close(); if (el) panel(); }
  };
  const win = h('form', { class: 'win name-win', onsubmit: save }, ...frameDecor(true),
    h('div', { class: 'plate' }, h('h2', null, 'A legendary artifact!')),
    h('div', { class: 'row piece-head' }, a.item ? img(S.item(...itemArgs(a.item)), 'icon big') : img(S.artifact(), 'icon big'),
      h('p', { class: 'grow' }, a.desc, ' Songs will be sung of it. What shall it be called?')),
    input,
    h('div', { class: 'row' }, h('button', { class: 'btn big primary grow', type: 'submit' }, 'Name it'),
      h('button', { class: 'btn big', type: 'button', onclick: close }, 'Later')));
  setMaterial(win, 'trade');
  back.append(win);
  document.body.append(back);
  if (!reduced()) slideIn(win, 'top');
  setTimeout(() => input.focus(), 50);
}

/** After a state update: an unnamed artifact we did not ask about yet. */
export function askForNames() {
  const a = (F().artifacts || []).find((x) => x.unnamed && !named.has(x.id));
  if (a) nameArtifact(a.id);
}

// ------------------------------------------------------------------ drawing

function loop(ms) {
  raf = requestAnimationFrame(loop);
  if (!ctx) return;
  const t = ms / 1000;
  if (game && game.phase === 'forge') {
    // a dry tick on every beat, so the rhythm can be heard as well as seen
    const nowS = performance.now() / 1000;
    for (const b of game.beats) if (!b.ticked && nowS >= b.t) { b.ticked = true; if (nowS - b.t < 0.1) A.sfx('beat'); }
    if (nowS > game.end) startQuench();
  }
  if (game && game.phase === 'quench') stepQuench();
  draw(t);
  el.querySelectorAll('[data-left]').forEach((x) => { x.textContent = dur(Math.max(0, +x.dataset.left - now())); });
}

function stepQuench() {
  const q = game.q, t = performance.now() / 1000, dt = Math.min(0.05, t - q.last);
  q.last = t;
  const k = t - q.t0;
  // speed rises and falls on two unrelated rhythms, so the swing never settles into one beat
  const speed = q.base * Math.max(0.25, 1 + 0.55 * Math.sin(q.a * k + q.pa) + 0.32 * Math.sin(q.b * k + q.pb));
  q.phase += speed * dt;
  const u = (q.phase / Math.PI) % 2;           // a triangle wave: steady sweeps back and forth
  q.pos = u < 1 ? u : 2 - u;
  if (k > QUENCH_TIME) plunge(0);
}

function draw(t) {
  const cw = cv.width, ch = cv.height;
  const z = Math.max(1, Math.min(cw / W, ch / H));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0c0b10'; ctx.fillRect(0, 0, cw, ch);
  // a tall box (phones): the scene sits a little below the middle, the wall goes on above it
  ctx.setTransform(z, 0, 0, z, Math.round((cw - W * z) / 2), Math.round(Math.max(0, (ch - H * z) * 0.6)));
  wall(t);
  if (P.ready()) {
    P.draw(ctx, 'forge', Math.floor(t * 8), FORGE.x, FORGE.y);
    P.draw(ctx, 'coal_pile', 0, FORGE.x + 40, FLOOR);
    P.draw(ctx, 'rack', 0, 192, FLOOR);
    P.draw(ctx, 'torch', Math.floor(t * 8), 104, FLOOR - 70);
    P.draw(ctx, 'torch', Math.floor(t * 8) + 2, 262, FLOOR - 70);
    P.draw(ctx, 'anvil', 0, ANVIL.x, ANVIL.y);
    P.draw(ctx, 'quench', 0, BARREL.x, BARREL.y);
  }
  smith(t);
  piece(t);
  if (P.ready()) {
    ctx.globalCompositeOperation = 'lighter';
    P.draw(ctx, 'forge', Math.floor(t * 8), FORGE.x, FORGE.y, { glow: true });
    P.draw(ctx, 'torch', Math.floor(t * 8), 104, FLOOR - 70, { glow: true });
    P.draw(ctx, 'torch', Math.floor(t * 8) + 2, 262, FLOOR - 70, { glow: true });
    ctx.globalCompositeOperation = 'source-over';
  }
  effects();
  if (game && game.phase === 'forge') track();
  if (game && game.phase === 'quench') gauge();
}

/** Back wall: courses of dressed stone with offset joints, the floor in front, the forge's light on both. */
function wall(t) {
  ctx.fillStyle = '#2a2530'; ctx.fillRect(-200, -400, W + 400, FLOOR + 440);
  for (let row = 0, y = FLOOR - 12; y > -400; row++, y -= 12) {
    ctx.fillStyle = '#1c1922'; ctx.fillRect(-200, y, W + 400, 1);
    for (let x = -196 + (row % 2) * 13; x < W + 200; x += 26) ctx.fillRect(x, y, 1, 12);
    ctx.fillStyle = '#353040'; ctx.fillRect(-200, y + 1, W + 400, 1);
  }
  ctx.fillStyle = '#3b3029'; ctx.fillRect(-200, FLOOR, W + 400, H - FLOOR + 400);
  ctx.fillStyle = '#4d3f34'; ctx.fillRect(-200, FLOOR, W + 400, 2);
  ctx.fillStyle = '#2a211c'; for (let x = -196; x < W + 200; x += 34) ctx.fillRect(x, FLOOR + 2, 1, 12);
  // firelight
  const flick = 0.85 + 0.08 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23);
  const g = ctx.createRadialGradient(FORGE.x, FLOOR - 40, 4, FORGE.x, FLOOR - 40, 170);
  g.addColorStop(0, `rgba(255,150,60,${0.34 * flick})`); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.fillRect(-200, -400, W + 400, H + 480);
  const v = ctx.createLinearGradient(0, -60, 0, FLOOR);
  v.addColorStop(0, 'rgba(6,5,9,0.75)'); v.addColorStop(1, 'rgba(6,5,9,0)');
  ctx.fillStyle = v; ctx.fillRect(-200, -400, W + 400, FLOOR + 440);
}

/** The smith at the anvil, or by the barrel with the tongs. */
function smith(t) {
  if (!DW.ready() || !game) return;
  const d = (game.g && F().dwarves.find((x) => x.id === game.g.dwarf)) || F().dwarves.find((x) => x.job === 'worker' && x.building && x.building.startsWith('forge')) || F().dwarves[0];
  if (!d) return;
  const look = DW.look48(d);
  if (game.phase === 'quench' || game.phase === 'wait' || (game.phase === 'done' && game.quench != null)) {
    DW.draw(ctx, look, 'idleSide', 0, BARREL.x - 30, FLOOR);
    return;
  }
  // a strike swings the hammer down: show the work frames quickly after each hit, otherwise hold it up
  let f = 0;
  if (game.phase === 'forge' && game.lastHit) f = Math.min(3, Math.floor((performance.now() / 1000 - game.lastHit) * 14));
  DW.draw(ctx, look, 'work', f, ANVIL.x - 30, FLOOR);
  hammer(f);
}

/** The smith's hammer: raised, then down on the piece right after a strike. */
function hammer(f) {
  const down = game.phase === 'forge' && game.lastHit && performance.now() / 1000 - game.lastHit < 0.12;
  const hx = ANVIL.x - 20, hy = FLOOR - 25, a = down ? 0.15 : -1.05;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  ctx.fillStyle = '#1d1b2c'; ctx.fillRect(-1, -2, 17, 4); ctx.fillRect(13, -5, 7, 10);
  ctx.fillStyle = '#8a5a34'; ctx.fillRect(0, -1, 15, 2);
  ctx.fillStyle = '#6e7584'; ctx.fillRect(14, -4, 5, 8);
  ctx.fillStyle = '#a9b0bd'; ctx.fillRect(14, -4, 5, 2);
  ctx.restore();
}

/** The hot piece: on the anvil while forging, over the barrel while quenching; it cools as time runs out. */
function piece() {
  if (!game || !game.g || game.phase === 'done' || game.phase === 'empty') return;
  let heat = 1, x = ANVIL.x + 2, y = ANVIL.y - 34;
  if (game.phase === 'quench') { heat = 1 - (performance.now() / 1000 - game.q.t0) / QUENCH_TIME; x = BARREL.x - 6; y = BARREL.y - 40; }
  if (game.phase === 'wait') { heat = 0; x = BARREL.x - 6; y = BARREL.y - 24; }
  const pic = hot(S.item(game.g.itype, game.g.mat), heat);
  ctx.drawImage(pic, Math.round(x - pic.width / 2), Math.round(y));
}

const hotCache = new Map();
function hot(src, heat) {
  const step = Math.max(0, Math.min(8, Math.round(heat * 8)));
  const k = src; let m = hotCache.get(k);
  if (!m) { m = []; hotCache.set(k, m); }
  if (m[step]) return m[step];
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  if (step > 0) {
    const s = step / 8;
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = s > 0.6 ? S.mix('#ff9a3a', '#fff2b8', (s - 0.6) / 0.4) : S.mix('#7a1e10', '#ff9a3a', s / 0.6);
    g.globalAlpha = 0.35 + 0.5 * s; g.fillRect(0, 0, c.width, c.height);
  }
  return (m[step] = c);
}

/** The beat track: gold marks slide in from the right towards the fixed red arrow. */
function track() {
  const x0 = 30, x1 = W - 30, y = 12, ax = x0 + 52, pxPerSec = 70, t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(10,8,12,0.82)'; ctx.fillRect(x0 - 4, y - 4, x1 - x0 + 8, 22);
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x0, y + 6, x1 - x0, 2);
  // the window around the arrow where a strike still counts a little
  ctx.fillStyle = 'rgba(236,199,107,0.12)'; ctx.fillRect(Math.round(ax - 0.25 * pxPerSec), y, Math.round(0.5 * pxPerSec), 14);
  for (const b of game.beats) {
    const x = ax + (b.t - t) * pxPerSec;
    if (x < x0 - 4 || x > x1) continue;
    const c = b.score == null ? '#ecc76b' : b.score >= 0.9 ? '#fff2b8' : b.score >= 0.25 ? '#b08a4a' : '#6a4a3a';
    ctx.fillStyle = '#1d1b2c'; ctx.fillRect(Math.round(x) - 2, y - 1, 5, 16);
    ctx.fillStyle = c; ctx.fillRect(Math.round(x) - 1, y, 3, 14);
  }
  // the red arrow, pointing down onto the track
  ctx.fillStyle = '#1d1b2c'; for (let i = 0; i < 6; i++) ctx.fillRect(ax - 6 + i, y - 8 + i, 13 - 2 * i, 1);
  ctx.fillStyle = '#e0473c'; for (let i = 0; i < 5; i++) ctx.fillRect(ax - 4 + i, y - 7 + i, 9 - 2 * i, 1);
  ctx.fillStyle = '#e0473c'; ctx.fillRect(ax, y - 2, 1, 18);
  const left = game.beats.filter((b) => b.score == null && b.t > t - 0.4).length;
  pxText(ctx, `${BEATS - left}/${BEATS}`, x1 - 2, y + 4, '#c9c1b2', 'right');
}

/** The quench bar: a golden middle and the swinging red pointer; the bar darkens as the piece cools. */
function gauge() {
  const x0 = 40, x1 = W - 40, y = 12, w = x1 - x0, q = game.q;
  const left = Math.max(0, 1 - (performance.now() / 1000 - q.t0) / QUENCH_TIME);
  ctx.fillStyle = 'rgba(10,8,12,0.82)'; ctx.fillRect(x0 - 4, y - 4, w + 8, 26);
  ctx.fillStyle = '#3a3040'; ctx.fillRect(x0, y, w, 10);
  const gw = Math.round(GOLD * 2 * w), near = Math.round(0.2 * w);
  ctx.fillStyle = '#5a4a3a'; ctx.fillRect(Math.round(x0 + w / 2 - near), y, near * 2, 10);
  ctx.fillStyle = '#ecc76b'; ctx.fillRect(Math.round(x0 + w / 2 - gw / 2), y, gw, 10);
  ctx.fillStyle = '#fff2b8'; ctx.fillRect(Math.round(x0 + w / 2 - gw / 2), y, gw, 2);
  const px = Math.round(x0 + q.pos * w);
  ctx.fillStyle = '#1d1b2c'; ctx.fillRect(px - 2, y - 6, 5, 22);
  ctx.fillStyle = '#e0473c'; ctx.fillRect(px - 1, y - 5, 3, 20);
  // heat left in the piece
  ctx.fillStyle = '#241c22'; ctx.fillRect(x0, y + 14, w, 3);
  ctx.fillStyle = S.mix('#7a1e10', '#ffb040', left); ctx.fillRect(x0, y + 14, Math.round(w * left), 3);
}

function sparks(x, y, n) {
  if (reduced()) return;
  for (let i = 0; i < n; i++) fx.push({ kind: 'spark', x, y, vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 70, life: 0.4 + Math.random() * 0.3 });
  game.lastHit = performance.now() / 1000;
}

function say(w, color, x = ANVIL.x) { fx.push({ kind: 'word', x, y: ANVIL.y - 58, w, color, vx: 0, vy: -16, life: 0.8 }); }

let fxT = 0;
function effects() {
  const t = performance.now() / 1000, dt = Math.min(0.05, fxT ? t - fxT : 0);
  fxT = t;
  fx = fx.filter((p) => (p.life -= dt) > 0);
  for (const p of fx) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'spark') { p.vy += 220 * dt; ctx.fillStyle = p.life > 0.25 ? '#fff6d6' : '#ffb040'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
    else if (p.kind === 'steam') { ctx.globalAlpha = Math.min(1, p.life / 1.2) * 0.7; ctx.fillStyle = '#e8eef4'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); ctx.globalAlpha = 1; }
    else if (p.kind === 'word') { ctx.globalAlpha = Math.min(1, p.life * 2); pxText(ctx, p.w, Math.round(p.x), Math.round(p.y), p.color, 'center'); ctx.globalAlpha = 1; }
  }
}
