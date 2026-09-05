import cron from "node-cron";
import { EcommerceService } from "../services/ecommerce-service";

export function startEcommerceReportsCron() {
  console.log("⏰ [Ecommerce Reports] Starting scheduled daily orders summary report cron (runs every minute)...");

  cron.schedule("* * * * *", async () => {
    try {
      await EcommerceService.checkAndRunDailyReports();
    } catch (error: any) {
      console.error("[Ecommerce Reports] Error checking scheduled daily orders report:", error?.message);
    }
  });

  console.log("🛒 [Ecommerce Recovery] Starting abandoned cart automated recovery checker (runs every 2 minutes)...");
  cron.schedule("*/2 * * * *", async () => {
    try {
      await EcommerceService.checkAndRunAbandonedCartRecovery();
    } catch (error: any) {
      console.error("[Ecommerce Recovery] Error checking abandoned cart recovery:", error?.message);
    }
  });
}
