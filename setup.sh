#!/bin/bash
# ================================================================
# CPA Platform — Setup Script
# Jalankan sekali untuk setup pertama kali
# ================================================================

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[CPA]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Prerequisites ────────────────────────────────────────────────────────────
log "Mengecek prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker tidak terinstall"
# Cek apakah docker compose v2 tersedia
docker compose version >/dev/null 2>&1 || error "Docker Compose V2 tidak terinstall"

# ─── .env ─────────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    sed -i "s/GANTI_DENGAN_STRING_RANDOM_MINIMAL_32_KARAKTER/$SECRET/" .env
    log ".env dibuat. Periksa dan sesuaikan credential jika perlu."
else
    warn ".env sudah ada, dilewati."
fi

# ─── Start Infrastructure ─────────────────────────────────────────────────────
log "Menjalankan database dan Redis..."
docker compose up -d db_existing db_analytics redis
log "Menunggu database siap..."
sleep 10

# ─── Restore SQL jika file tersedia ──────────────────────────────────────────
SQL_FILE="./cpa_13022024.sql"
if [ -f "$SQL_FILE" ]; then
    log "File SQL ditemukan. Menyalin ke container..."
    docker cp "$SQL_FILE" cpa_db_existing:/tmp/cpa_13022024.sql
    log "Menjalankan restore (ini mungkin memakan waktu 10-30 menit untuk file besar)..."
    docker exec cpa_db_existing psql -U postgres -d cpa_existing \
        -f /tmp/cpa_13022024.sql \
        -v ON_ERROR_STOP=0 2>&1 | tail -20
    log "Restore selesai!"
    
    # Grant read-only access
    docker exec cpa_db_existing psql -U postgres -d cpa_existing -c "
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'monitoring_user') THEN
                CREATE ROLE monitoring_user WITH LOGIN PASSWORD 'monitoring_readonly_2024';
            END IF;
        END \$\$;
        GRANT CONNECT ON DATABASE cpa_existing TO monitoring_user;
        GRANT USAGE ON SCHEMA public TO monitoring_user;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_user;
    "
    log "Read-only user dikonfigurasi."
else
    warn "File SQL tidak ditemukan di $SQL_FILE"
    warn "Jalankan restore manual setelah setup selesai:"
    warn "  docker cp cpa_13022024.sql cpa_db_existing:/tmp/"
    warn "  docker exec cpa_db_existing psql -U postgres -d cpa_existing -f /tmp/cpa_13022024.sql"
fi

# ─── Analytics DB Migration ───────────────────────────────────────────────────
log "Menjalankan Alembic migration..."
docker compose run --rm backend alembic upgrade head
log "Migration selesai!"

# ─── Create Admin User ────────────────────────────────────────────────────────
log "Membuat admin user default..."
docker compose run --rm backend python -c "
from app.database import AnalyticsSessionLocal, analytics_engine
from app.models.analytics.models import AnalyticsBase, AppUser
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = AnalyticsSessionLocal()
existing = db.query(AppUser).filter_by(username='admin').first()
if not existing:
    admin = AppUser(
        username='admin',
        email='admin@cpa.local',
        full_name='Administrator',
        hashed_password=pwd_context.hash('admin123'),
        role='admin',
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print('Admin user dibuat: admin / admin123')
    print('GANTI PASSWORD SEGERA di production!')
else:
    print('Admin user sudah ada.')
db.close()
"

# ─── Build & Start All Services ───────────────────────────────────────────────
log "Membangun dan menjalankan semua service..."
docker compose up -d --build

log ""
log "=============================================="
log "CPA Platform berhasil dijalankan!"
log "=============================================="
log "Frontend  : http://localhost:3000"
log "API       : http://localhost:8000"
log "API Docs  : http://localhost:8000/docs"
log "Flower    : http://localhost:5555"
log ""
log "Login dengan: admin / admin123"
log "GANTI PASSWORD setelah login pertama!"
log "=============================================="
