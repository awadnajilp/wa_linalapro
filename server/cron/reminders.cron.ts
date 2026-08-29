import cron from "node-cron";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, or, lte, sql } from "drizzle-orm";
import { WhatsAppApiService } from "../services/whatsapp-api";
import { AddonManager } from "../services/addon-manager";

export function startRemindersCron() {
  console.log("⏰ [Reminders Cron] Starting background reminders check job...");

  // Runs every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Fetch all reminders that are not yet fully completed
      const pendingReminders = await db
        .select()
        .from(schema.reminders)
        .where(
          or(
            eq(schema.reminders.status, "pending"),
            eq(schema.reminders.status, "reminded_early")
          )
        );

      for (const r of pendingReminders) {
        try {
          // Double check if reminders-module addon is still active for this tenant
          const isPluginActive = await AddonManager.isAddonActive(r.tenantId, "reminders-module");
          if (!isPluginActive) {
            continue; // Skip if they cancelled the addon
          }

          const [channel] = await db
            .select()
            .from(schema.channels)
            .where(eq(schema.channels.id, r.channelId))
            .limit(1);

          if (!channel) continue;

          const waApi = new WhatsAppApiService(channel);
          const leadTimeMs = (r.leadTimeMinutes || 15) * 60 * 1000;
          const dueTimeMs = new Date(r.dueTime).getTime();
          const nowMs = now.getTime();

          const earlyTimeMs = dueTimeMs - leadTimeMs;

          // 1. Check for Early Reminder (15 min before)
          if (r.status === "pending" && leadTimeMs > 0 && nowMs >= earlyTimeMs && nowMs < dueTimeMs) {
            console.log(`⏰ [Reminders Cron] Sending early reminder for task: "${r.title}" to ${r.contactPhone}`);
            
            const dueTimeStr = new Date(r.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            await waApi.sendDirectMessage({
              to: r.contactPhone,
              type: "text",
              text: {
                body: `⏰ *Upcoming Reminder Alert!*\n\n📝 *Task:* ${r.title}\n📅 *Scheduled Time:* At ${dueTimeStr} (in ${r.leadTimeMinutes} mins)`
              }
            });

            await db
              .update(schema.reminders)
              .set({ status: "reminded_early", updatedAt: new Date() })
              .where(eq(schema.reminders.id, r.id));
          }
          // 2. Check for Main Reminder (at the exact scheduled time)
          else if (nowMs >= dueTimeMs) {
            console.log(`🚨 [Reminders Cron] Sending main reminder for task: "${r.title}" to ${r.contactPhone}`);
            
            await waApi.sendDirectMessage({
              to: r.contactPhone,
              type: "text",
              text: {
                body: `🚨 *Reminder Alert!*\n\n📝 *Task:* ${r.title}\n⏰ *Time:* It is now time for your scheduled reminder!`
              }
            });

            await db
              .update(schema.reminders)
              .set({ status: "reminded_main", updatedAt: new Date() })
              .where(eq(schema.reminders.id, r.id));
          }
        } catch (err: any) {
          console.error(`[Reminders Cron] Error processing reminder ID ${r.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("[Reminders Cron] Cron job error:", err.message);
    }
  });
}
