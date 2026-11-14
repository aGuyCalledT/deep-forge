// Shared client state and helpers that mirror small parts of the server rules (display only).
export const G = {
  data: null,      // static content from /api/data
  state: null,     // last /api/state response
  market: null,    // last /api/market response
  me: null,
  offset: 0,       // server time - local time (seconds)
  tab: 'fortress',
  focus: null,     // building id or layer to highlight
};

export const byId = {};

export function indexData(d) {
  for (const k of ['metals', 'ores', 'raws', 'items', 'mods', 'monsters', 'buildings', 'traits', 'cities', 'traditions', 'clothes']) {
    byId[k] = {};
    for (const x of d[k]) byId[k][x.id || x.code] = x;
  }
  byId.alloys = {};
  for (const a of d.alloys) byId.alloys[a.metal] = a;
  byId.gemKinds = {};
  for (const x of d.gems.kinds) byId.gemKinds[x.id] = x;
  byId.gemShapes = {};
  for (const x of d.gems.shapes) byId.gemShapes[x.id] = x;
}

export const F = () => G.state.fortress;
export const D = () => G.state.derived;
export const now = () => Date.now() / 1000 + G.offset;

export function isItem(k) { return k.startsWith('item:'); }
export function isBar(k) { return k.startsWith('bar:'); }
export function parseItem(k) { const p = k.split(':'); return { type: p[1], metal: p[2], q: +p[3], mods: p[4] || '', gems: p[5] || '', legend: p[6] || '' }; }

// ------------------------------------------------------------------ magic (mirrors Magic.java, display only)
const MG = () => G.data.magic;
export const isGem = (k) => k.startsWith('gem:');
export const isRough = (k) => k.startsWith('rough:');
const OLD_KIND = 'rock_crystal', OLD_SHAPE = 'round_brilliant';
/** "gem:2:ruby:rose:smithq:3" -> {cut, kind, shape, effect, word}; a plain cut gem has no effect. Old keys read as rock crystal. */
export function parseGem(k) {
  const p = k.split(':');
  if (p.length <= 2) return { cut: +p[1], kind: OLD_KIND, shape: OLD_SHAPE, effect: null, word: 0 };
  if (p.length === 4 && effectDef(p[2])) return { cut: +p[1], kind: OLD_KIND, shape: OLD_SHAPE, effect: p[2], word: +p[3] };
  return { cut: +p[1], kind: p[2], shape: p[3], effect: p[4] || null, word: +(p[5] || 0) };
}
/** "rose cut", "oval cabochon" */
export const shapeName = (id) => (byId.gemShapes[id] || { name: id }).name;
export const gemKeyOf = (g) => `gem:${g.cut}:${g.kind}:${g.shape}` + (g.effect ? `:${g.effect}:${g.word}` : '');
/** The kind of a gem or rough gem key (Gems.java): name, colour, value, tier. */
export function gemKind(k) { return byId.gemKinds[isRough(k) ? k.slice(6) : parseGem(k).kind] || byId.gemKinds[OLD_KIND]; }
export const isPlainGem = (k) => isGem(k) && !parseGem(k).effect;
/** How well a gem takes magic, 0..4 (Magic.grade). */
export function gemGrade(tier, cut) { return Math.max(0, Math.min(4, MG().gradeTier * tier + MG().gradeCut * cut)); }
/** Chances of slightly / better / a lot / greatly for a grade (Magic.wordChances). */
export function wordChances(grade) {
  const lerp = (t) => { const i = Math.floor(grade); if (i >= t.length - 1) return t[t.length - 1]; const f = grade - i; return t[i] * (1 - f) + t[i + 1] * f; };
  const g = lerp(MG().greatly), a = lerp(MG().aLot), b = lerp(MG().better);
  return [1 - g - a - b, b, a, g];
}
/** The market's fashion factor for a cut gem now: the cut all the rage ×2, the two wanted ×1.4. */
export function fashion(k) {
  if (!isGem(k) || !G.market || !G.market.fashion) return 1;
  const s = parseGem(k).shape, f = G.market.fashion, d = G.data.gems;
  return s === f[0] ? d.rage : f.includes(s) ? d.wanted : 1;
}
export const effectDef = (id) => MG().effects.find((e) => e.id === id);
export const schoolOf = (effect) => effectDef(effect).school;
export function wordText(effect, word) { const e = effectDef(effect); return (e.less ? MG().lessWords : MG().words)[word - 1]; }
/** "a lot better smithing quality" */
export function gemEffectText(g) { return wordText(g.effect, g.word) + ' ' + effectDef(g.effect).name; }
export function gemValue(g) { return (byId.gemKinds[g.kind] || byId.gemKinds[OLD_KIND]).value * G.data.gems.cutMult[g.cut] * (g.effect ? 1 + 0.4 * g.word : 1); }
export function gemName(k) {
  const g = parseGem(k), cut = MG().cuts[g.cut] || 'Fair', kind = gemKind(k).name.toLowerCase();
  const shape = (byId.gemShapes[g.shape] || { name: 'cut' }).name;
  if (!g.effect) return `${cut} ${kind}, ${shape}`;
  const sc = MG().schools.find((x) => x.id === schoolOf(g.effect));
  return `${sc.name} ${kind} (${cut.toLowerCase()}, ${shape}): ${gemEffectText(g)}`;
}
/** The gems in a piece, in socket order. */
export function itemGems(k) {
  const s = parseItem(k).gems;
  return s ? s.split(',').map((x) => {
    const [effect, w, c, kind, shape] = x.split('.');
    return { effect, word: +w, cut: +c, kind: byId.gemKinds[kind] ? kind : OLD_KIND, shape: byId.gemShapes[shape] ? shape : OLD_SHAPE };
  }).filter((g) => effectDef(g.effect)) : [];
}
export function itemLegend(k) { const l = parseItem(k).legend; return l && MG().legends.find((x) => x.id === l) || null; }
export function metalAge(m) { const v = m.value; return v <= 600 ? 1 : v <= 1300 ? 2 : v <= 3200 ? 3 : v <= 8000 ? 4 : v <= 18000 ? 5 : 6; }
export function sockets(k) { const s = MG().sockets; return s[Math.min(s.length - 1, parseItem(k).q)]; }
export function socketFactor(k) {
  const p = parseItem(k), f = MG().ageFactor[metalAge(byId.metals[p.metal]) - 1];
  return p.q >= 5 ? f * MG().legendFactor : f;
}
export function gemFit(type, effect) {
  const t = byId.items[type]; if (!t) return 1;
  if (t.category === 'jewelry') return MG().jewelryFit;
  const f = MG().fits[type] || (t.slot && MG().fits[t.slot]);
  return f && f.includes(effect) ? MG().fit : 1;
}
/** What a gem gives in a piece: base × word × socket factor × fit. */
export function gemAmount(k, g) { return effectDef(g.effect).base * g.word * socketFactor(k) * gemFit(parseItem(k).type, g.effect); }
/** "+90% smithing quality", "-12% tool wear", "+6 mood" */
export function effectLine(effect, v) {
  const e = effectDef(effect);
  return e.points ? `+${Math.round(v)} ${e.name}` : `${e.less ? '-' : '+'}${Math.round(v * 100)}% ${e.name}`;
}
export function pieceEffects(k) {
  const m = {};
  for (const g of itemGems(k)) m[g.effect] = (m[g.effect] || 0) + gemAmount(k, g);
  return m;
}

export function goodName(k) {
  if (isItem(k)) {
    const p = parseItem(k);
    const q = G.data.qualities[p.q].name;
    const mods = [...p.mods].map((c) => byId.mods[c].name.toLowerCase()).join(' ');
    const n = itemGems(k).length;
    return `${q} ${mods ? mods + ' ' : ''}${byId.metals[p.metal].name.toLowerCase()} ${byId.items[p.type].name.toLowerCase()}${n ? (n === 1 ? ' with a gem' : ` with ${n} gems`) : ''}`;
  }
  if (isGem(k)) return gemName(k);
  if (isRough(k)) return 'Rough ' + gemKind(k).name.toLowerCase();
  if (k.startsWith('wear:')) {
    const p = k.split(':'), c = byId.clothes && byId.clothes[p[1]];
    return c ? p[2][0].toUpperCase() + p[2].slice(1) + ' ' + c.name.toLowerCase() : k;
  }
  if (isBar(k)) return byId.metals[k.slice(4)].name + ' bar';
  if (byId.ores[k]) return byId.ores[k].name;
  if (byId.raws[k]) return byId.raws[k].name;
  if (k.startsWith('cat:')) return k.slice(4)[0].toUpperCase() + k.slice(5);
  return k;
}

export function category(k) {
  if (k.startsWith('wear:')) return 'clothing';
  if (isGem(k) || isRough(k)) return 'gems';
  if (isItem(k)) return byId.items[parseItem(k).type].category;
  if (isBar(k)) return 'bars';
  if (byId.ores[k]) return 'ore';
  return byId.raws[k] ? byId.raws[k].category : 'materials';
}

/** Market key: one price per item type (all battle axes), one for all clothes, everything else its own. */
export function marketKey(k) {
  if (k.startsWith('wear:')) return 'cat:clothing';
  if (isItem(k)) return 'type:' + parseItem(k).type;
  if (isGem(k)) return 'cut_gem';
  if (isRough(k)) return 'rough_gem';
  return k;
}

/** Display name of a market key: "Battle axes", "Copper bar". */
export function marketName(mk) {
  const g = G.market && G.market.goods[mk];
  if (g) return g.name;
  if (mk.startsWith('type:')) return byId.items[mk.slice(5)].name + 's';
  return mk === 'cat:clothing' ? 'Clothes' : goodName(mk);
}

/** The good a market key's price is quoted for (a common bronze axe, a linen shirt...). */
export function refGood(mk) { return (G.market && G.market.goods[mk] && G.market.goods[mk].ref) || mk; }

/** Does this stock key belong to the market key? */
export function inMarket(k, mk) { return marketKey(k) === mk; }

/** What one quality step multiplies an item's value by (same formula as Content.qualityStep). */
export function qualityStep(t) { return 1.2 + 0.1 * t.skill; }

/** Value factor of a quality tier: Normal 1, one step per tier; an artifact is five masterworks. */
export function qualityMult(t, q) {
  const s = qualityStep(t), art = G.data.qualities.length - 1;
  return q >= art ? 5 * Math.pow(s, art - 2) : Math.pow(s, q - 1);
}

/** What goes into a piece besides its own bars: parts of assembled pieces and the gold inlay (as Content.extraValue). */
export function extraValue(type, mods) {
  let v = 0;
  for (const [k, n] of Object.entries((G.data.parts || {})[type] || {})) v += baseValue(k) * n;
  if (mods.includes('i') && G.data.inlay) v += 2 * G.data.inlay.bars * byId.metals[G.data.inlay.metal].value;
  return v;
}

export function baseValue(k) {
  if (k.startsWith('wear:')) { const c = byId.clothes[k.split(':')[1]]; return c ? c.value : 0; }
  if (isItem(k)) {
    const p = parseItem(k), t = byId.items[p.type], m = byId.metals[p.metal];
    let v = (m.value * t.bars + extraValue(p.type, p.mods)) * t.factor * qualityMult(t, p.q);
    for (const c of p.mods) v *= byId.mods[c].mult;
    for (const g of itemGems(k)) v += gemValue(g);
    return v;
  }
  if (isGem(k)) return gemValue(parseGem(k));
  if (isRough(k)) return gemKind(k).value;
  if (isBar(k)) return byId.metals[k.slice(4)].value;
  if (byId.ores[k]) return byId.ores[k].value;
  return byId.raws[k] ? byId.raws[k].value : 0;
}

export function liquidity(mk) {
  const l = G.market && G.market.liquidity && G.market.liquidity[mk];
  if (l) return l;
  if (mk.startsWith('type:') || mk.startsWith('cat:')) return 150;
  return 2000 / Math.sqrt(Math.max(1, baseValue(mk) / 100));
}

/** Price multiplier of a market key in a city (1 = base price). */
export function cityMult(city, mk) {
  const c = G.market && G.market.cities[city];
  return (c && c.mult && c.mult[mk]) || 1;
}

/** Estimated sale price per unit in a city, in Jots (before volume impact). */
export function sellPrice(city, k, bonus = 1) {
  return baseValue(k) * cityMult(city, marketKey(k)) * fashion(k) * bonus;
}

/** What a city asks when you buy one, in Jots. */
export function buyPrice(city, k, bonus = 1) {
  return baseValue(k) * cityMult(city, marketKey(k)) * (G.market ? G.market.buySpread : 1.25) / bonus;
}

/** How hard your trades move this price (1 for a small trader, more with a big market share). */
/** Reputation rank with a city (0..10). */
export function repRank(city) { const r = D().rep && D().rep[city]; return r ? r.rank : 0; }

export function marketPower(mk) { return (G.market && G.market.power && G.market.power[mk]) || 1; }

/** Revenue for selling q units at once, including the price drop. */
export function saleEstimate(city, k, q, bonus = 1) {
  if (q <= 0) return 0;
  const rk = repRank(city);
  bonus *= 1 + (D().repPrice || 0) * rk;
  const mk = marketKey(k), x = q / liquidity(mk) * marketPower(mk) / (1 + (D().repTake || 0) * rk);
  return q * sellPrice(city, k, bonus) * (1 - Math.exp(-x)) / x;
}

// Money: the server keeps Jots. 1 Gold Mark = 100 Silver Talents, 1 Talent = 10 Copper Jots.
export const JOT = 1, TALENT = 10, MARK = 1000;

/** The two biggest denominations of an amount in Jots: [['mark', 2], ['talent', 35]]. */
export function moneyParts(j) {
  j = Math.round(Math.abs(j || 0));
  const m = Math.floor(j / MARK), t = Math.floor((j % MARK) / TALENT), k = j % TALENT;
  const out = [];
  if (m) out.push(['mark', m]);
  if (t && m < 1000) out.push(['talent', t]);
  if (k && !m) out.push(['jot', k]);
  if (!out.length) out.push(['jot', 0]);
  return out.slice(0, 2);
}

/** Money as text: "2 M 35 T", "4 T 5 J". */
export function moneyText(j) {
  return (j < 0 ? '-' : '') + moneyParts(j).map(([d, n]) => fmt(n) + ' ' + d[0].toUpperCase()).join(' ');
}

/** Long money text for sentences: "2 Marks 35 Talents". */
export function moneyWords(j) {
  const name = { mark: ['Mark', 'Marks'], talent: ['Talent', 'Talents'], jot: ['Jot', 'Jots'] };
  return moneyParts(j).map(([d, n]) => fmt(n) + ' ' + name[d][n === 1 ? 0 : 1]).join(' ');
}

export function fmt(n) {
  if (n == null || isNaN(n)) return '0';
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
  return Math.round(n).toLocaleString('en');
}

export function dur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ago(t) {
  const s = now() - t;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

export function dwarf(id) { return F().dwarves.find((d) => d.id === id); }
export function fullName(d) { return d.first + ' ' + d.clan; }
export function building(id) { return F().buildings.find((b) => b.id === id); }

export function buildingName(b) {
  const t = byId.buildings[b.type];
  const same = F().buildings.filter((x) => x.type === b.type).length;
  return t.name + (t.multi && same > 1 ? ' ' + b.id.split('-')[1] : '');
}

export function jobLabel(d) {
  if (d.busy) return d.busy.startsWith('caravan') ? 'With a caravan' : 'On an expedition';
  switch (d.job) {
    case 'miner': return 'Miner · ' + G.data.layers[d.layer].name;
    case 'worker': { const b = building(d.building); return b ? buildingName(b) : 'Worker'; }
    case 'warrior': return d.post === 'mine' ? 'Warrior · mine patrol' : 'Guard · entrance hall';
    case 'merchant': return 'Merchant';
    case 'foreman': return 'Foreman';
    default: return 'Idle';
  }
}

export function costText(c) {
  if (!c) return '';
  const parts = [];
  if (c.coins) parts.push(moneyWords(c.coins));
  for (const [k, v] of Object.entries(c.goods || {})) parts.push(v + ' ' + goodName(k).toLowerCase());
  return parts.join(', ');
}

export function canPay(c) {
  if (!c) return false;
  const f = F();
  if (f.coins < c.coins) return false;
  for (const [k, v] of Object.entries(c.goods || {})) if ((f.stock[k] || 0) < v) return false;
  return true;
}

/** "cut_gem" counts every plain cut gem, "rough_gem" every rough gem, of any kind (like the server). */
export function stock(k) {
  if (k === 'cut_gem' || k === 'rough_gem') {
    let n = 0;
    for (const [x, v] of Object.entries(F().stock)) if (x === k || (k === 'cut_gem' ? isPlainGem(x) : isRough(x))) n += v;
    return n;
  }
  return F().stock[k] || 0;
}
/** Plain cut gems (or rough gems) in stock, the ones that take magic best first. */
export function gemsInStock(rough = false) {
  return Object.keys(F().stock).filter((k) => F().stock[k] > 0 && (rough ? isRough(k) : isPlainGem(k)))
    .sort((a, b) => gemGradeOf(b) - gemGradeOf(a) || baseValue(b) - baseValue(a) || (a < b ? -1 : 1));
}
export function gemGradeOf(k) { return gemGrade(gemKind(k).tier, isRough(k) ? 0 : parseGem(k).cut); }

// ------------------------------------------------------------------ resource overview per tab

function have(keys) { return keys.filter((k) => stock(k) > 0); }
function stockKeys(pred) { return Object.keys(F().stock).filter((k) => F().stock[k] > 0 && pred(k)).sort((a, b) => baseValue(b) * F().stock[b] - baseValue(a) * F().stock[a]); }

/** Which stores to show for the current tab (and workshop). */
export function contextResources() {
  if (!G.state) return [];
  const f = F();
  const bars = stockKeys(isBar), ores = stockKeys((k) => !!byId.ores[k]);
  const items = (pred) => stockKeys((k) => isItem(k) && pred(parseItem(k)));
  const prov = { title: 'Provisions', keys: ['food', 'ale'] };
  const mats = { title: 'Materials', keys: ['coal', 'limestone', 'stone'] };
  switch (G.tab) {
    case 'mines': {
      const layerOres = [];
      for (const l of f.layers) if (l.unlocked) for (const k of Object.keys(G.data.layers[l.index].weights)) if (!layerOres.includes(k)) layerOres.push(k);
      return [{ title: 'Dug from the mine', keys: layerOres }, { title: 'Other ore in store', keys: ores.filter((k) => !layerOres.includes(k)), empty: 'None.' }];
    }
    case 'work': {
      const b = f.buildings.find((x) => x.id === G.ws);
      const t = b ? b.type : 'smelter';
      if (t === 'smelter') return [{ title: 'Ore', keys: ores, empty: 'No ore. Mine some!' }, { title: 'Fuel and flux', keys: ['coal', 'limestone'] }, { title: 'Bars', keys: bars, empty: 'No bars yet.' }];
      if (t === 'forge') return [{ title: 'Bars', keys: bars, empty: 'No bars. Smelt some ore first.' }, { title: 'Fuel', keys: ['coal'] }, { title: 'Forged goods', keys: items(() => true).slice(0, 12), empty: 'Nothing forged yet.' }];
      if (t === 'grindstone') return [{ title: 'Can be sharpened', keys: items((p) => byId.items[p.type].mods.includes('s') && !p.mods.includes('s')), empty: 'No axes or pickaxes to sharpen.' }];
      if (t === 'engraver') return [{ title: 'Can be engraved', keys: items((p) => byId.items[p.type].mods.includes('e') && !p.mods.includes('e')).slice(0, 14), empty: 'Nothing to engrave.' }];
      if (t === 'tailor') return [{ title: 'Fibre and cloth', keys: ['food', 'cloth'] }, { title: 'Sewn clothes', keys: stockKeys((k) => k.startsWith('wear:')).slice(0, 12), empty: 'Nothing sewn yet.' }];
      if (t === 'mechanic') return [{ title: 'Bars and parts', keys: ['bar:brass', 'gears', 'bar:copper', 'bar:bronze', 'bar:gold', 'bar:nickel_silver', 'cut_gem', 'coal'] }, { title: 'Made here', keys: items((p) => !!(G.data.parts || {})[p.type]).slice(0, 12), empty: 'Nothing made yet.' }];
      if (t === 'jeweler') return [{ title: 'Rough gems', keys: gemsInStock(true).slice(0, 12), empty: 'None. Miners find them, deeper layers finer ones.' },
        { title: 'Cut gems', keys: gemsInStock().slice(0, 12), empty: 'None yet.' }];
      if (t === 'wizard') return [{ title: 'Gems to enchant', keys: [...gemsInStock().slice(0, 8), ...gemsInStock(true).slice(0, 4)], empty: 'No gems. Cut some at the jeweler.' },
        { title: 'Enchanted gems', keys: stockKeys((k) => isGem(k) && !!parseGem(k).effect).slice(0, 12), empty: 'None yet.' }];
      return [prov];
    }
    case 'trade': return [{ title: 'Your goods', keys: ['coins', ...stockKeys((k) => k !== 'food' && k !== 'ale').slice(0, 16)] }, prov];
    case 'explore': return [prov, { title: 'Gear in store', keys: items((p) => !!byId.items[p.type].slot).slice(0, 10), empty: 'No gear. Forge axes, helms and mail.' }];
    case 'war': return [{ title: 'Weapons and armor in store', keys: items((p) => ['weapon', 'helm', 'armor'].includes(byId.items[p.type].slot)), empty: 'No weapons or armor. Forge some at the forge.' }];
    case 'dwarves': return [prov, { title: 'Tools and gear', keys: items((p) => !!byId.items[p.type].slot).slice(0, 10), empty: 'No gear in store.' }, { title: 'Clothes', keys: stockKeys((k) => k.startsWith('wear:')).slice(0, 12), empty: 'No spare clothes.' }];
    default: return [{ title: 'Bars', keys: bars, empty: 'No bars yet.' }, mats, prov, { title: 'Goods', keys: items(() => true).slice(0, 8), empty: 'Nothing forged yet.' }];
  }
}
