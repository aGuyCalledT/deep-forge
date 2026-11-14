// The login picture: the tavern of the hold with a few dwarves at their seats, from the 48-px art.
import * as R from '../art/rooms.js';
import * as DW from '../art/dwarves.js';

const GUESTS = [
  { id: 900, sex: 'm', skin: '#e8b090', hair: '#c4622d', hairStyle: 0, beardStyle: 0, outfit: '#4f6fa8' },
  { id: 901, sex: 'f', skin: '#d9a77c', hair: '#e0b04a', hairStyle: 5, beardStyle: 0, outfit: '#b0556a' },
  { id: 902, sex: 'm', skin: '#b97f57', hair: '#3b2a20', hairStyle: 3, beardStyle: 3, outfit: '#4b8a4f' },
  { id: 903, sex: 'f', skin: '#f0c8a0', hair: '#9a9a9a', hairStyle: 6, beardStyle: 0, outfit: '#c08a3a' },
  { id: 904, sex: 'm', skin: '#8d5a3b', hair: '#e8e2d4', hairStyle: 2, beardStyle: 2, outfit: '#3a8a8a' },
];

export async function drawLoginArt(c) {
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const tpl = await R.get('tavern', 'room').catch(() => null);
  if (!tpl) return;
  c.width = (tpl.cells || 9) * R.CELL; c.height = R.RH;
  const spots = tpl.spots.filter((s) => R.spotPose(s) && s.kind !== 'bed').slice(0, GUESTS.length);
  R.drawRoom(g, tpl, 0, 0, 0, {
    between: (ctx) => {
      if (!DW.ready()) return;
      spots.forEach((s, i) => {
        const p = R.spotPose(s), d = Object.assign({ happiness: 80 }, GUESTS[i]);
        DW.draw(ctx, DW.look48(d), p.pose, i, s.x, s.y, { flip: p.flip });
      });
    },
  });
}
