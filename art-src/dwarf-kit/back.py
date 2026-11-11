from base import *
from front import MALE, FEMALE, HEAD
from side import arm, outline, leg
from sidehair import mass
# head from behind: the front head without a face
HEAD_B = segs([
(3,11,"OOOOOOOOOO"),(4,10,"OSSSSSSssssO"),(5,9,"OSSSSSSSssssdO"),(6,9,"OSSSSSSsssssdO"),(7,9,"OSSSSSsssssddO"),
(8,9,"OSSssssssssddO"),(9,9,"OSsssssssssddO"),(10,8,"OssssssssssssddO"),(11,8,"OsssssssssssdddO"),(12,8,"OssssssssssddddO"),
(13,9,"OssssssssssddO"),(14,9,"OsssssssssdddO"),(15,9,"OssssssssddddO"),(16,10,"OssssssssddO"),
])
SKULL = {3: (12, 19), 4: (11, 20), 5: (10, 21), 6: (10, 21), 7: (10, 21), 8: (10, 21), 9: (10, 21), 10: (10, 21), 11: (10, 21), 12: (10, 21)}
def sk(extra_rows=None, **kw):
    d = dict(SKULL)
    for y, v in (extra_rows or {}).items(): d[y] = v
    return d
HAIR_B = {
 'short':   mass(sk({2: (12, 19), 13: (10, 21), 14: (11, 20)})),
 'bald':    mass({9: (9, 11), 10: (9, 11), 11: (9, 11), 12: (10, 11), 9.5: (20, 22)} if False else {9: (9, 11), 10: (9, 11), 11: (9, 11), 12: (10, 11)}, pat="JJH")
            if False else over(mass({9: (9, 11), 10: (9, 11), 11: (9, 11), 12: (10, 11)}, pat="JJH"), mass({9: (20, 22), 10: (20, 22), 11: (20, 22), 12: (20, 21)}, pat="JJH")),
 'topknot': mass(sk({0: (14, 17), 1: (14, 17), 2: (12, 19), 13: (10, 21), 14: (11, 20)}), extra=[(2, 14, "gGGy")]),
 'long':    mass(sk({2: (12, 19), **{y: (9, 22) for y in range(13, 25)}, 25: (10, 21), 26: (12, 19)}), dark_rows_from=21),
 'braids':  over(mass(sk({2: (12, 19), 13: (10, 21), 14: (11, 20)})),
                 mass({y: (9, 11) for y in range(13, 24)}, extra=[(21, 9, "TtT"), (22, 9, "uTu")]),
                 mass({y: (20, 22) for y in range(13, 24)}, extra=[(21, 20, "TtT"), (22, 20, "uTu")])),
 'bun':     mass(sk({0: (13, 18), 1: (12, 19), 2: (12, 19), 13: (10, 21), 14: (11, 20)}), extra=[(2, 13, "gGGGGy")]),
}
BEARD_B = {k: over(mass({14: (7, 8), 15: (7, 8), 16: (7, 8), 17: (8, 8)}), mass({14: (23, 24), 15: (23, 24), 16: (23, 24), 17: (23, 23)})) for k in ('wide',)}
for k in ('full', 'fork', 'long'):
    BEARD_B[k] = over(mass({15: (8, 8), 16: (8, 8)}), mass({15: (23, 23), 16: (23, 23)}))
def hood_back():
    g = blank()
    spans = {1: (12, 19), 2: (11, 20), **{y: (9, 22) for y in range(3, 15)}, 15: (9, 22), 16: (8, 23), 17: (7, 24)}
    for y, (x0, x1) in spans.items():
        for x in range(x0, x1 + 1):
            c = 'X' if y <= 2 or x == x0 else 'Q' if (x + y // 3) % 4 else 'C'
            if x >= x1 - 1: c = 'C' if x == x1 - 1 else 'c'
            if y == 17: c = 'C'
            g[y][x] = c
    outline(g, 'cCQX')
    return rows(g)
HAT_B = {'hood': hood_back()}
def backify(b, s):
    """The front body seen from behind: no buttons or buckle, a plain belt, no neckline."""
    out = []
    for y, r in enumerate(b):
        r = r.replace('g', 'E').replace('G', 'E').replace('y', 'e')
        if s == 'f' and 17 <= y <= 20: r = ''.join('t' if c in 'sSa' else c for c in r)
        if s == 'f' and 17 == y: r = r[:12] + 'OOOOOOOO' + r[20:]
        out.append(r)
    return out
def strip_arms(b, s):
    cut_l = 8; cut_r = 24
    return [''.join('.' if (19 <= y <= 31 and (x < cut_l or x > cut_r)) else c for x, c in enumerate(r)) for y, r in enumerate(b)]
def climb_frames(s):
    base = MALE if s == 'm' else FEMALE
    b = strip_arms(backify(base, s), s)
    # close the sides where the arms were
    g = [list(r) for r in b]
    outline(g, 'TtuvEeSsdaPpqLBbl')
    b = rows(g)
    hem = 34 if s == 'm' else 36
    # legs: one lifted to the next rung
    legs_up = crop_rows(base, hem, H, 0, 16)
    legs_dn = crop_rows(base, hem, H, 16, W)
    f0 = dict(body=over(shift(legs_up, dy=-2), legs_dn, crop_rows(b, 0, hem)), arms=over(arm((8, 20), (6, 9)), arm((23, 20), (25, 15))))
    f1 = dict(body=over(legs_up, shift(legs_dn, dy=-2), crop_rows(b, 0, hem)), arms=over(arm((8, 20), (6, 15)), arm((23, 20), (25, 9))))
    return [f0, f1]
