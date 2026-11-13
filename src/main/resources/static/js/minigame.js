// A minigame screen: the same frame as the anvil (name plate, a pixel scene that fills the box, a panel below).
// Each game in games.js describes its scene and rules; this file runs it: canvas, zoom, taps, keys, effects,
// and the boost taps that go to the server in small batches (action boost, the server caps them).
import { G, F, D } from './data.js';
import { h, img, bus, frameDecor, setMaterial, slideIn } from './ui.js';
import * as S from './sprites.js';
import { text as pxText } from './pixfont.js';
import { heatUp } from './panels-work.js';
import * as A from './audio.js';

export const W = 280, H = 156, FLOOR = 142;   // the scene in world pixels (as at the anvil)
export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let el = null, cv = null, ctx = null, raf = 0, watch = null;
let game = null, def = null, view = { z: 1, ox: 0, oy: 0 }, last = 0;
export let fx = [];

export const gameOpen = () => !!el;
/** For tests: the game in progress. */
export const gameState = () => game;

/** Open a game (def from games.js) with its options (building id, layer). */
export function openGame(d, opts = {}) {
  if (el) closeGame(true);
  def = d;
  el = h('div', { class: 'smithy minigame', role: 'dialog', 'aria-modal': 'true', 'aria-label': d.title(opts) });
  setMaterial(el, d.material || 'forge');
  cv = h('canvas', { class: 'smithy-scene', 'aria-hidden': 'true' });
  ctx = cv.getContext('2d');
  el.append(
    h('div', { class: 'smithy-top' },
      h('div', { class: 'plate' }, img(S.icon(d.icon || 'work'), 'icon s'), h('h2', null, d.title(opts)), h('small', { class: 'sub', 'data-sub': '' })),
      h('button', { class: 'icon-btn', 'aria-label': 'Leave', title: 'Leave', onclick: () => closeGame() })),
    h('div', { class: 'smithy-stage' }, cv),
    h('div', { class: 'smithy-bottom win' }, ...frameDecor(false), h('div', { class: 'smithy-panel' })));
  document.body.append(el);
  if (!reduced()) slideIn(el.querySelector('.smithy-bottom'), 'bottom');
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  watch = new ResizeObserver(fit); watch.observe(cv.parentElement);
  A.sfx('open');
  fit();
  game = { ...opts, t0: performance.now() / 1000, down: false };
  def.init(game);
  panel();
  last = performance.now() / 1000;
  raf = requestAnimationFrame(loop);
}

export function closeGame(quiet = false) {
  if (!el) return;
  if (def.leave) def.leave(game);
  flush();
  cancelAnimationFrame(raf);
  cv.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onUp);
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('keyup', onKeyUp);
  if (watch) watch.disconnect();
  el.remove();
  el = cv = ctx = game = def = null;
  fx = [];
  if (!quiet) { A.sfx('close'); bus.render(); }
}

/** Called by main.js whenever new state arrives. */
export function gameUpdate() {
  if (!el || !def) return;
  if (def.update) def.update(game);
  panel();
}

/** Rebuild the panel below the scene. */
export function panel() {
  if (!el) return;
  el.querySelector('.smithy-panel').replaceChildren(...[].concat(def.panel(game)).filter(Boolean));
  live();
}
function live() {
  const box = el && el.querySelector('.smithy-panel');
  if (!box || !def.live) return;
  def.live(game, box);
  const sub = el.querySelector('[data-sub]');
  if (sub && def.sub) sub.textContent = def.sub(game);
}

function fit() {
  if (!cv) return;
  const r = cv.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
}

// ------------------------------------------------------------------ input

function world(e) {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  return { x: ((e.clientX - r.left) * dpr - view.ox) / view.z, y: ((e.clientY - r.top) * dpr - view.oy) / view.z };
}
function onDown(e) {
  e.preventDefault();
  if (!game) return;
  try { cv.setPointerCapture(e.pointerId); } catch { /* fine */ }
  const p = world(e);
  game.down = true; game.px = p.x; game.py = p.y;
  if (def.down) def.down(game, p.x, p.y, performance.now() / 1000);
}
function onMove(e) {
  if (!game) return;
  const p = world(e);
  game.px = p.x; game.py = p.y;
  if (def.move) def.move(game, p.x, p.y, performance.now() / 1000);
}
function onUp() {
  if (!game || !game.down) return;
  game.down = false;
  if (def.up) def.up(game, performance.now() / 1000);
}
function onKey(e) {
  if (!game) return;
  if (e.key === 'Escape') { e.preventDefault(); closeGame(); return; }
  if ((e.key === ' ' || e.key === 'Enter') && !(e.target.closest && e.target.closest('button, input, textarea, select'))) {
    e.preventDefault();
    if (e.repeat) return;
    game.down = true;
    if (def.down) def.down(game, null, null, performance.now() / 1000);
  }
}
function onKeyUp(e) {
  if (game && (e.key === ' ' || e.key === 'Enter') && game.down) { game.down = false; if (def.up) def.up(game, performance.now() / 1000); }
}

// ------------------------------------------------------------------ the loop

function loop(ms) {
  raf = requestAnimationFrame(loop);
  if (!ctx || !game) return;
  const t = ms / 1000, dt = Math.min(0.05, Math.max(0, t - last));
  last = t;
  if (def.tick) def.tick(game, t, dt);
  if (!ctx) return;     // the tick may have closed the game
  const cw = cv.width, ch = cv.height;
  const z = Math.max(1, Math.min(cw / W, ch / H));
  view = { z, ox: Math.round((cw - W * z) / 2), oy: Math.round(Math.max(0, (ch - H * z) * 0.6)) };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0c0b10'; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(z, 0, 0, z, view.ox, view.oy);
  def.draw(ctx, game, t, dt);
  effects(dt);
  live();
  if (pending > 0 && t - sent > 1) flush();
}

// ------------------------------------------------------------------ boost taps

let pending = 0, sent = 0;
/** A good tap (0..1) at a boosted workshop: heat shows at once, the server hears about it about once a second. */
export function boost(v) {
  if (!game || !game.building || v <= 0) return;
  heatUp(game.building, v);
  pending += v;
}
function flush() {
  sent = performance.now() / 1000;
  if (pending <= 0 || !game || !game.building) { pending = 0; return; }
  const taps = Math.round(pending * 100) / 100; pending = 0;
  bus.act({ type: 'boost', building: game.building, taps }, true).catch(() => {});
}

// ------------------------------------------------------------------ shared drawing

/** Back wall of dressed stone with offset joints, a floor in front, a warm light at lx and darkness above. */
export function wall(ctx, t, o = {}) {
  const stone = o.stone || ['#2a2530', '#1c1922', '#353040'], floor = o.floor || ['#3b3029', '#4d3f34', '#2a211c'];
  ctx.fillStyle = stone[0]; ctx.fillRect(-200, -400, W + 400, FLOOR + 440);
  for (let row = 0, y = FLOOR - 12; y > -400; row++, y -= 12) {
    ctx.fillStyle = stone[1]; ctx.fillRect(-200, y, W + 400, 1);
    for (let x = -196 + (row % 2) * 13; x < W + 200; x += 26) ctx.fillRect(x, y, 1, 12);
    ctx.fillStyle = stone[2]; ctx.fillRect(-200, y + 1, W + 400, 1);
  }
  ctx.fillStyle = floor[0]; ctx.fillRect(-200, FLOOR, W + 400, H - FLOOR + 400);
  ctx.fillStyle = floor[1]; ctx.fillRect(-200, FLOOR, W + 400, 2);
  ctx.fillStyle = floor[2]; for (let x = -196; x < W + 200; x += 34) ctx.fillRect(x, FLOOR + 2, 1, 12);
  light(ctx, t, o.lx ?? 60, o.ly ?? FLOOR - 40, o.light || [255, 150, 60], o.power ?? 0.3);
  const v = ctx.createLinearGradient(0, -60, 0, FLOOR);
  v.addColorStop(0, 'rgba(6,5,9,0.75)'); v.addColorStop(1, 'rgba(6,5,9,0)');
  ctx.fillStyle = v; ctx.fillRect(-200, -400, W + 400, FLOOR + 440);
}

/** A soft flickering pool of light. */
export function light(ctx, t, x, y, rgb, power, r = 170) {
  const flick = 0.85 + 0.08 * Math.sin(t * 9 + x) + 0.05 * Math.sin(t * 23);
  const g = ctx.createRadialGradient(x, y, 4, x, y, r);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${power * flick})`); g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

/** The dwarf working at a building (or any worker, or the first dwarf). */
export function worker(id, skill) {
  const f = F(), bi = (D().buildings || {})[id] || {};
  return f.dwarves.find((x) => x.id === bi.worker) || f.dwarves.find((x) => x.job === 'worker' && x.building === id)
    || f.dwarves.find((x) => x.job === (skill || 'worker')) || f.dwarves[0];
}

/** Heat gauge (a quantity, so a bar): a thermometer at x, with the speed it gives written above. */
export function heatGauge(ctx, x, y, hh, heat) {
  ctx.fillStyle = '#1d1b2c'; ctx.fillRect(x - 2, y - 2, 10, hh + 10);
  ctx.fillStyle = '#33364a'; ctx.fillRect(x, y, 6, hh);
  const fill = Math.round((heat / 100) * (hh - 2));
  for (let i = 0; i < fill; i++) { ctx.fillStyle = S.mix('#a9473c', '#ffd98e', i / hh); ctx.fillRect(x + 1, y + hh - 1 - i, 4, 1); }
  ctx.fillStyle = heat > 5 ? '#d9704a' : '#623e45'; ctx.fillRect(x - 2, y + hh, 10, 6);
  pxText(ctx, 'x' + (1 + heat / 100).toFixed(1), x + 3, y - 10, heat > 50 ? '#ffe38a' : '#e9d7b0', 'center');
}

// ------------------------------------------------------------------ effects

export function say(w, color, x, y) { fx.push({ kind: 'word', x, y, w, color, vx: 0, vy: -16, life: 0.8 }); }
export const wordFor = (s) => s >= 0.9 ? 'PERFECT!' : s >= 0.6 ? 'GOOD' : s >= 0.25 ? 'CLOSE' : 'MISS';
export const colorFor = (s) => s >= 0.9 ? '#ffe38a' : s >= 0.6 ? '#e9d7b0' : s >= 0.25 ? '#c9a27a' : '#c9715a';
/** Little particles: kind spark (falls, hot), chip (falls, colour), bubble/steam (rises), dust (drifts). */
export function burst(kind, x, y, n, o = {}) {
  if (reduced() && kind !== 'chip') n = Math.ceil(n / 4);
  for (let i = 0; i < n; i++) {
    const sp = o.speed ?? 1;
    fx.push({ kind, x: x + (Math.random() - 0.5) * (o.w || 0), y, color: o.color, size: o.size || 1,
      vx: ((Math.random() - 0.5) * (o.vx ?? 100) + (o.dx || 0)) * sp, vy: (kind === 'spark' || kind === 'chip' ? -30 - Math.random() * (o.vy ?? 60) : -8 - Math.random() * (o.vy ?? 20)) * sp,
      life: (o.life || 0.5) * (0.7 + Math.random() * 0.6), floor: o.floor ?? FLOOR });
  }
}
function effects(dt) {
  fx = fx.filter((p) => (p.life -= dt) > 0);
  for (const p of fx) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'spark') { p.vy += 220 * dt; ctx.fillStyle = p.life > 0.25 ? '#fff6d6' : '#ffb040'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
    else if (p.kind === 'chip') {
      p.vy += 260 * dt;
      if (p.y > p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; }
      ctx.fillStyle = p.color || '#6d6470'; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    } else if (p.kind === 'drop') {
      p.vy += 160 * dt; p.vx *= 0.96;
      ctx.fillStyle = p.color || '#c9b27a'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    } else if (p.kind === 'bubble' || p.kind === 'steam' || p.kind === 'dust') {
      ctx.globalAlpha = Math.min(1, p.life / 0.6) * (p.kind === 'dust' ? 0.5 : 0.8);
      ctx.fillStyle = p.color || '#e8eef4'; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      ctx.globalAlpha = 1;
    } else if (p.kind === 'word') { ctx.globalAlpha = Math.min(1, p.life * 2); pxText(ctx, p.w, Math.round(p.x), Math.round(p.y), p.color, 'center'); ctx.globalAlpha = 1; }
  }
}
