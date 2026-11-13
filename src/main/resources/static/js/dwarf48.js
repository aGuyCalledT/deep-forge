// The 48 x 64 dwarf kit (art/dwarf48, built by art-src/dwarf48/build.py): stacks the part strips into one frame,
// the same way compose() does in Python, and swaps the placeholder ramps for a dwarf's colours.
//   await D.load();  D.draw(ctx, look, 'workSitBack', frame, x, floorY, {flip})
// look: {sex: 'm'|'f', hair, beard, hat, vest: true, mood, prop, quilt: true, ramps: {skin: [5 colours], hair: [...], ...}}
// The hold (hold.js) draws every dwarf with it (look48 turns a dwarf into a look); the room editor shows its spots with it.

import * as S from './sprites.js';   // colours and looks of a dwarf (used at call time only)

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
    case 'side_prop': case 'side_prop_back': {   // a raised tool (name ends in _up) is behind the body
      const back = typeof extra === 'string' && extra.endsWith('_up');
      const i = typeof extra === 'string' && kit.sideProps && back === (layer === 'side_prop_back') ? idx('sideProps', extra) : null;
      return i == null ? null : ['side_prop', i];
    }
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

// ------------------------------------------------------------------ how a dwarf of the hold looks in this kit

const OLD_HAIR = { short: 'short', fringe: 'short', bald: 'bald', topknot: 'topknot', long: 'long', wavy: 'long', braids: 'braids', bun: 'bun', pigtails: 'braids', mohawk: 'topknot' };
const OLD_BEARD = { full: 'full', wide: 'wide', braid: 'long', fork: 'fork', long: 'long', goatee: 'short', chops: 'wide', moustache: 'short' };
const HAIRS = Object.keys(OLD_HAIR), BEARDS = Object.keys(OLD_BEARD);

/** Five tones from one colour (tone 3 is the colour itself), the way the kit's ramps are built. */
export function ramp(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return null;
  const dark = '#140c16', light = '#fff2dc';
  return [S.mix(hex, dark, 0.66), S.mix(hex, dark, 0.44), S.mix(hex, dark, 0.22), hex.toLowerCase(), S.mix(hex, light, 0.32)];
}

const lookCache = new Map();
/** The dwarf48 look of a dwarf of the hold: hair, beard, colours from its looks and clothes, its mood. */
export function look48(d, extra = {}) {
  const md = S.mood(d);
  const key = [d.id, d.sex, d.hairStyle, d.beardStyle, d.skin, d.hair, d.outfit, d.helm, JSON.stringify(d.wear || {}), md, extra.prop || '', extra.quilt, extra.hat || ''].join('|');
  let L = lookCache.get(key);
  if (L) return L;
  const o = S.look(d), wear = {};
  for (const [slot, k] of Object.entries(d.wear || {})) { const w = S.parseWear(k); if (w) wear[slot] = w.color; }
  const ramps = {};
  const put = (name, hex) => { const r = ramp(hex); if (r) ramps[name] = r; };
  put('skin', o.skin); put('hair', o.hair);
  put('tunic', wear.top || d.outfit || '#4b8a4f'); put('pants', wear.legs); put('boots', wear.feet);
  if (wear.apron) put('vest', wear.apron);
  L = {
    sex: o.sex, hair: OLD_HAIR[HAIRS[o.hairStyle]] || 'short', beard: o.sex === 'm' ? OLD_BEARD[BEARDS[o.beard]] || 'full' : null,
    hat: extra.hat || (d.helm ? 'helm' : null), vest: true, mood: md, prop: extra.prop || null, quilt: extra.quilt, ramps,
  };
  if (lookCache.size > 600) lookCache.clear();
  lookCache.set(key, L);
  return L;
}
