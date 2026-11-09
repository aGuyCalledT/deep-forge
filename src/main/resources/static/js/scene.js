// The fortress cross-section: sky and gate on top, carved halls below, mine layers at the bottom.
import { G, F, D, byId, now } from './data.js';
import * as S from './sprites.js';

const SKY = 64;      // surface line
const ROOM_W = 44, ROOM_H = 28, ROOM_GAP = 4;
const LAYER_H = 50;
const SHAFT_X = 4, SHAFT_W = 12;
const HALL_ORDER = ['tavern', 'quarters', 'warehouse', 'vault', 'smelter', 'forge', 'grindstone', 'engraver', 'jeweler', 'farm', 'brewery', 'barracks'];

let canvas, ctx, wrap, onPick;
let LW = 200, LH = 400, scale = 2;
let rects = [];
let last = 0;
const particles = [];

export function initScene(c, w, pick) {
  canvas = c; wrap = w; onPick = pick;
  ctx = canvas.getContext('2d');
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    for (let i = rects.length - 1; i >= 0; i--) {
      const q = rects[i];
      if (x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h) { onPick(q); return; }
    }
  });
  window.addEventListener('resize', () => { last = 0; });
  requestAnimationFrame(loop);
}

function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - last < 66 || !G.state || document.hidden) return; // ~15 fps is plenty for pixel art
  last = ts;
  draw(ts / 1000);
}

function layout() {
  const cw = Math.max(200, wrap.clientWidth);
  scale = cw < 560 ? 2 : 3;
  LW = Math.floor(cw / scale);
  const halls = hallBuildings();
  const cols = Math.max(1, Math.floor((LW - SHAFT_X - SHAFT_W - 6) / (ROOM_W + ROOM_GAP)));
  const hallRows = Math.ceil(halls.length / cols);
  const hallEnd = SKY + 8 + hallRows * (ROOM_H + ROOM_GAP) + 4;
  LH = hallEnd + G.data.layers.length * LAYER_H + 6;
  if (canvas.width !== LW || canvas.height !== LH) {
    canvas.width = LW; canvas.height = LH;
    canvas.style.width = LW * scale + 'px';
    canvas.style.height = LH * scale + 'px';
  }
  return { halls, cols, hallEnd };
}

function hallBuildings() {
  const f = F();
  return f.buildings.filter((b) => b.level > 0 && HALL_ORDER.includes(b.type))
    .sort((a, b) => HALL_ORDER.indexOf(a.type) - HALL_ORDER.indexOf(b.type) || a.id.localeCompare(b.id));
}

// 3x5 pixel font for labels inside the scene: crisp at any scale and small enough for room names.
const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', '/': '001001010100100', ':': '000010000010000', '.': '000000000000010', '-': '000000111000000',
  '+': '000010111010000', '!': '010010010000010', '?': '110001010000010', '%': '101001010100101', "'": '010010000000000',
  ' ': '000000000000000',
};

function text(t, x, y, color = '#f3e9d2', align = 'left') {
  t = String(t).toUpperCase();
  const w = t.length * 4 - 1;
  let x0 = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  for (const pass of [0, 1]) {
    ctx.fillStyle = pass ? color : '#0c090e';
    let cx = x0 + (pass ? 0 : 1);
    for (const ch of t) {
      const g = GLYPHS[ch] || GLYPHS['?'];
      for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3), y + Math.floor(i / 3) + (pass ? 0 : 1), 1, 1);
      cx += 4;
    }
  }
}

// ------------------------------------------------------------------ sky

function skyColors() {
  const d = new Date();
  const h = d.getHours() + d.getMinutes() / 60;
  const keys = [
    [0, '#0a0c1c', '#1a1a34'], [5, '#141a3a', '#3a3050'], [6.5, '#d88a6a', '#f0c890'], [8, '#6aa8e0', '#bfe0f0'],
    [17, '#6aa8e0', '#cfe6f0'], [19, '#d0704a', '#f0b070'], [20.5, '#22204a', '#4a3050'], [24, '#0a0c1c', '#1a1a34']];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, t1, b1] = keys[i], [b, t2, b2] = keys[i + 1];
    if (h >= a && h <= b) {
      const k = (h - a) / (b - a);
      return { top: S.mix(t1, t2, k), bottom: S.mix(b1, b2, k), night: h < 6 || h > 20 };
    }
  }
  return { top: '#0a0c1c', bottom: '#1a1a34', night: true };
}

function drawSky(t) {
  const sky = skyColors();
  for (let y = 0; y < SKY; y++) {
    ctx.fillStyle = S.mix(sky.top, sky.bottom, y / SKY);
    ctx.fillRect(0, y, LW, 1);
  }
  if (sky.night) {
    const r = S.rand(42);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * LW), y = Math.floor(r() * (SKY - 20));
      if ((Math.floor(t * 2) + i) % 9 !== 0) { ctx.fillStyle = i % 5 ? '#c8c8e0' : '#ffffff'; ctx.fillRect(x, y, 1, 1); }
    }
    const mx = LW - 30, my = 8;
    ctx.fillStyle = '#f0ecd8';
    ['01110', '11111', '11111', '11111', '01110'].forEach((r, y) => [...r].forEach((c, x) => { if (c === '1') ctx.fillRect(mx + x, my + y, 1, 1); }));
    ctx.fillStyle = S.mix(sky.top, sky.bottom, 0.15);
    ['0111', '1111', '1111', '0111'].forEach((r, y) => [...r].forEach((c, x) => { if (c === '1') ctx.fillRect(mx + 2 + x, my - 1 + y, 1, 1); }));
  } else {
    ctx.fillStyle = '#fff4c0'; ctx.fillRect(LW - 34, 8, 8, 8); ctx.fillStyle = '#ffe080'; ctx.fillRect(LW - 33, 9, 6, 6);
    // clouds
    for (let i = 0; i < 3; i++) {
      const x = ((t * (2 + i)) + i * 90) % (LW + 40) - 30, y = 6 + i * 9;
      ctx.fillStyle = '#ffffffcc';
      ctx.fillRect(x, y, 18, 3); ctx.fillRect(x + 4, y - 2, 9, 2); ctx.fillRect(x + 2, y + 3, 14, 1);
    }
  }
  // mountains
  const far = sky.night ? '#1c1a2c' : '#5a6a88', near = sky.night ? '#14121e' : '#3e4258';
  ridge(far, SKY - 28, 13, 0.9);
  ridge(near, SKY - 16, 29, 1.6);
  // the fortress mountain face over the halls
  ctx.fillStyle = '#4a3e3a';
  ctx.fillRect(0, SKY - 4, LW, 4);
  ctx.fillStyle = sky.night ? '#2a4a2a' : '#4a8a3a';
  ctx.fillRect(0, SKY - 5, LW, 2);
}

function ridge(color, base, seed, amp) {
  const r = S.rand(seed);
  ctx.fillStyle = color;
  let h = 8;
  for (let x = 0; x < LW; x++) {
    h += (r() - 0.5) * 3 * amp;
    h = Math.max(2, Math.min(22, h));
    ctx.fillRect(x, base - Math.floor(h), 1, SKY - base + Math.floor(h));
  }
}

// ------------------------------------------------------------------ surface

function drawSurface(t) {
  const f = F();
  const frame = Math.floor(t * 3) % 2;
  // fortress door into the mountain
  const doorX = 24;
  ctx.fillStyle = '#2a201c'; ctx.fillRect(doorX, SKY - 18, 14, 14);
  ctx.fillStyle = '#5a4a40'; ctx.fillRect(doorX - 2, SKY - 20, 18, 2); ctx.fillRect(doorX - 2, SKY - 20, 2, 16); ctx.fillRect(doorX + 14, SKY - 20, 2, 16);
  ctx.fillStyle = '#ffb040'; ctx.fillRect(doorX + 5, SKY - 12, 4, 4);
  ctx.drawImage(S.torch(Math.floor(t * 6)), doorX - 6, SKY - 22);
  ctx.drawImage(S.torch(Math.floor(t * 6) + 1), doorX + 17, SKY - 22);
  rects.push({ x: doorX - 2, y: SKY - 20, w: 18, h: 16, kind: 'tab', id: 'dwarves' });

  // trading post + caravan road
  const tpX = 46;
  ctx.drawImage(S.room('trading_post', 22, 16, true), tpX, SKY - 20);
  rects.push({ x: tpX, y: SKY - 20, w: 22, h: 16, kind: 'tab', id: 'trade' });
  f.dwarves.filter((d) => d.job === 'merchant' && !d.busy).slice(0, 2).forEach((d, i) =>
    ctx.drawImage(S.dwarfSprite(d, 'stand', 0), tpX + 22 + i * 9, SKY - 21));
  const t0 = now();
  for (const c of f.caravans) {
    const out = c.state === 'outbound';
    const p = out ? (t0 - c.departAt) / (c.arriveAt - c.departAt) : 1 - (t0 - c.arriveAt) / (c.returnAt - c.arriveAt);
    const x = tpX + 24 + Math.max(0, Math.min(1, p)) * (LW - tpX - 70);
    ctx.save();
    if (!out) { ctx.translate(Math.round(x) + 20, 0); ctx.scale(-1, 1); ctx.drawImage(S.wagon(frame), 0, SKY - 17); } else ctx.drawImage(S.wagon(frame), Math.round(x), SKY - 17);
    ctx.restore();
  }

  // expedition tent
  const exX = Math.min(LW - 80, 110);
  ctx.drawImage(S.room('expedition_hall', 22, 16, true), exX, SKY - 20);
  rects.push({ x: exX, y: SKY - 20, w: 22, h: 16, kind: 'tab', id: 'explore' });

  // walls and gate on the right
  const wl = levelOf('walls');
  const gx = LW - 26;
  if (wl > 0) {
    ctx.fillStyle = '#6a625e'; ctx.fillRect(gx, SKY - 24, 22, 20);
    for (let x = gx; x < gx + 22; x += 4) { ctx.fillStyle = '#7a726e'; ctx.fillRect(x, SKY - 27, 3, 3); }
    ctx.fillStyle = '#4a4240'; for (let y = SKY - 20; y < SKY - 4; y += 4) ctx.fillRect(gx, y, 22, 1);
    ctx.fillStyle = f.siege ? '#2a1a14' : '#5a3a1a'; ctx.fillRect(gx + 7, SKY - 14, 8, 10);
    text('L' + wl, gx + 6, SKY - 34, '#c8c0b8');
  } else {
    ctx.fillStyle = '#6a4a2a'; for (let x = gx; x < gx + 22; x += 5) ctx.fillRect(x, SKY - 12, 2, 8);
    ctx.fillRect(gx, SKY - 10, 22, 1);
  }
  rects.push({ x: gx - 20, y: SKY - 30, w: 46, h: 28, kind: 'tab', id: 'war' });
  const gate = f.dwarves.filter((d) => d.job === 'warrior' && d.post === 'fortress' && !d.busy);
  gate.slice(0, 5).forEach((d, i) => ctx.drawImage(S.dwarfSprite(d, 'stand', 0), gx - 14 - i * 9, SKY - 21));

  // raiders coming / camping
  if (f.raid) {
    const p = Math.max(0, Math.min(1, (t0 - f.raid.announcedAt) / (f.raid.arrivesAt - f.raid.announcedAt)));
    if (p > 0.6) for (let i = 0; i < 3; i++) ctx.drawImage(S.monster('goblin_scouts', frame), LW - 6 - (p - 0.6) * 30 + i * 6, SKY - 17);
    text('RAID ' + Math.ceil((f.raid.arrivesAt - t0) / 60) + 'm', gx - 30, 2, '#e05a4f');
  }
  if (f.siege) {
    for (let i = 0; i < 4; i++) ctx.drawImage(S.monster('goblin_scouts', (frame + i) % 2), gx - 50 + i * 9, SKY - 17);
    ctx.fillStyle = '#e2622b'; ctx.fillRect(gx - 58, SKY - 8 - frame, 3, 3 + frame);
    text('SIEGE', gx - 50, 2, '#e05a4f');
  }
}

function levelOf(type) {
  let l = 0;
  for (const b of F().buildings) if (b.type === type) l = Math.max(l, b.level);
  return l;
}

// ------------------------------------------------------------------ halls

function drawHalls(t, halls, cols, hallEnd) {
  const f = F(), d = D();
  rockFill(SKY, hallEnd - SKY, '#3a302e');
  const frame = Math.floor(t * 3) % 2;
  const idle = f.dwarves.filter((x) => x.job === 'idle' && !x.busy);
  halls.forEach((b, i) => {
    const cx = SHAFT_X + SHAFT_W + 6 + (i % cols) * (ROOM_W + ROOM_GAP);
    const cy = SKY + 8 + Math.floor(i / cols) * (ROOM_H + ROOM_GAP);
    ctx.fillStyle = '#0c090e';
    ctx.fillRect(cx - 1, cy - 1, ROOM_W + 2, ROOM_H + 2);
    ctx.drawImage(S.room(b.type, ROOM_W, ROOM_H), cx, cy);
    const info = d.buildings[b.id] || {};
    const worker = info.worker ? f.dwarves.find((x) => x.id === info.worker) : null;
    const working = b.job && !b.job.quenching;
    // fire and smoke
    if (b.type === 'smelter') {
      const heat = info.heat || 0;
      const glow = working ? 0.35 + heat / 160 + (frame ? 0.05 : 0) : 0.1;
      ctx.fillStyle = `rgba(255,140,40,${glow})`;
      ctx.fillRect(cx + ROOM_W / 2 - 4, cy + ROOM_H - 12, 8, 4);
      if (working && Math.random() < 0.4 + heat / 150) particles.push({ x: cx + ROOM_W / 2, y: cy + 2, vx: (Math.random() - 0.5) * 3, vy: -4 - Math.random() * 4, life: 1.6, c: '#8a8088' });
      if (heat > 5 && Math.random() < heat / 120) particles.push({ x: cx + ROOM_W / 2 + (Math.random() - 0.5) * 6, y: cy + ROOM_H - 12, vx: (Math.random() - 0.5) * 8, vy: -10 - Math.random() * 6, life: 0.6, c: '#ffd36b' });
    }
    if (b.type === 'forge' && working && frame && Math.random() < 0.6)
      for (let k = 0; k < 3; k++) particles.push({ x: cx + 16, y: cy + ROOM_H - 9, vx: (Math.random() - 0.5) * 20, vy: -8 - Math.random() * 10, life: 0.4, c: '#ffd36b' });
    if (b.job && b.job.quenching && Math.random() < 0.7)
      particles.push({ x: cx + 30 + Math.random() * 6, y: cy + ROOM_H - 10, vx: (Math.random() - 0.5) * 3, vy: -6, life: 1.2, c: '#e8eef4' });
    // worker
    if (worker) {
      const pose = b.type === 'forge' || b.type === 'grindstone' || b.type === 'engraver' || b.type === 'jeweler' ? 'hammer' : 'stand';
      ctx.drawImage(S.dwarfSprite(worker, working ? pose : 'stand', working ? frame : 0), cx + ROOM_W - 16, cy + ROOM_H - 19);
    }
    if (b.type === 'tavern') idle.slice(0, 3).forEach((x, k) => ctx.drawImage(S.dwarfSprite(x, 'stand', 0), cx + 3 + k * 9, cy + ROOM_H - 19));
    if (b.type === 'barracks') f.dwarves.filter((x) => x.job === 'warrior' && !x.busy && x.post === 'fortress').slice(5, 7)
      .forEach((x, k) => ctx.drawImage(S.dwarfSprite(x, 'stand', frame), cx + 14 + k * 9, cy + ROOM_H - 19));
    // label + status
    const name = byId.buildings[b.type].name.split(' ')[0].replace("'s", '').slice(0, 10);
    text(name, cx + 2, cy + 1, '#f3e9d2');
    if (b.level > 1) text(String(b.level), cx + ROOM_W - 2, cy + 1, '#f2b33d', 'right');
    const kind = byId.buildings[b.type].kind;
    if (kind !== 'passive' && (!worker || (!b.job && b.queue && kind === 'queue')) && frame) {
      ctx.fillStyle = '#0c090e'; ctx.fillRect(cx + ROOM_W - 8, cy + 8, 6, 9);
      ctx.fillStyle = '#f0b847'; ctx.fillRect(cx + ROOM_W - 7, cy + 9, 4, 7);
      text('!', cx + ROOM_W - 6, cy + 10, '#0c090e');
    }
    if (f.siege && kind !== 'passive') { ctx.fillStyle = '#e05a4f55'; ctx.fillRect(cx, cy, ROOM_W, ROOM_H); }
    if (G.focus === b.id) { ctx.strokeStyle = '#f2b33d'; ctx.lineWidth = 1; ctx.strokeRect(cx - 0.5, cy - 0.5, ROOM_W + 1, ROOM_H + 1); }
    rects.push({ x: cx, y: cy, w: ROOM_W, h: ROOM_H, kind: 'building', id: b.id });
  });
}

function rockFill(y0, h, base) {
  const r = S.rand(y0 * 7 + 3);
  ctx.fillStyle = base;
  ctx.fillRect(0, y0, LW, h);
  for (let i = 0; i < (LW * h) / 18; i++) {
    ctx.fillStyle = r() < 0.5 ? S.shade(base, -0.15) : S.shade(base, 0.08);
    ctx.fillRect(Math.floor(r() * LW), y0 + Math.floor(r() * h), 1 + Math.floor(r() * 2), 1);
  }
}

// ------------------------------------------------------------------ mine

function drawMine(t, hallEnd) {
  const f = F(), d = D();
  const frame = Math.floor(t * 2.5) % 2;
  G.data.layers.forEach((layer, i) => {
    const ls = f.layers[i];
    const y = hallEnd + i * LAYER_H;
    const tile = S.rockTile(layer);
    for (let ty = 0; ty < LAYER_H; ty += 48) for (let tx = 0; tx < LW; tx += 48)
      ctx.drawImage(tile, 0, 0, 48, Math.min(48, LAYER_H - ty), tx, y + ty, 48, Math.min(48, LAYER_H - ty));
    ctx.fillStyle = '#0c090e'; ctx.fillRect(0, y, LW, 1);
    const tunY = y + LAYER_H - 22;
    if (ls.unlocked) {
      // tunnel
      ctx.fillStyle = '#1e1820'; ctx.fillRect(SHAFT_X + SHAFT_W, tunY, LW - SHAFT_X - SHAFT_W - 4, 19);
      ctx.fillStyle = '#2a222c'; ctx.fillRect(SHAFT_X + SHAFT_W, tunY + 17, LW - SHAFT_X - SHAFT_W - 4, 2);
      ctx.fillStyle = '#5a4030';
      for (let x = SHAFT_X + SHAFT_W + 20; x < LW - 8; x += 44) { ctx.fillRect(x, tunY, 2, 17); ctx.fillRect(x - 3, tunY, 8, 2); }
      for (let x = SHAFT_X + SHAFT_W + 40; x < LW - 8; x += 60) ctx.drawImage(S.torch(Math.floor(t * 6) + x), x, tunY + 2);
      const miners = f.dwarves.filter((x) => x.job === 'miner' && x.layer === i && !x.busy);
      const threat = ls.threat ? f.threats.find((th) => String(th.id) === ls.threat) : null;
      const span = LW - SHAFT_X - SHAFT_W - 30;
      if (threat) {
        ctx.fillStyle = 'rgba(200,40,30,0.18)'; ctx.fillRect(0, y + 1, LW, LAYER_H - 1);
        const mx = SHAFT_X + SHAFT_W + span * 0.55 + Math.sin(t * 1.3) * span * 0.25;
        ctx.drawImage(S.monster(threat.monster, frame), Math.round(mx), tunY + 2);
        miners.slice(0, 6).forEach((m, k) => ctx.drawImage(S.dwarfSprite(m, 'stand', 0), SHAFT_X + SHAFT_W + 2 + k * 5, tunY + 1));
        text(threat.name.toUpperCase(), LW - 4, y + 3, '#e05a4f', 'right');
      } else {
        miners.forEach((m, k) => {
          const base = SHAFT_X + SHAFT_W + 10 + ((k * 37 + m.id * 13) % Math.max(1, span));
          const walk = Math.sin(t * 0.35 + m.id) * 10;
          const swinging = Math.sin(t * 0.35 + m.id) > 0.3;
          ctx.drawImage(S.dwarfSprite(m, swinging ? 'swing' : 'walk', swinging ? Math.floor(t * 3 + m.id) % 2 : frame), Math.round(base + (swinging ? 0 : walk)), tunY + 1);
          if (swinging && Math.random() < 0.08) particles.push({ x: base + 12, y: tunY + 8, vx: 6, vy: -4, life: 0.4, c: '#c8b8a0' });
        });
      }
      if (f.dwarves.some((x) => x.job === 'warrior' && x.post === 'mine' && !x.busy) && i === 0) {
        f.dwarves.filter((x) => x.job === 'warrior' && x.post === 'mine' && !x.busy).slice(0, 3)
          .forEach((w, k) => ctx.drawImage(S.dwarfSprite(w, 'stand', frame), LW - 18 - k * 9, tunY + 1));
      }
      const dl = d.layers[i];
      text(layer.name, SHAFT_X + SHAFT_W + 4, y + 4, '#f3e9d2');
      text((ls.level > 1 ? 'L' + ls.level + ' ' : '') + Math.round(dl.rate) + ' ORE/H', SHAFT_X + SHAFT_W + 4, y + 11, '#f2b33d');
    } else {
      ctx.fillStyle = 'rgba(8,6,10,0.72)'; ctx.fillRect(0, y + 1, LW, LAYER_H - 1);
      const known = d.layers[i].discovered;
      text(known ? layer.name.toUpperCase() : '? ? ?', LW / 2, y + LAYER_H / 2 - 8, known ? '#b5a68e' : '#7d7268', 'center');
      text(known ? 'LOCKED' : 'UNEXPLORED', LW / 2, y + LAYER_H / 2 + 2, '#7d7268', 'center');
    }
    if (G.focus === 'layer:' + i) { ctx.strokeStyle = '#f2b33d'; ctx.strokeRect(0.5, y + 0.5, LW - 1, LAYER_H - 1); }
    rects.push({ x: 0, y, w: LW, h: LAYER_H, kind: 'layer', id: i });
  });

  // shaft and lift
  const top = SKY - 4, bottom = hallEnd + f.layers.filter((l) => l.unlocked).length * LAYER_H;
  ctx.fillStyle = '#120e14'; ctx.fillRect(SHAFT_X, top, SHAFT_W, bottom - top);
  ctx.fillStyle = '#5a4030'; ctx.fillRect(SHAFT_X, top, 1, bottom - top); ctx.fillRect(SHAFT_X + SHAFT_W - 1, top, 1, bottom - top);
  for (let y = top; y < bottom; y += 6) { ctx.fillStyle = '#3a2a20'; ctx.fillRect(SHAFT_X + 1, y, SHAFT_W - 2, 1); }
  const travel = bottom - top - 12;
  const p = (Math.sin(t * 0.6) + 1) / 2;
  const ly = top + Math.round(p * travel);
  ctx.fillStyle = '#8a6a3a'; ctx.fillRect(SHAFT_X + 1, ly, SHAFT_W - 2, 10);
  ctx.fillStyle = '#5a4020'; ctx.fillRect(SHAFT_X + 2, ly + 1, SHAFT_W - 4, 3);
  ctx.fillStyle = '#b5653b'; ctx.fillRect(SHAFT_X + 3, ly + 1, 2, 2); ctx.fillStyle = '#9fb7b3'; ctx.fillRect(SHAFT_X + 6, ly + 1, 2, 2);
  ctx.fillStyle = '#c8c0b0'; ctx.fillRect(SHAFT_X + SHAFT_W / 2, top, 1, ly - top);
  rects.push({ x: SHAFT_X, y: top, w: SHAFT_W, h: bottom - top, kind: 'building', id: 'lift' });
}

// ------------------------------------------------------------------ particles

function drawParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 4 * dt;
    ctx.fillStyle = p.c;
    ctx.globalAlpha = Math.min(1, p.life * 1.5);
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  ctx.globalAlpha = 1;
  if (particles.length > 300) particles.splice(0, particles.length - 300);
}

let prevT = 0;
function draw(t) {
  const { halls, cols, hallEnd } = layout();
  rects = [];
  ctx.imageSmoothingEnabled = false;
  drawSky(t);
  drawHalls(t, halls, cols, hallEnd);
  drawMine(t, hallEnd);
  drawSurface(t);
  drawParticles(Math.min(0.2, t - prevT));
  prevT = t;
}

/** Scroll the scene so a building or layer is visible. */
export function reveal(kind, id) {
  const r = rects.find((q) => q.kind === kind && q.id === id);
  if (r) wrap.scrollTo({ top: Math.max(0, r.y * scale - 40), behavior: 'smooth' });
}

/** A still picture for the login screen. */
export function drawLoginArt(c) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  for (let y = 0; y < 40; y++) { g.fillStyle = S.mix('#1a1a34', '#4a3050', y / 40); g.fillRect(0, y, w, 1); }
  const r = S.rand(9);
  for (let i = 0; i < 30; i++) { g.fillStyle = '#c8c8e0'; g.fillRect(Math.floor(r() * w), Math.floor(r() * 30), 1, 1); }
  g.fillStyle = '#14121e';
  let hh = 10;
  for (let x = 0; x < w; x++) { hh += (r() - 0.5) * 4; hh = Math.max(4, Math.min(24, hh)); g.fillRect(x, 40 - hh, 1, hh); }
  g.fillStyle = '#3a302e'; g.fillRect(0, 40, w, h - 40);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? '#2e2624' : '#463a36'; g.fillRect(Math.floor(r() * w), 40 + Math.floor(r() * (h - 40)), 2, 1); }
  g.fillStyle = '#1e1820'; g.fillRect(0, 62, w, 18);
  g.fillStyle = '#ffb040'; g.fillRect(70, 44, 20, 10); g.fillStyle = '#c84a1a'; g.fillRect(72, 46, 16, 6);
  for (let i = 0; i < 6; i++) { g.fillStyle = '#ffd36b'; g.fillRect(76 + Math.floor(r() * 10), 38 - Math.floor(r() * 8), 1, 1); }
  const names = ['#c4622d', '#e0b04a', '#3b2a20', '#9a9a9a', '#b8432c'];
  names.forEach((beard, i) => {
    const dw = { id: i, beard, hair: beard, skin: '#f0c8a0', beardStyle: i % 4, job: i % 2 ? 'miner' : 'warrior', traits: [] };
    g.drawImage(S.dwarfSprite(dw, i % 2 ? 'swing' : 'stand', i % 2), 18 + i * 26, 63);
  });
}
