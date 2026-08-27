import OpenAI from "openai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { AddonManager } from "./addon-manager";

export class TicketAIService {
  /**
   * Parse transcription text using AI to extract support ticket details
   */
  public static async parseTicket(
    tenantId: string,
    channelId: string,
    text: string
  ): Promise<{
    subject: string;
    category: string;
    priority: string;
    description: string;
    error?: string;
  } | null> {
    try {
      // 1. Fetch custom prompt configuration
      const [ticketConfig] = await db
        .select()
        .from(schema.whatsappSupportTicketConfigs)
        .where(eq(schema.whatsappSupportTicketConfigs.channelId, channelId))
        .limit(1);

      const customPrompt = ticketConfig?.aiPrompt || `You are a helper AI for a Support Ticket app. Analyze the text representing a support ticket description, voice transcription, or raw chat text, and extract the ticket details.`;

      // 2. Fetch AI keys config (determine if using tenant key or admin keys)
      const [addon] = await db
        .select()
        .from(schema.addons)
        .where(eq(schema.addons.slug, "support-tickets"))
        .limit(1);

      if (!addon) {
        return { subject: "", category: "General", priority: "Medium", description: text, error: "Support Tickets addon not registered." };
      }

      let apiKey = "";
      let baseURL = "https://api.openai.com/v1";
      let model = "gpt-4o-mini";

      const useAdminKey = addon.aiKeyType === "admin";

      if (useAdminKey) {
        // Use platform keys and verify credits
        const hasCredits = await AddonManager.consumeCredits(tenantId, "support-tickets", 1);
        if (!hasCredits) {
          return { subject: "", category: "General", priority: "Medium", description: text, error: "Insufficient AI credits. Please recharge your Support Tickets Module." };
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
        return { subject: "", category: "General", priority: "Medium", description: text, error: "No active AI configurations or API keys found." };
      }

      const openai = new OpenAI({ apiKey, baseURL });

      const prompt = `${customPrompt}

Available categories: Technical, Billing, Sales, General.
Available priorities: Low, Medium, High, Urgent.

Analyze the text and extract:
1. Subject: a brief title summarizing the issue (mandatory, return empty if not found)
2. Category: match the default categories closely
3. Priority: match one of [Low, Medium, High, Urgent] closely. Default to "Medium" if not specified.
4. Description: a concise, clear description of the issue or details provided

Response format MUST be a valid JSON object ONLY. No markdown wrapping, no conversational text.
Example outputs:
{"subject": "App crashes on login", "category": "Technical", "priority": "High", "description": "The app freezes when entering credentials"}
{"subject": "Failed billing charge", "category": "Billing", "priority": "Urgent", "description": "Payment was deducted but subscription did not activate"}

If the input has absolutely no support issue described, return an error block:
{"error": "Not a support ticket"}

Input text: "${text}"`;

      console.log(`🤖 Sending support ticket extraction prompt to LLM (${model})...`);
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const responseText = completion.choices[0]?.message?.content?.trim() || "";
      console.log(`🤖 Received LLM Response: "${responseText}"`);

      // Parse JSON from output
      let cleanJsonText = responseText;
      if (responseText.includes("```json")) {
        cleanJsonText = responseText.split("```json")[1].split("```")[0].trim();
      } else if (responseText.includes("```")) {
        cleanJsonText = responseText.split("```")[1].split("```")[0].trim();
      }

      const parsed = JSON.parse(cleanJsonText);
      if (parsed.error) {
        return { subject: "", category: "General", priority: "Medium", description: text, error: parsed.error };
      }

      return {
        subject: String(parsed.subject || "WhatsApp Support Request"),
        category: String(parsed.category || "General"),
        priority: String(parsed.priority || "Medium"),
        description: String(parsed.description || text)
      };

    } catch (err: any) {
      console.error(`[TicketAIService] AI parsing failed:`, err.message);
      return null;
    }
  }

  /**
   * Analyze screenshot/image files using Vision models to extract support ticket details
   */
  public static async parseScreenshotImage(
    tenantId: string,
    channelId: string,
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<{
    subject: string;
    category: string;
    priority: string;
    description: string;
    error?: string;
  } | null> {
    try {
      // 2. Fetch AI keys config (determine if using tenant key or admin keys)
      const [addon] = await db
        .select()
        .from(schema.addons)
        .where(eq(schema.addons.slug, "support-tickets"))
        .limit(1);

      if (!addon) {
        return { subject: "", category: "General", priority: "Medium", description: "", error: "Support Tickets addon not registered." };
      }

      let apiKey = "";
      let baseURL = "https://api.openai.com/v1";
      let model = "gpt-4o-mini"; // Default vision-capable model

      const useAdminKey = addon.aiKeyType === "admin";

      if (useAdminKey) {
        // Vision requests consume 2 credits
        const hasCredits = await AddonManager.consumeCredits(tenantId, "support-tickets", 2);
        if (!hasCredits) {
          return { subject: "", category: "General", priority: "Medium", description: "", error: "Insufficient AI credits. Please recharge your Support Tickets Module." };
        }
        
        apiKey = addon.adminApiKey || "";
        baseURL = addon.adminApiEndpoint || "https://api.openai.com/v1";
        model = addon.adminLlmModel || "gpt-4o-mini";
        
        // If groq or llama are chosen but don't support vision directly, fallback to vision models
        if (model.includes("groq") || model.includes("llama-3.3")) {
          model = "llama-3.2-11b-vision-preview";
        }
      } else {
        const [tenant] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, tenantId))
          .limit(1);

        if (tenant) {
          if (tenant.groqApiKey) {
            apiKey = tenant.groqApiKey;
            baseURL = "https://api.groq.com/openai/v1";
            model = "llama-3.2-11b-vision-preview";
          } else {
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
        apiKey = process.env.OPENAI_API_KEY || "";
        baseURL = "https://api.openai.com/v1";
      }

      if (!apiKey) {
        return { subject: "", category: "General", priority: "Medium", description: "", error: "No active AI configurations or API keys found." };
      }

      const openai = new OpenAI({ apiKey, baseURL });

      const prompt = `You are a helper AI for a Support Ticket app. Analyze the attached screenshot/image and extract the support ticket details.

Available categories: Technical, Billing, Sales, General.
Available priorities: Low, Medium, High, Urgent.

Analyze the image and extract:
1. Subject: a brief title summarizing the issue/error shown in the screenshot
2. Category: match the default categories closely
3. Priority: match one of [Low, Medium, High, Urgent] closely. Defaults to "Medium".
4. Description: a concise explanation of what the screenshot reveals (error message, details, logs, etc.)

Response format MUST be a valid JSON object ONLY. No markdown wrapping, no conversational text.
Example output:
{"subject": "Error loading database driver", "category": "Technical", "priority": "High", "description": "A PostgreSQL driver connection timeout error is displayed on screen"}`;

      console.log(`🤖 Sending support ticket image to LLM (${model}) for vision parsing...`);
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBuffer.toString("base64")}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
      });

      const responseText = completion.choices[0]?.message?.content?.trim() || "";
      console.log(`🤖 Received LLM Image Response: "${responseText}"`);

      // Parse JSON from output
      let cleanJsonText = responseText;
      if (responseText.includes("```json")) {
        cleanJsonText = responseText.split("```json")[1].split("```")[0].trim();
      } else if (responseText.includes("```")) {
        cleanJsonText = responseText.split("```")[1].split("```")[0].trim();
      }

      const parsed = JSON.parse(cleanJsonText);
      return {
        subject: String(parsed.subject || "Screenshot Support Request"),
        category: String(parsed.category || "General"),
        priority: String(parsed.priority || "Medium"),
        description: String(parsed.description || "Refer to attached screenshot")
      };

    } catch (err: any) {
      console.error(`[TicketAIService] parseScreenshotImage failed:`, err.message);
      return null;
    }
  }
}
