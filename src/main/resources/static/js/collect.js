// Loot that waits to be collected: what caravans and expeditions brought home stays in a report until the
// player presses "Collect". Then the goods fly up into the stores with a sound.
import { F, fmt, goodName } from './data.js';
import { h, img, goodIcon, bus, ico } from './ui.js';
import { paper } from './paper.js';
import * as S from './sprites.js';
import * as A from './audio.js';

/** Reports of one kind ('caravan' or 'expedition'), newest first, as cards. */
export function reportCards(kind) {
  return (F().reports || []).filter((r) => r.kind === kind).slice().reverse().map(reportCard);
}

function reportCard(r) {
  const loot = [];
  if (r.coins) loot.push(h('span', { class: 'loot-item', 'data-fly': 'coins' }, img(S.coin(), 'icon'), h('b', null, fmt(r.coins))));
  for (const [k, v] of Object.entries(r.goods || {})) loot.push(h('span', { class: 'loot-item', 'data-fly': k, title: goodName(k) }, goodIcon(k, 'icon'), h('b', null, fmt(v))));
  for (const a of r.artifacts || []) loot.push(h('span', { class: 'loot-item', 'data-fly': 'artifact', title: a.desc || a.name }, img(S.artifact(), 'icon'), h('b', null, a.name)));
  const empty = !loot.length;
  // a sealed letter from the caravan master or the party leader
  return paper('report-' + r.id, { seal: !r.bad, cls: 'report' + (r.bad ? ' bad' : '') },
    h('div', { class: 'row between' }, h('h3', { class: r.bad ? 'bad-t' : '' }, r.title), r.bad ? ico('skull', 'icon s') : null),
    (r.lines || []).map((l) => h('div', { class: 'small muted' }, l)),
    (r.extras || []).map((l) => h('div', { class: 'small good-t' }, l)),
    loot.length ? h('div', { class: 'loot' }, loot) : null,
    h('button', { class: 'btn big collect', onclick: (e) => collect(r, e.currentTarget) }, empty ? 'Done' : 'Collect'));
}

/** Fly every loot icon of the card up to the stores, then tell the server. */
async function collect(r, btn) {
  const card = btn.closest('.report');
  btn.disabled = true;
  const goal = document.getElementById('res');
  const to = goal ? goal.getBoundingClientRect() : { left: window.innerWidth / 2, top: 0, width: 0, height: 0 };
  const items = [...card.querySelectorAll('.loot-item')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (items.length) A.sfx('collect');
  btn.classList.add('pop');
  if (!reduce) items.forEach((el, i) => {
    const icon = el.querySelector('img, canvas');
    if (!icon) return;
    const a = icon.getBoundingClientRect();
    const ghost = icon.cloneNode(true);
    if (icon.tagName === 'CANVAS') ghost.getContext('2d').drawImage(icon, 0, 0);
    ghost.className = 'fly';
    Object.assign(ghost.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.append(ghost);
    const tx = to.left + to.width * (0.1 + 0.8 * ((i * 0.37) % 1)) - a.left, ty = to.top + to.height / 2 - a.top - a.height / 2;
    const anim = ghost.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${tx * 0.3}px, ${ty * 0.2 - 50}px) scale(1.6)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${tx}px, ${ty}px) scale(0.6)`, opacity: 0.2 },
    ], { duration: 750 + i * 60, delay: i * 70, easing: 'cubic-bezier(0.5, 0, 0.75, 0.25)', fill: 'forwards' });
    anim.onfinish = () => { ghost.remove(); if (goal) { goal.classList.remove('gain'); void goal.offsetWidth; goal.classList.add('gain'); } };
    el.style.visibility = 'hidden';
  });
  if (items.length && !reduce) card.classList.add('collected');
  await new Promise((res) => setTimeout(res, reduce || !items.length ? 0 : 650));
  try { await bus.act({ type: 'collect', id: r.id }, true, true); A.sfx('coins'); } catch { btn.disabled = false; card.classList.remove('collected'); }
}
