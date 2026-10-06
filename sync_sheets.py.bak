#!/usr/bin/env python3
import os
import sqlite3
import json
import urllib.request
import time

BODEGAS = ['megafantasy', 'bluestar', 'nexus', 'megaworld', 'elitech']
BODEGAS_CON_MANIFIESTOS = ['megafantasy']
BODEGAS_CON_TRANSPORTADORAS = ['megafantasy']
DATA_DIR = '/data'
SHEETS_URL = os.environ.get('SHEETS_URL', '')
DEFAULT_INTERVAL = int(os.environ.get('SYNC_INTERVAL', '1800'))
BODEGA_INTERVALS = {
    'megafantasy': int(os.environ.get('SYNC_INTERVAL_MEGAFANTASY', '1200')),
    'bluestar': int(os.environ.get('SYNC_INTERVAL_BLUESTAR', '1800')),
    'nexus': int(os.environ.get('SYNC_INTERVAL_NEXUS', '2400')),
    'megaworld': int(os.environ.get('SYNC_INTERVAL_MEGAWORLD', '2100')),
    'elitech': int(os.environ.get('SYNC_INTERVAL_ELITECH', '1500')),
}

COLUMNS = ['fecha', 'vendedor', 'cliente', 'direccion', 'ciudad', 'factura', 'total', 'saldo', 'dias', 'estatus', 'flete', 'url_factura', 'url_guia']

MANIFIESTOS_COLUMNS = ['referencia', 'descripcion', 'url_manifiesto']

TRANSPORTADORAS_COLUMNS = ['factura', 'fechadespacho', 'cliente', 'direccion',
                           'ciudad', 'vendedor', 'confirmado', 'confirmadoappvendedor']

def normalize_keys(rows):
    """Normaliza las claves de cada fila quitando guiones bajos y espacios."""
    result = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        new_row = {}
        for key, value in row.items():
            if key is None:
                continue
            norm_key = str(key).strip().replace('_', '').replace(' ', '').lower()
            new_row[norm_key] = value
        result.append(new_row)
    return result


def is_valid_data(rows, required_cols, min_rows=1):
    """Verifica que la respuesta sea una lista con filas utiles."""
    if rows is None or not isinstance(rows, list):
        return False
    if len(rows) < min_rows:
        return False
    for row in rows:
        if not isinstance(row, dict):
            return False
        if any(row.get(col) not in (None, '') for col in required_cols):
            return True
    return False


def fetch_data(bodega, retries=2):
    if not SHEETS_URL:
        print('Error: SHEETS_URL no configurada')
        return []
    url = f'{SHEETS_URL}?hoja={bodega}'
    for attempt in range(retries + 1):
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
            print(f'Error descargando {bodega} (intento {attempt + 1}/{retries + 1}): {e}')
            if attempt < retries:
                wait = 5 * (attempt + 1)
                print(f'Reintentando en {wait} segundos...')
                time.sleep(wait)
    return []

def update_database(bodega, rows):
    if not is_valid_data(rows, COLUMNS[:6]):
        print(f'{bodega}: facturas descargadas no validas, se mantiene la base anterior')
        return
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
    if not is_valid_data(rows, MANIFIESTOS_COLUMNS[:2]):
        print(f'{bodega}: manifiestos descargados no validos, se mantiene la base anterior')
        return
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
    normalized = normalize_keys(rows)
    if not is_valid_data(normalized, TRANSPORTADORAS_COLUMNS[:5]):
        print(f'{bodega}: transportadoras descargadas no validas, se mantiene la base anterior')
        return
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
    for row in normalized:
        values = [row.get(col, '') for col in TRANSPORTADORAS_COLUMNS]
        conn.execute('''
            INSERT OR REPLACE INTO transportadoras
            (factura, fechadespacho, cliente, direccion, ciudad, vendedor, confirmado, confirmado_app_vendedor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', values)
    conn.commit()
    conn.close()
    print(f'{bodega}: {len(rows)} transportadoras actualizadas')

def sync_next_bodega():
    print('Iniciando sincronizacion rotativa...')
    bodega = BODEGAS[sync_next_bodega.index % len(BODEGAS)]
    sync_next_bodega.index += 1

    rows = fetch_data(bodega)
    update_database(bodega, rows)

    if bodega in BODEGAS_CON_MANIFIESTOS:
        m_rows = fetch_data(f'{bodega}-manifiestos')
        update_manifiestos(bodega, m_rows)

    if bodega in BODEGAS_CON_TRANSPORTADORAS:
        t_rows = fetch_data(f'{bodega}-transportadoras')
        update_transportadoras(bodega, t_rows)

    print(f'Sincronizacion de {bodega} completada.')

sync_next_bodega.index = 0


def main():
    print(f'SHEETS_URL: {SHEETS_URL}')
    print('Intervalos por bodega (segundos):')
    for b in BODEGAS:
        print(f'  {b}: {BODEGA_INTERVALS[b]}')

    sync_next_bodega()

    while True:
        last_bodega = BODEGAS[(sync_next_bodega.index - 1) % len(BODEGAS)]
        interval = BODEGA_INTERVALS[last_bodega]
        print(f'Esperando {interval} segundos hasta la siguiente bodega...')
        time.sleep(interval)
        sync_next_bodega()


if __name__ == '__main__':
    main()
