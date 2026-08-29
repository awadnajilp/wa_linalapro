import OpenAI from "openai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { AddonManager } from "./addon-manager";

export function getTimezoneLabel(offset: number): string {
  if (offset === 3) return "UTC+3 (KSA/AST)";
  if (offset === 4) return "UTC+4 (UAE/GST)";
  if (offset === 5.5) return "UTC+5.5 (India/IST)";
  if (offset >= 0) return `UTC+${offset}`;
  return `UTC${offset}`;
}

export function formatLocalTime(dueTime: Date | string, offset: number): string {
  const dateObj = typeof dueTime === "string" ? new Date(dueTime.replace(" ", "T")) : dueTime;
  const localDate = new Date(dateObj.getTime() + offset * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${localDate.getUTCFullYear()}-${pad(localDate.getUTCMonth() + 1)}-${pad(localDate.getUTCDate())}`;
  const hours = localDate.getUTCHours();
  const minutes = localDate.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${dateStr} ${displayHours}:${pad(minutes)} ${ampm}`;
}

import { eq, and, inArray } from "drizzle-orm";

export async function getContactTimezoneOffset(phone: string, channelId: string): Promise<number> {
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const possiblePhones = [phone, cleanPhone, `+${cleanPhone}`];

    const [contact] = await db
      .select()
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.channelId, channelId),
          inArray(schema.contacts.phone, possiblePhones)
        )
      )
      .limit(1);

    console.log(`[ReminderAIService] getContactTimezoneOffset: phone=${phone}, cleanPhone=${cleanPhone}, foundContact=${!!contact}, contactId=${contact?.id}, variables=${JSON.stringify(contact?.variables)}`);

    if (contact && contact.variables && (contact.variables as any).timezoneOffset !== undefined) {
      const offsetVal = parseFloat(String((contact.variables as any).timezoneOffset));
      if (!isNaN(offsetVal)) {
        console.log(`[ReminderAIService] Resolved timezoneOffset from contact variables: ${offsetVal}`);
        return offsetVal;
      }
    }
  } catch (err: any) {
    console.error("[ReminderAIService] Failed to check contact variables:", err.message);
  }

  const cleanPhone = phone.replace(/\D/g, "");
  // India starts with 91 -> UTC+5.5
  if (cleanPhone.startsWith("91")) {
    console.log(`[ReminderAIService] Falling back to default India offset: 5.5`);
    return 5.5;
  }
  // UAE starts with 971 -> UTC+4
  if (cleanPhone.startsWith("971")) {
    console.log(`[ReminderAIService] Falling back to default UAE offset: 4`);
    return 4;
  }
  // Oman starts with 968 -> UTC+4
  if (cleanPhone.startsWith("968")) {
    console.log(`[ReminderAIService] Falling back to default Oman offset: 4`);
    return 4;
  }
  // Standard Middle East UTC+3 countries
  if (
    cleanPhone.startsWith("966") || // Saudi Arabia
    cleanPhone.startsWith("965") || // Kuwait
    cleanPhone.startsWith("973") || // Bahrain
    cleanPhone.startsWith("974") || // Qatar
    cleanPhone.startsWith("962") || // Jordan
    cleanPhone.startsWith("961") || // Lebanon
    cleanPhone.startsWith("963") || // Syria
    cleanPhone.startsWith("964") || // Iraq
    cleanPhone.startsWith("20")     // Egypt
  ) {
    console.log(`[ReminderAIService] Falling back to default KSA offset: 3`);
    return 3;
  }
  // Default to +3 (KSA context)
  console.log(`[ReminderAIService] Falling back to global default offset: 3`);
  return 3;
}

export class ReminderAIService {
  /**
   * Parse reminder transcription/text using AI to extract reminder info
   */
  public static async parseReminder(
    tenantId: string,
    channelId: string,
    text: string,
    senderPhone: string = ""
  ): Promise<{
    title: string;
    dueTime: string; // ISO string in UTC format
    leadTimeMinutes: number;
    error?: string;
  } | null> {
    try {
      // 1. Fetch custom config
      const [config] = await db
        .select()
        .from(schema.reminderConfigs)
        .where(eq(schema.reminderConfigs.channelId, channelId))
        .limit(1);

      const customPrompt = config?.aiPrompt || `You are a helper AI for a Reminders and To-Do app. Extract the task description (What) and the scheduled time (When) from the user's message. Interpret natural dates like 'tomorrow at 5pm' or 'next week 12th at 1pm' correctly.`;

      // 2. Fetch AI keys config (determine if using tenant key or admin keys)
      const [addon] = await db
        .select()
        .from(schema.addons)
        .where(eq(schema.addons.slug, "reminders-module"))
        .limit(1);

      if (!addon) {
        return { title: "", dueTime: "", leadTimeMinutes: 15, error: "Reminders Module addon not registered." };
      }

      let apiKey = "";
      let baseURL = "https://api.openai.com/v1";
      let model = "gpt-4o-mini";

      const useAdminKey = addon.aiKeyType === "admin";

      // Candidates to try
      const candidates: Array<{ provider: string; key: string; model: string; url?: string }> = [];

      if (useAdminKey) {
        // Use platform keys and verify credits
        const hasCredits = await AddonManager.consumeCredits(tenantId, "reminders-module", 1);
        if (!hasCredits) {
          return { title: "", dueTime: "", leadTimeMinutes: 15, error: "Insufficient AI credits. Please recharge your Reminders Module." };
        }
        
        const adminKey = addon.adminApiKey || "";
        const adminUrl = addon.adminApiEndpoint || (addon.adminProvider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1");
        const adminModel = addon.adminLlmModel || "gpt-4o-mini";
        const adminProvider = addon.adminProvider || "openai";
        
        candidates.push({ provider: adminProvider, key: adminKey, model: adminModel, url: adminUrl });
      } else {
        // Use tenant's keys from users table
        const [tenant] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, tenantId))
          .limit(1);

        if (tenant) {
          // If tenant has preferred provider, prioritize it
          const pref = tenant.llmProvider;
          if (pref === "sarvam" && tenant.sarvamApiKey) {
            candidates.push({ provider: "sarvam", key: tenant.sarvamApiKey, model: "sarvam-105b-conversations", url: "https://api.sarvam.ai/v1" });
          } else if (pref === "groq" && tenant.groqApiKey) {
            candidates.push({ provider: "groq", key: tenant.groqApiKey, model: "llama-3.3-70b-versatile", url: "https://api.groq.com/openai/v1" });
          } else if (pref === "openai" && tenant.openaiApiKey) {
            candidates.push({ provider: "openai", key: tenant.openaiApiKey, model: tenant.openaiModel || "gpt-4o-mini" });
          }

          // Add other keys present on tenant
          if (tenant.sarvamApiKey) {
            candidates.push({ provider: "sarvam", key: tenant.sarvamApiKey, model: "sarvam-105b-conversations", url: "https://api.sarvam.ai/v1" });
          }
          if (tenant.groqApiKey) {
            candidates.push({ provider: "groq", key: tenant.groqApiKey, model: "llama-3.3-70b-versatile", url: "https://api.groq.com/openai/v1" });
          }
          if (tenant.openaiApiKey) {
            candidates.push({ provider: "openai", key: tenant.openaiApiKey, model: tenant.openaiModel || "gpt-4o-mini" });
          }

          // Check if there is an active channel AI setting
          const [aiSetting] = await db
            .select()
            .from(schema.aiSettings)
            .where(and(eq(schema.aiSettings.channelId, channelId), eq(schema.aiSettings.isActive, true)))
            .limit(1);
          
          if (aiSetting && aiSetting.apiKey) {
            const chanProv = aiSetting.llmProvider || "openai";
            candidates.push({
              provider: chanProv,
              key: aiSetting.apiKey,
              model: aiSetting.model || "gpt-4o-mini",
              url: aiSetting.endpoint || undefined
            });
          }
        }
      }

      // Fallback candidates from env
      if (process.env.OPENAI_API_KEY) {
        candidates.push({ provider: "openai", key: process.env.OPENAI_API_KEY, model: "gpt-4o-mini" });
      }
      if (process.env.SARVAM_API_KEY) {
        candidates.push({ provider: "sarvam", key: process.env.SARVAM_API_KEY, model: "sarvam-105b-conversations", url: "https://api.sarvam.ai/v1" });
      }
      if (process.env.GROQ_API_KEY) {
        candidates.push({ provider: "groq", key: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile", url: "https://api.groq.com/openai/v1" });
      }

      // Deduplicate candidates by provider (preserving order of insertion)
      const uniqueCandidates: typeof candidates = [];
      for (const cand of candidates) {
        if (cand.key && !uniqueCandidates.some(c => c.provider === cand.provider)) {
          uniqueCandidates.push(cand);
        }
      }

      if (uniqueCandidates.length === 0) {
        return { title: "", dueTime: "", leadTimeMinutes: 15, error: "No active AI configurations or API keys found." };
      }

      const timezoneOffset = senderPhone ? await getContactTimezoneOffset(senderPhone, channelId) : 3; // default KSA +3
      const now = new Date();
      const userNow = new Date(now.getTime() + timezoneOffset * 60 * 60 * 1000);

      const prompt = `${customPrompt}

Current Reference Time (User Local Time): "${userNow.toISOString().replace("T", " ").substring(0, 19)}"

Instructions:
Analyze the sentence and extract:
1. Title: The descriptive reminders task to be performed (What).
2. DueTime: The exact date/time calculated in YYYY-MM-DD HH:mm:ss format (When). 
   - Make sure to handle all date/time expressions case-insensitively and ignore spelling variations/typos.
   - Support words like "tomorrow", "tommorrow" (typo), "tom", "tomm", "today", "tonight", "next week", "next Friday", "mon", "tue", "wed", "thu", "fri", "sat", "sun".
   - Support formats with day/month/year or day/month, such as:
     * "2pm 01/08" or "2pm 01/8" (interpret as day 1, month 8, i.e., August 1st relative to the year 2026).
     * "2pm 01/8/26" or "2pm 01/08/2026" (interpret as August 1st, 2026).
     * "Today 10pm" or "tomorrow 5pm" or "tomm 5pm" or "tom 6pm" or "Tommorrow 5pm".
   - Support relative durations like "after 1hr", "after 30min", "in 15 mins", "in 2 hours", "after 5 minutes", "in 1 hour", etc., and calculate the dueTime by adding this duration to the Current Reference Time.
   - Convert the date/time string to YYYY-MM-DD HH:mm:ss based on the current reference time.
   - If user does not specify a date, assume today. If the time has already passed today, assume tomorrow.
3. LeadTimeMinutes: Early notification timeframe in minutes. Defaults to 15 if not specified.

Response format MUST be a valid JSON object ONLY. No markdown wrapping, no conversational text.
Example outputs:
{"title": "Call mom", "dueTime": "2026-08-30 17:00:00", "leadTimeMinutes": 15}
{"title": "Prepare report for boss", "dueTime": "2026-09-12 13:00:00", "leadTimeMinutes": 15}

If the input is completely off-topic or doesn't mention any reminder or task, return:
{"error": "Not a reminder"}

Input text: "${text}"`;

      let lastError = "";
      for (const cand of uniqueCandidates) {
        try {
          console.log(`[ReminderAIService] Trying provider "${cand.provider}" with model "${cand.model}"...`);
          const openai = new OpenAI({ apiKey: cand.key, baseURL: cand.url });
          const response = await openai.chat.completions.create({
            model: cand.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" }
          });

          const resText = response.choices[0]?.message?.content || "{}";
          const parsed = JSON.parse(resText);

          if (parsed.error && parsed.error !== "Not a reminder") {
            return { title: "", dueTime: "", leadTimeMinutes: 15, error: parsed.error };
          }

          // Convert dueTime from user local time back to UTC ISO string
          if (parsed.dueTime) {
            try {
              const parts = parsed.dueTime.split(/[- :]/); // [YYYY, MM, DD, HH, mm, ss]
              const userUtcDate = new Date(Date.UTC(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                parseInt(parts[2]),
                parseInt(parts[3] || "0"),
                parseInt(parts[4] || "0"),
                parseInt(parts[5] || "0")
              ));
              const actualUtcDate = new Date(userUtcDate.getTime() - timezoneOffset * 60 * 60 * 1000);
              parsed.dueTime = actualUtcDate.toISOString();
            } catch (convErr: any) {
              console.error("[ReminderAIService] Timezone conversion failed:", convErr.message);
            }
          }

          return {
            title: parsed.title || "",
            dueTime: parsed.dueTime || "",
            leadTimeMinutes: parsed.leadTimeMinutes !== undefined ? parseInt(String(parsed.leadTimeMinutes)) : 15
          };
        } catch (err: any) {
          console.error(`[ReminderAIService] Provider "${cand.provider}" failed:`, err.message);
          lastError = err.message;
        }
      }

      return { title: "", dueTime: "", leadTimeMinutes: 15, error: `All AI providers failed. Last error: ${lastError}` };
    } catch (err: any) {
      console.error("[ReminderAIService] Error parsing reminder:", err.message);
      return { title: "", dueTime: "", leadTimeMinutes: 15, error: err.message };
    }
  }
}
