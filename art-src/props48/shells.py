# Block 1: room shells and ways, in the scale of the 48 x 64 dwarves (cell 48 px, room 144 px high, floor at y 135).
#   walls   96 x 144, repeat sideways (period 96)  rock, brick, ashlar, panel
#   floors  96 x 9 from y 135, repeat sideways      planks, flags, earth
#   vault   48 x 48 corner (left; mirror for right)
#   ways    hallway 48 x 144, stairwell 96 x 144, shaft 48 x 144 (repeats down), tunnel mouth 96 x 144
#   props   post and column 0..134 high
# Every grid holds (ramp, tone) or None, the same as props.py. One helper shades all masonry and boards:
# blocks() takes a map of block ids and gives each block a joint on its right and bottom edge, a lit top/left rim
# and a shaded bottom/right rim (light from the top left).
#   python3 shells.py <out dir>
import sys, os, math
import numpy as np
from PIL import Image
from engine import R, EX
from props import PROPS

R['rock'] = ['#1a1419', '#2f242b', '#46363c', '#5e4a4c', '#7c6460']     # warm plum-brown rock
R['sand'] = ['#2a1f22', '#4d3b37', '#75604f', '#9c8366', '#c6aa82']     # dressed sandstone
CELL, RH, FLOOR = 48, 144, 135
EMIT = {'flame'}                                    # ramps that glow: the light pass leaves them as they are

def hsh(*a):
    v = 2166136261
    for x in a: v = ((v ^ (int(x) & 0xffffffff)) * 16777619) & 0xffffffff
    return v
def grid(w, h): return np.full((h, w), None, object)

def blocks(ids, ramp, base, joint=0, wrap=True, rim=True):
    """ids: int array (-1 = empty). base(id) -> tone. Joint pixel where the right or lower neighbour is another block."""
    h, w = ids.shape
    def nb(dy, dx):
        if wrap: return np.roll(np.roll(ids, -dy, 0), -dx, 1)
        out = np.full_like(ids, -1)
        ys, ye = max(0, dy), h + min(0, dy); xs, xe = max(0, dx), w + min(0, dx)
        out[ys - dy:ye - dy, xs - dx:xe - dx] = ids[ys:ye, xs:xe]
        return out
    r, d, l, u = nb(0, 1), nb(1, 0), nb(0, -1), nb(-1, 0)
    if wrap: d[-1] = ids[-1]; u[0] = ids[0]             # no joint across the top/bottom of a tile
    jnt = (ids >= 0) & ((r != ids) | (d != ids))
    g = grid(w, h)
    for y, x in zip(*np.nonzero(ids >= 0)):
        if jnt[y, x]: g[y, x] = (ramp, joint); continue
        t = base(ids[y, x])
        if rim:
            if u[y, x] != ids[y, x] or l[y, x] != ids[y, x]: t += 1
            elif (r[y, x] != ids[y, x] and r[y, x] >= 0) or (d[y, x] != ids[y, x] and d[y, x] >= 0): t -= 1
            # one pixel in from a joint below/right reads as the block's shaded face
            if y + 2 < h and ids[y + 1, x] == ids[y, x] and jnt[y + 1, x] and d[y + 1, x] != ids[y, x]: t -= 1
        g[y, x] = (ramp, max(0, min(4, t)))
    return g

def pick(*tones): return lambda i: tones[hsh(i, 7) % len(tones)]

# ------------------------------------------------------------------ walls (96 x 144, period 96)
def voronoi(w, h, cw, ch, seed, wrap=True):
    pts = []
    for gy in range(-1, h // ch + 2):
        for gx in range(w // cw):
            k = hsh(gx, gy, seed)
            pts.append((gx * cw + (k % 997) / 997 * cw, gy * ch + (k // 997 % 991) / 991 * ch + (gx % 2) * ch / 2))
    P = np.array(pts)
    yy, xx = np.mgrid[0:h, 0:w]
    dx = np.abs(xx[..., None] + 0.5 - P[:, 0])
    if wrap: dx = np.minimum(dx, w - dx)
    dy = (yy[..., None] + 0.5 - P[:, 1]) * 1.25          # stones a little wider than tall
    return np.argmin(dx * dx + dy * dy, axis=2)
def wall_rock(dark=0, w=96, h=RH, seed=3):
    ids = voronoi(w, h, 16, 13, seed)
    return blocks(ids, 'rock', lambda i: pick(2, 2, 2, 3, 1)(i) - dark)
def wall_brick():
    yy, xx = np.mgrid[0:RH, 0:96]
    course = yy // 9
    ids = course * 100 + (xx + (course % 2) * 12) % 96 // 24
    return blocks(ids, 'brick', pick(2, 2, 3), joint=1)
def wall_ashlar():
    yy, xx = np.mgrid[0:RH, 0:96]
    course = yy // 18
    ids = course * 100 + (xx + (course % 2) * 16) % 96 // 32
    g = blocks(ids, 'sand', pick(2, 2, 3))
    for c in range(RH // 18):                        # a chipped corner here and there, where a mason's blow went wide
        for b in range(3):
            if hsh(c, b, 11) % 4: continue
            x0 = (b * 32 - (c % 2) * 16 + 30) % 96; y0 = c * 18 + 15
            for dx, dy in ((0, 0), (-1, 0), (0, -1)): g[y0 + dy, (x0 + dx) % 96] = ('sand', 1)
    return g
def wall_panel():
    yy, xx = np.mgrid[0:RH, 0:96]
    rail = (yy >= 76) & (yy <= 81)
    ids = np.where(rail, 999, np.where(yy < 76, 500 + xx // 12, xx // 8))
    ids[yy >= 133] = 998                                       # skirting board
    g = blocks(ids, 'oak', lambda i: 3 if i in (998, 999) else pick(2, 2, 3)(i))
    for y in range(RH):
        for x in range(96):
            v = g[y, x]
            if v is None or ids[y, x] >= 998 or v[1] != 2: continue
            if hsh(x, y // 5, ids[y, x]) % 37 == 0: g[y, x] = ('oak', 1)          # grain along the board
    for x in range(4, 96, 8):                                                     # nails into the rail and skirting
        g[78, x] = ('iron', 3); g[135 - 1, x] = None if False else g[134, x]
    for x in range(5, 96, 12): g[3, x] = ('iron', 3); g[72, x] = ('iron', 3)
    return g

# ------------------------------------------------------------------ floors (96 x 9)
def floor_planks():
    yy, xx = np.mgrid[0:9, 0:96]
    row = yy // 3
    ids = row * 100 + (xx + row * 17) % 96 // 32
    g = blocks(ids, 'wood', lambda i: 3 if i < 100 else 2 if i < 200 else 1)
    g[0, :] = [('wood', 4)] * 96
    return g
def floor_flags():
    yy, xx = np.mgrid[0:9, 0:96]
    row = (yy >= 4).astype(int)
    edges = [0, 14, 32, 44, 62, 78, 96]
    ids = row * 100 + np.searchsorted(edges, (xx + row * 9) % 96, side='right')
    g = blocks(ids, 'sand', lambda i: pick(2, 3)(i) - (1 if i >= 100 else 0))
    g[0, :] = [('sand', 4)] * 96
    return g
def floor_earth():
    g = grid(96, 9)
    for y in range(9):
        for x in range(96): g[y, x] = ('clay', 3 if y == 0 else 2 if y < 4 else 1)
    for x in range(96):                                     # a few pebbles trodden into the dirt
        k = hsh(x, 5)
        if k % 13 == 0:
            y = 2 + k // 13 % 6
            g[y, x] = ('sand', 3); g[min(8, y + 1), x] = ('clay', 0)
    return g

# ------------------------------------------------------------------ vault corner (48 x 48, left; mirror for right)
def vault(r=34):
    rock = wall_rock(dark=1, w=96, h=48, seed=9)
    g = grid(48, 48)
    for y in range(48):
        for x in range(48):
            d = math.hypot(x + 0.5 - r, y + 0.5 - r) if (x < r and y < r) else 0
            if d > r + 1.2: g[y, x] = rock[y, x]
            elif d > r: g[y, x] = ('rock', 0)
            elif d > r - 1: g[y, x] = ('rock', 1)              # soot-dark lip just under the rock
    return g

# ------------------------------------------------------------------ ways
def beam(g, x0, y0, x1, y1, ramp='oak', horiz=True):
    """A squared timber: lit top (or left) edge, dark bottom (or right) edge, grain marks."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if horiz: t = 4 if y == y0 else 1 if y == y1 else 3 if y == y0 + 1 else 2
            else: t = 3 if x == x0 else 1 if x == x1 else 2
            if t == 2 and hsh(x // (7 if horiz else 1), y // (1 if horiz else 7), x0) % 9 == 0: t = 1
            g[y, x] = (ramp, t)
def floor_into(g, f, x0=0):
    for y in range(9):
        for x in range(g.shape[1]): g[FLOOR + y, x] = f[y, (x + x0) % 96]
def hallway():
    g = grid(CELL, RH)
    rock = wall_rock(dark=1)
    g[:, :] = rock[:, :CELL]
    for y in range(28, FLOOR):                          # deeper rock between the posts
        for x in range(8, 40):
            v = g[y, x]; g[y, x] = (v[0], max(0, v[1] - 1))
    beam(g, 3, 34, 8, FLOOR - 1, horiz=False); beam(g, 39, 34, 44, FLOOR - 1, horiz=False)
    beam(g, 0, 27, 47, 33)
    for (xa, sgn) in ((9, 1), (38, -1)):                # corner braces
        for i in range(7):
            for t in range(3): g[34 + i + t - 1, xa + sgn * i] = ('oak', 3 if t == 0 else 1 if t == 2 else 2)
    for x in (5, 41): g[30, x] = ('iron', 4); g[30, x + 1] = ('iron', 1)
    floor_into(g, floor_planks())
    return g
def stairwell():
    g = grid(96, RH)
    cx, cy, r, rr = 48, 66, 34, 40
    for y in range(RH):
        for x in range(96):
            inside = (abs(x + 0.5 - cx) <= r and y >= cy) or math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r
            if inside and y < FLOOR: g[y, x] = ('rock', 0)
    # steps rising to the left, fading into the dark
    for x in range(cx - r, cx + r):
        k = (cx + r - 1 - x) // 7
        top = FLOOR - 6 * (k + 1)
        for y in range(max(0, top), FLOOR):
            if g[y, x] is None: continue
            fade = max(0, (FLOOR - y) // 24)
            t = 3 if y == top else 2 if y < top + 5 and (cx + r - 1 - x) % 7 != 6 else 1
            g[y, x] = ('sand', t - fade) if t - fade > 0 else ('rock', 1)
    ids = np.full((RH, 96), -1)
    for y in range(RH):
        for x in range(96):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if y < cy and r < d <= rr:
                a = math.atan2(cy - y - 0.5, x + 0.5 - cx)                  # 0 right .. pi left
                ids[y, x] = 50 + int((a + math.pi / 18) / (math.pi / 9))    # voussoirs, keystone at the top
            elif y >= cy and y < FLOOR and r < abs(x + 0.5 - cx) <= rr - 0.5:
                ids[y, x] = (x > cx) * 20 + (y - cy) // 12
    rim = blocks(ids, 'sand', lambda i: 3 if i == 54 else pick(2, 2, 3)(i), wrap=False)
    for y, x in zip(*np.nonzero(ids >= 0)): g[y, x] = rim[y, x]
    for y in range(RH):                                                  # outline round the stone ring
        for x in range(96):
            if g[y, x] is None and y < FLOOR and any(0 <= y + dy < RH and 0 <= x + dx < 96 and ids[y + dy, x + dx] >= 0
                                                     for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))):
                g[y, x] = ('sand', 0)
    floor_into(g, floor_flags())
    return g
def shaft():
    g = grid(CELL, RH)
    ids = voronoi(CELL, RH, 16, 13, 21)
    rock = blocks(ids, 'rock', lambda i: pick(1, 1, 2)(i) - 0)
    g[:, :] = rock
    for y in range(RH):                                   # the deep middle of the shaft is darker
        for x in range(10, 38):
            v = g[y, x]; g[y, x] = (v[0], max(0, v[1] - 1))
    for y0 in (0, 72): beam(g, 0, y0, 47, y0 + 5)          # cribbing beams
    for x in (13, 31):                                     # ladder rails
        for y in range(RH): g[y, x] = ('wood', 3); g[y, x + 1] = ('wood', 1)
    for y in range(4, RH, 9):
        for x in range(15, 31): g[y, x] = ('wood', 4 if y % 2 else 3); g[y + 1, x] = ('wood', 1)
    for y in range(RH):                                    # rope: twisted strands
        g[y, 39] = ('cream', 3 if y % 3 == 0 else 2); g[y, 40] = ('cream', 1 if y % 3 == 2 else 2)
    return g
def tunnel():
    g = grid(96, RH)
    ids = voronoi(96, RH, 18, 14, 33)
    face = blocks(ids, 'rock', pick(3, 3, 2, 4))          # outer rock face, lit by the sky
    g[:, :] = face
    for y in range(44, FLOOR):                            # the mouth: dark, a little light on the floor near the opening
        for x in range(24, 72):
            corner = y < 50 and (min(x - 24, 71 - x) < 50 - y)
            if not corner: g[y, x] = ('rock', 0 if y < FLOOR - 6 else 1)
    beam(g, 18, 44, 23, FLOOR - 1, horiz=False); beam(g, 72, 44, 77, FLOOR - 1, horiz=False)
    beam(g, 12, 37, 83, 44, ramp='wood')
    for (xa, sgn) in ((24, 1), (71, -1)):
        for i in range(8):
            for t in range(3): g[45 + i + t - 1, xa + sgn * i] = ('wood', 3 if t == 0 else 1 if t == 2 else 2)
    for x in (16, 20, 75, 79): g[40, x] = ('iron', 4); g[41, x] = ('iron', 1)
    for x in range(14, 82):                               # moss where rain collects on the lintel
        k = hsh(x, 77)
        if k % 3: g[36, x] = ('moss', 3 if k % 5 else 4)
        if k % 7 == 0: g[35, x] = ('moss', 2)
    floor_into(g, floor_earth())
    return g

# ------------------------------------------------------------------ pillars (stand from the ceiling to the floor)
def post():
    g = grid(20, FLOOR)
    beam(g, 6, 0, 13, FLOOR - 1, horiz=False)
    for y, (a, b) in enumerate([(0, 19), (0, 19), (1, 18), (2, 17), (3, 16), (4, 15)]):   # corbel
        for x in range(a, b + 1): g[y, x] = ('oak', 4 if y == 0 else 1 if x in (a, b) or y == 5 else 3 if y == 1 else 2)
    for yb in (40, 104):
        for x in range(6, 14): g[yb, x] = ('iron', 3); g[yb + 1, x] = ('iron', 1)
        g[yb, 9] = ('iron', 4)
    return {'grid': g, 'anchor': (10, FLOOR)}
def column():
    g = grid(20, FLOOR)
    ids = np.full((FLOOR, 20), -1)
    for y in range(FLOOR):
        for x in range(20):
            if y < 6 or y >= FLOOR - 7: ids[y, x] = 900 + (y >= 6)            # capital and plinth
            elif 4 <= x <= 15: ids[y, x] = (y - 6) // 16
    rim = blocks(ids, 'sand', lambda i: 3 if i >= 900 else pick(2, 2, 3)(i), wrap=False)
    for y, x in zip(*np.nonzero(ids >= 0)): g[y, x] = rim[y, x]
    for y in range(6, FLOOR - 7): g[y, 4] = ('sand', 4) if g[y, 4][1] > 0 else g[y, 4]; g[y, 15] = ('sand', 1)
    return {'grid': g, 'anchor': (10, FLOOR)}

TILES = {'wall_rock': wall_rock, 'wall_brick': wall_brick, 'wall_ashlar': wall_ashlar, 'wall_panel': wall_panel,
         'floor_planks': floor_planks, 'floor_flags': floor_flags, 'floor_earth': floor_earth, 'vault': vault,
         'hallway': hallway, 'stairwell': stairwell, 'shaft': shaft, 'tunnel': tunnel}
SPRITES = {'post': post, 'column': column}

# ------------------------------------------------------------------ previews
def col(v):
    if isinstance(v, str): return v
    rp, i = v
    return EX[rp] if rp in EX else R[rp][i]
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def blit(canvas, emit, g, x, y, flip=False):
    h, w = g.shape
    for j in range(h):
        for i in range(w):
            v = g[j, w - 1 - i if flip else i]
            if v is None: continue
            X, Y = x + i, y + j
            if 0 <= X < canvas.shape[1] and 0 <= Y < canvas.shape[0]:
                canvas[Y, X] = v; emit[Y, X] = not isinstance(v, str) and v[0] in EMIT
def put(canvas, emit, p, x, y, flip=False):
    ax, ay = p['anchor']; blit(canvas, emit, p['grid'], x - (p['grid'].shape[1] - 1 - ax if flip else ax), y - ay, flip)
def dwarf(canvas, emit, name, x, y, flip=False):
    im = Image.open(f'dwarves/{name}.png').convert('RGBA')
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    for j in range(im.height):
        for i in range(im.width):
            p = im.getpixel((i, j))
            if p[3]: X, Y = x - 24 + i, y - 62 + j; canvas[Y, X] = '#%02x%02x%02x' % p[:3]; emit[Y, X] = False
def room(canvas, emit, x0, y0, cells, wall, floor):
    w = cells * CELL
    blit(canvas, emit, wall[:, (np.arange(w) + x0) % 96], x0, y0)
    for x in range(w):                                    # shadow where wall meets floor
        v = canvas[y0 + FLOOR - 1, x0 + x]
        if not isinstance(v, str): canvas[y0 + FLOOR - 1, x0 + x] = (v[0], max(0, v[1] - 1))
    blit(canvas, emit, floor[:, (np.arange(w) + x0) % 96], x0, y0 + FLOOR)
    v = TILES['vault']()
    blit(canvas, emit, v, x0, y0); blit(canvas, emit, v, x0 + w - 48, y0, flip=True)
def light(canvas, emit, lights, ambient=0.42):
    h, w = canvas.shape
    yy, xx = np.mgrid[0:h, 0:w]
    L = np.full((h, w), ambient)
    for (lx, ly, r, k) in lights:
        d = np.hypot(xx - lx, (yy - ly) * 1.1)
        L += k * np.clip(1 - d / r, 0, 1) ** 1.4
    L = np.minimum(1.25, np.round(L / 0.1) * 0.1)
    out = Image.new('RGB', (w, h)); px = out.load()
    for y in range(h):
        for x in range(w):
            r_, g_, b_ = rgb(col(canvas[y, x]))
            if emit[y, x]: px[x, y] = (r_, g_, b_); continue
            l = L[y, x]; warm = min(1, max(0, l - ambient) * 1.4)          # lit areas lean gold, shadows lean plum
            px[x, y] = (min(255, int(r_ * l * (1.0 + 0.30 * warm))), min(255, int(g_ * l * (0.96 + 0.10 * warm))),
                        min(255, int(b_ * l * (1.02 - 0.30 * warm + 0.06 * (1 - warm)))))
    return out

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'preview'
    os.makedirs(out, exist_ok=True)
    T = {k: f() for k, f in TILES.items()}; S = {k: f() for k, f in SPRITES.items()}
    P = {k: f() for k, f in PROPS.items()}

    # sheet: every piece unlit, on a dark ground
    order = ['wall_rock', 'wall_brick', 'wall_ashlar', 'wall_panel', 'hallway', 'stairwell', 'shaft', 'tunnel']
    sw = sum(T[k].shape[1] + 8 for k in order) + 2 * 28 + 8
    sheet = np.full((RH + 70, sw), '#241c22', object); se = np.zeros(sheet.shape, bool)
    x = 8
    for k in order: blit(sheet, se, T[k], x, 8); x += T[k].shape[1] + 8
    for k in ('post', 'column'): put(sheet, se, S[k], x + 10, 8 + FLOOR); x += 28
    x = 8
    for k in ('floor_planks', 'floor_flags', 'floor_earth'): blit(sheet, se, T[k], x, RH + 20); x += 104
    blit(sheet, se, T['vault'], x, RH + 16)
    im = Image.new('RGB', (sw, sheet.shape[0])); px = im.load()
    for yy_ in range(sheet.shape[0]):
        for xx_ in range(sw): px[xx_, yy_] = rgb(col(sheet[yy_, xx_]))
    im.resize((sw * 2, im.height * 2), Image.NEAREST).save(f'{out}/shells_x2.png')

    # two floors of a hold: shaft | hallway | room | stairwell | room | hallway
    cells = [('shaft', 1), ('hall', 1), ('roomA', 5), ('stair', 2), ('roomB', 4), ('hall', 1)]
    W_ = sum(c for _, c in cells) * CELL
    cv = np.full((RH * 2, W_), '#000000', object); em = np.zeros(cv.shape, bool)
    lights = []
    for fl, (wa, fa, wb, fb) in enumerate((('wall_brick', 'floor_planks', 'wall_panel', 'floor_flags'),
                                           ('wall_rock', 'floor_earth', 'wall_ashlar', 'floor_flags'))):
        y0 = fl * RH; x = 0
        for kind, n in cells:
            if kind == 'shaft': blit(cv, em, T['shaft'][:, :], x, y0)
            elif kind == 'hall':
                blit(cv, em, T['hallway'], x, y0); put(cv, em, P['lantern'], x + 24, y0 + 34); lights.append((x + 24, y0 + 64, 60, 0.5))
            elif kind == 'stair':
                blit(cv, em, T['wall_ashlar'][:, :96], x, y0); blit(cv, em, T['stairwell'], x, y0)
                put(cv, em, P['torch'], x + 4, y0 + 96); lights.append((x + 4, y0 + 80, 70, 0.6))
            else:
                wall, floor = (T[wa], T[fa]) if kind == 'roomA' else (T[wb], T[fb])
                room(cv, em, x, y0, n, wall, floor)
                w = n * CELL; F = y0 + FLOOR
                if kind == 'roomA' and fl == 0:       # tavern
                    put(cv, em, P['torch'], x + 40, y0 + 92); put(cv, em, P['torch'], x + w - 40, y0 + 92)
                    lights += [(x + 40, y0 + 76, 120, 0.9), (x + w - 40, y0 + 76, 120, 0.9)]
                    put(cv, em, P['shelf'], x + 76, y0 + 96)
                    put(cv, em, P['table'], x + 140, F); put(cv, em, P['bench'], x + 100, F)
                    put(cv, em, P['mug'], x + 128, F - 21); put(cv, em, P['candle'], x + 144, F - 21)
                    lights.append((x + 144, F - 30, 40, 0.4))
                    dwarf(cv, em, 'd_stand', x + 190, F, flip=True)
                    put(cv, em, P['barrel'], x + w - 20, F)
                elif kind == 'roomB' and fl == 0:     # snug with panelling and posts
                    put(cv, em, S['post'], x + 50, F); put(cv, em, S['post'], x + w - 50, F)
                    put(cv, em, P['lantern'], x + w // 2, y0 + 20); lights.append((x + w // 2, y0 + 46, 100, 0.8))
                    put(cv, em, P['bed'], x + 110, F); put(cv, em, P['chair'], x + 160, F)
                    dwarf(cv, em, 'd_side', x + 80, F)
                elif kind == 'roomA':                 # rock store
                    put(cv, em, P['torch'], x + 60, y0 + 92); lights.append((x + 60, y0 + 76, 120, 0.85))
                    for k_, dx in (('crate', 100), ('crate', 124), ('barrel', 112)):
                        put(cv, em, P[k_], x + dx, F - (18 if k_ == 'barrel' else 0))
                    put(cv, em, P['barrel'], x + 150, F); put(cv, em, P['crate'], x + 190, F)
                    dwarf(cv, em, 'd_stand', x + 160, F)
                else:                                 # stone hall with columns
                    put(cv, em, S['column'], x + 40, F); put(cv, em, S['column'], x + w - 40, F)
                    put(cv, em, P['torch'], x + w // 2, y0 + 92); lights.append((x + w // 2, y0 + 76, 120, 0.9))
                    put(cv, em, P['table'], x + w // 2, F); put(cv, em, P['stool'], x + w // 2 - 32, F)
                    dwarf(cv, em, 'd_sit', x + w // 2 + 6, F)
            x += n * CELL
    hold = light(cv, em, lights)
    hold.resize((W_ * 2, RH * 4), Image.NEAREST).save(f'{out}/hold_x2.png')

    # the tunnel mouth from outside, under a daylight ambient
    tv = np.full((RH, 96), '#000000', object); te = np.zeros(tv.shape, bool)
    blit(tv, te, T['tunnel'], 0, 0); put(tv, te, P['lantern'], 48, 45)
    light(tv, te, [(48, 72, 50, 0.4)], ambient=0.95).resize((96 * 3, RH * 3), Image.NEAREST).save(f'{out}/tunnel_x3.png')
    print('ok')
