// DOM helpers, the bottom sheet, toasts and a tiny event bus.
import * as S from './sprites.js';
import * as A from './audio.js';
import { F, G, goodName, fmt, stock, isItem, parseItem, byId, contextResources, moneyParts, moneyWords } from './data.js';

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

// ------------------------------------------------------------------ forged frames, slides, hourglasses

const SVG = 'http://www.w3.org/2000/svg';
function svgUse(id, cls) {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVG, 'use');
  u.setAttribute('href', '#' + id);
  s.append(u);
  return s;
}

/** The trim of a forged window (put inside an element with class "win"): four corners, a crest, runes. */
export function frameDecor(crest = true) {
  return [svgUse('corner', 'corner tl'), svgUse('corner', 'corner tr'), svgUse('corner', 'corner bl'), svgUse('corner', 'corner br'),
    crest ? svgUse('crest', 'crest') : null, h('span', { class: 'runes', 'aria-hidden': 'true' })];
}

/** A hand-drawn checkbox for paper, ticked or not. */
export function tickBox(done) {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('class', 'box'); s.setAttribute('aria-hidden', 'true');
  for (const id of done ? ['box', 'tick'] : ['box']) { const u = document.createElementNS(SVG, 'use'); u.setAttribute('href', '#' + id); s.append(u); }
  return s;
}

/** The wax seal on reports. */
export function seal() { return svgUse('seal', 'seal'); }

/** What a window is about decides its metal and gem. */
export const MATERIAL = { fortress: 'forge', mines: 'forge', work: 'forge', dwarves: 'dwarf', trade: 'trade', explore: 'lore', war: 'war', more: 'neutral' };
const ALL_MATERIALS = ['forge', 'trade', 'war', 'dwarf', 'lore', 'neutral'];
export function setMaterial(el, m) {
  el.classList.remove(...ALL_MATERIALS);
  el.classList.add(ALL_MATERIALS.includes(m) ? m : 'neutral');
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How far an element has to travel to be just outside the screen edge on that side. */
function offEdge(el, side) {
  const r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
  return { right: [W - r.left + 30, 0], left: [-(r.right + 30), 0], bottom: [0, H - r.top + 30], top: [0, -(r.bottom + 30)] }[side] || [0, 0];
}

/**
 * Slide a window out of a screen edge on a rail: fast, a hard stop that overshoots a little, a ratchet back and a
 * settle. Nothing moves when the player asked for less motion.
 */
export function slideIn(el, side) {
  if (reduced() || !el.animate) return;
  const [dx, dy] = offEdge(el, side);
  const o = (v) => -Math.sign(v) * Math.min(14, Math.abs(v) * 0.03);
  const t = (k) => `translate(${(dx ? o(dx) * k : 0).toFixed(1)}px, ${(dy ? o(dy) * k : 0).toFixed(1)}px)`;
  el.animate([
    { transform: `translate(${dx}px, ${dy}px)` },
    { transform: t(1), offset: 0.55 },
    { transform: t(-0.4), offset: 0.7 },
    { transform: t(0.17), offset: 0.82 },
    { transform: 'none' },
  ], { duration: 720, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
}

/** Pull a window back into the screen edge: a small tug first, then gone. Resolves true when it is out. */
export function slideOut(el, side) {
  if (reduced() || !el.animate) return { done: Promise.resolve(true), cancel() {} };
  const [dx, dy] = offEdge(el, side);
  const a = el.animate([
    { transform: 'none' },
    { transform: `translate(${-Math.sign(dx) * 8}px, ${-Math.sign(dy) * 8}px)`, offset: 0.22 },
    { transform: `translate(${dx}px, ${dy}px)` },
  ], { duration: 420, easing: 'cubic-bezier(0.55, 0, 0.8, 0.35)', fill: 'forwards' });
  let cancelled = false;
  return {
    done: a.finished.then(() => { if (!cancelled) a.cancel(); return !cancelled; }, () => false),
    cancel() { cancelled = true; a.cancel(); },
  };
}

/**
 * An hourglass for time running out. Give it what drives the sand: {job, machine} (a workshop job, animateWork
 * moves it), {from, to} (seconds of game time, the clock moves it) or {p} (a fixed share).
 */
export function hourglass(opts = {}, size = '') {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 46 64');
  s.setAttribute('class', 'hg ' + size);
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', 'Time left');
  s.innerHTML = '<rect x="3" y="1" width="40" height="5" rx="2" fill="#8a5a34"/><rect x="3" y="58" width="40" height="5" rx="2" fill="#8a5a34"/>'
    + '<rect x="5" y="6" width="3" height="52" fill="#5e3c22"/><rect x="38" y="6" width="3" height="52" fill="#5e3c22"/>'
    + '<g class="glass"><path d="M11 7 H35 C35 20 26 26 24 32 C26 38 35 44 35 57 H11 C11 44 20 38 22 32 C20 26 11 20 11 7 Z" fill="rgba(200,220,255,.12)" stroke="rgba(220,235,255,.6)" stroke-width="1.2"/>'
    + '<path class="sand-top" d="M14 12 H32 C31 20 25 25 23 30 C21 25 15 20 14 12 Z" fill="#e7b85e"/>'
    + '<rect class="stream" x="22.4" y="31" width="1.2" height="25" fill="#e7b85e"/>'
    + '<path class="sand-bot" d="M13 56 H33 C32 50 28 46 23 45 C18 46 14 50 13 56 Z" fill="#e7b85e"/>'
    + '<path d="M14 10 C14 16 18 21 21 25" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/></g>';
  if (opts.job != null) { s.dataset.job = opts.job; s.dataset.machine = opts.machine || 0; }
  if (opts.to != null) { s.dataset.hgFrom = opts.from; s.dataset.hgTo = opts.to; }
  setSand(s, opts.p ?? 0);
  return s;
}

/** Move the sand of an hourglass to a share (0..1). */
export function setSand(el, p) {
  p = Math.max(0, Math.min(1, p || 0));
  el.style.setProperty('--p', p.toFixed(4));
  el.classList.toggle('done', p >= 1);
}

export function bar(frac, cls = '') {
  const b = h('div', { class: 'bar ' + cls });
  const i = h('i');
  i.style.width = Math.max(0, Math.min(100, frac * 100)) + '%';
  b.append(i);
  return b;
}

// ------------------------------------------------------------------ sheet

const sheetEl = () => document.getElementById('sheet');
let sheetRender = null, sheetAnchor = null;

/**
 * Open a window. With an anchor ({x, y} in page pixels, e.g. where the player clicked) it is a small
 * pop-over next to that point and the scene stays visible and clickable; without one it is the
 * bottom sheet (phone) or a centred dialog (desktop).
 */
let sheetBack = null;   // a pop-over that a bigger sheet replaced: it comes back when that one closes
let sheetMat = null, closing = null, sheetSide = 'bottom';
export function openSheet(render, anchor = null, material = null) {
  sheetBack = !anchor && sheetAnchor && sheetRender ? { render: sheetRender, anchor: sheetAnchor, material: sheetMat } : anchor ? null : sheetBack;
  sheetRender = render;
  sheetAnchor = anchor;
  sheetMat = material;
  const el = sheetEl(), body = el.querySelector('.sheet-body');
  if (closing) { closing.cancel(); closing = null; el.classList.remove('closing'); }
  const fresh = el.hidden;
  if (fresh) A.sfx('open');
  el.classList.toggle('pop', !!anchor);
  el.classList.toggle('dock', !!(anchor && anchor.dock));
  el.classList.remove('peek');
  setMaterial(body, material || (sheetBack && sheetBack.material) || MATERIAL[G.tab] || 'neutral');
  const c = document.getElementById('sheet-content');
  c.replaceChildren(render());
  el.hidden = false;
  place();
  if (fresh) {
    // a pop-over comes in from the screen edge it is closest to; a big window drops out of the ceiling; phones: from below
    const r = body.getBoundingClientRect(), phone = !window.matchMedia('(min-width: 700px)').matches;
    sheetSide = phone ? 'bottom' : !anchor ? 'top' : anchor.dock ? 'right' : r.left + r.width / 2 > window.innerWidth / 2 ? 'right' : 'left';
    slideIn(body, sheetSide);
  }
  const first = c.querySelector('input, select, button');
  if (first && !anchor && window.matchMedia('(min-width: 900px)').matches) first.focus({ preventScroll: true });
}

/** Put a pop-over beside its anchor, inside the window. Phones get a short sheet at the bottom. */
function place() {
  const body = sheetEl().querySelector('.sheet-body');
  body.style.left = body.style.top = '';
  if (!sheetAnchor || !window.matchMedia('(min-width: 700px)').matches) return;
  if (sheetAnchor.dock) {
    // docked at the right edge, under the tabs, so the room you clicked stays in view
    const top = Math.round(document.querySelector('.main').getBoundingClientRect().top) + 12;
    body.style.top = top + 'px'; body.style.maxHeight = (window.innerHeight - top - 12) + 'px';
    return;
  }
  const W = window.innerWidth, H = window.innerHeight, r = body.getBoundingClientRect();
  const a = sheetAnchor.rect || { x: sheetAnchor.x, y: sheetAnchor.y, w: 0, h: 0 };
  const gap = 14, room = (x) => x >= 12 && x + r.width <= W - 12;
  // beside the thing (right, then left); if neither fits, next to the click
  let x = a.x + a.w + gap;
  if (!room(x)) x = a.x - gap - r.width;
  if (!room(x)) x = sheetAnchor.x + gap;
  x = Math.max(12, Math.min(W - r.width - 12, x));
  const y = Math.max(26, Math.min(H - r.height - 12, (a.h ? a.y : sheetAnchor.y - 60)));
  body.style.left = x + 'px'; body.style.top = y + 'px';
}

/** Re-draw the open sheet (after its own inputs change). */
export function refreshSheet() {
  if (!sheetRender || sheetEl().hidden) return;
  const c = document.getElementById('sheet-content');
  const y = c.parentElement.scrollTop;
  c.replaceChildren(sheetRender());
  c.parentElement.scrollTop = y;
  if (sheetAnchor) place();
}

export function closeSheet() {
  if (sheetBack) { const k = sheetBack; sheetBack = null; openSheet(k.render, k.anchor, k.material); return; }
  const el = sheetEl();
  if (el.hidden || !sheetRender) return;
  A.sfx('close');
  sheetRender = null;
  sheetAnchor = null;
  el.classList.add('closing');
  closing = slideOut(el.querySelector('.sheet-body'), sheetSide);
  const mine = closing;
  mine.done.then((out) => {
    if (!out || closing !== mine) return;
    closing = null;
    el.classList.remove('closing');
    el.hidden = true;
  });
}

export function sheetOpen() { return !sheetEl().hidden && !!sheetRender; }
export function popOpen() { return sheetOpen() && !!sheetAnchor; }

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closeSheet();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen()) { closeSheet(); e.preventDefault(); } });
// a pop-over closes when you press somewhere else, except on the scene (the scene decides itself)
document.addEventListener('pointerdown', (e) => {
  if (popOpen() && !e.target.closest('.sheet-body, #scene')) closeSheet();
  // on a phone, touching the scene folds the pop-over down so the dwarves below it show
  if (popOpen() && e.target.closest('#scene') && !window.matchMedia('(min-width: 700px)').matches) sheetEl().classList.add('peek');
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.sheet-grip')) return;
  const el = sheetEl();
  el.classList.toggle('peek');
  el.querySelector('.sheet-scroll').scrollTop = 0;
});

// ------------------------------------------------------------------ help

const HELP_KEY = 'deepforge.help';
export function helpOn() { try { return localStorage.getItem(HELP_KEY) !== 'off'; } catch { return true; } }
export function setHelp(on) { try { localStorage.setItem(HELP_KEY, on ? 'on' : 'off'); } catch { /* fine */ } }

/** A small "i" button that shows an explanation when pressed. Nothing at all when help is off. */
export function info(text) {
  if (!helpOn() || !text) return null;
  const tip = h('span', { class: 'info-tip', role: 'note', hidden: true }, text);
  const btn = h('button', { class: 'info', type: 'button', 'aria-label': 'Explain', title: 'Explain',
    onclick: (e) => { e.stopPropagation(); tip.hidden = !tip.hidden; btn.setAttribute('aria-expanded', String(!tip.hidden)); } }, ico('info'));
  return h('span', { class: 'info-wrap' }, btn, tip);
}

// ------------------------------------------------------------------ toasts

export function toast(msg, kind = '') {
  const t = h('div', { class: 'toast ' + kind }, statusIco(kind === 'bad' ? 'warn' : kind), h('span', null, msg));
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

/**
 * The status signs, the same everywhere (rooms, hints, tabs, messages, lists):
 * 'stop' red octagon (stopped), 'warn' yellow triangle (needs you), 'good' green circle (done, collect it),
 * 'idle' grey dots (nothing to do). Anything else gives null. With cls 'badge': the 14 px tab badge (28 px on screen).
 */
export const STATUS = { stop: 'stop', bad: 'stop', warn: 'warn', good: 'good', idle: 'idle' };
export function statusIco(kind, cls = 'icon st') {
  const name = STATUS[kind];
  if (!name) return null;
  const sprite = cls === 'badge' && name !== 'idle' ? S.sprite('badge_' + name) : S.icon(name);   // tabs: the small badge
  return h('img', { src: img(sprite).src, class: cls + ' st-' + name, alt: '', draggable: false });
}

// ------------------------------------------------------------------ have / need

/** Money as coins: each denomination with its own coin, e.g. [gold] 2 [silver] 35. */
export function money(j, cls = '') {
  return h('span', { class: 'money ' + cls, title: moneyWords(j) }, j < 0 ? '-' : null,
    moneyParts(j).map(([d, n]) => h('span', { class: 'coin ' + d }, img(S.coinOf(d), 'icon xs', ''), fmt(n))));
}

function needChip(icon, have, need, name) {
  const ok = have >= need;
  return h('span', { class: 'need ' + (ok ? 'ok' : 'miss'), title: `${name}: you have ${fmt(have)}, need ${fmt(need)}` },
    icon, h('span', null, ok ? fmt(need) : `${fmt(have)}/${fmt(need)}`));
}

/** Cost as chips: what is needed, with have/need in red where something is missing. */
export function costChips(cost) {
  if (!cost) return null;
  const out = [];
  if (cost.coins) {
    const ok = F().coins >= cost.coins;
    out.push(h('span', { class: 'need ' + (ok ? 'ok' : 'miss'), title: `Money: you have ${moneyWords(F().coins)}, need ${moneyWords(cost.coins)}` },
      money(cost.coins)));
  }
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
  if (cost.coins && F().coins < cost.coins) miss.push(moneyWords(cost.coins - F().coins));
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
        if (k === 'coins') return h('div', { class: 'store money-store', title: 'Money: ' + moneyWords(F().coins) }, money(F().coins));
        const n = stock(k);
        return h('div', { class: 'store' + (n ? '' : ' empty'), title: goodName(k) + ': ' + fmt(n) },
          goodIcon(k, 'icon s'),
          compact ? null : h('span', { class: 'nm' }, shortName(k)),
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
      img(S.portrait(d), 'icon'),
      h('span', { class: 'grow' }, d.first + ' ' + d.clan),
      extra ? h('span', { class: 'muted small nowrap' }, extra(d)) : null);
  }));
}
