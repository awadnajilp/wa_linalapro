import "dotenv/config";
import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const userEmail = "awadnajilp@gmail.com";
  const channelName = "SkySecretart";

  // Find user
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, userEmail)).limit(1);
  if (!user) {
    console.log(`❌ User ${userEmail} not found!`);
    return;
  }
  
  // Find channel
  const [channel] = await db.select().from(schema.channels).where(eq(schema.channels.name, channelName)).limit(1);
  if (!channel) {
    console.log(`❌ Channel ${channelName} not found!`);
    return;
  }

  // Find addon
  const [addon] = await db.select().from(schema.addons).where(eq(schema.addons.slug, "reminders-module")).limit(1);
  if (!addon) {
    console.log(`❌ Addon reminders-module not found!`);
    return;
  }

  // Check subscription
  const [sub] = await db.select().from(schema.tenantAddons).where(
    and(
      eq(schema.tenantAddons.tenantId, user.id),
      eq(schema.tenantAddons.addonId, addon.id)
    )
  ).limit(1);

  if (!sub) {
    console.log("Adding active subscription with purchaseType='flow'...");
    await db.insert(schema.tenantAddons).values({
      tenantId: user.id,
      addonId: addon.id,
      status: "active",
      purchaseType: "flow",
    });
  } else {
    console.log("Updating subscription to status='active' and purchaseType='flow'...");
    await db.update(schema.tenantAddons).set({
      status: "active",
      purchaseType: "flow"
    }).where(eq(schema.tenantAddons.id, sub.id));
  }

  // Check config
  const [config] = await db.select().from(schema.reminderConfigs).where(eq(schema.reminderConfigs.channelId, channel.id)).limit(1);
  if (!config) {
    console.log("Adding reminder config...");
    await db.insert(schema.reminderConfigs).values({
      tenantId: user.id,
      channelId: channel.id,
      triggerKeyword: "remind",
      todoKeyword: "todo",
      defaultLeadTimeMinutes: 15,
      isActive: true
    });
  } else {
    console.log("Updating reminder config...");
    await db.update(schema.reminderConfigs).set({
      isActive: true,
      triggerKeyword: "remind",
      todoKeyword: "todo"
    }).where(eq(schema.reminderConfigs.id, config.id));
  }

  console.log("✅ Reminders addon and config set up successfully!");
}

main().catch(console.error);
