# Preview: a tavern room (7 cells = 336 x 144, floor at y 135) put together from the props, with dwarves for
# scale and a simple light pass that stands in for the planned shader. Also a sheet of every prop on its own.
#   python3 scene.py <out dir> [<dir with dwarf PNGs>]
import sys, os, math
import numpy as np
from PIL import Image, ImageDraw
from props import PROPS, R, EX
RW, RH, FLOOR = 336, 144, 135
OUTLINE = '#1a1216'

def col(v):
    rp, i = v
    return EX[rp] if rp in EX else R[rp][i]
def put(canvas, emit, prop, x, y, flip=False):
    """Prop with its anchor (bottom centre) at x, y."""
    g, (ax, ay) = prop['grid'], prop['anchor']
    h, w = g.shape
    for j in range(h):
        for i in range(w):
            v = g[j, i if not flip else w - 1 - i]
            if v is None: continue
            X, Y = x - ax + i, y - ay + j
            if 0 <= X < canvas.shape[1] and 0 <= Y < canvas.shape[0]:
                canvas[Y, X] = col(v); emit[Y, X] = v[0] == 'flame'
def wall(canvas):
    """Brick courses with offset joints, a rounded vault, plank floor, a darker line where wall meets floor."""
    st = R['brick']
    for y in range(RH):
        for x in range(RW):
            course = y // 9; bx = (x + (course % 2) * 9) // 18
            mortar = y % 9 == 8 or (x + (course % 2) * 9) % 18 == 17
            tone = 3 if (bx * 31 + course * 17) % 5 == 0 else 2
            if not mortar and y % 9 == 0: tone = min(4, tone + 1)           # lit top edge of each brick
            canvas[y, x] = st[1] if mortar else st[tone]
    for y in range(RH):                                                          # vault: rock above the arch
        for x in range(RW):
            r = 34
            cx = r if x < r else RW - 1 - r if x > RW - 1 - r else None
            if cx is not None and y < r and math.hypot(x - cx, y - r) > r: canvas[y, x] = '#1b1720'
            elif cx is not None and y < r and math.hypot(x - cx, y - r) > r - 1.5: canvas[y, x] = OUTLINE
    for x in range(RW): canvas[FLOOR - 1, x] = st[0]; canvas[FLOOR - 2, x] = st[1] if canvas[FLOOR - 2, x] != st[0] else st[0]
    wd = R['wood']
    for y in range(FLOOR, RH):
        for x in range(RW):
            seam = (x + (y - FLOOR) // 3 * 11) % 28 == 0
            canvas[y, x] = wd[3] if y == FLOOR else wd[0] if seam else wd[2] if y < FLOOR + 4 else wd[1]
def light(canvas, emit, lights, ambient=0.40):
    """Warm pools of light in 4 hard steps (pixel look), flames stay bright."""
    h, w = canvas.shape
    yy, xx = np.mgrid[0:h, 0:w]
    L = np.full((h, w), ambient)
    for (lx, ly, r, k) in lights:
        d = np.hypot(xx - lx, (yy - ly) * 1.1)
        L += k * np.clip(1 - d / r, 0, 1) ** 1.4
    L = np.minimum(1.2, np.round(L / 0.1) * 0.1)
    out = Image.new('RGB', (w, h)); px = out.load()
    for y in range(h):
        for x in range(w):
            c = canvas[y, x]
            r_, g_, b_ = (int(c[i:i + 2], 16) for i in (1, 3, 5))
            if emit[y, x]: px[x, y] = (r_, g_, b_); continue
            l = L[y, x]
            warm = min(1, max(0, l - ambient) * 1.4)                      # lit areas lean gold, shadows lean plum
            px[x, y] = (min(255, int(r_ * l * (1.0 + 0.30 * warm))), min(255, int(g_ * l * (0.96 + 0.10 * warm))),
                        min(255, int(b_ * l * (1.02 - 0.30 * warm + 0.06 * (1 - warm)))))
    return out
def paste_png(canvas, emit, path, x, y, flip=False):
    """A dwarf PNG (48 x 64 cell, feet on row 62) with its feet at x, y."""
    im = Image.open(path).convert('RGBA')
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    for j in range(im.height):
        for i in range(im.width):
            p = im.getpixel((i, j))
            if p[3] == 0: continue
            X, Y = x - 24 + i, y - 62 + j
            if 0 <= X < RW and 0 <= Y < RH: canvas[Y, X] = '#%02x%02x%02x' % p[:3]; emit[Y, X] = False

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out', 'preview')
    dw = sys.argv[2] if len(sys.argv) > 2 else None
    os.makedirs(out, exist_ok=True)
    P = {k: f() for k, f in PROPS.items()}
    T1 = PROPS['torch'](1)
    canvas = np.full((RH, RW), '#000000', object); emit = np.zeros((RH, RW), bool)
    wall(canvas)
    top = FLOOR - P['table']['grid'].shape[0]
    put(canvas, emit, P['door'], 30, FLOOR)
    put(canvas, emit, P['torch'], 64, 92)
    put(canvas, emit, P['shelf'], 104, 96)
    if dw: paste_png(canvas, emit, f'{dw}/d_sit.png', 192, FLOOR)                 # seated behind the table
    put(canvas, emit, P['bench'], 150, FLOOR)
    put(canvas, emit, P['table'], 192, FLOOR)
    put(canvas, emit, P['candle'], 188, top + 1)
    put(canvas, emit, P['mug'], 176, top + 1); put(canvas, emit, P['mug'], 204, top + 1, flip=True)
    put(canvas, emit, P['stool'], 230, FLOOR)
    put(canvas, emit, P['lantern'], 236, 34)
    put(canvas, emit, T1, 286, 92)
    put(canvas, emit, P['crate'], 300, FLOOR); put(canvas, emit, P['barrel'], 300, FLOOR - 18)
    put(canvas, emit, P['barrel'], 320, FLOOR)
    put(canvas, emit, P['mushpot'], 92, 66)
    if dw:
        paste_png(canvas, emit, f'{dw}/d_stand.png', 132, FLOOR)
        paste_png(canvas, emit, f'{dw}/d_side.png', 262, FLOOR, flip=True)
    lights = [(64, 76, 120, 0.95), (286, 76, 120, 0.95), (188, top - 8, 46, 0.45), (236, 58, 84, 0.6)]
    room = light(canvas, emit, lights)
    room.save(f'{out}/tavern.png'); room.resize((RW * 3, RH * 3), Image.NEAREST).save(f'{out}/tavern_x3.png')
    # every prop alone, on a dark wall colour, with a dwarf for scale
    names = list(P)
    cw = 72; rows = 2; cols = math.ceil((len(names) + 1) / rows)
    sheet = Image.new('RGB', (cols * cw, rows * 84), (58, 50, 64)); d = ImageDraw.Draw(sheet)
    for n, name in enumerate(names + (['dwarf'] if dw else [])):
        cx, cy = (n % cols) * cw + cw // 2, (n // cols) * 84 + 70
        if name == 'dwarf':
            im = Image.open(f'{dw}/d_stand.png').convert('RGBA'); sheet.paste(im, (cx - 24, cy - 62), im)
        else:
            g = P[name]['grid']; ax, ay = g.shape[1] // 2, g.shape[0]
            for j in range(g.shape[0]):
                for i in range(g.shape[1]):
                    if g[j, i] is not None: sheet.putpixel((cx - ax + i, cy - ay + j), tuple(int(col(g[j, i])[k:k + 2], 16) for k in (1, 3, 5)))
        d.text((cx - 30, cy + 2), name, fill=(220, 214, 222))
    sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(f'{out}/props_x3.png')
    print('ok')
