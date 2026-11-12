// Room template editor: place props, mark spots, save templates for the game. See tools/room-editor/serve.py.
import * as Art from '/static/js/art48.js';
import * as R from '/static/js/rooms48.js';

const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const GROUPS = ['furniture', 'living', 'workshop', 'storage', 'shell', 'rock', 'ambient', 'valley', 'monster'];
const GHOST = { worker: 'd_side', stand: 'd_stand', seat: 'd_sit', bar: 'd_drink' };

let types = [], idx = {}, tpl = null, cur = { type: '', part: 'room', name: '' }, dirty = false;
let sel = null;             // {k: 'prop'|'spot', i}
let tool = null;            // null = select, {prop: name} or {spot: kind}
let drag = null, hover = null;
const opt = { light: true, ghost: true, anim: true, grid: false, zoom: 3 };
const ghosts = {};
const PAD = 16;                // margin around the room for things that stick out (hanging lamps, smoke)

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
  for (const k of kids) e.append(k);
  return e;
}
function thumb(name, size = 44) {
  const c = el('canvas'); c.width = c.height = size;
  const fr = Art.frame(name, 0), s = Math.min(1, size / Math.max(fr.canvas.width, fr.canvas.height)) ;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const w = fr.canvas.width * s, h = fr.canvas.height * s;
  g.drawImage(fr.canvas, (size - w) / 2, (size - h) / 2, w, h);
  return c;
}

// ------------------------------------------------------------------ palette
function buildPalette() {
  const pal = $('pal'); pal.innerHTML = '';
  pal.append(el('h3', { textContent: 'Tools' }));
  const sp = el('div', { class: 'spots' });
  sp.append(el('div', { class: 'tool' + (!tool ? ' on' : ''), onclick: () => setTool(null), title: 'select and move (Esc)' }, 'select / move'));
  sp.append(el('div', { class: 'tool', onclick: autoSpots, title: 'add the spots the placed props suggest' }, 'auto spots'));
  pal.append(sp);
  pal.append(el('h3', { textContent: 'Spots' }));
  const sg = el('div', { class: 'spots' });
  for (const [k, s] of Object.entries(R.SPOTS)) {
    const on = tool && tool.spot === k;
    sg.append(el('div', { class: 'tool' + (on ? ' on' : ''), title: s.help, onclick: () => setTool({ spot: k }) },
      el('span', { class: 'dot', textContent: s.t, style: `background:${s.c}` }), k));
  }
  pal.append(sg);
  for (const g of GROUPS) {
    const list = Art.names(g).filter(n => Art.info(n).kind === 'prop');
    if (!list.length) continue;
    pal.append(el('h3', { textContent: g }));
    const grid = el('div', { class: 'grid' });
    for (const n of list) grid.append(el('div', { class: 'tool' + (tool && tool.prop === n ? ' on' : ''), title: n, onclick: () => setTool({ prop: n }) }, thumb(n), n));
    pal.append(grid);
  }
}
function setTool(t) { tool = t; buildPalette(); }

// ------------------------------------------------------------------ side panel
function num(label, obj, key, step = 1, after) {
  const i = el('input', { type: 'number', step, value: obj[key] ?? '', oninput: () => { obj[key] = i.value === '' ? undefined : +i.value; setDirty(); after && after(); } });
  return el('div', { class: 'row' }, el('span', { textContent: label }), i);
}
function buildSide() {
  const side = $('side'); side.innerHTML = '';
  if (!tpl) return;
  side.append(el('h3', { textContent: `${cur.type} ${cur.part} · ${cells()} cells · ${W()} px` }));
  // checklist
  const need = cur.part === 'bay' ? R.BAY_NEEDS : (R.NEEDS[cur.type] || {});
  const count = {}; for (const s of tpl.spots) count[s.kind] = (count[s.kind] || 0) + 1;
  side.append(el('h3', { textContent: 'Needs' }));
  for (const [k, n] of Object.entries(need)) {
    const h = count[k] || 0;
    side.append(el('div', { class: 'need ' + (h >= n ? 'ok' : 'bad'), textContent: `${h >= n ? 'ok' : 'missing'}  ${k}: ${h} / ${n}`, title: R.SPOTS[k].help }));
  }
  // selection
  if (sel) {
    const o = sel.k === 'prop' ? tpl.props[sel.i] : tpl.spots[sel.i];
    side.append(el('h3', { textContent: sel.k === 'prop' ? `Prop: ${o.s}` : `Spot: ${o.kind}` }));
    side.append(num('x', o, 'x'), num('y', o, 'y'));
    if (sel.k === 'prop') {
      side.append(el('div', { class: 'row' }, el('span', { textContent: 'flip' }), el('input', { type: 'checkbox', checked: !!o.flip, onchange: e => { o.flip = e.target.checked; setDirty(); } })));
      side.append(num('layer', o, 'z', 1, buildSide));
      const n = Art.frames(o.s);
      if (n > 1) {
        const s = el('select', { onchange: () => { o.frame = s.value === '' ? null : +s.value; setDirty(); } });
        s.append(el('option', { value: '', textContent: 'animate' }));
        for (let i = 0; i < n; i++) s.append(el('option', { value: i, textContent: `frame ${i}` }));
        s.value = o.frame == null ? '' : o.frame;
        side.append(el('div', { class: 'row' }, el('span', { textContent: 'frame' }), s));
      }
    } else {
      const def = R.SPOTS[o.kind];
      if (def.face) {
        const s = el('select', { onchange: () => { o.face = +s.value; setDirty(); } });
        for (const [v, t] of [[-1, 'left'], [0, 'front'], [1, 'right']]) s.append(el('option', { value: v, textContent: t }));
        s.value = o.face ?? 1;
        side.append(el('div', { class: 'row' }, el('span', { textContent: 'faces' }), s));
      }
      if (def.light) {
        side.append(num('radius', o, 'r'), num('strength', o, 'p', 0.05));
        const c = el('input', { type: 'color', value: o.c || '#ffd98e', oninput: () => { o.c = c.value; setDirty(); } });
        side.append(el('div', { class: 'row' }, el('span', { textContent: 'colour' }), c));
      }
      if (def.size) side.append(num('width', o, 'w'), num('height', o, 'h'));
    }
    side.append(el('div', { class: 'row' }, el('button', { textContent: 'Duplicate', onclick: duplicateSel }), el('button', { class: 'danger', textContent: 'Delete', onclick: deleteSel })));
  }
  // layers
  side.append(el('h3', { textContent: `Props (${tpl.props.length}), back to front` }));
  const ly = el('div', { class: 'layers' });
  tpl.props.map((p, i) => ({ p, i })).sort((a, b) => (a.p.z || 0) - (b.p.z || 0) || a.i - b.i).forEach(({ p, i }) =>
    ly.append(el('div', { class: sel && sel.k === 'prop' && sel.i === i ? 'on' : '', onclick: () => select({ k: 'prop', i }) }, el('span', { textContent: p.s }), el('span', { textContent: `z ${p.z || 0}` }))));
  side.append(ly);
  side.append(el('h3', { textContent: `Spots (${tpl.spots.length})` }));
  const sl = el('div', { class: 'layers' });
  tpl.spots.forEach((s, i) => sl.append(el('div', { class: sel && sel.k === 'spot' && sel.i === i ? 'on' : '', onclick: () => select({ k: 'spot', i }) }, el('span', { textContent: s.kind }), el('span', { textContent: `${s.x}, ${s.y}` }))));
  side.append(sl);
  const help = el('div', { class: 'help' });
  help.innerHTML = 'Click a prop or spot in the palette, then click in the room to place it. Props snap to the floor (hold <kbd>Alt</kbd> to place freely).<br>' +
    '<kbd>Arrows</kbd> move (<kbd>Shift</kbd> ×8) · <kbd>F</kbd> flip · <kbd>PgUp</kbd>/<kbd>PgDn</kbd> layer · <kbd>Del</kbd> delete · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate · <kbd>Ctrl</kbd>+<kbd>S</kbd> save · <kbd>Esc</kbd> select tool';
  side.append(help);
}
function select(s) { sel = s; buildSide(); }

// ------------------------------------------------------------------ edits
function place(x, y, free) {
  if (tool.prop) {
    const kind = Art.info(tool.prop);
    const hang = Art.frame(tool.prop, 0).ay < Art.frame(tool.prop, 0).canvas.height / 2;     // hangs from its anchor
    if (!free && !hang && Math.abs(y - R.FLOOR) < 14) y = R.FLOOR;
    const z = tpl.props.reduce((m, p) => Math.max(m, p.z || 0), 0);
    tpl.props.push({ s: tool.prop, x, y, flip: false, z, frame: null });
    sel = { k: 'prop', i: tpl.props.length - 1 };
    void kind;
  } else {
    const def = R.SPOTS[tool.spot], s = { kind: tool.spot, x, y: free ? y : (['worker', 'seat', 'bar', 'stand'].includes(tool.spot) && Math.abs(y - R.FLOOR) < 14 ? R.FLOOR : y) };
    if (def.face) s.face = 1;
    if (def.light) Object.assign(s, { r: 90, c: '#ffd98e', p: 0.8 });
    if (def.size) Object.assign(s, { w: 24, h: 12 });
    tpl.spots.push(s);
    sel = { k: 'spot', i: tpl.spots.length - 1 };
  }
  setDirty(); buildSide();
}
function deleteSel() { if (!sel) return; (sel.k === 'prop' ? tpl.props : tpl.spots).splice(sel.i, 1); sel = null; setDirty(); buildSide(); }
function duplicateSel() {
  if (!sel) return;
  const list = sel.k === 'prop' ? tpl.props : tpl.spots, o = { ...list[sel.i], x: list[sel.i].x + 12 };
  list.push(o); sel = { k: sel.k, i: list.length - 1 }; setDirty(); buildSide();
}
function autoSpots() {
  const add = R.autoSpots(tpl);
  const need = cur.part === 'bay' ? R.BAY_NEEDS : (R.NEEDS[cur.type] || {});
  if (need.worker && !tpl.spots.some(s => s.kind === 'worker') && !add.some(s => s.kind === 'worker')) add.push({ kind: 'worker', x: Math.round(W() / 2), y: R.FLOOR, face: 0 });
  tpl.spots.push(...add); setDirty(); buildSide();
  status(add.length ? `added ${add.length} spots` : 'nothing to add');
}

// ------------------------------------------------------------------ hit test
function hitProp(x, y) {
  const order = tpl.props.map((p, i) => ({ p, i })).sort((a, b) => (b.p.z || 0) - (a.p.z || 0) || b.i - a.i);
  for (const { p, i } of order) {
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
function pos(e) { const r = cv.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left) / opt.zoom) - PAD, y: Math.round((e.clientY - r.top) / opt.zoom) - PAD }; }

cv.addEventListener('mousedown', e => {
  if (!tpl) return;
  const p = pos(e);
  if (tool) { place(p.x, p.y, e.altKey); return; }
  let i = hitSpot(p.x, p.y);
  if (i >= 0) sel = { k: 'spot', i };
  else if ((i = hitProp(p.x, p.y)) >= 0) sel = { k: 'prop', i };
  else sel = null;
  if (sel) { const o = sel.k === 'prop' ? tpl.props[sel.i] : tpl.spots[sel.i]; drag = { dx: o.x - p.x, dy: o.y - p.y, moved: false }; }
  buildSide();
});
addEventListener('mousemove', e => {
  if (!tpl) return;
  const p = pos(e); hover = p;
  if (!drag || !sel) return;
  const o = sel.k === 'prop' ? tpl.props[sel.i] : tpl.spots[sel.i];
  let y = p.y + drag.dy;
  if (!e.altKey && Math.abs(y - R.FLOOR) < 6 && (sel.k === 'prop' || ['worker', 'seat', 'bar', 'stand'].includes(o.kind))) y = R.FLOOR;
  o.x = p.x + drag.dx; o.y = y; drag.moved = true; setDirty();
});
addEventListener('mouseup', () => { if (drag && drag.moved) buildSide(); drag = null; });
cv.addEventListener('contextmenu', e => { e.preventDefault(); setTool(null); });

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 's') { e.preventDefault(); save(); return; }
  if (e.key === 'Escape') { setTool(null); sel = null; buildSide(); return; }
  if (!sel) return;
  const o = sel.k === 'prop' ? tpl.props[sel.i] : tpl.spots[sel.i], d = e.shiftKey ? 8 : 1;
  const mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
  if (mv) { e.preventDefault(); o.x += mv[0]; o.y += mv[1]; }
  else if (ctrl && e.key === 'd') { e.preventDefault(); duplicateSel(); return; }
  else if (e.key === 'Delete' || e.key === 'Backspace') { deleteSel(); return; }
  else if ((e.key === 'f' || e.key === 'F') && sel.k === 'prop') o.flip = !o.flip;
  else if ((e.key === 'f' || e.key === 'F') && o.face !== undefined) o.face = -o.face;
  else if (e.key === 'PageUp' && sel.k === 'prop') { e.preventDefault(); o.z = (o.z || 0) + 1; }
  else if (e.key === 'PageDown' && sel.k === 'prop') { e.preventDefault(); o.z = (o.z || 0) - 1; }
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
  R.drawShell(og, tpl, PAD, PAD, w, 0);
  R.drawProps(og, tpl, PAD, PAD, t);
  if (opt.ghost) {
    og.globalAlpha = 0.75;
    for (const s of tpl.spots) {
      const im = ghosts[GHOST[s.kind]];
      if (!im || !im.complete) continue;
      og.save(); og.translate(PAD + s.x, PAD + s.y);
      if (s.face === -1) og.scale(-1, 1);
      og.drawImage(im, -24, -62); og.restore();
    }
    og.globalAlpha = 1;
  }
  if (opt.light) R.drawLight(og, tpl, PAD, PAD, w, t);
  og.restore();

  cv.width = off.width * Z; cv.height = off.height * Z;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, cv.width, cv.height);
  const X = x => (x + PAD) * Z, Y = y => (y + PAD) * Z;
  ctx.strokeStyle = 'rgba(240,192,96,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(X(0) - 0.5, Y(0) - 0.5, w * Z + 1, R.RH * Z + 1);
  if (opt.grid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    for (let x = R.CELL; x < w; x += R.CELL) { ctx.beginPath(); ctx.moveTo(X(x) + 0.5, Y(0)); ctx.lineTo(X(x) + 0.5, Y(R.RH)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(120,220,120,0.35)';
    ctx.beginPath(); ctx.moveTo(X(0), Y(R.FLOOR) + 0.5); ctx.lineTo(X(w), Y(R.FLOOR) + 0.5); ctx.stroke();
  }
  // selection box
  if (sel && sel.k === 'prop' && tpl.props[sel.i]) {
    const p = tpl.props[sel.i], fr = Art.frame(p.s, 0, { flip: !!p.flip });
    ctx.strokeStyle = '#f0c060'; ctx.setLineDash([4, 3]);
    ctx.strokeRect(X(p.x - fr.ax) - 0.5, Y(p.y - fr.ay) - 0.5, fr.canvas.width * Z + 1, fr.canvas.height * Z + 1);
    ctx.setLineDash([]);
  }
  // spot markers
  ctx.font = `bold ${Math.max(9, 3 * Z)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  tpl.spots.forEach((s, i) => {
    const d = R.SPOTS[s.kind] || { c: '#fff', t: '?' }, x = X(s.x), y = Y(s.y), on = sel && sel.k === 'spot' && sel.i === i;
    if (s.kind === 'light' && on) { ctx.strokeStyle = s.c || '#ffd98e'; ctx.beginPath(); ctx.arc(x, y, (s.r || 90) * Z, 0, 7); ctx.stroke(); }
    if (s.kind === 'fire') { ctx.strokeStyle = d.c; ctx.strokeRect(x - (s.w || 24) * Z / 2, y - (s.h || 12) * Z / 2, (s.w || 24) * Z, (s.h || 12) * Z); }
    const r = 3 * Z;
    ctx.fillStyle = d.c; ctx.strokeStyle = on ? '#fff' : '#111'; ctx.lineWidth = on ? 2 : 1;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.strokeRect(x - r, y - r, 2 * r, 2 * r);
    ctx.fillStyle = '#111'; ctx.fillText(d.t, x, y + 0.5);
    if (s.face) { ctx.fillStyle = d.c; ctx.beginPath(); ctx.moveTo(x + s.face * (r + 6), y); ctx.lineTo(x + s.face * (r + 1), y - 4); ctx.lineTo(x + s.face * (r + 1), y + 4); ctx.fill(); }
    ctx.lineWidth = 1;
  });
  // placement preview
  if (tool && tool.prop && hover) {
    ctx.globalAlpha = 0.5;
    const fr = Art.frame(tool.prop, 0);
    ctx.drawImage(fr.canvas, X(hover.x - fr.ax), Y(hover.y - fr.ay), fr.canvas.width * Z, fr.canvas.height * Z);
    ctx.globalAlpha = 1;
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
  sel = null; setDirty(false);
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
for (const [id, k] of [['tLight', 'light'], ['tGhost', 'ghost'], ['tAnim', 'anim'], ['tGrid', 'grid']])
  $(id).onclick = e => { opt[k] = !opt[k]; e.target.classList.toggle('on', opt[k]); };
$('zoom').onchange = e => { opt.zoom = +e.target.value; };
addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });

// ------------------------------------------------------------------ start
(async () => {
  await Art.load('/static/art/props48/');
  for (const n of Object.values(GHOST)) { ghosts[n] = new Image(); ghosts[n].src = `/dwarves/${n}.png`; }
  for (const w of R.WALLS) $('wall').append(el('option', { value: w, textContent: w.replace('wall_', '') }));
  for (const f of R.FLOORS) $('floor').append(el('option', { value: f, textContent: f.replace('floor_', '') }));
  const d = await api('/api/rooms');
  types = d.types; idx = d.index;
  buildPalette();
  const first = types[0].type;
  await open(first, 'room', ((idx[first] || {}).room || [])[0]);
  window.__editor = { get tpl() { return tpl; }, set tpl(v) { tpl = v; buildSide(); }, open, save, autoSpots, R, Art, cur: () => cur, setName: n => { $('name').value = n; } };
  requestAnimationFrame(frameLoop);
})();
