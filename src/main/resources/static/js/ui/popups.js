// Windows that open when you click something in the game: a room, a dwarf. Plus the cheat tools.
import { G, F, D, byId, fmt, goodName, fullName, buildingName, jobLabel, moneyText } from '../core/data.js';
import { h, img, openSheet, refreshSheet, closeSheet, bus, ico, toast, info, frameDecor, slideIn, slideOut } from './ui.js';
import * as S from '../art/sprites.js';
import { workCard } from '../panels/work.js';
import { dwarfCard, EFFECT, upgradeBtn } from '../panels/base.js';
import { roomMaterial } from './plate.js';
import { roomLooks, lookInfo, refreshLooks } from '../scene/hold.js';
import * as R from '../art/rooms.js';

let looksFresh = false;     // the list of looks loads before login; fetch it once more to know which are yours
export function openRoomSheet(b, at) {
  G.ws = b.id;
  if (!looksFresh) { looksFresh = true; refreshLooks().then(refreshSheet).catch(() => { looksFresh = false; }); }
  openSheet(() => {
    const cur = F().buildings.find((x) => x.id === b.id) || b;
    const t = byId.buildings[cur.type];
    const still = D().buildings[cur.id] && D().buildings[cur.id].active === false
      ? h('div', { class: 'card sub warn' }, h('b', null, ico('stop'), ' Stands still. '),
        h('span', { class: 'small' }, 'No hallway, stairwell or shaft beside it, so nobody can get in. Build a hallway next to it, or move it (Build mode).')) : null;
    const look = lookRow(cur);
    if (t.kind !== 'passive') return h('div', null, still, workCard(cur), look);
    const f = F();
    const extra = [];
    if (cur.type === 'tavern') {
      const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy);
      extra.push(h('p', { class: 'small muted' }, idle.length ? `${idle.length} idle dwarf(s) here.` : 'Nobody idle right now.'),
        f.noAle ? h('p', { class: 'small bad-t' }, 'No ale! Staff the brewery.') : null);
    }
    if (cur.type === 'warehouse') extra.push(h('p', { class: 'small' }, `${fmt(D().used)} / ${fmt(D().capacity)} stored.`),
      h('button', { class: 'btn small ghost', onclick: () => { closeSheet(); bus.go('fortress'); } }, 'See the stockpile'));
    if (cur.type === 'barracks') extra.push(h('button', { class: 'btn small ghost', onclick: () => { closeSheet(); bus.go('war'); } }, 'Warriors and defence'));
    if (cur.type === 'expedition_hall') extra.push(h('button', { class: 'btn primary', onclick: () => { closeSheet(); bus.go('explore'); } }, ico('explore'), 'Rumours and expeditions'));
    if (cur.type === 'trade_depot') extra.push(h('button', { class: 'btn primary', onclick: () => bus.depot && bus.depot(at) }, 'Open the depot'));
    if (cur.type === 'entrance_hall' || cur.type === 'gate') extra.push(...hallCard(f, cur));
    return h('div', null,
      h('h2', null, buildingName(cur), info(t.note)), h('p', { class: 'small muted' }, 'Level ' + cur.level),
      still,
      EFFECT[cur.type] ? h('p', null, EFFECT[cur.type](cur)) : null,
      ...extra,
      look,
      upgradeBtn(cur));
  }, { ...(at || {}), dock: true }, roomMaterial(b.type));
}

const lookName = (n) => n.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
/** Who made a look, for the list: "built-in", "by you" or "by <name>". */
function byWhom(type, n) {
  const m = lookInfo(type, 'room', n);
  return !m ? 'built-in' : m.mine ? 'by you' : 'by ' + m.author;
}

/** The room's look: the one in use, a button to the list of all looks (built-in and made by players). */
function lookRow(b) {
  const list = roomLooks(b.type);
  const cur = list.includes(b.look) ? b.look : list[0];
  return h('div', { class: 'row wrap look-row' }, h('span', { class: 'small muted' }, 'Look'),
    info('How the room is furnished. It only changes the picture, not what the room does. Pick one anyone made, or make your own in the room editor (on a bigger screen).'),
    h('span', { class: 'grow' }, h('b', null, cur ? lookName(cur) : 'Bare'), h('br'), h('span', { class: 'small muted' }, cur ? byWhom(b.type, cur) : '')),
    h('button', { class: 'btn small', onclick: () => openLooks(b) }, ico('build'), 'Change look'));
}

/** Every look for the room's type with a picture of it: use one, change your own, copy any into the editor. */
function openLooks(b0) {
  const b = () => F().buildings.find((x) => x.id === b0.id) || b0;
  lookList({
    type: b0.type, title: () => 'Looks for ' + buildingName(b()), material: roomMaterial(b0.type), building: b0.id,
    current: () => { const list = roomLooks(b0.type), l = b().look; return list.includes(l) ? l : list[0]; },
    use: (n) => bus.act({ type: 'roomLook', building: b0.id, look: n }),
  });
}

/** The look list of a room type: `o` = {type, title(), current(), use(name), material, building?, list?(), plain?}. */
function lookList(o) {
  openSheet(() => {
    const list = o.list ? o.list() : roomLooks(o.type), cur = o.current();
    const target = { building: o.building, use: o.use };
    return h('div', null,
      h('h2', null, o.title(), info('Built-in looks come with the game; the others were made by players in the room editor, and everyone can use them. A look only changes the picture.')),
      h('div', { class: 'looks' },
        o.plain ? h('div', { class: 'card sub look' + (!cur ? ' on' : '') },
          h('div', { class: 'row wrap' },
            h('span', { class: 'grow' }, h('b', null, 'Like the hold'), h('br'), h('span', { class: 'small muted' }, o.plain)),
            !cur ? h('span', { class: 'chip-in-use small' }, 'In use') : h('button', { class: 'btn small primary', onclick: () => o.use('') }, 'Use'))) : null,
        list.map((n) => {
          const mine = (lookInfo(o.type, 'room', n) || {}).mine;
          return h('div', { class: 'card sub look' + (n === cur ? ' on' : '') },
            lookPreview(o.type, n),
            h('div', { class: 'row wrap' },
              h('span', { class: 'grow' }, h('b', null, lookName(n)), h('br'), h('span', { class: 'small muted' }, byWhom(o.type, n))),
              editorFits() && mine ? h('button', { class: 'btn small', onclick: () => openEditor({ type: o.type, name: n, ...target }) }, 'Edit') : null,
              !editorFits() ? null : h('button', { class: 'btn small', title: 'Open a copy in the room editor', onclick: () => openEditor({ type: o.type, name: n, copy: true, ...target }) }, 'Copy'),
              n === cur ? h('span', { class: 'chip-in-use small' }, 'In use')
                : h('button', { class: 'btn small primary', onclick: () => o.use(n) }, 'Use'))
          );
        })),
      !editorFits() ? null : h('button', { class: 'btn primary wide', onclick: () => openEditor({ type: o.type, name: cur || list[0], copy: true, ...target }) }, ico('build'), 'Make a new look'));
  }, null, o.material);
  refreshLooks().then(refreshSheet).catch(() => {});          // others may have made new looks meanwhile
}

/**
 * The looks of a hallway (the whole run on its floor) or a stairwell, from a click in the hold: {way, c, f}.
 * Hallway looks with lamps (_lit) or decoration (_deco) are variants the hold mixes in by itself, so they are not listed.
 */
export function openWayLooks(q) {
  const type = q.way, key = () => {
    const L = F().layout || {};
    if (type === 'stairwell') return (L.wells || []).includes(q.c + ',' + q.f) ? q.c + ',' + q.f : (q.c - 1) + ',' + q.f;
    return q.c + ',' + q.f;
  };
  const list = () => { const all = roomLooks(type); return all.filter((n) => !/_(lit|deco)$/.test(n) || !all.includes(n.replace(/_(lit|deco)$/, ''))); };
  lookList({
    type, list, material: 'forge',
    title: () => (type === 'hallway' ? 'Looks for this hallway' : 'Looks for this stairwell'),
    plain: type === 'hallway' ? 'Follows the entrance hall. The whole hallway on this floor changes.' : 'Follows the entrance hall.',
    current: () => ((F().layout || {}).looks || {})[key()] || '',
    use: (n) => bus.act({ type: 'wayLook', col: q.c, floor: q.f, look: n }),
  });
}

/** A room the player placed that waits for its ground: how much is left to dig, and taking it back. */
export function openPlanSheet(id, at) {
  const p0 = ((F().layout || {}).plans || []).find((x) => x.id === id);
  openSheet(() => {
    const L = F().layout || {}, p = (L.plans || []).find((x) => x.id === id);
    if (!p) return h('div', null, h('h2', null, 'Planned room'), h('p', { class: 'small muted' }, 'It stands now, or the plan was taken back.'));
    const t = byId.buildings[p.type], w = G.data.plan.rooms[p.type] || 5;
    const marks = new Set(L.marks || []);
    let rock = 0;
    for (let x = p.col; x < p.col + w; x++) if (marks.has(x + ',' + p.floor)) rock++;
    const miners = F().dwarves.filter((d) => d.job === 'miner').length;
    return h('div', null,
      h('h2', null, t.name + ' (planned)', info('You placed this room on rock. Your miners dig the rock out, then the room stands there by itself. It is paid already.')),
      h('p', { class: 'small' }, rock ? `${rock} of ${w} cells are still rock. ` : 'The ground is dug out. ', rock && !miners ? h('b', null, 'Put a dwarf to work as a miner to dig it out.') : null),
      h('p', { class: 'small muted' }, 'Paid: ' + [p.coins ? moneyText(p.coins) : null, ...Object.entries(p.goods || {}).map(([k, v]) => fmt(v) + ' ' + goodName(k).toLowerCase())].filter(Boolean).join(', ') + '.'),
      h('button', { class: 'btn danger wide', onclick: async () => { await bus.act({ type: 'cancelPlan', plan: p.id }); closeSheet(); } }, 'Take the plan back (everything is paid back)'));
  }, at, roomMaterial(p0 ? p0.type : 'tavern'));
}

/** A small picture of a look: wall, floor and furniture, a little dimmed like the inside of the mountain. */
function lookPreview(type, n) {
  const c = h('canvas', { class: 'look-pic', width: 1, height: R.RH, 'aria-hidden': 'true' });
  R.get(type, 'room', n).then((t) => {
    if (!t) return;
    const w = (t.cells || 5) * R.CELL, reps = type === 'hallway' ? 4 : 1;   // a hallway is shown as a short run
    c.width = w * reps;
    if (c.width < 240) c.classList.add('narrow');                            // a stairwell: no taller than a room picture
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let i = 0; i < reps; i++) {
      const x = i * w;
      R.drawShell(g, t, x, 0, w, x);
      R.drawProps(g, t, x, 0, 0, { layer: 'back' });
      R.drawProps(g, t, x, 0, 0, { layer: 'front' });
    }
    g.fillStyle = 'rgba(20,12,28,0.18)'; g.fillRect(0, 0, c.width, R.RH);
    for (let i = 0; i < reps; i++) R.drawProps(g, t, i * w, 0, 0, { glow: true });
  }).catch(() => {});
  return c;
}

// ------------------------------------------------------------------ the room editor, inside the game

let dock = null;
/** The editor needs room for its palette and side bar: offered on bigger screens only, not on phones. */
const editorFits = () => matchMedia('(min-width: 761px)').matches;
/**
 * Open the room editor over the game ({type, part, name, copy, building}). It runs in a frame and tells the game
 * when it saved a look (then the room gets it) and when it is closed.
 */
export function openEditor(o = {}) {
  if (dock || !editorFits()) return;
  const q = new URLSearchParams({ embed: '1', type: o.type || '', part: o.part || 'room', name: o.name || '' });
  if (o.copy) q.set('copy', '1');
  const frame = h('iframe', { class: 'editor-frame', src: 'editor/index.html?' + q, title: 'Room editor' });
  const body = h('div', { class: 'editor-win win forge' }, ...frameDecor(false), frame);
  dock = h('div', { class: 'editor-dock', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Room editor' }, body);
  document.body.append(dock);
  slideIn(body, 'bottom');
  const onMsg = async (e) => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data || e.data.deepforge !== 'editor') return;
    const d = e.data;
    if (d.saved || d.deleted) {
      await refreshLooks(d.saved || d.deleted).catch(() => {});
      const b = o.building && F().buildings.find((x) => x.id === o.building);
      if (d.saved && o.use && !b && d.saved.type === o.type && (d.saved.part || 'room') === 'room') {
        await o.use(d.saved.name);
        toast(`${lookName(d.saved.name)} is in use now.`, 'good');
      } else if (d.saved && b && d.saved.type === b.type && (d.saved.part || 'room') === 'room') {
        await bus.act({ type: 'roomLook', building: b.id, look: d.saved.name });
        toast(`${lookName(d.saved.name)} is now the look of ${buildingName(b)}.`, 'good');
      }
      refreshSheet();
    }
    if (d.close) close();
  };
  const close = () => {
    removeEventListener('message', onMsg);
    const el = dock; dock = null;
    slideOut(body, 'bottom').done.then(() => el.remove());
    refreshSheet();
  };
  addEventListener('message', onMsg);
}

/** The guards of the entrance hall, and who could join them. */
function hallCard(f, cur) {
  const d = D();
  const guards = f.dwarves.filter((x) => x.job === 'warrior' && x.post === 'hall');
  const could = f.dwarves.filter((x) => !x.busy && !(x.job === 'warrior' && x.post === 'hall') && (x.job === 'warrior' || x.job === 'idle'));
  return [
    h('div', { class: 'row between' }, h('h3', null, `Guards ${guards.length} / ${d.hallSeats}`), h('span', null, 'Gate defence ', h('b', { class: 'gold-t' }, fmt(d.gatePower)))),
    h('p', { class: 'small muted' }, `They defend the gate against raids and run to critters on their own, +${Math.round((d.hallBonus - 1) * 100)}% when they fight at home. Standing watch and sparring, they slowly get better.`),
    guards.length ? h('div', { class: 'list' }, guards.map((x) => h('div', { class: 'card sub row' }, img(S.portrait(x)),
      h('span', { class: 'grow' }, h('b', null, fullName(x)), h('br'), h('span', { class: 'small muted' }, x.busy ? 'Away' : `combat ${d.dwarves[x.id].skills.combat} · power ${fmt(d.dwarves[x.id].power)}`)),
      !x.busy ? h('button', { class: 'btn small', onclick: () => bus.act({ type: 'assign', dwarf: x.id, job: 'warrior', post: 'mine' }) }, 'To the mine') : null)))
      : h('p', { class: 'small warn-t' }, 'Nobody stands guard. Post warriors or idle dwarves here.'),
    guards.length < d.hallSeats && could.length ? h('div', null, h('h3', null, 'Post a guard'), could.slice(0, 6).map((x) => h('div', { class: 'row' }, img(S.portrait(x)),
      h('span', { class: 'grow small' }, fullName(x), ' · ', jobLabel(x)),
      h('button', { class: 'btn small good', onclick: () => bus.act({ type: 'assign', dwarf: x.id, job: 'warrior', post: 'hall' }) }, 'Post here')))) : null,
    upgradeBtn(f.buildings.find((b) => b.type === (cur.type === 'gate' ? 'entrance_hall' : 'gate'))),
  ];
}

export function openDwarfSheet(d, at) {
  openSheet(() => {
    const cur = F().dwarves.find((x) => x.id === d.id);
    if (!cur) return h('p', null, 'This dwarf is gone.');
    return h('div', null, dwarfCard(cur),
      G.state.cheats ? h('button', { class: 'btn small', onclick: () => lookSheet(cur) }, ico('cheat'), 'Change looks (cheat)') : null);
  }, at || null, 'dwarf');
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
  const what = h('select', null, keys.map((k) => h('option', { value: k }, k === 'coins' ? 'Marks' : goodName(k))));
  const amount = h('input', { type: 'number', value: 100, min: -100000, max: 100000 });
  return h('div', { class: 'card cheats' },
    h('h3', null, ico('cheat'), ' Cheats'),
    h('p', { class: 'small muted' }, 'Test helpers. Everyone on this server with cheats on can use them.'),
    h('div', { class: 'row' }, what, amount, h('button', { class: 'btn small good', onclick: () => bus.act({ type: 'cheatGive', key: what.value, amount: +amount.value }) }, 'Give')),
    h('div', { class: 'row' },
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatStarter' }) }, 'Cart of supplies'),
      h('button', { class: 'btn small', onclick: () => { if (confirm('Finish the whole hold? Every room is rebuilt in a new place, and all dwarves get new jobs.')) bus.act({ type: 'cheatShowcase' }); } }, 'Finish the hold'),
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatDwarves', count: 1 }) }, '+1 dwarf'),
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatDwarves', count: 5 }) }, '+5 dwarves'),
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatHeal' }) }, 'Heal and cheer everyone')),
    h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Skip time:'), ...[1, 3, 6, 12].map((hh) =>
      h('button', { class: 'btn small', onclick: () => bus.act({ type: 'cheatSkip', hours: hh }) }, hh + 'h'))),
    h('p', { class: 'small dim' }, 'Change a dwarf\'s looks: click the dwarf in the hold.'));
}

export { jobLabel };
