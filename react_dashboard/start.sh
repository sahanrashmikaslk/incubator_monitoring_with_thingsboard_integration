#!/bin/sh

# Replace PORT in nginx config with environment variable
sed -i "s/listen 80;/listen ${PORT:-8080};/g" /etc/nginx/conf.d/default.conf

# Replace PORT in health check
sed -i "s/localhost\/health/localhost:${PORT:-8080}\/health/g" /etc/nginx/conf.d/default.conf

# Start nginx
nginx -g 'daemon off;'
