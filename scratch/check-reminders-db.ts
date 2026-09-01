import "dotenv/config";
import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, and, or, like, desc } from "drizzle-orm";

async function main() {
  console.log("🔍 [Audit] Auditing User, Channel, and Addon Subscriptions...");

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, "awadnajilp@gmail.com"))
    .limit(1);

  if (!user) {
    console.log("❌ User awadnajilp@gmail.com not found!");
    return;
  }
  console.log(`✅ User found: ID=${user.id}, Role=${user.role}`);

  const userChannels = await db
    .select()
    .from(schema.channels)
    .where(eq(schema.channels.createdBy, user.id));

  console.log(`✅ Channels found for user (Total ${userChannels.length}):`);
  for (const c of userChannels) {
    console.log(`   - ID=${c.id} Name=${c.name} Phone=${c.phoneNumber} Platform=${c.platform}`);
  }

  const channel = userChannels.find(c => c.name === "SKYSECRETARY KSA CLOUD" || c.name === "SkySecretart") || userChannels[0];
  if (!channel) {
    console.log("❌ No channel found!");
    return;
  }
  console.log(`🎯 Using channel: ID=${channel.id}, Phone=${channel.phoneNumber}`);

  // Fetch subscriptions
  const [addon] = await db
    .select()
    .from(schema.addons)
    .where(eq(schema.addons.slug, "reminders-module"))
    .limit(1);

  if (!addon) {
    console.log("❌ Reminders Module addon registration not found in addons table!");
  } else {
    console.log(`✅ Addon table record found: ID=${addon.id}, Slug=${addon.slug}`);

    const [sub] = await db
      .select()
      .from(schema.tenantAddons)
      .where(
        and(
          eq(schema.tenantAddons.tenantId, user.id),
          eq(schema.tenantAddons.addonId, addon.id)
        )
      )
      .limit(1);

    if (!sub) {
      console.log("❌ Tenant has NO active subscription for reminders-module!");
    } else {
      console.log(`✅ Subscription record found: Status=${sub.status}, PurchaseType=${sub.purchaseType}`);
    }
  }

  // Fetch Config
  const [config] = await db
    .select()
    .from(schema.reminderConfigs)
    .where(eq(schema.reminderConfigs.channelId, channel.id))
    .limit(1);

  if (!config) {
    console.log("❌ No reminder_configs record found for this channel!");
  } else {
    console.log(`✅ Config found: Trigger=${config.triggerKeyword}, Todo=${config.todoKeyword}, Active=${config.isActive}`);
  }

  // Fetch sessions
  const sessions = await db
    .select()
    .from(schema.reminderSessions)
    .limit(10);
  console.log(`📋 Active Reminder Sessions (Total ${sessions.length}):`, sessions);

  // Fetch reminders
  const list = await db
    .select()
    .from(schema.reminders)
    .orderBy(desc(schema.reminders.createdAt))
    .limit(5);
  console.log(`⏰ Recent Reminders (Total ${list.length}):`, list);

  // Fetch recent messages matching timezone
  const matchMsgs = await db
    .select()
    .from(schema.messages)
    .where(
      or(
        like(schema.messages.content, "%timezone%"),
        like(schema.messages.content, "%Tz:%"),
        like(schema.messages.content, "%Timezone updated%")
      )
    )
    .orderBy(desc(schema.messages.createdAt))
    .limit(30);
  console.log("💬 Matching timezone messages:");
  for (const m of matchMsgs) {
    console.log(`   - [${m.createdAt.toISOString()}] Content="${m.content}" Direction=${m.direction} Contact=${m.from || m.to}`);
  }

  // Fetch contacts with timezoneOffset variables set
  const allContacts = await db
    .select()
    .from(schema.contacts)
    .limit(100);
  console.log("👥 Contacts with timezoneOffset set:");
  let foundAny = false;
  for (const c of allContacts) {
    if (c.variables && (c.variables as any).timezoneOffset !== undefined) {
      console.log(`   - ID=${c.id} Phone=${c.phone} Name=${c.name} Offset=${(c.variables as any).timezoneOffset}`);
      foundAny = true;
    }
  }
  if (!foundAny) {
    console.log("   (No contacts have timezoneOffset set in their variables field)");
  }
}

main().catch(console.error);
