# Block 6: rock, caves, mining. Rock comes in one ramp per mine layer (DEPTHS, tone 3 = the layer colour in
# Content.java). Sprites that sit in rock use the placeholder ramp 'rockd' and ores the placeholder 'ingot';
# the game swaps both. Crystals, glow mushrooms and lava glow ('crystal', 'glow', 'lava' are emissive).
#   python3 rock.py <out dir>
import sys, os
from valley import *
from shells import voronoi, blit, pick, EMIT

DEPTHS = [
 ['#1c1612', '#33281f', '#4c3d30', '#6b5a48', '#8a7660'],    # 0 Shallow Caves
 ['#18161a', '#2c2a2e', '#434046', '#5c585c', '#7a7478'],    # 1 Grey Veins
 ['#14151e', '#252836', '#363a4c', '#4a4d5c', '#686c80'],    # 2 Silver Halls
 ['#1a130c', '#2e2216', '#433222', '#5a4a32', '#7a6646'],    # 3 Golden Deep
 ['#130f1e', '#221a34', '#30264a', '#3c3556', '#5c5280'],    # 4 Crystal Abyss
]
R['rockd'] = DEPTHS[0]
R['crystal'] = ['#1a2a5a', '#2c58a0', '#4a90d0', '#8ad0f0', '#e0f8ff']
R['glow'] = ['#0e3a3a', '#1a6a5e', '#3aa88a', '#7ae0b0', '#d0fff0']
R['lava'] = R['flame']
R['water'] = ['#10202e', '#1c3a4a', '#2e5e6e', '#5a9aa0', '#a8e0dc']
EMIT.update({'crystal', 'glow', 'lava'})

def depth_ramp(d): return DEPTHS[d]
def recolour(sprite, mapping):
    """Swap placeholder ramps in a sprite grid, e.g. {'rockd': 'd2', 'ingot': 'gold'}."""
    g = np.vectorize(lambda v: (mapping.get(v[0], v[0]), v[1]) if v is not None else None, otypes=[object])(sprite['grid'])
    return {'grid': g, 'anchor': sprite['anchor']}
for i, r in enumerate(DEPTHS): R[f'd{i}'] = r

# ------------------------------------------------------------------ rock tiles (96 x 144 like the walls, period 96)
def rock_tile(d):
    ids = voronoi(96, RH, 13 + d, 11 + d // 2, 50 + d, wrap_y=True)   # rock tiles stack: seamless both ways
    tones = (2, 2, 2, 3, 1)
    mix = lambda i: (hsh(i, 7, d) * 2654435761 >> 13) % len(tones)  # well mixed: no lighter top, darker bottom
    g = blocks(ids, f'd{d}', lambda i: tones[mix(i)], wrap_y=True)
    if d == 4:                                                       # the abyss: a few joints glow violet-blue
        for y, x in zip(*np.nonzero((np.roll(ids, -1, 1) != ids))):
            if hsh(ids[y, x], 9) % 16 == 0: g[y, x] = ('crystal', 1)
    return g

# ------------------------------------------------------------------ caves (holes in the rock, 4 sizes)
def cave(size=2):
    p = Part()
    rx, ry = (8, 13, 19, 26)[size], (6, 10, 14, 19)[size]
    cx, cy = 48, 95 - ry
    m = ell(cx, cy, rx, ry)
    for k in range(5):                                               # lumpy edge
        a = hsh(size, k) % 628 / 100
        m |= ell(cx + rx * 0.7 * math.cos(a), cy + ry * 0.6 * math.sin(a), rx * 0.45, ry * 0.45)
    m &= yy <= 95
    idx = np.zeros((H, W), int)
    for y, x in zip(*np.nonzero(m)):
        below = not m[min(H - 1, y + 2), x] or not m[y, min(W - 1, x + 2)]
        idx[y, x] = 1 if below else 0                                # the far bottom/right inner wall catches light
        if y > 95 - 3: idx[y, x] = 1                                 # floor of the hollow
    p.fill(m, 'rockd', idx=idx, outline=False)
    for y, x in zip(*np.nonzero(m)):                                 # lit lip on the rock below and right of the hole
        for dy, dx in ((1, 0), (0, 1)):
            ny, nx = y + dy, x + dx
            if ny < H and nx < W and not m[ny, nx] and p.c[ny, nx] is None: p.c[ny, nx] = ('rockd', 4)
        for dy, dx in ((-1, 0), (0, -1)):
            ny, nx = y + dy, x + dx
            if ny >= 0 and nx >= 0 and not m[ny, nx] and p.c[ny, nx] is None: p.c[ny, nx] = ('rockd', 0)
    return crop(p)

# ------------------------------------------------------------------ overlays on rock
def walk_line(p, x, y, n, seed, tone_dark=0, tone_lit=4, branch=0):
    a = math.pi / 2 + (hsh(seed) % 100 - 50) / 100
    for i in range(n):
        a += ((hsh(seed, i) % 100) - 50) / 120
        x += math.cos(a) * 1.2; y += math.sin(a) * 1.2
        X, Y = round(x), round(y)
        if not (0 <= X < W - 1 and 0 <= Y < H - 1): break
        p.c[Y, X] = ('dark', 0); p.c[Y, X + 1] = ('rockd', 0)
        if p.c[Y - 1, X] is None: p.c[Y - 1, X] = ('rockd', 4)                     # fresh broken stone is pale
        if p.c[Y, X - 1] is None: p.c[Y, X - 1] = ('rockd', 3)
        if p.c[Y + 1, X + 2] is None: p.c[Y + 1, X + 2] = ('rockd', tone_lit)
        if branch and i == n // 2: walk_line(p, x, y, n // 2, seed + 7, tone_dark, tone_lit, branch - 1)
def cracks(stage=1):
    p = Part()
    if stage >= 1: walk_line(p, 46, 30, 14 + stage * 6, 1, branch=stage - 1)
    if stage >= 2: walk_line(p, 52, 40, 18, 5, branch=1)
    if stage >= 3:
        walk_line(p, 40, 50, 16, 9, branch=1)
        p.fill(ell(48, 46, 5, 4), 'rockd', idx=np.zeros((H, W), int))     # a pocket breaks open
        p.fill(ell(48.5, 46.5, 3.5, 2.6), 'dark', idx=np.zeros((H, W), int), outline=False)
        for (x, y) in ((44, 74), (50, 80), (47, 88)):                 # chips falling away
            p.fill(ell(x, y, 1.6, 1.3), 'rockd', bias=0.1)
    p.c[95, 48] = p.c[95, 48]
    return {'grid': p.c[20:96, 24:72], 'anchor': (24, 76)}
def ore_vein(seed=0):
    p = Part()
    for k in range(7):
        x = 36 + hsh(seed, k) % 24; y = 80 + hsh(seed, k, 1) % 12
        r = 1.6 + hsh(seed, k, 2) % 3 * 0.7
        m = poly([(x - r, y), (x - r * 0.3, y - r), (x + r, y - r * 0.5), (x + r * 0.7, y + r * 0.8), (x - r * 0.5, y + r)])
        p.fill(m, 'ingot', bias=0.15, round_=1.4)
    return crop(p)
def crystals():
    p = Part()
    for k, (x, h, lean, w) in enumerate(((40, 18, -0.25, 3.2), (48, 26, 0.05, 4), (55, 15, 0.35, 3), (34, 10, -0.5, 2.4), (60, 9, 0.6, 2.2))):
        top = (x + lean * h, 95 - h)
        m = poly([(x - w, 95.5), (x + w, 95.5), (top[0] + w * 0.8, top[1] + 3), top, (top[0] - w * 0.8, top[1] + 3)])
        ci = np.full((H, W), 2)
        for y, xx_ in zip(*np.nonzero(m)):
            mid = x + lean * (95 - y)
            ci[y, xx_] = 4 if xx_ < mid - w * 0.4 else 3 if xx_ < mid + 0.5 else 1
        p.fill(m, 'crystal', idx=ci)
    p.fill(ell(48, 95.5, 16, 2.5) & (yy <= 95), 'rockd', bias=0.1)
    return crop(p)
def stalactites():
    p = Part()
    for k, (x, h, w) in enumerate(((30, 22, 4), (40, 12, 3), (49, 30, 5), (58, 16, 3.5), (66, 9, 2.5))):
        m = poly([(x - w, 0), (x + w, 0), (x + 0.6, h), (x - 0.6, h)])
        p.fill(m, 'rockd', idx=np.where(xx < x - w * 0.3, 3, np.where(xx > x + w * 0.3, 1, 2)))
    for x in range(24, 73): p.c[0, x] = ('rockd', 1)
    return crop(p, anchor_y=0)
def stalagmites():
    p = Part()
    for k, (x, h, w) in enumerate(((34, 12, 4), (44, 24, 5.5), (54, 9, 3.5), (62, 16, 4))):
        m = poly([(x - w, 95.5), (x + w, 95.5), (x + 0.6, 95 - h), (x - 0.6, 95 - h)])
        p.fill(m, 'rockd', idx=np.where(xx < x - w * 0.3, 3, np.where(xx > x + w * 0.3, 1, 2)))
        if k == 1: p.c[95 - h + 1, x] = ('water', 4)                          # a drop on the tip
    return crop(p)
def moss(stage=2):
    p = Part()
    n = (6, 14, 24)[stage]
    for k in range(n):
        x = 30 + hsh(k, 3) % 36; y = 70 + hsh(k, 4) % 10
        r = 1.5 + stage * 0.8 + hsh(k, 5) % 2
        p.fill(ell(x, y, r * 1.4, r * 0.7), 'moss', bias=0.1, round_=1.2, outline=False)
        if stage == 2 and k % 3 == 0:                                         # strands hanging down
            for dy in range(2, 6 + hsh(k, 6) % 6): p.c[min(H - 1, round(y + r * 0.6) + dy), x] = ('moss', 2 if dy % 2 else 3)
    return crop(p, anchor_y=70)
def roots():
    p = Part()
    def root(x, y, n, seed, w):
        a = math.pi / 2
        for i in range(n):
            a += ((hsh(seed, i) % 100) - 50) / 160
            x += math.cos(a) * 1.0; y += math.sin(a) * 1.0
            for d in range(w):
                if 0 <= round(x) + d < W and 0 <= round(y) < H: p.c[round(y), round(x) + d] = ('bark', 3 if d == 0 else 1)
            if i in (n // 3, 2 * n // 3) and n > 14: root(x, y, n // 2, seed + i, max(1, w - 1))
    root(36, 0, 40, 1, 2); root(52, 0, 30, 2, 2); root(60, 0, 18, 3, 1)
    for x, y in ((37, 44), (52, 33)): p.c[y, x] = ('moss', 3)
    return crop(p, anchor_y=0)
def glowshrooms():
    p = Part()
    for k, (x, h, r) in enumerate(((38, 6, 3.2), (45, 10, 4.2), (52, 5, 2.6), (57, 8, 3.4))):
        p.fill(rect_m(x, 95 - h, x, 95), 'cream', idx=np.full((H, W), 2), outline=False)
        cap_m = ell(x + 0.5, 95 - h, r, r * 0.6) & (yy <= 95 - h + 0.5)
        p.fill(cap_m, 'glow', bias=0.2, round_=1.3)
        p.c[95 - h - 1, x - 1] = ('glow', 4)
    return crop(p)
def cobweb():
    """Top-left corner web; mirror for the right."""
    p = Part()
    for a in np.linspace(0, math.pi / 2, 5):                                  # spokes
        for r in range(0, 22):
            x, y = round(r * math.cos(a)), round(r * math.sin(a))
            if x < W and y < H: p.c[y, x] = ('cream', 3)
    for rr in (6, 11, 16, 20):                                                # sagging threads between spokes
        for t in np.linspace(0, math.pi / 2, rr * 2):
            sag = 1.2 * math.sin((t % (math.pi / 8)) / (math.pi / 8) * math.pi)
            x, y = round((rr - sag) * math.cos(t)), round((rr - sag) * math.sin(t))
            if p.c[y, x] is None: p.c[y, x] = ('cream', 2)
    return {'grid': p.c[0:22, 0:22], 'anchor': (0, 0)}
def drip(frame=0):
    """A drop forms on the ceiling, falls, splashes in a puddle (4 frames, 16 x 48)."""
    g = np.full((48, 16), None, object)
    f = frame % 4
    if f == 0: g[0, 8] = ('water', 3); g[1, 8] = ('water', 4)
    if f == 1: g[14, 8] = ('water', 4); g[15, 8] = ('water', 3); g[13, 8] = ('water', 2)
    if f == 2: g[34, 8] = ('water', 4); g[35, 8] = ('water', 3)
    if f == 3:
        for x, y in ((5, 42), (11, 42), (7, 41), (9, 41)): g[y, x] = ('water', 4)
    for x in range(3, 14): g[46, x] = ('water', 3 if x in (4, 5) else 2); g[47, x] = ('water', 1)
    return {'grid': g, 'anchor': (8, 47)}
def boulder(kind='plain', seed=0):
    p = Part()
    m = (ell(48, 83, 20, 14) | ell(40, 87, 14, 10) | ell(58, 86, 13, 10)) & (yy <= 95)
    ids = voronoi(96, 96, 9, 8, 70 + seed, wrap=False)
    ids = np.where(m, ids, -1)
    g = blocks(ids, 'rockd', pick(2, 3, 2, 1))
    dome = shade(m, 0.1, 1.0)
    idx = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(m)): idx[y, x] = max(0, min(4, g[y, x][1] + (dome[y, x] - 2) // 1))
    p.fill(m, 'rockd', idx=idx)
    if kind == 'ore':
        for k in range(6):
            pts = list(zip(*np.nonzero(m & (idx >= 1))))
            y, x = pts[hsh(seed, k) % len(pts)]
            for dy, dx in ((0, 0), (0, 1), (1, 0)): p.c[y + dy, x + dx] = ('ingot', 4 if (dy, dx) == (0, 0) else 2)
    if kind == 'crystal':
        for (x, y, h) in ((42, 72, 8), (50, 70, 11), (56, 74, 6)):
            cm = poly([(x - 2, y + 2), (x + 2, y + 2), (x + 1, y - h), (x - 1, y - h)])
            p.fill(cm, 'crystal', idx=np.where(xx < x, 4, 2))
    return crop(p)

ROCK = {'cave_0': lambda: cave(0), 'cave_1': lambda: cave(1), 'cave_2': lambda: cave(2), 'cave_3': lambda: cave(3),
        'cracks_1': lambda: cracks(1), 'cracks_2': lambda: cracks(2), 'cracks_3': lambda: cracks(3),
        'ore_vein_a': lambda: ore_vein(0), 'ore_vein_b': lambda: ore_vein(3), 'crystals': crystals,
        'stalactites': stalactites, 'stalagmites': stalagmites, 'moss_0': lambda: moss(0), 'moss_1': lambda: moss(1),
        'moss_2': lambda: moss(2), 'roots': roots, 'glowshrooms': glowshrooms, 'cobweb': cobweb,
        'boulder': lambda: boulder('plain', 0), 'boulder_ore': lambda: boulder('ore', 1), 'boulder_crystal': lambda: boulder('crystal', 2)}

def tunnel_hollow(cv, em, x0, y0, w, h, d):
    """A natural cave passage: dark hollow with a lit floor ledge (used in the previews)."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            u = (x - x0) / w; top = y0 + 10 * (1 - math.sin(math.pi * u)) + 3 * math.sin(x / 9)
            bot = y0 + h - 4 - 2 * math.sin(x / 13)
            if top <= y <= bot:
                t = 0 if y < bot - 3 else 1
                cv[y, x] = (f'd{d}', t)
            elif bot < y <= bot + 1: cv[y, x] = (f'd{d}', 4)

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    W_, H_ = 576, 288
    frames = []
    for fr in range(4):
        K = {k: f() for k, f in ROCK.items()}
        cv = np.full((H_, W_), '#000000', object); em = np.zeros(cv.shape, bool); lights = []
        for band, d in enumerate((0, 4)):
            t = rock_tile(d); y0 = band * RH
            blit(cv, em, t[:, np.arange(W_) % 96], 0, y0)
            D = {'rockd': f'd{d}'}
            tunnel_hollow(cv, em, 150, y0 + 40, 300, 92, d)
            put(cv, em, recolour(K['stalactites'], D), 230, y0 + 46); put(cv, em, recolour(K['stalactites'], D), 380, y0 + 44)
            put(cv, em, recolour(K['stalagmites'], D), 330, y0 + 130)
            put(cv, em, recolour(K['cave_1'], D), 60, y0 + 70); put(cv, em, recolour(K['cave_3'], D), 520, y0 + 120)
            put(cv, em, recolour(K['cave_0'], D), 470, y0 + 136)
            put(cv, em, recolour(K['roots'] if d == 0 else K['crystals'], D), 300 if d == 0 else 420, y0 + (46 if d == 0 else 130))
            put(cv, em, recolour(K['cobweb'], D), 152, y0 + 50)
            for i, st in enumerate((1, 2, 3)): put(cv, em, recolour(K[f'cracks_{st}'], D), 22 + i * 42, y0 + 136)
            for i, (k, m) in enumerate((('ore_vein_a', 'copper' if d == 0 else 'silver'), ('ore_vein_b', 'iron' if d == 0 else 'gold'))):
                put(cv, em, recolour(K[k], {**D, 'ingot': m}), 480 - i * 40 if d == 0 else 110 + i * 12, y0 + 30 + i * 8 if d == 0 else y0 + 30)
            put(cv, em, recolour(K['boulder_ore' if d == 0 else 'boulder_crystal'], {**D, 'ingot': 'copper'}), 200, y0 + 130)
            put(cv, em, recolour(K['boulder'], D), 255, y0 + 131)
            if d == 0:
                for i, st in enumerate((0, 1, 2)): put(cv, em, recolour(K[f'moss_{st}'], D), 360 + i * 30, y0 + 52)
                put(cv, em, recolour(K['glowshrooms'], D), 410, y0 + 129); lights.append((410, y0 + 120, 46, 0.55))
                put(cv, em, P_lan := PROPS['lantern'](), 180, y0 + 48); lights.append((180, y0 + 74, 90, 0.75))
                put(cv, em, drip(fr), 345, y0 + 130)
            else:
                put(cv, em, recolour(K['glowshrooms'], D), 170, y0 + 129); lights += [(420, y0 + 110, 70, 0.7), (170, y0 + 120, 46, 0.5)]
                put(cv, em, drip(fr + 2), 230, y0 + 130)
        frames.append(light(cv, em, lights, ambient=0.62).resize((W_ * 2, H_ * 2), Image.NEAREST))
    frames[0].save(f'{out}/rock_x2.png')
    frames[0].save(f'{out}/rock_x2.gif', save_all=True, append_images=frames[1:], duration=260, loop=0)
    # the five layer rocks side by side, unlit
    sh = Image.new('RGB', (5 * 104 + 8, RH + 16), (36, 28, 34))
    for d in range(5):
        t = rock_tile(d)
        for y in range(RH):
            for x in range(96): sh.putpixel((8 + d * 104 + x, 8 + y), rgb(col(t[y, x])))
    sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST).save(f'{out}/rock_layers_x2.png')
    print('ok')
