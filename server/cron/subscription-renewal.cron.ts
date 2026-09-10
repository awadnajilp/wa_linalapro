import cron from "node-cron";
import { db } from "../db";
import { subscriptions, users, plans } from "@shared/schema";
import { eq, and, or, gte, lte, lt, sql } from "drizzle-orm";
import { sendSubscriptionRenewalEmail } from "../services/email.service";

export async function runSubscriptionRenewalCron(): Promise<{
  checkedCount: number;
  sentCount: number;
  errorCount: number;
}> {
  console.log("⏰ [Subscription Renewal Cron] Checking subscriptions for renewal reminders...");

  let checkedCount = 0;
  let sentCount = 0;
  let errorCount = 0;

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // Fetch active or recently expired subscriptions that expire within 7 days or expired within last 3 days (excluding already renewed users)
    const candidates = await db
      .select({
        subscription: subscriptions,
        user: users,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          or(
            // Expiring within 7 days
            and(
              eq(subscriptions.status, "active"),
              gte(subscriptions.endDate, now),
              lte(subscriptions.endDate, sevenDaysFromNow)
            ),
            // Recently expired (past 3 days) - ONLY if user has NOT renewed
            and(
              or(eq(subscriptions.status, "expired"), eq(subscriptions.status, "active")),
              lt(subscriptions.endDate, now),
              gte(subscriptions.endDate, threeDaysAgo),
              sql`NOT EXISTS (
                SELECT 1 FROM subscriptions s_act
                WHERE s_act.user_id = ${subscriptions.userId}
                AND s_act.status = 'active'
                AND s_act.end_date >= ${now}
              )`
            )
          ),
          // Ensure we only process the latest subscription record per user
          sql`NOT EXISTS (
            SELECT 1 FROM subscriptions s_new
            WHERE s_new.user_id = ${subscriptions.userId}
            AND s_new.created_at > ${subscriptions.createdAt}
          )`
        )
      );

    checkedCount = candidates.length;
    console.log(`[Subscription Renewal Cron] Found ${checkedCount} subscriptions eligible for reminder check.`);

    for (const item of candidates) {
      if (!item.user || !item.user.email || !item.subscription) continue;

      const endDate = new Date(item.subscription.endDate);
      const msDiff = endDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      const isExpired = daysLeft <= 0 || item.subscription.status === "expired";

      const planName = item.plan?.name || (item.subscription.planData as any)?.name || "Subscription Plan";

      try {
        const result = await sendSubscriptionRenewalEmail({
          toEmail: item.user.email,
          username: item.user.username || item.user.firstName || "Customer",
          planName,
          endDate: item.subscription.endDate.toISOString(),
          daysLeft: Math.max(0, daysLeft),
          isExpired,
        });

        if (result.success) {
          sentCount++;
          console.log(`[Subscription Renewal Cron] Sent reminder to ${item.user.email} for ${planName} (days left: ${daysLeft})`);
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
        console.error(`[Subscription Renewal Cron] Failed to send email to ${item.user.email}:`, err);
      }
    }
  } catch (error) {
    console.error("[Subscription Renewal Cron] Error executing renewal reminder check:", error);
  }

  return { checkedCount, sentCount, errorCount };
}

export function startSubscriptionRenewalCron() {
  console.log("⏰ [Subscription Renewal Cron] Initializing daily renewal reminder cron (09:00 AM daily)...");

  // Runs once every day at 09:00 AM
  cron.schedule("0 9 * * *", async () => {
    try {
      await runSubscriptionRenewalCron();
    } catch (err: any) {
      console.error("[Subscription Renewal Cron] Error in daily schedule:", err.message);
    }
  });
}
