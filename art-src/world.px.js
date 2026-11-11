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

sprite("palisade", { w: 72, h: 42, outline: "k" }, (c) => {
  for (let x = 0; x < 72; x += 9) {
    c.rect(x, 6, 8, 36, "v"); c.vline(x, 6, 36, "V"); c.vline(x + 1, 6, 36, "V"); c.vline(x + 7, 6, 36, "W");
    c.poly([x, 6, x + 4, 0, x + 8, 6], "v"); c.px(x + 3, 2, "V");
    c.px(x + 4, 14 + (x % 3) * 6, "W");
  }
  c.rect(0, 20, 72, 3, "W"); c.hline(0, 20, 72, "v"); c.rect(0, 33, 72, 3, "W"); c.hline(0, 33, 72, "v");
});

sprite("stonewall", { w: 84, h: 60, outline: "k" }, (c) => {
  c.rect(0, 9, 84, 51, "4");
  for (let x = 0; x < 84; x += 12) { c.rect(x, 0, 8, 10, "4"); c.hline(x, 0, 8, "5"); }
  for (let y = 14, r = 0; y < 60; y += 8, r++) { c.hline(0, y, 84, "3"); for (let x = r % 2 ? 0 : 8; x < 84; x += 16) { c.vline(x, y, 8, "3"); c.hline(x + 1, y + 1, 6, "5"); } }
  c.hline(0, 9, 84, "5");
  c.ellipse(42, 38, 13, 11, "W"); c.rect(29, 38, 27, 22, "W"); for (let x = 32; x < 54; x += 5) c.vline(x, 30, 30, "v");
  c.rect(39, 44, 6, 2, "j");
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

anim("arrow", { w: 9, h: 11, outline: "k", frames: 2, fps: 3 }, (c) => {
  const y = c.frame;
  c.rect(3, y, 3, 5, "h"); c.poly([0, y + 5, 9, y + 5, 4.5, y + 10], "h"); c.vline(3, y, 5, "H"); c.px(4, y + 8, "J");
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
