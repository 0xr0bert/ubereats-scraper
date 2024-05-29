# ue-scraper


This is now not very easy to use.

You must install fiddler classic for windows (only) and enable https decryption (use google for instructions).

You must visit ubereats.com and open the developer tools of your browser, then you must change the sorting info (e.g., to sort by rating).
You must then find the request to getFeedV1, look at then headers and find the Cookie header, copy the cookie jwt-session=xxxx and update it in the code.
Then run yarn build and yarn locations.
When you see loads of forbidden errors in the logs you need to get a new cookie by visiting the site again.

## Prerequisite

1. Install Fiddler classic.
2. Enable HTTPS decryption in settings.

## Running

1. Install Podman following installation instructions for your OS https://podman.io/docs/installation
2. Run the following command:

```shell
podman run -p 5433:5432 --name ue-psql -e POSTGRES_PASSWORD=UBEREATS -d ghcr.io/0xr0bert/ubereats-scraper:psql-1.0.1
```

3. There is now a server running on localhost:5433 with the password UBEREATS. The database structure is pre-created.
4. Install npm https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
5. Install yarn

```shell
npm install -g yarn
```

6. Build

```shell
yarn build
```

7. Scrape locations

```shell
yarn locations
```

8. Once fully complete (verify that there is no entry in locations table with null visited time), copy restaurants

```shell
podman exec -u postgres -it ue-psql psql -f /copy-restaurants.sql
```

9. Scrape restaurants

```shell
yarn restaurants
```

10. Repeat until number of restaurants with null visited time no longer decreases. Then cleanup database

```shell
podman exec -u postgres -it ue-psql psql -f /drop-non-existent-restaurants.sql
```