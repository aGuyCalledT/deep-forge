// Tiles and props for the hold, the surface and the mines.

// The rock around the rooms (grey stone by depth), caves and their caps are in cave.px.js.

// ---------------------------------------------------------------- hallway: a timbered tunnel, 24 x 96, as tall as the rooms' walls
function hall(name, extra) {
  sprite(name, { w: 24, h: 96 }, (c) => {
    c.rect(0, 10, 24, 80, "W");                                  // back wall
    for (let x = 0; x < 24; x += 12) { c.vline(x, 10, 80, "w"); c.vline(x + 1, 10, 80, "v"); c.px(x + 5, 30, "w"); c.px(x + 8, 62, "w"); }
    c.rect(0, 7, 24, 4, "V"); c.hline(0, 7, 24, "u"); c.hline(0, 11, 24, "w");       // lintel
    c.rect(0, 90, 24, 6, "W"); c.hline(0, 90, 24, "V"); c.hline(0, 91, 24, "v");     // floor
    c.px(7, 93, "w"); c.px(18, 93, "w");
    if (extra) extra(c);
  });
}
hall("hall_a");
hall("hall_b", (c) => {                                          // lamp
  c.vline(12, 11, 4, "4"); c.rect(9, 15, 7, 1, "2"); c.rect(9, 16, 7, 7, "y"); c.rect(10, 17, 5, 5, "Y"); c.rect(11, 18, 3, 3, "0");
  c.vline(9, 16, 7, "2"); c.vline(15, 16, 7, "2"); c.rect(10, 23, 5, 1, "2");
});
hall("hall_c", (c) => { c.rect(4, 76, 14, 14, "V"); c.box(4, 76, 14, 14, "v"); c.box(5, 77, 12, 12, "u"); c.line(6, 78, 15, 87, "v"); });                   // crate
hall("hall_d", (c) => { c.rect(5, 46, 13, 10, "u"); c.box(5, 46, 13, 10, "v"); c.hline(7, 49, 9, "W"); c.hline(7, 52, 6, "W"); c.px(11, 44, "4"); c.px(11, 45, "4"); });   // notice
hall("hall_e", (c) => { for (const x of [2, 19]) { c.rect(x, 11, 3, 79, "v"); c.vline(x, 11, 79, "V"); } c.rect(1, 11, 5, 4, "V"); c.rect(18, 11, 5, 4, "V"); });   // posts

// ---------------------------------------------------------------- stairwell: a hallway two cells wide (48 x 96) with an
// arch in the back wall. Dwarves walk in and come out of a stairwell on another floor; the way behind is not shown.
function well(name, glowing, mine) {
  sprite(name, { w: 48, h: 96 }, (c) => {
    c.rect(0, 10, 48, 80, "W");                                     // timbered back wall, as in the hallway
    for (let x = 0; x < 48; x += 12) { c.vline(x, 10, 80, "w"); c.vline(x + 1, 10, 80, "v"); }
    c.px(5, 30, "w"); c.px(44, 62, "w"); c.px(8, 70, "w");
    c.rect(0, 7, 48, 4, "V"); c.hline(0, 7, 48, "u"); c.hline(0, 11, 48, "w");          // lintel
    c.rect(0, 90, 48, 6, "W"); c.hline(0, 90, 48, "V"); c.hline(0, 91, 48, "v");        // floor
    // the arch: cut stone around a dark way into the mountain
    c.ellipse(24, 46, 15, 13, "4"); c.rect(9, 46, 31, 44, "4");
    c.ellipse(24, 47, 11, 10, "s"); c.rect(13, 47, 23, 43, "s");
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; c.px(Math.round(24 + Math.cos(a) * 14), Math.round(46 + Math.sin(a) * 12), "5"); }   // keystones
    c.rect(22, 32, 5, 4, "6"); c.hline(22, 32, 5, "7");               // the top stone
    for (const y of [54, 66, 78]) { c.hline(9, y, 4, "3"); c.hline(36, y, 4, "3"); }   // joints in the jambs
    c.vline(9, 46, 44, "5"); c.vline(39, 46, 44, "3");
    // a little depth inside: the passage turns away, lit from somewhere far off
    c.rect(15, 60, 19, 30, "1"); c.rect(18, 70, 13, 20, "s");
    if (glowing) { c.rect(26, 62, 6, 12, "o"); c.rect(27, 63, 4, 10, "y"); c.vline(28, 64, 8, "Y"); }
    else { c.rect(27, 64, 4, 8, "o"); c.vline(28, 65, 6, "y"); }
    c.rect(9, 89, 31, 1, "3"); c.hline(11, 88, 27, "2");               // worn threshold
    // a sign with arrows up and down (the mine shaft: crossed picks), and a lantern on the other side
    c.rect(2, 40, 6, 1, "v"); c.rect(1, 41, 7, 14, "u"); c.box(1, 41, 7, 14, "v");
    if (mine) {
      c.line(2, 52, 6, 44, "w"); c.line(6, 52, 2, 44, "w");                                     // two handles
      c.hline(1, 44, 3, "4"); c.hline(5, 44, 3, "4"); c.px(1, 45, "4"); c.px(7, 45, "4");         // pick heads
    } else {
      c.px(4, 43, "w"); c.hline(3, 44, 3, "w"); c.hline(2, 45, 5, "w"); c.vline(4, 46, 2, "w");   // up
      c.vline(4, 49, 2, "w"); c.hline(2, 51, 5, "w"); c.hline(3, 52, 3, "w"); c.px(4, 53, "w");   // down
    }
    c.vline(44, 26, 4, "4"); c.rect(41, 30, 7, 1, "2"); c.rect(41, 31, 7, 7, "y"); c.rect(42, 32, 5, 5, "Y"); c.rect(43, 33, 3, 3, "0");
    c.vline(41, 31, 7, "2"); c.vline(47, 31, 7, "2"); c.rect(42, 38, 5, 1, "2");
    c.line(10, 86, 6, 89, "w"); c.px(40, 89, "w");                     // scuffs where the dwarves walk in
    if (mine) {
      // the cart rails run out of the arch
      c.hline(12, 92, 25, "3"); c.hline(12, 94, 25, "3"); for (let x = 13; x < 37; x += 4) c.vline(x, 92, 3, "v");
    }
  });
}
well("well", false);
well("well_lit", true);
// the mine shaft on every floor is a stairwell too: the miners go down to the mines through it
well("shaft", false, true);
well("shaft_lit", true, true);

// ---------------------------------------------------------------- surface (sized for the 33 px dwarves)
sprite("door", { w: 26, h: 30, outline: "k" }, (c) => {
  c.rect(0, 6, 26, 24, "4"); c.ellipse(13, 7, 13, 7, "4");      // stone arch
  c.ellipse(13, 9, 9, 6, "W"); c.rect(4, 9, 18, 21, "W");
  for (let x = 6; x < 21; x += 4) c.vline(x, 4, 26, "v");
  c.px(18, 18, "j");                                             // door ring
  for (let i = 0; i < 6; i++) { const a = Math.PI + (i / 5) * Math.PI; c.px(Math.round(13 + Math.cos(a) * 12), Math.round(7 + Math.sin(a) * 6), "5"); }
});

sprite("stall", { w: 70, h: 52, outline: "k" }, (c) => {
  // scalloped striped awning
  for (let x = 0; x < 70; x += 10) { c.rect(x, 0, 5, 12, "f"); c.rect(x + 5, 0, 5, 12, "C"); c.hline(x + 5, 0, 5, "c"); }
  for (let x = 0; x < 70; x += 10) { c.ellipse(x + 2, 12, 2, 1, "f"); c.ellipse(x + 7, 12, 2, 1, "C"); }
  c.hline(0, 0, 70, "F");
  for (const x of [3, 64]) { c.rect(x, 13, 3, 39, "v"); c.vline(x, 13, 39, "V"); }
  // counter with planks
  c.rect(1, 34, 68, 5, "V"); c.hline(1, 34, 68, "u"); c.hline(1, 38, 68, "W");
  c.rect(4, 39, 62, 13, "W"); for (let x = 4; x < 66; x += 9) c.vline(x, 39, 13, "w"); c.hline(4, 45, 62, "v");
  // goods on the counter
  c.ellipse(13, 31, 4, 3, "F"); c.px(12, 29, "y"); c.ellipse(21, 31, 4, 3, "y"); c.px(20, 29, "Y");
  c.rect(30, 27, 8, 7, "6"); c.hline(30, 27, 8, "7"); c.rect(43, 26, 9, 8, "j"); c.hline(43, 26, 9, "8"); c.px(46, 28, "8");
  c.rect(56, 28, 6, 6, "h"); c.rect(57, 26, 4, 2, "G");
  // a sign with a coin
  c.rect(26, 15, 18, 9, "u"); c.box(26, 15, 18, 9, "V"); c.vline(30, 13, 2, "v"); c.vline(40, 13, 2, "v");
  c.circ(35, 19, 3, "O"); c.circ(35, 19, 2, "j"); c.px(34, 18, "8");
});

sprite("tent", { w: 60, h: 46, outline: "k" }, (c) => {
  c.poly([30, 2, 60, 46, 0, 46], "U");
  c.poly([30, 2, 45, 46, 30, 46], "u");
  for (let i = 0; i < 5; i++) c.line(30, 2, 6 + i * 12, 46, "u");
  c.poly([30, 16, 39, 46, 21, 46], "W"); c.line(30, 16, 39, 46, "v");
  c.line(30, 16, 23, 34, "U"); c.line(23, 34, 21, 46, "U");                  // the flap pulled back
  c.vline(30, -4, 6, "v");
  c.rect(31, -5, 9, 5, "B"); c.hline(31, -5, 9, "n");                        // little flag
  c.px(54, 44, "V"); c.px(6, 44, "V"); c.line(56, 44, 60, 40, "u"); c.line(4, 44, 0, 40, "u");
});

for (let i = 0; i < 2; i++) sprite("tree_" + i, { w: 44, h: 62, outline: "k" }, (c) => {
  c.rect(19, 36, 7, 26, "~"); c.vline(19, 36, 26, "^"); c.vline(24, 40, 20, "w");
  c.line(19, 61, 14, 61, "~"); c.line(26, 61, 31, 61, "~");                 // roots
  c.line(22, 44, 30, 34, "~");                                               // a branch
  const blobs = i ? [[22, 19, 16], [11, 27, 10], [33, 27, 10], [22, 8, 10]] : [[22, 21, 18], [13, 12, 10], [31, 13, 10]];
  for (const [x, y, r] of blobs) c.circ(x, y, r, ">");
  for (const [x, y, r] of blobs) c.circ(x + 2, y + 3, Math.max(1, r - 5), "<");
  for (const [x, y, r] of blobs) c.circ(x - 3, y - 3, Math.max(1, r - 6), "=");
  for (const [x, y] of [[13, 9], [27, 15], [18, 24], [33, 23], [9, 26]]) { c.px(x, y, "+"); c.px(x + 1, y, "+"); }
  if (i) for (const [x, y, k] of [[30, 22, "P"], [14, 30, "P"], [24, 11, "9"], [36, 30, "9"], [18, 16, "P"]]) { c.px(x, y, k); c.px(x + 1, y - 1, "9"); }    // blossoms
});
sprite("bush", { w: 24, h: 14, outline: "k" }, (c) => {
  c.ellipse(12, 8, 12, 6, ">"); c.ellipse(13, 10, 9, 3, "<"); c.ellipse(9, 6, 6, 3, "="); c.px(7, 4, "+");
  c.px(16, 5, "P"); c.px(17, 6, "9"); c.px(5, 9, "9"); c.px(19, 9, "P");
});
sprite("flowers", { w: 12, h: 9 }, (c) => {
  c.vline(1, 3, 6, "<"); c.vline(5, 1, 8, "<"); c.vline(9, 4, 5, "<"); c.px(4, 5, "="); c.px(8, 6, "=");
  c.px(1, 2, "P"); c.px(0, 2, "9"); c.px(5, 0, "j"); c.px(6, 0, "8"); c.px(9, 3, "9"); c.px(10, 3, "P");
});
sprite("signpost", { w: 24, h: 28, outline: "k" }, (c) => {
  c.rect(10, 6, 3, 22, "~"); c.vline(10, 6, 22, "^");
  c.poly([1, 4, 18, 4, 23, 8, 18, 12, 1, 12], "^"); c.hline(1, 4, 17, "@"); c.hline(1, 12, 17, "~");
  c.line(6, 10, 10, 6, "w"); c.rect(8, 5, 5, 2, "6");      // a little pickaxe painted on it
  c.poly([22, 15, 6, 15, 2, 18, 6, 21, 22, 21], "^"); c.hline(6, 15, 16, "@");   // and a second sign the other way
  c.px(12, 18, "W"); c.px(15, 18, "W");
});

anim("wagon", { w: 50, h: 30, outline: "k", frames: 2, fps: 4 }, (c) => {
  c.ellipse(20, 9, 19, 9, "C"); c.rect(1, 9, 38, 3, "C"); c.ellipse(20, 9, 16, 6, "c");   // canvas top
  for (const x of [8, 20, 32]) c.vline(x, 2, 9, "u");
  c.rect(1, 12, 38, 9, "V"); c.hline(1, 12, 38, "u"); c.vline(13, 12, 9, "v"); c.vline(27, 12, 9, "v"); c.hline(1, 20, 38, "W");
  const f = c.frame;
  for (const x of [9, 31]) { c.circ(x, 23, 6, "W"); c.ring(x, 23, 6, "w"); c.ring(x, 23, 3, "v"); c.line(x - 4, 23 + (f ? 3 : -3), x + 4, 23 - (f ? 3 : -3), "u"); c.px(x, 23, "u"); }
  // a pony, of course
  c.rect(39, 9, 9, 9, "~"); c.rect(44, 3, 5, 7, "~"); c.px(47, 5, "e"); c.rect(43, 2, 2, 6, "w"); c.px(48, 8, "^");
  c.vline(40, 18, 6 + f, "^"); c.vline(46, 18, 7 - f, "^"); c.vline(41, 18, 5, "~"); c.px(38, 10, "w"); c.line(38, 10, 36, 15, "w");
  c.line(39, 13, 34, 14, "v");    // the shaft
});

anim("torch", { w: 6, h: 11, frames: 3, fps: 8 }, (c) => {
  c.rect(2, 6, 2, 5, "v"); c.rect(1, 5, 4, 1, "4");
  const f = c.frame;
  c.rect(1, 1 + (f === 1 ? 1 : 0), 4, 4, "F"); c.rect(2, 2, 2, 3, "y"); c.px(2 + (f === 2 ? 1 : 0), 0 + f % 2, "Y");
});

// the left half up to the middle column, mirrored (mx: "c"), so the arrow is symmetric
anim("arrow", { w: 9, h: 11, mx: "c", outline: "k", frames: 2, fps: 3 }, (c) => {
  const y = c.frame;
  c.rect(3, y, 2, 5, "h"); c.vline(4, y, 5, "H");
  for (let r = 0; r < 5; r++) c.hline(r, y + 5 + r, 5 - r, "h");
  c.px(4, y + 8, "J");
});
sprite("zzz", { w: 7, h: 7 }, (c) => { c.text(0, 2, "Z", "N"); c.px(5, 0, "N"); c.px(6, 0, "N"); c.px(6, 1, "N"); c.px(5, 2, "N"); c.px(6, 2, "N"); });
sprite("heart", { w: 7, h: 6, outline: "k" }, "PP.PP\nP9PPP\nPPPPP\n.PPP.\n..P..");

// ---------------------------------------------------------------- mines
LAYERS.forEach((L, i) => {
  const [d0, d1, d2, d3] = L.rock;
  sprite("mine_rock_" + i, { w: 64, h: 64 }, (c) => {
    c.rect(0, 0, 64, 64, d1);
    const strata = [[0, 12, d1], [12, 6, d2], [18, 14, d1], [32, 9, d0], [41, 13, d1], [54, 10, d2]];
    for (const [y, h, col] of strata) c.rect(0, y, 64, h, col);
    for (const [y] of strata) c.hline(0, y, 64, d0);
    // cracks with a cause: run down from the strata lines
    for (const [x, y] of [[9, 12], [37, 32], [54, 41], [21, 54]]) { c.line(x, y, x + 2, y + 5, d0); c.line(x + 2, y + 5, x + 1, y + 8, d0); }
    for (const [x, y] of [[4, 14], [44, 20], [28, 44], [58, 56]]) c.hline(x, y, 6, d3);
  });
});
sprite("tunnel", { w: 32, h: 54 }, (c) => {
  c.rect(0, 0, 32, 48, "(");
  c.rect(0, 48, 32, 6, "W"); c.hline(0, 48, 32, "V");
  c.hline(0, 50, 32, "5"); c.hline(0, 52, 32, "5");               // rails
  for (let x = 1; x < 32; x += 5) c.rect(x, 51, 3, 1, "v");        // sleepers
});
sprite("beam", { w: 14, h: 50, outline: "k" }, (c) => { c.rect(1, 3, 3, 47, "v"); c.rect(10, 3, 3, 47, "v"); c.rect(0, 0, 14, 4, "V"); c.hline(0, 0, 14, "u"); c.vline(1, 3, 47, "V"); });
sprite("cart", { w: 22, h: 14, outline: "k" }, (c) => {
  c.poly([0, 2, 22, 2, 19, 10, 3, 10], "4"); c.hline(0, 2, 22, "6"); c.hline(3, 6, 16, "3");
  c.circ(6, 11, 2, "2"); c.circ(16, 11, 2, "2");
  c.ellipse(11, 2, 8, 2, "5"); c.px(8, 1, "F"); c.px(13, 1, "n"); c.px(10, 0, "j");
});
sprite("lift", { w: 26, h: 22, outline: "k" }, (c) => {
  c.rect(0, 0, 26, 2, "v"); c.rect(0, 20, 26, 2, "v"); c.vline(0, 0, 22, "v"); c.vline(25, 0, 22, "v");
  for (let x = 4; x < 24; x += 5) c.vline(x, 2, 18, "W");
  c.rect(4, 12, 18, 8, "V"); c.ellipse(13, 12, 8, 3, "5"); c.px(10, 11, "F"); c.px(15, 11, "j"); c.px(13, 10, "n");
  c.vline(13, -4, 4, "6");
});
sprite("winch", { w: 44, h: 44, outline: "k" }, (c) => {
  c.line(3, 44, 19, 2, "v", 3); c.line(41, 44, 25, 2, "v", 3); c.line(4, 44, 20, 2, "V"); c.rect(14, 0, 16, 4, "V"); c.hline(14, 0, 16, "u");
  c.hline(10, 30, 24, "W");
  c.circ(22, 14, 10, "4"); c.ring(22, 14, 10, "2"); c.ring(22, 14, 7, "3"); c.circ(22, 14, 3, "6");
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; c.line(22, 14, Math.round(22 + Math.cos(a) * 9), Math.round(14 + Math.sin(a) * 9), "5"); }
  c.vline(22, 24, 20, "u");      // the rope down the shaft
  c.line(33, 14, 38, 20, "v"); c.rect(37, 20, 3, 4, "V");   // crank
});
sprite("lock_sign", { w: 26, h: 18, outline: "k" }, (c) => {
  c.rect(0, 4, 26, 12, "V"); c.hline(0, 4, 26, "u"); c.vline(4, 16, 2, "v"); c.vline(21, 16, 2, "v");
  c.rect(10, 7, 6, 6, "j"); c.ring(13, 6, 2, "4"); c.px(13, 9, "o"); c.px(13, 10, "o");
});


// ---------------------------------------------------------------- the gate in the mountain face: 48 x 72, an arch of cut stone, doors open
sprite("gate", { w: 48, h: 72, outline: "k" }, (c) => {
  c.ellipse(24, 22, 24, 22, "4"); c.rect(0, 22, 48, 50, "4");             // the stone frame
  c.ellipse(24, 24, 17, 17, "s"); c.rect(7, 24, 34, 48, "s");             // the dark way in
  for (let i = 0; i < 11; i++) {                                          // voussoirs
    const a = Math.PI + (i / 10) * Math.PI;
    const x = Math.round(24 + Math.cos(a) * 20.5), y = Math.round(23 + Math.sin(a) * 20.5);
    c.rect(x - 2, y - 2, 4, 4, i % 2 ? "5" : "6");
  }
  c.rect(20, 0, 8, 6, "6"); c.hline(20, 0, 8, "7");                       // keystone
  for (const x of [0, 41]) { for (let y = 26; y < 72; y += 8) { c.rect(x, y, 7, 7, (y / 8) % 2 ? "5" : "4"); c.hline(x, y, 7, "6"); } }
  // the doors, swung open against the frame
  for (const [x, d] of [[7, 1], [35, -1]]) {
    c.rect(x, 30, 6, 42, "v"); c.vline(d > 0 ? x : x + 5, 30, 42, "V");
    for (const y of [38, 56]) c.hline(x, y, 6, "4");
  }
  c.rect(7, 70, 34, 2, "3");                                              // threshold
  c.px(24, 4, "j"); c.px(23, 5, "j"); c.px(25, 5, "j");                   // a little rune
});

// ---------------------------------------------------------------- the gate by level (gate_1..gate_4), it grows with each upgrade.
// The game stands it on the valley floor, centred on the mountain face. Doors are always open; dwarves walk through.
const GATES = [[48, 72], [54, 78], [64, 88], [76, 100]];
for (let L = 1; L <= 4; L++) {
  const [w, h] = GATES[L - 1];
  sprite("gate_" + L, { w, h, outline: "k" }, (c) => {
    const cx = Math.floor(w / 2), r = Math.floor(w / 2) - 7, top = h - 48 - r;    // the opening: 48 px tall walls under a round top
    const stone = L === 4 ? ["2", "3", "4"] : ["4", "5", "6"];
    if (L === 1) {                                                     // timber: two posts, a beam, a little roof
      for (const x of [2, w - 9]) { c.rect(x, 14, 7, h - 14, "v"); c.vline(x, 14, h - 14, "V"); c.vline(x + 6, 14, h - 14, "W"); c.px(x + 3, 30, "W"); c.px(x + 4, 52, "W"); }
      c.rect(0, 10, w, 7, "V"); c.hline(0, 10, w, "u"); c.hline(0, 16, w, "W");
      c.poly([0, 10, cx, 0, w, 10], "W"); c.line(0, 10, cx, 0, "v"); c.line(cx, 0, w - 1, 10, "v");
      c.rect(9, 17, w - 18, h - 17, "s");
      for (const [x, d] of [[9, 1], [w - 15, -1]]) { c.rect(x, 22, 6, h - 22, "v"); c.vline(d > 0 ? x : x + 5, 22, h - 22, "V"); for (let y = 26; y < h; y += 8) c.px(x + 2, y, "W"); }
      c.rect(cx - 5, 3, 10, 5, "u"); c.px(cx - 2, 5, "w"); c.px(cx + 1, 5, "w");   // a carved board
      c.rect(9, h - 2, w - 18, 2, "W");
      return;
    }
    // stone frame with a round arch
    c.ellipse(cx, top + r, cx, r + 6, stone[1]); c.rect(0, top + r, w, h - top - r, stone[1]);
    c.ellipse(cx, top + r + 2, r, r, "s"); c.rect(cx - r, top + r + 2, 2 * r + 1, h - top - r - 2, "s");
    const n = 9 + L * 2;
    for (let i = 0; i <= n; i++) {                                     // voussoirs
      const a = Math.PI + (i / n) * Math.PI, x = Math.round(cx + Math.cos(a) * (r + 3)), y = Math.round(top + r + 1 + Math.sin(a) * (r + 3));
      c.rect(x - 2, y - 2, 4, 4, i % 2 ? stone[2] : stone[1]);
      if (L === 4 && i % 3 === 1) c.px(x, y, "N");                     // runes that glow
    }
    c.rect(cx - 4, top - 6, 9, 8, stone[2]); c.hline(cx - 4, top - 6, 9, L === 4 ? "j" : "7");   // keystone
    for (const x of [0, w - 7]) for (let y = top + r + 4, k = 0; y < h; y += 8, k++) { c.rect(x, y, 7, 7, k % 2 ? stone[1] : stone[0]); c.hline(x, y, 7, stone[2]); }
    // doors swung open, iron-bound
    for (const [x, d] of [[cx - r, 1], [cx + r - 5, -1]]) {
      c.rect(x, top + r + 6, 6, h - top - r - 6, "v"); c.vline(d > 0 ? x : x + 5, top + r + 6, h - top - r - 6, "V");
      for (let y = top + r + 12; y < h - 4; y += 14) { c.hline(x, y, 6, "4"); c.px(x + 2, y, "6"); }
    }
    c.rect(cx - r, h - 2, 2 * r + 1, 2, stone[0]);                     // threshold
    if (L >= 3) {                                                      // the portcullis, pulled up into the arch
      for (let x = cx - r + 3; x <= cx + r - 3; x += 4) { c.vline(x, top + r - 4, 12, "3"); c.px(x, top + r + 8, "5"); }
      c.hline(cx - r + 2, top + r, 2 * r - 3, "3"); c.hline(cx - r + 2, top + r + 5, 2 * r - 3, "3");
      for (const x of [3, w - 13]) {                                   // banners of the hold
        c.hline(x - 1, top + r + 4, 12, "v");
        c.rect(x, top + r + 5, 10, 22, L === 4 ? "f" : "Q"); c.vline(x + 1, top + r + 5, 22, "F");
        c.poly([x, top + r + 27, x + 5, top + r + 31, x + 9, top + r + 27], L === 4 ? "f" : "Q");
        c.poly([x + 1, top + r + 20, x + 5, top + r + 11, x + 9, top + r + 20], "j"); c.px(x + 5, top + r + 12, "8"); c.hline(x + 3, top + r + 17, 5, "o");   // the mountain of the hold
      }
    }
    if (L === 4) {                                                     // a crest over the keystone and gold rails
      c.circ(cx, top - 12, 6, "o"); c.circ(cx, top - 12, 4, "j"); c.circ(cx, top - 12, 2, "f"); c.px(cx - 1, top - 13, "9");
      c.hline(0, top + r + 3, 7, "j"); c.hline(w - 7, top + r + 3, 7, "j");
    } else c.px(cx, top - 3, "j");                                     // a little rune on the keystone
  }, glow("N", { r: 4, strength: 0.4 }));
}

// braziers beside the higher gates and in the entrance hall (fire drawn by the game: fire_place)
sprite("brazier", { w: 14, h: 22, outline: "k" }, (c) => {
  c.poly([0, 4, 13, 4, 10, 9, 3, 9], "3"); c.hline(0, 4, 14, "5"); c.hline(1, 3, 12, "s");
  c.vline(6, 9, 10, "3"); c.vline(7, 9, 10, "4");
  c.line(6, 18, 2, 21, "3"); c.line(7, 18, 11, 21, "3"); c.hline(5, 18, 4, "4");
});

// ---------------------------------------------------------------- the entrance hall in the gate tunnel: 144 x 96, three looks by level.
// The left 40 px stay plain: the gate (up to 76 px wide, centred on the mountain face) covers them.
// Guards stand watch and spar on the free floor x 72..112 (hold.js guardSpot).
for (let T = 0; T < 3; T++) sprite("entrance_hall_" + T, { w: 144, h: 96 }, (c) => {
  if (T === 0) {                                                     // the timbered tunnel, as the hallways
    c.rect(0, 10, 144, 80, "W");
    for (let x = 0; x < 144; x += 12) { c.vline(x, 10, 80, "w"); c.vline(x + 1, 10, 80, "v"); }
    c.px(29, 40, "w"); c.px(88, 66, "w"); c.px(121, 30, "w");
  } else {                                                           // cut stone, darker and more even when grand
    const [base, dark, lite] = T === 2 ? ["3", "2", "4"] : ["4", "3", "5"];
    c.rect(0, 10, 144, 80, base);
    for (let y = 10, row = 0; y < 90; y += 10, row++) {
      c.hline(0, y, 144, dark);
      for (let x = row % 2 ? 0 : 12; x < 144; x += 24) { c.vline(x, y, 10, dark); c.hline(x + 1, y + 1, 22, lite); }
    }
    for (const [x, y] of [[30, 41], [102, 61], [126, 21]]) c.rect(x, y, 10, 8, T === 2 ? "4" : "6");   // odd stones
    c.line(64, 11, 61, 24, dark); c.line(61, 24, 63, 30, dark);         // a crack from the lintel
  }
  c.rect(0, 7, 144, 4, T === 2 ? "2" : "V"); c.hline(0, 7, 144, T === 2 ? "4" : "u"); c.hline(0, 11, 144, T === 2 ? "o" : "w");   // lintel
  c.rect(0, 90, 144, 6, T ? "3" : "W"); c.hline(0, 90, 144, T ? "5" : "V"); c.hline(0, 91, 144, T ? "4" : "v");                    // floor
  for (let x = 6; x < 144; x += 24) c.px(x, 93, T ? "2" : "w");
  for (const x of [0, 141]) { c.rect(x, 11, 3, 79, T === 2 ? "2" : "v"); c.vline(x, 11, 79, T === 2 ? "4" : "V"); }   // posts
  // weapon rack: spears, later axes
  c.rect(42, 34, 26, 3, "V"); c.hline(42, 34, 26, "u"); c.rect(42, 84, 26, 3, "V");
  for (let i = 0; i < 4; i++) {
    const x = 45 + i * 6;
    c.vline(x, 22, 64, "v"); c.vline(x + 1, 22, 64, "W");
    if (T === 0) { c.poly([x - 1, 22, x + 1, 16, x + 3, 22], "5"); c.px(x + 1, 18, "6"); }
    else { c.rect(x - 2, 24, 5, 7, i % 2 ? "5" : "6"); c.vline(x - 2, 25, 5, "7"); c.px(x + 2, 24, "4"); }
  }
  // the guards' bench, a mug, practice sticks leaning beside it
  c.rect(114, 80, 26, 3, "V"); c.hline(114, 80, 26, "u"); c.rect(116, 83, 3, 7, "W"); c.rect(135, 83, 3, 7, "W");
  c.rect(130, 76, 5, 4, "u"); c.hline(130, 76, 5, "C"); c.vline(135, 77, 2, "u");
  c.line(110, 89, 114, 60, "u"); c.line(111, 89, 115, 60, "V"); c.line(107, 89, 112, 62, "u");
  // a duty board with tally marks
  c.rect(118, 44, 20, 16, "v"); c.box(118, 44, 20, 16, "W"); c.rect(120, 46, 16, 12, "c");
  for (let i = 0; i < 6; i++) c.vline(122 + i * 2, 48, 4, "w"); c.line(121, 51, 133, 49, "w"); c.hline(122, 55, 9, "u");
  if (T === 1) {                                                     // shields and two crossed practice sticks
    shieldOn(c, 72, 24, "f"); shieldOn(c, 104, 24, "B");
    c.rect(86, 30, 16, 2, "v"); c.vline(93, 26, 6, "v");
    c.line(87, 42, 101, 28, "u"); c.line(87, 28, 101, 42, "u");
  }
  if (T === 2) {                                                     // banners of the hold around a big shield, a runner on the floor
    for (const x of [70, 106]) { c.hline(x - 1, 13, 12, "o"); c.rect(x, 14, 10, 26, "f"); c.vline(x + 1, 14, 26, "F"); c.poly([x, 40, x + 5, 44, x + 9, 40], "f"); c.poly([x + 1, 30, x + 5, 21, x + 9, 30], "j"); c.px(x + 5, 22, "8"); c.hline(x + 3, 27, 5, "o"); }
    shieldOn(c, 83, 22, "f");
    c.rect(72, 88, 40, 2, "f"); c.hline(72, 88, 40, "F"); c.px(71, 89, "F"); c.px(112, 89, "F");
  }
  // torches (the game adds light); the grand hall has braziers instead
  for (const x of T === 2 ? [] : [74, 106]) { c.rect(x, 54, 2, 7, "v"); c.rect(x - 1, 60, 4, 2, "4"); c.rect(x - 1, 51, 4, 3, "F"); c.rect(x, 50, 2, 2, "y"); c.px(x, 49, "Y"); }
  // a cobweb in the corner where nobody looks
  for (let i = 0; i < 7; i++) c.px(140 - i, 12, "6"); c.line(140, 12, 134, 18, "6"); c.line(137, 12, 137, 15, "6");
}, glow("yY0", { r: 8, strength: 0.3 }));

function shieldOn(c, x, y, col) {
  c.circ(x + 6, y + 6, 6, col); c.ring(x + 6, y + 6, 6, "o"); c.ring(x + 6, y + 6, 3, col === "f" ? "F" : "n"); c.circ(x + 6, y + 6, 1, "j"); c.px(x + 5, y + 5, "8");   // rim and boss
}


// ---------------------------------------------------------------- the market stall in the valley: 128 x 84, the awning is drawn
// separately (stall_awning, 4 frames) and flutters in the wind. Lanterns hang from the beam (light: hold.js).
sprite("market_stall", { w: 128, h: 84, outline: "k" }, (c) => {
  // posts and the beam under the awning
  for (const x of [4, 120]) { c.rect(x, 14, 5, 70, "v"); c.vline(x, 14, 70, "V"); c.vline(x + 4, 14, 70, "W"); c.px(x + 2, 40, "W"); c.px(x + 2, 62, "W"); }
  c.rect(0, 14, 128, 5, "V"); c.hline(0, 14, 128, "u"); c.hline(0, 18, 128, "W");
  // back shelves with jars and bolts of cloth
  c.rect(12, 30, 104, 3, "V"); c.hline(12, 30, 104, "u");
  for (let x = 16, i = 0; x < 110; x += 11, i++) {
    if (i % 3 === 0) { c.rect(x, 22, 7, 8, "c"); c.hline(x, 22, 7, "C"); c.rect(x + 1, 20, 5, 2, "u"); }          // a jar
    else if (i % 3 === 1) { c.rect(x, 23, 8, 7, i % 2 ? "B" : "p"); c.vline(x + 2, 23, 7, i % 2 ? "n" : "P"); }   // cloth
    else { c.ellipse(x + 4, 26, 4, 4, "F"); c.px(x + 3, 24, "y"); c.vline(x + 4, 21, 2, "G"); }                   // a pumpkin
  }
  // the counter: planks, a cloth runner, goods
  c.rect(10, 52, 108, 6, "V"); c.hline(10, 52, 108, "u"); c.hline(10, 57, 108, "W");
  c.rect(14, 58, 100, 26, "W"); for (let x = 14; x < 114; x += 10) c.vline(x, 58, 26, "w"); c.hline(14, 70, 100, "v");
  c.rect(14, 58, 100, 5, "h"); c.hline(14, 62, 100, "G"); for (let x = 16; x < 112; x += 6) c.px(x, 63, "G");      // green runner (trade)
  // bars stacked, a scale, apples, a mug
  for (let i = 0; i < 5; i++) { const bx = 18 + (i % 3) * 9 + (i > 2 ? 4 : 0), by = i > 2 ? 44 : 48; c.rect(bx, by, 8, 4, i % 2 ? "6" : "O"); c.hline(bx + 1, by, 6, i % 2 ? "7" : "j"); }
  c.vline(64, 36, 16, "o"); c.line(54, 38, 74, 36, "o"); c.px(64, 35, "j");
  for (const [px, dy] of [[54, 0], [74, -2]]) { c.vline(px - 3, 38 + dy, 6, "5"); c.vline(px + 3, 38 + dy, 6, "5"); c.hline(px - 4, 44 + dy, 9, "o"); c.hline(px - 3, 45 + dy, 7, "j"); }
  for (const [x, y] of [[86, 48], [92, 48], [89, 45]]) { c.circ(x, y, 3, "f"); c.px(x - 1, y - 2, "F"); c.px(x, y - 3, "G"); }
  c.rect(102, 44, 6, 8, "u"); c.hline(102, 44, 6, "C"); c.vline(108, 46, 3, "u");
  // a crate and a sack before the counter, a barrel at the side
  c.rect(0, 70, 14, 14, "V"); c.box(0, 70, 14, 14, "v"); c.line(1, 71, 12, 82, "v");
  c.ellipse(116, 78, 7, 6, "c"); c.rect(113, 69, 6, 3, "c"); c.hline(113, 71, 6, "u"); c.px(114, 76, "C");
  // a hanging sign with a coin
  c.vline(54, 19, 4, "4"); c.vline(74, 19, 4, "4");
  c.rect(50, 23, 28, 11, "u"); c.box(50, 23, 28, 11, "V"); c.circ(64, 28, 4, "O"); c.circ(64, 28, 3, "j"); c.px(63, 27, "8");
  // two lanterns
  for (const x of [20, 104]) { c.vline(x + 2, 19, 3, "4"); c.rect(x, 22, 5, 6, "y"); c.rect(x + 1, 23, 3, 4, "Y"); c.hline(x, 22, 5, "2"); c.hline(x, 28, 5, "2"); }
  // bunting between the posts
  for (let x = 10, i = 0; x < 118; x += 8, i++) c.poly([x, 19, x + 6, 19, x + 3, 24], ["f", "j", "h", "B"][i % 4]);
}, glow("Y", { r: 5, strength: 0.4 }));

// The striped awning over the stall: 136 x 20, its scalloped edge and the loose end ripple in the wind.
anim("stall_awning", { w: 136, h: 30, frames: 4, fps: 3, outline: "k" }, (c) => {
  const k = c.phase * Math.PI * 2;
  for (let x = 0; x < 136; x++) {
    const red = Math.floor(x / 10) % 2 === 0, top = 2 + Math.round(Math.abs(68 - x) / 68 * 4);
    const lift = Math.round(Math.sin(k + x * 0.08) * 1.5), bottom = 22 + lift;
    c.vline(x, top, bottom - top, red ? "f" : "C");
    c.vline(x, bottom - 6, 2, red ? "Q" : "c");                                   // the fold where the valance hangs
    const sc = x % 10, dip = sc === 0 || sc === 9 ? 0 : sc === 1 || sc === 8 ? 2 : 3;   // scalloped valance
    c.vline(x, bottom, dip, red ? "f" : "C"); if (dip) c.px(x, bottom + dip - 1, red ? "Q" : "c");
  }
  c.line(0, 6, 68, 2, "F"); c.line(68, 2, 135, 6, "F");                                     // the ridge
  const tail = Math.round(Math.sin(k + 1) * 2);
  c.line(135, 22, 133 + tail, 29, "j"); c.px(133 + tail, 29, "o");                             // a ribbon on the corner
});

// ---------------------------------------------------------------- big valley trees: 160 x 240, four frames of wind.
// The crown leans with the wind, more at the top; the trunk stays. tree_a: a broad oak, tree_b: a blossoming lime tree.
function bigTree(c, kind) {
  const W = 160, Ht = 240, k = c.phase * Math.PI * 2;
  const sway = (y) => Math.round(Math.sin(k) * 4 * Math.pow(Math.max(0, 1 - y / 150), 1.4));     // only above y = 150
  const P = (x, y) => [x + sway(y), y];
  // trunk and roots
  c.poly([70, 240, 90, 240, 87, 150, 73, 150], "~"); c.line(72, 150, 70, 239, "^"); c.vline(83, 160, 70, "w");
  c.poly([62, 240, 70, 230, 72, 240], "~"); c.poly([88, 240, 92, 228, 100, 240], "~");
  c.line(76, 200, 78, 206, "w"); c.line(81, 176, 80, 184, "w");                                    // a knot and a crack in the bark
  // branches into the crown
  for (const [x0, y0, x1, y1] of [[78, 160, 46, 112], [82, 156, 116, 104], [80, 150, 80, 80]]) {
    const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1); c.line(ax, ay, bx, by, "~", 4); c.line(ax - 1, ay, bx - 1, by, "^");
  }
  const blobs = kind === "a"
    ? [[80, 70, 52], [38, 104, 34], [122, 100, 36], [56, 44, 34], [108, 42, 32], [80, 22, 26], [24, 128, 20], [138, 126, 20], [80, 118, 34]]
    : [[80, 64, 46], [44, 96, 32], [116, 94, 32], [80, 30, 30], [60, 120, 26], [102, 122, 26], [30, 70, 22], [130, 66, 22]];
  for (const [x, y, r] of blobs) { const [px] = P(x, y); c.circ(px, y, r, ">"); }
  for (const [x, y, r] of blobs) { const [px] = P(x, y); c.circ(px + 4, y + 6, Math.max(2, r - 10), "<"); }   // shade, lower right
  for (const [x, y, r] of blobs) { const [px] = P(x, y); c.circ(px - Math.round(r * 0.25), y - Math.round(r * 0.25), Math.round(r * 0.55), "="); }   // light, upper left
  for (const [x, y, r] of blobs) { const [px] = P(x, y); c.circ(px - Math.round(r * 0.45), y - Math.round(r * 0.45), Math.max(1, Math.round(r * 0.2)), "+"); }
  // leaf clumps along the lit edges (each a small bump with a highlight)
  for (const [x, y, r] of blobs) for (let i = 0; i < 5; i++) {
    const a = -2.6 + i * 0.45, lx = Math.round(x + Math.cos(a) * (r - 3)), ly = Math.round(y + Math.sin(a) * (r - 3)), [px] = P(lx, ly);
    c.circ(px, ly, 3, "="); c.px(px - 1, ly - 1, "+");
  }
  if (kind === "b") for (const [x, y] of [[60, 50], [96, 40], [112, 84], [46, 92], [80, 96], [70, 24], [124, 104], [36, 118], [100, 120], [86, 66]]) {
    const [px] = P(x, y); c.px(px, y, "P"); c.px(px + 1, y, "9"); c.px(px, y + 1, "9");               // blossoms
  }
  if (kind === "a") { const [px] = P(118, 140); c.ellipse(px, 140, 5, 7, "v"); c.ellipse(px, 141, 3, 4, "w"); c.px(px, 134, "~"); }   // a beehive in the crown
}
anim("tree_a", { w: 160, h: 240, frames: 4, fps: 2, outline: "k" }, (c) => bigTree(c, "a"));
anim("tree_b", { w: 160, h: 240, frames: 4, fps: 2, outline: "k" }, (c) => bigTree(c, "b"));
