#!/bin/bash
# Script untuk restore cpa_13022024.sql ke db_existing
# Jalankan sekali saat pertama setup

set -e

SQL_FILE="/data/cpa_13022024.sql"
DB_NAME="${POSTGRES_DB:-cpa_existing}"
DB_USER="${POSTGRES_USER:-postgres}"

echo "=== CPA Database Restore ==="
echo "Database: $DB_NAME"
echo "File: $SQL_FILE"

if [ -f "$SQL_FILE" ]; then
    echo "File ditemukan, mulai restore..."
    psql -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
    echo "Restore selesai!"
    
    # Grant read-only access untuk monitoring_user
    psql -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
        -- Create read-only monitoring user
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'monitoring_user') THEN
                CREATE ROLE monitoring_user WITH LOGIN PASSWORD 'monitoring_readonly_2024';
            END IF;
        END
        \$\$;
        
        GRANT CONNECT ON DATABASE $DB_NAME TO monitoring_user;
        GRANT USAGE ON SCHEMA public TO monitoring_user;
        GRANT USAGE ON SCHEMA finance TO monitoring_user;
        GRANT USAGE ON SCHEMA hr TO monitoring_user;
        GRANT USAGE ON SCHEMA kpi TO monitoring_user;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_user;
        GRANT SELECT ON ALL TABLES IN SCHEMA finance TO monitoring_user;
        GRANT SELECT ON ALL TABLES IN SCHEMA hr TO monitoring_user;
        GRANT SELECT ON ALL TABLES IN SCHEMA kpi TO monitoring_user;
        
        -- Default privileges untuk tabel baru di masa depan
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monitoring_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA finance GRANT SELECT ON TABLES TO monitoring_user;
        
        SELECT 'Read-only user monitoring_user berhasil dibuat' AS status;
EOSQL
    echo "Monitoring user berhasil dikonfigurasi."
else
    echo "WARNING: File $SQL_FILE tidak ditemukan."
    echo "Jalankan restore manual dengan perintah:"
    echo "  docker cp cpa_13022024.sql cpa_db_existing:/data/"
    echo "  docker exec cpa_db_existing psql -U postgres -d cpa_existing -f /data/cpa_13022024.sql"
fi
