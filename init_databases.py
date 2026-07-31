#!/usr/bin/env python3
import os
import sqlite3

BODEGAS = ['megafantasy', 'bluestar', 'nexus', 'megaworld', 'elitech']
DATA_DIR = '/data'

CREATE_FACTURAS_SQL = '''
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

CREATE_VENDEDORES_SQL = '''
CREATE TABLE IF NOT EXISTS vendedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendedor TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    contrasena TEXT NOT NULL
);
'''

CREATE_MANIFIESTOS_SQL = '''
CREATE TABLE IF NOT EXISTS manifiestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referencia TEXT,
    descripcion TEXT,
    url_manifiesto TEXT
);
'''

def init():
    os.makedirs(DATA_DIR, exist_ok=True)
    for bodega in BODEGAS:
        db_path = os.path.join(DATA_DIR, f'{bodega}.db')
        conn = sqlite3.connect(db_path)
        conn.execute(CREATE_FACTURAS_SQL)
        conn.commit()
        conn.close()
        print(f'Base de datos lista: {db_path}')

        v_db_path = os.path.join(DATA_DIR, f'v_{bodega}.db')
        v_conn = sqlite3.connect(v_db_path)
        v_conn.execute(CREATE_VENDEDORES_SQL)
        v_conn.commit()
        v_conn.close()
        print(f'Base de datos de vendedores lista: {v_db_path}')

        m_db_path = os.path.join(DATA_DIR, f'{bodega}-manifiestos.db')
        m_conn = sqlite3.connect(m_db_path)
        m_conn.execute(CREATE_MANIFIESTOS_SQL)
        m_conn.execute('CREATE INDEX IF NOT EXISTS idx_manifiestos_referencia ON manifiestos(referencia)')
        m_conn.execute('CREATE INDEX IF NOT EXISTS idx_manifiestos_descripcion ON manifiestos(descripcion)')
        m_conn.commit()
        m_conn.close()
        print(f'Base de datos de manifiestos lista: {m_db_path}')

if __name__ == '__main__':
    init()
