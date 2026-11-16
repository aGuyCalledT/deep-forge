# Block 11: the delve (static/js/delve/), the adventurer's run through the mine. Tiles are 48 x 48. Rock uses the
# placeholder 'rockd' (the game swaps it for the layer's rock), so every layer gets its own stone.
#   delve_block        4 frames: one block of solid rock, chunks with joints, lit from the top left (48 x 48, anchor top left)
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
def block(frame=0):
    """A block of rock: a few chunks, a dark joint between them, lit top and left rims."""
    g = grid(T, T)
    ids = voronoi(T, T, 18, 16, 40 + frame, wrap=False)
    b = blocks(ids, 'rockd', lambda i: (2, 2, 3, 1)[hsh(i, frame) % 4], wrap=False)
    for y in range(T):
        for x in range(T):
            g[y, x] = b[y, x] if b[y, x] is not None else ('rockd', 2)
    for k in range(3 + frame % 2):                      # a few pits and scratches where picks have been
        x, y = 6 + hsh(frame, k) % 36, 6 + hsh(frame, k, 3) % 36
        g[y, x] = ('rockd', 0); g[y, x + 1] = ('rockd', 1)
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
    w, h = T, 20
    g = grid(w, h)
    for x in range(w):                                  # the base plate
        for y in (h - 3, h - 2, h - 1): g[y, x] = ('steel', (2, 1, 0)[y - (h - 3)])
    for k in range(5):
        cx = 5 + k * 9.5
        for y in range(2, h - 3):
            half = (y - 2) * 0.24
            for x in range(int(cx - half - 1), int(cx + half + 2)):
                if abs(x + 0.5 - cx) <= half + 0.6:
                    t = 4 if y < 5 else 3 if x + 0.5 < cx else 1
                    g[y, x] = ('steel', t)
        g[2, int(cx)] = ('steel', 4)
    return {'grid': g, 'anchor': (0, h - 1)}

def arrowtrap():
    """A block of rock with a stern carved face; its mouth is the slot the arrow flies from (right side)."""
    b = block(1)['grid']
    g = grid(T, T)
    for y in range(T):
        for x in range(T): g[y, x] = b[y, x]
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

R.setdefault('smoke', ['#1e1a20', '#3a3238', '#5e5458', '#8a7e7e', '#b4a8a2'])

DELVE = {'delve_block': block, 'delve_wall': wall, 'delve_ladder': ladder,
         'delve_rope': lambda: rope_seg(False), 'delve_rope_end': lambda: rope_seg(True), 'delve_hook': hook,
         'delve_ropes': coil, 'delve_bomb': bomb, 'delve_boom': boom, 'delve_spikes': spikes,
         'delve_arrowtrap': arrowtrap, 'delve_arrow': arrow, 'delve_stal': stal}

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
