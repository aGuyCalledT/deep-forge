// Fortress overview, dwarves, war and "more" panels.
import { G, F, D, byId, fmt, dur, ago, goodName, costText, canPay, jobLabel, fullName, buildingName, building, now, isItem, isBar, parseItem, baseValue, moneyText } from './data.js';
import { h, img, goodIcon, bar, openSheet, closeSheet, refreshSheet, bus, section, dwarfPicker, toast, costChips, missingText, ico, info, helpOn, setHelp, hourglass } from './ui.js';
import { reportCards } from './collect.js';
import * as S from './sprites.js';
import { api, setToken } from './api.js';
import { openAudioSheet } from './panels-audio.js';
import { cheatsSection } from './popups.js';
import { notesView, markNotesSeen } from './notes.js';

// ================================================================== fortress

/** "goblet" -> "goblets", "axe" -> "axes", "chain mail" stays. */
export function plural(name) {
  if (/mail$|armor$|ware$/i.test(name)) return name;
  if (/(s|x|ch|sh)$/i.test(name)) return name + 'es';
  return name + 's';
}

/** Goods as stacks of one kind and metal ("Gold goblets"); open a stack to see every piece by quality, best first. */
function stacks(list) {
  const by = new Map();
  for (const [k, v] of list) {
    const p = parseItem(k), id = p.type + ':' + p.metal;
    if (!by.has(id)) by.set(id, { p, list: [], n: 0, value: 0 });
    const s = by.get(id); s.list.push([k, v]); s.n += v; s.value += baseValue(k) * v;
  }
  const all = [...by.values()].sort((a, b) => b.value - a.value);
  return h('div', { class: 'stacks' }, all.map((s) => {
    s.list.sort((a, b) => baseValue(b[0]) - baseValue(a[0]));
    const name = byId.metals[s.p.metal].name + ' ' + plural(byId.items[s.p.type].name.toLowerCase());
    const head = h('summary', null, goodIcon(s.list[0][0]), h('span', { class: 'nm' }, name), h('span', { class: 'n' }, fmt(s.n)));
    return h('details', { class: 'stack' }, head,
      h('div', { class: 'pieces' }, s.list.map(([k, v]) => h('div', { class: 'piece' }, goodIcon(k, 'icon s'),
        h('span', { class: 'nm small' }, goodName(k)), h('span', { class: 'v small' }, moneyText(baseValue(k))), h('span', { class: 'n' }, fmt(v))))));
  }));
}

export const EFFECT = {
  warehouse: () => `Holds ${fmt(D().capacity)} goods`,
  lift: () => `Carries ${fmt(D().liftCap)} ore per hour`,
  quarters: () => `${D().beds} beds for ${D().pop} dwarves`,
  tavern: (b) => `+${Math.min(28, 4 + 3 * (b.level - 1))} happiness (needs ale)`,
  barracks: (b) => `Warriors gain ${6 + 4 * b.level} combat xp per hour`,
  gate: (b) => b.level > 1 ? `+${15 * (b.level - 1)} defence against raids` : 'A plain wooden gate. Upgrade it for defence',
  entrance_hall: () => `Room for ${D().hallSeats} guards (${D().guards} posted), +${Math.round((D().hallBonus - 1) * 100)}% when they fight at home`,
  vault: () => `Raiders can't touch ${Math.round(D().vaultProtect * 100)}% of your goods`,
  trade_depot: () => `${D().caravanSlots} caravan(s), ${D().caravanCapacity} goods per merchant, ${D().depot.maxRules} rule(s), ${D().depot.maxOrders} buy order(s)`,
  expedition_hall: () => `${D().expeditionSlots} expedition(s), up to ${D().partyMax} dwarves each`,
};

export function renderFortress() {
  const f = F(), d = D();
  const out = [];
  out.push(h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, f.name), h('span', { class: 'gold-t pix' }, 'Level ' + f.level)),
    bar(f.xp / d.xpNeed), h('p', { class: 'small muted' }, `${fmt(f.xp)} / ${fmt(d.xpNeed)} xp to the next level.`
      + (d.traditionPoints > 0 ? ` You have ${d.traditionPoints} tradition point(s) to spend (More tab).` : ''))));
  out.push(...reportCards('shift'));
  if (d.planUntil) out.push(h('div', { class: 'card sub' },
    h('div', { class: 'row between' }, h('h3', { style: { marginTop: 0 } }, 'Day plan ', info(`Each time you look in, the dwarves get a new day plan. They work at full pace for ${Math.round(d.planFull / 3600)} hours, then slow down to a fifth over two days. After a week the hold rests: nobody works, eats or attacks. ${f.level >= d.foremanLevel ? 'A foreman keeps the full pace for 36 hours, a master foreman (any skill 15) for 48.' : `At hold level ${d.foremanLevel} you can name a foreman for longer plans.`}`)),
      h('span', { class: 'small muted' }, 'full pace for ', h('span', { 'data-until': d.planUntil }, dur(d.planUntil - now()))))));
  const alerts = bus.alerts ? bus.alerts() : [];
  if (alerts.length) out.push(h('div', { class: 'card sub' }, h('h3', { style: { marginTop: 0 } }, 'Needs attention'),
    alerts.map(([k, tab, text, room]) => h('button', { class: 'alert ' + k, style: { margin: '4px 0', width: '100%' }, onclick: () => (room ? bus.showRoom(room) : bus.go(tab)) },
      img(S.icon(k === 'bad' ? 'skull' : 'warn'), 'icon s'), h('span', { style: { whiteSpace: 'normal' } }, text)))));
  out.push(h('div', { class: 'card sub' }, h('h3', { style: { marginTop: 0 } }, 'Latest news'),
    f.log.slice(-5).reverse().map((l) => h('div', { class: 'log-line ' + l.kind }, h('span', { class: 't' }, ago(l.t)), l.text)),
    h('button', { class: 'btn small ghost', onclick: () => bus.go('more') }, 'Whole chronicle')));

  // storage
  out.push(...section('Storage',
    h('div', { class: 'card' + (f.storageFull ? ' bad' : '') },
      h('div', { class: 'row between' }, h('span', null, 'Warehouse'), h('span', { class: f.storageFull ? 'bad-t' : '' }, `${fmt(d.used)} / ${fmt(d.capacity)}`)),
      bar(d.used / d.capacity),
      f.storageFull ? h('p', { class: 'bad-t small' }, 'Full! Mining has stopped. Smelt, sell or upgrade the warehouse.') : null,
      info('Ore, stone, bars and goods. Mushrooms and ale have their own larder.'),
      h('div', { class: 'row', style: { marginTop: '8px' } }, upgradeBtn(building('warehouse'))),
      h('button', { class: 'btn small ghost', style: { marginTop: '8px' }, onclick: () => bus.go('mines') }, ico('mines'), 'To the mines'))));

  // stockpile
  out.push(h('h2', null, 'Stockpile'));
  const groups = { Ores: [], Bars: [], Goods: [], Other: [] };
  for (const [k, v] of Object.entries(f.stock)) {
    if (v <= 0) continue;
    (isItem(k) ? groups.Goods : isBar(k) ? groups.Bars : byId.ores[k] ? groups.Ores : groups.Other).push([k, v]);
  }
  for (const [g, list] of Object.entries(groups)) {
    if (!list.length) continue;
    list.sort((a, b) => baseValue(b[0]) * b[1] - baseValue(a[0]) * a[1]);
    const cell = ([k, v]) => h('div', { title: goodName(k) }, goodIcon(k), h('span', { class: 'nm small' }, goodName(k)), h('span', { class: 'n' }, fmt(v)));
    out.push(h('div', { class: 'card' }, h('h3', null, g),
      g === 'Goods' ? stacks(list) : h('div', { class: 'stock-grid' }, list.map(cell))));
  }
  if (f.artifacts.length) out.push(h('div', { class: 'card' }, h('h3', null, 'Artifacts'),
    f.artifacts.map((a) => h('div', { class: 'row' }, a.item ? goodIcon(a.item) : img(S.artifact()), h('span', { class: 'grow' }, a.name),
      a.unnamed ? h('button', { class: 'btn small primary', onclick: () => bus.nameArtifact(a.id) }, 'Name it') : null,
      h('span', { class: 'gold-t' }, '~' + moneyText(a.value))))));

  // buildings
  out.push(h('h2', null, 'Buildings'));
  for (const b of f.buildings) {
    const t = byId.buildings[b.type];
    if (t.kind !== 'passive' || b.type === 'warehouse' || b.type === 'lift') continue;
    out.push(h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('h3', null, t.name), h('span', { class: 'muted' }, b.level ? 'Level ' + b.level : 'Not built')),
      h('p', { class: 'small' }, EFFECT[b.type] ? EFFECT[b.type](b) : '', info(t.note)),
      upgradeBtn(b)));
  }
  out.push(h('h2', null, 'Build workshops'));
  out.push(h('div', { class: 'card' }, info('Every workshop needs a dwarf. More workshops of the same kind cost more. A new workshop is put in the first free spot of your hold; move it in build mode.'),
    Object.entries(d.buildCosts).map(([type, c]) => {
      const t = byId.buildings[type];
      const have = f.buildings.filter((b) => b.type === type).length;
      return h('div', { class: 'row', style: { margin: '6px 0' } },
        h('span', { class: 'grow' }, h('b', null, t.name), have ? h('span', { class: 'muted' }, ` (you have ${have})`) : null, info(t.note)),
        costBtn('Build', c, { type: 'build', building: type }));
    })));
  return out;
}

export function upgradeBtn(b) {
  if (!b) return null;
  const info = D().buildings[b.id], c = info.upgrade, cons = D().building;
  if (cons && cons.id === b.id) return h('div', { class: 'cost-action' }, hourglass({ from: cons.until - buildTimeOf(cons.level), to: cons.until }),
    h('span', { class: 'small' }, `Builders at work on level ${cons.level}. Ready in `, h('span', { 'data-until': cons.until }, dur(cons.until - now())), '.'));
  if (cons && b.level > 0) return costBtn(`Upgrade ${buildingName(b).toLowerCase()} to ${b.level + 1}`, c, null, `Builders are busy with the ${buildingName(building(cons.id)).toLowerCase()}.`);
  const label = b.level === 0 ? 'Build ' + byId.buildings[b.type].name.toLowerCase() : `Upgrade ${buildingName(b).toLowerCase()} to ${b.level + 1}`;
  if (info.canGrow === false) return costBtn(label, c, null, 'It gets wider when upgraded, but no floor has space for it. Dig out more of the hold.');
  return costBtn(info.canGrow ? label + ', +1 machine' : label, c, { type: 'upgrade', building: b.id });
}

/** Same as Rules.buildTime: 10 min × level^1.6, at most a day; a new room 15 min. */
export function buildTimeOf(level) { return level <= 1 ? 900 : Math.min(86400, 600 * Math.pow(level, 1.6)); }

export function costBtn(label, cost, action, blocked) {
  const miss = missingText(cost);
  const ok = !blocked && !miss;
  return h('div', { class: 'cost-action' },
    h('button', { class: 'btn small' + (ok ? ' good' : ''), disabled: !ok, title: blocked || miss || '', onclick: () => bus.act(action) }, label),
    blocked ? h('span', { class: 'small warn-t' }, blocked) : costChips(cost));
}

// ================================================================== dwarves

let dwarfFilter = 'all';

export function renderDwarves() {
  const f = F(), d = D();
  const avg = f.dwarves.length ? f.dwarves.reduce((s, x) => s + x.happiness, 0) / f.dwarves.length : 0;
  const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy).length;
  const jobs = ['all', 'idle', 'miner', 'worker', 'warrior', 'merchant', 'away'];
  const list = f.dwarves.filter((x) => dwarfFilter === 'all' || (dwarfFilter === 'away' ? x.busy : !x.busy && x.job === dwarfFilter));
  return [
    h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('span', null, img(S.icon('dwarf'), 'icon s'), ` ${d.pop} dwarves, ${d.beds} beds`),
        h('span', null, img(S.icon('mood'), 'icon s'), ` ${Math.round(avg)}% happy`)),
      idle ? h('p', { class: 'warn-t small' }, `${idle} dwarf(s) idle. Idle dwarves sit in the tavern.`) : null,
      d.pop > d.beds ? h('p', { class: 'bad-t small' }, 'Not enough beds! Upgrade the quarters.') : null,
      info('Happy dwarves work up to 40% faster. Miserable ones may leave. Food, ale, beds, the tavern and fine goblets in stock all help.')),
    h('div', { class: 'row', style: { marginBottom: '10px' } }, jobs.map((j) =>
      h('button', { class: 'btn small' + (dwarfFilter === j ? ' primary' : ''), onclick: () => { dwarfFilter = j; bus.render(); } }, j))),
    h('div', { class: 'list dwarves-grid' }, list.map(dwarfCard)),
    f.memorials.length ? [h('h2', null, 'In memory'), h('div', { class: 'card sub' }, f.memorials.slice().reverse().slice(0, 10).map((m) =>
      h('p', { class: 'small' }, h('b', null, m.name), ' — ', m.cause, h('span', { class: 'dim' }, ' · ' + ago(m.t)))))] : null,
  ];
}

export function dwarfCard(x) {
  const dd = D().dwarves[x.id] || {};
  const top = Object.entries(dd.skills || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const gear = ['tool', 'weapon', 'helm', 'armor'].map((s) => x[s]).filter(Boolean);
  const portrait = img(S.portrait(x), '');
  portrait.style.width = '48px'; portrait.style.height = '58px';
  return h('div', { class: 'card dwarf-card' },
    h('div', null, portrait),
    h('div', null,
      h('div', { class: 'row between' }, h('b', null, fullName(x)), h('span', { class: 'small muted' }, x.age + ' years')),
      profession(x, dd),
      h('div', null, x.traits.map((t) => h('span', { class: 'chip', title: byId.traits[t].note }, byId.traits[t].name))),
      h('div', { class: 'row small', style: { gap: '4px 10px' } },
        h('span', { class: 'grow' }, 'Health', bar(x.health / 100, 'hp')),
        h('span', { class: 'grow' }, 'Mood' + (dd.target > x.happiness + 3 ? ' ↑' : dd.target < x.happiness - 3 ? ' ↓' : ''), bar(x.happiness / 100, 'mood'))),
      h('div', { class: 'small muted skills' }, top.length ? top.map(([k, v], i) => [i ? ' · ' : '', k === jobSkill(x) ? h('b', { class: 'gold-t' }, `${k} ${v}`) : `${k} ${v}`]) : 'No skills yet', ` · power ${fmt(dd.power)}`),
      gear.length ? h('div', { class: 'row' }, gear.map((k) => h('span', { title: goodName(k) }, goodIcon(k, 'icon s')))) : null,
      !x.busy ? h('div', { class: 'row', style: { marginTop: '6px' } },
        h('button', { class: 'btn small', onclick: () => jobSheet(x) }, 'Job'),
        h('button', { class: 'btn small', onclick: () => gearSheet(x) }, 'Gear')) : null));
}

/** The skill a dwarf's job trains and uses. */
function jobSkill(x) {
  if (x.job === 'miner') return 'mining';
  if (x.job === 'warrior') return 'combat';
  if (x.job === 'merchant') return 'trading';
  if (x.job === 'worker') { const b = F().buildings.find((q) => q.id === x.building); return b ? byId.buildings[b.type].skill : null; }
  return null;
}

/** The profession as an engraved badge: what the dwarf does, its icon and the skill it works with. */
function profession(x, dd) {
  const kind = x.busy ? (x.busy.startsWith('caravan') ? 'trade' : 'lore') : { miner: 'mine', worker: 'forge', warrior: 'war', merchant: 'trade' }[x.job] || 'idle';
  const icon = x.busy ? (x.busy.startsWith('caravan') ? 'trade' : 'explore') : { miner: 'mines', worker: 'work', warrior: 'war', merchant: 'trade' }[x.job] || 'idle';
  const sk = jobSkill(x), lvl = sk && dd.skills ? dd.skills[sk] || 0 : null;
  return h('div', { class: 'profession ' + kind },
    ico(icon), h('b', null, jobLabel(x)),
    sk ? h('span', { class: 'small' }, `${sk} ${lvl}`) : null,
    dd.rate ? h('span', { class: 'small' }, `${fmt(dd.rate)} ore/h`) : null);
}

export function jobSheet(x) {
  const f = F();
  const opt = (label, sub, action, current) => h('button', { class: 'pick' + (current ? ' on' : ''), style: { width: '100%' },
    onclick: async () => { await bus.act({ type: 'assign', dwarf: x.id, ...action }); closeSheet(); } },
    h('span', { class: 'grow', style: { textAlign: 'left' } }, h('b', null, label), sub ? h('span', { class: 'small muted' }, ' · ' + sub) : null));
  openSheet(() => h('div', null,
    h('h2', null, fullName(x)),
    h('p', { class: 'small muted' }, 'Skills: ' + Object.entries(D().dwarves[x.id].skills).map(([k, v]) => `${k} ${v}`).join(', ')),
    h('h3', null, 'Mine'),
    f.layers.filter((l) => l.unlocked).map((l) => opt(G.data.layers[l.index].name, `${D().layers[l.index].miners} miners`, { job: 'miner', layer: l.index }, x.job === 'miner' && x.layer === l.index)),
    h('h3', null, 'Workshops'),
    f.buildings.filter((b) => b.level > 0 && byId.buildings[b.type].kind !== 'passive').map((b) => {
      const w = D().buildings[b.id].worker;
      const wn = w ? (w === x.id ? 'this dwarf' : fullName(f.dwarves.find((y) => y.id === w))) : 'empty';
      return opt(buildingName(b), wn + ' · ' + byId.buildings[b.type].skill, { job: 'worker', building: b.id }, x.job === 'worker' && x.building === b.id);
    }),
    h('h3', null, 'Other'),
    opt('Guard in the entrance hall', `defends the gate, chases critters · ${D().guards}/${D().hallSeats} posted`, { job: 'warrior', post: 'hall' }, x.job === 'warrior' && x.post !== 'mine'),
    opt('Warrior on mine patrol', 'fights monsters in the mine', { job: 'warrior', post: 'mine' }, x.job === 'warrior' && x.post === 'mine'),
    opt('Merchant', 'leads caravans', { job: 'merchant' }, x.job === 'merchant'),
    f.level >= D().foremanLevel ? opt('Foreman', 'keeps the day plan going: 36 h at full pace, 48 h for a master', { job: 'foreman' }, x.job === 'foreman') : null,
    opt('Idle', 'rests in the tavern', { job: 'idle' }, x.job === 'idle')));
}

const SLOTS = [['tool', 'Tool', 'Pickaxes dig faster, break harder rock and wear out'], ['weapon', 'Weapon', 'Axes for fighting'], ['helm', 'Helm', 'Protection'], ['armor', 'Armor', 'Chain mail: strong protection']];

export function gearSheet(x) {
  openSheet(() => {
    const f = F();
    const me = f.dwarves.find((y) => y.id === x.id) || x;
    return h('div', null, h('h2', null, fullName(me) + "'s gear"),
      SLOTS.map(([slot, name, note]) => {
        const items = Object.entries(f.stock).filter(([k, v]) => v > 0 && isItem(k) && byId.items[parseItem(k).type].slot === slot)
          .sort((a, b) => baseValue(b[0]) - baseValue(a[0])).slice(0, 8);
        return h('div', { class: 'card sub' },
          h('div', { class: 'row between' }, h('b', null, name), h('span', { class: 'small muted' }, note)),
          me[slot] ? h('div', { class: 'row' }, goodIcon(me[slot]), h('span', { class: 'grow small' }, goodName(me[slot])),
            h('button', { class: 'btn small', title: slot === 'tool' && me.toolWear > 0.25 ? 'A used pick is worn: taking it off scraps it' : '',
              onclick: async () => { await bus.act({ type: 'unequip', dwarf: me.id, slot }); refreshSheet(); } }, slot === 'tool' && me.toolWear > 0.25 ? 'Scrap' : 'Remove'))
            : h('p', { class: 'small muted' }, slot === 'tool' ? 'Makeshift pick: free, slow, never breaks, only soft rock.' : 'Nothing equipped.'),
          slot === 'tool' && me.tool ? h('div', null, h('div', { class: 'row between small' }, h('span', { class: 'muted' }, 'Condition'), h('span', null, Math.round((D().dwarves[me.id].toolLeft ?? 1) * 100) + '%')),
            bar(D().dwarves[me.id].toolLeft ?? 1, (D().dwarves[me.id].toolLeft ?? 1) < 0.15 ? 'bad' : '')) : null,
          items.map(([k, v]) => h('div', { class: 'row' }, goodIcon(k), h('span', { class: 'grow small' }, `${goodName(k)} (${v})`),
            h('button', { class: 'btn small good', onclick: async () => { await bus.act({ type: 'equip', dwarf: me.id, item: k }); refreshSheet(); } }, 'Equip'))));
      }),
      h('h3', null, 'Clothes'),
      h('div', { class: 'row' }, img(S.portrait(me), 'icon xl'), h('p', { class: 'small muted grow' }, 'Spare clothes wait in the warehouse. Making your own comes later.')),
      WEAR_SLOTS.map(([slot, name]) => {
        const cur = (me.wear || {})[slot];
        const spare = Object.entries(f.stock).filter(([k, v]) => v > 0 && k.startsWith('wear:') && byId.clothes[k.split(':')[1]] && byId.clothes[k.split(':')[1]].slot === slot);
        if (!cur && !spare.length) return null;
        return h('div', { class: 'card sub' },
          h('b', null, name),
          cur ? h('div', { class: 'row' }, goodIcon(cur), h('span', { class: 'grow small' }, goodName(cur)),
            h('button', { class: 'btn small', onclick: async () => { await bus.act({ type: 'unwear', dwarf: me.id, slot }); refreshSheet(); } }, 'Take off'))
            : h('p', { class: 'small muted' }, 'Nothing.'),
          spare.map(([k, v]) => h('div', { class: 'row' }, goodIcon(k), h('span', { class: 'grow small' }, `${goodName(k)} (${v})`),
            h('button', { class: 'btn small good', onclick: async () => { await bus.act({ type: 'wear', dwarf: me.id, item: k }); refreshSheet(); } }, 'Put on'))));
      }));
  });
}

const WEAR_SLOTS = [['hat', 'Hat'], ['top', 'Shirt or dress'], ['legs', 'Trousers'], ['feet', 'Boots'], ['face', 'Glasses'], ['ears', 'Earrings'], ['apron', 'Apron']];

// ================================================================== war

export function renderWar() {
  const f = F(), d = D(), t = now();
  const out = [];
  const warriors = f.dwarves.filter((x) => x.job === 'warrior');
  out.push(h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, 'Gate defence'), h('b', { class: 'gold-t' }, fmt(d.gatePower))),
    h('p', { class: 'small muted' }, `${d.guards} of ${d.hallSeats} guards in the entrance hall (+${Math.round((d.hallBonus - 1) * 100)}% at home) + ${fmt(d.wallPower)} from the gate. `
      + `The vault protects ${Math.round(d.vaultProtect * 100)}% of your goods.`),
    h('div', { class: 'row' }, h('span', { class: 'grow' }, 'Mine patrol'), h('b', null, fmt(d.minePower))),
    h('div', { class: 'row', style: { marginTop: '8px' } }, upgradeBtn(building('gate')), upgradeBtn(building('entrance_hall')), upgradeBtn(building('vault')), upgradeBtn(building('barracks')))));

  if (f.raid) {
    const ok = d.gatePower >= f.raid.power;
    out.push(h('div', { class: 'card bad' }, h('h3', null, img(S.icon('warn'), 'icon s'), ' ', f.raid.name, ' incoming!'),
      h('p', null, 'Strength ', h('b', null, fmt(f.raid.power)), ' vs your gate ', h('b', { class: ok ? 'good-t' : 'bad-t' }, fmt(d.gatePower)),
        '. Arrives in ', h('b', { 'data-until': f.raid.arrivesAt }, dur(f.raid.arrivesAt - t)), '.'),
      h('p', { class: 'small muted' }, ok ? 'Your defence should hold, but fights are never certain.' : 'Too weak! Post more guards in the entrance hall, give them axes and armor, or upgrade the gate. If the raid wins, they steal goods, may kill dwarves and besiege the gate.')));
  }
  if (f.siege) {
    out.push(h('div', { class: 'card bad' }, h('h3', null, 'Siege! ', f.siege.name, ' at the gate'),
      h('p', null, 'All workshops are shut. Strength ', h('b', null, fmt(f.siege.power)), '. They leave by themselves in ', h('b', { 'data-until': f.siege.until }, dur(f.siege.until - t)), '.'),
      h('button', { class: 'btn danger', onclick: () => fightSheet('Break the siege', f.siege.power, (ids) => ({ type: 'breakSiege', warriors: ids })) }, 'Break the siege')));
  }
  for (const th of f.threats) {
    out.push(h('div', { class: 'card bad' },
      h('div', { class: 'row' }, img(S.monster(th.monster, 0), 'icon l'), h('div', { class: 'grow' }, h('h3', null, th.name), h('span', { class: 'small' }, th.cell ? 'Overgrown cave, floor ' + (+th.cell.split(',')[1] + 1) : G.data.layers[th.layer].name))),
      th.cell
        ? h('p', null, 'Strength ', h('b', null, fmt(th.power)), '. It raids the larder and bites dwarves, next in ', h('b', { 'data-until': th.nextHarm }, dur(th.nextHarm - t)),
          th.fightAt > now() ? h('span', null, '. Guards are on their way: ', h('b', { 'data-until': th.fightAt }, dur(th.fightAt - t)), '.') : '. Guards from the entrance hall chase it on their own. Or put a hallway or room into its cave, or fill the cave in.')
        : h('p', null, 'Strength ', h('b', null, fmt(th.power)), '. Mining there has stopped. It may kill a hiding miner in ', h('b', { 'data-until': th.nextHarm }, dur(th.nextHarm - t)), '.'),
      h('button', { class: 'btn danger', onclick: () => fightSheet('Fight the ' + th.name.toLowerCase(), th.power, (ids) => ({ type: 'fightThreat', threat: th.id, warriors: ids })) }, 'Send warriors')));
  }
  if (!f.raid && !f.siege && !f.threats.length) out.push(h('p', { class: 'muted' }, 'All quiet. For now.'));

  out.push(h('h2', null, 'Warriors'));
  if (!warriors.length) out.push(h('p', { class: 'muted' }, 'No warriors. Give dwarves the warrior job in the Dwarves tab. Forge axes, helms and chain mail for them.'));
  out.push(h('div', { class: 'list' }, warriors.map((x) => h('div', { class: 'card sub row' },
    img(S.portrait(x)), h('span', { class: 'grow' }, h('b', null, fullName(x)), h('br'), h('span', { class: 'small muted' }, jobLabel(x))),
    h('span', { class: 'gold-t' }, fmt(D().dwarves[x.id].power)),
    !x.busy ? h('button', { class: 'btn small', onclick: () => bus.act({ type: 'assign', dwarf: x.id, job: 'warrior', post: x.post === 'mine' ? 'hall' : 'mine' }) }, x.post === 'mine' ? 'To the hall' : 'To the mine') : null,
    !x.busy ? h('button', { class: 'btn small', onclick: () => gearSheet(x) }, 'Gear') : null))));
  return out;
}

function fightSheet(title, enemy, makeAction) {
  const sel = new Set();
  openSheet(() => {
    const f = F();
    const free = f.dwarves.filter((x) => x.job === 'warrior' && !x.busy);
    const p = [...sel].reduce((s, id) => s + (D().dwarves[id] ? D().dwarves[id].power : 0), 0);
    const r = p / Math.max(1, enemy), chance = Math.round(Math.max(0.03, Math.min(0.98, r * r / (r * r + 1))) * 100);
    return h('div', null, h('h2', null, title),
      h('p', null, 'Enemy strength ', h('b', null, fmt(enemy)), '. Your party ', h('b', { class: p >= enemy ? 'good-t' : 'bad-t' }, fmt(p)), ` · about ${chance}% to win.`),
      h('p', { class: 'small muted' }, 'Warriors can be hurt or killed, even when they win.'),
      dwarfPicker(free, sel, (x) => 'power ' + fmt(D().dwarves[x.id].power), refreshSheet),
      h('button', { class: 'btn danger big', disabled: !sel.size, onclick: async () => { await bus.act(makeAction([...sel])); closeSheet(); } }, 'Attack'));
  });
}

// ================================================================== more

export function renderMore() {
  const f = F(), d = D();
  const out = [];
  const notes = notesView();
  if (notes) { out.push(...section("What's new", notes)); markNotesSeen(); }
  out.push(...section('Traditions', h('div', { class: 'card' },
    h('p', { class: 'small muted' }, `Choose how your fortress specialises. One point per fortress level. Points left: `, h('b', { class: 'gold-t' }, d.traditionPoints)),
    G.data.traditions.map((t) => {
      const r = f.traditions[t.id] || 0;
      return h('div', { class: 'row', style: { margin: '6px 0' } },
        h('span', { class: 'grow' }, h('b', null, t.name), ' ', h('span', { class: 'pips', 'aria-label': `rank ${r} of ${t.maxRank}` }, Array.from({ length: t.maxRank }, (_, i) => h('i', { class: i < r ? 'on' : '' }))), h('br'), h('span', { class: 'small muted' }, t.note)),
        h('button', { class: 'btn small good', 'aria-label': 'Add a rank to ' + t.name, disabled: d.traditionPoints <= 0 || r >= t.maxRank, onclick: () => bus.act({ type: 'tradition', id: t.id }) }, ico('plus')));
    }))));

  const players = h('div', { class: 'card scroll-x' }, h('p', { class: 'muted' }, 'Loading...'));
  api.get('/players').then((list) => players.replaceChildren(h('table', null,
    h('tr', null, ['Hold', 'Lvl', 'Depth', 'Dwarves', 'Earned', 'Lost'].map((x) => h('th', null, x))),
    list.map((p) => h('tr', null, h('td', null, h('b', null, p.name), h('br'), h('span', { class: 'small muted' }, p.owner)),
      h('td', null, p.level), h('td', null, p.depth), h('td', null, p.dwarves), h('td', null, moneyText(p.coinsEarned)), h('td', null, p.lost)))))).catch(() => {});
  out.push(...section('Other holds', players));

  out.push(...section('Chronicle', h('div', { class: 'card' }, f.log.slice().reverse().slice(0, 60).map((l) =>
    h('div', { class: 'log-line ' + l.kind }, h('span', { class: 't' }, ago(l.t)), l.text)))));

  const name = h('input', { value: f.name, maxLength: 32 });
  out.push(...section('Settings', h('div', { class: 'card' },
    h('label', { class: 'pick' }, h('input', { type: 'checkbox', checked: helpOn(), onchange: (e) => { setHelp(e.target.checked); bus.render(); } }),
      h('span', { class: 'grow' }, 'Show help buttons', h('br'), h('span', { class: 'small muted' }, 'Small round buttons that explain things.'))),
    h('label', null, 'Name of your hold', name),
    h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => bus.act({ type: 'rename', name: name.value }) }, 'Rename'),
      h('button', { class: 'btn small', onclick: openAudioSheet }, ico('note'), 'Music and sound'),
      h('button', { class: 'btn small danger', onclick: async () => { try { await api.post('/auth/logout'); } catch { /* ignore */ } setToken(null); location.reload(); } }, 'Log out')),
    h('p', { class: 'small muted' }, `Logged in as ${G.me ? G.me.name : ''}.`))));

  if (G.state.cheats) out.push(...section('Cheats', cheatsSection()));
  if (G.me && G.me.admin) {
    const who = h('input', { placeholder: 'Player name' }), pw = h('input', { placeholder: 'New password (8+ characters)', type: 'text' });
    out.push(...section('Admin', h('div', { class: 'card' }, h('p', { class: 'small muted' }, 'Reset a forgotten password.'), who, pw,
      h('button', { class: 'btn small', onclick: async () => {
        try { await api.post('/admin/password', { name: who.value, password: pw.value }); toast('Password reset.', 'good'); } catch (e) { toast(e.message, 'bad'); }
      } }, 'Reset password'))));
  }
  out.push(h('p', { class: 'small dim' }, 'Deep Forge · stats: ' + `${f.stats.barsSmelted} bars smelted, ${f.stats.itemsCrafted} goods forged, ${f.stats.masterworks} masterworks, ${f.stats.expeditions} expeditions, ${f.stats.monstersSlain} monsters slain, ${f.stats.raidsRepelled} raids repelled, ${f.stats.dwarvesLost} dwarves lost.`));
  return out;
}
