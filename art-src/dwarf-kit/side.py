from base import *
import math
HEAD_S = segs([
(3,12,"OOOOOOO"),
(4,11,"OSSSSssO"),
(5,10,"OSSSSSsssdO"),
(6,9,"OSSSSSssssddO"),
(7,9,"OSSSSsssssddO"),
(8,9,"OSSsssssssddO"),
(9,9,"OssssssssssSsO"),
(10,9,"OsssadssOssSSO"),
(11,9,"OsssadsswsSSsO"),
(12,9,"OsssaasdddsSSssO"),
(13,9,"OssssssssssSssdO"),
(14,10,"OssssssssssddaO"),
(15,11,"OsssssssaaO"),
(16,12,"OssssssdsO"),
])
MOUTH_S = {
 'neutral': segs([(15,19,"aa")]),
 'happy':   segs([(14,19,"a"),(15,19,"sa")]),
 'angry':   segs([(15,18,"aaa"),(9,19,"aa")]),
 'open':    segs([(15,19,"OO"),(16,19,"a")]),
 'sleep':   segs([(15,19,"da"),(10,18,"s"),(11,17,"aa")]),
}
BLINK_S = segs([(10,18,"s"),(11,17,"aa")])

def outline(g, fill_chars, col='O'):
    """Add an outline (4-neighbour) around pixels of fill_chars in grid g (list of lists)."""
    pts = [(x, y) for y in range(H) for x in range(W) if g[y][x] in fill_chars]
    s = set(pts)
    for x, y in pts:
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in s and g[ny][nx] == '.':
                g[ny][nx] = col
    return g

def arm(sh, hand, far=False, sleeve=None):
    """A sleeve from the shoulder to the wrist (3 px thick) and a hand, outlined."""
    g = blank()
    (sx, sy), (hx, hy) = sh, hand
    L = math.hypot(hx - sx, hy - sy) or 1
    ux, uy = (hx - sx) / L, (hy - sy) / L
    wx, wy = hx - ux * 2.4, hy - uy * 2.4          # the wrist stops short of the hand
    lit, mid, dark = ('u', 'u', 'v') if far else ('T', 't', 'u')
    for y in range(H):
        for x in range(W):
            # distance to segment shoulder-wrist
            px, py = x - sx, y - sy
            t = max(0, min(1, (px * (wx - sx) + py * (wy - sy)) / max(1e-6, (wx - sx) ** 2 + (wy - sy) ** 2)))
            cx, cy = sx + (wx - sx) * t, sy + (wy - sy) * t
            dist = math.hypot(x - cx, y - cy)
            if dist <= 1.7:
                side = (x - cx) * (-uy) + (y - cy) * ux        # which side of the sleeve
                g[y][x] = lit if side < -0.4 else dark if side > 0.6 else mid
    for y in range(H):
        for x in range(W):
            if math.hypot(x - hx, y - hy) <= 1.6:
                g[y][x] = 'S' if (x < hx and y < hy) else 'd' if (x > hx or y > hy) else 's'
                if far: g[y][x] = 'd' if g[y][x] != 'S' else 's'
    # cuff: the sleeve pixels next to the hand
    for y in range(H):
        for x in range(W):
            if g[y][x] in 'Ttuv' and 1.6 < math.hypot(x - hx, y - hy) <= 2.6:
                g[y][x] = 'v' if far else 'u'
    outline(g, 'TtuvSsd')
    return rows(g)

BOOT = ["OLBBbO", "OLBBbO", "OLBBBbO", "OBBBBBbO", "OlbbbbbO", "OOOOOOOO"]
PANTS = "OPppqO"
DARKEN = {'P': 'p', 'p': 'q', 'q': 'q', 'L': 'B', 'B': 'b', 'b': 'l', 'l': 'l'}
def leg(hip, foot, lift=0, far=False):
    g = blank()
    def put(y, x, s):
        for i, c in enumerate(s):
            if c == '.': continue
            if far and c in DARKEN: c = DARKEN[c]
            if 0 <= y < H and 0 <= x + i < W: g[y][x + i] = c
    for i, y in enumerate((34, 35)):
        put(y - lift, round(hip + (foot - hip) * (i + 0.5) / 2.5), PANTS)
    for i, r in enumerate(BOOT):
        put(36 + i - lift, foot, r)
    return rows(g)

TORSO_M = segs([
(17,10,"OOOOOOOOOOOO"),
(18,9,"OTTTttttttuuuO"),
(19,8,"OTTTtttttttuuuO"),
(20,8,"OTTttttttttuuuO"),
(21,8,"OTTttttttttuuuO"),
(22,8,"OTTtttttttttuuuO"),
(23,8,"OTttttttttttuuuO"),
(24,8,"OTttttttttttuuuO"),
(25,8,"OTttttttttttuuuO"),
(26,8,"OTtttttttttuuuuO"),
(27,8,"OEEEEEEEEEEEgGyO"),
(28,8,"OeeeeeeeeeeeyggO"),
(29,8,"OTttttttttttuuO"),
(30,8,"OTttttttttttuuO"),
(31,8,"OTtttttttttuuuO"),
(32,8,"OTtttttttttuuuO"),
(33,8,"OOOOOOOOOOOOOOO"),
])
TORSO_F = segs([
(17,10,"OOOaaaaaaOOO"),
(18,9,"OTTTtsssstuuO"),
(19,8,"OTTTttvsstuuuO"),
(20,8,"OTTttttvvtTtuO"),
(21,8,"OTTtttttttTTtuO"),
(22,8,"OTTttttttttTttuO"),
(23,8,"OTttttttttuuuuuO"),
(24,8,"OTtttttttttuuO"),
(25,8,"OTtttttttttuuO"),
(26,8,"OEEEEEEEEEgGyO"),
(27,8,"OeeeeeeeeeyggO"),
(28,8,"OTtttttttttuuuO"),
(29,7,"OTTtttttttttuuuO"),
(30,7,"OTttttttttttuuuO"),
(31,7,"OTtttttttttttuuuO"),
(32,6,"OTTttttttttttuuuuO"),
(33,6,"OTtttttttttttuuuuO"),
(34,6,"OTttttttttttttuuuuO"),
(35,6,"OOOOOOOOOOOOOOOOOOO"),
])
TORSO = {'m': TORSO_M, 'f': TORSO_F}
SHOULDER = (14, 20)
# walk: (near foot, far foot, near lift, far lift, near hand, far hand, bob)
WALK = [
 (15, 7, 0, 0, (11, 28), (19, 28), 0),
 (11, 12, 0, 2, (14, 29), (14, 29), -1),
 (7, 15, 0, 0, (19, 28), (11, 28), 0),
 (11, 12, 2, 0, (14, 29), (14, 29), -1),
]
# work: both hands on the tool, legs planted
WORK_HANDS = [(11, 10), (17, 8), (24, 24), (22, 19)]
def side_frame(s, near_foot, far_foot, nl, fl, near_hand, far_hand, bob, head=None, extras=()):
    torso = TORSO[s]
    up = lambda L: shift(L, dy=bob, y_from=0, y_to=34 if s == 'm' else 36) if bob else L
    sh = (SHOULDER[0], SHOULDER[1] + bob)
    far_arm = arm(sh, (far_hand[0], far_hand[1] + (0 if far_hand[1] < 20 else bob)), far=True)
    near_arm = arm(sh, (near_hand[0], near_hand[1] + (0 if near_hand[1] < 20 else bob)))
    hip = 11
    legs_far = leg(hip, far_foot, fl, far=True)
    legs_near = leg(hip, near_foot, nl)
    if s == 'f':   # skirt covers the top of the legs
        legs_far = crop_rows(legs_far, 35, H); legs_near = crop_rows(legs_near, 35, H)
    return dict(far_arm=far_arm, legs=over(legs_far, legs_near), torso=up(torso), near_arm=near_arm, dy=bob)
def walk_frames(s): return [side_frame(s, *w) for w in WALK]
def work_frames(s): return [side_frame(s, 15, 7, 0, 0, h, (h[0] - 1, h[1] + 1), 0) for h in WORK_HANDS]
def stand_frame(s): return side_frame(s, 11, 11, 0, 0, (13, 29), (14, 29), 0)
