#!/usr/bin/env python3
# Room template editor for the 48-px art, local only. Needs Python 3 and nothing else.
#   python3 tools/room-editor/serve.py [port]        then open http://localhost:8099
# Serves the editor, the game's static files and the dwarf previews, and saves templates as JSON into
#   src/main/resources/static/art/props48/rooms/<type>/<part>_<name>.json   (part = room | bay)
# plus rooms/index.json, which the game and the server read. Room types and widths come from Layouts.java.
import json, os, re, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STATIC = os.path.join(ROOT, 'src/main/resources/static')
ROOMS = os.path.join(STATIC, 'art/props48/rooms')
EDITOR = os.path.dirname(os.path.abspath(__file__))
DWARVES = os.path.join(ROOT, 'art-src/props48/dwarves')
LAYOUTS = os.path.join(ROOT, 'src/main/java/com/deepforge/game/Layouts.java')
# ways: not rooms on the server's list, but drawn from templates too (the gate tunnel is the entrance hall)
WAYS = [('entrance_hall', 6), ('stairwell', 2), ('hallway', 1)]
NAME = re.compile(r'^[a-z0-9][a-z0-9_-]{0,31}$')

def room_types():
    src = open(LAYOUTS, encoding='utf-8').read()
    cells = dict((k, int(v)) for k, v in re.findall(r'ROOM_CELLS\.put\("(\w+)",\s*(\d+)\)', src))
    bays = dict((k, int(v)) for k, v in re.findall(r'MACHINE_CELLS\.put\("(\w+)",\s*(\d+)\)', src))
    m = re.search(r'ORDER\s*=\s*List\.of\(([^;]*)\);', src)
    order = re.findall(r'"(\w+)"', m.group(1)) if m else list(cells)
    order += [k for k in cells if k not in order]
    out = [{'type': t, 'cells': cells[t], 'bay': bays.get(t, 0)} for t in order if t in cells]
    return out + [{'type': t, 'cells': n, 'bay': 0, 'way': True} for t, n in WAYS]

def index():
    idx = {}
    if os.path.isdir(ROOMS):
        for t in sorted(os.listdir(ROOMS)):
            d = os.path.join(ROOMS, t)
            if not os.path.isdir(d): continue
            for fn in sorted(os.listdir(d)):
                m = re.match(r'^(room|bay)_(.+)\.json$', fn)
                if m: idx.setdefault(t, {'room': [], 'bay': []})[m.group(1)].append(m.group(2))
    return idx
def write_index():
    os.makedirs(ROOMS, exist_ok=True)
    with open(os.path.join(ROOMS, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump(index(), fh, indent=1, sort_keys=True)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def translate_path(self, path):
        p = urlparse(path).path
        for prefix, base in (('/static/', STATIC), ('/dwarves/', DWARVES)):
            if p.startswith(prefix): return os.path.join(base, p[len(prefix):])
        return os.path.join(EDITOR, p.lstrip('/') or 'index.html')
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def target(self, q):
        t, part, name = q.get('type'), q.get('part', 'room'), q.get('name')
        types = {r['type'] for r in room_types()}
        if t not in types or part not in ('room', 'bay') or not name or not NAME.match(name):
            raise ValueError('bad type, part or name (a-z, 0-9, _ and -, up to 32)')
        return os.path.join(ROOMS, t, f'{part}_{name}.json')
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/api/rooms': return self.send_json({'types': room_types(), 'index': index()})
        if u.path == '/api/template':
            q = {k: v[0] for k, v in parse_qs(u.query).items()}
            try: fn = self.target(q)
            except ValueError as e: return self.send_json({'error': str(e)}, 400)
            if not os.path.exists(fn): return self.send_json({'error': 'not found'}, 404)
            return self.send_json(json.load(open(fn, encoding='utf-8')))
        return super().do_GET()
    def do_POST(self):
        u = urlparse(self.path)
        try:
            q = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            fn = self.target(q)
        except (ValueError, json.JSONDecodeError) as e:
            return self.send_json({'error': str(e)}, 400)
        if u.path == '/api/save':
            data = q.get('data')
            if not isinstance(data, dict): return self.send_json({'error': 'no data'}, 400)
            data.update({'type': q['type'], 'part': q.get('part', 'room'), 'name': q['name']})
            os.makedirs(os.path.dirname(fn), exist_ok=True)
            with open(fn, 'w', encoding='utf-8') as fh: json.dump(data, fh, indent=1)
            write_index(); return self.send_json({'ok': True, 'index': index()})
        if u.path == '/api/delete':
            if os.path.exists(fn): os.remove(fn)
            write_index(); return self.send_json({'ok': True, 'index': index()})
        self.send_json({'error': 'unknown'}, 404)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
    write_index()
    print(f'Room editor on http://localhost:{port}  (templates go to {os.path.relpath(ROOMS, ROOT)})')
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
