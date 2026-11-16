# Block 11: the delve (static/js/delve/), the adventurer's run through the mine. Tiles are 48 x 48. Rock uses the
# placeholder 'rockd' (the game swaps it for the layer's rock), so every layer gets its own stone.
#   delve_rocktex      the rock all blocks are cut from: 192 x 192, seamless both ways (the game cuts jagged blocks from it)
#   delve_wall         the layer wall: banded hard stone held by iron straps, a crack down the middle (48 x 48)
#   delve_ladder       a ladder segment (48 x 48, anchor top left), repeats downwards
#   delve_rope         a rope segment (48 x 48, anchor top left), delve_rope_end the frayed end, delve_hook the grapnel
#   delve_ropes        a coil of rope (shop ware, HUD)
#   delve_bomb         4 frames: iron bomb, the fuse burning down (anchor bottom middle)
#   delve_boom         4 frames: the explosion (96 x 96, anchor middle), glows
#   delve_spikes       a row of iron spikes on the floor (48 x 20, anchor bottom left)
#   delve_arrowtrap    a carved face in a rock block with a slot for its mouth (48 x 48, anchor top left; faces right)
#   delve_arrow        an arrow in flight (24 x 5, anchor middle; flies right)
#   delve_stal         a loose stalactite (anchor top middle)
#   delve_vine_0..2    vines from the ceiling, delve_glowworms_0/1 glowing threads (anchor top middle)
#   delve_fern_0/1, delve_shrooms_0/1, delve_tuft_0/1, delve_bones   on the floor (anchor bottom middle)
#   delve_coin (4 frames), delve_chest_0/1, delve_scroll_<light|quake|mend|stone|blink>, delve_boots, delve_spring,
#   delve_heartgem, delve_whetstone, delve_feather   loot of a run (anchor bottom middle)
#   delve_mosstop      moss over the top of a block (48 wide), delve_puddle 4 frames, delve_drop one falling drop
#   python3 delve.py <out dir>     a preview (delve_x3.png)
import sys, os, math
import numpy as np
from shells import grid, blocks, hsh, voronoi, beam
from engine import R

R.setdefault('steel', ['#1c1b24', '#38364a', '#5e5b72', '#8f8ca4', '#c8c6d6'])
R['rope'] = ['#3a2614', '#6a4a26', '#9a7440', '#c6a062', '#e8cc8e']
T = 48

def clamp(t): return max(0, min(4, t))

# ------------------------------------------------------------------ rock
TEX = 192
def rocktex():
    """The rock all blocks are cut from: one seamless sheet (192 x 192, tiles both ways) of stones in beds, so
    neighbouring blocks run on without a seam. Bedding planes run across, a few cracks split stones."""
    ids = voronoi(TEX, TEX, 24, 16, 61, wrap=True, wrap_y=True)
    big = voronoi(TEX, TEX, 64, 48, 62, wrap=True, wrap_y=True)          # big slabs: stones of one slab share a tone
    tone = lambda i: (2, 2, 3, 1, 2, 2)[hsh(i, 5) % 6]
    of = {}                                              # each stone belongs to the slab its first pixel lies in
    for y in range(TEX):
        for x in range(TEX): of.setdefault(ids[y, x], big[y, x])
    shift = lambda i: (0, 0, 0, 1, -1)[hsh(of[i], 9) % 5]
    g = blocks(ids, 'rockd', lambda i: max(1, min(3, tone(i) + shift(i))), wrap=True, wrap_y=True)
    for k in range(4):                                   # bedding planes: a dark seam, the stone above it lit
        y0 = k * 48 + 20
        for x in range(TEX):
            y = (y0 + round(3 * math.sin((x + k * 37) * 2 * math.pi / TEX * 2) + 2 * math.sin((x * 3 + k * 11) * 2 * math.pi / TEX))) % TEX
            g[y, x] = ('rockd', 0)
            g[(y - 1) % TEX, x] = ('rockd', 1)
            g[(y + 1) % TEX, x] = ('rockd', 3 if g[(y + 1) % TEX, x][1] > 0 else 0)
    for k in range(6):                                   # cracks: wander down through a few stones
        x, y = hsh(k, 71) % TEX, hsh(k, 72) % TEX
        for i in range(10 + hsh(k, 73) % 12):
            X, Y = round(x) % TEX, round(y) % TEX
            g[Y, X] = ('rockd', 0); g[Y, (X + 1) % TEX] = ('rockd', 3)
            x += ((hsh(k, i, 74) % 3) - 1) * 0.9; y += 1
    return {'grid': g, 'anchor': (0, 0)}

def wall():
    """Hard banded stone, iron straps bolted across, a crack in the middle: what a good pick breaks."""
    g = grid(T, T)
    for y in range(T):
        band = (y // 6) % 3
        for x in range(T):
            t = (3, 2, 1)[band]
            if y % 6 == 0: t = 4 if band == 0 else 0
            g[y, x] = ('rockd', t)
    for y0 in (9, 33):                                  # iron straps with bolts
        for x in range(T):
            g[y0, x] = ('steel', 3); g[y0 + 1, x] = ('steel', 2); g[y0 + 2, x] = ('steel', 2); g[y0 + 3, x] = ('steel', 0)
        for x in (4, 23, 43):
            g[y0 + 1, x] = ('steel', 4); g[y0 + 2, x] = ('steel', 1)
    x = 24                                              # the crack, wandering down
    for y in range(T):
        x += (hsh(y, 77) % 3) - 1
        x = max(18, min(30, x))
        if not (9 <= y <= 12 or 33 <= y <= 36): g[y, x] = ('rockd', 0); g[y, x + 1] = ('rockd', 1)
    for y in range(T):                                  # dark rim so the wall reads as one block
        g[y, 0] = ('rockd', 0); g[y, T - 1] = ('rockd', 0)
    for x in range(T): g[0, x] = ('rockd', 4); g[T - 1, x] = ('rockd', 0)
    return {'grid': g, 'anchor': (0, 0)}

# ------------------------------------------------------------------ climbing
def ladder():
    g = grid(T, T)
    for x0 in (11, 33):                                 # the rails
        for y in range(T):
            for k, t in enumerate((0, 3, 2, 1)):
                g[y, x0 + k] = ('wood', t if y % 24 else max(0, t - 1))
    for y0 in (4, 16, 28, 40):                          # the rungs
        for x in range(15, 33):
            g[y0, x] = ('wood', 4 if x < 24 else 3); g[y0 + 1, x] = ('wood', 2); g[y0 + 2, x] = ('wood', 0)
        for x in (12, 34): g[y0 + 1, x] = ('steel', 3)   # pegs
    return {'grid': g, 'anchor': (0, 0)}

def rope_seg(end=False):
    g = grid(T, T)
    n = 34 if end else T
    for y in range(n):
        s = y % 4                                       # twisted strands
        for k in range(3):
            x = 22 + k
            t = 4 if (k == s % 3 and s < 3) else 3 if k == 0 else 2 if k == 1 else 1
            g[y, x] = ('rope', t)
        g[y, 21] = ('rope', 0); g[y, 25] = ('rope', 0)
    if end:                                             # a frayed end
        for k, (dx, ln) in enumerate(((-2, 5), (0, 7), (2, 4), (1, 6))):
            for j in range(ln): g[n + j, 23 + dx + (j // 3) * (1 if dx > 0 else -1 if dx < 0 else 0)] = ('rope', 2 if j < 3 else 1)
    return {'grid': g, 'anchor': (0, 0)}

def hook():
    w, h = 24, 16
    g = grid(w, h)
    for y in range(0, 12):
        g[y, 11] = ('steel', 3); g[y, 12] = ('steel', 1)
    for side in (-1, 1):                                # two claws curling up
        for i, (dx, dy) in enumerate(((1, 11), (2, 11), (3, 11), (4, 12), (5, 12), (6, 11), (7, 10), (8, 9), (8, 8))):
            x = 11 + (dx if side > 0 else -dx + 1)
            g[dy, x] = ('steel', 3 if i < 6 else 4); g[dy + 1, x] = ('steel', 0)
    for y in range(12, 16): g[y, 11] = ('rope', 3); g[y, 12] = ('rope', 1)
    return {'grid': g, 'anchor': (12, 0)}

def coil():
    w, h = 22, 16
    g = grid(w, h)
    for y in range(h):
        for x in range(w):
            dx, dy = (x + 0.5 - 11) / 10.5, (y + 0.5 - 8.5) / 7.2
            d = dx * dx + dy * dy
            if d <= 1 and not ((x + 0.5 - 11) / 4.2) ** 2 + ((y + 0.5 - 8) / 2.6) ** 2 <= 1:
                ring = int(math.hypot(dx, dy) * 4)
                t = 0 if d > 0.85 else (3, 2, 4, 1)[ring % 4] if dy < 0.2 else (2, 1, 3, 1)[ring % 4]
                g[y, x] = ('rope', t)
    return {'grid': g, 'anchor': (w // 2, h - 1)}

# ------------------------------------------------------------------ bombs
def bomb(frame=0):
    w, h = 20, 26
    g = grid(w, h)
    cx, cy, r = 10, 17, 8
    for y in range(h):
        for x in range(w):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r:
                lit = (x + 0.5 - cx) * -0.6 + (y + 0.5 - cy) * -0.8
                t = 0 if d > r - 1 else 4 if (lit > 4 and d < 4.5 and lit < 5.6) else 3 if lit > 3 else 2 if lit > -1.5 else 1
                g[y, x] = ('steel', t)
    for x in range(7, 14): g[8, x] = ('steel', 2); g[9, x] = ('steel', 0)      # neck
    for x in range(8, 13): g[7, x] = ('steel', 3)
    fuse = [(10, 6), (11, 5), (11, 4), (12, 3), (13, 2), (13, 1)]
    burnt = frame                                       # the fuse burns down frame by frame
    for i, (x, y) in enumerate(fuse[:len(fuse) - burnt]): g[y, x] = ('rope', 3 if i % 2 else 2)
    if len(fuse) - burnt > 0:
        x, y = fuse[len(fuse) - burnt - 1]
        for dx, dy, t in ((0, 0, 4), (1, 0, 3), (-1, 0, 3), (0, -1, 3), (0, 1, 2), (1, -1, 1 + frame % 2), (-1, -1, 1)):
            if 0 <= x + dx < w and 0 <= y + dy < h: g[y + dy, x + dx] = ('flame', t)
    return {'grid': g, 'anchor': (w // 2, h - 1)}

def boom(frame=0):
    S = 96
    g = grid(S, S)
    c = S / 2
    rad = (18, 34, 42, 46)[frame]
    hole = (0, 0, 22, 38)[frame]                        # the middle burns out first
    for y in range(S):
        for x in range(S):
            a = math.atan2(y + 0.5 - c, x + 0.5 - c)
            rr = rad * (0.82 + 0.18 * math.sin(a * 7 + frame * 1.7) * math.cos(a * 3 - frame))
            d = math.hypot(x + 0.5 - c, y + 0.5 - c)
            if d <= rr and d >= hole * (0.9 + 0.1 * math.sin(a * 5)):
                u = (d - hole) / max(1, rr - hole)
                if frame == 3: g[y, x] = ('smoke', 1 if u > 0.6 else 2) if hsh(x // 3, y // 3, 5) % 3 else None
                else: g[y, x] = ('flame', 4 if u < 0.3 and frame < 2 else 3 if u < 0.6 else 2 if u < 0.85 else 1)
    return {'grid': g, 'anchor': (S // 2, S // 2)}

# ------------------------------------------------------------------ traps
def spikes():
    """Iron spikes on a plate, the plate set into a mound of rubble that reaches down into the floor below
    (the floor's top edge is jagged, so the mound hides the gap). Anchor: the plate's underside, at the floor line."""
    w, top, h = T, 20, 34
    g = grid(w, h)
    for x in range(w):                                  # the rubble mound under the plate, ragged at the bottom
        d = 9 + hsh(x // 3, 21) % 5
        for y in range(top, min(h, top + d)):
            k = y - top
            g[y, x] = ('rockd', 0 if k == d - 1 else 3 if k == 0 else 2 if (x // 6 + k // 4) % 3 else 1)
        if x % 7 == 3: g[top + 2 + hsh(x, 22) % 4, x] = ('rockd', 0)      # joints between the stones
    for x in range(w):                                  # the base plate
        for y in (top - 3, top - 2, top - 1): g[y, x] = ('steel', (2, 1, 0)[y - (top - 3)])
    for k in range(5):
        cx = 5 + k * 9.5
        for y in range(2, top - 3):
            half = (y - 2) * 0.24
            for x in range(int(cx - half - 1), int(cx + half + 2)):
                if abs(x + 0.5 - cx) <= half + 0.6:
                    t = 4 if y < 5 else 3 if x + 0.5 < cx else 1
                    g[y, x] = ('steel', t)
        g[2, int(cx)] = ('steel', 4)
    return {'grid': g, 'anchor': (0, top - 1)}

def arrowtrap():
    """A stern face carved into the rock (laid over the rock texture); its mouth is the slot the arrow flies from (right side)."""
    g = grid(T, T)
    for y in range(8, 42):                              # the carved plaque
        for x in range(8, 44):
            edge = y in (8, 41) or x in (8, 43)
            g[y, x] = ('rockd', 0 if edge else 3 if y < 12 else 2)
    for x0 in (14, 30):                                 # eyes: deep, with a glint
        for y in range(16, 21):
            for x in range(x0, x0 + 7): g[y, x] = ('rockd', 0)
        g[17, x0 + 2] = ('flame', 2)
        for x in range(x0 - 1, x0 + 8): g[14, x] = ('rockd', 1)   # brow
    for y in range(22, 30): g[y, 25] = ('rockd', 1); g[y, 26] = ('rockd', 4)   # nose
    for y in range(32, 37):                             # the mouth slot, open to the right
        for x in range(16, T): g[y, x] = ('rockd', 0) if 33 <= y <= 35 else ('rockd', 1)
    return {'grid': g, 'anchor': (0, 0)}

def arrow():
    w, h = 24, 5
    g = grid(w, h)
    for x in range(3, 20): g[2, x] = ('wood', 3); g[3, x] = ('wood', 1)
    for x, ys in ((20, (0, 1, 2, 3, 4)), (21, (1, 2, 3)), (22, (2,))):
        for y in ys: g[y, x] = ('steel', 4 if y < 2 else 2)
    for x in range(0, 5):                               # fletching
        g[0 + (x > 2), x] = ('quilt', 3); g[4 - (x > 2), x] = ('quilt', 2)
    return {'grid': g, 'anchor': (w // 2, 2)}

def stal():
    w, h = 22, 40
    g = grid(w, h)
    for y in range(h):
        half = 10 * (1 - y / h) ** 1.3
        for x in range(w):
            if abs(x + 0.5 - 11) <= half:
                t = 0 if abs(x + 0.5 - 11) > half - 1 else 3 if x < 9 else 2 if x < 13 else 1
                if y % 9 == 0 and y: t = max(0, t - 1)
                g[y, x] = ('rockd', t)
    return {'grid': g, 'anchor': (11, 0)}


# ------------------------------------------------------------------ growing things and water (the delve's decor)
def _put(g, x, y, v):
    if 0 <= y < g.shape[0] and 0 <= x < g.shape[1]: g[y, x] = v

def vine(n=0):
    """A vine hanging from the ceiling: a stem swaying a little, leaves in pairs, darker towards the tip."""
    L = (46, 64, 34)[n]
    g = grid(16, L + 2)
    x = 7.5
    for y in range(L):
        x += math.sin((y + n * 9) / 7) * 0.35
        X = round(x)
        _put(g, X, y, ('leaf', 1 if y > L * 0.6 else 2))
        if y % 5 == 2 + n % 2:                            # a pair of leaves, the one on the light side lighter
            side = 1 if (y // 5) % 2 else -1
            for k, (dx, dy) in enumerate(((1, 0), (2, 0), (3, 1), (2, 1), (1, 1))):
                _put(g, X + side * dx, y + dy, ('leaf', 4 if side < 0 and k < 2 else 3 if k < 3 else 1))
    _put(g, round(x), L, ('leaf', 3)); _put(g, round(x), L + 1, ('leaf', 1))
    for y in range(3): _put(g, 7, y, ('bark', 1)); _put(g, 8, y, ('bark', 2))
    return {'grid': g, 'anchor': (8, 0)}

def fern(n=0):
    """A fern on the floor: fronds arching out from the middle, leaflets along each frond."""
    g = grid(34, 30)
    fronds = ((-0.95, 15), (-0.5, 21), (-0.12, 25), (0.22, 23), (0.62, 18), (0.98, 13)) if n == 0 else ((-0.8, 14), (-0.3, 20), (0.18, 19), (0.7, 15))
    for a, ln in fronds:
        x, y = 17.0, 29.0
        dx, dy = math.sin(a) * 1.0, -math.cos(a) * 1.0
        for i in range(ln):
            dy += 0.028                                    # the frond bends over under its weight
            x += dx; y += dy
            X, Y = round(x), round(y)
            _put(g, X, Y, ('leaf', 2))
            if i % 2 == 0 and i > 2:                       # leaflets either side, shorter towards the tip
                k = 1 + (ln - i) // 6
                for j in range(1, k + 1):
                    _put(g, X - j, Y - (1 if j > 1 else 0), ('leaf', 4 if j == 1 else 3))
                    _put(g, X + j, Y + (1 if j > 1 else 0), ('leaf', 1))
    for x in range(14, 21): _put(g, x, 29, ('bark', 1))
    return {'grid': g, 'anchor': (17, 29)}

def shrooms(n=0):
    """Cave mushrooms in a clump: pale stems, brown or red caps lit from above."""
    g = grid(30, 20)
    caps = ('clay', 'cream') if n == 0 else ('brick', 'cream')
    for k, (x, h, r) in enumerate(((8, 7, 4), (15, 12, 5.5), (22, 5, 3), (19, 8, 3.5)) if n == 0 else ((10, 9, 5), (18, 6, 3.5), (24, 4, 2.5))):
        for y in range(19 - h, 20): _put(g, x, y, ('cream', 3)); _put(g, x + 1, y, ('cream', 2))
        top = 19 - h
        for yy_ in range(top - round(r * 0.7), top + 1):
            for xx_ in range(round(x - r), round(x + r + 2)):
                if ((xx_ - x - 0.5) / (r + 0.5)) ** 2 + ((yy_ - top) / (r * 0.7 + 0.5)) ** 2 <= 1:
                    t = 4 if yy_ < top - r * 0.35 and xx_ < x else 3 if yy_ < top - 1 else 1
                    _put(g, xx_, yy_, (caps[0], t))
        for xx_ in range(round(x - r) + 1, round(x + r + 1)): _put(g, xx_, top + 1, ('cream', 1))   # gills
        if n == 1: _put(g, x - 1, top - 2, ('cream', 4)); _put(g, x + 2, top - 1, ('cream', 4))     # white spots
    return {'grid': g, 'anchor': (15, 19)}

def tuft(n=0):
    """A tuft of pale cave grass on the top of a block."""
    g = grid(20, 12)
    blades = ((3, 6, -1), (6, 10, 0), (9, 8, 1), (12, 11, 0), (15, 7, 1), (17, 5, 1))[n % 2::1 + n % 2]
    for x, h, lean in blades:
        for i in range(h):
            X = x + round(lean * i * i / (h * 2.2))
            _put(g, X, 11 - i, ('moss', 4 if i > h - 3 else 3 if i > 2 else 2))
    return {'grid': g, 'anchor': (10, 11)}

def mosstop():
    """Moss over the top of a block, a few strands hanging over its edge."""
    g = grid(T, 10)
    for x in range(T):
        h = 3 + (hsh(x // 3, 5) % 3)
        for y in range(h): _put(g, x, 9 - y, ('moss', 4 if y == h - 1 else 3 if y == h - 2 else 2))
    return {'grid': g, 'anchor': (0, 6)}

def bones():
    """An old skull and two bones on the floor."""
    g = grid(28, 12)
    for (x, y) in ((4, 10), (5, 10), (6, 10), (7, 10), (8, 10), (9, 10), (10, 10), (11, 10)):
        _put(g, x, y, ('cream', 3)); _put(g, x, y + 1, ('cream', 1))
    for x, y in ((3, 9), (3, 11), (12, 9), (12, 11)): _put(g, x, y, ('cream', 3))
    for k in range(7):                                     # a second bone lying across
        _put(g, 14 + k, 11 - k // 2, ('cream', 2 + (k % 2)))
    for y in range(2, 12):                                 # the skull
        for x in range(17, 27):
            if ((x - 21.5) / 5) ** 2 + ((y - 6.5) / 5) ** 2 <= 1: _put(g, x, y, ('cream', 4 if y < 5 and x < 22 else 3 if y < 9 else 2))
    for x, y in ((19, 6), (20, 6), (23, 6), (24, 6), (21, 8), (22, 8)): _put(g, x, y, ('bark', 0))
    for x in (19, 21, 23): _put(g, x, 10, ('cream', 1))
    return {'grid': g, 'anchor': (14, 11)}

def puddle(frame=0):
    """A puddle on the floor where the drips land; a glint wanders over it."""
    g = grid(40, 4)
    for x in range(40):
        d = 3 if 4 <= x < 36 else 2 if 2 <= x < 38 else 1
        for y in range(4 - d, 4): _put(g, x, y, ('water', 2 if y == 4 - d else 1))
    for k in range(3):
        gx = 6 + (frame * 7 + k * 11) % 28
        _put(g, gx, 1, ('water', 4)); _put(g, gx + 1, 1, ('water', 3))
    return {'grid': g, 'anchor': (20, 3)}

def glowworms(n=0):
    """Glow-worm threads hanging from the ceiling, a bead of light at each end."""
    g = grid(24, 40)
    for k, (x, L) in enumerate(((3, 22), (8, 34), (12, 16), (17, 28), (21, 12)) if n == 0 else ((5, 18), (11, 30), (18, 24))):
        for y in range(L): _put(g, x, y, ('cream', 1 if y % 3 else 2))
        _put(g, x, L, ('glow', 4)); _put(g, x, L + 1, ('glow', 3)); _put(g, x, L - 1, ('glow', 2))
        if L > 20: _put(g, x, L // 2, ('glow', 3))
    return {'grid': g, 'anchor': (12, 0)}

def drop():
    """One drop of water falling (the game moves it)."""
    g = grid(3, 5)
    for (x, y, t) in ((1, 0, 2), (1, 1, 3), (0, 2, 2), (1, 2, 4), (2, 2, 3), (0, 3, 2), (1, 3, 3), (2, 3, 2), (1, 4, 1)): g[y, x] = ('water', t)
    return {'grid': g, 'anchor': (1, 4)}

# ------------------------------------------------------------------ loot of a run (found in the cave, lost at the end)
R['bronze'] = ['#3a2410', '#6a4420', '#a06c30', '#d0a050', '#f0d890']
R['parch'] = ['#5a4430', '#8e7456', '#c4a982', '#e6d3ac', '#fbf0d6']
R['ruby'] = ['#3a0a14', '#7a1626', '#c02a3a', '#f0606a', '#ffc0c0']
R['sky'] = ['#10204a', '#1e3e80', '#3a6ec0', '#76a8e8', '#d0e8ff']
R['honey'] = ['#4a2a08', '#8a5410', '#d0901e', '#f0c040', '#fff0a0']
SEALS = {'light': 'honey', 'quake': 'clay', 'mend': 'ruby', 'stone': 'steel', 'blink': 'sky'}

def coin(frame=0):
    """A cave coin turning: old bronze with a hole in the middle (10 x 10, 4 frames)."""
    g = grid(10, 10)
    half = (4.5, 3.2, 1.2, 3.2)[frame % 4]
    for y in range(10):
        for x in range(10):
            dx, dy = (x + 0.5 - 5) / half, (y + 0.5 - 5) / 4.6
            if dx * dx + dy * dy <= 1:
                t = 0 if dx * dx + dy * dy > 0.7 else 4 if dx < -0.3 and dy < 0 else 3 if dy < 0.3 else 2
                g[y, x] = ('bronze', t)
    if frame % 4 != 2: g[4, 5] = ('bronze', 0); g[5, 5] = ('bronze', 0)
    return {'grid': g, 'anchor': (5, 9)}

def chest(frame=0):
    """A wooden chest with iron bands; frame 1 open, gold light from inside (30 x 26, anchor bottom middle)."""
    w, h = 30, 26
    g = grid(w, h)
    body = 14
    for y in range(h - body, h):                        # the box
        for x in range(1, w - 1):
            t = 0 if x in (1, w - 2) or y == h - 1 else 3 if y == h - body else 2 if (y - (h - body)) % 4 else 1
            g[y, x] = ('wood', t)
    for x0 in (5, w - 7):                               # iron bands
        for y in range(h - body, h):
            g[y, x0] = ('steel', 3); g[y, x0 + 1] = ('steel', 1)
    if frame == 0:
        for y in range(h - body - 7, h - body):         # the lid, rounded
            for x in range(1, w - 1):
                if (y - (h - body - 7)) * 6 + 1 >= abs(x + 0.5 - w / 2) ** 2 / 40:
                    g[y, x] = ('wood', 4 if y == h - body - 7 + 1 else 3)
        for x in range(1, w - 1): g[h - body - 1, x] = ('wood', 0)
        for x0 in (5, w - 7):
            for y in range(h - body - 6, h - body): g[y, x0] = ('steel', 4); g[y, x0 + 1] = ('steel', 2)
        for y in range(h - body - 2, h - body + 3):    # the lock
            for x in range(13, 17): g[y, x] = ('gold', 3 if y < h - body + 1 else 1)
        g[h - body + 1, 14] = ('steel', 0)
    else:
        for y in range(0, h - body - 3):                # the lid thrown back, standing behind the box
            for x in range(2, w - 2):
                g[y, x] = ('wood', 0 if x in (2, w - 3) or y == 0 else 1 if y % 4 else 2)
        for y in range(h - body - 4, h - body + 2):     # gold light spilling out
            for x in range(3, w - 3):
                g[y, x] = ('gold', 4 if y < h - body - 1 else 3)
    return {'grid': g, 'anchor': (w // 2, h - 1)}

def scroll(kind):
    """A rolled scroll tied with a cord, the wax seal shows what it does (16 x 18)."""
    g = grid(16, 18)
    for y in range(2, 16):
        for x in range(3, 13):
            g[y, x] = ('parch', 4 if x < 6 else 3 if x < 10 else 2)
    for y in (1, 16):                                   # the rolled ends
        for x in range(2, 14): g[y, x] = ('parch', 1)
    for x in range(2, 14): g[0, x] = ('parch', 2); g[17, x] = ('parch', 0)
    for y in range(7, 11):
        for x in range(3, 13): g[y, x] = ('bark', 2 if y in (7, 10) else 3)   # the cord
    seal = SEALS[kind]
    for y in range(6, 13):
        for x in range(5, 12):
            if (x - 8) ** 2 + (y - 9) ** 2 <= 9: g[y, x] = (seal, 4 if x < 8 and y < 9 else 3 if (x - 8) ** 2 + (y - 9) ** 2 <= 4 else 1)
    return {'grid': g, 'anchor': (8, 17)}

def boots():
    """Swift boots: soft leather, a little wing on the cuff (18 x 16)."""
    g = grid(18, 16)
    for y in range(2, 16):
        for x in range(3, 10):
            g[y, x] = ('clay', 0 if x == 3 or y == 15 else 3 if x < 6 else 2)
    for y in range(11, 16):
        for x in range(9, 17):
            g[y, x] = ('clay', 0 if y == 15 or x == 16 else 3 if y == 11 else 2)
    for x in range(3, 10): g[2, x] = ('cream', 3); g[3, x] = ('cream', 2)
    for k, (x, y) in enumerate(((1, 3), (0, 2), (1, 4), (0, 4), (2, 5))): g[y, x] = ('cream', 4 if k < 2 else 3)
    return {'grid': g, 'anchor': (9, 15)}

def spring():
    """Spring heels: a steel coil under a boot heel (12 x 16)."""
    g = grid(12, 16)
    for y in range(0, 5):
        for x in range(1, 11): g[y, x] = ('clay', 0 if y == 4 or x in (1, 10) else 3 if y == 0 else 2)
    for k in range(5):
        y = 6 + k * 2
        for x in range(2, 10): g[y, x] = ('steel', 4 if x < 5 else 3 if x < 8 else 1)
        g[y + 1, 9 if k % 2 else 2] = ('steel', 2)
    for x in range(1, 11): g[15, x] = ('steel', 1)
    return {'grid': g, 'anchor': (6, 15)}

def heartgem():
    """A heart crystal: a red crystal in the shape of a heart, it glows (16 x 15)."""
    g = grid(16, 15)
    for y in range(15):
        for x in range(16):
            px, py = x + 0.5, y + 0.5
            lobe = (px - 4.6) ** 2 + (py - 4.6) ** 2 <= 14.5 or (px - 11.4) ** 2 + (py - 4.6) ** 2 <= 14.5
            tip = py >= 4.6 and abs(px - 8) <= 7.6 * (1 - (py - 4.6) / 10)
            if lobe or tip:
                t = 4 if px < 6 and py < 6 else 3 if px < 8 else 2 if py < 10 else 1
                g[y, x] = ('ruby', t)
    for y in range(15):                                  # facet line down the middle
        if g[y, 8] is not None and y > 3: g[y, 8] = ('ruby', 1)
    g[3, 4] = ('cream', 4)
    return {'grid': g, 'anchor': (8, 14)}

def whetstone():
    """A whetstone, grey, oiled on top (18 x 10)."""
    g = grid(18, 10)
    for y in range(2, 10):
        for x in range(1, 17):
            g[y, x] = ('steel', 0 if y == 9 or x in (1, 16) else 4 if y == 2 else 3 if y < 5 else 2)
    for x in (5, 6, 11): g[3, x] = ('sky', 3)
    return {'grid': g, 'anchor': (9, 9)}

def feather():
    """A feather charm on a cord (10 x 18)."""
    g = grid(10, 18)
    for y in range(1, 16):
        cx = 5 + (y - 8) * 0.15
        half = 3.4 * math.sin(math.pi * y / 17)
        for x in range(10):
            if abs(x + 0.5 - cx) <= half: g[y, x] = ('cream', 4 if x + 0.5 < cx else 3)
        g[y, round(cx)] = ('cream', 1)
    for y in range(15, 18): g[y, 5] = ('bark', 3)
    return {'grid': g, 'anchor': (5, 17)}

R.setdefault('smoke', ['#1e1a20', '#3a3238', '#5e5458', '#8a7e7e', '#b4a8a2'])

DELVE = {'delve_rocktex': rocktex, 'delve_wall': wall, 'delve_ladder': ladder,
         'delve_rope': lambda: rope_seg(False), 'delve_rope_end': lambda: rope_seg(True), 'delve_hook': hook,
         'delve_ropes': coil, 'delve_bomb': bomb, 'delve_boom': boom, 'delve_spikes': spikes,
         'delve_arrowtrap': arrowtrap, 'delve_arrow': arrow, 'delve_stal': stal,
         'delve_vine_0': lambda: vine(0), 'delve_vine_1': lambda: vine(1), 'delve_vine_2': lambda: vine(2),
         'delve_fern_0': lambda: fern(0), 'delve_fern_1': lambda: fern(1),
         'delve_shrooms_0': lambda: shrooms(0), 'delve_shrooms_1': lambda: shrooms(1),
         'delve_tuft_0': lambda: tuft(0), 'delve_tuft_1': lambda: tuft(1), 'delve_mosstop': mosstop, 'delve_bones': bones,
         'delve_puddle': puddle, 'delve_glowworms_0': lambda: glowworms(0), 'delve_glowworms_1': lambda: glowworms(1),
         'delve_drop': drop, 'delve_coin': coin, 'delve_chest_0': lambda: chest(0), 'delve_chest_1': lambda: chest(1),
         'delve_scroll_light': lambda: scroll('light'), 'delve_scroll_quake': lambda: scroll('quake'), 'delve_scroll_mend': lambda: scroll('mend'),
         'delve_scroll_stone': lambda: scroll('stone'), 'delve_scroll_blink': lambda: scroll('blink'),
         'delve_boots': boots, 'delve_spring': spring, 'delve_heartgem': heartgem, 'delve_whetstone': whetstone, 'delve_feather': feather}

if __name__ == '__main__':
    from PIL import Image
    from rock import DEPTHS
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    pal = dict(R); pal['rockd'] = DEPTHS[1]
    sprites = []
    for name, f in DELVE.items():
        import inspect
        fs = [f(i) for i in range(4)] if 'frame' in inspect.signature(f).parameters else [f()]
        sprites += fs
    W_ = sum(s['grid'].shape[1] + 4 for s in sprites); H_ = max(s['grid'].shape[0] for s in sprites)
    im = Image.new('RGBA', (W_, H_), (24, 20, 28, 255)); px = im.load(); ox = 0
    for s in sprites:
        g = s['grid']
        for y in range(g.shape[0]):
            for x in range(g.shape[1]):
                v = g[y, x]
                if v is None: continue
                c = pal[v[0]][v[1]]
                px[ox + x, y] = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
        ox += g.shape[1] + 4
    im = im.resize((W_ * 3, H_ * 3), Image.NEAREST); im.save(f'{out}/delve_x3.png'); print(f'{out}/delve_x3.png')
