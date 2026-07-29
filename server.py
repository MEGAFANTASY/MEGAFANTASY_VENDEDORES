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

        # API: listar vendedores disponibles de la base de facturas
        if self.path.startswith('/api/vendedores-disponibles'):
            self.handle_vendedores_disponibles()
            return

        # API: listar vendedores creados
        if self.path.startswith('/api/vendedores'):
            self.handle_list_vendedores()
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
        if self.path == '/api/vendedores':
            self.handle_create_vendedor()
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
            self.send_json(200, {'ok': True, 'bodega': bodega, 'role': 'admin'})
            return

        v_db_path = os.path.join(DATA_DIR, f'v_{bodega}.db')
        try:
            conn = sqlite3.connect(v_db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                'SELECT vendedor FROM vendedores WHERE usuario = ? AND contrasena = ?',
                (username, password)
            )
            row = cur.fetchone()
            conn.close()
            if row:
                self.send_json(200, {'ok': True, 'bodega': bodega, 'role': 'vendedor', 'vendedor': row['vendedor']})
                return
        except Exception as e:
            print(f'Error validando vendedor {bodega}: {e}')

        self.send_json(401, {'error': 'Credenciales incorrectas'})

    def handle_cartera(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        bodega = params.get('bodega', [''])[0].strip().lower()
        vendedor = params.get('vendedor', [''])[0].strip()

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
            query = '''
                SELECT dias, cliente, direccion, ciudad, factura, saldo, url_factura, url_guia
                FROM facturas
            '''
            args = []
            if vendedor:
                query += ' WHERE vendedor = ? '
                args.append(vendedor)
            query += ' ORDER BY dias DESC '
            cur = conn.execute(query, args)
            rows = [dict(row) for row in cur.fetchall()]
            conn.close()
            self.send_json(200, {'bodega': bodega, 'facturas': rows})
        except Exception as e:
            self.send_json(500, {'error': str(e)})

    def _get_bodega_from_query(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        return params.get('bodega', [''])[0].strip().lower()

    def handle_list_vendedores(self):
        bodega = self._get_bodega_from_query()
        if bodega not in BODEGAS:
            self.send_json(400, {'error': 'Bodega no valida'})
            return
        db_path = os.path.join(DATA_DIR, f'v_{bodega}.db')
        if not os.path.exists(db_path):
            self.send_json(200, {'bodega': bodega, 'vendedores': []})
            return
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.execute('SELECT vendedor, usuario FROM vendedores ORDER BY vendedor')
            rows = [dict(row) for row in cur.fetchall()]
            conn.close()
            self.send_json(200, {'bodega': bodega, 'vendedores': rows})
        except Exception as e:
            self.send_json(500, {'error': str(e)})

    def handle_vendedores_disponibles(self):
        bodega = self._get_bodega_from_query()
        if bodega not in BODEGAS:
            self.send_json(400, {'error': 'Bodega no valida'})
            return
        db_path = os.path.join(DATA_DIR, f'{bodega}.db')
        v_db_path = os.path.join(DATA_DIR, f'v_{bodega}.db')
        if not os.path.exists(db_path):
            self.send_json(200, {'bodega': bodega, 'vendedores': []})
            return
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.execute('SELECT DISTINCT vendedor FROM facturas WHERE vendedor IS NOT NULL AND vendedor != "" ORDER BY vendedor')
            factura_vendedores = {row['vendedor'] for row in cur.fetchall()}
            conn.close()

            creados = set()
            if os.path.exists(v_db_path):
                v_conn = sqlite3.connect(v_db_path)
                v_conn.row_factory = sqlite3.Row
                v_cur = v_conn.execute('SELECT vendedor FROM vendedores')
                creados = {row['vendedor'] for row in v_cur.fetchall()}
                v_conn.close()

            disponibles = sorted(factura_vendedores - creados)
            self.send_json(200, {'bodega': bodega, 'vendedores': disponibles})
        except Exception as e:
            self.send_json(500, {'error': str(e)})

    def handle_create_vendedor(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8')
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_json(400, {'error': 'JSON invalido'})
            return

        bodega = data.get('bodega', '').strip().lower()
        vendedor = data.get('vendedor', '').strip()
        usuario = data.get('usuario', '').strip()
        contrasena = data.get('contrasena', '').strip()

        if bodega not in BODEGAS:
            self.send_json(400, {'error': 'Bodega no valida'})
            return
        if not vendedor or not usuario or not contrasena:
            self.send_json(400, {'error': 'Completa todos los campos'})
            return
        if len(contrasena) < 4:
            self.send_json(400, {'error': 'La contraseña debe tener minimo 4 caracteres'})
            return

        v_db_path = os.path.join(DATA_DIR, f'v_{bodega}.db')
        try:
            conn = sqlite3.connect(v_db_path)
            conn.execute('''
                CREATE TABLE IF NOT EXISTS vendedores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vendedor TEXT NOT NULL,
                    usuario TEXT NOT NULL UNIQUE,
                    contrasena TEXT NOT NULL
                )
            ''')
            conn.execute(
                'INSERT INTO vendedores (vendedor, usuario, contrasena) VALUES (?, ?, ?)',
                (vendedor, usuario, contrasena)
            )
            conn.commit()
            conn.close()
            self.send_json(200, {'ok': True, 'bodega': bodega})
        except sqlite3.IntegrityError:
            self.send_json(409, {'error': 'El usuario ya existe'})
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
