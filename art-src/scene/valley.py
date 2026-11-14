# Block 5: the valley outside the hold. Props on the 96 x 96 canvas like props.py; sky, mountains, meadow, the outer
# rock face and the gate are drawn straight onto the scene (they span more than one canvas).
# Three times of day share all parts: the sky picks a palette, the light pass dims everything but the sky and the fires.
#   python3 valley.py <out dir>
import sys, os
from storage import *
from shells import voronoi, blit, pick

R['leaf'] = ['#1c2a1e', '#2e4a2c', '#4a6e36', '#76963e', '#b0c25a']     # warm, a little olive
R['fir'] = ['#141f1e', '#203430', '#2f4e40', '#4a6e4e', '#7a9a64']
R['bark'] = ['#22161a', '#3c2622', '#5a3a2c', '#7a5236', '#9c7046']
R['canvas'] = ['#4a3a30', '#7e6a54', '#b8a284', '#ddc9a6', '#f6ead0']
R['petal'] = ['#4a1a30', '#8a2e4a', '#d0566a', '#f08a8a', '#ffd0c0']
R['sun'] = ['#c86a2a', '#f0a040', '#ffcc66', '#ffe9a0', '#fff8e0']
SKY = {
 'day':   ['#6e9cc0', '#86aec6', '#a3c0c8', '#c6d0c0', '#e8d8b0', '#f6dca6'],
 'dusk':  ['#2e2a58', '#4c3866', '#7a4a6c', '#b45e66', '#e0825e', '#f6b064'],
 'night': ['#0e1024', '#151a34', '#1c2442', '#262e4e', '#323a5a', '#3e4462'],
}
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16

def hx(c): return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
def mix(a, b, t):
    a, b = hx(a), hx(b); return '#%02x%02x%02x' % tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

# ------------------------------------------------------------------ sky, sun, moon
def sky(cv, em, w, h, time, horizon):
    pal = SKY[time]; n = len(pal)
    for y in range(h):
        t = min(1, y / horizon) * (n - 1)
        for x in range(w):
            i = int(t) + (1 if (t % 1) > BAYER[y % 4, x % 4] else 0)
            cv[y, x] = pal[min(n - 1, i)]; em[y, x] = True
    if time == 'night':
        for k in range(70):
            x, y = hsh(k, 1) % w, hsh(k, 2) % int(horizon * 0.8)
            cv[y, x] = '#f4ecd0' if k % 5 else '#ffffff'
            if k % 9 == 0 and x + 1 < w: cv[y, x + 1] = '#8a8aa8'; cv[y, x - 1] = '#8a8aa8'
def disc(cv, em, cx, cy, r, cols, halo=None):
    for y in range(int(cy - r - 8), int(cy + r + 9)):
        for x in range(int(cx - r - 8), int(cx + r + 9)):
            if not (0 <= y < cv.shape[0] and 0 <= x < cv.shape[1]): continue
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r:
                u = math.hypot(x + 0.5 - (cx - r * 0.3), y + 0.5 - (cy - r * 0.3)) / r
                cv[y, x] = cols[0] if u < 0.5 else cols[1] if u < 0.9 else cols[2]; em[y, x] = True
            elif halo and d <= r + 7 and ((d - r) < 3 or (BAYER[y % 4, x % 4] > (d - r - 3) / 4)):
                cv[y, x] = mix(cv[y, x], halo, 0.35 if d - r < 3 else 0.2)
def moon(cv, em, cx, cy, r):
    for y in range(cy - r - 1, cy + r + 2):
        for x in range(cx - r - 1, cx + r + 2):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy); d2 = math.hypot(x + 0.5 - cx - r * 0.55, y + 0.5 - cy + r * 0.25)
            if d <= r and d2 > r * 0.85: cv[y, x] = '#f4e8c4' if d < r - 1.5 else '#c8bc9c'
    for (dx, dy) in ((-3, -2), (-4, 3)): cv[cy + dy, cx + dx] = '#d8cca8'

# ------------------------------------------------------------------ mountains (silhouettes, periodic in x)
def ridge(w, base, amp, seed, sharp=1.0):
    xs = np.arange(w)
    h = np.zeros(w)
    for k, (f, a) in enumerate(((1, 1.0), (2, 0.5), (3, 0.33), (5, 0.18), (9, 0.08))):
        ph = (hsh(seed, k) % 1000) / 1000 * 2 * math.pi
        h += a * np.sin(2 * math.pi * f * xs / w + ph)
    h = (h - h.min()) / (h.max() - h.min())
    h = np.abs(h * 2 - 1) ** sharp if sharp != 1 else h
    return (base - amp * h).astype(int)
def mountains(cv, em, w, time, layers):
    hz = SKY[time][-1]
    dark = {'day': '#3e3448', 'dusk': '#2a1e34', 'night': '#0e0e1c'}[time]
    for li, (base, amp, seed, t, snow, tint) in enumerate(layers):
        top = ridge(w, base, amp, seed, (1.6, 1.2, 1.0)[li])
        d = dark if not tint else mix(dark, tint, {'day': 0.8, 'dusk': 0.5, 'night': 0.25}[time])
        lit, shd = mix(d, hz, t + 0.14), mix(d, hz, t)
        for x in range(w):
            facing_light = top[(x + 4) % w] < top[x - 4] - 1               # slope rising to the right faces the sun
            for y in range(max(0, top[x]), base + 4):
                c = lit if facing_light else shd
                if y == top[x]: c = mix(lit, hz, 0.3)
                if snow and y - top[x] < 3 + (hsh(x // 3, li) % 3) and top[x] < base - amp * 0.65:
                    c = mix('#f2eadc', hz, 0.2) if facing_light else mix('#b8b0c4', hz, 0.25)
                cv[y, x] = c; em[y, x] = time != 'night'
    return top

# ------------------------------------------------------------------ meadow and path
def meadow(cv, em, w, y0, h):
    for y in range(y0, y0 + h):
        for x in range(w):
            d = y - y0
            path = abs(d - 12 - 3 * math.sin(x * 4 * math.pi / w)) < 4.5 + 0.8 * math.sin(x * 88 * math.pi / w)
            if path:
                t = 3 if d < 12 + 3 * math.sin(x * 4 * math.pi / w) - 2 else 2
                if hsh(x, y) % 23 == 0: t = 1                                 # ruts and pebbles
                cv[y, x] = ('clay', t)
            else:
                t = 3 if d < 3 else 2 if d < 18 else 1
                if d < 3 and hsh(x // 2, 3) % 3 == 0: t = 4
                cv[y, x] = ('moss', t)
            em[y, x] = False
    for x in range(w):                                                          # grass blades on the top edge
        k = hsh(x, 4)
        if k % 3 == 0: cv[y0 - 1, x] = ('moss', 3)
        if k % 7 == 0: cv[y0 - 2, x] = ('moss', 4); cv[y0 - 1, x] = ('moss', 3)

# ------------------------------------------------------------------ props
def sway_part(p, frame, base_y, strength):
    """Shear a part in the wind: rows higher up move further."""
    s = (0, 1, 2, 1)[frame % 4] * strength
    o = Part()
    for y, x in zip(*np.nonzero(p.c != None)):
        dx = round(s * max(0, base_y - y) / 60)
        if 0 <= x + dx < W: o.c[y, x + dx] = p.c[y, x]
    return o
def canopy(p, blobs, ramp):
    m = np.zeros((H, W), bool)
    for (x, y, rx, ry) in blobs: m |= ell(x, y, rx, ry)
    idx = shade(m, 0.05, 1.0)
    for (x, y, rx, ry) in blobs:                                                 # each clump gets its own lit cap
        cm = ell(x, y, rx, ry) & ~ell(x + 1.5, y + 2, rx, ry) & m
        idx[cm] = np.minimum(4, idx[cm] + 1)
    for y, x in zip(*np.nonzero(m)):
        if hsh(x, y, 5) % 11 == 0 and idx[y, x] > 1: idx[y, x] -= 1              # leaf gaps
    p.fill(m, ramp, idx=idx)
def oak(frame=0):
    trunk = Part()
    trunk.fill(poly([(43, 95.5), (54, 95.5), (52, 60), (45, 60)]), 'bark', bias=0.05, round_=0.8)
    trunk.fill(cap((47, 66), (36, 52), 1.8), 'bark', bias=0.05); trunk.fill(cap((51, 64), (60, 50), 1.8), 'bark', bias=0.05)
    trunk.fill(poly([(40, 95.5), (57, 95.5), (54, 92), (43, 92)]), 'bark', bias=0.05)                 # roots
    for y in range(66, 92, 5): trunk.c[y, 47 + (y // 5) % 3] = ('bark', 1)                            # bark furrows
    c = Part()
    canopy(c, [(48, 30, 22, 16), (30, 42, 14, 11), (66, 41, 14, 11), (40, 18, 13, 10), (58, 20, 12, 10), (48, 48, 16, 9)], 'leaf')
    return crop_parts([trunk, sway_part(c, frame, 60, 1)])
def fir(frame=0):
    trunk = Part()
    trunk.fill(rect_m(46, 80, 50, 95), 'bark', idx=faces(rect_m(46, 80, 50, 95), 0))
    c = Part()
    m = np.zeros((H, W), bool)
    for i, (y, hw, hh) in enumerate(((14, 7, 14), (28, 12, 16), (44, 17, 18), (60, 22, 20))):
        m |= poly([(48, y), (48 + hw, y + hh), (48 - hw, y + hh)])
    m |= poly([(48, 2), (51, 14), (45, 14)])
    idx = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(m)):
        idx[y, x] = 3 if x < 47 else 2 if x < 52 else 1
        if not m[min(H - 1, y + 1), x] and x < 50: idx[y, x] = 4                 # lit lower edge of each tier
    c.fill(m, 'fir', idx=idx)
    return crop_parts([trunk, sway_part(c, frame, 80, 0.5)])
def crop_parts(parts):
    p = Part(); p.c = compose(parts); return crop(p)
def bush():
    p = Part()
    canopy(p, [(40, 89, 9, 7), (52, 87, 10, 8), (60, 91, 7, 5), (46, 82, 7, 5)], 'leaf')
    for x, y in ((40, 86), (54, 84), (59, 90), (47, 90)): p.c[y, x] = ('quilt', 3); p.c[y, x + 1] = ('quilt', 2)   # berries
    return crop(p)
def flowers():
    p = Part()
    for i, (x, h, ramp) in enumerate(((36, 6, 'petal'), (41, 8, 'gold'), (46, 5, 'cream'), (52, 9, 'petal'), (57, 6, 'teal'), (61, 7, 'gold'))):
        for y in range(95 - h, 96): p.c[y, x] = ('moss', 2 if y % 3 else 3)
        p.c[94 - h + 2, x - 1] = ('moss', 3)                                                         # leaf
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)): p.c[95 - h + dy, x + dx] = (ramp, 3)
        p.c[95 - h, x] = ('gold', 4) if ramp != 'gold' else ('clay', 2)
    return crop(p)
def stall(frame=0):
    p = Part()
    for x in (22, 71): board(p, x, 46, x + 2, 95, 'oak', top_rows=1)
    front = rect_m(20, 72, 75, 95)
    fi = faces(front, 0)
    for y, x in zip(*np.nonzero(front)):
        if (x - 20) % 8 == 0: fi[y, x] = 1
    p.fill(front, 'wood', idx=fi)
    board(p, 17, 69, 78, 71, 'oak', top_rows=2)
    for x, r in ((27, 'quilt'), (33, 'gold'), (39, 'moss')): p.fill(ell(x, 66.5, 2.6, 2.4), r, bias=0.15)   # apples, cheese, cabbage
    p.fill(rect_m(46, 63, 54, 68), 'wood', idx=faces(rect_m(46, 63, 54, 68), 1))                           # small crate
    p.fill(ell(62, 66, 4, 3) & (yy <= 68), 'clay', bias=0.1)
    # striped awning, scalloped edge flaps with the frame
    aw = poly([(14, 46), (81, 46), (76, 34), (19, 34)])
    ai = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(aw)):
        stripe = ((x - 14) // 7) % 2
        ai[y, x] = (3 if y < 38 else 2) if stripe else (4 if y < 38 else 3)
    p.fill(aw, 'quilt', idx=ai)
    for y, x in zip(*np.nonzero(aw)):
        if ((x - 14) // 7) % 2 == 0: p.c[y, x] = ('cream', ai[y, x])
    for i, x0 in enumerate(range(14, 81, 7)):
        L = 3 + ((i + frame) % 2) + (1 if (i + frame) % 4 == 0 else 0)
        stripe = i % 2
        for x in range(x0, min(82, x0 + 7)):
            for y in range(47, 47 + L - abs(x - x0 - 3) // 2):
                p.c[y, x] = ('cream', 2) if stripe == 0 else ('quilt', 1)
    return crop(p)
def signpost():
    p = Part()
    board(p, 46, 50, 49, 95, 'oak', top_rows=1)
    for (y, d, w) in ((54, 1, 22), (64, -1, 18)):
        x0 = 49 if d > 0 else 46 - w
        tip = x0 + w + 3 if d > 0 else x0 - 3
        m = poly([(x0, y), (x0 + w, y), (tip, y + 3.5), (x0 + w, y + 7), (x0, y + 7)] if d > 0 else
                 [(x0 + w, y), (x0, y), (tip, y + 3.5), (x0, y + 7), (x0 + w, y + 7)])
        p.fill(m, 'wood', idx=np.where(yy == y, 4, np.where(yy == y + 6, 1, 2)))
        for x in range(x0 + 3, x0 + w - 3, 2): p.c[y + 3, x] = ('wood', 0)                      # carved letters
        p.c[y + 3, (x0 + 1) if d > 0 else (x0 + w - 2)] = ('iron', 3)
    p.fill(poly([(43, 49), (52, 49), (48, 46)]), 'oak', bias=0.1)
    return crop(p)
def well():
    p = Part()
    ring = rect_m(30, 76, 65, 95)
    masonry(p, ring, 'sand', bw=9, bh=6, y0=76)
    p.fill(rect_m(28, 74, 67, 76), 'sand', idx=faces(rect_m(28, 74, 67, 76), 1))
    for x in (31, 62): board(p, x, 40, x + 2, 73, 'oak', top_rows=1)
    roof = poly([(22, 44), (73, 44), (48, 28)])
    ri = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(roof)):
        ri[y, x] = 4 if (y - 28) % 4 == 0 else 3 if x < 48 else 2                               # shingle rows
        if (x + (y // 4) * 3) % 6 == 0: ri[y, x] = 1
    p.fill(roof, 'clay', idx=ri)
    p.fill(rect_m(33, 52, 62, 54), 'oak', idx=faces(rect_m(33, 52, 62, 54), 1))               # axle with rope
    p.fill(rect_m(44, 51, 52, 55), 'cream', idx=np.where(yy % 2, 3, 2))
    for y in range(56, 64): p.c[y, 48] = ('cream', 3 if y % 3 else 1)
    p.fill(poly([(44, 64), (52, 64), (51, 71), (45, 71)]), 'oak', bias=0.05)                   # bucket
    p.fill(rect_m(44, 66, 52, 66), 'iron', idx=np.full((H, W), 2), outline=False)
    p.fill(cap((63, 53), (68, 58), 0.8), 'iron', bias=0.1, outline=False); p.fill(ell(68, 58, 1.4, 1.4), 'oak', bias=0.1)
    return crop(p)
def fence():
    """A 48 px fence section, repeat sideways."""
    p = Part()
    for x in (24, 71): board(p, x, 76, x + 2, 95, 'oak', top_rows=1); p.fill(poly([(x - 0.5, 76), (x + 3.5, 76), (x + 1.5, 73)]), 'oak', bias=0.1)
    for y in (80, 88): board(p, 24, y, 72, y + 2, 'wood', top_rows=1, grain=True)
    return crop(p, anchor_x=24)
def wagon():
    p = Part()
    body = rect_m(14, 66, 78, 80)
    bi = faces(body, 1)
    for y, x in zip(*np.nonzero(body)):
        if (x - 14) % 10 == 0: bi[y, x] = 1
    p.fill(body, 'wood', idx=bi)
    cover = (ell(46, 66, 30, 26) & (yy <= 65)) & (xx >= 17) & (xx <= 75)
    ci = shade(cover, 0.1, 0.8)
    for y, x in zip(*np.nonzero(cover)):
        if (x - 17) % 12 == 0: ci[y, x] = max(1, ci[y, x] - 1)                               # hoops under the canvas
    p.fill(cover, 'canvas', idx=ci)
    p.fill(ell(46, 62, 8, 7) & (yy <= 65), 'rock', idx=np.full((H, W), 0), outline=False)   # opening at the back
    p.c[60, 44] = ('flame', 3); p.c[61, 44] = ('flame', 2)                                    # a lamp inside
    p.fill(cap((78, 76), (92, 82), 1.0), 'oak', bias=0.1)                                      # shaft
    for cx in (26, 66):
        rim = ell(cx, 85, 10, 10) & ~ell(cx, 85, 8, 8)
        p.fill(rim, 'oak', bias=0.05)
        for a in range(4):
            ang = a * math.pi / 4
            p.fill(cap((cx - 8 * math.cos(ang), 85 - 8 * math.sin(ang)), (cx + 8 * math.cos(ang), 85 + 8 * math.sin(ang)), 0.6), 'oak', idx=np.full((H, W), 2), outline=False)
        p.fill(ell(cx, 85, 2, 2), 'iron', bias=0.1)
    return crop(p)
def brazier(frame=0):
    p = Part()
    for b in ((40, 95), (56, 95), (48, 95)): p.fill(cap((48, 82), b, 0.9), 'blackiron', bias=0.05)
    bowl = ell(48, 78, 9, 5) & (yy >= 76)
    p.fill(bowl, 'blackiron', bias=0.05)
    p.fill(rect_m(38, 75, 57, 76), 'blackiron', idx=np.where(yy == 75, 4, 2))
    glow_bed(p, rect_m(40, 73, 55, 74), frame, 7)
    for i, x in enumerate((43, 48, 53)): flame(p, x, 73, 5, 10 + (i == 1) * 5, frame, phase=i)
    return crop(p)

# ------------------------------------------------------------------ outer rock face and gate
def rockface(cv, em, x0, w, h, ground):
    ids = voronoi(w, h, 14, 11, 41, wrap=False)
    g = blocks(ids, 'rock', pick(3, 3, 2, 4))
    for y in range(h):
        edge = x0 + 10 + int(8 * math.sin(y / 23) + 5 * math.sin(y / 7.3))
        for x in range(edge, x0 + w):
            v = g[y, x - x0]
            if x == edge: v = ('rock', 0)
            elif x < edge + 3: v = ('rock', min(4, v[1] + 1))                    # sunlit cliff edge
            cv[y, x] = v; em[y, x] = False
        if y < ground and hsh(y, 6) % 4 == 0: cv[y, edge - 1] = ('moss', 3)       # moss in the cracks of the edge
def gate(cv, em, cx, ground):
    r, rr, spring = 36, 44, ground - 58
    ids = np.full(cv.shape, -1)
    for y in range(spring - rr, ground):
        for x in range(cx - rr, cx + rr):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - spring)
            inside = (abs(x + 0.5 - cx) <= r and y >= spring) or d <= r
            if inside:
                # two door leaves of planks with iron bands
                lx = x - (cx - r)
                t = 1 if lx % 6 == 0 else 3 if lx % 6 == 1 else 2
                if abs(x + 0.5 - cx) < 1: cv[y, x] = ('rock', 0)
                elif (y - spring) % 22 in (0, 1) and y > spring - 20: cv[y, x] = ('blackiron', 3 if (y - spring) % 22 == 0 else 1)
                else: cv[y, x] = ('oak', t)
                em[y, x] = False
            elif y < spring and r < d <= rr:
                a = math.atan2(spring - y - 0.5, x + 0.5 - cx)
                ids[y, x] = 50 + int((a + math.pi / 22) / (math.pi / 11))
            elif y >= spring and r < abs(x + 0.5 - cx) <= rr:
                ids[y, x] = (x > cx) * 20 + (y - spring) // 12
    rim = blocks(ids, 'sand', lambda i: 3 if i == 55 else pick(2, 2, 3)(i), wrap=False)
    for y, x in zip(*np.nonzero(ids >= 0)): cv[y, x] = rim[y, x]; em[y, x] = False
    for y in range(spring - 24, ground, 22):                                    # rivets on the bands
        for x in range(cx - r + 3, cx + r - 2, 6):
            if cv[y, x] == ('blackiron', 3): cv[y, x] = ('blackiron', 4)
    for dx in (-8, 8):                                                           # ring handles
        for (ox, oy) in ((0, -2), (-2, 0), (2, 0), (-1, 2), (1, 2), (0, 2)): cv[ground - 30 + oy, cx + dx + ox] = ('gold', 3)
    for x in range(cx - 7, cx + 8):                                              # rune plate over the arch
        for y in range(spring - rr - 7, spring - rr - 1):
            cv[y, x] = ('gold', 4 if y == spring - rr - 7 else 1 if y == spring - rr - 2 else 2)
    for x in range(cx - 5, cx + 6, 2): cv[spring - rr - 4, x] = ('gold', 0)

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    W_, H_, G = 576, 288, 250
    P = {k: f() for k, f in PROPS.items()}
    for time in ('day', 'dusk', 'night'):
        frames = []
        for fr in range(4):
            V = {k: f(fr) if k in ('oak', 'fir', 'stall', 'brazier') else f() for k, f in
                 {'oak': oak, 'fir': fir, 'bush': bush, 'flowers': flowers, 'stall': stall, 'signpost': signpost,
                  'well': well, 'fence': fence, 'wagon': wagon, 'brazier': brazier}.items()}
            cv = np.full((H_, W_), '#000000', object); em = np.zeros(cv.shape, bool)
            sky(cv, em, W_, H_, time, 210)
            if time == 'day': disc(cv, em, 96, 52, 11, R['sun'][4:1:-1], halo='#fff4d0')
            if time == 'dusk': disc(cv, em, 300, 196, 16, ['#fff0b0', '#ffc060', '#f08a40'], halo='#ffd090')
            if time == 'night': moon(cv, em, 140, 48, 9)
            mountains(cv, em, W_, time, [(212, 96, 3, 0.5, True, None), (232, 52, 8, 0.3, False, None), (248, 26, 13, 0.16, False, '#4a6a3a')])
            rockface(cv, em, 420, W_ - 420, G, G)
            meadow(cv, em, W_, G, H_ - G)
            gate(cv, em, 500, G + 2)
            for x in (446, 554): put(cv, em, V['brazier'], x, G + 4)
            for x in range(0, 120, 48): put(cv, em, V['fence'], x, G + 2)
            put(cv, em, V['fir'], 26, G + 3); put(cv, em, V['oak'], 92, G + 4)
            put(cv, em, V['bush'], 150, G + 4); put(cv, em, V['signpost'], 178, G + 6)
            put(cv, em, V['stall'], 236, G + 6); dwarf(cv, em, 'd_stand', 236, G + 4)
            put(cv, em, V['stall'], 236, G + 6)
            put(cv, em, V['well'], 300, G + 5)
            put(cv, em, V['wagon'], 368, G + 8); dwarf(cv, em, 'd_side', 404, G + 12, flip=True)
            put(cv, em, V['fir'], 418, G + 3)
            for x in (60, 132, 196, 332, 560): put(cv, em, V['flowers'], x, G + 14 + (x % 3) * 4)
            put(cv, em, V['bush'], 470 - 60, G + 16)
            ambient = {'day': 1.0, 'dusk': 0.72, 'night': 0.42}[time]
            lights = [] if time == 'day' else [(446, G - 20, 90, 0.8), (554, G - 20, 90, 0.8), (364, G - 30, 30, 0.3)]
            frames.append(light(cv, em, lights, ambient=ambient).resize((W_ * 2, H_ * 2), Image.NEAREST))
        frames[0].save(f'{out}/valley_{time}_x2.png')
        frames[0].save(f'{out}/valley_{time}_x2.gif', save_all=True, append_images=frames[1:], duration=220, loop=0)
    print('ok')
