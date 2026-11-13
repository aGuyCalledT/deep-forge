# The backdrop behind the valley: far snowy peaks, a mountain range with forest on its feet, wooded hills, the forest
# edge, and the great massif behind the hold. Each layer is a picture of its own (they are too big for the sprite
# sheet); the game slides them slower than the world (parallax) and tints them for dusk and night.
#   python3 art-src/props48/backdrop.py [<out dir>]     default: src/main/resources/static/art/backdrop
# Writes <name>.png per layer and backdrop.json: name -> {w, h, ax, ay, k, tile}
#   ax, ay  where the layer stands on the valley floor (tiles: 0, bottom), k  how fast it moves with the world (0..1)
import sys, os, json, math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../src/main/resources/static/art/backdrop')
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16

def hsh(*a):
    v = 2166136261
    for x in a: v = ((v ^ (int(x) & 0xffffffff)) * 16777619) & 0xffffffff
    v ^= v >> 13; v = (v * 0x5bd1e995) & 0xffffffff; v ^= v >> 15
    return v
def rnd(*a): return hsh(*a) / 0xffffffff
def hx(c): return np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], float)
def mix(a, b, t): return '#%02x%02x%02x' % tuple(int(round(v)) for v in hx(a) + (hx(b) - hx(a)) * t)

class Canvas:
    def __init__(s, w, h): s.w, s.h = w, h; s.c = np.full((h, w), None, object)
    def set(s, m, col): s.c[m] = col
    def png(s, path):
        im = np.zeros((s.h, s.w, 4), np.uint8)
        for col in {v for v in s.c.flat if v is not None}:
            m = s.c == col; im[m, :3] = hx(col); im[m, 3] = 255
        Image.fromarray(im, 'RGBA').save(path, optimize=True)
        return im

def wobble(n, seed, amp, waves=((7, 1.0), (13, 0.5), (29, 0.25)), period=None):
    """Smooth periodic wiggle over n samples."""
    x = np.arange(n); out = np.zeros(n)
    P = period or n
    for k, (f, a) in enumerate(waves):
        out += a * np.sin(2 * math.pi * f * x / P + rnd(seed, k) * 6.283)
    return out / sum(a for _, a in waves) * amp

def haze(cv, tones, hz, y0, y1, steps=3):
    """Mist rising from the valley floor: below y0 the colours give way to the haze colour, dithered, by y1 all haze."""
    yy, xx = np.mgrid[0:cv.h, 0:cv.w]
    t = np.clip((yy - y0) / max(1, y1 - y0), 0, 1)
    for col in {v for v in cv.c.flat if v is not None}:
        m = (cv.c == col) & (t > 0)
        if not m.any(): continue
        lv = t * steps
        level = np.floor(lv + (lv % 1 > BAYER[yy % 4, xx % 4]) * 1.0)
        for L in range(1, steps + 1):
            cv.c[m & (level >= L) & (level < L + 1) if L < steps else m & (level >= L)] = mix(col, hz, L / steps * 0.85)

# ------------------------------------------------------------------ mountains
def fractal(w, seed, amp, rough=0.55, period=True, start=8):
    """A jagged line by midpoint displacement (periodic when period): from steps of n/start down to single pixels."""
    n = 1
    while n < w: n *= 2
    pts = np.zeros(n + 1)
    step, a, lvl = n // start, amp, 0
    for i in range(0, n + 1, step): pts[i] = (rnd(seed, 99, i % n) * 2 - 1) * amp
    while step > 1:
        half = step // 2
        for i in range(half, n, step):
            pts[i] = (pts[i - half] + pts[i + half]) / 2 + (rnd(seed, lvl, i) * 2 - 1) * a
        step, a, lvl = half, a * rough, lvl + 1
    xs = np.arange(w) * n / w
    return np.interp(xs, np.arange(n + 1), pts)

def skyline(w, spec, seed, base, rough_amp=0.07, period=True):
    """Height line of a range: each peak a horn (steep top, flatter flanks), joined, then roughened."""
    x = np.arange(w) + 0.5
    top = np.full(w, float(base))
    for i, (px, ph, wl, wr) in enumerate(spec):
        dx = x - px
        if period: dx = (dx + w / 2) % w - w / 2
        u = np.where(dx < 0, -dx / wl, dx / wr)
        prof = base - ph * np.clip(1 - u, 0, 1) ** 1.35
        top = np.minimum(top, prof)
    hgt = base - top
    top = top + fractal(w, seed, 1, 0.62, start=16) * (3 + hgt * rough_amp) + fractal(w, seed + 1, 1, 0.5, start=128) * 1.5
    top = np.round(top)
    return top

def mountain(cv, top, P, snow_alt, snow_amp=22, shear=0.45, seed=1, base=None, period=True, rim=True):
    """Fill under the skyline. A face is lit where the skyline above it climbs to the right (light from the left);
    the faces are sheared, so ridges run down at a slant like gullies. Snow above snow_alt, in streaks that follow
    the faces."""
    w, h = cv.w, cv.h
    yy, xx = np.mgrid[0:h, 0:w]
    sm = np.convolve(np.concatenate([top[-4:], top, top[:4]]), np.ones(9) / 9, 'same')[4:-4]
    slope = np.roll(sm, -2) - np.roll(sm, 2)                 # < 0: the line climbs to the right
    depth = np.clip(yy - top[xx], 0, None)
    lean = shear + wobble(h, seed, 0.12, ((3, 1), (7, 0.5)))[yy]
    src = (xx + depth * lean).astype(int)
    src = src % w if period else np.clip(src, 0, w - 1)
    lit = slope[src] < -0.15
    m = yy >= top[xx]
    fac = fractal(w, seed + 7, 1, 0.7)
    sl = snow_alt + fac[src] * snow_amp + depth * 0.05
    snow = yy < sl
    col = np.where(lit, P['rock_l'], P['rock_d']).astype(object)
    # a third tone where a face turns: the first pixels on the dark side of a ridge
    edge = lit & ~np.roll(lit, -1, 1)
    col[edge & ~snow] = P.get('ridge', P['rock_l'])
    col[snow & lit] = P['snow_l']; col[snow & ~lit] = P['snow_d']
    cv.c[m] = col[m]
    if rim:
        r = m & ~np.roll(m, 1, 0) & (slope[xx] < 0)
        cv.c[r] = P['rim']
    return m

# ------------------------------------------------------------------ a line of firs (silhouettes with a lit side)
def firs(cv, base_y, n, hmin, hmax, seed, P, period=True, oaks=0.0, x0=0, x1=None):
    """Trees standing on base_y (array per column or a number), back to front: each a stepped triangle (or a round
    crown), lit on the left, dark on the right, a light rim on the sunny edge."""
    w, h = cv.w, cv.h
    x1 = w if x1 is None else x1
    yy, xx = np.mgrid[0:h, 0:w]
    base = np.broadcast_to(np.asarray(base_y, float), (w,))
    order = sorted(range(n), key=lambda i: rnd(seed, i, 9))
    for i in order:
        tx = x0 + rnd(seed, i, 1) * (x1 - x0)
        th = hmin + (hmax - hmin) * rnd(seed, i, 2) ** 1.5
        by = base[int(tx) % w] + 2
        dx = xx + 0.5 - tx
        if period: dx = (dx + w / 2) % w - w / 2
        if rnd(seed, i, 4) < oaks:            # a round leafy crown on a short trunk
            r = th * 0.36; cy = by - th + r
            m = ((dx / r) ** 2 + ((yy + 0.5 - cy) / (r * 0.9)) ** 2 <= 1)
            for k in range(4):                  # clumps on the edge
                a = rnd(seed, i, 10 + k) * 6.283; cx2, cy2 = math.cos(a) * r * 0.7, math.sin(a) * r * 0.6
                m |= (((dx - cx2) / (r * 0.5)) ** 2 + ((yy + 0.5 - cy - cy2) / (r * 0.45)) ** 2 <= 1)
            m |= (np.abs(dx) < max(1, th * 0.05)) & (yy > cy) & (yy <= by)
            lit = (dx + (yy - cy) * 0.3) < -r * 0.15
        else:                                   # a fir: tiers that step in
            top = by - th
            v = np.clip((yy + 0.5 - top) / th, 0, 1)
            tiers = 3 + int(th // 18)
            step = (v * tiers) % 1
            half = th * 0.34 * v * (0.72 + 0.28 * step)
            m = (np.abs(dx) <= half + 0.3) & (yy >= top) & (yy <= by)
            m |= (np.abs(dx) < max(0.6, th * 0.03)) & (yy > by - th * 0.12) & (yy <= by + 1)
            lit = dx < -half * 0.15
        m &= (yy < h)
        cv.c[m & lit] = P['lit']; cv.c[m & ~lit] = P['dark']
        rim = m & lit & ~np.roll(m, 1, 1)
        cv.c[rim] = P['rim']

def ground_fill(cv, top, col):
    yy, xx = np.mgrid[0:cv.h, 0:cv.w]
    cv.c[(yy >= np.asarray(top)[xx])] = col

# ------------------------------------------------------------------ the layers
LAYERS = {}

def far_peaks():
    w, h = 960, 330
    cv = Canvas(w, h)
    P = {'rock_l': '#a9b2cd', 'rock_d': '#8b94b7', 'ridge': '#bcc4da', 'snow_l': '#f6f8fc', 'snow_d': '#ccd2e8', 'rim': '#ffffff'}
    spec = [(i * w / 8 + rnd(1, i) * 60, 140 + rnd(2, i) * 170, 60 + rnd(3, i) * 50, 70 + rnd(4, i) * 60) for i in range(8)]
    top = skyline(w, spec, 11, h)
    mountain(cv, top, P, h - 200, 30, 0.5, 11)
    haze(cv, None, '#c9d6e6', h - 130, h, 3)
    ground_fill(cv, np.full(w, h - 6), '#c9d6e6')
    return cv, 0.08
def mid_range():
    w, h = 960, 250
    cv = Canvas(w, h)
    P = {'rock_l': '#7f8ba9', 'rock_d': '#5f6a8d', 'ridge': '#949fba', 'snow_l': '#e9eef7', 'snow_d': '#aeb7d1', 'rim': '#cbd3e5'}
    spec = [(i * w / 6 + rnd(5, i) * 70, 100 + rnd(6, i) * 110, 80 + rnd(7, i) * 60, 90 + rnd(8, i) * 70) for i in range(6)]
    top = skyline(w, spec, 23, h)
    m = mountain(cv, top, P, h - 175, 18, 0.4, 23)
    # forest climbs the lower slopes up to a ragged tree line
    tl = np.maximum(top + 30, h - 95 + wobble(w, 41, 18, ((3, 1), (7, 0.6), (17, 0.3))))
    yy, xx = np.mgrid[0:h, 0:w]
    F = {'lit': '#5b7a72', 'dark': '#465f62', 'rim': '#6f8c7c'}
    cv.c[m & (yy > tl[xx] + 8)] = F['dark']
    trees = Canvas(w, h); firs(trees, tl + 10, 260, 6, 16, 43, F)
    tm = (trees.c != None) & m
    cv.c[tm] = trees.c[tm]
    haze(cv, None, '#aebdcc', h - 70, h, 3)
    ground_fill(cv, np.full(w, h - 4), '#aebdcc')
    return cv, 0.2
def hills():
    w, h = 960, 170
    cv = Canvas(w, h)
    F = {'lit': '#4c7058', 'dark': '#385546', 'rim': '#628a62'}
    top = h - 70 + wobble(w, 51, 30, ((2, 1), (5, 0.5), (11, 0.2)))
    ground_fill(cv, top + 6, F['dark'])
    firs(cv, top + 8, 420, 8, 22, 53, F, oaks=0.25)
    # a few meadow clearings on the hillsides, lit by the sun
    yy, xx = np.mgrid[0:h, 0:w]
    for i in range(5):
        cx, cy = rnd(55, i) * w, top[int(rnd(55, i) * w) % w] + 22 + rnd(56, i) * 18
        m = (((xx - cx) / (26 + rnd(57, i) * 20)) ** 2 + ((yy - cy) / 7) ** 2 <= 1) & (cv.c != None)
        cv.c[m] = '#6e9460'; cv.c[m & (((xx - cx - 4) / 22) ** 2 + ((yy - cy - 3) / 5) ** 2 <= 1)] = '#5c8456'
    haze(cv, None, '#8aa4a0', h - 45, h, 2)
    ground_fill(cv, np.full(w, h - 3), '#8aa4a0')
    return cv, 0.38
def forest_edge():
    w, h = 960, 130
    cv = Canvas(w, h)
    F = {'lit': '#3e6440', 'dark': '#2a4632', 'rim': '#5a8450'}
    base = h - 22 + wobble(w, 61, 4)
    ground_fill(cv, base, F['dark'])
    firs(cv, base, 70, 30, 100, 63, F, oaks=0.3)
    F2 = {'lit': '#335a38', 'dark': '#22402c', 'rim': '#4c7646'}
    firs(cv, base + 6, 40, 26, 70, 67, F2, oaks=0.4)
    yy, xx = np.mgrid[0:h, 0:w]
    cv.c[(yy >= base[xx] + 4)] = '#22402c'
    return cv, 0.62

def massif():
    """The mountain the hold is cut into, as it rises behind: a broad shoulder, two summits, snow fields, forest
    on its feet."""
    w, h = 1000, 820
    cv = Canvas(w, h)
    P = {'rock_l': '#8f7d88', 'rock_d': '#67596d', 'ridge': '#a8949a', 'snow_l': '#f3f3f8', 'snow_d': '#bdbdd5', 'rim': '#fffaf2'}
    spec = [(600, 760, 420, 380), (300, 640, 300, 260), (850, 560, 220, 260), (110, 420, 230, 200)]
    top = skyline(w, spec, 71, h, 0.06, period=False)
    yy, xx = np.mgrid[0:h, 0:w]
    m = mountain(cv, top, P, 330, 45, 0.42, 71, period=False)
    # forest on the lower flanks
    F = {'lit': '#4e6e5a', 'dark': '#3a5448', 'rim': '#628266'}
    tl = np.maximum(top + 40, h - 190 + wobble(w, 75, 30, ((2, 1), (5, 0.6), (13, 0.3)), period=w))
    trees = Canvas(w, h); firs(trees, tl + 12, 320, 8, 26, 77, F, period=False, oaks=0.15)
    cv.c[m & (yy > tl[xx] + 10)] = F['dark']
    tm = (trees.c != None) & m
    cv.c[tm] = trees.c[tm]
    haze(cv, None, '#9eb2bc', h - 100, h, 3)
    return cv, 0.8

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for name, f, tile, anchor in (('far_peaks', far_peaks, True, None), ('mid_range', mid_range, True, None),
                                  ('hills', hills, True, None), ('forest_edge', forest_edge, True, None),
                                  ('massif', massif, False, (620, None))):
        cv, k = f()
        cv.png(f'{OUT}/{name}.png')
        ax = anchor[0] if anchor else 0
        meta[name] = {'w': cv.w, 'h': cv.h, 'ax': ax, 'ay': cv.h, 'k': k, 'tile': tile}
        print(name, cv.w, cv.h)
    with open(f'{OUT}/backdrop.json', 'w') as fh: json.dump(meta, fh, indent=1)
