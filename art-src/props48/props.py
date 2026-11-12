# Furniture and fittings for rooms built from parts, in the scale of the 48 x 64 dwarves (a dwarf is ~47 px tall,
# rooms are 144 px high with the floor at y 135). Every prop is drawn on a 96 x 96 canvas standing on row 95
# (wall props: hung where they are drawn) and cropped; the anchor is the bottom centre.
from engine import *

GROUND = 95

def faces(m, top_rows=2, left_hi=True, ramp_top=4):
    """Flat shading for boxy wooden things: top face light, front mid, left edge lit, right and bottom edges dark."""
    idx = np.full((H, W), 2)
    ys, xs = np.nonzero(m)
    if not len(ys): return idx
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    for y, x in zip(ys, xs):
        i = 2
        if y < y0 + top_rows: i = ramp_top if y == y0 else 3
        elif left_hi and x == x0: i = 3
        if x == x1 or y == y1: i = 1
        idx[y, x] = i
    return idx
def rect_m(x0, y0, x1, y1): return (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
def board(p, x0, y0, x1, y1, ramp, top_rows=2, seams=(), seam_v=True, grain=False):
    m = rect_m(x0, y0, x1, y1)
    idx = faces(m, top_rows)
    for s in seams:
        if seam_v: idx[(xx == s) & m & (yy >= y0 + top_rows)] = 1
        else: idx[(yy == s) & m] = 1
    if grain:      # a few grain lines along the board, where a plane would leave them
        for y, x in zip(*np.nonzero(m & (yy >= y0 + top_rows) & (yy < y1))):
            if (x * 7 + y * 13) % 23 == 0 and idx[y, x] == 2: idx[y, x] = 1
    p.fill(m, ramp, idx=idx)
    return p
def crop(p, anchor_x=48, anchor_y=GROUND + 1):
    ys, xs = np.nonzero(p.c != None)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    return {'grid': p.c[y0:y1 + 1, x0:x1 + 1], 'anchor': (anchor_x - x0, anchor_y - y0)}

# ------------------------------------------------------------------ furniture
def table():
    p = Part()
    board(p, 33, 79, 36, 95, 'oak', top_rows=0); board(p, 59, 79, 62, 95, 'oak', top_rows=0)       # legs
    board(p, 37, 87, 58, 88, 'oak', top_rows=1)                                                      # brace
    board(p, 31, 93, 38, 95, 'oak', top_rows=1); board(p, 57, 93, 64, 95, 'oak', top_rows=1)       # feet
    board(p, 28, 74, 67, 78, 'wood', top_rows=2, seams=(41, 54), grain=True)                         # top
    return crop(p)
def bench():
    p = Part()
    board(p, 33, 88, 36, 95, 'oak', top_rows=0); board(p, 59, 88, 62, 95, 'oak', top_rows=0)
    board(p, 30, 84, 65, 87, 'wood', top_rows=2, seams=(47,), grain=True)
    return crop(p)
def stool():
    p = Part()
    for x in (42, 52): board(p, x, 87, x + 1, 95, 'oak', top_rows=0)
    board(p, 47, 87, 48, 95, 'oak', top_rows=0)
    p.fill(rect_m(43, 91, 52, 91), 'oak', idx=np.full((H, W), 1), outline=False)
    m = ell(48, 85.5, 7.6, 2.6)
    p.fill(m, 'wood', idx=np.where(yy <= 84, 4, np.where(yy == 85, 3, 2)))
    return crop(p)
def chair():
    p = Part()
    for x in (41, 53): board(p, x, 70, x + 1, 95, 'oak', top_rows=1)
    board(p, 41, 70, 54, 72, 'oak', top_rows=1)
    board(p, 43, 76, 52, 77, 'oak', top_rows=1)
    board(p, 39, 84, 56, 86, 'wood', top_rows=2, grain=True)
    return crop(p)
def barrel():
    p = Part()
    hw = lambda y: 7.4 + 1.6 * math.sin(math.pi * (y - 72) / 23)
    m = np.zeros((H, W), bool)
    for y in range(72, 96): m[y] = np.abs(xx[y] + 0.5 - 48) <= hw(y)
    idx = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(m)):
        u = (x + 0.5 - 48) / hw(y)                   # -1 left .. 1 right of the bulge
        idx[y, x] = 4 if u < -0.55 else 3 if u < -0.05 else 2 if u < 0.6 else 1
        stave = (math.asin(max(-1, min(1, u))) / math.pi + 0.5) * 6
        if abs(stave - round(stave)) < 0.13 and 0 < round(stave) < 6: idx[y, x] = max(1, idx[y, x] - 1)
    p.fill(m, 'oak', idx=idx)
    for y0 in (75, 89):                              # iron hoops
        hm = m & (yy >= y0) & (yy <= y0 + 1)
        p.fill(hm, 'iron', idx=np.where(yy == y0, 3, 1) + 0 * idx, outline=False)
        for y, x in zip(*np.nonzero(hm)):
            u = (x + 0.5 - 48) / hw(y)
            if u < -0.5: p.c[y, x] = ('iron', 4 if y == y0 else 2)
            elif u > 0.6: p.c[y, x] = ('iron', 1)
    lid = ell(48, 72.6, 7.3, 1.8)
    p.fill(lid, 'wood', idx=np.where((xx + yy) % 7 == 0, 3, 2))
    return crop(p)
def crate():
    p = Part()
    m = rect_m(37, 78, 58, 95)
    idx = faces(m, 0)
    for y in (83, 89): idx[(yy == y) & m] = 1                                   # plank joints
    inner = rect_m(39, 80, 56, 93)
    for y, x in zip(*np.nonzero(m & ~inner)):
        idx[y, x] = 3 if (x <= 38 or y <= 79) else 1 if (x >= 57 or y >= 94) else 2
    for t in np.linspace(0, 1, 40):                                              # diagonal brace
        x = round(39 + t * 17); y = round(93 - t * 13)
        for d in (0, 1):
            if inner[y, x + d]: idx[y, x + d] = 3 if d == 0 else 1
    p.fill(m, 'wood', idx=idx)
    for x, y in ((38, 79), (57, 79), (38, 94), (57, 94)): p.c[y, x] = ('iron', 3)
    return crop(p)
def bed():
    p = Part()
    board(p, 20, 70, 24, 95, 'oak', top_rows=1); p.fill(ell(22.5, 69, 2.6, 2.2), 'oak', bias=0.1)     # headboard post
    board(p, 25, 74, 27, 92, 'oak', top_rows=1)
    board(p, 71, 79, 75, 95, 'oak', top_rows=1); p.fill(ell(73.5, 78.5, 2.6, 2.0), 'oak', bias=0.1)   # footboard post
    board(p, 25, 88, 74, 92, 'oak', top_rows=1, seams=(49,))                                            # frame rail
    p.fill(rect_m(27, 82, 70, 87), 'cream', idx=faces(rect_m(27, 82, 70, 87), 1))                       # mattress
    q = poly([(36, 81.5), (70.5, 81.5), (71.5, 90.5), (35, 90.5)])
    qi = shade(q, 0.05, 1.1)
    for y, x in zip(*np.nonzero(q)):
        if ((x - 36) // 6 + (y - 81) // 4) % 2: qi[y, x] = max(1, qi[y, x] - 1)                       # patchwork
    p.fill(q, 'quilt', idx=qi)
    p.fill(rect_m(36, 81, 70, 82) & q | rect_m(36, 81, 70, 82), 'cream', idx=np.where(yy == 81, 4, 3))  # folded sheet
    p.fill(ell(31.5, 80.4, 5.2, 2.8), 'cream', bias=0.15, round_=1.3)                                    # pillow
    return crop(p)
def shelf():
    p = Part()
    for yb in (55, 71, 87):
        for bx in (33, 62):                          # iron brackets
            p.fill(poly([(bx - 0.5, yb + 2.5), (bx + 2.5, yb + 2.5), (bx + 2.5, yb + 7.5)]), 'iron', bias=0.05)
        board(p, 28, yb, 67, yb + 2, 'wood', top_rows=1, grain=True)
    def jar(x, yb, h, ramp, cork=True):
        m = poly([(x - 2.6, yb - h), (x + 2.6, yb - h), (x + 3.0, yb - h + 2), (x + 3.0, yb - 0.5), (x - 3.0, yb - 0.5), (x - 3.0, yb - h + 2)])
        p.fill(m, ramp, bias=0.1, round_=1.3)
        p.px([(x - 2, yb - h + 3), (x - 2, yb - h + 4)], ramp, 4)                  # glint
        if cork: p.fill(rect_m(x - 1.5, yb - h - 2, x + 1.5, yb - h - 1), 'wood', idx=faces(rect_m(x - 1.5, yb - h - 2, x + 1.5, yb - h - 1), 1))
    def bottle(x, yb, ramp):
        p.fill(ell(x, yb - 3.5, 2.8, 3.5) | rect_m(x - 0.6, yb - 10, x + 0.6, yb - 5), ramp, bias=0.1)
        p.px([(x - 1, yb - 5)], ramp, 4)
    def pot(x, yb):
        p.fill(ell(x, yb - 3.2, 4.0, 3.4) | rect_m(x - 3, yb - 7, x + 3, yb - 6), 'clay', bias=0.05, round_=1.2)
    def scrolls(x, yb):
        for i, (dx, dy) in enumerate(((0, 0), (5, 0), (2.5, -3))):
            p.fill(ell(x + dx, yb - 2 + dy, 2.2, 1.9), 'cream', bias=0.1)
            p.px([(round(x + dx), round(yb - 2 + dy))], 'cream', 1)
    jar(33, 55, 8, 'teal'); jar(40, 55, 6, 'gold'); bottle(47, 55, 'moss'); pot(56, 55); bottle(63, 55, 'quilt')
    scrolls(33, 71); pot(46, 71); jar(53, 71, 7, 'clay', cork=False); jar(61, 71, 9, 'teal')
    bottle(33, 87, 'gold'); bottle(38, 87, 'gold'); pot(47, 87); scrolls(55, 87); jar(64, 87, 6, 'moss')
    return crop(p, anchor_y=90)
def door():
    p = Part()
    outer = (rect_m(31, 52, 64, 95) | ell(48, 52.5, 17, 17)) & (yy >= 35)
    inner = (rect_m(35, 52, 60, 95) | ell(48, 52.5, 13, 13)) & (yy >= 39)
    sm = outer & ~inner
    si = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(sm)):            # stone blocks round the arch
        ang = math.atan2(y - 52.5, x - 48)
        block = int((ang + math.pi) / (math.pi / 6)) if y < 52 else int((y - 52) / 7) + 20 + (x > 48) * 10
        si[y, x] = 3 if (block * 37) % 3 == 0 else 2
        if y < 52 and abs(((ang + math.pi) / (math.pi / 6)) % 1) < 0.08: si[y, x] = 1
        if y >= 52 and (y - 52) % 7 == 0: si[y, x] = 1
        if x <= 32 or (y < 52 and ang < -1.9): si[y, x] = min(4, si[y, x] + 1)
    p.fill(sm, 'stone', idx=si)
    di = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(inner)):
        if (x - 35) % 6 == 0: di[y, x] = 1                 # plank joints
        elif (x - 35) % 6 == 1: di[y, x] = 3
        if (x * 5 + y * 11) % 29 == 0 and di[y, x] == 2: di[y, x] = 1
    p.fill(inner, 'oak', idx=di, outline=False)
    for yb in (58, 84):                                    # iron bands with rivets
        band = inner & (yy >= yb) & (yy <= yb + 1)
        p.fill(band, 'iron', idx=np.where(yy == yb, 3, 1), outline=False)
        for x in range(37, 60, 5): p.c[yb, x] = ('iron', 4)
    p.fill(ring_m := ((((xx + 0.5 - 55) ** 2 + (yy + 0.5 - 72) ** 2) <= 6.5) & (((xx + 0.5 - 55) ** 2 + (yy + 0.5 - 72) ** 2) >= 2)), 'iron', bias=0.1, outline=False)
    return crop(p)

# ------------------------------------------------------------------ lights and small things
def torch(frame=0):
    p = Part()
    p.fill(rect_m(46, 72, 50, 78), 'iron', idx=faces(rect_m(46, 72, 50, 78), 1))               # wall plate
    p.fill(cap((48.5, 75), (47.5, 64.5), 1.2), 'wood', bias=0.05)                              # handle
    p.fill(poly([(44.5, 61), (51.5, 61), (50.5, 64.5), (45.5, 64.5)]), 'iron', bias=0.1)       # cup
    tip = [(47.4, 48.5), (48.8, 49.2)][frame % 2]
    flame = poly([(44.6, 60.5), (51.4, 60.5), (52, 57), (tip[0] + 1.5, 53), tip, (tip[0] - 1.8, 53.5), (44, 57)])
    fi = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(flame)):
        d = math.hypot(x + 0.5 - 48, (y + 0.5 - 58) * 1.3)
        fi[y, x] = 4 if d < 2.0 else 3 if d < 3.6 else 2 if d < 5.2 else 1
    p.fill(flame, 'flame', idx=fi, outline=False)
    return crop(p, anchor_y=78)
def candle(frame=0):
    p = Part()
    p.fill(rect_m(46, 88, 49, 95), 'cream', idx=faces(rect_m(46, 88, 49, 95), 1))
    p.fill(ell(47.5, 95.2, 3.6, 1.0), 'cream', bias=0.0, outline=False)
    tip = [(47.6, 82.5), (48.4, 83)][frame % 2]
    f = poly([(46.4, 87.5), (48.6, 87.5), (49.2, 86), tip, (45.8, 86)])
    p.fill(f, 'flame', idx=np.where(yy >= 86, 4, 3), outline=False)
    return crop(p, anchor_x=48)
def lantern():
    p = Part()
    for y in range(40, 60, 3): p.fill(ell(48, y + 1.2, 1.1, 1.4), 'iron', bias=0.05, outline=(y % 2 == 0))   # chain
    p.fill(poly([(44, 60), (52, 60), (54, 63), (42, 63)]), 'iron', bias=0.1)                         # cap
    glass = rect_m(43, 64, 53, 73)
    gi = np.full((H, W), 3)
    gi[ell(48, 69, 3.0, 3.6)] = 4
    p.fill(glass, 'flame', idx=gi, outline=False)
    for x in (43, 48, 53): p.fill(rect_m(x, 64, x, 73), 'iron', idx=np.full((H, W), 1 if x == 53 else 2), outline=False)
    p.fill(rect_m(42, 74, 54, 75), 'iron', idx=faces(rect_m(42, 74, 54, 75), 1))
    return crop(p, anchor_y=40)
def mug():
    p = Part()
    m = rect_m(45, 89, 50, 95)
    p.fill(m, 'oak', idx=faces(m, 0))
    p.fill(rect_m(45, 89, 50, 90), 'cream', idx=np.where(yy == 89, 4, 3), outline=False)
    p.fill(ring := ((((xx + 0.5 - 51.6) ** 2 + (yy + 0.5 - 92.5) ** 2) <= 5.5) & (((xx + 0.5 - 51.6) ** 2 + (yy + 0.5 - 92.5) ** 2) >= 1.5) & (xx >= 51)), 'oak', bias=0.0)
    return crop(p)
def mushpot():
    p = Part()
    p.fill(poly([(41.5, 85), (54.5, 85), (53, 95.4), (43, 95.4)]), 'clay', bias=0.05, round_=1.1)
    p.fill(rect_m(41, 84, 55, 86), 'clay', idx=faces(rect_m(41, 84, 55, 86), 1))
    for (x, y, r) in ((45, 77, 4.2), (51.5, 79.5, 3.2)):
        p.fill(rect_m(x - 0.6, y, x + 0.6, 84), 'cream', idx=np.full((H, W), 3))
        cap_m = ell(x, y, r, r * 0.62) & (yy <= y + 0.5)
        p.fill(cap_m, 'quilt', bias=0.1, round_=1.3)
        for dx, dy in ((-1.6, -1.2), (1.2, -0.6)): p.px([(round(x + dx), round(y + dy))], 'cream', 4)
    return crop(p)

PROPS = {'table': table, 'bench': bench, 'stool': stool, 'chair': chair, 'barrel': barrel, 'crate': crate,
         'bed': bed, 'shelf': shelf, 'door': door, 'torch': torch, 'candle': candle, 'lantern': lantern,
         'mug': mug, 'mushpot': mushpot}
