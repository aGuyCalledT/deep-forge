# Block 9: ways. Stairwell doors, hallway frames and arches, and things for the entrance hall, in the scale of the
# 48 x 64 dwarves (cell 48 px, room 144 px high, floor at y 135).
#   stairdoor, stairdoor_stone, stairdoor_grand   4 frames: shut, ajar, half open, open (dark stairs going up)
#   gallery     timber frame for a hallway cell: post on the left edge, lintel across the whole cell (48 x 135)
#   arcade, arcade_grand   stone arch over a hallway cell, half a pier on each side (48 x 135)
#   statue      a dwarf in stone with a hammer, on a plinth
#   runeplate   small brass plate with runes over a door (hangs from its top)
#   walldoor, walldoor_stone, walldoor_grand   pillar in front of the wall between two rooms, with a door at its
#               foot, 4 frames like the stairwell doors (32 x 144, anchor at the middle of the foot)
#   wall_hewn   tile 96 x 144: rock cut back in courses, chisel strokes slanting the same way in each course
#   python3 ways.py <out dir>     a preview of every piece (ways_x3.png)
import sys, os
from ambient import *
from shells import grid, blocks, hsh, voronoi, beam, pick, floor_into, floor_flags, floor_earth, floor_planks

# ------------------------------------------------------------------ stairwell doors
OPEN = [1.0, 0.62, 0.3, 0.08]      # how much of the doorway the leaf still covers, per frame


def stairs_behind(p, inner, a, b):
    """The dark behind an open door: steps going up and away to the right, the lowest catch a little light."""
    idx = np.full((H, W), 0)
    for y, x in zip(*np.nonzero(inner)):
        s = (x - a) // 5                     # step number from the left
        top = GROUND - 1 - 5 * s
        if y >= top:
            light = max(0, 3 - (GROUND - y) // 12)
            idx[y, x] = min(3, light + (1 if y == top else 0)) if y < GROUND - 0 else 1
        else:
            idx[y, x] = 0
    p.fill(inner, 'rock', idx=idx, outline=False)


def leaf_planks(p, m, x0, x1, frac, ramp='wood', bands=(), studs=False, flip=False):
    """A door leaf over mask m between x0 and x1; it turns away from the light as it opens (darker, narrower)."""
    if not m.any(): return
    idx = np.full((H, W), 2)
    w = max(1, x1 - x0 + 1)
    for y, x in zip(*np.nonzero(m)):
        u = (x - x0) / w if not flip else (x1 - x) / w
        k = int(u * 4)                       # four planks on the full leaf
        edge = abs(u * 4 - round(u * 4)) * w / 4 < 0.6
        t = 1 if edge and frac > 0.5 else 2
        if frac > 0.5 and k == 0 and not flip and not edge and x == x0: t = 3
        if (x * 5 + y * 11) % 31 == 0 and t == 2: t = 1                 # grain
        if frac < 0.7: t = max(0, t - 1)                                 # turned away from the room's light
        idx[y, x] = t
    p.fill(m, ramp, idx=idx, outline=False)
    for yb in bands:
        band = m & (yy >= yb) & (yy <= yb + 1)
        p.fill(band, 'iron', idx=np.where(yy == yb, 3 if frac > 0.5 else 2, 1), outline=False)
        if studs:
            for y, x in zip(*np.nonzero(band & (yy == yb))):
                if (x - x0) % 4 == 1: p.c[y, x] = ('gold', 4 if frac > 0.5 else 3)
    # the free edge of the leaf: a dark line, so it reads as a board standing in the doorway
    for y, x in zip(*np.nonzero(m)):
        if (not flip and x == x1) or (flip and x == x0): p.c[y, x] = (ramp, 0)


def stairdoor(frame=0):
    """Timber: a plank door in a frame of squared posts under a lintel."""
    p = Part()
    a, b, top = 36, 59, 41
    inner = rect_m(a, top, b, 95)
    stairs_behind(p, inner, a, b)
    frac = OPEN[frame % 4]
    lw = int(round((b - a + 1) * frac))
    leaf = inner & (xx < a + lw)
    leaf_planks(p, leaf, a, a + lw - 1, frac, 'wood', bands=(48, 84))
    if frac > 0.5:                                                      # latch and a ring
        p.c[70, a + lw - 4] = ('iron', 4); p.c[71, a + lw - 4] = ('iron', 1)
    # frame
    for x0 in (31, 60):
        m = rect_m(x0, top - 1, x0 + 4, 95)
        p.fill(m, 'oak', idx=faces(m, 0))
    lint = rect_m(27, top - 7, 68, top - 2)
    p.fill(lint, 'oak', idx=faces(lint, 2))
    for x in (29, 66): p.c[top - 5, x] = ('iron', 4)
    for (xa, sgn) in ((36, 1), (59, -1)):                               # braces in the top corners
        for i in range(5): p.c[top + i, xa + sgn * i] = ('oak', 3); p.c[top + i + 1, xa + sgn * i] = ('oak', 1)
    return crop(p)


def arch_mask(cx, spring, r, a, b):
    return (rect_m(a, spring, b, 95) | ell(cx, spring + 0.5, r, r)) & (yy >= spring - r)


def stone_ring(p, outer, inner, ramp, key_ramp=None, cx=48, spring=52):
    sm = outer & ~inner
    si = np.full((H, W), 2)
    for y, x in zip(*np.nonzero(sm)):
        ang = math.atan2(y - spring, x - cx)
        if y < spring:
            blk = int((ang + math.pi) / (math.pi / 7))
            si[y, x] = 3 if blk % 2 else 2
            if abs(((ang + math.pi) / (math.pi / 7)) % 1) < 0.1: si[y, x] = 1
        else:
            blk = (y - spring) // 8
            si[y, x] = 3 if (blk + (x > cx)) % 2 else 2
            if (y - spring) % 8 == 7: si[y, x] = 1
        if x < cx - 14 and si[y, x] > 1: si[y, x] = min(4, si[y, x] + 1)          # lit from the left
    p.fill(sm, ramp, idx=si)
    if key_ramp:
        key = sm & (xx >= cx - 3) & (xx <= cx + 2) & (yy < spring - 8)
        p.fill(key, key_ramp, idx=np.where(yy == yy[key].min() if key.any() else 0, 4, 3))


def stairdoor_stone(frame=0):
    """Stone: an arched doorway of dressed blocks, an oak door with iron bands."""
    p = Part()
    cx, spring, a, b = 48, 52, 36, 59
    inner = arch_mask(cx, spring, 12, a, b)
    outer = arch_mask(cx, spring, 17, a - 5, b + 5)
    stairs_behind(p, inner, a, b)
    frac = OPEN[frame % 4]
    lw = int(round((b - a + 1) * frac))
    leaf = inner & (xx < a + lw)
    leaf_planks(p, leaf, a, a + lw - 1, frac, 'oak', bands=(56, 84))
    if frac > 0.5:
        ring = (((xx + 0.5 - (a + lw - 5)) ** 2 + (yy + 0.5 - 72) ** 2) <= 5.5) & (((xx + 0.5 - (a + lw - 5)) ** 2 + (yy + 0.5 - 72) ** 2) >= 1.8)
        p.fill(ring, 'iron', bias=0.1, outline=False)
    stone_ring(p, outer, inner, 'sand')
    sill = rect_m(a - 6, 94, b + 6, 95)
    p.fill(sill, 'sand', idx=faces(sill, 1))
    return crop(p)


def stairdoor_grand(frame=0):
    """Grand: a tall double door under a round arch, iron studs, brass rings, a gold keystone."""
    p = Part()
    cx, spring, a, b = 48, 46, 33, 62
    inner = arch_mask(cx, spring, 15, a, b)
    outer = arch_mask(cx, spring, 21, a - 6, b + 6)
    stairs_behind(p, inner, a, b)
    frac = OPEN[frame % 4]
    half = (b - a + 1) // 2
    lw = int(round(half * frac))
    left = inner & (xx < a + lw)
    right = inner & (xx > b - lw)
    leaf_planks(p, left, a, a + lw - 1, frac, 'oak', bands=(54, 70, 86), studs=True)
    leaf_planks(p, right, b - lw + 1, b, frac, 'oak', bands=(54, 70, 86), studs=True, flip=True)
    if frac > 0.5:
        for x in (cx - 4, cx + 3):
            ring = (((xx + 0.5 - x) ** 2 + (yy + 0.5 - 76) ** 2) <= 6) & (((xx + 0.5 - x) ** 2 + (yy + 0.5 - 76) ** 2) >= 2)
            p.fill(ring, 'gold', bias=0.15, outline=False)
    stone_ring(p, outer, inner, 'stone', key_ramp='gold', spring=spring)
    for x0 in (a - 9, b + 6):                                           # plinths at the foot of the jambs
        m = rect_m(x0, 86, x0 + 3, 95)
        p.fill(m, 'stone', idx=faces(m, 1))
    sill = rect_m(a - 9, 94, b + 9, 95)
    p.fill(sill, 'stone', idx=faces(sill, 1))
    return crop(p)


def runeplate():
    """A brass plate over a stairwell door: three runes, two rivets; hangs from its top edge."""
    p = Part()
    m = rect_m(39, 40, 56, 48)
    p.fill(m, 'gold', idx=faces(m, 1))
    for x in (40, 55): p.c[44, x] = ('gold', 4)
    runes = ['x.x..xxx..x.x', '.x...x.x..xx.', 'x.x..x.x..x.x', '.x...xxx..x..']
    for j, row in enumerate(runes):
        for i, ch in enumerate(row):
            if ch == 'x': p.c[42 + j, 42 + i] = ('gold', 0)
    return crop(p, anchor_y=40)


# ------------------------------------------------------------------ hallway frames (own grids, 48 wide, floor 135)
def gallery():
    """Timber support for a hallway cell: a squared post at the left edge, a lintel over the whole cell, a brace."""
    g = grid(CELL, FLOOR)
    beam(g, 0, 22, CELL - 1, 28)                                       # lintel (meets the next cell's lintel)
    beam(g, 1, 29, 6, FLOOR - 1, horiz=False)                          # post
    for i in range(9):                                                 # brace from post to lintel
        for t in range(3): g[29 + i + t - 1 + 1, 7 + i] = ('oak', 3 if t == 0 else 1 if t == 2 else 2)
    for x in (2, 5): g[25, x] = ('iron', 4); g[26, x] = ('iron', 1)    # cleats
    for x in range(1, 7): g[FLOOR - 3, x] = ('oak', 1)                 # foot of the post, a little worn
    for y in range(0, 22):                                             # the post goes on up into the rock
        g[y, 2] = ('oak', 2); g[y, 3] = ('oak', 2); g[y, 4] = ('oak', 1)
    return {'grid': g, 'anchor': (3, FLOOR)}


def arcade_of(ramp, key=None):
    """A stone arch over a hallway cell: half a pier at each edge (two cells make a whole pier), voussoirs."""
    g = grid(CELL, FLOOR)
    cx, spring, r, ring = CELL / 2, 42, 17, 6
    ids = np.full((FLOOR, CELL), -1)
    for y in range(FLOOR):
        for x in range(CELL):
            if x < 6 or x >= CELL - 6:                                 # piers
                ids[y, x] = 900 + (x >= CELL - 6) * 50 + (y // 14 if y < FLOOR - 8 else 40)
            elif y < spring:
                d = math.hypot(x + 0.5 - cx, y + 0.5 - spring)
                if r < d <= r + ring:
                    a = math.atan2(spring - y - 0.5, x + 0.5 - cx)
                    ids[y, x] = 50 + int(a / (math.pi / 7))
                elif d > r + ring and y >= spring - r - ring - 3:
                    ids[y, x] = 700 + (x >= cx)                        # spandrels
    base = lambda i: 3 if i == 53 else 2 if i >= 700 and i < 900 else pick(2, 2, 3)(i)
    rim = blocks(ids, ramp, base, wrap=False)
    for y, x in zip(*np.nonzero(ids >= 0)): g[y, x] = rim[y, x]
    for y in range(FLOOR):                                             # pier faces: lit left edge, dark right edge
        g[y, 0] = (ramp, 3); g[y, CELL - 1] = (ramp, 1)
    for x in list(range(6)) + list(range(CELL - 6, CELL)):             # capital and plinth bands
        g[spring - 1, x] = (ramp, 4); g[spring, x] = (ramp, 1); g[FLOOR - 9, x] = (ramp, 3)
    top = spring - r - ring - 3
    for x in range(6, CELL - 6): g[top, x] = (ramp, 4 if g[top, x] else 3)   # cornice over the spandrels
    for y in range(1, spring):                                         # soffit: one dark row under the ring
        for x in range(6, CELL - 6):
            if ids[y, x] < 0 and 50 <= ids[y - 1, x] < 700: g[y, x] = (ramp, 0)
    if key:
        for y in range(spring - r - ring, spring - r):
            for x in (23, 24): g[y, x] = (key, 4 if y == spring - r - ring else 3)
    return {'grid': g, 'anchor': (CELL // 2, FLOOR)}


def arcade(): return arcade_of('stone')
def arcade_grand(): return arcade_of('sand', key='gold')


# ------------------------------------------------------------------ entrance hall
def seam(p, m, ramp, t=1):
    """An inner line where part m meets something already drawn (beard on robe, hands on haft)."""
    for y, x in zip(*np.nonzero(m)):
        for dx, dy in ((1, 0), (-1, 0), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not m[ny, nx] and p.c[ny, nx] is not None:
                p.c[y, x] = (ramp, t); break


def statue():
    """A dwarf of stone on a plinth, both hands on a great hammer standing in front of him."""
    p = Part()
    for (x0, y0, x1, y1, tr) in ((33, 91, 62, 95, 1), (35, 79, 60, 90, 2), (33, 76, 62, 78, 1)):
        m = rect_m(x0, y0, x1, y1)
        p.fill(m, 'sand', idx=faces(m, tr))
    for x in range(40, 56, 4): p.c[84, x] = ('sand', 1); p.c[84, x + 1] = ('sand', 1)   # runes cut in the die
    robe = poly([(39, 50), (57, 50), (60, 76), (36, 76)]) | ell(41, 52, 4, 4) | ell(55, 52, 4, 4)
    p.fill(robe, 'stone', bias=-0.1)
    for x in (44, 52): p.fill(rect_m(x, 66, x, 75), 'stone', idx=np.full((H, W), 1), outline=False)   # folds
    p.fill(rect_m(38, 63, 58, 64), 'stone', idx=np.where(yy == 63, 3, 1), outline=False)               # belt
    # hammer: haft, head resting on the plinth
    haft = cap((48, 49), (48, 70), 1.0)
    p.fill(haft, 'stone', idx=np.where(xx < 48, 3, 1), outline=False)
    hm = rect_m(42, 69, 54, 75)
    p.fill(hm, 'stone', idx=faces(hm, 1)); seam(p, hm, 'stone', 0)
    for s_, sh in ((-1, (41, 53)), (1, (55, 53))):                                      # arms to the haft
        arm = cap(sh, (48 + s_ * 2.5, 58), 2.3)
        p.fill(arm, 'stone', bias=0.1 if s_ < 0 else -0.05, outline=False); seam(p, arm, 'stone', 1)
    hands = ell(48, 58, 3.6, 2.4)
    p.fill(hands, 'stone', bias=0.25, outline=False); seam(p, hands, 'stone', 1)
    beard = poly([(43, 45), (53, 45), (53, 50), (48, 56), (43, 50)])
    p.fill(beard, 'stone', bias=0.3, outline=False); seam(p, beard, 'stone', 1)
    for y in (48, 51): p.c[y, 46] = ('stone', 2); p.c[y, 50] = ('stone', 2)
    face = ell(48, 42, 5, 4.5) & (yy <= 45)
    p.fill(face, 'stone', bias=0.2)
    p.c[42, 46] = ('stone', 0); p.c[42, 50] = ('stone', 0); p.c[44, 48] = ('stone', 2)  # eyes, nose
    helm = ell(48, 39, 7, 5) & (yy <= 39)
    p.fill(helm, 'iron', bias=0.0)
    p.fill(rect_m(41, 39, 55, 40), 'iron', idx=np.where(yy == 39, 3, 1), outline=False)
    for s_ in (-1, 1):                                                                 # horns
        p.fill(cap((48 + s_ * 6.5, 37), (48 + s_ * 9, 33), 1.0), 'cream', bias=0.1)
    return crop(p)


def wall_hewn():
    """Rock cut back with picks: courses of rough rock ~16 px high, each with chisel strokes slanting one way."""
    g = grid(96, RH)
    for y in range(RH):
        course = y // 16
        for x in range(96):
            ledge = y % 16
            t = 2
            if ledge == 0: t = 1                                       # the seam between two courses
            elif ledge == 1: t = 3                                     # the lit top of the course below the seam
            # chisel strokes: short slanted cuts, lined up in the course, slant changes from course to course
            s = 1 if course % 2 else -1
            u = (x + s * ledge * 0.5 + hsh(course, 3) % 11) % 7
            if 3 <= ledge <= 13 and u < 1 and hsh(x // 7, course, 5) % 3: t = 1
            if 3 <= ledge <= 13 and 1 <= u < 2 and hsh(x // 7, course, 5) % 3: t = 3
            g[y, x] = ('rock', t)
    for course in range(RH // 16):                                     # a few bigger spalls where a slab came away
        for k in range(2):
            h = hsh(course, k, 19)
            if h % 3: continue
            x0, y0 = h // 3 % 90, course * 16 + 4
            for dy in range(5):
                for dx in range(8 - dy):
                    X = (x0 + dx + dy // 2) % 96
                    g[y0 + dy, X] = ('rock', 1 if dy == 4 or dx == 7 - dy else 2)
                g[y0, (x0 + dy) % 96] = ('rock', 3)
    return g


# ------------------------------------------------------------------ pillar with a door, between two rooms
# Drawn in front of everything where a wall parts two rooms (or a room and a hallway): the wall seen end-on as a
# pillar, with a door at its foot that opens while a dwarf goes through. 32 x 144, anchor at the middle of the foot
# (the cell edge, the bottom of the floor). 4 frames like the stairwell doors: shut, ajar, half open, open.
PW = 32
DA, DB, DSPRING, DR = 8, 23, 90, 8          # doorway: x DA..DB, round top springs at y DSPRING
def door_mask():
    m = np.zeros((RH, PW), bool)
    for y in range(RH):
        for x in range(PW):
            if DA <= x <= DB and DSPRING <= y < FLOOR: m[y, x] = True
            elif y < DSPRING and (x + 0.5 - 16) ** 2 + (y + 0.5 - DSPRING) ** 2 <= DR * DR: m[y, x] = True
    return m
def door_in(g, frame, leaf='oak', studs=None):
    """The dark of the next room behind the doorway, and the leaf, narrower and darker the further it is open."""
    m = door_mask()
    for y, x in zip(*np.nonzero(m)): g[y, x] = ('rock', 1 if y >= FLOOR - 5 else 0)
    frac = OPEN[frame % 4]
    lw = int(round((DB - DA + 1) * frac))
    for y, x in zip(*np.nonzero(m)):
        if x >= DA + lw: continue
        u = x - DA
        t = 1 if u % 4 == 3 else 2
        if u == 0 and frac > 0.5: t = 3
        if y in (DSPRING + 6, FLOOR - 9): t = None
        if t is None: g[y, x] = ('iron', 3 if frac > 0.5 else 2)
        else:
            if frac < 0.7: t = max(0, t - 1)
            g[y, x] = (leaf, t)
        if studs and y in (DSPRING + 6, FLOOR - 9) and u % 4 == 1: g[y, x] = (studs, 4 if frac > 0.5 else 3)
        if x == DA + lw - 1: g[y, x] = (leaf, 0)                     # the free edge of the leaf
    if frac > 0.5:
        hx = DA + lw - 4; g[FLOOR - 26, hx] = ('iron', 4); g[FLOOR - 25, hx] = ('iron', 1)
def silhouette(g, ramp):
    """A dark edge down both sides, the left one lit just inside (light from the top left)."""
    for y in range(RH):
        xs = [x for x in range(PW) if g[y, x] is not None]
        if not xs: continue
        a, b = xs[0], xs[-1]
        g[y, a] = (ramp, 0); g[y, b] = (ramp, 0)
        if g[y, a + 1] is not None and g[y, a + 1][0] == ramp: g[y, a + 1] = (ramp, min(4, g[y, a + 1][1] + 1))
def walldoor_of(ramp, leaf, key=None, frame=0):
    g = grid(PW, RH)
    ids = np.full((RH, PW), -1)
    dm = door_mask()
    for y in range(RH):
        for x in range(PW):
            if y < 8: ids[y, x] = 900                                  # capital, into the ceiling
            elif y >= FLOOR - 8: ids[y, x] = 901 + (y >= FLOOR)        # plinth, down over the floor
            elif 2 <= x <= 29:
                d = math.hypot(x + 0.5 - 16, y + 0.5 - DSPRING)
                if y < DSPRING and DR < d <= DR + 4:                       # voussoirs round the door
                    ids[y, x] = 50 + int(math.atan2(DSPRING - y - 0.5, x + 0.5 - 16) / (math.pi / 5))
                else:
                    row = (y - 8) // 12
                    split = 16 + (5 if row % 2 else -5)
                    ids[y, x] = row * 2 + (x >= split)
    ids[dm] = -1
    base = lambda i: 3 if i in (900, 901) else 1 if i == 902 else 3 if i == 52 else pick(2, 2, 3)(i)
    b = blocks(ids, ramp, base, wrap=False)
    for y, x in zip(*np.nonzero(ids >= 0)): g[y, x] = b[y, x]
    if key:                                                            # keystone and a band on the capital
        for y, x in zip(*np.nonzero(ids == 52)): g[y, x] = (key, 3 if g[y, x][1] > 1 else 1)
        for x in range(PW): g[5, x] = (key, 3); g[6, x] = (key, 1)
    door_in(g, frame, leaf, studs=key)
    silhouette(g, ramp)
    return {'grid': g, 'anchor': (PW // 2, RH)}
def walldoor(frame=0):
    """Timber: two squared posts under a lintel, boards above, a plank door."""
    g = grid(PW, RH)
    beam(g, 2, 0, 7, RH - 1, horiz=False); beam(g, 24, 0, 29, RH - 1, horiz=False)
    for y in range(0, DSPRING - 12):                                   # boards between the posts
        for x in range(8, 24): g[y, x] = ('wood', 1 if (x - 8) % 5 == 4 else 2)
    beam(g, 2, DSPRING - 12, 29, DSPRING - 6)                          # lintel
    for y in range(DSPRING - 6, DSPRING):
        for x in range(8, 24): g[y, x] = ('wood', 1 if (x - 8) % 5 == 4 else 2)
    for x in (4, 26): g[DSPRING - 9, x] = ('iron', 4)
    for x0 in (2, 24):                                                 # stone footings over the floor
        for y in range(FLOOR, RH):
            for x in range(x0 - 1, x0 + 7): g[y, x] = ('stone', 3 if y == FLOOR else 2 if x < x0 + 5 else 1)
    door_in(g, frame, 'wood')
    silhouette(g, 'oak')
    return {'grid': g, 'anchor': (PW // 2, RH)}
def walldoor_stone(frame=0): return walldoor_of('sand', 'oak', frame=frame)
def walldoor_grand(frame=0): return walldoor_of('stone', 'oak', key='gold', frame=frame)


WAYS = {'stairdoor': stairdoor, 'stairdoor_stone': stairdoor_stone, 'stairdoor_grand': stairdoor_grand,
        'runeplate': runeplate, 'statue': statue,
        'walldoor': walldoor, 'walldoor_stone': walldoor_stone, 'walldoor_grand': walldoor_grand}
WAY_SPRITES = {'gallery': gallery, 'arcade': arcade, 'arcade_grand': arcade_grand}
WAY_TILES = {'wall_hewn': wall_hewn}


if __name__ == '__main__':
    from shells import blit, put, light, col, rgb, TILES, SPRITES, room
    out = sys.argv[1] if len(sys.argv) > 1 else 'preview'
    os.makedirs(out, exist_ok=True)
    # every sprite, frames side by side, on a dark ground
    items = [(k, f(i) if 'door' in k else f()) for k, f in WAYS.items() for i in range(4 if 'door' in k else 1)]
    items += [(k, f()) for k, f in WAY_SPRITES.items()]
    wsum = sum(s['grid'].shape[1] + 6 for _, s in items) + 110
    cv = np.full((150, wsum), '#241c22', object); em = np.zeros(cv.shape, bool)
    x = 6
    for k, s in items: put(cv, em, s, x + s['anchor'][0], 140); x += s['grid'].shape[1] + 6
    blit(cv, em, wall_hewn()[:, :96], x, 2)
    im = Image.new('RGB', (wsum, 150)); px = im.load()
    for y in range(150):
        for x_ in range(wsum): px[x_, y] = rgb(col(cv[y, x_]))
    im.resize((wsum * 3, 450), Image.NEAREST).save(f'{out}/ways_x3.png')
    print('ok')
