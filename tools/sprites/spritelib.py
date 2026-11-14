"""
Every sprite of the game as a PNG file, and PNG files back into the game's sprite sheets.

Sets (all under src/main/resources/static/art/):
  atlas     atlas.png + atlas.json        UI symbols, buttons, goods, old 24-px art (pxl, art-src/*.px.js)
  props48   props48/sheet.png, glow.png   rooms, walls, floors, furniture, valley, rock, mine, monsters (art-src/props48)
            + sheet.json
  dwarf48   dwarf48/*.png + kit.json      dwarves in the hold, one strip per part, frames 48 x 64 (art-src/dwarf48)
  dwarf     dwarf/*.png                   the old dwarf kit (portraits in the cheat window), whole strips
  backdrop  backdrop/*.png                the valley's far mountains and hills, whole pictures

File names (the same when exporting and when importing, so an exported file can go straight back):
  <set>/<name>.png            a sprite with one picture
  <set>/<name>@<n>.png        picture n (0, 1, ...) of an animated sprite
  <set>/<name>[@n].glow.png   props48 only: the pixels that glow in the dark (optional)
  <set>/<name>.json           props48 only, for a new sprite: {"kind": "prop"|"tile", "group": "...",
                              "anchor": [x, y], "recolour": "ingot"|"rockd"}  (all optional)
  dwarf48/<strip>@<label>.png one frame of a dwarf part; the label is the style name where the kit names them
                              (front_hair@braids, side_hat@miner, front_face_m@happy, front_prop@axe), else
                              the frame number (front_legs_m@2)

Own pictures live in art-src/png/<set>/... and win over the drawn art: `apply` puts them into the sheets.
The art generators (build-art.mjs, export.py, dwarf48/build.py, backdrop.py) call `apply` when they are done,
so own pictures survive a rebuild. Needs Python 3 with Pillow (and nothing else).
"""
import hashlib, io, json, math, os, re, shutil
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'src/main/resources/static/art')
INBOX = os.path.join(ROOT, 'art-src/png')
EXPORT = os.path.join(ROOT, 'sprites-export')
BASE = os.path.join(ROOT, 'art-src/out/sprite-base')     # the drawn art before own pictures went in (not in git)
SETS = ['atlas', 'props48', 'dwarf48', 'dwarf', 'backdrop']
DWARF_CELL = (48, 64)
NAME = re.compile(r'^[a-z0-9][a-z0-9_-]*$')
FILE = re.compile(r'^(?P<name>[a-z0-9][a-z0-9_-]*)(?:@(?P<frame>[a-z0-9_-]+))?(?P<glow>\.glow)?\.png$')

# which files each set consists of (relative to ART)
FILES = {
    'atlas': ['atlas.png', 'atlas.json'],
    'props48': ['props48/sheet.png', 'props48/glow.png', 'props48/sheet.json'],
    'dwarf48': ['dwarf48'],
    'dwarf': ['dwarf'],
    'backdrop': ['backdrop'],
}
# dwarf48 strips whose frames the kit names: strip suffix -> list in kit.json
DWARF_LISTS = [('_hair', 'styles'), ('_beard', 'beards'), ('_hat', 'hats'), ('_face_m', 'moods'), ('_face_f', 'moods'),
               ('front_prop', 'props'), ('side_prop', 'sideProps')]


class SpriteError(Exception):
    pass


def check(ok, msg):
    if not ok: raise SpriteError(msg)


def rel(set_, name, frame=None, frames=1, glow=False):
    """The file name of one picture."""
    f = '' if frame is None or frames == 1 else '@' + str(frame)
    return f'{set_}/{name}{f}{".glow" if glow else ""}.png'


def png_bytes(im):
    b = io.BytesIO()
    im.save(b, 'PNG', optimize=True)
    return b.getvalue()


def load_json(p):
    with open(p, encoding='utf-8') as fh: return json.load(fh)


def save_json(p, data, compact=False):
    with open(p, 'w', encoding='utf-8') as fh:
        if compact: json.dump(data, fh, separators=(',', ':'))
        else: json.dump(data, fh, indent=1)


def rgba(p):
    return Image.open(p).convert('RGBA')


# ------------------------------------------------------------------ dwarf48 labels

def dwarf_list(strip):
    for suffix, key in DWARF_LISTS:
        if strip.endswith(suffix): return key
    return None


def dwarf_labels(kit, strip):
    n = kit['sheets'][strip]
    key = dwarf_list(strip)
    names = kit.get(key, []) if key else []
    return [names[i] if i < len(names) else str(i) for i in range(n)]


# ------------------------------------------------------------------ reading the sheets

def catalogue(art=ART):
    """Every sprite: {id, set, name, kind, group, frames: [{file, w, h, glow}]}."""
    out = []
    a = load_json(os.path.join(art, 'atlas.json'))
    for k, v in a['frames'].items():
        n = k[:-4] if k.endswith('.png') else k
        f = v['frame']
        out.append({'id': 'atlas/' + n, 'set': 'atlas', 'name': n, 'kind': 'sprite', 'group': group_of_atlas(n),
                    'frames': [{'file': rel('atlas', n), 'w': f['w'], 'h': f['h']}]})
    s = load_json(os.path.join(art, 'props48/sheet.json'))
    for n, e in s['sprites'].items():
        fr = e['frames']
        out.append({'id': 'props48/' + n, 'set': 'props48', 'name': n, 'kind': e['kind'], 'group': e['group'],
                    'recolour': e.get('recolour'),
                    'frames': [{'file': rel('props48', n, i, len(fr)), 'w': f[2], 'h': f[3], 'anchor': [f[4], f[5]],
                                'glow': rel('props48', n, i, len(fr), True) if e.get('glow') else None}
                               for i, f in enumerate(fr)]})
    kit = load_json(os.path.join(art, 'dwarf48/kit.json'))
    w, h = kit['cell']
    for strip in kit['sheets']:
        labels = dwarf_labels(kit, strip)
        out.append({'id': 'dwarf48/' + strip, 'set': 'dwarf48', 'name': strip, 'kind': 'part', 'group': strip.split('_')[0],
                    'frames': [{'file': f'dwarf48/{strip}@{l}.png', 'w': w, 'h': h, 'label': l} for l in labels]})
    for set_ in ('dwarf', 'backdrop'):
        d = os.path.join(art, set_)
        for fn in sorted(os.listdir(d)):
            if not fn.endswith('.png'): continue
            n = fn[:-4]
            with Image.open(os.path.join(d, fn)) as im: w, h = im.size
            out.append({'id': f'{set_}/{n}', 'set': set_, 'name': n, 'kind': 'picture', 'group': set_,
                        'frames': [{'file': f'{set_}/{n}.png', 'w': w, 'h': h}]})
    return out


def group_of_atlas(n):
    for p in ('room_', 'bay_', 'ui_', 'btn_', 'wsbtn_', 'ore_', 'bar_', 'item_', 'gem_', 'stone_', 'cave_', 'grow_', 'dig_',
              'monster_', 'tree', 'deco_', 'fire_', 'well', 'shaft', 'gate_', 'entrance_hall'):
        if n.startswith(p): return p.rstrip('_')
    return 'other'


class Sheets:
    """Opened sheets of the current art, for cutting pictures out."""

    def __init__(self, art=ART):
        self.art = art
        self._atlas = self._props = self._glow = None
        self.atlas_json = load_json(os.path.join(art, 'atlas.json'))
        self.props_json = load_json(os.path.join(art, 'props48/sheet.json'))
        self.kit = load_json(os.path.join(art, 'dwarf48/kit.json'))
        self._strips = {}

    def atlas(self):
        if self._atlas is None: self._atlas = rgba(os.path.join(self.art, 'atlas.png'))
        return self._atlas

    def props(self):
        if self._props is None: self._props = rgba(os.path.join(self.art, 'props48/sheet.png'))
        return self._props

    def glow(self):
        if self._glow is None: self._glow = rgba(os.path.join(self.art, 'props48/glow.png'))
        return self._glow

    def strip(self, name):
        if name not in self._strips: self._strips[name] = rgba(os.path.join(self.art, 'dwarf48', name + '.png'))
        return self._strips[name]

    def picture(self, file):
        """The picture for an exported file name (see the module notes), or None."""
        set_, fn = file.split('/', 1)
        m = FILE.match(fn)
        check(m is not None, f'Not a sprite file name: {file}')
        name, frame, glow = m['name'], m['frame'], bool(m['glow'])
        if set_ == 'atlas':
            e = self.atlas_json['frames'].get(name) or self.atlas_json['frames'].get(name + '.png')
            check(e is not None and frame is None and not glow, f'No sprite {file}')
            f = e['frame']
            return self.atlas().crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
        if set_ == 'props48':
            e = self.props_json['sprites'].get(name)
            check(e is not None, f'No sprite {file}')
            i = int(frame) if frame is not None and frame.isdigit() else 0
            check(i < len(e['frames']) and (frame is not None or len(e['frames']) == 1), f'No sprite {file}')
            x, y, w, h = e['frames'][i][:4]
            return (self.glow() if glow else self.props()).crop((x, y, x + w, y + h))
        if set_ == 'dwarf48':
            check(name in self.kit['sheets'] and frame is not None, f'No sprite {file}')
            labels = dwarf_labels(self.kit, name)
            check(frame in labels, f'No frame "{frame}" in {name}: {", ".join(labels)}')
            i = labels.index(frame)
            w, h = self.kit['cell']
            return self.strip(name).crop((i * w, 0, i * w + w, h))
        if set_ in ('dwarf', 'backdrop'):
            p = os.path.join(self.art, set_, name + '.png')
            check(os.path.exists(p) and frame is None, f'No sprite {file}')
            return rgba(p)
        raise SpriteError(f'Unknown set: {set_}')


# ------------------------------------------------------------------ export

def export(files=None, to=EXPORT, art=ART):
    """Write pictures (all of them if files is None) as PNG files. Returns the written paths."""
    sh = Sheets(art)
    if files is None:
        files = []
        for e in catalogue(art):
            for f in e['frames']:
                files.append(f['file'])
                if f.get('glow'): files.append(f['glow'])
    written = []
    for file in files:
        im = sh.picture(file)
        if file.endswith('.glow.png') and im.getbbox() is None: continue   # nothing glows in this picture
        p = os.path.join(to, file)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        im.save(p, 'PNG', optimize=True)
        written.append(p)
    return written


# ------------------------------------------------------------------ own pictures into the sheets

def inbox_files(set_=None, inbox=INBOX):
    """Own pictures waiting in art-src/png: [(set, file name, path)]."""
    out = []
    for s in SETS if set_ is None else [set_]:
        d = os.path.join(inbox, s)
        if not os.path.isdir(d): continue
        for fn in sorted(os.listdir(d)):
            if fn.endswith('.png'): out.append((s, fn, os.path.join(d, fn)))
    return out


def _digest(art, set_):
    h = hashlib.sha1()
    for f in FILES[set_]:
        p = os.path.join(art, f)
        paths = [os.path.join(p, x) for x in sorted(os.listdir(p))] if os.path.isdir(p) else [p]
        for q in paths:
            if os.path.isfile(q):
                h.update(os.path.basename(q).encode())
                with open(q, 'rb') as fh: h.update(fh.read())
    return h.hexdigest()


def _copy(src_root, dst_root, set_):
    for f in FILES[set_]:
        s, d = os.path.join(src_root, f), os.path.join(dst_root, f)
        if os.path.isdir(s):
            if os.path.isdir(d): shutil.rmtree(d)
            shutil.copytree(s, d)
        else:
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copy2(s, d)


def apply(sets=None, art=ART, inbox=INBOX, base=BASE, log=print):
    """
    Put the own pictures into the sheets. The drawn art is kept in art-src/out/sprite-base: when the art in static/
    is not what the last apply wrote (a generator ran, or the first run), it becomes the new base. So taking an own
    picture away brings the drawn one back.
    """
    stamp_p = os.path.join(base, 'stamp.json')
    stamp = load_json(stamp_p) if os.path.exists(stamp_p) else {}
    done, errors = {}, []
    for set_ in SETS if sets is None else sets:
        own = inbox_files(set_, inbox)
        cur = _digest(art, set_)
        has_base = all(os.path.exists(os.path.join(base, f)) for f in FILES[set_])
        if stamp.get(set_) != cur or not has_base:
            if not own and not has_base:   # nothing to do, and nothing to remember
                continue
            _copy(art, base, set_)          # the art as drawn: the new base
        else:
            _copy(base, art, set_)          # start again from the drawn art
        try:
            n = APPLY[set_](art, own) if own else 0
        except SpriteError as e:   # the drawn art stays; tell what to fix and go on with the other sets
            _copy(base, art, set_)
            log(f'{set_}: NOT applied: {e}')
            errors.append(str(e))
            n = 0
        stamp[set_] = _digest(art, set_)
        done[set_] = n
        if own and n: log(f'{set_}: {n} own picture(s) in')
    os.makedirs(base, exist_ok=True)
    save_json(stamp_p, stamp)
    if errors: raise SpriteError('; '.join(errors))
    return done


def after_build(set_):
    """Called by the art generators when they wrote a set: put the own pictures back in. Never stops the build."""
    try:
        apply([set_], log=lambda m: print('own sprites:', m))
    except Exception as e:
        print(f'WARNING own sprites ({set_}) not applied: {e}')


def _pack(sizes, pad=1, max_w=None):
    """Shelf packing, tallest first. sizes: [(w, h)]. Returns ([(x, y)], sheet w, sheet h)."""
    if not sizes: return [], 1, 1
    area = sum((w + pad) * (h + pad) for w, h in sizes)
    width = max_w or max(max(w for w, _ in sizes) + pad, int(math.sqrt(area) * 1.15))
    order = sorted(range(len(sizes)), key=lambda i: (-sizes[i][1], -sizes[i][0]))
    pos = [None] * len(sizes)
    x = y = row_h = 0
    for i in order:
        w, h = sizes[i]
        if x + w > width and x > 0:
            y += row_h + pad; x = 0; row_h = 0
        pos[i] = (x, y)
        x += w + pad
        row_h = max(row_h, h)
    return pos, width, y + row_h


def _parse(set_, fn):
    m = FILE.match(fn)
    check(m is not None, f'{set_}/{fn}: use lower-case letters, digits, _ and -, e.g. {set_}/my_sprite.png')
    return m['name'], m['frame'], bool(m['glow'])


def _apply_atlas(art, own):
    j = load_json(os.path.join(art, 'atlas.json'))
    sheet = rgba(os.path.join(art, 'atlas.png'))
    pics = {}
    for k, v in j['frames'].items():
        f = v['frame']
        pics[k] = sheet.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
    n = 0
    for _, fn, p in own:
        name, frame, glow = _parse('atlas', fn)
        check(frame is None and not glow, f'atlas/{fn}: atlas sprites have one picture each (no @ in the name)')
        k = name + '.png' if name + '.png' in j['frames'] else name
        if k not in j['frames']:
            j['frames'][k] = {'frame': {}, 'rotated': False, 'trimmed': False, 'spriteSourceSize': {}, 'sourceSize': {}}
        pics[k] = rgba(p)
        n += 1
    keys = list(j['frames'])
    pos, w, h = _pack([pics[k].size for k in keys])
    out = Image.new('RGBA', (w, h))
    for k, (x, y) in zip(keys, pos):
        im = pics[k]
        out.paste(im, (x, y))
        e = j['frames'][k]
        e['frame'] = {'x': x, 'y': y, 'w': im.width, 'h': im.height}
        e['spriteSourceSize'] = {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}
        e['sourceSize'] = {'w': im.width, 'h': im.height}
    j['meta']['size'] = {'w': w, 'h': h}
    out.save(os.path.join(art, 'atlas.png'), optimize=True)
    save_json(os.path.join(art, 'atlas.json'), j)
    return n


def _apply_props(art, own):
    jp = os.path.join(art, 'props48/sheet.json')
    j = load_json(jp)
    sheet, glow = rgba(os.path.join(art, 'props48/sheet.png')), rgba(os.path.join(art, 'props48/glow.png'))
    pics = {}   # name -> [[image, glow image, ax, ay]]
    for name, e in j['sprites'].items():
        pics[name] = [[sheet.crop((x, y, x + w, y + h)), glow.crop((x, y, x + w, y + h)), ax, ay] for x, y, w, h, ax, ay in e['frames']]
    files = {fn: p for _, fn, p in own}
    n = 0
    # pictures first (frames in order, so @2 after @1), glow afterwards
    def key(fn):
        name, frame, g = _parse('props48', fn)
        return (name, g, int(frame) if frame and frame.isdigit() else -1)
    for fn in sorted(files, key=key):
        name, frame, g = _parse('props48', fn)
        check(frame is None or frame.isdigit(), f'props48/{fn}: the picture number after @ is a number (name@0.png, name@1.png)')
        i = int(frame) if frame is not None else 0
        side = os.path.join(os.path.dirname(files[fn]), name + '.json')
        meta = load_json(side) if os.path.exists(side) else {}
        if name not in j['sprites']:
            check(not g, f'props48/{fn}: a glow picture needs its sprite ({name}.png or {name}@0.png)')
            kind = meta.get('kind', 'prop')
            check(kind in ('prop', 'tile'), f'props48/{name}.json: kind is "prop" or "tile"')
            j['sprites'][name] = {'kind': kind, 'group': str(meta.get('group', 'custom'))}
            if meta.get('recolour') in (j.get('placeholders') or {}): j['sprites'][name]['recolour'] = meta['recolour']
            pics[name] = []
        fr = pics[name]
        if g:
            check(i < len(fr), f'props48/{fn}: there is no picture {i} to glow')
            im = rgba(files[fn])
            check(im.size == fr[i][0].size, f'props48/{fn}: the glow picture must be as big as the sprite ({fr[i][0].width} x {fr[i][0].height})')
            fr[i][1] = im
            j['sprites'][name]['glow'] = True
            n += 1
            continue
        check(i <= len(fr), f'props48/{fn}: picture {len(fr)} comes first (pictures are numbered 0, 1, 2 ...)')
        im = rgba(files[fn])
        e = j['sprites'][name]
        if i < len(fr):
            old, oglow, ax, ay = fr[i]
            if im.size == old.size:
                # keep the glow where the picture did not change
                g2 = Image.new('RGBA', im.size)
                g2.paste(oglow, (0, 0), _equal_mask(im, old))
            else:
                g2 = Image.new('RGBA', im.size)
                if e['kind'] == 'prop':   # same spot on the floor: keep the anchor's place from the bottom middle
                    ax = round(ax * im.width / max(1, old.width))
                    ay = ay + im.height - old.height
            fr[i] = [im, g2, ax, ay]
        else:
            ax, ay = (0, 0) if e['kind'] == 'tile' else (im.width // 2, im.height)
            fr.append([im, Image.new('RGBA', im.size), ax, ay])
        if 'anchor' in meta and isinstance(meta['anchor'], list) and len(meta['anchor']) == 2:
            fr[i][2], fr[i][3] = int(meta['anchor'][0]), int(meta['anchor'][1])
        n += 1
    names = list(j['sprites'])
    flat = [(nm, k) for nm in names for k in range(len(pics[nm]))]
    pos, w, h = _pack([pics[nm][k][0].size for nm, k in flat], pad=1, max_w=max(1024, max(pics[nm][k][0].width for nm, k in flat) + 1))
    out, gout = Image.new('RGBA', (w, h)), Image.new('RGBA', (w, h))
    frames = {nm: [] for nm in names}
    for (nm, k), (x, y) in zip(flat, pos):
        im, gl, ax, ay = pics[nm][k]
        out.paste(im, (x, y)); gout.paste(gl, (x, y))
        frames[nm].append([x, y, im.width, im.height, ax, ay])
    for nm in names: j['sprites'][nm]['frames'] = frames[nm]
    out.save(os.path.join(art, 'props48/sheet.png'), optimize=True)
    gout.save(os.path.join(art, 'props48/glow.png'), optimize=True)
    save_json(jp, j, compact=True)
    return n


def _equal_mask(a, b):
    """'1' where two pictures of the same size have the same pixel."""
    import numpy as np
    A, B = np.asarray(a), np.asarray(b)
    same = np.all(A == B, axis=2)
    return Image.fromarray((same * 255).astype('uint8'), 'L')


def _apply_dwarf48(art, own):
    d = os.path.join(art, 'dwarf48')
    kit = load_json(os.path.join(d, 'kit.json'))
    cw, ch = kit['cell']
    strips = {s: [rgba(os.path.join(d, s + '.png')).crop((i * cw, 0, i * cw + cw, ch)) for i in range(n)] for s, n in kit['sheets'].items()}
    n = 0
    for _, fn, p in own:
        name, frame, glow = _parse('dwarf48', fn)
        check(not glow, f'dwarf48/{fn}: dwarves have no glow pictures')
        check(frame is not None, f'dwarf48/{fn}: say which frame, e.g. dwarf48/front_hair@braids.png or dwarf48/front_legs_m@0.png')
        check(name in strips, f'dwarf48/{fn}: there is no part "{name}". Parts: {", ".join(kit["sheets"])}')
        im = rgba(p)
        check(im.size == (cw, ch), f'dwarf48/{fn}: a dwarf frame is {cw} x {ch} pixels, this one is {im.width} x {im.height}')
        labels = dwarf_labels(kit, name)
        if frame not in labels:
            key = dwarf_list(name)
            if key:   # a new style: every part of this kind gets a frame for it (empty until drawn)
                check(NAME.match(frame) and not frame.isdigit(), f'dwarf48/{fn}: a new style needs a name, e.g. {name}@mohawk.png')
                kit[key].append(frame)
                for s in strips:
                    if dwarf_list(s) == key:
                        while len(strips[s]) < len(kit[key]): strips[s].append(Image.new('RGBA', (cw, ch)))
            else:
                check(frame == str(len(labels)), f'dwarf48/{fn}: {name} has frames 0 to {len(labels) - 1}; a new one is @{len(labels)}')
                strips[name].append(Image.new('RGBA', (cw, ch)))
            labels = dwarf_labels({**kit, 'sheets': {name: len(strips[name])}}, name)
        strips[name][labels.index(frame)] = im
        n += 1
    for s, frs in strips.items():
        out = Image.new('RGBA', (cw * len(frs), ch))
        for i, im in enumerate(frs): out.paste(im, (i * cw, 0))
        out.save(os.path.join(d, s + '.png'), optimize=True)
        kit['sheets'][s] = len(frs)
    save_json(os.path.join(d, 'kit.json'), kit)
    return n


def _apply_files(set_):
    def run(art, own):
        d = os.path.join(art, set_)
        meta_p = os.path.join(d, 'backdrop.json')
        meta = load_json(meta_p) if set_ == 'backdrop' else None
        n = 0
        for _, fn, p in own:
            name, frame, glow = _parse(set_, fn)
            check(frame is None and not glow, f'{set_}/{fn}: one picture per file here (no @ in the name)')
            target = os.path.join(d, name + '.png')
            check(os.path.exists(target), f'{set_}/{fn}: there is no {name}.png to replace (new ones need code: ask for help)')
            im = rgba(p)
            if meta is not None and name in meta:
                m = meta[name]
                if m.get('ay') == m.get('h'): m['ay'] = im.height
                m['w'], m['h'] = im.width, im.height
            im.save(target, optimize=True)
            n += 1
        if meta is not None: save_json(meta_p, meta)
        return n
    return run


APPLY = {'atlas': _apply_atlas, 'props48': _apply_props, 'dwarf48': _apply_dwarf48,
         'dwarf': _apply_files('dwarf'), 'backdrop': _apply_files('backdrop')}


def add(file, data, meta=None, inbox=INBOX):
    """Put an own picture (PNG bytes) into art-src/png as `file` (e.g. props48/my_table.png), with optional props48 meta."""
    set_, fn = file.split('/', 1) if '/' in file else (None, file)
    check(set_ in SETS, f'Pick a set: {", ".join(SETS)}')
    _parse(set_, fn)
    im = Image.open(io.BytesIO(data)).convert('RGBA')
    d = os.path.join(inbox, set_)
    os.makedirs(d, exist_ok=True)
    im.save(os.path.join(d, fn), 'PNG', optimize=True)
    if meta and set_ == 'props48':
        name = FILE.match(fn)['name']
        clean = {k: meta[k] for k in ('kind', 'group', 'anchor', 'recolour') if meta.get(k) not in (None, '')}
        if clean: save_json(os.path.join(d, name + '.json'), clean)
    return os.path.join(d, fn)


def remove(file, inbox=INBOX):
    """Take an own picture away (the drawn one comes back on the next apply)."""
    set_, fn = file.split('/', 1)
    p = os.path.join(inbox, set_, fn)
    check(os.path.exists(p), f'There is no own picture {file}')
    os.remove(p)
    name = FILE.match(fn)['name']
    side = os.path.join(inbox, set_, name + '.json')
    rest = [f for f in os.listdir(os.path.join(inbox, set_)) if f.endswith('.png') and FILE.match(f) and FILE.match(f)['name'] == name]
    if os.path.exists(side) and not rest: os.remove(side)
