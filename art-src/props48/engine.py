# Engine for the props (copy of the dwarf engine on a 96 x 96 canvas; each prop is cropped afterwards): masks from simple shapes, shading from a dome over each mask
# (light from the top left, 5 tones per ramp), each part outlined in the darkest tone of its own ramp.
import numpy as np, math
from PIL import Image
W, H = 96, 96
R = {
 'wood':  ['#2e1a12', '#5a3420', '#8a5530', '#b87a45', '#e0a868'],
 'oak':   ['#24140e', '#43261a', '#6a3f28', '#91603c', '#b8845a'],
 'iron':  ['#1f1d26', '#3d3a48', '#66627a', '#9894aa', '#d2cfdc'],
 'stone': ['#2a2430', '#433a48', '#5f5363', '#7f7181', '#a6979f'],
 'quilt': ['#3e1622', '#6e2633', '#a43e3e', '#d26a4e', '#f0a070'],
 'cream': ['#5e5040', '#8e7c64', '#bfae90', '#e3d6ba', '#fbf2de'],
 'teal':  ['#16343a', '#24585a', '#3e8a80', '#6cbfa6', '#b6ead0'],
 'gold':  ['#4a2a0e', '#8a5616', '#c98d22', '#ecbf44', '#fbe68a'],
 'flame': ['#7a2a12', '#c84a1a', '#f08a2a', '#ffc45a', '#fff2c0'],
 'clay':  ['#3a1e18', '#64352a', '#94553e', '#c07a58', '#e2a684'],
 'moss':  ['#18281e', '#2a4430', '#3f6a42', '#62945a', '#98c07a'],
 'brick': ['#24171a', '#3a2626', '#523632', '#6a4840', '#86604f'],
}
EX = {'white': '#ece4d8', 'iris': '#3d6aa0', 'dark': '#1a1216', 'cheek': '#e08a70'}
yy, xx = np.mgrid[0:H, 0:W]
def ell(cx, cy, rx, ry): return ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1
def poly(pts):
    m = np.zeros((H, W), bool); n = len(pts)
    for y in range(H):
        py = y + 0.5; xs = []
        for i in range(n):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
            if (y1 > py) != (y2 > py): xs.append(x1 + (py - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            for x in range(W):
                if a <= x + 0.5 < b: m[y, x] = True
    return m
def cap(a, b, r):
    (ax, ay), (bx, by) = a, b
    px, py = xx + 0.5 - ax, yy + 0.5 - ay; dx, dy = bx - ax, by - ay
    t = np.clip((px * dx + py * dy) / max(1e-6, dx * dx + dy * dy), 0, 1)
    return (px - t * dx) ** 2 + (py - t * dy) ** 2 <= r * r
def dist_in(m, cap_=7):
    d = np.where(m, cap_, 0).astype(float)
    for _ in range(cap_):
        p = np.pad(d, 1)
        d = np.where(m, np.minimum(d, np.minimum.reduce([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]) + 1), 0)
    return d
LIGHT = np.array([-0.55, -0.7, 0.45]); LIGHT /= np.linalg.norm(LIGHT)
def shade(m, bias=0.0, round_=1.0):
    h = np.sqrt(dist_in(m)) * round_
    hp = np.pad(h, 1, mode='edge')
    gx = (hp[1:-1, 2:] - hp[1:-1, :-2]) / 2; gy = (hp[2:, 1:-1] - hp[:-2, 1:-1]) / 2
    n = np.stack([-gx, -gy, np.ones_like(gx) * 0.9], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    v = n @ LIGHT + bias
    idx = np.full((H, W), 2); idx[v < 0.15] = 1; idx[v >= 0.42] = 3; idx[v >= 0.7] = 4
    return idx
class Part:
    """A layer: colour per pixel (or None), outlined in the darkest tone of its own ramp."""
    def __init__(s): s.c = np.full((H, W), None, object)
    def fill(s, m, ramp, bias=0.0, idx=None, round_=1.0, outline=True):
        if idx is None: idx = shade(m, bias, round_)
        for y, x in zip(*np.nonzero(m)): s.c[y, x] = (ramp, int(idx[y, x]))
        if outline:
            for y, x in zip(*np.nonzero(m)):
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and not m[ny, nx] and s.c[ny, nx] is None: s.c[ny, nx] = (ramp, 0)
        return s
    def px(s, pts, ramp, i):
        for x, y in pts: s.c[y, x] = (ramp, i)
        return s
    def grid(s, x0, y0, rows, keys):
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch in '. ': continue
                s.c[y0 + j, x0 + i] = keys[ch]
        return s
    def shift(s, dx=0, dy=0):
        o = Part()
        for y, x in zip(*np.nonzero(s.c != None)):
            if 0 <= y + dy < H and 0 <= x + dx < W: o.c[y + dy, x + dx] = s.c[y, x]
        return o
    def flip(s):
        o = Part(); o.c = s.c[:, ::-1].copy(); return o
def colour(v):
    ramp, i = v
    return EX[ramp] if ramp in EX else R[ramp][i]
def compose(parts):
    out = np.full((H, W), None, object)
    for p in parts:
        if p is None: continue
        m = p.c != None
        out[m] = p.c[m]
    return out
def sheet(frames, path, scale=1, bg=None):
    rows = len(frames); cols = len(frames[0])
    im = Image.new('RGBA', (W * cols * scale, H * rows * scale), bg or (0, 0, 0, 0)); px = im.load()
    for r, row in enumerate(frames):
        for c, f in enumerate(row):
            for y in range(H):
                for x in range(W):
                    v = f[y, x]
                    if v is None: continue
                    col = colour(v); rgb = tuple(int(col[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
                    for dy in range(scale):
                        for dx in range(scale): px[(c * W + x) * scale + dx, (r * H + y) * scale + dy] = rgb
    im.save(path); return im
