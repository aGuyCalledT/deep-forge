// Gems after Dwarf Fortress: the 22 cuts and a rough crystal, 13x14 + outline = 15x16.
// Drawn in four grey placeholders (SWAP.gem in shared.js, dark..light) plus a white sparkle; the game recolours
// them with the colour of the gem's kind (Gems.java, sprites.js gem()). Every cut is mirror-symmetric about the
// middle column (x = 6): only the left half is computed, and each pixel is painted on both sides.
//
// Face-on cuts are drawn from a mask: the rim catches the light at the top and falls dark at the bottom, the
// crown facets one step lighter, the table in the middle flat with a white sparkle. Cabochons are smooth domes.
// Side views (brilliant, rose, single, table) and the point and trillion are drawn as half grids.

const GD = "#40404a", GM = "#70707a", GL = "#a8a8b2", GW = "#e6e6ee", GS = "#ffffff";
const GEMKEY = { D: GD, M: GM, L: GL, W: GW, S: GS };
const GCX = 6;   // the middle column

/** Fill the left half from a mask m(dx, y) and a painter p(dx, y, depth), then mirror. depth: steps to the edge. */
function cut(c, mask, paint) {
  const inside = (x, y) => x >= 0 && x < 13 && y >= 0 && y < 14 && mask(Math.abs(x - GCX), y);
  const depth = (x, y) => {
    let d = 0;
    for (; d < 7; d++) {
      let edge = false;
      for (let oy = -d - 1; oy <= d + 1 && !edge; oy++)
        for (let ox = -d - 1; ox <= d + 1 && !edge; ox++)
          if (Math.abs(ox) + Math.abs(oy) <= d + 1 && !inside(x + ox, y + oy)) edge = true;
      if (edge) break;
    }
    return d;
  };
  for (let y = 0; y < 14; y++) for (let x = 0; x <= GCX; x++) {
    if (!inside(x, y)) continue;
    const k = paint(GCX - x, y, depth(x, y));
    if (k) { c.px(x, y, GEMKEY[k] || k); c.px(2 * GCX - x, y, GEMKEY[k] || k); }
  }
}

/** A half grid (7 columns, x 0..6, the last is the middle) at row y0, mirrored. */
function half(c, y0, rows) {
  rows.trim().split("\n").forEach((r, j) => [...r.trim()].forEach((k, i) => {
    if (k === ".") return;
    c.px(i, y0 + j, GEMKEY[k] || k);
    c.px(2 * GCX - i, y0 + j, GEMKEY[k] || k);
  }));
}

/** Faceted face-on: rim and crown shaded top-light/bottom-dark, a flat table with a sparkle near its top. */
function facets(top, bottom, opts = {}) {
  const mid = (top + bottom) / 2;
  return (dx, y, d) => {
    const up = y < mid - 0.5, down = y > mid + 0.5;
    if (d === 0) return up ? "L" : down ? "D" : "M";
    if (d === 1) return up ? "W" : down ? "M" : "L";
    if (opts.star && (dx === Math.abs(Math.round(y - mid)) && dx > 0)) return up ? "L" : "D";   // brilliant: facet lines
    if (opts.steps && d === 2) return up ? "L" : "M";                                          // step cut: a second ring
    if (dx === 0 && Math.round(top + (opts.steps ? 3 : 2)) === y) return "S";
    if (dx <= 1 && Math.round(top + (opts.steps ? 3 : 2)) === y) return "W";
    return "M";
  };
}

/** A smooth dome: light from the top, a soft highlight, a dark lower rim. */
function dome(cy, ry) {
  return (dx, y, d) => {
    const v = (y - cy) / ry;                       // -1 top .. 1 bottom
    if (d === 0) return v > 0.2 ? "D" : "M";
    if (v < -0.35 && dx <= 1 && d >= 2) return dx === 0 && v < -0.5 ? "S" : "W";
    if (v < -0.1) return "L";
    if (v < 0.55) return "M";
    return "D";
  };
}

const ellipse = (cy, rx, ry) => (dx, y) => (dx / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

/** A rounded or chamfered rectangle: half-width w, rows y0..y1, corners cut by c steps. */
function box(w, y0, y1, c) {
  return (dx, y) => y >= y0 && y <= y1 && dx <= w && (dx - (w - c)) + Math.max(0, Math.max(y0 + c - y, y - (y1 - c))) <= c;
}

const GEM_CUTS = {
  // --- side views
  round_brilliant: (c) => half(c, 1, `
    ...LLLL
    ..LWLLS
    .LMLLML
    MMMMMMM
    DMMLMML
    .DMMLML
    ..DMMLL
    ...DMML
    ....DML
    .....DL
    ......D`),
  rose: (c) => half(c, 2, `
    ......S
    ....LLW
    ...LWLL
    ..LMLWL
    .LMMLML
    MMMMMLM
    DMMMMMM
    .DDDDDD`),
  single: (c) => half(c, 2, `
    ..WWWWS
    .LLLLLL
    MMMMMMM
    .DMMMML
    ..DMMML
    ...DMML
    ....DML
    .....DM
    ......D`),
  table: (c) => half(c, 3, `
    ...WWWS
    ..LLWWW
    .LLLLLL
    MMMMMMM
    DMMMMMM
    .DDMMMM
    ...DDMM
    .....DD`),
  // --- pointed shapes
  point: (c) => half(c, 0, `
    ......W
    .....LW
    ....LLW
    ...LLLW
    ..LLLLS
    .LLLLLW
    MMMMMMM
    .DMMMMM
    ..DMMMM
    ...DMMM
    ....DMM
    .....DM
    ......D`),
  trillion: (c) => half(c, 1, `
    ......L
    .....LL
    .....LW
    ....LWW
    ....LWS
    ...LMWW
    ...LMMW
    ..LMMMM
    ..MMMMM
    .MMDDDD
    .DDDDDD`),
  // --- face-on faceted cuts
  baguette: (c) => cut(c, box(3, 0, 13, 0), facets(0, 13, { steps: true })),
  tapered_baguette: (c) => cut(c, (dx, y) => y >= 0 && y <= 13 && dx <= 2 + Math.round(y * 2 / 13), facets(0, 13, { steps: true })),
  emerald: (c) => cut(c, box(4, 0, 13, 1), facets(0, 13, { steps: true })),
  radiant: (c) => cut(c, box(4, 0, 13, 2), facets(0, 13, { star: true })),
  square: (c) => cut(c, (dx, y) => y >= 1 && dx <= 5 && (y <= 8 || dx <= 5 - Math.round((y - 8) * 1.4)) && y <= 12, facets(1, 12, { steps: true })),
  square_brilliant: (c) => cut(c, (dx, y) => y >= 1 && dx <= 5 && (y <= 8 || dx <= 5 - Math.round((y - 8) * 1.4)) && y <= 12, facets(1, 12, { star: true })),
  cushion: (c) => cut(c, box(5, 1, 12, 2), facets(1, 12, { star: true })),
  octagon: (c) => cut(c, box(5, 1, 12, 3), facets(1, 12, { steps: true })),
  oval: (c) => cut(c, ellipse(6.5, 4.6, 6.6), facets(0, 13, { star: true })),
  marquise: (c) => cut(c, (dx, y) => dx <= 4.6 * Math.sin(Math.PI * (y + 0.5) / 14) - 0.3, facets(0, 13, { star: true })),
  pear: (c) => cut(c, (dx, y) => (y >= 7 ? Math.hypot(dx, y - 7.5) <= 5.3 : dx <= (y + 0.5) * 0.72), facets(0, 13, { star: true })),
  briolette: (c) => cut(c, (dx, y) => (y >= 8 ? Math.hypot(dx * 1.15, y - 8.5) <= 4.8 : dx <= (y + 0.5) * 0.5), facets(0, 13, { star: true })),
  // --- cabochons
  round_cabochon: (c) => cut(c, ellipse(6.5, 5.6, 5.6), dome(6.5, 5.6)),
  oval_cabochon: (c) => cut(c, ellipse(6.5, 4.4, 6.6), dome(6.5, 6.6)),
  cushion_cabochon: (c) => cut(c, box(5, 1, 12, 2), dome(6.5, 5.5)),
  rectangular_cabochon: (c) => cut(c, box(4, 0, 13, 1), dome(6.5, 6.5)),
};
for (const [k, fn] of Object.entries(GEM_CUTS)) sprite("gemcut_" + k, { w: 13, h: 14, outline: "k" }, fn);

// A rough gem: a crystal point between two smaller ones, on a bit of matrix rock.
sprite("gem_rough", { w: 13, h: 14, outline: "k" }, (c) => half(c, 0, `
  ......S
  .....LW
  .....LW
  .L...LW
  LW..LLW
  LW..LMW
  LMM.LMM
  LMM.LMM
  MMMDMMM
  DMMDMMM
  DMMDMMM
  .DD3DDM
  .3443DD
  ..3443.`));
