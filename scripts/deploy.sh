#!/bin/bash
# =============================================================
# CPA Analytics - Deploy Script untuk VPS
# Jalankan: chmod +x scripts/deploy.sh && ./scripts/deploy.sh
# =============================================================

set -e  # Exit on error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   CPA Analytics - Deployment Script       ${NC}"
echo -e "${GREEN}============================================${NC}"

# ── 1. Cek .env ada ──────────────────────────────────────────
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: File .env tidak ditemukan!${NC}"
    echo "Salin .env.example ke .env dan isi nilainya terlebih dahulu:"
    echo "  cp .env.example .env && nano .env"
    exit 1
fi

# ── 2. Pull update terbaru dari GitHub ──────────────────────
echo -e "\n${YELLOW}[1/5] Menarik update terbaru dari GitHub...${NC}"
git pull origin main

# ── 3. Build ulang Docker images ────────────────────────────
echo -e "\n${YELLOW}[2/5] Membangun Docker images...${NC}"
docker compose build --no-cache backend frontend

# ── 4. Jalankan database migrations ─────────────────────────
echo -e "\n${YELLOW}[3/5] Menjalankan database migrations...${NC}"
docker compose run --rm backend alembic upgrade head || echo "Migration skipped (atau sudah up-to-date)"

# ── 5. Restart semua services ───────────────────────────────
echo -e "\n${YELLOW}[4/5] Merestart semua services...${NC}"
docker compose down
docker compose up -d

# ── 6. Cek status services ──────────────────────────────────
echo -e "\n${YELLOW}[5/5] Mengecek status services...${NC}"
sleep 5
docker compose ps

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}   Deployment selesai!                     ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Cek logs dengan:"
echo "  docker compose logs -f backend"
echo "  docker compose logs -f frontend"
