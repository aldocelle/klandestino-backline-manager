#!/bin/sh
set -eu
service_port="${PORT:-10000}"
case "$service_port" in ''|*[!0-9]*) echo 'PORT must be numeric' >&2; exit 1;; esac
printf 'Listen %s\n' "$service_port" > /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:10000>/<VirtualHost *:$service_port>/" /etc/apache2/sites-available/000-default.conf
exec apache2-foreground
