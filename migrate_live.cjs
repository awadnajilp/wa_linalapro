const { Client } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set in environment / .env");
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database successfully!");

    console.log("Adding columns to channels and conversations...");

    // Add inbox_ai_settings JSONB to channels
    await client.query(`
      ALTER TABLE channels ADD COLUMN IF NOT EXISTS inbox_ai_settings JSONB DEFAULT '{}';
    `);
    console.log("- Added column inbox_ai_settings to channels");

    // Add ai_enabled BOOLEAN to conversations
    await client.query(`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;
    `);
    console.log("- Added column ai_enabled to conversations");

    // Add ai_settings JSONB to conversations
    await client.query(`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}';
    `);
    console.log("- Added column ai_settings to conversations");

    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
