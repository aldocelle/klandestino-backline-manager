FROM node:22-bookworm-slim AS assets
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend ./frontend
COPY public ./public
RUN npm run build

FROM php:8.3-apache-bookworm
RUN docker-php-ext-install pdo_mysql && a2enmod headers expires
WORKDIR /var/www/app
COPY src ./src
COPY config/config.example.php ./config/config.example.php
COPY --from=assets /build/public ./public
COPY deploy/apache.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/start-render.sh /usr/local/bin/start-render
RUN chmod +x /usr/local/bin/start-render
EXPOSE 10000
CMD ["/usr/local/bin/start-render"]
