// Goods icons: 14x14 + outline = 16x16. Bars and items use the metal placeholders m M x X (recoloured per metal).

function lumpShape(c, base, dark, lite) {
  c.ellipse(7, 8, 6, 5, base);
  c.rect(3, 3, 8, 3, base);
  c.rect(4, 3, 4, 2, lite); c.px(3, 5, lite);
  c.hline(3, 12, 8, dark); c.vline(12, 6, 5, dark);
}

ORES.forEach(([id, col]) => sprite("ore_" + id, { w: 14, h: 14, outline: "k" }, (c) => {
  lumpShape(c, "}", "]", "6");
  // the ore shows as veins and crystals in the rock
  for (const [x, y] of [[5, 6], [8, 8], [6, 10], [9, 5], [10, 9]]) { c.px(x, y, col); c.px(x + 1, y, col); }
  c.px(5, 5, "#ffffff80");
  if (id.startsWith("native_")) { c.px(9, 4, "0"); c.px(6, 9, col); c.px(7, 9, col); c.px(7, 10, col); }
}));

sprite("bar", { w: 14, h: 14, outline: "k" }, (c) => {
  c.poly([3, 5, 11, 5, 13, 10, 1, 10], "M");
  c.rect(3, 5, 8, 1, "X"); c.rect(2, 6, 10, 1, "x");
  c.rect(1, 10, 12, 1, "m"); c.px(4, 6, "X"); c.px(5, 7, "X");
});

const ITEM = {
  pickaxe: (c) => { c.line(3, 13, 10, 3, "v"); c.line(4, 13, 11, 3, "W"); c.poly([2, 3, 7, 1, 13, 1, 13, 3, 7, 3], "M"); c.hline(7, 1, 6, "X"); c.px(2, 4, "m"); },
  axe: (c) => { c.line(3, 13, 9, 2, "v"); c.ellipse(10, 4, 3, 4, "M"); c.vline(12, 1, 7, "X"); c.px(8, 3, "m"); c.px(9, 7, "m"); },
  helm: (c) => { c.ellipse(7, 7, 6, 5, "M"); c.rect(1, 7, 13, 4, "_"); c.rect(1, 7, 13, 2, "x"); c.rect(6, 7, 2, 5, "M"); c.rect(3, 3, 4, 2, "X"); c.px(1, 8, "m"); c.px(13, 8, "m"); },
  mail: (c) => { c.rect(3, 2, 8, 11, "M"); c.rect(1, 3, 3, 5, "M"); c.rect(10, 3, 3, 5, "M"); c.rect(5, 1, 4, 2, "_");
    for (let y = 3; y < 13; y += 2) for (let x = 3 + (y % 4 === 1 ? 1 : 0); x < 11; x += 2) c.px(x, y, "x"); c.hline(3, 12, 8, "m"); },
  chain: (c) => { for (let i = 0; i < 4; i++) { const x = 1 + i * 3, y = 1 + i * 3; c.ring(x + 2, y + 2, 2, i % 2 ? "x" : "M"); } },
  goblet: (c) => { c.rect(3, 1, 8, 2, "X"); c.ellipse(7, 4, 4, 3, "M"); c.rect(3, 1, 8, 1, "x"); c.vline(7, 7, 4, "M"); c.rect(4, 11, 7, 2, "M"); c.hline(4, 12, 7, "m"); c.px(5, 3, "X"); },
  ring: (c) => { c.ring(7, 8, 4, "M"); c.ring(7, 8, 3, "x"); c.rect(5, 2, 4, 3, "N"); c.px(6, 2, "C"); c.box(5, 2, 4, 3, "M"); },
  crown: (c) => { c.poly([1, 12, 1, 4, 4, 8, 7, 2, 10, 8, 13, 4, 13, 12], "M"); c.hline(1, 11, 13, "m"); c.hline(1, 9, 13, "X"); c.px(4, 10, "P"); c.px(7, 10, "N"); c.px(10, 10, "H"); c.px(7, 2, "X"); },
  // pieces from the fine mechanic's bench: the own metal in M/m/X/x, the parts in fixed colours (copper F/f, gold j/O, gem N/H)
  lamp: (c) => { c.hline(5, 1, 4, "M"); c.ring(7, 2, 1, "m"); c.rect(4, 4, 6, 7, "M"); c.rect(5, 5, 4, 5, "y"); c.vline(6, 5, 5, "Y"); c.rect(3, 3, 8, 2, "F"); c.rect(3, 11, 8, 2, "f"); c.vline(4, 4, 7, "X"); c.hline(3, 12, 8, "m"); },
  lock: (c) => { c.ring(7, 4, 3, "x"); c.rect(3, 4, 2, 3, "x"); c.rect(10, 4, 2, 3, "x"); c.rect(2, 6, 11, 7, "M"); c.hline(2, 6, 11, "X"); c.hline(2, 12, 11, "m"); c.rect(6, 8, 2, 2, "k"); c.vline(7, 10, 2, "k"); c.px(10, 9, "O"); c.px(11, 10, "j"); },
  shield: (c) => { c.circ(7, 7, 6, "o"); c.circ(7, 7, 5, "M"); c.circ(7, 7, 2, "X"); c.px(7, 7, "m"); c.line(4, 3, 3, 5, "X"); c.px(10, 11, "m"); c.px(11, 10, "m"); },
  tankards: (c) => { for (const x of [1, 7]) { c.rect(x, 4, 5, 8, "M"); c.hline(x, 4, 5, "X"); c.hline(x, 11, 5, "m"); c.rect(x, 2, 5, 2, "O"); c.box(x + 5, 6, 2, 4, "M"); c.vline(x + 1, 5, 6, "X"); } },
  chalice: (c) => { c.rect(2, 1, 10, 1, "j"); c.ellipse(7, 4, 5, 3, "M"); c.rect(2, 1, 10, 2, "M"); c.hline(2, 1, 10, "j"); c.vline(7, 7, 4, "M"); c.px(7, 9, "N"); c.px(6, 9, "H"); c.rect(3, 11, 9, 2, "M"); c.hline(3, 12, 9, "j"); c.px(4, 3, "X"); },
  parade_axe: (c) => { c.line(3, 13, 9, 2, "v"); c.ellipse(10, 5, 3, 5, "M"); c.vline(13, 1, 9, "j"); c.vline(12, 2, 7, "X"); c.px(10, 5, "N"); c.px(8, 2, "m"); c.px(8, 8, "m"); c.px(5, 10, "O"); },
  compass: (c) => { c.circ(7, 7, 6, "M"); c.circ(7, 7, 5, "x"); c.circ(7, 7, 4, "C"); c.line(7, 4, 7, 7, "&"); c.line(7, 8, 7, 10, "4"); c.px(7, 7, "k"); c.px(7, 0, "X"); c.hline(3, 13, 9, "m"); },
  music_box: (c) => { c.rect(1, 5, 12, 8, "M"); c.rect(1, 2, 12, 3, "X"); c.hline(1, 4, 12, "m"); c.hline(1, 12, 12, "m"); c.ring(5, 9, 2, "O"); c.px(5, 9, "j"); c.ring(9, 9, 1, "O"); c.line(13, 7, 13, 10, "x"); c.px(13, 6, "x"); },
  regalia: (c) => { c.poly([1, 8, 1, 3, 3, 6, 5, 1, 7, 6, 9, 3, 9, 8], "M"); c.hline(1, 8, 9, "m"); c.px(3, 7, "N"); c.px(5, 7, "H"); c.px(7, 7, "P"); c.line(8, 13, 12, 5, "4"); c.line(9, 13, 13, 5, "5"); c.circ(12, 4, 1, "M"); c.px(12, 3, "X"); c.rect(1, 10, 6, 3, "&"); c.hline(1, 10, 6, "C"); },
  // a tool for every job (metal head in M/m/X/x, wooden handle v/W)
  hammer: (c) => { c.line(5, 13, 8, 6, "v"); c.line(6, 13, 9, 6, "W"); c.rect(3, 2, 10, 4, "M"); c.hline(3, 2, 10, "X"); c.hline(3, 5, 10, "m"); c.rect(2, 3, 1, 2, "x"); c.rect(12, 2, 2, 4, "x"); c.vline(8, 2, 4, "m"); },
  ladle: (c) => { c.line(2, 1, 8, 7, "v"); c.line(3, 1, 9, 7, "W"); c.ellipse(10, 10, 3, 3, "M"); c.hline(7, 9, 7, "X"); c.rect(8, 10, 5, 2, "y"); c.px(9, 10, "Y"); c.hline(8, 13, 5, "m"); },
  sickle: (c) => { c.ring(7, 6, 5, "M"); c.rect(1, 6, 13, 7, "_"); c.rect(7, 1, 7, 5, "_"); c.ring(7, 6, 4, "x"); c.px(2, 5, "X"); c.line(3, 13, 6, 9, "v"); c.line(4, 13, 7, 9, "W"); },
  chisel: (c) => { c.rect(5, 1, 4, 6, "v"); c.vline(5, 1, 6, "W"); c.rect(5, 6, 4, 1, "m"); c.rect(6, 7, 2, 5, "M"); c.vline(6, 7, 5, "X"); c.px(6, 12, "x"); c.px(7, 12, "m"); c.px(6, 13, "X"); },
  scales: (c) => { c.vline(7, 2, 10, "M"); c.hline(2, 3, 11, "x"); c.px(7, 1, "X"); c.line(2, 3, 1, 7, "m"); c.line(2, 3, 4, 7, "m"); c.line(12, 3, 10, 7, "m"); c.line(12, 3, 13, 7, "m");
    c.hline(1, 8, 4, "X"); c.hline(10, 8, 4, "X"); c.rect(4, 12, 7, 2, "M"); c.hline(4, 13, 7, "m"); },
  staff: (c) => { c.line(3, 13, 9, 4, "v"); c.line(4, 13, 10, 4, "W"); c.ring(10, 3, 2, "M"); c.px(10, 3, "P"); c.px(9, 2, "9"); c.px(12, 1, "X"); c.px(11, 5, "m"); },
};
for (const [k, fn] of Object.entries(ITEM)) sprite("item_" + k, { w: 14, h: 14, outline: "k" }, fn);
// little marks for finished goods
sprite("mod_s", { w: 5, h: 5 }, "..C..\n.CXC.\nCX0XC\n.CXC.\n..C..");
sprite("mod_e", { w: 5, h: 3 }, "j.j.j\n.j.j.\nj.j.j");
sprite("mod_g", { w: 4, h: 4, outline: "k" }, ".N.\nNCN\n.N.");
sprite("mod_i", { w: 5, h: 2 }, "jOjOj\nOjOjO");
sprite("mod_star", { w: 5, h: 5, outline: "k" }, "..j..\n.jjj.\njjjjj\n.j.j.\nj...j");

const RAW = {
  coal: (c) => { lumpShape(c, "2", "1", "4"); c.px(5, 5, "6"); c.px(9, 8, "5"); },
  limestone: (c) => { c.rect(1, 4, 12, 9, "c"); c.rect(2, 3, 10, 2, "C"); c.hline(1, 12, 12, "u"); c.vline(12, 4, 8, "u"); c.px(5, 8, "U"); c.px(9, 10, "U"); },
  stone: (c) => { c.rect(1, 5, 11, 8, "4"); c.poly([1, 5, 4, 2, 13, 2, 12, 5], "5"); c.rect(12, 3, 2, 10, "3"); c.px(4, 8, "3"); c.px(8, 10, "3"); },
  rough_gem: (c) => { lumpShape(c, "}", "]", "6"); c.poly([5, 9, 7, 3, 10, 9], "h"); c.px(7, 5, "J"); c.px(7, 4, "C"); },
  cut_gem: (c) => { c.poly([2, 5, 5, 2, 9, 2, 12, 5, 7, 12], "H"); c.hline(4, 5, 7, "J"); c.poly([5, 2, 9, 2, 7, 5], "J"); c.px(6, 3, "C"); c.line(2, 5, 7, 12, "h"); },
  food: (c) => { c.ellipse(7, 5, 6, 4, "Z"); c.rect(1, 6, 13, 1, "z"); c.px(4, 3, "C"); c.px(9, 4, "C"); c.px(6, 2, "9"); c.rect(5, 7, 4, 6, "c"); c.vline(5, 8, 5, "C"); },
  gears: (c) => { c.circ(5, 6, 4, "O"); c.circ(5, 6, 2, "_"); for (const [x, y] of [[5, 1], [5, 11], [0, 6], [10, 6], [2, 3], [8, 9]]) c.px(x, y, "O"); c.circ(10, 10, 3, "j"); c.px(10, 10, "_"); for (const [x, y] of [[10, 6], [13, 10], [10, 13], [7, 10]]) c.px(x, y, "j"); },
  cloth: (c) => { c.rect(1, 4, 10, 8, "c"); c.hline(1, 4, 10, "C"); c.hline(1, 7, 10, "U"); c.hline(1, 10, 10, "U"); c.ellipse(11, 8, 2, 4, "u"); c.px(11, 8, "V"); c.line(3, 12, 1, 13, "c"); },
  ale: (c) => { c.rect(2, 3, 8, 10, "u"); c.rect(2, 2, 8, 2, "C"); c.px(3, 1, "C"); c.px(7, 1, "C"); c.rect(3, 5, 6, 7, "y"); c.vline(4, 5, 7, "Y"); c.box(10, 5, 3, 5, "V"); c.hline(2, 12, 8, "V"); },
};
for (const [k, fn] of Object.entries(RAW)) sprite("raw_" + k, { w: 14, h: 14, outline: "k" }, fn);

sprite("coin", { w: 10, h: 10, outline: "k" }, (c) => { c.circ(5, 5, 4, "O"); c.circ(5, 5, 3, "j"); c.vline(5, 3, 5, "O"); c.px(3, 3, "8"); });
// money: a Gold Mark (stamped with the mountain), a Silver Talent (milled rim) and a Copper Jot (holed, strung on cords)
sprite("coin_mark", { w: 10, h: 10, outline: "k" }, (c) => {
  c.circ(5, 5, 4, "O"); c.circ(5, 5, 3, "j");
  c.px(4, 4, "o"); c.px(5, 3, "o"); c.px(6, 4, "o"); c.hline(3, 5, 5, "o"); c.px(3, 3, "8"); c.px(4, 2, "8");
});
sprite("coin_talent", { w: 10, h: 10, outline: "k" }, (c) => {
  c.circ(5, 5, 4, "5"); c.circ(5, 5, 3, "6");
  for (const [x, y] of [[5, 1], [9, 5], [5, 9], [1, 5]]) c.px(x, y, "4");
  c.vline(5, 3, 5, "5"); c.px(3, 3, "7"); c.px(4, 2, "C");
});
sprite("coin_jot", { w: 8, h: 8, outline: "k" }, (c) => {
  c.circ(4, 4, 3, "~"); c.circ(4, 4, 2, "^");
  c.px(4, 4, "_"); c.px(2, 2, "y");
});
sprite("artifact", { w: 14, h: 14, outline: "k" }, (c) => {
  c.poly([7, 0, 12, 5, 7, 10, 2, 5], "p"); c.poly([7, 2, 10, 5, 7, 8, 4, 5], "P"); c.px(6, 4, "C");
  c.rect(3, 10, 8, 3, "O"); c.hline(3, 10, 8, "j"); c.hline(3, 12, 8, "o");
});

// gems by school of magic (each in its own colours) and an empty socket for the item window
const SCHOOL_GEM = { earth: ["~", "^", "@", "C"], fire: [";", "?", "&", "*"], steel: ["b", "B", "n", "N"], hearth: ["-", "$", "|", ":"], gold: ["o", "O", "j", "8"] };
for (const [school, [d, m, l, w]] of Object.entries(SCHOOL_GEM)) sprite("gem_" + school, { w: 14, h: 14, outline: "k" }, (c) => {
  c.poly([2, 5, 5, 2, 9, 2, 12, 5, 7, 12], m); c.hline(4, 5, 7, l); c.poly([5, 2, 9, 2, 7, 5], l); c.px(6, 3, w); c.line(2, 5, 7, 12, d); c.line(12, 5, 7, 12, d); c.px(10, 6, d);
});
sprite("socket", { w: 8, h: 8, outline: "k" }, (c) => { c.ring(4, 4, 3, "4"); c.circ(4, 4, 2, "s"); c.px(3, 3, "2"); c.px(2, 2, "6"); });
