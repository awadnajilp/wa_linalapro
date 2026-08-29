import OpenAI from "openai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { AddonManager } from "./addon-manager";

export class ReminderAIService {
  /**
   * Parse reminder transcription/text using AI to extract reminder info
   */
  public static async parseReminder(
    tenantId: string,
    channelId: string,
    text: string
  ): Promise<{
    title: string;
    dueTime: string; // YYYY-MM-DD HH:mm:ss format
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

      if (useAdminKey) {
        // Use platform keys and verify credits
        const hasCredits = await AddonManager.consumeCredits(tenantId, "reminders-module", 1);
        if (!hasCredits) {
          return { title: "", dueTime: "", leadTimeMinutes: 15, error: "Insufficient AI credits. Please recharge your Reminders Module." };
        }
        
        apiKey = addon.adminApiKey || "";
        baseURL = addon.adminApiEndpoint || (addon.adminProvider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1");
        model = addon.adminLlmModel || "gpt-4o-mini";

        // Fallback to system env if addon properties are unset
        if (!apiKey) {
          apiKey = process.env.OPENAI_API_KEY || "";
          baseURL = "https://api.openai.com/v1";
          
          if (!apiKey && process.env.GROQ_API_KEY) {
            apiKey = process.env.GROQ_API_KEY;
            baseURL = "https://api.groq.com/openai/v1";
            model = "llama-3.3-70b-versatile";
          }
        }
      } else {
        // Use tenant's keys from users table
        const [tenant] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, tenantId))
          .limit(1);

        if (tenant) {
          if (tenant.groqApiKey) {
            apiKey = tenant.groqApiKey;
            baseURL = "https://api.groq.com/openai/v1";
            model = "llama-3.3-70b-versatile";
          } else if (tenant.sarvamApiKey) {
            apiKey = tenant.sarvamApiKey;
            baseURL = "https://api.sarvam.ai/v1";
          } else {
            // Check if there is an active channel AI setting
            const [aiSetting] = await db
              .select()
              .from(schema.aiSettings)
              .where(and(eq(schema.aiSettings.channelId, channelId), eq(schema.aiSettings.isActive, true)))
              .limit(1);
            
            if (aiSetting && aiSetting.apiKey) {
              apiKey = aiSetting.apiKey;
              baseURL = aiSetting.endpoint || "https://api.openai.com/v1";
              model = aiSetting.model || "gpt-4o-mini";
            }
          }
        }
      }

      // If no custom key found, fallback to system env keys
      if (!apiKey) {
        apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || "";
        if (process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
          baseURL = "https://api.groq.com/openai/v1";
          model = "llama-3.3-70b-versatile";
        }
      }

      if (!apiKey) {
        return { title: "", dueTime: "", leadTimeMinutes: 15, error: "No active AI configurations or api keys found." };
      }

      const openai = new OpenAI({ apiKey, baseURL });
      const now = new Date();

      const prompt = `${customPrompt}

Current Reference Time (Server Local Time): "${now.toLocaleString()}"
Current ISO Time: "${now.toISOString()}"

Instructions:
Analyze the sentence and extract:
1. Title: The descriptive reminders task to be performed (What).
2. DueTime: The exact date/time calculated in YYYY-MM-DD HH:mm:ss format (When). Interpret natural descriptions relative to the reference time:
   - "tomorrow 5pm"
   - "next week 1pm"
   - "2pm 05/11" (interpret month/day depending on the year context, e.g. May 11th or Nov 5th. If not specified assume DD/MM format).
   - If user does not specify a date, assume today. If the time has already passed today, assume tomorrow.
3. LeadTimeMinutes: Early notification timeframe in minutes. Defaults to 15 if not specified.

Response format MUST be a valid JSON object ONLY. No markdown wrapping, no conversational text.
Example outputs:
{"title": "Call mom", "dueTime": "2026-08-30 17:00:00", "leadTimeMinutes": 15}
{"title": "Prepare report for boss", "dueTime": "2026-09-12 13:00:00", "leadTimeMinutes": 15}

If the input is completely off-topic or doesn't mention any reminder or task, return:
{"error": "Not a reminder"}

Input text: "${text}"`;

      const response = await openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const resText = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(resText);

      if (parsed.error) {
        return { title: "", dueTime: "", leadTimeMinutes: 15, error: parsed.error };
      }

      return {
        title: parsed.title || "",
        dueTime: parsed.dueTime || "",
        leadTimeMinutes: parsed.leadTimeMinutes !== undefined ? parseInt(String(parsed.leadTimeMinutes)) : 15
      };
    } catch (err: any) {
      console.error("[ReminderAIService] Error parsing reminder:", err.message);
      return { title: "", dueTime: "", leadTimeMinutes: 15, error: err.message };
    }
  }
}
