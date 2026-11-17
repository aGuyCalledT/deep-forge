// What a delve can find that only lasts for the run: cave coins (they pay the shop), passive finds that stack like
// in Isaac-style roguelikes, and magic scrolls used once (key L or R). None of it leaves the cave: the server only ever
// hears about ore (Delve.java). Chests hold one find or scroll and a few coins; the shop sells one find too.
import * as Art from '../art/scene.js';
import * as S from '../art/sprites.js';

/** Passive finds. Each one stacks with copies of itself. */
export const ITEMS = {
  cap: { name: 'Iron Cap', text: 'It takes one hit for you', icon: ['item', 'helm', 'iron'] },
  whetstone: { name: 'Whetstone', text: 'Your pick bites harder rock', icon: ['art', 'delve_whetstone'] },
  boots: { name: 'Swift Boots', text: 'You run faster', icon: ['art', 'delve_boots'] },
  spring: { name: 'Spring Heels', text: 'You jump higher', icon: ['art', 'delve_spring'] },
  heart: { name: 'Heart Crystal', text: 'One more heart', icon: ['art', 'delve_heartgem'] },
  hammer: { name: 'Heavy Hammer', text: 'Your blows hit harder', icon: ['item', 'hammer', 'iron'] },
  grip: { name: 'Quick Grip', text: 'Faster swings, rock breaks sooner', icon: ['item', 'pickaxe', 'gold'] },
  lamp: { name: 'Bright Lamp', text: 'You see further in the dark', icon: ['item', 'lamp', 'gold'] },
  ring: { name: 'Lucky Ring', text: 'More coins from everything', icon: ['item', 'ring', 'gold'] },
  feather: { name: 'Feather Charm', text: 'Long falls hurt less', icon: ['art', 'delve_feather'] },
};
/** Scrolls: used once with L or R (or the scroll button). */
export const SCROLLS = {
  light: { name: 'Scroll of Light', text: 'Lights the whole level for a while' },
  quake: { name: 'Scroll of Quake', text: 'Breaks the rock around you' },
  mend: { name: 'Scroll of Mending', text: 'Heals one heart' },
  stone: { name: 'Scroll of Stone Skin', text: 'Nothing hurts you for a few seconds' },
  blink: { name: 'Scroll of Blink', text: 'Takes you up through the rock above' },
};
export const MAX_SCROLLS = 3;
export const ORE_COINS = 5;            // in the shop one ore counts as this many cave coins

/** What a chest holds, from the level's dice: a find (60 %) or a scroll, and a few coins. */
export function chestLoot(r) {
  const ids = Object.keys(ITEMS), sc = Object.keys(SCROLLS);
  return r() < 0.6 ? { item: ids[Math.floor(r() * ids.length)], coins: 2 + Math.floor(r() * 4) }
    : { scroll: sc[Math.floor(r() * sc.length)], coins: 3 + Math.floor(r() * 4) };
}

const icons = new Map();
/** The picture of a find or scroll as a canvas. */
export function lootIcon(kind, id) {
  const k = kind + ':' + id;
  if (!icons.has(k)) {
    let c;
    if (kind === 'scroll') c = Art.frame('delve_scroll_' + id, 0).canvas;
    else if (kind === 'coin') c = Art.frame('delve_coin', 0).canvas;
    else {
      const ic = ITEMS[id].icon;
      c = ic[0] === 'art' ? Art.frame(ic[1], 0).canvas : S.item(ic[1], ic[2]);
    }
    icons.set(k, c);
  }
  return icons.get(k);
}
