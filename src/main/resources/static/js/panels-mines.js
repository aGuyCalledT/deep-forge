// The mines: lift, layers, miners.
import { G, F, D, byId, fmt, goodName, building, stock } from './data.js';
import { h, img, goodIcon, bar, bus, ico } from './ui.js';
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

  G.data.layers.forEach((layer, i) => {
    const ls = f.layers[i], dl = d.layers[i];
    const th = ls.threat ? f.threats.find((x) => String(x.id) === ls.threat) : null;
    const miners = f.dwarves.filter((x) => x.job === 'miner' && x.layer === i && !x.busy)
      .sort((a, b) => (d.dwarves[b.id].skills.mining || 0) - (d.dwarves[a.id].skills.mining || 0));
    const ores = Object.entries(layer.weights).sort((a, b) => b[1] - a[1]);
    const total = ores.reduce((s, [, w]) => s + w, 0);
    const card = h('div', { class: 'card layer-card' + (th ? ' bad' : '') + (G.focus === 'layer:' + i ? ' good' : ''), id: 'layer-' + i });
    card.append(h('div', { class: 'row between' }, h('h3', null, layer.name),
      ls.unlocked ? h('span', { class: 'muted small' }, 'Shaft level ' + ls.level) : h('span', { class: 'muted small' }, ico('lock'), ' Locked')));
    card.append(h('div', { class: 'ore-list' }, ores.map(([k, w]) => h('div', { class: 'ore', title: goodName(k) },
      goodIcon(k), h('span', { class: 'nm' }, goodName(k)), h('span', { class: 'dim small' }, Math.round(w / total * 100) + '%'), h('b', null, fmt(stock(k)))))));
    if (ls.unlocked) {
      if (th) card.append(h('p', { class: 'bad-t' }, img(S.monster(th.monster, 0), 'icon'), ` ${th.name} blocks this layer! `,
        h('button', { class: 'btn small danger', onclick: () => bus.go('war') }, 'Send warriors')));
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
