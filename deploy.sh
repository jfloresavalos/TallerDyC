#!/bin/bash
set -e

APP_DIR="/var/www/tallerdyc"
APP_NAME="tallerdyc"

echo "=== Deploy TallerDyc ==="

cd $APP_DIR

if [ "$1" == "--setup" ]; then
  echo "--- Setup inicial ---"
  pnpm install
  pnpm exec prisma generate
  pnpm exec prisma db push
  pnpm exec prisma db seed
  pnpm build
  pm2 start ecosystem.config.js
  pm2 save
  echo "Setup completo."
  exit 0
fi

echo "--- Pull ---"
git pull origin main

echo "--- Instalar dependencias ---"
pnpm install

echo "--- Generar Prisma ---"
pnpm exec prisma generate

echo "--- Build ---"
pm2 stop $APP_NAME 2>/dev/null || true
rm -rf .next
pnpm build

echo "--- Restart PM2 ---"
pm2 start $APP_NAME

echo "=== Deploy completado ==="
pm2 list
