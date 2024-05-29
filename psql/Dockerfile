FROM docker.io/library/postgres:16.3

COPY copy-restaurants.sql /copy-restaurants.sql
COPY create-tables.sql /docker-entrypoint-initdb.d/
COPY load-locations.sql /docker-entrypoint-initdb.d/
COPY locations.csv /locations.csv
COPY drop-non-existent-restaurants.sql /drop-non-existent-restaurants.sql