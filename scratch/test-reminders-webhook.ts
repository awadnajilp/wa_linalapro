import "dotenv/config";
import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { WebhookHandler } from "../server/services/webhook-handler";

async function main() {
  const channelId = "a5566d97-5557-4773-a9c4-a5fc7668d973";
  const content = "2pm 01/08";
  const fromPhone = "966564955765";

  const [channelRow] = await db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.id, channelId))
    .limit(1);

  if (!channelRow) {
    console.log("❌ Channel row not found!");
    return;
  }

  // Find or create contact
  let [contact] = await db
    .select()
    .from(schema.contacts)
    .where(and(eq(schema.contacts.channelId, channelId), eq(schema.contacts.phone, fromPhone)))
    .limit(1);

  if (!contact) {
    console.log("Creating test contact...");
    [contact] = await db.insert(schema.contacts).values({
      tenantId: channelRow.createdBy,
      channelId: channelId,
      name: "Test User",
      phone: fromPhone,
    }).returning();
  }

  // Find or create conversation
  let [conversation] = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.channelId, channelId), eq(schema.conversations.contactPhone, fromPhone)))
    .limit(1);

  if (!conversation) {
    console.log("Creating test conversation...");
    [conversation] = await db.insert(schema.conversations).values({
      tenantId: channelRow.createdBy,
      channelId: channelId,
      contactId: contact.id,
      contactPhone: fromPhone,
      status: "open",
    }).returning();
  }

  // Ensure there's a fresh reminder session in "waiting_for_when" state
  await db.delete(schema.reminderSessions).where(eq(schema.reminderSessions.conversationId, conversation.id));
  
  console.log("Creating active reminder session in waiting_for_when state...");
  await db.insert(schema.reminderSessions).values({
    conversationId: conversation.id,
    status: "waiting_for_when",
    title: "Buy milk"
  });

  const message = {
    from: fromPhone,
    type: "text",
    text: { body: content }
  };

  console.log(`🧪 Simulating interceptReminders execution for input: "${content}"...`);
  console.log("-----------------------------------------");

  // Call WebhookHandler.interceptReminders
  const handled = await WebhookHandler.interceptReminders(
    channelId,
    [conversation],
    [contact],
    message,
    content,
    false,
    channelRow
  );

  console.log("-----------------------------------------");
  console.log(`🤖 Handled result: ${handled}`);
}

main().catch(console.error);
