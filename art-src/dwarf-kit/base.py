# Shared helpers for the dwarf kit drafts. Each part is a 32x44 canvas; '.' is empty.
W, H = 32, 44
PAL = {
 'O': '#1d1922',
 'a': '#7a3f3a', 'd': '#b8705a', 's': '#e3a47c', 'S': '#f7cfa4',
 'k': '#4a1c1e', 'h': '#8c3524', 'H': '#c75f2a', 'J': '#eb9445',
 'v': '#3a1626', 'u': '#76263a', 't': '#ad3e3c', 'T': '#d86e4e',
 'l': '#2b1817', 'b': '#4d2b22', 'B': '#784731', 'L': '#a26c47',
 'r': '#33201c', 'e': '#573424', 'E': '#7f5034',
 'y': '#6a3d14', 'g': '#b87d22', 'G': '#f0c64a',
 'q': '#231d2b', 'p': '#3d3545', 'P': '#5f5566',
 'n': '#2c2a38', 'm': '#5a5a6c', 'M': '#9a9cac', 'W': '#dcdde4',
 'w': '#4a7ab0',
 'c': '#3d2e4a', 'C': '#6b4f7a', 'Q': '#9a76a6', 'X': '#c7a3c4',
 'i': '#5e3d22', 'I': '#8a5e3a', 'Y': '#b8885a',
 'f': '#d8d0c0',
}
TOK = {
 'O':'outline','a':'skin.0','d':'skin.1','s':'skin.2','S':'skin.3',
 'k':'hair.0','h':'hair.1','H':'hair.2','J':'hair.3',
 'v':'tunic.0','u':'tunic.1','t':'tunic.2','T':'tunic.3',
 'l':'leather.0','b':'leather.1','B':'leather.2','L':'leather.3',
 'r':'belt.0','e':'belt.1','E':'belt.2',
 'y':'gold.0','g':'gold.1','G':'gold.2',
 'q':'cloth.0','p':'cloth.1','P':'cloth.2',
 'n':'metal.0','m':'metal.1','M':'metal.2','W':'metal.3',
 'w':'eye',
 'c':'quilt.0','C':'quilt.1','Q':'quilt.2','X':'quilt.3',
 'i':'wood.0','I':'wood.1','Y':'wood.2',
 'f':'cream',
}
def blank(): return [['.']*W for _ in range(H)]
def rows(g): return [''.join(r) for r in g]
def grid(rs, y0=0, name='?'):
    """Rows placed from y0 (each exactly 32 wide)."""
    g = blank()
    for i, r in enumerate(rs):
        assert len(r) == W, f'{name} row {y0+i} len {len(r)}: {r}'
        for x, c in enumerate(r):
            if c != '.': g[y0+i][x] = c
    return rows(g)
def segs(ss):
    g = blank()
    for y, x, s in ss:
        for i, c in enumerate(s):
            if c != ' ': g[y][x+i] = c
    return rows(g)
def over(*layers):
    g = blank()
    for L in layers:
        if L is None: continue
        for y, r in enumerate(L):
            for x, c in enumerate(r):
                if c == '_': g[y][x] = '.'
                elif c != '.': g[y][x] = c
    return rows(g)
def shift(L, dx=0, dy=0, y_from=0, y_to=H):
    """Move rows y_from..y_to-1 by dx, dy (others stay)."""
    g = [list(r) for r in L]
    out = [list(r) if not (y_from <= y < y_to) else ['.']*W for y, r in enumerate(g)]
    for y in range(y_from, y_to):
        for x in range(W):
            c = g[y][x]
            if c == '.': continue
            ny, nx = y+dy, x+dx
            if 0 <= ny < H and 0 <= nx < W: out[ny][nx] = c
    return rows(out)
def crop_rows(L, y_from, y_to, x_from=0, x_to=W):
    return [''.join(c if (y_from <= y < y_to and x_from <= x < x_to) else '.' for x, c in enumerate(r)) for y, r in enumerate(L)]
def cut(L, y_from, y_to, x_from=0, x_to=W):
    """Everything except the box."""
    return [''.join('.' if (y_from <= y < y_to and x_from <= x < x_to) else c for x, c in enumerate(r)) for y, r in enumerate(L)]
def flipx(L): return [r[::-1] for r in L]

def png(cells, path, scale=6, gap=2, swap=None, bg='#3a3440'):
    from PIL import Image
    swaps = swap or [{}]*len(cells)
    n = len(cells)
    im = Image.new('RGB', ((W+gap)*n*scale, H*scale), bg)
    px = im.load()
    for i, c in enumerate(cells):
        P = {**PAL, **swaps[i]}
        for y, r in enumerate(c):
            for x, ch in enumerate(r):
                if ch == '.': continue
                col = tuple(int(P[ch][j:j+2], 16) for j in (1, 3, 5))
                for dy in range(scale):
                    for dx in range(scale): px[(W+gap)*i*scale + x*scale + dx, y*scale + dy] = col
    im.save(path)
