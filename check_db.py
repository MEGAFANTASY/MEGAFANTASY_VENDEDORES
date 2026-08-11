import sqlite3, os

base = r'f:\3. MEGAFANTASY\2. APP-VENDEDORES\data'
for b in ['megafantasy','bluestar','nexus','megaworld','elitech']:
    db = os.path.join(base, f'{b}.db')
    if os.path.exists(db):
        conn = sqlite3.connect(db)
        cur = conn.execute('SELECT COUNT(*) FROM facturas')
        n = cur.fetchone()[0]
        conn.close()
        print(f'{b}: {n} facturas')
    else:
        print(f'{b}: base no encontrada')
