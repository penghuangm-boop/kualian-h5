#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/kualian-h5}"
WEB_ROOT="${WEB_ROOT:-/var/www/faceok}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-faceok.cn}"
NGINX_CONFIG_SOURCE="${NGINX_CONFIG_SOURCE:-deploy/nginx-faceok.conf}"
PM2_APP="${PM2_APP:-kualian-api}"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"

cd "$APP_DIR"

echo "[deploy] pulling latest main"
git pull --ff-only

echo "[deploy] building static dist"
"$NODE_BIN" scripts/build-dist.mjs

echo "[deploy] syncing dist to $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete "$APP_DIR/dist/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"

echo "[deploy] installing nginx config"
sudo cp "$APP_DIR/$NGINX_CONFIG_SOURCE" "/etc/nginx/sites-available/$NGINX_SITE_NAME"
sudo ln -sf "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-enabled/$NGINX_SITE_NAME"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "[deploy] restarting pm2 app"
pm2 restart "$PM2_APP" --update-env
pm2 save

echo "[deploy] done"
