#!/bin/bash
DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./init-ssl.sh diwan.net admin@email.com"
    exit 1
fi

docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

echo "✅ SSL certificate issued for $DOMAIN"
echo "Now restart nginx: docker-compose restart nginx"
