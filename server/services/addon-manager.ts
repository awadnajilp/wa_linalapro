import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { diployLogger } from "@diploy/core";

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

      console.log(`[AddonManager] Preloading WhatsApp Expense Tracker Bot template for channel ${channelId}`);

      // Create main automation record
      const [newAutomation] = await db
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

      // Create predefined nodes
      const triggerNodeId = "node-trigger-uuid";
      const welcomeNodeId = "node-welcome-uuid";

      await db.insert(schema.automationNodes).values([
        {
          automationId: newAutomation.id,
          nodeId: triggerNodeId,
          type: "trigger",
          subtype: "message_received",
          position: { x: 100, y: 150 },
          data: {
            label: "Trigger: Inbound Message",
            trigger: "message_received",
          },
          connections: [welcomeNodeId],
        },
        {
          automationId: newAutomation.id,
          nodeId: welcomeNodeId,
          type: "custom_reply",
          subtype: "send_message",
          position: { x: 100, y: 350 },
          data: {
            label: "Welcome Instruction",
            message: "Welcome to your *WhatsApp Expense Tracker Bot*!\n\nTo log an expense, type it like this:\n*expense <amount> <category> <account> <description>*\n_Example: expense 50 Food Cash Taxi_\n\nOr simply send a voice note stating what you spent (e.g. \"spent 50 dollars on fuel using credit card\").\n\nTo retrieve your logs, type:\n*getexpense <today/week/month/year>*",
          },
          connections: [],
        },
      ]);

      // Connect edges
      await db.insert(schema.automationEdges).values({
        id: "edge-default-uuid",
        automationId: newAutomation.id,
        sourceNodeId: triggerNodeId,
        targetNodeId: welcomeNodeId,
        animated: true,
      });

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
