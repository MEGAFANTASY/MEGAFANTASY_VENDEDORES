#!/usr/bin/env python3
import os
import sqlite3
import json
import urllib.request
import time

BODEGAS = ['megafantasy', 'bluestar', 'nexus', 'megaworld', 'elitech']
DATA_DIR = '/data'
SHEETS_URL = os.environ.get('SHEETS_URL', '')
SYNC_INTERVAL = int(os.environ.get('SYNC_INTERVAL', '300'))

COLUMNS = ['fecha', 'vendedor', 'cliente', 'direccion', 'ciudad', 'factura', 'total', 'saldo', 'dias', 'estatus', 'flete', 'url_factura', 'url_guia']

MANIFIESTOS_COLUMNS = ['referencia', 'descripcion', 'url_manifiesto']

TRANSPORTADORAS_COLUMNS = ['factura', 'fechadespacho', 'cliente', 'direccion',
                           'ciudad', 'vendedor', 'confirmado', 'confirmado_app_vendedor']

def fetch_data(bodega):
    if not SHEETS_URL:
        print('Error: SHEETS_URL no configurada')
        return []
    url = f'{SHEETS_URL}?hoja={bodega}'
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            text = response.read().decode('utf-8')
            text = text.strip()
            if text.startswith('while(1);'):
                text = text[11:].strip()
            if text.startswith(')'):
                text = text[1:].strip()
            data = json.loads(text)
            if isinstance(data, dict):
                print(f'Error en hoja {bodega}: {data.get("error", "respuesta inesperada")}')
                return []
            return data
    except Exception as e:
        print(f'Error descargando {bodega}: {e}')
        return []

def update_database(bodega, rows):
    db_path = os.path.join(DATA_DIR, f'{bodega}.db')
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS facturas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT,
            vendedor TEXT,
            cliente TEXT,
            direccion TEXT,
            ciudad TEXT,
            factura TEXT UNIQUE,
            total REAL,
            saldo REAL,
            dias INTEGER,
            estatus TEXT,
            flete TEXT,
            url_factura TEXT,
            url_guia TEXT
        )
    ''')
    conn.execute('DELETE FROM facturas')
    for row in rows:
        values = [row.get(col, '') for col in COLUMNS]
        conn.execute('''
            INSERT OR REPLACE INTO facturas
            (fecha, vendedor, cliente, direccion, ciudad, factura, total, saldo, dias, estatus, flete, url_factura, url_guia)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', values)
    conn.commit()
    conn.close()
    print(f'{bodega}: {len(rows)} facturas actualizadas')

def update_manifiestos(bodega, rows):
    db_path = os.path.join(DATA_DIR, f'{bodega}-manifiestos.db')
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS manifiestos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referencia TEXT,
            descripcion TEXT,
            url_manifiesto TEXT
        )
    ''')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_manifiestos_referencia ON manifiestos(referencia)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_manifiestos_descripcion ON manifiestos(descripcion)')
    conn.execute('DELETE FROM manifiestos')
    for row in rows:
        values = [row.get(col, '') for col in MANIFIESTOS_COLUMNS]
        conn.execute('''
            INSERT INTO manifiestos (referencia, descripcion, url_manifiesto)
            VALUES (?, ?, ?)
        ''', values)
    conn.commit()
    conn.close()
    print(f'{bodega}: {len(rows)} manifiestos actualizados')

def update_transportadoras(bodega, rows):
    db_path = os.path.join(DATA_DIR, f'{bodega}-transportadoras.db')
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS transportadoras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            factura TEXT UNIQUE,
            fechadespacho TEXT,
            cliente TEXT,
            direccion TEXT,
            ciudad TEXT,
            vendedor TEXT,
            confirmado TEXT,
            confirmado_app_vendedor TEXT
        )
    ''')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_transportadoras_factura ON transportadoras(factura)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_transportadoras_vendedor ON transportadoras(vendedor)')
    conn.execute('DELETE FROM transportadoras')
    for row in rows:
        values = [row.get(col, '') for col in TRANSPORTADORAS_COLUMNS]
        conn.execute('''
            INSERT OR REPLACE INTO transportadoras
            (factura, fechadespacho, cliente, direccion, ciudad, vendedor, confirmado, confirmado_app_vendedor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', values)
    conn.commit()
    conn.close()
    print(f'{bodega}: {len(rows)} transportadoras actualizadas')

def sync_once():
    print('Iniciando sincronizacion...')
    for bodega in BODEGAS:
        rows = fetch_data(bodega)
        update_database(bodega, rows)
        m_rows = fetch_data(f'{bodega}-manifiestos')
        update_manifiestos(bodega, m_rows)
        t_rows = fetch_data(f'{bodega}-transportadoras')
        update_transportadoras(bodega, t_rows)
    print('Sincronizacion completada.')

def main():
    print(f'SHEETS_URL: {SHEETS_URL}')
    print(f'Intervalo: {SYNC_INTERVAL} segundos')
    sync_once()
    while True:
        time.sleep(SYNC_INTERVAL)
        sync_once()

if __name__ == '__main__':
    main()
