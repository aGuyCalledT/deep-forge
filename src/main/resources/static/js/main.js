// Boot, login, tabs, polling and the global animation loop.
import { api, token, setToken } from './api.js';
import { G, F, D, indexData, byId, fmt, dur, now, ago } from './data.js';
import { h, img, bus, toast, storesView } from './ui.js';
import * as S from './sprites.js';
import { initScene, reveal, drawLoginArt } from './scene.js';
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
  if (G.screen === 'workshop') {
    const b = f.buildings.find((x) => x.id === G.ws);
    const working = b && (b.job && !b.job.quenching || (byId.buildings[b.type].kind === 'continuous' && D().buildings[b.id] && D().buildings[b.id].worker)) && !f.siege;
    if (b && working) {
      if (b.type === 'forge') wanted.add('forge');
      if (b.type === 'smelter') wanted.add('furnace');
      if (b.type === 'grindstone') wanted.add('grindstone');
      if (b.type === 'brewery') wanted.add('brewing');
    }
    if (b && b.type === 'farm' && nowMs > nextMoo) { nextMoo = nowMs + 45000 + Math.random() * 90000; if (Math.random() < 0.5) A.sfx('moo'); }
  } else if (G.screen === 'mines') {
    wanted.add('mine');
    const digging = f.dwarves.some((d) => d.job === 'miner' && !d.busy && !f.layers[d.layer].threat);
    if (digging && nowMs > nextPick) { nextPick = nowMs + 900 + Math.random() * 2200; A.sfx('pickaxe', { vol: 0.6 + Math.random() * 0.4 }); }
  } else {
    wanted.add('tavern');
    const hr = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Berlin' }).format(new Date()));
    if (hr >= 21 || hr < 6) wanted.add('night');
  }
  A.setLoops(wanted);
}

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
    h('span', { title: 'Coins' }, img(S.coin(), 'icon s'), fmt(f.coins)),
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
  for (const th of f.threats) a.push(['bad', 'war', `${th.name} in the ${G.data.layers[th.layer].name}! Mining stopped.`]);
  if (f.noFood) a.push(['bad', 'work', 'No food! Dwarves are starving. Staff the mushroom farm or buy food.']);
  if (f.noAle) a.push(['warn', 'work', 'Out of ale. Dwarves are unhappy.']);
  if (f.storageFull) a.push(['warn', 'fortress', 'Warehouse full - mining stopped.']);
  const quench = f.buildings.filter((b) => b.job && b.job.quenching);
  if (quench.length) a.push(['good', 'work', 'Hot metal ready to quench at the forge!']);
  const choices = f.expeditions.filter((e) => e.state === 'active' && e.stages[e.next] && e.stages[e.next].kind === 'choice' && !e.stages[e.next].chosen);
  if (choices.length) a.push(['good', 'explore', `An expedition needs your decision.`]);
  const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy).length;
  if (idle) a.push(['warn', 'dwarves', `${idle} idle dwarf(s).`]);
  const empty = f.buildings.filter((b) => b.level > 0 && byId.buildings[b.type].kind !== 'passive' && !d.buildings[b.id].worker);
  if (empty.length && !idle) a.push(['warn', 'work', `${empty.length} workshop(s) without a worker.`]);
  if (d.traditionPoints > 0) a.push(['good', 'more', `${d.traditionPoints} tradition point(s) to spend.`]);
  return a;
}

function renderAlerts() {
  const list = alerts();
  renderSide(list);
  $('alerts').replaceChildren(...list.slice(0, 3).map(([k, tab, text]) =>
    h('div', { class: 'alert ' + k, onclick: () => go(tab) }, img(S.icon(k === 'bad' ? 'skull' : 'warn'), 'icon s'), text)));
  const hot = new Set(list.filter(([k]) => k !== 'warn').map(([, tab]) => tab));
  document.querySelectorAll('.tab').forEach((el) => {
    const dot = el.querySelector('.dot');
    if (hot.has(el.dataset.tab) && !dot) el.append(h('span', { class: 'dot' }));
    if (!hot.has(el.dataset.tab) && dot) dot.remove();
  });
}

// ------------------------------------------------------------------ desktop sidebar

function renderSide(list = alerts()) {
  const side = $('side');
  if (!side || !G.state) return;
  const f = F();
  side.replaceChildren(
    h('section', { class: 'side-block' }, h('h3', null, 'Stores'), storesView(false)),
    h('section', { class: 'side-block' }, h('h3', null, 'Needs attention'),
      list.length ? list.map(([k, tab, text]) => h('button', { class: 'alert ' + k, onclick: () => go(tab) }, img(S.icon(k === 'bad' ? 'skull' : 'warn'), 'icon s'), h('span', null, text)))
        : h('p', { class: 'small dim' }, 'All is well in the hold.')),
    h('section', { class: 'side-block' }, h('h3', null, 'Chronicle'),
      f.log.slice(-8).reverse().map((l) => h('div', { class: 'log-line ' + l.kind }, h('span', { class: 't' }, ago(l.t)), l.text))));
}

// ------------------------------------------------------------------ tabs & panel

function buildTabs() {
  $('tabs').replaceChildren(...TABS.map(([id, label]) => h('button', { class: 'tab', 'data-tab': id, onclick: () => go(id) },
    img(S.icon(ICON[id]), ''), label)));
}

const SCREEN = { mines: 'mines', work: 'workshop' };
const MOOD = { mines: 'industry', work: 'industry', war: 'industry', trade: 'market' };

function go(tab) {
  if (tab !== G.tab) A.sfx('click');
  A.setMood(MOOD[tab] || 'chill');
  G.tab = tab;
  G.screen = SCREEN[tab] || 'hold';
  if (tab !== 'mines') G.focus = null;
  if (tab === 'trade') loadMarket(true);
  render();
  const p = $('panel');
  if (window.matchMedia('(min-width: 900px)').matches) p.scrollTop = 0;
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
  if (!G.state) return;
  document.querySelectorAll('.tab').forEach((el) => el.setAttribute('aria-current', el.dataset.tab === G.tab ? 'page' : 'false'));
  const tab = TABS.find((x) => x[0] === G.tab) || TABS[0];
  const p = $('panel');
  const y = window.scrollY, py = p.scrollTop;
  const stores = storesView(false);
  const body = [tab[2]()].flat(3).filter(Boolean);
  const box = stores ? h('details', { class: 'panel-stores', open: G.storesOpen !== false, ontoggle: (e) => { G.storesOpen = e.target.open; } }, h('summary', null, 'Stores'), stores) : null;
  // the workshop picker stays on top, the stores follow it
  const at = body.findIndex((n) => n.classList && n.classList.contains('ws-tabs'));
  if (box) body.splice(at >= 0 ? at + 1 : 0, 0, box);
  p.replaceChildren(h('h2', { style: { marginTop: 0 } }, tab[1] === 'Hold' ? 'Your hold' : tab[1]), ...body);
  renderSide();
  window.scrollTo(0, y);
  p.scrollTop = py;
}

function onPick(q) {
  if (q.kind === 'bellows') return pump(q.id);
  if (q.kind === 'quench') return bus.act({ type: 'quench', building: q.id });
  if (q.kind === 'building') {
    const b = F().buildings.find((x) => x.id === q.id);
    if (q.id === 'lift') return go('mines');
    if (b && byId.buildings[b.type].kind !== 'passive') { G.ws = b.id; return go('work'); }
    return go('fortress');
  }
  if (q.kind === 'layer') {
    G.focus = 'layer:' + q.id;
    go('mines');
    const el = document.getElementById('layer-' + q.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  if (q.kind === 'tab') go(q.id);
}

// ------------------------------------------------------------------ timers

function tick() {
  const t = now();
  document.querySelectorAll('[data-until]').forEach((el) => { el.textContent = dur(+el.dataset.until - t); });
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
  initScene($('scene'), $('scene-wrap'), onPick);
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

async function boot() {
  try { await document.fonts.load('8px Silkscreen'); } catch { /* fine */ }
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
G.heat = currentHeat;
window.__deepforge = { G, go, reveal, audio: A };
boot();
