import { exec } from 'child_process';
import pg from 'pg';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '/var/www/wa.linalapro.com/.env' });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

function runCurl(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve(stdout.substring(0, 800));
    });
  });
}

async function run() {
  await client.connect();
  // We use SKYSECRETARY channel which has the valid System User token
  const res = await client.query("SELECT \"access_token\" FROM channels WHERE id = '48b128d7-6662-4604-9b5f-a61756c6a9f3'");
  const token = res.rows[0].access_token;
  await client.end();

  // We need to fetch a fresh media URL to avoid expiration or consumption issues
  // Let's use a recent audio media ID
  const mediaId = '28288986894030708';
  
  // 1. Test unauthenticated request
  try {
    const metaUrl = `https://graph.facebook.com/v20.0/${mediaId}`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await metaRes.json();
    const downloadUrl = data.url;
    console.log("Fresh Download URL:", downloadUrl);

    if (downloadUrl) {
      console.log("\n--- TEST 1: Unauthenticated GET request ---");
      const out1 = await runCurl(`curl -i -H "User-Agent: curl/7.64.1" "${downloadUrl}"`);
      console.log(out1);
    }
  } catch (e) {
    console.error("Test 1 failed:", e.message);
  }

  // 2. Fetch another fresh URL and test Bearer header
  try {
    const metaUrl = `https://graph.facebook.com/v20.0/${mediaId}`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await metaRes.json();
    const downloadUrl = data.url;

    if (downloadUrl) {
      console.log("\n--- TEST 2: Bearer Header GET request ---");
      const out2 = await runCurl(`curl -i -H "Authorization: Bearer ${token}" -H "User-Agent: curl/7.64.1" "${downloadUrl}"`);
      console.log(out2);
    }
  } catch (e) {
    console.error("Test 2 failed:", e.message);
  }

  // 3. Fetch another fresh URL and test Query Parameter
  try {
    const metaUrl = `https://graph.facebook.com/v20.0/${mediaId}`;
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await metaRes.json();
    const downloadUrl = data.url;

    if (downloadUrl) {
      console.log("\n--- TEST 3: Query Parameter GET request ---");
      const out3 = await runCurl(`curl -i -H "User-Agent: curl/7.64.1" "${downloadUrl}&access_token=${token}"`);
      console.log(out3);
    }
  } catch (e) {
    console.error("Test 3 failed:", e.message);
  }
}
run();
