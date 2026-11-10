// Draws the current screen on the scene canvas: camera (pan + zoom) for the hold, fit-to-width for the
// mines and the workshop, the lighting pass, hover outlines and clicks.
// A screen is { size(), camera, draw(ctx, t, view), lights(t), ambient(t), hit(x, y), overlay(ctx, t, hover) }.
import { G } from './data.js';
import * as S from './sprites.js';

let canvas, ctx, wrap, screens, onPick;
let screen = null, screenName = null;
let last = 0;
const cam = { x: 0, y: 0, zoom: 2, set: false };
const pointers = new Map();
let drag = null, hover = null, mouse = null;
const light = document.createElement('canvas');
const lctx = light.getContext('2d');
const DPR = () => Math.min(2, window.devicePixelRatio || 1);

export function initCanvas(c, w, s, pick) {
  canvas = c; wrap = w; screens = s; onPick = pick;
  ctx = canvas.getContext('2d');
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); if (drag && drag.paint && screen.paint) screen.paint(null, 'cancel'); drag = null; });
  canvas.addEventListener('pointerleave', () => { hover = null; mouse = null; canvas.style.cursor = ''; });
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (screen && screen.cancel) screen.cancel(); });
  window.addEventListener('resize', () => { last = 0; });
  requestAnimationFrame(loop);
}

export function zoomBy(d) {
  if (!screen || !screen.camera) return;
  const r = wrap.getBoundingClientRect();
  setZoom(cam.zoom + d, r.width / 2, r.height / 2);
}

export function camera() { return cam; }

function setZoom(z, sx, sy) {
  z = Math.max(1, Math.min(5, Math.round(z)));
  if (z === cam.zoom) return;
  const wx = cam.x + sx / cam.zoom, wy = cam.y + sy / cam.zoom;
  cam.zoom = z;
  cam.x = wx - sx / z; cam.y = wy - sy / z;
  clamp();
}

function clamp() {
  if (!screen) return;
  const { w, h } = screen.size();
  const b = screen.bounds ? screen.bounds() : { x0: 0, y0: -20, x1: w, y1: h + 20 };
  const r = wrap.getBoundingClientRect();
  const vw = r.width / cam.zoom, vh = r.height / cam.zoom;
  cam.x = vw >= b.x1 - b.x0 ? (b.x0 + b.x1 - vw) / 2 : Math.max(b.x0, Math.min(b.x1 - vw, cam.x));
  cam.y = vh >= b.y1 - b.y0 ? (b.y0 + b.y1 - vh) / 2 : Math.max(b.y0, Math.min(b.y1 - vh, cam.y));
}

/** Screen pixels -> world pixels. */
function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  if (screen && screen.camera) return { x: cam.x + sx / cam.zoom, y: cam.y + sy / cam.zoom, sx, sy };
  const sc = fitScale();
  return { x: sx / sc, y: sy / sc, sx, sy };
}

function fitScale() {
  const r = wrap.getBoundingClientRect();
  return Math.max(1, screen.fit ? screen.fit(r.width) : 2);
}

function down(e) {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: 0, t: performance.now() };
    // tools that paint (digging a row of hallway): the stroke follows the pointer instead of the camera
    const p = toWorld(e);
    if (screen && screen.paint && screen.dragging && screen.dragging(p)) { drag.paint = true; screen.paint(p, 'start'); }
  }
  if (pointers.size === 2) {
    if (drag && drag.paint && screen.paint) screen.paint(null, 'cancel');
    drag = { pinch: dist(), zoom: cam.zoom };
  }
}

function dist() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function move(e) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  mouse = toWorld(e);
  if (drag && drag.pinch && pointers.size === 2 && screen && screen.camera) {
    const r = wrap.getBoundingClientRect();
    setZoom(drag.zoom * dist() / drag.pinch, r.width / 2, r.height / 2);
    return;
  }
  if (drag && drag.paint && pointers.size === 1) { screen.paint(mouse, 'move'); return; }
  if (drag && !drag.pinch && pointers.size === 1) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (screen && screen.camera && drag.moved > 6 && !(screen.dragging && screen.dragging(mouse))) {
      cam.x = drag.cx - dx / cam.zoom; cam.y = drag.cy - dy / cam.zoom; clamp();
      canvas.style.cursor = 'grabbing';
      return;
    }
  }
  if (screen) {
    hover = screen.hit(mouse.x, mouse.y);
    canvas.style.cursor = hover ? 'pointer' : (screen.camera ? 'grab' : '');
  }
}

function up(e) {
  pointers.delete(e.pointerId);
  const d = drag;
  if (pointers.size === 0) drag = null;
  canvas.style.cursor = hover ? 'pointer' : '';
  if (d && d.paint && screen && screen.paint) { screen.paint(toWorld(e), 'end'); return; }
  if (!d || d.pinch || d.moved > 6 || !screen) return;
  const p = toWorld(e);
  const q = screen.hit(p.x, p.y);
  if (screen.click && screen.click(p.x, p.y, q)) return;
  onPick(q, anchorOf(q, e));
}

/** Where on the page the picked thing is, so its window can open beside it. */
function anchorOf(q, e) {
  const at = { x: e.clientX, y: e.clientY };
  if (!q || !screen || !screen.camera) return at;
  const r = canvas.getBoundingClientRect();
  const box = q.rect || (q.sprite ? [q.sx, q.sy, q.sprite.width, q.sprite.height] : null);
  if (!box) return at;
  return { ...at, rect: { x: r.left + (box[0] - cam.x) * cam.zoom, y: r.top + (box[1] - cam.y) * cam.zoom, w: box[2] * cam.zoom, h: box[3] * cam.zoom } };
}

function wheel(e) {
  if (!screen || !screen.camera) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  setZoom(cam.zoom + (e.deltaY < 0 ? 1 : -1), e.clientX - r.left, e.clientY - r.top);
}

// ------------------------------------------------------------------ main loop

function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - last < 50 || !G.state || document.hidden) return; // 20 fps is plenty for pixel art
  last = ts;
  const name = G.screen || 'hold';
  if (name !== screenName) {
    screenName = name;
    screen = screens[name];
    hover = null;
    if (screen.camera && !cam.set && screen.home) { const h = screen.home(wrap.getBoundingClientRect()); Object.assign(cam, h); cam.set = true; }
    wrap.scrollTop = 0;
  }
  render(ts / 1000);
}

function render(t) {
  const r = wrap.getBoundingClientRect();
  const dpr = DPR();
  let scale, view;
  if (screen.camera) {
    canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    clamp();
    scale = cam.zoom * dpr;
    view = { x: cam.x, y: cam.y, w: r.width / cam.zoom, h: r.height / cam.zoom };
  } else {
    const sc = fitScale();
    const { w: ww, h: wh } = screen.size(r.width, sc);
    const ch = Math.max(wh, Math.ceil(r.height / sc));
    canvas.style.width = ww * sc + 'px'; canvas.style.height = ch * sc + 'px';
    const W = Math.round(ww * sc * dpr), H = Math.round(ch * sc * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    scale = sc * dpr;
    view = { x: 0, y: 0, w: ww, h: ch };
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2e2527';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, -Math.round(view.x * scale) , -Math.round(view.y * scale));
  screen.draw(ctx, t, view);
  lighting(t, view, scale);
  ctx.setTransform(scale, 0, 0, scale, -Math.round(view.x * scale), -Math.round(view.y * scale));
  if (screen.overlay) screen.overlay(ctx, t, hover, mouse);
  if (hover) outline(hover, t);
}

// ------------------------------------------------------------------ lighting

/**
 * Darkness over the scene with warm pools of light: drawn at art resolution and scaled up with hard
 * pixels, in a few bands, so it stays pixel art.
 */
function lighting(t, view, scale) {
  if (!screen.lights) return;
  const W = Math.ceil(view.w) + 2, H = Math.ceil(view.h) + 2;
  if (light.width !== W || light.height !== H) { light.width = W; light.height = H; }
  const ox = Math.floor(view.x), oy = Math.floor(view.y);
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, W, H);
  const zones = screen.ambient(t, view);   // [{y0, y1, color, a, x0?, x1?}]
  for (const z of zones) {
    const x0 = z.x0 === undefined ? 0 : Math.max(0, z.x0 - ox), x1 = z.x1 === undefined ? W : Math.min(W, z.x1 - ox);
    if (x1 <= x0) continue;
    lctx.fillStyle = z.color; lctx.globalAlpha = z.a; lctx.fillRect(x0, z.y0 - oy, x1 - x0, z.y1 - z.y0);
  }
  lctx.globalAlpha = 1;
  const lights = screen.lights(t).filter((l) => l.x + l.r > view.x && l.x - l.r < view.x + view.w && l.y + l.r > view.y && l.y - l.r < view.y + view.h);
  lctx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const x = l.x - ox, y = l.y - oy, rr = l.r * (1 + Math.sin(t * 9 + l.x) * 0.03 * (l.flicker || 0));
    const g = lctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,1)'); g.addColorStop(0.46, 'rgba(0,0,0,0.7)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.7)'); g.addColorStop(0.71, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  ctx.setTransform(scale, 0, 0, scale, -Math.round(view.x * scale), -Math.round(view.y * scale));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(light, ox, oy);
  // warm glow on top
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.color) continue;
    const rr = l.r * 0.8;
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, rr);
    g.addColorStop(0, hexA(l.color, 0.22 * (l.power || 1))); g.addColorStop(0.5, hexA(l.color, 0.1 * (l.power || 1))); g.addColorStop(1, hexA(l.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(l.x - rr, l.y - rr, rr * 2, rr * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ------------------------------------------------------------------ hover outline

const outlined = new WeakMap();

function outline(h, t) {
  const glow = 0.75 + Math.sin(t * 5) * 0.25;
  if (h.sprite) {
    let o = outlined.get(h.sprite);
    if (!o) {
      o = S.mk(h.sprite.width + 2, h.sprite.height + 2);
      const c = o.getContext('2d');
      for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) c.drawImage(h.sprite, dx, dy);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = '#9ee08e'; c.fillRect(0, 0, o.width, o.height);
      c.globalCompositeOperation = 'destination-out';
      c.drawImage(h.sprite, 1, 1);
      outlined.set(h.sprite, o);
    }
    ctx.globalAlpha = glow;
    ctx.drawImage(o, Math.round(h.sx) - 1, Math.round(h.sy) - 1);
    ctx.globalAlpha = 1;
    return;
  }
  if (h.rect) {
    const [x, y, w, hh] = h.rect;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#9ee08e';
    const rr = h.round ? 4 : 0;
    ctx.fillRect(x + rr, y - 1, w - rr * 2, 1); ctx.fillRect(x + rr, y + hh, w - rr * 2, 1);
    ctx.fillRect(x - 1, y + rr, 1, hh - rr * 2); ctx.fillRect(x + w, y + rr, 1, hh - rr * 2);
    if (rr) for (let i = 0; i < rr; i++) {
      const k = rr - i;
      ctx.fillRect(x + i, y - 1 + k, 1, 1); ctx.fillRect(x + w - 1 - i, y - 1 + k, 1, 1);
      ctx.fillRect(x + i, y + hh - k, 1, 1); ctx.fillRect(x + w - 1 - i, y + hh - k, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

/** Scroll the hold camera so a world point sits in the middle of the first `width` css pixels. */
export function lookAt(x, y, width, height) {
  const r = wrap.getBoundingClientRect();
  if (cam.zoom < 2) cam.zoom = 2;
  cam.x = x - (width || r.width) / cam.zoom / 2; cam.y = y - (height || r.height) / cam.zoom / 2;
  clamp();
}

/** World point -> page pixels (hold camera). */
export function toScreen(x, y, w = 0, h = 0) {
  const r = canvas.getBoundingClientRect();
  const p = { x: r.left + (x - cam.x) * cam.zoom, y: r.top + (y - cam.y) * cam.zoom };
  if (w) p.rect = { x: p.x, y: p.y, w: w * cam.zoom, h: h * cam.zoom };
  return p;
}
