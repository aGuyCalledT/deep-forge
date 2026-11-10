// Monsters, 2 frames each (bobbing). Cute but a bit scary.
function monster(id, w, h, draw) {
  anim("mon_" + id, { w, h, outline: "k", frames: 2, fps: 3 }, (c) => draw(c, c.frame));
}
monster("giant_rat", 24, 14, (c, f) => {
  c.ellipse(11, 9 - f, 9, 4, "5"); c.ellipse(18, 7 - f, 5, 4, "5"); c.ellipse(9, 8 - f, 6, 2, "6");
  c.px(20, 6 - f, "e"); c.px(23, 8 - f, "P"); c.circ(16, 3 - f, 2, "P"); c.line(2, 10, 0, 6, "P");
  c.vline(6, 12, 2, "4"); c.vline(15, 12, 2, "4");
});
monster("cave_crawler", 26, 12, (c, f) => {
  for (let i = 0; i < 5; i++) { c.circ(3 + i * 4, 6 + ((i + f) % 2), 3, i % 2 ? "G" : "h"); c.px(3 + i * 4, 10, "g"); }
  c.circ(22, 5, 3, "h"); c.px(23, 4, "Y"); c.line(24, 3, 26, 0, "g");
});
monster("cave_spider", 24, 18, (c, f) => {
  for (let i = 0; i < 4; i++) { c.line(9, 10, 1 + i * 2, 16 - f - (i % 2) * 2, "1"); c.line(15, 10, 23 - i * 2, 16 - f - (i % 2) * 2, "1"); }
  c.ellipse(12, 9 - f, 6, 5, "2"); c.ellipse(12, 7 - f, 3, 2, "3");
  c.px(10, 9 - f, "f"); c.px(14, 9 - f, "f"); c.px(11, 10 - f, "F"); c.px(13, 10 - f, "F");
});
monster("goblin_scouts", 16, 22, (c, f) => {
  c.rect(4, 9, 8, 8, "W"); c.ellipse(8, 6 - f, 5, 4, ">"); c.px(2, 4 - f, ">"); c.px(14, 4 - f, ">"); c.px(1, 3 - f, ">"); c.px(15, 3 - f, ">");
  c.px(6, 6 - f, "Y"); c.px(10, 6 - f, "Y"); c.hline(7, 8 - f, 3, "<");
  c.rect(5, 17, 2, 4, "<"); c.rect(9, 17, 2, 4, "<"); c.vline(14, 2, 18, "v"); c.poly([13, 2, 15, 2, 14, 0], "5");
});
monster("rock_troll", 28, 26, (c, f) => {
  c.ellipse(14, 14 - f, 11, 9, "4"); c.ellipse(12, 11 - f, 7, 5, "5"); c.ellipse(18, 6 - f, 6, 5, "4");
  c.px(17, 5 - f, "Y"); c.px(21, 5 - f, "Y"); c.hline(17, 9 - f, 5, "2"); c.px(18, 10 - f, "c");
  c.rect(4, 18, 5, 8, "4"); c.rect(19, 18, 5, 8, "4"); c.px(8, 12 - f, "h"); c.px(11, 9 - f, "h");
});
monster("magma_crab", 28, 18, (c, f) => {
  c.ellipse(14, 11 - f, 9, 5, "2"); c.hline(8, 10 - f, 12, "F"); c.px(10, 12 - f, "y"); c.px(17, 12 - f, "y");
  c.ellipse(3, 6 - f, 3, 3, "f"); c.ellipse(25, 6 - f, 3, 3, "f"); c.px(2, 4 - f, "Y"); c.px(26, 4 - f, "Y");
  c.px(12, 7 - f, "Y"); c.px(16, 7 - f, "Y"); for (let i = 0; i < 3; i++) { c.line(8 + i * 2, 15, 6 + i * 2, 18, "1"); c.line(20 - i * 2, 15, 22 - i * 2, 18, "1"); }
});
monster("blind_ogre", 28, 28, (c, f) => {
  c.ellipse(14, 15 - f, 11, 10, "c"); c.ellipse(14, 6 - f, 7, 5, "c"); c.hline(10, 5 - f, 9, "u"); c.hline(11, 9 - f, 6, "Z");
  c.rect(6, 12, 16, 6, "V"); c.rect(5, 22, 6, 6, "u"); c.rect(17, 22, 6, 6, "u"); c.px(9, 14 - f, "j");
});
monster("crystal_golem", 26, 28, (c, f) => {
  c.rect(6, 8, 14, 12, "p"); c.poly([6, 8, 13, 0, 20, 8], "P"); c.poly([2, 10, 6, 8, 6, 16, 2, 18], "H"); c.poly([24, 10, 20, 8, 20, 16, 24, 18], "H");
  c.px(10, 10 - f, "C"); c.px(16, 10 - f, "C"); c.poly([10, 2, 13, -2, 16, 2], "J");
  c.rect(7, 20, 5, 8, "p"); c.rect(14, 20, 5, 8, "p"); c.line(9, 12, 13, 18, "9");
});
monster("deep_wyrm", 32, 22, (c, f) => {
  for (let i = 0; i < 6; i++) c.circ(4 + i * 4, 16 - Math.round(Math.sin(i + f) * 2), 4, i % 2 ? "b" : "B");
  c.ellipse(27, 8 - f, 5, 4, "B"); c.px(28, 7 - f, "Y"); c.px(31, 9 - f, "C"); c.px(30, 10 - f, "C"); c.poly([24, 4, 26, 0, 27, 4], "n");
});
