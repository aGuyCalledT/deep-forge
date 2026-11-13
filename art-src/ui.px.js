// Interface icons: 14x14 + outline = 16x16. Soft colours, rounded shapes.
function icon(name, fn) { sprite("ui_" + name, { w: 14, h: 14, outline: "k" }, fn); }
icon("fortress", (c) => { c.rect(1, 6, 12, 7, "Z"); c.rect(1, 3, 3, 3, "Z"); c.rect(10, 3, 3, 3, "Z"); c.rect(5, 1, 4, 5, "z"); c.ellipse(7, 10, 2, 2, "W"); c.rect(5, 10, 5, 3, "W"); c.hline(1, 6, 12, "c"); c.px(7, 0, "j"); });
icon("mines", (c) => { c.line(2, 12, 11, 3, "v"); c.poly([1, 4, 6, 1, 12, 1, 12, 3, 6, 3], "6"); c.hline(6, 1, 6, "7"); });
icon("dwarves", (c) => { c.circ(7, 5, 4, "A"); c.rect(3, 1, 8, 3, "B"); c.px(5, 5, "e"); c.px(9, 5, "e"); c.ellipse(7, 10, 4, 3, "R"); c.px(7, 7, "a"); });
icon("work", (c) => { c.rect(1, 7, 12, 3, "5"); c.hline(1, 7, 12, "6"); c.rect(4, 10, 6, 3, "4"); c.rect(0, 7, 2, 1, "5"); c.line(8, 6, 12, 1, "v"); c.rect(10, 0, 4, 2, "6"); c.px(4, 5, "Y"); c.px(6, 4, "y"); });
icon("trade", (c) => { c.circ(5, 8, 4, "O"); c.circ(5, 8, 3, "j"); c.circ(9, 5, 4, "O"); c.circ(9, 5, 3, "j"); c.px(8, 4, "8"); });
icon("explore", (c) => { c.rect(1, 2, 12, 10, "c"); c.box(1, 2, 12, 10, "u"); c.line(3, 9, 6, 5, "f"); c.line(6, 5, 9, 7, "f"); c.px(10, 4, "f"); c.px(11, 4, "f"); c.px(10, 5, "f"); c.px(11, 5, "f"); });
icon("war", (c) => { c.ellipse(7, 7, 6, 6, "B"); c.ellipse(7, 7, 4, 4, "n"); c.vline(7, 2, 10, "j"); c.hline(2, 7, 10, "j"); });
icon("more", (c) => { c.rect(2, 1, 10, 12, "c"); c.rect(2, 1, 10, 2, "u"); for (const y of [5, 8, 11]) c.hline(4, y, 6, "V"); });
// warn: left half, mirrored, so the triangle and the ! are exactly symmetric
sprite("ui_warn", { mx: true, outline: "k" }, `
  ......y
  ......y
  .....yy
  .....yy
  ....yyw
  ....yyw
  ...yyyw
  ...yyyw
  ..yyyyy
  ..yyyyw
  .yyyyyw
  .yyyyyy
  yyyyyyy
  yyyyyyy`);
icon("skull", (c) => { c.ellipse(7, 6, 5, 5, "C"); c.rect(4, 10, 6, 3, "C"); c.rect(4, 5, 2, 2, "w"); c.rect(8, 5, 2, 2, "w"); c.px(7, 8, "w"); c.vline(6, 11, 2, "6"); c.vline(8, 11, 2, "6"); });
icon("heart", (c) => { c.circ(4, 5, 3, "P"); c.circ(10, 5, 3, "P"); c.poly([1, 6, 13, 6, 7, 13], "P"); c.px(3, 3, "9"); });
icon("mood", (c) => { c.circ(7, 7, 6, "j"); c.px(5, 5, "w"); c.px(9, 5, "w"); c.line(4, 9, 7, 11, "w"); c.line(7, 11, 10, 9, "w"); c.px(3, 8, "P"); c.px(11, 8, "P"); });
icon("box", (c) => { c.rect(1, 3, 12, 10, "V"); c.box(1, 3, 12, 10, "v"); c.hline(1, 6, 12, "v"); c.rect(5, 6, 4, 2, "u"); });
icon("dwarf", (c) => { c.circ(7, 5, 4, "A"); c.rect(3, 1, 8, 3, "P"); c.px(5, 5, "e"); c.px(9, 5, "e"); c.ellipse(7, 10, 4, 3, "R"); });
// close: an X, left half mirrored, so both arms are the same
sprite("ui_close", { mx: true, outline: "k" }, `
  .......
  .......
  ..cc...
  ...cc..
  ....cc.
  .....cc
  ......c
  ......c
  .....cc
  ....cc.
  ...cc..
  ..cc...
  .......
  .......`);
icon("up", (c) => { c.poly([7, 2, 13, 8, 1, 8], "c"); c.rect(5, 8, 4, 4, "c"); });
icon("down", (c) => { c.poly([7, 12, 13, 6, 1, 6], "c"); c.rect(5, 2, 4, 4, "c"); });
icon("trend_up", (c) => { c.poly([7, 3, 13, 10, 1, 10], "h"); });
icon("trend_down", (c) => { c.poly([7, 11, 13, 4, 1, 4], "F"); });
icon("plus", (c) => { c.rect(5, 1, 4, 12, "c"); c.rect(1, 5, 12, 4, "c"); });
icon("minus", (c) => { c.rect(1, 5, 12, 4, "c"); });
icon("lock", (c) => { c.ring(7, 5, 3, "5"); c.rect(2, 6, 10, 7, "j"); c.px(7, 9, "o"); c.px(7, 10, "o"); });
icon("note", (c) => { c.vline(9, 1, 9, "c"); c.rect(9, 1, 4, 2, "c"); c.circ(7, 10, 2, "c"); });
icon("speaker", (c) => { c.rect(1, 5, 3, 4, "c"); c.poly([4, 5, 8, 1, 8, 13, 4, 9], "c"); c.vline(10, 5, 4, "c"); c.vline(12, 3, 8, "c"); });
icon("speaker_off", (c) => { c.rect(1, 5, 3, 4, "6"); c.poly([4, 5, 8, 1, 8, 13, 4, 9], "6"); c.line(10, 4, 13, 9, "F"); c.line(13, 4, 10, 9, "F"); });
icon("play", (c) => { c.poly([3, 1, 12, 7, 3, 13], "c"); });
icon("pause", (c) => { c.rect(3, 2, 3, 10, "c"); c.rect(8, 2, 3, 10, "c"); });
icon("next", (c) => { c.poly([1, 2, 8, 7, 1, 12], "c"); c.rect(9, 2, 3, 10, "c"); });
icon("prev", (c) => { c.poly([13, 2, 6, 7, 13, 12], "c"); c.rect(2, 2, 3, 10, "c"); });
icon("build", (c) => { c.line(2, 12, 9, 5, "v", 2); c.rect(8, 1, 5, 5, "5"); c.px(9, 2, "6"); });
icon("hand", (c) => { c.rect(4, 6, 7, 7, "A"); for (let i = 0; i < 4; i++) c.vline(4 + i * 2, 2 + (i === 0 ? 2 : 0), 5, "A"); c.vline(11, 7, 3, "A"); c.px(5, 3, "i"); });
icon("well", (c) => { c.ellipse(7, 6, 6, 5, "4"); c.rect(1, 6, 13, 8, "4"); c.ellipse(7, 7, 4, 4, "s"); c.rect(3, 7, 9, 7, "s");
  c.poly([7, 4, 10, 7, 4, 7], "y"); c.poly([7, 13, 10, 10, 4, 10], "y"); });
icon("dig", (c) => { c.line(2, 12, 9, 3, "v"); c.poly([6, 1, 12, 1, 12, 5], "6"); c.circ(4, 4, 2, "]"); c.px(11, 11, "]"); c.px(12, 9, "]"); });
icon("fill", (c) => { c.rect(1, 6, 12, 7, "4"); c.hline(1, 6, 12, "6"); c.px(4, 9, "3"); c.px(9, 10, "3"); c.rect(5, 1, 4, 4, "c"); c.poly([3, 4, 11, 4, 7, 7], "c"); });
icon("hall", (c) => { c.rect(1, 1, 12, 12, "W"); c.rect(1, 1, 12, 3, "V"); c.hline(1, 1, 12, "u"); c.rect(1, 4, 3, 9, "v"); c.rect(10, 4, 3, 9, "v"); c.vline(1, 4, 9, "V"); c.vline(10, 4, 9, "V"); c.hline(4, 12, 6, "u"); });
icon("cheat", (c) => { c.poly([7, 0, 9, 5, 14, 5, 10, 8, 12, 13, 7, 10, 2, 13, 4, 8, 0, 5, 5, 5], "j"); c.px(7, 5, "8"); });
icon("zoom_in", (c) => { c.ring(6, 6, 4, "c"); c.line(9, 9, 13, 13, "c", 2); c.hline(4, 6, 5, "c"); c.vline(6, 4, 5, "c"); });
icon("zoom_out", (c) => { c.ring(6, 6, 4, "c"); c.line(9, 9, 13, 13, "c", 2); c.hline(4, 6, 5, "c"); });
icon("info", (c) => { c.circ(7, 7, 6, "n"); c.circ(7, 7, 5, "B"); c.rect(6, 6, 2, 5, "C"); c.rect(6, 3, 2, 2, "C"); c.px(5, 6, "C"); c.hline(5, 10, 4, "C"); });
icon("menu", (c) => { for (const y of [2, 6, 10]) { c.rect(1, y, 12, 2, "c"); } });
icon("door", (c) => { c.rect(3, 3, 8, 10, "W"); c.ellipse(7, 4, 4, 3, "W"); c.rect(4, 4, 6, 9, "v"); for (const x of [6, 8]) c.vline(x, 3, 10, "W"); c.px(9, 8, "j"); c.hline(1, 13, 12, "5"); });

// Status over rooms and dwarves: stopped (red octagon), needs attention (ui_warn), resting / not needed (grey dots).
// stop: an embossed red octagon, light top edge, darker lower part. Left half, mirrored.
sprite("ui_stop", { mx: true, outline: "k" }, `
  ....***
  ...*&&&
  ..*&&&&
  .*&&&&C
  &&&&&&C
  &&&&&&C
  &&&&&&C
  &&&&&&C
  &&&&&&C
  ffffff&
  .fffffC
  ..ffffC
  ...ffff
  ....fff`);
// good: an emerald circle with a cream ! (something is done: collect it). 16 x 16 like the other signs, mirrored.
sprite("ui_good", { mx: true, outline: "k" }, `
  ....|||
  ..|||||
  .||$$$C
  .|$$$$C
  $$$$$$C
  $$$$$$C
  $$$$$$C
  $$$$$$C
  $$$$$$C
  -------
  .-----C
  .-----C
  ..-----
  ....---`);

// Small signs for the tabs (14 x 14, shown at twice the size): done, needs you, stopped.
sprite("badge_good", { mx: true, outline: "k" }, `
  ...|||
  .|||||
  .|$$$C
  $$$$$C
  $$$$$C
  $$$$$C
  $$$$$C
  ----$$
  ----$C
  .----C
  .-----
  ...---`);
sprite("badge_stop", { mx: true, outline: "k" }, `
  ...***
  ..*&&&
  .*&&&C
  *&&&&C
  &&&&&C
  &&&&&C
  &&&&&C
  ffffff
  fffffC
  .ffffC
  ..ffff
  ...fff`);
sprite("badge_warn", { mx: true, outline: "k" }, `
  .....y
  .....y
  ....yy
  ....yw
  ...yyw
  ...yyw
  ..yyyw
  ..yyyy
  .yyyyw
  .yyyyw
  yyyyyy
  yyyyyy`);
icon("idle", (c) => {
  c.rect(1, 4, 12, 6, "5"); c.hline(2, 3, 10, "5"); c.hline(2, 10, 10, "5"); c.hline(2, 4, 10, "6");
  for (const x of [3, 6, 9]) c.rect(x, 6, 2, 2, "2");
});

// ---------------------------------------------------------------- window X and button plates
// The X button on windows: a round forged iron plate with a cream X, standing on its base.
// 20 x 20, left half mirrored. "_down" is the same plate pressed into its base.
const XBTN = `
  ......kkkk
  ....kk6666
  ...k665555
  ..k6555555
  .k65555555
  .k655CC555
  k65555CC55
  k655555CC5
  k6555555CC
  k65555555C
  k54444444C
  k5444444CC
  k444444CC4
  .k4444CC44
  .k444CC444
  ..k4444444
  ..k1333333
  ...k113333
  ....kk1111
  ......kkkk`.split("\n").slice(1);
sprite("ui_xbtn", { mx: true }, XBTN.join("\n"));
sprite("ui_xbtn_down", { mx: true }, ["  ..........", ...XBTN.slice(0, 16), "  ...k333333", "  ....kk3333", "  ......kkkk"].join("\n"));

// Button plates for CSS border-image (24 x 21, slice 7 4 7 4): the corners stay, the middle stretches.
// The middle columns and rows are one flat colour so stretching keeps the pixels clean.
// H highlight, L light, B body, D dark, E the base the plate stands on. "_down" is pressed in.
const PLATE = `
  ..kkkkkkkkkk
  .kHHHHHHHHHH
  kHLLLLLLLLLL
  kLLLLLLLLLLL
  kLHBBBBBBBBB
  kLDBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kBDDDDDDDDDD
  kDDDDDDDDDDD
  kkkkkkkkkkkk
  kEEEEEEEEEEE
  .kEEEEEEEEEE
  ..kkkkkkkkkk`;
const PLATE_DOWN = `
  ............
  ............
  ..kkkkkkkkkk
  .kLLLLLLLLLL
  kLBBBBBBBBBB
  kLHBBBBBBBBB
  kLDBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kLBBBBBBBBBB
  kBDDDDDDDDDD
  kDDDDDDDDDDD
  kkkkkkkkkkkk
  .kEEEEEEEEEE
  ..kkkkkkkkkk`;
const PLATES = { iron: "6543" + "1", gold: "8jOo/", green: ":|$-,", red: "*&?;!" };
for (const [name, keys] of Object.entries(PLATES)) {
  const map = (g) => g.replace(/[HLBDE]/g, (ch) => keys["HLBDE".indexOf(ch)]);
  sprite("btn_" + name, { mx: true }, map(PLATE));
  sprite("btn_" + name + "_down", { mx: true }, map(PLATE_DOWN));
}
