import { Express, Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.middleware";
import { AddonManager } from "../services/addon-manager";

export function registerRemindersRoutes(app: Express) {
  // Get all reminders (paginated, with search)
  app.get("/api/reminders", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, search, status, page = "1", limit = "10" } = req.query;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required" });
      }

      // Check if reminders-module addon is active
      const isPluginActive = await AddonManager.isAddonActive(tenantId, "reminders-module");
      if (!isPluginActive) {
        return res.status(403).json({ error: "Reminders & To-Do Module addon is not active." });
      }

      const offset = (parseInt(String(page)) - 1) * parseInt(String(limit));
      const parsedLimit = parseInt(String(limit));

      let conditions = [
        eq(schema.reminders.tenantId, tenantId),
        eq(schema.reminders.channelId, String(channelId)),
      ];

      if (status && status !== "all") {
        conditions.push(eq(schema.reminders.status, String(status)));
      }

      if (search) {
        const query = `%${search}%`;
        conditions.push(
          or(
            like(schema.reminders.title, query),
            like(schema.reminders.contactPhone, query),
            like(schema.reminders.contactName, query)
          )
        );
      }

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.reminders)
        .where(and(...conditions));
      const total = Number(totalResult[0]?.count || 0);

      const items = await db
        .select()
        .from(schema.reminders)
        .where(and(...conditions))
        .orderBy(desc(schema.reminders.createdAt))
        .limit(parsedLimit)
        .offset(offset);

      res.json({
        data: items,
        total,
        page: parseInt(String(page)),
        limit: parsedLimit
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a reminder manually from the dashboard
  app.post("/api/reminders", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, contactPhone, contactName, title, dueTime, leadTimeMinutes } = req.body;

      if (!channelId || !contactPhone || !title || !dueTime) {
        return res.status(400).json({ error: "channelId, contactPhone, title, and dueTime are required." });
      }

      // Check if reminders-module addon is active
      const isPluginActive = await AddonManager.isAddonActive(tenantId, "reminders-module");
      if (!isPluginActive) {
        return res.status(403).json({ error: "Reminders & To-Do Module addon is not active." });
      }

      const [created] = await db
        .insert(schema.reminders)
        .values({
          tenantId,
          channelId,
          contactPhone,
          contactName: contactName || null,
          title,
          dueTime: new Date(dueTime),
          leadTimeMinutes: leadTimeMinutes !== undefined ? parseInt(String(leadTimeMinutes)) : 15,
          status: "pending"
        })
        .returning();

      res.json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete/cancel a reminder
  app.delete("/api/reminders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;

      const [existing] = await db
        .select()
        .from(schema.reminders)
        .where(
          and(
            eq(schema.reminders.id, req.params.id),
            eq(schema.reminders.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Reminder not found." });
      }

      await db
        .delete(schema.reminders)
        .where(eq(schema.reminders.id, req.params.id));

      res.json({ success: true, message: "Reminder deleted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get configuration
  app.get("/api/reminders/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId } = req.query;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required" });
      }

      let [config] = await db
        .select()
        .from(schema.reminderConfigs)
        .where(
          and(
            eq(schema.reminderConfigs.tenantId, tenantId),
            eq(schema.reminderConfigs.channelId, String(channelId))
          )
        )
        .limit(1);

      if (!config) {
        // Auto-provision default config if queried and not exists
        const [inserted] = await db
          .insert(schema.reminderConfigs)
          .values({
            tenantId,
            channelId: String(channelId),
            triggerKeyword: "remind",
            todoKeyword: "todo",
            defaultLeadTimeMinutes: 15,
            aiPrompt: "You are a helper AI for a Reminders and To-Do app. Extract the task description (What) and the scheduled time (When) from the user's message. Interpret natural dates like 'tomorrow at 5pm' or 'next week 12th at 1pm' correctly.",
            isActive: true
          })
          .returning();
        config = inserted;
      }

      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Save configuration
  app.post("/api/reminders/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req.session as any)?.user;
      const tenantId = user.role === "team" ? user.createdBy : user.id;
      const { channelId, triggerKeyword, todoKeyword, defaultLeadTimeMinutes, aiPrompt, isActive, purchaseType } = req.body;

      if (!channelId) {
        return res.status(400).json({ error: "ChannelId is required" });
      }

      // Update purchase type inside tenantAddons
      if (purchaseType === "ai" || purchaseType === "flow") {
        const [addon] = await db
          .select()
          .from(schema.addons)
          .where(eq(schema.addons.slug, "reminders-module"))
          .limit(1);

        if (addon) {
          const [existingSub] = await db
            .select()
            .from(schema.tenantAddons)
            .where(
              and(
                eq(schema.tenantAddons.tenantId, tenantId),
                eq(schema.tenantAddons.addonId, addon.id)
              )
            )
            .limit(1);

          if (existingSub) {
            await db
              .update(schema.tenantAddons)
              .set({ purchaseType })
              .where(eq(schema.tenantAddons.id, existingSub.id));
          }
        }
      }

      const [existing] = await db
        .select()
        .from(schema.reminderConfigs)
        .where(
          and(
            eq(schema.reminderConfigs.tenantId, tenantId),
            eq(schema.reminderConfigs.channelId, channelId)
          )
        )
        .limit(1);

      let config;
      if (existing) {
        const [updated] = await db
          .update(schema.reminderConfigs)
          .set({
            triggerKeyword: triggerKeyword || "remind",
            todoKeyword: todoKeyword || "todo",
            defaultLeadTimeMinutes: defaultLeadTimeMinutes !== undefined ? parseInt(String(defaultLeadTimeMinutes)) : 15,
            aiPrompt: aiPrompt || "You are a helper AI for a Reminders and To-Do app. Extract the task description (What) and the scheduled time (When) from the user's message. Interpret natural dates like 'tomorrow at 5pm' or 'next week 12th at 1pm' correctly.",
            isActive: isActive !== undefined ? isActive : true
          })
          .where(eq(schema.reminderConfigs.id, existing.id))
          .returning();
        config = updated;
      } else {
        const [created] = await db
          .insert(schema.reminderConfigs)
          .values({
            tenantId,
            channelId,
            triggerKeyword: triggerKeyword || "remind",
            todoKeyword: todoKeyword || "todo",
            defaultLeadTimeMinutes: defaultLeadTimeMinutes !== undefined ? parseInt(String(defaultLeadTimeMinutes)) : 15,
            aiPrompt: aiPrompt || "You are a helper AI for a Reminders and To-Do app. Extract the task description (What) and the scheduled time (When) from the user's message. Interpret natural dates like 'tomorrow at 5pm' or 'next week 12th at 1pm' correctly.",
            isActive: isActive !== undefined ? isActive : true
          })
          .returning();
        config = created;
      }

      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
