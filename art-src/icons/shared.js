// Shared data for the art files AND the game (scripts/build-art.mjs writes it to static/art/icons/meta.json).
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
  "*": "#ff8a96", "&": "#c0283c", "?": "#9a2230", ";": "#6a1520", "!": "#3a0c10",                  // ruby (status signs, red buttons)
  ":": "#8ff0c4", "|": "#3fbf88", "$": "#1f9a6a", "-": "#1f6b4c", ",": "#0d3b2a",                  // emerald (green badge and buttons)
  "/": "#5a3a12",                                                                                 // dark gold (button base)
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
  gem: ["#40404a", "#70707a", "#a8a8b2", "#e6e6ee"],   // gems.px.js, coloured by the kind (Gems.java)
};

// Rooms: width in cells (24 px), height 96 px. Anchors in room pixels (feet / centres).
// door: centre of the back door (to the stairwell behind); worker: where the worker stands; fire: glowing rect; lights: [x, y, radius, colour]; seats: [x, y] for free time.
var ORES = [
  ["native_copper", "#c4703f"], ["malachite", "#3f9a64"], ["tetrahedrite", "#6d6a63"], ["cassiterite", "#4b3a33"],
  ["sphalerite", "#8a6a3a"], ["galena", "#6f7378"], ["native_silver", "#cfd1d6"], ["horn_silver", "#b5a98a"],
  ["hematite", "#8b3a32"], ["limonite", "#a8792f"], ["magnetite", "#3a3a40"], ["garnierite", "#5ea36b"],
  ["bismuthinite", "#9a8fa3"], ["native_gold", "#e2b33c"], ["native_platinum", "#e3e4ea"], ["native_aluminum", "#d4d7db"],
];
