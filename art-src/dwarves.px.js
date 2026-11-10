// Dwarves, built from parts that the game stacks and recolours: body (3 builds x poses), beard, hair,
// hat, accessory, tool. Every part is 16x24 before the outline, so they line up when stacked.
// Facing right. Feet on the bottom row. Head parts are drawn at head height 0; the game moves them
// down by DWARF.bob[pose][frame].

const DW = 16, DH = 24;

// body builds: torso x range, leg length
const BUILDS = [
  { x0: 3, x1: 12, lift: 0 },   // stout
  { x0: 4, x1: 11, lift: 1 },   // tall (head and torso one pixel higher)
  { x0: 2, x1: 13, lift: 0 },   // round
];

function drawHead(c, dy, eyes = "open") {
  // round, slightly too big head (cute), light from the top left
  c.rect(3, 2 + dy, 10, 9, "A");
  c.rect(4, 1 + dy, 8, 1, "A");
  c.rect(4, 2 + dy, 4, 2, "i");
  c.rect(12, 3 + dy, 1, 7, "a");
  c.rect(3, 9 + dy, 10, 2, "a");
  c.px(2, 6 + dy, "a"); c.px(2, 7 + dy, "A");     // ear
  // big round nose
  c.rect(10, 6 + dy, 3, 3, "A");
  c.px(13, 7 + dy, "A");
  c.px(10, 6 + dy, "i"); c.px(11, 6 + dy, "i");
  c.rect(10, 8 + dy, 4, 1, "a");
  if (eyes === "open") {
    c.rect(7, 4 + dy, 1, 2, "e"); c.rect(10, 4 + dy, 1, 2, "e");
    c.px(7, 4 + dy, "C"); c.px(10, 4 + dy, "C");  // shine
  } else {
    c.rect(6, 5 + dy, 2, 1, "a"); c.rect(9, 5 + dy, 2, 1, "a");
  }
  c.px(5, 7 + dy, "P"); c.px(6, 7 + dy, "9");      // rosy cheek
}

function drawTorso(c, b, dy) {
  const y0 = 11 + dy - b.lift;
  c.rect(b.x0, y0, b.x1 - b.x0 + 1, 8, "L");
  c.rect(b.x0, y0, 1, 8, "K");
  c.rect(b.x1, y0, 1, 8, "T");
  c.rect(b.x0, y0 + 7, b.x1 - b.x0 + 1, 1, "T");
  c.rect(b.x0, y0 + 5, b.x1 - b.x0 + 1, 1, "%");  // belt
  c.rect(7, y0 + 5, 2, 1, "j");                   // buckle
  c.px(7, y0 + 2, "K");                           // stitching
  c.px(8, y0 + 3, "K");
}

function drawLegs(c, b, pose) {
  // pose: "stand" | [front dx, back dx] for walking
  const y = 19 - b.lift;
  if (pose === "stand") {
    c.rect(5, y, 2, 3 + b.lift, "l"); c.rect(9, y, 2, 3 + b.lift, "I");
    c.rect(4, 22, 3, 2, "S"); c.rect(9, 22, 3, 2, "S");
    c.px(6, 22, "%"); c.px(11, 22, "%");
  } else {
    const [fd, bd] = pose;
    c.rect(5 + bd, y, 2, 3 + b.lift, "l"); c.rect(9 + fd, y, 2, 3 + b.lift, "I");
    c.rect(4 + bd, 22, 3, 2, "S"); c.rect(9 + fd, 22, 3, 2, "S");
    c.px(11 + fd, 22, "%");
  }
}

function drawSeated(c, b) {
  c.rect(5, 19, 7, 2, "l"); c.rect(9, 19, 4, 2, "I");
  c.rect(11, 21, 3, 3, "S"); c.rect(6, 21, 3, 3, "S");
}

function arm(c, x, y, len, col = "L") {
  c.rect(x, y, 2, len, col);
  c.rect(x, y + len, 2, 2, "A");
}

function body(name, b, pose, frame) {
  sprite(name, { w: DW, h: DH, outline: "k" }, (c) => {
    const dy = DWARF.bob[pose][frame];
    const seated = pose === "sit" || pose === "drink" || pose === "sleep";
    if (seated) {
      drawSeated(c, b);
      drawTorso(c, b, 3);
      drawHead(c, dy - b.lift, pose === "sleep" ? "closed" : "open");
      if (pose === "drink" && frame === 0) arm(c, 11, 11, 2, "T");      // mug to the mouth
      else arm(c, b.x1, 15, 2, "T");
      return;
    }
    if (pose === "walk") drawLegs(c, b, [[1, -1], [0, 0], [-1, 1], [0, 0]][frame]);
    else if (pose === "climb") drawLegs(c, b, frame ? [0, 1] : [1, 0]);
    else drawLegs(c, b, "stand");
    drawTorso(c, b, 0);
    drawHead(c, dy - b.lift);
    const ay = 12 - b.lift;
    if (pose === "work") frame === 0 ? arm(c, b.x1, ay - 5, 3, "T") : arm(c, b.x1, ay, 3, "T");
    else if (pose === "mine") frame === 0 ? arm(c, b.x1 - 1, ay - 6, 4, "T") : arm(c, b.x1, ay + 1, 3, "T");
    else if (pose === "climb") { arm(c, b.x0 - 1, ay - 4 + frame, 3, "K"); arm(c, b.x1, ay - 3 - frame, 3, "T"); }
    else if (pose === "walk") arm(c, b.x1, ay + (frame % 2), 3, "T");
    else arm(c, b.x1, ay + 1, 3, "T");
  });
}

BUILDS.forEach((b, i) => {
  for (const [pose, n] of Object.entries(DWARF.poses))
    for (let f = 0; f < n; f++) body(`dw_body${i}_${pose}_${f}`, b, pose, f);
});

// ---- beards (r dark, R mid, t light). Drawn at head height 0.
const BEARDS = [
  (c) => { c.rect(4, 8, 9, 3, "R"); c.rect(5, 11, 7, 2, "R"); c.rect(4, 8, 2, 2, "t"); c.rect(6, 12, 5, 1, "r"); },
  (c) => { c.rect(4, 8, 9, 4, "R"); c.rect(5, 12, 7, 3, "R"); c.rect(6, 15, 5, 2, "R"); c.rect(7, 17, 3, 1, "r");
           c.rect(5, 9, 1, 4, "t"); c.px(8, 13, "r"); c.px(9, 15, "r"); },
  (c) => { c.rect(4, 8, 9, 4, "R"); c.rect(5, 12, 3, 3, "R"); c.rect(9, 12, 3, 3, "R"); c.rect(5, 15, 2, 1, "r"); c.rect(10, 15, 2, 1, "r");
           c.rect(5, 9, 1, 3, "t"); },
  (c) => { c.rect(4, 8, 9, 4, "R"); c.rect(7, 12, 3, 6, "R"); c.px(7, 13, "t"); c.px(8, 15, "t"); c.px(9, 17, "t");
           c.rect(7, 14, 3, 1, "o"); c.rect(7, 17, 3, 1, "j"); c.px(8, 18, "R"); },
  (c) => { c.rect(3, 8, 11, 5, "R"); c.rect(4, 13, 9, 2, "R"); c.rect(3, 8, 2, 3, "t"); c.rect(5, 9, 2, 1, "t"); c.rect(5, 14, 7, 1, "r"); c.px(13, 10, "r"); },
  (c) => { c.rect(6, 8, 7, 1, "R"); c.px(5, 9, "R"); c.px(13, 9, "R"); c.px(6, 8, "t"); c.rect(6, 10, 6, 1, "r"); },
  (c) => { c.rect(6, 8, 7, 1, "R"); c.rect(8, 10, 3, 2, "R"); c.px(9, 12, "R"); c.px(9, 13, "r"); },
  (c) => { c.rect(4, 8, 9, 4, "R"); c.rect(5, 12, 7, 4, "R"); c.rect(6, 16, 5, 3, "R"); c.rect(7, 19, 3, 2, "R"); c.px(8, 21, "r");
           c.rect(5, 9, 1, 6, "t"); c.px(7, 14, "t"); c.px(9, 17, "r"); c.px(8, 12, "r"); },
];
BEARDS.forEach((fn, i) => sprite(`dw_beard_${i}`, { w: DW, h: DH, outline: "k" }, (c) => {
  fn(c);
  // mustache on top for the full styles
  if (i !== 5 && i !== 6) { c.rect(6, 8, 6, 1, "R"); c.px(6, 8, "t"); c.px(9, 9, "r"); }
}));

// ---- hair (d dark, D mid, E light)
const HAIRS = [
  () => {},                                                                  // bald
  (c) => { c.rect(4, 1, 8, 2, "D"); c.rect(3, 2, 2, 4, "D"); c.rect(5, 1, 3, 1, "E"); },
  (c) => { c.rect(4, 1, 8, 2, "D"); c.px(5, 0, "D"); c.px(8, 0, "E"); c.px(10, 0, "D"); c.rect(3, 2, 2, 5, "d"); c.px(6, 1, "E"); },
  (c) => { c.rect(4, 1, 8, 2, "D"); c.rect(2, 2, 3, 10, "D"); c.rect(2, 3, 1, 8, "d"); c.px(5, 1, "E"); c.px(3, 2, "E"); },
  (c) => { c.rect(4, 1, 8, 2, "D"); c.rect(6, 0, 4, 1, "D"); c.rect(7, 0, 2, 1, "E"); c.rect(3, 2, 2, 3, "d"); },
  (c) => { c.rect(4, 1, 8, 2, "D"); c.rect(2, 4, 2, 7, "D"); c.px(2, 6, "o"); c.px(2, 9, "o"); c.px(5, 1, "E"); c.rect(3, 2, 1, 2, "d"); },
];
HAIRS.forEach((fn, i) => sprite(`dw_hair_${i}`, { w: DW, h: DH, outline: i ? "k" : undefined }, (c) => fn(c)));

// ---- hats (own colours, not recoloured)
const HATS = [
  () => {},
  (c) => { c.rect(3, 0, 10, 4, "G"); c.rect(2, 2, 2, 7, "G"); c.rect(4, 0, 4, 1, "h"); c.rect(12, 3, 1, 2, "g"); c.px(3, 3, "h"); },   // hood
  (c) => { c.rect(3, 0, 10, 3, "O"); c.rect(2, 3, 12, 1, "o"); c.rect(4, 0, 4, 1, "j"); c.rect(11, 1, 2, 2, "Y"); c.px(12, 1, "0"); }, // miner helmet + lamp
  (c) => { c.rect(4, 0, 8, 3, "p"); c.rect(3, 3, 10, 1, "P"); c.rect(5, 0, 3, 1, "P"); c.rect(7, -1, 2, 1, "9"); c.px(8, -2, "9"); }, // beanie + pompom
  (c) => { c.rect(4, 1, 8, 2, "B"); c.rect(6, -1, 4, 2, "B"); c.rect(8, -3, 3, 2, "B"); c.px(11, -3, "n"); c.rect(3, 3, 10, 1, "b"); c.px(5, 1, "n"); }, // felt cap
  (c) => { c.rect(4, 0, 8, 3, "5"); c.rect(3, 3, 10, 1, "4"); c.rect(5, 0, 3, 1, "6"); c.rect(1, -1, 2, 3, "c"); c.px(1, -2, "C"); c.rect(13, -1, 2, 3, "c"); c.px(14, -2, "C"); c.rect(7, 3, 2, 2, "4"); }, // horned helm
];
HATS.forEach((fn, i) => sprite(`dw_hat_${i}`, { w: DW, h: DH + 3, outline: i ? "k" : undefined }, (c) => {
  // hats may stick out above the head: drawn 3 px lower on a taller canvas, the game offsets by -3
  const s = { rect: (x, y, w, h, k) => c.rect(x, y + 3, w, h, k), px: (x, y, k) => c.px(x, y + 3, k) };
  fn(s);
}));

// ---- accessories
const ACCS = [
  () => {},
  (c) => { c.rect(12, 9, 3, 1, "v"); c.rect(14, 7, 2, 2, "W"); c.px(14, 7, "V"); },                          // pipe
  (c) => { c.rect(6, 4, 2, 2, "o"); c.rect(9, 4, 2, 2, "o"); c.px(8, 4, "o"); c.px(7, 5, "N"); c.px(10, 5, "N"); }, // glasses
  (c) => { c.px(5, 11, "P"); c.px(4, 12, "P"); c.px(6, 12, "P"); c.px(5, 13, "P"); c.px(5, 12, "j"); },     // flower in the beard
  (c) => { c.px(3, 8, "j"); },                                                                                // earring
];
ACCS.forEach((fn, i) => sprite(`dw_acc_${i}`, { w: DW, h: DH, outline: i ? "k" : undefined }, (c) => fn(c)));

// ---- tools in hand, per pose frame (metal placeholders m..X recolour with the tool's metal)
function pickaxe(c, up) {
  if (up) { c.line(11, 0, 15, 8, "v"); c.rect(8, 0, 6, 1, "M"); c.px(7, 1, "M"); c.px(14, 1, "M"); c.px(9, 0, "X"); }
  else { c.line(12, 12, 15, 18, "v"); c.rect(13, 18, 3, 1, "M"); c.px(15, 19, "M"); c.px(15, 20, "m"); c.px(12, 17, "x"); }
}
sprite("dw_tool_mine_0", { w: DW, h: DH, outline: "k" }, (c) => pickaxe(c, true));
sprite("dw_tool_mine_1", { w: DW, h: DH, outline: "k" }, (c) => pickaxe(c, false));
sprite("dw_tool_work_0", { w: DW, h: DH, outline: "k" }, (c) => { c.vline(14, 2, 6, "v"); c.rect(13, 1, 3, 2, "5"); c.px(13, 1, "6"); });
sprite("dw_tool_work_1", { w: DW, h: DH, outline: "k" }, (c) => { c.hline(13, 16, 3, "v"); c.rect(15, 14, 1, 4, "5"); c.px(15, 14, "6"); });
sprite("dw_tool_drink_0", { w: DW, h: DH, outline: "k" }, (c) => { c.rect(12, 10, 3, 3, "u"); c.rect(12, 9, 3, 1, "C"); c.px(15, 11, "u"); });
sprite("dw_tool_drink_1", { w: DW, h: DH, outline: "k" }, (c) => { c.rect(13, 16, 3, 3, "u"); c.rect(13, 15, 3, 1, "C"); });
sprite("dw_tool_axe", { w: DW, h: DH, outline: "k" }, (c) => { c.vline(14, 6, 12, "v"); c.rect(14, 5, 2, 4, "M"); c.px(15, 5, "X"); c.px(13, 6, "x"); });
sprite("dw_tool_sack", { w: DW, h: DH, outline: "k" }, (c) => { c.rect(12, 14, 4, 5, "u"); c.rect(13, 13, 2, 1, "V"); c.px(13, 16, "j"); });
