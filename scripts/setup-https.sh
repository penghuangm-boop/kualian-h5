#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/kualian-h5}"
WEB_ROOT="${WEB_ROOT:-/var/www/faceok}"
DOMAIN="${DOMAIN:-faceok.cn}"
WWW_DOMAIN="${WWW_DOMAIN:-www.faceok.cn}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
CERTBOT_STAGING="${CERTBOT_STAGING:-0}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-faceok.cn}"
HTTP_CONFIG_SOURCE="${HTTP_CONFIG_SOURCE:-deploy/nginx-faceok.conf}"
HTTPS_CONFIG_SOURCE="${HTTPS_CONFIG_SOURCE:-deploy/nginx-faceok-https.conf}"

if [[ -z "$CERTBOT_EMAIL" ]]; then
  echo "Set CERTBOT_EMAIL before running, for example:" >&2
  echo "CERTBOT_EMAIL=you@example.com bash $APP_DIR/scripts/setup-https.sh" >&2
  exit 1
fi

cd "$APP_DIR"

echo "[https] ensuring certbot is installed"
if ! command -v certbot >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y certbot
fi

echo "[https] preparing webroot challenge directory"
sudo mkdir -p "$WEB_ROOT/.well-known/acme-challenge"
sudo chown -R www-data:www-data "$WEB_ROOT/.well-known"

echo "[https] installing HTTP nginx config for ACME challenge"
sudo cp "$APP_DIR/$HTTP_CONFIG_SOURCE" "/etc/nginx/sites-available/$NGINX_SITE_NAME"
sudo ln -sf "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-enabled/$NGINX_SITE_NAME"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Equivalent command: certbot certonly --webroot -w "$WEB_ROOT" -d "$DOMAIN" -d "$WWW_DOMAIN"
certbot_args=(
  certonly
  --webroot
  -w "$WEB_ROOT"
  -d "$DOMAIN"
  -d "$WWW_DOMAIN"
  --email "$CERTBOT_EMAIL"
  --agree-tos
  --non-interactive
  --keep-until-expiring
)

if [[ "$CERTBOT_STAGING" == "1" ]]; then
  certbot_args+=(--staging)
fi

echo "[https] requesting certificate for $DOMAIN and $WWW_DOMAIN"
sudo certbot "${certbot_args[@]}"

echo "[https] installing HTTPS nginx config"
sudo cp "$APP_DIR/$HTTPS_CONFIG_SOURCE" "/etc/nginx/sites-available/$NGINX_SITE_NAME"
sudo nginx -t
sudo systemctl reload nginx

echo "[https] verifying renewal path"
sudo certbot renew --dry-run

echo "[https] done"
echo "Update server .env after this succeeds:"
echo "PUBLIC_BASE_URL=https://$DOMAIN"
