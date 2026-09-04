#!/bin/bash
# ================================================================
# CPA Analytics — SSL Setup Script
# Jalankan SETELAH DNS warehouse.pengajaran.com sudah diarahkan
# ke IP server ini (46.250.235.222)
#
# Penggunaan: chmod +x ssl-setup.sh && ./ssl-setup.sh
# ================================================================

set -e

DOMAIN="warehouse.pengajaran.com"
EMAIL="admin@${DOMAIN}"    # ← ganti jika perlu
DWH_DIR="/root/data_warehouse"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()   { echo -e "${GREEN}[✓]${NC} $1"; }
info()  { echo -e "${CYAN}[→]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
banner(){ echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════${NC}"; echo -e "${BOLD}${CYAN}  $1${NC}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${NC}\n"; }

banner "CPA Analytics — SSL Setup: ${DOMAIN}"

# ─── 1. Cek DNS propagasi ─────────────────────────────────────────
SERVER_IP="46.250.235.222"
DNS_IP=$(dig @8.8.8.8 +short A "${DOMAIN}" 2>/dev/null | tail -1 || nslookup "${DOMAIN}" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')

info "IP Server  : ${SERVER_IP}"
info "IP DNS     : ${DNS_IP:-TIDAK DITEMUKAN}"

if [ -z "$DNS_IP" ]; then
    error "DNS ${DOMAIN} belum ada record A. Tambahkan dulu di panel DNS provider Anda:\n  Tipe: A\n  Nama: warehouse\n  Nilai: ${SERVER_IP}\n\nTunggu propagasi (5–30 menit) lalu jalankan script ini lagi."
fi

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    warn "DNS IP ($DNS_IP) tidak cocok dengan server IP ($SERVER_IP)"
    warn "Kemungkinan DNS belum propagasi atau diarahkan ke server lain."
    confirm="y"
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi
log "DNS check OK: ${DOMAIN} → ${DNS_IP}"

# ─── 2. Ambil SSL Certificate ─────────────────────────────────────
if [ -f "$CERT_PATH" ]; then
    log "Sertifikat sudah ada di $CERT_PATH"
    info "Untuk renew manual: docker run --rm certbot/certbot renew"
else
    info "Menghentikan sementara nginx data_warehouse..."
    docker stop data_warehouse-nginx-1 2>/dev/null && sleep 2

    info "Meminta SSL certificate (certbot standalone)..."
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
        warn "Certbot gagal. Memulai ulang nginx..."
        cd "$DWH_DIR" && docker compose up -d nginx && cd - >/dev/null
        error "SSL gagal. Cek log di atas."
    }

    info "Memulai ulang nginx data_warehouse..."
    cd "$DWH_DIR" && docker compose up -d nginx && cd - >/dev/null
    sleep 3
    log "SSL Certificate berhasil! Expires: $(openssl x509 -enddate -noout -in $CERT_PATH 2>/dev/null)"
fi

# ─── 3. Mount SSL ke nginx data_warehouse (jika belum) ───────────
banner "Mengkonfigurasi Nginx data_warehouse"

COMPOSE_FILE="$DWH_DIR/compose.yaml"
if ! grep -q "letsencrypt" "$COMPOSE_FILE"; then
    info "Menambahkan volume SSL ke nginx data_warehouse..."
    python3 - <<'PYEOF'
compose_file = "/root/data_warehouse/compose.yaml"
with open(compose_file, 'r') as f:
    content = f.read()

old = "      - ./nginx/conf.d:/etc/nginx/conf.d:ro"
new = """      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro"""

if old in content and "letsencrypt" not in content:
    content = content.replace(old, new)
    with open(compose_file, 'w') as f:
        f.write(content)
    print("[✓] compose.yaml updated: SSL volumes added")
else:
    print("[!] Volume sudah ada atau pattern tidak ditemukan")
PYEOF

    info "Merestart nginx data_warehouse..."
    cd "$DWH_DIR" && docker compose up -d nginx && cd - >/dev/null
    sleep 5
else
    log "/etc/letsencrypt sudah terkonfigurasi di compose.yaml"
fi

# ─── 4. Test & Reload nginx ───────────────────────────────────────
info "Test konfigurasi nginx..."
docker exec data_warehouse-nginx-1 nginx -t 2>&1 && {
    docker exec data_warehouse-nginx-1 nginx -s reload
    log "Nginx reloaded sukses"
} || {
    warn "Nginx test gagal. Periksa /root/data_warehouse/nginx/conf.d/warehouse.conf"
    docker logs data_warehouse-nginx-1 --tail 20
}

# ─── 5. Setup Auto-Renew ─────────────────────────────────────────
banner "Setup Auto-Renew SSL"

CRON_JOB="0 3 * * * docker stop data_warehouse-nginx-1 2>/dev/null; docker run --rm -p 80:80 -v /etc/letsencrypt:/etc/letsencrypt -v /var/lib/letsencrypt:/var/lib/letsencrypt certbot/certbot renew --standalone --quiet; cd ${DWH_DIR} && docker compose up -d nginx >> /var/log/certbot-renew.log 2>&1"
(crontab -l 2>/dev/null | grep -v "certbot/certbot renew"; echo "$CRON_JOB") | crontab -
log "Auto-renew dikonfigurasi (setiap hari jam 03:00)"

# ─── SELESAI ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   SSL Setup Selesai! 🔒                      ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 Akses: ${CYAN}https://${DOMAIN}${NC}"
echo -e "  🔒 SSL  : Let's Encrypt (auto-renew aktif)"
echo ""
echo -e "${BOLD}Test SSL:${NC}"
echo -e "  curl -I https://${DOMAIN}"
echo -e "  openssl s_client -connect ${DOMAIN}:443 -brief"
echo ""
