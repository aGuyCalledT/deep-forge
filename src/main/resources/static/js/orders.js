// New orders at a workshop: a list of everything it can make (makeable first), then a recipe on parchment where you
// say how many, forever, or under conditions (if ... and ... then N, unless more than M in stock).
import { G, F, byId, fmt, goodName, stock, isItem, parseItem, gemsInStock, gemKind, gemGradeOf, wordChances, moneyText, baseValue, buildingName } from './data.js';
import { h, img, goodIcon, openSheet, closeSheet, refreshSheet, bus, toast, ico, info } from './ui.js';
import { paper } from './paper.js';
import * as S from './sprites.js';
import * as A from './audio.js';

/** Level a workshop needs for conditions (Actions.KEEP_LEVEL). */
export const RULE_LEVEL = 2;

/** Which metals suit a piece (Content.metalFits). */
export function fits(t, m) {
  if (t.rule === 'hard') return m.hardness >= 3 && m.id !== 'pig_iron';
  if (t.rule === 'tool') return m.hardness >= 2 && !m.precious && m.id !== 'pig_iron';
  if (t.rule === 'precious') return m.precious;
  if (t.rule === 'pewter') return m.id.endsWith('_pewter');
  if (t.rule.startsWith('only:')) return m.id === t.rule.slice(5);
  return true;
}

/** Stock as shown in brackets: from 100 on just ">99". */
export const amt = (n) => (n > 99 ? '>99' : fmt(n));

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const unlocked = (bp) => !bp || F().blueprints.includes(bp);

/** Inputs as a list of {icon, n, have, name}: goods by key, or pieces to work on. */
function goods(map) {
  return Object.entries(map).map(([k, n]) => ({ key: k, icon: () => goodIcon(k, 'icon s'), n, have: stock(k), name: goodName(k) }));
}
/** Pieces of a type without a finish yet (for sharpening, engraving, inlay). */
function pieces(type, mod) {
  return Object.entries(F().stock).filter(([k, v]) => v > 0 && isItem(k) && parseItem(k).type === type && !parseItem(k).mods.includes(mod))
    .reduce((s, [, v]) => s + v, 0);
}
const metalsFor = (t) => G.data.metals.filter((m) => fits(t, m)).sort((a, b) => stock('bar:' + b.id) - stock('bar:' + a.id));

function craftIns(t, metal) {
  const o = { ['bar:' + metal]: t.bars };
  for (const [k, v] of Object.entries((G.data.parts || {})[t.id] || {})) o[k] = (o[k] || 0) + v;
  o.coal = (o.coal || 0) + 1;
  return o;
}

/** A recipe row: what it is, what goes in, what comes out, whether it can be made now. */
function row(r) {
  r.ins = r.ins || [];
  r.can = r.locked ? 0 : r.ins.length ? Math.min(...r.ins.map((x) => Math.floor(x.have / x.n))) : 0;
  return r;
}

/** Everything a workshop can make, makeable first, locked last. */
export function recipesFor(b) {
  const out = [];
  const D = G.data;
  if (b.type === 'smelter') {
    for (const o of D.ores) {
      const m = byId.metals[o.metal];
      out.push(row({ id: 'smelt:' + o.id, recipe: 'smelt', mat: o.id, name: m.name + ' bar', sub: 'from ' + o.name.toLowerCase(),
        ins: goods({ [o.id]: 2, coal: 1 }), outs: [{ icon: () => goodIcon('bar:' + o.metal), n: 1, name: m.name + ' bar', key: 'bar:' + o.metal }],
        note: o.bonusMetal ? `Sometimes a bit of ${o.bonusMetal} too (${Math.round(o.bonusChance * 100)} %).` : m.meltNote }));
    }
    for (const a of D.alloys) {
      const ins = {};
      for (const [k, v] of Object.entries(a.inputs)) ins['bar:' + k] = v;
      ins.coal = 1;
      if (a.flux) ins.limestone = 1;
      const m = byId.metals[a.metal];
      out.push(row({ id: 'alloy:' + a.metal, recipe: 'alloy', mat: a.metal, name: m.name + ' bar', sub: 'alloy', ins: goods(ins),
        outs: [{ icon: () => goodIcon('bar:' + a.metal), n: a.out, name: m.name + ' bar', key: 'bar:' + a.metal }],
        locked: unlocked(a.blueprint) ? null : 'Needs a blueprint from an expedition', note: m.meltNote }));
    }
  } else if (b.type === 'forge' || b.type === 'mechanic') {
    if (b.type === 'mechanic')
      out.push(row({ id: 'gears', recipe: 'gears', name: 'Gears', ins: goods({ 'bar:brass': 2 }), outs: [{ icon: () => goodIcon('gears'), n: 1, name: 'Gears', key: 'gears' }],
        note: 'Fine parts for clocks, locks and other pieces.' }));
    for (const t of D.items) {
      const composite = !!(D.parts || {})[t.id];
      if (composite !== (b.type === 'mechanic')) continue;
      const ms = metalsFor(t);
      if (!ms.length) continue;
      // the row shows the metal you have most of; the parchment lets you pick another
      const best = ms.reduce((x, m) => (Math.floor(stock('bar:' + m.id) / t.bars) > Math.floor(stock('bar:' + x.id) / t.bars) ? m : x), ms[0]);
      out.push(row({ id: 'item:' + t.id, recipe: composite ? 'assemble' : 'craft', itype: t.id, mat: best.id, name: t.name, sub: t.category, cat: t.category,
        ins: goods(craftIns(t, best.id)), metals: ms, item: t,
        outs: [{ icon: (mat) => img(S.item(t.id, mat || best.id)), n: 1, name: t.name }],
        locked: unlocked(t.blueprint) ? null : 'Needs a blueprint from an expedition', note: t.note }));
    }
  } else if (b.type === 'grindstone' || b.type === 'engraver') {
    const recs = b.type === 'grindstone' ? ['sharpen'] : ['engrave', 'inlay'];
    for (const rec of recs) {
      const mod = { sharpen: 's', engrave: 'e', inlay: 'i' }[rec], md = byId.mods[mod];
      for (const t of D.items.filter((x) => x.mods.includes(mod))) {
        const ins = [{ icon: () => img(S.item(t.id, 'iron'), 'icon s'), n: 1, have: pieces(t.id, mod), name: t.name }];
        if (rec === 'inlay') ins.push(...goods({ ['bar:' + D.inlay.metal]: D.inlay.bars }));
        out.push(row({ id: rec + ':' + t.id, recipe: rec, itype: t.id, name: md.name + ' ' + t.name.toLowerCase(), sub: md.name.toLowerCase(), ins,
          outs: [{ icon: () => img(S.item(t.id, 'iron')), n: 1, name: md.name + ' ' + t.name.toLowerCase() }],
          note: md.note + (mod === 'i' ? '' : `. Worth ×${md.mult}`) + '. The best matching piece goes first.' }));
      }
    }
  } else if (b.type === 'jeweler') {
    out.push(row({ id: 'cut:best', recipe: 'cutgem', name: 'Cut gem', sub: 'the finest rough gem first', ins: goods({ rough_gem: 1 }),
      outs: [{ icon: () => goodIcon('cut_gem'), n: 1, name: 'Cut gem' }],
      note: 'The jeweler\'s skill decides the cut quality. The shape is chance; at the market some shapes are in fashion.' }));
    for (const k of gemsInStock(true)) {
      const kind = gemKind(k);
      out.push(row({ id: 'cut:' + k, recipe: 'cutgem', itype: k, name: 'Cut ' + kind.name.toLowerCase(), sub: G.data.gems.tiers[kind.tier] + ' · ~' + moneyText(baseValue(k)),
        ins: goods({ [k]: 1 }), outs: [{ icon: () => goodIcon(`gem:1:${kind.id}:round_brilliant`), n: 1, name: 'Cut ' + kind.name.toLowerCase() }],
        note: 'The shape is chance: one of 22 cuts.' }));
    }
  } else if (b.type === 'wizard') {
    const M = D.magic;
    const gem = stock('cut_gem') > 0 || stock('rough_gem') === 0 ? 'cut_gem' : 'rough_gem';
    for (const sc of M.schools) {
      out.push(row({ id: 'magic:' + sc.id, recipe: 'enchant', mat: sc.id, name: sc.name + ' magic', sub: M.effects.filter((e) => e.school === sc.id).map((e) => e.name).join(', '),
        ins: goods({ [gem]: 1 }), outs: [{ icon: () => img(S.sprite('gem_' + sc.id)), n: 1, name: sc.name + ' gem' }], gemPick: true,
        note: 'The stars choose the effect and its strength. A finer gem, a better cut and a more skilled wizard roll higher.' }));
    }
  } else if (b.type === 'tailor') {
    out.push(row({ id: 'weave', recipe: 'weave', name: 'Cloth', sub: 'woven from mushroom fibre', ins: goods({ food: 3 }),
      outs: [{ icon: () => goodIcon('cloth'), n: 2, name: 'Cloth', key: 'cloth' }], note: 'Cloth for the tailor to sew.' }));
    const dye = Object.keys(D.dyes)[0];
    for (const c of D.clothes.filter((x) => x.cloth > 0)) {
      out.push(row({ id: 'sew:' + c.id, recipe: 'sew', itype: c.id, mat: dye, name: c.name, sub: 'sewn', ins: goods({ cloth: c.cloth }), dyes: true,
        outs: [{ icon: (mat) => goodIcon(`wear:${c.id}:${mat || dye}`), n: 1, name: c.name }], note: 'Pick a colour on the pattern.' }));
    }
  }
  const rank = (r) => (r.locked ? 2 : r.can > 0 ? 0 : 1);
  return out.map((r, i) => [r, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([r]) => r);
}

/** "2 [icon] Iron bar (37)" for each input. */
function needLine(ins) {
  return h('span', { class: 'rc-ins' }, ins.map((x) => h('span', { class: 'rc-in' + (x.have < x.n ? ' short' : ''), title: `${x.name}: you have ${fmt(x.have)}` },
    h('span', { class: 'rc-n' }, x.n + '×'), x.icon(), h('span', { class: 'rc-name' }, x.name), h('span', { class: 'rc-have' }, `(${amt(x.have)})`))));
}

// ------------------------------------------------------------------ the list

const filters = {};

/** The list of everything a workshop can make. A click opens the recipe on parchment. */
export function orderSheet(b) {
  openSheet(() => {
    const list = recipesFor(b);
    const cats = [...new Set(list.map((r) => r.cat).filter(Boolean))];
    const cat = cats.includes(filters[b.id]) ? filters[b.id] : null;
    const shown = cat ? list.filter((r) => r.cat === cat) : list;
    const can = list.filter((r) => r.can > 0).length;
    return h('div', { class: 'ws-theme ws-' + b.type },
      h('h2', null, buildingName(b) + ': what to make?'),
      h('p', { class: 'small muted' }, can ? `You can make ${can} of these right now.` : 'Nothing has all its materials yet. Orders wait until they do.',
        info('Greyed out: the materials are missing. You can still order it; the workshop starts once they are in.')),
      cats.length > 1 ? h('div', { class: 'row wrap rc-cats' }, [null, ...cats].map((c) => h('button', { class: 'btn small' + (c === cat ? ' pressed' : ''),
        onclick: () => { filters[b.id] = c; refreshSheet(); } }, c ? cap(c) : 'All'))) : null,
      h('div', { class: 'rc-list' }, shown.map((r) => h('button', { class: 'btn rc-row' + (r.can > 0 ? '' : ' off'), disabled: !!r.locked,
        onclick: () => recipeModal(b, r) },
        h('span', { class: 'rc-out' }, r.outs[0].icon()),
        h('span', { class: 'rc-text' },
          h('span', { class: 'rc-title' }, r.name, r.outs[0].n > 1 ? h('span', { class: 'rc-x' }, ' ×' + r.outs[0].n) : null,
            r.can > 0 ? h('span', { class: 'rc-can' }, ` · enough for ${amt(r.can)}`) : null),
          r.locked ? h('span', { class: 'rc-sub' }, ico('lock'), ' ' + r.locked) : needLine(r.ins))))),
      list.length ? null : h('p', { class: 'muted' }, b.type === 'jeweler' ? 'No rough gems yet. Miners find them.' : 'Nothing to make here yet.'));
  }, null, 'forge');
}

// ------------------------------------------------------------------ the recipe on parchment

let modal = null;

function closeModal() {
  if (!modal) return;
  const m = modal;
  modal = null;
  A.sfx('close');
  m.classList.add('out');
  setTimeout(() => m.remove(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal) { closeModal(); e.stopImmediatePropagation(); e.preventDefault(); } }, true);

/** Goods a condition can name: this recipe's inputs and product first, then bars, ores and raw goods. */
function conditionGoods(r) {
  const first = [...r.ins.filter((x) => x.key).map((x) => x.key), ...r.outs.filter((x) => x.key).map((x) => x.key)];
  const rest = [...G.data.metals.map((m) => 'bar:' + m.id), ...G.data.ores.map((o) => o.id), ...G.data.raws.map((x) => x.id)];
  return [...new Set([...first, ...rest])];
}

const COUNTS = [1, 5, 10, 25];

/** A recipe drawn on parchment: inputs, an ink arrow, the product; how many, forever, or under conditions. */
export function recipeModal(b, r) {
  closeModal();
  A.sfx('open');
  const st = { mat: r.mat, itype: r.itype, count: 1, forever: false, rule: false, when: [], batch: 10, unless: false, over: 100 };
  const ruleOk = b.level >= RULE_LEVEL;
  const root = h('div', { class: 'rc-modal ws-theme ws-' + b.type, role: 'dialog', 'aria-modal': 'true', 'aria-label': r.name });
  const render = () => {
    const ins = r.metals ? goods(craftIns(r.item, st.mat)) : r.gemPick && st.itype ? goods({ [st.itype]: 1 }) : r.ins;
    const outMat = r.dyes || r.metals ? st.mat : null;
    const canNow = ins.length ? Math.min(...ins.map((x) => Math.floor(x.have / x.n))) : 0;
    const term = (x) => h('span', { class: 'rc-term' }, h('span', { class: 'ink-n' }, x.n + '×'), h('span', { class: 'sepia' }, x.icon(outMat)), h('span', { class: 'ink-name' }, x.name));
    const parts = [];
    parts.push(h('button', { class: 'sheet-x rc-x-btn', 'aria-label': 'Close', onclick: closeModal }), h('h3', null, r.name), r.sub ? h('p', { class: 'who' }, cap(r.sub)) : null);
    parts.push(h('div', { class: 'rc-formula' },
      h('div', { class: 'rc-side' }, ins.map((x, i) => [i ? h('span', { class: 'ink-plus' }, '+') : null, term(x)])),
      img(S.sprite('ui_arrow'), 'rc-arrow sepia', 'makes'),
      h('div', { class: 'rc-side' }, r.outs.map((x) => term(x)))));
    parts.push(h('p', { class: 'small rc-have-line ' + (canNow > 0 ? 'good-t' : 'bad-t') }, canNow > 0 ? `Enough for ${fmt(canNow)} right now.` : 'Not enough yet. The order waits until it is.',
      ' ', ins.map((x) => `${x.name} (${amt(x.have)})`).join(', ')));
    if (r.note) parts.push(h('p', { class: 'small muted' }, r.note));

    // choices that belong to the recipe
    if (r.metals) {
      parts.push(h('div', { class: 'rc-label' }, 'Metal'), h('div', { class: 'row wrap' }, r.metals.map((m) => h('button', { class: 'btn small' + (st.mat === m.id ? ' pressed' : ''),
        onclick: () => { st.mat = m.id; draw(); } }, img(S.item(r.item.id, m.id), 'icon s'), m.name, h('span', { class: 'rc-have' }, `(${amt(stock('bar:' + m.id))})`)))));
      if (r.item.skill) parts.push(h('p', { class: 'small muted' }, `Skill ${r.item.skill} of 5: harder pieces come out crude more often.`));
    }
    if (r.dyes) parts.push(h('div', { class: 'rc-label' }, 'Colour'), h('div', { class: 'row wrap' }, Object.keys(G.data.dyes).map((d) => h('button', { class: 'btn small' + (st.mat === d ? ' pressed' : ''),
      onclick: () => { st.mat = d; draw(); } }, goodIcon(`wear:${r.itype}:${d}`, 'icon s'), cap(d)))));
    if (r.gemPick) {
      const gems = [...gemsInStock(), ...gemsInStock(true)].slice(0, 8);
      parts.push(h('div', { class: 'rc-label' }, 'Gem'), h('div', { class: 'row wrap' },
        h('button', { class: 'btn small' + (st.itype == null ? ' pressed' : ''), onclick: () => { st.itype = null; draw(); } }, 'The best I have'),
        gems.map((k) => { const ch = wordChances(gemGradeOf(k));
          return h('button', { class: 'btn small' + (st.itype === k ? ' pressed' : ''), title: `a lot or better ${Math.round((ch[2] + ch[3]) * 100)} %`, onclick: () => { st.itype = k; draw(); } },
            goodIcon(k, 'icon s'), gemKind(k).name, h('span', { class: 'rc-have' }, `(${amt(stock(k))})`)); })));
    }

    // how many
    parts.push(h('div', { class: 'rc-label' }, 'How many?'));
    parts.push(h('div', { class: 'row wrap rc-count' + (st.rule ? ' muted-box' : '') },
      COUNTS.map((c) => h('button', { class: 'btn small' + (!st.rule && !st.forever && st.count === c ? ' pressed' : ''), onclick: () => { st.count = c; st.forever = false; st.rule = false; draw(); } }, String(c))),
      h('span', { class: 'stepper' },
        h('button', { class: 'btn small', 'aria-label': 'One less', onclick: () => { st.count = Math.max(1, st.count - 1); st.forever = false; st.rule = false; draw(); } }, ico('minus')),
        h('span', { class: 'rc-num' }, st.forever || st.rule ? '–' : String(st.count)),
        h('button', { class: 'btn small', 'aria-label': 'One more', onclick: () => { st.count = Math.min(999, st.count + 1); st.forever = false; st.rule = false; draw(); } }, ico('plus'))),
      h('button', { class: 'btn small' + (st.forever && !st.rule ? ' pressed' : ''), onclick: () => { st.forever = true; st.rule = false; draw(); } }, 'Forever')));

    // conditions, folded away
    const det = h('details', { class: 'rc-rules', open: st.rule || st.openRules },
      h('summary', null, h('span', { class: 'rc-fold' }, 'Only under conditions'), info('A standing order: whenever the hold has enough of everything you name, the workshop makes a batch. Unless there is already plenty of the product.')));
    det.addEventListener('toggle', () => { st.openRules = det.open; });
    if (!ruleOk) det.append(h('p', { class: 'small warn-t' }, `Upgrade the workshop to level ${RULE_LEVEL} to set conditions.`));
    else det.append(ruleBlock(r, st, draw));
    parts.push(det);

    const send = async () => {
      const a = { type: 'queueAdd', building: b.id, recipe: r.recipe, mat: st.mat || null, itype: st.itype || null, count: st.forever ? -1 : st.count };
      if (st.rule) {
        a.count = -1;
        a.when = Object.fromEntries(st.when.filter((c) => c.key && c.n > 0).map((c) => [c.key, c.n]));
        a.batch = st.batch;
        if (st.unless) a.over = st.over;
      }
      try {
        await bus.act(a, false, true);
        closeModal();
        closeSheet();
      } catch (e) { toast(e.message, 'bad'); }
    };
    const full = b.queue.length >= 10;
    parts.push(h('div', { class: 'row rc-foot' },
      h('button', { class: 'btn', onclick: closeModal }, 'Cancel'),
      h('button', { class: 'btn primary grow', disabled: full || (st.rule && !st.when.some((c) => c.key) && !st.unless), title: full ? 'The queue is full (10 orders).' : '', onclick: send },
        ico('plus'), full ? 'Queue full' : 'Add to queue')));
    return paper('recipe:' + r.id, { nail: true, cls: 'rc-paper' }, ...parts);
  };
  const box = h('div', { class: 'rc-box' });
  function draw() { const y = box.scrollTop; box.replaceChildren(render()); box.scrollTop = y; }
  root.append(h('div', { class: 'rc-back', onclick: closeModal }), box);
  draw();
  document.body.append(root);
  modal = root;
}

/** IF <good> ≥ <n> AND ... THEN make <batch>, UNLESS more than <over> in stock. */
function ruleBlock(r, st, draw) {
  const keys = conditionGoods(r);
  const on = () => { st.rule = st.when.some((c) => c.key) || st.unless; };
  const num = (v, set, max = 9999) => h('input', { type: 'number', class: 'rc-numin', min: 1, max, value: v, inputmode: 'numeric',
    onchange: (e) => { set(Math.max(1, Math.min(max, Math.round(+e.target.value || 1)))); on(); draw(); } });
  const word = (w) => h('span', { class: 'rc-word' }, w);
  const rows = st.when.map((c, i) => h('div', { class: 'rc-cond' },
    word(i ? 'AND' : 'IF'),
    num(c.n, (v) => { c.n = v; }),
    h('span', { class: 'sepia' }, goodIcon(c.key, 'icon s')),
    h('select', { class: 'rc-sel', onchange: (e) => { c.key = e.target.value; draw(); } },
      keys.map((k) => h('option', { value: k, selected: k === c.key }, goodName(k)))),
    h('span', { class: 'small' }, 'in stock'),
    h('button', { class: 'btn small', 'aria-label': 'Remove condition', onclick: () => { st.when.splice(i, 1); on(); draw(); } }, ico('close'))));
  const first = r.ins.find((x) => x.key);
  return h('div', { class: 'rc-rule' },
    rows,
    st.when.length < 3 ? h('button', { class: 'btn small', onclick: () => {
      const used = new Set(st.when.map((c) => c.key));
      const k = r.ins.map((x) => x.key).find((x) => x && !used.has(x)) || keys.find((x) => !used.has(x));
      st.when.push({ key: k, n: Math.max(1, ((r.ins.find((x) => x.key === k) || first || { n: 1 }).n) * 10) });
      on(); draw();
    } }, ico('plus'), st.when.length ? 'AND …' : 'IF …') : null,
    h('div', { class: 'rc-cond' }, word('THEN'), h('span', { class: 'small' }, 'make'), num(st.batch, (v) => { st.batch = v; }, 999),
      h('span', { class: 'sepia' }, r.outs[0].icon(r.metals || r.dyes ? st.mat : null)), h('span', { class: 'small' }, r.outs[0].name)),
    h('div', { class: 'rc-cond' }, h('input', { type: 'checkbox', id: 'rc-unless', 'aria-label': 'Unless', checked: st.unless, onchange: (e) => { st.unless = e.target.checked; on(); draw(); } }),
      h('label', { for: 'rc-unless', class: 'rc-word rc-unless' }, 'UNLESS'), h('span', { class: 'small' }, 'more than'), num(st.over, (v) => { st.over = v; st.unless = true; }), h('span', { class: 'small' }, 'in stock')),
    h('p', { class: 'small muted' }, st.rule ? 'The order stays in the queue and checks again after every batch.' : 'Add a condition to turn this into a standing order.'));
}

/** Short words for an order's conditions, or null. */
export function ruleText(e) {
  const when = Object.entries(e.when || {});
  const bits = [];
  if (when.length) bits.push('if ' + when.map(([k, v]) => `${fmt(v)} ${goodName(k).toLowerCase()}`).join(' and ') + (e.batch > 0 ? `: ${e.batch} at a time` : ''));
  if (e.keep > 0) bits.push(`unless more than ${fmt(e.keep - 1)}`);
  return bits.length ? bits.join(', ') : null;
}
