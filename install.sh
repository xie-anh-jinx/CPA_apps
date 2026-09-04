#!/bin/bash
# ================================================================
# CPA Analytics — Install Script (Production)
# Domain : warehouse.pengajaran.com
# Server : Ubuntu 24.04 LTS
#
# ARSITEKTUR:
#   - data_warehouse nginx (port 80/443) → gateway utama
#   - cpa_backend (port 8000) + cpa_frontend (port 3001) → internal
#   - SSL dikelola di data_warehouse nginx
#
# Jalankan: chmod +x install.sh && ./install.sh
# ================================================================

set -e

DOMAIN="warehouse.pengajaran.com"
EMAIL="admin@${DOMAIN}"          # ← ganti dengan email aktif untuk notif SSL expiry
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DWH_DIR="/root/data_warehouse"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
info()  { echo -e "${CYAN}[→]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗] ERROR:${NC} $1"; exit 1; }
banner(){ echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════${NC}"; echo -e "${BOLD}${CYAN}  $1${NC}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${NC}\n"; }

cd "$PROJECT_DIR"

banner "CPA Analytics — Instalasi Production"
info "Domain  : ${DOMAIN}"
info "Server  : $(hostname -I | awk '{print $1}')"
info "Waktu   : $(date)"

# ─── 1. Cek Prerequisites ──────────────────────────────────────────
banner "1/8 — Mengecek Prerequisites"

command -v docker >/dev/null 2>&1      || error "Docker tidak terinstall."
docker compose version >/dev/null 2>&1 || error "Docker Compose V2 tidak tersedia."
log "Docker & Docker Compose tersedia"

[ -d "$DWH_DIR" ] || error "Direktori data_warehouse tidak ditemukan di $DWH_DIR"
log "data_warehouse project ditemukan"

# Cek network data_warehouse_dwh_network ada
docker network inspect data_warehouse_dwh_network >/dev/null 2>&1 || {
    error "Network data_warehouse_dwh_network tidak ditemukan. Pastikan data_warehouse sudah berjalan (docker compose up -d di $DWH_DIR)"
}
log "Network data_warehouse_dwh_network tersedia"

# ─── 2. Cek .env ────────────────────────────────────────────────────
banner "2/8 — Mengecek Konfigurasi .env"

[ -f ".env" ] || error "File .env tidak ditemukan!"
grep -q "GANTI_DENGAN" .env && error "SECRET_KEY masih berisi placeholder!"
log ".env valid"

# ─── 3. SSL Certificate via Let's Encrypt (certbot standalone) ─────
banner "3/8 — Mendapatkan SSL Certificate Let's Encrypt"

if [ -f "$CERT_PATH" ]; then
    log "Sertifikat SSL sudah ada di $CERT_PATH, skip penerbitan ulang."
else
    info "Menghentikan sementara nginx data_warehouse untuk ACME challenge..."
    docker stop data_warehouse-nginx-1 2>/dev/null || warn "data_warehouse nginx tidak berjalan"

    info "Meminta SSL certificate untuk ${DOMAIN} (certbot standalone)..."
    docker run --rm \
        -p 80:80 \
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v /var/lib/letsencrypt:/var/lib/letsencrypt \
        certbot/certbot certonly \
            --standalone \
            --email "${EMAIL}" \
            --agree-tos \
            --no-eff-email \
            --non-interactive \
            -d "${DOMAIN}" || {
                warn "Gagal dengan ${DOMAIN}, coba cek DNS propagasi dulu."
                info "Memulai ulang nginx data_warehouse..."
                cd "$DWH_DIR" && docker compose up -d nginx && cd "$PROJECT_DIR"
                error "SSL certificate gagal. Pastikan DNS ${DOMAIN} sudah diarahkan ke server ini."
            }

    info "Memulai ulang nginx data_warehouse..."
    cd "$DWH_DIR" && docker compose up -d nginx && cd "$PROJECT_DIR"
    log "SSL Certificate berhasil diterbitkan!"
fi

# ─── 4. Mount SSL ke nginx data_warehouse ──────────────────────────
banner "4/8 — Mengkonfigurasi Nginx data_warehouse"

# Cek apakah /etc/letsencrypt sudah di-mount ke data_warehouse nginx
LETSENCRYPT_MOUNTED=$(docker inspect data_warehouse-nginx-1 \
    --format '{{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}' 2>/dev/null | \
    grep -c "letsencrypt" || echo "0")

if [ "$LETSENCRYPT_MOUNTED" = "0" ] || [ "$LETSENCRYPT_MOUNTED" = "" ]; then
    info "Menambahkan mount /etc/letsencrypt ke nginx data_warehouse..."
    
    # Cek apakah compose.yaml sudah ada SSL mount
    if ! grep -q "letsencrypt" "$DWH_DIR/compose.yaml"; then
        # Tambah volume mount SSL ke nginx di data_warehouse
        python3 - <<'PYEOF'
import re, sys

compose_file = "/root/data_warehouse/compose.yaml"
with open(compose_file, 'r') as f:
    content = f.read()

# Tambah volume letsencrypt ke nginx service
old_volumes = """      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro"""
new_volumes = """      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro"""

if old_volumes in content:
    content = content.replace(old_volumes, new_volumes)
    with open(compose_file, 'w') as f:
        f.write(content)
    print("compose.yaml updated: SSL volumes added to nginx.")
else:
    print("WARNING: Volume pattern not found, manual update may be needed.")
PYEOF
    fi

    info "Merestart nginx data_warehouse dengan konfigurasi baru..."
    cd "$DWH_DIR" && docker compose up -d nginx && cd "$PROJECT_DIR"
    sleep 5
    log "Nginx data_warehouse dikonfigurasi ulang dengan SSL"
else
    log "/etc/letsencrypt sudah di-mount ke nginx data_warehouse"
fi

# Verifikasi warehouse.conf sudah ada
[ -f "$DWH_DIR/nginx/conf.d/warehouse.conf" ] || \
    error "File warehouse.conf tidak ditemukan di $DWH_DIR/nginx/conf.d/. Periksa file ini ada."

log "Virtual host warehouse.conf tersedia"

# Reload nginx data_warehouse
info "Reload nginx data_warehouse..."
docker exec data_warehouse-nginx-1 nginx -t 2>&1 && \
    docker exec data_warehouse-nginx-1 nginx -s reload && \
    log "Nginx reloaded" || \
    warn "Nginx reload gagal. Coba: docker compose restart nginx (di $DWH_DIR)"

# ─── 5. Build & Start CPA Services ────────────────────────────────
banner "5/8 — Build Docker Images & Jalankan CPA Services"

info "Membangun Docker images (ini mungkin memakan 5–15 menit)..."
docker compose build --no-cache backend frontend

info "Menjalankan database dan Redis..."
docker compose up -d db_existing db_analytics redis

info "Menunggu database ready (30 detik)..."
sleep 30

# ─── 6. Restore SQL (jika ada) ─────────────────────────────────────
banner "6/8 — Restore Database (opsional)"

SQL_FILE="./cpa_13022024.sql"
if [ -f "$SQL_FILE" ]; then
    log "File SQL ditemukan: $SQL_FILE"
    info "Menyalin ke container..."
    docker cp "$SQL_FILE" cpa_db_existing:/tmp/cpa_13022024.sql
    info "Menjalankan restore SQL (bisa 10–30 menit untuk file besar)..."
    docker exec cpa_db_existing psql -U postgres -d cpa_existing \
        -f /tmp/cpa_13022024.sql \
        -v ON_ERROR_STOP=0 2>&1 | tail -20
    log "Restore selesai!"

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
    warn "File SQL tidak ditemukan di: $SQL_FILE"
    warn "Restore manual jika diperlukan:"
    warn "  docker cp cpa_13022024.sql cpa_db_existing:/tmp/"
    warn "  docker exec cpa_db_existing psql -U postgres -d cpa_existing -f /tmp/cpa_13022024.sql"
fi

# ─── 7. Migration & Admin User ─────────────────────────────────────
banner "7/8 — Migration Database & Admin User"

info "Menjalankan Alembic migration..."
docker compose run --rm backend alembic upgrade head || warn "Migration gagal atau sudah up-to-date, lanjut..."
log "Migration selesai!"

info "Membuat admin user default..."
docker compose run --rm backend python -c "
from app.database import AnalyticsSessionLocal
from app.models.analytics.models import AppUser
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = AnalyticsSessionLocal()
existing = db.query(AppUser).filter_by(username='admin').first()
if not existing:
    admin = AppUser(
        username='admin',
        email='admin@cpa.local',
        full_name='Administrator',
        hashed_password=pwd_context.hash('Admin@CPA2024!'),
        role='admin',
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print('Admin user dibuat: admin / Admin@CPA2024!')
else:
    print('Admin user sudah ada.')
db.close()
" || warn "Pembuatan admin user gagal (mungkin model berbeda). Lanjut..."

# ─── 8. Start All Services ─────────────────────────────────────────
banner "8/8 — Menjalankan Semua Services"

info "Menjalankan semua CPA service..."
docker compose up -d

info "Menunggu semua container ready (20 detik)..."
sleep 20

info "Status semua CPA service:"
docker compose ps

# ─── Setup Auto-Renew SSL (cron) ───────────────────────────────────
info "Mengatur auto-renew SSL certificate..."
CRON_JOB="0 3 * * * docker stop data_warehouse-nginx-1 2>/dev/null; docker run --rm -p 80:80 -v /etc/letsencrypt:/etc/letsencrypt -v /var/lib/letsencrypt:/var/lib/letsencrypt certbot/certbot renew --standalone --quiet; cd ${DWH_DIR} && docker compose up -d nginx >> /var/log/certbot-renew.log 2>&1"
(crontab -l 2>/dev/null | grep -v "certbot/certbot renew"; echo "$CRON_JOB") | crontab -
log "Auto-renew SSL dikonfigurasi (setiap hari jam 03:00)"

# ─── SELESAI ───────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   CPA Analytics — Instalasi Selesai! 🎉     ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Akses Aplikasi:${NC}"
echo -e "  🌐 Frontend  : ${CYAN}https://${DOMAIN}${NC}"
echo -e "  🔌 API Docs  : ${CYAN}https://${DOMAIN}/docs${NC}"
echo -e "  🌸 Flower    : ${CYAN}https://${DOMAIN}/flower/${NC}"
echo ""
echo -e "${BOLD}Login Default:${NC}"
echo -e "  Username : ${YELLOW}admin${NC}"
echo -e "  Password : ${YELLOW}Admin@CPA2024!${NC}"
echo -e "  ${RED}⚠ GANTI PASSWORD SEGERA SETELAH LOGIN!${NC}"
echo ""
echo -e "${BOLD}Arsitektur:${NC}"
echo -e "  data_warehouse nginx (port 80/443) → gateway SSL"
echo -e "  cpa_backend    → port 8000 (internal)"
echo -e "  cpa_frontend   → port 3001 (internal → 3000)"
echo ""
echo -e "${BOLD}Perintah Berguna:${NC}"
echo -e "  docker compose ps                    # Status CPA services"
echo -e "  docker compose logs -f backend       # Log backend"
echo -e "  docker compose logs -f frontend      # Log frontend"
echo -e "  docker compose down                  # Stop semua CPA"
echo -e "  cd $DWH_DIR && docker compose ps   # Status data_warehouse"
echo ""
