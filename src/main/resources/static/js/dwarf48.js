// The 48 x 64 dwarf kit (art/dwarf48, built by art-src/dwarf48/build.py): stacks the part strips into one frame,
// the same way compose() does in Python, and swaps the placeholder ramps for a dwarf's colours.
//   await D.load();  D.draw(ctx, look, 'workSitBack', frame, x, floorY, {flip})
// look: {sex: 'm'|'f', hair, beard, hat, vest: true, mood, prop, quilt: true, ramps: {skin: [5 colours], hair: [...], ...}}
// Not used by the game yet (it still draws the dwarf/ kit); the room editor shows its spots with it.

let kit = null;
const strips = {}, cache = new Map();
const image = src => new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src; });

export async function load(base = 'art/dwarf48/') {
  if (kit) return kit;
  const k = await fetch(base + 'kit.json').then(r => r.json());
  await Promise.all(Object.keys(k.sheets).map(async n => { strips[n] = await image(`${base}${n}.png`); }));
  kit = k;
  return kit;
}
export const ready = () => !!kit;
export const poses = () => kit ? Object.keys(kit.poses) : [];
export const frames = pose => kit && kit.poses[pose] ? kit.poses[pose].frames.length : 0;

/** The strip and frame index of one layer, or null. */
function part(layer, view, look, row) {
  const [lf, af, , mood, extra] = row, sex = look.sex === 'f' ? 'f' : 'm';
  const idx = (list, v) => { const i = kit[list].indexOf(v); return i < 0 ? null : i; };
  switch (layer) {
    case 'legs': return [`${view}_legs_${sex}`, lf];
    case 'body': return [`${view}_body_${sex}`, 0];
    case 'vest': return look.vest === false ? null : [`${view}_vest_${sex}`, 0];
    case 'head': return [`${view}_head`, 0];
    case 'face': return [`${view}_face_${sex}`, idx('moods', mood || look.mood || 'neutral') ?? 0];
    case 'hair': { const i = idx('styles', look.hair || 'short'); return i == null ? null : [`${view}_hair`, i]; }
    case 'hat': { const i = look.hat ? idx('hats', look.hat) : null; return i == null ? null : [`${view}_hat`, i]; }
    case 'beard': { const i = sex === 'm' && look.beard ? idx('beards', look.beard) : null; return i == null ? null : [`${view}_beard`, i]; }
    case 'arms': return [`${view}_arms_${sex}`, af];
    case 'arm_far': return ['side_arm_far', af];
    case 'arm_near': return ['side_arm_near', af];
    case 'prop': { const p = extra || look.prop; const i = typeof p === 'string' ? idx('props', p) : null; return i == null ? null : ['front_prop', i]; }
    case 'quilt': return typeof extra === 'number' && look.quilt !== false ? ['side_quilt', extra] : null;   // quilt: false = the bed has one
  }
  return null;
}

/** One frame as a 48 x 64 canvas (anchor = kit.anchor), cached per look, pose and frame. */
export function frame(look, pose, f = 0) {
  const P = kit.poses[pose];
  if (!P) throw new Error(`dwarf48: no pose "${pose}"`);
  const row = P.frames[((f % P.frames.length) + P.frames.length) % P.frames.length];
  const key = JSON.stringify([look, pose, row]);
  if (cache.has(key)) return cache.get(key);
  const [W, H] = kit.cell, dy = row[2];
  let c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (const layer of kit.order[P.view]) {
    const pr = part(layer, P.view, look, row);
    if (!pr || !strips[pr[0]] || pr[1] == null) continue;
    const y = layer === 'legs' || layer === 'quilt' ? 0 : dy;
    if (layer === 'hair' && look.hat) {          // under a hat only the hair below hatClip shows
      g.drawImage(strips[pr[0]], pr[1] * W, kit.hatClip, W, H - kit.hatClip, 0, kit.hatClip + y, W, H - kit.hatClip);
    } else g.drawImage(strips[pr[0]], pr[1] * W, 0, W, H, 0, y, W, H);
  }
  if (look.ramps) {
    const swap = new Map(), hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
    for (const [name, ramp] of Object.entries(look.ramps)) (kit.ramps[name] || []).forEach((c0, i) => ramp[i] && swap.set(hex(c0).join(), hex(ramp[i])));
    const d = g.getImageData(0, 0, W, H), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const to = p[i + 3] && swap.get(`${p[i]},${p[i + 1]},${p[i + 2]}`); if (to) [p[i], p[i + 1], p[i + 2]] = to; }
    g.putImageData(d, 0, 0);
  }
  if (pose === 'sleep') {                        // lie down: the side frame turned a quarter left, head to the left
    const r = document.createElement('canvas'); r.width = H; r.height = W;
    const rg = r.getContext('2d'); rg.translate(0, W); rg.rotate(-Math.PI / 2); rg.drawImage(c, 0, 0); c = r;
  }
  cache.set(key, c);
  return c;
}
/** Draw with the feet (kit.anchor) at x, y; side views face right unless flip. Sleeping dwarves: x, y = middle of the mattress. */
export function draw(ctx, look, pose, f, x, y, opts = {}) {
  const c = frame(look, pose, f), [ax, ay] = pose === 'sleep' ? [37, 36] : kit.anchor;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  if (opts.flip) ctx.scale(-1, 1);
  ctx.drawImage(c, -ax, -ay);
  ctx.restore();
}
