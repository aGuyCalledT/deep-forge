# Block 2: living, eating, sleeping (tavern, quarters). Same canvas and rules as props.py: 96 x 96, standing on
# row 95, wall props hung where they are drawn, anchor bottom centre unless crop() says otherwise.
# Fire has 4 frames, candles 2. Flames use the 'flame' ramp and glow (the light pass leaves them unlit).
#   python3 living.py <out dir>
import sys, os
from props import *
from shells import blocks, hsh, CELL, FLOOR, RH, TILES, SPRITES, room, put, light, dwarf, rgb, col
from props import PROPS
R['blackiron'] = ['#140e12', '#2a2026', '#43363a', '#5e4e4e', '#8a766c']     # warm cast iron

def flame(p, cx, by, w, h, frame, phase=0):
    """A tongue of fire standing on row by; the tip sways with the frame."""
    f = (frame + phase) % 4
    sway = (0, 1, 0, -1)[f] * max(1, h / 9); hh = h * (1, 0.92, 1.05, 0.95)[f]
    tx, ty = cx + sway, by - hh
    m = poly([(cx - w / 2, by + 0.5), (cx + w / 2, by + 0.5), (cx + w * 0.48, by - hh * 0.35), (tx + w * 0.16, by - hh * 0.72),
              (tx, ty), (tx - w * 0.2, by - hh * 0.66), (cx - w * 0.48, by - hh * 0.3)])
    idx = np.full((H, W), 1)
    for y, x in zip(*np.nonzero(m)):
        d = math.hypot((x + 0.5 - cx) / (w / 2), (y + 0.5 - (by - hh * 0.28)) / (hh * 0.62))
        idx[y, x] = 4 if d < 0.38 else 3 if d < 0.62 else 2 if d < 0.88 else 1
    p.fill(m, 'flame', idx=idx, outline=False)
def log(p, a, b, r=1.8):
    m = cap(a, b, r)
    p.fill(m, 'oak', bias=0.05)
    for y, x in zip(*np.nonzero(m)):                     # embers glow on the underside
        if not m[min(H - 1, y + 1), x] or hsh(x, y) % 5 == 0 and y > (a[1] + b[1]) / 2: p.c[y, x] = ('flame', 1 if hsh(x, y, 2) % 3 else 2)
def masonry(p, m, ramp='sand', bw=12, bh=8, y0=0):
    ids = np.where(m, ((yy - y0) // bh) * 100 + (xx + ((yy - y0) // bh % 2) * (bw // 2)) // bw, -1)
    g = blocks(ids, ramp, lambda i: (2, 2, 3)[hsh(i, 5) % 3], wrap=False)
    idx = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(m)): idx[y, x] = g[y, x][1]
    p.fill(m, ramp, idx=idx)

# ------------------------------------------------------------------ furniture
def bunk():
    p = Part()
    for x0 in (20, 71):
        board(p, x0, 42, x0 + 3, 95, 'oak', top_rows=1); p.fill(ell(x0 + 2, 41.5, 2.4, 2.0), 'oak', bias=0.1)
    for (y, quilt) in ((84, 'quilt'), (58, 'teal')):
        board(p, 24, y + 6, 70, y + 9, 'oak', top_rows=1, seams=(47,))                       # rail
        p.fill(rect_m(26, y, 69, y + 5), 'cream', idx=faces(rect_m(26, y, 69, y + 5), 1))      # mattress
        q = poly([(35, y - 0.5), (69.5, y - 0.5), (70.5, y + 7.5), (34, y + 7.5)])
        qi = shade(q, 0.05, 1.1)
        for yy_, x in zip(*np.nonzero(q)):
            if ((x - 35) // 6 + (yy_ - y) // 4) % 2: qi[yy_, x] = max(1, qi[yy_, x] - 1)
        p.fill(q, quilt, idx=qi)
        p.fill(rect_m(35, y - 1, 69, y), 'cream', idx=np.where(yy == y - 1, 4, 3))
        p.fill(ell(30, y - 1.4, 4.8, 2.6), 'cream', bias=0.15, round_=1.3)
    board(p, 24, 50, 70, 51, 'oak', top_rows=1)                                                # guard rail upstairs
    for x in (36, 58): board(p, x, 52, x + 1, 57, 'oak', top_rows=0)
    for y in range(66, 95, 6): board(p, 75, y, 81, y + 1, 'oak', top_rows=1)                  # ladder rungs
    board(p, 81, 62, 83, 95, 'oak', top_rows=0)
    return crop(p)
def longtable():
    p = Part()
    for x in (14, 79):                                                                        # trestles
        board(p, x, 80, x + 3, 95, 'oak', top_rows=0)
        board(p, x - 3, 93, x + 6, 95, 'oak', top_rows=1)
    board(p, 18, 85, 78, 86, 'oak', top_rows=1)                                               # stretcher
    board(p, 8, 75, 87, 79, 'wood', top_rows=2, seams=(28, 48, 68), grain=True)
    return crop(p)
def bar():
    p = Part()
    front = rect_m(12, 70, 83, 95)
    idx = faces(front, 0)
    for y, x in zip(*np.nonzero(front)):
        if (x - 12) % 9 == 0: idx[y, x] = 1                                                   # planks
        elif (x - 12) % 9 == 1: idx[y, x] = 3
        if y in (78, 79) or y >= 92: idx[y, x] = 3 if y in (78, 92) else 1                   # rail and kick board
    p.fill(front, 'oak', idx=idx)
    for x in range(15, 82, 9): p.c[78, x] = ('iron', 4)
    board(p, 9, 66, 86, 69, 'wood', top_rows=2, seams=(47,), grain=True)                      # counter top
    for x in (30, 44):                                                                        # brass taps
        p.fill(rect_m(x - 1, 57, x + 1, 65), 'gold', idx=faces(rect_m(x - 1, 57, x + 1, 65), 0))
        p.fill(rect_m(x + 2, 58, x + 4, 59), 'gold', idx=np.where(yy == 58, 4, 2))
        p.fill(rect_m(x + 4, 60, x + 4, 61), 'gold', idx=np.full((H, W), 2), outline=False)
        p.fill(cap((x, 56), (x - 2, 51), 1.1), 'oak', bias=0.1)                              # handle
    p.fill(rect_m(58, 63, 71, 65), 'cream', idx=np.where(yy == 63, 4, 3))                    # folded cloth
    return crop(p)
def chest():
    p = Part()
    body = rect_m(34, 82, 61, 95)
    p.fill(body, 'wood', idx=faces(body, 0))
    lid = (ell(47.5, 83, 14.5, 6) & (yy <= 82)) | rect_m(33, 80, 62, 82)
    p.fill(lid, 'wood', bias=0.05, round_=0.8)
    for x0 in (38, 56):                                                                       # iron straps
        s = rect_m(x0, 76, x0 + 1, 95) & (lid | body)
        p.fill(s, 'iron', idx=np.where(xx == x0, 3, 1), outline=False)
    p.fill(rect_m(33, 82, 62, 83), 'iron', idx=np.where(yy == 82, 3, 1), outline=False)
    p.fill(rect_m(46, 83, 49, 87), 'gold', idx=faces(rect_m(46, 83, 49, 87), 0))             # lock
    p.c[85, 47] = ('gold', 0)
    return crop(p)
def rug():
    """Lies on the floor strip: anchor is its top edge, put it at the floor line."""
    p = Part()
    m = rect_m(20, 92, 75, 95)
    idx = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(m)):
        band = (x - 20) % 11
        idx[y, x] = 4 if y == 92 else 1 if y == 95 else (3 if band in (0, 1) else 2)
    p.fill(m, 'quilt', idx=idx, outline=False)
    for x in range(22, 75, 11): p.c[93, x + 3] = ('gold', 3); p.c[94, x + 3] = ('gold', 2); p.c[93, x + 4] = ('gold', 2)
    for y in (92, 94): p.c[y, 19] = ('cream', 3); p.c[y, 76] = ('cream', 3)                  # fringe
    return crop(p, anchor_y=92)
def banner():
    p = Part()
    cloth = poly([(37, 22), (59, 22), (59, 62), (48, 55), (37, 62)])
    idx = shade(cloth, 0.1, 0.6)
    for y, x in zip(*np.nonzero(cloth)):
        if x in (39, 57) and y < 56: idx[y, x] = 4 if x == 39 else 3                         # gold border
    p.fill(cloth, 'quilt', idx=idx)
    for y, x in zip(*np.nonzero(cloth)):
        if x in (39, 57) and y < 56: p.c[y, x] = ('gold', 3 if x == 39 else 2)
    # crest: an anvil under a hammer
    p.fill(poly([(41.5, 38), (55.5, 38), (53.5, 41), (51, 41), (52, 45), (44, 45), (45, 41), (41.5, 40)]), 'gold', bias=0.15)
    p.fill(rect_m(47, 28, 48, 35), 'gold', idx=np.full((H, W), 2))
    p.fill(rect_m(44, 26, 51, 28), 'gold', idx=faces(rect_m(44, 26, 51, 28), 1))
    p.fill(rect_m(34, 19, 62, 21), 'oak', idx=faces(rect_m(34, 19, 62, 21), 1))             # rod
    p.fill(ell(33.5, 20, 1.8, 1.8) | ell(62.5, 20, 1.8, 1.8), 'gold', bias=0.1)
    return crop(p, anchor_y=19)
def herbs():
    p = Part()
    p.fill(rect_m(47, 30, 47, 37), 'cream', idx=np.full((H, W), 2), outline=False)           # string
    for i, (x, y, r) in enumerate(((44, 46, 3.6), (51, 47, 3.4), (47.5, 50, 3.8), (43.5, 52, 3.0), (51.5, 53, 3.0), (47.5, 56, 2.6))):
        p.fill(ell(x, y, r, r * 1.3), 'moss', bias=0.05 + 0.05 * (i % 2), round_=1.2)
    for x, y in ((44, 45), (51, 46), (47, 49)): p.c[y, x] = ('moss', 4)
    p.fill(rect_m(45, 38, 50, 41), 'cream', idx=faces(rect_m(45, 38, 50, 41), 1))            # twine wrap
    for x, y in ((45, 57), (50, 58)): p.c[y, x] = ('quilt', 3)                                # dried berries
    return crop(p, anchor_y=30)
def chandelier(frame=0):
    p = Part()
    for (a, b) in (((48, 30), (34, 57)), ((48, 30), (62, 57)), ((48, 30), (48, 56))):
        for t in np.linspace(0, 1, 9)[1:-1]:
            x, y = round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t)
            p.c[y, x] = ('iron', 3 if (x + y) % 2 else 2)
    ring = ell(48, 59, 18, 3.2) & ~ell(48, 59, 14, 1.4)
    p.fill(ring, 'oak', bias=0.1, round_=0.8)
    for i, x in enumerate((34, 42, 54, 62)):
        top = 52 - (i % 2)
        p.fill(rect_m(x - 1, top, x, 57), 'cream', idx=faces(rect_m(x - 1, top, x, 57), 1))
        flame(p, x - 0.5, top - 0.5, 2.4, 5, frame * 2, phase=i)
    return crop(p, anchor_y=30)

# ------------------------------------------------------------------ fire places
def fireplace(frame=0):
    p = Part()
    opening = (rect_m(32, 60, 63, 95) | ell(47.5, 60.5, 16, 9)) & (yy >= 50)
    surround = rect_m(22, 42, 73, 95) & ~opening
    masonry(p, surround, y0=42)
    soot = ell(47.5, 46, 10, 6) & surround                                     # soot above the opening
    for y, x in zip(*np.nonzero(soot)):
        if p.c[y, x] and p.c[y, x][1] > 1: p.c[y, x] = ('sand', p.c[y, x][1] - 1)
    inside = np.full((H, W), 0)
    p.fill(opening, 'rock', idx=np.where(yy > 86, 1, 0), outline=False)
    board(p, 17, 38, 78, 41, 'oak', top_rows=2, grain=True)                     # mantel
    for x in (22, 72): p.fill(poly([(x - 2, 42), (x + 3, 42), (x + 0.5, 46)]), 'oak', bias=0.05)
    p.fill(rect_m(30, 93, 65, 95), 'sand', idx=faces(rect_m(30, 93, 65, 95), 1))             # hearth stone
    log(p, (36, 91), (59, 89.5)); log(p, (38, 88.5), (58, 91.5))
    for i, (x, w, h) in enumerate(((41, 7, 16), (48, 9, 22), (55, 7, 15))):
        flame(p, x, 89, w, h, frame, phase=i)
    for x in (34, 61):                                                          # glowing coals
        p.c[92, x] = ('flame', 2); p.c[92, x + 1] = ('flame', 1)
    return crop(p)
def kettle(frame=0):
    p = Part()
    for b in ((31, 95), (65, 95)): p.fill(cap((48, 50), b, 0.9), 'blackiron', bias=0.0)          # tripod
    p.fill(ell(48, 49.5, 2, 1.6), 'blackiron', bias=0.1)
    for y in range(52, 68, 3): p.fill(ell(48, y + 1.2, 1.0, 1.3), 'blackiron', bias=0.05, outline=False)
    hand = (ell(48, 72, 11, 6) & ~ell(48, 72, 9.6, 4.8)) & (yy <= 71)                         # bail handle
    p.fill(hand, 'blackiron', idx=np.full((H, W), 2), outline=False)
    pot = ell(48, 80, 11.5, 8.5) & (yy >= 73)
    p.fill(pot, 'blackiron', bias=-0.12, round_=1.2)
    p.fill(rect_m(36, 72, 60, 73), 'blackiron', idx=np.where(yy == 72, 4, 2))                      # rim
    p.fill(rect_m(38, 71, 58, 71), 'clay', idx=np.full((H, W), 4), outline=False)            # stew just showing
    for x in (42, 50, 55): p.c[71, x] = ('gold', 3)
    log(p, (37, 94), (58, 92.5), 1.6); log(p, (39, 92), (57, 94.5), 1.6)
    for i, (x, w, h) in enumerate(((44, 5, 7), (48, 6, 9), (53, 5, 7))):
        flame(p, x, 92, w, h, frame, phase=i)
    return crop(p)

# ------------------------------------------------------------------ small things on tables and shelves
def plate():
    p = Part()
    p.fill(ell(48, 94.5, 8, 1.6), 'cream', bias=0.1)
    p.fill(ell(45, 91, 5, 3.4) & (yy <= 94), 'wood', bias=0.15, round_=1.2)                  # loaf
    for x in (43, 46): p.c[89, x] = ('wood', 1)                                                # scored crust
    p.fill(poly([(50, 94), (56, 94), (56, 89.5)]), 'gold', bias=0.1)                         # cheese wedge
    p.c[92, 54] = ('gold', 2)
    return crop(p)
def bowl():
    p = Part()
    p.fill(ell(48, 91.5, 5.6, 4.2) & (yy >= 91), 'clay', bias=0.05)
    p.fill(rect_m(43, 90, 53, 90), 'gold', idx=np.full((H, W), 3), outline=False)            # soup
    p.c[90, 45] = ('gold', 4); p.c[90, 50] = ('moss', 3)
    p.fill(cap((52, 89), (56, 84), 0.7), 'wood', bias=0.1, outline=False)                    # spoon
    return crop(p)
def bottles():
    p = Part()
    for i, (x, ramp, h) in enumerate(((36, 'moss', 13), (42, 'quilt', 11), (48, 'teal', 14), (54, 'gold', 10), (60, 'clay', 12))):
        body = ell(x, 95 - 3.8, 2.8, 3.8) | rect_m(x - 2, 95 - h + 4, x + 2, 95 - 4)
        p.fill(body & (yy <= 95), ramp, bias=0.1, round_=1.3)
        p.fill(rect_m(x - 0.6, 95 - h, x + 0.6, 95 - h + 3), ramp, idx=np.full((H, W), 2))
        p.fill(rect_m(x - 0.6, 95 - h - 1, x + 0.6, 95 - h - 1), 'wood', idx=np.full((H, W), 3), outline=False)
        p.c[95 - h + 5, x - 1] = (ramp, 4)
    return crop(p)

LIVING = {'bunk': bunk, 'longtable': longtable, 'bar': bar, 'fireplace': fireplace, 'kettle': kettle, 'chest': chest,
          'rug': rug, 'banner': banner, 'plate': plate, 'bowl': bowl, 'bottles': bottles, 'herbs': herbs,
          'chandelier': chandelier}

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    T = {k: f() for k, f in TILES.items()}; S = {k: f() for k, f in SPRITES.items()}
    P = {k: f() for k, f in PROPS.items()}
    frames = []
    for fr in range(4):
        L = {k: (f(fr) if k in ('fireplace', 'kettle', 'chandelier') else f()) for k, f in LIVING.items()}
        W_ = 13 * CELL
        cv = np.full((RH, W_), '#000000', object); em = np.zeros(cv.shape, bool); lights = []
        F = FLOOR
        # tavern, 9 cells: hearth, long table under the chandelier, bar
        room(cv, em, 0, 0, 9, T['wall_brick'], T['floor_planks'])
        put(cv, em, L['rug'], 150, F)
        put(cv, em, L['fireplace'], 52, F); lights.append((52, 112, 110, 0.95 + 0.06 * (fr % 2)))
        put(cv, em, P['candle'], 34, F - 57); put(cv, em, P['mug'], 62, F - 57)
        put(cv, em, L['herbs'], 100, 18); put(cv, em, L['herbs'], 112, 22)
        put(cv, em, L['banner'], 214, 16)
        put(cv, em, L['chandelier'], 150, 14); lights.append((150, 40, 110, 0.7))
        dwarf(cv, em, 'd_sit', 132, F); dwarf(cv, em, 'd_sit', 172, F)
        put(cv, em, P['bench'], 112, F); put(cv, em, P['bench'], 192, F)
        put(cv, em, L['longtable'], 152, F)
        top = F - 21
        put(cv, em, L['plate'], 134, top); put(cv, em, L['bowl'], 170, top); put(cv, em, P['mug'], 150, top)
        put(cv, em, P['candle'], 158, top)
        put(cv, em, P['shelf'], 330, 70)
        dwarf(cv, em, 'd_stand', 330, F)
        put(cv, em, L['bar'], 330, F); put(cv, em, L['bottles'], 352, F - 26)
        put(cv, em, P['barrel'], 398, F); put(cv, em, P['barrel'], 398, F - 24)
        put(cv, em, P['torch'], 280, 92); lights.append((280, 76, 100, 0.8))
        put(cv, em, L['kettle'], 250, F); lights.append((250, 120, 40, 0.5))
        # quarters, 4 cells: bunk, chest, candle
        x0 = 9 * CELL
        room(cv, em, x0, 0, 4, T['wall_panel'], T['floor_planks'])
        put(cv, em, L['rug'], x0 + 100, F)
        put(cv, em, L['bunk'], x0 + 60, F); put(cv, em, L['chest'], x0 + 120, F)
        put(cv, em, P['candle'], x0 + 120, F - 16); lights.append((x0 + 120, F - 26, 60, 0.6))
        put(cv, em, P['lantern'], x0 + 150, 20); lights.append((x0 + 150, 46, 90, 0.6))
        dwarf(cv, em, 'd_side', x0 + 160, F, flip=True)
        frames.append(light(cv, em, lights).resize((W_ * 2, RH * 2), Image.NEAREST))
    frames[0].save(f'{out}/living_x2.png')
    frames[0].save(f'{out}/living_x2.gif', save_all=True, append_images=frames[1:], duration=160, loop=0)
    # sheet of the new props, unlit
    L = {k: f() for k, f in LIVING.items()}
    names = list(L); cw = 100; cols = 7; rows = 2
    sh = Image.new('RGB', (cols * cw, rows * 100), (36, 28, 34))
    for n, k in enumerate(names):
        g = L[k]['grid']; cx, cy = (n % cols) * cw + cw // 2, (n // cols) * 100 + 94
        for j in range(g.shape[0]):
            for i in range(g.shape[1]):
                if g[j, i] is not None: sh.putpixel((cx - g.shape[1] // 2 + i, cy - g.shape[0] + j), rgb(col(g[j, i])))
    sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST).save(f'{out}/living_props_x2.png')
    print('ok')
