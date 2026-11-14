// Workshops: queues, the bellows and the anvil.
import { G, F, D, byId, fmt, dur, goodName, buildingName, now, stock, isItem, parseItem, qualityStep, qualityMult, gemsInStock, gemGradeOf, gemKind,
  wordChances, baseValue, moneyText } from './data.js';
import { h, img, goodIcon, bar, openSheet, closeSheet, refreshSheet, bus, toast, ico, inputChips, missingName, info, hourglass, setSand, statusIco } from './ui.js';
import * as A from './audio.js';
const HALL_ORDER = ['tavern', 'quarters', 'warehouse', 'vault', 'smelter', 'forge', 'grindstone', 'engraver', 'jeweler', 'mechanic', 'tailor', 'wizard', 'farm', 'brewery', 'barracks'];
import * as S from './sprites.js';
import { upgradeBtn, costBtn } from './panels-base.js';
import { jobOf } from './hold.js';
import { api } from './api.js';
import * as R48 from './rooms48.js';
import { orderSheet, ruleText } from './orders.js';

/** A small picture of a workshop: the old room art, or the room's 48-px look for rooms that only have that. */
function roomThumb(b) {
  if (S.META.ROOMS[b.type]) return img(S.room(b), 'thumb');
  const c = document.createElement('canvas');
  c.className = 'thumb';
  R48.get(b.type, 'room', b.look || '').then((tpl) => {
    if (!tpl) return;
    c.width = (tpl.cells || 1) * R48.CELL; c.height = R48.RH;
    R48.drawRoom(c.getContext('2d'), tpl, 0, 0, 0, { light: false });
  }).catch(() => {});
  return c;
}

export function orderLabel(e) {
  const rule = e.keep > 0 || Object.keys(e.when || {}).length;
  const n = rule ? '' : e.remaining === -1 ? '∞' : '×' + e.remaining;
  switch (e.recipe) {
    case 'smelt': return [goodIcon(e.mat, 'icon s'), ` Smelt ${byId.ores[e.mat].name.toLowerCase()} ${n}`];
    case 'alloy': return [goodIcon('bar:' + e.mat, 'icon s'), ` ${byId.metals[e.mat].name} ${n}`];
    case 'craft': return [img(S.item(e.itype, e.mat), 'icon s'), ` ${byId.metals[e.mat].name} ${byId.items[e.itype].name.toLowerCase()} ${n}`];
    case 'cutgem': return [goodIcon(e.itype || 'cut_gem', 'icon s'), ` Cut ${e.itype ? goodName(e.itype).toLowerCase() : 'gems'} ${n}`];
    case 'enchant': { const sc = G.data.magic.schools.find((x) => x.id === e.mat);
      return [img(S.sprite('gem_' + e.mat), 'icon s'), ` ${sc ? sc.name : e.mat} magic on ${e.itype ? goodName(e.itype).toLowerCase() : 'the best gem'} ${n}`]; }
    case 'weave': return [goodIcon('cloth', 'icon s'), ` Weave cloth ${n}`];
    case 'sew': return [goodIcon(`wear:${e.itype}:${e.mat}`, 'icon s'), ` ${goodName(`wear:${e.itype}:${e.mat}`)} ${n}`];
    default: return [img(S.item(e.itype, e.mat || 'iron'), 'icon s'),
      ` ${e.recipe[0].toUpperCase() + e.recipe.slice(1)} ${e.mat ? byId.metals[e.mat].name.toLowerCase() + ' ' : 'any '}${byId.items[e.itype].name.toLowerCase()}s ${n}`];
  }
}

export function workshops() {
  return F().buildings.filter((b) => b.level > 0 && byId.buildings[b.type].kind !== 'passive')
    .sort((a, b) => HALL_ORDER.indexOf(a.type) - HALL_ORDER.indexOf(b.type) || a.id.localeCompare(b.id));
}

function wsState(b) {
  const bi = D().buildings[b.id] || {};
  if (F().siege) return ['bad', 'Besieged'];
  if (!bi.worker) return ['bad', 'No worker'];
  if (b.type === 'forge' && (F().anvil || []).length) return ['hot', 'Pieces wait at the anvil'];
  if (byId.buildings[b.type].kind === 'continuous' || b.job) return ['ok', 'Working'];
  if (!b.queue.length) return ['warn', 'Queue empty'];
  const miss = bi.missing || {};
  if (b.queue.some((e) => !Object.keys(miss[e.id] || {}).length)) return ['ok', 'Starting the next order'];
  return ['warn', 'Waiting for materials'];
}

export function renderWork() {
  const f = F();
  const list = workshops();
  return [
    f.siege ? h('div', { class: 'card bad' }, 'The workshops are shut while raiders besiege the gate. See the War tab.') : null,
    list.length ? h('p', { class: 'small muted' }, 'Pick a workshop, or click it in the hold.', info('Every workshop is a room in your hold. Upgrading one makes it wider and adds a machine, so another dwarf can work there.')) : null,
    h('div', { class: 'list' }, list.map((x) => {
      const [st, label] = wsState(x), info_ = D().buildings[x.id] || {};
      return h('button', { class: 'ws-row' + (x.id === G.ws ? ' on' : ''), onclick: () => { G.ws = x.id; bus.showRoom(x.id); } },
        roomThumb(x),
        h('span', { class: 'grow' }, h('b', null, buildingName(x)), h('span', { class: 'small muted' }, ` · level ${x.level} · ${(info_.workers || []).length}/${info_.machines || 1} at work`), h('br'),
          h('span', { class: 'small ' + (st === 'ok' ? 'good-t' : st === 'bad' ? 'bad-t' : st === 'hot' ? 'gold-t' : 'warn-t') }, label)),
        statusIco({ bad: 'stop', hot: 'good', warn: label === 'Queue empty' ? 'idle' : 'stop' }[st]) || h('i', { class: 'icon st' }));
    })),
    list.length ? null : h('p', { class: 'muted' }, 'No workshops yet. Build one in the Hold tab.'),
  ];
}

export function workCard(b) {
  const f = F(), t = byId.buildings[b.type], info_ = D().buildings[b.id] || {};
  const w = info_.worker ? f.dwarves.find((x) => x.id === info_.worker) : null;
  const [st, label] = wsState(b);
  const multi = (info_.machines || 1) > 1;
  const out = h('div', { class: 'card ws-card ws-theme ws-' + b.type });
  out.append(
    h('h2', null, buildingName(b), info(t.note)),
    h('p', { class: 'small muted', style: { marginTop: 0 } }, 'Level ' + b.level + (info_.speed ? ` · speed ×${info_.speed.toFixed(2)}` : '')),
    multi ? machinesBlock(b) : h('div', { class: 'row' }, w ? [img(S.portrait(w), 'icon'), h('span', { class: 'grow' }, w.first + ' ' + w.clan, h('span', { class: 'small muted' }, ` · ${t.skill} ${D().dwarves[w.id].skills[t.skill]}`))]
      : h('span', { class: 'grow bad-t' }, 'Nobody works here.'),
    h('button', { class: 'btn small', onclick: () => assignSheet(b) }, w ? 'Change' : 'Assign')),
    w && !multi && !b.job ? h('p', { class: 'small ' + (st === 'ok' ? 'good-t' : st === 'bad' ? 'bad-t' : st === 'hot' ? 'gold-t' : 'warn-t') }, label) : '');

  if (t.kind === 'continuous') {
    const more = b.type === 'farm' ? (b.fertUntil > now() ? info_.fert || 0 : 0) : (info_.heat || 0) / 100;
    out.append(h('p', { class: 'small' }, b.type === 'farm' ? `About ${fmt(5 * (info_.speed || 0) * (1 + more))} mushrooms per hour.` : `About ${fmt(5 * (info_.speed || 0) * (1 + more))} ale per hour from half as many mushrooms.`),
      b.type === 'farm' ? fertBlock(b) : boostBlock(b),
      h('div', { class: 'row', style: { marginTop: '8px' } }, upgradeBtn(b)));
    return out;
  }
  if (b.type === 'forge') out.append(anvilBlock());
  for (let i = 0; i < (info_.machines || 1); i++) { const j = jobOf(b, i); if (j && !multi) out.append(jobBlock(b, i)); }
  if (info_.boost) out.append(boostBlock(b));
  out.append(h('h3', null, 'Orders', info('The worker takes the first order that has its materials. Orders without materials wait.')));
  if (!b.queue.length) out.append(h('p', { class: 'small muted' }, 'No orders yet.'));
  out.append(h('div', { class: 'list' }, b.queue.map((e, i) => {
    const miss = Object.entries((info_.missing || {})[e.id] || {}), wait = (info_.waits || {})[e.id], rule = ruleText(e);
    return h('div', { class: 'queue-item' + (miss.length || wait ? ' blocked' : '') },
      h('div', { class: 'grow' }, h('div', { class: 'small' }, orderLabel(e)),
        rule ? h('div', { class: 'small gold-t' }, rule) : null,
        wait === 'full' ? h('div', { class: 'small muted' }, 'Enough in stock. It starts again when there is less.')
          : wait === 'cond' ? h('div', { class: 'small warn-t' }, 'Waiting until its conditions hold.')
          : miss.length ? h('div', { class: 'small bad-t' }, 'Waiting for ', miss.map(([k, v]) => k.startsWith('item:') && k.split(':').length <= 3 ? missingName(k) : `${fmt(v)} more ${missingName(k)}`).join(', '))
          : h('div', { class: 'small good-t' }, e.batchLeft > 0 ? `Ready · ${e.batchLeft} left of this batch` : 'Ready')),
      i > 0 ? h('button', { class: 'btn small sq', 'aria-label': 'Move up', title: 'Move up', onclick: () => bus.act({ type: 'queueMove', building: b.id, entry: e.id, dir: -1 }) }, ico('up')) : null,
      h('button', { class: 'btn small sq', 'aria-label': 'Remove order', title: 'Remove', onclick: () => bus.act({ type: 'queueRemove', building: b.id, entry: e.id }) }, ico('close')));
  })));
  out.append(h('div', { class: 'row', style: { marginTop: '8px' } },
    h('button', { class: 'btn primary', disabled: b.queue.length >= 10, onclick: () => orderSheet(b) }, ico('plus'), 'Add order'), upgradeBtn(b)));
  out.append(h('div', { class: 'row', style: { marginTop: '8px' } },
    h('label', { class: 'row grow small' }, h('input', { type: 'checkbox', checked: !!b.practice, onchange: (e) => bus.act({ type: 'practice', building: b.id, on: e.target.checked }) }), 'Practice'),
    info('Practice mode: the workshop makes half as much, but its workers learn three times as fast. A journeyman or master working here teaches the others too.')));
  return out;
}

/** One row per machine: who works there and what it makes. Each machine can get its own dwarf or be taken out. */
function machinesBlock(b) {
  const f = F(), t = byId.buildings[b.type], bi = D().buildings[b.id] || {};
  const n = bi.machines || 1, seats = bi.seats || bi.workers || [];
  const rows = [];
  for (let i = 0; i < n; i++) {
    const w = seats[i] != null ? f.dwarves.find((x) => x.id === seats[i]) : null;
    const j = jobOf(b, i);
    const what = !w ? h('span', { class: 'small bad-t' }, 'Nobody here')
      : j ? h('span', { class: 'small muted' }, (bi.jobNames || [])[i] || 'Working')
        : h('span', { class: 'small muted' }, t.kind === 'continuous' ? 'Working' : 'Waiting for an order');
    const busyJob = j && t.kind !== 'continuous';
    rows.push(h('div', { class: 'machine' + (w ? '' : ' empty') },
      h('span', { class: 'machine-no' }, String(i + 1)),
      w ? img(S.portrait(w), 'icon') : h('span', { class: 'machine-seat' }, ico('dwarf')),
      h('div', { class: 'grow' },
        h('div', null, w ? w.first + ' ' + w.clan : 'Free machine', w && t.skill ? h('span', { class: 'small muted' }, ` · ${t.skill} ${D().dwarves[w.id].skills[t.skill]}`) : null),
        j ? h('div', { class: 'busy' }, hourglass({ job: b.id, machine: i }, 's'), what, h('span', { class: 'small gold-t', 'data-eta': b.id, 'data-machine': i })) : what),
      h('div', { class: 'machine-btns' },
        h('button', { class: 'btn small', onclick: () => assignSheet(b, i) }, w ? 'Change' : 'Assign'),
        w ? h('button', { class: 'btn small', title: 'Send ' + w.first + ' to rest', onclick: () => bus.act({ type: 'assign', dwarf: w.id, job: 'idle' }) }, 'Free') : null,
        n > 1 ? h('button', { class: 'btn small', disabled: !!busyJob, title: busyJob ? 'Wait until this machine is done.' : 'Take this machine out. The room gets narrower.',
          onclick: () => { if (confirm('Take machine ' + (i + 1) + ' out? ' + (w ? w.first + ' will rest. ' : '') + 'Putting it back costs money and stone.')) bus.act({ type: 'removeMachine', building: b.id, machine: i }); } }, 'Remove') : null)));
  }
  const waiting = (bi.waiting || []).map((id) => f.dwarves.find((x) => x.id === id)).filter(Boolean);
  return h('div', { class: 'machines' },
    h('div', { class: 'row between' }, h('h3', null, 'Machines', info('One dwarf per machine. Upgrade the workshop for another machine (up to 5). Pick who works where, or take a machine out to make the room narrower.')),
      h('span', { class: 'small muted' }, `${seats.filter((x) => x != null).length} of ${n} staffed`)),
    rows,
    bi.machineCost ? costBtn('Put back a machine', bi.machineCost, { type: 'addMachine', building: b.id }, bi.canGrow === false ? 'No floor has space for a wider room. Dig out more of the hold.' : null) : null,
    waiting.length ? h('p', { class: 'small warn-t' }, waiting.map((x) => x.first).join(', ') + ' waiting for a free machine. Upgrade the workshop or give them other work.') : null);
}

function jobBlock(b, i = 0) {
  const j = jobOf(b, i);
  const m = j.recipe === 'smelt' ? byId.metals[byId.ores[j.mat].metal] : byId.metals[j.mat];
  return h('div', { class: 'job' }, hourglass({ job: b.id, machine: i }),
    h('div', null, h('b', null, D().buildings[b.id].jobName || 'Working', m && b.type === 'smelter' ? info(m.meltNote) : null),
      h('div', { class: 'eta', 'data-eta': b.id, 'data-machine': i })));
}

// ------------------------------------------------------------------ bellows

let localHeat = {};

/** A minigame tap (0..1 of a full one) heats a workshop up at once; the minigame sends the taps to the server. */
export function heatUp(id, v) {
  localHeat[id] = { v: Math.min(100, currentHeat(id) + 7 * v), t: Date.now() / 1000 };
}

const GAME_BTN = { smelter: 'Pump the bellows', brewery: 'Shake the barrels', grindstone: 'Grind by hand', engraver: 'Cut runes by hand',
  jeweler: 'Facet by hand', tailor: 'Weave by hand' };
/** Heat of a workshop and the way to its minigame, which heats it up. */
function boostBlock(b) {
  const heat = (D().buildings[b.id] || {}).heat || 0;
  const hb = bar(heat / 100, 'heat');
  hb.querySelector('i').dataset.heat = b.id;
  return h('div', { class: 'boost-block' },
    h('div', { class: 'row between small' }, h('span', null, 'Heat', info('Lend a hand in a small game: the room heats up and works up to twice as fast while the heat lasts.')),
      h('span', { class: 'muted' }, 'up to ×2')),
    hb,
    h('button', { class: 'btn primary', onclick: () => bus.minigame(b.id) }, ico('work'), GAME_BTN[b.type] || 'Lend a hand'));
}

/** Fertilizer for a mushroom farm: once per two hours, a small game decides how much more it grows. */
function fertBlock(b) {
  const until = b.fertUntil || 0, on = until > now(), fert = (D().buildings[b.id] || {}).fert || 0;
  return h('div', { class: 'boost-block' },
    h('div', { class: 'row between small' }, h('span', null, 'Fertilizer', info('Spread fertilizer over the beds in a small game. The more mushrooms get some, the more the farm grows for two hours (up to +60 %).')),
      on ? h('span', { class: 'good-t' }, `+${Math.round(100 * fert)} % for `, h('span', { 'data-until': until }, dur(until - now()))) : h('span', { class: 'muted' }, 'none')),
    h('button', { class: 'btn ' + (on ? '' : 'primary'), disabled: on, onclick: () => bus.minigame(b.id) }, ico('work'), on ? 'Beds fertilized' : 'Spread fertilizer'));
}

export function currentHeat(id) {
  const l = localHeat[id];
  const server = D().buildings[id] ? D().buildings[id].heat : 0;
  if (!l) return server;
  const v = Math.max(0, l.v - 4 * (Date.now() / 1000 - l.t));
  return Math.max(v, server);
}

// ------------------------------------------------------------------ anvil

/** Pieces off the fire wait at the anvil: hammer and quench them yourself for better quality. */
export function anvilBlock() {
  const f = F(), list = f.anvil || [], max = D().anvilMax || 10;
  const best = [...list].sort((a, b) => b.at - a.at)[0];
  return h('div', { class: 'anvil-card card' + (list.length ? ' hot' : '') },
    h('div', { class: 'row between' },
      h('b', null, 'At the anvil ', h('span', { class: 'gold-t' }, `${list.length}/${max}`)),
      info('Every forged piece waits here for eight hours. Hammer it in time and quench it at the golden mark for better quality. Pieces you leave are finished by the dwarves, but never as well. When the anvil is full, a better piece pushes out the cheapest.')),
    list.length ? h('div', { class: 'anvil-row' }, list.slice(0, 10).map((g) => img(S.item(g.itype, g.mat), 'icon s')))
      : h('p', { class: 'small muted' }, 'Nothing hot right now. Forged pieces come here.'),
    h('button', { class: 'btn big primary', disabled: !list.length, onclick: () => bus.smithy() }, ico('work'), list.length ? 'To the anvil' : 'Nothing to forge'),
    best ? h('p', { class: 'small dim' }, 'The dwarves finish the oldest one in ', h('span', { 'data-until': Math.min(...list.map((g) => (D().anvil || []).find((x) => x.id === g.id)?.until || 0)) }), '.') : null);
}

/** Called every frame by main.js: moves progress bars, heat and quench glow smoothly. */
export function animateWork() {
  if (!G.state) return;
  const t = now();
  document.querySelectorAll('[data-job]').forEach((el) => {
    const b = F().buildings.find((x) => x.id === el.dataset.job);
    const i = +(el.dataset.machine || 0), j = b && jobOf(b, i);
    if (!j) return;
    const info = D().buildings[b.id] || {};
    const speed = ((info.speeds || [])[i] ?? info.speed ?? 0) * (1 + (info.boost ? currentHeat(b.id) / 100 : 0));
    const since = Math.max(0, t - G.state.now);
    const done = (j.progress + speed * since) / j.time;
    if (el.classList.contains('hg')) setSand(el, done); else el.style.width = Math.min(100, done * 100) + '%';
  });
  // time left beside the hourglasses
  document.querySelectorAll('[data-eta]').forEach((el) => {
    const b = F().buildings.find((x) => x.id === el.dataset.eta);
    const i = +(el.dataset.machine || 0), j = b && jobOf(b, i);
    if (!j) { el.textContent = ''; return; }
    const info = D().buildings[b.id] || {};
    const speed = ((info.speeds || [])[i] ?? info.speed ?? 0) * (1 + (info.boost ? currentHeat(b.id) / 100 : 0));
    el.textContent = speed > 0 ? dur((j.time - j.progress) / speed - Math.max(0, t - G.state.now)) + ' left' : 'Stopped';
  });
  document.querySelectorAll('[data-heat]').forEach((el) => { el.style.width = currentHeat(el.dataset.heat) + '%'; });
  document.querySelectorAll('[data-until]').forEach((el) => { el.textContent = dur(Math.max(0, +el.dataset.until - t)); });
}

// ------------------------------------------------------------------ sheets

function assignSheet(b, machine = -1) {
  openSheet(() => {
    const f = F(), skill = byId.buildings[b.type].skill;
    const multi = (b.machines || 1) > 1, seats = (D().buildings[b.id] || {}).seats || [];
    const free = f.dwarves.filter((x) => !x.busy).sort((a, c) => (D().dwarves[c.id].skills[skill] || 0) - (D().dwarves[a.id].skills[skill] || 0));
    // for one machine of several: dwarves of this workshop can swap places, so they stay in the list
    const pickable = free.filter((x) => (multi && machine >= 0) ? seats[machine] !== x.id : !(x.job === 'worker' && x.building === b.id));
    return h('div', null, h('h2', null, multi && machine >= 0 ? `Who works at machine ${machine + 1}?` : 'Who works at the ' + buildingName(b).toLowerCase() + '?'),
      h('p', { class: 'small muted' }, `Sorted by ${skill} skill. ` + (multi
        ? (machine >= 0 ? 'Whoever works there now rests, or swaps places with a dwarf from another machine here.' : `Each of the ${b.machines} machines takes one dwarf.`) : 'The current worker becomes idle.')),
      pickable.map((x) => h('button', { class: 'pick', style: { width: '100%' }, onclick: async () => { await bus.act({ type: 'assign', dwarf: x.id, job: 'worker', building: b.id, machine: multi ? machine : -1 }); closeSheet(); } },
        img(S.portrait(x)), h('span', { class: 'grow', style: { textAlign: 'left' } }, x.first + ' ' + x.clan, h('br'), h('span', { class: 'small muted' }, (x.job === 'idle' ? 'Idle' : x.job === 'worker' && x.building === b.id && seats.indexOf(x.id) >= 0 ? 'at machine ' + (seats.indexOf(x.id) + 1) : 'now: ' + x.job) + ` · ${skill} ${D().dwarves[x.id].skills[skill]}`)))));
  });
}

export { orderSheet };
export { api };
