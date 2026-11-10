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

// Rooms: width in cells (16 px), height 64 px. Anchors in room pixels (feet / centres).
// worker: where the worker stands; fire: glowing rect; lights: [x, y, radius, colour]; seats: [x, y] for free time.
var ROOM_H = 64;
var FLOOR_Y = 58;           // the walking line: dwarves' feet stand on y = 58
var ROOMS = {
  tavern:     { w: 8, worker: [22, 58], fire: [104, 40, 14, 10], lights: [[111, 44, 40, "#ffb060"], [64, 14, 34, "#ffd98e"], [30, 14, 26, "#ffd98e"]],
                seats: [[44, 58], [58, 58], [76, 58], [90, 58], [40, 58]], bar: [[12, 58], [26, 58]] },
  quarters:   { w: 6, lights: [[48, 14, 30, "#ffd98e"]], beds: [[14, 40], [14, 54], [44, 40], [44, 54], [74, 40], [74, 54]] },
  warehouse:  { w: 6, lights: [[48, 12, 30, "#ffd98e"]], seats: [[40, 58]] },
  vault:      { w: 4, lights: [[32, 16, 22, "#ffd98e"], [32, 34, 18, "#e3c06e"]] },
  smelter:    { w: 6, worker: [48, 58], fire: [17, 37, 12, 9], chimney: [21, 0], lights: [[23, 42, 42, "#ff8a4a"], [80, 14, 22, "#ffd98e"]], bellows: [34, 46] },
  forge:      { w: 6, worker: [40, 58], fire: [10, 44, 18, 4], chimney: [17, 0], anvil: [54, 50], quench: [74, 58], lights: [[19, 44, 40, "#ff9450"], [86, 14, 20, "#ffd98e"]] },
  grindstone: { w: 4, worker: [42, 58], wheel: [24, 44], lights: [[32, 12, 24, "#ffd98e"]] },
  engraver:   { w: 4, worker: [42, 58], work: [22, 44], lights: [[20, 30, 20, "#ffd98e"], [50, 12, 18, "#ffd98e"]] },
  jeweler:    { w: 5, worker: [44, 58], work: [24, 44], lights: [[25, 30, 22, "#fff0c0"], [64, 30, 18, "#aacde4"]] },
  farm:       { w: 6, worker: [70, 58], lights: [[30, 46, 26, "#90e0c8"], [64, 46, 22, "#90e0c8"], [48, 12, 22, "#ffd98e"]] },
  brewery:    { w: 5, worker: [44, 58], kettle: [18, 58], steam: [22, 22], lights: [[20, 40, 30, "#ffb070"], [62, 14, 20, "#ffd98e"]] },
  barracks:   { w: 6, worker: [60, 58], seats: [[52, 58], [66, 58], [80, 58]], lights: [[48, 14, 30, "#ffd98e"]] },
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
