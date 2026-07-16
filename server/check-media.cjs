const { Client } = require('pg');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

async function test() {
  const client = new Client({ connectionString: "postgresql://walinalapro:walinalapro123@localhost:5432/walinalapro" });
  await client.connect();
  const res = await client.query('SELECT * FROM storage_settings WHERE is_active = true LIMIT 1');
  const config = res.rows[0];
  await client.end();
  
  if (!config) {
    console.error("No active storage settings found!");
    return;
  }
  
  let cleanEndpoint = config.endpoint.trim().replace(/\/$/, "");
  
  const s3 = new S3Client({
    endpoint: cleanEndpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.access_key,
      secretAccessKey: config.secret_key,
    },
    forcePathStyle: false,
    maxAttempts: 1,
  });
  
  const key = "uploads/7a3ccf45-f497-472f-810b-7d9d3bdaf2f9/1784174846482-voice-note-1784174845699.ogg";
  console.log("Downloading", key, "from bucket", config.space_name);
  
  const response = await s3.send(new GetObjectCommand({ Bucket: config.space_name, Key: key }));
  const array = await response.Body.transformToByteArray();
  fs.writeFileSync('downloaded_test.ogg', Buffer.from(array));
  console.log("Saved downloaded_test.ogg, size:", array.length);
}
test().catch(console.error);
