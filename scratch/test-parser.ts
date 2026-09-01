import "dotenv/config";
import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { ReminderAIService } from "../server/services/reminder-ai-service";

async function main() {
  const channelId = "a5566d97-5557-4773-a9c4-a5fc7668d973";
  const [channelRow] = await db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId))
    .limit(1);

  if (!channelRow) {
    console.log("❌ Channel row not found!");
    return;
  }

  // Update contact offset in local DB to 3 (KSA) for testing
  const senderPhone = "919633348491";
  const [existingContact] = await db
    .select()
    .from(schema.contacts)
    .where(and(eq(schema.contacts.channelId, channelId), eq(schema.contacts.phone, senderPhone)))
    .limit(1);

  if (existingContact) {
    console.log(`Setting local contact timezone to +3 (KSA)...`);
    const updatedVars = { ...(existingContact.variables || {}), timezoneOffset: "3" };
    await db
      .update(schema.contacts)
      .set({ variables: updatedVars })
      .where(eq(schema.contacts.id, existingContact.id));
  }

  const testInputs = [
    "11.12pm",
    "11:12pm",
    "at 11.12pm",
    "on 11.12pm"
  ];



  console.log("=== Testing LLM Date/Time Parsing (Timezone-Aware) ===");
  for (const input of testInputs) {
    const combinedText = `Remind me to call John on ${input}`;
    console.log(`\nInput: "${input}"`);
    console.log(`Combined text sent to LLM: "${combinedText}"`);
    
    const parsed = await ReminderAIService.parseReminder(
      channelRow.createdBy!,
      channelId,
      combinedText,
      senderPhone
    );

    console.log("Parsed result:", JSON.stringify(parsed, null, 2));
  }
}

main().catch(console.error);
