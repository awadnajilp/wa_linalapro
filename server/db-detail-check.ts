import { db } from "/Users/awadnejil/Desktop/wa.linala/code/server/db";
import * as schema from "/Users/awadnejil/Desktop/wa.linala/code/shared/schema";

async function run() {
  console.log("=== AI SETTINGS DETAIL ===");
  const aiSettings = await db.select().from(schema.aiSettings);
  aiSettings.forEach(a => {
    console.log({
      id: a.id,
      channelId: a.channelId,
      provider: a.provider,
      model: a.model,
      endpoint: a.endpoint,
      isActive: a.isActive,
      apiKeyLength: a.apiKey?.length
    });
  });

  console.log("\n=== TRAINING SOURCES DETAIL ===");
  const sources = await db.select().from(schema.trainingSources);
  sources.forEach(src => {
    console.log({
      id: src.id,
      name: src.name,
      status: src.status,
      errorMessage: src.errorMessage
    });
  });
}

run().catch(console.error).finally(() => process.exit(0));
