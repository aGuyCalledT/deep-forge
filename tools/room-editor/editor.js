// Room template editor: place props, mark spots, save templates for the game. See tools/room-editor/serve.py.
import * as Art from '/static/js/art48.js';
import * as R from '/static/js/rooms48.js';
import * as D from '/static/js/dwarf48.js';
import { UI, PROPS as PROP_INFO, GROUPS as GROUP_INFO } from './info.js';

const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const GROUPS = ['furniture', 'living', 'workshop', 'storage', 'shell', 'rock', 'ambient', 'valley', 'monster'];
const LOOKS = [{ sex: 'm', hair: 'short', beard: 'full' }, { sex: 'f', hair: 'bun' }, { sex: 'm', hair: 'bald', beard: 'fork', hat: 'cap' }];
const STANDERS = ['worker', 'seat', 'bar', 'stand', 'door'];   // spots that stand on the floor

let types = [], idx = {}, tpl = null, cur = { type: '', part: 'room', name: '' }, dirty = false;
let sels = [];              // selection: [{k: 'prop'|'spot', i}], the last one is the main one
let tool = null;            // null = select, {prop: name} or {spot: kind}
let drag = null, box = null, hover = null;
const opt = { light: true, ghost: true, anim: true, grid: true, zoom: 3, front: true, snap: 4 };
let placeLayer = 'back';    // where new props go
const PAD = 16;             // margin around the room for things that stick out (hanging lamps, smoke)

// ------------------------------------------------------------------ helpers
const api = (p, body) => fetch(p, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}).then(r => r.json());
function status(t) { const s = $('status'); s.textContent = t; s.classList.add('show'); clearTimeout(status.t); status.t = setTimeout(() => s.classList.remove('show'), 1800); }
function setDirty(d = true) { dirty = d; $('dirty').textContent = d ? 'unsaved' : ''; $('dirty').className = d ? 'dirty' : ''; }
const typeInfo = () => types.find(t => t.type === cur.type) || { cells: 5, bay: 0 };
const cells = () => cur.part === 'bay' ? typeInfo().bay : typeInfo().cells;
const W = () => cells() * R.CELL;
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : k === 'class' ? (e.className = v) : (e[k] = v);
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
function thumb(name, size = 44) {
  const c = el('canvas'); c.width = c.height = size;
  const fr = Art.frame(name, 0), s = Math.min(1, size / Math.max(fr.canvas.width, fr.canvas.height));
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const w = fr.canvas.width * s, h = fr.canvas.height * s;
  g.drawImage(fr.canvas, (size - w) / 2, (size - h) / 2, w, h);
  return c;
}

// ------------------------------------------------------------------ info buttons
const pop = el('div', { id: 'pop' }); document.body.append(pop);
let popFor = null;
/** A small round "i" button that opens a short explanation next to it. */
function info(text) {
  const b = el('button', { class: 'info', type: 'button', textContent: 'i', title: text, onclick: e => {
    e.stopPropagation();
    if (popFor === b) { closePop(); return; }
    popFor = b; pop.textContent = text; pop.classList.add('show');
    const r = b.getBoundingClientRect(), pw = Math.min(280, innerWidth - 16);
    pop.style.width = pw + 'px';
    pop.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left - pw / 2)) + 'px';
    const below = r.bottom + 6;
    pop.style.top = below + 'px';
    if (below + pop.offsetHeight > innerHeight - 8) pop.style.top = Math.max(8, r.top - pop.offsetHeight - 6) + 'px';
  } });
  return b;
}
function closePop() { popFor = null; pop.classList.remove('show'); }
addEventListener('click', e => { if (popFor && !pop.contains(e.target)) closePop(); });
addEventListener('scroll', closePop, true);
/** What a prop is: its own note plus what the art says about it. */
function propText(n) {
  const a = Art.info(n), fr = Art.frame(n, 0), bits = [];
  bits.push(`${fr.canvas.width} × ${fr.canvas.height} px`);
  if (a.frames.length > 1) bits.push('animated');
  if (fr.ay < fr.canvas.height / 2) bits.push('hangs from its anchor');
  if (a.glow) bits.push('glows in the dark');
  if (a.recolour) bits.push('takes the colour of the metal or rock');
  const sp = (R.PROP_SPOTS[n] || []).map(s => s.kind);
  if (sp.length) bits.push('auto spots: ' + [...new Set(sp)].join(', '));
  return `${n}: ${PROP_INFO[n] || GROUP_INFO[a.group] || ''} (${bits.join(' · ')})`;
}
const spotText = k => `${k}: ${R.SPOTS[k].about || R.SPOTS[k].help}`;

// ------------------------------------------------------------------ selection and geometry
const objOf = s => s.k === 'prop' ? tpl.props[s.i] : tpl.spots[s.i];
const isSel = (k, i) => sels.some(s => s.k === k && s.i === i);
const main = () => sels[sels.length - 1];
function select(list, add = false) {
  if (!add) sels = [];
  for (const s of list) {
    const j = sels.findIndex(t => t.k === s.k && t.i === s.i);
    if (j >= 0 && add) sels.splice(j, 1); else if (j < 0) sels.push(s);
  }
  buildSide();
}
/** Outline of a prop (its frame) or a spot (its point): {x0, y0, x1, y1}. */
function bounds(s) {
  const o = objOf(s);
  if (s.k === 'spot') return { x0: o.x, y0: o.y, x1: o.x, y1: o.y };
  const fr = Art.frame(o.s, 0, { flip: !!o.flip }), x0 = o.x - fr.ax, y0 = o.y - fr.ay;
  return { x0, y0, x1: x0 + fr.canvas.width - 1, y1: y0 + fr.canvas.height - 1 };
}
function groupBounds(list = sels) {
  const b = list.map(bounds);
  return { x0: Math.min(...b.map(q => q.x0)), y0: Math.min(...b.map(q => q.y0)), x1: Math.max(...b.map(q => q.x1)), y1: Math.max(...b.map(q => q.y1)) };
}
function moveBy(list, dx, dy) { for (const s of list) { const o = objOf(s); o.x = Math.round(o.x + dx); o.y = Math.round(o.y + dy); } }
// snap grid: x from the left wall, y from the floor line, so the floor is always on the grid
const snapX = (x, free) => free || opt.snap <= 1 ? Math.round(x) : Math.round(x / opt.snap) * opt.snap;
const snapY = (y, free) => {            // the ceiling (y 0) is a snap line too, for hanging lamps
  if (free || opt.snap <= 1) return Math.round(y);
  return Math.abs(y) <= opt.snap / 2 ? 0 : R.FLOOR - Math.round((R.FLOOR - y) / opt.snap) * opt.snap;
};
const standsOnFloor = s => s.k === 'prop' ? !hangs(objOf(s).s) : STANDERS.includes(objOf(s).kind);
const hangs = n => { const fr = Art.frame(n, 0); return fr.ay < fr.canvas.height / 2; };

function align(how) {
  if (sels.length < 2) return;
  const g = groupBounds();
  for (const s of sels) {
    const b = bounds(s);
    const dx = { left: g.x0 - b.x0, hcenter: (g.x0 + g.x1) / 2 - (b.x0 + b.x1) / 2, right: g.x1 - b.x1 }[how] ?? 0;
    const dy = { top: g.y0 - b.y0, vmiddle: (g.y0 + g.y1) / 2 - (b.y0 + b.y1) / 2, bottom: g.y1 - b.y1 }[how] ?? 0;
    moveBy([s], dx, dy);
  }
  setDirty(); buildSide();
}
function center(axis) {
  if (!sels.length) return;
  const g = groupBounds();
  if (axis === 'x') moveBy(sels, (W() - 1) / 2 - (g.x0 + g.x1) / 2, 0);
  else moveBy(sels, 0, R.FLOOR / 2 - (g.y0 + g.y1) / 2);     // between ceiling and floor line
  setDirty(); buildSide();
}
/** Even spacing by centres: between the outer ones, or over the whole room (spread). */
function distribute(axis, spread = false) {
  const n = sels.length;
  if (n < (spread ? 1 : 3)) { status(spread ? 'select something first' : 'select at least three'); return; }
  const c = s => { const b = bounds(s); return axis === 'x' ? (b.x0 + b.x1) / 2 : (b.y0 + b.y1) / 2; };
  const list = [...sels].sort((a, b) => c(a) - c(b));
  let from = c(list[0]), to = c(list[n - 1]), step = n > 1 ? (to - from) / (n - 1) : 0;
  if (spread) { const len = axis === 'x' ? W() : R.FLOOR; step = len / n; from = step / 2; }
  list.forEach((s, i) => { const d = from + i * step - c(s); moveBy([s], axis === 'x' ? d : 0, axis === 'y' ? d : 0); });
  setDirty(); buildSide();
}

// ------------------------------------------------------------------ palette
function head(text, help) { return el('h3', {}, text, help ? info(help) : null); }
function buildPalette() {
  const pal = $('pal'); pal.innerHTML = '';
  pal.append(head('Tools'));
  const sp = el('div', { class: 'spots' });
  sp.append(el('div', { class: 'tool' + (!tool ? ' on' : ''), onclick: () => setTool(null), title: UI.select }, 'select / move', info(UI.select)));
  sp.append(el('div', { class: 'tool', onclick: autoSpots, title: UI.autospots }, 'auto spots', info(UI.autospots)));
  pal.append(sp);
  pal.append(head('New props go', UI.newLayer));
  const lg = el('div', { class: 'spots' });
  for (const [k, t] of [['back', 'behind dwarves'], ['front', 'in front of dwarves']])
    lg.append(el('div', { class: 'tool' + (placeLayer === k ? ' on' : ''), title: UI.newLayer, onclick: () => { placeLayer = k; buildPalette(); } }, t));
  pal.append(lg);
  pal.append(head('Spots', 'Spots are invisible points the game reads: where dwarves work, sit, drink and sleep, where light and fire are, what players can click. Use the i next to each for what it does.'));
  const sg = el('div', { class: 'spots' });
  for (const [k, s] of Object.entries(R.SPOTS)) {
    const on = tool && tool.spot === k;
    sg.append(el('div', { class: 'tool' + (on ? ' on' : ''), title: spotText(k), onclick: () => setTool({ spot: k }) },
      el('span', { class: 'dot', textContent: s.t, style: `background:${s.c}` }), el('span', { class: 'grow', textContent: k }), info(spotText(k))));
  }
  pal.append(sg);
  for (const g of GROUPS) {
    const list = Art.names(g).filter(n => Art.info(n).kind === 'prop');
    if (!list.length) continue;
    pal.append(head(g, GROUP_INFO[g] + ' Hover a piece for what it is; once placed, its i shows it again.'));
    const grid = el('div', { class: 'grid' });
    for (const n of list) grid.append(el('div', { class: 'tool' + (tool && tool.prop === n ? ' on' : ''), title: propText(n), onclick: () => setTool({ prop: n }) }, thumb(n), n));
    pal.append(grid);
  }
}
function setTool(t) { tool = t; buildPalette(); buildSide(); }

// ------------------------------------------------------------------ side panel
function row(label, help, ...input) { return el('div', { class: 'row' }, el('span', { textContent: label }), ...input, help ? info(help) : null); }
function num(label, help, obj, key, step = 1, after) {
  const i = el('input', { type: 'number', step, value: obj[key] ?? '', onchange: () => { obj[key] = i.value === '' ? undefined : +i.value; setDirty(); after ? after() : buildSide(); } });
  return row(label, help, i);
}
function btn(text, help, onclick, cls = '') { return el('button', { textContent: text, title: help, onclick, class: cls }); }
function buildSide() {
  const side = $('side'); side.innerHTML = '';
  if (!tpl) return;
  side.append(el('h3', { textContent: `${cur.type} ${cur.part} · ${cells()} cells · ${W()} px` }));
  const need = cur.part === 'bay' ? R.BAY_NEEDS : (R.NEEDS[cur.type] || {});
  const count = {}; for (const s of tpl.spots) count[s.kind] = (count[s.kind] || 0) + 1;
  side.append(head('Needs', UI.needs));
  for (const [k, n] of Object.entries(need)) {
    const h = count[k] || 0;
    side.append(el('div', { class: 'need ' + (h >= n ? 'ok' : 'bad'), title: spotText(k) }, `${h >= n ? 'ok' : 'missing'}  ${k}: ${h} / ${n}`));
  }
  if (tool) side.append(head('Placing'), el('div', { class: 'about', textContent: tool.prop ? propText(tool.prop) : spotText(tool.spot) }));
  if (sels.length === 1) single(side, main());
  else if (sels.length > 1) group(side);
  // lists
  for (const layer of ['front', 'back']) {
    const list = tpl.props.map((p, i) => ({ p, i })).filter(({ p }) => R.layerOf(p) === layer)
      .sort((a, b) => (b.p.z || 0) - (a.p.z || 0) || b.i - a.i);
    side.append(head(`${layer === 'front' ? 'Front, before dwarves' : 'Back, behind dwarves'} (${list.length})`, UI.layer));
    const ly = el('div', { class: 'layers' });
    list.forEach(({ p, i }) => ly.append(el('div', { class: isSel('prop', i) ? 'on' : '', title: propText(p.s), onclick: e => select([{ k: 'prop', i }], e.shiftKey) },
      el('span', { textContent: p.s }), el('span', { textContent: `${p.x}, ${p.y} · ${p.z || 0}` }))));
    if (layer === 'front') ly.append(el('div', { class: 'dwarfline', textContent: '— dwarves —' }));
    side.append(ly);
  }
  side.append(head(`Spots (${tpl.spots.length})`));
  const sl = el('div', { class: 'layers' });
  tpl.spots.forEach((s, i) => sl.append(el('div', { class: isSel('spot', i) ? 'on' : '', title: spotText(s.kind), onclick: e => select([{ k: 'spot', i }], e.shiftKey) },
    el('span', { textContent: s.kind }), el('span', { textContent: `${s.x}, ${s.y}` }))));
  side.append(sl);
  const help = el('div', { class: 'help' });
  help.innerHTML = 'Pick a prop or spot on the left, click in the room to place it. Everything snaps to the grid (hold <kbd>Alt</kbd> for 1 px); props snap onto the floor.<br>' +
    '<kbd>Shift</kbd>+click adds to the selection, drag on empty space selects a box, <kbd>Ctrl</kbd>+<kbd>A</kbd> selects all.<br>' +
    '<kbd>Arrows</kbd> move one grid step (<kbd>Shift</kbd> ×4) · <kbd>F</kbd> flip / turn a spot · <kbd>S</kbd> sit or stand · <kbd>L</kbd> front/back · <kbd>PgUp</kbd>/<kbd>PgDn</kbd> order · <kbd>Del</kbd> delete · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate · <kbd>Ctrl</kbd>+<kbd>S</kbd> save · <kbd>Esc</kbd> select tool';
  side.append(help);
}
function centerButtons() {
  return [row('center', UI.center, btn('in width', 'center horizontally in the room', () => center('x')), btn('in height', 'center between ceiling and floor', () => center('y')))];
}
function single(side, s) {
  const o = objOf(s);
  if (s.k === 'prop') side.append(el('h3', {}, `Prop: ${o.s}`, info(propText(o.s))));
  else side.append(el('h3', {}, `Spot: ${o.kind}`, info(spotText(o.kind))));
  side.append(num('x', UI.x, o, 'x', opt.snap), num('y', UI.y, o, 'y', opt.snap), ...centerButtons());
  if (s.k === 'prop') {
    side.append(row('flip', UI.flip, el('input', { type: 'checkbox', checked: !!o.flip, onchange: e => { o.flip = e.target.checked; setDirty(); } })));
    const ls = el('select', { onchange: () => { o.layer = ls.value; setDirty(); buildSide(); } });
    ls.append(el('option', { value: 'back', textContent: 'back (behind dwarves)' }), el('option', { value: 'front', textContent: 'front (before dwarves)' }));
    ls.value = R.layerOf(o);
    side.append(row('layer', UI.layer, ls), num('order', UI.order, o, 'z', 1));
    const n = Art.frames(o.s);
    if (n > 1) {
      const fs = el('select', { onchange: () => { o.frame = fs.value === '' ? null : +fs.value; setDirty(); } });
      fs.append(el('option', { value: '', textContent: 'animate' }));
      for (let i = 0; i < n; i++) fs.append(el('option', { value: i, textContent: `frame ${i}` }));
      fs.value = o.frame == null ? '' : o.frame;
      side.append(row('frame', UI.frame, fs));
    }
  } else {
    const def = R.SPOTS[o.kind];
    if (def.face) {
      const fs = el('select', { onchange: () => { o.face = fs.value; setDirty(); buildSide(); } });
      for (const v of def.sides ? ['left', 'right'] : R.FACINGS) fs.append(el('option', { value: v, textContent: v === 'back' ? 'back to viewer' : v }));
      fs.value = R.facing(o);
      side.append(row('faces', UI.faces, fs));
    }
    if (def.sit) side.append(row('sits', UI.sits, el('input', { type: 'checkbox', checked: !!o.sit, onchange: e => { o.sit = e.target.checked; setDirty(); buildSide(); } })));
    const sp = R.spotPose(o);
    if (sp) side.append(row('pose', UI.pose, el('span', { class: 'grow', textContent: sp.pose + (sp.flip ? ' (mirrored)' : '') })));
    if (def.light) {
      side.append(num('radius', UI.radius, o, 'r'), num('strength', UI.strength, o, 'p', 0.05));
      const c = el('input', { type: 'color', value: o.c || '#ffd98e', oninput: () => { o.c = c.value; setDirty(); } });
      side.append(row('colour', UI.colour, c));
    }
    if (def.size) side.append(num('width', UI.width, o, 'w'), num('height', UI.height, o, 'h'));
  }
  side.append(el('div', { class: 'row' }, btn('Duplicate', 'Ctrl+D', duplicateSel), btn('Delete', 'Del', deleteSel, 'danger')));
}
function group(side) {
  side.append(el('h3', {}, `${sels.length} selected`, info(UI.group)));
  const g = groupBounds(), pos = { x: g.x0, y: g.y0 };
  const setPos = () => { moveBy(sels, pos.x - g.x0, pos.y - g.y0); };
  side.append(num('left', UI.groupPos, pos, 'x', opt.snap, () => { setPos(); buildSide(); }),
    num('top', UI.groupPos, pos, 'y', opt.snap, () => { setPos(); buildSide(); }));
  side.append(row('align', UI.align, btn('left', 'align left edges', () => align('left')), btn('centre', 'align centres', () => align('hcenter')), btn('right', 'align right edges', () => align('right'))));
  side.append(row('', null, btn('top', 'align top edges', () => align('top')), btn('middle', 'align middles', () => align('vmiddle')), btn('bottom', 'align bottoms (e.g. all on the floor)', () => align('bottom'))));
  side.append(...centerButtons());
  side.append(row('distribute', UI.distribute, btn('across', 'even spacing left to right', () => distribute('x')), btn('down', 'even spacing top to bottom', () => distribute('y'))));
  side.append(row('spread', UI.spread, btn('room width', 'spread over the whole room width', () => distribute('x', true)), btn('room height', 'spread between ceiling and floor', () => distribute('y', true))));
  side.append(el('div', { class: 'row' }, btn('Duplicate', 'Ctrl+D', duplicateSel), btn('Delete', 'Del', deleteSel, 'danger')));
}

// ------------------------------------------------------------------ edits
function place(x, y, free) {
  x = snapX(x, free); y = snapY(y, free);
  if (tool.prop) {
    if (!free && !hangs(tool.prop) && Math.abs(y - R.FLOOR) < 14) y = R.FLOOR;
    const z = tpl.props.filter(p => R.layerOf(p) === placeLayer).reduce((m, p) => Math.max(m, p.z || 0), 0);
    tpl.props.push({ s: tool.prop, x, y, flip: false, z, frame: null, layer: placeLayer });
    sels = [{ k: 'prop', i: tpl.props.length - 1 }];
  } else {
    const def = R.SPOTS[tool.spot], s = { kind: tool.spot, x, y: !free && STANDERS.includes(tool.spot) && Math.abs(y - R.FLOOR) < 14 ? R.FLOOR : y };
    if (def.face) s.face = def.face;
    if (def.light) Object.assign(s, { r: 90, c: '#ffd98e', p: 0.8 });
    if (def.size) Object.assign(s, { w: 24, h: 12 });
    tpl.spots.push(s);
    sels = [{ k: 'spot', i: tpl.spots.length - 1 }];
  }
  setDirty(); buildSide();
}
function deleteSel() {
  for (const k of ['prop', 'spot']) {
    const list = k === 'prop' ? tpl.props : tpl.spots;
    sels.filter(s => s.k === k).map(s => s.i).sort((a, b) => b - a).forEach(i => list.splice(i, 1));
  }
  sels = []; setDirty(); buildSide();
}
function duplicateSel() {
  if (!sels.length) return;
  const g = groupBounds(), dx = snapX(g.x1 - g.x0 + Math.max(opt.snap, 4)), out = [];
  for (const s of sels) {
    const list = s.k === 'prop' ? tpl.props : tpl.spots;
    list.push({ ...objOf(s), x: objOf(s).x + dx });
    out.push({ k: s.k, i: list.length - 1 });
  }
  sels = out; setDirty(); buildSide();
}
function autoSpots() {
  const add = R.autoSpots(tpl);
  const need = cur.part === 'bay' ? R.BAY_NEEDS : (R.NEEDS[cur.type] || {});
  if (need.worker && !tpl.spots.some(s => s.kind === 'worker') && !add.some(s => s.kind === 'worker')) add.push({ kind: 'worker', x: Math.round(W() / 2), y: R.FLOOR, face: 'front' });
  tpl.spots.push(...add); setDirty(); buildSide();
  status(add.length ? `added ${add.length} spots` : 'nothing to add');
}

// ------------------------------------------------------------------ mouse
function hitProp(x, y) {
  const order = tpl.props.map((p, i) => ({ p, i })).sort((a, b) => (R.layerOf(b.p) === 'front') - (R.layerOf(a.p) === 'front') || (b.p.z || 0) - (a.p.z || 0) || b.i - a.i);
  for (const { p, i } of order) {
    if (!opt.front && R.layerOf(p) === 'front') continue;      // see-through front layer: click what is behind
    const fr = Art.frame(p.s, 0, { flip: !!p.flip });
    const lx = Math.round(x - (p.x - fr.ax)), ly = Math.round(y - (p.y - fr.ay));
    if (lx < 0 || ly < 0 || lx >= fr.canvas.width || ly >= fr.canvas.height) continue;
    if (fr.canvas.getContext('2d').getImageData(lx, ly, 1, 1).data[3]) return i;
  }
  return -1;
}
function hitSpot(x, y) {
  for (let i = tpl.spots.length - 1; i >= 0; i--) { const s = tpl.spots[i]; if (Math.abs(s.x - x) <= 4 && Math.abs(s.y - y) <= 4) return i; }
  return -1;
}
function pos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / opt.zoom - PAD, y: (e.clientY - r.top) / opt.zoom - PAD }; }

cv.addEventListener('mousedown', e => {
  if (!tpl || e.button !== 0) return;
  const p = pos(e);
  if (tool) { place(p.x, p.y, e.altKey); return; }
  let hit = null, i = hitSpot(p.x, p.y);
  if (i >= 0) hit = { k: 'spot', i };
  else if ((i = hitProp(p.x, p.y)) >= 0) hit = { k: 'prop', i };
  if (!hit) { box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: e.shiftKey }; return; }
  if (e.shiftKey) { select([hit], true); return; }
  if (!isSel(hit.k, hit.i)) select([hit]);
  const m = objOf(hit);         // drag moves the whole selection; the grabbed one snaps, the rest keep their offsets
  drag = { hit, ox: m.x - p.x, oy: m.y - p.y, start: sels.map(s => ({ s, x: objOf(s).x, y: objOf(s).y })), mx: m.x, my: m.y, moved: false };
});
addEventListener('mousemove', e => {
  if (!tpl) return;
  const p = pos(e); hover = p;
  if (box) { box.x1 = p.x; box.y1 = p.y; return; }
  if (!drag) return;
  let x = snapX(p.x + drag.ox, e.altKey), y = snapY(p.y + drag.oy, e.altKey);
  if (!e.altKey && standsOnFloor(drag.hit) && Math.abs(y - R.FLOOR) < Math.max(6, opt.snap)) y = R.FLOOR;
  const dx = x - drag.mx, dy = y - drag.my;
  if (!dx && !dy && !drag.moved) return;
  for (const q of drag.start) { const o = objOf(q.s); o.x = q.x + dx; o.y = q.y + dy; }
  drag.moved = true; setDirty();
});
addEventListener('mouseup', () => {
  if (box) {
    const x0 = Math.min(box.x0, box.x1), x1 = Math.max(box.x0, box.x1), y0 = Math.min(box.y0, box.y1), y1 = Math.max(box.y0, box.y1);
    const got = [];
    if (x1 - x0 > 2 || y1 - y0 > 2) {
      tpl.props.forEach((p, i) => { const b = bounds({ k: 'prop', i }); if ((opt.front || R.layerOf(p) !== 'front') && b.x0 <= x1 && b.x1 >= x0 && b.y0 <= y1 && b.y1 >= y0) got.push({ k: 'prop', i }); });
      tpl.spots.forEach((s, i) => { if (s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1) got.push({ k: 'spot', i }); });
    }
    const add = box.add; box = null;
    if (add) select(got.filter(g => !isSel(g.k, g.i)), true); else select(got);
    return;
  }
  if (drag && drag.moved) buildSide();
  drag = null;
});
cv.addEventListener('contextmenu', e => { e.preventDefault(); setTool(null); });

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const ctrl = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
  if (ctrl && key === 's') { e.preventDefault(); save(); return; }
  if (ctrl && key === 'a') { e.preventDefault(); select([...tpl.props.map((_, i) => ({ k: 'prop', i })), ...tpl.spots.map((_, i) => ({ k: 'spot', i }))]); return; }
  if (e.key === 'Escape') { closePop(); setTool(null); sels = []; buildSide(); return; }
  if (!sels.length) return;
  const step = Math.max(1, opt.snap) * (e.shiftKey ? 4 : 1);
  const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  const props = sels.filter(s => s.k === 'prop').map(objOf), spots = sels.filter(s => s.k === 'spot').map(objOf);
  if (mv) { e.preventDefault(); moveBy(sels, mv[0], mv[1]); }
  else if (ctrl && key === 'd') { e.preventDefault(); duplicateSel(); return; }
  else if (e.key === 'Delete' || e.key === 'Backspace') { deleteSel(); return; }
  else if (key === 'f' && !ctrl) {
    for (const o of props) o.flip = !o.flip;
    for (const o of spots) {                     // spots turn through their facings
      const d = R.SPOTS[o.kind]; if (!d.face) continue;
      const list = d.sides ? ['left', 'right'] : R.FACINGS;
      o.face = list[(list.indexOf(R.facing(o)) + 1) % list.length];
    }
  }
  else if (key === 's' && !ctrl) { for (const o of spots) if (R.SPOTS[o.kind].sit) o.sit = !o.sit; }
  else if (key === 'l' && !ctrl) { for (const o of props) o.layer = R.layerOf(o) === 'front' ? 'back' : 'front'; }
  else if (e.key === 'PageUp') { e.preventDefault(); for (const o of props) o.z = (o.z || 0) + 1; }
  else if (e.key === 'PageDown') { e.preventDefault(); for (const o of props) o.z = (o.z || 0) - 1; }
  else return;
  setDirty(); buildSide();
});

// ------------------------------------------------------------------ drawing
const off = document.createElement('canvas'), og = off.getContext('2d');
function frameLoop(now) {
  requestAnimationFrame(frameLoop);
  if (!tpl) return;
  const t = opt.anim ? now / 1000 : 0, w = W(), Z = opt.zoom;
  off.width = w + 2 * PAD; off.height = R.RH + 2 * PAD;
  og.clearRect(0, 0, off.width, off.height);
  og.save(); og.beginPath(); og.rect(PAD, PAD, w, R.RH); og.clip();
  const between = !opt.ghost ? null : (g, x0, y0) => {
    if (!D.ready()) return;
    g.globalAlpha = 0.85;
    tpl.spots.forEach((s, i) => {
      const sp = R.spotPose(s);
      if (sp) D.draw(g, s.kind === 'bed' ? { ...LOOKS[i % LOOKS.length], quilt: false } : LOOKS[i % LOOKS.length], sp.pose, Math.floor(t * 4 + i), x0 + s.x, y0 + s.y, { flip: sp.flip });
    });
    g.globalAlpha = 1;
  };
  R.drawRoom(og, tpl, PAD, PAD, t, { light: opt.light, worldX: 0, between, front: opt.front ? 1 : 0.35 });
  og.restore();

  cv.width = off.width * Z; cv.height = off.height * Z;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, cv.width, cv.height);
  const X = x => (x + PAD) * Z, Y = y => (y + PAD) * Z;
  ctx.strokeStyle = 'rgba(240,192,96,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(X(0) - 0.5, Y(0) - 0.5, w * Z + 1, R.RH * Z + 1);
  if (opt.grid) {
    if (opt.snap > 1 && opt.snap * Z >= 6) {            // snap grid as dots, counted from the floor line
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (let y = R.FLOOR; y >= 0; y -= opt.snap) for (let x = 0; x <= w; x += opt.snap) ctx.fillRect(X(x) - 0.5, Y(y) - 0.5, 1.5, 1.5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    for (let x = R.CELL; x < w; x += R.CELL) { ctx.beginPath(); ctx.moveTo(X(x) + 0.5, Y(0)); ctx.lineTo(X(x) + 0.5, Y(R.RH)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(240,192,96,0.25)'; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(X((w - 1) / 2) + 0.5, Y(0)); ctx.lineTo(X((w - 1) / 2) + 0.5, Y(R.RH)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(120,220,120,0.45)';
    ctx.beginPath(); ctx.moveTo(X(0), Y(R.FLOOR) + 0.5); ctx.lineTo(X(w), Y(R.FLOOR) + 0.5); ctx.stroke();
  }
  // selection outlines
  for (const s of sels) {
    if (s.k !== 'prop' || !tpl.props[s.i]) continue;
    const p = tpl.props[s.i], b = bounds(s);
    ctx.strokeStyle = R.layerOf(p) === 'front' ? '#7fd0ff' : '#f0c060'; ctx.setLineDash([4, 3]);
    ctx.strokeRect(X(b.x0) - 0.5, Y(b.y0) - 0.5, (b.x1 - b.x0 + 1) * Z + 1, (b.y1 - b.y0 + 1) * Z + 1);
    ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(X(p.x) - 2, Y(p.y) - 2, 4, 4);       // the anchor
  }
  if (sels.length > 1) {
    const g = groupBounds();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([1, 3]);
    ctx.strokeRect(X(g.x0) - 3.5, Y(g.y0) - 3.5, (g.x1 - g.x0 + 1) * Z + 7, (g.y1 - g.y0 + 1) * Z + 7); ctx.setLineDash([]);
  }
  // spot markers
  ctx.font = `bold ${Math.max(9, 3 * Z)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  tpl.spots.forEach((s, i) => {
    const d = R.SPOTS[s.kind] || { c: '#fff', t: '?' }, x = X(s.x), y = Y(s.y), on = isSel('spot', i);
    if (s.kind === 'light' && on) { ctx.strokeStyle = s.c || '#ffd98e'; ctx.beginPath(); ctx.arc(x, y, (s.r || 90) * Z, 0, 7); ctx.stroke(); }
    if (s.kind === 'fire') { ctx.strokeStyle = d.c; ctx.strokeRect(x - (s.w || 24) * Z / 2, y - (s.h || 12) * Z / 2, (s.w || 24) * Z, (s.h || 12) * Z); }
    const r = 3 * Z;
    ctx.fillStyle = d.c; ctx.strokeStyle = on ? '#fff' : '#111'; ctx.lineWidth = on ? 2 : 1;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.strokeRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = '#111'; ctx.fillText(d.t, x, y + 0.5);
    const fc = d.face ? R.facing(s) : null, dir = fc === 'left' ? -1 : fc === 'right' ? 1 : 0;
    if (dir) { ctx.fillStyle = d.c; ctx.beginPath(); ctx.moveTo(x + dir * (r + 6), y); ctx.lineTo(x + dir * (r + 1), y - 4); ctx.lineTo(x + dir * (r + 1), y + 4); ctx.fill(); }
    if (fc === 'back') { ctx.fillStyle = d.c; ctx.beginPath(); ctx.moveTo(x, y - r - 6); ctx.lineTo(x - 4, y - r - 1); ctx.lineTo(x + 4, y - r - 1); ctx.fill(); }
    ctx.lineWidth = 1;
  });
  // selection box being dragged
  if (box) {
    ctx.strokeStyle = '#f0c060'; ctx.fillStyle = 'rgba(240,192,96,0.08)'; ctx.setLineDash([3, 3]);
    const x0 = Math.min(box.x0, box.x1), y0 = Math.min(box.y0, box.y1);
    ctx.fillRect(X(x0), Y(y0), Math.abs(box.x1 - box.x0) * Z, Math.abs(box.y1 - box.y0) * Z);
    ctx.strokeRect(X(x0) + 0.5, Y(y0) + 0.5, Math.abs(box.x1 - box.x0) * Z, Math.abs(box.y1 - box.y0) * Z); ctx.setLineDash([]);
  }
  // placement preview, snapped like the click will be
  if (tool && hover) {
    let hx = snapX(hover.x), hy = snapY(hover.y);
    if (tool.prop) {
      if (!hangs(tool.prop) && Math.abs(hy - R.FLOOR) < 14) hy = R.FLOOR;
      ctx.globalAlpha = 0.5;
      const fr = Art.frame(tool.prop, 0);
      ctx.drawImage(fr.canvas, X(hx - fr.ax), Y(hy - fr.ay), fr.canvas.width * Z, fr.canvas.height * Z);
      ctx.globalAlpha = 1;
    } else {
      if (STANDERS.includes(tool.spot) && Math.abs(hy - R.FLOOR) < 14) hy = R.FLOOR;
      ctx.strokeStyle = R.SPOTS[tool.spot].c; ctx.strokeRect(X(hx) - 3 * Z, Y(hy) - 3 * Z, 6 * Z, 6 * Z);
    }
    ctx.fillStyle = '#eadbc8'; ctx.textAlign = 'left'; ctx.font = '11px system-ui';
    ctx.fillText(`${hx}, ${hy}`, X(hx) + 12, Y(hy) - 12);
  }
}

// ------------------------------------------------------------------ templates
function fillTypes() {
  const s = $('type'), v = cur.type; s.innerHTML = '';
  for (const t of types) {
    const n = ((idx[t.type] || {}).room || []).length, b = ((idx[t.type] || {}).bay || []).length;
    s.append(el('option', { value: t.type, textContent: `${t.type}  [${n}${t.bay ? ` + ${b} bay` : ''}]${n && (!t.bay || b) ? '' : '  needs one'}` }));
  }
  s.value = v;
  $('part').querySelector('[value=bay]').disabled = !typeInfo().bay;
}
function fillTemplates() {
  const s = $('tpls'); s.innerHTML = '';
  const list = ((idx[cur.type] || {})[cur.part]) || [];
  for (const n of list) s.append(el('option', { value: n, textContent: n }));
  s.append(el('option', { value: '', textContent: '(new, unsaved)' }));
  s.value = cur.name && list.includes(cur.name) ? cur.name : '';
}
function confirmLeave() { return !dirty || confirm('Drop the unsaved changes?'); }
async function open(type, part, name) {
  cur = { type, part, name: name || '' };
  if (name) {
    const d = await api(`/api/template?type=${type}&part=${part}&name=${encodeURIComponent(name)}`);
    tpl = d.error ? R.blank(type, part, cells()) : { ...R.blank(type, part, cells()), ...d };
  } else tpl = R.blank(type, part, cells());
  tpl.cells = cells();
  sels = []; setDirty(false);
  $('name').value = cur.name; $('wall').value = tpl.wall; $('floor').value = tpl.floor; $('vault').checked = !!tpl.vault;
  fillTypes(); fillTemplates(); buildSide();
}
async function save() {
  const name = $('name').value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(name)) { status('Give it a name: a-z, 0-9, _ or -'); $('name').focus(); return; }
  tpl.cells = cells();
  const d = await api('/api/save', { type: cur.type, part: cur.part, name, data: tpl });
  if (d.error) { status(d.error); return; }
  idx = d.index; cur.name = name; setDirty(false); fillTypes(); fillTemplates();
  const miss = R.missing(tpl);
  status(miss.length ? `saved; still missing ${miss.map(m => m.kind).join(', ')}` : 'saved');
}

$('type').onchange = e => { if (!confirmLeave()) { e.target.value = cur.type; return; } const l = (idx[e.target.value] || {}).room || []; open(e.target.value, 'room', l[0]); $('part').value = 'room'; };
$('part').onchange = e => { if (!confirmLeave()) { e.target.value = cur.part; return; } const l = (idx[cur.type] || {})[e.target.value] || []; open(cur.type, e.target.value, l[0]); };
$('tpls').onchange = e => { if (!confirmLeave()) { e.target.value = cur.name; return; } open(cur.type, cur.part, e.target.value); };
$('new').onclick = () => { if (confirmLeave()) open(cur.type, cur.part, ''); };
$('dup').onclick = () => { cur.name = ''; $('name').value = ''; fillTemplates(); setDirty(); status('copy: give it a new name and save'); };
$('del').onclick = async () => {
  if (!cur.name || !confirm(`Delete template "${cur.name}"?`)) return;
  const d = await api('/api/delete', { type: cur.type, part: cur.part, name: cur.name });
  idx = d.index; const l = (idx[cur.type] || {})[cur.part] || []; open(cur.type, cur.part, l[0]);
};
$('save').onclick = save;
$('wall').onchange = e => { tpl.wall = e.target.value; setDirty(); };
$('floor').onchange = e => { tpl.floor = e.target.value; setDirty(); };
$('vault').onchange = e => { tpl.vault = e.target.checked; setDirty(); };
for (const [id, k] of [['tLight', 'light'], ['tGhost', 'ghost'], ['tFront', 'front'], ['tAnim', 'anim'], ['tGrid', 'grid']]) {
  $(id).classList.toggle('on', opt[k]);
  $(id).onclick = e => { opt[k] = !opt[k]; e.target.classList.toggle('on', opt[k]); };
}
$('zoom').onchange = e => { opt.zoom = +e.target.value; };
$('snap').onchange = e => { opt.snap = +e.target.value; buildSide(); };
for (const [id, text] of Object.entries(UI)) {          // tooltip and i button next to every header control
  const c = $(id);
  if (!c) continue;
  c.title = text;
  (c.closest('label') || c).after(info(text));
}
addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });

// ------------------------------------------------------------------ start
(async () => {
  await Art.load('/static/art/props48/');
  D.load('/static/art/dwarf48/').catch(e => status('dwarf kit missing: ' + e));
  for (const w of R.WALLS) $('wall').append(el('option', { value: w, textContent: w.replace('wall_', '') }));
  for (const f of R.FLOORS) $('floor').append(el('option', { value: f, textContent: f.replace('floor_', '') }));
  const d = await api('/api/rooms');
  types = d.types; idx = d.index;
  buildPalette();
  const first = types[0].type;
  await open(first, 'room', ((idx[first] || {}).room || [])[0]);
  window.__editor = { get tpl() { return tpl; }, set tpl(v) { tpl = v; buildSide(); }, open, save, autoSpots, R, Art, cur: () => cur,
    setName: n => { $('name').value = n; }, select, get sels() { return sels; }, align, center, distribute, opt };
  requestAnimationFrame(frameLoop);
})();
