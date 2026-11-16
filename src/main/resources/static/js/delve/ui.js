// The delve screen: the game canvas over the whole window, hearts, bombs, ropes and the ore bag on top, touch
// buttons on phones, keys on the desktop, a pause menu and the end of the run. Used by the hold (delve/run.js) and
// by the test page (delve.html).
//   const ui = openDelve({run: {seed, hearts, pick, damage}, data, look, startLayer, extra, onEnd(result) -> report})
import * as Art from '../art/scene.js';
import * as S from '../art/sprites.js';
import * as A from '../core/audio.js';
import { createGame } from './game.js';

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump', KeyX: 'pick', KeyJ: 'pick', KeyC: 'bomb', KeyB: 'bomb', KeyV: 'rope', KeyR: 'rope', KeyE: 'up', Enter: 'up',
};
export const HELP = [
  ['Move, climb', 'Arrows or WASD'], ['Jump', 'Space, Z or K'], ['Swing the pick', 'X or J (hold Down or Up to dig there)'],
  ['Bomb', 'C or B (Down: drop it)'], ['Rope', 'V or R'], ['Buy, go down, ride the lift', 'Up'], ['Pause', 'Esc'],
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
    <div class="dv-hud"><div class="dv-hearts"></div><div class="dv-kit"></div><div class="dv-bag"></div><div class="dv-where"></div>
      <button class="btn small dv-pause" aria-label="Pause">Pause</button></div>
    <div class="dv-pad">
      <div class="dv-move">
        <button class="btn dv-b" data-k="left" aria-label="Left"></button><button class="btn dv-b" data-k="right" aria-label="Right"></button>
        <button class="btn dv-b dv-up" data-k="up" aria-label="Up"></button><button class="btn dv-b dv-down" data-k="down" aria-label="Down"></button>
      </div>
      <div class="dv-act">
        <button class="btn dv-b" data-k="rope" aria-label="Rope"></button><button class="btn dv-b" data-k="bomb" aria-label="Bomb"></button>
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

  let report = null;
  const game = createGame(canvas, {
    seed: o.run.seed, hearts: o.run.hearts, pick: o.run.pick, damage: o.run.damage, look: o.look, data: o.data,
    startLayer: o.startLayer || 0, god: o.god, bombs: o.bombs, ropes: o.ropes,
    onHud: hud,
    onEnd: async (r) => {
      showEnd(r, null);
      try { report = o.onEnd ? await o.onEnd(r) : null; } catch (e) { report = { error: e.message || String(e) }; }
      showEnd(r, report);
    },
  });

  // ---------------------------------------------------------------- the HUD
  function hud(h) {
    const hearts = $('.dv-hearts');
    hearts.replaceChildren();
    for (let i = 0; i < Math.max(h.hearts, 0); i++) hearts.appendChild(pic(S.icon('heart'), 'heart'));
    if (h.hearts <= 0) hearts.appendChild(pic(S.icon('skull'), 'skull'));
    const kit = $('.dv-kit');
    kit.replaceChildren(pic(Art.frame('delve_bomb', 0).canvas, 'bomb'), num(h.bombs), pic(Art.frame('delve_ropes', 0).canvas, 'ropes'), num(h.ropes));
    const bag = $('.dv-bag');
    bag.replaceChildren();
    const ores = Object.entries(h.bag);
    if (!ores.length) bag.appendChild(Object.assign(document.createElement('span'), { className: 'dv-dim', textContent: 'No ore yet' }));
    for (const [k, n] of ores) { bag.appendChild(pic(S.ore(k), 'ore' + k)); bag.appendChild(num(n)); }
    $('.dv-where').textContent = `${h.layerName} ${h.depth + 1}-${h.levels}`;
  }
  const num = (n) => Object.assign(document.createElement('span'), { className: 'dv-n', textContent: n });

  // ---------------------------------------------------------------- input
  const down = (k) => game.press(k), up = (k) => game.release(k);
  const onKey = (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') { if (e.type === 'keydown') togglePause(); e.preventDefault(); return; }
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

  // ---------------------------------------------------------------- pause and the end
  const menu = $('.dv-menu');
  function togglePause() {
    if (game.G.over) return;
    const on = menu.hidden;
    game.pause(on);
    menu.hidden = !on;
    if (!on) return;
    menu.innerHTML = `<div class="dv-card"><h2>Paused</h2>
      <table class="dv-keys">${HELP.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      <p class="dv-dim">Find ore in the veins and climb out by the lift at the end of a layer. If you fall, everything you found is lost.</p>
      <div class="dv-row"><button class="btn primary" data-a="resume">Resume</button><button class="btn danger" data-a="quit">Give up</button></div></div>`;
    menu.querySelector('[data-a=resume]').onclick = () => togglePause();
    menu.querySelector('[data-a=quit]').onclick = () => { menu.hidden = true; game.pause(false); game.giveUp(); };
  }
  function showEnd(r, rep) {
    menu.hidden = false;
    const found = Object.entries(r.result === 'exit' ? r.ore : r.found);
    const title = r.result === 'exit' ? 'Back in the light' : r.result === 'dead' ? 'Carried out of the mine' : 'Turned back';
    const line = r.result === 'exit' ? `${r.levels} ${r.levels === 1 ? 'level' : 'levels'} deep.`
      : r.result === 'dead' ? 'Badly hurt. Everything found is lost.' : 'Nothing found is kept.';
    menu.innerHTML = `<div class="dv-card"><h2>${title}</h2><p>${line}</p><div class="dv-loot"></div>
      <p class="dv-dim dv-rep">${rep === null ? 'Reporting to the hold…' : rep && rep.error ? rep.error : rep && rep.text ? rep.text : ''}</p>
      <div class="dv-row">${o.again ? '<button class="btn" data-a="again">Again</button>' : ''}<button class="btn primary" data-a="close">${o.closeLabel || 'Back to the mine'}</button></div></div>`;
    const loot = menu.querySelector('.dv-loot');
    for (const [k, n] of found) { const s = document.createElement('span'); s.className = r.result === 'exit' ? 'dv-got' : 'dv-lost'; s.append(pic(S.ore(k), 'ore' + k), num(n)); loot.appendChild(s); }
    menu.querySelector('[data-a=close]').onclick = () => close();
    const again = menu.querySelector('[data-a=again]');
    if (again) again.onclick = () => { close(); o.again(); };
  }
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
