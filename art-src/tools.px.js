// Tools for every job, 14x14 + outline = 16x16, like the goods icons.
// Metal parts use the metal placeholders (m M x X, dark..light) and are recoloured per metal; wood is w W v V.
// One rule for the whole set (common practice for small item icons): the handle runs diagonally from the
// bottom left to the top right, the working part sits at the top right, light comes from the top left, so the
// edges facing up and left are bright and the ones facing down and right are dark. No noise, few shades.

// a 2-px wooden haft from (x0, 13) up to row y1: light on the upper left, dark on the lower right
function haft(c, x0, y1, cap = true) {
  for (let y = 13, x = x0; y >= y1; y--, x++) { c.px(x, y, "V"); c.px(x + 1, y, "v"); c.px(x + 2, y, "W"); }
  if (cap) { c.px(x0, 13, "W"); c.px(x0 + 1, 13, "w"); c.px(x0 + 2, 13, "_"); }
}

// draw a grid of keys ('.' = nothing) at x, y
function grid(c, x, y, rows) {
  rows.trim().split("\n").forEach((r, j) => [...r.trim()].forEach((k, i) => { if (k !== ".") c.px(x + i, y + j, k); }));
}

const TOOL = {
  // a miner's pick: a curved, two-pointed head arcing round the top right corner, the haft square to it
  pickaxe: (c) => {
    haft(c, 0, 4);
    grid(c, 0, 0, `
      ...xXXXXX.....
      .xXXxxxxxXX...
      xMmm....mxxX..
      m.........MxX.
      ..........mMxX
      ...........MxX
      ...........MxM
      ............Mm
      ............Mm
      ............m.`);
  },
  // the smith's hammer: a heavy square head, flat face to the upper left and a narrow peen to the lower right
  hammer: (c) => {
    haft(c, 0, 6);
    // the head is a block turned square to the haft: striking face up left (lit), peen down right (dark)
    c.poly([2, 3, 5, 0, 13, 8, 10, 11], "M");
    c.line(5, 0, 12, 7, "x"); c.line(6, 0, 13, 7, "x");
    c.line(2, 3, 5, 0, "X"); c.line(3, 3, 5, 1, "X");
    c.line(3, 4, 9, 10, "m"); c.line(10, 11, 13, 8, "m");
    c.line(5, 4, 6, 3, "x"); c.px(9, 9, "m"); c.line(7, 6, 9, 4, "m");
  },
  // the founder's ladle: a deep iron bowl full of glowing metal on a long rod with a wooden grip
  ladle: (c) => {
    grid(c, 0, 0, `
      VV............
      VvW...........
      .vvW..........
      ..WwM.........
      ....xM........
      .....xM.......
      ......xM......
      .....yYYYyM...
      ....xYyyyYYM..
      ....XxyyyyxM..
      ....xMMMMMMm..
      .....xMMMMm...
      ......mmmm....`);
  },
  // the sickle: a thin crescent blade sweeping up and over from a short wooden grip
  sickle: (c) => {
    // a crescent round (8, 6): thick at the grip, thin towards the point
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      const dx = x + 0.5 - 8, dy = 6.5 - (y + 0.5), d = Math.hypot(dx, dy);
      let a = Math.atan2(dy, dx) * 180 / Math.PI; if (a < -90) a += 360;
      if (a < -50 || a > 215) continue;
      const t = (215 - a) / 265, th = 2.9 - 2.1 * t, rOut = 6.2 - 1.2 * t * t * t;
      if (d > rOut || d < rOut - th) continue;
      const outer = d > rOut - 0.95, inner = d < rOut - th + 0.95;
      c.px(x, y, outer ? (a > 45 ? "X" : "x") : inner ? (a > 110 ? "M" : "m") : (a > 80 ? "x" : "M"));
    }
    c.px(2, 10, "M"); c.px(3, 10, "m");
    for (let i = 0; i < 3; i++) { c.px(2 - i, 11 + i, "V"); c.px(3 - i, 11 + i, "v"); c.px(4 - i, 11 + i, "W"); }
  },
  // the mason's and jeweller's chisel: a round wooden handle with a metal ferrule, a flat blade with a bevelled edge
  chisel: (c) => {
    grid(c, 0, 0, `
      .........VVv..
      ........VVvvW.
      .......VVvvW..
      ......VVvvW...
      .....XxxMm....
      .....xMMm.....
      ....xMm.......
      ...xMm........
      ..xMm.........
      .xMm..........
      XxMm..........
      xxm...........
      Xm............
      ..............`);
  },
  // the merchant's scales: a beam on a post, two pans on cords; drawn half and mirrored
  scales: (c) => {
    grid(c, 0, 0, `
      ......X......
      .....xXM.....
      ......M......
      .XxxxxXxxxxM.
      .X....M....M.
      .x....M....M.
      x.x...M...M.m
      x.x...M...M.m
      XxxM..M..xxMm
      .mm...M...mm.
      .....xMm.....
      ....XxxMm....
      ....mmmmm....`);
  },
  // the wizard's staff: a crooked wooden staff whose metal claws hold a glowing gem
  staff: (c) => {
    haft(c, 0, 5);
    grid(c, 7, 0, `
      ..M..M.
      .MnNNMm
      ..N99nM
      .MnNnBm
      ..MbBm.
      .M.mm..`);
  },
};
for (const [k, fn] of Object.entries(TOOL)) sprite("item_" + k, { w: 14, h: 14, outline: "k", }, fn);
