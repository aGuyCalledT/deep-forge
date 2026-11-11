// The mountain itself: natural grey stone that gets harder and darker with depth, rock that the miners dig out,
// raw caves they leave behind, and what grows in a cave nobody uses.

// A tiny seeded random number generator, so every build draws the same stones.
function caveRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Four bands of rock, every two floors one harder band (Rules.DIG_DEPTH). 64 x 64 tiles that wrap on all sides.
//   0 soft limestone in thin layers, 1 sandstone in thick beds, 2 blotchy granite with quartz veins, 3 basalt columns.
var BANDS = [
  { base: "5", shade: "4", lit: "6", gap: "3" },
  { base: "4", shade: "3", lit: "5", gap: "2" },
  { base: "3", shade: "2", lit: "4", gap: "1" },
  { base: "2", shade: "1", lit: "3", gap: "k" },
];

// smooth value noise that wraps every 64 px (lattice of `cells` x `cells`)
function wrapNoise(r, cells) {
  const g = []; for (let i = 0; i < cells * cells; i++) g.push(r());
  const v = (i, j) => g[((j % cells + cells) % cells) * cells + ((i % cells + cells) % cells)];
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / 64 * cells, fy = y / 64 * cells, i = Math.floor(fx), j = Math.floor(fy), u = s(fx - i), w = s(fy - j);
    return (v(i, j) * (1 - u) + v(i + 1, j) * u) * (1 - w) + (v(i, j + 1) * (1 - u) + v(i + 1, j + 1) * u) * w;
  };
}

function stoneTile(name, band, seed) {
  const B = BANDS[band], r = caveRng(seed);
  const shared = caveRng(band * 77 + 1);   // the same blotches in every variant of a band, so neighbouring tiles join
  const N = wrapNoise(shared, 4), M = wrapNoise(shared, 8);
  const P = (c, x, y, k) => c.px(((x % 64) + 64) % 64, ((y % 64) + 64) % 64, k);
  // a crack: a wandering dark line with a lit pixel under it, from where the rock gave way
  const crackLine = (c, x, y, len, dx, dy) => {
    for (let s = 0; s < len; s++) {
      P(c, x, y, B.gap); P(c, x + (dy ? 1 : 0), y + (dx ? 1 : 0), B.lit);
      if (dx) { x += dx; if (r() < 0.35) y += r() < 0.5 ? -1 : 1; } else { y += dy; if (r() < 0.35) x += r() < 0.5 ? -1 : 1; }
    }
  };
  sprite(name, { w: 64, h: 64 }, (c) => {
    c.rect(0, 0, 64, 64, B.base);
    if (band === 0 || band === 1) {
      // bedding planes: wavy layers, a dark seam on top of each with light just under it
      const beds = band === 0 ? [0, 9, 17, 28, 36, 47, 55] : [0, 21, 43];
      const wave = (x, k) => Math.round(Math.sin((x / 64) * Math.PI * 2 * (1 + (k % 2)) + k) * (band === 0 ? 1.5 : 2.5));
      beds.forEach((y0, k) => {
        const next = beds[k + 1] ?? 64;
        for (let x = 0; x < 64; x++) {
          const y = y0 + wave(x, k);
          if (k % 2 === 1) for (let yy = y + 1; yy < next + wave(x, k + 1); yy++) if (N(x, yy) > 0.45) P(c, x, yy, B.shade);   // every other bed is darker in patches
          P(c, x, y, B.gap); P(c, x, y + 1, B.lit);
        }
        // vertical joints across a bed, where it cracked as it dried
        for (let j = 0; j < (band === 0 ? 2 : 3); j++) {
          const x = Math.floor(r() * 64), h = (next - y0) - 2;
          for (let yy = 1; yy < h; yy++) { const xx = x + (yy % 5 === 0 ? 1 : 0); P(c, xx, y0 + wave(x, k) + yy + 1, B.shade); }
        }
      });
      if (band === 1) {
        // cross-bedding: thin slanted lines inside the thick beds, the old sand dunes
        for (let i = 0; i < 6; i++) { const x0 = Math.floor(r() * 64), y0 = 3 + Math.floor(r() * 55); for (let k = 0; k < 9; k++) P(c, x0 + k, y0 + Math.floor(k / 3), B.shade); }
        // a few pebbles caught in the sand
        for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 62), y = Math.floor(r() * 62); P(c, x, y, B.lit); P(c, x + 1, y, B.lit); P(c, x, y + 1, B.base); P(c, x + 1, y + 1, B.gap); }
      }
    }
    if (band === 2) {
      // granite: big blotches of lighter and darker stone, coarse grains (it is granular), a quartz vein
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const n = N(x, y) * 0.7 + M(x, y) * 0.3;
        if (n > 0.62) P(c, x, y, B.lit); else if (n < 0.36) P(c, x, y, B.shade);
      }
      for (let i = 0; i < 40; i++) P(c, Math.floor(r() * 64), Math.floor(r() * 64), r() < 0.5 ? B.gap : "5");
      if (seed % 3 === 0) for (let x = 0; x < 64; x++) {
        const y = Math.round(x * 0.5 + 20 + Math.sin(x / 6) * 2);
        P(c, x, y, "6"); P(c, x, y + 1, "5"); if (x % 11 === 3) P(c, x, y, "7");
      }
    }
    if (band === 3) {
      // basalt: tall columns, lit on the left, cut across now and then
      const cols = [0, 13, 24, 38, 50];
      cols.forEach((x0, k) => {
        const x1 = cols[k + 1] ?? 64;
        for (let y = 0; y < 64; y++) { P(c, x0, y, B.gap); P(c, x0 + 1, y, B.lit); P(c, x1 - 1, y, B.shade); }
        for (const yc of [Math.floor(r() * 64), Math.floor(r() * 64)]) for (let x = x0 + 1; x < x1; x++) { P(c, x, yc, B.gap); P(c, x, yc + 1, B.lit); }
        if (r() < 0.5) for (let y = 0; y < 64; y++) if (N(x0 + 4, y) > 0.6) P(c, x0 + 3 + (y % 7 === 0 ? 1 : 0), y, B.shade);
      });
    }
    // one or two long cracks per tile
    for (let i = 0; i < 1 + (seed % 2); i++) {
      if (band === 3) crackLine(c, Math.floor(r() * 64), Math.floor(r() * 64), 10, 1, 0);
      else crackLine(c, Math.floor(r() * 64), Math.floor(r() * 64), 8 + Math.floor(r() * 10), 0, 1);
    }
  });
}
for (let b = 0; b < 4; b++) for (let v = 0; v < 3; v++) stoneTile("stone_" + b + "_" + v, b, 1000 * (b + 1) + 37 * v + 3);

// ---------------------------------------------------------------- a cell the miners dug out: 24 x 96, rough and empty
// The ceiling is uneven (transparent above it, so the rock shows), the back wall carries pick marks, rubble lies on
// the floor. Both ends are 7 px high so cells next to each other join.
var CAVE = [
  { wall: "3", mark: "4", deep: "2", floor: "2", pebble: "4" },
  { wall: "3", mark: "2", deep: "2", floor: "2", pebble: "4" },
  { wall: "2", mark: "3", deep: "1", floor: "1", pebble: "3" },
  { wall: "1", mark: "2", deep: "k", floor: "1", pebble: "3" },
];
function caveCell(name, band, seed) {
  const P = CAVE[band], r = caveRng(seed);
  sprite(name, { w: 24, h: 96 }, (c) => {
    const top = [];
    for (let x = 0; x < 24; x++) top.push(7 + Math.round(Math.sin((x + seed % 7) / 3.2) * 2 * Math.sin(x / 23 * Math.PI) + Math.sin(x / 23 * Math.PI) * 3));
    for (let x = 0; x < 24; x++) {
      c.vline(x, top[x], 96 - top[x], P.wall);
      c.px(x, top[x], P.deep); c.px(x, top[x] + 1, P.deep);         // the dark lip under the ceiling
    }
    // pick marks: short slanted strokes where the pick bit into the wall, in rows like the miner swung
    for (let row = 0; row < 6; row++) for (let i = 0; i < 2; i++) {
      const x = 2 + Math.floor(r() * 18), y = top[x] + 8 + row * 12 + Math.floor(r() * 5);
      c.line(x, y, x + 2, y + 3, P.mark);
      c.px(x + 1, y + 3, P.deep);
    }
    // the floor: packed rubble, a few loose stones
    c.rect(0, 89, 24, 7, P.floor); c.hline(0, 89, 24, P.deep);
    for (let i = 0; i < 4; i++) { const x = 1 + Math.floor(r() * 21), y = 90 + Math.floor(r() * 4); c.rect(x, y, 2, 1, P.pebble); c.px(x, y + 1, P.deep); }
    for (let i = 0; i < 2; i++) { const x = 2 + Math.floor(r() * 19); c.rect(x, 86, 3, 3, P.mark); c.hline(x, 86, 3, P.pebble); c.px(x + 2, 88, P.deep); }
  });
}
for (let b = 0; b < 4; b++) for (let v = 0; v < 2; v++) caveCell("cave_" + b + "_" + v, b, 41 * b + 17 * v + 5);

// rounded ends where a hallway or cave meets rock, in each band's stone colour
for (let b = 0; b < 4; b++) {
  sprite("cap_l_" + b, { w: 8, h: 96 }, (c) => {
    for (let y = 7; y < 96; y++) { const d = y < 22 ? Math.round((22 - y) * 0.55) : 0; c.hline(0, y, Math.min(8, 2 + d), BANDS[b].base); c.px(Math.min(7, 1 + d), y, BANDS[b].shade); }
  });
  sprite("cap_r_" + b, { base: "cap_l_" + b, flip: "x" });
}

// ---------------------------------------------------------------- a marked cell: cracks spread as the pick works
function digCrack(name, stage) {
  sprite(name, { w: 24, h: 96 }, (c) => {
    const r = caveRng(stage * 11 + 7);
    const arms = [[12, 48, -1, -1], [12, 48, 1, -1], [12, 48, 1, 1], [12, 48, -1, 1], [12, 48, 0, -1], [12, 48, 0, 1]];
    arms.slice(0, 2 + stage * 2).forEach(([x0, y0, dx, dy]) => {
      let x = x0, y = y0;
      for (let s = 0; s < 6 + stage * 6; s++) {
        c.px(x, y, "k");
        if (r() < 0.6) y += dy || (r() < 0.5 ? -1 : 1) * 1; else x += dx || (r() < 0.5 ? -1 : 1);
        if (x < 1 || x > 22 || y < 8 || y > 90) break;
      }
    });
    if (stage >= 2) for (let i = 0; i < 5; i++) { const x = 6 + Math.floor(r() * 12), y = 36 + Math.floor(r() * 26); c.rect(x, y, 2, 2, "1"); c.px(x, y, "k"); }   // chipped-out bits
    c.rect(10, 46, 4, 4, "1"); c.px(11, 47, "k"); c.px(12, 47, "k");   // where the pick bites
  });
}
for (let s = 0; s < 3; s++) digCrack("dig_crack_" + s, s);

// ---------------------------------------------------------------- an unused cave overgrows: moss, mushrooms, roots, webs
// Stage 1 after a few hours, 2 after most of a day, 3 after a day (Rules.OVERGROW_HOURS). Each stage adds to the last.
sprite("_tuft", { w: 3, h: 2 }, ".h.\nGhG");
sprite("_tuft2", { w: 5, h: 2 }, ".h.H.\nGGhGG");
sprite("_shroom", { w: 3, h: 4 }, "PpP\n.c.\n.c.\n.c.");
sprite("_shroom2", { w: 5, h: 5 }, ".PPP.\nP9PpP\n..c..\n..c..\n..c..");
sprite("_glow", { w: 5, h: 5 }, ".NNN.\nNnNnN\n..c..\n..c..\n..c..");
function overgrow(name, stage, seed) {
  sprite(name, { w: 24, h: 96 }, (c) => {
    const r = caveRng(seed);
    // moss along the floor, creeping up the wall
    for (let x = 0; x < 24; x += 1 + Math.floor(r() * 3)) { c.px(x, 89, "G"); if (r() < 0.5) c.px(x, 88, "h"); }
    for (let i = 0; i < 2 + stage * 2; i++) c.stamp(r() < 0.5 ? "_tuft" : "_tuft2", Math.floor(r() * 20), 86 + Math.floor(r() * 2));
    // patches of moss climbing the back wall from the floor
    for (let i = 0; i < stage * 2; i++) {
      // a soft cushion: a few overlapping round clumps, lighter on top where the lamp light falls
      const x = 2 + Math.floor(r() * 18), h = 3 + stage * 3 + Math.floor(r() * 5);
      for (let k = 0; k < 3 + stage; k++) {
        const cx = x + Math.floor((r() - 0.5) * 6), cy = 88 - Math.floor(r() * h), rad = 1 + Math.floor(r() * 2);
        c.circ(cx, cy, rad, "G"); c.px(cx, cy - rad, "h"); if (rad > 1) c.px(cx - 1, cy - rad + 1, "h");
      }
    }
    // drips of moss under the ceiling
    for (let i = 0; i < 2 + stage; i++) { const x = 1 + Math.floor(r() * 22); c.vline(x, 9, 1 + Math.floor(r() * (stage + 1)), "G"); }
    if (stage >= 2) {
      // roots hanging from the ceiling, a few mushrooms by the wall
      for (let i = 0; i < 2; i++) {
        let x = 3 + Math.floor(r() * 18);
        const len = 10 + Math.floor(r() * 16);
        for (let y = 8; y < 8 + len; y++) { c.px(x, y, y % 4 ? "~" : "v"); if (r() < 0.25) x += r() < 0.5 ? -1 : 1; x = Math.max(0, Math.min(23, x)); }
      }
      for (let i = 0; i < 3; i++) c.stamp(r() < 0.6 ? "_shroom" : "_shroom2", 1 + Math.floor(r() * 19), r() < 0.5 ? 85 : 84);
    }
    if (stage >= 3) {
      // a thick carpet, pale glowing caps and a cobweb in a top corner
      c.rect(0, 88, 24, 2, "G"); for (let x = 0; x < 24; x += 2) c.px(x, 87, "h");
      for (let i = 0; i < 2; i++) c.stamp("_glow", 2 + Math.floor(r() * 17), 83);
      const left = seed % 2 === 0, ox = left ? 0 : 23, sx = left ? 1 : -1;
      for (let k = 0; k < 9; k++) { c.px(ox + sx * k, 9 + Math.floor(k * 0.3), "7"); c.px(ox, 9 + k, "7"); }   // the threads to the walls
      for (const k of [3, 6]) for (let j = 0; j <= k; j++) c.px(ox + sx * (k - j), 9 + j, "6");                 // the rings between them
    }
  });
}
for (let s = 1; s <= 3; s++) for (let v = 0; v < 2; v++) overgrow("grow_" + s + "_" + v, s, 97 * s + 13 * v + 1);
