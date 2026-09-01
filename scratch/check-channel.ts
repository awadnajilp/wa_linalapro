import "dotenv/config";
import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const channelId = "48b128d7-6662-4604-9b5f-a61756c6a9f3";
  const [channel] = await db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId))
    .limit(1);

  if (!channel) {
    console.log("❌ Channel not found!");
    return;
  }

  const tenantId = channel.createdBy;
  if (!tenantId) {
    console.log("❌ Channel has no creator/tenant!");
    return;
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, tenantId))
    .limit(1);

  if (!user) {
    console.log("❌ User/Tenant not found!");
    return;
  }

  console.log("=== Tenant AI Configurations ===");
  console.log(`User ID: ${user.id}`);
  console.log(`Role: ${user.role}`);
  console.log(`LLM Provider: ${user.llmProvider}`);
  console.log(`OpenAI API Key: ${user.openaiApiKey ? "Present (masked)" : "None"}`);
  console.log(`OpenAI Model: ${user.openaiModel}`);
  console.log(`Sarvam API Key: ${user.sarvamApiKey ? "Present (masked)" : "None"}`);
  console.log(`Groq API Key: ${user.groqApiKey ? "Present (masked)" : "None"}`);
  console.log(`Base URL in Env: ${process.env.OPENAI_BASE_URL || "None"}`);
}

main().catch(console.error);
