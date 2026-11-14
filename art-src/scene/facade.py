# The gate of the hold: a great wall cut into the mountain's face, two colossal dwarf statues in niches, the arch with
# its doors open, a rune frieze and battlements. One picture of 320 x 288 standing on the valley floor; the right part
# (from the arch's right side on) is also cut out as 'gate_front' and drawn over the dwarves, so they vanish into the
# gate and come out in the entrance hall.
#   python3 art-src/scene/facade.py [<out dir>]      preview only; export.py takes facade() for the sheet
import sys, os, math
import numpy as np
from shells import R, EX, hsh, blocks, pick, grid, col, rgb
import living                                           # blackiron ramp

W, H = 320, 288
G = H - 1                                               # the floor line (last row)
GX = 160                                                # the middle of the arch
yy, xx = np.mgrid[0:H, 0:W]
R['statue'] = ['#1c1820', '#38323e', '#585060', '#7c7482', '#a49ca4']   # grey granite, cooler than the sandstone wall
R['gem'] = ['#3a0c18', '#7a1a2a', '#c0303a', '#f06a5a', '#ffd0b8']

def ell(cx, cy, rx, ry): return ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1
def rect(x0, y0, x1, y1): return (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
def poly(pts):
    m = np.zeros((H, W), bool); n = len(pts)
    for y in range(H):
        py = y + 0.5; xs = []
        for i in range(n):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
            if (y1 > py) != (y2 > py): xs.append(x1 + (py - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]): m[y, int(math.ceil(a - 0.5)):int(math.ceil(b - 0.5))] = True
    return m
def cap(a, b, r):
    (ax, ay), (bx, by) = a, b
    px, py = xx + 0.5 - ax, yy + 0.5 - ay; dx, dy = bx - ax, by - ay
    t = np.clip((px * dx + py * dy) / max(1e-6, dx * dx + dy * dy), 0, 1)
    return (px - t * dx) ** 2 + (py - t * dy) ** 2 <= r * r
def dist_in(m, n=8):
    d = np.where(m, n, 0).astype(float)
    for _ in range(n):
        p = np.pad(d, 1)
        d = np.where(m, np.minimum(d, np.minimum.reduce([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]) + 1), 0)
    return d
LIGHT = np.array([-0.55, -0.7, 0.45]); LIGHT /= np.linalg.norm(LIGHT)
def shade(m, bias=0.0, n=8):
    """Tone 0..4 for a mask, as if it were a rounded body lit from the top left."""
    h = np.sqrt(dist_in(m, n)) * 1.2
    hp = np.pad(h, 1, mode='edge')
    gx = (hp[1:-1, 2:] - hp[1:-1, :-2]) / 2; gy = (hp[2:, 1:-1] - hp[:-2, 1:-1]) / 2
    nn = np.stack([-gx, -gy, np.ones_like(gx) * 0.9], -1); nn /= np.linalg.norm(nn, axis=-1, keepdims=True)
    v = nn @ LIGHT + bias
    idx = np.full((H, W), 2); idx[v < 0.15] = 1; idx[v >= 0.42] = 3; idx[v >= 0.72] = 4
    return idx

class Pic:
    def __init__(s): s.c = grid(W, H)
    def fill(s, m, ramp, idx=None, bias=0.0, outline=True, n=8):
        if idx is None: idx = shade(m, bias, n)
        idx = np.broadcast_to(idx, (H, W))
        for y, x in zip(*np.nonzero(m)): s.c[y, x] = (ramp, int(idx[y, x]))
        if outline:
            o = m.copy()
            o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]; o[1:] |= m[:-1]; o[:-1] |= m[1:]
            for y, x in zip(*np.nonzero(o & ~m)):
                v = s.c[y, x]
                same = v is not None and not isinstance(v, str) and v[0] == ramp
                s.c[y, x] = (ramp, 1 if same else 0)          # a carved line inside one material, an outline outside
        return s
    def tone(s, m, ramp, t):
        for y, x in zip(*np.nonzero(m)): s.c[y, x] = (ramp, t)

# ------------------------------------------------------------------ the wall
WALL_TOP = 38                                           # top of the wall (merlons above it)
TOWER = 18                                              # the buttress towers at both ends

def ashlar(p, m, seed, course=14, ramp='sand', tones=(2, 2, 3, 2, 1)):
    """Dressed blocks in courses, joints offset from course to course."""
    ids = np.full((H, W), -1)
    for y in range(H):
        row = (G - y) // course
        off = (hsh(row, seed) % 23)
        for x in range(W):
            if not m[y, x]: continue
            k = (x + off) // (22 + (hsh(row, (x + off) // 22, seed) % 3) * 6)
            ids[y, x] = row * 1000 + k
    g = blocks(ids, ramp, pick(*tones), wrap=False)
    for y, x in zip(*np.nonzero(m)): p.c[y, x] = g[y, x]

def wall(p):
    body = rect(0, WALL_TOP, W - 1, G)
    ashlar(p, body, 3)
    # merlons on the wall, taller towers at both ends with their own
    for x in range(TOWER + 6, W - TOWER - 6, 22):
        m = rect(x, WALL_TOP - 11, x + 12, WALL_TOP - 1)
        p.fill(m, 'sand', idx=np.where(yy <= WALL_TOP - 10, 4, np.where(xx >= x + 11, 1, 3)))
    p.fill(rect(0, WALL_TOP - 1, W - 1, WALL_TOP + 3), 'sand', idx=np.where(yy == WALL_TOP - 1, 4, np.where(yy == WALL_TOP + 3, 1, 3)))
    for x0 in (0, W - TOWER):
        t = rect(x0, 10, x0 + TOWER - 1, G)
        ashlar(p, t, 9 + x0, 12, tones=(3, 3, 2, 3))
        for k, mx in enumerate((x0, x0 + TOWER - 6)):
            p.fill(rect(mx, 0, mx + 5, 9), 'sand', idx=np.where(yy == 0, 4, 3))
        sh = rect(x0 + TOWER, 10, x0 + TOWER + 2, G) if x0 == 0 else rect(x0 - 3, 10, x0 - 1, G)
        for y, x in zip(*np.nonzero(sh & body)): p.c[y, x] = ('sand', 1 if x0 == 0 else 0)
        for y, x in zip(*np.nonzero(rect(x0, 10, x0 + TOWER - 1, 13))): p.c[y, x] = ('sand', 4 if y == 10 else 3)
    # a plinth course along the foot of the wall
    p.fill(rect(0, G - 9, W - 1, G), 'sand', idx=np.where(yy == G - 9, 4, np.where(yy >= G - 1, 1, 2)))

# ------------------------------------------------------------------ niches and statues
def niche(p, cx, top, w=84):
    """An arched recess: darker inside, its arch outlined by voussoirs."""
    r = w / 2; spring = top + r
    inner = (rect(cx - r, spring, cx + r - 1, G - 10) | ell(cx, spring, r, r)) & (yy < G - 9)
    p.tone(inner, 'rock', 1)
    p.tone(inner & (yy > spring) & (xx > cx + r - 9), 'rock', 0)          # the right side of the recess in shadow
    p.tone(inner & (yy < spring + 4) & ~ell(cx, spring + 4, r - 4, r - 4) & (yy > top), 'rock', 0)
    ring = ell(cx, spring, r + 6, r + 6) & ~ell(cx, spring, r, r) & (yy <= spring)
    ids = np.full((H, W), -1)
    a = np.arctan2(spring - yy - 0.5, xx + 0.5 - cx)
    ids[ring] = (a[ring] / (math.pi / 9)).astype(int)
    g = blocks(ids, 'sand', lambda i: 3 if i == 4 else 2, wrap=False)
    for y, x in zip(*np.nonzero(ring)): p.c[y, x] = g[y, x]
    for x0 in (cx - r - 6, cx + r):                                         # jambs
        j = rect(x0, spring, x0 + 5, G - 10)
        p.fill(j, 'sand', idx=np.where(xx == x0, 4 if x0 < cx else 2, np.where(xx == x0 + 5, 1, 3)), outline=False)

def statue(p, cx, fy, mirror=False, weapon='hammer'):
    """A dwarf lord carved in granite, 200 px tall, hands on the pommel of a great hammer (or axe) set head down."""
    S = 'statue'
    sx = (lambda dx: cx - dx) if mirror else (lambda dx: cx + dx)
    # plinth
    p.fill(rect(cx - 34, fy - 22, cx + 33, fy), S, idx=np.where(yy <= fy - 21, 4, np.where(xx >= cx + 30, 1, 3)))
    p.fill(rect(cx - 30, fy - 27, cx + 29, fy - 23), S, idx=np.where(yy == fy - 27, 4, 2))
    for k in range(5):                                                       # runes cut into the plinth
        x = cx - 20 + k * 10
        p.tone(rect(x, fy - 15, x, fy - 8) | rect(x, fy - 15, x + 3, fy - 15) | rect(x + 2, fy - 12, x + 3, fy - 12), S, 1)
    top = fy - 27
    # boots
    for d in (-12, 12): p.fill(ell(cx + d, top - 4, 9, 6) & (yy <= top), S)
    # robe: wide at the hem, belted, broad shoulders
    robe = poly([(cx - 36, top - 6), (cx + 36, top - 6), (cx + 30, top - 100), (cx + 34, top - 128), (cx - 34, top - 128), (cx - 30, top - 100)])
    p.fill(robe, S, bias=0.05, n=10)
    for d in (-18, 0, 18):                                                   # folds
        p.tone(cap((cx + d, top - 70), (cx + d * 1.3, top - 8), 0.7) & robe, S, 1)
    p.tone(robe & (yy >= top - 14) & (yy <= top - 12), S, 4); p.tone(robe & (yy >= top - 11) & (yy <= top - 10), S, 1)
    p.fill(rect(cx - 31, top - 82, cx + 31, top - 76), S, idx=np.where(yy == top - 82, 3, 2))  # belt
    p.fill(rect(cx - 6, top - 84, cx + 5, top - 74), 'gold', idx=np.where(xx < cx, 4, 2))
    # shoulder pauldrons
    for d in (-1, 1): p.fill(ell(cx + d * 30, top - 124, 13, 10) & (yy <= top - 118), S, bias=0.1)
    # arms down to the hands, the hands on the pommel in the middle
    hy = top - 54
    for d in (-1, 1):
        p.fill(cap((cx + d * 32, top - 120), (cx + d * 30, top - 88), 7.5), S, bias=0.05)
        p.fill(cap((cx + d * 30, top - 88), (cx + d * 10, hy + 1), 6.5), S, bias=0.05)
    # the weapon: haft from the hands to the plinth, head on the ground, pommel above the hands
    p.fill(rect(cx - 3, hy - 4, cx + 2, top - 26), S, idx=np.where(xx <= cx - 2, 3, 1))
    if weapon == 'hammer':
        p.fill(rect(cx - 20, top - 26, cx + 19, top - 6), S, bias=0.1)
        p.tone(rect(cx - 20, top - 18, cx + 19, top - 16), S, 1)
    else:                                                                    # a two-bladed axe head down
        for d in (-1, 1):
            p.fill(poly([(cx + d * 3, top - 28), (cx + d * 18, top - 36), (cx + d * 24, top - 20), (cx + d * 18, top - 4), (cx + d * 3, top - 12)]), S, bias=0.1)
    p.fill(ell(cx - 6, hy, 8, 6) | ell(cx + 6, hy, 8, 6), S, bias=0.15)       # fists
    # the long beard, in three braids, over the chest down past the belt
    by = top - 144
    beard = poly([(cx - 20, by), (cx + 20, by), (cx + 15, by + 40), (cx + 6, by + 72), (cx, by + 80), (cx - 6, by + 72), (cx - 15, by + 40)])
    p.fill(beard, S, bias=0.1)
    for d in (-5, 5): p.tone(rect(cx + d, by + 22, cx + d, by + 74) & beard, S, 1)          # between the braids
    for k, d in enumerate((-10, 0, 10)):
        for y in range(by + 24 + k * 2, by + 76, 6):                                         # plaits: little chevrons
            p.tone((rect(cx + d - 3, y, cx + d - 1, y) | rect(cx + d, y + 1, cx + d + 2, y + 1)) & beard, S, 1)
    for y in range(by + 4, by + 22, 5):                                                       # wavy beard below the chin
        p.tone(rect(cx - 14 + (y % 2), y, cx + 13, y) & beard & ((xx + y) % 7 < 4), S, 1)
    for d in (-10, 10): p.fill(ell(cx + d, by + 58, 3, 2), 'gold', idx=3)  # gold rings in the braids
    # head: face, heavy brow, nose, moustache, helmet with cheek guards and a crest
    fy0 = by - 22
    p.fill(ell(cx, fy0 + 12, 15, 16) & (yy <= by + 2), S, bias=0.05)
    p.tone(rect(cx - 10, fy0 + 9, cx - 4, fy0 + 10) | rect(cx + 4, fy0 + 9, cx + 10, fy0 + 10), S, 0)   # deep-set eyes
    p.fill(poly([(cx - 3, fy0 + 9), (cx + 3, fy0 + 9), (cx + 4, fy0 + 18), (cx - 4, fy0 + 18)]), S, bias=0.25)
    p.fill(ell(cx - 7, by + 2, 9, 4) | ell(cx + 7, by + 2, 9, 4), S, bias=0.1)
    helm = ell(cx, fy0 + 4, 18, 15) & (yy <= fy0 + 6)
    p.fill(helm, S, bias=0.15)
    p.fill(rect(cx - 19, fy0 + 4, cx + 18, fy0 + 7), S, idx=np.where(yy == fy0 + 4, 4, 2))
    p.fill(rect(cx - 2, fy0 - 14, cx + 1, fy0 + 3), S, idx=np.where(xx <= cx - 1, 4, 2))                # crest ridge
    for d in (-1, 1):                                                         # small wings on the helmet
        wing = poly([(cx + d * 16, fy0 - 2), (cx + d * 30, fy0 - 16), (cx + d * 27, fy0 - 4), (cx + d * 18, fy0 + 3)])
        p.fill(wing, S, bias=0.2)

# ------------------------------------------------------------------ the arch, doors, frieze
R_IN, R_OUT, SPRING = 38, 52, G - 92

def arch(p):
    inside = (rect(GX - R_IN, SPRING, GX + R_IN - 1, G) | ell(GX, SPRING, R_IN, R_IN))
    # the dark of the passage, a little lighter low down where the hall's light falls in
    for y, x in zip(*np.nonzero(inside)):
        d = (G - y) / (G - SPRING + R_IN)
        p.c[y, x] = '#0e0a0e' if d > 0.55 else '#160f14' if d > 0.25 else '#21171c'
    # the two door leaves, swung open into the passage: narrow, foreshortened, planks and iron bands
    for d in (-1, 1):
        x0 = GX + d * R_IN
        leaf = poly([(x0, SPRING - 22), (x0 - d * 14, SPRING - 10), (x0 - d * 14, G - 3), (x0, G)])
        leaf &= inside
        p.fill(leaf, 'oak', idx=np.where((xx - x0) % 4 == 0, 1, 3 if d < 0 else 2), outline=False)
        for by in (SPRING - 4, SPRING + 30, G - 16):
            p.tone(leaf & (yy >= by + (xx - x0) * d * -0.85 * 0) & (yy <= by + 2), 'blackiron', 2)
    # voussoirs around the arch, a keystone with a red gem
    ring = (ell(GX, SPRING, R_OUT, R_OUT) & ~ell(GX, SPRING, R_IN, R_IN) & (yy <= SPRING))
    ids = np.full((H, W), -1)
    a = np.arctan2(SPRING - yy - 0.5, xx + 0.5 - GX)
    ids[ring] = ((a[ring] + math.pi / 26) / (math.pi / 13)).astype(int)
    g = blocks(ids, 'sand', lambda i: 3 if i == 6 else pick(2, 3)(i), wrap=False)
    for y, x in zip(*np.nonzero(ring)): p.c[y, x] = g[y, x]
    key = poly([(GX - 9, SPRING - R_OUT - 6), (GX + 9, SPRING - R_OUT - 6), (GX + 6, SPRING - R_IN + 2), (GX - 6, SPRING - R_IN + 2)])
    p.fill(key, 'sand', bias=0.2)
    p.fill(ell(GX, SPRING - R_OUT + 3, 4, 5), 'gem', bias=0.3)
    for d in (-1, 1):                                                         # jambs down to the floor
        x0 = GX + d * R_IN if d > 0 else GX - R_OUT
        j = rect(x0, SPRING, x0 + (R_OUT - R_IN) - 1, G - 1)
        ids = np.where(j, (G - yy) // 15, -1)
        g = blocks(ids, 'sand', pick(3, 2), wrap=False)
        for y, x in zip(*np.nonzero(j)): p.c[y, x] = g[y, x]
    # steps up to the gate
    for k in range(3):
        w = 66 - k * 8
        p.fill(rect(GX - w, G - 3 - k * 4, GX + w - 1, G - k * 4), 'sand', idx=np.where(yy == G - 3 - k * 4, 4, np.where(xx >= GX + w - 3, 1, 2)), outline=False)

def frieze(p, level_gold=True):
    """A band of runes over the arch and a roundel with crossed hammers above it."""
    y0 = SPRING - R_OUT - 22
    band = rect(GX - 70, y0, GX + 69, y0 + 11)
    p.fill(band, 'sand', idx=np.where(yy == y0, 4, np.where(yy == y0 + 11, 1, 3)))
    for k in range(12):
        x = GX - 64 + k * 11
        h = hsh(k, 77)
        m = rect(x, y0 + 3, x, y0 + 8) | (rect(x, y0 + 3, x + 4, y0 + 3) if h & 1 else rect(x, y0 + 8, x + 4, y0 + 8))
        m |= rect(x + 4, y0 + 3 + (h >> 1) % 4, x + 4, y0 + 6 + (h >> 1) % 3) if h & 2 else rect(x + 2, y0 + 5, x + 3, y0 + 6)
        p.tone(m, 'gold', 3)
    cy = y0 - 26
    p.fill(ell(GX, cy, 22, 22), 'sand', bias=0.1)
    p.fill(ell(GX, cy, 18, 18), 'gold', idx=np.where(ell(GX - 2, cy - 2, 17, 17), 3, 1))
    p.fill(ell(GX, cy, 15, 15), 'statue', idx=2, outline=False)
    for d in (-1, 1):                                                         # crossed hammers
        p.fill(cap((GX - d * 9, cy + 9), (GX + d * 7, cy - 7), 1.2), 'gold', idx=3, outline=False)
        p.fill(poly([(GX + d * 3, cy - 13), (GX + d * 12, cy - 4), (GX + d * 8, cy), (GX - d * 1, cy - 9)]), 'gold', idx=4 if d < 0 else 2)

def facade():
    p = Pic()
    wall(p)
    for cx in (62, W - 62): niche(p, cx, 46)
    statue(p, 62, G - 10)
    statue(p, W - 62, G - 10, mirror=True, weapon='axe')
    arch(p)
    frieze(p)
    return p.c

def split(g):
    """The right part (from the arch's right jamb on) for drawing in front of the dwarves."""
    f = g.copy()
    f[:, :GX + R_OUT] = None
    return f
ANCHOR = (GX, H)                                        # bottom row stands on the floor line

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    g = facade()
    im = Image.new('RGBA', (W, H), (110, 150, 190, 255)); px = im.load()
    for y in range(H):
        for x in range(W):
            if g[y, x] is not None: px[x, y] = rgb(col(g[y, x])) + (255,)
    im.resize((W * 3, H * 3), Image.NEAREST).save(f'{out}/facade_x3.png')
    print('ok')
