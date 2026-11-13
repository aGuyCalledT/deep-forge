# Block 10: the mine. Everything that sits in rock uses the placeholder ramp 'rockd' (the game swaps it for the
# layer's rock), ore uses 'ingot' (swapped for the ore's colour).
#   mine_pillar, mine_pillar_fg   a support pillar hewn out of the rock, from the ceiling to the floor (40 x 230)
#   mine_fg_rock_0..2             jagged rocks in front of everything, standing on the bottom edge
#   mine_fg_stal_0..1             big stalactites in front, hanging from the top edge
#   mine_spire_0..1               stalagmites at the back wall
#   ore_seam_0..2                 a seam of ore lumps in the wall
#   minecart                      5 frames: empty .. heaped full (ore heap in 'ingot', stones in 'rockd')
#   rail                          tile 96 x 12: rail on sleepers, gravel under it
#   mine_hole                     the way to the lift: a timbered tunnel mouth into the dark (84 x 112)
#   python3 mine.py <out dir>     a preview (mine_x3.png)
import sys, os
from rock import *
from shells import grid, blocks, hsh, voronoi, pick, beam

R['steel'] = ['#1c1b24', '#38364a', '#5e5b72', '#8f8ca4', '#c8c6d6']   # cart and rail iron (iron itself is the ore placeholder)
R['void'] = ['#000000', '#040307', '#09070d', '#0f0c14', '#16121c']

def stone_fill(g, m, seed, tones=(2, 2, 3, 1), shift=0, cw=11, ch=14):
    """Rough rock: Voronoi chunks with dark fissures, shifted darker (fg) or lighter."""
    h, w = m.shape
    ids = voronoi(w, h, cw, ch, seed, wrap=False)
    ids = np.where(m, ids, -1)
    b = blocks(ids, 'rockd', lambda i: tones[hsh(i, seed) % len(tones)], wrap=False)
    for y, x in zip(*np.nonzero(m)):
        t = b[y, x][1] + shift
        g[y, x] = ('rockd', max(0, min(4, t)))
def outline(g, m, tone=0):
    h, w = m.shape
    for y, x in zip(*np.nonzero(m)):
        if y == 0 or x == 0 or y == h - 1 or x == w - 1 or not (m[y - 1, x] and m[y + 1, x] and m[y, x - 1] and m[y, x + 1]):
            g[y, x] = ('rockd', tone)
def side_light(g, m, lit=1, dark=-1, depth=2):
    """The left face catches the light, the right face falls into shadow."""
    h, w = m.shape
    for y in range(h):
        xs = np.nonzero(m[y])[0]
        if not len(xs): continue
        for k in range(depth):
            for x, d in ((xs[0] + 1 + k, lit), (xs[-1] - 1 - k, dark)):
                if xs[0] < x < xs[-1] and g[y, x] is not None and g[y, x][1] > 0:
                    g[y, x] = ('rockd', max(1, min(4, g[y, x][1] + d)))

# ------------------------------------------------------------------ the hewn pillar
PH = 230
def pillar(fg=False):
    w = 40; g = grid(w, PH); m = np.zeros((PH, w), bool)
    for y in range(PH):
        if y < 30:                                   # capital: flares into the ceiling, rough top edge
            hw = 11 + (30 - y) * 0.32 + (hsh(y // 3, 5) % 3 if y < 8 else 0)
        elif y > PH - 22:                            # foot: widens onto the floor
            hw = 11 + (y - (PH - 22)) * 0.3
        else:                                        # shaft: hewn, each course a little off true
            hw = 10 + (hsh((y - 30) // 18, 9) % 3) * 0.5
        hw = min(19.5, hw)
        for x in range(w):
            if abs(x + 0.5 - 20) <= hw: m[y, x] = True
    sh = -1 if fg else 0
    xs_of = lambda y: np.nonzero(m[y])[0]
    for y in range(PH):
        xs = xs_of(y)
        if not len(xs): continue
        a, b = xs[0], xs[-1]
        course = (y - 30) // 18 if 30 <= y <= PH - 22 else -1
        for x in xs:
            u = (x - a) / max(1, b - a)                      # rounded: lit on the left, dark on the right
            t = 4 if u < 0.12 else 3 if u < 0.42 else 2 if u < 0.78 else 1
            if course >= 0 and (y - 30) % 18 == 0: t = max(1, t - 1)        # the joint between hewn courses
            elif course >= 0 and (y - 30) % 18 == 1: t = min(4, t + 1)      # the lit lip under it
            g[y, x] = ('rockd', max(0, min(4, t + sh)))
    # chisel strokes: short slanting cuts, the same way in each course
    for c in range((PH - 52) // 18):
        y0 = 34 + c * 18
        for k in range(4):
            x0 = 12 + (hsh(c, k, 3) % 14); y1 = y0 + 4 + (hsh(c, k, 4) % 10)
            for i in range(3):
                X, Y = x0 + i, y1 - i
                if m[Y, X] and g[Y, X] is not None: g[Y, X] = ('rockd', max(0, g[Y, X][1] - 1))
    # the capital and the foot keep the rough rock they were cut from
    rough = m.copy(); rough[30:PH - 22] = False
    tmp = grid(w, PH); stone_fill(tmp, rough, 41 if fg else 17, shift=sh, cw=9, ch=9)
    for y, x in zip(*np.nonzero(rough)): g[y, x] = tmp[y, x]
    for y in (29, PH - 22):                          # the ledges
        for x in range(w):
            if m[y, x]: g[y, x] = ('rockd', 3 + sh)
            if m[y + 1, x]: g[y + 1, x] = ('rockd', 1 + sh if sh else 1)
    outline(g, m)
    return {'grid': g, 'anchor': (20, PH - 1)}

# ------------------------------------------------------------------ rocks in front (dark) and at the back
def jag(w, h, seed, peaks, from_top=False):
    m = np.zeros((h, w), bool)
    hs = []
    for x in range(w):
        u = x / (w - 1)
        base = math.sin(math.pi * u) ** 0.7
        v = base * h * (0.55 + 0.45 * abs(math.sin(u * math.pi * peaks + seed)))
        v += (hsh(x // 3, seed) % 5) - 2
        hs.append(max(2, min(h, v)))
    for x, v in enumerate(hs):
        for y in range(int(round(v))):
            m[(y if from_top else h - 1 - y), x] = True
    return m
def fg_rock(seed, w, h, peaks):
    m = jag(w, h, seed, peaks)
    g = grid(w, h)
    stone_fill(g, m, 60 + seed, tones=(1, 1, 2, 1), shift=-1, cw=13, ch=11)
    for x in range(w):                               # a thin lit rim on the top edge: torchlight behind
        ys = np.nonzero(m[:, x])[0]
        if len(ys): g[ys[0], x] = ('rockd', 2);
        if len(ys) > 1: g[ys[1], x] = ('rockd', 1)
    return {'grid': g, 'anchor': (w // 2, h - 1)}
def fg_stal(seed, w, h, n):
    m = np.zeros((h, w), bool)
    for k in range(n):
        x = 6 + (hsh(seed, k) % (w - 12)); L = h * (0.35 + (hsh(seed, k, 1) % 65) / 100); r = 3 + hsh(seed, k, 2) % 6
        for y in range(int(L)):
            hw = r * (1 - y / L) ** 0.8
            for xx_ in range(int(x - hw), int(x + hw) + 1):
                if 0 <= xx_ < w: m[y, xx_] = True
    m[:6, :] = True                                  # the rock they hang from
    g = grid(w, h)
    stone_fill(g, m, 80 + seed, tones=(1, 1, 2), shift=-1, cw=9, ch=16)
    side_light(g, m, 1, -1, 1)
    return {'grid': g, 'anchor': (w // 2, 0)}
def spire(seed, w, h):
    m = np.zeros((h, w), bool)
    for y in range(h):
        u = y / (h - 1)                              # 0 at the tip
        hw = (w / 2 - 1) * u ** 0.9 + 1 + (hsh(y // 4, seed) % 2)
        for x in range(w):
            if abs(x + 0.5 - w / 2) <= hw: m[y, x] = True
    g = grid(w, h)
    stone_fill(g, m, 90 + seed, cw=8, ch=13)
    side_light(g, m, 1, -1, 2)
    outline(g, m)
    if seed == 0: g[1, w // 2] = ('water', 4)
    return {'grid': g, 'anchor': (w // 2, h - 1)}

# ------------------------------------------------------------------ ore in the wall
def ore_seam(seed):
    w, h = 60, 34
    g = grid(w, h)
    pocket = np.zeros((h, w), bool)
    for k in range(5):
        cx = 10 + hsh(seed, k) % 40; cy = 9 + hsh(seed, k, 1) % 16
        for y in range(h):
            for x in range(w):
                if ((x - cx) / 7.5) ** 2 + ((y - cy) / 5.0) ** 2 <= 1: pocket[y, x] = True
    for y, x in zip(*np.nonzero(pocket)): g[y, x] = ('rockd', 1)              # the darker, broken rock round it
    for k in range(16):
        pts = list(zip(*np.nonzero(pocket)))
        y, x = pts[hsh(seed, k, 7) % len(pts)]
        r = 1 + hsh(seed, k, 8) % 3 + (k < 3)
        for dy in range(-r, r + 1):
            for dx in range(-r - 1, r + 2):
                if abs(dx) / (r + 1.2) + abs(dy) / (r + 0.6) <= 1 and 0 <= y + dy < h and 0 <= x + dx < w:
                    t = 4 if (dy, dx) == (-r // 2, -1) else 3 if dy < 0 and dx <= 0 else 2 if dy <= 0 else 1
                    g[y + dy, x + dx] = ('ingot', t)
        if 0 <= y + r + 1 < h: g[y + r + 1, x] = ('rockd', 0)
    return {'grid': g, 'anchor': (w // 2, h // 2)}

# ------------------------------------------------------------------ the cart and its rails
def minecart(frame=0):
    """A plank cart on iron wheels. frame 0 empty .. 4 heaped above the rim."""
    w, h = 46, 40
    g = grid(w, h)
    top, bot = 18, 33                                 # the box: rim at row 18, floor at 33
    for y in range(top, bot + 1):
        inset = (y - top) * 0.22
        for x in range(int(3 + inset), int(w - 3 - inset)):
            board = (y - top) // 4
            t = 3 if (y - top) % 4 == 0 else 2 if board % 2 else 1
            g[y, x] = ('wood', t)
    for x in range(2, w - 2): g[top, x] = ('steel', 3); g[top + 1, x] = ('steel', 1)                  # iron rim
    for y in range(top, bot + 1):                                                                    # iron corners
        inset = int((y - top) * 0.22)
        for x in (3 + inset, 4 + inset, w - 5 - inset, w - 4 - inset): g[y, x] = ('steel', 2 if x < w // 2 else 1)
    for x in range(8, w - 8): g[bot, x] = ('steel', 1)
    for (yb) in (top + 7,):
        for x in range(6, w - 6): g[yb, x] = ('steel', 2)
        g[yb, 10] = ('steel', 4); g[yb, w - 11] = ('steel', 4)
    for cx in (12, w - 13):                                                                          # wheels
        for y in range(bot - 3, h):
            for x in range(cx - 6, cx + 7):
                d = math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - (bot + 2.5))
                if d <= 5.6: g[y, x] = ('steel', 0 if d > 4.6 else 2 if d > 2 else 3 if d > 1 else 4)
    # the load: a heap of ore lumps and broken stone over the rim
    rise = [0, 3, 6, 9, 12][frame % 5]
    if rise:
        heap = np.zeros((h, w), bool)
        for x in range(4, w - 4):
            u = (x - 4) / (w - 9)
            hgt = rise * (1 - (2 * u - 1) ** 2) ** 0.6
            for y in range(int(top - hgt), top): heap[y, x] = True
        ids = voronoi(w, h, 4, 3, 30 + frame, wrap=False)       # lumps of 3-4 px
        for y, x in zip(*np.nonzero(heap)):
            i = ids[y, x]
            lit = y == 0 or not heap[y - 1, x] or ids[y - 1, x] != i
            dark = y + 1 >= h or ids[y + 1, x] != i or ids[y, min(w - 1, x + 1)] != i
            t = 4 if lit and hsh(i, 1) % 3 == 0 else 3 if lit else 1 if dark else 2
            g[y, x] = ('ingot', t) if hsh(i, 5) % 4 else ('rockd', t)
    return {'grid': g, 'anchor': (w // 2, h - 1)}
def rail():
    w, h = 96, 12
    g = grid(w, h)
    for x in range(w):
        for y in range(6, h):                         # gravel bed
            g[y, x] = ('rockd', 1 + (hsh(x, y, 3) % 3 == 0))
    for x0 in range(2, w, 16):                        # sleeper ends
        for x in range(x0, x0 + 10):
            for y in range(3, 7): g[y, x] = ('wood', 3 if y == 3 else 1 if y == 6 else 2)
        g[3, x0] = ('wood', 1); g[3, x0 + 9] = ('wood', 1)
    for x in range(w):                                # the rail
        g[0, x] = ('steel', 4); g[1, x] = ('steel', 3); g[2, x] = ('steel', 1)
    for x0 in range(5, w, 16): g[1, x0] = ('steel', 4); g[1, x0 + 3] = ('steel', 4)   # spikes
    return g
def mine_hole():
    """Timber frame round a tunnel mouth; the rails run into the dark."""
    w, h = 84, 112
    g = grid(w, h)
    for y in range(h):                                 # the dark, deeper towards the middle
        for x in range(10, w - 10):
            d = min(x - 10, w - 11 - x, y - 12)
            if y >= 12: g[y, x] = ('void', 0 if d > 9 else 1 if d > 5 else 2 if d > 2 else 3)
    for y in range(h):                                 # rough rock lip round the frame
        for x in list(range(4, 10)) + list(range(w - 10, w - 4)):
            if hsh(x, y // 4, 2) % 5: g[y, x] = ('rockd', 1 + (x < w // 2))
    for x in range(4, w - 4):
        for y in range(4, 12):
            if hsh(x // 4, y, 6) % 5: g[y, x] = ('rockd', 2)
    beam(g, 8, 10, 15, h - 1, horiz=False); beam(g, w - 16, 10, w - 9, h - 1, horiz=False)
    beam(g, 3, 6, w - 4, 15, horiz=True)
    for x in (10, w - 13): g[11, x] = ('steel', 4); g[12, x] = ('steel', 2)
    for y in range(h - 12, h):                         # rails going in, fading
        pass
    for x in range(16, w - 16):
        g[h - 12, x] = ('steel', 2 if 24 < x < w - 24 else 3); g[h - 11, x] = ('steel', 0)
    return {'grid': g, 'anchor': (w // 2, h - 1)}

MINE = {'mine_pillar': lambda: pillar(False), 'mine_pillar_fg': lambda: pillar(True),
        'mine_fg_rock_0': lambda: fg_rock(1, 110, 56, 2.2), 'mine_fg_rock_1': lambda: fg_rock(2, 76, 40, 1.4),
        'mine_fg_rock_2': lambda: fg_rock(3, 140, 70, 3.1),
        'mine_fg_stal_0': lambda: fg_stal(1, 90, 84, 5), 'mine_fg_stal_1': lambda: fg_stal(2, 60, 60, 4),
        'mine_spire_0': lambda: spire(0, 22, 70), 'mine_spire_1': lambda: spire(1, 30, 104),
        'ore_seam_0': lambda: ore_seam(0), 'ore_seam_1': lambda: ore_seam(1), 'ore_seam_2': lambda: ore_seam(2),
        'mine_hole': mine_hole}

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else 'preview'
    os.makedirs(out, exist_ok=True)
    W_, H_ = 640, 300
    cv = np.full((H_, W_), '#000000', object); em = np.zeros(cv.shape, bool)
    t = rock_tile(1)
    for y0 in range(0, H_, RH): blit(cv, em, t[:min(RH, H_ - y0)][:, np.arange(W_) % 96], 0, y0)
    D = {'rockd': 'd1'}
    K = {k: f() for k, f in MINE.items()}
    put(cv, em, recolour(K['mine_hole'], D), 60, 262)
    put(cv, em, recolour(K['mine_spire_1'], D), 200, 262); put(cv, em, recolour(K['mine_spire_0'], D), 520, 262)
    for i in range(3): put(cv, em, recolour(K[f'ore_seam_{i}'], {**D, 'ingot': ['copper', 'iron', 'gold'][i]}), 300 + i * 90, 120 + i * 20)
    put(cv, em, recolour(K['mine_pillar'], D), 160, 262); put(cv, em, recolour(K['mine_pillar'], D), 460, 262)
    rl = recolour({'grid': rail(), 'anchor': (0, 0)}, D)['grid']
    blit(cv, em, rl[:, np.arange(W_) % 96], 0, 262)
    for f in range(5): put(cv, em, recolour(minecart(f), {**D, 'ingot': 'copper'}), 230 + f * 52, 262)
    put(cv, em, recolour(K['mine_pillar_fg'], D), 600, 262)
    put(cv, em, recolour(K['mine_fg_rock_0'], D), 120, 299); put(cv, em, recolour(K['mine_fg_rock_2'], D), 420, 299)
    put(cv, em, recolour(K['mine_fg_stal_0'], D), 330, 0); put(cv, em, recolour(K['mine_fg_stal_1'], D), 560, 0)
    im = light(cv, em, [(140, 200, 160, 0.8), (440, 200, 160, 0.8)], ambient=0.45)
    im.resize((W_ * 2, H_ * 2), Image.NEAREST).save(f'{out}/mine_x2.png')
