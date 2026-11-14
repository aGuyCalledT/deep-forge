// Magic in the client: the window of a piece with its sockets and effects, and gem lists. Display only; the server
// decides (Magic.java). Green lines: what the gems do; orange: the legendary effect only artifacts have.
import { G, F, D, byId, goodName, isItem, parseItem, isGem, parseGem, gemKeyOf, gemKind, gemEffectText, itemGems, itemLegend, sockets, socketFactor,
  gemAmount, effectLine, pieceEffects, fmt, moneyText, baseValue } from './data.js';
import { h, img, goodIcon, openSheet, refreshSheet, closeSheet, bus, info } from './ui.js';
import * as S from './sprites.js';

/** Green effect lines (and the orange legendary one) for a piece. */
export function effectLines(key) {
  if (!key || !isItem(key)) return null;
  const fx = pieceEffects(key), leg = itemLegend(key);
  const lines = Object.entries(fx).map(([e, v]) => h('div', { class: 'fx' }, effectLine(e, v)));
  if (leg) lines.push(h('div', { class: 'fx legend' }, leg.name + ': ' + leg.note));
  return lines.length ? h('div', null, lines) : null;
}

/** The dwarf's summed effects (capped by the server), green, and legendary ones in orange. */
export function dwarfEffects(id) {
  const dd = D().dwarves[id] || {};
  const lines = Object.entries(dd.magic || {}).map(([e, v]) => h('div', { class: 'fx' }, effectLine(e, v)));
  for (const l of dd.legends || []) { const x = G.data.magic.legends.find((y) => y.id === l); if (x) lines.push(h('div', { class: 'fx legend' }, x.name + ': ' + x.note)); }
  if (dd.toolSpeed > 0) lines.push(h('div', { class: 'fx' }, `+${Math.round(dd.toolSpeed * 100)}% work speed from the right tool`));
  return lines;
}

/** Enchanted gems in the warehouse. */
export function enchantedGems() {
  return Object.entries(F().stock).filter(([k, v]) => v > 0 && isGem(k) && parseGem(k).effect);
}

/** Find the current key of a piece reference: {item}, {dwarf, slot} or {artifact}. */
function keyOf(ref) {
  const f = F();
  if (ref.artifact != null) { const a = f.artifacts.find((x) => x.id === ref.artifact); return a && a.item; }
  if (ref.dwarf != null) { const d = f.dwarves.find((x) => x.id === ref.dwarf); return d && d[ref.slot]; }
  return (f.stock[ref.item] || 0) > 0 ? ref.item : null;
}

function socketIcons(key) {
  const gems = itemGems(key), n = sockets(key), out = [];
  for (let i = 0; i < n; i++) {
    const g = gems[i];
    out.push(g ? img(S.good(gemKeyOf(g)), 'sock', goodName(gemKeyOf(g))) : img(S.sprite('socket'), 'sock', 'Free socket'));
  }
  return h('div', { class: 'sockets' }, out.length ? out : h('span', { class: 'small muted' }, 'No sockets: crude pieces have none.'));
}

/** The window of one piece: name, sockets, effects in green and orange; set or take out gems at the wizard's tower. */
export function pieceSheet(ref, anchor) {
  const st = { ref: { ...ref } };
  openSheet(() => {
    const key = keyOf(st.ref);
    if (!key) return h('div', null, h('h2', null, 'Gone'), h('p', { class: 'small muted' }, 'This piece is not here any more.'));
    const p = parseItem(key), t = byId.items[p.type], tower = (F().buildings.find((b) => b.type === 'wizard') || {}).level > 0;
    const gems = itemGems(key), free = sockets(key) - gems.length;
    const art = st.ref.artifact != null ? F().artifacts.find((x) => x.id === st.ref.artifact) : null;
    const act = async (a) => {
      const before = { ...F().stock };
      await bus.act({ ...a, ...st.ref });
      // a stock piece gets a new key once a gem goes in or out: follow it
      if (st.ref.item) {
        const k2 = Object.keys(F().stock).find((k) => F().stock[k] > (before[k] || 0) && isItem(k) && k.startsWith(`item:${p.type}:${p.metal}:${p.q}:`));
        if (k2) st.ref.item = k2;
      }
      refreshSheet();
    };
    return h('div', null,
      h('div', { class: 'row' }, goodIcon(key, 'icon xl'), h('div', { class: 'grow' }, h('h2', { style: { margin: 0 } }, art ? art.name : goodName(key)),
        art ? h('div', { class: 'small' }, goodName(key)) : null,
        h('span', { class: 'small muted' }, `~${moneyText(art ? art.value : baseValue(key))}` + (t.slot ? ` · worn as ${t.slot}` : '')))),
      socketIcons(key),
      effectLines(key) || h('p', { class: 'fx dim' }, free > 0 ? 'Set an enchanted gem to give this piece power.' : ''),
      h('p', { class: 'small muted' }, `Sockets ×${+socketFactor(key).toFixed(2)} for its metal${p.q >= 5 ? ' and legend' : ''} `,
        info('A gem brings the kind of effect, the socket makes the number: better quality gives more sockets, more precious metal stronger ones. A gem counts twice in a piece made for it (mining in a pickaxe, smithing in a hammer, combat in a weapon, defence in armor, trade in scales); jewelry fits everything at ×1.5. Legendary pieces never break.')),
      gems.length ? h('div', { class: 'card sub' }, h('b', null, 'In the sockets'),
        gems.map((g, i) => h('div', { class: 'row' }, img(S.good(gemKeyOf(g)), 'icon s'),
          h('span', { class: 'grow small' }, h('span', { class: 'fx' }, effectLine(g.effect, gemAmount(key, g))), h('span', { class: 'muted' }, ` · ${gemKind(gemKeyOf(g)).name.toLowerCase()}, ${G.data.magic.cuts[g.cut].toLowerCase()}`)),
          tower ? h('button', { class: 'btn small', title: 'Free, but 1 in 4 gems cracks', onclick: () => act({ type: 'unsocket', index: i }) }, 'Take out') : null))) : null,
      free > 0 ? h('div', { class: 'card sub' }, h('b', null, `Set a gem (${free} free)`),
        !tower ? h('p', { class: 'small muted' }, 'Gems are set at the wizard\'s tower.') : null,
        enchantedGems().length ? enchantedGems().sort((a, b) => gemAmount(key, parseGem(b[0])) - gemAmount(key, parseGem(a[0]))).slice(0, 10).map(([gk, n]) => {
          const g = parseGem(gk);
          return h('div', { class: 'row' }, goodIcon(gk, 'icon s'),
            h('span', { class: 'grow small' }, h('span', { class: 'fx' }, effectLine(g.effect, gemAmount(key, g))), h('span', { class: 'muted' }, ` · ${gemKind(gk).name.toLowerCase()}, ${G.data.magic.cuts[g.cut].toLowerCase()} · ${n}`)),
            tower ? h('button', { class: 'btn small good', onclick: () => act({ type: 'socket', gem: gk }) }, 'Set') : null);
        }) : h('p', { class: 'small muted' }, 'No enchanted gems. The wizard enchants cut or rough gems.')) : null);
  }, anchor, 'lore');
}
