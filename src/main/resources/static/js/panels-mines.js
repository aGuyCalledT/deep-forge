// The mines: lift, layers, miners.
import { G, F, D, byId, fmt, goodName, building, stock, now, dur, isItem, parseItem } from './data.js';
import { h, img, goodIcon, bar, bus, ico, info, statusIco } from './ui.js';
import { mineLayer } from './mine48.js';
import * as S from './sprites.js';
import { costBtn, upgradeBtn } from './panels-base.js';

export function renderMines() {
  const f = F(), d = D();
  const out = [];
  const total = d.layers.reduce((s, l) => s + l.rate, 0);
  const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy);
  out.push(h('div', { class: 'card' + (f.liftLimited ? ' warn' : '') },
    h('div', { class: 'row between' }, h('h3', null, 'Mine lift'), h('span', { class: f.liftLimited ? 'warn-t' : 'muted' }, `${fmt(Math.min(total, d.liftCap))} of ${fmt(total)} ore/h carried`)),
    bar(Math.min(1, total / Math.max(1, d.liftCap))),
    h('p', { class: 'small muted' }, `The lift carries up to ${fmt(d.liftCap)} ore per hour. Miners can't dig faster than that.`),
    f.liftLimited ? h('p', { class: 'warn-t small' }, 'The lift is the bottleneck. Upgrade it, or move miners to workshops.') : null,
    h('div', { class: 'row between' }, h('span', null, 'Warehouse'), h('span', { class: f.storageFull ? 'bad-t' : '' }, `${fmt(d.used)} / ${fmt(d.capacity)}`)),
    bar(d.used / d.capacity),
    f.storageFull ? h('p', { class: 'bad-t small' }, 'Warehouse full - mining has stopped. Smelt or sell, or upgrade the warehouse.') : null,
    h('div', { class: 'row', style: { marginTop: '8px' } }, upgradeBtn(building('lift')), upgradeBtn(building('warehouse')))));

  // pickaxes: spares in the warehouse, miners on the makeshift pick, swapping by themselves
  const miners = f.dwarves.filter((x) => x.job === 'miner' && !x.busy);
  const spare = Object.entries(f.stock).filter(([k, v]) => v > 0 && isItem(k) && parseItem(k).type === 'pickaxe').reduce((s, [, v]) => s + v, 0);
  const makeshift = miners.filter((x) => !x.tool).length;
  const worn = miners.filter((x) => x.tool && (d.dwarves[x.id].toolLeft ?? 1) < 0.15).length;
  out.push(h('div', { class: 'card' + (makeshift && miners.length ? ' warn' : '') },
    h('div', { class: 'row between' }, h('h3', null, 'Pickaxes ', info(`Every miner carries a free makeshift pick: slow, it never breaks, but it only breaks soft rock. Forged picks dig faster and break rock up to their metal's hardness, but they wear out with work.`)),
      h('span', { class: 'muted small' }, `${fmt(spare)} spare`)),
    makeshift ? h('p', { class: 'warn-t small' }, statusIco('warn', 'icon s'), ` ${makeshift} miner${makeshift === 1 ? ' digs' : 's dig'} with a makeshift pick. Forge pickaxes at the forge.`) : null,
    worn ? h('p', { class: 'small muted' }, `${worn} pick${worn === 1 ? ' is' : 's are'} almost worn out.`) : null,
    h('div', { class: 'row between' }, h('span', { class: 'small' }, 'Miners take a new pick from the warehouse by themselves'),
      h('button', { class: 'btn small' + (f.autoPicks ? ' good' : ''), 'aria-pressed': String(!!f.autoPicks), onclick: () => bus.act({ type: 'autoPicks', on: !f.autoPicks }) }, f.autoPicks ? 'On' : 'Off'))));

  G.data.layers.forEach((layer, i) => {
    const ls = f.layers[i], dl = d.layers[i];
    const th = ls.threat ? f.threats.find((x) => String(x.id) === ls.threat) : null;
    const miners = f.dwarves.filter((x) => x.job === 'miner' && x.layer === i && !x.busy)
      .sort((a, b) => (d.dwarves[b.id].skills.mining || 0) - (d.dwarves[a.id].skills.mining || 0));
    const ores = Object.entries(layer.weights).sort((a, b) => b[1] - a[1]);
    const total = ores.reduce((s, [, w]) => s + w, 0);
    const card = h('div', { class: 'card layer-card' + (th ? ' bad' : '') + (G.focus === 'layer:' + i ? ' good' : ''), id: 'layer-' + i });
    card.append(h('div', { class: 'row between' }, h('h3', null, layer.name,
      h('button', { class: 'btn small', style: { marginLeft: '8px' }, 'aria-label': 'Show this layer', disabled: G.screen === 'mines' && mineLayer() === i, onclick: () => bus.showLayer(i) }, ico('mines'))),
      ls.unlocked ? h('span', { class: 'muted small' }, 'Shaft level ' + ls.level) : h('span', { class: 'muted small' }, ico('lock'), ' Locked')));
    const hard = new Set(dl.tooHard || []);
    card.append(h('div', { class: 'ore-list' }, ores.map(([k, w]) => h('div', { class: 'ore' + (ls.unlocked && hard.has(k) ? ' locked' : ''), title: goodName(k) + ' · hardness ' + rockHard(k) },
      goodIcon(k), h('span', { class: 'nm' }, ls.unlocked && hard.has(k) ? ico('lock') : null, goodName(k)), h('span', { class: 'dim small' }, Math.round(w / total * 100) + '%'), h('b', null, fmt(stock(k)))))));
    if (ls.unlocked) {
      if (hard.size && dl.miners) card.append(h('p', { class: 'warn-t small' }, statusIco('warn', 'icon s'),
        ` ${[...hard].map(goodName).join(', ')}: too hard for your picks. Forge ${pickFor(Math.min(...[...hard].map(rockHard)))} pickaxes.`));
      if (th) card.append(h('p', { class: 'bad-t' }, img(S.monster(th.monster, 0), 'icon'), ` ${th.name} blocks this layer! `,
        h('button', { class: 'btn small danger', onclick: () => bus.go('war') }, 'Send warriors')));
      const inCart = Object.values(ls.cart || {}).reduce((s, v) => s + v, 0), size = dl.cartSize || 10, target = dl.cartTarget || size;
      card.append(h('div', { class: 'row between', style: { marginTop: '6px' } }, h('span', null, 'Ore cart ', info('Miners fill the cart. When it is as full as you set below (or the time is up) it rolls to the lift, and only then is the ore in your warehouse.')),
        h('span', { class: inCart >= target && f.storageFull ? 'bad-t' : 'muted' }, `${fmt(Math.min(inCart, size))} / ${fmt(target)}`)), bar(Math.min(1, inCart / target)));
      card.append(cartRule(i, ls, inCart));
      const veinIn = Math.max(0, (ls.veinAt || 0) - now());
      card.append(h('div', { class: 'row between', style: { marginTop: '6px' } },
        h('span', null, 'Vein ', info(`Break a vein out of the rock yourself: ${dl.veinOre || 10} ore go straight into the cart. A new vein shows every 4 hours, up to 3 wait for you.`)),
        veinIn > 0 && !dl.veins ? h('span', { class: 'muted small' }, 'next in ', h('span', { 'data-until': ls.veinAt }, dur(veinIn)))
          : h('button', { class: 'btn small primary', disabled: !!th, onclick: () => bus.vein(i) }, ico('mines'), dl.veins > 1 ? `Break a vein (${dl.veins})` : 'Break a vein')));
      if (inCart >= target && f.storageFull) card.append(h('p', { class: 'bad-t small' }, 'The cart is ready but the warehouse is full. Make room to send it up.'));
      card.append(h('div', { class: 'row between', style: { marginTop: '6px' } },
        h('span', null, h('b', { class: 'gold-t' }, fmt(dl.rate) + ' ore/h'), h('span', { class: 'muted' }, ` from ${dl.miners} miner${dl.miners === 1 ? '' : 's'}`)),
        h('span', { class: 'row', style: { gap: '6px' } },
          h('button', { class: 'btn small', 'aria-label': 'Take a miner off this layer', disabled: !miners.length,
            onclick: () => bus.act({ type: 'assign', dwarf: miners[miners.length - 1].id, job: 'idle' }) }, ico('minus')),
          h('button', { class: 'btn small good', 'aria-label': 'Send an idle dwarf to dig here', disabled: !idle.length, title: idle.length ? '' : 'No idle dwarves',
            onclick: () => bus.act({ type: 'assign', dwarf: idle[0].id, job: 'miner', layer: i }) }, ico('plus')))));
      if (!idle.length) card.append(h('p', { class: 'small dim' }, 'No idle dwarves to add. Free someone up in the Dwarves tab.'));
      if (miners.length) card.append(h('div', { class: 'miners' }, miners.map((m) => h('span', { class: 'miner', title: `${m.first} ${m.clan} · mining ${d.dwarves[m.id].skills.mining} · ${fmt(d.dwarves[m.id].rate || 0)} ore/h` },
        img(S.portrait(m), 'icon'), h('span', { class: 'small' }, m.first), h('span', { class: 'small dim' }, fmt(d.dwarves[m.id].rate || 0) + '/h')))));
      card.append(costBtn('Improve shafts to level ' + (ls.level + 1), dl.upgrade, { type: 'upgradeLayer', layer: i }));
    } else if (dl.discovered) {
      card.append(h('p', { class: 'small muted' }, layer.note));
      card.append(costBtn('Open the ' + layer.name, dl.unlock, { type: 'unlockLayer', layer: i }, !f.layers[i - 1].unlocked ? 'Open the layer above first.' : null));
    } else {
      card.append(h('p', { class: 'small warn-t' }, 'Nobody knows the way down. Send an expedition to scout it.'),
        h('button', { class: 'btn small', onclick: () => bus.go('explore') }, 'Expeditions'));
    }
    out.push(card);
  });
  return out;
}

/** When the cart goes up: how full it must be, and an optional time limit after the first ore went in. */
const FILLS = [[25, 'a quarter full'], [50, 'half full'], [75, 'three quarters full'], [100, 'full']];
const MINUTES = [[0, 'no time limit'], [5, 'or after 5 min'], [10, 'or after 10 min'], [15, 'or after 15 min'], [30, 'or after 30 min'], [60, 'or after 1 hour']];
function cartRule(i, ls, inCart) {
  const fill = ls.cartFill || 100, min = ls.cartMinutes || 0;
  const set = (o) => bus.act({ type: 'cartRule', layer: i, fill, minutes: min, ...o });
  const pick = (opts, v, key) => h('select', { 'aria-label': key === 'fill' ? 'How full the cart goes up' : 'Time limit',
    onchange: (e) => set({ [key]: +e.target.value }) },
    (opts.some(([x]) => x === v) ? opts : [...opts, [v, key === 'fill' ? v + '% full' : `or after ${v} min`]]).map(([x, label]) => h('option', { value: x, selected: x === v }, label)));
  const left = min && inCart > 0 ? Math.max(0, Math.ceil((ls.cartStart + min * 60 - now()) / 60)) : null;
  return h('div', { class: 'row wrap cart-rule' }, h('span', { class: 'small muted' }, 'Goes up when'),
    pick(FILLS, fill, 'fill'), pick(MINUTES, min, 'minutes'),
    left != null ? h('span', { class: 'small dim' }, left ? `leaves in ${left} min` : 'leaves now') : null);
}

/** Hardness of a rock (what a pick must at least be made of). */
function rockHard(k) { return (G.data.rockHardness || {})[k] || 1; }

/** The cheapest metal for a pick that breaks rock of this hardness. */
function pickFor(hard) {
  const m = G.data.metals.filter((x) => x.hardness >= Math.max(2, hard) && !x.precious && x.id !== 'pig_iron').sort((a, b) => a.value - b.value)[0];
  return m ? m.name.toLowerCase() : 'harder';
}
