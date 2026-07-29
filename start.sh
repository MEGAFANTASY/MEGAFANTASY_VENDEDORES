#!/bin/sh
set -e

python /app/init_databases.py

# Iniciar sincronizacion en segundo plano
python /app/sync_sheets.py &

# Iniciar servidor web
exec python /app/server.py
