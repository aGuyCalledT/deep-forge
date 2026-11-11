// Shared data for the art files AND the game (scripts/build-art.mjs writes it to static/art/meta.json).
// Plain JavaScript, no DSL calls here.

// Calm, cosy palette: dusk stone, warm wood, rose clay, sage plants, soft fire and cream.
var PAL = {
  k: "#1d1b2c",                                                          // outline
  1: "#262838", 2: "#33364a", 3: "#44485f", 4: "#5c617b", 5: "#7d8299", 6: "#a6abbe", 7: "#cfd2dc", // stone
  w: "#33262a", W: "#4f3a37", v: "#6e5246", V: "#91725b", u: "#b8987a", U: "#d9c0a0",              // wood
  q: "#432c36", Q: "#623e45", z: "#835653", Z: "#a6766a",                                         // rose clay brick
  g: "#2b4645", G: "#3f6659", h: "#5e8f73", H: "#90bf98", J: "#c6e3b8",                           // sage plants
  c: "#e7dbc5", C: "#fbf4e6",                                                                     // cream
  f: "#a9473c", F: "#d9704a", y: "#f0a85a", Y: "#ffd98e", 0: "#fff6d6",                           // fire
  b: "#2c4566", B: "#466e98", n: "#76a2c6", N: "#aacde4",                                         // water / sky blue
  o: "#7d5a30", O: "#b98a44", j: "#e3c06e", 8: "#f6e3a4",                                         // gold
  p: "#955a71", P: "#d390a2", 9: "#f2c4cc",                                                       // pink
  s: "#1f1c28",                                                                                   // soot
  "(": "#2e2527", ")": "#3d3132", "[": "#4f3f3d", "]": "#65514c", "{": "#7e6860", "}": "#9a8478",  // warm rock
  "<": "#3c5a3a", ">": "#5b8350", "=": "#86b06a", "+": "#b5d48c",                                 // grass and leaves
  "~": "#8a5a3c", "^": "#b07a4e", "@": "#d8a874",                                                 // bark, path, sand
  // ---- recolour placeholders (exact colours the game swaps at runtime) ----
  m: "#4a4a54", M: "#76767f", x: "#a7a7b0", X: "#dadae3",                                         // metal: dark..light
  a: "#b06a54", A: "#de9a7c", i: "#f4c6a6",                                                       // skin
  r: "#7f4326", R: "#b8663b", t: "#e3965a",                                                       // beard
  d: "#653f27", D: "#93623b", E: "#c08a5c",                                                       // hair
  T: "#3e5e8e", L: "#5f84bb", K: "#8fb0dd",                                                       // tunic
  e: "#2a2230",                                                                                   // eyes
  l: "#4b3f4f", I: "#6a5b6c",                                                                     // trousers
  S: "#3a2a26", "%": "#5a4136",                                                                   // boots, belt
};

// Placeholder ramps the game recolours. Dark -> light.
var SWAP = {
  metal: ["#4a4a54", "#76767f", "#a7a7b0", "#dadae3"],
  skin: ["#b06a54", "#de9a7c", "#f4c6a6"],
  beard: ["#7f4326", "#b8663b", "#e3965a"],
  hair: ["#653f27", "#93623b", "#c08a5c"],
  tunic: ["#3e5e8e", "#5f84bb", "#8fb0dd"],
};

// Rooms: width in cells (24 px), height 96 px. Anchors in room pixels (feet / centres).
// door: centre of the back door (to the stairwell behind); worker: where the worker stands; fire: glowing rect; lights: [x, y, radius, colour]; seats: [x, y] for free time.
var CELL = 24;
var ROOM_H = 96;
var FLOOR_Y = 90;           // the walking line: dwarves' feet stand on y = 90
var ROOMS = {
  tavern:     { w: 9, door: 204, worker: [34, 90], fire: [156, 70, 20, 14], lights: [[166, 74, 60, "#ffb060"], [96, 22, 46, "#ffd98e"], [44, 20, 38, "#ffd98e"]],
                seats: [[66, 90], [100, 90], [114, 90], [140, 90], [84, 90]], bar: [[16, 90], [48, 90]] },
  quarters:   { w: 7, door: 156, lights: [[107, 20, 44, "#ffd98e"]], beds: [[27, 82], [27, 50], [79, 82], [79, 50]] },
  warehouse:  { w: 7, door: 156, lights: [[72, 20, 44, "#ffd98e"]], seats: [[62, 90]] },
  vault:      { w: 5, door: 108, lights: [[48, 22, 32, "#ffd98e"], [48, 50, 26, "#e3c06e"]] },
  smelter:    { w: 7, door: 156, worker: [78, 90], face: -1, fire: [24, 58, 16, 12], chimney: [30, 0], lights: [[32, 64, 60, "#ff8a4a"], [122, 20, 32, "#ffd98e"]], bellows: [54, 72] },
  forge:      { w: 7, door: 156, worker: [60, 90], face: 1, fire: [14, 68, 26, 8], chimney: [24, 0], anvil: [82, 76], quench: [112, 90], lights: [[27, 68, 58, "#ff9450"], [129, 20, 30, "#ffd98e"]] },
  grindstone: { w: 5, door: 108, worker: [62, 90], face: -1, wheel: [32, 66], lights: [[48, 18, 34, "#ffd98e"]] },
  engraver:   { w: 5, door: 108, worker: [64, 90], face: -1, work: [30, 66], lights: [[34, 54, 28, "#ffd98e"], [76, 20, 26, "#ffd98e"]] },
  jeweler:    { w: 6, door: 132, worker: [64, 90], face: -1, work: [34, 66], lights: [[36, 52, 32, "#fff0c0"], [92, 52, 28, "#aacde4"]] },
  tailor:     { w: 6, door: 132, worker: [64, 90], face: -1, work: [30, 62], lights: [[60, 20, 34, "#ffd98e"], [28, 56, 22, "#ffe6b0"]] },
  farm:       { w: 7, door: 156, worker: [118, 90], face: -1, lights: [[22, 74, 36, "#90e0c8"], [58, 74, 32, "#90e0c8"], [94, 74, 32, "#90e0c8"], [72, 18, 32, "#ffd98e"]] },
  brewery:    { w: 6, door: 132, worker: [58, 90], face: -1, kettle: [28, 90], steam: [33, 30], lights: [[28, 62, 44, "#ffb070"], [67, 34, 30, "#ffd98e"]] },
  expedition_hall: { w: 7, door: 156, seats: [[26, 90], [94, 90]], lights: [[66, 20, 44, "#ffd98e"], [46, 72, 22, "#ffd98e"]] },
  trade_depot: { w: 7, door: 156, lights: [[63, 20, 44, "#ffd98e"]] },
  barracks:   { w: 7, door: 156, worker: [112, 90], seats: [[52, 90], [68, 90], [84, 90]], lights: [[98, 22, 44, "#ffd98e"]] },
};

// Extra machines: each one is a bay of `w` cells added to the right of the room, with its own worker spot.
// Anchors are in bay pixels (x = 0 is the left edge of the bay).
var BAYS = {
  smelter:    { w: 3, worker: [56, 90], face: -1, fire: [14, 58, 16, 12], chimney: [22, 0], lights: [[22, 64, 50, "#ff8a4a"]] },
  forge:      { w: 3, worker: [44, 90], face: 1, fire: [8, 68, 26, 8], chimney: [16, 0], anvil: [62, 76], lights: [[21, 68, 46, "#ff9450"]] },
  grindstone: { w: 2, worker: [38, 90], face: -1, wheel: [18, 66], lights: [[24, 20, 26, "#ffd98e"]] },
  engraver:   { w: 2, worker: [40, 90], face: -1, work: [20, 66], lights: [[20, 54, 24, "#ffd98e"]] },
  jeweler:    { w: 2, worker: [40, 90], face: -1, work: [20, 66], lights: [[20, 52, 26, "#fff0c0"]] },
  tailor:     { w: 2, worker: [40, 90], face: -1, work: [16, 62], lights: [[18, 30, 22, "#ffd98e"]] },
  farm:       { w: 2, worker: [26, 90], face: 1, lights: [[24, 74, 30, "#90e0c8"]] },
  brewery:    { w: 2, worker: [40, 90], face: -1, kettle: [18, 90], steam: [21, 44], lights: [[18, 66, 32, "#ffb070"]] },
};

// Rooms change their look when they grow: tier 0 at level 1 (dug out), 1 at level 2 (settled), 2 from level 3 (grand),
// 3 from level 5 (the king's hall: dark stone, gold, glowing runes, crystal lamps).
// Every tier has two variants; the game picks one per room so no two rooms look the same.
var ROOM_TIERS = [1, 2, 3, 5];
var ROOM_VARIANTS = 2;
// extra lights per tier (chandeliers, crystal lamps)
var TIER_LIGHTS = {
  tavern: { 2: [[120, 24, 50, "#ffd98e"]] },
  quarters: { 2: [[52, 22, 36, "#ffd98e"]] },
  vault: { 2: [[20, 70, 22, "#e3c06e"], [76, 70, 22, "#e3c06e"]] },
  farm: { 2: [[30, 30, 26, "#aacde4"], [110, 34, 26, "#aacde4"]] },
  barracks: { 2: [[40, 22, 34, "#ffd98e"]] },
};

// Dwarf frames are 18x26 (16x24 + outline). Feet at y = 25. Hand anchor for tools, head bob per frame.
var DWARF = {
  w: 18, h: 26, feet: 25,          // one part before its outline; the game stacks them on a 20 x 32 canvas (feet outline on the bottom row)
  poses: { idle: 2, walk: 4, work: 2, mine: 2, sit: 1, drink: 2, climb: 2, sleep: 1 },
  bob: { idle: [0, 1], walk: [0, 1, 0, 1], work: [0, 1], mine: [0, 1], sit: [3], drink: [3, 3], climb: [0, 1], sleep: [5] },
};

var ORES = [
  ["native_copper", "#c4703f"], ["malachite", "#3f9a64"], ["tetrahedrite", "#6d6a63"], ["cassiterite", "#4b3a33"],
  ["sphalerite", "#8a6a3a"], ["galena", "#6f7378"], ["native_silver", "#cfd1d6"], ["horn_silver", "#b5a98a"],
  ["hematite", "#8b3a32"], ["limonite", "#a8792f"], ["magnetite", "#3a3a40"], ["garnierite", "#5ea36b"],
  ["bismuthinite", "#9a8fa3"], ["native_gold", "#e2b33c"], ["native_platinum", "#e3e4ea"], ["native_aluminum", "#d4d7db"],
];

var LAYERS = [
  { name: "shallow", rock: ["#4a3f3a", "#5e5048", "#77665a", "#8f7d6c"] },
  { name: "grey", rock: ["#3c3f48", "#4f535e", "#666b78", "#828896"] },
  { name: "silver", rock: ["#363a4e", "#474d66", "#5d6582", "#7b84a2"] },
  { name: "golden", rock: ["#4a3a2c", "#61503a", "#7d6a4c", "#9c8662"] },
  { name: "crystal", rock: ["#2e2a46", "#3d3860", "#524b7c", "#6f669c"] },
];
