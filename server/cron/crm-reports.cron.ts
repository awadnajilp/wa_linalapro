import cron from "node-cron";
import { sendCrmPerformanceReports } from "../services/crm-reports.service";

export function startCrmReportsCron() {
  console.log("⏰ [CRM Reports] Starting daily and weekly performance summary report jobs...");

  // 1. Daily Performance Report: Runs every day at 8:00 PM (20:00)
  cron.schedule("0 20 * * *", async () => {
    try {
      console.log("📊 [CRM Reports] Running scheduled daily summary reports...");
      await sendCrmPerformanceReports("daily");
    } catch (error) {
      console.error("[CRM Reports] Error running daily performance reports:", error);
    }
  });

  // 2. Weekly Performance Report: Runs every Sunday at 8:00 PM (20:00)
  cron.schedule("0 20 * * 0", async () => {
    try {
      console.log("📊 [CRM Reports] Running scheduled weekly summary reports...");
      await sendCrmPerformanceReports("weekly");
    } catch (error) {
      console.error("[CRM Reports] Error running weekly performance reports:", error);
    }
  });
}
