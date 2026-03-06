#!/bin/bash
set -e

APP_DIR="/var/www/tallerdyc"
APP_NAME="tallerdyc"

echo "=== Deploy TallerDyc ==="

cd $APP_DIR

if [ "$1" == "--setup" ]; then
  echo "--- Setup inicial ---"
  npm install --legacy-peer-deps
  npx prisma generate
  npm run build
  pm2 start ecosystem.config.js
  pm2 save
  echo "Setup completo."
  exit 0
fi

echo "--- Pull ---"
git pull origin main

echo "--- Instalar dependencias ---"
npm install --legacy-peer-deps

echo "--- Generar Prisma ---"
npx prisma generate

echo "--- Build ---"
npm run build

echo "--- Restart PM2 ---"
pm2 restart $APP_NAME

echo "=== Deploy completado ==="
pm2 list
