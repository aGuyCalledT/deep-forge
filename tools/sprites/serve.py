#!/usr/bin/env python3
"""
The sprite tool in the browser: every sprite of the game with a picture, download one or all as PNG, replace one
with your own picture, add new ones. Runs locally, needs Python 3 with Pillow.
  python3 tools/sprites/serve.py [port]     then open http://localhost:8098
Own pictures are saved to art-src/png/<set>/ and put into the game's sheets at once (spritelib.apply).
"""
import io, json, os, sys, zipfile
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spritelib as S

PAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')


def listing():
    own = {f'{s}/{fn}' for s, fn, _ in S.inbox_files()}
    cat = S.catalogue()
    for e in cat:
        for f in e['frames']:
            f['own'] = f['file'] in own
            if f.get('glow'): f['glowOwn'] = f['glow'] in own
    kit = S.load_json(os.path.join(S.ART, 'dwarf48/kit.json'))
    groups = sorted({e['group'] for e in cat if e['set'] == 'props48'})
    return {'sprites': cat, 'own': sorted(own), 'inbox': os.path.relpath(S.INBOX, S.ROOT), 'export': os.path.relpath(S.EXPORT, S.ROOT),
            'parts': list(kit['sheets']), 'cell': kit['cell'], 'groups': groups}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send(self, code, body, ctype='application/json', extra=None):
        if isinstance(body, (dict, list)): body = json.dumps(body).encode()
        elif isinstance(body, str): body = body.encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        for k, v in (extra or {}).items(): self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        try:
            if u.path == '/':
                with open(PAGE, 'rb') as fh: return self.send(200, fh.read(), 'text/html; charset=utf-8')
            if u.path == '/api/list': return self.send(200, listing())
            if u.path == '/img':
                f = q['f'][0]
                body = S.png_bytes(S.Sheets().picture(f))
                extra = {'Content-Disposition': f'attachment; filename="{f.split("/")[-1]}"'} if 'dl' in q else None
                return self.send(200, body, 'image/png', extra)
            if u.path == '/zip':   # every sprite, in its folder, as one download
                b = io.BytesIO(); sh = S.Sheets()
                with zipfile.ZipFile(b, 'w', zipfile.ZIP_DEFLATED) as z:
                    for e in S.catalogue():
                        for f in e['frames']:
                            for name in [f['file']] + ([f['glow']] if f.get('glow') else []):
                                im = sh.picture(name)
                                if name.endswith('.glow.png') and im.getbbox() is None: continue
                                z.writestr(name, S.png_bytes(im))
                return self.send(200, b.getvalue(), 'application/zip', {'Content-Disposition': 'attachment; filename="deep-forge-sprites.zip"'})
            self.send(404, {'error': 'not found'})
        except (S.SpriteError, KeyError) as e:
            self.send(400, {'error': str(e)})

    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        n = int(self.headers.get('Content-Length') or 0)
        if n > 16 * 1024 * 1024: return self.send(413, {'error': 'That file is too big.'})
        body = self.rfile.read(n)
        try:
            if u.path == '/api/upload':   # ?f=<set>/<file>.png[&meta=<json>], body: the PNG
                f = q['f'][0]
                meta = json.loads(q['meta'][0]) if 'meta' in q else None
                S.add(f, body, meta)
                S.apply([f.split('/')[0]], log=lambda *a: None)
                return self.send(200, {'ok': True, 'saved': os.path.join(os.path.relpath(S.INBOX, S.ROOT), f)})
            if u.path == '/api/remove':
                f = q['f'][0]
                S.remove(f)
                S.apply([f.split('/')[0]], log=lambda *a: None)
                return self.send(200, {'ok': True})
            if u.path == '/api/export':   # ?f=a&f=b or ?all=1: write PNG files into sprites-export/
                files = None if 'all' in q else q.get('f', [])
                paths = S.export(files)
                return self.send(200, {'ok': True, 'count': len(paths), 'folder': os.path.relpath(S.EXPORT, S.ROOT)})
            if u.path == '/api/apply':
                S.apply(log=lambda *a: None)
                return self.send(200, {'ok': True})
            self.send(404, {'error': 'not found'})
        except S.SpriteError as e:
            self.send(400, {'error': str(e)})
        except Exception as e:   # a broken PNG and the like
            self.send(400, {'error': f'{type(e).__name__}: {e}'})


def run(port=8098):
    srv = ThreadingHTTPServer(('127.0.0.1', port), H)
    print(f'Sprite tool on http://localhost:{port}  (Ctrl+C stops it)')
    try: srv.serve_forever()
    except KeyboardInterrupt: pass


if __name__ == '__main__':
    run(int(sys.argv[1]) if len(sys.argv) > 1 else 8098)
