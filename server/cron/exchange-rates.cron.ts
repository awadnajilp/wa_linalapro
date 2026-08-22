import cron from "node-cron";
import axios from "axios";
import { db } from "../db";
import { panelConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

export function startExchangeRatesCron() {
  console.log("⏰ [Exchange Rates] Starting background exchange rates sync job...");

  const fetchRates = async () => {
    try {
      console.log("🔄 [Exchange Rates] Fetching live exchange rates relative to USD...");
      const response = await axios.get("https://open.er-api.com/v6/latest/USD", { timeout: 10000 });
      if (!response.data || response.data.result !== "success" || !response.data.rates) {
        console.error("❌ [Exchange Rates] Invalid response structure from exchange rate API");
        return;
      }

      const rates = response.data.rates;
      const supportedCurrencies = ["USD", "INR", "AED", "SAR", "GBP", "EUR", "KWD", "BHD", "OMR", "QAR", "EGP"];

      // Select existing panel configs
      const configs = await db.select().from(panelConfig).limit(1);
      if (configs.length === 0) {
        console.log("⚠️ [Exchange Rates] No panel configuration found to update");
        return;
      }

      const activeConfig = configs[0];
      const settings = activeConfig.walletSettings as any || {};
      if (!settings.exchangeRates) {
        settings.exchangeRates = {};
      }

      // Map rates to supported currencies
      let updatedCount = 0;
      for (const curr of supportedCurrencies) {
        if (rates[curr] !== undefined) {
          settings.exchangeRates[curr] = parseFloat(rates[curr]);
          updatedCount++;
        }
      }

      // Update database row
      await db
        .update(panelConfig)
        .set({
          walletSettings: settings,
          updatedAt: new Date()
        })
        .where(eq(panelConfig.id, activeConfig.id));

      console.log(`✅ [Exchange Rates] Successfully updated ${updatedCount} exchange rates. INR is now ${settings.exchangeRates.INR}.`);
    } catch (error: any) {
      console.error("❌ [Exchange Rates] Error fetching exchange rates:", error.message || error);
    }
  };

  // Run once immediately on startup after 5 seconds to let server boot up completely
  setTimeout(fetchRates, 5000);

  // Schedule to run every 12 hours
  cron.schedule("0 */12 * * *", fetchRates);
}
