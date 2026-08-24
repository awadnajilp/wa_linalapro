import OpenAI from "openai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { AddonManager } from "./addon-manager";

export class ExpenseAIService {
  /**
   * Parse transcription text using AI to extract expense logs
   */
  public static async parseExpense(
    tenantId: string,
    channelId: string,
    text: string,
    defaultType: "expense" | "deposit" = "expense"
  ): Promise<{
    amount: number;
    category: string;
    accountName: string;
    description: string;
    type?: "expense" | "deposit";
    error?: string;
  } | null> {
    try {
      // 1. Fetch available payment accounts for this user so AI can match them
      const accounts = await db
        .select()
        .from(schema.paymentAccounts)
        .where(eq(schema.paymentAccounts.tenantId, tenantId));

      const accountNames = accounts.map(a => a.name).join(", ") || "Cash, Bank Account, Credit Card";

      // 1.5 Fetch custom prompt configuration
      const [expenseConfig] = await db
        .select()
        .from(schema.expenseConfigs)
        .where(eq(schema.expenseConfigs.channelId, channelId))
        .limit(1);

      const customPrompt = expenseConfig?.aiPrompt || `You are a helper AI for an Expense Tracker app. Analyze the text below representing an expense description, voice transcription, or raw chat text, and extract the expense details.`;

      // 2. Fetch AI keys config (determine if using tenant key or admin keys)
      const [addon] = await db
        .select()
        .from(schema.addons)
        .where(eq(schema.addons.slug, "expense-tracker"))
        .limit(1);

      if (!addon) {
        return { amount: 0, category: "General", accountName: "Cash", description: "", type: defaultType, error: "Expense Module addon not registered." };
      }

      let apiKey = "";
      let baseURL = "https://api.openai.com/v1";
      let model = "gpt-4o-mini";

      const useAdminKey = addon.aiKeyType === "admin";

      if (useAdminKey) {
        // Use platform keys and verify credits
        const hasCredits = await AddonManager.consumeCredits(tenantId, "expense-tracker", 1);
        if (!hasCredits) {
          return { amount: 0, category: "General", accountName: "Cash", description: "", type: defaultType, error: "Insufficient AI credits. Please recharge your Expense Module." };
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
            baseURL = "https://api.sarvam.ai/v1"; // Mock or custom LLM endpoint
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
        return { amount: 0, category: "General", accountName: "Cash", description: "", type: defaultType, error: "No active AI configurations or api keys found." };
      }

      const openai = new OpenAI({ apiKey, baseURL });

      const prompt = `${customPrompt}

Available Payment Accounts in user database: [${accountNames}]. Try to match closely with one of these accounts. If none are specified, default to "Cash".
Available default categories: Food, Travel, Office, Marketing, Utility, General, Rent, Salaries, Taxes, Entertainment.

Analyze the sentence and extract:
1. Amount: numerical value (mandatory, return 0 if not found)
2. Category: match the default categories or extract one
3. Account Name: match one of [${accountNames}] closely
4. Description: a concise description of what was purchased/spent
5. Type: either "expense" (spending) or "deposit" (income, cash inflow). Defaults to "${defaultType}".

Response format MUST be a valid JSON object ONLY. No markdown wrapping, no conversational text.
Example outputs:
{"amount": 50.00, "category": "Food", "accountName": "Cash", "description": "lunch taxi", "type": "expense"}
{"amount": 1200.00, "category": "Travel", "accountName": "Bank Account", "description": "flight tickets", "type": "expense"}
{"amount": 2500.00, "category": "Salaries", "accountName": "Bank Account", "description": "monthly income", "type": "deposit"}

If the input has absolutely no mention of expenses, deposits, or amounts, return an error block:
{"error": "Not an expense"}

Input text: "${text}"`;

      console.log(`🤖 Sending expense extraction prompt to LLM (${model})...`);
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
        return { amount: 0, category: "General", accountName: "Cash", description: "", type: defaultType, error: parsed.error };
      }

      return {
        amount: Number(parsed.amount || 0),
        category: String(parsed.category || "General"),
        accountName: String(parsed.accountName || "Cash"),
        description: String(parsed.description || ""),
        type: parsed.type === "deposit" ? "deposit" : "expense"
      };

    } catch (err: any) {
      console.error(`[ExpenseAIService] AI parsing failed:`, err.message);
      return null;
    }
  }

  /**
   * Analyze receipt images using Vision models to extract expense/deposit data
   */
  public static async parseReceiptImage(
    tenantId: string,
    channelId: string,
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<{
    amount: number;
    category: string;
    accountName: string;
    description: string;
    date: string; // YYYY-MM-DD or "MISSING"
    type: "expense" | "deposit";
    error?: string;
  } | null> {
    try {
      // 1. Fetch available payment accounts for this user so AI can match them
      const accounts = await db
        .select()
        .from(schema.paymentAccounts)
        .where(eq(schema.paymentAccounts.tenantId, tenantId));

      const accountNames = accounts.map(a => a.name).join(", ") || "Cash, Bank Account, Credit Card";

      // 2. Fetch AI keys config (determine if using tenant key or admin keys)
      const [addon] = await db
        .select()
        .from(schema.addons)
        .where(eq(schema.addons.slug, "expense-tracker"))
        .limit(1);

      if (!addon) {
        return { amount: 0, category: "General", accountName: "UNKNOWN", description: "", date: "MISSING", type: "expense", error: "Expense Module addon not registered." };
      }

      let apiKey = "";
      let baseURL = "https://api.openai.com/v1";
      let model = "gpt-4o-mini"; // Default vision capable model

      const useAdminKey = addon.aiKeyType === "admin";

      if (useAdminKey) {
        // Vision requests consume 2 credits
        const hasCredits = await AddonManager.consumeCredits(tenantId, "expense-tracker", 2);
        if (!hasCredits) {
          return { amount: 0, category: "General", accountName: "UNKNOWN", description: "", date: "MISSING", type: "expense", error: "Insufficient AI credits. Please recharge your Expense Module." };
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
        return { amount: 0, category: "General", accountName: "UNKNOWN", description: "", date: "MISSING", type: "expense", error: "No active AI configurations or api keys found." };
      }

      const openai = new OpenAI({ apiKey, baseURL });

      const prompt = `You are a helper AI for an Expense Tracker app. Analyze the attached receipt image and extract the expense details.

Available Payment Accounts in user database: [${accountNames}]. Try to match closely with one of these accounts. If none match or are specified on the receipt, return "UNKNOWN".
Available default categories: Food, Travel, Office, Marketing, Utility, General, Rent, Salaries, Taxes, Entertainment.

Analyze the image and extract:
1. Amount: the total amount of the transaction (numerical value)
2. Category: match the default categories or extract one
3. Account Name: match one of [${accountNames}] closely. If not clear or missing, return "UNKNOWN".
4. Description: a concise description of what was purchased/spent
5. Date: the date of the receipt in YYYY-MM-DD format. If date is not visible or missing on the receipt, return "MISSING".
6. Type: return either "expense" (spending) or "deposit" (income, refund, deposit).

Response format MUST be a valid JSON object ONLY. No markdown wrapping, no conversational text.
Example output:
{"amount": 120.50, "category": "Food", "accountName": "Cash", "description": "lunch taxi", "date": "2026-08-24", "type": "expense"}`;

      console.log(`🤖 Sending receipt image to LLM (${model}) for OCR parsing...`);
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
        amount: Number(parsed.amount || 0),
        category: String(parsed.category || "General"),
        accountName: String(parsed.accountName || "UNKNOWN"),
        description: String(parsed.description || ""),
        date: String(parsed.date || "MISSING"),
        type: parsed.type === "deposit" ? "deposit" : "expense"
      };

    } catch (err: any) {
      console.error(`[ExpenseAIService] parseReceiptImage failed:`, err.message);
      return null;
    }
  }

  /**
   * Resolves payment account with typo tolerance, and auto-creates it if it does not exist.
   */
  public static async resolveOrCreatePaymentAccount(tenantId: string, accountNameInput: string): Promise<any> {
    const accounts = await db
      .select()
      .from(schema.paymentAccounts)
      .where(eq(schema.paymentAccounts.tenantId, tenantId));

    const clean = accountNameInput.trim().toLowerCase();

    // 1. Direct or partial match
    let matched = accounts.find(
      a => a.name.toLowerCase() === clean ||
           clean.includes(a.name.toLowerCase()) ||
           a.name.toLowerCase().includes(clean)
    );

    // 2. Typing aliases mapping (detect typos like cas, cash, csh, crd, bnk)
    if (!matched) {
      if (["cash", "cas", "csh", "cah"].some(x => clean.includes(x))) {
        matched = accounts.find(a => a.name.toLowerCase().includes("cash"));
        if (!matched) matched = accounts.find(a => a.name.toLowerCase() === "cash");
      } else if (["card", "crd", "cc", "credit"].some(x => clean.includes(x))) {
        matched = accounts.find(a => a.name.toLowerCase().includes("card"));
      } else if (["bank", "bnk", "transfer", "online"].some(x => clean.includes(x))) {
        matched = accounts.find(a => a.name.toLowerCase().includes("bank"));
      }
    }

    if (matched) {
      return matched;
    }

    // 3. Auto-create account if not found
    const name = accountNameInput.trim().charAt(0).toUpperCase() + accountNameInput.trim().slice(1);
    const type = name.toLowerCase().includes("bank") ? "bank" :
                 (name.toLowerCase().includes("card") ? "credit_card" : "cash");

    const [newAcc] = await db
      .insert(schema.paymentAccounts)
      .values({
        tenantId,
        name,
        type,
        balance: "0.00"
      })
      .returning();

    console.log(`[Expense Tracker] Auto-created payment account: ${name}`);
    return newAcc;
  }
}
