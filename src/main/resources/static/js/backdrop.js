// The backdrop behind the valley (built by art-src/props48/backdrop.py into art/backdrop/): far peaks, a mountain range,
// wooded hills, the forest edge and the massif the hold is cut into. Each layer slides slower than the world (k: how
// much of the camera's motion it follows) and is tinted for dusk and night.
//   await load();  draw(ctx, view, {day, dusk, ground, ref: {x, y}, place: {massif: x}})

let meta = null;
const layers = {};
const ORDER = ['far_peaks', 'mid_range', 'hills', 'forest_edge', 'massif'];
const TINT = { dusk: 'rgba(160,70,90,0.32)', night: 'rgba(24,30,70,0.5)' };

function image(src) {
  return new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src; });
}
function tinted(im, colour) {
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  if (colour) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = colour; g.fillRect(0, 0, c.width, c.height); }
  return c;
}

export async function load(base = 'art/backdrop/') {
  if (meta) return;
  try {
    const m = await fetch(base + 'backdrop.json').then((r) => r.json());
    await Promise.all(ORDER.map(async (name) => {
      const im = await image(base + name + '.png');
      layers[name] = { ...m[name], day: tinted(im), dusk: tinted(im, TINT.dusk), night: tinted(im, TINT.night) };
    }));
    meta = m;
  } catch (e) { console.warn('backdrop: not loaded', e); }
}
export const ready = () => !!meta;

/** Draw all layers. view: the visible world rectangle; ref: where the camera looks when the layers sit at home;
 * ground: the valley floor; place: world x of the anchor of layers that do not repeat. */
export function draw(ctx, view, o) {
  if (!meta) return;
  const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
  for (const name of ORDER) {
    const L = layers[name];
    const ox = (cx - o.ref.x) * (1 - L.k);
    const base = Math.round(o.ground + 4 + (cy - o.ref.y) * (1 - L.k) * 0.5);   // the layer's bottom edge
    const passes = [['night', 1], ['day', Math.min(1, o.day * 1.4)], ['dusk', o.dusk * 0.9]];
    for (const [tone, a] of passes) {
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      const pic = L[tone];
      if (L.tile) {
        const x0 = Math.floor((view.x - ox) / L.w) * L.w + ox;
        for (let x = x0; x < view.x + view.w; x += L.w) {
          ctx.drawImage(pic, Math.round(x), base - L.h);
          // under a layer that rose above the floor: its bottom row stretched down to the ground
          if (base < o.ground) ctx.drawImage(pic, 0, L.h - 1, L.w, 1, Math.round(x), base, L.w, o.ground - base + 2);
        }
      } else {
        const x = Math.round((o.place[name] || 0) + ox - L.ax);
        if (x < view.x + view.w && x + L.w > view.x) ctx.drawImage(pic, x, base - L.h);
      }
    }
    ctx.globalAlpha = 1;
  }
}
