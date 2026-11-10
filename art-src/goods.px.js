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
};
for (const [k, fn] of Object.entries(ITEM)) sprite("item_" + k, { w: 14, h: 14, outline: "k" }, fn);
// little marks for finished goods
sprite("mod_s", { w: 5, h: 5 }, "..C..\n.CXC.\nCX0XC\n.CXC.\n..C..");
sprite("mod_e", { w: 5, h: 3 }, "j.j.j\n.j.j.\nj.j.j");
sprite("mod_g", { w: 4, h: 4, outline: "k" }, ".N.\nNCN\n.N.");
sprite("mod_star", { w: 5, h: 5, outline: "k" }, "..j..\n.jjj.\njjjjj\n.j.j.\nj...j");

const RAW = {
  coal: (c) => { lumpShape(c, "2", "1", "4"); c.px(5, 5, "6"); c.px(9, 8, "5"); },
  limestone: (c) => { c.rect(1, 4, 12, 9, "c"); c.rect(2, 3, 10, 2, "C"); c.hline(1, 12, 12, "u"); c.vline(12, 4, 8, "u"); c.px(5, 8, "U"); c.px(9, 10, "U"); },
  stone: (c) => { c.rect(1, 5, 11, 8, "4"); c.poly([1, 5, 4, 2, 13, 2, 12, 5], "5"); c.rect(12, 3, 2, 10, "3"); c.px(4, 8, "3"); c.px(8, 10, "3"); },
  rough_gem: (c) => { lumpShape(c, "}", "]", "6"); c.poly([5, 9, 7, 3, 10, 9], "h"); c.px(7, 5, "J"); c.px(7, 4, "C"); },
  cut_gem: (c) => { c.poly([2, 5, 5, 2, 9, 2, 12, 5, 7, 12], "H"); c.hline(4, 5, 7, "J"); c.poly([5, 2, 9, 2, 7, 5], "J"); c.px(6, 3, "C"); c.line(2, 5, 7, 12, "h"); },
  food: (c) => { c.ellipse(7, 5, 6, 4, "Z"); c.rect(1, 6, 13, 1, "z"); c.px(4, 3, "C"); c.px(9, 4, "C"); c.px(6, 2, "9"); c.rect(5, 7, 4, 6, "c"); c.vline(5, 8, 5, "C"); },
  ale: (c) => { c.rect(2, 3, 8, 10, "u"); c.rect(2, 2, 8, 2, "C"); c.px(3, 1, "C"); c.px(7, 1, "C"); c.rect(3, 5, 6, 7, "y"); c.vline(4, 5, 7, "Y"); c.box(10, 5, 3, 5, "V"); c.hline(2, 12, 8, "V"); },
};
for (const [k, fn] of Object.entries(RAW)) sprite("raw_" + k, { w: 14, h: 14, outline: "k" }, fn);

sprite("coin", { w: 10, h: 10, outline: "k" }, (c) => { c.circ(5, 5, 4, "O"); c.circ(5, 5, 3, "j"); c.vline(5, 3, 5, "O"); c.px(3, 3, "8"); });
sprite("artifact", { w: 14, h: 14, outline: "k" }, (c) => {
  c.poly([7, 0, 12, 5, 7, 10, 2, 5], "p"); c.poly([7, 2, 10, 5, 7, 8, 4, 5], "P"); c.px(6, 4, "C");
  c.rect(3, 10, 8, 3, "O"); c.hline(3, 10, 8, "j"); c.hline(3, 12, 8, "o");
});
