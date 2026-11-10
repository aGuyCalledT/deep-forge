// Enemies, two frames each. Drawn by Figure (figure.js) in the same style as the dwarves: flat colours,
// texture with a cause (fur, plates, scales, cracks, crystals), coloured inner lines, soft outlines.
for (const id of ["giant_rat", "cave_crawler", "cave_spider", "goblin_scouts", "rock_troll", "magma_crab", "blind_ogre", "crystal_golem", "deep_wyrm"]) {
  for (const f of [0, 1]) {
    const img = Figure.monster(id, f);
    sprite("mon_" + id + "_" + f, { w: img.w, h: img.h }, (c) => {
      img.data.forEach((col, k) => { if (col) c.px(k % img.w, (k / img.w) | 0, col); });
    });
  }
}
