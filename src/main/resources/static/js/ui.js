// DOM helpers, the bottom sheet, toasts and a tiny event bus.
import * as S from './sprites.js';
import * as A from './audio.js';
import { F, G, goodName, fmt, stock, isItem, parseItem, byId, contextResources } from './data.js';

export const bus = {
  act: async () => {},   // set by main.js: send an action, refresh state
  render: () => {},      // set by main.js: re-render the current panel
  go: () => {},          // set by main.js: switch tab
};

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  add(el, kids);
  return el;
}

function add(el, kids) {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) add(el, k);
    else el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

const urls = new WeakMap();
/** A sprite (canvas or image) as an <img>. */
export function img(sprite, cls = 'icon', alt = '') {
  let src = urls.get(sprite);
  if (!src) {
    src = sprite instanceof HTMLImageElement ? sprite.src : sprite.toDataURL();
    urls.set(sprite, src);
  }
  return h('img', { src, class: cls, alt, draggable: false });
}

export function goodIcon(key, cls = 'icon') { return img(S.good(key), cls); }

export function bar(frac, cls = '') {
  const b = h('div', { class: 'bar ' + cls });
  const i = h('i');
  i.style.width = Math.max(0, Math.min(100, frac * 100)) + '%';
  b.append(i);
  return b;
}

// ------------------------------------------------------------------ sheet

const sheetEl = () => document.getElementById('sheet');
let sheetRender = null;

export function openSheet(render) {
  sheetRender = render;
  if (sheetEl().hidden) A.sfx('open');
  const c = document.getElementById('sheet-content');
  c.replaceChildren(render());
  sheetEl().hidden = false;
  const first = c.querySelector('input, select, button');
  if (first && window.matchMedia('(min-width: 900px)').matches) first.focus();
}

/** Re-draw the open sheet (after its own inputs change). */
export function refreshSheet() {
  if (!sheetRender || sheetEl().hidden) return;
  const c = document.getElementById('sheet-content');
  const y = c.parentElement.scrollTop;
  c.replaceChildren(sheetRender());
  c.parentElement.scrollTop = y;
}

export function closeSheet() {
  if (!sheetEl().hidden) A.sfx('close');
  sheetEl().hidden = true;
  sheetRender = null;
}

export function sheetOpen() { return !sheetEl().hidden; }

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closeSheet();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ------------------------------------------------------------------ toasts

export function toast(msg, kind = '') {
  const t = h('div', { class: 'toast ' + kind }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 5000 : 3000);
}

export function section(title, ...kids) {
  return [h('h2', null, title), ...kids];
}

export function skulls(n) {
  const s = h('span', { class: 'danger-skulls', title: 'Danger ' + n + ' of 5', 'aria-label': 'Danger ' + n + ' of 5' });
  for (let i = 0; i < 5; i++) { const im = img(S.icon('skull'), 'icon s'); if (i >= n) im.classList.add('off'); s.append(im); }
  return s;
}

/** A small drawn icon (from sprites.icon) for buttons and labels. */
export function ico(name, cls = 'icon s') { return img(S.icon(name), cls, ''); }

// ------------------------------------------------------------------ have / need

function needChip(icon, have, need, name) {
  const ok = have >= need;
  return h('span', { class: 'need ' + (ok ? 'ok' : 'miss'), title: `${name}: you have ${fmt(have)}, need ${fmt(need)}` },
    icon, h('span', null, ok ? fmt(need) : `${fmt(have)}/${fmt(need)}`));
}

/** Cost as chips: what is needed, with have/need in red where something is missing. */
export function costChips(cost) {
  if (!cost) return null;
  const out = [];
  if (cost.coins) out.push(needChip(img(S.coin(), 'icon s'), F().coins, cost.coins, 'Coins'));
  for (const [k, v] of Object.entries(cost.goods || {})) out.push(needChip(goodIcon(k, 'icon s'), stock(k), v, goodName(k)));
  return h('span', { class: 'needs' }, out);
}

/** Chips for a plain list of inputs {key: amount}. */
export function inputChips(inputs) {
  return h('span', { class: 'needs' }, Object.entries(inputs).map(([k, v]) => needChip(goodIcon(k, 'icon s'), stock(k), v, goodName(k))));
}

/** "Missing: 13 stone, 120 coins" or null. */
export function missingText(cost) {
  if (!cost) return null;
  const miss = [];
  if (cost.coins && F().coins < cost.coins) miss.push(fmt(cost.coins - F().coins) + ' coins');
  for (const [k, v] of Object.entries(cost.goods || {})) if (stock(k) < v) miss.push(fmt(v - stock(k)) + ' ' + goodName(k).toLowerCase());
  return miss.length ? 'Missing: ' + miss.join(', ') : null;
}

/** Name for a "missing" key from the server: goods key or "item:<type>[:<metal>]". */
export function missingName(k) {
  if (k.startsWith('item:') && k.split(':').length <= 3) {
    const [, type, metal] = k.split(':');
    return 'a ' + (metal ? byId.metals[metal].name.toLowerCase() + ' ' : '') + byId.items[type].name.toLowerCase() + ' to work on';
  }
  return goodName(k).toLowerCase();
}

// ------------------------------------------------------------------ resource overview

/** The stores that matter for the current tab, as icon + amount tiles. */
export function storesView(compact = false) {
  const groups = contextResources();
  if (!groups.length) return null;
  return h('div', { class: 'stores' + (compact ? ' compact' : '') }, groups.map((g) =>
    h('div', { class: 'stores-group' },
      h('div', { class: 'stores-title' }, g.title),
      g.keys.length ? h('div', { class: 'stores-grid' }, g.keys.map((k) => {
        const n = k === 'coins' ? Math.floor(F().coins) : stock(k);
        return h('div', { class: 'store' + (n ? '' : ' empty'), title: (k === 'coins' ? 'Coins' : goodName(k)) + ': ' + fmt(n) },
          k === 'coins' ? img(S.coin(), 'icon s') : goodIcon(k, 'icon s'),
          compact ? null : h('span', { class: 'nm' }, k === 'coins' ? 'Coins' : shortName(k)),
          h('b', null, fmt(n)));
      })) : h('p', { class: 'small dim' }, g.empty || 'Nothing yet.'))));
}

function shortName(k) {
  if (isItem(k)) {
    const p = parseItem(k);
    return G.data.qualities[p.q].name + ' ' + byId.metals[p.metal].name.toLowerCase() + ' ' + byId.items[p.type].name.toLowerCase();
  }
  return goodName(k);
}

/** Pick list of dwarves with checkboxes. selected is a Set of ids. */
export function dwarfPicker(list, selected, extra, onChange) {
  if (!list.length) return h('p', { class: 'muted' }, 'Nobody available.');
  return h('div', null, list.map((d) => {
    const on = selected.has(d.id);
    return h('label', { class: 'pick' + (on ? ' on' : '') },
      h('input', { type: 'checkbox', checked: on, onchange: () => { on ? selected.delete(d.id) : selected.add(d.id); onChange(); } }),
      img(S.dwarfSprite(d, 'stand', 0), 'icon'),
      h('span', { class: 'grow' }, d.first + ' ' + d.clan),
      extra ? h('span', { class: 'muted small nowrap' }, extra(d)) : null);
  }));
}
