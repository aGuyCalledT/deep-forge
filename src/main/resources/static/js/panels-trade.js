// Trade (caravans, cities, prices) and expeditions.
import { G, F, D, byId, fmt, dur, goodName, now, sellPrice, buyPrice, saleEstimate, marketKey, stock, baseValue, isItem } from './data.js';
import { h, img, goodIcon, openSheet, closeSheet, refreshSheet, bus, toast, skulls, dwarfPicker, ico } from './ui.js';
import * as S from './sprites.js';
import { api } from './api.js';
import { reportCards } from './collect.js';

let marketAt = 0;

export async function loadMarket(force) {
  if (!force && G.market && Date.now() - marketAt < 60000) return;
  try { G.market = await api.get('/market'); marketAt = Date.now(); bus.render(); } catch { /* ignore */ }
}

function trend(k) {
  const hist = G.market && G.market.history[marketKey(k)];
  if (!hist || hist.length < 4) return '';
  const a = hist[hist.length - 1], b = hist[Math.max(0, hist.length - 7)];
  return a > b * 1.04 ? ico('trend_up', 'icon xs') : a < b * 0.96 ? ico('trend_down', 'icon xs') : '';
}

// ================================================================== trade

export function renderTrade() {
  loadMarket();
  const f = F(), d = D(), t = now();
  const out = [];
  const merchants = f.dwarves.filter((x) => x.job === 'merchant' && !x.busy);
  const slots = d.caravanSlots - f.caravans.length;
  out.push(...reportCards('caravan'));
  out.push(h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, 'Caravans'), h('span', { class: 'muted' }, `${f.caravans.length} / ${d.caravanSlots} on the road`)),
    h('p', { class: 'small muted' }, 'Merchants carry goods to a city, sell at the price on arrival, buy what you ordered and come back. Prices move while they travel, and roads can be dangerous.'),
    h('button', { class: 'btn primary', disabled: !merchants.length || slots <= 0, onclick: caravanSheet },
      !merchants.length ? 'No free merchant (give a dwarf the merchant job)' : slots <= 0 ? 'All caravan slots busy' : 'Send a caravan')));
  for (const c of f.caravans) {
    const out1 = c.state === 'outbound';
    const end = out1 ? c.arriveAt : c.returnAt;
    const units = Object.values(c.cargo).reduce((s, v) => s + v, 0);
    out.push(h('div', { class: 'card sub row' }, img(S.wagon(0), 'icon l'),
      h('div', { class: 'grow' }, h('b', null, (out1 ? 'To ' : 'Back from ') + byId.cities[c.city].name),
        h('div', { class: 'small muted' }, out1 ? `${units} goods, ${fmt(c.budget)} coins to spend` : `sold for ${fmt(c.revenue)} coins`)),
      h('span', { class: 'nowrap', 'data-until': end }, dur(end - t))));
  }

  out.push(h('h2', null, 'Cities'));
  if (!G.market) out.push(h('p', { class: 'muted' }, 'Asking around for prices...'));
  else {
    out.push(h('p', { class: 'small muted' }, 'Demand changes in ', h('span', { 'data-until': G.market.nextDemandChange }, dur(G.market.nextDemandChange - t)), '. Prices are shared by every hold - when anyone sells a lot, the price drops for everyone.'));
    for (const cid of f.cities) {
      const c = byId.cities[cid], m = G.market.cities[cid] || {};
      const dem = Object.entries(m.demand || {}).sort((a, b) => b[1] - a[1]);
      out.push(h('div', { class: 'card' },
        h('div', { class: 'row between' }, h('h3', null, c.name), h('span', { class: 'small muted' }, `${c.hours}h each way · ${Math.round(c.danger * 100)}% bandits`)),
        h('p', { class: 'small' }, m.news || c.note),
        h('div', null, dem.slice(0, 3).map(([k, v]) => h('span', { class: 'chip good' }, `${k} ×${v.toFixed(2)}`)),
          dem.slice(-1).map(([k, v]) => h('span', { class: 'chip bad' }, `${k} ×${v.toFixed(2)}`)))));
    }
    // price table for goods in stock
    const goods = Object.keys(f.stock).filter((k) => f.stock[k] > 0)
      .sort((a, b) => baseValue(b) * f.stock[b] - baseValue(a) * f.stock[a]).slice(0, 14);
    if (goods.length) {
      const cities = [...f.cities];
      out.push(h('h2', null, 'What your goods fetch'), h('div', { class: 'card scroll-x' }, h('table', null,
        h('tr', null, h('th', null, 'Good'), h('th', { class: 'num' }, 'Have'), cities.map((c) => h('th', { class: 'num' }, byId.cities[c].name.split(' ')[0]))),
        goods.map((k) => {
          const prices = cities.map((c) => sellPrice(c, k));
          const best = Math.max(...prices);
          return h('tr', null, h('td', null, goodIcon(k, 'icon s'), ' ', goodName(k), ' ', h('span', { class: 'small muted' }, trend(k))),
            h('td', { class: 'num' }, fmt(f.stock[k])),
            prices.map((p) => h('td', { class: 'num' + (p === best ? ' best' : '') }, p < 10 ? p.toFixed(1) : fmt(p))));
        }))));
    }
  }
  return out;
}

function caravanSheet() {
  const f = F();
  const st = { city: [...f.cities][0], merchants: new Set(), guards: new Set(), cargo: {}, arts: new Set(), buy: {}, budget: 0, buyKey: 'coal' };
  const first = f.dwarves.find((x) => x.job === 'merchant' && !x.busy);
  if (first) st.merchants.add(first.id);
  openSheet(() => {
    const f2 = F(), d = D();
    const merchants = f2.dwarves.filter((x) => x.job === 'merchant' && !x.busy);
    const guards = f2.dwarves.filter((x) => x.job === 'warrior' && !x.busy);
    const cap = d.caravanCapacity * st.merchants.size;
    const units = Object.values(st.cargo).reduce((s, v) => s + v, 0);
    const city = byId.cities[st.city];
    const guardPower = [...st.guards, ...st.merchants].reduce((s, id) => s + (d.dwarves[id] ? d.dwarves[id].power : 0), 0);
    const bandit = 10 + 160 * city.danger * (1 + 0.08 * (f2.level - 1));
    const est = Object.entries(st.cargo).reduce((s, [k, q]) => s + saleEstimate(st.city, k, q, G.market ? G.market.sellBonus : 1), 0)
      + [...st.arts].reduce((s, id) => s + (f2.artifacts.find((a) => a.id === id) || { value: 0 }).value, 0);
    const goods = Object.keys(f2.stock).filter((k) => f2.stock[k] > 0 && k !== 'food' && k !== 'ale' || (k === 'food' || k === 'ale') && f2.stock[k] > 0)
      .sort((a, b) => sellPrice(st.city, b) - sellPrice(st.city, a));
    const buyable = [...G.data.ores.map((o) => o.id), 'coal', 'limestone', 'stone', 'food', 'ale', 'rough_gem', ...G.data.metals.map((m) => 'bar:' + m.id)];
    const setQ = (k, v) => { v = Math.max(0, Math.min(f2.stock[k] || 0, Math.floor(+v || 0))); if (v) st.cargo[k] = v; else delete st.cargo[k]; refreshSheet(); };

    return h('div', null,
      h('h2', null, 'Send a caravan'),
      h('h3', null, 'Where to?'),
      h('div', { class: 'row' }, [...f2.cities].map((c) => h('button', { class: 'btn small' + (st.city === c ? ' primary' : ''), onclick: () => { st.city = c; refreshSheet(); } },
        byId.cities[c].name, h('span', { class: 'small', style: { fontWeight: 400 } }, ` ${byId.cities[c].hours}h`)))),
      G.market && G.market.cities[st.city] ? h('p', { class: 'small' }, G.market.cities[st.city].news) : null,
      h('h3', null, 'Merchants'), dwarfPicker(merchants, st.merchants, (x) => `trading ${d.dwarves[x.id].skills.trading}${x.traits.includes('greedy') ? ', greedy' : ''}`, refreshSheet),
      h('h3', null, 'Guards (optional)'), dwarfPicker(guards, st.guards, (x) => 'power ' + fmt(d.dwarves[x.id].power), refreshSheet),
      h('p', { class: 'small ' + (guardPower >= bandit ? 'good-t' : 'warn-t') }, `${Math.round(city.danger * 100)}% chance of bandits on each leg (strength ~${fmt(bandit)}). Your caravan: ${fmt(guardPower)}.`),
      h('h3', null, `Cargo ${units} / ${cap}`),
      goods.map((k) => h('div', { class: 'row', style: { margin: '3px 0' } }, goodIcon(k),
        h('span', { class: 'grow small' }, goodName(k), h('br'), h('span', { class: 'muted' }, `have ${fmt(f2.stock[k])} · ~${sellPrice(st.city, k).toFixed(1)} each `, trend(k))),
        h('input', { type: 'number', min: 0, max: f2.stock[k], value: st.cargo[k] || '', placeholder: '0', onchange: (e) => setQ(k, e.target.value) }),
        h('button', { class: 'btn small ghost', onclick: () => setQ(k, Math.min(f2.stock[k], (st.cargo[k] || 0) + Math.max(0, cap - units))) }, 'Max'))),
      f2.artifacts.length ? [h('h3', null, 'Artifacts'), f2.artifacts.map((a) => h('label', { class: 'pick' + (st.arts.has(a.id) ? ' on' : '') },
        h('input', { type: 'checkbox', checked: st.arts.has(a.id), onchange: () => { st.arts.has(a.id) ? st.arts.delete(a.id) : st.arts.add(a.id); refreshSheet(); } }),
        img(S.artifact()), h('span', { class: 'grow' }, a.name), h('span', { class: 'gold-t' }, '~' + fmt(a.value))))] : null,
      h('h3', null, 'Buy on the way back'),
      h('div', { class: 'row' },
        h('select', { onchange: (e) => { st.buyKey = e.target.value; refreshSheet(); } }, buyable.map((k) => h('option', { value: k, selected: st.buyKey === k }, goodName(k)))),
        h('span', { class: 'small muted' }, `~${buyPrice(st.city, st.buyKey).toFixed(1)} each`),
        h('button', { class: 'btn small', onclick: () => { st.buy[st.buyKey] = (st.buy[st.buyKey] || 0) + 10; refreshSheet(); } }, '+10')),
      Object.entries(st.buy).map(([k, v]) => h('div', { class: 'row small' }, goodIcon(k, 'icon s'), h('span', { class: 'grow' }, `${v} ${goodName(k)}`),
        h('button', { class: 'btn small ghost', 'aria-label': 'Remove', onclick: () => { delete st.buy[k]; refreshSheet(); } }, ico('close')))),
      h('label', null, 'Coins to take for buying (max)', h('input', { type: 'number', min: 0, max: Math.floor(f2.coins), value: st.budget || '', placeholder: '0',
        onchange: (e) => { st.budget = Math.max(0, Math.min(Math.floor(f2.coins), Math.floor(+e.target.value || 0))); refreshSheet(); } })),
      h('div', { class: 'card sub' },
        h('p', null, 'Estimated sale at today\'s price: ', h('b', { class: 'gold-t' }, fmt(est) + ' coins')),
        h('p', { class: 'small muted' }, `Arrives in ${city.hours}h, back in ${city.hours * 2}h. Selling many of one kind lowers its price.`)),
      h('button', { class: 'btn big primary', disabled: !st.merchants.size || units > cap || (!units && !st.arts.size && !Object.keys(st.buy).length),
        onclick: async () => {
          try {
            await bus.act({ type: 'caravan', city: st.city, merchants: [...st.merchants], guards: [...st.guards], cargo: st.cargo, artifacts: [...st.arts], buy: st.buy, budget: st.budget }, false, true);
            closeSheet();
            toast('The caravan is on its way.', 'good');
          } catch (e) { toast(e.message, 'bad'); }
        } }, 'Send caravan'));
  });
}

// ================================================================== expeditions

export function renderExplore() {
  const f = F(), d = D(), t = now();
  const out = [];
  const active = f.expeditions.filter((e) => e.state === 'active');
  out.push(...reportCards('expedition'));
  out.push(h('p', { class: 'small muted' }, `Expeditions: ${active.length} / ${d.expeditionSlots} out. Up to ${d.partyMax} dwarves per party. `
    + 'Dwarves can be hurt or die out there. Bring supplies and good gear.'));

  for (const e of active) {
    const next = e.stages[e.next];
    const party = e.party.map((id) => f.dwarves.find((x) => x.id === id)).filter(Boolean);
    out.push(h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('h3', null, e.name), h('span', { class: 'nowrap' }, 'back in ', h('b', { 'data-until': e.returnAt }, dur(e.returnAt - t)))),
      h('div', { class: 'row' }, party.map((x) => h('span', { title: x.first + ' ' + x.clan }, img(S.portrait(x, 'walk')), h('span', { class: 'small' }, ` ${x.first} `), h('span', { class: 'small nowrap ' + (x.health < 50 ? 'bad-t' : 'muted') }, ico('heart', 'icon xs'), Math.round(x.health))))),
      h('div', { class: 'stages' }, e.stages.map((s, i) => h('i', { class: s.done ? 'done' : i === e.next && s.kind === 'choice' ? 'choice' : '' }))),
      next && next.kind === 'choice' ? h('div', { class: 'card sub' },
        h('p', null, h('b', null, 'Ahead: '), next.prompt),
        h('p', { class: 'small muted' }, 'Decide before they get there in ', h('span', { 'data-until': next.at }, dur(next.at - t)), ', or the leader decides.'),
        h('div', { class: 'list' },
          h('button', { class: 'btn small' + (next.chosen === 'a' ? ' primary' : ''), onclick: () => bus.act({ type: 'choice', expedition: e.id, option: 'a' }) }, next.optA),
          h('button', { class: 'btn small' + (next.chosen === 'b' ? ' primary' : ''), onclick: () => bus.act({ type: 'choice', expedition: e.id, option: 'b' }) }, next.optB))) : null,
      h('div', null, e.log.slice(-6).map((l) => h('div', { class: 'log-line' }, l)))));
  }

  out.push(h('h2', null, 'Where to go'));
  const offers = f.offers.slice().sort((a, b) => (b.fixed ? 1 : 0) - (a.fixed ? 1 : 0));
  if (!offers.length) out.push(h('p', { class: 'muted' }, 'No leads right now. New rumours come in every few hours.'));
  for (const o of offers) {
    out.push(h('div', { class: 'card' + (o.fixed ? ' good' : '') },
      h('div', { class: 'row between' }, h('h3', null, o.name), skulls(o.danger)),
      h('p', { class: 'small' }, o.desc),
      h('p', { class: 'small muted' }, `${o.hours}h · recommended party power ${fmt(o.recPower)}`, o.expires ? [' · gone in ', h('span', { 'data-until': o.expires }, dur(o.expires - t))] : ' · story'),
      h('button', { class: 'btn primary small', disabled: active.length >= d.expeditionSlots, onclick: () => expeditionSheet(o) }, 'Prepare')));
  }

  const done = f.expeditions.filter((e) => e.state !== 'active');
  if (done.length) {
    out.push(h('h2', null, 'Reports'));
    for (const e of done.slice().reverse()) out.push(h('div', { class: 'card ' + (e.state === 'lost' ? 'bad' : 'sub') },
      h('div', { class: 'row between' }, h('h3', null, e.name), h('button', { class: 'btn small ghost', 'aria-label': 'Dismiss report', onclick: () => bus.act({ type: 'dismissExpedition', id: e.id }) }, ico('close'))),
      e.log.map((l) => h('div', { class: 'log-line' }, l))));
  }
  return out;
}

function expeditionSheet(o) {
  const st = { party: new Set(), food: null, ale: null };
  openSheet(() => {
    const f = F(), d = D();
    const free = f.dwarves.filter((x) => !x.busy).sort((a, b) => d.dwarves[b.id].power - d.dwarves[a.id].power);
    const need = Math.ceil(st.party.size * o.hours / 2);
    const food = st.food ?? need, ale = st.ale ?? need;
    const power = [...st.party].reduce((s, id) => s + d.dwarves[id].power, 0);
    const lead = [...st.party][0] ? f.dwarves.find((x) => x.id === [...st.party][0]) : null;
    return h('div', null, h('h2', null, o.name), skulls(o.danger), h('p', { class: 'small' }, o.desc),
      h('p', { class: 'small muted' }, `${o.hours} hours. The first dwarf you pick leads and decides when you don't.`),
      h('h3', null, `Party ${st.party.size} / ${d.partyMax}`),
      dwarfPicker(free, st.party, (x) => `power ${fmt(d.dwarves[x.id].power)} · health ${Math.round(x.health)} · ${x.job}`, () => {
        if (st.party.size > d.partyMax) st.party.delete([...st.party].pop());
        refreshSheet();
      }),
      lead ? h('p', { class: 'small' }, 'Leader: ', h('b', null, lead.first), lead.traits.map((t) => h('span', { class: 'chip' }, byId.traits[t].name))) : null,
      h('p', null, 'Party power ', h('b', { class: power >= o.recPower ? 'good-t' : 'warn-t' }, fmt(power)), ` / recommended ${fmt(o.recPower)}`),
      h('h3', null, 'Supplies'),
      h('p', { class: 'small muted' }, `Needed: ${need} mushrooms and ${need} ale. Short supplies hurt the party; extra helps a little.`),
      h('div', { class: 'row' },
        h('label', null, `Mushrooms (have ${stock('food')})`, h('input', { type: 'number', min: 0, value: food, onchange: (e) => { st.food = Math.max(0, +e.target.value || 0); refreshSheet(); } })),
        h('label', null, `Ale (have ${stock('ale')})`, h('input', { type: 'number', min: 0, value: ale, onchange: (e) => { st.ale = Math.max(0, +e.target.value || 0); refreshSheet(); } }))),
      h('button', { class: 'btn big primary', disabled: !st.party.size, onclick: async () => {
        try {
          await bus.act({ type: 'expedition', offer: o.id, party: [...st.party], food, ale }, false, true);
          closeSheet();
          toast('The party sets out.', 'good');
        } catch (e) { toast(e.message, 'bad'); }
      } }, 'Set out'));
  });
}

export { isItem };
