import json, sys, os
from base import *
import front as Fr, hairfront as HF, side as Sd, sidehair as SH, back as Bk
STYLES = ['short', 'bald', 'topknot', 'long', 'braids', 'bun']
BEARDS = ['full', 'wide', 'fork', 'long', 'short']
HATS = ['helm', 'cap', 'hood']
MOODS = ['neutral', 'happy', 'angry', 'open', 'sleep']
EMPTY = ['.' * W] * H
S = {}
for s in 'mf':
    S[f'front_body_{s}'] = Fr.body_frames(s)
    S[f'front_arm_{s}'] = [Fr.ARM[s][k] for k in ('down', 'mid', 'up')]
S['front_head'] = [Fr.HEAD]
S['front_face'] = [Fr.MOUTH[m] for m in MOODS] + [Fr.BLINK]
S['front_hair'] = [HF.HAIR[k] for k in STYLES]
S['front_brows'] = [HF.UNDER]
S['front_beard'] = [HF.BEARD[k] for k in BEARDS]
S['front_hat'] = [HF.HAT[k] for k in HATS]
PROPS = ['spoon_mid', 'spoon_up', 'mug_down', 'mug_up', 'axe', 'sack']
S['front_prop'] = [Fr.PROP[k] for k in PROPS]
SIDE_FRAMES = []
for s in 'mf':
    fs = Sd.walk_frames(s) + Sd.work_frames(s) + [Sd.stand_frame(s)]
    S[f'side_body_{s}'] = [over(f['far_arm'], f['legs'], f['torso']) for f in fs]
    if s == 'm':
        S['side_arm'] = [f['near_arm'] for f in fs]; SIDE_FRAMES = [f['dy'] for f in fs]
S['side_head'] = [Sd.HEAD_S]
S['side_face'] = [Sd.MOUTH_S[m] for m in MOODS] + [Sd.BLINK_S]
S['side_hair'] = [SH.HAIR_S[k] for k in STYLES]
S['side_brows'] = [segs([(9, 18, "hh")])]
S['side_beard'] = [SH.BEARD_S[k] for k in BEARDS]
S['side_hat'] = [SH.HAT_S[k] for k in HATS]
def quilt_part(top):
    g = blank()
    for y in range(top, 41):
        x0, x1 = (7, 22) if y == top else (6, 23)
        for x in range(x0, x1 + 1):
            a = ((x - 6) // 4 + (y - top) // 4) & 1
            c = 'Q' if a else 'C'
            if y == top or (y - top) % 4 == 0 and x % 2: c = 'X' if a else 'Q'
            if x == x1: c = 'c'
            g[y][x] = c
    Sd.outline(g, 'cCQX')
    return rows(g)
quilt, quilt2 = quilt_part(20), quilt_part(19)
S['side_quilt'] = [quilt, quilt2]
for s in 'mf':
    fs = Bk.climb_frames(s)
    S[f'back_body_{s}'] = [f['body'] for f in fs]
    if s == 'm': S['back_arm'] = [f['arms'] for f in fs]
S['back_head'] = [Bk.HEAD_B]
S['back_hair'] = [Bk.HAIR_B[k] for k in STYLES]
S['back_beard'] = [Bk.BEARD_B.get(k, EMPTY) for k in BEARDS]
S['back_hat'] = [Bk.HAT_B.get(k) or HF.HAT[k] for k in HATS]

# ramps that the game recolours: placeholder hex, dark to light
RAMPS = {
 'skin':  [PAL[c] for c in 'adsS'], 'hair': [PAL[c] for c in 'khHJ'], 'tunic': [PAL[c] for c in 'vutT'],
 'pants': [PAL[c] for c in 'qpP'], 'boots': [PAL[c] for c in 'lbBL'], 'metal': [PAL[c] for c in 'nmMW'],
 'cloth': [PAL[c] for c in 'cCQX'], 'eye': [PAL['w']],
}
SIDE_HANDS = [list(h) for h in [(11, 28), (14, 28), (19, 28), (14, 28)]] + [list(h) for h in Sd.WORK_HANDS] + [[13, 29]]
META = {
 'size': [W, H], 'anchor': [16, 42], 'hatClip': 8,
 'styles': STYLES, 'beards': BEARDS, 'hats': HATS, 'moods': MOODS, 'props': PROPS,
 'frontDy': Fr.FRONT_DY, 'sideDy': SIDE_FRAMES, 'sideHands': SIDE_HANDS,
 'sheets': {k: len(v) for k, v in S.items()}, 'ramps': RAMPS,
}
def save(out_dir):
    from PIL import Image
    os.makedirs(out_dir, exist_ok=True)
    for name, frames in S.items():
        im = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0)); px = im.load()
        for i, f in enumerate(frames):
            assert len(f) == H, name
            for y, r in enumerate(f):
                for x, c in enumerate(r):
                    if c in '._': continue
                    h = PAL[c]; px[i * W + x, y] = (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)
        im.save(f'{out_dir}/{name}.png')
    json.dump(META, open(f'{out_dir}/kit.json', 'w'), indent=1)
if __name__ == '__main__':
    save(sys.argv[1])
    print(len(S), sum(len(v) for v in S.values()))
