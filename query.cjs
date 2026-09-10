const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT id, name, is_active FROM channels');
  console.log("Channels:", res.rows);
  await client.end();
}

run();
