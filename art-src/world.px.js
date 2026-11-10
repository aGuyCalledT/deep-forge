// Tiles and props for the hold, the surface and the mines.

// ---------------------------------------------------------------- rock around the rooms (warm, cut by hand)
sprite("rock", { w: 32, h: 32 }, (c) => {
  // rounded stones set in dark crevices, lit from the top left; wraps on all sides so it tiles
  c.rect(0, 0, 32, 32, "(");
  const px = (x, y, k) => c.px(((x % 32) + 32) % 32, ((y % 32) + 32) % 32, k);
  // rows: [y, height, [[x, width, dark?], ...]]
  const rows = [
    [0, 8, [[1, 9, 0], [11, 7, 1], [19, 13, 0]]],
    [8, 9, [[5, 11, 1], [17, 8, 0], [26, 11, 0]]],
    [17, 7, [[0, 6, 0], [7, 12, 0], [20, 9, 1], [30, 2, 0]]],
    [24, 8, [[3, 8, 0], [12, 6, 1], [19, 12, 0]]],
  ];
  for (const [y0, h, stones] of rows) for (const [x0, w0, dark] of stones) {
    const w = w0 - 1, hh = h - 1;   // one pixel crevice right and below
    const fill = dark ? ")" : "[", lit = dark ? "[" : "]", shade = dark ? "(" : ")";
    for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
      const corner = (i === 0 || i === w - 1) && (j === 0 || j === hh - 1);
      if (corner) continue;                                  // rounded corners
      let k = fill;
      if (j === 0 || (i === 0 && j < hh - 2)) k = lit;       // light on the top and left
      if (j === hh - 1 || (i === w - 1 && j > 1)) k = shade; // shade on the bottom and right
      px(x0 + i, y0 + j, k);
    }
    if (!dark && w > 6) { px(x0 + 2, y0 + 1, "{"); px(x0 + 3, y0 + 1, "{"); }   // a glint on the big stones
  }
});
sprite("rock_dark", { base: "rock", swap: { "]": "[", "[": ")", ")": "(" } });

// ---------------------------------------------------------------- hallway: a timbered tunnel, 16 x 64, tall enough for a dwarf in a hat
function hall(name, extra) {
  sprite(name, { w: 16, h: 64 }, (c) => {
    c.rect(0, 8, 16, 50, "W");                                   // back wall
    for (let x = 0; x < 16; x += 8) { c.vline(x, 8, 50, "w"); c.vline(x + 1, 8, 50, "v"); }
    c.rect(0, 6, 16, 3, "V"); c.hline(0, 6, 16, "u"); c.hline(0, 9, 16, "w");      // lintel
    c.rect(0, 58, 16, 6, "W"); c.hline(0, 58, 16, "V"); c.hline(0, 59, 16, "v");   // floor
    c.px(5, 61, "w"); c.px(12, 61, "w");
    if (extra) extra(c);
  });
}
hall("hall_a");
hall("hall_b", (c) => { c.rect(6, 11, 4, 1, "2"); c.rect(6, 12, 4, 4, "y"); c.rect(7, 13, 2, 2, "Y"); c.vline(6, 12, 4, "2"); c.vline(9, 12, 4, "2"); });   // lamp
hall("hall_c", (c) => { c.rect(3, 50, 9, 8, "V"); c.box(3, 50, 9, 8, "v"); c.hline(4, 51, 7, "u"); });                                            // crate
hall("hall_d", (c) => { c.rect(4, 32, 8, 6, "u"); c.box(4, 32, 8, 6, "v"); c.hline(5, 34, 6, "W"); c.px(8, 30, "4"); c.px(8, 31, "4"); });         // notice
hall("hall_e", (c) => { c.vline(2, 8, 50, "v"); c.vline(13, 8, 50, "v"); c.rect(1, 8, 3, 3, "V"); c.rect(12, 8, 3, 3, "V"); });                  // posts

// rounded tunnel ends (placed by the game where a hallway meets rock)
sprite("hall_cap_l", { w: 6, h: 64 }, (c) => { for (let y = 6; y < 64; y++) { const d = y < 16 ? Math.round((16 - y) * 0.6) : 0; c.hline(0, y, Math.min(6, 2 + d), "("); } });
sprite("hall_cap_r", { base: "hall_cap_l", flip: "x" });

// ---------------------------------------------------------------- stairs: 32 wide, two floors (128) tall, going down to the right
sprite("stairs", { w: 32, h: 128 }, (c) => {
  c.poly([0, 6, 32, 68, 32, 128, 0, 128, 0, 58], "_");
  // the cut in the rock, tall enough for a dwarf
  c.poly([0, 8, 12, 8, 32, 68, 32, 122, 20, 122, 0, 58], "W");
  for (let i = 0; i < 16; i++) {
    const x = Math.round(i * 2), y = 58 + Math.round(i * 4);
    c.rect(x, y, 4, 2, "V"); c.hline(x, y, 4, "u"); c.px(x + 3, y + 1, "v");
  }
  // railing
  c.line(4, 44, 34, 108, "v"); for (let i = 0; i < 5; i++) c.vline(6 + i * 6, 48 + i * 12, 10, "W");
});

// ---------------------------------------------------------------- mine shaft with ladder: 32 x 64
sprite("shaft", { w: 32, h: 64 }, (c) => {
  c.rect(0, 0, 32, 64, "(");
  c.rect(2, 0, 28, 64, "s");
  c.vline(2, 0, 64, "w"); c.vline(29, 0, 64, "w");
  c.vline(8, 0, 64, "v"); c.vline(23, 0, 64, "v");               // ladder rails
  for (let y = 4; y < 64; y += 8) { c.hline(9, y, 14, "V"); c.hline(9, y + 1, 14, "W"); }
  c.rect(2, 58, 28, 6, "W"); c.hline(2, 58, 28, "V");            // landing
  c.rect(0, 20, 3, 3, "V"); c.rect(29, 20, 3, 3, "V");
});

// ---------------------------------------------------------------- surface
sprite("door", { w: 26, h: 30, outline: "k" }, (c) => {
  c.rect(0, 6, 26, 24, "4"); c.ellipse(13, 7, 13, 7, "4");      // stone arch
  c.ellipse(13, 9, 9, 6, "W"); c.rect(4, 9, 18, 21, "W");
  for (let x = 6; x < 21; x += 4) c.vline(x, 4, 26, "v");
  c.px(18, 18, "j");                                             // door ring
  for (let i = 0; i < 6; i++) { const a = Math.PI + (i / 5) * Math.PI; c.px(Math.round(13 + Math.cos(a) * 12), Math.round(7 + Math.sin(a) * 6), "5"); }
});

sprite("stall", { w: 46, h: 34, outline: "k" }, (c) => {
  // striped awning
  for (let x = 0; x < 46; x += 6) { c.rect(x, 0, 3, 8, "f"); c.rect(x + 3, 0, 3, 8, "C"); }
  for (let x = 0; x < 46; x += 6) { c.px(x + 1, 8, "f"); c.px(x + 4, 8, "C"); }
  c.vline(2, 8, 26, "v"); c.vline(43, 8, 26, "v");
  c.rect(1, 22, 44, 4, "V"); c.hline(1, 22, 44, "u"); c.rect(3, 26, 40, 8, "W");
  // goods on the counter
  c.ellipse(10, 20, 3, 2, "F"); c.ellipse(16, 20, 3, 2, "y"); c.rect(24, 18, 5, 4, "6"); c.rect(32, 17, 6, 5, "j"); c.px(34, 18, "8");
  c.rect(18, 10, 11, 6, "u"); c.box(18, 10, 11, 6, "V"); c.circ(23, 13, 2, "O"); c.px(23, 13, "j");   // a coin on the sign
});

sprite("tent", { w: 40, h: 30, outline: "k" }, (c) => {
  c.poly([20, 0, 40, 30, 0, 30], "U");
  c.poly([20, 0, 30, 30, 20, 30], "u");
  c.poly([20, 10, 26, 30, 14, 30], "W");
  c.line(20, 0, 20, -3, "v");
  c.rect(20, -4, 6, 4, "B");                                     // little flag
  c.px(34, 28, "V"); c.px(6, 28, "V");
});

sprite("palisade", { w: 48, h: 28, outline: "k" }, (c) => {
  for (let x = 0; x < 48; x += 6) { c.rect(x, 4, 5, 24, "v"); c.vline(x, 4, 24, "V"); c.poly([x, 4, x + 2.5, 0, x + 5, 4], "v"); }
  c.rect(0, 14, 48, 2, "W"); c.rect(0, 22, 48, 2, "W");
});

sprite("stonewall", { w: 56, h: 40, outline: "k" }, (c) => {
  c.rect(0, 6, 56, 34, "4");
  for (let x = 0; x < 56; x += 8) c.rect(x, 0, 5, 7, "4");
  for (let y = 10; y < 40; y += 6) { c.hline(0, y, 56, "3"); for (let x = (y / 6) % 2 ? 0 : 6; x < 56; x += 12) c.vline(x, y, 6, "3"); }
  c.hline(0, 6, 56, "5");
  c.ellipse(28, 26, 9, 8, "W"); c.rect(19, 26, 19, 14, "W"); for (let x = 21; x < 37; x += 4) c.vline(x, 20, 20, "v");
  c.rect(26, 30, 4, 1, "j");
});

for (let i = 0; i < 2; i++) sprite("tree_" + i, { w: 30, h: 40, outline: "k" }, (c) => {
  c.rect(13, 24, 4, 16, "~"); c.vline(13, 24, 16, "^");
  const blobs = i ? [[15, 12, 11], [8, 18, 7], [22, 18, 7], [15, 5, 7]] : [[15, 14, 12], [9, 8, 7], [21, 9, 7]];
  for (const [x, y, r] of blobs) c.circ(x, y, r, ">");
  for (const [x, y, r] of blobs) c.circ(x - 2, y - 2, Math.max(1, r - 4), "=");
  c.px(9, 6, "+"); c.px(18, 10, "+"); c.px(12, 16, "+");
  if (i) { c.px(20, 15, "P"); c.px(10, 20, "P"); c.px(16, 8, "9"); }    // blossoms
});
sprite("bush", { w: 16, h: 10, outline: "k" }, (c) => { c.ellipse(8, 6, 8, 4, ">"); c.ellipse(6, 4, 4, 2, "="); c.px(11, 4, "P"); c.px(4, 6, "9"); });
sprite("flowers", { w: 9, h: 6 }, (c) => { c.vline(1, 2, 4, "<"); c.vline(4, 1, 5, "<"); c.vline(7, 3, 3, "<"); c.px(1, 1, "P"); c.px(4, 0, "j"); c.px(7, 2, "9"); });
sprite("signpost", { w: 16, h: 18, outline: "k" }, (c) => {
  c.vline(7, 4, 14, "~"); c.poly([1, 3, 12, 3, 15, 5.5, 12, 8, 1, 8], "^"); c.hline(1, 3, 11, "@");
  c.line(4, 7, 7, 4, "w"); c.rect(6, 4, 3, 1, "6");     // a little pickaxe painted on it
});

anim("wagon", { w: 34, h: 20, outline: "k", frames: 2, fps: 4 }, (c) => {
  c.ellipse(14, 6, 13, 6, "C"); c.rect(1, 6, 26, 2, "C"); c.ellipse(14, 6, 11, 4, "c");   // canvas top
  c.rect(1, 8, 26, 6, "V"); c.hline(1, 8, 26, "u"); c.vline(9, 8, 6, "v"); c.vline(19, 8, 6, "v");
  const f = c.frame;
  for (const x of [6, 22]) { c.circ(x, 15, 4, "W"); c.ring(x, 15, 4, "w"); c.px(x + (f ? 2 : -2), 15, "u"); c.px(x, 15 + (f ? 2 : -2), "u"); }
  // a pony, of course
  c.rect(27, 6, 6, 6, "~"); c.rect(30, 2, 3, 5, "~"); c.px(32, 3, "e"); c.vline(28, 12, 4 + f, "^"); c.vline(32, 12, 5 - f, "^"); c.px(29, 5, "w");
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
sprite("winch", { w: 30, h: 30, outline: "k" }, (c) => {
  c.line(2, 30, 13, 2, "v", 2); c.line(28, 30, 17, 2, "v", 2); c.rect(10, 0, 10, 3, "V");
  c.circ(15, 10, 7, "4"); c.ring(15, 10, 7, "2"); c.circ(15, 10, 2, "6");
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; c.line(15, 10, Math.round(15 + Math.cos(a) * 6), Math.round(10 + Math.sin(a) * 6), "5"); }
});
sprite("lock_sign", { w: 26, h: 18, outline: "k" }, (c) => {
  c.rect(0, 4, 26, 12, "V"); c.hline(0, 4, 26, "u"); c.vline(4, 16, 2, "v"); c.vline(21, 16, 2, "v");
  c.rect(10, 7, 6, 6, "j"); c.ring(13, 6, 2, "4"); c.px(13, 9, "o"); c.px(13, 10, "o");
});
