#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, HTTPServer
import os
import json
import sqlite3
import urllib.parse

DATA_DIR = '/data'
BODEGAS = ['megafantasy', 'bluestar', 'nexus', 'megaworld', 'elitech']
ADMIN_USER = os.environ.get('ADMIN_USER', 'admin')
ADMIN_PASS = os.environ.get('ADMIN_PASS', 'admin')

class SPAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Redirect /folder to /folder/ so relative paths resolve correctly
        if self.path != '/' and not self.path.endswith('/'):
            root = self.directory or os.getcwd()
            abspath = os.path.join(root, self.path.lstrip('/'))
            if os.path.isdir(abspath):
                self.send_response(301)
                self.send_header('Location', self.path + '/')
                self.end_headers()
                return

        # API: obtener cartera de una bodega
        if self.path.startswith('/api/cartera'):
            self.handle_cartera()
            return

        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/login':
            self.handle_login()
            return
        self.send_error(404)

    def handle_login(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8')
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_json(400, {'error': 'JSON invalido'})
            return

        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        bodega = data.get('bodega', '').strip().lower()

        if bodega not in BODEGAS:
            self.send_json(400, {'error': 'Bodega no valida'})
            return

        if username == ADMIN_USER and password == ADMIN_PASS:
            self.send_json(200, {'ok': True, 'bodega': bodega})
        else:
            self.send_json(401, {'error': 'Credenciales incorrectas'})

    def handle_cartera(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        bodega = params.get('bodega', [''])[0].strip().lower()

        if bodega not in BODEGAS:
            self.send_json(400, {'error': 'Bodega no valida'})
            return

        db_path = os.path.join(DATA_DIR, f'{bodega}.db')
        if not os.path.exists(db_path):
            self.send_json(500, {'error': 'Base de datos no encontrada'})
            return

        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.execute('''
                SELECT dias, cliente, direccion, ciudad, factura, saldo, url_factura, url_guia
                FROM facturas
                ORDER BY dias DESC
            ''')
            rows = [dict(row) for row in cur.fetchall()]
            conn.close()
            self.send_json(200, {'bodega': bodega, 'facturas': rows})
        except Exception as e:
            self.send_json(500, {'error': str(e)})

    def send_json(self, status, data):
        content = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def translate_path(self, path):
        root = self.directory or os.getcwd()
        clean_path = path.lstrip('/')

        # Serve /bodega/admin/ as /bodega/admin.html
        parts = clean_path.split('/')
        if len(parts) == 2 and parts[1] == 'admin' and parts[0] in BODEGAS:
            admin_file = os.path.join(root, parts[0], 'admin.html')
            if os.path.exists(admin_file):
                return admin_file

        abspath = os.path.join(root, clean_path)
        if os.path.isdir(abspath):
            index = os.path.join(abspath, 'index.html')
            if os.path.exists(index):
                return index
        if os.path.exists(abspath):
            return abspath
        fallback = os.path.join(root, 'index.html')
        return fallback if os.path.exists(fallback) else abspath

if __name__ == '__main__':
    print('CWD:', os.getcwd())
    print('FILES:', os.listdir(os.getcwd()))
    server = HTTPServer(('0.0.0.0', 8000), SPAHandler)
    print('Serving on http://0.0.0.0:8000')
    server.serve_forever()
