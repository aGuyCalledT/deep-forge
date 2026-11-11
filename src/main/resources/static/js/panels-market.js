// The market: every good with its price and a trend line, and per good which city pays what.
// Prices come from the server (/api/market); the client only draws them.
import { G, F, D, byId, fmt, goodName, refGood, cityMult, marketPower, moneyText, isBar } from './data.js';
import { h, goodIcon, openSheet, refreshSheet, bus, ico, money, info } from './ui.js';
import { api } from './api.js';

const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  for (const k of kids.flat()) if (k) el.append(k);
  return el;
}

/** Price of one reference unit right now: world price, or one city's. */
export function worldPrice(mk) {
  const g = G.market && G.market.goods[mk];
  return g ? g.base * g.mult : 0;
}

/** Change over the last 24 hours, -0.12 = 12% down. */
export function dayChange(mk) {
  const g = G.market && G.market.goods[mk];
  if (!g || !g.day || g.day.length < 2) return 0;
  return g.mult / g.day[0] - 1;
}

/** A small trend line for a list row: the last day of the world price. */
export function sparkline(values, w = 64, ht = 22) {
  if (!values || values.length < 2) return s('svg', { class: 'spark', width: w, height: ht, 'aria-hidden': 'true' });
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || hi * 0.02 || 1;
  const pts = values.map((v, i) => [2 + (i / (values.length - 1)) * (w - 6), 2 + (1 - (v - lo) / span) * (ht - 4)]);
  const up = values[values.length - 1] >= values[0];
  const [ex, ey] = pts[pts.length - 1];
  return s('svg', { class: 'spark ' + (up ? 'up' : 'down'), width: w, height: ht, viewBox: `0 0 ${w} ${ht}`, 'aria-hidden': 'true' },
    s('polyline', { points: pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ') }),
    s('circle', { cx: ex.toFixed(1), cy: ey.toFixed(1), r: 2.2 }));
}

/** "+4.2%" in the right colour, with an arrow icon. */
export function changeTag(c) {
  const flat = Math.abs(c) < 0.005;
  return h('span', { class: 'chg ' + (flat ? 'flat' : c > 0 ? 'up' : 'down') },
    flat ? null : ico(c > 0 ? 'trend_up' : 'trend_down', 'icon xs'), (c > 0 ? '+' : '') + (c * 100).toFixed(1) + '%');
}

// ------------------------------------------------------------------ the list

const FILTERS = [
  ['yours', 'In store'], ['goods', 'Goods'], ['bars', 'Bars'], ['ore', 'Ore'], ['other', 'Other'],
];
let filter = null;

function kind(mk) {
  if (mk.startsWith('type:') || mk.startsWith('cat:')) return 'goods';
  if (isBar(mk)) return 'bars';
  if (byId.ores[mk]) return 'ore';
  return 'other';
}

/** The market list for the Trade tab. */
export function marketList() {
  if (!G.market) return h('p', { class: 'muted' }, 'Asking around for prices...');
  const counts = D().depot.stock || {};
  const keys = Object.keys(G.market.goods);
  if (!filter) filter = Object.keys(counts).length ? 'yours' : 'goods';
  const shown = keys.filter((k) => (filter === 'yours' ? counts[k] > 0 : kind(k) === filter))
    .sort((a, b) => (filter === 'yours' ? worldPrice(b) * counts[b] - worldPrice(a) * counts[a] : worldPrice(b) - worldPrice(a)));
  return h('div', { class: 'market' },
    h('div', { class: 'seg', role: 'tablist' }, FILTERS.map(([id, label]) => h('button', {
      class: 'btn small' + (filter === id ? ' primary' : ''), role: 'tab', 'aria-selected': filter === id ? 'true' : 'false',
      onclick: () => { filter = id; bus.render(); } }, label))),
    shown.length ? h('div', { class: 'mkt-list' }, shown.map((k) => marketRow(k, counts[k] || 0)))
      : h('p', { class: 'small muted' }, filter === 'yours' ? 'Nothing to sell yet. Mine, smelt and forge.' : 'Nothing here.'));
}

function marketRow(mk, have) {
  const g = G.market.goods[mk];
  return h('button', { class: 'mkt-row', onclick: (e) => goodSheet(mk, e.currentTarget), 'aria-label': `${g.name}: ${moneyText(worldPrice(mk))}` },
    goodIcon(refGood(mk), 'icon'),
    h('span', { class: 'mkt-name' }, h('b', null, g.name), have ? h('small', null, `${fmt(have)} in store`) : null),
    sparkline(g.day),
    h('span', { class: 'mkt-price' }, money(worldPrice(mk)), changeTag(dayChange(mk))));
}

// ------------------------------------------------------------------ one good

/** What a reference unit is, for the note under the title. */
function refNote(mk) {
  if (mk.startsWith('type:')) return `Prices for a common ${goodName(refGood(mk)).toLowerCase().replace(/^common /, '')}. Better metal, quality and finish sell for more, at the same rate.`;
  if (mk === 'cat:clothing') return 'Prices for a linen shirt. Finer clothes sell for more, at the same rate.';
  return null;
}

/** The detail window of a good: a week of prices, every city's price, and what to do about it. */
export function goodSheet(mk, anchor) {
  const st = { hist: null, city: null };
  api.get('/market/good?key=' + encodeURIComponent(mk)).then((d) => { st.hist = d; refreshSheet(); }).catch(() => {});
  openSheet(() => {
    const g = G.market.goods[mk], f = F();
    const cities = Object.keys(G.market.cities);
    const pays = (c) => g.base * cityMult(c, mk) * (G.market.sellBonus || 1);
    const asks = (c) => g.base * cityMult(c, mk) * G.market.buySpread / (G.market.buyBonus || 1);
    const known = cities.filter((c) => f.cities.includes(c));
    const best = known.slice().sort((a, b) => pays(b) - pays(a))[0];
    if (!st.city) st.city = best || cities[0];
    const share = (D().depot.shares || {})[mk] ?? D().depot.startShare;
    const have = (D().depot.stock || {})[mk] || 0;
    const cityTrend = (c) => {
      const l = st.hist && st.hist.cities[c];
      return l && l.length > 12 ? cityMult(c, mk) / l[l.length - 13] - 1 : 0;
    };
    return h('div', { class: 'good-sheet' },
      h('h2', null, goodIcon(refGood(mk), 'icon'), ' ', g.name),
      refNote(mk) ? h('p', { class: 'small muted' }, refNote(mk)) : null,
      h('div', { class: 'row between' },
        h('span', null, 'World price ', money(worldPrice(mk), 'big'), ' ', changeTag(dayChange(mk))),
        h('span', { class: 'small muted' }, 'Base ', money(g.base))),
      priceChart(st, g, mk),
      h('table', { class: 'cities' },
        h('tr', null, h('th', null, 'City'), h('th', { class: 'num' }, 'Pays'), h('th', { class: 'num' }, 'Sells'), h('th', { class: 'num' }, '12h')),
        cities.map((c) => {
          const city = byId.cities[c], k = f.cities.includes(c);
          return h('tr', { class: (k ? '' : 'dim ') + (c === st.city ? 'sel' : ''), onclick: () => { st.city = c; refreshSheet(); } },
            h('td', null, h('b', null, city.name), h('br'), h('small', { class: 'muted' }, k ? `${city.hours}h away` : 'Road unknown')),
            h('td', { class: 'num' + (c === best ? ' best' : '') }, money(pays(c))),
            h('td', { class: 'num' }, money(asks(c))),
            h('td', { class: 'num' }, changeTag(cityTrend(c))));
        })),
      h('p', { class: 'small muted' }, 'Tap a city to draw its prices. ', info('Selling drops the price there, and a little everywhere, by that city\'s share of the market. Buying raises it.')),
      h('div', { class: 'card sub row' },
        h('span', { class: 'grow' }, 'Your share of this market ', h('b', { class: 'gold-t' }, (share * 100).toFixed(1) + '%'),
          info('Your share grows with what you sell and buy here, and fades over a week or two. The bigger it is, the harder your trades move the price: now ×' + marketPower(mk).toFixed(1) + '.')),
        have ? h('span', { class: 'small' }, `${fmt(have)} in store`) : null),
      h('div', { class: 'row wrap' },
        have && known.length ? h('button', { class: 'btn primary', onclick: () => bus.caravanTo && bus.caravanTo(best, mk) }, 'Send a caravan') : null,
        D().depot && bus.buyOrder && !mk.startsWith('type:') && mk !== 'cat:clothing' && refGood(mk) !== 'cut_gem'
          ? h('button', { class: 'btn', onclick: () => bus.buyOrder(mk) }, 'Post a buy order') : null,
        D().depot && bus.newRule ? h('button', { class: 'btn', onclick: () => bus.newRule(mk) }, 'Make a rule') : null));
  }, anchor || null, 'trade');
}

/** A week of prices: the world price and the chosen city, with a crosshair that reads out both. */
function priceChart(st, g, mk) {
  const W = 340, H = 150, L = 6, R = 6, T = 10, B = 18;
  const wrap = h('div', { class: 'chart' });
  if (!st.hist) { wrap.append(h('p', { class: 'small muted' }, 'Reading the ledgers...')); return wrap; }
  const world = st.hist.world || [], city = st.hist.cities[st.city] || [];
  const spanSec = Math.max(world.length * st.hist.histEvery, city.length * st.hist.cityEvery, 6 * 3600);
  const series = [
    { name: 'World', cls: 'world', every: st.hist.histEvery, values: [...world, g.mult] },
    { name: byId.cities[st.city].name, cls: 'city', every: st.hist.cityEvery, values: [...city, cityMult(st.city, mk)] },
  ].filter((x) => x.values.length > 1);
  if (!series.length) { wrap.append(h('p', { class: 'small muted' }, 'No prices written down yet. The ledger gets a line every 30 minutes.')); return wrap; }
  const all = series.flatMap((x) => x.values).concat([1]);
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.12 || 0.05;
  lo = Math.max(0, lo - pad); hi += pad;
  const X = (age) => L + (1 - age / spanSec) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const pts = (x) => x.values.map((v, i) => [X((x.values.length - 1 - i) * x.every), Y(v)]);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'price-chart', role: 'img', 'aria-label': `${g.name}: prices over the last week` });
  // the base price, and a line per day
  svg.append(s('line', { class: 'base', x1: L, x2: W - R, y1: Y(1), y2: Y(1) }), s('text', { class: 'lbl', x: W - R, y: Y(1) - 3, 'text-anchor': 'end' }, 'base'));
  for (let d = 1; d * 86400 < spanSec; d++) {
    const x = X(d * 86400);
    svg.append(s('line', { class: 'grid', x1: x, x2: x, y1: T, y2: H - B }), s('text', { class: 'lbl', x, y: H - 5, 'text-anchor': 'middle' }, d + 'd'));
  }
  svg.append(s('text', { class: 'lbl', x: W - R, y: H - 5, 'text-anchor': 'end' }, 'now'));
  for (const x of series) {
    const p = pts(x);
    svg.append(s('polyline', { class: 'ln ' + x.cls, points: p.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' ') }));
    const [ex, ey] = p[p.length - 1];
    svg.append(s('circle', { class: 'dot ' + x.cls, cx: ex, cy: ey, r: 3.5 }));
  }
  // crosshair
  const cross = s('line', { class: 'cross', y1: T, y2: H - B, x1: -10, x2: -10 });
  const tip = h('div', { class: 'chart-tip', hidden: true });
  svg.append(cross);
  const read = (ev) => {
    const r = svg.getBoundingClientRect();
    const x = Math.max(L, Math.min(W - R, ((ev.clientX - r.left) / r.width) * W));
    const age = (1 - (x - L) / (W - L - R)) * spanSec;
    cross.setAttribute('x1', x); cross.setAttribute('x2', x);
    const rows = series.map((sr) => {
      const i = Math.round(sr.values.length - 1 - age / sr.every);
      const v = sr.values[Math.max(0, Math.min(sr.values.length - 1, i))];
      return h('div', { class: 'tip-row' }, h('i', { class: 'key ' + sr.cls }), sr.name, ' ', money(g.base * v));
    });
    const hrs = Math.round(age / 3600);
    tip.replaceChildren(h('div', { class: 'small muted' }, hrs < 1 ? 'now' : hrs < 48 ? hrs + 'h ago' : Math.round(hrs / 24) + ' days ago'), ...rows);
    tip.hidden = false;
    tip.style.left = Math.min(r.width - 150, Math.max(0, (x / W) * r.width - 75)) + 'px';
  };
  svg.addEventListener('pointermove', read);
  svg.addEventListener('pointerdown', read);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('x1', -10); cross.setAttribute('x2', -10); });
  wrap.append(svg, tip,
    h('div', { class: 'legend' }, series.map((x) => h('span', null, h('i', { class: 'key ' + x.cls }), x.name)),
      h('span', { class: 'small muted' }, `${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}% of base`)));
  return wrap;
}

