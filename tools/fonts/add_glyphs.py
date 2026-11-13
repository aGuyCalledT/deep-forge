"""Adds the few symbols the game uses (· × → ↑ ↓ – — ∞ ’ …) to the pixel fonts, drawn on their own pixel grid,
so nothing falls back to another font. Usage: python3 tools/fonts/add_glyphs.py IN.ttf OUT.ttf [pixel] [ytop]"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

# rows from top to bottom; '#' is a pixel. 'top' is the row (in pixels above the baseline) of the first row's top edge.
GLYPHS = {
    0x00B7: ('periodcentered', 3, ["#"]),
    0x00D7: ('multiply', 4, ["#.#", ".#.", "#.#"]),
    0x2013: ('endash', 3, ["#####"]),
    0x2014: ('emdash', 3, ["########"]),
    0x2192: ('arrowright', 5, ["...#.", "....#", "#####", "....#", "...#."]),
    0x2191: ('arrowup', 6, ["..#..", ".###.", "#.#.#", "..#..", "..#..", "..#.."]),
    0x2193: ('arrowdown', 6, ["..#..", "..#..", "..#..", "#.#.#", ".###.", "..#.."]),
    0x221E: ('infinity', 4, [".#...#.", "#.#.#.#", ".#...#."]),
    0x2019: ('quoteright', 6, ["#", "#"]),
    0x2018: ('quoteleft', 6, ["#", "#"]),
    0x2026: ('ellipsis', 1, ["#.#.#"]),
}

def add(src, dst, px=128, scale_top=1.0):
    f = TTFont(src)
    order = f.getGlyphOrder()
    glyf, hmtx = f['glyf'], f['hmtx']
    added = []
    for cp, (name, top, rows) in GLYPHS.items():
        if any(cp in t.cmap for t in f['cmap'].tables if t.isUnicode()):
            continue
        pen = TTGlyphPen(None)
        for r, row in enumerate(rows):
            y1 = int((top * scale_top - r) * px)
            x = 0
            while x < len(row):
                if row[x] != '#': x += 1; continue
                s = x
                while x < len(row) and row[x] == '#': x += 1
                x0, x1, y0 = s * px, x * px, y1 - px
                pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
        glyf[name] = pen.glyph()
        if name not in order: order.append(name)
        hmtx[name] = ((len(rows[0]) + 1) * px, 0)
        for t in f['cmap'].tables:
            if t.isUnicode() and t.format in (4, 12): t.cmap[cp] = name
        added.append(chr(cp))
    f.setGlyphOrder(order)
    f['maxp'].numGlyphs = len(order)
    f.save(dst)
    print(dst, 'added', ''.join(added))

if __name__ == '__main__':
    add(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 128)
