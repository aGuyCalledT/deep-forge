# Export of the 48-px art (blocks 0-8) for the game: one sprite sheet, a glow mask and a JSON index.
#   python3 art-src/props48/export.py [<out dir>]      default: src/main/resources/static/art/props48
# Writes
#   sheet.png   every frame of every sprite and tile, packed in shelves
#   glow.png    the same layout, only pixels that light themselves (flames, crystals, glow mushrooms, lava, sparks)
#   sheet.json  name -> {kind, group, frames: [[x, y, w, h, ax, ay], ...], recolour: [...]}
#               ax, ay = the anchor inside the frame (props: bottom centre on the floor; wall things: where they hang;
#               tiles: 0, 0). Placeholder ramps (recolour) are drawn in the colours listed under "placeholders";
#               the game swaps those exact colours, tone by tone, for the ramp it wants (tone 3 = base colour).
# Then it reads sheet.png back and checks every frame against its source pixels.
import sys, os, json, inspect
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); os.chdir(HERE)
from ambient import *
import valley as V
import shells as SH
from ways import WAYS, WAY_SPRITES, WAY_TILES
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../src/main/resources/static/art/props48')
PLACEHOLDERS = {'ingot': R['iron'], 'rockd': DEPTHS[0]}
SHEET_W = 1024

def frames_of(f):
    ps = inspect.signature(f).parameters
    if any(n in ps for n in ('frame', 'f')): return [f(i) for i in range(4)]
    return [f()]
def as_sprite(g, anchor=(0, 0)): return {'grid': g, 'anchor': anchor}

# ------------------------------------------------------------------ collect: name -> (kind, group, [sprite, ...])
ITEMS = {}
def add(group, kind, table):
    for name, f in table.items():
        assert name not in ITEMS, f'duplicate sprite name {name}'
        ITEMS[name] = (kind, group, frames_of(f))
add('furniture', 'prop', PROPS)
add('living', 'prop', LIVING)
add('workshop', 'prop', WORK)
add('storage', 'prop', STORE)
add('shell', 'prop', SPRITES)                                           # post, column
add('valley', 'prop', {'oak': V.oak, 'fir': V.fir, 'bush': V.bush, 'flowers': V.flowers, 'stall': V.stall,
                       'signpost': V.signpost, 'well': V.well, 'fence': V.fence, 'wagon': V.wagon, 'brazier': V.brazier})
add('ways', 'prop', WAYS)
add('ways', 'prop', WAY_SPRITES)
for k, f in WAY_TILES.items(): ITEMS[k] = ('tile', 'shell', [as_sprite(f())])
add('rock', 'prop', ROCK)
ITEMS['drip'] = ('prop', 'rock', frames_of(drip))
add('monster', 'prop', MONSTERS)
add('ambient', 'prop', AMBIENT)
for k, s in pipes().items(): ITEMS[k] = ('prop', 'ambient', [s])
for k, f in TILES.items(): ITEMS[k] = ('tile', 'shell', [as_sprite(f())])
for d in range(5):                                                       # rock per mine layer, already in its colours
    ITEMS[f'rock_{d}'] = ('tile', 'rock', [as_sprite(rock_tile(d))])

# valley backdrops: drawn on a scene canvas, cut out here
def canvas(w, h): return np.full((h, w), None, object), np.zeros((h, w), bool)
def cut(cv, ax, ay):
    ys, xs = np.nonzero(cv != None)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    return as_sprite(cv[y0:y1 + 1, x0:x1 + 1], (ax - x0, ay - y0))
for time in ('day', 'dusk', 'night'):
    cv, em = canvas(96, 220); V.sky(cv, em, 96, 220, time, 210)
    ITEMS[f'sky_{time}'] = ('tile', 'valley', [as_sprite(cv)])
    cv, em = canvas(576, 256)
    V.mountains(cv, em, 576, time, [(212, 96, 3, 0.5, True, None), (232, 52, 8, 0.3, False, None), (248, 26, 13, 0.16, False, '#4a6a3a')])
    ITEMS[f'mountains_{time}'] = ('tile', 'valley', [cut(cv, 0, 250)])  # anchor: left end of the ground line
cv, em = canvas(576, 40); V.meadow(cv, em, 576, 2, 38)
ITEMS['meadow'] = ('tile', 'valley', [cut(cv, 0, 2)])                    # anchor: left end of the grass line
cv, em = canvas(96, 288); V.rockface(cv, em, 0, 96, 288, 250)
ITEMS['rockface'] = ('tile', 'valley', [as_sprite(cv)])
cv, em = canvas(120, 140); V.gate(cv, em, 60, 130)
ITEMS['gate'] = ('prop', 'valley', [cut(cv, 60, 131)])
cv, em = canvas(40, 40); V.disc(cv, em, 20, 20, 11, R['sun'][4:1:-1])
ITEMS['sun'] = ('prop', 'valley', [cut(cv, 20, 20)])
cv, em = canvas(24, 24); V.moon(cv, em, 12, 12, 9)
ITEMS['moon'] = ('prop', 'valley', [cut(cv, 12, 12)])

# ------------------------------------------------------------------ pack
def rgba(v):
    if v is None: return None
    c = v if isinstance(v, str) else (EX[v[0]] if v[0] in EX else (PLACEHOLDERS.get(v[0]) or R[v[0]])[v[1]])
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
def glows(v): return v is not None and not isinstance(v, str) and v[0] in EMIT
order = sorted(((name, i) for name, (_, _, fr) in ITEMS.items() for i in range(len(fr))),
               key=lambda k: (-ITEMS[k[0]][2][k[1]]['grid'].shape[0], k[0], k[1]))
pos = {}; x = y = shelf = 0
for name, i in order:
    h, w = ITEMS[name][2][i]['grid'].shape
    assert w <= SHEET_W, f'{name} is wider than the sheet'
    if x + w > SHEET_W: x = 0; y += shelf + 1; shelf = 0
    pos[name, i] = (x, y); x += w + 1; shelf = max(shelf, h)
H_SHEET = y + shelf
sheet = Image.new('RGBA', (SHEET_W, H_SHEET), (0, 0, 0, 0)); glow = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
sp, gp = sheet.load(), glow.load()
index = {}
for name, (kind, group, frames) in ITEMS.items():
    rec = sorted({v[0] for s in frames for v in s['grid'].flat if v is not None and not isinstance(v, str) and v[0] in PLACEHOLDERS})
    entry = {'kind': kind, 'group': group, 'frames': []}
    if rec: entry['recolour'] = rec
    if any(glows(v) for s in frames for v in s['grid'].flat): entry['glow'] = True
    for i, s in enumerate(frames):
        g = s['grid']; ox, oy = pos[name, i]
        for j in range(g.shape[0]):
            for k in range(g.shape[1]):
                c = rgba(g[j, k])
                if c: sp[ox + k, oy + j] = c
                if glows(g[j, k]): gp[ox + k, oy + j] = c
        ax, ay = s['anchor']
        entry['frames'].append([ox, oy, g.shape[1], g.shape[0], int(ax), int(ay)])
    index[name] = entry
os.makedirs(OUT, exist_ok=True)
sheet.save(f'{OUT}/sheet.png', optimize=True); glow.save(f'{OUT}/glow.png', optimize=True)
meta = {
    'version': 1, 'cell': CELL, 'roomHeight': RH, 'floorY': FLOOR, 'dwarfCell': [48, 64], 'dwarfAnchor': [24, 62],
    'placeholders': PLACEHOLDERS, 'depths': DEPTHS,
    'sky': V.SKY,
    'note': 'Frames: [x, y, w, h, anchorX, anchorY]. Props stand with their anchor on the floor line (wall things hang '
            'from it), tiles repeat sideways from their left edge. Animated sprites have 4 frames. Swap the colours of '
            'a placeholder ramp tone by tone for another 5-tone ramp; tone 3 is the base colour. glow.png has the '
            'self-lit pixels in the same places, for the light pass.',
    'sprites': index,
}
with open(f'{OUT}/sheet.json', 'w') as fh: json.dump(meta, fh, separators=(',', ':'))

# ------------------------------------------------------------------ check: read back and compare
back = Image.open(f'{OUT}/sheet.png').convert('RGBA').load()
bad = 0
for name, (kind, group, frames) in ITEMS.items():
    for i, s in enumerate(frames):
        fx, fy, fw, fh, _, _ = index[name]['frames'][i]
        g = s['grid']
        for j in range(fh):
            for k in range(fw):
                want = rgba(g[j, k]); got = back[fx + k, fy + j]
                if (want or (0, 0, 0, 0))[3] != got[3] or (want and want != got): bad += 1
assert bad == 0, f'{bad} pixels differ after the round trip'
ph = {c for r in PLACEHOLDERS.values() for c in r}
for name, (kind, group, frames) in ITEMS.items():                 # a swap must not hit pixels of other materials
    if 'recolour' not in index[name]: continue
    for s in frames:
        for v in s['grid'].flat:
            if v is None or isinstance(v, str) or v[0] in PLACEHOLDERS: continue
            c = EX[v[0]] if v[0] in EX else R[v[0]][v[1]]
            assert c not in ph, f'{name}: {v} has a placeholder colour'
n_frames = sum(len(e['frames']) for e in index.values())
print(f'{len(index)} sprites, {n_frames} frames, sheet {SHEET_W} x {H_SHEET}, '
      f'{os.path.getsize(f"{OUT}/sheet.png") // 1024} KB + glow {os.path.getsize(f"{OUT}/glow.png") // 1024} KB, check ok')
