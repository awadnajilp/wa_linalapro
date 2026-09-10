const pg = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
async function main() {
  await client.connect();
  const res = await client.query("SELECT id, data FROM automation_nodes WHERE automation_id = 'd2b1f9d1-adfb-42b2-8e3b-d5901a1be98a' AND type = 'ai_agent';");
  if (res.rows[0]) {
    const node = res.rows[0];
    const data = node.data;
    data.aiLlmProvider = 'groq';
    data.aiModel = 'llama-3.1-70b-versatile';
    await client.query("UPDATE automation_nodes SET data = \x241 WHERE id = \x242;", [JSON.stringify(data), node.id]);
    console.log('Successfully forced AI Agent node to Groq in DB!');
  } else {
    console.log('No AI Agent node.');
  }
  await client.end();
}
main();
