# Builds the 48 x 64 dwarf kit: part strips (PNG) + kit.json, and preview sheets.
#   python3 art-src/dwarves/build.py src/main/resources/static/art/dwarves     (without a folder: art-src/out/dwarves)
# The parts are the source the game will stack (see docs/SPRITES.md); compose() here does the same stacking in Python,
# so the previews show exactly what the game will draw.
import json, os, sys, colorsys
from parts import *

# ------------------------------------------------------------------ the part strips: name -> list of frames
def build_sheets():
    S = {}
    for sex in 'mf':
        S[f'front_legs_{sex}'] = [legs(sex, 'front', f) for f in range(4)]
        S[f'back_legs_{sex}'] = [legs(sex, 'back', f) for f in range(4)]
        S[f'side_legs_{sex}'] = [legs(sex, 'side', f) for f in range(4)]
        for v in VIEWS:
            S[f'{v}_body_{sex}'] = [body(sex, v)]
            S[f'{v}_vest_{sex}'] = [vest(sex, v)]
        S[f'front_arms_{sex}'] = [front_arms(sex, f) for f in range(6)]
        S[f'back_arms_{sex}'] = [back_arms(sex, f) for f in range(6)]
        S[f'front_face_{sex}'] = [face('front', m, sex) for m in MOODS]
        S[f'side_face_{sex}'] = [face('side', m, sex) for m in MOODS]
    S['side_arm_far'] = [side_arm('m', f, True) for f in range(6)]
    S['side_arm_near'] = [side_arm('m', f, False) for f in range(6)]
    for v in VIEWS:
        S[f'{v}_head'] = [head(v)]
        S[f'{v}_hair'] = [hair(v, s) for s in STYLES]
        S[f'{v}_beard'] = [beard(v, b) for b in BEARDS]
        S[f'{v}_hat'] = [hat(v, h) for h in HATS]
    S['front_prop'] = [prop(k) for k in PROPS]
    S['side_prop'] = [side_prop(k) for k in SIDE_PROPS]
    S['side_quilt'] = [quilt(0), quilt(1)]
    return S

# ------------------------------------------------------------------ poses: per frame (legs, arms, dy, mood, prop)
# front arms: 0 walk A, 1 stand, 2 walk B, 3 hands down, 4 hand at chest, 5 hand at mouth; legs 3 = seated (all views)
POSES = {
 'idle':    ('front', [(1, 1, 0, None, None), (1, 1, 1, None, None)]),
 'talk':    ('front', [(1, 1, 0, 'open', None), (1, 1, 0, None, None), (1, 1, 0, 'open', None), (1, 1, 0, None, None)]),
 'hands':   ('front', [(1, 3, 0, None, None), (1, 4, 0, None, None), (1, 5, 0, None, None), (1, 4, 0, None, None)]),
 'sit':     ('front', [(3, 1, 5, None, None), (3, 1, 6, None, None)]),
 'sitTalk': ('front', [(3, 1, 5, 'open', None), (3, 1, 5, None, None), (3, 1, 5, 'open', None), (3, 1, 5, None, None)]),
 'eat':     ('front', [(3, 3, 5, None, None), (3, 4, 5, None, 'spoon_mid'), (3, 5, 5, None, 'spoon_up'), (3, 4, 5, None, 'spoon_mid')]),
 'drink':   ('front', [(3, 3, 5, None, 'mug_down'), (3, 5, 5, None, 'mug_up')]),
 'walkFront': ('front', [(0, 0, 1, None, None), (1, 1, 0, None, None), (2, 2, 1, None, None), (1, 1, 0, None, None)]),
 'walkBack':  ('back', [(0, 0, 1, None, None), (1, 1, 0, None, None), (2, 2, 1, None, None), (1, 1, 0, None, None)]),
 'idleBack':  ('back', [(1, 1, 0, None, None)]),
 'walk':    ('side', [(0, 0, 1, None, None), (1, 1, 0, None, None), (2, 2, 1, None, None), (1, 1, 0, None, None)]),
 'idleSide': ('side', [(1, 1, 0, None, None)]),
 'work':    ('side', [(1, 3, 0, None, None), (1, 4, 0, None, None), (1, 5, 0, None, None), (1, 4, 0, None, None)]),
 'sleep':   ('side', [(1, 1, 0, 'sleep', 0), (1, 1, 0, 'sleep', 1)]),
 # seated from the side and from behind, and working in every view (back arms 3-5: at the bench, hammer up, strike)
 'sitSide':  ('side', [(3, 1, 5, None, None), (3, 1, 6, None, None)]),
 'sitBack':  ('back', [(3, 1, 5, None, None), (3, 1, 6, None, None)]),
 'workSit':  ('side', [(3, 3, 5, None, None), (3, 4, 5, None, None), (3, 5, 5, None, None), (3, 4, 5, None, None)]),
 'workBack': ('back', [(1, 3, 0, None, None), (1, 4, 0, None, None), (1, 5, 0, None, None), (1, 4, 0, None, None)]),
 'workSitBack': ('back', [(3, 3, 5, None, None), (3, 4, 5, None, None), (3, 5, 5, None, None), (3, 4, 5, None, None)]),
 'workSitFront': ('front', [(3, 3, 5, None, None), (3, 4, 5, None, None), (3, 3, 5, None, None), (3, 4, 5, None, None)]),
 # mining: the pick raised, swung, striking (twice as long on the strike)
 'mine':    ('side', [(1, 5, 0, None, 'pick_up'), (1, 4, 0, None, 'pick_mid'), (1, 3, 0, None, 'pick_down'), (1, 3, 0, 'angry', 'pick_down')]),
}

def frame_of(S, name, i):
    return S[name][i] if name in S else None
def shifted(p, dy): return p.shift(dy=dy) if (p is not None and dy) else p
def clip_hair(p, hat_on):
    if p is None or not hat_on: return p
    q = Part(); q.c = p.c.copy(); q.c[:HAT_CLIP, :] = None; return q
def compose(S, look, pose, frame):
    """look: {sex, hair, beard, hat, vest, mood, prop}. Returns a grid of (ramp, tone) or None."""
    view, frames = POSES[pose]
    lf, af, dy, mood, extra = frames[frame % len(frames)]
    sex = look.get('sex', 'm')
    mood = mood or look.get('mood', 'neutral')
    beard_i = BEARDS.index(look['beard']) if sex == 'm' and look.get('beard') else None
    hat_i = HATS.index(look['hat']) if look.get('hat') else None
    hair_p = clip_hair(S[f'{view}_hair'][STYLES.index(look.get('hair', 'short'))], hat_i is not None)
    up = lambda p: shifted(p, dy)
    vest_p = S[f'{view}_vest_{sex}'][0] if look.get('vest', True) else None
    hat_p = S[f'{view}_hat'][hat_i] if hat_i is not None else None
    beard_p = S[f'{view}_beard'][beard_i] if beard_i is not None else None
    if view == 'front':
        prop_name = extra or look.get('prop')
        layers = [S[f'front_legs_{sex}'][lf], up(S[f'front_body_{sex}'][0]), up(vest_p), up(S['front_head'][0]),
                  up(S[f'front_face_{sex}'][MOODS.index(mood)]), up(hair_p), up(hat_p), up(beard_p),
                  up(S[f'front_arms_{sex}'][af]), up(S['front_prop'][PROPS.index(prop_name)] if prop_name else None)]
    elif view == 'back':
        layers = [S[f'back_legs_{sex}'][lf], up(S[f'back_body_{sex}'][0]), up(vest_p), up(beard_p), up(S['back_head'][0]),
                  up(hair_p), up(hat_p), up(S[f'back_arms_{sex}'][af])]
    else:
        back_prop = isinstance(extra, str) and extra.endswith('_up')
        layers = [up(S['side_prop'][SIDE_PROPS.index(extra)] if back_prop else None), up(S['side_arm_far'][af]), S[f'side_legs_{sex}'][lf], up(S[f'side_body_{sex}'][0]), up(vest_p),
                  up(S['side_head'][0]), up(S[f'side_face_{sex}'][MOODS.index(mood)]), up(hair_p), up(hat_p), up(beard_p),
                  up(S['side_prop'][SIDE_PROPS.index(extra)] if isinstance(extra, str) and not back_prop else None), up(S['side_arm_near'][af])]
        if pose == 'sleep': layers.append(S['side_quilt'][extra])
    g = compose_parts([l for l in layers if l is not None]).c
    if pose == 'sleep': g = np.rot90(g)            # lie down: head to the left
    return g

# ------------------------------------------------------------------ colours: the same ramps the game makes (ramp() in static/js/art/dwarves.js)
def _hsl(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)); hh, l, s = colorsys.rgb_to_hls(r, g, b); return hh * 360, s, l
def _hex(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, max(0, min(1, l)), max(0, min(1, s))); return '#%02x%02x%02x' % tuple(round(v * 255) for v in (r, g, b))
def ramp(base, soft=False):
    h, s, l = _hsl(base); out = []
    towards = lambda h, t, by: h + max(-by, min(by, ((t - h + 540) % 360) - 180))
    for o in (-0.3, -0.18, -0.08, 0, 0.1):
        if not o: out.append(base); continue
        k = 0.25 if soft else 1
        hh = towards(h, 255, -o * 40 * k) if o < 0 else towards(h, 50, o * 40 * k)
        ss = s + (o < 0 and (-0.12 if soft else 0.06) or -0.04)
        out.append(_hex(hh, ss, max(0.03, min(0.97, l + o))))
    return out
def recolour(look):
    """Placeholder ramp -> the look's colours. The placeholder's tone 3 is the base colour."""
    m = {}
    for name, key in (('skin', 'skinColor'), ('hair', 'hairColor'), ('tunic', 'tunicColor'), ('vest', 'vestColor'),
                      ('pants', 'pantsColor'), ('boots', 'bootColor'), ('cloth', 'hatColor'), ('metal', 'hatColor')):
        if look.get(key): m[name] = ramp(look[key], name == 'skin')
    return m
def to_image(grid, cols=None, scale=1):
    from PIL import Image
    h, w = grid.shape
    im = Image.new('RGBA', (w * scale, h * scale), (0, 0, 0, 0)); px = im.load()
    for y in range(h):
        for x in range(w):
            v = grid[y, x]
            if v is None: continue
            rp, i = v
            c = EX[rp] if rp in EX else (cols[rp][i] if cols and rp in cols else R[rp][i])
            rgb = tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
            for dy in range(scale):
                for dx in range(scale): px[x * scale + dx, y * scale + dy] = rgb
    return im

# ------------------------------------------------------------------ export
PART_DIR = {'arm': 'arms', 'prop': 'props'}

def file_of(name):
    """Where a strip is saved: by part, then view (front_hair -> hair/front.png, side_arm_far -> arms/side_far.png)."""
    view, part, *rest = name.split('_')
    return f"{PART_DIR.get(part, part)}/{'_'.join([view] + rest)}.png"

def export(S, out):
    from PIL import Image
    os.makedirs(out, exist_ok=True)
    for name, frames in S.items():
        im = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
        for i, f in enumerate(frames): im.alpha_composite(to_image(f.c), (i * W, 0))
        os.makedirs(os.path.dirname(f'{out}/{file_of(name)}'), exist_ok=True)
        im.save(f'{out}/{file_of(name)}')
    meta = {
        'cell': [W, H], 'anchor': [24, 62], 'hatClip': HAT_CLIP,
        'styles': STYLES, 'beards': BEARDS, 'hats': HATS, 'moods': MOODS, 'props': PROPS, 'sideProps': SIDE_PROPS,
        'sheets': {k: len(v) for k, v in S.items()},
        'files': {k: file_of(k) for k in S},
        'poses': {k: {'view': v, 'frames': [list(f) for f in fr]} for k, (v, fr) in POSES.items()},
        'order': {
            'front': ['legs', 'body', 'vest', 'head', 'face', 'hair', 'hat', 'beard', 'arms', 'prop'],
            'back': ['legs', 'body', 'vest', 'beard', 'head', 'hair', 'hat', 'arms'],
            'side': ['side_prop_back', 'arm_far', 'legs', 'body', 'vest', 'head', 'face', 'hair', 'hat', 'beard', 'side_prop', 'arm_near', 'quilt'],
        },
        'ramps': {k: v for k, v in R.items()},
        'fixed': EX,
        'note': 'Tone 3 of each ramp is the base colour. A frame row: [legs, arms, dy, mood or null, prop name / quilt index or null]. '
                'Legs are not moved by dy. Side view faces right; mirror for left. Sleep is the side frame turned a quarter left.',
    }
    json.dump(meta, open(f'{out}/kit.json', 'w'), indent=1)

if __name__ == '__main__':
    S = build_sheets()
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'dwarves')
    export(S, out)
    print(len(S), 'sheets,', sum(len(v) for v in S.values()), 'frames')
    # own pictures from art-src/png (tools/sprites) go back in when the game's set was written
    if os.path.realpath(out).endswith(os.path.join('static', 'art', 'dwarves')):
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools', 'sprites'))
        import spritelib; spritelib.after_build('dwarves')
