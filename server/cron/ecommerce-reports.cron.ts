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
}
