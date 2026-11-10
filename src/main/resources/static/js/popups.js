// Windows that open when you click something in the game: a room, a dwarf. Plus the cheat tools.
import { G, F, D, byId, fmt, goodName, fullName, buildingName, jobLabel } from './data.js';
import { h, img, openSheet, refreshSheet, closeSheet, bus, ico, toast } from './ui.js';
import * as S from './sprites.js';
import { workCard } from './panels-work.js';
import { dwarfCard, EFFECT, upgradeBtn } from './panels-base.js';

export function openRoomSheet(b) {
  G.ws = b.id;
  openSheet(() => {
    const cur = F().buildings.find((x) => x.id === b.id) || b;
    const t = byId.buildings[cur.type];
    const pic = img(S.room(cur), 'room-pic');
    if (t.kind !== 'passive') return h('div', null, pic, workCard(cur),
      h('button', { class: 'btn small ghost', onclick: () => { closeSheet(); bus.go('work'); } }, 'Open the workshop screen'));
    const f = F();
    const extra = [];
    if (cur.type === 'tavern') {
      const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy);
      extra.push(h('p', { class: 'small muted' }, idle.length ? `${idle.length} idle dwarf(s) here. Dwarves on their break come by too.` : 'Nobody idle. Dwarves drop by on their breaks.'),
        f.noAle ? h('p', { class: 'small bad-t' }, 'No ale! The tavern is no fun without it. Staff the brewery.') : null);
    }
    if (cur.type === 'quarters') extra.push(h('p', { class: 'small muted' }, 'At night, dwarves who are off work sleep here.'));
    if (cur.type === 'warehouse') extra.push(h('p', { class: 'small' }, `${fmt(D().used)} / ${fmt(D().capacity)} stored.`),
      h('button', { class: 'btn small ghost', onclick: () => { closeSheet(); bus.go('fortress'); } }, 'See the stockpile'));
    if (cur.type === 'barracks') extra.push(h('button', { class: 'btn small ghost', onclick: () => { closeSheet(); bus.go('war'); } }, 'Warriors and defence'));
    return h('div', null, pic,
      h('div', { class: 'row between' }, h('h2', null, buildingName(cur)), h('span', { class: 'muted' }, 'Level ' + cur.level)),
      h('p', { class: 'small muted' }, t.note),
      EFFECT[cur.type] ? h('p', null, EFFECT[cur.type](cur)) : null,
      ...extra,
      upgradeBtn(cur));
  });
}

export function openDwarfSheet(d) {
  openSheet(() => {
    const cur = F().dwarves.find((x) => x.id === d.id);
    if (!cur) return h('p', null, 'This dwarf is gone.');
    return h('div', null, dwarfCard(cur),
      G.state.cheats ? h('button', { class: 'btn small', onclick: () => lookSheet(cur) }, ico('cheat'), 'Change looks (cheat)') : null);
  });
}

// ------------------------------------------------------------------ cheats

const LOOK_NAMES = {
  sex: ['Man', 'Woman'],
  body: ['Classic', 'Barrel', 'Tall', 'Brawler', 'Little'],
  hairStyle: ['Short', 'Fringe', 'Bald', 'Topknot', 'Long', 'Wavy', 'Braids', 'Bun', 'Pigtails', 'Mohawk'],
  beardStyle: ['Full', 'Wide', 'Braided', 'Forked', 'Long', 'Goatee', 'Mutton chops', 'Moustache'],
  nose: ['Bulb', 'Potato', 'Long', 'Broad', 'Button', 'Pointy', 'Hooked', 'Snub', 'Tiny'],
  brows: ['Bushy', 'Thick', 'Thin', 'Arched', 'Stern', 'Worried', 'Long'],
  eyeColor: ['Brown', 'Grey', 'Blue', 'Green', 'Amber', 'Violet', 'Dark'],
  mouth: ['Smile', 'Full', 'Small', 'Grin', 'Pout'],
};
const BODY_NAMES_F = ['Classic', 'Hourglass', 'Slender', 'Sturdy', 'Little'];

export function lookSheet(d) {
  const L = S.look(d);
  const st = { first: d.first, clan: d.clan, sex: L.sex === 'f' ? 1 : 0, body: L.body, hairStyle: L.hairStyle, beardStyle: L.beard, nose: L.nose,
    brows: L.brows, eyeColor: L.eye, mouth: L.mouth, freckles: L.freckles, skin: L.skin, hair: L.hair };
  openSheet(() => {
    const preview = { ...d, ...st, sex: st.sex ? 'f' : 'm', id: 'preview' + d.id, helm: null };
    const big = document.createElement('canvas');
    const pic = S.portrait(preview, 'talk');
    big.width = pic.width * 4; big.height = pic.height * 4; big.className = 'dwarf-preview';
    const g = big.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(pic, 0, 0, big.width, big.height);
    const label = { sex: 'Dwarf', hairStyle: 'Hair', beardStyle: 'Beard', eyeColor: 'Eyes', body: 'Body' };
    const sel = (k) => {
      const names = k === 'body' && st.sex ? BODY_NAMES_F : LOOK_NAMES[k];
      return h('label', null, label[k] || k[0].toUpperCase() + k.slice(1),
        h('select', { onchange: (e) => { st[k] = +e.target.value; refreshSheet(); } }, names.map((n, i) => h('option', { value: i, selected: st[k] === i }, n))));
    };
    const col = (k, lbl) => h('label', { class: 'color' }, lbl, h('input', { type: 'color', value: st[k], oninput: (e) => { st[k] = e.target.value; refreshSheet(); } }));
    const fields = ['sex', 'body', 'hairStyle', ...(st.sex ? ['mouth'] : ['beardStyle']), 'nose', 'brows', 'eyeColor'];
    return h('div', null, h('h2', null, 'Looks of ' + fullName(d)),
      h('div', { class: 'look-grid' }, big,
        h('div', null,
          h('div', { class: 'row' }, h('label', { class: 'grow' }, 'First name', h('input', { value: st.first, maxLength: 20, onchange: (e) => { st.first = e.target.value; } })),
            h('label', { class: 'grow' }, 'Clan', h('input', { value: st.clan, maxLength: 20, onchange: (e) => { st.clan = e.target.value; } }))),
          h('div', { class: 'row' }, ...fields.map(sel)),
          h('div', { class: 'row' }, col('skin', 'Skin'), col('hair', st.sex ? 'Hair' : 'Hair and beard'),
            h('label', null, h('input', { type: 'checkbox', checked: st.freckles, onchange: (e) => { st.freckles = e.target.checked; refreshSheet(); } }), ' Freckles')),
          h('p', { class: 'small muted' }, 'Clothes are items now: change them under Gear.'))),
      h('button', { class: 'btn primary big', onclick: async () => {
        await bus.act({ type: 'cheatLook', dwarf: d.id, ...st, sex: st.sex ? 'f' : 'm' });
        toast('Looking sharp!', 'good');
        closeSheet();
      } }, 'Save'));
  });
}

export function cheatsSection() {
  if (!G.state.cheats) return null;
  const dyes = Object.keys(G.data.dyes || {});
  const keys = ['coins', ...G.data.ores.map((o) => o.id), 'coal', 'limestone', 'stone', 'food', 'ale', 'rough_gem', 'cut_gem', ...G.data.metals.map((m) => 'bar:' + m.id),
    ...(G.data.clothes || []).flatMap((c) => dyes.map((dy) => 'wear:' + c.id + ':' + dy))];
  const what = h('select', null, keys.map((k) => h('option', { value: k }, k === 'coins' ? 'Coins' : goodName(k))));
  const amount = h('input', { type: 'number', value: 100, min: -100000, max: 100000 });
  return h('div', { class: 'card cheats' },
    h('h3', null, ico('cheat'), ' Cheats'),
    h('p', { class: 'small muted' }, 'Test helpers. Everyone on this server with cheats on can use them.'),
    h('div', { class: 'row' }, what, amount, h('button', { class: 'btn small good', onclick: () => bus.act({ type: 'cheatGive', key: what.value, amount: +amount.value }) }, 'Give')),
    h('div', { class: 'row' },
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatStarter' }) }, 'Cart of supplies'),
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatDwarves', count: 1 }) }, '+1 dwarf'),
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatDwarves', count: 5 }) }, '+5 dwarves'),
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatHeal' }) }, 'Heal and cheer everyone')),
    h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Skip time:'), ...[1, 3, 6, 12].map((hh) =>
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatSkip', hours: hh }) }, hh + 'h'))),
    h('p', { class: 'small dim' }, 'Change a dwarf\'s looks: click the dwarf in the hold.'));
}

export { jobLabel };
