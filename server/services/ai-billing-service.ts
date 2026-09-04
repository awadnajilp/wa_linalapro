/**
 * ============================================================
 * © 2026 Antigravity - AI Billing & Usage Ledger Service
 * ============================================================
 */

import { db } from "../db";
import {
  aiUsageLogs,
  wallets,
  walletTransactions,
  users,
  panelConfig,
} from "@shared/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

export interface AiModelPricing {
  llm: Record<string, { inputPer1kUSD: number; outputPer1kUSD: number }>;
  stt: Record<string, { perMinuteUSD: number }>;
  tts: Record<string, { per1kCharsUSD: number }>;
}

export const AI_UNIT_PRICING: AiModelPricing = {
  llm: {
    // OpenAI models
    "gpt-4o-mini": { inputPer1kUSD: 0.00015, outputPer1kUSD: 0.00060 },
    "gpt-4o": { inputPer1kUSD: 0.00250, outputPer1kUSD: 0.01000 },
    "gpt-3.5-turbo": { inputPer1kUSD: 0.00050, outputPer1kUSD: 0.00150 },
    // Groq models
    "llama-3.3-70b-versatile": { inputPer1kUSD: 0.00059, outputPer1kUSD: 0.00079 },
    "llama-3.1-8b-instant": { inputPer1kUSD: 0.00005, outputPer1kUSD: 0.00008 },
    "mixtral-8x7b-32768": { inputPer1kUSD: 0.00024, outputPer1kUSD: 0.00024 },
    // Sarvam models
    "sarvam-105b-conversations": { inputPer1kUSD: 0.00020, outputPer1kUSD: 0.00020 },
    "sarvam-2b": { inputPer1kUSD: 0.00010, outputPer1kUSD: 0.00010 },
    // Default fallback
    default: { inputPer1kUSD: 0.00020, outputPer1kUSD: 0.00060 },
  },
  stt: {
    // Audio Speech-to-Text ($ per minute of audio)
    sarvam: { perMinuteUSD: 0.0030 }, // ₹0.25 / min (~$0.003)
    groq: { perMinuteUSD: 0.0018 },   // Groq Whisper-large-v3
    openai: { perMinuteUSD: 0.0060 }, // OpenAI Whisper-1 ($0.006/min)
    elevenlabs: { perMinuteUSD: 0.0100 },
    default: { perMinuteUSD: 0.0030 },
  },
  tts: {
    // Text-to-Speech ($ per 1,000 characters)
    sarvam: { per1kCharsUSD: 0.0036 }, // Bulbul:v3 (~₹0.30 / 1k chars)
    openai: { per1kCharsUSD: 0.0150 }, // OpenAI tts-1 ($0.015 / 1k chars)
    elevenlabs: { per1kCharsUSD: 0.0300 }, // ElevenLabs multilingual ($0.030 / 1k chars)
    groq: { per1kCharsUSD: 0.0050 },
    default: { per1kCharsUSD: 0.0050 },
  },
};

export class AiBillingService {
  /**
   * Fetch SuperAdmin Platform AI Keys and Margin Percentage
   */
  static async getPlatformAiConfig() {
    const [pConfig] = await db.select().from(panelConfig).limit(1);
    const marginPercent = parseFloat(
      pConfig?.adminAiMarginPercent ? String(pConfig.adminAiMarginPercent) : "70"
    );

    return {
      openaiApiKey: pConfig?.adminOpenaiApiKey || process.env.OPENAI_API_KEY || "",
      sarvamApiKey: pConfig?.adminSarvamApiKey || process.env.SARVAM_API_KEY || "",
      groqApiKey: pConfig?.adminGroqApiKey || process.env.GROQ_API_KEY || "",
      elevenlabsApiKey: pConfig?.adminElevenlabsApiKey || process.env.ELEVENLABS_API_KEY || "",
      marginPercent: isNaN(marginPercent) ? 70 : marginPercent,
      walletSettings: pConfig?.walletSettings || {},
      currency: pConfig?.currency || "INR",
    };
  }

  /**
   * Resolve API credentials according to apiKeySource setting ("own_key" vs "admin_key")
   */
  static async resolveAiCredentials(
    tenantId: string,
    apiKeySource: string = "own_key"
  ) {
    const isPlatformKey = apiKeySource === "admin_key";
    const platformConfig = await this.getPlatformAiConfig();

    const [ownerUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, tenantId))
      .limit(1);

    if (isPlatformKey) {
      return {
        isPlatformKey: true,
        apiKeySource: "admin_key",
        marginPercent: platformConfig.marginPercent,
        openaiApiKey: platformConfig.openaiApiKey,
        sarvamApiKey: platformConfig.sarvamApiKey,
        groqApiKey: platformConfig.groqApiKey,
        elevenlabsApiKey: platformConfig.elevenlabsApiKey,
        currency: platformConfig.currency,
      };
    }

    // "own_key": use tenant user keys with fallback to platform keys if user keys missing
    return {
      isPlatformKey: false,
      apiKeySource: "own_key",
      marginPercent: 0,
      openaiApiKey: ownerUser?.openaiApiKey || platformConfig.openaiApiKey || "",
      sarvamApiKey: ownerUser?.sarvamApiKey || platformConfig.sarvamApiKey || "",
      groqApiKey: ownerUser?.groqApiKey || platformConfig.groqApiKey || "",
      elevenlabsApiKey: ownerUser?.elevenlabsApiKey || platformConfig.elevenlabsApiKey || "",
      currency: platformConfig.currency,
    };
  }

  /**
   * Check if tenant has non-zero wallet balance when using platform admin key
   */
  static async checkTenantWallet(tenantId: string): Promise<{ hasBalance: boolean; balance: number; currency: string }> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, tenantId)).limit(1);
    if (!wallet) {
      return { hasBalance: false, balance: 0, currency: "INR" };
    }
    const bal = parseFloat(wallet.balance || "0");
    return { hasBalance: bal > 0, balance: bal, currency: wallet.currency };
  }

  /**
   * Calculate unit cost in USD and billed amount in tenant's wallet currency with admin margin (+70%)
   */
  static calculateCost({
    serviceType,
    provider,
    model,
    inputUnits = 0,
    outputUnits = 0,
    marginPercent = 70,
    walletCurrency = "INR",
    exchangeRates = {},
  }: {
    serviceType: "llm" | "stt" | "tts";
    provider: string;
    model?: string;
    inputUnits?: number;
    outputUnits?: number;
    marginPercent?: number;
    walletCurrency?: string;
    exchangeRates?: Record<string, number>;
  }) {
    let actualCostUSD = 0;
    const provKey = provider?.toLowerCase() || "openai";
    const modKey = model?.toLowerCase() || "default";

    if (serviceType === "llm") {
      const pricing =
        AI_UNIT_PRICING.llm[modKey] ||
        AI_UNIT_PRICING.llm[provKey] ||
        AI_UNIT_PRICING.llm.default;

      const inputCost = (inputUnits / 1000) * pricing.inputPer1kUSD;
      const outputCost = (outputUnits / 1000) * pricing.outputPer1kUSD;
      actualCostUSD = inputCost + outputCost;
    } else if (serviceType === "stt") {
      const pricing =
        AI_UNIT_PRICING.stt[provKey] || AI_UNIT_PRICING.stt.default;
      // inputUnits is duration in seconds
      const minutes = Math.max(inputUnits / 60, 0.1); // minimum 6 seconds billable
      actualCostUSD = minutes * pricing.perMinuteUSD;
    } else if (serviceType === "tts") {
      const pricing =
        AI_UNIT_PRICING.tts[provKey] || AI_UNIT_PRICING.tts.default;
      // inputUnits is characters count
      actualCostUSD = (inputUnits / 1000) * pricing.per1kCharsUSD;
    }

    // Apply Admin Platform Margin (e.g. 70%)
    const marginAmountUSD = actualCostUSD * (marginPercent / 100);
    const billedUSD = actualCostUSD + marginAmountUSD;

    // Currency exchange rates
    const defaultRates: Record<string, number> = {
      USD: 1.0,
      INR: 95.70,
      AED: 3.67,
      SAR: 3.75,
      GBP: 0.78,
      EUR: 0.92,
      KWD: 0.31,
      BHD: 0.38,
      OMR: 0.38,
      QAR: 3.64,
      EGP: 48.0,
    };
    const rate =
      exchangeRates[walletCurrency] !== undefined
        ? exchangeRates[walletCurrency]
        : defaultRates[walletCurrency] || 1.0;

    const billedAmountWallet = billedUSD * rate;

    return {
      actualCostUSD: parseFloat(actualCostUSD.toFixed(6)),
      billedUSD: parseFloat(billedUSD.toFixed(6)),
      billedAmountWallet: parseFloat(billedAmountWallet.toFixed(4)),
      marginPercent,
      walletCurrency,
    };
  }

  /**
   * Record AI Usage and Debit Tenant's Wallet if using Admin Key
   */
  static async recordAndBillUsage({
    tenantId,
    channelId,
    conversationId,
    source = "ecommerce",
    serviceType,
    provider,
    model,
    inputUnits = 0,
    outputUnits = 0,
    apiKeySource = "own_key",
    metadata = {},
  }: {
    tenantId: string;
    channelId?: string | null;
    conversationId?: string | null;
    source?: string;
    serviceType: "llm" | "stt" | "tts";
    provider: string;
    model?: string;
    inputUnits?: number;
    outputUnits?: number;
    apiKeySource?: string;
    metadata?: Record<string, any>;
  }): Promise<{ billed: boolean; amount: number; currency: string; logId: string }> {
    try {
      const isPlatformKey = apiKeySource === "admin_key";
      const platformConfig = await this.getPlatformAiConfig();

      // Find or create tenant wallet
      let [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, tenantId))
        .limit(1);

      if (!wallet) {
        const [createdWallet] = await db
          .insert(wallets)
          .values({
            userId: tenantId,
            balance: "0.0000",
            currency: platformConfig.currency || "INR",
          })
          .returning();
        wallet = createdWallet;
      }

      const walletCurrency = wallet.currency || "INR";
      const exchangeRates =
        (platformConfig.walletSettings as any)?.exchangeRates || {};

      const costCalc = this.calculateCost({
        serviceType,
        provider,
        model,
        inputUnits,
        outputUnits,
        marginPercent: isPlatformKey ? platformConfig.marginPercent : 0,
        walletCurrency,
        exchangeRates,
      });

      const billAmount = isPlatformKey ? costCalc.billedAmountWallet : 0;
      let billedToWallet = false;

      // If using admin key and cost > 0, deduct from tenant's wallet
      if (isPlatformKey && billAmount > 0) {
        const currentBalance = parseFloat(wallet.balance || "0");
        const newBalance = parseFloat((currentBalance - billAmount).toFixed(4));

        await db
          .update(wallets)
          .set({
            balance: newBalance.toFixed(4),
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));

        // Create transaction record
        await db.insert(walletTransactions).values({
          userId: tenantId,
          amount: billAmount.toFixed(4),
          currency: walletCurrency,
          type: "debit",
          paymentMethod: "manual_admin",
          status: "completed",
          description: `Platform AI Usage: ${serviceType.toUpperCase()} (${provider}${model ? " / " + model : ""}) [Units: in ${inputUnits}, out ${outputUnits}]`,
          verifiedAt: new Date(),
        });

        billedToWallet = true;
      }

      // Insert into ai_usage_logs
      const [log] = await db
        .insert(aiUsageLogs)
        .values({
          tenantId,
          channelId: channelId || null,
          conversationId: conversationId || null,
          source,
          serviceType,
          provider,
          model: model || null,
          inputUnits,
          outputUnits,
          actualCostUSD: String(costCalc.actualCostUSD),
          billedAmount: String(billAmount),
          currency: walletCurrency,
          billedToWallet,
          metadata,
        })
        .returning();

      return {
        billed: billedToWallet,
        amount: billAmount,
        currency: walletCurrency,
        logId: log.id,
      };
    } catch (err: any) {
      console.error("[AiBillingService.recordAndBillUsage Error]", err.message);
      return { billed: false, amount: 0, currency: "INR", logId: "" };
    }
  }

  /**
   * Get Aggregated AI Usage Stats and Daily Breakdown for Store
   */
  static async getDailyUsageReport(
    tenantId: string,
    channelId?: string,
    days: number = 30
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const conditions = [
      eq(aiUsageLogs.tenantId, tenantId),
      gte(aiUsageLogs.createdAt, startDate),
    ];

    if (channelId) {
      conditions.push(eq(aiUsageLogs.channelId, channelId));
    }

    const logs = await db
      .select()
      .from(aiUsageLogs)
      .where(and(...conditions))
      .orderBy(desc(aiUsageLogs.createdAt));

    // Summary totals
    let totalMessages = 0;
    const conversationSet = new Set<string>();
    let totalLlmTokens = 0;
    let totalSttSeconds = 0;
    let totalTtsChars = 0;
    let totalBilledAmount = 0;
    let defaultCurrency = "INR";

    // Daily breakdown map
    const dailyMap: Record<
      string,
      {
        date: string;
        totalMessages: number;
        conversations: Set<string>;
        llmTokens: number;
        sttSeconds: number;
        ttsChars: number;
        billedAmount: number;
        currency: string;
      }
    > = {};

    for (const log of logs) {
      totalMessages++;
      if (log.conversationId) conversationSet.add(log.conversationId);
      if (log.currency) defaultCurrency = log.currency;

      const dateStr = log.createdAt
        ? new Date(log.createdAt).toISOString().split("T")[0]
        : "Unknown";

      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          totalMessages: 0,
          conversations: new Set<string>(),
          llmTokens: 0,
          sttSeconds: 0,
          ttsChars: 0,
          billedAmount: 0,
          currency: log.currency || "INR",
        };
      }

      const dayObj = dailyMap[dateStr];
      dayObj.totalMessages++;
      if (log.conversationId) dayObj.conversations.add(log.conversationId);

      const billed = parseFloat(log.billedAmount ? String(log.billedAmount) : "0");
      totalBilledAmount += billed;
      dayObj.billedAmount += billed;

      if (log.serviceType === "llm") {
        const tokens = (log.inputUnits || 0) + (log.outputUnits || 0);
        totalLlmTokens += tokens;
        dayObj.llmTokens += tokens;
      } else if (log.serviceType === "stt") {
        const sec = log.inputUnits || 0;
        totalSttSeconds += sec;
        dayObj.sttSeconds += sec;
      } else if (log.serviceType === "tts") {
        const chars = log.inputUnits || 0;
        totalTtsChars += chars;
        dayObj.ttsChars += chars;
      }
    }

    const dailyBreakdown = Object.values(dailyMap)
      .map((d) => ({
        date: d.date,
        totalMessages: d.totalMessages,
        totalChats: d.conversations.size,
        llmTokens: d.llmTokens,
        sttMinutes: parseFloat((d.sttSeconds / 60).toFixed(2)),
        ttsChars: d.ttsChars,
        billedAmount: parseFloat(d.billedAmount.toFixed(4)),
        currency: d.currency,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Get tenant wallet balance
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, tenantId))
      .limit(1);

    return {
      summary: {
        totalMessages,
        totalChats: conversationSet.size,
        totalLlmTokens,
        totalSttMinutes: parseFloat((totalSttSeconds / 60).toFixed(2)),
        totalTtsChars,
        totalBilledAmount: parseFloat(totalBilledAmount.toFixed(4)),
        currency: wallet?.currency || defaultCurrency,
        walletBalance: parseFloat(wallet?.balance || "0.0000"),
      },
      dailyBreakdown,
    };
  }
}
