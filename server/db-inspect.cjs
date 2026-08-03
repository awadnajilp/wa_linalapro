const { Client } = require('pg');

async function run() {
  const connectionString = "postgresql://walinalapro:walinalapro123@localhost:5432/walinalapro";
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to database.");

  const channelId = "8c080088-ba52-476d-8fb3-f8b44ebdbed8";

  console.log("\n--- CHANNEL ---");
  const channelRes = await client.query('SELECT * FROM channels WHERE id = $1', [channelId]);
  console.log(JSON.stringify(channelRes.rows, null, 2));

  console.log("\n--- AI SETTINGS (AI_SETTINGS TABLE) ---");
  const aiSettingsRes = await client.query('SELECT * FROM ai_settings WHERE channel_id = $1', [channelId]);
  console.log(JSON.stringify(aiSettingsRes.rows, null, 2));

  console.log("\n--- GLOBAL ACTIVE AI SETTINGS ---");
  const globalAiSettingsRes = await client.query('SELECT * FROM ai_settings WHERE is_active = true');
  console.log(JSON.stringify(globalAiSettingsRes.rows, null, 2));

  console.log("\n--- AI PROFILES ---");
  const aiProfilesRes = await client.query('SELECT * FROM ai_profiles WHERE channel_id = $1', [channelId]);
  console.log(JSON.stringify(aiProfilesRes.rows, null, 2));

  await client.end();
  console.log("\nInspection complete.");
}

run().catch(console.error);
