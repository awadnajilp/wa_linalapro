import fetch from 'node-fetch';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '/var/www/wa.linalapro.com/.env' });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  
  const settingsRes = await client.query("SELECT id, channel_id, provider, model, \"is_active\" as \"isActive\", \"api_key\" as \"apiKey\" FROM ai_settings WHERE channel_id = '48b128d7-6662-4604-9b5f-a61756c6a9f3'");
  console.log("SKYSECRETARY AI Settings:");
  console.table(settingsRes.rows);

  const msgRes = await client.query(`
    SELECT m.id, m.media_url, m.created_at, m.direction, ch.name as channel_name, ch.phone_number as channel_phone
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    JOIN channels ch ON c.channel_id = ch.id
    WHERE m.message_type = 'audio' AND m.direction = 'inbound' AND m.created_at >= '2026-08-30T16:00:00.000Z'
    ORDER BY m.created_at DESC
  `);
  console.log("Recent audio messages since 16:00 UTC:");
  console.table(msgRes.rows);

  await client.end();
}
run();
