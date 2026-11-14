# Block 7: monsters, side view facing right (mirror for left), in dwarf scale (a dwarf is ~47 px tall).
# Built from shapes like the dwarves; each has 4 frames of a walk or idle cycle. Eyes glow ('lava', 'crystal').
#   python3 monsters.py <out dir>
import sys, os
from rock import *

R['fur'] = ['#1c1416', '#382828', '#5a4440', '#806458', '#a8887a']
R['chitin'] = ['#120c16', '#241a2c', '#3a2a46', '#56406a', '#7a5c92']
R['amber'] = ['#2a120a', '#5a2a12', '#8e4a1c', '#c27a2e', '#eab060']
R['gob'] = ['#1a2012', '#30401e', '#4e662e', '#76904a', '#a6bc70']
R['troll'] = ['#1a1c1e', '#30343a', '#4a5058', '#6a7276', '#9098a0']
R['ogre'] = ['#3a2020', '#6a3e34', '#a06a56', '#c89478', '#ecc0a0']
R['wyrm'] = ['#0e1622', '#1a2a3e', '#2a4660', '#40688a', '#6a96b4']

def limb(p, a, b, c, r, ramp, bias=0.0):
    p.fill(cap(a, b, r), ramp, bias=bias); p.fill(cap(b, c, r * 0.85), ramp, bias=bias)
def eye(p, x, y, ramp='lava', big=False):
    p.c[y, x] = (ramp, 4)
    if big: p.c[y, x + 1] = (ramp, 3); p.c[y + 1, x] = (ramp, 3)
def far(p):
    """Darken a part that stands behind the body."""
    for y, x in zip(*np.nonzero(p.c != None)):
        r, t = p.c[y, x]; p.c[y, x] = (r, max(0, t - 1))
    return p

# ------------------------------------------------------------------ small ones
def rat(p, x0, y0, f):
    s = (0, 1, 0, -1)[f]
    tail = [(x0 - 9, y0 - 2), (x0 - 15, y0 - 5), (x0 - 20, y0 - 3 + s)]
    for a, b in zip(tail, tail[1:]): p.fill(cap(a, b, 0.7), 'petal', idx=np.full((H, W), 2), outline=False)
    for i, lx in enumerate((x0 - 5, x0 + 4)):
        d = s if i % 2 else -s
        p.fill(rect_m(lx + d, y0 + 2, lx + d + 1, y0 + 4), 'fur', idx=np.full((H, W), 1), outline=False)
    p.fill(ell(x0, y0 - 1, 9, 4.6) & (yy <= y0 + 3), 'fur', bias=0.1)
    p.fill(ell(x0 + 9, y0 - 1, 4.4, 3.4) | poly([(x0 + 11, y0 - 3), (x0 + 16, y0 + 0.5), (x0 + 11, y0 + 2)]), 'fur', bias=0.15)
    p.fill(ell(x0 + 7, y0 - 5, 2, 2), 'petal', bias=0.1)
    p.c[y0, x0 + 16] = ('petal', 3); eye(p, x0 + 11, y0 - 2)
def giant_rat(frame=0):
    p = Part(); b = Part()
    rat(b, 34, 88, (frame + 2) % 4); far(b)
    rat(p, 52, 92, frame % 4)
    return crop_parts([b, p])
def cave_crawler(frame=0):
    p = Part(); legs = Part()
    segs = []
    for i in range(9):
        x = 24 + i * 5.2; y = 89 + math.sin(i * 0.9 + frame * math.pi / 2) * 1.2
        segs.append((x, y, 3.2 + 0.6 * math.sin(math.pi * i / 8)))
    for i, (x, y, r) in enumerate(segs):                                 # legs, alternating pairs
        k = (i + frame) % 2
        legs.fill(cap((x, y + 1), (x - 2 + k * 3, 95), 0.6), 'amber', idx=np.full((H, W), 1), outline=False)
    for i, (x, y, r) in enumerate(segs):
        p.fill(ell(x, y, r * 0.9, r), 'amber', bias=0.1)
        p.c[round(y - r + 1), round(x)] = ('amber', 4)
    hx, hy = segs[-1][0] + 5, segs[-1][1] - 1
    p.fill(ell(hx, hy, 4, 3.4), 'amber', bias=0.15)
    for d in (-1, 1): p.fill(cap((hx + 3, hy + 1), (hx + 7, hy + 1 + d * 2), 0.6), 'cream', idx=np.full((H, W), 3), outline=False)  # mandibles
    p.fill(cap((hx + 1, hy - 3), (hx + 8, hy - 9 + (frame % 2)), 0.5), 'amber', idx=np.full((H, W), 3), outline=False)            # feeler
    eye(p, round(hx + 1), round(hy - 1))
    return crop_parts([legs, p])
def cave_spider(frame=0):
    p = Part(); back = Part()
    tx, ty = 56, 80
    for side, part in ((0, back), (1, p)):
        for k in range(4):
            g = (k + frame + side) % 2
            knee = (tx - 8 + k * 7 + (2 if side else -2), 64 + k * 1.5 - g * 2)
            foot = (tx - 22 + k * 13 + g * 3 + side * 2, 95)
            limb(part, (tx - 2 + k * 2, ty), knee, foot, 1.3, 'chitin', 0.05)
    far(back)
    p.fill(ell(36, 76, 13, 10.5), 'chitin', bias=0.1)                                    # abdomen
    for x, y in ((32, 72), (38, 70), (35, 78)): p.c[y, x] = ('quilt', 3)                  # markings
    p.fill(ell(tx, ty, 8, 6.5), 'chitin', bias=0.15)
    p.fill(ell(tx + 7, ty + 1, 4.5, 4), 'chitin', bias=0.2)
    for x, y in ((tx + 8, ty - 1), (tx + 10, ty), (tx + 7, ty + 1), (tx + 10, ty + 2)): p.c[y, x] = ('lava', 4)
    p.fill(cap((tx + 10, ty + 4), (tx + 12, ty + 7), 0.6), 'cream', idx=np.full((H, W), 3), outline=False)  # fangs
    return crop_parts([back, p])

# ------------------------------------------------------------------ people of the deep
def goblin(p, x, f, weapon='spear'):
    s = (0, 1, 0, -1)[f]; yb = 95
    for i, d in enumerate((s, -s)):
        part = Part(); part.fill(cap((x - 1 + i * 2, yb - 12), (x - 1 + i * 2 + d * 3, yb - 1), 1.3), 'gob', bias=0.05)
        part.fill(rect_m(x - 2 + i * 2 + d * 3, yb - 1, x + 2 + i * 2 + d * 3, yb), 'clay', idx=np.full((H, W), 1))
        if i == 0: far(part)
        p.c = compose([part, p]) if i == 0 else compose([p, part])
    body = poly([(x - 5, yb - 11), (x + 5, yb - 11), (x + 4, yb - 22), (x - 4, yb - 22)])
    p.fill(body, 'clay', bias=0.05)
    p.fill(rect_m(x - 5, yb - 13, x + 5, yb - 12), 'oak', idx=np.where(yy == yb - 13, 3, 1))
    p.fill(ell(x + 1, yb - 27, 6, 5.5), 'gob', bias=0.15)
    p.fill(poly([(x - 4, yb - 29), (x - 12, yb - 34 + (f % 2)), (x - 3, yb - 26)]), 'gob', bias=0.1)       # ear
    p.fill(poly([(x + 6, yb - 28), (x + 10, yb - 25), (x + 6, yb - 25)]), 'gob', bias=0.1)               # nose
    p.c[yb - 29, x + 3] = ('gold', 4); p.c[yb - 24, x + 4] = ('cream', 4)
    if weapon == 'spear':
        p.fill(cap((x - 2, yb - 4), (x + 14, yb - 40), 0.6), 'wood', idx=np.full((H, W), 3))
        p.fill(poly([(x + 13, yb - 40), (x + 17, yb - 46), (x + 15, yb - 38)]), 'silver', bias=0.2)
    else:
        p.fill(cap((x + 5, yb - 16), (x + 12, yb - 20), 0.7), 'silver', bias=0.2)
    p.fill(cap((x, yb - 20), (x + 5, yb - 16), 1.3), 'gob', bias=0.1)                                   # arm
def goblin_scouts(frame=0):
    a, b = Part(), Part()
    goblin(b, 30, (frame + 2) % 4, 'dagger'); far(b)
    goblin(a, 52, frame % 4, 'spear')
    return crop_parts([b, a])
def rock_troll(frame=0):
    p = Part(); back = Part()
    bob = (0, 1, 0, 1)[frame]; s = (0, 2, 0, -2)[frame]
    limb(back, (38, 70), (36 + s, 82), (34 + s, 94), 4, 'troll'); far(back)
    limb(back, (60, 56), (52, 72), (50 - s, 86), 3.2, 'troll'); far(back)
    limb(p, (48, 72), (52 - s, 83), (54 - s, 94), 4.2, 'troll')
    body = ell(46, 58 + bob, 18, 15)
    p.fill(body, 'troll', bias=0.05, round_=1.0)
    for y, x in zip(*np.nonzero(body & (yy < 50 + bob))):                               # moss on the hunched back
        if hsh(x // 2, y // 2) % 3 == 0: p.c[y, x] = ('moss', 3 if (x + y) % 2 else 2)
    for x, y in ((42, 60), (50, 64), (38, 66)): p.c[y + bob, x] = ('troll', 1)            # cracks in the skin
    p.fill(ell(65, 56 + bob, 7, 6.5), 'troll', bias=0.15)                                 # head, low and forward
    p.fill(poly([(68, 60 + bob), (74, 59 + bob), (70, 64 + bob)]), 'troll', bias=0.1)     # jaw
    p.fill(poly([(69, 60 + bob), (71, 56 + bob), (72, 60 + bob)]), 'cream', idx=np.full((H, W), 3))  # tusk
    eye(p, 68, 54 + bob, 'lava')
    limb(p, (56, 58 + bob), (64, 72), (66 + s, 84), 3.6, 'troll', 0.05)                   # long arm
    p.fill(cap((66 + s, 86), (78 + s, 70), 3), 'oak', bias=0.05)                          # club
    return crop_parts([back, p])
def blind_ogre(frame=0):
    p = Part(); back = Part()
    bob = (0, 1, 0, 1)[frame]; s = (0, 2, 0, -2)[frame]
    limb(back, (42, 76), (40 + s, 86), (40 + s, 94), 4.5, 'ogre'); far(back)
    limb(p, (52, 76), (54 - s, 86), (55 - s, 94), 4.8, 'ogre')
    belly = ell(48, 64 + bob, 17, 16)
    p.fill(belly, 'ogre', bias=0.1, round_=0.9)
    p.c[66 + bob, 56] = ('ogre', 1)                                                       # navel
    loin = poly([(33, 74 + bob), (63, 74 + bob), (58, 84 + bob), (38, 84 + bob)])
    p.fill(loin, 'clay', bias=0.05)
    p.fill(rect_m(32, 72 + bob, 64, 74 + bob), 'oak', idx=np.where(yy == 72 + bob, 3, 1))
    p.fill(ell(52, 40 + bob, 8.5, 8), 'ogre', bias=0.15)
    p.fill(ell(44, 41 + bob, 2.5, 3.5), 'ogre', bias=0.05)                                # ear
    p.fill(rect_m(45, 37 + bob, 61, 40 + bob), 'quilt', idx=np.where(yy == 37 + bob, 3, 1))   # blindfold
    p.fill(cap((44, 38 + bob), (40, 44 + bob), 0.8), 'quilt', idx=np.full((H, W), 2), outline=False)
    p.fill(rect_m(55, 45 + bob, 60, 46 + bob), 'ogre', idx=np.full((H, W), 0), outline=False)  # mouth
    p.c[44 + bob, 57] = ('cream', 4)
    up = frame in (1, 2)
    limb(p, (58, 52 + bob), (66, 62), (70, 54 if up else 70), 3.6, 'ogre', 0.05)
    club_a = (70, 54) if up else (70, 70)
    p.fill(cap(club_a, (club_a[0] + 10, club_a[1] - 16), 2.6), 'oak', bias=0.05)
    p.fill(ell(club_a[0] + 10, club_a[1] - 17, 4, 4), 'oak', bias=0.05)
    return crop_parts([back, p])

# ------------------------------------------------------------------ the deep ones
def facet_fill(part, m, ramp, seed):
    """Fill a mask with chipped stone facets: Voronoi cells shaded on top of a dome."""
    ids = np.where(m, voronoi(96, 96, 7, 6, 80 + seed, wrap=False), -1)
    g = blocks(ids, ramp, pick(2, 3, 2), wrap=False)
    dome = shade(m, 0.1, 0.7)
    idx = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(m)): idx[y, x] = max(0, min(4, g[y, x][1] + dome[y, x] - 2))
    part.fill(m, ramp, idx=idx)
def crystal_golem(frame=0):
    p = Part(); back = Part()
    bob = (0, 1, 0, 1)[frame]; s = (0, 2, 0, -2)[frame]
    def block(part, x0, y0, x1, y1, bias=0.0):
        m = poly([(x0, y0 + 1), (x0 + 1, y0), (x1 - 1, y0), (x1, y0 + 1), (x1, y1), (x0, y1)])
        facet_fill(part, m, 'd4', hsh(x0, y0) % 50)
    block(back, 38 + s, 76, 46 + s, 95); block(back, 30, 46 + bob, 38, 70 + bob); far(back)
    block(p, 50 - s, 76, 58 - s, 95)
    block(p, 34, 44 + bob, 62, 78 + bob, 0.1)                                              # torso
    block(p, 42, 30 + bob, 56, 43 + bob, 0.1)                                              # head
    p.fill(ell(48, 60 + bob, 4, 4), 'crystal', idx=np.where(xx < 48, 4, 3), outline=False) # glowing core
    for y, x in zip(*np.nonzero(ell(48, 60 + bob, 6.5, 6.5) & ~ell(48, 60 + bob, 4.2, 4.2))):
        if p.c[y, x] and p.c[y, x][0] == 'd4' and (x + y) % 2: p.c[y, x] = ('crystal', 1)
    eye(p, 52, 36 + bob, 'crystal', True)
    for (x, y, h, lean) in ((36, 44, 10, -0.4), (42, 44, 14, -0.1), (58, 44, 8, 0.3), (46, 30, 7, -0.2)):   # crystal growths
        y += bob
        m = poly([(x - 2, y + 1), (x + 2, y + 1), (x + 1 + lean * h, y - h), (x - 1 + lean * h, y - h)])
        p.fill(m, 'crystal', idx=np.where(xx < x + lean * (y - yy), 4, 2))
    block(p, 60, 48 + bob, 68, 72 + bob - (frame % 2) * 4, 0.05)                           # arm
    return crop_parts([back, p])
def magma_crab(frame=0):
    p = Part(); back = Part()
    o = frame % 2
    for side, part in ((0, back), (1, p)):
        for k in range(3):
            g = (k + frame + side) % 2
            limb(part, (40 + k * 7, 84), (34 + k * 10 + side * 2, 80 - g * 2), (30 + k * 11 + side * 3 + g * 2, 95), 1.6, 'blackiron')
    far(back)
    shell = ell(48, 82, 18, 9) & (yy <= 88)
    p.fill(shell, 'blackiron', bias=0.1, round_=0.9)
    for (a, b) in (((38, 80), (46, 77)), ((46, 77), (54, 81)), ((50, 79), (58, 76)), ((42, 84), (50, 85))):   # lava seams
        for t in np.linspace(0, 1, 10):
            x, y = round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t)
            p.c[y, x] = ('lava', 3 if (x + y) % 3 else 4)
    for (x, y) in ((58, 76), (62, 76)): p.fill(cap((x, y + 2), (x + 1, y - 3), 0.6), 'blackiron', idx=np.full((H, W), 2), outline=False); eye(p, x + 1, y - 4, 'lava')
    limb(p, (62, 82), (68, 76), (72, 72), 2.4, 'blackiron')
    p.fill(ell(76, 70, 5.5, 5), 'blackiron', bias=0.15)                                    # claw
    p.fill(poly([(77, 65.5), (89, 62 - o * 3), (87, 67), (80, 69)]), 'blackiron', bias=0.15)
    p.fill(poly([(79, 71), (88, 71 + o * 3), (86, 75), (78, 75)]), 'blackiron', bias=0.05)
    p.c[70, 77] = ('lava', 3); p.c[71, 76] = ('lava', 2)
    return crop_parts([back, p])
def deep_wyrm(frame=0):
    p = Part()
    ph = frame * math.pi / 2
    pts = [(x, 80 + 7 * math.sin(x / 9 - ph) * (0.4 + 0.6 * (x - 4) / 70)) for x in range(4, 74)]
    for i, (x, y) in enumerate(pts):                                                     # body, thick near the head
        r = 2 + 6 * (i / len(pts)) ** 0.8
        m = ell(x, y, r * 0.7, r)
        p.fill(m, 'wyrm', idx=np.where(yy < y - r * 0.3, 3, np.where(yy > y + r * 0.45, 1, 2)), outline=False)
    for i, (x, y) in enumerate(pts):
        r = 2 + 6 * (i / len(pts)) ** 0.8
        yb = round(y + r - 1)
        if 0 <= yb < H: p.c[yb, x] = ('cream', 2 if x % 3 else 3)                         # pale belly plates
        if i % 6 == 0 and i > 6:                                                         # spine fins
            for d in range(int(r * 0.5) + 1): p.c[round(y - r) - d, x - d // 2] = ('quilt', 2 if d else 3)
        if i % 4 == 2: p.c[round(y - r * 0.2), x] = ('wyrm', 4)                           # scale glints
    hx, hy = int(pts[-1][0] + 4), int(round(pts[-1][1] - 3))
    head = poly([(hx - 6, hy - 6), (hx + 8, hy - 3), (hx + 14, hy + 1), (hx + 6, hy + 2), (hx - 6, hy + 4)])
    p.fill(head, 'wyrm', bias=0.15)
    jaw = poly([(hx - 4, hy + 4), (hx + 6, hy + 3 + (frame % 2) * 2), (hx + 12, hy + 6 + (frame % 2) * 3), (hx - 2, hy + 8)])
    p.fill(jaw, 'wyrm', bias=0.05)
    for x in range(hx, hx + 10, 2): p.c[hy + 3, x] = ('cream', 4)                         # teeth
    p.fill(poly([(hx - 6, hy - 5), (hx - 14, hy - 12), (hx - 4, hy - 7)]), 'quilt', bias=0.1)   # horn frill
    eye(p, hx + 3, hy - 3, 'lava', True)
    o = Part(); o.c = p.c
    q = Part()
    m = o.c != None
    for y, x in zip(*np.nonzero(m)):                                                     # one outline round the whole beast
        q.c[y, x] = o.c[y, x]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not m[ny, nx] and q.c[ny, nx] is None: q.c[ny, nx] = ('wyrm', 0)
    return crop(q)

MONSTERS = {'giant_rat': giant_rat, 'cave_crawler': cave_crawler, 'cave_spider': cave_spider, 'goblin_scouts': goblin_scouts,
            'rock_troll': rock_troll, 'magma_crab': magma_crab, 'blind_ogre': blind_ogre, 'crystal_golem': crystal_golem,
            'deep_wyrm': deep_wyrm}

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    cols, cw, rh = 5, 112, 110
    W_, H_ = cols * cw, 2 * rh
    frames = []
    for fr in range(4):
        cv = np.full((H_, W_), R['d0'][1], object); em = np.zeros(cv.shape, bool)
        for r in range(2):
            for x in range(W_):
                for y in range(r * rh + rh - 8, r * rh + rh): cv[y, x] = ('d0', 2 if y == r * rh + rh - 8 else 1)
        for n, (k, f) in enumerate(list(MONSTERS.items()) + [('dwarf', None)]):
            cx, base = (n % cols) * cw + cw // 2, (n // cols) * rh + rh - 8
            if f: put(cv, em, f(fr), cx, base)
            else: dwarf(cv, em, 'd_side', cx, base)
        frames.append(light(cv, em, [], ambient=1.0).resize((W_ * 3, H_ * 3), Image.NEAREST))
    frames[0].save(f'{out}/monsters_x3.png')
    frames[0].save(f'{out}/monsters_x3.gif', save_all=True, append_images=frames[1:], duration=180, loop=0)
    print('ok')
