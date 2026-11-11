from base import *
from side import outline
def mass(spans, pat="HJHh", light_left=True, dark_cols=(), dark_rows_from=None, extra=()):
    """Fill row spans {y: (x0, x1)} (inclusive) with a strand pattern, then outline."""
    g = blank()
    for y, (x0, x1) in spans.items():
        for x in range(x0, x1 + 1):
            c = pat[x % len(pat)]
            if x == x1 or x in dark_cols: c = 'k' if c in 'hH' else 'h'
            if dark_rows_from is not None and y >= dark_rows_from: c = {'J': 'H', 'H': 'h', 'h': 'k'}.get(c, c)
            g[y][x] = c
    outline(g, 'kHhJ')
    for y, x, s in extra:
        for i, c in enumerate(s):
            if c != ' ': g[y][x + i] = c
    return rows(g)
TOP = {2: (13, 17), 3: (12, 18), 4: (11, 19), 5: (10, 19), 6: (9, 18), 7: (9, 12), 8: (9, 12), 9: (9, 11), 10: (9, 11), 11: (9, 11), 12: (9, 11)}
BROW = [(9, 18, "hh"), (8, 16, "  ")]
def merge(*ds):
    out = {}
    for d in ds:
        for y, (a, b) in d.items():
            if y in out: out[y] = (min(out[y][0], a), max(out[y][1], b))
            else: out[y] = (a, b)
    return out
HAIR_S = {
 'short':   mass(TOP, extra=BROW + [(8, 15, "h"), (9, 15, "h"), (10, 15, "h")]),
 'bald':    mass({8: (9, 11), 9: (8, 11), 10: (8, 11), 11: (8, 11), 12: (9, 11)}, pat="JJH", extra=[(9, 18, "JJ")]),
 'topknot': mass(merge(TOP, {0: (14, 16), 1: (14, 16)}), extra=BROW + [(2, 14, "gGy"), (8, 15, "h"), (9, 15, "h")]),
 'long':    mass(merge(TOP, {y: (7, 11) for y in range(7, 25)}, {25: (8, 10)}), dark_rows_from=20, extra=BROW),
 'braids':  mass(merge(TOP, {y: (11, 13) for y in range(13, 24)}), extra=BROW + [(21, 11, "TtT"), (22, 11, "uTu")]),
 'bun':     mass(merge(TOP, {1: (9, 12), 2: (8, 12), 3: (8, 12), 4: (8, 11), 5: (8, 10)}), extra=BROW + [(5, 11, "gG"), (6, 11, "Gy")]),
}
FACE_BEARD = {12: (15, 16), 13: (15, 17)}
def bspan(rows_):
    return merge(FACE_BEARD, rows_)
BEARD_S = {
 'full':  mass(bspan({14: (14, 23), 15: (14, 23), 16: (13, 22), 17: (13, 22), 18: (13, 22), 19: (13, 22), 20: (13, 21), 21: (14, 21), 22: (15, 20)}), pat="HJHh", dark_rows_from=20),
 'fork':  mass(bspan({14: (14, 23), 15: (14, 23), 16: (13, 22), 17: (13, 22), 18: (14, 22), 19: (14, 21), 20: (15, 21), 21: (16, 21),
                       22: (17, 20), 23: (17, 20), 24: (17, 20), 25: (17, 20), 26: (17, 20), 27: (18, 20), 28: (18, 19)}),
                extra=[(24, 17, "gGGy")]),
 'wide':  mass(bspan({14: (13, 24), 15: (12, 24), 16: (11, 24), 17: (11, 24), 18: (11, 24), 19: (11, 24), 20: (11, 23), 21: (12, 23), 22: (13, 22), 23: (15, 20)}), dark_rows_from=21),
 'long':  mass(bspan({14: (14, 23), 15: (14, 23), 16: (13, 22), 17: (13, 22), 18: (13, 22), 19: (14, 22), 20: (14, 22), 21: (15, 22), 22: (15, 22),
                       23: (16, 22), 24: (16, 22), 25: (16, 21), 26: (17, 21), 27: (17, 21), 28: (18, 21), 29: (18, 21), 30: (19, 21), 31: (19, 20), 32: (20, 20)}),
                pat="JJH", extra=[(26, 17, "ygGGy")]),
 'short': mass({12: (15, 15), 13: (15, 15), 14: (19, 23), 15: (18, 22), 16: (18, 21), 17: (18, 20)}),
}
HAT_S = {
 'helm': segs([(1,12,"OOOOOOO"),(2,11,"OMWWMMmO"),(3,10,"OMWWMMMMmO"),(4,9,"OMWMMMMMMmO"),(5,9,"OMMMMMMMMmmO"),(6,8,"OMMMMMMMMMmmO"),
               (7,7,"OWWMWMMMWMMmmO"),(8,7,"OmmOmmmmOmmmnO"),(9,7,"OOOOOOOOOOOOOO")]),
 'cap':  segs([(0,13,"OOO"),(1,12,"OXQXO"),(1,11,"OOXQXOO"),(2,10,"OXQQQQCO"),(3,10,"OXQQQQQCO"),(4,9,"OXQQQQQQCO"),(5,9,"OQQQQQQQCcO"),
               (6,8,"OXXXXXXXXXXO"),(7,8,"OQCQCQCQCQcO"),(8,8,"OOOOOOOOOOOO")]),
 'hood': segs([(1,12,"OOOOOOO"),(2,10,"OOXQQQQCOO"),(3,9,"OXQQQQQQQCO"),(4,8,"OXQQQQQQQQCO"),(5,7,"OXQQQQQQQQQCcO"),(6,7,"OQQQQCCCCCCCcO"),
               (7,6,"OQQQCO"),(7,19,"OcO"),(8,6,"OQQCO"),(8,20,"O"),(9,6,"OQQCO"),(10,6,"OQQCO"),(11,6,"OQQCO"),(12,6,"OQQCO"),(13,6,"OQQCcO"),
               (14,6,"OQQQCO"),(15,6,"OQQQCcO"),(16,6,"OQQQQCO"),(17,6,"OQQQQCcO"),(18,6,"OOOOOOOO")]),
}
