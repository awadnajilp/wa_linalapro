import cron from "node-cron";
import { ServiceBookingService } from "../services/service-booking-service";

export function startServiceBookingCron() {
  console.log("⏰ [Service Booking Reports] Starting scheduled daily appointments report cron (runs every minute)...");

  cron.schedule("* * * * *", async () => {
    try {
      await ServiceBookingService.checkDailyBookingsReportCron();
    } catch (error: any) {
      console.error("[Service Booking Reports] Error checking scheduled daily report:", error?.message);
    }
  });

  console.log("📅 [Service Booking Recovery] Starting abandoned booking automated recovery checker (runs every 2 minutes)...");
  cron.schedule("*/2 * * * *", async () => {
    try {
      await ServiceBookingService.checkAbandonedBookingsCron();
    } catch (error: any) {
      console.error("[Service Booking Recovery] Error checking abandoned booking recovery:", error?.message);
    }
  });
}
