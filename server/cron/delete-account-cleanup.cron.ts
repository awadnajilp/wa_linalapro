import cron from "node-cron";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq, and, lte } from "drizzle-orm";

export function startDeleteAccountCleanupCron() {
  console.log("⏰ [Delete Account Cleanup] Starting auto-delete cleanup job...");

  // Runs once a day at midnight (00:00)
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("🧹 [Delete Account Cleanup] Running auto-delete cleanup for accounts soft-deleted > 30 days ago...");

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Permanently delete user records soft-deleted more than 30 days ago
      await db
        .delete(users)
        .where(
          and(
            eq(users.status, "deleted"),
            lte(users.updatedAt, thirtyDaysAgo)
          )
        );

      console.log("🧹 [Delete Account Cleanup] Cleanup completed successfully.");
    } catch (error) {
      console.error("[Delete Account Cleanup] Error during cleanup:", error);
    }
  });
}
