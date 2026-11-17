// The delve screen: the game canvas over the whole window, hearts, bombs, ropes and the ore bag on top, touch
// buttons on phones, keys on the desktop, a pause menu and the end of the run. Used by the hold (delve/run.js) and
// by the test page (delve.html).
//   const ui = openDelve({run: {seed, hearts, pick, damage}, data, look, startLayer, extra, onEnd(result) -> report})
import * as Art from '../art/scene.js';
import * as S from '../art/sprites.js';
import * as A from '../core/audio.js';
import { createGame } from './game.js';
import { ITEMS, SCROLLS, lootIcon } from './loot.js';

// few keys: WASD to move, Space to jump, two keys for every action (left hand or right hand)
const KEYS = {
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', Space: 'jump',
  KeyE: 'pick', KeyK: 'pick', KeyQ: 'bomb', KeyJ: 'bomb', KeyL: 'scroll', KeyR: 'scroll',
};
export const HELP = [
  ['Move, climb, go in', 'W A S D'], ['Jump', 'Space'], ['Swing the pick', 'E or K (hold W or S to dig up or down)'],
  ['Bomb', 'Q or J (hold S: drop it)'], ['Rope', 'W + Q (or W + J)'], ['Magic', 'L or R'], ['Your pack: what goes home', 'I'], ['Pause', 'Esc'],
];

const url = new Map();
function src(canvas, key) { if (!url.has(key)) url.set(key, canvas.toDataURL()); return url.get(key); }
function pic(canvas, key, cls = 'dv-ico') { const i = document.createElement('img'); i.src = src(canvas, key); i.className = cls; i.alt = ''; return i; }
/** A drawn arrow for the touch pad (no font glyphs as symbols). */
function arrow(dir) {
  const c = S.mk(9, 9), g = c.getContext('2d');
  g.fillStyle = '#ece6da';
  for (let i = 0; i < 5; i++) {
    const a = 4 - i, len = 1 + 2 * i;
    if (dir === 'up') g.fillRect(4 - i, 2 + i, len, 1);
    else if (dir === 'down') g.fillRect(4 - i, 6 - i, len, 1);
    else if (dir === 'left') g.fillRect(2 + i, 4 - i, 1, len);
    else g.fillRect(6 - i, 4 - i, 1, len);
    void a;
  }
  return c;
}
/** The button plates of the game as CSS variables (main.js does this for the hold; the test page has no main.js). */
export function plates() {
  const root = document.documentElement.style;
  if (root.getPropertyValue('--plate-iron')) return;
  const u = (name) => `url(${S.sprite(name).toDataURL()})`;
  for (const m of ['iron', 'gold', 'green', 'red']) { root.setProperty(`--plate-${m}`, u('btn_' + m)); root.setProperty(`--plate-${m}-down`, u('btn_' + m + '_down')); }
  root.setProperty('--xbtn', u('ui_xbtn')); root.setProperty('--xbtn-down', u('ui_xbtn_down'));
}

export function openDelve(o) {
  plates();
  const el = document.createElement('div');
  el.className = 'delve';
  el.innerHTML = `
    <canvas class="dv-canvas"></canvas>
    <div class="dv-hud"><div class="dv-who"><span class="dv-name"></span><div class="dv-hearts"></div></div><div class="dv-kit"></div>
      <button class="dv-pack dv-home" aria-label="Your pack: what goes home"><span class="dv-tag"></span><span class="dv-bag"></span></button>
      <button class="dv-pack dv-cave" aria-label="Your pack: what stays in the cave"><span class="dv-tag">Cave only</span><span class="dv-finds"></span></button>
      <div class="dv-where"></div>
      <button class="btn small dv-pause" aria-label="Pause">Pause</button></div>
    <div class="dv-pad">
      <div class="dv-move">
        <button class="btn dv-b" data-k="left" aria-label="Left"></button><button class="btn dv-b" data-k="right" aria-label="Right"></button>
        <button class="btn dv-b dv-up" data-k="up" aria-label="Up"></button><button class="btn dv-b dv-down" data-k="down" aria-label="Down"></button>
      </div>
      <div class="dv-act">
        <button class="btn dv-b" data-k="scroll" aria-label="Read a scroll"></button><button class="btn dv-b" data-k="rope" aria-label="Rope"></button><button class="btn dv-b" data-k="bomb" aria-label="Bomb"></button>
        <button class="btn dv-b" data-k="pick" aria-label="Pick"></button><button class="btn dv-b primary dv-jump" data-k="jump">Jump</button>
      </div>
    </div>
    <div class="dv-menu" hidden></div>`;
  document.body.appendChild(el);
  const $ = (q) => el.querySelector(q);
  const canvas = $('.dv-canvas');
  for (const d of ['left', 'right', 'up', 'down']) el.querySelector(`[data-k=${d}]`).appendChild(pic(arrow(d), 'arrow' + d, 'dv-arrow'));
  el.querySelector('[data-k=rope]').appendChild(pic(Art.frame('delve_ropes', 0).canvas, 'ropes', 'dv-bico'));
  el.querySelector('[data-k=bomb]').appendChild(pic(Art.frame('delve_bomb', 0).canvas, 'bomb', 'dv-bico'));
  el.querySelector('[data-k=pick]').appendChild(pic(S.item('pickaxe', 'iron'), 'pick', 'dv-bico'));
  el.querySelector('[data-k=scroll]').appendChild(pic(lootIcon('scroll', 'light'), 'scrollbtn', 'dv-bico'));
  const touch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 760;
  const name = o.name || 'Your dwarf';
  const oreName = {};
  for (const x of o.data.ores || []) oreName[x.id] = x.name;
  $('.dv-name').textContent = name;
  $('.dv-home .dv-tag').textContent = o.training ? 'Training' : 'Take home';
  if (o.training) $('.dv-home').classList.add('dv-off');
  let lastH = null;

  let report = null;
  const game = createGame(canvas, {
    seed: o.run.seed, hearts: o.run.hearts, pick: o.run.pick, damage: o.run.damage, look: o.look, data: o.data,
    gems: o.run.gems, relic: o.run.relic && o.run.relicLevel >= 0 ? { level: o.run.relicLevel, id: o.run.relic } : null,
    startLayer: o.startLayer || 0, god: o.god, bright: o.bright, training: o.training, bombs: o.bombs, ropes: o.ropes, touch,
    onHud: hud,
    onEnd: async (r) => {
      showEnd(r, null);
      try { report = o.onEnd ? await o.onEnd(r) : null; } catch (e) { report = { error: e.message || String(e) }; }
      showEnd(r, report);
    },
  });

  // ---------------------------------------------------------------- the HUD
  function hud(h) {
    lastH = h;
    const hearts = $('.dv-hearts');
    hearts.replaceChildren();
    for (let i = 0; i < Math.max(h.hearts, 0); i++) hearts.appendChild(pic(S.icon('heart'), 'heart'));
    if (h.hearts <= 0) hearts.appendChild(pic(S.icon('skull'), 'skull'));
    const kit = $('.dv-kit');
    kit.replaceChildren(pic(Art.frame('delve_bomb', 0).canvas, 'bomb'), num(h.bombs), pic(Art.frame('delve_ropes', 0).canvas, 'ropes'), num(h.ropes));
    h.scrolls.forEach((id, i) => {                   // scrolls, the next one to read first
      const p = pic(lootIcon('scroll', id), 'scroll' + id, i ? 'dv-ico dv-later' : 'dv-ico dv-next'); p.title = `${SCROLLS[id].name}: ${SCROLLS[id].text}`;
      kit.appendChild(p);
    });
    // what stays in the cave: coins and the finds (copies as a number)
    const finds = $('.dv-finds');
    finds.replaceChildren(pic(lootIcon('coin', 0), 'coin'), num(h.coins));
    for (const [id, n] of Object.entries(h.items)) {
      const p = pic(lootIcon('item', id), 'find' + id); p.title = `${ITEMS[id].name}: ${ITEMS[id].text}`;
      finds.appendChild(p); if (n > 1) finds.appendChild(num(n));
    }
    const sb = el.querySelector('[data-k=scroll]');
    sb.disabled = !h.scrolls.length;
    sb.querySelector('img').src = src(lootIcon('scroll', h.scrolls[0] || 'light'), 'scrollbtn' + (h.scrolls[0] || 'light'));
    const bag = $('.dv-bag');
    bag.replaceChildren();
    const ores = Object.entries(h.bag), gems = Object.entries(h.gems || {});
    if (!ores.length && !gems.length && !h.relic) bag.appendChild(Object.assign(document.createElement('span'), { className: 'dv-dim', textContent: 'No ore' }));
    for (const [k, n] of ores) { bag.appendChild(pic(S.ore(k), 'ore' + k)); bag.appendChild(num(n)); }
    for (const [k, n] of gems) { bag.appendChild(pic(S.good('rough:' + k), 'gem' + k)); bag.appendChild(num(n)); }
    if (h.relic) bag.appendChild(pic(S.good('relic:any'), 'relic'));
    $('.dv-where').textContent = `${o.training ? 'Training: ' : ''}${h.layerName} ${h.depth + 1}-${h.levels}`;
  }
  const num = (n) => Object.assign(document.createElement('span'), { className: 'dv-n', textContent: n });

  // ---------------------------------------------------------------- input
  const down = (k) => game.press(k), up = (k) => game.release(k);
  const onKey = (e) => {
    if (e.code === 'Escape') { if (e.type === 'keydown') togglePause(); e.preventDefault(); return; }
    if (e.code === 'KeyI') { if (e.type === 'keydown' && !e.repeat) togglePack(); e.preventDefault(); return; }
    const k = KEYS[e.code];
    if (!k || e.target.closest && e.target.closest('input, select, textarea')) return;
    e.preventDefault();
    if (e.type === 'keydown') { if (!e.repeat) down(k); } else up(k);
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  const blur = () => { for (const k of Object.keys(game.input)) game.input[k] = false; };
  window.addEventListener('blur', blur);
  // touch: each finger holds the button it lands on, and may slide to a neighbour (left <-> right, jump <-> pick)
  const fingers = new Map();
  const keyAt = (x, y) => { const b = document.elementFromPoint(x, y); const k = b && b.closest('.dv-b'); return k ? k.dataset.k : null; };
  const setFinger = (id, k) => {
    const old = fingers.get(id);
    if (old === k) return;
    if (old) { up(old); el.querySelector(`[data-k=${old}]`).classList.remove('pressed'); }
    if (k) { down(k); el.querySelector(`[data-k=${k}]`).classList.add('pressed'); fingers.set(id, k); } else fingers.delete(id);
  };
  const pad = $('.dv-pad');
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); pad.setPointerCapture?.(e.pointerId); setFinger(e.pointerId, keyAt(e.clientX, e.clientY)); });
  pad.addEventListener('pointermove', (e) => { if (fingers.has(e.pointerId)) setFinger(e.pointerId, keyAt(e.clientX, e.clientY)); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(t, (e) => setFinger(e.pointerId, null));
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
  $('.dv-pause').addEventListener('click', () => togglePause());
  for (const b of el.querySelectorAll('.dv-pack')) b.addEventListener('click', () => togglePack());

  // ---------------------------------------------------------------- pause, the pack and the end
  const menu = $('.dv-menu');
  let mode = null;                                    // 'pause' | 'pack' | 'end'
  function closeMenu() { menu.hidden = true; mode = null; game.pause(false); }
  function openMenu(m, html) { mode = m; game.pause(true); menu.hidden = false; menu.innerHTML = html; }
  function togglePause() {
    if (game.G.over) return;
    if (mode) { closeMenu(); return; }
    openMenu('pause', `<div class="dv-card"><h2>Paused</h2>
      <table class="dv-keys">${HELP.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      <p class="dv-dim">Find ore in the veins and climb out by the lift at the end of a layer. Ore, rough gems and relics go home: coins, finds and scrolls stay in the cave. In the shop one ore counts as 5 coins.</p>
      <div class="dv-row"><button class="btn" data-a="pack">Your pack</button><button class="btn danger" data-a="quit">Give up</button><button class="btn primary" data-a="resume">Resume</button></div></div>`);
    menu.querySelector('[data-a=resume]').onclick = () => closeMenu();
    menu.querySelector('[data-a=pack]').onclick = () => { closeMenu(); togglePack(); };
    menu.querySelector('[data-a=quit]').onclick = () => { closeMenu(); game.giveUp(); };
  }
  // one line of the pack: picture, name, number, what it does
  const line = (img, key, title, n, text) => `<li><img class="dv-ico" src="${src(img, key)}" alt=""><span><span class="dv-li-t">${title}</span>${n != null ? ` <span class="dv-n">${n}</span>` : ''}${text ? `<br><span class="dv-dim">${text}</span>` : ''}</span></li>`;
  const st = (k) => `<img class="dv-st" src="${src(S.icon(k), 'st' + k)}" alt="">`;
  // gems: kind -> n; relic: its hint ("a helm-shaped lump"), true, or nothing
  function homeList(bag, gems, relic, lost) {
    const out = Object.entries(bag).map(([k, n]) => line(S.ore(k), 'ore' + k, oreName[k] || k, n));
    for (const [k, n] of Object.entries(gems || {})) out.push(line(S.good('rough:' + k), 'gem' + k, gemName(k), n, lost ? '' : 'The jeweler cuts it at home.'));
    if (relic) out.push(line(S.good('relic:any'), 'relic', 'Crusted relic', null, typeof relic === 'string' ? `${relic[0].toUpperCase() + relic.slice(1)}. ${lost ? '' : 'The antiquarium finds out what it is.'}` : ''));
    if (!out.length) return `<p class="dv-dim">${lost ? 'Nothing.' : 'No ore yet. Break the glinting veins with your pick.'}</p>`;
    return `<ul class="dv-list${lost ? ' dv-lost' : ''}">${out.join('')}</ul>`;
  }
  const gemName = (k) => { const g = ((o.data.gems && o.data.gems.kinds) || []).find((x) => x.id === k); return 'Rough ' + (g ? g.name.toLowerCase() : 'gem'); };
  function caveList(c) {
    const out = [line(lootIcon('coin', 0), 'coin', 'Cave coins', c.coins, 'Pay the shop down here.')];
    if (c.bombs != null) out.push(line(Art.frame('delve_bomb', 0).canvas, 'bomb', 'Bombs', c.bombs), line(Art.frame('delve_ropes', 0).canvas, 'ropes', 'Ropes', c.ropes));
    for (const [id, n] of Object.entries(c.items)) out.push(line(lootIcon('item', id), 'find' + id, ITEMS[id].name, n > 1 ? n : null, ITEMS[id].text));
    for (const id of c.scrolls) out.push(line(lootIcon('scroll', id), 'scroll' + id, SCROLLS[id].name, null, SCROLLS[id].text));
    return `<ul class="dv-list">${out.join('')}</ul>`;
  }
  function togglePack() {
    if (game.G.over || mode === 'end') return;
    if (mode === 'pack') { closeMenu(); return; }
    const h = lastH || { bag: {}, coins: 0, items: {}, scrolls: [], bombs: 0, ropes: 0 };
    openMenu('pack', `<div class="dv-card"><h2>${esc(name)}'s pack</h2>
      <section class="dv-sec dv-sec-home${o.training ? ' dv-off' : ''}"><h3>${st(o.training ? 'warn' : 'good')}${o.training ? 'Training: nothing goes home' : 'Goes home'}</h3>
        <p class="dv-dim">${o.training ? 'This is only practice. Nothing found here is kept.' : 'Ride the lift up and this goes to the stores of the hold. Fall, and it is lost.'}</p>
        ${homeList(h.bag, h.gems, h.relic, false)}</section>
      <section class="dv-sec dv-sec-cave"><h3>${st('idle')}Stays in the cave</h3>
        <p class="dv-dim">Yours only for this run. Gone when you leave the mine.</p>
        ${caveList(h)}</section>
      <div class="dv-row"><button class="btn primary" data-a="resume">Back to the cave</button></div></div>`);
    menu.querySelector('[data-a=resume]').onclick = () => closeMenu();
  }
  function showEnd(r, rep) {
    mode = 'end'; menu.hidden = false;
    const home = r.result === 'exit' && !o.training;
    const title = o.training ? 'Training over' : r.result === 'exit' ? `${esc(name)} is back in the light` : r.result === 'dead' ? `${esc(name)} was carried out` : 'Turned back';
    const deep = `${r.levels} ${r.levels === 1 ? 'level' : 'levels'} deep.`;
    const lead = o.training ? `${deep} Nothing is kept.` : r.result === 'exit' ? deep : r.result === 'dead' ? 'Badly hurt. Everything found is lost.' : 'Nothing found is kept.';
    const bag = r.result === 'exit' ? r.ore : r.found;
    const gems = r.foundGems, relic = r.foundRelic && (lastH && lastH.relic || true);
    menu.innerHTML = `<div class="dv-card"><h2>${title}</h2><p>${lead}</p>
      <section class="dv-sec dv-sec-home${home ? '' : ' dv-off'}"><h3>${st(home ? 'good' : 'stop')}${home ? 'Brought home' : 'Lost'}</h3>${homeList(bag, gems, relic, !home)}</section>
      <section class="dv-sec dv-sec-cave"><h3>${st('idle')}Left in the cave</h3>${r.cave ? caveList({ ...r.cave, bombs: null }) : ''}</section>
      <p class="dv-dim dv-rep">${rep === null ? 'Reporting to the hold…' : rep && rep.error ? esc(rep.error) : rep && rep.text ? esc(rep.text) : ''}</p>
      <div class="dv-row">${o.again ? '<button class="btn" data-a="again">Again</button>' : ''}<button class="btn primary" data-a="close">${o.closeLabel || 'Back to the mine'}</button></div></div>`;
    menu.querySelector('[data-a=close]').onclick = () => close();
    const again = menu.querySelector('[data-a=again]');
    if (again) again.onclick = () => { close(); o.again(); };
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function close() {
    game.stop();
    window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', blur);
    el.remove();
    A.setLoops(new Set());
    o.onClose && o.onClose();
  }
  A.setLoops(new Set(['mine']));
  game.start();
  return { game, close, el };
}
