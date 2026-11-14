// Quests, expeditions and reports come on paper. Every sheet gets its own torn corners, stains, and folds,
// worked out from its id, so the same note looks the same every time and no two notes look alike.
import { h, tickBox, seal } from './ui.js';

/** A small seeded random number generator (mulberry32) from any string. */
function rng(seed) {
  let a = 2166136261;
  for (const ch of String(seed)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pct = (v) => +v.toFixed(2) + '%';

/** The outline of the sheet: nearly straight edges, one or two corners torn off or nicked. */
function tear(r) {
  const torn = [0, 1, 2, 3].map(() => r() < 0.45);
  if (!torn.some(Boolean)) torn[Math.floor(r() * 4)] = true;
  // corners clockwise from the top left, with the direction that points into the sheet
  const C = [[0, 0, 1, 1], [100, 0, -1, 1], [100, 100, -1, -1], [0, 100, 1, -1]];
  const out = [];
  for (let i = 0; i < 4; i++) {
    const [cx, cy, dx, dy] = C[i];
    let pts;
    if (torn[i]) {
      // a ragged bite: from the side edge in, two teeth, out to the top or bottom edge
      const a = 4 + r() * 5, b = 3 + r() * 5;
      pts = [[0, b], [a * (0.25 + r() * 0.15), b * (0.5 + r() * 0.2)], [a * (0.5 + r() * 0.15), b * (0.15 + r() * 0.15)], [a, 0]];
    } else pts = [[r() * 0.6, r() * 0.6]];
    pts = pts.map(([u, v]) => [cx + dx * u, cy + dy * v]);
    if (i === 1 || i === 3) pts.reverse();
    out.push(...pts);
    // the edge to the next corner: a few points that wander a hair off the line
    const [nx, ny] = C[(i + 1) % 4], n = 3 + Math.floor(r() * 3);
    for (let k = 1; k < n; k++) {
      const t = k / n + (r() - 0.5) * 0.06;
      out.push([cx + (nx - cx) * t + (cx === nx ? (r() - 0.5) * 1.1 : 0), cy + (ny - cy) * t + (cy === ny ? (r() - 0.5) * 1.1 : 0)]);
    }
  }
  const clamp = (v) => Math.max(0, Math.min(100, v));
  return 'polygon(' + out.map(([x, y]) => pct(clamp(x)) + ' ' + pct(clamp(y))).join(', ') + ')';
}

/** One to three marks with a cause: an ale ring, a sooty thumb, a grease smear, a water stain. */
function stains(r) {
  const at = () => `${Math.round(8 + r() * 84)}% ${Math.round(8 + r() * 84)}%`;
  const kinds = [
    () => { const s = Math.round(24 + r() * 16); return `radial-gradient(circle at ${at()}, transparent 0 ${s}px, rgba(120,70,20,.22) ${s + 1}px ${s + 4}px, rgba(120,70,20,.08) ${s + 5}px ${s + 7}px, transparent ${s + 8}px)`; },
    () => `radial-gradient(ellipse ${Math.round(16 + r() * 14)}px ${Math.round(10 + r() * 8)}px at ${at()}, rgba(40,30,25,.22), transparent 70%)`,
    () => `radial-gradient(ellipse ${Math.round(80 + r() * 60)}px ${Math.round(24 + r() * 20)}px at ${at()}, rgba(40,30,25,.13), transparent 70%)`,
    () => `radial-gradient(ellipse at ${at()}, rgba(110,70,30,.18), transparent ${Math.round(14 + r() * 10)}%)`,
    () => `radial-gradient(circle at ${at()}, rgba(150,90,30,.16), transparent ${Math.round(10 + r() * 8)}%)`,
  ];
  const n = 1 + Math.floor(r() * 3), out = [];
  for (let i = 0; i < n; i++) out.push(kinds[Math.floor(r() * kinds.length)]());
  return out.join(', ');
}

/**
 * A sheet of paper with kids written on it. opts: {nail: pinned at the top, seal: a wax seal in the corner,
 * cls: extra classes on the outer wrapper (it carries the drop shadow)}.
 */
export function paper(seed, opts, ...kids) {
  const r = rng(seed);
  const style = {
    '--fold': Math.round(160 + r() * 30) + 'deg',
    '--fold2': Math.round(70 + r() * 35) + 'deg',
    '--tear': tear(r),
    '--stain': stains(r),
  };
  const sheet = h('div', { class: 'paper' }, opts.nail ? h('span', { class: 'nail', 'aria-hidden': 'true' }) : null, opts.seal ? seal() : null, ...kids);
  for (const [k, v] of Object.entries(style)) sheet.style.setProperty(k, v);
  return h('div', { class: 'paper-wrap ' + (opts.cls || '') }, sheet);
}

/** A to-do list in ink: [{text, done}]. */
export function todo(items) {
  return h('ul', { class: 'todo' }, items.map((it) => h('li', { class: it.done ? 'done' : '' }, tickBox(it.done), h('span', null, it.text))));
}
