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
            return json.loads(text)
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

def sync_once():
    print('Iniciando sincronizacion...')
    for bodega in BODEGAS:
        rows = fetch_data(bodega)
        update_database(bodega, rows)
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
