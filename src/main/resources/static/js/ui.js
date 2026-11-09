// DOM helpers, the bottom sheet, toasts and a tiny event bus.
import * as S from './sprites.js';

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
  return h('span', { class: 'danger-skulls', title: 'Danger ' + n + ' of 5' }, '☠'.repeat(n) + '·'.repeat(Math.max(0, 5 - n)));
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
