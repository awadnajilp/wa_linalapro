import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '/var/www/wa.linalapro.com/.env' });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  const userRes = await client.query("SELECT id, email, \"sarvamApiKey\", \"groqApiKey\" FROM users WHERE email = 'awadnejilp@gmail.com' LIMIT 1");
  const user = userRes.rows[0];
  if (!user) {
    console.log("User not found!");
    await client.end();
    return;
  }
  console.log("User:", user);
  const channelsRes = await client.query("SELECT id, name, \"phoneNumber\", \"connectionMethod\", \"isActive\", \"accessToken\" FROM channels WHERE \"createdBy\" = $1", [user.id]);
  console.log("Channels:", channelsRes.rows);
  await client.end();
}

run().catch(console.error);
