#!/usr/bin/env python3
import time

from sync_core import (
    BODEGAS,
    BODEGA_INTERVALS,
    fetch_data,
    update_database,
    update_manifiestos,
    update_transportadoras,
    BODEGAS_CON_MANIFIESTOS,
    BODEGAS_CON_TRANSPORTADORAS,
)


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
    from sync_core import SHEETS_URL
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
