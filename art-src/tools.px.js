// Tools for every job, 14x14 + outline = 16x16, like the goods icons.
// Metal parts use the metal placeholders (m M x X, dark..light) and are recoloured per metal; wood is w W v V.
//
// Every tool is mirror-symmetric about its own axis. The diagonal tools lie on the anti-diagonal from the bottom
// left (0, 13) to the top right (13, 0), working end at the top right. They are drawn in axis coordinates:
//   s = x - y        position along the axis (-13 at the butt of the haft, +13 in the top right corner)
//   a = |13 - x - y| distance from the axis (in diagonal steps)
// A shape that depends only on s and a is symmetric by construction. The light falls along the axis, from the
// top right, so the shading is symmetric as well: edges facing the tip are bright, edges facing the haft dark.

/** Paint a diagonal tool: fn(s, a) returns a key or null. */
function diag(c, fn) {
  for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
    const k = fn(x - y, Math.abs(13 - x - y));
    if (k) c.px(x, y, k);
  }
}

/** The wooden haft on the axis up to s = top: a light core, darker flanks, a dark butt. */
function haft(s, a, top, from = -13) {
  if (a > 1 || s > top || s < from) return null;
  if (s <= -11) return a === 0 ? "W" : "w";
  return a === 0 ? "V" : "v";
}

/** A vertical tool or gem: draw the left half (x <= cx), mirror it to the right. */
function mirrorX(c, cx) {
  for (let y = 0; y < 14; y++) for (let x = 0; x < cx; x++) {
    const k = c.key(x, y), m = 2 * cx - x;
    if (m < 14) c.px(m, y, k || "_");
  }
}

function grid(c, x, y, rows) {
  rows.trim().split("\n").forEach((r, j) => [...r.trim()].forEach((k, i) => { if (k !== ".") c.px(x + i, y + j, k); }));
}

const TOOL = {
  // a miner's pick: a curved head with two points, square to the haft, bowed towards the tip
  pickaxe: (c) => diag(c, (s, a) => {
    if (a <= 10) {
      const mid = 7.6 - 0.05 * a * a, half = a <= 3 ? 2.1 : a <= 7 ? 1.6 : 1.1;
      const o = s - mid;
      if (Math.abs(o) <= half + 0.01) return a >= 9 ? "M" : o > 0.6 ? "X" : o < -0.6 ? "m" : a <= 1 ? "M" : "x";
    }
    return haft(s, a, 6);
  }),
  // the smith's sledge: a heavy block across the haft, a striking face at each end
  hammer: (c) => diag(c, (s, a) => {
    if (a <= 4 && s >= 1 && s <= 8) {
      if (a === 4) return s >= 5 ? "X" : "x";   // the two striking faces
      if (a === 3) return "m";                  // the chamfer before each face
      if (s === 8) return "x";
      if (s === 1) return "m";
      return a === 0 && s >= 4 && s <= 6 ? "m" : "M";   // the wedge in the eye
    }
    return haft(s, a, 0);
  }),
  // the founder's ladle: an iron rod with a wooden grip and a round bowl of glowing metal at the end
  ladle: (c) => diag(c, (s, a) => {
    const r = Math.hypot(s - 5, a);   // distance from the bowl's centre in axis steps
    if (r <= 6.2) return r > 5 ? (s > 5 ? "X" : "m") : r > 3.8 ? (s > 5 ? "x" : "M") : (s - 5) + a * 0 > 0.5 && r < 2.5 ? "Y" : "y";
    if (a === 0 && s >= -6) return "x";
    return haft(s, a, -7);
  }),
  // the sickle: a crescent blade, horns pointing to the tip, on a short haft
  sickle: (c) => diag(c, (s, a) => {
    const out = Math.hypot(s - 3.5, a), inn = Math.hypot(s - 6.5, a);
    if (out <= 6.8 && inn > 5.2) return out > 5.8 ? "m" : inn < 6.3 ? "X" : "x";
    if (a <= 1 && s >= -1 && s < -2 + 1.5) return "m";
    if (a <= 2 && s >= -3 && s < -1) return "m";
    return haft(s, a, -3);
  }),
  // the chisel: a round wooden handle, a metal ferrule, a narrow shank and a flared, bevelled edge
  chisel: (c) => diag(c, (s, a) => {
    if (s >= 11 && a <= 2) return s >= 12 ? "X" : "x";
    if (s >= 9 && a <= 2) return a === 2 ? "M" : "x";
    if (s >= 1 && a <= 1) return a === 0 ? "x" : "M";
    if (s >= -2 && s < 1 && a <= 2) return s >= 0 ? "X" : "m";
    if (s < -2 && s >= -12 && a <= 2) return a === 2 ? "W" : s <= -11 ? "W" : a === 0 ? "V" : "v";
    return null;
  }),
  // the wizard's staff: claws on the end of the staff hold a glowing gem
  staff: (c) => diag(c, (s, a) => {
    const r = Math.hypot(s - 7, a);
    if (r <= 3.3) return r <= 1.6 ? (s >= 7 ? "9" : "N") : s >= 7 ? "n" : "B";
    if (a >= 3 && a <= 4 && s >= 4 && s <= 8) return s >= 7 ? "x" : "M";   // the claws
    if (a <= 2 && s >= 2 && s < 4) return "m";
    return haft(s, a, 3);
  }),
  // the merchant's scales: a post, a beam, two pans on cords; the left half, mirrored
  scales: (c) => {
    grid(c, 0, 0, `
      ......X
      .....xX
      ......M
      .XxxxxX
      .X....M
      .x....M
      x.x...M
      x.x...M
      XxxM..M
      .mm...M
      ......M
      .....xM
      ...XxxM
      ...mmmm`);
    mirrorX(c, 6);
  },
};
for (const [k, fn] of Object.entries(TOOL)) sprite("item_" + k, { w: 14, h: 14, outline: "k" }, fn);

// Gems: a brilliant cut seen from the side, mirror-symmetric about the middle column (x = 7). D M L W are dark,
// mid, light and white of the gem's colours; the facet lines of the pavilion meet in the point below.
const GEM_HALF = `
  ....LLLL
  ...LWLLL
  ..LMLLMW
  .MMMMMMM
  .DMMLMML
  ..DMMLML
  ...DMMLL
  ....DMML
  .....DML
  ......DL
  .......D`;
function gem(c, [d, m, l, w]) {
  const map = { D: d, M: m, L: l, W: w };
  GEM_HALF.trim().split("\n").forEach((r, j) => [...r.trim()].forEach((k, i) => { if (k !== ".") c.px(i, j + 1, map[k]); }));
  mirrorX(c, 7);
}
const SCHOOL_GEM = { earth: ["~", "^", "@", "C"], fire: [";", "?", "&", "*"], steel: ["b", "B", "n", "N"], hearth: ["-", "$", "|", ":"], gold: ["o", "O", "j", "8"] };
for (const [school, cols] of Object.entries(SCHOOL_GEM)) sprite("gem_" + school, { w: 14, h: 14, outline: "k" }, (c) => gem(c, cols));
sprite("raw_cut_gem", { w: 14, h: 14, outline: "k" }, (c) => gem(c, ["h", "H", "J", "C"]));
