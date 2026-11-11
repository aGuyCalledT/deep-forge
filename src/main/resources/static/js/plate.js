// The small forged plate that drops out of a room's ceiling on two chains while the mouse is over the room, and
// pulls back up when it leaves. Only on devices with a real mouse; a tap opens the room's window instead.
import { G, F, D, byId, now, dur, buildingName } from './data.js';
import { h, frameDecor, setMaterial } from './ui.js';
import { toScreen } from './canvas.js';

const WIDTH = 232;
const CEILING = 11;          // world pixels from the top of a room to the underside of its lintel
let el = null, shown = null, leaving = null;

/** The metal of a room's plate: what the room is for. */
export function roomMaterial(type) {
  if (['barracks', 'gate', 'entrance_hall'].includes(type)) return 'war';
  if (['warehouse', 'vault', 'trade_depot'].includes(type)) return 'trade';
  if (['quarters', 'tavern', 'farm', 'brewery'].includes(type)) return 'dwarf';
  if (type === 'expedition_hall') return 'lore';
  return 'forge';
}

const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Called every frame by the hold with what the mouse is over. rect is the room in world pixels.
 * Nothing shows in build mode or while the room's own window is open.
 */
export function roomPlate(hover) {
  const id = hover && hover.kind === 'room' && !G.build && canHover() && !(G.ws === hover.id && document.querySelector('.sheet.pop:not([hidden])')) ? hover.id : null;
  if (!id) { if (shown) retract(); return; }
  const b = F().buildings.find((x) => x.id === id);
  if (!b) { retract(); return; }
  const [x, y, w] = hover.rect;
  const p = toScreen(x, y + CEILING, w, 1);
  if (shown !== id) drop(b);
  else el.querySelector('.stats').replaceChildren(...stats(b));
  place(p);
}

export function hidePlate() {
  if (el) el.remove();
  el = null; shown = null; leaving = null;
}

function place(p) {
  const wrap = document.getElementById('scene-wrap').getBoundingClientRect();
  const r = p.rect;
  const left = Math.round(r.x - wrap.left + r.w / 2 - WIDTH / 2);
  el.style.left = Math.max(4, Math.min(wrap.width - WIDTH - 4, left)) + 'px';
  el.style.top = Math.round(r.y - wrap.top) + 'px';
}

function drop(b) {
  if (leaving) { leaving.cancel(); leaving = null; }
  if (el) el.remove();
  const win = h('div', { class: 'win' },
    h('span', { class: 'chain l' }), h('span', { class: 'chain r' }),
    ...frameDecor(false),
    h('div', { class: 'plate' }, h('span', { style: { flex: 1 } }, buildingName(b)), b.level > 0 ? h('small', null, 'Lv ' + b.level) : null),
    h('div', { class: 'stats' }, ...stats(b)));
  setMaterial(win, roomMaterial(b.type));
  el = h('div', { class: 'hang', style: { width: WIDTH + 'px' }, 'aria-hidden': 'true' }, h('span', { class: 'slot' }), win);
  document.getElementById('scene-wrap').append(el);
  shown = b.id;
  if (!reduced()) win.animate([
    { transform: 'translateY(-110%)' },
    { transform: 'translateY(6%)', offset: 0.55 },
    { transform: 'translateY(-2%)', offset: 0.72 },
    { transform: 'translateY(1%)', offset: 0.86 },
    { transform: 'none' },
  ], { duration: 560, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
}

function retract() {
  if (!el || leaving) return;
  const old = el, win = el.querySelector('.win');
  shown = null;
  if (reduced()) { old.remove(); el = null; return; }
  const a = win.animate([{ transform: 'none' }, { transform: 'translateY(3%)', offset: 0.2 }, { transform: 'translateY(-115%)' }],
    { duration: 300, easing: 'cubic-bezier(0.55, 0, 0.8, 0.35)', fill: 'forwards' });
  leaving = { cancel() { a.cancel(); } };
  a.finished.then(() => { old.remove(); if (el === old) el = null; leaving = null; }, () => {});
}

/** One or two short lines: what the room is doing and who works there. */
function stats(b) {
  const t = byId.buildings[b.type], info = D().buildings[b.id] || {};
  const line = (k, v, cls = '') => h('div', { class: 'stat ' + cls }, h('span', null, k), v != null ? h('span', { class: 'v' }, v) : null);
  if (b.level <= 0) return [line('Not built yet', null, 'dim')];
  if (info.active === false) return [line('Stands still', null, 'bad-t'), line('Build a hallway beside it', null, 'dim')];
  if (t.kind === 'passive') return [line('Level ' + b.level, null, 'dim')];
  const out = [];
  const name = (info.jobNames || []).find(Boolean) || info.jobName;
  if (b.job && name && !b.job.quenching) {
    const speed = (info.speeds || [])[0] ?? info.speed ?? 0;
    const left = speed > 0 ? (b.job.time - b.job.progress) / speed - (now() - G.state.now) : null;
    out.push(line(name, left != null ? dur(Math.max(0, left)) : null));
  } else if (b.job && b.job.quenching) out.push(line('Quench now!', null, 'gold-t'));
  else out.push(line(t.kind === 'continuous' ? (info.worker ? 'Working' : 'Nobody here') : 'Waiting for an order', null, 'dim'));
  const seats = info.seats || info.workers || [];
  const n = info.machines || 1;
  out.push(line('At work', `${seats.filter((x) => x != null).length} of ${n}`, 'dim'));
  return out;
}
