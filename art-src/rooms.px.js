// Rooms of the hold. 64 px tall, ROOMS[type].w * 16 wide. Floor surface at y = 58 (dwarves stand there).
// Fire, smoke, steam, sparks, lighting and dwarves are added by the game on top; positions in shared.js.

const H = ROOM_H, FY = FLOOR_Y;

// ------------------------------------------------------------------ surfaces

function bricks(c, x, y, w, h, mortar, base, lite, seed = 1) {
  c.rect(x, y, w, h, mortar);
  const rng = c.rng(seed);
  for (let row = 0; row * 5 < h; row++) {
    const off = row % 2 ? 5 : 0;
    for (let bx = -off; bx < w; bx += 10) {
      const x0 = Math.max(x, x + bx), x1 = Math.min(x + w, x + bx + 9);
      if (x1 <= x0) continue;
      const y0 = y + row * 5;
      const hh = Math.min(4, y + h - y0);
      if (hh <= 0) continue;
      c.rect(x0, y0, x1 - x0, hh, base);
      c.hline(x0, y0, x1 - x0, lite);
      if (rng() < 0.12) c.px(x0 + 2 + Math.floor(rng() * 5), y0 + 2, mortar);   // a chipped brick
    }
  }
}

function planks(c, x, y, w, h, dark, base, lite) {
  c.rect(x, y, w, h, base);
  for (let px = x; px < x + w; px += 8) {
    c.vline(px, y, h, dark);
    c.vline(px + 1, y, h, lite);
    c.px(px + 3, y + 4, dark); c.px(px + 3, y + h - 6, dark);    // nails
  }
}

function earth(c, x, y, w, h) {
  c.rect(x, y, w, h, "W");
  // soil layers: a darker band near the ceiling, a thin root line between
  c.rect(x, y, w, 9, "w"); c.hline(x, y + 9, w, "v");
  for (let sx = x + 4; sx < x + w - 6; sx += 23) { c.hline(sx, y + 20, 7, "w"); c.hline(sx + 9, y + 31, 5, "w"); }
  // roots hanging from the ceiling
  for (let rx = x + 6; rx < x + w - 4; rx += 13) {
    c.line(rx, y, rx + 2, y + 9, "v");
    c.line(rx + 2, y + 9, rx + 1, y + 14, "v");
    c.px(rx + 1, y + 15, "V");
  }
  // moss patches along the floor
  for (let mx = x + 3; mx < x + w - 6; mx += 17) { c.hline(mx, FY - 2, 6, "G"); c.hline(mx + 1, FY - 3, 4, "h"); c.px(mx + 2, FY - 4, "H"); }
}

function cutStone(c, x, y, w, h, base, dark, lite) {
  c.rect(x, y, w, h, base);
  const rng = c.rng(7);
  for (let yy = y; yy < y + h; yy += 9) {
    c.hline(x, yy, w, dark);
    let xx = x + (yy % 2 ? 0 : 7);
    while (xx < x + w) {
      c.vline(xx, yy, 9, dark);
      c.hline(xx + 1, yy + 1, 6, lite);
      xx += 10 + Math.floor(rng() * 9);
    }
  }
}

function floorPlanks(c, w) {
  c.rect(0, FY, w, H - FY, "W");
  c.hline(0, FY, w, "V");
  c.hline(0, FY + 1, w, "v");
  for (let x = 5; x < w; x += 13) { c.vline(x, FY + 1, 5, "w"); c.px(x + 2, FY + 3, "w"); }
}

function floorStone(c, w) {
  c.rect(0, FY, w, H - FY, "3");
  c.hline(0, FY, w, "5");
  c.hline(0, FY + 1, w, "4");
  for (let x = 3; x < w; x += 11) c.vline(x, FY + 1, 5, "2");
}

function ceiling(c, w) {
  // a wooden rib under the vault with little brackets; no hard box edge
  c.rect(14, 2, w - 28, 3, "W");
  c.hline(14, 2, w - 28, "V");
  c.hline(14, 5, w - 28, "w");
  for (let x = 24; x < w - 20; x += 32) { c.rect(x, 5, 3, 2, "W"); c.px(x + 1, 7, "w"); }
}

function pillars(c, w) {
  for (const x of [0, w - 3]) {
    c.rect(x, 0, 3, FY, "4");
    c.vline(x, 0, FY, "5");
    c.vline(x + 2, 0, FY, "3");
    c.rect(x, FY - 3, 3, 3, "5");
  }
}

function cobweb(c, x, y, right = false) {
  const d = right ? -1 : 1;
  for (let i = 0; i < 6; i++) c.px(x + d * i, y, "6");
  for (let i = 0; i < 6; i++) c.px(x, y + i, "6");
  for (let i = 0; i < 5; i++) c.px(x + d * i, y + i, "6");
  c.px(x + d * 3, y + 1, "6"); c.px(x + d * 1, y + 3, "6");
}

// ------------------------------------------------------------------ props (x left, b = bottom row)

function lantern(c, x, y) {
  c.vline(x + 2, 4, y - 4, "4");
  c.rect(x, y, 5, 1, "2");
  c.rect(x, y + 1, 5, 5, "y");
  c.rect(x + 1, y + 2, 3, 3, "Y");
  c.px(x + 2, y + 3, "0");
  c.vline(x, y + 1, 5, "2"); c.vline(x + 4, y + 1, 5, "2");
  c.rect(x + 1, y + 6, 3, 1, "2");
}

function sconce(c, x, y) {
  c.rect(x, y + 4, 3, 1, "2");
  c.vline(x + 1, y + 2, 2, "v");
  c.px(x + 1, y + 1, "y"); c.px(x + 1, y, "Y");
}

function barrel(c, x, b, h = 12, top) {
  const w = 10;
  c.rect(x + 1, b - h + 1, w - 2, h, "v");
  c.rect(x, b - h + 3, w, h - 4, "v");
  c.vline(x + 2, b - h + 1, h, "V");
  c.vline(x + 7, b - h + 1, h, "W");
  c.hline(x, b - h + 3, w, "4"); c.hline(x, b - 2, w, "4");
  if (top) c.hline(x + 1, b - h + 1, w - 2, top);
}

function barrelEnd(c, x, b) {
  c.circ(x + 5, b - 5, 5, "v");
  c.ring(x + 5, b - 5, 5, "W");
  c.ring(x + 5, b - 5, 3, "W");
  c.px(x + 5, b - 5, "w");
  c.px(x + 3, b - 8, "V");
}

function crate(c, x, b, s = 9, col = "V") {
  c.rect(x, b - s + 1, s, s, col);
  c.box(x, b - s + 1, s, s, "v");
  c.line(x + 1, b - s + 2, x + s - 2, b - 1, "v");
  c.hline(x + 1, b - s + 2, s - 2, "u");
}

function sack(c, x, b, col = "c") {
  c.ellipse(x + 4, b - 3, 4, 4, col);
  c.rect(x + 3, b - 8, 3, 2, col);
  c.hline(x + 3, b - 7, 3, "u");
  c.px(x + 2, b - 4, "C");
}

function table(c, x, b, w) {
  c.rect(x, b - 8, w, 2, "V");
  c.hline(x, b - 8, w, "u");
  c.rect(x + 2, b - 6, 2, 7, "W"); c.rect(x + w - 4, b - 6, 2, 7, "W");
}

function stool(c, x, b) { c.rect(x, b - 4, 6, 2, "V"); c.hline(x, b - 4, 6, "u"); c.vline(x + 1, b - 2, 3, "W"); c.vline(x + 4, b - 2, 3, "W"); }

function mug(c, x, b) { c.rect(x, b - 3, 3, 4, "u"); c.hline(x, b - 3, 3, "C"); c.px(x + 3, b - 1, "u"); }

function shelf(c, x, y, w) { c.rect(x, y, w, 2, "V"); c.hline(x, y, w, "u"); c.px(x + 2, y + 2, "W"); c.px(x + w - 3, y + 2, "W"); }

function plant(c, x, b) {
  c.rect(x, b - 4, 6, 5, "z"); c.hline(x, b - 4, 6, "Z");
  c.line(x + 2, b - 5, x, b - 10, "G"); c.line(x + 3, b - 5, x + 3, b - 12, "h"); c.line(x + 4, b - 5, x + 6, b - 9, "G");
  c.px(x + 3, b - 12, "H"); c.px(x, b - 10, "H");
}

function rug(c, x, w, col, edge) { c.rect(x, FY, w, 2, col); c.hline(x, FY, w, edge); for (let i = x; i < x + w; i += 3) c.px(i, FY + 1, edge); }

function banner(c, x, y, col, mark) {
  c.hline(x - 1, y, 10, "v");
  c.rect(x, y + 1, 8, 14, col);
  c.px(x, y + 15, col); c.px(x + 7, y + 15, col); c.rect(x + 2, y + 15, 4, 1, col);
  c.rect(x + 3, y + 5, 2, 4, mark); c.rect(x + 2, y + 6, 4, 2, mark);
}

function shield(c, x, y, col) {
  c.circ(x + 5, y + 5, 5, col);
  c.ring(x + 5, y + 5, 5, "o");
  c.hline(x + 2, y + 5, 7, "j"); c.vline(x + 5, y + 2, 7, "j"); c.px(x + 5, y + 5, "8");
}

function axeRack(c, x, y, n) {
  c.rect(x, y, n * 7 + 2, 2, "V");
  for (let i = 0; i < n; i++) {
    const ax = x + 2 + i * 7;
    c.vline(ax + 2, y + 2, 14, "v");
    c.rect(ax, y + 3, 5, 4, i % 2 ? "6" : "5");
    c.px(ax, y + 3, "7");
  }
}

function cat(c, x, b) {   // a sleeping cat, very important
  c.ellipse(x + 6, b - 2, 6, 3, "V");
  c.rect(x + 9, b - 6, 5, 4, "V");
  c.px(x + 9, b - 7, "V"); c.px(x + 13, b - 7, "V");
  c.hline(x + 10, b - 4, 2, "w"); c.px(x + 13, b - 4, "w");
  c.line(x, b - 1, x - 3, b - 4, "V");
  c.hline(x + 3, b - 3, 4, "u");
}

function mushroom(c, x, b, s, cap, glow) {
  c.vline(x + Math.floor(s / 2), b - s + 1, s, "c");
  c.ellipse(x + Math.floor(s / 2), b - s, Math.max(1, Math.floor(s / 2) + 1), Math.max(1, Math.floor(s / 3)), cap);
  c.px(x + Math.floor(s / 2) - 1, b - s - 1, glow || "C");
}

function bunk(c, x, b, top, bottom) {
  c.rect(x, b - 26, 2, 27, "W"); c.rect(x + 24, b - 26, 2, 27, "W");
  c.rect(x + 2, b - 4, 22, 2, "V"); c.rect(x + 2, b - 18, 22, 2, "V");
  // bottom bed: pillow + blanket
  c.rect(x + 2, b - 7, 5, 3, "C"); c.rect(x + 7, b - 7, 17, 3, bottom); c.hline(x + 7, b - 7, 17, "C");
  c.rect(x + 2, b - 21, 5, 3, "C"); c.rect(x + 7, b - 21, 17, 3, top); c.hline(x + 7, b - 21, 17, "C");
  c.rect(x + 24, b - 30, 2, 4, "W");
}

function chest(c, x, b) {
  c.rect(x, b - 7, 12, 8, "v"); c.rect(x, b - 7, 12, 3, "V"); c.hline(x, b - 7, 12, "u");
  c.hline(x, b - 4, 12, "4"); c.rect(x + 5, b - 4, 2, 2, "j");
}

function painting(c, x, y) {
  c.rect(x, y, 12, 10, "O"); c.rect(x + 1, y + 1, 10, 8, "N");
  c.rect(x + 1, y + 6, 10, 3, "h"); c.px(x + 7, y + 3, "C"); c.rect(x + 3, y + 4, 3, 2, "5");
}

function coins(c, x, b, n) {
  for (let i = 0; i < n; i++) { const xx = x + (i * 7) % 18, yy = b - Math.floor(i / 3) * 2; c.hline(xx, yy, 4, "O"); c.hline(xx, yy - 1, 4, "j"); }
}

function bars(c, x, b, n, col = "z") {
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3), k = i % 3, bx = x + k * 6 + (row % 2) * 3, by = b - row * 3;
    c.rect(bx, by - 2, 6, 3, col); c.hline(bx + 1, by - 2, 4, "Z"); c.hline(bx, by, 6, "q");
  }
}

function chimney(c, x, y0, y1, w = 8) {
  c.rect(x, y0, w, y1 - y0, "Q");
  for (let y = y0; y < y1; y += 4) c.hline(x, y, w, "q");
  c.vline(x, y0, y1 - y0, "z");
  c.vline(x + w - 1, y0, y1 - y0, "q");
}

// ------------------------------------------------------------------ rooms

/** Rooms are carved caves, not boxes: a round vault on top, soft rounded lower corners, a warm rim. */
function carve(c, w) {
  const R = 18, r2 = 5;
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    let d = 0, edge = false;
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
  const w = ROOMS[type].w * 16;
  sprite("room_" + type, { w, h: H }, (c) => {
    wallFn(c, w);
    ceiling(c, w);
    floorFn(c, w);
    draw(c, w, ROOMS[type]);
    carve(c, w);
  }, glow("yY0", { r: 6, strength: 0.3 }));
}

const brickWall = (base, lite) => (c, w) => bricks(c, 0, 4, w, FY - 4, "q", base, lite);
const plankWall = (c, w) => planks(c, 0, 4, w, FY - 4, "w", "W", "v");
const stoneWall = (c, w) => cutStone(c, 0, 4, w, FY - 4, "3", "2", "4");

room("tavern", plankWall, floorPlanks, (c, w, R) => {
  // wainscot
  c.rect(3, 40, w - 6, 2, "V"); c.hline(3, 40, w - 6, "u");
  // bar counter with taps, mugs on the shelf behind
  c.rect(4, 44, 28, 14, "v"); c.rect(4, 42, 30, 3, "V"); c.hline(4, 42, 30, "u");
  for (let y = 47; y < 57; y += 4) c.hline(5, y, 26, "W");
  c.vline(14, 37, 5, "6"); c.px(14, 36, "7"); c.vline(22, 37, 5, "6"); c.px(22, 36, "7");
  shelf(c, 4, 24, 30); for (let i = 0; i < 6; i++) mug(c, 6 + i * 5, 23);
  barrelEnd(c, 6, 20); barrelEnd(c, 18, 20);
  // tables and stools at the seats
  table(c, 46, FY - 1, 16); mug(c, 50, FY - 9); mug(c, 56, FY - 9);
  table(c, 76, FY - 1, 16); mug(c, 82, FY - 9);
  rug(c, 40, 56, "p", "P");
  painting(c, 62, 18);
  // fireplace
  const [fx, fy, fw, fh] = R.fire;
  c.rect(fx - 6, fy - 8, fw + 12, FY - fy + 8, "4"); c.rect(fx - 7, fy - 10, fw + 14, 3, "5"); c.hline(fx - 7, fy - 10, fw + 14, "6");
  for (let y = fy - 6; y < FY; y += 5) c.hline(fx - 6, y, fw + 12, "3");
  c.rect(fx, fy, fw, fh + (FY - fy - fh), "s");
  c.rect(fx + 1, FY - 3, fw - 2, 2, "W");                              // logs
  chimney(c, fx + 3, 4, fy - 10, 8);
  cat(c, fx - 20, FY - 1);
  plant(c, w - 10, FY - 1);
  cobweb(c, 3, 5);
  lantern(c, 62, 9); lantern(c, 28, 8);
});

room("quarters", plankWall, floorPlanks, (c, w) => {
  const cols = [["P", "G"], ["n", "h"], ["h", "P"]];
  for (let i = 0; i < 3; i++) bunk(c, 4 + i * 30, FY - 1, cols[i][0], cols[i][1]);
  rug(c, 30, 36, "B", "n");
  chest(c, w - 16, FY - 1);
  mushroom(c, 33, FY - 1, 5, "Z");
  lantern(c, 46, 8);
  painting(c, 66, 6);
  cobweb(c, w - 4, 5, true);
});

room("warehouse", plankWall, floorPlanks, (c, w) => {
  for (const y of [18, 34]) shelf(c, 4, y, w - 8);
  for (let x = 6; x < w - 12; x += 11) (x % 2 ? crate(c, x, 17, 9) : sack(c, x, 17));
  for (let x = 8; x < w - 12; x += 10) (x % 3 ? sack(c, x, 33, "u") : crate(c, x, 33, 8, "u"));
  for (let x = 5; x < w - 12; x += 13) { crate(c, x, FY - 1, 11); if (x % 2) sack(c, x + 11, FY - 1); }
  barrel(c, w - 16, FY - 1, 14);
  lantern(c, 46, 8);
});

room("vault", stoneWall, floorStone, (c, w) => {
  const cx = Math.floor(w / 2), cy = 34;
  c.circ(cx, cy, 15, "2"); c.circ(cx, cy, 13, "5"); c.circ(cx, cy, 11, "4"); c.ring(cx, cy, 9, "3");
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.px(Math.round(cx + Math.cos(a) * 12), Math.round(cy + Math.sin(a) * 12), "7"); }
  c.hline(cx - 6, cy, 13, "j"); c.vline(cx, cy - 6, 13, "j"); c.circ(cx, cy, 2, "O");
  coins(c, 6, FY - 1, 8); coins(c, w - 22, FY - 1, 6);
  chest(c, w - 16, FY - 3);
});

room("smelter", brickWall("z", "Z"), floorStone, (c, w, R) => {
  const [fx, fy, fw, fh] = R.fire;
  const x0 = fx - 9, x1 = fx + fw + 9;
  chimney(c, R.chimney[0] - 2, 4, 20, 10);
  // the furnace: a stepped brick dome with an arched mouth
  c.rect(x0, 22, x1 - x0, FY - 22, "Q"); c.rect(x0 + 3, 18, x1 - x0 - 6, 4, "Q"); c.rect(x0 + 6, 15, x1 - x0 - 12, 3, "Q");
  bricks(c, x0 + 1, 23, x1 - x0 - 2, FY - 24, "q", "z", "Z", 3);
  c.vline(x0, 22, FY - 22, "Z"); c.vline(x1 - 1, 22, FY - 22, "q");
  c.rect(fx - 1, fy - 2, fw + 2, fh + 3, "s"); c.rect(fx, fy - 3, fw, 1, "s");      // mouth
  c.rect(fx - 2, fy + fh + 1, fw + 4, 2, "5");
  // bellows
  const [bx, by] = R.bellows;
  c.rect(bx, by, 10, 6, "v"); c.hline(bx, by + 2, 10, "V"); c.vline(bx + 10, by - 2, 4, "W"); c.rect(bx - 3, by + 2, 3, 2, "4");
  // crucible, ore heap, bars, coal sack
  c.rect(52, FY - 5, 7, 5, "2"); c.hline(52, FY - 5, 7, "F");
  for (let i = 0; i < 18; i++) { const hgt = Math.round(Math.sin((i / 18) * Math.PI) * 6); c.vline(62 + i, FY - hgt, hgt, i % 3 ? "4" : "5"); }
  c.px(66, FY - 4, "F"); c.px(70, FY - 5, "n"); c.px(74, FY - 3, "F"); c.px(68, FY - 2, "j");
  bars(c, 80, FY - 1, 4);
  sack(c, 50, FY - 7, "2");
  shelf(c, 58, 22, 30); c.rect(60, 18, 5, 4, "4"); c.rect(70, 19, 6, 3, "z");
  lantern(c, 78, 9);
});

room("forge", brickWall("Q", "z"), floorStone, (c, w, R) => {
  const [fx, fy, fw] = R.fire;
  chimney(c, R.chimney[0] - 3, 4, 26, 10);
  for (let i = 0; i < 8; i++) c.hline(fx - 2 - i, 26 + i, fw + 4 + i * 2, i % 2 ? "4" : "5");   // hood
  c.rect(fx - 6, fy + 4, fw + 12, FY - fy - 4, "4"); c.hline(fx - 6, fy + 4, fw + 12, "6");      // hearth
  for (let x = fx - 4; x < fx + fw + 6; x += 6) c.vline(x, fy + 6, FY - fy - 6, "3");
  c.rect(fx, fy, fw, 4, "s");
  // anvil on a stump
  const [ax, ay] = R.anvil;
  c.rect(ax - 4, ay + 2, 9, FY - ay - 2, "v"); c.hline(ax - 4, ay + 2, 9, "u");
  c.rect(ax - 2, ay - 1, 5, 3, "2");
  c.rect(ax - 7, ay - 4, 14, 3, "3"); c.hline(ax - 7, ay - 4, 14, "5"); c.rect(ax - 9, ay - 4, 3, 1, "3");
  // quench barrel with water
  barrel(c, R.quench[0] - 5, FY - 1, 12, "B"); c.hline(R.quench[0] - 3, FY - 12, 5, "n");
  // tool rack
  c.rect(58, 12, 34, 2, "V");
  for (let i = 0; i < 5; i++) { const tx = 60 + i * 7; c.vline(tx + 1, 14, 10, "v"); c.rect(tx, 14, 3, 3, i % 2 ? "5" : "4"); }
  shield(c, 80, 30, "f");
  lantern(c, 84, 8);
});

room("grindstone", stoneWall, floorStone, (c, w, R) => {
  const [wx, wy] = R.wheel;
  c.rect(wx - 14, FY - 3, 28, 3, "v");
  c.rect(wx - 13, wy - 2, 3, FY - wy - 1, "W"); c.rect(wx + 10, wy - 2, 3, FY - wy - 1, "W");
  c.circ(wx, wy, 10, "4"); c.circ(wx, wy, 9, "5"); c.ring(wx, wy, 6, "4"); c.circ(wx, wy, 2, "W");
  c.hline(wx - 13, wy, 26, "v");
  barrel(c, wx + 16, FY - 1, 9, "B");
  c.rect(4, 12, 24, 2, "V"); for (let i = 0; i < 3; i++) { c.vline(7 + i * 8, 14, 10, "v"); c.rect(6 + i * 8, 14, 4, 4, "6"); }
  lantern(c, 30, 8);
  cobweb(c, w - 4, 5, true);
});

room("engraver", plankWall, floorPlanks, (c, w, R) => {
  c.rect(6, 44, 30, 3, "V"); c.hline(6, 44, 30, "u"); c.rect(8, 47, 3, 11, "W"); c.rect(31, 47, 3, 11, "W");
  c.rect(10, 39, 6, 5, "4"); c.rect(11, 37, 4, 2, "5");                       // vise
  c.rect(19, 41, 8, 3, "7"); c.hline(20, 42, 5, "5");                           // plate
  c.rect(6, 12, 30, 20, "v"); c.box(6, 12, 30, 20, "W");                        // pegboard
  for (let i = 0; i < 6; i++) { c.vline(9 + i * 5, 15, 8, i % 2 ? "6" : "v"); c.px(9 + i * 5, 14, "4"); }
  c.rect(26, 26, 6, 4, "j");
  c.rect(20, 36, 2, 5, "4"); c.rect(18, 34, 6, 2, "y");                        // little lamp
  lantern(c, 48, 8);
  plant(c, 44, FY - 1);
});

room("jeweler", brickWall("p", "P"), floorPlanks, (c, w, R) => {
  c.rect(6, 44, 34, 3, "p"); c.hline(6, 44, 34, "P"); c.rect(8, 47, 3, 11, "W"); c.rect(35, 47, 3, 11, "W");
  c.vline(24, 30, 14, "4"); c.rect(20, 28, 9, 3, "5"); c.rect(22, 31, 5, 1, "Y");   // lens lamp
  c.ellipse(24, 38, 4, 3, "N"); c.ring(24, 38, 4, "O");
  c.rect(12, 41, 4, 3, "j"); c.px(13, 40, "H");
  // display cabinet with glowing gems
  c.rect(50, 18, 26, 40, "W"); c.rect(52, 20, 22, 16, "b"); c.rect(52, 38, 22, 16, "b");
  const gems = ["J", "P", "j", "N", "9", "H"];
  for (let i = 0; i < 6; i++) { c.px(55 + i * 3, 27 + (i % 2) * 2, gems[i]); c.px(55 + i * 3, 46 - (i % 2) * 2, gems[(i + 3) % 6]); }
  c.vline(53, 21, 14, "n");
}, );

room("farm", (c, w) => earth(c, 0, 4, w, FY - 4), floorPlanks, (c, w) => {
  const caps = ["Z", "z", "V", "H"];
  for (let x = 4; x < w - 22; x += 22) {
    c.rect(x, FY - 6, 20, 6, "w"); c.hline(x, FY - 6, 20, "W"); c.hline(x + 1, FY - 5, 18, "v");
    for (let k = 0; k < 4; k++) mushroom(c, x + 2 + k * 5, FY - 6, 3 + ((x + k) % 3) * 2, caps[(Math.floor(x / 22) + k) % 4], k % 2 ? "J" : "C");
  }
  // watering can
  c.rect(w - 16, FY - 7, 8, 7, "5"); c.line(w - 8, FY - 6, w - 4, FY - 9, "5"); c.rect(w - 15, FY - 9, 5, 2, "4");
  // glowing cave shrooms on the wall
  for (const [x, y] of [[12, 22], [40, 18], [70, 26], [86, 16]]) { c.ellipse(x, y, 3, 2, "H"); c.px(x, y - 1, "J"); c.vline(x, y + 2, 2, "c"); }
}, );

room("brewery", plankWall, floorPlanks, (c, w, R) => {
  const [kx] = R.kettle;
  c.rect(kx - 12, FY - 22, 24, 22, "F"); c.rect(kx - 13, FY - 18, 26, 14, "F");
  c.vline(kx - 9, FY - 21, 18, "Y"); c.vline(kx + 8, FY - 21, 20, "f");
  c.rect(kx - 8, FY - 25, 16, 3, "f"); c.rect(kx - 2, FY - 30, 4, 5, "f"); c.rect(kx - 2, 8, 4, FY - 38, "f");   // pipe
  c.rect(kx - 6, FY - 4, 12, 4, "2");
  for (let i = 0; i < 3; i++) barrelEnd(c, 40 + i * 12, FY - 1);
  for (let i = 0; i < 2; i++) barrelEnd(c, 46 + i * 12, FY - 11);
  // dried mushrooms hanging on a string
  c.hline(36, 10, 36, "u"); for (let x = 38; x < 72; x += 6) { c.vline(x, 11, 3, "u"); c.ellipse(x, 15, 2, 1, "V"); }
  lantern(c, 66, 20);
});

room("barracks", stoneWall, floorStone, (c, w, R) => {
  axeRack(c, 6, 14, 4);
  shield(c, 40, 14, "f"); shield(c, 54, 14, "B");
  banner(c, 74, 8, "f", "j");
  // training dummy
  c.vline(86, FY - 22, 22, "v"); c.hline(81, FY - 16, 11, "v");
  c.rect(82, FY - 20, 9, 12, "u"); c.rect(84, FY - 26, 5, 6, "u"); c.px(86, FY - 14, "f"); c.hline(83, FY - 10, 7, "V");
  // bench
  c.rect(30, FY - 6, 30, 2, "V"); c.vline(32, FY - 4, 4, "W"); c.vline(57, FY - 4, 4, "W");
  lantern(c, 46, 30);
});

// ------------------------------------------------------------------ animated bits placed by the game

anim("fire_furnace", { w: 12, h: 9, frames: 4, fps: 8 }, (c) => {
  const k = c.phase * Math.PI * 2;
  for (let x = 0; x < 12; x++) {
    const hgt = Math.round(5 + Math.sin(k + x * 1.3) * 2 + (x % 3 === 0 ? 1 : 0));
    c.vline(x, 9 - hgt, hgt, "F"); c.vline(x, 9 - Math.max(1, hgt - 2), Math.max(1, hgt - 2), "y");
    if (x % 2) c.vline(x, 9 - Math.max(1, hgt - 4), Math.max(1, hgt - 4), "Y");
  }
});
anim("fire_hearth", { w: 18, h: 6, frames: 4, fps: 8 }, (c) => {
  const k = c.phase * Math.PI * 2;
  for (let x = 0; x < 18; x++) {
    const hgt = Math.max(1, Math.round(3 + Math.sin(k * 1 + x * 0.9) * 2));
    c.vline(x, 6 - hgt, hgt, "F"); c.vline(x, 6 - Math.max(1, hgt - 1), Math.max(1, hgt - 1), "y");
    if (x % 3 === 1) c.px(x, 5, "Y");
  }
  c.hline(0, 5, 18, "f");
});
anim("fire_place", { w: 14, h: 10, frames: 4, fps: 6 }, (c) => {
  const k = c.phase * Math.PI * 2;
  for (let x = 1; x < 13; x++) {
    const hgt = Math.round(5 + Math.sin(k + x * 1.1) * 2 - Math.abs(x - 7) * 0.4);
    c.vline(x, 8 - hgt, hgt, "F"); c.vline(x, 8 - Math.max(1, hgt - 2), Math.max(1, hgt - 2), "y");
    if (x > 4 && x < 10) c.vline(x, 8 - Math.max(1, hgt - 4), Math.max(1, hgt - 4), "Y");
  }
  c.rect(1, 8, 12, 2, "W");
});
anim("wheel_spin", { w: 21, h: 21, frames: 4, fps: 10 }, (c) => {
  const a0 = c.phase * Math.PI / 2;
  for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; c.line(10, 10, Math.round(10 + Math.cos(a) * 8), Math.round(10 + Math.sin(a) * 8), "6"); }
});
