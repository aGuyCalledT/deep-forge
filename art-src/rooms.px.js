// Rooms of the hold. 96 px tall, ROOMS[type].w * 24 wide. Floor surface at y = 90 (dwarves stand there).
// Furniture is sized for the 33 px tall dwarves: a table reaches their belt, a seat their knee.
//
// Every room exists in four tiers (dug out, settled, grand, king's hall; ROOM_TIERS in shared.js) and two variants, so rooms
// change clearly when they are upgraded and no two look the same. Workshops get extra machine bays
// ("bay_<type>_<tier>_<variant>", BAYS in shared.js) that the game appends on the right.
// Sprites here are NOT carved: the game rounds the vault and corners of the finished room (sprites.js, roomImage),
// because a room with bays is only known at runtime.
// Wall patterns repeat every 24 px so the bays continue the wall without a seam.
//
// Small imperfections belong to the wall pass, so furniture covers them naturally: odd stones and bricks,
// cracks, stains, a missing plank. Cobwebs come last, in corners and under shelves.

const H = ROOM_H, FY = FLOOR_Y, B = FLOOR_Y - 1;   // B: the bottom row of things standing on the floor

// ------------------------------------------------------------------ imperfections

/** A hairline crack that starts at (x, y) and wanders down, with a short branch. */
function crack(c, x, y, len, col, rng) {
  let cx = x;
  for (let i = 0; i < len; i++) {
    c.px(cx, y + i, col);
    if (rng() < 0.45) cx += rng() < 0.5 ? -1 : 1;
    if (i === Math.floor(len / 2)) { let bx = cx; for (let k = 1; k < 4; k++) { bx += 1; c.px(bx, y + i + k, col); } }
  }
}

/** Damp: a few short streaks running down from a line (under the ceiling rib or a shelf). */
function stain(c, x, y, w, col, rng) {
  for (let i = 0; i < w; i += 2) { const l = 2 + Math.floor(rng() * 7); c.vline(x + i, y, l, col); }
}

let webShift = { from: Infinity, by: 0 };   // while a room's furniture is drawn: webs in its right corner move to the real corner
function cobweb(c, x, y, right = false, size = 9) {
  if (x >= webShift.from) x += webShift.by;
  const d = right ? -1 : 1;
  for (let i = 0; i < size; i++) c.px(x + d * i, y, "6");
  for (let i = 0; i < size; i++) c.px(x, y + i, "6");
  for (let i = 0; i < size - 2; i++) c.px(x + d * i, y + i, "6");
  const r = Math.floor(size / 2);
  for (let i = 0; i <= r; i++) c.px(x + d * (r - i + 1), y + i + 1, "6");      // the ring
  c.px(x + d * 2, y + r, "6"); c.px(x + d * r, y + 2, "6");
}

// ------------------------------------------------------------------ walls (period 24)

/** Tier 0: rough rock, dug out by hand, with damp patches and cracks. */
function roughWall(c, x0, w, rng) {
  c.rect(x0, 5, w, FY - 5, ")");
  for (let y = 5, row = 0; y < FY; y += 8, row++) {
    const off = row % 2 ? 12 : 0;
    for (let x = -off; x < w; x += 12) {
      const sx = Math.max(0, x), ex = Math.min(w, x + 11);
      if (ex <= sx) continue;
      const odd = rng() < 0.08;
      const fill = odd ? (rng() < 0.5 ? "{" : "(") : (row + Math.floor(x / 12)) % 3 ? "[" : ")";
      c.rect(x0 + sx, y, ex - sx, 7, fill);
      c.hline(x0 + sx + 1, y, ex - sx - 2, odd ? "}" : "]");
      c.hline(x0 + sx, y + 6, ex - sx, "(");
      if (odd && rng() < 0.5) c.px(x0 + sx + 3, y + 3, "6");                      // a glint of quartz
    }
  }
}

function bricks(c, x, y, w, h, mortar, base, lite, rng, odd = ["q", "Z"]) {
  c.rect(x, y, w, h, mortar);
  for (let row = 0; row * 7 < h; row++) {
    const off = row % 2 ? 6 : 0;
    for (let bx = -off; bx < w; bx += 12) {
      const x0 = Math.max(x, x + bx), x1 = Math.min(x + w, x + bx + 11);
      if (x1 <= x0) continue;
      const y0 = y + row * 7;
      const hh = Math.min(6, y + h - y0);
      if (hh <= 0) continue;
      const r = rng();
      const col = r < 0.05 ? odd[0] : r < 0.09 ? odd[1] : base;                 // an odd brick from another batch
      c.rect(x0, y0, x1 - x0, hh, col);
      c.hline(x0, y0, x1 - x0, col === base ? lite : col);
      if (rng() < 0.12) c.px(x0 + 2 + Math.floor(rng() * 7), y0 + 3, mortar);   // a chipped brick
      if (rng() < 0.015 && hh > 4) c.line(x0 + 2, y0 + 1, x0 + 6, y0 + hh - 1, mortar);   // a cracked one
    }
  }
}

function planks(c, x, y, w, h, dark, base, lite, rng) {
  c.rect(x, y, w, h, base);
  for (let px = x; px < x + w; px += 12) {
    const r = rng();
    if (r < 0.1) c.rect(px + 2, y, 10, h, lite === "v" ? "w" : dark);                 // one board darker, replaced later
    c.vline(px, y, h, dark);
    c.vline(px + 1, y, h, lite);
    c.px(px + 4, y + 5, dark); c.px(px + 4, y + h - 8, dark);                        // nails
    c.vline(px + 7, y + 10 + Math.floor(rng() * 20), 6 + Math.floor(rng() * 10), dark);   // grain
    if (rng() < 0.5) { const ky = y + 20 + Math.floor(rng() * (h - 40)); c.px(px + 6, ky, dark); c.px(px + 7, ky + 1, dark); }
    if (rng() < 0.08) { const py = y + 30 + Math.floor(rng() * 30); c.rect(px + 3, py, 7, 6, lite); c.box(px + 3, py, 7, 6, dark); c.px(px + 4, py + 1, dark); c.px(px + 8, py + 4, dark); }   // a patch nailed on
  }
}

function earth(c, x, y, w, h, rng) {
  c.rect(x, y, w, h, "W");
  c.rect(x, y, w, 12, "w"); c.hline(x, y + 12, w, "v");
  for (let sx = x + 4; sx < x + w; sx += 24) { c.hline(sx, y + 28, 9, "w"); c.hline(sx + 12, y + 44, 7, "w"); c.px(sx + 20, y + 36, "v"); }
  for (let rx = x + 8; rx < x + w - 4; rx += 24) {                                  // roots hanging from the ceiling
    const l = 14 + Math.floor(rng() * 10);
    c.line(rx, y, rx + 3, y + 12, "v"); c.line(rx + 3, y + 12, rx + 1, y + l, "v"); c.px(rx + 1, y + l + 1, "V");
  }
  for (let i = 0; i < w / 40; i++) { const sx = x + Math.floor(rng() * (w - 8)), sy = y + 20 + Math.floor(rng() * 40); c.rect(sx, sy, 4, 3, "4"); c.hline(sx, sy, 4, "5"); }   // a stone in the soil
  for (let mx = x + 4; mx < x + w - 8; mx += 24) { c.hline(mx, FY - 2, 9, "G"); c.hline(mx + 1, FY - 3, 6, "h"); c.px(mx + 3, FY - 4, "H"); }
}

function cutStone(c, x, y, w, h, base, dark, lite, rng, odd = ["2", "5"]) {
  c.rect(x, y, w, h, base);
  for (let yy = y, row = 0; yy < y + h; yy += 13, row++) {
    c.hline(x, yy, w, dark);
    const joints = row % 2 ? [0, 13] : [6, 18];
    for (let xx = x; xx < x + w; xx += 24) for (const j of joints) {
      const jx = xx + j;
      if (jx >= x + w) continue;
      const next = joints[(joints.indexOf(j) + 1) % 2] + (joints.indexOf(j) === 1 ? 24 : 0) - j;
      const r = rng();
      if (r < 0.1) c.rect(jx + 1, yy + 1, Math.min(next - 1, x + w - jx - 1), 12, odd[r < 0.05 ? 0 : 1]);   // an odd stone
      c.vline(jx, yy, 13, dark);
      c.hline(jx + 1, yy + 1, 9, lite);
      c.vline(jx + 1, yy + 1, 4, lite);
      if (rng() < 0.04) crack(c, jx + 4, yy + 2, 9, dark, rng);
    }
  }
}

/** Tier 2, wood rooms: dark panels below a rail, light boards above with a stencilled gold dot. */
function panelWall(c, x, w, rng, tone = ["v", "V", "u"]) {
  const [d, m, l] = tone;
  c.rect(x, 5, w, FY - 5, m);
  for (let px = x; px < x + w; px += 6) { c.vline(px, 5, 48, d); if (rng() < 0.04) c.vline(px + 2, 20 + Math.floor(rng() * 20), 8, d); }
  for (let px = x + 3; px < x + w; px += 24) { c.px(px + 8, 16, "j"); c.px(px + 8, 36, "j"); c.px(px + 20, 26, "j"); }
  c.rect(x, 53, w, 4, "W"); c.hline(x, 53, w, l); c.hline(x, 57, w, "w");          // rail
  c.rect(x, 57, w, FY - 57, "w");
  for (let px = x + 2; px < x + w; px += 12) { c.rect(px, 61, 9, 24, "W"); c.hline(px, 61, 9, "v"); c.vline(px, 61, 24, "v"); c.hline(px + 1, 84, 8, "w"); }
}

/** Tier 2, brick rooms: a plinth of dressed stone, brick above with a soldier course and a copper trim. */
function grandBrick(c, x, w, base, lite, rng) {
  bricks(c, x, 5, w, 50, "q", base, lite, rng);
  c.rect(x, 26, w, 8, "q");
  for (let px = x; px < x + w; px += 4) { c.rect(px, 26, 3, 8, base); c.px(px, 26, lite); }   // soldier course
  c.hline(x, 25, w, "O"); c.hline(x, 34, w, "o");
  cutStone(c, x, 55, w, FY - 55, "5", "3", "6", rng, ["4", "6"]);
  c.hline(x, 55, w, "7");
}

/** Tier 2, stone rooms: big polished blocks with a carved gold frieze. */
function grandStone(c, x, w, rng) {
  cutStone(c, x, 5, w, FY - 5, "4", "2", "5", rng, ["3", "6"]);
  c.rect(x, 12, w, 9, "3"); c.hline(x, 12, w, "o"); c.hline(x, 20, w, "o");
  for (let px = x; px < x + w; px += 8) { c.line(px, 19, px + 4, 13, "O"); c.line(px + 4, 13, px + 8, 19, "O"); c.px(px + 4, 16, "j"); }   // knotwork
}

/**
 * Tier 3, the king's hall (level 5): dark dressed stone with gold veins, a gold frieze, carved runes that glow
 * faintly blue, and a wainscot in the room's own material, so a tavern still reads as a tavern.
 */
function royalWall(type, c, x, w, rng) {
  const fam = FAMILY[type];
  cutStone(c, x, 5, w, FY - 5, "2", "1", "3", rng, ["3", "q"]);
  c.rect(x, 10, w, 11, "1"); c.hline(x, 10, w, "j"); c.hline(x, 20, w, "o");          // frieze
  for (let px = x; px < x + w; px += 8) { c.line(px, 18, px + 4, 12, "O"); c.line(px + 4, 12, px + 8, 18, "O"); c.px(px + 4, 16, "8"); }
  for (let px = x + 7; px < x + w; px += 24) {                                       // a carved rune plate per stretch of wall
    const k = Math.floor(rng() * 3);
    c.rect(px, 29, 9, 12, "1"); c.hline(px, 41, 9, "3"); c.vline(px + 9, 29, 13, "3");
    c.vline(px + 4, 31, 8, "n");
    if (k === 0) { c.line(px + 4, 31, px + 6, 33, "N"); c.line(px + 4, 34, px + 6, 36, "N"); }        // two branches
    else if (k === 1) { c.line(px + 2, 33, px + 4, 31, "N"); c.line(px + 4, 31, px + 6, 33, "N"); }   // an arrow
    else { c.line(px + 2, 32, px + 6, 36, "N"); c.line(px + 6, 32, px + 2, 36, "N"); }              // a cross
  }
  const top = 58;
  if (fam === "wood") { c.rect(x, top, w, FY - top, "q"); for (let px = x + 2; px < x + w; px += 12) { c.rect(px, top + 4, 9, FY - top - 8, "Q"); c.box(px, top + 4, 9, FY - top - 8, "q"); c.px(px + 4, top + 14, "j"); } }
  else if (fam === "brick") bricks(c, x, top, w, FY - top, "q", BRICK[type][0], BRICK[type][1], rng);
  else if (fam === "stone") cutStone(c, x, top, w, FY - top, "5", "3", "6", rng, ["4", "7"]);
  else { cutStone(c, x, top, w, FY - top, "4", "2", "5", rng); for (let px = x + 3; px < x + w; px += 9) { c.vline(px, top - 6, 6 + Math.floor(rng() * 10), "h"); c.px(px + 1, top - 2, "H"); } }   // ivy over the farm's wall
  c.rect(x, top - 2, w, 3, "o"); c.hline(x, top - 2, w, "j");                       // a gold rail
}

const FAMILY = {
  tavern: "wood", quarters: "wood", warehouse: "wood", engraver: "wood", brewery: "wood",
  smelter: "brick", forge: "brick", jeweler: "brick", vault: "stone", grindstone: "stone", barracks: "stone", farm: "earth",
};
const BRICK = { smelter: ["z", "Z"], forge: ["Q", "z"], jeweler: ["p", "P"] };

function wall(type, c, x, w, T, rng) {
  const fam = FAMILY[type];
  if (T === 3) { royalWall(type, c, x, w, rng); return; }
  if (T === 0) {
    if (fam === "earth") { earth(c, x, 5, w, FY - 5, rng); c.rect(x, 5, w, 6, "w"); return; }
    roughWall(c, x, w, rng);
    return;
  }
  if (T === 1) {
    if (fam === "wood") planks(c, x, 5, w, FY - 5, "w", "W", "v", rng);
    else if (fam === "brick") bricks(c, x, 5, w, FY - 5, "q", BRICK[type][0], BRICK[type][1], rng);
    else if (fam === "stone") cutStone(c, x, 5, w, FY - 5, "3", "2", "4", rng);
    else earth(c, x, 5, w, FY - 5, rng);
    return;
  }
  if (fam === "wood") panelWall(c, x, w, rng, type === "tavern" ? ["q", "Q", "z"] : type === "brewery" ? ["W", "v", "V"] : ["v", "V", "u"]);
  else if (fam === "brick") grandBrick(c, x, w, BRICK[type][0], BRICK[type][1], rng);
  else if (fam === "stone") grandStone(c, x, w, rng);
  else {                                                                             // farm: soil above a stone retaining wall
    earth(c, x, 5, w, FY - 5, rng);
    cutStone(c, x, 58, w, FY - 58, "4", "2", "5", rng);
    c.hline(x, 58, w, "6");
  }
}

/** Damp, cracks: one or two per wall, where the cause would put them. */
function weather(c, x, w, T, rng) {
  if (T === 3) { if (rng() < 0.4) crack(c, x + 8 + Math.floor(rng() * (w - 16)), 40, 8, "1", rng); return; }   // the king's hall is kept, but old
  const n = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const cx = x + 8 + Math.floor(rng() * (w - 16));
    if (rng() < 0.6) crack(c, cx, T === 2 ? 22 : 8 + Math.floor(rng() * 10), 10 + Math.floor(rng() * 14), T === 0 ? "(" : "s", rng);
    else stain(c, cx, T === 0 ? 6 : 9, 5 + Math.floor(rng() * 6), T === 0 ? "(" : "w", rng);
  }
}

// ------------------------------------------------------------------ floors and ceilings

function floor(type, c, x, w, T, rng) {
  const fam = FAMILY[type];
  if (T === 3) {                                     // polished marble with gold seams
    for (let px = x; px < x + w; px += 12) { c.rect(px, FY, 12, H - FY, (px / 12) % 2 ? "7" : "6"); c.vline(px, FY, H - FY, "o"); c.px(px + 4, FY + 2, "C"); }
    c.hline(x, FY, w, "j"); c.hline(x, FY + 1, w, "8");
    return;
  }
  if (T === 0) {                                     // packed earth with pebbles
    c.rect(x, FY, w, H - FY, "w"); c.hline(x, FY, w, "W"); c.hline(x, FY + 1, w, "v");
    for (let i = 0; i < w / 10; i++) c.px(x + Math.floor(rng() * w), FY + 2 + Math.floor(rng() * 3), rng() < 0.5 ? "4" : "V");
    return;
  }
  if (T === 1 && (fam === "wood" || fam === "earth")) {
    c.rect(x, FY, w, H - FY, "W"); c.hline(x, FY, w, "V"); c.hline(x, FY + 1, w, "v");
    for (let px = x + 7; px < x + w; px += 12) { c.vline(px, FY + 1, 5, "w"); if (rng() < 0.2) c.px(px + 3, FY + 3, "w"); }
    if (rng() < 0.5) { const mx = x + 12 * Math.floor(rng() * (w / 12)); c.rect(mx + 8, FY + 2, 10, 3, "w"); }   // a sunken board
    return;
  }
  if (T === 1) {
    c.rect(x, FY, w, H - FY, "3"); c.hline(x, FY, w, "5"); c.hline(x, FY + 1, w, "4");
    for (let px = x + 4; px < x + w; px += 12) c.vline(px, FY + 1, 5, "2");
    if (rng() < 0.6) { const cx = x + 6 + Math.floor(rng() * (w - 12)); c.line(cx, FY + 1, cx + 3, FY + 4, "2"); }   // a cracked flag
    return;
  }
  if (fam === "wood" || fam === "earth") {           // herringbone parquet
    c.rect(x, FY, w, H - FY, "V"); c.hline(x, FY, w, "u");
    for (let px = x; px < x + w; px += 6) { c.line(px, FY + 1, px + 3, FY + 4, "v"); c.line(px + 3, FY + 4, px + 6, FY + 1, "W"); }
    c.hline(x, FY + 5, w, "w");
    return;
  }
  for (let px = x; px < x + w; px += 6) c.rect(px, FY, 6, H - FY, (px / 6) % 2 ? "6" : "4");   // chequered tiles
  c.hline(x, FY, w, "o"); c.hline(x, FY + 1, w, "j");
}

function ceiling(c, x, w, T) {
  if (T === 0) {                                     // a rough beam
    c.rect(x, 3, w, 4, "w"); c.hline(x, 3, w, "W");
    for (let px = x + 10; px < x + w; px += 24) c.px(px, 7, "w");
    return;
  }
  if (T === 1) {
    c.rect(x, 2, w, 4, "W"); c.hline(x, 2, w, "V"); c.hline(x, 6, w, "w");
    for (let px = x + 8; px < x + w; px += 24) { c.rect(px, 6, 4, 3, "W"); c.px(px + 1, 9, "w"); c.px(px + 2, 9, "w"); }
    return;
  }
  if (T === 3) {                                     // carved ribs with gold bosses and little crystals hanging down
    c.rect(x, 2, w, 7, "2"); c.hline(x, 2, w, "4"); c.hline(x, 8, w, "j"); c.hline(x, 9, w, "1");
    for (let px = x + 6; px < x + w; px += 24) { c.rect(px, 3, 5, 5, "O"); c.px(px + 2, 5, "8"); }
    for (let px = x + 18; px < x + w; px += 24) { c.vline(px, 10, 3, "N"); c.px(px, 13, "n"); }
    return;
  }
  c.rect(x, 2, w, 5, "4"); c.hline(x, 2, w, "6"); c.hline(x, 6, w, "o"); c.hline(x, 7, w, "2");
  for (let px = x + 8; px < x + w; px += 24) { c.rect(px, 7, 6, 3, "4"); c.hline(px, 9, 6, "O"); }
}

/** The post between two bays: timber, a wooden pillar or a stone pilaster with a gold capital. */
function divider(c, x, T) {
  if (T === 0) { c.rect(x, 3, 4, FY - 3, "W"); c.vline(x, 3, FY - 3, "v"); c.vline(x + 3, 3, FY - 3, "w"); c.rect(x - 2, 3, 8, 3, "W"); return; }
  if (T === 1) { c.rect(x, 2, 5, FY - 2, "V"); c.vline(x, 2, FY - 2, "u"); c.vline(x + 4, 2, FY - 2, "v"); c.rect(x - 1, FY - 4, 7, 4, "v"); c.rect(x - 1, 7, 7, 3, "v"); return; }
  if (T === 3) {                                     // a dark column with a gold capital, a rune and a crystal
    c.rect(x, 2, 6, FY - 2, "2"); c.vline(x, 2, FY - 2, "4"); c.vline(x + 5, 2, FY - 2, "1");
    c.rect(x - 2, 8, 10, 5, "O"); c.hline(x - 2, 8, 10, "8"); c.rect(x - 2, FY - 6, 10, 6, "o"); c.hline(x - 2, FY - 6, 10, "j");
    c.vline(x + 3, 34, 8, "B"); c.px(x + 3, 33, "N"); c.px(x + 2, 37, "n"); c.px(x + 4, 37, "n");
    return;
  }
  c.rect(x, 2, 6, FY - 2, "5"); c.vline(x, 2, FY - 2, "6"); c.vline(x + 5, 2, FY - 2, "3");
  c.rect(x - 2, 8, 10, 4, "O"); c.hline(x - 2, 8, 10, "j"); c.rect(x - 2, FY - 5, 10, 5, "4"); c.hline(x - 2, FY - 5, 10, "6");
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

/** A candle stub with a drip, for the dug-out rooms. */
function candle(c, x, b) { c.rect(x, b - 4, 3, 5, "c"); c.px(x + 1, b - 5, "y"); c.px(x + 1, b - 6, "Y"); c.px(x + 3, b - 1, "c"); }

/** A torch in a wall bracket. */
function torch(c, x, y) { c.rect(x, y + 4, 2, 7, "v"); c.rect(x - 1, y + 10, 4, 2, "4"); c.rect(x - 1, y + 1, 4, 3, "F"); c.rect(x, y, 2, 2, "y"); c.px(x, y - 1, "Y"); }

/** A brass chandelier with candles. */
function chandelier(c, x, y) {
  c.vline(x, 7, y - 7, "o");
  c.ellipse(x, y + 2, 12, 2, "O"); c.hline(x - 12, y + 2, 25, "j");
  for (const dx of [-10, -5, 0, 5, 10]) { c.rect(x + dx, y - 3, 2, 4, "C"); c.px(x + dx, y - 4, "Y"); c.px(x + dx + 1, y - 5, "y"); }
  c.px(x, y + 5, "j");
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

function table(c, x, b, w, T = 1) {
  if (T === 0) {                                     // a plank on two barrels
    barrelEnd(c, x, b, 5); barrelEnd(c, x + w - 10, b, 5);
    c.rect(x - 1, b - 13, w + 2, 3, "v"); c.hline(x - 1, b - 13, w + 2, "V");
    return;
  }
  c.rect(x, b - 13, w, 3, T === 2 ? "W" : "V");
  c.hline(x, b - 13, w, T === 2 ? "v" : "u");
  c.hline(x, b - 10, w, "W");
  c.rect(x + 3, b - 10, 3, 11, "W"); c.rect(x + w - 6, b - 10, 3, 11, "W");
  c.vline(x + 3, b - 10, 11, "v"); c.vline(x + w - 6, b - 10, 11, "v");
  if (T === 2) { c.rect(x + 2, b - 12, w - 4, 2, "C"); c.hline(x + 2, b - 10, w - 4, "c"); c.px(x + 2, b - 9, "c"); c.px(x + w - 3, b - 9, "c"); }   // tablecloth
}

function stool(c, x, b, T = 1) {
  if (T === 0) { c.rect(x, b - 7, 9, 8, "v"); c.hline(x, b - 7, 9, "V"); c.ring(x + 4, b - 7, 1, "W"); return; }   // a stump
  c.rect(x, b - 7, 9, 2, T === 2 ? "f" : "V"); c.hline(x, b - 7, 9, T === 2 ? "F" : "u");
  c.vline(x + 1, b - 5, 6, "W"); c.vline(x + 7, b - 5, 6, "W"); c.hline(x + 2, b - 2, 5, "W");
}

function bench(c, x, b, w, T = 1) {
  if (T === 0) { c.rect(x, b - 7, w, 8, "v"); c.hline(x, b - 7, w, "V"); c.vline(x + 6, b - 6, 7, "W"); c.vline(x + w - 7, b - 6, 7, "W"); return; }   // a log
  c.rect(x, b - 7, w, 3, "V"); c.hline(x, b - 7, w, "u");
  for (const lx of [x + 2, x + w - 5]) { c.rect(lx, b - 4, 3, 5, "W"); c.vline(lx, b - 4, 5, "v"); }
  if (T === 2) { c.rect(x + 2, b - 9, w - 4, 2, "f"); c.hline(x + 2, b - 9, w - 4, "F"); }   // a cushion
}

function mug(c, x, b) { c.rect(x, b - 4, 4, 5, "u"); c.hline(x, b - 4, 4, "C"); c.px(x + 1, b - 5, "C"); c.vline(x + 4, b - 3, 2, "u"); c.vline(x + 3, b - 3, 4, "V"); }

function shelf(c, x, y, w, T = 1) {
  c.rect(x, y, w, 3, T === 0 ? "v" : "V"); c.hline(x, y, w, T === 0 ? "V" : "u"); c.hline(x, y + 3, w, "w");
  for (const bx of [x + 3, x + w - 6]) { c.rect(bx, y + 3, 3, 2, "W"); c.px(bx + 1, y + 5, "W"); }
  if (T === 2) c.hline(x, y + 1, w, "j");
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

function armorStand(c, x, b) {
  c.vline(x + 7, b - 34, 34, "v"); c.hline(x + 2, b, 11, "W");
  c.rect(x + 1, b - 30, 13, 14, "5"); c.hline(x + 1, b - 30, 13, "6"); c.vline(x + 7, b - 29, 12, "4"); c.hline(x + 1, b - 21, 13, "4");
  c.rect(x + 3, b - 38, 9, 7, "5"); c.hline(x + 3, b - 38, 9, "6"); c.rect(x + 5, b - 35, 5, 2, "2");
  c.rect(x - 1, b - 30, 2, 8, "4"); c.rect(x + 14, b - 30, 2, 8, "4");
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

function mushroomBed(c, x, w, T, n, rng) {
  const caps = ["Z", "z", "V", "H"];
  if (T === 0) { c.ellipse(x + w / 2, FY - 1, w / 2, 5, "w"); c.ellipse(x + w / 2, FY - 2, w / 2 - 2, 3, "W"); }
  else if (T === 1) { c.rect(x, FY - 8, w, 8, "w"); c.hline(x, FY - 8, w, "W"); c.hline(x + 1, FY - 7, w - 2, "v"); }
  else { c.rect(x, FY - 10, w, 10, "4"); c.hline(x, FY - 10, w, "6"); c.rect(x + 2, FY - 9, w - 4, 3, "w"); c.hline(x + 2, FY - 9, w - 4, "W"); for (let px = x + 4; px < x + w - 2; px += 8) c.vline(px, FY - 6, 6, "3"); }
  const top = FY - (T === 0 ? 4 : T === 1 ? 8 : 9);
  for (let k = 0; k < n; k++) mushroom(c, x + 2 + k * Math.floor((w - 4) / n), top, 4 + Math.floor(rng() * 3) * 3, caps[Math.floor(rng() * 4)], k % 2 ? "J" : "C");
}

// a bunk bed long enough for a dwarf lying down: two mattresses, pillows on the left, blankets folded at the foot
function bunk(c, x, b, top, bottom, T) {
  const post = T === 0 ? "v" : T === 2 ? "q" : "W", rail = T === 0 ? "v" : T === 2 ? "Q" : "V", sheet = T === 0 ? "U" : "C";
  c.rect(x, b - 50, 3, 51, post); c.rect(x + 44, b - 50, 3, 51, post);
  c.vline(x, b - 50, 51, T === 2 ? "z" : "v"); c.vline(x + 44, b - 50, 51, T === 2 ? "z" : "v");
  c.rect(x - 1, b - 51, 5, 2, rail); c.rect(x + 43, b - 51, 5, 2, rail);
  if (T === 2) { c.circ(x + 1, b - 53, 2, "O"); c.circ(x + 45, b - 53, 2, "O"); }
  for (let y = b - 30; y < b - 6; y += 6) c.hline(x + 40, y, 4, rail);
  for (const [y, col] of [[b - 5, bottom], [b - 37, top]]) {
    c.rect(x + 3, y, 41, 3, rail); c.hline(x + 3, y, 41, T === 0 ? "V" : "u"); c.hline(x + 3, y + 3, 41, "w");
    c.rect(x + 3, y - 2, 41, 2, sheet); c.hline(x + 3, y - 1, 41, T === 0 ? "u" : "c");
    if (T === 0) { for (let sx = x + 5; sx < x + 42; sx += 5) c.px(sx, y - 2, "j"); }   // straw poking out
    c.rect(x + 4, y - 6, 9, 4, "C"); c.hline(x + 4, y - 2, 9, "4"); c.px(x + 4, y - 6, "c"); c.px(x + 12, y - 6, "c");
    c.rect(x + 32, y - 5, 11, 3, col); c.hline(x + 32, y - 5, 11, "C"); c.vline(x + 37, y - 4, 2, "C");
  }
  if (T === 2) { c.rect(x + 3, b - 49, 41, 3, "p"); for (let sx = x + 3; sx < x + 44; sx += 4) c.px(sx, b - 46, "P"); }   // a little canopy
}

function wardrobe(c, x, b, T) {
  const w = 28, h = 46, body = T === 2 ? "q" : "v", door = T === 2 ? "Q" : "V";
  c.rect(x, b - h + 1, w, h, body); c.rect(x - 1, b - h, w + 2, 3, door); c.hline(x - 1, b - h, w + 2, T === 2 ? "j" : "u");
  c.rect(x + 2, b - h + 4, 11, h - 9, door); c.rect(x + 15, b - h + 4, 11, h - 9, door);
  c.box(x + 2, b - h + 4, 11, h - 9, "W"); c.box(x + 15, b - h + 4, 11, h - 9, "W");
  c.px(x + 12, b - 22, "j"); c.px(x + 15, b - 22, "j");
  c.rect(x + 2, b - 4, 3, 5, "W"); c.rect(x + w - 5, b - 4, 3, 5, "W");
  c.rect(x + 13, b - 14, 2, 4, "B"); c.px(x + 13, b - 10, "n");           // a shirt sleeve caught in the door
}

function chest(c, x, b) {
  c.rect(x, b - 11, 18, 12, "v"); c.rect(x, b - 11, 18, 5, "V"); c.hline(x, b - 11, 18, "u");
  c.hline(x, b - 6, 18, "4"); c.vline(x + 3, b - 11, 12, "4"); c.vline(x + 14, b - 11, 12, "4");
  c.rect(x + 7, b - 7, 4, 4, "j"); c.px(x + 8, b - 5, "o");
}

function painting(c, x, y, kind = 0) {
  c.rect(x, y, 18, 14, "O"); c.hline(x, y, 18, "j"); c.rect(x + 2, y + 2, 14, 10, "N");
  if (kind === 1) {                                  // a portrait of a stern ancestor
    c.rect(x + 2, y + 2, 14, 10, "Q"); c.circ(x + 9, y + 6, 3, "A"); c.rect(x + 6, y + 8, 7, 4, "R"); c.px(x + 8, y + 6, "e"); c.px(x + 10, y + 6, "e");
    return;
  }
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

function chimney(c, x, y0, y1, w, T) {
  const body = T === 2 ? "4" : "Q", line = T === 2 ? "3" : "q";
  c.rect(x, y0, w, y1 - y0, body);
  for (let y = y0, r = 0; y < y1; y += 5, r++) { c.hline(x, y, w, line); c.vline(x + (r % 2 ? 4 : 8), y, 5, line); }
  c.vline(x, y0, y1 - y0, T === 2 ? "5" : "z");
  c.vline(x + w - 1, y0, y1 - y0, line);
  c.rect(x + 1, y0, w - 2, 6, "s");                  // soot where the smoke goes into the rock
  if (T === 2) { c.hline(x - 1, y1 - 3, w + 2, "o"); c.hline(x - 1, y1 - 2, w + 2, "O"); }
}

// ------------------------------------------------------------------ workshop machines (shared by the room and its bays)

/** Furnace around the fire rect [fx, fy, fw, fh]: clay (T0), brick (T1), iron-banded stone with a copper hood (T2). */
function furnace(c, fx, fy, fw, fh, chimX, T, v, rng) {
  const x0 = fx - 13, x1 = fx + fw + 13;
  const body = T === 0 ? "z" : T === 1 ? "Q" : "4", lite = T === 0 ? "Z" : T === 1 ? "z" : "6";
  chimney(c, chimX - 6, 5, v ? 24 : 30, 14, T);
  if (v === 0) {                                     // a stepped dome
    c.rect(x0, 34, x1 - x0, FY - 34, body); c.rect(x0 + 4, 29, x1 - x0 - 8, 5, body); c.rect(x0 + 8, 25, x1 - x0 - 16, 4, body);
    c.hline(x0 + 4, 29, x1 - x0 - 8, lite); c.hline(x0 + 8, 25, x1 - x0 - 16, lite);
  } else {                                           // a tall stack, straight sides
    c.rect(x0 + 2, 24, x1 - x0 - 4, FY - 24, body); c.hline(x0 + 2, 24, x1 - x0 - 4, lite);
  }
  if (T === 0) { for (let y = 38; y < FY; y += 6) c.hline(x0 + 2, y + (y % 12 ? 1 : 0), x1 - x0 - 4, "Q"); c.px(x0 + 5, 46, "Q"); crack(c, x1 - 8, 36, 10, "q", rng); }
  else if (T === 1) bricks(c, x0 + 1, 35, x1 - x0 - 2, FY - 36, "s", "Q", "z", rng, ["z", "q"]);
  else { cutStone(c, x0 + 1, 35, x1 - x0 - 2, FY - 36, "4", "2", "5", rng); for (const y of [40, 60, 80]) { c.hline(x0, y, x1 - x0, "2"); c.hline(x0, y + 1, x1 - x0, "5"); } c.poly([x0 - 2, 34, x1 + 1, 34, x1 - 4, 24, x0 + 3, 24], "o"); c.hline(x0 - 2, 34, x1 - x0 + 3, "O"); }
  c.vline(x0, 34, FY - 34, lite); c.vline(x1 - 1, 34, FY - 34, "q");
  c.rect(fx - 1, fy - 3, fw + 2, fh + 4, "s"); c.rect(fx + 1, fy - 5, fw - 2, 2, "s");      // mouth
  c.rect(fx - 3, fy + fh + 1, fw + 6, 3, "5"); c.hline(fx - 3, fy + fh + 1, fw + 6, "6");
  c.px(fx - 2, fy + fh + 4, "2"); c.px(fx + fw + 1, fy + fh + 5, "2");                     // spilled slag
}

function hearth(c, fx, fy, fw, chimX, T, rng) {
  chimney(c, chimX - 6, 5, 38, 14, T);
  const hood = T === 2 ? ["o", "O"] : ["4", "5"];
  for (let i = 0; i < 11; i++) c.hline(fx - 2 - i, 38 + i, fw + 4 + i * 2, i % 2 ? hood[0] : hood[1]);
  c.hline(fx - 13, 49, fw + 26, T === 2 ? "j" : "6");
  const stone = T === 0 ? ")" : "4";
  c.rect(fx - 8, fy + 6, fw + 16, FY - fy - 6, stone); c.hline(fx - 8, fy + 6, fw + 16, T === 0 ? "]" : "6");
  if (T === 0) for (let x = fx - 8; x < fx + fw + 8; x += 7) { c.rect(x + 1, fy + 9, 5, 5, "["); c.rect(x + 3, fy + 16, 5, 4, "["); }
  else for (let x = fx - 5; x < fx + fw + 8; x += 8) c.vline(x, fy + 8, FY - fy - 8, "3");
  c.hline(fx - 8, fy + 14, fw + 16, T === 0 ? "(" : "3");
  c.rect(fx, fy, fw, 6, "s");
  if (rng() < 0.7) crack(c, fx + fw + 4, fy + 8, 8, T === 0 ? "(" : "2", rng);
}

function anvil(c, ax, ay, T) {
  c.rect(ax - 6, ay + 2, 13, FY - ay - 2, "v"); c.hline(ax - 6, ay + 2, 13, "u"); c.vline(ax - 3, ay + 4, FY - ay - 6, "W"); c.vline(ax + 3, ay + 5, FY - ay - 8, "W");
  c.ring(ax, ay + 2, 1, "W");                                                              // tree rings on the stump
  c.rect(ax - 3, ay - 2, 7, 4, "2");
  c.rect(ax - 10, ay - 7, 20, 5, "3"); c.hline(ax - 10, ay - 7, 20, T === 2 ? "j" : "6"); c.hline(ax - 9, ay - 6, 18, "5");
  c.rect(ax - 14, ay - 7, 4, 2, "3"); c.px(ax - 15, ay - 7, "3");
  c.px(ax + 6, ay - 8, "2");                                                               // a dent
}

function wheel(c, wx, wy, r, T) {
  c.rect(wx - r - 5, FY - 4, 2 * r + 10, 4, T === 0 ? "v" : "V"); c.hline(wx - r - 5, FY - 4, 2 * r + 10, T === 0 ? "V" : "u");
  const leg = T === 2 ? "4" : "W";
  c.rect(wx - r - 4, wy - 3, 4, FY - wy - 1, leg); c.rect(wx + r, wy - 3, 4, FY - wy - 1, leg);
  c.circ(wx, wy, r, "4"); c.circ(wx, wy, r - 2, "5"); c.ring(wx, wy, r - 6, "4"); c.ring(wx, wy, r, "3"); c.circ(wx, wy, 3, T === 2 ? "O" : "W");
  c.hline(wx - r - 4, wy, 2 * r + 8, T === 2 ? "o" : "v");
  c.px(wx - r + 3, wy - 4, "6"); c.px(wx - r + 4, wy - 5, "6");                             // a worn spot
}

/** A work bench at belt height, 20 px tall; top colour per tier. */
function workbench(c, x, w, T, top = "V") {
  const t = T === 0 ? "v" : T === 2 ? "q" : top;
  c.rect(x, 70, w, 4, t); c.hline(x, 70, w, T === 2 ? "j" : T === 0 ? "V" : "u"); c.hline(x, 74, w, "w");
  if (T === 0) { c.rect(x + 3, 74, 4, 16, "v"); c.rect(x + w - 7, 74, 4, 16, "v"); }      // on rough trestles
  else { c.rect(x + 3, 74, 4, 16, "W"); c.rect(x + w - 7, 74, 4, 16, "W"); c.hline(x + 7, 84, w - 14, "W"); }
  if (T === 2) { c.rect(x + 8, 76, w - 16, 7, "Q"); c.box(x + 8, 76, w - 16, 7, "q"); c.px(x + w / 2, 79, "j"); }   // a drawer
}

function kettle(c, kx, r, T) {
  const body = T === 0 ? "2" : "F", lite = T === 0 ? "4" : "Y", dark = T === 0 ? "1" : "f";
  if (T === 0) {                                     // a black cauldron on a little fire
    c.ellipse(kx, FY - 14, r, r - 4, body); c.hline(kx - r, FY - 24 + (12 - r), 2 * r + 1, lite); c.ellipse(kx, FY - 22, r - 2, 2, "h");
    c.rect(kx - 6, FY - 4, 12, 4, "W"); c.px(kx - 2, FY - 5, "F"); c.px(kx + 2, FY - 6, "y"); c.px(kx, FY - 5, "F");
    c.line(kx - r, FY - 6, kx - r + 3, FY - 1, "2"); c.line(kx + r, FY - 6, kx + r - 3, FY - 1, "2");
    return;
  }
  const h = Math.round(r * 1.9);
  c.rect(kx - r, FY - h, 2 * r, h, body); c.rect(kx - r - 2, FY - h + 6, 2 * r + 4, h - 12, body);
  c.vline(kx - r + 4, FY - h + 1, h - 6, lite); c.vline(kx + r - 5, FY - h + 1, h - 4, dark);
  for (const ry of [FY - h + 6, FY - 10]) { c.hline(kx - r - 2, ry, 2 * r + 4, dark); for (let x = kx - r; x < kx + r + 2; x += 6) c.px(x, ry - 1, "y"); }
  c.rect(kx - r + 5, FY - h - 4, 2 * r - 10, 4, dark); c.rect(kx - 3, FY - h - 12, 6, 8, dark);
  c.rect(kx - 3, 9, 6, FY - h - 21, dark); c.vline(kx - 2, 9, FY - h - 21, body);   // pipe
  c.rect(kx - 9, FY - 5, 18, 5, "2"); c.hline(kx - 9, FY - 5, 18, "4");
  if (T === 2) { for (let i = 0; i < 4; i++) c.ring(kx + r + 6, FY - h + 8 + i * 5, 3, "o"); c.vline(kx + r + 6, FY - h + 4, 22, "O"); }   // the cooling coil
  c.px(kx + r - 2, FY - 12, "f"); c.px(kx + r - 3, FY - 11, "f");                          // a dent with old ale
}

// ------------------------------------------------------------------ rooms

/** Hanging crystal lamp for the king's hall. */
function crystalLamp(c, x, y) {
  c.vline(x, 10, y - 10, "o");
  c.rect(x - 3, y, 7, 2, "O"); c.hline(x - 3, y, 7, "j");
  c.rect(x - 2, y + 2, 5, 6, "n"); c.rect(x - 1, y + 3, 3, 5, "N"); c.px(x, y + 4, "C"); c.px(x, y + 8, "n"); c.px(x, y + 9, "N");
}

/** Extra splendour of the king's hall: banners and crystal lamps between the furniture's own lights. */
function royalTouches(c, w, v, rng) {
  for (let x = 30 + (v ? 12 : 0); x < w - 10; x += 72) crystalLamp(c, x, 24);
  if (w > 100) { banner(c, v ? w - 28 : 10, 24, "b", "j"); }
}

function room(type, draw) {
  const w = ROOMS[type].w * CELL;
  for (let T = 0; T < 4; T++) for (let v = 0; v < ROOM_VARIANTS; v++) {
    sprite("room_" + type + "_" + T + "_" + v, { w, h: H }, (c) => {
      const rng = c.rng(1 + v * 101 + T * 7 + type.length * 13);
      wall(type, c, 0, w, T, rng);
      weather(c, 0, w, T, rng);
      ceiling(c, 0, w, T);
      floor(type, c, 0, w, T, rng);
      // furniture fills all but the last cell; that one stays free for the back door (drawn by the game)
      webShift = { from: w - CELL - 12, by: CELL };
      if (T === 3) royalTouches(c, w - CELL, v, rng);
      draw(c, w - CELL, ROOMS[type], Math.min(T, 2), v, rng);   // the king's hall keeps the grand furniture
      webShift = { from: Infinity, by: 0 };
      doorStrip(c, w - CELL, T);
    }, glow("yY0", { r: 8, strength: 0.3 }));
  }
}

/** The strip by the back door: a worn path on the floor and a hook by the frame. */
function doorStrip(c, x, T) {
  const mat = T === 3 ? "b" : T === 2 ? "f" : T === 1 ? "v" : "W";
  c.rect(x + 4, FY, 16, 2, mat); c.hline(x + 4, FY, 16, T === 3 ? "B" : T === 2 ? "F" : "V");
  if (T === 3) { c.hline(x + 4, FY + 2, 16, "j"); }
  c.rect(x + 1, 52, 2, 2, T === 3 ? "O" : "4"); c.px(x + 2, 54, T === 3 ? "O" : "4");   // a hook
  if (T > 0) { c.rect(x, 54, 4, 7, T === 3 ? "b" : T === 2 ? "f" : "R"); c.hline(x, 54, 4, T === 3 ? "j" : T === 2 ? "F" : "t"); }   // a cloak on it
}

function bay(type, draw) {
  const w = BAYS[type].w * CELL;
  for (let T = 0; T < 4; T++) for (let v = 0; v < ROOM_VARIANTS; v++) {
    sprite("bay_" + type + "_" + T + "_" + v, { w, h: H }, (c) => {
      const rng = c.rng(3 + v * 211 + T * 17 + type.length * 5);
      wall(type, c, 0, w, T, rng);
      if (rng() < 0.7) weather(c, 6, w - 6, T, rng);
      ceiling(c, 0, w, T);
      floor(type, c, 0, w, T, rng);
      if (T === 3) crystalLamp(c, Math.floor(w / 2) + (v ? 8 : -8), 24);
      draw(c, w, BAYS[type], Math.min(T, 2), v, rng);
      divider(c, 0, T);
    }, glow("yY0", { r: 8, strength: 0.3 }));
  }
}

/** Light for a room by tier: candles and torches, lanterns, or a chandelier. */
function lights(c, T, spots, v) {
  for (const [x, y] of spots) {
    if (T === 0) torch(c, x + 2, y + 6);
    else if (T === 1) lantern(c, x, y);
    else if (v === 0) lantern(c, x, y);
    else chandelier(c, x + 3, y + 6);
  }
}

room("tavern", (c, w, R, T, v, rng) => {
  // wainscot and bar counter
  if (T === 1) { c.rect(4, 62, w - 8, 3, "V"); c.hline(4, 62, w - 8, "u"); c.hline(4, 65, w - 8, "w"); }
  if (T === 0) {                                     // a plank on barrels, a keg on a trestle
    barrel(c, 6, B, 20); barrel(c, 42, B, 20); c.rect(4, 66, 54, 4, "v"); c.hline(4, 66, 54, "V");
    barrelEnd(c, 22, B, 7); c.vline(28, 60, 6, "6");
    shelf(c, 6, 40, 34, 0); for (let i = 0; i < 4; i++) mug(c, 9 + i * 7, 39);
  } else {
    c.rect(6, 70, 50, 20, T === 2 ? "q" : "v"); c.rect(4, 66, 54, 4, T === 2 ? "W" : "V"); c.hline(4, 66, 54, T === 2 ? "j" : "u"); c.hline(4, 69, 54, "w");
    for (let x = 8; x < 56; x += 12) { c.rect(x, 72, 9, 15, T === 2 ? "Q" : "W"); c.box(x, 72, 9, 15, T === 2 ? "q" : "w"); }
    if (T === 2) { c.hline(4, 86, 54, "O"); c.hline(4, 87, 54, "o"); }               // brass foot rail
    for (const tx of [20, 34]) { c.vline(tx, 58, 8, T === 2 ? "j" : "6"); c.rect(tx - 1, 57, 3, 2, T === 2 ? "8" : "7"); c.px(tx + 1, 61, "6"); c.px(tx + 2, 62, "6"); }
    mug(c, 44, 65); mug(c, 10, 65);
    shelf(c, 6, 40, 46, T); for (let i = 0; i < 7; i++) mug(c, 9 + i * 6, 39);
    barrelEnd(c, 8, 30); barrelEnd(c, 26, 30); c.rect(42, 22, 6, 9, "h"); c.rect(43, 20, 4, 2, "G"); c.px(43, 23, "J");
    if (T === 2) { barrelEnd(c, 8, 16); barrelEnd(c, 26, 16); c.rect(42, 10, 6, 9, "p"); c.rect(43, 8, 4, 2, "P"); }
  }
  // tables and stools at the seats
  table(c, 72, B, 24, T); mug(c, 76, B - 13); mug(c, 88, B - 13);
  table(c, 116, B, 22, T); mug(c, 124, B - 13);
  for (const sx of [62, 96, 110, 136]) stool(c, sx, B, T);
  if (T > 0) rug(c, 62, 84, T === 2 ? "f" : "p", T === 2 ? "j" : "P");
  if (T > 0) painting(c, 88, 24, v); if (T === 2) { painting(c, 108, 20, 1 - v); banner(c, 64, 10, "f", "j"); }
  // fireplace: a ring of stones, a stone hearth, or a carved mantel
  const [fx, fy, fw, fh] = R.fire;
  if (T === 0) {
    for (let x = fx - 6; x < fx + fw + 6; x += 6) { c.rect(x, FY - 6, 5, 6, "]"); c.hline(x, FY - 6, 5, "}"); }
    c.rect(fx, fy, fw, FY - fy - 6, "s"); c.rect(fx - 4, fy - 4, fw + 8, 4, ")");
    chimney(c, fx + 4, 5, fy - 4, 12, 0);
  } else {
    const st = T === 2 ? ["5", "6", "4"] : ["4", "5", "3"];
    c.rect(fx - 8, fy - 12, fw + 16, FY - fy + 12, st[0]); c.rect(fx - 10, fy - 15, fw + 20, 4, st[1]); c.hline(fx - 10, fy - 15, fw + 20, T === 2 ? "j" : "6");
    for (let y = fy - 8, r = 0; y < FY; y += 6, r++) { c.hline(fx - 8, y, fw + 16, st[2]); c.vline(fx - 8 + (r % 2 ? 6 : 12), y, 6, st[2]); c.vline(fx + fw + (r % 2 ? 2 : -4), y, 6, st[2]); }
    c.rect(fx, fy, fw, FY - fy, "s");
    c.rect(fx + 1, FY - 4, fw - 2, 3, "W"); c.hline(fx + 1, FY - 4, fw - 2, "v");
    chimney(c, fx + 4, 5, fy - 15, 12, T);
    c.px(fx - 6, fy - 17, "j"); c.rect(fx + fw + 2, fy - 20, 4, 5, "u");
    if (T === 2) { shield(c, fx + 3, fy - 32, "B"); }
    crack(c, fx - 5, fy - 6, 6, st[2], rng);
  }
  cat(c, fx - 30, B);
  if (v === 0) cobweb(c, 6, 8); else cobweb(c, 58, 41, false, 6);   // in the corner or under the shelf
  lights(c, T, [[92, 12], [41, 10]], v);
  if (T === 0) { candle(c, 84, B - 13); candle(c, 126, B - 13); }
});

room("quarters", (c, w, R, T, v, rng) => {
  const cols = v ? [["h", "B"], ["P", "z"]] : [["P", "G"], ["n", "h"]];
  for (let i = 0; i < 2; i++) bunk(c, 4 + i * 52, B, cols[i][0], cols[i][1], T);
  if (T === 0) { sack(c, 110, B, "u"); sack(c, 122, B); crate(c, 108, B - 12, 12); candle(c, 132, B); }
  else { wardrobe(c, 108, B, T); chest(c, 88, B); }
  lights(c, T, [[104, 12]], v);
  if (T > 0) painting(c, 113, 22, v);
  if (T > 0) rug(c, 98, 36, T === 2 ? "p" : "B", T === 2 ? "j" : "n");
  if (T === 2) { c.rect(90, 66, 12, 12, "q"); c.hline(90, 66, 12, "j"); candle(c, 94, 65); }   // nightstand
  cobweb(c, v ? 51 : w - 5, v ? 40 : 7, !v, v ? 5 : 9);
  c.px(6, B, "u"); c.px(9, B - 1, "u");               // a lost sock, nearly
});

room("warehouse", (c, w, R, T, v, rng) => {
  if (T === 0) {
    for (let x = 6; x < w - 20; x += 16) { sack(c, x, B, x % 3 ? "c" : "u"); if (x % 2) sack(c, x + 5, B - 9, "u"); }
    shelf(c, 5, 40, 60, 0); crate(c, 8, 39, 11); crate(c, 26, 39, 11); sack(c, 44, 39);
    barrel(c, w - 30, B, 18);
  } else {
    const ys = T === 2 ? [20, 40, 60] : [28, 54];
    for (const y of ys) shelf(c, 5, y, w - 10, T);
    ys.forEach((y, k) => { for (let x = 8 + k * 3; x < w - 18; x += 14) ((x + k) % 3 ? sack(c, x, y - 1, k % 2 ? "u" : "c") : crate(c, x, y - 1, 11, k % 2 ? "u" : "V")); });
    if (T === 1) for (let x = 6; x < w - 30; x += 18) { crate(c, x, B, 15); if (x % 4) sack(c, x + 15, B); }
    else { for (let x = 6; x < w - 40; x += 13) { c.rect(x, 66, 11, 23, "v"); for (let y = 68; y < 88; y += 7) { c.rect(x + 1, y, 9, 5, "V"); c.px(x + 5, y + 2, "j"); } } c.vline(w - 40, 12, 78, "W"); for (let y = 16; y < 88; y += 8) c.hline(w - 44, y, 8, "V"); }   // drawers and a ladder
    barrel(c, w - 34, B, 20); barrel(c, w - 20, B, 20);
    if (T === 1) crate(c, 10, B - 15, 12, "u");
  }
  lights(c, T, [[69, 10]], v);
  cobweb(c, v ? 6 : w - 6, v ? 8 : 30, !!0 + (v ? false : true), 7);
  c.px(w - 46, B, "c"); c.px(w - 44, B, "c");          // spilled grain
});

room("vault", (c, w, R, T, v, rng) => {
  const cx = Math.floor(w / 2), cy = 50;
  if (T === 0) {                                     // a strongbox behind a bolted plank door
    c.rect(cx - 18, 26, 36, 64, "v"); for (let x = cx - 18; x < cx + 18; x += 6) c.vline(x, 26, 64, "W");
    for (const y of [34, 60, 82]) { c.rect(cx - 18, y, 36, 3, "3"); c.hline(cx - 18, y, 36, "5"); }
    c.rect(cx + 8, 56, 5, 8, "2"); c.px(cx + 10, 59, "j");
    coins(c, 6, B, 4); chest(c, w - 24, B);
  } else {
    const r = T === 2 ? 27 : 23;
    c.circ(cx, cy, r, "2"); c.circ(cx, cy, r - 2, T === 2 ? "O" : "5"); c.circ(cx, cy, r - 5, "4"); c.ring(cx, cy, r - 9, "3"); c.ring(cx, cy, r - 3, T === 2 ? "j" : "6");
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.circ(Math.round(cx + Math.cos(a) * (r - 6)), Math.round(cy + Math.sin(a) * (r - 6)), 1, T === 2 ? "8" : "7"); }
    c.rect(cx - 9, cy - 1, 19, 3, "j"); c.rect(cx - 1, cy - 9, 3, 19, "j"); c.circ(cx, cy, 3, "O"); c.px(cx - 1, cy - 1, "8");
    c.hline(cx - 9, cy - 1, 19, "8");
    if (T === 2) { for (const gx of [cx - 30, cx + 24]) { c.circ(gx + 3, 30, 5, "4"); c.ring(gx + 3, 30, 5, "2"); for (let k = 0; k < 6; k++) c.px(gx + 3 + Math.round(Math.cos(k) * 5), 30 + Math.round(Math.sin(k) * 5), "6"); } }   // gears
    coins(c, 7, B, T === 2 ? 15 : 9); coins(c, w - 32, B, T === 2 ? 12 : 6);
    chest(c, w - 24, B - (T === 2 ? 8 : 4));
    if (T === 2) { c.rect(4, 70, 14, 20, "4"); c.hline(4, 70, 14, "6"); c.px(8, 66, "J"); c.px(11, 67, "P"); c.px(9, 68, "N"); c.rect(7, 67, 8, 3, "b"); }   // a gem on a plinth
  }
  lights(c, T, [[45, 10]], v);
  cobweb(c, v ? 6 : w - 6, 8, !!(1 - v), 7);
});

room("smelter", (c, w, R, T, v, rng) => {
  const [fx, fy, fw, fh] = R.fire;
  furnace(c, fx, fy, fw, fh, R.chimney[0], T, v, rng);
  // bellows
  const [bx, by] = R.bellows;
  c.poly([bx, by + 2, bx + 14, by, bx + 14, by + 9, bx, by + 7], T === 2 ? "Q" : "v"); c.hline(bx + 1, by + 4, 13, "V"); c.hline(bx + 1, by + 6, 13, "W");
  c.rect(bx + 14, by - 3, 3, 6, "W"); c.rect(bx - 5, by + 3, 5, 3, "4");
  if (T === 2) c.px(bx + 7, by + 2, "j");
  // crucible, ore heap, coal sack, bars on the shelf
  c.rect(90, FY - 8, 10, 8, "2"); c.hline(90, FY - 8, 10, "F"); c.hline(91, FY - 7, 8, "y"); c.vline(89, FY - 7, 6, "2"); c.vline(100, FY - 7, 6, "2");
  for (let i = 0; i < 26; i++) { const hgt = Math.round(Math.sin((i / 26) * Math.PI) * 9); c.vline(104 + i, FY - hgt, hgt, i % 3 ? "4" : "5"); }
  c.px(109, FY - 5, "F"); c.px(115, FY - 7, "n"); c.px(121, FY - 4, "F"); c.px(112, FY - 3, "j"); c.px(118, FY - 8, "5");
  sack(c, 70, B, "2");
  shelf(c, 88, 34, 46, T); bars(c, 92, 33, T === 0 ? 2 : T === 1 ? 5 : 8); c.rect(122, 26, 7, 7, "4"); c.px(124, 28, "F");
  if (T === 2) { c.rect(88, 52, 46, 2, "o"); for (const x of [96, 112]) { c.vline(x, 54, 6, "o"); c.rect(x - 2, 60, 5, 4, "2"); } }   // a rack of tongs
  lights(c, T, [[118, 12]], v);
  cobweb(c, w - 6, 8, true, v ? 6 : 8);
});

bay("smelter", (c, w, A, T, v, rng) => {
  const [fx, fy, fw, fh] = A.fire;
  furnace(c, fx, fy, fw, fh, A.chimney[0], T, v, rng);
  if (v) sack(c, 58, B, "2"); else { c.rect(48, FY - 8, 10, 8, "2"); c.hline(48, FY - 8, 10, "F"); }
});

room("forge", (c, w, R, T, v, rng) => {
  const [fx, fy, fw] = R.fire;
  hearth(c, fx, fy, fw, R.chimney[0], T, rng);
  const [ax, ay] = R.anvil;
  anvil(c, ax, ay, T);
  barrel(c, R.quench[0] - 7, B, 18, "B"); c.hline(R.quench[0] - 4, B - 16, 7, "n");
  if (T === 0) { c.rect(86, 20, 3, 18, "v"); c.rect(84, 20, 7, 4, "4"); c.rect(98, 24, 2, 12, "v"); c.rect(96, 22, 6, 3, "5"); }   // two tools on nails
  else {
    c.rect(84, 18, 52, 3, "V"); c.hline(84, 18, 52, T === 2 ? "j" : "u");
    for (let i = 0; i < 6; i++) { const tx = 87 + i * 8; c.vline(tx + 1, 21, 15, "v"); if (i % 2) c.rect(tx - 1, 21, 5, 4, "5"); else { c.vline(tx, 21, 15, "4"); c.px(tx + 2, 35, "4"); } }
    shield(c, 112, 44, v ? "B" : "f");
  }
  if (T === 2) { axeRack(c, 84, 50, 2); c.rect(126, 60, 8, 30, "4"); c.hline(126, 60, 8, "6"); }   // finished axes, a sharpening post
  lights(c, T, [[126, 12]], v);
  if (v) cobweb(c, w - 6, 8, true, 7); else cobweb(c, 6, 8, false, 6);
});

bay("forge", (c, w, A, T, v, rng) => {
  const [fx, fy, fw] = A.fire;
  hearth(c, fx, fy, fw, A.chimney[0], T, rng);
  anvil(c, A.anvil[0], A.anvil[1], T);
  if (v) barrel(c, 50, B, 12, "B");
});

room("grindstone", (c, w, R, T, v, rng) => {
  const [wx, wy] = R.wheel;
  wheel(c, wx, wy, 15, T);
  barrel(c, wx + 36, B, 13, "B");
  c.rect(6, 16, 34, 3, T === 2 ? "W" : "V"); c.hline(6, 16, 34, T === 2 ? "j" : "u");
  for (let i = 0; i < 3; i++) { c.vline(11 + i * 11, 19, 14, "v"); c.rect(9 + i * 11, 20, 6, 6, "6"); c.vline(9 + i * 11, 20, 6, "7"); }
  if (T === 2) { c.rect(56, 40, 30, 3, "V"); for (let i = 0; i < 4; i++) c.line(60 + i * 7, 43, 58 + i * 7, 58, "6"); }   // a rack of sharpened blades
  lights(c, T, [[45, 10]], v);
  cobweb(c, v ? 6 : w - 6, 8, !v, 8);
  c.px(wx - 8, FY - 6, "6"); c.px(wx + 10, FY - 5, "6");   // grit
});

bay("grindstone", (c, w, A, T, v, rng) => {
  const [wx, wy] = A.wheel;
  wheel(c, wx, wy, v ? 13 : 12, T);
  if (v) { c.rect(32, FY - 10, 8, 10, "5"); c.hline(32, FY - 10, 8, "B"); }
});

room("engraver", (c, w, R, T, v, rng) => {
  workbench(c, 6, 44, T);
  c.rect(12, 62, 9, 8, "4"); c.rect(13, 59, 7, 3, "5"); c.hline(10, 66, 13, "3");      // vise
  c.rect(26, 65, 12, 5, "7"); c.hline(27, 67, 9, "5"); c.px(30, 66, "6");              // plate
  if (T > 0) {
    c.rect(6, 18, 44, 30, "v"); c.box(6, 18, 44, 30, "W"); c.box(7, 19, 42, 28, T === 2 ? "j" : "V");   // pegboard
    for (let i = 0; i < 8; i++) { c.vline(11 + i * 5, 23, 11, i % 2 ? "6" : "v"); c.px(11 + i * 5, 22, "4"); }
    c.rect(36, 38, 9, 6, "j"); c.px(38, 40, "8");
  } else { c.rect(10, 30, 3, 14, "v"); c.rect(20, 28, 2, 16, "6"); }
  if (T === 2) { painting(c, 60, 30, 0); c.rect(60, 50, 18, 12, "O"); c.rect(62, 52, 14, 8, "7"); c.hline(63, 55, 12, "5"); }   // framed plates
  c.rect(30, 56, 3, 9, "4"); c.rect(27, 53, 9, 3, "y"); c.hline(27, 53, 9, "Y");      // little lamp
  lights(c, T, [[73, 12]], v);
  plant(c, 80, B);
  cobweb(c, v ? 50 : 6, v ? 18 : 8, !!v, 6);
  c.px(20, FY - 1, "7"); c.px(23, FY - 2, "6");      // metal shavings
});

bay("engraver", (c, w, A, T, v, rng) => {
  workbench(c, 4, 32, T);
  c.rect(10 + v * 8, 63, 9, 7, v ? "7" : "4"); c.hline(10 + v * 8, 63, 9, "6");
  c.rect(22, 56, 3, 9, "4"); c.rect(19, 53, 9, 3, "y");
});

room("jeweler", (c, w, R, T, v, rng) => {
  workbench(c, 6, 50, T, "p");
  c.vline(36, 48, 22, "4"); c.rect(30, 46, 13, 4, "5"); c.rect(32, 50, 9, 2, "Y");   // lens lamp
  c.ellipse(36, 60, 6, 4, "N"); c.ring(36, 60, 6, "O"); c.px(34, 58, "C");
  c.rect(16, 66, 6, 4, "j"); c.px(18, 65, "H"); c.px(24, 68, "P"); c.px(26, 68, "N");
  // display cabinet with glowing gems
  const frame = T === 0 ? "v" : T === 2 ? "O" : "W";
  c.rect(72, 28, 40, 62, frame); c.hline(72, 28, 40, T === 2 ? "8" : "V");
  c.rect(75, 31, 34, 25, T === 0 ? "w" : "b"); c.rect(75, 59, 34, 25, T === 0 ? "w" : "b");
  c.hline(75, 46, 34, frame); c.hline(75, 74, 34, frame);
  const gems = ["J", "P", "j", "N", "9", "H"], n = T === 0 ? 3 : T === 1 ? 8 : 8;
  for (let i = 0; i < n; i++) { const g = gems[i % 6], g2 = gems[(i + 3) % 6], gx = 78 + i * 4; c.px(gx, 43 - (i % 2) * 2, g); c.px(gx + 1, 43 - (i % 2) * 2, g); if (T > 0) { c.px(gx, 71 - (i % 2) * 2, g2); c.px(gx + 1, 71 - (i % 2) * 2, g2); } }
  if (T > 0) { c.vline(77, 32, 22, "n"); c.vline(77, 60, 22, "n"); c.line(100, 60, 104, 66, "N"); }   // glass, with a scratch
  if (T === 2) { c.rect(74, 20, 36, 6, "f"); for (let x = 75; x < 110; x += 4) c.px(x, 26, "F"); c.ellipse(92, 18, 8, 3, "j"); }   // velvet valance and a crown on top
  lights(c, T, [[56, 12]], v);
  cobweb(c, v ? 6 : w - 6, 8, !v, 6);
});

bay("jeweler", (c, w, A, T, v, rng) => {
  workbench(c, 4, 32, T, "p");
  c.vline(22, 48, 22, "4"); c.rect(16, 46, 13, 4, "5"); c.rect(18, 50, 9, 2, "Y");
  c.px(10, 68, v ? "P" : "N"); c.px(12, 68, "j");
});

room("farm", (c, w, R, T, v, rng) => {
  for (let x = 4, n = 0; n < 3; x += 34, n++) mushroomBed(c, x, 30, T, 5, rng);
  c.rect(w - 22, FY - 10, 11, 10, T === 0 ? "v" : "5"); c.hline(w - 22, FY - 10, 11, "6"); c.line(w - 11, FY - 8, w - 5, FY - 13, "5"); c.rect(w - 21, FY - 13, 8, 2, "4");
  for (const [x, y] of [[16, 32], [54, 26], [92, 38], [122, 24]]) { c.ellipse(x, y, 4, 2, "H"); c.px(x - 1, y - 2, "J"); c.px(x + 1, y - 1, "J"); c.vline(x, y + 2, 3, "c"); }
  if (T === 2) {                                     // glowing crystals and a water pipe
    for (const x of [30, 110]) { c.poly([x - 3, 40, x, 26, x + 3, 40], "n"); c.px(x, 30, "N"); c.px(x - 1, 34, "N"); }
    c.rect(0, 50, w, 3, "4"); c.hline(0, 50, w, "6"); for (const x of [20, 54, 88]) { c.vline(x, 53, 4, "4"); c.px(x, 58, "n"); }
  }
  if (T === 1) lights(c, T, [[69, 10]], v);
  if (T === 0) torch(c, 70, 18);
  cobweb(c, v ? w - 6 : 6, 8, !!v, 7);
});

bay("farm", (c, w, A, T, v, rng) => {
  mushroomBed(c, 8, 34, T, v ? 4 : 5, rng);
  const [x, y] = v ? [18, 30] : [34, 22];
  c.ellipse(x, y, 4, 2, "H"); c.px(x - 1, y - 2, "J"); c.vline(x, y + 2, 3, "c");
});

room("brewery", (c, w, R, T, v, rng) => {
  const [kx] = R.kettle;
  kettle(c, kx, 17, T);
  if (T === 0) { for (let i = 0; i < 2; i++) barrel(c, 66 + i * 18, B, 18); }
  else {
    for (let i = 0; i < 3; i++) barrelEnd(c, 66 + i * 15, B);
    for (let i = 0; i < 2; i++) barrelEnd(c, 73 + i * 15, B - 14);
    if (T === 2) barrelEnd(c, 80, B - 28);
  }
  c.hline(56, 14, 52, "u"); for (let x = 59; x < 106; x += 8) { c.vline(x, 15, 4, "u"); c.ellipse(x, 20, 3, 2, "V"); c.px(x - 1, 19, "u"); }
  if (T === 2) { c.rect(100, 44, 14, 10, "u"); c.box(100, 44, 14, 10, "v"); c.px(104, 48, "F"); c.px(108, 48, "y"); }   // a prize ribbon in a frame
  lights(c, T, [[64, 30]], v);
  cobweb(c, v ? w - 6 : 6, 8, !!v, 7);
  c.px(kx + 20, FY - 1, "y"); c.px(kx + 22, FY - 1, "y");   // a puddle of ale
});

bay("brewery", (c, w, A, T, v, rng) => {
  kettle(c, A.kettle[0], v ? 12 : 11, T);
  if (v) barrelEnd(c, 32, B, 6);
});

room("barracks", (c, w, R, T, v, rng) => {
  if (T > 0) { axeRack(c, 8, 20, T === 2 ? 4 : 3); shield(c, 56, 18, "f"); shield(c, 76, 18, "B"); banner(c, 98, 10, "f", "j"); }
  else { c.rect(10, 24, 3, 20, "v"); c.rect(8, 24, 7, 5, "5"); shield(c, 30, 20, "v"); }
  if (T === 2) { armorStand(c, 22, B); armorStand(c, 100, B); banner(c, 70, 40, "B", "j"); }
  // training dummy: straw, with a sack head, or with a painted target
  c.vline(130, FY - 34, 34, "v"); c.vline(131, FY - 34, 34, "W"); c.hline(122, FY - 24, 17, "v");
  c.rect(124, FY - 30, 14, 18, T === 0 ? "j" : "u"); c.rect(127, FY - 39, 8, 9, "u");
  c.px(130, FY - 22, "f"); c.px(131, FY - 22, "f");
  if (T === 2) { c.ring(131, FY - 21, 4, "f"); c.ring(131, FY - 21, 2, "C"); }
  c.hline(125, FY - 15, 12, "V"); c.vline(124, FY - 30, 18, "U"); c.px(129, FY - 36, "V"); c.px(132, FY - 36, "V");
  if (T === 0) { c.px(123, FY - 28, "j"); c.px(139, FY - 20, "j"); c.px(122, FY - 14, "j"); }   // straw sticking out
  bench(c, 42, B, 50, T);
  c.rect(10, FY - 6, 14, 6, "v"); c.hline(10, FY - 6, 14, "V"); c.px(15, FY - 8, "4"); c.px(19, FY - 8, "5");
  lights(c, T, [[95, 12]], v);
  cobweb(c, v ? 6 : w - 6, 8, !v, 8);
  c.line(60, FY - 1, 64, FY - 3, "2");               // a scratch from a dropped axe
});

// ------------------------------------------------------------------ cobwebs the game puts into corners

sprite("deco_web_0", { w: 12, h: 12 }, (c) => cobweb(c, 0, 0, false, 11));
sprite("deco_web_1", { w: 8, h: 8 }, (c) => cobweb(c, 0, 0, false, 7));
sprite("deco_web_2", { w: 14, h: 10 }, (c) => { for (let i = 0; i < 14; i++) c.px(i, 0, "6"); c.line(0, 0, 6, 9, "6"); c.line(13, 0, 6, 9, "6"); c.line(6, 0, 6, 9, "6"); c.hline(3, 4, 8, "6"); c.hline(5, 7, 3, "6"); });   // between two beams

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
