# Every part of the 48 x 64 dwarf kit, built from simple shapes. The base model (male, short hair, full beard,
# green tunic, leather vest) is the reference for size, proportions and light; everything else is drawn against it.
# Views: 'front', 'back', 'side' (facing right; the game mirrors it for left). Feet stand on row 61.
from engine import *

K = {'h': ('hair', 1), 'H': ('hair', 3), 'k': ('hair', 0), 'w': ('white', 0), 'i': ('iris', 0), 'd': ('dark', 0),
     'c': ('cheek', 0), 'a': ('skin', 0), 's': ('skin', 1), 'S': ('skin', 2), 'g': ('gold', 2), 'G': ('gold', 4),
     'y': ('gold', 1), 'b': ('belt', 1), 'l': ('skin', 3)}
VIEWS = ['front', 'back', 'side']
STYLES = ['short', 'bald', 'topknot', 'long', 'braids', 'bun']
BEARDS = ['full', 'wide', 'fork', 'long', 'short']
HATS = ['helm', 'cap', 'hood']
MOODS = ['neutral', 'happy', 'angry', 'open', 'blink', 'sleep']
PROPS = ['mug_down', 'mug_up', 'spoon_mid', 'spoon_up', 'axe', 'sack']
HAT_CLIP = 19          # with a hat on, hair above this row is hidden

def strands(m, bias=0.05, lean=0.0, period=3):
    idx = shade(m, bias, 1.2)
    for y, x in zip(*np.nonzero(m)):
        ph = int(x + (y - 28) * lean) % period
        if ph == 0: idx[y, x] = max(1, idx[y, x] - 1)
        elif ph == 1 and idx[y, x] >= 3: idx[y, x] = 4
    return idx
def hairmass(m, lean=0.0):
    return Part().fill(m, 'hair', idx=strands(m, 0.0, lean, 3))
def braid(p, x0, y0, x1, y1, ramp='hair', ribbon=None):
    n = max(2, int(abs(y1 - y0) / 2.2))
    for i in range(n + 1):
        t = i / n
        p.fill(ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 1.7, 1.4), ramp, bias=0.1 if i % 2 else -0.05)
    if ribbon: p.fill(ell(x1, y1 - 1.0, 1.9, 0.9), ribbon, bias=0.15)
    return p

# ================================================================== bodies
def torso_mask(sex, view):
    if sex == 'm':
        if view == 'side':
            return poly([(17, 32.5), (29, 32.5), (32.5, 36.5), (34, 42), (33, 49), (31.5, 53.5), (16, 53.5), (14.5, 48), (14.5, 38)])
        return poly([(16, 32.5), (32, 32.5), (35.5, 36), (36.5, 42), (35.5, 49), (34, 53.5), (14, 53.5), (12.5, 49), (11.5, 42), (12.5, 36)])
    # female: narrower shoulders, waist at the belt, a dress to the ankles
    if view == 'side':
        return poly([(18, 32.5), (28, 32.5), (31.5, 36), (32.2, 40), (29.5, 43.5), (30.5, 48), (33.5, 57.5), (14.5, 57.5), (16, 48), (16.5, 43.5), (15.5, 38)])
    return poly([(17, 32.5), (31, 32.5), (34, 35.5), (33.5, 40), (31, 44), (33.5, 48), (36, 57.5), (12, 57.5), (14.5, 48), (17, 44), (14.5, 40), (14, 35.5)])
def body(sex, view):
    m = torso_mask(sex, view)
    p = Part().fill(m, 'tunic', round_=1.2)
    by0 = 45 if sex == 'm' else 43
    bm = m & (yy >= by0) & (yy <= by0 + 2)
    p.fill(bm, 'belt', idx=np.where(yy == by0, 3, 2), outline=False)
    if view == 'front': p.grid(22, by0, ['yGgy', 'ygdy', 'yggy'], {**K, 'd': ('gold', 0)})
    if view == 'side': p.grid(30 if sex == 'm' else 27, by0, ['yGg', 'ygy', 'ygg'], K)
    if sex == 'f' and view != 'back':      # a little light on the bust, shadow under it
        if view == 'front':
            for cx in (20.5, 27.5):
                for y, x in zip(*np.nonzero(ell(cx, 37.6, 3.0, 2.3) & m)):
                    if y <= 37: p.c[y, x] = ('tunic', min(4, p.c[y, x][1] + 1))
                    elif y >= 39: p.c[y, x] = ('tunic', max(1, p.c[y, x][1] - 1))
        else:
            for y, x in zip(*np.nonzero(ell(30.0, 37.6, 2.4, 2.4) & m)):
                if y >= 39: p.c[y, x] = ('tunic', max(1, p.c[y, x][1] - 1))
    if sex == 'f':                          # folds in the skirt
        for x in ((19, 24, 29) if view != 'side' else (19, 25)):
            for y in range(49, 57):
                if m[y, x] and p.c[y, x][0] == 'tunic': p.c[y, x] = ('tunic', max(1, p.c[y, x][1] - 1))
    return p
def vest(sex, view):
    m = torso_mask(sex, view) & (yy < (45 if sex == 'm' else 43))
    if view == 'front': m &= ~((xx >= 20) & (xx <= 27))
    if view == 'side': m &= xx < (27 if sex == 'm' else 25)
    return Part().fill(m, 'vest', round_=1.2, outline=False)

# ================================================================== arms
SHOULDER = {('m', 'front'): ((13.5, 35.5), (34.5, 35.5)), ('f', 'front'): ((15, 35.5), (33, 35.5)),
            ('m', 'side'): ((21, 36), (24, 36)), ('f', 'side'): ((21, 36), (24, 36))}
def arm(sh, hand, far=False, elbow=None):
    p = Part()
    b = -0.25 if far else 0.0
    if elbow:
        p.fill(cap(sh, elbow, 2.4) | cap(elbow, (hand[0] + (elbow[0] - hand[0]) * 0.3, hand[1] + (elbow[1] - hand[1]) * 0.3), 2.2), 'tunic', bias=b)
    else:
        p.fill(cap(sh, (hand[0] + (sh[0] - hand[0]) * 0.25, hand[1] - 2.2), 2.4), 'tunic', bias=b)
    p.fill(ell(hand[0], hand[1], 2.2, 2.0), 'skin', bias=b + 0.05)
    return p
def front_arms(sex, frame):
    """frame: 0 walk A, 1 stand, 2 walk B, 3 hands down, 4 hand at chest, 5 hand at mouth."""
    (lx, ly), (rx, ry) = SHOULDER[(sex, 'front')]
    lh = (lx - 1.7, 47.5 - (1 if frame == 2 else 0))
    left = arm((lx, ly), lh)
    if frame in (0, 1, 2, 3):
        right = arm((rx, ry), (rx + 1.7, 47.5 - (1 if frame == 0 else 0)))
    elif frame == 4:
        right = arm((rx, ry), (29.5, 41.5), elbow=(rx + 2.0, 43.0))
    else:
        right = arm((rx, ry), (28.5, 31.5), elbow=(rx + 2.2, 41.0))
    return compose_parts([left, right])
def back_arms(sex, frame):
    (lx, ly), (rx, ry) = SHOULDER[(sex, 'front')]
    left = arm((lx, ly), (lx - 1.7, 47.5 - (1 if frame == 0 else 0)))
    right = arm((rx, ry), (rx + 1.7, 47.5 - (1 if frame == 2 else 0)))
    return compose_parts([left, right])
SIDE_HANDS = {  # frame: (near hand, far hand, near elbow, far elbow)
    0: ((17.5, 46), (26.5, 46), None, None), 1: ((21.5, 47.5), (23.5, 47), None, None), 2: ((25.5, 46), (19.5, 46), None, None),
    3: ((29.5, 44.5), (31.0, 44.0), (23.0, 43.5), (26.0, 43.0)), 4: ((31.0, 41.0), (32.5, 40.5), (24.0, 43.5), (27.0, 43.0)),
    5: ((30.5, 37.5), (32.0, 37.0), (25.0, 43.0), (28.0, 42.5)),
}
def side_arm(sex, frame, far):
    near_sh, far_sh = SHOULDER[(sex, 'side')]
    nh, fh, ne, fe = SIDE_HANDS[frame]
    return arm(far_sh, fh, far=True, elbow=fe) if far else arm(near_sh, nh, elbow=ne)
def compose_parts(parts):
    p = Part()
    for q in parts:
        m = q.c != None
        p.c[m] = q.c[m]
    return p

# ================================================================== legs
def front_leg(xc, lift=0, sex='m'):
    p = Part()
    if sex == 'm':
        p.fill(poly([(xc - 3, 51), (xc + 3, 51), (xc + 3, 56 - lift), (xc - 3, 56 - lift)]), 'pants')
    p.fill(poly([(xc - 3.6, 55.5 - lift), (xc + 3.6, 55.5 - lift), (xc + 4.0, 59 - lift), (xc + 3.4, 61.5 - lift), (xc - 3.4, 61.5 - lift), (xc - 4.0, 59 - lift)]), 'boots')
    p.px([(xc - 2 + i, 56 - lift) for i in range(5)], 'boots', 4)
    return p
def side_leg(hip, foot, lift=0, far=False, sex='m'):
    b = -0.3 if far else 0.0
    p = Part()
    if sex == 'm':
        p.fill(poly([(hip - 3, 51), (hip + 3, 51), (foot + 2.8, 56.5 - lift), (foot - 2.8, 56.5 - lift)]), 'pants', bias=b)
    p.fill(poly([(foot - 3.2, 55.5 - lift), (foot + 2.6, 55.5 - lift), (foot + 3.2, 58 - lift), (foot + 6.2, 59.2 - lift), (foot + 6.4, 61.5 - lift), (foot - 3.4, 61.5 - lift)]), 'boots', bias=b)
    return p
def legs(sex, view, frame):
    """frame: 0 walk A, 1 stand, 2 walk B, 3 seated (front only)."""
    if view in ('front', 'back'):
        if frame == 3:
            p = Part()
            for xc in (19, 29):
                if sex == 'm': p.fill(poly([(xc - 3.2, 56), (xc + 3.2, 56), (xc + 3.4, 58), (xc - 3.4, 58)]), 'pants', bias=0.15)
                p.fill(poly([(xc - 3.8, 57.5), (xc + 3.8, 57.5), (xc + 4.2, 60), (xc + 3.6, 61.5), (xc - 3.6, 61.5), (xc - 4.2, 60)]), 'boots', bias=0.1)
            return p
        return compose_parts([front_leg(20, 2 if frame == 0 else 0, sex), front_leg(28, 2 if frame == 2 else 0, sex)])
    near_foot, far_foot = [(26, 15), (22, 22), (16, 25), (22, 22)][frame]
    return compose_parts([side_leg(22, far_foot, 1 if frame != 1 and far_foot < 20 else 0, True, sex),
                          side_leg(22, near_foot, 1 if near_foot < 20 else 0, False, sex)])

# ================================================================== head and face
def head(view):
    p = Part()
    if view == 'side':
        p.fill(ell(23.5, 24.5, 8.0, 9.0), 'skin', bias=0.05, round_=1.2)
        p.fill(ell(20.2, 26, 1.7, 2.5), 'skin', bias=-0.05)
        p.fill(ell(31.0, 28.0, 2.5, 2.1), 'skin', bias=0.2, round_=1.4)
        return p
    p.fill(ell(24, 24.5, 8.5, 9.0), 'skin', bias=0.05, round_=1.2)
    p.fill(ell(15.4, 26, 1.6, 2.4), 'skin', bias=0.0); p.fill(ell(32.6, 26, 1.6, 2.4), 'skin', bias=-0.1)
    if view == 'front': p.fill(ell(24, 28.4, 2.7, 2.2), 'skin', bias=0.2, round_=1.4)
    return p
FACE_FRONT = {   # rows from y 22: brows, lid, eye, eye, under-eye, cheeks (eyes 3 px wide like the CC0 bases); mouth rows 31-32
    'neutral': (['hHh......hHh', 'ddd......ddd', 'wii......iiw', 'wii......iiw', '.ss......ss.', 'c..........c'], ['..aa..', '......']),
    'happy':   (['hHh......hHh', 'ddd......ddd', 'wii......iiw', 'sll......lls', '............', 'cc........cc'], ['a....a', '.aaaa.']),
    'angry':   (['.hd......dh.', 'dddd....dddd', 'wii......iiw', 'sss......sss', '............', '............'], ['.aaaa.', 'a....a']),
    'open':    (['hHh......hHh', 'ddd......ddd', 'wii......iiw', 'wii......iiw', '.ss......ss.', 'c..........c'], ['.adda.', '..dd..']),
    'blink':   (['hHh......hHh', '............', '............', 'ddd......ddd', '.ss......ss.', 'c..........c'], ['..aa..', '......']),
    'sleep':   (['hHh......hHh', '............', '............', 'aaa......aaa', '.ss......ss.', 'c..........c'], ['..a...', '......']),
}
FACE_SIDE = {    # from x 26, y 22; the cheek sits at (25, 27)
    'neutral': (['hHh', 'dd.', 'wi.', 'wi.', 'ss.'], ['.aa', '...']),
    'happy':   (['hHh', 'dd.', 'wi.', 'll.', '...'], ['a.a', '.aa']),
    'angry':   (['.hd', 'ddd', 'wi.', 'ss.', '...'], ['aaa', '...']),
    'open':    (['hHh', 'dd.', 'wi.', 'wi.', 'ss.'], ['.dd', '.dd']),
    'blink':   (['hHh', '...', '...', 'dd.', 'ss.'], ['.aa', '...']),
    'sleep':   (['hHh', '...', '...', 'aa.', 'ss.'], ['.a.', '...']),
}
def face(view, mood, sex):
    p = Part()
    open_eyes = mood not in ('blink', 'sleep')
    if view == 'front':
        eyes, mouth = FACE_FRONT[mood]
        p.grid(18, 22, eyes, K)
        p.grid(21, 31, mouth, K)
        if sex == 'f' and open_eyes: p.grid(17, 23, ['d............d'], K)      # lashes at the outer corners
    elif view == 'side':
        eyes, mouth = FACE_SIDE[mood]
        p.grid(26, 22, eyes, K)
        p.grid(27, 31, mouth, K)
        if mood not in ('angry',): p.grid(25, 27, ['c'], K)
        if sex == 'f' and open_eyes: p.grid(28, 23, ['d'], K)
    return p

# ================================================================== hair
def hair(view, style):
    if view == 'front':
        top = (ell(24, 21.6, 9.6, 8.0) & (yy < 21)) | (ell(24, 22.6, 9.8, 9.5) & ((xx < 17) | (xx > 30)) & (yy < 29))
        ears = ell(15.4, 26.4, 1.8, 2.6) | ell(32.6, 26.4, 1.8, 2.6)
        top &= ~ears
        if style == 'short': return hairmass(top)
        if style == 'bald':
            return hairmass(ell(24, 24.5, 9.8, 9.0) & (yy > 20) & (yy < 29) & ((xx < 17) | (xx > 30)) & ~ears)
        if style == 'topknot':
            p = hairmass(top | ell(24, 13.0, 2.8, 2.6)); p.grid(22, 15, ['ygGgy'], K); return p
        if style == 'long':
            locks = ell(24, 31, 11.2, 15.5) & ((xx < 17) | (xx > 30)) & (yy < 44) & (yy > 20) & ~ears
            return hairmass(top | locks)
        if style == 'braids':
            p = hairmass(top)
            p.px([(24, y) for y in range(15, 21)], 'hair', 0)                 # centre parting
            braid(p, 15.4, 30, 14.6, 44, ribbon='tunic'); braid(p, 32.6, 30, 33.4, 44, ribbon='tunic')
            return p
        if style == 'bun':
            p = hairmass(ell(24, 14.4, 4.2, 3.2) | top); p.grid(22, 17, ['ygGgy'], K); return p
    if view == 'back':
        top = ell(24, 23.2, 9.6, 9.4) & (yy < 31)
        if style == 'short': return hairmass(top)
        if style == 'bald': return hairmass(ell(24, 24.5, 9.8, 9.2) & (yy > 21) & (yy < 30))
        if style == 'topknot':
            p = hairmass(top | ell(24, 13.0, 2.8, 2.6)); p.grid(22, 15, ['ygGgy'], K); return p
        if style == 'long':
            return hairmass(ell(24, 23.2, 9.8, 9.4) | (poly([(15, 25), (33, 25), (33.5, 40), (30, 43.5), (18, 43.5), (14.5, 40)])))
        if style == 'braids':
            p = hairmass(top); braid(p, 19.5, 31, 19, 44, ribbon='tunic'); braid(p, 28.5, 31, 29, 44, ribbon='tunic'); return p
        if style == 'bun':
            p = hairmass(top | ell(24, 17.5, 4.6, 3.6)); p.grid(22, 20, ['ygGgy'], K); return p
    # side, facing right
    ear = ell(20.2, 26.4, 1.9, 2.7)
    top = ((ell(23.2, 21.6, 9.0, 8.0) & (yy < 21)) | (ell(22.5, 23, 8.8, 9.6) & (xx < 21) & (yy < 31))) & ~ear
    if style == 'short': return hairmass(top)
    if style == 'bald': return hairmass(ell(19.5, 25.0, 4.2, 4.6) & (xx < 21) & (yy > 20) & (yy < 30) & ~ear)
    if style == 'topknot':
        p = hairmass(top | ell(22.0, 13.0, 2.8, 2.6)); p.grid(20, 15, ['ygGgy'], K); return p
    if style == 'long':
        return hairmass(top | (poly([(14.6, 24), (21, 24), (21.5, 31), (20.5, 42.5), (15.5, 42.5), (14.2, 34)]) & ~ear))
    if style == 'braids':
        p = hairmass(top); braid(p, 18.5, 30, 17.6, 44, ribbon='tunic'); return p
    if style == 'bun':
        p = hairmass(top | ell(15.4, 18.6, 3.6, 3.4)); p.grid(16, 20, ['ygG'], K); return p
    raise KeyError(style)

# ================================================================== beards
def beard(view, style):
    p = Part()
    if view == 'front':
        full = poly([(15.5, 27), (18, 30.5), (21, 31.5), (27, 31.5), (30, 30.5), (32.5, 27), (33, 33), (31.5, 39), (28, 43.5), (26, 45.5), (22, 45.5), (20, 43.5), (16.5, 39), (15, 33)])
        stache = lambda: (p.fill(ell(21.3, 31.2, 3.1, 1.4), 'hair', bias=0.15), p.fill(ell(26.7, 31.2, 3.1, 1.4), 'hair', bias=0.05))
        if style == 'full':
            p.fill(full, 'hair', idx=strands(full)); stache()
            p.fill(ell(24, 47.0, 1.9, 1.7), 'hair', bias=0.05); p.fill(ell(24, 49.2, 1.8, 1.0), 'gold', bias=0.15, round_=1.4)
        elif style == 'wide':
            m = poly([(14.8, 26.5), (18, 30.5), (21, 31.5), (27, 31.5), (30, 30.5), (33.2, 26.5), (35, 33), (34.5, 39), (31, 43.5), (24, 45), (17, 43.5), (13.5, 39), (13, 33)])
            p.fill(m, 'hair', idx=strands(m, 0.05, 0.0, 3)); stache()
        elif style == 'fork':
            m = full & (yy < 42)
            p.fill(m, 'hair', idx=strands(m)); stache()
            braid(p, 21.5, 42, 20.5, 49); braid(p, 26.5, 42, 27.5, 49)
            p.fill(ell(20.5, 49.6, 1.7, 0.9), 'gold', bias=0.15); p.fill(ell(27.5, 49.6, 1.7, 0.9), 'gold', bias=0.15)
        elif style == 'long':
            m = poly([(15.5, 27), (18, 30.5), (21, 31.5), (27, 31.5), (30, 30.5), (32.5, 27), (33, 33), (31.5, 40), (28, 47), (25.2, 54.5), (22.8, 54.5), (20, 47), (16.5, 40), (15, 33)])
            p.fill(m, 'hair', idx=strands(m)); stache()
            p.fill(ell(24, 49.0, 2.6, 1.0) & m, 'gold', bias=0.15, round_=1.4)
        elif style == 'short':
            m = poly([(20.5, 32), (27.5, 32), (27, 36), (25, 38.5), (23, 38.5), (21, 36)])
            p.fill(m, 'hair', idx=strands(m)); stache()
            p.fill(poly([(15.3, 26.5), (17.2, 26.5), (17.6, 31), (16.2, 31)]), 'hair', bias=0.0, outline=False)
            p.fill(poly([(30.8, 26.5), (32.7, 26.5), (31.8, 31), (30.4, 31)]), 'hair', bias=-0.1, outline=False)
        return p
    if view == 'side':
        full = poly([(21.5, 28), (25, 31), (30, 31.8), (33, 30.5), (33.6, 35), (31.5, 41), (28.5, 45.5), (26, 47), (24.4, 44), (22.8, 38), (21, 33)])
        stache = lambda: p.fill(ell(30.6, 31.0, 2.7, 1.3), 'hair', bias=0.15)
        if style == 'full':
            p.fill(full, 'hair', idx=strands(full, 0.05, 0.25)); stache()
            p.fill(ell(26.6, 48.4, 1.7, 1.6), 'hair'); p.fill(ell(26.8, 50.4, 1.6, 0.9), 'gold', bias=0.15, round_=1.4)
        elif style == 'wide':
            m = poly([(20.5, 27.5), (25, 31), (30, 31.8), (34, 30), (35.2, 35), (33.5, 41), (29.5, 45), (25, 45.5), (22.5, 41), (20.5, 34)])
            p.fill(m, 'hair', idx=strands(m, 0.05, 0.25)); stache()
        elif style == 'fork':
            m = full & (yy < 42)
            p.fill(m, 'hair', idx=strands(m, 0.05, 0.25)); stache()
            braid(p, 27.0, 42, 28.0, 49); p.fill(ell(28.0, 49.6, 1.7, 0.9), 'gold', bias=0.15)
            braid(p, 29.5, 41, 31.0, 48)
        elif style == 'long':
            m = poly([(21.5, 28), (25, 31), (30, 31.8), (33, 30.5), (33.6, 35), (32, 42), (29.5, 49), (27.6, 55), (25.8, 54.5), (24.2, 46), (22.8, 38), (21, 33)])
            p.fill(m, 'hair', idx=strands(m, 0.05, 0.25)); stache()
            p.fill(ell(27.8, 49.0, 2.4, 1.0) & m, 'gold', bias=0.15, round_=1.4)
        elif style == 'short':
            m = poly([(26.5, 31.5), (31.5, 32), (31, 36), (28.5, 38.5), (26.5, 36.5)])
            p.fill(m, 'hair', idx=strands(m)); stache()
            p.fill(poly([(21.6, 26.5), (23.2, 26.5), (23.6, 31), (22.2, 31)]), 'hair', outline=False)
        return p
    size = {'full': (1.3, 2.2), 'wide': (1.8, 3.0), 'fork': (1.3, 2.2), 'long': (1.3, 2.6), 'short': None}[style]
    if size:
        p.fill(ell(15.2, 32.5, *size), 'hair'); p.fill(ell(32.8, 32.5, *size), 'hair', bias=-0.1)
    return p

# ================================================================== hats
def hat(view, kind):
    p = Part()
    if kind == 'helm':
        cx = 24 if view != 'side' else 23.2
        dome = ell(cx, 20.0, 10.0, 7.6) & (yy < 20)
        p.fill(dome, 'metal', bias=0.1, round_=1.3)
        p.fill(poly([(cx - 10.6, 18.5), (cx + 10.6, 18.5), (cx + 10.6, 21.4), (cx - 10.6, 21.4)]), 'metal', idx=np.where(yy == 19, 3, 2))
        for x in (range(16, 33, 4) if view != 'side' else range(15, 32, 4)): p.px([(x, 20)], 'metal', 4)
        if view == 'side': p.fill(poly([(30.5, 21), (33, 21), (32, 24.5), (30.8, 24)]), 'metal', bias=0.1)     # little brim at the front
        return p
    if kind == 'cap':
        cx = 24 if view != 'side' else 23.0
        p.fill(ell(cx, 19.5, 9.6, 7.0) & (yy < 19), 'cloth', bias=0.1, round_=1.2)
        p.fill(poly([(cx - 10.2, 17.5), (cx + 10.2, 17.5), (cx + 10.2, 21.2), (cx - 10.2, 21.2)]), 'cloth',
               idx=np.where(((xx + 1) % 3 == 0) & (yy > 17), 2, 3))
        p.fill(ell(cx - (1 if view == 'side' else 0), 11.6, 2.4, 2.2), 'cream', bias=0.15)
        return p
    # hood: covers the head and the shoulders, the face shows through an opening
    if view == 'back':
        m = ell(24, 24, 10.6, 11.2) | poly([(13.5, 30), (34.5, 30), (37, 38), (11, 38)])
        return p.fill(m, 'cloth', bias=0.05, round_=1.3)
    if view == 'front':
        m = (ell(24, 24.5, 10.8, 11.6) | poly([(13.2, 30), (34.8, 30), (37.5, 38.5), (10.5, 38.5)])) & ~ell(24, 27.6, 7.0, 8.4)
    else:
        m = (ell(22.4, 24.5, 10.4, 11.6) | poly([(13.5, 30), (30.5, 30), (32.5, 38.5), (12.5, 38.5)])) & ~ell(28.0, 27.8, 5.6, 8.4)
    return p.fill(m, 'cloth', bias=0.05, round_=1.3)

# ================================================================== things in hand (front)
def prop(kind):
    p = Part()
    if kind == 'mug_down':
        p.fill(poly([(36.5, 44.5), (41, 44.5), (41, 50), (36.5, 50)]), 'wood', bias=0.05)
        p.fill(poly([(36.5, 44.5), (41, 44.5), (41, 45.6), (36.5, 45.6)]), 'cream', outline=False, bias=0.2)
    elif kind == 'mug_up':
        p.fill(poly([(25, 27.5), (30.5, 27.5), (30.5, 33), (25, 33)]), 'wood', bias=0.05)
        p.fill(poly([(25, 27.5), (30.5, 27.5), (30.5, 28.6), (25, 28.6)]), 'cream', outline=False, bias=0.2)
    elif kind == 'spoon_mid':
        p.fill(cap((28.5, 39.5), (27.5, 35.5), 0.6), 'metal', bias=0.2); p.fill(ell(27.4, 34.6, 1.3, 1.0), 'metal', bias=0.3)
    elif kind == 'spoon_up':
        p.fill(cap((27.8, 30), (26.4, 27.2), 0.6), 'metal', bias=0.2); p.fill(ell(26.2, 26.6, 1.3, 1.0), 'metal', bias=0.3)
    elif kind == 'axe':
        p.fill(cap((37.0, 52.0), (37.0, 33.0), 0.8), 'wood', bias=0.1)
        p.fill(poly([(37.6, 32.5), (42.5, 30.5), (43.5, 34), (42.5, 37.5), (37.6, 35.5)]), 'metal', bias=0.1, round_=1.2)
    elif kind == 'sack':
        p.fill(ell(38.2, 52.5, 4.6, 5.0), 'cream', bias=-0.1, round_=1.3)
        p.fill(poly([(36.6, 46), (39.6, 46), (39.4, 48.5), (36.8, 48.5)]), 'cream', bias=0.0)
    return p

# ================================================================== sleeping quilt (side view, before turning it on its side)
def quilt(frame):
    top = 34 if frame == 0 else 33
    m = poly([(13.5, top), (34.5, top), (35.5, top + 2), (35.5, 61.5), (12.5, 61.5), (12.5, top + 2)])
    idx = shade(m, 0.05, 1.1)
    for y, x in zip(*np.nonzero(m)):
        if ((x - 12) // 4 + (y - top) // 4) % 2: idx[y, x] = max(1, idx[y, x] - 1)
    return Part().fill(m, 'cloth', idx=idx)
