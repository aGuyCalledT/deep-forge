// The trade depot: your market share, saved caravans, rules that send them on their own, and buy orders posted to
// the cities. The server runs the rules and orders every minute; this only edits them.
import { G, F, D, byId, fmt, goodName, now, dur, marketName, refGood, MARK, moneyWords, building, buyPrice } from '../core/data.js';
import { h, goodIcon, openSheet, refreshSheet, bus, ico, money, info, toast, bar, hourglass } from '../ui/ui.js';
import { sparkline, goodSheet } from './market.js';
import { loadMarket } from './trade.js';

const pct = (x) => (x * 100).toFixed(x < 0.1 ? 2 : 1) + '%';

/** All market keys in a sensible order: goods first, then bars, ore and the rest. */
function marketKeys() {
  const ks = G.market ? Object.keys(G.market.goods) : [];
  const rank = (k) => (k.startsWith('type:') || k.startsWith('cat:') ? 0 : k.startsWith('bar:') ? 1 : byId.ores[k] ? 2 : 3);
  return ks.sort((a, b) => rank(a) - rank(b) || marketName(a).localeCompare(marketName(b)));
}

const BUYABLE = () => [...G.data.metals.map((m) => 'bar:' + m.id), ...G.data.ores.map((o) => o.id), 'coal', 'limestone', 'stone', 'food', 'ale', 'rough_gem', 'cloth'];

async function act(a, ok) {
  try { await bus.act(a, false, true); if (ok) toast(ok, 'good'); return true; } catch (e) { toast(e.message, 'bad'); return false; }
}

// ------------------------------------------------------------------ the depot window

export function openDepotSheet(anchor) {
  loadMarket();
  openSheet(() => {
    const f = F(), d = D(), dep = d.depot, b = building('trade_depot');
    if (!b || b.level <= 0) return h('div', null, h('h2', null, 'Trade depot'), h('p', null, 'Build the trade depot first.'));
    const top = Object.entries(dep.shares || {}).sort((x, y) => y[1] - x[1]).slice(0, 5);
    return h('div', { class: 'depot' },
      h('h2', null, 'Trade depot', info('Caravans leave from here. Rules send saved caravans on their own when enough goods are ready. Buy orders tell the cities what you would buy, and at what price.')),
      // market share
      h('div', { class: 'card' },
        h('div', { class: 'row between' }, h('h3', { style: { margin: 0 } }, 'Your market share ', info('Everyone starts at 1%. It grows with what you sell and buy over about a week, and the bigger it is, the harder your trades move the prices.')), h('b', { class: 'gold-t share-num' }, pct(dep.share))),
        h('div', { class: 'row' }, h('span', { class: 'grow' }, bar(Math.min(1, dep.share / 0.25))), sparkline(f.shareHist && f.shareHist.length > 1 ? f.shareHist : null, 80, 24)),
        top.length ? h('div', { class: 'share-list' }, top.map(([k, v]) => h('button', { class: 'chip', onclick: (e) => goodSheet(k, e.currentTarget) },
          goodIcon(refGood(k), 'icon xs'), ' ', marketName(k), ' ', h('b', null, pct(v))))) : null),
      // saved caravans
      section('Saved caravans', `${f.plans.length} / ${dep.maxPlans}`,
        f.plans.map((p) => h('div', { class: 'card sub depot-row' },
          h('div', { class: 'grow' }, h('b', null, p.name),
            h('div', { class: 'small muted' }, `${p.merchants} merchant${p.merchants === 1 ? '' : 's'}, ${p.guards} guard${p.guards === 1 ? '' : 's'}`),
            h('div', { class: 'small' }, Object.entries(p.load).map(([k, keep]) => h('span', { class: 'chip' }, goodIcon(refGood(k), 'icon xs'), ' ', marketName(k), keep ? ` · keep ${fmt(keep)}` : '')))),
          h('button', { class: 'btn small', onclick: () => planSheet(p) }, 'Edit'),
          h('button', { class: 'btn small ghost', 'aria-label': 'Delete ' + p.name, onclick: () => act({ type: 'deletePlan', id: p.id }) }, ico('close')))),
        f.plans.length < dep.maxPlans ? h('button', { class: 'btn', onclick: () => planSheet(null) }, ico('plus'), 'New caravan') : h('p', { class: 'small muted' }, 'Upgrade the depot to keep more caravans.')),
      // rules
      section('Rules', `${f.rules.length} / ${dep.maxRules}`,
        f.rules.map((x) => ruleRow(x)),
        !f.plans.length ? h('p', { class: 'small muted' }, 'Save a caravan first, then a rule can send it.')
          : f.rules.length < dep.maxRules ? h('button', { class: 'btn', onclick: () => ruleSheet(null) }, ico('plus'), 'New rule') : h('p', { class: 'small muted' }, 'Upgrade the depot for more rules.')),
      // buy orders
      section('Buy orders', `${f.orders.length} / ${dep.maxOrders}`,
        f.orders.map((o) => orderRow(o)),
        f.deliveries.length ? h('div', null, h('h3', null, 'On the way to you'), f.deliveries.map((x) => h('div', { class: 'card sub row' },
          hourglass({ from: x.arriveAt - byId.cities[x.city].hours * 3600, to: x.arriveAt }), goodIcon(x.good, 'icon s'),
          h('span', { class: 'grow small' }, `${x.qty} ${goodName(x.good).toLowerCase()} from ${byId.cities[x.city].name}`, h('br'), 'pay ', money(x.cost), ' on arrival'),
          h('span', { class: 'small nowrap', 'data-until': x.arriveAt }, dur(x.arriveAt - now()))))) : null,
        f.orders.length < dep.maxOrders ? h('button', { class: 'btn', onclick: () => orderSheet(null) }, ico('plus'), 'New buy order') : h('p', { class: 'small muted' }, 'Upgrade the depot for more orders.')));
  }, anchor || null, 'trade');
}

function section(title, count, ...kids) {
  return h('div', { class: 'depot-sec' }, h('div', { class: 'row between' }, h('h3', null, title), h('span', { class: 'small muted' }, count)), ...kids);
}

/** IF [axes] >= 100 THEN send [axe run] to [Ironmarch] */
function ruleRow(x) {
  const p = F().plans.find((q) => q.id === x.plan);
  const have = (D().depot.stock || {})[x.good] || 0;
  return h('div', { class: 'card sub rule' + (x.on ? '' : ' off') },
    h('div', { class: 'rule-line' },
      h('span', { class: 'kw' }, 'If'), goodIcon(refGood(x.good), 'icon xs'), h('b', null, marketName(x.good)), h('span', { class: 'kw' }, 'reach'), h('b', null, fmt(x.atLeast)),
      h('span', { class: 'kw' }, 'send'), h('b', null, p ? p.name : '?'), h('span', { class: 'kw' }, 'to'), h('b', null, byId.cities[x.city].name)),
    bar(Math.min(1, have / x.atLeast)),
    h('div', { class: 'row' },
      h('span', { class: 'grow small ' + (x.caravan ? 'good-t' : 'muted') }, x.status || (x.on ? 'Checks every minute.' : 'Paused.'), x.fired ? ` Sent ${x.fired}×.` : ''),
      h('button', { class: 'btn small', onclick: () => act({ type: 'toggleRule', id: x.id }) }, x.on ? 'Pause' : 'Resume'),
      h('button', { class: 'btn small', onclick: () => ruleSheet(x) }, 'Edit'),
      h('button', { class: 'btn small ghost', 'aria-label': 'Delete rule', onclick: () => act({ type: 'deleteRule', id: x.id }) }, ico('close'))));
}

function orderRow(o) {
  return h('div', { class: 'card sub' },
    h('div', { class: 'row' }, goodIcon(o.good, 'icon s'),
      h('span', { class: 'grow' }, h('b', null, `${fmt(o.left)} ${goodName(o.good).toLowerCase()}`), ' up to ', money(o.maxPrice), ' each'),
      h('button', { class: 'btn small', onclick: () => orderSheet(o) }, 'Edit'),
      h('button', { class: 'btn small ghost', 'aria-label': 'Delete order', onclick: () => act({ type: 'deleteOrder', id: o.id }) }, ico('close'))),
    h('div', { class: 'small muted' }, 'Keeps ', money(o.keepCoins), ' in the vault', o.bought ? ` · bought ${fmt(o.bought)} for ` : '', o.bought ? money(o.spent) : null),
    o.status ? h('div', { class: 'small ' + (o.status.startsWith('Traders') ? 'good-t' : 'warn-t') }, o.status) : null);
}

// ------------------------------------------------------------------ forms

function select(options, value, onchange) {
  return h('select', { onchange: (e) => onchange(e.target.value) }, options.map(([v, label]) => h('option', { value: v, selected: v === value }, label)));
}

function stepper(value, min, max, onchange, label) {
  return h('div', { class: 'stepper', role: 'group', 'aria-label': label },
    h('button', { class: 'btn small', 'aria-label': 'Fewer', disabled: value <= min, onclick: () => onchange(value - 1) }, ico('minus')),
    h('b', null, value),
    h('button', { class: 'btn small', 'aria-label': 'More', disabled: value >= max, onclick: () => onchange(value + 1) }, ico('plus')));
}

/** A money field in Marks (two decimals = Talents), shown back as coins. */
function moneyField(label, jots, onchange) {
  return h('label', null, label,
    h('div', { class: 'row' },
      h('input', { type: 'number', min: 0, step: 0.01, inputmode: 'decimal', value: jots ? +(jots / MARK).toFixed(2) : '', placeholder: '0',
        onchange: (e) => onchange(Math.max(0, Math.round((+e.target.value || 0) * MARK))) }),
      h('span', { class: 'small muted' }, 'Marks'), money(jots || 0)));
}

export function planSheet(p, preset) {
  const st = p ? { id: p.id, name: p.name, merchants: p.merchants, guards: p.guards, load: { ...p.load } }
    : { name: preset ? marketName(preset) + ' run' : 'Caravan ' + (F().plans.length + 1), merchants: 1, guards: 0, load: preset ? { [preset]: 0 } : {} };
  let pick = preset || marketKeys()[0];
  openSheet(() => h('div', null,
    h('h2', null, p ? 'Edit caravan' : 'Save a caravan'),
    h('label', null, 'Name', h('input', { type: 'text', maxlength: 24, value: st.name, oninput: (e) => { st.name = e.target.value; } })),
    h('div', { class: 'row between' }, h('span', null, 'Merchants'), stepper(st.merchants, 1, 6, (v) => { st.merchants = v; refreshSheet(); }, 'Merchants')),
    h('div', { class: 'row between' }, h('span', null, 'Guards'), stepper(st.guards, 0, 6, (v) => { st.guards = v; refreshSheet(); }, 'Guards')),
    h('p', { class: 'small muted' }, `Each merchant carries ${D().caravanCapacity} goods. Free merchants and warriors are picked when it leaves; guards from the entrance hall go last.`),
    h('h3', null, 'Load'),
    Object.entries(st.load).map(([k, keep]) => h('div', { class: 'row' }, goodIcon(refGood(k), 'icon s'), h('span', { class: 'grow' }, marketName(k)),
      h('label', { class: 'inline small' }, 'keep', h('input', { type: 'number', min: 0, value: keep || '', placeholder: '0', style: { width: '72px' },
        onchange: (e) => { st.load[k] = Math.max(0, Math.floor(+e.target.value || 0)); } })),
      h('button', { class: 'btn small ghost', 'aria-label': 'Remove ' + marketName(k), onclick: () => { delete st.load[k]; refreshSheet(); } }, ico('close')))),
    Object.keys(st.load).length < 6 ? h('div', { class: 'row' },
      select(marketKeys().filter((k) => !(k in st.load)).map((k) => [k, marketName(k)]), pick, (v) => { pick = v; }),
      h('button', { class: 'btn small', onclick: () => { const k = pick in st.load ? marketKeys().find((x) => !(x in st.load)) : pick; if (k) st.load[k] = 0; refreshSheet(); } }, ico('plus'), 'Add')) : null,
    h('p', { class: 'small muted' }, 'It takes everything above "keep", the most valuable first.'),
    h('button', { class: 'btn big primary', disabled: !Object.keys(st.load).length,
      onclick: async () => { if (await act({ type: 'savePlan', ...st }, 'Caravan saved.')) openDepotSheet(); } }, 'Save caravan')), null, 'trade');
}

export function ruleSheet(x, presetGood) {
  const f = F();
  const st = x ? { id: x.id, good: x.good, atLeast: x.atLeast, plan: x.plan, city: x.city, on: x.on }
    : { good: presetGood || marketKeys()[0], atLeast: 100, plan: (f.plans[0] || {}).id, city: [...f.cities][0], on: true };
  openSheet(() => h('div', null,
    h('h2', null, x ? 'Edit rule' : 'New rule'),
    h('div', { class: 'card rule-form' },
      h('label', null, 'If the store has', select(marketKeys().map((k) => [k, marketName(k)]), st.good, (v) => { st.good = v; refreshSheet(); })),
      h('label', null, 'at least', h('input', { type: 'number', min: 1, value: st.atLeast, onchange: (e) => { st.atLeast = Math.max(1, Math.floor(+e.target.value || 1)); } })),
      h('p', { class: 'small muted' }, `You have ${fmt((D().depot.stock || {})[st.good] || 0)} now.`),
      h('label', null, 'then send', select(F().plans.map((p) => [String(p.id), p.name]), String(st.plan), (v) => { st.plan = +v; })),
      h('label', null, 'to', select([...F().cities].map((c) => [c, `${byId.cities[c].name} (${byId.cities[c].hours}h)`]), st.city, (v) => { st.city = v; }))),
    h('p', { class: 'small muted' }, 'It sends the caravan once, and again only after it came back.'),
    h('button', { class: 'btn big primary', disabled: !F().plans.length,
      onclick: async () => { if (await act({ type: 'saveRule', ...st }, 'Rule saved.')) openDepotSheet(); } }, 'Save rule')), null, 'trade');
}

export function orderSheet(o, presetGood) {
  const cheapest = (k) => Math.min(...[...F().cities].map((c) => buyPrice(c, k, G.market ? G.market.buyBonus : 1)));
  const st = o ? { id: o.id, good: o.good, maxPrice: o.maxPrice, qty: o.left, keepCoins: o.keepCoins }
    : { good: presetGood && BUYABLE().includes(presetGood) ? presetGood : 'bar:iron', qty: 50, keepCoins: Math.round(F().coins / 2 / 100) * 100 };
  if (!st.maxPrice) st.maxPrice = Math.round(cheapest(st.good) * 0.95);
  openSheet(() => {
    const now1 = cheapest(st.good);
    return h('div', null,
      h('h2', null, o ? 'Edit buy order' : 'Post a buy order'),
      h('p', { class: 'small muted' }, 'Every city you know hears of it. When one of them sells at your price or less, its traders bring the goods. You pay when they arrive.'),
      h('label', null, 'Buy', select(BUYABLE().map((k) => [k, goodName(k)]), st.good, (v) => { st.good = v; st.maxPrice = Math.round(cheapest(v) * 0.95); refreshSheet(); })),
      h('label', null, 'How many', h('input', { type: 'number', min: 1, value: st.qty, onchange: (e) => { st.qty = Math.max(1, Math.floor(+e.target.value || 1)); } })),
      moneyField('Highest price each', st.maxPrice, (v) => { st.maxPrice = v; refreshSheet(); }),
      h('p', { class: 'small ' + (st.maxPrice >= now1 ? 'good-t' : 'muted') }, 'Cheapest city right now: ', money(now1),
        st.maxPrice >= now1 ? ' - traders would set out at once.' : ' - they wait for the price to drop.'),
      moneyField('Keep at least this much money', st.keepCoins, (v) => { st.keepCoins = v; refreshSheet(); }),
      h('p', { class: 'small muted' }, `Traders bring up to ${D().depot.lot} at a time. Below ${moneyWords(st.keepCoins)} nothing is bought.`),
      h('button', { class: 'btn big primary', onclick: async () => { if (await act({ type: 'saveOrder', ...st }, 'Order posted.')) openDepotSheet(); } }, o ? 'Save order' : 'Post order'));
  }, null, 'trade');
}

// links from the market window
bus.buyOrder = (mk) => orderSheet(null, mk);
bus.newRule = (mk) => (F().plans.length ? ruleSheet(null, mk) : planSheet(null, mk));
bus.depot = (anchor) => openDepotSheet(anchor);
