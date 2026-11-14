#!/usr/bin/env python3
"""
Sprites as PNG files: take any sprite out of the game, change it, put it back. Or add new ones.

  python3 tools/sprites/sprites.py                 menu: search a sprite, export it (or all)
  python3 tools/sprites/sprites.py list [word]     every sprite file name (only those containing the word)
  python3 tools/sprites/sprites.py export NAME...  export these, e.g. props48/table  atlas/ui_war  dwarf48/front_hair
  python3 tools/sprites/sprites.py export --all    export every sprite
  python3 tools/sprites/sprites.py apply [set...]  put your own pictures (art-src/png/...) into the game's sheets
  python3 tools/sprites/sprites.py serve [port]    the same in the browser: http://localhost:8098

Exports go to sprites-export/<set>/<name>.png (not in git). To change a sprite, edit the exported file and put it,
under the same name, into art-src/png/<set>/, then run `apply` (the browser tool does that for you).
A new sprite is a new name in art-src/png/<set>/. More in docs/SPRITES.md ("Sprites als PNG").
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spritelib as S


def files_for(query):
    """Export files for 'set/name' (all its pictures) or an exact file name."""
    q = query[:-4] if query.endswith('.png') else query
    out = []
    for e in S.catalogue():
        for f in e['frames']:
            if f['file'][:-4] == q or e['id'] == q:
                out.append(f['file'])
                if f.get('glow'): out.append(f['glow'])
    S.check(out, f'No sprite "{query}". Try: python3 tools/sprites/sprites.py list {query.split("/")[-1]}')
    return out


def show(paths):
    for p in paths[:20]: print('  ' + os.path.relpath(p, S.ROOT))
    if len(paths) > 20: print(f'  ... and {len(paths) - 20} more')
    print(f'{len(paths)} file(s) in {os.path.relpath(S.EXPORT, S.ROOT)}/')


def menu():
    cat = S.catalogue()
    print(f'{len(cat)} sprites in {", ".join(S.SETS)}. Own pictures go to art-src/png/<set>/ (then: apply).')
    while True:
        try:
            q = input('\nSearch (a word, "all" exports everything, "apply", Enter quits): ').strip().lower()
        except EOFError:
            return
        if not q: return
        if q == 'all':
            show(S.export()); continue
        if q == 'apply':
            S.apply(); continue
        hits = [e for e in cat if q in e['id']]
        if not hits:
            print('Nothing found.'); continue
        for i, e in enumerate(hits[:40], 1):
            f = e['frames'][0]
            print(f'{i:3}  {e["id"]:44} {f["w"]} x {f["h"]}' + (f'  ({len(e["frames"])} pictures)' if len(e['frames']) > 1 else ''))
        if len(hits) > 40: print(f'     ... {len(hits) - 40} more, search more exactly')
        pick = input('Number to export (Enter: none, "a": all of these): ').strip().lower()
        chosen = hits[:40] if pick == 'a' else [hits[int(pick) - 1]] if pick.isdigit() and 0 < int(pick) <= min(40, len(hits)) else []
        files = [x for e in chosen for f in e['frames'] for x in [f['file']] + ([f['glow']] if f.get('glow') else [])]
        if files: show(S.export(files))


def main(argv):
    cmd = argv[0] if argv else 'menu'
    try:
        if cmd == 'menu': menu()
        elif cmd == 'list':
            word = argv[1].lower() if len(argv) > 1 else ''
            for e in S.catalogue():
                for f in e['frames']:
                    if word in f['file']: print(f'{f["file"]:56} {f["w"]} x {f["h"]}')
        elif cmd == 'export':
            if '--all' in argv or len(argv) == 1: show(S.export())
            else: show(S.export([x for q in argv[1:] for x in files_for(q)]))
        elif cmd == 'apply':
            r = S.apply(argv[1:] or None)
            if not any(r.values()): print('No own pictures in art-src/png/.')
        elif cmd == 'serve':
            import serve
            serve.run(int(argv[1]) if len(argv) > 1 else 8098)
        else:
            print(__doc__); return 1
    except S.SpriteError as e:
        print('Problem:', e); return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
