// 3x5 pixel font for labels inside the canvas scenes.
const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', '/': '001001010100100', ':': '000010000010000', '.': '000000000000010', '-': '000000111000000',
  '+': '000010111010000', '!': '010010010000010', '?': '110001010000010', '%': '101001010100101', "'": '010010000000000',
  ' ': '000000000000000',
};

export function textWidth(t) { return String(t).length * 4 - 1; }

export function text(ctx, t, x, y, color = '#fbf4e6', align = 'left', shadow = '#1d1b2c') {
  t = String(t).toUpperCase();
  const w = textWidth(t);
  const x0 = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  for (const pass of shadow ? [0, 1] : [1]) {
    ctx.fillStyle = pass ? color : shadow;
    let cx = x0 + (pass ? 0 : 1);
    for (const ch of t) {
      const g = GLYPHS[ch] || GLYPHS['?'];
      for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3), y + Math.floor(i / 3) + (pass ? 0 : 1), 1, 1);
      cx += 4;
    }
  }
}

/** A small rounded wooden sign with a label (friendly, not boxy). */
export function sign(ctx, t, cx, y, color = '#fbf4e6') {
  const w = textWidth(t) + 8;
  const x = Math.round(cx - w / 2);
  ctx.fillStyle = '#1d1b2c';
  ctx.fillRect(x + 1, y - 1, w - 2, 9); ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = '#91725b'; ctx.fillRect(x + 1, y, w - 2, 7); ctx.fillRect(x + 2, y - 0, w - 4, 7);
  ctx.fillStyle = '#b8987a'; ctx.fillRect(x + 2, y, w - 4, 1);
  ctx.fillStyle = '#6e5246'; ctx.fillRect(x + 2, y + 6, w - 4, 1);
  text(ctx, t, x + 4, y + 1, color, 'left', null);
}
