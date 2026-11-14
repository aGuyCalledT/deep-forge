# Preview sheets of the dwarf kit (python3 preview.py <dir>): the base model's walk sheet in the layout of the
# reference template, plus variants, poses and the valley's travellers.
import sys, os
from build import *
from PIL import Image, ImageDraw
BASE = {'sex': 'm', 'hair': 'short', 'beard': 'full'}
def cell(S, look, pose, frame, cols=None):
    return to_image(compose(S, look, pose, frame), cols if cols is not None else recolour(look))
def grid_image(rows, labels=None, bg=(74, 68, 82, 255), pad=4, scale=3):
    h = max(max(c.height for c in r) for r in rows); w = max(sum(c.width + pad for c in r) for r in rows)
    lab = 70 if labels else 0
    im = Image.new('RGBA', (w + lab, len(rows) * (h + pad)), bg)
    d = ImageDraw.Draw(im)
    for j, r in enumerate(rows):
        x = lab
        if labels: d.text((4, j * (h + pad) + h // 2 - 5), labels[j], fill=(230, 225, 230, 255))
        for c in r:
            im.alpha_composite(c, (x, j * (h + pad) + h - c.height)); x += c.width + pad
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)
def walk_sheet(S, look):
    rows = []
    for pose in ('walkBack', 'walk', 'walkFront', 'walk'):
        r = [cell(S, look, pose, f) for f in range(3)]
        if len(rows) == 3: r = [c.transpose(Image.FLIP_LEFT_RIGHT) for c in r]
        rows.append(r)
    im = Image.new('RGBA', (W * 3, H * 4), (0, 0, 0, 0))
    for j, r in enumerate(rows):
        for i, c in enumerate(r): im.alpha_composite(c, (i * W, j * H))
    return im
if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    os.makedirs(out, exist_ok=True)
    S = build_sheets()
    base = walk_sheet(S, BASE); base.save(f'{out}/base_walk.png')
    fem = {'sex': 'f', 'hair': 'braids', 'hairColor': '#d8a040', 'tunicColor': '#5a7ab8'}
    walk_sheet(S, fem).save(f'{out}/female_walk.png')
    big = Image.new('RGBA', (W * 6 + 8, H * 4), (74, 68, 82, 255)); big.alpha_composite(base, (0, 0)); big.alpha_composite(walk_sheet(S, fem), (W * 3 + 8, 0))
    big.resize((big.width * 4, big.height * 4), Image.NEAREST).save(f'{out}/walk_m_f_x4.png')
    # hair styles: male and female, front / side / back
    rows, labels = [], []
    for st in STYLES:
        r = []
        for sex in 'mf':
            look = {'sex': sex, 'hair': st, 'beard': 'full'}
            r += [cell(S, look, 'idle', 0), cell(S, look, 'idleSide', 0), cell(S, look, 'idleBack', 0)]
        rows.append(r); labels.append(st)
    grid_image(rows, labels).save(f'{out}/hair.png')
    rows, labels = [], []
    for b in BEARDS:
        look = {'sex': 'm', 'hair': 'short', 'beard': b}
        rows.append([cell(S, look, 'idle', 0), cell(S, look, 'idleSide', 0), cell(S, look, 'idleBack', 0)]); labels.append(b)
    for h in HATS:
        for sex, st in (('m', 'short'), ('f', 'long')):
            look = {'sex': sex, 'hair': st, 'beard': 'full', 'hat': h, 'hatColor': '#8a5a9a' if h != 'helm' else None}
            rows.append([cell(S, look, 'idle', 0), cell(S, look, 'idleSide', 0), cell(S, look, 'idleBack', 0)]); labels.append(h + ' ' + sex)
    grid_image(rows, labels).save(f'{out}/beards_hats.png')
    rows, labels = [], []                     # seated and working in every view
    for sex in 'mf':
        look = {'sex': sex, 'hair': 'short' if sex == 'm' else 'bun', 'beard': 'full'}
        for pose in ('sitSide', 'sitBack', 'workSit', 'workBack', 'workSitBack', 'workSitFront'):
            rows.append([cell(S, look, pose, f) for f in range(len(POSES[pose][1]))]); labels.append(f'{pose} {sex}')
    grid_image(rows, labels).save(f'{out}/seated_work.png')
    rows, labels = [], []
    for sex in 'mf':
        look = {'sex': sex, 'hair': 'short' if sex == 'm' else 'bun', 'beard': 'full'}
        for pose in ('idle', 'talk', 'hands', 'sit', 'eat', 'drink', 'work', 'sleep'):
            n = len(POSES[pose][1]); rows.append([cell(S, look, pose, f) for f in range(n)]); labels.append(f'{pose} {sex}')
        rows.append([cell(S, {**look, 'mood': m}, 'idle', 0) for m in MOODS] + [cell(S, {**look, 'mood': m}, 'idleSide', 0) for m in MOODS]); labels.append(f'moods {sex}')
    grid_image(rows, labels, scale=2).save(f'{out}/poses.png')
    travellers = [
        ('merchant', {'sex': 'f', 'hair': 'bun', 'hairColor': '#c4622d', 'tunicColor': '#b0503c', 'vestColor': '#e0c08a', 'skinColor': '#e2b08a'}),
        ('pilgrim', {'sex': 'm', 'hair': 'bald', 'beard': 'long', 'hairColor': '#b8b4bc', 'tunicColor': '#7a7468', 'hat': 'hood', 'hatColor': '#6a6458', 'vest': False}),
        ('bard', {'sex': 'f', 'hair': 'long', 'hairColor': '#e0b04a', 'tunicColor': '#7a58b0', 'vestColor': '#5a8a4a', 'skinColor': '#d9a77c', 'prop': 'mug_down'}),
        ('peddler', {'sex': 'm', 'hair': 'short', 'beard': 'short', 'hairColor': '#7a3b1e', 'tunicColor': '#3f7d48', 'hat': 'cap', 'hatColor': '#c9a27a', 'prop': 'sack'}),
        ('guard', {'sex': 'm', 'hair': 'short', 'beard': 'wide', 'hairColor': '#3b2a20', 'tunicColor': '#5a6a8a', 'hat': 'helm', 'prop': 'axe', 'skinColor': '#8d5a3b'}),
        ('miner', {'sex': 'f', 'hair': 'topknot', 'hairColor': '#1e1a18', 'tunicColor': '#8a6a3a', 'skinColor': '#6e4430'}),
    ]
    grid_image([[cell(S, l, 'idle', 0) for _, l in travellers], [cell(S, l, 'idleSide', 0) for _, l in travellers]], ['front', 'side']).save(f'{out}/travellers.png')
    print('ok')
