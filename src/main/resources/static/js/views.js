// The mines screen and the login picture.
import { G, F, D, byId } from './data.js';
import * as S from './sprites.js';
import { text, sign } from './pixfont.js';

const fitScale = (w) => (w < 560 ? 2 : Math.max(3, Math.min(4, Math.floor(w / 220))));

// ------------------------------------------------------------------ mines

const TOP = 46, LH = 100;
const parts = [];

export const minesScreen = {
  fit: fitScale,
  size(cssW, sc) { const s = sc || fitScale(cssW || 400); return { w: Math.floor((cssW || 400) / s), h: TOP + G.data.layers.length * LH + 6 }; },
  _w: 200,
  draw(ctx, t, view) {
    const f = F(), d = D();
    const w = view.w;
    this._w = w;
    // mine head: the winch, rails and numbers
    for (let x = 0; x < w; x += 32) for (let y = 0; y < TOP; y += 32) S.draw(ctx, 'rock', x, y);
    S.draw(ctx, 'winch', 2, 2);
    const total = d.layers.reduce((s, l) => s + l.rate, 0);
    text(ctx, 'LIFT ' + Math.round(d.liftCap) + ' ORE/H', 38, 8, '#e3c06e');
    text(ctx, 'DIGGING ' + Math.round(Math.min(total, d.liftCap)) + ' ORE/H', 38, 17, f.liftLimited ? '#f0a85a' : '#fbf4e6');
    text(ctx, 'STORE ' + d.used + '/' + Math.round(d.capacity), 38, 26, f.storageFull ? '#d9704a' : '#cfd2dc');
    G.data.layers.forEach((layer, i) => {
      const ls = f.layers[i], y = TOP + i * LH;
      for (let x = 0; x < w; x += 64) for (let yy = 0; yy < LH; yy += 64) {
        const hh = Math.min(64, LH - yy);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y + yy, 64, hh); ctx.clip(); S.draw(ctx, 'mine_rock_' + i, x, y + yy); ctx.restore();
      }
      const tunY = y + LH - 56;
      if (ls.unlocked) {
        // ore veins in the rock: little crystal clusters in the colours of what is dug here
        const r = S.rand(i * 31 + 7);
        const ores = Object.keys(layer.weights).filter((k) => byId.ores[k] || k === 'rough_gem');
        for (let v = 0; v < Math.floor(w / 34); v++) {
          const k = ores[Math.floor(r() * ores.length)];
          const col = byId.ores[k] ? byId.ores[k].color : '#90bf98';
          const vx = 40 + Math.floor(r() * (w - 50)), vy = y + 18 + Math.floor(r() * 16);
          for (let p = 0; p < 6; p++) { ctx.fillStyle = p % 3 ? col : S.shade(col, 0.5); ctx.fillRect(vx + Math.floor(r() * 7), vy + Math.floor(r() * 4), 1 + (p % 2), 1); }
        }
        for (let x = 32; x < w; x += 32) S.draw(ctx, 'tunnel', x, tunY + 2);
        for (let x = 60; x < w - 10; x += 56) S.draw(ctx, 'beam', x, tunY);
        for (let x = 88; x < w - 10; x += 112) S.draw(ctx, 'torch_' + (Math.floor(t * 8 + x) % 3), x, tunY + 4);
        const miners = f.dwarves.filter((x) => x.job === 'miner' && x.layer === i && !x.busy);
        const threat = ls.threat ? f.threats.find((th) => String(th.id) === ls.threat) : null;
        const span = w - 70;
        const feet = tunY + 50;
        if (threat) {
          ctx.fillStyle = 'rgba(169,71,60,0.18)'; ctx.fillRect(0, y, w, LH);
          const mx = 40 + span * 0.55 + Math.sin(t * 1.2) * span * 0.25;
          const sp = S.monster(threat.monster, Math.floor(t * 3));
          ctx.drawImage(sp, Math.round(mx), feet - sp.height + 1);
          miners.slice(0, 6).forEach((m, k) => S.placeDwarf(ctx, S.dwarfSprite(m, 'idle', Math.floor(t * 1.5 + k) % 2, null, { mood: 'angry' }), 44 + k * 14, feet));
          text(ctx, threat.name, w - 4, y + 5, '#f0a85a', 'right');
        } else {
          if (miners.length) {
            const p = (Math.sin(t * 0.22 + i) + 1) / 2;
            S.draw(ctx, 'cart', Math.round(34 + p * (span - 10)), feet - 15);
          }
          miners.forEach((m, k) => {
            const base = 50 + ((k * 41 + m.id * 17) % Math.max(1, span - 20));
            const swing = Math.sin(t * 0.33 + m.id) > 0.25;
            const walk = Math.sin(t * 0.33 + m.id) * 12;
            const spr = swing ? S.dwarfSprite(m, 'work', Math.floor(t * 5 + m.id) % 4, 'pick') : S.dwarfSprite(m, 'walk', Math.floor(t * 8) % 4);
            S.placeDwarf(ctx, spr, base + (swing ? 0 : walk), feet, !swing && Math.cos(t * 0.33 + m.id) < 0);   // walking left: mirrored
            if (swing && Math.random() < 0.08) parts.push({ x: base + 16, y: feet - 12, vx: 8, vy: -6, life: 0.4, c: '#cfd2dc' });
          });
        }
        if (i === 0) f.dwarves.filter((x) => x.job === 'warrior' && x.post === 'mine' && !x.busy).slice(0, 3)
          .forEach((x, k) => S.placeDwarf(ctx, S.dwarfSprite(x, 'idle', Math.floor(t * 1.5 + k) % 2, 'axe'), w - 16 - k * 16, feet));
        const dl = d.layers[i];
        sign(ctx, layer.name, 34 + (layer.name.length * 4 + 8) / 2, y + 5, '#fbf4e6');
        text(ctx, (ls.level > 1 ? 'SHAFT ' + ls.level + '  ' : '') + Math.round(dl.rate) + ' ORE/H  ' + dl.miners + ' MINERS', 34, y + 15, '#e3c06e');
      } else {
        ctx.fillStyle = 'rgba(20,15,32,0.6)'; ctx.fillRect(32, y, w, LH);
        S.draw(ctx, 'lock_sign', Math.round(w / 2 - 13), y + 18);
        const known = d.layers[i].discovered;
        text(ctx, known ? layer.name : '? ? ?', w / 2, y + 42, known ? '#d9c0a0' : '#a6abbe', 'center');
        text(ctx, known ? 'LOCKED' : 'UNEXPLORED', w / 2, y + 50, '#a6abbe', 'center');
      }
      ctx.fillStyle = 'rgba(29,27,44,0.6)'; ctx.fillRect(0, y, w, 1);
    });
    // shaft and lift cage
    const bottom = TOP + f.layers.filter((l) => l.unlocked).length * LH;
    for (let y = TOP - 12; y < bottom; y += 64) { ctx.save(); ctx.beginPath(); ctx.rect(0, y, 32, Math.min(64, bottom - y)); ctx.clip(); S.draw(ctx, 'shaft', 0, y); ctx.restore(); }
    const p = (Math.sin(t * 0.5) + 1) / 2;
    const ly = TOP + Math.round(p * Math.max(0, bottom - TOP - 26));
    ctx.fillStyle = '#cfd2dc'; ctx.fillRect(16, 26, 1, ly - 26);
    S.draw(ctx, 'lift', 3, ly);
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.life -= 0.05; q.x += q.vx * 0.05; q.y += q.vy * 0.05; q.vy += 1.5; if (q.life <= 0) { parts.splice(i, 1); continue; } ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
  },
  ambient() { return [{ y0: 0, y1: 10000, color: '#120d1e', a: 0.5 }]; },
  lights(t) {
    const out = [{ x: 16, y: 30, r: 30, color: '#ffd98e' }];
    const f = F(), w = this._w;
    G.data.layers.forEach((layer, i) => {
      if (!f.layers[i].unlocked) return;
      const tunY = TOP + i * LH + LH - 30;
      for (let x = 88; x < w - 10; x += 112) out.push({ x: x + 3, y: tunY + 6, r: 40, color: '#ffb070', flicker: 3 });
      out.push({ x: 50, y: tunY + 12, r: 22, color: '#ffd98e' });
    });
    return out;
  },
  hit(x, y) {
    if (y < TOP) return { kind: 'layer', id: 0, rect: [0, 0, this._w, TOP] };
    const i = Math.floor((y - TOP) / LH);
    if (i < 0 || i >= G.data.layers.length) return null;
    return { kind: 'layer', id: i, rect: [1, TOP + i * LH + 1, this._w - 2, LH - 2] };
  },
};

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
