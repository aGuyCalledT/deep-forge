// The 48-px art (rooms from parts, valley, rock, monsters, effects): loads art/scene/sheet.{png,json}
// (built by art-src/scene/export.py) and hands out single frames as canvases, recoloured and mirrored on demand.
//   await Art.load();  Art.draw(ctx, 'anvil', 0, x, floorY);  Art.draw(ctx, 'ingots', 0, x, y, {recolour: {ingot: ramp}})
// Frames are drawn with their anchor at x, y: props stand on it, wall things hang from it, tiles start there.
// The hold (hold.js) draws valley, rock, rooms, monsters and effects with it; the room editor uses it too.

let meta = null, sheet = null, glowSheet = null;
const cache = new Map();

function image(src) {
  return new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src; });
}
export async function load(base = 'art/scene/') {
  if (meta) return meta;
  const [m, s, g] = await Promise.all([fetch(base + 'sheet.json').then(r => r.json()), image(base + 'sheet.png'), image(base + 'glow.png')]);
  meta = m; sheet = s; glowSheet = g;
  return meta;
}
export const ready = () => !!meta;
export const info = name => meta && meta.sprites[name];
export const frames = name => (meta && meta.sprites[name]) ? meta.sprites[name].frames.length : 0;
export const names = group => meta ? Object.keys(meta.sprites).filter(n => !group || meta.sprites[n].group === group) : [];
/** The 5-tone rock ramp of a mine layer, for {recolour: {rockd: depthRamp(d)}}. */
export const depthRamp = d => meta.depths[Math.max(0, Math.min(meta.depths.length - 1, d))];

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
function key(name, f, o) { return `${name}|${f}|${o.flip ? 1 : 0}|${o.glow ? 1 : 0}|${o.recolour ? JSON.stringify(o.recolour) : ''}`; }

/** One frame as a canvas plus its anchor: {canvas, ax, ay}. opts: {flip, glow, recolour: {placeholder: [5 colours]}} */
export function frame(name, f = 0, opts = {}) {
  const s = meta.sprites[name];
  if (!s) throw new Error(`scene art: no sprite "${name}"`);
  const fr = s.frames[((f % s.frames.length) + s.frames.length) % s.frames.length];
  const k = key(name, fr, opts);
  if (cache.has(k)) return cache.get(k);
  const [x, y, w, h, ax, ay] = fr;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(opts.glow ? glowSheet : sheet, x, y, w, h, 0, 0, w, h);
  if (opts.recolour && s.recolour) {
    const swap = new Map();
    for (const [ph, ramp] of Object.entries(opts.recolour)) {
      const from = meta.placeholders[ph];
      if (!from || !ramp) continue;
      from.forEach((c0, i) => swap.set(hex(c0).join(','), hex(ramp[i])));
    }
    const d = g.getImageData(0, 0, w, h), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const to = swap.get(`${p[i]},${p[i + 1]},${p[i + 2]}`);
      if (to) { p[i] = to[0]; p[i + 1] = to[1]; p[i + 2] = to[2]; }
    }
    g.putImageData(d, 0, 0);
  }
  let out = c, oax = ax;
  if (opts.flip) {
    out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d'); o.translate(w, 0); o.scale(-1, 1); o.drawImage(c, 0, 0);
    oax = w - 1 - ax;
  }
  const res = { canvas: out, ax: oax, ay };
  cache.set(k, res);
  return res;
}
/** Draw a frame with its anchor at (x, y). */
export function draw(ctx, name, f, x, y, opts = {}) {
  const fr = frame(name, f, opts);
  ctx.drawImage(fr.canvas, Math.round(x - fr.ax), Math.round(y - fr.ay));
  return fr;
}
/** Repeat a tile sideways from x0 to x0 + width (tiles line up with world x, so neighbours join seamlessly). */
export function tile(ctx, name, x0, y, width, opts = {}) {
  const fr = frame(name, 0, opts), w = fr.canvas.width, h = fr.canvas.height;
  const start = x0 - (((x0 % w) + w) % w);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y - fr.ay, width, h); ctx.clip();
  for (let x = start; x < x0 + width; x += w) ctx.drawImage(fr.canvas, x, y - fr.ay);
  ctx.restore();
}
