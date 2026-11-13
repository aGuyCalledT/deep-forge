// The login picture (the mines screen is mine48.js).
import * as S from './sprites.js';

// ------------------------------------------------------------------ login

export function drawLoginArt(c) {
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const w = c.width, h = c.height, top = 58;
  const sky = g.createLinearGradient(0, 0, 0, top);
  sky.addColorStop(0, '#252a52'); sky.addColorStop(1, '#e0907a');
  g.fillStyle = sky; g.fillRect(0, 0, w, top);
  g.fillStyle = '#5b8350'; g.fillRect(0, top - 4, w, 4); g.fillStyle = '#86b06a'; g.fillRect(0, top - 5, w, 1);
  for (let x = 0; x < w; x += 32) for (let y = top; y < h; y += 32) S.draw(g, 'rock', x, y);
  const stand = (name, x) => { const s = S.sprite(name); if (s) S.draw(g, name, x, top - 4 - s.height + 1); };
  stand('tree_1', 8); stand('stall', 120); stand('tree_0', 214); stand('tent', 266);
  g.drawImage(S.roomImage({ type: 'tavern', id: 'login-tavern', level: 2 }), 0, top);
  const A = S.META.ROOMS.tavern;
  S.draw(g, 'fire_place_1', A.fire[0], top + A.fire[1] + 4);
  g.drawImage(S.roomImage({ type: 'forge', id: 'login-forge', level: 3 }), 192, top);
  const pals = [['#e8b090', '#c4622d'], ['#d9a77c', '#e0b04a'], ['#b97f57', '#3b2a20'], ['#f0c8a0', '#9a9a9a'], ['#8d5a3b', '#e8e2d4']];
  const wear = (top, dye, hat) => Object.assign({ top: 'wear:' + top + ':' + dye, legs: 'wear:trousers:brown', feet: 'wear:boots:brown' }, hat ? { hat: 'wear:' + hat } : {});
  pals.forEach(([skin, hair], i) => {
    const d = { id: 900 + i, sex: i % 2 ? 'f' : 'm', skin, hair, beardStyle: [0, 0, 3, 0, 2][i], hairStyle: [0, 5, 3, 6, 2][i], body: [0, 0, 3, 2, 1][i], nose: [0, 8, 2, 4, 1][i],
      brows: i, eyeColor: i + 1, mouth: i % 5, happiness: 80, wear: wear(['shirt_linen', 'dress', 'vest', 'shirt_knit', 'shirt_embroid'][i], ['blue', 'rose', 'green', 'ochre', 'teal'][i], [null, 'flower_crown:rose', null, null, 'miner_helmet:ochre'][i]) };
    S.placeDwarf(g, S.dwarfSprite(d, ['drink', 'sitTalk', 'talk', 'eat', 'work'][i], i % 2, i === 4 ? 'hammer' : null), [48, 66, 84, 100, 192 + 60][i], top + 90, false, false);
  });
}
