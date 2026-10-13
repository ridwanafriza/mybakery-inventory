# Dockerfile untuk deploy backend Laravel di Render
# (Render tidak menyediakan runtime PHP native — PHP harus lewat Docker)
# Start command (Render): php artisan serve --host=0.0.0.0 --port=$PORT

FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libonig-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && php artisan storage:link

CMD ["sh", "-c", "php artisan serve --host=0.0.0.0 --port=${PORT:-10000}"]
