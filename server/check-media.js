const { createDOClient } = require('./config/digitalOceanConfig');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

async function test() {
  const doClient = await createDOClient();
  const s3 = doClient.s3;
  const bucket = doClient.bucket;
  
  const key = "uploads/7a3ccf45-f497-472f-810b-7d9d3bdaf2f9/1784174846482-voice-note-1784174845699.ogg";
  console.log("Downloading", key);
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const array = await response.Body.transformToByteArray();
  fs.writeFileSync('downloaded_test.ogg', Buffer.from(array));
  console.log("Saved downloaded_test.ogg, size:", array.length);
}
test().catch(console.error);
