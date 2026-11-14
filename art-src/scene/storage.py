# Block 4: storage, trade, guard and the other special rooms, plus the lift. Same canvas and rules as props.py.
# Ingot stacks are drawn in the placeholder ramp 'ingot'; the game swaps it for the metal's ramp.
#   python3 storage.py <out dir>
import sys, os
from workshop import *

R['silver'] = ['#2a2834', '#4e4c5e', '#8a889c', '#c4c2d2', '#f2f0f8']
R['ingot'] = R['iron']
METALS = {'iron': R['iron'], 'copper': R['copper'], 'gold': R['gold'], 'silver': R['silver']}

def box(p, x0, y0, x1, y1, ramp, top=1):
    m = rect_m(x0, y0, x1, y1); p.fill(m, ramp, idx=faces(m, top)); return m
def sack(p, x, yb, w=7, h=9, ramp='cream'):
    m = (ell(x, yb - h * 0.42, w, h * 0.55) | rect_m(x - w + 1, yb - h * 0.5, x + w - 1, yb)) & (yy <= yb)
    p.fill(m, ramp, bias=0.05, round_=1.2)
    p.fill(rect_m(x - 1, yb - h - 1, x + 1, yb - h + 1), ramp, idx=np.full((H, W), 2))            # tied neck
    p.c[yb - h + 1, x - 2] = ('wood', 2); p.c[yb - h + 1, x + 2] = ('wood', 2)
def coins(p, x, yb, n, ramp='gold'):
    for i in range(n):
        y = yb - i * 2
        p.fill(rect_m(x - 2, y - 1, x + 2, y), ramp, idx=np.where(yy == y - 1, 4, 2))
def chain(p, a, b, ramp='iron'):
    n = max(2, int(math.hypot(b[0] - a[0], b[1] - a[1]) // 2))
    for t in np.linspace(0, 1, n):
        x, y = round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t)
        p.c[y, x] = (ramp, 3 if (x + y) % 2 else 1)

# ------------------------------------------------------------------ warehouse
def rack():
    p = Part()
    for x in (20, 74): board(p, x, 30, x + 2, 95, 'oak', top_rows=1)
    for y in (48, 70, 92): board(p, 20, y, 76, y + 2, 'wood', top_rows=1, grain=True)
    for x in (28, 40): sack(p, x, 47, 6, 10)
    box(p, 50, 36, 64, 47, 'wood'); p.fill(rect_m(52, 41, 62, 41), 'wood', idx=np.full((H, W), 1), outline=False)
    sack(p, 70, 47, 3, 7, 'clay')
    for i, x in enumerate(range(25, 70, 9)):                                     # jars and pots
        if i % 2: p.fill(ell(x + 3, 65, 4, 4.6) | rect_m(x, 60, x + 6, 61), 'clay', bias=0.05, round_=1.2)
        else: box(p, x, 59, x + 6, 69, 'oak'); p.fill(rect_m(x + 1, 59, x + 5, 59), 'cream', idx=np.full((H, W), 3), outline=False)
    box(p, 25, 80, 42, 91, 'wood'); box(p, 46, 84, 56, 91, 'oak'); sack(p, 64, 91, 6, 8)
    return crop(p)
def ingots(metal='ingot'):
    p = Part()
    for row, (n, y) in enumerate(((4, 95), (3, 91), (2, 87), (1, 83))):
        for i in range(n):
            x = 48 - n * 5.5 + i * 11 + 1
            bar = poly([(x, y + 0.5), (x + 10, y + 0.5), (x + 9, y - 3.5), (x + 1, y - 3.5)])
            bi = np.full((H, W), 2); bi[(yy == y - 3) & bar] = 4; bi[(yy == y - 2) & bar] = 3
            bi[(xx >= x + 8.5) & bar] = 1
            p.fill(bar, metal, idx=bi)
            p.c[y - 1, int(x + 3)] = (metal, 1)                                    # stamp mark
    return crop(p)
def goods():
    p = Part()
    box(p, 24, 82, 42, 95, 'wood'); p.fill(rect_m(26, 88, 40, 88), 'wood', idx=np.full((H, W), 1), outline=False)
    for x, y in ((25, 83), (41, 83), (25, 94), (41, 94)): p.c[y, x] = ('iron', 3)
    sack(p, 52, 95, 8, 12); sack(p, 66, 95, 6, 9, 'clay')
    bundle = rect_m(28, 72, 46, 81)
    p.fill(bundle, 'teal', idx=faces(bundle, 1))                                    # wrapped bale
    for x in (33, 41): p.fill(rect_m(x, 72, x, 81), 'cream', idx=np.full((H, W), 3), outline=False)
    return crop(p)
def cart():
    p = Part()
    body = poly([(22, 70), (68, 70), (64, 86), (26, 86)])
    bi = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(body)):
        bi[y, x] = 4 if y == 70 else 3 if y == 71 else 1 if y == 85 else (1 if (y - 70) % 5 == 0 else 2)
    p.fill(body, 'wood', idx=bi)
    for x in (30, 60): p.fill(rect_m(x, 71, x + 1, 85), 'iron', idx=np.where(xx == x, 3, 1), outline=False)
    p.fill(ell(40, 68, 7, 3.6) & (yy <= 69), 'rock', bias=0.1)                                  # load of ore
    p.fill(ell(52, 68.5, 6, 3) & (yy <= 69), 'rock', bias=0.1); p.c[66, 41] = ('copper', 4); p.c[67, 52] = ('copper', 3)
    p.fill(cap((68, 73), (80, 68), 1.0), 'oak', bias=0.1)                                       # handle
    for cx in (33, 57):
        rim = ell(cx, 88.5, 7, 7) & ~ell(cx, 88.5, 5.2, 5.2)
        p.fill(rim, 'oak', bias=0.05)
        for a in range(4):
            ang = a * math.pi / 4
            p.fill(cap((cx - 5 * math.cos(ang), 88.5 - 5 * math.sin(ang)), (cx + 5 * math.cos(ang), 88.5 + 5 * math.sin(ang)), 0.6), 'oak', idx=np.full((H, W), 2), outline=False)
        p.fill(ell(cx, 88.5, 1.6, 1.6), 'iron', bias=0.1)
    return crop(p)

# ------------------------------------------------------------------ vault and trade
def vaultdoor():
    p = Part()
    frame = ell(48, 71, 26, 26) & (yy <= 95)
    ids = np.where(frame & ~ell(48, 71, 21, 21), (np.degrees(np.arctan2(yy + 0.5 - 71, xx + 0.5 - 48)) + 180) // 30, -1)
    g = blocks(ids.astype(int), 'sand', lambda i: (2, 3, 2)[i % 3], wrap=False)
    fi = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(ids >= 0)): fi[y, x] = g[y, x][1]
    p.fill(frame & ~ell(48, 71, 21, 21), 'sand', idx=fi)
    door = ell(48, 71, 21, 21)
    p.fill(door, 'blackiron', bias=0.05, round_=0.7)
    p.fill(ell(48, 71, 15, 15) & ~ell(48, 71, 14, 14), 'blackiron', idx=np.full((H, W), 1), outline=False)
    for a in range(12):                                                                       # bolts round the rim
        ang = a * math.pi / 6
        x, y = round(47.5 + 18 * math.cos(ang)), round(70.5 + 18 * math.sin(ang))
        p.c[y, x] = ('iron', 4); p.c[y + 1, x] = ('blackiron', 0)
    wheel = ell(48, 71, 6.5, 6.5) & ~ell(48, 71, 5, 5)
    p.fill(wheel, 'gold', bias=0.1, outline=False)
    for a in range(3):
        ang = a * math.pi / 3
        p.fill(cap((48 - 6 * math.cos(ang), 71 - 6 * math.sin(ang)), (48 + 6 * math.cos(ang), 71 + 6 * math.sin(ang)), 0.6), 'gold', idx=np.full((H, W), 3), outline=False)
    p.fill(ell(48, 71, 1.8, 1.8), 'gold', bias=0.2)
    for y in (58, 84): box(p, 22, y, 30, y + 3, 'blackiron')                                   # hinges
    return crop(p)
def goldpile():
    p = Part()
    m = (ell(48, 97, 19, 15) | ell(40, 96, 12, 8) | ell(57, 96, 11, 7)) & (yy <= 95)
    gi = shade(m, 0.1, 1.0)
    p.fill(m, 'gold', idx=gi)
    for y, x in zip(*np.nonzero(m)):                                                        # coin edges
        if hsh(x // 3, y // 2) % 4 == 0 and p.c[y, x][1] > 1: p.c[y, x] = ('gold', p.c[y, x][1] - 1)
    for x, y in ((40, 88), (52, 86), (58, 91), (45, 92)): p.c[y, x] = ('gold', 4); p.c[y - 1, x] = ('cream', 4)
    p.fill(ell(55, 90, 2, 1.6), 'quilt', bias=0.2); p.c[89, 54] = ('cream', 4)               # a ruby
    p.fill(ell(37, 92, 1.8, 1.5), 'teal', bias=0.2)
    coins(p, 72, 95, 3)
    p.fill(ell(26, 94.5, 2.5, 1), 'gold', idx=np.full((H, W), 3))
    return crop(p)
def scales():
    p = Part()
    box(p, 40, 92, 55, 95, 'oak'); p.fill(rect_m(46, 62, 49, 91), 'gold', idx=np.where(xx == 46, 4, np.where(xx == 49, 1, 2)))
    beam_ = cap((30, 66), (66, 62), 0.9); p.fill(beam_, 'gold', bias=0.1)
    p.fill(ell(48, 61, 2, 2), 'gold', bias=0.2)
    for cx, cy in ((30, 66), (66, 62)):
        chain(p, (cx, cy + 1), (cx - 5, cy + 13), 'gold'); chain(p, (cx, cy + 1), (cx + 5, cy + 13), 'gold')
        pan = ell(cx, cy + 14, 7, 2.4) & (yy >= cy + 13)
        p.fill(pan, 'gold', bias=0.05)
    coins(p, 30, 78, 2)                                                                       # the heavier side sits low
    p.fill(ell(66, 74, 2.5, 1.8), 'rock', bias=0.2)
    return crop(p)
def desk():
    p = bench(18, 77, 74)
    book = poly([(32, 73), (48, 71.5), (64, 73), (64, 74), (32, 74)])
    p.fill(book, 'cream', idx=np.where(yy <= 72, 4, 3))
    p.fill(rect_m(47, 71, 48, 74), 'cream', idx=np.full((H, W), 1), outline=False)
    for x in range(35, 46, 2): p.c[73, x] = ('cream', 1)
    for x in range(51, 62, 2): p.c[73, x] = ('cream', 1)
    p.fill(rect_m(31, 74, 65, 74), 'quilt', idx=np.full((H, W), 2), outline=False)           # binding
    p.fill(rect_m(22, 69, 26, 73), 'blackiron', idx=faces(rect_m(22, 69, 26, 73), 1))        # inkpot
    p.fill(cap((24, 69), (28, 60), 0.8), 'cream', bias=0.2, outline=False)                   # quill
    coins(p, 70, 73, 3); coins(p, 74, 73, 2, 'silver')
    return crop(p)
def noticeboard():
    p = Part()
    for x in (24, 68): board(p, x, 46, x + 3, 95, 'oak', top_rows=1)
    brd = rect_m(22, 48, 73, 80)
    p.fill(brd, 'wood', idx=faces(brd, 1))
    p.fill(rect_m(24, 50, 71, 78), 'oak', idx=np.where(xx == 24, 1, 2), outline=False)
    board(p, 19, 42, 76, 46, 'oak', top_rows=2)                                              # little roof
    for i, (x, y, w, h) in enumerate(((27, 52, 12, 14), (42, 54, 10, 10), (55, 51, 13, 12), (31, 68, 11, 8), (47, 66, 14, 10), (63, 65, 6, 9))):
        paper = rect_m(x, y, x + w - 1, y + h - 1)
        p.fill(paper, 'cream', idx=np.where(yy == y, 4, 3), outline=False)
        for ly in range(y + 3, y + h - 1, 2):
            for lx in range(x + 2, x + w - 2 - (ly * 3 + i) % 4): p.c[ly, lx] = ('cream', 1)
        p.c[y + h - 1, x + w - 1] = ('cream', 2)                                              # curled corner
        p.c[y, x + w // 2] = ('quilt', 4 if i % 2 else 3)                                     # pin
    return crop(p)

# ------------------------------------------------------------------ guard and explore
def weaponrack():
    p = Part()
    for x in (22, 72): board(p, x, 50, x + 2, 95, 'oak', top_rows=1)
    board(p, 20, 56, 76, 58, 'oak', top_rows=1); board(p, 20, 86, 76, 88, 'oak', top_rows=1)
    p.fill(cap((31, 92), (31, 40), 0.8), 'wood', bias=0.1); p.fill(poly([(29, 40), (33, 40), (31, 33)]), 'silver', bias=0.15)   # spear
    p.fill(cap((41, 92), (41, 50), 0.9), 'wood', bias=0.1)                                                                     # axe
    p.fill(poly([(42, 50), (48, 47), (49, 57), (42, 55)]), 'silver', bias=0.1)
    p.fill(rect_m(52, 52, 54, 85), 'silver', idx=np.where(xx == 52, 4, np.where(xx == 54, 1, 3)))                              # sword
    p.fill(poly([(52, 52), (54, 52), (53, 49)]), 'silver', bias=0.2)
    p.fill(rect_m(49, 85, 57, 86), 'gold', idx=np.where(yy == 85, 4, 2)); p.fill(rect_m(52, 87, 54, 91), 'oak', idx=np.full((H, W), 2))
    p.fill(cap((64, 92), (64, 58), 0.9), 'wood', bias=0.1)                                                                     # war hammer
    box(p, 59, 52, 69, 58, 'iron')
    return crop(p)
def armorstand():
    p = Part()
    box(p, 38, 92, 57, 95, 'oak'); board(p, 46, 44, 49, 91, 'oak', top_rows=0)
    board(p, 34, 52, 61, 54, 'oak', top_rows=1)
    mail = poly([(36, 53), (59, 53), (61, 74), (34, 74)])
    mi = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(mail)): mi[y, x] = 3 if (x + y * 2) % 4 == 0 else 1 if (x + y * 2) % 4 == 2 else 2   # rings
    p.fill(mail, 'iron', idx=mi)
    plate = poly([(39, 54), (56, 54), (55, 70), (40, 70)]); p.fill(plate, 'silver', bias=-0.15, round_=1.3)
    p.fill(rect_m(47, 56, 48, 68), 'silver', idx=np.where(xx == 47, 4, 1), outline=False)                # ridge
    p.fill(rect_m(34, 73, 61, 75), 'clay', idx=faces(rect_m(34, 73, 61, 75), 1))                   # belt
    p.c[74, 47] = ('gold', 4)
    helm = ell(47.5, 46, 7, 7) & (yy <= 49)
    p.fill(helm, 'silver', bias=-0.1, round_=1.3); p.fill(rect_m(40, 48, 55, 50), 'silver', idx=faces(rect_m(40, 48, 55, 50), 1))
    p.fill(rect_m(47, 41, 48, 50), 'gold', idx=np.full((H, W), 3), outline=False)                    # crest ridge
    sh = ell(66, 82, 8, 10) & (yy <= 95); p.fill(sh, 'quilt', bias=0.05, round_=0.8)                # shield leaning
    p.fill(ell(66, 82, 2.4, 2.4), 'gold', bias=0.2)
    return crop(p)
def dummy():
    p = Part()
    board(p, 46, 74, 49, 95, 'oak', top_rows=0); box(p, 40, 93, 55, 95, 'oak')
    body = ell(47.5, 66, 9, 12) & (yy <= 77)
    di = shade(body, 0.05, 1.0)
    for y, x in zip(*np.nonzero(body)):
        if (y - 56) % 6 == 0: di[y, x] = 1                                                       # rope bindings
    p.fill(body, 'cream', idx=di)
    p.fill(cap((30, 62), (65, 62), 1.6), 'oak', bias=0.1)                                         # arms
    p.fill(ell(47.5, 49, 6, 6), 'cream', bias=0.1)                                                # head
    ring = ell(47.5, 67, 5, 5) & ~ell(47.5, 67, 3, 3)
    p.fill(ring, 'quilt', idx=np.full((H, W), 3), outline=False); p.fill(ell(47.5, 67, 1.6, 1.6), 'quilt', idx=np.full((H, W), 3), outline=False)
    for x, y in ((39, 62), (56, 70), (44, 44), (51, 43), (29, 63)): p.c[y, x] = ('gold', 3)         # straw sticking out
    return crop(p)
def maptable():
    p = bench(14, 81, 74)
    m = poly([(20, 73), (75, 73), (77, 74.5), (18, 74.5)])
    p.fill(m, 'cream', idx=np.where(yy == 73, 4, 3))
    for x in range(22, 74):                                                                      # coast and road lines
        if hsh(x, 1) % 3: p.c[74 if (x // 6) % 2 else 73, x] = ('clay', 2) if x < 50 else ('teal', 2)
    p.c[73, 60] = ('quilt', 4); p.c[74, 61] = ('quilt', 4); p.c[74, 59] = ('quilt', 4)           # the X
    for x0 in (20, 73): p.fill(ell(x0, 72, 2, 2), 'cream', bias=0.1)                              # rolled ends
    p.fill(ell(34, 71.5, 2.6, 1.6), 'gold', bias=0.2)                                             # compass
    p.fill(rect_m(64, 70, 67, 72), 'rock', idx=faces(rect_m(64, 70, 67, 72), 1))                  # paperweight
    for i, x in enumerate((24, 34, 46)):                                                         # map rolls under the table
        p.fill(ell(x + 5, 93, 6, 2.2), 'cream', bias=0.1); p.fill(ell(x, 93, 1.6, 2.2), 'cream', idx=np.full((H, W), 4))
    return crop(p)

# ------------------------------------------------------------------ lift
def winch(frame=0):
    p = Part()
    for (a, b) in (((22, 95), (40, 50)), ((74, 95), (56, 50))): p.fill(cap(a, b, 2.2), 'oak', bias=0.05)
    board(p, 30, 76, 66, 78, 'oak', top_rows=1)
    drum = rect_m(36, 58, 60, 70)
    di = faces(drum, 0)
    for y, x in zip(*np.nonzero(drum)): di[y, x] = 3 if (y + frame) % 3 == 0 else 2 if (y + frame) % 3 == 1 else 1   # rope coils turn
    p.fill(drum, 'cream', idx=di)
    for x in (34, 61): box(p, x, 55, x + 2, 73, 'wood')
    p.fill(ell(48, 64, 2, 2), 'iron', bias=0.1)
    a = frame * math.pi / 2
    hx, hy = 70 + 6 * math.cos(a), 64 + 6 * math.sin(a)
    p.fill(cap((63, 64), (70, 64), 0.8), 'iron', idx=np.full((H, W), 2), outline=False)
    p.fill(cap((70, 64), (hx, hy), 0.8), 'iron', bias=0.1, outline=False); p.fill(ell(hx, hy, 1.4, 1.4), 'oak', bias=0.1)
    for y in range(71, 96): p.c[y, 48] = ('cream', 3 if y % 3 else 1)                          # rope down the shaft
    return crop(p)
def liftcage():
    p = Part()
    for y in range(10, 60): p.c[y, 48] = ('cream', 3 if y % 3 else 1)
    p.fill(poly([(40, 60), (56, 60), (48, 56)]), 'iron', bias=0.1)
    for x in (28, 67): board(p, x, 60, x + 2, 95, 'oak', top_rows=1)
    board(p, 26, 59, 71, 61, 'oak', top_rows=1)
    for y in (72, 82): p.fill(rect_m(30, y, 66, y), 'iron', idx=np.full((H, W), 2), outline=False)   # rails
    board(p, 24, 92, 73, 95, 'wood', top_rows=1, seams=(40, 57))
    box(p, 52, 84, 63, 91, 'wood')
    return crop(p)

STORE = {'rack': rack, 'ingots': ingots, 'goods': goods, 'vaultdoor': vaultdoor, 'goldpile': goldpile, 'scales': scales,
         'desk': desk, 'cart': cart, 'weaponrack': weaponrack, 'armorstand': armorstand, 'dummy': dummy,
         'maptable': maptable, 'noticeboard': noticeboard, 'winch': winch, 'liftcage': liftcage}

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    T = {k: f() for k, f in TILES.items()}; P = {k: f() for k, f in PROPS.items()}
    Lv = {k: f() for k, f in LIVING.items()}
    frames = []
    for fr in range(4):
        S = {k: (f(fr) if k == 'winch' else f()) for k, f in STORE.items()}
        W_ = 16 * CELL
        cv = np.full((RH * 2, W_), '#000000', object); em = np.zeros(cv.shape, bool); lights = []
        from shells import blit
        blit(cv, em, T['shaft'], 0, 0); blit(cv, em, T['shaft'], 0, RH)
        put(cv, em, S['winch'], 24, FLOOR - 40); put(cv, em, S['liftcage'], 24, RH + FLOOR)
        F = FLOOR
        # floor 1: warehouse (7), vault (4), trade depot (4)
        x0 = CELL
        room(cv, em, x0, 0, 7, T['wall_rock'], T['floor_earth'])
        put(cv, em, S['rack'], x0 + 40, F); put(cv, em, S['rack'], x0 + 100, F)
        for i, m in enumerate(('iron', 'copper')):
            g = dict(S['ingots']); g['grid'] = np.vectorize(lambda v: (m, v[1]) if v is not None else None, otypes=[object])(g['grid'])
            put(cv, em, g, x0 + 150 + i * 42, F)
        put(cv, em, S['goods'], x0 + 236, F); put(cv, em, S['cart'], x0 + 298, F)
        put(cv, em, P['torch'], x0 + 144, 92); lights.append((x0 + 144, 76, 140, 0.9))
        x0 = 8 * CELL
        room(cv, em, x0, 0, 4, T['wall_ashlar'], T['floor_flags'])
        put(cv, em, S['vaultdoor'], x0 + 54, F); put(cv, em, Lv['chest'], x0 + 104, F); put(cv, em, S['goldpile'], x0 + 146, F)
        put(cv, em, P['torch'], x0 + 104, 92); lights.append((x0 + 104, 76, 110, 0.85))
        x0 = 12 * CELL
        room(cv, em, x0, 0, 4, T['wall_panel'], T['floor_planks'])
        put(cv, em, S['noticeboard'], x0 + 40, F); dwarf(cv, em, 'd_stand', x0 + 104, F - 1)
        put(cv, em, S['desk'], x0 + 104, F); put(cv, em, S['scales'], x0 + 160, F)
        put(cv, em, P['lantern'], x0 + 100, 20); lights.append((x0 + 100, 46, 110, 0.75))
        # floor 2: barracks (7), expedition hall (7)
        y0 = RH; F2 = y0 + FLOOR; x0 = CELL
        room(cv, em, x0, y0, 7, T['wall_brick'], T['floor_flags'])
        put(cv, em, S['weaponrack'], x0 + 56, F2); put(cv, em, S['armorstand'], x0 + 120, F2)
        put(cv, em, S['dummy'], x0 + 220, F2); dwarf(cv, em, 'd_side', x0 + 190, F2)
        put(cv, em, Lv['banner'], x0 + 168, y0 + 16)
        put(cv, em, P['torch'], x0 + 90, y0 + 92); put(cv, em, P['torch'], x0 + 270, y0 + 92)
        lights += [(x0 + 90, y0 + 76, 110, 0.85), (x0 + 270, y0 + 76, 110, 0.85)]
        x0 = 8 * CELL
        room(cv, em, x0, y0, 8, T['wall_panel'], T['floor_planks'])
        put(cv, em, Lv['rug'], x0 + 150, F2)
        put(cv, em, S['maptable'], x0 + 150, F2); dwarf(cv, em, 'd_stand', x0 + 130, F2 - 1); put(cv, em, S['maptable'], x0 + 150, F2)
        put(cv, em, P['candle'], x0 + 176, F2 - 22)
        put(cv, em, S['noticeboard'], x0 + 270, F2); put(cv, em, P['shelf'], x0 + 60, y0 + 96)
        put(cv, em, Lv['chandelier'], x0 + 150, y0 + 14); lights += [(x0 + 150, y0 + 40, 150, 0.8), (x0 + 176, F2 - 30, 40, 0.4)]
        frames.append(light(cv, em, lights).resize((W_ * 2, RH * 4), Image.NEAREST))
    frames[0].save(f'{out}/storage_x2.png')
    frames[0].save(f'{out}/storage_x2.gif', save_all=True, append_images=frames[1:], duration=200, loop=0)
    S = {k: f() for k, f in STORE.items()}
    names = list(S); cw = 100; cols = 8; rows = 2
    sh = Image.new('RGB', (cols * cw, rows * 100), (36, 28, 34))
    for n, k in enumerate(names):
        g = S[k]['grid']; cx, cy = (n % cols) * cw + cw // 2, (n // cols) * 100 + 96
        for j in range(g.shape[0]):
            for i in range(g.shape[1]):
                if g[j, i] is not None: sh.putpixel((cx - g.shape[1] // 2 + i, cy - g.shape[0] + j), rgb(col(g[j, i])))
    sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST).save(f'{out}/storage_props_x2.png')
    print('ok')
