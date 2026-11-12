# Block 8: mood and small things. Critters, cosy clutter, pipes and effects (sparks, smoke, steam, dust, sparkle).
# Effects have 4 frames; sparks and sparkles glow.
#   python3 ambient.py <out dir>
import sys, os
from monsters import *

R['smoke'] = ['#1e1a20', '#3a3238', '#5e5458', '#8a7e7e', '#b4a8a2']
R['ginger'] = ['#3a160c', '#6e2e14', '#b0561e', '#e08a3a', '#f8c070']
R['spark'] = R['flame']
EMIT.update({'spark'})

# ------------------------------------------------------------------ critters (small, 4 frames)
def bat(frame=0):
    p = Part()
    up = frame % 2 == 0
    p.fill(ell(48, 50, 2.6, 3.2), 'fur', bias=0.15)
    p.c[47, 47] = ('fur', 3); p.c[47, 49] = ('fur', 3)                                        # ears
    for d in (-1, 1):
        tip = (48 + d * 9, 45 if up else 55)
        wing = poly([(48 + d * 1.5, 49), (tip[0], tip[1]), (48 + d * 6, 52 if up else 56), (48 + d * 2, 52)])
        p.fill(wing, 'chitin', bias=0.05)
    p.c[49, 47] = ('lava', 4); p.c[49, 49] = ('lava', 4)
    return crop(p, anchor_y=50)
def bat_hanging(frame=0):
    p = Part()
    p.fill(ell(48, 6, 3, 4.5), 'chitin', bias=0.1)                                           # wrapped wings
    p.fill(ell(48, 11, 2.2, 2), 'fur', bias=0.15)
    p.c[13, 47] = ('fur', 3); p.c[13, 49] = ('fur', 3)
    p.c[1, 47] = ('fur', 1); p.c[1, 49] = ('fur', 1); p.c[0, 47] = ('fur', 1); p.c[0, 49] = ('fur', 1)
    if frame == 2: p.c[11, 47] = ('lava', 4)                                                  # blinks one eye open
    return crop(p, anchor_y=0)
def mouse(frame=0):
    p = Part()
    s = (0, 1, 0, -1)[frame]
    p.fill(cap((42, 93), (36, 90 + s), 0.5), 'petal', idx=np.full((H, W), 2), outline=False)
    p.fill(ell(46, 92.5, 4, 2.6) & (yy <= 95), 'smoke', bias=0.15)
    p.fill(ell(50, 92.5, 2.4, 2), 'smoke', bias=0.2)
    p.c[90, 49] = ('petal', 3); p.c[92, 51] = ('dark', 0); p.c[93, 52] = ('petal', 3)
    for x in (44, 48): p.c[95, x + (s if x == 44 else -s)] = ('smoke', 1)
    return crop(p)
def beetle(frame=0):
    """The little cave crawler: wanders over walls."""
    p = Part()
    for i in range(4):
        x = 42 + i * 3; k = (i + frame) % 2
        p.c[95, x - 1 + k] = ('amber', 1)
        p.fill(ell(x, 93, 2, 1.8), 'amber', bias=0.15, outline=i == 3)
    p.c[92, 53] = ('amber', 3); p.c[91, 54] = ('amber', 3)
    return crop(p)
def cat(frame=0):
    """A ginger cat curled up asleep; it breathes."""
    p = Part()
    b = frame in (1, 2)
    p.fill(cap((35, 94), (58, 94), 2.0), 'ginger', bias=0.1)                                  # tail round the front
    body = ell(46, 90 - b * 0.4, 12, 6 + b * 0.5) & (yy <= 95)
    bi = shade(body, 0.1, 1.0)
    for y, x in zip(*np.nonzero(body)):
        if (x + y // 2) % 5 == 0 and bi[y, x] > 1: bi[y, x] -= 1                              # tabby stripes
    p.fill(body, 'ginger', idx=bi)
    p.fill(ell(56, 89, 5, 4.3), 'ginger', bias=0.15)
    for ex in (53, 59): p.fill(poly([(ex - 2, 86), (ex + 2, 86), (ex, 82)]), 'ginger', bias=0.15)
    p.c[89, 55] = ('ginger', 0); p.c[89, 58] = ('ginger', 0)                                  # closed eyes
    p.c[91, 57] = ('petal', 3)
    p.fill(ell(57, 94, 3.6, 1.4) & (yy <= 95), 'cream', bias=0.2)                              # white paws
    return crop(p)

# ------------------------------------------------------------------ clutter
def plant(kind='fern'):
    p = Part()
    p.fill(poly([(42, 85), (54, 85), (52.5, 95.5), (43.5, 95.5)]), 'clay', bias=0.05, round_=1.1)
    p.fill(rect_m(41, 83, 55, 85), 'clay', idx=faces(rect_m(41, 83, 55, 85), 1))
    if kind == 'fern':
        for k, a in enumerate((-2.4, -1.9, -1.4, -1.0, -0.6, -2.8, -0.2)):
            pts = [(48, 83)]
            for i in range(1, 9):
                r = i * 2.2; pts.append((48 + r * math.cos(a), 83 + r * math.sin(a) + i * i * 0.12))
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]): p.fill(cap((x0, y0), (x1, y1), 1.1), 'leaf', idx=np.full((H, W), 3 if k % 2 else 2), outline=False)
        for y, x in zip(*np.nonzero(p.c != None)):
            if p.c[y, x][0] == 'leaf' and hsh(x, y) % 4 == 0: p.c[y, x] = ('leaf', 4)
    else:
        canopy(p, [(48, 76, 6, 6), (43, 79, 4, 4), (53, 79, 4, 4)], 'leaf')
        for x, y in ((45, 73), (51, 75), (48, 79), (55, 78)):
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)): p.c[y + dy, x + dx] = ('petal', 3 if (dx, dy) == (0, 0) else 2)
    return crop(p)
def wallsign(icon='mug'):
    p = Part()
    p.fill(rect_m(30, 40, 33, 42), 'blackiron', idx=faces(rect_m(30, 40, 33, 42), 1))       # bracket on the wall
    p.fill(rect_m(33, 41, 62, 42), 'blackiron', idx=np.where(yy == 41, 3, 1))
    for x in (38, 57): p.fill(rect_m(x, 43, x, 46), 'blackiron', idx=np.full((H, W), 2), outline=False)
    brd = rect_m(34, 47, 61, 62)
    p.fill(brd, 'wood', idx=faces(brd, 1))
    p.fill(rect_m(36, 49, 59, 60), 'oak', idx=np.full((H, W), 2), outline=False)
    if icon == 'mug':
        p.fill(rect_m(43, 51, 50, 58), 'gold', idx=np.where(xx == 43, 4, 2), outline=False)
        p.fill(rect_m(43, 51, 50, 52), 'cream', idx=np.full((H, W), 4), outline=False)
        for y in (53, 56): p.c[y, 52] = ('gold', 3)
        p.c[54, 53] = ('gold', 3); p.c[55, 53] = ('gold', 3)
    elif icon == 'anvil':
        p.fill(poly([(40, 52), (55, 52), (53, 55), (51, 55), (52, 58), (44, 58), (45, 55), (42, 54)]), 'silver', bias=0.2, outline=False)
    else:
        p.fill(ell(47.5, 55, 4.5, 4.5), 'gold', bias=0.2, outline=False); p.c[55, 47] = ('gold', 1)
    return crop(p, anchor_y=40)
def wallweapons():
    p = Part()
    for d in (-1, 1):                                                                       # crossed axes behind the shield
        p.fill(cap((48 - d * 14, 76), (48 + d * 12, 44), 0.9), 'wood', bias=0.1)
        p.fill(poly([(48 + d * 10, 46), (48 + d * 17, 41), (48 + d * 18, 50), (48 + d * 12, 50)]), 'silver', bias=0.1)
    sh = ell(48, 60, 11, 13)
    si = shade(sh, 0.1, 0.8)
    p.fill(sh, 'quilt', idx=si)
    for y, x in zip(*np.nonzero(sh & ~ell(48, 60, 9.6, 11.6))): p.c[y, x] = ('gold', 3 if x < 48 else 2)
    p.fill(ell(48, 60, 3, 3), 'gold', bias=0.2)
    for y in range(50, 71, 5): p.c[y, 48] = ('gold', 2) if y != 60 else p.c[y, 48]
    return crop(p, anchor_y=40)
def keyboard():
    p = Part()
    brd = rect_m(36, 44, 59, 58)
    p.fill(brd, 'oak', idx=faces(brd, 1))
    for i, x in enumerate((40, 47, 54)):
        p.c[47, x] = ('iron', 4)
        ramp = ('gold', 'iron', 'copper')[i]
        p.fill(ell(x, 50, 1.6, 1.6) & ~ell(x, 50, 0.6, 0.6), ramp, bias=0.1, outline=False)
        for y in range(51, 55 + i % 2): p.c[y, x] = (ramp, 3)
        p.c[54 + i % 2, x + 1] = (ramp, 2)
    return crop(p, anchor_y=44)
def pipes():
    """Copper pipe pieces on a 48 px grid: horizontal, vertical, elbow, valve."""
    out = {}
    def h(g, y0, x0, x1):
        for x in range(x0, x1):
            for k, t in enumerate((4, 3, 2, 1)): g[y0 + k, x] = ('copper', t)
    def v(g, x0, y0, y1):
        for y in range(y0, y1):
            for k, t in enumerate((3, 3, 2, 1)): g[y, x0 + k] = ('copper', t)
    def flange(g, x, y, horiz=True):
        for d in range(-1, 5):
            if horiz: g[y + d, x] = ('copper', 3 if d < 1 else 1); g[y + d, x + 1] = ('copper', 1)
            else: g[y, x + d] = ('copper', 4 if d < 1 else 2); g[y + 1, x + d] = ('copper', 1)
    g = np.full((8, 48), None, object); h(g, 2, 0, 48); flange(g, 23, 2); out['pipe_h'] = {'grid': g, 'anchor': (0, 0)}
    g = np.full((48, 8), None, object); v(g, 2, 0, 48); flange(g, 2, 23, False); out['pipe_v'] = {'grid': g, 'anchor': (0, 0)}
    g = np.full((48, 48), None, object); h(g, 2, 0, 30); v(g, 26, 2, 48)
    for k in range(4):                                                     # rounded bend
        for j in range(4): g[2 + k, 26 + j] = ('copper', (4, 3, 2, 1)[k] if j < 3 - k else (3, 3, 2, 1)[j])
    out['pipe_elbow'] = {'grid': g, 'anchor': (0, 0)}
    g = np.full((16, 48), None, object); h(g, 8, 0, 48)
    for x in range(19, 29): g[6, x] = ('iron', 3); g[7, x] = ('iron', 1)  # valve stem and wheel
    for x in range(21, 27): g[1, x] = ('quilt', 3); g[4, x] = ('quilt', 1)
    for y in range(1, 5): g[y, 21] = ('quilt', 3); g[y, 26] = ('quilt', 2)
    g[5, 23] = ('iron', 2); g[5, 24] = ('iron', 2)
    out['pipe_valve'] = {'grid': g, 'anchor': (0, 8)}
    return out

# ------------------------------------------------------------------ effects (4 frames)
def sparks(frame=0):
    """Sparks spraying up from a hammer blow (anchor = the point struck)."""
    g = np.full((24, 32), None, object)
    for k in range(9):
        a = -math.pi * (0.15 + 0.7 * (hsh(k, 1) % 100) / 100); sp = 3 + hsh(k, 2) % 5
        t = frame + (hsh(k, 3) % 2)
        x = 16 + math.cos(a) * sp * t; y = 22 + math.sin(a) * sp * t + 0.6 * t * t
        if 0 <= round(y) < 24 and 0 <= round(x) < 32 and t < 4:
            g[round(y), round(x)] = ('spark', 4 if t < 2 else 3 if t < 3 else 2)
    return {'grid': g, 'anchor': (16, 23)}
def puff(frame=0, ramp='smoke'):
    """One cloud rising and fading (anchor = where it comes out)."""
    p = Part()
    for k in range(3):
        t = (frame + k * 1.3) % 4
        y = 90 - t * 9; x = 48 + math.sin(t * 1.4 + k) * 3; r = 2.5 + t * 1.6
        if t > 3.4: continue
        m = ell(x, y, r, r * 0.8)
        idx = np.where(yy < y - r * 0.2, 4, 3) - (1 if t > 2 else 0)
        dith = (xx + yy) % 2 == 0
        p.fill(m & (dith | (t < 2.5)), ramp, idx=idx, outline=False)
    return {'grid': p.c[40:96, 24:72], 'anchor': (24, 55)}
def dust(frame=0):
    """Motes drifting in a beam of light, 32 x 64; the beam itself comes from the light pass."""
    g = np.full((64, 32), None, object)
    for k in range(10):
        x = (hsh(k, 1) % 30 + frame * (1 if k % 2 else -1)) % 30 + 1
        y = (hsh(k, 2) % 60 + frame * 2) % 62 + 1
        x = int(x + y * 0.3) % 32
        g[y, x] = ('cream', 4 if k % 3 else 3)
    return {'grid': g, 'anchor': (0, 0)}
def sparkle(frame=0):
    g = np.full((7, 7), None, object)
    f = frame % 4
    if f in (1, 3):
        for d in (-1, 0, 1): g[3, 3 + d] = ('spark', 4); g[3 + d, 3] = ('spark', 4)
    if f == 2:
        for d in range(-3, 4): g[3, 3 + d] = ('spark', 4 if abs(d) < 2 else 3); g[3 + d, 3] = ('spark', 4 if abs(d) < 2 else 3)
    if f == 0: g[3, 3] = ('spark', 3)
    return {'grid': g, 'anchor': (3, 3)}

AMBIENT = {'bat': bat, 'bat_hanging': bat_hanging, 'mouse': mouse, 'beetle': beetle, 'cat': cat,
           'fern': lambda: plant('fern'), 'flowerpot': lambda: plant('flower'), 'sign_tavern': lambda: wallsign('mug'),
           'sign_smith': lambda: wallsign('anvil'), 'sign_trade': lambda: wallsign('coin'), 'wallweapons': wallweapons,
           'keyboard': keyboard, 'sparks': sparks, 'smoke': lambda f=0: puff(f, 'smoke'), 'steam': lambda f=0: puff(f, 'cream'),
           'dust': dust, 'sparkle': sparkle}
AMBIENT_ANIM = ('bat', 'bat_hanging', 'mouse', 'beetle', 'cat', 'sparks', 'smoke', 'steam', 'dust', 'sparkle')

if __name__ == '__main__':
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else 'preview'
    os.makedirs(out, exist_ok=True)
    T = {k: f() for k, f in TILES.items()}; P = {k: f() for k, f in PROPS.items()}
    PI = pipes()
    W_ = 13 * CELL; F = FLOOR
    frames = []
    for fr in range(4):
        A = {k: (f(fr) if k in AMBIENT_ANIM else f()) for k, f in AMBIENT.items()}
        L = {k: (f(fr) if k in ('fireplace',) else f()) for k, f in LIVING.items()}
        K = {k: (f(fr) if k in ANIM else f()) for k, f in WORK.items()}
        S = {k: f() for k, f in STORE.items()}
        cv = np.full((RH, W_), '#000000', object); em = np.zeros(cv.shape, bool); lights = []
        # tavern corner (5 cells)
        room(cv, em, 0, 0, 5, T['wall_brick'], T['floor_planks'])
        put(cv, em, L['fireplace'], 60, F); lights.append((60, 112, 110, 0.95 + 0.05 * (fr % 2)))
        put(cv, em, A['cat'], 108, F)
        put(cv, em, A['wallweapons'], 60, 20); put(cv, em, A['sign_tavern'], 150, 30)
        put(cv, em, A['keyboard'], 210, 50); put(cv, em, A['fern'], 140, F); put(cv, em, A['flowerpot'], 60, F - 54)
        put(cv, em, P['barrel'], 220, F); put(cv, em, A['mouse'], 196 + (fr % 4) * 2, F)
        put(cv, em, P['torch'], 180, 92); lights.append((180, 76, 100, 0.7))
        # smithy (5 cells) with pipes under the ceiling
        x0 = 5 * CELL
        room(cv, em, x0, 0, 5, T['wall_ashlar'], T['floor_flags'])
        put(cv, em, K['forge'], x0 + 70, F); lights.append((x0 + 70, 100, 100, 0.9))
        put(cv, em, A['smoke'], x0 + 70, 40)
        put(cv, em, K['anvil'], x0 + 130, F); put(cv, em, A['sparks'], x0 + 126, F - 23); lights.append((x0 + 126, F - 30, 30, 0.25 * (fr < 2)))
        put(cv, em, K['quench'], x0 + 170, F); put(cv, em, A['steam'], x0 + 170, F - 18)
        put(cv, em, A['sign_smith'], x0 + 210, 30)
        for x in range(x0 + 20, x0 + 196, 48): put(cv, em, PI['pipe_h'], x, 34)
        put(cv, em, PI['pipe_valve'], x0 + 116, 36)
        put(cv, em, PI['pipe_elbow'], x0 + 196, 34); put(cv, em, PI['pipe_v'], x0 + 222, 80)
        put(cv, em, A['beetle'], x0 + 214, 120)
        # rock store (3 cells): bats, a beam of light through a crack, glittering gold
        x0 = 10 * CELL
        room(cv, em, x0, 0, 3, T['wall_rock'], T['floor_earth'])
        put(cv, em, A['bat_hanging'], x0 + 40, 4); put(cv, em, A['bat_hanging'], x0 + 52, 6)
        put(cv, em, A['bat'], x0 + 100 + (fr % 2) * 3, 30 + (0, -2, 0, 2)[fr])
        put(cv, em, S['goldpile'], x0 + 72, F)
        for i, (x, y) in enumerate(((x0 + 60, F - 10), (x0 + 82, F - 12), (x0 + 70, F - 6))):
            put(cv, em, sparkle((fr + i) % 4), x, y)
        put(cv, em, A['dust'], x0 + 44, 20)
        for i in range(6): lights.append((x0 + 50 + i * 6, 20 + i * 18, 22, 0.42))      # the beam
        put(cv, em, A['mouse'], x0 + 120, F)
        frames.append(light(cv, em, lights).resize((W_ * 2, RH * 2), Image.NEAREST))
    frames[0].save(f'{out}/ambient_x2.png')
    frames[0].save(f'{out}/ambient_x2.gif', save_all=True, append_images=frames[1:], duration=200, loop=0)
    print('ok')
