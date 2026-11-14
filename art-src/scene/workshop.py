# Block 3: workshop stations. Same canvas and rules as props.py (96 x 96, standing on row 95).
# Fire, glow and turning wheels have 4 frames; frame 0 is the still picture.
#   python3 workshop.py <out dir>
import sys, os
from living import *

R['copper'] = ['#2e140e', '#5e2c1a', '#9a4e2a', '#cf7a44', '#f2b27a']

def glow_bed(p, m, frame, seed=0):
    """Coals: dark lumps with glowing gaps that shift from frame to frame."""
    for y, x in zip(*np.nonzero(m)):
        k = hsh(x // 2, y // 2, seed) % 7
        hot = (hsh(x, y, frame, seed) % 4 == 0)
        p.c[y, x] = ('blackiron', 1 + (k == 0)) if k < 3 and not hot else ('flame', 3 if hot and k > 4 else 2 if hot else 1)
def tub(p, x0, x1, y0, y1, ramp='oak', hoops=(), bulge=1.0):
    """Stave tub or vat, slightly rounded, light from the left."""
    cx, hw0 = (x0 + x1 + 1) / 2, (x1 - x0 + 1) / 2
    m = np.zeros((H, W), bool)
    for y in range(y0, y1 + 1):
        hw = hw0 + bulge * math.sin(math.pi * (y - y0) / max(1, y1 - y0))
        m[y] = np.abs(xx[y] + 0.5 - cx) <= hw
    idx = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(m)):
        u = (x + 0.5 - cx) / (hw0 + bulge)
        idx[y, x] = 4 if u < -0.6 else 3 if u < -0.05 else 2 if u < 0.6 else 1
        st = (math.asin(max(-1, min(1, u))) / math.pi + 0.5) * 7
        if abs(st - round(st)) < 0.12 and 0 < round(st) < 7: idx[y, x] = max(1, idx[y, x] - 1)
    p.fill(m, ramp, idx=idx)
    for h in hoops:
        hm = m & (yy >= h) & (yy <= h + 1)
        p.fill(hm, 'iron', idx=np.where(yy == h, 3, 1), outline=False)
    return m

# ------------------------------------------------------------------ smithy
def forge(frame=0):
    p = Part()
    masonry(p, rect_m(24, 70, 71, 95), y0=70)
    p.fill(rect_m(22, 66, 73, 69), 'sand', idx=faces(rect_m(22, 66, 73, 69), 1))            # hearth rim
    glow_bed(p, rect_m(27, 62, 68, 65), frame)
    for i, x in enumerate((36, 46, 57)): flame(p, x, 62, 5, 6 + (i == 1) * 3, frame, phase=i)
    hood = poly([(26, 52), (69, 52), (58, 32), (37, 32)])
    hi = shade(hood, 0.0, 0.7)
    p.fill(hood, 'blackiron', idx=hi)
    p.fill(rect_m(25, 52, 70, 54), 'blackiron', idx=faces(rect_m(25, 52, 70, 54), 1))
    for x in range(29, 68, 6): p.c[53, x] = ('blackiron', 4)                                # rivets
    p.fill(rect_m(42, 2, 53, 31), 'blackiron', idx=faces(rect_m(42, 2, 53, 31), 0))         # chimney
    for y in (10, 22): p.fill(rect_m(41, y, 54, y + 1), 'blackiron', idx=np.where(yy == y, 4, 1), outline=False)
    for y, x in zip(*np.nonzero(hood & (yy > 46))):                                         # glow on the hood's lip
        if p.c[y, x][1] < 4 and hsh(x, y, frame) % 3 == 0: p.c[y, x] = ('copper', 2)
    return crop(p)
def anvil():
    p = Part()
    stump = rect_m(39, 84, 56, 95)
    p.fill(stump, 'oak', idx=faces(stump, 1))
    for x in (43, 50): p.fill(rect_m(x, 86, x, 94), 'oak', idx=np.full((H, W), 1), outline=False)
    body = poly([(27, 73), (36, 71.5), (61, 71.5), (61, 76), (55, 76), (53, 79), (56, 80), (57, 83.5), (38, 83.5), (39, 80), (42, 79), (40, 76), (36, 76)])
    bi = shade(body, 0.0, 0.8)
    bi[(yy == 72) & body] = 4
    p.fill(body, 'blackiron', idx=bi)
    p.c[73, 57] = ('blackiron', 0)                                                          # hardy hole
    return crop(p)
def quench():
    p = Part()
    m = tub(p, 34, 61, 80, 95, hoops=(83, 91), bulge=0.6)
    p.fill(rect_m(35, 80, 60, 81), 'teal', idx=np.where(yy == 80, 3, 1), outline=False)
    for x in (40, 52): p.c[80, x] = ('teal', 4)
    return crop(p)
def bellows(frame=0):
    p = Part()
    open_ = (6, 4, 1, 4)[frame % 4]
    board(p, 30, 88, 33, 95, 'oak', top_rows=0); board(p, 56, 88, 59, 95, 'oak', top_rows=0)  # stand
    board(p, 28, 86, 61, 87, 'oak', top_rows=1)
    bot = poly([(28, 84), (60, 84), (66, 82), (66, 85.5), (28, 85.5)])
    p.fill(bot, 'wood', idx=faces(bot, 1))
    top_y = 84 - open_
    leather = poly([(29, 84), (29, top_y), (60, 82), (60, 84)])
    li = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(leather)):
        if (x - 29) % 6 == 0: li[y, x] = 1
        elif (x - 29) % 6 == 1: li[y, x] = 3
    p.fill(leather, 'clay', idx=li)
    top = poly([(27, top_y - 2), (60, 80.5), (66, 80.5), (66, 82), (60, 82), (27, top_y)])
    p.fill(top, 'wood', idx=np.where(yy <= top_y - 1, 4, 2))
    p.fill(cap((27, top_y - 1), (21, top_y - 3), 1.0), 'oak', bias=0.1)                    # handle
    p.fill(rect_m(66, 81, 71, 83), 'iron', idx=faces(rect_m(66, 81, 71, 83), 1))           # nozzle
    return crop(p)
def smelter(frame=0):
    p = Part()
    tower = poly([(24, 95.5), (70, 95.5), (66, 42), (58, 30), (37, 30), (29, 42)])
    mouth = (rect_m(38, 76, 56, 93) | ell(47, 76.5, 9, 6)) & (yy >= 70)
    masonry(p, tower & ~mouth, 'brick', bw=10, bh=7, y0=30)
    masonry(p, rect_m(41, 8, 53, 29), 'brick', bw=7, bh=6, y0=8)
    for y in (48, 64): p.fill(tower & (yy >= y) & (yy <= y + 1), 'blackiron', idx=np.where(yy == y, 3, 1), outline=False)
    p.fill(mouth, 'rock', idx=np.full((H, W), 0), outline=False)
    glow_bed(p, rect_m(39, 88, 55, 93), frame, 3)
    for i, x in enumerate((42, 47, 52)): flame(p, x, 88, 5, 9 + (i == 1) * 4, frame, phase=i)
    p.fill(poly([(66, 60), (78, 63), (78, 65), (66, 63)]), 'blackiron', bias=0.1)          # spout
    drip = (frame % 2)
    for y in range(66, 86): p.c[y, 77 + (y % 3 == drip)] = ('flame', 3 if y % 2 else 2)     # molten trickle
    mold = rect_m(71, 86, 85, 95)
    p.fill(mold, 'blackiron', idx=faces(mold, 1))
    p.fill(rect_m(73, 86, 83, 86), 'flame', idx=np.full((H, W), 3), outline=False)
    return crop(p)
def pile(kind='ore'):
    p = Part()
    stones = [(37, 92, 5), (47, 92.5, 6), (57, 92, 5), (42, 87, 4.6), (52, 87, 4.8), (47, 82.5, 4.2), (61, 94, 3), (33, 94, 3)]
    for i, (x, y, r) in enumerate(stones):
        m = ell(x, y, r, r * 0.8) & (yy <= 95)
        if kind == 'ore':
            p.fill(m, 'rock', bias=0.2, round_=1.2)
            pts = list(zip(*np.nonzero(m)))
            for k in range(5):                                                              # ore glints
                yy_, x_ = pts[hsh(i, k, 3) % len(pts)]
                p.c[yy_, x_] = ('copper', 4 if k % 2 else 3)
                if x_ + 1 < W and m[yy_, x_ + 1]: p.c[yy_, x_ + 1] = ('copper', 2)
        else:
            p.fill(m, 'blackiron', bias=-0.05, round_=1.4)
            p.c[round(y - r * 0.4), round(x - r * 0.3)] = ('iron', 3)
    return crop(p)
def grindstone(frame=0):
    p = Part()
    trough = rect_m(32, 88, 63, 95)
    p.fill(trough, 'oak', idx=faces(trough, 1))
    p.fill(rect_m(33, 88, 62, 88), 'teal', idx=np.full((H, W), 2), outline=False)
    for x in (34, 60): board(p, x, 62, x + 2, 87, 'oak', top_rows=1)
    wheel = ell(47.5, 74, 12.5, 12.5)
    p.fill(wheel, 'sand', bias=0.05, round_=0.9)
    a0 = frame * math.pi / 2
    for k in range(3):                                                                      # marks that turn
        a = a0 + k * 2 * math.pi / 3
        for r in range(5, 11):
            x, y = round(47 + r * math.cos(a)), round(73.5 + r * math.sin(a))
            if wheel[y, x]: p.c[y, x] = ('sand', 1)
    p.fill(ell(47.5, 74, 2, 2), 'iron', bias=0.1)
    hx, hy = 47.5 + 7 * math.cos(a0 + 0.6), 74 + 7 * math.sin(a0 + 0.6)                   # crank
    p.fill(cap((47.5, 74), (hx, hy), 0.8), 'iron', bias=0.1, outline=False)
    p.fill(ell(hx, hy, 1.4, 1.4), 'oak', bias=0.1)
    return crop(p)

# ------------------------------------------------------------------ fine crafts
def bench(x0=18, x1=77, y=72):
    p = Part()
    for x in (x0 + 3, x1 - 6): board(p, x, y + 4, x + 3, 95, 'oak', top_rows=0)
    board(p, x0 + 6, 88, x1 - 6, 89, 'oak', top_rows=1)
    board(p, x0, y, x1, y + 3, 'wood', top_rows=2, seams=((x0 + x1) // 2,), grain=True)
    return p
def engraver():
    p = bench(20, 75)
    p.fill(rect_m(26, 64, 33, 71), 'iron', idx=faces(rect_m(26, 64, 33, 71), 1))            # vise
    p.fill(rect_m(24, 66, 25, 67), 'iron', idx=np.full((H, W), 3))
    p.fill(rect_m(34, 66, 38, 69), 'gold', idx=np.where(yy == 66, 4, 2))                     # plate being engraved
    p.fill(rect_m(44, 69, 56, 71), 'iron', idx=np.where(yy == 69, 4, 2))                     # metal sheet
    for x in (46, 49, 52): p.c[70, x] = ('iron', 1)                                           # scratched lines
    p.fill(cap((61, 70), (69, 67), 0.8), 'oak', bias=0.1); p.fill(rect_m(58, 69, 61, 71), 'iron', idx=faces(rect_m(58, 69, 61, 71), 1))  # hammer
    p.fill(cap((64, 71), (72, 71), 0.6), 'iron', bias=0.1, outline=False)                    # chisel
    return crop(p)
def jeweler():
    p = bench(26, 69, 76)
    p.fill(rect_m(32, 74, 46, 75), 'quilt', idx=np.where(yy == 74, 3, 1), outline=False)     # velvet pad
    for x, r in ((34, 'teal'), (37, 'quilt'), (40, 'gold'), (43, 'teal')):
        p.c[73, x] = (r, 4); p.c[73, x + 1] = (r, 2)
    p.fill(rect_m(57, 74, 61, 75), 'gold', idx=faces(rect_m(57, 74, 61, 75), 0))           # loupe stand
    p.fill(cap((59, 73), (55, 62), 0.7), 'gold', bias=0.1, outline=False)
    p.fill(cap((55, 62), (48, 64), 0.7), 'gold', bias=0.1, outline=False)
    p.fill(ell(46, 65.5, 3, 3) & ~ell(46, 65.5, 1.8, 1.8), 'gold', bias=0.1, outline=False)
    p.fill(ell(46, 65.5, 1.8, 1.8), 'teal', idx=np.where(xx < 46, 4, 3), outline=False)     # lens
    return crop(p)
def loom():
    p = Part()
    for x in (24, 68): board(p, x, 40, x + 3, 95, 'oak', top_rows=1)
    board(p, 22, 38, 73, 41, 'oak', top_rows=2)                                              # top beam
    for y in (60, 83): board(p, 28, y, 67, y + 2, 'wood', top_rows=1)                       # heddle bar, breast beam
    for x in range(29, 67, 2):                                                               # warp threads
        for y in range(42, 60): p.c[y, x] = ('cream', 3 if y % 4 else 4)
    cloth = rect_m(28, 63, 67, 82)
    ci = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(cloth)):
        band = (y - 63) // 4 % 3
        ci[y, x] = (3, 2, 2)[band] if (x + y) % 2 else (2, 1, 2)[band]
    p.fill(cloth, 'quilt', idx=ci, outline=False)
    for y, x in zip(*np.nonzero(cloth & ((yy - 63) // 4 % 3 == 1))): p.c[y, x] = ('gold', 3 if (x + y) % 2 else 2)
    for x in (34, 58): board(p, x, 92, x + 6, 93, 'oak', top_rows=1)                         # treadles
    p.fill(ell(73, 72, 3, 1.6), 'wood', bias=0.1)                                            # shuttle
    return crop(p)
def sewing():
    p = bench(22, 73, 76)
    for i, (x, r) in enumerate(((31, 'teal'), (38, 'quilt'))):                              # bolts of cloth
        m = ell(x, 70.5, 3.6, 5.5) | rect_m(x - 3, 66, x + 3, 75)
        p.fill(rect_m(x - 3, 66, x + 3, 75), r, idx=faces(rect_m(x - 3, 66, x + 3, 75), 0))
        p.fill(ell(x, 65.8, 3.3, 1.2), r, idx=np.full((H, W), 4), outline=False)
    p.fill(rect_m(46, 73, 60, 75), 'cream', idx=np.where(yy == 73, 4, 3))                   # cut cloth
    for x in range(47, 60, 3): p.c[74, x] = ('cream', 1)                                     # chalk stitches
    p.fill(rect_m(64, 70, 67, 75), 'wood', idx=faces(rect_m(64, 70, 67, 75), 0))            # spool
    p.fill(rect_m(64, 71, 67, 74), 'moss', idx=np.where(xx == 64, 4, 2), outline=False)
    p.fill(cap((50, 72), (56, 70), 0.6), 'iron', bias=0.2, outline=False)                    # scissors
    p.fill(ell(49, 72.5, 1.2, 1.2), 'iron', bias=0.1, outline=False)
    return crop(p)

# ------------------------------------------------------------------ wizard's tower
R['arcane'] = ['#1e1240', '#3a2478', '#6a48c0', '#a888f0', '#e8dcff']   # enchanting light: violet, glows
from shells import EMIT
EMIT.update({'arcane'})
def altar(frame=0):
    """A carved stone pedestal with an orb of light; three motes circle it."""
    p = Part()
    base = rect_m(34, 90, 61, 95)
    p.fill(base, 'stone', idx=faces(base, 1))
    shaft = poly([(39, 90), (56, 90), (53, 72), (42, 72)])
    p.fill(shaft, 'stone', idx=shade(shaft, 0.1, 0.8))
    for y in (78, 84): p.fill(rect_m(41, y, 54, y), 'stone', idx=np.full((H, W), 1), outline=False)   # carved bands
    p.c[81, 47] = ('arcane', 3); p.c[81, 48] = ('arcane', 3)                                          # rune in the band
    top = rect_m(36, 69, 59, 72)
    p.fill(top, 'stone', idx=faces(top, 1))
    for x in (40, 47, 55): p.fill(cap((x, 69), (x + 1 if x < 47 else x - 1, 66), 0.8), 'gold', bias=0.1, outline=False)  # claws
    orb = ell(47.5, 61, 6.5, 6.5)
    oi = shade(orb, 0.2, 1.2)
    p.fill(orb, 'arcane', idx=oi)
    p.px([(45, 58), (46, 57)], 'arcane', 4)
    for i in range(3):                                                                                # motes
        a = (frame / 4 + i / 3) * 2 * math.pi
        x, y = 47.5 + 12 * math.cos(a), 60 + 4 * math.sin(a)
        p.c[int(y), int(x)] = ('arcane', 4 if math.sin(a) > 0 else 3)
    return crop(p)
def lectern():
    """A reading stand with an open spellbook and a quill."""
    p = Part()
    post = rect_m(45, 70, 50, 93)
    p.fill(post, 'oak', idx=faces(post, 0))
    foot = rect_m(38, 93, 57, 95)
    p.fill(foot, 'oak', idx=faces(foot, 1))
    desk = poly([(33, 70), (62, 70), (60, 62), (35, 66)])
    p.fill(desk, 'wood', idx=shade(desk, 0.1, 0.6))
    book = poly([(35, 64), (47, 61), (47, 66), (36, 68)]) | poly([(48, 61), (60, 59), (59, 64), (48, 66)])
    bi = np.where(xx < 47.5, 4, 3)
    p.fill(book, 'cream', idx=bi)
    for k in range(3):                                                                               # lines of script
        y = 63 + k
        for x in range(38 + k, 46, 2): p.c[y, x] = ('cream', 1)
        for x in range(50, 58 - k, 2): p.c[y - 1, x] = ('arcane', 2)
    p.fill(rect_m(33, 66, 34, 69), 'quilt', idx=np.full((H, W), 2), outline=False)                   # bookmark
    p.fill(cap((58, 60), (64, 50), 0.7), 'cream', bias=0.2, outline=False)                            # quill
    return crop(p)

# ------------------------------------------------------------------ brewery and farm
def brewkettle(frame=0):
    p = Part()
    box = rect_m(26, 76, 69, 95)
    masonry(p, box, 'brick', bw=10, bh=6, y0=76)
    mouth = rect_m(40, 84, 55, 93)
    p.fill(mouth, 'rock', idx=np.full((H, W), 0), outline=False)
    glow_bed(p, rect_m(41, 90, 54, 93), frame, 5)
    for i, x in enumerate((44, 48, 52)): flame(p, x, 90, 3, 5, frame, phase=i)
    pot = ell(47.5, 66, 19, 13) & (yy <= 76) & (yy >= 56)
    p.fill(pot, 'copper', bias=0.05, round_=0.9)
    p.fill(rect_m(30, 74, 65, 76), 'copper', idx=faces(rect_m(30, 74, 65, 76), 1))          # band
    for x in range(32, 64, 5): p.c[75, x] = ('copper', 4)
    lid = ell(47.5, 56, 14, 6) & (yy <= 56)
    p.fill(lid, 'copper', bias=0.1, round_=1.0)
    p.fill(rect_m(45, 44, 50, 50), 'copper', idx=faces(rect_m(45, 44, 50, 50), 0))          # vent pipe
    p.fill(poly([(50, 44), (70, 44), (70, 47), (50, 47)]), 'copper', idx=np.where(yy == 44, 4, 2))
    for i in range(3):                                                                       # steam puffs drifting up
        y = 40 - ((frame * 3 + i * 6) % 18); x = 47 + (i % 2) * 2 - 1
        p.fill(ell(x, y, 2.4 - i * 0.3, 1.8), 'cream', idx=np.where(xx < x, 4, 3), outline=False)
    return crop(p)
def vats():
    p = Part()
    tub(p, 20, 45, 58, 95, hoops=(62, 76, 90), bulge=1.4)
    tub(p, 50, 71, 70, 95, hoops=(73, 85), bulge=1.1)
    for (x, y) in ((33, 86), (61, 89)):                                                       # taps
        p.fill(rect_m(x - 1, y, x + 2, y + 1), 'gold', idx=np.where(yy == y, 4, 2))
        p.c[y + 2, x] = ('gold', 2)
    p.fill(rect_m(22, 56, 43, 57), 'oak', idx=faces(rect_m(22, 56, 43, 57), 1))              # lid
    p.fill(rect_m(30, 89, 35, 92), 'cream', idx=np.full((H, W), 3))                          # chalk label
    p.c[90, 32] = ('cream', 1); p.c[91, 33] = ('cream', 1)
    return crop(p)
def mushbed(stage=2):
    p = Part()
    box = rect_m(24, 86, 71, 95)
    p.fill(box, 'oak', idx=faces(box, 1, ramp_top=3))
    p.fill(rect_m(25, 85, 70, 87), 'clay', idx=np.where(yy == 85, 2, 1), outline=False)     # soil
    for i, x in enumerate(range(28, 70, 6)):
        r = ('quilt', 'cream', 'gold')[hsh(i, 4) % 3]
        if stage == 0:
            p.c[84, x] = ('cream', 3)
        elif stage == 1:
            p.fill(rect_m(x, 81, x, 84), 'cream', idx=np.full((H, W), 3), outline=False)
            p.fill(ell(x + 0.5, 81.5, 2.4, 1.6), r, bias=0.15)
        else:
            h = 6 + hsh(i, 9) % 3
            p.fill(rect_m(x, 84 - h + 2, x + 1, 84), 'cream', idx=np.where(xx == x, 3, 2), outline=False)
            capm = ell(x + 1, 84 - h + 1.5, 3.4, 2.4) & (yy <= 84 - h + 2)
            p.fill(capm, r, bias=0.1, round_=1.3)
            p.c[84 - h, x] = ('cream', 4)
    return crop(p)

WORK = {'forge': forge, 'anvil': anvil, 'quench': quench, 'bellows': bellows, 'smelter': smelter,
        'ore_pile': lambda: pile('ore'), 'coal_pile': lambda: pile('coal'), 'grindstone': grindstone,
        'engraver': engraver, 'jeweler': jeweler, 'loom': loom, 'sewing': sewing, 'brewkettle': brewkettle,
        'vats': vats, 'altar': altar, 'lectern': lectern, 'mushbed_0': lambda: mushbed(0), 'mushbed_1': lambda: mushbed(1), 'mushbed_2': lambda: mushbed(2)}
ANIM = ('forge', 'bellows', 'smelter', 'grindstone', 'brewkettle', 'altar')

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    T = {k: f() for k, f in TILES.items()}; P = {k: f() for k, f in PROPS.items()}
    frames = []
    for fr in range(4):
        K = {k: (f(fr) if k in ANIM else f()) for k, f in WORK.items()}
        Lv = {k: (f(fr) if k in ('chandelier',) else f()) for k, f in LIVING.items()}
        W_ = 14 * CELL
        cv = np.full((RH * 2, W_), '#000000', object); em = np.zeros(cv.shape, bool); lights = []
        F = FLOOR
        # floor 1: smithy (8 cells) and crafts room (6 cells)
        room(cv, em, 0, 0, 8, T['wall_ashlar'], T['floor_flags'])
        put(cv, em, K['smelter'], 50, F); lights.append((47, 118, 90, 0.95))
        put(cv, em, K['ore_pile'], 104, F); put(cv, em, K['coal_pile'], 130, F)
        put(cv, em, K['forge'], 200, F); lights.append((200, 98, 100, 0.95 + 0.05 * (fr % 2)))
        put(cv, em, K['bellows'], 156, F)
        put(cv, em, K['anvil'], 262, F); dwarf(cv, em, 'd_side', 244, F)
        put(cv, em, K['quench'], 298, F)
        put(cv, em, K['grindstone'], 350, F); put(cv, em, P['torch'], 340, 92); lights.append((340, 76, 90, 0.7))
        x0 = 8 * CELL
        room(cv, em, x0, 0, 6, T['wall_panel'], T['floor_planks'])
        put(cv, em, Lv['chandelier'], x0 + 144, 14); lights.append((x0 + 144, 40, 140, 0.75))
        put(cv, em, K['engraver'], x0 + 54, F); dwarf(cv, em, 'd_stand', x0 + 54, F - 2)
        put(cv, em, K['engraver'], x0 + 54, F)
        put(cv, em, K['jeweler'], x0 + 122, F); put(cv, em, P['candle'], x0 + 108, F - 20); lights.append((x0 + 108, F - 30, 40, 0.4))
        put(cv, em, K['loom'], x0 + 186, F)
        put(cv, em, K['sewing'], x0 + 250, F)
        # floor 2: brewery (7 cells) and mushroom farm (7 cells)
        y0 = RH; F2 = y0 + FLOOR
        room(cv, em, 0, y0, 7, T['wall_brick'], T['floor_planks'])
        put(cv, em, K['brewkettle'], 70, F2); lights.append((70, F2 - 8, 60, 0.6))
        put(cv, em, K['vats'], 150, F2)
        put(cv, em, P['barrel'], 214, F2); put(cv, em, P['barrel'], 234, F2); put(cv, em, P['barrel'], 224, F2 - 24)
        put(cv, em, Lv['herbs'], 270, y0 + 22); dwarf(cv, em, 'd_stand', 290, F2, flip=True)
        put(cv, em, P['torch'], 110, y0 + 92); lights.append((110, y0 + 76, 120, 0.85))
        x0 = 7 * CELL
        room(cv, em, x0, y0, 7, T['wall_rock'], T['floor_earth'])
        for i, st in enumerate((0, 1, 2)): put(cv, em, K[f'mushbed_{st}'], x0 + 70 + i * 90, F2)
        put(cv, em, P['lantern'], x0 + 116, y0 + 20); put(cv, em, P['lantern'], x0 + 220, y0 + 20)
        lights += [(x0 + 116, y0 + 46, 110, 0.7), (x0 + 220, y0 + 46, 110, 0.7)]
        put(cv, em, P['mushpot'], x0 + 300, F2); dwarf(cv, em, 'd_side', x0 + 250, F2)
        frames.append(light(cv, em, lights).resize((W_ * 2, RH * 4), Image.NEAREST))
    frames[0].save(f'{out}/workshop_x2.png')
    frames[0].save(f'{out}/workshop_x2.gif', save_all=True, append_images=frames[1:], duration=160, loop=0)
    K = {k: f() for k, f in WORK.items()}
    names = list(K); cw = 100; cols = 10; rows = 2
    sh = Image.new('RGB', (cols * cw, rows * 100), (36, 28, 34))
    for n, k in enumerate(names):
        g = K[k]['grid']; cx, cy = (n % cols) * cw + cw // 2, (n // cols) * 100 + 96
        for j in range(g.shape[0]):
            for i in range(g.shape[1]):
                if g[j, i] is not None: sh.putpixel((cx - g.shape[1] // 2 + i, cy - g.shape[0] + j), rgb(col(g[j, i])))
    sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST).save(f'{out}/workshop_props_x2.png')
    print('ok')
