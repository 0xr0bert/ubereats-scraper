import lsoaJson from './lsoa2011popcentroids.json'
import { Client } from 'pg';
import format from 'pg-format';

const elements = lsoaJson.features.map(f => {
  return [
    f.geometry.coordinates[0],
    f.geometry.coordinates[1],
    f.properties.lsoa11cd,
    f.properties.lsoa11nm,
    false
  ]
})

const client = new Client({
  user: "postgres",
  host: "localhost",
  password: "postgres",
  database: "postgres"
});

(async () => {
  await client.connect();
  const res = await client.query(
    format('INSERT INTO locations(longitude, latitude, lsoa11cd, lsoa11nm, visited) VALUES %L', elements)
  );

  await client.end();
})();