// The build menu: every room you could put down, with a picture. Pick one, then click where it goes in the hold:
// rock under it gets marked, the miners dig it out, then the room stands (paid when placed).
import { F, D, byId } from '../core/data.js';
import { h, openSheet, closeSheet, bus, ico, info, costChips, missingText } from './ui.js';
import * as R from '../art/rooms.js';

/** A picture of a room type in its first look; greyed by CSS when it can't be built. */
function roomPic(type) {
  const c = h('canvas', { class: 'bm-canvas', width: 1, height: R.RH, 'aria-hidden': 'true' });
  const name = R.looks(type, 'room')[0];
  if (name) R.get(type, 'room', name).then((t) => {
    if (!t) return;
    c.width = (t.cells || 5) * R.CELL;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    R.drawRoom(g, t, 0, 0, 0, { light: false });
  }).catch(() => {});
  return c;
}

/** What still stands between the player and this room, in a few words (null: it can be built). */
function needs(r) {
  if (r.why) return r.why;
  const miss = missingText(r.cost);
  return miss ? miss.replace(/^Missing: /, 'Needs ') : null;
}

export function openBuildMenu() {
  openSheet(() => {
    const list = D().roomsToBuild || [];
    const plans = ((F().layout || {}).plans || []);
    return h('div', null,
      h('h2', null, 'Rooms to build', info('Pick a room, then click where it should go in the hold. Rock under it is marked for digging: your miners dig it out, then the room stands there by itself. You pay when you place it, and get it all back if you take the plan back. A room needs a hallway or stairwell beside it to work.')),
      plans.length ? h('p', { class: 'small muted' }, plans.length === 1 ? 'One room is waiting for its ground to be dug out.' : plans.length + ' rooms are waiting for their ground to be dug out.') : null,
      list.length ? null : h('p', { class: 'small muted' }, 'Every room is built. Build more workshops once you have fewer than six of a kind.'),
      h('div', { class: 'bm-list' }, list.map((r) => {
        const t = byId.buildings[r.type], need = needs(r);
        const pick = () => { closeSheet(); bus.startPlace({ type: r.type, building: r.building || null, cells: r.cells, name: r.name, cost: r.cost }); };
        return h('div', { class: 'card sub bm-room' + (need ? ' off' : '') },
          h('button', { class: 'bm-pic', disabled: !!need, 'aria-label': need ? r.name + ': ' + need : 'Place ' + r.name, onclick: pick },
            roomPic(r.type), need ? h('span', { class: 'bm-need' }, need) : null),
          h('div', { class: 'row wrap' },
            h('span', { class: 'grow' }, h('b', null, r.name), info(t.note), h('br'), h('span', { class: 'small muted' }, r.cells + ' cells wide')),
            costChips(r.cost),
            h('button', { class: 'btn small' + (need ? '' : ' good'), disabled: !!need, onclick: pick }, ico('build'), 'Place')));
      })));
  }, null, 'forge');
}
