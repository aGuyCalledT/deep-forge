// Pixel art generated from code. Every sprite has an id; a PNG with the same id in the server's
// sprites folder (e.g. sprites/ore/galena.png) replaces the generated one. See docs/SPRITES.md.
import { byId } from './data.js';

const cache = new Map();
const overrides = new Map(); // id -> HTMLImageElement (loaded)
export const OUTLINE = '#0c090e';

export async function loadOverrides(ids) {
  await Promise.all(ids.map((id) => new Promise((res) => {
    const img = new Image();
    img.onload = () => { overrides.set(id, img); res(); };
    img.onerror = () => res();
    img.src = '/sprites/' + id + '.png';
  })));
}

export function hasOverride(id) { return overrides.has(id); }
export function overrideImage(id) { return overrides.get(id); }

// ------------------------------------------------------------------ helpers

export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** f > 0 lightens towards white, f < 0 darkens towards black. */
export function shade(hex, f) {
  const [r, g, b] = rgb(hex);
  const t = f > 0 ? 255 : 0, a = Math.abs(f);
  const h = (v) => Math.round(v + (t - v) * a).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

export function mix(a, b, t) {
  const x = rgb(a), y = rgb(b);
  const h = (i) => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
  return '#' + h(0) + h(1) + h(2);
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function P(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

/** Draw rows of characters with a palette. ' ' and '.' are transparent. */
function rows(ctx, x0, y0, lines, pal) {
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const c = pal[line[x]];
      if (c) P(ctx, x0 + x, y0 + y, c);
    }
  });
}

/** 1px dark outline around everything drawn so far. */
function outline(c, color = OUTLINE) {
  const ctx = c.getContext('2d');
  const { width: w, height: h } = c;
  const d = ctx.getImageData(0, 0, w, h).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ctx.fillRect(x, y, 1, 1);
  }
  return c;
}

function cached(id, w, h, draw, doOutline = true) {
  if (overrides.has(id)) return overrides.get(id);
  if (cache.has(id)) return cache.get(id);
  const c = mk(w, h);
  draw(c.getContext('2d'), c);
  if (doOutline) outline(c);
  cache.set(id, c);
  return c;
}

// ------------------------------------------------------------------ goods

const ROCK = '#6e6672';

export function ore(id) {
  const o = byId.ores[id];
  return cached('ore/' + id, 14, 13, (ctx) => {
    const r = rand(hash(id));
    lump(ctx, ROCK, r);
    const n = 7 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const x = 3 + Math.floor(r() * 8), y = 3 + Math.floor(r() * 7);
      P(ctx, x, y, o.color);
      if (r() < 0.5) P(ctx, x + 1, y, shade(o.color, -0.25));
      if (r() < 0.35) P(ctx, x, y - 1, shade(o.color, 0.45));
    }
    if (id.startsWith('native_')) { P(ctx, 5, 4, '#ffffff'); P(ctx, 9, 7, shade(o.color, 0.7)); }
  });
}

function lump(ctx, base, r) {
  const shape = [
    '....xxxxx.....',
    '..xxxxxxxxx...',
    '.xxxxxxxxxxx..',
    '.xxxxxxxxxxxx.',
    'xxxxxxxxxxxxx.',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    '.xxxxxxxxxxxxx',
    '.xxxxxxxxxxxx.',
    '..xxxxxxxxxx..',
    '....xxxxxx....',
  ];
  shape.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      if (line[x] !== 'x') continue;
      const light = (x + y) < 8 ? 0.18 : (x + y) > 17 ? -0.28 : 0;
      const n = (r() - 0.5) * 0.08;
      P(ctx, x, y, shade(base, light + n));
    }
  });
}

export function bar(metal) {
  const m = byId.metals[metal];
  return cached('bar/' + metal, 16, 10, (ctx) => {
    const c = m.color;
    R(ctx, 3, 1, 10, 3, shade(c, 0.35));        // top face
    R(ctx, 1, 4, 14, 4, c);                      // front
    R(ctx, 2, 3, 12, 1, shade(c, 0.2));
    R(ctx, 1, 7, 14, 1, shade(c, -0.3));
    P(ctx, 4, 2, '#ffffff'); P(ctx, 5, 2, shade(c, 0.7));
    R(ctx, 3, 5, 3, 1, shade(c, 0.25));
    P(ctx, 13, 5, shade(c, -0.2));
    if (m.alloy) { P(ctx, 9, 5, shade(c, 0.4)); P(ctx, 11, 6, shade(c, -0.15)); }
  });
}

export function raw(id) {
  return cached('raw/' + id, 14, 14, (ctx) => {
    const r = rand(hash(id));
    switch (id) {
      case 'coal':
        lump(ctx, '#2a282d', r);
        P(ctx, 4, 3, '#8a8a99'); P(ctx, 8, 6, '#6c6c7a'); P(ctx, 5, 8, '#55555f');
        break;
      case 'limestone':
        R(ctx, 2, 3, 10, 8, '#d8d2bd'); R(ctx, 2, 3, 10, 2, '#ebe6d4'); R(ctx, 2, 10, 10, 1, '#a9a28a');
        P(ctx, 5, 6, '#bdb59c'); P(ctx, 9, 8, '#bdb59c');
        break;
      case 'stone':
        R(ctx, 2, 4, 10, 8, '#7d7a73'); R(ctx, 3, 2, 10, 3, '#9a978e'); R(ctx, 11, 4, 2, 8, '#5f5c56');
        P(ctx, 5, 7, '#6a675f'); P(ctx, 8, 9, '#6a675f');
        break;
      case 'rough_gem':
        lump(ctx, '#5b5560', r);
        rows(ctx, 4, 2, ['..a..', '.aba.', 'abbba', '.aba.', '..a..'], { a: '#3d8f80', b: '#6fd6c2' });
        P(ctx, 6, 3, '#e8fff9');
        break;
      case 'cut_gem':
        rows(ctx, 2, 3, [
          '..aaaaaa..',
          '.abbbbbba.',
          'acccccccca',
          '.adddddda.',
          '..adddda..',
          '...adda...',
          '....aa....'], { a: '#2d8f7e', b: '#b8fff0', c: '#6fe0c8', d: '#3fb8a2' });
        P(ctx, 5, 4, '#ffffff');
        break;
      case 'food':
        rows(ctx, 1, 1, [
          '...aaaaaa...',
          '.aabbabbbaa.',
          'abbbbbbabbba',
          'abcbbbbbbcba',
          '.aaaaaaaaaa.',
          '....dddd....',
          '....deed....',
          '....deed....',
          '...ddeedd...',
          '...dddddd...'], { a: '#8a5a32', b: '#b48a5a', c: '#efe0c0', d: '#d8c8a8', e: '#f4ead4' });
        break;
      case 'ale':
        rows(ctx, 1, 1, [
          '.aaaaaaa....',
          'abbbbbbba...',
          'acccccccaaa.',
          'adddddddae.a',
          'adddfdddae.a',
          'adddfdddae.a',
          'adddddddaaa.',
          'agggggggaa..',
          '.aaaaaaa....'], { a: '#3a2412', b: '#fff8e8', c: '#efe0b8', d: '#d9a94a', e: '#7a4a24', f: '#f0c870', g: '#8a5a2a' });
        break;
      default:
        lump(ctx, '#777', r);
    }
  });
}

export function good(key) {
  if (key.startsWith('item:')) {
    const p = key.split(':');
    return item(p[1], p[2], +p[3], p[4] || '');
  }
  if (key.startsWith('bar:')) return bar(key.slice(4));
  if (byId.ores[key]) return ore(key);
  return raw(key);
}

const WOOD = '#7a4a2a';

export function item(type, metal, q = 1, mods = '') {
  const id = `item/${type}/${metal}/${q}/${mods}`;
  const base = 'item/' + type;
  if (overrides.has(base)) return overrides.get(base);
  const c0 = byId.metals[metal] ? byId.metals[metal].color : '#999';
  return cached(id, 16, 16, (ctx) => {
    const pal = { m: c0, l: shade(c0, 0.45), d: shade(c0, -0.35), w: WOOD, v: shade(WOOD, -0.3), x: '#ffffff', g: '#6fe0c8' };
    const art = {
      pickaxe: [
        '...lmmmmmd......',
        '.lmmd...mmmd....',
        'lmd.....wv.mmd..',
        'md.....wv....md.',
        'd.....wv......d.',
        '.....wv.........',
        '....wv..........',
        '...wv...........',
        '..wv............',
        '.wv.............',
        'wv..............'],
      axe: [
        '.........lmm....',
        '........lmmmd...',
        '.......lmmmmmd..',
        '......wvmmmmmd..',
        '.....wv.dmmmmd..',
        '....wv...dmmd...',
        '...wv.....dd....',
        '..wv............',
        '.wv.............',
        'wv..............'],
      helm: [
        '................',
        '.....lmmmmd.....',
        '...lmmmmmmmmd...',
        '..lmmmmmmmmmmd..',
        '..mmmmmmmmmmmd..',
        '.dddddddddddddd.',
        '.dm....m....md..',
        '..m....m....m...',
        '.......m........'],
      mail: [
        '...mm......mm...',
        '..mlmmmmmmmmlm..',
        '.mmlmdmdmdmdlmm.',
        'mmmdmdmdmdmdmdmm',
        'mdm.mdmdmdmdm.dm',
        '.d..dmdmdmdmd...',
        '....mdmdmdmdm...',
        '....dmdmdmdmd...',
        '....mdmdmdmdm...',
        '....ddddddddd...'],
      chain: [
        '.lmd............',
        'm..d............',
        'm..dlmd.........',
        '.mmd..md........',
        '....m..dlmd.....',
        '.....mmd..md....',
        '........m..dlmd.',
        '.........mmd..md',
        '............m..d',
        '.............mmd'],
      goblet: [
        '..lmmmmmmmmd....',
        '..l........d....',
        '..lmmmmmmmmd....',
        '...lmmmmmmd.....',
        '....lmmmmd......',
        '......md........',
        '......md........',
        '......md........',
        '....lmmmmd......',
        '...dddddddd.....'],
      ring: [
        '................',
        '......xgg.......',
        '.....lmggd......',
        '....lm...md.....',
        '...lm.....md....',
        '...m.......d....',
        '...m.......d....',
        '...dm.....dd....',
        '....dm...dd.....',
        '.....ddddd......'],
      crown: [
        '..m....m....m...',
        '..lm..lmd..lmd..',
        '..lmd.lmd.lmmd..',
        '..lmmmmmmmmmmd..',
        '..lmgmmmgmmmgd..',
        '..lmmmmmmmmmmd..',
        '..ddddddddddddd.'],
    }[type] || ['mmmm', 'mmmm'];
    const oy = Math.max(0, Math.floor((16 - art.length) / 2));
    rows(ctx, 0, oy, art, pal);
    if (mods.includes('s')) { P(ctx, 12, oy + 1, '#ffffff'); P(ctx, 13, oy + 2, '#ffffff'); }
    if (mods.includes('e')) { P(ctx, 7, oy + 3, shade(c0, -0.55)); P(ctx, 9, oy + 3, shade(c0, -0.55)); P(ctx, 8, oy + 4, shade(c0, -0.55)); }
    if (mods.includes('g')) { P(ctx, 8, oy + 2, '#6fe0c8'); P(ctx, 8, oy + 3, '#3fb8a2'); }
    if (q >= 4) { P(ctx, 14, 1, '#fff6c0'); P(ctx, 15, 1, '#f2b33d'); P(ctx, 14, 0, '#f2b33d'); }
  });
}

export function coin() {
  return cached('ui/coin', 9, 9, (ctx) => {
    rows(ctx, 1, 1, ['.aaaaa.', 'abbbbba', 'abcbbba', 'abcbbba', 'abbbbba', 'adbbbda', '.aaaaa.'],
      { a: '#a86e12', b: '#f2b33d', c: '#fff0b0', d: '#c98a1c' });
  });
}

export function artifact() {
  return cached('ui/artifact', 14, 14, (ctx) => {
    rows(ctx, 2, 1, [
      '....aa....',
      '...abba...',
      '..abccba..',
      '.abcddcba.',
      '..abccba..',
      '...abba...',
      '....aa....',
      '...eeee...',
      '..effffe..',
      '.eeeeeeee.'], { a: '#7a4ab8', b: '#a77be0', c: '#d7b8ff', d: '#ffffff', e: '#6b4a1e', f: '#c9962a' });
  });
}

// ------------------------------------------------------------------ tab & ui icons

export function icon(name) {
  return cached('ui/' + name, 14, 14, (ctx) => {
    const pal = { a: '#f2b33d', b: '#c98a1c', c: '#f3e9d2', d: '#8a7a6a', e: '#e2622b', f: '#6aa6d8', g: '#7bc67b', h: '#5a4a3a', r: '#e05a4f' };
    const art = {
      fortress: ['a.a.a....a.a.a', 'aaaaa....aaaaa', '.aaa.a.a.a.aaa.', '.aaaaaaaaaaaa.', '.aaaabbbbaaaa.', '.aaab....baaa.', '.aaab....baaa.', '.aaab....baaa.', '.aaaaaaaaaaaa.'],
      dwarves: ['....dddd....', '...dddddd...', '...cccccc...', '...c.cc.c...', '..eeeeeeee..', '..eeeeeeee..', '...eeeeee...', '....eeee....', '..ffffffff..', '..ff....ff..'],
      work: ['.......e.....', '......eee....', '.....e.e.....', '..ddddddddd..', '.ddddddddddd.', '..ddddddddd..', '....ddddd....', '....ddddd....', '..ddddddddd..'],
      trade: ['....aaaa....', '...abbbba...', '...abccba...', '....aaaa....', '..hhhhhhhhh.', '.hcccccccch.', '.hhhhhhhhhh.', '..dd....dd..', '..dd....dd..'],
      explore: ['.....hh.....', '....hhhh....', '....haah....', '...haeeah...', '...haeeah...', '...haaaah...', '....hhhh....', '.....hh.....', '....hhhh....'],
      war: ['c..........c', '.c........c.', '..c......c..', '...c....c...', '....c..c....', '.....cc.....', '....c..c....', '..hc....ch..', '.hh......hh.'],
      more: ['..cccccccc..', '.cddddddddc.', '.cdccccccdc.', '.cdddddddc..', '.cdccccdc...', '.cddddddc...', '..ccccccc...'],
      warn: ['....aa....', '...abba...', '...abba...', '..aabbaa..', '..aabbaa..', '.aaaaaaaa.', '.aaabbaaa.', 'aaaaaaaaaa'],
      skull: ['..cccccc..', '.cccccccc.', 'cc..cc..cc', 'cc..cc..cc', 'cccccccccc', '.cc.cc.cc.', '..cccccc..'],
      heart: ['.rr..rr.', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...'],
      mood: ['..aaaa..', '.aaaaaa.', 'aa.aa.aa', 'aaaaaaaa', 'a.aaaa.a', 'aa....aa', '.aaaaaa.', '..aaaa..'],
      box: ['.dddddddddd.', 'dhhhhhhhhhhd', 'dhdddddddhhd', 'dhhhhhhhhhhd', 'dhhhhaahhhhd', 'dhhhhhhhhhhd', 'dddddddddddd'],
      mines: ['..dddddd..', '.d......d.', 'd...hh...d', '....hh....', '....hh....', '....hh....', '....hh....', '....hh....'],
      close: ['c......c', '.c....c.', '..c..c..', '...cc...', '...cc...', '..c..c..', '.c....c.', 'c......c'],
      up: ['...cc...', '..cccc..', '.cccccc.', 'cccccccc', '...cc...', '...cc...', '...cc...'],
      down: ['...cc...', '...cc...', '...cc...', 'cccccccc', '.cccccc.', '..cccc..', '...cc...'],
      trend_up: ['...g...', '..ggg..', '.ggggg.', 'ggggggg'],
      trend_down: ['rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
      plus: ['...cc...', '...cc...', 'cccccccc', 'cccccccc', '...cc...', '...cc...'],
      minus: ['cccccccc', 'cccccccc'],
      lock: ['..ddd..', '.d...d.', '.d...d.', 'aaaaaaa', 'aaabaaa', 'aaabaaa', 'aaaaaaa'],
      dwarf: ['...dddd...', '..dddddd..', '..cccccc..', '..c.cc.c..', '.eeeeeeee.', '.eeeeeeee.', '..eeeeee..', '...eeee...'],
    }[name] || ['aa', 'aa'];
    const ox = Math.floor((14 - art[0].length) / 2), oy = Math.floor((14 - art.length) / 2);
    rows(ctx, ox, oy, art, pal);
  });
}

// ------------------------------------------------------------------ dwarves

const TUNIC = { miner: '#7a5a3a', worker: '#8a4a2a', warrior: '#5a6070', merchant: '#3f6e4a', idle: '#4a5a8a' };

/**
 * A dwarf, 12x16. pose: 'stand' | 'walk' | 'swing' | 'hammer'. frame 0/1.
 * Uses the dwarf's beard, hair, skin and equipment.
 */
export function dwarfSprite(d, pose = 'stand', frame = 0) {
  if (overrides.has('dwarf')) return overrides.get('dwarf');
  const helm = d.helm ? d.helm.split(':')[2] : '';
  const armor = d.armor ? d.armor.split(':')[2] : '';
  const tool = d.job === 'warrior' ? (d.weapon ? d.weapon.split(':')[2] : '') : d.tool ? d.tool.split(':')[2] : '';
  const id = `dwarf/${d.beard}/${d.hair}/${d.skin}/${d.beardStyle}/${d.job}/${helm}/${armor}/${tool}/${pose}/${frame}`;
  return cached(id, 14, 17, (ctx) => {
    const tunic = armor ? byId.metals[armor].color : (TUNIC[d.job] || TUNIC.idle);
    const pal = {
      h: d.hair, H: shade(d.hair, -0.3),
      s: d.skin, S: shade(d.skin, -0.2),
      b: d.beard, B: shade(d.beard, -0.3), L: shade(d.beard, 0.25),
      t: tunic, T: shade(tunic, -0.3), U: shade(tunic, 0.2),
      e: '#1a1214', o: '#3a2a1e', O: '#24180f', w: '#c9a46a',
    };
    const step = pose === 'walk' && frame === 1;
    // head + hair (or helm)
    const head = helm ? [
      '...MMMMMM...',
      '..MNNNNNNM..',
      '..MMMMMMMM..',
      '...ssesse...'] : [
      '....hhhh....',
      '...hhhhhh...',
      '..hhssssHh..',
      '...ssesse...'];
    const hp = helm ? { M: byId.metals[helm].color, N: shade(byId.metals[helm].color, 0.35) } : {};
    rows(ctx, 1, 0, head, { ...pal, ...hp });
    rows(ctx, 1, 4, ['...sSSSSs...'], pal);
    // beard styles
    const beards = [
      ['..bLbbbbBb..', '..bbbbbbbb..', '...bbbbbB...', '....bbbB....'],
      ['..bLbbbbBb..', '..bbbbbbbb..', '..bbbbbbbB..', '...bbbbbB...', '....bbbB....', '.....bB.....'],
      ['..bLbbbbBb..', '..bbbbbbbb..', '...bbBbbB...', '...bB..bB...', '...B....B...'],
      ['..bLbbbbBb..', '..bbbbbbbb..', '...bbbbbB...', '....bwbB....', '....bbbB....', '....bwB.....'],
    ][d.beardStyle % 4];
    // body behind beard
    rows(ctx, 1, 6, [
      '..UttttttT..',
      '.sUttttttTs.',
      '.sUttttttTs.',
      '..UttttttT..',
      '..oooOoooO..'], pal);
    rows(ctx, 1, 5, beards, pal);
    // legs
    rows(ctx, 1, 11, step ? ['...TT..TT...', '..TT....TT..', '..OO....OO..'] : ['...TT..TT...', '...TT..TT...', '..OOO..OOO..'], pal);
    // tool
    const tm = tool ? byId.metals[tool].color : '#9a9a9a';
    if (d.job === 'miner' || pose === 'swing') {
      if (frame === 0) rows(ctx, 9, 1, ['.mmm', 'm.wm', '..w.', '..w.', '..w.', '..w.'], { m: tm, w: WOOD });
      else rows(ctx, 9, 6, ['..w.', '.w..', 'wmmm', 'm..m'], { m: tm, w: WOOD });
    } else if (d.job === 'warrior') {
      rows(ctx, 10, 2, ['.mm', 'mmm', 'mw.', '.w.', '.w.', '.w.', '.w.'], { m: tm, w: WOOD });
    } else if (pose === 'hammer') {
      if (frame === 0) rows(ctx, 9, 2, ['mmm', 'mmm', '.w.', '.w.'], { m: '#777', w: WOOD });
      else rows(ctx, 9, 7, ['.w.', 'mmm', 'mmm'], { m: '#777', w: WOOD });
    } else if (d.job === 'merchant') {
      rows(ctx, 9, 8, ['.oo.', 'owwo', 'owwo', '.oo.'], { o: '#5a3a1a', w: '#c99a4a' });
    }
  });
}

// ------------------------------------------------------------------ monsters

export function monster(id, frame = 0) {
  return cached(`monster/${id}/${frame}`, 20, 16, (ctx) => {
    const f = frame;
    const art = {
      giant_rat: [['..........', '....aaaaa...', '..aaaaaaaab..', '.aaaaaaaaaba.', 'raaaaaaaaaae.', '.raaaaaaaaa..', '..c.c..c.c...'], { a: '#7a7470', b: '#5a5450', e: '#e05a4f', r: '#d98a8a', c: '#4a4440' }],
      cave_crawler: [['..............', '.aabbaabbaab..', 'aabbaabbaabbe.', 'aabbaabbaabbae', '.c.c.c.c.c.c..', 'c.c.c.c.c.c...'], { a: '#6a7a3a', b: '#4a5a2a', e: '#f0d040', c: '#2a2a1a' }],
      cave_spider: [['c.c....c.c..', '.c.c..c.c...', '..aaaaaa....', '.aaaaaaaa...', 'caaeaaeaac..', '.aaaaaaaa...', '..aaaaaa....', '.c.c..c.c...', 'c.c....c.c..'], { a: '#2a2230', e: '#e05a4f', c: '#1a141e' }],
      goblin_scouts: [['.....s....', '..gg.s....', '.gegg.s...', '.gggg.s...', '..bbbbs...', '.gbbbbg...', '..bbbb....', '..g..g....'], { g: '#5a9a3a', e: '#f0e040', b: '#6a4a2a', s: '#9a9a9a' }],
      rock_troll: [['...aaaa......', '..aaeaea.....', '..aaaaaa.....', '.aaaaaaaaa...', 'aabaaaaabaa..', 'a.aaaaaaa.a..', 'a.aabbbaa.a..', '..aa...aa....', '.aaa...aaa...'], { a: '#7a7a6a', b: '#5a5a4a', e: '#f0d040' }],
      magma_crab: [['a.........a..', 'aa.......aa..', '.aa.....aa...', '..bbbbbbb....', '.bbcbbcbbb...', 'bbbebbbebbb..', '.bbbcbbbcb...', '.c.c.c.c.c...'], { a: '#c84a1a', b: '#3a2a2a', c: '#f08a2a', e: '#ffe060' }],
      blind_ogre: [['....aaaa.....', '...aaaaaa....', '...abbbba....', '..aaaaaaaa...', '.aaaccccaaa..', 'aa.aaaaaa.aa.', 'a..aaaaaa..a.', '...aa..aa....', '..aaa..aaa...'], { a: '#c8b8a0', b: '#8a7a6a', c: '#7a5a3a' }],
      crystal_golem: [['....a.......', '...aba......', '..aabaa.....', '.acceeca....', 'aaccccccaa..', 'a.cbbbbc.a..', 'a.cccccc.a..', '..cc..cc....', '.aac..caa...'], { a: '#b08ae0', b: '#6fe0c8', c: '#7a5aa8', e: '#ffffff' }],
      deep_wyrm: [['..........aaa.', '.........aaeaa', '........aaaaa.', '..aaaa..aa....', '.aabbaa.aa....', 'aab..baaa.....', 'ab....bb......', '.b...........'], { a: '#4a2a6a', b: '#2a1a3a', e: '#ff5040' }],
    }[id];
    if (!art) return;
    rows(ctx, 1, 16 - art[0].length - 1 - (f ? 1 : 0), art[0], art[1]);
  });
}

// ------------------------------------------------------------------ props

export function wagon(frame = 0) {
  return cached('prop/wagon/' + frame, 20, 13, (ctx) => {
    rows(ctx, 0, 0, [
      '...ccccccccc......',
      '..ccddddddddc.....',
      '..cddddddddddc....',
      '..bbbbbbbbbbbbb...',
      '..bwwwwwwwwwwwb.hh',
      '..bbbbbbbbbbbbbhhh',
      '....o......o..hh.h',
      frame ? '...ooo....ooo.h..h' : '...o.o....o.o.h.h.',
      '....o......o......'], { c: '#e8dcc0', d: '#c8b898', b: '#6a4a2a', w: '#8a6a3a', o: '#3a2a1a', h: '#7a5a3a' });
  });
}

export function torch(frame) {
  return cached('prop/torch/' + frame, 5, 8, (ctx) => {
    const fl = frame % 3;
    rows(ctx, 0, 0, [
      fl === 0 ? '..a..' : fl === 1 ? '.a...' : '...a.',
      '.aba.',
      '.bcb.',
      '..d..',
      '..d..',
      '..d..'], { a: '#ffd36b', b: '#f08a2a', c: '#fff6c0', d: '#6a4a2a' });
  }, false);
}

/** Rock texture for a mine layer: base colour plus specks of the ores found there. */
export function rockTile(layer) {
  const id = 'tile/layer' + layer.index;
  return cached(id, 48, 48, (ctx) => {
    const r = rand(hash(id));
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
      const n = (r() - 0.5) * 0.16 + ((x * 7 + y * 13) % 11 === 0 ? -0.12 : 0);
      P(ctx, x, y, shade(layer.color, n));
    }
    // cracks
    for (let i = 0; i < 6; i++) {
      let x = Math.floor(r() * 48), y = Math.floor(r() * 48);
      for (let k = 0; k < 5; k++) { P(ctx, x, y, shade(layer.color, -0.35)); x += r() < 0.5 ? 1 : 0; y += 1; }
    }
    const ores = Object.entries(layer.weights).filter(([k]) => k !== 'stone');
    for (let i = 0; i < 22; i++) {
      let k = ores[Math.floor(r() * ores.length)][0];
      const col = byId.ores[k] ? byId.ores[k].color : byId.raws[k] ? byId.raws[k].color : '#999';
      const x = Math.floor(r() * 46), y = Math.floor(r() * 46);
      P(ctx, x, y, col); P(ctx, x + 1, y, shade(col, -0.2));
      if (r() < 0.5) P(ctx, x, y + 1, shade(col, -0.3));
      if (r() < 0.3) P(ctx, x + 1, y - 1 < 0 ? 0 : y - 1, shade(col, 0.5));
    }
  }, false);
}

/** Small room picture for a building (the scene adds animated fire, steam and dwarves on top). */
export function room(type, w, h, outdoor = false) {
  const id = 'room/' + type;
  if (overrides.has(id)) return overrides.get(id);
  return cached(id + '/' + w + 'x' + h + (outdoor ? '/out' : ''), w, h, (ctx) => {
    const floor = '#3a2e2a', wall = '#4a3c38';
    if (!outdoor) {
      R(ctx, 0, 0, w, h, wall);
      for (let y = 2; y < h - 3; y += 4) for (let x = (y / 4) % 2 ? 0 : 3; x < w; x += 6) R(ctx, x, y, 5, 1, shade(wall, -0.12));
      R(ctx, 0, h - 3, w, 3, floor);
      R(ctx, 0, h - 3, w, 1, shade(floor, 0.15));
      // a lamp and some depth in the corners
      R(ctx, 0, 0, w, 1, shade(wall, -0.3)); R(ctx, 0, 0, 1, h, shade(wall, -0.25)); R(ctx, w - 1, 0, 1, h, shade(wall, -0.25));
    }
    const cx = Math.floor(w / 2);
    const fy = h - 3;
    const draw = {
      smelter: () => {
        rows(ctx, cx - 8, fy - 14, [
          '....aaaaaaaa....',
          '...abbbbbbbba...',
          '..abbcbbbbcbba..',
          '..abbbbbbbbbba..',
          '..abbddddddbba..',
          '..abdeeeeeedba..',
          '..abdeffffedba..',
          '..abdeffffedba..',
          '..abbddddddbba..',
          '..abbbbbbbbbba..',
          '.aabbbbbbbbbbaa.',
          'aaaaaaaaaaaaaaaa',
          'a..............a',
          'aaaaaaaaaaaaaaaa'], { a: '#2a1e1a', b: '#7a4a3a', c: '#9a5a4a', d: '#3a2a22', e: '#c84a1a', f: '#ffb040' });
        rows(ctx, cx + 9, fy - 6, ['.aa.', 'abba', 'abba', 'a..a'], { a: '#3a2412', b: '#8a5a2a' });
      },
      forge: () => {
        rows(ctx, cx - 9, fy - 7, [
          '.aaaaaaaa..........',
          'abbbbbbbba.........',
          '.aaabbaaa....ccccc.',
          '....abba....cdddddc',
          '....abba.....ccccc.',
          '...abbbba....c...c.',
          '..abbbbbba...c...c.'], { a: '#1e1a1e', b: '#5a5560', c: '#3a2412', d: '#e2622b' });
        R(ctx, w - 7, 0, 5, fy - 5, '#3a3036');
      },
      grindstone: () => rows(ctx, cx - 6, fy - 11, [
        '....aaaa....', '..aabbbbaa..', '.abbbccbbba.', '.abbcddcbba.', 'abbcd..dcbba', 'abbcd..dcbba', '.abbcddcbba.', '.abbbccbbba.', '..aabbbbaa..', '..e.aaaa.e..', '..e......e..'],
        { a: '#3a3438', b: '#8a8288', c: '#a8a0a6', d: '#5a545a', e: '#6a4a2a' }),
      engraver: () => rows(ctx, cx - 8, fy - 7, [
        '.....ab.........', '....ab..........', 'cccccccccccccccc', 'cddddddddddddddc', '.e............e.', '.e............e.', '.e............e.'],
        { a: '#9a9a9a', b: '#6a4a2a', c: '#6a4a2a', d: '#8a6a3a', e: '#4a3020' }),
      jeweler: () => {
        rows(ctx, cx - 8, fy - 7, [
          '...a....b.......', '..aaa..bcb......', 'dddddddddddddddd', 'deeeeeeeeeeeeeed', '.f............f.', '.f............f.', '.f............f.'],
          { a: '#f2b33d', b: '#3fb8a2', c: '#b8fff0', d: '#5a3a2a', e: '#7a5a3a', f: '#4a3020' });
      },
      farm: () => {
        const r = rand(7);
        for (let i = 0; i < Math.floor(w / 5); i++) {
          const x = 2 + i * 5, s = 2 + Math.floor(r() * 3);
          R(ctx, x + 1, fy - s, 1, s, '#e8dcc0');
          R(ctx, x - 1, fy - s - 2, 5, 2, i % 2 ? '#b48a5a' : '#c86a4a');
          P(ctx, x, fy - s - 2, '#f3e9d2');
        }
        R(ctx, 0, fy - 1, w, 1, '#2a2018');
      },
      brewery: () => rows(ctx, cx - 10, fy - 9, [
        '..aaaa.....aaaa.....', '.abbbba...abbbba....', 'abcbbcba.abcbbcba...', 'abbbbbba.abbbbbba.dd', 'acccccca.acccccca.de', 'abbbbbba.abbbbbba.dd', 'abcbbcba.abcbbcba.d.', '.abbbba...abbbba....', '..aaaa.....aaaa.....'],
        { a: '#3a2412', b: '#8a5a2a', c: '#5a5560', d: '#7a4a2a', e: '#f0c870' }),
      tavern: () => {
        rows(ctx, 2, fy - 7, ['aaaaaaaaaaaaaaaaaaaa', 'abbbbbbbbbbbbbbbbbba', '.c................c.', '.c......d.d.......c.', '.c.....ddddd......c.', '.c................c.', '.c................c.'].map((l) => l.slice(0, w - 4)),
          { a: '#5a3a1a', b: '#8a5a2a', c: '#4a3020', d: '#f0c870' });
        rows(ctx, w - 9, 3, ['aaaaaaa', 'a.b.b.a', 'aaaaaaa'], { a: '#5a3a1a', b: '#d9a94a' });
      },
      quarters: () => {
        for (let x = 2; x + 9 < w; x += 11) rows(ctx, x, fy - 5, ['a........', 'abbbbbbba', 'acccccccca'.slice(0, 9), 'a.......a', 'a.......a'],
          { a: '#5a3a1a', b: '#c84a4a', c: '#e8dcc0' });
      },
      warehouse: () => {
        for (let i = 0; i < 4; i++) rows(ctx, 3 + i * 7, fy - 6 - (i % 2) * 6, ['aaaaaa', 'abbbba', 'abaaba', 'abbbba', 'aaaaaa', '......'],
          { a: '#5a3a1a', b: '#8a6a3a' });
      },
      vault: () => rows(ctx, cx - 7, fy - 12, [
        '..aaaaaaaaaa..', '.abbbbbbbbbba.', 'abbccccccccbba', 'abcbbbbbbbbcba', 'abcbbddddbbcba', 'abcbdeeeedbcba', 'abcbdeeeedbcba', 'abcbbddddbbcba', 'abcbbbbbbbbcba', 'abbccccccccbba', '.abbbbbbbbbba.', '..aaaaaaaaaa..'],
        { a: '#2a2a30', b: '#6a6a78', c: '#8a8a98', d: '#4a4a52', e: '#f2b33d' }),
      barracks: () => {
        rows(ctx, 3, fy - 9, ['a.a.a.a', 'b.b.b.b', 'b.b.b.b', 'b.b.b.b', 'ccccccc'], { a: '#c0c0c8', b: '#6a4a2a', c: '#4a3020' });
        rows(ctx, w - 12, fy - 9, ['..aaaa..', '.abbbba.', 'abbccbba', 'abbccbba', '.abbbba.', '..aaaa..'], { a: '#3a2412', b: '#8a2a2a', c: '#f2b33d' });
      },
      expedition_hall: () => outdoor ? rows(ctx, 1, 1, [
        '.........a..........',
        '........aba.........',
        '.......abbba........',
        '......abbbbba.......',
        '.....abbbcbbba......',
        '....abbbcccbbba.....',
        '...abbbcccccbbba....',
        '..abbbccc.cccbbba.d.',
        '.abbbccc...cccbbbad.',
        'aaaaaaa.....aaaaaaad',
        '..................dd'], { a: '#5a3a1a', b: '#c8a868', c: '#2a1e14', d: '#6a4a2a' }) : (() => {
        rows(ctx, 3, 3, ['aaaaaaaaaa', 'abbbbcbbba', 'abcbbbbbba', 'abbbbbbcba', 'aaaaaaaaaa'], { a: '#6a4a2a', b: '#e8dcc0', c: '#c84a1a' });
        rows(ctx, w - 10, fy - 8, ['..aa..', '.abba.', '.acca.', '.abba.', '..aa..', '..dd..', '..dd..', '.dddd.'], { a: '#3a2412', b: '#ffd36b', c: '#fff6c0', d: '#5a3a1a' });
      })(),
      trading_post: () => rows(ctx, 3, fy - 8, ['aaaaaaaaaaaaaa', 'abbbbbbbbbbbba', '.c..d..e..f.c.', '.c.dd.ee.ff.c.', '.cccccccccccc.', '.c..........c.', '.c..........c.', '.c..........c.'],
        { a: '#3f6e4a', b: '#e8dcc0', c: '#5a3a1a', d: '#b5653b', e: '#c9cbd0', f: '#d6a43a' }),
    }[type];
    if (draw) draw();
  }, false);
}
