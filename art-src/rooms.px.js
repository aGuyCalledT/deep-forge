// Rooms of the hold. 96 px tall, ROOMS[type].w * 24 wide. Floor surface at y = 90 (dwarves stand there).
// Furniture is sized for the 33 px tall dwarves: a table reaches their belt, a seat their knee.
// Fire, smoke, steam, sparks, lighting and dwarves are added by the game on top; positions in shared.js.

const H = ROOM_H, FY = FLOOR_Y, B = FLOOR_Y - 1;   // B: the bottom row of things standing on the floor

// ------------------------------------------------------------------ surfaces

function bricks(c, x, y, w, h, mortar, base, lite, seed = 1) {
  c.rect(x, y, w, h, mortar);
  const rng = c.rng(seed);
  for (let row = 0; row * 7 < h; row++) {
    const off = row % 2 ? 7 : 0;
    for (let bx = -off; bx < w; bx += 14) {
      const x0 = Math.max(x, x + bx), x1 = Math.min(x + w, x + bx + 13);
      if (x1 <= x0) continue;
      const y0 = y + row * 7;
      const hh = Math.min(6, y + h - y0);
      if (hh <= 0) continue;
      c.rect(x0, y0, x1 - x0, hh, base);
      c.hline(x0, y0, x1 - x0, lite);
      if (rng() < 0.14) c.px(x0 + 2 + Math.floor(rng() * 8), y0 + 3, mortar);   // a chipped brick
      if (rng() < 0.1) c.hline(x0 + 3, y0 + hh - 1, 4, mortar);                  // a worn edge
    }
  }
}

function planks(c, x, y, w, h, dark, base, lite) {
  c.rect(x, y, w, h, base);
  const rng = c.rng(3);
  for (let px = x; px < x + w; px += 12) {
    c.vline(px, y, h, dark);
    c.vline(px + 1, y, h, lite);
    c.px(px + 4, y + 5, dark); c.px(px + 4, y + h - 8, dark);    // nails
    // grain and a knot here and there
    c.vline(px + 7, y + 10 + Math.floor(rng() * 20), 6 + Math.floor(rng() * 10), dark);
    if (rng() < 0.5) { const ky = y + 20 + Math.floor(rng() * (h - 40)); c.px(px + 6, ky, dark); c.px(px + 7, ky + 1, dark); }
  }
}

function earth(c, x, y, w, h) {
  c.rect(x, y, w, h, "W");
  // soil layers: a darker band near the ceiling, a thin root line between
  c.rect(x, y, w, 12, "w"); c.hline(x, y + 12, w, "v");
  for (let sx = x + 4; sx < x + w - 8; sx += 29) { c.hline(sx, y + 28, 9, "w"); c.hline(sx + 12, y + 44, 7, "w"); c.px(sx + 20, y + 36, "v"); }
  // roots hanging from the ceiling
  for (let rx = x + 8; rx < x + w - 6; rx += 17) {
    c.line(rx, y, rx + 3, y + 12, "v");
    c.line(rx + 3, y + 12, rx + 1, y + 20, "v");
    c.px(rx + 1, y + 21, "V");
  }
  // moss patches along the floor
  for (let mx = x + 4; mx < x + w - 8; mx += 23) { c.hline(mx, FY - 2, 9, "G"); c.hline(mx + 1, FY - 3, 6, "h"); c.px(mx + 3, FY - 4, "H"); }
}

function cutStone(c, x, y, w, h, base, dark, lite) {
  c.rect(x, y, w, h, base);
  const rng = c.rng(7);
  for (let yy = y, row = 0; yy < y + h; yy += 13, row++) {
    c.hline(x, yy, w, dark);
    let xx = x + (row % 2 ? 0 : 9);
    while (xx < x + w) {
      c.vline(xx, yy, 13, dark);
      c.hline(xx + 1, yy + 1, 9, lite);
      c.vline(xx + 1, yy + 1, 4, lite);
      xx += 15 + Math.floor(rng() * 12);
    }
  }
}

function floorPlanks(c, w) {
  c.rect(0, FY, w, H - FY, "W");
  c.hline(0, FY, w, "V");
  c.hline(0, FY + 1, w, "v");
  for (let x = 7; x < w; x += 19) { c.vline(x, FY + 1, 5, "w"); c.px(x + 3, FY + 3, "w"); }
}

function floorStone(c, w) {
  c.rect(0, FY, w, H - FY, "3");
  c.hline(0, FY, w, "5");
  c.hline(0, FY + 1, w, "4");
  for (let x = 4; x < w; x += 16) c.vline(x, FY + 1, 5, "2");
}

function ceiling(c, w) {
  // a wooden rib under the vault with little brackets; no hard box edge
  c.rect(20, 2, w - 40, 4, "W");
  c.hline(20, 2, w - 40, "V");
  c.hline(20, 6, w - 40, "w");
  for (let x = 32; x < w - 28; x += 40) { c.rect(x, 6, 4, 3, "W"); c.px(x + 1, 9, "w"); c.px(x + 2, 9, "w"); }
}

function cobweb(c, x, y, right = false) {
  const d = right ? -1 : 1;
  for (let i = 0; i < 9; i++) c.px(x + d * i, y, "6");
  for (let i = 0; i < 9; i++) c.px(x, y + i, "6");
  for (let i = 0; i < 7; i++) c.px(x + d * i, y + i, "6");
  for (let i = 0; i < 4; i++) { c.px(x + d * (4 + i), y + 4 - i + 1, "6"); }   // the ring
  c.px(x + d * 2, y + 4, "6"); c.px(x + d * 4, y + 2, "6");
}

// ------------------------------------------------------------------ props (x left, b = bottom row)

function lantern(c, x, y) {
  c.vline(x + 3, 6, y - 6, "4");
  c.rect(x + 1, y, 5, 1, "2"); c.px(x + 3, y - 1, "2");
  c.rect(x, y + 1, 7, 7, "y");
  c.rect(x + 1, y + 2, 5, 5, "Y");
  c.rect(x + 2, y + 3, 3, 3, "0");
  c.vline(x, y + 1, 7, "2"); c.vline(x + 6, y + 1, 7, "2"); c.vline(x + 3, y + 1, 7, "2");
  c.rect(x + 1, y + 8, 5, 1, "2"); c.px(x + 3, y + 9, "2");
}

function barrel(c, x, b, h = 18, top) {
  const w = 14;
  c.rect(x + 1, b - h + 1, w - 2, h, "v");
  c.rect(x, b - h + 3, w, h - 5, "v");
  c.vline(x + 3, b - h + 1, h, "V"); c.vline(x + 4, b - h + 2, h - 3, "V");
  c.vline(x + 10, b - h + 1, h, "W");
  c.vline(x + 7, b - h + 2, h - 2, "W");
  c.hline(x, b - h + 4, w, "4"); c.hline(x, b - 3, w, "4");
  c.hline(x + 1, b - h + 4, 3, "5"); c.hline(x + 1, b - 3, 3, "5");
  if (top) { c.hline(x + 1, b - h + 1, w - 2, top); c.hline(x + 2, b - h + 2, w - 4, top); }
}

function barrelEnd(c, x, b, r = 7) {
  const cx = x + r, cy = b - r;
  c.circ(cx, cy, r, "v");
  c.ring(cx, cy, r, "W");
  c.ring(cx, cy, r - 2, "W");
  c.hline(cx - r + 2, cy, 2 * r - 3, "w");
  c.px(cx, cy, "u"); c.px(cx - 1, cy + 2, "w");
  c.px(cx - 3, cy - r + 2, "V"); c.px(cx - 4, cy - r + 3, "V");
}

function crate(c, x, b, s = 13, col = "V") {
  c.rect(x, b - s + 1, s, s, col);
  c.box(x, b - s + 1, s, s, "v");
  c.box(x + 1, b - s + 2, s - 2, s - 2, "u");
  c.rect(x + 2, b - s + 3, s - 4, s - 4, col);
  c.line(x + 2, b - s + 3, x + s - 3, b - 2, "v");
  c.px(x + 2, b - 2, "W"); c.px(x + s - 3, b - s + 3, "W");
}

function sack(c, x, b, col = "c") {
  c.ellipse(x + 6, b - 5, 6, 5, col);
  c.rect(x + 4, b - 12, 5, 3, col);
  c.hline(x + 4, b - 10, 5, "u");
  c.px(x + 3, b - 13, col); c.px(x + 9, b - 13, col);
  c.px(x + 2, b - 6, "C"); c.px(x + 3, b - 7, "C");
  c.hline(x + 3, b, 7, "u");
}

function table(c, x, b, w) {
  c.rect(x, b - 13, w, 3, "V");
  c.hline(x, b - 13, w, "u");
  c.hline(x, b - 10, w, "W");
  c.rect(x + 3, b - 10, 3, 11, "W"); c.rect(x + w - 6, b - 10, 3, 11, "W");
  c.vline(x + 3, b - 10, 11, "v"); c.vline(x + w - 6, b - 10, 11, "v");
}

function stool(c, x, b) {
  c.rect(x, b - 7, 9, 2, "V"); c.hline(x, b - 7, 9, "u");
  c.vline(x + 1, b - 5, 6, "W"); c.vline(x + 7, b - 5, 6, "W"); c.hline(x + 2, b - 2, 5, "W");
}

function bench(c, x, b, w) {
  c.rect(x, b - 7, w, 3, "V"); c.hline(x, b - 7, w, "u");
  for (const lx of [x + 2, x + w - 5]) { c.rect(lx, b - 4, 3, 5, "W"); c.vline(lx, b - 4, 5, "v"); }
}

function mug(c, x, b) { c.rect(x, b - 4, 4, 5, "u"); c.hline(x, b - 4, 4, "C"); c.px(x + 1, b - 5, "C"); c.vline(x + 4, b - 3, 2, "u"); c.vline(x + 3, b - 3, 4, "V"); }

function shelf(c, x, y, w) {
  c.rect(x, y, w, 3, "V"); c.hline(x, y, w, "u"); c.hline(x, y + 3, w, "w");
  for (const bx of [x + 3, x + w - 6]) { c.rect(bx, y + 3, 3, 2, "W"); c.px(bx + 1, y + 5, "W"); }
}

function plant(c, x, b) {
  c.rect(x, b - 6, 9, 7, "z"); c.hline(x, b - 6, 9, "Z"); c.rect(x - 1, b - 7, 11, 2, "z"); c.hline(x - 1, b - 7, 11, "Z");
  c.vline(x + 7, b - 4, 4, "Q");
  c.line(x + 3, b - 8, x, b - 15, "G"); c.line(x + 4, b - 8, x + 4, b - 18, "h"); c.line(x + 5, b - 8, x + 9, b - 14, "G");
  c.line(x + 4, b - 12, x + 7, b - 16, "h");
  c.px(x + 4, b - 18, "H"); c.px(x, b - 15, "H"); c.px(x + 9, b - 14, "H"); c.px(x + 7, b - 16, "J");
}

function rug(c, x, w, col, edge) {
  c.rect(x, FY, w, 3, col); c.hline(x, FY, w, edge);
  for (let i = x + 1; i < x + w; i += 4) c.px(i, FY + 2, edge);
  c.px(x - 1, FY + 1, edge); c.px(x + w, FY + 1, edge);
}

function banner(c, x, y, col, mark) {
  c.hline(x - 2, y, 16, "v"); c.px(x - 3, y, "V"); c.px(x + 14, y, "V");
  c.rect(x, y + 1, 12, 20, col);
  c.vline(x + 1, y + 1, 20, "C"); c.vline(x + 10, y + 1, 20, "C");
  c.rect(x, y + 21, 3, 2, col); c.rect(x + 9, y + 21, 3, 2, col); c.rect(x + 4, y + 21, 4, 3, col);
  c.rect(x + 5, y + 6, 2, 8, mark); c.rect(x + 3, y + 8, 6, 3, mark); c.px(x + 6, y + 5, mark);
}

function shield(c, x, y, col) {
  c.circ(x + 7, y + 7, 7, col);
  c.ring(x + 7, y + 7, 7, "o");
  c.hline(x + 2, y + 7, 11, "j"); c.vline(x + 7, y + 2, 11, "j"); c.circ(x + 7, y + 7, 1, "8");
  c.px(x + 4, y + 3, "C");
}

function axeRack(c, x, y, n) {
  c.rect(x, y, n * 10 + 3, 3, "V"); c.hline(x, y, n * 10 + 3, "u");
  for (let i = 0; i < n; i++) {
    const ax = x + 3 + i * 10;
    c.vline(ax + 3, y + 3, 20, "v"); c.vline(ax + 4, y + 3, 20, "W");
    c.rect(ax, y + 4, 7, 6, i % 2 ? "6" : "5"); c.vline(ax, y + 5, 4, "7");
    c.px(ax + 6, y + 4, "4"); c.px(ax + 6, y + 9, "4");
  }
}

function cat(c, x, b) {   // a sleeping cat, very important
  c.ellipse(x + 8, b - 3, 8, 4, "V");
  c.rect(x + 12, b - 8, 7, 6, "V");
  c.px(x + 12, b - 9, "V"); c.px(x + 18, b - 9, "V"); c.px(x + 12, b - 10, "V"); c.px(x + 18, b - 10, "V");
  c.hline(x + 13, b - 6, 2, "w"); c.hline(x + 16, b - 6, 2, "w"); c.px(x + 15, b - 4, "P");
  c.line(x, b - 1, x - 4, b - 6, "V"); c.px(x - 4, b - 7, "u");
  c.hline(x + 4, b - 5, 6, "u"); c.hline(x + 3, b - 1, 10, "v");
}

function mushroom(c, x, b, s, cap, glow) {
  const m = x + Math.floor(s / 2);
  c.rect(m - 1, b - s + 1, 2, s, "c");
  c.ellipse(m, b - s, Math.max(2, Math.floor(s / 2) + 1), Math.max(1, Math.floor(s / 3)), cap);
  c.px(m - 1, b - s - 1, glow || "C"); c.px(m + 1, b - s, glow || "C");
}

// a bunk bed long enough for a dwarf lying down: two mattresses, pillows on the left, blankets folded at the foot
function bunk(c, x, b, top, bottom) {
  c.rect(x, b - 50, 3, 51, "W"); c.rect(x + 44, b - 50, 3, 51, "W");
  c.vline(x, b - 50, 51, "v"); c.vline(x + 44, b - 50, 51, "v");
  c.rect(x - 1, b - 51, 5, 2, "V"); c.rect(x + 43, b - 51, 5, 2, "V");
  // a little ladder at the foot end
  for (let y = b - 30; y < b - 6; y += 6) c.hline(x + 40, y, 4, "V");
  for (const [y, col] of [[b - 5, bottom], [b - 37, top]]) {
    c.rect(x + 3, y, 41, 3, "V"); c.hline(x + 3, y, 41, "u"); c.hline(x + 3, y + 3, 41, "w");
    c.rect(x + 3, y - 2, 41, 2, "C"); c.hline(x + 3, y - 1, 41, "c");
    c.rect(x + 4, y - 6, 9, 4, "C"); c.hline(x + 4, y - 2, 9, "4"); c.px(x + 4, y - 6, "c"); c.px(x + 12, y - 6, "c");
    c.rect(x + 32, y - 5, 11, 3, col); c.hline(x + 32, y - 5, 11, "C"); c.vline(x + 37, y - 4, 2, "C");
  }
}

function wardrobe(c, x, b) {
  const w = 28, h = 46;
  c.rect(x, b - h + 1, w, h, "v"); c.rect(x - 1, b - h, w + 2, 3, "V"); c.hline(x - 1, b - h, w + 2, "u");
  c.rect(x + 2, b - h + 4, 11, h - 9, "V"); c.rect(x + 15, b - h + 4, 11, h - 9, "V");
  c.box(x + 2, b - h + 4, 11, h - 9, "W"); c.box(x + 15, b - h + 4, 11, h - 9, "W");
  c.px(x + 12, b - 22, "j"); c.px(x + 15, b - 22, "j");
  c.rect(x + 2, b - 4, 3, 5, "W"); c.rect(x + w - 5, b - 4, 3, 5, "W");
  // a shirt sleeve caught in the door
  c.rect(x + 13, b - 14, 2, 4, "B"); c.px(x + 13, b - 10, "n");
}

function chest(c, x, b) {
  c.rect(x, b - 11, 18, 12, "v"); c.rect(x, b - 11, 18, 5, "V"); c.hline(x, b - 11, 18, "u");
  c.hline(x, b - 6, 18, "4"); c.vline(x + 3, b - 11, 12, "4"); c.vline(x + 14, b - 11, 12, "4");
  c.rect(x + 7, b - 7, 4, 4, "j"); c.px(x + 8, b - 5, "o");
}

function painting(c, x, y) {
  c.rect(x, y, 18, 14, "O"); c.hline(x, y, 18, "j"); c.rect(x + 2, y + 2, 14, 10, "N");
  c.rect(x + 2, y + 8, 14, 4, "h"); c.hline(x + 2, y + 8, 14, "H");
  c.circ(x + 12, y + 4, 1, "C");
  c.poly([x + 3, y + 9, x + 7, y + 4, x + 11, y + 9], "5"); c.px(x + 7, y + 4, "7");
}

function coins(c, x, b, n) {
  for (let i = 0; i < n; i++) { const xx = x + (i * 9) % 25, yy = b - Math.floor(i / 3) * 3; c.hline(xx, yy, 6, "O"); c.hline(xx, yy - 1, 6, "j"); c.px(xx + 1, yy - 2, "8"); c.px(xx + 4, yy - 2, "j"); }
}

function bars(c, x, b, n, col = "z") {
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3), k = i % 3, bx = x + k * 9 + (row % 2) * 4, by = b - row * 4;
    c.rect(bx, by - 3, 9, 4, col); c.hline(bx + 1, by - 3, 7, "Z"); c.hline(bx, by, 9, "q");
  }
}

function chimney(c, x, y0, y1, w = 12) {
  c.rect(x, y0, w, y1 - y0, "Q");
  for (let y = y0, r = 0; y < y1; y += 5, r++) { c.hline(x, y, w, "q"); c.vline(x + (r % 2 ? 4 : 8), y, 5, "q"); }
  c.vline(x, y0, y1 - y0, "z");
  c.vline(x + w - 1, y0, y1 - y0, "q");
}

// ------------------------------------------------------------------ rooms

/** Rooms are carved caves, not boxes: a round vault on top, soft rounded lower corners, a warm rim. */
function carve(c, w) {
  const R = 24, r2 = 6;
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    let edge = false;
    if (y < R && (x < R || x >= w - R)) {
      const cx = x < R ? R : w - R - 1, dd = Math.hypot(x - cx, y - R);
      if (dd > R) { c.px(x, y, "_"); continue; }
      edge = dd > R - 1.6;
    }
    if (y >= H - r2 && (x < r2 || x >= w - r2)) {
      const cx = x < r2 ? r2 : w - r2 - 1, dd = Math.hypot(x - cx, y - (H - r2 - 1));
      if (dd > r2) { c.px(x, y, "_"); continue; }
    }
    if (edge || (y >= R && (x === 0 || x === w - 1)) || (y === 0 && x >= R && x < w - R)) c.px(x, y, "s");
  }
}

function room(type, wallFn, floorFn, draw) {
  const w = ROOMS[type].w * CELL;
  sprite("room_" + type, { w, h: H }, (c) => {
    wallFn(c, w);
    ceiling(c, w);
    floorFn(c, w);
    draw(c, w, ROOMS[type]);
    carve(c, w);
  }, glow("yY0", { r: 8, strength: 0.3 }));
}

const brickWall = (base, lite) => (c, w) => bricks(c, 0, 5, w, FY - 5, "q", base, lite);
const plankWall = (c, w) => planks(c, 0, 5, w, FY - 5, "w", "W", "v");
const stoneWall = (c, w) => cutStone(c, 0, 5, w, FY - 5, "3", "2", "4");

room("tavern", plankWall, floorPlanks, (c, w, R) => {
  // wainscot
  c.rect(4, 62, w - 8, 3, "V"); c.hline(4, 62, w - 8, "u"); c.hline(4, 65, w - 8, "w");
  // bar counter with taps, mugs on the shelf behind
  c.rect(6, 70, 50, 20, "v"); c.rect(4, 66, 54, 4, "V"); c.hline(4, 66, 54, "u"); c.hline(4, 69, 54, "w");
  for (let x = 8; x < 56; x += 12) { c.rect(x, 72, 9, 15, "W"); c.box(x, 72, 9, 15, "w"); }
  for (const tx of [20, 34]) { c.vline(tx, 58, 8, "6"); c.rect(tx - 1, 57, 3, 2, "7"); c.px(tx + 1, 61, "6"); c.px(tx + 2, 62, "6"); }
  mug(c, 44, 65); mug(c, 10, 65);
  shelf(c, 6, 40, 46); for (let i = 0; i < 7; i++) mug(c, 9 + i * 6, 39);
  barrelEnd(c, 8, 30); barrelEnd(c, 26, 30); c.rect(42, 22, 6, 9, "h"); c.rect(43, 20, 4, 2, "G"); c.px(43, 23, "J");   // and a bottle
  // tables and stools at the seats
  table(c, 72, B, 24); mug(c, 76, B - 13); mug(c, 88, B - 13);
  table(c, 116, B, 22); mug(c, 124, B - 13);
  stool(c, 62, B); stool(c, 96, B); stool(c, 110, B); stool(c, 136, B);
  rug(c, 62, 84, "p", "P");
  painting(c, 88, 24);
  // fireplace
  const [fx, fy, fw, fh] = R.fire;
  c.rect(fx - 8, fy - 12, fw + 16, FY - fy + 12, "4"); c.rect(fx - 10, fy - 15, fw + 20, 4, "5"); c.hline(fx - 10, fy - 15, fw + 20, "6");
  for (let y = fy - 8, r = 0; y < FY; y += 6, r++) { c.hline(fx - 8, y, fw + 16, "3"); c.vline(fx - 8 + (r % 2 ? 6 : 12), y, 6, "3"); c.vline(fx + fw + (r % 2 ? 2 : -4), y, 6, "3"); }
  c.rect(fx, fy, fw, FY - fy, "s");
  c.rect(fx + 1, FY - 4, fw - 2, 3, "W"); c.hline(fx + 1, FY - 4, fw - 2, "v");       // logs
  chimney(c, fx + 4, 5, fy - 15, 12);
  c.px(fx - 6, fy - 17, "j"); c.rect(fx + fw + 2, fy - 20, 4, 5, "u");             // a candle and a jar on the mantel
  cat(c, fx - 30, B);
  cobweb(c, 4, 7);
  lantern(c, 92, 12); lantern(c, 41, 10);
});

room("quarters", plankWall, floorPlanks, (c, w) => {
  const cols = [["P", "G"], ["n", "h"]];
  for (let i = 0; i < 2; i++) bunk(c, 4 + i * 52, B, cols[i][0], cols[i][1]);
  wardrobe(c, 108, B);
  chest(c, 108 - 20, B);
  lantern(c, 104, 12);
  painting(c, 113, 22);
  rug(c, 98, 36, "B", "n");
  cobweb(c, w - 5, 7, true);
});

room("warehouse", plankWall, floorPlanks, (c, w) => {
  for (const y of [28, 54]) shelf(c, 5, y, w - 10);
  for (let x = 8; x < w - 18; x += 15) (x % 2 ? crate(c, x, 27, 12) : sack(c, x, 27));
  for (let x = 10; x < w - 18; x += 14) (x % 3 ? sack(c, x, 53, "u") : crate(c, x, 53, 11, "u"));
  for (let x = 6; x < w - 30; x += 18) { crate(c, x, B, 15); if (x % 4) sack(c, x + 15, B); }
  barrel(c, w - 34, B, 20); barrel(c, w - 20, B, 20);
  crate(c, 10, B - 15, 12, "u");
  lantern(c, 69, 10);
});

room("vault", stoneWall, floorStone, (c, w) => {
  const cx = Math.floor(w / 2), cy = 50;
  c.circ(cx, cy, 23, "2"); c.circ(cx, cy, 21, "5"); c.circ(cx, cy, 18, "4"); c.ring(cx, cy, 14, "3"); c.ring(cx, cy, 20, "6");
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.circ(Math.round(cx + Math.cos(a) * 17), Math.round(cy + Math.sin(a) * 17), 1, "7"); }
  c.rect(cx - 9, cy - 1, 19, 3, "j"); c.rect(cx - 1, cy - 9, 3, 19, "j"); c.circ(cx, cy, 3, "O"); c.px(cx - 1, cy - 1, "8");
  c.hline(cx - 9, cy - 1, 19, "8");
  coins(c, 7, B, 9); coins(c, w - 32, B, 6);
  chest(c, w - 24, B - 4);
  lantern(c, 45, 10);
});

room("smelter", brickWall("z", "Z"), floorStone, (c, w, R) => {
  const [fx, fy, fw, fh] = R.fire;
  const x0 = fx - 13, x1 = fx + fw + 13;
  chimney(c, R.chimney[0] - 6, 5, 30, 14);
  // the furnace: a stepped brick dome with an arched mouth
  c.rect(x0, 34, x1 - x0, FY - 34, "Q"); c.rect(x0 + 4, 29, x1 - x0 - 8, 5, "Q"); c.rect(x0 + 8, 25, x1 - x0 - 16, 4, "Q");
  bricks(c, x0 + 1, 35, x1 - x0 - 2, FY - 36, "q", "z", "Z", 3);
  c.vline(x0, 34, FY - 34, "Z"); c.vline(x1 - 1, 34, FY - 34, "q");
  c.hline(x0 + 4, 29, x1 - x0 - 8, "Z"); c.hline(x0 + 8, 25, x1 - x0 - 16, "Z");
  c.rect(fx - 1, fy - 3, fw + 2, fh + 4, "s"); c.rect(fx + 1, fy - 5, fw - 2, 2, "s");      // mouth
  c.rect(fx - 3, fy + fh + 1, fw + 6, 3, "5"); c.hline(fx - 3, fy + fh + 1, fw + 6, "6");
  // bellows
  const [bx, by] = R.bellows;
  c.poly([bx, by + 2, bx + 14, by, bx + 14, by + 9, bx, by + 7], "v"); c.hline(bx + 1, by + 4, 13, "V"); c.hline(bx + 1, by + 6, 13, "W");
  c.rect(bx + 14, by - 3, 3, 6, "W"); c.rect(bx - 5, by + 3, 5, 3, "4");
  // crucible, ore heap, coal sack, bars on the shelf
  c.rect(90, FY - 8, 10, 8, "2"); c.hline(90, FY - 8, 10, "F"); c.hline(91, FY - 7, 8, "y"); c.vline(89, FY - 7, 6, "2"); c.vline(100, FY - 7, 6, "2");
  for (let i = 0; i < 26; i++) { const hgt = Math.round(Math.sin((i / 26) * Math.PI) * 9); c.vline(104 + i, FY - hgt, hgt, i % 3 ? "4" : "5"); }
  c.px(109, FY - 5, "F"); c.px(115, FY - 7, "n"); c.px(121, FY - 4, "F"); c.px(112, FY - 3, "j"); c.px(118, FY - 8, "5");
  sack(c, 70, B, "2");
  shelf(c, 88, 34, 46); bars(c, 92, 33, 5); c.rect(122, 26, 7, 7, "4"); c.px(124, 28, "F");
  lantern(c, 118, 12);
});

room("forge", brickWall("Q", "z"), floorStone, (c, w, R) => {
  const [fx, fy, fw] = R.fire;
  chimney(c, R.chimney[0] - 6, 5, 38, 14);
  for (let i = 0; i < 11; i++) c.hline(fx - 2 - i, 38 + i, fw + 4 + i * 2, i % 2 ? "4" : "5");   // hood
  c.hline(fx - 13, 49, fw + 26, "6");
  c.rect(fx - 8, fy + 6, fw + 16, FY - fy - 6, "4"); c.hline(fx - 8, fy + 6, fw + 16, "6");      // hearth
  for (let x = fx - 5, r = 0; x < fx + fw + 8; x += 8, r++) c.vline(x, fy + 8, FY - fy - 8, "3");
  c.hline(fx - 8, fy + 14, fw + 16, "3");
  c.rect(fx, fy, fw, 6, "s");
  // anvil on a stump
  const [ax, ay] = R.anvil;
  c.rect(ax - 6, ay + 2, 13, FY - ay - 2, "v"); c.hline(ax - 6, ay + 2, 13, "u"); c.vline(ax - 3, ay + 4, FY - ay - 6, "W"); c.vline(ax + 3, ay + 5, FY - ay - 8, "W");
  c.rect(ax - 3, ay - 2, 7, 4, "2");
  c.rect(ax - 10, ay - 7, 20, 5, "3"); c.hline(ax - 10, ay - 7, 20, "6"); c.hline(ax - 9, ay - 6, 18, "5");
  c.rect(ax - 14, ay - 7, 4, 2, "3"); c.px(ax - 15, ay - 7, "3");
  // quench barrel with water
  barrel(c, R.quench[0] - 7, B, 18, "B"); c.hline(R.quench[0] - 4, B - 16, 7, "n");
  // tool rack: tongs, hammers, a file
  c.rect(84, 18, 52, 3, "V"); c.hline(84, 18, 52, "u");
  for (let i = 0; i < 6; i++) { const tx = 87 + i * 8; c.vline(tx + 1, 21, 15, "v"); if (i % 2) c.rect(tx - 1, 21, 5, 4, "5"); else { c.vline(tx, 21, 15, "4"); c.px(tx + 2, 35, "4"); } }
  shield(c, 112, 44, "f");
  lantern(c, 126, 12);
});

room("grindstone", stoneWall, floorStone, (c, w, R) => {
  const [wx, wy] = R.wheel;
  c.rect(wx - 20, FY - 4, 40, 4, "v"); c.hline(wx - 20, FY - 4, 40, "V");
  c.rect(wx - 19, wy - 3, 4, FY - wy - 1, "W"); c.rect(wx + 15, wy - 3, 4, FY - wy - 1, "W");
  c.circ(wx, wy, 15, "4"); c.circ(wx, wy, 13, "5"); c.ring(wx, wy, 9, "4"); c.ring(wx, wy, 15, "3"); c.circ(wx, wy, 3, "W");
  c.hline(wx - 19, wy, 38, "v");
  barrel(c, wx + 36, B, 13, "B");
  c.rect(6, 16, 34, 3, "V"); c.hline(6, 16, 34, "u");
  for (let i = 0; i < 3; i++) { c.vline(11 + i * 11, 19, 14, "v"); c.rect(9 + i * 11, 20, 6, 6, "6"); c.vline(9 + i * 11, 20, 6, "7"); }
  lantern(c, 45, 10);
  cobweb(c, w - 5, 7, true);
});

room("engraver", plankWall, floorPlanks, (c, w, R) => {
  c.rect(6, 70, 44, 4, "V"); c.hline(6, 70, 44, "u"); c.hline(6, 74, 44, "w");
  c.rect(9, 74, 4, 16, "W"); c.rect(43, 74, 4, 16, "W"); c.hline(13, 84, 30, "W");
  c.rect(12, 62, 9, 8, "4"); c.rect(13, 59, 7, 3, "5"); c.hline(10, 66, 13, "3");      // vise
  c.rect(26, 65, 12, 5, "7"); c.hline(27, 67, 9, "5"); c.px(30, 66, "6");              // plate
  c.rect(6, 18, 44, 30, "v"); c.box(6, 18, 44, 30, "W"); c.box(7, 19, 42, 28, "V");   // pegboard
  for (let i = 0; i < 8; i++) { c.vline(11 + i * 5, 23, 11, i % 2 ? "6" : "v"); c.px(11 + i * 5, 22, "4"); }
  c.rect(36, 38, 9, 6, "j"); c.px(38, 40, "8");
  c.rect(30, 56, 3, 9, "4"); c.rect(27, 53, 9, 3, "y"); c.hline(27, 53, 9, "Y");      // little lamp
  lantern(c, 73, 12);
  plant(c, 80, B);
});

room("jeweler", brickWall("p", "P"), floorPlanks, (c, w, R) => {
  c.rect(6, 70, 50, 4, "p"); c.hline(6, 70, 50, "P"); c.hline(6, 74, 50, "q");
  c.rect(9, 74, 4, 16, "W"); c.rect(49, 74, 4, 16, "W");
  c.vline(36, 48, 22, "4"); c.rect(30, 46, 13, 4, "5"); c.rect(32, 50, 9, 2, "Y");   // lens lamp
  c.ellipse(36, 60, 6, 4, "N"); c.ring(36, 60, 6, "O"); c.px(34, 58, "C");
  c.rect(16, 66, 6, 4, "j"); c.px(18, 65, "H"); c.px(24, 68, "P"); c.px(26, 68, "N");
  // display cabinet with glowing gems
  c.rect(72, 28, 40, 62, "W"); c.hline(72, 28, 40, "V"); c.rect(75, 31, 34, 25, "b"); c.rect(75, 59, 34, 25, "b");
  c.hline(75, 46, 34, "W"); c.hline(75, 74, 34, "W");
  const gems = ["J", "P", "j", "N", "9", "H"];
  for (let i = 0; i < 8; i++) { const g = gems[i % 6], g2 = gems[(i + 3) % 6], gx = 78 + i * 4; c.px(gx, 43 - (i % 2) * 2, g); c.px(gx + 1, 43 - (i % 2) * 2, g); c.px(gx, 71 - (i % 2) * 2, g2); c.px(gx + 1, 71 - (i % 2) * 2, g2); }
  c.vline(77, 32, 22, "n"); c.vline(77, 60, 22, "n");
});

room("farm", (c, w) => earth(c, 0, 5, w, FY - 5), floorPlanks, (c, w) => {
  const caps = ["Z", "z", "V", "H"];
  for (let x = 4, n = 0; n < 3; x += 34, n++) {
    c.rect(x, FY - 8, 30, 8, "w"); c.hline(x, FY - 8, 30, "W"); c.hline(x + 1, FY - 7, 28, "v");
    for (let k = 0; k < 5; k++) mushroom(c, x + 2 + k * 6, FY - 8, 4 + ((x + k) % 3) * 3, caps[(n + k) % 4], k % 2 ? "J" : "C");
  }
  // watering can
  c.rect(w - 22, FY - 10, 11, 10, "5"); c.hline(w - 22, FY - 10, 11, "6"); c.line(w - 11, FY - 8, w - 5, FY - 13, "5"); c.rect(w - 21, FY - 13, 8, 2, "4");
  // glowing cave shrooms on the wall
  for (const [x, y] of [[16, 32], [54, 26], [92, 38], [122, 24]]) { c.ellipse(x, y, 4, 2, "H"); c.px(x - 1, y - 2, "J"); c.px(x + 1, y - 1, "J"); c.vline(x, y + 2, 3, "c"); }
});

room("brewery", plankWall, floorPlanks, (c, w, R) => {
  const [kx] = R.kettle;
  c.rect(kx - 17, FY - 32, 34, 32, "F"); c.rect(kx - 19, FY - 26, 38, 20, "F");
  c.vline(kx - 13, FY - 31, 26, "Y"); c.vline(kx - 12, FY - 30, 20, "y"); c.vline(kx + 12, FY - 31, 28, "f"); c.vline(kx + 16, FY - 26, 20, "f");
  for (const ry of [FY - 26, FY - 10]) { c.hline(kx - 19, ry, 38, "f"); for (let x = kx - 16; x < kx + 18; x += 6) c.px(x, ry - 1, "y"); }
  c.rect(kx - 12, FY - 36, 24, 4, "f"); c.rect(kx - 3, FY - 44, 6, 8, "f"); c.rect(kx - 3, 9, 6, FY - 53, "f");   // pipe
  c.vline(kx - 2, 9, FY - 45, "F");
  c.rect(kx - 9, FY - 5, 18, 5, "2"); c.hline(kx - 9, FY - 5, 18, "4");
  for (let i = 0; i < 3; i++) barrelEnd(c, 66 + i * 15, B);
  for (let i = 0; i < 2; i++) barrelEnd(c, 73 + i * 15, B - 14);
  // dried mushrooms hanging on a string
  c.hline(56, 14, 52, "u"); for (let x = 59; x < 106; x += 8) { c.vline(x, 15, 4, "u"); c.ellipse(x, 20, 3, 2, "V"); c.px(x - 1, 19, "u"); }
  lantern(c, 64, 30);
});

room("barracks", stoneWall, floorStone, (c, w, R) => {
  axeRack(c, 8, 20, 4);
  shield(c, 56, 18, "f"); shield(c, 76, 18, "B");
  banner(c, 98, 10, "f", "j");
  // training dummy
  c.vline(130, FY - 34, 34, "v"); c.vline(131, FY - 34, 34, "W"); c.hline(122, FY - 24, 17, "v");
  c.rect(124, FY - 30, 14, 18, "u"); c.rect(127, FY - 39, 8, 9, "u"); c.px(130, FY - 22, "f"); c.px(131, FY - 22, "f");
  c.hline(125, FY - 15, 12, "V"); c.vline(124, FY - 30, 18, "U"); c.px(129, FY - 36, "V"); c.px(132, FY - 36, "V");
  // bench
  bench(c, 42, B, 50);
  c.rect(10, FY - 6, 14, 6, "v"); c.hline(10, FY - 6, 14, "V"); c.px(15, FY - 8, "4"); c.px(19, FY - 8, "5");   // a box of whetstones
  lantern(c, 95, 12);
});

// ------------------------------------------------------------------ animated bits placed by the game

anim("fire_furnace", { w: 16, h: 12, frames: 4, fps: 8 }, (c) => {
  const k = c.phase * Math.PI * 2;
  for (let x = 0; x < 16; x++) {
    const hgt = Math.round(7 + Math.sin(k + x * 1.1) * 3 + (x % 3 === 0 ? 1 : 0));
    c.vline(x, 12 - hgt, hgt, "F"); c.vline(x, 12 - Math.max(1, hgt - 3), Math.max(1, hgt - 3), "y");
    if (x % 2) c.vline(x, 12 - Math.max(1, hgt - 5), Math.max(1, hgt - 5), "Y");
  }
});
anim("fire_hearth", { w: 26, h: 8, frames: 4, fps: 8 }, (c) => {
  const k = c.phase * Math.PI * 2;
  for (let x = 0; x < 26; x++) {
    const hgt = Math.max(1, Math.round(4 + Math.sin(k * 1 + x * 0.8) * 3));
    c.vline(x, 8 - hgt, hgt, "F"); c.vline(x, 8 - Math.max(1, hgt - 2), Math.max(1, hgt - 2), "y");
    if (x % 3 === 1) c.vline(x, 6, 2, "Y");
  }
  c.hline(0, 7, 26, "f");
});
anim("fire_place", { w: 20, h: 14, frames: 4, fps: 6 }, (c) => {
  const k = c.phase * Math.PI * 2;
  for (let x = 1; x < 19; x++) {
    const hgt = Math.round(8 + Math.sin(k + x * 0.9) * 2.5 - Math.abs(x - 10) * 0.5);
    c.vline(x, 11 - hgt, hgt, "F"); c.vline(x, 11 - Math.max(1, hgt - 3), Math.max(1, hgt - 3), "y");
    if (x > 6 && x < 14) c.vline(x, 11 - Math.max(1, hgt - 5), Math.max(1, hgt - 5), "Y");
  }
  c.rect(1, 11, 18, 3, "W"); c.hline(1, 11, 18, "v");
});
anim("wheel_spin", { w: 31, h: 31, frames: 4, fps: 10 }, (c) => {
  const a0 = c.phase * Math.PI / 2;
  for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; c.line(15, 15, Math.round(15 + Math.cos(a) * 12), Math.round(15 + Math.sin(a) * 12), "6"); }
});
