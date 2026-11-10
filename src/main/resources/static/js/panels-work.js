// Workshops: queues, the bellows and the quench.
import { G, F, D, byId, fmt, goodName, buildingName, now, stock, isItem, parseItem } from './data.js';
import { h, img, goodIcon, bar, openSheet, closeSheet, refreshSheet, bus, toast, ico, inputChips, missingName } from './ui.js';
import * as A from './audio.js';
const HALL_ORDER = ['tavern', 'quarters', 'warehouse', 'vault', 'smelter', 'forge', 'grindstone', 'engraver', 'jeweler', 'farm', 'brewery', 'barracks'];
import * as S from './sprites.js';
import { upgradeBtn, jobSheet } from './panels-base.js';
import { api } from './api.js';

const QUENCH_WAIT = 12;

export function orderLabel(e) {
  const n = e.remaining === -1 ? '∞' : '×' + e.remaining;
  switch (e.recipe) {
    case 'smelt': return [goodIcon(e.mat, 'icon s'), ` Smelt ${byId.ores[e.mat].name.toLowerCase()} ${n}`];
    case 'alloy': return [goodIcon('bar:' + e.mat, 'icon s'), ` ${byId.metals[e.mat].name} ${n}`];
    case 'craft': return [img(S.item(e.itype, e.mat), 'icon s'), ` ${byId.metals[e.mat].name} ${byId.items[e.itype].name.toLowerCase()} ${n}`];
    case 'cutgem': return [goodIcon('cut_gem', 'icon s'), ` Cut gems ${n}`];
    default: return [img(S.item(e.itype, e.mat || 'iron'), 'icon s'),
      ` ${e.recipe[0].toUpperCase() + e.recipe.slice(1)} ${e.mat ? byId.metals[e.mat].name.toLowerCase() + ' ' : 'any '}${byId.items[e.itype].name.toLowerCase()}s ${n}`];
  }
}

export function workshops() {
  return F().buildings.filter((b) => b.level > 0 && byId.buildings[b.type].kind !== 'passive')
    .sort((a, b) => HALL_ORDER.indexOf(a.type) - HALL_ORDER.indexOf(b.type) || a.id.localeCompare(b.id));
}

function wsState(b) {
  const info = D().buildings[b.id] || {};
  if (F().siege) return ['bad', 'Besieged'];
  if (!info.worker) return ['bad', 'No worker'];
  if (b.job && b.job.quenching) return ['hot', 'Quench now!'];
  if (byId.buildings[b.type].kind === 'continuous' || b.job) return ['ok', 'Working'];
  if (!b.queue.length) return ['warn', 'Queue empty'];
  const miss = info.missing || {};
  if (b.queue.some((e) => !Object.keys(miss[e.id] || {}).length)) return ['ok', 'Starting the next order'];
  return ['warn', 'Waiting for materials'];
}

export function renderWork() {
  const f = F();
  const list = workshops();
  if (!list.find((b) => b.id === G.ws) && list.length) G.ws = list[0].id;
  const b = list.find((x) => x.id === G.ws);
  return [
    f.siege ? h('div', { class: 'card bad' }, 'The workshops are shut while raiders besiege the gate. See the War tab.') : null,
    h('div', { class: 'ws-tabs', role: 'tablist', 'aria-label': 'Workshops' }, list.map((x) => {
      const [st, label] = wsState(x);
      return h('button', { class: 'ws-tab' + (x.id === G.ws ? ' on' : ''), role: 'tab', 'aria-selected': String(x.id === G.ws), title: label,
        onclick: () => { G.ws = x.id; bus.render(); if (!window.matchMedia('(min-width: 900px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' }); } },
        img(S.room(x.type), 'thumb'), h('span', { class: 'nm' }, buildingName(x)), h('i', { class: 'dot ' + st }));
    })),
    b ? workCard(b) : h('p', { class: 'muted' }, 'No workshops yet. Build one in the Hold tab.'),
  ];
}

export function workCard(b) {
  const f = F(), t = byId.buildings[b.type], info = D().buildings[b.id] || {};
  const w = info.worker ? f.dwarves.find((x) => x.id === info.worker) : null;
  const [st, label] = wsState(b);
  const out = h('div', { class: 'card ws-card' });
  out.append(
    h('div', { class: 'row between' }, h('h3', null, buildingName(b)), h('span', { class: 'muted small' }, 'Level ' + b.level + (info.speed ? ` · speed ×${info.speed.toFixed(2)}` : ''))),
    h('p', { class: 'small muted' }, t.note),
    h('div', { class: 'row' }, w ? [img(S.portrait(w), 'icon'), h('span', { class: 'grow' }, w.first + ' ' + w.clan, h('span', { class: 'small muted' }, ` · ${t.skill} ${D().dwarves[w.id].skills[t.skill]}`))]
      : h('span', { class: 'grow bad-t' }, 'No worker - nothing happens here.'),
    h('button', { class: 'btn small', onclick: () => assignSheet(b) }, w ? 'Change' : 'Assign')),
    w ? h('p', { class: 'small ' + (st === 'ok' ? 'good-t' : st === 'bad' ? 'bad-t' : st === 'hot' ? 'gold-t' : 'warn-t') }, b.job && b.status ? b.status : label) : null);

  if (t.kind === 'continuous') {
    out.append(h('p', { class: 'small' }, b.type === 'farm' ? `About ${fmt(5 * (info.speed || 0))} mushrooms per hour.` : `About ${fmt(5 * (info.speed || 0))} ale per hour from half as many mushrooms.`),
      h('div', { class: 'row', style: { marginTop: '8px' } }, upgradeBtn(b)));
    return out;
  }
  if (b.job) out.append(jobBlock(b));
  if (b.type === 'smelter') out.append(bellows(b));
  out.append(h('h3', null, 'Orders'));
  if (!b.queue.length) out.append(h('p', { class: 'small muted' }, 'No orders. Add one and the worker keeps at it, even while you are away.'));
  out.append(h('div', { class: 'list' }, b.queue.map((e, i) => {
    const miss = Object.entries((info.missing || {})[e.id] || {});
    return h('div', { class: 'queue-item' + (miss.length ? ' blocked' : '') },
      h('div', { class: 'grow' }, h('div', { class: 'small' }, orderLabel(e)),
        miss.length ? h('div', { class: 'small bad-t' }, 'Waiting for ', miss.map(([k, v]) => k.startsWith('item:') && k.split(':').length <= 3 ? missingName(k) : `${fmt(v)} more ${missingName(k)}`).join(', '))
          : h('div', { class: 'small good-t' }, 'Ready')),
      i > 0 ? h('button', { class: 'btn small ghost', 'aria-label': 'Move up', title: 'Move up', onclick: () => bus.act({ type: 'queueMove', building: b.id, entry: e.id, dir: -1 }) }, ico('up')) : null,
      h('button', { class: 'btn small ghost', 'aria-label': 'Remove order', title: 'Remove', onclick: () => bus.act({ type: 'queueRemove', building: b.id, entry: e.id }) }, ico('close')));
  })));
  out.append(h('p', { class: 'small dim' }, 'If an order lacks materials, the worker tries the next one.'));
  out.append(h('div', { class: 'row', style: { marginTop: '8px' } },
    h('button', { class: 'btn primary', disabled: b.queue.length >= 10, onclick: () => orderSheet(b) }, ico('plus'), 'Add order'), upgradeBtn(b)));
  return out;
}

function jobBlock(b) {
  const j = b.job;
  if (j.quenching) return quenchBlock(b);
  const m = j.recipe === 'smelt' ? byId.metals[byId.ores[j.mat].metal] : byId.metals[j.mat];
  const p = h('div', { class: 'bar' }, h('i', { 'data-job': b.id }));
  return h('div', null, h('div', { class: 'small' }, D().buildings[b.id].jobName || ''), p,
    m && b.type === 'smelter' ? h('p', { class: 'tip' }, m.meltNote) : null);
}

// ------------------------------------------------------------------ bellows

let pending = 0, timer = null, localHeat = {};

/** One pump of the bellows: heat shows at once, taps go to the server in small batches. */
export function pump(id) {
  if (currentHeat(id) < 5) A.sfx('ignite');
  A.sfx('bellows');
  localHeat[id] = { v: Math.min(100, currentHeat(id) + 7), t: Date.now() / 1000 };
  pending++;
  if (navigator.vibrate) navigator.vibrate(8);
  if (!timer) timer = setTimeout(async () => {
    const taps = pending; pending = 0; timer = null;
    try { await bus.act({ type: 'bellows', building: id, taps }, true); } catch { /* shown by act */ }
  }, 700);
}

function bellows(b) {
  const heat = D().buildings[b.id].heat || 0;
  const hb = bar(heat / 100, 'heat');
  hb.querySelector('i').dataset.heat = b.id;
  return h('div', { style: { marginTop: '8px' } },
    h('div', { class: 'row between small' }, h('span', null, 'Heat'), h('span', { class: 'muted' }, 'More heat = faster smelting (up to ×2). Tap the furnace or this button.')),
    hb,
    h('button', { class: 'btn big primary', style: { marginTop: '6px' }, onpointerdown: (e) => { e.preventDefault(); pump(b.id); } }, 'Pump the bellows'));
}

export function currentHeat(id) {
  const l = localHeat[id];
  const server = D().buildings[id] ? D().buildings[id].heat : 0;
  if (!l) return server;
  const v = Math.max(0, l.v - 4 * (Date.now() / 1000 - l.t));
  return Math.max(v, server);
}

// ------------------------------------------------------------------ quench

function quenchBlock(b) {
  const j = b.job, m = byId.metals[j.mat];
  const box = h('div', { class: 'quench' });
  const glow = h('div', { class: 'glow' }), mark = h('div', { class: 'mark' }), nowEl = h('div', { class: 'now' });
  const W = QUENCH_WAIT;
  mark.style.left = (m.qStart / W * 100) + '%';
  mark.style.width = (m.qWidth / W * 100) + '%';
  box.append(glow, mark, nowEl);
  box.dataset.quench = b.id;
  return h('div', null,
    h('div', { class: 'row between' }, h('b', null, 'Ready to quench: ', byId.metals[j.mat].name.toLowerCase(), ' ', byId.items[j.itype].name.toLowerCase()),
      h('span', { class: 'small muted' }, 'or the smith does it')),
    box,
    h('p', { class: 'tip' }, m.quenchNote),
    h('button', { class: 'btn big primary', onclick: () => bus.act({ type: 'quench', building: b.id }) }, 'Quench!'));
}

/** Called every frame by main.js: moves progress bars, heat and quench glow smoothly. */
export function animateWork() {
  if (!G.state) return;
  const t = now();
  document.querySelectorAll('[data-job]').forEach((el) => {
    const b = F().buildings.find((x) => x.id === el.dataset.job);
    if (!b || !b.job) return;
    const info = D().buildings[b.id] || {};
    const speed = (info.speed || 0) * (1 + (b.type === 'smelter' ? currentHeat(b.id) / 100 : 0));
    const since = Math.max(0, t - G.state.now);
    el.style.width = Math.min(100, (b.job.progress + speed * since) / b.job.time * 100) + '%';
  });
  document.querySelectorAll('[data-heat]').forEach((el) => { el.style.width = currentHeat(el.dataset.heat) + '%'; });
  document.querySelectorAll('[data-quench]').forEach((el) => {
    const b = F().buildings.find((x) => x.id === el.dataset.quench);
    if (!b || !b.job || !b.job.quenching) return;
    const since = Math.max(0, Math.min(QUENCH_WAIT, t - b.job.quenchStart));
    const k = since / QUENCH_WAIT;
    // glowing metal cools from white-yellow over orange and red to dark
    const col = k < 0.25 ? S.mix('#fff6c0', '#ffb040', k / 0.25) : k < 0.6 ? S.mix('#ffb040', '#d0401a', (k - 0.25) / 0.35) : S.mix('#d0401a', '#3a1a14', (k - 0.6) / 0.4);
    el.querySelector('.glow').style.background = col;
    el.querySelector('.now').style.left = (k * 100) + '%';
  });
}

// ------------------------------------------------------------------ sheets

function assignSheet(b) {
  openSheet(() => {
    const f = F(), skill = byId.buildings[b.type].skill;
    const free = f.dwarves.filter((x) => !x.busy).sort((a, c) => (D().dwarves[c.id].skills[skill] || 0) - (D().dwarves[a.id].skills[skill] || 0));
    return h('div', null, h('h2', null, 'Who works at the ' + buildingName(b).toLowerCase() + '?'),
      h('p', { class: 'small muted' }, `Sorted by ${skill} skill. The current worker becomes idle.`),
      free.map((x) => h('button', { class: 'pick', style: { width: '100%' }, onclick: async () => { await bus.act({ type: 'assign', dwarf: x.id, job: 'worker', building: b.id }); closeSheet(); } },
        img(S.portrait(x)), h('span', { class: 'grow', style: { textAlign: 'left' } }, x.first + ' ' + x.clan, h('br'), h('span', { class: 'small muted' }, (x.job === 'idle' ? 'Idle' : 'now: ' + x.job) + ` · ${skill} ${D().dwarves[x.id].skills[skill]}`)))));
  });
}

const COUNTS = [1, 5, 10, 25, -1];

function orderSheet(b) {
  const st = { recipe: b.type === 'smelter' ? 'smelt' : b.type === 'forge' ? 'craft' : b.type === 'grindstone' ? 'sharpen' : b.type === 'engraver' ? 'engrave' : 'cutgem', mat: null, itype: null, count: -1 };
  const send = async () => {
    try {
      await bus.act({ type: 'queueAdd', building: b.id, recipe: st.recipe, mat: st.mat, itype: st.itype, count: st.count }, false, true);
      closeSheet();
    } catch (e) { toast(e.message, 'bad'); }
  };
  openSheet(() => {
    const f = F();
    const choice = (on, label, sub, onclick, disabled) => h('button', { class: 'pick' + (on ? ' on' : ''), style: { width: '100%', opacity: disabled ? 0.5 : 1 }, onclick: () => { onclick(); refreshSheet(); } },
      label, h('span', { class: 'grow', style: { textAlign: 'left' } }), sub ? h('span', { class: 'small muted' }, sub) : null);
    const parts = [h('h2', null, buildingName(b) + ': new order')];
    if (b.type === 'smelter') {
      parts.push(h('div', { class: 'row' }, ['smelt', 'alloy'].map((r) => h('button', { class: 'btn small' + (st.recipe === r ? ' primary' : ''), onclick: () => { st.recipe = r; st.mat = null; refreshSheet(); } }, r === 'smelt' ? 'Smelt ore' : 'Make alloy'))));
      if (st.recipe === 'smelt') {
        parts.push(h('p', { class: 'small muted' }, '2 ore + 1 coal → 2 bars.'));
        for (const o of G.data.ores) {
          const have = stock(o.id);
          parts.push(choice(st.mat === o.id, [goodIcon(o.id), ' ', o.name, ' → ', goodIcon('bar:' + o.metal, 'icon s'), ' ', byId.metals[o.metal].name + (o.bonusMetal ? ` (+${Math.round(o.bonusChance * 100)}% ${o.bonusMetal})` : '')],
            'have ' + have, () => { st.mat = o.id; }, have < 2));
        }
      } else {
        parts.push(h('p', { class: 'small muted' }, 'Melt bars together. Every alloy also burns 1 coal.'));
        for (const a of G.data.alloys) {
          const locked = a.blueprint && !f.blueprints.includes(a.blueprint);
          const ins = Object.entries(a.inputs).map(([k, v]) => `${v} ${byId.metals[k].name.toLowerCase()}`).join(' + ') + (a.flux ? ' + limestone' : '');
          const can = Object.entries(a.inputs).every(([k, v]) => stock('bar:' + k) >= v);
          parts.push(choice(st.mat === a.metal, [goodIcon('bar:' + a.metal), ' ', a.out + ' ' + byId.metals[a.metal].name],
            locked ? 'needs blueprint' : ins, () => { if (!locked) st.mat = a.metal; }, locked || !can));
        }
      }
    } else if (b.type === 'forge') {
      parts.push(h('p', { class: 'small muted' }, 'Choose what to make, then the metal. Each piece burns 1 coal.'));
      parts.push(h('div', { class: 'row' }, G.data.items.map((t) => {
        const locked = t.blueprint && !f.blueprints.includes(t.blueprint);
        return h('button', { class: 'btn small' + (st.itype === t.id ? ' primary' : ''), disabled: locked, title: locked ? 'Needs a blueprint from an expedition' : t.note,
          onclick: () => { st.itype = t.id; st.mat = null; refreshSheet(); } }, img(S.item(t.id, 'iron'), 'icon s'), t.name);
      })));
      if (st.itype) {
        const t = byId.items[st.itype];
        parts.push(h('p', { class: 'small' }, `${t.bars} bars each. ${t.note}`));
        const metals = G.data.metals.filter((m) => fits(t, m)).sort((a, b) => stock('bar:' + b.id) - stock('bar:' + a.id));
        for (const m of metals) parts.push(choice(st.mat === m.id, [img(S.item(t.id, m.id)), ' ', m.name], 'have ' + stock('bar:' + m.id) + ' bars', () => { st.mat = m.id; }, stock('bar:' + m.id) < t.bars));
        if (!metals.length) parts.push(h('p', { class: 'muted' }, 'No metal fits.'));
      }
    } else {
      if (b.type === 'jeweler') parts.push(h('div', { class: 'row' }, ['cutgem', 'setgem'].map((r) => h('button', { class: 'btn small' + (st.recipe === r ? ' primary' : ''), onclick: () => { st.recipe = r; st.itype = null; refreshSheet(); } }, r === 'cutgem' ? 'Cut gems' : 'Set gems'))));
      if (st.recipe === 'cutgem') parts.push(h('p', null, goodIcon('rough_gem'), ' 1 rough gem → ', goodIcon('cut_gem'), ` 1 cut gem. You have ${stock('rough_gem')} rough gems.`));
      else {
        const mod = { sharpen: 's', engrave: 'e', setgem: 'g' }[st.recipe];
        parts.push(h('p', { class: 'small muted' }, byId.mods[mod].name + ': ' + byId.mods[mod].note + `. Worth ×${byId.mods[mod].mult}. The best matching piece is picked first.`));
        parts.push(h('div', { class: 'row' }, G.data.items.filter((t) => t.mods.includes(mod)).map((t) => h('button', { class: 'btn small' + (st.itype === t.id ? ' primary' : ''), onclick: () => { st.itype = t.id; refreshSheet(); } }, t.name))));
        if (st.itype) {
          const have = Object.entries(f.stock).filter(([k, v]) => v > 0 && isItem(k) && parseItem(k).type === st.itype && !parseItem(k).mods.includes(mod));
          const mats = [...new Set(have.map(([k]) => parseItem(k).metal))];
          parts.push(choice(st.mat == null, 'Any metal', `${have.reduce((s, [, v]) => s + v, 0)} in stock`, () => { st.mat = null; }));
          for (const m of mats) parts.push(choice(st.mat === m, [img(S.item(st.itype, m)), ' ', byId.metals[m].name], '', () => { st.mat = m; }));
        }
      }
    }
    const ins = orderInputs(st);
    if (ins) {
      const can = Math.min(...Object.entries(ins).map(([k, v]) => Math.floor(stock(k) / v)));
      parts.push(h('div', { class: 'card sub', style: { marginTop: '10px' } },
        h('div', { class: 'small muted' }, 'Each one needs'), inputChips(ins),
        h('div', { class: 'small ' + (can > 0 ? 'good-t' : 'bad-t') }, can > 0 ? `You have enough for ${fmt(can)}.` : 'You have not got enough yet - the order waits until you do.')));
    }
    parts.push(h('h3', null, 'How many?'), h('div', { class: 'row' }, COUNTS.map((c) => h('button', { class: 'btn small' + (st.count === c ? ' primary' : ''), onclick: () => { st.count = c; refreshSheet(); } }, c === -1 ? 'Forever' : c))));
    const ready = st.recipe === 'cutgem' || (['smelt', 'alloy'].includes(st.recipe) && st.mat) || (st.itype && (st.recipe !== 'craft' || st.mat));
    parts.push(h('button', { class: 'btn big primary', style: { marginTop: '12px' }, disabled: !ready, onclick: send }, 'Add to queue'));
    return h('div', null, parts);
  });
}

function orderInputs(st) {
  if (st.recipe === 'smelt' && st.mat) return { [st.mat]: 2, coal: 1 };
  if (st.recipe === 'alloy' && st.mat) {
    const a = byId.alloys[st.mat], o = {};
    for (const [k, v] of Object.entries(a.inputs)) o['bar:' + k] = v;
    o.coal = 1;
    if (a.flux) o.limestone = 1;
    return o;
  }
  if (st.recipe === 'craft' && st.itype && st.mat) return { ['bar:' + st.mat]: byId.items[st.itype].bars, coal: 1 };
  if (st.recipe === 'cutgem') return { rough_gem: 1 };
  if (st.recipe === 'setgem' && st.itype) return { cut_gem: 1 };
  return null;
}

function fits(t, m) {
  if (t.rule === 'hard') return m.hardness >= 3 && m.id !== 'pig_iron';
  if (t.rule === 'precious') return m.precious;
  return true;
}

export { api };
