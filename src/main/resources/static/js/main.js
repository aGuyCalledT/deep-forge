// Boot, login, tabs, polling and the global animation loop.
import { api, token, setToken } from './api.js';
import { G, F, D, indexData, byId, fmt, dur, now, ago } from './data.js';
import { loadNotes, unseenNotes } from './notes.js';
import { h, img, bus, toast, storesView, ico, closeSheet, popOpen, helpOn, costChips, frameDecor, setMaterial, MATERIAL, slideIn, slideOut, setSand, money, statusIco } from './ui.js';
import { hidePlate } from './plate.js';
import * as S from './sprites.js';
import { initCanvas, zoomBy, lookAt, camera, toScreen, homeCamera } from './canvas.js';
import { holdScreen, roomCenter, roomAt, roomRect, agents, roomStatus, loadArt as loadArt48 } from './hold.js';
import { drawLoginArt } from './views.js';
import { mineScreen, mineLayer } from './mine48.js';
import { openRoomSheet, openDwarfSheet } from './popups.js';
import { berlinTime } from './sun.js';
import { renderFortress, renderDwarves, renderWar, renderMore } from './panels-base.js';
import { renderWork, animateWork, pump, currentHeat } from './panels-work.js';
import { renderMines } from './panels-mines.js';
import { renderTrade, renderExplore, loadMarket } from './panels-trade.js';
import * as A from './audio.js';
import { openAudioSheet } from './panels-audio.js';

const TABS = [
  ['fortress', 'Hold', renderFortress],
  ['mines', 'Mines', renderMines],
  ['dwarves', 'Dwarves', renderDwarves],
  ['work', 'Work', renderWork],
  ['trade', 'Trade', renderTrade],
  ['explore', 'Explore', renderExplore],
  ['war', 'War', renderWar],
  ['more', 'More', renderMore],
];
const ICON = { mines: 'mines', fortress: 'fortress', dwarves: 'dwarves', work: 'work', trade: 'trade', explore: 'explore', war: 'war', more: 'more' };

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ state

function setState(s) {
  const before = G.state;
  G.state = s;
  G.offset = s.now - Date.now() / 1000;
  if (before) soundsForLog(before.fortress.log, s.fortress.log);
  renderTop();
  renderAlerts();
  render();
}

bus.act = async (action, quiet = false, rethrow = false) => {
  try {
    const s = await api.action(action);
    if (!quiet) soundForAction(action);
    // bellows taps are frequent: skip the full re-render for them
    if (quiet) { G.state = s; G.offset = s.now - Date.now() / 1000; renderTop(); return s; }
    setState(s);
    return s;
  } catch (e) {
    if (e.status === 401) return logout();
    A.sfx('error');
    if (rethrow) throw e;
    toast(e.message, 'bad');
  }
};

// ------------------------------------------------------------------ sounds

function soundForAction(a) {
  switch (a.type) {
    case 'assign': return A.sfx(a.job === 'warrior' ? 'unsheathe' : 'click');
    case 'build': case 'upgrade': case 'upgradeLayer': case 'unlockLayer': return A.sfx('build');
    case 'queueAdd': return A.sfx('open');
    case 'queueRemove': return A.sfx('close');
    case 'quench': return A.sfx('quench');
    case 'equip': return A.sfx(String(a.item).startsWith('item:axe') ? 'unsheathe2' : 'open');
    case 'unequip': return A.sfx('close');
    case 'caravan': return A.sfx('caravan');
    case 'expedition': return A.sfx('expedition');
    case 'fightThreat': case 'breakSiege': return A.sfx('march');
    case 'tradition': return A.sfx('chime');
    case 'choice': case 'queueMove': case 'rename': case 'dismissExpedition': return A.sfx('click');
    default: return null;
  }
}

/** Play a sound for new chronicle entries (things that happened on the server). */
const LOG_SOUNDS = [
  [/Fortress level/, () => A.sfx('levelup')],
  [/masterwork/i, () => A.sfx('fanfare')],
  [/Perfect quench/, () => A.sfx('chime')],
  [/Scouts report/, () => A.sfx('horn')],
  [/driven off|siege is broken/, () => A.battle(true)],
  [/broke through/, () => A.battle(false)],
  [/was slain!/, () => A.battle(true)],
  [/beaten back|sortie failed/, () => A.battle(false)],
  [/Mining there has stopped/, () => A.sfx('monster')],
  [/ died: /, () => A.sfx('death')],
  [/lost with all hands/, () => A.sfx('death')],
  [/Caravan back/, () => A.sfx('coins')],
  [/expedition to .* returned/, () => A.sfx('fanfare')],
  [/are open!/, () => A.sfx('fanfare')],
  [/Migrants arrived/, () => A.sfx('bell')],
  [/larder is empty|last barrel of ale/, () => A.sfx('alarm')],
  [/caravan leaves/, () => null],
];

function soundsForLog(old, now) {
  if (!old.length) return;
  const last = old[old.length - 1];
  let i = now.length - 1;
  while (i >= 0 && !(now[i].t === last.t && now[i].text === last.text)) i--;
  const fresh = now.slice(i + 1).slice(-4);
  fresh.forEach((l, k) => {
    const hit = LOG_SOUNDS.find(([re]) => re.test(l.text));
    if (hit) setTimeout(hit[1], k * 700);
  });
}

/** Background noise for what is on screen; runs once a second. */
let nextPick = 0, nextMoo = 0;
function ambience() {
  if (!G.state) return;
  const f = F(), wanted = new Set();
  const nowMs = performance.now();
  if (G.screen === 'hold') {
    // the workshop nearest the middle of the view sets the sound, if it is busy
    const b = roomAt(viewCenter());
    const working = b && (b.job && !b.job.quenching || (byId.buildings[b.type].kind === 'continuous' && D().buildings[b.id] && D().buildings[b.id].worker)) && !f.siege;
    if (b && working && camera().zoom >= 1) {
      if (b.type === 'forge') wanted.add('forge');
      if (b.type === 'smelter') wanted.add('furnace');
      if (b.type === 'grindstone') wanted.add('grindstone');
      if (b.type === 'brewery') wanted.add('brewing');
    }
    if (b && b.type === 'farm' && nowMs > nextMoo) { nextMoo = nowMs + 45000 + Math.random() * 90000; if (Math.random() < 0.5) A.sfx('moo'); }
    if (!wanted.size) wanted.add('tavern');
    const hr = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Berlin' }).format(new Date()));
    if (hr >= 21 || hr < 6) wanted.add('night');
  } else if (G.screen === 'mines') {
    wanted.add('mine');
    const digging = f.dwarves.some((d) => d.job === 'miner' && !d.busy && !f.layers[d.layer].threat);
    if (digging && nowMs > nextPick) { nextPick = nowMs + 900 + Math.random() * 2200; A.sfx('pickaxe', { vol: 0.6 + Math.random() * 0.4 }); }
  }
  A.setLoops(wanted);
}

/** World point in the middle of what the player sees of the hold (left of an open drawer). */
function viewCenter() {
  const cam = camera(), r = $('scene-wrap').getBoundingClientRect();
  return { x: cam.x + freeWidth() / 2 / cam.zoom, y: cam.y + r.height / 2 / cam.zoom };
}

/** Width of the scene not covered by the drawer (desktop) . */
function freeWidth() {
  const r = $('scene-wrap').getBoundingClientRect(), p = $('panel');
  if (p.hidden || !wide()) return r.width;
  return Math.max(200, p.getBoundingClientRect().left - r.left);
}
const wide = () => window.matchMedia('(min-width: 900px)').matches;

function renderAudioBtn() {
  const s = A.state(), btn = $('audio-btn');
  if (!btn) return;
  btn.replaceChildren(img(S.icon(s.muted ? 'speaker_off' : s.playing ? 'note' : 'speaker'), 'icon s'),
    h('span', { class: 'audio-title' }, s.muted ? 'Muted' : s.playing ? A.trackTitle(s.current) : 'Music'));
  btn.title = s.muted ? 'Sound is off' : 'Music and sound';
}

bus.render = () => render();
bus.go = (tab) => go(tab);

async function poll() {
  if (!token() || document.hidden) return;
  try { setState(await api.get('/state')); } catch (e) { if (e.status === 401) logout(); }
}

function logout() {
  setToken(null);
  location.reload();
}

// ------------------------------------------------------------------ top bar

function renderTop() {
  const f = F(), d = D();
  $('hold-name').textContent = f.name + ' · Lv ' + f.level;
  const food = d.foodPerHour, ale = d.alePerHour;
  $('res').replaceChildren(
    money(f.coins, 'top'),
    h('span', { title: `Mushrooms (${food >= 0 ? '+' : ''}${food.toFixed(1)}/h)`, class: f.noFood ? 'bad-t' : '' }, img(S.raw('food'), 'icon s'), fmt(f.stock.food || 0), h('small', { class: food < 0 ? 'bad-t' : 'dim' }, food >= 0 ? '+' + food.toFixed(1) : food.toFixed(1))),
    h('span', { title: `Ale (${ale >= 0 ? '+' : ''}${ale.toFixed(1)}/h)`, class: f.noAle ? 'bad-t' : '' }, img(S.raw('ale'), 'icon s'), fmt(f.stock.ale || 0), h('small', { class: ale < 0 ? 'bad-t' : 'dim' }, ale >= 0 ? '+' + ale.toFixed(1) : ale.toFixed(1))),
    h('span', { title: 'Dwarves / beds' }, img(S.icon('dwarf'), 'icon s'), `${d.pop}/${d.beds}`),
    h('span', { title: 'Warehouse', class: f.storageFull ? 'bad-t' : '' }, img(S.icon('box'), 'icon s'), `${fmt(d.used)}/${fmt(d.capacity)}`));
}

function alerts() {
  const f = F(), d = D(), t = now();
  const a = [];
  if (f.siege) a.push(['bad', 'war', `Siege! ${f.siege.name} hold the gate. Workshops are shut.`]);
  if (f.raid) a.push(['bad', 'war', `${f.raid.name} (strength ${fmt(f.raid.power)}) arrive in ${dur(f.raid.arrivesAt - t)}. Gate: ${fmt(d.gatePower)}.`]);
  for (const th of f.threats) a.push(th.cell
    ? ['warn', 'war', `${th.name} in an overgrown cave on floor ${+th.cell.split(',')[1] + 1}. Send warriors or build there.`]
    : ['bad', 'war', `${th.name} in the ${G.data.layers[th.layer].name}! Mining stopped.`]);
  const still = f.buildings.filter((b) => d.buildings[b.id] && d.buildings[b.id].active === false);
  if (still.length) a.push(['stop', 'fortress', `${byId.buildings[still[0].type].name} stands still: build a hallway beside it.`, still[0].id]);
  const marks = (f.layout && f.layout.marks) || [];
  if (marks.length && !(d.dig && d.dig.miners)) a.push(['warn', 'dwarves', `${marks.length} cell(s) marked to dig, but no miners. Make a dwarf a miner.`]);
  if (f.noFood) a.push(['bad', 'work', 'No food! Dwarves are starving. Staff the mushroom farm or buy food.']);
  if (f.noAle) a.push(['warn', 'work', 'Out of ale. Dwarves are unhappy.']);
  if (f.storageFull) a.push(['stop', 'fortress', 'Warehouse full - mining stopped. Smelt, sell or upgrade it.', (f.buildings.find((b) => b.type === 'warehouse') || {}).id]);
  const quench = f.buildings.filter((b) => b.job && b.job.quenching);
  if (quench.length) a.push(['good', 'work', 'Hot metal ready to quench at the forge!', quench[0].id]);
  for (const r of f.reports || []) a.push(['good', r.kind === 'caravan' ? 'trade' : 'explore', `${r.title}: collect the loot.`]);
  const choices = f.expeditions.filter((e) => e.state === 'active' && e.stages[e.next] && e.stages[e.next].kind === 'choice' && !e.stages[e.next].chosen);
  if (choices.length) a.push(['warn', 'explore', `An expedition needs your decision.`]);
  const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy).length;
  const stuck = f.buildings.filter((b) => byId.buildings[b.type].kind === 'queue' && b.queue.length && roomStatus(b, idle) === 'stop' && d.buildings[b.id].active !== false);
  if (stuck.length) a.push(['stop', 'work', `${byId.buildings[stuck[0].type].name} stopped: its orders need materials or a worker.`, stuck[0].id]);
  if (idle) a.push(['idle', 'dwarves', `${idle} idle dwarf(s). Give them a job.`]);
  const empty = f.buildings.filter((b) => b.level > 0 && byId.buildings[b.type].kind !== 'passive' && !d.buildings[b.id].worker);
  if (empty.length && !idle) a.push(['idle', 'work', `${empty.length} workshop(s) without a worker.`, empty[0].id]);
  const news = unseenNotes();
  if (news) a.push(['good', 'more', `New in ${news.version}: ${news.title}. Open More to read.`]);
  if (d.traditionPoints > 0) a.push(['good', 'more', `${d.traditionPoints} tradition point(s) to spend.`]);
  return a;
}

function renderAlerts() {
  const list = alerts();
  const n = wide() ? 4 : 2;
  $('alerts').replaceChildren(...list.slice(0, n).map(([k, tab, text, room]) =>
    h('button', { class: 'alert ' + k, title: text, onclick: () => (room ? showRoom(room) : go(tab, true)) }, k === 'bad' ? img(S.icon('skull'), 'icon s') : statusIco(k, 'icon s'), h('span', null, text))),
    list.length > n ? h('button', { class: 'alert', onclick: () => go('fortress', true) }, h('span', null, `+${list.length - n} more`)) : '');
  // each tab wears the most pressing sign of its hints: stopped, then needs you, then done (idle shows nothing)
  const rank = { bad: 3, stop: 3, warn: 2, good: 1 };
  const best = new Map();
  for (const [k, tab] of list) if (rank[k] && rank[k] > (rank[best.get(tab)] || 0)) best.set(tab, k);
  document.querySelectorAll('.tab').forEach((el) => {
    const k = best.get(el.dataset.tab), old = el.querySelector('.badge');
    if (old && old.dataset.k === k) return;
    if (old) old.remove();
    if (k) { const b = statusIco(k, 'badge'); b.dataset.k = k; el.append(b); }
  });
}

bus.alerts = () => alerts();

// ------------------------------------------------------------------ tabs & panel

function buildTabs() {
  $('tabs').replaceChildren(...TABS.map(([id, label]) => h('button', { class: 'tab', 'data-tab': id, onclick: () => go(id) },
    img(S.icon(ICON[id]), ''), label)));
}

const MOOD = { mines: 'industry', work: 'industry', war: 'industry', trade: 'market' };

/**
 * Open a tab in the menu drawer. Pressing the open tab again closes the drawer. Only the Mines tab
 * changes the scene; everything else stays in the hold.
 */
function go(tab, keep = false) {
  if (tab === G.tab && !keep) return closeDrawer();
  if (tab !== G.tab) A.sfx('click');
  A.setMood(MOOD[tab] || 'chill');
  G.tab = tab;
  if (tab === 'mines') setScreen('mines');
  else if (G.screen === 'mines') setScreen('hold');
  if (tab !== 'mines') G.focus = null;
  if (tab === 'trade') loadMarket(true);
  if (popOpen()) closeSheet();
  render();
  scroller().scrollTop = 0;
}

const scroller = () => $('panel').querySelector('.panel-scroll') || $('panel');

function closeDrawer() {
  if (!G.tab) return;
  A.sfx('close');
  G.tab = null;
  render();
}

function setScreen(name) {
  G.screen = name;
  hidePlate();
  if (name !== 'hold') G.build = null;
  $('scene-wrap').classList.remove('scroll');
  renderToolbar();
}

let drawerOut = null;   // the drawer sliding back into the screen edge
const drawerSide = () => (wide() ? 'right' : 'bottom');

function render() {
  if (!G.state) return;
  document.querySelectorAll('.tab').forEach((el) => el.setAttribute('aria-current', el.dataset.tab === G.tab ? 'page' : 'false'));
  const p = $('panel');
  const tab = TABS.find((x) => x[0] === G.tab);
  $('scene-wrap').parentElement.classList.toggle('drawer', !!tab);
  if (!tab) {
    // slide the drawer back out of sight, then hide it
    if (!p.hidden && !drawerOut) {
      const out = drawerOut = slideOut(p, drawerSide());
      out.done.then((ok) => { if (drawerOut === out) drawerOut = null; if (ok && !G.tab) p.hidden = true; });
    }
    return;
  }
  if (drawerOut) { drawerOut.cancel(); drawerOut = null; }
  const fresh = p.hidden;
  const py = fresh ? 0 : scroller().scrollTop;
  setMaterial(p, MATERIAL[tab[0]]);
  const stores = storesView(false);
  const body = [tab[2]()].flat(3).filter(Boolean);
  const box = stores ? h('details', { class: 'panel-stores', open: G.storesOpen === true, ontoggle: (e) => { G.storesOpen = e.target.open; } }, h('summary', null, 'Stores'), stores) : null;
  p.replaceChildren(...frameDecor(),
    h('div', { class: 'panel-scroll' },
      h('div', { class: 'panel-head' },
        h('div', { class: 'plate' }, img(S.icon(ICON[tab[0]]), 'icon s'), h('h2', null, tab[1] === 'Hold' ? 'Your hold' : tab[1])),
        h('button', { class: 'icon-btn', 'aria-label': 'Close the menu', title: 'Close', onclick: closeDrawer })),
      ...(box ? [box] : []), ...body));
  p.hidden = false;
  scroller().scrollTop = py;
  if (fresh) slideIn(p, drawerSide());
}

/** Look at a room and open its window next to it. Used by the Work tab and by alerts. */
function showRoom(id) {
  const c = roomCenter(id);
  if (!c) return;
  if (!wide()) closeDrawer();
  if (G.screen !== 'hold') setScreen('hold');
  // leave space for the window: to the right on wide screens, below on phones
  if (wide()) lookAt(c.x, c.y, Math.max(300, freeWidth() - 400));
  else { camera().zoom = 1; lookAt(c.x, c.y, null, $('scene-wrap').getBoundingClientRect().height * 0.5); }
  const b = F().buildings.find((x) => x.id === id);
  requestAnimationFrame(() => { const r = roomRect(id); if (b && r) openRoomSheet(b, toScreen(r.x, r.y, r.w, r.h)); });
}
bus.showRoom = showRoom;
/** Show one mine layer in the mines screen (from the toolbar arrows or a layer card). */
function showLayer(i) {
  const n = G.data.layers.length;
  G.mineLayer = ((i % n) + n) % n;
  if (G.screen !== 'mines') { if (G.tab === 'mines') setScreen('mines'); else go('mines'); }
  homeCamera();
  renderToolbar();
  if (G.tab === 'mines') render();
}
bus.showLayer = showLayer;

function onPick(q, at) {
  if (!q) { if (popOpen()) closeSheet(); return; }
  if (q.kind === 'bellows') return pump(q.id);
  if (q.kind === 'quench') return bus.act({ type: 'quench', building: q.id, machine: q.machine || 0 });
  if (q.kind === 'room') {
    const b = F().buildings.find((x) => x.id === q.id);
    if (b) { A.sfx('open'); openRoomSheet(b, at); }
    return;
  }
  if (q.kind === 'dwarf') {
    const d = F().dwarves.find((x) => x.id === q.id);
    if (d) openDwarfSheet(d, at);
    return;
  }
  if (q.kind === 'layer') {
    G.focus = 'layer:' + q.id;
    G.mineLayer = q.id;
    if (G.tab !== 'mines') go('mines'); else render();
    const el = document.getElementById('layer-' + q.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  if (q.kind === 'tab') go(q.id, true);
}

// ------------------------------------------------------------------ toolbar over the hold

const TOOLS = [['move', 'hand', 'Move', 'Click a room, hallway or stairwell, then click where it should go. Only on dug-out ground. A room with no hallway beside it stands still.', 'move'],
  ['dig', 'dig', 'Dig out', 'Drag over rock to mark it. Your miners dig it out with their picks, one cell each. Deeper rock takes longer. Drag over marks to take them off.', null],
  ['hall', 'hall', 'Hallway', 'Drag over dug-out cells to build a hallway. Rooms need one beside them.', 'hall'],
  ['stairwell', 'well', 'Stairwell', 'Two dug-out cells side by side. Dwarves walk in and come out of any stairwell on another floor.', 'stairwell'],
  ['fill', 'fill', 'Fill in', 'Hallways and stairwells become empty caves, empty caves become rock. Empty caves overgrow, and critters move in.', null]];

function renderToolbar() {
  const bar = $('scene-tools');
  if (!bar) return;
  const onHold = G.screen === 'hold';
  bar.hidden = !G.state;
  const time = h('span', { class: 'clock', title: 'Time of day in Essen. Day and night follow it.' }, berlinTime() + ' · Essen');
  if (!onHold) {
    const i = mineLayer(), name = G.data.layers[i].name;
    bar.replaceChildren(h('div', { class: 'tool-row' },
      h('button', { class: 'tool', onclick: () => { if (G.tab === 'mines') go('mines'); else setScreen('hold'); } }, img(S.icon('fortress'), 'icon s'), 'Hold'),
      h('button', { class: 'tool', 'aria-label': 'Layer above', disabled: i === 0, onclick: () => showLayer(i - 1) }, img(S.icon('up'), 'icon s')),
      h('span', { class: 'tool-label' }, name),
      h('button', { class: 'tool', 'aria-label': 'Layer below', disabled: i === G.data.layers.length - 1, onclick: () => showLayer(i + 1) }, img(S.icon('down'), 'icon s')),
      wide() ? h('button', { class: 'tool', 'aria-label': 'Zoom in', onclick: () => zoomBy(1) }, img(S.icon('zoom_in'), 'icon s')) : null,
      wide() ? h('button', { class: 'tool', 'aria-label': 'Zoom out', onclick: () => zoomBy(-1) }, img(S.icon('zoom_out'), 'icon s')) : null));
    return;
  }
  const b = G.build;
  bar.replaceChildren(...[
    h('div', { class: 'tool-row' },
      h('button', { class: 'tool', 'aria-label': 'Zoom in', onclick: () => zoomBy(1) }, img(S.icon('zoom_in'), 'icon s')),
      h('button', { class: 'tool', 'aria-label': 'Zoom out', onclick: () => zoomBy(-1) }, img(S.icon('zoom_out'), 'icon s')),
      h('button', { class: 'tool' + (b ? ' on' : ''), onclick: () => { G.build = b ? null : { tool: 'move', held: null }; renderToolbar(); } }, img(S.icon('build'), 'icon s'), b ? 'Done' : 'Build'),
      time),
    b ? h('div', { class: 'tool-row' }, TOOLS.map(([id, icon, label]) => h('button', { class: 'tool' + (b.tool === id ? ' on' : ''), onclick: () => { b.tool = id; b.held = null; renderToolbar(); } }, img(S.icon(icon), 'icon s'), label))) : null,
    b ? toolCost(b) : null,
    b && G.state.cheats && b.tool === 'dig' && ((F().layout || {}).marks || []).length
      ? h('div', { class: 'tool-row' }, h('button', { class: 'tool', onclick: () => G.act({ type: 'cheatDig' }) }, img(S.icon('cheat'), 'icon s'), 'Dig now (cheat)')) : null,
    b && helpOn() ? h('div', { class: 'tool-hint' }, b.held ? 'Now click where the room should go. Right click or Esc to cancel.' : TOOLS.find((x) => x[0] === b.tool)[3]) : null].filter(Boolean));
}

/** What the chosen build tool costs per use (per cell for digging). */
function toolCost(b) {
  const key = TOOLS.find((x) => x[0] === b.tool)[4];
  const cost = key && (D().layoutCosts || {})[key];
  if (!cost) return null;
  return h('div', { class: 'tool-cost' }, h('span', null, b.tool === 'hall' ? 'Per cell' : 'Costs'), costChips(cost));
}

// ------------------------------------------------------------------ timers

function tick() {
  const t = now();
  document.querySelectorAll('[data-until]').forEach((el) => { el.textContent = dur(+el.dataset.until - t); });
  document.querySelectorAll('[data-hg-to]').forEach((el) => { const a = +el.dataset.hgFrom, b = +el.dataset.hgTo; setSand(el, b > a ? (t - a) / (b - a) : 1); });
  animateWork();
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ login

async function showLogin() {
  $('login').hidden = false;
  drawLoginArt($('login-art'));
  try { const i = await api.get('/auth/info'); $('invite-row').hidden = !i.inviteRequired; } catch { /* ignore */ }
  let mode = 'login';
  $('login-form').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; }));
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    $('login-error').textContent = '';
    try {
      const r = await api.post('/auth/' + mode, { name: fd.get('name'), password: fd.get('password'), invite: fd.get('invite') });
      setToken(r.token);
      $('login').hidden = true;
      await start();
    } catch (err) { $('login-error').textContent = err.message; }
  });
}

async function start() {
  G.me = await api.get('/me');
  setState(await api.get('/state'));
  $('app').hidden = false;
  document.documentElement.style.setProperty('--top-h', document.querySelector('.top').offsetHeight + 'px');
  initCanvas($('scene'), $('scene-wrap'), { hold: holdScreen, mines: mineScreen }, onPick);
  renderToolbar();
  setInterval(() => { if (G.screen !== 'hold' || !G.build) renderToolbar(); }, 30000);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (G.build) { G.build.held = null; renderToolbar(); } else closeDrawer();
  });
  setInterval(poll, 5000);
  setInterval(ambience, 1000);
  $('audio-btn').addEventListener('click', openAudioSheet);
  A.onChange(renderAudioBtn);
  renderAudioBtn();
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm' && !e.target.closest('input, select, textarea')) A.setMuted(!A.state().muted);
  });
  setInterval(() => { if (G.tab === 'trade') loadMarket(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  requestAnimationFrame(tick);
}

/** Hand the pixel-art button plates and the window X to the CSS as image variables. */
function artToCss() {
  const root = document.documentElement.style;
  const url = (name) => `url(${S.sprite(name).toDataURL()})`;
  for (const m of ['iron', 'gold', 'green', 'red']) {
    root.setProperty(`--plate-${m}`, url('btn_' + m));
    root.setProperty(`--plate-${m}-down`, url('btn_' + m + '_down'));
  }
  root.setProperty('--xbtn', url('ui_xbtn'));
  root.setProperty('--xbtn-down', url('ui_xbtn_down'));
}

async function boot() {
  try { await Promise.all(['16px "Germania One"', '500 16px "Alegreya Sans"', '800 16px "Alegreya Sans SC"'].map((f) => document.fonts.load(f))); } catch { /* fine */ }
  await Promise.all([S.loadArt(), loadArt48(), loadNotes()]);
  artToCss();
  const [data, sprites, audio] = await Promise.all([api.get('/data'), api.get('/sprites').catch(() => []), api.get('/audio').catch(() => ({}))]);
  A.initAudio(audio);
  G.data = data;
  indexData(data);
  await S.loadOverrides(sprites);
  buildTabs();
  if (!token()) return showLogin();
  try { await start(); } catch (e) {
    if (e.status === 401) { setToken(null); return showLogin(); }
    toast(e.message, 'bad');
  }
}

G.screen = 'hold';
G.tab = null;
G.heat = currentHeat;
G.act = (a) => bus.act(a).then(() => renderToolbar());
G.onBuildChange = () => renderToolbar();
window.__deepforge = { G, go, audio: A, lookAt, roomCenter, camera, showRoom, agents };
boot();
