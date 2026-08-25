import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { diployLogger } from "@diploy/core";
import crypto from "crypto";

export class AddonManager {
  /**
   * Check if a tenant has an active subscription for an addon
   */
  public static async isAddonActive(tenantId: string, addonSlug: string): Promise<boolean> {
    try {
      const [addon] = await db
        .select()
        .from(schema.addons)
        .where(and(eq(schema.addons.slug, addonSlug), eq(schema.addons.isActive, true)))
        .limit(1);

      if (!addon) return false;

      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, tenantId))
        .limit(1);

      if (user?.role === "superadmin") return true;

      const [subscription] = await db
        .select()
        .from(schema.tenantAddons)
        .where(
          and(
            eq(schema.tenantAddons.tenantId, tenantId),
            eq(schema.tenantAddons.addonId, addon.id),
            eq(schema.tenantAddons.status, "active")
          )
        )
        .limit(1);

      if (!subscription) return false;

      // Check expiry if set
      if (subscription.expiresAt && new Date() > new Date(subscription.expiresAt)) {
        // Auto expire
        await db
          .update(schema.tenantAddons)
          .set({ status: "expired" })
          .where(eq(schema.tenantAddons.id, subscription.id));
        return false;
      }

      return true;
    } catch (err: any) {
      console.error(`[AddonManager] Error validating addon ${addonSlug} for tenant ${tenantId}:`, err.message);
      return false;
    }
  }

  /**
   * Consume credits for admin-provided key addons
   */
  public static async consumeCredits(tenantId: string, addonSlug: string, amount: number): Promise<boolean> {
    try {
      const [addon] = await db
        .select()
        .from(schema.addons)
        .where(eq(schema.addons.slug, addonSlug))
        .limit(1);

      if (!addon || addon.aiKeyType !== "admin") {
        return true; // No credit limits for tenant-provided keys
      }

      const [subscription] = await db
        .select()
        .from(schema.tenantAddons)
        .where(
          and(
            eq(schema.tenantAddons.tenantId, tenantId),
            eq(schema.tenantAddons.addonId, addon.id),
            eq(schema.tenantAddons.status, "active")
          )
        )
        .limit(1);

      if (!subscription) return false;

      const currentCredits = subscription.credits ?? 0;
      if (currentCredits < amount) {
        return false; // Insufficient credits
      }

      await db
        .update(schema.tenantAddons)
        .set({ credits: currentCredits - amount })
        .where(eq(schema.tenantAddons.id, subscription.id));

      return true;
    } catch (err: any) {
      console.error(`[AddonManager] Error consuming credits for addon ${addonSlug}:`, err.message);
      return false;
    }
  }

  /**
   * Preload predefined flows once the addon is purchased
   */
  public static async preloadPredefinedFlow(tenantId: string, channelId: string, addonSlug: string): Promise<void> {
    try {
      if (addonSlug !== "expense-tracker") return;

      // Check if template already exists
      const existing = await db
        .select()
        .from(schema.automations)
        .where(
          and(
            eq(schema.automations.channelId, channelId),
            eq(schema.automations.name, "WhatsApp Expense Tracker Bot")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`[AddonManager] Predefined flow already exists for channel ${channelId}`);
        return;
      }

      console.log(`[AddonManager] Preloading WhatsApp Expense and Income Bots templates for channel ${channelId}`);

      // 1. Create main Expense automation record
      const [newExpenseAutomation] = await db
        .insert(schema.automations)
        .values({
          channelId,
          name: "WhatsApp Expense Tracker Bot",
          description: "Default predefined chatbot template for tracking expenses on WhatsApp using text and voice notes.",
          trigger: "message_received",
          status: "active",
          createdBy: tenantId,
        })
        .returning();

      // Create predefined nodes for Expense
      const expTriggerNodeId = "node-exp-trigger-uuid";
      const expQ1NodeId = "node-exp-q1-uuid";
      const expQ2NodeId = "node-exp-q2-uuid";
      const expQ3NodeId = "node-exp-q3-uuid";
      const expQ4NodeId = "node-exp-q4-uuid";
      const expQ5NodeId = "node-exp-q5-uuid";
      const expQ6NodeId = "node-exp-q6-uuid";

      await db.insert(schema.automationNodes).values([
        {
          automationId: newExpenseAutomation.id,
          nodeId: expTriggerNodeId,
          type: "trigger",
          subtype: "message_received",
          position: { x: 100, y: 150 },
          data: {
            label: "Trigger: Inbound Message",
            trigger: "message_received",
          },
          connections: [expQ1NodeId],
        },
        {
          automationId: newExpenseAutomation.id,
          nodeId: expQ1NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 300 },
          data: {
            label: "Ask Amount",
            question: "How much?",
            saveAs: "expense_amount",
          },
          connections: [expQ2NodeId],
        },
        {
          automationId: newExpenseAutomation.id,
          nodeId: expQ2NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 450 },
          data: {
            label: "Ask Description",
            question: "Enter expense description.",
            saveAs: "expense_description",
          },
          connections: [expQ3NodeId],
        },
        {
          automationId: newExpenseAutomation.id,
          nodeId: expQ3NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 600 },
          data: {
            label: "Ask Category",
            question: "Category? (Eg. Food/Petrol/Utility)",
            saveAs: "expense_category",
          },
          connections: [expQ4NodeId],
        },
        {
          automationId: newExpenseAutomation.id,
          nodeId: expQ4NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 750 },
          data: {
            label: "Ask Account",
            question: "Which account? (Eg. Cash/Card/Bank)",
            saveAs: "expense_account",
          },
          connections: [expQ5NodeId],
        },
        {
          automationId: newExpenseAutomation.id,
          nodeId: expQ5NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 900 },
          data: {
            label: "Ask Confirm Receipt",
            question: "Do you want to attach expense receipt image? Yes (y) or No (n)",
            saveAs: "expense_receipt_confirm",
          },
          connections: [expQ6NodeId],
        },
        {
          automationId: newExpenseAutomation.id,
          nodeId: expQ6NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 1050 },
          data: {
            label: "Ask Upload Receipt",
            question: "Please upload/attach the receipt image.",
            saveAs: "expense_receipt_media",
          },
          connections: [],
        },
      ]);

      // Connect edges for Expense
      await db.insert(schema.automationEdges).values([
        {
          id: crypto.randomUUID(),
          automationId: newExpenseAutomation.id,
          sourceNodeId: expTriggerNodeId,
          targetNodeId: expQ1NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newExpenseAutomation.id,
          sourceNodeId: expQ1NodeId,
          targetNodeId: expQ2NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newExpenseAutomation.id,
          sourceNodeId: expQ2NodeId,
          targetNodeId: expQ3NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newExpenseAutomation.id,
          sourceNodeId: expQ3NodeId,
          targetNodeId: expQ4NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newExpenseAutomation.id,
          sourceNodeId: expQ4NodeId,
          targetNodeId: expQ5NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newExpenseAutomation.id,
          sourceNodeId: expQ5NodeId,
          targetNodeId: expQ6NodeId,
          animated: true,
        },
      ]);

      // 2. Create main Income automation record
      const [newIncomeAutomation] = await db
        .insert(schema.automations)
        .values({
          channelId,
          name: "WhatsApp Income Tracker Bot",
          description: "Default predefined chatbot template for tracking income on WhatsApp using text and voice notes.",
          trigger: "message_received",
          status: "active",
          createdBy: tenantId,
        })
        .returning();

      // Create predefined nodes for Income
      const incTriggerNodeId = "node-inc-trigger-uuid";
      const incQ1NodeId = "node-inc-q1-uuid";
      const incQ2NodeId = "node-inc-q2-uuid";
      const incQ3NodeId = "node-inc-q3-uuid";
      const incQ4NodeId = "node-inc-q4-uuid";

      await db.insert(schema.automationNodes).values([
        {
          automationId: newIncomeAutomation.id,
          nodeId: incTriggerNodeId,
          type: "trigger",
          subtype: "message_received",
          position: { x: 400, y: 150 },
          data: {
            label: "Trigger: Inbound Message",
            trigger: "message_received",
          },
          connections: [incQ1NodeId],
        },
        {
          automationId: newIncomeAutomation.id,
          nodeId: incQ1NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 400, y: 300 },
          data: {
            label: "Ask Amount",
            question: "How much?",
            saveAs: "income_amount",
          },
          connections: [incQ2NodeId],
        },
        {
          automationId: newIncomeAutomation.id,
          nodeId: incQ2NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 400, y: 450 },
          data: {
            label: "Ask Description",
            question: "Enter income description.",
            saveAs: "income_description",
          },
          connections: [incQ3NodeId],
        },
        {
          automationId: newIncomeAutomation.id,
          nodeId: incQ3NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 400, y: 600 },
          data: {
            label: "Ask Category",
            question: "Category? (Eg. Salary/Bonus/Deposit)",
            saveAs: "income_category",
          },
          connections: [incQ4NodeId],
        },
        {
          automationId: newIncomeAutomation.id,
          nodeId: incQ4NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 400, y: 750 },
          data: {
            label: "Ask Account",
            question: "Which account? (Eg. Cash/Card/Bank)",
            saveAs: "income_account",
          },
          connections: [],
        },
      ]);

      // Connect edges for Income
      await db.insert(schema.automationEdges).values([
        {
          id: crypto.randomUUID(),
          automationId: newIncomeAutomation.id,
          sourceNodeId: incTriggerNodeId,
          targetNodeId: incQ1NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newIncomeAutomation.id,
          sourceNodeId: incQ1NodeId,
          targetNodeId: incQ2NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newIncomeAutomation.id,
          sourceNodeId: incQ2NodeId,
          targetNodeId: incQ3NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newIncomeAutomation.id,
          sourceNodeId: incQ3NodeId,
          targetNodeId: incQ4NodeId,
          animated: true,
        },
      ]);

      // Create default cash payment account if not exists
      const existingAccounts = await db
        .select()
        .from(schema.paymentAccounts)
        .where(eq(schema.paymentAccounts.tenantId, tenantId))
        .limit(1);

      if (existingAccounts.length === 0) {
        await db.insert(schema.paymentAccounts).values([
          { tenantId, name: "Cash", type: "cash", balance: "0" },
          { tenantId, name: "Bank Account", type: "bank", balance: "0" },
          { tenantId, name: "Credit Card", type: "credit_card", balance: "0" }
        ]);
        console.log(`[AddonManager] Prepopulated default payment accounts for tenant ${tenantId}`);
      }

      // Prepopulate default configuration
      const existingConfig = await db
        .select()
        .from(schema.expenseConfigs)
        .where(eq(schema.expenseConfigs.channelId, channelId))
        .limit(1);

      if (existingConfig.length === 0) {
        await db.insert(schema.expenseConfigs).values({
          tenantId,
          channelId,
          triggerKeyword: "expense",
          retrievalKeyword: "getexpense",
          reportInterval: "daily",
          emailEnabled: false,
        });
        console.log(`[AddonManager] Prepopulated default expense config for channel ${channelId}`);
      }

    } catch (err: any) {
      console.error(`[AddonManager] Failed to preload predefined flow template:`, err.message);
    }
  }
}
