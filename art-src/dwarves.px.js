// Dwarves, drawn pixel by pixel and stacked from parts by the game: body (3 builds x poses), beard, hair,
// hat, accessory, tool. Two views: front (idle, sit, drink, sleep) and side, facing right (walk, work, mine, climb).
// Every part is 18 x 26 before the outline (hats 18 x 30, drawn 4 px higher), so they line up when stacked.
// Head parts are drawn at head height 0; the game moves them down by DWARF.bob[pose][frame].
// Colour placeholders (recoloured per dwarf): skin a A i, beard r R t, hair d D E, tunic T L K, metal m M x X.

const DW = 18, DH = 26;

/** Draw rows of keys at (x, y). "." = nothing. */
function grid(c, x, y, rows) {
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== "." && row[i] !== " ") c.px(x + i, y + j, row[i]); });
}
/** Mirror the left half (cols 0..8) onto the right (cols 9..17). */
function mirrorRows(half) { return half.map((r) => r + [...r].reverse().join("")); }

// ------------------------------------------------------------------ heads

// Front: big round head, eyes with a shine, bulb nose, rosy cheeks. Brows come with the hair part.
const HEAD_FRONT = mirrorRows([
  ".....aAAA",
  "...aAAiiA",
  "..aAAiiAA",
  "..aAiAAAA",
  ".aAAAAAAA",
  ".aAAAAAAA",
  "aAAAeeAAA",
  "aAAAeeAAi",
  ".aAAAAAAi",
  "..aPPAAAA",
  "..aAAAAaa",
  "...aAAAAa",
  "....aaaaa",
]);
const HEAD_FRONT_SLEEP = HEAD_FRONT.map((r, j) => (j === 6 ? r.replace(/ee/g, "AA") : j === 7 ? r.replace(/ee/g, "aa") : r));

// Side, facing right: the nose leads.
const HEAD_SIDE = [
  "......aAAAA.......",
  "....aAAAiiAA......",
  "...aAAiiAAAAA.....",
  "...aAiAAAAAAAA....",
  "..aAAAAAAAAAAA....",
  "..aAAAAAAAAAAAA...",
  "..aAaaAAAAAeeAA...",
  "..aAaAAAAAAeeAAi..",
  "..aAAAAAAAAAAAAii.",
  "...aAAAAAAAPPAAAAi",
  "...aAAAAAAAAAAaaa.",
  "....aAAAAAAAAAA...",
  ".....aaaaaaaaa....",
];

function head(c, view, dy, sleep) {
  const rows = view === "front" ? (sleep ? HEAD_FRONT_SLEEP : HEAD_FRONT) : HEAD_SIDE;
  grid(c, 0, dy, rows);
  if (view === "front" && !sleep) { c.px(4, 6 + dy, "C"); c.px(12, 6 + dy, "C"); }   // shine in both eyes
  if (view === "side") c.px(11, 6 + dy, "C");
}

// ------------------------------------------------------------------ bodies

// builds: half width of the torso and belly roundness
const BUILDS = [
  { w: 7, belly: 0, legs: 2 },   // stout
  { w: 6, belly: 0, legs: 3 },   // tall
  { w: 8, belly: 1, legs: 2 },   // round
];

function torsoFront(c, b, y0) {
  // tunic with soft folds; light from the top left
  const cx = 9, top = y0, h = 8;
  for (let j = 0; j < h; j++) {
    const w = b.w + (b.belly && j >= 2 && j <= 5 ? 1 : 0) - (j === 0 ? 1 : 0);
    for (let i = -w; i < w; i++) {
      const x = cx + i;
      let k = "L";
      if (i === -w) k = "K"; else if (i >= w - 2) k = "T";
      if (j === 0 && i < -w + 3) k = "K";
      c.px(x, top + j, k);
    }
  }
  // belt with a gold buckle
  const by = top + 5, bw = b.w + b.belly;
  for (let i = -bw; i < bw; i++) c.px(cx + i, by, "%");
  c.rect(cx - 1, by, 2, 1, "j"); c.px(cx - 1, by, "8");
  // tunic hem
  for (let i = -bw; i < bw; i++) c.px(cx + i, top + h - 1, i % 3 === 0 ? "T" : "L");
  // arms hang at the sides, hands peek out
  c.rect(cx - bw - 2, top + 1, 2, 5, "L"); c.px(cx - bw - 2, top + 1, "K");
  c.rect(cx + bw, top + 1, 2, 5, "T");
  c.rect(cx - bw - 2, top + 6, 2, 2, "A"); c.px(cx - bw - 2, top + 6, "i");
  c.rect(cx + bw, top + 6, 2, 2, "a");
}

function legsFront(c, b, y0, seated) {
  if (seated) {
    // sitting: boots point at us
    c.rect(4, y0, 4, 2, "l"); c.rect(10, y0, 4, 2, "I");
    c.rect(4, y0 + 2, 4, 2, "S"); c.rect(10, y0 + 2, 4, 2, "S"); c.px(4, y0 + 2, "%"); c.px(10, y0 + 2, "%");
    return;
  }
  for (let j = 0; j < b.legs; j++) { c.rect(5, y0 + j, 3, 1, "l"); c.rect(10, y0 + j, 3, 1, "I"); }
  const by = y0 + b.legs;
  c.rect(4, by, 4, 3, "S"); c.rect(10, by, 4, 3, "S");
  c.hline(4, by, 3, "%"); c.hline(10, by, 3, "%");       // boot highlight
  c.hline(4, by + 2, 4, "w"); c.hline(10, by + 2, 4, "w"); // sole
}

function torsoSide(c, b, y0, armY) {
  const x0 = 5, w = 8 + b.belly;
  for (let j = 0; j < 8; j++) for (let i = 0; i < w; i++) {
    let k = "L";
    if (i === 0) k = "T"; else if (i >= w - 2) k = "K";
    if (b.belly && j >= 2 && j <= 5 && i === w - 1) k = "K";
    c.px(x0 + i, y0 + j, k);
  }
  if (b.belly) for (let j = 2; j <= 5; j++) c.px(x0 + w, y0 + j, "K");
  c.hline(x0, y0 + 5, w, "%"); c.px(x0 + w - 2, y0 + 5, "j");
  // the near arm: armY = hand height (relative), or null
  if (armY !== null) {
    const ax = x0 + 3;
    const top = Math.min(y0 + 1, y0 + armY), bot = Math.max(y0 + 1, y0 + armY);
    c.rect(ax, top, 2, bot - top + 1, "T"); c.vline(ax + 1, top, bot - top + 1, "L");
    c.rect(ax, y0 + armY, 2, 2, "A"); c.px(ax + 1, y0 + armY, "i");
  }
}

function legsSide(c, b, y0, step) {
  // step: [front leg dx, back leg dx]
  const [fd, bd] = step;
  for (let j = 0; j < b.legs; j++) { c.rect(6 + bd, y0 + j, 3, 1, "l"); c.rect(9 + fd, y0 + j, 3, 1, "I"); }
  const by = y0 + b.legs;
  c.rect(5 + bd, by, 4, 3, "S"); c.rect(9 + fd, by, 5, 3, "S");
  c.hline(9 + fd, by, 4, "%"); c.hline(5 + bd, by, 3, "%");
  c.hline(5 + bd, by + 2, 4, "w"); c.hline(9 + fd, by + 2, 5, "w");
}

const VIEW = { idle: "front", sit: "front", drink: "front", sleep: "front", walk: "side", work: "side", mine: "side", climb: "side" };

function body(name, b, pose, f) {
  sprite(name, { w: DW, h: DH, outline: "k" }, (c) => {
    const dy = DWARF.bob[pose][f];
    const view = VIEW[pose];
    const seated = pose === "sit" || pose === "drink" || pose === "sleep";
    const lift = b.legs - 2;            // tall dwarves stand a pixel higher
    const ty = 13 - lift + (seated ? 3 : 0);
    if (view === "front") {
      legsFront(c, b, seated ? 22 : 21 - lift, seated);
      torsoFront(c, b, ty);
      head(c, "front", dy - lift, pose === "sleep");
      if (pose === "drink" && f === 0) { c.rect(11, ty - 2, 2, 3, "T"); c.rect(11, ty - 3, 2, 1, "A"); }   // mug arm up
      return;
    }
    const steps = { walk: [[2, -1], [0, 0], [-1, 2], [0, 0]], climb: [[1, 0], [0, 1]] };
    legsSide(c, b, 21 - lift, (steps[pose] || [[0, 0]])[f] || [0, 0]);
    const arm = pose === "work" ? (f ? 4 : -4) : pose === "mine" ? (f ? 5 : -5) : pose === "climb" ? -4 - f : pose === "walk" ? [4, 5, 6, 5][f] : 5;
    torsoSide(c, b, ty, arm);
    head(c, "side", dy - lift);
  });
}

BUILDS.forEach((b, i) => {
  for (const [pose, n] of Object.entries(DWARF.poses))
    for (let f = 0; f < n; f++) body(`dw_body${i}_${pose}_${f}`, b, pose, f);
});

// ------------------------------------------------------------------ beards (r dark, R mid, t light)
// Strands run downwards; a moustache sits under the nose.

function strands(c, x0, x1, y0, y1, seed) {
  for (let x = x0; x <= x1; x++) if ((x + seed) % 3 === 0) c.vline(x, y0 + ((x + seed) % 2), y1 - y0 - ((x * 7 + seed) % 3), "r");
  for (let x = x0 + 1; x <= x1; x += 4) c.px(x, y0 + 1, "t");
}

function beardShape(c, rows, y) { grid(c, 0, y, rows); }

const BEARDS_FRONT = [
  // 0 full and round
  (c) => { beardShape(c, mirrorRows(["...RRRRRR", "..RRRRRRR", "..RRRRRRR", "..RRRRRRR", "...RRRRRR", "....RRRRR", ".....rrrr"]), 10); strands(c, 3, 14, 11, 16, 0); },
  // 1 long to the belt
  (c) => { beardShape(c, mirrorRows(["...RRRRRR", "..RRRRRRR", "..RRRRRRR", "..RRRRRRR", "...RRRRRR", "...RRRRRR", "....RRRRR", "....RRRRR", ".....RRRR", "......rrr"]), 10); strands(c, 3, 14, 11, 19, 1); },
  // 2 forked
  (c) => { beardShape(c, mirrorRows(["...RRRRRR", "..RRRRRRR", "..RRRRRRR", "..RRRRRRR", "...RRRRR.", "...RRRR..", "....RRR..", "....rr..."]), 10); strands(c, 3, 14, 11, 16, 2); },
  // 3 braided with gold beads
  (c) => { beardShape(c, mirrorRows(["...RRRRRR", "..RRRRRRR", "..RRRRRRR", "...RRRRRR", "......RRR", "......RRR", "......ooo", "......RRR", "......jjj", ".......RR"]), 10); strands(c, 3, 14, 11, 13, 0); },
  // 4 huge and fluffy
  (c) => { beardShape(c, mirrorRows(["..RRRRRRR", ".RRRRRRRR", "RRRRRRRRR", "RRRRRRRRR", ".RRRRRRRR", ".RRRRRRRR", "..RRRRRRR", "...rRRRRR", ".....rrrr"]), 9); strands(c, 1, 16, 10, 17, 1); for (const x of [2, 5, 12, 15]) c.px(x, 11, "t"); },
  // 5 big moustache only
  (c) => { beardShape(c, mirrorRows([".......RR", "...tRRRRR", "..RRRRRrr", "..rr....."]), 9); },
  // 6 short goatee
  (c) => { beardShape(c, mirrorRows(["....RRRRR", ".......RR", ".......RR", "........r"]), 10); },
  // 7 wizard-long to the knees
  (c) => { beardShape(c, mirrorRows(["...RRRRRR", "..RRRRRRR", "..RRRRRRR", "..RRRRRRR", "...RRRRRR", "...RRRRRR", "...RRRRRR", "....RRRRR", "....RRRRR", ".....RRRR", ".....RRRR", "......RRR", ".......rr"]), 10); strands(c, 3, 14, 11, 21, 2); },
];

const BEARDS_SIDE = [
  (c) => { grid(c, 7, 10, ["....RRRRRR.", "..RRRRRRRRR", ".RRRRRRRRRR", ".RRRRRRRRR.", "..RRRRRRR..", "...RRRRR...", "....rrr...."]); strands(c, 8, 16, 11, 16, 0); },
  (c) => { grid(c, 7, 10, ["....RRRRRR.", "..RRRRRRRRR", ".RRRRRRRRRR", ".RRRRRRRRR.", ".RRRRRRRRR.", "..RRRRRRRR.", "..RRRRRRR..", "...RRRRRR..", "....RRRR...", ".....rr...."]); strands(c, 8, 16, 11, 19, 1); },
  (c) => { grid(c, 7, 10, ["....RRRRRR.", "..RRRRRRRRR", ".RRRRRRRRRR", ".RRRRRRRRR.", "..RRR..RRR.", "..RR....RR.", "..rr....rr."]); strands(c, 8, 16, 11, 14, 2); },
  (c) => { grid(c, 7, 10, ["....RRRRRR.", "..RRRRRRRRR", ".RRRRRRRRRR", "..RRRRRRRR.", "......RRR..", "......ooo..", "......RRR..", "......jjj..", ".......R..."]); strands(c, 8, 16, 11, 13, 0); },
  (c) => { grid(c, 6, 9, ["...RRRRRRRR.", ".RRRRRRRRRRR", "RRRRRRRRRRRR", "RRRRRRRRRRRR", ".RRRRRRRRRR.", ".RRRRRRRRRR.", "..RRRRRRRR..", "....rrrrr..."]); strands(c, 7, 17, 10, 16, 1); },
  (c) => { grid(c, 11, 9, ["...RRR", "tRRRRR", "RRRRrr", "rr...."]); },
  (c) => { grid(c, 12, 10, ["RRRR.", "..RR.", "..RR.", "...r."]); },
  (c) => { grid(c, 7, 10, ["....RRRRRR.", "..RRRRRRRRR", ".RRRRRRRRRR", ".RRRRRRRRR.", ".RRRRRRRRR.", "..RRRRRRRR.", "..RRRRRRRR.", "...RRRRRRR.", "...RRRRRR..", "....RRRRR..", "....RRRR...", ".....RR....", ".....rr...."]); strands(c, 8, 16, 11, 21, 2); },
];

// a moustache over every full beard
function moustache(c, view) {
  if (view === "front") grid(c, 0, 9, mirrorRows(["....RRRtR", "...RRRRRR", "...r....."]));
  else grid(c, 11, 9, ["..RRRR.", "RRRRRRt", "r....r."]);
}

for (const view of ["front", "side"]) {
  const list = view === "front" ? BEARDS_FRONT : BEARDS_SIDE;
  list.forEach((fn, i) => sprite(`dw_beard_${view}_${i}`, { w: DW, h: DH, outline: "k" }, (c) => {
    fn(c);
    if (i !== 5 && i !== 6) moustache(c, view);
  }));
}

// ------------------------------------------------------------------ hair (d dark, D mid, E light) and brows

const HAIR = {
  front: [
    (c) => { c.rect(5, 0, 8, 1, "i"); },   // bald: a shiny scalp
    (c) => grid(c, 0, 0, mirrorRows(["....DDDDD", "..DDDDEED", "..DDEEDDD", ".DDDDDDDD", ".DD......", ".D......."])),
    (c) => grid(c, 0, -1, mirrorRows([".....D..D", "...DDDDDD", "..DDEEDED", ".DDDEDDDD", ".DDDDDDDD", "DDD......", ".D......."])),
    (c) => grid(c, 0, 0, mirrorRows(["....DDDDD", "..DDEEEDD", ".DDEDDDDD", ".DDDDDDDD", "DDD......", "DD.......", "DD.......", "DD.......", "DD.......", "Dd.......", "d........"])),
    (c) => { grid(c, 0, 0, mirrorRows(["....DDDDD", "..DDDEEDD", ".DDDDDDDD", ".DD......"])); grid(c, 6, -3, [".DDDD.", "DDEEDD", "DDDDDd", ".dddd."]); },
    (c) => grid(c, 0, 0, mirrorRows(["....DDDDD", "..DDDEEDD", ".DDDDDDDD", ".DD......", ".D.......", "DD.......", "Do.......", "DD.......", "Do.......", ".D......."])),
  ],
  side: [
    (c) => { c.rect(6, 0, 6, 1, "i"); },
    (c) => grid(c, 2, 0, ["...DDDDDD...", ".DDDDEEDDD..", "DDDDDDEDDDD.", "DDDDDDD.....", "DDDD........", "DD.........."]),
    (c) => grid(c, 2, -1, ["...D.D..D...", ".DDDDDDDDD..", "DDDDEEDEDDD.", "DDDDDDDDDD..", "DDDDD.......", "DD.........."]),
    (c) => grid(c, 1, 0, ["....DDDDDD...", "..DDDDDEEDD..", ".DDDDDDDEDDD.", "DDDDDDDD.....", "DDDDD........", "DDDD.........", "DDD..........", "DDD..........", "DDd..........", "Dd...........", "d............"]),
    (c) => { grid(c, 2, 0, ["...DDDDDD...", ".DDDDDEEDD..", "DDDDDDDDDDD.", "DDDD........"]); grid(c, 1, -2, [".DDD.", "DDEDD", "DDDDd", ".ddd."]); },
    (c) => grid(c, 2, 0, ["...DDDDDD...", ".DDDDDEEDD..", "DDDDDDDDDDD.", "DDDD........", "DDD.........", ".DD.........", ".Do.........", ".DD.........", ".D.........."]),
  ],
};
// bushy brows go with every hair style (also bald ones), drawn in the hair colour
function brows(c, view) {
  if (view === "front") { grid(c, 3, 4, ["dDDd"]); grid(c, 11, 4, ["dDDd"]); }
  else grid(c, 10, 4, ["dDDd"]);
}
for (const view of ["front", "side"]) HAIR[view].forEach((fn, i) => sprite(`dw_hair_${view}_${i}`, { w: DW, h: DH, outline: "k" }, (c) => { fn(c); brows(c, view); }));

// ------------------------------------------------------------------ hats (own colours). Canvas 18 x 30, the game draws it 4 px higher.

function hatCanvas(fn) { return (c) => fn({ grid: (x, y, rows) => grid(c, x, y + 4, rows) }); }

const HATS = {
  front: [
    () => {},
    (h) => h.grid(0, -1, mirrorRows(["....GGGGG", "..GGhhGGG", ".GGhGGGGG", ".GGGGGGGG", "GGG......", "GG.......", "GG.......", "Gg......."])),                     // hood
    (h) => h.grid(0, -2, mirrorRows(["....OOOOO", "..OOjjOOO", ".OOjOOOOO", ".OOOOOOYY", "ooooooo0Y", "ooooooooo"])),                                        // miner helmet + lamp
    (h) => h.grid(0, -4, mirrorRows([".......99", "......999", "....ppppp", "..ppPPppp", ".pppPpppp", ".PPPPPPPP", ".PpPpPpPp"])),                                // beanie + pompom
    (h) => h.grid(0, -6, [".........BBn......", "........BBBB......", ".......BBBnB......", "......BBBBBBB.....", "....BBBBnBBBBB....", "..bbbbbbbbbbbbbb..", ".bbbbbbbbbbbbbbbb."]),   // pointy felt cap
    (h) => { h.grid(0, -2, mirrorRows(["....55555", "..5566555", ".55655555", ".55555555", "444444444"])); h.grid(0, -6, mirrorRows(["C........", "cC.......", "cc.......", ".cc......", "..cc....."])); }, // horned helm
  ],
  side: [
    () => {},
    (h) => h.grid(1, -1, ["....GGGGGG...", "..GGGhhGGGG..", ".GGGhGGGGGGG.", "GGGGGGGGGGGG.", "GGGG.........", "GGG..........", "GGG..........", "Gg..........."]),
    (h) => h.grid(2, -2, ["...OOOOOO...", ".OOOjjOOOOO.", "OOOjOOOOOOYY", "ooooooooooY0", "oooooooooooo"]),
    (h) => h.grid(2, -4, ["..99........", ".999........", "..ppppppp...", ".ppPPppppp..", "pppPpppppp..", "PPPPPPPPPP..", "PpPpPpPpPp.."]),
    (h) => h.grid(1, -6, [".BBn.........", "..BBBB.......", "...BBBnB.....", "....BBBBBB...", "...BBBBnBBBB.", "bbbbbbbbbbbbbb", ".bbbbbbbbbbbb."]),
    (h) => { h.grid(2, -2, ["...555555...", ".55566555...", "5556555555..", "5555555555..", "44444444444."]); h.grid(2, -6, ["C.....", "cC....", "cc....", ".cc...", "..cc.."]); },
  ],
};
for (const view of ["front", "side"]) HATS[view].forEach((fn, i) => sprite(`dw_hat_${view}_${i}`, { w: DW, h: DH + 4, outline: i ? "k" : undefined }, hatCanvas(fn)));

// ------------------------------------------------------------------ accessories

const ACCS = {
  front: [
    () => {},
    (c) => grid(c, 11, 11, ["vvvV", "...W", "...W"]),                                             // pipe
    (c) => grid(c, 3, 5, ["oooo..oooo", "oNNo..oNNo", "oooooooooo"].map((r) => r.padEnd(12, "."))), // glasses
    (c) => grid(c, 4, 12, [".P.", "PjP", ".P.", ".h."]),                                             // flower in the beard
    (c) => grid(c, 1, 8, ["j", "8"]),                                                               // earring
  ],
  side: [
    () => {},
    (c) => grid(c, 15, 10, ["vvV", "..W", "..W"]),
    (c) => grid(c, 10, 5, ["ooooo", "oNNoo", "ooooo"]),
    (c) => grid(c, 10, 12, [".P.", "PjP", ".P.", ".h."]),
    (c) => grid(c, 5, 8, ["j", "8"]),
  ],
};
for (const view of ["front", "side"]) ACCS[view].forEach((fn, i) => sprite(`dw_acc_${view}_${i}`, { w: DW, h: DH, outline: i ? "k" : undefined }, (c) => fn(c)));

// ------------------------------------------------------------------ tools in hand (side view, near hand), metal placeholders recolour

function pick(c, up) {
  if (up) { c.line(9, 4, 15, 0, "v"); c.line(10, 5, 16, 1, "W"); grid(c, 12, 0, ["xMMMm", "M...M"]); }
  else { c.line(9, 18, 15, 22, "v"); c.line(9, 19, 15, 23, "W"); grid(c, 13, 20, ["Mx", "MM", ".m"]); }
}
sprite("dw_tool_mine_0", { w: DW, h: DH, outline: "k" }, (c) => pick(c, true));
sprite("dw_tool_mine_1", { w: DW, h: DH, outline: "k" }, (c) => pick(c, false));
sprite("dw_tool_work_0", { w: DW, h: DH, outline: "k" }, (c) => { c.vline(9, 3, 7, "v"); grid(c, 8, 1, ["566", "555"]); });
sprite("dw_tool_work_1", { w: DW, h: DH, outline: "k" }, (c) => { c.hline(10, 19, 5, "v"); grid(c, 14, 17, ["56", "55", "55"]); });
sprite("dw_tool_drink_0", { w: DW, h: DH, outline: "k" }, (c) => grid(c, 10, 11, ["CCCC", "uuuuV", "uyyuV", "uuuu."]));
sprite("dw_tool_drink_1", { w: DW, h: DH, outline: "k" }, (c) => grid(c, 14, 18, ["CCC", "uuuV", "uyuV", "uuu."]));
sprite("dw_tool_axe", { w: DW, h: DH, outline: "k" }, (c) => { c.vline(15, 9, 13, "v"); grid(c, 15, 7, ["xMM", "XMM", "MMm", ".m."]); });
sprite("dw_tool_sack", { w: DW, h: DH, outline: "k" }, (c) => grid(c, 13, 16, [".VV.", "uuuu", "uujuu", "uuuuu", ".uuu."]));
