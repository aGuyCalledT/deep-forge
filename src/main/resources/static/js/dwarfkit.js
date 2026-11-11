// Dwarves from PNG parts (static/art/dwarf/, drawn in Pixelwright; see docs/SPRITES.md).
// Every part is a strip of 32 x 44 frames that all line up, so a dwarf is the parts drawn on top of each other.
// Placeholder colours (the ramps in kit.json) are swapped for the dwarf's own skin, hair, clothes and metal.
import Figure from './figure.js';

const CW = 44, CH = 52, OX = 6, OY = 6;        // output canvas: room for a tool that sticks out
let K = null;                                  // kit.json
const sheets = {};                             // name -> {img, data: ImageData}
const tinted = new Map();                      // sheet + colour key -> canvas

export const ready = () => !!K;

export async function load() {
  try {
    const kit = await fetch('/art/dwarf/kit.json').then((r) => r.json());
    await Promise.all(Object.keys(kit.sheets).map((name) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        sheets[name] = { canvas: c, data: g.getImageData(0, 0, c.width, c.height) };
        res();
      };
      img.onerror = rej;
      img.src = '/art/dwarf/' + name + '.png';
    })));
    K = kit;
  } catch (e) {
    console.warn('dwarf kit missing, falling back to drawn figures', e);
    K = null;
  }
}

// ------------------------------------------------------------------ colours

const pack = (hex) => parseInt(hex.slice(1, 7), 16);
/** Placeholder -> colour for every ramp given in cols ({skin: '#..', hair: '#..', ...}). */
function colourMap(cols) {
  const m = new Map();
  for (const [name, base] of Object.entries(cols)) {
    const src = K.ramps[name];
    if (!src || !base) continue;
    const dst = src.length === 1 ? [base] : Figure.ramp(base, src.length, name === 'skin');
    src.forEach((h, i) => m.set(pack(h), pack(dst[i])));
  }
  return m;
}
/** A sheet in the given colours (cached). */
function sheet(name, cols) {
  const key = name + '|' + JSON.stringify(cols);
  if (tinted.has(key)) return tinted.get(key);
  const s = sheets[name];
  const map = colourMap(cols);
  const c = document.createElement('canvas');
  c.width = s.canvas.width; c.height = s.canvas.height;
  const g = c.getContext('2d'), id = g.createImageData(c.width, c.height), a = s.data.data, b = id.data;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const n = map.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]);
    if (n === undefined) { b[i] = a[i]; b[i + 1] = a[i + 1]; b[i + 2] = a[i + 2]; }
    else { b[i] = n >> 16; b[i + 1] = (n >> 8) & 255; b[i + 2] = n & 255; }
    b[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  tinted.set(key, c);
  return c;
}

// ------------------------------------------------------------------ what a dwarf looks like

// the old figure kit had more styles; each maps onto the nearest drawn one
const HAIR_OF = { short: 'short', fringe: 'short', bald: 'bald', topknot: 'topknot', long: 'long', wavy: 'long', braids: 'braids', bun: 'bun', pigtails: 'braids', mohawk: 'topknot' };
const BEARD_OF = { full: 'full', wide: 'wide', braid: 'fork', fork: 'fork', long: 'long', goatee: 'short', chops: 'short', moustache: 'short' };
const HAT_OF = { helm: 'helm', horned: 'helm', miner: 'helm', hood: 'hood', beanie: 'cap', pointy: 'cap', bandana: 'cap', flower: 'cap' };
const WORK_ANGLE = [-2.6, -1.2, 0.9, 0.2];
const TOOL_LEN = { stick: 13, pick: 11, hammer: 8, shovel: 11, paddle: 11, hoe: 11, axe: 10, chisel: 6, saw: 9 };

/**
 * One frame of a dwarf (or a stranger). s: {sex, hairStyle, beard, skin, hair, eye, freckles, wear, armor, helm,
 * pose, frame, mood, tool, toolMetal, blink}. Returns a canvas with .ax/.ay (the ground point between the feet).
 */
export function dwarf(s) {
  const pose = s.pose || 'idle', frame = s.frame || 0, fem = s.sex === 'f';
  const wear = s.wear || {};
  const base = {
    skin: s.skin, hair: s.hair, eye: s.eye,
    tunic: s.armor || (wear.top && wear.top.color) || '#7a8a9a',
    pants: (wear.legs && wear.legs.color) || '#6a5047',
    boots: (wear.feet && wear.feet.color) || '#5c3c30',
  };
  const style = HAIR_OF[s.hairStyle] || 'short';
  const beard = fem ? null : BEARD_OF[s.beard] || null;
  let hat = null, hatCols = null;
  if (s.helm) { hat = 'helm'; hatCols = { metal: s.helm }; }
  else if (wear.hat && HAT_OF[wear.hat.look]) {
    hat = HAT_OF[wear.hat.look];
    hatCols = hat === 'helm' ? { metal: wear.hat.color } : { cloth: wear.hat.color };
  }
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const g = c.getContext('2d');
  const put = (name, i, dy = 0, cols = base, clip = 0) => {
    if (i < 0 || !sheets[name]) return;
    const img = sheet(name, cols);
    g.drawImage(img, i * 32, clip, 32, 44 - clip, OX, OY + dy + clip, 32, 44 - clip);
  };
  const idx = (list, v) => K[list].indexOf(v);
  const hairClip = hat ? K.hatClip : 0;
  const view = Figure.VIEW[pose] || 'front';
  const moodI = idx('moods', pose === 'sleep' ? 'sleep' : s.mood || 'neutral');
  const talking = (pose === 'talk' || pose === 'sitTalk') && frame % 2 === 1;
  const blink = pose === 'idle' && frame === 1 && (s.blink || 0) % 3 === 0;
  const face = (prefix, dy) => {
    put(prefix + '_face', talking ? idx('moods', 'open') : moodI, dy);
    if (blink) put(prefix + '_face', K.moods.length, dy);
  };

  if (view === 'front') {
    const seated = Figure.SEATED ? !!Figure.SEATED[pose] : ['sit', 'sitTalk', 'eat', 'drink'].includes(pose);
    const breath = (pose === 'idle' || pose === 'sit') && frame === 1 ? 1 : 0;
    const bf = (seated ? 2 : 0) + breath, dy = K.frontDy[bf];
    put('front_body_' + (fem ? 'f' : 'm'), bf);
    put('front_head', 0, dy);
    face('front', dy);
    if (s.freckles) freckles(g, dy, base.skin);
    if (beard) put('front_beard', idx('beards', beard), dy);
    put('front_hair', idx('styles', style), dy, base, hairClip);
    if (hat) put('front_hat', idx('hats', hat), dy, hatCols);
    let arm = 0, prop = null;
    if (pose === 'eat') { arm = [0, 1, 2, 1][frame % 4]; prop = [null, 'spoon_mid', 'spoon_up', 'spoon_mid'][frame % 4]; }
    if (pose === 'drink') { arm = frame % 2 ? 2 : 0; prop = frame % 2 ? 'mug_up' : 'mug_down'; }
    if (!prop && s.tool && (s.tool.kind === 'axe' || s.tool.kind === 'sack')) prop = s.tool.kind;
    put('front_arm_' + (fem ? 'f' : 'm'), arm, dy);
    if (prop) put('front_prop', idx('props', prop), dy, { metal: s.toolMetal || '#9a9aa6', cloth: '#b08a5a' });
    c.ax = OX + K.anchor[0]; c.ay = OY + K.anchor[1];
    return c;
  }

  if (view === 'back') {
    const f = frame % 2;
    put('back_body_' + (fem ? 'f' : 'm'), f);
    put('back_head', 0);
    if (beard) put('back_beard', idx('beards', beard));
    put('back_hair', idx('styles', style), 0, base, hairClip);
    if (hat) put('back_hat', idx('hats', hat), 0, hatCols);
    put('back_arm', f);
    c.ax = OX + K.anchor[0]; c.ay = OY + K.anchor[1];
    return c;
  }

  // side view (facing right): walk 0-3, work 4-7, standing 8
  const sf = pose === 'walk' ? frame % 4 : pose === 'work' ? 4 + (frame % 4) : 8;
  const dy = K.sideDy[sf];
  put('side_body_' + (fem ? 'f' : 'm'), sf);
  put('side_head', 0, dy);
  face('side', dy);
  put('side_hair', idx('styles', style), dy, base, hairClip);
  if (beard) put('side_beard', idx('beards', beard), dy);
  if (hat) put('side_hat', idx('hats', hat), dy, hatCols);
  if (s.tool && s.tool.kind !== 'sack' && (pose === 'work' || pose === 'walk')) {
    const [hx, hy] = K.sideHands[sf];
    tool(g, s.tool.kind, OX + hx, OY + hy + (pose === 'walk' ? dy : 0), pose === 'work' ? WORK_ANGLE[frame % 4] : -1.9, s.toolMetal || '#9a9aa6');
  }
  put('side_arm', sf);
  if (pose === 'sleep') {
    put('side_quilt', frame % 2, 0, { cloth: s.quilt || '#b8607e' });
    return lieDown(c);
  }
  c.ax = OX + K.anchor[0]; c.ay = OY + K.anchor[1];
  return c;
}

function freckles(g, dy, skin) {
  g.fillStyle = Figure.ramp(skin, 4, true)[1];
  for (const [x, y] of [[11, 12], [12, 13], [19, 12], [20, 13]]) g.fillRect(OX + x, OY + y + dy, 1, 1);
}

/** A tool in the hands: a wooden handle from the grip and a metal head, outlined. */
function tool(g, kind, hx, hy, ang, metal) {
  const len = TOOL_LEN[kind] || 9, dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
  const wood = ['#5e3d22', '#8a5e3a', '#b8885a'], m = Figure.ramp(metal, 4);
  const pts = [], head = [];
  const ex = hx + dx * len, ey = hy + dy * len;
  for (let t = -2; t <= len; t += 0.5) pts.push([Math.round(hx + dx * t), Math.round(hy + dy * t)]);
  const span = (a, b) => { for (let t = a; t <= b; t += 0.5) head.push([Math.round(ex + px * t), Math.round(ey + py * t)]); };
  if (kind === 'pick') span(-4, 4);
  else if (kind === 'hammer' || kind === 'chisel') { span(-2, 2); for (let t = -2; t <= 2; t += 0.5) head.push([Math.round(ex + px * t - dx), Math.round(ey + py * t - dy)]); }
  else if (kind === 'axe') { span(0, 3); for (let t = 0; t <= 3; t += 0.5) head.push([Math.round(ex + px * t - dx), Math.round(ey + py * t - dy)]); }
  else if (kind === 'shovel' || kind === 'paddle') { for (let t = 0; t <= 4; t += 0.5) for (const o of [-1, 0, 1]) head.push([Math.round(ex + dx * t + px * o), Math.round(ey + dy * t + py * o)]); }
  else if (kind === 'hoe') span(0, 3);
  else if (kind !== 'stick') span(-1, 1);
  const all = pts.concat(head);
  g.fillStyle = '#1d1922';
  for (const [x, y] of all) g.fillRect(x - 1, y - 1, 3, 3);
  pts.forEach(([x, y], i) => { g.fillStyle = wood[i % 5 === 0 ? 0 : 1]; g.fillRect(x, y, 1, 1); });
  const metalHead = kind !== 'paddle';
  head.forEach(([x, y], i) => { g.fillStyle = metalHead ? m[i % 3 === 0 ? 3 : 2] : wood[2]; g.fillRect(x, y, 1, 1); });
}

/** Sleeping: the standing figure under its quilt, turned on its side, trimmed. */
function lieDown(c) {
  const r = document.createElement('canvas');
  r.width = CH; r.height = CW;
  const g = r.getContext('2d');
  g.translate(0, CW); g.rotate(-Math.PI / 2); g.drawImage(c, 0, 0);
  const d = g.getImageData(0, 0, r.width, r.height).data;
  let x0 = r.width, y0 = r.height, x1 = 0, y1 = 0;
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (d[(y * r.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(r, -x0, -y0);
  out.ax = Math.round(out.width / 2); out.ay = out.height - 1;
  return out;
}
