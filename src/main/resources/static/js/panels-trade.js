// Trade (caravans, cities, prices) and expeditions.
import { G, F, D, byId, fmt, dur, goodName, now, sellPrice, buyPrice, saleEstimate, marketKey, stock, baseValue, isItem } from './data.js';
import { h, img, goodIcon, openSheet, closeSheet, refreshSheet, bus, toast, skulls, dwarfPicker, ico, hourglass, money, info } from './ui.js';
import { marketList } from './panels-market.js';
import { openDepotSheet } from './panels-depot.js';
import { paper, todo } from './paper.js';
import * as S from './sprites.js';
import { api } from './api.js';
import { reportCards } from './collect.js';

let marketAt = 0;

export async function loadMarket(force) {
  if (!force && G.market && Date.now() - marketAt < 60000) return;
  try { G.market = await api.get('/market'); marketAt = Date.now(); bus.render(); } catch { /* ignore */ }
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
    h('div', { class: 'row between' }, h('h3', null, 'Caravans ', info('Merchants carry goods to a city, sell at the price on arrival, buy what you ordered and come back. Roads can be dangerous.')), h('span', { class: 'muted' }, `${f.caravans.length} / ${d.caravanSlots} on the road`)),
    h('button', { class: 'btn primary', disabled: !merchants.length || slots <= 0, onclick: () => caravanSheet() },
      !merchants.length ? 'No free merchant (give a dwarf the merchant job)' : slots <= 0 ? 'All caravan slots busy' : 'Send a caravan')));
  for (const c of f.caravans) {
    const out1 = c.state === 'outbound';
    const end = out1 ? c.arriveAt : c.returnAt;
    const units = Object.values(c.cargo).reduce((s, v) => s + v, 0);
    out.push(h('div', { class: 'card sub row' }, img(S.wagon(0), 'icon l'),
      h('div', { class: 'grow' }, h('b', null, (out1 ? 'To ' : 'Back from ') + byId.cities[c.city].name),
        c.rule ? h('span', { class: 'chip' }, 'by rule') : null,
        h('div', { class: 'small muted' }, out1 ? [`${units} goods`, c.budget ? [', ', money(c.budget), ' to spend'] : null] : ['sold for ', money(c.revenue)])),
      h('span', { class: 'nowrap', 'data-until': end }, dur(end - t))));
  }

  // the depot: share, rules, orders
  const dep = d.depot, depotB = F().buildings.find((b) => b.type === 'trade_depot');
  out.push(h('div', { class: 'card depot-card' },
    h('div', { class: 'row between' }, h('h3', null, 'Trade depot'), h('span', null, 'Market share ', h('b', { class: 'gold-t' }, (dep.share * 100).toFixed(dep.share < 0.1 ? 2 : 1) + '%'))),
    h('p', { class: 'small muted' }, `${f.rules.filter((x) => x.on).length} rule(s) running, ${f.orders.filter((o) => o.left > 0).length} buy order(s) posted, ${f.deliveries.length} delivery(s) on the way.`),
    h('button', { class: 'btn', disabled: !depotB || depotB.level <= 0, onclick: (e) => openDepotSheet(e.currentTarget) }, 'Open the depot')));

  out.push(h('h2', null, 'Market', info('Every city has its own price for each good. They drift on their own, and every sale pushes a price down, every purchase pushes it up. Prices stay between 10% and 1000% of the base price. Tap a good to see which city pays what.')));
  out.push(marketList());

  out.push(h('h2', null, 'Cities'));
  if (G.market) {
    out.push(h('p', { class: 'small muted' }, 'What they want changes in ', h('span', { 'data-until': G.market.nextDemandChange }, dur(G.market.nextDemandChange - t)), '.'));
    for (const cid of f.cities) {
      const c = byId.cities[cid], m = G.market.cities[cid] || {};
      out.push(h('div', { class: 'card sub' },
        h('div', { class: 'row between' }, h('b', null, c.name), h('span', { class: 'small muted' }, `${c.hours}h each way · ${Math.round(c.danger * 100)}% bandits · ${Math.round(c.share * 100)}% of the market`)),
        h('p', { class: 'small' }, m.news || c.note)));
    }
  }
  return out;
}

/** Send a caravan; city and a market key to load can be preset (from the market window). */
export function caravanSheet(city, mk) {
  const f = F();
  const st = { city: city || [...f.cities][0], merchants: new Set(), guards: new Set(), cargo: {}, arts: new Set(), buy: {}, budget: 0, buyKey: 'coal' };
  const first = f.dwarves.find((x) => x.job === 'merchant' && !x.busy);
  if (first) st.merchants.add(first.id);
  if (mk) {
    let room = D().caravanCapacity * Math.max(1, st.merchants.size);
    for (const k of Object.keys(f.stock).filter((x) => marketKey(x) === mk).sort((a, b) => baseValue(b) - baseValue(a))) {
      const q = Math.min(room, f.stock[k]);
      if (q > 0) { st.cargo[k] = q; room -= q; }
    }
  }
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
        h('span', { class: 'grow small' }, goodName(k), h('br'), h('span', { class: 'muted' }, `have ${fmt(f2.stock[k])} · `, money(sellPrice(st.city, k)), ' each')),
        h('input', { type: 'number', min: 0, max: f2.stock[k], value: st.cargo[k] || '', placeholder: '0', onchange: (e) => setQ(k, e.target.value) }),
        h('button', { class: 'btn small ghost', onclick: () => setQ(k, Math.min(f2.stock[k], (st.cargo[k] || 0) + Math.max(0, cap - units))) }, 'Max'))),
      f2.artifacts.length ? [h('h3', null, 'Artifacts'), f2.artifacts.map((a) => h('label', { class: 'pick' + (st.arts.has(a.id) ? ' on' : '') },
        h('input', { type: 'checkbox', checked: st.arts.has(a.id), onchange: () => { st.arts.has(a.id) ? st.arts.delete(a.id) : st.arts.add(a.id); refreshSheet(); } }),
        img(S.artifact()), h('span', { class: 'grow' }, a.name), money(a.value)))] : null,
      h('h3', null, 'Buy on the way back'),
      h('div', { class: 'row' },
        h('select', { onchange: (e) => { st.buyKey = e.target.value; refreshSheet(); } }, buyable.map((k) => h('option', { value: k, selected: st.buyKey === k }, goodName(k)))),
        h('span', { class: 'small muted' }, money(buyPrice(st.city, st.buyKey)), ' each'),
        h('button', { class: 'btn small', onclick: () => { st.buy[st.buyKey] = (st.buy[st.buyKey] || 0) + 10; refreshSheet(); } }, '+10')),
      Object.entries(st.buy).map(([k, v]) => h('div', { class: 'row small' }, goodIcon(k, 'icon s'), h('span', { class: 'grow' }, `${v} ${goodName(k)}`),
        h('button', { class: 'btn small ghost', 'aria-label': 'Remove', onclick: () => { delete st.buy[k]; refreshSheet(); } }, ico('close')))),
      h('label', null, 'Money to take for buying, in Marks', h('div', { class: 'row' }, h('input', { type: 'number', min: 0, step: 0.01, inputmode: 'decimal', value: st.budget ? +(st.budget / 1000).toFixed(2) : '', placeholder: '0',
        onchange: (e) => { st.budget = Math.max(0, Math.min(Math.floor(f2.coins), Math.round((+e.target.value || 0) * 1000))); refreshSheet(); } }), money(st.budget))),
      h('div', { class: 'card sub' },
        h('p', null, 'Estimated sale at today\'s price: ', money(est, 'big')),
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

  // each party out there is a page from its logbook: what they did is ticked off, the next leg is still open
  for (const e of active) {
    const next = e.stages[e.next];
    const party = e.party.map((id) => f.dwarves.find((x) => x.id === id)).filter(Boolean);
    const left = e.stages.length - e.next;
    const items = e.log.slice(-5).map((l) => ({ text: l, done: true }));
    if (next && next.kind !== 'choice') items.push({ text: left > 1 ? `On to the next leg (${left} to go)` : 'The last leg, then home' });
    out.push(paper('exp-' + e.id, { cls: 'expedition' },
      h('div', { class: 'row between', style: { alignItems: 'flex-start', flexWrap: 'nowrap' } },
        h('div', null, h('h3', null, e.name),
          h('div', { class: 'who' }, `${party.length} dwarves · back in `, h('b', { 'data-until': e.returnAt }, dur(e.returnAt - t)))),
        hourglass({ from: e.departAt, to: e.returnAt })),
      h('div', { class: 'row', style: { marginBottom: '6px' } }, party.map((x) => h('span', { class: 'nowrap', title: x.first + ' ' + x.clan },
        img(S.portrait(x, 'walk')), h('span', { class: 'small' }, ` ${x.first} `), h('span', { class: 'small ' + (x.health < 50 ? 'bad-t' : 'muted') }, ico('heart', 'icon xs'), Math.round(x.health))))),
      todo(items),
      next && next.kind === 'choice' ? h('div', { class: 'card' },
        h('p', null, h('b', null, 'Ahead: '), next.prompt),
        h('p', { class: 'small muted' }, 'Decide before they get there in ', h('span', { 'data-until': next.at }, dur(next.at - t)), ', or the leader decides.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn small' + (next.chosen === 'a' ? ' good' : ''), onclick: () => bus.act({ type: 'choice', expedition: e.id, option: 'a' }) }, next.optA),
          h('button', { class: 'btn small' + (next.chosen === 'b' ? ' good' : ''), onclick: () => bus.act({ type: 'choice', expedition: e.id, option: 'b' }) }, next.optB))) : null));
  }

  // rumours are notices pinned to the board
  out.push(h('h2', null, 'Where to go'));
  const offers = f.offers.slice().sort((a, b) => (b.fixed ? 1 : 0) - (a.fixed ? 1 : 0));
  if (!offers.length) out.push(h('p', { class: 'muted' }, 'No leads right now. New rumours come in every few hours.'));
  for (const o of offers) {
    out.push(paper('offer-' + o.id, { nail: true, cls: 'offer' },
      h('div', { class: 'row between' }, h('h3', null, o.name), skulls(o.danger)),
      h('p', null, o.desc),
      h('p', { class: 'small muted' }, `${o.hours}h there and back · take party power ${fmt(o.recPower)}`, o.expires ? [' · gone in ', h('span', { 'data-until': o.expires }, dur(o.expires - t))] : ' · a story lead'),
      h('button', { class: 'btn primary', disabled: active.length >= d.expeditionSlots, title: active.length >= d.expeditionSlots ? 'All parties are out. Wait for one to come back.' : null, onclick: () => expeditionSheet(o) }, 'Prepare')));
  }

  const done = f.expeditions.filter((e) => e.state !== 'active');
  if (done.length) {
    out.push(h('h2', null, 'Reports'));
    for (const e of done.slice().reverse()) out.push(paper('done-' + e.id, { seal: e.state !== 'lost' },
      h('div', { class: 'row between' }, h('h3', { class: e.state === 'lost' ? 'bad-t' : '' }, e.name),
        h('button', { class: 'btn small ghost', 'aria-label': 'Throw the report away', title: 'Throw away', onclick: () => bus.act({ type: 'dismissExpedition', id: e.id }) }, ico('close'))),
      todo(e.log.map((l) => ({ text: l, done: true })))));
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

bus.caravanTo = (city, mk) => caravanSheet(city, mk);
