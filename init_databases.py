#!/usr/bin/env python3
import os
import sqlite3

BODEGAS = ['megafantasy', 'bluestar', 'nexus', 'megaworld', 'elitech']
DATA_DIR = '/data'

CREATE_SQL = '''
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
);
'''

def init():
    os.makedirs(DATA_DIR, exist_ok=True)
    for bodega in BODEGAS:
        db_path = os.path.join(DATA_DIR, f'{bodega}.db')
        conn = sqlite3.connect(db_path)
        conn.execute(CREATE_SQL)
        conn.commit()
        conn.close()
        print(f'Base de datos lista: {db_path}')

if __name__ == '__main__':
    init()
