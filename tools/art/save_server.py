"""Dev-only: serve the game folder on :8766 and accept POST /save/<file>.png,
writing into art/reference/. Used by tools/export-refs.html.
Run from the repo root:  python tools/art/save_server.py"""
import http.server, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'art', 'reference')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)

    def do_POST(self):
        m = re.fullmatch(r'/save/([a-z0-9_\-]+\.png)', self.path)
        if not m: return self.send_error(400, 'bad name')
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, m.group(1)), 'wb') as f: f.write(data)
        self.send_response(204); self.end_headers()

    def log_message(self, *a): pass


if __name__ == '__main__':
    print('serving', ROOT, 'on http://localhost:8766')
    http.server.ThreadingHTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
