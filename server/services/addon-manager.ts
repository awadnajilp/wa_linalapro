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
      const q1NodeId = "node-q1-uuid";
      const q2NodeId = "node-q2-uuid";
      const q3NodeId = "node-q3-uuid";

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
          connections: [q1NodeId],
        },
        {
          automationId: newAutomation.id,
          nodeId: q1NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 350 },
          data: {
            label: "Ask Description",
            question: "What is your expense today?",
            saveAs: "expense_description",
          },
          connections: [q2NodeId],
        },
        {
          automationId: newAutomation.id,
          nodeId: q2NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 550 },
          data: {
            label: "Ask Amount",
            question: "How much was it?",
            saveAs: "expense_amount",
          },
          connections: [q3NodeId],
        },
        {
          automationId: newAutomation.id,
          nodeId: q3NodeId,
          type: "user_reply",
          subtype: "send_message",
          position: { x: 100, y: 750 },
          data: {
            label: "Ask Category & Account",
            question: "Do you wanna save it category or account? (Example: Food / Cash Account)",
            saveAs: "expense_category_account",
          },
          connections: [],
        },
      ]);

      // Connect edges
      await db.insert(schema.automationEdges).values([
        {
          id: crypto.randomUUID(),
          automationId: newAutomation.id,
          sourceNodeId: triggerNodeId,
          targetNodeId: q1NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newAutomation.id,
          sourceNodeId: q1NodeId,
          targetNodeId: q2NodeId,
          animated: true,
        },
        {
          id: crypto.randomUUID(),
          automationId: newAutomation.id,
          sourceNodeId: q2NodeId,
          targetNodeId: q3NodeId,
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
